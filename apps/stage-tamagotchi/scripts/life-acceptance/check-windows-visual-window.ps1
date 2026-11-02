# Read-only actual window qualification. Never activates a window or injects input.
param(
  [Parameter(Mandatory=$true)][string]$OutputRoot,
  [string]$Workspace=(Join-Path $PSScriptRoot '../../../..')
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
$workspace=(Resolve-Path -LiteralPath $Workspace).Path
Set-Location -LiteralPath $workspace
$root=[IO.Path]::GetFullPath($OutputRoot)
if(Test-Path -LiteralPath $root){throw 'Fresh owned qualification directory required'}
New-Item -ItemType Directory -Path $root|Out-Null
$env:TEMP=$root;$env:TMP=$root
$sources=@('windows-keyboard-native.cs','windows-visual-window.cs','windows-visual-window-process.cs')|ForEach-Object {Join-Path $workspace ('apps/stage-tamagotchi/src/main/services/alicization/execution/'+$_)}
$program=Join-Path $root 'visual-window.exe'
Add-Type -Path $sources -OutputAssembly $program -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll,System.Drawing.dll
$raw=& $program --health
if($LASTEXITCODE -ne 0){throw 'Native visual loader health failed'}
$health=$raw|ConvertFrom-Json
if($health.kind -cne 'windows-visual-window-health-v1' -or $health.bitness -ne 64 -or $health.inputEvents -ne 0 -or $health.captured -or $health.hooksInstalled){throw 'Read-only native health required'}
$compile=@{program=$program;programSha256=(Get-FileHash -LiteralPath $program -Algorithm SHA256).Hash.ToLowerInvariant();sources=@($sources|ForEach-Object {@{path=$_;sha256=(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant()}})}
$nonce=[Guid]::NewGuid().ToString('N')
@{format='owned-readonly-visual-window-fixture-v1';nonce=$nonce;processId=$PID;createdAt=(Get-Date -Format o)}|ConvertTo-Json|Set-Content -LiteralPath ($root+'/owner.json') -Encoding UTF8
$env:TEMP=$root;$env:TMP=$root
Add-Type -ReferencedAssemblies System.dll,System.Core.dll,System.Drawing.dll,System.Windows.Forms.dll -TypeDefinition @'
using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
public static class OwnedVisualCaptureFixture {
  sealed class OwnedForm : Form {
    protected override bool ShowWithoutActivation { get { return true; } }
    protected override CreateParams CreateParams { get { var value=base.CreateParams; value.ExStyle |= 0x08000000; return value; } }
    public OwnedForm(string nonce) {
      Text="Owned visual capture "+nonce; ShowInTaskbar=false; StartPosition=FormStartPosition.Manual;
      int right=0, bottom=0; foreach(var display in Screen.AllScreens) { right=Math.Max(right, display.Bounds.Right); bottom=Math.Max(bottom, display.Bounds.Bottom); }
      ClientSize=new Size(320,240); Location=new Point(right+3000,bottom+3000);
      BackColor=Color.FromArgb(36,63,88);
      Paint += delegate(object sender, PaintEventArgs e) {
        if(Noise!=null) { e.Graphics.DrawImageUnscaled(Noise,0,0); return; }
        using(var red=new SolidBrush(Color.FromArgb(220,35,45))) e.Graphics.FillRectangle(red,0,0,80,80);
        using(var green=new SolidBrush(Color.FromArgb(30,190,75))) e.Graphics.FillRectangle(green,160,120,80,80);
        e.Graphics.DrawString(nonce,Font,Brushes.White,10,90);
      };
      Activated += delegate { ActivatedUnexpectedly=true; };
    }
  }
  static OwnedForm form;
  static OwnedForm parent;
  static Thread thread;
  static readonly ManualResetEventSlim ready=new ManualResetEventSlim(false);
  static Exception error;
  static Bitmap Noise;
  public static bool ActivatedUnexpectedly;
  public static long Window;
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window,StringBuilder value,int length);
  [DllImport("user32.dll")] static extern IntPtr GetThreadDesktop(uint threadId);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool GetUserObjectInformation(IntPtr handle,int index,StringBuilder value,uint bytes,out uint needed);
  public static void Start(string nonce) {
    thread=new Thread(delegate() {
      try { form=new OwnedForm(nonce); form.Shown += delegate { Window=form.Handle.ToInt64(); ready.Set(); }; Application.Run(form); }
      catch(Exception e) { error=e; ready.Set(); }
    });
    thread.IsBackground=true; thread.SetApartmentState(ApartmentState.STA); thread.Start();
    if(!ready.Wait(5000) || error!=null || Window==0) throw new InvalidOperationException("Owned visual form did not start",error);
  }
  public static string ClassName() { var value=new StringBuilder(256); if(GetClassName(new IntPtr(Window),value,256)==0) throw new InvalidOperationException(); return value.ToString(); }
  public static string Desktop() { uint needed; var value=new StringBuilder(256); if(!GetUserObjectInformation(GetThreadDesktop(GetCurrentThreadId()),2,value,512,out needed)) throw new InvalidOperationException(); return value.ToString(); }
  public static bool OutsideDisplays() { bool result=true; form.Invoke(new MethodInvoker(delegate { foreach(var display in Screen.AllScreens) if(form.Bounds.IntersectsWith(display.Bounds)) result=false; })); return result; }
  public static void EnableNoise() { form.Invoke(new MethodInvoker(delegate {
    var bitmap=new Bitmap(320,240); var random=new Random(872);
    for(int y=0;y<240;y++) for(int x=0;x<320;x++) bitmap.SetPixel(x,y,Color.FromArgb(random.Next(256),random.Next(256),random.Next(256)));
    Noise=bitmap; form.Invalidate(); form.Update();
  })); }
  public static void Hide() { form.Invoke(new MethodInvoker(delegate { form.Hide(); })); }
  public static string ChangeOwner() {
    string owner=null;
    form.Invoke(new MethodInvoker(delegate {
      parent=new OwnedForm("Owned passive parent"); parent.Show(); form.Owner=parent;
      owner=parent.Handle.ToInt64().ToString(System.Globalization.CultureInfo.InvariantCulture);
    }));
    return owner;
  }
  public static bool Close() { if(form!=null && !form.IsDisposed) form.Invoke(new MethodInvoker(delegate { form.Owner=null; if(parent!=null){parent.Close();parent.Dispose();parent=null;} form.Close(); })); return thread==null || thread.Join(5000); }
}
'@
$result=[ordered]@{format='actual-owned-readonly-native-window-capture-v1';passed=$false;checks=@();nonce=$nonce;root=$root;programSha256=$compile.programSha256;sourceHashes=$compile.sources;inputEvents=0;normalFixtureClosure=$false}
function Capture-OwnedWindow($owner,$changes=$null) {
  $start=[Diagnostics.ProcessStartInfo]::new($compile.program,'--capture')
  $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $start.StandardOutputEncoding=[Text.UTF8Encoding]::new($false);$start.StandardErrorEncoding=[Text.UTF8Encoding]::new($false)
  $process=[Diagnostics.Process]::Start($start)
  try {
    $stdout=$process.StandardOutput.ReadToEndAsync();$stderr=$process.StandardError.ReadToEndAsync()
    $parent=[Diagnostics.Process]::GetCurrentProcess()
    $request=@{version=1;owner=$owner;parentProcessId=$PID;parentStartTicks=$parent.StartTime.ToUniversalTime().Ticks.ToString([Globalization.CultureInfo]::InvariantCulture);expiresAt=([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+15000)}
    if($changes){foreach($key in $changes.Keys){$request[$key]=$changes[$key]}}
    $process.StandardInput.WriteLine(($request|ConvertTo-Json -Depth 4 -Compress));$process.StandardInput.Close()
    if(!$process.WaitForExit(15000)){$process.Kill();$process.WaitForExit();throw 'Owned read-only capture exceeded its bound'}
    if($stderr.Result.Length){throw 'Native capture emitted unexpected stderr'}
    return @{exitCode=$process.ExitCode;value=($stdout.Result|ConvertFrom-Json)}
  }
  finally {if(!$process.HasExited){$process.Kill();$process.WaitForExit()};$process.Dispose()}
}
try {
  [OwnedVisualCaptureFixture]::Start($nonce)
  $self=[Diagnostics.Process]::GetCurrentProcess()
  $owner=[ordered]@{windowId=[OwnedVisualCaptureFixture]::Window.ToString();processId=$PID;processStartTicks=$self.StartTime.ToUniversalTime().Ticks.ToString([Globalization.CultureInfo]::InvariantCulture);windowClass=[OwnedVisualCaptureFixture]::ClassName();desktop=[OwnedVisualCaptureFixture]::Desktop()}
  $result.owner=$owner
  $result.outsideAllDisplays=[OwnedVisualCaptureFixture]::OutsideDisplays()
  if(!$result.outsideAllDisplays){throw 'Owned capture fixture overlaps a real display'}
  foreach($round in 1..3){
    $capture=Capture-OwnedWindow $owner
    if($capture.exitCode -ne 0 -or !$capture.value.ok -or $capture.value.inputEvents -ne 0 -or $capture.value.foregroundActivated){throw ('Native single-window read failed: '+$capture.value.errorCode)}
    $result.lastGeometry=$capture.value.geometry
    $bytes=[Convert]::FromBase64String($capture.value.png)
    if($round -eq 1){[IO.File]::WriteAllBytes((Join-Path $root 'actual-owned-window-before-validation.png'),$bytes)}
    $stream=[IO.MemoryStream]::new($bytes)
    try {
      $bitmap=[Drawing.Bitmap]::new($stream)
      try {
        $pixel=$bitmap.GetPixel(10,10)
        $green=$bitmap.GetPixel(170,130)
        if($bitmap.Width -ne 320 -or $bitmap.Height -ne 240 -or $pixel.A -ne 255 -or $pixel.R -ne 220 -or $pixel.G -ne 35 -or $pixel.B -ne 45 -or $green.G -ne 190){throw ('Actual owned image size='+$bitmap.Width+'x'+$bitmap.Height+'; red='+$pixel.ToString()+'; green='+$green.ToString())}
      }
      finally {$bitmap.Dispose()}
    }
    finally {$stream.Dispose()}
    if($round -eq 1){[IO.File]::WriteAllBytes((Join-Path $root 'actual-owned-window.png'),$bytes)}
    $result.checks+=@{round=$round;kind='actual-owned-window-pixels';passed=$true;imageSha256=$capture.value.imageSha256;geometry=$capture.value.geometry;authority=$capture.value.authority}
  }
  foreach($field in @('processStartTicks','windowClass','desktop')){
    $changed=@{};foreach($key in $owner.Keys){$changed[$key]=$owner[$key]}
    if($field -eq 'processStartTicks'){$changed[$field]=([long]::Parse($owner[$field])+1).ToString()}else{$changed[$field]='Wrong owned identity'}
    $capture=Capture-OwnedWindow $changed
    if($capture.exitCode -eq 0 -or $capture.value.ok -or $capture.value.png){throw 'Changed native identity still disclosed an image'}
    $result.checks+=@{kind='identity-refusal';field=$field;passed=$true;errorCode=$capture.value.errorCode}
  }
  foreach($changes in @(@{expiresAt=([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-1)},@{parentStartTicks=([Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().Ticks+1).ToString()},@{shell='not-accepted'})){
    $invalid=Capture-OwnedWindow $owner $changes
    if($invalid.exitCode -eq 0 -or $invalid.value.ok -or $invalid.value.png){throw 'Invalid capture authority disclosed an image'}
    $result.checks+=@{kind='authority-refusal';field=@($changes.Keys)[0];passed=$true;errorCode=$invalid.value.errorCode}
  }
  [void][Reflection.Assembly]::LoadFrom($compile.program)
  $visualOwner=[Alicization.WindowsInput.VisualWindowOwner]::new()
  foreach($key in $owner.Keys){$visualOwner.$key=$owner[$key]}
  $client=[Alicization.WindowsInput.VisualRectangle]::new()
  foreach($key in @('left','top','width','height')){$client.$key=$result.lastGeometry.clientBounds.$key}
  if([Alicization.WindowsInput.VisualWindow]::PointerSurfaceCurrent($visualOwner,$client,$client.left+10,$client.top+10,$null)){throw 'Background visual pointer surface was incorrectly admitted'}
  $result.checks+=@{kind='actual-background-pointer-surface-refusal';passed=$true;activated=$false;inputEvents=0}
  $parentWindowId=[OwnedVisualCaptureFixture]::ChangeOwner()
  $changedOwner=Capture-OwnedWindow $owner
  if($changedOwner.exitCode -ne 0 -or !$changedOwner.value.ok -or $changedOwner.value.authority.ownerWindowId -cne $parentWindowId){throw 'Native capture did not bind the real current parent owner'}
  if($changedOwner.value.imageSha256 -cne $result.checks[0].imageSha256){throw 'Owner counterexample requires unchanged client pixels'}
  if([Alicization.WindowsInput.VisualWindow]::OwnerContextCurrent($visualOwner,$null) -or ![Alicization.WindowsInput.VisualWindow]::OwnerContextCurrent($visualOwner,$parentWindowId)){throw 'Native metadata check accepted the old parent owner or refused the actual current owner'}
  $result.checks+=@{kind='actual-owner-change-with-identical-client-image';passed=$true;ownerWindowId=$parentWindowId;oldOwnerContextRefused=$true;sameClientImage=$true;inputEvents=0}
  [OwnedVisualCaptureFixture]::Hide()

  $hidden=Capture-OwnedWindow $owner
  if($hidden.exitCode -eq 0 -or $hidden.value.ok -or $hidden.value.png){throw 'Hidden native window still disclosed an image'}
  $result.checks+=@{kind='hidden-refusal';passed=$true;errorCode=$hidden.value.errorCode}
  $result.foregroundTaken=[OwnedVisualCaptureFixture]::ActivatedUnexpectedly
  if($result.foregroundTaken){throw 'Owned visual fixture took foreground'}
  $result.passed=$true
}
catch {$result.failure=$_.Exception.Message;throw}
finally {
  $result.normalFixtureClosure=[OwnedVisualCaptureFixture]::Close()
  if(!$result.normalFixtureClosure){$result.passed=$false}
  $result.finishedAt=(Get-Date -Format o)
  [IO.File]::WriteAllText((Join-Path $root 'report.json'),($result|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
}
[pscustomobject]@{passed=$result.passed;checks=$result.checks.Count;normalClosure=$result.normalFixtureClosure;outsideAllDisplays=$result.outsideAllDisplays;foregroundTaken=$result.foregroundTaken;inputEvents=0;programSha256=$result.programSha256}|ConvertTo-Json
