param([Parameter(Mandatory=$true)][string]$ProofPath)
$ErrorActionPreference='Stop'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
& (Join-Path $PSScriptRoot 'assert-owned-windows-fixture.ps1') -ProofPath $ProofPath | Out-Null
$proof=Get-Content -LiteralPath $ProofPath -Raw -Encoding UTF8|ConvertFrom-Json
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class AlicizationFixtureInitialFocus {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  public static bool Owned(IntPtr window, int expected){uint process;return GetWindowThreadProcessId(window,out process)!=0&&process==expected;}
}
'@
$handle=[IntPtr]::new([long]$proof.windowId)
$original=[Diagnostics.Process]::GetProcessById([int]$proof.processId)
try {
  [void]$original.Handle
  if($original.HasExited -or $original.StartTime.ToUniversalTime().Ticks.ToString() -cne [string]$proof.startTicks -or ![AlicizationFixtureInitialFocus]::Owned($handle,[int]$proof.processId)){throw 'Owned fixture process/window changed before initial focus'}
# One explicit test setup action, never a shortcut or a retry after takeover.
  if(![AlicizationFixtureInitialFocus]::SetForegroundWindow($handle)){throw 'Windows refused initial owned fixture focus'}
$watch=[Diagnostics.Stopwatch]::StartNew()
while([AlicizationFixtureInitialFocus]::GetForegroundWindow() -ne $handle -and $watch.ElapsedMilliseconds -lt 1000){Start-Sleep -Milliseconds 20}
  if([AlicizationFixtureInitialFocus]::GetForegroundWindow() -ne $handle -or $original.HasExited -or ![AlicizationFixtureInitialFocus]::Owned($handle,[int]$proof.processId)){throw 'Owned fixture did not acquire initial foreground focus'}
@{foregroundAcquired=$true;processId=[int]$proof.processId;windowId=[string]$proof.windowId;shortcutInjected=$false}|ConvertTo-Json -Compress
} finally {$original.Dispose()}
