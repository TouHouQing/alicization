function Invoke-OwnedKeyboardFaultChecks([string[]]$NativeSources,[switch]$OwnedHost) {
  $modes=@('cancel','actor-exit','guardian-exit','parent-exit','expiry','target-change','physical-takeover')
  if($OwnedHost){
    $owned=& (Join-Path $PSScriptRoot 'assert-owned-windows-fixture.ps1') -ProofPath $proofPath | ConvertFrom-Json
    if(!$owned.ownedHostFixtureVerified -or !$owned.outsideAllDisplays -or $owned.processId -ne $fixture.Id -or $owned.windowId -cne $fixtureWindow){throw 'Exact owned offscreen host fixture required before fault input'}
    $modes=@('cancel','actor-exit','guardian-exit','parent-exit','expiry','target-change')
  }else{
    $actual=Get-CimInstance Win32_ComputerSystemProduct
    if(!$identity.isolatedGuestVerified -or $actual.UUID -ine $identity.guestUuid -or $env:USERNAME -cne 'AlicizationQA' -or $workspace -ine 'C:\AlicizationQA\project'){throw 'Actual isolated guest required before any fault input'}
  }
  $faultExe=Join-Path $run 'owned-input-fault.exe'
  $compiler=[Microsoft.CSharp.CSharpCodeProvider]::new()
  try {
    $parameters=[CodeDom.Compiler.CompilerParameters]::new()
    $parameters.GenerateExecutable=$true;$parameters.OutputAssembly=$faultExe;$parameters.MainClass='AlicizationOwnedInputFaultHarness'
    $parameters.ReferencedAssemblies.AddRange([string[]]@('System.dll','System.Core.dll','System.Web.Extensions.dll'))
    $compiled=$compiler.CompileAssemblyFromFile($parameters,[string[]]($NativeSources+@(Join-Path $PSScriptRoot 'windows-keyboard-fault-fixture.cs')))
    if($compiled.Errors.HasErrors){throw (($compiled.Errors|ForEach-Object {$_.ToString()}) -join "`n")}
  } finally {$compiler.Dispose()}
  Add-Type @'
using System.Runtime.InteropServices;
public static class AlicizationOwnedGuestPhysicalKey {
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  public static bool ControlDown() {return (GetAsyncKeyState(0xA2)&0x8000)!=0;}
}
'@
  $report.faults=@()
  foreach($mode in $modes) {
    for($round=1;$round -le 3;$round++) {
      if($OwnedHost){
        $owned=& (Join-Path $PSScriptRoot 'assert-owned-windows-fixture.ps1') -ProofPath $proofPath | ConvertFrom-Json
        Check ($owned.ownedHostFixtureVerified -and $owned.outsideAllDisplays -and $owned.processId -eq $fixture.Id -and $owned.windowId -ceq $fixtureWindow) 'Exact original offscreen host window remains owned before each fault'
      }
      Focus-Entry
      $before=Read-State
      Check (![AlicizationOwnedGuestPhysicalKey]::ControlDown()) 'No previous Ctrl ownership survives into the next fault'
      $target=[Alicization.WindowsInput.Native]::ObserveForeground()
      Check ($target.ProcessId -eq $fixture.Id -and $target.WindowId -ceq $fixtureWindow) 'Fault input binds the actual owned foreground fixture'
      $name='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
      $hash=[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N')
      $request=@{version=1;mappingName=$name;tag='42';bindingHash=$hash;parentProcessId=$PID;parentStartTicks=[Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString([Globalization.CultureInfo]::InvariantCulture);expiresAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+$(if($mode -eq 'expiry'){4000}else{15000});keys=@(0xA2,0x53);repeat=1;target=@{windowId=$target.WindowId;processId=$target.ProcessId;processStartTicks=$target.ProcessStartTicks;windowClass=$target.WindowClass;desktop=$target.Desktop;inputDesktop=$target.InputDesktop;focusWindowId=$target.FocusWindowId;integrityLevel=$target.IntegrityLevel}}
      $start=[Diagnostics.ProcessStartInfo]::new($faultExe,$(if($mode -eq 'parent-exit'){'--parent-proxy'}else{'--fault'}))
      $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
      $start.StandardOutputEncoding=[Text.UTF8Encoding]::new($false);$start.StandardErrorEncoding=[Text.UTF8Encoding]::new($false)
      $child=[Diagnostics.Process]::Start($start)
      $input=[IO.StreamWriter]::new($child.StandardInput.BaseStream,[Text.UTF8Encoding]::new($false));$input.AutoFlush=$true
      $errors=$child.StandardError.ReadToEndAsync()
      $actorHandle=$null;$guardianHandle=$null;$physicalRequested=$false
      try {
        $input.WriteLine((@{mode=$mode;request=($request|ConvertTo-Json -Depth 5 -Compress)}|ConvertTo-Json -Compress))
        $first=$child.StandardOutput.ReadLineAsync()
        Check ($first.Wait(8000)) 'Fault pair responds within readiness budget'
        $ready=$first.Result|ConvertFrom-Json
        Check ($ready.type -ceq 'ready' -and $ready.bindingHash -ceq $hash) ('Fault pair really becomes ready: '+$first.Result)
        $expectedRoot=Join-Path ([IO.Path]::GetDirectoryName($faultExe)) ('alicization-owned-input-'+$name.Substring($name.Length-32))
        Check ([IO.Path]::GetFullPath($ready.receiptRoot) -ieq [IO.Path]::GetFullPath($expectedRoot)) 'Fault receipts use the exact nonce-derived owned root'
        [void][Alicization.WindowsInput.InputReceipts]::OpenGuardian($name,[uint64]42,$hash)
        $actorHandle=[Alicization.WindowsInput.Native]::HoldProcess($ready.actorProcessId,$ready.actorStartTicks)
        $guardianHandle=[Alicization.WindowsInput.Native]::HoldProcess($ready.guardianProcessId,$ready.guardianStartTicks)
        $input.WriteLine('execute')
        $half=$child.StandardOutput.ReadLineAsync()
        Check ($half.Wait(5000)) 'Actual half-batch is observed before triggering fault'
        $held=$half.Result|ConvertFrom-Json
        Check ($held.type -ceq 'half-down' -and $held.bindingHash -ceq $hash) ('Both actual hooks acknowledge the single owned Ctrl down: '+$half.Result)
        if($mode -eq 'cancel'){$input.WriteLine('cancel')}
        if($mode -eq 'target-change'){[IO.File]::WriteAllText((Join-Path $run 'focus-next.txt'),[guid]::NewGuid().ToString('N'))}
        if($mode -eq 'physical-takeover'){
          $physicalRequested=$true
          @{type='physical-takeover';phase='press';round=$round}|ConvertTo-Json -Compress|Write-Output
        }
        $tail=$child.StandardOutput.ReadToEndAsync()
        Check ($child.WaitForExit(17000)) 'Fault actor or proxy actually exits within its bounded lifetime'
        $expectedExit=switch($mode){'actor-exit'{93};'parent-exit'{94};default{0}}
        Check ($child.ExitCode -eq $expectedExit) 'Actual fault process exits with its expected code'
        for($index=0;$index -lt 1200;$index++) {
          if([Alicization.WindowsInput.Native]::ProcessExited($actorHandle) -and [Alicization.WindowsInput.Native]::ProcessExited($guardianHandle)){break}
          Start-Sleep -Milliseconds 10
        }
        Check ([Alicization.WindowsInput.Native]::ProcessExited($actorHandle) -and [Alicization.WindowsInput.Native]::ProcessExited($guardianHandle)) 'Held kernel identities prove both original input owners have exited'
        Check ($errors.Wait(1000) -and $tail.Wait(1000)) 'Fault stdout and stderr actually close after both owners exit'
        Check ($errors.Result -ceq '') ('Fault has no unexpected stderr: '+$errors.Result)
        $actorPath=Join-Path $expectedRoot 'actor-result.json'
        $guardianPath=Join-Path $expectedRoot 'guardian-release.json'
        $actorResult=if(Test-Path -LiteralPath $actorPath){Get-Content -LiteralPath $actorPath -Encoding UTF8 -Raw|ConvertFrom-Json}else{$null}
        $guardianResult=if(Test-Path -LiteralPath $guardianPath){Get-Content -LiteralPath $guardianPath -Encoding UTF8 -Raw|ConvertFrom-Json}else{$null}
        if($mode -eq 'actor-exit'){
          Check ($null -eq $actorResult -and $guardianResult.inputReleased -eq $true -and $guardianResult.bindingHash -ceq $hash) 'Independent guardian flushes release evidence after abrupt actor death'
        }elseif($mode -eq 'guardian-exit'){
          Check ($null -eq $guardianResult -and $actorResult.inputReleased -eq $true -and $actorResult.guardianExited -eq $true) 'Actor confirms actual key-up and a proven dead guardian before settling its lane'
        }else{
          Check ($actorResult.inputReleased -eq $true -and $guardianResult.inputReleased -eq $true -and $guardianResult.bindingHash -ceq $hash) 'Both durable native release receipts remain available after the fault'
        }
        if($actorResult){
          Check ($actorResult.actionComplete -eq $false -and $actorResult.ownedKeys.Count -eq 0 -and $actorResult.laterDownRejected -eq $true -and $actorResult.actorDeliveredDowns -eq 1 -and $actorResult.guardianDeliveredDowns -eq 1) 'Partial input never becomes a completed shortcut or permits another down'
          if($mode -eq 'parent-exit'){Check ($actorResult.parentProcessExited -eq $true) 'Actual parent death is observed through its held process identity'}
        }
        if($mode -eq 'physical-takeover'){
          Check ($actorResult.physicalSeenByBothHooks -eq $true -and $actorResult.externalOwnershipTransferred -eq $true -and $actorResult.userStillHoldsControl -eq $true -and [AlicizationOwnedGuestPhysicalKey]::ControlDown()) 'Both native hooks see real non-injected input and preserve the physical user Ctrl hold'
          @{type='physical-takeover';phase='release';round=$round}|ConvertTo-Json -Compress|Write-Output
        }
        for($index=0;$index -lt 500 -and [AlicizationOwnedGuestPhysicalKey]::ControlDown();$index++){Start-Sleep -Milliseconds 10}
        Check (![AlicizationOwnedGuestPhysicalKey]::ControlDown()) 'Actual OS key state is released after owned cleanup or the physical user up'
        $physicalRequested=$false
        $after=Read-State
        Check ($after.saves -eq $before.saves -and $after.tabs -eq $before.tabs -and $after.escapes -eq $before.escapes -and $after.content -ceq $before.content) 'The interrupted partial chord produces no saved action or changed Unicode content'
        $report.faults+=@{mode=$mode;round=$round;actor=$actorResult;guardian=$guardianResult;expectedExit=$expectedExit;bothOriginalOwnersExited=$true;fixtureUnchanged=$true;receiptRoot=$expectedRoot}
      } finally {
        if($physicalRequested){@{type='physical-takeover';phase='release';round=$round}|ConvertTo-Json -Compress|Write-Output}
        if($actorHandle){$actorHandle.Dispose()};if($guardianHandle){$guardianHandle.Dispose()}
        $input.Dispose();$child.Dispose()
      }
    }
  }
}
