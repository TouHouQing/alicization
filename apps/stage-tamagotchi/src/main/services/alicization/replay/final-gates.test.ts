import { describe, expect, it } from 'vitest'

import { buildAlicizationFinalReplayGateReport } from './final-gates'

describe('final replay gates', () => {
  it('fails when recall, precision, authority, or visible fallback violate final ship standards', () => {
    const report = buildAlicizationFinalReplayGateReport({
      retrievalHealth: {
        recallAt3: 0.72,
        precisionAt3: 0.7,
        wrongThreadRate: 0.1,
        templateLeakageFailCount: 2,
        unsupportedSpecificityVisibleFailCount: 1,
        turnOsTraceCoverage: 0.9,
        learningOutcomeToSelfRevisionRoundtrip: 0.5,
      },
      authorityLeakCount: 1,
      localHumanlikeVisibleFallbackCount: 3,
    })

    expect(report.passed).toBe(false)
    expect(report.failingKeys).toEqual(expect.arrayContaining([
      'recall-at-3',
      'precision-at-3',
      'wrong-thread-rate',
      'template-leakage',
      'authority-leak',
      'local-humanlike-visible-fallback',
      'unsupported-specificity-visible',
      'turn-os-trace-coverage',
      'learning-self-revision-roundtrip',
    ]))
  })
})
