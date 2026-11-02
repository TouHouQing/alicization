import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash } from 'node:crypto'
import { readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { inspectBrowserProcedureRepair } from './browser-procedure-repair-inspection'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}\\`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
const source = report.browserProcedureSource
const experiences: Array<{ id: string, version: string, goal: string, target: string, marker: string, url: string, sha256: string }> = report.browserProcedureExperiences
assert.ok(source)
assert.equal(experiences.length, 3)
assert.equal(new Set(experiences.map(item => item.url)).size, 3)
assert.equal(new Set(experiences.map(item => item.target)).size, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
const digest = (text: string) => createHash('sha256').update(text).digest('hex')
try {
  const view = await database.readLifeState()
  const candidate = (await database.getLifeIngress(`procedure:${source.version}`))?.payload.candidate as { template: unknown, source: { threadId: string, verificationId: string } }
  assert.ok(candidate)
  const sourceGoal = view.obligations.find(item => item.summary === source.sourceGoal)
  assert.equal(sourceGoal?.status, 'fulfilled')
  assert.equal(sourceGoal?.verification?.independent, true)
  assert.equal(candidate.source.threadId, sourceGoal!.threadId)
  assert.equal(candidate.source.verificationId, sourceGoal!.verification!.id)
  for (const privateValue of [source.sourceUrl, source.sourcePath, source.marker])
    assert.ok(!JSON.stringify(candidate.template).includes(privateValue))
  assert.equal(digest(await readFile(source.sourcePath, 'utf8')), source.sha256)
  assert.equal((await stat(source.sourcePath)).mtimeMs, source.mtimeMs)
  const index = view.ingress.find(item => item.source === 'execution-procedure-index')?.payload.index as { items: Array<{ candidateId: string, evaluationId: string }> }
  const entry = index.items.find(item => item.candidateId === `procedure:${source.version}`)
  assert.ok(entry)
  const evaluation = (await database.getLifeIngress(entry.evaluationId))?.payload.evaluation as { candidateHash: string, status: string, evaluatorVersion: string, cases: Array<{ name: string, passed: boolean }> }
  assert.equal(evaluation.candidateHash, source.version)
  assert.equal(evaluation.evaluatorVersion, 'browser-procedure-replay-v1')
  assert.equal(evaluation.status, 'passed')
  assert.deepEqual(evaluation.cases.map(item => item.name).sort(), ['different-input-1', 'different-input-2', 'page-changed', 'page-missing', 'invalid-arguments', 'interface-change', 'cancellation'].sort())
  assert.ok(evaluation.cases.every(item => item.passed))
  const deliveries = []
  for (const experience of experiences) {
    const goal = view.obligations.find(item => item.summary === experience.goal)
    assert.equal(goal?.status, 'fulfilled')
    assert.equal(goal?.verification?.independent, true)
    assert.deepEqual(goal?.procedureSource, { candidateId: `procedure:${experience.version}`, version: experience.version })
    const thread = await database.getTaskThread(goal!.threadId!)
    const planId = thread?.metadata?.workPlanId
    assert.equal(typeof planId, 'string')
    const current = await database.readLifeState({ executionPlanId: planId as string })
    const plan = current.execution!.plans.find(plan => plan.id === planId)!
    assert.ok(plan.browserBinding)
    const results = current.execution!.results.filter(result => result.planId === plan.id && result.state === 'verified')
    assert.equal(results.length, 3)
    const reads = []
    let writes = 0
    for (const result of results) {
      const effect = await database.getLifeEffect(result.effectId!)
      assert.equal(effect?.status, 'settled')
      assert.equal(effect?.receipt?.outcome, 'success')
      if (effect!.payload.capabilityId === 'tool.filesystem_write_file')
        writes++
      if (effect!.payload.capabilityId === 'tool.browser_read_page')
        reads.push(effect!.receipt!.output as { content: string, url: string })
    }
    assert.equal(writes, 1)
    assert.equal(reads.length, 1)
    assert.equal(reads[0].content, experience.marker)
    assert.equal(reads[0].url, experience.url)
    assert.equal(digest(await readFile(experience.target, 'utf8')), experience.sha256)
    deliveries.push({ goalId: goal!.id, verificationId: goal!.verification!.id, independent: true, writes, page: experience.url, targetHash: experience.sha256 })
  }
  assert.ok(await database.hasWithdrawnLifeEvidence([{ cardId: 'default', kind: 'execution-procedure', id: `procedure:${source.version}`, version: source.version }]))
  const lifecycle = view.ingress.find(ingress => ingress.source === 'execution-skill-state')?.payload.snapshot as { items: Array<{ id: string, version: string, activationStatus: string }> }
  assert.ok(lifecycle.items.some(item => item.id === source.id && item.version === source.version && item.activationStatus !== 'active'))
  if (report.browserProcedureFailure)
    await inspectBrowserProcedureRepair(database, view, report, root)
  await writeFile(join(root, 'browser-procedure-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, evaluatorVersion: evaluation.evaluatorVersion, evaluationCases: evaluation.cases, deliveries, sourceWithdrawn: true, sourceFileUnchanged: true }, null, 2))
}
finally {
  await database.close()
}
