export type AlicizationAdapterFailureDisposition
  = | {
    kind: 'recover'
    reasonCode: 'SIDE_EFFECT_RECONCILIATION_REQUIRED'
  }
  | {
    kind: 'terminal'
    finalStatus: 'failed' | 'cancelled' | 'dead-lettered'
    reasonCode:
      | 'ADAPTER_EXECUTION_FAILED'
      | 'EXPLICIT_CANCELLATION'
      | 'SIDE_EFFECT_RECONCILIATION_EXHAUSTED'
  }

export interface AlicizationAdapterFailureEvidence {
  effect: 'observe' | 'mutate' | 'high-impact'
  failureKind: 'validation' | 'permission' | 'provider' | 'transport' | 'timeout' | 'protocol' | 'process' | 'remote'
  cancelled: boolean
  sideEffectState: 'none' | 'not-applied' | 'unknown' | 'applied-unverified' | 'applied'
  replaySafety: 'safe' | 'unsafe' | 'unknown'
  retry: {
    attempted: number
    exhausted: boolean
  }
  recovery: {
    attempted: boolean
    outcome: 'pending' | 'recovered' | 'unsupported' | 'exhausted'
  }
}

export function resolveAdapterFailureDisposition(
  input: AlicizationAdapterFailureEvidence,
): AlicizationAdapterFailureDisposition {
  if (input.cancelled) {
    return {
      kind: 'terminal',
      finalStatus: 'cancelled',
      reasonCode: 'EXPLICIT_CANCELLATION',
    }
  }

  const mutationMayHaveApplied = input.effect !== 'observe'
    && (input.sideEffectState === 'unknown' || input.sideEffectState === 'applied-unverified')
  if (
    mutationMayHaveApplied
    && input.replaySafety === 'unsafe'
  ) {
    if (
      input.recovery.outcome === 'unsupported'
      || (input.recovery.attempted && input.recovery.outcome === 'exhausted')
    ) {
      return {
        kind: 'terminal',
        finalStatus: 'dead-lettered',
        reasonCode: 'SIDE_EFFECT_RECONCILIATION_EXHAUSTED',
      }
    }

    return {
      kind: 'recover',
      reasonCode: 'SIDE_EFFECT_RECONCILIATION_REQUIRED',
    }
  }

  return {
    kind: 'terminal',
    finalStatus: 'failed',
    reasonCode: 'ADAPTER_EXECUTION_FAILED',
  }
}
