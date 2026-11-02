// An inert owned transport fixture. It never connects to a model/provider.
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Web.Script.Serialization;

namespace Alicization.OwnedProcessFixture {
  public class Request { public string mode, node, script, artifact, bytes; }
  public static class Program {
    public static int Main(string[] args) {
      if (args.Length == 1 && args[0] == "--version") { Console.WriteLine("999.0.0 owned-fixture"); return 0; }
      var request = new JavaScriptSerializer().Deserialize<Request>(Environment.GetEnvironmentVariable("ALICIZATION_OWNED_PROCESS_FIXTURE"));
      bool codex = Path.GetFileNameWithoutExtension(Process.GetCurrentProcess().MainModule.FileName) == "codex";
      if (codex) {
        Console.WriteLine("{\"type\":\"thread.started\",\"thread_id\":\"owned-native-fixture\"}");
        Console.WriteLine("{\"type\":\"turn.started\"}");
        Console.Out.Flush();
      }
      if (request.mode == "success") {
        File.WriteAllBytes(request.artifact, Convert.FromBase64String(request.bytes));
        if (codex) {
          Console.WriteLine("{\"type\":\"item.completed\",\"item\":{\"id\":\"owned-message\",\"type\":\"agent_message\",\"text\":\"owned native fixture finished\"}}");
          Console.WriteLine("{\"type\":\"turn.completed\",\"usage\":{\"input_tokens\":0,\"cached_input_tokens\":0,\"output_tokens\":0}}");
        }
        else Console.WriteLine("owned native fixture finished");
        return 0;
      }
      var child = Process.Start(new ProcessStartInfo(request.node, "\"" + request.script + "\"") { UseShellExecute = false, CreateNoWindow = true });
      if (request.mode == "overflow") Console.Write(new String('x', 3 * 1024 * 1024));
      if (child != null) child.WaitForExit();
      Thread.Sleep(30000);
      return 0;
    }
  }
}
