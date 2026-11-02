import process from 'node:process'

import { Buffer } from 'node:buffer'
import { execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, expect, it } from 'vitest'

import source from './fixtures/windows-process-adapter-fixture.cs?raw'
import inspection from './fixtures/windows-process-fixture-inspection.ps1?raw'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createHostExecutionRecovery } from './host-recovery'
import { createExecutionResourceBroker } from './resource-broker'

const enabled = process.platform === 'win32'
const delay = (ms: number) => new Promise<void>(resolveWait => setTimeout(resolveWait, ms))
let root = ''
let transports = ''
async function powershell(script: string, input: object) {
  return new Promise<string>((resolveOutput, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20_000, encoding: 'utf8', maxBuffer: 16_384 }, (error, stdout) => error ? reject(error) : resolveOutput(stdout))
    child.stdin?.on('error', () => { /* The worker callback owns failure. */ })
    child.stdin?.end(JSON.stringify(input))
  })
}
beforeAll(async () => {
  if (!enabled)
    return
  root = await mkdtemp(join(tmpdir(), 'owned-process-owner-crash-'))
  transports = join(root, 'transports')
  await mkdir(transports)
  await mkdir(join(transports, 'codex-home'))
  await writeFile(join(transports, 'codex-home/auth.json'), '{"owned":"synthetic-only"}')
  const sourcePath = join(transports, 'fixture.cs')
  await writeFile(sourcePath, source)
  await powershell('$ErrorActionPreference=\'Stop\';$r=[Console]::In.ReadToEnd()|ConvertFrom-Json;Add-Type -Path $r.source -OutputAssembly $r.executable -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll', { source: sourcePath, executable: join(transports, 'claude.exe') })
  await copyFile(join(transports, 'claude.exe'), join(transports, 'codex.exe'))
}, 30_000)
afterAll(async () => {
  // Individual rounds remove only after their original processes are stopped.
  if (root && (await readdir(root)).every(name => name === 'transports'))
    await rm(root, { recursive: true, force: true })
})

for (const channel of ['cli', 'codex', 'claude-code'] as const) {
  it.skipIf(!enabled).each(['suspended', 'actuated', 'result', 'committed'] as const)(`recovers the actual ${channel} owner crash at %s without replaying or certifying unknown effects`, async (boundary) => {
    for (let round = 1; round <= 3; round++) {
      const nonce = randomUUID().replaceAll('-', '')
      const directory = join(root, `${channel}-${boundary}-${round}-${nonce}`)
      await mkdir(directory)
      await writeFile(join(directory, 'owner.json'), JSON.stringify({ format: 'owned-process-owner-crash-v1', nonce, parentPid: process.pid, channel, boundary, round }))
      const worker = fileURLToPath(new URL('./fixtures/windows-process-owner-worker.ts', import.meta.url))
      // tsx's CLI adds a launcher process; --import keeps this exact ChildProcess
      // as the production owner whose native handle the guard must observe.
      const actor = spawn(process.execPath, ['--import', 'tsx', worker, directory, channel, boundary, nonce, transports], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      let output = ''
      actor.stdout?.on('data', chunk => output = (output + String(chunk)).slice(-8192))
      actor.stderr?.on('data', chunk => output = (output + String(chunk)).slice(-8192))
      const closed = new Promise<void>((resolveClosed, reject) => {
        actor.once('error', reject)
        actor.once('close', () => resolveClosed())
      })
      const targets: Array<{ pid: number, executable: string, nonce: string, ticks?: string }> = []
      const inspect = async (target: typeof targets[number], stop = false) => JSON.parse(await powershell(inspection, { ...target, stop })) as { state: string, ticks?: string }
      let cleanupProven = false
      let lineageCaptured = false
      let roundPassed = false
      let database: Awaited<ReturnType<typeof setupAlicizationDb>> | undefined
      try {
        const deadline = Date.now() + 20_000
        let reached = false
        while (Date.now() < deadline) {
          const marker = join(directory, boundary === 'actuated' ? 'workspace/writer.json' : 'boundary.json')
          reached = await readFile(marker, 'utf8').then(text => JSON.parse(text).nonce === nonce, () => false)
          if (reached)
            break
          if (actor.exitCode !== null || actor.signalCode !== null)
            throw new Error(`Owned actual owner exited before ${boundary}: ${output}`)
          await delay(25)
        }
        expect(reached, output).toBe(true)
        // Capture the real root/guard lineage while the original owner is alive.
        const native = join(directory, 'native')
        for (const program of await readdir(native)) {
          for (const run of await readdir(join(native, program))) {
            if (!run.startsWith('run-'))
              continue
            const journal = join(native, program, run)
            const owner = JSON.parse(await readFile(join(journal, 'owner.json'), 'utf8'))
            const ready = JSON.parse(Buffer.from(JSON.parse(await readFile(join(journal, 'ready.json'), 'utf8')).payload, 'base64').toString('utf8'))
            expect(ready).toMatchObject({ parentPid: actor.pid, nonce: owner.nonce, bindingHash: owner.bindingHash })
            if (boundary === 'suspended' || boundary === 'actuated') {
              for (const target of [{ pid: ready.guardPid, executable: join(native, program, 'process-job.exe'), nonce: journal }, { pid: ready.rootPid, executable: channel === 'cli' ? process.execPath : join(transports, `${channel === 'codex' ? 'codex' : 'claude'}.exe`), nonce }]) {
                const result = await inspect({ ...target, ticks: String(target.pid === ready.rootPid ? ready.rootStartTicks : ready.guardStartTicks) })
                expect(result.state).toBe('running')
                targets.push({ ...target, ticks: result.ticks })
              }
            }
          }
        }
        if (boundary === 'actuated') {
          const writer = JSON.parse(await readFile(join(directory, 'workspace/writer.json'), 'utf8'))
          const target = { pid: writer.pid, executable: process.execPath, nonce }
          const observed = await inspect(target)
          expect(observed.state).toBe('running')
          targets.push({ ...target, ticks: observed.ticks })
        }
        lineageCaptured = true
        actor.kill('SIGKILL')
        await closed
        // Parent-handle observation and kernel Job closure must stop descendants.
        for (const target of targets) {
          let state = 'running'
          const stopDeadline = Date.now() + 6000
          while (state === 'running' && Date.now() < stopDeadline) {
            state = (await inspect(target)).state
            if (state === 'running')
              await delay(25)
          }
          expect(state).toBe('stopped')
        }
        await expect(readFile(join(directory, 'workspace/after-crash.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
        const artifact = await readFile(join(directory, 'workspace/actual.txt'), 'utf8').catch(() => null)
        expect(artifact).toBe(boundary === 'suspended' ? null : `Owned ${channel} ${nonce} 中文🙂`)
        const action = JSON.parse(await readFile(join(directory, 'action.json'), 'utf8'))
        database = await setupAlicizationDb(join(directory, 'life'), { cardId: 'alice' })
        const broker = createExecutionResourceBroker()
        // Match the production boot order: rebuild all host quarantines before
        // the active-card turn runtime classifies the interrupted dispatch.
        const recovered = await createHostExecutionRecovery({ userDataPath: join(directory, 'life'), broker, readCardEffects: async () => database!.readPendingLifeExecutionEffects() }).restore()
        expect(recovered).toEqual({ cards: 1, quarantines: boundary === 'committed' ? 0 : 1 })
        const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: broker, now: Date.now })
        await life.recover('alice')
        const effect = (await database.getLifeEffect(action.effectId))!
        expect(effect.status).toBe(boundary === 'committed' ? 'settled' : 'uncertain')
        const responsibility = (await database.readLifeState()).obligations.find(goal => goal.id === `task:${nonce}`)
        expect(responsibility).toMatchObject({ kind: 'task', threadId: nonce, status: 'accepted', receiptId: null })
        if (boundary !== 'committed') {
          expect(await recoverExecutionEffect({ database, broker, effect, writerStopped: () => true })).toBeNull()
          expect((await database.getLifeEffect(effect.id))?.status).toBe('uncertain')
          expect(broker.snapshot().some(lease => lease.effectId === effect.id && lease.uncertain)).toBe(true)
          await expect(life.beforeAction({ cardId: 'alice', turnId: nonce, actionId: 'owned-dispatch', capabilityId: action.capabilityId, parameters: action.command, effectContract: createCanonicalToolRegistry().resolveActive(action.capabilityId)!.effects }, new AbortController().signal)).rejects.toThrow('verification is required')
        }
        else {
          expect(effect.receipt?.outcome).toBe('success')
        }
        expect(await readFile(join(directory, 'workspace/actual.txt'), 'utf8').catch(() => null)).toBe(artifact)
        roundPassed = true
      }
      finally {
        if (actor.exitCode === null && actor.signalCode === null)
          actor.kill('SIGKILL')
        await closed
        for (const target of targets)
          expect((await inspect(target, true)).state).toBe('stopped')
        cleanupProven = lineageCaptured
        await database?.close()
        if (cleanupProven && roundPassed)
          await rm(directory, { recursive: true, force: true })
      }
    }
  }, 120_000)
}

async function sleepingInspectorActor() {
  const nonce = randomUUID().replaceAll('-', '')
  const actor = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000);setTimeout(()=>process.exit(0),60000)', nonce], { cwd: root, windowsHide: true, stdio: 'ignore' })
  const closed = new Promise<void>((resolveClosed, reject) => {
    actor.once('error', reject)
    actor.once('close', () => resolveClosed())
  })
  await new Promise<void>((resolveStarted, reject) => {
    actor.once('spawn', () => resolveStarted())
    actor.once('error', reject)
  })
  return { actor, nonce, closed }
}

it.skipIf(!enabled)('pinned process inspector refuses wrong image, nonce and birth before stopping an actual owned child', async () => {
  const { actor, nonce, closed } = await sleepingInspectorActor()
  const inspect = async (input: object) => JSON.parse(await powershell(inspection, input)) as { state: string, ticks: string }
  try {
    const original = { pid: actor.pid, executable: process.execPath, nonce, stop: false }
    const observed = await inspect(original)
    expect(observed.state).toBe('running')
    const target = { ...original, ticks: observed.ticks }
    for (const fault of [
      { changes: { nonce: `wrong-${nonce}` }, error: 'Owned fixture image/nonce differs' },
      { changes: { executable: join(root, 'different-owned-image.exe') }, error: 'Owned fixture image/nonce differs' },
      { changes: { ticks: String(BigInt(observed.ticks) + 1n) }, error: 'Original fixture birth differs' },
    ]) {
      await expect(inspect({ ...target, stop: true, ...fault.changes })).rejects.toThrow(fault.error)
      expect(await inspect(target)).toMatchObject({ state: 'running', ticks: observed.ticks })
      expect(actor.exitCode).toBeNull()
    }
    expect(await inspect({ ...target, stop: true })).toMatchObject({ state: 'stopped', ticks: observed.ticks })
    await closed
    expect(actor.exitCode).not.toBeNull()
  }
  finally {
    if (actor.exitCode === null && actor.signalCode === null)
      actor.kill('SIGKILL')
    await closed
  }
}, 60_000)

it.skipIf(!enabled)('pinned process inspector observes an actual exit after CIM without reopening the old PID', async () => {
  const { actor, nonce, closed } = await sleepingInspectorActor()
  const exitAfterCim = String.raw`
function Get-CimInstance {
  param([string]$ClassName,[string]$Filter)
  $observed = CimCmdlets\Get-CimInstance -ClassName $ClassName -Filter $Filter
  if (!$observed -or !$observed.CommandLine.Contains([string]$r.nonce)) { throw 'Race fixture ownership differs' }
  $victim = [Diagnostics.Process]::GetProcessById([int]$r.pid)
  try {
    $pinned = $victim.Handle
    if ($victim.StartTime.ToUniversalTime().Ticks.ToString() -cne [string]$r.ticks) { throw 'Race fixture birth differs' }
    $victim.Kill()
    if (!$victim.WaitForExit(5000)) { throw 'Race fixture did not stop' }
  }
  finally { $victim.Dispose() }
  return $observed
}
`
  try {
    const original = { pid: actor.pid, executable: process.execPath, nonce, stop: false }
    const observed = JSON.parse(await powershell(inspection, original)) as { state: string, ticks: string }
    expect(observed.state).toBe('running')
    expect(JSON.parse(await powershell(exitAfterCim + inspection, { ...original, ticks: observed.ticks }))).toMatchObject({ state: 'stopped' })
    await closed
    expect(actor.exitCode).not.toBeNull()
  }
  finally {
    if (actor.exitCode === null && actor.signalCode === null)
      actor.kill('SIGKILL')
    await closed
  }
}, 60_000)
