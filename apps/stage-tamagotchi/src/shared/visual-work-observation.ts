import type { ExecutionStateView, WorkPlan, WorkStep } from './execution-contracts'

/** Only proven non-dispatch refusals can request a fresh reviewed image. */
export function visualWorkRefusalReason(output: Record<string, unknown>) {
  if (output.ok !== false || output.channel !== 'desktop' || output.sideEffectState !== 'none' || output.effectMayHaveOccurred !== false)
    return null
  if (output.errorCode === 'WINDOWS_VISUAL_GROUNDING_UNAVAILABLE')
    return 'provider-unavailable' as const
  if (output.errorCode === 'WINDOWS_VISUAL_APPROVED_FOREGROUND_REQUIRED' && output.requiresForeground === true)
    return 'foreground-required' as const
  if (['WINDOWS_VISUAL_OBSERVATION_UNAVAILABLE', 'WINDOWS_VISUAL_OBSERVATION_EXPIRED', 'WINDOWS_VISUAL_FRESH_SEMANTIC_WINDOW_REQUIRED', 'WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED', 'WINDOWS_VISUAL_OWNER_CONTEXT_REQUIRED', 'WINDOWS_VISUAL_OWNER_CONTEXT_CHANGED', 'WINDOWS_VISUAL_SOURCE_OBSERVATION_CHANGED', 'WINDOWS_VISUAL_SOURCE_IMAGE_CHANGED_DURING_GROUNDING', 'WINDOWS_VISUAL_PROVIDER_TARGET_CHANGED', 'WINDOWS_VISUAL_WINDOW_IDENTITY_CHANGED', 'WINDOWS_VISUAL_WINDOW_NOT_VISIBLE', 'WINDOWS_VISUAL_POINT_OUTSIDE_VISIBLE_DISPLAY', 'WINDOWS_POINTER_OBSERVATION_CHANGED', 'WINDOWS_POINTER_DISPLAYS_CHANGED', 'WINDOWS_POINTER_SURFACE_CHANGED'].includes(String(output.errorCode)))
    return 'observation-required' as const
  return null
}

/** Follow the accepted dependency graph; another work's last window is not a source. */
export function visualSemanticWindowSource(plan: WorkPlan, locate: WorkStep, results: ExecutionStateView['results']) {
  if (locate.capabilityId !== 'tool.desktop_locate_window' || plan.steps.length > 256)
    return null
  const steps = new Map(plan.steps.map(step => [step.id, step]))
  if (steps.size !== plan.steps.length)
    return null
  const memo = new Map<string, Set<string>>()
  const visiting = new Set<string>()
  function ancestors(id: string): Set<string> {
    if (visiting.has(id))
      throw new Error('Visual work dependency cycle')
    const cached = memo.get(id)
    if (cached)
      return cached
    const step = steps.get(id)
    if (!step)
      throw new Error('Visual work dependency is absent')
    visiting.add(id)
    const found = new Set<string>()
    for (const dependency of step.dependsOn) {
      found.add(dependency)
      for (const ancestor of ancestors(dependency))
        found.add(ancestor)
    }
    visiting.delete(id)
    memo.set(id, found)
    return found
  }
  try {
    const dependencies = ancestors(locate.id)
    const candidates = plan.steps.filter(step => dependencies.has(step.id) && step.capabilityId === 'tool.desktop_list_interactables'
      && results.some(result => result.planId === plan.id && result.planRevision === plan.revision && result.stepId === step.id && result.inputHash === step.inputHash && result.state === 'verified'))
    const latest = candidates.filter(step => !candidates.some(other => other.id !== step.id && ancestors(other.id).has(step.id)))
    return latest.length === 1 ? latest[0] : null
  }
  catch {
    return null
  }
}

/** A consumed image can be renewed only from its actual accepted locate dependency. */
export function visualWorkObservationSource(plan: WorkPlan, step: WorkStep, results: ExecutionStateView['results']) {
  if (step.capabilityId !== 'tool.desktop_pointer_action')
    return null
  const bindings = step.inputBindings?.filter(binding => binding.parameter === 'observationId' && !binding.select && binding.path.length === 1 && binding.path[0] === 'observationId') ?? []
  if (bindings.length !== 1)
    return null
  const binding = bindings[0]
  const locate = plan.steps.find(source => source.id === binding.stepId && source.capabilityId === 'tool.desktop_locate_window' && step.dependsOn.includes(source.id)
    && results.some(result => result.planId === plan.id && result.planRevision === plan.revision && result.stepId === source.id && result.inputHash === source.inputHash && result.state === 'verified'))
  if (!locate)
    return null
  const window = visualSemanticWindowSource(plan, locate, results)
  return window ? { locate, window, binding } : null
}
