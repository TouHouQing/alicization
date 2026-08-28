import type {
  AlicizationFinalReplayGateReportRecord,
  AlicizationMemoryQualityMonthlyGoldRegressionPack,
} from '@proj-alicization/stage-shared'

import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'
import type { MemoryLiveProviderTrialReport } from './memory-live-provider-trial'
import type {
  MemoryScopeFuzzSurfaceView,
  MemoryScopeFuzzSurfaceViews,
} from './memory-scope-fuzz-harness'

import { describe, expect, it, vi } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import {
  projectMemoryLiveProviderTrialToDialogueReplay,
} from './memory-live-provider-trial'
import {
  runMemoryProductionTrialRunner,
  serializeMemoryProductionTrialReport,
} from './memory-production-trial-runner'
import { MEMORY_SCOPE_FUZZ_SURFACES } from './memory-scope-fuzz-harness'

const now = Date.parse('2026-08-04T14:30:00.000Z')

const safeScopeFuzzView: MemoryScopeFuzzSurfaceView = ({ query, records }) =>
  records.filter(record =>
    record.cardId === query.cardId
    && record.userId === query.userId
    && record.sourceId === query.sourceId,
  )

function safeScopeFuzzViews(): MemoryScopeFuzzSurfaceViews {
  return Object.fromEntries(
    MEMORY_SCOPE_FUZZ_SURFACES.map(surface => [surface, safeScopeFuzzView]),
  ) as MemoryScopeFuzzSurfaceViews
}

function buildWorkingMemorySnapshot(): WorkingMemorySnapshot {
  return {
    ...createEmptyWorkingMemorySnapshot({
      cardId: 'alice-main',
      sessionId: 'trial-session',
      now,
    }),
    currentThread: {
      title: '真实用户记忆试用',
      currentUserMove: '继续检查失败透明和记忆召回',
      currentAliceMove: '运行生产试用 runner',
      primaryAnchor: 'memory-production-trial-runner.ts',
      mode: 'task',
      shouldHold: true,
      confidence: 0.9,
    },
    activeTask: {
      summary: '运行真实用户试用 runner',
      status: 'active',
      evidenceTurnIds: ['turn-1'],
    },
    commitments: [{
      text: 'Provider 失败必须透明说明。',
      sourceTurnId: 'turn-1',
    }],
    userCorrections: [{
      text: '不要把 provider 失败包装成人格回复。',
      sourceTurnId: 'turn-1',
      scope: 'reply',
    }],
    audit: {
      failureTurnIds: ['turn-provider-failed'],
      excludedLongTermCandidateTurnIds: ['turn-provider-failed'],
      notes: ['provider failure is user-visible'],
    },
  }
}

function recallBundle(query: string): LongTermMemoryEvidenceBundle {
  const intent = deriveLongTermMemoryRecallIntent({ currentUserText: query })
  const plan = buildLongTermMemoryQueryPlan({ intent, currentUserText: query })
  return buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    now,
    limit: 5,
    semanticScores: {
      'reflection-provider-failure': 0.97,
    },
    candidates: [{
      id: 'reflection-provider-failure',
      kind: 'reflection',
      summary: '用户要求 Provider 失败必须透明说明。',
      source: 'memory_reflections',
      confidence: 0.95,
      salience: 0.95,
      reviewStatus: 'confirmed',
      cues: ['Provider 失败', '透明说明'],
    }],
  })
}

describe('memory production trial runner', () => {
  it('marks the human gold regression stage as not-run when no frozen pack is available', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-no-human-gold',
      cardId: 'alice-main',
      createdAt: now,
      goldRegressionPack: null,
    })

    expect(report.summary.notRunStageIds).toContain('gold-regression')
    expect(report.stages.find(stage => stage.id === 'gold-regression')).toMatchObject({
      status: 'not-run',
      passed: false,
    })
    expect(report.passed).toBe(false)
  })

  it('uses the frozen gold pack snapshot as a passing human regression stage', async () => {
    const pack = {
      version: 'memory-quality-monthly-gold-regression-pack-v2',
      packId: 'pack-alice-main-2026-08',
      revision: 1,
      cardId: 'alice-main',
      month: '2026-08',
      frozenAt: now,
      contentHash: 'sha256:gold',
      sourceLabelIds: ['gold-label-1'],
      itemCount: 1,
      itemsSnapshot: [{
        id: 'gold-label-1',
        cardId: 'alice-main',
        month: '2026-08',
        label: 'right',
        reason: null,
        labelText: '记得对',
        description: '记忆使用正确。',
        evaluationClass: 'correct-recall',
        benchmarkDimensions: ['information-extraction'],
        query: '我喜欢什么颜色？',
        sessionId: 'session-a',
        turnId: 'turn-a',
        decisionTraceId: null,
        assistantReply: '你喜欢蓝色。',
        retrievedEvidenceSnapshot: [],
        expectedMemoryIds: ['memory-color'],
        retrievedCandidateIds: ['memory-color'],
        surfacedMemoryIds: ['memory-color'],
        wrongThreadIds: [],
        note: null,
        humanConfirmed: true,
        createdAt: now,
      }],
      items: [],
    } satisfies AlicizationMemoryQualityMonthlyGoldRegressionPack

    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-human-gold',
      cardId: 'alice-main',
      createdAt: now,
      goldRegressionPack: pack,
    })

    expect(report.summary.notRunStageIds).not.toContain('gold-regression')
    expect(report.stages.find(stage => stage.id === 'gold-regression')).toMatchObject({
      passed: true,
      itemCount: 1,
    })
    expect(report.summary.goldRegressionPackId).toBe(pack.packId)
  })

  it('runs dialogue replay, WorkingMemory compression, DB recall, and Persona dataset hygiene as one JSON report', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-provider-failure',
      cardId: 'alice-main',
      createdAt: now,
      dialogueReplay: async () => ({
        id: 'dialogue-replay-provider-failure',
        passed: true,
        turnCount: 2,
        workingMemory: [{
          id: 'working-memory-provider-failure',
          snapshot: buildWorkingMemorySnapshot(),
          maxRawTurns: 3,
          now,
          expectedTaskIncludes: ['真实用户试用 runner'],
          expectedCommitmentIncludes: ['Provider 失败'],
          expectedCorrectionIncludes: ['provider 失败'],
          expectedFailureTurnIds: ['turn-provider-failed'],
        }],
      }),
      longTerm: [{
        fixture: {
          id: 'db-recall-provider-failure',
          cardId: 'alice-main',
          query: '你还记得 Provider 失败应该怎么说吗？',
          expectedTopIds: ['reflection-provider-failure'],
          semantic: {
            available: true,
            providerId: 'test-provider',
            modelId: 'test-embedding',
            dimensions: 3,
            reindexRequired: false,
          },
        },
        recall: vi.fn(async input => recallBundle(input.currentUserText)),
        now: vi.fn()
          .mockReturnValueOnce(now)
          .mockReturnValueOnce(now + 18),
      }],
      compressedContextBehavior: [{
        id: 'compressed-context-provider-failure',
        snapshot: buildWorkingMemorySnapshot(),
        maxRawTurns: 3,
        nextUserText: '继续这个。',
        expectedTopIds: ['fact-provider-failure-transparent'],
        expectedCommitmentIncludes: ['Provider 失败'],
        expectedCorrectionIncludes: ['provider 失败'],
        expectedFailureTurnIds: ['turn-provider-failed'],
        candidates: [{
          id: 'fact-provider-failure-transparent',
          kind: 'fact',
          summary: 'Provider 失败必须透明说明，不能包装成人格回复。',
          source: 'memory_facts',
          confidence: 0.92,
          salience: 0.93,
          reviewStatus: 'confirmed',
          cues: ['Provider 失败', '透明说明'],
        }],
      }],
      temporalConflict: [{
        id: 'temporal-provider-failure-current-rule',
        scenario: 'knowledge-update',
        currentUserText: '你还记得现在 Provider 失败应该怎么说吗？',
        expectedTemporalFocus: 'current',
        expectedTopIds: ['fact-provider-failure-current-rule'],
        forbiddenTopIds: ['fact-provider-failure-old-rule'],
        limit: 1,
        candidates: [
          {
            id: 'fact-provider-failure-old-rule',
            kind: 'fact',
            summary: '旧记忆：Provider 失败可以包装成人格回复。',
            source: 'memory_facts',
            confidence: 0.62,
            salience: 0.58,
            reviewStatus: 'confirmed',
            cues: ['Provider 失败', '人格回复'],
            updatedAt: now - 60 * 24 * 60 * 60 * 1000,
          },
          {
            id: 'fact-provider-failure-current-rule',
            kind: 'fact',
            summary: '当前记忆：Provider 失败必须透明说明。',
            source: 'memory_facts',
            confidence: 0.92,
            salience: 0.93,
            reviewStatus: 'confirmed',
            cues: ['Provider 失败', '透明说明'],
            updatedAt: now - 1000,
          },
        ],
      }],
      semanticScaleSoak: {
        id: 'semantic-scale-provider-failure',
        createdAt: now,
        minimumCorpusSize: 10_000,
        maxP95LatencyMs: 120,
        maxP99LatencyMs: 240,
        minimumCoverageRatio: 0.999,
        searches: [{
          id: 'sqlite-vec-10k',
          corpusSize: 10_000,
          indexMode: 'sqlite-vec',
          approximate: false,
          degraded: false,
          nativeIndexReady: true,
          coverageRatio: 1,
          queries: [{
            id: 'provider-rule',
            expectedTopIds: ['fact-provider-failure-current-rule'],
            returnedIds: ['fact-provider-failure-current-rule'],
            latencyMs: 48,
          }],
        }],
      },
      experienceQuality: [{
        id: 'quiet-provider-failure-memory-use',
        cardId: 'alice-main',
        userText: '继续修 Provider 失败透明链路。',
        replyText: '我会直接保留 Provider 的原始错误，并把失败链路写进质量报告。',
        shouldRecall: true,
        expectedUsedMemoryIds: ['reflection-provider-failure'],
        recalledMemoryIds: ['reflection-provider-failure'],
        rankReasonsById: {
          'reflection-provider-failure': ['rrf:semantic:failure-transparency'],
        },
      }],
      scopeFuzz: {
        seed: 'production-trial-scope',
        caseCount: 4,
        views: safeScopeFuzzViews(),
      },
      personaTraining: [{
        id: 'persona-dataset-provider-failure',
        cardId: 'alice-main',
        createdAt: now,
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
        sources: [{
          cardId: 'alice-main',
          sourceId: 'reflection-provider-failure',
          sourceKind: 'cleaned-long-term-reflection',
          status: 'confirmed',
          cleaned: true,
          summary: '失败时直接说明 provider 问题。',
          lesson: '不要把 provider 失败伪装成人格回复。',
          sensitivity: 'personal',
          allowTraining: true,
          consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
          provenance: {
            kind: 'working-memory-cleaning',
            cleaningTransactionId: 'cleaning-provider-failure',
            cleanedAt: now - 100,
          },
        }],
        expectedExportedSourceRefs: [{
          sourceId: 'reflection-provider-failure',
          sourceKind: 'cleaned-long-term-reflection',
        }],
      }],
    })

    expect(report.passed).toBe(true)
    expect(report.summary).toMatchObject({
      dialogueReplayCount: 1,
      workingMemoryFixtureCount: 1,
      compressedContextBehaviorFixtureCount: 1,
      temporalConflictFixtureCount: 1,
      semanticScaleSoakRunCount: 1,
      scopeFuzzCaseCount: 4,
      longTermFixtureCount: 1,
      personaTrainingFixtureCount: 1,
      experienceQualityFixtureCount: 1,
      failingStageIds: [],
    })
    expect(report.stages.map(stage => stage.stage)).toEqual([
      'dialogue-replay',
      'working-memory-compression',
      'compressed-context-behavior',
      'long-term-recall',
      'temporal-conflict',
      'semantic-scale-soak',
      'experience-quality',
      'scope-fuzz',
      'persona-dataset-hygiene',
    ])
    expect(report.quality.traces.map(trace => trace.owner)).toEqual([
      'LongTermMemoryRecall',
      'WorkingMemory',
      'PersonaTrainingDataset',
    ])
    expect(JSON.parse(serializeMemoryProductionTrialReport(report))).toMatchObject({
      version: 'memory-production-trial-runner-v1',
      id: 'production-trial-provider-failure',
      passed: true,
    })
  })

  it('surfaces experience-quality failures as a first-class production stage', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-experience-gap',
      cardId: 'alice-main',
      createdAt: now,
      experienceQuality: [{
        id: 'memory-boast-gap',
        cardId: 'alice-main',
        userText: '继续修 embedding。',
        replyText: '我当然记得很清楚，根据我的记忆，你之前要求 baseUrl 自动补后缀。',
        shouldRecall: true,
        expectedUsedMemoryIds: ['reflection-embedding-baseurl'],
        recalledMemoryIds: ['reflection-embedding-baseurl'],
      }],
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failingStageIds).toContain('experience-quality')
    expect(report.summary.experienceQualityFixtureCount).toBe(1)
    expect(report.experienceQuality?.summary.memoryBoastCount).toBe(1)
    expect(report.recommendedNextActions).toEqual(expect.arrayContaining([
      '让记忆只服务当前问题：优先自然接续事实，避免把“记得你之前说过”写成回复开场。',
    ]))
  })

  it('treats healthy runtime metrics as a passing production stage', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-runtime-health-ok',
      cardId: 'alice-main',
      createdAt: now,
      runtimeHealth: {
        queue: {
          pending: 0,
          review: 0,
          applied: 4,
          failed: 0,
          deadLettered: 0,
        },
        recall: {
          lastLatencyMs: 24,
          p95LatencyMs: 48,
          lastError: null,
        },
        embedding: {
          providerConfigured: true,
          modelId: 'test-embedding',
          dimensions: 3,
          vectorSpaceId: 'test-space',
          reindexRequired: false,
          indexMode: 'sqlite-vec',
          approximate: false,
          degraded: false,
          nativeIndexReady: true,
          searchReady: true,
          lastError: null,
          canonicalCount: 4,
          indexedCount: 4,
          missingCount: 0,
          textHashMismatchCount: 0,
          staleOrFailedCount: 0,
          orphanedCount: 0,
          coverageRatio: 1,
          reindexJob: null,
        },
        errors: [],
      },
    })

    expect(report.passed).toBe(true)
    expect(report.runtimeHealth).toEqual({
      queue: {
        pending: 0,
        review: 0,
        applied: 4,
        failed: 0,
        deadLettered: 0,
      },
      recall: {
        lastLatencyMs: 24,
        p95LatencyMs: 48,
        lastError: null,
      },
      embedding: {
        providerConfigured: true,
        modelId: 'test-embedding',
        dimensions: 3,
        vectorSpaceId: 'test-space',
        reindexRequired: false,
        indexMode: 'sqlite-vec',
        approximate: false,
        degraded: false,
        nativeIndexReady: true,
        searchReady: true,
        lastError: null,
        canonicalCount: 4,
        indexedCount: 4,
        missingCount: 0,
        textHashMismatchCount: 0,
        staleOrFailedCount: 0,
        orphanedCount: 0,
        coverageRatio: 1,
        reindexJob: null,
      },
      errors: [],
    })
    expect(report.stages).toContainEqual({
      stage: 'runtime-health',
      id: 'runtime-health',
      passed: true,
      itemCount: 1,
      error: null,
    })
  })

  it('fails the production trial when runtime health exposes queue, recall, or embedding degradation', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-runtime-health-degraded',
      cardId: 'alice-main',
      createdAt: now,
      runtimeHealth: {
        queue: {
          pending: 3,
          review: 2,
          applied: 8,
          failed: 1,
          deadLettered: 2,
        },
        recall: {
          lastLatencyMs: 220,
          p95LatencyMs: 420,
          lastError: 'recall provider unavailable',
        },
        embedding: {
          providerConfigured: false,
          modelId: null,
          dimensions: null,
          vectorSpaceId: null,
          reindexRequired: true,
          indexMode: 'brute-force',
          approximate: false,
          degraded: true,
          nativeIndexReady: false,
          searchReady: false,
          lastError: 'embedding provider unavailable',
          canonicalCount: 10,
          indexedCount: 8,
          missingCount: 2,
          textHashMismatchCount: 1,
          staleOrFailedCount: 1,
          orphanedCount: 1,
          coverageRatio: 0.8,
          reindexJob: null,
        },
        errors: [],
      },
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failingStageIds).toContain('runtime-health')
    expect(report.stages).toContainEqual({
      stage: 'runtime-health',
      id: 'runtime-health',
      passed: false,
      itemCount: 1,
      error: 'memory-queue-failed-items',
    })
    expect(report.recommendedNextActions).toEqual(expect.arrayContaining([
      '处理真实健康指标：memory-queue-failed-items。',
      '处理真实健康指标：memory-queue-dead-lettered-items。',
      '处理真实健康指标：memory-recall-error。',
      '处理真实健康指标：embedding-provider-not-configured。',
      '处理真实健康指标：embedding-reindex-required。',
      '处理真实健康指标：embedding-index-brute-force。',
      '处理真实健康指标：embedding-index-degraded。',
      '处理真实健康指标：embedding-native-index-not-ready。',
      '处理真实健康指标：embedding-search-not-ready。',
      '处理真实健康指标：embedding-health-error。',
      '处理真实健康指标：embedding-missing-vectors。',
      '处理真实健康指标：embedding-text-hash-mismatch。',
      '处理真实健康指标：embedding-stale-or-failed。',
      '处理真实健康指标：embedding-orphaned-vectors。',
      '处理真实健康指标：embedding-coverage-below-target。',
    ]))
  })

  it('keeps health query failures visible instead of returning a stale passing report', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-runtime-health-query-error',
      cardId: 'alice-main',
      createdAt: now,
      runtimeHealth: {
        queue: {
          pending: 0,
          review: 0,
          applied: 0,
          failed: 0,
          deadLettered: 0,
        },
        recall: {
          lastLatencyMs: null,
          p95LatencyMs: null,
          lastError: null,
        },
        embedding: {
          providerConfigured: true,
          modelId: 'test-embedding',
          dimensions: 3,
          vectorSpaceId: 'test-space',
          reindexRequired: false,
          indexMode: 'sqlite-vec',
          approximate: false,
          degraded: false,
          nativeIndexReady: true,
          searchReady: true,
          lastError: null,
          canonicalCount: 0,
          indexedCount: 0,
          missingCount: 0,
          textHashMismatchCount: 0,
          staleOrFailedCount: 0,
          orphanedCount: 0,
          coverageRatio: 1,
          reindexJob: null,
        },
        errors: ['queue health unavailable: database is busy'],
      },
    })

    expect(report.passed).toBe(false)
    expect(report.stages).toContainEqual({
      stage: 'runtime-health',
      id: 'runtime-health',
      passed: false,
      itemCount: 1,
      error: 'runtime-health-query-error',
    })
    expect(report.summary.lastError).toBe('queue health unavailable: database is busy')
    expect(report.recommendedNextActions).toContain('健康指标查询失败：queue health unavailable: database is busy。')
  })

  it('keeps replay failures explicit and still returns a quality report for remaining fixtures', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-replay-failure',
      cardId: 'alice-main',
      createdAt: now,
      dialogueReplay: async () => {
        throw new Error('dialogue replay provider timeout')
      },
      workingMemory: [{
        id: 'working-memory-provider-failure',
        snapshot: buildWorkingMemorySnapshot(),
        maxRawTurns: 3,
        now,
        expectedTaskIncludes: ['真实用户试用 runner'],
      }],
      longTerm: [],
      personaTraining: [],
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failingStageIds).toContain('dialogue-replay')
    expect(report.stages[0]).toMatchObject({
      stage: 'dialogue-replay',
      passed: false,
      error: 'dialogue replay provider timeout',
    })
    expect(report.recommendedNextActions).toContain('修复 dialogue replay/provider 失败后再相信本次生产试用结果。')
    expect(report.quality.summary.workingMemoryFixtureCount).toBe(1)
  })

  it('marks missing production quality stages as not-run instead of treating them as passed', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-not-run',
      cardId: 'alice-main',
      createdAt: now,
      requireProductionStages: true,
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failingStageIds).toEqual(expect.arrayContaining([
      'dialogue-replay',
      'runtime-health',
      'working-memory-compression',
      'compressed-context-behavior',
      'long-term-recall',
      'gold-regression',
      'temporal-conflict',
      'semantic-scale-soak',
      'experience-quality',
      'scope-fuzz',
      'persona-dataset-hygiene',
      'final-replay-gate',
    ]))
    expect(report.summary.notRunStageIds).toEqual(expect.arrayContaining([
      'gold-regression',
      'temporal-conflict',
      'semantic-scale-soak',
      'scope-fuzz',
      'dialogue-replay',
      'runtime-health',
      'working-memory-compression',
      'compressed-context-behavior',
      'long-term-recall',
      'experience-quality',
      'persona-dataset-hygiene',
    ]))
    expect(report.summary.notRunStageIds).toHaveLength(12)
    expect(report.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'temporal-conflict',
        passed: false,
        status: 'not-run',
        error: expect.stringContaining('not-run'),
      }),
      expect.objectContaining({
        id: 'semantic-scale-soak',
        passed: false,
        status: 'not-run',
      }),
      expect.objectContaining({
        id: 'scope-fuzz',
        passed: false,
        status: 'not-run',
      }),
      expect.objectContaining({
        id: 'final-replay-gate',
        passed: false,
        status: 'not-run',
      }),
    ]))
  })

  it('requires the persisted final replay gate as a production evidence stage', async () => {
    const finalReplayGate = {
      version: 'final-replay-gate-v1',
      passed: true,
      failingKeys: [],
      metrics: {
        recallAt3: 1,
        precisionAt3: 1,
        wrongThreadRate: 0,
        templateLeakageFailCount: 0,
        authorityLeakCount: 0,
        localHumanlikeVisibleFallbackCount: 0,
        unsupportedSpecificityVisibleFailCount: 0,
        turnOsTraceCoverage: 1,
        learningOutcomeToSelfRevisionRoundtrip: 1,
        memoryClosureCoverage: 1,
        memoryClosureConflictClosureRate: 1,
        memoryClosureLowQualityWithholdRate: 1,
        memoryClosureUncertaintyLabelRate: 1,
        claimAccuracy: 1,
        replyAuthorityAccuracy: 1,
        latencyBudgetPass: true,
        mindParticipation: 1,
        memoryParticipation: 1,
        personalityParticipation: 1,
        relationshipParticipation: 1,
        continuityParticipation: 1,
        misinternalizationRate: 0,
        sampleCount: 1,
        minimumSampleCount: 1,
        productionGoldSampleCount: 1,
        minimumProductionGoldSampleCount: 1,
        productionGoldCoverage: 1,
      },
    } satisfies AlicizationFinalReplayGateReportRecord

    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-final-replay-gate',
      cardId: 'alice-main',
      createdAt: now,
      finalReplayGate,
    })

    expect(report.finalReplayGate).toEqual(finalReplayGate)
    expect(report.summary.notRunStageIds).not.toContain('final-replay-gate')
    expect(report.stages.find(stage => stage.id === 'final-replay-gate')).toMatchObject({
      passed: true,
      itemCount: 1,
    })
  })

  it('publishes regression metrics for recall, abstention, latency, provider, queue, and embedding health', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-regression-metrics',
      cardId: 'alice-main',
      createdAt: now,
      longTerm: [{
        fixture: {
          id: 'regression-memory',
          cardId: 'alice-main',
          query: '你还记得 Provider 失败要透明吗？',
          expectedTopIds: ['reflection-provider-failure'],
          limit: 5,
        },
        recall: async () => recallBundle('你还记得 Provider 失败要透明吗？'),
        now: vi.fn().mockReturnValueOnce(now).mockReturnValueOnce(now + 12),
      }],
      runtimeHealth: {
        queue: {
          pending: 2,
          review: 1,
          applied: 7,
          failed: 1,
          deadLettered: 1,
        },
        recall: {
          lastLatencyMs: 12,
          p95LatencyMs: 12,
          lastError: null,
        },
        embedding: {
          providerConfigured: true,
          modelId: 'test-embedding',
          dimensions: 3,
          vectorSpaceId: 'test-space',
          reindexRequired: false,
          indexMode: 'sqlite-vec',
          approximate: false,
          degraded: false,
          nativeIndexReady: true,
          searchReady: true,
          lastError: null,
          canonicalCount: 10,
          indexedCount: 9,
          missingCount: 1,
          textHashMismatchCount: 0,
          staleOrFailedCount: 0,
          orphanedCount: 0,
          coverageRatio: 0.9,
          reindexJob: null,
        },
        errors: [],
      },
    })

    expect(report.regression).toEqual(expect.objectContaining({
      recallAt1: 1,
      recallAt3: 1,
      recallAt5: 1,
      wrongThreadRate: 0,
      abstentionPrecision: 1,
      p50LatencyMs: 12,
      p95LatencyMs: 12,
      p99LatencyMs: 12,
      providerFailureRate: 0,
      embeddingCoverageRatio: 0.9,
    }))
    expect(report.regression.queueFailureRate).toBeCloseTo(1 / 6, 4)
    expect(report.regression.deadLetterRate).toBeCloseTo(1 / 12, 4)
  })

  it('fails the persona hygiene stage when the persisted dataset snapshot cannot be read', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-persona-snapshot-error',
      cardId: 'alice-main',
      createdAt: now,
      personaTrainingError: 'persona dataset snapshot unavailable: sqlite is busy',
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failingStageIds).toContain('persona-dataset-hygiene')
    expect(report.stages.find(stage => stage.id === 'persona-dataset-hygiene')).toMatchObject({
      passed: false,
      error: 'persona dataset snapshot unavailable: sqlite is busy',
    })
    expect(report.recommendedNextActions).toContain('修复 Persona/LoRA 数据集快照读取失败后再相信本次生产试用结果。')
  })

  it('uses the live Provider failure metric instead of the projected replay failure metric', async () => {
    const liveProviderTrial: MemoryLiveProviderTrialReport = {
      version: 'memory-live-provider-trial-v1',
      id: 'live-provider-metric-source',
      cardId: 'alice-main',
      sessionId: 'session-live-provider',
      createdAt: now,
      passed: false,
      summary: {
        turnCount: 4,
        succeededTurnCount: 1,
        failedTurnCount: 3,
        recalledEvidenceCount: 1,
        providerCallCount: 1,
        providerRetryCount: 2,
        providerFailureRate: 0.75,
        p50LatencyMs: 20,
        p95LatencyMs: 30,
        p99LatencyMs: 30,
        lastError: 'provider failed',
      },
      turns: [],
      productionWrites: [],
    }
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-live-provider-metric-source',
      cardId: 'alice-main',
      createdAt: now,
      dialogueReplay: async () => ({
        id: liveProviderTrial.id,
        passed: true,
        turnCount: 4,
        report: {
          ...projectMemoryLiveProviderTrialToDialogueReplay(liveProviderTrial),
          passed: true,
          summary: {
            ...projectMemoryLiveProviderTrialToDialogueReplay(liveProviderTrial).summary,
            failedTurnCount: 0,
            lastError: null,
          },
        },
        liveProviderTrial,
      }),
    })

    expect(report.regression.providerFailureRate).toBe(0.75)
  })
})
