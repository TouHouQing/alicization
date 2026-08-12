import type { Message } from '@xsai/shared-chat'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { abortAlicizationDirectChatRun } from './main-chat-abort'
import {
  mainChatBackgroundRunTestInternals,
  runAlicizationMainChatBackground,
} from './main-chat-background-run'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatProviderStep } from './main-chat-stream-runner'

vi.mock('./main-chat-run-lifecycle', () => ({
  handleAlicizationMainChatRunFailure: vi.fn(),
}))

vi.mock('./main-chat-runtime-surface', () => ({
  extractCustomDirectivesFromMessages: vi.fn(() => ''),
  extractHostNameFromMessages: vi.fn(() => ''),
}))

vi.mock('./main-chat-stream-runner', () => ({
  runAlicizationMainChatProviderStep: vi.fn(),
}))

vi.mock('./main-chat-stream-meta', async () => {
  const actual = await vi.importActual<typeof import('./main-chat-stream-meta')>('./main-chat-stream-meta')
  return {
    ...actual,
    createAlicizationChatStreamMetaEmitter: vi.fn(() => ({
      emit: vi.fn(),
      getLastReply: () => '',
      snapshot: () => ({
        lastReply: '',
        lastSignature: null,
      }),
    })),
    repairContinuitySourceTagsFromRuntimeDigest: vi.fn((input: any) => input.digitalLifeSpine ?? null),
  }
})

vi.mock('./runtime-soul', () => ({
  mainChatFirstEventTimeoutMs: 65_000,
  mainChatPreparationTimeoutMs: 45_000,
  mainChatFirstEventTimeoutWithVisualGroundingMs: 90_000,
  mainChatProviderContinuationTimeoutMs: 180_000,
  clamp01: (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)),
  normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
  sanitizeMultilineText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : fallback,
  sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
  supportedDialogueStructuredFormats: ['mind-turn-v1', 'epoch1-v1'],
}))

function buildProviderReply(reply = 'Provider reply') {
  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'current turn',
    emotion: 'thinking',
    reply,
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    memoryUsage: {
      workingMemoryVersion: null,
      longTermEvidenceIds: [],
    },
  })
}

function createPrepared(overrides?: Partial<any>): any {
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      { role: 'user' as const, content: '你好' },
    ] as Message[],
    conversationSessionId: 'conversation-1',
    preludeTurnId: 'turn-1',
    waitForTools: false,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      source: 'none',
      text: '',
    },
    hasVisualGrounding: false,
    governance: null,
    runtimeSurface: {
      trace: {
        decisionTraceId: 'trace-1',
        personaKernelMode: 'full',
        turnMode: 'answer',
      },
      replyExecutionPlan: {
        preferredMode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        reason: 'provider mainline',
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
      },
    },
    getSessionTrace: () => ({
      currentChain: [],
      currentDepth: 0,
      history: [],
      maxDepth: 12,
      phaseOrder: ['prepare', 'stream'],
    }),
    sessionTrace: {
      currentChain: [],
      currentDepth: 0,
      history: [],
      maxDepth: 12,
      phaseOrder: ['prepare', 'stream'],
    },
    ...overrides,
  }
}

function createInMemoryPersistence() {
  const events: any[] = []
  return {
    appendRuntimeEvent: vi.fn(async (_scope, event) => {
      const persisted = {
        ...event,
        sequence: events.length + 1,
      }
      events.push(persisted)
      return persisted
    }),
    saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
  }
}

function createInput(
  userText = '你好',
  overrides?: Partial<Parameters<typeof runAlicizationMainChatBackground>[0]>,
): Parameters<typeof runAlicizationMainChatBackground>[0] {
  return {
    key: 'card-1::turn-1',
    payload: {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: userText },
      ],
    },
    activeCardId: 'default',
    mainGateway: {
      providerId: 'openai',
      model: 'gpt-test',
      baseUrl: 'https://example.test/v1/',
      headers: {
        authorization: 'Bearer test',
      },
      probeHeaders: {
        Authorization: 'Bearer test',
      },
      provider: {} as never,
    },
    runState: {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    },
    prepareTurn: vi.fn(async () => createPrepared({
      messages: [
        { role: 'user' as const, content: userText },
      ],
    })),
    turnLoop: {
      conversationId: 'conversation-1',
      userId: 'local-user-stable',
      persistence: createInMemoryPersistence(),
    },
    headers: {
      authorization: 'Bearer test',
    },
    isRunActive: () => true,
    runStateController: {
      setSessionTraceGetter: vi.fn(),
      finishRun: vi.fn(),
    },
    emitMeta: vi.fn(),
    emitChunk: vi.fn(),
    emitToolCall: vi.fn(),
    emitToolResult: vi.fn(),
    emitError: vi.fn(),
    incrementChunkStats: vi.fn(),
    ensureMainGatewayReachable: vi.fn(async () => ({ reachable: true })),
    recordMainGatewayGenerationTimeout: vi.fn(async () => {}),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    queueScopedAuditLog: vi.fn(),
    ...overrides,
  } as Parameters<typeof runAlicizationMainChatBackground>[0]
}

describe('main chat background run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValue({
      kind: 'reply',
      finishReason: 'stop',
      fullText: 'Provider reply',
      text: 'Provider reply',
    } as any)
    vi.mocked(handleAlicizationMainChatRunFailure).mockResolvedValue(undefined)
  })

  it.each([
    ['greeting', '你好'],
    ['identity', '你是谁'],
    ['time', '现在几点了'],
    ['date', '今天几号'],
    ['dialogue', '今天有点累'],
    ['follow-up', '继续'],
  ])('routes %s turns through the EventLoop Provider step', async (_lane, userText) => {
    const input = createInput(userText)

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledWith(expect.objectContaining({
      payload: input.payload,
      prepared: expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: userText }),
        ]),
      }),
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: userText }),
      ]),
    }))
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        finishReason: 'stop',
        origin: 'provider',
      }),
    )
  })

  it('routes the production turn through one EventLoop persistence owner', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const input = createInput('直接回答我', {
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toEqual(expect.arrayContaining([
      'turn.accepted',
      'context.assembly.completed',
      'model.text.delta',
      'assistant.reply.committed',
      'turn.completed',
    ]))
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-1',
        cardId: 'card-1',
        userId: 'local-user-stable',
        conversationId: 'conversation-1',
      }),
    ]))
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      text: 'Provider reply',
    }))
  })

  it('refuses to run when the EventLoop owner is missing', async () => {
    const input = createInput('直接回答我', {
      turnLoop: undefined as any,
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: expect.stringContaining('EventLoop'),
      }),
    }))
  })

  it('starts preparation only after the EventLoop owns context assembly', async () => {
    const eventTypes: string[] = []
    const prepareTurn = vi.fn(async () => {
      expect(eventTypes).toContain('context.assembly.started')
      return createPrepared()
    })
    const input = createInput('直接回答我', {
      prepareTurn,
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            eventTypes.push(event.eventType)
            return {
              ...event,
              sequence: eventTypes.length,
            }
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(prepareTurn).toHaveBeenCalledOnce()
    expect(eventTypes.indexOf('context.assembly.started')).toBeLessThan(
      eventTypes.indexOf('context.assembly.completed'),
    )
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
  })

  it('registers EventLoop cancellation while the turn is active and removes its own entry after completion', async () => {
    let releaseProvider!: () => void
    const providerPending = new Promise<void>((resolve) => {
      releaseProvider = resolve
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async () => {
      await providerPending
      return {
        kind: 'reply',
        finishReason: 'stop',
        fullText: 'Provider reply',
        text: 'Provider reply',
      }
    })
    const input = createInput()

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })

    releaseProvider()
    await running

    expect(input.runState.cancelTurn).toBeUndefined()
  })

  it('does not clear a newer cancellation owner when the EventLoop turn finishes', async () => {
    let releaseProvider!: () => void
    const providerPending = new Promise<void>((resolve) => {
      releaseProvider = resolve
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async () => {
      await providerPending
      return {
        kind: 'reply',
        finishReason: 'stop',
        fullText: 'Provider reply',
        text: 'Provider reply',
      }
    })
    const input = createInput()
    const newerCancelTurn = vi.fn(async () => true)

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })
    input.runState.cancelTurn = newerCancelTurn

    releaseProvider()
    await running

    expect(input.runState.cancelTurn).toBe(newerCancelTurn)
  })

  it('keeps UI and durable state completed when abort races reply commit persistence', async () => {
    let releaseReplyCommit!: () => void
    let notifyReplyCommitStarted!: () => void
    const replyCommitStarted = new Promise<void>((resolve) => {
      notifyReplyCommitStarted = resolve
    })
    const replyCommitPending = new Promise<void>((resolve) => {
      releaseReplyCommit = resolve
    })
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        if (event.eventType === 'assistant.reply.committed') {
          notifyReplyCommitStarted()
          await replyCommitPending
        }
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const input = createInput('记住这轮', {
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    } as any)

    const running = runAlicizationMainChatBackground(input)
    await replyCommitStarted
    expect(input.emitChunk).toHaveBeenCalledOnce()

    const abortResult = await abortAlicizationDirectChatRun({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
        reason: 'manual',
      },
      getRun: () => input.runState,
      mainChatRunState: {
        createKey: () => input.key,
        hasRecentlyFinished: () => false,
        finishRun: input.runStateController.finishRun,
      },
      createAbortError: reason => new DOMException(reason, 'AbortError'),
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
    })

    expect(abortResult).toEqual({
      accepted: false,
      state: 'finished',
    })
    expect(input.runState.state).toBe('running')
    expect(input.runState.controller.signal.aborted).toBe(false)
    expect(input.runStateController.finishRun).not.toHaveBeenCalled()

    releaseReplyCommit()
    await running

    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'completed',
        origin: 'provider',
      }),
    )
    expect(events.map(event => event.eventType)).toContain('turn.completed')
    expect(events.map(event => event.eventType)).not.toContain('runtime.cancelled')
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('does not route an EventLoop-owned cancellation through the failure lifecycle', async () => {
    const events: any[] = []
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(
      async () => await new Promise<never>(() => {}),
    )
    const input = createInput('停止这轮', {
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            const persisted = {
              ...event,
              sequence: events.length + 1,
            }
            events.push(persisted)
            return persisted
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })
    const abortResult = await abortAlicizationDirectChatRun({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
        reason: 'manual',
      },
      getRun: () => input.runState,
      mainChatRunState: {
        createKey: () => input.key,
        hasRecentlyFinished: () => false,
        finishRun: input.runStateController.finishRun,
      },
      createAbortError: reason => new DOMException(reason, 'AbortError'),
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
    })
    await running

    expect(abortResult).toEqual({
      accepted: true,
      state: 'aborted',
    })
    expect(input.runState.controller.signal.aborted).toBe(false)
    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'aborted',
      finishReason: 'manual',
    })
    expect(events.map(event => event.eventType)).toContain('runtime.cancelled')
    expect(events.map(event => event.eventType)).not.toContain('turn.failed')
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('keeps the accepted EventLoop cancellation authoritative across concurrent abort requests', async () => {
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(
      async () => await new Promise<never>(() => {}),
    )
    const input = createInput('停止这轮')
    const abortInput = {
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
        reason: 'manual',
      },
      getRun: () => input.runState,
      mainChatRunState: {
        createKey: () => input.key,
        hasRecentlyFinished: () => false,
        finishRun: input.runStateController.finishRun,
      },
      createAbortError: (reason: string) => new DOMException(reason, 'AbortError'),
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
    }

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })
    const firstAbort = abortAlicizationDirectChatRun(abortInput)
    const secondAbort = abortAlicizationDirectChatRun(abortInput)
    const [firstResult, secondResult] = await Promise.all([firstAbort, secondAbort])
    await running

    expect([firstResult, secondResult]).toEqual(expect.arrayContaining([
      {
        accepted: true,
        state: 'aborted',
      },
      {
        accepted: false,
        state: 'finished',
      },
    ]))
    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('persists preparation failures as context failures before the Provider starts', async () => {
    const events: any[] = []
    const preparationFailure = new Error('working memory checkpoint failed')
    const input = createInput('继续刚才的任务', {
      prepareTurn: vi.fn(async () => {
        throw preparationFailure
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            const persisted = {
              ...event,
              sequence: events.length + 1,
            }
            events.push(persisted)
            return persisted
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toEqual([
      'turn.accepted',
      'context.assembly.started',
      'turn.failed',
    ])
    expect(events.at(-1)?.payload).toEqual(expect.objectContaining({
      error: 'working memory checkpoint failed',
      surface: 'context',
    }))
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: preparationFailure,
    }))
  })

  it('preserves the original Provider failure across the EventLoop boundary', async () => {
    const providerFailure = new DOMException(
      'Alicization runtime aborted: chat-first-event-timeout',
      'AbortError',
    )
    vi.mocked(runAlicizationMainChatProviderStep).mockRejectedValueOnce(providerFailure)
    const events: any[] = []
    const input = createInput('你好', {
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            const persisted = {
              ...event,
              sequence: events.length + 1,
            }
            events.push(persisted)
            return persisted
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    expect(vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0].error)
      .toBe(providerFailure)
  })

  it('settles presented execution callbacks after an EventLoop Provider reply', async () => {
    const settlePresentedExecutionCallbacks = vi.fn(async () => {})
    const callback = {
      threadId: 'thread-callback-1',
      summary: 'callback result',
    }
    const events: any[] = []
    const input = createInput('刚才的结果呢', {
      prepareTurn: vi.fn(async () => createPrepared({
        messages: [{ role: 'user', content: '刚才的结果呢' }],
        presentedExecutionCallbacks: [callback],
      })),
      settlePresentedExecutionCallbacks,
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            const persisted = {
              ...event,
              sequence: events.length + 1,
            }
            events.push(persisted)
            return persisted
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(settlePresentedExecutionCallbacks).toHaveBeenCalledWith({
      cardId: input.payload.cardId,
      callbacks: [callback],
    })
  })

  it('passes the prepared tool surface to the EventLoop Provider step', async () => {
    const prepared = createPrepared({
      runtimeSurface: {
        ...createPrepared().runtimeSurface,
        action: {
          kind: 'answer',
        },
        tooling: {
          toolsOffered: true,
        },
      },
      tools: [{
        type: 'function',
        function: {
          name: 'executor_run_cli',
          description: 'Run a CLI command.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      }],
    })
    const input = createInput('执行测试命令', {
      prepareTurn: vi.fn(async () => prepared),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledWith(expect.objectContaining({
      prepared: expect.objectContaining({
        tools: prepared.tools,
      }),
      messages: prepared.messages,
    }))
    expect(input.emitToolCall).not.toHaveBeenCalled()
    expect(input.emitToolResult).not.toHaveBeenCalled()
  })

  it('settles through the failure lifecycle when preparation ignores the abort signal', async () => {
    let resolvePreparation!: (value: any) => void
    const preparationPromise = new Promise<any>((resolve) => {
      resolvePreparation = resolve
    })
    const input = createInput('请继续。', {
      prepareTurn: vi.fn(() => preparationPromise),
    })

    const pendingRun = runAlicizationMainChatBackground(input)
    input.runState.controller.abort(
      new DOMException('chat-preparation-timeout', 'AbortError'),
    )

    const outcome = await Promise.race([
      pendingRun.then(() => 'settled'),
      new Promise(resolve => setTimeout(() => resolve('pending'), 100)),
    ])
    expect(outcome).toBe('settled')
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        name: 'AbortError',
        message: 'chat-preparation-timeout',
      }),
    }))
    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()

    resolvePreparation(createPrepared())
    await Promise.resolve()
    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()
  })

  it('emits prepared liveness meta before the Provider step', async () => {
    let preparedMetaEmitted = false
    let providerSawPreparedMeta = false
    const emit = vi.fn((_reply: string, options?: { force?: boolean }) => {
      if (options?.force)
        preparedMetaEmitted = true
    })
    const metaEmitterFactory = vi.mocked(createAlicizationChatStreamMetaEmitter)
    metaEmitterFactory.mockReset()
    metaEmitterFactory.mockImplementation(() => ({
      emit,
      getLastReply: () => '',
      snapshot: () => ({
        lastReply: '',
        lastSignature: null,
      }),
    }))
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async () => {
      providerSawPreparedMeta = preparedMetaEmitted
      return {
        kind: 'reply',
        finishReason: 'stop',
        fullText: 'Provider reply',
        text: 'Provider reply',
      }
    })
    const input = createInput()

    try {
      await runAlicizationMainChatBackground(input)
      expect(preparedMetaEmitted).toBe(true)
      expect(providerSawPreparedMeta).toBe(true)
      expect(emit).toHaveBeenCalledWith('', { force: true })
    }
    finally {
      metaEmitterFactory.mockImplementation(() => ({
        emit: vi.fn(),
        getLastReply: () => '',
        snapshot: () => ({
          lastReply: '',
          lastSignature: null,
        }),
      }))
    }
  })

  it('passes presented execution callbacks to the runtime settlement owner', async () => {
    const callback = {
      createdAt: 1_726_000_000_000,
      sessionId: 'session-inline-callback',
      threadId: 'thread-inline-callback',
      status: 'completed',
      summary: 'command completed',
    }
    const prepared = createPrepared({
      presentedExecutionCallbacks: [callback],
    })
    const input = createInput('刚才的命令结果呢', {
      prepareTurn: vi.fn(async () => prepared),
      settlePresentedExecutionCallbacks: vi.fn(),
    })

    await runAlicizationMainChatBackground(input)

    expect(input.settlePresentedExecutionCallbacks).toHaveBeenCalledOnce()
    expect(input.settlePresentedExecutionCallbacks).toHaveBeenCalledWith({
      cardId: 'card-1',
      callbacks: [callback],
    })
  })

  it('finishes EventLoop Provider reply data after a completed turn', async () => {
    const input = createInput()
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: 'Provider full text',
      text: 'Provider visible reply',
    })

    await runAlicizationMainChatBackground(input)

    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(finishPayload).toEqual(expect.objectContaining({
      status: 'completed',
      origin: 'provider',
      finishReason: 'stop',
      fullText: 'Provider full text',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    }))
    expect(finishPayload?.visibleReplyRealization).toEqual(expect.objectContaining({
      visibleText: 'Provider full text',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
    }))
  })

  it('publishes the Provider step reply and preserves the validated Provider artifact', async () => {
    const rawFullText = `{
  "memoryUsage": {
    "workingMemoryVersion": null,
    "longTermEvidenceIds": []
  },
  "performance": {
    "baseEmotion": "thinking",
    "facialCue": null,
    "actionCue": null,
    "delivery": "firm",
    "emphasis": 1
  },
  "reply": "Provider raw reply",
  "emotion": "thinking",
  "thought": "preserve background bytes",
  "format": "mind-turn-v1"
}`
    const input = createInput()
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: rawFullText,
      text: 'Provider raw reply',
    })

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Provider raw reply',
      origin: 'provider',
    }))
    expect(finishPayload).toEqual(expect.objectContaining({
      status: 'completed',
      fullText: rawFullText,
      origin: 'provider',
    }))
    expect(finishPayload?.fullText).toBe(rawFullText)
  })

  it('finishes plain Provider reply text as a Provider-authored visible reply', async () => {
    const input = createInput()
    const fullText = 'Provider returned plain text because this model lacks native JSON schema.'
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText,
      text: fullText,
    })

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'completed',
        origin: 'provider',
        fullText,
        visibleReplyRealization: expect.objectContaining({
          visibleText: fullText,
        }),
      }),
    )
  })

  it('surfaces a structured Provider payload without reply as a protocol failure', async () => {
    const input = createInput()
    const malformedStructuredPayload = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'missing visible reply',
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: malformedStructuredPayload,
      text: malformedStructuredPayload,
    })

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: expect.stringContaining('reply'),
      }),
    }))
    expect(input.emitChunk).not.toHaveBeenCalled()
  })

  it('blocks a structured Provider reply that claims unavailable long-term evidence', async () => {
    const input = createInput('继续刚才的记忆线', {
      prepareTurn: vi.fn(async () => createPrepared({
        memoryContext: {
          workingMemory: {
            version: 'working-memory-v1',
          },
          availableLongTermEvidenceIds: ['memory-known'],
        },
      })),
    })
    const invalidMemoryPayload = JSON.stringify({
      format: 'mind-turn-v1',
      thought: '',
      emotion: 'thinking',
      reply: '不应该发布。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      memoryUsage: {
        workingMemoryVersion: 'working-memory-v1',
        longTermEvidenceIds: ['memory-unknown'],
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: invalidMemoryPayload,
      text: invalidMemoryPayload,
    })

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: expect.stringContaining('provider-memory-usage-invalid'),
      }),
    }))
    expect(input.emitChunk).not.toHaveBeenCalled()
  })

  it('keeps memory side failures outside the visible Provider reply', async () => {
    const input = createInput('继续记忆任务', {
      prepareTurn: vi.fn(async () => createPrepared({
        memoryFailures: [{
          kind: 'recall-failure',
          reply: 'Long-term memory recall failed for this turn.',
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
          cardId: 'card-1',
          turnId: 'turn-1',
          occurredAt: 10,
          errorSummary: 'recall offline',
        }],
      })),
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: buildProviderReply(),
      text: buildProviderReply(),
    })

    await runAlicizationMainChatBackground(input)

    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(finishPayload?.fullText).toBe(buildProviderReply())
    expect(String(finishPayload?.fullText)).not.toContain('memoryFailures')
    expect(finishPayload?.memoryFailures).toEqual([
      expect.objectContaining({
        kind: 'recall-failure',
        stage: 'long-term-memory-recall',
        errorSummary: 'recall offline',
      }),
    ])
  })

  it('builds the runtime digest fallback only from available emotional facts', () => {
    const prepared = createPrepared({
      runtimeSurface: {
        ...createPrepared().runtimeSurface,
        digitalLifeRuntimeSurface: {
          dialogue: {
            currentConsciousFrame: {
              reasonTags: ['memory-available'],
              focusAnchor: '真实的当前对话焦点',
            },
          },
          memory: {
            emotionalKernel: {
              version: 'emotional-kernel-v1',
              dominantEmotion: 'calm',
              initiativeMode: 'responsive',
              memoryRecallMode: 'working-and-long-term',
              embodimentTone: 'steady',
            },
          },
        },
      },
    })

    const digest = mainChatBackgroundRunTestInternals.buildPreparedRuntimeDigestFallback(prepared)

    expect(digest?.currentConsciousFrame).toBeNull()
    expect(digest?.emotionalKernel).toEqual(expect.objectContaining({
      memoryRecallMode: 'working-and-long-term',
      embodimentTone: 'steady',
    }))
  })

  it('delegates failures without installing timeout reply recovery callbacks', async () => {
    const error = new DOMException('chat-first-event-timeout', 'AbortError')
    const input = createInput()
    vi.mocked(runAlicizationMainChatProviderStep).mockRejectedValueOnce(error)

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0] as unknown as Record<string, unknown>
    expect(failureInput.error).toBe(error)
    expect(failureInput).not.toHaveProperty('recoverFromTimeout')
    expect(failureInput).not.toHaveProperty('emitRecoveredText')
    expect(failureInput).not.toHaveProperty('timeoutRecoveryMode')
    expect(failureInput).not.toHaveProperty('timeoutRecoveryMs')
  })
})
