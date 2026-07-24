import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationEpoch1Store } from './alicization-epoch1'

const chatTurnCompleteHooks: Array<(output: any, context: any) => unknown> = []

type LegacyChatTurnContext = {
  message: {
    id: string
    content: string
  }
  sessionId: string
} & {
  preDialogueSendIdentity?: unknown
  preDialogueAwareness?: unknown
  preDialogueClosure?: unknown
}

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
    getProjectStateContinuitySnapshot: vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      continuitySummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi. | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work. | next=Keep extending cross-modal identity-continuity',
      sameHerSelfLine: 'pre_turn_context_digest',
      sameHerDriftRisk: 'If the remembered turn gets flattened into a detached project status shell during async extraction, treat that as identity-continuity',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: null,
        reasonPreview: [
          'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        ],
      },
      preDialogueClosure: null,
      emotionalClosureCue: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-awareness',
      sessionId: 'session-project-awareness',
      origin: 'user-turn',
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
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      latestLandedProgress: 'renderer memory extraction must not be requested',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      projectState: {
        latestLandedProgress: 'renderer memory extraction must not be requested',
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getLatestProjectStateObservation,
      getProjectStateContinuitySnapshot,
      streamChat,
      upsertMemoryFacts,
    }))

    const store = useAlicizationEpoch1Store()
    await store.initialize()
    await store.refreshMemoryStats()
    await Promise.resolve()

    const output = {
      id: 'turn-memory-legacy-pre-dialogue',
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
    const context: LegacyChatTurnContext = {
      message: {
        id: 'user-msg-legacy-pre-dialogue',
        content: '请记住我喜欢把重要事项写进清单',
      },
      sessionId: 'session-legacy-pre-dialogue',
      preDialogueSendIdentity: {
        summaryLine: 'legacy-send-identity-sentinel',
        reasonPreview: ['legacy-send-reason-sentinel'],
      },
      preDialogueAwareness: {
        awarenessLine: 'legacy-awareness-sentinel',
      },
      preDialogueClosure: {
        summaryLine: 'legacy-closure-sentinel',
      },
    }

    for (const hook of chatTurnCompleteHooks)
      await hook({ output, outputText: output.content }, context as any)

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 10)
    await Promise.resolve()

    expect(streamChat).not.toHaveBeenCalled()
    expect(upsertMemoryFacts).not.toHaveBeenCalled()
    expect(getProjectStateContinuitySnapshot).not.toHaveBeenCalled()
    expect(getLatestProjectStateObservation).not.toHaveBeenCalled()
  })
})
