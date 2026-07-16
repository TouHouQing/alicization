import { describe, expect, it, vi } from 'vitest'

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
        isInternalAlicizationRepairPrompt: () => false,
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
          suppressAssociativeRecall: false,
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

  it('passes perception-carried digitalLifeSpine and canonical project-state blocks through the prelude entrypoint before session execution preparation', async () => {
    const prepareMainChatSessionExecution = vi.fn(async input => ({
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
    }))

    const runtime = createAlicizationRuntimeMainChatRuntime({
      context: {
        getActiveCardId: () => 'default',
        normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
        readTransportContentAsText: content => typeof content === 'string' ? content : '',
        isInternalAlicizationRepairPrompt: () => false,
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
        resolveRecentContextualTurns: async () => [],
        shouldExtendContextualRecall: () => false,
        detectInvitedInspectionIntent: () => ({ active: false }),
      },
      inspection: {
        normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
        readLatestAssistantMessageText: () => '',
        readTransportContentAsText: content => typeof content === 'string' ? content : '',
      },
    })

    const expectedDigitalLifeSpine = {
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        world: {
          worldModel: null,
        },
        dialogue: {
          conversationState: null,
          currentConsciousFrame: {
            projectState: {
              preDialogueAwarenessLine: 'pre_turn_context_digest',
            },
          },
        },
      },
    }
    const projectStateSystemBlock = '[ALICIZATION_PROJECT_STATE]\nproject_preflight=Alicization is a local-first digital life project.'
    const projectStateClosureDashboard = '[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]\nphase=Phase 1: Local Digital Life'

    const preludeRuntime = runtime.createPreludeRuntime({
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      augmentMainChatMessagesWithPerception: async input => ({
        messages: input.messages,
        systemBlocks: [
          projectStateSystemBlock,
          projectStateClosureDashboard,
        ],
        promptSystemBlocks: [],
        digitalLifeSpine: expectedDigitalLifeSpine,
        digitalLifeRuntimeSurface: expectedDigitalLifeSpine.runtimeSurface,
        memoryRecallSeed: 'project-state continuity',
        recallGovernor: null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer',
          personaKernelMode: 'full',
          mindTurnContract: null,
          mindTurnGovernance: null,
        },
      }),
      prepareMainChatSessionExecution,
    })

    await preludeRuntime.prepareMainChatExecution({
      cardId: 'default',
      turnId: 'turn-project-state-prelude-spine',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但先记住我们这个数字生命项目现在做到哪、还差什么闭环。' },
      ],
    } as any, {
      provider: {
        chat: () => ({ id: 'chat-config' }),
      },
      model: 'gpt-test',
    } as any)

    const call = prepareMainChatSessionExecution.mock.calls.at(-1)?.[0]
    expect(call?.prelude?.perceptionAugmentation?.digitalLifeSpine).toBe(expectedDigitalLifeSpine)
    expect(call?.prelude?.perceptionAugmentation?.digitalLifeRuntimeSurface).toBe(expectedDigitalLifeSpine.runtimeSurface)
    expect(call?.prelude?.perceptionAugmentation?.systemBlocks).toEqual(expect.arrayContaining([
      projectStateSystemBlock,
      projectStateClosureDashboard,
    ]))
  })
})
