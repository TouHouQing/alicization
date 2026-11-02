$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$script:lifeForegroundRequired = $false
function Assert-LifeDispatch {
  if ($null -ne $lifeRequest.dispatchExpiresAt -and [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -ge [long]$lifeRequest.dispatchExpiresAt) {
    throw 'ACTION_AUTHORITY_EXPIRED'
  }
  # A popup can retain its HWND, PID and controls while its owner changes.
  # Recheck GW_OWNER at dispatch, including an explicitly observed null owner.
  if ($script:lifeDispatchWindow -and $lifeRequest.PSObject.Properties.Name -ccontains 'expectedOwnerWindowId') {
    $expectedOwner = if ($null -eq $lifeRequest.expectedOwnerWindowId) { [IntPtr]::Zero } else { [IntPtr]::new([long]$lifeRequest.expectedOwnerWindowId) }
    if ([AlicizationOwnedDesktop]::GetWindow($script:lifeDispatchWindow,4) -ne $expectedOwner) { throw 'WINDOW_OWNER_CHANGED' }
  }
  if ($script:lifeForegroundRequired -and (!$script:lifeDispatchWindow -or ![AlicizationOwnedDesktop]::IsForegroundScope($script:lifeDispatchWindow))) { throw 'FOREGROUND_REQUIRED' }
}
function Expand-LifeControl($pattern) {
  if ($pattern.Current.ExpandCollapseState -eq [System.Windows.Automation.ExpandCollapseState]::LeafNode) { throw 'ACTION_PATTERN_UNAVAILABLE' }
  Assert-LifeDispatch
  $script:lifeDispatched = $true
  $pattern.Expand()
  # A successful UIA call can immediately collapse when the window cannot
  # acquire menu capture. Observe the postcondition without replaying Expand.
  $watch = [Diagnostics.Stopwatch]::StartNew()
  while ($pattern.Current.ExpandCollapseState -ne [System.Windows.Automation.ExpandCollapseState]::Expanded -and $watch.ElapsedMilliseconds -lt 500) {
    Assert-LifeDispatch
    Start-Sleep -Milliseconds 25
  }
  if ($pattern.Current.ExpandCollapseState -ne [System.Windows.Automation.ExpandCollapseState]::Expanded) { throw 'EXPANSION_NOT_OBSERVED' }
}
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AlicizationOwnedDesktop {
  public static long DispatchExpiresAt;
  static void AssertDispatch() { if (DispatchExpiresAt > 0 && DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() >= DispatchExpiresAt) throw new InvalidOperationException("ACTION_AUTHORITY_EXPIRED"); }
  [StructLayout(LayoutKind.Sequential)] public struct WindowRect { public int left, top, right, bottom; }
  [StructLayout(LayoutKind.Sequential)] struct GuiInfo { public uint size, flags; public IntPtr active, focus, capture, menuOwner, moveSize, caret; public WindowRect caretRect; }
  [DllImport("user32.dll")] static extern bool GetGUIThreadInfo(uint thread, ref GuiInfo info);
  public static string ForegroundFocus(IntPtr window) {
    uint process; uint thread = GetWindowThreadProcessId(window, out process);
    var info = new GuiInfo { size = (uint)Marshal.SizeOf(typeof(GuiInfo)) };
    if (thread == 0 || GetForegroundWindow() != window || !GetGUIThreadInfo(thread, ref info) || info.active != window || info.focus == IntPtr.Zero || GetForegroundWindow() != window) return null;
    return info.focus.ToInt64().ToString(System.Globalization.CultureInfo.InvariantCulture);
  }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr handle, out WindowRect rect);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr handle);
  public static int[] Bounds(IntPtr handle) { WindowRect rect; if (!GetWindowRect(handle, out rect)) throw new Exception("WINDOW_BOUNDS_UNAVAILABLE"); return new int[] { rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top }; }
  public delegate bool EnumCallback(IntPtr hwnd, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumCallback callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hwnd, EnumCallback callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
  [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr desktop);
  public static bool IsInputDesktop() {
    IntPtr input = OpenInputDesktop(0,false,1);
    if (input == IntPtr.Zero) return true;
    try { return String.Equals(DesktopName(input),CurrentDesktop(),StringComparison.Ordinal); }
    finally { CloseDesktop(input); }
  }
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hwnd, uint relationship);
  public static bool IsForegroundScope(IntPtr window) {
    IntPtr foreground = GetForegroundWindow();
    if (foreground == IntPtr.Zero) return false;
    // A nonactivating menu popup may belong to its foreground parent. Never
    // activate a background sibling or infer authority from a shared PID.
    for (int depth = 0; window != IntPtr.Zero && depth < 16; depth++, window = GetWindow(window,4)) {
      if (window == foreground) return true;
    }
    return false;
  }
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll")] public static extern IntPtr GetThreadDesktop(uint threadId);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder value, uint length, out uint needed);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder value, int length);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder name, int count);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hwnd, int index);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="SendMessageTimeoutW")] static extern IntPtr ReadMessage(IntPtr hwnd, uint message, IntPtr wparam, StringBuilder text, uint flags, uint timeout, out IntPtr result);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="SendMessageTimeoutW")] static extern IntPtr TextMessage(IntPtr hwnd, uint message, IntPtr wparam, string text, uint flags, uint timeout, out IntPtr result);
  [DllImport("user32.dll", EntryPoint="SendMessageTimeoutW")] static extern IntPtr SimpleMessage(IntPtr hwnd, uint message, IntPtr wparam, IntPtr lparam, uint flags, uint timeout, out IntPtr result);
  public static string WindowClass(IntPtr hwnd) { var value = new StringBuilder(256); GetClassName(hwnd,value,256); return value.ToString(); }
  public static string EditText(IntPtr hwnd) { IntPtr length; if(SimpleMessage(hwnd,14,IntPtr.Zero,IntPtr.Zero,2,2000,out length)==IntPtr.Zero || length.ToInt64()>16384) throw new InvalidOperationException("CONTROL_VALUE_BUDGET"); var value = new StringBuilder(16385); IntPtr result; if (ReadMessage(hwnd,13,new IntPtr(16385),value,2,2000,out result)==IntPtr.Zero) throw new InvalidOperationException("CONTROL_READ_TIMEOUT"); return value.ToString(); }
  public static void SetEditText(IntPtr hwnd,string value) { AssertDispatch(); IntPtr result; if (TextMessage(hwnd,12,IntPtr.Zero,value,2,2000,out result)==IntPtr.Zero || result==IntPtr.Zero) throw new InvalidOperationException("CONTROL_WRITE_FAILED"); }
  public static void ClickButton(IntPtr hwnd) { AssertDispatch(); IntPtr result; if (SimpleMessage(hwnd,245,IntPtr.Zero,IntPtr.Zero,2,2000,out result)==IntPtr.Zero) throw new InvalidOperationException("CONTROL_CLICK_TIMEOUT"); }
  public static int CheckState(IntPtr hwnd) { IntPtr result; SimpleMessage(hwnd,240,IntPtr.Zero,IntPtr.Zero,2,2000,out result); return result.ToInt32(); }
  public static string DesktopName(IntPtr handle) { var value = new StringBuilder(256); uint needed; if (!GetUserObjectInformation(handle, 2, value, 512, out needed)) throw new InvalidOperationException("Cannot identify desktop"); return value.ToString(); }
  public static string CurrentDesktop() { return DesktopName(GetThreadDesktop(GetCurrentThreadId())); }
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr handle);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr handle);
  public static void NotifyComboEditChanged(IntPtr edit,IntPtr window) {
    if (edit==IntPtr.Zero || WindowClass(edit)!="Edit") return;
    var combo=GetParent(edit);
    if (combo==IntPtr.Zero || WindowClass(combo)!="ComboBox") return;
    var receiver=GetParent(combo);
    if (receiver==IntPtr.Zero || GetAncestor(edit,2)!=window || GetAncestor(receiver,2)!=window) throw new InvalidOperationException("CONTROL_WINDOW_MISMATCH");
    // WM_SETTEXT changes a combo's edit field without CBN_EDITCHANGE. Shell
    // file dialogs otherwise retain the old filename behind the visible text.
    AssertDispatch(); IntPtr result;
    if (SimpleMessage(receiver,0x111,new IntPtr((5<<16)|(GetDlgCtrlID(combo)&0xFFFF)),combo,2,2000,out result)==IntPtr.Zero) throw new InvalidOperationException("CONTROL_EDIT_NOTIFY_TIMEOUT");
  }
  static long ComboMessage(IntPtr handle,uint message,IntPtr word,IntPtr value) {
    if (message == 0x14E || message == 0x111) AssertDispatch();
    IntPtr result;
    if (SimpleMessage(handle,message,word,value,2,2000,out result)==IntPtr.Zero) throw new InvalidOperationException("SELECT_CONTROL_TIMEOUT");
    return result.ToInt64();
  }
  public static string[] ComboItems(IntPtr handle) {
    long count=ComboMessage(handle,0x146,IntPtr.Zero,IntPtr.Zero);
    if(count<0 || count>128) throw new InvalidOperationException("SELECT_OPTIONS_BUDGET");
    var items=new string[count];
    int total=0;
    for(int index=0;index<count;index++) {
      long length=ComboMessage(handle,0x149,new IntPtr(index),IntPtr.Zero);
      if(length<0 || length>512 || (total+=(int)length)>8192) throw new InvalidOperationException("SELECT_OPTION_TEXT_BUDGET");
      var buffer=new StringBuilder((int)length+1); IntPtr result;
      if(ReadMessage(handle,0x148,new IntPtr(index),buffer,2,2000,out result)==IntPtr.Zero || result.ToInt64()!=length) throw new InvalidOperationException("SELECT_OPTIONS_CHANGED");
      items[index]=buffer.ToString();
    }
    return items;
  }
  public static int ComboIndex(IntPtr handle) { return (int)ComboMessage(handle,0x147,IntPtr.Zero,IntPtr.Zero); }
  static void AssertComboItems(IntPtr handle,string[] expected) {
    var current=ComboItems(handle);
    if(current.Length!=expected.Length) throw new InvalidOperationException("SELECT_OPTIONS_CHANGED");
    for(int item=0;item<current.Length;item++) if(!String.Equals(current[item],expected[item],StringComparison.Ordinal)) throw new InvalidOperationException("SELECT_OPTIONS_CHANGED");
  }
  public static void SelectCombo(IntPtr handle,int index,string[] expected) {
    AssertComboItems(handle,expected);
    if(ComboMessage(handle,0x14E,new IntPtr(index),IntPtr.Zero)!=index) throw new InvalidOperationException("SELECT_CONTROL_FAILED");
    // CB_SETCURSEL does not notify the application. Deliver only this observed
    // control's CBN_SELCHANGE to its native parent, then independently read back.
    AssertComboItems(handle,expected);
    if(ComboMessage(handle,0x147,IntPtr.Zero,IntPtr.Zero)!=index) throw new InvalidOperationException("SELECT_CONTROL_READBACK_CHANGED");
    ComboMessage(GetParent(handle),0x111,new IntPtr((1<<16)|(GetDlgCtrlID(handle)&0xFFFF)),handle);
    AssertComboItems(handle,expected);
    if(ComboMessage(handle,0x147,IntPtr.Zero,IntPtr.Zero)!=index) throw new InvalidOperationException("SELECT_CONTROL_READBACK_CHANGED");
  }
}
'@
[AlicizationOwnedDesktop]::DispatchExpiresAt = if ($null -ne $lifeRequest.dispatchExpiresAt) { [long]$lifeRequest.dispatchExpiresAt } else { 0 }
function Get-LifeRole($element) {
  $name = $element.Current.ControlType.ProgrammaticName.Replace('ControlType.', '')
  $native = [IntPtr]::new($element.Current.NativeWindowHandle)
  $class = [AlicizationOwnedDesktop]::WindowClass($native)
  if ($name -eq 'Pane' -and $class -match '(?i)edit') { return 'input' }
  if ($name -eq 'Pane' -and $class -match '(?i)button') {
    $style = [AlicizationOwnedDesktop]::GetWindowLong($native,-16) -band 15
    if ($style -in @(2,3,6)) { return 'checkbox' }
    if ($style -in @(4,9)) { return 'radio' }
    return 'button'
  }
  switch ($name) { 'Edit' { 'input' } 'Button' { 'button' } 'Text' { 'text' } 'CheckBox' { 'checkbox' } 'RadioButton' { 'radio' } 'ComboBox' { 'select' } 'MenuItem' { 'menu-item' } 'ListItem' { 'list-item' } 'TabItem' { 'tab' } 'Hyperlink' { 'link' } default { $name.ToLowerInvariant() } }
}
function Get-LifeControls($root) {
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $queue = [Collections.Generic.Queue[object]]::new()
  $queue.Enqueue(@{element=$root;depth=0})
  $result = [Collections.Generic.List[object]]::new()
  $visited = 0
  while ($queue.Count -gt 0 -and $visited -lt 500 -and $result.Count -lt 120) {
    $node = $queue.Dequeue()
    $visited++
    $element = $node.element
    # UIA can expose an owned popup below its parent's logical tree. Its
    # controls require their own explicit observation and native identity.
    if ($node.depth -gt 0) {
      $childHandle = [IntPtr]::new($element.Current.NativeWindowHandle)
      if ($element.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window -and $childHandle -ne [IntPtr]::Zero -and $childHandle -ne [IntPtr]::new($root.Current.NativeWindowHandle)) { continue }
      if ($childHandle -ne [IntPtr]::Zero -and [AlicizationOwnedDesktop]::GetAncestor($childHandle,2) -ne [IntPtr]::new($root.Current.NativeWindowHandle)) { continue }
    }
    if ($node.depth -gt 0 -and !$element.Current.IsOffscreen) { $result.Add($element) }
    if ($node.depth -lt 8) {
      $child = $walker.GetFirstChild($element)
      while ($child -and $queue.Count -lt 500) {
        $queue.Enqueue(@{element=$child;depth=$node.depth+1})
        $child = $walker.GetNextSibling($child)
      }
    }
  }
  return $result.ToArray()
}
function Get-LifeContainingWindow($element) {
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $current = $element
  for ($depth = 0; $current -and $depth -lt 32; $depth++) {
    if ($current.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window -and $current.Current.NativeWindowHandle -ne 0) { return [IntPtr]::new($current.Current.NativeWindowHandle) }
    $current = $walker.GetParent($current)
  }
  return [IntPtr]::Zero
}
function Get-LifeSelectItems($element, [switch]$AllowPartial) {
  # ItemContainerPattern exposes logical WPF items while the popup is closed.
  # Reading them must not expand, realize, scroll or focus the control.
  $container = $null
  if ($element.TryGetCurrentPattern([System.Windows.Automation.ItemContainerPattern]::Pattern,[ref]$container)) {
    $result = [Collections.Generic.List[object]]::new()
    $seen = [Collections.Generic.HashSet[string]]::new()
    $item = $container.FindItemByProperty($null,$null,$null)
    while ($item) {
      if ($result.Count -ge 64) {
        if ($AllowPartial) { return @{items=$result.ToArray();complete=$false} }
        throw 'SELECT_OPTIONS_BUDGET'
      }
      if (!$seen.Add(($item.GetRuntimeId() -join ':'))) { throw 'SELECT_OPTIONS_BUDGET' }
      $selection = $null
      if ($item.Current.ProcessId -ne $element.Current.ProcessId -or !$item.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern,[ref]$selection)) { throw 'SELECT_CONTAINER_CHANGED' }
      $owner = $selection.Current.SelectionContainer
      if (!$owner -or ($owner.GetRuntimeId() -join ':') -cne ($element.GetRuntimeId() -join ':')) { throw 'SELECT_CONTAINER_CHANGED' }
      $result.Add($item)
      $item = $container.FindItemByProperty($item,$null,$null)
    }
    return @{items=$result.ToArray();complete=$true}
  }
  # Enumerate only this observed control. Collapsed WPF options can be
  # offscreen but still support SelectionItemPattern without moving focus.
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $queue = [Collections.Generic.Queue[object]]::new()
  $queue.Enqueue(@{element=$element;depth=0})
  $result = [Collections.Generic.List[object]]::new()
  $visited = 0
  while ($queue.Count -gt 0) {
    if (++$visited -gt 128 -or $result.Count -gt 64) { throw 'SELECT_OPTIONS_BUDGET' }
    $node = $queue.Dequeue()
    if ($node.element.Current.ControlType -eq [System.Windows.Automation.ControlType]::ListItem) {
      $result.Add($node.element)
      continue
    }
    if ($node.depth -ge 4) { continue }
    $child = $walker.GetFirstChild($node.element)
    while ($child) {
      if ($queue.Count -ge 128) { throw 'SELECT_OPTIONS_BUDGET' }
      $queue.Enqueue(@{element=$child;depth=$node.depth+1})
      $child = $walker.GetNextSibling($child)
    }
  }
  return @{items=$result.ToArray();complete=$true}
}
function Get-LifeDescriptor($element) {
  $native = [IntPtr]::new($element.Current.NativeWindowHandle)
  $class = [AlicizationOwnedDesktop]::WindowClass($native)
  $role = Get-LifeRole $element
  $password = $element.Current.IsPassword -or ($role -eq 'input' -and ([AlicizationOwnedDesktop]::GetWindowLong($native,-16) -band 32))
  $valuePattern = $null
  $hasValue = $element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)
  $value = if ($hasValue -and !$password) { $valuePattern.Current.Value } elseif ($role -eq 'input' -and !$password -and $class -match '(?i)edit') { [AlicizationOwnedDesktop]::EditText($native) } elseif ($role -in @('checkbox','radio')) { [AlicizationOwnedDesktop]::CheckState($native).ToString() } else { $null }
  $descriptor = @{ runtimeId=($element.GetRuntimeId() -join ':'); name=$element.Current.Name; role=$role; automationId=$element.Current.AutomationId; enabled=$element.Current.IsEnabled; value=$value; password=[bool]$password; readOnly=(($hasValue -and $valuePattern.Current.IsReadOnly) -or ($role -eq 'input' -and ($class -match '(?i)edit') -and ([AlicizationOwnedDesktop]::GetWindowLong($native,-16) -band 2048))); nativeId=$native.ToInt64().ToString(); className=$class }
  if ($role -eq 'select') {
    $choices = Get-LifeSelectItems $element -AllowPartial
    $descriptor.options = @($choices.items | ForEach-Object { $_.Current.Name })
    $descriptor.optionsComplete = $choices.complete
    $selection = $null
    if ($element.TryGetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern,[ref]$selection)) {
      $selected = @($selection.Current.GetSelection())
      if ($selected.Count -gt 1) { throw 'SELECT_MULTIPLE_VALUES_UNSUPPORTED' }
      $descriptor.value = if ($selected.Count -eq 1) { $selected[0].Current.Name } else { $null }
    }
  }
  $scrollPattern = $null
  if ($element.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern,[ref]$scrollPattern)) {
    $state = $scrollPattern.Current
    # PS 5.1 JSON shortens double precision. Canonical percentages survive the
    # observation round trip while retaining subpixel viewport change checks.
    $descriptor.scroll = @{verticalPercent=[Math]::Round($state.VerticalScrollPercent,6);horizontalPercent=[Math]::Round($state.HorizontalScrollPercent,6);verticalViewSize=[Math]::Round($state.VerticalViewSize,6);horizontalViewSize=[Math]::Round($state.HorizontalViewSize,6);verticalScrollable=$state.VerticallyScrollable;horizontalScrollable=$state.HorizontallyScrollable}
  }
  return $descriptor
}
$lifeDispatched = $false
try {
  # GetWindowRect is DPI-virtualized unless this worker thread declares its space.
  $lifeCoordinateSpace = if ([AlicizationOwnedDesktop]::SetThreadDpiAwarenessContext([IntPtr]::new(-4)) -ne [IntPtr]::Zero) { 'screen-physical' } else { 'unknown' }
  $desktop = [AlicizationOwnedDesktop]::CurrentDesktop()
  if ($env:LIFE_QA_PRIVATE_DESKTOP -and $desktop -ne $env:LIFE_QA_PRIVATE_DESKTOP) { throw 'PRIVATE_DESKTOP_MISMATCH' }
  if ($lifeRequest.operation -eq 'health') {
    # Assembly load and native desktop identity are checked without enumerating
    # windows, reading their controls, capturing pixels or changing focus.
    @{ok=$true;health='uia-ready';keyboardReady=$false;desktop=$desktop} | ConvertTo-Json -Compress
    exit 0
  }
  $handle = [IntPtr]::Zero
  if ($lifeRequest.windowId) {
    $handle = [IntPtr]::new([long]$lifeRequest.windowId)
  }
  elseif ($lifeRequest.windowTitle -or $lifeRequest.windowTitleIncludes -or $lifeRequest.processName) {
    $lifeMatches = [Collections.Generic.List[IntPtr]]::new()
    $callback = [AlicizationOwnedDesktop+EnumCallback]{ param($candidate,$unused)
      $title = [Text.StringBuilder]::new(512)
      [void][AlicizationOwnedDesktop]::GetWindowText($candidate,$title,512)
      if (![AlicizationOwnedDesktop]::IsWindowVisible($candidate)) { return $true }
      if ($lifeRequest.windowTitle -and $title.ToString() -cne $lifeRequest.windowTitle) { return $true }
      if ($lifeRequest.windowTitleIncludes -and $title.ToString().IndexOf([string]$lifeRequest.windowTitleIncludes,[StringComparison]::OrdinalIgnoreCase) -lt 0) { return $true }
      $candidatePid = [uint32]0
      $candidateThread = [AlicizationOwnedDesktop]::GetWindowThreadProcessId($candidate,[ref]$candidatePid)
      if (!$candidateThread -or [AlicizationOwnedDesktop]::DesktopName([AlicizationOwnedDesktop]::GetThreadDesktop($candidateThread)) -cne $desktop) { return $true }
      if ($lifeRequest.processName) {
        try { $candidateProcess = [Diagnostics.Process]::GetProcessById($candidatePid).ProcessName }
        catch { return $true }
        if (![string]::Equals($candidateProcess,[string]$lifeRequest.processName,[StringComparison]::OrdinalIgnoreCase)) { return $true }
      }
      $lifeMatches.Add($candidate)
      if ($lifeMatches.Count -gt 1) { return $false }
      return $true
    }
    [void][AlicizationOwnedDesktop]::EnumWindows($callback,[IntPtr]::Zero)
    if ($lifeMatches.Count -eq 0) { throw 'WINDOW_NOT_FOUND' }
    if ($lifeMatches.Count -ne 1) {
      # Return only the two already-matched identities. Ambiguity never chooses
      # a window or grants an input target; callers must observe again.
      $script:lifeAmbiguousWindows = @($lifeMatches | ForEach-Object {
        $matchPid = [uint32]0
        [void][AlicizationOwnedDesktop]::GetWindowThreadProcessId($_,[ref]$matchPid)
        @{windowId=$_.ToInt64().ToString();processId=$matchPid;windowClass=[AlicizationOwnedDesktop]::WindowClass($_)}
      })
      throw 'AMBIGUOUS_WINDOW'
    }
    $handle = $lifeMatches[0]
  }
  else { $handle = [AlicizationOwnedDesktop]::GetForegroundWindow() }
  if ($handle -eq [IntPtr]::Zero) { throw 'WINDOW_NOT_FOUND' }
  $ownerProcess = [uint32]0
  $thread = [AlicizationOwnedDesktop]::GetWindowThreadProcessId($handle,[ref]$ownerProcess)
  if ($thread -eq 0 -or [AlicizationOwnedDesktop]::DesktopName([AlicizationOwnedDesktop]::GetThreadDesktop($thread)) -ne $desktop) { throw 'WINDOW_DESKTOP_MISMATCH' }
  if ($lifeRequest.processId -and [uint32]$lifeRequest.processId -ne $ownerProcess) { throw 'WINDOW_IDENTITY_CHANGED' }
  $lifeProcessStartTicks = [Diagnostics.Process]::GetProcessById($ownerProcess).StartTime.ToUniversalTime().Ticks.ToString()
  $lifeWindowClass = [AlicizationOwnedDesktop]::WindowClass($handle)
  if ($lifeRequest.operation -ne 'observe' -and (!$lifeRequest.expectedProcessStartTicks -or !$lifeRequest.expectedWindowClass -or !$lifeRequest.expectedDesktop)) { throw 'WINDOW_IDENTITY_REQUIRED' }
  if ($lifeRequest.expectedProcessStartTicks -and $lifeRequest.expectedProcessStartTicks -cne $lifeProcessStartTicks) { throw 'WINDOW_PROCESS_REUSED' }
  if ($lifeRequest.expectedWindowClass -and $lifeRequest.expectedWindowClass -cne $lifeWindowClass) { throw 'WINDOW_CLASS_CHANGED' }
  if ($lifeRequest.expectedDesktop -and $lifeRequest.expectedDesktop -cne $desktop) { throw 'WINDOW_DESKTOP_CHANGED' }
  # GW_OWNER is read from this exact native window; unrelated popups never join its proof chain.
  $lifeOwnerWindow = [AlicizationOwnedDesktop]::GetWindow($handle,4)
  $script:lifeDispatchWindow = $handle
  $lifeOwnerWindowId = $null
  if ($lifeOwnerWindow -ne [IntPtr]::Zero) {
    $lifeOwnerPid = [uint32]0
    $lifeOwnerThread = [AlicizationOwnedDesktop]::GetWindowThreadProcessId($lifeOwnerWindow,[ref]$lifeOwnerPid)
    if ($lifeOwnerPid -eq $ownerProcess -and [AlicizationOwnedDesktop]::DesktopName([AlicizationOwnedDesktop]::GetThreadDesktop($lifeOwnerThread)) -eq $desktop) { $lifeOwnerWindowId = $lifeOwnerWindow.ToInt64().ToString() }
  }
  $lifeBounds = [AlicizationOwnedDesktop]::Bounds($handle)
  if ($lifeRequest.operation -ne 'observe' -and ![AlicizationOwnedDesktop]::IsWindowEnabled($handle)) { throw 'WINDOW_DISABLED' }
  # Windows Forms' legacy accessibility proxy can block after control updates.
  # Its standard HWND controls have a bounded native protocol; custom/modern
  # windows continue through UI Automation patterns below. No global input.
  if ([AlicizationOwnedDesktop]::WindowClass($handle) -match '^WindowsForms10\.') {
    $titleText = [Text.StringBuilder]::new(512)
    [void][AlicizationOwnedDesktop]::GetWindowText($handle,$titleText,512)
    if ($lifeRequest.expectedWindowTitle -and $lifeRequest.expectedWindowTitle -cne $titleText.ToString()) { throw 'WINDOW_CONTEXT_CHANGED' }
    $nativeControls = [Collections.Generic.List[object]]::new()
    $callback = [AlicizationOwnedDesktop+EnumCallback]{ param($native,$unused)
      if ($nativeControls.Count -ge 120) { return $false }
      $class = [AlicizationOwnedDesktop]::WindowClass($native)
      if (![AlicizationOwnedDesktop]::IsWindowVisible($native) -or $class -notmatch '^WindowsForms10\.(EDIT|BUTTON|STATIC|COMBOBOX)\.') { return $true }
      $role = if ($class -match '\.EDIT\.') { 'input' } elseif ($class -match '\.BUTTON\.') { 'button' } elseif ($class -match '\.COMBOBOX\.') { 'select' } else { 'text' }
      $style = [AlicizationOwnedDesktop]::GetWindowLong($native,-16)
      if($role -eq 'button'){if(($style -band 15) -in @(2,3,6)){$role='checkbox'}elseif(($style -band 15) -in @(4,9)){$role='radio'}elseif(($style -band 15) -eq 7){$role='text'}}
      $password = $role -eq 'input' -and ($style -band 32)
      $caption = [Text.StringBuilder]::new(512)
      [void][AlicizationOwnedDesktop]::GetWindowText($native,$caption,512)
      $descriptor=@{runtimeId=('hwnd:'+$native.ToInt64());nativeId=$native.ToInt64().ToString();className=$class;automationId=$native.ToInt64().ToString();name=if($role -eq 'input') { '' } else { $caption.ToString() };role=$role;enabled=[AlicizationOwnedDesktop]::IsWindowEnabled($native);password=[bool]$password;readOnly=[bool]($role -eq 'input' -and ($style -band 2048));value=if($role -eq 'input' -and !$password){[AlicizationOwnedDesktop]::EditText($native)}elseif($role -eq 'select'){$caption.ToString()}else{$null}}
      if($role -eq 'select') {
        $descriptor.options=@([AlicizationOwnedDesktop]::ComboItems($native))
        $selected=[AlicizationOwnedDesktop]::ComboIndex($native)
        if($selected -lt -1 -or $selected -ge $descriptor.options.Count){throw 'SELECT_OPTIONS_CHANGED'}
        $descriptor.value=if($selected -ge 0){$descriptor.options[$selected]}else{$null}
      }
      $nativeControls.Add($descriptor)
      return $true
    }
    [void][AlicizationOwnedDesktop]::EnumChildWindows($handle,$callback,[IntPtr]::Zero)
    if ($lifeRequest.operation -eq 'observe') {
      @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;processStartTicks=$lifeProcessStartTicks;windowClass=$lifeWindowClass;desktop=$desktop;focusWindowId=([AlicizationOwnedDesktop]::ForegroundFocus($handle));title=$titleText.ToString();provider='bounded-standard-hwnd';elements=$nativeControls.ToArray();coordinateSpace=$lifeCoordinateSpace;windowVisible=([AlicizationOwnedDesktop]::IsWindowVisible($handle) -and ![AlicizationOwnedDesktop]::IsIconic($handle));windowBounds=@{left=$lifeBounds[0];top=$lifeBounds[1];width=$lifeBounds[2];height=$lifeBounds[3]}} | ConvertTo-Json -Depth 8 -Compress
      exit
    }
    foreach($expectedInput in @($lifeRequest.expectedInputs)){if(!$expectedInput){continue};$match=@($nativeControls.ToArray()|Where-Object{$_.runtimeId -eq $expectedInput.runtimeId});if($match.Count -ne 1 -or $match[0].value -cne $expectedInput.value -or $match[0].enabled -ne $expectedInput.enabled){throw 'STALE_WINDOW_STATE'}}
    $targets = @($nativeControls.ToArray() | Where-Object { $_.runtimeId -eq $lifeRequest.expected.runtimeId })
    if ($targets.Count -ne 1) { throw 'STALE_ELEMENT' }
    $actual=$targets[0]
    foreach ($field in @('runtimeId','name','role','automationId','enabled','value','readOnly','password','nativeId','className')) { if($actual[$field] -cne $lifeRequest.expected.$field){throw 'STALE_ELEMENT'} }
    if($actual.role -eq 'select' -and (ConvertTo-Json -InputObject @($actual.options) -Compress) -cne (ConvertTo-Json -InputObject @($lifeRequest.expected.options) -Compress)){throw 'STALE_SELECT_OPTIONS'}
    if (!$actual.enabled) { throw 'ELEMENT_DISABLED' }
    $native=[IntPtr]::new([long]$actual.nativeId)
    if ([AlicizationOwnedDesktop]::GetAncestor($native,2) -ne $handle) { throw 'CONTROL_WINDOW_MISMATCH' }
    if ($lifeRequest.operation -eq 'type' -and $actual.role -eq 'select') {
      if($lifeRequest.submit -or !$lifeRequest.clearExisting){throw 'SELECT_REQUIRES_EXACT_REPLACEMENT'}
      $choices=@(for($index=0;$index -lt $actual.options.Count;$index++){if($actual.options[$index] -ceq [string]$lifeRequest.text){$index}})
      if($choices.Count -ne 1){throw 'AMBIGUOUS_OR_MISSING_SELECT_OPTION'}
      Assert-LifeDispatch; $lifeDispatched=$true
      [AlicizationOwnedDesktop]::SelectCombo($native,[int]$choices[0],[string[]]$actual.options)
    }
    elseif ($lifeRequest.operation -eq 'type' -and $actual.role -eq 'input' -and !$actual.readOnly) {
      if($lifeRequest.submit){throw 'EXPLICIT_SUBMIT_CONTROL_REQUIRED'}
      if($actual.password -and !$lifeRequest.clearExisting){throw 'PASSWORD_INPUT_REQUIRES_EXPLICIT_CLEAR'}
      $previous=if($lifeRequest.clearExisting){''}else{[AlicizationOwnedDesktop]::EditText($native)}
      Assert-LifeDispatch; $lifeDispatched=$true
      [AlicizationOwnedDesktop]::SetEditText($native,($previous+[string]$lifeRequest.text))
    }
    elseif($lifeRequest.operation -eq 'click' -and $actual.role -in @('button','checkbox','radio')){Assert-LifeDispatch; $lifeDispatched=$true;[AlicizationOwnedDesktop]::ClickButton($native)}
    else{throw 'ACTION_PATTERN_UNAVAILABLE'}
    @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;processStartTicks=$lifeProcessStartTicks;windowClass=$lifeWindowClass;desktop=$desktop;focusWindowId=([AlicizationOwnedDesktop]::ForegroundFocus($handle));title=$titleText.ToString();target=$actual.runtimeId;provider='bounded-standard-hwnd';requiresReadback=$true}|ConvertTo-Json -Compress
    exit
  }
  # FromHandle is deliberate: never inspect the active desktop's global root.
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  $lifeBounds = [AlicizationOwnedDesktop]::Bounds($handle)
  if ($lifeRequest.expectedWindowTitle -and $lifeRequest.expectedWindowTitle -cne $root.Current.Name) { throw 'WINDOW_CONTEXT_CHANGED' }
  $controls = @(Get-LifeControls $root)
  if ($lifeRequest.operation -eq 'observe') {
    $descriptors = @($controls | ForEach-Object { Get-LifeDescriptor $_ })
    @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;processStartTicks=$lifeProcessStartTicks;windowClass=$lifeWindowClass;desktop=$desktop;focusWindowId=([AlicizationOwnedDesktop]::ForegroundFocus($handle));title=$root.Current.Name;elements=$descriptors;coordinateSpace=$lifeCoordinateSpace;windowVisible=([AlicizationOwnedDesktop]::IsWindowVisible($handle) -and ![AlicizationOwnedDesktop]::IsIconic($handle));windowBounds=@{left=$lifeBounds[0];top=$lifeBounds[1];width=$lifeBounds[2];height=$lifeBounds[3]}} | ConvertTo-Json -Depth 8 -Compress
    exit
  }
  foreach($expectedInput in @($lifeRequest.expectedInputs)){if(!$expectedInput){continue};$match=@($controls|Where-Object{($_.GetRuntimeId()-join ':') -eq $expectedInput.runtimeId});if($match.Count -ne 1){throw 'STALE_WINDOW_STATE'};$descriptor=Get-LifeDescriptor $match[0];if($descriptor.value -cne $expectedInput.value -or $descriptor.enabled -ne $expectedInput.enabled){throw 'STALE_WINDOW_STATE'}}
  $targets = @($controls | Where-Object { ($_.GetRuntimeId() -join ':') -eq $lifeRequest.expected.runtimeId })
  if ($targets.Count -ne 1) { throw 'STALE_ELEMENT' }
  $target = $targets[0]
  if ((Get-LifeContainingWindow $target) -ne $handle) { throw 'CONTROL_WINDOW_MISMATCH' }
  $actual = Get-LifeDescriptor $target
  foreach ($field in @('runtimeId','name','role','automationId','enabled','value','readOnly','password','nativeId','className')) {
    if ($actual[$field] -cne $lifeRequest.expected.$field) { throw 'STALE_ELEMENT' }
  }
  if ($actual.role -eq 'select' -and ($actual.optionsComplete -cne $lifeRequest.expected.optionsComplete -or (ConvertTo-Json -InputObject @($actual.options) -Compress) -cne (ConvertTo-Json -InputObject @($lifeRequest.expected.options) -Compress))) { throw 'STALE_SELECT_OPTIONS' }
  if (!$actual.enabled) { throw 'ELEMENT_DISABLED' }
  $native = [IntPtr]::new([long]$actual.nativeId)
  if ($native -ne [IntPtr]::Zero -and [AlicizationOwnedDesktop]::GetAncestor($native,2) -ne $handle) { throw 'CONTROL_WINDOW_MISMATCH' }
  if ($lifeRequest.operation -eq 'scroll') {
    if (!$actual.scroll -or !$actual.scroll.verticalScrollable) { throw 'SCROLL_PATTERN_UNAVAILABLE' }
    foreach ($field in @('verticalPercent','horizontalPercent','verticalViewSize','horizontalViewSize','verticalScrollable','horizontalScrollable')) {
      if ($null -eq $lifeRequest.expected.scroll -or $actual.scroll[$field] -cne $lifeRequest.expected.scroll.$field) {
        $script:lifeScrollMismatch = @{field=$field;expected=$lifeRequest.expected.scroll.$field;actual=$actual.scroll[$field]}
        throw 'STALE_SCROLL_STATE'
      }
    }
    if ($lifeRequest.action -cnotin @('up','down','top','bottom') -or $lifeRequest.amount -cnotin @('small','large')) { throw 'INVALID_SCROLL' }
    $pattern = $null
    if (!$target.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern,[ref]$pattern)) { throw 'SCROLL_PATTERN_UNAVAILABLE' }
    $before = [double]$actual.scroll.verticalPercent
    Assert-LifeDispatch; $lifeDispatched=$true
    if ($lifeRequest.action -in @('top','bottom')) {
      $percent = if ($lifeRequest.action -ceq 'top') { 0.0 } else { 100.0 }
      $pattern.SetScrollPercent([System.Windows.Automation.ScrollPattern]::NoScroll,$percent)
    } else {
      $step = if ($lifeRequest.amount -ceq 'small') {
        if ($lifeRequest.action -ceq 'up') { [System.Windows.Automation.ScrollAmount]::SmallDecrement } else { [System.Windows.Automation.ScrollAmount]::SmallIncrement }
      } else {
        if ($lifeRequest.action -ceq 'up') { [System.Windows.Automation.ScrollAmount]::LargeDecrement } else { [System.Windows.Automation.ScrollAmount]::LargeIncrement }
      }
      $pattern.Scroll([System.Windows.Automation.ScrollAmount]::NoAmount,$step)
    }
    # Observe this one dispatch; never replay a scroll after a delayed provider.
    $watch = [Diagnostics.Stopwatch]::StartNew()
    do {
      $after = [double]$pattern.Current.VerticalScrollPercent
      if ($after -ne $before) { break }
      Start-Sleep -Milliseconds 20
    } while ($watch.ElapsedMilliseconds -lt 500)
    if (($lifeRequest.action -in @('up','top') -and $after -gt $before) -or ($lifeRequest.action -in @('down','bottom') -and $after -lt $before)) { throw 'SCROLL_READBACK_CHANGED' }
    @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;processStartTicks=$lifeProcessStartTicks;windowClass=$lifeWindowClass;desktop=$desktop;title=$root.Current.Name;target=$actual.runtimeId;beforePercent=$before;afterPercent=$after;scrollChanged=($before -ne $after);requiresReadback=$true;foregroundChanged=$false} | ConvertTo-Json -Depth 5 -Compress
    exit
  }
  if ($lifeRequest.operation -eq 'type') {
    if ($actual.role -eq 'select') {
      if ($lifeRequest.submit -or !$lifeRequest.clearExisting) { throw 'SELECT_REQUIRES_EXACT_REPLACEMENT' }
      # WPF selection peers can focus their owner even without opening it.
      # Inactive Win32 desktops cannot activate the user's input desktop.
      $script:lifeForegroundRequired = [AlicizationOwnedDesktop]::IsInputDesktop()
      $selectionItems = Get-LifeSelectItems $target
      $choices = @($selectionItems.items | Where-Object { $_.Current.Name -ceq [string]$lifeRequest.text })
      if ($choices.Count -ne 1) { throw 'AMBIGUOUS_OR_MISSING_SELECT_OPTION' }
      if (!$choices[0].Current.IsEnabled) { throw 'ELEMENT_DISABLED' }
      $selection = $null
      if (!$choices[0].TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern,[ref]$selection)) { throw 'SELECTION_PATTERN_UNAVAILABLE' }
      $container = $selection.Current.SelectionContainer
      if ($choices[0].Current.ProcessId -ne $ownerProcess -or !$container -or ($container.GetRuntimeId() -join ':') -cne $actual.runtimeId) { throw 'SELECT_CONTAINER_CHANGED' }
      Assert-LifeDispatch; $lifeDispatched=$true
      $selection.Select()
      Assert-LifeDispatch
      if (!$selection.Current.IsSelected) { throw 'SELECTION_NOT_OBSERVED' }
      @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;processStartTicks=$lifeProcessStartTicks;windowClass=$lifeWindowClass;desktop=$desktop;title=$root.Current.Name;target=$actual.runtimeId;requiresReadback=$true} | ConvertTo-Json -Depth 5 -Compress
      exit
    }
    $pattern = $null
    $hasPattern = $target.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern)
    if ($actual.readOnly) { throw 'VALUE_PATTERN_UNAVAILABLE' }
    if (!$hasPattern -and ($actual.role -ne 'input' -or $actual.className -notmatch '(?i)edit')) { throw 'VALUE_PATTERN_UNAVAILABLE' }
    if ($lifeRequest.submit) { throw 'EXPLICIT_SUBMIT_CONTROL_REQUIRED' }
    if ($actual.password -and !$lifeRequest.clearExisting) { throw 'PASSWORD_INPUT_REQUIRES_EXPLICIT_CLEAR' }
    $previousText = if($lifeRequest.clearExisting){''} elseif ($hasPattern) { [string]$pattern.Current.Value } else { [AlicizationOwnedDesktop]::EditText($native) }
    $value = if ($lifeRequest.clearExisting) { [string]$lifeRequest.text } else { $previousText + [string]$lifeRequest.text }
    Assert-LifeDispatch; $lifeDispatched=$true
    if ($hasPattern) { $pattern.SetValue($value) } else { [AlicizationOwnedDesktop]::SetEditText($native,$value) }
    Assert-LifeDispatch
    [AlicizationOwnedDesktop]::NotifyComboEditChanged($native,$handle)
  }
  elseif ($lifeRequest.operation -eq 'click') {
    # WPF menu/dropdown peers can activate their owner even with NOACTIVATE.
    # Check the existing foreground before any pattern call; do not acquire it.
    $script:lifeForegroundRequired = $actual.role -in @('menu-item','select')
    Assert-LifeDispatch
    $pattern = $null
    if ($target.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) { Assert-LifeDispatch; $lifeDispatched=$true; $pattern.Invoke() }
    elseif ($target.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern,[ref]$pattern)) { Assert-LifeDispatch; $lifeDispatched=$true; $pattern.Toggle() }
    elseif ($target.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern,[ref]$pattern)) { Assert-LifeDispatch; $lifeDispatched=$true; $pattern.Select() }
    elseif ($target.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern,[ref]$pattern)) { Expand-LifeControl $pattern }
    elseif ($actual.className -match '(?i)button') { Assert-LifeDispatch; $lifeDispatched=$true; [AlicizationOwnedDesktop]::ClickButton($native) }
    else { throw 'ACTION_PATTERN_UNAVAILABLE' }
  }
  else { throw 'UNKNOWN_OPERATION' }
  Assert-LifeDispatch
  @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;processStartTicks=$lifeProcessStartTicks;windowClass=$lifeWindowClass;desktop=$desktop;focusWindowId=([AlicizationOwnedDesktop]::ForegroundFocus($handle));title=$root.Current.Name;target=$actual.runtimeId;requiresReadback=$true} | ConvertTo-Json -Depth 5 -Compress
}
catch {
  $failure = @{ok=$false;errorCode=('WINDOWS_UIA_'+$_.Exception.Message);errorMessage=$_.Exception.Message;effectMayHaveOccurred=$lifeDispatched;sideEffectState=if($lifeDispatched){'unknown'}else{'none'}}
  if ($_.Exception.Message -ceq 'FOREGROUND_REQUIRED') { $failure.requiresForeground = $true }
  if ($_.Exception.Message -ceq 'AMBIGUOUS_WINDOW') { $failure.matchedWindows = $script:lifeAmbiguousWindows }
  if ($script:lifeScrollMismatch) { $failure.scrollStateMismatch = $script:lifeScrollMismatch }
  $failure | ConvertTo-Json -Depth 4 -Compress
}
