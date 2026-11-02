import type { IpcMainEvent } from 'electron'

import type { ExecutionCriterion } from '../../../../shared/execution-contracts'

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { link, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

import { electronLifeExecutionArtifact, electronLifeObligationCommand } from '../../../../shared/life-events'
import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeExecutionPresenceObserver } from '../life-execution-presence'
import { projectLifeTaskOutcome } from '../life-task-outcome'
import { executionGoalVerificationInputs } from '../life-task-verification-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { normalizeMcpToolCallResult } from '../main-chat-execution-surface'
import { registerLifeInvokeHandlers } from '../runtime-invoke-handlers-life'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { compileTaskAcceptance } from './acceptance-compiler'
import { withActionDispatch } from './action-dispatch-context'
import { deriveExecutionAttention } from './execution-attention'
import { verifyExecutionFileReadMatch } from './file-read-match-verifier'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse())
    await cleanup()
})

async function fixture(content: string, fault?: 'truncate' | 'digest' | 'proof' | 'user-edit' | 'review' | 'alias' | 'copy-review', observe?: Parameters<typeof createWorkPlanExecutionRuntime>[0]['observe']) {
  const root = await mkdtemp(join(tmpdir(), 'life-read-match-'))
  const source = join(root, 'source.txt')
  const target = join(root, 'target.txt')
  await writeFile(source, content)
  if (fault === 'alias')
    await link(source, target)
  const db = await setupAlicizationDb(join(root, 'db'), { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const errors = vi.fn()
  const read = vi.fn(async (parameters: Record<string, unknown>, signal: AbortSignal) => {
    const raw = await callLocalFilesystem({ toolName: 'read_file', arguments: parameters, workspace: root, signal })
    const output = normalizeMcpToolCallResult(raw) as typeof raw
    if (fault === 'digest')
      output.structuredContent = { ...output.structuredContent, contentHash: '0'.repeat(64) }
    if (fault === 'proof')
      output.structuredContent = { ...output.structuredContent, readVerified: false }
    return output
  })
  const write = vi.fn(async (parameters: Record<string, unknown>, signal: AbortSignal) => {
    if (fault === 'user-edit')
      await writeFile(source, 'A subsequent edit by the synthetic file owner')
    const result = await callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal })
    if (fault === 'truncate')
      await writeFile(target, String(parameters.content).slice(0, 6))
    return normalizeMcpToolCallResult(result)
  })
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: errors, tools: { 'tool.filesystem_read_file': read, 'tool.filesystem_write_file': write }, observe })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  cleanups.push(async () => { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) })
  const signal = new AbortController().signal
  await life.admit({ cardId: 'alice', turnId: 'copy-request', conversationId: 'primary', messages: [{ role: 'user', content: `Read ${source} and copy its complete observed bytes to ${target}.` }] }, signal)
  const predicate = { kind: 'file-matches-read' as const, path: target, stepId: 'read-source' }
  const criteria: ExecutionCriterion[] = fault === 'review' ? [{ id: 'copy', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: 'Please inspect the copy', artifactIds: [] } }] : [{ id: 'copy', required: true, proofScope: 'bytes', predicate }]
  if (fault === 'copy-review')
    criteria.push({ id: 'host-review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: 'Does the actual copy meet your needs?', artifactIds: ['copy'] } })
  const accepted = await runtime.propose({ cardId: 'alice', turnId: 'copy-request', goal: 'Copy the complete observed source', criteria, steps: [
    { id: 'read-source', capabilityId: 'tool.filesystem_read_file', input: { path: source }, dependsOn: [], acceptanceCriterionIds: [] },
    ...(fault === 'alias' ? [] : [{ id: 'save-copy', capabilityId: 'tool.filesystem_write_file' as const, input: { path: target, content: '@observed' }, inputBindings: [{ parameter: 'content', stepId: 'read-source', path: ['content', '0', 'text'] }], dependsOn: ['read-source'], acceptanceCriterionIds: ['copy'] }]),
  ] })
  await vi.waitFor(() => expect(runtime.isActive(), String(errors.mock.calls)).toBe(false), { timeout: 10000 })
  const view = await db.readLifeState({ executionPlanId: accepted.planId })
  const goal = view.obligations.find(item => item.threadId === accepted.rootThreadId)!
  const contract = view.execution!.contracts.find(item => item.contractHash === goal.proof.acceptance!.contractHash)!
  return { root, source, target, db, database: db, runtime, life, signal, read, write, errors, accepted, predicate, criteria, view, goal, contract }
}

function hostControls(f: Awaited<ReturnType<typeof fixture>>, openArtifact = vi.fn(async (_path: string) => '')) {
  type Handler = Parameters<Parameters<typeof registerLifeInvokeHandlers>[0]['register']>[1]
  const handlers = new Map<unknown, Handler>()
  registerLifeInvokeHandlers({
    register: (event, handler) => handlers.set(event, handler),
    withCardScope: async (cardId, task) => {
      if (cardId !== 'alice')
        throw new Error('Foreign card')
      return task()
    },
    read: f.db.readLifeState,
    readClosure: f.db.readLifeClosure,
    commit: f.db.commitLifeState,
    getIngress: f.db.getLifeIngress,
    getUserInput: f.db.getLifeUserInput,
    readSetting: f.db.getMetaValue,
    hasPublishedTurn: f.db.hasPublishedLifeTurn,
    getSurface: f.db.getLifeSurface,
    copyText: () => {},
    surfaceVisible: () => true,
    rescheduleTimer: async () => {},
    cancelExecution: () => {},
    verificationInputs: (view, goal) => executionGoalVerificationInputs(f.db, view, goal),
    refreshExecutionOutcome: f.runtime.refreshOutcome,
    openArtifact,
  })
  const sender = Object.assign(new EventEmitter(), { id: 95, isDestroyed: () => false, getURL: () => 'file:///app/renderer/index.html#/settings/life' })
  const metadata = { raw: { ipcMainEvent: { sender } as unknown as IpcMainEvent } }
  return { openArtifact, invoke: (event: unknown, input: unknown) => handlers.get(event)!(input, metadata) }
}

it.each(['', 'Full observed bytes\r\n中文🙂\n', '\uFEFFKeep the BOM and final newline\n'])('independently fulfils the same root using the entire actual read snapshot: %j', async (text) => {
  const f = await fixture(text)
  expect(f.goal.status, String(f.errors.mock.calls)).toBe('fulfilled')
  expect(f.goal.verification).toMatchObject({ verdict: 'satisfied', independent: true })
  expect(await readFile(f.target, 'utf8')).toBe(text)
  expect(f.read).toHaveBeenCalledOnce()
  expect(f.write).toHaveBeenCalledOnce()
  expect(f.errors).not.toHaveBeenCalled()
  const verified = await verifyExecutionFileReadMatch(f)
  expect(verified).toMatchObject({ verdict: 'satisfied', evidence: { scope: 'observed-source-bytes', sourceBytes: Buffer.byteLength(text), stepId: 'read-source' } })
})

it.each(['truncate', 'digest', 'proof'] as const)('does not fulfil the root from incomplete or inconsistent bytes: %s', async (fault) => {
  const f = await fixture('Marker plus the rest of the entire original file. 中文🙂', fault)
  expect(f.goal.status).toBe('blocked')
  expect(f.goal.verification?.verdict).toBe(fault === 'truncate' ? 'not-satisfied' : 'unknown')
  expect(f.read).toHaveBeenCalledOnce()
  expect(f.write).toHaveBeenCalledOnce()
  expect(f.errors).not.toHaveBeenCalled()
})

it('uses the authorized snapshot without a second source read or overwriting a later owner edit', async () => {
  const f = await fixture('The authorized original bytes', 'user-edit')
  expect(f.goal.status).toBe('fulfilled')
  expect(await readFile(f.target, 'utf8')).toBe('The authorized original bytes')
  expect(await readFile(f.source, 'utf8')).toBe('A subsequent edit by the synthetic file owner')
  expect(f.read).toHaveBeenCalledOnce()
})

it('opens only the currently accepted exact-copy artifact through the trusted host control', async () => {
  const f = await fixture('The accepted exact copy')
  const controls = hostControls(f)
  const input = { cardId: 'alice', obligationId: f.goal.id, expectedGeneration: f.goal.generation, criterionId: 'copy' }
  expect(await controls.invoke(electronLifeExecutionArtifact, input)).toEqual({ state: 'open-requested' })
  expect(controls.openArtifact).toHaveBeenCalledExactlyOnceWith(f.target)
  await expect(controls.invoke(electronLifeExecutionArtifact, { ...input, expectedGeneration: f.goal.generation + 1 })).rejects.toThrow('no longer available')
  await expect(controls.invoke(electronLifeExecutionArtifact, { ...input, criterionId: 'foreign-artifact' })).rejects.toThrow('no longer available')
  expect(controls.openArtifact).toHaveBeenCalledOnce()
})

it('accepts an explicit review of the exact-copy artifact without repeating a read or write', async () => {
  const f = await fixture('Bytes and a separate explicit review', 'copy-review')
  expect(f.goal.status).toBe('blocked')
  await f.runtime.review({ cardId: 'alice', obligationId: f.goal.id, expectedGeneration: f.goal.generation, contractHash: f.contract.contractHash, criterionId: 'host-review', approved: true, requestId: 'review-current-copy' })
  expect((await f.db.readLifeState()).obligations.find(item => item.id === f.goal.id)?.status).toBe('fulfilled')
  expect(f.read).toHaveBeenCalledOnce()
  expect(f.write).toHaveBeenCalledOnce()
})

it('rechecks a host-corrected target through the actual governance handler and refreshes the same execution body', async () => {
  const publish = vi.fn()
  const text = 'The complete originally read bytes 中文🙂'
  const f = await fixture(text, 'truncate', ({ database, plan, attemptId }) => createLifeExecutionPresenceObserver({ cardId: 'alice', threadId: plan.rootThreadId, attemptId, enabled: () => true, read: async () => {
    const view = await database.readLifeState({ executionPlanId: plan.id })
    const thread = await database.getTaskThread(plan.rootThreadId)
    return { thread, outcome: projectLifeTaskOutcome(view, plan.rootThreadId), work: thread ? deriveExecutionAttention(view, thread) : null }
  }, publish, onError: (error) => { throw error }, now: Date.now }))
  expect(f.goal.status).toBe('blocked')
  await writeFile(f.target, text)
  const controls = hostControls(f)
  await controls.invoke(electronLifeObligationCommand, { cardId: 'alice', id: f.goal.id, operationId: 'recheck-current-copy', expectedGeneration: f.goal.generation, expectedRevision: f.goal.revision, action: 'verify' })
  expect((await f.db.readLifeState()).obligations.find(item => item.id === f.goal.id)?.status).toBe('fulfilled')
  expect(publish.mock.lastCall?.[0].activity).toMatchObject({ id: f.accepted.rootThreadId, phase: 'finished' })
  expect(f.read).toHaveBeenCalledOnce()
  expect(f.write).toHaveBeenCalledOnce()
})

it('does not certify an independent copy when the target is only another hard link to the source', async () => {
  const f = await fixture('Same bytes and same actual file object', 'alias')
  expect(f.goal.status).toBe('blocked')
  expect(f.goal.verification?.verdict).toBe('unknown')
  expect(await verifyExecutionFileReadMatch(f)).toMatchObject({ verdict: 'unknown', evidence: { reason: 'source-and-target-are-the-same-file' } })
  expect(f.read).toHaveBeenCalledOnce()
  expect(f.write).not.toHaveBeenCalled()
})

it('checks explicit new requirements through their real lineage without repeating the retained read or write', async () => {
  const f = await fixture('Actual retained bytes', 'review')
  expect(f.goal.status).toBe('blocked')
  const plan = f.view.execution!.plans[0]
  await f.runtime.changeCriteria({ cardId: 'alice', planId: plan.id, expectedRevision: plan.revision, expectedGeneration: f.goal.generation, contractHash: f.contract.contractHash, requestId: 'stronger-copy-criterion', criteria: [{ id: 'copy', required: true, proofScope: 'bytes', predicate: f.predicate }] })
  await f.runtime.start({ cardId: 'alice', planId: plan.id, expectedRevision: plan.revision + 1, requestId: 'verify-new-copy-condition' })
  await vi.waitFor(async () => {
    expect((await f.db.readLifeState()).obligations.find(item => item.id === f.goal.id)?.status, String(f.errors.mock.calls)).toBe('fulfilled')
    expect(f.runtime.isActive()).toBe(false)
  }, { timeout: 10000 })
  expect(f.read).toHaveBeenCalledOnce()
  expect(f.write).toHaveBeenCalledOnce()
})

it('learns an anonymous copy relation and replays it against different actual files before evaluation can pass', async () => {
  const f = await fixture('Private source text that must not be embedded in a method')
  const registry = createCanonicalToolRegistry()
  const repository = createProcedureCandidateRepository(f.db, 'alice', registry)
  const candidateId = await repository.capture(f.accepted.rootThreadId)
  const candidate = await repository.get(candidateId)
  const serialized = JSON.stringify(candidate.template)
  expect(serialized).not.toContain(f.source)
  expect(serialized).not.toContain(f.target)
  expect(serialized).not.toContain('Private source text')
  expect(candidate.template.criteria[0].predicate).toMatchObject({ kind: 'file-matches-read', stepId: 'step1' })
  const evaluation = await evaluateProcedureCandidate(candidateId, candidate, registry, new AbortController().signal)
  expect(evaluation.status, JSON.stringify(evaluation.cases)).toBe('passed')
  expect(evaluation.cases.filter(item => item.name.startsWith('different-input-'))).toHaveLength(2)
  expect(evaluation.cases.every(item => item.passed)).toBe(true)
})

it('refuses a genuine successful read from another turn and retains current result and source fences', async () => {
  const f = await fixture('The complete observed content')
  await f.life.admit({ cardId: 'alice', turnId: 'other-request', conversationId: 'primary', messages: [{ role: 'user', content: 'Read this owned file in a different request' }] }, f.signal)
  const parameters = { path: f.source }
  const action = await f.life.beforeAction({ cardId: 'alice', turnId: 'other-request', actionId: 'read-source', capabilityId: 'tool.filesystem_read_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_read_file')!.effects }, f.signal)
  await action.authorizeDispatch(parameters)
  const output = await withActionDispatch(action.assertDispatchCurrent, () => f.read(parameters, f.signal))
  await f.life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output, interrupted: false })
  const view = structuredClone(f.view)
  view.execution!.results.find(item => item.stepId === 'read-source')!.effectId = action.id
  expect((await verifyExecutionFileReadMatch({ ...f, view })).verdict).toBe('unknown')
  expect((await verifyExecutionFileReadMatch({ ...f, view: { ...f.view, cardId: 'other-card' } })).verdict).toBe('unknown')
  const changed = structuredClone(f.view)
  changed.execution!.results.find(item => item.stepId === 'read-source')!.inputHash = '0'.repeat(64)
  expect((await verifyExecutionFileReadMatch({ ...f, view: changed })).verdict).toBe('unknown')
  const withdrawn = structuredClone(f.view)
  withdrawn.obligations.find(item => item.id === f.goal.id)!.invalidatedBy = { cardId: 'alice', kind: 'user-turn', id: 'user:copy-request', version: 'withdrawn-source' }
  expect((await verifyExecutionFileReadMatch({ ...f, view: withdrawn })).verdict).toBe('unknown')
})

it('requires the actual filesystem-read step when accepting a new comparison criterion', async () => {
  const f = await fixture('Complete source')
  const proposal = { cardId: 'alice', turnId: 'copy-request', goal: 'A new invalid reference', criteria: [{ ...f.criteria[0], predicate: { ...f.predicate, stepId: 'not-a-read' } }], steps: [{ id: 'not-a-read', capabilityId: 'tool.filesystem_write_file' as const, input: { path: join(f.root, 'never-written.txt'), content: 'must not run' }, dependsOn: [], acceptanceCriterionIds: [] }] }
  await expect(f.runtime.propose(proposal)).rejects.toThrow('exact accepted filesystem read')
  await expect(f.runtime.propose({ ...proposal, goal: 'Invalid self comparison', criteria: [{ ...f.criteria[0], predicate: { ...f.predicate, path: f.source } }], steps: [{ id: 'read-source', capabilityId: 'tool.filesystem_read_file', input: { path: f.source }, dependsOn: [], acceptanceCriterionIds: [] }] })).rejects.toThrow('cannot use its target')
  expect(f.write).toHaveBeenCalledOnce()
  expect(() => compileTaskAcceptance({ ...f.contract, criteria: [{ ...f.criteria[0], proofScope: 'structure' }] })).toThrow('proof scope')
})
