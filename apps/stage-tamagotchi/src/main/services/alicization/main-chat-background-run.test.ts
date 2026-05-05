import type { Message } from '@xsai/shared-chat'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runAlicizationMainChatBackground } from './main-chat-background-run'
import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
import { AlicizationRequiredToolMissingError } from './main-chat-required-tool'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'

const firstEventTimeoutMs = 65_000
const timeoutRecoveryWithVisualGroundingMs = 30_000

vi.mock('./main-chat-one-shot', () => ({
  generateAlicizationMainChatNonStreaming: vi.fn(),
  recoverAlicizationMainChatFromTimeout: vi.fn(),
}))

vi.mock('./main-chat-run-lifecycle', () => ({
  handleAlicizationMainChatRunFailure: vi.fn(),
}))

vi.mock('./main-chat-runtime-surface', () => ({
  extractAllowedToolNamesFromToolChoice: vi.fn((toolChoice: any, tools: any[] | undefined) => {
    const toolName = toolChoice?.function?.name
    if (typeof toolName === 'string' && toolName)
      return [toolName]
    return Array.isArray(tools)
      ? tools
          .map(tool => tool?.function?.name)
          .filter((name): name is string => typeof name === 'string' && name.length > 0)
      : []
  }),
  extractCustomDirectivesFromMessages: vi.fn(() => ''),
  extractHostNameFromMessages: vi.fn(() => ''),
}))

vi.mock('./main-chat-stream-runner', () => ({
  runAlicizationMainChatStream: vi.fn(),
}))

vi.mock('./main-chat-stream-meta', () => ({
  createAlicizationChatStreamMetaEmitter: vi.fn(() => ({
    emit: vi.fn(),
    getLastReply: () => '',
  })),
}))

vi.mock('./runtime-soul', () => ({
  mainChatFirstEventTimeoutMs: 65_000,
  mainChatFirstEventTimeoutWithVisualGroundingMs: 90_000,
  mainChatTimeoutRecoveryMs: 12_000,
  mainChatTimeoutRecoveryWithVisualGroundingMs: 30_000,
  normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
  sanitizeMultilineText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : fallback,
  sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
  supportedDialogueStructuredFormats: ['mind-turn-v1', 'epoch1-v1'],
}))

function createPrepared(overrides?: Partial<any>): any {
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      { role: 'user' as const, content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
    ] as Message[],
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
        reason: 'Normal visible replies should stay on the provider-authored path.',
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

function createInput(
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
        { role: 'user' as const, content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
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
    preparationPromise: Promise.resolve(createPrepared()),
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

function parseStructuredMindTurn(text: string) {
  return JSON.parse(text) as {
    format: string
    reply: string
    thought: string
    emotion: string
  }
}

function createStreamResult(overrides?: Partial<any>): any {
  return {
    finishReason: 'stop',
    fullText: '',
    visibleReplyExecution: {
      mode: 'provider-stream',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
      reason: 'provider-stream',
    },
    ...overrides,
  }
}

function buildAuthoritativeShanghaiTimeReply() {
  const now = new Date()
  const timeText = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  const weekdayText = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    weekday: 'long',
  }).format(now)

  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
    emotion: 'thinking',
    reply: `现在是 ${timeText}，${weekdayText}。`,
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
  })
}

function readFinishedPayload(input: Parameters<typeof runAlicizationMainChatBackground>[0]) {
  return vi.mocked(input.runStateController.finishRun).mock.calls[0]?.[1]
}

describe('main chat background run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generateAlicizationMainChatNonStreaming).mockReset()
    vi.mocked(runAlicizationMainChatStream).mockReset()
    vi.mocked(handleAlicizationMainChatRunFailure).mockReset()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    vi.mocked(handleAlicizationMainChatRunFailure).mockResolvedValue(undefined)
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockImplementation(async (input: any) => {
      const messages = Array.isArray(input?.messages) ? input.messages : []
      const latestUserMessage = [...messages].reverse().find((message: any) => message?.role === 'user')
      const latestUserText = String(latestUserMessage?.content ?? '')

      if (
        /几点|时间|几时/.test(latestUserText)
        || (
          /确定吗|真的吗|are you sure/i.test(latestUserText)
          && messages.some((message: any) => typeof message?.content === 'string' && /几点|时间|几时/.test(String(message.content)))
        )
      ) {
        return buildAuthoritativeShanghaiTimeReply()
      }

      if (/你是谁|叫什么/.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=dialogue-grounded; focus=alicization self continuity; move=direct-reply; tone=direct',
          emotion: 'thinking',
          reply: '我是 Alicization。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'firm',
            emphasis: 0,
          },
        })
      }

      if (/不像人类|没心智|没有人格/.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=repair; truth=dialogue-grounded; focus=reply humanity and living presence; move=repair; tone=direct',
          emotion: 'thinking',
          reply: '你说得对，我上一句像流程播报，不像真的在和你说话。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'firm',
            emphasis: 0,
          },
        })
      }

      if (/你在说啥|你在说什么/.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=repair; truth=dialogue-grounded; focus=repair; move=repair; tone=direct',
          emotion: 'thinking',
          reply: '刚才我答偏了，现在是 10:30，星期二。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'firm',
            emphasis: 0,
          },
        })
      }

      if (/你确定吗|确定吗|are you sure|really/i.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
          emotion: 'thinking',
          reply: '我又核了一遍。现在是 10:30，星期二。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        })
      }

      if (/你好|哈喽|hello|hi/i.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=dialogue-grounded; focus=host greeting; move=direct-reply; tone=direct',
          emotion: 'thinking',
          reply: '你好。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        })
      }

      return JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded; focus=current-turn; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '收到，我直接接这句继续。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })
    })
  })

  it('prepares and completes a background stream run', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValue({
      finishReason: 'stop',
      fullText: 'visual reply',
    })
    const input = createInput()

    await runAlicizationMainChatBackground(input)

    expect(input.runStateController.setSessionTraceGetter).toHaveBeenCalledWith(input.key, expect.any(Function))
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-started',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.prepared', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      sessionPhases: ['prepare', 'stream'],
    }))
    expect(runAlicizationMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      firstEventTimeoutMs,
      headers: input.headers,
    }))
    const streamInput = vi.mocked(runAlicizationMainChatStream).mock.calls[0]?.[0]
    await streamInput?.generateNonStreaming({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
      cardId: 'card-1',
      turnId: 'turn-1',
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.visual-one-shot-finished', {
      cardId: 'card-1',
      turnId: 'turn-1',
      finishReason: 'stop',
      finalChars: 'visual reply'.length,
    })
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'stop',
      fullText: 'hello',
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
      }),
    })
  })

  it('passes prepared organic memory trace to runtime before streaming', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: '我按之前那套节奏继续。',
    }))
    const recordPreparedMindTrace = vi.fn(async () => {})
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-memory-telemetry',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续按之前那样做' },
        ],
      } as any,
      recordPreparedMindTrace,
      preparationPromise: Promise.resolve(createPrepared({
        organicMemoryContext: {
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: ['procedure-1'],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: ['这种时候先接结果'],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [],
            selectedProcedures: [{
              id: 'procedure-1',
              label: 'patch -> verify',
              approach: '先 patch 再 verify',
            }],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'procedural-carry',
            confidence: 0.82,
            whyNow: 'same task context',
            inwardLine: 'remember the procedure before speaking',
            visibleLine: '按之前那样继续',
          },
          recollectionIntent: {
            mode: 'execution-procedure',
            temporalFocus: 'experience-matched',
            searchEpisodes: true,
            searchConversations: true,
            searchProceduralExperience: true,
            queryHints: ['patch', 'verify'],
            rationale: 'same task context',
            confidence: 0.8,
          },
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'procedural-carry',
            placement: 'inside-payoff',
            certainty: 'approximate',
            internalLead: 'remember the procedure',
            visibleLead: '按之前那样继续',
            styleNote: 'brief',
            rationale: 'same task context',
            confidence: 0.78,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(recordPreparedMindTrace).toHaveBeenCalledWith({
      payload: input.payload,
      prepared: expect.objectContaining({
        organicMemoryContext: expect.objectContaining({
          memoryDeliberation: expect.objectContaining({
            shouldRecall: true,
            surfacePolicy: 'procedural-carry',
          }),
        }),
      }),
    })
    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
  })

  it('lets simple greeting turns stay on the main stream path instead of the active dialogue fast lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '你好。今天想从哪件事开始？',
    }))
    const input = createInput({
      key: 'card-1::turn-greeting',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-greeting',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你好' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你好' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: '你好。今天想从哪件事开始？',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-greeting',
      lane: 'greeting',
      strategy: 'compact-one-shot',
    }))
  })

  it('serves current time turns from the active dialogue local lane instead of inheriting stale continuity', async () => {
    const input = createInput({
      key: 'card-1::turn-time',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项。' },
          { role: 'user' as const, content: '现在几点了？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项。' },
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(1)
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/\d{2}:\d{2}/)
    expect(emittedChunk?.text).toContain('星期')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.thought).toMatch(/focus=local(?:-|\s)time/u)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
    }))
    const laneSelectedPayload = vi.mocked(input.appendRuntimeDebugLine).mock.calls
      .find(([event]) => event === 'chat-stream.active-dialogue-lane-selected')?.[1] as { resolvedTimeZoneSource?: string } | undefined
    expect(laneSelectedPayload?.resolvedTimeZoneSource).not.toBe('utc-fallback')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-mind-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time',
      lane: 'utility-time',
    }))
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'active-dialogue-fast-path',
      fullText: expect.any(String),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
      }),
    })
  })

  it('escalates invalid compact utility replies back to the main runtime instead of localizing the answer', async () => {
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
      emotion: 'thinking',
      reply: '现在是 99:99，星期二。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '现在是 10:30，星期二。',
    }))

    const input = createInput({
      key: 'card-1::turn-time-escalated',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-escalated',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(1)
    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-fast-failed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-escalated',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
      reason: 'active-dialogue-invalid-compact-reply:utility-time',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-escalated-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-escalated',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
      escalationReason: 'active-dialogue-invalid-compact-reply:utility-time',
      mindAuthorityEscalation: true,
    }))
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'stop',
      fullText: '现在是 10:30，星期二。',
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
      }),
    })
  })

  it('lets ordinary short dialogue turns stay on the main stream path instead of forcing the active fast lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: '先别把所有事情一次摊开。你先说现在最压着你的那一件，我们就从那里落手。',
    }))
    const input = createInput({
      key: 'card-1::turn-ordinary-dialogue',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-ordinary-dialogue',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我今天有点乱' },
          { role: 'assistant' as const, content: '先别散，我和你一起收一下。' },
          { role: 'user' as const, content: '那我先从哪开始' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'user' as const, content: '我今天有点乱' },
          { role: 'assistant' as const, content: '先别散，我和你一起收一下。' },
          { role: 'user' as const, content: '那我先从哪开始' },
        ] as Message[],
      })),
      ensureMainGatewayReachable: vi.fn(async () => ({
        reachable: false,
        reason: 'main-gateway-offline',
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    expect(input.appendRuntimeDebugLine).not.toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.anything())
  })

  it('lets identity questions stay on the main stream path instead of the active dialogue fast lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '我是 Alicization。你刚刚是在直接问我是谁。',
    }))
    const input = createInput({
      key: 'card-1::turn-identity',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-identity',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我问你，你是谁' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '我问你，你是谁' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: '我是 Alicization。你刚刚是在直接问我是谁。',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-identity',
      lane: 'identity',
      strategy: 'compact-one-shot',
    }))
  })

  it('serves reordered current time turns from the active dialogue local lane', async () => {
    const input = createInput({
      key: 'card-1::turn-time-reordered',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-reordered',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '几点了现在' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '几点了现在' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(1)
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/\d{2}:\d{2}/)
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.thought).toMatch(/focus=local(?:-|\s)time/u)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-reordered',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-mind-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-reordered',
      lane: 'utility-time',
    }))
  })

  it('keeps continuity-check after a time answer on compact utility-time lane', async () => {
    const input = createInput({
      key: 'card-1::turn-time-confirm',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-confirm',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点？' },
          { role: 'assistant' as const, content: '现在是 16:33，星期二。' },
          { role: 'user' as const, content: '你确定吗？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '现在几点？' },
          { role: 'assistant' as const, content: '现在是 16:33，星期二。' },
          { role: 'user' as const, content: '你确定吗？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(1)
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/现在是|这会儿是|此刻/u)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-confirm',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
      resolvedTimeZoneSource: 'context-hint',
      reasonCodes: expect.arrayContaining(['continuity-check-time-confirm']),
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-mind-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-confirm',
      lane: 'utility-time',
    }))
  })

  it('routes short execution follow-up turns back onto the main llm stream when memory payoff should stay authored', async () => {
    const input = createInput({
      key: 'card-1::turn-follow-up',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-follow-up',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
          { role: 'user' as const, content: '另外还有哪四项？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
          { role: 'user' as const, content: '另外还有哪四项？' },
        ] as Message[],
      })),
      resolveActiveDialogueDeterministicReply: vi.fn(async () => JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=桌面清单; move=pay-off-specific-result; tone=direct',
        emotion: 'thinking',
        reply: '另外 4 项是：A、B、C、D。剩下还有 4 项，你要我就继续沿这条桌面清单接着列。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'firm',
          emphasis: 0,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-follow-up',
      lane: 'follow-up',
      strategy: 'compact-one-shot',
    }))
  })

  it('routes direct remaining-item listing questions onto the main llm stream when they are memory payoff turns', async () => {
    const input = createInput({
      key: 'card-1::turn-follow-up-remaining-files',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-follow-up-remaining-files',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '桌面里现在有 12 项，先能确认到这些：105ND800、23软工1班青浩洋23434010116.doc、GIT、c++、.DS_Store、.localized，另外还有 6 项。' },
          { role: 'user' as const, content: '另外六项是什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '桌面里现在有 12 项，先能确认到这些：105ND800、23软工1班青浩洋23434010116.doc、GIT、c++、.DS_Store、.localized，另外还有 6 项。' },
          { role: 'user' as const, content: '另外六项是什么文件' },
        ] as Message[],
      })),
      resolveActiveDialogueDeterministicReply: vi.fn(async () => JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=remembered; focus=桌面剩余文件; move=pay-off-specific-result; tone=direct',
        emotion: 'thinking',
        reply: '另外 6 项是：javaidea、other、小砖猿、A、B、C。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'firm',
          emphasis: 0,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-follow-up-remaining-files',
      lane: 'follow-up',
      strategy: 'compact-one-shot',
    }))
  })

  it('lets humanity critique turns stay on the main stream path instead of the compact presence-repair lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '你说得对，我上一句像流程播报，不像真的在和你说话。',
    }))
    const input = createInput({
      key: 'card-1::turn-presence-critique',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-presence-critique',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你说话不像人类呢？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你说话不像人类呢？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: '你说得对，我上一句像流程播报，不像真的在和你说话。',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-presence-critique',
      lane: 'presence-critique',
      strategy: 'compact-one-shot',
    }))
  })

  it('defers greeting turns to the full main runtime before any compact one-shot path runs', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '你好。今天想从哪件事开始？',
    }))

    const input = createInput({
      key: 'card-1::turn-greeting-escalate',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-greeting-escalate',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你好' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你好' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-greeting-escalate',
      lane: 'greeting',
      strategy: 'compact-one-shot',
    }))
    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: '你好。今天想从哪件事开始？',
    }))
  })

  it('defers identity turns to the full main runtime before any compact one-shot path runs', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '我是 Alicization。你刚刚在直接问我是谁。',
    }))

    const input = createInput({
      key: 'card-1::turn-identity-escalate',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-identity-escalate',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你是谁' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你是谁' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-identity-escalate',
      lane: 'identity',
      strategy: 'compact-one-shot',
    }))
    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: '我是 Alicization。你刚刚在直接问我是谁。',
    }))
  })

  it('lets repair-clarify complaints stay on the main stream path instead of the compact fast lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '刚才我答偏了，现在是 10:30，星期二。',
    }))
    const input = createInput({
      key: 'card-1::turn-repair',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-repair',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
          { role: 'assistant' as const, content: '我直接沿刚才「早上好呀」这条继续。' },
          { role: 'user' as const, content: '你在说啥呢' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
          { role: 'assistant' as const, content: '我直接沿刚才「早上好呀」这条继续。' },
          { role: 'user' as const, content: '你在说啥呢' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: '刚才我答偏了，现在是 10:30，星期二。',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-repair',
      lane: 'repair-clarify',
      strategy: 'compact-one-shot',
    }))
  })

  it('derives resident performance from runtime surface and passes it to stream meta emitter', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-1',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                contentKind: 'error',
                workloadKind: 'coding',
                summary: 'focus on a failing diff line',
                confidence: 0.86,
              },
              attention: {
                confidence: 0.82,
                target: {
                  appName: 'Visual Studio Code',
                  title: 'index.ts',
                },
              },
              captureState: {
                permission: 'granted',
                health: 'healthy',
                degradedReason: null,
                lastGroundedAt: Date.now(),
              },
              updatedAt: 12_345,
            },
            cognition: {
              privateThought: {
                confidence: 0.92,
                stance: 'care',
                embodiedPresence: 'concerned',
                emotionalTension: 'calm-browse',
                rationaleTags: ['guard-the-current-diff'],
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const metaEmitterInput = vi.mocked(createAlicizationChatStreamMetaEmitter).mock.calls[0]?.[0]
    expect(metaEmitterInput).toBeTruthy()
    const residentPerformance = metaEmitterInput?.getResidentPerformance?.()
    const runtimeDigest = metaEmitterInput?.getRuntimeDigest?.()
    expect(residentPerformance).toEqual(expect.objectContaining({
      source: 'main-runtime',
      embodiedPresence: 'concerned',
      performance: expect.objectContaining({
        baseEmotion: 'concerned',
        delivery: 'firm',
        emphasis: 2,
      }),
      updatedAt: 12_345,
    }))
    if (runtimeDigest) {
      expect(runtimeDigest).toEqual(expect.objectContaining({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: expect.any(String),
      }))
    }
  })

  it('delegates failures to the lifecycle helper with wrapped recovery callbacks', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue('recovered reply')
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        hasVisualGrounding: true,
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    expect(failureInput).toBeTruthy()
    expect(failureInput?.timeoutRecoveryMs).toBe(timeoutRecoveryWithVisualGroundingMs)
    expect(failureInput?.timeoutRecoveryMode).toBe('original')

    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })
    expect(recoveryResult).toEqual({
      recoveredReply: expect.objectContaining({
        fullText: 'recovered reply',
        visibleReplyExecution: expect.objectContaining({
          mode: 'provider-one-shot',
        }),
      }),
      recoveryMode: 'non-streaming',
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-finished', {
      cardId: 'card-1',
      turnId: 'turn-1',
      chunkCount: 1,
      rawChunkChars: 'recovered reply'.length,
      finalChars: 'recovered reply'.length,
      recoveryMode: 'non-streaming',
    })

    failureInput?.emitError('boom')
    expect(input.emitError).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-1',
      error: 'boom',
    })
  })

  it('strips optional tools during timeout recovery when execution routing is not forced', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue('recovered without tools')
    const tools = [{ name: 'filesystem::read_file' }] as any
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        tools,
        toolChoice: undefined,
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    expect(failureInput).toBeTruthy()
    expect(failureInput?.timeoutRecoveryMode).toBe('tools-disabled')

    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools,
      toolChoice: undefined,
      timeoutMs: 1500,
    })

    expect(recoveryResult).toEqual({
      recoveredReply: expect.objectContaining({
        fullText: 'recovered without tools',
        visibleReplyExecution: expect.objectContaining({
          mode: 'provider-one-shot',
        }),
      }),
      recoveryMode: 'tools-disabled',
    })
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 25_000,
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-finished', {
      cardId: 'card-1',
      turnId: 'turn-1',
      chunkCount: 1,
      rawChunkChars: 'recovered without tools'.length,
      finalChars: 'recovered without tools'.length,
      recoveryMode: 'tools-disabled',
    })
  })

  it('falls back to minimal-context non-streaming recovery when primary timeout recovery fails', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockRejectedValueOnce(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))
      .mockResolvedValueOnce('recovered from minimal context')

    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'system', content: 'core-1' },
          { role: 'system', content: 'core-2' },
          { role: 'system', content: 'core-3' },
          { role: 'system', content: 'dynamic-memory' },
          { role: 'user', content: '之前我们讨论过部署风险' },
          { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
          { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'system', content: 'core-1' },
        { role: 'system', content: 'core-2' },
        { role: 'system', content: 'core-3' },
        { role: 'system', content: 'dynamic-memory' },
        { role: 'user', content: '之前我们讨论过部署风险' },
        { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
        { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })

    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(2)
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 32_000,
    }))
    expect(recoveryResult).toEqual({
      recoveredReply: expect.objectContaining({
        fullText: 'recovered from minimal context',
        visibleReplyExecution: expect.objectContaining({
          mode: 'provider-one-shot',
        }),
      }),
      recoveryMode: 'minimal-context-non-streaming',
    })
  })

  it('falls back to generic one-shot timeout recovery for ordinary dialogue turns', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue(JSON.stringify({
      reply: '先别把所有事情一次摊开。你先说现在最压着你的那一件，我们就从那里落手。',
      thought: 'obligation=guide; truth=live-grounded; focus=old-thread; move=drift-away; tone=direct',
      emotion: 'concerned',
      performance: {
        delivery: 'gentle',
      },
    }))
    const dialogueGovernance = {
      answerSubject: 'relationship',
      screenReferenceMode: 'avoid',
    } as any
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        governance: dialogueGovernance,
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user' as const, content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
        ] as Message[],
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: dialogueGovernance,
          trace: {
            decisionTraceId: 'trace-dialogue-compact',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 25_000,
    })

    expect(recoveryResult?.recoveryMode).toBe('non-streaming')
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      chatConfig: createPrepared().chatConfig,
      headers: input.headers,
      maxSteps: 2,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 25_000,
      messages: [
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ],
    }))
  })

  it('escalates invalid compact utility timeout candidates into the generic non-streaming retry chain', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockImplementationOnce(async () => JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '现在是 99:99，星期二。',
      }))
      .mockImplementationOnce(async () => JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '现在是 99:99，星期二。',
      }))
      .mockImplementationOnce(async () => buildAuthoritativeShanghaiTimeReply())

    const input = createInput({
      key: 'card-1::turn-time-timeout-escalated',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-timeout-escalated',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '现在几点了？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    expect(recoveryResult?.recoveryMode).toBe('non-streaming')
    expect(recoveryResult?.recoveredReply.fullText).toMatch(/现在是 \d{2}:\d{2}，星期/u)
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(3)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-attempt-failed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-timeout-escalated',
      recoveryMode: 'active-dialogue-compact',
      reason: 'active-dialogue-invalid-compact-reply:utility-time',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-finished', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-timeout-escalated',
      recoveryMode: 'non-streaming',
    }))
  })

  it('recovers stream required-tool-missing by deterministic executor dispatch', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new AlicizationRequiredToolMissingError({
      stage: 'stream',
      finishReason: 'stop',
      requiredToolNames: ['executor_run_cli'],
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=execution-result; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '这条结果已经确认落稳了：Desktop files: alpha.txt, beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      summary: 'Desktop files: alpha.txt, beta.md',
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-required-tool',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-required-tool',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(executeDeterministicTool).toHaveBeenCalledWith(expect.objectContaining({
      command: 'ls',
      args: ['-la', '~/Desktop'],
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'executor_run_cli',
      arguments: expect.objectContaining({
        command: 'ls',
      }),
    }))
    expect(input.emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({
        summary: 'Desktop files: alpha.txt, beta.md',
      }),
    }))
    const recoveredChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(recoveredChunk).toEqual({
      cardId: 'card-1',
      turnId: 'turn-required-tool',
      text: expect.any(String),
    })
    expect(recoveredChunk?.text).toMatch(/确认|落下|跑完|跑到结尾|有结果|收束成结果/u)
    expect(recoveredChunk?.text).toContain('Desktop files: alpha.txt, beta.md')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.format).toBe('mind-turn-v1')
    expect(finishedStructured.reply).toContain('Desktop files: alpha.txt, beta.md')
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'required-tool-recovered',
      fullText: expect.any(String),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
      }),
    })
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('prefers deterministic required-tool recovery before timeout one-shot retries for execution turns', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockRejectedValue(new Error('should-not-run'))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=execution-result; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '这条结果已经确认落稳了：Desktop files: alpha.txt, beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      summary: 'Desktop files: alpha.txt, beta.md',
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-timeout-required-tool',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-timeout-required-tool',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
      ] as Message[],
      headers: input.headers,
      tools: [
        {
          function: { name: 'executor_run_cli' },
          execute: executeDeterministicTool,
        },
      ] as any,
      toolChoice: {
        type: 'function',
        function: { name: 'executor_run_cli' },
      },
      timeoutMs: 1500,
    })

    expect(recoveryResult?.recoveryMode).toBe('deterministic-required-tool')
    const recoveryPayload = parseStructuredMindTurn(recoveryResult?.recoveredReply.fullText ?? '')
    expect(recoveryPayload.format).toBe('mind-turn-v1')
    expect(recoveryPayload.reply).toMatch(/确认|落下|跑完|跑到结尾|有结果|收束成结果/u)
    expect(recoveryPayload.reply).toContain('Desktop files: alpha.txt, beta.md')
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    expect(executeDeterministicTool).toHaveBeenCalled()
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'executor_run_cli',
    }))
    expect(input.emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({
        summary: 'Desktop files: alpha.txt, beta.md',
      }),
    }))
  })

  it('routes explicit executor turns through execution-first inline dispatch and suppresses same-turn delivery callbacks', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-inline',
      threadId: 'thread-inline',
      completedAt: 123456,
      summary: 'Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
      output: 'Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming)
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '结果是：Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
    const suppressInlineExecutionDeliveries = vi.fn(async () => {})
    const input = createInput({
      key: 'card-1::turn-inline',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      suppressInlineExecutionDeliveries,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-execution-first',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'execute',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(executeDeterministicTool).toHaveBeenCalledWith(expect.objectContaining({
      command: 'ls',
      args: ['-la', '~/Desktop'],
    }))
    expect(generateAlicizationMainChatNonStreaming).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: 9_000,
    }))
    const emittedText = vi.mocked(input.emitChunk).mock.calls.map(call => call[0]?.text ?? '').join('\n')
    expect(emittedText).not.toContain('Listed desktop entries')
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, expect.objectContaining({
      status: 'completed',
      finishReason: 'execution-first-inline',
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
      }),
    }))
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.execution-first-inline-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline',
      actionKind: 'execute',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.visible-reply-second-pass-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline',
    }))
  })

  it('does not emit deterministic repaired inline execution wording when second-pass is still invalid', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-inline',
      threadId: 'thread-inline',
      completedAt: 123456,
      summary: 'Desktop files: alpha.txt, beta.md',
      output: 'Desktop files: alpha.txt, beta.md',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: 'Listed desktop entries (2): alpha.txt, beta.md',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '我把这条结果重新收稳了：Desktop files: alpha.txt, beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const input = createInput({
      key: 'card-1::turn-inline-second-pass',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline-second-pass',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-execution-inline-second-pass',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'execute',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const emittedText = vi.mocked(input.emitChunk).mock.calls.map(call => call[0]?.text ?? '').join('\n')
    expect(emittedText).not.toContain('Listed desktop entries')
    expect(input.runStateController.finishRun).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.visible-reply-second-pass-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline-second-pass',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.execution-first-inline-failed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline-second-pass',
    }))
  })

  it('uses minimal infra repair instead of local contentful dialogue fallback when stream and one-shot recoveries both time out', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockRejectedValue(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockRejectedValue(new Error('one-shot exploded'))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-local-fallback',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0] as {
      recoverFromTimeout?: unknown
    } | undefined

    expect(typeof failureInput?.recoverFromTimeout).toBe('function')
  })

  it('tries compact governed dialogue recovery before local fallback when full-runtime dialogue stays llm-authored', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=answer; tone=warm',
      emotion: 'thinking',
      reply: '我不绕壳，直接接你这句：先把接下来两小时排稳，再拆最乱的那一件。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'firm',
        emphasis: 0,
      },
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-compact-dialogue-timeout-recovered',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })

    expect(recoveryResult?.recoveryMode).toBe('active-dialogue-compact')
    expect(vi.mocked(recoverAlicizationMainChatFromTimeout)).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
      ]),
    }))
  })
})
