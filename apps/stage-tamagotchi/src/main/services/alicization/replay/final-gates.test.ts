import { describe, expect, it } from 'vitest'

import { buildAlicizationFinalReplayGateReport } from './final-gates'

describe('final replay gates', () => {
  it('passes only when memory, reply authority, and learning loop standards all meet final thresholds', () => {
    const report = buildAlicizationFinalReplayGateReport({
      retrievalHealth: {
        recallAt3: 0.9,
        precisionAt3: 0.86,
        wrongThreadRate: 0,
        templateLeakageFailCount: 0,
        unsupportedSpecificityVisibleFailCount: 0,
        turnOsTraceCoverage: 1,
        learningOutcomeToSelfRevisionRoundtrip: 1,
        memoryClosureCoverage: 1,
        memoryClosureConflictClosureRate: 1,
        memoryClosureLowQualityWithholdRate: 1,
        memoryClosureUncertaintyLabelRate: 1,
        claimAccuracy: 0.98,
        replyAuthorityAccuracy: 1,
        latencyBudgetPass: true,
        mindParticipation: 0.9,
        memoryParticipation: 0.8,
        personalityParticipation: 0.7,
        relationshipParticipation: 0.6,
        continuityParticipation: 0.8,
        misinternalizationRate: 0,
      },
      authorityLeakCount: 0,
      localHumanlikeVisibleFallbackCount: 0,
      sampleCount: 12,
    })

    expect(report.passed).toBe(true)
    expect(report.failingKeys).toEqual([])
  })

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
        memoryClosureCoverage: 0.8,
        memoryClosureConflictClosureRate: 0.5,
        memoryClosureLowQualityWithholdRate: 0,
        memoryClosureUncertaintyLabelRate: 0.75,
        claimAccuracy: 0.8,
        replyAuthorityAccuracy: 0.95,
        latencyBudgetPass: false,
        mindParticipation: 0.4,
        memoryParticipation: 0.5,
        personalityParticipation: 0.4,
        relationshipParticipation: 0.3,
        continuityParticipation: 0.5,
        misinternalizationRate: 0.1,
      },
      authorityLeakCount: 1,
      localHumanlikeVisibleFallbackCount: 3,
      sampleCount: 0,
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
      'memory-closure-coverage',
      'memory-closure-conflict',
      'memory-closure-low-quality-withhold',
      'memory-closure-uncertainty-label',
      'claim-accuracy',
      'reply-authority-accuracy',
      'latency-budget',
      'mind-participation',
      'memory-participation',
      'personality-participation',
      'relationship-participation',
      'continuity-participation',
      'learning-misinternalization',
      'minimum-sample-count',
    ]))
  })
})
