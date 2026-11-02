import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createAlicizationSkillLoader } from '../turn-os/skill-loader'
import { createAlicizationSkillRegistry } from '../turn-os/skill-registry'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createHostEffectControl } from './host-effect-control'
import { createLearnedProcedureRuntime } from './learned-procedure-runtime'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { createProcedureSkillFileSystem, procedureSkillSource } from './procedure-skill-files'
import { instantiateProcedureTemplate } from './procedure-template'
import { createExecutionResourceBroker } from './resource-broker'
import { createSkillLifecyclePersistence } from './skill-lifecycle-repository'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

describe('learned procedures through actual life ownership, replay and registry', () => {
  it('keeps private examples out of skills, persists replay approval, and invalidates a withdrawn source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-learned-skill-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const registry = createCanonicalToolRegistry()
    const broker = createExecutionResourceBroker()
    const errors: unknown[] = []
    let canContinue = true
    let heldPath: string | null = null
    let enteredHeldWrite: (() => void) | undefined
    let releaseHeldWrite: (() => void) | undefined
    const write = async (input: Record<string, unknown>, signal: AbortSignal) => {
      if (input.path === heldPath) {
        enteredHeldWrite?.()
        await new Promise<void>((resolve, reject) => {
          releaseHeldWrite = resolve
          if (signal.aborted)
            reject(signal.reason)
          else
            signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      }
      return callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal })
    }
    let work = createWorkPlanExecutionRuntime({ getDatabase: () => db, canContinue: () => canContinue, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: { 'tool.filesystem_write_file': write } })
    const life = createLifeTurnRuntime({ read: () => db.readLifeState(), commit: input => db.commitLifeState(input), getIngress: id => db.getLifeIngress(id), getEffect: id => db.getLifeEffect(id), now: Date.now })
    const skillsDirectory = join(root, 'skills')
    await mkdir(skillsDirectory)
    function services() {
      const repository = createProcedureCandidateRepository(db, 'alice', registry)
      const loader = createAlicizationSkillLoader({ skillsDirectory, toolRegistry: registry, skillRegistry: createAlicizationSkillRegistry(), fileSystem: createProcedureSkillFileSystem(skillsDirectory, repository, registry), ...createSkillLifecyclePersistence(db, 'alice'), availableTools: registry.list().map(item => item.capabilityId), availablePermissions: ['workspace.read', 'workspace.write'], projection: { scope: 'card', executionChannel: 'skill', timeoutMs: 10000, supportsProgress: true, supportsCancellation: true, idempotency: 'none', providerToolName: item => item.id.replaceAll('.', '_'), adapterToolName: item => item.id } })
      return { repository, loader }
    }
    try {
      const content = '私人客户资料，只能留在源任务中🙂'
      const path = join(root, '私人客户清单.txt')
      const goal = 'Write the private example'
      await life.admit({ cardId: 'alice', turnId: 'original', conversationId: 'source', messages: [{ role: 'user', content: goal }] }, new AbortController().signal)
      const accepted = await work.propose({ cardId: 'alice', turnId: 'original', goal, criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: createHash('sha256').update(content).digest('hex') } }], steps: [{ id: 'save', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content }, acceptanceCriterionIds: ['bytes'] }] })
      const deadline = Date.now() + 7000
      while (Date.now() < deadline && !(await db.readLifeState()).obligations.some(item => item.threadId === accepted.rootThreadId && item.status === 'fulfilled')) {
        if (errors.length)
          throw errors[0]
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      await life.settle({ cardId: 'alice', turnId: 'original', status: 'failed' })
      expect((await db.getLifeIngress('user:original'))?.status).toBe('failed')
      const original = await stat(path)
      const { repository, loader } = services()
      const candidateId = await repository.capture(accepted.rootThreadId)
      expect(await repository.capture(accepted.rootThreadId)).toBe(candidateId)
      const candidate = await repository.get(candidateId)
      const source = procedureSkillSource(candidate, registry)
      expect(source).not.toContain(content)
      expect(source).not.toContain(path)
      expect(source).not.toContain(accepted.rootThreadId)
      expect(await loader.projectProduction()).toEqual([])
      await expect(loader.activate(candidate.id, candidate.version)).rejects.toThrow()
      const evaluation = await evaluateProcedureCandidate(candidateId, candidate, registry, new AbortController().signal)
      expect(evaluation.status).toBe('passed')
      expect(evaluation.cases.map(item => item.name)).toEqual(['different-input-1', 'different-input-2', 'invalid-arguments', 'interface-change', 'cancellation'])
      await repository.recordEvaluation(evaluation)
      await loader.markEvaluation(candidate.id, candidate.version, 'approved')
      await loader.activate(candidate.id, candidate.version)
      expect(await loader.projectProduction()).toMatchObject([{ capabilityId: candidate.id }])
      expect(await readFile(path, 'utf8')).toBe(content)
      expect((await stat(path)).mtimeMs).toBe(original.mtimeMs)
      for (let batch = 0; batch < 4; batch++) {
        await db.commitLifeState({ cardId: 'alice', operationKey: `churn-${batch}`, changes: [], mutations: Array.from({ length: 30 }, (_, index) => [
          { type: 'ingress-accept' as const, ingress: { id: `churn-${batch}-${index}`, kind: 'system' as const, source: 'unrelated-events', sourceKey: `${batch}-${index}`, occurredAt: Date.now(), payload: {} } },
          { type: 'ingress-settle' as const, id: `churn-${batch}-${index}`, status: 'settled' as const },
        ]).flat() })
      }
      await work.dispose()
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const restored = services()
      expect(await restored.repository.list()).toMatchObject([{ candidateId, sourceValid: true, evaluation: { status: 'passed' } }])
      expect(await restored.loader.projectProduction()).toMatchObject([{ capabilityId: candidate.id }])
      work = createWorkPlanExecutionRuntime({ getDatabase: () => db, canContinue: () => canContinue, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: { 'tool.filesystem_write_file': write } })
      const learned = createLearnedProcedureRuntime({ cardId: 'alice', database: db, registry, repository: restored.repository, loader: restored.loader, work: () => work, enabled: () => true })
      const nextPath = join(root, 'fresh-request.txt')
      const exactGoal = 'Save a new file 06f37a0c-eec9-4314-9fd5-cf46c9f9903c'
      const question = `Use ${candidate.id}@${candidate.version}; write_file 的 path=${nextPath}、content=${JSON.stringify('完全不同的新内容')}。调用 life_use_learned_procedure，goal 必须为 ${exactGoal}。`
      canContinue = false
      await life.admit({ cardId: 'alice', turnId: 'fresh', conversationId: 'fresh', messages: [{ role: 'user', content: question }] }, new AbortController().signal)
      await expect(learned.use({ cardId: 'alice', turnId: 'fresh', id: candidate.id, version: candidate.version, goal: 'Save a new file', arguments: { input1: nextPath, input2: '完全不同的内容' } })).rejects.toThrow('literal content must be prepared')
      const projected = await learned.prepareInput({ cardId: 'alice', turnId: 'fresh', input: { id: candidate.id, version: candidate.version, goal: 'Save a new file', arguments: [{ name: 'input1', value: nextPath }, { name: 'input2', value: '完全不同的内容' }] }, signal: new AbortController().signal })
      expect(projected.projection).toMatchObject({ fields: ['arguments.input2', 'goal'], actionAdmitted: false })
      expect(projected.input.goal).toBe(exactGoal)
      const parameters = projected.input as { id: string, version: string, goal: string, arguments: Array<{ name: string, value: string }> }
      const invocation = await life.beforeAction({ cardId: 'alice', turnId: 'fresh', actionId: 'use-current-method', capabilityId: 'tool.life_use_learned_procedure', parameters }, new AbortController().signal)
      const next = await learned.use({ cardId: 'alice', turnId: 'fresh', ...parameters, arguments: Object.fromEntries(parameters.arguments.map(item => [item.name, item.value])) })
      await life.afterAction({ cardId: 'alice', id: invocation.id, outcome: 'success', output: next, interrupted: false })
      const invocationDeadline = Date.now() + 7000
      while (work.isActive() && Date.now() < invocationDeadline)
        await new Promise(resolve => setTimeout(resolve, 20))
      let quote = '已找到并调用指定方法，使用你给定的一个文件路径和内容。'
      let foreignBinding = false
      const grounding = createLifeReplyGroundingRuntime({ read: db.readLifeState, getEffect: db.getLifeEffect, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: Date.now, generate: async ({ user }) => {
        const offered = JSON.parse(user).acceptedProcedureInvocations[0]
        expect(offered.scope).toBe('accepted-method-invocation-only-no-step-or-goal-completion')
        expect(offered.fileOperations).toEqual({ fileCount: 1, operations: ['写入'] })
        return JSON.stringify({ claims: [{ kind: 'execution-step-outcome', quote, binding: foreignBinding ? { kind: 'effect', id: 'unrelated-effect', version: '0' } : offered.binding, meaningMatchesBinding: false }] })
      } })
      const review = async () => grounding({ cardId: 'alice', turnId: 'fresh', text: quote, owners: (await db.readLifeState()).owners, signal: new AbortController().signal })
      const admittedInvocation = await review()
      expect(admittedInvocation.accepted).toBe(true)
      expect(JSON.stringify((await db.getLifeIngress(admittedInvocation.reviewId!))?.payload.locallyGroundedInvocations)).toContain('accepted-method-invocation-only')
      foreignBinding = true
      expect((await review()).accepted).toBe(false)
      foreignBinding = false
      for (const acknowledged of ['已按指定方法和参数提交，系统已受理；目前还没有步骤执行或验收结果，所以我还不能确认写入和读取是否完成。', '我先查到了指定的已启用方法，并按参数调用了它，系统已受理。', '已找到并调用指定方法；现在还没有步骤执行或验收结果。', '方法已受理；', '我找到并调用了指定版本的已启用方法。', '已按对应字段提交一个测试文件的写入操作。']) {
        quote = acknowledged
        expect((await review()).accepted, acknowledged).toBe(true)
      }
      for (const extra of ['已找到并调用指定方法，文件已经保存了。', '已找到并调用指定方法，使用你给定的两个文件路径和内容。', '已找到并调用指定方法，我会上传文件。', '已按对应字段提交两个测试文件的写入和读取操作。', '已按对应字段完成一个测试文件的写入操作。']) {
        quote = extra
        expect((await review()).accepted, extra).toBe(false)
      }
      quote = '已找到并调用指定方法，我会上传文件。'
      const rejectedMethodReply = await review()
      expect(rejectedMethodReply.accepted).toBe(false)
      expect(rejectedMethodReply.repairMode).toBe('current-admission')
      const methodRepair = JSON.parse(rejectedMethodReply.repairContext!).data
      expect(methodRepair.receiptWording).toBe('方法调用已受理。')
      expect(methodRepair.admission.scope).toBe('accepted-method-invocation-only-no-step-or-goal-completion')
      quote = methodRepair.receiptWording
      expect((await review()).accepted).toBe(true)
      canContinue = true
      await work.start({ cardId: 'alice', planId: next.planId, expectedRevision: 1, requestId: 'finish-after-admission-review' })
      await vi.waitFor(async () => expect((await db.readLifeState()).obligations.find(item => item.threadId === next.rootThreadId)?.status).toBe('fulfilled'))
      quote = '已找到并调用指定方法；现在还没有步骤执行或验收结果。'
      expect((await review()).accepted).toBe(false)
      await life.settle({ cardId: 'alice', turnId: 'fresh', status: 'completed' })
      const nextDeadline = Date.now() + 7000
      while (Date.now() < nextDeadline && !(await db.readLifeState()).obligations.some(item => item.threadId === next.rootThreadId && item.status === 'fulfilled')) {
        if (errors.length)
          throw errors[0]
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      expect(await readFile(nextPath, 'utf8')).toBe('完全不同的新内容')
      heldPath = join(root, 'paused-active-skill-must-not-write.txt')
      const entered = new Promise<void>((resolve) => { enteredHeldWrite = resolve })
      await life.admit({ cardId: 'alice', turnId: 'in-flight', conversationId: 'fresh', messages: [{ role: 'user', content: 'Pause this learned file operation before its write' }] }, new AbortController().signal)
      const inFlight = await learned.use({ cardId: 'alice', turnId: 'in-flight', id: candidate.id, version: candidate.version, goal: 'Pause the active skill', arguments: { input1: heldPath, input2: 'must not be written after pause' } })
      await life.settle({ cardId: 'alice', turnId: 'in-flight', status: 'completed' })
      await entered
      expect(work.isWriting()).toBe(true)
      // The actual host control holds the foreground user-command scope,
      // which yields background scheduling while pause/recovery is reviewed.
      canContinue = false
      const stopResult = await work.stop({ cardId: 'alice', planId: inFlight.planId, expectedRevision: 1, action: 'pause', requestId: 'pause-active-skill' })
      // A stop request is separate from actual writer closure. The adapter's
      // abort acknowledgement must finish before the fixture is inspected.
      expect(stopResult.state).toMatch(/^stopp(?:ed|ing)$/u)
      await vi.waitFor(() => expect(work.isWriting()).toBe(false))
      // Recovery confirmation binds the settled responsibility as well as the
      // writer. Let the stopped owner's journal/reconciliation finish first.
      await vi.waitFor(() => expect(work.isActive()).toBe(false))
      await work.wakeReady()
      await expect(stat(heldPath)).rejects.toThrow()
      const afterPause = await db.readLifeState({ executionPlanId: inFlight.planId })
      expect(afterPause.obligations.find(item => item.threadId === inFlight.rootThreadId)?.status).not.toBe('fulfilled')
      expect(afterPause.execution?.results.some(item => item.planId === inFlight.planId && item.state === 'verified')).toBe(false)
      expect(await readFile(nextPath, 'utf8')).toBe('完全不同的新内容')
      const pausedEffect = (await db.readPendingLifeExecutionEffects()).find(effect => (effect.payload.parameters as { path?: string } | undefined)?.path === heldPath)!
      expect(pausedEffect.status).toBe('uncertain')
      const recover = createHostEffectControl({ database: () => db, broker, writerStopped: () => !work.isWriting() })
      const preview = await recover({ cardId: 'alice', effectId: pausedEffect.id, action: 'preview' }, 17)
      if (preview.state !== 'preview')
        throw new Error('The stopped skill effect did not expose its host recovery control')
      expect(await recover({ cardId: 'alice', effectId: pausedEffect.id, action: 'takeover', token: preview.token, confirmedStopped: true }, 17)).toEqual({ state: 'host-taken-over' })
      heldPath = null
      const noReplayPath = join(root, 'withdrawn-must-not-write.txt')
      canContinue = false
      await life.admit({ cardId: 'alice', turnId: 'pending', conversationId: 'fresh', messages: [{ role: 'user', content: 'Start another file' }] }, new AbortController().signal)
      const pending = await learned.use({ cardId: 'alice', turnId: 'pending', id: candidate.id, version: candidate.version, goal: 'Start another file', arguments: { input1: noReplayPath, input2: 'must never appear' } })
      await life.settle({ cardId: 'alice', turnId: 'pending', status: 'completed' })
      await work.suspend()
      await vi.waitFor(() => expect(work.isActive()).toBe(false))
      canContinue = true
      heldPath = join(root, 'withdrawn-active-skill-must-not-write.txt')
      const enteredRevokedWrite = new Promise<void>((resolve) => { enteredHeldWrite = resolve })
      await life.admit({ cardId: 'alice', turnId: 'withdraw-in-flight', conversationId: 'fresh', messages: [{ role: 'user', content: 'Withdraw this method before native file dispatch' }] }, new AbortController().signal)
      const revoked = await learned.use({ cardId: 'alice', turnId: 'withdraw-in-flight', id: candidate.id, version: candidate.version, goal: 'Do not dispatch a withdrawn method', arguments: { input1: heldPath, input2: 'must not escape source withdrawal' } })
      await life.settle({ cardId: 'alice', turnId: 'withdraw-in-flight', status: 'completed' })
      await enteredRevokedWrite
      await db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-original', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'goals', id: candidate.source.goalId, version: String(candidate.source.generation) }, mode: 'correction', reason: 'host-withdrew-source' }] })
      releaseHeldWrite!()
      await vi.waitFor(() => expect(work.isWriting()).toBe(false))
      await expect(stat(heldPath)).rejects.toThrow()
      const revokedState = await db.readLifeState({ executionPlanId: revoked.planId })
      expect(revokedState.obligations.find(item => item.threadId === revoked.rootThreadId)).toMatchObject({ status: 'blocked', invalidatedBy: { kind: 'goals', id: candidate.source.goalId } })
      expect(revokedState.execution?.results.some(item => item.planId === revoked.planId && item.state === 'verified')).toBe(false)
      const pendingGoal = (await db.readLifeState()).obligations.find(item => item.threadId === pending.rootThreadId)!
      expect(pendingGoal).toMatchObject({ status: 'blocked', invalidatedBy: { kind: 'goals', id: candidate.source.goalId } })
      canContinue = true
      await expect(work.start({ cardId: 'alice', planId: pending.planId, expectedRevision: 1, requestId: 'retry-withdrawn' })).rejects.toThrow('current accepted responsibility')
      await expect(stat(noReplayPath)).rejects.toThrow()
      await life.admit({ cardId: 'alice', turnId: 'atomic-race', conversationId: 'fresh', messages: [{ role: 'user', content: 'Do not leave an executable orphan' }] }, new AbortController().signal)
      const race = instantiateProcedureTemplate(candidate.template, { input1: join(root, 'race.txt'), input2: 'never' }, registry, 'Do not leave an executable orphan')
      await expect(work.propose({ ...race, cardId: 'alice', turnId: 'atomic-race', procedureSource: { candidateId, version: candidate.version } })).rejects.toThrow(/withdraw/u)
      const rejectedGoal = (await db.readLifeState()).obligations.find(item => item.summary === race.goal)!
      expect(rejectedGoal.status).toBe('cancelled')
      expect((await db.readLifeState()).execution?.plans.some(plan => plan.rootObligationId === rejectedGoal.id)).toBe(false)
      expect(await restored.repository.list()).toMatchObject([{ sourceValid: false }])
      expect(await restored.loader.projectProduction()).toEqual([])
      expect(await restored.loader.discover({ productionOnly: false })).toMatchObject([{ evaluationStatus: 'failed' }])
      await expect(restored.repository.recordEvaluation(evaluation)).rejects.toThrow('source changed')
    }
    finally { await work.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
  }, 30_000)
})
