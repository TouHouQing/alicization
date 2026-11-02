export interface ObservedInterfaceEffect {
  locality: 'local' | 'external'
  operation: 'read' | 'edit' | 'activate' | 'submit'
  semantic: 'navigation' | 'selection' | 'file-write' | 'delete' | 'message' | 'publish' | 'upload' | 'payment' | 'unknown'
  password?: boolean
  recipientBound?: boolean
  contentBound?: boolean
  targetFresh: boolean
}

/** Site text can describe an effect; it cannot authorize one. */
export function classifyObservedEffect(input: ObservedInterfaceEffect) {
  if (!input.targetFresh)
    return { state: 'blocked' as const, reason: 'fresh-observation-required' }
  if (input.password && input.operation === 'submit' && !input.contentBound)
    return { state: 'handoff' as const, reason: 'secret-transmission-not-bound' }
  if (['payment', 'delete', 'message', 'publish', 'upload'].includes(input.semantic))
    return { state: 'confirmation' as const, reason: `consequential-${input.semantic}` }
  if (input.locality === 'external' && (input.operation === 'submit' || input.operation === 'activate' && input.semantic === 'unknown'))
    return { state: 'confirmation' as const, reason: 'external-effect-not-proven-read-only' }
  return { state: 'ordinary' as const, reason: 'bounded-observed-local-or-read-action' }
}
