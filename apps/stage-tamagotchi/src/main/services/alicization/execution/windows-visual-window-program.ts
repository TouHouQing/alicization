import type { ChildProcess, ExecFileException } from 'node:child_process'

import type { WindowsWindowIdentity } from './windows-window-identity'

import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { arch, pid, platform } from 'node:process'

import * as v from 'valibot'

import native from './windows-keyboard-native.cs?raw'
import visualProcess from './windows-visual-window-process.cs?raw'
import script from './windows-visual-window-program.ps1?raw'
import visual from './windows-visual-window.cs?raw'

import { awaitAlicizationPromiseWithAbort } from '../main-chat-stream-primitives'
import { validateVisualWindowGeometry } from './visual-window-geometry'
import { windowsVisualAuthoritySchema } from './windows-visual-authority'
import { windowsWindowIdentitySchema } from './windows-window-identity'

const hashSchema = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))
const ticks = v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u))
const healthSchema = v.strictObject({ kind: v.literal('windows-visual-window-health-v1'), pid: v.pipe(v.number(), v.integer(), v.minValue(1)), bitness: v.literal(64), inputEvents: v.literal(0), captured: v.literal(false), hooksInstalled: v.literal(false) })
const captureSchema = v.strictObject({
  ok: v.literal(true),
  owner: windowsWindowIdentitySchema,
  authority: windowsVisualAuthoritySchema,
  geometry: v.unknown(),
  observedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  imageSha256: hashSchema,
  png: v.pipe(v.string(), v.minLength(44), v.maxLength(5592408)),
  inputEvents: v.literal(0),
  foregroundActivated: v.literal(false),
})
const failureSchema = v.strictObject({ ok: v.literal(false), errorCode: v.pipe(v.string(), v.regex(/^WINDOWS_VISUAL_[A-Z_]+$/u)), inputEvents: v.literal(0), foregroundActivated: v.literal(false) })
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
      reject(new Error('WINDOWS_VISUAL_PROGRAM_START_FAILED'))
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
        reject(new Error('WINDOWS_VISUAL_PROGRAM_EXECUTION_FAILED'))
        return
      }
      try {
        resolve({ value: JSON.parse(completed.stdout), processId: child.pid })
      }
      catch {
        reject(new Error('WINDOWS_VISUAL_PROGRAM_FRAME_INVALID'))
      }
    })
    child.stdin?.on('error', () => { /* Native close supplies the final outcome. */ })
    child.stdin?.end(input === undefined ? undefined : `${JSON.stringify(input)}\n`)
  })
}

/** Fixed native reader owned by the desktop profile, never by model arguments. */
export function createWindowsVisualWindowProgram(protectedRoot: string) {
  let preparation: Promise<VisualProgram> | undefined
  let probing: Promise<v.InferOutput<typeof healthSchema>> | undefined
  let closed = false
  const calls = new Set<Promise<unknown>>()
  const captures = new Set<AbortController>()
  function track<T>(promise: Promise<T>) {
    calls.add(promise)
    void promise.then(() => calls.delete(promise), () => calls.delete(promise))
    return promise
  }
  async function prepare(): Promise<VisualProgram> {
    if (platform !== 'win32' || arch !== 'x64')
      throw new Error('WINDOWS_VISUAL_REQUIRES_WINDOWS_X64')
    if (!isAbsolute(protectedRoot))
      throw new Error('WINDOWS_VISUAL_PROGRAM_ROOT_INVALID')
    await mkdir(protectedRoot, { recursive: true })
    if ((await lstat(protectedRoot)).isSymbolicLink())
      throw new Error('WINDOWS_VISUAL_PROGRAM_LINK')
    const root = await mkdtemp(join(await realpath(protectedRoot), 'visual-window-'))
    const sources = { native, 'visual-window': visual, 'visual-window-process': visualProcess }
    const result = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript], { operation: 'prepare', root, parentProcessId: pid, sources: Object.entries(sources).map(([name, text]) => ({ name, bytes: Buffer.from(text).toString('base64'), sha256: createHash('sha256').update(text).digest('hex') })) }, 30000, 16384)
    const proof = v.parse(v.strictObject({ sha256: hashSchema, parentStartTicks: ticks }), result.value)
    await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-visual-program-v1', processId: pid, parentStartTicks: proof.parentStartTicks, sourceHashes: Object.values(sources).map(text => createHash('sha256').update(text).digest('hex')), executableSha256: proof.sha256, createdAt: Date.now() }), { flag: 'wx' })
    return { root, executable: join(root, 'visual-window.exe'), ...proof }
  }
  function ready() {
    if (closed)
      return Promise.reject(new Error('WINDOWS_VISUAL_PROGRAM_CLOSED'))
    if (!preparation) {
      const pending = track(prepare())
      preparation = pending
      // Release only a settled preparation failure; this never retries capture
      // or adopts a replacement for an already verified native program.
      void pending.catch(() => {
        if (preparation === pending)
          preparation = undefined
      })
    }
    return preparation
  }
  async function verify(program: VisualProgram) {
    if (closed)
      throw new Error('WINDOWS_VISUAL_PROGRAM_CLOSED')
    const info = await lstat(program.executable)
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || createHash('sha256').update(await readFile(program.executable)).digest('hex') !== program.sha256)
      throw new Error('WINDOWS_VISUAL_PROGRAM_CHANGED')
  }
  function health() {
    if (closed)
      return Promise.reject(new Error('WINDOWS_VISUAL_PROGRAM_CLOSED'))
    return probing ??= track((async () => {
      const program = await ready()
      await verify(program)
      const observed = await run(program.executable, ['--health'], undefined, 5000, 4096)
      if (closed)
        throw new Error('WINDOWS_VISUAL_PROGRAM_CLOSED')
      const health = v.parse(healthSchema, observed.value)
      if (health.pid !== observed.processId)
        throw new Error('WINDOWS_VISUAL_HEALTH_PROCESS_CHANGED')
      return health
    })()).finally(() => { probing = undefined })
  }
  async function capture(owner: WindowsWindowIdentity, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const expected = v.parse(windowsWindowIdentitySchema, owner)
    const pending = ready()
    const program = await (signal ? awaitAlicizationPromiseWithAbort(pending, signal) : pending)
    await verify(program)
    signal?.throwIfAborted()
    const controller = new AbortController()
    const combined = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal
    captures.add(controller)
    try {
      const result = await track(run(program.executable, ['--capture'], { version: 1, owner: expected, parentProcessId: pid, parentStartTicks: program.parentStartTicks, expiresAt: Date.now() + 15000 }, 17000, 6 * 1024 * 1024, combined))
      const frame = v.parse(captureSchema, result.value)
      const keys = ['windowId', 'processId', 'processStartTicks', 'windowClass', 'desktop'] as const
      if (keys.some(key => frame.owner[key] !== expected[key]) || frame.observedAt > Date.now() || Date.now() - frame.observedAt > 15000)
        throw new Error('WINDOWS_VISUAL_CAPTURE_OWNER_CHANGED')
      const geometry = validateVisualWindowGeometry(frame.geometry)
      const png = Buffer.from(frame.png, 'base64')
      if (png.byteLength > 4 * 1024 * 1024 || png.toString('base64') !== frame.png || createHash('sha256').update(png).digest('hex') !== frame.imageSha256) {
        png.fill(0)
        throw new Error('WINDOWS_VISUAL_CAPTURE_IMAGE_CHANGED')
      }
      if (closed || combined.aborted) {
        png.fill(0)
        throw combined.reason ?? new Error('WINDOWS_VISUAL_PROGRAM_CLOSED')
      }
      return { owner: frame.owner, geometry, png, observedAt: frame.observedAt, authority: frame.authority }
    }
    finally { captures.delete(controller) }
  }
  return { ready, health, capture, async dispose() {
    closed = true
    for (const controller of captures) controller.abort(new Error('WINDOWS_VISUAL_PROGRAM_CLOSED'))
    await Promise.allSettled(calls)
  } }
}
