import type { AlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'

import { describe, expect, it } from 'vitest'

import { deriveAlicizationMemoryClosureDiscipline } from './alicization-memory-closure-discipline'

function ledger(overrides: Partial<AlicizationMemoryResolutionLedger> = {}): AlicizationMemoryResolutionLedger {
  return {
    version: 'memory-resolution-ledger-v1',
    producedAt: 1,
    dominantClusterId: 'cluster:stable',
    dominantClusterSummary: 'Stable remembered seam',
    competingClusterId: null,
    competingClusterSummary: null,
    candidates: [],
    selectedCandidates: [],
    rejectedCandidates: [],
    finalSurfacePolicy: 'answer-anchoring',
    shouldStayInward: false,
    shouldDelayUntilAfterPayoff: false,
    stableCoreOnly: false,
    suppressionTags: [],
    closureState: 'grounded-recall',
    surfaceConfidence: 0.86,
    shouldLabelUncertainty: false,
    visibleCarryMode: 'explicit-recall',
    conflictPressure: 'none',
    retrievalQuality: 'high',
    finalRationale: 'Stable memory can support the answer.',
    ...overrides,
  }
}

describe('alicization-memory-closure-discipline', () => {
  it('allows explicit recall only when the ledger is grounded and high-quality', () => {
    const discipline = deriveAlicizationMemoryClosureDiscipline(ledger())

    expect(discipline.allowedSurface).toBe('explicit')
    expect(discipline.shouldBlockVisibleMemory).toBe(false)
    expect(discipline.shouldLabelUncertainty).toBe(false)
    expect(discipline.requiredSurfaceDiscipline).toContain('explicit-recall-must-serve-payoff')
    expect(discipline.finalGateSignals).toEqual({
      closureCovered: true,
      conflictClosed: null,
      lowQualityWithheld: null,
      uncertaintyLabeled: null,
    })
  })

  it('keeps high-conflict memory inward and closes conflict gate', () => {
    const discipline = deriveAlicizationMemoryClosureDiscipline(ledger({
      closureState: 'conflicted-recall',
      conflictPressure: 'high',
      retrievalQuality: 'low',
      visibleCarryMode: 'explicit-recall',
      rejectedCandidates: [{
        id: 'cluster:wrong-thread',
        summary: 'Wrong nearby relationship thread',
        status: 'rejected',
        reason: 'Competing cluster did not match this turn.',
      }],
      suppressionTags: ['wrong-thread'],
    }))

    expect(discipline.allowedSurface).toBe('none')
    expect(discipline.shouldBlockVisibleMemory).toBe(true)
    expect(discipline.shouldLabelUncertainty).toBe(true)
    expect(discipline.shouldUseStableCoreOnly).toBe(true)
    expect(discipline.withheldReasons).toEqual(expect.arrayContaining([
      'conflict-pressure-high',
      'retrieval-low-quality',
      'suppressed:wrong-thread',
    ]))
    expect(discipline.finalGateSignals.conflictClosed).toBe(true)
    expect(discipline.finalGateSignals.lowQualityWithheld).toBe(true)
  })

  it('marks approximate gist recall as uncertainty-labeled but still surfaceable', () => {
    const discipline = deriveAlicizationMemoryClosureDiscipline(ledger({
      closureState: 'approximate-recall',
      shouldLabelUncertainty: true,
      visibleCarryMode: 'gist-only',
      retrievalQuality: 'medium',
      conflictPressure: 'medium',
      stableCoreOnly: true,
    }))

    expect(discipline.allowedSurface).toBe('gist')
    expect(discipline.shouldBlockVisibleMemory).toBe(false)
    expect(discipline.shouldLabelUncertainty).toBe(true)
    expect(discipline.requiredSurfaceDiscipline).toEqual(expect.arrayContaining([
      'brief-gist-only',
      'label-uncertainty',
      'stable-core-only',
    ]))
    expect(discipline.finalGateSignals.uncertaintyLabeled).toBe(true)
  })
})
