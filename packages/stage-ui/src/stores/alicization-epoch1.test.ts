import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationEpoch1Store } from './alicization-epoch1'
import { useAlicizationGenesisWorkshopStore } from './alicization-genesis-workshop'

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
  it('reports a rejected persona write and preserves the current committed snapshot', async () => {
    const updateSoul = vi.fn().mockRejectedValue(new Error('SOUL revision mismatch'))
    setAlicizationBridge(createAlicizationBridgeStub({ updateSoul }))
    const store = useAlicizationEpoch1Store()
    await store.initialize()
    const content = store.soul!.content
    await expect(store.updateSoulContent('new content')).rejects.toThrow('SOUL revision mismatch')
    expect(store.soul!.content).toBe(content)
    expect(updateSoul).toHaveBeenCalledWith({ expectedRevision: 1, content: 'new content' })
  })
  it('keeps a newer identity notification when an older bootstrap reply arrives later', async () => {
    const bridge = createAlicizationBridgeStub()
    const snapshot = await bridge.bootstrap()
    const store = useAlicizationEpoch1Store()
    store.setSoulSnapshot({ ...snapshot, soulPath: 'C:/qa/alice/SOUL.md', revision: 4, content: 'current identity' })
    store.setSoulSnapshot({ ...snapshot, soulPath: 'C:/qa/alice/SOUL.md', revision: 2, content: 'old bootstrap' })
    expect(store.soul!.content).toBe('current identity')
    store.setSoulSnapshot({ ...snapshot, soulPath: 'C:/qa/bob/SOUL.md', revision: 1, content: 'another card' })
    expect(store.soul!.content).toBe('another card')
  })
  it('does not let an in-flight initialization roll back an already received persona event', async () => {
    const fixture = await createAlicizationBridgeStub().bootstrap()
    let release!: (snapshot: typeof fixture) => void
    const pending = new Promise<typeof fixture>((resolve) => { release = resolve })
    const bootstrap = vi.fn(() => pending)
    setAlicizationBridge(createAlicizationBridgeStub({ bootstrap }))
    const store = useAlicizationEpoch1Store()
    const initializing = store.initialize()
    await vi.waitFor(() => expect(bootstrap).toHaveBeenCalled())
    store.setSoulSnapshot({ ...fixture, soulPath: 'C:/qa/alice/SOUL.md', revision: 6, content: 'committed current' })
    release({ ...fixture, soulPath: 'C:/qa/alice/SOUL.md', revision: 2, content: 'late bootstrap' })
    await initializing
    expect(store.soul!.content).toBe('committed current')
  })

  it('rejects persona initialization when the desktop bridge is missing', async () => {
    const workshop = useAlicizationGenesisWorkshopStore()
    workshop.identity = { alicizationName: 'Alice', hostName: 'Host' }
    const store = useAlicizationEpoch1Store()
    await expect(store.initializeGenesis(workshop.buildGenesisPayload())).rejects.toThrow('desktop runtime is not connected')
  })

  afterEach(() => {
    vi.useRealTimers()
    clearAlicizationBridge()
    chatTurnCompleteHooks.length = 0
    vi.restoreAllMocks()
  })

  it.each([
    ['我的猫去世了，我好难过', 'sad', -0.95],
    ['今天升职了，开心极了', 'happy', 0.95],
    ['你做得很好，谢谢你陪着我', 'happy', 0.9],
    ['你刚才的回答让我很生气', 'concerned', -0.9],
  ])('preserves enduring personality while recording emotion: %s', async (userText, emotion, score) => {
    const bridge = createAlicizationBridgeStub()
    setAlicizationBridge(bridge)
    const store = useAlicizationEpoch1Store()
    await store.initialize()
    const committed = store.soul
    for (const hook of chatTurnCompleteHooks) {
      await hook({ output: { id: 'mood', content: '我陪着你。', structured: { reply: '我陪着你。', emotion, userSentimentScore: score, sentimentConfidenceRaw: 0.98 } } }, { message: { content: userText }, sessionId: 'qa' })
    }
    expect(bridge.updatePersonality).not.toHaveBeenCalled()
    expect(store.soul).toEqual(committed)
    expect(bridge.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({ category: 'emotion' }))
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
