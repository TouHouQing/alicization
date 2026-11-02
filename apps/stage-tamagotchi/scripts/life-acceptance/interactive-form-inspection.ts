import type { ProcedureCandidate, ProcedureEvaluation } from '../../src/main/services/alicization/execution/procedure-candidate-repository'

import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash } from 'node:crypto'
import { readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}\\`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
const uploading = process.env.LIFE_PRODUCT_UPLOAD_METHOD === '1'
assert.equal(report.format, uploading ? 'life-upload-method-product-v1' : 'life-interactive-form-method-product-v1')
assert.equal(report.browserProcedureExperiences.length, 3)
assert.equal(report.browserProcedureRepairedExperiences.length, 3)
assert.equal(report.interactiveFormReceipts.length, 9)
const digest = (text: string) => createHash('sha256').update(text).digest('hex')
const cases = ['different-input-1', 'different-input-2', 'invalid-arguments', 'interface-change', 'cancellation', 'page-changed', 'page-missing', 'control-missing', 'control-ambiguous', 'submission-refused']
if (uploading)
  cases.push('upload-changed-bytes')
function stringLeaves(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]
  if (Array.isArray(value))
    return value.flatMap(stringLeaves)
  if (value && typeof value === 'object')
    return Object.values(value).flatMap(stringLeaves)
  return []
}
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const view = await database.readLifeState()
  const sources = [report.browserProcedureSource, report.browserProcedureRepairSource]
  assert.equal(sources[0].id, sources[1].id)
  assert.notEqual(sources[0].version, sources[1].version)
  const index = view.ingress.find(item => item.source === 'execution-procedure-index')!.payload.index as { items: Array<{ candidateId: string, evaluationId: string }> }
  const evaluations = []
  for (const source of sources) {
    const candidate = (await database.getLifeIngress(`procedure:${source.version}`))!.payload.candidate as ProcedureCandidate
    assert.equal(candidate.version, source.version)
    const goal = view.obligations.find(item => item.summary === source.sourceGoal)!
    assert.equal(goal.status, 'fulfilled')
    assert.equal(goal.verification?.independent, true)
    assert.equal(candidate.source.threadId, goal.threadId)
    assert.equal(candidate.source.verificationId, goal.verification!.id)
    for (const privateValue of [source.sourceUrl, source.sourcePath, source.marker, ...source.fields.flatMap((field: { label: string, text: string }) => [field.label, field.text])])
      assert.ok(stringLeaves(candidate.template).every(value => !value.includes(privateValue)))
    if (uploading) {
      for (const file of source.files) {
        assert.ok(stringLeaves(candidate.template).every(value => ![file.path, file.name, file.content].some(text => value.includes(text))))
        assert.equal(digest(await readFile(file.path, 'utf8')), file.sha256)
      }
    }
    assert.equal(digest(await readFile(source.sourcePath, 'utf8')), source.sha256)
    assert.equal((await stat(source.sourcePath)).mtimeMs, source.mtimeMs)
    const entry = index.items.find(item => item.candidateId === `procedure:${source.version}`)!
    const evaluation = (await database.getLifeIngress(entry.evaluationId))!.payload.evaluation as ProcedureEvaluation
    assert.equal(evaluation.candidateHash, source.version)
    assert.equal(evaluation.evaluatorVersion, uploading ? 'browser-upload-replay-v1' : 'browser-interaction-replay-v1')
    assert.equal(evaluation.status, 'passed')
    assert.deepEqual(evaluation.cases.map(item => item.name).sort(), [...cases].sort())
    assert.ok(evaluation.cases.every(item => item.passed))
    if (source.version === report.browserProcedureRepairSource.version) {
      const comparison = evaluation.comparison
      assert.ok(comparison)
      assert.equal(comparison.baselineHash, report.browserProcedureSource.version)
      assert.equal(comparison.baselineEvaluation.candidateHash, report.browserProcedureSource.version)
      assert.ok(['improved', 'non-regressing'].includes(comparison.verdict))
      assert.equal(comparison.baseline.length, 2)
      assert.equal(comparison.candidate.length, 2)
      assert.deepEqual(comparison.baseline.map(sample => sample.inputHash), comparison.candidate.map(sample => sample.inputHash))
      assert.ok(comparison.candidate.every(sample => sample.fulfilled && sample.operations === candidate.template.steps.length && sample.rework === 0))
    }
    assert.ok(await database.hasWithdrawnLifeEvidence([{ cardId: 'default', kind: 'execution-procedure', id: `procedure:${source.version}`, version: source.version }]))
    evaluations.push({ version: source.version, evaluatorVersion: evaluation.evaluatorVersion, cases: evaluation.cases })
  }
  const experiences = [...report.browserProcedureExperiences, ...report.browserProcedureRepairedExperiences]
  const all = [...experiences, report.browserProcedureFailure]
  const deliveries = []
  for (const experience of all) {
    const failed = experience === report.browserProcedureFailure
    const goal = view.obligations.find(item => item.summary === experience.goal)!
    if (failed) {
      assert.notEqual(goal.status, 'fulfilled')
    }
    else {
      assert.equal(goal.status, 'fulfilled')
      assert.equal(goal.verification?.independent, true)
    }
    assert.deepEqual(goal.procedureSource, { candidateId: `procedure:${experience.version}`, version: experience.version })
    const thread = await database.getTaskThread(goal.threadId!)
    const planId = thread!.metadata!.workPlanId as string
    const current = await database.readLifeState({ executionPlanId: planId })
    const plan = current.execution!.plans.find(item => item.id === planId)!
    assert.equal(plan.steps.length, 10)
    assert.ok(plan.browserBinding)
    const results = current.execution!.results.filter(result => result.planId === planId && result.state === 'verified').sort((left, right) => plan.steps.findIndex(step => step.id === left.stepId) - plan.steps.findIndex(step => step.id === right.stepId))
    assert.equal(new Set(results.map(result => result.stepId)).size, 10)
    assert.equal(results.length, 10)
    const counts = { writes: 0, types: 0, uploads: 0, clicks: 0, waits: 0, reads: 0, receipts: 0 }
    for (const result of results) {
      const effect = (await database.getLifeEffect(result.effectId!))!
      assert.equal(effect.status, 'settled')
      assert.equal(effect.receipt?.outcome, 'success')
      const input = effect.payload.parameters as Record<string, unknown>
      const output = effect.receipt!.output as Record<string, unknown>
      if (effect.payload.capabilityId === 'tool.filesystem_write_file') {
        counts.writes++
        assert.equal(input.content, experience.marker)
      }
      if (effect.payload.capabilityId === 'tool.browser_type_text') {
        assert.equal(input.clearExisting, true)
        assert.equal(input.text, experience.fields[counts.types].text)
        counts.types++
      }
      if (effect.payload.capabilityId === 'tool.browser_upload_files') {
        assert.equal(uploading, true)
        counts.uploads++
        assert.deepEqual(input.files, experience.files.map((file: { path: string }) => file.path))
        assert.equal(output.serverReceiptVerified, false)
        assert.equal(output.requiresReadback, true)
        assert.equal(typeof output.selectionId, 'string')
        assert.deepEqual(output.files, experience.files.map(({ name, bytes, sha256 }: { name: string, bytes: number, sha256: string }) => ({ name, bytes, sha256 })))
      }
      if (effect.payload.capabilityId === 'tool.browser_click_element')
        counts.clicks++
      if (effect.payload.capabilityId === 'tool.browser_wait')
        counts.waits++
      if (effect.payload.capabilityId === 'tool.browser_read_page') {
        counts.reads++
        if (input.format === 'text') {
          counts.receipts++
          assert.equal(output.content, experience.marker)
          assert.equal(output.url, experience.url)
        }
      }
    }
    assert.deepEqual(counts, { writes: 1, types: uploading ? 1 : 2, uploads: uploading ? 1 : 0, clicks: 1, waits: 1, reads: 4, receipts: 1 })
    assert.equal(digest(await readFile(experience.target, 'utf8')), experience.sha256)
    const received = report.interactiveFormReceipts.find((item: { url: string }) => item.url === experience.formUrl)!
    assert.equal(received.posts, 1)
    assert.equal(received.accepted, 1)
    assert.equal(received.refused, 0)
    assert.equal(received.observedText, experience.marker)
    if (uploading) {
      assert.deepEqual(received.receivedFiles, [[experience.files.map(({ name, bytes, sha256 }: { name: string, bytes: number, sha256: string }) => ({ name, bytes, sha256 }))]])
      assert.equal(received.windowClosure.closed, true)
      assert.equal(received.windowClosure.exactUrl, experience.url)
      for (const file of experience.files)
        assert.equal(digest(await readFile(file.path, 'utf8')), file.sha256)
    }
    deliveries.push({ goalId: goal.id, planId, independent: goal.verification?.independent, failed, counts, posts: received.posts, targetHash: experience.sha256 })
  }
  const failure = report.browserProcedureFailure
  const incident = (await database.getLifeIngress(`procedure-failure:${failure.version}`))!
  assert.equal(incident.source, 'execution-procedure-failure')
  assert.equal(incident.status, 'settled')
  const repair = incident.payload.repair as { sourcePlanId: string, reason: string }
  assert.equal(repair.sourcePlanId, failure.planId)
  assert.equal(repair.reason, 'acceptance-not-satisfied')
  assert.notEqual(failure.sha256, failure.requiredHash)
  const lifecycle = view.ingress.find(ingress => ingress.source === 'execution-skill-state')!.payload.snapshot as { items: Array<{ id: string, version: string, activationStatus: string }> }
  assert.ok(sources.every(source => lifecycle.items.some(item => item.id === source.id && item.version === source.version && item.activationStatus !== 'active')))
  await writeFile(join(root, 'browser-procedure-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, evaluations, deliveries, actualFormPosts: report.interactiveFormReceipts.map((item: { route: string, posts: number, accepted: number }) => ({ route: item.route, posts: item.posts, accepted: item.accepted })), bothVersionsWithdrawn: true, sourceFileUnchanged: true }, null, 2), { flag: 'wx' })
}
finally {
  await database.close()
}
