param([Parameter(Mandatory=$true)][string]$ReportDirectory)
$ErrorActionPreference = 'Stop'
$report = @{format='alicization-windows-sandbox-readiness-v1';startedAt=[DateTime]::UtcNow.ToString('o');status='starting';scope='Sandbox environment readiness only, not application acceptance';checks=@()}
function Save-Readiness {
  $next = Join-Path $ReportDirectory 'readiness.next.json'
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $next -Encoding utf8
  Move-Item -LiteralPath $next -Destination (Join-Path $ReportDirectory 'readiness.json') -Force
}
try {
  # This script is mapped read-only into a guest. Never inject input when it is
  # accidentally invoked on the host or an ordinary local desktop.
  $hostBinding = Get-Content -LiteralPath (Join-Path $ReportDirectory 'host-binding.json') -Raw | ConvertFrom-Json
  $system = Get-CimInstance Win32_ComputerSystem
  if ($env:COMPUTERNAME -eq $hostBinding.hostComputer -or $env:USERNAME -ne 'WDAGUtilityAccount' -or $system.Model -notmatch 'Virtual Machine') {
    throw 'SANDBOX_GUEST_IDENTITY_REQUIRED_NO_INPUT_DISPATCHED'
  }
  $report.computer=$env:COMPUTERNAME
  $report.virtualMachineModel=$system.Model
  $report.runId=$hostBinding.runId
  $report.checks += @{name='guest-distinct-from-host';passed=$true}
  Save-Readiness
  Add-Type -AssemblyName PresentationFramework
  Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class SandboxReadinessInput {
  [StructLayout(LayoutKind.Sequential)] public struct Key { public ushort vk,scan; public uint flags,time; public UIntPtr extra; }
  [StructLayout(LayoutKind.Explicit,Size=40)] public struct Input { [FieldOffset(0)] public uint type; [FieldOffset(8)] public Key key; }
  [DllImport("user32.dll",SetLastError=true)] static extern uint SendInput(uint count,Input[] input,int size);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint processId);
  public static void TypeOwned(IntPtr expected,uint expectedPid,string text) {
    uint actualPid; GetWindowThreadProcessId(expected,out actualPid);
    if(GetForegroundWindow()!=expected || actualPid!=expectedPid) throw new InvalidOperationException("SANDBOX_FOREGROUND_TARGET_CHANGED");
    foreach(char value in text) {
      if(GetForegroundWindow()!=expected) throw new InvalidOperationException("SANDBOX_FOREGROUND_TARGET_CHANGED");
      var events=new Input[2]; events[0].type=events[1].type=1;
      events[0].key.scan=events[1].key.scan=value;
      events[0].key.flags=4; events[1].key.flags=6;
      if(SendInput(2,events,Marshal.SizeOf(typeof(Input)))!=2) throw new Win32Exception(Marshal.GetLastWin32Error());
    }
  }
}
'@
  $window = New-Object Windows.Window
  $window.Title = 'Alicization Sandbox Readiness'
  $window.Width = 540
  $window.Height = 180
  $field = New-Object Windows.Controls.TextBox
  $field.Margin = '24'
  $field.FontSize = 20
  $window.Content = $field
  $window.Show()
  [void]$window.Activate()
  [void]$field.Focus()
  function Pump-Guest([int]$Milliseconds) {
    $frame = New-Object Windows.Threading.DispatcherFrame
    $timer = New-Object Windows.Threading.DispatcherTimer
    $timer.Interval = [TimeSpan]::FromMilliseconds($Milliseconds)
    $timer.Tag = $frame
    $timer.Add_Tick({param($source,$event) $source.Stop(); $source.Tag.Continue=$false})
    $timer.Start()
    [Windows.Threading.Dispatcher]::PushFrame($frame)
  }
  Pump-Guest 300
  $handle = (New-Object Windows.Interop.WindowInteropHelper($window)).Handle
  $expected = 'Sandbox Windows 输入验证'
  [SandboxReadinessInput]::TypeOwned($handle,[uint32]$PID,$expected)
  Pump-Guest 300
  if ($field.Text -cne $expected) { throw 'SANDBOX_NATIVE_UNICODE_READBACK_FAILED' }
  $report.checks += @{name='guest-owned-foreground-unicode-readback';passed=$true;expected=$expected;actual=$field.Text;processId=$PID}
  $window.Close()
  $report.status='ready'
  $report.finishedAt=[DateTime]::UtcNow.ToString('o')
  Save-Readiness
}
catch {
  $report.status='failed'
  $report.error=$_.Exception.Message
  Save-Readiness
  exit 1
}
