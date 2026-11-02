import type { ExecutionStateView, WorkPlan, WorkStep } from '../../../../shared/execution-contracts'
import type { LifeEffect } from '../../../../shared/life-contracts'

import { nativeWorkObservationSource } from '../../../../shared/execution-work-blocker'
import { visualSemanticWindowSource, visualWorkObservationSource, visualWorkRefusalReason } from '../../../../shared/visual-work-observation'
import { executionDigest } from './acceptance-compiler'
import { workInputHash } from './work-input-bindings'

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** Focus and bounds may change; the process and window identity may not. */
export function sameNativeWindow(previous: unknown, current: unknown) {
  const before = object(previous)
  const after = object(current)
  if (!before || !after || before.ok !== true || after.ok !== true || before.channel !== 'desktop' || after.channel !== 'desktop' || before.operation !== 'desktop_list_interactables' || after.operation !== before.operation)
    return false
  for (const key of ['windowId', 'processStartTicks', 'windowClass', 'desktop', 'title']) {
    if (!Object.hasOwn(before, key) || typeof before[key] !== 'string' || !before[key] || before[key] !== after[key] || !Object.hasOwn(after, key))
      return false
  }
  return Number.isSafeInteger(before.processId) && Number(before.processId) > 0 && before.processId === after.processId && Object.hasOwn(after, 'processId')
    && (before.ownerWindowId ?? null) === (after.ownerWindowId ?? null)
}

/** Only an explicit host continuation may refresh a proven non-dispatched native refusal. */
export async function reobserveNativeWork(plan: WorkPlan, results: ExecutionStateView['results'], getEffect: (id: string) => Promise<LifeEffect | null>, sourceId: string): Promise<WorkPlan | null> {
  const current = results.filter(result => result.planId === plan.id && result.planRevision === plan.revision)
  if (current.some(result => ['running', 'awaiting-verification'].includes(result.state)))
    return null
  const steps: WorkStep[] = []
  let changed = false
  for (const step of plan.steps) {
    const result = current.find(result => result.stepId === step.id && result.inputHash === step.inputHash)
    if (['tool.desktop_locate_window', 'tool.desktop_pointer_action'].includes(step.capabilityId) && result?.state === 'blocked' && result.effectId) {
      const effect = await getEffect(result.effectId)
      const output = object(effect?.receipt?.output)
      const pointer = visualWorkObservationSource(plan, step, current)
      const window = pointer?.window ?? visualSemanticWindowSource(plan, step, current)
      if (window && effect?.status === 'settled' && effect.payload.capabilityId === step.capabilityId && effect.receipt?.outcome === 'failure' && output?.operation === step.capabilityId.replace(/^tool\./u, '') && visualWorkRefusalReason(output)) {
        const suffix = `${plan.revision + 1}:${executionDigest(step.id).slice(0, 16)}`
        const freshWindow: WorkStep = { ...window, id: `native-reobserve:${suffix}`, nativeWindowSourceStepId: window.id, input: { ...window.input }, dependsOn: [...new Set([...step.dependsOn, window.id])], acceptanceCriterionIds: [], retryMode: 'read-only', state: 'pending', attemptId: null }
        freshWindow.inputHash = workInputHash(freshWindow)
        steps.push(freshWindow)
        let action = step
        if (pointer) {
          const locate: WorkStep = { ...pointer.locate, id: `native-relocate:${suffix}`, input: { ...pointer.locate.input }, inputBindings: pointer.locate.inputBindings?.map(binding => binding.stepId === window.id ? { ...binding, stepId: freshWindow.id } : binding), dependsOn: [...new Set([...pointer.locate.dependsOn, freshWindow.id])], acceptanceCriterionIds: [], retryMode: 'read-only', state: 'pending', attemptId: null }
          locate.inputHash = workInputHash(locate)
          steps.push(locate)
          action = { ...step, dependsOn: [...new Set([...step.dependsOn, locate.id])], inputBindings: step.inputBindings!.map(binding => binding.stepId === pointer.locate.id ? { ...binding, stepId: locate.id } : binding) }
        }
        else {
          action = { ...step, dependsOn: [...new Set([...step.dependsOn, freshWindow.id])], inputBindings: step.inputBindings?.map(binding => binding.stepId === window.id ? { ...binding, stepId: freshWindow.id } : binding) }
        }
        action.inputHash = workInputHash(action)
        steps.push(action)
        changed = true
        continue
      }
    }
    const source = nativeWorkObservationSource(plan, step, current)
    if (!['tool.desktop_click_element', 'tool.desktop_type_text'].includes(step.capabilityId) || result?.state !== 'blocked' || !result.effectId || !source) {
      steps.push(step)
      continue
    }
    const effect = await getEffect(result.effectId)
    const output = object(effect?.receipt?.output)
    const refreshable = output?.errorCode === 'WINDOWS_UIA_OBSERVATION_REQUIRED'
      || (output?.errorCode === 'WINDOWS_UIA_FOREGROUND_REQUIRED' && output.requiresForeground === true && output.effectMayHaveOccurred === false && ((step.capabilityId === 'tool.desktop_click_element' && ['menu-item', 'select'].includes(String(step.input.role))) || (step.capabilityId === 'tool.desktop_type_text' && step.input.role === 'select')))
    if (effect?.status !== 'settled' || effect.payload.capabilityId !== step.capabilityId || effect.receipt?.outcome !== 'failure' || output?.channel !== 'desktop' || output.operation !== step.capabilityId.replace(/^tool\./u, '') || !refreshable || output.effectMayHaveOccurred === true || output.sideEffectState !== 'none') {
      steps.push(step)
      continue
    }
    const { observation, binding } = source
    const id = `native-reobserve:${plan.revision + 1}:${executionDigest(step.id).slice(0, 16)}`
    const fresh: WorkStep = { id, capabilityId: observation.capabilityId, input: { ...observation.input }, nativeWindowSourceStepId: observation.id, inputHash: '', dependsOn: [...new Set([...step.dependsOn, observation.id])], resourceIds: [...observation.resourceIds], acceptanceCriterionIds: [], retryMode: 'read-only', state: 'pending', attemptId: null }
    fresh.inputHash = workInputHash(fresh)
    const action = { ...step, dependsOn: [...new Set([...step.dependsOn, id])], ...(binding ? { inputBindings: step.inputBindings!.map(value => value === binding ? { ...value, stepId: id } : value) } : {}) }
    action.inputHash = workInputHash(action)
    steps.push(fresh, action)
    changed = true
  }
  if (!changed)
    return null
  if (steps.length > 256 || plan.sourceEvidenceRefs.length >= 64)
    throw new Error('Native continuation exceeds the accepted work history budget')
  return { ...plan, revision: plan.revision + 1, steps, sourceEvidenceRefs: [...plan.sourceEvidenceRefs, sourceId] }
}
