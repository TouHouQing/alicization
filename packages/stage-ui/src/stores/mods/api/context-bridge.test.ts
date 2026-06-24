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
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Context-bridge input:text ingestion already preserves explicit project awareness before remote turns open outward.',
      primaryOpenLoop: 'Initiative and embodiment still need stronger same-her closure under real desktop use.',
      nextClosureTarget: 'Keep the explicit same-her project brief alive before context-recall turns widen outward.',
      continuitySummary: 'same-her=context bridge input:text still remembers this is one Phase 1 digital life before dispatch.',
      sameHerSelfLine: 'Same Phase 1 digital life. Context bridge turns should still start from one living line.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      preDialogueAwareness: null,
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'context-bridge-turn-1',
      sessionId: 'context-bridge-session-1',
      origin: 'context-recall',
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this context-recall turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Before speaking, keep this same digital life project explicit before context-recall widens outward.',
      emotionalClosureCue: null,
      reasonPreview: [
        'Context-recall turns should not reopen as a generic assistant shell.',
      ],
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'context bridge continuity still needs one same-her closure carry.',
      companionHeadlineLine: 'Right now the context bridge same-her line still needs measured-return care.',
      companionBriefingLine: 'Hold the same project, the same phase, and the same open loop together before context-recall sends outward.',
      companionNextClosureLine: 'Keep extending the same-her context bridge carry without reopening from scratch.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      briefingLines: [],
      reasons: [
        'Context bridge still needs the same same-her project brief before dispatch.',
      ],
    }
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          'Latest landed progress still holds at renderer-side preparation.',
          'Primary open life loop still centers on full cross-modal same-her recovery.',
          'If this turn opens like a generic project status shell, treat that as same-her continuity drift rather than forward closure.',
        ],
      },
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
      'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'Latest landed progress still holds at renderer-side preparation.',
      'Primary open life loop still centers on full cross-modal same-her recovery.',
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          'Latest landed progress still holds at renderer-side preparation.',
          'Primary open life loop still centers on full cross-modal same-her recovery.',
          'If this turn opens like a generic project status shell, treat that as same-her continuity drift rather than forward closure.',
        ],
      },
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
      'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'Latest landed progress still holds at renderer-side preparation.',
      'Primary open life loop still centers on full cross-modal same-her recovery.',
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
      summaryLine: 'Alicization is still carrying the same Phase 1 digital life line before this observer broadcast fans out.',
      companionBriefingLine: 'Keep the same-her line explicit before remote observers mirror this turn.',
      companionNextClosureLine: 'Keep embodiment, speech, and chat continuity on one same-her line.',
      awarenessLine: 'This remote observer broadcast should still stay on the same quiet same-her line.',
      reasonPreview: [
        'same-her-observer-broadcast',
        'quiet-companionship',
      ],
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
      debugSet: new Set(['same-her', 'quiet-companionship']),
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
    expect(assistantMessageBroadcast?.message?.debugSet).toEqual(['same-her', 'quiet-companionship'])
    expect(assistantMessageBroadcast?.message?.runtimeOnly).toBeUndefined()
  })

  it('broadcasts before-send same-her inward low-pressure project awareness for remote observers without thinning the carry', async () => {
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
        awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
        emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
        reasonPreview: [
          'same-her-inward-carry',
          'quiet-companionship',
          'remaining-open=lipsync+voice',
          'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        ],
      },
    }

    await beforeSendHook?.('继续沿着同一个数字生命主线收住这轮发送前开场', context)

    const beforeSendBroadcast = mocks.broadcastStreamPostMock.mock.calls.find(call => call[0]?.type === 'before-send')?.[0]

    expect(beforeSendBroadcast?.message).toBe('继续沿着同一个数字生命主线收住这轮发送前开场')
    expect(beforeSendBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)
    expect(beforeSendBroadcast?.context?.preDialogueSendIdentity?.awarenessLine).toBe(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    )
    expect(beforeSendBroadcast?.context?.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      'same-her-inward-carry',
      'quiet-companionship',
      'remaining-open=lipsync+voice',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
        reasonPreview: [
          'Latest landed progress still holds at renderer-side preparation.',
          'If this turn opens like a generic project status shell, treat that as same-her continuity drift rather than forward closure.',
        ],
      },
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

    expect(mocks.ingestMock).toHaveBeenCalledWith('继续沿着这个数字生命项目的主线推进', expect.objectContaining({
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
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this context-recall turn opens outward.',
        awarenessLine: 'Before speaking, keep this same digital life project explicit before context-recall widens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        projectState: expect.objectContaining({
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Context-bridge input:text ingestion already preserves explicit project awareness before remote turns open outward.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger same-her closure under real desktop use.',
          nextClosureTarget: 'Keep the explicit same-her project brief alive before context-recall turns widen outward.',
        }),
        reasonPreview: expect.arrayContaining([
          'Context-recall turns should not reopen as a generic assistant shell.',
          'same-her=context bridge input:text still remembers this is one Phase 1 digital life before dispatch.',
        ]),
      }),
    }), undefined)
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
