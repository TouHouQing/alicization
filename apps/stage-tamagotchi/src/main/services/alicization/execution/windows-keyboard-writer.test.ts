import type { spawn } from 'node:child_process'

import type { WindowsKeyboardJournalAdmission } from './windows-keyboard-journal'
import type { createWindowsKeyboardProgram } from './windows-keyboard-program'

import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createWindowsKeyboardWriter } from './windows-keyboard-writer'

const target = { windowId: '123', processId: 44, processStartTicks: '639000000000000000', windowClass: 'OwnedFixture', desktop: 'Default', inputDesktop: 'Default', focusWindowId: '124', integrityLevel: 8192 }
const roots: string[] = []
afterEach(async () => {
  vi.useRealTimers()
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})

async function fixture(mode: 'normal' | 'missing-durable' | 'crash' | 'stuck' | 'bad-ready' | 'oversized' | 'startup-failure' | 'unadmitted-success' | 'protocol-error' = 'normal', admitJournal?: (admission: WindowsKeyboardJournalAdmission) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'alicization-keyboard-protocol-test-'))
  roots.push(root)
  const child = Object.assign(new EventEmitter(), { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), pid: 0x7FFF_FFFE, kill: vi.fn() })
  const messages: string[] = []
  let request: Record<string, any> | undefined
  let complete = false
  let wire = ''
  const close = (code: number) => {
    child.stdout.end()
    child.stderr.end()
    setImmediate(() => child.emit('close', code, null))
  }
  const reply = async (cancelled: boolean) => {
    if (complete || !request)
      return
    complete = true
    if (mode === 'stuck')
      return
    if (mode === 'crash') {
      close(93)
      return
    }
    const receiptRoot = join(root, `alicization-owned-input-${request.mappingName.slice(-32)}`)
    await mkdir(receiptRoot)
    const guardian = { type: 'guardian-release', bindingHash: request.bindingHash, inputReleased: true, stopReason: 1, failure: mode === 'startup-failure' ? 'hook startup failed' : null, readyPreparationMs: 1 }
    const result = { type: 'result', bindingHash: request.bindingHash, ok: !cancelled, completedRounds: cancelled ? 0 : request.repeat, insertedEvents: cancelled ? 0 : request.keys.length * 2 * request.repeat, effectMayHaveOccurred: !cancelled, inputReleased: true, guardianNormalExit: true, guardianReady: JSON.stringify({ type: 'guardian-ready', bindingHash: request.bindingHash }), guardianReceipt: JSON.stringify(guardian), stopReason: 1, failure: cancelled ? 'dispatch cancelled' : null, ownedKeys: [], receiptRoot }
    if (mode === 'startup-failure') {
      result.guardianReady = JSON.stringify(guardian)
      result.failure = 'guardian readiness failed'
    }
    if (mode !== 'missing-durable')
      await writeFile(join(receiptRoot, 'actor-result.json'), JSON.stringify(result))
    await writeFile(join(receiptRoot, 'guardian-release.json'), JSON.stringify(guardian))
    child.stdout.write(`${JSON.stringify(result)}\n`)
    close(cancelled ? 2 : 0)
  }
  child.stdin.on('data', (chunk) => {
    wire += chunk.toString()
    let newline: number
    while ((newline = wire.indexOf('\n')) >= 0) {
      const line = wire.slice(0, newline)
      wire = wire.slice(newline + 1)
      messages.push(line)
      if (!request) {
        request = JSON.parse(line)
        const receiptRoot = join(root, `alicization-owned-input-${request!.mappingName.slice(-32)}`)
        if (mode === 'protocol-error') {
          complete = true
          child.stdout.write(`${JSON.stringify({ type: 'protocol-error', ok: false, inputReleased: false, failure: 'fixture receipt path failure' })}\n`)
          close(3)
        }
        else if (mode === 'startup-failure' || mode === 'unadmitted-success') {
          void reply(mode === 'startup-failure')
        }
        else if (mode === 'oversized') {
          child.stdout.write('x'.repeat(40_000))
        }
        else {
          child.stdout.write(`${JSON.stringify({ type: 'ready', bindingHash: mode === 'bad-ready' ? 'b'.repeat(64) : request!.bindingHash, actorStartTicks: '639000000000000001', guardianProcessId: 0x7FFF_FFFD, guardianStartTicks: '639000000000000000', receiptRoot })}\n`)
        }
      }
      else { void reply(line !== 'execute') }
    }
  })
  const program = { ready: vi.fn(async () => ({ root, executable: join(root, 'keyboard.exe'), sha256: 'c'.repeat(64), parentStartTicks: '639000000000000000' })), verify: vi.fn(async () => {}), health: vi.fn(), observe: vi.fn(), dispose: vi.fn(async () => {}) } as ReturnType<typeof createWindowsKeyboardProgram>
  const launch = vi.fn(() => child) as unknown as typeof spawn
  const writer = createWindowsKeyboardWriter(program, launch, admitJournal)
  const input = { target, shortcut: 'Ctrl+S', repeat: 1, bindingHash: 'a'.repeat(64), owner: { cardId: 'alice', turnId: 'turn', effectId: 'effect', leaseId: 'lease', epoch: 'epoch', fencingToken: 1 }, expiresAt: Date.now() + 10_000, assertCurrent: vi.fn(async () => {}) }
  return { writer, child, messages, input, program, close, root, launch }
}

describe('main-owned keyboard writer lifecycle', () => {
  it('retains a native startup cause without claiming release or dispatching input', async () => {
    const f = await fixture('protocol-error')
    expect(await f.writer.run(f.input)).toMatchObject({ ok: false, inputReleased: false, writerStopped: false, effectMayHaveOccurred: false, failure: 'WINDOWS_KEYBOARD_NATIVE_PROTOCOL_FAILED: fixture receipt path failure' })
    expect(f.messages).not.toContain('execute')
    expect(f.child.kill).not.toHaveBeenCalled()
  })

  it('waits for the exact durable database index before starting any native owner', async () => {
    let release!: () => void
    const barrier = new Promise<void>((resolve) => {
      release = resolve
    })
    const admit = vi.fn(async (record: WindowsKeyboardJournalAdmission) => {
      const body = await readFile(join(record.programRoot, `main-intent-${record.nonce}.json`))
      expect(createHash('sha256').update(body).digest('hex')).toBe(record.intentHash)
      await barrier
    })
    const f = await fixture('normal', admit)
    const run = f.writer.run(f.input)
    await vi.waitFor(() => expect(admit).toHaveBeenCalledTimes(1))
    expect(f.launch).not.toHaveBeenCalled()
    expect(f.messages).toEqual([])
    expect(admit.mock.calls[0][0].owner).toEqual(f.input.owner)
    release()
    expect(await run).toMatchObject({ ok: true, inputReleased: true, writerStopped: true })
  })

  it('settles a failed database index as no input without launching an actor', async () => {
    const f = await fixture('normal', async () => {
      throw new Error('database index unavailable')
    })
    expect(await f.writer.run(f.input)).toMatchObject({ ok: false, inputReleased: true, writerStopped: true, effectMayHaveOccurred: false, failure: 'database index unavailable' })
    expect(f.launch).not.toHaveBeenCalled()
    expect(f.writer.isActive()).toBe(false)
  })

  it('waits for a fresh main authority check after readiness and requires both durable receipts', async () => {
    const f = await fixture()
    let resume!: () => void
    f.input.assertCurrent.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockImplementationOnce(() => new Promise<void>((resolve) => {
      resume = resolve
    }))
    const run = f.writer.run(f.input)
    await vi.waitFor(() => expect(f.input.assertCurrent).toHaveBeenCalledTimes(3))
    expect(f.messages).toHaveLength(1)
    expect(f.writer.isActive()).toBe(true)
    const request = JSON.parse(f.messages[0])
    const nonce = request.mappingName.slice(-32)
    const admitted = JSON.parse(await readFile(join(f.root, `main-intent-${nonce}.json`), 'utf8'))
    const ready = JSON.parse(await readFile(join(f.root, `main-ready-${nonce}.json`), 'utf8'))
    expect(admitted).toMatchObject({ owner: f.input.owner, request: { bindingHash: f.input.bindingHash, target: f.input.target } })
    expect(ready).toMatchObject({ owner: f.input.owner, actorProcessId: f.child.pid, ready: { bindingHash: f.input.bindingHash } })
    resume()
    expect(await run).toMatchObject({ ok: true, writerStopped: true, inputReleased: true, effectMayHaveOccurred: true })
    expect(f.input.assertCurrent.mock.calls).toEqual([['prepare'], ['admit'], ['execute']])
    expect(f.messages.slice(1)).toEqual(['execute'])
    expect(f.child.kill).not.toHaveBeenCalled()
    expect(f.writer.isActive()).toBe(false)
  })

  it('revokes readiness without injecting when the task or target became stale', async () => {
    const f = await fixture()
    f.input.assertCurrent.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('goal revision changed'))
    expect(await f.writer.run(f.input)).toMatchObject({ ok: false, writerStopped: true, effectMayHaveOccurred: false, failure: 'goal revision changed' })
    expect(f.messages.slice(1)).toEqual(['cancel'])
  })

  it('rechecks authority after the durable admission before starting a native process', async () => {
    const f = await fixture()
    f.input.assertCurrent.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('withdrawn while admission was flushed'))
    expect(await f.writer.run(f.input)).toMatchObject({ ok: false, writerStopped: true, inputReleased: true, effectMayHaveOccurred: false })
    expect(f.messages).toHaveLength(0)
    expect(f.writer.isActive()).toBe(false)
  })

  it('accepts an independently released startup failure before ready without manufacturing input or an unknown writer', async () => {
    const f = await fixture('startup-failure')
    expect(await f.writer.run(f.input)).toMatchObject({ ok: false, writerStopped: true, inputReleased: true, effectMayHaveOccurred: false, failure: 'guardian readiness failed' })
    expect(f.messages).toHaveLength(1)
    expect(f.writer.isActive()).toBe(false)
    expect(await f.writer.releaseOwnedInput()).toBe(true)
  })

  it('rejects claimed successful input without the main execute instruction and retains uncertainty', async () => {
    const f = await fixture('unadmitted-success')
    expect(await f.writer.run(f.input)).toMatchObject({ ok: false, writerStopped: false, inputReleased: false, effectMayHaveOccurred: true, failure: 'WINDOWS_KEYBOARD_UNADMITTED_RESULT' })
    expect(f.messages).not.toContain('execute')
    expect(await f.writer.releaseOwnedInput()).toBe(false)
  })

  it('cancellation cannot race an outstanding authority check into execution', async () => {
    const f = await fixture()
    const abort = new AbortController()
    let resume!: () => void
    f.input.assertCurrent.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockImplementationOnce(() => new Promise<void>((resolve) => {
      resume = resolve
    }))
    const run = f.writer.run({ ...f.input, signal: abort.signal })
    await vi.waitFor(() => expect(f.input.assertCurrent).toHaveBeenCalledTimes(3))
    abort.abort()
    resume()
    expect(await run).toMatchObject({ ok: false, writerStopped: true, effectMayHaveOccurred: false })
    expect(f.messages.slice(1)).toEqual(['cancel'])
    expect(f.child.kill).not.toHaveBeenCalled()
  })

  it.each(['missing-durable', 'crash'] as const)('keeps %s evidence uncertain and prevents blind replay claims', async (mode) => {
    const f = await fixture(mode)
    expect(await f.writer.run(f.input)).toMatchObject({ ok: false, inputReleased: false, writerStopped: false, effectMayHaveOccurred: true })
    expect(f.messages.filter(line => line === 'execute')).toHaveLength(1)
    expect(f.writer.isActive()).toBe(true)
    expect(await f.writer.releaseOwnedInput()).toBe(false)
    await expect(f.writer.run(f.input)).rejects.toThrow('BUSY')
  })

  it.each(['bad-ready', 'oversized'] as const)('rejects %s before any execute instruction', async (mode) => {
    const f = await fixture(mode)
    expect(await f.writer.run(f.input)).toMatchObject({ ok: false, effectMayHaveOccurred: false })
    expect(f.messages).not.toContain('execute')
  })

  it('a deadline cannot clear a live writer; its eventual unconfirmed close remains uncertain', async () => {
    const f = await fixture('stuck')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const run = f.writer.run(f.input)
    await vi.waitFor(() => expect(f.messages).toContain('execute'))
    await vi.advanceTimersByTimeAsync(22_001)
    expect(await run).toMatchObject({ ok: false, writerStopped: false, failure: 'WINDOWS_KEYBOARD_CLOSE_TIMEOUT' })
    expect(f.writer.isActive()).toBe(true)
    await expect(f.writer.run({ ...f.input, expiresAt: Date.now() + 1000 })).rejects.toThrow('BUSY')
    f.close(93)
    await new Promise<void>(resolve => setImmediate(resolve))
    expect(f.writer.isActive()).toBe(true)
    expect(await f.writer.releaseOwnedInput()).toBe(false)
    expect(f.child.kill).not.toHaveBeenCalled()
  })
})
