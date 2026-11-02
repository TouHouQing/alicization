import assert from 'node:assert/strict'
import process from 'node:process'

import { mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { createLifeTurnRuntime } from '../../src/main/services/alicization/life-turn-runtime'

const profile = resolve(process.argv[2] ?? await mkdtemp(join(tmpdir(), 'alicization-life-product-regression-host-fixture-')))
const reportRoot = resolve(process.argv[3] ?? 'output/execution-host-control-fixture-20261021')
if (!basename(profile).startsWith('alicization-life-product-regression-') || await realpath(dirname(profile)) !== await realpath(tmpdir()) || (!reportRoot.startsWith(`${resolve('output')}/`) && !reportRoot.startsWith(`${resolve('output')}\\`)))
  throw new Error('Recovery fixtures require an owned synthetic Temp profile and workspace output')
const verifying = process.argv[4] === '--verify'
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: verifying })
const artifacts: Array<{ path: string, content: string, goal: string, effectId: string }> = []
try {
  if (verifying) {
    const fixture = JSON.parse(await readFile(join(reportRoot, 'host-recovery-fixture.json'), 'utf8')) as { profile: string, artifacts: typeof artifacts }
    assert.equal(fixture.profile, profile)
    const view = await database.readLifeState()
    for (const artifact of fixture.artifacts) {
      const effect = await database.getLifeEffect(artifact.effectId)
      assert.equal(effect?.status, 'failed')
      assert.equal(effect?.receipt?.outcome, 'host-taken-over')
      assert.deepEqual((effect?.receipt?.output as Record<string, unknown>).sideEffectState, 'unknown')
      const decision = effect?.receipt?.hostTakeover as { independent: boolean, originalReceiptId: string, decisionId: string }
      assert.equal(decision.independent, false)
      assert.equal((await database.getLifeIngress(decision.decisionId))?.source, 'execution-host-takeover')
      assert.equal((await database.getLifeIngress(decision.originalReceiptId))?.payload.outcome, 'interrupted')
      assert.equal(view.obligations.find(goal => goal.summary === artifact.goal)?.status, 'cancelled')
      assert.equal(await readFile(artifact.path, 'utf8'), artifact.content)
      artifacts.push(artifact)
    }
  }
  else {
    if ((await database.readLifeState()).effects.length)
      throw new Error('Recovery fixture refuses an existing life history')
    const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getEffect: database.getLifeEffect, getIngress: database.getLifeIngress, now: Date.now })
    for (let round = 1; round <= 3; round++) {
      const turnId = `qa-legacy-${round}`
      const effectId = `qa-legacy-effect-${round}`
      const goal = `QA 旧版中断任务 ${round}`
      const path = join(reportRoot, `legacy-partial-${round}.txt`)
      const content = `Synthetic pre-existing partial bytes ${round}`
      await writeFile(path, content, { flag: 'wx' })
      await life.admit({ cardId: 'default', turnId, conversationId: 'qa-legacy', messages: [{ role: 'user', content: goal }] }, new AbortController().signal)
      await database.upsertTaskThread({ id: `qa-legacy-task-${round}`, turnId, goal, status: 'planned', kind: 'mixed' })
      await database.commitLifeState({ cardId: 'default', operationKey: effectId, changes: [], mutations: [
        { type: 'effect-prepare', effect: { id: effectId, operationKey: effectId, kind: 'execute', turnId, actionId: 'write', generation: 0, payload: { capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'An unobserved full report' } } } },
        { type: 'effect-transition', id: effectId, expected: 'prepared', status: 'claimed' },
        { type: 'effect-transition', id: effectId, expected: 'claimed', status: 'dispatched' },
        { type: 'effect-transition', id: effectId, expected: 'dispatched', status: 'uncertain', receipt: { outcome: 'interrupted', output: { ok: false, executionStopped: false, sideEffectState: 'unknown' }, observedAt: Date.now() } },
      ] })
      artifacts.push({ path, content: await readFile(path, 'utf8'), goal, effectId })
    }
  }
}
finally { await database.close() }
await writeFile(join(reportRoot, verifying ? 'host-recovery-after-shutdown.json' : 'host-recovery-fixture.json'), JSON.stringify({ format: verifying ? 'synthetic-host-recovery-inspection-v1' : 'synthetic-host-recovery-fixture-v1', profile, writerClosed: true, ...(verifying ? { passed: true, independentSuccessClaimed: false } : {}), artifacts }, null, 2))
console.info(JSON.stringify({ profile, effects: artifacts.length, writerClosed: true }))
