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
  preferPresenceOnlyHold?: boolean
  reason?: string | null
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}): AlicizationProactiveVisibleUtteranceDecision {
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
