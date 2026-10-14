import type { LifeStateView } from '../../../shared/life-contracts'

export function projectLifeTaskOutcome(view: LifeStateView, threadId: string) {
  const goal = view.obligations.find(item => item.threadId === threadId)
  return goal
    ? {
        obligationId: goal.id,
        generation: goal.generation,
        revision: goal.revision,
        status: goal.status,
        invalidated: Boolean(goal.invalidatedBy),
        verificationId: goal.verification?.id ?? null,
        verdict: goal.verification?.verdict ?? 'unknown',
        independent: goal.verification?.independent ?? false,
        proofKind: goal.proof.kind,
        verifiedAt: goal.verification?.verifiedAt ?? null,
      }
    : null
}

export type LifeTaskOutcome = ReturnType<typeof projectLifeTaskOutcome>
