import type { LifeEvidenceRef, LifeMutation } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import { lifeRelationshipKey, preserveLifeConversationPreferences } from './life-conversation-preferences'
import { invalidateLifeGrowth } from './life-growth-repository'
import { redactLifeProjectSource } from './life-project-redaction'
import { assertLifeId, boundedJson } from './life-transaction'

interface CleanupRow { job_id: string, source_ref_json: string, mode: 'correction' | 'forget', frontier_json: string, visited_json: string, cursor: number, status: string, started_revision: number }
interface DependentRow { dependent_owner: string, dependent_id: string, dependent_version: string, relation: string }
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

export async function applyLifeEvidenceInvalidation(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'evidence-invalidate' | 'evidence-cleanup-resume' }>) {
  let jobId: string
  if (input.type === 'evidence-invalidate') {
    if (input.source.cardId !== tx.cardId)
      throw new Error('Evidence invalidation crossed the card boundary')
    for (const value of [input.source.kind, input.source.id, input.source.version])
      assertLifeId(value)
    jobId = hash(boundedJson({ source: input.source, mode: input.mode }))
    await tx.run(`INSERT OR IGNORE INTO life_evidence_cleanup_jobs(card_id, job_id, source_ref_json, mode, reason_hash, frontier_json, visited_json, status, started_revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '[]', 'pending', ?, ?, ?)`, [tx.cardId, jobId, boundedJson(input.source), input.mode, hash(input.reason), boundedJson([input.source]), tx.revision, tx.now, tx.now])
  }
  else {
    assertLifeId(input.jobId)
    jobId = input.jobId
  }
  const job = await tx.get<CleanupRow>('SELECT * FROM life_evidence_cleanup_jobs WHERE card_id = ? AND job_id = ?', [tx.cardId, jobId])
  if (!job || job.status === 'completed')
    return
  const frontier = JSON.parse(job.frontier_json) as Array<LifeEvidenceRef & { offset?: number }>
  const invalidatedGoals: string[] = []
  let emotionAffected = false
  let relationshipAffected = false
  let cursor = job.cursor
  let budget = 100
  while (budget > 0 && frontier.length > 0) {
    budget--
    const ref = frontier.shift()!
    const { offset = 0, ...reference } = ref
    const visitKey = hash(boundedJson(reference))
    if (await tx.get<{ reference_hash: string }>('SELECT reference_hash FROM life_evidence_cleanup_visits WHERE card_id = ? AND job_id = ? AND reference_hash = ?', [tx.cardId, jobId, visitKey]))
      continue
    if (ref.kind === 'memory_facts') {
      await tx.run(`UPDATE memory_fact_versions SET lifecycle = ?, recorded_to = COALESCE(recorded_to, ?) WHERE card_id = ? AND fact_id = ? AND (? = '*' OR CAST(version AS TEXT) = ?)`, [job.mode === 'forget' ? 'revoked' : 'superseded', tx.now, tx.cardId, ref.id, ref.version, ref.version])
      await tx.run(`DELETE FROM memory_entity_aliases WHERE card_id = ? AND json_extract(evidence_ref_json, '$.kind') = 'memory_facts' AND json_extract(evidence_ref_json, '$.id') = ? AND (? = '*' OR json_extract(evidence_ref_json, '$.version') = ?)`, [tx.cardId, ref.id, ref.version, ref.version])
    }
    if (ref.kind === 'memory')
      await tx.run(`UPDATE memory_fact_versions SET lifecycle = ?, recorded_to = COALESCE(recorded_to, ?) WHERE card_id = ? AND stream_id = ? AND (? = '*' OR CAST(version AS TEXT) = ?)`, [job.mode === 'forget' ? 'revoked' : 'superseded', tx.now, tx.cardId, ref.id, ref.version, ref.version])
    const pageSize = Math.min(32, budget)
    const page = await tx.all<DependentRow>(`SELECT DISTINCT dependent_owner, dependent_id, dependent_version, relation FROM life_evidence_dependencies WHERE card_id = ? AND source_kind = ? AND source_id = ? AND (? = '*' OR source_version = ?) AND created_revision <= ? ORDER BY dependent_owner, dependent_id, dependent_version, relation LIMIT ? OFFSET ?`, [tx.cardId, ref.kind, ref.id, ref.version, ref.version, job.started_revision, pageSize + 1, offset])
    const dependents = page.slice(0, pageSize)
    if (page.length > pageSize)
      frontier.push({ ...reference, offset: offset + pageSize })
    else
      await tx.run('INSERT OR IGNORE INTO life_evidence_cleanup_visits(card_id, job_id, reference_hash) VALUES (?, ?, ?)', [tx.cardId, jobId, visitKey])
    for (const dependent of dependents) {
      if (job.mode === 'correction' && dependent.dependent_owner === 'goals' && dependent.relation === 'derived-from') {
        const creative = await tx.get(`SELECT 1 FROM life_obligations WHERE card_id = ? AND obligation_id = ? AND kind = 'personal-project' AND json_extract(source_ref_json, '$.personalActivity') = 'creative-writing-v1'`, [tx.cardId, dependent.dependent_id])
        if (creative)
          continue
      }
      budget--
      cursor++
      const next = { cardId: tx.cardId, kind: dependent.dependent_owner, id: dependent.dependent_id, version: dependent.dependent_version }
      frontier.push(next)
      if (dependent.dependent_owner === 'emotion') {
        const appraisal = await tx.get<{ dimensions_json: string }>('SELECT dimensions_json FROM life_appraisals WHERE card_id = ? AND appraisal_id = ?', [tx.cardId, dependent.dependent_id])
        if (appraisal && JSON.parse(appraisal.dimensions_json).relationship)
          relationshipAffected = true
        await tx.run(`UPDATE life_appraisals SET status = 'revoked', dimensions_json = CASE WHEN ? = 'forget' THEN '{}' ELSE dimensions_json END WHERE card_id = ? AND appraisal_id = ?`, [job.mode, tx.cardId, dependent.dependent_id])
        emotionAffected = true
      }
      else if (dependent.dependent_owner === 'goals') {
        const goal = await tx.get<{ source_ref_json: string, status: string, generation: number, kind: string, thread_id: string | null }>('SELECT source_ref_json, status, generation, kind, thread_id FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, dependent.dependent_id])
        const source = goal ? JSON.parse(goal.source_ref_json) as Record<string, unknown> : null
        if (goal && source && (goal.generation === Number(dependent.dependent_version) || goal.status === 'blocked' && source.invalidatedBy)) {
          source.invalidatedBy = ref
          source.invalidationMode = source.invalidationMode === 'forget' ? 'forget' : job.mode
          if (source.invalidationMode === 'forget')
            delete source.personalTopic
          if (source.invalidationMode === 'forget' && goal.kind === 'personal-project' && goal.thread_id)
            await redactLifeProjectSource(tx, goal.thread_id)
          if (['fulfilled', 'cancelled', 'superseded'].includes(goal.status)) {
            await tx.run(`UPDATE life_obligations SET source_ref_json = ?, summary = CASE WHEN ? = 'forget' THEN '来源已遗忘的活动记录' ELSE summary END, revision = ?, updated_at = ? WHERE card_id = ? AND obligation_id = ?`, [boundedJson(source), source.invalidationMode, tx.revision, tx.now, tx.cardId, dependent.dependent_id])
            invalidatedGoals.push(dependent.dependent_id)
            continue
          }
          await tx.run(`UPDATE life_obligations SET status = 'blocked', generation = generation + CASE WHEN status = 'blocked' THEN 0 ELSE 1 END, summary = CASE WHEN ? = 'forget' THEN '来源已遗忘的活动记录' ELSE summary END, revision = ?, source_ref_json = ?, fulfilled_receipt_ref_json = NULL, cancel_requested_at = ?, updated_at = ? WHERE card_id = ? AND obligation_id = ?`, [source.invalidationMode, tx.revision, boundedJson(source), tx.now, tx.now, tx.cardId, dependent.dependent_id])
          invalidatedGoals.push(dependent.dependent_id)
        }
      }
      else if (dependent.dependent_owner === 'memory') {
        await tx.run(`UPDATE memory_fact_versions SET lifecycle = ? WHERE card_id = ? AND stream_id = ? AND CAST(version AS TEXT) = ?`, [job.mode === 'forget' ? 'revoked' : 'disputed', tx.cardId, dependent.dependent_id, dependent.dependent_version])
      }
      else if (dependent.dependent_owner === 'reflection') {
        await tx.run(`UPDATE life_effect_intents SET status = 'cancelled', last_error_code = 'SOURCE_INVALIDATED', updated_at = ? WHERE card_id = ? AND effect_id = ? AND (status IN ('prepared','claimed') OR (kind = 'reflect' AND json_extract(payload_ref_json, '$.format') = 'persona-revision-proposal-v1' AND status = 'settled'))`, [tx.now, tx.cardId, dependent.dependent_id])
        if (job.mode === 'forget') {
          const effect = await tx.get<{ payload_ref_json: string, intent_hash: string }>('SELECT payload_ref_json, intent_hash FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, dependent.dependent_id])
          const payload = effect ? JSON.parse(effect.payload_ref_json) as Record<string, unknown> : null
          if (effect && payload?.format === 'persona-revision-proposal-v1') {
            const redacted = boundedJson({ format: payload.format, sourceWithdrawn: true, originalIntentHash: payload.originalIntentHash ?? effect.intent_hash })
            await tx.run('UPDATE life_effect_intents SET payload_ref_json = ?, intent_hash = ?, receipt_ref_json = NULL WHERE card_id = ? AND effect_id = ?', [redacted, hash(redacted), tx.cardId, dependent.dependent_id])
          }
        }
      }
      else if (dependent.dependent_owner === 'growth') {
        await invalidateLifeGrowth(tx, dependent.dependent_id, job.mode)
      }
    }
  }
  // Revoked causes cannot remain the authority behind visible emotion. The next
  // appraisal may restore a grounded state; unavailable evidence remains unknown.
  if (emotionAffected) {
    const remaining = await tx.get<{ dimensions_json: string }>(`SELECT dimensions_json FROM life_appraisals WHERE card_id = ? AND status = 'applied' ORDER BY recorded_at DESC, appraisal_version DESC LIMIT 1`, [tx.cardId])
    const emotion = remaining ? (JSON.parse(remaining.dimensions_json) as { snapshot: unknown }).snapshot : null
    await tx.updateOwner({ owner: 'emotion', key: 'life:emotion', value: boundedJson(emotion) })
    const relationship = remaining ? (JSON.parse(remaining.dimensions_json) as { relationship?: { snapshot: Record<string, unknown> | null } }).relationship?.snapshot ?? null : null
    if (relationshipAffected) {
      const previous = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', [lifeRelationshipKey])
      await tx.updateOwner({ owner: 'relationship', key: lifeRelationshipKey, value: boundedJson(preserveLifeConversationPreferences(previous?.value, relationship)) })
    }
    const presence = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', ['visual_presence_state_v1'])
    if (presence?.value) {
      const snapshot = JSON.parse(presence.value) as Record<string, unknown>
      snapshot.emotionalKernel = emotion
      snapshot.emotionalTemporalState = null
      snapshot.appraisal = null
      if (relationshipAffected) {
        snapshot.relationshipModel = relationship && typeof relationship === 'object' ? (relationship as Record<string, unknown>).relationshipModel ?? null : null
        snapshot.personStateProjection = relationship && typeof relationship === 'object' ? (relationship as Record<string, unknown>).personStateProjection ?? null : null
        snapshot.affectiveResidue = null
      }
      const derived = snapshot.derivedMindStateBundle as Record<string, unknown> | null
      if (derived) {
        derived.emotionalKernel = emotion
        derived.emotionalTransitionLedger = null
        if (relationshipAffected) {
          derived.relationshipModel = snapshot.relationshipModel
          derived.personStateProjection = snapshot.personStateProjection
          derived.affectiveResidue = null
        }
      }
      await tx.updateOwner({ owner: 'presence', key: 'visual_presence_state_v1', value: boundedJson(snapshot) })
    }
  }
  if (invalidatedGoals.length)
    await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ invalidatedGoals, commitId: tx.commitId }) })
  await tx.run('UPDATE life_evidence_cleanup_jobs SET frontier_json = ?, visited_json = ?, cursor = ?, status = ?, updated_at = ? WHERE card_id = ? AND job_id = ?', [boundedJson(frontier), '[]', cursor, frontier.length ? 'pending' : 'completed', tx.now, tx.cardId, jobId])
  const head = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', ['life:memory-head'])
  await tx.updateOwner({ owner: 'memory', key: 'life:memory-head', value: boundedJson({ ...(head ? JSON.parse(head.value) : {}), cleanup: { jobId, cursor, pending: frontier.length } }) })
}
