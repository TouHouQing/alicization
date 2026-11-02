// Observers only: this type never injects input or activates a window. The
// writer/guardian coordinator owns cancellation, actual release and disposal.
using System;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace Alicization.WindowsInput {
  public sealed class KeyboardHooks : IDisposable {
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
    readonly Target expected;
    readonly SafeWaitHandle parentProcess, peerProcess;
    readonly IntPtr window, focus;
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

    public KeyboardHooks(SharedState state, Target target, long authorityExpiresAt, SafeWaitHandle parentProcess, SafeWaitHandle peerProcess) {
      if (state == null || target == null || !Native.ProcessAlive(parentProcess) || !Native.ProcessAlive(peerProcess) || authorityExpiresAt <= DateTimeOffset.UtcNow.ToUnixTimeMilliseconds())
        throw new InvalidOperationException("WINDOWS_KEYBOARD_HOOK_AUTHORITY_REQUIRED");
      long windowId, focusId;
      if (!long.TryParse(target.WindowId, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out windowId) || windowId == 0
        || !long.TryParse(target.FocusWindowId, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out focusId) || focusId == 0 || target.ProcessId <= 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_HOOK_TARGET_REQUIRED");
      this.state = state;
      this.parentProcess = parentProcess;
      this.peerProcess = peerProcess;
      expected = new Target { WindowId = target.WindowId, ProcessId = target.ProcessId, ProcessStartTicks = target.ProcessStartTicks, WindowClass = target.WindowClass, Desktop = target.Desktop, InputDesktop = target.InputDesktop, FocusWindowId = target.FocusWindowId, IntegrityLevel = target.IntegrityLevel };
      window = new IntPtr(windowId);
      focus = new IntPtr(focusId);
      expiresAt = authorityExpiresAt;
      keyboardCallback = Keyboard;
      mouseCallback = Mouse;
    }
    public bool IsRunning { get { return !disposed && !closing && thread != null && thread.IsAlive && ready.IsSet && failure == null; } }
    public bool AuthorityCurrent { get { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() < expiresAt && lifetime.ElapsedMilliseconds < 15000; } }
    public bool TargetCurrent { get { return Native.ProcessAlive(targetProcess) && Native.StillForeground(window, (uint)expected.ProcessId, focus); } }
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
    IntPtr Keyboard(int code, UIntPtr word, IntPtr pointer) {
      if (code < 0) return CallNextHookEx(keyboardHook, code, word, pointer);
      uint message = (uint)word.ToUInt64();
      if (message != 0x100 && message != 0x101 && message != 0x104 && message != 0x105)
        return CallNextHookEx(keyboardHook, code, word, pointer);
      bool own = false, injected = false, up = false;
      int key = 0;
      ulong tag = 0;
      try {
        var data = (KeyData)Marshal.PtrToStructure(pointer, typeof(KeyData));
        key = NormalizeKey(data);
        injected = (data.Flags & 0x10) != 0;
        tag = data.ExtraInfo.ToUInt64();
        own = injected && tag == state.Tag;
        up = message == 0x101 || message == 0x105;
        bool ownDown = own && !up;
        if (!HookPolicy.BeforeKeyboard(state, key, injected, tag, up,
          !ownDown || TargetCurrent,
          !ownDown || (Native.ProcessAlive(parentProcess) && Native.ProcessAlive(peerProcess) && state.PeerHealthy(500)), !ownDown || AuthorityCurrent))
          return new IntPtr(1);
      }
      catch {
        Fail();
        return own ? new IntPtr(1) : CallNextHookEx(keyboardHook, code, word, pointer);
      }
      // Forward exactly once. A failed bookkeeping update must not forward the
      // same physical event through other hooks a second time.
      IntPtr result = CallNextHookEx(keyboardHook, code, word, pointer);
      try {
        HookPolicy.AfterForwardedKeyboard(state, key, injected, tag, up, result == IntPtr.Zero);
        if (!own && result == IntPtr.Zero) state.NoteDeliveredExternalInput(injected);
      }
      catch { Fail(); }
      return result;
    }
    IntPtr Mouse(int code, UIntPtr word, IntPtr pointer) {
      if (code >= 0) {
        try { state.Stop(2); }
        catch { /* Physical mouse events always continue. */ }
      }
      return CallNextHookEx(mouseHook, code, word, pointer);
    }
    public void Start(int timeoutMs) {
      if (disposed || thread != null || timeoutMs < 1000 || timeoutMs > 10000 || state.ActorReady || state.StopReason != 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_HOOK_START_INVALID");
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
          throw new InvalidOperationException("WINDOWS_KEYBOARD_HOOK_START_TIMEOUT");
        }
      }
      state.Beat(false);
      if (failure != null || !state.BothReady || state.StopReason != 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_HOOK_START_FAILED", failure);
    }
    void Loop() {
      try {
        targetProcess = Native.HoldProcess(expected.ProcessId, expected.ProcessStartTicks);
        Native.RequireCurrentTarget(expected);
        hookThreadId = GetCurrentThreadId();
        Message message;
        PeekMessage(out message, IntPtr.Zero, 0, 0, 0);
        var module = GetModuleHandle(null);
        keyboardHook = SetWindowsHookEx(13, keyboardCallback, module, 0);
        mouseHook = SetWindowsHookEx(14, mouseCallback, module, 0);
        if (keyboardHook == IntPtr.Zero || mouseHook == IntPtr.Zero)
          throw new InvalidOperationException("WINDOWS_KEYBOARD_HOOK_INSTALL_FAILED");
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
        throw new InvalidOperationException("WINDOWS_KEYBOARD_HOOK_THREAD_DID_NOT_CLOSE");
      disposed = true;
      ready.Dispose();
    }
  }
}
