import type { AlicizationSelfRevisionStatePatch } from '../self-evolution/state-revision-bus'

export interface AlicizationProactiveVisibleUtteranceDecision {
  version: 'proactive-visible-utterance-policy-v1'
  shouldPersistVisibleUtterance: boolean
  requiresMindAuthoredText: boolean
  action: 'persist' | 'hold' | 'requeue'
  reason: string
}

function hasRememberedFamiliarityRestraint(selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null) {
  if (!selfRevisionPatch)
    return false

  return (selfRevisionPatch.memoryPolicy.provenanceLabelBias ?? 0) >= 0.14
    && (selfRevisionPatch.relationshipPosture.closenessCapBias ?? 0) >= 0.14
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
  const selfRevisionRememberedFamiliarityRestraint = hasRememberedFamiliarityRestraint(selfRevisionPatch)

  if (input.hasMindAuthoredStructured) {
    if (selfRevisionProactiveRestraint || selfRevisionRememberedFamiliarityRestraint) {
      return {
        version: 'proactive-visible-utterance-policy-v1',
        shouldPersistVisibleUtterance: false,
        requiresMindAuthoredText: true,
        action: 'hold',
        reason: input.reason ?? (
          selfRevisionRememberedFamiliarityRestraint
            ? 'active-self-revision-remembered-familiarity-restraint-holds-visible-utterance'
            : 'active-self-revision-proactive-restraint-holds-visible-utterance'
        ),
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
