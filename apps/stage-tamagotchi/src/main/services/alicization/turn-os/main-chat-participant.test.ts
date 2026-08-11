import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationDialogueTurnSemantics,
} from '../dialogue-turn-semantics'

import { describe, expect, it, vi } from 'vitest'

import {
  mergeDialogueTurnSemantics,
  parseDialogueTurnSemanticsCandidate,
} from '../dialogue-turn-semantics'
import {
  runAlicizationMainChatProviderStep,
} from '../main-chat-stream-runner'
import {
  alicizationDialogueTurnSemanticsJsonSchema,
} from '../runtime-mind-state-provider-contract'
import { createAlicizationEventLoop } from './event-loop'
import {
  createAlicizationMainChatParticipant,
  resolveAlicizationLocalRuntimeUserId,
} from './main-chat-participant'

const scope = {
  turnId: 'turn-current',
  cardId: 'card-1',
  userId: 'local-user',
  conversationId: 'conversation-1',
}

function createPersistence() {
  const events: AlicizationRuntimeEventEnvelope[] = []
  return {
    events,
    appendRuntimeEvent: vi.fn(async (
      _scope: typeof scope,
      event: AlicizationRuntimeEventEnvelope,
    ) => {
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

function createTurnInput(overrides?: {
  conversationSessionId?: string | null
  payloadTurnId?: string
  preludeTurnId?: string
}) {
  return {
    payload: {
      cardId: 'card-1',
      turnId: overrides?.payloadTurnId ?? scope.turnId,
    },
    preludeTurnId: overrides?.preludeTurnId ?? scope.turnId,
    prepared: {
      conversationSessionId: overrides?.conversationSessionId === undefined
        ? scope.conversationId
        : overrides.conversationSessionId,
      messages: [{ role: 'user', content: '你好' }],
      tools: [],
    },
  }
}

function createBaseSemantics(): AlicizationDialogueTurnSemantics {
  return {
    act: 'ask-help',
    responseNeed: 'answer',
    truthExpectation: 'normal',
    affectiveTone: 'neutral',
    subjectPreference: 'general',
    taskAnchor: null,
    sharedAttentionDemand: 0,
    personaSuppression: 0,
    confidence: 0.7,
    summary: '',
    source: 'heuristic',
    reasonTags: [],
  }
}

describe('main chat EventLoop participant', () => {
  it('publishes provider text without a fixed reply envelope', async () => {
    const persistence = createPersistence()
    const publishReply = vi.fn(async () => {})
    const participant = createAlicizationMainChatParticipant({
      runProviderStep: vi.fn(async () => ({
        kind: 'reply' as const,
        text: '你好，我在。',
      })),
      executeTool: vi.fn(),
      publishReply,
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant,
    })

    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: createTurnInput(),
    })

    expect(result.status).toBe('completed')
    expect(publishReply).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '你好，我在。',
        turnId: scope.turnId,
      }),
    )
    expect(persistence.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: 'model.text.delta',
        payload: { text: '你好，我在。' },
      }),
      expect.objectContaining({
        eventType: 'assistant.reply.committed',
      }),
      expect.objectContaining({
        eventType: 'turn.completed',
      }),
    ]))
  })

  it('does not rewrite a provider failure into a persona reply', async () => {
    const persistence = createPersistence()
    const publishReply = vi.fn()
    const participant = createAlicizationMainChatParticipant({
      runProviderStep: vi.fn(async () => {
        throw new Error('Provider HTTP 503')
      }),
      executeTool: vi.fn(),
      publishReply,
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant,
    })

    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: createTurnInput(),
    })

    expect(result).toMatchObject({
      status: 'failed',
      error: 'Provider HTTP 503',
    })
    expect(publishReply).not.toHaveBeenCalled()
    expect(persistence.events.map(event => event.eventType)).toEqual(
      expect.arrayContaining(['provider.failed', 'turn.failed']),
    )
    expect(persistence.events.map(event => event.eventType)).not.toContain('model.text.delta')
  })

  it('does not require model-created sourceTurnId', () => {
    expect(
      alicizationDialogueTurnSemanticsJsonSchema
        .properties
        .codingAgentDelegation,
    ).toMatchObject({
      type: ['object', 'null'],
    })
    expect(
      alicizationDialogueTurnSemanticsJsonSchema
        .properties
        .codingAgentDelegation
        .properties,
    ).not.toHaveProperty('sourceTurnId')

    const candidate = parseDialogueTurnSemanticsCandidate(JSON.stringify({
      act: 'ask-help',
      codingAgentDelegation: {
        intentKind: 'execute',
        requestedAgent: 'codex',
        verdict: 'delegate-coding-agent',
        scope: 'investigation',
        confidence: 0.92,
      },
    }))
    const merged = mergeDialogueTurnSemantics(
      createBaseSemantics(),
      candidate,
      { sourceTurnId: scope.turnId },
    )

    expect(merged.codingAgentDelegation).toEqual({
      intentKind: 'execute',
      requestedAgent: 'codex',
      verdict: 'delegate-coding-agent',
      scope: 'investigation',
      confidence: 0.92,
      sourceTurnId: scope.turnId,
      source: 'structured-cognition',
    })
  })

  it('rejects stale prelude turn identity before tool execution', async () => {
    const persistence = createPersistence()
    const executeTool = vi.fn()
    const runProviderStep = vi.fn(async () => ({
      kind: 'action' as const,
      action: {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        qualifiedToolName: 'executor_run_codex',
        input: {
          prompt: 'inspect repository',
        },
      },
    }))
    const participant = createAlicizationMainChatParticipant({
      runProviderStep,
      executeTool,
      publishReply: vi.fn(),
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant,
    })

    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: createTurnInput({
        preludeTurnId: 'turn-stale',
      }),
    })

    expect(result.status).toBe('failed')
    expect(result.error).toContain('stale main chat prelude turn identity')
    expect(runProviderStep).not.toHaveBeenCalled()
    expect(executeTool).not.toHaveBeenCalled()
    expect(persistence.events.map(event => event.eventType)).not.toContain('action.started')
  })

  it('rejects a missing prepared conversation identity before Provider execution', async () => {
    const persistence = createPersistence()
    const runProviderStep = vi.fn()
    const executeTool = vi.fn()
    const participant = createAlicizationMainChatParticipant({
      runProviderStep,
      executeTool,
      publishReply: vi.fn(),
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant,
    })

    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: createTurnInput({
        conversationSessionId: null,
      }),
    })

    expect(result.status).toBe('failed')
    expect(result.error).toContain('main chat requires a real conversationSessionId')
    expect(runProviderStep).not.toHaveBeenCalled()
    expect(executeTool).not.toHaveBeenCalled()
  })

  it('persists one stable local runtime user identity and reuses it', async () => {
    let storedValue: string | undefined
    const getMetaValue = vi.fn(async () => storedValue)
    const setMetaValue = vi.fn(async (_key: string, value: string) => {
      storedValue = value
    })
    const createUserId = vi.fn(() => 'local-user-stable')

    const first = await resolveAlicizationLocalRuntimeUserId({
      getMetaValue,
      setMetaValue,
      createUserId,
    })
    const second = await resolveAlicizationLocalRuntimeUserId({
      getMetaValue,
      setMetaValue,
      createUserId,
    })

    expect(first).toBe('local-user-stable')
    expect(second).toBe(first)
    expect(createUserId).toHaveBeenCalledOnce()
    expect(setMetaValue).toHaveBeenCalledOnce()
  })

  it('turns a native Provider tool call into an action without executing the tool', async () => {
    const execute = vi.fn()
    const emitToolCall = vi.fn()
    const prepared = {
      chatConfig: {
        model: 'gpt-test',
        baseURL: 'https://example.test/v1',
      },
      conversationSessionId: scope.conversationId,
      messages: [{ role: 'user', content: '检查项目' }],
      tools: [{
        type: 'function',
        function: {
          name: 'executor_run_codex',
          description: 'Inspect a project.',
          parameters: {
            type: 'object',
            properties: {
              prompt: { type: 'string' },
            },
          },
        },
        execute,
      }],
      toolCallIdentity: {
        resolveProviderToolCall: vi.fn(() => 'tool-call-canonical'),
      },
    } as any

    const result = await runAlicizationMainChatProviderStep({
      payload: {
        cardId: scope.cardId,
        turnId: scope.turnId,
        providerId: 'openai',
      } as any,
      prepared,
      messages: prepared.messages,
      controller: new AbortController(),
      firstEventTimeoutMs: 100,
      isRunActive: () => true,
      nonProgressEventTypes: new Set(),
      emitToolCall,
      streamTextImpl: vi.fn(() => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'provider-tool-call-1',
              toolName: 'executor_run_codex',
              args: JSON.stringify({ prompt: 'inspect repository' }),
            })
            controller.close()
          },
        }),
      })),
    })

    expect(result).toMatchObject({
      kind: 'action',
      action: {
        actionId: `${scope.turnId}:action:tool-call-canonical`,
        toolCallId: 'tool-call-canonical',
        qualifiedToolName: 'executor_run_codex',
        input: {
          prompt: 'inspect repository',
        },
      },
    })
    expect(execute).not.toHaveBeenCalled()
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'tool-call-canonical',
      toolName: 'executor_run_codex',
    }))
  })

  it('classifies metadata-only Provider completion as a first-event timeout', async () => {
    const prepared = {
      chatConfig: {
        model: 'gpt-test',
        baseURL: 'https://example.test/v1',
      },
      conversationSessionId: scope.conversationId,
      messages: [{ role: 'user', content: '你好' }],
      tools: [],
    } as any

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: scope.cardId,
        turnId: scope.turnId,
        providerId: 'openai',
      } as any,
      prepared,
      messages: prepared.messages,
      controller: new AbortController(),
      firstEventTimeoutMs: 100,
      isRunActive: () => true,
      nonProgressEventTypes: new Set(),
      emitToolCall: vi.fn(),
      streamTextImpl: vi.fn(async ({ onEvent }: any) => {
        await onEvent?.({
          type: 'response-metadata',
          meta: { provider: 'mock' },
        })
      }),
    })).rejects.toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('chat-first-event-timeout'),
    })
  })

  it('waits for legacy onEvent callbacks that arrive after streamText returns', async () => {
    const prepared = {
      chatConfig: {
        model: 'gpt-test',
        baseURL: 'https://example.test/v1',
      },
      conversationSessionId: scope.conversationId,
      messages: [{ role: 'user', content: '检查项目' }],
      tools: [],
    } as any

    const result = await runAlicizationMainChatProviderStep({
      payload: {
        cardId: scope.cardId,
        turnId: scope.turnId,
        providerId: 'openai',
      } as any,
      prepared,
      messages: prepared.messages,
      controller: new AbortController(),
      firstEventTimeoutMs: 250,
      isRunActive: () => true,
      nonProgressEventTypes: new Set(),
      emitToolCall: vi.fn(),
      streamTextImpl: vi.fn(({ onEvent }: any) => {
        setTimeout(() => {
          onEvent?.({ type: 'text-delta', text: '异步 Provider 回复' })
          onEvent?.({ type: 'finish', finishReason: 'stop' })
        }, 10)
      }),
    })

    expect(result).toEqual({
      kind: 'reply',
      finishReason: 'stop',
      fullText: '异步 Provider 回复',
      text: '异步 Provider 回复',
    })
  })

  it('does not hang when streamText ignores the first-event abort signal', async () => {
    vi.useFakeTimers()
    try {
      const prepared = {
        chatConfig: {
          model: 'gpt-test',
          baseURL: 'https://example.test/v1',
        },
        conversationSessionId: scope.conversationId,
        messages: [{ role: 'user', content: '你好' }],
        tools: [],
      } as any
      let observed: unknown
      void runAlicizationMainChatProviderStep({
        payload: {
          cardId: scope.cardId,
          turnId: scope.turnId,
          providerId: 'openai',
        } as any,
        prepared,
        messages: prepared.messages,
        controller: new AbortController(),
        firstEventTimeoutMs: 20,
        isRunActive: () => true,
        nonProgressEventTypes: new Set(),
        emitToolCall: vi.fn(),
        streamTextImpl: vi.fn(() => new Promise(() => {})),
      }).catch((error) => {
        observed = error
      })

      await vi.advanceTimersByTimeAsync(25)
      await Promise.resolve()

      expect(observed).toMatchObject({
        name: 'AbortError',
        message: expect.stringContaining('chat-first-event-timeout'),
      })
    }
    finally {
      vi.useRealTimers()
    }
  })
})
