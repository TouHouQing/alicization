import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash } from 'node:crypto'
import { readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-atomic-restart-/u)
assert.equal((await realpath(dirname(profile))).toLowerCase(), (await realpath(tmpdir())).toLowerCase())
assert.ok(root.startsWith(resolve('output') + sep))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.equal(report.passed, true)
assert.equal(report.originalProfileBytesUnchanged, true)
assert.equal(report.phases.length, 3)
assert.ok(report.phases.every((phase: { passed: boolean, shutdown: { completed: boolean, exitCode: number } }) => phase.passed && phase.shutdown.completed && phase.shutdown.exitCode === 0))
assert.equal(report.atomicRequirementExperiences.length, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
try {
  const results = []
  for (const experience of report.atomicRequirementExperiences) {
    assert.equal(experience.completed, true)
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const plan = view.execution?.plans.find(item => item.id === experience.planId)
    const goal = view.obligations.find(item => item.id === experience.obligationId)
    assert.ok(plan && goal)
    assert.equal(plan.revision, 3)
    assert.equal(goal.generation, 2)
    assert.equal(goal.status, 'fulfilled')
    assert.ok(goal.verification)
    assert.equal(goal.verification?.independent, true)
    assert.equal(goal.verification.verdict, 'satisfied')
    assert.equal(plan.steps.length, 25)
    assert.equal(plan.acceptanceHash, experience.revisedContractHash)
    const contract = view.execution!.contracts.find(item => item.contractHash === plan.acceptanceHash)!
    assert.equal(contract.criteria.length, 24)
    const allEffects = (await Promise.all(view.execution!.slices.filter(item => item.planId === plan.id).map(slice => database.readLifeTurnExecutionEffects(slice.ingressId)))).flat()
    const unique = [...new Map(allEffects.map(effect => [effect.id, effect])).values()]
    const writes = unique.filter(effect => effect.payload.capabilityId === 'tool.filesystem_write_file')
    assert.equal(writes.length, 24, 'Native restart must not repeat any of the first seventeen writes')
    for (const file of experience.preserved) {
      assert.equal(await readFile(file.path, 'utf8'), file.text)
      assert.equal((await stat(file.path)).mtimeMs, file.mtimeMs)
      assert.equal(writes.filter(effect => (effect.payload.parameters as Record<string, unknown>).path === file.path && effect.status === 'settled' && effect.receipt?.outcome === 'success').length, 1)
    }
    for (const file of experience.unfinished) {
      assert.equal(await readFile(file.target, 'utf8'), file.text)
      assert.equal(await stat(file.path).then(() => true, () => false), false)
      assert.ok(contract.criteria.some(item => 'path' in item.predicate && item.predicate.path === file.target && item.predicate.kind === 'file-bytes' && item.predicate.sha256 === sha256(file.text)))
      assert.equal(writes.filter(effect => (effect.payload.parameters as Record<string, unknown>).path === file.target && effect.status === 'settled' && effect.receipt?.outcome === 'success').length, 1)
    }
    const feedback = (await Promise.all(plan.sourceEvidenceRefs.map(id => database.getLifeIngress(id)))).find(item => item?.source === 'execution-criteria-change')
    assert.ok(feedback)
    assert.equal(feedback.payload.generation, 2)
    assert.equal(feedback.payload.planRevision, 2)
    assert.equal((feedback.payload.changedSteps as unknown[]).length, 7)
    if (experience.graphRevision) {
      const graph = experience.graphRevision
      assert.ok(!plan.steps.some(step => step.id === graph.removedStepId))
      const added = plan.steps.find(step => step.id === graph.addedStepId)
      assert.ok(added)
      assert.deepEqual([...added.dependsOn].sort(), [graph.previousDependency, graph.additionalDependency].sort())
      assert.equal(await stat(graph.obsoleteTarget).then(() => true, () => false), false)
      assert.equal(writes.filter(effect => (effect.payload.parameters as Record<string, unknown>).path === graph.obsoleteTarget).length, 0)
      assert.deepEqual(feedback.payload.graphChanges && {
        inserted: (feedback.payload.graphChanges as { inserted: { stepId: string }[] }).inserted.map(item => item.stepId),
        removed: (feedback.payload.graphChanges as { removed: string[] }).removed,
        dependencies: (feedback.payload.graphChanges as { dependencies: string[] }).dependencies,
      }, { inserted: [graph.addedStepId], removed: [graph.removedStepId], dependencies: [graph.addedStepId] })
    }

    results.push({ round: experience.round, planId: plan.id, obligationId: goal.id, independentlyFulfilled: true, generation: goal.generation, revision: plan.revision, mutationEffects: writes.length, retainedWrites: 17, revisedWrites: 7, atomicFeedbackId: feedback.id })
  }
  await writeFile(join(root, 'atomic-requirements-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, results }, null, 2), { flag: 'wx' })
}
finally { await database.close() }
