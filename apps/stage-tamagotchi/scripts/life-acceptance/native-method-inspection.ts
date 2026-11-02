import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash } from 'node:crypto'
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { createProcedureCandidateRepository } from '../../src/main/services/alicization/execution/procedure-candidate-repository'
import { createCanonicalToolRegistry } from '../../src/main/services/alicization/turn-os/tool-registry'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.ok(basename(profile).startsWith('alicization-life-product-regression-') && await realpath(dirname(profile)) === await realpath(tmpdir()) && root.startsWith(`${resolve('output')}${sep}`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.equal(report.shutdown?.completed, true)
assert.equal(report.shutdown.exitCode, 0)
const experiences = report.nativeMethodExperiences as Array<{ goal: string, targetPath: string, text: string, sha256: string, windowTitle: string, saveLabel: string }>
const menus = report.nativeMenuExperiences as Array<{ goal: string, planId: string, obligationId: string, marker: string, windowTitle: string }>
assert.equal(experiences.length, 4)
assert.equal(new Set(experiences.map(item => item.targetPath)).size, 4)
assert.equal(menus.length, 3)
assert.equal(report.nativeMenuFixtureClosure?.normalExit, true)
assert.equal(report.nativeMenuFixtureClosure?.nativeJobTreeStopped, true)
assert.equal(report.nativeMethodFixtureClosures?.length, 4)
assert.ok(report.nativeMethodFixtureClosures.every((item: { nativeJobTreeStopped: boolean }) => item.nativeJobTreeStopped))
const identity = report.nativeMethodIdentity as { id: string, version: string }
assert.match(identity.id, /^skill\.learned_[a-f\d]{24}$/u)
assert.match(identity.version, /^[a-f\d]{64}$/u)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const repository = createProcedureCandidateRepository(database, 'default', createCanonicalToolRegistry({ platform: 'win32' }))
  const item = (await repository.list()).find(item => item.candidate.id === identity.id && item.candidate.version === identity.version)
  assert.ok(item)
  assert.ok(item.evaluation)
  assert.equal(item.evaluation.status, 'passed')
  assert.equal(item.evaluation.cases.length, 10)
  assert.ok(item.evaluation.cases.every(item => item.passed))
  assert.equal(item.sourceValid, false)
  assert.equal(await repository.getAvailable(item.candidateId), null)
  assert.ok(await database.hasWithdrawnLifeEvidence([{ cardId: 'default', kind: 'execution-procedure', id: item.candidateId, version: identity.version }]))
  const strings: string[] = []
  const queue: unknown[] = [item.candidate.template]
  while (queue.length) {
    const value = queue.pop()
    if (typeof value === 'string')
      strings.push(value)
    else if (value && typeof value === 'object')
      queue.push(...Object.values(value))
  }
  for (const value of [experiences[0].text, experiences[0].targetPath, experiences[0].windowTitle, experiences[0].saveLabel])
    assert.ok(!strings.some(text => text.includes(value)), 'The learned template retained a private example')
  const deliveries = []
  for (const [index, experience] of experiences.entries()) {
    assert.ok(resolve(experience.targetPath).startsWith(`${root}${sep}`))
    const view = await database.readLifeState()
    const goal = view.obligations.find(goal => goal.summary === experience.goal)
    assert.ok(goal)
    assert.equal(goal.status, 'fulfilled')
    assert.equal(goal.verification?.independent, true)
    if (index > 0)
      assert.deepEqual(goal.procedureSource, { candidateId: item.candidateId, version: identity.version })
    const bytes = await readFile(experience.targetPath)
    const actualHash = createHash('sha256').update(bytes).digest('hex')
    assert.equal(bytes.toString('utf8'), experience.text)
    assert.equal(actualHash, experience.sha256)
    assert.ok(goal.proof.acceptance?.criteria.some(criterion => criterion.predicate.kind === 'file-bytes' && resolve(criterion.predicate.path) === resolve(experience.targetPath) && criterion.predicate.sha256 === actualHash))
    deliveries.push({ goalId: goal.id, sha256: actualHash, independent: true })
  }
  const refusals = []
  for (const experience of menus) {
    assert.ok(resolve(experience.marker).startsWith(`${root}${sep}`))
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const plan = view.execution!.plans.find(plan => plan.id === experience.planId)!
    assert.ok(plan && plan.revision === 2 && plan.rootObligationId === experience.obligationId)
    const goal = view.obligations.find(goal => goal.id === experience.obligationId)
    assert.equal(goal?.status, 'cancelled')
    assert.equal(goal?.summary, experience.goal)
    assert.notEqual(item.candidate.source.goalId, goal?.id)
    const fresh = plan.steps.filter(step => step.nativeWindowSourceStepId)
    assert.equal(fresh.length, 1)
    assert.equal(fresh[0].nativeWindowSourceStepId, 'read')
    const effects = (await Promise.all(view.execution!.slices.filter(slice => slice.planId === plan.id).map(slice => database.readLifeTurnExecutionEffects(slice.ingressId)))).flat()
    const clicks = effects.filter(effect => effect.payload.capabilityId === 'tool.desktop_click_element')
    const reads = effects.filter(effect => effect.payload.capabilityId === 'tool.desktop_list_interactables')
    assert.equal(clicks.length, 2)
    assert.equal(reads.length, 2)
    for (const effect of clicks) {
      assert.equal(effect.status, 'settled')
      assert.equal(effect.receipt?.outcome, 'failure')
      const output = effect.receipt!.output as Record<string, unknown>
      assert.equal(output.errorCode, 'WINDOWS_UIA_FOREGROUND_REQUIRED')
      assert.equal(output.effectMayHaveOccurred, false)
      assert.equal(output.sideEffectState, 'none')
    }
    await assert.rejects(readFile(experience.marker), { code: 'ENOENT' })
    refusals.push({ planId: plan.id, obligationId: experience.obligationId, freshRevision: 2, knownNonDispatchedRefusals: clicks.length, independentlyObservedReads: reads.length, cancelled: true })
  }
  await writeFile(join(root, 'native-method-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, candidateId: item.candidateId, evaluationCases: item.evaluation.cases.length, sourceWithdrawn: true, deliveries, refusals }, null, 2), { flag: 'wx' })
}
finally { await database.close() }
