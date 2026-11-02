import type { LifeTransaction } from '../life-transaction'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { workDelegationThreadId, workStepParentSchema } from './work-delegation-contracts'

/** Child history belongs to one existing goal; it never creates another duty. */
export async function assertWorkStepParentProjection(tx: LifeTransaction, task: { id: string, turn_id: string | null }, raw: unknown) {
  const parent = v.parse(workStepParentSchema, raw)
  if (parent.cardId !== tx.cardId || task.id !== workDelegationThreadId(parent))
    throw new Error('Delegated child identity differs from its parent work responsibility')
  const effect = await tx.get<{ kind: string, turn_id: string, action_id: string, payload_ref_json: string }>('SELECT kind,turn_id,action_id,payload_ref_json FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, parent.effectId])
  const payload = effect ? JSON.parse(effect.payload_ref_json) : null
  const stamp = payload?.actionResponsibility
  const root = await tx.get('SELECT 1 FROM life_obligations WHERE card_id = ? AND obligation_id = ? AND thread_id = ?', [tx.cardId, parent.rootObligationId, parent.rootThreadId])
  if (!effect || effect.kind !== 'execute' || effect.turn_id !== task.turn_id || effect.action_id !== parent.stepId || !root || payload.capabilityId !== parent.capabilityId || executionDigest(payload.parameters) !== parent.inputHash || stamp?.kind !== 'work-step' || stamp.planId !== parent.planId || stamp.planRevision !== parent.planRevision || stamp.rootObligationId !== parent.rootObligationId || stamp.generation !== parent.obligationGeneration || stamp.stepId !== parent.stepId || stamp.attemptId !== parent.attemptId)
    throw new Error('Delegated child has no exact persisted parent work effect')
  if (await tx.get('SELECT 1 FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, `task:${task.id}`]))
    throw new Error('A standalone responsibility cannot be relabeled as a delegated child')
}
