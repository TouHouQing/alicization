$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
try {
  $request = [Console]::In.ReadLine() | ConvertFrom-Json
  if ($request.operation -notin @('inspect','stop')) { throw 'PROCESS_OPERATION_REQUIRED' }
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Globalization;
using Microsoft.Win32.SafeHandles;
public static class AlicizationRecoveryProcess {
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern SafeProcessHandle OpenProcess(uint access, bool inherit, uint pid);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool GetProcessTimes(SafeProcessHandle process, out long creation, out long exit, out long kernel, out long user);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, ExactSpelling=true, SetLastError=true)]
  private static extern bool QueryFullProcessImageNameW(SafeProcessHandle process, uint flags, StringBuilder image, ref uint size);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool TerminateProcess(SafeProcessHandle process, uint code);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern uint WaitForSingleObject(SafeProcessHandle process, uint milliseconds);
  public static string Check(uint pid, string creationTicks, string executable, bool stop) {
    // The same open kernel object is used for identity, termination and wait;
    // reusing a numeric PID can never redirect this stop to another process.
    using (var process = OpenProcess(0x101000u | (stop ? 1u : 0u), false, pid)) {
      if (process.IsInvalid) return Marshal.GetLastWin32Error() == 87 ? "stopped" : "unknown";
      if (WaitForSingleObject(process, 0) == 0) return "stopped";
      long creation, exit, kernel, user;
      if (!GetProcessTimes(process, out creation, out exit, out kernel, out user)) return "unknown";
      if (DateTime.FromFileTimeUtc(creation).Ticks.ToString(CultureInfo.InvariantCulture) != creationTicks) return "stopped";
      var image = new StringBuilder(4096);
      uint size = 4096;
      if (!QueryFullProcessImageNameW(process, 0, image, ref size) || !String.Equals(image.ToString(), executable, StringComparison.OrdinalIgnoreCase)) return "unknown";
      if (!stop) return "running";
      if (!TerminateProcess(process, 1)) return WaitForSingleObject(process, 0) == 0 ? "stopped" : "unknown";
      return WaitForSingleObject(process, 5000) == 0 ? "stopped" : "unknown";
    }
  }
}
'@
  $state = [AlicizationRecoveryProcess]::Check([uint32]$request.pid,[string]$request.creationTimeTicks,[string]$request.executable,$request.operation -eq 'stop')
  @{state=$state} | ConvertTo-Json -Compress
}
catch { @{state='unknown'} | ConvertTo-Json -Compress }
