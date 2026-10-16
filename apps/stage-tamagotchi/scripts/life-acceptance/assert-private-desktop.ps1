param([Parameter(Mandatory = $true)][string]$ExpectedDesktop, [int]$RuntimePid = 0)
$ErrorActionPreference = 'Stop'
if ($ExpectedDesktop -notmatch '^AlicizationQA_[a-f0-9]{32}$') { throw 'Only a named QA desktop is allowed' }
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class AlicizationDesktopIdentity {
  delegate bool EnumWindow(IntPtr window, IntPtr state);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr OpenDesktop(string name, uint flags, bool inherit, uint access);
  [DllImport("user32.dll", SetLastError=true)] static extern bool CloseDesktop(IntPtr desktop);
  [DllImport("user32.dll", SetLastError=true)] static extern bool EnumDesktopWindows(IntPtr desktop, EnumWindow callback, IntPtr state);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("user32.dll", SetLastError=true)] static extern IntPtr GetThreadDesktop(uint id);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder value, uint length, out uint needed);
  public static string Current() {
    var handle = GetThreadDesktop(GetCurrentThreadId());
    var name = new StringBuilder(512); uint needed;
    if (handle == IntPtr.Zero || !GetUserObjectInformation(handle, 2, name, 1024, out needed)) throw new Win32Exception();
    return name.ToString();
  }
  public static bool ContainsProcess(string name, uint target) {
    var desktop = OpenDesktop(name, 0, false, 0x0041);
    if (desktop == IntPtr.Zero) throw new Win32Exception();
    bool found = false;
    try {
      EnumDesktopWindows(desktop, (window, state) => {
        uint pid; GetWindowThreadProcessId(window, out pid);
        if (pid == target) found = true;
        return !found;
      }, IntPtr.Zero);
      return found;
    } finally { CloseDesktop(desktop); }
  }
}
'@
$qaCurrentDesktop = [AlicizationDesktopIdentity]::Current()
if ($qaCurrentDesktop -cne $ExpectedDesktop) { throw "QA process is on '$qaCurrentDesktop', not its isolated desktop" }
$qaProof = @{ desktop = $qaCurrentDesktop; privateDesktopVerified = $true }
if ($RuntimePid -gt 0) {
  if (![AlicizationDesktopIdentity]::ContainsProcess($ExpectedDesktop, $RuntimePid)) { throw 'Runtime window is outside the expected private desktop' }
  $qaProof.runtimeWindowVerified = $true
  $qaProof.runtimePid = $RuntimePid
}
$qaProof | ConvertTo-Json -Compress
