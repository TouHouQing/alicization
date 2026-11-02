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
const experiences = report.longWorkExperiences as Array<{ goal: string, completed: boolean, modelRequestUsed: boolean, planId: string, obligationId: string, indexPath: string, indexText: string, requestSha256: string, requestChars: number, files: Array<{ source: string, target: string, content: string, sourceMtimeMs: number }> }>
assert.equal(experiences.length, 3)
assert.equal(new Set(experiences.map(item => item.planId)).size, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const deliveries = []
  for (const experience of experiences) {
    assert.equal(experience.completed, true)
    assert.equal(experience.modelRequestUsed, true)
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const plan = view.execution?.plans.find(item => item.id === experience.planId)
    assert.equal(plan?.steps.length, 21)
    const requests = await Promise.all(plan!.sourceEvidenceRefs.map(id => database.getLifeUserInput(id)))
    assert.ok(requests.some(request => typeof request?.content === 'string' && request.content.length === experience.requestChars && createHash('sha256').update(request.content).digest('hex') === experience.requestSha256), 'The persisted current request must retain its exact pre-send bytes')
    const goal = view.obligations.find(item => item.id === experience.obligationId)
    assert.equal(goal?.summary, experience.goal)
    assert.equal(goal?.status, 'fulfilled')
    assert.equal(goal?.verification?.independent, true)
    assert.equal(goal?.verification?.verdict, 'satisfied')
    const results = view.execution!.results.filter(item => item.planId === experience.planId && item.planRevision === plan!.revision)
    assert.equal(results.length, 21)
    assert.equal(results.every(item => item.state === 'verified' && item.effectId), true)
    assert.equal(new Set(results.map(item => item.effectId)).size, 21)
    const effects = await Promise.all(results.map(item => database.getLifeEffect(item.effectId!)))
    assert.ok(effects.every(effect => effect?.status === 'settled' && effect.receipt?.outcome === 'success'))
    assert.equal(new Set(effects.map(effect => effect!.turnId)).size, 2, 'The sixteen-step window must yield into a second real work ingress')
    assert.equal(await readFile(experience.indexPath, 'utf8'), experience.indexText)
    for (const file of experience.files) {
      assert.equal(await readFile(file.source, 'utf8'), file.content)
      assert.equal((await stat(file.source)).mtimeMs, file.sourceMtimeMs)
      assert.equal(await readFile(file.target, 'utf8'), file.content)
    }
    deliveries.push({ planId: plan!.id, rootObligationId: goal!.id, steps: results.length, workIngresses: [...new Set(effects.map(effect => effect!.turnId))], independentlyVerified: true })
  }
  await writeFile(join(root, 'long-work-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'Three actual model/UI twenty-one-step tasks, two durable work windows each; backend restart acceptance is separate.', deliveries }, null, 2))
}
finally { await database.close() }
