$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
# Announce the real process identity, then wait until its owner has persisted it.
$nativeProcess = [Diagnostics.Process]::GetCurrentProcess()
@{kind='file-recovery-native-ready-v1';pid=$PID;creationTimeTicks=[string]$nativeProcess.StartTime.ToUniversalTime().Ticks} | ConvertTo-Json -Compress
$request = [Console]::In.ReadLine() | ConvertFrom-Json
$dispatched = $false
function Assert-CompensationDeadline {
  if (!$request.expiresAt -or [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -ge [long]$request.expiresAt) { throw 'COMPENSATION_AUTHORITY_EXPIRED' }
}
try {
  Assert-CompensationDeadline
  if ([long]$request.expiresAt -gt [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + 12000) { throw 'COMPENSATION_DEADLINE_BUDGET' }
  if (!$request.path -or !$request.expectedHash -or !$request.restoreHash -or !$request.device -or !$request.inode) { throw 'COMPENSATION_CONTRACT_REQUIRED' }
  $restore = [Convert]::FromBase64String([string]$request.restoreBytes)
  if ($restore.Length -gt 2097152 -or ($request.removeCreated -and $restore.Length -ne 0)) { throw 'COMPENSATION_BYTE_BUDGET' }
  Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;
public static class AlicizationRecoveryFile {
  [StructLayout(LayoutKind.Sequential, Pack=4)] public struct Info {
    public uint Attributes; public long Created; public long Accessed; public long Written;
    public uint Device; public uint SizeHigh; public uint SizeLow; public uint Links;
    public uint InodeHigh; public uint InodeLow;
  }
  [StructLayout(LayoutKind.Sequential)] public struct Disposition { public int DeleteFile; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern SafeFileHandle CreateFile(string name, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool GetFileInformationByHandle(SafeFileHandle handle, out Info information);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool SetFileInformationByHandle(SafeFileHandle handle, int kind, ref Disposition information, uint size);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, ExactSpelling=true, SetLastError=true)]
  private static extern bool GetVolumeInformationByHandleW(SafeFileHandle handle, StringBuilder volume, uint volumeSize, out uint serial, out uint maximumName, out uint flags, StringBuilder filesystem, uint filesystemSize);
  public static bool Supported(SafeFileHandle handle) {
    uint serial, maximumName, flags;
    var volume = new StringBuilder(261);
    var filesystem = new StringBuilder(32);
    if (!GetVolumeInformationByHandleW(handle, volume, 261, out serial, out maximumName, out flags, filesystem, 32)) throw new Win32Exception(Marshal.GetLastWin32Error());
    return filesystem.ToString() == "NTFS";
  }
  public static Info Read(SafeFileHandle handle) {
    Info info;
    if (!GetFileInformationByHandle(handle, out info)) throw new Win32Exception(Marshal.GetLastWin32Error());
    return info;
  }
  public static string Inode(Info info) { return (((ulong)info.InodeHigh << 32) | info.InodeLow).ToString(); }
  public static void Remove(SafeFileHandle handle) {
    var info = new Disposition { DeleteFile = 1 };
    if (!SetFileInformationByHandle(handle, 4, ref info, 4)) throw new Win32Exception(Marshal.GetLastWin32Error());
  }
}
'@
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $restoreHash = ([BitConverter]::ToString($sha.ComputeHash($restore))).Replace('-','').ToLowerInvariant()
    if ($restoreHash -cne $request.restoreHash) { throw 'COMPENSATION_BACKUP_HASH_MISMATCH' }
    # One exclusive handle binds checks and mutation. DELETE access is requested
    # up front, but its disposition is set only after the original identity/hash.
    Assert-CompensationDeadline
    $access = [uint32]3221225472
    if ($request.removeCreated) { $access = $access -bor [uint32]65536 }
    $handle = [AlicizationRecoveryFile]::CreateFile([string]$request.path,$access,0,[IntPtr]::Zero,3,2097152,[IntPtr]::Zero)
    if ($handle.IsInvalid) { throw 'COMPENSATION_EXCLUSIVE_OPEN_FAILED' }
    try {
      if (![AlicizationRecoveryFile]::Supported($handle)) { throw 'COMPENSATION_UNSUPPORTED_FILESYSTEM' }
      $info = [AlicizationRecoveryFile]::Read($handle)
      if (($info.Attributes -band 1040) -ne 0 -or $info.Links -ne 1) { throw 'COMPENSATION_LINKED_OR_NON_FILE_TARGET' }
      if ([string]$info.Device -cne [string]$request.device -or [AlicizationRecoveryFile]::Inode($info) -cne [string]$request.inode) { throw 'COMPENSATION_FILE_IDENTITY_CHANGED' }
      $file = [IO.FileStream]::new($handle,[IO.FileAccess]::ReadWrite)
      try {
        if ($file.Length -gt 2097152) { throw 'COMPENSATION_BYTE_BUDGET' }
        $actual = ([BitConverter]::ToString($sha.ComputeHash($file))).Replace('-','').ToLowerInvariant()
        if ($actual -cne $request.expectedHash) { throw 'COMPENSATION_CURRENT_VERSION_CHANGED' }
        if ($request.removeCreated) {
          Assert-CompensationDeadline
          $dispatched = $true
          [AlicizationRecoveryFile]::Remove($handle)
          $result = @{ok=$true;removedHash=$actual;scope='exclusive-file-handle-removed-created-file'}
        }
        else {
          $file.Position = 0
          for ($offset = 0; $offset -lt $restore.Length; $offset += 65536) {
            Assert-CompensationDeadline
            $dispatched = $true
            $file.Write($restore,$offset,[Math]::Min(65536,$restore.Length-$offset))
          }
          Assert-CompensationDeadline
          $dispatched = $true
          $file.SetLength($restore.Length)
          Assert-CompensationDeadline
          $file.Flush($true)
          $file.Position = 0
          $verified = ([BitConverter]::ToString($sha.ComputeHash($file))).Replace('-','').ToLowerInvariant()
          if ($verified -cne $restoreHash) { throw 'COMPENSATION_READBACK_MISMATCH' }
          $result = @{ok=$true;actualHash=$verified;scope='exclusive-file-handle-restored-bytes'}
        }
      }
      finally { $file.Dispose() }
    }
    finally { $handle.Dispose() }
    $result | ConvertTo-Json -Compress
  }
  finally { $sha.Dispose() }
}
catch { @{ok=$false;errorCode=$_.Exception.Message;effectMayHaveOccurred=$dispatched} | ConvertTo-Json -Compress }
