# Fixed operations only. Source bytes come from the bundled main process;
# model arguments, shell text and foreground activation are never accepted.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
# Electron may inherit PowerShell 7 module paths; this fixed worker uses the
# Windows PowerShell/.NET Framework compiler and its own built-in modules.
$env:PSModulePath = Join-Path $PSHOME 'Modules'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$request = [Console]::In.ReadLine() | ConvertFrom-Json
if ($request.operation -ne 'prepare') { throw 'WINDOWS_KEYBOARD_OPERATION_REQUIRED' }
if (-not [Environment]::Is64BitProcess) { throw 'WINDOWS_KEYBOARD_REQUIRES_X64' }
$root = [IO.Path]::GetFullPath([string]$request.root)
if ((Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'WINDOWS_KEYBOARD_PROGRAM_LINK' }
$assembly = Join-Path $root 'keyboard.exe'
if ($request.operation -eq 'prepare') {
  if (@(Get-ChildItem -LiteralPath $root -Force).Count -ne 0) { throw 'WINDOWS_KEYBOARD_PROGRAM_NOT_FRESH' }
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $owner = [IO.Directory]::GetAccessControl($root, [Security.AccessControl.AccessControlSections]::Owner).GetOwner([Security.Principal.SecurityIdentifier])
  if ($owner.Value -notin @($sid.Value, 'S-1-5-32-544')) { throw 'WINDOWS_KEYBOARD_PROGRAM_OWNER' }
  $acl = [Security.AccessControl.DirectorySecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  # Setting even an unchanged owner requests WRITE_OWNER. A normal creator
  # already owns WRITE_DAC; preserve that identity and change the DACL only.
  foreach ($identity in @($sid, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'), [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))) {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow'))
  }
  [IO.Directory]::SetAccessControl($root, $acl)
  $actual = [IO.Directory]::GetAccessControl($root)
  if (!$actual.AreAccessRulesProtected -or $actual.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $owner.Value) { throw 'WINDOWS_KEYBOARD_PROGRAM_ACCESS' }
  if (@(Get-ChildItem -LiteralPath $root -Force).Count -ne 0) { throw 'WINDOWS_KEYBOARD_PROGRAM_NOT_FRESH' }
  $names = @('native', 'shared-state', 'hook-policy', 'hooks', 'session', 'process', 'receipts')
  if ($request.sources.Count -ne $names.Count) { throw 'WINDOWS_KEYBOARD_SOURCE_COUNT' }
  $paths = @()
  foreach ($name in $names) {
    $source = @($request.sources | Where-Object { $_.name -ceq $name })
    if ($source.Count -ne 1) { throw 'WINDOWS_KEYBOARD_SOURCE_IDENTITY' }
    $bytes = [Convert]::FromBase64String($source[0].bytes)
    $hash = [Security.Cryptography.SHA256]::Create()
    try { $digest = [BitConverter]::ToString($hash.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant() } finally { $hash.Dispose() }
    if ($digest -cne $source[0].sha256) { throw 'WINDOWS_KEYBOARD_SOURCE_HASH' }
    $path = Join-Path $root ('windows-keyboard-' + $name + '.cs')
    $stream = [IO.File]::Open($path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
    $paths += $path
  }
  Add-Type -Path $paths -OutputAssembly $assembly -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll
}
if ((Get-Item -LiteralPath $assembly -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'WINDOWS_KEYBOARD_PROGRAM_LINK' }
$assemblyHash = (Get-FileHash -LiteralPath $assembly -Algorithm SHA256).Hash.ToLowerInvariant()
[void][Reflection.Assembly]::LoadFrom($assembly)
if ([Runtime.InteropServices.Marshal]::SizeOf([type][Alicization.WindowsInput.InputEvent]) -ne 40) { throw 'WINDOWS_KEYBOARD_INPUT_LAYOUT' }
if ($request.operation -eq 'prepare') {
  $parent = [Diagnostics.Process]::GetProcessById([int]$request.parentProcessId)
  try { $ticks = $parent.StartTime.ToUniversalTime().Ticks.ToString([Globalization.CultureInfo]::InvariantCulture) } finally { $parent.Dispose() }
  @{ sha256 = $assemblyHash; parentStartTicks = $ticks; layout = 40 } | ConvertTo-Json -Compress
}
