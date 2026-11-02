import type { ProcedureFormFixtureInput } from '../../src/main/services/alicization/execution/procedure-browser-replay-types'
import type { ProcedureCandidate } from '../../src/main/services/alicization/execution/procedure-candidate-repository'
import type { ExecutionWorkProposal } from '../../src/shared/execution-contracts'

import assert from 'node:assert/strict'

import { createHash } from 'node:crypto'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { callLocalFilesystem } from '../../src/main/services/airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { createExecutionInterruptRegistry } from '../../src/main/services/alicization/execution-interrupt-registry'
import { createLearnedProcedureRuntime } from '../../src/main/services/alicization/execution/learned-procedure-runtime'
import { procedureBrowserInteraction } from '../../src/main/services/alicization/execution/procedure-browser-interaction'
import { createProcedureBrowserReplay } from '../../src/main/services/alicization/execution/procedure-browser-replay'
import { createProcedureCandidateRepository } from '../../src/main/services/alicization/execution/procedure-candidate-repository'
import { createProcedureSkillFileSystem, procedureSkillSource } from '../../src/main/services/alicization/execution/procedure-skill-files'
import { createExecutionResourceBroker } from '../../src/main/services/alicization/execution/resource-broker'
import { createSkillLifecyclePersistence } from '../../src/main/services/alicization/execution/skill-lifecycle-repository'
import { createWorkPlanExecutionRuntime } from '../../src/main/services/alicization/execution/work-plan-execution-runtime'
import { createLifeTurnRuntime } from '../../src/main/services/alicization/life-turn-runtime'
import { createAlicizationSkillLoader } from '../../src/main/services/alicization/turn-os/skill-loader'
import { createAlicizationSkillRegistry } from '../../src/main/services/alicization/turn-os/skill-registry'
import { createCanonicalToolRegistry } from '../../src/main/services/alicization/turn-os/tool-registry'

const digest = (text: string) => createHash('sha256').update(text).digest('hex')

/** Entry name matches the existing authenticated native module controller. */
export async function runProcedureBrowserCheck(root: string) {
  await mkdir(root)
  const controller = new AbortController()
  const registry = createCanonicalToolRegistry()
  const db = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const browser = await createProcedureBrowserReplay(root, controller.signal)
  assert.ok(browser.prepareForm && browser.inspectForm)
  const broker = createExecutionResourceBroker()
  const errors: unknown[] = []
  const work = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, toolRegistry: () => registry, captureBrowserBinding: () => browser.binding, isBrowserBindingCurrent: browser.isCurrent, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: { ...browser.tools, 'tool.filesystem_write_file': (input, signal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }) } })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  const repository = createProcedureCandidateRepository(db, 'alice', registry)
  const skillsDirectory = join(root, 'skills')
  await mkdir(skillsDirectory)
  const permissions = [...new Set(registry.list().flatMap(item => item.permissions))]
  const loader = createAlicizationSkillLoader({ skillsDirectory, toolRegistry: registry, skillRegistry: createAlicizationSkillRegistry(), fileSystem: createProcedureSkillFileSystem(skillsDirectory, repository, registry), ...createSkillLifecyclePersistence(db, 'alice'), availableTools: registry.list().map(item => item.capabilityId), availablePermissions: permissions, projection: { scope: 'card', executionChannel: 'skill', timeoutMs: 30_000, supportsProgress: true, supportsCancellation: true, idempotency: 'none', providerToolName: item => item.id.replaceAll('.', '_'), adapterToolName: item => item.id } })
  const learned = createLearnedProcedureRuntime({ cardId: 'alice', database: db, registry, repository, loader, work: () => work, enabled: () => true, browserReplay: createProcedureBrowserReplay })
  const checks: unknown[] = []
  async function admit(turnId: string) {
    await life.admit({ cardId: 'alice', turnId, conversationId: 'owned-form-transfer', messages: [{ role: 'user', content: 'Fill this synthetic owned form and independently save its observed receipt.' }] }, controller.signal)
  }
  async function fulfilled(planId: string, threadId: string) {
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline) {
      if (errors.length)
        throw errors[0]
      const view = await db.readLifeState({ executionPlanId: planId })
      const goal = view.obligations.find(item => item.threadId === threadId)
      if (goal?.status === 'fulfilled' && goal.verification?.independent && !work.isActive())
        return goal.verification
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    throw new Error('Interactive method did not fulfill its independent byte criterion')
  }
  const seed = (caseId: string): ProcedureFormFixtureInput => ({ caseId, fields: [{ label: `First ${caseId}`, text: `Different first ${caseId} 中文🙂\nSecond line` }, { label: `Second ${caseId}`, text: `Different second ${caseId} & <safe>\r\nAnother line` }], submitLabel: `Record ${caseId}`, receiptText: `Receipt ${caseId}` })
  async function source(input: ProcedureFormFixtureInput) {
    const fixture = await browser.prepareForm!(input)
    const path = join(root, `${input.caseId}.txt`)
    const steps: ExecutionWorkProposal['steps'] = []
    function add(id: string, capabilityId: string, value: Record<string, unknown>, bindings?: ExecutionWorkProposal['steps'][number]['inputBindings']) {
      steps.push({ id, capabilityId, input: value, dependsOn: steps.length ? [steps.at(-1)!.id] : [], acceptanceCriterionIds: id === 'save' ? ['bytes'] : [], ...(bindings ? { inputBindings: bindings } : {}) })
    }
    const binding = (stepId: string, label: string) => [{ parameter: 'selector', stepId, path: ['elements'], select: { field: 'text', equals: label, valueField: 'selector' } }]
    add('open', 'tool.browser_open_url', { url: fixture.url })
    input.fields.forEach((field, index) => {
      add(`read-${index}`, 'tool.browser_read_page', { format: 'interactables' })
      add(`fill-${index}`, 'tool.browser_type_text', { selector: 'from-current-observation', text: field.text, clearExisting: true }, binding(`read-${index}`, field.label))
    })
    add('read-submit', 'tool.browser_read_page', { format: 'interactables' })
    add('submit', 'tool.browser_click_element', { selector: 'from-current-observation' }, binding('read-submit', input.submitLabel))
    add('wait', 'tool.browser_wait', { state: 'complete', text: input.receiptText, timeoutMs: 10_000 })
    add('receipt', 'tool.browser_read_page', { format: 'text' })
    add('save', 'tool.filesystem_write_file', { path }, [{ parameter: 'content', stepId: 'receipt', path: ['content'] }])
    await admit(input.caseId)
    const result = await work.propose({ cardId: 'alice', turnId: input.caseId, goal: 'Save the independent form receipt', steps, criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: digest(fixture.expectedText) } }] })
    await life.settle({ cardId: 'alice', turnId: input.caseId, status: 'completed' })
    const proof = await fulfilled(result.planId, result.rootThreadId)
    assert.equal(await readFile(path, 'utf8'), fixture.expectedText)
    assert.deepEqual(browser.inspectForm!(), { requests: 1, accepted: 1, refused: 0, observedText: fixture.expectedText })
    return { ...result, proof, path, text: fixture.expectedText }
  }
  async function use(candidate: ProcedureCandidate, input: ProcedureFormFixtureInput) {
    const fixture = await browser.prepareForm!(input)
    const profile = procedureBrowserInteraction(candidate.template)!
    const path = join(root, `${input.caseId}.txt`)
    const args: Record<string, unknown> = { [profile.urlParameter]: fixture.url, [profile.pathParameter]: path, [profile.hashParameter]: digest(fixture.expectedText), [profile.submitLabelParameter]: input.submitLabel, [profile.waitTextParameter]: input.receiptText }
    profile.fields.forEach((field, index) => {
      args[field.labelParameter] = input.fields[index].label
      args[field.textParameter] = input.fields[index].text
    })
    await admit(input.caseId)
    const result = await learned.use({ cardId: 'alice', turnId: input.caseId, id: candidate.id, version: candidate.version, goal: 'Use the evaluated form method with current explicit values', arguments: args })
    await life.settle({ cardId: 'alice', turnId: input.caseId, status: 'completed' })
    return { ...result, path, expectedText: fixture.expectedText }
  }
  try {
    const original = await source(seed('private-source'))
    const originalTime = (await stat(original.path)).mtimeMs
    const candidateId = await learned.capture(original.rootThreadId)
    const candidate = await repository.get(candidateId)
    const document = procedureSkillSource(candidate, registry)
    for (const privateValue of ['private-source', original.path, original.text])
      assert.ok(!document.includes(privateValue))
    await assert.rejects(() => loader.activate(candidate.id, candidate.version))
    assert.equal(await learned.evaluate(candidateId), 'passed', JSON.stringify(await repository.list()))
    const evaluation = (await repository.list()).find(item => item.candidate.version === candidate.version)!.evaluation!
    assert.equal(evaluation.evaluatorVersion, 'browser-interaction-replay-v1')
    assert.equal(evaluation.cases.length, 10)
    assert.ok(evaluation.cases.every(item => item.passed))
    await assert.rejects(() => repository.recordEvaluation({ ...evaluation, evaluatorVersion: 'browser-procedure-replay-v1' }))
    await loader.activate(candidate.id, candidate.version)
    checks.push({ name: 'actual-form-source-and-ten-case-evaluation', evaluation })
    for (const round of [1, 2, 3]) {
      const result = await use(candidate, seed(`fresh-${round}`))
      const proof = await fulfilled(result.planId, result.rootThreadId)
      assert.equal(await readFile(result.path, 'utf8'), result.expectedText)
      assert.equal(browser.inspectForm!().accepted, 1)
      checks.push({ name: `fresh-form-use-${round}`, proof, server: browser.inspectForm!() })
    }
    const invalid = await use(candidate, { ...seed('changed-form'), fault: 'page-changed' })
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline && (!(await repository.list()).find(item => item.candidate.version === candidate.version)?.repair || work.isActive()))
      await new Promise(resolve => setTimeout(resolve, 20))
    const degraded = (await repository.list()).find(item => item.candidate.version === candidate.version)!
    assert.equal(degraded.sourceValid, false)
    assert.equal(degraded.repair?.sourcePlanId, invalid.planId)
    assert.notEqual(await readFile(invalid.path, 'utf8'), invalid.expectedText)
    assert.equal((await loader.projectProduction()).length, 0)
    checks.push({ name: 'actual-receipt-mismatch-downgrades-method', repair: degraded.repair, server: browser.inspectForm!() })
    const corrected = await source(seed('corrected-source'))
    const repairedId = await learned.capture(corrected.rootThreadId)
    const repaired = await repository.get(repairedId)
    assert.equal(repaired.id, candidate.id)
    assert.notEqual(repaired.version, candidate.version)
    await assert.rejects(() => loader.activate(repaired.id, repaired.version))
    assert.equal(await learned.evaluate(repairedId), 'passed')
    await loader.activate(repaired.id, repaired.version)
    checks.push({ name: 'repair-requires-new-source-and-form-evaluation', version: repaired.version })
    for (const round of [1, 2, 3]) {
      const result = await use(repaired, seed(`repaired-${round}`))
      const proof = await fulfilled(result.planId, result.rootThreadId)
      assert.equal(await readFile(result.path, 'utf8'), result.expectedText)
      assert.equal(browser.inspectForm!().requests, 1)
      checks.push({ name: `repaired-form-use-${round}`, proof, server: browser.inspectForm!() })
    }
    await learned.withdraw(repaired.id, repaired.version)
    assert.equal((await loader.projectProduction()).length, 0)
    assert.equal(await readFile(original.path, 'utf8'), original.text)
    assert.equal((await stat(original.path)).mtimeMs, originalTime)
    assert.deepEqual(errors, [])
    checks.push({ name: 'withdrawal-and-original-source-preserved' })
    return { passed: true, mode: 'interaction', checks, scope: 'Actual governed Electron form actions, synthetic HTTP submissions, ten-case replay, activation, three fresh uses, wrong receipt downgrade, fresh repair/evaluation, three repaired uses and withdrawal. No user browser, native input or release acceptance.' }
  }
  finally {
    try {
      await learned.dispose()
    }
    finally {
      try {
        await work.dispose()
      }
      finally {
        try {
          await browser.dispose()
        }
        finally {
          await db.close()
        }
      }
    }
  }
}
