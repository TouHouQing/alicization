import type { LifeStateView } from '../../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { withActionDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'
import { currentWorkAdmissionRepairContext } from './work-acknowledgment-repair-context'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { createWorkPlanToolSpec } from './work-plan-tool'

it('repairs an unsupported source-file claim using its actual current admission without approving the rejected claim or dispatching I/O', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-admission-repair-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const write = vi.fn(async () => { throw new Error('Repair must not perform a file action') })
  const work = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, broker, interrupts: createExecutionInterruptRegistry(broker), onError: (error) => { throw error }, tools: { 'tool.filesystem_write_file': write, 'tool.filesystem_read_file': write } })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  const signal = new AbortController().signal
  let phase = 'admission'
  try {
    const path = join(root, 'private-report.txt')
    const source = join(root, 'private-source.txt')
    const content = 'Private source content must not be repeated in admission repair🙂'
    const spec = createWorkPlanToolSpec(input => work.propose({ ...input, cardId: 'alice', turnId: 'current' }))
    const parameters = spec.parameters.parse({ goal: '先写报告再读取来源', criteria: [{ id: 'report', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: [content] } }], steps: [{ id: 'save', capabilityId: 'tool.filesystem_write_file', dependsOn: [], input: { path, content }, acceptanceCriterionIds: ['report'] }, { id: 'read', capabilityId: 'tool.filesystem_read_file', dependsOn: ['save'], input: { path: source }, acceptanceCriterionIds: [] }] })
    await life.admit({ cardId: 'alice', turnId: 'current', conversationId: 'main', messages: [{ role: 'user', content: '按约定的两个步骤处理本地报告，来源稍后由我在界面纠正。' }] }, signal)
    const effect = await life.beforeAction({ cardId: 'alice', turnId: 'current', actionId: 'admit', capabilityId: 'tool.life_execute_work_plan', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.life_execute_work_plan')!.effects }, signal)
    await effect.authorizeDispatch(parameters)
    phase = 'tool execution'
    const accepted = await withActionDispatch(effect.assertDispatchCurrent, () => spec.execute(parameters, { abortSignal: signal })) as { planId: string, rootThreadId: string }
    phase = 'tool receipt'
    await life.afterAction({ cardId: 'alice', id: effect.id, outcome: 'success', output: accepted, interrupted: false })
    await vi.waitFor(() => expect(work.isActive()).toBe(false))
    await work.wakeReady()
    let quote = '第二步的来源文件缺失。'
    const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, commit: db.commitLifeState, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async () => JSON.stringify({ claims: [{ kind: 'execution-step-outcome', quote, binding: null, meaningMatchesBinding: false }] }) })
    const check = async () => review({ cardId: 'alice', turnId: 'current', text: quote, owners: (await db.readLifeState()).owners, signal })
    phase = 'rejected draft review'
    const rejected = await check()
    expect(rejected.accepted).toBe(false)
    expect(rejected.repairMode).toBe('current-admission')
    expect(rejected.issues).toContainEqual({ code: 'UNPROVEN_COMPLETION', quote })
    const repeatedReview = await check()
    expect(repeatedReview.accepted).toBe(false)
    expect(repeatedReview.reviewId).not.toBe(rejected.reviewId)
    const repair = JSON.parse(rejected.repairContext!).data
    expect(repair.scope).toBe('current-admission-repair-only')
    expect(repair.receiptWording).toBe('我接下这件事了。')
    expect(repair.admission).toMatchObject({ binding: { kind: 'effect', id: effect.id }, planId: accepted.planId, scope: 'accepted-work-plan-only-no-step-or-goal-completion' })
    const audit = await db.getLifeIngress(rejected.reviewId!)
    expect(audit?.payload).toMatchObject({ accepted: false, repairMode: 'current-admission', admissionRepairHash: createHash('sha256').update(rejected.repairContext!).digest('hex') })
    expect(audit?.payload.reviewAttemptId).toMatch(/^[a-f0-9-]{36}$/u)
    expect(audit?.payload.reviewHash).toMatch(/^[a-f0-9]{64}$/u)
    for (const privateValue of [path, source, content])
      expect(rejected.repairContext).not.toContain(privateValue)
    quote = repair.receiptWording
    phase = 'repaired draft review'
    expect((await check()).accepted).toBe(true)
    expect(write).not.toHaveBeenCalled()
    const state = await db.readLifeState({ executionPlanId: accepted.planId })
    expect(state.execution?.results).toEqual([])
    expect(state.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).not.toBe('fulfilled')
    const repairInput = { view: state, turnId: 'current', text: '第二步的来源文件缺失。', claims: [{ kind: 'execution-step-outcome', quote: '第二步的来源文件缺失。', binding: null, meaningMatchesBinding: false }], issues: rejected.issues, hasRequestedInterval: false }
    expect(currentWorkAdmissionRepairContext(repairInput)).not.toBeNull()
    expect(currentWorkAdmissionRepairContext({ ...repairInput, hasRequestedInterval: true })).toBeNull()
    expect(currentWorkAdmissionRepairContext({ ...repairInput, turnId: 'another-request' })).toBeNull()
    expect(currentWorkAdmissionRepairContext({ ...repairInput, issues: [{ code: 'UNRELIABLE_REVIEW', quote: repairInput.text }] })).toBeNull()
    expect(currentWorkAdmissionRepairContext({ ...repairInput, claims: [{ ...repairInput.claims[0], kind: 'memory-stored' }] })).toBeNull()
    expect(currentWorkAdmissionRepairContext({ ...repairInput, text: 'The quoted claim is not this draft' })).toBeNull()
    const rejectChangedReceipt = (mutate: (view: LifeStateView) => void) => {
      const changed = structuredClone(state)
      mutate(changed)
      expect(currentWorkAdmissionRepairContext({ ...repairInput, view: changed })).toBeNull()
    }
    rejectChangedReceipt((view) => { view.effects.splice(0) })
    rejectChangedReceipt((view) => { view.effects.find(item => item.id === effect.id)!.status = 'uncertain' })
    rejectChangedReceipt((view) => { view.effects.find(item => item.id === effect.id)!.turnId = 'old-request' })
    rejectChangedReceipt((view) => { (view.effects.find(item => item.id === effect.id)!.payload.parameters as Record<string, unknown>).goal = 'another responsibility' })
    rejectChangedReceipt((view) => { view.obligations.find(item => item.threadId === accepted.rootThreadId)!.status = 'cancelled' })
    rejectChangedReceipt((view) => { view.effects.push({ ...view.effects.find(item => item.id === effect.id)!, id: 'ambiguous-second-admission' }) })
    await life.settle({ cardId: 'alice', turnId: 'current', status: 'completed' })
    expect(currentWorkAdmissionRepairContext({ ...repairInput, view: await db.readLifeState() })).toBeNull()
  }
  catch (error) { throw new Error(`Admission repair fixture during ${phase}`, { cause: error }) }
  finally { await work.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
})
