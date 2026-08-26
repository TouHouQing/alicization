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
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

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
  const toolRegistry = overrides?.toolRegistry ?? createCanonicalToolRegistry()
  for (const tool of overrides?.tools ?? []) {
    const adapterToolName = String(tool?.function?.name ?? '').trim()
    if (
      !adapterToolName
      || toolRegistry.resolveAdapterToolName(adapterToolName)
      || toolRegistry.isKnownProviderToolName(adapterToolName)
      || adapterToolName.startsWith('executor_run_')
    ) {
      continue
    }
    toolRegistry.register({
      capabilityId: `test.${adapterToolName}`,
      kind: 'tool',
      version: '1.0.0',
      description: adapterToolName,
      inputSchema: tool.function?.parameters ?? {
        type: 'object',
        additionalProperties: true,
      },
      outputSchema: { type: 'object' },
      scope: 'turn',
      permissions: [],
      risk: 'low',
      executionChannel: 'test',
      timeoutMs: 1_000,
      supportsProgress: false,
      supportsCancellation: true,
      idempotency: 'none',
      evaluationStatus: 'passed',
      activationStatus: 'active',
      providerToolName: adapterToolName,
      adapterToolName,
    })
  }
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
    toolRegistry,
    ...overrides,
  }
}

function createMemoryWriteItem() {
  return {
    id: 'queue-turn-1',
    sourceTurnIds: ['turn-1:user'],
    kind: 'preference',
    summary: '用户希望失败时不要污染长期记忆。',
    reason: 'candidate:preference',
    evidenceSnippets: ['失败时不要污染长期记忆。'],
    salience: 0.8,
    confidence: 0.86,
    sensitivity: 'personal',
    allowTraining: false,
    status: 'pending-cleaning',
    rejectionReasons: [],
    contaminationFlags: [],
    createdAt: 100,
    source: 'working-memory-owner',
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
    emitToolProgress: vi.fn(),
    emitToolResult: vi.fn(),
    emitError: vi.fn(),
    incrementChunkStats: vi.fn(),
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

  it('rejects memory writeback without committing it when the Provider fails', async () => {
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
    const commitMemoryWriteIntent = vi.fn(async () => {})
    const providerFailure = new Error('provider unavailable')
    vi.mocked(runAlicizationMainChatProviderStep).mockRejectedValueOnce(providerFailure)
    const input = createInput('记住这轮', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })

    await runAlicizationMainChatBackground(input)

    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toContain('memory.write.rejected')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
  })

  it('commits memory writeback when a tool failure still leads to a completed Provider reply', async () => {
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
    const settledSnapshot = {
      version: 'working-memory-v1',
      updatedAt: 100,
      compressedTimeline: [],
      compression: {
        level: 'none',
        sourceTurnIds: [],
        lastCompressedAt: null,
      },
    }
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: settledSnapshot,
      memoryWriteItems: [createMemoryWriteItem()],
    }))
    const prepared = createPrepared({
      commitMemoryWriteIntent,
      memoryWriteItems: [createMemoryWriteItem()],
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => {
          throw new Error('coding agent failed')
        }),
      }],
    })
    const input = createInput('检查项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:tool-failure',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'tool-failure-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '工具失败后仍完成回复。',
        text: '工具失败后仍完成回复。',
      } as any)

    await runAlicizationMainChatBackground(input)

    expect(commitMemoryWriteIntent).toHaveBeenCalledOnce()
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '工具失败后仍完成回复。',
    })
    expect(events.map(event => event.eventType)).toContain('action.failed')
    expect(events.map(event => event.eventType)).toContain('memory.write.accepted')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.rejected')
  })

  it('rejects memory writeback without committing it when the turn is cancelled', async () => {
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
    const commitMemoryWriteIntent = vi.fn(async () => {})
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(
      async () => await new Promise<never>(() => {}),
    )
    const input = createInput('停止这轮', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })
    await input.runState.cancelTurn?.('user-cancelled')
    await running

    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toContain('runtime.cancelled')
    expect(events.map(event => event.eventType)).toContain('memory.write.rejected')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
  })

  it('rejects memory writeback without committing it when the model step budget is exhausted', async () => {
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
    const commitMemoryWriteIntent = vi.fn(async () => {})
    const prepared = createPrepared({
      commitMemoryWriteIntent,
      memoryWriteItems: [createMemoryWriteItem()],
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => ({
          status: 'completed',
        })),
      }],
    })
    const input = createInput('持续检查直到预算耗尽', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(
      async (_options: any) => {
        const index = vi.mocked(runAlicizationMainChatProviderStep).mock.calls.length
        return {
          kind: 'action',
          action: {
            actionId: `turn-1:action:budget-${index}`,
            input: {
              agent: 'codex',
              prompt: `inspect pass ${index}`,
            },
            providerToolName: 'coding_agent',
            capabilityId: 'coding_agent.codex',
            toolCallId: `budget-call-${index}`,
          },
        } as any
      },
    )

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(8)
    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toContain('runtime.timed_out')
    expect(events.map(event => event.eventType)).toContain('memory.write.rejected')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
  })

  it('commits the settled Provider reply before publishing WorkingMemory events', async () => {
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
    const settledSnapshot = {
      version: 'working-memory-v1',
      updatedAt: 100,
      compressedTimeline: [{
        id: 'episodelet-1',
        sourceTurnIds: ['turn-old:user'],
        summary: '旧对话已经压缩。',
      }],
      compression: {
        level: 'light',
        sourceTurnIds: ['turn-old:user'],
        lastCompressedAt: 100,
      },
    }
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: settledSnapshot,
      memoryWriteItems: [createMemoryWriteItem()],
    }))
    const input = createInput('记住成功回复', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: '最终 Provider 回复',
      text: '最终 Provider 回复',
    })

    await runAlicizationMainChatBackground(input)

    expect(commitMemoryWriteIntent).toHaveBeenCalledOnce()
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '最终 Provider 回复',
    })
    const eventTypes = events.map(event => event.eventType)
    expect(eventTypes.indexOf('turn.completed')).toBeLessThan(
      eventTypes.indexOf('memory.write.proposed'),
    )
    expect(eventTypes.indexOf('memory.write.accepted')).toBeLessThan(
      eventTypes.indexOf('working_memory.compression.completed'),
    )
    expect(eventTypes.indexOf('working_memory.compression.completed')).toBeLessThan(
      eventTypes.indexOf('working_memory.snapshot.created'),
    )
  })

  it('publishes memory write events from the final settled candidates instead of prepare-time candidates', async () => {
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
    const preparedItem = createMemoryWriteItem()
    const settledItem = {
      ...createMemoryWriteItem(),
      id: 'queue-final',
      sourceTurnIds: ['turn-1:user', 'turn-1:alice'],
      summary: '这条候选由最终成功回复凝练。',
    }
    const settledSnapshot = {
      version: 'working-memory-v1',
      updatedAt: 100,
      compressedTimeline: [],
      compression: {
        level: 'none',
        sourceTurnIds: [],
        lastCompressedAt: null,
      },
    }
    const resolvedIntent = {
      version: 'memory-write-intent-v1',
      workingMemorySnapshot: settledSnapshot,
      memoryWriteItems: [settledItem],
    }
    const resolveMemoryWriteIntent = vi.fn(() => resolvedIntent)
    const commitMemoryWriteIntent = vi.fn(async () => ({
      ...resolvedIntent,
      ownerSettlements: [{
        owner: 'working-memory-checkpoint',
        status: 'succeeded',
      }],
    }))
    const input = createInput('记住最终回复', {
      prepareTurn: vi.fn(async () => createPrepared({
        resolveMemoryWriteIntent,
        commitMemoryWriteIntent,
        memoryWriteItems: [preparedItem],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: '最终 Provider 回复',
      text: '最终 Provider 回复',
    })

    await runAlicizationMainChatBackground(input)

    expect(resolveMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '最终 Provider 回复',
    })
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '最终 Provider 回复',
      intent: resolvedIntent,
    })
    expect(events.find(event => event.eventType === 'memory.write.proposed')?.payload)
      .toMatchObject({
        itemCount: 1,
        sourceTurnIds: ['turn-1:user', 'turn-1:alice'],
      })
    expect(events.find(event => event.eventType === 'memory.write.accepted')?.payload)
      .toMatchObject({
        itemCount: 1,
        sourceTurnIds: ['turn-1:user', 'turn-1:alice'],
      })
    expect(JSON.stringify(events.filter(event =>
      event.eventType === 'memory.write.proposed'
      || event.eventType === 'memory.write.accepted',
    ))).not.toContain('用户希望失败时不要污染长期记忆。')
  })

  it('passes Provider memory evidence through the durable reply into WorkingMemory settlement', async () => {
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
    const memoryEvidence = {
      version: 'provider-memory-evidence-v1',
      kind: 'preference',
      summary: '用户更喜欢先说结论。',
      reason: '用户明确提出了稳定的表达偏好。',
      evidenceSnippets: ['请记住我更喜欢先说结论。'],
      salience: 0.86,
      sensitivity: 'personal',
      confidence: 0.92,
    } as const
    const resolvedIntent = {
      version: 'memory-write-intent-v1' as const,
      workingMemorySnapshot: {
        version: 'working-memory-v1' as const,
        updatedAt: 100,
        compressedTimeline: [],
        compression: {
          level: 'none' as const,
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
      },
      memoryWriteItems: [createMemoryWriteItem()],
    }
    const resolveMemoryWriteIntent = vi.fn(() => resolvedIntent)
    const commitMemoryWriteIntent = vi.fn(async () => ({
      ...resolvedIntent,
      ownerSettlements: [],
    }))
    const input = createInput('请记住我的表达偏好', {
      prepareTurn: vi.fn(async () => createPrepared({
        resolveMemoryWriteIntent,
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'answer',
        emotion: 'neutral',
        reply: '我会记住你更喜欢先说结论。',
        performance: {
          baseEmotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        memoryUsage: {
          workingMemoryVersion: null,
          longTermEvidenceIds: [],
        },
        memoryEvidence,
      }),
      text: '我会记住你更喜欢先说结论。',
    })

    await runAlicizationMainChatBackground(input)

    expect(resolveMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '我会记住你更喜欢先说结论。',
      memoryEvidence,
    })
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '我会记住你更喜欢先说结论。',
      intent: resolvedIntent,
    })
    expect(events.map(event => event.eventType)).toContain('memory.write.proposed')
  })

  it('does not complete or commit memory when the visible reply is no longer deliverable', async () => {
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
    let active = true
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: {
        version: 'working-memory-v1',
        updatedAt: 100,
        compressedTimeline: [],
        compression: {
          level: 'none',
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
      },
      memoryWriteItems: [createMemoryWriteItem()],
    }))
    const input = createInput('这轮已经失效', {
      isRunActive: () => active,
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async () => {
      active = false
      return {
        kind: 'reply',
        finishReason: 'stop',
        fullText: '这条回复不应投递。',
        text: '这条回复不应投递。',
      }
    })

    await runAlicizationMainChatBackground(input)

    expect(input.emitChunk).not.toHaveBeenCalled()
    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).not.toContain('assistant.reply.committed')
    expect(events.map(event => event.eventType)).not.toContain('turn.completed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
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

  it('persists canonical action identity while executing and rendering the Provider alias', async () => {
    const persistence = createInMemoryPersistence()
    const execute = vi.fn(async () => ({
      status: 'completed',
      summary: 'repository inspected',
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:canonical-tool-call',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'canonical-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(execute).toHaveBeenCalledOnce()
    expect(input.emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'coding_agent',
    }))
    expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'action.started',
        payload: expect.objectContaining({
          capabilityId: 'coding_agent.codex',
        }),
      }),
    )
  })

  it('projects Provider tool calls only after model.tool_call.proposed is durable', async () => {
    const order: string[] = []
    let lastAppendedEventType = ''
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        lastAppendedEventType = event.eventType
        order.push(`append:${event.eventType}`)
        return {
          ...event,
          sequence: order.filter(item => item.startsWith('append:')).length,
        }
      }),
      saveRuntimeCheckpoint: vi.fn(async (checkpoint) => {
        order.push(`checkpoint:${lastAppendedEventType}`)
        return checkpoint
      }),
    }
    const execute = vi.fn(async () => ({
      status: 'completed',
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolCall: vi.fn(() => {
        order.push('emit:tool-call')
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockImplementationOnce(async (options: any) => {
        options.emitToolCall({
          cardId: 'card-1',
          turnId: 'turn-1',
          toolCallId: 'durable-tool-call',
          toolName: 'coding_agent',
          arguments: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
        })
        return {
          kind: 'action',
          action: {
            actionId: 'turn-1:action:durable-tool-call',
            input: {
              agent: 'codex',
              prompt: 'inspect the repository',
            },
            providerToolName: 'coding_agent',
            capabilityId: 'coding_agent.codex',
            toolCallId: 'durable-tool-call',
          },
        } as any
      })
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(input.emitToolCall).toHaveBeenCalledOnce()
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'durable-tool-call',
      toolName: 'coding_agent',
      arguments: {
        agent: 'codex',
        prompt: 'inspect the repository',
      },
    }))
    expect(order.indexOf('append:model.tool_call.proposed')).toBeLessThan(
      order.indexOf('checkpoint:model.tool_call.proposed'),
    )
    expect(order.indexOf('checkpoint:model.tool_call.proposed')).toBeLessThan(
      order.indexOf('emit:tool-call'),
    )
  })

  it.each([
    'append',
    'checkpoint',
  ] as const)('does not emit a tool result when observation %s fails', async (failureStage) => {
    const events: any[] = []
    let lastAppendedEventType = ''
    const persistenceError = new Error(`observation ${failureStage} failed`)
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        lastAppendedEventType = event.eventType
        if (
          failureStage === 'append'
          && event.eventType === 'action.observation'
        ) {
          throw persistenceError
        }
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async (checkpoint) => {
        if (
          failureStage === 'checkpoint'
          && lastAppendedEventType === 'action.observation'
        ) {
          throw persistenceError
        }
        return checkpoint
      }),
    }
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => ({
          status: 'completed',
        })),
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'action',
      action: {
        actionId: `turn-1:action:observation-${failureStage}-failure`,
        input: {
          agent: 'codex',
          prompt: 'inspect the repository',
        },
        providerToolName: 'coding_agent',
        capabilityId: 'coding_agent.codex',
        toolCallId: `observation-${failureStage}-failure`,
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(input.emitToolResult).not.toHaveBeenCalled()
  })

  it('emits a tool result only after action.observation is durable', async () => {
    const order: string[] = []
    let lastAppendedEventType = ''
    let sequence = 0
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        lastAppendedEventType = event.eventType
        order.push(`append:${event.eventType}`)
        return {
          ...event,
          sequence: ++sequence,
        }
      }),
      saveRuntimeCheckpoint: vi.fn(async (checkpoint) => {
        order.push(`checkpoint:${lastAppendedEventType}`)
        return checkpoint
      }),
    }
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => ({
          status: 'completed',
          summary: 'repository inspected',
        })),
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolResult: vi.fn(() => {
        order.push('emit:tool-result')
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:durable-observation',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'durable-observation',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(input.emitToolResult).toHaveBeenCalledOnce()
    expect(order.indexOf('append:action.observation')).toBeLessThan(
      order.indexOf('checkpoint:action.observation'),
    )
    expect(order.indexOf('checkpoint:action.observation')).toBeLessThan(
      order.indexOf('emit:tool-result'),
    )
  })

  it('keeps a successful tool observation when tool-result delivery fails', async () => {
    const persistence = createInMemoryPersistence()
    const execute = vi.fn(async () => ({
      status: 'completed',
      summary: 'repository inspected',
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const deliveryError = new Error('renderer tool-result delivery failed')
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolResult: vi.fn(() => {
        throw deliveryError
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:delivery-failure',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'delivery-failure-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(execute).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      'card-1::turn-1',
      expect.objectContaining({
        status: 'completed',
        fullText: '检查完成。',
      }),
    )
    expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'action.observation',
        payload: expect.objectContaining({
          actionId: 'turn-1:action:delivery-failure',
          outcome: 'success',
          output: {
            status: 'completed',
            summary: 'repository inspected',
          },
        }),
      }),
    )
    expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'action.completed',
        payload: expect.objectContaining({
          actionId: 'turn-1:action:delivery-failure',
        }),
      }),
    )
    expect(persistence.appendRuntimeEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'action.failed',
      }),
    )
    expect(persistence.appendRuntimeEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'tool.failed',
      }),
    )
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        category: 'alicization.executor.delivery',
        action: 'tool-result-delivery-failed',
        payload: expect.objectContaining({
          toolCallId: 'delivery-failure-tool-call',
          reason: deliveryError.message,
        }),
      }),
    )
  })

  it('returns a thrown tool failure to the Provider as a structured tool observation', async () => {
    const persistence = createInMemoryPersistence()
    const providerMessages: Message[][] = []
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => {
          throw Object.assign(new Error('Codex produced no semantic progress'), {
            name: 'AlicizationToolExecutionError',
            failureKind: 'tool-execution',
            toolName: 'codex',
            errorCode: 'CODEX_TIMEOUT',
          })
        }),
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockImplementation(async (options: any) => {
        providerMessages.push(options.messages)
        if (providerMessages.length === 1) {
          return {
            kind: 'action',
            action: {
              actionId: 'turn-1:action:tool-failure-continuation',
              input: { agent: 'codex', prompt: 'inspect the repository' },
              providerToolName: 'coding_agent',
              capabilityId: 'coding_agent.codex',
              toolCallId: 'tool-failure-continuation',
            },
          } as any
        }
        return {
          kind: 'reply',
          finishReason: 'stop',
          fullText: buildProviderReply('我知道 Codex 超时了。'),
          text: buildProviderReply('我知道 Codex 超时了。'),
        } as any
      })

    await runAlicizationMainChatBackground(input)

    expect(providerMessages).toHaveLength(2)
    const toolMessage = providerMessages[1]?.find(message => message.role === 'tool')
    expect(toolMessage).toMatchObject({
      role: 'tool',
      tool_call_id: 'tool-failure-continuation',
    })
    expect(JSON.parse(String(toolMessage?.content))).toMatchObject({
      status: 'timeout',
      errorCode: 'CODEX_TIMEOUT',
      continuationPolicy: 'continue',
    })
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'completed',
      }),
    )
  })

  it('keeps the Provider action loop alive when tool-call delivery fails', async () => {
    const persistence = createInMemoryPersistence()
    const execute = vi.fn(async () => ({
      status: 'completed',
      summary: 'repository inspected',
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const deliveryError = new Error('renderer tool-call delivery failed')
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolCall: vi.fn(() => {
        throw deliveryError
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockImplementationOnce(async (options: any) => {
        options.emitToolCall({
          cardId: 'card-1',
          turnId: 'turn-1',
          toolCallId: 'delivery-failure-tool-call',
          toolName: 'coding_agent',
        })
        return {
          kind: 'action',
          action: {
            actionId: 'turn-1:action:tool-call-delivery-failure',
            input: {
              agent: 'codex',
              prompt: 'inspect the repository',
            },
            providerToolName: 'coding_agent',
            capabilityId: 'coding_agent.codex',
            toolCallId: 'delivery-failure-tool-call',
          },
        } as any
      })
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(execute).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      'card-1::turn-1',
      expect.objectContaining({
        status: 'completed',
        fullText: '检查完成。',
      }),
    )
    expect(persistence.appendRuntimeEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'provider.failed',
      }),
    )
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        category: 'alicization.executor.delivery',
        action: 'tool-call-delivery-failed',
        payload: expect.objectContaining({
          toolCallId: 'delivery-failure-tool-call',
          reason: deliveryError.message,
        }),
      }),
    )
  })

  it('persists online tool progress under the active Turn OS action scope', async () => {
    const persistence = createInMemoryPersistence()
    const runState = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
      toolProgressListeners: new Set<(event: any) => void>(),
    }
    const execute = vi.fn(async () => {
      for (const listener of runState.toolProgressListeners) {
        listener({
          toolCallId: 'canonical-tool-call',
          toolName: 'coding_agent',
          selectedChannel: 'codex',
          phase: 'running',
          signal: 'semantic-progress',
          elapsedMs: 320,
          timeoutMs: 180_000,
          occurredAt: 1_320,
          eventId: 'codex-progress-1',
          threadId: 'codex-thread-1',
          adapterEventType: 'item.completed',
          itemType: 'command_execution',
          summary: 'Inspected package metadata.',
          command: 'pnpm -v',
          commandStatus: 'completed',
          commandExitCode: 0,
          outputPreview: '10.14.0',
        })
      }
      return {
        status: 'completed',
        summary: 'repository inspected',
      }
    })
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      runState,
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:canonical-tool-call',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'canonical-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card-1',
        userId: 'local-user-stable',
        conversationId: 'conversation-1',
        turnId: 'turn-1',
      }),
      expect.objectContaining({
        eventType: 'action.progress',
        payload: expect.objectContaining({
          actionId: 'turn-1:action:canonical-tool-call',
          toolCallId: 'canonical-tool-call',
          selectedChannel: 'codex',
          eventId: 'codex-progress-1',
          summary: 'Inspected package metadata.',
        }),
      }),
    )
    expect(runState.toolProgressListeners).toHaveLength(0)
  })

  it('projects action progress only after its runtime checkpoint is durable', async () => {
    const order: string[] = []
    let lastAppendedEventType = ''
    let sequence = 0
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        lastAppendedEventType = event.eventType
        order.push(`append:${event.eventType}`)
        return {
          ...event,
          sequence: ++sequence,
        }
      }),
      saveRuntimeCheckpoint: vi.fn(async (checkpoint) => {
        order.push(`checkpoint:${lastAppendedEventType}`)
        return checkpoint
      }),
    }
    const runState = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
      toolProgressListeners: new Set<(event: any) => void>(),
    }
    const execute = vi.fn(async () => {
      for (const listener of runState.toolProgressListeners) {
        listener({
          toolCallId: 'durable-progress-tool-call',
          toolName: 'coding_agent',
          selectedChannel: 'codex',
          phase: 'running',
          signal: 'semantic-progress',
          elapsedMs: 320,
          occurredAt: 1_320,
          eventId: 'durable-progress-1',
          summary: 'Inspected package metadata.',
        })
      }
      return {
        status: 'completed',
      }
    })
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      runState,
      prepareTurn: vi.fn(async () => prepared),
      emitToolProgress: vi.fn(() => {
        order.push('emit:tool-progress')
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    } as any)
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:durable-progress',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'durable-progress-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect((input as any).emitToolProgress).toHaveBeenCalledOnce()
    expect(order.indexOf('append:action.progress')).toBeLessThan(
      order.indexOf('checkpoint:action.progress'),
    )
    expect(order.indexOf('checkpoint:action.progress')).toBeLessThan(
      order.indexOf('emit:tool-progress'),
    )
  })

  it('projects a durable cancelled observation as a cancelled tool result', async () => {
    const execute = vi.fn(async (
      _input: unknown,
      options: { abortSignal: AbortSignal },
    ) => await new Promise<never>((_resolve, reject) => {
      options.abortSignal.addEventListener('abort', () => {
        reject(new DOMException('cancelled', 'AbortError'))
      }, { once: true })
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const emitToolProgress = vi.fn()
    const emitToolResult = vi.fn()
    const input = createInput('停止工具', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolProgress,
      emitToolResult,
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'action',
      action: {
        actionId: 'turn-1:action:cancelled-observation',
        input: {
          agent: 'codex',
          prompt: 'inspect the repository',
        },
        providerToolName: 'coding_agent',
        capabilityId: 'coding_agent.codex',
        toolCallId: 'cancelled-observation-tool-call',
      },
    } as any)

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(execute).toHaveBeenCalledOnce()
      expect(input.runState.cancelTurn).toBeTypeOf('function')
    })
    await input.runState.cancelTurn?.('user cancelled the tool')
    await running

    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'cancelled-observation-tool-call',
      toolName: 'coding_agent',
      phase: 'cancelled',
    }))
    expect(emitToolProgress).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'cancelled-observation-tool-call',
      toolName: 'coding_agent',
      phase: 'cancelled',
      signal: 'terminal',
      errorMessage: 'user cancelled the tool',
    }))
    expect(emitToolProgress.mock.invocationCallOrder[0]).toBeLessThan(
      emitToolResult.mock.invocationCallOrder[0]!,
    )
  })

  it('keeps a successful tool result when action progress persistence fails', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        if (event.eventType === 'action.progress')
          throw new Error('progress event store unavailable')
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const runState = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
      toolProgressListeners: new Set<(event: any) => void>(),
    }
    const execute = vi.fn(async () => {
      for (const listener of runState.toolProgressListeners) {
        listener({
          toolCallId: 'progress-failure-tool-call',
          toolName: 'coding_agent',
          selectedChannel: 'codex',
          phase: 'running',
          signal: 'semantic-progress',
          elapsedMs: 320,
          timeoutMs: 180_000,
          occurredAt: 1_320,
          eventId: 'progress-failure-1',
          summary: 'Inspected package metadata.',
        })
      }
      return {
        status: 'completed',
        summary: 'repository inspected',
      }
    })
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      runState,
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:progress-failure',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'progress-failure-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(execute).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      'card-1::turn-1',
      expect.objectContaining({
        status: 'completed',
        fullText: '检查完成。',
      }),
    )
    expect(events.map(event => event.eventType)).toContain('action.completed')
    expect(events.map(event => event.eventType)).not.toContain('action.failed')
    expect(events.map(event => event.eventType)).not.toContain('tool.failed')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.tool-progress-persistence-failed',
      expect.objectContaining({
        actionId: 'turn-1:action:progress-failure',
        toolCallId: 'progress-failure-tool-call',
        reason: 'progress event store unavailable',
      }),
    )
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        category: 'alicization.executor.persistence',
        action: 'tool-progress-persistence-failed',
        payload: expect.objectContaining({
          actionId: 'turn-1:action:progress-failure',
          toolCallId: 'progress-failure-tool-call',
          persistenceFailureOnly: true,
        }),
      }),
    )
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

  it('persists an internal preparation deadline as timed-out without aborting the user cancellation controller', async () => {
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
    const input = createInput('请继续。', {
      preparationTimeoutMs: 5,
      prepareTurn: vi.fn(() => new Promise(() => {})),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(input.runState.controller.signal.aborted).toBe(false)
    expect(events.map(event => event.eventType)).toContain('runtime.timed_out')
    expect(events.map(event => event.eventType)).not.toContain('runtime.cancelled')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
        timeoutOrigin: 'runtime-watchdog',
        timeoutReason: 'chat-preparation-timeout',
      }),
    }))
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

  it('reports runtime memory event persistence failure without replacing the Provider reply', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        if (event.eventType === 'memory.write.proposed')
          throw new Error('runtime event store unavailable')
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: {
        version: 'working-memory-v1',
        updatedAt: 100,
        compressedTimeline: [],
        compression: {
          level: 'none',
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
      },
      memoryWriteItems: [createMemoryWriteItem()],
      ownerSettlements: [],
    }))
    const input = createInput('记住成功回复', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: 'Provider 正常回复。',
      text: 'Provider 正常回复。',
    })

    await runAlicizationMainChatBackground(input)

    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(finishPayload).toMatchObject({
      status: 'completed',
      fullText: 'Provider 正常回复。',
      memoryFailures: [
        expect.objectContaining({
          kind: 'memory-persistence',
          stage: 'runtime-event-store',
          errorSummary: 'runtime event store unavailable',
        }),
      ],
    })
    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Provider 正常回复。',
      origin: 'provider',
    }))
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
