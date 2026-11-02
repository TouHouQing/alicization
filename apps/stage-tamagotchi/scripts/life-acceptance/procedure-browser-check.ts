import assert from 'node:assert/strict'

import { createHash } from 'node:crypto'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { callLocalFilesystem } from '../../src/main/services/airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { createExecutionInterruptRegistry } from '../../src/main/services/alicization/execution-interrupt-registry'
import { createLearnedProcedureRuntime } from '../../src/main/services/alicization/execution/learned-procedure-runtime'
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

const digest = (value: string) => createHash('sha256').update(value).digest('hex')

/** Actual Electron DOM, SQLite, governed work and independent native file verification. */
export async function runProcedureBrowserCheck(root: string) {
  await mkdir(root, { recursive: false })
  const controller = new AbortController()
  const registry = createCanonicalToolRegistry()
  const db = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const browser = await createProcedureBrowserReplay(root, controller.signal)
  const broker = createExecutionResourceBroker()
  const errors: unknown[] = []
  const work = createWorkPlanExecutionRuntime({
    getDatabase: () => db,
    enabled: () => true,
    toolRegistry: () => registry,
    captureBrowserBinding: () => browser.binding,
    isBrowserBindingCurrent: browser.isCurrent,
    broker,
    interrupts: createExecutionInterruptRegistry(broker),
    onError: error => errors.push(error),
    tools: { ...browser.tools, 'tool.filesystem_write_file': (input, signal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }) },
  })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  const repository = createProcedureCandidateRepository(db, 'alice', registry)
  const skillsDirectory = join(root, 'skills')
  await mkdir(skillsDirectory)
  const loader = createAlicizationSkillLoader({
    skillsDirectory,
    toolRegistry: registry,
    skillRegistry: createAlicizationSkillRegistry(),
    fileSystem: createProcedureSkillFileSystem(skillsDirectory, repository, registry),
    ...createSkillLifecyclePersistence(db, 'alice'),
    availableTools: registry.list().map(item => item.capabilityId),
    availablePermissions: ['network.read', 'screen.read', 'workspace.write'],
    projection: { scope: 'card', executionChannel: 'skill', timeoutMs: 30000, supportsProgress: true, supportsCancellation: true, idempotency: 'none', providerToolName: item => item.id.replaceAll('.', '_'), adapterToolName: item => item.id },
  })
  const learned = createLearnedProcedureRuntime({ cardId: 'alice', database: db, registry, repository, loader, work: () => work, enabled: () => true, browserReplay: createProcedureBrowserReplay })
  const checks: unknown[] = []
  async function admit(turnId: string, goal: string) {
    await life.admit({ cardId: 'alice', turnId, conversationId: 'owned-browser-transfer', messages: [{ role: 'user', content: goal }] }, controller.signal)
  }
  async function completed(planId: string, threadId: string) {
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      if (errors.length)
        throw errors[0]
      const view = await db.readLifeState({ executionPlanId: planId })
      const goal = view.obligations.find(item => item.threadId === threadId)
      if (goal?.status === 'fulfilled' && goal.verification?.independent && !work.isActive())
        return goal.verification
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    throw new Error('Browser transfer did not fulfill its independent native byte criterion')
  }
  try {
    const privateText = 'Private source page 中文🙂 & <tag>'
    const source = await browser.prepare({ caseId: 'source', text: privateText })
    const sourcePath = join(root, 'private-source-copy.txt')
    await admit('source', 'Copy the currently requested synthetic page to the owned file')
    const accepted = await work.propose({ cardId: 'alice', turnId: 'source', goal: 'Copy the currently requested synthetic page to the owned file', criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: sourcePath, sha256: digest(privateText) } }], steps: [
      { id: 'open', capabilityId: 'tool.browser_open_url', input: { url: source.url }, dependsOn: [], acceptanceCriterionIds: [] },
      { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: ['open'], acceptanceCriterionIds: [] },
      { id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path: sourcePath }, inputBindings: [{ parameter: 'content', stepId: 'read', path: ['content'] }], dependsOn: ['read'], acceptanceCriterionIds: ['bytes'] },
    ] })
    await life.settle({ cardId: 'alice', turnId: 'source', status: 'completed' })
    checks.push({ name: 'source-native-bytes', proof: await completed(accepted.planId, accepted.rootThreadId) })
    assert.equal(await readFile(sourcePath, 'utf8'), privateText)
    const sourceBefore = await stat(sourcePath)
    const candidateId = await learned.capture(accepted.rootThreadId)
    const candidate = await repository.get(candidateId)
    const sourceDocument = procedureSkillSource(candidate, registry)
    for (const privateValue of [privateText, source.url, sourcePath, browser.binding.id])
      assert.ok(!sourceDocument.includes(privateValue), 'Private source material must remain outside the reusable skill')
    await assert.rejects(() => loader.activate(candidate.id, candidate.version))
    assert.equal(await learned.evaluate(candidateId), 'passed', JSON.stringify(await repository.list()))
    const evaluated = (await repository.list())[0]
    assert.equal(evaluated.evaluation?.evaluatorVersion, 'browser-procedure-replay-v1')
    assert.ok(evaluated.evaluation.cases.length >= 7 && evaluated.evaluation.cases.every(item => item.passed))
    checks.push({ name: 'dedicated-browser-cross-input-evaluation', evaluation: evaluated.evaluation })
    await assert.rejects(() => repository.recordEvaluation({ ...evaluated.evaluation!, evaluatorVersion: 'file-procedure-replay-v1' }))
    await loader.activate(candidate.id, candidate.version)
    assert.equal((await loader.projectProduction()).length, 1)
    for (const round of [1, 2, 3]) {
      const text = `Fresh page ${round} 中文🙂 & <different>`
      const page = await browser.prepare({ caseId: `fresh-${round}`, text })
      const path = join(root, `fresh-${round}.txt`)
      const arguments_ = Object.fromEntries(candidate.template.parameters.map(parameter => [parameter.name, parameter.kind === 'url' ? page.url : parameter.kind === 'path' ? path : digest(text)]))
      const turnId = `fresh-${round}`
      await admit(turnId, 'Copy the fresh current page into its new owned target')
      const result = await learned.use({ cardId: 'alice', turnId, id: candidate.id, version: candidate.version, goal: 'Copy the fresh current page into its new owned target', arguments: arguments_ })
      await life.settle({ cardId: 'alice', turnId, status: 'completed' })
      const proof = await completed(result.planId, result.rootThreadId)
      assert.equal(await readFile(path, 'utf8'), text)
      assert.equal(await readFile(sourcePath, 'utf8'), privateText)
      assert.equal((await stat(sourcePath)).mtimeMs, sourceBefore.mtimeMs)
      checks.push({ name: `active-skill-new-page-${round}`, proof, targetHash: digest(text) })
    }
    const changedText = 'Actual changed page cannot satisfy the current requested result'
    const invalidPage = await browser.prepare({ caseId: 'invalid-use', text: changedText })
    const invalidPath = join(root, 'invalid-page-result.txt')
    const invalidArguments = Object.fromEntries(candidate.template.parameters.map(parameter => [parameter.name, parameter.kind === 'url' ? invalidPage.url : parameter.kind === 'path' ? invalidPath : digest('Current required page value')]))
    await admit('invalid-use', 'The changed page must still meet the current requested bytes')
    const invalid = await learned.use({ cardId: 'alice', turnId: 'invalid-use', id: candidate.id, version: candidate.version, goal: 'The changed page must still meet the current requested bytes', arguments: invalidArguments })
    await life.settle({ cardId: 'alice', turnId: 'invalid-use', status: 'completed' })
    const invalidBy = Date.now() + 15000
    while (Date.now() < invalidBy && (!(await repository.list()).find(item => item.candidate.version === candidate.version)?.repair || work.isActive()))
      await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(await readFile(invalidPath, 'utf8'), changedText)
    const degraded = (await repository.list()).find(item => item.candidate.version === candidate.version)!
    assert.equal(degraded.sourceValid, false)
    assert.equal(degraded.repair?.reason, 'acceptance-not-satisfied')
    assert.equal(degraded.repair?.sourcePlanId, invalid.planId)
    assert.notEqual((await db.readLifeState({ executionPlanId: invalid.planId })).obligations.find(item => item.threadId === invalid.rootThreadId)?.status, 'fulfilled')
    assert.equal((await loader.projectProduction()).length, 0)
    await assert.rejects(() => learned.use({ cardId: 'alice', turnId: 'invalid-use', id: candidate.id, version: candidate.version, goal: 'Do not replay the failed version', arguments: invalidArguments }))
    checks.push({ name: 'actual-changed-page-downgrades-method', repair: degraded.repair, actualHash: digest(changedText), requiredHash: digest('Current required page value') })

    const correctedText = 'A newly verified corrected source page 中文🙂'
    const correctedPage = await browser.prepare({ caseId: 'corrected-source', text: correctedText })
    const correctedPath = join(root, 'corrected-source-copy.txt')
    await admit('corrected-source', 'Learn the corrected current workflow from a fresh verified success')
    const corrected = await work.propose({ cardId: 'alice', turnId: 'corrected-source', goal: 'Learn the corrected current workflow from a fresh verified success', criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: correctedPath, sha256: digest(correctedText) } }], steps: [
      { id: 'open', capabilityId: 'tool.browser_open_url', input: { url: correctedPage.url }, dependsOn: [], acceptanceCriterionIds: [] },
      { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: ['open'], acceptanceCriterionIds: [] },
      { id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path: correctedPath }, inputBindings: [{ parameter: 'content', stepId: 'read', path: ['content'] }], dependsOn: ['read'], acceptanceCriterionIds: ['bytes'] },
    ] })
    await life.settle({ cardId: 'alice', turnId: 'corrected-source', status: 'completed' })
    await completed(corrected.planId, corrected.rootThreadId)
    const correctedId = await learned.capture(corrected.rootThreadId)
    const repaired = await repository.get(correctedId)
    assert.equal(repaired.id, candidate.id)
    assert.notEqual(repaired.version, candidate.version)
    await assert.rejects(() => loader.activate(repaired.id, repaired.version))
    assert.equal(await learned.evaluate(correctedId), 'passed')
    await loader.activate(repaired.id, repaired.version)
    assert.equal((await loader.projectProduction()).length, 1)
    checks.push({ name: 'corrected-method-requires-fresh-source-and-new-evaluation', version: repaired.version, source: repaired.source })
    for (const round of [1, 2, 3]) {
      const text = `Corrected fresh page ${round} 中文🙂`
      const page = await browser.prepare({ caseId: `corrected-use-${round}`, text })
      const path = join(root, `corrected-result-${round}.txt`)
      await admit(`corrected-use-${round}`, 'Use the newly evaluated method with current inputs')
      const result = await learned.use({ cardId: 'alice', turnId: `corrected-use-${round}`, id: repaired.id, version: repaired.version, goal: 'Use the newly evaluated method with current inputs', arguments: Object.fromEntries(repaired.template.parameters.map(parameter => [parameter.name, parameter.kind === 'url' ? page.url : parameter.kind === 'path' ? path : digest(text)])) })
      await life.settle({ cardId: 'alice', turnId: `corrected-use-${round}`, status: 'completed' })
      const proof = await completed(result.planId, result.rootThreadId)
      assert.equal(await readFile(path, 'utf8'), text)
      checks.push({ name: `repaired-active-method-new-page-${round}`, proof, targetHash: digest(text) })
    }
    await learned.withdraw(repaired.id, repaired.version)
    assert.equal((await repository.list()).find(item => item.candidate.version === repaired.version)?.sourceValid, false)
    assert.equal((await loader.projectProduction()).length, 0)
    assert.equal(await readFile(sourcePath, 'utf8'), privateText)
    assert.equal((await stat(sourcePath)).mtimeMs, sourceBefore.mtimeMs)
    checks.push({ name: 'withdrawn-source-not-active' })
    assert.deepEqual(errors, [])
    return { passed: true, checks, scope: 'Real owned Electron pages, dedicated replay, activation, three new inputs, actual invalid-page downgrade, a freshly verified/evaluated replacement, three repaired-version uses and withdrawal; no user browser or native keyboard input.' }
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
