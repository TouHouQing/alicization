param([Parameter(Mandatory=$true)][string]$NodePath,[Parameter(Mandatory=$true)][string]$BundleDirectory,[switch]$FixtureOnly,[switch]$NativeFaults,[switch]$UnicodeOnly)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if($PSVersionTable.PSEdition -cne 'Desktop'){throw 'Run this native fixture with Windows PowerShell 5.1 (powershell.exe), which supports .NET Framework executable compilation'}
# Match the production native compiler: inherited Core modules cannot service
# this fixed Windows PowerShell/.NET Framework worker.
$env:PSModulePath=Join-Path $PSHOME 'Modules'
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
if((Get-Location).Path -ine $workspace -or ![IO.File]::Exists($NodePath) -or [IO.Path]::GetFileName($NodePath) -ine 'node.exe'){throw 'Explicit project and Node runtime required'}
if($env:LIFE_QA_GUEST_PROOF_PATH -or $env:LIFE_QA_PRIVATE_DESKTOP -or $env:LIFE_QA_OWNED_HOST_PROOF){throw 'Do not mix host and guest/private acceptance scopes'}
if($FixtureOnly -and $NativeFaults){throw 'The Electron fixture controller cannot share native fault ownership'}
if($UnicodeOnly -and ($FixtureOnly -or $NativeFaults)){throw 'Passive Unicode UIA acceptance is separate from foreground input and fault acceptance'}
if($UnicodeOnly){$env:LIFE_QA_NATIVE_UNICODE_ONLY='1'}elseif($env:LIFE_QA_NATIVE_UNICODE_ONLY){throw 'Unexpected inherited passive Unicode mode'}
$payload=[IO.Path]::GetFullPath($BundleDirectory).TrimEnd('\')
if([IO.Path]::GetDirectoryName($payload) -ine (Join-Path $workspace 'output') -or [IO.Path]::GetFileName($payload) -cnotmatch '^keyboard-product-payload-[a-f0-9]{32}$' -or (Get-Item -LiteralPath $payload -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Fresh owned acceptance bundle directory required'}
$bundle=Join-Path $payload 'keyboard-product-check.mjs'
$manifest=Get-Content -LiteralPath (Join-Path $payload 'bundle-source.json') -Raw -Encoding UTF8|ConvertFrom-Json
if($manifest.format -cne 'alicization-keyboard-product-bundle-v1'){throw 'Acceptance bundle format'}
foreach($source in $manifest.sourceHashes.PSObject.Properties){if((Get-FileHash -LiteralPath $source.Name).Hash -ine $source.Value){throw ('Source changed after bundle build: '+$source.Name)}}
foreach($file in $manifest.files){$relative=[string]$file.file;if([IO.Path]::IsPathRooted($relative) -or $relative.Split('/') -contains '..'){throw 'Acceptance dependency escapes bundle'};if((Get-FileHash -LiteralPath (Join-Path $payload $relative)).Hash -ine $file.sha256){throw ('Acceptance dependency changed: '+$relative)}}
$run=Join-Path $workspace ('output/keyboard-host-'+[guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($run)
$proofPath=Join-Path $run 'host-fixture-owner.json'
$proof=@{format='alicization-owned-host-keyboard-fixture-v1';run=$run;machineName=[Environment]::MachineName;userSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;scope='Human explicitly authorized host testing; synthetic owned fixture only'}
[IO.File]::WriteAllText($proofPath,($proof|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
if($FixtureOnly){@{type='owned-host-fixture-starting';run=$run;proofPath=$proofPath}|ConvertTo-Json -Compress|Write-Output}
$fixtureExe=Join-Path $run 'fixture.exe'
Add-Type -Path @((Join-Path $PSScriptRoot 'windows-keyboard-fixture.cs'),(Join-Path $PSScriptRoot 'windows-keyboard-fixture-files.cs')) -OutputAssembly $fixtureExe -OutputType WindowsApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll,System.Windows.Forms.dll,System.Drawing.dll
$fixture=$null
$report=@{format='alicization-owned-host-keyboard-acceptance-v1';run=$run;passed=$false;fixtureShutdown=$false;fullElectronBootstrap=$false;syntheticApproval=$true;checks=@();bundleSha256=(Get-FileHash -LiteralPath $bundle).Hash.ToLowerInvariant()}
function Check([bool]$value,[string]$name) { $script:report.checks+=@{name=$name;passed=$value};if(!$value){throw $name} }
function Read-State { try { Get-Content -LiteralPath (Join-Path $run 'fixture-state.json') -Encoding UTF8 -Raw | ConvertFrom-Json } catch { $null } }
function Focus-Entry {
  # Child-control setup cannot reacquire foreground from the user.
  $id=[guid]::NewGuid().ToString('N')
  [IO.File]::WriteAllText((Join-Path $run 'focus-entry.txt'),$id)
  for($index=0;$index -lt 100;$index++) {
    $current=Read-State
    if($current.focusCommand -ceq $id -and $current.focused -ceq 'entry'){return}
    Start-Sleep -Milliseconds 30
  }
  throw 'Owned fixture did not acknowledge its child-control focus'
}
try {
  $start=[Diagnostics.ProcessStartInfo]::new($fixtureExe,('"'+$run+'"'))
  $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $fixture=[Diagnostics.Process]::Start($start)
  $ready=$fixture.StandardOutput.ReadLineAsync()
  if(!$ready.Wait(8000)){throw 'Owned host fixture readiness timed out'}
  $actual=$ready.Result|ConvertFrom-Json
  if(!$actual.ready -or $actual.processId -ne $fixture.Id){throw 'Actual owned fixture startup identity'}
  $proof.processId=$fixture.Id
  $proof.startTicks=$fixture.StartTime.ToUniversalTime().Ticks.ToString()
  $proof.windowId=[string]$actual.windowId
  $proof.executableSha256=(Get-FileHash -LiteralPath $fixtureExe).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText($proofPath,($proof|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
  & (Join-Path $PSScriptRoot 'assert-owned-windows-fixture.ps1') -ProofPath $proofPath | Write-Output
  if($FixtureOnly){
    $report.format='alicization-owned-host-fixture-only-v1'
    $report.syntheticApproval=$false
    @{type='owned-host-fixture-ready';run=$run;proofPath=$proofPath;processId=$fixture.Id;windowId=[string]$actual.windowId}|ConvertTo-Json -Compress|Write-Output
    if(!$fixture.WaitForExit(240000)){throw 'Owned Electron fixture was not closed by its controller'}
    if($fixture.ExitCode -ne 0){throw 'Owned Electron fixture exited abnormally'}
    $report.passed=$true
    return
  }
  # Initial setup only. Later foreground loss stops the matrix; never reacquire.
  if(!$UnicodeOnly){
    $report.initialFocus=& (Join-Path $PSScriptRoot 'focus-owned-windows-fixture.ps1') -ProofPath $proofPath | ConvertFrom-Json
    if(!$report.initialFocus.foregroundAcquired -or $report.initialFocus.shortcutInjected){throw 'Owned fixture initial foreground was not established'}
  }else{
    $report.format='alicization-owned-host-unicode-uia-acceptance-v1'
    $report.initialFocus=@{attempted=$false;shortcutInjected=$false;passiveOwnedWindow=$true}
  }
  $env:LIFE_QA_OWNED_HOST_PROOF=$proofPath
  & $NodePath $bundle $run $fixture.Id $actual.windowId
  $productExit=$LASTEXITCODE
  $report.product=Get-Content -LiteralPath (Join-Path $run 'product-report.json') -Raw -Encoding UTF8|ConvertFrom-Json
  if($productExit -ne 0 -or !$report.product.passed -or !$report.product.keyboardStopped -or !$report.product.databaseClosed -or $report.product.unicodeRounds.Count -ne 3){throw 'Owned host native Unicode acceptance failed'}
  if(!$UnicodeOnly -and ($report.product.rounds.Count -ne 18 -or $report.product.recoveryRounds.Count -ne 3)){throw 'Owned host native product/recovery acceptance failed'}
  if($NativeFaults){
    $source=Join-Path $workspace 'apps/stage-tamagotchi/src/main/services/alicization/execution'
    $files=@('native','shared-state','hook-policy','hooks','session','process','receipts')|ForEach-Object {Join-Path $source ('windows-keyboard-'+$_+'.cs')}
    $native=Join-Path $run 'owned-keyboard.exe'
    Add-Type -Path $files -OutputAssembly $native -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll
    [void][Reflection.Assembly]::LoadFrom($native)
    $script:fixtureWindow=[string]$actual.windowId
    . (Join-Path $PSScriptRoot 'windows-keyboard-fault-checks.ps1')
    Invoke-OwnedKeyboardFaultChecks -NativeSources $files -OwnedHost
    Check ($report.faults.Count -eq 18) 'Six actual owned-host native fault conditions each complete three rounds'
    $report.physicalTakeoverAccepted=$false
    $report.physicalTakeoverLimitation='No physical keyboard device controller is available; injected input is not evidence of physical takeover.'
  }
  foreach($source in $manifest.sourceHashes.PSObject.Properties){if((Get-FileHash -LiteralPath $source.Name).Hash -ine $source.Value){throw 'Source changed during native acceptance'}}
  $report.passed=$true
} catch {$report.failure=$_.Exception.Message;throw}
finally {
  Remove-Item Env:LIFE_QA_OWNED_HOST_PROOF -ErrorAction SilentlyContinue
  if($fixture){
    [IO.File]::WriteAllText((Join-Path $run 'stop.txt'),'Close this owned acceptance fixture')
    $report.fixtureShutdown=$fixture.WaitForExit(5000) -and $fixture.ExitCode -eq 0
    if(!$report.fixtureShutdown){$report.passed=$false}
    $fixture.Dispose()
  }
  [IO.File]::WriteAllText((Join-Path $run 'host-report.json'),($report|ConvertTo-Json -Depth 20),[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $workspace 'output/keyboard-host-latest.json'),(@{run=$run;passed=$report.passed;fixtureShutdown=$report.fixtureShutdown}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
  @{run=$run;passed=$report.passed;fixtureShutdown=$report.fixtureShutdown}|ConvertTo-Json -Compress|Write-Output
}
