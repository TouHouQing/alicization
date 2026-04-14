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

const firstEventTimeoutMs = 45_000
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
  mainChatFirstEventTimeoutMs: 45_000,
  mainChatFirstEventTimeoutWithVisualGroundingMs: 90_000,
  mainChatTimeoutRecoveryMs: 12_000,
  mainChatTimeoutRecoveryWithVisualGroundingMs: 30_000,
  normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
  sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
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

function readFinishedPayload(input: Parameters<typeof runAlicizationMainChatBackground>[0]) {
  return vi.mocked(input.runStateController.finishRun).mock.calls[0]?.[1]
}

describe('main chat background run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue(JSON.stringify({
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
    }))
  })

  it('prepares and completes a background stream run', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue({
      finishReason: 'stop',
      fullText: 'hello',
    })
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
    })
  })

  it('serves simple greeting turns from the active dialogue local mind lane', async () => {
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

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toContain('你好')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.format).toBe('mind-turn-v1')
    expect(finishedStructured.reply).toContain('你好')
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'active-dialogue-local',
      fullText: expect.any(String),
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-greeting',
      lane: 'greeting',
      strategy: 'local-only',
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
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/\d{2}:\d{2}/)
    expect(emittedChunk?.text).toContain('星期')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.thought).toContain('focus=local time')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time',
      lane: 'utility-time',
      strategy: 'local-only',
    }))
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'active-dialogue-local',
      fullText: expect.any(String),
    })
  })

  it('serves identity questions from the active dialogue local mind lane instead of collapsing them into capability text', async () => {
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

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toContain('我是 Alicization')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.thought).toContain('obligation=answer')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-identity',
      lane: 'identity',
      strategy: 'local-only',
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
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/\d{2}:\d{2}/)
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.thought).toContain('focus=local time')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-reordered',
      lane: 'utility-time',
      strategy: 'local-only',
    }))
  })

  it('routes short execution follow-up turns onto the deterministic payoff lane instead of the heavy stream', async () => {
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

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toContain('另外 4 项是')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-follow-up',
      lane: 'follow-up',
      strategy: 'deterministic-payoff',
    }))
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.reply).toContain('另外 4 项是')
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, expect.objectContaining({
      status: 'completed',
      finishReason: 'active-dialogue-deterministic',
      fullText: expect.any(String),
    }))
  })

  it('routes direct remaining-item listing questions onto deterministic execution follow-up instead of dialogue shell fallback', async () => {
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

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toContain('另外 6 项是')
    expect(emittedChunk?.text).not.toContain('这条线还连着')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-follow-up-remaining-files',
      lane: 'follow-up',
      strategy: 'deterministic-payoff',
    }))
  })

  it('answers humanity critique turns from the local presence-repair lane instead of thread-shell fallback', async () => {
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

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/流程播报|真的在和你说话/u)
    expect(emittedChunk?.text).not.toContain('这条线还连着')
    expect(emittedChunk?.text).not.toContain('我可以直接续')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-presence-critique',
      lane: 'presence-critique',
      strategy: 'local-only',
    }))
  })

  it('repairs a misthreaded complaint from the local mind lane instead of re-entering the heavy stream path', async () => {
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

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toContain('刚才我答偏了')
    expect(emittedChunk?.text).toContain('现在是')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.thought).toContain('obligation=repair')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-repair',
      lane: 'repair-clarify',
      strategy: 'local-only',
    }))
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'active-dialogue-local',
      fullText: expect.any(String),
    })
  })

  it('derives resident performance from runtime surface and passes it to stream meta emitter', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue({
      finishReason: 'stop',
      fullText: 'hello',
    })
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
      recoveredText: 'recovered reply',
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
      recoveredText: 'recovered without tools',
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
      recoveredText: 'recovered from minimal context',
      recoveryMode: 'minimal-context-non-streaming',
    })
  })

  it('prefers governed compact dialogue recovery before generic one-shot timeout recovery', async () => {
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

    expect(recoveryResult?.recoveryMode).toBe('active-dialogue-compact')
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 9_000,
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('[ALICIZATION_ACTIVE_DIALOGUE_GOVERNANCE]'),
        }),
      ]),
    }))
    const recoveredPayload = parseStructuredMindTurn(recoveryResult?.recoveredText ?? '')
    expect(recoveredPayload.format).toBe('mind-turn-v1')
    expect(recoveredPayload.reply).toContain('现在最压着你的那一件')
    expect(recoveredPayload.thought).toContain('obligation=answer')
    expect(recoveredPayload.thought).not.toContain('obligation=guide')
  })

  it('recovers stream required-tool-missing by deterministic executor dispatch', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new AlicizationRequiredToolMissingError({
      stage: 'stream',
      finishReason: 'stop',
      requiredToolNames: ['executor_run_cli'],
    }))
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
    expect(recoveredChunk?.text).toMatch(/确认|落下|跑完|跑到结尾|有结果/u)
    expect(recoveredChunk?.text).toContain('Desktop files: alpha.txt, beta.md')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.format).toBe('mind-turn-v1')
    expect(finishedStructured.reply).toContain('Desktop files: alpha.txt, beta.md')
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'required-tool-recovered',
      fullText: expect.any(String),
    })
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('prefers deterministic required-tool recovery before timeout one-shot retries for execution turns', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockRejectedValue(new Error('should-not-run'))
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
    const recoveryPayload = parseStructuredMindTurn(recoveryResult?.recoveredText ?? '')
    expect(recoveryPayload.format).toBe('mind-turn-v1')
    expect(recoveryPayload.reply).toMatch(/确认|落下|跑完|跑到结尾|有结果/u)
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
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValue({
      finishReason: 'stop',
      fullText: JSON.stringify({
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
    expect(suppressInlineExecutionDeliveries).toHaveBeenCalledWith({
      cardId: 'card-1',
      entries: [
        {
          sessionId: 'session-inline',
          threadId: 'thread-inline',
          completedAt: 123456,
        },
      ],
    })
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toContain('桌面')
    expect(generateAlicizationMainChatNonStreaming).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: 9_000,
    }))
    expect(emittedChunk?.text).toContain('13 项')
    expect(emittedChunk?.text).toContain('小砖猿')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? ''))
    expect(finishedStructured.format).toBe('mind-turn-v1')
    expect(finishedStructured.reply).toContain('13 项')
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'execution-first-inline',
      fullText: expect.any(String),
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.execution-first-inline-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline',
      actionKind: 'execute',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.execution-first-inline-finished', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline',
      toolName: 'executor_run_cli',
    }))
  })

  it('emits local continuity fallback text when stream and one-shot recoveries both time out', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockRejectedValueOnce(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))
      .mockRejectedValueOnce(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-local-fallback',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，想先把接下来两小时安排好' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，想先把接下来两小时安排好' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '我今天状态有点乱，想先把接下来两小时安排好' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })

    expect(recoveryResult?.recoveryMode).toBe('local-fallback')
    expect(recoveryResult?.recoveredText).toContain('两小时')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-local-fallback', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-local-fallback',
      actionKind: null,
    }))
  })
})
