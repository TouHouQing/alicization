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
    getMemoryStats: vi.fn(),
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
    const runReplayBenchmark = vi.fn().mockResolvedValue({
      packId: 'default-humanlike-memory-v1',
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
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      runReplayBenchmark,
    }))

    const store = useAlicizationMindReplayStore()
    const result = await store.runReplayBenchmark()

    expect(runReplayBenchmark).toBeCalledWith({
      packId: 'default-humanlike-memory-v1',
      persistTelemetry: undefined,
    })
    expect(store.benchmarkSupported).toBe(true)
    expect(store.benchmarkReport).toEqual(result)
  })
})
