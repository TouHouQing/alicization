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
}): AlicizationProactiveVisibleUtteranceDecision {
  if (input.hasMindAuthoredStructured) {
    return {
      version: 'proactive-visible-utterance-policy-v1',
      shouldPersistVisibleUtterance: true,
      requiresMindAuthoredText: true,
      action: 'persist',
      reason: input.reason ?? 'mind-authored-proactive-utterance',
    }
  }

  if (input.allowDeterministicVisibleFallback === true) {
    return {
      version: 'proactive-visible-utterance-policy-v1',
      shouldPersistVisibleUtterance: false,
      requiresMindAuthoredText: false,
      action: 'hold',
      reason: input.reason ?? 'explicit-deterministic-visible-fallback-held',
    }
  }

  return {
    version: 'proactive-visible-utterance-policy-v1',
    shouldPersistVisibleUtterance: false,
    requiresMindAuthoredText: true,
    action: 'requeue',
    reason: input.reason ?? 'proactive-visible-utterance-requires-provider-mind',
  }
}
