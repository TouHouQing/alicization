import { describe, expect, it } from 'vitest'

import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  buildLongTermMemoryRecallBlock,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'

const now = Date.parse('2026-07-02T12:00:00.000Z')

function requireRankedEvidenceContract(
  evidence: ReturnType<typeof buildLongTermMemoryEvidenceBundle>['evidence'][number],
) {
  const contract: {
    scope: {
      userId: string
      cardId: string | null
    }
    provenance: string
    evidenceVersion: string
    version: string
  } = evidence
  return contract
}

function parseRecallFact(block: string | null) {
  expect(block).not.toBeNull()
  return JSON.parse(block!) as {
    type: string
    data: {
      owner: string
      status: string
      intent: {
        mode: string
        shouldRecall: boolean
        confidence: number
        rationale: string
        temporalFocus: string
        targetKinds: string[]
      }
      confidence: number
      budget: string
      riskFlags: string[]
      evidence: Array<{
        id: string
        kind: string
        summary: string
        source: string
        scope: {
          userId: string
          cardId: string | null
        }
        provenance: string
        confidence: number
        score: number
        evidenceVersion: string
        version: string
        queryMatches: string[]
        rankReasons: string[]
      }>
    }
  }
}

describe('long-term memory recall owner', () => {
  it('exports observation-only query and evidence contracts', () => {
    const currentUserText = '也许你还记得我之前说过的秘密偏好吗？'
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText,
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText,
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      scope: {
        userId: 'user-observation-contract',
        cardId: 'card-observation-contract',
      },
      candidates: [{
        id: 'private-observation',
        kind: 'fact',
        summary: '用户有一个需要谨慎检索的私人偏好。',
        source: 'memory_facts',
        confidence: 0.86,
        sensitivity: 'private',
      }],
    })

    expect(plan).not.toHaveProperty('confidencePolicy')
    expect(plan.riskFlags).toEqual(expect.arrayContaining([
      'query-uncertain',
      'query-sensitive',
    ]))
    expect(JSON.stringify(plan)).not.toMatch(/confidencePolicy|direct|tentative|inward-only/u)
    expect(bundle.evidence[0]).not.toHaveProperty('visibleMode')
    expect(bundle.evidence[0]).not.toHaveProperty('speechPlan')
    expect(bundle.evidence[0]).not.toHaveProperty('surfaceMode')
    expect(bundle.evidence[0]).not.toHaveProperty('visibleMode')

    const contract = requireRankedEvidenceContract(bundle.evidence[0]!)
    expect(contract).toMatchObject({
      scope: {
        userId: 'user-observation-contract',
        cardId: 'card-observation-contract',
      },
      provenance: 'remembered',
      evidenceVersion: 'long-term-memory-evidence-v1',
      version: 'long-term-memory-evidence-v1',
    })
  })

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
          scope: {
            userId: 'user-1',
            cardId: 'card-1',
          },
          provenance: 'remembered',
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
    expect(intent.rationale).toBe('recall:episodic')
    expect(plan.episodicQueries.join(' ')).toContain('一起做过的事情')
    expect(bundle.evidence[0]?.candidate.id).toBe('episode-game-last-week')
    expect(parseRecallFact(block)).toMatchObject({
      type: 'alicization-long-term-memory-recall',
      data: {
        owner: 'LongTermMemoryRecall',
        status: 'recalled',
        intent: {
          mode: 'episodic',
          shouldRecall: true,
          temporalFocus: 'unspecified',
          targetKinds: ['episode', 'consolidation', 'fact'],
        },
        budget: 'light',
        riskFlags: ['low-recall-confidence'],
        evidence: expect.arrayContaining([{
          id: 'episode-game-last-week',
          kind: 'episode',
          summary: expect.stringContaining('Minecraft'),
          source: 'episodic_events',
          scope: {
            userId: 'user-1',
            cardId: 'card-1',
          },
          provenance: 'remembered',
          confidence: 0.82,
          score: expect.any(Number),
          evidenceVersion: 'long-term-memory-evidence-v1',
          version: 'long-term-memory-evidence-v1',
          queryMatches: expect.any(Array),
          rankReasons: expect.any(Array),
        }]),
      },
    })
    expect(block).not.toBeNull()
    expect(block!.trim().startsWith('{')).toBe(true)
  })

  it('recalls a durable preference without authoring topic-specific search hints', () => {
    const text = '你还记得我不喜欢把 Provider 失败包装成成功吗？'
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
        id: 'reflection-failure-preference',
        kind: 'reflection',
        summary: '用户不喜欢把 Provider 失败包装成成功。',
        source: 'memory_reflections',
        confidence: 0.88,
        salience: 0.92,
        reviewStatus: 'confirmed',
        cues: ['Provider 失败', '包装成成功', '用户偏好'],
      }],
    })
    const block = buildLongTermMemoryRecallBlock({ bundle })
    const fact = parseRecallFact(block)

    expect(intent.mode).toBe('preference')
    expect(intent.rationale).toBe('recall:preference')
    expect(plan.entityHints.join(' ')).not.toMatch(/Alicization|人格|固定模板/u)
    expect(plan.keywordQueries).toContain(text)
    expect(fact.data.evidence[0]?.summary).toContain('Provider 失败')
    expect(block).not.toContain('long_term_queue')
    expect(block).not.toContain('working_memory_long_term_transactions')
  })

  it('recalls an explicit past statement without requiring topic-specific cues', () => {
    const text = '你还记得我说过失败时要明确说明原因吗？'
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: text,
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: text,
    })

    expect(intent).toMatchObject({
      mode: 'mixed',
      shouldRecall: true,
      rationale: 'recall:mixed',
      targetKinds: ['fact', 'reflection', 'episode', 'consolidation'],
    })
    expect(plan.semanticQueries).toContain(text)
  })

  it('does not turn personality-related topics into a special recall mode', () => {
    const text = '我在设计数字生命人格界面的信息层级。'
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: text,
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: text,
    })

    expect(intent.mode).toBe('none')
    expect(intent.shouldRecall).toBe(false)
    expect(intent.rationale).toBe('recall:none')
    expect(plan.entityHints.join(' ')).not.toMatch(/Alicization 人格|固定模板|用户纠正/u)
    expect(plan.semanticQueries).toEqual([])
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

  it('keeps private memory sensitivity as evidence metadata without deciding presentation', () => {
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
    const fact = parseRecallFact(block)

    expect(bundle.evidence[0]?.candidate.sensitivity).toBe('private')
    expect(fact.data.evidence[0]).toMatchObject({
      sensitivity: 'private',
    })
    expect(bundle.evidence[0]).not.toHaveProperty('visibleMode')
    expect(fact.data.evidence[0]).not.toHaveProperty('visibility')
  })

  it('drops structured internal facts before recall ranking can boost them', () => {
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
      candidates: [{
        id: 'reflection-old-template',
        kind: 'reflection',
        summary: 'mode=internal; lifecycle=held',
        source: 'memory_reflections',
        origin: 'internal-structured-fact',
        confidence: 0.9,
        salience: 0.9,
        cues: ['偏好'],
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

  it('keeps clean recalled evidence after removing a higher-scored structured internal fact', () => {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: '你还记得我不喜欢隐藏 Provider 失败吗？',
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: '你还记得我不喜欢隐藏 Provider 失败吗？',
    })
    const bundle = buildLongTermMemoryEvidenceBundle({
      intent,
      plan,
      now,
      candidates: [
        {
          id: 'reflection-old-template',
          kind: 'reflection',
          summary: 'mode=internal; lifecycle=held',
          source: 'memory_reflections',
          origin: 'internal-structured-fact',
          confidence: 0.99,
          salience: 0.99,
          cues: ['Provider 失败'],
        },
        {
          id: 'reflection-cleaned',
          kind: 'reflection',
          summary: '用户明确要求透明说明 Provider 失败。',
          source: 'memory_reflections',
          confidence: 0.74,
          salience: 0.62,
          reviewStatus: 'confirmed',
          cues: ['Provider 失败', '失败面透明'],
        },
      ],
      semanticScores: {
        'reflection-old-template': 1,
        'reflection-cleaned': 0.2,
      },
    })
    const block = buildLongTermMemoryRecallBlock({ bundle })
    const fact = parseRecallFact(block)

    expect(bundle.evidence.map(item => item.candidate.id)).toEqual(['reflection-cleaned'])
    expect(fact.data.evidence[0]?.summary).toContain('用户明确要求透明说明 Provider 失败')
    expect(block).not.toContain('mode=internal')
    expect(block).not.toContain('lifecycle=held')
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
