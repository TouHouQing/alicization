// Decisions only; no injection, native calls, IO, sleeps or activation.
namespace Alicization.WindowsInput {
  public static class PointerHookPolicy {
    public static int Button(int message) {
      if (message == 0x201 || message == 0x202) return 1;
      if (message == 0x204 || message == 0x205) return 2;
      if (message == 0x207 || message == 0x208) return 4;
      if (message == 0x20B || message == 0x20C) return 5;
      return 0;
    }
    public static bool Up(int message) { return message == 0x202 || message == 0x205 || message == 0x208 || message == 0x20C; }
    public static bool Before(SharedState state, int message, int x, int y, int data, bool injected, ulong tag, bool target, bool peer, bool authority) {
      if (!injected || tag != state.Tag) { state.Stop(2); return true; }
      int button = Button(message);
      if (button > 0 && Up(message)) {
        // Cleanup can only release a button owned by this same pair. Never
        // release a user's button, even after our own down was delivered.
        if (state.ExternallyHeld(button)) { state.NoteOwnUpDelivered(button); return false; }
        return state.Ownership(button) != 0;
      }
      if (!authority) state.Stop(5);
      if (!peer) state.Stop(4);
      if (!target) state.Stop(3);
      if (state.AnyExternalHeld()) state.Stop(2);
      if (!state.PointerMatches(message, x, y, data) || (button > 0 && !state.PendingOwnDown(button))) state.Stop(7);
      return state.StopReason == 0;
    }
    public static void After(SharedState state, int message, int x, int y, int data, bool injected, ulong tag, bool chainAllowed) {
      bool own = injected && tag == state.Tag;
      int button = Button(message);
      if (!chainAllowed) { if (own) state.Stop(7); return; }
      if (!own) {
        if (button > 0) state.NoteExternalDelivered(button, !Up(message));
        state.NoteDeliveredExternalInput(injected);
        return;
      }
      if (button > 0) {
        if (Up(message)) state.NoteOwnUpDelivered(button);
        else state.NoteOwnDownDelivered(button);
      }
      if (state.PointerMatches(message, x, y, data)) state.NotePointerDelivered();
      else if (!Up(message)) state.Stop(7);
    }
  }
}
