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
  public static class KeyboardProcess {
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 16384, RecursionLimit = 6 };
    sealed class Request {
      public Dictionary<string, object> Value;
      public string Name, Hash, ParentTicks, ActorTicks;
      public ulong Tag;
      public int ParentId, ActorId, Repeat;
      public long ExpiresAt;
      public int[] Keys;
      public Target Target;
    }
    static string ReadLine(int maximum) {
      var line = new StringBuilder();
      while (true) {
        int value = Console.In.Read();
        if (value == -1) return line.Length == 0 ? null : line.ToString();
        if (value == 10) return line.ToString().TrimEnd('\r');
        if (line.Length >= maximum) throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_BUDGET");
        line.Append((char)value);
      }
    }
    static Dictionary<string, object> Object(object value, string[] expected) {
      var result = value as Dictionary<string, object>;
      if (result == null || result.Count != expected.Length)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_FIELDS");
      foreach (string key in expected) if (!result.ContainsKey(key)) throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_FIELDS");
      return result;
    }
    static string Text(Dictionary<string, object> value, string key, int maximum) {
      var result = value[key] as string;
      if (String.IsNullOrEmpty(result) || result.Length > maximum || result.IndexOf('\0') >= 0)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_STRING");
      return result;
    }
    static long Integer(Dictionary<string, object> value, string key, long minimum, long maximum) {
      object input = value[key];
      if (!(input is int) && !(input is long)) throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_INTEGER");
      long number = Convert.ToInt64(input, CultureInfo.InvariantCulture);
      if (number < minimum || number > maximum) throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_INTEGER");
      return number;
    }
    static Request Parse(string line, bool guardian) {
      if (line == null) throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_EOF");
      var fields = new List<string>(new [] { "version", "mappingName", "tag", "bindingHash", "parentProcessId", "parentStartTicks", "expiresAt", "keys", "repeat", "target" });
      if (guardian) fields.AddRange(new [] { "actorProcessId", "actorStartTicks" });
      var input = Object(Json.DeserializeObject(line), fields.ToArray());
      Integer(input, "version", 1, 1);
      var target = Object(input["target"], new [] { "windowId", "processId", "processStartTicks", "windowClass", "desktop", "inputDesktop", "focusWindowId", "integrityLevel" });
      var result = new Request {
        Value = input, Name = Text(input, "mappingName", 64), Hash = Text(input, "bindingHash", 64),
        ParentId = (int)Integer(input, "parentProcessId", 1, int.MaxValue), ParentTicks = Text(input, "parentStartTicks", 20),
        ExpiresAt = Integer(input, "expiresAt", 1, long.MaxValue), Repeat = (int)Integer(input, "repeat", 1, 5),
        Target = new Target { WindowId = Text(target, "windowId", 20), ProcessId = (int)Integer(target, "processId", 1, int.MaxValue), ProcessStartTicks = Text(target, "processStartTicks", 20), WindowClass = Text(target, "windowClass", 256), Desktop = Text(target, "desktop", 256), InputDesktop = Text(target, "inputDesktop", 256), FocusWindowId = Text(target, "focusWindowId", 20), IntegrityLevel = (uint)Integer(target, "integrityLevel", 0, 65535) }
      };
      string tag = Text(input, "tag", 20);
      if (!ulong.TryParse(tag, NumberStyles.None, CultureInfo.InvariantCulture, out result.Tag) || result.Tag == 0 || result.Tag.ToString(CultureInfo.InvariantCulture) != tag
        || !Regex.IsMatch(result.Name, @"\ALocal\\AlicizationInput_[a-f0-9]{32}\z", RegexOptions.CultureInvariant)
        || !Regex.IsMatch(result.Hash, @"\A[a-f0-9]{64}\z", RegexOptions.CultureInvariant))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_BINDING");
      long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
      if (result.ExpiresAt <= now || result.ExpiresAt - now > 15000)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_AUTHORITY_EXPIRED");
      var keys = input["keys"] as object[];
      if (keys == null || keys.Length < 1 || keys.Length > 5) throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_KEYS");
      result.Keys = new int[keys.Length];
      for (int index = 0; index < keys.Length; index++) {
        if (!(keys[index] is int)) throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_KEYS");
        result.Keys[index] = (int)keys[index];
      }
      Native.BalancedBatch(result.Keys, result.Tag);
      if (guardian) { result.ActorId = (int)Integer(input, "actorProcessId", 1, int.MaxValue); result.ActorTicks = Text(input, "actorStartTicks", 20); }
      if (result.ParentId == Process.GetCurrentProcess().Id || (guardian && result.ActorId == Process.GetCurrentProcess().Id))
        throw new InvalidOperationException("WINDOWS_KEYBOARD_PROTOCOL_SELF_PARENT");
      return result;
    }
    static void Emit(object value) { Console.Out.WriteLine(Json.Serialize(value)); Console.Out.Flush(); }
    static void EmitAfterRelease(string json) {
      try { Console.Out.WriteLine(json); Console.Out.Flush(); }
      catch (IOException) { /* The independent receipt was flushed before attempting this possibly dead pipe. */ }
    }
    static void RequireReady(string line, string hash) {
      if (line == null) throw new InvalidOperationException("WINDOWS_KEYBOARD_GUARDIAN_READY_MISSING");
      var receipt = Object(Json.DeserializeObject(line), new [] { "type", "bindingHash" });
      if (Text(receipt, "type", 32) != "guardian-ready" || Text(receipt, "bindingHash", 64) != hash)
        throw new InvalidOperationException("WINDOWS_KEYBOARD_GUARDIAN_READY_MISSING");
    }
    static bool AwaitCommand(Task<string> command, KeyboardSession session, long expiresAt) {
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
      using (var session = new KeyboardSession(state, request.Target, request.ExpiresAt, parent, actor)) {
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
        catch (Exception error) { failure = error.Message; state.Stop(7); }
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
        var receipts = InputReceipts.Create(request.Name, request.Tag, request.Hash);
        Process guardian = null;
        KeyboardSession session = null;
        SafeWaitHandle peer = null;
        Task<string> errors = null;
        Task<string> guardianReady = null;
        string observedReady = null;
        int rounds = 0;
        bool attempted = false, released = false, normalPeer = false;
        string failure = null, peerReceipt = null;
        try {
          Native.RequireCurrentTarget(request.Target);
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
          session = new KeyboardSession(state, request.Target, request.ExpiresAt, parent, peer);
          session.Start();
          guardianReady = guardian.StandardOutput.ReadLineAsync();
          var wait = Stopwatch.StartNew();
          while (!guardianReady.IsCompleted && wait.ElapsedMilliseconds < 1000 && state.StopReason == 0) { session.Poll(); Thread.Sleep(3); }
          if (!guardianReady.IsCompleted)
            throw new InvalidOperationException("WINDOWS_KEYBOARD_GUARDIAN_READY_MISSING");
          observedReady = guardianReady.Result;
          RequireReady(observedReady, request.Hash);
          Console.Out.WriteLine(readyLine); Console.Out.Flush();
          var command = Task.Factory.StartNew(() => ReadLine(32));
          if (!AwaitCommand(command, session, request.ExpiresAt)) throw new InvalidOperationException("WINDOWS_KEYBOARD_DISPATCH_NOT_CONFIRMED");
          var cancel = MonitorCancellation(state);
          for (int round = 0; round < request.Repeat; round++) {
            if (cancel.IsCompleted) { state.Stop(1); throw new InvalidOperationException("WINDOWS_KEYBOARD_DISPATCH_CANCELLED"); }
            attempted = true;
            session.Submit(request.Keys);
            rounds++;
          }
        }
        catch (Exception error) { failure = error.Message; state.Stop(7); }
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
        bool ok = failure == null && rounds == request.Repeat && released && normalPeer;
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
          throw new InvalidOperationException("WINDOWS_KEYBOARD_ROLE_REQUIRED");
        // Open fixed UTF-8 streams directly. Replacing Console.InputEncoding
        // after a parent has piped bytes can race a console reader's buffer.
        Console.SetIn(new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false, true), false));
        Console.SetOut(new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false)) { AutoFlush = true });
        if (args[0] == "--health") {
          // Loader readiness only. Return before any foreground observation,
          // shared input state, hook, key inspection or actor request parsing.
          int layout = System.Runtime.InteropServices.Marshal.SizeOf(typeof(InputEvent));
          if (!Environment.Is64BitProcess || layout != 40)
            throw new InvalidOperationException("WINDOWS_KEYBOARD_INPUT_LAYOUT");
          Emit(new { kind = "windows-keyboard-program-health-v1", pid = Process.GetCurrentProcess().Id, layout = layout, bitness = 64, hooksInstalled = false, inputObserved = false, inputEvents = 0 });
          return 0;
        }
        if (args[0] == "--observe") {
          // This fixed read-only entry never parses input, creates shared state
          // or installs hooks. Avoid a PowerShell cold start at the final gate.
          Target target = Native.ObserveForeground();
          Emit(new { windowId = target.WindowId, processId = target.ProcessId, processStartTicks = target.ProcessStartTicks, windowClass = target.WindowClass, desktop = target.Desktop, inputDesktop = target.InputDesktop, focusWindowId = target.FocusWindowId, integrityLevel = target.IntegrityLevel });
          return 0;
        }
        bool guardian = args[0] == "--guardian";
        Request request = Parse(ReadLine(16384), guardian);
        return guardian ? Guardian(request) : Actor(request);
      }
      catch (Exception error) { Emit(new { type = "protocol-error", ok = false, inputReleased = false, failure = error.Message }); return 3; }
    }
  }
}
