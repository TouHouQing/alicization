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

  it('slightly prefers continuity-bearing relationship turns when project state says anthropomorphic memory closure is still open', () => {
    const nowTs = Date.UTC(2026, 3, 28, 12, 0, 0)
    const ranked = rankAlicizationConversationTurnsForRecall({
      query: '想起之前更像她自己的回返方式',
      limit: 4,
      nowTs,
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: false,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['return softly', 'space first', 'relationship continuity'],
        rationale: 'The host is asking for a remembered relationship return style rather than a generic adjacent exchange.',
        confidence: 0.86,
        recollectionAgenda: {
          whyRecallNow: 'A continuity-bearing relationship return should surface first.',
          goalSimilarity: 0.52,
          relationshipNeed: 0.8,
          affectivePull: 0.34,
          sceneFamiliarity: 0.22,
          candidateTimeScopes: [
            {
              scope: 'cross-session',
              weight: 0.9,
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era',
              weight: 0.88,
            },
          ],
          candidateProcedureLines: ['return softly', 'space first'],
          uncertaintyTolerance: 'medium',
        },
      },
      rows: [
        {
          turnId: 'turn-continuity',
          sessionId: 'session-a',
          userText: '你之前是怎么更温和地回到那条关系线的',
          assistantText: '我那次是先留空间，再慢一点回返，没有直接把亲近推高。',
          createdAt: Date.UTC(2026, 3, 20, 9, 0, 0),
        },
        {
          turnId: 'turn-adjacent',
          sessionId: 'session-b',
          userText: '我们之前也聊过关系语气',
          assistantText: '那次主要只是说语气要轻一点。',
          createdAt: Date.UTC(2026, 3, 22, 8, 0, 0),
        },
      ],
    })

    expect(ranked[0]?.turnId).toBe('turn-continuity')
  })

  it('lets persisted project-state continuity metadata slightly lift matching subconscious turns during relationship-history recall', () => {
    const nowTs = Date.UTC(2026, 3, 28, 12, 0, 0)
    const ranked = rankAlicizationConversationTurnsForRecall({
      query: '想起之前更像她自己的回返方式',
      limit: 4,
      nowTs,
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: false,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['return softly', 'space first', 'relationship continuity'],
        rationale: 'The host is asking for a remembered relationship return style rather than a generic adjacent exchange.',
        confidence: 0.86,
        recollectionAgenda: {
          whyRecallNow: 'A continuity-bearing relationship return should surface first.',
          goalSimilarity: 0.52,
          relationshipNeed: 0.8,
          affectivePull: 0.34,
          sceneFamiliarity: 0.22,
          candidateTimeScopes: [
            {
              scope: 'cross-session',
              weight: 0.9,
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era',
              weight: 0.88,
            },
          ],
          candidateProcedureLines: ['return softly', 'space first'],
          uncertaintyTolerance: 'medium',
        },
      },
      rows: [
        {
          turnId: 'turn-subconscious-project-state',
          sessionId: 'session-c',
          userText: '你之前是怎么更温和地回到那条关系线的',
          assistantText: '我那次是先留空间，再慢一点回返，没有直接把亲近推高。',
          structuredJson: JSON.stringify({
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
            },
          }),
          createdAt: Date.UTC(2026, 3, 20, 9, 0, 0),
        },
        {
          turnId: 'turn-similar-but-no-project-state',
          sessionId: 'session-d',
          userText: '你之前是怎么更温和地回到那条关系线的',
          assistantText: '我那次是先留空间，再慢一点回返，没有直接把亲近推高。',
          createdAt: Date.UTC(2026, 3, 20, 9, 0, 0),
        },
      ],
    })

    expect(ranked[0]?.turnId).toBe('turn-subconscious-project-state')
  })
})
