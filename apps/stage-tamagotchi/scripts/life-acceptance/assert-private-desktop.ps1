param([Parameter(Mandatory = $true)][string]$ExpectedDesktop)
$ErrorActionPreference = 'Stop'
if ($ExpectedDesktop -notmatch '^AlicizationQA_[a-f0-9]{32}$') { throw 'Only a named QA desktop is allowed' }
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class AlicizationDesktopIdentity {
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("user32.dll", SetLastError=true)] static extern IntPtr GetThreadDesktop(uint id);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder value, uint length, out uint needed);
  public static string Current() {
    var handle = GetThreadDesktop(GetCurrentThreadId());
    var name = new StringBuilder(512); uint needed;
    if (handle == IntPtr.Zero || !GetUserObjectInformation(handle, 2, name, 1024, out needed)) throw new Win32Exception();
    return name.ToString();
  }
}
'@
$qaCurrentDesktop = [AlicizationDesktopIdentity]::Current()
if ($qaCurrentDesktop -cne $ExpectedDesktop) { throw "QA process is on '$qaCurrentDesktop', not its isolated desktop" }
@{ desktop = $qaCurrentDesktop; privateDesktopVerified = $true } | ConvertTo-Json -Compress
