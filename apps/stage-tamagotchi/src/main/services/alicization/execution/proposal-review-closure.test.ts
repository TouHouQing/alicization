import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeExecutionPresenceObserver } from '../life-execution-presence'
import { verifyLifeGoal } from '../life-goal-verifier'
import { projectLifeTaskOutcome } from '../life-task-outcome'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { readExecutionCriterionReceipt } from './criterion-receipts'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { createWorkPlanToolSpec, normalizeWorkProposal } from './work-plan-tool'

describe('current request, durable work, artifact review and goal settlement', () => {
  it('runs a model-shaped proposal and binds actual user approval to the delivered artifact version', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-proposal-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const errors: unknown[] = []
    const publish = vi.fn()
    try {
      const path = join(root, 'report.txt')
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getEffect: db.getLifeEffect, getIngress: db.getLifeIngress, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'session', messages: [{ role: 'user', content: '写一份当前版本的报告，完成后让我检查。' }] }, new AbortController().signal)
      const broker = createExecutionResourceBroker()
      const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: (error) => { errors.push(error) }, tools: { 'tool.filesystem_write_file': async (input) => { await writeFile(String(input.path), String(input.content)); return { ok: true } } }, observe: ({ plan, attemptId }) => createLifeExecutionPresenceObserver({ cardId: plan.cardId, threadId: plan.rootThreadId, attemptId, enabled: () => true, read: async () => ({ thread: await db.getTaskThread(plan.rootThreadId), outcome: projectLifeTaskOutcome(await db.readLifeState(), plan.rootThreadId) }), publish, onError: error => errors.push(error), now: Date.now }) })
      const spec = createWorkPlanToolSpec(input => runtime.propose({ ...input, cardId: 'alice', turnId: 'request' }))
      const proposal = spec.parameters.parse({ goal: '完成当前报告并交给主人检查', criteria: [{ id: 'report', required: true, predicate: { kind: 'text-content', path, includes: ['当前版本'] }, proofScope: 'structure' }, { id: 'review', required: true, predicate: { kind: 'user-review', question: '这份报告符合要求吗？', artifactIds: ['report'] }, proofScope: 'user-reported' }], steps: [{ id: 'write', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content: '当前版本的报告' }, acceptanceCriterionIds: ['report'] }] })
      const result = await spec.execute(proposal, {}) as { planId: string, rootThreadId: string }
      await life.settle({ cardId: 'alice', turnId: 'request', status: 'completed' })
      let view = await db.readLifeState()
      for (let i = 0; i < 100; i++) {
        view = await db.readLifeState()
        if (errors.length || view.obligations.find(goal => goal.threadId === result.rootThreadId)?.status === 'blocked')
          break
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      expect(errors).toEqual([])
      const goal = view.obligations.find(item => item.threadId === result.rootThreadId)!
      expect(goal.status).toBe('blocked')
      expect(goal.verification?.verdict).toBe('unknown')
      const beforeReviewSequence = publish.mock.lastCall?.[0].activity.sequence
      expect(view.execution!.slices[0].ingressId).not.toBe('user:request')
      expect(await runtime.review({ cardId: 'alice', obligationId: goal.id, expectedGeneration: goal.generation, contractHash: goal.proof.acceptance!.contractHash, criterionId: 'review', approved: true, requestId: 'actual-ui-feedback' })).toEqual({ state: 'satisfied' })
      view = await db.readLifeState()
      const fulfilled = view.obligations.find(item => item.id === goal.id)!
      expect(fulfilled.status).toBe('fulfilled')
      expect(fulfilled.verification?.independent).toBe(false)
      expect(publish.mock.lastCall?.[0].activity.phase).toBe('finished')
      expect(publish.mock.lastCall?.[0].activity.sequence).toBeGreaterThan(beforeReviewSequence)
      expect(await runtime.review({ cardId: 'alice', obligationId: goal.id, expectedGeneration: goal.generation, contractHash: goal.proof.acceptance!.contractHash, criterionId: 'review', approved: true, requestId: 'actual-ui-feedback' })).toEqual({ state: 'satisfied' })
      await expect(runtime.review({ cardId: 'alice', obligationId: goal.id, expectedGeneration: goal.generation, contractHash: goal.proof.acceptance!.contractHash, criterionId: 'review', approved: false, requestId: 'actual-ui-feedback' })).rejects.toThrow('reused')
      for (let batch = 0; batch < 5; batch++) {
        await db.commitLifeState({ cardId: 'alice', operationKey: `newer-activity-tail:${batch}`, changes: [], mutations: Array.from({ length: 22 }, (_, offset) => {
          const index = batch * 22 + offset
          return [
            { type: 'ingress-accept' as const, ingress: { id: `later:${index}`, kind: 'system' as const, source: 'test-later-activity', sourceKey: `later:${index}`, occurredAt: Date.now(), payload: {} } },
            { type: 'ingress-settle' as const, id: `later:${index}`, status: 'settled' as const },
          ]
        }).flat() })
      }
      view = await db.readLifeState()
      expect((await verifyLifeGoal({ obligation: { ...fulfilled, status: 'verifying' }, readSetting: db.getMetaValue, readReview: id => readExecutionCriterionReceipt(fulfilled.proof.acceptance!, id, view.ingress) })).verdict).toBe('satisfied')
      await writeFile(path, '当前版本，后来又改过')
      const verification = await verifyLifeGoal({ obligation: { ...fulfilled, status: 'verifying' }, readSetting: db.getMetaValue, readReview: id => readExecutionCriterionReceipt(fulfilled.proof.acceptance!, id, view.ingress) })
      expect(verification.verdict).toBe('unknown')
      await expect(runtime.propose({ ...normalizeWorkProposal(proposal), goal: 'not admitted', cardId: 'alice', turnId: 'no-source' })).rejects.toThrow('current user request')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
