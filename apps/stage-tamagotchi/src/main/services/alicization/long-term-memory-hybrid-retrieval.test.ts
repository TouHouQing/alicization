import { describe, expect, it } from 'vitest'

import {
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import { rankLongTermMemoryHybridEvidence } from './long-term-memory-hybrid-retrieval'

const now = Date.parse('2026-07-03T12:00:00.000Z')

describe('long-term memory hybrid retrieval', () => {
  it('lets multi-channel evidence beat a single lexical-only candidate', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '继续上次那个长期记忆开发任务',
      currentThreadTitle: '长期记忆 hybrid retrieval',
      activeTask: '实现 RRF 多通道召回融合',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '继续上次那个长期记忆开发任务',
      currentThreadTitle: '长期记忆 hybrid retrieval',
      activeTask: '实现 RRF 多通道召回融合',
    })

    const ranked = rankLongTermMemoryHybridEvidence({
      intent,
      plan,
      now,
      limit: 2,
      candidates: [
        {
          id: 'lexical-only-wrong-thread',
          kind: 'episode',
          source: 'episodic_events',
          summary: '继续上次那个长期记忆开发任务，但其实是旧的 A 线固定模板排查。',
          confidence: 0.92,
          salience: 0.86,
          threadAnchor: 'A线 对话失败面治理',
          cues: ['继续上次那个长期记忆开发任务'],
          occurredAt: now - 2 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'hybrid-current-task',
          kind: 'consolidation',
          source: 'memory_consolidations',
          summary: '长期记忆 hybrid retrieval 需要用 RRF 融合 lexical、structured、semantic、episodic 通道。',
          confidence: 0.74,
          salience: 0.72,
          threadAnchor: '长期记忆 hybrid retrieval',
          cues: ['RRF', '多通道召回融合'],
          occurredAt: now - 6 * 60 * 60 * 1000,
        },
      ],
      semanticScores: {
        'hybrid-current-task': 0.88,
      },
    })

    expect(ranked[0]?.candidate.id).toBe('hybrid-current-task')
    expect(ranked[0]?.rankReasons).toEqual(expect.arrayContaining([
      'rrf:structured:thread-fit',
      'rrf:semantic:semantic-score',
    ]))
    expect(ranked.find(item => item.candidate.id === 'lexical-only-wrong-thread')?.rankReasons).toEqual(expect.arrayContaining([
      'wrong-thread-penalty',
    ]))
  })

  it('keeps old high-salience memory reachable instead of erasing it by time decay', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '你还记得我不要固定模板回复吗？',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '你还记得我不要固定模板回复吗？',
    })
    const ranked = rankLongTermMemoryHybridEvidence({
      intent,
      plan,
      now,
      limit: 2,
      candidates: [
        {
          id: 'old-high-salience-correction',
          kind: 'reflection',
          source: 'memory_reflections',
          summary: '用户纠正过 Alicization：不要固定模板回复，要从连续数字生命人格回应。',
          confidence: 0.86,
          salience: 0.97,
          cues: ['不要固定模板回复', '数字生命人格'],
          updatedAt: now - 120 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'recent-low-salience-progress',
          kind: 'episode',
          source: 'episodic_events',
          summary: '用户最近问过一次项目进度。',
          confidence: 0.62,
          salience: 0.2,
          cues: ['最近'],
          occurredAt: now - 2 * 24 * 60 * 60 * 1000,
        },
      ],
    })

    expect(ranked[0]?.candidate.id).toBe('old-high-salience-correction')
    expect(ranked[0]?.rankReasons).toEqual(expect.arrayContaining([
      'high-salience',
      'rrf:lexical:query-overlap',
    ]))
  })
})
