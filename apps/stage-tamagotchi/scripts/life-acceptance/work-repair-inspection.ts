import assert from 'node:assert/strict'
import process from 'node:process'

import { readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { isOwnedHostViewport } from './electron-launch.cjs'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}\\`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.equal(report.profile, profile)
assert.ok(report.nativeRuntime.privateDesktopVerified === true || isOwnedHostViewport(report), 'The report must bind its actual owned private or host background runtime')
const shutdownPath = join(root, 'work-repair-shutdown.json')
const shutdown = JSON.parse(await readFile(shutdownPath, 'utf8'))
assert.equal(shutdown.profile, profile)
assert.equal(shutdown.runtimePid, report.nativeRuntime.pid)
assert.ok(shutdown.completed && shutdown.exitCode === 0)
let alive = false
try {
  process.kill(shutdown.runtimePid, 0)
  alive = true
}
catch (error) {
  assert.equal((error as NodeJS.ErrnoException).code, 'ESRCH')
}
assert.equal(alive, false, 'The original writer is still running')
const experiences: Array<{ goal: string, planId: string, obligationId: string, artifact: string, marker: string, correctedSource: string, originalModifiedAt: number, finalModifiedAt: number, baseline: string }> = report.executionRepairExperiences
assert.ok(Array.isArray(experiences))
assert.equal(experiences.length, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const results = []
  for (const experience of experiences) {
    assert.equal(experience.baseline, 'settled-write-observed-in-product-details')
    assert.ok(resolve(experience.artifact).startsWith(`${root}\\`))
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const goal = view.obligations.find(item => item.id === experience.obligationId)
    const plan = view.execution?.plans.find(item => item.id === experience.planId)
    assert.ok(goal && plan)
    assert.equal(goal.summary, experience.goal)
    assert.equal(goal.status, 'fulfilled')
    assert.equal(goal.generation, 1)
    assert.equal(plan.revision, 2)
    assert.equal(plan.rootObligationId, goal.id)
    assert.equal(goal.verification?.independent, true)
    assert.equal(goal.verification?.verdict, 'satisfied')
    assert.equal(await readFile(experience.artifact, 'utf8'), experience.marker)
    assert.equal((await stat(experience.artifact)).mtimeMs, experience.originalModifiedAt)
    assert.equal(experience.finalModifiedAt, experience.originalModifiedAt)
    const effects = (await Promise.all((view.execution?.slices.filter(slice => slice.planId === plan.id) ?? []).map(slice => database.readLifeTurnExecutionEffects(slice.ingressId)))).flat()
    const writes = effects.filter(effect => effect.payload.capabilityId === 'tool.filesystem_write_file' && (effect.payload.parameters as Record<string, unknown>)?.path === experience.artifact)
    assert.equal(writes.length, 1)
    assert.equal(writes[0].status, 'settled')
    assert.equal(writes[0].receipt?.outcome, 'success')
    const written = view.execution?.results.find(item => item.planRevision === 2 && item.stepId === 'write-report')
    assert.equal(written?.state, 'verified')
    assert.equal(written?.effectId, writes[0].id)
    const reads = effects.filter(effect => effect.payload.capabilityId === 'tool.filesystem_read_file' && (effect.payload.parameters as Record<string, unknown>)?.path === experience.correctedSource)
    assert.equal(reads.length, 1)
    assert.equal(reads[0].receipt?.outcome, 'success')
    results.push({ goalId: goal.id, planId: plan.id, revision: plan.revision, originalWriteEffectId: writes[0].id, writeEffects: writes.length, correctedReadEffectId: reads[0].id })
  }
  await writeFile(join(root, 'work-repair-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'three-actual-host-step-repairs-with-one-original-write', results }, null, 2))
}
finally { await database.close() }
