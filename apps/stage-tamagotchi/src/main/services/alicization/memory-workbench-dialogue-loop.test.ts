import { describe, expect, it } from 'vitest'

import { buildLongTermMemoryRecallBlock } from './long-term-memory-recall'

describe('memory workbench dialogue loop acceptance', () => {
  it('renders game recall evidence for the dialogue prompt without replacing WorkingMemory owner', () => {
    const block = buildLongTermMemoryRecallBlock({
      bundle: {
        intent: {
          mode: 'episodic',
          shouldRecall: true,
          confidence: 0.82,
          rationale: 'User utterance can benefit from shared episodic memory.',
          temporalFocus: 'recent-or-mid',
          targetKinds: ['episode'],
          queryHints: ['我们去打游戏吧'],
          riskFlags: [],
        },
        plan: {
          rawQuery: '我们去打游戏吧',
          normalizedQuery: '我们去打游戏吧',
          keywordQueries: ['打游戏'],
          phraseQueries: ['打游戏'],
          charGramQueries: ['游戏'],
          semanticQueries: ['共同经历'],
          episodicQueries: ['一起做过的事情'],
          temporalHints: ['上周'],
          entityHints: ['游戏'],
          procedureHints: [],
          threadHints: [],
          negativeCues: [],
          confidencePolicy: 'direct',
          riskFlags: [],
          targetKinds: ['episode'],
        },
        evidence: [{
          candidate: {
            id: 'episode-game-last-week',
            kind: 'episode',
            summary: '上周我们一起玩了 Minecraft。',
            source: 'episodic_events',
            confidence: 0.9,
            salience: 0.92,
            updatedAt: 100,
            occurredAt: 100,
            threadId: 'game',
            threadAnchor: 'game',
            cues: ['打游戏'],
            entities: ['Minecraft'],
            sensitivity: 'personal',
          },
          score: 0.91,
          queryMatches: ['打游戏'],
          rankReasons: ['episodic-match', 'shared-activity'],
          visibleMode: 'explicit',
        }],
        confidence: 0.86,
        budgetClass: 'normal',
      },
    })

    expect(block).toContain('[ALICIZATION_RECALLED_MEMORY]')
    expect(block).toContain('Minecraft')
    expect(block).not.toContain('[ALICIZATION_WORKING_MEMORY_OWNER]')
  })

  it('keeps recall failure explicit instead of producing a fixed persona fallback', () => {
    const block = buildLongTermMemoryRecallBlock({
      bundle: {
        intent: {
          mode: 'none',
          shouldRecall: false,
          confidence: 0,
          rationale: 'Long-term memory recall failed.',
          temporalFocus: 'unspecified',
          targetKinds: [],
          queryHints: [],
          riskFlags: ['recall-failed'],
        },
        plan: {
          rawQuery: '继续',
          normalizedQuery: '继续',
          keywordQueries: [],
          phraseQueries: [],
          charGramQueries: [],
          semanticQueries: [],
          episodicQueries: [],
          temporalHints: [],
          entityHints: [],
          procedureHints: [],
          threadHints: [],
          negativeCues: [],
          confidencePolicy: 'direct',
          riskFlags: ['recall-failed'],
          targetKinds: [],
        },
        evidence: [],
        confidence: 0,
        budgetClass: 'none',
      },
    })

    expect(block).toContain('recall-failed')
    expect(block).not.toContain('我在。同一条本地数字生命的线还在')
  })
})
