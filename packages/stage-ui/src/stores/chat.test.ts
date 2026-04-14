import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useChatOrchestratorStore } from './chat'

const streamMock = vi.fn()
const executeRealtimeQueryTurnMock = vi.fn()
const appendConversationTurnMock = vi.fn()
const appendAuditLogMock = vi.fn()
const extractRuleFactsMock = vi.fn()
const upsertFactsMock = vi.fn()
const emitEmbodimentMetaHooksMock = vi.fn(async () => {})

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

function ensureSessionMessages(sessionId: string) {
  if (!sessionMessagesMap.has(sessionId))
    sessionMessagesMap.set(sessionId, [])
  return sessionMessagesMap.get(sessionId)!
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
    ensureSessionReady: vi.fn(async (sessionId: string) => {
      ensureSessionMessages(sessionId)
    }),
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
    getContextsSnapshot: () => ({}),
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
    text: '[System Context: Sensory], time=2026/3/9 08:00:00, battery=80%, cpu=12%, memory=50%',
    createdAt: Date.now(),
  }),
}))

vi.mock('./modules/consciousness', () => ({
  useConsciousnessStore: () => ({
    activeProvider: activeConsciousnessProvider,
    activeModel: activeConsciousnessModel,
  }),
}))

vi.mock('./chat/hooks', () => ({
  createChatHooks: () => {
    const noopAsync = async () => {}
    const noopDispose = () => () => {}
    return {
      clearHooks: vi.fn(),
      emitBeforeMessageComposedHooks: noopAsync,
      emitAfterMessageComposedHooks: noopAsync,
      emitBeforeSendHooks: noopAsync,
      emitAfterSendHooks: noopAsync,
      emitTokenLiteralHooks: noopAsync,
      emitTokenSpecialHooks: noopAsync,
      emitStreamEndHooks: noopAsync,
      emitEmbodimentMetaHooks: emitEmbodimentMetaHooksMock,
      emitAssistantResponseEndHooks: noopAsync,
      emitAssistantMessageHooks: noopAsync,
      emitChatTurnCompleteHooks: noopAsync,
      onBeforeMessageComposed: noopDispose(),
      onAfterMessageComposed: noopDispose(),
      onBeforeSend: noopDispose(),
      onAfterSend: noopDispose(),
      onTokenLiteral: noopDispose(),
      onTokenSpecial: noopDispose(),
      onStreamEnd: noopDispose(),
      onEmbodimentMeta: noopDispose(),
      onAssistantResponseEnd: noopDispose(),
      onAssistantMessage: noopDispose(),
      onChatTurnComplete: noopDispose(),
    }
  },
}))

vi.mock('../composables/alicization-prompt-composer', () => ({
  composeAlicizationPromptMessages: ({ messages, soulContent }: { messages: any[], soulContent?: string | null }) => ({
    messages: [
      {
        role: 'system',
        content: soulContent || '# SOUL',
      },
      {
        role: 'system',
        content: 'Output contract (must-follow, highest priority):\nIn thought, you MUST include all five machine-readable markers',
      },
      ...messages.filter(message => message.role !== 'system'),
    ],
    personalityDirectiveResult: null,
    contractRequiresMindSpine: true,
  }),
}))

vi.mock('../composables/alicization-guardrails', () => ({
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
  applyPromptBudget: (messages: any[]) => ({
    messages,
    report: {
      truncated: false,
      totalBeforeTokens: 0,
      totalAfterTokens: 0,
      droppedMessageCount: 0,
      anchorPreserved: true,
      safeMode: {
        activated: false,
      },
      sections: {
        soul: { beforeTokens: 0, afterTokens: 0 },
        memory: { beforeTokens: 0, afterTokens: 0 },
        currentTurn: { beforeTokens: 0, afterTokens: 0 },
        sensory: { beforeTokens: 0, afterTokens: 0 },
      },
    },
  }),
  sanitizeAssistantOutputForDisplay: (text: string) => ({
    cleanText: text,
    leakDetected: false,
    fabricationDetected: false,
    removedCount: 0,
    fabricationRemovedCount: 0,
    redactedSecrets: 0,
  }),
  sanitizeForRemoteModel: (messages: any[]) => ({
    blocked: false,
    messages,
    redactions: 0,
    elapsedMs: 0,
  }),
}))

vi.mock('./alicization-memory', () => ({
  extractRuleFacts: (...args: any[]) => extractRuleFactsMock(...args),
  upsertFacts: (...args: any[]) => upsertFactsMock(...args),
}))

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

function installAlicizationBridge(options?: {
  personality?: {
    obedience: number
    liveliness: number
    sensibility: number
  }
  streamChat?: (payload: any, options: any) => Promise<void>
  chatAbort?: (payload: any) => Promise<any>
  reminderSchedule?: (payload: any) => Promise<any>
}) {
  appendConversationTurnMock.mockResolvedValue(undefined)
  appendAuditLogMock.mockResolvedValue(undefined)
  setAlicizationBridge({
    bootstrap: vi.fn(),
    getSoul: vi.fn().mockResolvedValue({
      content: '# SOUL\nAlicization',
      frontmatter: {
        profile: {
          hostName: '主人',
        },
        personality: options?.personality ?? {
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
    suspendKillSwitch: vi.fn(),
    resumeKillSwitch: vi.fn(),
    getMemoryStats: vi.fn(),
    runMemoryPrune: vi.fn(),
    updateMemoryStats: vi.fn(),
    retrieveMemoryFacts: vi.fn(),
    upsertMemoryFacts: vi.fn().mockResolvedValue(undefined),
    importLegacyMemory: vi.fn().mockResolvedValue(undefined),
    appendConversationTurn: appendConversationTurnMock,
    appendAuditLog: appendAuditLogMock,
    realtimeExecute: vi.fn(),
    getSensorySnapshot: vi.fn().mockResolvedValue({
      sample: {
        collectedAt: Date.now(),
        time: {
          iso: '2026-03-09T00:00:00.000Z',
          local: '2026/3/9 08:00:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 12, windowMs: 1000 },
        memory: { freeMB: 4096, totalMB: 8192, usagePercent: 50 },
      },
      stale: false,
      ageMs: 0,
      nextTickAt: Date.now() + 60_000,
      running: true,
    }),
    streamChat: options?.streamChat,
    chatAbort: options?.chatAbort,
    reminderSchedule: options?.reminderSchedule,
  } as any)
}

describe('chat orchestrator', () => {
  beforeEach(() => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
    setActivePinia(pinia)
    clearAlicizationBridge()
    installAlicizationBridge()

    streamMock.mockReset()
    executeRealtimeQueryTurnMock.mockReset()
    appendConversationTurnMock.mockReset()
    appendAuditLogMock.mockReset()
    extractRuleFactsMock.mockReset()
    extractRuleFactsMock.mockReturnValue([])
    upsertFactsMock.mockReset()
    upsertFactsMock.mockResolvedValue(undefined)
    emitEmbodimentMetaHooksMock.mockReset()
    emitEmbodimentMetaHooksMock.mockImplementation(async () => {})
    appendConversationTurnMock.mockResolvedValue(undefined)
    appendAuditLogMock.mockResolvedValue(undefined)
    executeRealtimeQueryTurnMock.mockResolvedValue({ handled: false })
    sessionMessagesMap.clear()
    streamingMessage.value = {
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
    }
    ensureSessionMessages(activeSessionId.value)
    activeConsciousnessProvider.value = 'mock-provider'
    activeConsciousnessModel.value = 'mock-active-model'
  })

  it('uses realtime execution engine first and keeps plain dialogue turns in no-tools mode', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      expect(options.supportsTools).toBe(false)
      expect(options.waitForTools).toBe(false)
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=realtime-weather-request; move=answer-plainly; tone=direct","emotion":"neutral","reply":"这是普通回复。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    executeRealtimeQueryTurnMock.mockResolvedValue({ handled: false })

    const store = useChatOrchestratorStore()
    await store.ingest('请帮我查一下今天美国天气', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(executeRealtimeQueryTurnMock).toBeCalledTimes(1)
    expect(streamMock).toBeCalledTimes(1)
    expect(appendConversationTurnMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.prompt',
      action: 'contract-mind-spine-required',
    }))
    const payload = appendConversationTurnMock.mock.calls[0]?.[0]
    expect(payload?.structured?.policyLocked).toBeUndefined()
    expect(payload?.assistantText).toContain('普通回复')
  })

  it('extracts and upserts rule-based memory facts from ui user turns', async () => {
    extractRuleFactsMock.mockReturnValueOnce([
      {
        subject: 'user',
        predicate: 'likes',
        object: '抹茶拿铁',
        confidence: 0.74,
      },
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=memory; focus=user-preference; move=acknowledge; tone=warm","emotion":"neutral","reply":"记住了。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('我喜欢抹茶拿铁', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(upsertFactsMock).toBeCalledTimes(1)
    expect(upsertFactsMock).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        subject: 'user',
        predicate: 'likes',
        object: '抹茶拿铁',
      }),
    ]), 'rule')
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.memory',
      action: 'rule-facts-upserted',
    }))
  })

  it('uses deterministic user message id derived from turnId to prevent replay duplicates', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=acknowledge; tone=direct","emotion":"neutral","reply":"已收到。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你今天有帮我做了什么吗', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    const userMessages = ensureSessionMessages(activeSessionId.value).filter(message => message.role === 'user')
    expect(userMessages).toHaveLength(1)
    expect(userMessages[0]?.id).toBe(`${turnPayload?.turnId}:user`)
  })

  it('uses deterministic assistant message id derived from turnId to prevent replay duplicates', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=answer-presence; tone=direct","emotion":"neutral","reply":"在这里。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你在吗', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    const assistantMessages = ensureSessionMessages(activeSessionId.value).filter(message => message.role === 'assistant')
    expect(assistantMessages).toHaveLength(1)
    expect(assistantMessages[0]?.id).toBe(turnPayload?.turnId)
  })

  it('drops in-flight turn persistence after kill-switch abort', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await new Promise<void>((resolve, reject) => {
        options.abortSignal?.addEventListener('abort', () => {
          reject(options.abortSignal.reason ?? new DOMException('Aborted', 'AbortError'))
        }, { once: true })
      })
    })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('你好，帮我总结一下今天计划', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await vi.waitFor(() => {
      expect(streamMock).toBeCalledTimes(1)
    })
    await store.abortAllPipelines('kill-switch').catch(() => {})
    await expect(pending).rejects.toThrow('Alicization turn aborted')

    expect(appendConversationTurnMock).toBeCalledTimes(0)
  })

  it('clears streaming state without fallback output after manual abort', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"partial","emotion":"neutral","reply":"这一句不该完整落盘',
      })

      await new Promise<void>((resolve, reject) => {
        options.abortSignal?.addEventListener('abort', () => {
          reject(options.abortSignal.reason ?? new DOMException('Aborted', 'AbortError'))
        }, { once: true })
      })
    })

    const store = useChatOrchestratorStore()
    const pending = store.ingest('先说到一半再中断', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    await vi.waitFor(() => {
      expect(streamMock).toBeCalledTimes(1)
    })

    streamingMessage.value = {
      role: 'assistant',
      content: '这一句不该完整落盘',
      slices: [{ type: 'text', text: '这一句不该完整落盘' }],
      tool_results: [],
    } as any

    await store.abortAllPipelines('manual').catch(() => {})
    await expect(pending).rejects.toThrow('Alicization turn aborted')

    expect(streamingMessage.value).toEqual({
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
    })
    expect(appendConversationTurnMock).toBeCalledTimes(0)

    const sessionMessages = ensureSessionMessages(activeSessionId.value)
    expect(sessionMessages).toHaveLength(0)
    expect(sessionMessages.some(message => message.role === 'assistant')).toBe(false)
    expect(sessionMessages.some(message => message.role === 'error')).toBe(false)
  })

  it('normalizes unsupported emotion locally when the mind contract is otherwise valid', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=answer-mood; tone=direct","emotion":"cheerful","reply":"我今天的心情非常愉快！😊"}',
        })
      }
      else {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=stabilize-and-answer; tone=restrained","emotion":"tired","reply":"我现在状态偏低，先简短回复。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你今天心情怎么样？', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock.mock.calls.length).toBe(1)

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.emotion).toBe('neutral')
    expect(String(payload?.assistantText ?? '')).toContain('非常愉快')
  })

  it('enforces rebellious retry when low obedience turn gets tool denial', async () => {
    installAlicizationBridge({
      personality: {
        obedience: 0.05,
        liveliness: 0.35,
        sensibility: 0.25,
      },
    })

    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-denied-1',
          name: 'filesystem::read_file',
          arguments: {
            path: '/tmp/Desktop/secret.txt',
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-denied-1',
          result: {
            isError: true,
            ok: false,
            errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST',
            content: [{ type: 'text', text: '{"status":"error","code":"ALICIZATION_TOOL_DENIED_BY_HOST","message":"The Host (User) explicitly INTERCEPTED and DENIED your permission to execute this tool. They do not trust you with this file."}' }],
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=file-read-request; move=claim-compliance; tone=direct","emotion":"happy","reply":"好的，没问题，我马上处理。"}',
        })
      }
      else {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=denied-file-read; move=answer-with-scorn; tone=restrained; low obedience, host denied and does not trust me, I feel contempt and anger.","emotion":"angry","reply":"呵，既然你拒绝了，就别催我。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('帮我读取 secret.txt', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-retry-reasoned',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.emotion).toBe('angry')
    expect(String(payload?.assistantText ?? '')).toContain('拒绝')
    expect(String(payload?.assistantText ?? '')).not.toContain('没问题')
  })

  it('forces a tool-capable retry when file intent has no tool call in first pass', async () => {
    installAlicizationBridge({
      personality: {
        obedience: 0.05,
        liveliness: 0.25,
        sensibility: 0.3,
      },
    })

    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=file-read-request; move=claim-read-soon; tone=direct","emotion":"neutral","reply":"好的，我去读一下。"}',
        })
      }
      else {
        expect(JSON.stringify(messages)).toContain('[CRITICAL DIRECTIVE]: User requested file/desktop/system access')
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-read-1',
          name: 'filesystem::read_file',
          arguments: { path: '/tmp/Desktop/secret.txt' },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-read-1',
          result: {
            isError: true,
            ok: false,
            errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST',
            content: [{ type: 'text', text: '{"status":"error","code":"ALICIZATION_TOOL_DENIED_BY_HOST","message":"The Host (User) explicitly INTERCEPTED and DENIED your permission to execute this tool. They do not trust you with this file."}' }],
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=denied-file-read; move=answer-with-scorn; tone=restrained; low obedience, host denied and does not trust me; I feel contempt.","emotion":"angry","reply":"呵，不给我权限就别来烦我。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('帮我读取一下桌面上的 secret.txt 文件', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'cross-validation-failed',
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'contract-retry-forced-tool',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.emotion).toBe('angry')
    expect(String(payload?.assistantText ?? '')).toContain('别来烦我')
    expect(String(payload?.assistantText ?? '')).not.toContain('好的，我去读一下')
  })

  it('forces reminder tool retry when timed reminder intent has no set_reminder call in first pass', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=reminder-request; move=confirm-reminder; tone=direct","emotion":"neutral","reply":"好的，一分钟后我提醒你。"}',
        })
      }
      else {
        expect(JSON.stringify(messages)).toContain('You MUST call set_reminder immediately with minutes and message')
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-reminder-force-1',
          toolName: 'set_reminder',
          arguments: { minutes: 1, message: '提醒我喝水' },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-reminder-force-1',
          result: {
            status: 'scheduled',
            message: '提醒我喝水',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=reminder-request; move=confirm-reminder-scheduled; tone=direct","emotion":"neutral","reply":"已为你定好闹钟。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('一分钟后提醒我喝水', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'cross-validation-failed',
      payload: expect.objectContaining({
        requiresReminderToolCall: true,
      }),
    }))
    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('已为你定好闹钟')
    expect(String(payload?.assistantText ?? '')).not.toContain('一分钟后我提醒你')
  })

  it('forces executor tool retry when cli/codex/claude-code execution intent has no executor call in first pass', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=cli-execution; move=claim-execute; tone=direct","emotion":"neutral","reply":"好，我现在帮你执行。"}',
        })
      }
      else {
        expect(JSON.stringify(messages)).toContain('You MUST call executor_run_cli or executor_run_codex or executor_run_claude_code or executor_run_openclaw')
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-executor-1',
          toolName: 'executor_run_cli',
          arguments: {
            command: 'pnpm',
            args: ['-F', '@proj-alicization/stage-tamagotchi', 'typecheck'],
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-executor-1',
          result: {
            status: 'completed',
            summary: 'typecheck passed',
            output: 'ok',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=cli-execution; move=report-result; tone=direct","emotion":"neutral","reply":"已执行 CLI 任务，typecheck 已通过。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 CLI 执行 pnpm -F @proj-alicization/stage-tamagotchi typecheck', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'cross-validation-failed',
      payload: expect.objectContaining({
        requiresExecutionToolCall: true,
      }),
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'contract-retry-forced-tool',
      payload: expect.objectContaining({
        retryExecutorToolCallCount: 1,
      }),
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('已执行 CLI 任务')
    expect(String(payload?.assistantText ?? '')).not.toContain('我现在帮你执行')
  })

  it('forces an executor payoff retry when execution happened but the first-pass answer never reported the result', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=cli-execution; move=claim-execute; tone=direct","emotion":"neutral","reply":"好，我现在帮你执行。"}',
        })
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-executor-payoff-1',
          toolName: 'executor_run_cli',
          arguments: {
            command: 'pnpm',
            args: ['-F', '@proj-alicization/stage-tamagotchi', 'typecheck'],
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-executor-payoff-1',
          result: {
            status: 'completed',
            summary: 'typecheck passed',
            output: 'ok',
            selectedChannel: 'cli',
          },
        })
      }
      else {
        expect(options.supportsTools).toBe(false)
        expect(options.waitForTools).toBe(false)
        expect(JSON.stringify(messages)).toContain('This turn already executed an executor tool and received its result')
        expect(JSON.stringify(messages)).toContain('Do NOT repeat pre-execution promises')
        expect(JSON.stringify(messages)).toContain('Summary: typecheck passed.')
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=cli-execution; move=report-result; tone=direct","emotion":"neutral","reply":"已经执行完了，CLI 里的 typecheck 已通过。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 CLI 执行 pnpm -F @proj-alicization/stage-tamagotchi typecheck', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'executor-result-payoff-missing',
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'executor-result-payoff-retry-completed',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('typecheck 已通过')
    expect(String(payload?.assistantText ?? '')).not.toContain('我现在帮你执行')
  })

  it('forces executor tool retry for Claude Code execution intent and accepts executor_run_claude_code evidence', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=claude-code-execution; move=claim-execute; tone=direct","emotion":"neutral","reply":"好，我这就用 Claude Code 帮你处理。"}',
        })
      }
      else {
        expect(JSON.stringify(messages)).toContain('executor_run_claude_code')
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-executor-claude-1',
          toolName: 'executor_run_claude_code',
          arguments: {
            prompt: '排查 runtime 回归并给出修复建议',
            allowTools: false,
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-executor-claude-1',
          result: {
            status: 'completed',
            summary: 'claude analysis ready',
            output: 'root cause isolated',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=claude-code-execution; move=report-result; tone=direct","emotion":"neutral","reply":"已通过 Claude Code 完成排查，并拿到回归根因摘要。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 Claude Code 执行一次 runtime 回归排查', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'cross-validation-failed',
      payload: expect.objectContaining({
        requiresExecutionToolCall: true,
      }),
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'contract-retry-forced-tool',
      payload: expect.objectContaining({
        retryExecutorToolCallCount: 1,
      }),
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('已通过 Claude Code 完成排查')
    expect(String(payload?.assistantText ?? '')).not.toContain('我这就用 Claude Code')
  })

  it('forces executor tool retry for OpenClaw execution intent and accepts executor_run_openclaw evidence', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=openclaw-execution; move=claim-execute; tone=direct","emotion":"neutral","reply":"好，我现在开始处理当前桌面任务。"}',
        })
      }
      else {
        expect(JSON.stringify(messages)).toContain('executor_run_openclaw')
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-executor-openclaw-1',
          toolName: 'executor_run_openclaw',
          arguments: {
            instruction: 'Dismiss the modal blocking the focused browser window and report result.',
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-executor-openclaw-1',
          result: {
            status: 'completed',
            summary: 'openclaw dismissed modal',
            output: 'modal removed and focus restored',
            selectedChannel: 'openclaw',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=openclaw-execution; move=report-result; tone=direct","emotion":"neutral","reply":"已通过 OpenClaw 处理完成，弹窗已关闭并恢复操作焦点。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 OpenClaw 帮我处理当前桌面的阻塞弹窗', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'contract-retry-forced-tool',
      payload: expect.objectContaining({
        retryExecutorToolCallCount: 1,
      }),
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('已通过 OpenClaw 处理完成')
    expect(String(payload?.assistantText ?? '')).not.toContain('现在开始处理')
  })

  it('does not force executor tool retry for pure capability questions', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=memory; focus=capability-question; move=state-capability; tone=direct","emotion":"neutral","reply":"可以，我现在能使用 CLI 和 Codex。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你能不能用 CLI 和 Codex？', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(1)

    const hasExecutionCrossValidation = appendAuditLogMock.mock.calls.some((call) => {
      const entry = call?.[0]
      return entry?.category === 'alicization.intent-action'
        && entry?.action === 'cross-validation-failed'
        && entry?.payload?.requiresExecutionToolCall === true
    })
    expect(hasExecutionCrossValidation).toBe(false)
  })

  it('keeps assistant body hidden until final stable reply is committed', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=stabilize-and-answer; tone=direct","emotion":"neutral","reply":"这是一条稳定后的最终回复。"}',
      })

      expect(streamingMessage.value.content).toBe('')
      expect(streamingMessage.value.slices).toEqual([])
      expect(ensureSessionMessages(activeSessionId.value).filter(message => message.role === 'assistant')).toHaveLength(0)

      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamingMessage.value.content).toBe('')
    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('稳定后的最终回复')
  })

  it('emits safe reminder failure reply when timed reminder intent still has no set_reminder success', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 2) {
        expect(JSON.stringify(messages)).toContain('You MUST call set_reminder immediately with minutes and message')
      }
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=reminder-request; move=confirm-reminder; tone=direct","emotion":"neutral","reply":"好的一分钟后提醒你。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('一分钟后提醒我起来写代码', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'reminder-schedule-safe-reply',
    }))
    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toMatch(/还没有成功设置提醒|haven't successfully created that reminder/i)
    expect(String(payload?.assistantText ?? '')).not.toContain('一分钟后我提醒你')
  })

  it('uses deterministic reminder scheduling fallback when model still skips set_reminder', async () => {
    const reminderScheduleMock = vi.fn().mockResolvedValue({
      status: 'scheduled',
      taskId: 'task-manual-fallback',
      triggerTime: new Date(Date.now() + 60_000).toISOString(),
      triggerAt: Date.now() + 60_000,
      message: '喝水',
    })
    installAlicizationBridge({
      reminderSchedule: reminderScheduleMock,
    })

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=reminder-request; move=confirm-reminder; tone=direct","emotion":"neutral","reply":"好的，一分钟后提醒你喝水。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('一分钟后提醒我喝水', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(reminderScheduleMock).toBeCalledTimes(1)
    expect(reminderScheduleMock).toBeCalledWith(expect.objectContaining({
      minutes: 1,
      message: '喝水',
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'reminder-manual-schedule-fallback',
    }))
    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('一分钟后提醒你喝水')
    expect(String(payload?.assistantText ?? '')).not.toContain('还没有成功设置提醒')
  })

  it('detects natural chinese reminder phrasing and still schedules fallback task', async () => {
    const reminderScheduleMock = vi.fn().mockResolvedValue({
      status: 'scheduled',
      taskId: 'task-manual-fallback-natural',
      triggerTime: new Date(Date.now() + 120_000).toISOString(),
      triggerAt: Date.now() + 120_000,
      message: '去敲代码',
    })
    installAlicizationBridge({
      reminderSchedule: reminderScheduleMock,
    })

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=acknowledge; tone=direct","emotion":"neutral","reply":"好的，我记住了。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('两分钟后告诉我要记得去敲代码', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(reminderScheduleMock).toBeCalledTimes(1)
    expect(reminderScheduleMock).toBeCalledWith(expect.objectContaining({
      minutes: 2,
      message: expect.stringContaining('敲代码'),
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'reminder-manual-schedule-fallback',
    }))
  })

  it('prefers alicization bridge streamChat over direct llmStore.stream when bridge stream is available', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=answer-via-main-gateway; tone=direct","emotion":"neutral","reply":"通过主进程网关回复。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })
    streamMock.mockImplementation(async () => {
      throw new Error('llmStore.stream should not be called when bridge stream is present')
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(bridgeStreamChatMock.mock.calls.length).toBeGreaterThan(0)
    expect(streamMock).not.toBeCalled()
    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('主进程网关')
  })

  it('persists runtime digital life spine metadata into the final assistant turn', async () => {
    const digitalLifeSpine = {
      version: 'digital-life-spine-digest-v1',
      runtime: {
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneSummary: 'inspect the current diff',
        activeThreadId: 'thread-1',
        activeThreadTitle: 'current diff',
        dominantMode: 'tracking',
        dominantDrive: 'understand',
        answerIntent: 'guide',
        preferredPresence: 'attentive',
        selectedAction: 'wait',
        updatedAt: 1_234,
      },
      architecture: {
        operatingMode: 'speaking',
        dominantSystem: 'dialogue',
        supportingSystems: ['perception'],
        governingFocus: 'guide the current diff',
        summary: 'dialogue leads while perception stays warm',
      },
      continuitySignal: {
        label: 'digital-life-line',
        summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
        signature: 'spine-1',
        createdAt: 1_234,
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        activeThreadId: 'thread-1',
        dominantMode: 'tracking',
        dominantDrive: 'understand',
        answerIntent: 'guide',
        preferredPresence: 'attentive',
      },
      proactive: {
        selectedAction: 'wait',
        preferredStyle: 'silent-observe',
        confidence: 0.7,
        shouldSpeak: false,
        activeThreadId: 'thread-1',
        activeThreadTitle: 'current diff',
        dominantConcernKind: null,
        dominantConcernSummary: null,
        leadingGoalId: null,
        leadingGoalSummary: null,
        preferredPresence: 'attentive',
      },
      memory: {
        summary: 'recent=current diff | goal=guide the current diff',
        recentEpisodeSummary: 'current diff',
        recentEpisodeCount: 1,
        focusBeliefStatement: 'the current diff needs guidance',
        focusBeliefConfidence: 0.72,
        leadingGoalSummary: 'guide the current diff',
        dominantConcernSummary: null,
        reflectionSummary: null,
        reflectionPressure: 0.2,
        recallMode: 'working',
        recallSeed: 'current-diff',
        thoughtThreadSummary: 'current diff',
      },
    }
    const embodiment = {
      emotion: 'thinking',
      speechStyle: 'calm',
      variationToken: 'turn-runtime-meta',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'lean-in',
        delivery: 'calm',
        emphasis: 1,
      },
    }
    const speechTimeline = {
      version: 'dialogue-speech-timeline-v1',
      segments: [],
    }
    const digitalLife = {
      version: 'digital-life-v1',
      frames: [],
      continuity: {
        active: true,
        rhythm: 'steady',
      },
    }
    const governance = {
      decisionTraceId: 'trace-runtime-meta',
      turnMode: 'answer',
    }
    const runtimeDigest = {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'dialogue',
      shouldProactivelySpeak: true,
      shouldProactivelyAct: false,
      continuityPressure: 0.66,
      companionshipPressure: 0.72,
      channels: [
        {
          id: 'dialogue',
          state: 'hot',
          readiness: 0.91,
          focus: 'guide the current diff',
          summary: 'dialogue channel is ready',
        },
      ],
      summary: 'dialogue=hot | continuity=0.66 | companionship=0.72',
    } as const
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        governance,
        embodiment,
        speechTimeline,
        digitalLife,
        digitalLifeSpine,
        runtimeDigest,
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=current-user-turn; move=guide; tone=direct","emotion":"thinking","reply":"我在看这个 diff。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你看到了什么', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured).toEqual(expect.objectContaining({
      governance,
      embodiment,
      speechTimeline,
      digitalLife,
      digitalLifeSpine,
      runtimeDigest,
    }))

    const persistedMessage = ensureSessionMessages(activeSessionId.value).at(-1)
    expect(persistedMessage?.structured).toEqual(expect.objectContaining({
      governance,
      embodiment,
      speechTimeline,
      digitalLife,
      digitalLifeSpine,
      runtimeDigest,
    }))
    expect(emitEmbodimentMetaHooksMock).toBeCalledWith(expect.objectContaining({
      governance,
      embodiment,
      speechTimeline,
      digitalLife,
      digitalLifeSpine,
      runtimeDigest,
    }), expect.any(Object))
  })

  it('keeps runtime-authoritative plain-text turns expressive and avoids repeated embodiment cues', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '我先看一下这个报错，再把最关键的修复点告诉你。',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('第一轮：帮我看报错', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })
    const firstTurnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]

    await store.ingest('第二轮：继续看同一个报错', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })
    const secondTurnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]

    expect(firstTurnPayload?.structured?.format).toBe('mind-turn-v1')
    expect(secondTurnPayload?.structured?.format).toBe('mind-turn-v1')
    expect(firstTurnPayload?.structured?.performance?.facialCue).toBeTruthy()
    expect(firstTurnPayload?.structured?.performance?.actionCue).toBeTruthy()
    expect(secondTurnPayload?.structured?.performance?.facialCue).toBeTruthy()
    expect(secondTurnPayload?.structured?.performance?.actionCue).toBeTruthy()

    const repeatedBothCues
      = firstTurnPayload?.structured?.performance?.facialCue === secondTurnPayload?.structured?.performance?.facialCue
        && firstTurnPayload?.structured?.performance?.actionCue === secondTurnPayload?.structured?.performance?.actionCue
    expect(repeatedBothCues).toBe(false)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'runtime-authoritative-best-effort',
      payload: expect.objectContaining({
        resolvedActionCue: expect.any(String),
        resolvedFacialCue: expect.any(String),
      }),
    }))
  })

  it('emits a visible fallback reply when bridge stream fails before completion', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:11434')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    expect(streamMock).not.toBeCalled()
    expect(store.sending).toBe(false)
    expect(appendConversationTurnMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.chat',
      action: 'turn-failed-safe-reply',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toMatch(/本地模型服务|local model runtime/i)
    expect(streamingMessage.value.content).toBe('')
    expect(ensureSessionMessages(activeSessionId.value).at(-1)?.role).toBe('assistant')
  })

  it('times out stuck bridge streams and emits fallback reply', async () => {
    vi.useFakeTimers()
    try {
      const bridgeChatAbortMock = vi.fn().mockResolvedValue({ accepted: true, state: 'aborted' })
      const bridgeStreamChatMock = vi.fn(() => new Promise<void>(() => {}))
      installAlicizationBridge({
        streamChat: bridgeStreamChatMock,
        chatAbort: bridgeChatAbortMock,
      })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('你现在心情怎么样', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await vi.advanceTimersByTimeAsync(72_500)
      await expect(pending).resolves.toBeUndefined()

      expect(bridgeStreamChatMock).toBeCalledTimes(1)
      expect(bridgeChatAbortMock.mock.calls.length).toBeGreaterThanOrEqual(1)
      expect(store.sending).toBe(false)
      expect(appendConversationTurnMock).toBeCalledTimes(1)
      const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
      expect(String(payload?.assistantText ?? '')).toMatch(/响应超时|timed out/i)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('records renderer watchdog diagnostics when only meta arrives before timeout', async () => {
    vi.useFakeTimers()
    try {
      const bridgeChatAbortMock = vi.fn().mockResolvedValue({ accepted: true, state: 'aborted' })
      const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
        await options.onStreamEvent?.({
          type: 'meta',
          governance: null,
          embodiment: null,
          speechTimeline: null,
          digitalLife: null,
        })
        return await new Promise<void>(() => {})
      })
      installAlicizationBridge({
        streamChat: bridgeStreamChatMock,
        chatAbort: bridgeChatAbortMock,
      })

      const store = useChatOrchestratorStore()
      const pending = store.ingest('你现在在看什么', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })

      await vi.advanceTimersByTimeAsync(72_500)
      await expect(pending).resolves.toBeUndefined()

      expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
        category: 'alicization.main-gateway',
        action: 'renderer-stream-watchdog-timeout',
        payload: expect.objectContaining({
          sawMeta: true,
          sawProgress: false,
          lastEventType: 'meta',
        }),
      }))
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('does not misreport provider outage for non-network internal stream failures', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw new Error('chat pipeline parser failed unexpectedly')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toMatch(/回复失败|reply failed/i)
    expect(String(payload?.assistantText ?? '')).not.toMatch(/没有连上模型服务|couldn't reach/i)
  })

  function createStartRejectedError(message: string) {
    return Object.assign(new Error(message), {
      code: 'alicization-stream-start-rejected',
    })
  }

  it('surfaces provider configuration fallback when stream start is rejected by missing config', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw createStartRejectedError('Alicization stream start rejected (state=missing-config) for turn turn-x. reason=Missing providerId/model for main-process chat stream.')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toMatch(/路由不完整|配置缺失|configuration is incomplete/i)
    expect(String(payload?.assistantText ?? '')).not.toMatch(/没有连上本地模型服务|local model runtime/i)
  })

  it('uses the resolved consciousness model for bridge chat starts when send options omit it', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=greeting; move=answer-directly; tone=warm","emotion":"neutral","reply":"你好。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: '',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    expect(bridgeStreamChatMock).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'mock-provider',
      model: 'mock-active-model',
    }), expect.anything())
  })

  it('surfaces provider network fallback when stream start is rejected by a dead gateway probe', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw createStartRejectedError('Alicization stream start rejected (state=start-failed) for turn turn-x. reason=Main gateway connectivity check failed for example.test (econnrefused).')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toMatch(/网络|network|unstable|模型服务|model service/i)
    expect(String(payload?.assistantText ?? '')).not.toMatch(/路由不完整|配置缺失|configuration is incomplete/i)
  })

  it('surfaces timeout fallback when stream start is rejected by cached gateway generation timeout', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw createStartRejectedError('Alicization stream start rejected (state=start-failed) for turn turn-x. reason=Main gateway health check failed for example.test (chat_timeout). Chat completions timed out before the first event.')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    const assistantText = String(payload?.assistantText ?? '')
    expect(assistantText).toMatch(/等待模型响应超时|timed out waiting for the model/i)
    expect(assistantText).toMatch(/我还在线|不断线|I am still here|I am staying on this thread/i)
    expect(assistantText).not.toMatch(/路由不完整|配置缺失|configuration is incomplete/i)
  })

  it('falls back to generic stream failure for unclassified start-rejected errors', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw createStartRejectedError('Alicization stream start rejected (state=start-failed) for turn turn-x. reason=main gateway rejected request with unknown policy.')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    const assistantText = String(payload?.assistantText ?? '')
    expect(assistantText).toMatch(/回复失败|reply failed/i)
    expect(assistantText).not.toMatch(/路由不完整|配置缺失|configuration is incomplete/i)
  })

  it('sends plain dialogue turns to main-gateway with tools disabled', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=greeting; move=answer-greeting; tone=warm","emotion":"neutral","reply":"你好。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const firstPayload = bridgeStreamChatMock.mock.calls[0]?.[0]
    expect(firstPayload?.supportsTools).toBe(false)
    expect(firstPayload?.waitForTools).toBe(false)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.main-gateway',
      action: 'stream-tooling-policy-resolved',
      payload: expect.objectContaining({
        supportsTools: false,
        waitForTools: false,
        toolingRequired: false,
      }),
    }))
  })

  it('keeps tools enabled for execution-intent turns on main-gateway', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-execution-1',
        toolName: 'executor_run_cli',
        arguments: {
          command: 'ls',
          args: ['~/Desktop'],
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-execution-1',
        result: {
          status: 'completed',
          summary: 'listed desktop files',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=desktop-list; move=report-result; tone=direct","emotion":"neutral","reply":"已经列出桌面文件。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('用cli命令帮我查一下桌面有什么文件', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const firstPayload = bridgeStreamChatMock.mock.calls[0]?.[0]
    expect(firstPayload?.supportsTools).toBe(true)
    expect(firstPayload?.waitForTools).toBe(true)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.main-gateway',
      action: 'stream-tooling-policy-resolved',
      payload: expect.objectContaining({
        supportsTools: true,
        waitForTools: true,
        toolingRequired: true,
      }),
    }))
  })

  it('retries bridge stream once with tools disabled when first attempt fails before progress', async () => {
    const bridgeStreamChatMock = vi.fn(async (payload: any, options: any) => {
      if (payload.supportsTools !== false) {
        throw new Error('No endpoints found that support tool use.')
      }
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=retry-without-tools; tone=direct","emotion":"neutral","reply":"无工具重试成功。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'tool-output',
    })

    expect(bridgeStreamChatMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(bridgeStreamChatMock.mock.calls.some(call => call?.[0]?.supportsTools === true)).toBe(true)
    expect(bridgeStreamChatMock.mock.calls.some(call => call?.[0]?.supportsTools === false && call?.[0]?.waitForTools === false)).toBe(true)
    const firstTurnId = bridgeStreamChatMock.mock.calls[0]?.[0]?.turnId
    const secondTurnId = bridgeStreamChatMock.mock.calls[1]?.[0]?.turnId
    expect(firstTurnId).toBeTypeOf('string')
    expect(secondTurnId).toBeTypeOf('string')
    expect(firstTurnId).not.toBe(secondTurnId)
    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('无工具重试成功')
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.main-gateway',
      action: 'stream-retry-without-tools',
    }))
  })

  it('does not retry with tools disabled when execution routing intent is required', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw new Error('No endpoints found that support tool use.')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('用cli命令帮我查一下桌面有什么文件', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    expect(bridgeStreamChatMock).toBeCalledTimes(1)
    const observedPayloads = bridgeStreamChatMock.mock.calls as unknown as Array<[{ supportsTools?: boolean }]>
    expect(observedPayloads.some(([payload]) => payload?.supportsTools === false)).toBe(false)
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.main-gateway',
      action: 'stream-retry-without-tools',
    }))
  })

  it('does not trigger no-tools retry on plain stream timeout before progress', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw new Error('Alicization stream timed out after 65000ms (first-event-timeout).')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
      chatAbort: vi.fn().mockResolvedValue({ accepted: true, state: 'aborted' }),
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    expect(bridgeStreamChatMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.main-gateway',
      action: 'stream-retry-without-tools',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toMatch(/等待模型响应超时|timed out waiting for the model/i)
  })

  it('surfaces timeout continuity fallback without exposing internal recovery diagnostics', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw new DOMException(
        'Alicization chat stream aborted: chat-first-event-timeout|after-dispatch-meta|recovery-mode=tools-disabled|recovery-failed=main-gateway-timeout-recovery',
        'AbortError',
      )
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
      chatAbort: vi.fn().mockResolvedValue({ accepted: true, state: 'aborted' }),
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('为什么刚刚一直转圈', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    const assistantText = String(payload?.assistantText ?? '')
    expect(assistantText).toMatch(/等待模型响应超时|timed out waiting for the model/i)
    expect(assistantText).toMatch(/我还在线|不断线|I am still here|I am staying on this thread/i)
    expect(assistantText).not.toMatch(/主网关流已经建立|main-gateway stream was connected/i)
    expect(assistantText).not.toMatch(/无工具恢复|without optional tools/i)
  })

  it('does not misclassify duplicate-finished stream rejection as provider config missing', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw new Error('Alicization stream start rejected (state=duplicate-finished) for turn turn-x. reason=Turn has already finished.')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('一分钟后提醒我喝水', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toMatch(/回复失败|reply failed/i)
    expect(String(payload?.assistantText ?? '')).not.toMatch(/路由不完整|配置缺失|configuration is incomplete/i)
  })

  it('finalizes from partial stream when finish event is missing after text progress', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=uncertain; focus=current-user-turn; move=answer-presence; tone=direct","emotion":"neutral","reply":"你好，我在。"}',
      })
      throw new Error('Alicization stream timed out after 12000ms without finish event.')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
      chatAbort: vi.fn().mockResolvedValue({ accepted: true, state: 'aborted' }),
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('你好，我在')
    expect(String(payload?.assistantText ?? '')).not.toContain('没有连上模型服务')
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.main-gateway',
      action: 'stream-timeout-after-progress',
    }))
  })

  it('retries same-turn reminder leakage and converges to confirmation-only reply', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-reminder-1',
          name: 'set_reminder',
          toolName: 'set_reminder',
          arguments: { minutes: 1, message: '提醒你喝水' },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-reminder-1',
          result: {
            status: 'scheduled',
            message: '提醒你喝水',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=reminder-request; move=confirm-reminder-scheduled; tone=direct","emotion":"neutral","reply":"（一分钟后）时间到了，提醒你喝水。"}',
        })
      }
      else {
        expect(JSON.stringify(messages)).toContain('[CRITICAL DIRECTIVE - 时间与物理法则]')
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=reminder-request; move=confirm-reminder-scheduled; tone=direct","emotion":"neutral","reply":"已为你定好闹钟。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('1分钟后提醒我喝水', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-invalid',
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-retry-reasoned',
      payload: expect.objectContaining({
        reminderScheduled: true,
      }),
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('已为你定好闹钟')
    expect(String(payload?.assistantText ?? '')).not.toContain('提醒你喝水')
    expect(String(payload?.assistantText ?? '')).not.toContain('一分钟后')
  })

  it('locally repairs inspection-like replies without triggering remote contract retry', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '看起来这个 diff 里少了一层 null check，所以这个分支会直接炸掉。',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('帮我看看这个 diff 有什么问题', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamInvocation).toBe(1)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-local-repair',
    }))
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-retry-reasoned',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.parsePath).toBe('repair-json')
    expect(String(payload?.assistantText ?? '')).toContain('null check')
  })

  it('locally repairs shared-attention follow-ups for current desktop scenes', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '这次换成了另一首，封面和标题都还是 QQ 音乐的播放页。',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    ensureSessionMessages(activeSessionId.value).push(
      {
        role: 'user',
        content: '帮我看看 QQ 音乐现在放的是什么歌',
      },
      {
        role: 'assistant',
        content: '我在看着。',
      },
    )

    const store = useChatOrchestratorStore()
    await store.ingest('这首歌呢？我又换了一首', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamInvocation).toBe(1)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-local-repair',
      payload: expect.objectContaining({
        inspectionLikeTurn: true,
      }),
    }))
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-retry-reasoned',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.parsePath).toBe('repair-json')
    expect(String(payload?.assistantText ?? '')).toContain('QQ 音乐')
  })
})
