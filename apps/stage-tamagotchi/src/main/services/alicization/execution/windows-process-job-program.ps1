# Fixed bundled compiler only; no commands, model paths or secrets are accepted.
$ErrorActionPreference = 'Stop'
$env:PSModulePath = Join-Path $PSHOME 'Modules'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$request = [Console]::In.ReadLine() | ConvertFrom-Json
$root = [IO.Path]::GetFullPath([string]$request.root)
if ((Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'WINDOWS_PROCESS_PROGRAM_LINK' }
if (@(Get-ChildItem -LiteralPath $root -Force).Count -ne 0) { throw 'WINDOWS_PROCESS_PROGRAM_NOT_FRESH' }
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$owner = [IO.Directory]::GetAccessControl($root).GetOwner([Security.Principal.SecurityIdentifier])
if ($owner.Value -notin @($sid.Value, 'S-1-5-32-544')) { throw 'WINDOWS_PROCESS_PROGRAM_OWNER' }
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetAccessRuleProtection($true, $false)
foreach ($identity in @($sid, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'), [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))) {
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow'))
}
[IO.Directory]::SetAccessControl($root, $acl)
if (![IO.Directory]::GetAccessControl($root).AreAccessRulesProtected) { throw 'WINDOWS_PROCESS_PROGRAM_ACCESS' }
$bytes = [Convert]::FromBase64String([string]$request.source)
$hash = [Security.Cryptography.SHA256]::Create()
try { $digest = [BitConverter]::ToString($hash.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant() } finally { $hash.Dispose() }
if ($digest -cne [string]$request.sha256) { throw 'WINDOWS_PROCESS_PROGRAM_SOURCE_HASH' }
$source = Join-Path $root 'process-job.cs'
$stream = [IO.File]::Open($source, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
$assembly = Join-Path $root 'process-job.exe'
Add-Type -Path $source -OutputAssembly $assembly -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll
@{ sha256 = (Get-FileHash -LiteralPath $assembly -Algorithm SHA256).Hash.ToLowerInvariant() } | ConvertTo-Json -Compress
