import type { WindowsProcessJobOutcome } from '../../src/main/services/alicization/execution/windows-process-job'

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
const experiences = report.delegatedWorkExperiences as Array<{ round: number, mode: string, goal: string, completed: boolean, planId: string, obligationId: string, artifact: string, starts: string, content: string, processReceipt: string, processNonce: string, requestSha256: string, requestChars: number, approvals: Array<{ allowed: boolean, requestId: string }>, processStop?: { originalProcessEnded: boolean, parentPid: number, pid: number }, hostTakeover?: { effectId: string, decisionId: string } }>
assert.equal(experiences.length, 9)
assert.equal(new Set(experiences.map(item => item.planId)).size, 9)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const threads = await database.listTaskThreads({ limit: 100 })
  const deliveries = []
  for (const experience of experiences) {
    assert.equal(experience.completed, true)
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const plan = view.execution?.plans.find(item => item.id === experience.planId)
    assert.ok(plan)
    assert.equal(plan.steps.length, 1)
    assert.equal(plan.revision, experience.mode === 'revise' ? 2 : 1)
    const requests = await Promise.all(plan.sourceEvidenceRefs.map(id => database.getLifeUserInput(id)))
    assert.ok(requests.some(request => typeof request?.content === 'string' && request.content.length === experience.requestChars && createHash('sha256').update(request.content).digest('hex') === experience.requestSha256))
    const goal = view.obligations.find(item => item.id === experience.obligationId)
    assert.equal(goal?.summary, experience.goal)
    const children = threads.filter(thread => (thread.metadata?.workStepParent as Record<string, unknown> | undefined)?.planId === plan.id)
    assert.equal(children.length, 1, 'Denied proposals never start a second child')
    const child = children[0]
    assert.equal(view.obligations.some(goal => goal.threadId === child.id), false, 'A delegated child must not create a second independent duty')
    const parent = child.metadata!.workStepParent as Record<string, unknown>
    assert.equal(parent.cardId, view.cardId)
    assert.equal(parent.rootObligationId, goal!.id)
    assert.equal(parent.rootThreadId, plan.rootThreadId)
    assert.equal(parent.planRevision, plan.revision)
    assert.equal(parent.capabilityId, 'coding_agent.cli')
    assert.equal(parent.approvalRef, experience.approvals.findLast(item => item.allowed)!.requestId)
    assert.equal(await readFile(experience.starts, 'utf8'), 'started\n')
    const effect = await database.getLifeEffect(String(parent.effectId))
    assert.ok(effect)
    // The main writer admits the native HMAC receipt before persisting this
    // event. Match its exact child responsibility and the independently
    // written fixture receipt; a direct-ppid assumption misses the supervisor.
    const processReceipt = JSON.parse(await readFile(experience.processReceipt, 'utf8'))
    assert.equal(processReceipt.nonce, experience.processNonce)
    assert.ok(Number.isSafeInteger(processReceipt.pid) && processReceipt.pid > 0)
    assert.equal(await realpath(processReceipt.executable), await realpath(process.execPath))
    const events = await database.listExecutionEvents({ threadId: child.id, limit: 100 })
    const terminal = events.filter(event => event.kind === (experience.mode === 'cancel' ? 'cancel' : 'result') && event.payload?.adapter === 'cli' && event.payload?.processTree)
    assert.equal(terminal.length, 1)
    const tree = terminal[0].payload!.processTree as WindowsProcessJobOutcome
    assert.equal(tree.treeStopped, true)
    assert.equal(tree.dispatchRefused, false)
    assert.equal(tree.receipt?.treeStopped, true)
    assert.equal(tree.receipt?.activeProcesses, 0)
    assert.equal(tree.receipt?.started, true)
    assert.equal(tree.receipt?.errorCode, null)
    assert.equal(tree.receipt?.version, 1)
    assert.equal(tree.receipt?.kind, 'result')
    assert.equal(tree.receipt?.reason, experience.mode === 'cancel' ? 'stopped' : 'completed')
    assert.equal(tree.receipt?.exitCode, experience.mode === 'cancel' ? 130 : 0)
    assert.equal(tree.receipt?.parentPid, report.nativeRuntime.pid)
    assert.equal(tree.receipt?.guardPid, processReceipt.parentPid)
    assert.equal(tree.receipt?.rootPid, processReceipt.pid)
    assert.notEqual(tree.receipt!.guardPid, report.nativeRuntime.pid)
    assert.ok(tree.receipt!.observedAt >= processReceipt.startedAt)
    assert.match(tree.receipt!.nonce, /^[a-f0-9]{64}$/u)
    assert.match(tree.receipt!.bindingHash, /^[a-f0-9]{64}$/u)
    assert.ok((await realpath(tree.journalRoot)).startsWith(`${await realpath(join(profile, 'alicizations', 'execution-native'))}\\`))
    if (experience.mode === 'cancel') {
      assert.equal(goal!.status, 'cancelled')
      assert.equal(child.status, 'cancelled')
      assert.equal(experience.processStop?.originalProcessEnded, true)
      assert.equal(experience.processStop?.parentPid, tree.receipt!.guardPid)
      assert.equal(experience.processStop?.pid, tree.receipt!.rootPid)
      assert.equal(experience.hostTakeover?.effectId, effect.id)
      assert.equal(effect.status, 'failed')
      assert.equal(effect.receipt?.outcome, 'host-taken-over')
      const takeover = effect.receipt!.hostTakeover as { independent: boolean, decisionId: string, originalReceiptId: string }
      assert.equal(takeover.independent, false)
      assert.equal(takeover.decisionId, experience.hostTakeover!.decisionId)
      const original = await database.getLifeIngress(takeover.originalReceiptId)
      assert.equal(original?.status, 'settled')
      assert.equal((original?.payload.output as Record<string, unknown> | undefined)?.sideEffectState, 'unknown')
      assert.equal(await stat(experience.artifact).catch(() => null), null)
    }
    else {
      assert.equal(goal!.status, 'fulfilled')
      assert.equal(goal!.verification?.independent, true)
      assert.equal(goal!.verification?.verdict, 'satisfied')
      assert.equal(child.status, 'completed')
      assert.equal(effect.status, 'settled')
      assert.equal(effect.receipt?.outcome, 'success')
      assert.equal(await readFile(experience.artifact, 'utf8'), experience.content)
    }
    deliveries.push({ round: experience.round, mode: experience.mode, planId: plan.id, childThreadId: child.id, rootStatus: goal!.status, effectStatus: effect.status, actualApprovals: experience.approvals.length, actualProcessStarts: 1, processTree: { parentPid: tree.receipt!.parentPid, guardPid: tree.receipt!.guardPid, rootPid: tree.receipt!.rootPid, treeStopped: true, activeProcesses: 0, nonce: tree.receipt!.nonce, bindingHash: tree.receipt!.bindingHash } })
  }
  await writeFile(join(root, 'delegated-work-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'Nine actual model/UI plans: three completion, three denied/edit/review, three running cancellation; exact persisted lineage and file bytes. No physical desktop input or final-package claim.', deliveries }, null, 2))
}
finally { await database.close() }
