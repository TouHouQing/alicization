import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import process from 'node:process'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createAlicizationExecutorRuntime } from '../executor-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createTaskThreadOrchestrator } from '../task-thread-orchestrator'
import { createAlicizationSkillLoader } from '../turn-os/skill-loader'
import { createAlicizationSkillRegistry } from '../turn-os/skill-registry'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { executionDigest } from './acceptance-compiler'
import { createLearnedProcedureRuntime } from './learned-procedure-runtime'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { createProcedureDelegatedReplay } from './procedure-delegated-replay'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { createProcedureSkillFileSystem, procedureSkillSource } from './procedure-skill-files'
import { createExecutionResourceBroker } from './resource-broker'
import { createSkillLifecyclePersistence } from './skill-lifecycle-repository'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { createWorkStepDelegation } from './work-step-delegation'

const digest = (text: string) => createHash('sha256').update(text).digest('hex')
const context = (cardId: string, turnId: string): AlicizationExecutionRuntimeContext => ({ generatedAt: Date.now(), cardId, turnId, sensory: { collectedAt: null, running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } })

async function fixture(capability: 'coding_agent.cli' | 'coding_agent.codex' = 'coding_agent.cli', extraArtifacts = 0, omitCliArgs = false, options: { missingSourceOutput?: boolean, onOwnedRoot?: (root: string) => void } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'alicization-delegated-method-')))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-delegated-method-test-v1', capability, createdAt: new Date().toISOString(), preserveOnFailure: true }), { flag: 'wx' })
  options.onOwnedRoot?.(root)
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const registry = createCanonicalToolRegistry()
  const broker = createExecutionResourceBroker()
  const interrupts = createExecutionInterruptRegistry(broker)
  const orchestrator = createTaskThreadOrchestrator()
  const errors: unknown[] = []
  let expected: Record<string, unknown> = {}
  await database.upsertChannelCapabilityManifest({ channel: capability === 'coding_agent.cli' ? 'cli' : 'codex', available: true, enabled: true, ready: true, sessionAffinity: true, lastCheckedAt: Date.now() })
  const executor = createAlicizationExecutorRuntime({ getAlicizationDb: () => database, appendAuditLog: async (input) => { await database.appendAuditLog(input) }, dispatchTaskThread: invocation => interrupts.run({ cardId: 'alice', threadId: invocation.input.threadId, signal: invocation.input.abortSignal }, signal => orchestrator.dispatch({ ...invocation, input: { ...invocation.input, abortSignal: signal } })), ensureSessionId: async () => 'owned-source-method', getCardKillSwitchState: () => 'ACTIVE', getGlobalKillSwitchState: () => 'ACTIVE', normalizeSessionId: raw => String(raw ?? ''), sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback })
  const delegate = createWorkStepDelegation({ database: () => database, enabled: () => true, authorize: async (request) => {
    expect(request.targetId).toBe(workspace)
    expect(request.effectDigest).toBe(executionDigest(expected))
    expect(JSON.parse(request.previewText!)).toEqual(expected)
    return { allow: true, reason: 'Exact owned source command', approvalRef: 'owned-source-command' }
  }, runtimeContext: async ({ cardId, turnId }) => context(cardId, turnId), execute: input => executor.executeMainGatewayTaskThread(input) })
  const work = createWorkPlanExecutionRuntime({ getDatabase: () => database, enabled: () => true, broker, interrupts, onError: error => errors.push(error), tools: { [capability]: (input: Record<string, unknown>, signal: AbortSignal) => delegate(capability, input, signal) } })
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
  const nativeInput = (path: string, text: string): Record<string, unknown> => options.missingSourceOutput
    ? { command: 'node', args: ['-e', 'process.exit(0)'], cwd: workspace, effect: 'mutate' }
    : omitCliArgs
      ? { command: `powershell -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(`[IO.File]::WriteAllBytes('${path.replaceAll('\'', '\'\'')}',[Convert]::FromBase64String('${Buffer.from(text).toString('base64')}'))`, 'utf16le').toString('base64')}`, cwd: workspace, effect: 'mutate' }
      : capability === 'coding_agent.cli'
        ? { command: 'node', args: ['-e', `const fs=require('node:fs'),p=require('node:path'),b=Buffer.from(${JSON.stringify(Buffer.from(text).toString('base64'))},'base64');fs.writeFileSync(${JSON.stringify(path)},b);for(let i=0;i<${extraArtifacts};i++)fs.writeFileSync(p.join(${JSON.stringify(workspace)},'extra-'+i+'.txt'),b)`], cwd: workspace, effect: 'mutate' }
        : { prompt: `这是独立测试工作区。只用终端执行以下 PowerShell 语句，然后只回复完成，不修改其他文件：[IO.File]::WriteAllBytes('${path.replaceAll('\'', '\'\'')}',[Convert]::FromBase64String('${Buffer.from(text).toString('base64')}'))`, cwd: workspace, effect: 'mutate' }
  const admit = async (turnId: string, goal: string) => life.admit({ cardId: 'alice', turnId, conversationId: 'owned-method-requests', messages: [{ role: 'user', content: goal }] }, new AbortController().signal)
  const completed = async (threadId: string) => {
    // Include real cold helper/native process setup within this test waiter.
    // Production command deadlines and every byte/receipt assertion stay intact.
    const by = Date.now() + (capability === 'coding_agent.cli' ? 30000 : 125000)
    while (Date.now() < by) {
      if (errors.length)
        throw errors[0]
      const goal = (await database.readLifeState()).obligations.find(item => item.threadId === threadId)
      if (goal?.status === 'fulfilled' && !work.isActive())
        return goal
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    const view = await database.readLifeState()
    throw new Error(`Owned delegated responsibility did not finish: ${JSON.stringify({ goal: view.obligations.find(item => item.threadId === threadId), results: view.execution?.results, effects: view.effects.map(item => ({ id: item.id, status: item.status, receipt: item.receipt })) })}`)
  }
  const sourcePath = join(workspace, 'private-source.txt')
  const privateText = 'Private source bytes, never defaults in a skill 中文🙂'
  async function close(preserve = false) {
    const failures: unknown[] = []
    // Drain every owner even if an earlier stop fails. Keep its files when
    // shutdown cannot be proved, rather than deleting a live SQLite journal.
    for (const dispose of [() => work.dispose(), () => orchestrator.dispose(), () => database.close()]) {
      try {
        await dispose()
      }
      catch (error) {
        failures.push(error)
      }
    }
    if (failures.length)
      throw new AggregateError(failures, 'Owned delegated fixture did not fully close')
    if (!preserve)
      await rm(root, { recursive: true, force: true })
  }
  try {
    expected = nativeInput(sourcePath, privateText)
    await admit('source', 'Create the private owned source file')
    const paths = [sourcePath, ...Array.from({ length: extraArtifacts }, (_, index) => join(workspace, `extra-${index}.txt`))]
    const accepted = await work.propose({ cardId: 'alice', turnId: 'source', goal: 'Create the private owned source file', criteria: paths.map((path, index) => ({ id: `bytes-${index}`, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: digest(privateText) } })), steps: [{ id: 'program', capabilityId: capability, input: expected, dependsOn: [], acceptanceCriterionIds: paths.map((_, index) => `bytes-${index}`) }] })
    await life.settle({ cardId: 'alice', turnId: 'source', status: 'completed' })
    await completed(accepted.rootThreadId)
    expect(await readFile(sourcePath, 'utf8')).toBe(privateText)
    const repository = createProcedureCandidateRepository(database, 'alice', registry)
    const candidateId = await repository.capture(accepted.rootThreadId)
    const candidate = await repository.get(candidateId)
    return { root, workspace, database, registry, repository, candidateId, candidate, sourcePath, privateText, work, admit, settle: (turnId: string) => life.settle({ cardId: 'alice', turnId, status: 'completed' }), completed, nativeInput, setExpected: (value: Record<string, unknown>) => { expected = value }, errors, close }
  }
  catch (error) {
    try {
      // A real provider timeout may have written before losing its receipt.
      // Drain owners, then retain the synthetic ledger/files for diagnosis.
      const preserve = !options.missingSourceOutput
      await close(preserve)
      if (preserve) {
        await mkdir('output', { recursive: true })
        await writeFile(join('output', `delegated-method-source-failure-${digest(root)}.json`), JSON.stringify({ format: 'alicization-delegated-method-source-failure-v1', root, capability, ownersDrained: true, statePreserved: true, createdAt: new Date().toISOString() }, null, 2), { flag: 'wx' })
      }
    }
    catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Owned source failed and cleanup needs inspection')
    }
    throw error
  }
}

it.skipIf(process.platform !== 'win32')('closes the native source owners and removes only its owned fixture after a real child produces no source output', async () => {
  let ownedRoot = ''
  await expect(fixture('coding_agent.cli', 0, false, { missingSourceOutput: true, onOwnedRoot: root => ownedRoot = root })).rejects.toThrow('Owned delegated responsibility did not finish')
  expect(ownedRoot).not.toBe('')
  await expect(stat(ownedRoot)).rejects.toMatchObject({ code: 'ENOENT' })
}, 60000)

for (const { capability, omitCliArgs } of [{ capability: 'coding_agent.cli', omitCliArgs: false }, { capability: 'coding_agent.cli', omitCliArgs: true }, { capability: 'coding_agent.codex', omitCliArgs: false }] as const) {
  it.skipIf(process.platform !== 'win32' || (capability === 'coding_agent.codex' && process.env.ALICIZATION_RUN_REAL_CODEX !== '1'))(`evaluates ${capability}${omitCliArgs ? ' with omitted args' : ''} real writes, no-result and post-write interruption before activation and three fresh uses`, async () => {
    const f = await fixture(capability, 0, omitCliArgs)
    let learned: ReturnType<typeof createLearnedProcedureRuntime> | undefined
    try {
      const original = await stat(f.sourcePath)
      const document = procedureSkillSource(f.candidate, f.registry)
      expect(document).not.toContain(f.privateText)
      expect(document).not.toContain(f.sourcePath)
      expect(document).toContain(`"risk":"${f.registry.resolveActive(capability)!.risk}"`)
      const evaluation = await evaluateProcedureCandidate(f.candidateId, f.candidate, f.registry, new AbortController().signal, undefined, createProcedureDelegatedReplay)
      expect(evaluation.status, JSON.stringify(evaluation.cases)).toBe('passed')
      expect(evaluation.evaluatorVersion).toBe('computer-procedure-replay-v2')
      expect(evaluation.cases).toHaveLength(8)
      await f.repository.recordEvaluation(evaluation)
      const skills = join(f.root, 'skills')
      await mkdir(skills)
      const loader = createAlicizationSkillLoader({ skillsDirectory: skills, skillRegistry: createAlicizationSkillRegistry(), toolRegistry: f.registry, fileSystem: createProcedureSkillFileSystem(skills, f.repository, f.registry), ...createSkillLifecyclePersistence(f.database, 'alice'), availableTools: f.registry.list().map(tool => tool.capabilityId), availablePermissions: ['workspace.read', 'workspace.write'], projection: { scope: 'card', executionChannel: 'skill', timeoutMs: 120000, supportsProgress: true, supportsCancellation: true, idempotency: 'required', providerToolName: skill => skill.id.replaceAll('.', '_'), adapterToolName: skill => skill.id } })
      await loader.markEvaluation(f.candidate.id, f.candidate.version, 'approved')
      await loader.activate(f.candidate.id, f.candidate.version)
      expect(await loader.projectProduction()).toMatchObject([{ capabilityId: f.candidate.id, risk: f.registry.resolveActive(capability)!.risk }])
      learned = createLearnedProcedureRuntime({ cardId: 'alice', database: f.database, registry: f.registry, repository: f.repository, loader, work: () => f.work, enabled: () => true, delegatedReplay: createProcedureDelegatedReplay })
      for (const round of [1, 2, 3]) {
        const text = `Fresh current program ${round} 中文🙂`
        const path = join(f.workspace, `new-result-${round}.txt`)
        const input = f.nativeInput(path, text)
        f.setExpected(omitCliArgs ? { ...input, args: [] } : input)
        const arguments_ = Object.fromEntries(f.candidate.template.parameters.map(parameter => [parameter.name, parameter.role === 'workspace' ? f.workspace : parameter.role === 'program' ? input.command : parameter.role === 'program-arguments' ? input.args ?? [] : parameter.role === 'instructions' ? input.prompt : parameter.role === 'file' ? path : digest(text)]))
        const turnId = `new-${round}`
        await f.admit(turnId, `Create fresh result ${round}`)
        const result = await learned.use({ cardId: 'alice', turnId, id: f.candidate.id, version: f.candidate.version, goal: `Create fresh result ${round}`, arguments: arguments_ })
        await f.settle(turnId)
        expect((await f.completed(result.rootThreadId)).verification).toMatchObject({ independent: true, verdict: 'satisfied' })
        expect(await readFile(path, 'utf8')).toBe(text)
      }
      expect(await readFile(f.sourcePath, 'utf8')).toBe(f.privateText)
      expect((await stat(f.sourcePath)).mtimeMs).toBe(original.mtimeMs)
      await learned.withdraw(f.candidate.id, f.candidate.version)
      expect((await f.repository.list())[0].sourceValid).toBe(false)
      expect(await loader.projectProduction()).toEqual([])
      expect(f.errors).toEqual([])
    }
    finally {
      await learned?.dispose()
      await f.close()
    }
  }, capability === 'coding_agent.cli' ? 120000 : 600000)
}

it.skipIf(process.platform !== 'win32')('rejects a real zero-exit child that produces no accepted bytes even during the first positive replay', async () => {
  const f = await fixture()
  try {
    const evaluation = await evaluateProcedureCandidate(f.candidateId, f.candidate, f.registry, new AbortController().signal, undefined, async (options) => {
      const actual = await createProcedureDelegatedReplay(options)
      return { ...actual, prepare: input => actual.prepare({ ...input, mode: 'missing-artifact' }) }
    })
    expect(evaluation.status).toBe('failed')
    const failed = evaluation.cases.find(item => item.name === 'different-input-1')
    expect(failed?.passed).toBe(false)
    expect(JSON.parse(failed!.diagnostic!)).toMatchObject({ verdict: 'not-satisfied' })
    expect(failed!.diagnostic!.length).toBeLessThanOrEqual(512)
    expect(failed!.diagnostic).not.toContain(f.privateText)
    expect(failed!.diagnostic).not.toContain(f.sourcePath)
    expect((await f.repository.list())[0].evaluation).toBeNull()
    expect(await readFile(f.sourcePath, 'utf8')).toBe(f.privateText)
  }
  finally {
    await f.close()
  }
}, 60000)

it.skipIf(process.platform !== 'win32')('evaluates a real delegated method with twelve independently accepted files without expanding one program argument beyond its bound', async () => {
  const f = await fixture('coding_agent.cli', 11)
  try {
    const evaluation = await evaluateProcedureCandidate(f.candidateId, f.candidate, f.registry, new AbortController().signal, undefined, createProcedureDelegatedReplay)
    expect(evaluation.status, JSON.stringify(evaluation.cases)).toBe('passed')
    expect(evaluation.cases).toHaveLength(8)
    expect(await readFile(f.sourcePath, 'utf8')).toBe(f.privateText)
  }
  finally {
    await f.close()
  }
}, 120000)
