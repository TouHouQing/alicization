// Owned acceptance application. The separate host and guest launchers validate
// their own scope before creating this window; this is never a user document.
using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Web.Script.Serialization;

public sealed class AlicizationKeyboardFixture : Form {
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  readonly string root;
  readonly TextBox entry = new TextBox { Name = "entry", Text = "Actual keyboard fixture 中文🙂", TabIndex = 0 };
  readonly Button next = new Button { Name = "next", Text = "Next", TabIndex = 1 };
  readonly Button save = new Button { Name = "save", Text = "保存", TabStop = false };
  readonly bool passive = Environment.GetEnvironmentVariable("LIFE_QA_NATIVE_UNICODE_ONLY") == "1";
  readonly Timer timer = new Timer { Interval = 30 };
  readonly JavaScriptSerializer json = new JavaScriptSerializer();
  int saves, tabs, escapes;
  string focusCommand, entryCommand, nextCommand;
  bool statePending;
  protected override bool ShowWithoutActivation { get { return passive; } }
  protected override CreateParams CreateParams {
    get { var value = base.CreateParams; if (passive) value.ExStyle |= 0x08000000; return value; }
  }
  AlicizationKeyboardFixture(string root) {
    this.root = root;
    Text = "Alicization isolated keyboard fixture";
    Width = 520; Height = 220;
    if (File.Exists(Path.Combine(root, "host-fixture-owner.json"))) {
      StartPosition = FormStartPosition.Manual;
      // Keep real keyboard delivery on an owned foreground window without
      // covering any physical display. Foreground takeover still stops tests.
      var area = SystemInformation.VirtualScreen;
      Location = new System.Drawing.Point(area.Right + 128, area.Top + 128);
      ShowInTaskbar = false;
    }
    entry.SetBounds(20, 20, 450, 35); next.SetBounds(20, 80, 120, 35); save.SetBounds(300, 80, 120, 35);
    Controls.AddRange(new Control[] { entry, next, save });
    entry.TextChanged += delegate { Save(); };
    save.Click += delegate { SaveText(); };
    Shown += delegate {
      if (!passive) { Activate(); entry.Focus(); } Save();
      var point = entry.PointToScreen(new System.Drawing.Point(25, 15));
      Console.WriteLine(json.Serialize(new { ready = true, windowId = Handle.ToInt64().ToString(), processId = System.Diagnostics.Process.GetCurrentProcess().Id, focusPoint = new { x = point.X, y = point.Y }, bounds = new { x = Bounds.X, y = Bounds.Y, width = Bounds.Width, height = Bounds.Height } }));
      Console.Out.Flush();
    };
    timer.Tick += delegate {
      string command = Path.Combine(root, "focus-entry.txt");
      string id = AlicizationKeyboardFixtureFiles.ReadCommand(command);
      if (id != null && id != entryCommand) { entry.Focus(); entryCommand = id; focusCommand = id; Save(); }
      command = Path.Combine(root, "focus-next.txt");
      id = AlicizationKeyboardFixtureFiles.ReadCommand(command);
      if (id != null && id != nextCommand) { next.Focus(); nextCommand = id; focusCommand = id; Save(); }
      if (statePending) Save();
      if (File.Exists(Path.Combine(root, "stop.txt"))) Close();
    };
    timer.Start();
  }
  void Save() {
    statePending = !AlicizationKeyboardFixtureFiles.WriteState(Path.Combine(root, "fixture-state.json"), json.Serialize(new { saves = saves, tabs = tabs, escapes = escapes, focused = ActiveControl == null ? null : ActiveControl.Name, content = entry.Text, focusCommand = focusCommand, passive = passive, foreground = GetForegroundWindow() == Handle }));
  }
  void SaveText() {
    saves++;
    // The semantic button and shortcut use the same actual application writer.
    string saved = Path.Combine(root, "saved-" + saves + ".txt");
    if (!File.Exists(saved)) AlicizationKeyboardFixtureFiles.WriteState(saved, entry.Text);
    Save();
  }
  protected override bool ProcessCmdKey(ref Message message, Keys key) {
    if (key == (Keys.Control | Keys.S)) {
      // A fresh, owned save artifact lets the full Electron acceptance verify
      // the actual UI text independently after the original window has closed.
      SaveText();
      return true;
    }
    if (key == Keys.Escape) { escapes++; Save(); return true; }
    if (key == Keys.Tab) {
      bool result = base.ProcessCmdKey(ref message, key);
      tabs++;
      // The normal WinForms dialog-key path changes focus after this method.
      // Read back on the next UI turn rather than recording the old control.
      BeginInvoke((MethodInvoker)Save);
      return result;
    }
    return base.ProcessCmdKey(ref message, key);
  }
  [STAThread]
  public static int Main(string[] args) {
    if (args.Length != 1 || !Directory.Exists(args[0]) || !(File.Exists(Path.Combine(args[0], "guest-fixture-owner.json")) || File.Exists(Path.Combine(args[0], "host-fixture-owner.json")))) return 3;
    if (!SetProcessDpiAwarenessContext(new IntPtr(-4))) return 4;
    Application.EnableVisualStyles();
    using (var fixture = new AlicizationKeyboardFixture(args[0])) Application.Run(fixture);
    return 0;
  }
}
