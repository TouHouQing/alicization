// Bounded actor/guardian lifetime and actual delivery. Only the actor submits a
// chord; either participant may release keys already owned by this same pair.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace Alicization.WindowsInput {
  public sealed class KeyboardSession : IDisposable {
    [DllImport("user32.dll", SetLastError=true)]
    static extern uint SendInput(uint count, InputEvent[] events, int size);
    readonly SharedState state;
    readonly Target target;
    readonly SafeWaitHandle parent, peer;
    readonly KeyboardHooks hooks;
    readonly Stopwatch lifetime = Stopwatch.StartNew();
    bool disposed;
    int insertedEvents;
    public KeyboardSession(SharedState state, Target target, long expiresAt, SafeWaitHandle parent, SafeWaitHandle peer) {
      if (state == null || target == null || !Native.ProcessAlive(parent) || !Native.ProcessAlive(peer))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PARTICIPANT_IDENTITY_REQUIRED");
      this.state = state;
      this.target = new Target { WindowId = target.WindowId, ProcessId = target.ProcessId, ProcessStartTicks = target.ProcessStartTicks, WindowClass = target.WindowClass, Desktop = target.Desktop, InputDesktop = target.InputDesktop, FocusWindowId = target.FocusWindowId, IntegrityLevel = target.IntegrityLevel };
      this.parent = parent;
      this.peer = peer;
      hooks = new KeyboardHooks(state, this.target, expiresAt, parent, peer);
    }
    public void Start() { hooks.Start(5000); }
    public int StopReason { get { return state.StopReason; } }
    public bool BothInputReleased { get { return state.BothInputReleased; } }
    public int InsertedEvents { get { return insertedEvents; } }
    public void Poll() {
      state.Beat(false);
      if (!Native.ProcessAlive(parent)) state.Stop(6);
      if (!Native.ProcessAlive(peer) || !state.PeerHealthy(500) || !hooks.IsRunning) state.Stop(4);
      if (!hooks.AuthorityCurrent || lifetime.ElapsedMilliseconds >= 15000) state.Stop(5);
      if (!hooks.TargetCurrent) state.Stop(3);
    }
    void AssertCurrent() {
      Poll();
      if (!state.IsActor || state.StopReason != 0 || !state.BothReady || !state.BothHooksInstalled)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_SESSION_STOPPED");
      Native.RequireCurrentTarget(target);
      Poll();
      if (state.StopReason != 0) throw new InvalidOperationException("WINDOWS_KEYBOARD_SESSION_STOPPED");
    }
    public int Submit(int[] keys) {
      AssertCurrent();
      var events = Native.BalancedBatch(keys, state.Tag);
      int actorDowns = state.ActorDeliveredDowns, guardianDowns = state.GuardianDeliveredDowns;
      state.ReserveBatch(keys);
      // The complete pair is reserved before crossing the native boundary.
      // The hooks still gate every own down if focus/authority changes here.
      AssertCurrent();
      uint inserted = SendInput((uint)events.Length, events, Marshal.SizeOf(typeof(InputEvent)));
      insertedEvents = checked(insertedEvents + (int)inserted);
      if (inserted != events.Length) {
        state.Stop(7);
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PARTIAL_OR_DENIED_INPUT");
      }
      var wait = Stopwatch.StartNew();
      while (state.OwnedKeys().Length != 0 && wait.ElapsedMilliseconds < 1500) {
        Poll();
        if (state.StopReason != 0 && state.StopReason != 3) break;
        Thread.Sleep(3);
      }
      Poll();
      // A delivered Tab may intentionally change focus. It ends this input
      // owner, and only actual down acknowledgments from both hooks can attest
      // that the single batch was delivered before that transition. No repeat
      // is allowed until a new observation and authority are obtained.
      bool allDownsDelivered = state.ActorDeliveredDowns - actorDowns == keys.Length && state.GuardianDeliveredDowns - guardianDowns == keys.Length;
      if ((state.StopReason != 0 && state.StopReason != 3) || state.OwnedKeys().Length != 0 || !allDownsDelivered) {
        state.Stop(7);
        throw new InvalidOperationException("WINDOWS_KEYBOARD_DELIVERY_NOT_CONFIRMED");
      }
      return (int)inserted;
    }
    public void RequestStop(int reason) { state.Stop(reason); }
    public bool ReleaseAndConfirm(int timeoutMs) {
      if (timeoutMs < 100 || timeoutMs > 5000)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_RELEASE_BUDGET_INVALID");
      state.Stop(1);
      var wait = Stopwatch.StartNew();
      long nextRelease = 0;
      while (wait.ElapsedMilliseconds < timeoutMs) {
        state.Beat(false);
        if (wait.ElapsedMilliseconds >= nextRelease) {
          var keys = state.OwnedKeys();
          // Each up retains the exact owner tag. Hooks suppress an up for a
          // key actually taken over by the user, who keeps their own release.
          for (int index = keys.Length - 1; index >= 0; index--) {
            int key = keys[index];
            if (state.ExternallyHeld(key)) continue;
            uint extended = key == 0x5B || (key >= 0x21 && key <= 0x28) || key == 0x2D || key == 0x2E || key == 0x6F ? 1u : 0u;
            var up = new InputEvent { Type = 1, Data = new InputUnion { Keyboard = new KeyboardEvent { VirtualKey = (ushort)key, Flags = extended | 2u, ExtraInfo = new UIntPtr(state.Tag) } } };
            // A partial/denied cleanup remains pending until callbacks attest
            // delivery. Return value alone never clears ledger ownership.
            SendInput(1, new [] { up }, Marshal.SizeOf(typeof(InputEvent)));
          }
          nextRelease = wait.ElapsedMilliseconds + 30;
        }
        if (Native.ProcessExited(peer)) state.ReconcileExitedPeer(peer);
        if (state.OwnedKeys().Length == 0) state.AcknowledgeInputReleased();
        if (state.BothInputReleased) return true;
        Thread.Sleep(3);
      }
      return false;
    }
    public void Dispose() {
      if (disposed) return;
      // Callers must report unknown release separately if confirmation failed.
      // Detaching hooks cannot manufacture successful cleanup evidence.
      state.Stop(8);
      hooks.Dispose();
      disposed = true;
    }
  }
}
