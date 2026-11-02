param([Parameter(Mandatory=$true)][string]$ProofPath)
$ErrorActionPreference='Stop'
$proof=Get-Content -LiteralPath $ProofPath -Raw | ConvertFrom-Json
if ($proof.format -cne 'alicization-isolated-guest-v1' -or $proof.nonce -cnotmatch '^[a-f0-9]{64}$') { throw 'Invalid isolated guest proof' }
$system=Get-CimInstance Win32_ComputerSystem
$product=Get-CimInstance Win32_ComputerSystemProduct
if ($system.Manufacturer -cne 'AlicizationQA' -or $system.Model -cne 'IsolatedInputVM' -or $product.UUID -ine $proof.guestUuid -or $product.UUID -ieq $proof.hostUuid -or $env:COMPUTERNAME -ine $proof.guestName -or $env:USERNAME -cne 'AlicizationQA') { throw 'This machine is not the owned isolated Windows guest' }
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AlicizationGuestDesktop {
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] static extern IntPtr GetThreadDesktop(uint thread);
  [DllImport("user32.dll")] static extern IntPtr OpenInputDesktop(uint flags,bool inherit,uint access);
  [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr desktop);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool GetUserObjectInformation(IntPtr value,int index,StringBuilder name,uint size,out uint needed);
  public static string Name() { var name=new StringBuilder(256);uint needed;if(!GetUserObjectInformation(GetThreadDesktop(GetCurrentThreadId()),2,name,512,out needed))throw new InvalidOperationException("Guest desktop unavailable");return name.ToString(); }
  public static string InputName() { var desktop=OpenInputDesktop(0,false,1);if(desktop==IntPtr.Zero)throw new InvalidOperationException("Guest input desktop unavailable");try{var name=new StringBuilder(256);uint needed;if(!GetUserObjectInformation(desktop,2,name,512,out needed))throw new InvalidOperationException("Guest input desktop identity unavailable");return name.ToString();}finally{CloseDesktop(desktop);} }
}
'@
$desktop=[AlicizationGuestDesktop]::Name()
if ($desktop -cne 'Default' -or [AlicizationGuestDesktop]::InputName() -cne 'Default') { throw 'Isolated input acceptance requires the unlocked guest interactive desktop' }
@{format='alicization-isolated-guest-observation-v1';isolatedGuestVerified=$true;guestUuid=$product.UUID;guestName=$env:COMPUTERNAME;manufacturer=$system.Manufacturer;model=$system.Model;desktop=$desktop;user=$env:USERNAME;sessionId=[Diagnostics.Process]::GetCurrentProcess().SessionId} | ConvertTo-Json -Compress
