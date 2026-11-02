// Native input primitives. The writer/guardian protocol must authorize their
// use; compiling a batch or observing a target never grants execution authority.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace Alicization.WindowsInput {
  public sealed class Target {
    public string WindowId;
    public int ProcessId;
    public string ProcessStartTicks;
    public string WindowClass;
    public string Desktop;
    public string InputDesktop;
    public string FocusWindowId;
    public uint IntegrityLevel;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct KeyboardEvent {
    public ushort VirtualKey;
    public ushort ScanCode;
    public uint Flags;
    public uint Time;
    public UIntPtr ExtraInfo;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct MouseEvent {
    public int X, Y;
    public uint Data, Flags, Time;
    public UIntPtr ExtraInfo;
  }
  [StructLayout(LayoutKind.Explicit)]
  public struct InputUnion {
    [FieldOffset(0)] public KeyboardEvent Keyboard;
    [FieldOffset(0)] public MouseEvent Mouse;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct InputEvent {
    public uint Type;
    public InputUnion Data;
  }

  public static class Native {
    [StructLayout(LayoutKind.Sequential)]
    struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)]
    struct GuiInfo {
      public uint Size, Flags;
      public IntPtr Active, Focus, Capture, MenuOwner, MoveSize, Caret;
      public Rect CaretRect;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct FileTime { public uint Low, High; }
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", SetLastError=true)] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern int GetClassName(IntPtr window, StringBuilder value, int length);
    [DllImport("user32.dll", SetLastError=true)] static extern bool GetGUIThreadInfo(uint thread, ref GuiInfo info);
    [DllImport("user32.dll")] static extern IntPtr GetThreadDesktop(uint thread);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
    [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr desktop);
    [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder value, uint bytes, out uint needed);
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint id);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetProcessTimes(IntPtr process, out FileTime created, out FileTime ended, out FileTime kernel, out FileTime user);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
    [DllImport("kernel32.dll", EntryPoint="WaitForSingleObject")] static extern uint WaitForProcess(SafeWaitHandle handle, uint milliseconds);
    [DllImport("advapi32.dll", SetLastError=true)] static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError=true)] static extern bool GetTokenInformation(IntPtr token, int kind, IntPtr value, int bytes, out int needed);
    [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
    [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthority(IntPtr sid, uint index);

    // Hold the kernel process object throughout input ownership. A PID or HWND
    // reused after process exit must never become the original target again.
    public static SafeWaitHandle HoldProcess(int processId, string startTicks) {
      long expectedTicks;
      if (processId <= 0 || !long.TryParse(startTicks, NumberStyles.None, CultureInfo.InvariantCulture, out expectedTicks)
        || expectedTicks <= 0 || expectedTicks.ToString(CultureInfo.InvariantCulture) != startTicks)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PROCESS_IDENTITY_INVALID");
      var handle = new SafeWaitHandle(OpenProcess(0x101000, false, (uint)processId), true);
      try {
        FileTime created, ended, kernel, user;
        if (handle.IsInvalid || !GetProcessTimes(handle.DangerousGetHandle(), out created, out ended, out kernel, out user)
          || DateTime.FromFileTimeUtc(unchecked((long)(((ulong)created.High << 32) | created.Low))).Ticks != expectedTicks
          || !ProcessAlive(handle))
          throw new InvalidOperationException("WINDOWS_KEYBOARD_PROCESS_IDENTITY_CHANGED");
        return handle;
      }
      catch { handle.Dispose(); throw; }
    }
    public static bool ProcessAlive(SafeWaitHandle handle) {
      return handle != null && !handle.IsClosed && !handle.IsInvalid && WaitForProcess(handle, 0) == 258;
    }
    public static bool ProcessExited(SafeWaitHandle handle) {
      return handle != null && !handle.IsClosed && !handle.IsInvalid && WaitForProcess(handle, 0) == 0;
    }
    static string DesktopName(IntPtr desktop) {
      uint needed;
      var name = new StringBuilder(256);
      if (desktop == IntPtr.Zero || !GetUserObjectInformation(desktop, 2, name, 512, out needed))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_DESKTOP_UNAVAILABLE");
      return name.ToString();
    }
    static uint Integrity(IntPtr process) {
      IntPtr token;
      if (!OpenProcessToken(process, 8, out token))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_INTEGRITY_UNAVAILABLE");
      try {
        int size;
        GetTokenInformation(token, 25, IntPtr.Zero, 0, out size);
        if (size < IntPtr.Size || size > 4096)
          throw new InvalidOperationException("WINDOWS_KEYBOARD_TOKEN_BUDGET");
        var buffer = Marshal.AllocHGlobal(size);
        try {
          if (!GetTokenInformation(token, 25, buffer, size, out size))
            throw new InvalidOperationException("WINDOWS_KEYBOARD_INTEGRITY_UNAVAILABLE");
          var sid = Marshal.ReadIntPtr(buffer);
          int count = Marshal.ReadByte(GetSidSubAuthorityCount(sid));
          if (count < 1 || count > 15)
            throw new InvalidOperationException("WINDOWS_KEYBOARD_TOKEN_INVALID");
          return unchecked((uint)Marshal.ReadInt32(GetSidSubAuthority(sid, (uint)(count - 1))));
        }
        finally { Marshal.FreeHGlobal(buffer); }
      }
      finally { CloseHandle(token); }
    }
    public static Target ObserveForeground() {
      if (IntPtr.Size != 8)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_REQUIRES_X64");
      var window = GetForegroundWindow();
      uint pid;
      var thread = GetWindowThreadProcessId(window, out pid);
      if (window == IntPtr.Zero || thread == 0 || pid == 0 || pid > int.MaxValue)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_FOREGROUND_UNAVAILABLE");
      var process = OpenProcess(0x101000, false, pid);
      if (process == IntPtr.Zero)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_TARGET_PROCESS_UNAVAILABLE");
      try {
        FileTime created, ended, kernel, user;
        if (!GetProcessTimes(process, out created, out ended, out kernel, out user))
          throw new InvalidOperationException("WINDOWS_KEYBOARD_PROCESS_IDENTITY_UNAVAILABLE");
        var name = new StringBuilder(256);
        if (GetClassName(window, name, name.Capacity) < 1)
          throw new InvalidOperationException("WINDOWS_KEYBOARD_WINDOW_CLASS_UNAVAILABLE");
        var info = new GuiInfo { Size = (uint)Marshal.SizeOf(typeof(GuiInfo)) };
        if (!GetGUIThreadInfo(thread, ref info) || info.Active != window || info.Focus == IntPtr.Zero)
          throw new InvalidOperationException("WINDOWS_KEYBOARD_FOCUS_UNAVAILABLE");
        var inputDesktop = OpenInputDesktop(0, false, 1);
        if (inputDesktop == IntPtr.Zero)
          throw new InvalidOperationException("WINDOWS_KEYBOARD_INPUT_DESKTOP_UNAVAILABLE");
        string inputName;
        try { inputName = DesktopName(inputDesktop); }
        finally { CloseDesktop(inputDesktop); }
        var ticks = DateTime.FromFileTimeUtc(unchecked((long)(((ulong)created.High << 32) | created.Low))).Ticks;
        var result = new Target { WindowId = window.ToInt64().ToString(CultureInfo.InvariantCulture), ProcessId = (int)pid, ProcessStartTicks = ticks.ToString(CultureInfo.InvariantCulture), WindowClass = name.ToString(), Desktop = DesktopName(GetThreadDesktop(GetCurrentThreadId())), InputDesktop = inputName, FocusWindowId = info.Focus.ToInt64().ToString(CultureInfo.InvariantCulture), IntegrityLevel = Integrity(process) };
        uint currentPid;
        if (GetForegroundWindow() != window || GetWindowThreadProcessId(window, out currentPid) != thread || currentPid != pid || WaitForSingleObject(process, 0) != 258)
          throw new InvalidOperationException("WINDOWS_KEYBOARD_FOREGROUND_CHANGED");
        return result;
      }
      finally { CloseHandle(process); }
    }
    public static Target RequireCurrentTarget(Target expected) {
      var actual = ObserveForeground();
      AssertSameTarget(expected, actual);
      return actual;
    }
    public static bool StillForeground(IntPtr window, uint processId, IntPtr focus) {
      uint actualPid;
      uint thread = GetWindowThreadProcessId(window, out actualPid);
      if (window == IntPtr.Zero || thread == 0 || actualPid != processId || GetForegroundWindow() != window)
        return false;
      var info = new GuiInfo { Size = (uint)Marshal.SizeOf(typeof(GuiInfo)) };
      return GetGUIThreadInfo(thread, ref info) && info.Active == window && info.Focus == focus && GetForegroundWindow() == window;
    }
    public static void AssertSameTarget(Target expected, Target actual) {
      if (expected == null || actual == null || String.IsNullOrEmpty(expected.WindowId)
        || String.IsNullOrEmpty(expected.ProcessStartTicks) || expected.ProcessId <= 0
        || String.IsNullOrEmpty(expected.WindowClass) || String.IsNullOrEmpty(expected.FocusWindowId)
        || String.IsNullOrEmpty(expected.Desktop) || expected.WindowId != actual.WindowId
        || expected.ProcessId != actual.ProcessId || expected.ProcessStartTicks != actual.ProcessStartTicks
        || expected.WindowClass != actual.WindowClass || expected.FocusWindowId != actual.FocusWindowId
        || expected.Desktop != actual.Desktop || expected.Desktop != actual.InputDesktop
        || expected.IntegrityLevel != actual.IntegrityLevel)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_TARGET_CHANGED");
      if (actual.IntegrityLevel > Integrity(GetCurrentProcess()))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_HIGHER_INTEGRITY_TARGET");
    }
    static bool Modifier(int key) { return key == 0xA2 || key == 0xA4 || key == 0xA0 || key == 0x5B; }
    static bool Extended(int key) { return key == 0x5B || (key >= 0x21 && key <= 0x28) || key == 0x2D || key == 0x2E || key == 0x6F; }
    static bool BaseKey(int key) {
      return (key >= 0x30 && key <= 0x39) || (key >= 0x41 && key <= 0x5A) || (key >= 0x70 && key <= 0x87)
        || key == 8 || key == 9 || key == 13 || key == 27 || (key >= 0x20 && key <= 0x28)
        || key == 0x2D || key == 0x2E || key == 0x6A || key == 0x6B || key == 0x6D || key == 0x6F;
    }
    public static InputEvent[] BalancedBatch(int[] keys, ulong tag) {
      if (IntPtr.Size != 8 || keys == null || keys.Length < 1 || keys.Length > 5 || tag == 0 || !BaseKey(keys[keys.Length - 1]))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_BATCH_INVALID");
      var distinct = new HashSet<int>();
      for (int i = 0; i < keys.Length; i++) {
        if (!distinct.Add(keys[i]) || (i < keys.Length - 1 && !Modifier(keys[i])))
          throw new InvalidOperationException("WINDOWS_KEYBOARD_BATCH_INVALID");
      }
      if (distinct.Contains(0xA2) && distinct.Contains(0xA4) && distinct.Contains(0x2E))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_SECURE_ATTENTION_UNSUPPORTED");
      var events = new InputEvent[keys.Length * 2];
      for (int i = 0; i < keys.Length; i++) {
        uint flags = Extended(keys[i]) ? 1u : 0u;
        var down = new KeyboardEvent { VirtualKey = (ushort)keys[i], Flags = flags, ExtraInfo = new UIntPtr(tag) };
        var up = down;
        up.Flags |= 2u;
        events[i] = new InputEvent { Type = 1, Data = new InputUnion { Keyboard = down } };
        events[events.Length - 1 - i] = new InputEvent { Type = 1, Data = new InputUnion { Keyboard = up } };
      }
      return events;
    }
  }
}
