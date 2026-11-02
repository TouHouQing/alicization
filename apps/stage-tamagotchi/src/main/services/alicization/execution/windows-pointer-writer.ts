import type { ChildProcessWithoutNullStreams } from 'node:child_process'

import type { WindowsPointerJournalAdmission } from './windows-pointer-journal'
import type { createWindowsPointerProgram } from './windows-pointer-program'
import type { WindowsPointerBinding, WindowsPointerNoInput, WindowsPointerResult } from './windows-pointer-protocol'
import type { WindowsPointerAction, WindowsPointerSnapshot } from './windows-pointer-types'

import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { lstat, open, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pid } from 'node:process'
import { StringDecoder } from 'node:string_decoder'

import { errorMessageFrom } from '@moeru/std'

import { decodeWindowsPointerGuardianRelease, decodeWindowsPointerNoInput, decodeWindowsPointerReady, decodeWindowsPointerResult } from './windows-pointer-protocol'
import { compileWindowsPointerAction, validateWindowsPointerSnapshot } from './windows-pointer-types'

export interface WindowsPointerWrite {
  observationId: string
  snapshot: WindowsPointerSnapshot
  action: WindowsPointerAction
  bindingHash: string
  owner: { cardId: string, turnId: string, effectId: string, leaseId: string, epoch: string, fencingToken: number }
  expiresAt: number
  assertCurrent: (phase: 'prepare' | 'admit' | 'execute') => Promise<void>
  signal?: AbortSignal
}
export interface WindowsPointerOutcome {
  ok: boolean
  inputReleased: boolean
  writerStopped: boolean
  effectMayHaveOccurred: boolean
  failure: string | null
  receiptRoot: string | null
  native: WindowsPointerResult | null
  noInput?: WindowsPointerNoInput
}
async function readReceipt(root: string, name: string) {
  const directory = await lstat(root)
  const path = join(root, name)
  const info = await lstat(path)
  if (!directory.isDirectory() || directory.isSymbolicLink() || !info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > 16_384)
    throw new Error('WINDOWS_POINTER_RECEIPT_IDENTITY')
  return readFile(path, 'utf8')
}
async function writeMainReceipt(root: string, name: string, value: unknown) {
  const body = JSON.stringify(value)
  if (Buffer.byteLength(body) > 16_384)
    throw new Error('WINDOWS_POINTER_MAIN_RECEIPT_BUDGET')
  const file = await open(join(root, name), 'wx', 0o600)
  try {
    await file.writeFile(body, 'utf8')
    await file.sync()
  }
  finally { await file.close() }
  return createHash('sha256').update(body).digest('hex')
}

/**
 * A single writer. Cancellation closes the protocol, never treats a killed
 * process or expired timer as proof that its owned keys have been released.
 */
export function createWindowsPointerWriter(program: ReturnType<typeof createWindowsPointerProgram>, launch: typeof spawn = spawn, admitJournal?: (admission: WindowsPointerJournalAdmission) => Promise<void>) {
  let active: { cancel: () => void, closed: Promise<WindowsPointerOutcome> } | null = null
  let settledReleased = true
  const isActive = () => active !== null || !settledReleased
  async function run(input: WindowsPointerWrite): Promise<WindowsPointerOutcome> {
    if (isActive())
      throw new Error('WINDOWS_POINTER_WRITER_BUSY')
    const snapshot = validateWindowsPointerSnapshot(input.snapshot)
    const compiled = compileWindowsPointerAction(input.action, snapshot.geometry)
    if (!/^[a-f0-9]{64}$/u.test(input.bindingHash) || !Number.isSafeInteger(input.expiresAt) || input.expiresAt <= Date.now() || input.expiresAt - Date.now() > 15_000)
      throw new Error('WINDOWS_POINTER_AUTHORITY_REQUIRED')
    let cancelled = false
    let child: ChildProcessWithoutNullStreams | undefined
    let executed = false
    let unexpectedDelivery = false
    let failure: string | null = null
    let binding: WindowsPointerBinding | undefined
    let native: WindowsPointerResult | null = null
    let noInput: WindowsPointerNoInput | null = null
    let ready = false
    let handshake = Promise.resolve()
    let finish!: (outcome: WindowsPointerOutcome) => void
    let returnEarly!: (outcome: WindowsPointerOutcome) => void
    const closed = new Promise<WindowsPointerOutcome>((resolve) => {
      finish = resolve
    })
    const early = new Promise<WindowsPointerOutcome>((resolve) => {
      returnEarly = resolve
    })
    const unknown = (): WindowsPointerOutcome => ({ ok: false, inputReleased: false, writerStopped: false, effectMayHaveOccurred: executed || unexpectedDelivery, failure, receiptRoot: binding?.receiptRoot ?? null, native })
    function cancel() {
      cancelled = true
      if (child?.stdin.writable && !child.stdin.writableEnded) {
        child.stdin.end('cancel\n')
      }
    }
    const current = { cancel, closed }
    active = current
    settledReleased = false
    const onAbort = () => {
      failure ??= 'WINDOWS_POINTER_CANCELLED'
      cancel()
    }
    input.signal?.addEventListener('abort', onAbort, { once: true })
    let watchdog: ReturnType<typeof setTimeout> | undefined
    void closed.then((outcome) => {
      settledReleased = outcome.writerStopped && outcome.inputReleased
      clearTimeout(watchdog)
      input.signal?.removeEventListener('abort', onAbort)
      if (active === current)
        active = null
    })
    try {
      input.signal?.throwIfAborted()
      const prepared = await program.ready()
      await program.verify(prepared)
      await input.assertCurrent('prepare')
      input.signal?.throwIfAborted()
      if (cancelled || input.expiresAt <= Date.now())
        throw new Error('WINDOWS_POINTER_DISPATCH_CANCELLED')
      const nonce = randomBytes(16).toString('hex')
      let tag = randomBytes(8).readBigUInt64LE()
      if (tag === 0n)
        tag = 1n
      const request = { version: 1, mappingName: `Local\\AlicizationInput_${nonce}`, tag: tag.toString(), bindingHash: input.bindingHash, parentProcessId: pid, parentStartTicks: prepared.parentStartTicks, expiresAt: input.expiresAt, action: compiled.action, snapshot }
      // This admission precedes any native process or input. It preserves the
      // exact effect/target on a parent crash, independently of model output.
      const intentHash = await writeMainReceipt(prepared.root, `main-intent-${nonce}.json`, { version: 1, owner: input.owner, observationId: input.observationId, programSha256: prepared.sha256, admittedAt: Date.now(), request })
      await admitJournal?.({ version: 1, programRoot: prepared.root, nonce, intentHash, owner: input.owner })
      await input.assertCurrent('admit')
      input.signal?.throwIfAborted()
      if (cancelled || input.expiresAt <= Date.now())
        throw new Error('WINDOWS_POINTER_DISPATCH_CANCELLED')
      // Native journals derive from this verified executable's directory.
      child = launch(prepared.executable, ['--actor'], { windowsHide: true, shell: false, stdio: 'pipe' }) as ChildProcessWithoutNullStreams
      binding = { bindingHash: input.bindingHash, actorProcessId: child.pid ?? 0, parentProcessId: pid, parentStartTicks: prepared.parentStartTicks, receiptRoot: join(prepared.root, `alicization-owned-input-${nonce}`), keys: compiled.buttons, repeat: 1, expectedEvents: compiled.expectedEvents }
      let bytes = 0
      let text = ''
      let ended = false
      const decoder = new StringDecoder('utf8')
      const fail = (error: unknown) => {
        failure ??= errorMessageFrom(error) ?? 'WINDOWS_POINTER_PROTOCOL_FAILED'
        cancel()
      }
      const line = (frame: string) => {
        if (native || noInput)
          throw new Error('WINDOWS_POINTER_FRAME_AFTER_RESULT')
        const envelope: unknown = JSON.parse(frame)
        if (envelope && typeof envelope === 'object' && 'type' in envelope && envelope.type === 'protocol-error') {
          const reason = 'failure' in envelope && typeof envelope.failure === 'string' ? envelope.failure.slice(0, 1024) : 'unknown native startup failure'
          // Preserve the native cause, while keeping absent release evidence
          // uncertain. A startup error never certifies cleanup or permits retry.
          throw new Error(`WINDOWS_POINTER_NATIVE_PROTOCOL_FAILED: ${reason}`)
        }
        else if (envelope && typeof envelope === 'object' && 'type' in envelope && envelope.type === 'preflight-refused') {
          if (ready || executed)
            throw new Error('WINDOWS_POINTER_REFUSAL_AFTER_READINESS')
          noInput = decodeWindowsPointerNoInput(frame, binding!)
        }
        else if (envelope && typeof envelope === 'object' && 'type' in envelope && envelope.type === 'result') {
          const candidate = decodeWindowsPointerResult(frame, binding!)
          if (!executed && (candidate.ok || candidate.effectMayHaveOccurred || candidate.insertedEvents > 0 || candidate.completedRounds > 0)) {
            unexpectedDelivery = candidate.effectMayHaveOccurred || candidate.insertedEvents > 0 || candidate.completedRounds > 0
            throw new Error('WINDOWS_POINTER_UNADMITTED_RESULT')
          }
          // A refused native startup may emit a terminal no-input result before
          // readiness. It must still match both durable release records.
          native = candidate
        }
        else if (!ready) {
          const nativeReady = decodeWindowsPointerReady(frame, binding!)
          ready = true
          handshake = Promise.resolve().then(async () => {
            await writeMainReceipt(prepared.root, `main-ready-${nonce}.json`, { version: 1, owner: input.owner, actorProcessId: binding!.actorProcessId, ready: nativeReady })
            await input.assertCurrent('execute')
            input.signal?.throwIfAborted()
            if (cancelled || native || child!.exitCode != null || child!.stdin.destroyed || !child!.stdin.writable || input.expiresAt <= Date.now())
              throw new Error('WINDOWS_POINTER_DISPATCH_CANCELLED')
            // No await between the final main-owned check and the instruction.
            executed = true
            child!.stdin.write('execute\n')
          }).catch(fail)
        }
        else { throw new Error('WINDOWS_POINTER_RESULT_REQUIRED') }
      }
      child.stdout.on('data', (chunk: Buffer) => {
        try {
          bytes += chunk.length
          if (bytes > 32_768)
            throw new Error('WINDOWS_POINTER_STDOUT_BUDGET')
          text += decoder.write(chunk)
          let newline: number
          while ((newline = text.indexOf('\n')) >= 0) {
            const frame = text.slice(0, newline).replace(/\r$/u, '')
            text = text.slice(newline + 1)
            line(frame)
          }
          if (Buffer.byteLength(text) > 16_384)
            throw new Error('WINDOWS_POINTER_FRAME_BUDGET')
        }
        catch (error) { fail(error) }
      })
      child.stdout.on('end', () => {
        ended = true
        text += decoder.end()
        if (text.trim())
          fail(new Error('WINDOWS_POINTER_UNTERMINATED_FRAME'))
      })
      let errors = 0
      child.stderr.on('data', (chunk: Buffer) => {
        errors += chunk.length
        fail(new Error(errors > 16_384 ? 'WINDOWS_POINTER_STDERR_BUDGET' : 'WINDOWS_POINTER_NATIVE_STDERR'))
      })
      child.stdin.on('error', fail)
      child.once('error', fail)
      child.once('close', (code, signal) => {
        void (async () => {
          await handshake
          if (noInput) {
            if (!ended || signal || code !== 2 || ready || executed || failure)
              throw new Error('WINDOWS_POINTER_PREFLIGHT_CLOSE_UNCONFIRMED')
            const durable = decodeWindowsPointerNoInput(await readReceipt(binding!.receiptRoot, 'actor-result.json'), binding!)
            if (JSON.stringify(durable) !== JSON.stringify(noInput))
              throw new Error('WINDOWS_POINTER_PREFLIGHT_RECEIPT_CHANGED')
            finish({ ok: false, inputReleased: true, writerStopped: true, effectMayHaveOccurred: false, failure: noInput.failure, receiptRoot: binding!.receiptRoot, native: null, noInput })
            return
          }
          if (!native || !ended || signal || (code !== 0 && code !== 2) || (native.ok && code !== 0))
            throw new Error('WINDOWS_POINTER_CLOSE_UNCONFIRMED')
          const durable = decodeWindowsPointerResult(await readReceipt(binding!.receiptRoot, 'actor-result.json'), binding!)
          if (JSON.stringify(durable) !== JSON.stringify(native))
            throw new Error('WINDOWS_POINTER_ACTOR_RECEIPT_CHANGED')
          const guardian = decodeWindowsPointerGuardianRelease(await readReceipt(binding!.receiptRoot, 'guardian-release.json'), input.bindingHash)
          // Guardian failure describes its original operation. Independent
          // inputReleased + actual normal exit attest cleanup even after failure.
          const released = native.inputReleased && guardian.inputReleased
          const stopped = released && native.guardianNormalExit
          finish({ ok: native.ok && !failure && !cancelled && stopped, inputReleased: released, writerStopped: stopped, effectMayHaveOccurred: executed || native.effectMayHaveOccurred, failure: failure ?? native.failure, receiptRoot: binding!.receiptRoot, native })
        })().catch((error) => {
          failure ??= errorMessageFrom(error) ?? 'WINDOWS_POINTER_RELEASE_UNCONFIRMED'
          finish(unknown())
        })
      })
      watchdog = setTimeout(() => {
        failure ??= 'WINDOWS_POINTER_CLOSE_TIMEOUT'
        cancel()
        // Keep active until actual close. The resource owner must quarantine.
        returnEarly(unknown())
      }, Math.max(1, input.expiresAt - Date.now()) + 12_000)
      child.stdin.write(`${JSON.stringify(request)}\n`)
    }
    catch (error) {
      failure = errorMessageFrom(error) ?? 'WINDOWS_POINTER_PREPARATION_FAILED'
      cancel()
      if (!child)
        finish({ ...unknown(), inputReleased: true, writerStopped: true, effectMayHaveOccurred: false })
    }
    return Promise.race([closed, early])
  }
  async function releaseOwnedInput() {
    const current = active
    if (!current)
      return settledReleased
    current.cancel()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const result = await Promise.race([current.closed, new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 12_000)
      })])
      return result?.writerStopped === true && result.inputReleased
    }
    finally { clearTimeout(timer) }
  }
  return { run, isActive, releaseOwnedInput }
}
