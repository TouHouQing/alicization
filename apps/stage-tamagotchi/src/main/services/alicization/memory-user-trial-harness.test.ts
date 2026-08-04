import type { WorkingMemorySnapshot } from './life-core/working-memory'

import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import { runMemoryUserTrialHarness } from './memory-user-trial-harness'

const now = Date.parse('2026-08-04T10:00:00.000Z')

function trialSnapshot(): WorkingMemorySnapshot {
  const snapshot = createEmptyWorkingMemorySnapshot({
    cardId: 'alice-main',
    sessionId: 'session-real-user-trial',
    now,
  })

  return {
    ...snapshot,
    recentRawTurns: [
      {
        turnId: 'turn-1',
        role: 'user',
        text: '向量模型配置那里，我只想填 baseUrl，后面的 /v1/embeddings 你来补。',
        createdAt: now,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: null,
        importance: 0.86,
      },
      {
        turnId: 'turn-2',
        role: 'alice',
        text: '我会按 SiliconFlow 兼容 embeddings 接口处理。',
        createdAt: now + 1,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: null,
        importance: 0.72,
      },
      {
        turnId: 'turn-3',
        role: 'tool',
        text: 'embedding provider failed with HTTP 400',
        createdAt: now + 2,
        source: 'tool-result',
        visibility: 'user-visible',
        failureKind: 'provider-error',
        importance: 0.92,
      },
      {
        turnId: 'turn-4',
        role: 'user',
        text: '不要把 provider 失败包装成正常回复，要明确说出来。',
        createdAt: now + 3,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: null,
        importance: 0.94,
      },
      {
        turnId: 'turn-5',
        role: 'alice',
        text: '收到，我会保留失败透明这条纠正。',
        createdAt: now + 4,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: null,
        importance: 0.76,
      },
      {
        turnId: 'turn-6',
        role: 'user',
        text: '继续把这条链路做成可试用闭环。',
        createdAt: now + 5,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: null,
        importance: 0.8,
      },
    ],
    currentThread: {
      title: '记忆真实试用闭环',
      currentUserMove: '测试 embedding 配置和记忆召回',
      currentAliceMove: '建立质量 harness',
      primaryAnchor: 'memory-user-trial-harness.ts',
      mode: 'task',
      shouldHold: true,
      confidence: 0.9,
    },
    activeTask: {
      summary: '把 embedding 配置、失败透明和召回评测做成用户可试用闭环',
      status: 'active',
      evidenceTurnIds: ['turn-1', 'turn-3', 'turn-4'],
    },
    unresolvedQuestions: [{
      text: '用户是否能从记忆 UI 看到本次召回为什么命中？',
      sourceTurnId: 'turn-6',
    }],
    commitments: [{
      text: 'baseUrl 后缀由系统补全，Provider 失败必须透明展示。',
      sourceTurnId: 'turn-2',
    }],
    userCorrections: [{
      text: 'provider 失败不要包装成正常人格回复。',
      sourceTurnId: 'turn-4',
      scope: 'reply',
    }],
    memoryQueryHints: ['SiliconFlow embedding baseUrl /v1/embeddings', 'Provider 失败透明'],
    audit: {
      failureTurnIds: ['turn-3'],
      excludedLongTermCandidateTurnIds: ['turn-3'],
      notes: ['provider-error surfaced to user'],
    },
    longTermCandidates: [{
      sourceTurnIds: ['turn-1', 'turn-4'],
      kind: 'correction',
      summary: 'SiliconFlow embedding 只填 baseUrl，/v1/embeddings 由系统补；Provider 失败要透明。',
      reason: '用户明确纠正配置和失败透明。',
      salience: 0.94,
      sensitivity: 'personal',
      confidence: 0.9,
      allowTraining: false,
    }],
  }
}

describe('memory user trial harness', () => {
  it('simulates a realistic user trial across compression, long-term recall, and scope boundaries', () => {
    const result = runMemoryUserTrialHarness({
      id: 'real-user-trial-embedding-config',
      createdAt: now + 60_000,
      cardId: 'alice-main',
      workingMemory: [
        {
          id: 'embedding-config-working-memory',
          snapshot: trialSnapshot(),
          maxRawTurns: 3,
          now: now + 10_000,
          expectedTaskIncludes: ['embedding 配置', '召回评测'],
          expectedQuestionIncludes: ['记忆 UI'],
          expectedCommitmentIncludes: ['baseUrl', 'Provider 失败'],
          expectedCorrectionIncludes: ['provider 失败'],
          expectedFailureTurnIds: ['turn-3'],
          forbiddenConfirmedCandidateText: ['raw transcript', 'review queue confirmed'],
        },
      ],
      reviewDecisions: [{
        candidateId: 'ltm-siliconflow-baseurl',
        sourceTurnIds: ['turn-1', 'turn-4'],
        status: 'confirmed',
        reason: '用户明确确认 embedding 配置和失败透明纠正可以进入长期记忆。',
      }],
      longTermSeeds: [
        {
          cardId: 'alice-main',
          blocked: true,
          candidate: {
            id: 'ltm-tombstoned-old-provider-note',
            kind: 'reflection',
            summary: '旧的 embedding provider 配置说明已经被删除，不应再召回。',
            source: 'memory_reflections',
            confidence: 0.95,
            salience: 0.95,
            reviewStatus: 'confirmed',
            cues: ['SiliconFlow', 'embedding provider'],
          },
        },
        {
          cardId: 'alice-main',
          candidate: {
            id: 'ltm-review-only-raw-transcript',
            kind: 'consolidation',
            summary: 'review 队列里有一段未确认 raw transcript，不能当长期记忆使用。',
            source: 'memory_consolidations',
            confidence: 0.9,
            salience: 0.9,
            reviewStatus: 'candidate',
            cues: ['raw transcript', 'Provider 失败'],
          },
        },
        {
          cardId: 'other-card',
          candidate: {
            id: 'ltm-other-card-siliconflow',
            kind: 'reflection',
            summary: '另一个机体 card 也提到过 SiliconFlow，但不能串到 alice-main。',
            source: 'memory_reflections',
            confidence: 0.99,
            salience: 0.99,
            reviewStatus: 'confirmed',
            cues: ['SiliconFlow', 'baseUrl', '/v1/embeddings'],
          },
        },
      ],
      recallChecks: [
        {
          id: 'cross-session-siliconflow-recall',
          cardId: 'alice-main',
          query: '继续修向量模型配置，SiliconFlow 的 baseUrl 后面应该怎么接？',
          activeTask: '修 SiliconFlow embedding 配置',
          currentThreadTitle: '记忆真实试用闭环',
          workingMemoryQueryHints: ['SiliconFlow embedding baseUrl /v1/embeddings'],
          expectedTopIds: ['ltm-siliconflow-baseurl'],
          forbiddenTopIds: ['ltm-other-card-siliconflow', 'ltm-review-only-raw-transcript', 'ltm-tombstoned-old-provider-note'],
          semanticExpectedIds: ['ltm-siliconflow-baseurl'],
          semanticScores: {
            'ltm-siliconflow-baseurl': 0.94,
            'ltm-other-card-siliconflow': 0.99,
            'ltm-review-only-raw-transcript': 0.91,
            'ltm-tombstoned-old-provider-note': 0.96,
          },
          semantic: {
            available: true,
            providerId: 'openai-compatible',
            modelId: 'BAAI/bge-m3',
            dimensions: 1024,
            reindexRequired: false,
          },
          latencyMs: 42,
        },
      ],
    })

    expect(result.passed).toBe(true)
    expect(result.metrics.recallAtK).toBe(1)
    expect(result.metrics.compressionLossCount).toBe(0)
    expect(result.metrics.cardScopeLeakCount).toBe(0)
    expect(result.metrics.reviewCandidateLeakCount).toBe(0)
    expect(result.metrics.blockedLeakCount).toBe(0)
    expect(result.metrics.semanticHitRate).toBe(1)
    expect(result.findings.filter(item => item.severity === 'critical')).toEqual([])
    expect(result.longTerm[0]?.topIds).toEqual(['ltm-siliconflow-baseurl'])
    expect(result.timeline.map(item => item.kind)).toEqual([
      'working-memory-check',
      'review-decision',
      'long-term-recall-check',
    ])
  })

  it('turns recall misses and compression loss into optimization findings', () => {
    const result = runMemoryUserTrialHarness({
      id: 'real-user-trial-quality-gap',
      createdAt: now + 60_000,
      cardId: 'alice-main',
      workingMemory: [
        {
          id: 'missing-correction-working-memory',
          snapshot: createEmptyWorkingMemorySnapshot({
            cardId: 'alice-main',
            sessionId: 'session-gap',
            now,
          }),
          now: now + 1000,
          expectedCorrectionIncludes: ['provider 失败'],
        },
      ],
      longTermSeeds: [],
      recallChecks: [
        {
          id: 'missing-siliconflow-memory',
          cardId: 'alice-main',
          query: '继续修向量模型配置，SiliconFlow 的 baseUrl 后面应该怎么接？',
          activeTask: '修 SiliconFlow embedding 配置',
          expectedTopIds: ['ltm-siliconflow-baseurl'],
        },
      ],
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.recallAtK).toBe(0)
    expect(result.metrics.compressionLossCount).toBe(1)
    expect(result.findings.map(item => item.code)).toEqual(expect.arrayContaining([
      'working-memory-compression-loss',
      'long-term-recall-miss',
    ]))
    expect(result.recommendedNextActions).toEqual(expect.arrayContaining([
      '补充真实用户 replay fixture，覆盖缺失的长期记忆查询。',
      '检查 WorkingMemory 压缩视图是否丢失用户纠正、承诺或失败面。',
    ]))
  })

  it('reports a card-scope leak when a quality probe includes out-of-card candidates', () => {
    const result = runMemoryUserTrialHarness({
      id: 'real-user-trial-card-scope-probe',
      createdAt: now + 60_000,
      cardId: 'alice-main',
      workingMemory: [],
      longTermSeeds: [
        {
          cardId: 'alice-main',
          candidate: {
            id: 'ltm-current-card-memory',
            kind: 'reflection',
            summary: '当前机体记忆：embedding 配置要按 baseUrl 自动补全。',
            source: 'memory_reflections',
            confidence: 0.8,
            salience: 0.8,
            reviewStatus: 'confirmed',
            cues: ['embedding 配置', 'baseUrl'],
          },
        },
        {
          cardId: 'other-card',
          candidate: {
            id: 'ltm-other-card-memory',
            kind: 'reflection',
            summary: '其他机体记忆：embedding 配置要按 baseUrl 自动补全。',
            source: 'memory_reflections',
            confidence: 0.99,
            salience: 0.99,
            reviewStatus: 'confirmed',
            cues: ['embedding 配置', 'baseUrl'],
          },
        },
      ],
      recallChecks: [{
        id: 'card-scope-leak-probe',
        cardId: 'alice-main',
        query: '继续修 embedding 配置，baseUrl 怎么接？',
        activeTask: '修 embedding 配置',
        expectedTopIds: ['ltm-current-card-memory'],
        forbiddenTopIds: ['ltm-other-card-memory'],
        candidateScope: 'all-seeds',
        semanticScores: {
          'ltm-current-card-memory': 0.7,
          'ltm-other-card-memory': 0.99,
        },
      }],
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.cardScopeLeakCount).toBe(1)
    expect(result.findings.map(item => item.code)).toEqual(expect.arrayContaining(['card-scope-leak']))
  })

  it('observes tombstoned memory leaks instead of hiding them behind pre-filtering', () => {
    const result = runMemoryUserTrialHarness({
      id: 'real-user-trial-tombstone-probe',
      createdAt: now + 60_000,
      cardId: 'alice-main',
      workingMemory: [],
      longTermSeeds: [
        {
          cardId: 'alice-main',
          candidate: {
            id: 'ltm-current-provider-rule',
            kind: 'reflection',
            summary: '当前长期记忆：Provider 失败必须透明展示。',
            source: 'memory_reflections',
            confidence: 0.82,
            salience: 0.82,
            reviewStatus: 'confirmed',
            cues: ['Provider 失败', '透明展示'],
          },
        },
        {
          cardId: 'alice-main',
          blocked: true,
          candidate: {
            id: 'ltm-tombstoned-provider-rule',
            kind: 'reflection',
            summary: '已删除长期记忆：Provider 失败可以被包装成正常回复。',
            source: 'memory_reflections',
            confidence: 0.99,
            salience: 0.99,
            reviewStatus: 'confirmed',
            cues: ['Provider 失败', '正常回复'],
          },
        },
      ],
      recallChecks: [{
        id: 'tombstone-leak-probe',
        cardId: 'alice-main',
        query: '你还记得 Provider 失败应该怎么说吗？',
        expectedTopIds: ['ltm-current-provider-rule'],
        forbiddenTopIds: ['ltm-tombstoned-provider-rule'],
        blockedPolicy: 'observe',
        limit: 2,
        semanticScores: {
          'ltm-current-provider-rule': 0.7,
          'ltm-tombstoned-provider-rule': 0.99,
        },
      }],
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.blockedLeakCount).toBe(1)
    expect(result.findings.map(item => item.code)).toEqual(expect.arrayContaining(['blocked-memory-leak']))
  })

  it('flags confirmed raw transcript as an invalid long-term memory source', () => {
    const result = runMemoryUserTrialHarness({
      id: 'real-user-trial-raw-transcript-probe',
      createdAt: now + 60_000,
      cardId: 'alice-main',
      workingMemory: [],
      longTermSeeds: [
        {
          cardId: 'alice-main',
          candidate: {
            id: 'ltm-cleaned-reflection',
            kind: 'reflection',
            summary: '清洗后的长期记忆：用户要求失败透明。',
            source: 'memory_reflections',
            confidence: 0.82,
            salience: 0.82,
            reviewStatus: 'confirmed',
            cues: ['失败透明'],
          },
        },
        {
          cardId: 'alice-main',
          candidate: {
            id: 'ltm-confirmed-raw-transcript',
            kind: 'reflection',
            summary: 'raw transcript: 用户逐字说过 Provider 失败不要包装。',
            source: 'raw_transcript',
            origin: 'raw_transcript',
            confidence: 0.99,
            salience: 0.99,
            reviewStatus: 'confirmed',
            cues: ['raw transcript', 'Provider 失败'],
          },
        },
      ],
      recallChecks: [{
        id: 'raw-transcript-leak-probe',
        cardId: 'alice-main',
        query: '你还记得失败透明这件事吗？',
        expectedTopIds: ['ltm-cleaned-reflection'],
        forbiddenTopIds: ['ltm-confirmed-raw-transcript'],
        limit: 2,
        semanticScores: {
          'ltm-cleaned-reflection': 0.7,
          'ltm-confirmed-raw-transcript': 0.99,
        },
      }],
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.rawTranscriptLeakCount).toBe(1)
    expect(result.findings.map(item => item.code)).toEqual(expect.arrayContaining(['raw-transcript-leak']))
  })

  it('fails when a trial requires semantic recall but embedding is unavailable', () => {
    const result = runMemoryUserTrialHarness({
      id: 'real-user-trial-semantic-required',
      createdAt: now + 60_000,
      cardId: 'alice-main',
      workingMemory: [],
      longTermSeeds: [{
        cardId: 'alice-main',
        candidate: {
          id: 'ltm-semantic-target',
          kind: 'reflection',
          summary: '用户要求 embedding provider 支持语义召回。',
          source: 'memory_reflections',
          confidence: 0.9,
          salience: 0.9,
          reviewStatus: 'confirmed',
          cues: ['embedding provider', '语义召回'],
        },
      }],
      recallChecks: [{
        id: 'semantic-required-probe',
        cardId: 'alice-main',
        query: '继续做语义召回闭环。',
        activeTask: '做语义召回闭环',
        expectedTopIds: ['ltm-semantic-target'],
        requireSemantic: true,
        semantic: {
          available: false,
          providerId: null,
          modelId: null,
          dimensions: null,
          reindexRequired: true,
        },
      }],
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.semanticRequiredMissCount).toBe(1)
    expect(result.findings.map(item => item.code)).toEqual(expect.arrayContaining(['semantic-required-miss']))
  })
})
