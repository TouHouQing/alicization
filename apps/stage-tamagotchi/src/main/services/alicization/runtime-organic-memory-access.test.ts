import { describe, expect, it, vi } from 'vitest'

import { createAlicizationOrganicMemoryAccessRuntime } from './runtime-organic-memory-access'

describe('runtime-organic-memory-access', () => {
  it('reuses short-lived caches for repeated consolidation and conversation recall', async () => {
    const searchConversationTurnsForRecall = vi.fn(async () => [{
      turnId: 'turn-1',
      sessionId: 'session-1',
      userText: '前几天我们聊过什么',
      assistantText: '我们聊过 runtime seam。',
      createdAt: 1,
    }])
    const searchMemoryConsolidations = vi.fn(async () => [{
      id: 'consolidation-1',
      kind: 'autobiographical' as const,
      facet: 'task-era' as const,
      periodKey: '2026-04-runtime',
      periodStartedAt: 1,
      periodEndedAt: 2,
      summary: 'That period kept returning to the runtime seam.',
      lesson: 'Return to the seam before branching.',
      cues: ['runtime seam'],
      confidence: 0.82,
      dominantProvenance: 'remembered' as const,
      derivedEventIds: ['episode-1'],
      updatedAt: 2,
    }])

    const runtime = createAlicizationOrganicMemoryAccessRuntime({
      getActiveCardId: () => 'default',
      getSoulSnapshot: () => null,
      bootstrap: async () => ({
        soulPath: 'SOUL.md',
        content: '',
        frontmatter: {
          host_attitude: 'warm',
          core_incarnation: '',
        },
      } as any),
      listActiveThoughts: async () => [],
      countSubconsciousFragments: async () => 0,
      listRecentSubconsciousFragments: async () => [],
      getMetaValue: async () => undefined,
      replaceActiveThoughts: async () => {},
      setMetaValue: async () => {},
      searchSubconsciousFragments: async () => [],
      listRecentEpisodicEvents: async () => [],
      listMemoryConsolidations: async () => [],
      getLatestRelationshipDynamics: async () => null,
      listRelationshipOutcomes: async () => [],
      listMemoryReflections: async () => [],
      listPersonaReinforcementEvents: async () => [],
      summarizePersonStateEvolution: async () => ({
        trustShift: 0,
        closenessShift: 0,
        repairShift: 0,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0,
        latestDoctrine: null,
        latestBurdenLine: null,
        latestTrustMeaning: null,
        latestDominantRung: null,
        recentSummaries: [],
        explanation: [],
        updatedAt: null,
      }),
      readMindHead: async () => null,
      searchEpisodicEvents: async () => [],
      searchConversationTurnsForRecall,
      searchMemoryConsolidations,
      listConversationTurnsBySession: async () => [],
    })

    const firstConversation = await runtime.recallConversationHistory({
      query: '前几天我们聊过什么',
    })
    const secondConversation = await runtime.recallConversationHistory({
      query: '前几天我们聊过什么',
    })
    const firstConsolidation = await runtime.recallMemoryConsolidations({
      query: '继续按之前那样修这个 runtime seam',
    })
    const secondConsolidation = await runtime.recallMemoryConsolidations({
      query: '继续按之前那样修这个 runtime seam',
    })

    expect(firstConversation).toHaveLength(1)
    expect(secondConversation).toHaveLength(1)
    expect(firstConsolidation).toHaveLength(1)
    expect(secondConsolidation).toHaveLength(1)
    expect(searchConversationTurnsForRecall).toHaveBeenCalledTimes(1)
    expect(searchMemoryConsolidations).toHaveBeenCalledTimes(1)
  })

  it('prewarms hot retrieval lines for deep-thread recall seeds', async () => {
    const searchEpisodicEvents = vi.fn(async () => [])
    const searchConversationTurnsForRecall = vi.fn(async () => [])
    const searchMemoryConsolidations = vi.fn(async () => [])

    const runtime = createAlicizationOrganicMemoryAccessRuntime({
      getActiveCardId: () => 'default',
      getSoulSnapshot: () => null,
      bootstrap: async () => ({
        soulPath: 'SOUL.md',
        content: '',
        frontmatter: {
          host_attitude: 'warm',
          core_incarnation: '',
        },
      } as any),
      listActiveThoughts: async () => [],
      countSubconsciousFragments: async () => 0,
      listRecentSubconsciousFragments: async () => [],
      getMetaValue: async () => undefined,
      replaceActiveThoughts: async () => {},
      setMetaValue: async () => {},
      searchSubconsciousFragments: async () => [],
      listRecentEpisodicEvents: async () => [],
      listMemoryConsolidations: async () => [],
      getLatestRelationshipDynamics: async () => null,
      listRelationshipOutcomes: async () => [],
      listMemoryReflections: async () => [],
      listPersonaReinforcementEvents: async () => [],
      summarizePersonStateEvolution: async () => ({
        trustShift: 0,
        closenessShift: 0,
        repairShift: 0,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0,
        latestDoctrine: null,
        latestBurdenLine: null,
        latestTrustMeaning: null,
        latestDominantRung: null,
        recentSummaries: [],
        explanation: [],
        updatedAt: null,
      }),
      readMindHead: async () => null,
      searchEpisodicEvents,
      searchConversationTurnsForRecall,
      searchMemoryConsolidations,
      listConversationTurnsBySession: async () => [],
    })

    const plan = await runtime.prewarmAccessibilityLine({
      recallSeed: '换了这么久，这种活你还是会沿旧方法接吗',
      recallGovernor: {
        recollectionIntent: {
          mode: 'experience-pattern',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['旧方法', '接回去'],
          rationale: 'Task migration should reopen prior procedure continuity.',
          confidence: 0.82,
        },
        threadAnchors: ['runtime seam'],
      } as any,
      sessionId: 'session-1',
      turnId: 'turn-1',
    })

    expect(plan?.prewarmKey).toContain('runtime seam')
    expect(searchEpisodicEvents).toHaveBeenCalledTimes(1)
    expect(searchConversationTurnsForRecall).toHaveBeenCalledTimes(1)
    expect(searchMemoryConsolidations).toHaveBeenCalledTimes(1)
  })
})
