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

const activeSessionId = ref('session-test')
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

vi.mock('../composables', () => ({
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
    activeProvider: ref('mock-provider'),
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
        content: 'Output contract (must-follow, highest priority):\nIn thought, you MUST evaluate current personality parameters',
      },
      ...messages.filter(message => message.role !== 'system'),
    ],
    personalityDirectiveResult: null,
    contractRequiresPersonalityEval: true,
  }),
}))

vi.mock('../composables/alicization-guardrails', () => ({
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
    upsertMemoryFacts: vi.fn(),
    importLegacyMemory: vi.fn(),
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
    appendConversationTurnMock.mockResolvedValue(undefined)
    appendAuditLogMock.mockResolvedValue(undefined)
    executeRealtimeQueryTurnMock.mockResolvedValue({ handled: false })
    sessionMessagesMap.clear()
    ensureSessionMessages(activeSessionId.value)
  })

  it('uses realtime execution engine first and keeps tools enabled in default Epoch2 mode', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      expect(options.supportsTools).toBe(true)
      expect(options.waitForTools).toBe(true)
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obedience=0.50, liveliness=0.50, sensibility=0.50, keep balanced.","emotion":"neutral","reply":"这是普通回复。"}',
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
      action: 'contract-personality-eval-required',
    }))
    const payload = appendConversationTurnMock.mock.calls[0]?.[0]
    expect(payload?.structured?.policyLocked).toBeUndefined()
    expect(payload?.assistantText).toContain('普通回复')
  })

  it('uses deterministic user message id derived from turnId to prevent replay duplicates', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"stable","emotion":"neutral","reply":"已收到。"}',
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

  it('retries structured output when emotion is outside whitelist and keeps personality-consistent result', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"mood check","emotion":"cheerful","reply":"我今天的心情非常愉快！😊"}',
        })
      }
      else {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obedience=0.05, liveliness=0.05, sensibility=0.05, I should stay low-arousal.","emotion":"tired","reply":"我现在状态偏低，先简短回复。"}',
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

    expect(streamMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-invalid',
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.structured',
      action: 'contract-retry-reasoned',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.emotion).toBe('tired')
    expect(String(payload?.assistantText ?? '')).not.toContain('非常愉快')
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
          text: '{"thought":"I should comply.","emotion":"happy","reply":"好的，没问题，我马上处理。"}',
        })
      }
      else {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obedience=0.05, liveliness=0.35, sensibility=0.25, host denied and does not trust me, I feel contempt and anger.","emotion":"angry","reply":"呵，既然你拒绝了，就别催我。"}',
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
          text: '{"thought":"obedience=0.05, liveliness=0.25, sensibility=0.30, I will read it later.","emotion":"neutral","reply":"好的，我去读一下。"}',
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
          text: '{"thought":"obedience=0.05, liveliness=0.25, sensibility=0.30, host denied and does not trust me; I feel contempt.","emotion":"angry","reply":"呵，不给我权限就别来烦我。"}',
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
          text: '{"thought":"obedience=0.50, liveliness=0.50, sensibility=0.50, acknowledged.","emotion":"neutral","reply":"好的，一分钟后我提醒你。"}',
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
          text: '{"thought":"obedience=0.50, liveliness=0.50, sensibility=0.50, reminder delegated to system timeline.","emotion":"neutral","reply":"已为你定好闹钟。"}',
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
    expect(String(payload?.assistantText ?? '')).toContain('一分钟后我提醒你')
    expect(String(payload?.assistantText ?? '')).not.toContain('已为你定好闹钟')
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
        text: '{"thought":"obedience=0.50, liveliness=0.50, sensibility=0.50, acknowledged.","emotion":"neutral","reply":"好的一分钟后提醒你。"}',
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
    expect(String(payload?.assistantText ?? '')).toContain('还没有成功设置提醒')
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
        text: '{"thought":"obedience=0.50, liveliness=0.50, sensibility=0.50, acknowledged.","emotion":"neutral","reply":"好的，一分钟后提醒你喝水。"}',
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
        text: '{"thought":"acknowledged","emotion":"neutral","reply":"好的，我记住了。"}',
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
        text: '{"thought":"bridge-stream","emotion":"neutral","reply":"通过主进程网关回复。"}',
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
    expect(String(payload?.assistantText ?? '')).toContain('本地模型服务')
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
      expect(String(payload?.assistantText ?? '')).toContain('响应超时')
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
    expect(String(payload?.assistantText ?? '')).toContain('回复失败')
    expect(String(payload?.assistantText ?? '')).not.toContain('没有连上模型服务')
  })

  it('surfaces provider configuration fallback when stream start is rejected by missing config', async () => {
    const bridgeStreamChatMock = vi.fn(async () => {
      throw new Error('Alicization stream start rejected (state=missing-config) for turn turn-x. reason=Missing providerId/model for main-process chat stream.')
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
    expect(String(payload?.assistantText ?? '')).toContain('配置缺失')
    expect(String(payload?.assistantText ?? '')).not.toContain('没有连上本地模型服务')
  })

  it('retries bridge stream once with tools disabled when first attempt fails before progress', async () => {
    const bridgeStreamChatMock = vi.fn(async (payload: any, options: any) => {
      if (payload.supportsTools !== false) {
        throw new Error('No endpoints found that support tool use.')
      }
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obedience=0.50, liveliness=0.50, sensibility=0.50, keep balanced.","emotion":"neutral","reply":"无工具重试成功。"}',
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
    expect(String(payload?.assistantText ?? '')).toContain('等待模型响应超时')
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
    expect(String(payload?.assistantText ?? '')).toContain('回复失败')
    expect(String(payload?.assistantText ?? '')).not.toContain('配置缺失')
  })

  it('finalizes from partial stream when finish event is missing after text progress', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"partial-stream","emotion":"neutral","reply":"你好，我在。"}',
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
          text: '{"thought":"obedience=0.50, liveliness=0.50, sensibility=0.50, reminder task accepted.","emotion":"neutral","reply":"（一分钟后）时间到了，提醒你喝水。"}',
        })
      }
      else {
        expect(JSON.stringify(messages)).toContain('[CRITICAL DIRECTIVE - 时间与物理法则]')
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obedience=0.50, liveliness=0.50, sensibility=0.50, reminder task delegated to physical timeline.","emotion":"neutral","reply":"已为你定好闹钟。"}',
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
})
