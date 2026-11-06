import assert from 'node:assert/strict'
import process from 'node:process'

import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
if (!basename(profile).startsWith('alicization-life-product-regression-') || await realpath(dirname(profile)) !== await realpath(tmpdir()) || !root.startsWith(`${resolve('output')}\\`))
  throw new Error('Procedure inspection requires its owned synthetic profile and output')
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
const experiences = report.learnedProcedureExperiences
assert.ok(Array.isArray(experiences))
assert.equal(experiences.length, 3)
assert.equal(new Set(experiences.map(experience => experience.goal)).size, 3)
assert.equal(new Set(experiences.map(experience => experience.target)).size, 3)
assert.equal(new Set(experiences.map(experience => experience.marker)).size, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const view = await database.readLifeState()
  const deliveries = []
  for (const experience of experiences) {
    const plan = view.execution?.plans.find(plan => plan.id === experience.planId)
    assert.ok(plan)
    const goal = view.obligations.find(goal => goal.id === plan.rootObligationId)
    assert.ok(goal)
    assert.ok(goal.verification)
    assert.equal(goal?.status, 'fulfilled')
    assert.equal(goal?.verification?.independent, true)
    assert.deepEqual(goal?.procedureSource, { candidateId: `procedure:${experience.version}`, version: experience.version })
    assert.equal(await readFile(experience.target, 'utf8'), experience.marker)
    const candidate = (await database.getLifeIngress(`procedure:${experience.version}`))?.payload.candidate as { template: unknown }
    assert.ok(candidate)
    assert.ok(!JSON.stringify(candidate.template).includes(experience.marker))
    assert.ok(await database.hasWithdrawnLifeEvidence([{ cardId: 'default', kind: 'execution-procedure', id: `procedure:${experience.version}`, version: experience.version }]))
    const lifecycle = view.ingress.find(ingress => ingress.source === 'execution-skill-state')?.payload.snapshot as { items: Array<{ id: string, version: string, activationStatus: string }> }
    assert.ok(lifecycle.items.some(item => item.id === experience.id && item.version === experience.version && item.activationStatus !== 'active'))
    deliveries.push({ goalId: goal.id, source: goal.procedureSource, independent: goal.verification.independent, sourceWithdrawn: true })
  }
  assert.equal(new Set(deliveries.map(delivery => delivery.goalId)).size, 3)
  await writeFile(join(root, 'learned-procedure-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, deliveries }, null, 2))
}
finally { await database.close() }
