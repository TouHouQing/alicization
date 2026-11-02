import type { ChildProcess, ExecFileException } from 'node:child_process'

import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { arch, pid, platform } from 'node:process'

import * as v from 'valibot'

import native from './windows-keyboard-native.cs?raw'
import receipts from './windows-keyboard-receipts.cs?raw'
import shared from './windows-keyboard-shared-state.cs?raw'
import policy from './windows-pointer-hook-policy.cs?raw'
import hooks from './windows-pointer-hooks.cs?raw'
import plan from './windows-pointer-plan.cs?raw'
import processSource from './windows-pointer-process.cs?raw'
import script from './windows-pointer-program.ps1?raw'
import session from './windows-pointer-session.cs?raw'
import pointerState from './windows-pointer-shared-state.cs?raw'
import visual from './windows-visual-window.cs?raw'

import { windowsKeyboardTargetSchema } from './windows-keyboard-program'

const hashSchema = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))
const ticks = v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u))
const healthSchema = v.strictObject({ kind: v.literal('windows-pointer-program-health-v1'), pid: v.pipe(v.number(), v.integer(), v.minValue(1)), bitness: v.literal(64), inputEvents: v.literal(0), layout: v.literal(40), inputObserved: v.literal(false), hooksInstalled: v.literal(false) })
const failureSchema = v.strictObject({ ok: v.literal(false), errorCode: v.pipe(v.string(), v.regex(/^WINDOWS_POINTER_[A-Z_]+$/u)), inputEvents: v.literal(0), foregroundActivated: v.literal(false) })
interface VisualProgram { root: string, executable: string, sha256: string, parentStartTicks: string }
const encodedScript = Buffer.from(script, 'utf16le').toString('base64')

/** Buffer child output privately and settle only after its actual close event. */
async function run(executable: string, args: string[], input: unknown, timeoutMs: number, maxBuffer: number, signal?: AbortSignal) {
  signal?.throwIfAborted()
  return new Promise<{ value: unknown, processId: number }>((resolve, reject) => {
    let child: ChildProcess
    let completed: { error: ExecFileException | null, stdout: string, stderr: string } | undefined
    try {
      child = execFile(executable, args, { windowsHide: true, shell: false, encoding: 'utf8', timeout: timeoutMs, maxBuffer, signal }, (error, stdout, stderr) => {
        completed = { error, stdout, stderr }
      })
    }
    catch {
      reject(new Error('WINDOWS_POINTER_PROGRAM_START_FAILED'))
      return
    }
    child.once('close', (code) => {
      if (signal?.aborted) {
        reject(signal.reason)
        return
      }
      // A whole native refusal frame is safe to expose; arbitrary stdout and
      // stderr can contain image bytes and must never be copied into errors.
      if (completed && !completed.stderr && completed.stdout.length < 4096) {
        try {
          const result = v.safeParse(failureSchema, JSON.parse(completed.stdout))
          if (result.success) {
            reject(new Error(result.output.errorCode))
            return
          }
        }
        catch { /* The strict success path below decides malformed frames. */ }
      }
      if (!completed || completed.error || completed.stderr || code !== 0 || !child.pid) {
        reject(new Error('WINDOWS_POINTER_PROGRAM_EXECUTION_FAILED'))
        return
      }
      try {
        resolve({ value: JSON.parse(completed.stdout), processId: child.pid })
      }
      catch {
        reject(new Error('WINDOWS_POINTER_PROGRAM_FRAME_INVALID'))
      }
    })
    child.stdin?.on('error', () => { /* Native close supplies the final outcome. */ })
    child.stdin?.end(input === undefined ? undefined : `${JSON.stringify(input)}\n`)
  })
}

/** Fixed finite pointer program owned by the profile, never by model arguments. */
export function createWindowsPointerProgram(protectedRoot: string) {
  let preparation: Promise<VisualProgram> | undefined
  let probing: Promise<v.InferOutput<typeof healthSchema>> | undefined
  let closed = false
  const calls = new Set<Promise<unknown>>()
  function track<T>(promise: Promise<T>) {
    calls.add(promise)
    void promise.then(() => calls.delete(promise), () => calls.delete(promise))
    return promise
  }
  async function prepare(): Promise<VisualProgram> {
    if (platform !== 'win32' || arch !== 'x64')
      throw new Error('WINDOWS_POINTER_REQUIRES_WINDOWS_X64')
    if (!isAbsolute(protectedRoot))
      throw new Error('WINDOWS_POINTER_PROGRAM_ROOT_INVALID')
    await mkdir(protectedRoot, { recursive: true })
    if ((await lstat(protectedRoot)).isSymbolicLink())
      throw new Error('WINDOWS_POINTER_PROGRAM_LINK')
    const root = await mkdtemp(join(await realpath(protectedRoot), 'pointer-'))
    const sources = { native, 'shared-state': shared, 'pointer-shared-state': pointerState, 'pointer-hook-policy': policy, 'pointer-hooks': hooks, 'pointer-session': session, 'pointer-plan': plan, 'pointer-process': processSource, receipts, 'visual-window': visual }
    const result = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript], { operation: 'prepare', root, parentProcessId: pid, sources: Object.entries(sources).map(([name, text]) => ({ name, bytes: Buffer.from(text).toString('base64'), sha256: createHash('sha256').update(text).digest('hex') })) }, 30000, 16384)
    const proof = v.parse(v.strictObject({ sha256: hashSchema, parentStartTicks: ticks }), result.value)
    await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-pointer-program-v1', processId: pid, parentStartTicks: proof.parentStartTicks, sourceHashes: Object.values(sources).map(text => createHash('sha256').update(text).digest('hex')), executableSha256: proof.sha256, createdAt: Date.now() }), { flag: 'wx' })
    return { root, executable: join(root, 'pointer.exe'), ...proof }
  }
  function ready() {
    if (closed)
      return Promise.reject(new Error('WINDOWS_POINTER_PROGRAM_CLOSED'))
    if (!preparation) {
      const pending = track(prepare())
      preparation = pending
      // Preparation has no input effects. A later call may retry its failure;
      // successful ownership and the actor's independent guards stay pinned.
      void pending.catch(() => {
        if (preparation === pending)
          preparation = undefined
      })
    }
    return preparation
  }
  async function verify(program: VisualProgram) {
    if (closed)
      throw new Error('WINDOWS_POINTER_PROGRAM_CLOSED')
    const info = await lstat(program.executable)
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || createHash('sha256').update(await readFile(program.executable)).digest('hex') !== program.sha256)
      throw new Error('WINDOWS_POINTER_PROGRAM_CHANGED')
  }
  function health() {
    if (closed)
      return Promise.reject(new Error('WINDOWS_POINTER_PROGRAM_CLOSED'))
    return probing ??= track((async () => {
      const program = await ready()
      await verify(program)
      const observed = await run(program.executable, ['--health'], undefined, 5000, 4096)
      if (closed)
        throw new Error('WINDOWS_POINTER_PROGRAM_CLOSED')
      const health = v.parse(healthSchema, observed.value)
      if (health.pid !== observed.processId)
        throw new Error('WINDOWS_POINTER_HEALTH_PROCESS_CHANGED')
      return health
    })()).finally(() => { probing = undefined })
  }
  async function dispose() {
    closed = true
    await Promise.allSettled([...calls, ...(preparation ? [preparation] : [])])
  }
  async function observe() {
    const program = await ready()
    await verify(program)
    const result = await track(run(program.executable, ['--observe'], undefined, 5000, 4096))
    if (closed)
      throw new Error('WINDOWS_POINTER_PROGRAM_CLOSED')
    return v.parse(windowsKeyboardTargetSchema, result.value)
  }
  return { ready, verify, health, observe, dispose }
}
