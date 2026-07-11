import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.stubGlobal('navigator', {
  locks: {
    request: vi.fn(async (_name: string, callback: () => Promise<void> | void) => await callback()),
  },
})

const mocks = vi.hoisted(() => {
  const eventListeners = new Map<string, Array<(event: any) => void | Promise<void>>>()
  const broadcastContextPostMock = vi.fn()
  const broadcastStreamPostMock = vi.fn()
  let broadcastChannelCallCount = 0
  const chatHooks = {
    onBeforeSend: [] as Array<(message: string, context: any) => Promise<void>>,
    onAssistantMessage: [] as Array<(message: any, messageText: string, context: any) => Promise<void>>,
    onToolCall: [] as Array<(toolCall: any, context: any) => Promise<void>>,
    onChatTurnComplete: [] as Array<(chat: any, context: any) => Promise<void>>,
  }

  return {
    sendMock: vi.fn(),
    ingestMock: vi.fn(),
    getProviderConfigMock: vi.fn(() => ({ apiKey: 'test-key' })),
    getProviderInstanceMock: vi.fn(async () => ({ chat: () => ({}) })),
    eventListeners,
    broadcastContextPostMock,
    broadcastStreamPostMock,
    getNextBroadcastPostMock: () => {
      const next = broadcastChannelCallCount === 0
        ? broadcastContextPostMock
        : broadcastStreamPostMock
      broadcastChannelCallCount += 1
      return next
    },
    resetBroadcastMocks: () => {
      broadcastChannelCallCount = 0
      broadcastContextPostMock.mockReset()
      broadcastStreamPostMock.mockReset()
    },
    chatHooks,
  }
})

const activeProvider = ref('mock-provider')
const activeModel = ref('mock-model')
const projectStateContinuitySnapshotRef = ref<any>(null)
const preDialogueClosureSnapshotRef = ref<any>(null)
const preDialogueAwarenessSnapshotRef = ref<any>(null)
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

function createProjectStateSnapshot() {
  return {
    identity: 'Alicization is a local-first digital life project that keeps one continuous desktop persona.',
    currentPhase: 'Phase 1: Local Digital Life. The desktop runtime is the primary proving ground.',
    latestLandedProgress: 'Context-bridge input:text ingestion preserves explicit project awareness before remote turns open outward.',
    primaryOpenLoop: 'Initiative and embodiment still need stronger closure under real desktop use.',
    nextClosureTarget: 'Keep the project brief alive before context-recall widens outward.',
    continuitySummary: 'Context bridge still remembers the current Phase 1 line before dispatch.',
    sameHerSelfLine: 'Phase 1 desktop continuity stays on one living line.',
    emotionalClosureCue: 'Keep the return low-pressure and avoid reopening from scratch.',
    preDialogueAwareness: null,
    preDialogueClosure: null,
    nonHumanAuthoredStatus: null,
    turnId: 'context-bridge-turn-1',
    sessionId: 'context-bridge-session-1',
    origin: 'context-recall',
  }
}

function createPreDialogueIdentity(overrides: Record<string, any> = {}) {
  return {
    status: 'partial',
    summaryLine: 'Phase 1 desktop continuity is still carrying into this turn.',
    companionBriefingLine: 'Keep the current project state, what landed, and the open loop in view before speaking.',
    companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one line.',
    awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
    reasonPreview: ['renderer-prep', 'phase-1-continuity'],
    ...overrides,
  }
}

vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue')
  return {
    useBroadcastChannel: () => ({
      post: mocks.getNextBroadcastPostMock(),
      data: ref(undefined),
    }),
  }
})

vi.mock('../../chat', () => ({
  useChatOrchestratorStore: () => ({
    ingest: mocks.ingestMock,
    sending: false,
    emitBeforeMessageComposedHooks: vi.fn(),
    emitAfterMessageComposedHooks: vi.fn(),
    emitBeforeSendHooks: vi.fn(),
    emitAfterSendHooks: vi.fn(),
    emitTokenLiteralHooks: vi.fn(),
    emitTokenSpecialHooks: vi.fn(),
    emitStreamEndHooks: vi.fn(),
    emitAssistantResponseEndHooks: vi.fn(),
    onBeforeMessageComposed: vi.fn(() => () => {}),
    onAfterMessageComposed: vi.fn(() => () => {}),
    onBeforeSend: vi.fn((handler) => {
      mocks.chatHooks.onBeforeSend.push(handler)
      return () => {}
    }),
    onAfterSend: vi.fn(() => () => {}),
    onTokenLiteral: vi.fn(() => () => {}),
    onTokenSpecial: vi.fn(() => () => {}),
    onStreamEnd: vi.fn(() => () => {}),
    onAssistantResponseEnd: vi.fn(() => () => {}),
    onAssistantMessage: vi.fn((handler) => {
      mocks.chatHooks.onAssistantMessage.push(handler)
      return () => {}
    }),
    onToolCall: vi.fn((handler) => {
      mocks.chatHooks.onToolCall.push(handler)
      return () => {}
    }),
    onChatTurnComplete: vi.fn((handler) => {
      mocks.chatHooks.onChatTurnComplete.push(handler)
      return () => {}
    }),
  }),
}))

vi.mock('../../chat/session-store', () => ({
  useChatSessionStore: () => ({
    activeSessionId: 'session-test',
    getSessionGenerationValue: vi.fn(() => 0),
  }),
}))

vi.mock('../../chat/stream-store', () => ({
  useChatStreamStore: () => ({
    beginStream: vi.fn(),
    appendStreamLiteral: vi.fn(),
    finalizeStream: vi.fn(),
  }),
}))

vi.mock('../../chat/context-store', () => ({
  useChatContextStore: () => ({
    ingestContextMessage: vi.fn(),
  }),
}))

vi.mock('../../modules/consciousness', () => ({
  useConsciousnessStore: () => ({
    activeProvider,
    activeModel,
  }),
}))

vi.mock('../../alicization-self-evolution-inspector', () => ({
  useAlicizationSelfEvolutionInspectorStore: () => ({
    projectStateContinuitySnapshot: projectStateContinuitySnapshotRef,
    preDialogueClosureSnapshot: preDialogueClosureSnapshotRef,
    preDialogueAwarenessSnapshot: preDialogueAwarenessSnapshotRef,
  }),
}))

vi.mock('../../providers', () => ({
  useProvidersStore: () => ({
    getProviderConfig: mocks.getProviderConfigMock,
    getProviderInstance: mocks.getProviderInstanceMock,
  }),
}))

vi.mock('./channel-server', () => ({
  useModsServerChannelStore: () => ({
    send: mocks.sendMock,
    onContextUpdate: vi.fn(() => () => {}),
    onEvent: vi.fn((type: string, handler: (event: any) => void | Promise<void>) => {
      const listeners = mocks.eventListeners.get(type) ?? []
      listeners.push(handler)
      mocks.eventListeners.set(type, listeners)
      return () => {}
    }),
  }),
}))

describe('context bridge store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.sendMock.mockReset()
    mocks.ingestMock.mockReset()
    mocks.getProviderConfigMock.mockClear()
    mocks.getProviderInstanceMock.mockClear()
    mocks.resetBroadcastMocks()
    mocks.eventListeners.clear()
    mocks.chatHooks.onBeforeSend.length = 0
    mocks.chatHooks.onAssistantMessage.length = 0
    mocks.chatHooks.onToolCall.length = 0
    mocks.chatHooks.onChatTurnComplete.length = 0
    consoleErrorSpy.mockClear()
    projectStateContinuitySnapshotRef.value = createProjectStateSnapshot()
    preDialogueAwarenessSnapshotRef.value = createPreDialogueIdentity({
      summaryLine: 'Phase 1 desktop continuity is still settling before this context-recall turn opens outward.',
      companionBriefingLine: 'Keep the current project state, what landed, and the open loop in view before speaking.',
      companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one line.',
      awarenessLine: 'Keep the project explicit before context-recall widens outward.',
      reasonPreview: ['context-recall', 'generic-shell-regression'],
    })
    preDialogueClosureSnapshotRef.value = createPreDialogueIdentity({
      summaryLine: 'Context bridge continuity still needs one more closure pass.',
      companionHeadlineLine: 'The context bridge line still needs measured-return care.',
      companionBriefingLine: 'Hold the project, the phase, and the open loop together before context-recall sends outward.',
      companionNextClosureLine: 'Keep extending the context bridge carry without reopening from scratch.',
      emotionalClosureCue: 'Keep the return low-pressure while the line is still settling.',
      briefingLines: [],
      reasons: ['context-bridge-regression'],
    })
  })

  it('forwards pre-dialogue project awareness through outgoing tool-call, chat message, and complete server events', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const assistantMessageHook = mocks.chatHooks.onAssistantMessage[0]
    const toolCallHook = mocks.chatHooks.onToolCall[0]
    const completeHook = mocks.chatHooks.onChatTurnComplete[0]
    expect(assistantMessageHook).toBeTypeOf('function')
    expect(toolCallHook).toBeTypeOf('function')
    expect(completeHook).toBeTypeOf('function')

    const context = {
      message: {
        role: 'user',
        content: '继续把数字生命主线收住',
      },
      composedMessage: [{ role: 'user', content: '继续把数字生命主线收住' }],
      contexts: {},
      input: {
        type: 'input:text',
        data: {
          text: '继续把数字生命主线收住',
        },
      },
      preDialogueSendIdentity: createPreDialogueIdentity({
        summaryLine: 'Phase 1 desktop continuity is still carrying before this turn opens outward.',
        companionBriefingLine: 'Keep this project, what landed, and the open loop in view before speaking.',
        companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one line.',
        reasonPreview: ['renderer-prep', 'phase-1-continuity', 'turn-open-regression'],
      }),
    }

    const toolCall = {
      role: 'tool',
      content: '读取桌面执行状态',
      tool_call_id: 'tool-call-1',
      toolName: 'executor_run_codex',
    }

    await toolCallHook?.(toolCall, context)

    await assistantMessageHook?.({
      role: 'assistant',
      content: '继续沿着这条数字生命主线推进。',
      slices: [],
      tool_results: [],
    }, '继续沿着这条数字生命主线推进。', context)

    await completeHook?.({
      output: {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        slices: [],
        tool_results: [],
      },
      outputText: '继续沿着这条数字生命主线推进。',
      toolCalls: [toolCall],
    }, context)

    const toolCallEvent = mocks.sendMock.mock.calls.find(call => call[0]?.type === 'output:gen-ai:chat:tool-call')?.[0]
    const messageEvent = mocks.sendMock.mock.calls.find(call => call[0]?.type === 'output:gen-ai:chat:message')?.[0]
    const completeEvent = mocks.sendMock.mock.calls.find(call => call[0]?.type === 'output:gen-ai:chat:complete')?.[0]

    expect(toolCallEvent?.data?.toolCalls).toEqual([toolCall])
    expect(toolCallEvent?.data?.['gen-ai:chat']?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)
    expect(messageEvent?.data?.['gen-ai:chat']?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)
    expect(completeEvent?.data?.toolCalls).toEqual([toolCall])
    expect(completeEvent?.data?.['gen-ai:chat']?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)
    expect(toolCallEvent?.data?.['gen-ai:chat']?.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      'renderer-prep',
      'phase-1-continuity',
    ]))
  }, 15_000)

  it('broadcasts tool-call and assistant-message stream events with pre-dialogue project awareness for remote observers', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const assistantMessageHook = mocks.chatHooks.onAssistantMessage[0]
    const toolCallHook = mocks.chatHooks.onToolCall[0]
    expect(assistantMessageHook).toBeTypeOf('function')
    expect(toolCallHook).toBeTypeOf('function')

    const context = {
      message: {
        role: 'user',
        content: '继续把数字生命执行闭环收紧',
      },
      composedMessage: [{ role: 'user', content: '继续把数字生命执行闭环收紧' }],
      contexts: {},
      input: {
        type: 'input:text',
        data: {
          text: '继续把数字生命执行闭环收紧',
        },
      },
      preDialogueSendIdentity: createPreDialogueIdentity({
        summaryLine: 'Phase 1 desktop continuity is still closing before this turn opens outward.',
        companionBriefingLine: 'Keep this project, what landed, and the open loop in view before speaking.',
        companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one line.',
        reasonPreview: ['renderer-prep', 'phase-1-continuity', 'remote-observer-regression'],
      }),
    }

    const toolCall = {
      toolCallId: 'tool-broadcast-1',
      toolName: 'executor_run_cli',
      arguments: {
        command: 'ls',
        args: ['~/Desktop'],
      },
    }

    await toolCallHook?.(toolCall, context)
    await assistantMessageHook?.({
      role: 'assistant',
      content: '我先看一下桌面当前状态。',
      slices: [],
      tool_results: [],
    }, '我先看一下桌面当前状态。', context)

    const toolCallBroadcast = mocks.broadcastStreamPostMock.mock.calls.find(call => call[0]?.type === 'tool-call')?.[0]
    const assistantMessageBroadcast = mocks.broadcastStreamPostMock.mock.calls.find(call => call[0]?.type === 'assistant-message')?.[0]

    expect(toolCallBroadcast?.toolCall).toEqual(toolCall)
    expect(toolCallBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)
    expect(assistantMessageBroadcast?.messageText).toBe('我先看一下桌面当前状态。')
    expect(assistantMessageBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)
    expect(toolCallBroadcast?.context?.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      'renderer-prep',
      'phase-1-continuity',
    ]))
  }, 15_000)

  it('sanitizes remote-observer broadcast payloads into structured-clone-safe data before cross-window fanout', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const assistantMessageHook = mocks.chatHooks.onAssistantMessage[0]
    expect(assistantMessageHook).toBeTypeOf('function')

    const rawPreDialogueSendIdentity = {
      status: 'partial',
      summaryLine: 'Phase 1 desktop continuity is still carrying before this observer broadcast fans out.',
      companionBriefingLine: 'Keep the current line explicit before remote observers mirror this turn.',
      companionNextClosureLine: 'Keep embodiment, speech, and chat continuity on one line.',
      awarenessLine: 'This remote observer broadcast should still stay on the same quiet line.',
      reasonPreview: ['observer-fanout', 'quiet-companionship'],
    }
    const proxiedPreDialogueSendIdentity = new Proxy(rawPreDialogueSendIdentity, {})

    const context: any = {
      message: new Proxy({
        role: 'user',
        content: '继续沿着同一个数字生命主线往前走',
        createdAt: new Date('2026-06-11T12:00:00.000Z'),
        runtimeOnly: () => 'drop-me',
      }, {}),
      composedMessage: [
        new Proxy({
          role: 'user',
          content: '继续沿着同一个数字生命主线往前走',
        }, {}),
      ],
      contexts: {
        spark: [
          {
            id: 'ctx-1',
            contextId: 'ctx-1',
            createdAt: new Date('2026-06-11T12:00:01.000Z'),
            metadata: { source: 'spark' },
            transient: new Map([['mode', 'quiet-companionship']]),
          },
        ],
      },
      input: {
        type: 'input:text',
        data: {
          text: '继续沿着同一个数字生命主线往前走',
          transient: new Map([['mode', 'quiet-companionship']]),
          runtimeOnly: () => 'drop-me',
        },
      },
      preDialogueSendIdentity: proxiedPreDialogueSendIdentity,
    }

    await assistantMessageHook?.({
      role: 'assistant',
      content: '我还在沿着同一个数字生命主线回应。',
      slices: [],
      tool_results: [],
      debugSet: new Set(['observer-fanout', 'quiet-companionship']),
      runtimeOnly: () => 'drop-me',
    } as any, '我还在沿着同一个数字生命主线回应。', context)

    const assistantMessageBroadcast = mocks.broadcastStreamPostMock.mock.calls.findLast(call => call[0]?.type === 'assistant-message')?.[0] as any

    expect(() => structuredClone(assistantMessageBroadcast)).not.toThrow()
    expect(assistantMessageBroadcast?.context?.preDialogueSendIdentity).toEqual(rawPreDialogueSendIdentity)
    expect(assistantMessageBroadcast?.context?.message?.createdAt).toBe('2026-06-11T12:00:00.000Z')
    expect(assistantMessageBroadcast?.context?.message?.runtimeOnly).toBeUndefined()
    expect(assistantMessageBroadcast?.context?.input?.data?.runtimeOnly).toBeUndefined()
    expect(assistantMessageBroadcast?.context?.input?.data?.transient).toEqual({ mode: 'quiet-companionship' })
    expect(assistantMessageBroadcast?.context?.contexts?.spark?.[0]?.createdAt).toBe('2026-06-11T12:00:01.000Z')
    expect(assistantMessageBroadcast?.context?.contexts?.spark?.[0]?.transient).toEqual({ mode: 'quiet-companionship' })
    expect(assistantMessageBroadcast?.message?.debugSet).toEqual(['observer-fanout', 'quiet-companionship'])
    expect(assistantMessageBroadcast?.message?.runtimeOnly).toBeUndefined()
  })

  it('broadcasts before-send project awareness for remote observers without thinning the carry', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const beforeSendHook = mocks.chatHooks.onBeforeSend[0]
    expect(beforeSendHook).toBeTypeOf('function')

    const context = {
      message: {
        role: 'user',
        content: '继续沿着同一个数字生命主线收住这轮发送前开场',
      },
      composedMessage: [{ role: 'user', content: '继续沿着同一个数字生命主线收住这轮发送前开场' }],
      contexts: {},
      input: {
        type: 'input:text',
        data: {
          text: '继续沿着同一个数字生命主线收住这轮发送前开场',
        },
      },
      preDialogueSendIdentity: createPreDialogueIdentity({
        summaryLine: 'Phase 1 desktop continuity is still closing before this turn opens outward.',
        companionHeadlineLine: 'The body, face, and motion line is still keeping the reply low-pressure.',
        companionBriefingLine: 'Some closure already landed. The unfinished part still needs the same line.',
        companionNextClosureLine: 'Keep the same line inward and low-pressure while the remaining surfaces rejoin.',
        awarenessLine: 'Some closure already landed. The unfinished part still needs the same line.',
        emotionalClosureCue: 'Keep the return low-pressure so the line does not restart from scratch.',
        reasonPreview: ['inward-carry', 'quiet-companionship', 'remaining-surface-join'],
      }),
    }

    await beforeSendHook?.('继续沿着同一个数字生命主线收住这轮发送前开场', context)

    const beforeSendBroadcast = mocks.broadcastStreamPostMock.mock.calls.find(call => call[0]?.type === 'before-send')?.[0]

    expect(beforeSendBroadcast?.message).toBe('继续沿着同一个数字生命主线收住这轮发送前开场')
    expect(beforeSendBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)
    expect(beforeSendBroadcast?.context?.preDialogueSendIdentity?.awarenessLine).toBe(
      'Some closure already landed. The unfinished part still needs the same line.',
    )
    expect(beforeSendBroadcast?.context?.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      'inward-carry',
      'quiet-companionship',
      'remaining-surface-join',
    ]))
  }, 15_000)

  it('broadcasts the authoritative assistant message text instead of guessing from structured content', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const assistantMessageHook = mocks.chatHooks.onAssistantMessage[0]
    expect(assistantMessageHook).toBeTypeOf('function')

    const context = {
      message: {
        role: 'user',
        content: '继续沿着数字生命主线整理执行闭环',
      },
      composedMessage: [{ role: 'user', content: '继续沿着数字生命主线整理执行闭环' }],
      contexts: {},
      input: {
        type: 'input:text',
        data: {
          text: '继续沿着数字生命主线整理执行闭环',
        },
      },
      preDialogueSendIdentity: createPreDialogueIdentity({
        summaryLine: 'Phase 1 desktop continuity is still closing before this turn opens outward.',
        companionBriefingLine: 'Keep this project, what landed, and the open loop in view before speaking.',
        companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one line.',
        reasonPreview: ['renderer-prep', 'turn-open-regression'],
      }),
    }

    await assistantMessageHook?.({
      role: 'assistant',
      content: [
        { type: 'text', text: '内部结构化包裹，不应被拿来当远端权威 messageText。' },
      ],
      slices: [],
      tool_results: [],
    }, '真正权威的远端可见回复文本。', context)

    const assistantMessageBroadcast = mocks.broadcastStreamPostMock.mock.calls.findLast(call => call[0]?.type === 'assistant-message')?.[0]
    expect(assistantMessageBroadcast?.messageText).toBe('真正权威的远端可见回复文本。')
    expect(assistantMessageBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)
  })

  it('injects explicit inspector-built pre-dialogue identity into raw context-recall input:text ingestion before the remote turn opens outward', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const inputListeners = mocks.eventListeners.get('input:text') ?? []
    expect(inputListeners).toHaveLength(1)

    await inputListeners[0]?.({
      data: {
        text: '继续沿着这个数字生命项目的主线推进',
      },
      metadata: {
        source: 'spark',
      },
    })

    expect(mocks.ingestMock).toHaveBeenCalledWith(
      '继续沿着这个数字生命项目的主线推进',
      expect.objectContaining({
        origin: 'context-recall',
        input: {
          type: 'input:text',
          data: {
            text: '继续沿着这个数字生命项目的主线推进',
            textRaw: undefined,
            overrides: undefined,
            contextUpdates: undefined,
          },
        },
        preDialogueSendIdentity: expect.objectContaining({
          status: 'partial',
          summaryLine: 'Phase 1 desktop continuity is still settling before this context-recall turn opens outward.',
          reasonPreview: expect.arrayContaining([
            'context-recall',
            'generic-shell-regression',
          ]),
        }),
      }),
      undefined,
    )
  })

  it('blocks raw context-recall input:text ingestion when no explicit pre-dialogue identity is available before the remote turn opens outward', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null

    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const inputListeners = mocks.eventListeners.get('input:text') ?? []
    expect(inputListeners).toHaveLength(1)

    await inputListeners[0]?.({
      data: {
        text: '继续沿着这个数字生命项目的主线推进',
      },
      metadata: {
        source: 'spark',
      },
    })

    expect(mocks.ingestMock).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
