import type { ExecutionCriteriaChange, ExecutionCriterion } from '../../../../shared/execution-contracts'

import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { readExecutionCriterionReceipt } from './criterion-receipts'
import { createExecutionResourceBroker } from './resource-broker'
import { workInputHash } from './work-input-bindings'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'life-criteria-revision-'))
  let db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const errors: unknown[] = []
  const write = vi.fn((input: Record<string, unknown>, signal: AbortSignal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }))
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), tools: { 'tool.filesystem_write_file': write }, onError: error => errors.push(error) })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  const path = join(root, 'report.txt')
  await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '保存报告和附件，完成后让我验收。' }] }, new AbortController().signal)
  const criteria: ExecutionCriterion[] = [
    { id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['original report'] } },
    { id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '原报告符合要求吗？', artifactIds: ['file'] } },
    { id: 'obsolete', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: join(root, 'missing-attachment.txt'), includes: ['attachment'] } },
  ]
  const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: 'Save the report and attachment for review', criteria, steps: [{ id: 'save', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content: 'original report' }, acceptanceCriterionIds: ['file'] }] })
  await vi.waitFor(() => expect(runtime.isActive()).toBe(false), { timeout: 7000 })
  const view = await db.readLifeState({ executionPlanId: accepted.planId })
  const goal = view.obligations.find(goal => goal.threadId === accepted.rootThreadId)!
  const plan = view.execution!.plans.find(plan => plan.id === accepted.planId)!
  const command = (next: ExecutionCriterion[], requestId = 'change-requirements'): ExecutionCriteriaChange => ({ cardId: 'alice', planId: plan.id, expectedRevision: plan.revision, expectedGeneration: goal.generation, contractHash: plan.acceptanceHash, criteria: next, requestId })
  return { root, db: () => db, path, runtime, errors, write, criteria, goal, plan, command, reopen: async () => {
    await runtime.dispose()
    await db.close()
    db = await setupAlicizationDb(root, { cardId: 'alice' })
  }, close: async () => {
    await runtime.dispose()
    await db.close()
    await rm(root, { recursive: true, force: true })
  } }
}

it('revises the same responsibility, expires old approval and checks the current artifact without replaying its observed write', async () => {
  const f = await fixture()
  try {
    await f.runtime.review({ cardId: 'alice', obligationId: f.goal.id, expectedGeneration: f.goal.generation, contractHash: f.plan.acceptanceHash, criterionId: 'review', approved: true, requestId: 'old-positive-review' })
    const before = await stat(f.path)
    const changed: ExecutionCriterion[] = [
      { ...f.criteria[0], predicate: { kind: 'text-content', path: f.path, includes: ['new report'] } },
      { ...f.criteria[1], predicate: { kind: 'user-review', question: '新报告符合修改后的要求吗？', artifactIds: ['file'] } },
      { id: 'added', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: f.path, includes: ['追加说明'] } },
    ]
    const request = f.command(changed)
    expect(await f.runtime.changeCriteria(request)).toEqual({ state: 'criteria-revised' })
    let view = await f.db().readLifeState({ executionPlanId: f.plan.id })
    let goal = view.obligations.find(goal => goal.id === f.goal.id)!
    const plan = view.execution!.plans.find(plan => plan.id === f.plan.id)!
    expect(goal).toMatchObject({ id: f.goal.id, threadId: f.goal.threadId, generation: 2, status: 'blocked', verification: null })
    expect(plan).toMatchObject({ id: f.plan.id, revision: 2, obligationGeneration: 2 })
    expect(plan.acceptanceHash).not.toBe(f.plan.acceptanceHash)
    expect(view.execution!.results.find(result => result.planRevision === 2)).toMatchObject({ stepId: 'save', state: 'verified' })
    expect(await readExecutionCriterionReceipt(goal.proof.acceptance!, 'review', view.ingress)).toBeNull()
    expect((await stat(f.path)).mtimeMs).toBe(before.mtimeMs)
    await f.runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'check-new-requirements' })
    goal = (await f.db().readLifeState()).obligations.find(goal => goal.id === f.goal.id)!
    expect(goal).toMatchObject({ status: 'blocked', verification: { verdict: 'not-satisfied' } })
    expect(await readFile(f.path, 'utf8')).toBe('original report')
    await writeFile(f.path, 'new report\n追加说明：用户后来修改的内容。')
    const hostEdit = await stat(f.path)
    await f.runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'check-host-revision' })
    goal = (await f.db().readLifeState()).obligations.find(goal => goal.id === f.goal.id)!
    expect(goal).toMatchObject({ status: 'blocked', verification: { verdict: 'unknown' } })
    await expect(f.runtime.review({ cardId: 'alice', obligationId: goal.id, expectedGeneration: 1, contractHash: f.plan.acceptanceHash, criterionId: 'review', approved: true, requestId: 'stale-positive-review' })).rejects.toThrow()
    await f.runtime.review({ cardId: 'alice', obligationId: goal.id, expectedGeneration: 2, contractHash: plan.acceptanceHash, criterionId: 'review', approved: true, requestId: 'new-positive-review' })
    expect(await f.runtime.changeCriteria(request)).toEqual({ state: 'criteria-revised' })
    await expect(f.runtime.changeCriteria({ ...request, criteria: f.criteria })).rejects.toThrow('changed its parameters')
    await f.reopen()
    view = await f.db().readLifeState({ executionPlanId: f.plan.id })
    expect(view.obligations.find(goal => goal.id === f.goal.id)).toMatchObject({ generation: 2, status: 'fulfilled', verification: { verdict: 'satisfied', independent: false } })
    expect(f.write).toHaveBeenCalledTimes(1)
    expect((await stat(f.path)).mtimeMs).toBe(hostEdit.mtimeMs)
    expect(f.errors).toEqual([])
  }
  finally { await f.close() }
}, 30000)

it('refuses requirement changes while an adapter owns input and while its interrupted effect remains unknown', async () => {
  const f = await fixture()
  try {
    const started = Promise.withResolvers<void>()
    f.write.mockImplementation(async (_input, signal) => {
      started.resolve()
      return new Promise<never>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
    })
    const input = { path: f.path, content: 'must remain undispatched to the actual file' }
    const next = { ...f.plan, revision: 2, steps: [...f.plan.steps, { ...f.plan.steps[0], id: 'repair', dependsOn: ['save'], input, inputHash: workInputHash({ input }) }] }
    await f.runtime.save({ cardId: 'alice', plan: next, expectedRevision: 1, requestId: 'append-repair' })
    const running = f.runtime.run({ cardId: 'alice', planId: next.id, expectedRevision: 2, requestId: 'run-interrupted-repair' }).catch(error => error)
    await started.promise
    const request = { ...f.command(f.criteria.filter(item => item.id !== 'obsolete')), expectedRevision: 2 }
    await expect(f.runtime.changeCriteria(request)).rejects.toThrow('Pause active work')
    await f.runtime.stop({ cardId: 'alice', planId: next.id, expectedRevision: 2, requestId: 'pause-unknown-repair', action: 'pause' })
    await running
    await expect(f.runtime.changeCriteria(request)).rejects.toThrow('Stop and reconcile')
    const view = await f.db().readLifeState({ executionPlanId: next.id })
    expect(view.obligations.find(goal => goal.id === f.goal.id)?.generation).toBe(1)
    expect(view.effects.some(effect => effect.status === 'uncertain')).toBe(true)
    expect(await readFile(f.path, 'utf8')).toBe('original report')
    expect(view.ingress.some(entry => entry.source === 'execution-criteria-change')).toBe(false)
  }
  finally { await f.close() }
}, 30000)

it('uses a single CAS revision for concurrent changes and rejects malformed, stale and cancelled requirements without changing files', async () => {
  const f = await fixture()
  try {
    const before = await stat(f.path)
    await expect(f.runtime.changeCriteria(f.command(f.criteria.map(item => ({ ...item, required: false }))))).rejects.toThrow('required criterion')
    await expect(f.runtime.changeCriteria(f.command([f.criteria[1]]))).rejects.toThrow('refer to files')
    await expect(f.runtime.changeCriteria({ ...f.command(f.criteria), cardId: 'bob' })).rejects.toThrow('bound card')
    const first = f.command(f.criteria.filter(item => item.id !== 'obsolete'), 'concurrent-first')
    const second = f.command([{ ...f.criteria[0], predicate: { kind: 'text-content', path: f.path, includes: ['another requirement'] } }], 'concurrent-second')
    const results = await Promise.allSettled([f.runtime.changeCriteria(first), f.runtime.changeCriteria(second)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    let view = await f.db().readLifeState({ executionPlanId: f.plan.id })
    const goal = view.obligations.find(goal => goal.id === f.goal.id)!
    expect(goal.generation).toBe(2)
    expect(view.execution!.plans.find(plan => plan.id === f.plan.id)?.revision).toBe(2)
    expect(view.ingress.filter(entry => entry.source === 'execution-criteria-change')).toHaveLength(1)
    await expect(f.runtime.changeCriteria(f.command(f.criteria, 'stale-revision'))).rejects.toThrow('changed')
    await f.runtime.stop({ cardId: 'alice', planId: f.plan.id, expectedRevision: 2, requestId: 'cancel-original-root', action: 'cancel' })
    view = await f.db().readLifeState({ executionPlanId: f.plan.id })
    await expect(f.runtime.changeCriteria({ ...first, requestId: 'after-cancel', expectedRevision: 2, expectedGeneration: view.obligations.find(item => item.id === goal.id)!.generation, contractHash: view.execution!.plans[0].acceptanceHash })).rejects.toThrow('changed')
    expect(f.write).toHaveBeenCalledTimes(1)
    expect((await stat(f.path)).mtimeMs).toBe(before.mtimeMs)
  }
  finally { await f.close() }
}, 30000)

it('runs only the unfinished part after a criteria change, with the same root and original observed file intact', async () => {
  const f = await fixture()
  try {
    const path = join(f.root, 'missing-attachment.txt')
    const input = { path, content: 'new attachment' }
    const next = { ...f.plan, revision: 2, steps: [...f.plan.steps, { ...f.plan.steps[0], id: 'attachment', dependsOn: ['save'], input, inputHash: workInputHash({ input }), acceptanceCriterionIds: ['obsolete'] }] }
    await f.runtime.save({ cardId: 'alice', plan: next, expectedRevision: 1, requestId: 'accept-future-attachment' })
    const before = await stat(f.path)
    const criteria = f.criteria.map(item => item.id === 'obsolete' ? { ...item, predicate: { kind: 'text-content' as const, path, includes: ['new attachment'] } } : item)
    await f.runtime.changeCriteria({ ...f.command(criteria), expectedRevision: 2 })
    await f.runtime.run({ cardId: 'alice', planId: next.id, expectedRevision: 3, requestId: 'resume-new-requirements' })
    expect(await readFile(path, 'utf8')).toBe('new attachment')
    expect((await stat(f.path)).mtimeMs).toBe(before.mtimeMs)
    expect(f.write).toHaveBeenCalledTimes(2)
    expect(f.write.mock.calls.filter(([input]) => input.path === f.path)).toHaveLength(1)
    const goal = (await f.db().readLifeState()).obligations.find(goal => goal.id === f.goal.id)!
    expect(goal).toMatchObject({ generation: 2, status: 'blocked', verification: { verdict: 'unknown' } })
    await f.runtime.review({ cardId: 'alice', obligationId: goal.id, expectedGeneration: 2, contractHash: goal.proof.acceptance!.contractHash, criterionId: 'review', approved: true, requestId: 'confirm-updated-delivery' })
    expect((await f.db().readLifeState()).obligations.find(goal => goal.id === f.goal.id)?.status).toBe('fulfilled')
    expect(f.errors).toEqual([])
  }
  finally { await f.close() }
}, 30000)

it('keeps source withdrawal effective across the new responsibility generation', async () => {
  const f = await fixture()
  try {
    await f.db().upsertMemoryFacts([{ subject: 'user', predicate: 'preference', object: '保留报告附件', confidence: 0.95 }], 'rule')
    const fact = (await f.db().readLifeFactVersions({ cardId: 'alice' }))[0]
    const source = { cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }
    const thread = await f.db().getTaskThread(f.plan.rootThreadId)
    expect(thread).not.toBeNull()
    await f.db().upsertTaskThread({ ...thread!, metadata: { ...thread!.metadata, sourceEvidence: [source] }, expectedUpdatedAt: thread!.updatedAt })
    await f.runtime.changeCriteria(f.command(f.criteria.filter(item => item.id !== 'obsolete')))
    await f.db().commitLifeState({ cardId: 'alice', operationKey: 'withdraw-source-after-requirement-change', changes: [], mutations: [{ type: 'evidence-invalidate', source, mode: 'forget', reason: 'user-request' }] })
    const view = await f.db().readLifeState({ executionPlanId: f.plan.id })
    const goal = view.obligations.find(goal => goal.id === f.goal.id)!
    expect(goal).toMatchObject({ generation: 2, invalidatedBy: source })
    await expect(f.runtime.start({ cardId: 'alice', planId: f.plan.id, expectedRevision: 2, requestId: 'must-not-resume' })).rejects.toThrow()
    await expect(f.runtime.changeCriteria({ ...f.command(f.criteria, 'must-not-revive'), expectedGeneration: 2, expectedRevision: 2, contractHash: goal.proof.acceptance!.contractHash })).rejects.toThrow('changed')
    expect(f.write).toHaveBeenCalledTimes(1)
  }
  finally { await f.close() }
}, 30000)
