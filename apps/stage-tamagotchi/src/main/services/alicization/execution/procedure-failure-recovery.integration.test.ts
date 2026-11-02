import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
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
import { createProcedureSkillFileSystem } from './procedure-skill-files'
import { createExecutionResourceBroker } from './resource-broker'
import { createSkillLifecyclePersistence } from './skill-lifecycle-repository'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const digest = (text: string) => createHash('sha256').update(text).digest('hex')

for (const [round, incorrect] of ['actual different bytes', '', '不同结果 中文🙂\n'].entries()) {
  it(`downgrades actual failed method output, retains repair evidence across restart and requires a new verified version (${round})`, async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'alicization-method-failure-')))
    let database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
    const skillsDirectory = join(root, 'skills')
    await mkdir(skillsDirectory)
    const errors: unknown[] = []
    const writes: string[] = []
    let corruptPath: string | null = null
    let canContinue = true
    const registry = createCanonicalToolRegistry()
    function runtime() {
      const broker = createExecutionResourceBroker()
      return createWorkPlanExecutionRuntime({ getDatabase: () => database, enabled: () => true, canContinue: () => canContinue, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: { 'tool.filesystem_read_file': async (input, signal) => callLocalFilesystem({ toolName: 'read_file', arguments: input, workspace: root, signal }), 'tool.filesystem_write_file': async (input, signal) => {
        writes.push(String(input.path))
        const result = await callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal })
        // An owned external change after the governed write challenges the
        // independent verifier without changing approved adapter parameters.
        if (input.path === corruptPath)
          await writeFile(String(input.path), incorrect)
        return result
      } } })
    }
    let work = runtime()
    function services() {
      const repository = createProcedureCandidateRepository(database, 'alice', registry)
      const loader = createAlicizationSkillLoader({ skillsDirectory, skillRegistry: createAlicizationSkillRegistry(), toolRegistry: registry, fileSystem: createProcedureSkillFileSystem(skillsDirectory, repository, registry), ...createSkillLifecyclePersistence(database, 'alice'), availableTools: registry.list().map(item => item.capabilityId), availablePermissions: ['workspace.read', 'workspace.write'], projection: { scope: 'card', executionChannel: 'skill', timeoutMs: 10000, supportsProgress: true, supportsCancellation: true, idempotency: 'required', providerToolName: skill => skill.id.replaceAll('.', '_'), adapterToolName: skill => skill.id } })
      const learned = createLearnedProcedureRuntime({ cardId: 'alice', database, registry, repository, loader, work: () => work, enabled: () => true })
      return { repository, loader, learned }
    }
    let methods = services()
    const life = createLifeTurnRuntime({ read: () => database.readLifeState(), commit: input => database.commitLifeState(input), getIngress: id => database.getLifeIngress(id), getEffect: id => database.getLifeEffect(id), now: Date.now })
    const admit = async (turnId: string) => life.admit({ cardId: 'alice', turnId, conversationId: 'owned-methods', messages: [{ role: 'user', content: 'Execute the current owned file request, then independently check it.' }] }, new AbortController().signal)
    const settled = async () => vi.waitFor(() => expect(work.isActive()).toBe(false), { timeout: 15000 })
    async function source(turnId: string, text: string) {
      const path = join(root, `${turnId}.txt`)
      await admit(turnId)
      const result = await work.propose({ cardId: 'alice', turnId, goal: `Owned source ${turnId}`, criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: digest(text) } }], steps: [{ id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path, content: text }, dependsOn: [], acceptanceCriterionIds: ['bytes'] }, { id: 'read', capabilityId: 'tool.filesystem_read_file', input: { path }, dependsOn: ['save'], acceptanceCriterionIds: ['bytes'] }] })
      await life.settle({ cardId: 'alice', turnId, status: 'completed' })
      await settled()
      expect((await database.readLifeState({ executionPlanId: result.planId })).obligations.find(item => item.threadId === result.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true } })
      const candidateId = await methods.learned.capture(result.rootThreadId)
      const candidate = await methods.repository.get(candidateId)
      expect(await methods.learned.evaluate(candidateId)).toBe('passed')
      await methods.loader.activate(candidate.id, candidate.version)
      expect(await methods.loader.projectProduction()).toHaveLength(1)
      return { ...result, candidateId, candidate, path }
    }
    try {
      const original = await source('source', 'Original private successful source')
      const originalMtime = (await stat(original.path)).mtimeMs
      const input = (candidate: typeof original.candidate, path: string, text: string) => Object.fromEntries(candidate.template.parameters.map(parameter => [parameter.name, parameter.kind === 'path' ? path : text]))
      // Pausing an admitted use is not a failed strategy.
      canContinue = false
      await admit('paused-use')
      const paused = await methods.learned.use({ cardId: 'alice', turnId: 'paused-use', id: original.candidate.id, version: original.candidate.version, goal: 'Paused current work', arguments: input(original.candidate, join(root, 'paused.txt'), 'Paused current bytes') })
      await life.settle({ cardId: 'alice', turnId: 'paused-use', status: 'completed' })
      await settled()
      expect((await methods.learned.list())[0]).toMatchObject({ sourceValid: true, repair: null })
      await work.stop({ cardId: 'alice', planId: paused.planId, expectedRevision: 1, requestId: 'cancel-paused-current-use', action: 'cancel' })
      canContinue = true
      corruptPath = join(root, 'incorrect-new-result.txt')
      await admit('failed-use')
      const failed = await methods.learned.use({ cardId: 'alice', turnId: 'failed-use', id: original.candidate.id, version: original.candidate.version, goal: 'New output must match the requested bytes', arguments: input(original.candidate, corruptPath, 'Fresh required bytes') })
      await life.settle({ cardId: 'alice', turnId: 'failed-use', status: 'completed' })
      await settled()
      expect(await readFile(corruptPath, 'utf8')).toBe(incorrect)
      const item = (await methods.learned.list())[0]
      expect(item).toMatchObject({ sourceValid: false, repair: { reason: 'acceptance-not-satisfied', sourceThreadId: failed.rootThreadId, sourcePlanId: failed.planId } })
      expect(await methods.loader.projectProduction()).toEqual([])
      const evidence = await database.getLifeIngress(`procedure-failure:${original.candidate.version}`)
      expect(evidence).toMatchObject({ source: 'execution-procedure-failure', status: 'settled', payload: { repairCandidate: { requirement: 'fresh-independently-verified-source-and-dedicated-replay' } } })
      const failedGoal = (await database.readLifeState({ executionPlanId: failed.planId })).obligations.find(item => item.threadId === failed.rootThreadId)!
      expect(failedGoal.status).not.toBe('fulfilled')
      await expect(methods.learned.use({ cardId: 'alice', turnId: 'failed-use', id: original.candidate.id, version: original.candidate.version, goal: 'Do not replay the old failed method', arguments: input(original.candidate, corruptPath, 'Fresh required bytes') })).rejects.toThrow('independent replay proof')
      expect(writes.filter(path => path === corruptPath)).toHaveLength(1)
      expect(await readFile(original.path, 'utf8')).toBe('Original private successful source')
      expect((await stat(original.path)).mtimeMs).toBe(originalMtime)
      await methods.learned.dispose()
      await work.dispose()
      await database.close()
      database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
      work = runtime()
      methods = services()
      expect((await methods.learned.list())[0]).toMatchObject({ sourceValid: false, repair: item.repair })
      expect(await methods.loader.projectProduction()).toEqual([])
      corruptPath = null
      const corrected = await source('corrected-source', 'A corrected independent success')
      expect(corrected.candidate.id).toBe(original.candidate.id)
      expect(corrected.candidate.version).not.toBe(original.candidate.version)
      const comparisonItem = (await methods.repository.list()).find(item => item.candidateId === corrected.candidateId)!
      expect(comparisonItem.evaluation?.comparison).toMatchObject({ baselineCandidateId: original.candidateId, baselineHash: original.candidate.version, verdict: 'non-regressing' })
      expect(comparisonItem.evaluation!.comparison!.baseline.map(sample => sample.inputHash)).toEqual(comparisonItem.evaluation!.comparison!.candidate.map(sample => sample.inputHash))
      expect(comparisonItem.evaluation!.comparison!.candidate).toHaveLength(2)
      expect(comparisonItem.evaluation!.comparison!.candidate.every(sample => sample.fulfilled && sample.operations === 2 && sample.rework === 0 && sample.approvals === 0)).toBe(true)
      const { comparison, ...withoutComparison } = comparisonItem.evaluation!
      await expect(methods.repository.recordEvaluation(withoutComparison)).rejects.toThrow('latest established version')
      await expect(methods.repository.recordEvaluation({ ...comparisonItem.evaluation!, comparison: { ...comparison!, baselineHash: '0'.repeat(64) } })).rejects.toThrow('paired replay evidence')
      const reloaded = createProcedureCandidateRepository(database, 'alice', registry)
      expect((await reloaded.list()).find(item => item.candidateId === corrected.candidateId)?.evaluation?.comparison).toEqual(comparison)
      await admit('corrected-use')
      const target = join(root, 'fresh-corrected-result.txt')
      const final = await methods.learned.use({ cardId: 'alice', turnId: 'corrected-use', id: corrected.candidate.id, version: corrected.candidate.version, goal: 'Use the newly evaluated method', arguments: input(corrected.candidate, target, 'Fresh independently checked result 中文🙂') })
      await life.settle({ cardId: 'alice', turnId: 'corrected-use', status: 'completed' })
      await settled()
      expect((await database.readLifeState({ executionPlanId: final.planId })).obligations.find(item => item.threadId === final.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true } })
      expect(await readFile(target, 'utf8')).toBe('Fresh independently checked result 中文🙂')
      expect((await methods.learned.list()).find(item => item.version === corrected.candidate.version)).toMatchObject({ sourceValid: true, repair: null, status: 'active' })
      await admit('redundant-source')
      const redundantPath = join(root, 'redundant-source.txt')
      const redundantText = 'Synthetic counterexample: the same file read twice'
      const redundant = await work.propose({ cardId: 'alice', turnId: 'redundant-source', goal: 'Observe an independently completed but less efficient method', criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: redundantPath, sha256: digest(redundantText) } }], steps: [
        { id: 'first', capabilityId: 'tool.filesystem_write_file', input: { path: redundantPath, content: redundantText }, dependsOn: [], acceptanceCriterionIds: ['bytes'] },
        { id: 'read', capabilityId: 'tool.filesystem_read_file', input: { path: redundantPath }, dependsOn: ['first'], acceptanceCriterionIds: ['bytes'] },
        { id: 'again', capabilityId: 'tool.filesystem_read_file', input: { path: redundantPath }, dependsOn: ['read'], acceptanceCriterionIds: ['bytes'] },
      ] })
      await life.settle({ cardId: 'alice', turnId: 'redundant-source', status: 'completed' })
      await settled()
      expect((await database.readLifeState({ executionPlanId: redundant.planId })).obligations.find(item => item.threadId === redundant.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true } })
      const redundantId = await methods.learned.capture(redundant.rootThreadId)
      expect(await methods.learned.evaluate(redundantId)).toBe('failed')
      const inferior = (await methods.repository.list()).find(item => item.candidateId === redundantId)!
      expect(inferior.evaluation).toMatchObject({ status: 'failed', comparison: { verdict: 'regressed', baselineCandidateId: corrected.candidateId } })
      expect(inferior.evaluation!.comparison!.baseline.every(sample => sample.operations === 2)).toBe(true)
      expect(inferior.evaluation!.comparison!.candidate.every(sample => sample.operations === 3 && sample.fulfilled)).toBe(true)
      await expect(methods.loader.activate(inferior.candidate.id, inferior.candidate.version)).rejects.toThrow()
      expect(await methods.loader.projectProduction()).toHaveLength(1)
      expect(errors).toEqual([])
    }
    finally {
      await methods.learned.dispose()
      await work.dispose()
      await database.close()
      await rm(root, { recursive: true, force: true })
    }
  }, 45000)
}
