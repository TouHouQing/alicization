import type { ChildProcess } from 'node:child_process'

import { Buffer } from 'node:buffer'
import { execFile, spawn } from 'node:child_process'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { env as hostEnv, pid, platform } from 'node:process'

import * as v from 'valibot'

import compiler from './windows-process-job-program.ps1?raw'
import source from './windows-process-job.cs?raw'

const hashText = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))
const positiveInt = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(0x7FFF_FFFF))
const ticks = v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u))
const readySchema = v.strictObject({ version: v.literal(1), kind: v.literal('ready'), nonce: hashText, bindingHash: hashText, guardPid: positiveInt, guardStartTicks: ticks, parentPid: positiveInt, parentStartTicks: ticks, rootPid: positiveInt, rootStartTicks: ticks, started: v.literal(false) })
const resultSchema = v.strictObject({ version: v.literal(1), kind: v.literal('result'), nonce: hashText, bindingHash: hashText, guardPid: positiveInt, parentPid: positiveInt, rootPid: v.pipe(v.number(), v.integer(), v.minValue(0)), started: v.boolean(), treeStopped: v.boolean(), activeProcesses: v.pipe(v.number(), v.integer(), v.minValue(-1)), exitCode: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(0xFFFF_FFFF)), reason: v.pipe(v.string(), v.regex(/^[a-z-]{1,64}$/u)), errorCode: v.nullable(v.pipe(v.string(), v.regex(/^WINDOWS_PROCESS_JOB_[A-Z_0-9]+$/u))), observedAt: v.pipe(v.number(), v.integer(), v.minValue(1)) })
export type WindowsProcessJobReceipt = v.InferOutput<typeof resultSchema>
export interface WindowsProcessJobOutcome { receipt: WindowsProcessJobReceipt | null, journalRoot: string, dispatchRefused: boolean, treeStopped: boolean }
interface Program { root: string, executable: string, sha256: string }
interface ProcessInput { command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, shell?: boolean, owner: string, protectedRoot?: string }
export interface WindowsProcessJob {
  child: ChildProcess
  journalRoot: string
  completion: Promise<WindowsProcessJobOutcome>
  stop: (reason: string, force?: boolean) => void
}

const programs = new Map<string, Promise<Program>>()
const jobs = new WeakMap<ChildProcess, WindowsProcessJob>()
const verifiedOutcomes = new WeakMap<object, string>()

/** Serialized provider output cannot manufacture a native stop acknowledgement. */
export function isVerifiedWindowsProcessJobStop(outcome: unknown, owner: string) {
  if (!outcome || typeof outcome !== 'object' || verifiedOutcomes.get(outcome) !== owner)
    return false
  const value = outcome as WindowsProcessJobOutcome
  return value.treeStopped && value.receipt?.treeStopped === true
    && value.receipt.activeProcesses === 0 && value.receipt.errorCode === null
}
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const systemDirectory = join(hostEnv.SystemRoot ?? 'C:\\Windows', 'System32')
const delay = (ms: number) => new Promise<void>(resolveDelay => setTimeout(resolveDelay, ms))

async function inspectFile(path: string, owned = true) {
  const info = await lstat(path)
  if (!info.isFile() || info.isSymbolicLink() || (owned && info.nlink !== 1))
    throw new Error('WINDOWS_PROCESS_JOB_FILE_IDENTITY')
}

async function regularFile(path: string) {
  await inspectFile(path)
  return readFile(path)
}

async function prepareProgram(protectedRoot?: string): Promise<Program> {
  if (platform !== 'win32')
    throw new Error('WINDOWS_PROCESS_JOB_REQUIRES_WINDOWS')
  const parent = protectedRoot ?? tmpdir()
  await mkdir(parent, { recursive: true })
  if ((await lstat(parent)).isSymbolicLink())
    throw new Error('WINDOWS_PROCESS_JOB_PARENT_LINK')
  const root = await mkdtemp(join(await realpath(parent), 'alicization-process-job-'))
  const result = await new Promise<string>((resolveOutput, reject) => {
    const child = execFile(join(systemDirectory, 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(compiler, 'utf16le').toString('base64')], { windowsHide: true, timeout: 30_000, maxBuffer: 16_384, encoding: 'utf8' }, (error, stdout) => {
      if (error)
        reject(new Error('WINDOWS_PROCESS_JOB_COMPILER_FAILED'))
      else
        resolveOutput(stdout)
    })
    child.stdin?.on('error', () => { /* The worker callback owns compilation failure. */ })
    child.stdin?.end(`${JSON.stringify({ root, source: Buffer.from(source).toString('base64'), sha256: digest(source) })}\n`)
  })
  const { sha256 } = v.parse(v.strictObject({ sha256: hashText }), JSON.parse(result.trim()))
  const executable = join(root, 'process-job.exe')
  if (digest(await regularFile(executable)) !== sha256)
    throw new Error('WINDOWS_PROCESS_JOB_PROGRAM_CHANGED')
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'windows-process-job-program-v1', sourceSha256: digest(source), executableSha256: sha256, parentPid: pid }), { flag: 'wx' })
  return { root, executable, sha256 }
}

async function resolveExecutable(command: string, cwd: string, env: NodeJS.ProcessEnv) {
  const candidates = isAbsolute(command) || /[\\/]/u.test(command)
    ? [resolve(cwd, command)]
    : (Object.entries(env).find(([name]) => name.toUpperCase() === 'PATH')?.[1] ?? '').split(';').filter(Boolean).map(directory => join(directory.replace(/^"|"$/gu, ''), command))
  for (const candidate of candidates) {
    const path = /\.exe$/iu.test(candidate) ? candidate : `${candidate}.exe`
    try {
      // Windows system executables legitimately share WinSxS hard links.
      // Our own program/control files still require a single directory entry.
      await inspectFile(path, false)
      return path
    }
    catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
        throw error
    }
  }
  throw Object.assign(new Error('WINDOWS_PROCESS_JOB_EXECUTABLE_NOT_FOUND'), { code: 'ENOENT' })
}

/** Prepare before the caller's final dispatch check; the target cannot run yet. */
export async function prepareWindowsProcessJob(input: ProcessInput) {
  const cacheKey = input.protectedRoot ?? '<owned-process-temp>'
  let preparation = programs.get(cacheKey)
  if (!preparation) {
    preparation = prepareProgram(input.protectedRoot)
    programs.set(cacheKey, preparation)
    void preparation.catch(() => programs.delete(cacheKey))
  }
  const program = await preparation
  if ((await lstat(program.root)).isSymbolicLink() || digest(await regularFile(program.executable)) !== program.sha256)
    throw new Error('WINDOWS_PROCESS_JOB_PROGRAM_CHANGED')
  const executable = input.shell ? join(systemDirectory, 'cmd.exe') : await resolveExecutable(input.command, input.cwd, input.env)
  const root = await mkdtemp(join(program.root, 'run-'))
  const nonce = randomBytes(32).toString('hex')
  const key = randomBytes(32)
  // Bind exact arguments without retaining their content, credentials or key.
  const bindingHash = digest(JSON.stringify({ owner: input.owner, executable, args: input.args, command: input.shell ? input.command : null, cwd: input.cwd, nonce }))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'windows-process-job-run-v1', nonce, bindingHash, parentPid: pid, executableSha256: program.sha256 }), { flag: 'wx' })
  const seal = (payload: object, initial = false) => {
    const bytes = Buffer.from(JSON.stringify(payload))
    return JSON.stringify({ payload: bytes.toString('base64'), mac: createHmac('sha256', key).update(bytes).digest('hex'), ...(initial ? { key: key.toString('hex') } : {}) })
  }
  async function control(name: string, payload: object) {
    const pending = join(root, `${name}.${randomBytes(8).toString('hex')}.pending`)
    await writeFile(pending, seal(payload), { flag: 'wx' })
    await rename(pending, join(root, name))
  }
  async function receipt(name: string) {
    let bytes: Buffer
    try { bytes = await regularFile(join(root, name)) }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
        return null
      throw error
    }
    if (bytes.length > 16_384)
      throw new Error('WINDOWS_PROCESS_JOB_RECEIPT_BUDGET')
    const envelope = v.parse(v.strictObject({ payload: v.pipe(v.string(), v.maxLength(16_384)), mac: hashText }), JSON.parse(bytes.toString('utf8')))
    const body = Buffer.from(envelope.payload, 'base64')
    if (!timingSafeEqual(Buffer.from(envelope.mac, 'hex'), createHmac('sha256', key).update(body).digest()))
      throw new Error('WINDOWS_PROCESS_JOB_RECEIPT_SIGNATURE')
    return JSON.parse(body.toString('utf8'))
  }
  let used = false
  return {
    /** Attach stream listeners synchronously after starting, before admission. */
    start(authorize: () => Promise<boolean>): WindowsProcessJob {
      if (used)
        throw new Error('WINDOWS_PROCESS_JOB_ALREADY_STARTED')
      used = true
      const expiresAt = Date.now() + 30_000
      const child = spawn(program.executable, [root], { cwd: input.cwd, env: input.env, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
      let closed = false
      let stopping = false
      let readyRootPid: number | undefined
      let forceTimer: ReturnType<typeof setTimeout> | undefined
      const bound = (value: { nonce: string, bindingHash: string, guardPid: number, parentPid: number }) => value.nonce === nonce && value.bindingHash === bindingHash && value.guardPid === child.pid && value.parentPid === pid
      const stop = (reason: string, force = false) => {
        if (closed)
          return
        if (force) {
          // The sole non-inheritable Job handle closes in the killed guard.
          // A missing signed final receipt remains an unknown effect.
          child.kill('SIGKILL')
          return
        }
        if (stopping)
          return
        stopping = true
        void control('stop.json', { version: 1, kind: 'stop', nonce, bindingHash, guardPid: child.pid, parentPid: pid, reason: digest(reason) }).catch(() => child.kill('SIGKILL'))
        forceTimer = setTimeout(() => {
          if (!closed)
            child.kill('SIGKILL')
        }, 6000)
        forceTimer.unref?.()
      }
      const completion = new Promise<WindowsProcessJobOutcome>((resolveCompletion) => {
        child.once('close', () => {
          closed = true
          clearTimeout(forceTimer)
          void (async () => {
            try {
              const result = v.parse(resultSchema, await receipt('result.json'))
              if (!bound(result) || (readyRootPid !== undefined && result.rootPid !== readyRootPid) || (result.treeStopped && result.activeProcesses !== 0))
                throw new Error('WINDOWS_PROCESS_JOB_RESULT_BINDING')
              const outcome = Object.freeze({ receipt: Object.freeze(result), journalRoot: root, dispatchRefused: !result.started && result.treeStopped, treeStopped: result.treeStopped && result.activeProcesses === 0 })
              verifiedOutcomes.set(outcome, input.owner)
              resolveCompletion(outcome)
            }
            catch { resolveCompletion({ receipt: null, journalRoot: root, dispatchRefused: false, treeStopped: false }) }
          })()
        })
      })
      child.stdin?.on('error', () => { /* Process closure and its receipt own settlement. */ })
      child.stdin?.write(`${seal({ version: 1, nonce, bindingHash, parentProcessId: pid, expiresAt, executable, arguments: input.shell ? [] : input.args, cwd: input.cwd, shellCommandLine: input.shell ? `"${executable}" /d /s /c "${input.command}"` : null, owner: input.owner }, true)}\n`)
      void (async () => {
        try {
          while (!closed && !stopping && Date.now() < expiresAt) {
            const raw = await receipt('ready.json')
            if (raw) {
              const ready = v.parse(readySchema, raw)
              if (!bound(ready))
                throw new Error('WINDOWS_PROCESS_JOB_READY_BINDING')
              readyRootPid = ready.rootPid
              if (!await authorize() || closed || stopping) {
                stop('authority-revoked')
                return
              }
              const authorizedAt = Date.now()
              await control('go.json', { version: 1, kind: 'go', nonce, bindingHash, guardPid: child.pid, parentPid: pid, rootPid: ready.rootPid, authorizedAt, expiresAt: Math.min(expiresAt, authorizedAt + 2000) })
              return
            }
            await delay(15)
          }
          if (!closed)
            stop('admission-expired')
        }
        catch { stop('admission-failed') }
      })()
      const job = { child, journalRoot: root, completion, stop }
      jobs.set(child, job)
      return job
    },
  }
}

/** Return true only when this exact child has a main-owned job controller. */
export function stopWindowsProcessJob(child: ChildProcess, force = false) {
  const job = jobs.get(child)
  if (!job)
    return false
  job.stop(force ? 'forced-stop' : 'stop-requested', force)
  return true
}

export function readWindowsProcessJobOutcome(child: ChildProcess) {
  return jobs.get(child)?.completion
}

/** A broken pipe/guard cannot keep the task pending indefinitely or prove success. */
export async function settleWindowsProcessJob(child: ChildProcess) {
  const job = jobs.get(child)
  if (!job)
    return undefined
  job.stop('adapter-settlement')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([job.completion, new Promise<WindowsProcessJobOutcome>((resolveUnknown) => {
      timer = setTimeout(() => resolveUnknown({ receipt: null, journalRoot: job.journalRoot, dispatchRefused: false, treeStopped: false }), 7000)
    })])
  }
  finally { clearTimeout(timer) }
}
