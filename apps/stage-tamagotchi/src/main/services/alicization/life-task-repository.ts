import type { LifeEvidenceRef, LifeObligationStatus } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import * as v from 'valibot'

import { lifeGoalProofSchema } from './life-goal-verifier'
import { assertLifeMemoryEvidence } from './life-memory-evidence'
import { boundedJson } from './life-transaction'

interface TaskRow { id: string, current_attempt_id: string | null, status: string, goal: string, turn_id: string | null, created_at: number, metadata_json: string | null }
const statuses: Record<string, LifeObligationStatus> = { 'planned': 'accepted', 'needs-affirmation': 'proposed', 'running': 'in-progress', 'paused': 'blocked', 'blocked': 'blocked', 'completed': 'verifying', 'failed': 'failed', 'cancelled': 'cancelled', 'dead-lettered': 'blocked' }

export async function projectLifeTask(tx: LifeTransaction, threadId: string) {
  const task = await tx.get<TaskRow>('SELECT * FROM task_threads WHERE id = ?', [threadId])
  if (!task || !statuses[task.status])
    throw new Error('Task responsibility requires a valid persisted execution thread')
  const id = `task:${threadId}`
  const previous = await tx.get<{ status: LifeObligationStatus, source_ref_json: string, generation: number }>('SELECT status, source_ref_json, generation FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, id])
  const source = previous ? JSON.parse(previous.source_ref_json) as { attemptId?: string, invalidatedBy?: unknown } : null
  const newAttempt = !!previous && source?.attemptId !== task.current_attempt_id
  if (source?.invalidatedBy && task.status === 'running')
    throw Object.assign(new Error('Task source was invalidated; execution requires a new task with current evidence'), { code: 'TASK_SOURCE_INVALIDATED' })
  if (previous && ['fulfilled', 'cancelled', 'superseded'].includes(previous.status) && !newAttempt)
    return
  if (source?.invalidatedBy && !newAttempt)
    return
  await tx.run(`INSERT INTO life_obligations(card_id, obligation_id, dedupe_key, generation, revision, kind, source_ref_json, beneficiary_ref_json, summary, status, expiry_policy, required_proof_json, thread_id, created_at, updated_at) VALUES (?, ?, ?, 1, ?, 'task', ?, '{}', ?, ?, 'none', '{"kind":"user-reported"}', ?, ?, ?) ON CONFLICT(card_id, obligation_id) DO UPDATE SET status = excluded.status, source_ref_json = excluded.source_ref_json, revision = excluded.revision, generation = life_obligations.generation + ?, updated_at = excluded.updated_at, fulfilled_receipt_ref_json = CASE WHEN ? THEN NULL ELSE life_obligations.fulfilled_receipt_ref_json END`, [tx.cardId, id, id, tx.revision, boundedJson({ ...source, turnId: task.turn_id, attemptId: task.current_attempt_id }), task.goal, statuses[task.status], threadId, task.created_at, tx.now, newAttempt ? 1 : 0, newAttempt ? 1 : 0])
  const generation = (previous?.generation ?? 1) + (newAttempt ? 1 : 0)
  const metadata = task.metadata_json ? JSON.parse(task.metadata_json) as Record<string, unknown> : null
  const explicitEvidence = metadata?.sourceEvidence
  const creativeInspiration = ['creative-writing-v1', 'visual-study-v1'].includes(String(metadata?.personalActivity ?? ''))
  if (explicitEvidence !== undefined && (!Array.isArray(explicitEvidence) || explicitEvidence.length > 64))
    throw new TypeError('Task source evidence is outside its bounded shape')
  for (const ref of (explicitEvidence ?? []) as LifeEvidenceRef[]) {
    if (ref?.cardId === tx.cardId && ref.kind === 'personal-proposal' && creativeInspiration) {
      const row = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = \'life:initiative\'')
      const proposal = row && (JSON.parse(row.value).personalProposals as import('./life-personal-proposals').LifePersonalProposal[] | undefined)?.find(item => item.id === ref.id && item.sourceReplyHash === ref.version)
      if (!proposal || proposal.status !== 'proposed' || !previous && (proposal.createdAt > tx.now || proposal.expiresAt <= tx.now))
        throw new Error('Personal choice is withdrawn, expired or absent')
      await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'goals', ?, ?, 'derived-from', ?)`, [tx.cardId, ref.kind, ref.id, ref.version, id, String(generation), tx.revision])
      continue
    }
    if (ref?.cardId === tx.cardId && ref.kind === 'goals' && metadata?.personalActivity === 'practice-review-v1') {
      if (ref.id === id || !await tx.get(`SELECT 1 FROM life_obligations WHERE card_id = ? AND obligation_id = ? AND generation = ? AND status = 'fulfilled' AND json_extract(source_ref_json, '$.personalAuthorship') IS NOT NULL AND json_extract(source_ref_json, '$.invalidatedBy') IS NULL`, [tx.cardId, ref.id, Number(ref.version)]))
        throw new Error('Practice review requires a verified own activity')
      await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, 'goals', ?, ?, 'goals', ?, ?, 'derived-from', ?)`, [tx.cardId, ref.id, ref.version, id, String(generation), tx.revision])
      continue
    }
    if (!ref || ref.cardId !== tx.cardId || ref.kind !== 'memory_facts' || typeof ref.id !== 'string' || typeof ref.version !== 'string')
      throw new TypeError('Task source evidence has an invalid identity or scope')
    await assertLifeMemoryEvidence(tx, creativeInspiration ? { ...ref, usage: 'historical' } : ref)
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'goals', ?, ?, ?, ?)`, [tx.cardId, ref.kind, ref.id, ref.version, id, String(generation), creativeInspiration ? 'derived-from' : 'supports', tx.revision])
  }
  if (metadata?.goalProof) {
    const proof = v.parse(lifeGoalProofSchema, metadata.goalProof)
    const accepted = await tx.get<{ required_proof_json: string }>('SELECT required_proof_json FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, id])
    if (accepted?.required_proof_json !== boundedJson(proof) && task.status !== 'planned' && !newAttempt)
      throw new Error('An executing task cannot change its accepted goal proof')
    await tx.run('UPDATE life_obligations SET required_proof_json = ? WHERE card_id = ? AND obligation_id = ?', [boundedJson(proof), tx.cardId, id])
  }
  const contexts = task.turn_id ? await tx.all<{ payload_ref_json: string }>(`SELECT payload_ref_json FROM life_ingress WHERE card_id = ? AND source = 'provider-context' AND json_extract(payload_ref_json, '$.turnId') = ?`, [tx.cardId, task.turn_id]) : []
  for (const context of contexts) {
    const evidence = JSON.parse(context.payload_ref_json) as { evidenceRefs?: LifeEvidenceRef[] }
    for (const ref of evidence.evidenceRefs ?? []) {
      if (ref.cardId !== tx.cardId)
        throw new Error('Task evidence crossed the card boundary')
      await assertLifeMemoryEvidence(tx, ref)
      await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'goals', ?, ?, 'supports', ?)`, [tx.cardId, ref.kind, ref.id, ref.version, id, String(generation), tx.revision])
    }
  }
  await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ threadId, obligationId: id, generation, status: statuses[task.status] }) })
}
