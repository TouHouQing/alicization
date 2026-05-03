import { describe, expect, it } from 'vitest'

import {
  blendAlicizationMemoryTelemetryLatency,
  createAlicizationMemoryRetrievalTelemetryRuntime,
  defaultAlicizationMemoryRetrievalTelemetry,
  normalizeAlicizationMemoryRetrievalTelemetry,
} from './memory-retrieval-telemetry'

describe('memory retrieval telemetry', () => {
  it('normalizes malformed telemetry payloads into a safe snapshot', () => {
    expect(normalizeAlicizationMemoryRetrievalTelemetry({
      semanticLatencyMs: '12',
      semanticSampleCount: '3',
      graphLatencyMs: '19',
      graphSampleCount: '2',
      candidateGenerationLatencyMs: '11',
      candidateGenerationSampleCount: '4',
      plannerLatencyMs: '13',
      plannerSampleCount: '5',
      speechPlanLatencyMs: '17',
      speechPlanSampleCount: '6',
      cacheHitCount: '7',
      cacheMissCount: '3',
      prewarmHitCount: '4',
      prewarmMissCount: '2',
      recallHitRate: '0.8',
      recallMissRate: '0.2',
      wrongThreadRate: '0.1',
      reconstructionErrorRate: '0.25',
      stableCoreOnlyRate: '0.75',
      memorySurfaceViolationRate: '0.15',
      templateLeakageFailCount: '4',
      lastUpdatedAt: '123',
    })).toEqual({
      semanticLatencyMs: 12,
      semanticSampleCount: 3,
      graphLatencyMs: 19,
      graphSampleCount: 2,
      candidateGenerationLatencyMs: 11,
      candidateGenerationSampleCount: 4,
      plannerLatencyMs: 13,
      plannerSampleCount: 5,
      speechPlanLatencyMs: 17,
      speechPlanSampleCount: 6,
      cacheHitCount: 7,
      cacheMissCount: 3,
      prewarmHitCount: 4,
      prewarmMissCount: 2,
      budgetClassCounts: {
        'realtime-reply': 0,
        'deep-recall-reply': 0,
        'proactive-generation': 0,
        'nightly-benchmark': 0,
        'diagnosis-replay': 0,
      },
      organicStageTelemetry: {
        'search-prelude': { latencyMs: null, sampleCount: 0 },
        'candidate-generation': { latencyMs: null, sampleCount: 0 },
        'candidate-ranking': { latencyMs: null, sampleCount: 0 },
        'recollection-planning': { latencyMs: null, sampleCount: 0 },
        'surface-planning': { latencyMs: null, sampleCount: 0 },
        'self-evolution-integration': { latencyMs: null, sampleCount: 0 },
        'prompt-blocks': { latencyMs: null, sampleCount: 0 },
      },
      organicStageBudgetCounts: {
        'search-prelude': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'candidate-generation': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'candidate-ranking': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'recollection-planning': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'surface-planning': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'self-evolution-integration': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'prompt-blocks': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
      },
      hotKeyStats: [],
      recallHitRate: 0.8,
      recallMissRate: 0.2,
      wrongThreadRate: 0.1,
      reconstructionErrorRate: 0.25,
      stableCoreOnlyRate: 0.75,
      memorySurfaceViolationRate: 0.15,
      templateLeakageFailCount: 4,
      mindParticipation: 0,
      memoryParticipation: 0,
      personalityParticipation: 0,
      relationshipParticipation: 0,
      continuityParticipation: 0,
      lastUpdatedAt: 123,
    })
    expect(defaultAlicizationMemoryRetrievalTelemetry()).toEqual({
      semanticLatencyMs: null,
      semanticSampleCount: 0,
      graphLatencyMs: null,
      graphSampleCount: 0,
      candidateGenerationLatencyMs: null,
      candidateGenerationSampleCount: 0,
      plannerLatencyMs: null,
      plannerSampleCount: 0,
      speechPlanLatencyMs: null,
      speechPlanSampleCount: 0,
      cacheHitCount: 0,
      cacheMissCount: 0,
      prewarmHitCount: 0,
      prewarmMissCount: 0,
      budgetClassCounts: {},
      organicStageTelemetry: {},
      organicStageBudgetCounts: {},
      hotKeyStats: [],
      recallHitRate: 0,
      recallMissRate: 0,
      wrongThreadRate: 0,
      reconstructionErrorRate: 0,
      stableCoreOnlyRate: 0,
      memorySurfaceViolationRate: 0,
      templateLeakageFailCount: 0,
      mindParticipation: 0,
      memoryParticipation: 0,
      personalityParticipation: 0,
      relationshipParticipation: 0,
      continuityParticipation: 0,
      lastUpdatedAt: null,
    })
  })

  it('blends retrieval latency and applies override through runtime meta storage', async () => {
    const meta = new Map<string, string>()
    const runtime = createAlicizationMemoryRetrievalTelemetryRuntime({
      now: () => 100,
      key: 'telemetry',
      getMetaValue: async key => meta.get(key),
      upsertMeta: async (key, value) => {
        meta.set(key, value)
      },
      enqueueWrite: async task => await task(),
    })

    expect(blendAlicizationMemoryTelemetryLatency(10, 2, 16)).toBeCloseTo(12)

    await runtime.recordSemanticLatency(12)
    await runtime.recordSemanticLatency(18)
    await runtime.recordGraphLatency(20)
    await runtime.recordCandidateGenerationLatency(11)
    await runtime.recordPlannerLatency(13)
    await runtime.recordSpeechPlanLatency(17)
    await runtime.recordOrganicStageLatency({
      stage: 'candidate-ranking',
      latencyMs: 19,
    })
    await runtime.recordOrganicStageBudget({
      stage: 'candidate-ranking',
      budgetClass: 'deep-recall-reply',
    })
    await runtime.recordCacheAccess(true)
    await runtime.recordCacheAccess(false)
    await runtime.recordPrewarmAccess(true)
    await runtime.applyHealthOverride({
      semanticLatencyMs: 15,
      graphLatencyMs: 22,
      candidateGenerationLatencyMs: 14,
      plannerLatencyMs: 16,
      speechPlanLatencyMs: 18,
      cacheHitRatio: 0.5,
      prewarmHitRatio: 1,
      recallHitRate: 0.8,
      recallMissRate: 0.2,
      wrongThreadRate: 0.1,
      reconstructionErrorRate: 0.25,
      stableCoreOnlyRate: 0.75,
      memorySurfaceViolationRate: 0.15,
      templateLeakageFailCount: 3,
    })

    expect(await runtime.getTelemetry()).toEqual({
      semanticLatencyMs: 15,
      semanticSampleCount: 2,
      graphLatencyMs: 22,
      graphSampleCount: 1,
      candidateGenerationLatencyMs: 14,
      candidateGenerationSampleCount: 1,
      plannerLatencyMs: 16,
      plannerSampleCount: 1,
      speechPlanLatencyMs: 18,
      speechPlanSampleCount: 1,
      cacheHitCount: 1,
      cacheMissCount: 1,
      prewarmHitCount: 1,
      prewarmMissCount: 0,
      budgetClassCounts: {
        'realtime-reply': 0,
        'deep-recall-reply': 0,
        'proactive-generation': 0,
        'nightly-benchmark': 0,
        'diagnosis-replay': 0,
      },
      organicStageTelemetry: {
        'search-prelude': { latencyMs: 0, sampleCount: 0 },
        'candidate-generation': { latencyMs: 0, sampleCount: 0 },
        'candidate-ranking': { latencyMs: 19, sampleCount: 1 },
        'recollection-planning': { latencyMs: 0, sampleCount: 0 },
        'surface-planning': { latencyMs: 0, sampleCount: 0 },
        'self-evolution-integration': { latencyMs: 0, sampleCount: 0 },
        'prompt-blocks': { latencyMs: 0, sampleCount: 0 },
      },
      organicStageBudgetCounts: {
        'search-prelude': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'candidate-generation': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'candidate-ranking': { 'realtime-reply': 0, 'deep-recall-reply': 1, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'recollection-planning': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'surface-planning': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'self-evolution-integration': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
        'prompt-blocks': { 'realtime-reply': 0, 'deep-recall-reply': 0, 'proactive-generation': 0, 'nightly-benchmark': 0, 'diagnosis-replay': 0 },
      },
      hotKeyStats: [],
      recallHitRate: 0.8,
      recallMissRate: 0.2,
      wrongThreadRate: 0.1,
      reconstructionErrorRate: 0.25,
      stableCoreOnlyRate: 0.75,
      memorySurfaceViolationRate: 0.15,
      templateLeakageFailCount: 3,
      mindParticipation: 0,
      memoryParticipation: 0,
      personalityParticipation: 0,
      relationshipParticipation: 0,
      continuityParticipation: 0,
      lastUpdatedAt: 100,
    })
  })
})
