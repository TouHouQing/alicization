import type { Message } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
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
  it('hydrates the WorkingMemory checkpoint before perception and carries the owner snapshot forward', async () => {
    const events: string[] = []
    const checkpoint = createEmptyWorkingMemorySnapshot({
      cardId: 'card-prelude-checkpoint-order',
      sessionId: 'session-prelude-checkpoint-order',
      now: 100,
    })
    checkpoint.currentThread = {
      title: 'WorkingMemory owns the current thread',
      currentUserMove: 'Continue from the checkpoint.',
      currentAliceMove: 'Keep the owner boundary explicit.',
      primaryAnchor: 'checkpoint-owner-boundary',
      mode: 'task',
      shouldHold: true,
      confidence: 0.9,
    }
    const augmentMainChatMessagesWithPerception = vi.fn(async (input) => {
      events.push('perception')
      return {
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
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      }
    })
    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      buildMainChatContextualString: vi.fn(async () => ''),
      buildMainChatExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      })),
      buildMainChatExecutionLedgerContext: vi.fn(async () => ({
        systemBlock: '',
        entries: [],
        recallText: '',
      })) as any,
      hydrateWorkingMemory: vi.fn(async () => {
        events.push('checkpoint')
        return {
          version: 'working-memory-hydration-v1' as const,
          cardId: 'card-prelude-checkpoint-order',
          turnId: 'turn-prelude-checkpoint-order',
          sessionId: 'session-prelude-checkpoint-order',
          snapshot: checkpoint,
          recentTurns: [],
          failures: [],
        }
      }),
      augmentMainChatMessagesWithPerception,
      prepareMainChatSessionExecution: vi.fn(),
    })

    const prelude = await runtime.prepareMainChatPrelude({
      cardId: 'card-prelude-checkpoint-order',
      turnId: 'turn-prelude-checkpoint-order',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [{ role: 'user', content: '继续当前线程。' }],
    } as any, mainGateway, undefined, {
      agentTurn: {
        conversationSessionId: 'session-prelude-checkpoint-order',
      } as any,
    })

    expect(events).toEqual(['checkpoint', 'perception'])
    expect(prelude.workingMemoryHydration).toMatchObject({
      sessionId: 'session-prelude-checkpoint-order',
      snapshot: checkpoint,
    })
    expect(augmentMainChatMessagesWithPerception).toHaveBeenCalledWith(
      expect.objectContaining({
        workingMemorySnapshot: checkpoint,
      }),
    )
  })

  it('keeps full transport history for session preparation but scopes perception to the current turn', async () => {
    const systemMessage = { role: 'system', content: 'system context' } as const
    const oldUserMessage = { role: 'user', content: '旧 transport 用户轮次' } as const
    const oldAssistantMessage = { role: 'assistant', content: '旧 transport 助手轮次' } as const
    const currentUserMessage = { role: 'user', content: '当前用户轮次' } as const
    const perceptionMessages = vi.fn()
    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      buildMainChatContextualString: vi.fn(async () => 'U: 当前用户轮次'),
      buildMainChatExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      })),
      buildMainChatExecutionLedgerContext: vi.fn(async () => ({
        systemBlock: '',
        entries: [],
        recallText: '',
      })) as any,
      augmentMainChatMessagesWithPerception: vi.fn(async (input: { messages: Message[] }) => {
        perceptionMessages(input.messages)
        return {
          messages: input.messages.map(message =>
            message === currentUserMessage
              ? { ...message, content: '当前用户轮次（perception 改写）' }
              : message,
          ),
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
            turnMode: 'answer' as const,
            personaKernelMode: 'full' as const,
            mindTurnGovernance: null,
          },
        }
      }),
      prepareMainChatSessionExecution: vi.fn(),
    })

    const prelude = await runtime.prepareMainChatPrelude({
      cardId: 'card-prelude-owner-boundary',
      turnId: 'turn-prelude-owner-boundary',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        systemMessage,
        oldUserMessage,
        oldAssistantMessage,
        currentUserMessage,
      ],
    } as any, mainGateway)

    expect(perceptionMessages).toHaveBeenCalledWith([
      systemMessage,
      currentUserMessage,
    ])
    expect(prelude.messages).toEqual([
      systemMessage,
      oldUserMessage,
      oldAssistantMessage,
      { ...currentUserMessage, content: '当前用户轮次（perception 改写）' },
    ])
  })

  it('passes the current turn id into perception augmentation', async () => {
    const augmentMainChatMessagesWithPerception = vi.fn(async input => ({
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
        turnMode: 'answer' as const,
        personaKernelMode: 'full' as const,
        mindTurnGovernance: null,
      },
    }))
    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      buildMainChatContextualString: vi.fn(async () => ''),
      buildMainChatExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      })),
      buildMainChatExecutionLedgerContext: vi.fn(async () => ({
        systemBlock: '',
        entries: [],
        recallText: '',
      })) as any,
      augmentMainChatMessagesWithPerception,
      prepareMainChatSessionExecution: vi.fn(),
    })

    await runtime.prepareMainChatPrelude({
      cardId: 'card-turn-bound-perception',
      turnId: 'turn-bound-perception',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [{ role: 'user', content: '用 Codex 总结一下当前项目' }],
    } as any, mainGateway)

    expect(augmentMainChatMessagesWithPerception).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-turn-bound-perception',
      turnId: 'turn-bound-perception',
    }))
  })

  it('stops waiting for perception preparation when the chat turn is aborted', async () => {
    const controller = new AbortController()
    const augmentMainChatMessagesWithPerception = vi.fn(async () => await new Promise(() => {}))
    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      buildMainChatContextualString: vi.fn(async () => ''),
      buildMainChatExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      })),
      buildMainChatExecutionLedgerContext: vi.fn(async () => ({
        systemBlock: '',
        entries: [],
        recallText: '',
      })) as any,
      augmentMainChatMessagesWithPerception,
      prepareMainChatSessionExecution: vi.fn(),
    })

    const preludePromise = runtime.prepareMainChatPrelude({
      cardId: 'card-prelude-abort',
      turnId: 'turn-prelude-abort',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [{ role: 'user', content: '看看当前屏幕' }],
    } as any, mainGateway, undefined, {
      abortSignal: controller.signal,
    })
    await vi.waitFor(() => {
      expect(augmentMainChatMessagesWithPerception).toHaveBeenCalledOnce()
    })

    controller.abort(new DOMException('user cancelled', 'AbortError'))

    await expect(Promise.race([
      preludePromise,
      new Promise(resolve => setTimeout(() => resolve('still-pending'), 50)),
    ])).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

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

    expect(prelude.actionObligation.kind).toBe('answer')
    expect(prelude.messages).toEqual([
      { role: 'user', content: '你可以使用codex吗' },
    ])
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

  it('keeps fresh browser execution callbacks as structured context for the model', async () => {
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

    expect(prelude.actionObligation.kind).toBe('answer')
    expect(prelude.actionObligation).not.toHaveProperty('routingIntent')
    expect((await prelude.executionCallbackContextPromise).callbacks).toHaveLength(1)
  })

  it('keeps an unresolved browser continuation on the model-owned mainline', async () => {
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

    expect(prelude.actionObligation.kind).toBe('answer')
    expect(prelude.actionObligation).not.toHaveProperty('routingIntent')
  })
})
