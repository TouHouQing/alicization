import assert from 'node:assert/strict'
import process from 'node:process'

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
const experiences: Array<{ goal: string, planId: string, obligationId: string, originalContractHash: string, artifact: string, marker: string, originalModifiedAt: number, finalModifiedAt: number }> = report.executionCriteriaExperiences
assert.equal(experiences.length, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const results = []
  for (const experience of experiences) {
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const goal = view.obligations.find(item => item.id === experience.obligationId)
    const plan = view.execution?.plans.find(item => item.id === experience.planId)
    assert.ok(goal && plan)
    assert.equal(goal.summary, experience.goal)
    assert.equal(goal.generation, 2)
    assert.equal(goal.status, 'fulfilled')
    assert.ok(goal.verification)
    assert.equal(goal.verification.independent, true)
    assert.equal(goal.verification.verdict, 'satisfied')
    assert.equal(plan.rootObligationId, goal.id)
    assert.equal(plan.revision, 3)
    assert.notEqual(plan.acceptanceHash, experience.originalContractHash)
    assert.ok(goal.proof.acceptance)
    assert.equal(goal.proof.acceptance.criteria.length, 2)
    assert.equal(goal.proof.acceptance.criteria.filter(item => item.predicate.kind === 'file-bytes').length, 1)
    const written = view.execution?.results.find(item => item.planRevision === 3 && item.stepId === 'write-report')
    assert.ok(written)
    assert.equal(written.state, 'verified')
    assert.ok(written.effectId)
    const effect = await database.getLifeEffect(written.effectId)
    assert.ok(effect)
    assert.equal(effect.status, 'settled')
    const parameters = effect.payload.parameters as Record<string, unknown>
    assert.equal(parameters.path, experience.artifact)
    assert.equal(effect.receipt?.outcome, 'success')
    assert.equal(await readFile(experience.artifact, 'utf8'), experience.marker)
    assert.equal((await stat(experience.artifact)).mtimeMs, experience.originalModifiedAt)
    assert.equal(experience.finalModifiedAt, experience.originalModifiedAt)
    const effects = (await Promise.all((view.execution?.slices.filter(slice => slice.planId === plan.id) ?? []).map(slice => database.readLifeTurnExecutionEffects(slice.ingressId)))).flat()
    assert.equal(effects.filter(effect => effect.payload.capabilityId === 'tool.filesystem_write_file' && (effect.payload.parameters as Record<string, unknown>)?.path === experience.artifact).length, 1)
    results.push({ goalId: goal.id, planId: plan.id, generation: goal.generation, revision: plan.revision, independent: true, originalWriteEffectId: written.effectId })
  }
  await writeFile(join(root, 'criteria-revision-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'three-host-revised-acceptance-and-unfinished-workflows', results }, null, 2))
}
finally { await database.close() }
