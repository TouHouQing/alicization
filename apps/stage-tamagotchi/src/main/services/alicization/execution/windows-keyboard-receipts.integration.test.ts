import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { env, platform } from 'node:process'

import { expect, it } from 'vitest'

it.skipIf(platform !== 'win32' || env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1')('flushes the actual native receipt implementation beneath a long protected userData path without any input APIs', async () => {
  const root = await mkdtemp(join(resolve('output'), 'keyboard-long-receipts-'))
  // Keep the executable below MAX_PATH while forcing both receipt filenames
  // beyond it in short checkouts as well as long worktree paths.
  const protectedRoot = join(root, 'a'.repeat(Math.max(1, 220 - root.length - 1)))
  await mkdir(protectedRoot, { recursive: true })
  const misleadingTemp = join(root, 'different-temp')
  await mkdir(misleadingTemp)
  const source = join(root, 'receipt-probe.cs')
  const nonce = randomUUID().replaceAll('-', '')
  await writeFile(source, `using System; using System.IO; using System.Text;
public static class ReceiptProbe {
  public static int Main(string[] args) {
    var receipts=Alicization.WindowsInput.InputReceipts.Create("Local\\\\AlicizationInput_"+args[1],42,new string('a',64));
    receipts.Save(true,"{\\"actor\\":true}");
    var guardian=Alicization.WindowsInput.InputReceipts.OpenGuardian("Local\\\\AlicizationInput_"+args[1],42,new string('a',64));
    guardian.Save(false,"{\\"guardian\\":true}");
    Console.WriteLine(new System.Web.Script.Serialization.JavaScriptSerializer().Serialize(new {passed=true,inputUsed=false,receiptRoot=receipts.Root}));return 0;
  }
}`)
  const script = `$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$r=[Console]::In.ReadLine()|ConvertFrom-Json
Add-Type -Path @($r.source,$r.receipts) -OutputAssembly $r.exe -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll
[IO.File]::Copy($r.exe,$r.target)
$env:TEMP=$r.misleadingTemp;$env:TMP=$r.misleadingTemp
& $r.target $r.root $r.nonce
exit $LASTEXITCODE`
  const stdout = await new Promise<string>((accept, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20_000, maxBuffer: 8192 }, (error, out, err) => error ? reject(new Error(`${error.message}: ${err}`)) : accept(out))
    child.stdin?.end(`${JSON.stringify({ source, nonce, misleadingTemp, receipts: resolve('apps/stage-tamagotchi/src/main/services/alicization/execution/windows-keyboard-receipts.cs'), exe: join(root, 'receipt-probe.exe'), target: join(protectedRoot, 'receipt-probe.exe'), root: protectedRoot })}\n`)
  })
  const receiptRoot = join(protectedRoot, `alicization-owned-input-${nonce}`)
  expect(JSON.parse(stdout)).toEqual({ passed: true, inputUsed: false, receiptRoot })
  expect(receiptRoot.length).toBeGreaterThan(260)
  expect(JSON.parse(await readFile(join(receiptRoot, 'actor-result.json'), 'utf8'))).toEqual({ actor: true })
  expect(JSON.parse(await readFile(join(receiptRoot, 'guardian-release.json'), 'utf8'))).toEqual({ guardian: true })
}, 25_000)
