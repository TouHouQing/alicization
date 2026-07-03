import { describe, expect, it } from 'vitest'

import { runLongTermMemoryHarnessFixture, runLongTermMemoryHarnessSuite } from './long-term-memory-harness'

const now = Date.parse('2026-07-03T12:00:00.000Z')

describe('long-term memory harness', () => {
  it('measures hit rate, precision, MRR, and false recall for a fixture', () => {
    const result = runLongTermMemoryHarnessFixture({
      now,
      fixture: {
        id: 'fixed-template-correction',
        currentUserText: '你还记得我不要固定模板回复吗？',
        expectedMode: 'relationship',
        expectedTopIds: ['reflection-fixed-template'],
        forbiddenTopIds: ['episode-progress'],
        candidates: [
          {
            id: 'reflection-fixed-template',
            kind: 'reflection',
            summary: '用户纠正过 Alicization：不要固定模板回复，要从连续数字生命人格回应。',
            source: 'memory_reflections',
            confidence: 0.86,
            salience: 0.88,
            cues: ['不要固定模板回复', '固定模板', '数字生命人格'],
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
    expect(result.topIds[0]).toBe('reflection-fixed-template')
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
})
