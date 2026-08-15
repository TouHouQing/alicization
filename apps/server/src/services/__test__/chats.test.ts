import type { Database } from '../../libs/db'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createChatService } from '../chats'

const xsaiMocks = vi.hoisted(() => ({
  createOpenAI: vi.fn(),
  streamText: vi.fn(),
}))

vi.mock('@xsai-ext/providers/create', () => ({
  createOpenAI: xsaiMocks.createOpenAI,
}))

vi.mock('@xsai/stream-text', () => ({
  streamText: xsaiMocks.streamText,
}))

function createPayload() {
  return {
    turnId: 'turn-stream-lifecycle',
    providerId: 'openai-compatible',
    model: 'gpt-test',
    providerConfig: {
      apiKey: 'sk-test',
      baseUrl: 'https://example.test/v1',
    },
    messages: [{
      role: 'user' as const,
      content: '请继续。',
    }],
  }
}

function createService() {
  return createChatService({} as Database)
}

function createFullStream(events: unknown[]) {
  return new ReadableStream({
    start(controller) {
      for (const event of events)
        controller.enqueue(event)
      controller.close()
    },
  })
}

function createPendingFullStream(onCancel?: (reason: unknown) => void) {
  return new ReadableStream({
    cancel(reason) {
      onCancel?.(reason)
    },
  })
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs = 100) {
  return await Promise.race([
    promise.then(
      value => ({ status: 'resolved' as const, value }),
      error => ({ status: 'rejected' as const, error }),
    ),
    new Promise<{ status: 'pending' }>(resolve => setTimeout(
      () => resolve({ status: 'pending' }),
      timeoutMs,
    )),
  ])
}

describe('chatService stream lifecycle', () => {
  beforeEach(() => {
    xsaiMocks.createOpenAI.mockReset()
    xsaiMocks.streamText.mockReset()
    xsaiMocks.createOpenAI.mockReturnValue({
      chat: vi.fn(() => ({
        baseURL: 'https://example.test/v1/',
        model: 'gpt-test',
      })),
    })
  })

  it('keeps abort handling alive after streamText synchronously returns', async () => {
    const cancelled = vi.fn()
    xsaiMocks.streamText.mockReturnValue({
      fullStream: createPendingFullStream(cancelled),
    })

    const controller = new AbortController()
    const streamPromise = createService().streamChat(createPayload(), {
      signal: controller.signal,
      onEvent: vi.fn(),
    })

    await Promise.resolve()
    controller.abort(new Error('user cancelled the live stream'))

    const outcome = await settleWithin(streamPromise)
    expect(outcome).toMatchObject({
      status: 'rejected',
      error: expect.objectContaining({
        message: 'user cancelled the live stream',
      }),
    })
    expect(cancelled).toHaveBeenCalledTimes(1)
  })

  it('rejects an already-aborted request before starting the provider stream', async () => {
    const controller = new AbortController()
    controller.abort(new DOMException('request already cancelled', 'AbortError'))

    const streamPromise = createService().streamChat(createPayload(), {
      signal: controller.signal,
      onEvent: vi.fn(),
    })

    await expect(streamPromise).rejects.toMatchObject({
      name: 'AbortError',
      message: 'request already cancelled',
    })
    expect(xsaiMocks.streamText).not.toHaveBeenCalled()
  })

  it('rejects when the fullStream reader fails', async () => {
    xsaiMocks.streamText.mockReturnValue({
      fullStream: new ReadableStream({
        start(controller) {
          controller.error(new Error('provider stream disconnected'))
        },
      }),
    })

    const streamPromise = createService().streamChat(createPayload(), {
      onEvent: vi.fn(),
    })

    const outcome = await settleWithin(streamPromise)
    expect(outcome).toMatchObject({
      status: 'rejected',
      error: expect.objectContaining({
        message: 'provider stream disconnected',
      }),
    })
  })

  it('does not treat an intermediate tool_calls finish as the end of a tool-waiting stream', async () => {
    xsaiMocks.streamText.mockReturnValue({
      fullStream: createFullStream([
        {
          type: 'finish',
          finishReason: 'tool_calls',
        },
        {
          type: 'tool-call',
          toolCallId: 'tool-codex-wait-1',
          toolName: 'executor_run_codex',
          args: {
            prompt: 'inspect',
          },
        },
        {
          type: 'tool-result',
          toolCallId: 'tool-codex-wait-1',
          result: {
            ok: true,
          },
        },
        {
          type: 'text-delta',
          text: '检查完成。',
        },
        {
          type: 'finish',
          finishReason: 'stop',
        },
      ]),
    })

    const events: unknown[] = []
    await createService().streamChat({
      ...createPayload(),
      waitForTools: true,
    }, {
      onEvent: (event) => {
        events.push(event)
      },
    })

    expect(events).toEqual([
      {
        type: 'tool-call',
        toolCallId: 'tool-codex-wait-1',
        toolName: 'executor_run_codex',
        args: '{"prompt":"inspect"}',
        toolCallType: 'function',
      },
      {
        type: 'tool-result',
        toolCallId: 'tool-codex-wait-1',
        result: {
          ok: true,
        },
      },
      {
        type: 'text-delta',
        text: '检查完成。',
      },
      {
        type: 'finish',
        finishReason: 'stop',
        usage: undefined,
      },
    ])
  })

  it('forwards reasoning and tool argument streaming as provider progress without exposing reasoning text', async () => {
    xsaiMocks.streamText.mockReturnValue({
      fullStream: createFullStream([
        {
          type: 'reasoning-delta',
          text: 'private chain of thought',
        },
        {
          type: 'tool-call-streaming-start',
          toolCallId: 'tool-codex-1',
          toolName: 'executor_run_codex',
        },
        {
          type: 'tool-call-delta',
          toolCallId: 'tool-codex-1',
          toolName: 'executor_run_codex',
          argsTextDelta: '{"prompt":"scan',
        },
        {
          type: 'finish',
          finishReason: 'stop',
        },
      ]),
    })

    const events: unknown[] = []
    await createService().streamChat(createPayload(), {
      onEvent: (event) => {
        events.push(event)
      },
    })

    expect(events).toEqual([
      {
        type: 'provider-progress',
        phase: 'reasoning',
      },
      {
        type: 'provider-progress',
        phase: 'tool-input',
        toolCallId: 'tool-codex-1',
        toolName: 'executor_run_codex',
      },
      {
        type: 'provider-progress',
        phase: 'tool-input',
        toolCallId: 'tool-codex-1',
        toolName: 'executor_run_codex',
      },
      {
        type: 'finish',
        finishReason: 'stop',
        usage: undefined,
      },
    ])
    expect(JSON.stringify(events)).not.toContain('private chain of thought')
    expect(JSON.stringify(events)).not.toContain('argsTextDelta')
  })

  it('emits finish and settles only once when a provider reports duplicate finish events', async () => {
    xsaiMocks.streamText.mockReturnValue({
      fullStream: createFullStream([
        {
          type: 'text-delta',
          text: '完成',
        },
        {
          type: 'finish',
          finishReason: 'stop',
        },
        {
          type: 'finish',
          finishReason: 'stop',
        },
      ]),
    })

    const onEvent = vi.fn()
    await createService().streamChat(createPayload(), { onEvent })

    expect(onEvent).toHaveBeenCalledWith({
      type: 'text-delta',
      text: '完成',
    })
    expect(onEvent.mock.calls.filter(([event]) => event.type === 'finish')).toHaveLength(1)
  })
})
