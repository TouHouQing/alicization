import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeExecutionPresenceObserver } from './life-execution-presence'
import { verifyLifeGoal } from './life-goal-verifier'
import { projectLifeTaskOutcome } from './life-task-outcome'
import { verifyLifeTaskCompletion } from './life-task-verification-runtime'

describe('committed execution, target proof and body projection', () => {
  it('keeps a quiet running attempt alive without rearming its gesture and drains its heartbeat on finish', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const publish = vi.fn()
    const thread = { id: 'task', attemptId: 'attempt', status: 'running', metadata: null } as const
    const observer = createLifeExecutionPresenceObserver({ cardId: 'alice', threadId: 'task', attemptId: 'attempt', enabled: () => true, read: async () => ({ thread: thread as never, outcome: null }), publish, onError: vi.fn(), now: Date.now })
    try {
      await observer.flush()
      const first = publish.mock.lastCall![0]
      await vi.advanceTimersByTimeAsync(24_000)
      await observer.flush()
      const current = publish.mock.lastCall![0]
      expect(current.activity.sequence).toBe(first.activity.sequence)
      expect(current.activity.phaseStartedAt).toBe(first.activity.phaseStartedAt)
      expect(current.expiresAt).toBeGreaterThan(Date.now())
      await observer.finish()
      const count = publish.mock.calls.length
      await vi.advanceTimersByTimeAsync(24_000)
      expect(publish).toHaveBeenCalledTimes(count)
    }
    finally {
      await observer.finish()
      vi.useRealTimers()
    }
  })
  it('shows real progress, withholds success for wrong bytes, and acknowledges only verified completion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-body-proof-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const publish = vi.fn()
    const error = vi.fn()
    const path = join(root, 'result.txt')
    const initial = await db.upsertTaskThread({ id: 'body-task', status: 'planned', goal: 'Save accepted bytes', kind: 'codebase-edit', metadata: { goalProof: { kind: 'file', path, contentHash: createHash('sha256').update('accepted').digest('hex') } } })
    const observer = createLifeExecutionPresenceObserver({ cardId: 'alice', threadId: initial.id, attemptId: initial.attemptId ?? null, enabled: () => true, read: async () => ({ thread: await db.getTaskThread(initial.id), outcome: projectLifeTaskOutcome(await db.readLifeState(), initial.id) }), publish, onError: error, now: Date.now })
    try {
      await observer.flush()
      expect(publish.mock.lastCall?.[0].activity.phase).toBe('orienting')
      await db.upsertTaskThread({ ...initial, status: 'running', expectedUpdatedAt: initial.updatedAt })
      await db.appendExecutionEvents([{ threadId: initial.id, attemptId: initial.attemptId, kind: 'step', threadStatus: 'running', payload: { action: 'actual-write' } }])
      await observer.flush()
      expect(publish.mock.lastCall?.[0].activity.phase).toBe('working')
      const workingSequence = publish.mock.lastCall![0].activity.sequence
      await observer.flush()
      expect(publish.mock.lastCall?.[0].activity.sequence).toBe(workingSequence)
      await writeFile(path, 'wrong')
      const currentRunning = (await db.getTaskThread(initial.id))!
      await db.upsertTaskThread({ ...currentRunning, status: 'completed', expectedUpdatedAt: currentRunning.updatedAt })
      await observer.flush()
      expect(publish.mock.lastCall?.[0].activity.phase).toBe('verifying')
      await verifyLifeTaskCompletion({ cardId: 'alice', threadId: initial.id, read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue })
      await observer.flush()
      expect(publish.mock.lastCall?.[0].activity.phase).toBe('blocked')
      await writeFile(path, 'accepted')
      // The actual governance command independently rechecks a blocked goal;
      // repeated adapter settlement cannot silently reopen it.
      const goal = (await db.readLifeState()).obligations[0]
      const verification = await verifyLifeGoal({ obligation: goal, readSetting: db.getMetaValue })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'manual-recheck', changes: [], mutations: [{ type: 'obligation-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification }] })
      await observer.finish()
      expect(publish.mock.lastCall?.[0].activity.phase).toBe('finished')
      expect(error).not.toHaveBeenCalled()
      expect(publish.mock.calls.map(call => call[0].activity.phase)).toEqual(['orienting', 'working', 'working', 'verifying', 'blocked', 'finished'])
    }
    finally {
      await observer.finish()
      await db.close()
      expect(resolve(root).startsWith(join(resolve(tmpdir()), 'alicization-body-proof-'))).toBe(true)
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fences scope changes during an asynchronous read and preserves terminal cancellation', async () => {
    const publish = vi.fn()
    let enabled = true
    const thread = { id: 'task', attemptId: 'attempt', status: 'cancelled', metadata: null } as const
    const observer = createLifeExecutionPresenceObserver({ cardId: 'alice', threadId: 'task', attemptId: 'attempt', enabled: () => enabled, read: vi.fn(async () => {
      enabled = false
      return { thread: thread as never, outcome: null }
    }), publish, onError: vi.fn(), now: () => 10_000 })
    await observer.finish()
    expect(publish).not.toHaveBeenCalled()
    const cancelled = createLifeExecutionPresenceObserver({ cardId: 'alice', threadId: 'task', attemptId: 'attempt', enabled: () => true, read: async () => ({ thread: thread as never, outcome: null }), publish, onError: vi.fn(), now: () => 10_000 })
    await cancelled.finish()
    expect(publish.mock.lastCall?.[0].activity.phase).toBe('interrupted')
  })

  it('rejects a previous attempt and does not propagate presentation failures into execution', async () => {
    const publish = vi.fn()
    const create = (read: () => Promise<{ thread: never, outcome: null }>, onError = vi.fn()) => createLifeExecutionPresenceObserver({ cardId: 'alice', threadId: 'task', attemptId: 'current', enabled: () => true, read, publish, onError, now: Date.now })
    await create(async () => ({ thread: { id: 'task', attemptId: 'old' } as never, outcome: null })).finish()
    expect(publish).not.toHaveBeenCalled()
    const diagnostic = vi.fn(() => {
      throw new Error('diagnostic unavailable')
    })
    await expect(create(async () => {
      throw new Error('snapshot unavailable')
    }, diagnostic).finish()).resolves.toBeUndefined()
    expect(diagnostic).toHaveBeenCalledOnce()
  })
})
