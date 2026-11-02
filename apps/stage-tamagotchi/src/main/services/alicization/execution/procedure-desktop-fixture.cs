using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;
using System.Windows.Forms;

// Reuses the passive editor and atomic state protocol of our native input
// fixture. Native delegates keep bounded window messages out of PS re-entry.
public sealed class AlicizationDesktopMethodFixture : Form {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
  readonly JavaScriptSerializer json = new JavaScriptSerializer();
  readonly TextBox entry = new TextBox { Multiline = true, Text = "Initial synthetic content" };
  readonly Button save = new Button();
  readonly Timer timer = new Timer { Interval = 30 };
  readonly string nonce, statePath, stopPath, outputPath, fault;
  int saves;
  bool statePending;
  string publishedContent;
  protected override bool ShowWithoutActivation { get { return true; } }
  protected override CreateParams CreateParams { get { var value = base.CreateParams; value.ExStyle |= 0x08000000; return value; } }
  static string TextField(Dictionary<string, object> input, string name) {
    object value;
    if (!input.TryGetValue(name, out value) || !(value is string)) throw new InvalidOperationException("OWNED_FIXTURE_FIELD_REQUIRED");
    return (string)value;
  }
  static string OwnedPath(string root, string file) {
    var full = Path.GetFullPath(file);
    if (!Path.IsPathRooted(file) || !full.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("OWNED_FIXTURE_PATH_REQUIRED");
    return full;
  }
  AlicizationDesktopMethodFixture(Dictionary<string, object> input) {
    nonce = TextField(input, "nonce");
    if (!Regex.IsMatch(nonce, "^[a-f0-9]{32}$")) throw new InvalidOperationException("OWNED_FIXTURE_NONCE_REQUIRED");
    var root = Path.GetFullPath(TextField(input, "root")).TrimEnd(Path.DirectorySeparatorChar);
    statePath = OwnedPath(root, TextField(input, "statePath"));
    stopPath = OwnedPath(root, TextField(input, "stopPath"));
    outputPath = OwnedPath(root, TextField(input, "path"));
    fault = input.ContainsKey("fault") ? TextField(input, "fault") : "";
    Text = "Alicization method replay " + nonce;
    ShowInTaskbar = false; StartPosition = FormStartPosition.Manual;
    Location = new Point(SystemInformation.VirtualScreen.Right + 320, SystemInformation.VirtualScreen.Top + 100);
    Size = new Size(460, 250);
    entry.AccessibleName = TextField(input, "entryLabel");
    entry.SetBounds(16, 16, 410, 100);
    save.Text = TextField(input, "saveLabel"); save.AccessibleName = save.Text;
    save.SetBounds(16, 136, 190, 38);
    if (fault != "control-missing") Controls.Add(entry);
    Controls.Add(save);
    if (fault == "control-ambiguous") Controls.Add(new TextBox { AccessibleName = entry.AccessibleName, Location = new Point(220, 138), Size = new Size(150, 30) });
    entry.TextChanged += delegate { WriteState(); };
    save.Click += delegate {
      saves++;
      File.WriteAllText(outputPath, fault == "saved-content-changed" ? "Different native saved bytes" : entry.Text, new UTF8Encoding(false));
      WriteState();
    };
    Shown += delegate {
      WriteState();
      bool outside = Bounds.Width > 0 && Bounds.Height > 0;
      foreach (var display in Screen.AllScreens) if (Bounds.IntersectsWith(display.Bounds)) outside = false;
      using (var current = Process.GetCurrentProcess()) {
        Console.WriteLine(json.Serialize(new { nonce = nonce, processId = current.Id, processStartTicks = current.StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture), windowId = Handle.ToInt64().ToString(CultureInfo.InvariantCulture), windowTitle = Text, outsideAllDisplays = outside, foreground = GetForegroundWindow() == Handle }));
        Console.Out.Flush();
      }
      timer.Start();
    };
    timer.Tick += delegate {
      if (File.Exists(stopPath)) { timer.Stop(); Close(); }
      // External native WM_SETTEXT can change the real edit buffer without a
      // managed TextChanged event. Independently read that buffer on the pump.
      else if (statePending || entry.Text != publishedContent || GetForegroundWindow() == Handle) WriteState();
    };
    FormClosed += delegate { timer.Stop(); timer.Dispose(); };
  }
  void WriteState() {
    string pending = statePath + "." + Guid.NewGuid().ToString("N") + ".pending";
    try {
      string observedContent = entry.Text;
      byte[] bytes = new UTF8Encoding(false).GetBytes(json.Serialize(new { nonce = nonce, saves = saves, content = observedContent, foreground = GetForegroundWindow() == Handle }));
      using (var file = new FileStream(pending, FileMode.CreateNew, FileAccess.Write, FileShare.Read)) { file.Write(bytes, 0, bytes.Length); file.Flush(true); }
      if (File.Exists(statePath)) File.Replace(pending, statePath, null); else File.Move(pending, statePath);
      statePending = false;
      publishedContent = observedContent;
    } catch (IOException) { statePending = true; }
    finally { if (File.Exists(pending)) File.Delete(pending); }
  }
  public static void Run(string request) {
    SetProcessDpiAwarenessContext(new IntPtr(-4));
    Application.SetUnhandledExceptionMode(UnhandledExceptionMode.ThrowException);
    using (var form = new AlicizationDesktopMethodFixture(new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(request))) Application.Run(form);
  }
}
