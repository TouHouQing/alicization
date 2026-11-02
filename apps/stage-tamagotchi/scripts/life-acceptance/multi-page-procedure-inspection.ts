import type { ProcedureCandidate, ProcedureEvaluation } from '../../src/main/services/alicization/execution/procedure-candidate-repository'
import type { ExecutionCriterion, WorkInputBinding, WorkStep, WorkStepResult } from '../../src/shared/execution-contracts'

import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash } from 'node:crypto'
import { readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

interface FileEvidence { url: string, path: string, marker: string, expectedHash: string, sha256: string, mtimeMs?: number }
interface Experience { id: string, version: string, goal: string, planId: string, obligationId: string, files: FileEvidence[] }

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(resolve('output') + sep))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
const data = report.multiPageProcedure as { count: number, original: Experience, repaired: Experience, failure: Experience, uses: Experience[], repairedUses: Experience[] }
assert.ok(data && [2, 4].includes(data.count))
assert.equal(data.uses.length, 3)
assert.equal(data.repairedUses.length, 3)
const allFiles = [data.original, data.repaired, data.failure, ...data.uses, ...data.repairedUses].flatMap(item => item.files)
assert.equal(new Set(allFiles.map(file => file.path)).size, data.count * 9)
assert.equal(data.original.id, data.repaired.id)
assert.notEqual(data.original.version, data.repaired.version)
const db = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
async function inspectPlan(experience: Experience, satisfied: boolean, procedure: boolean) {
  const view = await db.readLifeState({ executionPlanId: experience.planId })
  const goal = view.obligations.find(item => item.id === experience.obligationId)
  const plan = view.execution?.plans.find(item => item.id === experience.planId)
  assert.ok(goal && plan)
  assert.equal(goal.summary, experience.goal)
  if (satisfied) {
    assert.equal(goal.verification?.independent, true)
    assert.equal(goal.verification.verdict, 'satisfied')
  }
  else {
    assert.equal(goal.verification, null)
    assert.equal(goal.invalidatedBy?.kind, 'execution-procedure')
  }
  assert.equal(goal.status === 'fulfilled', satisfied)
  if (procedure)
    assert.deepEqual(goal.procedureSource, { candidateId: `procedure:${experience.version}`, version: experience.version })
  assert.equal(plan.steps.length, data.count * 3)
  const results = view.execution!.results.filter(item => item.planId === plan.id && item.planRevision === plan.revision && item.state === 'verified')
  assert.equal(results.length, data.count * 3)
  const effects = await Promise.all(results.map(item => db.getLifeEffect(item.effectId!)))
  assert.ok(effects.every(effect => effect?.status === 'settled' && effect.receipt?.outcome === 'success'))
  const reads = results.filter(item => plan.steps.find(step => step.id === item.stepId)?.capabilityId === 'tool.browser_read_page')
  const writes = effects.filter(effect => effect!.payload.capabilityId === 'tool.filesystem_write_file')
  assert.equal(reads.length, data.count)
  assert.equal(writes.length, data.count)
  assert.equal(experience.files.length, data.count)
  const rootPath = await realpath(root)
  const contract = view.execution!.contracts.find(item => item.contractHash === plan.acceptanceHash)
  assert.ok(contract)
  for (const file of experience.files) {
    const rel = relative(rootPath, await realpath(file.path))
    assert.ok(!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))
    assert.equal(digest(await readFile(file.path, 'utf8')), file.sha256)
    const criterion: ExecutionCriterion | undefined = contract.criteria.find(item => item.predicate.kind === 'file-bytes' && item.predicate.path === file.path)
    assert.ok(criterion?.required && criterion.predicate.kind === 'file-bytes')
    assert.equal(criterion.predicate.sha256, file.expectedHash)
    if (satisfied)
      assert.equal(file.expectedHash, file.sha256)
    if (file.mtimeMs !== undefined)
      assert.equal((await stat(file.path)).mtimeMs, file.mtimeMs)
    const writers = writes.filter(effect => (effect!.payload.parameters as Record<string, unknown>).path === file.path)
    assert.equal(writers.length, 1)
    const writeResult: WorkStepResult | undefined = results.find(result => result.effectId === writers[0]!.id)
    const writeStep: WorkStep | undefined = plan.steps.find(step => step.id === writeResult?.stepId)
    assert.equal(writeStep?.inputBindings?.length, 1)
    const binding: WorkInputBinding = writeStep!.inputBindings![0]
    assert.equal(binding.parameter, 'content')
    assert.deepEqual(binding.path, ['content'])
    const read: WorkStepResult | undefined = reads.find(result => result.stepId === binding.stepId)
    assert.ok(read, 'Each output must bind its own actual browser-read result, including equal-URL sources')
    const effect = await db.getLifeEffect(read.effectId!)
    const output = effect!.receipt!.output as { url: string, content: string }
    assert.equal(output.url, file.url)
    assert.equal(output.content, file.marker)
  }
  return { goal, plan, proof: { goalId: goal.id, planId: plan.id, verificationId: goal.verification?.id ?? null, pages: reads.length, writes: writes.length, independent: true, satisfied } }
}
async function inspectSource(experience: Experience) {
  assert.ok(experience.files.every(file => typeof file.mtimeMs === 'number' && file.mtimeMs > 0))
  const result = await inspectPlan(experience, true, false)
  const candidate = (await db.getLifeIngress(`procedure:${experience.version}`))?.payload.candidate as ProcedureCandidate
  assert.ok(candidate)
  assert.equal(candidate.version, experience.version)
  assert.equal(candidate.source.threadId, result.goal.threadId)
  assert.equal(candidate.source.verificationId, result.goal.verification!.id)
  for (const file of experience.files) {
    for (const value of [file.url, file.path, file.marker, file.sha256]) assert.ok(!JSON.stringify(candidate.template).includes(value))
  }
  const view = await db.readLifeState({ executionPlanId: experience.planId })
  const index = view.ingress.find(item => item.source === 'execution-procedure-index')?.payload.index as { items: Array<{ candidateId: string, evaluationId: string }> }
  const entry = index.items.find(item => item.candidateId === `procedure:${experience.version}`)
  assert.ok(entry)
  const evaluation = (await db.getLifeIngress(entry.evaluationId))?.payload.evaluation as ProcedureEvaluation
  assert.equal(evaluation.candidateHash, experience.version)
  assert.equal(evaluation.evaluatorVersion, 'browser-procedure-replay-v2')
  assert.equal(evaluation.status, 'passed')
  const expected = ['different-input-1', 'different-input-2', 'invalid-arguments', 'interface-change', 'cancellation', 'page-results-swapped', ...Array.from({ length: data.count }, (_, index) => [`page-${index + 1}-changed`, `page-${index + 1}-missing`]).flat()]
  assert.deepEqual(evaluation.cases.map(item => item.name).sort(), expected.sort())
  assert.ok(evaluation.cases.every(item => item.passed))
  return { ...result.proof, evaluationCases: evaluation.cases.length }
}
try {
  const original = await inspectSource(data.original)
  const repaired = await inspectSource(data.repaired)
  const firstUses = await Promise.all(data.uses.map(item => inspectPlan(item, true, true).then(result => result.proof)))
  const repairedUses = await Promise.all(data.repairedUses.map(item => inspectPlan(item, true, true).then(result => result.proof)))
  const failed = await inspectPlan(data.failure, false, true)
  assert.notEqual(data.failure.files[1].expectedHash, data.failure.files[1].sha256)
  const incident = await db.getLifeIngress(`procedure-failure:${data.original.version}`)
  assert.equal(incident?.status, 'settled')
  assert.equal(incident.source, 'execution-procedure-failure')
  const repair = incident.payload.repair as { sourcePlanId: string, reason: string, verificationId: string, evidenceHash: string }
  assert.equal(repair.sourcePlanId, failed.plan.id)
  assert.equal(repair.reason, 'acceptance-not-satisfied')
  assert.match(repair.verificationId, /^.+$/u)
  assert.match(repair.evidenceHash, /^[a-f\d]{64}$/u)
  for (const version of [data.original.version, data.repaired.version])
    assert.ok(await db.hasWithdrawnLifeEvidence([{ cardId: 'default', kind: 'execution-procedure', id: `procedure:${version}`, version }]))
  await writeFile(join(root, 'multi-page-procedure-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, pages: data.count, original, repaired, firstUses, repairedUses, independentlyRejectedFailure: { ...failed.proof, originalNegativeVerificationId: repair.verificationId, evidenceHash: repair.evidenceHash }, oldAndNewVersionsInactive: true }, null, 2), { flag: 'wx' })
}
finally { await db.close() }
