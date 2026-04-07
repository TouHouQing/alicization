import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'

function createInput(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      { role: 'user', content: '你好' },
    ],
    headers: {
      authorization: 'Bearer test',
    },
    tools: undefined,
    toolChoice: undefined,
    timeoutMs: 2500,
    ...overrides,
  } as any
}

afterEach(() => {
  vi.useRealTimers()
})

describe('main chat one-shot', () => {
  it('generates visual one-shot replies with trimmed text and normalized finish reasons', async () => {
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      expect(input.maxSteps).toBe(10)
      expect(input.headers).toEqual({
        authorization: 'Bearer test',
      })
      return {
        text: '  我正在看着这里。  ',
        finishReason: 'stop',
      }
    })

    const result = await generateAlicizationMainChatNonStreaming(createInput({
      generateTextImpl,
    }))

    expect(result).toEqual({
      finishReason: 'stop',
      fullText: '我正在看着这里。',
    })
    expect(generateTextImpl).toHaveBeenCalledOnce()
  })

  it('uses a one-step generation for timeout recovery', async () => {
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      expect(input.maxSteps).toBe(1)
      return {
        text: '  recovered reply  ',
        finishReason: 'length',
      }
    })

    const result = await recoverAlicizationMainChatFromTimeout(createInput({
      generateTextImpl,
    }))

    expect(result).toBe('recovered reply')
    expect(generateTextImpl).toHaveBeenCalledOnce()
  })

  it('forwards function tool choices during timeout recovery', async () => {
    const toolChoice = {
      type: 'function',
      function: { name: 'executor_run_cli' },
    } as const
    const tools = [{
      type: 'function',
      function: {
        name: 'executor_run_cli',
        parameters: {},
      },
    }] as any
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      expect(input.toolChoice).toEqual(toolChoice)
      expect(input.tools).toBe(tools)
      return {
        text: 'ok',
        finishReason: 'stop',
      }
    })

    const result = await recoverAlicizationMainChatFromTimeout(createInput({
      tools,
      toolChoice,
      generateTextImpl,
    }))

    expect(result).toBe('ok')
  })

  it('aborts one-shot generation after the enforced minimum timeout window', async () => {
    vi.useFakeTimers()

    const generateTextImpl = vi.fn(({ abortSignal }: Record<string, unknown>) => new Promise((_, reject) => {
      const signal = abortSignal as AbortSignal
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    }))

    const promise = generateAlicizationMainChatNonStreaming(createInput({
      timeoutMs: 25,
      generateTextImpl,
    }))
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(1000)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })
  })
})
