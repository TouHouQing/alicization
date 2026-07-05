import { describe, expect, it, vi } from 'vitest'

import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import {
  runDbBackedLongTermMemoryQualityFixture,
  runMemoryQualityHarnessSuite,
} from './memory-quality-harness'

function bundleFor(query: string): LongTermMemoryEvidenceBundle {
  const intent = deriveLongTermMemoryRecallIntent({ currentUserText: query })
  const plan = buildLongTermMemoryQueryPlan({ intent, currentUserText: query })
  return buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    now: 3000,
    limit: 3,
    semanticScores: { 'reflection-fixed-template': 0.9 },
    candidates: [{
      id: 'reflection-fixed-template',
      kind: 'reflection',
      summary: '用户纠正过不要固定模板回复。',
      source: 'memory_reflections',
      confidence: 0.9,
      salience: 0.9,
      cues: ['固定模板'],
    }],
  })
}

describe('memory quality harness', () => {
  it('evaluates a DB-backed long-term recall function with explicit trace output', async () => {
    const recall = vi.fn(async () => bundleFor('你还记得我不要固定模板回复吗？'))
    const result = await runDbBackedLongTermMemoryQualityFixture({
      fixture: {
        id: 'db-backed-fixed-template',
        cardId: 'card-1',
        query: '你还记得我不要固定模板回复吗？',
        expectedTopIds: ['reflection-fixed-template'],
        semantic: {
          available: true,
          providerId: 'test-provider',
          modelId: 'test-embedding',
          dimensions: 3,
          reindexRequired: false,
        },
      },
      recall,
      now: vi.fn()
        .mockReturnValueOnce(3000)
        .mockReturnValueOnce(3017),
    })

    expect(recall).toHaveBeenCalledWith({
      cardId: 'card-1',
      currentUserText: '你还记得我不要固定模板回复吗？',
      limit: 5,
    })
    expect(result.passed).toBe(true)
    expect(result.metrics.latencyMs).toBe(17)
    expect(result.trace.selectedIds).toEqual(['reflection-fixed-template'])
    expect(result.trace.semantic.available).toBe(true)
  })

  it('keeps recall failures explicit instead of returning a successful-looking result', async () => {
    const result = await runDbBackedLongTermMemoryQualityFixture({
      fixture: {
        id: 'db-backed-provider-failure',
        cardId: 'card-1',
        query: '继续上次那个开发任务',
        expectedTopIds: ['task-memory'],
      },
      recall: async () => {
        throw new Error('embedding provider timeout')
      },
      now: vi.fn()
        .mockReturnValueOnce(5000)
        .mockReturnValueOnce(5050),
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.recallAtK).toBe(0)
    expect(result.trace.error).toBe('embedding provider timeout')
  })

  it('aggregates long-term and working-memory results into one quality report', async () => {
    const report = await runMemoryQualityHarnessSuite({
      createdAt: 7000,
      longTerm: [
        {
          fixture: {
            id: 'db-backed-fixed-template',
            cardId: 'card-1',
            query: '你还记得我不要固定模板回复吗？',
            expectedTopIds: ['reflection-fixed-template'],
          },
          recall: async () => bundleFor('你还记得我不要固定模板回复吗？'),
          now: vi.fn().mockReturnValueOnce(7000).mockReturnValueOnce(7001),
        },
      ],
      workingMemory: [],
    })

    expect(report.version).toBe('memory-quality-harness-v1')
    expect(report.passed).toBe(true)
    expect(report.summary.longTermFixtureCount).toBe(1)
    expect(report.traces).toHaveLength(1)
  })
})
