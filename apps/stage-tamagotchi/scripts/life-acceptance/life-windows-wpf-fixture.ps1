[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$fixture = [Console]::In.ReadLine() | ConvertFrom-Json
Add-Type -AssemblyName PresentationFramework
$form = [Windows.Window]::new()
$form.Title = 'Alicization QA Native Notes'
$form.Width = 520
$form.Height = 280
$panel = [Windows.Controls.StackPanel]::new()
$panel.Margin = [Windows.Thickness]::new(20)
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
[void]$panel.Children.Add($save)
[void]$panel.Children.Add($status)
[void]$panel.Children.Add($change)
$form.Content = $panel
$form.Show()
$handle = [Windows.Interop.WindowInteropHelper]::new($form).Handle
[Console]::WriteLine((@{ready=$true;windowId=$handle.ToInt64().ToString();title=$form.Title} | ConvertTo-Json -Compress))
$app = [Windows.Application]::new()
[void]$app.Run($form)
