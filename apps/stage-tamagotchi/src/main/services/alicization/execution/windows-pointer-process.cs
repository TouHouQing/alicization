// Fixed stdin protocol for a short-lived, hidden actor/guardian pair. This
// executable accepts no shell text, target activation, macros or global grant.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using Microsoft.Win32.SafeHandles;

namespace Alicization.WindowsInput {
  public static class PointerProcess {
    static SharedState ActiveState;
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 16384, RecursionLimit = 6 };
    static string ErrorCode(Exception error) {
      return error.Message != null && Regex.IsMatch(error.Message, @"\AWINDOWS_(?:POINTER|VISUAL|KEYBOARD)_[A-Z_]+\z", RegexOptions.CultureInvariant) ? error.Message : "WINDOWS_POINTER_NATIVE_FAILED";
    }
    sealed class Request {
      public Dictionary<string, object> Value;
      public string Name, Hash, ParentTicks, ActorTicks;
      public ulong Tag;
      public int ParentId, ActorId;
      public long ExpiresAt;
      public PointerAction Action;
      public VisualWindowSnapshot Snapshot;
    }
    static string ReadLine(int maximum) {
      var line = new StringBuilder();
      while (true) {
        int value = Console.In.Read();
        if (value == -1) return line.Length == 0 ? null : line.ToString();
        if (value == 10) return line.ToString().TrimEnd('\r');
        if (line.Length >= maximum) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_BUDGET");
        line.Append((char)value);
      }
    }
    static Dictionary<string, object> Object(object value, string[] expected) {
      var result = value as Dictionary<string, object>;
      if (result == null || result.Count != expected.Length)
        throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_FIELDS");
      foreach (string key in expected) if (!result.ContainsKey(key)) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_FIELDS");
      return result;
    }
    static string Text(Dictionary<string, object> value, string key, int maximum) {
      var result = value[key] as string;
      if (String.IsNullOrEmpty(result) || result.Length > maximum || result.IndexOf('\0') >= 0)
        throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_STRING");
      return result;
    }
    static long Integer(Dictionary<string, object> value, string key, long minimum, long maximum) {
      object input = value[key];
      if (!(input is int) && !(input is long)) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_INTEGER");
      long number = Convert.ToInt64(input, CultureInfo.InvariantCulture);
      if (number < minimum || number > maximum) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_INTEGER");
      return number;
    }
    static Request Parse(string line, bool guardian) {
      if (line == null) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_EOF");
      var fields = new List<string>(new [] { "version", "mappingName", "tag", "bindingHash", "parentProcessId", "parentStartTicks", "expiresAt", "action", "snapshot" });
      if (guardian) fields.AddRange(new [] { "actorProcessId", "actorStartTicks" });
      var input = Object(Json.DeserializeObject(line), fields.ToArray());
      Integer(input, "version", 1, 1);
      var action = Object(input["action"], new [] { "kind", "button", "wheel", "points" });
      var snapshot = Object(input["snapshot"], new [] { "owner", "authority", "geometry", "imageSha256" });
      Object(snapshot["owner"], new [] { "windowId", "processId", "processStartTicks", "windowClass", "desktop" });
      var authority = Object(snapshot["authority"], new [] { "userSid", "sessionId", "integrityLevel", "ownerWindowId" });
      if (authority["ownerWindowId"] != null) {
        long owner;
        if (!long.TryParse(Text(authority, "ownerWindowId", 20), NumberStyles.None, CultureInfo.InvariantCulture, out owner) || owner <= 0) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_OWNER");
      }
      var geometry = Object(snapshot["geometry"], new [] { "coordinateSpace", "clientBounds", "virtualScreen", "displays", "imageWidth", "imageHeight", "dpiX", "dpiY" });
      Object(geometry["clientBounds"], new [] { "left", "top", "width", "height" });
      Object(geometry["virtualScreen"], new [] { "left", "top", "width", "height" });
      var displays = geometry["displays"] as object[];
      var points = action["points"] as object[];
      if (displays == null || displays.Length < 1 || displays.Length > 16 || points == null || points.Length < 1 || points.Length > 33) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_ARRAY");
      foreach (var display in displays) Object(display, new [] { "left", "top", "width", "height" });
      foreach (var point in points) { var p = Object(point, new [] { "x", "y" }); Integer(p, "x", -131072, 131072); Integer(p, "y", -131072, 131072); }
      Integer(action, "wheel", -1200, 1200);
      var result = new Request {
        Value = input, Name = Text(input, "mappingName", 64), Hash = Text(input, "bindingHash", 64),
        ParentId = (int)Integer(input, "parentProcessId", 1, int.MaxValue), ParentTicks = Text(input, "parentStartTicks", 20),
        ExpiresAt = Integer(input, "expiresAt", 1, long.MaxValue),
        Action = Json.ConvertToType<PointerAction>(action), Snapshot = Json.ConvertToType<VisualWindowSnapshot>(snapshot)
      };
      string tag = Text(input, "tag", 20);
      if (!ulong.TryParse(tag, NumberStyles.None, CultureInfo.InvariantCulture, out result.Tag) || result.Tag == 0 || result.Tag.ToString(CultureInfo.InvariantCulture) != tag
        || !Regex.IsMatch(result.Name, @"\ALocal\\AlicizationInput_[a-f0-9]{32}\z", RegexOptions.CultureInvariant)
        || !Regex.IsMatch(result.Hash, @"\A[a-f0-9]{64}\z", RegexOptions.CultureInvariant)
        || !Regex.IsMatch(Text(snapshot, "imageSha256", 64), @"\A[a-f0-9]{64}\z", RegexOptions.CultureInvariant)) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_BINDING");
      long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
      if (result.ExpiresAt <= now || result.ExpiresAt - now > 15000) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_AUTHORITY_EXPIRED");
      PointerPlan.Validate(result.Action, result.Snapshot.geometry);
      if (guardian) { result.ActorId = (int)Integer(input, "actorProcessId", 1, int.MaxValue); result.ActorTicks = Text(input, "actorStartTicks", 20); }
      if (result.ParentId == Process.GetCurrentProcess().Id || (guardian && result.ActorId == Process.GetCurrentProcess().Id)) throw new InvalidOperationException("WINDOWS_POINTER_PROTOCOL_SELF_PARENT");
      return result;
    }
    static void Emit(object value) { Console.Out.WriteLine(Json.Serialize(value)); Console.Out.Flush(); }
    static void EmitAfterRelease(string json) {
      try { Console.Out.WriteLine(json); Console.Out.Flush(); }
      catch (IOException) { /* The independent receipt was flushed before attempting this possibly dead pipe. */ }
    }
    static void RequireReady(string line, string hash) {
      if (line == null) throw new InvalidOperationException("WINDOWS_POINTER_GUARDIAN_READY_MISSING");
      var receipt = Object(Json.DeserializeObject(line), new [] { "type", "bindingHash" });
      if (Text(receipt, "type", 32) != "guardian-ready" || Text(receipt, "bindingHash", 64) != hash)
        throw new InvalidOperationException("WINDOWS_POINTER_GUARDIAN_READY_MISSING");
    }
    static bool AwaitCommand(Task<string> command, PointerSession session, long expiresAt) {
      // Main still independently reads the approved surface after readiness.
      // Use the original bounded authority deadline rather than a competing
      // three-second timer which can expire during a legitimate UIA read.
      while (!command.IsCompleted && session.StopReason == 0 && DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() < expiresAt) { session.Poll(); Thread.Sleep(3); }
      return command.IsCompleted && command.Result == "execute" && session.StopReason == 0 && DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() < expiresAt;
    }
    internal static Task<string> MonitorCancellation(SharedState state) {
      return Task.Factory.StartNew(() => {
        string command;
        try { command = ReadLine(32); }
        catch { command = "invalid"; }
        try { state.Stop(command == null || command == "cancel" ? 1 : 7); }
        catch (ObjectDisposedException) { /* This process has already detached its hooks and closed the session. */ }
        return command;
      });
    }
    static int Guardian(Request request) {
      using (var parent = Native.HoldProcess(request.ParentId, request.ParentTicks))
      using (var actor = Native.HoldProcess(request.ActorId, request.ActorTicks))
      using (var state = SharedState.OpenGuardian(request.Name, request.Tag, request.Hash))
      using (var session = new PointerSession(state, request.Snapshot, request.Action, request.ExpiresAt, parent, actor)) {
        ActiveState = state;
        var receipts = InputReceipts.OpenGuardian(request.Name, request.Tag, request.Hash);
        bool released = false;
        string failure = null;
        var prepare = Stopwatch.StartNew();
        string readyLine = Json.Serialize(new { type = "guardian-ready", bindingHash = request.Hash });
        long readyPreparationMs = prepare.ElapsedMilliseconds;
        try {
          session.Start();
          Console.Out.WriteLine(readyLine); Console.Out.Flush();
          while (session.StopReason == 0) { session.Poll(); Thread.Sleep(3); }
        }
        catch (Exception error) { failure = ErrorCode(error); state.Stop(7); }
        finally { released = session.ReleaseAndConfirm(5000); }
        string result = Json.Serialize(new { type = "guardian-release", bindingHash = request.Hash, inputReleased = released, stopReason = state.StopReason, failure = failure, readyPreparationMs = readyPreparationMs });
        receipts.Save(false, result);
        EmitAfterRelease(result);
        return released ? 0 : 2;
      }
    }
    static int Actor(Request request) {
      using (var parent = Native.HoldProcess(request.ParentId, request.ParentTicks))
      using (var state = SharedState.Create(request.Name, request.Tag, request.Hash)) {
        ActiveState = state;
        var receipts = InputReceipts.Create(request.Name, request.Tag, request.Hash);
        Process guardian = null;
        PointerSession session = null;
        SafeWaitHandle peer = null;
        Task<string> errors = null;
        Task<string> guardianReady = null;
        string observedReady = null;
        int rounds = 0;
        bool attempted = false, released = false, normalPeer = false;
        string failure = null, peerReceipt = null;
        try {
          PointerPlan.RequireSnapshot(request.Snapshot, request.Action);
          var start = new ProcessStartInfo(Assembly.GetExecutingAssembly().Location, "--guardian") { UseShellExecute = false, CreateNoWindow = true, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, StandardOutputEncoding = new UTF8Encoding(false), StandardErrorEncoding = new UTF8Encoding(false) };
          guardian = Process.Start(start);
          errors = guardian.StandardError.ReadToEndAsync();
          string startTicks = guardian.StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture);
          peer = Native.HoldProcess(guardian.Id, startTicks);
          request.Value.Add("actorProcessId", Process.GetCurrentProcess().Id);
          request.Value.Add("actorStartTicks", Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture));
          string readyLine = Json.Serialize(new { type = "ready", bindingHash = request.Hash, actorStartTicks = request.Value["actorStartTicks"], guardianProcessId = guardian.Id, guardianStartTicks = startTicks, receiptRoot = receipts.Root });
          // Explicit raw UTF-8 writer avoids PowerShell console initialization
          // and encoding changes racing the already-piped first request.
          using (var input = new StreamWriter(guardian.StandardInput.BaseStream, new UTF8Encoding(false))) { input.WriteLine(Json.Serialize(request.Value)); input.Flush(); }
          session = new PointerSession(state, request.Snapshot, request.Action, request.ExpiresAt, parent, peer);
          session.Start();
          guardianReady = guardian.StandardOutput.ReadLineAsync();
          var wait = Stopwatch.StartNew();
          while (!guardianReady.IsCompleted && wait.ElapsedMilliseconds < 1000 && state.StopReason == 0) { session.Poll(); Thread.Sleep(3); }
          if (!guardianReady.IsCompleted)
            throw new InvalidOperationException("WINDOWS_POINTER_GUARDIAN_READY_MISSING");
          observedReady = guardianReady.Result;
          RequireReady(observedReady, request.Hash);
          Console.Out.WriteLine(readyLine); Console.Out.Flush();
          var command = Task.Factory.StartNew(() => ReadLine(32));
          if (!AwaitCommand(command, session, request.ExpiresAt)) throw new InvalidOperationException("WINDOWS_POINTER_DISPATCH_NOT_CONFIRMED");
          var cancel = MonitorCancellation(state);
          for (int round = 0; round < 1; round++) {
            if (cancel.IsCompleted) { state.Stop(1); throw new InvalidOperationException("WINDOWS_POINTER_DISPATCH_CANCELLED"); }
            attempted = true;
            session.Submit();
            rounds++;
          }
        }
        catch (Exception error) { failure = ErrorCode(error); state.Stop(7); }
        finally {
          if (session != null) released = session.ReleaseAndConfirm(5000);
          else if (state.OwnedKeys().Length == 0) state.AcknowledgeInputReleased();
          if (guardian != null) {
            var wait = Stopwatch.StartNew();
            while (!guardian.HasExited && wait.ElapsedMilliseconds < 5500) { state.Beat(false); Thread.Sleep(5); }
            normalPeer = guardian.HasExited && guardian.ExitCode == 0;
            if (guardian.HasExited) {
              if (guardianReady != null) { guardianReady.Wait(1000); if (guardianReady.IsCompleted) observedReady = guardianReady.Result; }
              peerReceipt = guardian.StandardOutput.ReadToEnd();
              if (errors != null && errors.Result.Length != 0) normalPeer = false;
              if (peer != null && Native.ProcessExited(peer)) state.ReconcileExitedPeer(peer);
              if (state.OwnedKeys().Length == 0) state.AcknowledgeInputReleased();
              released = state.BothInputReleased;
            }
          }
          if (session != null) session.Dispose();
          if (peer != null) peer.Dispose();
        }
        if (guardian == null && session == null && !attempted && state.OwnedKeys().Length == 0 && failure != null) {
          // This branch precedes guardian creation and all hook/input calls.
          // It is distinct from an input release receipt: there was no input
          // owner to release and no guardian whose existence can be claimed.
          string refused = Json.Serialize(new { type = "preflight-refused", bindingHash = request.Hash, actorProcessId = Process.GetCurrentProcess().Id, actorStartTicks = Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture), parentProcessId = request.ParentId, parentStartTicks = request.ParentTicks, receiptRoot = receipts.Root, guardianStarted = false, hooksInstalled = false, insertedEvents = 0, effectMayHaveOccurred = false, stopReason = state.StopReason, failure = failure });
          receipts.Save(true, refused); EmitAfterRelease(refused); return 2;
        }
        bool ok = failure == null && rounds == 1 && released && normalPeer;
        string result = Json.Serialize(new { type = "result", bindingHash = request.Hash, ok = ok, completedRounds = rounds, insertedEvents = session == null ? 0 : session.InsertedEvents, effectMayHaveOccurred = attempted, inputReleased = released, guardianNormalExit = normalPeer, guardianReady = observedReady, guardianReceipt = peerReceipt, stopReason = state.StopReason, failure = failure, ownedKeys = state.OwnedKeys(), receiptRoot = receipts.Root });
        receipts.Save(true, result);
        EmitAfterRelease(result);
        if (guardian != null) guardian.Dispose();
        return ok ? 0 : 2;
      }
    }
    public static int Main(string[] args) {
      try {
        if (args.Length != 1 || (args[0] != "--actor" && args[0] != "--guardian" && args[0] != "--observe" && args[0] != "--health"))
          throw new InvalidOperationException("WINDOWS_POINTER_ROLE_REQUIRED");
        // Open fixed UTF-8 streams directly. Replacing Console.InputEncoding
        // after a parent has piped bytes can race a console reader's buffer.
        Console.SetIn(new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false, true), false));
        Console.SetOut(new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false)) { AutoFlush = true });
        if (args[0] == "--health") {
          // Loader readiness only. Return before any foreground observation,
          // shared input state, hook, key inspection or actor request parsing.
          int layout = System.Runtime.InteropServices.Marshal.SizeOf(typeof(InputEvent));
          if (!Environment.Is64BitProcess || layout != 40)
            throw new InvalidOperationException("WINDOWS_POINTER_INPUT_LAYOUT");
          Emit(new { kind = "windows-pointer-program-health-v1", pid = Process.GetCurrentProcess().Id, layout = layout, bitness = 64, hooksInstalled = false, inputObserved = false, inputEvents = 0 });
          return 0;
        }
        if (args[0] == "--observe") {
          Target target = Native.ObserveForeground();
          Emit(new { windowId = target.WindowId, processId = target.ProcessId, processStartTicks = target.ProcessStartTicks, windowClass = target.WindowClass, desktop = target.Desktop, inputDesktop = target.InputDesktop, focusWindowId = target.FocusWindowId, integrityLevel = target.IntegrityLevel });
          return 0;
        }
        bool guardian = args[0] == "--guardian";
        // A missing first frame has no authority and must not leave an orphan.
        using (var initialDeadline = new Timer(delegate(object ignored) { Environment.Exit(4); }, null, 30000, Timeout.Infinite)) {
          Request request = Parse(ReadLine(16384), guardian);
          initialDeadline.Change(Timeout.Infinite, Timeout.Infinite);
          using (var parent = Native.HoldProcess(request.ParentId, request.ParentTicks)) {
            var lifetime = Stopwatch.StartNew(); long stoppedAt = 0;
            using (var watchdog = new Timer(delegate(object ignored) {
              long elapsed = lifetime.ElapsedMilliseconds;
              if (!Native.ProcessAlive(parent) || elapsed >= 15000 || DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() >= request.ExpiresAt) {
                Interlocked.CompareExchange(ref stoppedAt, elapsed + 1, 0);
                try { var state = ActiveState; if (state != null) state.Stop(Native.ProcessAlive(parent) ? 5 : 6); }
                catch (ObjectDisposedException) { }
              }
              // Release runs independently in the peer. An unread pipe or
              // hung PrintWindow cannot keep either participant alive forever.
              long stop = Interlocked.Read(ref stoppedAt);
              if (stop != 0 && elapsed - (stop - 1) >= 6000) Environment.Exit(4);
            }, null, 25, 25)) {
              return guardian ? Guardian(request) : Actor(request);
            }
          }
        }
      }
      catch (Exception error) { Emit(new { type = "protocol-error", ok = false, inputReleased = false, failure = ErrorCode(error) }); return 3; }
    }
  }
}
