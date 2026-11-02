import type { ExecutionWorkStop, WorkPlan } from '../../../../shared/execution-contracts'
import type { LifeStateView } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'

export type WorkStopInput = ExecutionWorkStop

export function workPauseMarkers(view: LifeStateView, plan: WorkPlan) {
  return view.ingress.filter(ingress => ingress.source === 'work-stop' && ingress.status === 'held' && ingress.payload.planId === plan.id && ingress.payload.rootObligationId === plan.rootObligationId)
}

/** Fence input promptly; the writer resolves the exact current stop atomically. */
export async function commitWorkStop(database: AlicizationDbService, raw: WorkStopInput, onBound: (plan: WorkPlan) => void) {
  const input = structuredClone(raw)
  if (input.action !== 'pause' && input.action !== 'cancel')
    throw new TypeError('Unknown work stop action')
  const before = await database.readLifeState({ executionPlanId: input.planId })
  const plan = before.execution?.plans.find(item => item.id === input.planId)
  const goal = plan && before.obligations.find(item => item.id === plan.rootObligationId)
  if (before.cardId !== input.cardId || !plan || !goal || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1 || input.expectedRevision > plan.revision)
    throw new Error('Execution plan changed before it could be stopped')
  onBound(plan)
  // Aborting the child can itself commit receipts and appraisal. A global
  // snapshot CAS must not discard the host's stop behind those valid commits.
  await database.commitLifeState({ cardId: input.cardId, operationKey: `work-stop:${input.requestId}`, changes: [], mutations: [{ type: 'execution-work-stop', command: input }] })
  const view = await database.readLifeState({ executionPlanId: plan.id })
  const runIds = new Set(view.execution?.slices.filter(item => item.planId === plan.id).map(item => item.ingressId))
  const childEffects = [...new Set([...(view.execution?.results.filter(item => item.planId === plan.id && item.effectId).map(item => item.effectId!) ?? []), ...view.effects.filter(item => item.turnId && runIds.has(item.turnId)).map(item => item.id)])]
  return { plan, childEffects, terminal: ['fulfilled', 'cancelled', 'superseded'].includes(goal.status) }
}
