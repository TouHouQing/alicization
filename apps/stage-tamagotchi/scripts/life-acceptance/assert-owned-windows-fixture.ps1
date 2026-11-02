param([Parameter(Mandatory=$true)][string]$ProofPath)
$ErrorActionPreference='Stop'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..')).TrimEnd('\')
$proofFile=Get-Item -LiteralPath $ProofPath -Force
if($proofFile.Attributes -band [IO.FileAttributes]::ReparsePoint -or $proofFile.Length -gt 8192){throw 'Owned host proof file identity'}
$proof=Get-Content -LiteralPath $proofFile.FullName -Raw -Encoding UTF8|ConvertFrom-Json
$root=[IO.Path]::GetFullPath([string]$proof.run).TrimEnd('\')
if([IO.Path]::GetDirectoryName($root) -ine (Join-Path $workspace 'output') -or [IO.Path]::GetFileName($root) -cnotmatch '^keyboard-host-[a-f0-9]{32}$'){throw 'Owned host fixture root'}
if($proofFile.FullName -ine (Join-Path $root 'host-fixture-owner.json') -or (Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Owned host fixture proof location'}
if($proof.format -cne 'alicization-owned-host-keyboard-fixture-v1' -or $proof.machineName -cne [Environment]::MachineName -or $proof.userSid -cne [Security.Principal.WindowsIdentity]::GetCurrent().User.Value){throw 'Owned host machine/user identity'}
$current=[Diagnostics.Process]::GetCurrentProcess()
$fixture=[Diagnostics.Process]::GetProcessById([int]$proof.processId)
try {
  $exe=Join-Path $root 'fixture.exe'
  if($fixture.HasExited -or $fixture.SessionId -ne $current.SessionId -or $fixture.MainModule.FileName -ine $exe -or $fixture.StartTime.ToUniversalTime().Ticks.ToString() -cne [string]$proof.startTicks){throw 'Owned host process/window identity'}
  if((Get-Item -LiteralPath $exe -Force).Attributes -band [IO.FileAttributes]::ReparsePoint -or (Get-FileHash -LiteralPath $exe).Hash -ine $proof.executableSha256){throw 'Owned host fixture executable changed'}
  Add-Type -AssemblyName System.Windows.Forms,System.Drawing
  if(!('AlicizationOwnedHostGeometry' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AlicizationOwnedHostGeometry {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll", SetLastError=true)] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window, uint flags);
}
'@
  }
  $rect=New-Object AlicizationOwnedHostGeometry+Rect
  $handle=[IntPtr]::new([long]$proof.windowId)
  [uint32]$windowProcess=0
  if(![AlicizationOwnedHostGeometry]::GetWindowThreadProcessId($handle,[ref]$windowProcess) -or $windowProcess -ne $fixture.Id -or ![AlicizationOwnedHostGeometry]::IsWindowVisible($handle) -or [AlicizationOwnedHostGeometry]::GetAncestor($handle,2) -ne $handle){throw 'Owned host exact window identity'}
  if(![AlicizationOwnedHostGeometry]::GetWindowRect($handle,[ref]$rect)){throw 'Owned fixture actual window bounds unavailable'}
  $bounds=[Drawing.Rectangle]::FromLTRB($rect.Left,$rect.Top,$rect.Right,$rect.Bottom)
  if($bounds.Width -le 0 -or $bounds.Height -le 0){throw 'Owned fixture has no actual window area'}
  foreach($screen in [Windows.Forms.Screen]::AllScreens){if($bounds.IntersectsWith($screen.Bounds)){throw 'Owned keyboard fixture would cover a physical display'}}
  @{ownedHostFixtureVerified=$true;outsideAllDisplays=$true;bounds=@{x=$bounds.X;y=$bounds.Y;width=$bounds.Width;height=$bounds.Height};run=$root;processId=$fixture.Id;windowId=[string]$proof.windowId;scope='Explicitly authorized host test; exact owned fixture only; no unrelated window target'}|ConvertTo-Json -Compress -Depth 4
} finally {$fixture.Dispose();$current.Dispose()}
