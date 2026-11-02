import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { env, platform } from 'node:process'

import { expect, it } from 'vitest'

it.skipIf(platform !== 'win32' || env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1')('survives real fixture file sharing conflicts without acknowledging partial commands or exposing partial state', async () => {
  const root = await mkdtemp(join(resolve('output'), 'keyboard-fixture-files-'))
  // File I/O only: this check loads neither WinForms nor native input APIs.
  const script = `
$ErrorActionPreference='Stop'
$request=[Console]::In.ReadLine()|ConvertFrom-Json
Add-Type -Path $request.source
$command=Join-Path $request.root 'command.txt'
$state=Join-Path $request.root 'state.json'
$id='0123456789abcdef0123456789abcdef'
[IO.File]::WriteAllText($command,$id)
for($index=0;$index -lt 100;$index++){
  $locked=[IO.File]::Open($command,'Open','ReadWrite','None')
  try {if($null -ne [AlicizationKeyboardFixtureFiles]::ReadCommand($command)){throw 'Locked command acknowledged'}}finally{$locked.Dispose()}
  if([AlicizationKeyboardFixtureFiles]::ReadCommand($command) -cne $id){throw 'Valid command not acknowledged'}
}
[IO.File]::WriteAllText($command,'0123')
if($null -ne [AlicizationKeyboardFixtureFiles]::ReadCommand($command)){throw 'Partial command acknowledged'}
[IO.File]::WriteAllText($command,('x'*32))
if($null -ne [AlicizationKeyboardFixtureFiles]::ReadCommand($command)){throw 'Invalid command acknowledged'}
if(![AlicizationKeyboardFixtureFiles]::WriteState($state,'{"counter":1}')){throw 'Initial state failed'}
$locked=[IO.File]::Open($state,'Open','Read','None')
try {if([AlicizationKeyboardFixtureFiles]::WriteState($state,'{"counter":2}')){throw 'Locked state replacement claimed'}}finally{$locked.Dispose()}
if([IO.File]::ReadAllText($state) -cne '{"counter":1}'){throw 'Old complete state was lost'}
if(![AlicizationKeyboardFixtureFiles]::WriteState($state,'{"counter":2}')){throw 'State retry failed'}
if([IO.File]::ReadAllText($state) -cne '{"counter":2}'){throw 'Retried state not complete'}
if(@(Get-ChildItem -LiteralPath $request.root -Filter '*.pending').Count -ne 0){throw 'Pending fixture garbage retained'}
'{"passed":true,"lockedCommandRounds":100,"inputUsed":false}'
`
  const stdout = await new Promise<string>((accept, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20_000, maxBuffer: 4096 }, (error, out, err) => error ? reject(new Error(`${error.message}: ${err}`)) : accept(out))
    child.stdin?.end(`${JSON.stringify({ root, source: resolve('apps/stage-tamagotchi/scripts/life-acceptance/windows-keyboard-fixture-files.cs') })}\n`)
  })
  expect(JSON.parse(stdout)).toEqual({ passed: true, lockedCommandRounds: 100, inputUsed: false })
}, 25_000)
