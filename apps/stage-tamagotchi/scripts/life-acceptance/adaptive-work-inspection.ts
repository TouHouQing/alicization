import type { LifeEffect } from '../../src/shared/life-contracts'

import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash } from 'node:crypto'
import { readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { declaredWorkProposal } from '../../src/main/services/alicization/execution/declared-work-proposal'
import { verifyExecutionFileReadMatch } from '../../src/main/services/alicization/execution/file-read-match-verifier'

function parameters(effect: LifeEffect | null | undefined): Record<string, unknown> {
  const value = effect?.payload.parameters
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-raw-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}\\`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
const experiences = report.adaptiveWorkExperiences as Array<{ goal: string, completed: boolean, planId: string, obligationId: string, requestChars: number, requestSha256: string, missing: string, source: string, sourceMtimeMs: number, preface: string, prefaceContent: string, destination: string, content: string, comparisonSamples: Array<{ pulse: { activity: { id: string, work: { causeId: string, mode: string } } } }> }>
assert.equal(experiences.length, 3)
assert.equal(new Set(experiences.map(item => item.planId)).size, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const deliveries = []
  for (const experience of experiences) {
    assert.equal(experience.completed, true)
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const plan = view.execution?.plans.find(item => item.id === experience.planId)
    assert.ok(plan && plan.revision >= 2, 'A successful task alone cannot prove an adaptive revision')
    const source = await database.getLifeUserInput(plan.sourceEvidenceRefs[0])
    assert.ok(typeof source?.content === 'string')
    assert.equal(source.content.length, experience.requestChars)
    assert.equal(createHash('sha256').update(source.content).digest('hex'), experience.requestSha256)
    assert.equal(declaredWorkProposal(source.content), null, 'The source must be natural language, not an exact literal plan')
    const goal = view.obligations.find(item => item.id === experience.obligationId)
    assert.equal(goal?.status, 'fulfilled')
    assert.equal(goal?.verification?.independent, true)
    assert.equal(goal?.verification?.verdict, 'satisfied')
    const contract = view.execution!.contracts.find(item => item.contractHash === plan.acceptanceHash)
    const copy = contract?.criteria.find(item => item.required && item.predicate.kind === 'file-matches-read' && item.predicate.path === experience.destination)
    assert.ok(contract && copy?.predicate.kind === 'file-matches-read', 'The accepted contract must verify the complete copy, not just contained fragments')
    const copyVerification = await verifyExecutionFileReadMatch({ database, view, contract, predicate: copy.predicate })
    assert.equal(copyVerification.verdict, 'satisfied')
    assert.equal(copyVerification.independent, true)
    assert.equal(copyVerification.evidence.scope, 'observed-source-bytes')
    assert.ok(goal!.summary.includes(experience.goal))
    assert.equal(view.obligations.filter(item => item.threadId === plan.rootThreadId).length, 1, 'The accepted thread must retain exactly one root responsibility')
    assert.equal(experience.comparisonSamples.length, 2)
    for (const sample of experience.comparisonSamples) {
      assert.equal(sample.pulse.activity.id, plan.rootThreadId)
      assert.equal(sample.pulse.activity.work.mode, 'comparing')
      const owner = await database.getLifeIngress(sample.pulse.activity.work.causeId)
      assert.ok(owner?.source === 'work-read-repair' && owner.payload.planId === plan.id && owner.status === 'settled')
    }
    const audits = view.ingress.filter(item => item.source === 'work-read-repair-result' && typeof item.payload.planRevision === 'number' && item.payload.planRevision <= plan.revision && item.payload.acceptanceHash === plan.acceptanceHash && Array.isArray(item.payload.failedReads))
    const ownedAudits = []
    for (const audit of audits) {
      const owner = await database.getLifeIngress(audit.id.replace(/:result$/u, ''))
      if (owner?.source === 'work-read-repair' && owner.payload.planId === plan.id && owner.status === 'settled')
        ownedAudits.push(audit)
    }
    assert.ok(ownedAudits.some(item => item.payload.planRevision === plan.revision))
    const failedIds = [...new Set(ownedAudits.flatMap(audit => (audit.payload.failedReads as Array<{ effectId: string | null }>).flatMap(item => typeof item.effectId === 'string' ? [item.effectId] : [])))]
    const failed = await Promise.all(failedIds.map(id => database.getLifeEffect(id)))
    assert.ok(failed.some(effect => parameters(effect).path === experience.missing && effect?.status === 'settled' && effect.receipt?.outcome === 'failure'))
    const results = view.execution!.results.filter(item => item.planId === plan.id && item.planRevision === plan.revision)
    assert.ok(results.every(item => item.state === 'verified' && item.effectId))
    const writes = view.effects.filter(effect => effect.payload.capabilityId === 'tool.filesystem_write_file' && [experience.preface, experience.destination].includes(String(parameters(effect).path)))
    assert.equal(writes.length, 2, 'Replanning cannot repeat a completed write')
    assert.ok(writes.every(effect => effect.status === 'settled' && effect.receipt?.outcome === 'success'))
    assert.equal(await readFile(experience.source, 'utf8'), experience.content)
    assert.equal((await stat(experience.source)).mtimeMs, experience.sourceMtimeMs)
    assert.equal(await readFile(experience.preface, 'utf8'), experience.prefaceContent)
    assert.equal(await readFile(experience.destination, 'utf8'), experience.content)
    deliveries.push({ planId: plan.id, revision: plan.revision, acceptanceHash: plan.acceptanceHash, rootObligationId: goal!.id, copyCriterionId: copy.id, copyVerification, failedReadIds: failed.filter(effect => effect !== null).map(effect => effect!.id), exactWrites: writes.map(effect => effect.id), independentlyVerified: true })
  }
  await writeFile(join(root, 'adaptive-work-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'Three actual natural-language model/UI tasks, actual failed reads and same-root revisions; no injected life state or tool receipts.', deliveries }, null, 2), { flag: 'wx' })
}
finally { await database.close() }
