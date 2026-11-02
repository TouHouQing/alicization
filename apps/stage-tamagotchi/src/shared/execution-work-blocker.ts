import type { ExecutionStateView, WorkPlan, WorkStep } from './execution-contracts'
import type { LifeStateView } from './life-contracts'

import { visualSemanticWindowSource, visualWorkObservationSource, visualWorkRefusalReason } from './visual-work-observation'

export type ExecutionWorkBlockerReason = 'foreground-required' | 'window-changed' | 'observation-required' | 'provider-unavailable' | 'result-unknown'

/** Refresh a literal or bound target only from one accepted window dependency. */
export function nativeWorkObservationSource(plan: WorkPlan, step: WorkStep, results: ExecutionStateView['results']) {
  const parameter = step.capabilityId === 'tool.desktop_type_text' ? 'targetText' : 'text'
  const binding = step.inputBindings?.find(binding => binding.parameter === parameter && binding.path.length === 1 && binding.path[0] === 'elements')
  const sources = plan.steps.filter(read => read.capabilityId === 'tool.desktop_list_interactables'
    && (binding ? read.id === binding.stepId : !step.inputBindings?.length && step.dependsOn.includes(read.id))
    && step.dependsOn.includes(read.id) && typeof read.input.windowTitle === 'string' && read.input.windowTitle.length > 0
    && step.input.windowTitle === read.input.windowTitle && !read.inputBindings?.length
    && results.some(result => result.planId === plan.id && result.planRevision === plan.revision && result.stepId === read.id && result.inputHash === read.inputHash && result.state === 'verified'))
  const latest = sources.filter(read => !sources.some(other => other.nativeWindowSourceStepId === read.id))
  return latest.length === 1 ? { observation: latest[0], binding } : null
}

/** One projection of the current committed operation for both dialogue and UI. */
export function executionWorkBlocker(view: LifeStateView, plan: WorkPlan): { reason: ExecutionWorkBlockerReason, stepId: string, effectId: string | null, canResume: boolean } | null {
  const goal = view.obligations.find(goal => goal.id === plan.rootObligationId)
  if (plan.cardId !== view.cardId || !goal || goal.cardId !== view.cardId || goal.threadId !== plan.rootThreadId || goal.invalidatedBy || goal.generation !== plan.obligationGeneration || goal.proof.acceptance?.contractHash !== plan.acceptanceHash || ['fulfilled', 'cancelled', 'superseded', 'failed'].includes(goal.status))
    return null
  for (const step of plan.steps) {
    const result = view.execution?.results.find(result => result.planId === plan.id && result.planRevision === plan.revision && result.stepId === step.id && result.inputHash === step.inputHash)
    if (!result || !['blocked', 'awaiting-verification'].includes(result.state))
      continue
    if (result.state === 'awaiting-verification')
      return { reason: 'result-unknown', stepId: step.id, effectId: result.effectId, canResume: false }
    const effect = view.effects?.find(effect => effect.id === result.effectId)
    const slice = view.execution?.slices.find(slice => slice.planId === plan.id && slice.planRevision === plan.revision && slice.attemptId === result.attemptId)
    const raw = effect?.receipt?.output
    const output = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
    if (!effect || effect.kind !== 'execute' || effect.status !== 'settled' || effect.actionId !== step.id || !slice || effect.turnId !== slice.ingressId || effect.payload.capabilityId !== step.capabilityId || effect.receipt?.outcome !== 'failure' || output?.ok !== false || output.channel !== 'desktop' || output.operation !== step.capabilityId.replace(/^tool\./u, '') || output.sideEffectState !== 'none' || output.effectMayHaveOccurred === true)
      continue
    let reason: ExecutionWorkBlockerReason | null = null
    if (output.errorCode === 'WINDOWS_UIA_FOREGROUND_REQUIRED' && output.requiresForeground === true && output.effectMayHaveOccurred === false)
      reason = 'foreground-required'
    else if (output.errorCode === 'WINDOWS_UIA_WINDOW_CONTEXT_CHANGED')
      reason = 'window-changed'
    else if (output.errorCode === 'WINDOWS_UIA_OBSERVATION_REQUIRED')
      reason = 'observation-required'
    else if (['tool.desktop_locate_window', 'tool.desktop_pointer_action'].includes(step.capabilityId))
      reason = visualWorkRefusalReason(output)
    if (reason)
      return { reason, stepId: step.id, effectId: effect.id, canResume: reason !== 'window-changed' && Boolean(step.capabilityId === 'tool.desktop_pointer_action' ? visualWorkObservationSource(plan, step, view.execution?.results ?? []) : step.capabilityId === 'tool.desktop_locate_window' ? visualSemanticWindowSource(plan, step, view.execution?.results ?? []) : nativeWorkObservationSource(plan, step, view.execution?.results ?? [])) }
  }
  return null
}
