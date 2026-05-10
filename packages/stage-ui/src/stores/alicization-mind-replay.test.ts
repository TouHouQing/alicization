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
})
