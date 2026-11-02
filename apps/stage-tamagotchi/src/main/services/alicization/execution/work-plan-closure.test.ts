import type { WorkPlan } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { verifyLifeTaskCompletion } from '../life-task-verification-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { executionDigest } from './acceptance-compiler'
import { createWorkPlanScheduler } from './work-plan-scheduler'

describe('durable work slices under the existing life writer', () => {
  it('yields at 16 actions, restarts from persisted results, and independently verifies the same root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-work-plan-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const path = join(root, 'result.txt')
    let oldRun = ''
    const executed: string[] = []
    const effects = { version: 'life-capability-effects-v1', sideEffect: 'mutation', retryClass: 'verify-before-retry', verifier: 'independent-goal-proof', compensation: 'manual-review' } as const
    try {
      await db.upsertTaskThread({ id: 'long-task', goal: 'Complete twenty ordered steps', kind: 'codebase-edit', status: 'planned', metadata: { acceptanceCriteria: [{ id: 'final', required: true, predicate: { kind: 'file-bytes', path, sha256: createHash('sha256').update('result-19').digest('hex') }, proofScope: 'bytes' }] } })
      const view = await db.readLifeState()
      const acceptance = view.execution!.contracts[0]
      const plan: WorkPlan = { id: 'long-plan', cardId: 'alice', rootThreadId: 'long-task', rootObligationId: acceptance.rootObligationId, obligationGeneration: acceptance.obligationGeneration, revision: 1, acceptanceHash: acceptance.contractHash, sourceEvidenceRefs: [], steps: Array.from({ length: 20 }, (_, n) => ({ id: `s${n}`, dependsOn: n ? [`s${n - 1}`] : [], capabilityId: 'tool.filesystem_write_file', input: { path, content: `result-${n}` }, inputHash: executionDigest({ path, content: `result-${n}` }), acceptanceCriterionIds: n === 19 ? ['final'] : [], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null })) }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'plan-admit', changes: [], mutations: [{ type: 'execution-plan', plan, expectedRevision: 0 }] })
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'stale-plan', changes: [], mutations: [{ type: 'execution-plan', plan: { ...plan, revision: 2 }, expectedRevision: 0 }] })).rejects.toThrow('CAS')
      function scheduler() {
        const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
        return createWorkPlanScheduler({ read: db.readLifeState, commit: db.commitLifeState, execute: async ({ step, slice, signal }) => {
          oldRun ||= slice.ingressId
          const action = await life.beforeAction({ cardId: 'alice', turnId: slice.ingressId, actionId: step.id, capabilityId: step.capabilityId, parameters: step.input, effectContract: effects }, signal)
          await writeFile(path, String(step.input.content))
          executed.push(step.id)
          await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: { ok: true }, interrupted: false })
          return { effectId: action.id, observationRefs: [`observation:${action.id}`], output: { bytesReadBack: await readFile(path, 'utf8') }, state: 'verified' }
        } })
      }
      expect(await scheduler().runSlice(plan.id, new AbortController().signal)).toEqual({ state: 'yielded', steps: 16 })
      expect(executed).toHaveLength(16)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const afterRestart = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await expect(afterRestart.beforeAction({ cardId: 'alice', turnId: oldRun, actionId: 's16', capabilityId: 'tool.filesystem_write_file', parameters: plan.steps[16].input }, new AbortController().signal)).rejects.toThrow('active user input')
      expect(await scheduler().runSlice(plan.id, new AbortController().signal)).toEqual({ state: 'steps-observed', steps: 4 })
      expect(new Set(executed).size).toBe(20)
      expect((await db.readLifeState()).execution!.slices.map(item => item.ingressId)).toHaveLength(2)
      const thread = (await db.getTaskThread('long-task'))!
      await db.upsertTaskThread({ ...thread, status: 'completed', expectedUpdatedAt: thread.updatedAt })
      expect((await verifyLifeTaskCompletion({ cardId: 'alice', threadId: thread.id, read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue }))?.verdict).toBe('satisfied')
      expect((await db.readLifeState()).obligations.find(item => item.id === acceptance.rootObligationId)?.status).toBe('fulfilled')
      const historical = await afterRestart.beforeAction({ cardId: 'alice', turnId: oldRun, actionId: 's0', capabilityId: plan.steps[0].capabilityId, parameters: plan.steps[0].input, effectContract: effects }, new AbortController().signal)
      expect(historical.cached).toMatchObject({ outcome: 'success' })
      await expect(historical.authorizeDispatch(plan.steps[0].input)).rejects.toThrow('settled action')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
