// Ownership/state primitives for one private writer/guardian pair. This module
// performs no keyboard injection, hook installation or target activation.
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace Alicization.WindowsInput {
  public sealed partial class SharedState : IDisposable {
    const int Capacity = 4096, Magic = 0x414B4231, ActorOwnedBase = 256, GuardianOwnedBase = 1280, ExternalBase = 2304;
    readonly MemoryMappedFile file;
    readonly MemoryMappedViewAccessor view;
    readonly bool actor;
    bool disposed;
    public readonly ulong Tag;
    [DllImport("kernel32.dll")] static extern ulong GetTickCount64();
    static readonly Func<ulong> MonotonicClock = GetTickCount64;

    SharedState(MemoryMappedFile file, MemoryMappedViewAccessor view, bool actor, ulong tag) {
      this.file = file;
      this.view = view;
      this.actor = actor;
      this.Tag = tag;
    }
    static void Validate(string name, ulong tag, string bindingHash) {
      if (IntPtr.Size != 8 || tag == 0 || name == null || bindingHash == null
        || !Regex.IsMatch(name, @"\ALocal\\AlicizationInput_[a-f0-9]{32}\z", RegexOptions.CultureInvariant)
        || !Regex.IsMatch(bindingHash, @"\A[a-f0-9]{64}\z", RegexOptions.CultureInvariant))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PRIVATE_STATE_INVALID");
    }
    public static SharedState Create(string name, ulong tag, string bindingHash) {
      Validate(name, tag, bindingHash);
      var security = new MemoryMappedFileSecurity();
      security.SetAccessRuleProtection(true, false);
      foreach (var sid in new [] { WindowsIdentity.GetCurrent().User, new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null), new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null) })
        security.AddAccessRule(new AccessRule<MemoryMappedFileRights>(sid, MemoryMappedFileRights.FullControl, AccessControlType.Allow));
      var file = MemoryMappedFile.CreateNew(name, Capacity, MemoryMappedFileAccess.ReadWrite, MemoryMappedFileOptions.None, security, HandleInheritability.None);
      MemoryMappedViewAccessor view = null;
      try {
        view = file.CreateViewAccessor(0, Capacity, MemoryMappedFileAccess.ReadWrite);
        view.Write(24, tag);
        var bytes = Encoding.ASCII.GetBytes(bindingHash);
        view.WriteArray(64, bytes, 0, bytes.Length);
        Thread.MemoryBarrier();
        view.Write(0, Magic);
        return new SharedState(file, view, true, tag);
      }
      catch {
        if (view != null) view.Dispose();
        file.Dispose();
        throw;
      }
    }
    public static SharedState OpenGuardian(string name, ulong tag, string bindingHash) {
      Validate(name, tag, bindingHash);
      var file = MemoryMappedFile.OpenExisting(name, MemoryMappedFileRights.ReadWrite, HandleInheritability.None);
      MemoryMappedViewAccessor view = null;
      try {
        view = file.CreateViewAccessor(0, Capacity, MemoryMappedFileAccess.ReadWrite);
        var bytes = new byte[64];
        view.ReadArray(64, bytes, 0, bytes.Length);
        Thread.MemoryBarrier();
        if (view.ReadInt32(0) != Magic || view.ReadUInt64(24) != tag || Encoding.ASCII.GetString(bytes) != bindingHash)
          throw new InvalidOperationException("WINDOWS_KEYBOARD_PRIVATE_STATE_BINDING_CHANGED");
        return new SharedState(file, view, false, tag);
      }
      catch {
        if (view != null) view.Dispose();
        file.Dispose();
        throw;
      }
    }
    void AssertOpen() {
      if (disposed)
        throw new ObjectDisposedException("SharedState");
    }
    int Read(int offset) {
      AssertOpen();
      int result = view.ReadInt32(offset);
      Thread.MemoryBarrier();
      return result;
    }
    void Write(int offset, int value) {
      AssertOpen();
      Thread.MemoryBarrier();
      view.Write(offset, value);
      Thread.MemoryBarrier();
    }
    static int Slot(int start, int key) {
      if (key < 1 || key > 254)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_KEY_OUT_OF_RANGE");
      return start + key * 4;
    }
    public int StopReason { get { return Read(152) == 1 ? 2 : Read(4); } }
    public void Stop(int reason) {
      if (reason < 1 || reason > 8)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_STOP_REASON_INVALID");
      // External input is monotonic and has its own lane. A completion/peer
      // stop racing this callback cannot hide takeover from the main owner.
      // Both roles only ever write 1 here; no cross-process read-modify-write.
      if (reason == 2) Write(152, 1);
      // Multiple causes may race, but no participant can clear the stop gate.
      if (Read(4) == 0) Write(4, reason);
    }
    public void MarkReady() {
      int offset = actor ? 32 : 48;
      if (view.ReadUInt64(offset) == 0 || view.ReadUInt64(offset + 8) == 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_HEARTBEAT_REQUIRED_BEFORE_READY");
      Write(actor ? 8 : 12, 1);
    }
    public bool IsActor { get { return actor; } }
    public bool ActorReady { get { return Read(8) == 1; } }
    public bool BothReady { get { return ActorReady && Read(12) == 1; } }
    public void MarkHookInstalled() { Write(actor ? 128 : 132, 1); }
    public bool BothHooksInstalled { get { return Read(128) == 1 && Read(132) == 1; } }
    public void Beat(bool hookThread) {
      int offset = (actor ? 32 : 48) + (hookThread ? 8 : 0);
      Thread.MemoryBarrier();
      view.Write(offset, GetTickCount64());
    }
    public bool PeerHealthy(int maximumAgeMs) {
      return PeerHealthy(maximumAgeMs, MonotonicClock);
    }
    internal bool PeerHealthy(int maximumAgeMs, Func<ulong> readClock) {
      AssertOpen();
      if (maximumAgeMs < 50 || maximumAgeMs > 2000 || Read(actor ? 12 : 8) != 1)
        return false;
      int offset = actor ? 48 : 32;
      ulong main = view.ReadUInt64(offset), hook = view.ReadUInt64(offset + 8);
      Thread.MemoryBarrier();
      // Read the lanes before sampling time. A peer may beat between these
      // reads; sampling time first can make that healthy beat look future-dated.
      ulong now = readClock();
      return main > 0 && hook > 0 && now >= main && now >= hook && now - main <= (ulong)maximumAgeMs && now - hook <= (ulong)maximumAgeMs;
    }
    int RoleOwnershipBase { get { return actor ? ActorOwnedBase : GuardianOwnedBase; } }
    public int ActorDeliveredDowns { get { return Read(136); } }
    public int GuardianDeliveredDowns { get { return Read(140); } }
    public bool BothPhysicalInputSeen { get { return Read(144) == 1 && Read(148) == 1; } }
    public void NoteDeliveredExternalInput(bool injected) {
      // Audit only that actual physical input was seen, never the user's key.
      if (!injected) Write(actor ? 144 : 148, 1);
    }
    public bool PendingOwnDown(int key) { return Read(Slot(RoleOwnershipBase, key)) == 1; }
    public int Ownership(int key) { return Math.Max(Read(Slot(ActorOwnedBase, key)), Read(Slot(GuardianOwnedBase, key))); }
    public bool ExternallyHeld(int key) { return Read(Slot(ExternalBase, key)) != 0; }
    public bool AnyExternalHeld() {
      for (int key = 1; key <= 254; key++) {
        if (ExternallyHeld(key)) return true;
      }
      return false;
    }
    public void SeedExternalHeld(int key, bool held) {
      if (Read(8) != 0 || Read(12) != 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_SEED_AFTER_READINESS");
      Write(Slot(ExternalBase, key), held ? 1 : 0);
    }
    public void ReserveBatch(int[] keys) {
      AssertOpen();
      if (!actor || StopReason != 0 || !PeerHealthy(500))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_WRITER_NOT_READY");
      Native.BalancedBatch(keys, Tag);
      if (AnyExternalHeld() || OwnedKeys().Length != 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_KEY_ALREADY_OWNED");
      foreach (int key in keys) {
        if (Ownership(key) != 0 || ExternallyHeld(key))
          throw new InvalidOperationException("WINDOWS_KEYBOARD_KEY_ALREADY_OWNED");
      }
      // Separate acknowledgments keep a slower hook's old key-up from erasing
      // the next batch. A new batch requires both participants to have drained.
      foreach (int key in keys) {
        Write(Slot(ActorOwnedBase, key), 1);
        Write(Slot(GuardianOwnedBase, key), 1);
      }
      if (StopReason != 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_STOPPED_DURING_RESERVATION");
    }
    public bool NoteOwnDownDelivered(int key) {
      if (!PendingOwnDown(key) || ExternallyHeld(key)) {
        Stop(7);
        return false;
      }
      Write(Slot(RoleOwnershipBase, key), 2);
      int counter = actor ? 136 : 140;
      Write(counter, checked(Read(counter) + 1));
      return true;
    }
    public void NoteOwnUpDelivered(int key) { Write(Slot(RoleOwnershipBase, key), 0); }
    public void NoteExternalDelivered(int key, bool down) {
      Stop(2);
      Write(Slot(ExternalBase, key), down ? 1 : 0);
      if (down) {
        Write(Slot(ActorOwnedBase, key), 0);
        Write(Slot(GuardianOwnedBase, key), 0);
      }
    }
    public int[] OwnedKeys() {
      var keys = new List<int>();
      for (int key = 1; key <= 254; key++) {
        if (Ownership(key) != 0) keys.Add(key);
      }
      return keys.ToArray();
    }
    public void AcknowledgeInputReleased() {
      if (StopReason == 0 || OwnedKeys().Length != 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_RELEASE_NOT_CONFIRMED");
      Write(actor ? 16 : 20, 1);
    }
    public bool BothInputReleased { get { return Read(16) == 1 && Read(20) == 1 && OwnedKeys().Length == 0; } }
    public void ReconcileExitedPeer(SafeWaitHandle peer) {
      // A stale heartbeat is insufficient. Only a held, now-signaled kernel
      // process object plus our actual delivered up can settle a dead lane.
      if (StopReason == 0 || !Native.ProcessExited(peer))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PEER_EXIT_NOT_PROVEN");
      int peerBase = actor ? GuardianOwnedBase : ActorOwnedBase;
      for (int key = 1; key <= 254; key++) {
        if (Read(Slot(RoleOwnershipBase, key)) == 0) Write(Slot(peerBase, key), 0);
      }
      if (OwnedKeys().Length == 0) Write(actor ? 20 : 16, 1);
    }
    public void Dispose() {
      if (disposed) return;
      Stop(8);
      disposed = true;
      view.Dispose();
      file.Dispose();
    }
  }
}
