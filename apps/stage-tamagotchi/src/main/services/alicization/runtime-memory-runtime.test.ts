import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeMemoryRuntime } from './runtime-memory-runtime'

describe('runtime memory runtime', () => {
  it('bundles organic memory access, search, and reconsolidation under one runtime facade', async () => {
    const listMindTurnEvents = vi.fn(async () => [
      {
        kind: 'recall-attribution',
        payload: {
          selectedEpisodes: [
            {
              summary: 'runtime verification completed on the selected thread',
              relationshipLine: 'the host corrected the missing detail',
            },
          ],
        },
      },
      {
        kind: 'reply-memory-coherence',
        payload: {
          coherenceState: 'matched',
          surfacePolicy: 'evidence-only',
          explicitSurfaceExpected: true,
          explicitSurfaceObserved: true,
          matchedCueKinds: ['relationship-line'],
        },
      },
    ])
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-1' } as any])
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
          threadAnchor: 'runtime verification',
          whatHappened: 'verification completed with corrected evidence',
          felt: null,
          emotionTags: [],
          whatChanged: 'The corrected evidence was recorded.',
          relationshipMeaning: 'The host correction was associated with a successful verification.',
          lesson: 'verification=evidence_checked',
          sourceSummary: 'runtime verification',
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
        listMemoryReflections: async () => [],
        listPersonaReinforcementEvents: async () => [],
        summarizePersonStateEvolution: async () => ({
          trustShift: 0,
          closenessShift: 0,
          repairShift: 0,
          autonomyShift: 0,
          burdenShift: 0,
          executionTrustShift: 0,
          relationshipDoctrineShift: 0.08,
          latestDoctrine: 'evidence=verified',
          latestBurdenLine: 'focus_state=recorded',
          latestTrustMeaning: 'trust_signal=verified-result',
          latestDominantRung: 'evidence-first',
          recentSummaries: ['evidence=verified'],
          explanation: ['evidence=verified'],
          updatedAt: 10,
        }),
        readMindHead: async () => null,
        searchEpisodicEvents,
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
      sessionId: 'session-1',
      turnId: 'turn-1',
      at: 10,
      outcomeClosure: {
        relationshipOutcomes: [],
        reinforcementEvents: [],
        memoryFacts: [],
        reflections: [],
        episodicEvents: [{
          cardId: 'card-1',
          decisionTraceId: 'trace-1',
          sessionId: 'session-1',
          turnId: 'turn-1',
          sourceKind: 'dialogue-feedback',
          felt: 'The correction remained unfinished.',
          relationshipMeaning: 'The host expected the missing detail to be repaired.',
          lesson: 'Keep corrected evidence attached to the recalled episode.',
          tags: ['dialogue-feedback', 'feedback:robotic'],
        } as any],
      },
    })

    expect(context.hostAttitude).toBe('warm')
    expect(context.selfEvolution).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      activeLearningFocuses: expect.any(Array),
    }))
    expect(context.learningExecutionState).toEqual(expect.any(Object))
    expect(context.derivedMindStateBundle).toEqual(expect.objectContaining({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      knowledgeEvidence: expect.any(Object),
      selfEvolution: expect.any(Object),
      learningExecutionState: expect.any(Object),
    }))
    expect(runtime.organicMemoryAccessRuntime).toBeTruthy()
    expect(runtime.memorySearchRuntime).toBeTruthy()
    expect(runtime.memoryReconsolidationRuntime).toBeTruthy()
    expect(runtime.knowledgeAssimilationRuntime).toBeTruthy()
    expect(listMindTurnEvents).toHaveBeenCalledWith({
      decisionTraceId: 'trace-1',
      limit: 24,
    })
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          source: 'dialogue-feedback',
          feedback: 'robotic',
        }),
      }),
    ]))
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
          recentSummaries: ['Validated procedure keeps landing.'],
          explanation: ['Validated procedure keeps landing.'],
          updatedAt: 10,
        }),
        readMindHead: async () => null,
        searchEpisodicEvents: async () => [],
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
