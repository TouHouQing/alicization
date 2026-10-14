import type { LifeAppraisalInput, LifeEvidenceRef } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import { lifeRelationshipKey, preserveLifeConversationPreferences } from './life-conversation-preferences'
import { assertLifeMemoryEvidence } from './life-memory-evidence'
import { assertLifeId, assertLifeTime, boundedJson } from './life-transaction'

export const lifeEmotionParameterVersion = 'emotional-kernel-v1'

export async function applyLifeAppraisal(tx: LifeTransaction, input: LifeAppraisalInput) {
  assertLifeId(input.causeKey)
  assertLifeTime(input.occurredAt)
  if (input.parameterVersion !== lifeEmotionParameterVersion || Object.values(input.dimensions).some(value => !Number.isFinite(value) || value < -1 || value > 1))
    throw new TypeError('Emotion appraisal has invalid dimensions or parameter version')
  const evidence: LifeEvidenceRef[] = [...input.evidence]
  if (input.baseline) {
    const carry = await tx.get<{ appraisal_id: string, appraisal_version: number, cause_key: string, causal_refs_json: string }>(`SELECT appraisal_id, appraisal_version, cause_key, causal_refs_json FROM life_appraisals WHERE card_id = ? AND status = 'applied' ORDER BY recorded_at DESC, rowid DESC LIMIT 1`, [tx.cardId])
    if (carry?.cause_key === input.causeKey)
      evidence.push(...(JSON.parse(carry.causal_refs_json) as LifeEvidenceRef[]).filter(ref => ref.kind === 'emotion'))
    else if (carry)
      evidence.push({ cardId: tx.cardId, kind: 'emotion', id: carry.appraisal_id, version: String(carry.appraisal_version) })
  }
  if (input.turnId) {
    const contexts = await tx.all<{ payload_ref_json: string }>(`SELECT payload_ref_json FROM life_ingress WHERE card_id = ? AND source = 'provider-context' AND json_extract(payload_ref_json, '$.turnId') = ?`, [tx.cardId, input.turnId])
    for (const context of contexts) {
      const refs = JSON.parse(context.payload_ref_json) as { evidenceRefs?: LifeEvidenceRef[] }
      evidence.push(...refs.evidenceRefs ?? [])
    }
  }
  if (evidence.some(ref => ref.cardId !== tx.cardId))
    throw new Error('Emotion causal evidence crossed the card boundary')
  for (const ref of evidence)
    await assertLifeMemoryEvidence(tx, ref)
  const dimensions = boundedJson({ axes: input.dimensions, snapshot: input.snapshot, baseline: input.baseline, relationship: input.relationship ?? null })
  const causalRefs = boundedJson(evidence)
  const previous = await tx.get<{ appraisal_id: string, appraisal_version: number, dimensions_json: string, causal_refs_json: string }>(`SELECT appraisal_id, appraisal_version, dimensions_json, causal_refs_json FROM life_appraisals WHERE card_id = ? AND cause_key = ? ORDER BY appraisal_version DESC LIMIT 1`, [tx.cardId, input.causeKey])
  if (previous && previous.causal_refs_json === causalRefs) {
    const recorded = JSON.parse(previous.dimensions_json) as { axes: unknown, snapshot: unknown, relationship?: unknown }
    if (boundedJson(recorded.axes) === boundedJson(input.dimensions) && boundedJson(recorded.snapshot) === boundedJson(input.snapshot) && boundedJson(recorded.relationship ?? null) === boundedJson(input.relationship ?? null))
      return
  }
  const version = (previous?.appraisal_version ?? 0) + 1
  const id = `${createHash('sha256').update(input.causeKey).digest('hex')}:${version}`
  if (previous)
    await tx.run(`UPDATE life_appraisals SET status = 'superseded' WHERE card_id = ? AND appraisal_id = ?`, [tx.cardId, previous.appraisal_id])
  await tx.run(`INSERT INTO life_appraisals(card_id, appraisal_id, cause_key, appraisal_version, causal_refs_json, affected_goal_ids_json, dimensions_json, parameter_version, applied_commit_id, supersedes_appraisal_id, status, occurred_at, recorded_at) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 'applied', ?, ?)`, [tx.cardId, id, input.causeKey, version, causalRefs, dimensions, input.parameterVersion, tx.commitId, previous?.appraisal_id ?? null, input.occurredAt, tx.now])
  for (const ref of evidence)
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'emotion', ?, ?, 'supports', ?)`, [tx.cardId, ref.kind, ref.id, ref.version, id, String(version), tx.revision])
  await tx.updateOwner({ owner: 'emotion', key: 'life:emotion', value: boundedJson(input.snapshot) })
  if (input.relationship) {
    const previous = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', [lifeRelationshipKey])
    await tx.updateOwner({ owner: 'relationship', key: lifeRelationshipKey, value: boundedJson(preserveLifeConversationPreferences(previous?.value, input.relationship.snapshot)) })
  }
}
