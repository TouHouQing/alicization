# Compile and execute the actual ownership/policy decisions, with zero hooks,
# observations or injected input. Never part of the production compiler set.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
$request=[Console]::In.ReadLine()|ConvertFrom-Json
if($request.operation -cne 'check-pointer-policy'){throw 'POINTER_POLICY_CHECK_OPERATION'}
$names=@('keyboard-native','keyboard-shared-state','pointer-shared-state','pointer-hook-policy','pointer-policy-check')
if($request.sources.Count -ne $names.Count){throw 'POINTER_POLICY_CHECK_SOURCES'}
$text=@($names|ForEach-Object {
  $name=$_
  $source=@($request.sources|Where-Object {$_.name -ceq $name})
  if($source.Count -ne 1){throw 'POINTER_POLICY_CHECK_SOURCE_IDENTITY'}
  [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($source[0].bytes))
})
$using=@([regex]::Matches(($text -join "`n"),'(?m)^using [^;]+;')|ForEach-Object {$_.Value}|Select-Object -Unique)
$body=[regex]::Replace(($text -join "`n"),'(?m)^using [^;]+;','')
Add-Type -TypeDefinition (($using -join "`n")+"`n"+$body) -ReferencedAssemblies System.dll,System.Core.dll
[Alicization.WindowsInput.PointerPolicyCheck]::Run()|ConvertTo-Json -Depth 5 -Compress
