import type { LifeStateView } from '../../../../shared/life-contracts'

import { executionDigest } from './acceptance-compiler'
import { isDeclaredWorkReference } from './declared-work-reference'
import { executionWorkAcknowledgment } from './work-acknowledgment'
import { normalizeWorkProposal } from './work-plan-tool'

/** A successful plan tool admits work; it never proves any business step ran. */
export function acceptedWorkPlanAdmissions(view: LifeStateView, turnId: string) {
  const source = `user:${turnId}`
  if (!view.ingress.some(item => item.id === source && item.kind === 'user-turn' && ['accepted', 'processing'].includes(item.status)))
    return []
  return view.effects.flatMap((effect) => {
    if (effect.kind !== 'execute' || effect.turnId !== turnId || effect.status !== 'settled' || effect.receipt?.outcome !== 'success' || effect.payload.capabilityId !== 'tool.life_execute_work_plan')
      return []
    const parameters = effect.payload.parameters as Record<string, unknown> | undefined
    const output = effect.receipt.output as Record<string, unknown> | undefined
    const reference = parameters && isDeclaredWorkReference(parameters) ? parameters : null
    if (!parameters || (!reference && (!Array.isArray(parameters.criteria) || !Array.isArray(parameters.steps))) || !output || output.status !== 'accepted')
      return []
    const plan = view.execution?.plans.find(item => item.id === output.planId && item.rootThreadId === output.rootThreadId && item.sourceEvidenceRefs.includes(source))
    const goal = plan && view.obligations.find(item => item.id === plan.rootObligationId && item.generation === plan.obligationGeneration)
    const acknowledgment = goal && executionWorkAcknowledgment(view, goal)
    const contract = acknowledgment && view.execution?.contracts.find(item => item.contractHash === acknowledgment.acceptanceHash)
    if (!plan || !goal || !acknowledgment || !contract?.sourceInputIds.includes(source) || (reference ? reference.sourceInputId !== source : parameters.goal !== goal.summary))
      return []
    // Compare the original declarations, excluding runtime cursors and results.
    // A revised contract or another accepted effect cannot borrow this receipt.
    const steps = plan.steps.map(({ id, dependsOn, capabilityId, input, inputBindings, acceptanceCriterionIds }) => ({ id, dependsOn, capabilityId, input, ...(inputBindings ? { inputBindings } : {}), acceptanceCriterionIds }))
    let normalized: ReturnType<typeof normalizeWorkProposal> | undefined
    if (!reference) {
      try { normalized = normalizeWorkProposal(parameters) }
      catch { return [] }
    }
    const matchingParameters = reference
      ? reference.proposalHash === executionDigest({ goal: goal.summary, criteria: contract.criteria, steps })
      : executionDigest(normalized!.criteria) === executionDigest(contract.criteria) && executionDigest(normalized!.steps) === executionDigest(steps)
    if (!matchingParameters)
      return []
    return [{ binding: { kind: 'effect' as const, id: effect.id, version: String(effect.generation) }, responsibility: { kind: 'obligation' as const, id: goal.id, version: String(goal.generation) }, planId: plan.id, planRevision: plan.revision, parametersHash: executionDigest(parameters), scope: 'accepted-work-plan-only-no-step-or-goal-completion' }]
  })
}
