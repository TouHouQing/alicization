import { Buffer } from 'node:buffer'
import { execFile, spawn } from 'node:child_process'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execPath, pid, platform } from 'node:process'

import { expect, it } from 'vitest'

import inspectScript from './fixtures/windows-process-fixture-inspection.ps1?raw'
import source from './windows-process-job.cs?raw'

function powershell(script: string, input: object) {
  return new Promise<string>((resolveOutput, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20_000, encoding: 'utf8', maxBuffer: 16_384 }, (error, stdout) => error ? reject(error) : resolveOutput(stdout))
    child.stdin?.on('error', () => { /* The worker callback owns failure. */ })
    child.stdin?.end(JSON.stringify(input))
  })
}

it.skipIf(platform !== 'win32')('owns a suspended child even when the guard dies immediately after CreateProcessW returns', async () => {
  const root = await mkdtemp(join(tmpdir(), 'owned-process-creation-crash-'))
  const journal = join(root, 'journal')
  await mkdir(journal)
  const nonce = randomBytes(32).toString('hex')
  const key = randomBytes(32)
  const bindingHash = createHash('sha256').update(source).update(nonce).digest('hex')
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'owned-native-creation-crash-fixture-v1', parentPid: pid, nonce, bindingHash }))
  const marker = join(root, 'must-not-execute.txt')
  // Widen the actual post-creation boundary in a test-only source copy. The
  // former separate CreateProcess/AssignProcess implementation leaves an
  // orphan at this same boundary; a correct Job-list creation does not.
  const boundary = /^\s*if \(!CreateProcessW\(.*out Child\)\) throw new InvalidOperationException\("CHILD_CREATE"\);$/gmu
  expect([...source.matchAll(boundary)]).toHaveLength(1)
  const instrumented = source.replace(boundary, '$&\nWriteReceipt("created.json",new {version=1,kind="created",nonce=Nonce,bindingHash=Binding,guardPid=GuardId,parentPid=ParentId,rootPid=Child.ProcessId});Thread.Sleep(15000);')
  const sourcePath = join(root, 'fault-fixture.cs')
  const executable = join(root, 'fault-fixture.exe')
  await writeFile(sourcePath, instrumented)
  await powershell('$ErrorActionPreference=\'Stop\';$r=[Console]::In.ReadToEnd()|ConvertFrom-Json;Add-Type -Path $r.source -OutputAssembly $r.executable -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll', { source: sourcePath, executable })
  const guard = spawn(executable, [journal], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const exited = new Promise<void>((resolveExit, reject) => { guard.once('error', reject); guard.once('exit', () => resolveExit()) })
  const closed = new Promise<void>(resolveClose => guard.once('close', () => resolveClose()))
  guard.stdout?.resume()
  guard.stderr?.resume()
  const request = { version: 1, nonce, bindingHash, parentProcessId: pid, expiresAt: Date.now() + 30_000, executable: execPath, arguments: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)},${JSON.stringify(nonce)})`], cwd: root, shellCommandLine: null, owner: 'owned-creation-crash-fixture' }
  const bytes = Buffer.from(JSON.stringify(request))
  guard.stdin?.end(`${JSON.stringify({ payload: bytes.toString('base64'), mac: createHmac('sha256', key).update(bytes).digest('hex'), key: key.toString('hex') })}\n`)
  let target: { pid: number, ticks?: string } | undefined
  const inspect = async (stop = false) => JSON.parse(await powershell(inspectScript, { pid: target!.pid, ticks: target!.ticks, nonce, executable: execPath, stop })) as { state: 'running' | 'stopped', ticks?: string }
  let cleanupProven = false
  try {
    const deadline = Date.now() + 10_000
    let encoded: string | null = null
    while (Date.now() < deadline) {
      encoded = await readFile(join(journal, 'created.json'), 'utf8').catch(() => null)
      if (encoded)
        break
      await new Promise(resolveWait => setTimeout(resolveWait, 20))
    }
    expect(encoded).not.toBeNull()
    const envelope = JSON.parse(encoded!)
    const body = Buffer.from(envelope.payload, 'base64')
    expect(timingSafeEqual(Buffer.from(envelope.mac, 'hex'), createHmac('sha256', key).update(body).digest())).toBe(true)
    const facts = JSON.parse(body.toString('utf8'))
    expect(facts).toMatchObject({ version: 1, kind: 'created', nonce, bindingHash, guardPid: guard.pid, parentPid: pid })
    expect(facts.rootPid).toBeGreaterThan(0)
    target = { pid: facts.rootPid }
    const before = await inspect()
    expect(before.state).toBe('running')
    target.ticks = before.ticks
    guard.kill('SIGKILL')
    await exited
    expect((await inspect()).state).toBe('stopped')
    await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(journal, 'result.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally {
    if (guard.exitCode === null && guard.signalCode === null)
      guard.kill('SIGKILL')
    // Exit can precede pipe closure. Reap an owned regression orphan using its
    // original image/nonce/birth and retained native handle before waiting for
    // inherited pipe handles to drain. Retain files if that proof fails.
    await exited
    if (target)
      cleanupProven = (await inspect(true)).state === 'stopped'
    await closed
    if (cleanupProven)
      await rm(root, { recursive: true, force: true })
  }
}, 35_000)
