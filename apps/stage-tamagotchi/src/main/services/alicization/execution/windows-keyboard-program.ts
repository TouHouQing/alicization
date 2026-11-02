import type { ChildProcess, ExecFileException } from 'node:child_process'

import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { arch, pid, platform } from 'node:process'

import * as v from 'valibot'

import policy from './windows-keyboard-hook-policy.cs?raw'
import hooks from './windows-keyboard-hooks.cs?raw'
import native from './windows-keyboard-native.cs?raw'
import processSource from './windows-keyboard-process.cs?raw'
import script from './windows-keyboard-program.ps1?raw'
import receipts from './windows-keyboard-receipts.cs?raw'
import session from './windows-keyboard-session.cs?raw'
import shared from './windows-keyboard-shared-state.cs?raw'

import { windowsWindowIdentitySchema } from './windows-window-identity'

const identityText = v.pipe(v.string(), v.minLength(1), v.maxLength(256))
export const windowsKeyboardTargetSchema = v.strictObject({
  ...windowsWindowIdentitySchema.entries,
  inputDesktop: identityText,
  focusWindowId: v.pipe(v.string(), v.regex(/^[1-9]\d{0,18}$/u)),
  integrityLevel: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65_535)),
})
export type WindowsKeyboardTarget = v.InferOutput<typeof windowsKeyboardTargetSchema>
export interface WindowsKeyboardProgram { root: string, executable: string, sha256: string, parentStartTicks: string }

const sources = { native, 'shared-state': shared, 'hook-policy': policy, hooks, session, 'process': processSource, receipts }
const encodedScript = Buffer.from(script, 'utf16le').toString('base64')
const healthSchema = v.strictObject({ kind: v.literal('windows-keyboard-program-health-v1'), pid: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(0x7FFF_FFFF)), layout: v.literal(40), bitness: v.literal(64), hooksInstalled: v.literal(false), inputObserved: v.literal(false), inputEvents: v.literal(0) })

/** A verified executable must actually load; compilation is not OS admission. */
export async function probeWindowsKeyboardStartup(executable: string, launch: typeof execFile = execFile) {
  const result = await new Promise<v.InferOutput<typeof healthSchema>>((resolve, reject) => {
    let completed: { error: ExecFileException | null, stdout: string, stderr: string } | undefined
    let child: ChildProcess
    try {
      child = launch(executable, ['--health'], { windowsHide: true, shell: false, timeout: 5000, maxBuffer: 4096, encoding: 'utf8' }, (error, stdout, stderr) => {
        completed = { error, stdout, stderr }
      })
    }
    catch (error) {
      const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[A-Z_0-9]{1,64}$/u.test(error.code) ? error.code : 'SPAWN_FAILED'
      reject(Object.assign(new Error('WINDOWS_KEYBOARD_PROGRAM_LOAD_FAILED'), { diagnostic: { code } }))
      return
    }
    // A timeout/abort callback is not process closure, including for a probe.
    child.once('close', (code, signal) => {
      if (!completed || completed.error || completed.stderr.length || code !== 0) {
        reject(Object.assign(new Error('WINDOWS_KEYBOARD_PROGRAM_LOAD_FAILED'), { diagnostic: { code: completed?.error?.code ?? code, signal } }))
        return
      }
      try {
        const receipt = v.parse(healthSchema, JSON.parse(completed.stdout))
        if (receipt.pid !== child.pid)
          throw new Error('WINDOWS_KEYBOARD_PROGRAM_HEALTH_PROCESS_CHANGED')
        resolve(receipt)
      }
      catch (error) { reject(error) }
    })
  })
  return { ...result, checkedAt: Date.now() }
}
/** Only the program owner calls this after verifying the bundled executable. */
export async function readWindowsKeyboardForeground(executable: string, launch: typeof execFile = execFile) {
  const output = await new Promise<string>((resolve, reject) => {
    launch(executable, ['--observe'], { windowsHide: true, shell: false, timeout: 5000, maxBuffer: 32_768, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error || stderr.length) {
        reject(new Error('WINDOWS_KEYBOARD_OBSERVATION_FAILED'))
        return
      }
      resolve(stdout)
    })
  })
  return v.parse(windowsKeyboardTargetSchema, JSON.parse(output))
}

async function invoke(input: Record<string, unknown>, timeout: number) {
  return new Promise<unknown>((resolve, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-InputFormat', 'Text', '-OutputFormat', 'Text', '-EncodedCommand', encodedScript], { windowsHide: true, timeout, maxBuffer: 32_768, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(new Error('WINDOWS_KEYBOARD_PROGRAM_WORKER_FAILED'), { diagnostic: { operation: input.operation, code: error.code, signal: error.signal, stdout: stdout.slice(-1024), stderr: stderr.slice(-4096) } }))
        return
      }
      try {
        resolve(JSON.parse(stdout.trim()))
      }
      catch (error) { reject(error) }
    })
    child.stdin?.on('error', () => { /* execFile reports the failed worker. */ })
    child.stdin?.end(`${JSON.stringify(input)}\n`)
  })
}

/**
 * The caller supplies its protected userData subtree, never a model path.
 * Preparing verifies layout only: no hooks, foreground reads or input events.
 */
export function createWindowsKeyboardProgram(protectedRoot: string) {
  let preparation: Promise<WindowsKeyboardProgram> | undefined
  let probing: ReturnType<typeof probeWindowsKeyboardStartup> | undefined
  let closed = false
  const calls = new Set<Promise<unknown>>()
  function track<T>(work: Promise<T>) {
    calls.add(work)
    void work.then(() => calls.delete(work), () => calls.delete(work))
    return work
  }
  function call(input: Record<string, unknown>, timeout: number) {
    if (closed)
      throw new Error('WINDOWS_KEYBOARD_PROGRAM_CLOSED')
    return track(invoke(input, timeout))
  }
  async function prepare() {
    if (platform !== 'win32' || arch !== 'x64')
      throw new Error('WINDOWS_KEYBOARD_REQUIRES_WINDOWS_X64')
    await mkdir(protectedRoot, { recursive: true })
    if ((await lstat(protectedRoot)).isSymbolicLink())
      throw new Error('WINDOWS_KEYBOARD_PROGRAM_LINK')
    const parent = await realpath(protectedRoot)
    const root = await mkdtemp(join(parent, 'keyboard-'))
    const output = v.parse(v.strictObject({ sha256: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u)), parentStartTicks: v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u)), layout: v.literal(40) }), await call({
      operation: 'prepare',
      root,
      parentProcessId: pid,
      sources: Object.entries(sources).map(([name, text]) => ({ name, bytes: Buffer.from(text).toString('base64'), sha256: createHash('sha256').update(text).digest('hex') })),
    }, 30_000))
    return { root, executable: join(root, 'keyboard.exe'), sha256: output.sha256, parentStartTicks: output.parentStartTicks }
  }
  function ready() {
    if (closed)
      return Promise.reject(new Error('WINDOWS_KEYBOARD_PROGRAM_CLOSED'))
    if (!preparation) {
      const pending = prepare()
      preparation = pending
      // A failed compiler/storage attempt must not poison later health probes.
      // Evict only after preparation settles; no actor or input is replayed.
      void pending.catch(() => {
        if (preparation === pending)
          preparation = undefined
      })
    }
    return preparation
  }
  async function verify(program: WindowsKeyboardProgram) {
    if (closed)
      throw new Error('WINDOWS_KEYBOARD_PROGRAM_CLOSED')
    const info = await lstat(program.executable)
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || createHash('sha256').update(await readFile(program.executable)).digest('hex') !== program.sha256)
      throw new Error('WINDOWS_KEYBOARD_PROGRAM_CHANGED')
  }
  async function observe() {
    const program = await ready()
    await verify(program)
    if (closed)
      throw new Error('WINDOWS_KEYBOARD_PROGRAM_CLOSED')
    return track(readWindowsKeyboardForeground(program.executable))
  }
  function health() {
    if (closed)
      return Promise.reject(new Error('WINDOWS_KEYBOARD_PROGRAM_CLOSED'))
    if (!probing) {
      probing = track((async () => {
        const program = await ready()
        await verify(program)
        if (closed)
          throw new Error('WINDOWS_KEYBOARD_PROGRAM_CLOSED')
        const receipt = await probeWindowsKeyboardStartup(program.executable)
        await verify(program)
        return receipt
      })()).finally(() => { probing = undefined })
    }
    return probing
  }
  async function dispose() {
    closed = true
    // These workers only compile or read. Await their bounded actual closure;
    // the input actor/guardian has its separate release protocol.
    await Promise.allSettled([...calls, ...(preparation ? [preparation] : [])])
  }
  return { ready, verify, observe, health, dispose }
}
