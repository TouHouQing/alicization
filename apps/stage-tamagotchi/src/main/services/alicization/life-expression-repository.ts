import type { LifeExpressionReceipt } from '../../../shared/life-contracts'
import type { ObligationRow } from './life-obligation-repository'
import type { LifeTransaction } from './life-transaction'

import * as v from 'valibot'

import { applyLifeObligation, mapLifeObligation } from './life-obligation-repository'
import { boundedJson } from './life-transaction'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const time = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER))
export const lifeExpressionReceiptSchema = v.strictObject({
  cardId: id,
  receiptId: id,
  deliveryId: id,
  turnId: id,
  utteranceId: id,
  segmentId: id,
  playbackEpoch: id,
  surfaceSessionId: id,
  sequence: time,
  state: v.picklist(['rendered', 'audio-started', 'audio-progress', 'audio-ended', 'audio-interrupted', 'audio-failed']),
  playedMs: time,
  alignedTextEnd: v.nullable(time),
  alignmentSource: v.nullable(v.picklist(['tts', 'viseme', 'segment'])),
  errorCode: v.nullable(v.pipe(v.string(), v.maxLength(512))),
  occurredAt: time,
})

export async function applyLifeExpression(tx: LifeTransaction, raw: LifeExpressionReceipt, presentationVerified: boolean) {
  const receipt = v.parse(lifeExpressionReceiptSchema, raw)
  if (receipt.cardId !== tx.cardId)
    throw new Error('Expression receipt belongs to another card')
  const duplicate = await tx.get<{ state: string }>('SELECT state FROM life_expression_receipts WHERE card_id = ? AND receipt_id = ?', [tx.cardId, receipt.receiptId])
  if (duplicate)
    throw new Error('Expression receipt identifier was reused outside its operation')
  const expression = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', ['life:expression'])
  await tx.updateOwner({ owner: 'expression', key: 'life:expression', value: boundedJson({ ...(expression?.value ? JSON.parse(expression.value) : {}), lastReceipt: { turnId: receipt.turnId, state: receipt.state, playedMs: receipt.playedMs, errorCode: receipt.errorCode, presentationVerified, observedAt: tx.now } }) })
  const currentEpoch = await tx.get<{ playback_epoch: string, occurred_at: number }>('SELECT playback_epoch, occurred_at FROM life_expression_receipts WHERE card_id = ? AND delivery_id = ? AND segment_id = ? ORDER BY observed_at DESC, rowid DESC LIMIT 1', [tx.cardId, receipt.deliveryId, receipt.segmentId])
  if (receipt.state !== 'rendered' && currentEpoch && currentEpoch.playback_epoch !== receipt.playbackEpoch && (receipt.state !== 'audio-started' || await tx.get('SELECT 1 FROM life_expression_receipts WHERE card_id = ? AND delivery_id = ? AND segment_id = ? AND playback_epoch = ?', [tx.cardId, receipt.deliveryId, receipt.segmentId, receipt.playbackEpoch])))
    throw new Error('Expression playback epoch was superseded')
  const last = await tx.get<{ sequence: number, state: string, played_ms: number }>('SELECT sequence, state, played_ms FROM life_expression_receipts WHERE card_id = ? AND surface_session_id = ? AND playback_epoch = ? AND segment_id = ? ORDER BY sequence DESC LIMIT 1', [tx.cardId, receipt.surfaceSessionId, receipt.playbackEpoch, receipt.segmentId])
  if (last && (receipt.sequence <= last.sequence || receipt.playedMs < last.played_ms || ['audio-ended', 'audio-interrupted', 'audio-failed'].includes(last.state)))
    throw new Error('Expression sequence is stale or already terminal')
  if (receipt.state === 'audio-ended' && (!last || !['audio-started', 'audio-progress'].includes(last.state)))
    throw new Error('Audio completion has no actual playback start')
  await tx.run('INSERT INTO life_expression_receipts(card_id, receipt_id, delivery_id, turn_id, utterance_id, segment_id, playback_epoch, surface_session_id, sequence, state, played_ms, aligned_text_end, alignment_source, error_code, occurred_at, observed_at, presentation_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tx.cardId, receipt.receiptId, receipt.deliveryId, receipt.turnId, receipt.utteranceId, receipt.segmentId, receipt.playbackEpoch, receipt.surfaceSessionId, receipt.sequence, receipt.state, receipt.playedMs, receipt.alignedTextEnd, receipt.alignmentSource, receipt.errorCode, receipt.occurredAt, tx.now, presentationVerified ? 1 : 0])
  const rows = await tx.all<ObligationRow>(`SELECT * FROM life_obligations WHERE card_id = ? AND kind = 'reminder' AND status = 'verifying'`, [tx.cardId])
  for (const row of rows) {
    const obligation = mapLifeObligation(tx.cardId, row)
    const channelMatches = obligation.proof.channel === 'audio-ended' ? receipt.state === 'audio-ended' && receipt.segmentId === 'utterance' : receipt.state === 'rendered'
    if (obligation.deliveryTurnId !== receipt.turnId || !channelMatches || !presentationVerified)
      continue
    await applyLifeObligation(tx, { type: 'obligation-verify', id: obligation.id, expectedGeneration: obligation.generation, expectedRevision: obligation.revision, verification: { id: receipt.receiptId, verdict: 'satisfied', kind: 'reminder', evidence: { receiptId: receipt.receiptId, deliveryId: receipt.deliveryId, generation: obligation.generation, channel: receipt.state }, verifiedAt: tx.now, independent: true } })
  }
}
