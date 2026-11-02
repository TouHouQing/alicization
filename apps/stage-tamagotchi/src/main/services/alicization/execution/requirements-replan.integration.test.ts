import type { ExecutionCriteriaChange, ExecutionCriterion } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createAlicizationSkillLoader } from '../turn-os/skill-loader'
import { createAlicizationSkillRegistry } from '../turn-os/skill-registry'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createLearnedProcedureRuntime } from './learned-procedure-runtime'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { createProcedureSkillFileSystem } from './procedure-skill-files'
import { createExecutionResourceBroker } from './resource-broker'
import { createSkillLifecyclePersistence } from './skill-lifecycle-repository'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const digest = (text: string) => createHash('sha256').update(text).digest('hex')

for (const round of [1, 2, 3]) {
  it(`atomically changes unfinished classification after multiple windows and resumes only those writes after restart (${round})`, async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'alicization-requirements-replan-')))
    const oldDirectory = join(root, 'by-type')
    const newDirectory = join(root, `by-date-${round}`)
    await mkdir(oldDirectory)
    await mkdir(newDirectory)
    let database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
    const errors: unknown[] = []
    const writes: Array<{ path: string, content: string }> = []
    let canContinue = true
    const createRuntime = () => {
      const broker = createExecutionResourceBroker()
      return createWorkPlanExecutionRuntime({ getDatabase: () => database, enabled: () => true, canContinue: () => canContinue, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: { 'tool.filesystem_write_file': async (input, signal) => {
        const result = await callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal })
        writes.push(input as { path: string, content: string })
        if (writes.length === 17)
          canContinue = false
        return result
      } } })
    }
    let work = createRuntime()
    let learned: ReturnType<typeof createLearnedProcedureRuntime> | undefined
    const life = createLifeTurnRuntime({ read: () => database.readLifeState(), commit: input => database.commitLifeState(input), getIngress: id => database.getLifeIngress(id), getEffect: id => database.getLifeEffect(id), now: Date.now })
    const files = Array.from({ length: 24 }, (_, index) => ({ id: `save-${index}`, path: join(oldDirectory, `item-${index}.txt`), text: `Owned original content ${round}/${index} 中文🙂` }))
    const criteria: ExecutionCriterion[] = files.map(file => ({ id: file.id, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: file.path, sha256: digest(file.text) } }))
    try {
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: 'Save these owned files, preserving verified work if the unfinished classification changes.' }] }, new AbortController().signal)
      const accepted = await work.propose({ cardId: 'alice', turnId: 'request', goal: 'Classify 24 owned files', criteria, steps: files.map((file, index) => ({ id: file.id, dependsOn: index ? [files[index - 1].id] : [], capabilityId: 'tool.filesystem_write_file', input: { path: file.path, content: file.text }, acceptanceCriterionIds: [file.id] })) })
      await life.settle({ cardId: 'alice', turnId: 'request', status: 'completed' })
      await vi.waitFor(() => expect(work.isActive()).toBe(false), { timeout: 15000 })
      expect(errors).toEqual([])
      expect(writes).toHaveLength(17)
      const view = await database.readLifeState({ executionPlanId: accepted.planId })
      const plan = view.execution!.plans.find(item => item.id === accepted.planId)!
      const goal = view.obligations.find(item => item.id === plan.rootObligationId)!
      expect(view.execution!.slices.filter(item => item.planId === plan.id && item.state === 'yielded').length).toBeGreaterThanOrEqual(2)
      const originals = await Promise.all(files.slice(0, 17).map(async file => ({ ...file, mtimeMs: (await stat(file.path)).mtimeMs })))
      const command: ExecutionCriteriaChange = { cardId: 'alice', planId: plan.id, expectedRevision: plan.revision, expectedGeneration: goal.generation, contractHash: plan.acceptanceHash, criteria: criteria.map((criterion, index) => index < 17 ? criterion : { ...criterion, predicate: { ...criterion.predicate as Extract<ExecutionCriterion['predicate'], { kind: 'file-bytes' }>, path: join(newDirectory, `dated-${index}.txt`) } }), stepChanges: files.slice(17).map((file, offset) => ({ stepId: file.id, changes: { path: join(newDirectory, `dated-${offset + 17}.txt`) } })), requestId: 'host-classify-unfinished-by-date' }
      // A failed combined revision rolls back criteria, generation and plan.
      await expect(work.changeCriteria({ ...command, requestId: 'cannot-change-observed', stepChanges: [{ stepId: files[0].id, changes: { path: join(newDirectory, 'wrong.txt') } }] })).rejects.toThrow('already observed')
      expect((await database.readLifeState({ executionPlanId: plan.id })).obligations.find(item => item.id === goal.id)?.generation).toBe(goal.generation)
      expect(await database.getLifeIngress('work-criteria-change:cannot-change-observed')).toBeNull()
      await expect(work.changeCriteria({ ...command, requestId: 'duplicate-step', stepChanges: [command.stepChanges![0], command.stepChanges![0]] })).rejects.toThrow('twice')
      await expect(work.changeCriteria({ ...command, requestId: 'absent-step', stepChanges: [{ stepId: 'not-in-plan', changes: { path: join(newDirectory, 'wrong.txt') } }] })).rejects.toThrow('absent')
      await expect(work.changeCriteria({ ...command, requestId: 'cannot-change-operation', stepChanges: [{ stepId: files[17].id, changes: { capabilityId: 'coding_agent.cli' } }] })).rejects.toThrow('existing unbound')
      expect(await work.changeCriteria(command)).toEqual({ state: 'criteria-revised' })
      expect(await work.changeCriteria(command)).toEqual({ state: 'criteria-revised' })
      const revised = await database.readLifeState({ executionPlanId: plan.id })
      expect(revised.obligations.find(item => item.id === goal.id)).toMatchObject({ threadId: accepted.rootThreadId, generation: goal.generation + 1, status: 'blocked', verification: null })
      expect(revised.execution!.results.filter(item => item.planRevision === plan.revision + 1 && item.state === 'verified')).toHaveLength(17)
      expect((await database.getLifeIngress(`work-criteria-change:${command.requestId}`))?.payload.changedSteps).toHaveLength(7)
      await work.dispose()
      await database.close()
      database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
      canContinue = true
      work = createRuntime()
      expect(await work.start({ cardId: 'alice', planId: plan.id, expectedRevision: plan.revision + 1, requestId: 'resume-current-after-restart' })).toEqual({ state: 'accepted' })
      await vi.waitFor(async () => {
        const current = await database.readLifeState({ executionPlanId: plan.id })
        expect(current.obligations.find(item => item.id === goal.id)).toMatchObject({ generation: goal.generation + 1, status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
        expect(work.isActive()).toBe(false)
      }, { timeout: 15000 })
      expect(writes).toHaveLength(24)
      expect(new Set(writes.map(item => item.path)).size).toBe(24)
      for (const file of originals) {
        expect(await readFile(file.path, 'utf8')).toBe(file.text)
        expect((await stat(file.path)).mtimeMs).toBe(file.mtimeMs)
      }
      for (const [offset, file] of files.slice(17).entries()) {
        await expect(access(file.path)).rejects.toThrow()
        expect(await readFile(join(newDirectory, `dated-${offset + 17}.txt`), 'utf8')).toBe(file.text)
      }
      expect(errors).toEqual([])
      if (round === 1) {
        const registry = createCanonicalToolRegistry()
        const repository = createProcedureCandidateRepository(database, 'alice', registry)
        const candidateId = await repository.capture(accepted.rootThreadId)
        const candidate = await repository.get(candidateId)
        expect(candidate.source.inputIds).toContain(`work-criteria-change:${command.requestId}`)
        const evaluation = await evaluateProcedureCandidate(candidateId, candidate, registry, new AbortController().signal)
        expect(evaluation.status).toBe('passed')
        await repository.recordEvaluation(evaluation)
        const skillsDirectory = join(root, 'skills')
        await mkdir(skillsDirectory)
        const loader = createAlicizationSkillLoader({ skillsDirectory, skillRegistry: createAlicizationSkillRegistry(), toolRegistry: registry, fileSystem: createProcedureSkillFileSystem(skillsDirectory, repository, registry), ...createSkillLifecyclePersistence(database, 'alice'), availableTools: registry.list().map(item => item.capabilityId), availablePermissions: ['workspace.read', 'workspace.write'], projection: { scope: 'card', executionChannel: 'skill', timeoutMs: 10000, supportsProgress: true, supportsCancellation: true, idempotency: 'required', providerToolName: skill => skill.id.replaceAll('.', '_'), adapterToolName: skill => skill.id } })
        await loader.markEvaluation(candidate.id, candidate.version, 'approved')
        await loader.activate(candidate.id, candidate.version)
        learned = createLearnedProcedureRuntime({ cardId: 'alice', database, registry, repository, loader, work: () => work, enabled: () => true })
        const nextDirectory = join(root, 'fresh-learned-work')
        await mkdir(nextDirectory)
        const arguments_ = Object.fromEntries(candidate.template.parameters.map(parameter => [parameter.name, parameter.kind === 'path' ? join(nextDirectory, `${parameter.name}.txt`) : `Fresh current value ${parameter.name}`]))
        await life.admit({ cardId: 'alice', turnId: 'fresh-method', conversationId: 'primary', messages: [{ role: 'user', content: 'Use this learned workflow on the new owned inputs.' }] }, new AbortController().signal)
        const next = await learned.use({ cardId: 'alice', turnId: 'fresh-method', id: candidate.id, version: candidate.version, goal: 'Fresh work from the revised method', arguments: arguments_ })
        await life.settle({ cardId: 'alice', turnId: 'fresh-method', status: 'completed' })
        await vi.waitFor(async () => expect((await database.readLifeState({ executionPlanId: next.planId })).obligations.find(item => item.threadId === next.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true } }), { timeout: 15000 })
        expect(writes).toHaveLength(48)
        const feedback = { cardId: 'alice', kind: 'life_ingress', id: `work-criteria-change:${command.requestId}`, version: '*' }
        await database.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-revised-authority', changes: [], mutations: [{ type: 'evidence-invalidate', source: feedback, mode: 'correction', reason: 'user-request' }] })
        expect((await repository.list())[0].sourceValid).toBe(false)
        expect(await loader.projectProduction()).toEqual([])
        const invalidated = await database.readLifeState({ executionPlanId: next.planId })
        expect(invalidated.obligations.find(item => item.id === goal.id)?.invalidatedBy).toEqual(feedback)
        expect(invalidated.obligations.find(item => item.threadId === next.rootThreadId)?.invalidatedBy).not.toBeNull()
      }
    }
    finally {
      await learned?.dispose()
      await work.dispose()
      await database.close()
      await rm(root, { recursive: true, force: true })
    }
  }, 45000)
}
