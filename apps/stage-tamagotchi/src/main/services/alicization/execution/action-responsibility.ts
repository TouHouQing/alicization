import type { LifeIngress, LifeStateView } from '../../../../shared/life-contracts'

import { executionDigest } from './acceptance-compiler'

/** Bind dispatch to its responsibility, without revoking on unrelated updates. */
export function actionResponsibility(input: { view: LifeStateView, ingress: LifeIngress | null, turnId: string, actionId: string, forReceipt?: boolean }) {
  const { view, ingress, turnId, actionId, forReceipt } = input
  const sourceStates = forReceipt ? ['accepted', 'processing', 'settled'] : ['accepted', 'processing']
  if (ingress?.id === `user:${turnId}`) {
    if (ingress.kind !== 'user-turn' || !sourceStates.includes(ingress.status))
      throw new Error('Action source was ended or withdrawn before adapter dispatch')
    return { kind: 'user-turn', ingressId: ingress.id, payloadHash: ingress.payloadHash }
  }
  if (turnId.startsWith('task-run:')) {
    if (ingress?.id !== turnId || ingress.kind !== 'task-run' || ingress.source !== 'work-plan-scheduler' || !sourceStates.includes(ingress.status))
      throw new Error('Action work window ended before adapter dispatch; no active user input or accepted local responsibility')
    const sliceStates = forReceipt ? ['running', 'yielded', 'waiting', 'stopped'] : ['running']
    const slice = view.execution?.slices.find(item => item.ingressId === turnId && sliceStates.includes(item.state))
    const plan = slice && view.execution?.plans.find(item => item.id === slice.planId && item.revision === slice.planRevision)
    const goal = plan && view.obligations.find(item => item.id === plan.rootObligationId && item.generation === plan.obligationGeneration)
    const step = plan?.steps.find(item => item.id === actionId)
    const goalStates = forReceipt ? ['accepted', 'in-progress', 'verifying', 'fulfilled'] : ['accepted', 'in-progress', 'verifying']
    if (!slice || !plan || !goal || !step || slice.rootObligationId !== goal.id || slice.obligationGeneration !== goal.generation || goal.invalidatedBy || !goalStates.includes(goal.status))
      throw new Error('Action responsibility changed before adapter dispatch')
    return { kind: 'work-step', ingressId: ingress.id, payloadHash: ingress.payloadHash, rootObligationId: goal.id, generation: goal.generation, planId: plan.id, planRevision: plan.revision, acceptanceHash: plan.acceptanceHash, stepId: step.id, inputHash: step.inputHash, attemptId: slice.attemptId, sourceHash: executionDigest(plan.sourceEvidenceRefs) }
  }
  const goalStates = forReceipt ? ['accepted', 'in-progress', 'verifying', 'fulfilled'] : ['accepted', 'in-progress']
  const goal = view.obligations.find(item => item.threadId === turnId && !item.invalidatedBy && goalStates.includes(item.status))
  if (!goal)
    throw new Error('Action has neither an active user input nor an accepted local responsibility')
  return { kind: 'task', rootObligationId: goal.id, generation: goal.generation, proofHash: executionDigest(goal.proof) }
}

export type ActionResponsibility = ReturnType<typeof actionResponsibility>
