import { createHash, randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { compensateExecutionFile } from './compensation'
import { createExecutionResourceBroker, executionFileResources } from './resource-broker'

const native = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('node:child_process', () => ({ execFile: native.run }))

describe('compensation cancellation with a simulated native close protocol', () => {
  it.each(['audit-failure', 'late-audit', 'wrong-process', 'wrong-result'])('refuses simulated startup/result authority failure: %s', async (mode) => {
    const root = await mkdtemp(join(tmpdir(), 'compensation-startup-protocol-'))
    const path = join(root, 'owned.txt')
    await writeFile(path, 'generated')
    const info = await stat(path, { bigint: true })
    const broker = createExecutionResourceBroker()
    const stdout = new EventEmitter()
    let callback: ((error: Error | null, stdout: string) => void) | undefined
    let releaseAudit: () => void = () => {}
    const auditWait = new Promise<void>((resolve) => { releaseAudit = resolve })
    let startupObserved = false
    const stages: string[] = []
    const child = Object.assign(new EventEmitter(), { pid: 12345, stdout, stdin: { end: vi.fn() }, kill: vi.fn(() => {
      queueMicrotask(() => child.emit('close', null, 'SIGTERM'))
      return true
    }) })
    const ready = JSON.stringify({ kind: 'file-recovery-native-ready-v1', pid: mode === 'wrong-process' ? 54321 : child.pid, creationTimeTicks: '639000000000000000' })
    native.run.mockReset().mockImplementation((_file, _args, _options, done) => {
      callback = done
      queueMicrotask(() => stdout.emit('data', new TextEncoder().encode(`${ready}\n`)))
      return child
    })
    child.stdin.end.mockImplementation(() => {
      queueMicrotask(() => {
        callback!(null, `${ready}\n${JSON.stringify({ ok: true, scope: 'exclusive-file-handle-restored-bytes', actualHash: '0'.repeat(64) })}\n`)
        child.emit('close', 0, null)
      })
    })
    const digest = (text: string) => createHash('sha256').update(text).digest('hex')
    const abort = new Error('simulated abort during startup audit')
    const result = broker.withOwner('unrelated-parent', () => compensateExecutionFile({ cardId: 'alice', recoveryId: randomUUID(), effectId: 'original', path, device: String(info.dev), inode: String(info.ino), writtenHash: digest('generated'), backupHash: digest('before'), backupBytes: new TextEncoder().encode('before') }, { broker, effectOwnsVersion: async () => true, audit: async (event) => {
      stages.push(String(event.stage))
      if (event.stage !== 'native-started')
        return
      startupObserved = true
      expect(event).toMatchObject({ pid: child.pid, creationTimeTicks: '639000000000000000' })
      if (mode === 'audit-failure')
        throw new Error('startup identity journal failed')
      if (mode === 'late-audit')
        await auditWait
    } })).catch(error => error)
    try {
      if (mode === 'late-audit') {
        await vi.waitFor(() => expect(startupObserved).toBe(true))
        callback!(abort, ready)
        child.emit('close', null, 'SIGTERM')
        expect(await result).toBe(abort)
        releaseAudit()
        await vi.waitFor(() => expect(child.kill).toHaveBeenCalled())
      }
      else {
        expect(await result).toBeInstanceOf(Error)
      }
      if (mode !== 'wrong-result')
        expect(child.stdin.end).not.toHaveBeenCalled()
      expect(stages).not.toContain('observed')
      expect(startupObserved).toBe(mode !== 'wrong-process')
      expect(await readFile(path, 'utf8')).toBe('generated')
      expect(broker.snapshot()).toMatchObject([{ uncertain: true, effectCardId: 'alice', effectId: expect.stringMatching(/^file-restore:/u), owner: expect.stringMatching(/^file-restore:/u) }])
    }
    finally {
      releaseAudit()
      child.emit('close', null, 'SIGTERM')
      await result
      await rm(root, { recursive: true, force: true })
    }
  })
  it.each([false, true])('keeps ownership until native close, with stop acknowledged before budget=%s', async (confirm) => {
    const root = await mkdtemp(join(tmpdir(), 'compensation-native-close-test-'))
    const path = join(root, 'owned.txt')
    await writeFile(path, 'generated')
    const broker = createExecutionResourceBroker()
    const settle = vi.spyOn(broker, 'settle')
    const child = Object.assign(new EventEmitter(), { stdin: { end: vi.fn() } })
    let callback: ((error: Error, stdout: string) => void) | undefined
    let script = ''
    let closed = false
    let calledBack = false
    const abort = new Error('simulated native AbortError before close')
    native.run.mockReset().mockImplementation((_file, args, _options, done) => {
      callback = done
      script = args.at(-1)
      return child
    })
    const info = await stat(path, { bigint: true })
    const digest = (text: string) => createHash('sha256').update(text).digest('hex')
    let finished = false
    const result = compensateExecutionFile({ cardId: 'alice', recoveryId: randomUUID(), effectId: 'write', path, device: String(info.dev), inode: String(info.ino), writtenHash: digest('generated'), backupHash: digest('before'), backupBytes: new TextEncoder().encode('before') }, { broker, effectOwnsVersion: async () => true, audit: async () => {} }).finally(() => { finished = true }).catch(error => error)
    try {
      await vi.waitFor(() => expect(callback).toBeTypeOf('function'))
      vi.useFakeTimers()
      calledBack = true
      callback!(abort, '')
      await vi.advanceTimersByTimeAsync(1)
      expect(finished).toBe(false)
      expect(settle).not.toHaveBeenCalled()
      expect((await stat(script)).isFile()).toBe(true)
      if (confirm) {
        closed = true
        child.emit('close', null, 'SIGTERM')
      }
      else {
        await vi.advanceTimersByTimeAsync(5001)
      }
      expect(await result).toBe(abort)
      expect(settle).toHaveBeenCalledWith(expect.anything(), { stopped: confirm, uncertain: true })
      const resources = await executionFileResources(path)
      expect(() => broker.acquire({ owner: 'next-writer', resources })).toThrow('reconciliation')
      expect(await readFile(path, 'utf8')).toBe('generated')
      if (!confirm) {
        expect((await stat(script)).isFile()).toBe(true)
        closed = true
        child.emit('close', null, 'SIGTERM')
      }
      vi.useRealTimers()
      await vi.waitFor(async () => expect(await stat(dirname(script)).then(() => false, () => true)).toBe(true))
      // Late process closure cleans its worker but supplies no artifact proof.
      expect(broker.snapshot()).toMatchObject([{ uncertain: true }])
      expect(settle).toHaveBeenCalledOnce()
    }
    finally {
      vi.useRealTimers()
      if (!calledBack)
        callback?.(abort, '')
      if (!closed)
        child.emit('close', null, 'SIGTERM')
      await result
      await rm(root, { recursive: true, force: true })
    }
  })
})
