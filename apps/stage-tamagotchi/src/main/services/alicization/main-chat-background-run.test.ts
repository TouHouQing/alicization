import type { Message } from '@xsai/shared-chat'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runAlicizationMainChatBackground } from './main-chat-background-run'
import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
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
  extractAllowedToolNamesFromToolChoice: vi.fn(() => []),
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
      { role: 'user' as const, content: '你好' },
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
        { role: 'user' as const, content: '你好' },
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

describe('main chat background run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    const recoveredText = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })
    expect(recoveredText).toBe('recovered reply')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-finished', {
      cardId: 'card-1',
      turnId: 'turn-1',
      chunkCount: 1,
      rawChunkChars: 'recovered reply'.length,
      finalChars: 'recovered reply'.length,
      recoveryMode: 'original',
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

    const recoveredText = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools,
      toolChoice: undefined,
      timeoutMs: 1500,
    })

    expect(recoveredText).toBe('recovered without tools')
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
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
})
