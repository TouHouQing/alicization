import type { ExecutionCriterion, ExecutionWorkProposal } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { inspectWorkProposalCoherence, workProposalRepairFence } from './work-proposal-coherence'

const path = join(tmpdir(), 'life-coherence-fixture.json')
function proposal(content = '{"marker":"exact 中文🙂"}'): ExecutionWorkProposal {
  return { goal: 'Save the exact accepted marker', criteria: [{ id: 'content', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['exact 中文🙂'] } }], steps: [{ id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path, content }, dependsOn: [], acceptanceCriterionIds: ['content'] }] }
}

it('rejects contradictory work before creating a responsibility, then independently verifies one corrected native write', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-plan-coherence-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const errors: unknown[] = []
  let ready = false
  const write = vi.fn((input: Record<string, unknown>, signal: AbortSignal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }))
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => ready, broker, interrupts: createExecutionInterruptRegistry(broker), tools: { 'tool.filesystem_write_file': write }, onError: error => errors.push(error) })
  try {
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getEffect: db.getLifeEffect, getIngress: db.getLifeIngress, now: Date.now })
    await life.admit({ cardId: 'alice', turnId: 'exact-file', conversationId: 'primary', messages: [{ role: 'user', content: 'Save the exact marker' }] }, new AbortController().signal)
    const exact = proposal()
    const ownedPath = join(root, 'report.json')
    exact.steps[0].input.path = ownedPath
    if ('path' in exact.criteria[0].predicate)
      exact.criteria[0].predicate.path = ownedPath
    const wrong = structuredClone(exact)
    wrong.steps[0].input.content = 'wrong marker'
    const before = await db.readLifeState()
    await expect(runtime.propose({ ...wrong, cardId: 'alice', turnId: 'exact-file' })).rejects.toThrow('contradicts')
    const rejected = await db.readLifeState()
    expect(rejected.obligations).toEqual(before.obligations)
    expect(rejected.execution?.plans).toEqual(before.execution?.plans)
    expect(write).not.toHaveBeenCalled()
    await expect(stat(ownedPath)).rejects.toMatchObject({ code: 'ENOENT' })
    const accepted = await runtime.propose({ ...exact, cardId: 'alice', turnId: 'exact-file' })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    ready = true
    await runtime.start({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'host-continues-exact-work' })
    await vi.waitFor(async () => {
      expect((await db.readLifeState()).obligations.find(goal => goal.threadId === accepted.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
    }, { timeout: 7000 })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    expect(await readFile(ownedPath, 'utf8')).toBe(exact.steps[0].input.content)
    expect(write).toHaveBeenCalledTimes(1)
    expect(errors).toEqual([])
  }
  finally {
    await runtime.dispose()
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30000)

it.each<ExecutionCriterion>([
  { id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: createHash('sha256').update('{"marker":"exact 中文🙂"}').digest('hex') } },
  { id: 'text', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['exact 中文🙂'] } },
  { id: 'json', required: true, proofScope: 'structure', predicate: { kind: 'json-structure', path, requiredKeys: ['marker'] } },
])('rejects a provably contradictory final literal file: $id', (criterion) => {
  const exact = { ...proposal(), criteria: [criterion] }
  expect(inspectWorkProposalCoherence(exact)).toEqual([])
  const wrong = { ...proposal('wrong literal bytes'), criteria: [criterion] }
  expect(inspectWorkProposalCoherence(wrong)).toEqual([{ keyword: 'literalArtifactMismatch', field: 'steps.0.input.content' }])
  expect(wrong.steps[0].input.content).toBe('wrong literal bytes')
  expect(wrong.criteria).toEqual([criterion])
})

it('uses dependency order for the final writer rather than array order or an intermediate draft', () => {
  const value = proposal()
  const final = { ...value.steps[0], id: 'final', dependsOn: ['draft'] }
  const draft = { ...value.steps[0], id: 'draft', input: { path, content: 'unfinished draft' }, acceptanceCriterionIds: [] }
  value.steps = [final, draft]
  expect(inspectWorkProposalCoherence(value)).toEqual([])
  value.steps[0].input = { path, content: 'wrong final bytes' }
  expect(inspectWorkProposalCoherence(value)).toHaveLength(1)
})

it('leaves dynamic content, dynamic destinations, external writers and unordered writes to independent verification', () => {
  const dynamic = proposal('to be resolved')
  dynamic.steps[0].inputBindings = [{ parameter: 'content', stepId: 'source', path: ['text'] }]
  dynamic.steps.push({ id: 'source', capabilityId: 'tool.filesystem_read_file', input: { path: join(tmpdir(), 'source.txt') }, dependsOn: [], acceptanceCriterionIds: [] })
  dynamic.steps[0].dependsOn = ['source']
  expect(inspectWorkProposalCoherence(dynamic)).toEqual([])
  dynamic.steps[0].inputBindings[0].parameter = 'path'
  expect(inspectWorkProposalCoherence(dynamic)).toEqual([])
  const external = proposal('not the final content')
  external.steps.push({ id: 'external', capabilityId: 'tool.browser_type_text', input: { text: 'a possible external writer' }, dependsOn: ['write'], acceptanceCriterionIds: [] })
  expect(inspectWorkProposalCoherence(external)).toEqual([])
  const unordered = proposal('first candidate')
  unordered.steps.push({ ...unordered.steps[0], id: 'other', input: { path, content: 'second candidate' } })
  expect(inspectWorkProposalCoherence(unordered)).toEqual([])
})

it('fences every repair argument except the literal content slots', () => {
  const value = proposal('one character wrong')
  expect(workProposalRepairFence(value)).toBe(workProposalRepairFence(proposal()))
  for (const mutate of [
    (item: ExecutionWorkProposal) => { item.goal = 'another goal' },
    (item: ExecutionWorkProposal) => { item.criteria[0].required = false },
    (item: ExecutionWorkProposal) => { item.criteria = [] },
    (item: ExecutionWorkProposal) => { item.steps[0].input.path = join(tmpdir(), 'another-file.json') },
    (item: ExecutionWorkProposal) => { item.steps[0].acceptanceCriterionIds = [] },
  ]) {
    const changed = structuredClone(value)
    mutate(changed)
    if (changed.criteria.length)
      expect(workProposalRepairFence(changed)).not.toBe(workProposalRepairFence(value))
    else
      expect(() => workProposalRepairFence(changed)).toThrow()
  }
})
