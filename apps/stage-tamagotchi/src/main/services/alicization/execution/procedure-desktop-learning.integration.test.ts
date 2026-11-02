import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createAlicizationSkillLoader } from '../turn-os/skill-loader'
import { createAlicizationSkillRegistry } from '../turn-os/skill-registry'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createLearnedProcedureRuntime } from './learned-procedure-runtime'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { procedureDesktopInteraction } from './procedure-desktop-interaction'
import { createProcedureDesktopReplay } from './procedure-desktop-replay'
import { desktopProcedureExample } from './procedure-desktop-test-fixture'
import { createProcedureSkillFileSystem, procedureSkillSource } from './procedure-skill-files'
import { compileProcedureTemplate, instantiateProcedureTemplate } from './procedure-template'
import { createExecutionResourceBroker } from './resource-broker'
import { createSkillLifecyclePersistence } from './skill-lifecycle-repository'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it.skipIf(platform !== 'win32' || process.env.LIFE_QA_NATIVE_DESKTOP_METHOD !== '1')('captures, evaluates, persists, reuses and revokes a real passive native editor method', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-native-method-life-'))
  const editorRoot = join(root, 'editor')
  await mkdir(editorRoot)
  const registry = createCanonicalToolRegistry({ platform: 'win32' })
  const example = desktopProcedureExample()
  const template = compileProcedureTemplate(example.plan, example.criteria, registry)
  const shape = procedureDesktopInteraction(template)!
  const signal = new AbortController().signal
  const editor = await createProcedureDesktopReplay({ root: editorRoot, template, signal })
  let database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const errors: unknown[] = []
  let holdSave = false
  let enteredSave: (() => void) | undefined
  let releaseSave: (() => void) | undefined
  const trace: unknown[] = []
  const tools = Object.fromEntries(Object.entries(editor.tools).map(([id, perform]) => [id, async (input: Record<string, unknown>, actionSignal: AbortSignal) => {
    trace.push({ id, input, phase: 'before' })
    if (holdSave && id === 'tool.desktop_click_element') {
      enteredSave?.()
      await new Promise<void>((resolve) => { releaseSave = resolve })
    }
    const output = await perform(input, actionSignal)
    trace.push({ id, output, phase: 'after' })
    return output
  }]))
  const makeWork = () => createWorkPlanExecutionRuntime({ getDatabase: () => database, canContinue: () => true, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools })
  let work = makeWork()
  const life = createLifeTurnRuntime({ read: () => database.readLifeState(), commit: input => database.commitLifeState(input), getIngress: id => database.getLifeIngress(id), getEffect: id => database.getLifeEffect(id), now: Date.now })
  const skillsDirectory = join(root, 'skills')
  await mkdir(skillsDirectory)
  function services() {
    const repository = createProcedureCandidateRepository(database, 'alice', registry)
    const loader = createAlicizationSkillLoader({ skillsDirectory, toolRegistry: registry, skillRegistry: createAlicizationSkillRegistry(), fileSystem: createProcedureSkillFileSystem(skillsDirectory, repository, registry), ...createSkillLifecyclePersistence(database, 'alice'), availableTools: registry.list().map(item => item.capabilityId), availablePermissions: [...new Set(registry.list().flatMap(item => item.permissions))], projection: { scope: 'card', executionChannel: 'skill', timeoutMs: 30_000, supportsProgress: true, supportsCancellation: true, idempotency: 'none', providerToolName: item => item.id.replaceAll('.', '_'), adapterToolName: item => item.id } })
    const learned = createLearnedProcedureRuntime({ cardId: 'alice', database, registry, repository, loader, work: () => work, enabled: () => true, desktopReplay: createProcedureDesktopReplay })
    return { repository, loader, learned }
  }
  let current = services()
  async function fulfilled(threadId: string) {
    const deadline = Date.now() + 30_000
    for (;;) {
      const goal = (await database.readLifeState()).obligations.find(item => item.threadId === threadId)
      if (goal?.status === 'fulfilled')
        return goal
      if (Date.now() >= deadline || ['blocked', 'cancelled'].includes(goal?.status ?? ''))
        throw new Error(`Owned native method failed to complete: ${JSON.stringify({ goal, errors: errors.map(String) })}`)
      await delay(30)
    }
  }
  async function fresh(caseId: string, text: string) {
    const path = join(editorRoot, `${caseId}.txt`)
    const saveLabel = `Save ${caseId}`
    const fixture = await editor.prepare({ caseId, entryLabel: `Entry ${caseId}`, saveLabel, path })
    return { path, mapping: { windowTitle: fixture.windowTitle, saveLabel, targetPath: path, text }, args: { [shape.windowParameter]: fixture.windowTitle, [shape.textParameter]: text, [shape.saveLabelParameter]: saveLabel, [shape.pathParameter]: path } }
  }
  try {
    const source = await fresh('original-private', '原始私人示例\r\n不得变成共享方法内容🙂')
    await life.admit({ cardId: 'alice', turnId: 'original-native', conversationId: 'owned-native', messages: [{ role: 'user', content: 'Save this exact owned editor text' }] }, signal)
    const original = await work.propose({ ...instantiateProcedureTemplate(template, source.args, registry, 'Save the owned private native example'), cardId: 'alice', turnId: 'original-native' })
    await fulfilled(original.rootThreadId)
    await life.settle({ cardId: 'alice', turnId: 'original-native', status: 'completed' })
    expect(await readFile(source.path, 'utf8')).toBe(source.mapping.text)
    const originalFile = await stat(source.path)
    const candidateId = await current.learned.capture(original.rootThreadId)
    const candidate = await current.repository.get(candidateId)
    const skillSource = procedureSkillSource(candidate, registry)
    for (const privateValue of [source.mapping.text, source.path, source.mapping.windowTitle, source.mapping.saveLabel])
      expect(skillSource).not.toContain(privateValue)
    expect(await current.loader.projectProduction()).toEqual([])
    await expect(current.loader.activate(candidate.id, candidate.version)).rejects.toThrow()
    expect(await current.learned.evaluate(candidateId)).toBe('passed')
    expect((await current.repository.list())[0].evaluation?.cases).toHaveLength(10)
    expect((await stat(source.path)).mtimeMs).toBe(originalFile.mtimeMs)
    await current.loader.activate(candidate.id, candidate.version)
    expect(await current.loader.projectProduction()).toMatchObject([{ capabilityId: candidate.id }])
    await current.learned.dispose()
    await work.dispose()
    await database.close()
    database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
    work = makeWork()
    current = services()
    expect(await current.repository.list()).toMatchObject([{ candidateId, sourceValid: true, evaluation: { status: 'passed' } }])
    expect(await current.loader.projectProduction()).toMatchObject([{ capabilityId: candidate.id }])
    for (const [round, text] of ['新内容🙂\r\nLiteral $(Get-Process)', 'العربية e\u0301\n第二行', 'Third text 👩‍👩‍👧‍👦 "quoted"'].entries()) {
      const target = await fresh(`reuse-${round}`, text)
      const turnId = `native-reuse-${round}`
      const goal = `Save current editor ${round}`
      const request = `调用 life_use_learned_procedure id=${candidate.id} version=${candidate.version}。本次编辑器参数 ${JSON.stringify(target.mapping)}。goal 必须为 ${goal}。`
      await life.admit({ cardId: 'alice', turnId, conversationId: 'owned-native', messages: [{ role: 'user', content: request }] }, signal)
      const prepared = await current.learned.prepareInput({ cardId: 'alice', turnId, input: { id: candidate.id, version: candidate.version, goal, arguments: Object.entries({ ...target.args, [shape.textParameter]: 'model accidentally abbreviated the literal' }).map(([name, value]) => ({ name, value })) }, signal })
      expect(prepared.projection).toMatchObject({ actionAdmitted: false })
      const args = Object.fromEntries((prepared.input.arguments as Array<{ name: string, value: unknown }>).map(item => [item.name, item.value]))
      expect(args[shape.textParameter]).toBe(text)
      const use = await current.learned.use({ cardId: 'alice', turnId, id: candidate.id, version: candidate.version, goal: String(prepared.input.goal), arguments: args })
      await fulfilled(use.rootThreadId)
      await life.settle({ cardId: 'alice', turnId, status: 'completed' })
      expect(await readFile(target.path, 'utf8')).toBe(text)
      expect(createHash('sha256').update(await readFile(target.path)).digest('hex')).toBe(createHash('sha256').update(text).digest('hex'))
      expect(editor.snapshot()).toMatchObject({ saves: 1, content: text, inFlight: 0 })
    }
    const withdrawn = await fresh('withdraw-before-save', 'Typed locally; never save after its source is withdrawn')
    await life.admit({ cardId: 'alice', turnId: 'withdraw-native', conversationId: 'owned-native', messages: [{ role: 'user', content: 'Start the current owned native method' }] }, signal)
    holdSave = true
    const entered = new Promise<void>((resolve) => { enteredSave = resolve })
    const inFlight = await current.learned.use({ cardId: 'alice', turnId: 'withdraw-native', id: candidate.id, version: candidate.version, goal: 'Withdraw before the native save dispatch', arguments: withdrawn.args })
    await Promise.race([entered, delay(30_000).then(() => { throw new Error('Native save never reached its held dispatch boundary') })])
    expect(editor.snapshot(), JSON.stringify({ snapshot: editor.snapshot(), trace: trace.slice(-8) })).toMatchObject({ saves: 0, content: withdrawn.mapping.text, inFlight: 0 })
    await database.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-native-source', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'goals', id: candidate.source.goalId, version: String(candidate.source.generation) }, mode: 'correction', reason: 'host-withdrew-native-source' }] })
    releaseSave!()
    const stopDeadline = Date.now() + 15_000
    while (work.isWriting() && Date.now() < stopDeadline) await delay(30)
    expect(work.isWriting()).toBe(false)
    expect(editor.snapshot(), JSON.stringify(editor.snapshot())).toMatchObject({ saves: 0, content: withdrawn.mapping.text, inFlight: 0 })
    await expect(stat(withdrawn.path)).rejects.toThrow()
    const state = await database.readLifeState({ executionPlanId: inFlight.planId })
    expect(state.obligations.find(item => item.threadId === inFlight.rootThreadId)).toMatchObject({ status: 'blocked', invalidatedBy: { kind: 'goals', id: candidate.source.goalId } })
    // Reads and typing really completed before withdrawal. Preserve those
    // facts while requiring the not-yet-dispatched save to remain unverified.
    const saveStepId = String(candidate.template.steps.at(-1)!.id)
    expect(state.execution?.results.some(item => item.planId === inFlight.planId && item.stepId === saveStepId && item.state === 'verified')).toBe(false)
    expect(await current.loader.projectProduction()).toEqual([])
    expect(await current.repository.list()).toMatchObject([{ candidateId, sourceValid: false }])
    await expect(current.learned.use({ cardId: 'alice', turnId: 'withdraw-native', id: candidate.id, version: candidate.version, goal: 'Must not reuse a withdrawn source', arguments: withdrawn.args })).rejects.toThrow('current independent replay proof')
    expect(await readFile(source.path, 'utf8')).toBe(source.mapping.text)
  }
  finally {
    releaseSave?.()
    await current.learned.dispose()
    await work.dispose()
    await editor.dispose()
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
