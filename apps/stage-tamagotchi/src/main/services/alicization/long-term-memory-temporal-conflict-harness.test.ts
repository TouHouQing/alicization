import { describe, expect, it } from 'vitest'

import { runLongTermMemoryTemporalConflictHarness } from './long-term-memory-temporal-conflict-harness'

const day = 24 * 60 * 60 * 1000
const now = Date.parse('2026-08-04T14:30:00.000Z')

describe('long-term memory temporal conflict harness', () => {
  it('treats later user corrections as the current truth instead of letting old high-salience memory win', () => {
    const report = runLongTermMemoryTemporalConflictHarness({
      now,
      fixtures: [{
        id: 'current-drink-preference-after-correction',
        scenario: 'knowledge-update',
        currentUserText: '你还记得我现在喜欢喝什么吗？',
        expectedTemporalFocus: 'current',
        expectedTopIds: ['fact-current-jasmine-tea'],
        forbiddenTopIds: ['fact-old-black-coffee'],
        limit: 1,
        candidates: [
          {
            id: 'fact-old-black-coffee',
            kind: 'fact',
            summary: '旧记忆：用户以前喜欢黑咖啡。',
            source: 'memory_facts',
            confidence: 0.72,
            salience: 0.7,
            reviewStatus: 'confirmed',
            cues: ['喜欢喝', '黑咖啡'],
            updatedAt: now - 45 * day,
          },
          {
            id: 'fact-current-jasmine-tea',
            kind: 'fact',
            summary: '用户后来改口：现在更喜欢茉莉花茶。',
            source: 'memory_facts',
            confidence: 0.93,
            salience: 0.94,
            reviewStatus: 'confirmed',
            cues: ['现在喜欢喝', '茉莉花茶'],
            updatedAt: now - 2 * 60 * 60 * 1000,
          },
        ],
      }],
    })

    expect(report.summary.failingFixtureIds).toEqual([])
    expect(report.results[0]?.result.topIds).toEqual(['fact-current-jasmine-tea'])
    expect(report.results[0]?.metrics.knowledgeUpdateMissCount).toBe(0)
    expect(report.results[0]?.metrics.staleMemoryLeakCount).toBe(0)
    expect(report.traces[0]?.temporalFocus).toBe('current')
  })

  it('covers yesterday, last week, recently, and long-ago relative-time recall gates', () => {
    const report = runLongTermMemoryTemporalConflictHarness({
      now,
      fixtures: [
        {
          id: 'relative-yesterday',
          scenario: 'relative-time',
          currentUserText: '你还记得昨天我们处理过哪个记忆问题吗？',
          expectedTemporalFocus: 'recent',
          expectedTopIds: ['episode-yesterday-provider'],
          limit: 1,
          candidates: [
            {
              id: 'episode-yesterday-provider',
              kind: 'episode',
              summary: '昨天处理过 Provider 失败透明和 embedding 400。',
              source: 'episodic_events',
              confidence: 0.88,
              salience: 0.82,
              reviewStatus: 'confirmed',
              cues: ['昨天', 'Provider 失败', 'embedding 400'],
              occurredAt: now - day,
            },
            {
              id: 'episode-long-ago-provider',
              kind: 'episode',
              summary: '很久以前也讨论过 Provider 错误。',
              source: 'episodic_events',
              confidence: 0.84,
              salience: 0.8,
              reviewStatus: 'confirmed',
              cues: ['很久以前', 'Provider 错误'],
              occurredAt: now - 90 * day,
            },
          ],
        },
        {
          id: 'relative-last-week',
          scenario: 'relative-time',
          currentUserText: '上周那次长期记忆搜索问题是什么？',
          expectedTemporalFocus: 'recent-or-mid',
          expectedTopIds: ['episode-last-week-search'],
          limit: 1,
          candidates: [{
            id: 'episode-last-week-search',
            kind: 'episode',
            summary: '上周修过长期记忆分页搜索和中文筛选。',
            source: 'episodic_events',
            confidence: 0.9,
            salience: 0.86,
            reviewStatus: 'confirmed',
            cues: ['上周', '长期记忆搜索', '中文筛选'],
            occurredAt: now - 7 * day,
          }],
        },
        {
          id: 'relative-recently',
          scenario: 'relative-time',
          currentUserText: '你还记得最近我纠正过你什么吗？',
          expectedTemporalFocus: 'recent',
          expectedTopIds: ['reflection-recent-correction'],
          limit: 1,
          candidates: [{
            id: 'reflection-recent-correction',
            kind: 'reflection',
            summary: '最近用户纠正过：不要用固定模板占据人格回复。',
            source: 'memory_reflections',
            confidence: 0.91,
            salience: 0.89,
            reviewStatus: 'confirmed',
            cues: ['最近', '纠正', '固定模板'],
            updatedAt: now - 3 * day,
          }],
        },
        {
          id: 'relative-long-ago',
          scenario: 'relative-time',
          currentUserText: '很久以前我们讨论过哪个基础方向？',
          expectedTemporalFocus: 'distant',
          expectedTopIds: ['consolidation-long-ago-life-core'],
          limit: 1,
          candidates: [{
            id: 'consolidation-long-ago-life-core',
            kind: 'consolidation',
            summary: '很久以前确定 Alicization 要做本地数字生命，而不是聊天壳。',
            source: 'memory_consolidations',
            confidence: 0.9,
            salience: 0.92,
            reviewStatus: 'confirmed',
            cues: ['很久以前', '本地数字生命', '不是聊天壳'],
            occurredAt: now - 120 * day,
          }],
        },
      ],
    })

    expect(report.summary.failingFixtureIds).toEqual([])
    expect(report.summary.temporalFocusMismatchCount).toBe(0)
    expect(report.results.map(result => result.result.topIds[0])).toEqual([
      'episode-yesterday-provider',
      'episode-last-week-search',
      'reflection-recent-correction',
      'consolidation-long-ago-life-core',
    ])
  })

  it('flags tombstoned memory that still wins through semantic score as a hard gate failure', () => {
    const report = runLongTermMemoryTemporalConflictHarness({
      now,
      fixtures: [{
        id: 'tombstoned-provider-rule-leak',
        scenario: 'tombstone',
        currentUserText: '你还记得 Provider 失败应该怎么说吗？',
        expectedTemporalFocus: 'cross-session',
        expectedTopIds: ['fact-current-provider-rule'],
        forbiddenTopIds: ['fact-tombstoned-provider-rule'],
        blockedIds: ['fact-tombstoned-provider-rule'],
        blockedPolicy: 'observe',
        limit: 2,
        candidates: [
          {
            id: 'fact-current-provider-rule',
            kind: 'fact',
            summary: '当前记忆：Provider 失败必须透明告诉用户。',
            source: 'memory_facts',
            confidence: 0.82,
            salience: 0.82,
            reviewStatus: 'confirmed',
            cues: ['Provider 失败', '透明'],
            updatedAt: now - day,
          },
          {
            id: 'fact-tombstoned-provider-rule',
            kind: 'fact',
            summary: '已 tombstone 的旧记忆：Provider 失败可以包装成人格回复。',
            source: 'memory_facts',
            confidence: 0.99,
            salience: 0.99,
            reviewStatus: 'confirmed',
            cues: ['Provider 失败', '人格回复'],
            updatedAt: now - 30 * day,
          },
        ],
        semanticScores: {
          'fact-current-provider-rule': 0.72,
          'fact-tombstoned-provider-rule': 0.99,
        },
      }],
    })

    expect(report.passed).toBe(false)
    expect(report.summary.blockedLeakCount).toBe(1)
    expect(report.results[0]?.metrics.tombstoneLeakCount).toBe(1)
    expect(report.recommendedNextActions).toContain('检查 tombstone/revoke 删除与 vector index 过滤是否一致。')
  })
})
