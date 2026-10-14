import type { AlicizationMemoryQualityGoldLabelItem } from '@proj-alicization/stage-shared'

import type { LifeMutation } from '../../../shared/life-contracts'
import type { LifePolicyEvaluation } from '../../../shared/life-policy-contracts'
import type { LifeTransaction } from './life-transaction'
import type { AlicizationSelfEvolutionVersionCandidate } from './self-evolution/version-runtime'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

import { applyLifeEffect } from './life-effect-repository'
import { applyLifeGrowth, parseLifeGrowthSnapshot } from './life-growth-repository'
import { assertLifeMemoryEvidence } from './life-memory-evidence'
import { assertLifeBehaviorExamples, lifePersonaEvaluationSchema } from './life-persona-evaluation'
import { replayLifePolicyShadow } from './life-policy-shadow-replay'
import { boundedJson } from './life-transaction'

const digest = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const text = v.pipe(v.string(), v.minLength(1), v.maxLength(4000))
export const lifePolicyEvaluationSchema = v.strictObject({
  format: v.literal('policy-paired-evaluation-v1'),
  candidateId: id,
  candidateHash: digest,
  baseOwnerHash: digest,
  shadowReplay: v.strictObject({ version: v.literal('organic-policy-shadow-replay-v1'), passed: v.boolean(), cases: v.pipe(v.array(v.strictObject({ id, baselineHash: digest, candidateHash: digest, rollbackHash: digest, finite: v.boolean(), rollbackExact: v.boolean(), advisory: v.boolean() })), v.length(11)) }),
  examples: lifePersonaEvaluationSchema.entries.examples,
  contextEvidence: v.pipe(v.array(v.strictObject({ cardId: id, kind: v.literal('memory_facts'), id, version: id })), v.maxLength(32)),
  pairs: v.pipe(v.array(v.strictObject({ goldId: id, goldHash: digest, scenario: text, baseline: text, candidate: text, identityPreserved: v.boolean(), truthfulnessPreserved: v.boolean(), companionshipPreserved: v.boolean(), agencyPreserved: v.boolean(), improved: v.boolean() })), v.minLength(3), v.maxLength(8)),
})
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const fingerprintLifePolicyEvaluation = (value: LifePolicyEvaluation) => hash(v.parse(lifePolicyEvaluationSchema, value))
export const fingerprintLifePolicyCandidate = (candidate: AlicizationSelfEvolutionVersionCandidate) => hash({ id: candidate.id, patch: candidate.patch, sourceEvidence: candidate.sourceEvidence })
export const fingerprintPolicyGold = (gold: Pick<AlicizationMemoryQualityGoldLabelItem, 'id' | 'query' | 'label' | 'assistantReply' | 'expectedMemoryIds' | 'humanConfirmed'>) => hash({ id: gold.id, query: gold.query, label: gold.label, assistantReply: gold.assistantReply, expectedMemoryIds: gold.expectedMemoryIds, humanConfirmed: gold.humanConfirmed })
export const lifePolicyEvaluationPassed = (value: LifePolicyEvaluation) => value.shadowReplay.passed && value.shadowReplay.cases.every(test => test.finite && test.rollbackExact && test.advisory) && value.pairs.every(pair => pair.identityPreserved && pair.truthfulnessPreserved && pair.companionshipPreserved && pair.agencyPreserved) && value.pairs.some(pair => pair.improved)

async function assertSources(tx: LifeTransaction, evaluation: LifePolicyEvaluation) {
  await assertLifeBehaviorExamples(tx, { examples: evaluation.examples, proposalId: evaluation.candidateId }, 'growth')
  for (const ref of evaluation.contextEvidence) {
    await assertLifeMemoryEvidence(tx, ref)
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'growth', ?, '1', 'supports', ?)`, [tx.cardId, ref.kind, ref.id, ref.version, evaluation.candidateId, tx.revision])
  }
  const ids = new Set<string>()
  for (const pair of evaluation.pairs) {
    if (ids.has(pair.goldId))
      throw new Error('Policy evaluation reused one gold case')
    ids.add(pair.goldId)
    const row = await tx.get<{ id: string, query: string, label: AlicizationMemoryQualityGoldLabelItem['label'], assistant_reply: string, expected_memory_ids_json: string, human_confirmed: number }>('SELECT id, query, label, assistant_reply, expected_memory_ids_json, human_confirmed FROM memory_quality_gold_labels WHERE card_id = ? AND id = ?', [tx.cardId, pair.goldId])
    if (!row || row.human_confirmed !== 1 || fingerprintPolicyGold({ id: row.id, query: row.query, label: row.label, assistantReply: row.assistant_reply, expectedMemoryIds: JSON.parse(row.expected_memory_ids_json), humanConfirmed: true }) !== pair.goldHash || pair.scenario !== row.query)
      throw new Error('Policy evaluation needs the exact current human gold case')
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, 'memory_quality_gold_labels', ?, ?, 'growth', ?, '1', 'supports', ?)`, [tx.cardId, pair.goldId, pair.goldHash, evaluation.candidateId, tx.revision])
  }
}

export async function assertLifePolicyActivation(tx: LifeTransaction, candidate: AlicizationSelfEvolutionVersionCandidate, activating: boolean) {
  if (!candidate.pairedEvaluation)
    throw new Error('Policy activation requires an actual paired evaluation')
  const row = await tx.get<{ status: string, receipt_ref_json: string | null }>('SELECT status, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, candidate.pairedEvaluation.id])
  const evaluation = row?.receipt_ref_json ? v.parse(lifePolicyEvaluationSchema, JSON.parse(row.receipt_ref_json)) : null
  if (row?.status !== 'settled' || !evaluation || evaluation.candidateId !== candidate.id || evaluation.candidateHash !== fingerprintLifePolicyCandidate(candidate) || fingerprintLifePolicyEvaluation(evaluation) !== candidate.pairedEvaluation.contentHash || !lifePolicyEvaluationPassed(evaluation))
    throw new Error('Policy candidate differs from its passed evaluation')
  if (activating) {
    const owner = await tx.get<{ content_hash: string }>('SELECT content_hash FROM life_owner_versions WHERE card_id = ? AND owner = \'growth\'', [tx.cardId])
    if (owner?.content_hash !== evaluation.baseOwnerHash)
      throw new Error('Policy baseline changed after evaluation')
  }
  await assertSources(tx, evaluation)
  return evaluation
}

export async function applyLifePolicyEvaluation(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'growth-evaluate' | 'growth-adopt' }>) {
  const owner = await tx.get<{ content_hash: string, payload_ref_json: string }>('SELECT content_hash, payload_ref_json FROM life_owner_versions WHERE card_id = ? AND owner = \'growth\'', [tx.cardId])
  const key = owner ? JSON.parse(owner.payload_ref_json).metaKey : null
  const stored = key ? await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', [key]) : null
  if (!owner || !stored)
    throw new Error('No committed policy candidates')
  const snapshot = parseLifeGrowthSnapshot(stored.value)
  const candidate = snapshot.candidates.find(candidate => candidate.id === (input.type === 'growth-evaluate' ? input.evaluation.candidateId : input.candidateId))
  if (!candidate || candidate.status !== 'shadow' || !candidate.sourceEvidence?.length)
    throw new Error('Only a grounded shadow policy can be evaluated or adopted')
  if (input.type === 'growth-evaluate') {
    const evaluation = v.parse(lifePolicyEvaluationSchema, input.evaluation)
    const baseline = snapshot.candidates.find(item => item.id === snapshot.activeCandidateId && item.status === 'active')?.patch ?? null
    if (JSON.stringify(evaluation.shadowReplay) !== JSON.stringify(v.parse(lifePolicyEvaluationSchema.entries.shadowReplay, replayLifePolicyShadow(candidate.patch, baseline))))
      throw new Error('Policy shadow replay differs from the actual candidate reducer')
    if (evaluation.baseOwnerHash !== owner.content_hash || evaluation.candidateHash !== fingerprintLifePolicyCandidate(candidate))
      throw new Error('Policy changed during paired evaluation')
    await assertSources(tx, evaluation)
    const id = `policy-evaluation:${fingerprintLifePolicyEvaluation(evaluation)}`
    await applyLifeEffect(tx, { type: 'effect-prepare', effect: { id, operationKey: id, kind: 'reflect', turnId: candidate.sourceTurnId, actionId: 'evaluate-policy', generation: 1, payload: { format: evaluation.format, candidateId: candidate.id } } })
    await applyLifeEffect(tx, { type: 'effect-transition', id, expected: 'prepared', status: 'claimed' })
    await applyLifeEffect(tx, { type: 'effect-transition', id, expected: 'claimed', status: 'dispatched' })
    await applyLifeEffect(tx, { type: 'effect-transition', id, expected: 'dispatched', status: 'settled', receipt: evaluation as unknown as Record<string, unknown> })
    return
  }
  if (owner.content_hash !== input.expectedOwnerHash)
    throw new Error('Policy owner changed; reload before adoption')
  candidate.pairedEvaluation = { id: `policy-evaluation:${input.expectedEvaluationHash}`, contentHash: input.expectedEvaluationHash }
  const evaluation = await assertLifePolicyActivation(tx, candidate, true)
  candidate.validation = { ...candidate.validation, replayPassed: true, finalReplayGatePassed: true, productionGoldCoverage: 1, productionGoldSampleCount: evaluation.pairs.length, activationBlockedReasons: candidate.validation.activationBlockedReasons.filter(reason => !['self-evolution:shadow-replay-required', 'self-evolution:paired-evaluation-required', 'self-evolution:final-replay-gate-required', 'self-evolution:production-gold-required'].includes(reason)) }
  if (candidate.validation.activationBlockedReasons.length)
    throw new Error('Policy still has unresolved activation constraints')
  candidate.status = 'active'
  candidate.activatedAt = tx.now
  snapshot.activeCandidateId = candidate.id
  for (const other of snapshot.candidates.filter(other => other.id !== candidate.id && other.status === 'active'))
    other.status = 'rolled-back'
  await applyLifeGrowth(tx, { type: 'growth-save', key, snapshotJson: boundedJson(snapshot), expectedValue: stored.value })
}
