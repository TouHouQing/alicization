using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Threading;

public static class OwnedPassiveMenuFixture {
 [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
 delegate bool MonitorCallback(IntPtr monitor,IntPtr hdc,ref Rect rect,IntPtr data);
 [DllImport("user32.dll")] static extern bool EnumDisplayMonitors(IntPtr hdc,IntPtr clip,MonitorCallback callback,IntPtr data);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hwnd,int index);
 [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr hwnd,int index,int value);
 [DllImport("user32.dll")] static extern int GetSystemMetrics(int index);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr value);
 static string Field(Dictionary<string,object> input,string key) { return (string)input[key]; }
 static string Owned(string root,string file) {
  string value=Path.GetFullPath(file);
  if(!Path.IsPathRooted(file)||!value.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("OWNED_PATH_REQUIRED");
  return value;
 }
 public static void Run(string request) {
  SetThreadDpiAwarenessContext(new IntPtr(-4));
  var json=new JavaScriptSerializer();
  var input=json.Deserialize<Dictionary<string,object>>(request);
  string nonce=Field(input,"nonce");
  if(!Regex.IsMatch(nonce,"^[a-f0-9]{32}$"))throw new InvalidOperationException("OWNED_NONCE_REQUIRED");
  string root=Path.GetFullPath(Field(input,"root")).TrimEnd(Path.DirectorySeparatorChar);
  string marker=Owned(root,Field(input,"marker")),statePath=Owned(root,Field(input,"statePath")),stopPath=Owned(root,Field(input,"stopPath"));
  var app=new Application { ShutdownMode=ShutdownMode.OnMainWindowClose };
  var window=new Window { Title="Alicization owned passive menu "+nonce,Width=360,Height=160,ShowActivated=false,ShowInTaskbar=false,WindowStartupLocation=WindowStartupLocation.Manual,Left=GetSystemMetrics(76)+GetSystemMetrics(78)+512,Top=32 };
  var header=new MenuItem { Header="Owned file options" };
  var action=new MenuItem { Header="Record owned marker" };
  AutomationProperties.SetName(header,"Owned file options");
  AutomationProperties.SetName(action,"Record owned marker");
  header.Items.Add(action);
  var menu=new Menu(); menu.Items.Add(header); window.Content=menu;
  var timer=new DispatcherTimer { Interval=TimeSpan.FromMilliseconds(30) };
  int clicks=0; bool foregroundTaken=false; IntPtr handle=IntPtr.Zero;
  Action write=delegate {
   string temporary=statePath+"."+Guid.NewGuid().ToString("N")+".pending";
   string content=json.Serialize(new {nonce=nonce,clicks=clicks,submenuOpen=header.IsSubmenuOpen,actionVisible=action.IsVisible,foregroundTaken=foregroundTaken});
   try { using(var file=new FileStream(temporary,FileMode.CreateNew,FileAccess.Write,FileShare.Read)){byte[] bytes=new UTF8Encoding(false).GetBytes(content);file.Write(bytes,0,bytes.Length);file.Flush(true);} if(File.Exists(statePath))File.Replace(temporary,statePath,null);else File.Move(temporary,statePath); }
   catch(IOException) { }
   finally { if(File.Exists(temporary))File.Delete(temporary); }
  };
  action.Click+=delegate { clicks++; File.WriteAllText(marker,nonce,new UTF8Encoding(false)); write(); };
  header.SubmenuOpened+=delegate {write();}; header.SubmenuClosed+=delegate {write();};
  window.SourceInitialized+=delegate {handle=new WindowInteropHelper(window).Handle;SetWindowLong(handle,-20,GetWindowLong(handle,-20)|0x08000000|0x00000080);};
  window.Loaded+=delegate {
   Rect bounds; if(!GetWindowRect(handle,out bounds))throw new InvalidOperationException("OWNED_RECT_REQUIRED");
   bool outside=true; MonitorCallback callback=delegate(IntPtr monitor,IntPtr hdc,ref Rect rect,IntPtr data){if(bounds.Left<rect.Right&&bounds.Right>rect.Left&&bounds.Top<rect.Bottom&&bounds.Bottom>rect.Top)outside=false;return true;};
   if(!EnumDisplayMonitors(IntPtr.Zero,IntPtr.Zero,callback,IntPtr.Zero)||!outside)throw new InvalidOperationException("OWNED_WINDOW_MUST_BE_OUTSIDE_DISPLAYS");
   uint foreground;GetWindowThreadProcessId(GetForegroundWindow(),out foreground);
   using(var process=Process.GetCurrentProcess()){
    if(foreground==process.Id)throw new InvalidOperationException("OWNED_WINDOW_MUST_NOT_ACTIVATE");
    Console.WriteLine(json.Serialize(new {nonce=nonce,processId=process.Id,processStartTicks=process.StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture),windowId=handle.ToInt64().ToString(CultureInfo.InvariantCulture),windowTitle=window.Title,outsideAllDisplays=outside,foreground=false}));Console.Out.Flush();
   }
   write();timer.Start();
  };
  timer.Tick+=delegate {
   uint foreground;GetWindowThreadProcessId(GetForegroundWindow(),out foreground);
   if(foreground==Process.GetCurrentProcess().Id){foregroundTaken=true;write();window.Close();return;}
   if(File.Exists(stopPath)){timer.Stop();window.Close();}
  };
  window.Closed+=delegate {timer.Stop();};
  app.Run(window);
 }
}
