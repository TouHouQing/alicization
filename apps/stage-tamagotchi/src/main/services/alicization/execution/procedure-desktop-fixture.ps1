$ErrorActionPreference = 'Stop'
$env:PSModulePath = Join-Path $PSHOME 'Modules'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$fixture = [Console]::In.ReadLine() | ConvertFrom-Json
if ($fixture.nonce -cnotmatch '^[a-f0-9]{32}$' -or $fixture.sourceSha256 -cnotmatch '^[a-f0-9]{64}$') { throw 'Owned desktop replay source identity required' }
$source = [Convert]::FromBase64String([string]$fixture.source)
if ($source.Length -gt 65536) { throw 'Owned desktop replay source budget exceeded' }
$sha = [Security.Cryptography.SHA256]::Create()
try { $actual = [BitConverter]::ToString($sha.ComputeHash($source)).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
if ($actual -cne $fixture.sourceSha256) { throw 'Owned desktop replay source changed' }
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
Add-Type -ReferencedAssemblies System.dll,System.Core.dll,System.Windows.Forms.dll,System.Drawing.dll,System.Web.Extensions.dll -TypeDefinition ([Text.Encoding]::UTF8.GetString($source))
[AlicizationDesktopMethodFixture]::Run(($fixture | ConvertTo-Json -Depth 4 -Compress))
