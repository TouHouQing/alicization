import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  runAlicizationMainChatProviderStep,
  runAlicizationMainChatStream,
} from './main-chat-stream-runner'
import { createAlicizationMainChatToolCallIdentityRegistry } from './main-chat-tool-call-identity'
import { createAlicizationTurnRuntime } from './turn-os/runtime'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

const typedMemoryContextBlock = JSON.stringify({
  type: 'alicization-turn-memory-context',
  version: 'alicization-main-chat-memory-context-v1',
  workingMemory: {
    version: 'working-memory-owner-context-v1',
    owner: 'working-memory',
  },
  longTermRecall: {
    evidenceIds: ['memory-1'],
  },
})

function createPrepared(overrides?: Partial<any>) {
  const toolRegistry = overrides?.toolRegistry ?? createCanonicalToolRegistry()
  for (const tool of overrides?.tools ?? []) {
    const adapterToolName = String(tool?.function?.name ?? '').trim()
    if (
      !adapterToolName
      || adapterToolName === 'mcp_call_tool'
      || adapterToolName === 'mcp_list_tools'
      || toolRegistry.isKnownProviderToolName(adapterToolName)
      || toolRegistry.resolveAdapterToolName(adapterToolName)
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
  const tools = overrides?.tools?.map((tool: any) => {
    const toolName = String(tool?.function?.name ?? '').trim()
    const manifest = toolRegistry.resolveAdapterToolName(toolName)
      ?? toolRegistry.list().find((candidate: { providerToolName: string }) =>
        candidate.providerToolName === toolName,
      )
    return {
      type: 'function',
      ...tool,
      function: {
        ...tool.function,
        parameters: tool.function?.parameters ?? manifest?.inputSchema ?? {
          type: 'object',
          additionalProperties: true,
        },
      },
    }
  })
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      {
        role: 'system',
        content: typedMemoryContextBlock,
      },
      { role: 'user', content: '你好' },
    ],
    waitForTools: true,
    toolChoice: undefined,
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    hasVisualGrounding: false,
    governance: {
      decisionTraceId: 'trace-1',
      turnMode: 'answer',
      truthState: 'grounded',
      liveSurface: 'grounded-scene',
      answerAct: 'answer',
      answerEvidenceMode: 'observed',
      personaKernelMode: 'full',
    },
    runtimeSurface: {} as any,
    sessionTrace: {} as any,
    getSessionTrace: () => ({ phaseOrder: [], history: [] }) as any,
    ...overrides,
    tools,
    toolRegistry,
  } as any
}

function createVisibleReplyExecution(overrides?: Partial<any>) {
  return {
    mode: 'provider-stream',
    expectedVisibleReplyAuthority: 'llm-mind',
    actualVisibleReplyAuthority: 'llm-mind',
    providerMindExecuted: true,
    reason: 'provider-stream',
    ...overrides,
  }
}

function createStreamMetaController() {
  let lastReply = ''
  return {
    emit: vi.fn((reply: string) => {
      lastReply = reply.trim()
    }),
    getLastReply: () => lastReply,
  }
}

function createProviderResponsePayload(overrides?: {
  workingMemoryVersion?: string | null
  longTermEvidenceIds?: string[]
  reply?: string
  [key: string]: unknown
}) {
  const {
    workingMemoryVersion,
    longTermEvidenceIds,
    ...payloadOverrides
  } = overrides ?? {}
  const performanceOverrides = payloadOverrides.performance
    && typeof payloadOverrides.performance === 'object'
    && !Array.isArray(payloadOverrides.performance)
    ? payloadOverrides.performance as Record<string, unknown>
    : {}
  const memoryUsageOverrides = payloadOverrides.memoryUsage
    && typeof payloadOverrides.memoryUsage === 'object'
    && !Array.isArray(payloadOverrides.memoryUsage)
    ? payloadOverrides.memoryUsage as Record<string, unknown>
    : {}
  const baseEmotion = typeof payloadOverrides.emotion === 'string'
    ? payloadOverrides.emotion
    : 'neutral'

  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'obligation=answer; truth=grounded; focus=current-turn; move=answer-directly; tone=direct',
    emotion: 'neutral',
    reply: payloadOverrides.reply ?? '通过校验的模型回复',
    ...payloadOverrides,
    performance: {
      baseEmotion,
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
      ...performanceOverrides,
    },
    memoryUsage: {
      workingMemoryVersion: workingMemoryVersion ?? 'working-memory-owner-context-v1',
      longTermEvidenceIds: longTermEvidenceIds ?? ['memory-1'],
      ...memoryUsageOverrides,
    },
  })
}

function createProviderMemoryContext() {
  return {
    version: 'alicization-main-chat-memory-context-v1',
    workingMemory: {
      version: 'working-memory-owner-context-v1',
    },
    longTermRecall: null,
    availableLongTermEvidenceIds: ['memory-1'],
    providerSystemBlock: '{}',
  }
}

function createObservedRealization(
  visibleText: string,
  mode: 'provider-stream' | 'provider-one-shot' = 'provider-stream',
) {
  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: 'llm-mind',
    providerMindExecuted: true,
    mode,
    visibleText,
    visibleReplyValidationStatus: 'approved',
    nonHumanAuthoredStatus: null,
    blockedReasons: [],
    critic: null,
    closure: null,
  } as const
}

afterEach(() => {
  vi.useRealTimers()
})

describe('main chat stream runner', () => {
  it('passes the compressed WorkingMemory context into the actual Provider stream request', async () => {
    const compressedSummary = '用户正在继续验证压缩后的记忆闭环。'
    const providerText = createProviderResponsePayload({
      reply: compressedSummary,
    })
    const providerMessages: Message[] = []
    let readCount = 0
    const prepared = createPrepared({
      messages: [{
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-turn-memory-context',
          version: 'alicization-main-chat-memory-context-v1',
          workingMemory: {
            version: 'working-memory-owner-context-v1',
            owner: 'WorkingMemory',
            compressedTimeline: [{
              summary: compressedSummary,
              sourceTurnIds: ['turn-compressed:user', 'turn-compressed:alice'],
            }],
          },
          longTermRecall: null,
        }),
      }, { role: 'user', content: '继续刚才的记忆线。' }],
    })

    const result = await runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        providerId: 'openai-compatible',
        turnId: 'turn-provider-compressed-memory',
      } as any,
      prepared,
      messages: prepared.messages,
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: vi.fn(),
      streamTextImpl: (input: Record<string, unknown>) => {
        providerMessages.push(...(input.messages as Message[]))
        return {
          fullStream: {
            getReader: () => ({
              read: vi.fn(async () => {
                readCount += 1
                if (readCount === 1)
                  return { done: false, value: { type: 'text-delta', text: providerText } }
                return { done: false, value: { type: 'finish', finishReason: 'stop' } }
              }),
              cancel: vi.fn(async () => {}),
              releaseLock: vi.fn(),
            }),
          },
        }
      },
    })

    expect(result).toMatchObject({
      kind: 'reply',
      fullText: providerText,
    })
    expect(providerMessages.map(message => String(message.content)).join('\n'))
      .toContain(compressedSummary)
  })

  it('completes immediately when fullStream emits finish without closing', async () => {
    const providerText = createProviderResponsePayload({
      reply: 'finish 已经足以结束 Provider step。',
    })
    const controller = new AbortController()
    let readCount = 0

    const pending = runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-finish-without-eof',
      } as any,
      prepared: createPrepared(),
      messages: [],
      controller,
      firstEventTimeoutMs: 500,
      providerReaderCancelTimeoutMs: 5,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: vi.fn(),
      streamTextImpl: () => ({
        fullStream: {
          getReader: () => ({
            read: vi.fn(async () => {
              readCount += 1
              if (readCount === 1) {
                return {
                  done: false,
                  value: {
                    type: 'text-delta',
                    text: providerText,
                  },
                }
              }
              if (readCount === 2) {
                return {
                  done: false,
                  value: {
                    type: 'finish',
                    finishReason: 'stop',
                  },
                }
              }
              return await new Promise<{ done: boolean }>(() => {})
            }),
            cancel: vi.fn(async () => {}),
            releaseLock: vi.fn(),
          }),
        },
      }),
    })

    const outcome = await Promise.race([
      pending,
      new Promise<'still-pending'>(resolve =>
        setTimeout(() => resolve('still-pending'), 20),
      ),
    ])
    if (outcome === 'still-pending') {
      controller.abort('test cleanup')
      await pending.catch(() => {})
    }

    expect(outcome).toMatchObject({
      kind: 'reply',
      finishReason: 'stop',
      fullText: providerText,
    })
    expect(readCount).toBe(2)
  })

  it('clears the first-event watchdog after the first Provider progress event', async () => {
    vi.useFakeTimers()
    const providerText = createProviderResponsePayload({
      reply: '长回复没有被首事件超时误杀。',
    })
    let readCount = 0

    const pending = runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-first-progress-clears-watchdog',
      } as any,
      prepared: createPrepared(),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 20,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: vi.fn(),
      streamTextImpl: () => ({
        fullStream: {
          getReader: () => ({
            read: vi.fn(async () => {
              readCount += 1
              if (readCount === 1) {
                await new Promise(resolve => setTimeout(resolve, 5))
                return {
                  done: false,
                  value: {
                    type: 'text-delta',
                    text: providerText,
                  },
                }
              }
              if (readCount === 2) {
                await new Promise(resolve => setTimeout(resolve, 45))
                return {
                  done: false,
                  value: {
                    type: 'finish',
                    finishReason: 'stop',
                  },
                }
              }
              return { done: true }
            }),
            cancel: vi.fn(async () => {}),
            releaseLock: vi.fn(),
          }),
        },
      }),
    })

    await vi.advanceTimersByTimeAsync(50)

    await expect(pending).resolves.toMatchObject({
      kind: 'reply',
      finishReason: 'stop',
      fullText: providerText,
    })
  })

  it('fails transparently when fullStream reaches EOF without a finish event', async () => {
    const providerText = createProviderResponsePayload({
      reply: '这段文本不应被当成完整回复。',
    })

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-finish-missing',
      } as any,
      prepared: createPrepared(),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: vi.fn(),
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'text-delta',
              text: providerText,
            })
            controller.close()
          },
        }),
      }),
    })).rejects.toMatchObject({
      code: 'chat-provider-finish-missing',
      message: expect.stringContaining('chat-provider-finish-missing'),
    })
  })

  it('disposes the failed reader before starting a Provider retry', async () => {
    const providerText = createProviderResponsePayload({
      reply: '清理旧流后重试成功。',
    })
    const lifecycle: string[] = []
    const streamTextImpl = vi.fn()
      .mockImplementationOnce(() => ({
        fullStream: {
          getReader: () => ({
            read: vi.fn(async () => {
              throw Object.assign(new Error('temporary provider failure'), {
                status: 503,
              })
            }),
            cancel: vi.fn(async () => {
              lifecycle.push('cancel-attempt-1')
            }),
            releaseLock: vi.fn(() => {
              lifecycle.push('release-attempt-1')
            }),
          }),
        },
      }))
      .mockImplementationOnce(() => {
        lifecycle.push('start-attempt-2')
        return {
          fullStream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: 'text-delta', text: providerText })
              controller.enqueue({ type: 'finish', finishReason: 'stop' })
              controller.close()
            },
          }),
        }
      })

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-retry-disposes-reader',
      } as any,
      prepared: createPrepared(),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: vi.fn(),
      streamTextImpl,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
        sleep: vi.fn(async () => {}),
      },
    })).resolves.toMatchObject({
      kind: 'reply',
      fullText: providerText,
    })

    expect(lifecycle).toEqual([
      'cancel-attempt-1',
      'release-attempt-1',
      'start-attempt-2',
    ])
  })

  it('bounds reader cancellation before retrying a failed Provider attempt', async () => {
    vi.useFakeTimers()
    const providerText = createProviderResponsePayload({
      reply: '有界清理后重试成功。',
    })
    const streamTextImpl = vi.fn()
      .mockImplementationOnce(() => ({
        fullStream: {
          getReader: () => ({
            read: vi.fn(async () => {
              throw Object.assign(new Error('temporary provider failure'), {
                status: 503,
              })
            }),
            cancel: vi.fn(() => new Promise<void>(() => {})),
            releaseLock: vi.fn(),
          }),
        },
      }))
      .mockImplementationOnce(() => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', text: providerText })
            controller.enqueue({ type: 'finish', finishReason: 'stop' })
            controller.close()
          },
        }),
      }))

    const pending = runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-bounded-reader-cancel',
      } as any,
      prepared: createPrepared(),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      providerReaderCancelTimeoutMs: 10,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: vi.fn(),
      streamTextImpl,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
        sleep: vi.fn(async () => {}),
      },
    })

    await vi.advanceTimersByTimeAsync(9)
    expect(streamTextImpl).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)

    await expect(pending).resolves.toMatchObject({
      kind: 'reply',
      fullText: providerText,
    })
    expect(streamTextImpl).toHaveBeenCalledTimes(2)
  })

  it('disposes the reader when a derived Provider promise rejects early', async () => {
    let resolveRead: ((result: { done: boolean, value?: unknown }) => void) | undefined
    const cancel = vi.fn(async () => {
      resolveRead?.({ done: true })
    })
    const releaseLock = vi.fn()
    const derivedFailure = Object.assign(new Error('provider usage failed'), {
      status: 400,
    })

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-derived-promise-failure',
      } as any,
      prepared: createPrepared(),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: vi.fn(),
      streamTextImpl: () => ({
        fullStream: {
          getReader: () => ({
            read: vi.fn(() => new Promise<{ done: boolean, value?: unknown }>((resolve) => {
              resolveRead = resolve
            })),
            cancel,
            releaseLock,
          }),
        },
        usage: Promise.reject(derivedFailure),
      }),
    })).rejects.toBe(derivedFailure)

    expect(cancel).toHaveBeenCalledOnce()
    expect(releaseLock).toHaveBeenCalledOnce()
  })

  it('disables parallel tool calls in the Provider request', async () => {
    const streamTextImpl = vi.fn(() => ({
      fullStream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: 'tool-call',
            toolCallId: 'single-tool-call',
            toolName: 'inspect_state',
            arguments: {},
          })
          controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
          controller.close()
        },
      }),
    }))

    await runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-parallel-tools-disabled',
      } as any,
      prepared: createPrepared({
        tools: [{
          type: 'function',
          function: {
            name: 'inspect_state',
            parameters: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        }],
      }),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: vi.fn(),
      streamTextImpl,
    })

    expect(streamTextImpl).toHaveBeenCalledWith(expect.objectContaining({
      parallelToolCalls: false,
    }))
  })

  it.each([
    {
      label: 'malformed JSON',
      arguments: '{"path":',
    },
    {
      label: 'missing required arguments',
      arguments: undefined,
    },
  ])('rejects $label instead of executing a tool with empty arguments', async ({
    arguments: toolArguments,
  }) => {
    const emitToolCall = vi.fn()

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-invalid-tool-arguments',
      } as any,
      prepared: createPrepared({
        tools: [{
          type: 'function',
          function: {
            name: 'read_file',
            parameters: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                },
              },
              required: ['path'],
              additionalProperties: false,
            },
          },
        }],
      }),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall,
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'invalid-tool-call',
              toolName: 'read_file',
              ...(toolArguments === undefined
                ? {}
                : { arguments: toolArguments }),
            })
            controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
            controller.close()
          },
        }),
      }),
    })).rejects.toMatchObject({
      code: 'chat-provider-tool-arguments-invalid',
    })
    expect(emitToolCall).not.toHaveBeenCalled()
  })

  it('rejects JSON-object tool arguments that violate the declared schema', async () => {
    const emitToolCall = vi.fn()

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-schema-invalid-tool-arguments',
      } as any,
      prepared: createPrepared({
        tools: [{
          type: 'function',
          function: {
            name: 'read_file',
            parameters: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                },
              },
              required: ['path'],
              additionalProperties: false,
            },
          },
        }],
      }),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall,
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'schema-invalid-tool-call',
              toolName: 'read_file',
              arguments: {
                path: 42,
              },
            })
            controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
            controller.close()
          },
        }),
      }),
    })).rejects.toMatchObject({
      code: 'chat-provider-tool-arguments-invalid',
      message: expect.stringContaining('read_file'),
    })
    expect(emitToolCall).not.toHaveBeenCalled()
  })

  it('accepts omitted arguments only for an explicitly parameterless tool', async () => {
    const emitToolCall = vi.fn()

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-parameterless-tool',
      } as any,
      prepared: createPrepared({
        tools: [{
          type: 'function',
          function: {
            name: 'inspect_state',
            parameters: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        }],
      }),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall,
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'parameterless-tool-call',
              toolName: 'inspect_state',
            })
            controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
            controller.close()
          },
        }),
      }),
    })).resolves.toMatchObject({
      kind: 'action',
      action: {
        toolCallId: 'parameterless-tool-call',
        capabilityId: 'test.inspect_state',
        providerToolName: 'inspect_state',
        input: {},
      },
    })
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      arguments: {},
    }))
  })

  it('keeps the Provider alias in continuation while returning a canonical action identity', async () => {
    const messages: any[] = []
    const emitToolCall = vi.fn()

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-canonical-tool',
      } as any,
      prepared: createPrepared({
        toolRegistry: createCanonicalToolRegistry(),
        tools: [{
          type: 'function',
          function: {
            name: 'coding_agent',
            parameters: {
              type: 'object',
              properties: {
                agent: {
                  type: 'string',
                  const: 'codex',
                },
                prompt: {
                  type: 'string',
                },
              },
              required: ['agent', 'prompt'],
              additionalProperties: false,
            },
          },
        }],
      }),
      messages,
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall,
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'canonical-tool-call',
              toolName: 'coding_agent',
              arguments: {
                agent: 'codex',
                prompt: 'inspect the repository',
              },
            })
            controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
            controller.close()
          },
        }),
      }),
    })).resolves.toMatchObject({
      kind: 'action',
      action: {
        providerToolName: 'coding_agent',
        capabilityId: 'coding_agent.codex',
        toolCallId: 'canonical-tool-call',
      },
    })
    expect(messages).toContainEqual(expect.objectContaining({
      role: 'assistant',
      tool_calls: [expect.objectContaining({
        function: expect.objectContaining({
          name: 'coding_agent',
        }),
      })],
    }))
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'coding_agent',
    }))
  })

  it.each([null, '', '   '])(
    'rejects an explicit invalid argument value %j for a parameterless tool',
    async (toolArguments) => {
      await expect(runAlicizationMainChatProviderStep({
        payload: {
          cardId: 'card-1',
          turnId: 'turn-provider-parameterless-tool-invalid-arguments',
        } as any,
        prepared: createPrepared({
          tools: [{
            type: 'function',
            function: {
              name: 'inspect_state',
              parameters: {
                type: 'object',
                properties: {},
                additionalProperties: false,
              },
            },
          }],
        }),
        messages: [],
        controller: new AbortController(),
        firstEventTimeoutMs: 500,
        isRunActive: () => true,
        nonProgressEventTypes: new Set<string>(),
        emitToolCall: vi.fn(),
        streamTextImpl: () => ({
          fullStream: new ReadableStream({
            start(controller) {
              controller.enqueue({
                type: 'tool-call',
                toolCallId: 'parameterless-tool-call-invalid',
                toolName: 'inspect_state',
                arguments: toolArguments,
              })
              controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
              controller.close()
            },
          }),
        }),
      })).rejects.toMatchObject({
        code: 'chat-provider-tool-arguments-invalid',
      })
    },
  )

  it('fails transparently when a Provider emits a second tool call in one step', async () => {
    const emitToolCall = vi.fn()

    await expect(runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-parallel-tool-violation',
      } as any,
      prepared: createPrepared({
        tools: ['first_tool', 'second_tool'].map(name => ({
          type: 'function',
          function: {
            name,
            parameters: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        })),
      }),
      messages: [],
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall,
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'parallel-tool-call-1',
              toolName: 'first_tool',
            })
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'parallel-tool-call-2',
              toolName: 'second_tool',
            })
            controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
            controller.close()
          },
        }),
      }),
    })).rejects.toMatchObject({
      code: 'chat-provider-parallel-tool-calls',
    })
    expect(emitToolCall).not.toHaveBeenCalled()
  })

  it('consumes the xsAI fullStream in order when the provider does not use onEvent', async () => {
    const providerText = createProviderResponsePayload({
      reply: '来自 fullStream 的回复。',
    })
    const streamTextImpl = vi.fn(() => ({
      fullStream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', text: providerText })
          controller.enqueue({ type: 'finish', finishReason: 'stop' })
          controller.close()
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-full-stream-only',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.finishReason).toBe('stop')
    expect(result.fullText).toBe(providerText)
    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('keeps canonical Provider tools when the prepared surface already uses Provider names', async () => {
    const providerText = createProviderResponsePayload({
      reply: 'canonical tool surface is available',
    })
    const streamTextImpl = vi.fn((input: Record<string, unknown>) => {
      expect(input.tools).toEqual(expect.arrayContaining([
        expect.objectContaining({
          function: expect.objectContaining({
            name: 'codex',
          }),
        }),
      ]))
      return {
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', text: providerText })
            controller.enqueue({ type: 'finish', finishReason: 'stop' })
            controller.close()
          },
        }),
      }
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-full-stream-canonical-provider-tool',
      } as any,
      prepared: createPrepared({
        tools: [{
          type: 'function',
          function: {
            name: 'codex',
            parameters: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
              },
              required: ['prompt'],
              additionalProperties: false,
            },
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.fullText).toBe(providerText)
  })

  it('rejects an unknown full-stream tool call before emitting a UI tool event', async () => {
    const emitToolCall = vi.fn()
    const streamTextImpl = vi.fn(() => ({
      fullStream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: 'tool-call',
            toolCallId: 'unknown-full-stream-tool-call',
            toolName: 'unknown_tool',
            arguments: {},
          })
          controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
          controller.close()
        },
      }),
    }))

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-full-stream-unknown-tool',
      } as any,
      prepared: createPrepared({
        tools: [{
          type: 'function',
          function: {
            name: 'codex',
            parameters: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
              },
              required: ['prompt'],
              additionalProperties: false,
            },
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall,
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })).rejects.toMatchObject({
      code: 'chat-provider-tool-arguments-invalid',
    })
    expect(emitToolCall).not.toHaveBeenCalled()
  })

  it('retries five transient Provider failures and succeeds on the sixth attempt', async () => {
    const providerText = createProviderResponsePayload({
      reply: 'Provider 恢复后完成了回复。',
    })
    const streamTextImpl = vi.fn()
      .mockImplementationOnce(() => {
        throw new Error('Remote sent 503 response: service temporarily unavailable')
      })
      .mockImplementationOnce(() => {
        throw Object.assign(new Error('rate limited'), { status: 429 })
      })
      .mockImplementationOnce(() => {
        throw Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })
      })
      .mockImplementationOnce(() => {
        throw Object.assign(new Error('upstream timeout'), { status: 504 })
      })
      .mockImplementationOnce(() => {
        throw Object.assign(new Error('service unavailable'), { status: 503 })
      })
      .mockImplementationOnce(() => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', text: providerText })
            controller.enqueue({ type: 'finish', finishReason: 'stop' })
            controller.close()
          },
        }),
      }))
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-transient-retry',
        providerId: 'openai-compatible',
        model: 'model-test',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
        sleep: vi.fn(async () => {}),
      },
    })

    expect(result.fullText).toBe(providerText)
    expect(streamTextImpl).toHaveBeenCalledTimes(6)
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.provider-retry-started',
      expect.objectContaining({
        providerId: 'openai-compatible',
        model: 'model-test',
        attempt: 5,
        maxRetries: 5,
      }),
    )
  })

  it('returns the original Provider failure after the sixth failed attempt', async () => {
    const terminalError = Object.assign(new Error('service unavailable after retries'), {
      status: 503,
    })
    const streamTextImpl = vi.fn().mockRejectedValue(terminalError)
    const appendRuntimeDebugLine = vi.fn(async () => {})

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-retry-exhausted',
        providerId: 'openai-compatible',
        model: 'model-test',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
        sleep: vi.fn(async () => {}),
      },
    })).rejects.toBe(terminalError)

    expect(streamTextImpl).toHaveBeenCalledTimes(6)
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.provider-retry-exhausted',
      expect.objectContaining({
        providerId: 'openai-compatible',
        model: 'model-test',
        attempt: 5,
        maxRetries: 5,
        status: 503,
        reason: 'retry-budget-exhausted',
      }),
    )
  })

  it('does not retry a transient Provider failure after visible progress has started', async () => {
    const streamTextImpl = vi.fn(() => ({
      fullStream: {
        getReader() {
          let readCount = 0
          return {
            async read() {
              readCount += 1
              if (readCount === 1) {
                return {
                  done: false,
                  value: {
                    type: 'text-delta',
                    text: createProviderResponsePayload({
                      reply: '已经开始输出。',
                    }),
                  },
                }
              }
              throw new Error('Remote sent 503 response after progress')
            },
            releaseLock: vi.fn(),
            cancel: vi.fn(async () => {}),
          }
        },
      },
    }))

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-failure-after-progress',
        providerId: 'openai-compatible',
        model: 'model-test',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
        sleep: vi.fn(async () => {}),
      },
    })).rejects.toThrow('Remote sent 503 response after progress')

    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('does not replay the Provider request after a tool call has started', async () => {
    const streamTextImpl = vi.fn(() => ({
      fullStream: {
        getReader() {
          let readCount = 0
          return {
            async read() {
              readCount += 1
              if (readCount === 1) {
                return {
                  done: false,
                  value: {
                    type: 'tool-call',
                    toolCallId: 'codex-side-effect-1',
                    toolName: 'codex',
                    arguments: {
                      prompt: '检查当前仓库',
                    },
                  },
                }
              }
              throw Object.assign(new Error('Provider failed after tool call'), {
                status: 503,
              })
            },
            releaseLock: vi.fn(),
            cancel: vi.fn(async () => {}),
          }
        },
      },
    }))

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-failure-after-tool-call',
        providerId: 'openai-compatible',
        model: 'model-test',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
        sleep: vi.fn(async () => {}),
      },
      streamTextImpl,
    })).rejects.toThrow('Provider failed after tool call')

    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('uses fullStream as the single event source when a compatibility onEvent also fires', async () => {
    const providerText = createProviderResponsePayload({
      reply: '只应消费一次。',
    })
    const streamTextImpl = vi.fn(({ onEvent }) => {
      void (onEvent as (event: unknown) => void)({
        type: 'text-delta',
        text: createProviderResponsePayload({
          reply: '不应重复消费。',
        }),
      })
      return {
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', text: providerText })
            controller.enqueue({ type: 'finish', finishReason: 'stop' })
            controller.close()
          },
        }),
      }
    })

    const emitChunk = vi.fn()
    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-full-stream-wins',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.fullText).toBe(providerText)
    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '只应消费一次。',
    }))
  })

  it('preserves an early compatibility tool-start event while waiting for fullStream', async () => {
    vi.useFakeTimers()
    const providerText = createProviderResponsePayload({
      reply: 'Codex 已经完成检查。',
    })
    const emitToolCall = vi.fn()
    const streamTextImpl = vi.fn(async ({ onEvent }) => {
      await (onEvent as (event: unknown) => Promise<void>)({
        type: 'tool-call-streaming-start',
        toolCallId: 'codex-early-start-1',
        toolName: 'codex',
      })
      return {
        fullStream: new ReadableStream({
          start(controller) {
            setTimeout(() => {
              try {
                controller.enqueue({
                  type: 'tool-call-streaming-start',
                  toolCallId: 'codex-early-start-1',
                  toolName: 'codex',
                })
                controller.enqueue({
                  type: 'tool-call',
                  toolCallId: 'codex-early-start-1',
                  toolName: 'codex',
                  arguments: {
                    prompt: '检查当前仓库',
                  },
                })
                controller.enqueue({
                  type: 'tool-result',
                  toolCallId: 'codex-early-start-1',
                  toolName: 'codex',
                  result: {
                    status: 'completed',
                  },
                })
                controller.enqueue({ type: 'text-delta', text: providerText })
                controller.enqueue({ type: 'finish', finishReason: 'stop' })
                controller.close()
              }
              catch {
                // The broken path aborts and cancels the stream first.
              }
            }, 1_200)
          },
        }),
      }
    })

    const pending = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-early-compat-tool-start',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall,
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })
    const settled = pending.then(
      result => result,
      error => error,
    )

    await vi.advanceTimersByTimeAsync(1_300)
    const result = await settled

    expect(result).toEqual(expect.objectContaining({
      fullText: providerText,
    }))
    expect(emitToolCall).toHaveBeenCalledOnce()
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'codex-early-start-1',
      toolName: 'codex',
    }))
  })

  it('keeps an async legacy onEvent source alive when the invoker resolves without a stream result', async () => {
    const providerText = createProviderResponsePayload({
      reply: '来自延迟 onEvent 的回复。',
    })
    const streamTextImpl = vi.fn(async ({ onEvent, abortSignal }) => {
      setTimeout(() => {
        if (!abortSignal?.aborted)
          void onEvent?.({ type: 'text-delta', text: providerText })
      }, 5)
      setTimeout(() => {
        if (!abortSignal?.aborted)
          void onEvent?.({ type: 'finish', finishReason: 'stop' })
      }, 10)
    })
    const emitChunk = vi.fn()

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-legacy-async-events',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 50,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.fullText).toBe(providerText)
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '来自延迟 onEvent 的回复。',
    }))
  })

  it('records provider and executor phases from the ordered fullStream', async () => {
    const appendRuntimeDebugLine = vi.fn(async (
      _event: string,
      _payload: Record<string, unknown>,
    ) => {})
    const providerText = createProviderResponsePayload({
      reply: 'Codex 的结果已经回到对话里。',
    })
    const streamTextImpl = vi.fn(() => ({
      fullStream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: 'tool-call-streaming-start',
            toolCallId: 'codex-call-1',
            toolName: 'codex',
          })
          controller.enqueue({
            type: 'tool-call',
            toolCallId: 'codex-call-1',
            toolName: 'codex',
            arguments: {
              prompt: '检查当前仓库',
            },
          })
          controller.enqueue({
            type: 'tool-result',
            toolCallId: 'codex-call-1',
            toolName: 'codex',
            result: {
              status: 'completed',
              summary: '检查完成',
            },
          })
          controller.enqueue({ type: 'text-delta', text: providerText })
          controller.enqueue({ type: 'finish', finishReason: 'stop' })
          controller.close()
        },
      }),
    }))

    await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-full-stream-phases',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 40,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl,
      providerRetryPolicy: {
        maxRetries: 0,
      },
    })

    const debugEvents = appendRuntimeDebugLine.mock.calls
      .map(([event]) => event)
    expect(debugEvents).toEqual(expect.arrayContaining([
      'chat-stream.request-started',
      'chat-stream.first-event',
      'chat-stream.tool-argument-started',
      'chat-stream.tool-execution-started',
      'chat-stream.tool-execution-completed',
      'chat-stream.provider-finished',
    ]))
    expect(debugEvents.indexOf('chat-stream.request-started'))
      .toBeLessThan(debugEvents.indexOf('chat-stream.first-event'))
    expect(debugEvents.indexOf('chat-stream.first-event'))
      .toBeLessThan(debugEvents.indexOf('chat-stream.tool-argument-started'))
    expect(debugEvents.indexOf('chat-stream.tool-argument-started'))
      .toBeLessThan(debugEvents.indexOf('chat-stream.tool-execution-completed'))
    expect(debugEvents.indexOf('chat-stream.provider-finished'))
      .toBeGreaterThan(debugEvents.indexOf('chat-stream.tool-execution-completed'))
  })

  it('does not shrink the available tool registry after a zero-event timeout', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const appendRuntimeDebugLine = vi.fn(async () => {})
    const providerAttemptAborted = vi.fn()
    const streamTextImpl = vi.fn(({ abortSignal }) => new Promise((_resolve, reject) => {
      ;(abortSignal as AbortSignal).addEventListener('abort', () => {
        providerAttemptAborted()
        reject((abortSignal as AbortSignal).reason)
      }, { once: true })
    }))
    const pending = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-full-tool-registry-timeout',
        providerId: 'openai-compatible',
      } as any,
      prepared: createPrepared({
        tools: [
          {
            function: {
              name: 'codex',
            },
          },
          {
            function: {
              name: 'browser_click_element',
            },
          },
          {
            function: {
              name: 'filesystem_patch_file',
            },
          },
          {
            function: {
              name: 'mcp_call_tool',
            },
          },
        ],
      }),
      controller,
      firstEventTimeoutMs: 25,
      providerContinuationTimeoutMs: 60,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl,
      providerRetryPolicy: {
        maxRetries: 0,
      },
    })
    const settled = pending.catch(error => error)

    await vi.advanceTimersByTimeAsync(50)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })
    expect(providerAttemptAborted).toHaveBeenCalledOnce()
    expect(controller.signal.aborted).toBe(false)
    expect(streamTextImpl).toHaveBeenCalledOnce()
    const firstStreamTextCall = streamTextImpl.mock.calls[0]
    if (!firstStreamTextCall)
      throw new Error('expected the first streamText call')
    expect((firstStreamTextCall[0] as any).tools.map((tool: any) => tool.function.name)).toEqual([
      'codex',
      'browser_click_element',
      'filesystem_patch_file',
    ])
    expect(appendRuntimeDebugLine).not.toHaveBeenCalledWith(
      'chat-stream.compact-tool-retry-started',
      expect.anything(),
    )
  })

  it('does not compact-retry after a provider emits only non-progress metadata', async () => {
    vi.useFakeTimers()
    const appendRuntimeDebugLine = vi.fn(async (
      _event: string,
      _payload: Record<string, unknown>,
    ) => {})
    const streamTextImpl = vi.fn(async ({ onEvent }) => {
      await (onEvent as (event: unknown) => Promise<void>)({
        type: 'response-metadata',
      })
    })
    const pending = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-no-compact-after-progress',
        providerId: 'openai-compatible',
      } as any,
      prepared: createPrepared({
        tools: [
          { function: { name: 'codex' } },
          { function: { name: 'browser_click_element' } },
          { function: { name: 'mcp_call_tool' } },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl,
      providerRetryPolicy: {
        maxRetries: 0,
      },
    })
    const settled = pending.catch(error => error)

    await vi.advanceTimersByTimeAsync(1_025)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })
    expect(streamTextImpl).toHaveBeenCalledOnce()
    expect(appendRuntimeDebugLine).not.toHaveBeenCalledWith(
      'chat-stream.compact-tool-retry-started',
      expect.anything(),
    )
  })

  it('does not retry when the user aborts the outer turn', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const streamTextImpl = vi.fn(({ abortSignal }) => new Promise((_resolve, reject) => {
      const signal = abortSignal as AbortSignal
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    }))
    const pending = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-user-aborted',
        providerId: 'openai-compatible',
      } as any,
      prepared: createPrepared({
        tools: [
          { function: { name: 'codex' } },
          { function: { name: 'browser_click_element' } },
          { function: { name: 'mcp_call_tool' } },
        ],
      }),
      controller,
      firstEventTimeoutMs: 25,
      providerContinuationTimeoutMs: 60,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      appendRuntimeDebugLine: vi.fn(async (
        _event: string,
        _payload: Record<string, unknown>,
      ) => {}),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })
    const settled = pending.catch(error => error)

    controller.abort(new DOMException('user cancelled', 'AbortError'))

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
      message: 'user cancelled',
    })
    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('streams with the typed memory context unchanged', async () => {
    const providerText = createProviderResponsePayload({
      reply: '我记得我们刚才谈到这里。',
    })
    const streamTextImpl = vi.fn(async ({ messages, onEvent }) => {
      expect(messages).toEqual([
        {
          role: 'system',
          content: JSON.stringify({
            type: 'alicization-turn-memory-context',
            version: 'alicization-main-chat-memory-context-v1',
            workingMemory: {
              version: 'working-memory-owner-context-v1',
              owner: 'working-memory',
            },
            longTermRecall: {
              evidenceIds: ['memory-1'],
            },
          }),
        },
        { role: 'user', content: '你好' },
      ])

      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text-delta', text: providerText })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-memory-context-only',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: JSON.stringify({
              type: 'alicization-turn-memory-context',
              version: 'alicization-main-chat-memory-context-v1',
              workingMemory: {
                version: 'working-memory-owner-context-v1',
                owner: 'working-memory',
              },
              longTermRecall: {
                evidenceIds: ['memory-1'],
              },
            }),
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.finishReason).toBe('stop')
    expect(JSON.parse(result.fullText).reply).toBe('我记得我们刚才谈到这里。')
    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('does not force native response schema or convert emotional state into provider prose', async () => {
    const emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'nearby-soft',
      valence: 0.62,
      arousal: 0.28,
      guardedness: 0.44,
      closenessDrive: 0.53,
      repairNeed: 0.31,
      initiativePressure: 0.24,
      reasonTags: ['stream-provider', 'continuity-authority'],
      why: 'keep the stream provider on the same emotion-memory-initiative-embodiment authority line',
    }
    const streamTextImpl = vi.fn(async ({ messages, onEvent, responseFormat }) => {
      const systemText = ((messages as Array<{ role?: string, content?: unknown }> | undefined) ?? [])
        .filter(message => message.role === 'system')
        .map(message => typeof message.content === 'string' ? message.content : '')
        .join('\n')

      expect(responseFormat).toBeUndefined()
      expect(systemText).not.toContain('[ALICIZATION_EMOTIONAL_KERNEL]')
      expect(systemText).not.toContain('emotional_kernel_')
      expect(JSON.stringify(messages)).not.toMatch(
        /Return ONLY one strict JSON|Output contract|must-follow|Response contract/iu,
      )

      const emit = onEvent as (event: any) => Promise<void>
      await emit({
        type: 'text-delta',
        text: createProviderResponsePayload({
          emotion: 'thinking',
          reply: '我会沿着同一份内在状态继续。',
        }),
      })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-emotional-kernel',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              emotionalKernel,
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.finishReason).toBe('stop')
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '我会沿着同一份内在状态继续。',
    }))
    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('omits native response schema so providers without json_schema support can stream plain text', async () => {
    const emitChunk = vi.fn()
    const streamTextImpl = vi.fn(async ({ onEvent, responseFormat }) => {
      expect(responseFormat).toBeUndefined()
      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text-delta', text: '我可以直接这样回答。' })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-plain-provider',
      } as any,
      prepared: createPrepared({
        chatConfig: {
          model: 'test-model',
        },
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.fullText).toBe('我可以直接这样回答。')
    expect(result.visibleReplyRealization.visibleText).toBe('我可以直接这样回答。')
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '我可以直接这样回答。',
      origin: 'provider',
    }))
  })

  it('sends portable non-strict tools to OpenAI-compatible gateways', async () => {
    const streamTextImpl = vi.fn(async ({ tools, onEvent }) => {
      expect(tools).toEqual([
        expect.objectContaining({
          execute: expect.any(Function),
          function: expect.objectContaining({
            name: 'sample_tool',
            strict: false,
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                },
              },
              additionalProperties: false,
            },
          }),
        }),
      ])
      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text-delta', text: '工具协议已兼容。' })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-portable-tools',
        providerId: 'openai-compatible',
      } as any,
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '你好' },
        ],
        tools: [{
          type: 'function',
          execute: vi.fn(),
          function: {
            name: 'sample_tool',
            description: 'Sample tool',
            strict: true,
            parameters: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  format: 'uri',
                },
              },
              additionalProperties: false,
            },
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('collects provider text from compatible delta event shapes instead of ending with an empty settlement', async () => {
    const emitChunk = vi.fn()
    const streamTextImpl = vi.fn(async ({ onEvent }) => {
      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text_delta', delta: '你好，' })
      await emit({ type: 'content-delta', content: '我在这里。' })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-delta-compatible-provider',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.fullText).toBe('你好，我在这里。')
    expect(result.visibleReplyRealization.visibleText).toBe('你好，我在这里。')
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '你好，我在这里。',
      origin: 'provider',
    }))
  })

  it('keeps provider text provisional until the complete response passes settlement', async () => {
    const emitChunk = vi.fn()
    const fullText = createProviderResponsePayload()
    const splitAt = Math.floor(fullText.length / 2)
    const streamTextImpl = vi.fn(async ({ onEvent }) => {
      await onEvent({ type: 'text-delta', text: fullText.slice(0, splitAt) })
      expect(emitChunk).not.toHaveBeenCalled()
      await onEvent({ type: 'text-delta', text: fullText.slice(splitAt) })
      expect(emitChunk).not.toHaveBeenCalled()
      await onEvent({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-settlement',
      } as any,
      prepared: createPrepared({
        memoryContext: createProviderMemoryContext(),
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-provider-settlement',
      text: '通过校验的模型回复',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    }))
    expect(result).toEqual(expect.objectContaining({
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    }))
  })

  it('rejects provider memory claims that reference unavailable long-term evidence', async () => {
    const emitChunk = vi.fn()
    const fullText = createProviderResponsePayload({
      longTermEvidenceIds: ['memory-not-provided'],
    })
    const streamTextImpl = vi.fn(async ({ onEvent }) => {
      await onEvent({ type: 'text-delta', text: fullText })
      await onEvent({ type: 'finish', finishReason: 'stop' })
    })

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-memory-invalid',
      } as any,
      prepared: createPrepared({
        memoryContext: createProviderMemoryContext(),
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })).rejects.toThrow('provider-memory-usage-invalid')

    expect(emitChunk).not.toHaveBeenCalled()
  })

  it('uses the visual grounding one-shot path when capture grounding is required', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const controller = new AbortController()
    const streamTextImpl = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: createProviderResponsePayload({ reply: '我先看着这个窗口。' }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '看看屏幕。' },
        ],
      }),
      headers: {
        authorization: 'Bearer test',
      },
      controller,
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl,
    })

    const parsed = JSON.parse(result.fullText) as {
      format?: string
      reply?: string
    }

    expect(result.finishReason).toBe('stop')
    expect(result.visibleReplyExecution).toEqual(createVisibleReplyExecution({
      mode: 'provider-one-shot',
      reason: 'visual-grounding-one-shot',
    }))
    expect(parsed.format).toBe('mind-turn-v1')
    expect(parsed.reply).toBe('我先看着这个窗口。')
    expect(generateNonStreaming).toHaveBeenCalledOnce()
    expect(generateNonStreaming).toHaveBeenCalledWith(expect.objectContaining({
      abortSignal: controller.signal,
    }))
    expect(streamTextImpl).not.toHaveBeenCalled()
    expect(incrementChunkStats).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-1',
      text: '我先看着这个窗口。',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })
    expect(result).toEqual(expect.objectContaining({
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    }))
  })

  it('projects internal coding-agent adapter names before visual one-shot Provider invocation', async () => {
    const prepared = createPrepared({
      hasVisualGrounding: true,
      tools: [
        {
          type: 'function',
          function: {
            name: 'executor_run_coding_agent',
            parameters: {
              type: 'object',
              properties: {
                agent: {
                  type: 'string',
                  enum: ['codex', 'claude-code', 'cli'],
                },
                prompt: {
                  type: 'string',
                },
              },
              required: ['agent', 'prompt'],
              additionalProperties: false,
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'executor_run_codex',
            parameters: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                },
              },
              required: ['prompt'],
              additionalProperties: false,
            },
          },
        },
      ],
    })
    let providerTools: any[] | undefined
    const generateNonStreaming = vi.fn(async (input: any) => {
      providerTools = input.tools
      return {
        finishReason: 'stop',
        fullText: createProviderResponsePayload({
          reply: '视觉链路使用 canonical 工具名。',
        }),
      }
    })

    await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-canonical-provider-tools',
      } as any,
      prepared,
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    expect(generateNonStreaming).toHaveBeenCalledOnce()
    expect(providerTools?.map(tool => tool.function.name)).toEqual([
      'coding_agent',
      'codex',
    ])
    expect(providerTools).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        function: expect.objectContaining({
          name: expect.stringMatching(/^executor_run_/),
        }),
      }),
    ]))
    expect(prepared.tools.map((tool: any) => tool.function.name)).toEqual([
      'executor_run_coding_agent',
      'executor_run_codex',
    ])
  })

  it('accepts plain-text visual grounding output as provider-authored visible reply', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-structured-host-visible',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '看看屏幕。' },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'identity-continuity',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    expect(result.fullText).toBe('我先看着这个窗口。')
    expect(result.visibleReplyExecution).toEqual(createVisibleReplyExecution({
      mode: 'provider-one-shot',
      reason: 'visual-grounding-one-shot',
    }))
    expect(result.visibleReplyRealization.visibleText).toBe('我先看着这个窗口。')
    expect(generateNonStreaming).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '我先看着这个窗口。',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
    }))
    expect(incrementChunkStats).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我先看着这个窗口。')
  })

  it('keeps visual one-shot Provider JSON byte-for-byte and carries settlement only as a sidecar', async () => {
    const rawFullText = `{
  "memoryUsage": {
    "longTermEvidenceIds": [],
    "workingMemoryVersion": "working-memory-owner-context-v1"
  },
  "performance": {
    "emphasis": 1,
    "delivery": "firm",
    "actionCue": null,
    "facialCue": null,
    "baseEmotion": "thinking"
  },
  "reply": "  视觉原样回答。  ",
  "emotion": "thinking",
  "thought": "keep visual provider bytes",
  "format": "mind-turn-v1"
}`
    const visibleReplyRealization = createObservedRealization(
      '  视觉原样回答。  ',
      'provider-one-shot',
    )
    const settleStructuredVisibleReply = vi.fn(async input => ({
      ...input,
      fullText: createProviderResponsePayload({
        reply: 'settlement must not replace the Provider reply',
      }),
      visibleReplyRealization,
    }))
    const emitChunk = vi.fn()

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-byte-preservation',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        memoryContext: createProviderMemoryContext(),
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(async () => ({
        finishReason: 'stop',
        fullText: rawFullText,
      })),
      settleStructuredVisibleReply,
      streamTextImpl: vi.fn(),
    })

    expect(result.fullText).toBe(rawFullText)
    expect(Object.keys(JSON.parse(result.fullText))).toEqual([
      'memoryUsage',
      'performance',
      'reply',
      'emotion',
      'thought',
      'format',
    ])
    expect(JSON.parse(result.fullText)).not.toHaveProperty('visibleReplyRealization')
    expect(result.visibleReplyRealization).toMatchObject(visibleReplyRealization)
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '  视觉原样回答。  ',
    }))
  })

  it('keeps provider-stream JSON byte-for-byte, emits payload.reply, and settles lifecycle from the sidecar', async () => {
    const rawFullText = `{
  "format": "mind-turn-v1",
  "thought": "keep stream provider bytes",
  "emotion": "neutral",
  "reply": "  流式原样回答。  ",
  "performance": {
    "baseEmotion": "neutral",
    "facialCue": null,
    "actionCue": null,
    "delivery": "calm",
    "emphasis": 0
  },
  "memoryUsage": {
    "workingMemoryVersion": "working-memory-owner-context-v1",
    "longTermEvidenceIds": ["memory-1"]
  }
}`
    const visibleReplyRealization = createObservedRealization('  流式原样回答。  ')
    const settleStructuredVisibleReply = vi.fn(async input => ({
      ...input,
      fullText: createProviderResponsePayload({
        reply: 'settlement must not replace the streamed Provider reply',
      }),
      visibleReplyRealization,
    }))
    const turnRuntime = createAlicizationTurnRuntime({
      now: () => 1000,
    })
    const turnRuntimeContext = turnRuntime.beginTurn({
      cardId: 'card-1',
      turnId: 'turn-stream-byte-preservation',
      governance: {
        decisionTraceId: 'trace-stream-byte-preservation',
      },
    })
    const emitChunk = vi.fn()

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-byte-preservation',
      } as any,
      prepared: createPrepared({
        memoryContext: createProviderMemoryContext(),
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      settleStructuredVisibleReply,
      delayVisibleRelease: true,
      turnRuntimeContext,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: rawFullText.slice(0, 80) })
        await emit({ type: 'text-delta', text: rawFullText.slice(80) })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result.fullText).toBe(rawFullText)
    expect(JSON.parse(result.fullText)).not.toHaveProperty('visibleReplyRealization')
    expect(result.visibleReplyRealization).toMatchObject(visibleReplyRealization)
    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '  流式原样回答。  ',
    }))
    expect(turnRuntimeContext.stageSettlements.find(item => item.stage === 'surface')).toMatchObject({
      status: 'completed',
    })
    expect(turnRuntimeContext.stageSettlements.find(item => item.stage === 'delivery')).toMatchObject({
      status: 'completed',
    })
  })

  it('ignores optional Provider metadata fields and releases the provider-stream reply', async () => {
    const emitChunk = vi.fn()
    const fullText = createProviderResponsePayload({
      reply: '不应释放。',
      parsePath: 'json',
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-extra-field',
      } as any,
      prepared: createPrepared({
        memoryContext: createProviderMemoryContext(),
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: fullText })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result.fullText).toBe(fullText)
    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '不应释放。',
    }))
  })

  it('streams deltas, waits through tool-calls finishes, and records reminder debug signals', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const emitToolCall = vi.fn()
    const emitToolResult = vi.fn()
    const logReminderToolCall = vi.fn()
    const logReminderToolResult = vi.fn()
    const nonProgressEventTypes = new Set<string>()
    const providerText = createProviderResponsePayload({ reply: '你好。' })
    const splitAt = Math.floor(providerText.length / 2)

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-2',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'set_reminder',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall,
      emitToolResult,
      streamMeta,
      nonProgressEventTypes,
      generateNonStreaming: vi.fn(),
      logReminderToolCall,
      logReminderToolResult,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'provider-keepalive' })
        await emit({ type: 'text-delta', text: providerText.slice(0, splitAt) })
        await emit({
          type: 'tool-call',
          name: 'set_reminder',
          toolCallId: 'call-1',
          arguments: {
            message: '喝水',
            minutes: 5,
          },
        })
        await emit({
          type: 'tool-result',
          toolCallId: 'call-1',
          result: {
            status: 'scheduled',
            triggerAt: 123456,
            message: '5分钟后提醒',
          },
        })
        await emit({ type: 'text-delta', text: providerText.slice(splitAt) })
        await emit({ type: 'finish', finishReason: 'tool_calls' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '你好。',
    }))
    expect([...nonProgressEventTypes]).toEqual(['provider-keepalive'])
    expect(incrementChunkStats).toHaveBeenCalledOnce()
    expect(incrementChunkStats).toHaveBeenCalledWith('你好。')
    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-2',
      text: '你好。',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })
    expect(streamMeta.emit).toHaveBeenCalledTimes(1)
    expect(streamMeta.emit).toHaveBeenCalledWith('你好。')
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      toolName: 'set_reminder',
    }))
    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      result: expect.objectContaining({
        status: 'scheduled',
      }),
    }))
    expect(logReminderToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      toolName: 'set_reminder',
    }))
    expect(logReminderToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      summary: expect.objectContaining({
        status: 'scheduled',
        triggerAt: 123456,
      }),
    }))
  })

  it('parses xsAI tool-call args into renderer arguments and reminder diagnostics', async () => {
    const emitToolCall = vi.fn()
    const logReminderToolCall = vi.fn()
    const providerText = createProviderResponsePayload({ reply: '提醒已经设置。' })

    await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-xsai-tool-args',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'set_reminder',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall,
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      logReminderToolCall,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({
          type: 'tool-call',
          toolCallId: 'call-xsai-args',
          toolName: 'set_reminder',
          args: JSON.stringify({
            message: '喝水',
            minutes: 5,
          }),
        })
        await emit({
          type: 'tool-result',
          toolCallId: 'call-xsai-args',
          toolName: 'set_reminder',
          result: JSON.stringify({
            status: 'scheduled',
          }),
        })
        await emit({ type: 'text-delta', text: providerText })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-xsai-args',
      toolName: 'set_reminder',
      arguments: {
        message: '喝水',
        minutes: 5,
      },
    }))
    expect(logReminderToolCall).toHaveBeenCalledWith(expect.objectContaining({
      argumentsPreview: expect.stringContaining('"minutes":5'),
    }))
  })

  it('surfaces a streaming tool call before a long-running executor returns', async () => {
    const emitToolCall = vi.fn()
    const emitToolResult = vi.fn()
    const providerText = createProviderResponsePayload({ reply: 'Codex 已完成检查。' })
    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-long-running-tool',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall,
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({
          type: 'tool-call-streaming-start',
          toolCallId: 'codex-call-1',
          toolName: 'codex',
        })
        await new Promise(resolve => setTimeout(resolve, 5))
        await emit({
          type: 'tool-call',
          toolCallId: 'codex-call-1',
          toolName: 'codex',
          arguments: {
            prompt: '检查当前仓库',
          },
        })
        await emit({
          type: 'tool-result',
          toolCallId: 'codex-call-1',
          result: {
            status: 'completed',
          },
        })
        await emit({ type: 'text-delta', text: providerText })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result.finishReason).toBe('stop')
    expect(emitToolCall).toHaveBeenCalledOnce()
    expect(emitToolCall).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-long-running-tool',
      toolCallId: 'codex-call-1',
      toolName: 'codex',
    })
    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'codex-call-1',
    }))
  })

  it('keeps tool-call and tool-result correlated when the provider omits toolCallId', async () => {
    const emitToolCall = vi.fn()
    const emitToolResult = vi.fn()
    const providerText = createProviderResponsePayload({ reply: '检查完成。' })
    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-synthetic-tool-id',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall,
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({
          type: 'tool-call',
          toolName: 'codex',
          arguments: {
            prompt: '检查当前仓库',
          },
        })
        await emit({
          type: 'tool-result',
          toolName: 'codex',
          result: {
            status: 'completed',
            output: '完成',
          },
        })
        await emit({ type: 'text-delta', text: providerText })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result.finishReason).toBe('stop')
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'alicization-tool-call-1',
      toolName: 'codex',
    }))
    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'alicization-tool-call-1',
      result: expect.objectContaining({
        status: 'completed',
      }),
    }))
  })

  it('reuses the prepared executor identity when provider stream events omit toolCallId', async () => {
    const toolCallIdentity = createAlicizationMainChatToolCallIdentityRegistry()
    const executorToolCallId = toolCallIdentity.resolveExecutorToolCall({
      toolCallId: 'executor-canonical-1',
      toolName: 'codex',
    })
    const executorResult = {
      status: 'completed',
      output: '完成',
    }
    toolCallIdentity.registerExecutorResult(executorResult, executorToolCallId)
    const emitToolCall = vi.fn()
    const emitToolResult = vi.fn()
    const providerText = createProviderResponsePayload({ reply: '检查完成。' })

    await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-shared-tool-identity',
      } as any,
      prepared: createPrepared({
        toolCallIdentity,
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall,
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({
          type: 'tool-call-streaming-start',
          toolName: 'codex',
        })
        await emit({
          type: 'tool-call',
          toolName: 'codex',
          arguments: {
            prompt: '检查当前仓库',
          },
        })
        await emit({
          type: 'tool-result',
          toolName: 'codex',
          result: JSON.stringify(executorResult),
        })
        await emit({ type: 'text-delta', text: providerText })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(emitToolCall).toHaveBeenCalledOnce()
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'executor-canonical-1',
      toolName: 'codex',
    }))
    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'executor-canonical-1',
      result: JSON.stringify(executorResult),
    }))
  })

  it('collapses drifting provider, executor, and result ids into one visible Codex execution', async () => {
    const toolCallIdentity = createAlicizationMainChatToolCallIdentityRegistry({
      singleFlightExecutorToolNames: ['codex'],
    })
    const toolArguments = {
      prompt: '检查当前仓库',
    }
    const executorResult = {
      status: 'completed',
      output: '检查完成',
    }
    const canonicalId = toolCallIdentity.resolveExecutorToolCall({
      arguments: toolArguments,
      toolCallId: 'executor-id-c',
      toolName: 'codex',
    })
    toolCallIdentity.registerExecutorResult(executorResult, 'executor-id-c')
    const emitToolCall = vi.fn()
    const emitToolResult = vi.fn()
    const providerText = createProviderResponsePayload({
      reply: 'Codex 已经完成检查。',
    })

    await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-drifting-tool-call-ids',
      } as any,
      prepared: createPrepared({
        toolCallIdentity,
        tools: [{
          function: {
            name: 'codex',
          },
        }],
        toolChoice: {
          type: 'function',
          function: {
            name: 'codex',
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall,
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call-streaming-start',
              toolCallId: 'provider-id-a',
              toolName: 'codex',
            })
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'provider-id-b',
              toolName: 'codex',
              arguments: toolArguments,
            })
            controller.enqueue({
              type: 'tool-result',
              toolCallId: 'provider-result-id-d',
              toolName: 'codex',
              arguments: toolArguments,
              result: executorResult,
            })
            controller.enqueue({
              type: 'text-delta',
              text: providerText,
            })
            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
            })
            controller.close()
          },
        }),
      }),
    })

    expect(canonicalId).toBe('executor-id-c')
    expect(emitToolCall).toHaveBeenCalledOnce()
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: canonicalId,
      toolName: 'codex',
    }))
    expect(emitToolResult).toHaveBeenCalledOnce()
    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: canonicalId,
      result: executorResult,
    }))
  })

  it('rejects the provider turn after a failed tool result instead of releasing a normal reply', async () => {
    const emitToolResult = vi.fn()
    const emitChunk = vi.fn()
    const controller = new AbortController()
    let providerAbortSignal: AbortSignal | undefined
    const providerText = createProviderResponsePayload({ reply: '这条不应该成为成功回复。' })

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-failed-tool',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller,
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent, abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        const emit = onEvent as (event: any) => Promise<void>
        await emit({
          type: 'tool-call',
          toolCallId: 'codex-failed-call',
          toolName: 'codex',
          arguments: {
            prompt: '检查当前仓库',
          },
        })
        await emit({
          type: 'tool-result',
          toolCallId: 'codex-failed-call',
          result: JSON.stringify({
            status: 'failed',
            failureKind: 'tool-execution',
            toolName: 'codex',
            errorCode: 'CODEX_TIMEOUT',
            errorMessage: 'Codex timed out after 120000ms.',
          }),
        })
        await emit({
          type: 'tool-result',
          toolCallId: 'codex-failed-call',
          result: JSON.stringify({
            status: 'failed',
            failureKind: 'tool-execution',
            toolName: 'codex',
            errorCode: 'CODEX_TIMEOUT',
            errorMessage: 'Codex timed out after 120000ms.',
          }),
        })
        await emit({ type: 'text-delta', text: providerText })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })).rejects.toMatchObject({
      name: 'AlicizationToolExecutionError',
      failureKind: 'tool-execution',
      toolName: 'codex',
      errorCode: 'CODEX_TIMEOUT',
    })

    expect(providerAbortSignal?.aborted).toBe(true)
    expect(controller.signal.aborted).toBe(false)
    expect(emitToolResult).toHaveBeenCalledOnce()
    expect(emitChunk).not.toHaveBeenCalled()
  })

  it('stops before Provider continuation when the real Codex adapter returns empty output', async () => {
    const controller = new AbortController()
    let providerAbortSignal: AbortSignal | undefined
    const emitChunk = vi.fn()
    const emitToolResult = vi.fn()

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-codex-empty-output',
      } as any,
      prepared: createPrepared({
        waitForTools: true,
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller,
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent, abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        const emit = onEvent as (event: any) => Promise<void>
        await emit({
          type: 'tool-call',
          toolCallId: 'codex-empty-output-call',
          toolName: 'codex',
          arguments: {
            prompt: '检查当前仓库',
          },
        })
        await emit({
          type: 'tool-result',
          toolCallId: 'codex-empty-output-call',
          result: JSON.stringify({
            status: 'failed',
            ok: false,
            toolName: 'codex',
            errorCode: 'CODEX_EMPTY_OUTPUT',
            errorMessage: 'Codex exited successfully without producing an assistant response.',
          }),
        })
        await emit({ type: 'text-delta', text: 'This must never become a visible reply.' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })).rejects.toMatchObject({
      name: 'AlicizationToolExecutionError',
      failureKind: 'tool-execution',
      toolName: 'codex',
      errorCode: 'CODEX_EMPTY_OUTPUT',
    })

    expect(providerAbortSignal?.aborted).toBe(true)
    expect(controller.signal.aborted).toBe(false)
    expect(emitToolResult).toHaveBeenCalledOnce()
    expect(emitChunk).not.toHaveBeenCalled()
  })

  it('hard-stops the xsAI tool loop after a Codex failure even when the Provider fetch ignores abort', async () => {
    const encodeSse = (chunks: unknown[]) => [
      ...chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n`),
      'data: [DONE]\n',
    ].join('\n')
    const failedToolResponse = new Response(encodeSse([
      {
        choices: [{
          index: 0,
          delta: {
            role: 'assistant',
            tool_calls: [{
              index: 0,
              id: 'codex-failure-loop-1',
              type: 'function',
              function: {
                name: 'codex',
                arguments: JSON.stringify({
                  prompt: '检查当前仓库',
                }),
              },
            }],
          },
          finish_reason: null,
        }],
      },
      {
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'tool_calls',
        }],
      },
    ]), {
      headers: {
        'content-type': 'text/event-stream',
      },
      status: 200,
    })
    const unexpectedContinuationResponse = new Response(encodeSse([
      {
        choices: [{
          index: 0,
          delta: {
            content: '这条续轮不应该发生。',
          },
          finish_reason: null,
        }],
      },
      {
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }],
      },
    ]), {
      headers: {
        'content-type': 'text/event-stream',
      },
      status: 200,
    })
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(failedToolResponse)
      .mockResolvedValueOnce(unexpectedContinuationResponse)
    let emitToolExecutionProgress: ((event: any) => void) | undefined
    const execute = vi.fn(async (_input: unknown, options: { toolCallId: string }) => {
      emitToolExecutionProgress?.({
        toolCallId: options.toolCallId,
        toolName: 'codex',
        phase: 'failed',
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'Codex execution timed out.',
      })
      return {
        status: 'failed',
        failureKind: 'tool-execution',
        toolName: 'codex',
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'Codex execution timed out.',
        continuationPolicy: 'stop',
      }
    })
    const emitToolResult = vi.fn()

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-xsai-failure-loop',
        providerId: 'openai-compatible',
        model: 'model-test',
      } as any,
      prepared: createPrepared({
        chatConfig: {
          apiKey: 'test-key',
          baseURL: 'https://example.test/v1/',
          fetch: fetchImpl,
          model: 'model-test',
        },
        tools: [{
          type: 'function',
          execute,
          function: {
            name: 'codex',
            description: 'Run Codex.',
            parameters: {
              type: 'object',
              additionalProperties: false,
              properties: {
                prompt: {
                  type: 'string',
                },
              },
              required: ['prompt'],
            },
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      subscribeToolExecutionProgress: (listener) => {
        emitToolExecutionProgress = listener
        return () => {
          emitToolExecutionProgress = undefined
        }
      },
    })).rejects.toMatchObject({
      name: 'AlicizationToolExecutionError',
      failureKind: 'tool-execution',
      errorCode: 'CODEX_TIMEOUT',
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledOnce()
    expect(emitToolResult).toHaveBeenCalledOnce()
  })

  it('surfaces a non-allowlisted executor failure instead of converting it into Provider continuation timeout', async () => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      let providerAbortSignal: AbortSignal | undefined

      const promise = runAlicizationMainChatStream({
        payload: {
          cardId: 'card-1',
          turnId: 'turn-codex-permission-required',
        } as any,
        prepared: createPrepared({
          waitForTools: true,
          tools: [{
            function: {
              name: 'codex',
            },
          }],
        }),
        controller,
        firstEventTimeoutMs: 25,
        providerContinuationTimeoutMs: 20,
        isRunActive: () => true,
        incrementChunkStats: vi.fn(),
        emitChunk: vi.fn(),
        emitToolCall: vi.fn(),
        emitToolResult: vi.fn(),
        streamMeta: createStreamMetaController(),
        nonProgressEventTypes: new Set<string>(),
        generateNonStreaming: vi.fn(),
        streamTextImpl: ({ abortSignal, onEvent }) => {
          providerAbortSignal = abortSignal as AbortSignal
          const emit = onEvent as (event: any) => Promise<void>
          return (async () => {
            await emit({
              type: 'tool-call',
              toolCallId: 'codex-permission-required-call',
              toolName: 'codex',
              arguments: {
                prompt: '检查当前仓库',
              },
            })
            await emit({
              type: 'tool-result',
              toolCallId: 'codex-permission-required-call',
              result: {
                status: 'failed',
                finalStatus: 'failed',
                continuationPolicy: 'stop',
                ok: false,
                toolName: 'codex',
                errorCode: 'CODEX_PERMISSION_REQUIRED',
                errorMessage: 'Codex requires permission before it can continue.',
              },
            })
          })()
        },
      })

      const settled = promise.catch(error => error)
      await vi.advanceTimersByTimeAsync(0)

      await expect(settled).resolves.toMatchObject({
        name: 'AlicizationToolExecutionError',
        failureKind: 'tool-execution',
        toolName: 'codex',
        errorCode: 'CODEX_PERMISSION_REQUIRED',
      })
      expect(providerAbortSignal?.aborted).toBe(true)
      expect(controller.signal.aborted).toBe(false)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('settles a terminal tool failure from progress even when the Provider never sends tool-result', async () => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      let providerAbortSignal: AbortSignal | undefined
      let emitToolExecutionProgress: ((event: any) => void) | undefined

      const promise = runAlicizationMainChatStream({
        payload: {
          cardId: 'card-1',
          turnId: 'turn-terminal-progress-without-result',
        } as any,
        prepared: createPrepared({
          waitForTools: true,
          tools: [{
            function: {
              name: 'codex',
            },
          }],
        }),
        controller,
        firstEventTimeoutMs: 10_000,
        providerContinuationTimeoutMs: 10_000,
        isRunActive: () => true,
        incrementChunkStats: vi.fn(),
        emitChunk: vi.fn(),
        emitToolCall: vi.fn(),
        emitToolResult: vi.fn(),
        subscribeToolExecutionProgress: (listener) => {
          emitToolExecutionProgress = listener
          return () => {
            emitToolExecutionProgress = undefined
          }
        },
        streamMeta: createStreamMetaController(),
        nonProgressEventTypes: new Set<string>(),
        generateNonStreaming: vi.fn(),
        streamTextImpl: ({ abortSignal }) => {
          providerAbortSignal = abortSignal as AbortSignal
          return new Promise(() => {})
        },
      })

      await vi.advanceTimersByTimeAsync(0)
      emitToolExecutionProgress?.({
        toolCallId: 'codex-terminal-progress-1',
        toolName: 'codex',
        phase: 'timeout',
        signal: 'terminal',
        elapsedMs: 180_000,
        timeoutMs: 180_000,
        errorCode: 'CODEX_EXECUTION_TIMEOUT',
        errorMessage: 'Codex execution exceeded the total limit of 180000ms.',
        summary: 'Codex execution exceeded the total limit of 180000ms.',
      })

      await expect(promise).rejects.toMatchObject({
        name: 'AlicizationToolExecutionError',
        failureKind: 'tool-execution',
        toolName: 'codex',
        errorCode: 'CODEX_EXECUTION_TIMEOUT',
      })
      expect(providerAbortSignal?.aborted).toBe(true)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('does not settle a provider finish before a completed tool hands off its result', async () => {
    const controller = new AbortController()
    let emitToolExecutionProgress: ((event: any) => void) | undefined

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-tool-result-handoff-barrier',
      } as any,
      prepared: createPrepared({
        waitForTools: true,
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller,
      firstEventTimeoutMs: 1_000,
      providerContinuationTimeoutMs: 1_000,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      subscribeToolExecutionProgress: (listener) => {
        emitToolExecutionProgress = listener
        return () => {
          emitToolExecutionProgress = undefined
        }
      },
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(streamController) {
            streamController.enqueue({
              type: 'tool-call',
              toolCallId: 'codex-handoff-barrier-call',
              toolName: 'codex',
              arguments: {
                prompt: '检查当前仓库',
              },
            })
            emitToolExecutionProgress?.({
              toolCallId: 'codex-handoff-barrier-call',
              toolName: 'codex',
              phase: 'completed',
              signal: 'terminal',
              elapsedMs: 1_000,
            })
            streamController.enqueue({
              type: 'finish',
              finishReason: 'stop',
            })
            streamController.close()
          },
        }),
      }),
    })

    await expect(promise).rejects.toThrow('chat-tool-result-handoff-incomplete')
  })

  it('does not settle a provider finish while the tool call is still active', async () => {
    let emitToolExecutionProgress: ((event: any) => void) | undefined
    const appendRuntimeDebugLine = vi.fn(async () => {})
    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-active-tool-finish-barrier',
      } as any,
      prepared: createPrepared({
        waitForTools: true,
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 1_000,
      providerContinuationTimeoutMs: 1_000,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      subscribeToolExecutionProgress: (listener) => {
        emitToolExecutionProgress = listener
        return () => {
          emitToolExecutionProgress = undefined
        }
      },
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: () => ({
        fullStream: new ReadableStream({
          start(streamController) {
            streamController.enqueue({
              type: 'tool-call',
              toolCallId: 'codex-active-finish-call',
              toolName: 'codex',
              arguments: {
                prompt: '检查当前仓库',
              },
            })
            streamController.enqueue({
              type: 'finish',
              finishReason: 'stop',
            })
            setTimeout(() => {
              emitToolExecutionProgress?.({
                toolCallId: 'codex-active-finish-call',
                toolName: 'codex',
                phase: 'timeout',
                signal: 'terminal',
                elapsedMs: 180_000,
                timeoutMs: 180_000,
                errorCode: 'CODEX_TIMEOUT',
                errorMessage: 'Codex produced no semantic progress for 180000ms.',
              })
            }, 0)
          },
        }),
      }),
    })

    await expect(promise).rejects.toMatchObject({
      name: 'AlicizationToolExecutionError',
      failureKind: 'tool-execution',
      toolName: 'codex',
      errorCode: 'CODEX_TIMEOUT',
    })
    expect(appendRuntimeDebugLine).not.toHaveBeenCalledWith(
      'chat-stream.provider-finished',
      expect.objectContaining({
        streamPhase: 'completed',
      }),
    )
  })

  it('waits for every concurrent tool result before accepting the Provider finish', async () => {
    let emitToolExecutionProgress: ((event: any) => void) | undefined
    const streamTextImpl = vi.fn(() => ({
      fullStream: new ReadableStream({
        start(streamController) {
          streamController.enqueue({
            type: 'tool-call',
            toolCallId: 'codex-concurrent-a',
            toolName: 'codex',
            arguments: {
              prompt: '检查当前仓库的第一个区域',
            },
          })
          streamController.enqueue({
            type: 'tool-call',
            toolCallId: 'codex-concurrent-b',
            toolName: 'codex',
            arguments: {
              prompt: '检查当前仓库的第二个区域',
            },
          })
          emitToolExecutionProgress?.({
            toolCallId: 'codex-concurrent-a',
            toolName: 'codex',
            phase: 'completed',
            signal: 'terminal',
            elapsedMs: 1_000,
          })
          emitToolExecutionProgress?.({
            toolCallId: 'codex-concurrent-b',
            toolName: 'codex',
            phase: 'completed',
            signal: 'terminal',
            elapsedMs: 1_100,
          })
          streamController.enqueue({
            type: 'tool-result',
            toolCallId: 'codex-concurrent-a',
            toolName: 'codex',
            result: {
              status: 'completed',
              output: '第一个结果',
            },
          })
          streamController.enqueue({
            type: 'finish',
            finishReason: 'stop',
          })
          streamController.close()
        },
      }),
    }))

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-concurrent-tool-result-barrier',
      } as any,
      prepared: createPrepared({
        waitForTools: true,
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 1_000,
      providerContinuationTimeoutMs: 1_000,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      subscribeToolExecutionProgress: (listener) => {
        emitToolExecutionProgress = listener
        return () => {
          emitToolExecutionProgress = undefined
        }
      },
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })).rejects.toThrow('chat-tool-result-handoff-incomplete')
  })

  it('does not enforce a legacy executor channel when the model selects an available tool', async () => {
    const emitToolCall = vi.fn()
    const providerText = createProviderResponsePayload({
      reply: 'CLI 已经完成检查。',
    })
    const streamTextImpl = vi.fn(() => ({
      fullStream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: 'tool-call',
            toolCallId: 'provider-cli-call-1',
            toolName: 'cli',
            arguments: {
              command: 'find . -type f',
            },
          })
          controller.enqueue({
            type: 'tool-result',
            toolCallId: 'provider-cli-call-1',
            toolName: 'cli',
            result: {
              status: 'completed',
              output: '检查完成',
            },
          })
          controller.enqueue({
            type: 'text-delta',
            text: providerText,
          })
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
          })
          controller.close()
        },
      }),
    }))

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-forced-codex-channel-mismatch',
      } as any,
      prepared: createPrepared({
        tools: [
          {
            type: 'function',
            function: {
              name: 'codex',
            },
          },
          {
            type: 'function',
            function: {
              name: 'cli',
            },
          },
        ],
        toolChoice: {
          type: 'function',
          function: {
            name: 'codex',
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall,
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })).resolves.toMatchObject({
      fullText: providerText,
    })

    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'provider-cli-call-1',
      toolName: 'cli',
    }))
  })

  it('buffers structured mind-turn deltas and releases only reply text on the visible stream surface', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()

    const structuredText = createProviderResponsePayload({
      thought: 'I considered the current request.',
      emotion: 'thinking',
      reply: '你好。',
    })
    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-structured-stream',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: structuredText.slice(0, 48) })
        await emit({ type: 'text-delta', text: structuredText.slice(48) })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText).reply).toBe('你好。')
    expect(emitChunk).toHaveBeenCalledTimes(1)
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-structured-stream',
      text: '你好。',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })
    expect(incrementChunkStats).toHaveBeenCalledWith('你好。')
    expect(streamMeta.emit).toHaveBeenCalledWith('你好。')
  })

  it('settles delayed plain provider text without releasing it early', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const settleStructuredVisibleReply = vi.fn()

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-delayed-visible-release',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: typedMemoryContextBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      settleStructuredVisibleReply,
      delayVisibleRelease: true,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我先直接回答你。' })
        expect(emitChunk).not.toHaveBeenCalled()
        await emit({ type: 'text-delta', text: '这句应该先被闭环验收。' })
        expect(emitChunk).not.toHaveBeenCalled()
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result.fullText).toBe('我先直接回答你。这句应该先被闭环验收。')
    expect(result.visibleReplyRealization.visibleText).toBe('我先直接回答你。这句应该先被闭环验收。')
    expect(settleStructuredVisibleReply).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledOnce()
    expect(emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: '我先直接回答你。这句应该先被闭环验收。',
      origin: 'provider',
    }))
    expect(incrementChunkStats).toHaveBeenCalledWith('我先直接回答你。这句应该先被闭环验收。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我先直接回答你。这句应该先被闭环验收。')
  })

  it('aborts with a first-event-timeout when the stream never produces progress', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    let providerAbortSignal: AbortSignal | undefined

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-timeout',
      } as any,
      prepared: createPrepared(),
      controller,
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: ({ abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        return new Promise(() => {})
      },
      providerRetryPolicy: {
        maxRetries: 0,
      },
    })
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(25)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })
    expect(controller.signal.aborted).toBe(false)
    expect(providerAbortSignal?.aborted).toBe(true)
  })

  it('does not let a liveness-only tool heartbeat mask a missing Provider first event', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    let providerAbortSignal: AbortSignal | undefined
    let emitToolExecutionProgress: ((event: any) => void) | undefined
    const fullStream = new ReadableStream()

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-tool-progress-keeps-alive',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller,
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      subscribeToolExecutionProgress: (listener) => {
        emitToolExecutionProgress = listener
        return () => {
          emitToolExecutionProgress = undefined
        }
      },
      streamTextImpl: ({ abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        return { fullStream }
      },
    })

    await vi.advanceTimersByTimeAsync(0)
    emitToolExecutionProgress?.({
      toolCallId: 'codex-progress-1',
      toolName: 'codex',
      phase: 'started',
      signal: 'liveness',
      elapsedMs: 0,
      occurredAt: Date.now(),
    })
    const settled = promise.catch(error => error)
    await vi.advanceTimersByTimeAsync(25)

    expect(providerAbortSignal?.aborted).toBe(true)
    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })
  })

  it('completes a real xsAI tool loop after 70 seconds of heartbeats and Provider continuation', async () => {
    vi.useFakeTimers()
    const providerText = createProviderResponsePayload({
      reply: 'Codex 的长任务结果已经回到同一轮对话。',
    })
    const encodeSse = (chunks: unknown[]) => [
      ...chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n`),
      'data: [DONE]\n',
    ].join('\n')
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(encodeSse([
        {
          choices: [{
            index: 0,
            delta: {
              role: 'assistant',
              tool_calls: [{
                index: 0,
                id: 'codex-real-xsai-1',
                type: 'function',
                function: {
                  name: 'codex',
                  arguments: JSON.stringify({
                    prompt: '检查当前仓库',
                  }),
                },
              }],
            },
            finish_reason: null,
          }],
        },
        {
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'tool_calls',
          }],
        },
      ]), {
        headers: {
          'content-type': 'text/event-stream',
        },
        status: 200,
      }))
      .mockResolvedValueOnce(new Response(encodeSse([
        {
          choices: [{
            index: 0,
            delta: {
              content: providerText,
            },
            finish_reason: null,
          }],
        },
        {
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop',
          }],
        },
      ]), {
        headers: {
          'content-type': 'text/event-stream',
        },
        status: 200,
      }))
    let emitToolExecutionProgress: ((event: any) => void) | undefined
    const execute = vi.fn(async (_input: unknown, options: { abortSignal?: AbortSignal, toolCallId: string }) => {
      emitToolExecutionProgress?.({
        toolCallId: options.toolCallId,
        toolName: 'codex',
        phase: 'started',
        elapsedMs: 0,
      })
      for (let elapsedMs = 10_000; elapsedMs <= 70_000; elapsedMs += 10_000) {
        await new Promise(resolve => setTimeout(resolve, 10_000))
        if (options.abortSignal?.aborted)
          throw options.abortSignal.reason ?? new Error('tool execution was aborted')
        emitToolExecutionProgress?.({
          toolCallId: options.toolCallId,
          toolName: 'codex',
          phase: 'running',
          elapsedMs,
        })
      }
      emitToolExecutionProgress?.({
        toolCallId: options.toolCallId,
        toolName: 'codex',
        phase: 'completed',
        elapsedMs: 70_000,
      })
      return {
        status: 'completed',
        output: '检查完成',
      }
    })
    const appendRuntimeDebugLine = vi.fn(async () => {})
    const providerAbortController = new AbortController()

    const pending = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-real-xsai-long-tool',
        providerId: 'openai-compatible',
        model: 'model-test',
      } as any,
      prepared: createPrepared({
        chatConfig: {
          apiKey: 'test-key',
          baseURL: 'https://example.test/v1/',
          fetch: fetchImpl,
          model: 'model-test',
        },
        tools: [{
          type: 'function',
          execute,
          function: {
            name: 'codex',
            description: 'Run Codex.',
            parameters: {
              type: 'object',
              additionalProperties: false,
              properties: {
                prompt: {
                  type: 'string',
                },
              },
              required: ['prompt'],
            },
          },
        }],
      }),
      controller: providerAbortController,
      firstEventTimeoutMs: 25_000,
      providerContinuationTimeoutMs: 30_000,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      subscribeToolExecutionProgress: (listener) => {
        emitToolExecutionProgress = listener
        return () => {
          emitToolExecutionProgress = undefined
        }
      },
    })

    await vi.advanceTimersByTimeAsync(70_000)
    const result = await pending

    expect(providerAbortController.signal.aborted).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(execute).toHaveBeenCalledOnce()
    expect(result).toMatchObject({
      finishReason: 'stop',
      fullText: providerText,
    })
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.provider-continuation-started',
      expect.objectContaining({
        toolCallId: 'codex-real-xsai-1',
        toolName: 'codex',
      }),
    )
  })

  it('continues the Provider reply immediately after a background Codex task is accepted', async () => {
    const controller = new AbortController()
    const providerText = createProviderResponsePayload({
      reply: 'Codex 任务已经开始，我会在完成后把结果带回这里。',
    })
    const emitToolResult = vi.fn()
    const appendRuntimeDebugLine = vi.fn(async () => {})
    const fullStream = new ReadableStream({
      start(streamController) {
        streamController.enqueue({
          type: 'tool-call-streaming-start',
          toolCallId: 'codex-background-accepted-1',
          toolName: 'codex',
        })
        streamController.enqueue({
          type: 'tool-call',
          toolCallId: 'codex-background-accepted-1',
          toolName: 'codex',
          arguments: {
            prompt: '只读检查仓库。',
          },
        })
        streamController.enqueue({
          type: 'tool-result',
          toolCallId: 'codex-background-accepted-1',
          toolName: 'codex',
          result: {
            status: 'accepted',
            accepted: true,
            threadId: 'thread-codex-background-1',
            continuationPolicy: 'continue',
          },
        })
        streamController.enqueue({
          type: 'text-delta',
          text: providerText,
        })
        streamController.enqueue({
          type: 'finish',
          finishReason: 'stop',
        })
        streamController.close()
      },
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-background-codex-accepted',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller,
      firstEventTimeoutMs: 25,
      providerContinuationTimeoutMs: 60,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: () => ({ fullStream }),
    })

    expect(controller.signal.aborted).toBe(false)
    expect(result).toMatchObject({
      finishReason: 'stop',
      fullText: providerText,
    })
    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'codex-background-accepted-1',
      result: expect.objectContaining({
        status: 'accepted',
        continuationPolicy: 'continue',
      }),
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.provider-continuation-progress',
      expect.objectContaining({
        eventType: 'text-delta',
      }),
    )
  })

  it('cancels a stalled fullStream reader when the provider deadline aborts', async () => {
    vi.useFakeTimers()
    let resolveRead: ((result: { done: boolean, value?: unknown }) => void) | undefined
    const cancel = vi.fn(async () => {
      resolveRead?.({ done: true })
    })
    const releaseLock = vi.fn()
    const reader = {
      cancel,
      read: vi.fn(() => new Promise<{ done: boolean, value?: unknown }>((resolve) => {
        resolveRead = resolve
      })),
      releaseLock,
    }

    const settled = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-cancel-stalled-reader',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: () => ({
        fullStream: {
          getReader: () => reader,
        },
      }),
      providerRetryPolicy: {
        maxRetries: 0,
      },
    }).catch(error => error)

    await vi.advanceTimersByTimeAsync(25)
    await settled

    expect(cancel).toHaveBeenCalledOnce()
    expect(releaseLock).toHaveBeenCalledOnce()
  })

  it('cancels a stalled retry attempt at the inherited total retry deadline', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const retryDeadlineAt = Date.now() + 25
    const cancel = vi.fn(async () => {})
    const releaseLock = vi.fn()
    const reader = {
      cancel,
      read: vi.fn(() => new Promise<{ done: boolean, value?: unknown }>(() => {})),
      releaseLock,
    }
    const streamTextImpl = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('temporary provider failure'), {
        status: 503,
      }))
      .mockImplementationOnce(() => ({
        fullStream: {
          getReader: () => reader,
        },
      }))

    const settled = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-retry-deadline-cancels-reader',
        providerId: 'openai-compatible',
        model: 'model-test',
      } as any,
      prepared: createPrepared(),
      controller,
      firstEventTimeoutMs: 1_000,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
      providerRetryDeadlineAt: retryDeadlineAt,
      providerRetryPolicy: {
        deadlineAt: null,
        maxRetries: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
        sleep: vi.fn(async () => {}),
      },
    }).catch(error => error)

    await vi.advanceTimersByTimeAsync(0)
    expect(streamTextImpl).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(25)

    expect(cancel).toHaveBeenCalledOnce()
    expect(controller.signal.aborted).toBe(false)
    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('chat-provider-retry-deadline'),
    })
    expect(releaseLock).toHaveBeenCalledOnce()
  })

  it('re-arms the provider deadline after a tool result without aborting the outer turn', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    let providerAbortSignal: AbortSignal | undefined
    let streamController: ReadableStreamDefaultController<unknown> | undefined
    const emitToolResult = vi.fn()
    const fullStream = new ReadableStream({
      start(nextController) {
        streamController = nextController
        nextController.enqueue({
          type: 'tool-call-streaming-start',
          toolCallId: 'codex-continuation-1',
          toolName: 'codex',
        })
        nextController.enqueue({
          type: 'tool-call',
          toolCallId: 'codex-continuation-1',
          toolName: 'codex',
          arguments: {
            prompt: '检查当前仓库',
          },
        })
        nextController.enqueue({
          type: 'tool-result',
          toolCallId: 'codex-continuation-1',
          toolName: 'codex',
          result: {
            status: 'completed',
          },
        })
        setTimeout(() => {
          try {
            nextController.close()
          }
          catch {
            // The fixed path cancels the stalled provider stream first.
          }
        }, 100)
      },
    })

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-tool-continuation-timeout',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller,
      firstEventTimeoutMs: 25,
      providerContinuationTimeoutMs: 60,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult,
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: ({ abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        providerAbortSignal.addEventListener('abort', () => {
          try {
            streamController?.error(providerAbortSignal?.reason)
          }
          catch {
            // The stream may already have settled.
          }
        }, { once: true })
        return { fullStream }
      },
    })
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(0)
    expect(emitToolResult).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(30)
    const providerAbortedAtFirstEventDeadline = providerAbortSignal?.aborted === true
    await vi.advanceTimersByTimeAsync(35)
    const providerAbortedAtContinuationDeadline = providerAbortSignal?.aborted === true
    await vi.advanceTimersByTimeAsync(100)
    await settled

    expect(providerAbortedAtFirstEventDeadline).toBe(false)
    expect(providerAbortedAtContinuationDeadline).toBe(true)
    expect(providerAbortSignal?.reason).toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('chat-provider-continuation-timeout'),
    })
    expect(controller.signal.aborted).toBe(false)
  })

  it('keeps the Provider continuation watchdog active after the first text delta', async () => {
    vi.useFakeTimers()
    let providerAbortSignal: AbortSignal | undefined
    let streamController: ReadableStreamDefaultController<unknown> | undefined
    const fullStream = new ReadableStream({
      start(nextController) {
        streamController = nextController
        nextController.enqueue({
          type: 'tool-call',
          toolCallId: 'codex-continuation-stall-1',
          toolName: 'codex',
          arguments: {
            prompt: '检查当前仓库',
          },
        })
        nextController.enqueue({
          type: 'tool-result',
          toolCallId: 'codex-continuation-stall-1',
          toolName: 'codex',
          result: {
            status: 'completed',
          },
        })
        nextController.enqueue({
          type: 'text-delta',
          text: 'Codex 已经完成检查，',
        })
      },
    })

    const settled = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-tool-continuation-stalls-after-first-delta',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 25,
      providerContinuationTimeoutMs: 60,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: ({ abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        providerAbortSignal.addEventListener('abort', () => {
          try {
            streamController?.error(providerAbortSignal?.reason)
          }
          catch {
            // The stream may already have settled.
          }
        }, { once: true })
        return { fullStream }
      },
    }).catch(error => error)

    await vi.advanceTimersByTimeAsync(0)
    expect(providerAbortSignal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(61)
    const error = await settled

    expect(providerAbortSignal?.aborted).toBe(true)
    expect(providerAbortSignal?.reason).toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('chat-provider-continuation-timeout'),
    })
    expect(error).toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('chat-provider-continuation-timeout'),
    })
  })

  it('rejects when fullStream closes after a tool result without Provider continuation', async () => {
    const fullStream = new ReadableStream({
      start(controller) {
        controller.enqueue({
          type: 'tool-call-streaming-start',
          toolCallId: 'codex-continuation-incomplete-1',
          toolName: 'codex',
        })
        controller.enqueue({
          type: 'tool-call',
          toolCallId: 'codex-continuation-incomplete-1',
          toolName: 'codex',
          arguments: {
            prompt: '检查当前仓库',
          },
        })
        controller.enqueue({
          type: 'tool-result',
          toolCallId: 'codex-continuation-incomplete-1',
          toolName: 'codex',
          result: {
            status: 'completed',
          },
        })
        controller.close()
      },
    })

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-tool-continuation-incomplete',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 25,
      providerContinuationTimeoutMs: 60,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: () => ({ fullStream }),
    })).rejects.toThrow('chat-provider-continuation-incomplete')
  })

  it('treats finish=stop after a tool result as terminal provider output instead of continuation timeout', async () => {
    const fullStream = new ReadableStream({
      start(controller) {
        controller.enqueue({
          type: 'tool-result',
          toolCallId: 'codex-stop-after-result-1',
          toolName: 'codex',
          result: {
            status: 'completed',
          },
        })
        controller.enqueue({
          type: 'finish',
          finishReason: 'stop',
        })
        controller.close()
      },
    })

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-tool-result-stop',
      } as any,
      prepared: createPrepared({
        tools: [{
          function: {
            name: 'codex',
          },
        }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 25,
      providerContinuationTimeoutMs: 60,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: () => ({ fullStream }),
    })).rejects.toThrow('provider-settlement-invalid')
  })

  it('cancels the provider reader when the provider emits an error event', async () => {
    let resolveRead: ((result: { done: boolean, value?: unknown }) => void) | undefined
    const cancel = vi.fn(async () => {
      resolveRead?.({ done: true })
    })
    const reader = {
      read: vi.fn(() => new Promise<{ done: boolean, value?: unknown }>((resolve) => {
        resolveRead = resolve
      })),
      cancel,
      releaseLock: vi.fn(),
    }
    const fullStream = {
      getReader: () => reader,
    }

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-provider-error-cancels-reader',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: () => ({
        fullStream,
      }),
    }).catch(error => error)

    await Promise.resolve()
    resolveRead?.({
      done: false,
      value: {
        type: 'error',
        error: new Error('provider stream failed'),
      },
    })

    await expect(promise).resolves.toMatchObject({
      message: 'provider stream failed',
    })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('records debug diagnostics when the stream settles without a progress event', async () => {
    vi.useFakeTimers()
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-non-progress',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'response-metadata' })
      },
      providerRetryPolicy: {
        maxRetries: 0,
      },
    })
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(1_600)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })

    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.non-progress-event', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      eventType: 'response-metadata',
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-grace-armed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      graceTimeoutMs: 1000,
      lastEventType: 'response-metadata',
      nonProgressEventTypes: ['response-metadata'],
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-fired', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      timeoutPhase: 'grace',
      sawAnyEvent: true,
      firstEventGraceApplied: true,
      lastEventType: 'response-metadata',
      nonProgressEventTypes: ['response-metadata'],
    }))
  })

  it('classifies metadata and keepalive without semantic progress as Provider liveness timeout', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    let providerAbortSignal: AbortSignal | undefined

    const promise = runAlicizationMainChatStream({
      payload: { cardId: 'card-1', turnId: 'turn-provider-liveness-timeout' } as any,
      prepared: createPrepared(),
      controller,
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      providerRetryPolicy: { maxRetries: 0 },
      streamTextImpl: ({ onEvent, abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        void (onEvent as (event: unknown) => void)({ type: 'response-metadata' })
        void (onEvent as (event: unknown) => void)({ type: 'provider-keepalive' })
        return new Promise(() => {})
      },
    }).catch(error => error)

    await vi.advanceTimersByTimeAsync(1_100)

    await expect(promise).resolves.toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('chat-provider-liveness-timeout'),
    })
    expect(providerAbortSignal?.aborted).toBe(true)
  })

  it('classifies Provider silence after semantic progress as Provider idle timeout', async () => {
    vi.useFakeTimers()
    let providerAbortSignal: AbortSignal | undefined

    const promise = runAlicizationMainChatStream({
      payload: { cardId: 'card-1', turnId: 'turn-provider-idle-timeout' } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      providerRetryPolicy: { maxRetries: 0 },
      streamTextImpl: ({ onEvent, abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        void (onEvent as (event: unknown) => void)({ type: 'text-delta', text: '已经开始输出' })
        return new Promise(() => {})
      },
    }).catch(error => error)

    await vi.advanceTimersByTimeAsync(50)

    await expect(promise).resolves.toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('chat-provider-idle-timeout'),
    })
    expect(providerAbortSignal?.aborted).toBe(true)
  })

  it('does not let continuous tool heartbeat refresh the Provider idle watchdog', async () => {
    vi.useFakeTimers()
    let providerAbortSignal: AbortSignal | undefined
    let emitToolExecutionProgress: ((event: any) => void) | undefined

    const promise = runAlicizationMainChatStream({
      payload: { cardId: 'card-1', turnId: 'turn-tool-heartbeat-provider-idle' } as any,
      prepared: createPrepared({
        tools: [{ function: { name: 'codex' } }],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      providerRetryPolicy: { maxRetries: 0 },
      subscribeToolExecutionProgress: (listener) => {
        emitToolExecutionProgress = listener
        return () => {
          emitToolExecutionProgress = undefined
        }
      },
      streamTextImpl: ({ onEvent, abortSignal }) => {
        providerAbortSignal = abortSignal as AbortSignal
        void (onEvent as (event: unknown) => void)({ type: 'text-delta', text: '语义进展' })
        return new Promise(() => {})
      },
    }).catch(error => error)

    await vi.advanceTimersByTimeAsync(0)
    const heartbeat = setInterval(() => {
      emitToolExecutionProgress?.({
        toolCallId: 'codex-heartbeat',
        toolName: 'codex',
        phase: 'started',
        signal: 'liveness',
      })
    }, 5)
    await vi.advanceTimersByTimeAsync(100)
    clearInterval(heartbeat)

    await expect(promise).resolves.toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('chat-provider-idle-timeout'),
    })
    expect(providerAbortSignal?.aborted).toBe(true)
  })

  it('allows delayed first progress after non-progress activity within grace window', async () => {
    vi.useFakeTimers()
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-delayed-first-progress',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'response-metadata' })
        await new Promise(resolve => setTimeout(resolve, 900))
        await emit({
          type: 'text-delta',
          text: createProviderResponsePayload({ reply: '你好' }),
        })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    await vi.advanceTimersByTimeAsync(1_600)
    const result = await promise

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '你好',
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-grace-armed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
      graceTimeoutMs: 1000,
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-progress-event', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
      eventType: 'text-delta',
    }))
    expect(appendRuntimeDebugLine).not.toHaveBeenCalledWith('chat-stream.first-event-timeout-fired', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
    }))
  })

  it('allows provider text when execution tools are offered', async () => {
    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-tools-offered-text-reply',
      } as any,
      prepared: createPrepared({
        tools: [
          {
            function: {
              name: 'cli',
            },
          },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine: vi.fn(async () => {}),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我先看看。' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })).resolves.toMatchObject({
      finishReason: 'stop',
      fullText: '我先看看。',
      origin: 'provider',
    })
  })
})
