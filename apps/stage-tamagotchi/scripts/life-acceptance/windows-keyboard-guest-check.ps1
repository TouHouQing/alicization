param([Parameter(Mandatory=$true)][string]$ProofPath,[switch]$ProductOnly)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$identity=& (Join-Path $PSScriptRoot 'assert-isolated-windows-guest.ps1') -ProofPath $ProofPath | ConvertFrom-Json
if(!$identity.isolatedGuestVerified -or $workspace -ine 'C:\AlicizationQA\project') { throw 'Actual isolated guest identity and payload are required before any native input' }
$run=Join-Path $workspace ('output/keyboard-'+[guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($run)
$identity | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 (Join-Path $run 'guest-fixture-owner.json')
$source=Join-Path $workspace 'apps/stage-tamagotchi/src/main/services/alicization/execution'
$native=Join-Path $run 'owned-keyboard.exe'
$files=@('native','shared-state','hook-policy','hooks','session','process','receipts') | ForEach-Object { Join-Path $source ('windows-keyboard-'+$_+'.cs') }
Add-Type -Path $files -OutputAssembly $native -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll
[void][Reflection.Assembly]::LoadFrom($native)
$fixtureExe=Join-Path $run 'fixture.exe'
Add-Type -Path @((Join-Path $PSScriptRoot 'windows-keyboard-fixture.cs'),(Join-Path $PSScriptRoot 'windows-keyboard-fixture-files.cs')) -OutputAssembly $fixtureExe -OutputType WindowsApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll,System.Windows.Forms.dll,System.Drawing.dll
$report=@{format='alicization-actual-keyboard-guest-v1';passed=$false;identity=$identity;run=$run;checks=@();rounds=@();sourceHashes=@{};fixtureShutdown=$false}
foreach($file in $files) { $report.sourceHashes[[IO.Path]::GetFileName($file)]=(Get-FileHash -LiteralPath $file).Hash.ToLowerInvariant() }
$fixture=$null
function Check([bool]$value,[string]$name) { $script:report.checks+=@{name=$name;passed=$value};if(!$value){throw $name} }
function Read-State { try { Get-Content -LiteralPath (Join-Path $run 'fixture-state.json') -Encoding UTF8 -Raw | ConvertFrom-Json } catch { $null } }
function Focus-Entry {
  $id=[guid]::NewGuid().ToString('N')
  [IO.File]::WriteAllText((Join-Path $run 'focus-entry.txt'),$id)
  for($index=0;$index -lt 100;$index++) {
    $current=Read-State
    if($current.focusCommand -ceq $id -and $current.focused -ceq 'entry') { return }
    Start-Sleep -Milliseconds 30
  }
  throw 'Owned fixture did not acknowledge its setup focus'
}
function Run-Chord([int[]]$keys) {
  $target=[Alicization.WindowsInput.Native]::ObserveForeground()
  Check ($target.ProcessId -eq $fixture.Id -and $target.WindowId -ceq $script:fixtureWindow) 'Native observation belongs to the actual fixture'
  $request=@{version=1;mappingName=('Local\AlicizationInput_'+[guid]::NewGuid().ToString('N'));tag='42';bindingHash=([guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'));parentProcessId=$PID;parentStartTicks=[Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString([Globalization.CultureInfo]::InvariantCulture);expiresAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+15000;keys=@($keys);repeat=1;target=@{windowId=$target.WindowId;processId=$target.ProcessId;processStartTicks=$target.ProcessStartTicks;windowClass=$target.WindowClass;desktop=$target.Desktop;inputDesktop=$target.InputDesktop;focusWindowId=$target.FocusWindowId;integrityLevel=$target.IntegrityLevel}}
  $start=[Diagnostics.ProcessStartInfo]::new($native,'--actor')
  $start.UseShellExecute=$false;$start.CreateNoWindow=$true
  $start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $start.StandardOutputEncoding=[Text.UTF8Encoding]::new($false);$start.StandardErrorEncoding=[Text.UTF8Encoding]::new($false)
  $child=[Diagnostics.Process]::Start($start)
  $input=[IO.StreamWriter]::new($child.StandardInput.BaseStream,[Text.UTF8Encoding]::new($false));$input.AutoFlush=$true
  $errors=$child.StandardError.ReadToEndAsync()
  try {
    $input.WriteLine(($request|ConvertTo-Json -Depth 5 -Compress))
    $first=$child.StandardOutput.ReadLineAsync()
    Check ($first.Wait(8000)) 'Actual actor responds within readiness budget'
    $ready=$first.Result|ConvertFrom-Json
    Check ($ready.type -ceq 'ready' -and $ready.bindingHash -ceq $request.bindingHash) ('Both actual native hooks become ready: '+$first.Result)
    $input.WriteLine('execute')
    $output=$child.StandardOutput.ReadToEndAsync()
    if(!$child.WaitForExit(15000)) {
      $input.WriteLine('cancel')
      if(!$child.WaitForExit(7000)) { throw 'Native actor has unconfirmed input ownership; guest is quarantined' }
    }
    Check ($output.Wait(1000) -and $errors.Wait(1000)) 'Actual native output channels close within a bounded wait'
    $result=$output.Result.Trim()|ConvertFrom-Json
    [IO.File]::WriteAllText((Join-Path $run ('native-'+$request.bindingHash+'.json')),$output.Result)
    Check ($child.ExitCode -eq 0 -and $errors.Result -ceq '' -and $result.ok -eq $true) ('Actual native chord completes: '+$output.Result)
    Check ($result.inputReleased -eq $true -and $result.guardianNormalExit -eq $true -and $result.ownedKeys.Count -eq 0) 'Both owners actually acknowledge release and guardian closes normally'
    Check ($result.completedRounds -eq 1 -and $result.insertedEvents -eq $keys.Length*2) 'Exactly one balanced native batch was inserted'
    return $result
  } finally { $input.Dispose();$child.Dispose() }
}
try {
  $start=[Diagnostics.ProcessStartInfo]::new($fixtureExe,('"'+$run+'"'))
  $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $fixture=[Diagnostics.Process]::Start($start)
  $ready=$fixture.StandardOutput.ReadLineAsync()
  Check ($ready.Wait(8000)) 'Owned native fixture really starts'
  $fixtureReady=$ready.Result|ConvertFrom-Json
  Check ($fixtureReady.ready -eq $true) 'Owned fixture provides its actual window handle'
  $script:fixtureWindow=$fixtureReady.windowId
  @{type='fixture-ready';windowId=$fixtureReady.windowId;processId=$fixture.Id;focusPoint=$fixtureReady.focusPoint;bounds=$fixtureReady.bounds}|ConvertTo-Json -Depth 4 -Compress|Write-Output
  # The controller supplies a real virtual-USB click inside this owned window.
  # Neither the product helper nor this check force or retarget foreground.
  $focused=$false
  for($index=0;$index -lt 300;$index++) {
    try {$current=[Alicization.WindowsInput.Native]::ObserveForeground();$focused=$current.ProcessId -eq $fixture.Id -and $current.WindowId -ceq $fixtureReady.windowId} catch {$focused=$false}
    if($focused){break}
    Start-Sleep -Milliseconds 30
  }
  Check $focused 'Actual owned fixture acquired foreground before native input'
  Start-Sleep -Milliseconds 100
  if (!$ProductOnly) {
  foreach($kind in @('save','tab','escape')) {
    for($round=1;$round -le 3;$round++) {
      Focus-Entry
      $before=Read-State
      $expectedText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('QWN0dWFsIGtleWJvYXJkIGZpeHR1cmUg5Lit5paH8J+Zgg=='))
      Check ($before.content -ceq $expectedText) 'Fixture contains the independent exact UTF-8 Unicode literal'
      $keys=switch($kind) { 'save' { [int[]]@(0xA2,0x53) };'tab' { [int[]]@(9) };'escape' { [int[]]@(27) } }
      $result=Run-Chord $keys
      $after=$null
      for($index=0;$index -lt 100;$index++) {
        $after=Read-State
        if($after -and (($kind -eq 'save' -and $after.saves -eq $before.saves+1) -or ($kind -eq 'tab' -and $after.tabs -eq $before.tabs+1) -or ($kind -eq 'escape' -and $after.escapes -eq $before.escapes+1))) {break}
        Start-Sleep -Milliseconds 20
      }
      Check ($after.content -ceq $before.content) 'Native shortcut preserves exact Unicode text'
      Check ($after.saves -eq $before.saves+[int]($kind -eq 'save') -and $after.tabs -eq $before.tabs+[int]($kind -eq 'tab') -and $after.escapes -eq $before.escapes+[int]($kind -eq 'escape')) 'Independent fixture readback confirms the exact single intended action'
      Check ($after.focused -ceq $(if($kind -eq 'tab'){'next'}else{'entry'})) 'Actual focus matches the expected shortcut result'
      $report.rounds+=@{kind=$kind;round=$round;before=$before;after=$after;receipt=$result}
    }
  }
  . (Join-Path $PSScriptRoot 'windows-keyboard-fault-checks.ps1')
  Invoke-OwnedKeyboardFaultChecks -NativeSources $files
  Check ($report.faults.Count -eq 21) 'All seven actual fault conditions each complete three rounds'
  }
  $report.mode=if($ProductOnly){'production-composition-only'}else{'native-core-and-production-composition'}
  $productBundle=Join-Path $workspace 'output/keyboard-product-check.mjs'
  if(![IO.File]::Exists($productBundle)){throw 'Production composition bundle is required'}
  Push-Location -LiteralPath $workspace
  try {
    & (Join-Path $workspace 'node.exe') $productBundle $run $fixture.Id $script:fixtureWindow
    $productExit=$LASTEXITCODE
  } finally {Pop-Location}
  $productPath=Join-Path $run 'product-report.json'
  if(Test-Path -LiteralPath $productPath){$report.product=Get-Content -LiteralPath $productPath -Raw -Encoding UTF8 | ConvertFrom-Json}
  if($productExit -ne 0){throw 'Production native keyboard composition failed'}
  $product=$report.product
  Check ($product.passed -and $product.databaseClosed -and $product.keyboardStopped -and $product.rounds.Count -eq 18 -and $product.recoveryRounds.Count -eq 3) 'Actual production composition completes eighteen normal/refusal rounds and three actual Node-crash recovery rounds'
  foreach($file in $files){Check ((Get-FileHash -LiteralPath $file).Hash -ieq $report.sourceHashes[[IO.Path]::GetFileName($file)]) 'Native source remains unchanged throughout actual guest acceptance'}
  $report.nativeExecutableSha256=(Get-FileHash -LiteralPath $native).Hash.ToLowerInvariant()
  $report.passed=$true
} catch { $report.failure=$_.Exception.Message;throw }
finally {
  if($fixture) {
    [IO.File]::WriteAllText((Join-Path $run 'stop.txt'),'owned guest fixture shutdown')
    $normal=$fixture.WaitForExit(5000)
    $report.fixtureShutdown=$normal -and $fixture.ExitCode -eq 0
    if(!$report.fixtureShutdown){$report.passed=$false}
    $fixture.Dispose()
  }
  $report|ConvertTo-Json -Depth 14 | Set-Content -Encoding UTF8 (Join-Path $run 'report.json')
  @{report=(Join-Path $run 'report.json')} | ConvertTo-Json -Compress | Set-Content -Encoding UTF8 (Join-Path $workspace 'output/keyboard-latest.json')
  @{report=(Join-Path $run 'report.json');passed=$report.passed;fixtureShutdown=$report.fixtureShutdown}|ConvertTo-Json -Compress
}
