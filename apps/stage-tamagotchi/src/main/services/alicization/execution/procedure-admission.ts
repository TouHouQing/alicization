import type { AlicizationTaskThreadRecord } from '../../../../shared/eventa'
import type { LifeStateView } from '../../../../shared/life-contracts'

function includesUnattributedRecovery(view: LifeStateView, obligationId: string) {
  const plans = new Set(view.execution?.plans.filter(item => item.rootObligationId === obligationId).map(item => item.id))
  // Matching present state proves delivery; it does not prove this action
  // authored that state or establish a repeatable successful procedure.
  return view.execution?.results.some(item => plans.has(item.planId) && (item.output.recoveredFromReality === true || item.output.hostTakenOver === true)) === true
}

/**
 * Execution status is transport history. Only the current independently verified
 * responsibility may teach a successful procedure or influence channel routing.
 */
export function admitVerifiedExecutionProcedure(thread: AlicizationTaskThreadRecord, view: LifeStateView | null) {
  if (!view || thread.status !== 'completed' || !thread.attemptId)
    return false
  const goal = view.obligations.find(item => item.threadId === thread.id)
  return Boolean(goal
    && goal.cardId === view.cardId
    && goal.sourceAttemptId === thread.attemptId
    && !goal.invalidatedBy
    && goal.status === 'fulfilled'
    && goal.verification?.verdict === 'satisfied'
    && goal.verification.independent
    && !includesUnattributedRecovery(view, goal.id)
    && goal.verification.verifiedAt >= thread.createdAt)
}

export function admitProcedureEvidence(metadata: Record<string, unknown> | null | undefined, view: LifeStateView | null) {
  const binding = metadata?.execution as { obligationId?: string, generation?: number, attemptId?: string, verificationId?: string } | undefined
  if (!binding || !view)
    return false
  const goal = view.obligations.find(item => item.id === binding.obligationId)
  return Boolean(goal && goal.cardId === view.cardId && goal.generation === binding.generation && goal.sourceAttemptId && goal.sourceAttemptId === binding.attemptId && !goal.invalidatedBy && goal.status === 'fulfilled' && goal.verification?.verdict === 'satisfied' && goal.verification.independent && goal.verification.id === binding.verificationId && !includesUnattributedRecovery(view, goal.id))
}
