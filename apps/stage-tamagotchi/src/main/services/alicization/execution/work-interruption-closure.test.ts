import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeExecutionPresenceObserver } from '../life-execution-presence'
import { projectLifeTaskOutcome } from '../life-task-outcome'
import { deriveExecutionAttention } from './execution-attention'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

describe('work interruption, retry and committed embodiment', () => {
  it('releases a cancelled read owner after independent closure without replaying or fulfilling its goal', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-work-read-stop-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    let entered!: () => void
    const started = new Promise<void>((resolve) => { entered = resolve })
    const read = vi.fn(async (_input, signal: AbortSignal) => {
      entered()
      await new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => resolve(), { once: true })
        if (signal.aborted)
          resolve()
      })
      signal.throwIfAborted()
    })
    const runtime = createWorkPlanExecutionRuntime({
      getDatabase: () => db,
      enabled: () => true,
      broker,
      interrupts: createExecutionInterruptRegistry(broker),
      onError: vi.fn(),
      tools: { 'tool.filesystem_read_file': read },
    })
    try {
      const path = join(directory, 'source.txt')
      await writeFile(path, 'unchanged source')
      await db.upsertTaskThread({ id: 'read-stop', status: 'planned', kind: 'mixed', goal: 'Read the source' })
      const plan = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'read-stop', capabilityId: 'tool.filesystem_read_file', parameters: { path } })
      const running = runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'read-first' }).catch(error => error)
      await started
      await runtime.stop({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'read-cancel', action: 'cancel' })
      expect(await running).toBeInstanceOf(Error)
      const deadline = Date.now() + 2000
      let view = await db.readLifeState()
      while ((view.effects.find(effect => effect.kind === 'execute')?.status === 'uncertain' || broker.snapshot().length) && Date.now() < deadline) {
        await delay(20)
        view = await db.readLifeState()
      }
      expect(view.obligations[0].status).toBe('cancelled')
      expect(view.effects.find(effect => effect.kind === 'execute')).toMatchObject({ status: 'failed', receipt: { outcome: 'not-applied' } })
      expect(broker.snapshot()).toEqual([])
      const next = broker.acquire({ owner: 'unrelated-next-task', resources: ['host:execution'] })
      broker.settle(next, { stopped: true, uncertain: false })
      expect(read).toHaveBeenCalledTimes(1)
      expect(await readFile(path, 'utf8')).toBe('unchanged source')
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it('persists a definite read failure, resumes once, and projects actual reading without speech', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-work-read-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const publish = vi.fn()
    let reads = 0
    const broker = createExecutionResourceBroker()
    const runtime = createWorkPlanExecutionRuntime({
      getDatabase: () => db,
      enabled: () => true,
      broker,
      interrupts: createExecutionInterruptRegistry(broker),
      onError: vi.fn(),
      tools: { 'tool.filesystem_read_file': async () => {
        if (++reads === 1)
          throw new Error('temporary read failure'); return { ok: true }
      } },
      observe: ({ database, plan, attemptId }) => createLifeExecutionPresenceObserver({
        cardId: plan.cardId,
        threadId: plan.rootThreadId,
        attemptId,
        enabled: () => true,
        read: async () => {
          const view = await database.readLifeState()
          const thread = await database.getTaskThread(plan.rootThreadId)
          return { thread, outcome: projectLifeTaskOutcome(view, plan.rootThreadId), work: thread ? deriveExecutionAttention(view, thread) : null }
        },
        publish,
        onError: (error) => { throw error },
        now: Date.now,
      }),
    })
    try {
      const path = join(directory, 'source.txt')
      await writeFile(path, 'existing accepted data')
      await db.upsertTaskThread({ id: 'read', status: 'planned', kind: 'mixed', goal: 'Inspect the accepted file', metadata: { goalProof: { kind: 'file', path, contentHash: createHash('sha256').update('existing accepted data').digest('hex') } } })
      const plan = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'read', capabilityId: 'tool.filesystem_read_file', parameters: { path } })
      await expect(runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'first' })).rejects.toThrow('temporary')
      let view = await db.readLifeState()
      expect(view.execution?.results[0].state).toBe('blocked')
      expect(view.execution?.slices[0].state).toBe('stopped')
      expect((await db.getTaskThread('read'))?.status).toBe('paused')
      expect(broker.snapshot()).toEqual([])
      expect(await runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'second' })).toMatchObject({ state: 'steps-observed' })
      view = await db.readLifeState()
      expect(view.obligations[0].status).toBe('fulfilled')
      expect(reads).toBe(2)
      expect(publish.mock.calls.some(([pulse]) => pulse.activity.work?.mode === 'reading')).toBe(true)
      expect(publish.mock.calls.every(([pulse]) => pulse.scenario === 'general')).toBe(true)
      expect(publish.mock.lastCall?.[0].activity.phase).toBe('finished')
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it('records the outcome of an interrupted write without completing or replaying its cancelled goal', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-work-stop-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    let entered!: () => void
    const started = new Promise<void>((resolve) => { entered = resolve })
    let writes = 0
    const runtime = createWorkPlanExecutionRuntime({
      getDatabase: () => db,
      enabled: () => true,
      broker,
      interrupts: createExecutionInterruptRegistry(broker),
      onError: vi.fn(),
      tools: { 'tool.filesystem_write_file': async (input, signal) => {
        writes++
        await writeFile(String(input.path), String(input.content))
        entered()
        await new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => resolve(), { once: true }); if (signal.aborted)
            resolve()
        })
        return { ok: false, effectMayHaveOccurred: true }
      } },
    })
    try {
      const path = join(directory, 'delivered.txt')
      await db.upsertTaskThread({ id: 'write', status: 'planned', kind: 'mixed', goal: 'Write a result' })
      const plan = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'write', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'partial delivered work' } })
      const running = runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'write-first' })
      const settled = running.catch(error => error)
      await started
      expect(await runtime.stop({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'cancel', action: 'cancel' })).toMatchObject({ state: 'stopping' })
      expect(await settled).toBeInstanceOf(Error)
      // No resume command or additional host interaction supplies this wake.
      const deadline = Date.now() + 5000
      let reconciled = await db.readLifeState()
      while ((reconciled.execution?.results[0].state !== 'verified' || broker.snapshot().length > 0) && Date.now() < deadline) {
        await delay(20)
        reconciled = await db.readLifeState()
      }
      expect(reconciled.obligations[0].status).toBe('cancelled')
      expect(reconciled.effects.find(effect => effect.kind === 'execute')?.status).toBe('settled')
      expect(reconciled.execution?.results[0].state).toBe('verified')
      expect(broker.snapshot()).toEqual([])
      expect(reconciled.ingress.find(item => item.source === 'execution-reconciliation')?.status).toBe('settled')
      const original = await db.getLifeIngress(`observation:${reconciled.execution?.results[0].effectId}`)
      expect(original?.payload.output).toMatchObject({ ok: false, effectMayHaveOccurred: true })
      expect(await readFile(path, 'utf8')).toBe('partial delivered work')
      await expect(runtime.start({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'retry-cancelled' })).rejects.toThrow('accepted responsibility')
      expect(writes).toBe(1)
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })
})
