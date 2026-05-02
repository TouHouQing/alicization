import { describe, expect, it } from 'vitest'

import { rankAlicizationConversationTurnsForRecall } from './memory-conversation-retrieval'

describe('memory conversation retrieval', () => {
  it('keeps retrospective recall from collapsing onto many turns from the same day', () => {
    const nowTs = Date.UTC(2026, 3, 28, 12, 0, 0)
    const ranked = rankAlicizationConversationTurnsForRecall({
      query: '几天前我们聊过什么',
      limit: 4,
      nowTs,
      recollectionIntent: {
        mode: 'conversation-history',
        temporalFocus: 'cross-session',
        searchEpisodes: false,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['聊过什么'],
        rationale: 'The host explicitly asked for earlier conversation history.',
        confidence: 0.84,
        recollectionAgenda: {
          whyRecallNow: 'The host explicitly asked for earlier conversation history.',
          goalSimilarity: 0.34,
          relationshipNeed: 0.18,
          affectivePull: 0.08,
          sceneFamiliarity: 0.12,
          candidateTimeScopes: [
            {
              scope: 'cross-session',
              weight: 0.9,
              rationale: 'Earlier conversation history should open first.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'phase',
              weight: 0.4,
              rationale: 'A conversation phase is enough here.',
            },
          ],
          candidateProcedureLines: [],
          uncertaintyTolerance: 'low',
        },
      },
      rows: [
        {
          turnId: 'turn-a1',
          sessionId: 'session-a',
          userText: '几天前我们聊过 runtime continuity',
          assistantText: '那次我们一直在收 runtime continuity 那条线。',
          createdAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        },
        {
          turnId: 'turn-a2',
          sessionId: 'session-a',
          userText: '然后我们又聊了 continuity payoff',
          assistantText: '那条 continuity payoff 还没彻底收口。',
          createdAt: Date.UTC(2026, 3, 20, 9, 0, 0),
        },
        {
          turnId: 'turn-b1',
          sessionId: 'session-b',
          userText: '前几天我们聊过 proactive cadence',
          assistantText: '那次更偏主动节律和打扰边界。',
          createdAt: Date.UTC(2026, 3, 22, 8, 0, 0),
        },
      ],
    })

    expect(ranked).toHaveLength(2)
    expect(ranked.map(item => item.turnId)).toEqual(expect.arrayContaining(['turn-a2', 'turn-b1']))
    expect(ranked.map(item => item.turnId)).not.toContain('turn-a1')
  })
})
