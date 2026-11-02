// Fixed bounded single-window capture protocol and parent/deadline watchdog.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace Alicization.WindowsInput {
  public static class VisualWindowProcess {
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 6 * 1024 * 1024, RecursionLimit = 8 };
    static string ReadLine() {
      var value = new StringBuilder();
      for (;;) {
        int character = Console.In.Read();
        if (character == -1 || character == 10) return value.ToString().TrimEnd('\r');
        if (value.Length >= 4096) throw new InvalidOperationException("WINDOWS_VISUAL_PROTOCOL_BUDGET");
        value.Append((char)character);
      }
    }
    public static int Main(string[] args) {
      Console.SetIn(new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false, true), false));
      Console.SetOut(new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false)) { AutoFlush = true });
      try {
        if (args.Length != 1) throw new InvalidOperationException("WINDOWS_VISUAL_ROLE_REQUIRED");
        if (args[0] == "--health") {
          Console.WriteLine(Json.Serialize(new { kind = "windows-visual-window-health-v1", pid = Process.GetCurrentProcess().Id, bitness = IntPtr.Size * 8, inputEvents = 0, captured = false, hooksInstalled = false }));
          return 0;
        }
        if (args[0] != "--capture") throw new InvalidOperationException("WINDOWS_VISUAL_ROLE_REQUIRED");
        var request = Json.DeserializeObject(ReadLine()) as Dictionary<string, object>;
        if (request == null || request.Count != 5 || !request.ContainsKey("version") || !(request["version"] is int) || (int)request["version"] != 1
          || !request.ContainsKey("owner") || !request.ContainsKey("parentProcessId") || !(request["parentProcessId"] is int)
          || !request.ContainsKey("parentStartTicks") || !(request["parentStartTicks"] is string)
          || !request.ContainsKey("expiresAt") || (!(request["expiresAt"] is int) && !(request["expiresAt"] is long)))
          throw new InvalidOperationException("WINDOWS_VISUAL_PROTOCOL_FIELDS");
        int parentId = (int)request["parentProcessId"];
        long expiresAt = Convert.ToInt64(request["expiresAt"], CultureInfo.InvariantCulture);
        long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (parentId <= 0 || parentId == Process.GetCurrentProcess().Id || expiresAt <= now || expiresAt - now > 20000)
          throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_AUTHORITY_EXPIRED");
        var record = request["owner"] as Dictionary<string, object>;
        if (record == null || record.Count != 5 || !record.ContainsKey("windowId") || !record.ContainsKey("processId") || !record.ContainsKey("processStartTicks") || !record.ContainsKey("windowClass") || !record.ContainsKey("desktop") || !(record["processId"] is int))
          throw new InvalidOperationException("WINDOWS_VISUAL_PROTOCOL_FIELDS");
        foreach (string key in new [] { "windowId", "processStartTicks", "windowClass", "desktop" }) {
          var text = record[key] as string;
          if (String.IsNullOrEmpty(text) || text.Length > 256 || text.IndexOf('\0') >= 0) throw new InvalidOperationException("WINDOWS_VISUAL_PROTOCOL_STRING");
        }
        var owner = new VisualWindowOwner { windowId = (string)record["windowId"], processId = (int)record["processId"], processStartTicks = (string)record["processStartTicks"], windowClass = (string)record["windowClass"], desktop = (string)record["desktop"] };
        using (var parent = Native.HoldProcess(parentId, (string)request["parentStartTicks"])) {
          var gate = new object(); bool finished = false;
          var lifetime = Stopwatch.StartNew();
          using (var watchdog = new Timer(delegate(object ignored) {
            lock (gate) {
              if (!finished && (!Native.ProcessAlive(parent) || lifetime.ElapsedMilliseconds >= 20000 || DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() >= expiresAt))
                Environment.Exit(4);
            }
          }, null, 25, 25)) {
            try {
              var capture = VisualWindow.Capture(owner);
              lock (gate) {
                if (!Native.ProcessAlive(parent) || lifetime.ElapsedMilliseconds >= 20000 || DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() >= expiresAt)
                  throw new InvalidOperationException("WINDOWS_VISUAL_CAPTURE_AUTHORITY_EXPIRED");
              }
              // A stalled parent stdout reader must not hold the watchdog's
              // lock and turn a bounded capture into an orphaned process.
              Console.WriteLine(Json.Serialize(capture));
              lock (gate) { finished = true; }
              return 0;
            }
            finally { lock (gate) { finished = true; } }
          }
        }
      }
      catch (Exception error) {
        // No pixels, titles, token values or arbitrary exception text in errors.
        string code = error.Message != null && System.Text.RegularExpressions.Regex.IsMatch(error.Message, @"\AWINDOWS_VISUAL_[A-Z_]+\z") ? error.Message : "WINDOWS_VISUAL_CAPTURE_FAILED";
        Console.WriteLine(Json.Serialize(new { ok = false, errorCode = code, inputEvents = 0, foregroundActivated = false }));
        return 2;
      }
    }
  }
}
