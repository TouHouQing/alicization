import { describe, expect, it } from 'vitest'

import { buildAlicizationMainChatMemoryContext } from './main-chat-memory-context'
import { createAlicizationRuntimeMainChatRuntime } from './runtime-main-chat-runtime'

function createTestMemoryContext() {
  return buildAlicizationMainChatMemoryContext({
    workingMemory: {
      version: 'working-memory-owner-context-v1',
      owner: 'working-memory',
      scope: {
        cardId: 'default',
        sessionId: 'session-1',
        updatedAt: 0,
        turnRange: {
          fromTurnId: null,
          toTurnId: null,
        },
      },
      current: {
        threadTitle: null,
        threadMode: null,
        shouldHoldThread: false,
        currentUserMove: null,
        activeTask: null,
        taskStatus: null,
      },
      obligations: [],
      compressedTimeline: [],
      queryHints: [],
      audit: {
        failureTurnIds: [],
        excludedLongTermCandidateTurnIds: [],
        notes: [],
      },
      longTermQueue: [],
    },
    longTermRecall: null,
  })
}

describe('runtime main chat runtime', () => {
  it('binds inspection history resolver and reuses context builders when creating the prelude runtime', async () => {
    const runtime = createAlicizationRuntimeMainChatRuntime({
      context: {
        getActiveCardId: () => 'default',
        normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
        readTransportContentAsText: content => typeof content === 'string' ? content : '',
        emptyAlicizationExecutionCallbackContext: {
          actions: [],
          callbacks: [],
          continuitySignals: [],
          recallText: '',
          systemBlock: '',
        },
        emptyAlicizationExecutionLedgerContext: {
          systemBlock: '',
          entries: [],
          recallText: '',
        } as any,
        ensureActiveOrLatestSessionId: async () => 'session-1',
        buildPendingExecutionCallbackContext: async () => ({
          actions: [],
          callbacks: [],
          continuitySignals: [],
          recallText: '',
          systemBlock: '',
        }),
        buildExecutionLedgerContext: async () => ({
          systemBlock: '',
          entries: [],
          recallText: '',
        } as any),
        listTaskThreadsBySession: async () => [],
        resolveRecentContextualTurns: async () => [
          {
            userText: 'old user',
            assistantText: 'old assistant',
          },
        ],
        shouldExtendContextualRecall: () => false,
        detectInvitedInspectionIntent: () => ({ active: false }),
      },
      inspection: {
        normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
        readLatestAssistantMessageText: () => '',
        readTransportContentAsText: content => typeof content === 'string' ? content : '',
      },
    })

    runtime.bindInspectionIntentFromMessageHistory(() => true)
    const contextual = await runtime.buildMainChatContextualString({
      cardId: 'default',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'assistant', content: 'old assistant' },
        { role: 'user', content: '看一下这个屏幕' },
      ],
    } as any)
    expect(contextual).toBe('U: 看一下这个屏幕')

    const preludeRuntime = runtime.createPreludeRuntime({
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      augmentMainChatMessagesWithPerception: async input => ({
        messages: input.messages,
        systemBlocks: [],
        promptSystemBlocks: [],
        digitalLifeRuntimeSurface: null,
        memoryRecallSeed: '',
        recallGovernor: null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          turnMode: 'answer',
          personaKernelMode: 'full',
          mindTurnContract: null,
          mindTurnGovernance: null,
        },
      }),
      prepareMainChatSessionExecution: async input => ({
        waitForTools: false,
        tools: undefined,
        toolChoice: undefined,
        customDirectivesResolution: {
          source: 'none',
          text: '',
        },
        hasVisualGrounding: false,
        governance: null,
        conversationSessionId: 'session-1',
        getSessionTrace: () => ({ phaseOrder: [] }) as any,
        memoryContext: createTestMemoryContext(),
        memoryFailures: [],
        organicMemoryContext: undefined,
        mindTurnContract: null,
        personaKernel: null,
        performanceManifest: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {} as any,
        sessionMirror: null,
        sessionTrace: {} as any,
        turnGraph: {} as any,
        ...input.prelude,
      }),
    })

    expect(typeof preludeRuntime.prepareMainChatPrelude).toBe('function')
    expect(typeof runtime.resolveInspectionIntentForChatTurn).toBe('function')
  })
})
