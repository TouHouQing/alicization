import type { ExecutionCriteriaChange, ExecutionCriterion, ExecutionWorkGraphChange } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { access, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')

for (const round of [1, 2, 3]) {
  it(`atomically inserts, removes and rewires future work then resumes after reopen without repeating observed writes (${round})`, async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'alicization-work-graph-')))
    const files = { a: join(root, 'retained.txt'), b: join(root, 'old-future.txt'), obsolete: join(root, 'obsolete.txt'), revised: join(root, 'revised.txt'), added: join(root, 'added.txt'), source: join(root, 'source.txt') }
    await writeFile(files.source, `Owned read fixture ${round}`, { flag: 'wx' })
    const text = { a: `Retained ${round} 中文🙂`, b: `Future ${round}`, c: `Added ${round}` }
    const criterion = (id: string, path: string, content: string): ExecutionCriterion => ({ id, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: digest(content) } })
    let database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
    let canContinue = true
    const writes: string[] = []
    const runtime = () => {
      const broker = createExecutionResourceBroker()
      return createWorkPlanExecutionRuntime({ getDatabase: () => database, enabled: () => true, canContinue: () => canContinue, onError: (error) => { throw error }, broker, interrupts: createExecutionInterruptRegistry(broker), tools: {
        'tool.filesystem_read_file': (input, signal) => callLocalFilesystem({ toolName: 'read_file', arguments: input, workspace: root, signal }),
        'tool.filesystem_write_file': async (input, signal) => {
          const result = await callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal })
          writes.push(String(input.path))
          if (writes.length === 1)
            canContinue = false
          return result
        },
      } })
    }
    let work = runtime()
    try {
      const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: 'Keep the observed file, then let me revise the remaining local workflow.' }] }, new AbortController().signal)
      const accepted = await work.propose({ cardId: 'alice', turnId: 'request', goal: 'Retain completed work across a host graph revision', criteria: [criterion('a', files.a, text.a), criterion('b', files.b, text.b), criterion('obsolete', files.obsolete, 'Obsolete')], steps: [
        { id: 'a', capabilityId: 'tool.filesystem_write_file', input: { path: files.a, content: text.a }, dependsOn: [], acceptanceCriterionIds: ['a'] },
        { id: 'old-read', capabilityId: 'tool.filesystem_read_file', input: { path: join(root, 'missing.txt') }, dependsOn: ['a'], acceptanceCriterionIds: [] },
        { id: 'b', capabilityId: 'tool.filesystem_write_file', input: { path: files.b, content: text.b }, dependsOn: ['old-read'], acceptanceCriterionIds: ['b'] },
        { id: 'obsolete', capabilityId: 'tool.filesystem_write_file', input: { path: files.obsolete, content: 'Obsolete' }, dependsOn: ['b'], acceptanceCriterionIds: ['obsolete'] },
      ] })
      await life.settle({ cardId: 'alice', turnId: 'request', status: 'completed' })
      await vi.waitFor(() => expect(work.isActive()).toBe(false), { timeout: 15000 })
      expect(writes).toEqual([files.a])
      const before = await database.readLifeState({ executionPlanId: accepted.planId })
      const plan = before.execution!.plans[0]
      const goal = before.obligations.find(item => item.id === plan.rootObligationId)!
      const original = { mtimeMs: (await stat(files.a)).mtimeMs, effectId: before.execution!.results.find(item => item.stepId === 'a')!.effectId }
      const command: ExecutionCriteriaChange = { cardId: 'alice', planId: plan.id, expectedRevision: plan.revision, expectedGeneration: goal.generation, contractHash: plan.acceptanceHash, criteria: [criterion('a', files.a, text.a), criterion('b', files.revised, text.b), criterion('c', files.added, text.c)], requestId: 'host-revised-graph', graphChanges: [
        { kind: 'insert-after', stepId: 'new-read', templateStepId: 'old-read', afterStepId: 'a' },
        { kind: 'remove', stepId: 'old-read' },
        { kind: 'remove', stepId: 'obsolete' },
        { kind: 'insert-after', stepId: 'c', templateStepId: 'b', afterStepId: 'b' },
        { kind: 'dependencies', stepId: 'b', dependsOn: ['new-read'] },
      ], stepChanges: [{ stepId: 'new-read', changes: { path: files.source } }, { stepId: 'b', changes: { path: files.revised } }, { stepId: 'c', changes: { path: files.added, content: text.c } }] }
      const invalid = [
        { key: 'protected', changes: [{ kind: 'remove', stepId: 'a' }], reason: /observed/iu },
        { key: 'duplicate-id', changes: [{ kind: 'insert-after', stepId: 'b', templateStepId: 'b', afterStepId: 'a' }], reason: /unique/iu },
        { key: 'duplicate-mutation', changes: [{ kind: 'insert-after', stepId: 'again', templateStepId: 'a', afterStepId: 'a' }], reason: /WORK_GRAPH_DUPLICATE_MUTATION/u },
        { key: 'cycle', changes: [{ kind: 'dependencies', stepId: 'b', dependsOn: ['obsolete'] }], reason: /cycle/iu },
      ] satisfies { key: string, changes: ExecutionWorkGraphChange[], reason: RegExp }[]
      for (const item of invalid) {
        await expect(work.changeCriteria({ ...command, requestId: item.key, stepChanges: undefined, graphChanges: structuredClone(item.changes) })).rejects.toThrow(item.reason)
        expect(await database.getLifeIngress(`work-criteria-change:${item.key}`)).toBeNull()
      }
      await expect(work.changeCriteria({ ...command, requestId: 'duplicate-updated-inputs', stepChanges: [{ stepId: 'new-read', changes: { path: files.source } }, { stepId: 'b', changes: { path: files.revised } }, { stepId: 'c', changes: { path: files.revised, content: text.b } }] })).rejects.toThrow('WORK_GRAPH_DUPLICATE_MUTATION')
      expect(await database.getLifeIngress('work-criteria-change:duplicate-updated-inputs')).toBeNull()
      const staleReadCriterion: ExecutionCriterion = { id: 'must-retain-read', required: true, proofScope: 'bytes', predicate: { kind: 'file-matches-read', path: files.revised, stepId: 'old-read' } }
      await expect(work.changeCriteria({ ...command, requestId: 'criterion-lost-read', criteria: [...command.criteria, staleReadCriterion] })).rejects.toThrow('exact accepted filesystem read')
      expect(await database.getLifeIngress('work-criteria-change:criterion-lost-read')).toBeNull()
      expect((await database.readLifeState({ executionPlanId: plan.id })).obligations.find(item => item.id === goal.id)?.generation).toBe(1)
      await work.changeCriteria(command)
      const audit = await database.getLifeIngress(`work-criteria-change:${command.requestId}`)
      expect(audit?.payload.graphChanges).toMatchObject({ inserted: [{ stepId: 'new-read', templateStepId: 'old-read' }, { stepId: 'c', templateStepId: 'b' }], removed: ['old-read', 'obsolete'], dependencies: ['b'] })
      await work.dispose()
      await database.close()
      database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
      canContinue = true
      work = runtime()
      await work.start({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'resume-revised-graph' })
      await vi.waitFor(async () => expect((await database.readLifeState({ executionPlanId: plan.id })).obligations.find(item => item.id === goal.id)).toMatchObject({ generation: 2, status: 'fulfilled', verification: { verdict: 'satisfied', independent: true } }), { timeout: 15000 })
      await vi.waitFor(() => expect(work.isActive()).toBe(false))
      expect(writes).toEqual([files.a, files.revised, files.added])
      expect(await readFile(files.a, 'utf8')).toBe(text.a)
      expect((await stat(files.a)).mtimeMs).toBe(original.mtimeMs)
      expect(await readFile(files.revised, 'utf8')).toBe(text.b)
      expect(await readFile(files.added, 'utf8')).toBe(text.c)
      await expect(access(files.b)).rejects.toThrow()
      await expect(access(files.obsolete)).rejects.toThrow()
      const after = await database.readLifeState({ executionPlanId: plan.id })
      expect(after.execution!.results.find(item => item.stepId === 'a')!.effectId).toBe(original.effectId)
      expect(after.execution!.plans[0].steps.map(step => step.id)).toEqual(['a', 'new-read', 'b', 'c'])
      if (round === 1) {
        const registry = createCanonicalToolRegistry()
        const repository = createProcedureCandidateRepository(database, 'alice', registry)
        const candidateId = await repository.capture(accepted.rootThreadId)
        const candidate = await repository.get(candidateId)
        expect(candidate.source.inputIds).toContain(`work-criteria-change:${command.requestId}`)
        const evaluation = await evaluateProcedureCandidate(candidateId, candidate, registry, new AbortController().signal)
        expect(evaluation.status).toBe('passed')
        await repository.recordEvaluation(evaluation)
        expect(await repository.getAvailable(candidateId)).not.toBeNull()
        await database.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-graph-authority', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'life_ingress', id: `work-criteria-change:${command.requestId}`, version: '*' }, mode: 'correction', reason: 'user-request' }] })
        expect(await repository.getAvailable(candidateId)).toBeNull()
      }
    }
    finally {
      await work.dispose()
      await database.close()
      await rm(root, { recursive: true, force: true })
    }
  }, 45000)
}
