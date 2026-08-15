import type { ChatProvider } from '@xsai-ext/providers/utils'

import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const streamTextMock = vi.hoisted(() => vi.fn())

vi.mock('@xsai/stream-text', () => ({
  streamText: streamTextMock,
}))

vi.mock('../tools', () => ({
  debug: async () => [],
  mcp: async () => [],
}))

function createChatProviderStub(): ChatProvider {
  return {
    chat: () => ({
      baseURL: 'https://example.test/v1/',
      model: 'mock-model',
    }),
  } as ChatProvider
}

describe('llm stream abort handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    streamTextMock.mockReset()
  })

  it('rejects when the abort signal fires before the provider emits finish/error', async () => {
    const { useLLM } = await import('./llm')
    const store = useLLM()
    const controller = new AbortController()

    streamTextMock.mockImplementation(() => undefined)

    const pending = store.stream('mock-model', createChatProviderStub(), [
      { role: 'user', content: 'hello' },
    ], {
      abortSignal: controller.signal,
    })

    controller.abort(new DOMException('Aborted', 'AbortError'))

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('passes an explicitly selected native response format to xsAI', async () => {
    const { useLLM } = await import('./llm')
    const store = useLLM()

    streamTextMock.mockImplementation((input: { onEvent?: (event: unknown) => void }) => {
      void input.onEvent?.({ type: 'finish', finishReason: 'stop' })
    })

    await store.stream('mock-model', createChatProviderStub(), [
      { role: 'user', content: 'hello' },
    ], {
      responseFormat: alicizationProviderResponseFormat,
    })

    expect(streamTextMock).toHaveBeenCalledWith(expect.objectContaining({
      responseFormat: alicizationProviderResponseFormat,
    }))
  })

  it('consumes ordered provider events from fullStream when onEvent is unused', async () => {
    const events: unknown[] = []
    streamTextMock.mockImplementation(() => ({
      fullStream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', text: '你好。' })
          controller.enqueue({ type: 'finish', finishReason: 'stop' })
          controller.close()
        },
      }),
    }))

    const { useLLM } = await import('./llm')
    const store = useLLM()

    await store.stream('mock-model', createChatProviderStub(), [
      { role: 'user', content: 'hello' },
    ], {
      onStreamEvent: (event) => {
        events.push(event)
      },
    })

    expect(events).toEqual([
      { type: 'text-delta', text: '你好。' },
      { type: 'finish', finishReason: 'stop' },
    ])
  })

  it('rejects errors surfaced by the xsAI fullStream result', async () => {
    const { useLLM } = await import('./llm')
    const store = useLLM()
    const schemaError = new Error('Remote sent 400 response: response_format json_schema is unsupported')

    streamTextMock.mockImplementation((input: { onEvent?: (event: unknown) => void }) => {
      setTimeout(() => {
        void input.onEvent?.({ type: 'finish', finishReason: 'stop' })
      }, 0)
      return {
        fullStream: new ReadableStream({
          start(controller) {
            controller.error(schemaError)
          },
        }),
      }
    })

    await expect(store.stream('mock-model', createChatProviderStub(), [
      { role: 'user', content: 'hello' },
    ], {
      responseFormat: alicizationProviderResponseFormat,
    })).rejects.toBe(schemaError)
  })

  it('rejects a fullStream that reaches EOF without a terminal finish event', async () => {
    streamTextMock.mockImplementation(() => ({
      fullStream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', text: '截断的回复' })
          controller.close()
        },
      }),
    }))

    const { useLLM } = await import('./llm')
    const store = useLLM()

    await expect(store.stream('mock-model', createChatProviderStub(), [
      { role: 'user', content: 'hello' },
    ])).rejects.toThrow('Provider stream closed before a finish event.')
  })
})
