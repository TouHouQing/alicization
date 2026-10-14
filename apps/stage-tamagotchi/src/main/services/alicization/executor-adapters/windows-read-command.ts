import { Buffer } from 'node:buffer'
import { join } from 'node:path'

// CMD built-ins have no executable for spawn(file, argv). Keep literal argv as
// encoded JSON data; never interpolate an argument into PowerShell source.
export function resolveWindowsReadCommand(input: { command: string, args: string[] }) {
  if (!['echo', 'pwd', 'ls', 'cat', 'type', 'true', 'false'].includes(input.command))
    return null
  const payload = Buffer.from(JSON.stringify(input), 'utf8').toString('base64')
  const source = `$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$alicizationReadRequest = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json
switch ($alicizationReadRequest.command) {
  { $_ -in @('cat', 'type') } {
    $alicizationReadLiteralMode = $false
    if (@($alicizationReadRequest.args).Count -eq 0) { throw 'File reading requires a literal path' }
    foreach ($alicizationReadPath in @($alicizationReadRequest.args)) {
      if ($alicizationReadPath -eq '--' -and -not $alicizationReadLiteralMode) { $alicizationReadLiteralMode = $true; continue }
      if (-not $alicizationReadLiteralMode -and $alicizationReadPath.StartsWith('-')) { throw 'Unsupported file reading option' }
      $alicizationResolvedReadPath = (Resolve-Path -LiteralPath $alicizationReadPath -ErrorAction Stop).ProviderPath
      if (-not [IO.File]::Exists($alicizationResolvedReadPath)) { throw 'Not a regular readable file' }
      [Console]::Write([IO.File]::ReadAllText($alicizationResolvedReadPath))
    }
    exit 0
  }
  'echo' { [Console]::WriteLine([string]::Join(' ', [string[]]$alicizationReadRequest.args)); exit 0 }
  'pwd' { if (@($alicizationReadRequest.args).Count -gt 0) { throw 'pwd does not accept arguments' }; [Console]::WriteLine((Get-Location).Path); exit 0 }
  'ls' {
    $alicizationListPaths = @()
    $alicizationListHidden = $false
    foreach ($alicizationListArgument in @($alicizationReadRequest.args)) {
      if ($alicizationListArgument -in @('-a', '-la', '-al', '--all')) { $alicizationListHidden = $true }
      elseif ($alicizationListArgument -eq '-l') { }
      elseif ($alicizationListArgument.StartsWith('-')) { throw 'Unsupported directory listing option' }
      else { $alicizationListPaths += $alicizationListArgument }
    }
    if ($alicizationListPaths.Count -eq 0) { $alicizationListPaths = @((Get-Location).Path) }
    foreach ($alicizationListPath in $alicizationListPaths) {
      Get-ChildItem -LiteralPath $alicizationListPath -Force:$alicizationListHidden -ErrorAction Stop | ForEach-Object { [Console]::WriteLine($_.Name) }
    }
    exit 0
  }
  'true' { exit 0 }
  'false' { exit 1 }
}`
  return { command: join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(source, 'utf16le').toString('base64')] }
}
