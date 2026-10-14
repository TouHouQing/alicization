[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$fixture = [Console]::In.ReadLine() | ConvertFrom-Json
Add-Type -AssemblyName System.Windows.Forms
$form = [Windows.Forms.Form]::new()
$form.Text = 'Alicization QA Native Notes'
$form.Width = 520
$form.Height = 280
$entry = [Windows.Forms.TextBox]::new()
$entry.Name = 'entry'
$entry.AccessibleName = 'QA输入'
$entry.SetBounds(20,20,450,60)
$entry.Multiline = $true
$save = [Windows.Forms.Button]::new()
$save.Name = 'save'
$save.AccessibleName = '保存'
$save.Text = '保存'
$save.SetBounds(20,100,120,35)
$status = [Windows.Forms.Label]::new()
$status.Name = 'status'
$status.Text = '未保存'
$status.SetBounds(20,160,450,35)
$change = [Windows.Forms.Button]::new()
$change.Name = 'change'
$change.AccessibleName = '改变动作含义'
$change.Text = '改变动作含义'
$change.SetBounds(180,100,170,35)
$save.Add_Click({
  [IO.File]::WriteAllText($fixture.path,$entry.Text,[Text.UTF8Encoding]::new($false))
  $status.Text = '已保存'
})
$change.Add_Click({ $save.Text = '删除'; $save.AccessibleName = '删除' })
$form.Controls.AddRange(@($entry,$save,$status,$change))
$form.Show()
[Console]::WriteLine((@{ready=$true;windowId=$form.Handle.ToInt64().ToString();title=$form.Text} | ConvertTo-Json -Compress))
[Windows.Forms.Application]::Run($form)
