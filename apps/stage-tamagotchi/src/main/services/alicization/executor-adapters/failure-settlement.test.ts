import { describe, expect, it } from 'vitest'

import { resolveAdapterFailureDisposition } from './failure-settlement'

describe('adapter failure settlement', () => {
  it.each([
    'provider',
    'transport',
    'timeout',
  ] as const)('keeps transient %s failures without side-effect evidence failed', (failureKind) => {
    expect(resolveAdapterFailureDisposition({
      effect: 'mutate',
      failureKind,
      cancelled: false,
      sideEffectState: 'none',
      replaySafety: 'unknown',
      retry: {
        attempted: 5,
        exhausted: true,
      },
      recovery: {
        attempted: false,
        outcome: 'pending',
      },
    })).toEqual({
      kind: 'terminal',
      finalStatus: 'failed',
      reasonCode: 'ADAPTER_EXECUTION_FAILED',
    })
  })

  it('keeps explicit cancellation cancelled even when side effects are unknown', () => {
    expect(resolveAdapterFailureDisposition({
      effect: 'mutate',
      failureKind: 'process',
      cancelled: true,
      sideEffectState: 'unknown',
      replaySafety: 'unsafe',
      retry: {
        attempted: 0,
        exhausted: false,
      },
      recovery: {
        attempted: false,
        outcome: 'pending',
      },
    })).toEqual({
      kind: 'terminal',
      finalStatus: 'cancelled',
      reasonCode: 'EXPLICIT_CANCELLATION',
    })
  })

  it('requests reconciliation before terminal settlement when side effects are unknown', () => {
    expect(resolveAdapterFailureDisposition({
      effect: 'mutate',
      failureKind: 'remote',
      cancelled: false,
      sideEffectState: 'unknown',
      replaySafety: 'unsafe',
      retry: {
        attempted: 0,
        exhausted: false,
      },
      recovery: {
        attempted: false,
        outcome: 'pending',
      },
    })).toEqual({
      kind: 'recover',
      reasonCode: 'SIDE_EFFECT_RECONCILIATION_REQUIRED',
    })
  })

  it('dead-letters applied but unverified side effects after reconciliation is exhausted', () => {
    expect(resolveAdapterFailureDisposition({
      effect: 'mutate',
      failureKind: 'remote',
      cancelled: false,
      sideEffectState: 'applied-unverified',
      replaySafety: 'unsafe',
      retry: {
        attempted: 0,
        exhausted: false,
      },
      recovery: {
        attempted: true,
        outcome: 'exhausted',
      },
    })).toEqual({
      kind: 'terminal',
      finalStatus: 'dead-lettered',
      reasonCode: 'SIDE_EFFECT_RECONCILIATION_EXHAUSTED',
    })
  })

  it('defaults incomplete evidence to failed instead of manufacturing a dead-letter', () => {
    expect(resolveAdapterFailureDisposition({
      effect: 'high-impact',
      failureKind: 'protocol',
      cancelled: false,
      sideEffectState: 'applied-unverified',
      replaySafety: 'unknown',
      retry: {
        attempted: 0,
        exhausted: false,
      },
      recovery: {
        attempted: true,
        outcome: 'exhausted',
      },
    })).toEqual({
      kind: 'terminal',
      finalStatus: 'failed',
      reasonCode: 'ADAPTER_EXECUTION_FAILED',
    })
  })
})
