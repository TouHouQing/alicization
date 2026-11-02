import assert from 'node:assert/strict'
import process from 'node:process'

import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}\\`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
const experiences: Array<{ goal: string, artifact: string, marker: string, ungrantedText: string, reconnected: boolean }> = report.browserAccessExperiences
assert.equal(experiences.length, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const results = []
  for (const experience of experiences) {
    const initial = await database.readLifeState()
    const goal = initial.obligations.find(goal => goal.summary === experience.goal)
    assert.ok(goal)
    const planId = initial.execution?.plans.find(plan => plan.rootObligationId === goal.id)?.id
    assert.ok(planId)
    const view = await database.readLifeState({ executionPlanId: planId })
    const plan = view.execution?.plans.find(plan => plan.id === planId)
    assert.ok(plan)
    assert.equal(goal.status, 'fulfilled')
    assert.equal(goal.verification?.independent, true)
    assert.equal(goal.verification?.verdict, 'satisfied')
    assert.equal(plan.steps.length, experience.reconnected ? 7 : 6)
    assert.equal(plan.revision, experience.reconnected ? 2 : 1)
    assert.equal(plan.browserBinding?.kind, 'authorized-page')
    assert.ok(plan.steps.every(step => step.capabilityId.startsWith('tool.browser_')))
    assert.equal(await readFile(experience.artifact, 'utf8'), experience.marker)
    for (const step of plan.steps) {
      const result = view.execution?.results.find(result => result.stepId === step.id && result.inputHash === step.inputHash && result.planRevision === plan.revision)
      assert.ok(result)
      assert.equal(result.state, 'verified')
      assert.ok(result.effectId)
      const effect = await database.getLifeEffect(result.effectId)
      assert.ok(effect)
      assert.equal(effect.status, 'settled')
      assert.equal(effect.receipt?.outcome, 'success')
      const output = effect.receipt?.output as Record<string, unknown>
      assert.equal(output.browser, 'authorized-page')
      assert.ok(!JSON.stringify(output).includes(experience.ungrantedText))
      if (step.capabilityId === 'tool.browser_type_text' || step.capabilityId === 'tool.browser_click_element')
        assert.equal(output.inputMode, 'trusted-cdp')
      if (step.id === 'read-result')
        assert.ok(String(output.text).includes('已保存留言'))
    }
    results.push({ goalId: goal.id, planId, independent: goal.verification.independent, browserOnlySteps: plan.steps.length, serverReceipt: experience.artifact })
  }
  await writeFile(join(root, 'authorized-browser-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'three-owned-authenticated-fixture-browser-workflows', results }, null, 2))
}
finally { await database.close() }
