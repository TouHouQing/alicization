param([int]$RuntimePid = 0)
$ErrorActionPreference='Stop'
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AlicizationHostViewportDesktop {
 delegate bool EnumWindow(IntPtr window,IntPtr state);
 delegate bool EnumMonitor(IntPtr monitor,IntPtr dc,ref Rect rect,IntPtr state);
 [StructLayout(LayoutKind.Sequential)] struct Rect {public int left,top,right,bottom;}
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindow callback,IntPtr state);
 [DllImport("user32.dll")] static extern bool EnumDisplayMonitors(IntPtr dc,IntPtr clip,EnumMonitor callback,IntPtr state);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window,out Rect rect);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window,StringBuilder name,int count);
 [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr window,int index);
 [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
 [DllImport("user32.dll")] static extern IntPtr GetThreadDesktop(uint id);
 [DllImport("user32.dll")] static extern IntPtr OpenInputDesktop(uint flags,bool inherit,uint access);
 [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr handle);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern bool GetUserObjectInformation(IntPtr h,int index,StringBuilder value,uint count,out uint needed);
 static string Name(IntPtr h){var s=new StringBuilder(512);uint n;if(h==IntPtr.Zero||!GetUserObjectInformation(h,2,s,1024,out n))throw new InvalidOperationException("Host desktop identity unavailable");return s.ToString();}
 public static string Current(){return Name(GetThreadDesktop(GetCurrentThreadId()));}
 public static string Input(){var h=OpenInputDesktop(0,false,1);try{return Name(h);}finally{if(h!=IntPtr.Zero)CloseDesktop(h);}}
 public static int VerifyWindows(uint target){
  var displays=new System.Collections.Generic.List<Rect>();
  if(!EnumDisplayMonitors(IntPtr.Zero,IntPtr.Zero,(IntPtr monitor,IntPtr dc,ref Rect rect,IntPtr state)=>{displays.Add(rect);return true;},IntPtr.Zero))throw new InvalidOperationException("Display bounds unavailable");
  var front=GetForegroundWindow();uint foreground;GetWindowThreadProcessId(front,out foreground);
  if(foreground==target){var name=new StringBuilder(256);GetClassName(front,name,256);Rect bounds;GetWindowRect(front,out bounds);throw new InvalidOperationException("QA runtime owns the foreground: hwnd="+front+" class="+name+" visible="+IsWindowVisible(front)+" extendedStyle=0x"+GetWindowLongPtr(front,-20).ToInt64().ToString("X")+" bounds="+bounds.left+","+bounds.top+","+bounds.right+","+bounds.bottom);}
  int count=0;bool overlap=false;
  if(!EnumWindows((window,state)=>{uint pid;GetWindowThreadProcessId(window,out pid);if(pid!=target)return true;count++;if(!IsWindowVisible(window))return true;Rect bounds;if(!GetWindowRect(window,out bounds))throw new InvalidOperationException("QA window bounds unavailable");foreach(var display in displays){if(bounds.left<display.right&&bounds.right>display.left&&bounds.top<display.bottom&&bounds.bottom>display.top)overlap=true;}return true;},IntPtr.Zero))throw new InvalidOperationException("Window ownership unavailable");
  if(count==0||overlap)throw new InvalidOperationException("QA runtime has no owned window or overlaps an actual display");
  return count;
 }
}
'@
$current=[AlicizationHostViewportDesktop]::Current()
$inputDesktop=[AlicizationHostViewportDesktop]::Input()
if($current -cne 'Default' -or $inputDesktop -cne 'Default'){throw 'Host viewport QA requires the real Default desktop'}
$qaProof=@{desktop=$current;inputDesktop=$inputDesktop;hostDesktopVerified=$true;switchedInputDesktop=$false}
if($RuntimePid -gt 0){$qaProof.runtimeWindowCount=[AlicizationHostViewportDesktop]::VerifyWindows([uint32]$RuntimePid);$qaProof.runtimeWindowVerified=$true;$qaProof.runtimePid=$RuntimePid}
$qaProof|ConvertTo-Json -Compress
