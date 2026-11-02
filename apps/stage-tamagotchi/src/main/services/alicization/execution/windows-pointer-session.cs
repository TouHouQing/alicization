// A single finite operation and an independently running release participant.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

namespace Alicization.WindowsInput {
  public sealed class PointerSession : IDisposable {
    [DllImport("user32.dll", SetLastError=true)] static extern uint SendInput(uint count, InputEvent[] events, int size);
    readonly SharedState state;
    readonly VisualWindowSnapshot snapshot;
    readonly PointerAction action;
    readonly SafeWaitHandle parent, peer;
    readonly PointerHooks hooks;
    readonly Stopwatch lifetime = Stopwatch.StartNew();
    bool disposed;
    int insertedEvents, sequence;
    public PointerSession(SharedState state, VisualWindowSnapshot snapshot, PointerAction action, long expiresAt, SafeWaitHandle parent, SafeWaitHandle peer) {
      if (state == null || snapshot == null || !Native.ProcessAlive(parent) || !Native.ProcessAlive(peer)) throw new InvalidOperationException("WINDOWS_POINTER_AUTHORITY_REQUIRED");
      PointerPlan.Validate(action, snapshot.geometry);
      this.state = state; this.snapshot = snapshot; this.action = action; this.parent = parent; this.peer = peer;
      var point = action.points[0];
      hooks = new PointerHooks(state, snapshot.owner, snapshot.geometry, snapshot.authority.ownerWindowId, point.x, point.y, expiresAt, parent, peer);
    }
    public void Start() { hooks.Start(5000); }
    public int StopReason { get { return state.StopReason; } }
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
      if (!state.IsActor || state.StopReason != 0 || !state.BothReady || !state.BothHooksInstalled || state.AnyExternalHeld()) throw new InvalidOperationException("WINDOWS_POINTER_SESSION_STOPPED");
    }
    void ObserveCurrentSource() {
      AssertCurrent();
      // A slow paint must not starve the actor heartbeat. Only this main thread
      // can send input; the worker can read this one pinned window and nothing
      // else. Stop/expiry still close the native process independently.
      var read = Task.Factory.StartNew(() => {
        if (state.StopReason != 0) throw new InvalidOperationException("WINDOWS_POINTER_CAPTURE_CANCELLED");
        PointerPlan.RequireSnapshot(snapshot, action);
      });
      read.ContinueWith(failed => { var ignored = failed.Exception; }, TaskContinuationOptions.OnlyOnFaulted);
      while (!read.IsCompleted) {
        Poll();
        if (state.StopReason != 0) throw new InvalidOperationException("WINDOWS_POINTER_CAPTURE_CANCELLED");
        Thread.Sleep(3);
      }
      read.GetAwaiter().GetResult();
      AssertCurrent();
    }
    void SubmitEvent(InputEvent input, PointerPoint point, int message, int data) {
      AssertCurrent();
      if (!VisualWindow.PointerSurfaceCurrent(snapshot.owner, snapshot.geometry.clientBounds, point.x, point.y, snapshot.authority.ownerWindowId)) { state.Stop(3); throw new InvalidOperationException("WINDOWS_POINTER_SURFACE_CHANGED"); }
      state.PublishPointer(++sequence, message, point.x, point.y, data);
      AssertCurrent();
      uint inserted = SendInput(1, new [] { input }, Marshal.SizeOf(typeof(InputEvent)));
      insertedEvents = checked(insertedEvents + (int)inserted);
      if (inserted != 1) { state.Stop(7); throw new InvalidOperationException("WINDOWS_POINTER_INPUT_DENIED"); }
      var wait = Stopwatch.StartNew();
      while (!state.PointerDelivered(sequence) && wait.ElapsedMilliseconds < 1000) { Poll(); if (state.StopReason != 0) break; Thread.Sleep(3); }
      if (!state.PointerDelivered(sequence)) { state.Stop(7); throw new InvalidOperationException("WINDOWS_POINTER_DELIVERY_NOT_CONFIRMED"); }
    }
    public int Submit() {
      AssertCurrent();
      ObserveCurrentSource();
      var point = action.points[0];
      SubmitEvent(PointerPlan.Move(point, snapshot.geometry, state.Tag), point, 0x200, 0);
      // Moving can reveal a different hover target. Refuse a changed image
      // before any button/wheel instead of replaying coordinates from before.
      ObserveCurrentSource();
      AssertCurrent();
      if (action.kind == "scroll") SubmitEvent(PointerPlan.Event(0x800, 0, 0, action.wheel, state.Tag), point, 0x20A, action.wheel);
      else {
        int button = PointerPlan.Button(action); state.ReservePointerButton(button);
        SubmitEvent(PointerPlan.Event(PointerPlan.DownFlag(button), 0, 0, 0, state.Tag), point, PointerPlan.DownMessage(button), 0);
        for (int index = 1; index < action.points.Length; index++) {
          // Fixed pacing bounds drag duration; physical input still revokes
          // through the independent hooks during every pause.
          Thread.Sleep(16); point = action.points[index];
          SubmitEvent(PointerPlan.Move(point, snapshot.geometry, state.Tag), point, 0x200, 0);
        }
        SubmitEvent(PointerPlan.Event(PointerPlan.UpFlag(button), 0, 0, 0, state.Tag), point, PointerPlan.DownMessage(button) + 1, 0);
      }
      return insertedEvents;
    }
    public bool ReleaseAndConfirm(int timeoutMs) {
      if (timeoutMs < 100 || timeoutMs > 5000) throw new InvalidOperationException("WINDOWS_POINTER_RELEASE_BUDGET");
      state.Stop(1); var wait = Stopwatch.StartNew(); long nextRelease = 0;
      while (wait.ElapsedMilliseconds < timeoutMs) {
        state.Beat(false);
        if (wait.ElapsedMilliseconds >= nextRelease) {
          foreach (int button in state.OwnedKeys()) {
            if (state.ExternallyHeld(button)) continue;
            uint flags = PointerPlan.UpFlag(button);
            if (flags == 0) { state.Stop(7); continue; }
            SendInput(1, new [] { PointerPlan.Event(flags, 0, 0, 0, state.Tag) }, Marshal.SizeOf(typeof(InputEvent)));
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
    public void Dispose() { if (disposed) return; state.Stop(8); hooks.Dispose(); disposed = true; }
  }
}
