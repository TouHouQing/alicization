[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$fixture=[Console]::In.ReadLine()|ConvertFrom-Json
Add-Type -AssemblyName System.Windows.Forms
$form=[Windows.Forms.Form]::new()
$form.Text='Alicization QA Save Owner '+$fixture.nonce
$form.ShowInTaskbar=$false
$form.Width=380
$form.Height=180
$open=[Windows.Forms.Button]::new()
$open.Text='Open real Save As'
$open.Width=250
$form.Controls.Add($open)
$script:round=0
$script:dialog=$null
$openTimer=[Windows.Forms.Timer]::new()
$openTimer.Interval=60
$open.Add_Click({$openTimer.Start()})
$openTimer.Add_Tick({
  $openTimer.Stop()
  $script:round++
  $script:dialog=[Windows.Forms.SaveFileDialog]::new()
  $script:dialog.Title='Alicization QA Real Save '+$fixture.nonce
  $script:dialog.InitialDirectory=$fixture.root
  $script:dialog.FileName='initial-'+$script:round+'.txt'
  $script:dialog.Filter='Text files (*.txt)|*.txt'
  $script:dialog.DefaultExt='txt'
  $script:dialog.AddExtension=$true
  $script:dialog.OverwritePrompt=$true
  $script:dialog.RestoreDirectory=$true
  $answer=$script:dialog.ShowDialog($form)
  $saved=$answer -eq [Windows.Forms.DialogResult]::OK
  if($saved){
    $target=[IO.Path]::GetFullPath($script:dialog.FileName)
    if([IO.Path]::GetDirectoryName($target) -cne [IO.Path]::GetFullPath($fixture.root)){throw 'Fixture output escaped its owned directory'}
    [IO.File]::WriteAllText($target,('actual native dialog '+$script:round+' '+$fixture.nonce+' 中文🙂'),[Text.UTF8Encoding]::new($false))
  }
  [IO.File]::WriteAllText((Join-Path $fixture.root ('dialog-result-'+$script:round+'.json')),(@{round=$script:round;saved=$saved;file=$script:dialog.FileName}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
  $script:dialog.Dispose()
  $script:dialog=$null
})
$stopTimer=[Windows.Forms.Timer]::new()
$stopTimer.Interval=100
$stopTimer.Add_Tick({
  if([IO.File]::Exists($fixture.stopPath)){
    $stopTimer.Stop()
    if($script:dialog){$script:dialog.Dispose()}
    $form.Close()
  }
})
$stopTimer.Start()
$form.Show()
[Console]::WriteLine((@{ready=$true;windowId=$form.Handle.ToInt64().ToString();processId=$PID;nonce=$fixture.nonce}|ConvertTo-Json -Compress))
[Windows.Forms.Application]::Run($form)
$openTimer.Dispose()
$stopTimer.Dispose()
$form.Dispose()
