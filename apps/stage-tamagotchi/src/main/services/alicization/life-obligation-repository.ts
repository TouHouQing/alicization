import type { LifeMutation, LifeObligation, LifeObligationStatus } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { assertLifeId, assertLifeTime, boundedJson } from './life-transaction'

const terminal = new Set<LifeObligationStatus>(['fulfilled', 'cancelled', 'superseded'])
const transitions: Record<LifeObligationStatus, LifeObligationStatus[]> = {
  'proposed': ['accepted', 'cancelled'],
  'accepted': ['waiting', 'in-progress', 'blocked', 'cancelled'],
  'waiting': ['waiting', 'in-progress', 'verifying', 'blocked', 'cancelled'],
  'in-progress': ['verifying', 'blocked', 'failed', 'cancelled'],
  'verifying': ['blocked', 'failed', 'cancelled'],
  'blocked': ['waiting', 'in-progress', 'verifying', 'cancelled'],
  'failed': ['waiting', 'cancelled'],
  'fulfilled': [],
  'cancelled': [],
  'superseded': [],
}

export interface ObligationRow {
  obligation_id: string
  generation: number
  revision: number
  kind: LifeObligation['kind']
  summary: string
  status: LifeObligationStatus
  source_ref_json: string
  due_at: number | null
  timezone: string | null
  thread_id: string | null
  scheduled_task_id: string | null
  required_proof_json: string
  fulfilled_receipt_ref_json: string | null
  created_at: number
  updated_at: number
}

export function mapLifeObligation(cardId: string, row: ObligationRow): LifeObligation {
  const source = JSON.parse(row.source_ref_json) as { personalAuthorship?: LifeObligation['personalAuthorship'], personalTopic?: string, personalOrigin?: LifeObligation['personalOrigin'], personalDevelopment?: LifeObligation['personalDevelopment'], turnId?: string, personalActivity?: LifeObligation['personalActivity'], deliveryTurnId?: string, invalidatedBy?: import('../../../shared/life-contracts').LifeEvidenceRef, invalidationMode?: 'correction' | 'forget' }
  const receipt = row.fulfilled_receipt_ref_json ? JSON.parse(row.fulfilled_receipt_ref_json) as import('../../../shared/life-contracts').LifeGoalVerification : null
  return { cardId, personalAuthorship: source.personalAuthorship, personalTopic: source.personalTopic, personalOrigin: source.personalOrigin, personalDevelopment: source.personalDevelopment, personalActivity: source.personalActivity, invalidationMode: source.invalidationMode ?? null, verification: receipt, invalidatedBy: source.invalidatedBy ?? null, id: row.obligation_id, generation: row.generation, revision: row.revision, kind: row.kind, summary: row.summary, status: row.status, sourceTurnId: source.turnId ?? null, deliveryTurnId: source.deliveryTurnId ?? null, dueAt: row.due_at, timezone: row.timezone, threadId: row.thread_id, scheduledTaskId: row.scheduled_task_id, proof: JSON.parse(row.required_proof_json), receiptId: receipt?.id ?? null, createdAt: row.created_at, updatedAt: row.updated_at }
}

export async function applyLifeObligation(tx: LifeTransaction, mutation: Extract<LifeMutation, { type: 'obligation-create' | 'obligation-update' | 'obligation-verify' | 'obligation-restore-verify' | 'reminder-generated' | 'reminder-attempt-settle' }>) {
  if (mutation.type === 'reminder-attempt-settle') {
    const row = await tx.get<ObligationRow>(`SELECT o.* FROM life_obligations o JOIN scheduled_tasks s ON s.id = o.scheduled_task_id WHERE o.card_id = ? AND s.task_id = ? AND (s.status = 'running' OR (? = 'failed' AND s.status = 'pending'))`, [tx.cardId, mutation.taskId, mutation.status])
    if (!row || row.generation !== mutation.expectedGeneration || !['waiting', 'in-progress'].includes(row.status))
      return
    if (mutation.nextTriggerAt != null)
      assertLifeTime(mutation.nextTriggerAt)
    await tx.run(`UPDATE scheduled_tasks SET status = ?, trigger_at = COALESCE(?, trigger_at), claimed_at = NULL, completed_at = ?, fired_turn_id = NULL, last_error = ? WHERE task_id = ? AND status IN ('pending','running')`, [mutation.status, mutation.nextTriggerAt, mutation.status === 'failed' ? tx.now : null, mutation.reason, mutation.taskId])
    await tx.run('UPDATE life_obligations SET status = ?, revision = ?, updated_at = ? WHERE card_id = ? AND obligation_id = ?', [mutation.status === 'failed' ? 'failed' : 'waiting', tx.revision, tx.now, tx.cardId, row.obligation_id])
    await tx.run(`UPDATE life_ingress SET status = ?, lease_owner = NULL, lease_until = NULL WHERE card_id = ? AND source = 'reminder-clock' AND json_extract(payload_ref_json, '$.taskId') = ? AND json_extract(payload_ref_json, '$.generation') = ?`, [mutation.status === 'failed' ? 'failed' : 'held', tx.cardId, mutation.taskId, mutation.expectedGeneration])
    await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ obligationId: row.obligation_id, generation: row.generation, status: mutation.status }) })
    return
  }
  if (mutation.type === 'reminder-generated') {
    const row = await tx.get<ObligationRow>(`SELECT o.* FROM life_obligations o JOIN scheduled_tasks s ON s.id = o.scheduled_task_id WHERE o.card_id = ? AND s.task_id = ? AND s.status = 'running'`, [tx.cardId, mutation.taskId])
    if (!row || row.generation !== mutation.expectedGeneration || !['waiting', 'in-progress'].includes(row.status))
      throw new Error('Reminder was cancelled or rescheduled while generation was running')
    await tx.run(`UPDATE scheduled_tasks SET status = 'completed', fired_turn_id = ?, completed_at = ?, last_error = NULL WHERE task_id = ? AND status = 'running'`, [mutation.turnId, tx.now, mutation.taskId])
    await applyLifeObligation(tx, { type: 'obligation-update', id: row.obligation_id, expectedGeneration: row.generation, expectedRevision: row.revision, status: 'verifying', turnId: mutation.turnId })
    await tx.run(`UPDATE life_ingress SET status = 'settled', lease_owner = NULL, lease_until = NULL WHERE card_id = ? AND source = 'reminder-clock' AND json_extract(payload_ref_json, '$.taskId') = ? AND json_extract(payload_ref_json, '$.generation') = ?`, [tx.cardId, mutation.taskId, mutation.expectedGeneration])
    return
  }
  if (mutation.type === 'obligation-create') {
    const item = mutation.obligation
    assertLifeId(item.id)
    assertLifeId(mutation.dedupeKey)
    if (item.cardId !== tx.cardId || item.generation !== 1 || !['proposed', 'accepted', 'waiting'].includes(item.status))
      throw new TypeError('New obligation has invalid scope, generation or status')
    if (!item.summary.trim() || item.summary.length > 8000)
      throw new TypeError('Obligation needs a bounded description')
    if (item.dueAt != null)
      assertLifeTime(item.dueAt)
    if (mutation.schedule) {
      if (!item.scheduledTaskId || item.dueAt == null || item.proof.kind !== 'reminder')
        throw new TypeError('Reminder schedule requires an exact due time and delivery proof')
      await tx.run(`INSERT INTO scheduled_tasks(id, task_id, trigger_at, message, status, created_at, source_turn_id) VALUES (?, ?, ?, ?, 'pending', ?, ?)`, [item.scheduledTaskId, mutation.schedule.taskId, item.dueAt, mutation.schedule.message, tx.now, item.sourceTurnId])
    }
    await tx.run(`INSERT INTO life_obligations(card_id, obligation_id, dedupe_key, generation, revision, kind, source_ref_json, beneficiary_ref_json, summary, status, due_at, timezone, expiry_policy, required_proof_json, thread_id, scheduled_task_id, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, '{}', ?, ?, ?, ?, 'none', ?, ?, ?, ?, ?)`, [tx.cardId, item.id, mutation.dedupeKey, tx.revision, item.kind, boundedJson({ turnId: item.sourceTurnId, deliveryTurnId: item.deliveryTurnId }), item.summary, item.status, item.dueAt, item.timezone, boundedJson(item.proof), item.threadId, item.scheduledTaskId, tx.now, tx.now])
    await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ obligationId: item.id, generation: 1, status: item.status }) })
    return
  }
  const row = await tx.get<ObligationRow>('SELECT * FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, mutation.id])
  const restoring = mutation.type === 'obligation-restore-verify'
  if (restoring) {
    const marker = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key=\'life:backup-restore\'')
    const restore = marker ? JSON.parse(marker.value) as { operationId?: string, status?: string } : null
    if (!restore || restore.operationId !== mutation.restoreOperationId || restore.status !== 'restored-awaiting-review')
      throw new Error('Goal restoration requires the exact pending restore operation')
  }
  if (!row || row.generation !== mutation.expectedGeneration || row.revision !== mutation.expectedRevision || (terminal.has(row.status) && (!restoring || row.status !== 'fulfilled')) || (restoring && row.status === 'failed'))
    throw new Error('Obligation fence is absent, stale or terminal')
  if (mutation.type === 'obligation-verify' || restoring) {
    if ((JSON.parse(row.source_ref_json) as { invalidatedBy?: unknown }).invalidatedBy)
      throw new Error('Obligation source was invalidated; a new plan is required before fulfilment')
    const verification = mutation.verification
    assertLifeId(verification.id)
    assertLifeTime(verification.verifiedAt)
    const proof = JSON.parse(row.required_proof_json) as LifeObligation['proof']
    if (restoring && !['file', 'setting'].includes(proof.kind))
      throw new Error('Restored goals require a read-only file or setting proof')
    if (verification.kind !== proof.kind)
      throw new Error('Verification does not match the accepted goal proof')
    if (proof.kind !== 'user-reported' && verification.verdict === 'satisfied' && !verification.independent)
      throw new Error('Goal fulfilment requires independent proof')
    const status = verification.verdict === 'satisfied' ? 'fulfilled' : 'blocked'
    await tx.run('UPDATE life_obligations SET status = ?, fulfilled_receipt_ref_json = ?, revision = ?, updated_at = ? WHERE card_id = ? AND obligation_id = ?', [status, boundedJson(verification), tx.revision, tx.now, tx.cardId, mutation.id])
    await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ obligationId: mutation.id, generation: row.generation, status, verificationId: verification.id }) })
    return
  }
  if (!transitions[row.status].includes(mutation.status))
    throw new Error('Invalid obligation transition; fulfilment requires verification')
  const rescheduled = mutation.dueAt != null
  if (rescheduled) {
    assertLifeTime(mutation.dueAt!)
    if (row.scheduled_task_id)
      await tx.run(`UPDATE scheduled_tasks SET trigger_at = ?, status = 'pending', claimed_at = NULL, completed_at = NULL, fired_turn_id = NULL WHERE id = ?`, [mutation.dueAt, row.scheduled_task_id])
  }
  if (mutation.status === 'cancelled' && row.scheduled_task_id)
    await tx.run(`UPDATE scheduled_tasks SET status = 'failed', last_error = 'obligation-cancelled' WHERE id = ? AND status IN ('pending', 'running')`, [row.scheduled_task_id])
  if ((rescheduled || mutation.status === 'cancelled') && row.scheduled_task_id)
    await tx.run(`UPDATE life_ingress SET status = 'settled', lease_owner = NULL, lease_until = NULL WHERE card_id = ? AND source = 'reminder-clock' AND json_extract(payload_ref_json, '$.generation') = ? AND json_extract(payload_ref_json, '$.taskId') = (SELECT task_id FROM scheduled_tasks WHERE id = ?) AND status IN ('accepted','held')`, [tx.cardId, row.generation, row.scheduled_task_id])
  const source = JSON.parse(row.source_ref_json) as { turnId?: string, deliveryTurnId?: string }
  if (mutation.turnId)
    source.deliveryTurnId = mutation.turnId
  if (rescheduled)
    delete source.deliveryTurnId
  await tx.run('UPDATE life_obligations SET status = ?, generation = generation + ?, revision = ?, due_at = ?, source_ref_json = ?, fulfilled_receipt_ref_json = NULL, cancel_requested_at = ?, updated_at = ? WHERE card_id = ? AND obligation_id = ?', [mutation.status, rescheduled || mutation.status === 'cancelled' ? 1 : 0, tx.revision, mutation.dueAt ?? row.due_at, boundedJson(source), mutation.status === 'cancelled' ? tx.now : null, tx.now, tx.cardId, mutation.id])
  await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ obligationId: mutation.id, generation: row.generation + (rescheduled || mutation.status === 'cancelled' ? 1 : 0), status: mutation.status }) })
}
