// One event in flight. Both actual hook chains attest the exact point/message.
// Offsets live beyond the unchanged keyboard ownership lanes in the 4KB map.
using System;

namespace Alicization.WindowsInput {
  public sealed partial class SharedState {
    public void ReservePointerButton(int button) {
      AssertOpen();
      if (!IsActor || (button != 1 && button != 2 && button != 4) || StopReason != 0 || !PeerHealthy(500) || AnyExternalHeld() || OwnedKeys().Length != 0)
        throw new InvalidOperationException("WINDOWS_POINTER_BUTTON_RESERVATION_DENIED");
      Write(Slot(ActorOwnedBase, button), 1);
      Write(Slot(GuardianOwnedBase, button), 1);
      if (StopReason != 0) throw new InvalidOperationException("WINDOWS_POINTER_STOPPED_DURING_RESERVATION");
    }
    public int PointerSequence { get { return Read(3400); } }
    public void PublishPointer(int sequence, int message, int x, int y, int data) {
      if (!IsActor || StopReason != 0 || sequence < 1 || sequence > 64
        || PointerSequence != sequence - 1 || (sequence > 1 && !PointerDelivered(sequence - 1)))
        throw new InvalidOperationException("WINDOWS_POINTER_SEQUENCE_INVALID");
      Write(3404, message); Write(3408, x); Write(3412, y); Write(3416, data);
      Write(3400, sequence);
    }
    public bool PointerMatches(int message, int x, int y, int data) {
      int sequence = PointerSequence;
      return sequence > 0 && Read(IsActor ? 3420 : 3424) < sequence
        && Read(3404) == message && Read(3408) == x && Read(3412) == y && Read(3416) == data;
    }
    public void NotePointerDelivered() { Write(IsActor ? 3420 : 3424, PointerSequence); }
    public bool PointerDelivered(int sequence) { return sequence > 0 && Read(3420) == sequence && Read(3424) == sequence; }
  }
}
