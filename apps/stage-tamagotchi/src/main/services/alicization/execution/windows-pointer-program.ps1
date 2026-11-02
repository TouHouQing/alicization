# Compile only the bundled finite pointer actor/guardian in a fresh protected
# userData child. Preparation installs no hooks, captures no window and injects nothing.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$request=[Console]::In.ReadLine()|ConvertFrom-Json
if($request.operation -cne 'prepare' -or ![Environment]::Is64BitProcess){throw 'WINDOWS_POINTER_PROGRAM_PREPARATION_INVALID'}
$root=[IO.Path]::GetFullPath([string]$request.root)
$directory=Get-Item -LiteralPath $root -Force
if(!$directory.PSIsContainer -or ($directory.Attributes -band [IO.FileAttributes]::ReparsePoint) -or @(Get-ChildItem -LiteralPath $root -Force).Count){throw 'WINDOWS_POINTER_PROGRAM_ROOT_INVALID'}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$owner=[IO.Directory]::GetAccessControl($root,[Security.AccessControl.AccessControlSections]::Owner).GetOwner([Security.Principal.SecurityIdentifier])
if($owner.Value -notin @($sid.Value,'S-1-5-32-544')){throw 'WINDOWS_POINTER_PROGRAM_OWNER_INVALID'}
$acl=[Security.AccessControl.DirectorySecurity]::new()
$acl.SetAccessRuleProtection($true,$false)
foreach($identity in @($sid,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'),[Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))){
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity,'FullControl','ContainerInherit, ObjectInherit','None','Allow'))
}
[IO.Directory]::SetAccessControl($root,$acl)
$actual=[IO.Directory]::GetAccessControl($root)
if(!$actual.AreAccessRulesProtected -or $actual.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $owner.Value){throw 'WINDOWS_POINTER_PROGRAM_ACCESS_INVALID'}
$names=@('native','shared-state','pointer-shared-state','pointer-hook-policy','pointer-hooks','pointer-session','pointer-plan','pointer-process','receipts','visual-window')
if($request.sources.Count -ne 10){throw 'WINDOWS_POINTER_PROGRAM_SOURCES_INVALID'}
$paths=@()
foreach($name in $names){
  $source=@($request.sources|Where-Object {$_.name -ceq $name})
  if($source.Count -ne 1){throw 'WINDOWS_POINTER_PROGRAM_SOURCE_IDENTITY'}
  $bytes=[Convert]::FromBase64String($source[0].bytes)
  if($bytes.Length -gt 65536){throw 'WINDOWS_POINTER_PROGRAM_SOURCE_BUDGET'}
  $sha=[Security.Cryptography.SHA256]::Create()
  try {$digest=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
  if($digest -cne $source[0].sha256){throw 'WINDOWS_POINTER_PROGRAM_SOURCE_HASH'}
  $path=Join-Path $root ('windows-'+$name+'.cs')
  $file=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try {$file.Write($bytes,0,$bytes.Length);$file.Flush($true)}finally{$file.Dispose()}
  $paths+=$path
}
$program=Join-Path $root 'pointer.exe'
Add-Type -Path $paths -OutputAssembly $program -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll,System.Drawing.dll
if((Get-Item -LiteralPath $program -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'WINDOWS_POINTER_PROGRAM_LINK'}
$parent=[Diagnostics.Process]::GetProcessById([int]$request.parentProcessId)
try {$ticks=$parent.StartTime.ToUniversalTime().Ticks.ToString([Globalization.CultureInfo]::InvariantCulture)}finally{$parent.Dispose()}
@{sha256=(Get-FileHash -LiteralPath $program -Algorithm SHA256).Hash.ToLowerInvariant();parentStartTicks=$ticks}|ConvertTo-Json -Compress
