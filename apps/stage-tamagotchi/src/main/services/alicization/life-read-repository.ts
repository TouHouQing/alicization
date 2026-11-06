import type { LifeEffect, LifeIngress, LifeSoulActivation, LifeStateReadScope } from '../../../shared/life-contracts'
import type { ObligationRow } from './life-obligation-repository'
import type { LifeTransaction } from './life-transaction'

import { readExecutionWork } from './execution/work-plan-repository'
import { mapLifeObligation } from './life-obligation-repository'

export interface IngressRow { ingress_id: string, kind: LifeIngress['kind'], source: string, source_key: string, payload_hash: string, payload_ref_json: string, occurred_at: number, observed_at: number, status: LifeIngress['status'] }
export interface EffectRow { effect_id: string, operation_key: string, kind: LifeEffect['kind'], turn_id: string | null, action_id: string | null, generation: number, status: LifeEffect['status'], payload_ref_json: string, receipt_ref_json: string | null, lease_until: number | null }

export async function readLifeDomains(tx: Pick<LifeTransaction, 'all' | 'cardId'>, scope?: LifeStateReadScope) {
  const requestedRoots = [...new Set([...(scope?.obligationIds ?? []), ...(scope?.obligationId ? [scope.obligationId] : [])])]
  const execution = await readExecutionWork(tx, scope?.executionPlanId, requestedRoots)
  const roots = [...new Set([...execution.plans.map(plan => plan.rootObligationId), ...requestedRoots])]
  // Never cap unfinished responsibilities. Historical presentation is a window;
  // accepted plans and explicit host commands retain their exact durable roots.
  const requested = roots.length ? ` UNION SELECT obligation_id FROM life_obligations WHERE card_id = ? AND obligation_id IN (${roots.map(() => '?').join(',')})` : ''
  const obligations = await tx.all<ObligationRow>(`WITH visible AS (
    SELECT obligation_id FROM life_obligations WHERE card_id = ? AND status NOT IN ('fulfilled','cancelled','superseded')
    UNION SELECT obligation_id FROM (SELECT obligation_id FROM life_obligations WHERE card_id = ? AND status IN ('fulfilled','cancelled','superseded') ORDER BY updated_at DESC, obligation_id DESC LIMIT 100)
    ${requested}
  ) SELECT o.* FROM life_obligations o JOIN visible v ON v.obligation_id=o.obligation_id WHERE o.card_id=? ORDER BY o.updated_at DESC,o.obligation_id DESC`, [tx.cardId, tx.cardId, ...(roots.length ? [tx.cardId, ...roots] : []), tx.cardId])
  const ingress = await tx.all<IngressRow>(`SELECT i.* FROM life_ingress i WHERE i.card_id = ? AND (i.status != 'settled' OR i.ingress_id IN (SELECT ingress_id FROM life_ingress WHERE card_id = ? ORDER BY observed_at DESC LIMIT 100) OR (i.source = 'execution-user-review' AND EXISTS (SELECT 1 FROM life_obligations o WHERE o.card_id=i.card_id AND o.obligation_id=json_extract(i.payload_ref_json,'$.obligationId') AND o.generation=json_extract(i.payload_ref_json,'$.obligationGeneration') AND json_extract(o.required_proof_json,'$.acceptance.contractHash')=json_extract(i.payload_ref_json,'$.contractHash')) AND i.rowid = (SELECT j.rowid FROM life_ingress j WHERE j.card_id=i.card_id AND j.source='execution-user-review' AND json_extract(j.payload_ref_json,'$.contractHash')=json_extract(i.payload_ref_json,'$.contractHash') AND json_extract(j.payload_ref_json,'$.criterionId')=json_extract(i.payload_ref_json,'$.criterionId') ORDER BY j.observed_at DESC,j.rowid DESC LIMIT 1))) ORDER BY i.observed_at DESC,i.rowid DESC`, [tx.cardId, tx.cardId])
  const effects = await tx.all<EffectRow>(`SELECT * FROM life_effect_intents WHERE card_id = ? AND (status IN ('prepared','claimed','dispatched','uncertain') OR effect_id IN (SELECT effect_id FROM life_effect_intents WHERE card_id = ? ORDER BY updated_at DESC LIMIT 100)) ORDER BY created_at DESC`, [tx.cardId, tx.cardId])
  const skillState = await tx.all<IngressRow>(`SELECT i.* FROM life_ingress i WHERE i.card_id = ? AND i.source IN ('execution-skill-state','execution-procedure-index') AND i.status = 'settled' AND i.rowid = (SELECT j.rowid FROM life_ingress j WHERE j.card_id=i.card_id AND j.source=i.source AND j.status='settled' ORDER BY j.observed_at DESC,j.rowid DESC LIMIT 1) ORDER BY i.observed_at DESC,i.rowid DESC`, [tx.cardId])
  for (const state of skillState) {
    if (!ingress.some(item => item.ingress_id === state.ingress_id))
      ingress.push(state)
  }
  return {
    execution,
    soulActivations: (await tx.all<LifeSoulActivation & { authorization: string }>(`SELECT operation_id AS id, base_hash AS baseHash, target_hash AS targetHash, staged_relative_path AS stagedPath, backup_relative_path AS backupPath, source_refs_json AS authorization, status, target_soul_revision AS soulRevision FROM life_soul_activation_intents WHERE card_id = ? AND status IN ('prepared','file-replaced','conflicted') ORDER BY created_at`, [tx.cardId])).map(({ authorization, ...intent }) => { const parsed = JSON.parse(authorization); return { ...intent, ...(parsed?.proposalId ? { personaAuthorization: parsed } : {}), ...(parsed?.developmentId ? { developmentAuthorization: parsed } : {}) } }),
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
