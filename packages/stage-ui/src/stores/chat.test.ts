import { readFileSync } from 'node:fs'

import {
  createAlicizationRuntimeToolProjectionReducer,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { hasVerifiedToolResult, useChatOrchestratorStore } from './chat'

const hookCapture = vi.hoisted(() => ({
  beforeSendContexts: [] as any[],
  embodimentMetas: [] as any[],
  contextsSnapshot: {} as Record<string, unknown>,
  toolCallError: null as Error | null,
}))

const streamMock = vi.fn()
const executeRealtimeQueryTurnMock = vi.fn()
const appendConversationTurnMock = vi.fn()
const appendAuditLogMock = vi.fn()
const suspendKillSwitchMock = vi.fn()
const resumeKillSwitchMock = vi.fn()
const chatAbortMock = vi.fn()
const chatSessionStoreMocks = vi.hoisted(() => ({
  ensureSessionReady: vi.fn(),
}))
const chatToolProjectionMocks = vi.hoisted(() => ({
  failure: null as null | {
    error: Error
    toolCallId: string
  },
}))

const activeSessionId = ref('session-test')
const activeConsciousnessProvider = ref('mock-provider')
const activeConsciousnessModel = ref('mock-active-model')
const streamingMessage = ref({
  role: 'assistant',
  content: '',
  slices: [],
  tool_results: [],
})
const sessionMessagesMap = new Map<string, any[]>()
const localStorageEntries = new Map<string, string>()

vi.stubGlobal('localStorage', {
  clear() {
    localStorageEntries.clear()
  },
  getItem(key: string) {
    return localStorageEntries.get(key) ?? null
  },
  removeItem(key: string) {
    localStorageEntries.delete(key)
  },
  setItem(key: string, value: string) {
    localStorageEntries.set(key, value)
  },
})

function ensureSessionMessages(sessionId: string) {
  if (!sessionMessagesMap.has(sessionId))
    sessionMessagesMap.set(sessionId, [])
  return sessionMessagesMap.get(sessionId)!
}

function createProviderPayload(
  reply = '这是主进程 Provider 根据当前对话与记忆生成的回复。',
  overrides: Record<string, unknown> = {},
) {
  return {
    format: 'mind-turn-v1',
    thought: 'I considered the current request and the available memory evidence.',
    emotion: 'neutral',
    reply,
    performance: {
      baseEmotion: 'neutral',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    memoryUsage: {
      workingMemoryVersion: 'wm-test-1',
      longTermEvidenceIds: ['ltm-test-1'],
    },
    ...overrides,
  }
}

function createProviderFullText(
  reply = '这是主进程 Provider 根据当前对话与记忆生成的回复。',
  overrides: Record<string, unknown> = {},
) {
  return JSON.stringify(createProviderPayload(reply, overrides))
}

function withoutField(payload: Record<string, unknown>, field: string) {
  const result = { ...payload }
  delete result[field]
  return result
}

const strictProviderPayload = createProviderPayload()
const invalidProviderContractCases: Array<[string, Record<string, unknown>]> = [
  ['missing format', withoutField(strictProviderPayload, 'format')],
  ['an unsupported format', createProviderPayload(undefined, { format: 'epoch1-v1' })],
  ['missing thought', withoutField(strictProviderPayload, 'thought')],
  ['missing emotion', withoutField(strictProviderPayload, 'emotion')],
  ['missing reply', withoutField(strictProviderPayload, 'reply')],
  ['missing performance', withoutField(strictProviderPayload, 'performance')],
  ['missing memoryUsage', withoutField(strictProviderPayload, 'memoryUsage')],
  ['an unsupported emotion', createProviderPayload(undefined, { emotion: 'excited' })],
  ['an incomplete performance payload', createProviderPayload(undefined, {
    performance: {
      baseEmotion: 'neutral',
      facialCue: null,
      actionCue: null,
      emphasis: 0,
    },
  })],
  ['a performance emotion mismatch', createProviderPayload(undefined, {
    emotion: 'neutral',
    performance: {
      baseEmotion: 'happy',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
  })],
  ['an incomplete memoryUsage payload', createProviderPayload(undefined, {
    memoryUsage: {
      workingMemoryVersion: 'wm-test-1',
    },
  })],
]

function providerLearningPolicy() {
  return {
    allowLongTermCondensation: true,
    allowPersonaLearning: true,
    allowTraining: false,
  }
}

vi.mock('../composables/use-analytics', () => ({
  useAnalytics: () => ({
    trackFirstMessage: vi.fn(),
  }),
}))

vi.mock('./llm', () => ({
  useLLM: () => ({
    stream: streamMock,
    discoverToolsCompatibility: vi.fn(),
  }),
}))

vi.mock('./chat-tool-projection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./chat-tool-projection')>()
  return {
    ...actual,
    applyChatToolProjectionSlice: (
      ...args: Parameters<typeof actual.applyChatToolProjectionSlice>
    ) => {
      const slice = args[1]
      const toolCallId = slice.type === 'tool-call'
        ? slice.toolCall.toolCallId
        : slice.type === 'tool-call-result'
          ? slice.id
          : slice.toolCallId
      const failure = chatToolProjectionMocks.failure
      if (failure && failure.toolCallId === toolCallId)
        throw failure.error
      return actual.applyChatToolProjectionSlice(...args)
    },
  }
})

vi.mock('./alicization-execution-engine', () => ({
  useAlicizationExecutionEngineStore: () => ({
    executeRealtimeQueryTurn: executeRealtimeQueryTurnMock,
  }),
}))

vi.mock('./chat/session-store', () => ({
  useChatSessionStore: () => ({
    activeSessionId,
    initialize: vi.fn(),
    ensureSession: (sessionId: string) => {
      ensureSessionMessages(sessionId)
    },
    ensureSessionReady: chatSessionStoreMocks.ensureSessionReady,
    getSessionMessages: (sessionId: string) => ensureSessionMessages(sessionId),
    persistSessionMessages: vi.fn(),
    getSessionGeneration: vi.fn().mockReturnValue(0),
    forkSession: vi.fn().mockResolvedValue('session-test-fork'),
  }),
}))

vi.mock('./chat/stream-store', () => ({
  useChatStreamStore: () => ({
    streamingMessage,
  }),
}))

vi.mock('./chat/context-store', () => ({
  useChatContextStore: () => ({
    ingestContextMessage: vi.fn(),
    getContextsSnapshot: () => hookCapture.contextsSnapshot,
  }),
}))

vi.mock('./chat/context-providers', () => ({
  createDatetimeContext: () => ({
    id: 'ctx-datetime',
    contextId: 'system:datetime',
    strategy: 'replace-self',
    text: '{}',
    createdAt: Date.now(),
  }),
  createSensoryContext: () => ({
    id: 'ctx-sensory',
    contextId: 'alicization:sensory',
    strategy: 'replace-self',
    text: '{}',
    createdAt: Date.now(),
  }),
}))

vi.mock('./modules/consciousness', () => ({
  useConsciousnessStore: () => ({
    activeProvider: activeConsciousnessProvider,
    activeModel: activeConsciousnessModel,
  }),
}))

vi.mock('./providers', () => ({
  useProvidersStore: () => ({
    getProviderConfig: vi.fn().mockReturnValue({}),
  }),
}))

vi.mock('./chat/hooks', () => ({
  createChatHooks: () => {
    const noopAsync = async () => {}
    return {
      clearHooks: vi.fn(),
      emitBeforeMessageComposedHooks: noopAsync,
      emitAfterMessageComposedHooks: noopAsync,
      emitBeforeSendHooks: async (_message: string, context: any) => {
        hookCapture.beforeSendContexts.push(context)
      },
      emitAfterSendHooks: noopAsync,
      emitTokenLiteralHooks: noopAsync,
      emitTokenSpecialHooks: noopAsync,
      emitStreamEndHooks: noopAsync,
      emitEmbodimentMetaHooks: async (meta: any) => {
        hookCapture.embodimentMetas.push(meta)
      },
      emitAssistantResponseEndHooks: noopAsync,
      emitToolCallHooks: async () => {
        if (hookCapture.toolCallError)
          throw hookCapture.toolCallError
      },
      emitAssistantMessageHooks: noopAsync,
      emitChatTurnCompleteHooks: noopAsync,
      onBeforeMessageComposed: () => () => {},
      onAfterMessageComposed: () => () => {},
      onBeforeSend: () => () => {},
      onAfterSend: () => () => {},
      onTokenLiteral: () => () => {},
      onTokenSpecial: () => () => {},
      onStreamEnd: () => () => {},
      onEmbodimentMeta: () => () => {},
      onAssistantResponseEnd: () => () => {},
      onToolCall: () => () => {},
      onAssistantMessage: () => () => {},
      onChatTurnComplete: () => () => {},
    }
  },
}))

vi.mock('../composables/alicization-guardrails', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../composables/alicization-guardrails')>()
  return {
    ...actual,
    compactMessagesForPromptAssembly: (messages: any[]) => ({
      messages,
      report: {
        beforeCount: messages.length,
        afterCount: messages.length,
        beforeTokens: 0,
        afterTokens: 0,
        droppedMessageCount: 0,
        retainedUserTurns: 0,
      },
    }),
  }
})

vi.mock('../composables/response-categoriser', () => ({
  createStreamingCategorizer: () => ({
    consume: vi.fn(),
    filterToSpeech: (text: string) => text,
  }),
  categorizeResponse: (fullText: string) => ({
    speech: fullText,
    reasoning: '',
  }),
}))

vi.mock('../composables/llm-marker-parser', () => ({
  useLlmmarkerParser: (handlers: {
    onLiteral: (literal: string) => Promise<void>
    onEnd: (fullText: string) => Promise<void>
  }) => {
    let accumulated = ''
    return {
      consume: async (text: string) => {
        accumulated += text
        await handlers.onLiteral(text)
      },
      end: async () => {
        await handlers.onEnd(accumulated)
      },
    }
  },
}))

function createChatProviderStub() {
  return {
    chat: () => ({
      baseURL: 'https://example.test',
    }),
  } as any
}

function createMainProjectedStreamEventEmitter(
  onStreamEvent?: (event: any) => Promise<void> | void,
) {
  const toolProjection = createAlicizationRuntimeToolProjectionReducer()

  return async (event: any) => {
    if (
      event.type !== 'tool-call'
      && event.type !== 'tool-progress'
      && event.type !== 'tool-result'
    ) {
      await onStreamEvent?.(event)
      return
    }

    if (event.projection) {
      await onStreamEvent?.(event)
      return
    }

    const projection = toolProjection.reduce(event.type === 'tool-call'
      ? {
          type: 'tool-call',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          selectedChannel: event.selectedChannel,
          arguments: event.args,
        }
      : event.type === 'tool-progress'
        ? {
            type: 'tool-progress',
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            selectedChannel: event.selectedChannel,
            phase: event.phase,
            signal: event.signal,
            elapsedMs: event.elapsedMs,
            timeoutMs: event.timeoutMs,
            errorCode: event.errorCode,
            errorMessage: event.errorMessage,
            occurredAt: event.occurredAt,
            eventId: event.eventId,
            threadId: event.threadId,
            adapterEventType: event.adapterEventType,
            itemType: event.itemType,
            summary: event.summary,
            command: event.command,
            commandStatus: event.commandStatus,
            commandExitCode: event.commandExitCode,
            outputPreview: event.outputPreview,
          }
        : {
            type: 'tool-result',
            toolCallId: event.toolCallId,
            toolName: event.toolName ?? '',
            selectedChannel: event.selectedChannel,
            result: event.result,
          })

    await onStreamEvent?.({
      ...event,
      selectedChannel: projection.card.selectedChannel,
      projection,
    })
  }
}

function installAlicizationBridge(options?: {
  streamChat?: (payload: any, options: any) => Promise<void>
  streamLifecycleOwner?: 'main' | 'renderer'
}) {
  const streamChat = options?.streamChat
  setAlicizationBridge({
    streamLifecycleOwner: options?.streamLifecycleOwner,
    bootstrap: vi.fn(),
    getSoul: vi.fn().mockResolvedValue({
      content: '# SOUL\nAlicization',
      frontmatter: {
        profile: {
          hostName: '宿主',
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
        },
      },
    }),
    initializeGenesis: vi.fn(),
    updateSoul: vi.fn(),
    updatePersonality: vi.fn(),
    getKillSwitchState: vi.fn().mockResolvedValue({
      state: 'ACTIVE',
      updatedAt: Date.now(),
    }),
    suspendKillSwitch: suspendKillSwitchMock,
    resumeKillSwitch: resumeKillSwitchMock,
    chatAbort: chatAbortMock,
    appendConversationTurn: appendConversationTurnMock,
    appendAuditLog: appendAuditLogMock,
    getSensorySnapshot: vi.fn().mockResolvedValue({
      sample: null,
      stale: false,
      ageMs: 0,
      nextTickAt: Date.now() + 60_000,
      running: true,
    }),
    streamChat: streamChat
      ? async (payload: any, streamOptions: any) => {
        await streamChat(payload, {
          ...streamOptions,
          onStreamEvent: createMainProjectedStreamEventEmitter(streamOptions.onStreamEvent),
        })
      }
      : undefined,
    onVisualPresencePulse: () => () => {},
  } as any)
}

describe('verified tool result evidence', () => {
  it('does not treat a failed structured result with content as successful evidence', () => {
    expect(hasVerifiedToolResult({
      status: 'failed',
      errorCode: 'CODEX_TIMEOUT',
      content: [{ type: 'text', text: 'the provider timed out' }],
    })).toBe(false)
  })

  it('does not treat an accepted background result as completed evidence', () => {
    expect(hasVerifiedToolResult({
      status: 'accepted',
      content: [{ type: 'text', text: 'task accepted for background execution' }],
    })).toBe(false)
  })

  it('accepts content from a completed structured result', () => {
    expect(hasVerifiedToolResult({
      status: 'completed',
      finalStatus: 'completed',
      content: [{ type: 'text', text: 'the task completed successfully' }],
    })).toBe(true)
  })
})

describe('chat orchestrator reply authority', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
    streamMock.mockReset()
    executeRealtimeQueryTurnMock.mockReset()
    appendConversationTurnMock.mockReset()
    appendAuditLogMock.mockReset()
    chatToolProjectionMocks.failure = null
    suspendKillSwitchMock.mockReset()
    resumeKillSwitchMock.mockReset()
    chatAbortMock.mockReset()
    hookCapture.beforeSendContexts.length = 0
    hookCapture.embodimentMetas.length = 0
    hookCapture.contextsSnapshot = {}
    hookCapture.toolCallError = null
    executeRealtimeQueryTurnMock.mockResolvedValue({ handled: false })
    appendConversationTurnMock.mockResolvedValue(undefined)
    appendAuditLogMock.mockResolvedValue(undefined)
    suspendKillSwitchMock.mockResolvedValue({
      state: 'SUSPENDED',
      updatedAt: Date.now(),
    })
    resumeKillSwitchMock.mockResolvedValue({
      state: 'ACTIVE',
      updatedAt: Date.now(),
    })
    chatAbortMock.mockResolvedValue({
      accepted: true,
      state: 'aborted',
    })
    localStorageEntries.clear()
    sessionMessagesMap.clear()
    ensureSessionMessages(activeSessionId.value)
    chatSessionStoreMocks.ensureSessionReady.mockReset()
    chatSessionStoreMocks.ensureSessionReady.mockImplementation(async (sessionId: string) => {
      ensureSessionMessages(sessionId)
    })
    streamingMessage.value = {
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
    }
  })

  it('contains no renderer retry prompt or local ordinary reply author', () => {
    const source = readFileSync(new URL('./chat.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /structuredRetrySystemPrompt|createStructuredFallback|stageAssistantFallback|repairStructuredContractLocally|renderer-local/iu,
    )
    expect(source).not.toContain('stageChatText(\'kill-switch.suspended\')')
    expect(source).not.toContain('stageChatText(\'kill-switch.resumed\')')
    expect(source).not.toMatch(
      /fileSystemOperationVerbPattern|fileSystemOperationTargetPattern|reminder(?:ChineseNatural|Duration|EnglishNatural|Verb)Pattern|detect(?:FileSystem|Reminder|ExecutionToolRouting)ToolIntent/iu,
    )
    expect(source).not.toMatch(
      /detectAlicizationExecution(?:CapabilityInquiry|RoutingIntent)/u,
    )
  })

  it('omits native provider responseFormat from the renderer provider call', async () => {
    const reply = '这是 Provider 严格 JSON 合同里的回复。'
    const fullText = createProviderFullText(reply)
    streamMock.mockImplementation(async (_model, _provider, _messages, options) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: fullText,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toHaveBeenCalledTimes(1)
    expect(streamMock.mock.calls[0]?.[3]).not.toHaveProperty('responseFormat')
  })

  it('does not turn renderer context snapshots into an extra Provider user prompt without a bridge', async () => {
    const reply = 'Provider 只收到原始用户消息。'
    const fullText = createProviderFullText(reply)
    hookCapture.contextsSnapshot = {
      diagnostics: {
        sentinel: 'renderer-context-must-not-become-a-prompt',
      },
    }
    streamMock.mockImplementation(async (_model, _provider, _messages, options) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: fullText,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('只发送这一条用户消息', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const providerMessages = streamMock.mock.calls[0]?.[2] as any[]
    const serializedMessages = JSON.stringify(providerMessages)
    expect(providerMessages.filter(message => message.role === 'user')).toHaveLength(1)
    expect(serializedMessages).not.toContain('renderer-context-must-not-become-a-prompt')
    expect(serializedMessages).not.toContain('These are the contextual information retrieved')
  })

  it('persists the main-process provider artifact from finish fullText', async () => {
    const reply = '这是主进程 Provider 根据当前对话与记忆生成的回复。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).not.toHaveBeenCalled()
    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: reply,
      structured: expect.objectContaining({
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        reply,
      }),
    }))
  })

  it.each([
    ['你可以使用 Codex 吗', '可以，我能在明确需要执行任务时使用 Codex。'],
    ['Codex 最近怎么样', 'Codex 最近运行稳定。'],
    ['删除文件是什么意思', '删除文件通常意味着移除指定文件。'],
  ])('lets ordinary message "%s" complete as provider text without fixed tool routing', async (message, reply) => {
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest(message, {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamChat).toHaveBeenCalledTimes(1)
    expect(streamChat.mock.calls[0]?.[0]).toMatchObject({
      supportsTools: true,
      waitForTools: true,
    })
    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: reply,
      structured: expect.objectContaining({
        origin: 'provider',
      }),
    }))
    expect(appendConversationTurnMock.mock.calls.at(-1)?.[0]?.structured.failureSurface).toBeUndefined()
  })

  it('shows an empty assistant placeholder before cold session readiness resolves', async () => {
    let releaseSessionReady!: () => void
    const sessionReady = new Promise<void>((resolve) => {
      releaseSessionReady = resolve
    })
    chatSessionStoreMocks.ensureSessionReady.mockImplementation(async (sessionId: string) => {
      ensureSessionMessages(sessionId)
      await sessionReady
    })
    const reply = '你好，我在。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(chatSessionStoreMocks.ensureSessionReady).toHaveBeenCalledWith('session-test')
    expect(streamChat).not.toHaveBeenCalled()
    expect(ensureSessionMessages(activeSessionId.value)).toHaveLength(0)
    expect(streamingMessage.value).toMatchObject({
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
    })
    expect((streamingMessage.value as { id?: string }).id).toEqual(expect.any(String))
    expect((streamingMessage.value as { createdAt?: number }).createdAt).toEqual(expect.any(Number))

    releaseSessionReady()
    await pending
  })

  it('preserves main-projected tool-call and tool-result evidence without requiring an execution route', async () => {
    const reply = '我查到结果了。'
    const fullText = createProviderFullText(reply)
    streamMock.mockImplementation(async (_model, _provider, _messages, options) => {
      const emit = createMainProjectedStreamEventEmitter(options.onStreamEvent)
      await emit({
        type: 'tool-call',
        toolCallId: 'tool-search-1',
        toolName: 'fetch_tasks',
        args: '{}',
        toolCallType: 'function',
      })
      await new Promise(resolve => setTimeout(resolve, 0))
      await emit({
        type: 'tool-result',
        toolCallId: 'tool-search-1',
        toolName: 'fetch_tasks',
        result: {
          ok: true,
          output: '结果内容',
        },
      })
      await new Promise(resolve => setTimeout(resolve, 0))
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('帮我查一下这个', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    const persistedMessage = ensureSessionMessages(activeSessionId.value).at(-1) as any
    expect(streamMock.mock.calls[0]?.[3]).toMatchObject({
      supportsTools: true,
      waitForTools: true,
    })
    expect(persistedMessage).toMatchObject({
      role: 'assistant',
      content: reply,
    })
    expect(persistedMessage.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'tool-call',
        toolCall: expect.objectContaining({
          toolCallId: 'tool-search-1',
          toolName: 'fetch_tasks',
        }),
      }),
    ]))
    expect(persistedMessage.tool_results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'tool-search-1',
        result: {
          ok: true,
          output: '结果内容',
        },
      }),
    ]))
  })

  it('does not abort a tool execution that remains alive beyond the generic renderer idle window', async () => {
    vi.useFakeTimers()
    try {
      const reply = 'Codex 已经完成了垃圾文件检查。'
      const fullText = createProviderFullText(reply)
      const streamChat = vi.fn(async (_payload: any, options: any) => {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-codex-long-1',
          toolName: 'codex',
          args: '{}',
          toolCallType: 'function',
        })
        for (const elapsedMs of [10_000, 20_000, 30_000, 40_000]) {
          await new Promise(resolve => setTimeout(resolve, 10_000))
          if (options.abortSignal?.aborted)
            throw options.abortSignal.reason ?? new Error('renderer aborted the live tool execution')
          await options.onStreamEvent?.({
            type: 'tool-progress',
            toolCallId: 'tool-codex-long-1',
            toolName: 'codex',
            phase: 'running',
            elapsedMs,
          })
        }
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-codex-long-1',
          result: {
            ok: true,
            output: '完成',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: reply,
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          failureSurface: null,
        })
        await options.onStreamEvent?.({
          type: 'finish',
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          fullText,
          finishReason: 'stop',
        })
      })
      installAlicizationBridge({ streamChat })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('你试试用 codex 看看我电脑有哪些垃圾文件可以清理', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await vi.advanceTimersByTimeAsync(45_000)
      expect(chatAbortMock).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1_000)
      await pending

      expect(chatAbortMock).not.toHaveBeenCalled()
      expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
        assistantText: reply,
      }))
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('keeps a renderer-owned provider stream alive while only private reasoning progress is arriving', async () => {
    vi.useFakeTimers()
    try {
      const reply = '我已经完成了思考。'
      const fullText = createProviderFullText(reply)
      const streamChat = vi.fn(async (_payload: any, options: any) => {
        for (const elapsedMs of [40_000, 80_000, 120_000]) {
          await new Promise(resolve => setTimeout(resolve, 40_000))
          if (options.abortSignal?.aborted)
            throw options.abortSignal.reason ?? new Error('renderer aborted live provider reasoning')
          await options.onStreamEvent?.({
            type: 'provider-progress',
            phase: 'reasoning',
            elapsedMs,
          })
        }
        await new Promise(resolve => setTimeout(resolve, 10_000))
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: reply,
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          failureSurface: null,
        })
        await options.onStreamEvent?.({
          type: 'finish',
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          fullText,
          finishReason: 'stop',
        })
      })
      installAlicizationBridge({
        streamChat,
        streamLifecycleOwner: 'renderer',
      })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('请仔细想一想再回答。', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await vi.advanceTimersByTimeAsync(130_000)
      await pending

      expect(chatAbortMock).not.toHaveBeenCalled()
      expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
        assistantText: reply,
      }))
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('does not let the renderer abort a main-owned task when transport progress is temporarily quiet', async () => {
    vi.useFakeTimers()
    try {
      const reply = 'Codex 最终完成了检查。'
      const fullText = createProviderFullText(reply)
      const streamChat = vi.fn(async (_payload: any, options: any) => {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-codex-main-owned-1',
          toolName: 'codex',
          args: '{}',
          toolCallType: 'function',
        })

        await new Promise(resolve => setTimeout(resolve, 70_000))
        if (options.abortSignal?.aborted)
          throw options.abortSignal.reason ?? new Error('main-owned task was aborted by renderer')

        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-codex-main-owned-1',
          result: {
            status: 'completed',
            output: '完成',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: reply,
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          failureSurface: null,
        })
        await options.onStreamEvent?.({
          type: 'finish',
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          fullText,
          finishReason: 'stop',
        })
      })
      installAlicizationBridge({
        streamChat,
        streamLifecycleOwner: 'main',
      })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('请用 Codex 检查仓库', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await vi.advanceTimersByTimeAsync(70_000)
      await pending

      expect(chatAbortMock).not.toHaveBeenCalled()
      expect(appendAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
        action: 'stream-lifecycle-owner-resolved',
        payload: expect.objectContaining({
          lifecycleOwner: 'main',
          watchdogEnabled: false,
        }),
      }))
      expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
        assistantText: reply,
      }))
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('defaults an omitted bridge lifecycle owner to renderer-owned execution', async () => {
    const reply = '这轮由显式的 renderer 生命周期看护完成。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('请直接回复，不要启动工具。', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(chatAbortMock).not.toHaveBeenCalled()
    expect(appendAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      action: 'stream-lifecycle-owner-resolved',
      payload: expect.objectContaining({
        lifecycleOwner: 'renderer',
        watchdogEnabled: true,
        declaredLifecycleOwner: null,
      }),
    }))
    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: reply,
    }))
  })

  it('honors an explicit renderer lifecycle owner even inside an Electron shell', async () => {
    vi.useFakeTimers()
    const originalWindow = (globalThis as Record<string, unknown>).window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        electron: {
          ipcRenderer: {
            invoke: vi.fn(),
          },
        },
      },
    })

    try {
      const streamChat = vi.fn(async (_payload: any, options: any) => {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-renderer-owner-precedence-1',
          toolName: 'codex',
          args: '{}',
          toolCallType: 'function',
        })

        await new Promise(resolve => setTimeout(resolve, 46_000))
        if (options.abortSignal?.aborted)
          throw options.abortSignal.reason ?? new Error('renderer-owned stream was aborted')

        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '这条回复不应该在超时之后继续提交。',
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          failureSurface: null,
        })
        await options.onStreamEvent?.({
          type: 'finish',
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          fullText: createProviderFullText('这条回复不应该在超时之后继续提交。'),
          finishReason: 'stop',
        })
      })
      installAlicizationBridge({
        streamChat,
        streamLifecycleOwner: 'renderer',
      })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('请用 Codex 检查仓库', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await vi.advanceTimersByTimeAsync(46_000)
      await pending

      expect(chatAbortMock).toHaveBeenCalledWith(expect.objectContaining({
        reason: 'stream-timeout',
      }))
      expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
        assistantText: 'Provider 等待首个响应超时（mock-provider / mock-model）。',
      }))
    }
    finally {
      vi.useRealTimers()
      if (originalWindow === undefined)
        Reflect.deleteProperty(globalThis, 'window')
      else
        Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    }
  })

  it('uses the provider continuation deadline after a tool result instead of the short tool idle deadline', async () => {
    vi.useFakeTimers()
    const originalWindow = (globalThis as Record<string, unknown>).window
    if (originalWindow !== undefined)
      Reflect.deleteProperty(globalThis, 'window')

    try {
      const reply = '工具结果已经交给 Provider 继续处理。'
      const streamChat = vi.fn(async (_payload: any, options: any) => {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-provider-continuation-1',
          toolName: 'codex',
          args: '{}',
          toolCallType: 'function',
        })
        await new Promise(resolve => setTimeout(resolve, 1_000))
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-provider-continuation-1',
          result: {
            status: 'completed',
            output: '检查完成',
          },
        })

        await new Promise(resolve => setTimeout(resolve, 50_000))
        if (options.abortSignal?.aborted)
          throw options.abortSignal.reason ?? new Error('provider continuation was aborted')

        await options.onStreamEvent?.({
          type: 'text-delta',
          text: reply,
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          failureSurface: null,
        })
        await options.onStreamEvent?.({
          type: 'finish',
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          fullText: createProviderFullText(reply),
          finishReason: 'stop',
        })
      })
      installAlicizationBridge({
        streamChat,
        streamLifecycleOwner: 'renderer',
      })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('请用 Codex 检查仓库', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await vi.advanceTimersByTimeAsync(51_000)
      await pending

      expect(chatAbortMock).not.toHaveBeenCalled()
      expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
        assistantText: reply,
      }))
    }
    finally {
      vi.useRealTimers()
      if (originalWindow === undefined)
        Reflect.deleteProperty(globalThis, 'window')
      else
        Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    }
  })

  it('aborts the renderer-owned underlying stream on watchdog timeout and quarantines late events', async () => {
    vi.useFakeTimers()
    try {
      const reply = '这条迟到的 Provider 回复不应该进入已经失败的会话。'
      const fullText = createProviderFullText(reply)
      let capturedAbortSignal: AbortSignal | undefined
      let emitLateEvent: ((event: any) => void | Promise<void>) | undefined
      let markStreamStarted!: () => void
      const streamStarted = new Promise<void>((resolve) => {
        markStreamStarted = resolve
      })
      const streamChat = vi.fn(async (_payload: any, options: any) => {
        capturedAbortSignal = options.abortSignal
        emitLateEvent = options.onStreamEvent
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-renderer-watchdog-1',
          toolName: 'codex',
          args: '{}',
          toolCallType: 'function',
        })
        markStreamStarted()

        await new Promise<void>((_resolve, reject) => {
          const signal = options.abortSignal as AbortSignal
          const rejectOnAbort = () => reject(signal.reason ?? new Error('renderer-owned stream was aborted'))
          if (signal.aborted) {
            rejectOnAbort()
            return
          }
          signal.addEventListener('abort', rejectOnAbort, { once: true })
        })
      })
      installAlicizationBridge({
        streamChat,
        streamLifecycleOwner: 'renderer',
      })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('请用 Codex 检查仓库', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await streamStarted
      await vi.advanceTimersByTimeAsync(45_000)
      await pending

      expect(chatAbortMock).toHaveBeenCalledWith(expect.objectContaining({
        reason: 'stream-timeout',
      }))
      expect(capturedAbortSignal?.aborted).toBe(true)
      expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
        assistantText: 'Provider 等待首个响应超时（mock-provider / mock-model）。',
      }))

      await emitLateEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await emitLateEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        fullText,
        finishReason: 'stop',
      })

      const persistedAssistantTexts = appendConversationTurnMock.mock.calls
        .map(call => String((call[0] as any)?.assistantText ?? ''))
      expect(persistedAssistantTexts).not.toContain(reply)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('labels liveness-only tool heartbeats as no new semantic progress', async () => {
    const reply = 'Codex 已经完成检查。'
    const fullText = createProviderFullText(reply)
    let releaseStream!: () => void
    let markProgressObserved!: () => void
    const progressObserved = new Promise<void>((resolve) => {
      markProgressObserved = resolve
    })
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-codex-progress-ui-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'tool-codex-progress-ui-1',
        toolName: 'codex',
        phase: 'running',
        signal: 'liveness',
        elapsedMs: 10_000,
        timeoutMs: 120_000,
        occurredAt: 1_710_000_000_000,
      })
      markProgressObserved()
      await streamGate
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-codex-progress-ui-1',
        result: {
          status: 'completed',
          output: '完成',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await progressObserved

    expect(streamingMessage.value.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'execution-status',
        phase: 'tool-running',
        toolCallId: 'tool-codex-progress-ui-1',
        elapsedMs: 10_000,
        timeoutMs: 120_000,
      }),
    ]))
    expect(streamingMessage.value.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: expect.stringContaining('暂时没有新进展'),
      }),
    ]))

    releaseStream()
    await pending
  })

  it('shows the selected coding-agent channel from the unified facade before the result arrives', async () => {
    const reply = '我已经完成了检查。'
    const fullText = createProviderFullText(reply)
    let releaseStream!: () => void
    let markProgressObserved!: () => void
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const progressObserved = new Promise<void>((resolve) => {
      markProgressObserved = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'coding-agent-facade-codex-1',
        toolName: 'coding_agent',
        selectedChannel: 'codex',
        args: JSON.stringify({
          agent: 'codex',
          prompt: '检查当前仓库',
        }),
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'coding-agent-facade-codex-1',
        toolName: 'coding_agent',
        selectedChannel: 'codex',
        phase: 'running',
        signal: 'semantic-progress',
        elapsedMs: 2_000,
        summary: '正在检查仓库',
      })
      markProgressObserved()
      await streamGate
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'coding-agent-facade-codex-1',
        toolName: 'coding_agent',
        result: {
          status: 'completed',
          selectedChannel: 'codex',
          summary: '检查完成',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await progressObserved

    expect(streamingMessage.value.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'execution-status',
        phase: 'tool-running',
        toolName: 'coding_agent',
        label: expect.stringContaining('Codex'),
      }),
    ]))

    releaseStream()
    await pending
  })

  it('uses liveness-only tool heartbeats to keep a renderer-owned stream alive', async () => {
    vi.useFakeTimers()
    try {
      const reply = 'Codex 的长任务最终完成了。'
      const fullText = createProviderFullText(reply)
      let releaseStream!: () => void
      const streamGate = new Promise<void>((resolve) => {
        releaseStream = resolve
      })
      const streamChat = vi.fn(async (_payload: any, options: any) => {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-codex-liveness-watchdog-1',
          toolName: 'codex',
          args: '{}',
          toolCallType: 'function',
        })
        for (const elapsedMs of [10_000, 20_000, 30_000]) {
          await new Promise(resolve => setTimeout(resolve, 10_000))
          await options.onStreamEvent?.({
            type: 'tool-progress',
            toolCallId: 'tool-codex-liveness-watchdog-1',
            toolName: 'codex',
            phase: 'running',
            signal: 'liveness',
            elapsedMs,
          })
        }
        await streamGate
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-codex-liveness-watchdog-1',
          result: {
            status: 'completed',
            output: '完成',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: reply,
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          failureSurface: null,
        })
        await options.onStreamEvent?.({
          type: 'finish',
          origin: 'provider',
          learningPolicy: providerLearningPolicy(),
          fullText,
          finishReason: 'stop',
        })
      })
      installAlicizationBridge({ streamChat, streamLifecycleOwner: 'renderer' })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('请用 Codex 检查仓库', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await vi.advanceTimersByTimeAsync(30_000)
      await vi.advanceTimersByTimeAsync(20_000)
      expect(chatAbortMock).not.toHaveBeenCalled()

      releaseStream()
      await vi.advanceTimersByTimeAsync(0)
      await pending
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('does not resurrect a terminal execution status from a late liveness event', async () => {
    const reply = 'Codex 已经完成检查。'
    const fullText = createProviderFullText(reply)
    let releaseStream!: () => void
    let lateEventObserved!: () => void
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const lateEvent = new Promise<void>((resolve) => {
      lateEventObserved = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-codex-terminal-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-codex-terminal-1',
        result: {
          status: 'completed',
          output: '完成',
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'tool-codex-terminal-1',
        toolName: 'codex',
        phase: 'running',
        signal: 'liveness',
        elapsedMs: 180_000,
        timeoutMs: 120_000,
      })
      lateEventObserved()
      await streamGate
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await lateEvent
    const executionStatuses = streamingMessage.value.slices.filter((slice: any) => slice.type === 'execution-status')

    expect(executionStatuses).toHaveLength(1)
    expect(executionStatuses[0]).toMatchObject({
      phase: 'completed',
      toolCallId: 'tool-codex-terminal-1',
    })

    releaseStream()
    await pending
  })

  it('uses the main projection phase when a result status conflicts with it', async () => {
    const reply = 'Codex 仍在继续。'
    const fullText = createProviderFullText(reply)
    let releaseStream!: () => void
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-canonical-phase-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'tool-canonical-phase-1',
        toolName: 'codex',
        phase: 'running',
        signal: 'semantic-progress',
        elapsedMs: 100,
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-canonical-phase-1',
        toolName: 'codex',
        projection: {
          factType: 'tool-result',
          accepted: true,
          traceOnly: false,
          card: {
            toolCallId: 'tool-canonical-phase-1',
            toolName: 'codex',
            selectedChannel: 'codex',
            phase: 'completed',
            terminal: true,
            revision: 3,
            elapsedMs: 100,
            timeoutMs: null,
            errorCode: null,
            errorMessage: null,
            step: null,
            result: {
              status: 'failed',
              errorCode: 'LEGACY_CONFLICT',
            },
          },
        },
        result: {
          status: 'failed',
          errorCode: 'LEGACY_CONFLICT',
        },
      })
      await streamGate
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('请继续执行', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await vi.waitFor(() => {
      expect(streamingMessage.value.slices).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'execution-status',
          toolCallId: 'tool-canonical-phase-1',
          phase: 'completed',
        }),
      ]))
    })

    releaseStream()
    await pending
  })

  it('does not guess that different canonical toolCallIds belong to one execution', async () => {
    const reply = 'Codex 已经完成检查。'
    const fullText = createProviderFullText(reply)
    let releaseStream!: () => void
    let lateEventObserved!: () => void
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const lateEvent = new Promise<void>((resolve) => {
      lateEventObserved = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'provider-tool-call-a',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'provider-tool-call-a',
        toolName: 'codex',
        phase: 'running',
        signal: 'semantic-progress',
        elapsedMs: 100,
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'executor-tool-call-b',
        toolName: 'codex',
        phase: 'running',
        signal: 'liveness',
        elapsedMs: 200,
      })
      lateEventObserved()
      await streamGate
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'provider-result-c',
        toolName: 'codex',
        result: {
          status: 'completed',
          output: '完成',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await lateEvent
    const executionStatuses = streamingMessage.value.slices
      .filter((slice: any) => slice.type === 'execution-status')

    expect(executionStatuses).toHaveLength(2)
    expect(executionStatuses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        phase: 'tool-running',
        toolCallId: 'provider-tool-call-a',
        toolName: 'codex',
        signal: 'semantic-progress',
      }),
      expect.objectContaining({
        phase: 'tool-running',
        toolCallId: 'executor-tool-call-b',
        toolName: 'codex',
        signal: 'liveness',
      }),
    ]))

    releaseStream()
    await pending
  })

  it('keeps repeated canonical execution facts on one card and preserves the tool failure surface', async () => {
    let markResultObserved!: () => void
    const resultObserved = new Promise<void>((resolve) => {
      markResultObserved = resolve
    })
    let releaseStream!: () => void
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      for (let index = 0; index < 3; index += 1) {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'canonical-codex-failure-1',
          toolName: 'codex',
          args: '{}',
          toolCallType: 'function',
        })
      }
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'canonical-codex-failure-1',
        toolName: 'codex',
        phase: 'running',
        signal: 'liveness',
        elapsedMs: 29_000,
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'canonical-codex-failure-1',
        toolName: 'codex',
        result: {
          status: 'failed',
          finalStatus: 'failed',
          continuationPolicy: 'stop',
          failureKind: 'tool-execution',
          toolName: 'codex',
          errorCode: 'CODEX_TIMEOUT',
          errorMessage: 'Codex execution exceeded its configured deadline.',
          summary: 'Codex execution exceeded its configured deadline.',
        },
      })
      markResultObserved()
      await streamGate
      throw Object.assign(new Error('Codex execution exceeded its configured deadline.'), {
        name: 'AlicizationToolExecutionError',
        failureKind: 'tool-execution',
        toolName: 'codex',
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'Codex execution exceeded its configured deadline.',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('你试试用codex看看我电脑有哪些垃圾文件可以清理', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await resultObserved
    await vi.waitFor(() => {
      expect(
        streamingMessage.value.slices
          .filter((slice: any) => slice.type === 'execution-status'),
      ).toEqual([
        expect.objectContaining({
          phase: 'tool-timeout',
          toolName: 'codex',
        }),
      ])
    })
    const executionStatuses = streamingMessage.value.slices
      .filter((slice: any) => slice.type === 'execution-status')

    expect(executionStatuses).toHaveLength(1)
    expect(executionStatuses[0]).toMatchObject({
      phase: 'tool-timeout',
      toolName: 'codex',
    })

    releaseStream()
    await pending

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted).toMatchObject({
      structured: {
        origin: 'failure-surface',
        failureSurface: {
          kind: 'tool-execution',
          toolExecution: {
            code: 'CODEX_TIMEOUT',
            toolName: 'codex',
          },
        },
      },
    })
    expect(
      ensureSessionMessages('session-test')
        .filter(message => message.role === 'assistant')
        .filter(message => message.structured?.failureSurface?.kind === 'provider-output-invalid'),
    ).toHaveLength(0)
  })

  it('does not resurrect a failed execution status from late running or semantic progress', async () => {
    const reply = 'Codex 已经透明报告失败。'
    const fullText = createProviderFullText(reply)
    let releaseStream!: () => void
    let lateEventsObserved!: () => void
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const lateEvents = new Promise<void>((resolve) => {
      lateEventsObserved = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-codex-failed-terminal-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-codex-failed-terminal-1',
        result: {
          status: 'failed',
          errorCode: 'CODEX_ACTIVE_STEP_TIMEOUT',
          errorMessage: 'Codex active command exceeded its execution deadline.',
          summary: 'Codex active command exceeded its execution deadline.',
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'tool-codex-failed-terminal-1',
        toolName: 'codex',
        phase: 'running',
        signal: 'liveness',
        elapsedMs: 180_000,
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'tool-codex-failed-terminal-1',
        toolName: 'codex',
        phase: 'running',
        signal: 'semantic-progress',
        elapsedMs: 181_000,
      })
      lateEventsObserved()
      await streamGate
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await lateEvents
    const executionStatuses = streamingMessage.value.slices.filter((slice: any) => slice.type === 'execution-status')

    expect(executionStatuses).toHaveLength(1)
    expect(executionStatuses[0]).toMatchObject({
      phase: 'tool-timeout',
      toolCallId: 'tool-codex-failed-terminal-1',
    })

    releaseStream()
    await pending
  })

  it('shows normalized Codex semantic progress instead of a generic running template', async () => {
    const reply = 'Codex 已经完成检查。'
    const fullText = createProviderFullText(reply)
    let releaseStream!: () => void
    let releaseResult!: () => void
    let markProgressObserved!: () => void
    let markResultObserved!: () => void
    const progressObserved = new Promise<void>((resolve) => {
      markProgressObserved = resolve
    })
    const resultObserved = new Promise<void>((resolve) => {
      markResultObserved = resolve
    })
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const resultGate = new Promise<void>((resolve) => {
      releaseResult = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-codex-semantic-ui-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'tool-codex-semantic-ui-1',
        toolName: 'codex',
        phase: 'running',
        signal: 'semantic-progress',
        elapsedMs: 2_000,
        occurredAt: 1_710_000_000_000,
        adapterEventType: 'item.completed',
        itemType: 'command_execution',
        summary: 'Codex command completed: git status --short',
        command: 'git status --short',
        commandStatus: 'completed',
        commandExitCode: 0,
        outputPreview: '## main...origin/main',
      })
      markProgressObserved()
      await streamGate
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-codex-semantic-ui-1',
        result: {
          status: 'completed',
          output: '完成',
        },
      })
      markResultObserved()
      await resultGate
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await progressObserved

    expect(streamingMessage.value.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'execution-status',
        phase: 'tool-running',
        toolCallId: 'tool-codex-semantic-ui-1',
        label: expect.stringContaining('已完成命令'),
        command: 'git status --short',
        commandStatus: 'completed',
        commandExitCode: 0,
        outputPreview: '## main...origin/main',
      }),
    ]))
    expect(streamingMessage.value.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: expect.stringContaining('git status --short'),
      }),
    ]))

    releaseStream()
    await resultObserved

    expect(streamingMessage.value.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'execution-status',
        phase: 'completed',
        toolCallId: 'tool-codex-semantic-ui-1',
        command: 'git status --short',
        commandStatus: 'completed',
        commandExitCode: 0,
        outputPreview: '## main...origin/main',
      }),
    ]))

    releaseResult()
    await pending
  })

  it('retries once without tools when the provider rejects tool support before progress', async () => {
    const reply = '普通文本也可以继续完成。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      if (streamChat.mock.calls.length === 1)
        throw new Error('provider does not support tools')

      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamChat).toHaveBeenCalledTimes(2)
    expect(streamChat.mock.calls[0]?.[0]).toMatchObject({
      supportsTools: true,
      waitForTools: true,
    })
    expect(streamChat.mock.calls[1]?.[0]).toMatchObject({
      supportsTools: false,
      waitForTools: false,
    })
    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: reply,
    }))
  })

  it('retries a tool-bearing HTTP 400 once without tools and clears the failed attempt surface', async () => {
    const reply = '没有工具也可以继续聊天。'
    const fullText = createProviderFullText(reply)
    const providerFailure = resolveAlicizationChatFailureSurface({
      kind: 'provider-request',
      userText: '你好',
      providerRequest: {
        providerId: 'openai-compatible',
        model: 'gpt-5.4-mini',
        status: 400,
        code: 'invalid_request_error',
        message: 'Upstream request failed.',
      },
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      if (streamChat.mock.calls.length === 1) {
        await options.onStreamEvent?.({
          type: 'error',
          error: providerFailure.reply,
          origin: 'failure-surface',
          learningPolicy: {
            allowLongTermCondensation: false,
            allowPersonaLearning: false,
            allowTraining: false,
          },
          failureSurface: providerFailure,
        })
        throw new Error(
          'Remote sent 400 response: {"error":{"message":"Upstream request failed.","type":"invalid_request_error"}}',
        )
      }

      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'gpt-5.4-mini',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamChat).toHaveBeenCalledTimes(2)
    expect(streamChat.mock.calls[0]?.[0]).toMatchObject({
      supportsTools: true,
      waitForTools: true,
    })
    expect(streamChat.mock.calls[1]?.[0]).toMatchObject({
      supportsTools: false,
      waitForTools: false,
    })
    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: reply,
      structured: expect.objectContaining({
        origin: 'provider',
      }),
    }))
    expect(appendConversationTurnMock.mock.calls.at(-1)?.[0]?.structured.failureSurface).toBeUndefined()
  })

  it('does not persist a false tool capability observation when the no-tools retry also fails', async () => {
    const streamChat = vi.fn(async () => {
      throw new Error(
        'Remote sent 400 response: {"error":{"message":"Upstream request failed.","type":"invalid_request_error"}}',
      )
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'model-unavailable',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamChat).toHaveBeenCalledTimes(2)
    const storageKey = [
      'alicization/provider-tool-capability/v1',
      encodeURIComponent('mock-provider'),
      encodeURIComponent('model-unavailable'),
    ].join('/')
    expect(localStorageEntries.has(storageKey)).toBe(false)
    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        origin: 'failure-surface',
        failureSurface: expect.objectContaining({
          kind: 'provider-request',
          providerRequest: expect.objectContaining({
            status: 400,
            code: 'invalid_request_error',
          }),
        }),
      }),
    }))
  })

  it('quarantines a provider reply that follows a failed tool result', async () => {
    const providerReply = 'Codex 没有成功，但我会假装已经完成。'
    const fullText = createProviderFullText(providerReply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'codex-failed-1',
        toolName: 'codex',
        arguments: {
          prompt: '检查当前仓库',
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'codex-failed-1',
        result: JSON.stringify({
          status: 'failed',
          stage: 'tool',
          failureKind: 'tool-execution',
          toolName: 'codex',
          errorCode: 'CODEX_TIMEOUT',
          errorMessage: 'Codex timed out after 120000ms.',
          summary: 'codex failed: Codex timed out after 120000ms.',
          output: null,
        }),
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: fullText,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 Codex 检查当前仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.assistantText).toContain('Codex')
    expect(persisted.assistantText).not.toContain(providerReply)
    expect(persisted.structured).toMatchObject({
      origin: 'failure-surface',
      failureSurface: {
        kind: 'tool-execution',
        toolExecution: {
          toolName: 'codex',
          code: 'CODEX_TIMEOUT',
        },
      },
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
    })
  })

  it('does not turn a tool-call display hook failure into a chat stream failure', async () => {
    const reply = 'Codex 已完成检查。'
    const fullText = createProviderFullText(reply)
    hookCapture.toolCallError = new Error('tool card renderer failed')
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'codex-hook-error-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'codex-hook-error-1',
        result: {
          status: 'completed',
          output: '检查完成',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.assistantText).toBe(reply)
    expect(persisted.structured.origin).toBe('provider')
    expect(appendAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      category: 'alicization.chat',
      action: 'stream-side-effect-failed',
    }))
  })

  it('does not finalize the turn when a real tool projection queue handler fails', async () => {
    const reply = 'Provider 回复不应该在工具投影失败后提交。'
    const fullText = createProviderFullText(reply)
    const queueFailure = new Error('tool projection slice write failed')
    chatToolProjectionMocks.failure = {
      error: queueFailure,
      toolCallId: 'codex-queue-handler-error-1',
    }

    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'codex-queue-handler-error-1',
        toolName: 'custom_tool',
        projection: {
          factType: 'tool-call',
          accepted: true,
          traceOnly: false,
          card: {
            toolCallId: 'codex-queue-handler-error-1',
            toolName: 'custom_tool',
            selectedChannel: null,
            phase: 'started',
            terminal: false,
            revision: 1,
            elapsedMs: null,
            timeoutMs: null,
            errorCode: null,
            errorMessage: null,
            step: null,
            result: undefined,
          },
        },
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.assistantText).not.toBe(reply)
    expect(persisted.structured.origin).toBe('failure-surface')
    expect(persisted.structured.failureSurface).toMatchObject({
      kind: 'tool-execution',
      toolExecution: {
        code: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
      },
    })
    expect(appendAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      category: 'alicization.chat',
      action: 'tool-projection-drain-failed',
      payload: expect.objectContaining({
        errorCode: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
        eventType: 'tool-call',
        toolCallId: 'codex-queue-handler-error-1',
      }),
    }))
  })

  it('rejects desktop turn settlement when a tool fact has no canonical projection', async () => {
    const providerReply = 'Provider 回复不应该被投影协议错误吞掉。'
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      let projectionError: unknown
      try {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'desktop-missing-projection-1',
          toolName: 'custom_tool',
          projection: {} as any,
          args: '{}',
          toolCallType: 'function',
        })
      }
      catch (error) {
        projectionError = error
      }
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: providerReply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      if (projectionError)
        throw projectionError
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('请调用工具', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.assistantText).not.toBe(providerReply)
    expect(persisted.structured.origin).toBe('failure-surface')
    expect(persisted.structured.failureSurface).toMatchObject({
      kind: 'tool-execution',
      toolExecution: {
        code: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
      },
    })
    expect(appendAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      category: 'alicization.chat',
      action: 'tool-projection-delivery-failed',
      payload: expect.objectContaining({
        errorCode: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
        eventType: 'tool-call',
        toolCallId: 'desktop-missing-projection-1',
      }),
    }))
  })

  it('keeps the Provider failure ahead of a queued tool projection handler failure', async () => {
    const queueFailure = new Error('tool projection slice write failed')
    chatToolProjectionMocks.failure = {
      error: queueFailure,
      toolCallId: 'provider-priority-queue-error-1',
    }
    appendAuditLogMock.mockRejectedValue(new Error('audit persistence failed'))
    const providerFailure = resolveAlicizationChatFailureSurface({
      kind: 'provider-request',
      userText: '请调用工具',
      providerRequest: {
        providerId: 'mock-provider',
        model: 'mock-model',
        status: 503,
        code: 'provider_unavailable',
        message: 'Provider unavailable.',
      },
    })
    const providerError = new Error(
      'Remote sent 503 response: {"error":{"message":"Provider unavailable.","code":"provider_unavailable"}}',
    )
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'provider-priority-queue-error-1',
        toolName: 'custom_tool',
        projection: {
          factType: 'tool-call',
          accepted: true,
          traceOnly: false,
          card: {
            toolCallId: 'provider-priority-queue-error-1',
            toolName: 'custom_tool',
            selectedChannel: null,
            phase: 'started',
            terminal: false,
            revision: 1,
            elapsedMs: null,
            timeoutMs: null,
            errorCode: null,
            errorMessage: null,
            step: null,
            result: undefined,
          },
        },
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'error',
        error: providerFailure.reply,
        origin: 'failure-surface',
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
        failureSurface: providerFailure,
      })
      throw providerError
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('请调用工具', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.structured).toMatchObject({
      origin: 'failure-surface',
      failureSurface: {
        kind: 'provider-request',
        providerRequest: {
          status: 503,
          code: 'provider_unavailable',
        },
      },
    })
    expect(persisted.structured.failureSurface).not.toHaveProperty(
      'code',
      'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
    )
  })

  it('keeps the provider reply when both a tool display hook and audit persistence fail', async () => {
    const reply = '工具卡和审计都失败时，模型回复仍然完成。'
    const fullText = createProviderFullText(reply)
    hookCapture.toolCallError = new Error('tool card renderer failed')
    appendAuditLogMock.mockRejectedValue(new Error('audit storage failed'))
    let toolDeliveryRejected = false
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      try {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'codex-double-side-effect-error-1',
          toolName: 'codex',
          projection: {
            factType: 'tool-call',
            accepted: true,
            traceOnly: false,
            card: {
              toolCallId: 'codex-double-side-effect-error-1',
              toolName: 'codex',
              selectedChannel: 'codex',
              phase: 'started',
              terminal: false,
              revision: 1,
              elapsedMs: null,
              timeoutMs: null,
              errorCode: null,
              errorMessage: null,
              step: null,
              result: undefined,
            },
          },
          args: '{}',
          toolCallType: 'function',
        })
      }
      catch {
        toolDeliveryRejected = true
      }
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(toolDeliveryRejected).toBe(false)
    expect(persisted.assistantText).toBe(reply)
    expect(persisted.structured.origin).toBe('provider')
  })

  it('persists provider tool rejection per provider and model without contaminating another model', async () => {
    const reply = '普通文本继续完成。'
    const fullText = createProviderFullText(reply)
    let rejectNextToolsProbe = true
    const streamChat = vi.fn(async (payload: any, options: any) => {
      if (
        payload.model === 'model-without-tools'
        && payload.supportsTools === true
        && rejectNextToolsProbe
      ) {
        rejectNextToolsProbe = false
        throw new Error('provider does not support tools')
      }

      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('第一轮', {
      model: 'model-without-tools',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const rejectedToolsStorageKey = [
      'alicization/provider-tool-capability/v1',
      encodeURIComponent('mock-provider'),
      encodeURIComponent('model-without-tools'),
    ].join('/')
    expect(localStorageEntries.get(rejectedToolsStorageKey)).toEqual(expect.stringContaining('"supported":false'))

    await store.ingest('第二轮', {
      model: 'model-without-tools',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })
    await store.ingest('另一个模型', {
      model: 'model-with-tools',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamChat).toHaveBeenCalledTimes(4)
    expect(streamChat.mock.calls[0]?.[0]).toMatchObject({
      model: 'model-without-tools',
      supportsTools: true,
    })
    expect(streamChat.mock.calls[1]?.[0]).toMatchObject({
      model: 'model-without-tools',
      supportsTools: false,
      providerToolCapabilityObservation: {
        supported: false,
        source: 'observed-provider-error',
        lastError: 'provider-tools-unsupported',
      },
    })
    expect(streamChat.mock.calls[2]?.[0]).toMatchObject({
      model: 'model-without-tools',
      supportsTools: true,
      waitForTools: true,
      providerToolCapabilityObservation: {
        supported: false,
        source: 'observed-provider-error',
      },
    })
    expect(streamChat.mock.calls[3]?.[0]).toMatchObject({
      model: 'model-with-tools',
      supportsTools: true,
    })
    expect(streamChat.mock.calls[3]?.[0]).not.toHaveProperty('providerToolCapabilityObservation')
  })

  it('keeps persisted tool capability diagnostics sanitized while reprobeing tools', async () => {
    const storageKey = [
      'alicization/provider-tool-capability/v1',
      encodeURIComponent('mock-provider'),
      encodeURIComponent('model-without-tools'),
    ].join('/')
    localStorageEntries.set(storageKey, JSON.stringify({
      supported: false,
      source: 'observed-provider-error',
      checkedAt: Date.now(),
      lastError: 'Authorization: Bearer secret-token user_input=private-message',
    }))
    const reply = '普通对话继续。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'model-without-tools',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const payload = streamChat.mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      supportsTools: true,
      waitForTools: true,
      providerToolCapabilityObservation: {
        supported: false,
        source: 'observed-provider-error',
        lastError: 'provider-tools-unsupported',
      },
    })
    expect(JSON.stringify(payload)).not.toContain('secret-token')
    expect(JSON.stringify(payload)).not.toContain('private-message')
  })

  it('reprobes tools after a negative provider capability observation expires', async () => {
    const storageKey = [
      'alicization/provider-tool-capability/v1',
      encodeURIComponent('mock-provider'),
      encodeURIComponent('model-recovered-tools'),
    ].join('/')
    localStorageEntries.set(storageKey, JSON.stringify({
      supported: false,
      source: 'observed-provider-error',
      checkedAt: Date.now() - 24 * 60 * 60 * 1000 - 1,
      lastError: 'provider-tools-unsupported',
    }))
    const reply = '工具能力已重新探测。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续', {
      model: 'model-recovered-tools',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamChat.mock.calls[0]?.[0]).toMatchObject({
      supportsTools: true,
      waitForTools: true,
    })
    expect(streamChat.mock.calls[0]?.[0]).not.toHaveProperty('providerToolCapabilityObservation')
  })

  it('records a successful tools-enabled turn as provider-model capability evidence', async () => {
    const reply = '这轮成功完成。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('第一轮', {
      model: 'model-with-tools',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })
    await store.ingest('第二轮', {
      model: 'model-with-tools',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamChat).toHaveBeenCalledTimes(2)
    expect(streamChat.mock.calls[0]?.[0]).not.toHaveProperty('providerToolCapabilityObservation')
    expect(streamChat.mock.calls[1]?.[0]).toMatchObject({
      supportsTools: true,
      providerToolCapabilityObservation: {
        supported: true,
        source: 'observed-provider-success',
        lastError: null,
      },
    })
  })

  it('settles provider-authored text deltas when the bridge finish event loses fullText', async () => {
    const reply = '我已经从短期记忆和长期记忆里接住这轮对话了。'
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(streamChat).toHaveBeenCalledTimes(1)
    expect(persisted.assistantText).toBe(reply)
    expect(persisted.structured).toMatchObject({
      parsePath: 'fallback',
      origin: 'provider',
      reply,
      contractFailed: false,
      learningPolicy: providerLearningPolicy(),
    })
    expect(persisted.structured.failureSurface).toBeUndefined()
  })

  it('trusts runtime-approved visible text when finish fullText only contains a partial provider object', async () => {
    const reply = '你好，我在。'
    const partialFullText = JSON.stringify({ reply })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText: partialFullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(streamChat).toHaveBeenCalledTimes(1)
    expect(persisted.assistantText).toBe(reply)
    expect(persisted.structured).toMatchObject({
      parsePath: 'fallback',
      origin: 'provider',
      reply,
      contractFailed: false,
      learningPolicy: providerLearningPolicy(),
    })
    expect(persisted.structured.failureSurface).toBeUndefined()
  })

  it('keeps structured transport fragments blocked when finish fullText is missing', async () => {
    const fragment = '{"format":"mind-turn-v1","thought":"internal'
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: fragment,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted).toMatchObject({
      structured: {
        origin: 'failure-surface',
        failureSurface: {
          kind: 'provider-output-invalid',
        },
      },
    })
    expect(persisted.assistantText).not.toContain(fragment)
  })

  it('keeps a provider-authored reply when optional structured fields are incomplete', async () => {
    const reply = '你好，我在。我们可以直接聊，不需要先满足一份内部结构。'
    const fullText = JSON.stringify({
      format: 'mind-turn-v1',
      reply,
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.assistantText).toBe(reply)
    expect(persisted.structured).toMatchObject({
      origin: 'provider',
      reply,
      contractFailed: false,
    })
    expect(persisted.structured.failureSurface).toBeUndefined()
  })

  it('shows and persists memory side failures without replacing the Provider reply', async () => {
    const reply = '这是主进程 Provider 根据当前可用记忆生成的回复。'
    const fullText = createProviderFullText(reply)
    const memoryFailure = {
      kind: 'recall-failure',
      reply: '本轮长期记忆召回失败。',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
      nonHumanAuthoredStatus: 'direct-infra-repair:recall-failure',
      visibleReplySource: 'infrastructure-failure',
      excludeFromPersonaLearning: true,
      excludeFromMemoryCondensation: true,
      auditCategory: 'alicization.chat-failure',
      stage: 'long-term-memory-recall',
      cardId: 'default',
      turnId: 'turn-provider',
      occurredAt: 10,
      errorSummary: 'recall offline',
    } as const
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
        memoryFailures: [memoryFailure],
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.assistantText).toBe(reply)
    expect(persisted.structured.memoryFailures).toEqual([memoryFailure])
    const visibleFailure = ensureSessionMessages(activeSessionId.value).at(-1)
    expect(visibleFailure).toMatchObject({
      role: 'assistant',
      content: memoryFailure.reply,
      structured: {
        origin: 'failure-surface',
        failureSurface: {
          kind: 'recall-failure',
          stage: 'long-term-memory-recall',
        },
      },
    })
  })

  it.each([
    'working-memory-long-term-drain',
    'dialogue-session-mirror-commit',
    'autobiographical-memory-write',
    'persona-learning-schedule',
    'runtime-event-store',
    'memory-turn-settlement',
  ] as const)('shows and persists the %s side failure without replacing the Provider reply', async (stage) => {
    const reply = 'Provider 回复已经成功提交。'
    const fullText = createProviderFullText(reply)
    const memoryFailure = {
      kind: 'memory-persistence',
      reply: '本轮记忆持久化失败。',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
      nonHumanAuthoredStatus: 'direct-infra-repair:memory-persistence',
      visibleReplySource: 'infrastructure-failure',
      excludeFromPersonaLearning: true,
      excludeFromMemoryCondensation: true,
      auditCategory: 'alicization.chat-failure',
      stage,
      cardId: 'default',
      turnId: 'turn-provider',
      occurredAt: 10,
      errorSummary: `${stage} failed`,
    } as const
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
        memoryFailures: [memoryFailure],
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续当前对话', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.assistantText).toBe(reply)
    expect(persisted.structured.memoryFailures).toEqual([memoryFailure])
    expect(ensureSessionMessages(activeSessionId.value).at(-1)).toMatchObject({
      role: 'assistant',
      content: memoryFailure.reply,
      structured: {
        origin: 'failure-surface',
        failureSurface: {
          kind: 'memory-persistence',
          stage,
        },
      },
    })
  })

  it('persists accepted-start runtime digest metadata', async () => {
    const reply = '我会根据当前对话和记忆继续回应。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'dialogue',
          shouldProactivelySpeak: false,
          shouldProactivelyAct: false,
          continuityPressure: 0.2,
          companionshipPressure: 0.4,
          derivedMindStateBundle: {
            structured: {
              memoryUsage: {
                workingMemoryVersion: 'wm-chat-test',
                longTermEvidenceIds: ['ltm-chat-test'],
              },
            },
          },
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persistedStructured = appendConversationTurnMock.mock.calls.at(-1)?.[0]?.structured
    expect(persistedStructured?.runtimeDigest).toMatchObject({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'dialogue',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.2,
      companionshipPressure: 0.4,
    })
    expect(persistedStructured?.runtimeDigest?.derivedMindStateBundle?.structured?.memoryUsage).toEqual({
      workingMemoryVersion: 'wm-chat-test',
      longTermEvidenceIds: ['ltm-chat-test'],
    })
    expect(hookCapture.embodimentMetas.at(-1)?.runtimeDigest?.derivedMindStateBundle?.structured?.memoryUsage).toEqual({
      workingMemoryVersion: 'wm-chat-test',
      longTermEvidenceIds: ['ltm-chat-test'],
    })
  })

  it('accepts and persists governance meta without a recall suppression field', async () => {
    const reply = '我会沿着当前对话和可用记忆继续回应。'
    const fullText = createProviderFullText(reply)
    const governance = {
      turnMode: 'answer',
      truthState: 'dialogue-grounded',
      personaKernelMode: 'full',
      openingStyle: 'direct-answer',
      relationshipPosture: 'warm',
      repairState: 'none',
      labelCarryAsMemory: true,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 4,
      mustDo: [],
      mustNotDo: [],
    } as const
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        governance,
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.governance).toEqual(governance)
    expect(persisted.structured.governance).toEqual(governance)
  })

  it('accepts pretty-printed strict JSON before applying display sanitation to the reply', async () => {
    const reply = '格式化 JSON 仍然是完整的 Provider 合同。'
    const fullText = JSON.stringify(createProviderPayload(reply), null, 2)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: reply,
      structured: expect.objectContaining({
        parsePath: 'json',
        origin: 'provider',
        reply,
      }),
    }))
  })

  it('preserves provider reply whitespace in the artifact while deriving trimmed display text', async () => {
    const reply = '\n  Provider artifact 保留这段首尾空白。  \n'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: reply.trim(),
      structured: expect.objectContaining({
        parsePath: 'json',
        origin: 'provider',
        reply,
      }),
    }))
  })

  it('does not reject provider replies when the display sanitizer only normalizes whitespace', async () => {
    const reply = '你好，  我在这里。\n\n你想聊什么？'
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText: reply,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('你能为我做什么', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted.assistantText).toBe('你好， 我在这里。\n你想聊什么？')
    expect(persisted.structured).toMatchObject({
      origin: 'provider',
      contractFailed: false,
    })
    expect(persisted.structured.failureSurface).toBeUndefined()
  })

  it('routes a prose-wrapped JSON candidate without approved visible text to a transparent provider output failure', async () => {
    const providerReply = '这段 Provider 纯文本不得被保留为成功回复。'
    const fullText = `Provider preface\n${createProviderFullText(providerReply)}\nProvider suffix`
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(streamChat).toHaveBeenCalledTimes(1)
    expect(streamMock).not.toHaveBeenCalled()
    expect(persisted).toMatchObject({
      structured: {
        parsePath: 'fallback',
        contractFailed: true,
        origin: 'failure-surface',
        failureSurface: {
          kind: 'provider-output-invalid',
        },
      },
    })
    expect(persisted.assistantText).toBe(persisted.structured.failureSurface.reply)
    expect(persisted.assistantText).not.toContain(providerReply)
    expect(persisted.structured.reply).toBe(persisted.assistantText)
  })

  it.each(invalidProviderContractCases)('keeps a visible reply for %s and only fails when reply is missing', async (_label, payload) => {
    const providerReply = typeof payload.reply === 'string'
      ? payload.reply
      : '缺失 reply 的候选也不能成为 Provider artifact。'
    const fullText = JSON.stringify(payload)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('继续聊聊我们的记忆', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(streamChat).toHaveBeenCalledTimes(1)
    if (typeof payload.reply === 'string' && payload.reply.trim()) {
      expect(persisted).toMatchObject({
        structured: {
          parsePath: 'json',
          contractFailed: false,
          origin: 'provider',
          reply: providerReply,
        },
      })
      expect(persisted.structured.failureSurface).toBeUndefined()
      expect(persisted.assistantText).toBe(providerReply)
      return
    }

    expect(persisted).toMatchObject({
      structured: {
        parsePath: 'fallback',
        contractFailed: true,
        origin: 'failure-surface',
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
        failureSurface: {
          kind: 'provider-output-invalid',
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
        },
      },
    })
    expect(persisted.assistantText).toBe(persisted.structured.failureSurface.reply)
    expect(persisted.assistantText).not.toBe(providerReply)
  })

  it('persists a transported failure surface without reclassifying or rewriting it', async () => {
    const failureSurface = {
      kind: 'provider-auth',
      reply: '错误：Provider 鉴权失败。',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
      nonHumanAuthoredStatus: 'direct-infra-repair:provider-auth',
      visibleReplySource: 'infrastructure-failure',
      excludeFromPersonaLearning: true,
      excludeFromMemoryCondensation: true,
      auditCategory: 'alicization.chat-failure',
    } as const
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'error',
        error: failureSurface.reply,
        origin: failureSurface.origin,
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
        failureSurface,
      })
      throw new Error(failureSurface.reply)
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: failureSurface.reply,
      structured: expect.objectContaining({
        origin: 'failure-surface',
        failureSurface: expect.objectContaining({
          kind: 'provider-auth',
        }),
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
      }),
    }))
  })

  it('keeps the first tool failure terminal when a later Provider format failure arrives', async () => {
    const providerFailureSurface = {
      kind: 'provider-output-invalid',
      reply: '模型输出格式异常，这轮回复已拦截。',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
      nonHumanAuthoredStatus: 'direct-infra-repair:provider-output-invalid',
      visibleReplySource: 'infrastructure-failure',
      excludeFromPersonaLearning: true,
      excludeFromMemoryCondensation: true,
      auditCategory: 'alicization.chat-failure',
    } as const
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'codex-first-terminal-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'codex-first-terminal-1',
        result: {
          status: 'failed',
          finalStatus: 'failed',
          continuationPolicy: 'stop',
          failureKind: 'tool-execution',
          toolName: 'codex',
          errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
          errorMessage: 'Codex Provider reconnect attempts were exhausted.',
        },
      })
      await options.onStreamEvent?.({
        type: 'error',
        error: providerFailureSurface.reply,
        origin: providerFailureSurface.origin,
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
        failureSurface: providerFailureSurface,
      })
      throw new Error(providerFailureSurface.reply)
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted).toMatchObject({
      structured: {
        origin: 'failure-surface',
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
        failureSurface: {
          kind: 'tool-execution',
          toolExecution: {
            toolName: 'codex',
            code: 'CODEX_PROVIDER_UNAVAILABLE',
            message: 'Codex Provider reconnect attempts were exhausted.',
          },
        },
      },
    })
    expect(persisted.assistantText).toContain('CODEX_PROVIDER_UNAVAILABLE')
    expect(persisted.assistantText).not.toBe(providerFailureSurface.reply)
  })

  it('lets a later real tool failure replace an earlier provider-output-invalid surface', async () => {
    const providerFailureSurface = {
      kind: 'provider-output-invalid',
      reply: '模型输出格式异常，这轮回复已拦截。',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
      nonHumanAuthoredStatus: 'direct-infra-repair:provider-output-invalid',
      visibleReplySource: 'infrastructure-failure',
      excludeFromPersonaLearning: true,
      excludeFromMemoryCondensation: true,
      auditCategory: 'alicization.chat-failure',
    } as const
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'error',
        error: providerFailureSurface.reply,
        origin: providerFailureSurface.origin,
        learningPolicy: {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        },
        failureSurface: providerFailureSurface,
      })
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'codex-late-failure-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'codex-late-failure-1',
        result: {
          status: 'failed',
          finalStatus: 'failed',
          continuationPolicy: 'stop',
          failureKind: 'tool-execution',
          toolName: 'codex',
          errorCode: 'CODEX_TIMEOUT',
          errorMessage: 'Codex execution exceeded its configured deadline.',
        },
      })
      throw new Error(providerFailureSurface.reply)
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persisted = appendConversationTurnMock.mock.calls.at(-1)?.[0] as any
    expect(persisted).toMatchObject({
      structured: {
        origin: 'failure-surface',
        failureSurface: {
          kind: 'tool-execution',
          toolExecution: {
            toolName: 'codex',
            code: 'CODEX_TIMEOUT',
          },
        },
      },
    })
    expect(persisted.assistantText).toContain('CODEX_TIMEOUT')
    expect(persisted.assistantText).not.toBe(providerFailureSurface.reply)
  })

  it('drops trace-only late progress after canonical terminal settlement', async () => {
    const reply = 'Codex 已完成检查。'
    const fullText = createProviderFullText(reply)
    let releaseStream!: () => void
    const streamGate = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'codex-terminal-1',
        toolName: 'codex',
        args: '{}',
        toolCallType: 'function',
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'codex-terminal-1',
        toolName: 'codex',
        phase: 'completed',
        signal: 'terminal',
        elapsedMs: 1_000,
        occurredAt: 10,
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'codex-terminal-1',
        toolName: 'codex',
        phase: 'running',
        signal: 'liveness',
        elapsedMs: 1_100,
        occurredAt: 11,
      })
      await options.onStreamEvent?.({
        type: 'tool-progress',
        toolCallId: 'codex-terminal-1',
        toolName: 'codex',
        phase: 'failed',
        signal: 'terminal',
        elapsedMs: 1_200,
        occurredAt: 12,
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'Late terminal alias must not overwrite completion.',
      })
      await streamGate
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('请用 Codex 检查仓库', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })
    await vi.waitFor(() => {
      const executionStatuses = streamingMessage.value.slices.filter((slice: any) => slice.type === 'execution-status')
      expect(executionStatuses).toHaveLength(1)
    })
    expect(streamingMessage.value.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'execution-status',
        phase: 'completed',
        toolCallId: 'codex-terminal-1',
      }),
    ]))

    releaseStream()
    await pending

    const persistedAssistant = ensureSessionMessages('session-test')
      .filter(message => message.role === 'assistant')
      .at(-1)
    expect(persistedAssistant?.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'execution-status',
        phase: 'completed',
        toolCallId: 'codex-terminal-1',
      }),
    ]))
  })

  it('keeps cancellation, timeout and failure as distinct execution terminal phases', async () => {
    const reply = '执行状态已经记录。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      for (const [toolCallId, phase] of [
        ['cancelled-tool', 'cancelled'],
        ['timeout-tool', 'timeout'],
        ['failed-tool', 'failed'],
      ] as const) {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId,
          toolName: 'codex',
          args: '{}',
          toolCallType: 'function',
        })
        await options.onStreamEvent?.({
          type: 'tool-progress',
          toolCallId,
          toolName: 'codex',
          phase,
          signal: 'terminal',
          elapsedMs: 100,
          errorCode: phase === 'timeout' ? 'CODEX_TIMEOUT' : undefined,
          errorMessage: phase === 'timeout' ? 'Codex timed out.' : undefined,
        })
      }
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: reply,
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
      })
      await options.onStreamEvent?.({
        type: 'finish',
        origin: 'provider',
        learningPolicy: providerLearningPolicy(),
        failureSurface: null,
        fullText,
        finishReason: 'stop',
      })
    })
    installAlicizationBridge({ streamChat })

    const store = useChatOrchestratorStore()
    await store.ingest('请记录三个执行状态', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const persistedAssistant = ensureSessionMessages('session-test')
      .filter(message => message.role === 'assistant')
      .at(-1)
    expect(persistedAssistant?.slices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'cancelled-tool',
        phase: 'tool-cancelled',
      }),
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'timeout-tool',
        phase: 'tool-timeout',
      }),
      expect.objectContaining({
        type: 'execution-status',
        toolCallId: 'failed-tool',
        phase: 'tool-failed',
      }),
    ]))
  })

  it('uses a transparent local-runtime-unavailable surface instead of renderer direct provider fallback', async () => {
    installAlicizationBridge()

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).not.toHaveBeenCalled()
    expect(appendConversationTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        origin: 'failure-surface',
        failureSurface: expect.objectContaining({
          kind: 'local-runtime-unavailable',
        }),
      }),
    }))
  })

  it('applies kill-switch commands without writing a fixed assistant reply', async () => {
    installAlicizationBridge()

    const store = useChatOrchestratorStore()
    await store.ingest('休眠', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(suspendKillSwitchMock).toHaveBeenCalledWith({
      reason: 'user-command',
    })
    expect(ensureSessionMessages(activeSessionId.value)).toEqual([])
    expect(appendConversationTurnMock).not.toHaveBeenCalled()
    expect(streamMock).not.toHaveBeenCalled()
  })
})
