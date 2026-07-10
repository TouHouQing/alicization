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
    expect(block).toContain('owner=LongTermMemoryRecall')
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
        reviewStatus: 'confirmed',
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

  it('drops historical fixed-template residue before recall ranking can boost it', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '你还记得我不要固定模板回复吗？',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '你还记得我不要固定模板回复吗？',
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [{
        id: 'reflection-old-template',
        kind: 'reflection',
        summary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        source: 'memory_reflections',
        confidence: 0.9,
        salience: 0.9,
        cues: ['固定模板', '数字生命'],
      }],
      semanticScores: {
        'reflection-old-template': 1,
      },
    })
    const block = buildLongTermMemoryRecallBlock({ bundle })

    expect(bundle.evidence).toEqual([])
    expect(block).toBeNull()
  })

  it('does not treat pending reflection candidates as confirmed long-term recall', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '你还记得我不要固定模板回复吗？',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '你还记得我不要固定模板回复吗？',
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [{
        id: 'reflection-pending-template-correction',
        kind: 'reflection',
        summary: '用户刚刚提出不要固定模板回复，这条还在 review 队列等待确认。',
        source: 'memory_reflections',
        confidence: 0.99,
        salience: 0.99,
        reviewStatus: 'pending',
        cues: ['固定模板', 'review 队列'],
      }],
      semanticScores: {
        'reflection-pending-template-correction': 1,
      },
    })

    expect(bundle.evidence).toEqual([])
    expect(buildLongTermMemoryRecallBlock({ bundle })).toBeNull()
  })

  it('does not recall any reviewed candidate until its review status is confirmed', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '你还记得我说过的偏好吗？',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '你还记得我说过的偏好吗？',
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [
        {
          id: 'fact-pending-preference',
          kind: 'fact',
          summary: '用户刚刚说过一个偏好，但这条事实还在 review 队列等待确认。',
          source: 'memory_facts',
          confidence: 0.99,
          salience: 0.99,
          reviewStatus: 'pending',
          cues: ['偏好'],
        },
        {
          id: 'episode-review-needed',
          kind: 'episode',
          summary: '用户刚刚描述了一段经历，但这段 episode 还需要复核。',
          source: 'episodic_events',
          confidence: 0.98,
          salience: 0.98,
          reviewStatus: 'review-needed',
          cues: ['偏好'],
        },
      ],
      semanticScores: {
        'fact-pending-preference': 1,
        'episode-review-needed': 0.9,
      },
    })

    expect(bundle.evidence).toEqual([])
    expect(buildLongTermMemoryRecallBlock({ bundle })).toBeNull()
  })

  it('keeps clean recalled evidence above a higher-scored fixed-template candidate', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '你还记得我不要固定模板回复吗？',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '你还记得我不要固定模板回复吗？',
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [
        {
          id: 'reflection-old-template',
          kind: 'reflection',
          summary: 'Before answering, remember this is still the same local-first digital life project. Same Phase 1 digital life.',
          source: 'memory_reflections',
          confidence: 0.99,
          salience: 0.99,
          cues: ['固定模板', '数字生命'],
        },
        {
          id: 'reflection-cleaned',
          kind: 'reflection',
          summary: '用户明确要求失败面透明，不要用固定模板遮盖 provider failure。',
          source: 'memory_reflections',
          confidence: 0.74,
          salience: 0.62,
          reviewStatus: 'confirmed',
          cues: ['固定模板', '失败面透明'],
        },
      ],
      semanticScores: {
        'reflection-old-template': 1,
        'reflection-cleaned': 0.2,
      },
    })
    const block = buildLongTermMemoryRecallBlock({ bundle })

    expect(bundle.evidence.map(item => item.candidate.id)).toEqual(['reflection-cleaned'])
    expect(block).toContain('用户明确要求失败面透明')
    expect(block).not.toContain('Before answering')
    expect(block).not.toContain('Same Phase 1 digital life')
  })

  it('fuses semantic scores into the evidence bundle instead of dropping vector recall', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '今晚继续开黑吗？',
      workingMemoryQueryHints: ['一起玩游戏'],
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '今晚继续开黑吗？',
      workingMemoryQueryHints: ['一起玩游戏'],
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      limit: 2,
      candidates: [
        {
          id: 'lexical-gaming-note',
          kind: 'episode',
          summary: '用户问过“今晚继续开黑吗”这句网络用语怎么翻译。',
          source: 'episodic_events',
          confidence: 0.54,
          salience: 0.32,
          cues: ['今晚继续开黑吗'],
          occurredAt: now - 24 * 60 * 60 * 1000,
        },
        {
          id: 'shared-minecraft-evening',
          kind: 'episode',
          summary: '上周用户和 Alicization 一起玩 Minecraft 放松，用户说下次还想继续联机探索。',
          source: 'episodic_events',
          confidence: 0.78,
          salience: 0.76,
          cues: ['Minecraft', '联机探索'],
          occurredAt: now - 7 * 24 * 60 * 60 * 1000,
        },
      ],
      semanticScores: {
        'shared-minecraft-evening': 0.96,
      },
    })

    expect(bundle.evidence[0]?.candidate.id).toBe('shared-minecraft-evening')
    expect(bundle.evidence[0]?.rankReasons).toEqual(expect.arrayContaining([
      'rrf:semantic:semantic-score',
    ]))
  })
})
