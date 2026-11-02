import { createHash, randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

import { expect, it, vi } from 'vitest'

import fixtureSource from './native-menu-test-fixture.cs?raw'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createLifeWindowsDesktopRuntime } from '../life-windows-desktop-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { prepareWindowsProcessJob } from './windows-process-job'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')

// A real WPF menu can activate its window during Expand(), even if its window
// has WS_EX_NOACTIVATE. Ordinary background QA must refuse before that call.
it.skipIf(platform !== 'win32' || process.env.LIFE_QA_NATIVE_MENU !== '1').each(['bound', 'literal'])('refuses an actual passive WPF menu before dispatch and keeps explicit retries passive: %s', async (target) => {
  const root = await mkdtemp(join(tmpdir(), 'life-passive-menu-'))
  const nonce = randomBytes(16).toString('hex')
  const marker = join(root, 'menu-marker.txt')
  const statePath = join(root, 'state.json')
  const stopPath = join(root, 'stop')
  const program = join(root, 'fixture.ps1')
  const script = `\uFEFF$ErrorActionPreference='Stop'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$inputData=[Console]::In.ReadLine()|ConvertFrom-Json
$bytes=[Convert]::FromBase64String($inputData.source)
$sha=[Security.Cryptography.SHA256]::Create()
try{$actual=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
if($actual -cne $inputData.sourceSha256){throw 'FIXED_SOURCE_CHANGED'}
Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase,System.Xaml,System.Web.Extensions
$refs=@('System.dll','System.Core.dll','System.Xaml.dll','System.Web.Extensions.dll',[System.Windows.Window].Assembly.Location,[System.Windows.Media.Brush].Assembly.Location,[System.Windows.DependencyObject].Assembly.Location)
Add-Type -ReferencedAssemblies $refs -TypeDefinition ([Text.Encoding]::UTF8.GetString($bytes))
[OwnedPassiveMenuFixture]::Run(($inputData|ConvertTo-Json -Depth 4 -Compress))
`
  await writeFile(program, script, { flag: 'wx' })
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-passive-menu-test-v1', root, nonce }), { flag: 'wx' })
  const prepared = await prepareWindowsProcessJob({ command: join(process.env.SystemRoot ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), args: ['-NoProfile', '-NonInteractive', '-Sta', '-ExecutionPolicy', 'Bypass', '-File', program], cwd: root, env: { ...process.env, PSModulePath: 'C:/Windows/System32/WindowsPowerShell/v1.0/Modules' }, owner: `passive-menu:${nonce}`, protectedRoot: join(root, 'native-job') })
  const job = prepared.start(async () => sha256(await readFile(program)) === sha256(script))
  let stdout = ''
  let stderr = ''
  job.child.stdout?.on('data', (bytes) => { stdout = (stdout + bytes.toString()).slice(-16000) })
  job.child.stderr?.on('data', (bytes) => { stderr = (stderr + bytes.toString()).slice(-8000) })
  job.child.stdin!.end(`${JSON.stringify({ nonce, root, marker, statePath, stopPath, source: Buffer.from(fixtureSource).toString('base64'), sourceSha256: sha256(fixtureSource) })}\n`)
  let db: Awaited<ReturnType<typeof setupAlicizationDb>> | undefined
  let work: ReturnType<typeof createWorkPlanExecutionRuntime> | undefined
  let completed = false
  try {
    const deadline = Date.now() + 25000
    while (!stdout.includes('\n')) {
      if (Date.now() >= deadline)
        throw new Error(`Owned passive WPF fixture did not become ready: ${stderr}`)
      await delay(25)
    }
    const ready = JSON.parse(stdout.split('\n')[0]) as { nonce: string, outsideAllDisplays: boolean, foreground: boolean, processId: number, processStartTicks: string, windowId: string, windowTitle: string }
    expect(ready).toMatchObject({ nonce, outsideAllDisplays: true, foreground: false })
    db = await setupAlicizationDb(join(root, 'life'), { cardId: 'owned-menu' })
    const database = db
    const broker = createExecutionResourceBroker()
    const errors: unknown[] = []
    const calls: Array<{ id: string, output: Record<string, unknown> }> = []
    const adapter = createLifeWindowsDesktopRuntime({ ownerId: () => 'owned-menu', authorize: async (request) => {
      expect(JSON.parse(request.targetId)).toMatchObject({ windowId: ready.windowId, processId: ready.processId, processStartTicks: ready.processStartTicks })
      return { allow: true, reason: 'Exact nonce/PID/start/HWND owned passive test only' }
    } })
    const tools = {
      'tool.desktop_list_interactables': async (input: Record<string, unknown>, abortSignal: AbortSignal) => {
        expect(input.windowTitle).toBe(ready.windowTitle)
        const output = await adapter.listDesktopInteractables({ ...input, abortSignal })
        expect(output).toMatchObject({ ok: true, windowId: ready.windowId, processId: ready.processId, processStartTicks: ready.processStartTicks })
        calls.push({ id: 'read', output })
        return output
      },
      'tool.desktop_click_element': async (input: Record<string, unknown>, abortSignal: AbortSignal) => {
        const output = await adapter.clickDesktopElement({ ...input, abortSignal })
        calls.push({ id: 'click', output })
        return output
      },
    }
    work = createWorkPlanExecutionRuntime({ getDatabase: () => database, enabled: card => card === 'owned-menu', canContinue: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), tools, onError: error => errors.push(error) })
    const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
    await life.admit({ cardId: 'owned-menu', turnId: nonce, conversationId: 'passive-menu', messages: [{ role: 'user', content: 'Only operate the exact synthetic owned passive menu.' }] }, new AbortController().signal)
    const accepted = await work.propose({ cardId: 'owned-menu', turnId: nonce, goal: 'Verify no background menu activation', criteria: [{ id: 'marker', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: marker, sha256: sha256(nonce) } }], steps: [
      { id: 'read', capabilityId: 'tool.desktop_list_interactables', input: { windowTitle: ready.windowTitle, maxItems: 120 }, dependsOn: [], acceptanceCriterionIds: [] },
      { id: 'menu', capabilityId: 'tool.desktop_click_element', input: { windowTitle: ready.windowTitle, text: target === 'literal' ? 'Owned file options' : '@current', role: 'menu-item', exactText: true }, ...(target === 'bound' ? { inputBindings: [{ parameter: 'text', stepId: 'read', path: ['elements'], select: { field: 'name', equals: 'Owned file options', valueField: 'name' } }] } : {}), dependsOn: ['read'], acceptanceCriterionIds: ['marker'] },
    ] })
    for (let round = 1; round <= 3; round++) {
      await vi.waitFor(() => expect(work!.isActive()).toBe(false), { timeout: 20000 })
      const view = await database.readLifeState({ executionPlanId: accepted.planId })
      expect(view.execution!.plans[0].revision).toBe(round)
      expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).toBe('blocked')
      expect(calls.filter(call => call.id === 'read')).toHaveLength(round)
      expect(calls.filter(call => call.id === 'click')).toHaveLength(round)
      for (const call of calls.filter(call => call.id === 'click'))
        expect(call.output).toMatchObject({ ok: false, errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED', requiresForeground: true, effectMayHaveOccurred: false, sideEffectState: 'none' })
      expect(JSON.parse(await readFile(statePath, 'utf8'))).toMatchObject({ nonce, clicks: 0, submenuOpen: false, actionVisible: false, foregroundTaken: false })
      await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' })
      if (round < 3)
        expect(await work.start({ cardId: 'owned-menu', planId: accepted.planId, expectedRevision: round, requestId: `explicit-passive-continue-${round}` })).toEqual({ state: 'accepted' })
    }
    expect(errors).toEqual([])
    completed = true
  }
  finally {
    await work?.dispose()
    await db?.close()
    await writeFile(stopPath, 'stop', { flag: 'wx' })
    let timer: ReturnType<typeof setTimeout> | undefined
    let outcome = await Promise.race([job.completion, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 5000) })])
    clearTimeout(timer)
    if (!outcome) {
      job.stop('passive-menu-fixture-cleanup')
      outcome = await job.completion
    }
    expect(outcome.treeStopped).toBe(true)
    expect(outcome.receipt?.exitCode).toBe(0)
    if (completed)
      await rm(root, { recursive: true, force: true })
  }
}, 120000)
