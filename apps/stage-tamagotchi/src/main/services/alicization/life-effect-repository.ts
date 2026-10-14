import type { LifeEffect, LifeMutation } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import { bindLifePersonaProposalEvidence } from './life-persona-evidence'
import { assertLifeId, assertLifeTime, boundedJson } from './life-transaction'

const transitions: Record<LifeEffect['status'], LifeEffect['status'][]> = {
  prepared: ['claimed', 'cancelled'],
  claimed: ['dispatched', 'cancelled', 'failed'],
  dispatched: ['settled', 'uncertain', 'failed'],
  uncertain: ['settled', 'failed'],
  settled: [],
  cancelled: [],
  failed: [],
}

export async function applyLifeEffect(tx: LifeTransaction, mutation: Extract<LifeMutation, { type: 'effect-prepare' | 'effect-transition' }>) {
  if (mutation.type === 'effect-prepare') {
    const effect = mutation.effect
    assertLifeId(effect.id)
    assertLifeId(effect.operationKey)
    if (!Number.isSafeInteger(effect.generation) || effect.generation < 0)
      throw new TypeError('Effect generation is invalid')
    const serialized = boundedJson(effect.payload)
    const digest = createHash('sha256').update(serialized).digest('hex')
    const existing = await tx.get<{ intent_hash: string, effect_id: string }>('SELECT intent_hash, effect_id FROM life_effect_intents WHERE card_id = ? AND operation_key = ?', [tx.cardId, effect.operationKey])
    if (existing) {
      if (existing.intent_hash !== digest || existing.effect_id !== effect.id)
        throw new Error('Effect operation key was reused with different parameters')
      return
    }
    if (effect.kind === 'reflect' && effect.payload.format === 'persona-revision-proposal-v1')
      await bindLifePersonaProposalEvidence(tx, effect)
    await tx.run(`INSERT INTO life_effect_intents(card_id, effect_id, operation_key, kind, intent_hash, payload_ref_json, producer_commit_id, turn_id, action_id, generation, guard_read_set_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'prepared', ?, ?)`, [tx.cardId, effect.id, effect.operationKey, effect.kind, digest, serialized, tx.commitId, effect.turnId, effect.actionId, effect.generation, tx.now, tx.now])
    return
  }
  assertLifeId(mutation.id)
  if (!transitions[mutation.expected]?.includes(mutation.status))
    throw new Error('Invalid effect transition')
  const row = await tx.get<{ status: LifeEffect['status'] }>('SELECT status FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, mutation.id])
  if (row?.status !== mutation.expected)
    throw new Error('Effect fence became stale')
  if (mutation.leaseUntil != null)
    assertLifeTime(mutation.leaseUntil)
  if (mutation.status === 'settled' && !mutation.receipt)
    throw new Error('Settled effect requires an observation receipt')
  await tx.run(`UPDATE life_effect_intents SET status = ?, lease_until = ?, attempt_count = attempt_count + ?, receipt_ref_json = ?, updated_at = ? WHERE card_id = ? AND effect_id = ? AND status = ?`, [mutation.status, mutation.leaseUntil ?? null, mutation.status === 'claimed' ? 1 : 0, mutation.receipt ? boundedJson(mutation.receipt) : null, tx.now, tx.cardId, mutation.id, mutation.expected])
}
