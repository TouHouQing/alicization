import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeMemoryRuntime } from './runtime-memory-runtime'

describe('runtime memory runtime', () => {
  it('bundles organic memory access, search, and reconsolidation under one runtime facade', async () => {
    const listMindTurnEvents = vi.fn(async () => [])
    const searchEpisodicEvents = vi.fn(async () => [])
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryRuntime({
      organicMemoryAccess: {
        getActiveCardId: () => 'card-1',
        getSoulSnapshot: () => null,
        bootstrap: async () => ({
          soulPath: 'soul.md',
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
        searchConversationTurnsForRecall: async () => [],
        searchMemoryConsolidations: async () => [],
        listConversationTurnsBySession: async () => [],
      },
      organicMemorySearch: {
        normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
        selectPromptActiveThoughts: ({ activeThoughts }) => activeThoughts,
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        planRecollectionIntent: async () => null,
        planMemoryRecollection: async () => null,
        planRecollectionSpeech: async () => null,
        planMemoryDeliberation: async () => null,
        isPersonaResidueMemoryText: () => false,
      },
      memoryReconsolidation: {
        sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
        sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
        errorMessageFrom: error => error instanceof Error ? error.message : String(error),
        appendAuditLog: async () => {},
        alicizationDb: {
          listMindTurnEvents,
          searchEpisodicEvents,
          appendMindTurnEvents,
        },
      },
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'runtime seam',
      recallGovernor: null,
    })
    await runtime.memoryReconsolidationRuntime.reconsolidateDialogueFeedbackMemoryTrace({
      cardId: 'card-1',
      decisionTraceId: 'trace-1',
      feedback: 'robotic',
      previousAssistantText: '模板壳',
      userText: '你这句太模板了',
      sessionId: 'session-1',
      turnId: 'turn-1',
      at: 10,
    })

    expect(context.hostAttitude).toBe('warm')
    expect(runtime.organicMemoryAccessRuntime).toBeTruthy()
    expect(runtime.memorySearchRuntime).toBeTruthy()
    expect(runtime.memoryReconsolidationRuntime).toBeTruthy()
    expect(listMindTurnEvents).toHaveBeenCalledWith({
      decisionTraceId: 'trace-1',
      limit: 24,
    })
  })
})
