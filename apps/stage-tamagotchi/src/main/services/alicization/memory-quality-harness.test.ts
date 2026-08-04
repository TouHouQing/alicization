import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { describe, expect, it, vi } from 'vitest'

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

  it('fails DB-backed recall when only part of the expected memory set is returned', async () => {
    const result = await runDbBackedLongTermMemoryQualityFixture({
      fixture: {
        id: 'db-backed-partial-expected-set',
        cardId: 'card-1',
        query: '你还记得我不要固定模板回复吗？',
        expectedTopIds: ['reflection-fixed-template', 'missing-failure-transparency'],
      },
      recall: async () => bundleFor('你还记得我不要固定模板回复吗？'),
      now: vi.fn().mockReturnValueOnce(6000).mockReturnValueOnce(6001),
    })

    expect(result.metrics.recallAtK).toBe(0.5)
    expect(result.passed).toBe(false)
  })

  it('fails DB-backed recall when wrong-thread evidence is selected', async () => {
    const result = await runDbBackedLongTermMemoryQualityFixture({
      fixture: {
        id: 'db-backed-wrong-thread-leak',
        cardId: 'card-1',
        query: '你还记得我不要固定模板回复吗？',
        expectedTopIds: ['reflection-fixed-template'],
        wrongThreadIds: ['reflection-fixed-template'],
      },
      recall: async () => bundleFor('你还记得我不要固定模板回复吗？'),
      now: vi.fn().mockReturnValueOnce(6100).mockReturnValueOnce(6101),
    })

    expect(result.metrics.wrongThreadRate).toBe(1)
    expect(result.passed).toBe(false)
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

  it('aggregates realistic user-trial harness results into the quality report', async () => {
    const report = await runMemoryQualityHarnessSuite({
      createdAt: 9000,
      longTerm: [],
      workingMemory: [],
      userTrials: [
        {
          id: 'trial-embedding-config',
          cardId: 'card-1',
          createdAt: 9000,
          workingMemory: [],
          longTermSeeds: [{
            cardId: 'card-1',
            candidate: {
              id: 'reflection-embedding-config',
              kind: 'reflection',
              summary: '用户要求 embedding provider 只填 baseUrl，系统补 /v1/embeddings。',
              source: 'memory_reflections',
              confidence: 0.9,
              salience: 0.9,
              reviewStatus: 'confirmed',
              cues: ['embedding', 'baseUrl', '/v1/embeddings'],
            },
          }],
          recallChecks: [{
            id: 'trial-recall-embedding-config',
            cardId: 'card-1',
            query: '继续修 embedding 配置，baseUrl 后面怎么接？',
            activeTask: '修 embedding 配置',
            expectedTopIds: ['reflection-embedding-config'],
            semantic: {
              available: true,
              providerId: 'test-provider',
              modelId: 'test-embedding',
              dimensions: 3,
              reindexRequired: false,
            },
          }],
        },
      ],
    })

    expect(report.passed).toBe(true)
    expect(report.summary.userTrialCount).toBe(1)
    expect(report.summary.optimizationFindingCount).toBe(0)
    expect(report.userTrials[0]?.metrics.recallAtK).toBe(1)
  })

  it('includes user-trial recall misses in the aggregate recall summary', async () => {
    const report = await runMemoryQualityHarnessSuite({
      createdAt: 9100,
      longTerm: [
        {
          fixture: {
            id: 'db-backed-fixed-template',
            cardId: 'card-1',
            query: '你还记得我不要固定模板回复吗？',
            expectedTopIds: ['reflection-fixed-template'],
          },
          recall: async () => bundleFor('你还记得我不要固定模板回复吗？'),
          now: vi.fn().mockReturnValueOnce(9100).mockReturnValueOnce(9101),
        },
      ],
      workingMemory: [],
      userTrials: [
        {
          id: 'trial-missing-recall',
          cardId: 'card-1',
          createdAt: 9100,
          workingMemory: [],
          longTermSeeds: [],
          recallChecks: [{
            id: 'trial-missing-recall-check',
            cardId: 'card-1',
            query: '继续修 embedding 配置。',
            activeTask: '修 embedding 配置',
            expectedTopIds: ['reflection-embedding-config'],
          }],
        },
      ],
    })

    expect(report.passed).toBe(false)
    expect(report.summary.recallAtK).toBe(0.5)
    expect(report.summary.failingFixtureIds).toContain('trial-missing-recall')
  })
})
