import { readFileSync } from 'node:fs'

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useChatOrchestratorStore } from './chat'

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

function createProviderFullText(reply = '这是主进程 Provider 根据当前对话与记忆生成的回复。') {
  return JSON.stringify({
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
  })
}

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
      emitBeforeSendHooks: noopAsync,
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
      sections: {},
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
