[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$fixture=[Console]::In.ReadLine()|ConvertFrom-Json
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AlicizationPopupOwner {
  [DllImport("user32.dll",EntryPoint="SetWindowLongPtrW")] public static extern IntPtr SetOwner(IntPtr window,int index,IntPtr value);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr window,uint relation);
}
'@
$parentA=[Windows.Forms.Form]::new()
$parentB=[Windows.Forms.Form]::new()
$popup=[Windows.Forms.Form]::new()
$parentA.Text='Alicization QA Owner A '+$fixture.nonce
$parentB.Text='Alicization QA Owner B '+$fixture.nonce
$popup.Text='Alicization QA Owned Popup '+$fixture.nonce
foreach($window in @($parentA,$parentB,$popup)){$window.ShowInTaskbar=$false;$window.Width=360;$window.Height=200}
$switch=[Windows.Forms.Button]::new()
$switch.Text='Change owned parent'
$switch.Top=20;$switch.Width=240
$save=[Windows.Forms.Button]::new()
$save.Text='Save owned marker'
$save.Top=65;$save.Width=240
$switch.Add_Click({
  $popup.Owner=$parentB
  [IO.File]::WriteAllText(($fixture.path+'.owner.json'),(@{owner=$popup.Owner.Handle.ToInt64().ToString();popup=$popup.Handle.ToInt64().ToString()}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
})
$save.Add_Click({[IO.File]::WriteAllText($fixture.path,'actual owned popup marker '+$fixture.nonce,[Text.UTF8Encoding]::new($false))})
$popup.Controls.Add($switch);$popup.Controls.Add($save)
$parentA.Show();$parentB.Show();if(!$fixture.startUnowned){$popup.Owner=$parentA};$popup.Show()
if($fixture.startUnowned){
  # ShowInTaskbar=false gives WinForms an internal parking owner. This case
  # deliberately creates a real GW_OWNER=null window, then changes only it.
  [void][AlicizationPopupOwner]::SetOwner($popup.Handle,-8,[IntPtr]::Zero)
  if([AlicizationPopupOwner]::GetWindow($popup.Handle,4) -ne [IntPtr]::Zero){throw 'Fixture could not create an unowned popup'}
}
$timer=[Windows.Forms.Timer]::new();$timer.Interval=100
$timer.Add_Tick({if([IO.File]::Exists($fixture.stopPath)){$timer.Stop();$popup.Close();$parentB.Close();$parentA.Close()}})
$timer.Start()
[Console]::WriteLine((@{ready=$true;windowId=$popup.Handle.ToInt64().ToString();processId=$PID;parentA=$parentA.Handle.ToInt64().ToString();parentB=$parentB.Handle.ToInt64().ToString();initialOwner=if($fixture.startUnowned){$null}else{$parentA.Handle.ToInt64().ToString()};nonce=$fixture.nonce}|ConvertTo-Json -Compress))
[Windows.Forms.Application]::Run($popup)
$timer.Dispose();$popup.Dispose();$parentB.Dispose();$parentA.Dispose()
