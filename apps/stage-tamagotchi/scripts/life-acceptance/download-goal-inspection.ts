import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash } from 'node:crypto'
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { verifyExecutionDownload } from '../../src/main/services/alicization/execution/download-goal-verifier'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
if (!basename(profile).startsWith('alicization-life-product-regression-') || await realpath(dirname(profile)) !== await realpath(tmpdir()) || !root.startsWith(`${resolve('output')}\\`))
  throw new Error('Download inspection requires its stopped synthetic profile and output')
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.equal(report.downloadGoalExperiences?.length, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
const results = []
try {
  for (const experience of report.downloadGoalExperiences) {
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const goal = view.obligations.find(item => item.id === experience.obligationId && item.summary === experience.goal)
    const contract = goal?.proof.acceptance
    const predicate = contract?.criteria.find(item => item.id === 'download')?.predicate
    assert.equal(goal?.status, 'fulfilled')
    assert.equal(goal?.verification?.independent, !experience.hostReviewed)
    assert.equal(predicate?.kind, 'browser-download')
    if (!goal || !contract || predicate?.kind !== 'browser-download')
      throw new Error('The original download responsibility is missing')
    const result = await verifyExecutionDownload({ database, view, contract, predicate })
    assert.equal(result.verdict, 'satisfied')
    assert.equal(result.evidence.actualHash, experience.expectedHash)
    assert.equal(result.evidence.bytes, experience.bytes)
    const actual = await readFile(String(result.evidence.path))
    assert.equal(createHash('sha256').update(actual).digest('hex'), experience.expectedHash)
    const plan = view.execution!.plans.find(item => item.id === experience.planId)!
    assert.equal(plan.revision, experience.criteriaRevised ? 2 : 1)
    assert.equal(goal.generation, experience.criteriaRevised ? 2 : 1)
    assert.equal(experience.networkTransfers, 1)
    results.push({ obligationId: goal.id, planId: plan.id, revision: plan.revision, transferId: result.evidence.transferId, actualHash: result.evidence.actualHash, bytes: actual.length })
  }
  await writeFile(join(root, 'download-goals-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'three-real-managed-downloads-and-current-goal-proof', results }, null, 2))
}
finally { await database.close() }
