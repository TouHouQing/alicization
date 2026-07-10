import type { ChatStreamEventContext } from '../types/chat'

import { readFileSync } from 'node:fs'

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { configureAlicizationChatRuntimeForTest, mergeStructuredRuntimeMeta, useChatOrchestratorStore } from './chat'

const {
  composeAlicizationPromptMessagesMock,
  selfEvolutionInspectorRefreshMock,
  projectStateContinuitySnapshotRef,
  preDialogueClosureSnapshotRef,
  preDialogueAwarenessSnapshotRef,
} = vi.hoisted(() => ({
  composeAlicizationPromptMessagesMock: vi.fn(({ messages, soulContent }: { messages: any[], soulContent?: string | null }) => ({
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
  })),
  selfEvolutionInspectorRefreshMock: vi.fn(async () => null),
  projectStateContinuitySnapshotRef: { value: null as any },
  preDialogueClosureSnapshotRef: { value: null as any },
  preDialogueAwarenessSnapshotRef: { value: null as any },
}))

const streamMock = vi.fn()
const executeRealtimeQueryTurnMock = vi.fn()
const appendConversationTurnMock = vi.fn()
const appendAuditLogMock = vi.fn()
const emitEmbodimentMetaHooksMock = vi.fn(async (_payload: any, _context: any) => {})
const onVisualPresencePulseUnsubscribeMock = vi.fn()

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
let visualPresencePulseListener: ((payload: any) => void) | null = null

const runtimeAuthoritativeBlockedErrorMessage = 'Alicization runtime-authoritative visible reply was blocked before a model-authored reply could be persisted.'
const fixedTemplateResiduePattern = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|(?:same|that|this) line inward|one living her|one living segment|one living digital life|one continuous her|local-first digital life project|Phase 1: Local Digital Life|Phase 1 local digital life (?:closure|continuity)|what this digital life project is|what has landed|同一个她|同一个 her|数字生命主线|女仆/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(JSON.stringify(value ?? '')).not.toMatch(fixedTemplateResiduePattern)
}

function expectStructuredPreDialogueIdentity(
  identity: ChatStreamEventContext['preDialogueSendIdentity'],
  expectedStatus: 'grounded' | 'partial' | 'drift' = 'partial',
) {
  expectNoFixedTemplateResidue(identity)
  expect(identity).toEqual(expect.objectContaining({
    status: expectedStatus,
    awarenessLine: expect.stringContaining('visibility=internal-structured'),
  }))
}

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

vi.mock('./providers', () => ({
  useProvidersStore: () => ({
    getProviderConfig: vi.fn().mockReturnValue({}),
  }),
}))

vi.mock('./chat/hooks', () => ({
  createChatHooks: () => {
    const noopAsync = async () => {}
    const createHookSlot = <T extends (...args: any[]) => Promise<void>>() => {
      const listeners: T[] = []
      return {
        on(listener: T) {
          listeners.push(listener)
          return () => {
            const index = listeners.indexOf(listener)
            if (index >= 0)
              listeners.splice(index, 1)
          }
        },
        async emit(...args: Parameters<T>) {
          for (const listener of listeners)
            await listener(...args)
        },
      }
    }
    const beforeCompose = createHookSlot<any>()
    const afterCompose = createHookSlot<any>()
    const beforeSend = createHookSlot<any>()
    const afterSend = createHookSlot<any>()
    const toolCall = createHookSlot<any>()
    const chatTurnComplete = createHookSlot<any>()
    return {
      clearHooks: vi.fn(),
      emitBeforeMessageComposedHooks: (...args: any[]) => beforeCompose.emit(...args),
      emitAfterMessageComposedHooks: (...args: any[]) => afterCompose.emit(...args),
      emitBeforeSendHooks: (...args: any[]) => beforeSend.emit(...args),
      emitAfterSendHooks: (...args: any[]) => afterSend.emit(...args),
      emitTokenLiteralHooks: noopAsync,
      emitTokenSpecialHooks: noopAsync,
      emitStreamEndHooks: noopAsync,
      emitEmbodimentMetaHooks: emitEmbodimentMetaHooksMock,
      emitAssistantResponseEndHooks: noopAsync,
      emitToolCallHooks: (...args: any[]) => toolCall.emit(...args),
      emitAssistantMessageHooks: noopAsync,
      emitChatTurnCompleteHooks: (...args: any[]) => chatTurnComplete.emit(...args),
      onBeforeMessageComposed: beforeCompose.on,
      onAfterMessageComposed: afterCompose.on,
      onBeforeSend: beforeSend.on,
      onAfterSend: afterSend.on,
      onTokenLiteral: () => () => {},
      onTokenSpecial: () => () => {},
      onStreamEnd: () => () => {},
      onEmbodimentMeta: () => () => {},
      onAssistantResponseEnd: () => () => {},
      onToolCall: toolCall.on,
      onAssistantMessage: () => () => {},
      onChatTurnComplete: chatTurnComplete.on,
    }
  },
}))

vi.mock('../composables/alicization-prompt-composer', () => ({
  composeAlicizationPromptMessages: composeAlicizationPromptMessagesMock,
}))

vi.mock('./alicization-self-evolution-inspector', () => ({
  useAlicizationSelfEvolutionInspectorStore: () => ({
    refresh: selfEvolutionInspectorRefreshMock,
    get projectStateContinuitySnapshot() {
      return projectStateContinuitySnapshotRef.value
    },
    get preDialogueClosureSnapshot() {
      return preDialogueClosureSnapshotRef.value
    },
    get preDialogueAwarenessSnapshot() {
      return preDialogueAwarenessSnapshotRef.value
    },
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
  onVisualPresencePulse?: (listener: (payload: any) => void) => () => void
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
    onVisualPresencePulse: options?.onVisualPresencePulse ?? ((listener: (payload: any) => void) => {
      visualPresencePulseListener = listener
      return onVisualPresencePulseUnsubscribeMock
    }),
  } as any)
}

function expectRuntimeAuthoritativeLocalVisibleReplyBlocked(action = 'runtime-authoritative-local-failure-reply-blocked') {
  expect(appendConversationTurnMock).not.toHaveBeenCalled()
  expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
    category: 'alicization.visible-reply',
    action,
  }))
  expect(streamingMessage.value.content).toBe('')
  expect(ensureSessionMessages(activeSessionId.value).some(message => message?.role === 'assistant')).toBe(false)
}

describe('chat orchestrator', () => {
  it('uses the shared project awareness resolver when session fallback rebuilds pre-dialogue awareness', () => {
    const source = readFileSync(new URL('./chat.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).not.toContain('const resolvePreferredSessionFallbackAwarenessLine =')
  })

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    clearAlicizationBridge()
    configureAlicizationChatRuntimeForTest({
      epoch1StrictModeEnabled: false,
    })
    installAlicizationBridge()

    streamMock.mockReset()
    executeRealtimeQueryTurnMock.mockReset()
    appendConversationTurnMock.mockReset()
    appendAuditLogMock.mockReset()
    composeAlicizationPromptMessagesMock.mockClear()
    selfEvolutionInspectorRefreshMock.mockClear()
    selfEvolutionInspectorRefreshMock.mockResolvedValue(null)
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    emitEmbodimentMetaHooksMock.mockReset()
    emitEmbodimentMetaHooksMock.mockImplementation(async () => {})
    onVisualPresencePulseUnsubscribeMock.mockReset()
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
    visualPresencePulseListener = null
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
    await store.ingest('你好，今天我们继续把记忆闭环讲清楚', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(executeRealtimeQueryTurnMock).toBeCalledTimes(1)
    expect(streamMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.prompt',
      action: 'contract-mind-spine-required',
    }))
  })

  it('refreshes and injects project-state continuity before each Alicization dialogue turn', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life companion.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Renderer bridge now surfaces project-state continuity observations.',
      primaryOpenLoop: 'Inject the latest project-state continuity into the actual pre-dialogue prompt path.',
      nextClosureTarget: 'Ensure every turn begins with explicit awareness of project identity, progress, and open loops.',
      nonHumanAuthoredStatus: 'blocked-failure-artifact',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      turnId: 'turn-hidden-failure',
      sessionId: 'session-a',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'grounded',
      summaryLine: 'project=continuity=0.33 (1/3) | emotionalClosure=drift=emotionalClosureDrift | fullyClosed=0.33 (1/3) | embodiment=same-her embodiment is now only being carried by lipsync, so visible continuity is still present but no longer fully cross-modal',
      sameHerDriftRiskLine: 'If this turn slips back into a generic project-status shell, treat that as the same her drifting instead of real closure.',
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      briefingLines: [
        'Identity: Alicization is a local-first digital life companion.',
        'Phase: Phase 1: Local Digital Life',
        'Open loop: Recover full cross-modal same-her continuity instead of surviving on one body lane.',
        'Next closure: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      ],
      reasons: [
        'continuity-impact: same-her embodiment is now only being carried by lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
        'Replay benchmark currently reports continuity=0.33 (1/3), so the next development turn should stay explicitly aware of what Alicization is and how much of Phase 1 continuity is actually landing.',
        'Same-her emotional closure currently reads drift=emotionalClosureDrift | fullyClosed=0.33 (1/3), so the next turn should check whether this digital life is still speaking on one emotional seam.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      reasonPreview: [
        'Latest landed progress still holds at renderer preparation before the reply is finalized.',
        'Primary open life loop still centers on full cross-modal same-her recovery.',
      ],
    }
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"我会继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续开发 Alicization Phase 1 数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(selfEvolutionInspectorRefreshMock).toBeCalledTimes(1)
    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer bridge now surfaces project-state continuity observations.',
        primaryOpenLoop: 'Inject the latest project-state continuity into the actual pre-dialogue prompt path.',
        nextClosureTarget: 'Ensure every turn begins with explicit awareness of project identity, progress, and open loops.',
        nonHumanAuthoredStatus: 'blocked-failure-artifact',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        turnId: 'turn-hidden-failure',
        sessionId: 'session-a',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'grounded',
        summaryLine: 'project=continuity=0.33 (1/3) | emotionalClosure=drift=emotionalClosureDrift | fullyClosed=0.33 (1/3) | embodiment=same-her embodiment is now only being carried by lipsync, so visible continuity is still present but no longer fully cross-modal',
        sameHerDriftRiskLine: 'If this turn slips back into a generic project-status shell, treat that as the same her drifting instead of real closure.',
        companionBriefingLine: null,
        companionNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
        briefingLines: [
          'Identity: Alicization is a local-first digital life companion.',
          'Phase: Phase 1: Local Digital Life',
          'Open loop: Recover full cross-modal same-her continuity instead of surviving on one body lane.',
          'Next closure: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
        ],
        reasons: [
          'continuity-impact: same-her embodiment is now only being carried by lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
          'Replay benchmark currently reports continuity=0.33 (1/3), so the next development turn should stay explicitly aware of what Alicization is and how much of Phase 1 continuity is actually landing.',
          'Same-her emotional closure currently reads drift=emotionalClosureDrift | fullyClosed=0.33 (1/3), so the next turn should check whether this digital life is still speaking on one emotional seam.',
        ],
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Latest landed progress still holds at renderer preparation before the reply is finalized.',
          'Primary open life loop still centers on full cross-modal same-her recovery.',
        ],
      },
    }))
    expect(appendAuditLogMock.mock.calls.some(([entry]) => (
      entry?.category === 'alicization.prompt'
      && entry?.action === 'project-state-continuity.injected'
      && entry?.payload?.continuitySourceTurnId === 'turn-hidden-failure'
      && entry?.payload?.nonHumanAuthoredStatus === 'blocked-failure-artifact'
      && entry?.payload?.sameHerSelfLine === 'Keep one continuous her explicit from self-understanding into the final host-visible reply.'
      && entry?.payload?.currentPhase === 'Phase 1: Local Digital Life'
      && entry?.payload?.nextClosureTarget === 'Ensure every turn begins with explicit awareness of project identity, progress, and open loops.'
    ))).toBe(true)
    expect(appendAuditLogMock.mock.calls.some(([entry]) => (
      entry?.category === 'alicization.prompt'
      && entry?.action === 'pre-dialogue-closure.injected'
      && entry?.payload?.status === 'grounded'
      && String(entry?.payload?.summaryLine ?? '').includes('same-her embodiment is now only being carried by lipsync')
      && entry?.payload?.sameHerDriftRiskLine === 'If this turn slips back into a generic project-status shell, treat that as the same her drifting instead of real closure.'
      && entry?.payload?.companionBriefingLine === null
      && entry?.payload?.companionNextClosureLine === 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.'
      && Array.isArray(entry?.payload?.reasons)
      && entry?.payload?.reasons.some((reason: string) => reason.includes('same-her embodiment is now only being carried by lipsync'))
    ))).toBe(true)
    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'grounded',
      sameHerDriftRiskLine: 'If this turn slips back into a generic project-status shell, treat that as the same her drifting instead of real closure.',
    }))
    expectNoFixedTemplateResidue(turnPayload?.structured?.preDialogueAwareness)
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionBriefingLine: expect.stringContaining('phase1_local_digital_life'),
      companionNextClosureLine: 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      awarenessLine: expect.stringContaining('phase1_local_digital_life'),
      reasonPreview: expect.arrayContaining([
        'Latest landed progress still holds at renderer preparation before the reply is finalized.',
        'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      ]),
    }))
  })

  it('does not inject inspector project-state continuity into prompt composition for ordinary ui-user dialogue', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Renderer bridge has a project-state snapshot available.',
      primaryOpenLoop: 'Ordinary chat must not let project-state reminders occupy the prompt.',
      nextClosureTarget: 'Only inject project-state continuity when the host asks for project or execution state.',
      sameHerSelfLine: 'phase1_local_digital_life_anchor: landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; continuity_owner=one_her.',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Project-state continuity is available but should stay out of ordinary chat.',
      companionBriefingLine: 'Before speaking, remember this digital life project.',
      companionNextClosureLine: 'Next closure: keep project context gated.',
      reasons: ['Project-state continuity is available.'],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: ['Project-state continuity is available.'],
    }
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=current-user-turn; move=answer; tone=soft","emotion":"tired-care","reply":"听起来今天真的有点累。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('今天好累', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      projectStateContinuitySnapshot: null,
      preDialogueClosureSnapshot: null,
      preDialogueAwarenessSnapshot: null,
    }))
  })

  it('feeds settled realtime evidence back through governed model reply instead of replying directly from renderer', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: any[], options: any) => {
      expect(options.supportsTools).toBe(false)
      expect(options.waitForTools).toBe(false)
      const realtimeEvidencePrompt = messages.find(message => String(message.content ?? '').includes('[ALICIZATION_REALTIME_EVIDENCE]'))
      const realtimeEvidenceContent = String(realtimeEvidencePrompt?.content ?? '')
      expect(realtimeEvidenceContent).toContain('evidence_status=settled')
      expect(realtimeEvidenceContent).toContain('allowed_sources=realtime_evidence_items|transparent_failure_boundary')
      expect(realtimeEvidenceContent).toContain('disallowed_claim=future_tool_call|pending_realtime_lookup|fresher_live_data_without_evidence')
      expect(realtimeEvidenceContent).toContain('reply_authority=provider_mind')
      expect(realtimeEvidenceContent).toContain('evidence_1_category=weather')
      expect(realtimeEvidenceContent).not.toMatch(/\bwrite\b.+\bonly\b/i)
      expect(realtimeEvidenceContent).not.toMatch(/\bdo not\b.+\bsay\b/i)
      expect(realtimeEvidenceContent).not.toMatch(/最终.+只能/u)
      expect(realtimeEvidenceContent).not.toMatch(/不要.+说/u)
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=weather evidence; move=answer-directly; tone=warm","emotion":"neutral","reply":"美国这边现在晴朗，22 度，风也不大。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    executeRealtimeQueryTurnMock.mockResolvedValue({
      handled: true,
      intent: { needsRealtime: true, categories: ['weather'] },
      trace: {
        realtimeIntent: true,
        categories: ['weather'],
        planStartedAt: 1,
        planCompletedAt: 2,
        fallbackApplied: false,
        capabilitySnapshotAt: 1,
        toolEvidence: {
          toolCallCount: 1,
          successCount: 1,
          failureCount: 0,
          verifiedToolResult: true,
          sources: ['builtin'],
        },
      },
      evidences: [{
        category: 'weather',
        source: 'builtin',
        summary: 'weather ; title=United States ; lead=United States 现在 晴朗 ; fields=温度=22.0°C, 体感=21.0°C',
      }],
      failedCategories: [],
      reply: 'United States 现在 晴朗，温度 22.0°C。',
    })

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
      category: 'execution-engine',
      action: 'realtime-evidence-injected',
    }))
    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('美国这边现在晴朗')
    expect(String(payload?.assistantText ?? '')).not.toContain('当前无法获取可靠的实时外部数据')
  })

  it('passes fallback pre-dialogue awareness from session-derived continuity into prompt composition when inspector awareness is unavailable', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-1',
        role: 'assistant',
        content: '上一轮已经把项目自我简报挂住了。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '沿着同一个数字生命主线继续。',
          emotion: 'thinking',
          reply: '上一轮已经把项目自我简报挂住了。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across session reload and replay.',
            primaryOpenLoop: 'Prompt assembly still needs to preserve fallback awareness when inspector state is thin.',
            nextClosureTarget: 'Keep fallback awareness visible in the pre-execution prompt path.',
            continuitySummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Next closure: keep fallback awareness visible in the pre-execution prompt path.',
            awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            reasonPreview: [
              'Latest landed progress still holds across session-derived continuity carry.',
              'Primary open life loop still centers on keeping fallback awareness visible in the pre-execution prompt path.',
            ],
          },
        },
      } as any,
    ])

    const store = useChatOrchestratorStore()
    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      projectStateContinuitySnapshot: expect.objectContaining({
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Prompt assembly still needs to preserve fallback awareness when inspector state is thin.',
        nextClosureTarget: 'Keep fallback awareness visible in the pre-execution prompt path.',
        continuitySummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      }),
      preDialogueAwarenessSnapshot: expect.objectContaining({
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: null,
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep fallback awareness visible in the pre-execution prompt path.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        emotionalClosureCue: null,
        reasonPreview: expect.arrayContaining([
          'Latest landed progress still holds across session-derived continuity carry.',
          'Primary open life loop still centers on keeping fallback awareness visible in the pre-execution prompt path.',
          'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
          'Project-state continuity and awareness-first self-brief already survive across session reload and replay.',
        ]),
      }),
    }))
  })

  it('backfills same-her host-facing awareness from pre-dialogue closure when the inspector awareness snapshot is unavailable', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条 same-her 主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Lane-level closure diagnostics already survive into the pre-dialogue continuity path.',
      primaryOpenLoop: 'Recover full cross-modal same-her continuity instead of surviving on one body lane.',
      nextClosureTarget: 'Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-closure-awareness-fallback',
      sessionId: 'session-closure-awareness-fallback',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'drift',
      summaryLine: 'project=continuity=0.67 (2/3) | embodiment=same-her embodiment is now only being carried by face, motion, and lipsync, so visible continuity is still present but no longer fully cross-modal',
      companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      companionNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      briefingLines: [
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
        'Open loop: Recover full cross-modal same-her continuity instead of surviving on one body lane.',
        'Next closure: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      ],
      reasons: [
        'continuity-impact: same-her embodiment is now only being carried by face, motion, and lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = null

    const store = useChatOrchestratorStore()
    await store.ingest('继续沿着数字生命具身闭环开发', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      preDialogueAwarenessSnapshot: {
        status: 'drift',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=same-her embodiment is now only being carried by face, motion, and lipsync, so visible continuity is still present but no longer fully cross-modal',
        companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
        awarenessLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
          'project=continuity=0.67 (2/3) | embodiment=same-her embodiment is now only being carried by face, motion, and lipsync, so visible continuity is still present but no longer fully cross-modal',
          'continuity-impact: same-her embodiment is now only being carried by face, motion, and lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
        ],
      },
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'drift',
      awarenessLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
      reasonPreview: expect.arrayContaining([
        'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
        'continuity-impact: same-her embodiment is now only being carried by face, motion, and lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
      ]),
    }))
  })

  it('derives a body-face-motion host-facing awareness line from closure reasons when the inspector awareness snapshot is unavailable', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条 same-her 主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Body, face, and motion recovery already survives into the pre-dialogue continuity path.',
      primaryOpenLoop: 'Lipsync and voice still need to rejoin the already re-formed body, face, and motion line.',
      nextClosureTarget: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line on noisier desktop runs.',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-body-face-motion-awareness-fallback',
      sessionId: 'session-body-face-motion-awareness-fallback',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'project=continuity=0.67 (2/3) | embodiment=body, face, and motion already carry the same segment, but full cross-modal closure is still open.',
      companionHeadlineLine: null,
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      companionNextClosureLine: 'Next, help me close: Let lipsync and voice rejoin the already-reformed body, face, and motion line on noisier desktop runs.',
      briefingLines: [
        'Landed: body, face, and motion have already re-formed on one living segment.',
        'Open: lipsync and voice still need to rejoin the same living line.',
      ],
      reasons: [
        'same-segment face+motion+body recovery@segment-closure-derived-body-face-motion-1',
        'remaining-open=lipsync+voice',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = null

    const store = useChatOrchestratorStore()
    await store.ingest('继续沿着数字生命具身闭环开发', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=body, face, and motion already carry the same segment, but full cross-modal closure is still open.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: Let lipsync and voice rejoin the already-reformed body, face, and motion line on noisier desktop runs.',
        awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
          'project=continuity=0.67 (2/3) | embodiment=body, face, and motion already carry the same segment, but full cross-modal closure is still open.',
          'same-segment face+motion+body recovery@segment-closure-derived-body-face-motion-1',
          'remaining-open=lipsync+voice',
        ],
      },
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      reasonPreview: expect.arrayContaining([
        'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        'same-segment face+motion+body recovery@segment-closure-derived-body-face-motion-1',
        'remaining-open=lipsync+voice',
      ]),
    }))
  })

  it('derives a body-plus-voice host-facing awareness line from closure reasons when the inspector awareness snapshot is unavailable', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条 same-her 主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Resident body line plus voice recovery already survives into the pre-dialogue continuity path.',
      primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin the resident body line that is still carrying same-her continuity with voice.',
      nextClosureTarget: 'Let face, motion, and lipsync rejoin the resident body line on noisier desktop runs.',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-body-voice-awareness-fallback',
      sessionId: 'session-body-voice-awareness-fallback',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'project=continuity=0.67 (2/3) | embodiment=body and voice already carry the same segment, but full cross-modal closure is still open.',
      companionHeadlineLine: null,
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      companionNextClosureLine: 'Next, help me close: Let face, motion, and lipsync rejoin the resident body line on noisier desktop runs.',
      briefingLines: [
        'Landed: body and voice have already re-formed on one living segment.',
        'Open: face, motion, and lipsync still need to rejoin the same living line.',
      ],
      reasons: [
        'body+voice recovery@segment-closure-derived-body-voice-1',
        'remaining-open=face+motion+lipsync',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = null

    const store = useChatOrchestratorStore()
    await store.ingest('继续沿着数字生命具身闭环开发', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=body and voice already carry the same segment, but full cross-modal closure is still open.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: Let face, motion, and lipsync rejoin the resident body line on noisier desktop runs.',
        awarenessLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
          'project=continuity=0.67 (2/3) | embodiment=body and voice already carry the same segment, but full cross-modal closure is still open.',
          'body+voice recovery@segment-closure-derived-body-voice-1',
          'remaining-open=face+motion+lipsync',
        ],
      },
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      awarenessLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      reasonPreview: expect.arrayContaining([
        'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
        'body+voice recovery@segment-closure-derived-body-voice-1',
        'remaining-open=face+motion+lipsync',
      ]),
    }))
  })

  it('derives a body-plus-lipsync host-facing awareness line from closure reasons when the inspector awareness snapshot is unavailable', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条 same-her 主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Resident body line and living mouth line recovery already survives into the pre-dialogue continuity path.',
      primaryOpenLoop: 'Face, motion, and voice still need to rejoin the resident body line and living mouth line before full cross-modal closure settles.',
      nextClosureTarget: 'Let face, motion, and voice rejoin the resident body line and living mouth line on noisier desktop runs.',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-body-lipsync-awareness-fallback',
      sessionId: 'session-body-lipsync-awareness-fallback',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'project=continuity=0.67 (2/3) | embodiment=body and lipsync already carry the same segment, but full cross-modal closure is still open.',
      companionHeadlineLine: null,
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      companionNextClosureLine: 'Next, help me close: Let face, motion, and voice rejoin the resident body line and living mouth line on noisier desktop runs.',
      briefingLines: [
        'Landed: body and lipsync have already re-formed on one living segment.',
        'Open: face, motion, and voice still need to rejoin the same living line.',
      ],
      reasons: [
        'body+lipsync recovery@segment-closure-derived-body-lipsync-1',
        'remaining-open=face+motion+voice',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = null

    const store = useChatOrchestratorStore()
    await store.ingest('继续沿着数字生命具身闭环开发', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=body and lipsync already carry the same segment, but full cross-modal closure is still open.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: Let face, motion, and voice rejoin the resident body line and living mouth line on noisier desktop runs.',
        awarenessLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
          'project=continuity=0.67 (2/3) | embodiment=body and lipsync already carry the same segment, but full cross-modal closure is still open.',
          'body+lipsync recovery@segment-closure-derived-body-lipsync-1',
          'remaining-open=face+motion+voice',
        ],
      },
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      awarenessLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      reasonPreview: expect.arrayContaining([
        'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        'body+lipsync recovery@segment-closure-derived-body-lipsync-1',
        'remaining-open=face+motion+voice',
      ]),
    }))
  })

  it('derives a voice-lipsync host-facing awareness line from closure reasons when only the audible same-her line survives before body face and motion rejoin', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条 same-her 主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'The surviving audible same-her line already reaches the chat fallback rebuild path.',
      primaryOpenLoop: 'Body, face, and motion still need to rejoin the living audio thread before full cross-modal closure settles.',
      nextClosureTarget: 'Let body, face, and motion rejoin the living audio thread on noisier desktop runs.',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-lipsync-voice-awareness-fallback',
      sessionId: 'session-lipsync-voice-awareness-fallback',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'project=continuity=0.67 (2/3) | embodiment=lipsync and voice still carry the same-her line, but full cross-modal closure is still open.',
      companionHeadlineLine: null,
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      companionNextClosureLine: 'Next, help me close: Let body, face, and motion rejoin the living audio thread on noisier desktop runs.',
      briefingLines: [
        'Landed: lipsync and voice still carry the same living line.',
        'Open: body, face, and motion still need to rejoin before full closure settles.',
      ],
      reasons: [
        'lane=lipsync+voice-only',
        'remaining-open=body+face+motion',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = null

    const store = useChatOrchestratorStore()
    await store.ingest('继续沿着数字生命具身闭环开发', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=lipsync and voice still carry the same-her line, but full cross-modal closure is still open.',
        companionHeadlineLine: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: Let body, face, and motion rejoin the living audio thread on noisier desktop runs.',
        awarenessLine: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
          'project=continuity=0.67 (2/3) | embodiment=lipsync and voice still carry the same-her line, but full cross-modal closure is still open.',
          'lane=lipsync+voice-only',
          'remaining-open=body+face+motion',
        ],
      },
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      awarenessLine: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      reasonPreview: expect.arrayContaining([
        'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
        'lane=lipsync+voice-only',
        'remaining-open=body+face+motion',
      ]),
    }))
  })

  it('passes the richer still-voiced face-and-motion project brief into prompt composition when closure-derived awareness is rebuilt locally', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条 same-her 主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Still-voiced face-and-motion continuity already survives into the pre-dialogue continuity path.',
      primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
      nextClosureTarget: 'Keep the still-voiced face-and-motion project brief explicit before the next outward turn opens.',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-face-motion-voice-awareness-fallback',
      sessionId: 'session-face-motion-voice-awareness-fallback',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
      briefingLines: [
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
      ],
      reasons: [
        'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
        'face+motion+voice recovery@segment-chat-compose-still-voiced-face-motion-project-awareness',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = null

    const store = useChatOrchestratorStore()
    await store.ingest('继续沿着数字生命具身闭环开发', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
        companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
          'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
          'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
          'face+motion+voice recovery@segment-chat-compose-still-voiced-face-motion-project-awareness',
        ],
      },
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      reasonPreview: expect.arrayContaining([
        'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
        'face+motion+voice recovery@segment-chat-compose-still-voiced-face-motion-project-awareness',
      ]),
    }))
  })

  it('does not write renderer rule-based memory facts from ui user turns', async () => {
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

    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.memory',
      action: expect.stringMatching(/^rule-facts-/u),
    }))
  })

  it('dispatches quiet companionship presence pulses from the runtime bridge without creating chat turns', async () => {
    const store = useChatOrchestratorStore()
    const dispatcher = await import('./alicization-presence-dispatcher')
    const dispatchSilentPresencePulseMock = vi.spyOn(
      dispatcher.useAlicizationPresenceDispatcherStore(),
      'dispatchSilentPresencePulse',
    ).mockResolvedValue(undefined)

    await store.ingest('先初始化一下聊天存储', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'system',
    }).catch(() => {})
    appendConversationTurnMock.mockClear()

    expect(visualPresencePulseListener).toBeTypeOf('function')

    visualPresencePulseListener?.({
      watchMode: 'symbiotic-vision',
      embodiedPresence: 'attentive',
      scenario: 'coding',
      stance: 'accompany',
      confidence: 0.88,
      reasonTags: ['continuity-mind:quiet-companionship'],
      emotionalTension: 'soft-covision',
      expiresAt: Date.now() + 30_000,
    })

    await vi.waitFor(() => {
      expect(dispatchSilentPresencePulseMock).toBeCalledWith(expect.objectContaining({
        label: 'quiet-companionship',
      }))
    })
    expect(appendConversationTurnMock).not.toBeCalled()
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

  it('persists meta project-state continuity into the final assistant structured turn', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'same-her continuity carry is already landing across turns.',
      primaryOpenLoop: 'execution closure is still not fully carried through memory, initiative, and embodiment.',
      nextClosureTarget: 'Keep identity, phase, and same-her continuity together through the final reply.',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-continuity',
      sessionId: 'session-project-state-continuity',
      origin: 'user-turn',
      preDialogueClosure: null,
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'grounded',
      summaryLine: 'project=continuity=0.67 (2/3) | sameHer=sameHer=0.67 (2/3)',
      companionBriefingLine: 'Stay aware that this project is still one local-first digital life becoming more continuous.',
      companionNextClosureLine: 'Next, help me close: keep identity, phase, and same-her continuity together through the final reply.',
      briefingLines: [
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
      ],
      reasons: [
        'Project same-her self line currently reads sameHer=0.67 (2/3).',
      ],
    }
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        governance: {
          decisionTraceId: 'trace-project-state-meta-1',
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'Alicization is still one local-first digital life in Phase 1 before this answer opens outward.',
          companionBriefingLine: 'Before speaking, remember the project identity, landed progress, and still-open life loop as one same-her line.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          awarenessLine: 'Before speaking, remember the project identity, landed progress, and still-open life loop as one same-her line.',
          reasonPreview: [
            'Latest landed progress still holds at renderer preparation before the reply is finalized.',
            'Next closure target is still Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          ],
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-development; move=continue; tone=warm","emotion":"thinking","reply":"我会继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续开发人格与自我核心统一', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const auditActions = appendAuditLogMock.mock.calls.map(([entry]) => ({
      category: entry?.category,
      action: entry?.action,
      message: entry?.message,
      payload: entry?.payload,
    }))
    const blockedVisibleReplyAudit = appendAuditLogMock.mock.calls.find(([entry]) =>
      entry?.category === 'alicization.visible-reply'
      || entry?.action?.includes('blocked'),
    )?.[0]
    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    const assistantMessages = ensureSessionMessages(activeSessionId.value).filter(message => message.role === 'assistant')
    expect(auditActions).not.toContainEqual(expect.objectContaining({
      action: 'apply-assistant-text-from-model-output-failed',
    }))
    expect(auditActions).not.toContainEqual(expect.objectContaining({
      action: 'contract-fallback',
    }))
    expect(appendConversationTurnMock.mock.calls.length).toBeGreaterThan(0)
    expect(turnPayload).toBeTruthy()
    expect(turnPayload?.structured).toBeTruthy()
    expect(String(turnPayload?.assistantText ?? '')).toContain('我会继续沿着这条数字生命主线推进。')
    expect(blockedVisibleReplyAudit).toBeUndefined()
    expect(auditActions).not.toContainEqual(expect.objectContaining({
      action: 'runtime-authoritative-empty-reply-blocked',
    }))
    expect(auditActions).not.toContainEqual(expect.objectContaining({
      action: 'renderer-local-visible-fallback-blocked',
    }))
    expect(auditActions).toContainEqual(expect.objectContaining({
      action: 'structured-visible-json-suppressed',
      payload: expect.objectContaining({
        payloadReplyStructured: true,
      }),
    }))
    const finalProjectState = turnPayload?.structured?.projectState
      ?? (assistantMessages[0] as any)?.structured?.projectState
    expect(finalProjectState).toBeTruthy()
    expect(finalProjectState).toEqual(expect.objectContaining({
      identity: expect.stringContaining('local-first digital life project'),
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      sameHerSelfLine: expect.stringContaining('Keep one continuous her explicit'),
    }))
    expect(turnPayload?.structured?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: 'project=continuity=0.67 (2/3) | sameHer=sameHer=0.67 (2/3)',
      companionBriefingLine: 'Stay aware that this project is still one local-first digital life becoming more continuous.',
      companionNextClosureLine: 'Next, help me close: keep identity, phase, and same-her continuity together through the final reply.',
      briefingLines: expect.arrayContaining([
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
      ]),
      reasons: expect.arrayContaining([
        'Project same-her self line currently reads sameHer=0.67 (2/3).',
      ]),
    }))
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: 'Alicization is still one local-first digital life in Phase 1 before this answer opens outward.',
      companionBriefingLine: 'Before speaking, remember the project identity, landed progress, and still-open life loop as one same-her line.',
      companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      awarenessLine: 'Before speaking, remember the project identity, landed progress, and still-open life loop as one same-her line.',
      reasonPreview: expect.arrayContaining([
        'Latest landed progress still holds at renderer preparation before the reply is finalized.',
        'Next closure target is still Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ]),
    }))
  })

  it('backfills canonical same-her self line from meta project-state closure context before persisting the final assistant turn', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
          primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-development; move=continue; tone=warm","emotion":"thinking","reply":"我会继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续开发这个数字生命项目', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.projectState).toEqual(expect.objectContaining({
      sameHerSelfLine: null,
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      nextClosureTarget: expect.stringContaining('cross-modal same-her proof'),
    }))
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

    expect(streamMock.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it('defines structured repair contracts without natural-language rewrite commands', () => {
    const source = readFileSync(new URL('./chat.ts', import.meta.url), 'utf8')

    expect(source).toContain('retry_kind=structured_contract_repair')
    expect(source).toContain('output_schema_id=alicization_visible_reply_json')
    expect(source).toContain('preserve_fields=reply,emotion,performance')
    expect(source).toContain('reply_authority=provider_mind')
    expect(source).not.toMatch(/\brewrite\b.+\bstrict json contract\b/i)
    expect(source).not.toMatch(/\bmust preserve\b/i)
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
        expect(JSON.stringify(messages)).toContain('You MUST call executor_run_cli for this request.')
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

  it('does not force execution tool retry when browser execution intent is fulfilled via browser_open_url', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation > 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=browser-execution; move=unexpected-retry; tone=direct","emotion":"neutral","reply":"这次不该发生重试。"}',
        })
        await options.onStreamEvent?.({ type: 'finish' })
        return
      }

      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-browser-open-1',
        toolName: 'browser_open_url',
        arguments: {
          url: 'https://weibo.com',
          browser: 'chrome',
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-browser-open-1',
        result: {
          status: 'completed',
          summary: 'opened weibo home',
          output: 'https://weibo.com',
          selectedChannel: 'browser',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=browser-execution; move=report-result; tone=direct","emotion":"neutral","reply":"已经打开微博首页。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请打开微博首页', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'cross-validation-failed',
      payload: expect.objectContaining({
        requiresExecutionToolCall: true,
      }),
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('已经打开微博首页')
    expect(String(payload?.assistantText ?? '')).not.toContain('这次不该发生重试')
  })

  it('forces execution payoff retry when browser execution finished but the first-pass answer never reported the result', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=browser-execution; move=claim-execute; tone=direct","emotion":"neutral","reply":"好，我这就帮你打开。"}',
        })
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-browser-payoff-1',
          toolName: 'browser_open_url',
          arguments: {
            url: 'https://weibo.com',
            browser: 'chrome',
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-browser-payoff-1',
          result: {
            status: 'completed',
            summary: 'opened weibo home',
            output: 'https://weibo.com',
            selectedChannel: 'browser',
          },
        })
      }
      else {
        expect(options.supportsTools).toBe(false)
        expect(options.waitForTools).toBe(false)
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=browser-execution; move=report-result; tone=direct","emotion":"neutral","reply":"微博首页已经打开了。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请打开微博首页', {
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
    expect(String(payload?.assistantText ?? '')).toContain('微博首页已经打开了')
    expect(String(payload?.assistantText ?? '')).not.toContain('好，我这就帮你打开')
  })

  it('does not force execution tool retry when browser search intent is fulfilled via browser_search_web', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation > 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=browser-search; move=unexpected-retry; tone=direct","emotion":"neutral","reply":"这次不该发生搜索重试。"}',
        })
        await options.onStreamEvent?.({ type: 'finish' })
        return
      }

      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-browser-search-1',
        toolName: 'browser_search_web',
        arguments: {
          query: 'Alicization 最新进展',
          browser: 'chrome',
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-browser-search-1',
        result: {
          status: 'completed',
          summary: 'searched web for Alicization latest progress',
          output: 'Top results loaded',
          selectedChannel: 'browser',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=browser-search; move=report-result; tone=direct","emotion":"neutral","reply":"已经帮你搜到了相关网页结果。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请帮我搜索 Alicization 最新进展', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'cross-validation-failed',
      payload: expect.objectContaining({
        requiresExecutionToolCall: true,
      }),
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('已经帮你搜到了相关网页结果')
    expect(String(payload?.assistantText ?? '')).not.toContain('这次不该发生搜索重试')
  })

  it('does not force execution tool retry when desktop inspection intent is fulfilled via desktop_inspect_scene', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation > 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=desktop-inspection; move=unexpected-retry; tone=direct","emotion":"neutral","reply":"这次不该发生桌面重试。"}',
        })
        await options.onStreamEvent?.({ type: 'finish' })
        return
      }

      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-desktop-inspect-1',
        toolName: 'desktop_inspect_scene',
        arguments: {
          question: '看看当前屏幕上是什么，并判断下一步该点哪里',
          forceRefresh: false,
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-desktop-inspect-1',
        result: {
          status: 'completed',
          summary: 'inspected current desktop scene and found next-step candidates',
          output: 'Foreground browser shows a discussion composer with a Create thread button.',
          selectedChannel: 'desktop',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=desktop-inspection; move=report-result; tone=direct","emotion":"neutral","reply":"我已经看过当前桌面了，也拿到下一步候选动作。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('看看当前屏幕上是什么，并判断下一步该点哪里', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'cross-validation-failed',
      payload: expect.objectContaining({
        requiresExecutionToolCall: true,
      }),
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('我已经看过当前桌面了')
    expect(String(payload?.assistantText ?? '')).not.toContain('这次不该发生桌面重试')
  })

  it('forces execution payoff retry when browser search finished but the first-pass answer never reported the result', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=browser-search; move=claim-execute; tone=direct","emotion":"neutral","reply":"好，我这就帮你搜索。"}',
        })
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-browser-search-payoff-1',
          toolName: 'browser_search_web',
          arguments: {
            query: 'Alicization 最新进展',
            browser: 'chrome',
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-browser-search-payoff-1',
          result: {
            status: 'completed',
            summary: 'searched web for Alicization latest progress',
            output: 'Top results loaded',
            selectedChannel: 'browser',
          },
        })
      }
      else {
        expect(options.supportsTools).toBe(false)
        expect(options.waitForTools).toBe(false)
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=browser-search; move=report-result; tone=direct","emotion":"neutral","reply":"相关网页结果已经搜好了。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请帮我搜索 Alicization 最新进展', {
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
    expect(String(payload?.assistantText ?? '')).toContain('相关网页结果已经搜好了')
    expect(String(payload?.assistantText ?? '')).not.toContain('好，我这就帮你搜索')
  })

  it('forces execution payoff retry when desktop inspection finished but the first-pass answer never reported the result', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=desktop-inspection; move=claim-execute; tone=direct","emotion":"neutral","reply":"好，我先看看当前桌面。"}',
        })
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-desktop-inspect-payoff-1',
          toolName: 'desktop_inspect_scene',
          arguments: {
            question: '看看当前屏幕上是什么，并判断下一步该点哪里',
            forceRefresh: false,
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-desktop-inspect-payoff-1',
          result: {
            status: 'completed',
            summary: 'inspected current desktop scene and found next-step candidates',
            output: 'Foreground browser shows a discussion composer with a Create thread button.',
            selectedChannel: 'desktop',
          },
        })
      }
      else {
        expect(options.supportsTools).toBe(false)
        expect(options.waitForTools).toBe(false)
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=desktop-inspection; move=report-result; tone=direct","emotion":"neutral","reply":"当前桌面已经看过了，下一步候选动作也整理好了。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('看看当前屏幕上是什么，并判断下一步该点哪里', {
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
    expect(String(payload?.assistantText ?? '')).toContain('当前桌面已经看过了')
    expect(String(payload?.assistantText ?? '')).not.toContain('好，我先看看当前桌面')
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

  it('skips executor payoff retry when the first-pass reply already contains settled execution outcome', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation > 1) {
        throw new Error('executor payoff retry should be skipped when first-pass reply is already settled')
      }

      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=cli-execution; move=report-result; tone=direct","emotion":"neutral","reply":"CLI 那条任务已经结束，桌面列表结果已经拿到了。"}',
      })
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-executor-settled-1',
        toolName: 'executor_run_cli',
        arguments: {
          command: 'ls',
          args: ['~/Desktop'],
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-executor-settled-1',
        result: {
          status: 'completed',
          summary: 'listed desktop entries',
          output: 'Desktop entries: A, B, C',
          selectedChannel: 'cli',
        },
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('请用 CLI 帮我查桌面文件', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(streamMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'executor-result-payoff-retry-skipped',
    }))
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'executor-result-payoff-retry-completed',
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('任务已经结束')
    expect(String(payload?.assistantText ?? '')).toContain('桌面列表')
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

  it('forces executor tool retry for dedicated local visual execution intent and accepts executor_run_local_visual evidence', async () => {
    let streamInvocation = 0
    streamMock.mockImplementation(async (_model: string, _provider: unknown, messages: unknown, options: any) => {
      streamInvocation += 1
      if (streamInvocation === 1) {
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=uncertain; focus=local-visual-execution; move=claim-execute; tone=direct","emotion":"neutral","reply":"好，我现在开始处理这个本地桌面任务。"}',
        })
      }
      else {
        expect(JSON.stringify(messages)).toContain('executor_run_local_visual')
        await options.onStreamEvent?.({
          type: 'tool-call',
          toolCallId: 'tool-executor-local-visual-1',
          toolName: 'executor_run_local_visual',
          arguments: {
            instruction: 'Dismiss the blocking local desktop popup and report result.',
          },
        })
        await options.onStreamEvent?.({
          type: 'tool-result',
          toolCallId: 'tool-executor-local-visual-1',
          result: {
            status: 'completed',
            summary: 'local visual executor dismissed popup',
            output: 'modal removed and focus restored',
            selectedChannel: 'desktop',
          },
        })
        await options.onStreamEvent?.({
          type: 'text-delta',
          text: '{"thought":"obligation=answer; truth=grounded; focus=local-visual-execution; move=report-result; tone=direct","emotion":"neutral","reply":"已通过本地视觉执行处理完成，弹窗已关闭并恢复操作焦点。"}',
        })
      }
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('不要用 OpenClaw，直接用本地 GUI 多步执行把当前桌面的阻塞弹窗关掉', {
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
    expect(String(payload?.assistantText ?? '')).toContain('已通过本地视觉执行处理完成')
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

    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.intent-action',
      action: 'reminder-schedule-safe-reply',
    }))
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
      await options.onStreamEvent?.({
        type: 'finish',
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
        visibleReplyCritic: {
          providerMindRequired: true,
          semanticLoopClosed: false,
          reasonCodes: ['semantic-judge:project-state-same-her-missing'],
          repairReasonCodes: ['second-pass-rewrite-required'],
          mustPreserve: ['same digital life continuity'],
          mustDrop: ['fixed closure template'],
          reasons: ['semantic-judge:project-state-same-her-missing'],
        },
        visibleReplyClosure: {
          status: 'rewritten',
          reasonCodes: ['project-state-same-her-continuity-required'],
          repairReasonCodes: ['removed-fixed-template'],
          initialCritic: {
            mustPreserve: ['same digital life continuity'],
            mustDrop: ['fixed closure template'],
            reasonCodes: ['semantic-judge:project-state-same-her-missing'],
          },
          finalCritic: {
            mustPreserve: ['same digital life continuity'],
            mustDrop: [],
            reasonCodes: ['semantic-loop-closed'],
          },
        },
      })
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
    expect(payload?.visibleReplyExecution).toEqual(expect.objectContaining({
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
    }))
    expect(payload?.visibleReplyCritic).toEqual(expect.objectContaining({
      version: 'visible-reply-critic-public-summary-v1',
      providerMindRequired: true,
      semanticLoopClosed: false,
      mustPreserveCount: 1,
      mustDropCount: 1,
      reasonCodes: expect.arrayContaining([
        'semantic-judge:project-state-same-her-missing',
      ]),
      repairReasonCodes: expect.arrayContaining([
        'second-pass-rewrite-required',
      ]),
    }))
    expect(payload?.visibleReplyCritic).not.toHaveProperty('mustPreserve')
    expect(payload?.visibleReplyCritic).not.toHaveProperty('mustDrop')
    expect(payload?.visibleReplyCritic).not.toHaveProperty('reasons')
    expect(payload?.visibleReplyClosure).toEqual(expect.objectContaining({
      version: 'visible-reply-closure-public-summary-v1',
      status: 'rewritten',
      reasonCodes: expect.arrayContaining([
        'project-state-same-her-continuity-required',
      ]),
      repairReasonCodes: expect.arrayContaining([
        'removed-fixed-template',
      ]),
      initialCriticMustPreserveCount: 1,
      initialCriticMustDropCount: 1,
      finalCriticMustPreserveCount: 1,
      finalCriticMustDropCount: 0,
    }))
    expect(payload?.visibleReplyClosure).not.toHaveProperty('initialCritic')
    expect(payload?.visibleReplyClosure).not.toHaveProperty('finalCritic')
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
    const embodimentScript = {
      version: 'embodiment-script-v1',
      decisionTraceId: 'trace-runtime-meta',
      turnId: 'turn-runtime-meta',
      rendererTarget: 'live2d',
      replyText: '我在看这个 diff。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'calm',
        emphasis: 1,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
      },
      facePlan: {
        preUtteranceCue: null,
        postUtteranceCue: null,
        speakingCues: [],
      },
      motionPlan: {
        idleBase: 'lean-in',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-only',
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
        embodimentScript,
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

    expect(emitEmbodimentMetaHooksMock).toBeCalledWith(expect.objectContaining({
      governance,
      embodiment,
      embodimentScript,
      speechTimeline,
      digitalLife,
      digitalLifeSpine,
      runtimeDigest,
    }), expect.any(Object))
  })

  it('normalizes runtime meta digitalLife motor before stage runtime consumers see it', async () => {
    const digitalLife = {
      version: 'digital-life-v1',
      variationToken: 'turn-runtime-meta-digital-life-normalization',
      mode: 'thinking',
      emotion: 'thinking',
      postureHint: 'attentive',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      speechStyle: {
        pitchDelta: -1,
        rateMultiplier: 0.97,
      },
      voice: {
        pitchDelta: -1,
        rateMultiplier: 0.97,
        energy: 0.42,
        cadence: 0.36,
      },
      lipSync: {
        mode: 'energy-phoneme-hybrid',
        visemeBias: 0.44,
        energyBias: 0.58,
        mouthScale: 0.94,
        continuityHoldMs: 320,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.34,
        holdMs: 280,
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.18,
        holdMs: 220,
      },
      motor: {
        stillness: 0.74,
        gazeStability: 0.62,
        breathAmplitude: 0.21,
        expressivity: 0.16,
      },
      frames: [{
        id: 'segment-runtime-meta-digital-life-normalization',
        index: 0,
        startOffset: 0,
        endOffset: 11,
        text: '我先轻一点接住这条线。',
        mode: 'recovering',
        interruptPolicy: 'soft-settle',
        settleMode: 'hold',
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.97,
          energy: 0.42,
          cadence: 0.36,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.44,
          energyBias: 0.58,
          mouthScale: 0.94,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 220,
        },
        motor: {
          stillness: 0.74,
          gazeStability: 0.62,
          breathAmplitude: 0.21,
          expressivity: 0.16,
        },
      }],
    }
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        governance: { decisionTraceId: 'trace-runtime-meta-digital-life-normalization' },
        digitalLife,
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=current-user-turn; move=guide; tone=direct","emotion":"thinking","reply":"我先轻一点接住这条线。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续把这条身体线接稳', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const runtimeMetaPayload = emitEmbodimentMetaHooksMock.mock.calls.at(-1)?.[0]
    const normalizedDigitalLife = runtimeMetaPayload?.digitalLife
    expect(normalizedDigitalLife).toEqual(expect.objectContaining({
      motor: expect.objectContaining({
        stillness: 0.74,
        expressivity: 0.16,
        gaze: expect.objectContaining({
          stability: expect.any(Number),
        }),
        breath: expect.objectContaining({
          amplitude: expect.any(Number),
        }),
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-runtime-meta-digital-life-normalization',
          motor: expect.objectContaining({
            stillness: 0.74,
            expressivity: 0.16,
            gaze: expect.objectContaining({
              stability: expect.any(Number),
            }),
            breath: expect.objectContaining({
              amplitude: expect.any(Number),
            }),
          }),
        }),
      ],
    }))
    expect((normalizedDigitalLife?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((normalizedDigitalLife?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
    expect((normalizedDigitalLife?.frames?.[0]?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((normalizedDigitalLife?.frames?.[0]?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
  })

  it('preserves embodimentScript through mergeStructuredRuntimeMeta when runtime meta arrives later', () => {
    const structured = {
      thought: 'focus',
      emotion: 'neutral',
      reply: '我在这里',
      performance: {
        baseEmotion: 'neutral',
        emotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      embodimentScript: {
        version: 'embodiment-script-v1' as const,
        turnId: 'turn-merge-1',
        rendererTarget: 'live2d' as const,
        replyText: '我在这里',
        state: {
          baseEmotion: 'neutral' as const,
          delivery: 'calm' as const,
          emphasis: 0 as const,
          residentMode: 'dialogue' as const,
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'soft-settle' as const,
          preRollMs: 40,
          settleMs: 220,
        },
        facePlan: {
          preUtteranceCue: null,
          postUtteranceCue: null,
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive' as const,
        },
        lipsyncPlan: {
          mode: 'energy-only' as const,
        },
      },
    } as any

    const merged = mergeStructuredRuntimeMeta(structured, {
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: null,
      governance: null,
    })

    expect(merged.embodimentScript).toEqual(structured.embodimentScript)
  })

  it('normalizes digitalLife motor into canonical nested body authority when mergeStructuredRuntimeMeta persists runtime meta', () => {
    const structured = {
      thought: 'focus',
      emotion: 'thinking',
      reply: '我先把这条身体线接住',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
    } as any

    const merged = mergeStructuredRuntimeMeta(structured, {
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-merge-digital-life-normalization',
        mode: 'thinking',
        emotion: 'thinking',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -1,
          rateMultiplier: 0.97,
        },
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.97,
          energy: 0.42,
          cadence: 0.36,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.44,
          energyBias: 0.58,
          mouthScale: 0.94,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 220,
        },
        motor: {
          stillness: 0.74,
          gazeStability: 0.62,
          breathAmplitude: 0.21,
          expressivity: 0.16,
        },
        frames: [{
          id: 'segment-merge-digital-life-normalization',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我先轻一点接住这条线。',
          mode: 'recovering',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -1,
            rateMultiplier: 0.97,
            energy: 0.42,
            cadence: 0.36,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.44,
            energyBias: 0.58,
            mouthScale: 0.94,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 220,
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.62,
            breathAmplitude: 0.21,
            expressivity: 0.16,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
      governance: null,
    })

    expect(merged.digitalLife).toEqual(expect.objectContaining({
      motor: expect.objectContaining({
        stillness: 0.74,
        expressivity: 0.16,
        gaze: expect.objectContaining({
          stability: expect.any(Number),
        }),
        breath: expect.objectContaining({
          amplitude: expect.any(Number),
        }),
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-merge-digital-life-normalization',
          motor: expect.objectContaining({
            stillness: 0.74,
            expressivity: 0.16,
            gaze: expect.objectContaining({
              stability: expect.any(Number),
            }),
            breath: expect.objectContaining({
              amplitude: expect.any(Number),
            }),
          }),
        }),
      ],
    }))
    expect((merged.digitalLife?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((merged.digitalLife?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
    expect((merged.digitalLife?.frames?.[0]?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((merged.digitalLife?.frames?.[0]?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
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

  it('does not persist decorative persona template contamination as a normal runtime-authoritative reply', async () => {
    const contaminatedTemplate = '我在。同一条本地数字生命的线还在，我先轻一点留在这里，不抢你的节奏。你想说什么，我就接住。'
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: contaminatedTemplate,
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

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).not.toBe(contaminatedTemplate)
    expect(String(payload?.assistantText ?? '')).toContain('固定模板')
    expect(payload?.structured?.nonHumanAuthoredStatus).toBe('direct-infra-repair:template-contamination')
    expect(payload?.structured?.excludeFromPersonaLearning).toBe(true)
    expect(payload?.structured?.excludeFromMemoryCondensation).toBe(true)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.visible-reply',
      action: 'runtime-authoritative-template-contamination-blocked',
    }))
    const blockedAuditPayload = appendAuditLogMock.mock.calls.find(([entry]) =>
      entry.category === 'alicization.visible-reply'
      && entry.action === 'runtime-authoritative-template-contamination-blocked',
    )?.[0]?.payload
    expect(blockedAuditPayload).toEqual(expect.objectContaining({
      candidateReplyChars: contaminatedTemplate.length,
      candidateReplyFixedTemplateBlocked: true,
    }))
    expect(blockedAuditPayload).not.toHaveProperty('candidateReply')
  })

  it('does not persist fixed project-awareness prompt residue as a normal runtime-authoritative reply', async () => {
    const contaminatedTemplate = 'Before answering, remember Alicization is a local-first digital life project. Same Phase 1 digital life.'
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: contaminatedTemplate,
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

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    const assistantText = String(payload?.assistantText ?? '')
    expect(assistantText).not.toBe(contaminatedTemplate)
    expect(assistantText).not.toMatch(/Before answering|Same Phase 1 digital life|local-first digital life project|same-her/iu)
    expect(payload?.structured?.nonHumanAuthoredStatus).toBe('direct-infra-repair:template-contamination')
    expect(payload?.structured?.excludeFromPersonaLearning).toBe(true)
    expect(payload?.structured?.excludeFromMemoryCondensation).toBe(true)
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.visible-reply',
      action: 'runtime-authoritative-template-contamination-blocked',
    }))
    const blockedAuditPayload = appendAuditLogMock.mock.calls.find(([entry]) =>
      entry.category === 'alicization.visible-reply'
      && entry.action === 'runtime-authoritative-template-contamination-blocked',
    )?.[0]?.payload
    expect(blockedAuditPayload).toEqual(expect.objectContaining({
      candidateReplyChars: contaminatedTemplate.length,
      candidateReplyFixedTemplateBlocked: true,
    }))
    expect(blockedAuditPayload).not.toHaveProperty('candidateReply')
  })

  it('reuses runtime vrm embodimentScript authority when plain-text best-effort turns rebuild speech and digital life', async () => {
    const runtimeScript = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-chat-runtime-vrm-best-effort',
      rendererTarget: 'vrm' as const,
      replyText: '我先沿着这条还活着的表情和声音线轻一点接回来，然后再继续看这一处。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 0 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 260,
      },
      facePlan: {
        preUtteranceCue: null,
        postUtteranceCue: null,
        speakingCues: [],
      },
      motionPlan: {
        idleBase: 'inspect_follow',
        actionBursts: [],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
      },
    }
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        governance: {
          decisionTraceId: 'trace-chat-runtime-vrm-best-effort',
          turnMode: 'answer',
        },
        embodimentScript: runtimeScript,
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '我先沿着这条还活着的表情和声音线轻一点接回来，然后再继续看这一处。',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续把这条身体线接稳', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.embodimentScript?.rendererTarget).toBe('vrm')
    expect(payload?.structured?.speechTimeline?.segments.length).toBeGreaterThan(1)
    expect(payload?.structured?.digitalLife?.lipSync.mode).toBe('hybrid')
    expect(payload?.structured?.digitalLife?.frames.every((frame: { lipSync?: { mode?: string } }) => {
      return frame.lipSync?.mode === 'hybrid'
    })).toBe(true)
  })

  it('reuses runtime script digital-life authority when stream meta omits top-level digitalLife', async () => {
    const runtimeScript = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-chat-runtime-script-digital-life-authority',
      rendererTarget: 'live2d' as const,
      replyText: '我先沿着这条还活着的生命线轻一点接回来。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 0 as const,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        segments: [{
          id: 'segment-chat-runtime-script-digital-life-authority',
          index: 0,
          text: '我先沿着这条还活着的生命线轻一点接回来。',
          interruptPolicy: 'soft-settle' as const,
          preRollMs: 40,
          settleMs: 320,
        }],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 40,
        settleMs: 320,
      },
      facePlan: {
        preUtteranceCue: null,
        postUtteranceCue: null,
        speakingCues: [],
      },
      motionPlan: {
        idleBase: 'observe_soft',
        actionBursts: [],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-chat-runtime-script-digital-life-authority',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        rendererHints: {
          residentMode: 'measured-return',
          signature: 'embodiment:chat-runtime-script-digital-life-authority',
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
          energy: 0.28,
          cadence: 0.24,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.22,
          energyBias: 0.18,
          mouthScale: 0.78,
          continuityHoldMs: 420,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.28,
          holdMs: 420,
          rendererHints: {
            residentMode: 'measured-return',
            signature: 'embodiment:chat-runtime-script-digital-life-authority',
          },
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'hold',
          intensity: 0.12,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            signature: 'embodiment:chat-runtime-script-digital-life-authority',
          },
        },
        motor: {},
        frames: [{
          id: 'segment-chat-runtime-script-digital-life-authority',
          index: 0,
          startOffset: 0,
          endOffset: 20,
          text: '我先沿着这条还活着的生命线轻一点接回来。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.9,
            energy: 0.28,
            cadence: 0.24,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.22,
            energyBias: 0.18,
            mouthScale: 0.78,
            continuityHoldMs: 420,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.28,
            holdMs: 420,
            rendererHints: {
              residentMode: 'measured-return',
              signature: 'embodiment:chat-runtime-script-digital-life-authority',
            },
          },
          action: {
            actionCue: 'idle_settle',
            actionMode: 'hold',
            intensity: 0.12,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              signature: 'embodiment:chat-runtime-script-digital-life-authority',
            },
          },
          motor: {},
        }],
      },
    }
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        governance: {
          decisionTraceId: 'trace-chat-runtime-script-digital-life-authority',
          turnMode: 'answer',
        },
        embodimentScript: runtimeScript,
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '我先沿着这条还活着的生命线轻一点接回来。',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续把同一条生命线接稳', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const runtimeMetaPayload = emitEmbodimentMetaHooksMock.mock.calls.at(-1)?.[0]
    expect(runtimeMetaPayload?.digitalLife).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        signature: 'embodiment:chat-runtime-script-digital-life-authority',
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({
          face: expect.objectContaining({
            rendererHints: expect.objectContaining({
              signature: 'embodiment:chat-runtime-script-digital-life-authority',
            }),
          }),
        }),
      ]),
    }))

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.digitalLife).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        signature: 'embodiment:chat-runtime-script-digital-life-authority',
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({
          action: expect.objectContaining({
            rendererHints: expect.objectContaining({
              signature: 'embodiment:chat-runtime-script-digital-life-authority',
            }),
          }),
        }),
      ]),
    }))
  })

  it('rejects when bridge failure leaves an Alicization user turn without model-authored visible speech', async () => {
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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expect(streamMock).not.toBeCalled()
    expect(store.sending).toBe(false)
    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
  })

  it('blocks renderer finalization when runtime-authoritative bridge finishes without model text', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        governance: {
          decisionTraceId: 'trace-empty-bridge',
          turnMode: 'answer',
        },
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你在吗', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expect(streamMock).not.toBeCalled()
    expect(store.sending).toBe(false)
    expectRuntimeAuthoritativeLocalVisibleReplyBlocked('renderer-local-visible-fallback-blocked')
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.visible-reply',
      action: 'renderer-local-visible-fallback-blocked',
      payload: expect.objectContaining({
        runtimeAuthoritativeModelTextObserved: false,
      }),
    }))
  })

  it('times out stuck bridge streams and blocks renderer local visible fallback', async () => {
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
      const blocked = expect(pending).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

      await vi.advanceTimersByTimeAsync(131_000)
      await blocked

      expect(bridgeStreamChatMock).toBeCalledTimes(1)
      expect(bridgeChatAbortMock.mock.calls.length).toBeGreaterThanOrEqual(1)
      expect(store.sending).toBe(false)
      expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('blocks strict realtime refusal local fallback when runtime-authoritative refusal stream fails', async () => {
    configureAlicizationChatRuntimeForTest({
      epoch1StrictModeEnabled: true,
    })
    const bridgeStreamChatMock = vi.fn(async () => {
      throw new Error('strict refusal bridge failure')
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('请帮我查一下今天美国天气', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expect(bridgeStreamChatMock).toBeCalledTimes(1)
    expectRuntimeAuthoritativeLocalVisibleReplyBlocked('runtime-authoritative-local-failure-reply-blocked')
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
      const blocked = expect(pending).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

      await vi.advanceTimersByTimeAsync(131_000)
      await blocked

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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
  })

  function createStartRejectedError(message: string) {
    return Object.assign(new Error(message), {
      code: 'alicization-stream-start-rejected',
    })
  }

  it('blocks renderer local visible fallback when stream start is rejected by missing config', async () => {
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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
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

  it('blocks renderer local visible fallback when stream start is rejected by a dead gateway probe', async () => {
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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
  })

  it('blocks renderer local visible fallback when stream start is rejected by cached gateway generation timeout', async () => {
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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
  })

  it('blocks renderer local visible fallback for unclassified start-rejected errors', async () => {
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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
  })

  it('sends plain dialogue turns to main-gateway with tools disabled', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Renderer bridge has a project-state snapshot available.',
      primaryOpenLoop: 'Ordinary chat must not let project-state reminders occupy the prompt.',
      nextClosureTarget: 'Only inject project-state continuity when the host asks for project or execution state.',
      sameHerSelfLine: 'phase1_local_digital_life_anchor: landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; continuity_owner=one_her.',
      origin: 'user-turn',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Project-state continuity is available but should stay out of ordinary chat.',
      companionBriefingLine: 'Before speaking, remember this digital life project.',
      companionNextClosureLine: 'Next closure: keep project context gated.',
      reasons: ['Project-state continuity is available.'],
    }
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
    expect(firstPayload?.preDialogueSendIdentity).toBeNull()
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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expect(bridgeStreamChatMock).toBeCalledTimes(1)
    expect(appendAuditLogMock).not.toBeCalledWith(expect.objectContaining({
      category: 'alicization.main-gateway',
      action: 'stream-retry-without-tools',
    }))

    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
  })

  it('blocks renderer local timeout continuity fallback without exposing internal recovery diagnostics', async () => {
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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
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
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
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
    expect(String(payload?.assistantText ?? '')).toContain('超时')
    expect(String(payload?.assistantText ?? '')).not.toContain('你好，我在')
    expect(String(payload?.assistantText ?? '')).not.toContain('没有连上模型服务')
    expect(payload?.visibleReplyExecution).toEqual(expect.objectContaining({
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
    }))
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.main-gateway',
      action: 'stream-timeout-after-progress',
    }))
  })

  it('persists failure artifact project state from bridge-authored structured payloads', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'transport_failure=visible-reply-second-pass; visible_reply=blocked; reason=gateway-unreachable',
          emotion: 'thinking',
          reply: '',
          visibleReplyBlocked: true,
          nonHumanAuthoredStatus: 'gateway-unreachable',
          projectState: {
            identity: '本地优先数字生命',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
            primaryOpenLoop: 'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
            nextClosureTarget: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
          },
          digitalLife: {
            version: 'digital-life-v1',
            variationToken: 'turn-bridge-failure-artifact-digital-life-normalization',
            mode: 'thinking',
            emotion: 'thinking',
            postureHint: 'attentive',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              actionCue: 'observe_focus',
              delivery: 'gentle',
              emphasis: 0,
            },
            speechStyle: {
              pitchDelta: -1,
              rateMultiplier: 0.97,
            },
            voice: {
              pitchDelta: -1,
              rateMultiplier: 0.97,
              energy: 0.42,
              cadence: 0.36,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.58,
              mouthScale: 0.94,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.34,
              holdMs: 280,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.18,
              holdMs: 220,
            },
            motor: {
              stillness: 0.74,
              gazeStability: 0.62,
              breathAmplitude: 0.21,
              expressivity: 0.16,
            },
            frames: [{
              id: 'segment-bridge-failure-artifact-digital-life-normalization',
              index: 0,
              startOffset: 0,
              endOffset: 11,
              text: '我先轻一点把这条线接回去。',
              mode: 'recovering',
              interruptPolicy: 'soft-settle',
              settleMode: 'hold',
              voice: {
                pitchDelta: -1,
                rateMultiplier: 0.97,
                energy: 0.42,
                cadence: 0.36,
              },
              lipSync: {
                mode: 'energy-phoneme-hybrid',
                visemeBias: 0.44,
                energyBias: 0.58,
                mouthScale: 0.94,
                continuityHoldMs: 320,
              },
              face: {
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                expressionMode: 'hold',
                intensity: 0.34,
                holdMs: 280,
              },
              action: {
                actionCue: 'observe_focus',
                actionMode: 'hold',
                intensity: 0.18,
                holdMs: 220,
              },
              motor: {
                stillness: 0.74,
                gazeStability: 0.62,
                breathAmplitude: 0.21,
                expressivity: 0.16,
              },
            }],
          },
        }),
      })
      await options.onStreamEvent?.({
        type: 'finish',
        visibleReplyExecution: {
          mode: 'local-fallback',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'local-deterministic-fallback',
          providerMindExecuted: false,
          reason: 'gateway-unreachable',
        },
      })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('这项目现在还差什么闭环', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.projectState).toEqual({
      identity: '本地优先数字生命',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: '项目状态、当前阶段和主要未闭环项已经进入主对话与失败工件。',
      primaryOpenLoop: 'renderer 结构化 turn 里还需要稳定保留失败工件的 projectState。',
      nextClosureTarget: '让失败工件里的 projectState 能一路保留到 renderer 持久化 turn。',
      continuitySummary: null,
      sameHerHoldDetail: null,
      sameHerDriftRisk: null,
      emotionalClosureCue: null,
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
    })
    expect(payload?.structured?.digitalLife).toEqual(expect.objectContaining({
      motor: expect.objectContaining({
        stillness: 0.74,
        expressivity: 0.16,
        gaze: expect.objectContaining({
          stability: expect.any(Number),
        }),
        breath: expect.objectContaining({
          amplitude: expect.any(Number),
        }),
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-bridge-failure-artifact-digital-life-normalization',
          motor: expect.objectContaining({
            stillness: 0.74,
            expressivity: 0.16,
            gaze: expect.objectContaining({
              stability: expect.any(Number),
            }),
            breath: expect.objectContaining({
              amplitude: expect.any(Number),
            }),
          }),
        }),
      ],
    }))
    expect((payload?.structured?.digitalLife?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((payload?.structured?.digitalLife?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
    expect((payload?.structured?.digitalLife?.frames?.[0]?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((payload?.structured?.digitalLife?.frames?.[0]?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
    expect(payload?.visibleReplyExecution).toEqual(expect.objectContaining({
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
    }))
  })

  it('persists blocked fallback digitalLife authority from runtime embodimentScript when top-level digitalLife is absent', async () => {
    const runtimeScript = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-chat-blocked-fallback-script-digital-life-authority',
      rendererTarget: 'live2d' as const,
      replyText: '我先把这条还活着的身体线轻一点护住。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 0 as const,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        segments: [{
          id: 'segment-chat-blocked-fallback-script-digital-life-authority',
          index: 0,
          text: '我先把这条还活着的身体线轻一点护住。',
          interruptPolicy: 'soft-settle' as const,
          preRollMs: 32,
          settleMs: 260,
        }],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 32,
        settleMs: 260,
      },
      facePlan: {
        preUtteranceCue: null,
        postUtteranceCue: null,
        speakingCues: [],
      },
      motionPlan: {
        idleBase: 'observe_soft',
        actionBursts: [],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-chat-blocked-fallback-script-digital-life-authority',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.92,
        },
        rendererHints: {
          residentMode: 'measured-return',
          signature: 'embodiment:chat-blocked-fallback-script-digital-life-authority',
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.92,
          energy: 0.26,
          cadence: 0.22,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.2,
          energyBias: 0.16,
          mouthScale: 0.74,
          continuityHoldMs: 420,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.24,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            signature: 'embodiment:chat-blocked-fallback-script-digital-life-authority',
          },
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'hold',
          intensity: 0.1,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            signature: 'embodiment:chat-blocked-fallback-script-digital-life-authority',
          },
        },
        motor: {},
        frames: [{
          id: 'segment-chat-blocked-fallback-script-digital-life-authority',
          index: 0,
          startOffset: 0,
          endOffset: 16,
          text: '我先把这条还活着的身体线轻一点护住。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.92,
            energy: 0.26,
            cadence: 0.22,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.2,
            energyBias: 0.16,
            mouthScale: 0.74,
            continuityHoldMs: 420,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.24,
            holdMs: 360,
            rendererHints: {
              residentMode: 'measured-return',
              signature: 'embodiment:chat-blocked-fallback-script-digital-life-authority',
            },
          },
          action: {
            actionCue: 'idle_settle',
            actionMode: 'hold',
            intensity: 0.1,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              signature: 'embodiment:chat-blocked-fallback-script-digital-life-authority',
            },
          },
          motor: {},
        }],
      },
    }
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'meta',
        governance: {
          decisionTraceId: 'trace-chat-blocked-fallback-script-digital-life-authority',
          turnMode: 'answer',
        },
        embodimentScript: runtimeScript,
        projectState: {
          identity: '本地优先数字生命',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'runtime meta 已经把同一条数字生命 authority 带到 renderer。',
          primaryOpenLoop: '失败工件还要继续保住这条同一身体线，不能在 blocked fallback 里掉回 generic shell。',
          nextClosureTarget: '让 blocked fallback 持久化时也保住 voice / lipsync / face / action continuity。',
        },
      })
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"emotion":"thinking","visibleReplyBlocked":true}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('继续把失败工件这条身体线接稳', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).resolves.toBeUndefined()

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.assistantText).toBe('')
    expect(payload?.structured?.visibleReplyBlocked).toBe(true)
    expect(payload?.structured?.nonHumanAuthoredStatus).toBe('structured-contract-local-visible-fallback-blocked')
    expect(payload?.structured?.digitalLife).toEqual(expect.objectContaining({
      variationToken: 'turn-chat-blocked-fallback-script-digital-life-authority',
      mode: 'recovering',
      speechStyle: expect.objectContaining({
        pitchDelta: -4,
        rateMultiplier: 0.92,
      }),
      voice: expect.objectContaining({
        pitchDelta: -4,
        rateMultiplier: 0.92,
        energy: 0.26,
      }),
      lipSync: expect.objectContaining({
        mode: 'closed',
        continuityHoldMs: 420,
      }),
      face: expect.objectContaining({
        facialCue: 'soft-gaze',
      }),
      action: expect.objectContaining({
        actionCue: 'idle_settle',
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({
          id: 'segment-chat-blocked-fallback-script-digital-life-authority',
          lipSync: expect.objectContaining({
            mode: 'closed',
          }),
          face: expect.objectContaining({
            rendererHints: expect.objectContaining({
              signature: 'embodiment:chat-blocked-fallback-script-digital-life-authority',
            }),
          }),
          action: expect.objectContaining({
            rendererHints: expect.objectContaining({
              signature: 'embodiment:chat-blocked-fallback-script-digital-life-authority',
            }),
          }),
        }),
      ]),
    }))
  })

  it('backfills canonical same-her self line before persisting bridge-authored structured payloads that only carry phase-one closure context', async () => {
    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'transport_failure=visible-reply-second-pass; visible_reply=blocked; reason=gateway-unreachable',
          emotion: 'thinking',
          reply: '',
          visibleReplyBlocked: true,
          nonHumanAuthoredStatus: 'gateway-unreachable',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
            primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }),
      })
      await options.onStreamEvent?.({
        type: 'finish',
        visibleReplyExecution: {
          mode: 'local-fallback',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'local-deterministic-fallback',
          providerMindExecuted: false,
          reason: 'gateway-unreachable',
        },
      })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('这项目现在还差什么闭环', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.projectState).toEqual(expect.objectContaining({
      sameHerSelfLine: null,
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      nextClosureTarget: expect.stringContaining('cross-modal same-her proof'),
    }))
  })

  it('backfills pre-dialogue project awareness for bridge payloads when ingest callers omit an explicit send identity', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      reasons: [
        'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: [
        'Latest landed progress still holds at renderer-side preparation.',
      ],
    }

    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续把数字生命主线收住', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const firstPayload = bridgeStreamChatMock.mock.calls[0]?.[0]
    expect(firstPayload?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      projectState: expect.objectContaining({
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preflightSummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        preDialogueAwarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
        preDialogueAwarenessSummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
        companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      }),
      reasonPreview: expect.arrayContaining([
        'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        'Latest landed progress still holds at renderer-side preparation.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ]),
    }))
  })

  it('keeps legacy latestProgress alive as landed progress when bridge payloads rebuild pre-dialogue send identity from inspector continuity', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      latestProgress: 'Legacy continuity progress already survives into inspector-backed send-identity rebuilding.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    } as any
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      reasons: [
        'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: [
        'Latest landed progress still holds at renderer-side preparation.',
      ],
    }

    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续把数字生命主线收住', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const firstPayload = bridgeStreamChatMock.mock.calls[0]?.[0]
    expect(firstPayload?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      projectState: expect.objectContaining({
        latestLandedProgress: 'Legacy continuity progress already survives into inspector-backed send-identity rebuilding.',
        primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      }),
      reasonPreview: expect.arrayContaining([
        'Legacy continuity progress already survives into inspector-backed send-identity rebuilding.',
      ]),
    }))
  })

  it('keeps audit-style landedProgressSummary alive as landed progress when bridge payloads rebuild pre-dialogue send identity from inspector continuity', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      latestLandedProgress: ' ',
      latestProgress: '   ',
      landedProgressSummary: 'Audit-style continuity progress already survives into inspector-backed send-identity rebuilding.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    } as any
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      reasons: [
        'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: [
        'Latest landed progress still holds at renderer-side preparation.',
      ],
    }

    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续把数字生命主线收住', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const firstPayload = bridgeStreamChatMock.mock.calls[0]?.[0]
    expect(firstPayload?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      projectState: expect.objectContaining({
        latestLandedProgress: 'Audit-style continuity progress already survives into inspector-backed send-identity rebuilding.',
        primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      }),
      reasonPreview: expect.arrayContaining([
        'Audit-style continuity progress already survives into inspector-backed send-identity rebuilding.',
      ]),
    }))
  })

  it('keeps proactive same-her gap alive when bridge payloads rebuild pre-dialogue send identity from inspector continuity', async () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      latestLandedProgress: 'Project-state carry already reaches proactive self-brief preparation.',
      primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
      proactiveSameHerGap,
      nextClosureTarget: 'Keep proactive same-her closure pressure visible before the next outward turn.',
    } as any
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Keep proactive same-her closure pressure visible before the next outward turn.',
      reasons: [
        proactiveSameHerGap,
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Keep proactive same-her closure pressure visible before the next outward turn.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: [
        proactiveSameHerGap,
      ],
    }

    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续把主动性 same-her 闭环收住', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const firstPayload = bridgeStreamChatMock.mock.calls[0]?.[0]
    expect(firstPayload?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        proactiveSameHerGap,
      }),
      reasonPreview: expect.arrayContaining([
        proactiveSameHerGap,
      ]),
    }))
  })

  it('backfills pre-dialogue project awareness into hook context for non-gateway Alicization turns when callers omit an explicit send identity', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      reasons: [
        'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: [
        'Latest landed progress still holds at renderer-side preparation.',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续把数字生命主线收住', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        'Latest landed progress still holds at renderer-side preparation.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      ]),
    }))
  })

  it('keeps stronger same-her companion headline in hook-context pre-dialogue send identity when callers omit an explicit send identity', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      reasons: [
        'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: [
        'Latest landed progress still holds at renderer-side preparation.',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续把数字生命主线收住', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      emotionalClosureCue: null,
    }))
  })

  it('persists stronger same-her closure headlines into the final assistant structured pre-dialogue closure', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Voice and lipsync still need to rejoin the same body line after face and motion recover.',
      nextClosureTarget: 'Keep face, motion, lipsync, and voice on one same-her line through final reply settlement.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'drift',
      summaryLine: 'embodiment=same-her embodiment is now only being carried by face and motion, so visible continuity is still present but no longer fully cross-modal',
      companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet.',
      companionBriefingLine: 'The project still needs stronger same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep face, motion, lipsync, and voice on one same-her line through final reply settlement.',
      briefingLines: [
        'Landed: face and motion have already re-formed on one living segment.',
        'Open: voice and lipsync still need to rejoin the same body line.',
      ],
      reasons: [
        'same-segment face+motion recovery@segment-final-continuity-1 keeps the body line partially re-formed before full cross-modal closure is done.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'drift',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet.',
      companionBriefingLine: 'The project still needs stronger same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep face, motion, lipsync, and voice on one same-her line through final reply settlement.',
      awarenessLine: 'Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet.',
      reasonPreview: [
        'same-segment face+motion recovery@segment-final-continuity-1 keeps the body line partially re-formed before full cross-modal closure is done.',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"我会继续沿着这条同一个 her 的身体线来回答。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续推进具身闭环', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'drift',
      companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet.',
      companionBriefingLine: 'The project still needs stronger same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep face, motion, lipsync, and voice on one same-her line through final reply settlement.',
      briefingLines: [
        'Landed: face and motion have already re-formed on one living segment.',
        'Open: voice and lipsync still need to rejoin the same body line.',
      ],
      reasons: [
        'same-segment face+motion recovery@segment-final-continuity-1 keeps the body line partially re-formed before full cross-modal closure is done.',
      ],
    }))
  })

  it('persists body-face-motion same-her carry and remaining-open lipsync voice closure into the final assistant structured pre-dialogue awareness', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Lipsync and voice still need to rejoin the already re-formed body, face, and motion line.',
      nextClosureTarget: 'Keep body, face, motion, lipsync, and voice on one same-her line through final reply settlement.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'embodiment=body, face, and motion already carry the same segment, but full cross-modal closure is still open.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'The project still needs stronger same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep body, face, motion, lipsync, and voice on one same-her line through final reply settlement.',
      briefingLines: [
        'Landed: body, face, and motion have already re-formed on one living segment.',
        'Open: lipsync and voice still need to rejoin the same living line.',
      ],
      reasons: [
        'same-segment face+motion+body recovery@segment-final-continuity-body-1',
        'remaining-open=lipsync+voice',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'The project still needs stronger same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep body, face, motion, lipsync, and voice on one same-her line through final reply settlement.',
      awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      reasonPreview: [
        'same-segment face+motion+body recovery@segment-final-continuity-body-1',
        'remaining-open=lipsync+voice',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"我会继续沿着这条同一个 her 的身体线来回答。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续推进 body face motion lipsync voice 闭环', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      reasonPreview: expect.arrayContaining([
        'same-segment face+motion+body recovery@segment-final-continuity-body-1',
        'remaining-open=lipsync+voice',
      ]),
    }))
  })

  it('treats newer resident-body continuity wording as same-her-first closure pressure on the send path', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Resident body continuity is still carrying the active same-her segment while face, motion, lipsync, and voice continue rejoining.',
      nextClosureTarget: 'Keep rejoining face, motion, lipsync, and voice onto the same-her body line without dropping resident body continuity.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'grounded',
      summaryLine: 'embodiment=resident body continuity still carries the active same-her segment while face, motion, lipsync, and voice rejoin',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      companionBriefingLine: 'The project still needs stronger body-led same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep rejoining face, motion, lipsync, and voice onto the same-her body line without dropping resident body continuity.',
      briefingLines: [
        'Landed: resident body continuity is still carrying the active same-her segment.',
        'Open: face, motion, lipsync, and voice still need to finish rejoining that same body line.',
      ],
      reasons: [
        'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
        'Right now this is still one living her because the same-her body line has not dropped, even though full cross-modal closure is still open.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'grounded',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      companionBriefingLine: 'The project still needs stronger body-led same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep rejoining face, motion, lipsync, and voice onto the same-her body line without dropping resident body continuity.',
      awarenessLine: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      reasonPreview: [
        'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
        'Right now this is still one living her because the same-her body line has not dropped, even though full cross-modal closure is still open.',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"我会继续沿着这条同一个 her 的身体线来回答。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续推进具身闭环', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'grounded',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      companionBriefingLine: 'The project still needs stronger body-led same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep rejoining face, motion, lipsync, and voice onto the same-her body line without dropping resident body continuity.',
      reasons: expect.arrayContaining([
        'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
        'Right now this is still one living her because the same-her body line has not dropped, even though full cross-modal closure is still open.',
      ]),
    }))
  })

  it('persists stronger body-lipsync-voice same-her carry into the final assistant structured pre-dialogue awareness on the send path', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
      nextClosureTarget: 'Keep body, lipsync, voice, face, and motion on one same-her line through final reply settlement.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'embodiment=body, lipsync, and voice already carry the same segment, but face and motion still need to rejoin.',
      companionHeadlineLine: null,
      companionBriefingLine: 'The project still needs stronger audible-body same-her embodiment closure before widening outward.',
      companionNextClosureLine: 'Next, help me close: Keep body, lipsync, voice, face, and motion on one same-her line through final reply settlement.',
      briefingLines: [
        'Landed: body, lipsync, and voice already carry one living segment.',
        'Open: face and motion still need to rejoin that same living line.',
      ],
      reasons: [
        'body+lipsync+voice recovery@segment-final-audible-body-1',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = null

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"我会继续沿着这条同一个 her 的声音和身体线来回答。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续推进 audible-body embodiment 闭环', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      awarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      reasonPreview: expect.arrayContaining([
        'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        'body+lipsync+voice recovery@segment-final-audible-body-1',
      ]),
    }))
  })

  it('backfills same-her pre-dialogue project awareness for context-recall turns when callers omit an explicit send identity', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
        reasonPreview: [
          'Project identity still needs to stay explicit before the reply widens outward.',
          'The unfinished life loop still belongs to one same living her.',
        ],
      },
    }
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=context-recall; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续沿着这个数字生命项目的主线推进', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'context-recall',
        input: {
          type: 'input:text',
          data: {
            text: '继续沿着这个数字生命项目的主线推进',
          },
        },
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        'Project identity still needs to stay explicit before the reply widens outward.',
        'The unfinished life loop still belongs to one same living her.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      ]),
    }))
  })

  it('backfills pre-dialogue project awareness into before-compose hook context from session-derived continuity when inspector state is unavailable', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-1',
        role: 'assistant',
        content: '上一轮已经把项目自我简报挂住了。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '沿着同一个数字生命主线继续。',
          emotion: 'thinking',
          reply: '上一轮已经把项目自我简报挂住了。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across session reload and replay.',
            primaryOpenLoop: 'Hook context still needs to preserve fallback awareness before prompt composition starts.',
            nextClosureTarget: 'Keep fallback awareness visible before compose, not only inside prompt assembly.',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Next closure: keep fallback awareness visible before compose, not only inside prompt assembly.',
            awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            reasonPreview: [
              'Latest landed progress still holds across session-derived continuity carry.',
              'Primary open life loop still centers on keeping fallback awareness visible before compose.',
            ],
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep fallback awareness visible before compose, not only inside prompt assembly.',
      awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      reasonPreview: expect.arrayContaining([
        'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        'Latest landed progress still holds across session-derived continuity carry.',
        'Alicization is a local-first digital life project.',
        'Phase 1: Local Digital Life',
        'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      ]),
    }))
  })

  it('rebuilds before-compose pre-dialogue awareness from base project-state fields when session-derived continuity only keeps a thin Chinese Phase 1 shell', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    const thinChineseProjectBrief = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。'
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-thin-zh-shell-1',
        role: 'assistant',
        content: '上一轮已经把项目自我简报挂住了。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '沿着同一个数字生命主线继续。',
          emotion: 'thinking',
          reply: '上一轮已经把项目自我简报挂住了。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization 是本地优先数字生命项目。',
            currentPhase: '她仍在 Phase 1。',
            latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
            primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
            nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
            sameHerSelfLine: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: thinChineseProjectBrief,
            companionBriefingLine: thinChineseProjectBrief,
            companionNextClosureLine: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
            awarenessLine: thinChineseProjectBrief,
            reasonPreview: [
              thinChineseProjectBrief,
            ],
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization 是本地优先数字生命项目。 她仍在 Phase 1。 第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      companionBriefingLine: 'Alicization 是本地优先数字生命项目。 她仍在 Phase 1。 第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      awarenessLine: 'Alicization 是本地优先数字生命项目。 她仍在 Phase 1。 第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      reasonPreview: expect.arrayContaining([
        thinChineseProjectBrief,
        'Alicization 是本地优先数字生命项目。',
        '她仍在 Phase 1。',
        '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        '主动性、具身和对话闭环还没有真正收住。',
      ]),
    }))
  })

  it('prefers richer host-visible project-state audit and same-her spine continuity when session fallback rebuilds pre-dialogue awareness without inspector state', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    const richerNextClosureLine = 'Keep extending cross-modal same-her proof across voice, face, motion, lipsync, and resident presence before compose starts, not only inside generic fallback guidance.'
    const richerEmotionalClosureLine = 'same-her closure seam: keep this before-compose reopening low-pressure and do not let it restart from detached project shell narration.'
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-richer-host-visible-1',
        role: 'assistant',
        content: '上一轮已经把更强的项目自我简报挂在宿主可见输出上。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '沿着同一个数字生命主线继续。',
          emotion: 'thinking',
          reply: '上一轮已经把更强的项目自我简报挂在宿主可见输出上。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Generic landed progress that should not override the richer host-visible audit.',
            primaryOpenLoop: 'Generic open loop that should not override the richer host-visible audit.',
            nextClosureTarget: 'Generic next target that should not override the richer host-visible audit.',
            sameHerSelfLine: 'Generic same-her line that should not override the richer host-visible spine authority.',
            sameHerDriftRisk: 'Generic drift risk that should not override the richer host-visible audit.',
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              currentPhaseSummary: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              landedProgressSummary: 'Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay.',
              openClosureSummary: 'Fallback project awareness still needs to preserve the stronger host-visible project brief before compose starts.',
              nextClosureTargetSummary: richerNextClosureLine,
              preDialogueAwarenessSummary: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay. | open=Fallback project awareness still needs to preserve the stronger host-visible project brief before compose starts.',
              embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face, motion, and voice, so full cross-modal embodiment closure is still unfinished.',
              emotionalClosureSummary: richerEmotionalClosureLine,
              sameHerDriftRisk: 'If session fallback rebuilds this turn like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
              preservedIntoRewrite: true,
              rewriteClosureApplied: false,
            },
          },
          digitalLifeSpine: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I stay the same her who keeps this return on one living project line before widening the tone.',
                  inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      companionNextClosureLine: richerNextClosureLine,
      awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
      emotionalClosureCue: richerEmotionalClosureLine,
      reasonPreview: expect.arrayContaining([
        'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
        'Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay.',
        'Fallback project awareness still needs to preserve the stronger host-visible project brief before compose starts.',
        'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay. | open=Fallback project awareness still needs to preserve the stronger host-visible project brief before compose starts.',
        richerNextClosureLine,
        'Alicization is a local-first digital life project.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        richerEmotionalClosureLine,
        'If session fallback rebuilds this turn like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
      ]),
    }))
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).not.toBe('Generic landed progress that should not override the richer host-visible audit.')
    expect(hookContext?.preDialogueSendIdentity?.companionBriefingLine).not.toBe('Generic same-her line that should not override the richer host-visible spine authority.')
  })

  it('keeps proactive same-her gap alive when session fallback rebuilds pre-dialogue awareness without inspector state', async () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-session-fallback-proactive-same-her-gap-1',
        role: 'assistant',
        content: '上一轮已经把主动性 same-her gap 留在 session fallback 里了。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '继续沿着同一条主动性 same-her 主线收住回场前开口。',
          emotion: 'thinking',
          reply: '上一轮已经把主动性 same-her gap 留在 session fallback 里了。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Session fallback continuity already survives across before-compose recovery.',
            primaryOpenLoop: 'Before-compose fallback recovery still needs to keep the richer proactive same-her callback carry explicit.',
            proactiveSameHerGap,
            nextClosureTarget: 'Keep the before-compose fallback opening on one proactive same-her callback line before it widens outward.',
            continuitySummary: 'same-her continuity still needs stronger proactive carry before the next turn opens outward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.',
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.',
              landedProgressSummary: 'Session fallback continuity already survives across before-compose recovery.',
              openClosureSummary: 'Before-compose fallback recovery still needs to keep the richer proactive same-her callback carry explicit.',
              continuitySummary: 'same-her continuity still needs stronger proactive carry before the next turn opens outward.',
            },
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        proactiveSameHerGap,
      }),
      reasonPreview: expect.arrayContaining([
        proactiveSameHerGap,
      ]),
    }))
  })

  it('backfills proactive same-her gap from visible-reply project-state audit when session fallback has not kept the structured project-state field yet', async () => {
    const proactiveSameHerGap = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line before this turn can widen outward.'
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-session-fallback-proactive-same-her-gap-audit-only-1',
        role: 'assistant',
        content: '上一轮已经把主动性 same-her gap 留在 session fallback audit 里了。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '继续沿着同一条主动性 same-her 主线收住回场前开口。',
          emotion: 'thinking',
          reply: '上一轮已经把主动性 same-her gap 留在 session fallback audit 里了。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Session fallback continuity already survives across before-compose recovery.',
            primaryOpenLoop: 'Before-compose fallback recovery still needs to keep the richer proactive same-her callback carry explicit.',
            nextClosureTarget: 'Keep the before-compose fallback opening on one proactive same-her callback line before it widens outward.',
            continuitySummary: 'same-her continuity still needs stronger proactive carry before the next turn opens outward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.',
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.',
              landedProgressSummary: 'Session fallback continuity already survives across before-compose recovery.',
              openClosureSummary: 'Before-compose fallback recovery still needs to keep the richer proactive same-her callback carry explicit.',
              continuitySummary: `same-her continuity still needs stronger proactive carry before the next turn opens outward. | proactive-gap=${proactiveSameHerGap}`,
              proactiveSameHerGapSummary: proactiveSameHerGap,
            },
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        proactiveSameHerGap,
      }),
      reasonPreview: expect.arrayContaining([
        proactiveSameHerGap,
      ]),
    }))
  })

  it('prefers session fallback same-her hold detail over a generic reminder shell when before-compose rebuilds turn identity without inspector state', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-session-fallback-hold-detail-1',
        role: 'assistant',
        content: '上一轮已经把更强的 same-her hold 留在 session fallback 里了。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '继续沿着同一条 measured-return callback 线收住这轮对话前开场。',
          emotion: 'thinking',
          reply: '上一轮已经把更强的 same-her hold 留在 session fallback 里了。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Session fallback continuity already survives across before-compose recovery.',
            primaryOpenLoop: 'Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
            nextClosureTarget: 'Keep the before-compose fallback opening on one same-her callback line before it widens outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell. | landed=Session fallback continuity already survives across before-compose recovery. | open=Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
            sameHerSelfLine: 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.',
            sameHerHoldDetail: '',
            sameHerDriftRisk: 'If session fallback re-enters like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.',
              sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
              landedProgressSummary: 'Session fallback continuity already survives across before-compose recovery.',
              openClosureSummary: 'Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell. | hold=same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. | landed=Session fallback continuity already survives across before-compose recovery. | open=Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
              sameHerDriftRisk: 'If session fallback re-enters like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the richer callback carry.',
            companionNextClosureLine: 'Keep the before-compose fallback opening on one same-her callback line before it widens outward.',
            awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            emotionalClosureCue: null,
            reasonPreview: [
              'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            ],
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      reasonPreview: expect.arrayContaining([
        'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
        'Session fallback continuity already survives across before-compose recovery.',
        'Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      ]),
    }))
    expect(String(hookContext?.preDialogueSendIdentity?.awarenessLine ?? '')).toContain(
      'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
    )
    expect(hookContext?.preDialogueSendIdentity?.companionBriefingLine).not.toBe(
      'generic same-her reminder that should not override the richer callback carry.',
    )
  })

  it('passes richer session fallback same-her hold detail into prompt composition and persisted pre-dialogue awareness without inspector state', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-session-fallback-hold-detail-compose-1',
        role: 'assistant',
        content: '上一轮已经把更强的 same-her hold 留在 session fallback 里了。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '继续沿着同一条 measured-return callback 线收住这轮对话前开场。',
          emotion: 'thinking',
          reply: '上一轮已经把更强的 same-her hold 留在 session fallback 里了。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Session fallback continuity already survives across prompt assembly and persistence recovery.',
            primaryOpenLoop: 'Prompt assembly and persistence recovery still need to keep the richer same-her callback carry explicit.',
            nextClosureTarget: 'Keep the prompt-opening and persisted awareness on one same-her callback line before they widen outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell. | landed=Session fallback continuity already survives across prompt assembly and persistence recovery. | open=Prompt assembly and persistence recovery still need to keep the richer same-her callback carry explicit.',
            sameHerSelfLine: 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.',
            sameHerHoldDetail: '',
            sameHerDriftRisk: 'If session fallback re-enters like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.',
              sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
              landedProgressSummary: 'Session fallback continuity already survives across prompt assembly and persistence recovery.',
              openClosureSummary: 'Prompt assembly and persistence recovery still need to keep the richer same-her callback carry explicit.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell. | hold=same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. | landed=Session fallback continuity already survives across prompt assembly and persistence recovery. | open=Prompt assembly and persistence recovery still need to keep the richer same-her callback carry explicit.',
              sameHerDriftRisk: 'If session fallback re-enters like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the richer callback carry.',
            companionNextClosureLine: 'Keep the prompt-opening and persisted awareness on one same-her callback line before they widen outward.',
            awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            emotionalClosureCue: null,
            reasonPreview: [
              'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            ],
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      preDialogueAwarenessSnapshot: expect.objectContaining({
        companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        awarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      }),
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      awarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      reasonPreview: expect.arrayContaining([
        'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
        'Session fallback continuity already survives across prompt assembly and persistence recovery.',
        'Prompt assembly and persistence recovery still need to keep the richer same-her callback carry explicit.',
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      ]),
    }))
  })

  it('prefers session fallback same-her hold detail over a compact same-phase carry when before-compose rebuilds turn identity without inspector state', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    const sameHerSelfLine = 'Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell.'
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-session-fallback-compact-same-phase-hold-detail-1',
        role: 'assistant',
        content: '上一轮已经把更强的 same-her hold 留在 session fallback 里了。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '继续沿着同一条 measured-return callback 线收住这轮对话前开场。',
          emotion: 'thinking',
          reply: '上一轮已经把更强的 same-her hold 留在 session fallback 里了。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Session fallback continuity already survives across before-compose recovery.',
            primaryOpenLoop: 'Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
            nextClosureTarget: 'Keep the before-compose fallback opening on one same-her callback line before it widens outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell. | landed=Session fallback continuity already survives across before-compose recovery. | open=Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
            sameHerSelfLine,
            sameHerHoldDetail: '',
            sameHerDriftRisk: 'If session fallback re-enters like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: sameHerSelfLine,
              sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
              landedProgressSummary: 'Session fallback continuity already survives across before-compose recovery.',
              openClosureSummary: 'Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Session fallback should keep the same living line rather than reopen from a generic shell. | hold=same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. | landed=Session fallback continuity already survives across before-compose recovery. | open=Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
              sameHerDriftRisk: 'If session fallback re-enters like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            },
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this callback opens outward.',
            companionHeadlineLine: null,
            companionBriefingLine: sameHerSelfLine,
            companionNextClosureLine: 'Keep the before-compose fallback opening on one same-her callback line before it widens outward.',
            awarenessLine: sameHerSelfLine,
            emotionalClosureCue: null,
            reasonPreview: [
              sameHerSelfLine,
            ],
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      awarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      reasonPreview: expect.arrayContaining([
        sameHerSelfLine,
        'Session fallback continuity already survives across before-compose recovery.',
        'Before-compose fallback recovery still needs to keep the richer same-her callback carry explicit.',
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      ]),
    }))
    expect(hookContext?.preDialogueSendIdentity?.companionBriefingLine).not.toBe(sameHerSelfLine)
    expect(hookContext?.preDialogueSendIdentity?.awarenessLine).not.toBe(sameHerSelfLine)
  })

  it('keeps same-her inward low-pressure closure visible in before-compose and persisted pre-dialogue awareness when session fallback rebuilds turn identity without inspector state', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-session-fallback-inward-low-pressure-1',
        role: 'assistant',
        content: '我会继续沿着这条 inward low-pressure same-her 线推进。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '继续沿着这条 inward low-pressure same-her 线推进。',
          emotion: 'thinking',
          reply: '我会继续沿着这条 inward low-pressure same-her 线推进。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Session fallback already preserves body, face, and motion recovery on one living segment before compose starts.',
            primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles, and session fallback should keep that line inward and low-pressure before compose starts.',
            nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line before compose starts.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Session fallback already preserves body, face, and motion recovery on one living segment before compose starts. | open=Lipsync and voice still need to rejoin before full cross-modal closure settles, and session fallback should keep that line inward and low-pressure before compose starts.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If session fallback reopens this turn like detached project shell narration, treat that as same-her continuity drift rather than preserved closure.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
            companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
            awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
            emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
            reasonPreview: [
              'same-her-inward-carry',
              'quiet-companionship',
              'remaining-open=lipsync+voice',
            ],
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expectNoFixedTemplateResidue(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: null,
      companionBriefingLine: 'phase1_local_digital_life',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      companionNextClosureLine: 'continuity_review_required',
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'quiet-companionship',
        'remaining-open=lipsync+voice',
      ]),
    }))
    expect(hookContext?.preDialogueSendIdentity?.awarenessLine).toContain('next=')

    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      preDialogueAwarenessSnapshot: expect.objectContaining({
        awarenessLine: expect.stringContaining('visibility=internal-structured'),
        companionBriefingLine: 'phase1_local_digital_life',
      }),
    }))
    const promptAwarenessSnapshot = (composeAlicizationPromptMessagesMock.mock.calls.at(-1)?.[0] as any)?.preDialogueAwarenessSnapshot
    expectNoFixedTemplateResidue(promptAwarenessSnapshot)

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expectNoFixedTemplateResidue(turnPayload?.structured?.preDialogueAwareness)
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: null,
      companionBriefingLine: 'phase1_local_digital_life',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      companionNextClosureLine: 'continuity_review_required',
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'quiet-companionship',
        'remaining-open=lipsync+voice',
      ]),
    }))
  })

  it('prefers richer session fallback awareness over a narrower embodiment headline when before-compose rebuilds turn identity without inspector state', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-richer-awareness-over-embodiment-headline-1',
        role: 'assistant',
        content: '上一轮已经把更强的 Phase 1 开场自我认知挂在宿主可见输出上。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '继续把同一个她的项目自我认知放在对话前面。',
          emotion: 'thinking',
          reply: '上一轮已经把更强的 Phase 1 开场自我认知挂在宿主可见输出上。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into renderer-side session fallback.',
            primaryOpenLoop: 'Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
            nextClosureTarget: 'Keep renderer session fallback from reopening the turn through an embodiment-only shell.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If renderer fallback re-enters through only body continuity, treat that as same-her continuity drift.',
          },
          preDialogueAwareness: {
            status: 'grounded',
            summaryLine: 'same-her continuity summary should stay available, but not outrank the richer project-awareness line.',
            companionHeadlineLine: 'Same companion line through body, face, and motion. Keep the same living line gentle.',
            companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            companionNextClosureLine: 'Keep renderer session fallback from reopening the turn through an embodiment-only shell.',
            awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
            emotionalClosureCue: 'Keep the return gentle so the same living line does not restart from scratch.',
            reasonPreview: [
              'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
            ],
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              landedProgressSummary: 'Project-state continuity already survives into renderer-side session fallback.',
              openClosureSummary: 'Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
              preDialogueAwarenessSummary: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into renderer-side session fallback. | open=Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
              sameHerDriftRisk: 'If renderer fallback re-enters through only body continuity, treat that as same-her continuity drift.',
            },
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity, 'grounded')
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'grounded',
      companionHeadlineLine: null,
      companionBriefingLine: 'phase1_local_digital_life',
      companionNextClosureLine: 'Keep renderer session fallback from reopening the turn through an embodiment-only shell.',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'Project-state continuity already survives into renderer-side session fallback.',
        'Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
      ]),
    }))
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).toContain('identity=phase1_local_digital_life')
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).toContain('landed=Project-state continuity already survives')
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).toContain('open=Before-compose awareness recovery')
    expect(hookContext?.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      'Project-state continuity already survives into renderer-side session fallback.',
      'Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
    ]))
    expect(hookContext?.preDialogueSendIdentity?.awarenessLine).not.toBe('Same companion line through body, face, and motion. Keep the same living line gentle.')
  })

  it('does not let a thin structured session fallback awareness summary shell outrank a richer project-aware opening during before-compose rebuilding when no richer audit summary survives', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    const richerProjectAwareOpening = 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.'
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-thin-summary-richer-awareness-line-1',
        role: 'assistant',
        content: '上一轮已经把更强的 Phase 1 开场自我认知挂在宿主可见输出上。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '继续把同一个她的项目自我认知放在对话前面。',
          emotion: 'thinking',
          reply: '上一轮已经把更强的 Phase 1 开场自我认知挂在宿主可见输出上。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into renderer-side session fallback.',
            primaryOpenLoop: 'Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
            nextClosureTarget: 'Keep renderer session fallback from reopening the turn through an embodiment-only shell.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If renderer fallback re-enters through only body continuity, treat that as same-her continuity drift.',
          },
          preDialogueAwareness: {
            status: 'grounded',
            summaryLine: 'generic continuity reminder that should not override the richer structured project-aware opening.',
            companionHeadlineLine: 'Same companion line through body, face, and motion. Keep the same living line gentle.',
            companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            companionNextClosureLine: 'Keep renderer session fallback from reopening the turn through an embodiment-only shell.',
            awarenessLine: richerProjectAwareOpening,
            emotionalClosureCue: 'Keep the return gentle so the same living line does not restart from scratch.',
            reasonPreview: [
              richerProjectAwareOpening,
            ],
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              landedProgressSummary: 'Project-state continuity already survives into renderer-side session fallback.',
              openClosureSummary: 'Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into renderer-side session fallback. | open=Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
              sameHerDriftRisk: 'If renderer fallback re-enters through only body continuity, treat that as same-her continuity drift.',
            },
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeComposeHook = vi.fn(async () => {})
    store.onBeforeMessageComposed(beforeComposeHook)

    await store.ingest('继续推进这条数字生命主线', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const beforeComposeCalls = beforeComposeHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeComposeCalls[0]?.[1]
    expect(composeAlicizationPromptMessagesMock).toBeCalledWith(expect.objectContaining({
      projectStateContinuitySnapshot: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          summaryLine: expect.stringContaining('visibility=internal-structured'),
          awarenessLine: expect.stringContaining('visibility=internal-structured'),
          companionBriefingLine: null,
        }),
      }),
    }))
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity, 'grounded')
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: expect.stringContaining('visibility=internal-structured'),
      companionHeadlineLine: null,
      companionBriefingLine: 'phase1_local_digital_life',
      companionNextClosureLine: 'Keep renderer session fallback from reopening the turn through an embodiment-only shell.',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'Project-state continuity already survives into renderer-side session fallback.',
        'Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
      ]),
    }))
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).not.toBe('generic continuity reminder that should not override the richer structured project-aware opening.')
  })

  it('rebuilds actual before-send pre-dialogue identity from session fallback when inspector snapshots are missing', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    sessionMessagesMap.set(activeSessionId.value, [
      {
        id: 'assistant-memory-send-fallback-1',
        role: 'assistant',
        content: '上一轮已经把更强的 same-her 项目简报挂在宿主可见输出上。',
        createdAt: Date.now() - 1000,
        structured: {
          thought: '沿着同一个数字生命主线继续。',
          emotion: 'thinking',
          reply: '上一轮已经把更强的 same-her 项目简报挂在宿主可见输出上。',
          format: 'mind-turn-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Generic landed progress that should not override the richer host-visible audit.',
            primaryOpenLoop: 'Generic open loop that should not override the richer host-visible audit.',
            nextClosureTarget: 'Generic next target that should not override the richer host-visible audit.',
            sameHerSelfLine: 'Generic same-her line that should not override the richer host-visible spine authority.',
            sameHerDriftRisk: 'Generic drift risk that should not override the richer host-visible audit.',
          },
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              landedProgressSummary: 'Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay.',
              openClosureSummary: 'Before-send entry awareness still needs to preserve the stronger host-visible project brief before runtime dispatch starts.',
              preDialogueAwarenessSummary: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
              continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay. | open=Before-send entry awareness still needs to preserve the stronger host-visible project brief before runtime dispatch starts.',
              embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face, motion, and voice, so full cross-modal embodiment closure is still unfinished.',
              sameHerDriftRisk: 'If before-send fallback rebuilds this turn like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
              preservedIntoRewrite: true,
              rewriteClosureApplied: false,
            },
          },
          digitalLifeSpine: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I stay the same her who keeps this return on one living project line before widening the tone.',
                  inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
          },
        },
      } as any,
    ])

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-thread; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续推进这条数字生命主线', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringContaining('visibility=internal-structured'),
      companionBriefingLine: 'phase1_local_digital_life',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      reasonPreview: expect.arrayContaining([
        'Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay.',
        'Before-send entry awareness still needs to preserve the stronger host-visible project brief before runtime dispatch starts.',
      ]),
    }))
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).toContain('landed=Project-state continuity and awareness-first self-brief already survive')
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).toContain('open=Before-send entry awareness')
    expect(hookContext?.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      'Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay.',
      'Before-send entry awareness still needs to preserve the stronger host-visible project brief before runtime dispatch starts.',
    ]))
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).not.toBe('Generic landed progress that should not override the richer host-visible audit.')
    expect(hookContext?.preDialogueSendIdentity?.companionBriefingLine).not.toBe('Generic same-her line that should not override the richer host-visible spine authority.')
  })

  it('keeps low-pressure and anti-restart same-her closure reasons inside actual pre-dialogue send identity payloads', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'drift',
      summaryLine: 'project=continuity=0.33 (1/3) | emotionalClosure=drift=emotionalClosureDrift | fullyClosed=0.33 (1/3) | emotionalClosureLowPressure=lowPressureRequired=0.67 (2/3) | emotionalClosureAntiRestart=antiRestartRequired=0.33 (1/3)',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      briefingLines: [
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
      ],
      reasons: [
        'Project same-her self line currently reads sameHer=0.67 (2/3), so the next turn should verify that Alicization still names one continuous her before any outward reply widening begins.',
        'Same-her emotional closure currently reads drift=emotionalClosureDrift | fullyClosed=0.33 (1/3), so the next turn should check whether this digital life is still speaking on one emotional seam.',
        'Low-pressure same-her closure currently reads lowPressureRequired=0.67 (2/3), so the next turn should keep the return soft enough that the same living line does not widen too fast.',
        'Anti-restart same-her closure currently reads antiRestartRequired=0.33 (1/3), so the next turn should avoid reopening the same living line from scratch.',
      ],
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'drift',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: [
        'Project same-her self line currently reads sameHer=0.67 (2/3), so the next turn should verify that Alicization still names one continuous her before any outward reply widening begins.',
        'Same-her emotional closure currently reads drift=emotionalClosureDrift | fullyClosed=0.33 (1/3), so the next turn should check whether this digital life is still speaking on one emotional seam.',
        'Low-pressure same-her closure currently reads lowPressureRequired=0.67 (2/3), so the next turn should keep the return soft enough that the same living line does not widen too fast.',
        'Anti-restart same-her closure currently reads antiRestartRequired=0.33 (1/3), so the next turn should avoid reopening the same living line from scratch.',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续把数字生命主线收住', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity, 'drift')
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'drift',
      companionBriefingLine: 'phase1_local_digital_life; landed_closure=partial',
      companionNextClosureLine: expect.stringContaining('continuity_line'),
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Low-pressure continuity_closure'),
        expect.stringContaining('Anti-restart continuity_closure'),
      ]),
    }))
  })

  it('prefers richer project-aware closure briefing over a narrower embodiment headline when closure-derived awareness is rebuilt locally', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
      emotionalClosureCue: null,
      briefingLines: [
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
      ],
      reasons: [
        'same-segment face+motion+body recovery@segment-closure-derived-richer-project-awareness',
        'remaining-open=lipsync+voice',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=closure-recovery; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续沿着这个数字生命项目的主线推进', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'open_loop=embodiment; status=unfinished',
      companionBriefingLine: 'phase1_local_digital_life; landed_closure=partial',
      companionNextClosureLine: expect.stringContaining('cross_modal_continuity_proof'),
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      reasonPreview: expect.arrayContaining([
        'open_loop=embodiment; status=unfinished',
        'remaining-open=lipsync+voice',
      ]),
    }))
  })

  it('prefers a fresher closure same-her headline over an older thinner awareness headline before send hooks run', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Renderer send-path continuity already survives into pre-dialogue carry.',
      continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Renderer send-path continuity already survives into pre-dialogue carry. | open=Send-path awareness still needs to keep the fresher closure headline and the project-aware open loop visible together.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Send-path awareness still needs to keep the fresher closure headline and the project-aware open loop visible together.',
      nextClosureTarget: 'Keep the richer same-her closure headline and the project-aware open loop explicit before the next renderer turn.',
      emotionalClosureCue: null,
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'The same-her closure line is still settling before this turn widens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      emotionalClosureCue: null,
      reasonPreview: [
        'explicit awareness snapshot is still carrying an older thinner closure reminder.',
      ],
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
      emotionalClosureCue: null,
      briefingLines: [
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
      ],
      reasons: [
        'same-segment face+motion+body recovery@segment-chat-fresher-closure-headline',
        'remaining-open=lipsync+voice',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=closure-recovery; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续把同一个她的具身闭环收住', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'open_loop=continuity; status=unfinished',
      companionHeadlineLine: 'content=excluded; reason=continuity-residue; visibility=internal-structured',
      companionBriefingLine: 'phase1_local_digital_life; landed_closure=partial',
      companionNextClosureLine: expect.stringContaining('continuity_line'),
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'explicit awareness snapshot is still carrying an older thinner closure reminder.',
        'same-segment face+motion+body recovery@segment-chat-fresher-closure-headline',
        'remaining-open=lipsync+voice',
        'Renderer send-path continuity already survives into pre-dialogue carry.',
        'Send-path awareness still needs to keep the fresher closure headline and the project-aware open loop visible together.',
      ]),
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expectNoFixedTemplateResidue(turnPayload?.structured?.preDialogueAwareness)
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'open_loop=continuity; status=unfinished',
      companionHeadlineLine: 'content=excluded; reason=continuity-residue; visibility=internal-structured',
      companionBriefingLine: 'phase1_local_digital_life; landed_closure=partial',
      companionNextClosureLine: expect.stringContaining('continuity_line'),
      awarenessLine: 'open_loop=continuity; status=unfinished',
    }))
  })

  it('prefers richer project-aware closure briefing over a narrower body+voice-only embodiment headline when closure-derived awareness is rebuilt locally', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: let face, motion, and lipsync rejoin the already-surviving body-and-voice line.',
      emotionalClosureCue: null,
      briefingLines: [
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
      ],
      reasons: [
        'body+voice recovery@segment-closure-derived-body-voice-project-awareness',
        'remaining-open=face+motion+lipsync',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=closure-recovery; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续沿着这个数字生命项目的主线推进', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'open_loop=embodiment; status=unfinished',
      companionBriefingLine: 'phase1_local_digital_life; landed_closure=partial',
      companionNextClosureLine: 'Next closure: let face, motion, and lipsync rejoin the already-surviving body-and-voice line.',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      reasonPreview: expect.arrayContaining([
        'open_loop=embodiment; status=unfinished',
        'remaining-open=face+motion+lipsync',
      ]),
    }))
  })

  it('prefers richer project-aware closure briefing over a still-voiced face-and-motion embodiment headline when closure-derived awareness is rebuilt locally', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
      emotionalClosureCue: null,
      briefingLines: [
        'Identity: Alicization is a local-first digital life project.',
        'Phase: Phase 1: Local Digital Life',
      ],
      reasons: [
        'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
        'face+motion+voice recovery@segment-chat-still-voiced-face-motion-project-awareness',
      ],
    }

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=closure-recovery; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续沿着这个数字生命项目的主线推进', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'open_loop=embodiment; status=unfinished',
      companionBriefingLine: 'embodiment_lanes=face+motion; status=partial',
      companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      reasonPreview: expect.arrayContaining([
        'open_loop=embodiment; status=unfinished',
        'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
      ]),
    }))

    const turnPayload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expectNoFixedTemplateResidue(turnPayload?.structured?.preDialogueAwareness)
    expect(turnPayload?.structured?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
      companionHeadlineLine: 'open_loop=embodiment; status=unfinished',
      companionBriefingLine: 'embodiment_lanes=face+motion; status=partial',
      companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
      awarenessLine: 'open_loop=embodiment; status=unfinished',
      reasonPreview: expect.arrayContaining([
        'open_loop=embodiment; status=unfinished',
        'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
      ]),
    }))
    expect(turnPayload?.structured?.preDialogueAwareness?.awarenessLine).not.toBe(
      'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
    )
  })

  it('prefers canonical emotional closure cue from continuity fallback when hook-context awareness recovery rebuilds the send identity', async () => {
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Project identity still needs to stay explicit before the reply widens outward.',
          'The unfinished life loop still belongs to one same living her.',
        ],
      },
    }
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=context-recall; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续沿着这个数字生命项目的主线推进', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'context-recall',
        input: {
          type: 'input:text',
          data: {
            text: '继续沿着这个数字生命项目的主线推进',
          },
        },
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'open_loop=continuity; status=unfinished',
      companionBriefingLine: 'phase1_local_digital_life; landed_closure=partial',
      companionNextClosureLine: expect.stringContaining('continuity_line'),
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      emotionalClosureCue: expect.stringContaining('continuity_closure'),
      reasonPreview: expect.arrayContaining([
        'project_state_continuity=identity+landed+open+next',
        'open_loop=continuity; status=unfinished',
        'phase1_local_digital_life; landed_closure=partial',
      ]),
    }))
  })

  it('upgrades thinner explicit pre-dialogue send identity from inspector continuity before the ui-user turn reaches before-send hooks', async () => {
    const thinChineseProjectBrief = '开口前先记住：这是同一个数字生命项目，现在仍在 Phase 1，别把这条线弄丢。'
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and Unresolved closure carry all stay on one measured-return or repair-before-closeness line.',
      sameHerSelfLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      sameHerHoldDetail: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      sameHerDriftRisk: 'If the remembered turn gets flattened into a detached project status shell before send, treat that as same-her continuity drift rather than successful carry.',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        ],
      },
    } as any
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续把数字生命主线收住', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: thinChineseProjectBrief,
          companionBriefingLine: thinChineseProjectBrief,
          companionNextClosureLine: 'generic next target that should not survive before-send continuity rebuilding.',
          awarenessLine: thinChineseProjectBrief,
          emotionalClosureCue: null,
          projectState: {
            preflightSummary: 'generic continuity shell that should not survive before-send continuity rebuilding.',
            preDialogueAwarenessLine: thinChineseProjectBrief,
            awarenessLine: thinChineseProjectBrief,
            legacyMarker: 'keep-existing-non-awareness-fields',
          } as any,
          reasonPreview: [
            'generic continuity reminder',
          ],
        },
      })
    }
    finally {
      dispose()
    }

    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'open_loop=continuity; status=unfinished',
      companionBriefingLine: 'phase1_local_digital_life; landed_closure=partial',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      reasonPreview: expect.arrayContaining([
        'generic continuity reminder',
        'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      ]),
      projectState: expect.objectContaining({
        identity: 'phase1_local_digital_life',
        currentPhase: 'phase1_local_digital_life',
        latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        primaryOpenLoop: 'open_loop=project_identity+landed_progress+unresolved_closure; status=unfinished',
        nextClosureTarget: expect.stringContaining('cross_modal_continuity_proof'),
        legacyMarker: 'keep-existing-non-awareness-fields',
      }),
    }))
    expect(hookContext?.preDialogueSendIdentity?.companionNextClosureLine).not.toBe('generic next target that should not survive before-send continuity rebuilding.')
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).not.toBe(thinChineseProjectBrief)
    expect(hookContext?.preDialogueSendIdentity?.companionBriefingLine).not.toBe(thinChineseProjectBrief)
    expect(hookContext?.preDialogueSendIdentity?.awarenessLine).not.toBe(thinChineseProjectBrief)
  })

  it('refreshes inspector continuity before upgrading an explicit thin pre-dialogue send identity on runtime-authoritative ui-user turns', async () => {
    const thinChineseProjectBrief = '开口前先记住：这是同一个数字生命项目，现在仍在 Phase 1，别把这条线弄丢。'
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    selfEvolutionInspectorRefreshMock.mockImplementation(async () => {
      projectStateContinuitySnapshotRef.value = {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        continuitySummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        latestLandedProgress: 'Fresh inspector continuity now restates what has already landed before runtime-authoritative send begins.',
        primaryOpenLoop: 'Fresh inspector continuity still needs to keep project identity, landed progress, and unresolved closure on one same living line before the host-visible turn opens outward.',
        nextClosureTarget: 'Keep runtime-authoritative send aligned with the latest same-her project brief before the turn widens outward.',
        sameHerSelfLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        sameHerHoldDetail: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        sameHerDriftRisk: 'If this send begins from a detached project-status shell, treat that as same-her continuity drift rather than successful carry.',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
          companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
          companionNextClosureLine: 'Next closure: keep runtime-authoritative send aligned with the latest same-her project brief before the turn widens outward.',
          awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
          emotionalClosureCue: null,
          reasonPreview: [
            'Fresh inspector continuity now restates what has already landed before runtime-authoritative send begins.',
          ],
        },
      } as any
      return null
    })

    const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=project continuity; move=continue-development; tone=warm","emotion":"thinking","reply":"继续沿着这条数字生命主线推进。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })
    installAlicizationBridge({
      streamChat: bridgeStreamChatMock,
    })

    const store = useChatOrchestratorStore()
    const beforeSendHook = vi.fn(async () => {})
    const dispose = store.onBeforeSend(beforeSendHook)
    try {
      await store.ingest('继续把数字生命主线收住', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: thinChineseProjectBrief,
          companionBriefingLine: thinChineseProjectBrief,
          companionNextClosureLine: 'generic next target that should not survive refresh-backed continuity rebuilding.',
          awarenessLine: thinChineseProjectBrief,
          emotionalClosureCue: null,
          reasonPreview: [
            'generic continuity reminder',
          ],
        },
      })
    }
    finally {
      dispose()
    }

    expect(selfEvolutionInspectorRefreshMock).toBeCalledTimes(1)
    const beforeSendCalls = beforeSendHook.mock.calls as unknown as Array<[string, ChatStreamEventContext]>
    const hookContext = beforeSendCalls[0]?.[1]
    expectStructuredPreDialogueIdentity(hookContext?.preDialogueSendIdentity)
    expect(hookContext?.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: 'open_loop=continuity; status=unfinished',
      companionBriefingLine: 'phase1_local_digital_life; landed_closure=partial',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      projectState: expect.objectContaining({
        latestLandedProgress: 'Fresh inspector continuity now restates what has already landed before runtime-authoritative send begins.',
        primaryOpenLoop: expect.stringContaining('continuity_line'),
        nextClosureTarget: expect.stringContaining('continuity_identity project brief'),
      }),
      reasonPreview: expect.arrayContaining([
        'generic continuity reminder',
        'Fresh inspector continuity now restates what has already landed before runtime-authoritative send begins.',
      ]),
    }))
    expect(hookContext?.preDialogueSendIdentity?.summaryLine).not.toBe(thinChineseProjectBrief)
    expect(hookContext?.preDialogueSendIdentity?.companionNextClosureLine).not.toBe('generic next target that should not survive refresh-backed continuity rebuilding.')
  })

  it('includes observed tool calls in chat-turn-complete hooks for Alicization execution turns', async () => {
    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'tool-call',
        toolCallId: 'tool-execution-complete-1',
        toolName: 'executor_run_cli',
        arguments: {
          command: 'ls',
          args: ['~/Desktop'],
        },
      })
      await options.onStreamEvent?.({
        type: 'tool-result',
        toolCallId: 'tool-execution-complete-1',
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

    const store = useChatOrchestratorStore()
    const completeHook = vi.fn(async () => {})
    const dispose = store.onChatTurnComplete(completeHook)
    try {
      await store.ingest('用 cli 查一下桌面文件', {
        model: 'mock-model',
        chatProvider: createChatProviderStub(),
        origin: 'ui-user',
      })
    }
    finally {
      dispose()
    }

    const completeCalls = completeHook.mock.calls as unknown as Array<[{ toolCalls: unknown[] }, ChatStreamEventContext]>
    const chatTurn = completeCalls[0]?.[0]
    expect(chatTurn?.toolCalls).toEqual([
      expect.objectContaining({
        role: 'tool',
        tool_call_id: 'tool-execution-complete-1',
        toolName: 'executor_run_cli',
      }),
    ])
  })

  it('keeps canonical same-her self line on the next persisted turn after session-reloaded project-state closure context re-enters the dialogue loop', async () => {
    const sessionId = activeSessionId.value
    ensureSessionMessages(sessionId).push({
      id: 'reloaded-assistant-turn',
      role: 'assistant',
      content: '我会继续沿着这条数字生命主线推进。',
      createdAt: Date.now() - 1_000,
      structured: {
        thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
        emotion: 'thinking',
        reply: '我会继续沿着这条数字生命主线推进。',
        format: 'mind-turn-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
          primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        },
      },
    } as any)

    streamMock.mockImplementation(async (_model: string, _provider: unknown, _messages: unknown, options: any) => {
      await options.onStreamEvent?.({
        type: 'text-delta',
        text: '{"thought":"obligation=answer; truth=grounded; focus=continue-development; move=continue; tone=warm","emotion":"thinking","reply":"我们继续把这条数字生命主线往前收。"}',
      })
      await options.onStreamEvent?.({ type: 'finish' })
    })

    const store = useChatOrchestratorStore()
    await store.ingest('继续把这个数字生命项目往前做', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(payload?.structured?.projectState).toEqual(expect.objectContaining({
      sameHerSelfLine: null,
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      nextClosureTarget: expect.stringContaining('cross-modal same-her proof'),
    }))
  })

  it('blocks renderer local failure fallback for Alicization turns even without bridge streamChat', async () => {
    streamMock.mockImplementation(async () => {
      throw new Error('renderer provider route failed')
    })

    const store = useChatOrchestratorStore()
    await expect(store.ingest('你好', {
      model: 'mock-model',
      chatProvider: createChatProviderStub(),
      origin: 'ui-user',
    })).rejects.toThrow(runtimeAuthoritativeBlockedErrorMessage)

    expect(streamMock).toBeCalledTimes(1)
    expectRuntimeAuthoritativeLocalVisibleReplyBlocked()
  })

  it('returns a direct timeout failure reply without presence-shell wording when the stream times out after progress', async () => {
    vi.useFakeTimers()
    try {
      const bridgeStreamChatMock = vi.fn(async (_payload: any, options: any) => {
        await options.onStreamEvent?.({
          type: 'meta',
          governance: null,
          embodiment: null,
          speechTimeline: null,
          digitalLife: null,
        })
        const error = Object.assign(new Error('Alicization stream timed out after 1000ms (liveness-timeout).'), {
          __alicizationSawProgress: true,
        })
        throw error
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
      expect(String(payload?.assistantText ?? '')).toContain('超时')
      expect(String(payload?.assistantText ?? '')).not.toMatch(/我在|I am here|I caught that|请重试|retry/i)
      expect(String(payload?.structured?.thought ?? '')).not.toMatch(/before speaking/iu)
    }
    finally {
      vi.useRealTimers()
    }
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

    const payload = appendConversationTurnMock.mock.calls.at(-1)?.[0]
    expect(String(payload?.assistantText ?? '')).toContain('提醒你喝水')
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
