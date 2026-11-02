import type { LifeEffect, LifeIngress, LifeObligation } from '../../../../shared/life-contracts'
import type { ObligationRow } from '../life-obligation-repository'
import type { EffectRow, IngressRow } from '../life-read-repository'
import type { LifeTransaction } from '../life-transaction'

import { createHash } from 'node:crypto'

import { mapLifeObligation } from '../life-obligation-repository'
import { mapLifeEffect, mapLifeIngress } from '../life-read-repository'
import { assertLifeId } from '../life-transaction'

// Recovery receipts have a larger stored budget than generated work contracts.
export const hostRecoveryDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export function hostRecoveryBinding(cardId: string, effect: LifeEffect, source: LifeIngress | null, goals: LifeObligation[]) {
  return hostRecoveryDigest({ cardId, effect, source: source ? { id: source.id, status: source.status, payloadHash: source.payloadHash } : null, goals: goals.map(goal => ({ id: goal.id, generation: goal.generation, revision: goal.revision, status: goal.status })).sort((left, right) => left.id.localeCompare(right.id)) })
}

/** Recheck only the reviewed effect/source/responsibilities in the writer transaction. */
export async function assertHostRecoveryBinding(tx: LifeTransaction, input: { effectId: string, binding: string }) {
  assertLifeId(input.effectId)
  if (!/^[a-f\d]{64}$/u.test(input.binding))
    throw new Error('Invalid recovery confirmation binding')
  const row = await tx.get<EffectRow>('SELECT * FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, input.effectId])
  if (!row || row.kind !== 'execute' || row.status !== 'uncertain')
    throw new Error('Recovery confirmation changed during commit; review the operation again')
  const effect = mapLifeEffect(row)
  const sourceId = effect.turnId ? effect.turnId.startsWith('task-run:') ? effect.turnId : `user:${effect.turnId}` : null
  const ingress = sourceId ? await tx.get<IngressRow>('SELECT * FROM life_ingress WHERE card_id = ? AND ingress_id = ?', [tx.cardId, sourceId]) : undefined
  const source = ingress ? mapLifeIngress(ingress) : null
  const rootId = typeof source?.payload.rootObligationId === 'string' ? source.payload.rootObligationId : null
  const rows = await tx.all<ObligationRow>('SELECT * FROM life_obligations WHERE card_id = ? AND (obligation_id = ? OR (? IS NOT NULL AND (thread_id = ? OR json_extract(source_ref_json, \'$.turnId\') = ?)))', [tx.cardId, rootId, effect.turnId, effect.turnId, effect.turnId])
  const goals = rows.map(goal => mapLifeObligation(tx.cardId, goal))
  if (hostRecoveryBinding(tx.cardId, effect, source, goals) !== input.binding)
    throw new Error('Recovery confirmation changed during commit; review the operation again')
}
