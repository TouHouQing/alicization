import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { currentExecutionWorkAcknowledgment } from './work-acknowledgment'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it.each(['task-creation', 'unobserved-operations'] as const)('grounds %s in the actual current plan without claiming its effects or borrowing another request', async (mode) => {
  const root = await mkdtemp(join(tmpdir(), 'life-work-observation-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const browser = { kind: 'managed' as const, id: 'owned-browser' }
  const dispatch = vi.fn()
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, captureBrowserBinding: () => browser, isBrowserBindingCurrent: current => current?.id === browser.id, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.browser_open_url': dispatch, 'tool.browser_read_page': dispatch, 'tool.filesystem_write_file': dispatch } })
  try {
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '接受计划，读取指定本机网页的回执，再保存到指定新文件。' }] }, signal)
    await runtime.propose({ cardId: 'alice', turnId: 'request', goal: '保存当前网页回执', criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: join(root, 'receipt.txt'), includes: ['receipt'] } }], steps: [{ id: 'open', capabilityId: 'tool.browser_open_url', input: { url: 'http://127.0.0.1:8123/owned-form' }, dependsOn: [], acceptanceCriterionIds: [] }, { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'text' }, dependsOn: ['open'], acceptanceCriterionIds: [] }, { id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path: join(root, 'receipt.txt'), content: 'receipt' }, dependsOn: ['read'], acceptanceCriterionIds: ['file'] }] })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    const quote = mode === 'task-creation' ? '任务已经创建。' : '网页操作、回执读取和文件写入尚未有完成结果。'
    const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, commit: db.commitLifeState, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
      const goal = JSON.parse(user).obligations.find((item: { summary: string }) => item.summary === '保存当前网页回执')
      return JSON.stringify({ claims: [{ kind: mode === 'task-creation' ? 'task-acknowledgment' : 'execution-step-outcome', quote, binding: mode === 'task-creation' ? goal.binding : null, meaningMatchesBinding: mode === 'task-creation' }] })
    } })
    const result = await review({ cardId: 'alice', turnId: 'request', text: quote, owners: (await db.readLifeState()).owners, signal })
    expect(result.accepted, JSON.stringify(result.issues)).toBe(true)
    const view = await db.readLifeState()
    expect(currentExecutionWorkAcknowledgment(view, 'request', quote)).not.toBeNull()
    expect(currentExecutionWorkAcknowledgment(view, 'another-request', quote)).toBeNull()
    for (const unsafe of ['网页操作、上传和文件写入尚未有完成结果。', '网站尚未生成回执。', '网页操作已经完成。', `${quote}我已经保存了报告。`, '其他任务已经创建。'])
      expect(currentExecutionWorkAcknowledgment(view, 'request', unsafe), unsafe).toBeNull()
    if (mode === 'unobserved-operations') {
      const observed = structuredClone(view)
      const plan = observed.execution!.plans[0]
      const step = plan.steps[0]
      observed.execution!.results.push({ planId: plan.id, planRevision: plan.revision, stepId: step.id, attemptId: 'observed-attempt', inputHash: step.inputHash, effectId: null, observationRefs: ['owned-observation'], output: {}, state: 'verified', createdAt: Date.now() })
      expect(currentExecutionWorkAcknowledgment(observed, 'request', quote)).toBeNull()
      const otherCapabilities = structuredClone(view)
      otherCapabilities.execution!.plans[0].steps = otherCapabilities.execution!.plans[0].steps.filter(step => step.capabilityId !== 'tool.filesystem_write_file')
      expect(currentExecutionWorkAcknowledgment(otherCapabilities, 'request', quote)).toBeNull()
    }
    expect(dispatch).not.toHaveBeenCalled()
    expect(view.execution!.results).toEqual([])
  }
  finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
})
