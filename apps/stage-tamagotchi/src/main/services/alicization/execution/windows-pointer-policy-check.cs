// Native policy fixture only. No hooks, SendInput, target observation or UI.
using System;
using System.Collections.Generic;

namespace Alicization.WindowsInput {
  public static class PointerPolicyCheck {
    static readonly string Hash = new string('a', 64);
    static void Require(bool value) { if (!value) throw new InvalidOperationException("NATIVE_POINTER_POLICY_ASSERTION"); }
    static void Denied(Action action) { bool denied = false; try { action(); } catch (InvalidOperationException) { denied = true; } Require(denied); }
    static void Pair(Action<SharedState, SharedState> body, int held) {
      string name = "Local\\AlicizationInput_" + Guid.NewGuid().ToString("N");
      using (var actor = SharedState.Create(name, 1234567, Hash))
      using (var guardian = SharedState.OpenGuardian(name, 1234567, Hash)) {
        if (held > 0) actor.SeedExternalHeld(held, true);
        actor.Beat(false); actor.Beat(true); guardian.Beat(false); guardian.Beat(true);
        actor.MarkReady(); guardian.MarkReady();
        body(actor, guardian);
      }
    }
    static void Case(List<object> results, string name, Action test) {
      test(); results.Add(new { name = name, passed = true, inputEvents = 0, hooksInstalled = false });
    }
    public static object[] Run() {
      var results = new List<object>();
      Case(results, "both exact hook acknowledgments required", () => Pair((a, g) => {
        a.PublishPointer(1, 0x200, 123, 456, 0);
        Require(PointerHookPolicy.Before(a, 0x200, 123, 456, 0, true, a.Tag, true, true, true));
        PointerHookPolicy.After(a, 0x200, 123, 456, 0, true, a.Tag, true);
        Require(!a.PointerDelivered(1));
        PointerHookPolicy.After(g, 0x200, 123, 456, 0, true, a.Tag, true);
        Require(a.PointerDelivered(1));
        Denied(() => a.PublishPointer(3, 0x200, 123, 456, 0));
      }, 0));
      Case(results, "changed point cannot borrow an earlier sequence", () => Pair((a, g) => {
        a.PublishPointer(1, 0x200, 123, 456, 0);
        Require(!PointerHookPolicy.Before(a, 0x200, 124, 456, 0, true, a.Tag, true, true, true));
        Require(a.StopReason == 7 && !a.PointerDelivered(1));
      }, 0));
      Case(results, "down ownership drains only after both actual up chains", () => Pair((a, g) => {
        a.ReservePointerButton(1); a.PublishPointer(1, 0x201, 123, 456, 0);
        foreach (var state in new [] { a, g }) {
          Require(PointerHookPolicy.Before(state, 0x201, 123, 456, 0, true, a.Tag, true, true, true));
          PointerHookPolicy.After(state, 0x201, 123, 456, 0, true, a.Tag, true);
        }
        Require(a.PointerDelivered(1) && a.Ownership(1) == 2); a.Stop(1);
        Require(PointerHookPolicy.Before(g, 0x202, 123, 456, 0, true, a.Tag, false, false, false));
        PointerHookPolicy.After(g, 0x202, 123, 456, 0, true, a.Tag, true);
        Require(a.Ownership(1) != 0);
        PointerHookPolicy.After(a, 0x202, 123, 456, 0, true, a.Tag, true);
        a.AcknowledgeInputReleased(); g.AcknowledgeInputReleased(); Require(a.BothInputReleased);
      }, 0));
      Case(results, "physical takeover retains the user's held button", () => Pair((a, g) => {
        a.ReservePointerButton(1); a.PublishPointer(1, 0x201, 123, 456, 0);
        PointerHookPolicy.After(a, 0x201, 123, 456, 0, true, a.Tag, true);
        PointerHookPolicy.After(g, 0x201, 123, 456, 0, true, a.Tag, true);
        Require(PointerHookPolicy.Before(a, 0x201, 123, 456, 0, false, 0, true, true, true));
        PointerHookPolicy.After(a, 0x201, 123, 456, 0, false, 0, true);
        Require(a.StopReason == 2 && a.ExternallyHeld(1));
        Require(!PointerHookPolicy.Before(a, 0x202, 123, 456, 0, true, a.Tag, false, false, false));
        Require(a.ExternallyHeld(1));
      }, 0));
      Case(results, "held key forbids button reservation and cursor movement", () => Pair((a, g) => {
        Denied(() => a.ReservePointerButton(1));
        a.PublishPointer(1, 0x200, 123, 456, 0);
        Require(!PointerHookPolicy.Before(a, 0x200, 123, 456, 0, true, a.Tag, true, true, true));
        Require(a.StopReason == 2);
      }, 0xA2));
      Case(results, "downstream refusal remains unknown", () => Pair((a, g) => {
        a.ReservePointerButton(1); a.PublishPointer(1, 0x201, 123, 456, 0);
        PointerHookPolicy.After(a, 0x201, 123, 456, 0, true, a.Tag, false);
        Require(a.StopReason == 7 && a.Ownership(1) == 1 && !a.PointerDelivered(1));
      }, 0));
      foreach (int failure in new [] { 3, 4, 5 }) {
        int reason = failure;
        Case(results, "target/peer/expiry gate " + reason, () => Pair((a, g) => {
          a.PublishPointer(1, 0x200, 123, 456, 0);
          Require(!PointerHookPolicy.Before(a, 0x200, 123, 456, 0, true, a.Tag, reason != 3, reason != 4, reason != 5));
          Require(a.StopReason == reason);
        }, 0));
      }
      Case(results, "foreign injection revokes and forwards without borrowing own delivery", () => Pair((a, g) => {
        a.PublishPointer(1, 0x200, 123, 456, 0);
        Require(PointerHookPolicy.Before(a, 0x200, 123, 456, 0, true, 987, false, false, false));
        PointerHookPolicy.After(a, 0x200, 123, 456, 0, true, 987, true);
        Require(a.StopReason == 2 && !a.PointerDelivered(1));
      }, 0));
      return results.ToArray();
    }
  }
}
