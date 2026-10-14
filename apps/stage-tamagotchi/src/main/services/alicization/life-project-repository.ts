import type { LifeMutation } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { boundedJson } from './life-transaction'

export async function bindLifeProject(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'personal-project-bind' }>) {
  const id = `task:${input.threadId}`
  const task = await tx.get<{ status: string, metadata_json: string | null }>('SELECT status, metadata_json FROM task_threads WHERE id = ?', [input.threadId])
  if (!task || task.status !== 'planned' || input.proof.kind !== 'file' || !input.proof.path || !input.proof.contentHash || !input.evidence.length)
    throw new Error('Personal project requires an unstarted task, fixed file proof and grounded interest')
  const metadata = task.metadata_json ? JSON.parse(task.metadata_json) as { personalActivity?: string, personalTopic?: string, personalOrigin?: string } : null
  const creativeInspiration = ['creative-writing-v1', 'visual-study-v1'].includes(metadata?.personalActivity ?? '')
  for (const ref of input.evidence) {
    if (ref.cardId === tx.cardId && ref.kind === 'personal-proposal' && creativeInspiration) {
      const row = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = \'life:initiative\'')
      const proposal = row && (JSON.parse(row.value).personalProposals as import('./life-personal-proposals').LifePersonalProposal[] | undefined)?.find(item => item.id === ref.id && item.sourceReplyHash === ref.version)
      if (!proposal || proposal.status !== 'proposed' || proposal.createdAt > tx.now || proposal.expiresAt <= tx.now || !await tx.get('SELECT 1 FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND status = \'settled\' AND source = \'dialogue-settlement\'', [tx.cardId, `dialogue-settlement:user:${proposal.sourceTurnId}`]))
        throw new Error('Personal proposal source is absent, withdrawn or expired')
      await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'goals', ?, '1', 'derived-from', ?)`, [tx.cardId, ref.kind, ref.id, ref.version, id, tx.revision])
      continue
    }
    if (ref.cardId === tx.cardId && ref.kind === 'goals' && metadata?.personalActivity === 'practice-review-v1') {
      const observed = await tx.get(`SELECT 1 FROM life_obligations WHERE card_id = ? AND obligation_id = ? AND generation = ? AND status = 'fulfilled' AND json_extract(source_ref_json, '$.personalAuthorship') IS NOT NULL AND json_extract(source_ref_json, '$.invalidatedBy') IS NULL`, [tx.cardId, ref.id, Number(ref.version)])
      if (!observed || ref.id === id)
        throw new Error('Practice review source is stale or cyclic')
      await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, 'goals', ?, ?, 'goals', ?, '1', 'derived-from', ?)`, [tx.cardId, ref.id, ref.version, id, tx.revision])
      continue
    }
    if (ref.cardId !== tx.cardId || ref.kind !== 'memory_facts' || !await tx.get(`SELECT 1 FROM memory_fact_versions WHERE card_id = ? AND fact_id = ? AND CAST(version AS TEXT) = ? AND provenance IN ('reported','observed') AND ((lifecycle = 'active' AND recorded_to IS NULL) OR (? = 1 AND lifecycle = 'superseded'))`, [tx.cardId, ref.id, ref.version, creativeInspiration ? 1 : 0]))
      throw new Error('Personal project source became invalid')
    // Fiction can retain historical inspiration after a preference correction;
    // explicit forgetting still withdraws the private material and descendants.
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'goals', ?, '1', ?, ?)`, [tx.cardId, ref.kind, ref.id, ref.version, id, creativeInspiration ? 'derived-from' : 'supports', tx.revision])
  }
  await tx.run(`UPDATE life_obligations SET kind = 'personal-project', beneficiary_ref_json = '{"kind":"self"}', required_proof_json = ?, revision = ?, updated_at = ? WHERE card_id = ? AND obligation_id = ? AND status = 'accepted'`, [boundedJson(input.proof), tx.revision, tx.now, tx.cardId, id])
  if (!metadata?.personalActivity || !['interest-note-v1', 'creative-writing-v1', 'practice-review-v1', 'visual-study-v1'].includes(metadata.personalActivity))
    throw new Error('Personal activity type is not supported')
  if (metadata.personalTopic !== undefined && (typeof metadata.personalTopic !== 'string' || !metadata.personalTopic.trim() || metadata.personalTopic.length > 160))
    throw new Error('Personal activity topic must be bounded')
  if (metadata.personalOrigin !== undefined && !['self-initiated', 'host-invited'].includes(metadata.personalOrigin))
    throw new Error('Personal activity origin is not supported')
  if (metadata.personalTopic && metadata.personalOrigin)
    await tx.run(`UPDATE life_obligations SET source_ref_json = json_set(source_ref_json, '$.personalTopic', ?, '$.personalOrigin', ?) WHERE card_id = ? AND obligation_id = ?`, [metadata.personalTopic, metadata.personalOrigin, tx.cardId, id])
  await tx.run(`UPDATE life_obligations SET source_ref_json = json_set(source_ref_json, '$.personalActivity', ?) WHERE card_id = ? AND obligation_id = ?`, [metadata.personalActivity, tx.cardId, id])
  await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ obligationId: id, kind: 'personal-project', source: input.evidence }) })
}

export async function settleLifeProjectExperience(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'project-experience-indexed' }>) {
  const goal = await tx.get<{ generation: number, thread_id: string, required_proof_json: string, status: string, source_ref_json: string, fulfilled_receipt_ref_json: string }>('SELECT generation, thread_id, required_proof_json, status, source_ref_json, fulfilled_receipt_ref_json FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, input.goalId])
  if (!goal || goal.status !== 'fulfilled' || goal.generation !== input.generation || (JSON.parse(goal.source_ref_json) as { invalidatedBy?: unknown }).invalidatedBy || (JSON.parse(goal.fulfilled_receipt_ref_json) as { id: string }).id !== input.verificationId)
    throw new Error('Project experience source changed before indexing settlement')
  if (!await tx.get('SELECT 1 FROM episodic_events WHERE card_id = ? AND id = ?', [tx.cardId, input.episodeId]))
    throw new Error('Project experience requires a persisted canonical episode')
  const proof = JSON.parse(goal.required_proof_json)
  const action = await tx.get<{ effect_id: string, receipt_ref_json: string }>(`SELECT effect_id, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND turn_id = ? AND status = 'settled' AND json_extract(payload_ref_json, '$.capabilityId') = 'owned-note' AND json_extract(payload_ref_json, '$.parameters.ownedNote.contentHash') = ?`, [tx.cardId, goal.thread_id, proof.contentHash])
  if (!action || JSON.parse(action.receipt_ref_json).outcome !== 'completed')
    throw new Error('Personal experience requires the authored operation for the exact verified bytes')
  const personalAuthorship = { effectId: action.effect_id, episodeId: input.episodeId, verifiedAt: JSON.parse(goal.fulfilled_receipt_ref_json).verifiedAt }
  await tx.run(`UPDATE life_obligations SET source_ref_json = json_set(source_ref_json, '$.personalAuthorship', json(?)), revision = ? WHERE card_id = ? AND obligation_id = ?`, [JSON.stringify(personalAuthorship), tx.revision, tx.cardId, input.goalId])
  await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ obligationId: input.goalId, personalAuthorship }) })
  const head = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', ['life:memory-head'])
  await tx.updateOwner({ owner: 'memory', key: 'life:memory-head', value: boundedJson({ ...(head ? JSON.parse(head.value) : {}), projectExperience: input.episodeId }) })
  await tx.run('INSERT INTO alicization_meta(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', [`life:experience:${tx.cardId}:${input.episodeId}`, boundedJson({ episodeId: input.episodeId, verificationId: input.verificationId }), tx.now])
}
