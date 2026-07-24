import { readFileSync } from 'node:fs'

import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useChatOrchestratorStore } from './chat'

const hookCapture = vi.hoisted(() => ({
  beforeSendContexts: [] as any[],
}))

const streamMock = vi.fn()
const executeRealtimeQueryTurnMock = vi.fn()
const appendConversationTurnMock = vi.fn()
const appendAuditLogMock = vi.fn()
const suspendKillSwitchMock = vi.fn()
const resumeKillSwitchMock = vi.fn()

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
      emitEmbodimentMetaHooks: noopAsync,
      emitAssistantResponseEndHooks: noopAsync,
      emitToolCallHooks: noopAsync,
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

vi.mock('../composables/alicization-prompt-composer', () => ({
  composeAlicizationPromptMessages: vi.fn(({ messages }: { messages: any[] }) => ({
    messages,
    personalityDirectiveResult: null,
  })),
}))

vi.mock('./alicization-self-evolution-inspector', () => ({
  useAlicizationSelfEvolutionInspectorStore: () => ({
    refresh: vi.fn(async () => null),
    projectStateContinuitySnapshot: null,
    preDialogueClosureSnapshot: null,
    preDialogueAwarenessSnapshot: null,
  }),
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
        sections: {},
      },
    }),
    sanitizeForRemoteModel: (messages: any[]) => ({
      blocked: false,
      messages,
      redactions: 0,
      elapsedMs: 0,
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

function installAlicizationBridge(options?: {
  streamChat?: (payload: any, options: any) => Promise<void>
}) {
  setAlicizationBridge({
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
    appendConversationTurn: appendConversationTurnMock,
    appendAuditLog: appendAuditLogMock,
    getSensorySnapshot: vi.fn().mockResolvedValue({
      sample: null,
      stale: false,
      ageMs: 0,
      nextTickAt: Date.now() + 60_000,
      running: true,
    }),
    streamChat: options?.streamChat,
    onVisualPresencePulse: () => () => {},
  } as any)
}

describe('chat orchestrator reply authority', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
    streamMock.mockReset()
    executeRealtimeQueryTurnMock.mockReset()
    appendConversationTurnMock.mockReset()
    appendAuditLogMock.mockReset()
    suspendKillSwitchMock.mockReset()
    resumeKillSwitchMock.mockReset()
    hookCapture.beforeSendContexts.length = 0
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
    sessionMessagesMap.clear()
    ensureSessionMessages(activeSessionId.value)
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
  })

  it('passes the native provider responseFormat through the renderer provider call', async () => {
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
    expect(streamMock.mock.calls[0]?.[3]).toEqual(expect.objectContaining({
      responseFormat: alicizationProviderResponseFormat,
    }))
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

  it('drops legacy renderer pre-dialogue identity before the main runtime boundary', async () => {
    const reply = '这条回复只由 Provider、SOUL 与记忆证据生成。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: '旧 awareness 不得重新进入结构化结果。',
          reasonPreview: ['mustDo=复述旧治理模板'],
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: '旧 closure 不得重新进入结构化结果。',
          briefingLines: ['openingMove=固定开场'],
          reasons: ['fixed-reply-governance'],
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
    const legacyOptions: Parameters<typeof store.ingest>[1] & {
      preDialogueSendIdentity: Record<string, unknown>
    } = {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: '固定开场：先强调我们是同一个她。',
        companionHeadlineLine: '固定标题',
        companionBriefingLine: '固定回复姿态',
        companionNextClosureLine: '固定下一步',
        awarenessLine: '固定 awareness',
        emotionalClosureCue: '固定情绪 cue',
        projectState: null,
        emotionalKernel: null,
        reasonPreview: ['mustDo=先复述项目状态', 'openingMove=固定开场'],
      },
    }
    await store.ingest('今天想聊聊我们共同记得的事情', legacyOptions)

    const payload = streamChat.mock.calls[0]?.[0]
    expect(payload).not.toHaveProperty('preDialogueSendIdentity')
    expect(JSON.stringify(payload)).not.toMatch(/固定开场|固定回复姿态|mustDo|openingMove/u)
    expect(hookCapture.beforeSendContexts).toHaveLength(1)
    expect(hookCapture.beforeSendContexts[0]).not.toHaveProperty('preDialogueSendIdentity')
    const persistedStructured = appendConversationTurnMock.mock.calls.at(-1)?.[0]?.structured
    expect(persistedStructured).not.toHaveProperty('preDialogueAwareness')
    expect(persistedStructured).not.toHaveProperty('preDialogueClosure')
  })

  it('keeps accepted-start runtime digest without promoting its project state', async () => {
    const reply = '我会根据当前对话和记忆继续回应。'
    const fullText = createProviderFullText(reply)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        projectState: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'dialogue',
          shouldProactivelySpeak: false,
          shouldProactivelyAct: false,
          continuityPressure: 0.2,
          companionshipPressure: 0.4,
          projectState: {
            identity: 'typed accepted-start runtime state',
            latestLandedProgress: 'typed accepted-start progress',
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
    expect(persistedStructured?.runtimeDigest?.projectState).toEqual({
      identity: 'typed accepted-start runtime state',
      latestLandedProgress: 'typed accepted-start progress',
    })
    expect(persistedStructured?.projectState).toBeNull()
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

  it('routes a prose-wrapped JSON candidate to the transparent structured-contract failure without retry', async () => {
    const providerReply = '这段 Provider 纯文本不得被保留为成功回复。'
    const fullText = `Provider preface\n${createProviderFullText(providerReply)}\nProvider suffix`
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: providerReply,
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
    expect(streamChat).toHaveBeenCalledTimes(1)
    expect(streamMock).not.toHaveBeenCalled()
    expect(persisted).toMatchObject({
      structured: {
        parsePath: 'fallback',
        contractFailed: true,
        origin: 'failure-surface',
        failureSurface: {
          kind: 'structured-contract',
        },
      },
    })
    expect(persisted.assistantText).toBe(persisted.structured.failureSurface.reply)
    expect(persisted.assistantText).not.toContain(providerReply)
    expect(persisted.structured.reply).toBe(persisted.assistantText)
  })

  it.each(invalidProviderContractCases)('routes %s to a non-learning structured-contract failure surface', async (_label, payload) => {
    const providerReply = typeof payload.reply === 'string'
      ? payload.reply
      : '缺失 reply 的候选也不能成为 Provider artifact。'
    const fullText = JSON.stringify(payload)
    const streamChat = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: providerReply,
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
    expect(streamChat).toHaveBeenCalledTimes(1)
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
          kind: 'structured-contract',
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
