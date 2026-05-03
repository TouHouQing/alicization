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
        listRecentEpisodicEvents: async () => [{
          id: 'event-1',
          cardId: 'card-1',
          decisionTraceId: 'trace-1',
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'reply',
          provenance: 'remembered',
          occurredAt: 10,
          whereSummary: 'focused work',
          withWhom: ['host'],
          threadAnchor: 'runtime seam',
          whatHappened: 'repair before closeness landed better',
          felt: null,
          emotionTags: [],
          whatChanged: 'The host opened more when the reply stayed grounded.',
          relationshipMeaning: 'Repair before closeness keeps trust stable.',
          lesson: 'Repair before closeness.',
          sourceSummary: 'runtime seam',
          confidence: 0.82,
          salience: 0.76,
          sceneAttachment: 0.5,
          consolidationPriority: 0.6,
          relationshipShift: null,
          derivedFrom: [],
          tags: [],
          createdAt: 10,
          updatedAt: 10,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        } as any],
        listMemoryConsolidations: async () => [],
        getLatestRelationshipDynamics: async () => ({
          hostAttitude: 'warm',
        } as any),
        listRelationshipOutcomes: async () => [],
        listPersonaReinforcementEvents: async () => [],
        summarizePersonStateEvolution: async () => ({
          trustShift: 0,
          closenessShift: 0,
          repairShift: 0,
          autonomyShift: 0,
          burdenShift: 0,
          executionTrustShift: 0,
          relationshipDoctrineShift: 0.08,
          latestDoctrine: 'Repair before closeness.',
          latestBurdenLine: 'Do not crowd the host when focused.',
          latestTrustMeaning: 'Trust rises when the reply stays grounded.',
          latestDominantRung: 'space-first',
          recentSummaries: ['Repair before closeness.'],
          explanation: ['Repair before closeness.'],
          updatedAt: 10,
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
    expect(context.selfEvolution).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      activeLearningFocuses: expect.any(Array),
    }))
    expect(context.derivedMindStateBundle).toEqual(expect.objectContaining({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      knowledgeEvidence: expect.any(Object),
      selfEvolution: expect.any(Object),
    }))
    expect(runtime.organicMemoryAccessRuntime).toBeTruthy()
    expect(runtime.memorySearchRuntime).toBeTruthy()
    expect(runtime.memoryReconsolidationRuntime).toBeTruthy()
    expect(runtime.knowledgeAssimilationRuntime).toBeTruthy()
    expect(listMindTurnEvents).toHaveBeenCalledWith({
      decisionTraceId: 'trace-1',
      limit: 24,
    })
  })

  it('exposes self-evolution learning actions that can be scheduled downstream', async () => {
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
          recentSummaries: ['Validated procedure keeps landing.'],
          explanation: ['Validated procedure keeps landing.'],
          updatedAt: 10,
        }),
        readMindHead: async () => null,
        searchEpisodicEvents: async () => [],
        searchConversationTurnsForRecall: async () => [],
        searchMemoryConsolidations: async () => [],
        listConversationTurnsBySession: async () => [],
      },
      organicMemorySearch: {
        normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
        selectPromptActiveThoughts: ({ activeThoughts }) => activeThoughts,
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [{
          id: 'fact-procedure',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'verify before sounding certain',
          confidence: 0.86,
          source: 'async-llm',
          dedupeKey: 'assistant|procedure|verify before sounding certain',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 6,
          memoryDomain: 'procedure',
          knowledgeStage: 'internalized-long-horizon-knowledge',
          validationStatus: 'validated',
          validationCount: 3,
          contradictionCount: 0,
        } as any],
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
          listMindTurnEvents: async () => [],
          searchEpisodicEvents: async () => [],
          appendMindTurnEvents: async () => {},
        },
      },
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'verify before sounding certain',
      recallGovernor: null,
    })

    expect(context.selfEvolution).toEqual(expect.objectContaining({
      nextLearningAction: expect.any(String),
      activeLearningFocuses: expect.any(Array),
    }))
  })
})
