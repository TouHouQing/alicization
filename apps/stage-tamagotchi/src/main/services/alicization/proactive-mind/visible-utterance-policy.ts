import type { AlicizationSelfRevisionStatePatch } from '../self-evolution/state-revision-bus'

export interface AlicizationProactiveVisibleUtteranceDecision {
  version: 'proactive-visible-utterance-policy-v1'
  shouldPersistVisibleUtterance: boolean
  requiresMindAuthoredText: boolean
  action: 'persist' | 'hold' | 'requeue'
  reason: string
}

export function decideAlicizationProactiveVisibleUtterance(input: {
  hasMindAuthoredStructured: boolean
  allowDeterministicVisibleFallback?: boolean
  reason?: string | null
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}): AlicizationProactiveVisibleUtteranceDecision {
  const selfRevisionPatch = input.selfRevisionPatch ?? null
  const selfRevisionProactiveRestraint = Boolean(
    selfRevisionPatch?.lanes.includes('proactive-policy')
    && (
      selfRevisionPatch.proactivePolicy.restraintBias >= 0.12
      || selfRevisionPatch.proactivePolicy.actuationCooldownBias >= 0.12
      || selfRevisionPatch.validation.requiresRevalidation
      || selfRevisionPatch.validation.requiresRollbackCheck
    ),
  )

  if (input.hasMindAuthoredStructured) {
    if (selfRevisionProactiveRestraint) {
      return {
        version: 'proactive-visible-utterance-policy-v1',
        shouldPersistVisibleUtterance: false,
        requiresMindAuthoredText: true,
        action: 'hold',
        reason: input.reason ?? 'active-self-revision-proactive-restraint-holds-visible-utterance',
      }
    }

    return {
      version: 'proactive-visible-utterance-policy-v1',
      shouldPersistVisibleUtterance: true,
      requiresMindAuthoredText: true,
      action: 'persist',
      reason: input.reason ?? 'mind-authored-proactive-utterance',
    }
  }

  return {
    version: 'proactive-visible-utterance-policy-v1',
    shouldPersistVisibleUtterance: false,
    requiresMindAuthoredText: true,
    action: input.allowDeterministicVisibleFallback === true ? 'hold' : 'requeue',
    reason: input.allowDeterministicVisibleFallback === true
      ? input.reason ?? 'deterministic-visible-fallback-held-infra-only'
      : input.reason ?? 'proactive-visible-utterance-requires-provider-mind',
  }
}
