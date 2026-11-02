import type { ExecutionWorkStop, WorkPlan, WorkSlice } from '../../../../shared/execution-contracts'
import type { ObligationRow } from '../life-obligation-repository'
import type { LifeTransaction } from '../life-transaction'

import { applyLifeIngress } from '../life-ingress-repository'
import { applyLifeObligation } from '../life-obligation-repository'
import { assertLifeId } from '../life-transaction'
import { executionDigest } from './acceptance-compiler'
import { applyExecutionWork } from './work-plan-repository'

/** Resolve a host stop inside the single writer, independent of unrelated life revisions. */
export async function applyExecutionWorkStop(tx: LifeTransaction, command: ExecutionWorkStop) {
  assertLifeId(command.planId)
  assertLifeId(command.requestId)
  if (command.cardId !== tx.cardId || !['pause', 'cancel'].includes(command.action) || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1)
    throw new Error('Invalid work stop binding')
  const row = await tx.get<{ body_json: string }>('SELECT body_json FROM life_work_plans WHERE card_id = ? AND plan_id = ? ORDER BY revision DESC LIMIT 1', [tx.cardId, command.planId])
  const plan: WorkPlan | undefined = row && JSON.parse(row.body_json)
  const goal = plan && await tx.get<ObligationRow>('SELECT * FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, plan.rootObligationId])
  if (!plan || !goal || plan.revision < command.expectedRevision || goal.generation !== plan.obligationGeneration)
    throw new Error('Execution plan changed before it could be stopped')
  const terminal = ['fulfilled', 'cancelled', 'superseded'].includes(goal.status)
  const pauses = await tx.all<{ ingress_id: string, payload_hash: string }>('SELECT ingress_id, payload_hash FROM life_ingress WHERE card_id = ? AND source = \'work-stop\' AND status = \'held\' AND json_extract(payload_ref_json, \'$.planId\') = ? AND json_extract(payload_ref_json, \'$.rootObligationId\') = ?', [tx.cardId, plan.id, goal.obligation_id])
  const markerId = `work-stop:${command.requestId}`
  await applyLifeIngress(tx, { type: 'ingress-accept', ingress: { id: markerId, kind: 'system', source: 'work-stop', sourceKey: command.requestId, occurredAt: tx.now, payload: { bindingHash: executionDigest(command), planId: plan.id, rootObligationId: goal.obligation_id, obligationGeneration: goal.generation, requestedRevision: command.expectedRevision, observedRevision: plan.revision, action: command.action } } })
  if (!terminal && (command.action === 'cancel' || ['accepted', 'waiting', 'in-progress', 'verifying', 'blocked'].includes(goal.status)))
    await applyLifeObligation(tx, { type: 'obligation-update', id: goal.obligation_id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: command.action === 'cancel' ? 'cancelled' : 'blocked' })
  const slices = await tx.all<{ slice_id: string, plan_revision: number, root_obligation_id: string, obligation_generation: number, ingress_id: string, state: WorkSlice['state'], cursor: number, budget: number, attempt_id: string }>('SELECT * FROM life_work_slices WHERE card_id = ? AND plan_id = ? AND state IN (\'ready\',\'running\',\'waiting\')', [tx.cardId, plan.id])
  for (const slice of slices) {
    await applyExecutionWork(tx, { type: 'execution-slice', expectedState: slice.state, slice: { id: slice.slice_id, planId: plan.id, planRevision: slice.plan_revision, rootObligationId: slice.root_obligation_id, obligationGeneration: slice.obligation_generation, ingressId: slice.ingress_id, state: 'stopping', cursor: slice.cursor, budget: slice.budget, attemptId: slice.attempt_id, updatedAt: tx.now } })
  }
  if (command.action === 'cancel' || terminal) {
    for (const pause of pauses)
      await applyLifeIngress(tx, { type: 'ingress-settle', id: pause.ingress_id, status: 'settled', expectedStatus: 'held', expectedPayloadHash: pause.payload_hash })
  }
  await applyLifeIngress(tx, { type: 'ingress-settle', id: markerId, status: command.action === 'pause' && !terminal && !pauses.length ? 'held' : 'settled' })
}
