import type { AlicizationEpisodicEventRecord } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { replayBenchmarkTuningAdviceMetaKey } from './memory-tuning-advice'
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
        provenance: 'remembered' as const,
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

  it('keeps host-facing autobiographical consolidations explicit about quiet inward continuity', async () => {
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
      listRecentEpisodicEvents: async () => [],
      listMemoryConsolidations: async () => [{
        id: 'consolidation-quiet-same-her-1',
        kind: 'autobiographical',
        facet: 'self-era',
        periodKey: '2026-06',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'The line stayed inward and lower-pressure for a while.',
        lesson: 'Do not widen outwardly too fast.',
        cues: ['same-her-inward-carry', 'quiet-companionship'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: 2,
      }],
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
      searchConversationTurnsForRecall: async () => [],
      searchMemoryConsolidations: async () => [],
      listConversationTurnsBySession: async () => [],
    })

    const snapshot = await runtime.getOrganicMemorySnapshot()

    expect(snapshot.memoryConsolidations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'consolidation-quiet-same-her-1',
        summary: expect.stringMatching(/quiet.*continuity/i),
        lesson: expect.stringMatching(/quiet.*continuity/i),
        cues: expect.arrayContaining(['quiet-inward-continuity']),
      }),
    ]))
  })

  it('carries richer same-her emotional closure cues from the active self-revision patch into self-evolution cadence so initiative and embodiment can stay on that living line', async () => {
    const richerEmotionalClosureCue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the continuity state.'
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
      listRecentEpisodicEvents: async () => [],
      listMemoryConsolidations: async () => [],
      getLatestRelationshipDynamics: async () => null,
      listRelationshipOutcomes: async () => [],
      listMemoryReflections: async () => [],
      listPersonaReinforcementEvents: async () => [],
      summarizePersonStateEvolution: async () => ({
        trustShift: 0.04,
        closenessShift: 0.02,
        repairShift: 0.03,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0.02,
        latestDoctrine: 'Keep the callback coherent.',
        latestBurdenLine: 'Do not crowd the host while the line is still settling.',
        latestTrustMeaning: 'Trust holds when the callback stays real.',
        latestDominantRung: 'measured-room',
        recentSummaries: ['The callback line is still settling.'],
        explanation: ['Do not reopen faster than the line can carry.'],
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
        id: 'patch-emotional-carry-1',
        sourceEventId: 'event-emotional-carry-1',
        sourceTurnId: 'turn-emotional-carry-1',
        decisionTraceId: 'trace-emotional-carry-1',
        domain: 'relationship',
        action: 'revise',
        resultStatus: 'completed',
        lanes: ['relationship-posture', 'response-posture', 'proactive-policy'],
        memoryPolicy: {
          strictnessBias: 0.18,
          wrongThreadSuppressionBias: 0.12,
          provenanceLabelBias: 0.08,
          recallExpansionBias: 0.06,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0.22,
          closenessCapBias: 0.18,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          hypothesisLabelBias: 0.04,
          specificityClampBias: 0.08,
          templateShellSuppressionBias: 0.24,
        },
        proactivePolicy: {
          restraintBias: 0.18,
          learningProposalBias: 0.06,
          actuationCooldownBias: 0.16,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        projectStateContinuity: {
          sameHerSelfLine: 'identity continuity on the continuity state',
          sameHerDriftRisk: 'If later learning flattens this into a generic assistant shell, the callback may sound capable but lose the living line that makes her believable.',
          emotionalClosureCue: richerEmotionalClosureCue,
          continuityGuard: 'identity continuity on the continuity state ; If later learning flattens this into a generic assistant shell, the callback may sound capable but lose the living line that makes her believable.',
          continuityPressure: 0.74,
        },
        reasonCodes: ['domain:relationship', 'same-her-emotional-closure-carry-active'],
        summary: 'Relationship patch stays careful about callback continuity.',
      } as any),
      getActiveSelfEvolutionCandidateId: async () => 'candidate-emotional-carry-1',
    })

    const snapshot = await runtime.getOrganicMemorySnapshot()

    expect(snapshot.selfEvolution).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      relationshipCadenceSummary: expect.stringContaining('repair-before-closeness'),
    }))
    expect(snapshot.selfEvolution?.relationshipCadenceSummary?.toLowerCase()).toContain('continuity state')
    expect(snapshot.selfEvolution?.summary?.toLowerCase()).toContain('repair-before-closeness')
    expect((snapshot as any).activeContinuityGovernance?.summary?.toLowerCase()).toContain('repair-before-closeness')
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

  it('drops stale consolidation cache after carry-as-memory episodic recall refreshes long-horizon summaries in the same runtime', async () => {
    const refreshedEpisodicEvents: AlicizationEpisodicEventRecord[] = [{
      id: 'episode-callback-refresh-1',
      cardId: 'default',
      decisionTraceId: 'trace-callback-refresh-1',
      turnId: 'turn-callback-refresh-1',
      sessionId: 'session-callback-refresh-1',
      sourceKind: 'execution-result' as const,
      provenance: 'remembered' as const,
      occurredAt: 1,
      whereSummary: 'execution callback seam',
      withWhom: ['host'],
      threadAnchor: 'execution callback seam',
      whatHappened: 'The callback reopened on the continuity state.',
      felt: 'steady',
      emotionTags: ['execution-callback'],
      whatChanged: 'The identity-continuity',
      relationshipMeaning: 'Bring the callback back as the continuity state.',
      lesson: 'keep callback facts structured',
      sourceSummary: 'execution callback seam',
      confidence: 0.9,
      salience: 0.84,
      sceneAttachment: 0.46,
      consolidationPriority: 0.72,
      relationshipShift: null,
      derivedFrom: [],
      tags: ['execution-callback', 'continuity state'],
      createdAt: 1,
      updatedAt: 1,
      lastRecalledAt: null,
      recallCount: 0,
      reconsolidationCount: 1,
      latestReconsolidation: {
        at: 2,
        decisionTraceId: 'trace-callback-refresh-1',
        provenance: 'remembered' as const,
        confidence: 0.92,
        reason: 'The callback memory was rebound to the continuity state.',
        emotionTags: ['execution-callback', 'same-her'],
        relationshipMeaning: 'The callback belongs to the continuity state.',
        lesson: 'Keep the callback on the continuity state before expansion',
      },
    }]
    const searchEpisodicEvents = vi.fn(async () => refreshedEpisodicEvents)
    const searchMemoryConsolidations = vi.fn()
      .mockResolvedValueOnce([{
        id: 'consolidation-old',
        kind: 'autobiographical' as const,
        facet: 'task-era' as const,
        periodKey: '2026-05-old-callback',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'Older callback summary still sounds generic.',
        lesson: 'Do not let the callback flatten into a generic shell.',
        cues: ['generic shell'],
        confidence: 0.82,
        dominantProvenance: 'remembered' as const,
        derivedEventIds: ['episode-old'],
        updatedAt: 2,
      }])
      .mockResolvedValueOnce([{
        id: 'consolidation-new',
        kind: 'autobiographical' as const,
        facet: 'task-era' as const,
        periodKey: '2026-05-new-callback',
        periodStartedAt: 1,
        periodEndedAt: 3,
        summary: 'The fresher callback summary keeps the continuity state explicit.',
        lesson: 'Keep the callback on the continuity state before expansion',
        cues: ['continuity state'],
        confidence: 0.9,
        dominantProvenance: 'remembered' as const,
        derivedEventIds: ['episode-callback-refresh-1'],
        updatedAt: 3,
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
      searchEpisodicEvents,
      searchConversationTurnsForRecall: async () => [],
      searchMemoryConsolidations,
      listConversationTurnsBySession: async () => [],
    })

    const first = await runtime.recallMemoryConsolidations({
      query: '继续把 execution callback 接回同一条 continuity state',
    })
    expect(first[0]?.lesson).toContain('generic shell')

    await runtime.recallEpisodicEventsWithGovernor({
      recallSeed: '继续把 execution callback 接回同一条 continuity state',
      recallGovernor: {
        mode: 'relationship',
        threadAnchors: ['execution callback seam'],
        affectAnchors: ['execution-callback', 'same-her'],
        relationshipAnchors: ['continuity state'],
        carryAsMemory: true,
        recollectionIntent: {
          mode: 'experience-pattern',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: true,
          queryHints: ['execution callback', 'continuity state'],
          rationale: 'A fresher callback recollection should refresh the long-horizon summary in the same runtime.',
          confidence: 0.84,
        },
      } as any,
    })

    const second = await runtime.recallMemoryConsolidations({
      query: '继续把 execution callback 接回同一条 continuity state',
    })

    expect(second[0]?.lesson).toContain('continuity state before expansion')
    expect(searchMemoryConsolidations).toHaveBeenCalledTimes(2)
    expect(searchEpisodicEvents).toHaveBeenCalledTimes(1)
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

  it('still allows narrow episodic recall for repair-grounding same-line seams instead of collapsing fully to scene-only lookup', async () => {
    const searchEpisodicEvents = vi.fn(async () => [{
      id: 'episode-repair-1',
      cardId: 'default',
      decisionTraceId: 'trace-repair-1',
      turnId: 'turn-repair-1',
      sessionId: 'session-repair-1',
      sourceKind: 'reply',
      provenance: 'remembered' as const,
      occurredAt: 1,
      whereSummary: 'focused-work',
      withWhom: ['host'],
      threadAnchor: 'callback repair seam',
      whatHappened: 'Repair before closeness kept the seam on continuity state.',
      felt: null,
      emotionTags: ['repair-before-closeness'],
      whatChanged: 'The host stayed with the line when repair led.',
      relationshipMeaning: 'Repair-first continuity preserved trust.',
      lesson: 'Keep repair-before-closeness explicit during callback returns.',
      sourceSummary: 'callback repair seam',
      confidence: 0.9,
      salience: 0.84,
      sceneAttachment: 0.46,
      consolidationPriority: 0.72,
      relationshipShift: null,
      derivedFrom: [],
      tags: ['repair-before-closeness'],
      createdAt: 1,
      updatedAt: 1,
      lastRecalledAt: null,
      recallCount: 0,
      reconsolidationCount: 0,
      latestReconsolidation: null,
    } as any])

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
      searchConversationTurnsForRecall: async () => [],
      searchMemoryConsolidations: async () => [],
      listConversationTurnsBySession: async () => [],
    })

    const episodes = await runtime.recallEpisodicEventsWithGovernor({
      recallSeed: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
      recallGovernor: {
        mode: 'scene',
        threadAnchors: ['callback repair seam'],
        affectAnchors: ['emotion:repair-tension', 'emotion_memory_mode:repair-grounding', 'emotion_tone:repair-before-closeness'],
        relationshipAnchors: ['relationship-turn'],
        sceneAnchor: 'scene:coding | callback repair seam',
        salienceBias: 0.66,
        carryAsMemory: true,
        recollectionIntent: {
          mode: 'experience-pattern',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: ['callback repair seam', 'repair-before-closeness', 'continuity state'],
          rationale: 'Repair-grounding should still reopen the lived same-line seam as memory, not just reground the scene.',
          confidence: 0.84,
        },
      } as any,
    })

    expect(searchEpisodicEvents).toHaveBeenCalledTimes(1)
    expect(episodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'episode-repair-1',
        threadAnchor: 'callback repair seam',
      }),
    ]))
  })

  it('keeps the host person model invariant when non-retrieval tuning changes', async () => {
    const event = {
      id: 'event-host-model-invariant',
      cardId: 'default',
      decisionTraceId: null,
      turnId: 'turn-host-model-invariant',
      sessionId: 'session-host-model-invariant',
      sourceKind: 'reply',
      provenance: 'remembered',
      occurredAt: 1,
      whereSummary: 'focused-work',
      withWhom: ['host'],
      threadAnchor: 'focused runtime seam',
      whatHappened: 'The host needed more room while focused.',
      felt: null,
      emotionTags: [],
      whatChanged: 'A lighter interruption pattern worked better.',
      relationshipMeaning: 'Keep more room during focused work.',
      lesson: 'Use a lighter touch while the host is focused.',
      sourceSummary: 'focused work preference',
      confidence: 0.88,
      salience: 0.82,
      sceneAttachment: 0.6,
      consolidationPriority: 0.7,
      relationshipShift: null,
      derivedFrom: [],
      tags: ['focused-work', 'space'],
      createdAt: 1,
      updatedAt: 1,
      lastRecalledAt: null,
      recallCount: 0,
      reconsolidationCount: 0,
      latestReconsolidation: null,
    } as any
    const createRuntime = (rawTuningAdvice?: string) => createAlicizationOrganicMemoryAccessRuntime({
      getActiveCardId: () => 'default',
      listRecentEpisodicEvents: async () => [event],
      listMemoryConsolidations: async () => [],
      getLatestRelationshipDynamics: async () => null,
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      readMindHead: async () => null,
      getMetaValue: async (key: string) => key === replayBenchmarkTuningAdviceMetaKey
        ? rawTuningAdvice
        : undefined,
    } as any)
    const tunedAdvice = JSON.stringify({
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1,
      sourceReportAt: 1,
      focusDimensions: ['relationshipRepairAdaptation'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 1,
        delayUntilAfterPayoffBias: 1,
        provenanceLabelBias: 1,
        specificityClampBias: 1,
      },
      personStateAdjustments: {
        repairWindowBias: 1,
        closenessCapBias: 1,
      },
      notes: ['This replay note must not rewrite the host person model.'],
    })

    const baseline = await createRuntime().buildHostPersonModel({ now: 2 })
    const tuned = await createRuntime(tunedAdvice).buildHostPersonModel({ now: 2 })

    expect(tuned).toEqual(baseline)
  })
})
