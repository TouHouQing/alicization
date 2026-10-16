import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

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
    channels: [] as Array<{ data: { value: any } }>,
    streamEndMock: vi.fn(),
    assistantEndMock: vi.fn(),
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
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

function createContext(text: string) {
  return {
    message: {
      role: 'user',
      content: text,
    },
    composedMessage: [{ role: 'user', content: text }],
    contexts: {},
    input: {
      type: 'input:text',
      data: {
        text,
      },
    },
  }
}

vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue')
  return {
    useBroadcastChannel: () => {
      const channel = { post: mocks.getNextBroadcastPostMock(), data: ref(undefined) }
      mocks.channels.push(channel)
      return channel
    },
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
    emitStreamEndHooks: mocks.streamEndMock,
    emitAssistantResponseEndHooks: mocks.assistantEndMock,
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
  let testPinia: ReturnType<typeof createPinia>
  beforeAll(async () => {
    // Cold module transformation is fixture setup, outside event-delivery time.
    await import('./context-bridge')
  }, 15000)

  beforeEach(() => {
    testPinia = createPinia()
    setActivePinia(testPinia)
    mocks.sendMock.mockReset()
    mocks.ingestMock.mockReset()
    mocks.getProviderConfigMock.mockClear()
    mocks.getProviderInstanceMock.mockClear()
    mocks.resetBroadcastMocks()
    mocks.channels.length = 0
    mocks.streamEndMock.mockReset()
    mocks.assistantEndMock.mockReset()
    mocks.eventListeners.clear()
    mocks.chatHooks.onBeforeSend.length = 0
    mocks.chatHooks.onAssistantMessage.length = 0
    mocks.chatHooks.onToolCall.length = 0
    mocks.chatHooks.onChatTurnComplete.length = 0
    consoleErrorSpy.mockClear()
  })

  afterEach(async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    await useContextBridgeStore(testPinia).dispose()
    disposePinia(testPinia)
  })

  it('delivers assistant completion after stream completion so the desktop speech intent can end', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    await useContextBridgeStore().initialize()
    const context = { ...createContext('你好'), message: { id: 'turn-a', role: 'user', content: '你好' } }
    const channel = mocks.channels[1]
    const receive = async (event: object) => {
      channel.data.value = { sessionId: 'session-test', context, ...event }
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    await receive({ type: 'before-send', message: '你好' })
    await receive({ type: 'stream-end' })
    await receive({ type: 'assistant-end', message: '我在。' })
    expect(mocks.streamEndMock).toHaveBeenCalledOnce()
    expect(mocks.assistantEndMock).toHaveBeenCalledWith('我在。', context)
  })

  it('does not lose a burst of terminal events or let an older turn close a newer speech intent', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    await useContextBridgeStore().initialize()
    const context = (id: string) => ({ ...createContext('你好'), message: { id, role: 'user', content: '你好' } })
    for (const [type, id] of [['before-send', 'a'], ['stream-end', 'a'], ['before-send', 'b'], ['assistant-end', 'a'], ['stream-end', 'b'], ['assistant-end', 'b']])
      mocks.channels[1].data.value = { type, sessionId: 'session-test', context: context(id), message: id }
    await vi.waitFor(() => expect(mocks.assistantEndMock).toHaveBeenCalledOnce())
    expect(mocks.assistantEndMock).toHaveBeenCalledWith('b', context('b'))
    expect(mocks.streamEndMock).toHaveBeenCalledTimes(2)
  })

  it('continues completion after a hook error and drops queued events when the receiver is disposed', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()
    const context = { ...createContext('你好'), message: { id: 'turn-a', role: 'user', content: '你好' } }
    mocks.streamEndMock.mockRejectedValueOnce(new Error('failed stream observer'))
    for (const type of ['before-send', 'stream-end', 'assistant-end'])
      mocks.channels[1].data.value = { type, sessionId: 'session-test', context, message: '我在。' }
    await vi.waitFor(() => expect(mocks.assistantEndMock).toHaveBeenCalledOnce())
    expect(consoleErrorSpy).toHaveBeenCalled()
    const completed = mocks.assistantEndMock.mock.calls.length
    for (const type of ['before-send', 'assistant-end'])
      mocks.channels[1].data.value = { type, sessionId: 'session-test', context, message: '晚到的回复' }
    await store.dispose()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mocks.assistantEndMock).toHaveBeenCalledTimes(completed)
  })

  it('forwards outgoing tool-call, chat message, and complete server events', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const assistantMessageHook = mocks.chatHooks.onAssistantMessage[0]
    const toolCallHook = mocks.chatHooks.onToolCall[0]
    const completeHook = mocks.chatHooks.onChatTurnComplete[0]
    expect(assistantMessageHook).toBeTypeOf('function')
    expect(toolCallHook).toBeTypeOf('function')
    expect(completeHook).toBeTypeOf('function')

    const context = createContext('继续把这轮上下文收住')

    const toolCall = {
      role: 'tool',
      content: '读取桌面执行状态',
      tool_call_id: 'tool-call-1',
      toolName: 'codex',
    }

    await toolCallHook?.(toolCall, context)

    await assistantMessageHook?.({
      role: 'assistant',
      content: '继续把这轮记忆测试推进。',
      slices: [],
      tool_results: [],
    }, '继续把这轮记忆测试推进。', context)

    await completeHook?.({
      output: {
        role: 'assistant',
        content: '继续把这轮记忆测试推进。',
        slices: [],
        tool_results: [],
      },
      outputText: '继续把这轮记忆测试推进。',
      toolCalls: [toolCall],
    }, context)

    const toolCallEvent = mocks.sendMock.mock.calls.find(call => call[0]?.type === 'output:gen-ai:chat:tool-call')?.[0]
    const messageEvent = mocks.sendMock.mock.calls.find(call => call[0]?.type === 'output:gen-ai:chat:message')?.[0]
    const completeEvent = mocks.sendMock.mock.calls.find(call => call[0]?.type === 'output:gen-ai:chat:complete')?.[0]

    expect(toolCallEvent?.data?.toolCalls).toEqual([toolCall])
    expect(messageEvent?.data?.message).toMatchObject({
      role: 'assistant',
      content: '继续把这轮记忆测试推进。',
    })
    expect(completeEvent?.data?.toolCalls).toEqual([toolCall])
  }, 15_000)

  it('broadcasts tool calls and assistant messages to remote observers', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const assistantMessageHook = mocks.chatHooks.onAssistantMessage[0]
    const toolCallHook = mocks.chatHooks.onToolCall[0]
    expect(assistantMessageHook).toBeTypeOf('function')
    expect(toolCallHook).toBeTypeOf('function')

    const context = createContext('继续把数字生命执行闭环收紧')

    const toolCall = {
      toolCallId: 'tool-broadcast-1',
      toolName: 'cli',
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
    expect(assistantMessageBroadcast?.messageText).toBe('我先看一下桌面当前状态。')
  }, 15_000)

  it('sanitizes remote-observer broadcast payloads into structured-clone-safe data before cross-window fanout', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const assistantMessageHook = mocks.chatHooks.onAssistantMessage[0]
    expect(assistantMessageHook).toBeTypeOf('function')

    const context: any = {
      message: new Proxy({
        role: 'user',
        content: '继续沿着这轮上下文往前走',
        createdAt: new Date('2026-06-11T12:00:00.000Z'),
        runtimeOnly: () => 'drop-me',
      }, {}),
      composedMessage: [
        new Proxy({
          role: 'user',
          content: '继续沿着这轮上下文往前走',
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
          text: '继续沿着这轮上下文往前走',
          transient: new Map([['mode', 'quiet-companionship']]),
          runtimeOnly: () => 'drop-me',
        },
      },
    }

    await assistantMessageHook?.({
      role: 'assistant',
      content: '我还在沿着这轮上下文回应。',
      slices: [],
      tool_results: [],
      debugSet: new Set(['observer-fanout', 'quiet-companionship']),
      runtimeOnly: () => 'drop-me',
    } as any, '我还在沿着这轮上下文回应。', context)

    const assistantMessageBroadcast = mocks.broadcastStreamPostMock.mock.calls.findLast(call => call[0]?.type === 'assistant-message')?.[0] as any

    expect(() => structuredClone(assistantMessageBroadcast)).not.toThrow()
    expect(assistantMessageBroadcast?.context?.message?.createdAt).toBe('2026-06-11T12:00:00.000Z')
    expect(assistantMessageBroadcast?.context?.message?.runtimeOnly).toBeUndefined()
    expect(assistantMessageBroadcast?.context?.input?.data?.runtimeOnly).toBeUndefined()
    expect(assistantMessageBroadcast?.context?.input?.data?.transient).toEqual({ mode: 'quiet-companionship' })
    expect(assistantMessageBroadcast?.context?.contexts?.spark?.[0]?.createdAt).toBe('2026-06-11T12:00:01.000Z')
    expect(assistantMessageBroadcast?.context?.contexts?.spark?.[0]?.transient).toEqual({ mode: 'quiet-companionship' })
    expect(assistantMessageBroadcast?.message?.debugSet).toEqual(['observer-fanout', 'quiet-companionship'])
    expect(assistantMessageBroadcast?.message?.runtimeOnly).toBeUndefined()
  })

  it('broadcasts before-send events', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const beforeSendHook = mocks.chatHooks.onBeforeSend[0]
    expect(beforeSendHook).toBeTypeOf('function')

    const context = createContext('继续沿着这轮上下文收住发送前事件')

    await beforeSendHook?.('继续沿着这轮上下文收住发送前事件', context)

    const beforeSendBroadcast = mocks.broadcastStreamPostMock.mock.calls.find(call => call[0]?.type === 'before-send')?.[0]

    expect(beforeSendBroadcast?.message).toBe('继续沿着这轮上下文收住发送前事件')
  }, 15_000)

  it('broadcasts the authoritative assistant message text instead of guessing from structured content', async () => {
    const { useContextBridgeStore } = await import('./context-bridge')
    const store = useContextBridgeStore()
    await store.initialize()

    const assistantMessageHook = mocks.chatHooks.onAssistantMessage[0]
    expect(assistantMessageHook).toBeTypeOf('function')

    const context = createContext('继续沿着这轮上下文整理执行闭环')

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
  })

  it('ingests raw context-recall input', async () => {
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
      }),
      undefined,
    )
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
