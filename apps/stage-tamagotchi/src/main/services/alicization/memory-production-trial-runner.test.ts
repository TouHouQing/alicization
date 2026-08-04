import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'
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
          provenance: {
            kind: 'working-memory-cleaning',
            cleaningTransactionId: 'cleaning-provider-failure',
            cleanedAt: now - 100,
          },
        }],
        expectedExportedSourceIds: ['reflection-provider-failure'],
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
})
