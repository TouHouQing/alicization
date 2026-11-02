import type { LifeIngress } from '../../../../shared/life-contracts'
import type { ProcedureSource } from './procedure-candidate-repository'

/** Host requirement changes are authority, with the same immutable source binding. */
export function isAcceptedProcedureInput(input: LifeIngress, source: ProcedureSource) {
  if (input.kind === 'user-turn')
    return true
  const change = input.payload
  return input.kind === 'feedback' && input.source === 'execution-criteria-change' && input.status === 'settled'
    && input.id === `work-criteria-change:${input.sourceKey}` && change.planId === source.planId && change.rootObligationId === source.goalId
    && Number.isSafeInteger(change.generation) && Number.isSafeInteger(change.previousGeneration) && Number(change.previousGeneration) >= 1
    && Number(change.generation) === Number(change.previousGeneration) + 1 && Number(change.generation) <= source.generation
    && Number.isSafeInteger(change.planRevision) && Number.isSafeInteger(change.previousRevision) && Number(change.previousRevision) >= 1
    && Number(change.planRevision) === Number(change.previousRevision) + 1 && Number(change.planRevision) <= source.planRevision
    && /^[a-f\d]{64}$/u.test(String(change.bindingHash)) && /^[a-f\d]{64}$/u.test(String(change.contractHash))
    && (change.generation !== source.generation || change.contractHash === source.acceptanceHash)
}
