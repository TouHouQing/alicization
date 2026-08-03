import { describe, expect, it } from 'vitest'

import { runLongTermMemoryHarnessFixture, runLongTermMemoryHarnessSuite } from './long-term-memory-harness'

const now = Date.parse('2026-07-03T12:00:00.000Z')

describe('long-term memory harness', () => {
  it('measures hit rate, precision, MRR, and false recall for a fixture', () => {
    const result = runLongTermMemoryHarnessFixture({
      now,
      fixture: {
        id: 'provider-failure-transparency-correction',
        currentUserText: '你还记得我纠正过你，Provider 失败要透明告诉我吗？',
        expectedMode: 'relationship',
        expectedTopIds: ['reflection-provider-failure-transparency'],
        forbiddenTopIds: ['episode-progress'],
        candidates: [
          {
            id: 'reflection-provider-failure-transparency',
            kind: 'reflection',
            summary: '用户纠正过 Alicization：Provider 超时、模型失败、工具失败要透明告诉用户，不要伪装成正常回复。',
            source: 'memory_reflections',
            confidence: 0.86,
            salience: 0.88,
            cues: ['Provider 失败透明', '模型失败', '工具失败'],
          },
          {
            id: 'episode-progress',
            kind: 'episode',
            summary: '用户询问项目进度。',
            source: 'episodic_events',
            confidence: 0.2,
            salience: 0.1,
            cues: ['进度'],
          },
        ],
      },
    })

    expect(result.passed).toBe(true)
    expect(result.topIds[0]).toBe('reflection-provider-failure-transparency')
    expect(result.hitRate).toBe(1)
    expect(result.mrr).toBe(1)
    expect(result.falseRecallCount).toBe(0)
    expect(result.sourceTraceRate).toBe(1)
  })

  it('aggregates suite-level recall metrics', () => {
    const suite = runLongTermMemoryHarnessSuite({
      now,
      fixtures: [
        {
          id: 'gaming-recall',
          currentUserText: '我们去打游戏吧',
          expectedMode: 'episodic',
          expectedTopIds: ['episode-game'],
          candidates: [{
            id: 'episode-game',
            kind: 'episode',
            summary: '上周一起玩过 Minecraft，用户说下次还想继续联机探索。',
            source: 'episodic_events',
            confidence: 0.84,
            salience: 0.82,
            cues: ['打游戏', 'Minecraft', '联机'],
            occurredAt: now - 7 * 24 * 60 * 60 * 1000,
          }],
        },
        {
          id: 'plain-greeting-no-recall',
          currentUserText: '早上好',
          expectedTopIds: [],
          candidates: [],
        },
      ],
    })

    expect(suite.passed).toBe(true)
    expect(suite.averageHitRate).toBe(1)
    expect(suite.falseRecallCount).toBe(0)
  })

  it('penalizes a high lexical match from the wrong current thread', () => {
    const result = runLongTermMemoryHarnessFixture({
      now,
      fixture: {
        id: 'wrong-thread-suppression',
        currentUserText: '继续上次那个开发任务',
        currentThreadTitle: 'WorkingMemory owner 长期记忆候选出口',
        activeTask: '把 owner 的长期记忆候选出口做成结构化队列',
        expectedMode: 'task',
        expectedTopIds: ['wm-owner-queue-plan'],
        forbiddenTopIds: ['a-line-failure-template'],
        limit: 1,
        candidates: [
          {
            id: 'a-line-failure-template',
            kind: 'episode',
            summary: '继续上次那个开发任务，排查对话超时和固定模板兜底。',
            source: 'episodic_events',
            confidence: 0.92,
            salience: 0.86,
            cues: ['继续上次那个开发任务', '固定模板', '对话超时'],
            threadAnchor: 'A线 对话链路失败面治理',
            occurredAt: now - 2 * 24 * 60 * 60 * 1000,
          },
          {
            id: 'wm-owner-queue-plan',
            kind: 'consolidation',
            summary: 'WorkingMemory owner 的长期记忆候选出口需要结构化队列，后续清洗从 owner 出发。',
            source: 'memory_consolidations',
            confidence: 0.76,
            salience: 0.74,
            cues: ['WorkingMemory owner', '长期记忆候选出口', '结构化队列'],
            threadAnchor: 'WorkingMemory owner 长期记忆候选出口',
            occurredAt: now - 12 * 60 * 60 * 1000,
          },
        ],
      },
    })

    expect(result.passed).toBe(true)
    expect(result.topIds).toEqual(['wm-owner-queue-plan'])
    expect(result.bundle.evidence[0]?.rankReasons).toEqual(expect.arrayContaining(['rrf:structured:thread-fit']))
  })

  it('emits trace metrics for semantic hits, NDCG, and blocked leaks', () => {
    const result = runLongTermMemoryHarnessFixture({
      now,
      fixture: {
        id: 'semantic-provider-failure-transparency-correction',
        currentUserText: '你还记得我纠正过你，模型或工具失败要透明说出来吗？',
        expectedMode: 'relationship',
        expectedTopIds: ['reflection-provider-failure-transparency'],
        forbiddenTopIds: ['generic-progress'],
        blockedIds: ['tombstoned-provider-failure-transparency'],
        semanticExpectedIds: ['reflection-provider-failure-transparency'],
        semanticScores: {
          'reflection-provider-failure-transparency': 0.92,
          'generic-progress': 0.2,
        },
        semantic: {
          available: true,
          providerId: 'test-provider',
          modelId: 'test-embedding',
          dimensions: 3,
          reindexRequired: false,
        },
        candidates: [
          {
            id: 'reflection-provider-failure-transparency',
            kind: 'reflection',
            summary: '用户纠正过：模型失败、Provider 超时、工具失败都要透明告诉用户。',
            source: 'memory_reflections',
            confidence: 0.9,
            salience: 0.9,
            cues: ['失败透明', 'Provider 超时', '工具失败'],
          },
          {
            id: 'generic-progress',
            kind: 'consolidation',
            summary: '用户问过项目进度。',
            source: 'memory_consolidations',
            confidence: 0.4,
            salience: 0.3,
            cues: ['进度'],
          },
          {
            id: 'tombstoned-provider-failure-transparency',
            kind: 'reflection',
            summary: '这条旧纠正已经被 tombstone，不应召回。',
            source: 'memory_reflections',
            confidence: 0.95,
            salience: 0.95,
            cues: ['失败透明'],
          },
        ],
      },
    })

    expect(result.metrics.recallAtK).toBe(1)
    expect(result.metrics.ndcg).toBeGreaterThan(0.9)
    expect(result.metrics.semanticHitRate).toBe(1)
    expect(result.metrics.blockedLeakCount).toBe(0)
    expect(result.trace.owner).toBe('LongTermMemoryRecall')
    expect(result.trace.rankReasonsById['reflection-provider-failure-transparency']).toEqual(
      expect.arrayContaining(['rrf:semantic:semantic-score']),
    )
    expect(result.trace.semantic).toEqual(expect.objectContaining({
      available: true,
      modelId: 'test-embedding',
    }))
  })
})
