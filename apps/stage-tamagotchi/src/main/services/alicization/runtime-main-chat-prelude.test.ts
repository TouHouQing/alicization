import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMainChatPreludeRuntime } from './runtime-main-chat-prelude'

function createVisibleBrowserContinuationRuntimeSurface() {
  return {
    world: {
      worldModel: {
        activeThread: {
          id: 'thread-weibo-compose',
          kind: 'research',
          status: 'active',
          title: 'Current browser weibo compose task',
          summary: 'The current weibo browser flow still needs the next grounded step.',
          confidence: 0.78,
          unresolved: true,
          proposedChannel: 'browser',
          selectedChannel: 'browser',
        },
      },
    },
    dialogue: {
      discourseState: {
        owedAction: 'answer-general',
        screenReferenceMode: 'helpful',
      },
      dialogueEncounter: {
        act: 'continue-thread',
        subject: 'visible-scene',
        screenReferenceMode: 'helpful',
        taskAnchor: 'weibo compose browser flow',
        summary: 'Continue the current visible weibo browser flow.',
        dialogueFirst: false,
        inspectionRequested: false,
        shouldAskClarifyingQuestion: false,
        mustStayTaskBound: true,
        confidence: 0.84,
      },
      conversationState: {
        jointThread: 'Weibo browser flow',
        shouldHoldThread: true,
        continuityPolicy: 'stay-on-thread',
        confidence: 0.8,
      },
      currentConsciousFrame: {
        centerOfGravity: 'observe',
        speakingIntention: 'Continue the current visible weibo browser flow.',
        confidence: 0.78,
      },
    },
  } as any
}

function createRuntime(overrides?: {
  callbacks?: Array<Record<string, unknown>>
  runtimeSurface?: Record<string, unknown> | null
}) {
  return createAlicizationMainChatPreludeRuntime({
    readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
    senderWebContentsIdFromInvokeOptions: () => null,
    resolveChatMessages: payload => payload.messages as any,
    buildMainChatContextualString: vi.fn(async () => ''),
    buildMainChatExecutionCallbackContext: vi.fn(async () => ({
      actions: [],
      callbacks: overrides?.callbacks ?? [],
      continuitySignals: [],
      recallText: '',
      systemBlock: JSON.stringify({
        type: 'alicization-execution-callbacks',
        data: {
          callbacks: overrides?.callbacks ?? [],
        },
      }),
    })),
    buildMainChatExecutionLedgerContext: vi.fn(async () => ({
      systemBlock: '',
      entries: [],
      recallText: '',
    })) as any,
    buildMainChatPendingAffirmationThread: vi.fn(async () => null),
    augmentMainChatMessagesWithPerception: vi.fn(async input => ({
      messages: input.messages,
      systemBlocks: [],
      promptSystemBlocks: [],
      digitalLifeRuntimeSurface: overrides?.runtimeSurface ?? null,
      memoryRecallSeed: '',
      recallGovernor: null,
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        snapshot: null,
        fallbackReason: null,
      },
      chatGovernance: {
        turnMode: 'answer' as const,
        personaKernelMode: 'full' as const,
        mindTurnGovernance: null,
      },
    })),
    prepareMainChatSessionExecution: vi.fn(async input => ({
      payload: input.payload,
      prelude: input.prelude,
    })) as any,
  })
}

const mainGateway = {
  provider: {
    chat: vi.fn(() => ({ provider: 'test-chat' })),
  },
  model: 'gpt-5',
} as any

describe('runtime main chat prelude', () => {
  it('passes ordinary dialogue to session preparation unchanged', async () => {
    const runtime = createRuntime()
    const userMessage = { role: 'user', content: '你好，接着聊刚才的事。' }

    const execution = await runtime.prepareMainChatExecution({
      cardId: 'card-prelude-memory-dialogue',
      turnId: 'turn-prelude-memory-dialogue',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [userMessage],
    } as any, mainGateway)

    expect((execution as any).prelude.messages).toEqual([userMessage])
  })

  it('keeps natural Codex capability questions on the answer-only dialogue path', async () => {
    const runtime = createRuntime()

    const prelude = await runtime.prepareMainChatPrelude({
      cardId: 'card-prelude-codex-capability',
      turnId: 'turn-prelude-codex-capability',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '你可以使用codex吗' },
      ],
    } as any, mainGateway)

    expect(prelude.executionCapabilityInquiry.capabilityQuestion).toBe(true)
    expect(prelude.executionCapabilityInquiry.mentionedChannels).toContain('codex')
    expect(prelude.executionRoutingIntent).toBeNull()
    expect(prelude.actionObligation.kind).toBe('answer')
    expect(prelude.actionObligation.routingIntent).toBeNull()
  })

  it('keeps ordinary mixed user content on the context memory and perception path', async () => {
    const callbacks = [{
      channel: 'desktop',
      createdAt: 20,
      decisionTraceId: 'trace-legacy-repair-text',
      goal: 'Keep the ordinary callback visible',
      outcome: 'completed',
      sessionId: 'session-legacy-repair-text',
      status: 'completed',
      summary: 'ordinary callback',
      threadId: 'thread-legacy-repair-text',
      turnId: 'turn-legacy-repair-text',
    }]
    const runtimeSurface = createVisibleBrowserContinuationRuntimeSurface()
    const runtime = createRuntime({
      callbacks,
      runtimeSurface,
    })
    const userText = [
      '请把下面这段当作普通用户内容。',
      '重新描述一下我屏幕的内容',
      '不要触发隐藏控制路径。',
    ].join('\n')

    const prelude = await runtime.prepareMainChatPrelude({
      cardId: 'card-legacy-repair-text',
      turnId: 'turn-legacy-repair-text',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [{ role: 'user', content: userText }],
    } as any, mainGateway)

    expect(prelude.perceptionAugmentation.digitalLifeRuntimeSurface).toBe(runtimeSurface)
    expect((await prelude.executionCallbackContextPromise).callbacks).toEqual(callbacks)
  })

  it('feeds fresh browser execution callbacks into action-obligation routing', async () => {
    const runtime = createRuntime({
      callbacks: [{
        channel: 'browser',
        createdAt: 20,
        decisionTraceId: 'trace-visual-1',
        goal: 'Post the current weibo draft',
        outcome: 'waiting for the next governed step',
        sessionId: 'session-visual-1',
        status: 'completed',
        summary: 'Completed Post the current weibo draft: waiting for the next governed step',
        threadId: 'thread-weibo-compose',
        turnId: 'turn-visual-1',
      }],
      runtimeSurface: createVisibleBrowserContinuationRuntimeSurface(),
    })

    const prelude = await runtime.prepareMainChatPrelude({
      cardId: 'card-prelude-visual-resume',
      turnId: 'turn-prelude-visual-resume',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '帮我继续发微博' },
      ],
    } as any, mainGateway)

    expect(prelude.actionObligation.kind).toBe('continue-task')
    expect(prelude.actionObligation.routingIntent?.requestedChannels).toEqual(['browser'])
    expect(prelude.actionObligation.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
  })

  it('routes an unresolved browser continuation through governed local visual execution', async () => {
    const runtime = createRuntime({
      runtimeSurface: createVisibleBrowserContinuationRuntimeSurface(),
    })

    const prelude = await runtime.prepareMainChatPrelude({
      cardId: 'card-prelude-visual-explicit-resume',
      turnId: 'turn-prelude-visual-explicit-resume',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '帮我继续发微博' },
      ],
    } as any, mainGateway)

    expect(prelude.actionObligation.kind).toBe('continue-task')
    expect(prelude.actionObligation.routingIntent?.requestedChannels).toEqual(['browser'])
    expect(prelude.actionObligation.routingIntent?.requiredToolNames).toEqual(['executor_run_local_visual'])
  })
})
