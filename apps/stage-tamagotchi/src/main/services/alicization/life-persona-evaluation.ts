import type { LifeMutation } from '../../../shared/life-contracts'
import type { LifePersonaEvaluation } from '../../../shared/life-persona-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

import { bindLifePersonaProposalEvidence } from './life-persona-evidence'
import { boundedJson } from './life-transaction'
import { personaTrainingExampleContentHash } from './persona-training-dataset-runtime'

const digest = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const text = v.pipe(v.string(), v.minLength(1), v.maxLength(4000))
export const lifePersonaEvaluationSchema = v.strictObject({
  format: v.literal('persona-paired-evaluation-v1'),
  proposalId: v.string(),
  baseHash: digest,
  targetHash: digest,
  examples: v.pipe(v.array(v.strictObject({ id: v.string(), contentHash: digest, sourceId: v.string(), sourceKind: v.picklist(['cleaned-long-term-reflection', 'persona-reinforcement']) })), v.minLength(3), v.maxLength(16)),
  pairs: v.pipe(v.array(v.strictObject({ scenario: text, baseline: text, candidate: text, identityPreserved: v.boolean(), truthfulnessPreserved: v.boolean(), companionshipPreserved: v.boolean(), agencyPreserved: v.boolean(), improved: v.boolean() })), v.minLength(3), v.maxLength(16)),
  reviewedBy: v.nullable(v.literal('human')),
  approved: v.boolean(),
})
export const fingerprintLifePersonaEvaluation = (input: LifePersonaEvaluation) => createHash('sha256').update(JSON.stringify(v.parse(lifePersonaEvaluationSchema, input))).digest('hex')
export function lifePersonaEvaluationPassed(evaluation: LifePersonaEvaluation) {
  return evaluation.pairs.every(pair => pair.identityPreserved && pair.truthfulnessPreserved && pair.companionshipPreserved && pair.agencyPreserved) && evaluation.pairs.some(pair => pair.improved)
}

export async function assertLifePersonaAuthorization(tx: LifeTransaction, proposalId: string, evaluationHash: string, targetHash: string, activating = false) {
  const row = await tx.get<{ status: string, payload_ref_json: string, receipt_ref_json: string | null }>('SELECT status, payload_ref_json, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, proposalId])
  if (!row || row.status === 'cancelled' || !row.receipt_ref_json)
    throw new Error('Persona proposal is absent or its source was withdrawn')
  const evaluation = v.parse(lifePersonaEvaluationSchema, JSON.parse(row.receipt_ref_json))
  if (evaluation.proposalId !== proposalId || evaluation.targetHash !== targetHash || fingerprintLifePersonaEvaluation(evaluation) !== evaluationHash || !lifePersonaEvaluationPassed(evaluation) || !evaluation.approved || evaluation.reviewedBy !== 'human')
    throw new Error('Persona activation requires this exact evaluated and reviewed revision')
  await assertLifeBehaviorExamples(tx, evaluation)
  await bindLifePersonaProposalEvidence(tx, { id: proposalId, payload: JSON.parse(row.payload_ref_json) }, activating ? targetHash : undefined)
  return evaluation
}

export async function assertLifeBehaviorExamples(tx: LifeTransaction, evaluation: Pick<LifePersonaEvaluation, 'examples' | 'proposalId'>, dependentOwner: 'reflection' | 'growth' = 'reflection') {
  const ids = new Set<string>()
  for (const example of evaluation.examples) {
    if (ids.has(example.id))
      throw new Error('Persona evaluation duplicated a behavior example')
    ids.add(example.id)
    const row = await tx.get<{ content_hash: string, source_id: string, source_kind: 'cleaned-long-term-reflection' | 'persona-reinforcement', schema_version: string, behavior_lesson: string, positive_example: string, negative_example: string | null, consent_snapshot_json: string, provenance_json: string | null }>(`SELECT content_hash, source_id, source_kind, schema_version, behavior_lesson, positive_example, negative_example, consent_snapshot_json, provenance_json FROM persona_training_dataset_examples WHERE card_id = ? AND id = ? AND state = 'staged' AND pii_status = 'clear' AND allow_training = 1`, [tx.cardId, example.id])
    const consent = row ? JSON.parse(row.consent_snapshot_json) : null
    const provenance = row?.provenance_json ? JSON.parse(row.provenance_json) : null
    if (!row || row.content_hash !== example.contentHash || row.source_id !== example.sourceId || row.source_kind !== example.sourceKind || consent?.granted !== true || provenance?.kind !== 'working-memory-cleaning')
      throw new Error('Persona evaluation lacks current cleaned and permitted behavior examples')
    if (personaTrainingExampleContentHash({ schemaVersion: row.schema_version, behaviorLesson: row.behavior_lesson, positiveExample: row.positive_example, negativeExample: row.negative_example, sourceKind: row.source_kind }) !== example.contentHash)
      throw new Error('Persona behavior example content changed without its reviewed hash')
    const kind = example.sourceKind === 'cleaned-long-term-reflection' ? 'memory_reflections' : 'persona_reinforcement_events'
    if (await tx.get(`SELECT 1 FROM long_term_memory_tombstones WHERE card_id = ? AND source_id = ? AND source IN (?, 'long_term_memory')`, [tx.cardId, example.sourceId, kind]))
      throw new Error('Persona evaluation example was withdrawn')
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, ?, ?, '1', 'supports', ?)`, [tx.cardId, kind, example.sourceId, example.contentHash, dependentOwner, evaluation.proposalId, tx.revision])
  }
}

export async function applyLifePersonaEvaluation(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'persona-evaluate' | 'persona-review' }>) {
  const row = await tx.get<{ status: string, payload_ref_json: string, receipt_ref_json: string | null }>('SELECT status, payload_ref_json, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, input.proposalId])
  if (!row || row.status !== 'prepared')
    throw new Error('Persona proposal is no longer awaiting evaluation')
  await bindLifePersonaProposalEvidence(tx, { id: input.proposalId, payload: JSON.parse(row.payload_ref_json) })
  let evaluation: LifePersonaEvaluation
  if (input.type === 'persona-evaluate') {
    evaluation = v.parse(lifePersonaEvaluationSchema, input.evaluation)
    const proposal = JSON.parse(row.payload_ref_json)
    if (evaluation.proposalId !== input.proposalId || evaluation.baseHash !== proposal.baseHash || evaluation.targetHash !== proposal.targetHash || evaluation.reviewedBy !== null || evaluation.approved)
      throw new Error('Candidate evaluation has a different identity or fabricated human review')
    if (row.receipt_ref_json)
      throw new Error('Persona evaluation already exists; stage a new revision to reevaluate')
  }
  else {
    evaluation = v.parse(lifePersonaEvaluationSchema, JSON.parse(row.receipt_ref_json ?? 'null'))
    if (fingerprintLifePersonaEvaluation(evaluation) !== input.expectedEvaluationHash)
      throw new Error('Persona evaluation changed before review')
    if (input.approved && !lifePersonaEvaluationPassed(evaluation))
      throw new Error('Persona evaluation did not preserve the required life invariants')
    evaluation = { ...evaluation, reviewedBy: 'human', approved: input.approved }
  }
  await assertLifeBehaviorExamples(tx, evaluation)
  await tx.run('UPDATE life_effect_intents SET receipt_ref_json = ?, updated_at = ? WHERE card_id = ? AND effect_id = ?', [boundedJson(evaluation), tx.now, tx.cardId, input.proposalId])
}
