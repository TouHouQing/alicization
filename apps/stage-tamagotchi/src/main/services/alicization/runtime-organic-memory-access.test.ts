import { describe, expect, it, vi } from 'vitest'

import { createAlicizationOrganicMemoryAccessRuntime } from './runtime-organic-memory-access'

describe('runtime-organic-memory-access', () => {
  it('returns a main-runtime authoritative organic snapshot for long-lived mind state consumers', async () => {
    const runtime = createAlicizationOrganicMemoryAccessRuntime({
      getActiveCardId: () => 'default',
      getSoulSnapshot: () => null,
      bootstrap: async () => ({
        soulPath: 'SOUL.md',
        content: '',
        frontmatter: {
          host_attitude: 'warm',
          core_incarnation: 'stay coherent across time',
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
        cardId: 'default',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        provenance: 'remembered',
        occurredAt: 1,
        whereSummary: 'focused-work',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'repair before closeness kept the thread stable',
        felt: null,
        emotionTags: [],
        whatChanged: 'The host opened more when the reply stayed grounded.',
        relationshipMeaning: 'Repair before closeness keeps trust stable.',
        lesson: 'Repair before closeness.',
        sourceSummary: 'runtime seam',
        confidence: 0.88,
        salience: 0.82,
        sceneAttachment: 0.6,
        consolidationPriority: 0.7,
        relationshipShift: null,
        derivedFrom: [],
        tags: [],
        createdAt: 1,
        updatedAt: 1,
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      } as any],
      listMemoryConsolidations: async () => [{
        id: 'consolidation-1',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-05',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'Repair before closeness became the durable relationship line.',
        lesson: 'Repair first keeps trust stable.',
        cues: ['repair', 'trust'],
        confidence: 0.84,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-1'],
        updatedAt: 2,
      }],
      getLatestRelationshipDynamics: async () => ({
        hostAttitude: 'warm and less guarded after grounded repair',
      } as any),
      listRelationshipOutcomes: async () => [{
        id: 'outcome-1',
        cardId: 'default',
        turnId: 'turn-1',
        sessionId: 'session-1',
        summary: 'Grounded repair landed better than direct warmth.',
        trustDelta: 0.22,
        closenessDelta: 0.1,
        burdenDelta: 0,
        createdAt: 2,
        updatedAt: 2,
      } as any],
      listMemoryReflections: async () => [{
        id: 'reflection-1',
        cardId: 'default',
        turnId: 'turn-1',
        summary: 'Repair before closeness should remain the visible opening rule.',
        lesson: 'Delay warmth until the seam is repaired.',
        status: 'confirmed',
        createdAt: 2,
        updatedAt: 2,
      } as any],
      listPersonaReinforcementEvents: async () => [],
      summarizePersonStateEvolution: async () => ({
        trustShift: 0.18,
        closenessShift: 0.08,
        repairShift: 0.26,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0.12,
        latestDoctrine: 'Repair before closeness.',
        latestBurdenLine: 'Do not crowd the host while focused.',
        latestTrustMeaning: 'Grounded repair increases trust.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Repair before closeness kept the thread coherent.'],
        explanation: ['Grounded repair protects continuity before warmth expands.'],
        updatedAt: 2,
      }),
      readMindHead: async () => null,
      searchEpisodicEvents: async () => [],
      searchConversationTurnsForRecall: async () => [],
      searchMemoryConsolidations: async () => [],
      listConversationTurnsBySession: async () => [],
      getLatestLearningExecutionState: async () => null,
      getActiveSelfRevisionStatePatch: async () => ({
        version: 'self-revision-state-patch-v1',
        id: 'patch-1',
        sourceEventId: 'event-1',
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        domain: 'relationship',
        action: 'verify',
        resultStatus: 'completed',
        lanes: ['memory-policy'],
        memoryPolicy: {
          strictnessBias: 0.52,
          wrongThreadSuppressionBias: 0.44,
          provenanceLabelBias: 0.3,
          recallExpansionBias: 0.1,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0.28,
          closenessCapBias: 0.14,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0.18,
          hypothesisLabelBias: 0.06,
          specificityClampBias: 0.08,
          templateShellSuppressionBias: 0.04,
        },
        proactivePolicy: {
          restraintBias: 0.22,
          learningProposalBias: 0.1,
          actuationCooldownBias: 0.14,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: true,
          rollbackPlan: [],
        },
        reasonCodes: ['domain:relationship'],
        summary: 'Verify the relationship doctrine before loosening posture.',
      } as any),
      getActiveSelfEvolutionCandidateId: async () => 'candidate-1',
    })

    const snapshot = await runtime.getOrganicMemorySnapshot()

    expect(snapshot.recentEpisodicEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'event-1',
        threadAnchor: 'runtime seam',
      }),
    ]))
    expect(snapshot.hostPersonModel).toEqual(expect.objectContaining({
      trustLadder: expect.any(Object),
    }))
    expect(snapshot.memoryConsolidations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'consolidation-1',
        kind: 'autobiographical',
      }),
    ]))
    expect(snapshot.selfEvolution).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      nextLearningAction: expect.any(String),
    }))
    expect(snapshot.affectiveResidue).toEqual(expect.objectContaining({
      version: 'affective-residue-memory-v1',
      relationshipCadence: expect.any(Object),
    }))
    expect(snapshot.learningExecutionState).toEqual(expect.objectContaining({
      nextLearningAction: snapshot.selfEvolution?.nextLearningAction,
    }))
    expect(snapshot.derivedMindStateBundle).toEqual(expect.objectContaining({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      hostPersonModel: expect.any(Object),
      selfEvolution: expect.any(Object),
      affectiveResidue: expect.any(Object),
      learningExecutionState: expect.any(Object),
      activeSelfRevision: expect.objectContaining({
        candidateId: 'candidate-1',
        patchId: 'patch-1',
      }),
    }))
    expect((snapshot as any).activeContinuityGovernance).toEqual(expect.objectContaining({
      source: 'active-self-evolution-version',
      mode: 'same-her-baseline',
      candidateId: 'candidate-1',
      patchId: 'patch-1',
      decisionTraceId: 'trace-1',
      summary: 'Verify the relationship doctrine before loosening posture.',
      lanes: ['memory-policy'],
      reasonCodes: ['domain:relationship'],
    }))
    expect((snapshot.derivedMindStateBundle as any)?.activeContinuityGovernance).toEqual(expect.objectContaining({
      source: 'active-self-evolution-version',
      mode: 'same-her-baseline',
      candidateId: 'candidate-1',
      patchId: 'patch-1',
      decisionTraceId: 'trace-1',
      summary: 'Verify the relationship doctrine before loosening posture.',
    }))
    expect(snapshot.derivedMindStateBundle?.summary).toContain('continuity=same-her-baseline')
    expect(snapshot.derivedMindStateBundle?.summary).toContain('anchor=candidate-1')
  })

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
