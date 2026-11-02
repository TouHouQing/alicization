param([string]$WorkspaceRoot,[string]$CheckoutRoot,[ValidatePattern('^[a-zA-Z0-9-]{1,80}$')][string]$RunId=((Get-Date -Format yyyyMMdd-HHmmss)+'-'+[guid]::NewGuid().ToString('N').Substring(0,8)))
$ErrorActionPreference='Stop'
$workspace=if($WorkspaceRoot){[IO.Path]::GetFullPath($WorkspaceRoot)}else{[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))}
$checkout=if($CheckoutRoot){[IO.Path]::GetFullPath($CheckoutRoot)}else{$workspace}
$resultPath=Join-Path $workspace ('output/owned-low-disk-'+$RunId+'-acceptance.json')
$testReport=Join-Path $checkout ('output/owned-low-disk-'+$RunId+'-vitest.json')
$testLog=Join-Path $checkout ('output/owned-low-disk-'+$RunId+'.log')
foreach($target in @($resultPath,$testReport,$testLog)){if(Test-Path -LiteralPath $target){throw 'Fresh low-space report identity required'}}
if(!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'This bounded local VHD test requires an elevated Windows shell'}
$base=Join-Path $workspace 'output\owned-low-disk-volumes'
if(!(Test-Path -LiteralPath $base)){New-Item -ItemType Directory -Path $base|Out-Null}
foreach($parent in @($workspace,(Join-Path $workspace 'output'),$base)){if((Get-Item -LiteralPath $parent).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Owned volume ancestry must not redirect'}}
$nonce=[guid]::NewGuid().ToString()
$root=[IO.Path]::GetFullPath((Join-Path $base $nonce))
if([IO.Path]::GetDirectoryName($root) -cne $base -or (Test-Path -LiteralPath $root)){throw 'Fresh exact owned volume directory required'}
New-Item -ItemType Directory -Path $root|Out-Null
$vhd=[IO.Path]::GetFullPath((Join-Path $root 'low-space.vhd'))
$mount=[IO.Path]::GetFullPath((Join-Path $root 'mount'))
$ownerPath=Join-Path $root 'owner.json'
$label='QA_LOW_'+$nonce.Substring(0,8)
$owner=[ordered]@{format='alicization-owned-low-disk-volume-v1';workspace=$workspace;root=$root;mount=$mount;image=$vhd;nonce=$nonce;label=$label;maximumMiB=96;createdAt=(Get-Date -Format o);purpose='Actual Windows low-space storage refusal; no drive letter or user-disk filling'}
$owner|ConvertTo-Json|Set-Content -LiteralPath $ownerPath -Encoding UTF8
$script=Join-Path $root 'create-vhd.txt'
@(('create vdisk file="'+$vhd+'" maximum=96 type=expandable'),('select vdisk file="'+$vhd+'"'),'attach vdisk')|Set-Content -LiteralPath $script -Encoding ASCII
$passed=$false
$attached=$false
$accessAdded=$false
$diskNumber=$null
$partitionNumber=$null
$failure=$null
$nativeExit=$null
try {
 $ErrorActionPreference='Continue'
 & diskpart.exe /s $script *> (Join-Path $root 'diskpart.log')
 $creationExit=$LASTEXITCODE
 $ErrorActionPreference='Stop'
 if($creationExit -ne 0 -or !(Test-Path -LiteralPath $vhd)){throw 'Owned VHD creation failed before any formatting'}
 $image=Get-DiskImage -ImagePath $vhd
 if(!$image.Attached -or [IO.Path]::GetFullPath($image.ImagePath) -cne $vhd){throw 'Exact newly created image is not attached'}
 $attached=$true
 $disks=@($image|Get-Disk)
 if($disks.Count -ne 1){throw 'Exact image must associate with one disk'}
 $disk=$disks[0]
 if($disk.IsBoot -or $disk.IsSystem -or $disk.Number -eq 0 -or $disk.PartitionStyle -ne 'RAW' -or $disk.Size -ne 96MB -or $disk.NumberOfPartitions -ne 0){throw 'Formatting requires the exact fresh empty 96MiB non-system image'}
 $diskNumber=$disk.Number
 Initialize-Disk -Number $diskNumber -PartitionStyle GPT -Confirm:$false|Out-Null
 $check=@(Get-DiskImage -ImagePath $vhd|Get-Disk)
 if($check.Count -ne 1 -or $check[0].Number -ne $diskNumber -or $check[0].IsBoot -or $check[0].IsSystem -or $check[0].Size -ne 96MB){throw 'Owned image disk identity changed'}
 $partition=New-Partition -DiskNumber $diskNumber -UseMaximumSize
 if($partition.DiskNumber -ne $diskNumber -or $partition.DriveLetter){throw 'Owned partition must not assign a drive letter'}
 $partitionNumber=$partition.PartitionNumber
 $partition|Format-Volume -FileSystem NTFS -NewFileSystemLabel $label -Confirm:$false|Out-Null
 New-Item -ItemType Directory -Path $mount|Out-Null
 Add-PartitionAccessPath -DiskNumber $diskNumber -PartitionNumber $partitionNumber -AccessPath ($mount+'\') -Confirm:$false
 $accessAdded=$true
 $volume=Get-Partition -DiskNumber $diskNumber -PartitionNumber $partitionNumber|Get-Volume
 if($volume.FileSystemLabel -cne $label -or $volume.DriveLetter -or $volume.SizeRemaining -gt 96MB){throw 'Unlettered owned small volume is not current'}
 $owner.testReport=$testReport
 $owner.testLog=$testLog
 $owner.diskNumber=$diskNumber
 $owner.partitionNumber=$partitionNumber
 $owner.volumePath=$volume.Path
 $owner.diskUniqueId=$check[0].UniqueId
 $owner|ConvertTo-Json|Set-Content -LiteralPath $ownerPath -Encoding UTF8
 $ownerHash=(Get-FileHash -LiteralPath $ownerPath -Algorithm SHA256).Hash
 Set-Location -LiteralPath $checkout
 $env:LIFE_LOW_DISK_MANIFEST=$ownerPath
 $ErrorActionPreference='Continue'
 pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/execution/storage-volume.real.integration.test.ts --maxWorkers=1 --reporter=json "--outputFile=$testReport" *> $testLog
 $nativeExit=$LASTEXITCODE
 $ErrorActionPreference='Stop'
 if((Get-FileHash -LiteralPath $ownerPath -Algorithm SHA256).Hash -cne $ownerHash){throw 'Volume owner changed during checks'}
 if($nativeExit -ne 0){throw 'Actual low-space tests failed; keep the detached image for diagnosis'}
 $tests=Get-Content -LiteralPath $testReport -Raw -Encoding UTF8|ConvertFrom-Json
 if($tests.numPassedTests -ne 9 -or $tests.numFailedTests -ne 0 -or $tests.numPendingTests -ne 0){throw 'All nine real volume cases must run without skips'}
 foreach($round in 1..3){$r=Get-Content -LiteralPath (Join-Path $root ('round-'+$round+'.json')) -Raw -Encoding UTF8|ConvertFrom-Json; if(!$r.passed -or !$r.originalMtimePreserved -or $r.cleared -ne 1){throw 'Every complete native round must pass'}}
 foreach($round in 1..3){$r=Get-Content -LiteralPath (Join-Path $root ('enospc-'+$round+'.json')) -Raw -Encoding UTF8|ConvertFrom-Json; if(!$r.passed -or $r.nativeError -cne 'ENOSPC' -or $r.partialBytes -le 0 -or $r.partialBytes -ge $r.replacementBytes -or !$r.originalBytesPreserved -or !$r.originalMtimePreserved -or !$r.temporaryRemoved -or $r.capacityMocked){throw 'Every actual partial-write ENOSPC case must preserve its target and remove its temporary file'}}
 foreach($round in 1..3){$r=Get-Content -LiteralPath (Join-Path $root ('sqlite-full-'+$round+'.json')) -Raw -Encoding UTF8|ConvertFrom-Json; if(!$r.passed -or $r.nativeError -cne 'SQLITE_FULL' -or !$r.priorHistoryPreserved -or !$r.unfinishedResponsibilityPreserved -or $r.partialIngressCommitted -ne 0 -or !$r.retryCommittedOnce -or !$r.reopenedAfterFailure -or $r.capacityMocked){throw 'Every full-volume life transaction must roll back, reopen prior continuity, and retry exactly once'}}
 $passed=$true
} catch {$failure=$_.Exception.Message}
finally {
 Set-Location -LiteralPath $workspace
 if($accessAdded){
  $ownedDisks=@(Get-DiskImage -ImagePath $vhd|Get-Disk)
  if($ownedDisks.Count -ne 1 -or $ownedDisks[0].Number -ne $diskNumber -or $ownedDisks[0].UniqueId -cne $owner.diskUniqueId){throw 'Owned volume changed before detaching; preserve its files'}
  Remove-PartitionAccessPath -DiskNumber $diskNumber -PartitionNumber $partitionNumber -AccessPath ($mount+'\') -Confirm:$false
 }
 if(Test-Path -LiteralPath $vhd){
  $current=Get-DiskImage -ImagePath $vhd
  if($current.Attached){Dismount-DiskImage -ImagePath $vhd -Confirm:$false|Out-Null}
  if((Get-DiskImage -ImagePath $vhd).Attached){throw 'Owned volume did not detach; preserve its files'}
  $imageHash=(Get-FileHash -LiteralPath $vhd -Algorithm SHA256).Hash.ToLowerInvariant()
  $imageBytes=(Get-Item -LiteralPath $vhd).Length
  if($passed){
   if([IO.Path]::GetDirectoryName($vhd) -cne $root -or [IO.Path]::GetFileName($vhd) -cne 'low-space.vhd' -or ((Get-Item -LiteralPath $vhd).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Exact owned image cleanup target changed'}
   Remove-Item -LiteralPath $vhd -Force
  }
 }
 [pscustomobject]@{format='owned-native-low-space-acceptance-v1';passed=$passed;owner=$ownerPath;testExit=$nativeExit;failure=$failure;detached=$true;imageSha256=$imageHash;imageBytes=$imageBytes;imageRemoved=!(Test-Path -LiteralPath $vhd);userDiskFilled=$false;assignedDriveLetter=$false;finishedAt=(Get-Date -Format o)}|ConvertTo-Json|Set-Content -LiteralPath $resultPath -Encoding UTF8
}
Get-Content -LiteralPath $resultPath -Raw -Encoding UTF8
if(!$passed){exit 1}
