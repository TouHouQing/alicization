# Test fixture only. Retain one native process handle before CIM observation.
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class OwnedImageProbe {
  [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr OpenProcess(uint access,bool inherit,int pid);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetProcessTimes(IntPtr handle,out long created,out long exited,out long kernel,out long user);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool TerminateProcess(IntPtr handle,uint code);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern bool QueryFullProcessImageName(IntPtr handle,int flags,StringBuilder name,ref int length);
}
'@
function Test-OwnedStopped([IntPtr]$handle) {
  $state = [OwnedImageProbe]::WaitForSingleObject($handle,0)
  if ($state -eq 0) { return $true }
  if ($state -eq 258) { return $false }
  throw 'Owned process handle observation failed'
}
$r = [Console]::In.ReadToEnd() | ConvertFrom-Json
if ([int]$r.pid -le 0 -or ![IO.Path]::IsPathRooted([string]$r.executable) -or ![string]$r.nonce) { throw 'Invalid owned process request' }
# Query, synchronize and terminate use this same pinned handle; PID reuse cannot
# redirect cleanup. Only ERROR_INVALID_PARAMETER proves the PID is already gone.
$handle = [OwnedImageProbe]::OpenProcess(0x101001,$false,[int]$r.pid)
if ($handle -eq [IntPtr]::Zero) {
  $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  if ($code -eq 87) { @{ state='stopped' } | ConvertTo-Json -Compress; exit 0 }
  throw "Owned process handle unavailable: $code"
}
try {
  if (Test-OwnedStopped $handle) { @{ state='stopped' } | ConvertTo-Json -Compress; return }
  $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$r.pid)
  if (Test-OwnedStopped $handle) { @{ state='stopped' } | ConvertTo-Json -Compress; return }
  $name = [Text.StringBuilder]::new(32768)
  $length = 32768
  $created=0L; $exited=0L; $kernel=0L; $user=0L
  if (![OwnedImageProbe]::QueryFullProcessImageName($handle,0,$name,[ref]$length) -or ![OwnedImageProbe]::GetProcessTimes($handle,[ref]$created,[ref]$exited,[ref]$kernel,[ref]$user)) {
    if (Test-OwnedStopped $handle) { @{ state='stopped' } | ConvertTo-Json -Compress; return }
    throw 'Owned process identity unavailable'
  }
  if (![string]::Equals($name.ToString(),[IO.Path]::GetFullPath($r.executable),[StringComparison]::OrdinalIgnoreCase) -or !$p.CommandLine -or !$p.CommandLine.Contains([string]$r.nonce)) { throw 'Owned fixture image/nonce differs' }
  $ticks = [DateTime]::FromFileTimeUtc($created).Ticks.ToString()
  if ($r.ticks -and $ticks -cne [string]$r.ticks) { throw 'Original fixture birth differs' }
  if ($r.stop -eq $true) {
    if (![OwnedImageProbe]::TerminateProcess($handle,137) -and !(Test-OwnedStopped $handle)) { throw 'Owned original fixture stop failed' }
    if ([OwnedImageProbe]::WaitForSingleObject($handle,5000) -ne 0) { throw 'Owned original fixture did not stop' }
    @{ state='stopped'; ticks=$ticks } | ConvertTo-Json -Compress
  }
  else { @{ state= $(if (Test-OwnedStopped $handle) { 'stopped' } else { 'running' }); ticks=$ticks } | ConvertTo-Json -Compress }
}
finally { [void][OwnedImageProbe]::CloseHandle($handle) }
