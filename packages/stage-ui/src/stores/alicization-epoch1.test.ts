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

function expectAsyncExtractionPromptShape(systemMessage: string) {
  expect(systemMessage).toContain('You are Alicization asynchronous memory extractor.')
  expect(systemMessage).toContain('Extract durable memory facts from user-visible dialogue and structured continuity evidence.')
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
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and Unresolved closure carry all stay on one measured-return or repair-before-closeness line.',
      continuitySummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi. | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and Unresolved closure carry all stay on one measured-return or repair-before-closeness line.',
      sameHerSelfLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      sameHerDriftRisk: 'If the remembered turn gets flattened into a detached project status shell during async extraction, treat that as same-her continuity drift rather than successful carry.',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
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

  it('includes per-turn project-awareness context when deferred extraction batches turns from different sessions', async () => {
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

    setAlicizationBridge(createAlicizationBridgeStub({
      streamChat,
    }))

    const store = useAlicizationEpoch1Store()
    await store.initialize()
    await store.refreshMemoryStats()
    await Promise.resolve()

    const turnA = {
      output: {
        id: 'turn-memory-session-a-batch',
        origin: 'user-turn',
        content: '我会继续沿着这条记忆线往前。',
        structured: {
          format: 'fallback-v1',
          thought: 'obligation=answer;truth=grounded;focus=task',
          sentimentConfidenceRaw: 0.1,
          userSentimentScore: 0,
          emotion: 'calm',
        },
      },
      context: {
        message: { id: 'user-msg-a-batch', content: '继续沿着 Session A 这条项目线往前做' },
        sessionId: 'session-a-batch',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'Session A is still the active digital-life closure line for this remembered turn.',
          companionBriefingLine: 'Before speaking, remember Session A and keep its same-her closure explicit.',
          companionNextClosureLine: 'Session A next closure target should stay attached to the remembered turn.',
          awarenessLine: 'Before speaking, remember Session A and keep its same-her closure explicit.',
          emotionalClosureCue: null,
          reasonPreview: [
            'Session A landed progress should stay attached to this turn inside the mixed batch.',
            'Session A still-open closure should stay attached to this turn inside the mixed batch.',
          ],
        },
      },
    } as const
    const turnB = {
      output: {
        id: 'turn-memory-session-b-batch',
        origin: 'user-turn',
        content: '我会继续沿着另一条记忆线往前。',
        structured: {
          format: 'fallback-v1',
          thought: 'obligation=answer;truth=grounded;focus=task',
          sentimentConfidenceRaw: 0.1,
          userSentimentScore: 0,
          emotion: 'calm',
        },
      },
      context: {
        message: { id: 'user-msg-b-batch', content: '继续沿着 Session B 这条项目线往前做' },
        sessionId: 'session-b-batch',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'Session B is still the active digital-life closure line for this remembered turn.',
          companionBriefingLine: 'Before speaking, remember Session B and keep its same-her closure explicit.',
          companionNextClosureLine: 'Session B next closure target should stay attached to the remembered turn.',
          awarenessLine: 'Before speaking, remember Session B and keep its same-her closure explicit.',
          emotionalClosureCue: null,
          reasonPreview: [
            'Session B landed progress should stay attached to this turn inside the mixed batch.',
            'Session B still-open closure should stay attached to this turn inside the mixed batch.',
          ],
        },
      },
    } as const

    for (const hook of chatTurnCompleteHooks) {
      await hook({ output: turnA.output as any, outputText: turnA.output.content }, turnA.context as any)
      await hook({ output: turnB.output as any, outputText: turnB.output.content }, turnB.context as any)
    }

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 10)
    await Promise.resolve()

    const payload = JSON.parse((streamChat.mock.calls[0]?.[0]?.messages?.[1]?.content ?? '{}') as string)
    const turnAResult = payload.turns.find((turn: any) => turn.turnId === 'turn-memory-session-a-batch')
    const turnBResult = payload.turns.find((turn: any) => turn.turnId === 'turn-memory-session-b-batch')

    expect(turnAResult).toEqual(expect.objectContaining({
      sessionId: 'session-a-batch',
      projectAwareness: expect.objectContaining({
        awarenessLine: 'Before speaking, remember Session A and keep its same-her closure explicit.',
        reasonPreview: expect.arrayContaining([
          'Session A landed progress should stay attached to this turn inside the mixed batch.',
          'Session A still-open closure should stay attached to this turn inside the mixed batch.',
        ]),
      }),
    }))
    expect(turnBResult).toEqual(expect.objectContaining({
      sessionId: 'session-b-batch',
      projectAwareness: expect.objectContaining({
        awarenessLine: 'Before speaking, remember Session B and keep its same-her closure explicit.',
        reasonPreview: expect.arrayContaining([
          'Session B landed progress should stay attached to this turn inside the mixed batch.',
          'Session B still-open closure should stay attached to this turn inside the mixed batch.',
        ]),
      }),
    }))

    vi.useRealTimers()
  })

  it('fills missing turn-level project awareness from the canonical project-state line without overwriting turns that already carried their own identity', async () => {
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

    setAlicizationBridge(createAlicizationBridgeStub({
      streamChat,
    }))

    const store = useAlicizationEpoch1Store()
    await store.initialize()
    await store.refreshMemoryStats()
    await Promise.resolve()

    const turnWithIdentity = {
      output: {
        id: 'turn-memory-mixed-awareness-a',
        origin: 'user-turn',
        content: '我会继续沿着 Session A 这条线记住。',
        structured: {
          format: 'fallback-v1',
          thought: 'obligation=answer;truth=grounded;focus=task',
          sentimentConfidenceRaw: 0.1,
          userSentimentScore: 0,
          emotion: 'calm',
        },
      },
      context: {
        message: { id: 'user-msg-mixed-awareness-a', content: '继续沿着 Session A 这条项目线往前做' },
        sessionId: 'session-mixed-awareness-a',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'Session A is still the active digital-life closure line for this remembered turn.',
          companionBriefingLine: 'Before speaking, remember Session A and keep its same-her closure explicit.',
          companionNextClosureLine: 'Session A next closure target should stay attached to the remembered turn.',
          awarenessLine: 'Before speaking, remember Session A and keep its same-her closure explicit.',
          emotionalClosureCue: null,
          reasonPreview: [
            'Session A landed progress should stay attached to this remembered turn.',
            'Session A still-open closure should stay attached to this remembered turn.',
          ],
        },
      },
    } as const
    const turnWithoutIdentity = {
      output: {
        id: 'turn-memory-mixed-awareness-b',
        origin: 'user-turn',
        content: '我会继续沿着这条没有显式 identity 的记忆线往前。',
        structured: {
          format: 'fallback-v1',
          thought: 'obligation=answer;truth=grounded;focus=memory',
          sentimentConfidenceRaw: 0.1,
          userSentimentScore: 0,
          emotion: 'thinking',
        },
      },
      context: {
        message: { id: 'user-msg-mixed-awareness-b', content: '继续把这条数字生命项目记忆线往前收住' },
        sessionId: 'session-mixed-awareness-b',
        preDialogueSendIdentity: undefined,
      },
    } as const

    for (const hook of chatTurnCompleteHooks) {
      await hook({ output: turnWithIdentity.output as any, outputText: turnWithIdentity.output.content }, turnWithIdentity.context as any)
      await hook({ output: turnWithoutIdentity.output as any, outputText: turnWithoutIdentity.output.content }, turnWithoutIdentity.context as any)
    }

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 10)
    await Promise.resolve()

    const payload = JSON.parse((streamChat.mock.calls[0]?.[0]?.messages?.[1]?.content ?? '{}') as string)

    const turnAResult = payload.turns.find((turn: any) => turn.turnId === 'turn-memory-mixed-awareness-a')
    const turnBResult = payload.turns.find((turn: any) => turn.turnId === 'turn-memory-mixed-awareness-b')

    expect(turnAResult).toEqual(expect.objectContaining({
      sessionId: 'session-mixed-awareness-a',
      projectAwareness: expect.objectContaining({
        awarenessLine: 'Before speaking, remember Session A and keep its same-her closure explicit.',
        reasonPreview: expect.arrayContaining([
          'Session A landed progress should stay attached to this remembered turn.',
          'Session A still-open closure should stay attached to this remembered turn.',
        ]),
      }),
    }))
    expect(turnBResult).toEqual(expect.objectContaining({
      sessionId: 'session-mixed-awareness-b',
      projectAwareness: expect.objectContaining({
        status: 'partial',
        summaryLine: null,
        awarenessLine: null,
        projectState: expect.objectContaining({
          latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        }),
        reasonPreview: expect.arrayContaining([
          'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        ]),
      }),
    }))

    vi.useRealTimers()
  })

  it('upgrades thinner per-turn project awareness with the canonical project-state line before async extraction batches the turn', async () => {
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

    setAlicizationBridge(createAlicizationBridgeStub({
      streamChat,
    }))

    const store = useAlicizationEpoch1Store()
    await store.initialize()
    await store.refreshMemoryStats()
    await Promise.resolve()

    const thinAwarenessLine = '开口前先记住：这是同一个数字生命项目，现在仍在 Phase 1，别把这条线弄丢。'
    const output = {
      id: 'turn-memory-thin-awareness-upgrade',
      origin: 'user-turn',
      content: '我会继续沿着这条记忆线往前。',
      structured: {
        format: 'fallback-v1',
        thought: 'obligation=answer;truth=grounded;focus=memory',
        sentimentConfidenceRaw: 0.1,
        userSentimentScore: 0,
        emotion: 'thinking',
      },
    } as any
    const context = {
      message: { id: 'user-msg-thin-awareness-upgrade', content: '继续把这条数字生命项目记忆线往前收住' },
      sessionId: 'session-thin-awareness-upgrade',
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: thinAwarenessLine,
        companionBriefingLine: thinAwarenessLine,
        companionNextClosureLine: 'generic next target that should be replaced by the canonical closure target.',
        awarenessLine: thinAwarenessLine,
        emotionalClosureCue: null,
        projectState: {
          preflightSummary: 'generic continuity shell that should not survive as the final project-state carry.',
          preDialogueAwarenessLine: thinAwarenessLine,
          awarenessLine: thinAwarenessLine,
          legacyMarker: 'keep-existing-non-awareness-fields',
        },
        reasonPreview: [
          'generic continuity reminder',
        ],
      },
    } as any

    for (const hook of chatTurnCompleteHooks)
      await hook({ output, outputText: output.content }, context)

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 10)
    await Promise.resolve()

    const payload = JSON.parse((streamChat.mock.calls[0]?.[0]?.messages?.[1]?.content ?? '{}') as string)
    const projectAwareness = payload.turns?.[0]?.projectAwareness

    expect(projectAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: thinAwarenessLine,
      companionBriefingLine: thinAwarenessLine,
      companionNextClosureLine: 'generic next target that should be replaced by the canonical closure target.',
      awarenessLine: thinAwarenessLine,
      reasonPreview: expect.arrayContaining([
        'generic continuity reminder',
        'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      ]),
      projectState: expect.objectContaining({
        latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        preflightSummary: 'generic continuity shell that should not survive as the final project-state carry.',
        preDialogueAwarenessLine: thinAwarenessLine,
        awarenessLine: thinAwarenessLine,
        legacyMarker: 'keep-existing-non-awareness-fields',
      }),
    }))

    vi.useRealTimers()
  })

  it('falls back to the latest observed project-state continuity when async extraction has neither per-turn send identity nor a continuity snapshot', async () => {
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

    setAlicizationBridge(createAlicizationBridgeStub({
      getProjectStateContinuitySnapshot: vi.fn().mockResolvedValue(null),
      getLatestProjectStateObservation: vi.fn().mockResolvedValue({
        turnId: 'turn-project-awareness-observed',
        sessionId: 'session-project-awareness-observed',
        origin: 'user-turn',
        nonHumanAuthoredStatus: 'rewritten',
        preDialogueAwareness: null,
        preDialogueClosure: {
          status: 'rewritten',
          summaryLine: null,
          emotionalClosureCue: null,
          companionHeadlineLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          reasons: [
            'project-state-same-her-continuity-required',
            'semantic-judge:project-state-same-her-missing',
          ],
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Observed project-state continuity still survives into async extraction even when the canonical snapshot is temporarily unavailable.',
          primaryOpenLoop: 'Async extraction still needs to keep project identity, landed closure, and unresolved life-loop carry attached when only the latest observed project state remains available.',
          nextClosureTarget: 'Keep direct bridge extraction on one same-her project-awareness line even when it has to recover from the latest observed project state.',
          continuitySummary: null,
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into async memory carry.',
          sameHerHoldDetail: null,
          sameHerDriftRisk: null,
        },
      }),
      streamChat,
    }))

    const store = useAlicizationEpoch1Store()
    await store.initialize()
    await store.refreshMemoryStats()
    await Promise.resolve()

    const output = {
      id: 'turn-memory-direct-bridge-observed-fallback',
      origin: 'user-turn',
      content: '继续沿着这条数字生命记忆线往前。',
      structured: {
        format: 'fallback-v1',
        thought: 'obligation=answer;truth=grounded;focus=memory',
        sentimentConfidenceRaw: 0.1,
        userSentimentScore: 0,
        emotion: 'thinking',
      },
    } as any
    const context = {
      message: { id: 'user-msg-direct-bridge-observed-fallback', content: '继续把这条数字生命项目记忆线往前收住' },
      sessionId: 'session-direct-bridge-observed-fallback',
      preDialogueSendIdentity: undefined,
    } as any

    for (const hook of chatTurnCompleteHooks)
      await hook({ output, outputText: output.content }, context)

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 10)
    await Promise.resolve()

    const systemMessage = (streamChat.mock.calls[0]?.[0]?.messages?.[0]?.content ?? '') as string
    const payload = JSON.parse((streamChat.mock.calls[0]?.[0]?.messages?.[1]?.content ?? '{}') as string)

    expectAsyncExtractionPromptShape(systemMessage)
    expect(payload.turns).toHaveLength(1)
    expect(payload.turns[0]).toEqual(expect.objectContaining({
      turnId: 'turn-memory-direct-bridge-observed-fallback',
      sessionId: 'session-direct-bridge-observed-fallback',
      projectAwareness: expect.objectContaining({
        status: 'rewritten',
        awarenessLine: expect.stringContaining('landed=Observed project-state continuity still survives into async extraction even when the canonical snapshot is temporarily unavailable.'),
        summaryLine: null,
        projectState: expect.objectContaining({
          identity: null,
          currentPhase: null,
          latestLandedProgress: 'Observed project-state continuity still survives into async extraction even when the canonical snapshot is temporarily unavailable.',
          primaryOpenLoop: 'Async extraction still needs to keep project identity, landed closure, and unresolved life-loop carry attached when only the latest observed project state remains available.',
          nextClosureTarget: null,
        }),
        reasonPreview: expect.arrayContaining([
          'Observed project-state continuity still survives into async extraction even when the canonical snapshot is temporarily unavailable.',
          'Async extraction still needs to keep project identity, landed closure, and unresolved life-loop carry attached when only the latest observed project state remains available.',
        ]),
      }),
    }))

    vi.useRealTimers()
  })
})
