import type { LifeEffect, LifeIngress, LifeSoulActivation } from '../../../shared/life-contracts'
import type { ObligationRow } from './life-obligation-repository'
import type { LifeTransaction } from './life-transaction'

import { mapLifeObligation } from './life-obligation-repository'

export interface IngressRow { ingress_id: string, kind: LifeIngress['kind'], source: string, source_key: string, payload_hash: string, payload_ref_json: string, occurred_at: number, observed_at: number, status: LifeIngress['status'] }
export interface EffectRow { effect_id: string, operation_key: string, kind: LifeEffect['kind'], turn_id: string | null, action_id: string | null, generation: number, status: LifeEffect['status'], payload_ref_json: string, receipt_ref_json: string | null, lease_until: number | null }

export async function readLifeDomains(tx: Pick<LifeTransaction, 'all' | 'cardId'>) {
  const obligations = await tx.all<ObligationRow>('SELECT * FROM life_obligations WHERE card_id = ? ORDER BY updated_at DESC', [tx.cardId])
  const ingress = await tx.all<IngressRow>(`SELECT * FROM life_ingress WHERE card_id = ? AND (status != 'settled' OR ingress_id IN (SELECT ingress_id FROM life_ingress WHERE card_id = ? ORDER BY observed_at DESC LIMIT 100)) ORDER BY observed_at DESC`, [tx.cardId, tx.cardId])
  const effects = await tx.all<EffectRow>(`SELECT * FROM life_effect_intents WHERE card_id = ? AND (status IN ('prepared','claimed','dispatched','uncertain') OR effect_id IN (SELECT effect_id FROM life_effect_intents WHERE card_id = ? ORDER BY updated_at DESC LIMIT 100)) ORDER BY created_at DESC`, [tx.cardId, tx.cardId])
  return {
    soulActivations: (await tx.all<LifeSoulActivation & { authorization: string }>(`SELECT operation_id AS id, base_hash AS baseHash, target_hash AS targetHash, staged_relative_path AS stagedPath, backup_relative_path AS backupPath, source_refs_json AS authorization, status, target_soul_revision AS soulRevision FROM life_soul_activation_intents WHERE card_id = ? AND status IN ('prepared','file-replaced','conflicted') ORDER BY created_at`, [tx.cardId])).map(({ authorization, ...intent }) => { const parsed = JSON.parse(authorization); return { ...intent, ...(parsed?.proposalId ? { personaAuthorization: parsed } : {}) } }),
    obligations: obligations.map(row => mapLifeObligation(tx.cardId, row)),
    ingress: ingress.map(mapLifeIngress),
    effects: effects.map(mapLifeEffect),
  }
}

export function mapLifeIngress(row: IngressRow): LifeIngress {
  return { id: row.ingress_id, kind: row.kind, source: row.source, sourceKey: row.source_key, payloadHash: row.payload_hash, payload: JSON.parse(row.payload_ref_json), occurredAt: row.occurred_at, observedAt: row.observed_at, status: row.status }
}
export function mapLifeEffect(row: EffectRow): LifeEffect {
  return { id: row.effect_id, operationKey: row.operation_key, kind: row.kind, turnId: row.turn_id, actionId: row.action_id, generation: row.generation, status: row.status, payload: JSON.parse(row.payload_ref_json), receipt: row.receipt_ref_json ? JSON.parse(row.receipt_ref_json) : null, leaseUntil: row.lease_until }
}
