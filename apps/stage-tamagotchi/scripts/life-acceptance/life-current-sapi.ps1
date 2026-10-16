param([Parameter(Mandatory=$true)][string]$InputPath,[Parameter(Mandatory=$true)][string]$OutputPath,[double]$Speed=1)
$ErrorActionPreference='Stop'
$inputFile=[IO.Path]::GetFullPath($InputPath)
$outputFile=[IO.Path]::GetFullPath($OutputPath)
if ([IO.Path]::GetDirectoryName($inputFile) -ne [IO.Path]::GetDirectoryName($outputFile) -or [IO.Path]::GetFileName([IO.Path]::GetDirectoryName($inputFile)) -notmatch '^alicization-life-(?:real-|product-regression-)[\w-]+$') { throw 'Only an isolated QA directory is supported' }
$text=[IO.File]::ReadAllText($inputFile,[Text.Encoding]::UTF8)
if ($text.Length -eq 0 -or $text.Length -gt 2000) { throw 'QA speech input must be bounded' }
Add-Type -AssemblyName System.Speech
$voice=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $voice.SelectVoice('Microsoft Huihui Desktop')
 $voice.Volume=18
 $voice.Rate=[Math]::Max(-10,[Math]::Min(10,[Math]::Round([Math]::Log([Math]::Max(0.25,[Math]::Min(4,$Speed)))*10)))
 $voice.SetOutputToWaveFile($outputFile)
 $voice.Speak($text)
 $voice.SetOutputToNull()
} finally { $voice.Dispose() }
