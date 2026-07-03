import { describe, expect, it } from 'vitest'

import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  buildLongTermMemoryRecallBlock,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'

const now = Date.parse('2026-07-02T12:00:00.000Z')

describe('long-term memory recall owner', () => {
  it('plans episodic recall for gaming continuity and ranks matching shared experience', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '我们去打游戏吧',
      workingMemoryQueryHints: ['游戏'],
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '我们去打游戏吧',
      workingMemoryQueryHints: ['游戏'],
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [
        {
          id: 'episode-game-last-week',
          kind: 'episode',
          summary: '上周你们一起玩过 Minecraft，用户说下次还想继续联机探索。',
          source: 'episodic_events',
          confidence: 0.82,
          salience: 0.8,
          occurredAt: now - 7 * 24 * 60 * 60 * 1000,
          cues: ['打游戏', 'Minecraft', '联机'],
        },
        {
          id: 'fact-unrelated',
          kind: 'fact',
          summary: '用户喜欢简短回答。',
          source: 'memory_facts',
          confidence: 0.76,
          salience: 0.4,
        },
      ],
    })
    const block = buildLongTermMemoryRecallBlock({ bundle })

    expect(intent.mode).toBe('episodic')
    expect(intent.shouldRecall).toBe(true)
    expect(plan.episodicQueries.join(' ')).toContain('一起做过的事情')
    expect(bundle.evidence[0]?.candidate.id).toBe('episode-game-last-week')
    expect(block).toContain('[ALICIZATION_RECALLED_MEMORY]')
    expect(block).toContain('Minecraft')
    expect(block).toContain('source=episodic_events:episode-game-last-week')
  })

  it('recalls persona correction without treating queue internals as visible memory', () => {
    const text = '你还记得我不想要固定模板回复吗？我需要她数字生命自身的人格回复。'
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: text,
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: text,
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [{
        id: 'reflection-fixed-template',
        kind: 'reflection',
        summary: '用户纠正过 Alicization：不要固定模板回复，要从自身连续数字生命人格回应。',
        source: 'memory_reflections',
        confidence: 0.88,
        salience: 0.92,
        cues: ['固定模板', '数字生命人格', '用户纠正'],
      }],
    })
    const block = buildLongTermMemoryRecallBlock({ bundle })

    expect(intent.mode).toBe('relationship')
    expect(plan.entityHints.join(' ')).toContain('Alicization 人格 固定模板')
    expect(block).toContain('用户纠正过 Alicization')
    expect(block).not.toContain('long_term_queue')
    expect(block).not.toContain('working_memory_long_term_transactions')
  })

  it('does not recall for plain greeting without durable memory need', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '早上好，今天怎么样？',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '早上好，今天怎么样？',
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [{
        id: 'episode-game-last-week',
        kind: 'episode',
        summary: '上周你们一起玩过 Minecraft。',
        source: 'episodic_events',
        confidence: 0.82,
      }],
    })

    expect(intent.shouldRecall).toBe(false)
    expect(bundle.evidence).toEqual([])
    expect(buildLongTermMemoryRecallBlock({ bundle })).toBeNull()
  })

  it('keeps private memory inward-only even when it matches the query', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '你还记得我之前说过的偏好吗？',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '你还记得我之前说过的偏好吗？',
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [{
        id: 'private-preference',
        kind: 'fact',
        summary: '用户有一个私人偏好，需要谨慎只作为内在约束使用。',
        source: 'memory_facts',
        confidence: 0.84,
        salience: 0.8,
        sensitivity: 'private',
        cues: ['偏好', '之前'],
      }],
    })
    const block = buildLongTermMemoryRecallBlock({ bundle })

    expect(bundle.evidence[0]?.visibleMode).toBe('inward-only')
    expect(block).toContain('inward:')
  })
})
