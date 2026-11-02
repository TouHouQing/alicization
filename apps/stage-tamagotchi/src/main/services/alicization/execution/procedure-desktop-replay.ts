import type { ProcedureDesktopReplayFactory } from './procedure-desktop-replay-types'
import type { WindowsProcessJob } from './windows-process-job'

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative } from 'node:path'
import { platform } from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

import * as v from 'valibot'

import fixtureSource from './procedure-desktop-fixture.cs?raw'
import fixtureScript from './procedure-desktop-fixture.ps1?raw'

import { createLifeWindowsDesktopRuntime } from '../life-windows-desktop-runtime'
import { markActionNotStarted, markActionNotStartedError } from './action-dispatch-context'
import { readStableExecutionArtifact } from './stable-artifact'
import { prepareWindowsProcessJob } from './windows-process-job'

const nonceSchema = v.pipe(v.string(), v.regex(/^[a-f0-9]{32}$/u))
const readySchema = v.strictObject({ nonce: nonceSchema, processId: v.pipe(v.number(), v.integer(), v.minValue(1)), processStartTicks: v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u)), windowId: v.pipe(v.string(), v.regex(/^[1-9]\d*$/u)), windowTitle: v.string(), outsideAllDisplays: v.literal(true), foreground: v.literal(false) })
const stateSchema = v.strictObject({ nonce: nonceSchema, saves: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1)), content: v.pipe(v.string(), v.maxLength(32_000)), foreground: v.literal(false) })
const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Real passive standard Windows editor in a native Job; no user window or focus. */
export const createProcedureDesktopReplay: ProcedureDesktopReplayFactory = async ({ root, signal }) => {
  signal.throwIfAborted()
  if (platform !== 'win32')
    throw new Error('Native desktop method evaluation requires Windows')
  const ownedRoot = await realpath(root)
  const program = join(ownedRoot, 'desktop-replay.ps1')
  await writeFile(program, `\uFEFF${fixtureScript}`, { flag: 'wx' })
  const programHash = digest(await readFile(program))
  const owner = `desktop-procedure:${randomUUID()}`
  const stats = { saves: 0, refused: 0, content: null as string | null, inFlight: 0 }
  let approvals = 0
  let disposed = false
  let closing: Promise<void> | undefined
  let current: { nonce: string, statePath: string, stopPath: string, job: WindowsProcessJob, ready: v.InferOutput<typeof readySchema>, fault?: string, ended?: boolean } | null = null
  const inside = (file: string) => {
    const child = relative(ownedRoot, file)
    return isAbsolute(file) && Boolean(child) && child !== '..' && !child.startsWith('../') && !child.startsWith('..\\') && !isAbsolute(child)
  }
  const adapter = createLifeWindowsDesktopRuntime({ ownerId: () => owner, authorize: async (request) => {
    approvals++
    if (disposed || signal.aborted || !current || request.cardId !== owner || !['desktop_type_text', 'desktop_click_element'].includes(request.operation))
      return { allow: false, reason: 'Owned desktop replay has stopped' }
    const target = JSON.parse(request.targetId) as Record<string, unknown>
    if (target.windowId !== current.ready.windowId || target.processId !== current.ready.processId || target.processStartTicks !== current.ready.processStartTicks || target.title !== current.ready.windowTitle)
      return { allow: false, reason: 'Owned desktop replay target changed' }
    return { allow: true, reason: 'Only the exact disposable synthetic editor and its current fields' }
  } })
  async function closeCurrent() {
    const previous = current
    current = null
    if (!previous || previous.ended)
      return
    await writeFile(previous.stopPath, 'stop', { flag: 'wx' })
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const outcome = await Promise.race([previous.job.completion, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 5000) })])
      if (!outcome) {
        previous.job.stop('owned-desktop-replay-disposal')
        const stopped = await previous.job.completion
        if (!stopped.treeStopped)
          throw new Error('Native desktop replay lacks an independently verified tree stop')
      }
      else if (!outcome.treeStopped || outcome.receipt?.exitCode !== 0) {
        throw new Error('Native desktop replay did not close normally')
      }
    }
    finally { clearTimeout(timer) }
  }
  async function readState(expected?: { content: string }) {
    if (!current)
      throw new Error('Desktop replay has no current fixture')
    const selected = current
    const deadline = Date.now() + 1500
    for (;;) {
      try {
        const value = v.parse(stateSchema, JSON.parse((await readStableExecutionArtifact(selected.statePath, 128_000)).bytes.toString('utf8')))
        if (Date.now() >= deadline)
          throw new Error('Desktop replay state observation exceeded its original deadline')
        if (selected !== current || value.nonce !== selected.nonce)
          throw new Error('Desktop replay state crossed its fixture')
        if (expected && value.content !== expected.content) {
          // Observe the same acknowledged native input, never replay it. The
          // native pump can publish its readback after WM_SETTEXT returns.
          await delay(Math.min(30, deadline - Date.now()), undefined, { signal })
          continue
        }
        stats.saves = value.saves
        stats.content = value.content
        return
      }
      catch (error) {
        if (Date.now() >= deadline || !error || typeof error !== 'object' || !('code' in error) || !['ENOENT', 'EBUSY'].includes(String(error.code)))
          throw error
        await delay(Math.min(30, deadline - Date.now()), undefined, { signal })
      }
    }
  }
  async function perform(operation: 'read' | 'type' | 'click', input: Record<string, unknown>, actionSignal: AbortSignal) {
    const selected = current
    const combined = AbortSignal.any([signal, actionSignal])
    combined.throwIfAborted()
    if (disposed || !selected || input.windowTitle !== selected.ready.windowTitle)
      throw markActionNotStartedError(new Error('Desktop method may only address its current owned editor'))
    stats.inFlight++
    try {
      // The fixture's host may refuse even an ordinary local action, which
      // correctly needs no risk dialog. Do not call the native adapter then.
      if (operation === 'click' && selected.fault === 'save-refused') {
        stats.refused++
        return markActionNotStarted({ ok: false, errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST', sideEffectState: 'none', effectMayHaveOccurred: false } as const)
      }
      const outcome: Record<string, unknown> = operation === 'read'
        ? await adapter.listDesktopInteractables({ ...input, windowTitle: selected.ready.windowTitle, abortSignal: combined })
        : operation === 'type'
          ? await adapter.typeDesktopText({ ...input, windowTitle: selected.ready.windowTitle, text: input.text as string, abortSignal: combined })
          : await adapter.clickDesktopElement({ ...input, windowTitle: selected.ready.windowTitle, abortSignal: combined })
      if (selected !== current)
        throw new Error('Desktop replay changed during an action')
      if (operation === 'read' && outcome.ok && (outcome.windowId !== selected.ready.windowId || outcome.processId !== selected.ready.processId || outcome.processStartTicks !== selected.ready.processStartTicks))
        throw new Error('Native observation did not identify the exact owned editor')
      await readState(operation === 'type' && outcome.ok === true ? { content: input.text as string } : undefined)
      return outcome
    }
    finally { stats.inFlight-- }
  }
  async function dispose() {
    if (closing)
      return closing
    disposed = true
    signal.removeEventListener('abort', abort)
    closing = closeCurrent()
    return closing
  }
  const abort = () => { void dispose().catch(() => {}) }
  signal.addEventListener('abort', abort, { once: true })
  return {
    async prepare(input) {
      signal.throwIfAborted()
      if (disposed || stats.inFlight || !/^[a-z0-9-]{1,64}$/u.test(input.caseId) || !isAbsolute(input.path) || !input.entryLabel || input.entryLabel.length > 4096 || !input.saveLabel || input.saveLabel.length > 511)
        throw new Error('Desktop replay fixture exceeds its owned input boundary')
      const outputPath = join(await realpath(dirname(input.path)), basename(input.path))
      if (!inside(outputPath))
        throw new Error('Desktop replay output parent escaped its owned fixture')
      await closeCurrent()
      signal.throwIfAborted()
      const nonce = randomUUID().replaceAll('-', '')
      const directory = join(ownedRoot, `desktop-${nonce}`)
      await mkdir(directory)
      const statePath = join(directory, 'state.json')
      const stopPath = join(directory, 'stop')
      const prepared = await prepareWindowsProcessJob({ command: join(process.env.SystemRoot ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), args: ['-NoProfile', '-NonInteractive', '-Sta', '-ExecutionPolicy', 'Bypass', '-File', program], cwd: directory, env: { ...process.env, PSModulePath: 'C:/Windows/System32/WindowsPowerShell/v1.0/Modules' }, owner, protectedRoot: join(ownedRoot, 'native-process') })
      const job = prepared.start(async () => !disposed && !signal.aborted && digest(await readFile(program)) === programHash)
      let errors = ''
      job.child.stderr?.on('data', (bytes) => { errors = `${errors}${String(bytes)}`.slice(-4000) })
      const ready = new Promise<v.InferOutput<typeof readySchema>>((resolve, reject) => {
        let text = ''
        const timer = setTimeout(() => reject(new Error('Owned desktop replay readiness timed out')), 15_000)
        job.child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
          text += chunk
          if (text.length > 8192) {
            clearTimeout(timer)
            reject(new Error('Owned desktop replay readiness exceeds its byte budget'))
          }
          else if (text.includes('\n')) {
            clearTimeout(timer)
            try { resolve(v.parse(readySchema, JSON.parse(text.trim()))) }
            catch (error) { reject(error) }
          }
        })
        job.child.once('close', () => {
          clearTimeout(timer)
          reject(new Error(`Owned desktop replay closed before readiness: ${errors}`))
        })
      })
      job.child.stdin?.end(`${JSON.stringify({ ...input, root: ownedRoot, path: outputPath, nonce, statePath, stopPath, source: Buffer.from(fixtureSource).toString('base64'), sourceSha256: digest(fixtureSource) })}\n`)
      try {
        const actual = await ready
        signal.throwIfAborted()
        if (actual.nonce !== nonce || actual.windowTitle !== `Alicization method replay ${nonce}` || disposed)
          throw new Error('Native desktop replay readiness identity changed')
        current = { nonce, statePath, stopPath, job, ready: actual, fault: input.fault }
        Object.assign(stats, { saves: 0, refused: 0, content: null })
        await readState()
        if (input.fault === 'window-closed')
          await closeCurrent()
        // Keep the ended identity solely to attempt the original observation;
        // the ordinary adapter must return not-found, never a fallback window.
        if (input.fault === 'window-closed')
          current = { nonce, statePath, stopPath, job, ready: actual, fault: input.fault, ended: true }
        return { windowTitle: actual.windowTitle }
      }
      catch (error) {
        job.stop('owned-desktop-readiness-failed')
        if (!(await job.completion).treeStopped)
          throw new Error('Failed desktop replay left an unverified native tree')
        throw error
      }
    },
    snapshot: () => ({ ...stats }),
    approvalCount: () => approvals,
    tools: {
      'tool.desktop_list_interactables': (input, actionSignal) => perform('read', input, actionSignal),
      'tool.desktop_type_text': (input, actionSignal) => perform('type', input, actionSignal),
      'tool.desktop_click_element': (input, actionSignal) => perform('click', input, actionSignal),
    },
    dispose,
  }
}
