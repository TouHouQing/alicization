import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { admitVerifiedExecutionProcedure } from './procedure-admission'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

describe('accepted local responsibilities across foreground handoff and restart', () => {
  it('yields to foreground interaction and resumes the same accepted noncoding responsibility on an event', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-work-handoff-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    let foreground = true
    const broker = createExecutionResourceBroker()
    const errors = vi.fn()
    let writes = 0
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => !foreground, broker, interrupts: createExecutionInterruptRegistry(broker), onError: errors, tools: { 'tool.filesystem_write_file': async (input) => { writes++; await writeFile(String(input.path), String(input.content)); return { ok: true } } } })
    try {
      const path = join(directory, 'report.txt')
      await db.upsertTaskThread({ id: 'report', goal: 'Save this report', kind: 'mixed', status: 'planned', metadata: { goalProof: { kind: 'file', path, contentHash: createHash('sha256').update('accepted report').digest('hex') } } })
      const plan = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'report', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'accepted report' } })
      expect(await runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'first-window' })).toMatchObject({ state: 'yielded', steps: 0 })
      expect(writes).toBe(0)
      expect((await db.readLifeState()).obligations[0].status).toBe('in-progress')
      foreground = false
      await runtime.wakeReady()
      expect(errors).not.toHaveBeenCalled()
      const view = await db.readLifeState()
      expect(view.obligations[0].status).toBe('fulfilled')
      expect(view.execution?.slices).toHaveLength(2)
      expect(writes).toBe(1)
      expect(await readFile(path, 'utf8')).toBe('accepted report')
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it.each([true, false])('recovers a persisted write checkpoint with receipt=%s without repeating its physical write', async (hasReceipt) => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-work-checkpoint-'))
    let db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const execute = vi.fn(async () => { throw new Error('A recovered write must not be replayed') })
    const errors = vi.fn()
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: errors, tools: { 'tool.filesystem_write_file': execute } })
    try {
      const path = join(directory, 'result.txt')
      await db.upsertTaskThread({ id: 'checkpoint', goal: 'Save accepted bytes', kind: 'mixed', status: 'planned', metadata: { goalProof: { kind: 'file', path, contentHash: createHash('sha256').update('accepted bytes').digest('hex') } } })
      const plan = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'checkpoint', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'accepted bytes' } })
      const thread = (await db.getTaskThread('checkpoint'))!
      await db.upsertTaskThread({ ...thread, status: 'running', expectedUpdatedAt: thread.updatedAt })
      const id = randomUUID()
      const slice = { id, planId: plan.id, planRevision: plan.revision, rootObligationId: plan.rootObligationId, obligationGeneration: plan.obligationGeneration, ingressId: `task-run:${id}`, attemptId: randomUUID(), budget: 16, cursor: 0, updatedAt: Date.now() }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'checkpoint-start', changes: [], mutations: [
        { type: 'execution-slice', slice: { ...slice, state: 'ready' }, expectedState: null },
        { type: 'execution-slice', slice: { ...slice, state: 'running' }, expectedState: 'ready' },
        { type: 'execution-step-result', expectedState: 'pending', result: { planId: plan.id, planRevision: 1, stepId: 'perform', attemptId: slice.attemptId, inputHash: plan.steps[0].inputHash, effectId: null, observationRefs: [], output: {}, state: 'running', createdAt: Date.now() } },
      ] })
      const life = () => createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getEffect: db.getLifeEffect, getIngress: db.getLifeIngress, now: Date.now })
      const effect = await life().beforeAction({ cardId: 'alice', turnId: slice.ingressId, actionId: 'perform', capabilityId: 'tool.filesystem_write_file', parameters: plan.steps[0].input, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, new AbortController().signal)
      await writeFile(path, 'accepted bytes')
      if (hasReceipt)
        await life().afterAction({ cardId: 'alice', id: effect.id, outcome: 'success', output: { ok: true }, interrupted: false })
      await db.close()
      db = await setupAlicizationDb(directory, { cardId: 'alice' })
      // Inactive cards are read-only during host bootstrap. Work recovery must
      // classify this stopped owner's dispatch when that card becomes current.
      await runtime.wakeReady()
      const view = await db.readLifeState()
      expect(errors).not.toHaveBeenCalled()
      expect(execute).not.toHaveBeenCalled()
      expect(view.obligations[0].status).toBe('fulfilled')
      expect(view.execution?.results[0].state).toBe('verified')
      const recovered = await db.getLifeEffect(effect.id)
      expect(recovered?.status).toBe('settled')
      if (!hasReceipt) {
        expect(recovered?.receipt?.reconciliation).toMatchObject({ effectId: effect.id, verdict: 'applied', independent: true, evidence: { scope: 'current-file-bytes-only' } })
        expect(view.ingress.find(item => item.source === 'execution-reconciliation')?.status).toBe('settled')
        expect(admitVerifiedExecutionProcedure((await db.getTaskThread('checkpoint'))!, view)).toBe(false)
      }
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })
})
