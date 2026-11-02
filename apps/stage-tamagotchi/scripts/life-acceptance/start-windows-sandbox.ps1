param([switch]$Start)
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$sandboxFeature = Get-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM
$runId = [Guid]::NewGuid().ToString('N')
$runRoot = Join-Path $workspace ('output/windows-sandbox-' + $runId)
$inputRoot = Join-Path $runRoot 'input'
$reportRoot = Join-Path $runRoot 'reports'
[void][IO.Directory]::CreateDirectory($inputRoot)
[void][IO.Directory]::CreateDirectory($reportRoot)
[IO.File]::WriteAllText((Join-Path $inputRoot 'bootstrap.ps1'), [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'windows-sandbox-bootstrap.ps1')), [Text.UTF8Encoding]::new($true))
@{runId=$runId;hostComputer=$env:COMPUTERNAME;createdAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $reportRoot 'host-binding.json') -Encoding utf8
$escape = { param([string]$Value) [Security.SecurityElement]::Escape($Value) }
$inputXml = & $escape $inputRoot
$reportsXml = & $escape $reportRoot
$configuration = @"
<Configuration>
  <VGpu>Enable</VGpu>
  <Networking>Disable</Networking>
  <AudioInput>Disable</AudioInput>
  <VideoInput>Disable</VideoInput>
  <ClipboardRedirection>Disable</ClipboardRedirection>
  <PrinterRedirection>Disable</PrinterRedirection>
  <MemoryInMB>4096</MemoryInMB>
  <MappedFolders>
    <MappedFolder><HostFolder>$inputXml</HostFolder><SandboxFolder>C:\AlicizationQA\Input</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder>
    <MappedFolder><HostFolder>$reportsXml</HostFolder><SandboxFolder>C:\AlicizationQA\Reports</SandboxFolder><ReadOnly>false</ReadOnly></MappedFolder>
  </MappedFolders>
  <LogonCommand><Command>powershell.exe -NoProfile -NonInteractive -STA -ExecutionPolicy Bypass -File C:\AlicizationQA\Input\bootstrap.ps1 -ReportDirectory C:\AlicizationQA\Reports</Command></LogonCommand>
</Configuration>
"@
# Parse the exact saved XML before any attempt to launch the guest.
$xml = [xml]$configuration
if ($xml.Configuration.MappedFolders.MappedFolder.Count -ne 2 -or $xml.Configuration.ClipboardRedirection -ne 'Disable') { throw 'SANDBOX_CONFIGURATION_INVALID' }
$configPath = Join-Path $runRoot 'Alicization-Test.wsb'
$configuration | Set-Content -LiteralPath $configPath -Encoding utf8
$executable = Join-Path $env:SystemRoot 'System32/WindowsSandbox.exe'
$restartNeeded = (Test-Path -LiteralPath 'HKLM:/SOFTWARE/Microsoft/Windows/CurrentVersion/Component Based Servicing/RebootPending') -and !(Test-Path -LiteralPath $executable)
$result = @{runId=$runId;configuration=$configPath;reports=$reportRoot;featureState=$sandboxFeature.State.ToString();restartNeeded=$restartNeeded;status='prepared';actualGuestStarted=$false;scope='environment-readiness-not-application-acceptance'}
if ($Start) {
  if ($sandboxFeature.State.ToString() -ne 'Enabled' -or !(Test-Path -LiteralPath $executable)) {
    $result.status='restart-required'
  }
  else {
    # The guest owns its input desktop. The host client is started hidden so
    # successful guest input does not take over the user's host work window.
    $client = Start-Process -FilePath $executable -ArgumentList ('"' + $configPath + '"') -WindowStyle Hidden -PassThru
    $result.clientProcessId=$client.Id
    $result.status='launch-requested'
    $deadline = [DateTime]::UtcNow.AddSeconds(50)
    $reportPath = Join-Path $reportRoot 'readiness.json'
    do {
      if (Test-Path -LiteralPath $reportPath) {
        try {
          $guest = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
          if ($guest.runId -eq $runId -and $guest.status -eq 'ready') {
            $result.status='ready'
            $result.actualGuestStarted=$true
            break
          }
          if ($guest.status -eq 'failed') { $result.status='guest-readiness-failed'; break }
        }
        catch { }
      }
      Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)
  }
}
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runRoot 'host-result.json') -Encoding utf8
$result | ConvertTo-Json -Compress
