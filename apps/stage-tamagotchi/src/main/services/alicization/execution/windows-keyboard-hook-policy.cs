// Hook decisions contain no Win32 calls, IO or waiting. The actual hook forwards
// physical/foreign input once, then records ownership only if that chain allows it.
namespace Alicization.WindowsInput {
  public static class HookPolicy {
    public static bool BeforeKeyboard(SharedState state, int key, bool injected, ulong tag, bool up, bool targetCurrent, bool peerCurrent, bool authorityCurrent) {
      bool own = injected && tag == state.Tag;
      if (!own) {
        state.Stop(2);
        return true;
      }
      if (key < 1 || key > 254) {
        state.Stop(7);
        return false;
      }
      // Cleanup remains possible after cancellation, expiry or a focus change.
      if (up) {
        if (state.ExternallyHeld(key)) {
          state.NoteOwnUpDelivered(key);
          return false;
        }
        return true;
      }
      if (!authorityCurrent) state.Stop(5);
      if (!peerCurrent) state.Stop(4);
      if (!targetCurrent) state.Stop(3);
      if (state.ExternallyHeld(key)) state.Stop(2);
      if (!state.PendingOwnDown(key)) state.Stop(7);
      return state.StopReason == 0;
    }
    public static void AfterForwardedKeyboard(SharedState state, int key, bool injected, ulong tag, bool up, bool chainAllowed) {
      if (!chainAllowed || key < 1 || key > 254)
        return;
      if (injected && tag == state.Tag) {
        if (up) state.NoteOwnUpDelivered(key);
        else state.NoteOwnDownDelivered(key);
      }
      else { state.NoteExternalDelivered(key, !up); }
    }
  }
}
