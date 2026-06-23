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

  const relationshipWeighted = selfRevisionPatch.domain === 'relationship'
    || selfRevisionPatch.lanes.includes('relationship-posture')
    || selfRevisionPatch.lanes.includes('response-posture')
    || selfRevisionPatch.reasonCodes.includes('domain:relationship')
    || selfRevisionPatch.reasonCodes.includes('remembered-familiarity-restraint')
  if (!relationshipWeighted)
    return false

  return (selfRevisionPatch.memoryPolicy.provenanceLabelBias ?? 0) >= 0.14
    && (selfRevisionPatch.relationshipPosture.closenessCapBias ?? 0) >= 0.14
}

function hasSameHerContinuityVisibleHold(selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null) {
  if (!selfRevisionPatch?.projectStateContinuity)
    return false

  const relationshipWeighted = selfRevisionPatch.domain === 'relationship'
    || selfRevisionPatch.domain === 'dialogue-style'
    || selfRevisionPatch.lanes.includes('relationship-posture')
    || selfRevisionPatch.lanes.includes('response-posture')
    || selfRevisionPatch.reasonCodes.includes('domain:relationship')
    || selfRevisionPatch.reasonCodes.includes('same-her-emotional-closure-carry-active')
    || selfRevisionPatch.reasonCodes.includes('same-her-hold-detail-active')
    || selfRevisionPatch.reasonCodes.includes('same-her-baseline')
  if (!relationshipWeighted)
    return false

  const continuity = selfRevisionPatch.projectStateContinuity
  const combined = [
    continuity.sameHerSelfLine,
    continuity.sameHerDriftRisk,
    continuity.emotionalClosureCue,
    continuity.sameHerHoldDetail,
    continuity.continuityGuard,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  const hasSameHerLine = /same[- ]her|same living line|one living line|one continuous her|同一个她|同一个 her/u.test(combined)
  const antiShellRisk = /generic assistant shell|generic helper shell|generic helper voice|project-summary voice|reopen from scratch|without reopening from scratch/u.test(combined)
  const repairFirstCarry = /repair-before-closeness|measured-return|lower-pressure|leave more room/u.test(combined)

  return continuity.continuityPressure >= 0.62
    && hasSameHerLine
    && (antiShellRisk || repairFirstCarry)
}

export function decideAlicizationProactiveVisibleUtterance(input: {
  hasMindAuthoredStructured: boolean
  allowDeterministicVisibleFallback?: boolean
  preferPresenceOnlyHold?: boolean
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
  const selfRevisionSameHerContinuityHold = hasSameHerContinuityVisibleHold(selfRevisionPatch)

  if (input.preferPresenceOnlyHold === true) {
    return {
      version: 'proactive-visible-utterance-policy-v1',
      shouldPersistVisibleUtterance: false,
      requiresMindAuthoredText: true,
      action: 'hold',
      reason: input.reason ?? 'proactive-visible-presence-without-utterance',
    }
  }

  if (input.hasMindAuthoredStructured) {
    if (selfRevisionSameHerContinuityHold || selfRevisionProactiveRestraint || selfRevisionRememberedFamiliarityRestraint) {
      return {
        version: 'proactive-visible-utterance-policy-v1',
        shouldPersistVisibleUtterance: false,
        requiresMindAuthoredText: true,
        action: 'hold',
        reason: input.reason ?? (
          selfRevisionSameHerContinuityHold
            ? 'active-self-revision-same-her-continuity-holds-visible-utterance'
            : selfRevisionRememberedFamiliarityRestraint
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
