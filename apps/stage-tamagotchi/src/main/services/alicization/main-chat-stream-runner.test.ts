import { afterEach, describe, expect, it, vi } from 'vitest'

import { runAlicizationMainChatStream } from './main-chat-stream-runner'

function createPrepared(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      { role: 'user', content: '你好' },
    ],
    waitForTools: true,
    tools: undefined,
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
  } as any
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

afterEach(() => {
  vi.useRealTimers()
})

describe('main chat stream runner', () => {
  it('uses the visual grounding one-shot path when capture grounding is required', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const streamTextImpl = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
      }),
      headers: {
        authorization: 'Bearer test',
      },
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
      streamTextImpl,
    })

    expect(result).toEqual({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    })
    expect(generateNonStreaming).toHaveBeenCalledOnce()
    expect(streamTextImpl).not.toHaveBeenCalled()
    expect(incrementChunkStats).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-1',
      text: '我先看着这个窗口。',
    })
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

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-2',
      } as any,
      prepared: createPrepared(),
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
        await emit({ type: 'text-delta', text: '你好' })
        await emit({ type: 'tool-call', name: 'set_reminder', toolCallId: 'call-1', arguments: { minutes: 5 } })
        await emit({
          type: 'tool-result',
          toolCallId: 'call-1',
          result: {
            status: 'scheduled',
            triggerAt: 123456,
            message: '5分钟后提醒',
          },
        })
        await emit({ type: 'text-delta', text: '。' })
        await emit({ type: 'finish', finishReason: 'tool_calls' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result).toEqual({
      finishReason: 'stop',
      fullText: '你好。',
    })
    expect([...nonProgressEventTypes]).toEqual(['provider-keepalive'])
    expect(incrementChunkStats).toHaveBeenNthCalledWith(1, '你好')
    expect(incrementChunkStats).toHaveBeenNthCalledWith(2, '。')
    expect(emitChunk).toHaveBeenNthCalledWith(1, {
      cardId: 'card-1',
      turnId: 'turn-2',
      text: '你好',
    })
    expect(emitChunk).toHaveBeenNthCalledWith(2, {
      cardId: 'card-1',
      turnId: 'turn-2',
      text: '。',
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

  it('aborts with a first-event-timeout when the stream never produces progress', async () => {
    vi.useFakeTimers()

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-timeout',
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
      streamTextImpl: () => new Promise(() => {}),
    })
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(25)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })
  })

  it('records debug diagnostics when the stream settles without a progress event', async () => {
    const appendRuntimeDebugLine = vi.fn(async () => {})

    await expect(runAlicizationMainChatStream({
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
    })).rejects.toMatchObject({
      name: 'AbortError',
    })

    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.non-progress-event', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      eventType: 'response-metadata',
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-fired', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      lastEventType: 'response-metadata',
      nonProgressEventTypes: ['response-metadata'],
    }))
  })
})
