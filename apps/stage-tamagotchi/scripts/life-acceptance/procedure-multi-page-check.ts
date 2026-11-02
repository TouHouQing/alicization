import type { ExecutionWorkProposal } from '../../src/shared/execution-contracts'

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
import { procedurePageRoutes } from '../../src/main/services/alicization/execution/procedure-page-routes'
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
    async function source(count: number, prefix: string) {
      const texts = Array.from({ length: count }, (_, index) => `Private ${prefix} page ${count === 2 ? 0 : index} 中文🙂 & <tag>`)
      const paths = texts.map((_, index) => join(root, `${prefix}-${index}.txt`))
      const pages = await browser.preparePages({ caseId: prefix, pages: texts.map((text, index) => ({ id: `page-${index}`, text })) })
      if (count === 2)
        pages.urls['page-1'] = pages.urls['page-0']
      const steps: ExecutionWorkProposal['steps'] = []
      for (const [index, path] of paths.entries()) {
        steps.push({ id: `open-${index}`, capabilityId: 'tool.browser_open_url', input: { url: pages.urls[`page-${index}`] }, dependsOn: index ? [`save-${index - 1}`] : [], acceptanceCriterionIds: [] })
        steps.push({ id: `read-${index}`, capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: [`open-${index}`], acceptanceCriterionIds: [] })
        steps.push({ id: `save-${index}`, capabilityId: 'tool.filesystem_write_file', input: { path }, inputBindings: [{ parameter: 'content', stepId: `read-${index}`, path: ['content'] }], dependsOn: [`read-${index}`], acceptanceCriterionIds: [`bytes-${index}`] })
      }
      await admit(prefix, `Copy ${count} independently requested pages to their current owned targets`)
      const accepted = await work.propose({ cardId: 'alice', turnId: prefix, goal: `Copy ${count} independently requested pages to their current owned targets`, criteria: paths.map((path, index) => ({ id: `bytes-${index}`, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: digest(texts[index]) } })), steps })
      await life.settle({ cardId: 'alice', turnId: prefix, status: 'completed' })
      const proof = await completed(accepted.planId, accepted.rootThreadId)
      const originals = await Promise.all(paths.map(async (path, index) => {
        assert.equal(await readFile(path, 'utf8'), texts[index])
        return { path, text: texts[index], mtimeMs: (await stat(path)).mtimeMs }
      }))
      checks.push({ name: `${prefix}-native-byte-source`, pages: count, proof })
      return { accepted, originals, urls: Object.values(pages.urls) }
    }
    async function unchanged(originals: Array<{ path: string, text: string, mtimeMs: number }>) {
      for (const file of originals) {
        assert.equal(await readFile(file.path, 'utf8'), file.text)
        assert.equal((await stat(file.path)).mtimeMs, file.mtimeMs)
      }
    }
    async function use(candidate: Awaited<ReturnType<typeof repository.get>>, prefix: string, count: number, invalid = false) {
      const routes = procedurePageRoutes(candidate.template)!
      assert.equal(routes.length, count)
      const texts = routes.map((_, index) => `Current independent ${prefix} page ${index} 中文🙂`)
      const actualTexts = [...texts]
      if (invalid)
        actualTexts[1] = 'Actual second page changed after the method was evaluated'
      const pages = await browser.preparePages({ caseId: prefix, pages: routes.map((route, index) => ({ id: route.urlParameter, text: actualTexts[index] })) })
      const paths = routes.map((_, index) => join(root, `${prefix}-${index}.txt`))
      const arguments_: Record<string, unknown> = {}
      for (const [index, route] of routes.entries()) {
        arguments_[route.urlParameter] = pages.urls[route.urlParameter]
        arguments_[route.pathParameter] = paths[index]
        arguments_[route.hashParameter] = digest(texts[index])
      }
      const goal = `Use the evaluated ${count}-page method with fresh current inputs`
      const mapping = routes.map((route, index) => ({ page: index + 1, navigationStep: route.openStepId, writeStep: route.writeStepId, criterion: `result${index + 1}`, url: arguments_[route.urlParameter], path: arguments_[route.pathParameter], sha256: arguments_[route.hashParameter] }))
      await admit(prefix, `Use id=${candidate.id}、version=${candidate.version}。映射：${JSON.stringify(mapping)}。调用 life_use_learned_procedure，goal必须为 ${goal}。`)
      const proposed = structuredClone(arguments_)
      for (const route of routes) {
        proposed[route.urlParameter] = `${proposed[route.urlParameter]}-transposed`
        proposed[route.hashParameter] = 'f'.repeat(64)
      }
      await assert.rejects(() => learned.use({ cardId: 'alice', turnId: prefix, id: candidate.id, version: candidate.version, goal, arguments: proposed }), /literal content must be prepared/u)
      assert.equal(work.isActive(), false)
      const prepared = await learned.prepareInput({ cardId: 'alice', turnId: prefix, input: { id: candidate.id, version: candidate.version, goal, arguments: Object.entries(proposed).map(([name, value]) => ({ name, value })) }, signal: controller.signal })
      assert.equal(prepared.projection?.fields.length, count * 2)
      const current = prepared.input as { arguments: Array<{ name: string, value: unknown }> }
      const restored = Object.fromEntries(current.arguments.map(entry => [entry.name, entry.value]))
      assert.deepEqual(restored, arguments_)
      const result = await learned.use({ cardId: 'alice', turnId: prefix, id: candidate.id, version: candidate.version, goal, arguments: restored })
      await life.settle({ cardId: 'alice', turnId: prefix, status: 'completed' })
      if (!invalid) {
        const proof = await completed(result.planId, result.rootThreadId)
        for (const [index, path] of paths.entries()) assert.equal(await readFile(path, 'utf8'), texts[index])
        checks.push({ name: prefix, pages: count, proof, hashes: texts.map(digest), literalMappingRestored: true, directUnpreparedUseRefused: true })
      }
      return { result, arguments_, paths, actualTexts }
    }
    for (const count of [2, 4]) {
      const original = await source(count, `source-${count}`)
      const candidateId = await learned.capture(original.accepted.rootThreadId)
      const candidate = await repository.get(candidateId)
      const document = procedureSkillSource(candidate, registry)
      for (const privateValue of [...original.urls, ...original.originals.flatMap(file => [file.path, file.text]), browser.binding.id])
        assert.ok(!document.includes(privateValue))
      await assert.rejects(() => loader.activate(candidate.id, candidate.version))
      assert.equal(await learned.evaluate(candidateId), 'passed', JSON.stringify(await repository.list()))
      const evaluated = (await repository.list()).find(item => item.candidate.version === candidate.version)!.evaluation!
      assert.equal(evaluated.evaluatorVersion, 'browser-procedure-replay-v2')
      assert.equal(evaluated.cases.length, 6 + count * 2)
      assert.ok(evaluated.cases.every(item => item.passed))
      await assert.rejects(() => repository.recordEvaluation({ ...evaluated, evaluatorVersion: 'browser-procedure-replay-v1' }))
      checks.push({ name: `independent-${count}-page-evaluation`, evaluation: evaluated })
      await loader.activate(candidate.id, candidate.version)
      for (const round of [1, 2, 3]) {
        await use(candidate, `fresh-${count}-${round}`, count)
        await unchanged(original.originals)
      }
      const failed = await use(candidate, `invalid-${count}`, count, true)
      const deadline = Date.now() + 15000
      while (Date.now() < deadline && (work.isActive() || !(await repository.list()).find(item => item.candidate.version === candidate.version)?.repair))
        await new Promise(resolve => setTimeout(resolve, 20))
      const degraded = (await repository.list()).find(item => item.candidate.version === candidate.version)!
      assert.equal(degraded.sourceValid, false)
      assert.equal(degraded.repair?.reason, 'acceptance-not-satisfied')
      assert.equal(degraded.repair.sourcePlanId, failed.result.planId)
      assert.notEqual((await db.readLifeState({ executionPlanId: failed.result.planId })).obligations.find(item => item.threadId === failed.result.rootThreadId)?.status, 'fulfilled')
      for (const [index, path] of failed.paths.entries()) assert.equal(await readFile(path, 'utf8'), failed.actualTexts[index])
      await assert.rejects(() => learned.use({ cardId: 'alice', turnId: `invalid-${count}`, id: candidate.id, version: candidate.version, goal: 'Do not replay a failed method', arguments: failed.arguments_ }))
      checks.push({ name: `changed-second-page-downgrades-${count}-page-method`, repair: degraded.repair })
      const corrected = await source(count, `corrected-source-${count}`)
      const repairedId = await learned.capture(corrected.accepted.rootThreadId)
      const repaired = await repository.get(repairedId)
      assert.equal(repaired.id, candidate.id)
      assert.notEqual(repaired.version, candidate.version)
      await assert.rejects(() => loader.activate(repaired.id, repaired.version))
      assert.equal(await learned.evaluate(repairedId), 'passed')
      await loader.activate(repaired.id, repaired.version)
      for (const round of [1, 2, 3]) {
        await use(repaired, `repaired-${count}-${round}`, count)
        await unchanged(original.originals)
        await unchanged(corrected.originals)
      }
      await learned.withdraw(repaired.id, repaired.version)
      assert.equal((await repository.list()).find(item => item.candidate.version === repaired.version)?.sourceValid, false)
      assert.equal((await loader.projectProduction()).length, 0)
      checks.push({ name: `withdrawn-${count}-page-method-has-no-authority` })
    }
    assert.deepEqual(errors, [])
    return { passed: true, checks, scope: 'Actual owned Electron DOM for two and four independently verified pages, dedicated10/14-case evaluation, activation, three fresh uses, second-page failure downgrade, fresh repaired source and evaluation, three repaired uses and withdrawal. Development module integration in an exact packaged host; no release or product UI acceptance is inferred.' }
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
