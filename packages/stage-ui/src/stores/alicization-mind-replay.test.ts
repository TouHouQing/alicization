import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { deriveMindReplaySummary, useAlicizationMindReplayStore } from './alicization-mind-replay'

function createAlicizationBridgeStub(overrides?: Partial<Parameters<typeof setAlicizationBridge>[0]>) {
  return {
    bootstrap: vi.fn(),
    getSoul: vi.fn(),
    initializeGenesis: vi.fn(),
    updateSoul: vi.fn(),
    updatePersonality: vi.fn(),
    getKillSwitchState: vi.fn(),
    suspendKillSwitch: vi.fn(),
    resumeKillSwitch: vi.fn(),
    getMemoryStats: vi.fn().mockResolvedValue({
      total: 0,
      active: 0,
      archived: 0,
      lastPrunedAt: null,
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        templateLeakageFailCount: 0,
      },
      presenceQuality: {
        quietCompanionshipCoverage: 0.1,
        silentPresenceNuisanceRate: 0.3,
        continuityMindCarryRate: 0.2,
      },
    }),
    runMemoryPrune: vi.fn(),
    updateMemoryStats: vi.fn(),
    retrieveMemoryFacts: vi.fn(),
    upsertMemoryFacts: vi.fn(),
    importLegacyMemory: vi.fn(),
    appendConversationTurn: vi.fn(),
    appendAuditLog: vi.fn(),
    realtimeExecute: vi.fn(),
    getSensorySnapshot: vi.fn().mockResolvedValue({
      sample: {
        collectedAt: Date.now(),
        time: { iso: '', local: '', timezone: 'UTC' },
        cpu: { usagePercent: 0, windowMs: 1000 },
        memory: { freeMB: 0, totalMB: 0, usagePercent: 0 },
      },
      stale: false,
      ageMs: 0,
      nextTickAt: null,
      running: true,
    }),
    ...overrides,
  } as any
}

describe('alicization mind replay store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
  })

  afterEach(() => {
    clearAlicizationBridge()
    vi.restoreAllMocks()
  })

  it('derives replay summary coverage and memory trigger stats', () => {
    const summary = deriveMindReplaySummary([
      {
        id: 'evt-2',
        decisionTraceId: 'mind:abc123:feedfacebeef',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: null,
        createdAt: 120,
      },
      {
        id: 'evt-1',
        decisionTraceId: 'mind:abc123:feedfacebeef',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: null,
        createdAt: 100,
      },
      {
        id: 'evt-3',
        decisionTraceId: 'mind:abc123:feedfacebeef',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'memory-facts-upserted',
        payload: {
          trigger: 'batch',
          factInputCount: 3,
        },
        createdAt: 130,
      },
      {
        id: 'evt-4',
        decisionTraceId: 'mind:abc123:feedfacebeef',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'takeover-audit',
        payload: {
          fallback_reason: 'unsupported-specificity',
        },
        createdAt: 140,
      },
    ])

    expect(summary.coverage.requiredComplete).toBe(true)
    expect(summary.coverage.hasMemoryFactsUpserted).toBe(true)
    expect(summary.memoryFactInputTotal).toBe(3)
    expect(summary.memoryExtractionTriggerSet).toEqual(['batch'])
    expect(summary.fallbackReasonSet).toEqual(['unsupported-specificity'])
    expect(summary.firstCreatedAt).toBe(100)
    expect(summary.lastCreatedAt).toBe(140)
  })

  it('marks replay coverage incomplete when required replay kinds are missing', () => {
    const summary = deriveMindReplaySummary([
      {
        id: 'evt-1',
        decisionTraceId: 'mind:missing:persistence',
        turnId: 'turn-missing',
        sessionId: 'session-missing',
        origin: 'system',
        kind: 'governance-normalized',
        payload: null,
        createdAt: 100,
      },
    ])

    expect(summary.coverage.hasGovernanceNormalized).toBe(true)
    expect(summary.coverage.hasPersistenceWritten).toBe(false)
    expect(summary.coverage.requiredComplete).toBe(false)
  })

  it('queries by decisionTraceId and sorts returned events by createdAt', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([
      {
        id: 'evt-2',
        decisionTraceId: 'mind:abc123:feedfacebeef',
        turnId: 'turn-2',
        sessionId: 'session-2',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: null,
        createdAt: 200,
      },
      {
        id: 'evt-1',
        decisionTraceId: 'mind:abc123:feedfacebeef',
        turnId: 'turn-2',
        sessionId: 'session-2',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: null,
        createdAt: 100,
      },
    ])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:abc123:feedfacebeef',
        turnId: 'turn-2',
        sessionId: 'session-2',
        origin: 'user-turn',
        activeThreadId: 'thread-2',
        createdAt: 100,
        lastUpdatedAt: 220,
        eventKinds: ['governance-normalized', 'persistence-written'],
        governance: {
          turnMode: 'answer',
          truthState: 'live-grounded',
          repairState: 'none',
          answerSubject: 'task-knot',
          screenReferenceMode: 'avoid',
          digitalLifeSpine: null,
        },
        recallAttribution: {
          shouldRecall: true,
          searchTrace: {
            firstHop: {
              focus: 'procedure',
              summary: 'start from the remembered task procedure',
              targetIds: ['procedure-1'],
            },
          },
        },
        replyMemoryCoherence: {
          coherenceState: 'integrated',
        },
        persistenceWritten: {
          format: 'mind-turn-v1',
        },
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
      },
    ])

    setAlicizationBridge(createAlicizationBridgeStub({
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))

    const store = useAlicizationMindReplayStore()
    const rows = await store.queryByDecisionTraceId('mind:abc123:feedfacebeef')

    expect(listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:abc123:feedfacebeef',
      turnId: undefined,
      limit: 200,
    })
    expect(listMemoryDecisionTraces).toBeCalledWith({
      decisionTraceId: 'mind:abc123:feedfacebeef',
      turnId: undefined,
      limit: 200,
    })
    expect(rows.map(item => item.id)).toEqual(['evt-1', 'evt-2'])
    expect(store.events.map(item => item.id)).toEqual(['evt-1', 'evt-2'])
    expect(store.traceRecords).toEqual([
      expect.objectContaining({
        decisionTraceId: 'mind:abc123:feedfacebeef',
        activeThreadId: 'thread-2',
      }),
    ])
    expect(store.replaySummary.decisionTraceId).toBe('mind:abc123:feedfacebeef')
  })

  it('returns empty result when bridge does not expose mind replay query', async () => {
    setAlicizationBridge(createAlicizationBridgeStub({
      listMindTurnEvents: undefined,
    }))

    const store = useAlicizationMindReplayStore()
    const rows = await store.queryByDecisionTraceId('mind:abc123:feedfacebeef')

    expect(rows).toEqual([])
    expect(store.events).toEqual([])
    expect(store.lastError).toBeNull()
  })

  it('exposes authoritative self-evolution runtime state through the shared bridge', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'self-evolution:trace-active:patch-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'self-evolution:trace-active:patch-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.6,
            wrongThreadSuppressionBias: 0.4,
            provenanceLabelBias: 0.5,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.2,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.3,
            templateShellSuppressionBias: 0.25,
          },
          proactivePolicy: {
            restraintBias: 0.2,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.15,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active self revision is authoritative.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const bridgeModule = await import('./alicization-bridge')
    const result = await bridgeModule.getAlicizationBridge().getSelfEvolutionState?.()

    expect(getSelfEvolutionState).toBeCalledTimes(1)
    expect(result).toEqual(expect.objectContaining({
      activeCandidateId: 'self-evolution:trace-active:patch-active',
      reasonCodes: ['self-evolution:active-version-present'],
    }))
  })

  it('still hydrates structured trace records when raw mind events are unavailable', async () => {
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:only-trace:feedfacebeef',
        turnId: 'turn-3',
        sessionId: 'session-3',
        origin: 'user-turn',
        activeThreadId: 'thread-3',
        createdAt: 300,
        lastUpdatedAt: 360,
        eventKinds: ['governance-normalized', 'recall-attribution', 'reply-memory-coherence'],
        governance: {
          turnMode: 'answer',
          truthState: 'remembered',
          repairState: 'none',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
          digitalLifeSpine: null,
        },
        recallAttribution: {
          shouldRecall: true,
          surfacePolicy: 'relationship-carry',
        },
        replyMemoryCoherence: {
          coherenceState: 'integrated',
        },
        persistenceWritten: null,
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
      },
    ])

    setAlicizationBridge(createAlicizationBridgeStub({
      listMindTurnEvents: undefined,
      listMemoryDecisionTraces,
    }))

    const store = useAlicizationMindReplayStore()
    const rows = await store.queryMemoryDecisionTraces({
      decisionTraceId: 'mind:only-trace:feedfacebeef',
      limit: 64,
    })

    expect(rows).toEqual([
      expect.objectContaining({
        decisionTraceId: 'mind:only-trace:feedfacebeef',
        activeThreadId: 'thread-3',
      }),
    ])
    expect(store.events).toEqual([])
    expect(store.traceRecords).toEqual(rows)
    expect(store.lastError).toBeNull()
  })

  it('runs the default replay benchmark when the bridge exposes it', async () => {
    const getMemoryStats = vi.fn()
      .mockResolvedValueOnce({
        total: 10,
        active: 9,
        archived: 1,
        lastPrunedAt: null,
        retrievalHealth: {
          semanticLatencyMs: 11,
          graphLatencyMs: 22,
          reconstructionFrequency: 1,
          reconstructedCount: 3,
          templateLeakageFailCount: 0,
        },
        presenceQuality: {
          quietCompanionshipCoverage: 0.1,
          silentPresenceNuisanceRate: 0.3,
          continuityMindCarryRate: 0.2,
        },
      })
      .mockResolvedValueOnce({
        total: 10,
        active: 9,
        archived: 1,
        lastPrunedAt: null,
        retrievalHealth: {
          semanticLatencyMs: 11,
          graphLatencyMs: 22,
          reconstructionFrequency: 1,
          reconstructedCount: 3,
          templateLeakageFailCount: 2,
        },
        presenceQuality: {
          quietCompanionshipCoverage: 0.64,
          silentPresenceNuisanceRate: 0.22,
          continuityMindCarryRate: 0.71,
        },
      })
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 11,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'pass',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: false,
        failingKeys: ['wrongThreadSuppression'],
        dimensions: [{
          key: 'wrongThreadSuppression',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 0.75,
          passedRatio: 0,
          failingTurnIds: ['turn-failing-1'],
        }],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'fail',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 2,
          learningTaskCompletionCount: 4,
          learningTaskFailureCount: 1,
          learningRelationshipReviseCount: 2,
          learningSelfModelReviseCount: 1,
          learningWorldModelValidationCount: 1,
          learningWorldModelFalseInternalizationCount: 0,
          quietCompanionshipCoverage: 0.64,
          silentPresenceNuisanceRate: 0.22,
          continuityMindCarryRate: 0.71,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [
        {
          turnId: 'turn-failing-1',
          userText: '不是那条线，是另一条',
          failingDimensions: ['wrongThreadSuppression'],
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-failing-1',
            decisionTraceId: 'mind:failing:1',
            sessionId: 'session-1',
            activeThreadId: 'thread-1',
          },
          sampledCategories: ['wrong-thread'],
        },
      ],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 1,
        totalCount: 1,
        persisted: true,
        driftSignals: ['emotionalClosureDrift'],
        projectStateSummary: {
          comparedTurnCount: 3,
          identityHitCount: 3,
          phaseHitCount: 2,
          openLoopHitCount: 1,
          sameHerHitCount: 2,
          proactiveSameHerGapHitCount: 1,
          continuityHitCount: 1,
        },
        preDialogueBriefingSummary: {
          comparedTurnCount: 3,
          identityHitCount: 3,
          phaseHitCount: 2,
          landedProgressHitCount: 2,
          openLoopHitCount: 1,
          nextClosureHitCount: 2,
          emotionalClosureHitCount: 1,
          fullyBriefedTurnCount: 1,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 3,
          activeCueTurnCount: 3,
          preservedTurnCount: 2,
          rewriteAppliedTurnCount: 1,
          fullyClosedTurnCount: 1,
          lowPressureRequiredTurnCount: 2,
          antiRestartRequiredTurnCount: 1,
        },
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getMemoryStats,
      runReplayBenchmark,
    }))

    const store = useAlicizationMindReplayStore()
    const result = await store.runReplayBenchmark()

    expect(runReplayBenchmark).toBeCalledWith({
      packId: 'final-humanlike-memory-v1',
      persistTelemetry: undefined,
      sampleLimit: 12,
    })
    expect(store.benchmarkSupported).toBe(true)
    expect(store.benchmarkReport).toEqual(result)
    expect(store.benchmarkStatsBefore).toEqual(expect.objectContaining({
      retrievalHealth: expect.objectContaining({
        templateLeakageFailCount: 0,
      }),
    }))
    expect(store.benchmarkStatsAfter).toEqual(expect.objectContaining({
      retrievalHealth: expect.objectContaining({
        templateLeakageFailCount: 2,
      }),
    }))
    expect(store.benchmarkDimensionGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'wrongThreadSuppression',
      }),
    ]))
    expect(store.filteredBenchmarkFailingTurns).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-failing-1',
        decisionTraceId: 'mind:failing:1',
      }),
    ]))
    expect(store.memoryHealthComparisonRows.find(item => item.key === 'templateLeakageFailCount')).toEqual(expect.objectContaining({
      before: 0,
      after: 2,
      patch: 2,
    }))
    expect(store.memoryHealthComparisonRows.find(item => item.key === 'learningTaskCompletionCount')).toEqual(expect.objectContaining({
      patch: 4,
    }))
    expect(store.memoryHealthComparisonRows.find(item => item.key === 'learningRelationshipReviseCount')).toEqual(expect.objectContaining({
      patch: 2,
    }))
    expect(store.memoryHealthComparisonRows.find(item => item.key === 'quietCompanionshipCoverage')).toEqual(expect.objectContaining({
      before: 0.1,
      after: 0.64,
      patch: 0.64,
      section: 'presence-quality',
    }))
    expect(store.memoryHealthComparisonRows.find(item => item.key === 'silentPresenceNuisanceRate')).toEqual(expect.objectContaining({
      before: 0.3,
      after: 0.22,
      patch: 0.22,
      section: 'presence-quality',
    }))
    expect(store.memoryHealthComparisonRows.find(item => item.key === 'continuityMindCarryRate')).toEqual(expect.objectContaining({
      before: 0.2,
      after: 0.71,
      patch: 0.71,
      section: 'presence-quality',
    }))
    expect(store.benchmarkShipGateRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'presence-qa-gate',
        status: 'fail',
      }),
    ]))
    expect(store.benchmarkProjectStateRows).toEqual([
      {
        key: 'project_state_compared_turn_count',
        value: 3,
        detail: '3 replay turn(s) carried project-state continuity cues that should keep project identity, Phase 1 route, and unresolved open loops on the same living thread.',
      },
      {
        key: 'project_state_identity_hit_rate',
        value: 1,
        detail: 'identity=1 (3/3) | checks whether she still knows what this project is.',
      },
      {
        key: 'project_state_phase_hit_rate',
        value: 0.67,
        detail: 'phase=0.67 (2/3) | checks whether she is still carrying the Phase 1 local-digital-life route.',
      },
      {
        key: 'project_state_open_loop_hit_rate',
        value: 0.33,
        detail: 'openLoop=0.33 (1/3) | checks whether unresolved project loops are still being carried forward.',
      },
      {
        key: 'project_state_same_her_hit_rate',
        value: 0.67,
        detail: 'sameHer=0.67 (2/3) | checks whether the same-her self line is still explicit before the turn widens outward.',
      },
      {
        key: 'project_state_proactive_same_her_gap_hit_rate',
        value: 0.33,
        detail: 'proactiveSameHerGap=0.33 (1/3) | checks whether visible proactive hold, subconscious carry, and next-session feedback still stay on one same-her follow-through line.',
      },
      {
        key: 'project_state_continuity_hit_rate',
        value: 0.33,
        detail: 'continuity=0.33 (1/3) | checks whether identity, phase, open loops, and the same-her self line still arrive together as one same-her brief.',
      },
    ])
    expect(store.benchmarkEmotionalClosureRows).toEqual([
      {
        key: 'emotional_closure_compared_turn_count',
        value: 3,
        detail: '3 replay turn(s) carried same-her emotional closure audit.',
      },
      {
        key: 'emotional_closure_active_cue_rate',
        value: 1,
        detail: 'activeCue=1 (3/3)',
      },
      {
        key: 'emotional_closure_preserved_rate',
        value: 0.67,
        detail: 'preservedIntoRewrite=0.67 (2/3)',
      },
      {
        key: 'emotional_closure_rewrite_applied_rate',
        value: 0.33,
        detail: 'rewriteClosureApplied=0.33 (1/3)',
      },
      {
        key: 'emotional_closure_fully_closed_rate',
        value: 0.33,
        detail: 'drift=emotionalClosureDrift | fullyClosed=0.33 (1/3)',
      },
      {
        key: 'emotional_closure_low_pressure_required_rate',
        value: 0.67,
        detail: 'lowPressureRequired=0.67 (2/3) | checks whether the same-her return still needs a lower-pressure landing instead of widening too fast.',
      },
      {
        key: 'emotional_closure_anti_restart_required_rate',
        value: 0.33,
        detail: 'antiRestartRequired=0.33 (1/3) | checks whether the same-her return still must avoid reopening from scratch.',
      },
    ])
    expect(store.benchmarkPreDialogueBriefingRows).toEqual([
      {
        key: 'pre_dialogue_briefing_compared_turn_count',
        value: 3,
        detail: '3 replay turn(s) carried pre-dialogue self briefing cues for project identity, Phase 1 route, landed progress, unresolved loops, and next closure.',
      },
      {
        key: 'pre_dialogue_briefing_identity_hit_rate',
        value: 1,
        detail: 'identity=1 (3/3) | checks whether the briefing still says what this project is.',
      },
      {
        key: 'pre_dialogue_briefing_phase_hit_rate',
        value: 0.67,
        detail: 'phase=0.67 (2/3) | checks whether the briefing still carries the Phase 1 route.',
      },
      {
        key: 'pre_dialogue_briefing_landed_progress_hit_rate',
        value: 0.67,
        detail: 'landed=0.67 (2/3)',
      },
      {
        key: 'pre_dialogue_briefing_open_loop_hit_rate',
        value: 0.33,
        detail: 'openLoop=0.33 (1/3) | checks whether the briefing still names the unresolved life loop.',
      },
      {
        key: 'pre_dialogue_briefing_next_closure_hit_rate',
        value: 0.67,
        detail: 'nextClosure=0.67 (2/3)',
      },
      {
        key: 'pre_dialogue_briefing_emotional_closure_hit_rate',
        value: 0.33,
        detail: 'emotionalClosure=0.33 (1/3)',
      },
      {
        key: 'pre_dialogue_briefing_fully_briefed_rate',
        value: 0.33,
        detail: 'fullyBriefed=0.33 (1/3) | checks whether identity, phase, landed progress, open loop, and next closure still arrive as one stable self brief.',
      },
    ])
  })

  it('filters failing turns by dimension and drills down through decision trace id', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([
      {
        id: 'evt-1',
        decisionTraceId: 'mind:failing:1',
        turnId: 'turn-failing-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: null,
        createdAt: 100,
      },
      {
        id: 'evt-2',
        decisionTraceId: 'mind:failing:1',
        turnId: 'turn-failing-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: null,
        createdAt: 120,
      },
    ])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:failing:1',
        turnId: 'turn-failing-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        activeThreadId: 'thread-1',
        createdAt: 100,
        lastUpdatedAt: 120,
        eventKinds: ['governance-normalized', 'persistence-written'],
        governance: null,
        recallAttribution: null,
        learningExecuted: {
          action: 'verify',
          domain: 'relationship',
          resultSummary: 'Verification reopened relationship target.',
          focuses: ['resolve-contradictions'],
        },
        persistenceWritten: null,
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
        replyMemoryCoherence: {
          coherenceState: 'inward-only',
          whyWithheld: 'Relationship continuity should stay inward until the host has room.',
          followUpSummary: 'Keep the relation line inward until the host has room for it.',
          followUpPreferredTiming: 'next-open-window',
          followUpIntrusionRisk: 'high',
        },
      },
    ])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 1,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'fail',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        learningRevisionDiscipline: 'pass',
        domainInternalizationDiscipline: 'pass',
        worldModelValidationDiscipline: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: false,
        failingKeys: ['wrongThreadSuppression'],
        dimensions: [{
          key: 'wrongThreadSuppression',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 0.75,
          passedRatio: 0,
          failingTurnIds: ['turn-failing-1'],
        }],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'fail',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [{
        turnId: 'turn-failing-1',
        userText: '不是那条线，是另一条',
        failingDimensions: ['wrongThreadSuppression'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-failing-1',
          decisionTraceId: 'mind:failing:1',
          sessionId: 'session-1',
          activeThreadId: 'thread-1',
        },
        sampledCategories: ['wrong-thread'],
        resolutionLedgerSummary: {
          dominantClusterSummary: 'Runtime seam cluster',
          competingClusterSummary: 'Nearby competing seam',
          finalSurfacePolicy: 'procedural-carry',
          shouldStayInward: false,
          shouldDelayUntilAfterPayoff: true,
          rejectedCandidateCount: 1,
        },
      }],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 1,
        totalCount: 1,
        persisted: true,
      },
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))
    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()
    store.setSelectedDiagnosisDimension('wrongThreadSuppression')

    expect(store.selectedBenchmarkTurn).toEqual(expect.objectContaining({
      turnId: 'turn-failing-1',
      learningEvidenceSummary: null,
      replyMemoryCoherenceSummary: null,
      resolutionLedgerSummary: expect.objectContaining({
        dominantClusterSummary: 'Runtime seam cluster',
        rejectedCandidateCount: 1,
      }),
    }))
    await store.drillDownBenchmarkTurn('turn-failing-1')
    expect(store.traceRecords[0]).toEqual(expect.objectContaining({
      learningExecuted: expect.objectContaining({
        action: 'verify',
        domain: 'relationship',
      }),
      replyMemoryCoherence: expect.objectContaining({
        coherenceState: 'inward-only',
      }),
    }))
    expect(store.selectedBenchmarkTurn).toEqual(expect.objectContaining({
      replyMemoryCoherenceSummary: expect.objectContaining({
        coherenceState: 'inward-only',
        followUpPreferredTiming: 'next-open-window',
        followUpIntrusionRisk: 'high',
      }),
      diagnosisSummary: expect.stringContaining('Relationship learning is still revising this line'),
    }))
    expect(listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:failing:1',
      turnId: undefined,
      limit: 200,
    })
    expect(store.traceRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({
        decisionTraceId: 'mind:failing:1',
      }),
    ]))
  })

  it('surfaces long-run same-her session proof rows from sampled replay feedback', async () => {
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 4,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'pass',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        learningRevisionDiscipline: 'pass',
        domainInternalizationDiscipline: 'pass',
        worldModelValidationDiscipline: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: false,
        failingKeys: [],
        dimensions: [],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 4,
        persisted: true,
        longRunSameHerSessionSummary: {
          comparedSessionCount: 2,
          closedSessionCount: 1,
          singleTurnSessionCount: 0,
          insufficientSessionCount: 1,
          sessionClosureRate: 0.5,
          sessions: [
            {
              sessionId: 'session-runtime-proof-open',
              status: 'insufficient',
              turnCount: 2,
              hitCount: 1,
              turnIds: ['turn-open-2', 'turn-open-1'],
              runtimeEvidence: {
                source: 'runtime-sampling-backlog',
                runtimeTurnCount: 2,
                decisionTraceTurnCount: 2,
                syntheticTurnCount: 0,
                allTurnsRuntimeSourced: true,
              },
              failureReasons: ['missing-same-her-closure-turn'],
              maxConsecutiveEventRoleProofTurnCount: 1,
              eventRoleDiagnostics: [
                {
                  turnId: 'turn-open-2',
                  memoryRecall: true,
                  proactiveOpening: true,
                  executionCallback: false,
                  emotionalAfterglow: false,
                  embodimentExpression: false,
                  missingRoles: ['executionCallback', 'emotionalAfterglow', 'embodimentExpression'],
                },
                {
                  turnId: 'turn-open-1',
                  memoryRecall: true,
                  proactiveOpening: true,
                  executionCallback: true,
                  emotionalAfterglow: true,
                  embodimentExpression: true,
                  missingRoles: [],
                },
              ],
              transitionDiagnostics: [
                {
                  fromTurnId: 'turn-open-2',
                  toTurnId: 'turn-open-1',
                  memoryInfluencedNext: true,
                  emotionInfluencedNext: false,
                  initiativeInfluencedNext: true,
                  embodimentInfluencedNext: true,
                  missingInfluences: ['emotion'],
                  missingInfluenceReasons: {
                    emotion: [
                      'from-turn has no emotional closure lane to carry forward',
                      'transition text lacks emotional residue or closure cue',
                    ],
                  },
                },
              ],
              turnDiagnostics: [
                {
                  turnId: 'turn-open-2',
                  tracePointer: {
                    kind: 'decision-trace',
                    packId: 'sampled-humanlike-memory-v1',
                    turnId: 'turn-open-2',
                    decisionTraceId: 'mind:open:2',
                    sessionId: 'session-runtime-proof-open',
                    activeThreadId: 'thread-open',
                  },
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: false,
                  embodiment: false,
                  missingLanes: ['emotion', 'embodiment'],
                  missingLaneReasons: {
                    emotion: [
                      'text explicitly says emotional carry is missing',
                      'emotional closure audit did not preserve or rewrite closure',
                    ],
                    embodiment: [
                      'text explicitly says embodiment carry is missing',
                      'same-her embodiment text is absent or explicitly missing',
                    ],
                  },
                },
                {
                  turnId: 'turn-open-1',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
              ],
            },
            {
              sessionId: 'session-runtime-proof-closed',
              status: 'closed',
              turnCount: 2,
              hitCount: 2,
              turnIds: ['turn-closed-2', 'turn-closed-1'],
              failureReasons: [],
              transitionDiagnostics: [
                {
                  fromTurnId: 'turn-closed-2',
                  toTurnId: 'turn-closed-1',
                  memoryInfluencedNext: true,
                  emotionInfluencedNext: true,
                  initiativeInfluencedNext: true,
                  embodimentInfluencedNext: true,
                  missingInfluences: [],
                },
              ],
              turnDiagnostics: [
                {
                  turnId: 'turn-closed-2',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
                {
                  turnId: 'turn-closed-1',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
              ],
            },
          ],
        },
        runtimeSamplingEvidence: {
          source: 'runtime-sampling-backlog',
          status: 'insufficient',
          sampledTurnCount: 4,
          comparedSessionCount: 2,
          closedSessionCount: 1,
          sessionClosureRate: 0.5,
          repairTargets: [
            {
              lane: 'emotion',
              missingTurnCount: 1,
              missingTransitionCount: 1,
              affectedSessionCount: 1,
              affectedSessionIds: ['session-runtime-proof-open'],
              sampleTurnIds: ['turn-open-2', 'turn-open-2->turn-open-1'],
              reasons: [
                'emotional closure audit did not preserve or rewrite closure',
                'from-turn has no emotional closure lane to carry forward',
                'text explicitly says emotional carry is missing',
                'transition text lacks emotional residue or closure cue',
              ],
            },
            {
              lane: 'embodiment',
              missingTurnCount: 1,
              missingTransitionCount: 0,
              affectedSessionCount: 1,
              affectedSessionIds: ['session-runtime-proof-open'],
              sampleTurnIds: ['turn-open-2'],
              reasons: [
                'same-her embodiment text is absent or explicitly missing',
                'text explicitly says embodiment carry is missing',
              ],
            },
          ],
          nextRunEvidenceChecklist: [
            {
              lane: 'memory',
              evidenceKind: 'next-turn-memory-handoff',
              sampleTurnIds: ['turn-open-2->turn-open-1'],
              requiredTraceEvidence: [
                'persisted decision-trace must show emotion nextInfluence consumed by next turn downstream state',
                'persisted decision-trace must show embodiment nextInfluence consumed by next turn downstream state',
              ],
            },
          ],
        },
      },
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents: vi.fn().mockResolvedValue([]),
      listMemoryDecisionTraces: vi.fn().mockResolvedValue([]),
    }))

    const store = useAlicizationMindReplayStore()
    store.setBenchmarkPackId('sampled-humanlike-memory-v1')
    await store.runReplayBenchmark()

    expect(store.benchmarkRuntimeSamplingEvidenceRows).toEqual([
      {
        key: 'runtime_sampling_evidence_status',
        value: 0.5,
        detail: 'status=insufficient | source=runtime-sampling-backlog | sampledTurns=4 | closedSessions=1/2 | repairTargets=emotion(turns=1, transitions=1, sessions=1): emotional closure audit did not preserve or rewrite closure; from-turn has no emotional closure lane to carry forward; text explicitly says emotional carry is missing; transition text lacks emotional residue or closure cue | embodiment(turns=1, transitions=0, sessions=1): same-her embodiment text is absent or explicitly missing; text explicitly says embodiment carry is missing | nextRunEvidence=memory/next-turn-memory-handoff(samples=turn-open-2->turn-open-1): persisted decision-trace must show emotion nextInfluence consumed by next turn downstream state; persisted decision-trace must show embodiment nextInfluence consumed by next turn downstream state',
      },
    ])
    expect(store.benchmarkSameHerSessionRows).toEqual([
      {
        key: 'same_her_session_compared_count',
        value: 2,
        detail: '2 real sampled session(s) had enough long-run same-her evidence to compare.',
      },
      {
        key: 'same_her_session_closure_rate',
        value: 0.5,
        detail: 'closed=1/2, insufficient=1, singleTurn=0 | requires at least three applicable turns, causal handoffs, noisy desktop roles, and all lanes closed in each turn.',
      },
      {
        key: 'same_her_session:session-runtime-proof-open',
        value: 0.5,
        detail: 'insufficient | hits=1/2 | failures=missing-same-her-closure-turn | turns=turn-open-2, turn-open-1 | missing=turn-open-2:emotion+embodiment | eventRoleWindow=1 | missingRoleTurns=turn-open-2:executionCallback+emotionalAfterglow+embodimentExpression',
      },
      {
        key: 'same_her_session:session-runtime-proof-closed',
        value: 1,
        detail: 'closed | hits=2/2 | failures=none | turns=turn-closed-2, turn-closed-1 | missing=none',
      },
    ])
    expect(store.benchmarkSameHerLaneGapRows).toEqual([
      {
        key: 'same_her_lane_gap:emotion',
        value: 1,
        detail: 'emotion missing in 1 turn(s) across 1 session(s): session-runtime-proof-open | turns=turn-open-2 | reasons=emotion: text explicitly says emotional carry is missing; emotional closure audit did not preserve or rewrite closure; from-turn has no emotional closure lane to carry forward; transition text lacks emotional residue or closure cue',
      },
      {
        key: 'same_her_lane_gap:embodiment',
        value: 1,
        detail: 'embodiment missing in 1 turn(s) across 1 session(s): session-runtime-proof-open | turns=turn-open-2 | reasons=embodiment: text explicitly says embodiment carry is missing; same-her embodiment text is absent or explicitly missing',
      },
    ])
    expect(store.benchmarkSameHerTransitionRows).toEqual([
      {
        key: 'same_her_transition:session-runtime-proof-open:turn-open-2->turn-open-1',
        value: 0.75,
        detail: 'memory=yes, emotion=no, initiativeOrExecution=yes, embodiment=yes | missing=emotion | reasons=emotion: from-turn has no emotional closure lane to carry forward; transition text lacks emotional residue or closure cue',
      },
      {
        key: 'same_her_transition:session-runtime-proof-closed:turn-closed-2->turn-closed-1',
        value: 1,
        detail: 'memory=yes, emotion=yes, initiativeOrExecution=yes, embodiment=yes | missing=none',
      },
    ])
    expect(store.benchmarkRegressionTriageRows).toEqual(expect.arrayContaining([
      {
        dimension: 'sameHerLaneGap:emotion',
        owner: 'runtime continuity',
        firstCheck: 'Check emotional closure carry first: verify affective residue, emotional closure audit, and rewrite preservation still keep the remembered same-her line active before the next turn widens outward.',
      },
      {
        dimension: 'sameHerLaneGap:embodiment',
        owner: 'runtime continuity',
        firstCheck: 'Check embodiment projection first: verify voice, facial state, lipsync, motion, and body continuity still derive from the same internal emotional/memory state rather than drifting into a detached performance layer.',
      },
    ]))
    expect(store.benchmarkRuntimeSameHerProofSummary?.nextRepairTarget).toBe(
      'Next real desktop run must capture memory/next-turn-memory-handoff evidence for turn-open-2->turn-open-1: persisted decision-trace must show emotion nextInfluence consumed by next turn downstream state; persisted decision-trace must show embodiment nextInfluence consumed by next turn downstream state',
    )
    expect(store.benchmarkSameHerRepairTargetRows).toEqual([
      {
        lane: 'emotion',
        sessionId: 'session-runtime-proof-open',
        turnId: 'turn-open-2',
        decisionTraceId: 'mind:open:2',
        missingLanes: ['emotion', 'embodiment'],
        reasons: [
          'text explicitly says emotional carry is missing',
          'emotional closure audit did not preserve or rewrite closure',
        ],
        firstCheck: 'Check emotional closure carry first: verify affective residue, emotional closure audit, and rewrite preservation still keep the remembered same-her line active before the next turn widens outward.',
      },
      {
        lane: 'embodiment',
        sessionId: 'session-runtime-proof-open',
        turnId: 'turn-open-2',
        decisionTraceId: 'mind:open:2',
        missingLanes: ['emotion', 'embodiment'],
        reasons: [
          'text explicitly says embodiment carry is missing',
          'same-her embodiment text is absent or explicitly missing',
        ],
        firstCheck: 'Check embodiment projection first: verify voice, facial state, lipsync, motion, and body continuity still derive from the same internal emotional/memory state rather than drifting into a detached performance layer.',
      },
      {
        lane: 'emotion',
        sessionId: 'session-runtime-proof-open',
        turnId: 'turn-open-1',
        missingLanes: ['emotion'],
        reasons: [
          'from-turn has no emotional closure lane to carry forward',
          'transition text lacks emotional residue or closure cue',
        ],
        firstCheck: 'Check emotional transition carry first: verify affective residue, emotional closure audit, rewrite preservation, and the next-turn handoff still keep the remembered same-her line active before the next turn widens outward.',
      },
    ])
  })

  it('drills into same-her repair target turns even when they are not gate failing turns', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([
      {
        id: 'evt-open-2',
        decisionTraceId: 'mind:open:2',
        turnId: 'turn-open-2',
        sessionId: 'session-runtime-proof-open',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: null,
        createdAt: 200,
      },
    ])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:open:2',
        turnId: 'turn-open-2',
        sessionId: 'session-runtime-proof-open',
        origin: 'user-turn',
        activeThreadId: 'thread-open',
        createdAt: 190,
        lastUpdatedAt: 210,
        eventKinds: ['persistence-written'],
        governance: null,
        recallAttribution: null,
        learningExecuted: null,
        persistenceWritten: null,
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
        replyMemoryCoherence: null,
      },
    ])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 2,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'pass',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        learningRevisionDiscipline: 'pass',
        domainInternalizationDiscipline: 'pass',
        worldModelValidationDiscipline: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 2,
        persisted: true,
        longRunSameHerSessionSummary: {
          comparedSessionCount: 1,
          closedSessionCount: 0,
          singleTurnSessionCount: 0,
          insufficientSessionCount: 1,
          sessionClosureRate: 0,
          sessions: [
            {
              sessionId: 'session-runtime-proof-open',
              status: 'insufficient',
              turnCount: 2,
              hitCount: 1,
              turnIds: ['turn-open-2', 'turn-open-1'],
              failureReasons: ['missing-same-her-closure-turn'],
              transitionDiagnostics: [
                {
                  fromTurnId: 'turn-open-2',
                  toTurnId: 'turn-open-1',
                  memoryInfluencedNext: true,
                  emotionInfluencedNext: false,
                  initiativeInfluencedNext: true,
                  embodimentInfluencedNext: true,
                  missingInfluences: ['emotion'],
                },
              ],
              turnDiagnostics: [
                {
                  turnId: 'turn-open-2',
                  tracePointer: {
                    kind: 'decision-trace',
                    packId: 'sampled-humanlike-memory-v1',
                    turnId: 'turn-open-2',
                    decisionTraceId: 'mind:open:2',
                    sessionId: 'session-runtime-proof-open',
                    activeThreadId: 'thread-open',
                  },
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: false,
                  embodiment: false,
                  missingLanes: ['emotion', 'embodiment'],
                  missingLaneReasons: {
                    emotion: [
                      'text explicitly says emotional carry is missing',
                      'emotional closure audit did not preserve or rewrite closure',
                    ],
                    embodiment: [
                      'text explicitly says embodiment carry is missing',
                      'same-her embodiment text is absent or explicitly missing',
                    ],
                  },
                },
                {
                  turnId: 'turn-open-1',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
              ],
            },
          ],
        },
      },
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))

    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()
    await store.drillDownBenchmarkTurn('turn-open-2')

    expect(store.selectedDiagnosisTurnId).toBe('turn-open-2')
    expect(listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:open:2',
      turnId: undefined,
      limit: 200,
    })
    expect(listMemoryDecisionTraces).toBeCalledWith({
      decisionTraceId: 'mind:open:2',
      turnId: undefined,
      limit: 200,
    })
    expect(store.events).toEqual([
      expect.objectContaining({
        turnId: 'turn-open-2',
      }),
    ])
    expect(store.traceRecords).toEqual([
      expect.objectContaining({
        turnId: 'turn-open-2',
      }),
    ])
  })

  it('surfaces cross-modal embodiment repair reasons in same-her lane gap rows', () => {
    const store = useAlicizationMindReplayStore()
    store.benchmarkReport = {
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 1,
      quality: [],
      standards: {},
      gate: {
        passed: false,
        failingKeys: [],
        dimensions: [],
      },
      telemetryPatch: null,
      telemetryPersisted: false,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 1,
        persisted: false,
        runtimeSamplingEvidence: {
          source: 'runtime-sampling-backlog',
          status: 'insufficient',
          sampledTurnCount: 1,
          comparedSessionCount: 1,
          closedSessionCount: 0,
          sessionClosureRate: 0,
          repairTargets: [
            {
              lane: 'embodiment',
              missingTurnCount: 1,
              missingTransitionCount: 0,
              affectedSessionCount: 1,
              affectedSessionIds: ['session-cross-modal-gap'],
              sampleTurnIds: ['turn-cross-modal-gap'],
              reasons: [
                'cross-modal embodiment proof has only: body; missing at least one of body, voice, face, motion, lipsync',
              ],
            },
          ],
        },
      },
    } as any

    expect(store.benchmarkSameHerLaneGapRows).toEqual([
      {
        key: 'same_her_lane_gap:embodiment',
        value: 1,
        detail: 'embodiment missing in 1 turn(s) across 1 session(s): session-cross-modal-gap | turns=turn-cross-modal-gap | reasons=embodiment: cross-modal embodiment proof has only: body; missing at least one of body, voice, face, motion, lipsync',
      },
    ])
  })

  it('drills into runtime sampling repair targets hidden beyond the same-her session preview', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([
      {
        id: 'evt-hidden-late-2',
        decisionTraceId: 'mind:hidden-late:2',
        turnId: 'turn-hidden-late-2',
        sessionId: 'session-hidden-late',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: null,
        createdAt: 420,
      },
    ])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:hidden-late:2',
        turnId: 'turn-hidden-late-2',
        sessionId: 'session-hidden-late',
        origin: 'user-turn',
        activeThreadId: 'thread-hidden-late',
        createdAt: 410,
        lastUpdatedAt: 430,
        eventKinds: ['persistence-written'],
        governance: null,
        recallAttribution: null,
        learningExecuted: null,
        persistenceWritten: null,
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
        replyMemoryCoherence: null,
      },
    ])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1_700_000_000_000,
      turnCount: 18,
      quality: [],
      standards: {},
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
        report: [],
      },
      shipGate: [],
      telemetryPatch: {
        retrievalHealth: {},
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 18,
        persisted: true,
        longRunSameHerSessionSummary: {
          comparedSessionCount: 9,
          closedSessionCount: 8,
          singleTurnSessionCount: 0,
          insufficientSessionCount: 1,
          sessionClosureRate: 8 / 9,
          sessions: [
            {
              sessionId: 'session-preview-closed',
              status: 'closed',
              turnCount: 2,
              hitCount: 2,
              turnIds: ['turn-preview-2', 'turn-preview-1'],
              failureReasons: [],
              transitionDiagnostics: [],
              turnDiagnostics: [
                {
                  turnId: 'turn-preview-2',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
                {
                  turnId: 'turn-preview-1',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
              ],
            },
          ],
        },
        runtimeSamplingEvidence: {
          source: 'runtime-sampling-backlog',
          status: 'insufficient',
          sampledTurnCount: 18,
          comparedSessionCount: 9,
          closedSessionCount: 8,
          sessionClosureRate: 8 / 9,
          repairTargets: [
            {
              lane: 'memory',
              missingTurnCount: 1,
              missingTransitionCount: 0,
              affectedSessionCount: 1,
              affectedSessionIds: ['session-hidden-late'],
              sampleTurnIds: ['turn-hidden-late-2'],
              reasons: [
                'same-her memory lane is absent in the late noisy desktop session',
              ],
            },
          ],
        },
      },
      regressionTriage: [],
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))

    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()

    expect(store.benchmarkRuntimeSamplingEvidenceRows[0]?.detail).toContain('repairTargets=memory(turns=1, transitions=0, sessions=1)')
    expect(store.benchmarkSameHerLaneGapRows).toEqual([
      {
        key: 'same_her_lane_gap:memory',
        value: 1,
        detail: 'memory missing in 1 turn(s) across 1 session(s): session-hidden-late | turns=turn-hidden-late-2 | reasons=memory: same-her memory lane is absent in the late noisy desktop session',
      },
    ])
    expect(store.benchmarkSameHerRepairTargetRows).toEqual([
      {
        lane: 'memory',
        sessionId: 'session-hidden-late',
        turnId: 'turn-hidden-late-2',
        missingLanes: ['memory'],
        reasons: [
          'same-her memory lane is absent in the late noisy desktop session',
        ],
        firstCheck: 'Check memory retrieval and resolution first: verify recalled events, relationship continuity, and memory decision traces are carrying the same-her line before downstream initiative or embodiment tries to use it.',
      },
    ])
    expect(store.benchmarkRegressionTriageRows).toEqual(expect.arrayContaining([
      {
        dimension: 'sameHerLaneGap:memory',
        owner: 'memory retrieval',
        firstCheck: 'Check memory retrieval and resolution first: verify recalled events, relationship continuity, and memory decision traces are carrying the same-her line before downstream initiative or embodiment tries to use it.',
      },
    ]))

    await store.drillDownBenchmarkTurn('turn-hidden-late-2')

    expect(store.selectedDiagnosisTurnId).toBe('turn-hidden-late-2')
    expect(listMindTurnEvents).toBeCalledWith({
      decisionTraceId: undefined,
      turnId: 'turn-hidden-late-2',
      limit: 200,
    })
    expect(listMemoryDecisionTraces).toBeCalledWith({
      decisionTraceId: undefined,
      turnId: 'turn-hidden-late-2',
      limit: 200,
    })
    expect(store.events).toEqual([
      expect.objectContaining({
        turnId: 'turn-hidden-late-2',
      }),
    ])
    expect(store.traceRecords).toEqual([
      expect.objectContaining({
        turnId: 'turn-hidden-late-2',
      }),
    ])
  })

  it('surfaces runtime sampling transition repair targets hidden beyond the same-her session preview', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([
      {
        id: 'evt-hidden-transition-1',
        decisionTraceId: 'mind:hidden-transition:1',
        turnId: 'turn-hidden-transition-1',
        sessionId: 'session-hidden-transition',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: null,
        createdAt: 520,
      },
    ])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:hidden-transition:1',
        turnId: 'turn-hidden-transition-1',
        sessionId: 'session-hidden-transition',
        origin: 'user-turn',
        activeThreadId: 'thread-hidden-transition',
        createdAt: 510,
        lastUpdatedAt: 530,
        eventKinds: ['persistence-written'],
        governance: null,
        recallAttribution: null,
        learningExecuted: null,
        persistenceWritten: null,
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
        replyMemoryCoherence: null,
      },
    ])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1_700_000_000_000,
      turnCount: 18,
      quality: [],
      standards: {},
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
        report: [],
      },
      shipGate: [],
      telemetryPatch: {
        retrievalHealth: {},
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 18,
        persisted: true,
        longRunSameHerSessionSummary: {
          comparedSessionCount: 9,
          closedSessionCount: 8,
          singleTurnSessionCount: 0,
          insufficientSessionCount: 1,
          sessionClosureRate: 8 / 9,
          sessions: [
            {
              sessionId: 'session-preview-closed',
              status: 'closed',
              turnCount: 2,
              hitCount: 2,
              turnIds: ['turn-preview-2', 'turn-preview-1'],
              failureReasons: [],
              transitionDiagnostics: [],
              turnDiagnostics: [
                {
                  turnId: 'turn-preview-2',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
                {
                  turnId: 'turn-preview-1',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
              ],
            },
          ],
        },
        runtimeSamplingEvidence: {
          source: 'runtime-sampling-backlog',
          status: 'insufficient',
          sampledTurnCount: 18,
          comparedSessionCount: 9,
          closedSessionCount: 8,
          sessionClosureRate: 8 / 9,
          tracePointers: [
            {
              sampleTurnId: 'turn-hidden-transition-2->turn-hidden-transition-1',
              tracePointer: {
                kind: 'decision-trace',
                packId: 'sampled-humanlike-memory-v1',
                turnId: 'turn-hidden-transition-1',
                decisionTraceId: 'mind:hidden-transition:1',
                sessionId: 'session-hidden-transition',
                activeThreadId: 'thread-hidden-transition',
              },
            },
          ],
          repairTargets: [
            {
              lane: 'initiativeOrExecution',
              missingTurnCount: 0,
              missingTransitionCount: 1,
              affectedSessionCount: 1,
              affectedSessionIds: ['session-hidden-transition'],
              sampleTurnIds: ['turn-hidden-transition-2->turn-hidden-transition-1'],
              reasons: [
                'transition text lacks proactive, callback, or feedback-carry cue',
              ],
            },
          ],
        },
      },
      regressionTriage: [],
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))

    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()

    expect(store.benchmarkSameHerLaneGapRows).toEqual([])
    expect(store.benchmarkSameHerTransitionRows).toEqual([
      {
        key: 'same_her_transition:session-hidden-transition:turn-hidden-transition-2->turn-hidden-transition-1',
        value: null,
        detail: 'runtime-sampling repair target | missing=initiativeOrExecution | reasons=initiativeOrExecution: transition text lacks proactive, callback, or feedback-carry cue',
      },
    ])
    expect(store.benchmarkSameHerRepairTargetRows).toEqual([
      {
        lane: 'initiativeOrExecution',
        sessionId: 'session-hidden-transition',
        turnId: 'turn-hidden-transition-1',
        decisionTraceId: 'mind:hidden-transition:1',
        missingLanes: ['initiativeOrExecution'],
        reasons: [
          'transition text lacks proactive, callback, or feedback-carry cue',
        ],
        firstCheck: 'Check initiative and execution callback transition carry first: verify proactive cadence, execution feedback, callback realization, and the next-turn handoff still continue the remembered same-her line instead of restarting as a detached task update.',
      },
    ])
    expect(store.benchmarkRegressionTriageRows).toEqual(expect.arrayContaining([
      {
        dimension: 'sameHerTransitionGap:initiativeOrExecution',
        owner: 'runtime continuity',
        firstCheck: 'Check initiative and execution callback transition carry first: verify proactive cadence, execution feedback, callback realization, and the next-turn handoff still continue the remembered same-her line instead of restarting as a detached task update.',
      },
    ]))

    await store.drillDownBenchmarkTurn('turn-hidden-transition-1')

    expect(store.selectedDiagnosisTurnId).toBe('turn-hidden-transition-1')
    expect(listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:hidden-transition:1',
      limit: 200,
    })
    expect(listMemoryDecisionTraces).toBeCalledWith({
      decisionTraceId: 'mind:hidden-transition:1',
      limit: 200,
    })
    expect(store.events).toEqual([
      expect.objectContaining({
        turnId: 'turn-hidden-transition-1',
      }),
    ])
    expect(store.traceRecords).toEqual([
      expect.objectContaining({
        turnId: 'turn-hidden-transition-1',
      }),
    ])
  })

  it('routes same-her transition-only gaps into repair targets and regression triage', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([
      {
        id: 'evt-transition-only-1',
        decisionTraceId: 'mind:transition-only:1',
        turnId: 'turn-transition-only-1',
        sessionId: 'session-transition-only',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: null,
        createdAt: 300,
      },
    ])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:transition-only:1',
        turnId: 'turn-transition-only-1',
        sessionId: 'session-transition-only',
        origin: 'user-turn',
        activeThreadId: 'thread-transition-only',
        createdAt: 290,
        lastUpdatedAt: 310,
        eventKinds: ['persistence-written'],
        governance: null,
        recallAttribution: null,
        learningExecuted: null,
        persistenceWritten: null,
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
        replyMemoryCoherence: null,
      },
    ])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1_700_000_000_000,
      turnCount: 2,
      quality: [],
      standards: {},
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
        report: [],
      },
      shipGate: [],
      telemetryPatch: {
        retrievalHealth: {},
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 2,
        persisted: true,
        longRunSameHerSessionSummary: {
          comparedSessionCount: 1,
          closedSessionCount: 0,
          singleTurnSessionCount: 0,
          insufficientSessionCount: 1,
          sessionClosureRate: 0,
          sessions: [
            {
              sessionId: 'session-transition-only',
              status: 'insufficient',
              turnCount: 2,
              hitCount: 2,
              turnIds: ['turn-transition-only-2', 'turn-transition-only-1'],
              failureReasons: ['missing-same-her-transition'],
              transitionDiagnostics: [
                {
                  fromTurnId: 'turn-transition-only-2',
                  toTurnId: 'turn-transition-only-1',
                  tracePointer: {
                    kind: 'decision-trace',
                    packId: 'sampled-humanlike-memory-v1',
                    turnId: 'turn-transition-only-1',
                    decisionTraceId: 'mind:transition-only:1',
                    sessionId: 'session-transition-only',
                    activeThreadId: 'thread-transition-only',
                  },
                  memoryInfluencedNext: true,
                  emotionInfluencedNext: true,
                  initiativeInfluencedNext: false,
                  embodimentInfluencedNext: true,
                  missingInfluences: ['initiativeOrExecution'],
                  missingInfluenceReasons: {
                    initiativeOrExecution: [
                      'transition text lacks proactive, callback, or feedback-carry cue',
                    ],
                  },
                },
              ],
              turnDiagnostics: [
                {
                  turnId: 'turn-transition-only-2',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
                {
                  turnId: 'turn-transition-only-1',
                  memory: true,
                  initiativeOrExecution: true,
                  emotion: true,
                  embodiment: true,
                  missingLanes: [],
                },
              ],
            },
          ],
        },
      },
      regressionTriage: [],
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))

    const store = useAlicizationMindReplayStore()
    store.setBenchmarkPackId('sampled-humanlike-memory-v1')
    await store.runReplayBenchmark()

    expect(store.benchmarkSameHerLaneGapRows).toEqual([])
    expect(store.benchmarkSameHerTransitionRows).toEqual([
      {
        key: 'same_her_transition:session-transition-only:turn-transition-only-2->turn-transition-only-1',
        value: 0.75,
        detail: 'memory=yes, emotion=yes, initiativeOrExecution=no, embodiment=yes | missing=initiativeOrExecution | reasons=initiativeOrExecution: transition text lacks proactive, callback, or feedback-carry cue',
      },
    ])
    expect(store.benchmarkRegressionTriageRows).toEqual([
      {
        dimension: 'sameHerTransitionGap:initiativeOrExecution',
        owner: 'runtime continuity',
        firstCheck: 'Check initiative and execution callback transition carry first: verify proactive cadence, execution feedback, callback realization, and the next-turn handoff still continue the remembered same-her line instead of restarting as a detached task update.',
      },
    ])
    expect(store.benchmarkSameHerRepairTargetRows).toEqual([
      {
        lane: 'initiativeOrExecution',
        sessionId: 'session-transition-only',
        turnId: 'turn-transition-only-1',
        decisionTraceId: 'mind:transition-only:1',
        missingLanes: ['initiativeOrExecution'],
        reasons: [
          'transition text lacks proactive, callback, or feedback-carry cue',
        ],
        firstCheck: 'Check initiative and execution callback transition carry first: verify proactive cadence, execution feedback, callback realization, and the next-turn handoff still continue the remembered same-her line instead of restarting as a detached task update.',
      },
    ])

    await store.drillDownBenchmarkTurn('turn-transition-only-1')

    expect(store.selectedDiagnosisTurnId).toBe('turn-transition-only-1')
    expect(listMindTurnEvents).toBeCalledWith({
      decisionTraceId: 'mind:transition-only:1',
      limit: 200,
    })
    expect(listMemoryDecisionTraces).toBeCalledWith({
      decisionTraceId: 'mind:transition-only:1',
      limit: 200,
    })
  })

  it('runs sampled same-her session proof without changing the selected benchmark pack', async () => {
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 0,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'pass',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        learningRevisionDiscipline: 'pass',
        domainInternalizationDiscipline: 'pass',
        worldModelValidationDiscipline: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 0,
        persisted: true,
        longRunSameHerSessionSummary: null,
      },
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
    }))

    const store = useAlicizationMindReplayStore()
    store.setBenchmarkPackId('final-humanlike-memory-v1')
    store.setBenchmarkSampleLimit(3)
    await store.runSameHerSessionProof()

    expect(runReplayBenchmark).toBeCalledWith({
      packId: 'sampled-humanlike-memory-v1',
      persistTelemetry: true,
      sampleLimit: 3,
    })
    expect(store.selectedBenchmarkPackId).toBe('final-humanlike-memory-v1')
  })

  it('summarizes real desktop same-her proof without treating dataset closure as runtime closure', async () => {
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1_700_000_000_000,
      turnCount: 3,
      quality: [],
      standards: {},
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
        report: [],
      },
      shipGate: [
        {
          key: 'presence-qa-gate',
          status: 'fail',
          detail: 'runtimeLongRunSameHerSessionClosureRate=0',
        },
      ],
      telemetryPatch: {
        retrievalHealth: {
          runtimeLongRunSameHerSessionClosureRate: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 3,
        persisted: true,
        longRunSameHerSessionSummary: {
          comparedSessionCount: 1,
          closedSessionCount: 1,
          singleTurnSessionCount: 0,
          insufficientSessionCount: 0,
          sessionClosureRate: 1,
          sessions: [
            {
              sessionId: 'dataset-closed-session',
              status: 'closed',
              turnCount: 3,
              hitCount: 3,
              transitionCount: 2,
              closedTransitionCount: 2,
              requiredConsecutiveTransitionCount: 2,
              maxConsecutiveClosedTransitionCount: 2,
              turnIds: ['dataset-turn-3', 'dataset-turn-2', 'dataset-turn-1'],
              failureReasons: [],
              runtimeEvidence: {
                source: 'dataset-backlog',
                runtimeTurnCount: 0,
                decisionTraceTurnCount: 0,
                syntheticTurnCount: 3,
                allTurnsRuntimeSourced: false,
              },
              transitionDiagnostics: [],
              turnDiagnostics: [],
            },
          ],
        },
        runtimeSamplingEvidence: {
          source: 'dataset-backlog',
          status: 'closed',
          sampledTurnCount: 3,
          comparedSessionCount: 1,
          closedSessionCount: 1,
          sessionClosureRate: 1,
        },
      },
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
    }))

    const store = useAlicizationMindReplayStore()
    await store.runSameHerSessionProof()

    expect(store.benchmarkRuntimeSameHerProofSummary).toEqual({
      status: 'not-runtime',
      closed: false,
      source: 'dataset-backlog',
      sourceIsRuntime: false,
      sampledTurnCount: 3,
      comparedSessionCount: 1,
      closedSessionCount: 1,
      sessionClosureRate: 1,
      runtimeClosureRate: 0,
      runtimeSourcedSessionCount: 0,
      allRuntimeSourcedSessionCount: 0,
      syntheticTurnCount: 3,
      decisionTraceTurnCount: 0,
      runtimeTurnCount: 0,
      headline: 'Dataset/static same-her closure is not enough for the real desktop proof.',
      detail: 'source=dataset-backlog | runtimeClosureRate=0 | runtimeSessions=0/1 | allRuntimeSourcedSessions=0/1 | runtimeTurns=0 | decisionTraceTurns=0 | syntheticTurns=3 | closedSessions=1/1 | sessionClosureRate=1',
      nextRepairTarget: 'Run a sampled proof from real runtime turns with decision-trace provenance before treating the long-run same-her loop as closed.',
    })
  })

  it('surfaces memory closure long-run diagnostics from downstream causal identity evidence', async () => {
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1_700_000_000_000,
      turnCount: 3,
      quality: [],
      standards: {},
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
        report: [],
      },
      telemetryPatch: null,
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 3,
        persisted: true,
        memoryClosureLongRun: {
          status: 'insufficient',
          turnCount: 3,
          requiredTurnCount: 3,
          stableMemoryIdentity: false,
          dominantMemoryIdentityKey: null,
          dominantMemoryIdentityKeys: [],
          transitionBreaks: [
            'turn-a->turn-b',
          ],
          failureReasons: [
            'missing-causal-memory-identity',
            'missing-memory-closure-lanes',
            'missing-memory-identity-continuity',
          ],
          turnDiagnostics: [
            {
              turnId: 'turn-a',
              memoryIdentityKey: null,
              memoryIdentityKeys: [],
              provedLanes: ['recall'],
              missingLanes: ['emotion', 'initiative', 'execution', 'embodiment', 'embodiment-expression'],
              continuityDigest: 'memory_identity absent while route-chain summary exists',
            },
          ],
        },
      },
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
    }))

    const store = useAlicizationMindReplayStore()
    await store.runSameHerSessionProof()

    expect(store.benchmarkMemoryClosureLongRunSummary).toEqual({
      status: 'insufficient',
      closed: false,
      turnCount: 3,
      requiredTurnCount: 3,
      stableMemoryIdentity: false,
      dominantMemoryIdentityKey: null,
      failureReasons: [
        'missing-causal-memory-identity',
        'missing-memory-closure-lanes',
        'missing-memory-identity-continuity',
      ],
      detail: 'status=insufficient | turns=3/3 | identity=none | stableIdentity=false | failures=missing-causal-memory-identity, missing-memory-closure-lanes, missing-memory-identity-continuity | transitionBreaks=turn-a->turn-b',
      nextRepairTarget: 'Check downstream memoryClosureCausality memoryIdentity from emotion, initiative, execution, and embodiment lanes first.',
    })
    expect(store.benchmarkMemoryClosureLongRunRows).toEqual([
      {
        key: 'memory_closure_long_run_status',
        value: 0,
        detail: 'status=insufficient | turns=3/3 | identity=none | stableIdentity=false | failures=missing-causal-memory-identity, missing-memory-closure-lanes, missing-memory-identity-continuity | transitionBreaks=turn-a->turn-b',
      },
      {
        key: 'memory_closure_long_run_identity',
        value: 0,
        detail: 'dominant=none | stable=false | identityKeys=none | transitionBreaks=turn-a->turn-b',
      },
      {
        key: 'memory_closure_long_run_turn:turn-a',
        value: 1,
        detail: 'identity=none | proved=recall | missing=emotion+initiative+execution+embodiment+embodiment-expression | memory_identity absent while route-chain summary exists',
      },
    ])
  })

  it('marks real desktop same-her proof closed only when runtime decision-trace provenance is complete', async () => {
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1_700_000_000_000,
      turnCount: 3,
      quality: [],
      standards: {},
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
        report: [],
      },
      shipGate: [
        {
          key: 'presence-qa-gate',
          status: 'pass',
          detail: 'runtimeLongRunSameHerSessionClosureRate=1',
        },
      ],
      telemetryPatch: {
        retrievalHealth: {
          runtimeLongRunSameHerSessionClosureRate: 1,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 3,
        persisted: true,
        longRunSameHerSessionSummary: {
          comparedSessionCount: 1,
          closedSessionCount: 1,
          singleTurnSessionCount: 0,
          insufficientSessionCount: 0,
          sessionClosureRate: 1,
          sessions: [
            {
              sessionId: 'runtime-closed-session',
              status: 'closed',
              turnCount: 3,
              hitCount: 3,
              transitionCount: 2,
              closedTransitionCount: 2,
              requiredConsecutiveTransitionCount: 2,
              maxConsecutiveClosedTransitionCount: 2,
              turnIds: ['runtime-turn-3', 'runtime-turn-2', 'runtime-turn-1'],
              failureReasons: [],
              runtimeEvidence: {
                source: 'mixed-runtime-and-conversation',
                runtimeTurnCount: 3,
                decisionTraceTurnCount: 3,
                syntheticTurnCount: 0,
                allTurnsRuntimeSourced: true,
              },
              transitionDiagnostics: [],
              turnDiagnostics: [],
            },
          ],
        },
        runtimeSamplingEvidence: {
          source: 'mixed-runtime-and-conversation',
          status: 'closed',
          sampledTurnCount: 3,
          comparedSessionCount: 1,
          closedSessionCount: 1,
          sessionClosureRate: 1,
        },
      },
    })
    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
    }))

    const store = useAlicizationMindReplayStore()
    await store.runSameHerSessionProof()

    expect(store.benchmarkRuntimeSameHerProofSummary).toEqual({
      status: 'closed',
      closed: true,
      source: 'mixed-runtime-and-conversation',
      sourceIsRuntime: true,
      sampledTurnCount: 3,
      comparedSessionCount: 1,
      closedSessionCount: 1,
      sessionClosureRate: 1,
      runtimeClosureRate: 1,
      runtimeSourcedSessionCount: 1,
      allRuntimeSourcedSessionCount: 1,
      syntheticTurnCount: 0,
      decisionTraceTurnCount: 3,
      runtimeTurnCount: 3,
      headline: 'Real desktop same-her closure is closed by runtime decision-trace evidence.',
      detail: 'source=mixed-runtime-and-conversation | runtimeClosureRate=1 | runtimeSessions=1/1 | allRuntimeSourcedSessions=1/1 | runtimeTurns=3 | decisionTraceTurns=3 | syntheticTurns=0 | closedSessions=1/1 | sessionClosureRate=1',
      nextRepairTarget: 'Real desktop same-her proof is closed; keep collecting noisy-session samples so future drift is caught before it becomes personality drift.',
    })
  })

  it('uses self-model specific natural-language diagnosis when learning evidence says the self story is still under revision', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:self-model:1',
        turnId: 'turn-self-model-1',
        sessionId: 'session-self-model-1',
        origin: 'user-turn',
        activeThreadId: 'thread-self-model-1',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['learning-executed', 'reply-memory-coherence'],
        governance: null,
        recallAttribution: null,
        persistenceWritten: null,
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
        learningExecuted: {
          action: 'revise',
          domain: 'self-model',
          resultSummary: 'Revision updated a stale self narrative.',
          focuses: ['internalize-self-model'],
        },
        replyMemoryCoherence: {
          coherenceState: 'inward-only',
          whyWithheld: 'The older self-story is still being revised and should not surface as settled continuity yet.',
          followUpSummary: 'Keep the self line inward until the newer pattern stabilizes.',
          followUpPreferredTiming: 'next-open-window',
          followUpIntrusionRisk: 'high',
        },
      },
    ] as any)
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 1,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'pass',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        learningRevisionDiscipline: 'fail',
        domainInternalizationDiscipline: 'pass',
        worldModelValidationDiscipline: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: false,
        failingKeys: ['learningRevisionDiscipline'],
        dimensions: [{
          key: 'learningRevisionDiscipline',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 0.75,
          passedRatio: 0,
          failingTurnIds: ['turn-self-model-1'],
        }],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          learningRevisionDiscipline: 'fail',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [{
        turnId: 'turn-self-model-1',
        userText: '你是不是还在修正自己之前那套说法',
        failingDimensions: ['learningRevisionDiscipline'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-self-model-1',
          decisionTraceId: 'mind:self-model:1',
          sessionId: 'session-self-model-1',
          activeThreadId: 'thread-self-model-1',
        },
        sampledCategories: ['dialogue'],
      }],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 1,
        totalCount: 1,
        persisted: true,
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))
    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()
    await store.drillDownBenchmarkTurn('turn-self-model-1')

    expect(store.selectedBenchmarkTurn).toEqual(expect.objectContaining({
      diagnosisSummary: expect.stringContaining('Self-model learning is still revising'),
      replyMemoryCoherenceSummary: expect.objectContaining({
        followUpPreferredTiming: 'next-open-window',
      }),
    }))
    expect(store.selectedBenchmarkTurn?.diagnosisSummary).toContain('next open window')
  })

  it('prefers explicit suppression-tag diagnosis when stale self-model continuity was vetoed in the resolution ledger', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 1,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'fail',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        learningRevisionDiscipline: 'pass',
        domainInternalizationDiscipline: 'pass',
        worldModelValidationDiscipline: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: false,
        failingKeys: ['wrongThreadSuppression'],
        dimensions: [{
          key: 'wrongThreadSuppression',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 0.75,
          passedRatio: 0,
          failingTurnIds: ['turn-self-suppressed-1'],
        }],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'fail',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [{
        turnId: 'turn-self-suppressed-1',
        userText: '你是不是还在修正以前那套自我理解',
        failingDimensions: ['wrongThreadSuppression'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-self-suppressed-1',
          decisionTraceId: 'mind:self-suppressed:1',
          sessionId: 'session-self-suppressed-1',
          activeThreadId: 'thread-self-suppressed-1',
        },
        sampledCategories: ['dialogue'],
        resolutionLedgerSummary: {
          dominantClusterSummary: null,
          competingClusterSummary: 'Older self-story remained active.',
          finalSurfacePolicy: 'internal-only',
          shouldStayInward: true,
          shouldDelayUntilAfterPayoff: false,
          rejectedCandidateCount: 1,
          suppressionTags: ['self-model-stale'],
        },
      }],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 1,
        totalCount: 1,
        persisted: true,
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))
    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()

    expect(store.selectedBenchmarkTurn).toEqual(expect.objectContaining({
      diagnosisSummary: expect.stringContaining('Older self-model continuity was vetoed'),
      resolutionLedgerSummary: expect.objectContaining({
        suppressionTags: ['self-model-stale'],
      }),
    }))
  })

  it('prefers explicit suppression-tag diagnosis when competing relationship eras were vetoed in the resolution ledger', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 1,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'fail',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        learningRevisionDiscipline: 'pass',
        domainInternalizationDiscipline: 'pass',
        worldModelValidationDiscipline: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: false,
        failingKeys: ['wrongThreadSuppression'],
        dimensions: [{
          key: 'wrongThreadSuppression',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 0.75,
          passedRatio: 0,
          failingTurnIds: ['turn-relationship-suppressed-1'],
        }],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'fail',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [{
        turnId: 'turn-relationship-suppressed-1',
        userText: '不是那次修复后的关系距离',
        failingDimensions: ['wrongThreadSuppression'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-relationship-suppressed-1',
          decisionTraceId: 'mind:relationship-suppressed:1',
          sessionId: 'session-relationship-suppressed-1',
          activeThreadId: 'thread-relationship-suppressed-1',
        },
        sampledCategories: ['dialogue'],
        resolutionLedgerSummary: {
          dominantClusterSummary: null,
          competingClusterSummary: 'An older repair phase remained too easy to confuse.',
          finalSurfacePolicy: 'internal-only',
          shouldStayInward: true,
          shouldDelayUntilAfterPayoff: false,
          rejectedCandidateCount: 1,
          suppressionTags: ['relationship-era-confusion'],
        },
      }],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 1,
        totalCount: 1,
        persisted: true,
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))
    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()

    expect(store.selectedBenchmarkTurn).toEqual(expect.objectContaining({
      diagnosisSummary: expect.stringContaining('Competing relationship eras were vetoed'),
      resolutionLedgerSummary: expect.objectContaining({
        suppressionTags: ['relationship-era-confusion'],
      }),
    }))
  })

  it('queries memory decision traces by active self-evolution candidate id', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([
      {
        decisionTraceId: 'mind:candidate:1',
        turnId: 'turn-candidate-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        activeThreadId: 'thread-1',
        createdAt: 100,
        lastUpdatedAt: 120,
        eventKinds: ['governance-normalized', 'persistence-written'],
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 100,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'mind:candidate:1',
            lanes: ['memory-policy'],
            reasonCodes: ['domain:self-model'],
            summary: 'candidate trace',
          },
          summary: 'source=main-runtime | self_revision=patch-active',
        },
      },
    ])

    setAlicizationBridge(createAlicizationBridgeStub({
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))

    const store = useAlicizationMindReplayStore()
    const result = await store.queryMemoryDecisionTraces({
      activeSelfEvolutionCandidateId: 'candidate-active',
      limit: 40,
    } as any)

    expect(listMindTurnEvents).toBeCalledWith({
      decisionTraceId: undefined,
      turnId: undefined,
      activeSelfEvolutionCandidateId: 'candidate-active',
      limit: 40,
    })
    expect(listMemoryDecisionTraces).toBeCalledWith({
      decisionTraceId: undefined,
      turnId: undefined,
      activeSelfEvolutionCandidateId: 'candidate-active',
      limit: 40,
    })
    expect(result).toEqual([
      expect.objectContaining({
        decisionTraceId: 'mind:candidate:1',
      }),
    ])
  })

  it('surfaces self-authority replay benchmark rows when same-her audit is present', () => {
    const store = useAlicizationMindReplayStore()
    store.benchmarkReport = {
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1,
      turnCount: 1,
      telemetryPersisted: false,
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
        standards: {} as any,
      },
      telemetryPatch: null,
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 0,
        persisted: false,
        driftSignals: ['selfAuthorityDrift'],
        humanRatingRubric: null,
        paritySummary: null,
        authoritySummary: null,
        projectStateSummary: null,
        preDialogueBriefingSummary: null,
        emotionalClosureSummary: null,
        selfAuthoritySummary: {
          comparedTurnCount: 2,
          authoritySummaryTurnCount: 2,
          closenessPostureTurnCount: 2,
          preservedTurnCount: 1,
          rewriteAppliedTurnCount: 1,
          fullyCarriedTurnCount: 1,
        },
      },
      quality: [],
      turns: [],
      failingTurns: [],
    } as any

    expect(store.benchmarkSelfAuthorityRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'self_authority_compared_turn_count',
        value: 2,
      }),
      expect.objectContaining({
        key: 'self_authority_fully_carried_rate',
      }),
    ]))
    expect(store.benchmarkSelfAuthorityRows.find(row => row.key === 'self_authority_fully_carried_rate')?.detail).toContain('drift=selfAuthorityDrift')
  })

  it('surfaces project-state audit replay benchmark rows when same-her continuity audit is present', () => {
    const store = useAlicizationMindReplayStore()
    store.benchmarkReport = {
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1,
      turnCount: 1,
      telemetryPersisted: false,
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
        standards: {} as any,
      },
      telemetryPatch: null,
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 0,
        persisted: false,
        driftSignals: ['projectStateAuditDrift'],
        humanRatingRubric: null,
        paritySummary: null,
        authoritySummary: null,
        projectStateSummary: null,
        preDialogueBriefingSummary: null,
        emotionalClosureSummary: null,
        selfAuthoritySummary: null,
        projectStateAuditSummary: {
          comparedTurnCount: 2,
          sameHerSummaryTurnCount: 2,
          sameHerSelfLineTurnCount: 1,
          sameHerHoldDetailTurnCount: 1,
          continuityArcStageTurnCount: 1,
          continuityCueTurnCount: 1,
          landedProgressTurnCount: 1,
          openClosureTurnCount: 1,
          preDialogueAwarenessTurnCount: 1,
          continuitySummaryTurnCount: 1,
          embodimentClosureTurnCount: 1,
          preDialogueClosureTurnCount: 1,
          preservedTurnCount: 1,
          rewriteAppliedTurnCount: 1,
          fullyCarriedTurnCount: 1,
        },
      },
      quality: [],
      turns: [],
      failingTurns: [],
    } as any

    expect(store.benchmarkProjectStateAuditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'project_state_audit_compared_turn_count',
        value: 2,
      }),
      expect.objectContaining({
        key: 'project_state_audit_fully_carried_rate',
      }),
      expect.objectContaining({
        key: 'project_state_audit_landed_progress_rate',
      }),
      expect.objectContaining({
        key: 'project_state_audit_open_closure_rate',
      }),
      expect.objectContaining({
        key: 'project_state_audit_pre_dialogue_awareness_rate',
      }),
      expect.objectContaining({
        key: 'project_state_audit_continuity_summary_rate',
      }),
      expect.objectContaining({
        key: 'project_state_audit_same_her_hold_detail_rate',
      }),
      expect.objectContaining({
        key: 'project_state_audit_continuity_arc_stage_rate',
      }),
      expect.objectContaining({
        key: 'project_state_audit_continuity_cue_rate',
      }),
    ]))
    expect(store.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_fully_carried_rate')?.detail).toContain('drift=projectStateAuditDrift')
    expect(store.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_pre_dialogue_awareness_rate')?.detail).toContain('preDialogueAwareness=0.5 (1/2)')
    expect(store.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_continuity_summary_rate')?.detail).toContain('continuitySummary=0.5 (1/2)')
    expect(store.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_continuity_summary_rate')?.detail).toContain('same-her drift boundary')
    expect(store.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_same_her_hold_detail_rate')?.detail).toContain('sameHerHoldDetail=0.5 (1/2)')
    expect(store.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_continuity_arc_stage_rate')?.detail).toContain('continuityArcStage=0.5 (1/2)')
    expect(store.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_continuity_cue_rate')?.detail).toContain('continuityCue=0.5 (1/2)')
  })

  it('routes project-state and briefing drift triage back to the full pre-dialogue same-her boundary chain', () => {
    const store = useAlicizationMindReplayStore()
    store.benchmarkReport = {
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1,
      turnCount: 1,
      telemetryPersisted: false,
      gate: {
        passed: false,
        failingKeys: ['projectStateAuditDrift', 'preDialogueBriefingDrift'],
        dimensions: [] as any,
        standards: {} as any,
      },
      telemetryPatch: null,
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 0,
        persisted: false,
        driftSignals: ['projectStateAuditDrift', 'preDialogueBriefingDrift'],
      },
      quality: [],
      turns: [],
      failingTurns: [],
    } as any

    expect(store.benchmarkRegressionTriageRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dimension: 'projectStateAuditDrift',
        owner: 'runtime continuity',
        firstCheck: expect.stringContaining('same-her drift boundary'),
      }),
      expect.objectContaining({
        dimension: 'preDialogueBriefingDrift',
        owner: 'runtime continuity',
        firstCheck: expect.stringContaining('same-her drift boundary'),
      }),
    ]))
  })

  it('prefers self-authority drift diagnosis when the same-her self line was not fully preserved into rewrite', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 1,
      quality: [],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'pass',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        learningRevisionDiscipline: 'pass',
        domainInternalizationDiscipline: 'pass',
        worldModelValidationDiscipline: 'pass',
        templateLeakage: 'pass',
      },
      gate: {
        passed: false,
        failingKeys: ['sameHerSelfAuthority'],
        dimensions: [{
          key: 'sameHerSelfAuthority',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 0.75,
          passedRatio: 0,
          failingTurnIds: ['turn-self-authority-drift-1'],
        }],
        standards: {
          eraSelectionQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          templateLeakage: 'pass',
        },
      },
      telemetryPatch: {
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [{
        turnId: 'turn-self-authority-drift-1',
        userText: '别让她像是重新变成另一个人',
        failingDimensions: ['sameHerSelfAuthority'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-self-authority-drift-1',
          decisionTraceId: 'mind:self-authority-drift:1',
          sessionId: 'session-self-authority-drift-1',
          activeThreadId: 'thread-self-authority-drift-1',
        },
        sampledCategories: ['dialogue'],
        selfAuthoritySummary: {
          authoritySummary: 'She already knew she was continuing one shared self line.',
          closenessPosture: 'measured-return',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      }],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 1,
        totalCount: 1,
        persisted: true,
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))
    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()

    expect(store.selectedBenchmarkTurn?.diagnosisSummary).toContain('Self-authority drift is still open here')
    expect(store.selectedBenchmarkTurn?.diagnosisSummary).toContain('closeness posture: measured-return')
    expect(store.selectedBenchmarkTurn?.diagnosisSummary).toContain('preserve it into rewrite')
    expect(store.selectedBenchmarkTurn?.diagnosisSummary).toContain('apply it in the final rewrite')
  })

  it('routes pre-dialogue briefing drift toward the project-awareness chain before generic visible realization debugging', async () => {
    const listMindTurnEvents = vi.fn().mockResolvedValue([])
    const listMemoryDecisionTraces = vi.fn().mockResolvedValue([])
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 123,
      turnCount: 1,
      quality: [],
      standards: {} as any,
      gate: {
        passed: false,
        failingKeys: ['preDialogueBriefingDrift'],
        dimensions: [{
          key: 'preDialogueBriefingDrift',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 0.75,
          passedRatio: 0,
          failingTurnIds: ['turn-pre-dialogue-briefing-drift-1'],
        }],
        standards: {} as any,
      },
      telemetryPatch: null,
      telemetryPersisted: true,
      failingTurnSet: [{
        turnId: 'turn-pre-dialogue-briefing-drift-1',
        userText: '先说这个项目现在做到哪了',
        failingDimensions: ['preDialogueBriefingDrift'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-pre-dialogue-briefing-drift-1',
          decisionTraceId: 'mind:pre-dialogue-briefing-drift:1',
          sessionId: 'session-pre-dialogue-briefing-drift-1',
          activeThreadId: 'thread-pre-dialogue-briefing-drift-1',
        },
        sampledCategories: ['dialogue'],
      }],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 1,
        totalCount: 1,
        persisted: true,
        driftSignals: ['preDialogueBriefingDrift'],
        preDialogueBriefingSummary: {
          comparedTurnCount: 1,
          identityHitCount: 0,
          phaseHitCount: 0,
          landedProgressHitCount: 0,
          openLoopHitCount: 0,
          nextClosureHitCount: 0,
          emotionalClosureHitCount: 0,
          fullyBriefedTurnCount: 0,
        },
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
      listMindTurnEvents,
      listMemoryDecisionTraces,
    }))
    const store = useAlicizationMindReplayStore()
    await store.runReplayBenchmark()

    expect(store.benchmarkRegressionTriageRows[0]).toEqual(expect.objectContaining({
      dimension: 'preDialogueBriefingDrift',
      owner: 'runtime continuity',
    }))
    expect(store.benchmarkRegressionTriageRows[0]?.firstCheck).toContain('pre-dialogue')
    expect(store.benchmarkRegressionTriageRows[0]?.firstCheck).toContain('project')
  })
})
