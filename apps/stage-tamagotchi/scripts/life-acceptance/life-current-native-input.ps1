param([int]$X, [int]$Y, [string]$ExpectedHandle = '', [ValidateSet('move', 'click', 'inspect')][string]$Action = 'move')

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AlicizationStageQaInput {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr window);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr window, IntPtr dc);
  [DllImport("gdi32.dll")] public static extern uint GetPixel(IntPtr dc, int x, int y);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window, uint flags);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr window, int index);
  [StructLayout(LayoutKind.Sequential)] public struct MouseInput { public int dx; public int dy; public uint mouseData; public uint flags; public uint time; public UIntPtr extraInfo; }
  [StructLayout(LayoutKind.Explicit)] public struct InputUnion { [FieldOffset(0)] public MouseInput mouse; }
  [StructLayout(LayoutKind.Sequential)] public struct Input { public uint type; public InputUnion data; }
  [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint count, Input[] inputs, int size);
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int index);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
}
'@
[AlicizationStageQaInput]::SetThreadDpiAwarenessContext([IntPtr](-4)) | Out-Null
if ($Action -eq 'inspect') {
  $stageWindow = [IntPtr]([long]::Parse($ExpectedHandle))
  $qaDc = [AlicizationStageQaInput]::GetDC([IntPtr]::Zero)
  try { $qaColor = [AlicizationStageQaInput]::GetPixel($qaDc, $X, $Y) } finally { [AlicizationStageQaInput]::ReleaseDC([IntPtr]::Zero, $qaDc) | Out-Null }
  $nativeRect=New-Object AlicizationStageQaInput+Rect
  [AlicizationStageQaInput]::GetWindowRect($stageWindow,[ref]$nativeRect) | Out-Null
  $nativePoint=New-Object AlicizationStageQaInput+Point
  $nativePoint.X=$X
  $nativePoint.Y=$Y
  $nativeHit=[AlicizationStageQaInput]::GetAncestor([AlicizationStageQaInput]::WindowFromPoint($nativePoint),2)
  @{pixel=@(($qaColor -band 255),(($qaColor -shr 8) -band 255),(($qaColor -shr 16) -band 255));actualHit=$nativeHit.ToInt64().ToString();bounds=@($nativeRect.Left,$nativeRect.Top,$nativeRect.Right,$nativeRect.Bottom);handle=$ExpectedHandle;extendedStyle=[AlicizationStageQaInput]::GetWindowLongPtr($stageWindow,-20).ToInt64()} | ConvertTo-Json -Compress
  exit
}
[AlicizationStageQaInput]::SetCursorPos($X, $Y) | Out-Null
$stagePoint = New-Object AlicizationStageQaInput+Point
$stagePoint.X = $X
$stagePoint.Y = $Y
$stageHit = [AlicizationStageQaInput]::GetAncestor([AlicizationStageQaInput]::WindowFromPoint($stagePoint), 2)
if ($Action -eq 'click') {
  if ($stageHit.ToInt64().ToString() -ne $ExpectedHandle) { throw ('Native input target changed; click cancelled. Actual=' + $stageHit.ToInt64().ToString() + ' Expected=' + $ExpectedHandle) }
  $stageVirtualLeft = [AlicizationStageQaInput]::GetSystemMetrics(76)
  $stageVirtualTop = [AlicizationStageQaInput]::GetSystemMetrics(77)
  $stageVirtualWidth = [AlicizationStageQaInput]::GetSystemMetrics(78)
  $stageVirtualHeight = [AlicizationStageQaInput]::GetSystemMetrics(79)
  $stageInputs = New-Object 'AlicizationStageQaInput+Input[]' 3
  for ($stageIndex=0; $stageIndex -lt 3; $stageIndex++) {
    $stageInputs[$stageIndex].data.mouse.dx = [int](($X-$stageVirtualLeft)*65535/($stageVirtualWidth-1))
    $stageInputs[$stageIndex].data.mouse.dy = [int](($Y-$stageVirtualTop)*65535/($stageVirtualHeight-1))
    $stageInputs[$stageIndex].data.mouse.flags = @(49153,49155,49157)[$stageIndex]
  }
  $stageDelivered = [AlicizationStageQaInput]::SendInput(3,$stageInputs,[Runtime.InteropServices.Marshal]::SizeOf([type][AlicizationStageQaInput+Input]))
  if ($stageDelivered -ne 3) { throw ('Native input injection failed: ' + $stageDelivered) }
}
@{handle=$stageHit.ToInt64().ToString();action=$Action;extendedStyle=[AlicizationStageQaInput]::GetWindowLongPtr($stageHit,-20).ToInt64()} | ConvertTo-Json -Compress
