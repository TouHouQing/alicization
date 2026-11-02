import type { AlicizationDbService } from '../../src/main/services/alicization/db'
import type { ProcedureEvaluation } from '../../src/main/services/alicization/execution/procedure-candidate-repository'
import type { LifeStateView } from '../../src/shared/life-contracts'

import assert from 'node:assert/strict'

import { createHash } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const digest = (text: string) => createHash('sha256').update(text).digest('hex')

/** Read-only original journals and native files; no inferred success from UI labels. */
export async function inspectBrowserProcedureRepair(database: AlicizationDbService, view: LifeStateView, report: Record<string, any>, root: string) {
  const failure = report.browserProcedureFailure
  const source = report.browserProcedureRepairSource
  const uses = report.browserProcedureRepairedExperiences as Array<{ goal: string, target: string, marker: string, url: string, sha256: string, version: string }>
  assert.ok(failure && source)
  assert.equal(uses.length, 3)
  const incident = await database.getLifeIngress(`procedure-failure:${failure.version}`)
  assert.equal(incident?.source, 'execution-procedure-failure')
  assert.equal(incident?.status, 'settled')
  assert.equal(incident?.payload.candidateId, `procedure:${failure.version}`)
  const repair = incident!.payload.repair as { sourcePlanId: string, sourceThreadId: string, reason: string, evidenceHash: string, verificationId: string }
  assert.equal(repair.reason, 'acceptance-not-satisfied')
  assert.equal(repair.sourcePlanId, failure.planId)
  assert.match(repair.evidenceHash, /^[a-f\d]{64}$/u)
  const failedGoal = view.obligations.find(item => item.id === failure.obligationId)
  assert.equal(failedGoal?.threadId, repair.sourceThreadId)
  assert.notEqual(failedGoal?.status, 'fulfilled')
  assert.equal(failedGoal?.invalidatedBy?.kind, 'execution-procedure')
  assert.equal(digest(await readFile(failure.target, 'utf8')), failure.actualHash)
  assert.notEqual(failure.actualHash, failure.requiredHash)
  const failedView = await database.readLifeState({ executionPlanId: failure.planId })
  const failedResults = failedView.execution!.results.filter(item => item.planId === failure.planId && item.state === 'verified')
  assert.equal(failedResults.length, 3)
  const failedRead = await database.getLifeEffect(failedResults.find(item => failedView.execution!.plans.find(plan => plan.id === failure.planId)!.steps.find(step => step.id === item.stepId)?.capabilityId === 'tool.browser_read_page')!.effectId!)
  assert.equal((failedRead?.receipt?.output as { content: string }).content, failure.actual)
  assert.ok(await database.hasWithdrawnLifeEvidence([{ cardId: 'default', kind: 'execution-procedure', id: `procedure:${failure.version}`, version: failure.version }]))
  assert.notEqual(source.version, failure.version)
  assert.equal(source.previousVersion, failure.version)
  const candidate = (await database.getLifeIngress(`procedure:${source.version}`))?.payload.candidate as { version: string, template: unknown, source: { threadId: string, verificationId: string } }
  assert.equal(candidate.version, source.version)
  const sourceGoal = view.obligations.find(item => item.summary === source.sourceGoal)
  assert.equal(sourceGoal?.status, 'fulfilled')
  assert.equal(sourceGoal?.verification?.independent, true)
  assert.equal(candidate.source.threadId, sourceGoal?.threadId)
  assert.equal(candidate.source.verificationId, sourceGoal?.verification?.id)
  for (const privateValue of [source.marker, source.sourceUrl, source.sourcePath])
    assert.ok(!JSON.stringify(candidate.template).includes(privateValue))
  assert.equal(digest(await readFile(source.sourcePath, 'utf8')), source.sha256)
  assert.equal((await stat(source.sourcePath)).mtimeMs, source.mtimeMs)
  const index = view.ingress.find(item => item.source === 'execution-procedure-index')?.payload.index as { items: Array<{ candidateId: string, evaluationId: string }> }
  const entry = index.items.find(item => item.candidateId === `procedure:${source.version}`)
  assert.ok(entry)
  const evaluation = (await database.getLifeIngress(entry.evaluationId))?.payload.evaluation as ProcedureEvaluation
  const comparison = evaluation.comparison
  assert.ok(comparison)
  assert.equal(comparison.baselineHash, failure.version)
  assert.equal(comparison.baselineEvaluation.candidateHash, failure.version)
  assert.equal(comparison.baselineCandidateId, `procedure:${failure.version}`)
  assert.ok(['improved', 'non-regressing'].includes(comparison.verdict))
  assert.equal(comparison.baseline.length, 2)
  assert.equal(comparison.candidate.length, 2)
  assert.deepEqual(comparison.baseline.map(sample => sample.inputHash), comparison.candidate.map(sample => sample.inputHash))
  assert.ok(comparison.candidate.every(sample => sample.fulfilled && sample.operations === 3 && sample.rework === 0))
  assert.equal(evaluation.candidateHash, source.version)
  assert.equal(evaluation.evaluatorVersion, 'browser-procedure-replay-v1')
  assert.equal(evaluation.status, 'passed')
  assert.deepEqual(evaluation.cases.map(item => item.name).sort(), ['different-input-1', 'different-input-2', 'page-changed', 'page-missing', 'invalid-arguments', 'interface-change', 'cancellation'].sort())
  assert.ok(evaluation.cases.every(item => item.passed))
  const deliveries = []
  for (const use of uses) {
    const goal = view.obligations.find(item => item.summary === use.goal)
    assert.equal(goal?.status, 'fulfilled')
    assert.equal(goal?.verification?.independent, true)
    assert.deepEqual(goal?.procedureSource, { candidateId: `procedure:${source.version}`, version: source.version })
    const thread = await database.getTaskThread(goal!.threadId!)
    const planId = thread?.metadata?.workPlanId as string
    const current = await database.readLifeState({ executionPlanId: planId })
    const results = current.execution!.results.filter(item => item.planId === planId && item.state === 'verified')
    assert.equal(results.length, 3)
    let writes = 0
    for (const result of results) {
      const effect = await database.getLifeEffect(result.effectId!)
      assert.equal(effect?.status, 'settled')
      assert.equal(effect?.receipt?.outcome, 'success')
      if (effect!.payload.capabilityId === 'tool.filesystem_write_file')
        writes++
      if (effect!.payload.capabilityId === 'tool.browser_read_page') {
        assert.equal((effect!.receipt!.output as { content: string }).content, use.marker)
        assert.equal((effect!.receipt!.output as { url: string }).url, use.url)
      }
    }
    assert.equal(writes, 1)
    assert.equal(digest(await readFile(use.target, 'utf8')), use.sha256)
    deliveries.push({ goalId: goal!.id, verificationId: goal!.verification!.id, independent: true, writes, targetHash: use.sha256 })
  }
  assert.ok(await database.hasWithdrawnLifeEvidence([{ cardId: 'default', kind: 'execution-procedure', id: `procedure:${source.version}`, version: source.version }]))
  await writeFile(join(root, 'browser-procedure-repair-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, failure: { planId: failure.planId, verificationId: repair.verificationId, evidenceHash: repair.evidenceHash, actualHash: failure.actualHash, requiredHash: failure.requiredHash }, newVersion: source.version, evaluationCases: evaluation.cases, deliveries, oldAndNewVersionsInactiveAtEnd: true }, null, 2))
}
