// Observers only: this type never injects input or activates a window. The
// writer/guardian coordinator owns cancellation, actual release and disposal.
using System;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace Alicization.WindowsInput {
  public sealed class PointerHooks : IDisposable {
    [StructLayout(LayoutKind.Sequential)]
    struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)]
    struct Message {
      public IntPtr Window;
      public uint Id;
      public UIntPtr Word;
      public IntPtr Long;
      public uint Time;
      public Point Point;
      public uint Private;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct KeyData {
      public uint Key, ScanCode, Flags, Time;
      public UIntPtr ExtraInfo;
    }
    [UnmanagedFunctionPointer(CallingConvention.Winapi)]
    delegate IntPtr HookProc(int code, UIntPtr word, IntPtr data);
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetWindowsHookEx(int type, HookProc callback, IntPtr module, uint thread);
    [DllImport("user32.dll", SetLastError=true)] static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook, int code, UIntPtr word, IntPtr data);
    [DllImport("user32.dll")] static extern bool PeekMessage(out Message message, IntPtr window, uint minimum, uint maximum, uint remove);
    [DllImport("user32.dll")] static extern bool TranslateMessage(ref Message message);
    [DllImport("user32.dll")] static extern IntPtr DispatchMessage(ref Message message);
    [DllImport("user32.dll", SetLastError=true)] static extern bool PostThreadMessage(uint thread, uint message, UIntPtr word, IntPtr data);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern IntPtr GetModuleHandle(string name);

    readonly SharedState state;
    readonly VisualWindowOwner expected;
    readonly VisualWindowGeometry geometry;
    readonly string ownerWindowId;
    readonly int pointX, pointY;
    readonly SafeWaitHandle parentProcess, peerProcess;

    readonly long expiresAt;
    readonly Stopwatch lifetime = Stopwatch.StartNew();
    readonly ManualResetEventSlim ready = new ManualResetEventSlim(false);
    readonly HookProc keyboardCallback, mouseCallback;
    Thread thread;
    volatile bool closing;
    volatile Exception failure;
    IntPtr keyboardHook, mouseHook;
    SafeWaitHandle targetProcess;
    uint hookThreadId;
    bool disposed;

    public PointerHooks(SharedState state, VisualWindowOwner target, VisualWindowGeometry geometry, string ownerWindowId, int pointX, int pointY, long authorityExpiresAt, SafeWaitHandle parentProcess, SafeWaitHandle peerProcess) {
      if (state == null || target == null || !Native.ProcessAlive(parentProcess) || !Native.ProcessAlive(peerProcess) || authorityExpiresAt <= DateTimeOffset.UtcNow.ToUnixTimeMilliseconds())
        throw new InvalidOperationException("WINDOWS_POINTER_HOOK_AUTHORITY_REQUIRED");
      this.state = state;
      this.parentProcess = parentProcess;
      this.peerProcess = peerProcess;
      expected = new VisualWindowOwner { windowId = target.windowId, processId = target.processId, processStartTicks = target.processStartTicks, windowClass = target.windowClass, desktop = target.desktop };
      this.geometry = geometry;
      this.ownerWindowId = ownerWindowId;
      this.pointX = pointX; this.pointY = pointY;
      expiresAt = authorityExpiresAt;
      keyboardCallback = Keyboard;
      mouseCallback = Mouse;
    }
    public bool IsRunning { get { return !disposed && !closing && thread != null && thread.IsAlive && ready.IsSet && failure == null; } }
    public bool AuthorityCurrent { get { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() < expiresAt && lifetime.ElapsedMilliseconds < 15000; } }
    public bool TargetCurrent { get { return Native.ProcessAlive(targetProcess) && VisualWindow.PointerSurfaceCurrent(expected, geometry.clientBounds, pointX, pointY, ownerWindowId); } }
    void Fail() {
      try { state.Stop(7); }
      catch { /* A disposed ledger is never permission to block physical input. */ }
    }
    static int NormalizeKey(KeyData data) {
      int key = (int)data.Key;
      if (key == 0x10) return data.ScanCode == 0x36 ? 0xA1 : 0xA0;
      if (key == 0x11) return (data.Flags & 1) != 0 ? 0xA3 : 0xA2;
      if (key == 0x12) return (data.Flags & 1) != 0 ? 0xA5 : 0xA4;
      return key;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct MouseData { public Point Point; public uint Data, Flags, Time; public UIntPtr ExtraInfo; }
    IntPtr Keyboard(int code, UIntPtr word, IntPtr pointer) {
      if (code >= 0) { try { state.Stop(2); } catch { } }
      // This program never injects keyboard events. All physical/foreign keys
      // continue once; they revoke pointer authority before the next event.
      return CallNextHookEx(keyboardHook, code, word, pointer);
    }
    IntPtr Mouse(int code, UIntPtr word, IntPtr pointer) {
      if (code < 0) return CallNextHookEx(mouseHook, code, word, pointer);
      bool own = false, injected = false; ulong tag = 0;
      int message = (int)word.ToUInt64(), x = 0, y = 0, data = 0;
      try {
        var value = (MouseData)Marshal.PtrToStructure(pointer, typeof(MouseData));
        x = value.Point.X; y = value.Point.Y;
        data = message == 0x20A || message == 0x20E || message == 0x20B || message == 0x20C ? unchecked((short)(value.Data >> 16)) : 0;
        injected = (value.Flags & 1) != 0; tag = value.ExtraInfo.ToUInt64(); own = injected && tag == state.Tag;
        bool cleanup = PointerHookPolicy.Up(message);
        if (!PointerHookPolicy.Before(state, message, x, y, data, injected, tag,
          cleanup || (Native.ProcessAlive(targetProcess) && VisualWindow.PointerSurfaceCurrent(expected, geometry.clientBounds, x, y, ownerWindowId)),
          cleanup || (Native.ProcessAlive(parentProcess) && Native.ProcessAlive(peerProcess) && state.PeerHealthy(500)),
          cleanup || AuthorityCurrent)) return new IntPtr(1);
      }
      catch { Fail(); return own ? new IntPtr(1) : CallNextHookEx(mouseHook, code, word, pointer); }
      IntPtr result = CallNextHookEx(mouseHook, code, word, pointer);
      try { PointerHookPolicy.After(state, message, x, y, data, injected, tag, result == IntPtr.Zero); }
      catch { Fail(); }
      return result;
    }
    public void Start(int timeoutMs) {
      if (disposed || thread != null || timeoutMs < 1000 || timeoutMs > 10000 || state.ActorReady || state.StopReason != 0)
        throw new InvalidOperationException("WINDOWS_POINTER_HOOK_START_INVALID");
      thread = new Thread(Loop) { IsBackground = true, Name = "AlicizationOwnedInputObserver" };
      thread.SetApartmentState(ApartmentState.MTA);
      // The hook can publish readiness before the first 25ms wait returns.
      // Publish our real main-thread beat before starting that observer.
      state.Beat(false);
      thread.Start();
      var wait = Stopwatch.StartNew();
      while (!ready.Wait(25)) {
        state.Beat(false);
        if (wait.ElapsedMilliseconds >= timeoutMs) {
          state.Stop(4);
          throw new InvalidOperationException("WINDOWS_POINTER_HOOK_START_TIMEOUT");
        }
      }
      state.Beat(false);
      if (failure != null || !state.BothReady || state.StopReason != 0)
        throw new InvalidOperationException("WINDOWS_POINTER_HOOK_START_FAILED", failure);
    }
    void Loop() {
      try {
        targetProcess = Native.HoldProcess(expected.processId, expected.processStartTicks);
        if (!TargetCurrent) throw new InvalidOperationException("WINDOWS_POINTER_TARGET_CHANGED");
        hookThreadId = GetCurrentThreadId();
        Message message;
        PeekMessage(out message, IntPtr.Zero, 0, 0, 0);
        var module = GetModuleHandle(null);
        keyboardHook = SetWindowsHookEx(13, keyboardCallback, module, 0);
        mouseHook = SetWindowsHookEx(14, mouseCallback, module, 0);
        if (keyboardHook == IntPtr.Zero || mouseHook == IntPtr.Zero)
          throw new InvalidOperationException("WINDOWS_POINTER_HOOK_INSTALL_FAILED");
        state.MarkHookInstalled();
        bool seeded = false, markedReady = false;
        while (!closing) {
          state.Beat(true);
          if (state.IsActor && state.BothHooksInstalled && !seeded) {
            // Seed on the hook thread, outside callbacks, before either ready
            // flag. Queued physical events update ownership after this scan.
            for (int key = 1; key <= 254; key++) state.SeedExternalHeld(key, (GetAsyncKeyState(key) & 0x8000) != 0);
            seeded = true;
            state.MarkReady();
            markedReady = true;
          }
          if (!state.IsActor && state.ActorReady && !markedReady) {
            state.MarkReady();
            markedReady = true;
          }
          if (state.BothReady) ready.Set();
          while (PeekMessage(out message, IntPtr.Zero, 0, 0, 1)) {
            if (message.Id == 0x12) { closing = true; break; }
            TranslateMessage(ref message);
            DispatchMessage(ref message);
          }
          Thread.Sleep(3);
        }
      }
      catch (Exception error) { failure = error; Fail(); }
      finally {
        try { state.Stop(8); }
        catch { /* The other owner must retain any unacknowledged keys. */ }
        if (keyboardHook != IntPtr.Zero) UnhookWindowsHookEx(keyboardHook);
        if (mouseHook != IntPtr.Zero) UnhookWindowsHookEx(mouseHook);
        keyboardHook = mouseHook = IntPtr.Zero;
        if (targetProcess != null) targetProcess.Dispose();
        ready.Set();
      }
    }
    public void Dispose() {
      if (disposed) return;
      // Detaching observers never attests that an owned key was released.
      state.Stop(8);
      closing = true;
      if (hookThreadId != 0) PostThreadMessage(hookThreadId, 0x12, UIntPtr.Zero, IntPtr.Zero);
      if (thread != null && !thread.Join(2000))
        throw new InvalidOperationException("WINDOWS_POINTER_HOOK_THREAD_DID_NOT_CLOSE");
      disposed = true;
      ready.Dispose();
    }
  }
}
