// Test entry point only; excluded from production. The guest launcher compiles
// this with the exact native sources and selects this Main explicitly. A single
// owned Ctrl down rehearses a cut batch without sending the action key.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using Alicization.WindowsInput;
using Microsoft.Win32.SafeHandles;

public static class AlicizationOwnedInputFaultHarness {
  [DllImport("user32.dll", SetLastError=true)] static extern uint SendInput(uint count, InputEvent[] events, int size);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 20000, RecursionLimit = 8 };
  static string ReadLine() {
    var line = new StringBuilder();
    while (true) {
      int value = Console.In.Read();
      if (value == -1) return line.Length == 0 ? null : line.ToString();
      if (value == 10) return line.ToString().TrimEnd('\r');
      if (line.Length >= 20000) throw new InvalidOperationException("QA_FAULT_STDIN_BUDGET");
      line.Append((char)value);
    }
  }
  static void Emit(object value) { Console.WriteLine(Json.Serialize(value)); Console.Out.Flush(); }
  static T Field<T>(object request, string field) { return (T)request.GetType().GetField(field).GetValue(request); }
  static Process Start(string role) {
    return Process.Start(new ProcessStartInfo(Assembly.GetExecutingAssembly().Location, role) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, StandardOutputEncoding = new UTF8Encoding(false), StandardErrorEncoding = new UTF8Encoding(false) });
  }
  static string Ticks(Process process) { return process.StartTime.ToUniversalTime().Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture); }
  static void Initialize(Process process, string request, bool close) {
    var writer = new StreamWriter(process.StandardInput.BaseStream, new UTF8Encoding(false)) { AutoFlush = true };
    writer.WriteLine(request);
    if (close) writer.Dispose();
  }
  static int Proxy(Dictionary<string, object> envelope) {
    var request = Json.Deserialize<Dictionary<string, object>>((string)envelope["request"]);
    request["parentProcessId"] = Process.GetCurrentProcess().Id;
    request["parentStartTicks"] = Ticks(Process.GetCurrentProcess());
    envelope["request"] = Json.Serialize(request);
    using (var child = Start("--fault")) {
      Initialize(child, Json.Serialize(envelope), false);
      var forward = new Thread(() => { try { string command; while ((command = ReadLine()) != null) { child.StandardInput.WriteLine(command); child.StandardInput.Flush(); } } catch (IOException) { } }) { IsBackground = true };
      forward.Start();
      string line;
      while ((line = child.StandardOutput.ReadLine()) != null) {
        Console.WriteLine(line); Console.Out.Flush();
        var value = Json.Deserialize<Dictionary<string, object>>(line);
        if ((string)value["type"] == "half-down") Environment.Exit(94);
      }
      child.WaitForExit();
      return child.ExitCode;
    }
  }
  static int Fault(Dictionary<string, object> envelope) {
    string mode = envelope["mode"] as string;
    if (Array.IndexOf(new [] { "cancel", "actor-exit", "guardian-exit", "parent-exit", "expiry", "target-change", "physical-takeover" }, mode) < 0)
      throw new InvalidOperationException("QA_FAULT_MODE_INVALID");
    object parsed = typeof(KeyboardProcess).GetMethod("Parse", BindingFlags.Static | BindingFlags.NonPublic).Invoke(null, new object[] { (string)envelope["request"], false });
    string name = Field<string>(parsed, "Name"), hash = Field<string>(parsed, "Hash");
    ulong tag = Field<ulong>(parsed, "Tag");
    var target = Field<Target>(parsed, "Target");
    var keys = Field<int[]>(parsed, "Keys");
    if (keys.Length != 2 || keys[0] != 0xA2 || keys[1] != 0x53) throw new InvalidOperationException("QA_FAULT_REQUIRES_CTRL_S");
    using (var parent = Native.HoldProcess(Field<int>(parsed, "ParentId"), Field<string>(parsed, "ParentTicks")))
    using (var state = SharedState.Create(name, tag, hash)) {
      var receipts = InputReceipts.Create(name, tag, hash);
      using (var guardian = Start("--guardian")) {
        var value = Field<Dictionary<string, object>>(parsed, "Value");
        value.Add("actorProcessId", Process.GetCurrentProcess().Id); value.Add("actorStartTicks", Ticks(Process.GetCurrentProcess()));
        string readyLine = Json.Serialize(new { type = "ready", mode = mode, actorProcessId = Process.GetCurrentProcess().Id, actorStartTicks = Ticks(Process.GetCurrentProcess()), guardianProcessId = guardian.Id, guardianStartTicks = Ticks(guardian), receiptRoot = receipts.Root, bindingHash = hash });
        Initialize(guardian, Json.Serialize(value), true);
        using (var peer = Native.HoldProcess(guardian.Id, Ticks(guardian)))
        using (var session = new KeyboardSession(state, target, Field<long>(parsed, "ExpiresAt"), parent, peer)) {
          bool released = false, laterDownRejected = false;
          string failure = null;
          try {
            session.Start();
            var ready = guardian.StandardOutput.ReadLineAsync();
            var watch = Stopwatch.StartNew();
            while (!ready.IsCompleted && watch.ElapsedMilliseconds < 1000 && state.StopReason == 0) { session.Poll(); Thread.Sleep(3); }
            if (!ready.IsCompleted || ready.Result == null || !ready.Result.Contains("guardian-ready")) throw new InvalidOperationException("QA_GUARDIAN_NOT_READY");
            Console.WriteLine(readyLine); Console.Out.Flush();
            var execute = Task.Factory.StartNew(() => ReadLine());
            while (!execute.IsCompleted && state.StopReason == 0) { session.Poll(); Thread.Sleep(3); }
            if (execute.Result != "execute" || state.StopReason != 0) throw new InvalidOperationException("QA_EXECUTE_MISSING");
            KeyboardProcess.MonitorCancellation(state);
            state.ReserveBatch(keys);
            var down = Native.BalancedBatch(keys, tag)[0];
            if (SendInput(1, new [] { down }, Marshal.SizeOf(typeof(InputEvent))) != 1) throw new InvalidOperationException("QA_HALF_DOWN_DENIED");
            watch.Restart();
            while ((state.ActorDeliveredDowns != 1 || state.GuardianDeliveredDowns != 1) && watch.ElapsedMilliseconds < 1000) { session.Poll(); Thread.Sleep(3); }
            if (state.ActorDeliveredDowns != 1 || state.GuardianDeliveredDowns != 1 || (GetAsyncKeyState(0xA2) & 0x8000) == 0) throw new InvalidOperationException("QA_HALF_DOWN_NOT_OBSERVED");
            Emit(new { type = "half-down", mode = mode, receiptRoot = receipts.Root, actorProcessId = Process.GetCurrentProcess().Id, guardianProcessId = guardian.Id, bindingHash = hash });
            if (mode == "actor-exit") Environment.Exit(93);
            if (mode == "guardian-exit") { guardian.Kill(); guardian.WaitForExit(); }
            while (state.StopReason == 0) { session.Poll(); Thread.Sleep(3); }
            try { session.Submit(keys); } catch { laterDownRejected = true; }
          }
          catch (Exception error) { failure = error.Message; state.Stop(7); }
          finally { released = session.ReleaseAndConfirm(5000); }
          var closing = Stopwatch.StartNew();
          while (!guardian.HasExited && closing.ElapsedMilliseconds < 5500) { state.Beat(false); Thread.Sleep(5); }
          string result = Json.Serialize(new { type = "fault-result", mode = mode, bindingHash = hash, actionComplete = false, inputReleased = released, laterDownRejected = laterDownRejected, stopReason = state.StopReason, parentProcessExited = Native.ProcessExited(parent), physicalSeenByBothHooks = state.BothPhysicalInputSeen, userStillHoldsControl = (GetAsyncKeyState(0xA2) & 0x8000) != 0, externalOwnershipTransferred = state.ExternallyHeld(0xA2), actorDeliveredDowns = state.ActorDeliveredDowns, guardianDeliveredDowns = state.GuardianDeliveredDowns, guardianExited = guardian.HasExited, ownedKeys = state.OwnedKeys(), failure = failure, receiptRoot = receipts.Root });
          receipts.Save(true, result);
          try { Console.WriteLine(result); Console.Out.Flush(); } catch (IOException) { }
          return released && failure == null && laterDownRejected ? 0 : 2;
        }
      }
    }
  }
  public static int Main(string[] args) {
    if (args.Length == 1 && args[0] == "--guardian") return KeyboardProcess.Main(args);
    try {
      if (args.Length != 1 || (args[0] != "--fault" && args[0] != "--parent-proxy")) return 3;
      Console.SetIn(new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false, true), false));
      Console.SetOut(new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false)) { AutoFlush = true });
      var envelope = Json.Deserialize<Dictionary<string, object>>(ReadLine());
      return args[0] == "--parent-proxy" ? Proxy(envelope) : Fault(envelope);
    }
    catch (Exception error) { Emit(new { type = "fault-error", failure = error.Message }); return 3; }
  }
}
