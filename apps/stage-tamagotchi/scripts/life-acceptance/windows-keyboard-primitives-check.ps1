# Pure native primitives only. Never install hooks, observe a foreground
# window or inject input from this host-side compile/ownership check.
param([Parameter(Mandatory=$true)][string]$Output)
$ErrorActionPreference='Stop'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$target=[IO.Path]::GetFullPath($Output)
if(!$target.StartsWith((Join-Path $workspace 'output')+'\',[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($target) -ne '.json' -or [IO.File]::Exists($target)) { throw 'A fresh output JSON inside this workspace is required' }
$Root=Join-Path $workspace 'apps/stage-tamagotchi/src/main/services/alicization/execution'
$assembly=$target+'.exe'
if([IO.File]::Exists($assembly)) { throw 'Never overwrite a native check assembly' }
# Compile once before readiness. Each real participant loads these exact bytes;
# a second concurrent compiler is not part of the ownership handshake budget.
$nativeSources=@('native','shared-state','hook-policy','hooks','session','process','receipts')|ForEach-Object {Join-Path $Root ('windows-keyboard-'+$_+'.cs')}
Add-Type -Path $nativeSources -OutputAssembly $assembly -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll
[void][Reflection.Assembly]::LoadFrom($assembly)
$faultAssembly=$target+'.fault.exe'
if([IO.File]::Exists($faultAssembly)){throw 'Never overwrite a fault check assembly'}
$provider=[Microsoft.CSharp.CSharpCodeProvider]::new()
try {
  $parameters=[CodeDom.Compiler.CompilerParameters]::new()
  $parameters.GenerateExecutable=$true;$parameters.OutputAssembly=$faultAssembly
  $parameters.MainClass='AlicizationOwnedInputFaultHarness'
  $parameters.ReferencedAssemblies.AddRange([string[]]@('System.dll','System.Core.dll','System.Web.Extensions.dll'))
  $compiled=$provider.CompileAssemblyFromFile($parameters,[string[]]($nativeSources+@(Join-Path $PSScriptRoot 'windows-keyboard-fault-fixture.cs')))
  if($compiled.Errors.HasErrors){throw (($compiled.Errors|ForEach-Object {$_.ToString()}) -join "`n")}
} finally {$provider.Dispose()}
if ([Runtime.InteropServices.Marshal]::SizeOf([type][Alicization.WindowsInput.InputEvent]) -ne 40) { throw 'Invalid x64 INPUT layout' }
if ([Runtime.InteropServices.Marshal]::SizeOf([type][Alicization.WindowsInput.KeyboardEvent]) -ne 24) { throw 'Invalid x64 KEYBDINPUT layout' }
$checks=3
foreach($keys in @(@(0xA2,0x53),@(9),@(0xA0,9),@(27),@(0x5B,0x25),@(0xA2,0xA4,0x7B))) {
  $events=[Alicization.WindowsInput.Native]::BalancedBatch([int[]]$keys,[uint64]42)
  if ($events.Length -ne $keys.Count*2) { throw 'Unbalanced native array length' }
  $held=New-Object 'Collections.Generic.Stack[int]'
  foreach($event in $events) {
    if($event.Type -ne 1 -or $event.Data.Keyboard.ExtraInfo.ToUInt64() -ne 42) { throw 'Unexpected event type/owner tag' }
    if(($event.Data.Keyboard.Flags -band 2) -ne 0) {
      if($held.Pop() -ne $event.Data.Keyboard.VirtualKey) { throw 'Native key release order changed' }
    } else { $held.Push([int]$event.Data.Keyboard.VirtualKey) }
  }
  if($held.Count -ne 0) { throw 'Native batch stranded an owned key' }
  $checks++
}
foreach($case in @(@(0xA2,0xA2,0x53),@(0x53,0x54),@(0xA2),@(0xA2,0xA4,0x2E),@(0),@(255),@(0xA2,0xA4,0xA0,0x5B,0x53,0x54))) {
  $rejected=$false
  try { [void][Alicization.WindowsInput.Native]::BalancedBatch([int[]]$case,[uint64]42) } catch { $rejected=$true }
  if(!$rejected) { throw 'Native malformed chord was accepted' }
  $checks++
}
$rejected=$false
try { [void][Alicization.WindowsInput.Native]::BalancedBatch([int[]]@(0x53),[uint64]0) } catch { $rejected=$true }
if(!$rejected) { throw 'An unowned native tag was accepted' }
$checks++
$expected=New-Object Alicization.WindowsInput.Target
$expected.WindowId='123';$expected.ProcessId=44;$expected.ProcessStartTicks='638000000000000000';$expected.WindowClass='OwnedFixture';$expected.Desktop='OwnedDesktop';$expected.InputDesktop='OwnedDesktop';$expected.FocusWindowId='124';$expected.IntegrityLevel=8192
foreach($field in @('WindowId','ProcessId','ProcessStartTicks','WindowClass','Desktop','InputDesktop','FocusWindowId','IntegrityLevel')) {
  $actual=New-Object Alicization.WindowsInput.Target
  foreach($copy in $expected.GetType().GetFields()) { $copy.SetValue($actual,$copy.GetValue($expected)) }
  if($field -eq 'ProcessId') { $actual.ProcessId=45 }
  elseif($field -eq 'IntegrityLevel') { $actual.IntegrityLevel=12288 }
  else { $actual.$field='changed' }
  $rejected=$false
  try { [Alicization.WindowsInput.Native]::AssertSameTarget($expected,$actual) } catch { $rejected=$true }
  if(!$rejected) { throw ('Changed native identity was accepted: '+$field) }
  $checks++
}

$hash='a'*64
$receiptName='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
$receipts=[Alicization.WindowsInput.InputReceipts]::Create($receiptName,[uint64]42,$hash)
$peerReceipts=[Alicization.WindowsInput.InputReceipts]::OpenGuardian($receiptName,[uint64]42,$hash)
$receipts.Save($true,'{"ok":false,"inputReleased":false}')
$peerReceipts.Save($false,'{"inputReleased":true}')
if([IO.File]::ReadAllText((Join-Path $receipts.Root 'actor-result.json')) -cne '{"ok":false,"inputReleased":false}' -or [IO.File]::ReadAllText((Join-Path $receipts.Root 'guardian-release.json')) -cne '{"inputReleased":true}') {throw 'Independent receipt bytes changed'}
$checks++
foreach($case in @('existing-root','different-binding','overwrite-release','oversized-result')) {
  $rejected=$false
  try {
    switch($case) {
      'existing-root' {[void][Alicization.WindowsInput.InputReceipts]::Create($receiptName,[uint64]42,$hash)}
      'different-binding' {[void][Alicization.WindowsInput.InputReceipts]::OpenGuardian($receiptName,[uint64]42,('b'*64))}
      'overwrite-release' {$peerReceipts.Save($false,'{"inputReleased":false}')}
      'oversized-result' {$receipts.Save($true,('x'*16385))}
    }
  } catch {$rejected=$true}
  if(!$rejected){throw ('Invalid receipt operation passed: '+$case)}
  $checks++
}
$name='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
$actor=[Alicization.WindowsInput.SharedState]::Create($name,[uint64]42,$hash)
$guardian=$null

function Check([bool]$Value,[string]$Message) { if(!$Value) { throw $Message }; $script:checks++ }
try {
  $guardian=[Alicization.WindowsInput.SharedState]::OpenGuardian($name,[uint64]42,$hash)
  Check (!$actor.PeerHealthy(500)) 'An unready peer passed health'
  $rejected=$false
  try { $guardian.MarkReady() } catch { $rejected=$true }
  Check $rejected 'Readiness must not publish before both participant heartbeat lanes exist'
  $guardian.Beat($true)
  $rejected=$false
  try { $guardian.MarkReady() } catch { $rejected=$true }
  Check $rejected 'A hook heartbeat cannot manufacture a running main thread'
  $actor.Beat($false);$actor.Beat($true);$guardian.Beat($false);$guardian.Beat($true)
  $actor.MarkReady();$guardian.MarkReady()
  Check ($actor.PeerHealthy(500) -and $guardian.PeerHealthy(500)) 'Both heartbeat lanes are required'
  $clockMethod=$actor.GetType().GetMethod('GetTickCount64',[Reflection.BindingFlags]'NonPublic,Static')
  $clockBaseline=[uint64]$clockMethod.Invoke($null,@())
  $advancingClock=[Func[uint64]]{
    [Threading.Thread]::Sleep(32)
    $guardian.Beat($false);$guardian.Beat($true)
    return [uint64]$clockBaseline
  }
  $snapshotMethod=$actor.GetType().GetMethod('PeerHealthy',[Reflection.BindingFlags]'NonPublic,Instance',$null,[type[]]@([int],[Func[uint64]]),$null)
  Check ([bool]$snapshotMethod.Invoke($actor,@([int]500,$advancingClock))) 'A peer beat between clock sampling and lane reads is not a failed peer'
  $rejected=$false
  try { $guardian.ReserveBatch([int[]]@(0xA2,0x53)) } catch { $rejected=$true }
  Check $rejected 'Guardian was allowed to reserve input'
  $actor.ReserveBatch([int[]]@(0xA2,0x53))
  Check ($actor.OwnedKeys().Length -eq 2 -and $guardian.Ownership(0xA2) -eq 1) 'Ownership was not recorded before down'
  Check ($actor.NoteOwnDownDelivered(0xA2) -and $guardian.NoteOwnDownDelivered(0xA2)) 'Down acknowledgment lost owner'
  $actor.NoteOwnUpDelivered(0xA2)
  Check ($actor.Ownership(0xA2) -ne 0) 'A single hook prematurely erased ownership'
  $guardian.NoteOwnUpDelivered(0xA2)
  Check ($actor.Ownership(0xA2) -eq 0) 'Both hooks did not drain this key'
  $rejected=$false
  try { $actor.ReserveBatch([int[]]@(0x53)) } catch { $rejected=$true }
  Check $rejected 'Undrained key was accepted for a new batch'
  $actor.NoteOwnUpDelivered(0x53);$guardian.NoteOwnUpDelivered(0x53)
  $actor.Beat($false);$actor.Beat($true);$guardian.Beat($false);$guardian.Beat($true)
  $actor.ReserveBatch([int[]]@(0xA2,0x53))
  $guardian.NoteExternalDelivered(0xA2,$true)
  Check ($actor.StopReason -ne 0 -and $actor.ExternallyHeld(0xA2) -and $actor.Ownership(0xA2) -eq 0) 'Physical takeover did not transfer ownership'
  $actor.Stop(1)
  Check ($actor.StopReason -ne 0) 'Stop gate was reset'
  $rejected=$false
  try { $actor.ReserveBatch([int[]]@(9)) } catch { $rejected=$true }
  Check $rejected 'Stopped session accepted another down'
  $rejected=$false
  try { $actor.AcknowledgeInputReleased() } catch { $rejected=$true }
  Check $rejected 'Pending key was reported released'
  $guardian.NoteExternalDelivered(0xA2,$false)
  Check (!$actor.ExternallyHeld(0xA2) -and $actor.Ownership(0xA2) -eq 0) 'Physical up restored synthetic ownership'
  $actor.NoteOwnUpDelivered(0x53)
  Check ($guardian.OwnedKeys().Length -eq 1) 'One participant erased an undelivered release'
  $guardian.NoteOwnUpDelivered(0x53)
  $actor.AcknowledgeInputReleased()
  Check (!$actor.BothInputReleased) 'One participant certified both releases'
  $guardian.AcknowledgeInputReleased()
  Check ($actor.BothInputReleased) 'Both release acknowledgments did not agree'
  foreach($tag in @([uint64]0,[uint64]43)) {
    $rejected=$false
    try { $unexpected=[Alicization.WindowsInput.SharedState]::OpenGuardian($name,$tag,$hash);$unexpected.Dispose() } catch { $rejected=$true }
    Check $rejected 'Wrong owner tag opened the session'
  }
  $rejected=$false
  try { $unexpected=[Alicization.WindowsInput.SharedState]::OpenGuardian($name,[uint64]42,('b'*64));$unexpected.Dispose() } catch { $rejected=$true }
  Check $rejected 'Different action binding opened the session'
}
finally { if($guardian) { $guardian.Dispose() };$actor.Dispose() }

$name='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
$actor=[Alicization.WindowsInput.SharedState]::Create($name,[uint64]42,$hash)
$guardian=$null
try {
  $guardian=[Alicization.WindowsInput.SharedState]::OpenGuardian($name,[uint64]42,$hash)
  $actor.Stop(1)
  $guardian.Stop(2)
  Check ($actor.StopReason -eq 2 -and $guardian.StopReason -eq 2) 'A closing operation must not hide subsequent external input takeover'
  $actor.Stop(4)
  Check ($actor.StopReason -eq 2 -and $guardian.StopReason -eq 2) 'Competing peer failure must not erase external takeover attribution'
} finally { if($guardian) { $guardian.Dispose() };$actor.Dispose() }

$name='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
$actor=[Alicization.WindowsInput.SharedState]::Create($name,[uint64]42,$hash)
$guardian=$null
try {
  $field=$actor.GetType().GetField('file',[Reflection.BindingFlags]'NonPublic,Instance')
  $security=$field.GetValue($actor).GetAccessControl()
  Check $security.AreAccessRulesProtected 'Named state inherited access rules'
  $allowed=@([Security.Principal.WindowsIdentity]::GetCurrent().User.Value,'S-1-5-18','S-1-5-32-544')
  $rules=@($security.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
  Check ($rules.Count -eq 3) 'Unexpected named-state access rule count'
  foreach($rule in $rules) {
    Check ($allowed -contains $rule.IdentityReference.Value -and $rule.AccessControlType -eq 'Allow') 'Unexpected named-state identity or deny rule'
  }
  $guardian=[Alicization.WindowsInput.SharedState]::OpenGuardian($name,[uint64]42,$hash)
  $actor.SeedExternalHeld(0xA2,$true)
  $actor.Beat($false);$actor.Beat($true);$guardian.Beat($false);$guardian.Beat($true)
  $actor.MarkReady();$guardian.MarkReady()
  $rejected=$false
  try { $actor.ReserveBatch([int[]]@(0xA2,0x53)) } catch { $rejected=$true }
  Check ($rejected -and $actor.OwnedKeys().Length -eq 0) 'User-held modifier was reserved'
  $rejected=$false
  try { $actor.SeedExternalHeld(0xA2,$false) } catch { $rejected=$true }
  Check ($rejected -and $actor.ExternallyHeld(0xA2)) 'Late initialization erased physical ownership'
  [Threading.Thread]::Sleep(550)
  Check (!$actor.PeerHealthy(500)) 'Stale hook/main heartbeat remained healthy'
  $rejected=$false
  try { $actor.ReserveBatch([int[]]@(9)) } catch { $rejected=$true }
  Check ($rejected -and $actor.OwnedKeys().Length -eq 0) 'An unresponsive peer admitted input'
  Check ($actor.ExternallyHeld(0xA2) -and $actor.OwnedKeys().Length -eq 0) 'An unrelated reservation erased user-held input'
}
finally { if($guardian) { $guardian.Dispose() };$actor.Dispose() }

# Rehearse the same ownership acknowledgments through two actual processes.
# This is deliberately a ledger test, not an input-injection helper.
$childCode=@'
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::Out.WriteLine('boot');[Console]::Out.Flush()
[Console]::SetIn([IO.StreamReader]::new([Console]::OpenStandardInput(),[Text.UTF8Encoding]::new($false,$true),$false))
[Console]::SetOut([IO.StreamWriter]::new([Console]::OpenStandardOutput(),[Text.UTF8Encoding]::new($false)))
$request=[Console]::In.ReadLine() | ConvertFrom-Json
[IO.File]::WriteAllText($request.trace,('request-read '+[datetime]::UtcNow.ToString('o')))
[void][Reflection.Assembly]::LoadFrom($request.assembly)
[IO.File]::AppendAllText($request.trace,('\nassembly-loaded '+[datetime]::UtcNow.ToString('o')))
$peer=[Alicization.WindowsInput.SharedState]::OpenGuardian($request.name,[uint64]42,$request.hash)
[IO.File]::AppendAllText($request.trace,('\npeer-open '+[datetime]::UtcNow.ToString('o')))
try {
  $peer.Beat($false);$peer.Beat($true);$peer.MarkReady()
  [Console]::Out.WriteLine('ready');[Console]::Out.Flush()
  if([Console]::In.ReadLine() -ne 'owned' -or $peer.Ownership(9) -ne 2) { throw 'Cross-process reservation missing' }
  if(!$peer.NoteOwnDownDelivered(9)) { throw 'Cross-process down missing' }
  $peer.NoteOwnUpDelivered(9)
  [Console]::Out.WriteLine('guardian-drained');[Console]::Out.Flush()
  if([Console]::In.ReadLine() -ne 'stop' -or $peer.StopReason -eq 0) { throw 'Cross-process stop missing' }
  $peer.AcknowledgeInputReleased()
  [Console]::Out.WriteLine('released');[Console]::Out.Flush()
}
finally { $peer.Dispose() }
'@
$name='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
$actor=[Alicization.WindowsInput.SharedState]::Create($name,[uint64]42,$hash)
$child=$null
$childInput=$null
$peerPid=$null
$peerHandle=$null
try {
  $actor.Beat($false);$actor.Beat($true);$actor.MarkReady()
  $start=New-Object Diagnostics.ProcessStartInfo
  $start.FileName=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
  $start.Arguments='-NoProfile -NonInteractive -EncodedCommand '+[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($childCode))
  $start.UseShellExecute=$false;$start.CreateNoWindow=$true
  $start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $start.StandardOutputEncoding=[Text.UTF8Encoding]::new($false);$start.StandardErrorEncoding=[Text.UTF8Encoding]::new($false)
  $child=[Diagnostics.Process]::Start($start)
  $childInput=[IO.StreamWriter]::new($child.StandardInput.BaseStream,[Text.UTF8Encoding]::new($false))
  $childInput.AutoFlush=$true
  $peerPid=$child.Id
  $boot=$child.StandardOutput.ReadLineAsync()
  Check ($boot.Wait(5000) -and $boot.Result -eq 'boot') 'Native participant never entered its fixed bootstrap'
  $peerStart=$child.StartTime.ToUniversalTime().Ticks.ToString([Globalization.CultureInfo]::InvariantCulture)
  $peerHandle=[Alicization.WindowsInput.Native]::HoldProcess($peerPid,$peerStart)
  Check ([Alicization.WindowsInput.Native]::ProcessAlive($peerHandle)) 'Owned child process handle was not alive'
  $actor.Stop(1)
  $rejected=$false
  try { $actor.ReconcileExitedPeer($peerHandle) } catch { $rejected=$true }
  Check $rejected 'A live peer was reconciled as dead'
  # This map was stopped for the negative assertion; use a fresh session below
  # for the real cross-process rehearsal rather than resetting its stop gate.
  $actor.Dispose()
  $name='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
  $actor=[Alicization.WindowsInput.SharedState]::Create($name,[uint64]42,$hash)
  $actor.Beat($false);$actor.Beat($true);$actor.MarkReady()
  $rejected=$false
  try { $wrong=[Alicization.WindowsInput.Native]::HoldProcess($peerPid,([long]$peerStart+1).ToString([Globalization.CultureInfo]::InvariantCulture));$wrong.Dispose() } catch { $rejected=$true }
  Check $rejected 'A reused PID with different creation identity was accepted'
  $stderr=$child.StandardError.ReadToEndAsync()
  $trace=$target+'.child-trace.txt'
  $childInput.WriteLine((@{assembly=$assembly;name=$name;hash=$hash;trace=$trace} | ConvertTo-Json -Compress))
  $line=$child.StandardOutput.ReadLineAsync()
  $started=$line.Wait(5000)
  if(!$started -or $line.Result -ne 'ready') {
    # Preserve the actual child failure before owned-process cleanup. A timeout
    # is not permission to extend readiness or accept an absent participant.
    $detail=@{stage='guardian-ready';lineCompleted=$started;line=if($started) {$line.Result} else {$null};exited=$child.HasExited;exitCode=if($child.HasExited) {$child.ExitCode} else {$null};stderr=if($stderr.IsCompleted) {$stderr.Result} else {'stderr still open'};trace=if([IO.File]::Exists($trace)) {[IO.File]::ReadAllText($trace)} else {'no request-read checkpoint'}}
    $detail | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath ($target+'.failure.json')
    throw ('Actual guardian process did not become ready: '+($detail | ConvertTo-Json -Compress))
  }
  Check $true 'Actual guardian process did not become ready'
  $actor.Beat($false);$actor.Beat($true)
  $actor.ReserveBatch([int[]]@(9))
  Check ($actor.NoteOwnDownDelivered(9)) 'Actor did not own its native reservation'
  $childInput.WriteLine('owned')
  $line=$child.StandardOutput.ReadLineAsync()
  Check ($line.Wait(5000) -and $line.Result -eq 'guardian-drained') 'Actual guardian process did not drain its lane'
  Check ($actor.Ownership(9) -eq 2) 'Remote acknowledgment erased actor ownership'
  $actor.NoteOwnUpDelivered(9);$actor.Stop(1)
  $childInput.WriteLine('stop');$childInput.Close()
  $line=$child.StandardOutput.ReadLineAsync()
  Check ($line.Wait(5000) -and $line.Result -eq 'released') 'Remote release was not acknowledged'
  $exited=$child.WaitForExit(5000)
  $errorText=if($exited) { $stderr.Result } else { 'Child did not close in time' }
  $exitDetail=@{exited=$exited;code=if($exited) { $child.ExitCode } else { $null };stderr=$errorText} | ConvertTo-Json -Compress
  Check ($exited -and $child.ExitCode -eq 0 -and $errorText -eq '') ('Actual guardian process failed to exit normally: '+$exitDetail)
  Check (![Alicization.WindowsInput.Native]::ProcessAlive($peerHandle)) 'An exited process became a live target again'
  Check (!$actor.BothInputReleased) 'Remote exit alone certified actor release'
  $actor.AcknowledgeInputReleased()
  Check $actor.BothInputReleased 'Actual two-process release did not agree'
  $deadName='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
  $deadActor=[Alicization.WindowsInput.SharedState]::Create($deadName,[uint64]42,$hash)
  $deadGuardian=$null
  try {
    $deadGuardian=[Alicization.WindowsInput.SharedState]::OpenGuardian($deadName,[uint64]42,$hash)
    $deadActor.Beat($false);$deadActor.Beat($true);$deadGuardian.Beat($false);$deadGuardian.Beat($true)
    $deadActor.MarkReady();$deadGuardian.MarkReady()
    $deadActor.ReserveBatch([int[]]@(0xA2,0x53));$deadActor.Stop(4)
    $deadActor.ReconcileExitedPeer($peerHandle)
    Check ($deadActor.OwnedKeys().Length -eq 2 -and !$deadActor.BothInputReleased) 'Peer exit erased our unacknowledged input'
    $deadActor.NoteOwnUpDelivered(0xA2)
    $deadActor.ReconcileExitedPeer($peerHandle)
    Check ($deadActor.Ownership(0xA2) -eq 0 -and $deadActor.Ownership(0x53) -ne 0) 'Dead-peer reconciliation lost per-key delivery'
    $deadActor.NoteOwnUpDelivered(0x53)
    $deadActor.ReconcileExitedPeer($peerHandle)
    $deadActor.AcknowledgeInputReleased()
    Check $deadActor.BothInputReleased 'Proven peer exit and our delivered ups did not settle release'
    $rejected=$false
    try { $deadActor.ReconcileExitedPeer($null) } catch { $rejected=$true }
    Check $rejected 'An absent process handle became proof of peer exit'
  } finally { if($deadGuardian) {$deadGuardian.Dispose()};$deadActor.Dispose() }
}
finally {
  if($childInput) { $childInput.Dispose() }
  if($peerHandle) { $peerHandle.Dispose() }
  if($child) {
    if(!$child.HasExited) { $child.Kill();[void]$child.WaitForExit(5000) }
    $child.Dispose()
  }
  $actor.Dispose()
}

function New-PolicyPair([bool]$HeldOtherKey=$false) {
  $mapName='Local\AlicizationInput_'+[guid]::NewGuid().ToString('N')
  $writer=[Alicization.WindowsInput.SharedState]::Create($mapName,[uint64]42,('a'*64))
  $watcher=[Alicization.WindowsInput.SharedState]::OpenGuardian($mapName,[uint64]42,('a'*64))
  if($HeldOtherKey) { $writer.SeedExternalHeld(0x57,$true) }
  $writer.MarkHookInstalled();$watcher.MarkHookInstalled()
  $writer.Beat($false);$writer.Beat($true);$watcher.Beat($false);$watcher.Beat($true)
  $writer.MarkReady();$watcher.MarkReady()
  return [pscustomobject]@{Actor=$writer;Guardian=$watcher}
}
foreach($reason in @('target','peer','expiry','cancel')) {
  $pair=New-PolicyPair
  try {
    $pair.Actor.ReserveBatch([int[]]@(0xA2,0x53))
    if($reason -eq 'cancel') { $pair.Actor.Stop(1) }
    Check (![Alicization.WindowsInput.HookPolicy]::BeforeKeyboard($pair.Actor,0xA2,$true,[uint64]42,$false,($reason -ne 'target'),($reason -ne 'peer'),($reason -ne 'expiry'))) ('Own down survived '+$reason)
    Check ([Alicization.WindowsInput.HookPolicy]::BeforeKeyboard($pair.Actor,0xA2,$true,[uint64]42,$true,$false,$false,$false)) 'Cleanup up was blocked by revoked authority/target'
    [Alicization.WindowsInput.HookPolicy]::AfterForwardedKeyboard($pair.Actor,0xA2,$true,[uint64]42,$true,$false)
    Check ($pair.Actor.Ownership(0xA2) -ne 0) 'A chain-blocked up erased ownership'
    [Alicization.WindowsInput.HookPolicy]::AfterForwardedKeyboard($pair.Actor,0xA2,$true,[uint64]42,$true,$true)
    Check ($pair.Actor.Ownership(0xA2) -ne 0) 'One hook certified both acknowledgments'
    [Alicization.WindowsInput.HookPolicy]::AfterForwardedKeyboard($pair.Guardian,0xA2,$true,[uint64]42,$true,$true)
    Check ($pair.Actor.Ownership(0xA2) -eq 0) 'Allowed up did not drain both acknowledgments'
    Check ([Alicization.WindowsInput.HookPolicy]::BeforeKeyboard($pair.Actor,0x41,$false,[uint64]42,$false,$false,$false,$false)) 'Physical input was blocked by an injected tag collision'
  }
  finally { $pair.Guardian.Dispose();$pair.Actor.Dispose() }
}
$pair=New-PolicyPair
try {
  $pair.Actor.ReserveBatch([int[]]@(0xA2,0x53))
  Check ([Alicization.WindowsInput.HookPolicy]::BeforeKeyboard($pair.Actor,0xA2,$false,[uint64]0,$false,$true,$true,$true)) 'Physical takeover was suppressed'
  [Alicization.WindowsInput.HookPolicy]::AfterForwardedKeyboard($pair.Actor,0xA2,$false,[uint64]0,$false,$false)
  Check (!$pair.Actor.ExternallyHeld(0xA2)) 'Blocked physical input was recorded as delivered'
  [Alicization.WindowsInput.HookPolicy]::AfterForwardedKeyboard($pair.Actor,0xA2,$false,[uint64]0,$false,$true)
  Check ($pair.Actor.ExternallyHeld(0xA2) -and $pair.Actor.Ownership(0xA2) -eq 0) 'Delivered physical down did not take ownership'
  Check (![Alicization.WindowsInput.HookPolicy]::BeforeKeyboard($pair.Actor,0xA2,$true,[uint64]42,$true,$false,$false,$false)) 'Synthetic cleanup released a user-held modifier'
  Check ([Alicization.WindowsInput.HookPolicy]::BeforeKeyboard($pair.Actor,0xA2,$false,[uint64]0,$true,$false,$false,$false)) 'Physical up was suppressed after takeover'
  [Alicization.WindowsInput.HookPolicy]::AfterForwardedKeyboard($pair.Actor,0xA2,$false,[uint64]0,$true,$true)
  Check (!$pair.Actor.ExternallyHeld(0xA2) -and $pair.Actor.Ownership(0xA2) -eq 0) 'Physical up recreated synthetic ownership'
  Check ([Alicization.WindowsInput.HookPolicy]::BeforeKeyboard($pair.Actor,0x42,$true,[uint64]43,$false,$false,$false,$false)) 'Foreign injected input was suppressed'
}
finally { $pair.Guardian.Dispose();$pair.Actor.Dispose() }
$pair=New-PolicyPair $true
try {
  $rejected=$false
  try { $pair.Actor.ReserveBatch([int[]]@(0xA2,0x53)) } catch { $rejected=$true }
  Check ($rejected -and $pair.Actor.OwnedKeys().Length -eq 0) 'A different held key was ignored during chord reservation'
}
finally { $pair.Guardian.Dispose();$pair.Actor.Dispose() }

$pair=New-PolicyPair
try {
  $pair.Actor.ReserveBatch([int[]]@(9))
  $pair.Guardian.Dispose();$pair.Guardian=$null
  Check ($pair.Actor.StopReason -ne 0 -and $pair.Actor.Ownership(9) -ne 0 -and !$pair.Actor.BothInputReleased) 'Peer disposal erased unknown pending input'
}
finally { if($pair.Guardian) { $pair.Guardian.Dispose() };$pair.Actor.Dispose() }

$pair=New-PolicyPair
try {
  $pair.Actor.ReserveBatch([int[]]@(0xA2,0x53))
  $rejected=$false
  try { $pair.Actor.ReserveBatch([int[]]@(9)) } catch { $rejected=$true }
  Check $rejected 'A disjoint chord bypassed an undrained batch'
  Check ($pair.Actor.NoteOwnDownDelivered(0xA2) -and $pair.Guardian.NoteOwnDownDelivered(0xA2)) 'Actual down acknowledgment failed'
  Check ($pair.Actor.ActorDeliveredDowns -eq 1 -and $pair.Actor.GuardianDeliveredDowns -eq 1) 'Independent delivered-down counters were not recorded'
  Check (![Alicization.WindowsInput.HookPolicy]::BeforeKeyboard($pair.Actor,0xA2,$true,[uint64]42,$false,$true,$true,$true)) 'Duplicate own down passed before forwarding'
  Check (!$pair.Actor.NoteOwnDownDelivered(0xA2) -and $pair.Actor.ActorDeliveredDowns -eq 1) 'A duplicate down manufactured another delivery'
  $pair.Actor.NoteOwnUpDelivered(0xA2);$pair.Guardian.NoteOwnUpDelivered(0xA2)
  Check ($pair.Actor.ActorDeliveredDowns -eq 1 -and $pair.Actor.GuardianDeliveredDowns -eq 1) 'Key release erased the original delivery evidence'
} finally {$pair.Guardian.Dispose();$pair.Actor.Dispose()}

$monitor=[type][Alicization.WindowsInput.KeyboardProcess]
$monitor=$monitor.GetMethod('MonitorCancellation',[Reflection.BindingFlags]'Static,NonPublic')
foreach($case in @(@{text="cancel`n";reason=1},@{text='';reason=1},@{text="other`n";reason=7},@{text=(('x'*33)+"`n");reason=7})) {
  $pair=New-PolicyPair
  $originalInput=[Console]::In
  try {
    [Console]::SetIn([IO.StringReader]::new($case.text))
    $task=$monitor.Invoke($null,@($pair.Actor))
    Check ($task.Wait(1000)) 'Actual cancellation reader did not settle'
    Check ($pair.Actor.StopReason -eq $case.reason) 'Actual cancellation/EOF did not close the shared stop gate'
  } finally {[Console]::SetIn($originalInput);$pair.Guardian.Dispose();$pair.Actor.Dispose()}
}

$pair=New-PolicyPair
try {
  $pair.Actor.NoteDeliveredExternalInput($true);$pair.Guardian.NoteDeliveredExternalInput($true)
  Check (!$pair.Actor.BothPhysicalInputSeen) 'Foreign injected input was mislabeled as physical'
  $pair.Actor.NoteDeliveredExternalInput($false)
  Check (!$pair.Actor.BothPhysicalInputSeen) 'One observer attested both physical observations'
  $pair.Guardian.NoteDeliveredExternalInput($false)
  Check $pair.Actor.BothPhysicalInputSeen 'Both actual physical-observation flags did not agree'
  $pair.Actor.NoteDeliveredExternalInput($true)
  Check $pair.Actor.BothPhysicalInputSeen 'A later injected event erased physical takeover evidence'
} finally {$pair.Guardian.Dispose();$pair.Actor.Dispose()}

$hooks=[type][Alicization.WindowsInput.KeyboardHooks]
$messageType=$hooks.GetNestedType('Message',[Reflection.BindingFlags]::NonPublic)
$keyType=$hooks.GetNestedType('KeyData',[Reflection.BindingFlags]::NonPublic)
Check ([Runtime.InteropServices.Marshal]::SizeOf([type]$messageType) -eq 48) 'Invalid x64 MSG layout'
Check ([Runtime.InteropServices.Marshal]::SizeOf([type]$keyType) -eq 24) 'Invalid x64 KBDLLHOOKSTRUCT layout'
$normalize=$hooks.GetMethod('NormalizeKey',[Reflection.BindingFlags]'Static,NonPublic')
foreach($case in @(@(0x10,0x2A,0,0xA0),@(0x10,0x36,0,0xA1),@(0x11,0x1D,0,0xA2),@(0x11,0x1D,1,0xA3),@(0x12,0x38,0,0xA4),@(0x12,0x38,1,0xA5),@(0x53,0x1F,0,0x53))) {
  $key=[Activator]::CreateInstance($keyType)
  $keyType.GetField('Key').SetValue($key,[uint32]$case[0]);$keyType.GetField('ScanCode').SetValue($key,[uint32]$case[1]);$keyType.GetField('Flags').SetValue($key,[uint32]$case[2])
  Check ($normalize.Invoke($null,@($key)) -eq $case[3]) 'Hook normalized a physical modifier to the wrong side'
}

@{format='alicization-native-keyboard-primitives-v1';passed=$true;checks=$checks;peerPid=$peerPid;scope='Windows PowerShell compile, x64 layout, protected MMF, actual two-process ownership protocol rehearsal, actual bounded cancellation reader and pure hook decisions/decoding only. No hooks, foreground observation or keyboard injection.';sourceHashes=@{native=(Get-FileHash (Join-Path $Root 'windows-keyboard-native.cs')).Hash;shared=(Get-FileHash (Join-Path $Root 'windows-keyboard-shared-state.cs')).Hash;hookPolicy=(Get-FileHash (Join-Path $Root 'windows-keyboard-hook-policy.cs')).Hash;hooks=(Get-FileHash (Join-Path $Root 'windows-keyboard-hooks.cs')).Hash;session=(Get-FileHash (Join-Path $Root 'windows-keyboard-session.cs')).Hash;process=(Get-FileHash (Join-Path $Root 'windows-keyboard-process.cs')).Hash}} | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath $target
Write-Output ('Passed '+$checks+' native primitive checks without input injection')
