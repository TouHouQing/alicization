import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationEpoch1Store } from './alicization-epoch1'

const chatTurnCompleteHooks: Array<(output: any, context: any) => unknown> = []

vi.mock('./chat', () => ({
  useChatOrchestratorStore: () => ({
    onChatTurnComplete: (hook: (output: any, context: any) => unknown) => {
      chatTurnCompleteHooks.push(hook)
      return () => {
        const index = chatTurnCompleteHooks.indexOf(hook)
        if (index >= 0)
          chatTurnCompleteHooks.splice(index, 1)
      }
    },
  }),
}))

vi.mock('./alicization-memory', () => ({
  getMemoryStats: vi.fn().mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    tierCounts: { hot: 0, warm: 0, cold: 0 },
    pendingSyncCount: 0,
    ingestHealth: {
      status: 'healthy',
      pendingCount: 0,
      failedCount: 0,
      oldestPendingAgeMs: null,
      nextRetryAt: null,
      lastError: null,
    },
    writeHealth: {
      backlogCount: 0,
      retryOldestAgeMs: null,
      nextRetryAt: null,
      blocked: false,
      lastError: null,
    },
    retrievalHealth: {
      semanticLatencyMs: null,
      graphLatencyMs: null,
      reconstructionFrequency: 0,
      reconstructedCount: 0,
      templateLeakageFailCount: 0,
    },
    integrity: null,
    lastPrunedAt: null,
  }),
  runMemoryPrune: vi.fn().mockResolvedValue(undefined),
}))

function createAlicizationBridgeStub(overrides?: Record<string, unknown>) {
  return {
    bootstrap: vi.fn().mockResolvedValue({
      revision: 1,
      content: '',
      body: '',
      frontmatter: {
        host_attitude: '',
        core_incarnation: '',
      },
      needsGenesis: false,
    }),
    getSoul: vi.fn().mockResolvedValue(null),
    initializeGenesis: vi.fn(),
    updateSoul: vi.fn(),
    updatePersonality: vi.fn(),
    getKillSwitchState: vi.fn().mockResolvedValue(null),
    suspendKillSwitch: vi.fn(),
    resumeKillSwitch: vi.fn(),
    getMemoryStats: vi.fn().mockResolvedValue({
      total: 0,
      active: 0,
      archived: 0,
      tierCounts: { hot: 0, warm: 0, cold: 0 },
      pendingSyncCount: 0,
      ingestHealth: {
        status: 'healthy',
        pendingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        nextRetryAt: null,
        lastError: null,
      },
      writeHealth: {
        backlogCount: 0,
        retryOldestAgeMs: null,
        nextRetryAt: null,
        blocked: false,
        lastError: null,
      },
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        templateLeakageFailCount: 0,
      },
      integrity: null,
      lastPrunedAt: null,
    }),
    runMemoryPrune: vi.fn(),
    updateMemoryStats: vi.fn(),
    retrieveMemoryFacts: vi.fn(),
    upsertMemoryFacts: vi.fn().mockResolvedValue(undefined),
    importLegacyMemory: vi.fn(),
    appendConversationTurn: vi.fn().mockResolvedValue(undefined),
    appendAuditLog: vi.fn().mockResolvedValue(undefined),
    getOrganicMemorySnapshot: vi.fn().mockResolvedValue({
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [],
      subconsciousFragments: [],
      episodicEvents: [],
      reminders: [],
      pendingTasks: [],
      sentimentBaseline: null,
      relationshipSignals: [],
      lifecycleStats: null,
      selfEvolution: null,
      affectiveResidue: null,
      recallLatencyPolicy: null,
      derivedMindStateBundle: null,
      memoryStageReplay: null,
      memoryResolutionLedger: null,
      learningExecutionState: null,
      lastDreamedAt: null,
    }),
    getLlmConfig: vi.fn().mockResolvedValue({
      activeProviderId: 'provider-test',
      activeModelId: 'model-test',
      providerCredentials: {
        'provider-test': { apiKey: 'test' },
      },
    }),
    streamChat: vi.fn().mockImplementation(async (_payload, options) => {
      await options?.onStreamEvent?.({
        type: 'text-delta',
        text: '{"facts":[]}',
      })
      await options?.onStreamEvent?.({
        type: 'finish',
      })
    }),
    ...overrides,
  } as any
}

describe('alicization epoch1 runtime hooks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
    chatTurnCompleteHooks.length = 0
  })

  it('starts without a fixed host-attitude fallback', () => {
    const store = useAlicizationEpoch1Store()

    expect(store.organicMemorySnapshot.hostAttitude).toBe('')
  })

  afterEach(() => {
    vi.useRealTimers()
    clearAlicizationBridge()
    chatTurnCompleteHooks.length = 0
    vi.restoreAllMocks()
  })

  it('does not register a second renderer-owned memory extraction loop after a chat turn', async () => {
    vi.useFakeTimers()
    const streamChat = vi.fn()
    const upsertMemoryFacts = vi.fn().mockResolvedValue(undefined)
    setAlicizationBridge(createAlicizationBridgeStub({
      streamChat,
      upsertMemoryFacts,
    }))

    const store = useAlicizationEpoch1Store()
    await store.initialize()
    await store.refreshMemoryStats()
    await Promise.resolve()

    const output = {
      id: 'turn-memory-owner-boundary',
      origin: 'user-turn',
      content: '我记得你喜欢把重要事项写进清单。',
      structured: {
        format: 'fallback-v1',
        thought: 'obligation=answer;truth=grounded;focus=relationship',
        sentimentConfidenceRaw: 0.1,
        userSentimentScore: 0,
        emotion: 'calm',
      },
    } as any
    const context = {
      message: {
        id: 'user-msg-memory-owner-boundary',
        content: '请记住我喜欢把重要事项写进清单',
      },
      sessionId: 'session-memory-owner-boundary',
    }

    for (const hook of chatTurnCompleteHooks)
      await hook({ output, outputText: output.content }, context as any)

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 10)
    await Promise.resolve()

    expect(streamChat).not.toHaveBeenCalled()
    expect(upsertMemoryFacts).not.toHaveBeenCalled()
  })
})
