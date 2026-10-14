$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AlicizationOwnedDesktop {
  [StructLayout(LayoutKind.Sequential)] public struct WindowRect { public int left, top, right, bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr handle, out WindowRect rect);
  public static int[] Bounds(IntPtr handle) { WindowRect rect; if (!GetWindowRect(handle, out rect)) throw new Exception("WINDOW_BOUNDS_UNAVAILABLE"); return new int[] { rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top }; }
  public delegate bool EnumCallback(IntPtr hwnd, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumCallback callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hwnd, EnumCallback callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hwnd, uint relationship);
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
  public static void SetEditText(IntPtr hwnd,string value) { IntPtr result; if (TextMessage(hwnd,12,IntPtr.Zero,value,2,2000,out result)==IntPtr.Zero || result==IntPtr.Zero) throw new InvalidOperationException("CONTROL_WRITE_FAILED"); }
  public static void ClickButton(IntPtr hwnd) { IntPtr result; if (SimpleMessage(hwnd,245,IntPtr.Zero,IntPtr.Zero,2,2000,out result)==IntPtr.Zero) throw new InvalidOperationException("CONTROL_CLICK_TIMEOUT"); }
  public static int CheckState(IntPtr hwnd) { IntPtr result; SimpleMessage(hwnd,240,IntPtr.Zero,IntPtr.Zero,2,2000,out result); return result.ToInt32(); }
  public static string DesktopName(IntPtr handle) { var value = new StringBuilder(256); uint needed; if (!GetUserObjectInformation(handle, 2, value, 512, out needed)) throw new InvalidOperationException("Cannot identify desktop"); return value.ToString(); }
  public static string CurrentDesktop() { return DesktopName(GetThreadDesktop(GetCurrentThreadId())); }
}
'@
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
function Get-LifeDescriptor($element) {
  $native = [IntPtr]::new($element.Current.NativeWindowHandle)
  $class = [AlicizationOwnedDesktop]::WindowClass($native)
  $role = Get-LifeRole $element
  $password = $element.Current.IsPassword -or ($role -eq 'input' -and ([AlicizationOwnedDesktop]::GetWindowLong($native,-16) -band 32))
  $valuePattern = $null
  $hasValue = $element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)
  $value = if ($hasValue -and !$password) { $valuePattern.Current.Value } elseif ($role -eq 'input' -and !$password -and $class -match '(?i)edit') { [AlicizationOwnedDesktop]::EditText($native) } elseif ($role -in @('checkbox','radio')) { [AlicizationOwnedDesktop]::CheckState($native).ToString() } else { $null }
  return @{ runtimeId=($element.GetRuntimeId() -join ':'); name=$element.Current.Name; role=$role; automationId=$element.Current.AutomationId; enabled=$element.Current.IsEnabled; value=$value; password=[bool]$password; readOnly=(($hasValue -and $valuePattern.Current.IsReadOnly) -or ($role -eq 'input' -and ($class -match '(?i)edit') -and ([AlicizationOwnedDesktop]::GetWindowLong($native,-16) -band 2048))); nativeId=$native.ToInt64().ToString(); className=$class }
}
$lifeDispatched = $false
try {
  $desktop = [AlicizationOwnedDesktop]::CurrentDesktop()
  if ($env:LIFE_QA_PRIVATE_DESKTOP -and $desktop -ne $env:LIFE_QA_PRIVATE_DESKTOP) { throw 'PRIVATE_DESKTOP_MISMATCH' }
  $handle = [IntPtr]::Zero
  if ($lifeRequest.windowId) {
    $handle = [IntPtr]::new([long]$lifeRequest.windowId)
  }
  elseif ($lifeRequest.windowTitle) {
    $lifeMatches = [Collections.Generic.List[IntPtr]]::new()
    $callback = [AlicizationOwnedDesktop+EnumCallback]{ param($candidate,$unused)
      $title = [Text.StringBuilder]::new(512)
      [void][AlicizationOwnedDesktop]::GetWindowText($candidate,$title,512)
      if ([AlicizationOwnedDesktop]::IsWindowVisible($candidate) -and $title.ToString() -eq $lifeRequest.windowTitle) { $lifeMatches.Add($candidate) }
      return $true
    }
    [void][AlicizationOwnedDesktop]::EnumWindows($callback,[IntPtr]::Zero)
    if ($lifeMatches.Count -ne 1) { throw 'AMBIGUOUS_WINDOW' }
    $handle = $lifeMatches[0]
  }
  else { $handle = [AlicizationOwnedDesktop]::GetForegroundWindow() }
  if ($handle -eq [IntPtr]::Zero) { throw 'WINDOW_NOT_FOUND' }
  $ownerProcess = [uint32]0
  $thread = [AlicizationOwnedDesktop]::GetWindowThreadProcessId($handle,[ref]$ownerProcess)
  if ($thread -eq 0 -or [AlicizationOwnedDesktop]::DesktopName([AlicizationOwnedDesktop]::GetThreadDesktop($thread)) -ne $desktop) { throw 'WINDOW_DESKTOP_MISMATCH' }
  if ($lifeRequest.processId -and [uint32]$lifeRequest.processId -ne $ownerProcess) { throw 'WINDOW_IDENTITY_CHANGED' }
  # GW_OWNER is read from this exact native window; unrelated popups never join its proof chain.
  $lifeOwnerWindow = [AlicizationOwnedDesktop]::GetWindow($handle,4)
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
      if (![AlicizationOwnedDesktop]::IsWindowVisible($native) -or $class -notmatch '^WindowsForms10\.(EDIT|BUTTON|STATIC)\.') { return $true }
      $role = if ($class -match '\.EDIT\.') { 'input' } elseif ($class -match '\.BUTTON\.') { 'button' } else { 'text' }
      $style = [AlicizationOwnedDesktop]::GetWindowLong($native,-16)
      if($role -eq 'button'){if(($style -band 15) -in @(2,3,6)){$role='checkbox'}elseif(($style -band 15) -in @(4,9)){$role='radio'}elseif(($style -band 15) -eq 7){$role='text'}}
      $password = $role -eq 'input' -and ($style -band 32)
      $caption = [Text.StringBuilder]::new(512)
      [void][AlicizationOwnedDesktop]::GetWindowText($native,$caption,512)
      $nativeControls.Add(@{runtimeId=('hwnd:'+$native.ToInt64());nativeId=$native.ToInt64().ToString();className=$class;automationId=$native.ToInt64().ToString();name=if($role -eq 'input') { '' } else { $caption.ToString() };role=$role;enabled=[AlicizationOwnedDesktop]::IsWindowEnabled($native);password=[bool]$password;readOnly=[bool]($role -eq 'input' -and ($style -band 2048));value=if($role -eq 'input' -and !$password){[AlicizationOwnedDesktop]::EditText($native)}else{$null}})
      return $true
    }
    [void][AlicizationOwnedDesktop]::EnumChildWindows($handle,$callback,[IntPtr]::Zero)
    if ($lifeRequest.operation -eq 'observe') {
      @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;desktop=$desktop;title=$titleText.ToString();provider='bounded-standard-hwnd';elements=$nativeControls.ToArray();windowBounds=@{left=$lifeBounds[0];top=$lifeBounds[1];width=$lifeBounds[2];height=$lifeBounds[3]}} | ConvertTo-Json -Depth 8 -Compress
      exit
    }
    foreach($expectedInput in @($lifeRequest.expectedInputs)){if(!$expectedInput){continue};$match=@($nativeControls.ToArray()|Where-Object{$_.runtimeId -eq $expectedInput.runtimeId});if($match.Count -ne 1 -or $match[0].value -cne $expectedInput.value -or $match[0].enabled -ne $expectedInput.enabled){throw 'STALE_WINDOW_STATE'}}
    $targets = @($nativeControls.ToArray() | Where-Object { $_.runtimeId -eq $lifeRequest.expected.runtimeId })
    if ($targets.Count -ne 1) { throw 'STALE_ELEMENT' }
    $actual=$targets[0]
    foreach ($field in @('runtimeId','name','role','automationId','enabled','value','readOnly','password','nativeId','className')) { if($actual[$field] -cne $lifeRequest.expected.$field){throw 'STALE_ELEMENT'} }
    if (!$actual.enabled) { throw 'ELEMENT_DISABLED' }
    $native=[IntPtr]::new([long]$actual.nativeId)
    if ([AlicizationOwnedDesktop]::GetAncestor($native,2) -ne $handle) { throw 'CONTROL_WINDOW_MISMATCH' }
    if ($lifeRequest.operation -eq 'type' -and $actual.role -eq 'input' -and !$actual.readOnly) {
      if($lifeRequest.submit){throw 'EXPLICIT_SUBMIT_CONTROL_REQUIRED'}
      if($actual.password -and !$lifeRequest.clearExisting){throw 'PASSWORD_INPUT_REQUIRES_EXPLICIT_CLEAR'}
      $previous=if($lifeRequest.clearExisting){''}else{[AlicizationOwnedDesktop]::EditText($native)}
      $lifeDispatched = $true
      [AlicizationOwnedDesktop]::SetEditText($native,($previous+[string]$lifeRequest.text))
    }
    elseif($lifeRequest.operation -eq 'click' -and $actual.role -in @('button','checkbox','radio')){$lifeDispatched=$true;[AlicizationOwnedDesktop]::ClickButton($native)}
    else{throw 'ACTION_PATTERN_UNAVAILABLE'}
    @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;desktop=$desktop;title=$titleText.ToString();target=$actual.runtimeId;provider='bounded-standard-hwnd';requiresReadback=$true}|ConvertTo-Json -Compress
    exit
  }
  # FromHandle is deliberate: never inspect the active desktop's global root.
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  $lifeBounds = [AlicizationOwnedDesktop]::Bounds($handle)
  if ($lifeRequest.expectedWindowTitle -and $lifeRequest.expectedWindowTitle -cne $root.Current.Name) { throw 'WINDOW_CONTEXT_CHANGED' }
  $controls = @(Get-LifeControls $root)
  if ($lifeRequest.operation -eq 'observe') {
    $descriptors = @($controls | ForEach-Object { Get-LifeDescriptor $_ })
    @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;desktop=$desktop;title=$root.Current.Name;elements=$descriptors;windowBounds=@{left=$lifeBounds[0];top=$lifeBounds[1];width=$lifeBounds[2];height=$lifeBounds[3]}} | ConvertTo-Json -Depth 8 -Compress
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
  if (!$actual.enabled) { throw 'ELEMENT_DISABLED' }
  $native = [IntPtr]::new([long]$actual.nativeId)
  if ($native -ne [IntPtr]::Zero -and [AlicizationOwnedDesktop]::GetAncestor($native,2) -ne $handle) { throw 'CONTROL_WINDOW_MISMATCH' }
  if ($lifeRequest.operation -eq 'type') {
    $pattern = $null
    $hasPattern = $target.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern)
    if ($actual.readOnly) { throw 'VALUE_PATTERN_UNAVAILABLE' }
    if (!$hasPattern -and ($actual.role -ne 'input' -or $actual.className -notmatch '(?i)edit')) { throw 'VALUE_PATTERN_UNAVAILABLE' }
    if ($lifeRequest.submit) { throw 'EXPLICIT_SUBMIT_CONTROL_REQUIRED' }
    if ($actual.password -and !$lifeRequest.clearExisting) { throw 'PASSWORD_INPUT_REQUIRES_EXPLICIT_CLEAR' }
    $previousText = if($lifeRequest.clearExisting){''} elseif ($hasPattern) { [string]$pattern.Current.Value } else { [AlicizationOwnedDesktop]::EditText($native) }
    $value = if ($lifeRequest.clearExisting) { [string]$lifeRequest.text } else { $previousText + [string]$lifeRequest.text }
    $lifeDispatched = $true
    if ($hasPattern) { $pattern.SetValue($value) } else { [AlicizationOwnedDesktop]::SetEditText($native,$value) }
  }
  elseif ($lifeRequest.operation -eq 'click') {
    $pattern = $null
    if ($target.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) { $lifeDispatched=$true; $pattern.Invoke() }
    elseif ($target.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern,[ref]$pattern)) { $lifeDispatched=$true; $pattern.Toggle() }
    elseif ($target.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern,[ref]$pattern)) { $lifeDispatched=$true; $pattern.Select() }
    elseif ($target.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern,[ref]$pattern)) { $lifeDispatched=$true; $pattern.Expand() }
    elseif ($actual.className -match '(?i)button') { $lifeDispatched=$true; [AlicizationOwnedDesktop]::ClickButton($native) }
    else { throw 'ACTION_PATTERN_UNAVAILABLE' }
  }
  else { throw 'UNKNOWN_OPERATION' }
  @{ok=$true;windowId=$handle.ToInt64().ToString();ownerWindowId=$lifeOwnerWindowId;processId=$ownerProcess;desktop=$desktop;title=$root.Current.Name;target=$actual.runtimeId;requiresReadback=$true} | ConvertTo-Json -Depth 5 -Compress
}
catch {
  @{ok=$false;errorCode=('WINDOWS_UIA_'+$_.Exception.Message);errorMessage=$_.Exception.Message;effectMayHaveOccurred=$lifeDispatched;sideEffectState=if($lifeDispatched){'unknown'}else{'none'}} | ConvertTo-Json -Compress
}
