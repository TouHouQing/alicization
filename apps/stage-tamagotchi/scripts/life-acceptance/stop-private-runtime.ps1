param(
  [Parameter(Mandatory = $true)][int]$RuntimePid,
  [Parameter(Mandatory = $true)][string]$ExecutablePath,
  [Parameter(Mandatory = $true)][string]$ProfilePath
)
$ErrorActionPreference = 'Stop'
if ($env:LIFE_QA_PRIVATE_DESKTOP -notmatch '^AlicizationQA_[a-f0-9]{32}$' -or [IO.Path]::GetFileName($ProfilePath) -notmatch '^alicization-(stage-smoke|life-[\w-]+)-') { throw 'Only an isolated QA runtime may be stopped' }
$qaWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$qaRegistry = [IO.Path]::GetFullPath($env:LIFE_QA_PROCESS_REGISTRY)
if (!$qaRegistry.StartsWith((Join-Path $qaWorkspace 'output') + '\', [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($qaRegistry) -notmatch '^private-processes-[a-f0-9]{32}\.jsonl$') { throw 'Invalid QA registration file' }
$qaRegistration = Get-Content -LiteralPath $qaRegistry | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.pid -eq $RuntimePid -and $_.desktop -eq $env:LIFE_QA_PRIVATE_DESKTOP -and $_.privateDesktopVerified -eq $true -and $_.executable -eq $ExecutablePath -and $_.profile -eq $ProfilePath }
if (@($qaRegistration).Count -ne 1) { throw 'Runtime is not registered to this QA job' }
$qaProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $RuntimePid)
if (!$qaProcess) { return }
if (![string]::Equals([IO.Path]::GetFullPath($qaProcess.ExecutablePath),[IO.Path]::GetFullPath($ExecutablePath),[StringComparison]::OrdinalIgnoreCase)) { throw 'Runtime executable identity changed' }
Stop-Process -Id $RuntimePid -Force
