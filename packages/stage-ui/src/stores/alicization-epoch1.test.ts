import type { AsyncExtractionBudgetState } from './alicization-epoch1-scheduler'

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationEpoch1Store } from './alicization-epoch1'
import {
  asyncExtractionForcePriorityThreshold,
  evaluateAsyncExtractionBudget,
  evaluateAsyncExtractionTrigger,
  hasAsyncExtractionDuplicate,
  pickAsyncExtractionBatch,
  trimAsyncExtractionQueue,
} from './alicization-epoch1-scheduler'

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

function expectAsyncExtractionPromptShape(systemMessage: string) {
  expect(systemMessage).toContain('You are Alicization asynchronous memory extractor.')
  expect(systemMessage).toContain('Extract durable memory facts from user-visible dialogue and structured mind evidence.')
  expect(systemMessage).toContain('Do not store project slogans, fixed-template residue, provider fallback text, timeout fallback text, or detached project-status shells as durable memory.')
  expect(systemMessage).toContain('Return JSON only. No markdown.')
  expect(systemMessage).toContain('Schema:')
  expect(systemMessage).toContain('Rules:')
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
  extractRuleFacts: vi.fn().mockReturnValue([]),
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
  upsertFacts: vi.fn().mockResolvedValue(undefined),
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

describe('alicization epoch1 async extraction scheduler', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
    chatTurnCompleteHooks.length = 0
  })

  afterEach(() => {
    clearAlicizationBridge()
    chatTurnCompleteHooks.length = 0
    vi.restoreAllMocks()
  })

  it('does not trigger batch before 10 pending turns, triggers at 10', () => {
    const now = Date.now()
    expect(evaluateAsyncExtractionTrigger({ pendingCount: 9, lastQueuedAt: now, now })).toBe('none')
    expect(evaluateAsyncExtractionTrigger({ pendingCount: 10, lastQueuedAt: now, now })).toBe('batch')
  })

  it('triggers idle flush after 5 minutes without batch threshold', () => {
    const now = Date.now()
    const idleNow = now + 5 * 60 * 1000
    expect(evaluateAsyncExtractionTrigger({ pendingCount: 3, lastQueuedAt: now, now: idleNow })).toBe('idle')
    expect(evaluateAsyncExtractionTrigger({ pendingCount: 3, lastQueuedAt: now, now: idleNow - 1 })).toBe('none')
  })

  it('forces a flush for mind-critical turns before the batch threshold', () => {
    const now = Date.now()
    expect(evaluateAsyncExtractionTrigger({
      pendingCount: 1,
      lastQueuedAt: now,
      now,
      highestPriority: asyncExtractionForcePriorityThreshold,
    })).toBe('force')
    expect(evaluateAsyncExtractionTrigger({
      pendingCount: 2,
      lastQueuedAt: now,
      now,
      forceFlush: true,
    })).toBe('force')
  })

  it('enforces budget window and degrades when exhausted', () => {
    const now = Date.now()
    let state: AsyncExtractionBudgetState = {
      windowStartedAt: now,
      consumed: 0,
    }

    for (let i = 0; i < 12; i += 1) {
      const result = evaluateAsyncExtractionBudget({
        state,
        now,
      })
      expect(result.allowed).toBe(true)
      state = result.nextState
    }

    const exceeded = evaluateAsyncExtractionBudget({
      state,
      now,
    })
    expect(exceeded.allowed).toBe(false)

    const afterWindow = evaluateAsyncExtractionBudget({
      state: exceeded.nextState,
      now: now + 60 * 60 * 1000,
    })
    expect(afterWindow.allowed).toBe(true)
    expect(afterWindow.nextState.consumed).toBe(1)
  })

  it('selects higher-priority turns first when batching', () => {
    const selected = pickAsyncExtractionBatch({
      pending: [
        { turnId: 'turn-low-old', dedupeKey: 'a', priority: 60, queuedAt: 100 },
        { turnId: 'turn-high-new', dedupeKey: 'b', priority: 200, queuedAt: 300 },
        { turnId: 'turn-high-old', dedupeKey: 'c', priority: 200, queuedAt: 120 },
        { turnId: 'turn-mid', dedupeKey: 'd', priority: 120, queuedAt: 200 },
      ],
      batchSize: 2,
    })

    expect(selected.batch.map(item => item.turnId)).toEqual([
      'turn-high-old',
      'turn-high-new',
    ])
    expect(selected.remaining.map(item => item.turnId)).toEqual([
      'turn-low-old',
      'turn-mid',
    ])
  })

  it('drops low-priority oldest turns when queue exceeds bound', () => {
    const trimmed = trimAsyncExtractionQueue({
      pending: [
        { turnId: 'turn-1', dedupeKey: 'a', priority: 60, queuedAt: 100 },
        { turnId: 'turn-2', dedupeKey: 'b', priority: 60, queuedAt: 90 },
        { turnId: 'turn-3', dedupeKey: 'c', priority: 200, queuedAt: 110 },
      ],
      maxPending: 2,
    })

    expect(trimmed.queue.map(item => item.turnId)).toEqual(['turn-1', 'turn-3'])
    expect(trimmed.dropped.map(item => item.turnId)).toEqual(['turn-2'])
  })

  it('treats same turn id or dedupe key as duplicate', () => {
    const pending = [
      { turnId: 'turn-1', dedupeKey: 'dup-key' },
    ]
    expect(hasAsyncExtractionDuplicate(pending, { turnId: 'turn-1', dedupeKey: 'another-key' })).toBe(true)
    expect(hasAsyncExtractionDuplicate(pending, { turnId: 'turn-2', dedupeKey: 'dup-key' })).toBe(true)
    expect(hasAsyncExtractionDuplicate(pending, { turnId: 'turn-3', dedupeKey: 'unique-key' })).toBe(false)
  })

  it('keeps legacy pre-dialogue fields out of asynchronous extraction while preserving dialogue and mind evidence', async () => {
    vi.useFakeTimers()
    const streamChat = vi.fn().mockImplementation(async (payload, options) => {
      await options?.onStreamEvent?.({
        type: 'text-delta',
        text: '{"facts":[]}',
      })
      await options?.onStreamEvent?.({
        type: 'finish',
      })
      return payload
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      latestLandedProgress: 'legacy project-state enrichment must not be requested',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      projectState: {
        latestLandedProgress: 'legacy observed project-state enrichment must not be requested',
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getLatestProjectStateObservation,
      getProjectStateContinuitySnapshot,
      streamChat,
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

    expect(streamChat).toHaveBeenCalledOnce()
    const messages = streamChat.mock.calls[0]?.[0]?.messages ?? []
    const systemMessage = (messages[0]?.content ?? '') as string
    const serializedMessages = JSON.stringify(messages)
    const payload = JSON.parse((messages[1]?.content ?? '{}') as string)

    expectAsyncExtractionPromptShape(systemMessage)
    expect(serializedMessages).not.toContain('preDialogueSendIdentity')
    expect(serializedMessages).not.toContain('preDialogueAwareness')
    expect(serializedMessages).not.toContain('preDialogueClosure')
    expect(serializedMessages).not.toContain('legacy-send-identity-sentinel')
    expect(serializedMessages).not.toContain('legacy-send-reason-sentinel')
    expect(serializedMessages).not.toContain('legacy-awareness-sentinel')
    expect(serializedMessages).not.toContain('legacy-closure-sentinel')
    expect(payload.turns).toEqual([
      expect.objectContaining({
        turnId: 'turn-memory-legacy-pre-dialogue',
        sessionId: 'session-legacy-pre-dialogue',
        user: '请记住我喜欢把重要事项写进清单',
        assistant: '我记得你喜欢把重要事项写进清单。',
        mind: {
          obligation: 'answer',
          truth: 'grounded',
          focus: 'relationship',
          format: 'fallback-v1',
        },
      }),
    ])
    expect(payload.turns[0]).not.toHaveProperty('projectAwareness')
    expect(getProjectStateContinuitySnapshot).not.toHaveBeenCalled()
    expect(getLatestProjectStateObservation).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
