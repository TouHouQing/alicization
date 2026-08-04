import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'

const typedMemoryContextBlock = JSON.stringify({
  type: 'alicization-turn-memory-context',
  version: 'alicization-main-chat-memory-context-v1',
  workingMemory: {
    version: 'working-memory-owner-context-v1',
    owner: 'working-memory',
  },
  longTermRecall: null,
})

function createInput(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      {
        role: 'system',
        content: typedMemoryContextBlock,
      },
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
        toolCalls: [{
          function: {
            name: 'executor_run_cli',
          },
        }],
      }
    })

    const result = await recoverAlicizationMainChatFromTimeout(createInput({
      tools,
      toolChoice,
      generateTextImpl,
    }))

    expect(result).toBe('ok')
  })

  it('fails when required tool choice is enforced but one-shot generation does not call the tool', async () => {
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
    const generateTextImpl = vi.fn(async () => ({
      text: '我先守住真实边界。',
      finishReason: 'stop',
      toolCalls: [],
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      tools,
      toolChoice,
      generateTextImpl,
    }))).rejects.toThrow('Model finished without calling required tool: executor_run_cli')
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

  it('allows one-shot generation when typed memory context is present in the message payload', async () => {
    const generateTextImpl = vi.fn(async () => ({
      text: '  我还记得这是同一个数字生命项目。  ',
      finishReason: 'stop',
    }))

    const result = await generateAlicizationMainChatNonStreaming(createInput({
      messages: [
        { role: 'system', content: typedMemoryContextBlock },
        { role: 'user', content: '你好' },
      ],
      generateTextImpl,
    }))

    expect(result).toEqual({
      finishReason: 'stop',
      fullText: '我还记得这是同一个数字生命项目。',
    })
    expect(generateTextImpl).toHaveBeenCalledOnce()
  })

  it('does not force native response schema or convert emotional state into one-shot provider prose', async () => {
    const emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'guarded-care',
      initiativeMode: 'observe',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'protective-watch',
      valence: 0.34,
      arousal: 0.28,
      guardedness: 0.72,
      closenessDrive: 0.61,
      repairNeed: 0.18,
      initiativePressure: 0.44,
      reasonTags: ['phase1-life-loop', 'continuity-authority'],
      why: 'Keep one-shot recovery on the same emotion-memory-initiative-embodiment authority line.',
    }
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      const systemText = ((input.messages as Array<{ role?: string, content?: unknown }> | undefined) ?? [])
        .filter(message => message.role === 'system')
        .map(message => typeof message.content === 'string' ? message.content : '')
        .join('\n')

      expect(input.responseFormat).toBeUndefined()
      expect(systemText).not.toContain('[ALICIZATION_EMOTIONAL_KERNEL]')
      expect(systemText).not.toContain('emotional_kernel_')
      expect(JSON.stringify(input.messages)).not.toMatch(
        /Return ONLY one strict JSON|Output contract|must-follow|Response contract/iu,
      )

      return {
        text: '  我会沿着同一份内在状态继续。  ',
        finishReason: 'stop',
      }
    })

    const result = await generateAlicizationMainChatNonStreaming(createInput({
      emotionalKernel,
      messages: [
        {
          role: 'system',
          content: typedMemoryContextBlock,
        },
        { role: 'user', content: '你好' },
      ],
      generateTextImpl,
    }))

    expect(result).toEqual({
      finishReason: 'stop',
      fullText: '我会沿着同一份内在状态继续。',
    })
    expect(generateTextImpl).toHaveBeenCalledOnce()
  })
})
