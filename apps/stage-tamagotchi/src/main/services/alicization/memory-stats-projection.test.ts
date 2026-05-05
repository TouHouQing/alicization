import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryStatsProjection, deriveAlicizationMemoryIntegrity } from './memory-stats-projection'

describe('memory stats projection', () => {
  it('projects aggregate memory stats from facts, episodes, and consolidations', () => {
    const result = buildAlicizationMemoryStatsProjection({
      facts: [
        {
          id: 'fact-1',
          subject: 'host',
          predicate: 'likes',
          object: 'direct answers',
          confidence: 0.9,
          source: 'manual',
          dedupeKey: 'host|likes|direct answers',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 1,
          provenance: 'remembered',
          memoryTier: 'hot',
        } as any,
      ],
      episodicEvents: [
        {
          memoryTier: 'warm',
          provenance: 'remembered',
          latestReconsolidation: {
            provenance: 'reconstructed',
          },
          reconsolidationCount: 1,
        },
      ],
      consolidations: [
        {
          memoryTier: 'cold',
        },
      ],
      factTierCounts: { hot: 1, warm: 0, cold: 0 },
      episodicTierCounts: { hot: 0, warm: 1, cold: 0 },
      consolidationTierCounts: { hot: 0, warm: 0, cold: 1 },
      pendingSyncCount: 3,
      ingestHealth: {
        status: 'backlog',
        pendingCount: 2,
        failedCount: 1,
        oldestPendingAgeMs: 5_000,
        nextRetryAt: 9_000,
        lastError: null,
      },
      lastPrunedAt: 42,
      retrievalTelemetry: {
        semanticLatencyMs: 12,
        graphLatencyMs: 20,
        candidateGenerationLatencyMs: 9,
        plannerLatencyMs: 15,
        speechPlanLatencyMs: 18,
        cacheHitCount: 3,
        cacheMissCount: 1,
        prewarmHitCount: 2,
        prewarmMissCount: 2,
        organicStageTelemetry: {
          'search-prelude': { latencyMs: 5, sampleCount: 2 },
          'candidate-generation': { latencyMs: 9, sampleCount: 1 },
        },
        organicStageBudgetCounts: {
          'search-prelude': { 'realtime-reply': 2 },
          'candidate-generation': { 'deep-recall-reply': 1 },
        },
        recallHitRate: 0.8,
        recallMissRate: 0.2,
        wrongThreadRate: 0.1,
        suppressionHitRate: 0.5,
        wrongThreadPreventedCount: 2,
        falsePositiveSuppressionRate: 0.25,
        staleSelfModelVetoRate: 0.33,
        relationshipEraConfusionRate: 0.67,
        reconstructionErrorRate: 0.25,
        stableCoreOnlyRate: 0.75,
        memorySurfaceViolationRate: 0.15,
        templateLeakageFailCount: 4,
        learningTaskCompletionCount: 3,
        learningTaskCompletionRate: 0.6,
        learningTaskFailureCount: 1,
        learningTaskFailureRate: 0.2,
        learningTaskBlockedCount: 1,
        learningTaskReopenedCount: 0,
        learningTaskReopenRecoveryRate: 0,
        learningTaskDowngradedCount: 0,
        learningTaskCancelledCount: 0,
        learningRelationshipReviseCount: 1,
        learningSelfModelReviseCount: 1,
        learningWorldModelValidationCount: 1,
        learningWorldModelFalseInternalizationCount: 0,
        misinternalizationRate: 0,
        relationshipCadenceRegressionRate: 0,
        selfModelStaleBeliefRate: 0.33,
      },
      currentTs: 100,
    })

    expect(result.total).toBe(3)
    expect(result.tierCounts).toEqual({
      hot: 1,
      warm: 1,
      cold: 1,
    })
    expect(result.surfaceCounts).toEqual({
      facts: 1,
      episodic: 1,
      consolidations: 1,
    })
    expect(result.retrievalHealth).toEqual({
      semanticLatencyMs: 12,
      graphLatencyMs: 20,
      candidateGenerationLatencyMs: 9,
      plannerLatencyMs: 15,
      speechPlanLatencyMs: 18,
      cacheHitRatio: 0.75,
      prewarmHitRatio: 0.5,
      budgetClassCounts: {},
      organicStageTelemetry: {
        'search-prelude': { latencyMs: 5, sampleCount: 2 },
        'candidate-generation': { latencyMs: 9, sampleCount: 1 },
      },
      organicStageBudgetCounts: {
        'search-prelude': { 'realtime-reply': 2 },
        'candidate-generation': { 'deep-recall-reply': 1 },
      },
      hotKeyHitRatio: 0,
      hotKeyCoverage: 0,
      hotKeyCandidates: [],
      hotKeyStats: [],
      hotKeyActiveCount: 0,
      hotKeyWinCount: 0,
      hotKeyMissCount: 0,
      reconstructionFrequency: 1,
      reconstructedCount: 1,
      recallHitRate: 0.8,
      recallMissRate: 0.2,
      wrongThreadRate: 0.1,
      suppressionHitRate: 0.5,
      wrongThreadPreventedCount: 2,
      falsePositiveSuppressionRate: 0.25,
      staleSelfModelVetoRate: 0.33,
      relationshipEraConfusionRate: 0.67,
      reconstructionErrorRate: 0.25,
      stableCoreOnlyRate: 0.75,
      memorySurfaceViolationRate: 0.15,
      templateLeakageFailCount: 4,
      mindParticipation: 0,
      memoryParticipation: 0,
      personalityParticipation: 0,
      relationshipParticipation: 0,
      continuityParticipation: 0,
      learningTaskCompletionCount: 3,
      learningTaskCompletionRate: 0.6,
      learningTaskFailureCount: 1,
      learningTaskFailureRate: 0.2,
      learningTaskBlockedCount: 1,
      learningTaskReopenedCount: 0,
      learningTaskReopenRecoveryRate: 0,
      learningTaskDowngradedCount: 0,
      learningTaskCancelledCount: 0,
      learningRelationshipReviseCount: 1,
      learningSelfModelReviseCount: 1,
      learningWorldModelValidationCount: 1,
      learningWorldModelFalseInternalizationCount: 0,
      misinternalizationRate: 0,
      relationshipCadenceRegressionRate: 0,
      selfModelStaleBeliefRate: 0.33,
    })
    expect(result.writeHealth).toEqual({
      backlogCount: 3,
      retryOldestAgeMs: 5_000,
      nextRetryAt: 9_000,
      blocked: false,
      lastError: null,
    })
  })

  it('flags malformed and duplicate facts in integrity projection', () => {
    const result = deriveAlicizationMemoryIntegrity({
      facts: [
        {
          id: 'fact-1',
          subject: '',
          predicate: 'likes',
          object: 'direct answers',
          confidence: 0.8,
          source: 'manual',
          dedupeKey: 'host|likes|direct answers',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 0,
          provenance: 'remembered',
          memoryTier: 'hot',
        } as any,
        {
          id: 'fact-2',
          subject: 'host',
          predicate: 'likes',
          object: 'direct answers',
          confidence: 0.8,
          source: 'manual',
          dedupeKey: 'host|likes|direct answers',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 0,
          provenance: 'remembered',
          memoryTier: 'hot',
        } as any,
      ],
      currentTs: 100,
    })

    expect(result.status).toBe('degraded')
    expect(result.issues).toEqual(expect.arrayContaining([
      'malformed-fact:fact-1',
      'duplicate-dedupe:host|likes|direct answers',
    ]))
  })
})
