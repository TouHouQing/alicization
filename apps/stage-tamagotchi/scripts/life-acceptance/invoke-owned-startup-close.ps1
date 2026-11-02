param(
  [Parameter(Mandatory=$true)][int]$RuntimePid,
  [Parameter(Mandatory=$true)][string]$Executable,
  [Parameter(Mandatory=$true)][string]$ExecutableSha256,
  [Parameter(Mandatory=$true)][string]$ExpectedError,
  [Parameter(Mandatory=$true)][string]$ErrorLogPath
)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if($env:LIFE_QA_PRIVATE_DESKTOP -cnotmatch '^AlicizationQA_[a-f0-9]{32}$'){throw 'Only an existing background QA desktop is supported'}
if($ExecutableSha256 -cnotmatch '^[a-f0-9]{64}$' -or [IO.Path]::GetFileName($Executable) -cnotmatch '^alicization-lifeqa-20\d{6}-[a-f0-9]{8}\.exe$'){throw 'Exact QA package identity required'}
& (Join-Path $PSScriptRoot 'assert-private-desktop.ps1') -ExpectedDesktop $env:LIFE_QA_PRIVATE_DESKTOP -RuntimePid $RuntimePid | Out-Null
$owned=Get-Process -Id $RuntimePid
$birth=$owned.StartTime.ToUniversalTime().Ticks
if($owned.Path -ine $Executable -or (Get-FileHash -LiteralPath $Executable -Algorithm SHA256).Hash -ine $ExecutableSha256){throw 'Package identity changed'}
$log=[IO.Path]::GetFullPath($ErrorLogPath)
$profile=[IO.Path]::GetDirectoryName([IO.Path]::GetDirectoryName($log))
$runId=([IO.Path]::GetFileNameWithoutExtension($Executable)).Substring('alicization-lifeqa-'.Length)
if([IO.Path]::GetFileName($profile) -cne ('alicization-life-installer-'+$runId) -or [IO.Path]::GetFileName([IO.Path]::GetDirectoryName($log)) -cne 'logs' -or [IO.Path]::GetFileName($log) -cnotmatch '^alicization-tamagotchi-(\d{13})\.log$'){throw 'Startup log is outside the owned installer profile'}
$logStarted=[long]$Matches[1]
if($logStarted -lt ([DateTimeOffset]$owned.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds()){throw 'Startup log predates the actual owned process'}
$owner=Get-Content -LiteralPath (Join-Path $profile 'life-installer-qa-owner.json') -Raw -Encoding UTF8|ConvertFrom-Json
if($owner.format -cne 'life-installer-qa-owner-v1' -or $owner.runId -cne $runId -or $owner.nonce -cne $env:LIFE_QA_PROFILE_NONCE -or [IO.Path]::GetFullPath($owner.installRoot) -ine [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($Executable))){throw 'Startup log owner changed'}
$entry=Get-Item -LiteralPath $log -Force
if($entry.PSIsContainer -or $entry.Length -gt 1048576 -or ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Startup log is not a bounded regular file'}
$stream=[IO.FileStream]::new($log,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
$snapshot=[IO.MemoryStream]::new()
try {
  $buffer=New-Object byte[] 4096
  while(($count=$stream.Read($buffer,0,$buffer.Length)) -gt 0){
    if($snapshot.Length+$count -gt 1048576){throw 'Startup log snapshot exceeded its read budget'}
    $snapshot.Write($buffer,0,$count)
  }
  $logBytes=$snapshot.ToArray()
} finally {
  $stream.Dispose()
  $snapshot.Dispose()
}
$errorLines=@(([Text.Encoding]::UTF8.GetString($logBytes) -split "`r?`n")|Where-Object {$_.Contains('[main]') -and $_.Contains('Error during app initialization') -and $_.Contains($ExpectedError)})
if($errorLines.Count -ne 1){throw 'The current process did not record exactly one matching startup failure'}
$hasher=[Security.Cryptography.SHA256]::Create()
try {$errorLogSha256=([BitConverter]::ToString($hasher.ComputeHash($logBytes))).Replace('-','').ToLowerInvariant()}
finally {$hasher.Dispose()}
Add-Type @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class AlicizationStartupDialogWindows {
  delegate bool Callback(IntPtr window, IntPtr state);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr OpenDesktop(string name, uint flags, bool inherit, uint access);
  [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr desktop);
  [DllImport("user32.dll")] static extern bool EnumDesktopWindows(IntPtr desktop, Callback callback, IntPtr state);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr parent, Callback callback, IntPtr state);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr window, StringBuilder text, int maximum);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window, StringBuilder text, int maximum);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr SendMessageTimeout(IntPtr window, uint message, UIntPtr capacity, StringBuilder text, uint flags, uint timeout, out UIntPtr result);
  [DllImport("user32.dll", SetLastError=true)] static extern bool PostMessage(IntPtr window, uint message, UIntPtr wParam, IntPtr lParam);
  public static string Title(IntPtr window) { var text = new StringBuilder(512); GetWindowText(window, text, 512); return text.ToString(); }
  public static string Class(IntPtr window) { var text = new StringBuilder(256); GetClassName(window, text, 256); return text.ToString(); }
  public static bool Matches(IntPtr window, uint target) { uint process; GetWindowThreadProcessId(window, out process); return process == target; }
  public static IntPtr[] Owned(string desktopName, uint target) {
    var result = new List<IntPtr>();
    var desktop = OpenDesktop(desktopName, 0, false, 0x0041);
    if (desktop == IntPtr.Zero) throw new Win32Exception();
    try {
      EnumDesktopWindows(desktop, (window, state) => { if (Matches(window, target)) result.Add(window); return true; }, IntPtr.Zero);
    } finally { CloseDesktop(desktop); }
    return result.ToArray();
  }
  public static string[] Texts(IntPtr parent, uint target) {
    var windows = new List<IntPtr>();
    EnumChildWindows(parent, (window, state) => { if (Matches(window, target)) windows.Add(window); return windows.Count < 64; }, IntPtr.Zero);
    var result = new List<string>();
    foreach (var window in windows) {
      if (!Matches(window, target)) throw new InvalidOperationException("Native error control owner changed");
      var text = new StringBuilder(4096); UIntPtr count;
      if (SendMessageTimeout(window, 0x000D, new UIntPtr(4096), text, 0x0002, 500, out count) != IntPtr.Zero) result.Add(text.ToString());
    }
    return result.ToArray();
  }
  public static void CloseError(IntPtr window, uint target) {
    if (!Matches(window, target) || Class(window) != "#32770") throw new InvalidOperationException("Native error dialog owner changed");
    // One real title-bar close; the controller separately observes native exit.
    if (!PostMessage(window, 0x0010, UIntPtr.Zero, IntPtr.Zero)) throw new Win32Exception();
  }
}
'@
$deadline=[DateTime]::UtcNow.AddSeconds(30)
$latest=@()
while([DateTime]::UtcNow -lt $deadline){
  $latest=@()
  foreach($handle in [AlicizationStartupDialogWindows]::Owned($env:LIFE_QA_PRIVATE_DESKTOP,$RuntimePid)){
    $title=[AlicizationStartupDialogWindows]::Title($handle)
    $class=[AlicizationStartupDialogWindows]::Class($handle)
    if($class -cne '#32770'){continue}
    $texts=[AlicizationStartupDialogWindows]::Texts($handle,$RuntimePid)
    $latest+=@{handle=$handle.ToInt64().ToString();title=$title;class=$class;texts=$texts}
    if($title -cnotin @('Alicization 暂时无法启动','Alicization could not start')){continue}
    $labels=if($title -ceq 'Alicization could not start'){@('Open logs','Open data folder','Close')}else{@('打开日志','打开数据目录','关闭')}
    if(@($labels|Where-Object {$texts -cnotcontains $_}).Count){continue}
    $current=Get-Process -Id $RuntimePid
    if($current.StartTime.ToUniversalTime().Ticks -ne $birth -or $current.Path -ine $Executable){throw 'The native dialog owner changed before close'}
    [AlicizationStartupDialogWindows]::CloseError($handle,$RuntimePid)
    @{format='alicization-owned-native-startup-close-v1';runtimePid=$RuntimePid;startTicks=$birth.ToString();windowId=$handle.ToInt64().ToString();expectedErrorObserved=$true;errorObservation='fresh-owned-process-startup-log';errorLog=$log;errorLogSha256AtDecision=$errorLogSha256;dialogControlsObserved=$labels;closeAction='one-WM_CLOSE-on-owned-error-dialog';desktop=$env:LIFE_QA_PRIVATE_DESKTOP;physicalInput=$false} | ConvertTo-Json -Compress
    return
  }
  Start-Sleep -Milliseconds 100
}
throw ('The exact owned startup failure dialog did not appear. Native error windows: '+($latest|ConvertTo-Json -Compress -Depth 4))
