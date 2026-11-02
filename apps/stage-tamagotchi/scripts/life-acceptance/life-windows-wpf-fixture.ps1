[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$fixture = [Console]::In.ReadLine() | ConvertFrom-Json
Add-Type -AssemblyName PresentationFramework
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AlicizationFixturePopup {
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr window,uint relation);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr window);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
}
'@
$form = [Windows.Window]::new()
$form.Title = 'Alicization QA Native Notes'
$form.Width = 520
$form.Height = 420
$panel = [Windows.Controls.StackPanel]::new()
$panel.Margin = [Windows.Thickness]::new(20)
$menu = [Windows.Controls.Menu]::new()
$fileMenu = [Windows.Controls.MenuItem]::new()
$fileMenu.Header = '文件菜单'
[Windows.Automation.AutomationProperties]::SetName($fileMenu,'文件菜单')
$fileMenu.Add_SubmenuOpened({ param($sender,$eventArgs) [IO.File]::AppendAllText(($fixture.path + '.menu-events.txt'),("opened=" + $sender.IsSubmenuOpen + ";capture=" + ([Windows.Input.Mouse]::Captured -eq $menu) + ";active=" + $form.IsActive + "`n"),[Text.UTF8Encoding]::new($false)) })
$fileMenu.Add_SubmenuClosed({ [IO.File]::AppendAllText(($fixture.path + '.menu-events.txt'),"closed`n",[Text.UTF8Encoding]::new($false)) })
$menuAction = [Windows.Controls.MenuItem]::new()
$menuAction.Header = '写入菜单标记'
[Windows.Automation.AutomationProperties]::SetName($menuAction,'写入菜单标记')
$menuAction.Add_Click({ [IO.File]::WriteAllText(($fixture.path + '.menu.txt'),'actual WPF menu action',[Text.UTF8Encoding]::new($false)) })
[void]$fileMenu.Items.Add($menuAction)
[void]$menu.Items.Add($fileMenu)
[void]$panel.Children.Add($menu)
$entry = [Windows.Controls.TextBox]::new()
$entry.AcceptsReturn = $true
$entry.Height = 70
[Windows.Automation.AutomationProperties]::SetName($entry,'QA输入')
$save = [Windows.Controls.Button]::new()
$save.Content = '保存'
$save.Height = 35
[Windows.Automation.AutomationProperties]::SetName($save,'保存')
$status = [Windows.Controls.TextBlock]::new()
$status.Text = '未保存'
$change = [Windows.Controls.Button]::new()
$change.Content = '改变动作含义'
[Windows.Automation.AutomationProperties]::SetName($change,'改变动作含义')
$save.Add_Click({
  if ($fixture.conflict -and [IO.File]::Exists($fixture.path)) {
    $dialog = [Windows.Window]::new()
    $dialog.Owner = $form
    $dialog.Title = 'Alicization QA File Conflict'
    $dialog.Width = 390
    $dialog.Height = 180
    $choices = [Windows.Controls.StackPanel]::new()
    $choices.Margin = [Windows.Thickness]::new(20)
    $notice = [Windows.Controls.TextBlock]::new()
    $notice.Text = '测试文件已存在，覆盖前请确认。'
    $confirm = [Windows.Controls.Button]::new()
    $confirm.Content = '确认覆盖测试文件'
    [Windows.Automation.AutomationProperties]::SetName($confirm,'确认覆盖测试文件')
    $cancel = [Windows.Controls.Button]::new()
    $cancel.Content = '取消'
    [Windows.Automation.AutomationProperties]::SetName($cancel,'取消')
    $confirm.Add_Click({
      [IO.File]::WriteAllText($fixture.path,$entry.Text,[Text.UTF8Encoding]::new($false))
      $status.Text = '已保存'
      $dialog.Close()
    }.GetNewClosure())
    $cancel.Add_Click({ $status.Text = '已取消'; $dialog.Close() }.GetNewClosure())
    $dialog.Add_Closed({ $form.IsEnabled = $true }.GetNewClosure())
    [void]$choices.Children.Add($notice)
    [void]$choices.Children.Add($confirm)
    [void]$choices.Children.Add($cancel)
    $dialog.Content = $choices
    $form.IsEnabled = $false
    $dialog.Show()
    return
  }
  [IO.File]::WriteAllText($fixture.path,$entry.Text,[Text.UTF8Encoding]::new($false))
  $status.Text = '已保存'
})
$change.Add_Click({ $save.Content = '删除'; [Windows.Automation.AutomationProperties]::SetName($save,'删除') })
[void]$panel.Children.Add($entry)
$sort = [Windows.Controls.ComboBox]::new()
[Windows.Automation.AutomationProperties]::SetName($sort,'QA分类方式')
foreach ($label in @('按名称','按类型','中文🙂')) {
  $option = [Windows.Controls.ComboBoxItem]::new()
  $option.Content = $label
  [Windows.Automation.AutomationProperties]::SetName($option,$label)
  [void]$sort.Items.Add($option)
}
$sort.SelectedIndex = 0
$sort.Add_SelectionChanged({ [IO.File]::WriteAllText(($fixture.path + '.selection.txt'),[string]$sort.SelectedItem.Content,[Text.UTF8Encoding]::new($false)) })
[void]$panel.Children.Add($sort)
$replaceOption = [Windows.Controls.Button]::new()
$replaceOption.Content = '改变分类选项'
[Windows.Automation.AutomationProperties]::SetName($replaceOption,'改变分类选项')
$replaceOption.Add_Click({
  $option = $sort.Items[0]
  $option.Content = '按日期'
  [Windows.Automation.AutomationProperties]::SetName($option,'按日期')
  [IO.File]::WriteAllText(($fixture.path + '.option-change.txt'),[string]$option.Content,[Text.UTF8Encoding]::new($false))
})
[void]$panel.Children.Add($replaceOption)
$reader = [Windows.Controls.ScrollViewer]::new()
$reader.Height = 75
$reader.VerticalScrollBarVisibility = [Windows.Controls.ScrollBarVisibility]::Auto
[Windows.Automation.AutomationProperties]::SetName($reader,'QA阅读区域')
[Windows.Automation.AutomationProperties]::SetAutomationId($reader,'qa-reader')
$lines = [Windows.Controls.StackPanel]::new()
for ($line = 1; $line -le 20; $line++) {
  $label = [Windows.Controls.TextBlock]::new()
  $label.Text = '可读行 ' + $line
  $label.Height = 30
  [void]$lines.Children.Add($label)
}
$reader.Content = $lines
$reader.Add_ScrollChanged({
  @{offset=$reader.VerticalOffset;extent=$reader.ExtentHeight;viewport=$reader.ViewportHeight} | ConvertTo-Json -Compress | Set-Content -LiteralPath ($fixture.path + '.viewport.json') -Encoding UTF8
})
[void]$panel.Children.Add($reader)
[void]$panel.Children.Add($save)
[void]$panel.Children.Add($status)
[void]$panel.Children.Add($change)
$form.Content = $panel
$menuDiagnostic = [Windows.Threading.DispatcherTimer]::new()
$menuDiagnostic.Interval = [TimeSpan]::FromMilliseconds(100)
$menuDiagnostic.Add_Tick({
  try {
    $source = [Windows.PresentationSource]::FromVisual($menuAction)
    $popupHandle = if ($source) { $source.Handle } else { [IntPtr]::Zero }
    @{open=$fileMenu.IsSubmenuOpen;visible=$menuAction.IsVisible;windowId=$popupHandle.ToInt64().ToString();nativeVisible=[AlicizationFixturePopup]::IsWindowVisible($popupHandle);ownerWindowId=[AlicizationFixturePopup]::GetWindow($popupHandle,4).ToInt64().ToString();parentWindowId=[AlicizationFixturePopup]::GetParent($popupHandle).ToInt64().ToString()} | ConvertTo-Json -Compress | Set-Content -LiteralPath ($fixture.path + '.menu-snapshot.json') -Encoding UTF8
  } catch {
    [IO.File]::WriteAllText(($fixture.path + '.menu-snapshot-error.txt'),$_.Exception.Message,[Text.UTF8Encoding]::new($false))
  }
})
$menuDiagnostic.Start()
$form.Add_Closed({ $menuDiagnostic.Stop() })
$stopTimer = $null
if ($fixture.stopPath) {
  $stopTimer = [Windows.Threading.DispatcherTimer]::new()
  $stopTimer.Interval = [TimeSpan]::FromMilliseconds(100)
  $stopTimer.Add_Tick({ if ([IO.File]::Exists($fixture.stopPath)) { $stopTimer.Stop(); $form.Close() } })
  $stopTimer.Start()
}
$form.Show()
$handle = [Windows.Interop.WindowInteropHelper]::new($form).Handle
[Console]::WriteLine((@{ready=$true;windowId=$handle.ToInt64().ToString();title=$form.Title} | ConvertTo-Json -Compress))
$app = [Windows.Application]::new()
[void]$app.Run($form)
