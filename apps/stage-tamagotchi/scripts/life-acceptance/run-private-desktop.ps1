param(
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][string]$ScriptPath,
  [Parameter(Mandatory = $true)][string]$LogPath,
  [int]$TimeoutSeconds = 240
)
$ErrorActionPreference = 'Stop'
$qaWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$qaScript = [IO.Path]::GetFullPath($ScriptPath)
$qaLog = [IO.Path]::GetFullPath($LogPath)
if (!$qaScript.StartsWith($PSScriptRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or ![IO.File]::Exists($qaScript) -or !($qaScript.EndsWith('.cjs'))) { throw 'Only checked-in acceptance scripts can run on this desktop' }
if (!$qaLog.StartsWith((Join-Path $qaWorkspace 'output') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'QA log must stay in workspace output' }
if (![IO.File]::Exists($NodePath) -or [IO.Path]::GetFileName($NodePath) -ne 'node.exe') { throw 'An explicit Node runtime is required' }
if ($TimeoutSeconds -lt 5 -or $TimeoutSeconds -gt 900) { throw 'QA timeout must be between 5 and 900 seconds' }

# Source: Microsoft STARTUPINFOW / Thread Connection to a Desktop / Job Objects.
# No input-desktop switching, cursor/keyboard injection, or screen capture API is used.
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
public static class AlicizationPrivateDesktop {
  [StructLayout(LayoutKind.Sequential)] public struct Security { public uint length; public IntPtr descriptor; public int inherit; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Startup {
    public uint cb; public string reserved; public string desktop; public string title;
    public uint x,y,xSize,ySize,xChars,yChars,fill,flags; public ushort show,reserved2;
    public IntPtr reservedPtr,input,output,error;
  }
  [StructLayout(LayoutKind.Sequential)] public struct ProcessInfo { public IntPtr process,thread; public uint processId,threadId; }
  [StructLayout(LayoutKind.Sequential)] public struct BasicLimits {
    public long processTime,jobTime; public uint flags; public UIntPtr minimumWorking,maximumWorking;
    public uint activeProcesses; public UIntPtr affinity; public uint priority,scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] public struct IoCounters { public ulong readCount,writeCount,otherCount,readBytes,writeBytes,otherBytes; }
  [StructLayout(LayoutKind.Sequential)] public struct Limits { public BasicLimits basic; public IoCounters io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr CreateDesktop(string name, IntPtr device, IntPtr mode, uint flags, uint access, IntPtr security);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool CloseDesktop(IntPtr desktop);
  [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool GetUserObjectInformation(IntPtr handle,int index,StringBuilder value,uint length,out uint needed);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr CreateFile(string name,uint access,uint share,ref Security security,uint creation,uint flags,IntPtr template);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CreateProcess(string executable,StringBuilder command,IntPtr processSecurity,IntPtr threadSecurity,bool inherit,uint flags,IntPtr environment,string cwd,ref Startup startup,out ProcessInfo info);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr CreateJobObject(IntPtr security,string name);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool SetInformationJobObject(IntPtr job,int info,ref Limits limits,uint length);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern uint WaitForSingleObject(IntPtr handle,uint time);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool GetExitCodeProcess(IntPtr process,out uint code);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool TerminateProcess(IntPtr process,uint code);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool TerminateJobObject(IntPtr job, uint code);
  public static void Check(bool value) { if (!value) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  public static string Quote(string value) {
    return "\"" + Regex.Replace(Regex.Replace(value, "(\\\\*)\"", "$1$1\\\""), "(\\\\+)$", "$1$1") + "\"";
  }
  public static string InputName() {
    var handle=OpenInputDesktop(0,false,1);
    if (handle==IntPtr.Zero) throw new Win32Exception();
    try { var value=new StringBuilder(512); uint needed; Check(GetUserObjectInformation(handle,2,value,1024,out needed)); return value.ToString(); }
    finally { CloseDesktop(handle); }
  }
}
'@
$qaDesktopName = 'AlicizationQA_' + [Guid]::NewGuid().ToString('N')
$qaInputBefore = [AlicizationPrivateDesktop]::InputName()
$qaDesktopHandle = [IntPtr]::Zero
$qaJobHandle = [IntPtr]::Zero
$qaOutputHandle = [IntPtr]::Zero
$qaNullHandle = [IntPtr]::Zero
$qaInfo = New-Object AlicizationPrivateDesktop+ProcessInfo
$qaExit = [uint32]1
$qaAssigned = $false
$qaRegistered = [Collections.Generic.HashSet[int]]::new()
$qaRegistry = Join-Path $qaWorkspace ('output/private-processes-' + [Guid]::NewGuid().ToString('N') + '.jsonl')
try {
  # No DESKTOP_SWITCHDESKTOP right (0x100) is requested.
  $qaDesktopHandle = [AlicizationPrivateDesktop]::CreateDesktop($qaDesktopName, [IntPtr]::Zero, [IntPtr]::Zero, 0, 0xCB, [IntPtr]::Zero)
  [AlicizationPrivateDesktop]::Check($qaDesktopHandle -ne [IntPtr]::Zero)
  $qaJobHandle = [AlicizationPrivateDesktop]::CreateJobObject([IntPtr]::Zero, $null)
  [AlicizationPrivateDesktop]::Check($qaJobHandle -ne [IntPtr]::Zero)
  $qaLimits = New-Object AlicizationPrivateDesktop+Limits
  $qaLimits.basic.flags = 0x2000 # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
  [AlicizationPrivateDesktop]::Check([AlicizationPrivateDesktop]::SetInformationJobObject($qaJobHandle, 9, [ref]$qaLimits, [Runtime.InteropServices.Marshal]::SizeOf($qaLimits)))
  $qaSecurity = New-Object AlicizationPrivateDesktop+Security
  $qaSecurity.length = [Runtime.InteropServices.Marshal]::SizeOf($qaSecurity)
  $qaSecurity.inherit = 1
  $qaOutputHandle = [AlicizationPrivateDesktop]::CreateFile($qaLog, 0x40000000, 3, [ref]$qaSecurity, 2, 0x80, [IntPtr]::Zero)
  [AlicizationPrivateDesktop]::Check($qaOutputHandle.ToInt64() -ne -1)
  $qaNullHandle = [AlicizationPrivateDesktop]::CreateFile('NUL', [uint32]2147483648, 3, [ref]$qaSecurity, 3, 0x80, [IntPtr]::Zero)
  [AlicizationPrivateDesktop]::Check($qaNullHandle.ToInt64() -ne -1)
  $qaStartup = New-Object AlicizationPrivateDesktop+Startup
  $qaStartup.cb = [Runtime.InteropServices.Marshal]::SizeOf($qaStartup)
  $qaStartup.desktop = 'WinSta0\' + $qaDesktopName
  $qaStartup.flags = 0x181 # Use handles, hidden startup, no feedback cursor.
  $qaStartup.show = 0
  $qaStartup.input = $qaNullHandle
  $qaStartup.output = $qaOutputHandle
  $qaStartup.error = $qaOutputHandle
  $env:LIFE_QA_PRIVATE_DESKTOP = $qaDesktopName
  $env:LIFE_QA_PROCESS_REGISTRY = $qaRegistry
  $qaCommand = New-Object Text.StringBuilder ([AlicizationPrivateDesktop]::Quote($NodePath) + ' ' + [AlicizationPrivateDesktop]::Quote($qaScript))
  [AlicizationPrivateDesktop]::Check([AlicizationPrivateDesktop]::CreateProcess($NodePath,$qaCommand,[IntPtr]::Zero,[IntPtr]::Zero,$true,0x08000004,[IntPtr]::Zero,$qaWorkspace,[ref]$qaStartup,[ref]$qaInfo))
  [AlicizationPrivateDesktop]::Check([AlicizationPrivateDesktop]::AssignProcessToJobObject($qaJobHandle,$qaInfo.process))
  $qaAssigned = $true
  [AlicizationPrivateDesktop]::Check([AlicizationPrivateDesktop]::ResumeThread($qaInfo.thread) -ne [uint32]::MaxValue)
  $qaDeadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  while ([AlicizationPrivateDesktop]::WaitForSingleObject($qaInfo.process,1000) -eq 258) {
    if ([IO.File]::Exists($qaRegistry)) {
      # The native child can append its identity at this exact moment. Read
      # with write sharing and defer an incomplete final NDJSON line.
      $qaRegistryStream = [IO.File]::Open($qaRegistry, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
      $qaRegistryReader = New-Object IO.StreamReader($qaRegistryStream)
      try { $qaRegistryText = $qaRegistryReader.ReadToEnd() }
      finally { $qaRegistryReader.Dispose() }
      $qaRegistryLines = @($qaRegistryText -split '\r?\n')
      if (!$qaRegistryText.EndsWith("`n")) { $qaRegistryLines = @($qaRegistryLines | Select-Object -SkipLast 1) }
      foreach ($qaLine in $qaRegistryLines) {
        if (!$qaLine.Trim()) { continue }
        $qaRuntime = $qaLine | ConvertFrom-Json
        if ($qaRegistered.Contains([int]$qaRuntime.pid)) { continue }
        if ($qaRuntime.desktop -ne $qaDesktopName -or $qaRuntime.privateDesktopVerified -ne $true -or [IO.Path]::GetFileName($qaRuntime.profile) -notmatch '^alicization-(stage-smoke|life-[\w-]+)-') { throw 'Runtime ownership registration mismatch' }
        $qaNativeProcess = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$qaRuntime.pid)
        if (!$qaNativeProcess) { [void]$qaRegistered.Add([int]$qaRuntime.pid); continue }
        if (![string]::Equals([IO.Path]::GetFullPath($qaNativeProcess.ExecutablePath),[IO.Path]::GetFullPath($qaRuntime.executable),[StringComparison]::OrdinalIgnoreCase)) { throw 'Runtime process identity changed' }
        $qaNativeHandle = [AlicizationPrivateDesktop]::OpenProcess(0x101501, $false, [uint32]$qaRuntime.pid)
        [AlicizationPrivateDesktop]::Check($qaNativeHandle -ne [IntPtr]::Zero)
        try {
          $qaInJob = $false
          [AlicizationPrivateDesktop]::Check([AlicizationPrivateDesktop]::IsProcessInJob($qaNativeHandle,$qaJobHandle,[ref]$qaInJob))
          if (!$qaInJob) { [AlicizationPrivateDesktop]::Check([AlicizationPrivateDesktop]::AssignProcessToJobObject($qaJobHandle,$qaNativeHandle)) }
        }
        finally { [void][AlicizationPrivateDesktop]::CloseHandle($qaNativeHandle) }
        [void]$qaRegistered.Add([int]$qaRuntime.pid)
      }
    }
    if ([DateTime]::UtcNow -gt $qaDeadline) { throw 'Isolated native QA exceeded its bounded timeout' }
  }
  [AlicizationPrivateDesktop]::Check([AlicizationPrivateDesktop]::GetExitCodeProcess($qaInfo.process,[ref]$qaExit))
}
finally {
  if ($qaJobHandle -ne [IntPtr]::Zero) { [void][AlicizationPrivateDesktop]::TerminateJobObject($qaJobHandle,1) }
  if (!$qaAssigned -and $qaInfo.process -ne [IntPtr]::Zero) { [void][AlicizationPrivateDesktop]::TerminateProcess($qaInfo.process,1) }
  foreach ($qaHandle in @($qaJobHandle,$qaInfo.thread,$qaInfo.process,$qaOutputHandle,$qaNullHandle)) {
    if ($qaHandle -ne [IntPtr]::Zero -and $qaHandle.ToInt64() -ne -1) { [void][AlicizationPrivateDesktop]::CloseHandle($qaHandle) }
  }
  if ($qaDesktopHandle -ne [IntPtr]::Zero) { [void][AlicizationPrivateDesktop]::CloseDesktop($qaDesktopHandle) }
}
@{ desktop = $qaDesktopName; childExitCode = $qaExit; inputDesktopBefore = $qaInputBefore; inputDesktopAfter = [AlicizationPrivateDesktop]::InputName(); switchedInputDesktop = $false; childJobClosed = $true; registeredRuntimePids = @($qaRegistered); log = $qaLog } | ConvertTo-Json -Compress
exit $qaExit
