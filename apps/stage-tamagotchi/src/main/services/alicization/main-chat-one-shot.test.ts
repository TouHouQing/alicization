import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

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

  it('retries five transient visual one-shot failures and succeeds on the sixth attempt', async () => {
    const generateTextImpl = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('service unavailable'), { status: 503 }))
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockRejectedValueOnce(Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }))
      .mockRejectedValueOnce(Object.assign(new Error('upstream timeout'), { status: 504 }))
      .mockRejectedValueOnce(Object.assign(new Error('service unavailable'), { status: 503 }))
      .mockResolvedValueOnce({
        text: '视觉链路恢复。',
        finishReason: 'stop',
      })

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      generateTextImpl,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    }))).resolves.toEqual({
      finishReason: 'stop',
      fullText: '视觉链路恢复。',
    })
    expect(generateTextImpl).toHaveBeenCalledTimes(6)
  })

  it('returns the original failure after the visual one-shot retry budget is exhausted', async () => {
    const terminalError = Object.assign(new Error('service unavailable after retries'), {
      status: 503,
    })
    const generateTextImpl = vi.fn().mockRejectedValue(terminalError)

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      generateTextImpl,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    }))).rejects.toBe(terminalError)
    expect(generateTextImpl).toHaveBeenCalledTimes(6)
  })

  it('does not replay a one-shot after a tool has produced a side effect', async () => {
    let toolExecutions = 0
    const toolRegistry = createCanonicalToolRegistry()
    const tools = [{
      type: 'function',
      function: {
        name: 'codex',
        parameters: {},
      },
      execute: async () => {
        toolExecutions += 1
        return {
          ok: true,
          status: 'completed',
        }
      },
    }] as any
    const providerFailure = Object.assign(new Error('service unavailable after tool execution'), {
      status: 503,
    })
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      const providerTools = input.tools as Array<{ execute?: (...args: any[]) => Promise<unknown> }>
      await providerTools[0]?.execute?.({ prompt: 'continue the current task' }, {
        toolCallId: 'tool-call-1',
      })
      throw providerFailure
    })

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      tools,
      toolRegistry,
      generateTextImpl,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    }))).rejects.toBe(providerFailure)
    expect(generateTextImpl).toHaveBeenCalledOnce()
    expect(toolExecutions).toBe(1)
  })

  it('forwards function tool choices during timeout recovery', async () => {
    const toolRegistry = createCanonicalToolRegistry()
    const toolChoice = {
      type: 'function',
      function: { name: 'codex' },
    } as const
    const tools = [{
      type: 'function',
      function: {
        name: 'codex',
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
            name: 'codex',
          },
        }],
      }
    })

    const result = await recoverAlicizationMainChatFromTimeout(createInput({
      tools,
      toolChoice,
      toolRegistry,
      generateTextImpl,
    }))

    expect(result).toBe('ok')
  })

  it('allows one-shot provider text without enforcing a tool call', async () => {
    const toolRegistry = createCanonicalToolRegistry()
    const toolChoice = {
      type: 'function',
      function: { name: 'codex' },
    } as const
    const tools = [{
      type: 'function',
      function: {
        name: 'codex',
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
      toolRegistry,
      generateTextImpl,
    }))).resolves.toEqual({
      finishReason: 'stop',
      fullText: '我先守住真实边界。',
    })
  })

  it('rejects legacy executor tool names before calling the Provider', async () => {
    const toolRegistry = createCanonicalToolRegistry()
    const generateTextImpl = vi.fn(async () => ({
      text: 'should not run',
      finishReason: 'stop',
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      tools: [{
        type: 'function',
        function: {
          name: 'executor_run_codex',
          parameters: {},
        },
      }] as any,
      toolRegistry,
      generateTextImpl,
    }))).rejects.toThrow(/Legacy executor tool name/u)
    expect(generateTextImpl).not.toHaveBeenCalled()
  })

  it('requires an explicit canonical registry when a one-shot exposes tools', async () => {
    const generateTextImpl = vi.fn(async () => ({
      text: 'should not run',
      finishReason: 'stop',
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      tools: [{
        type: 'function',
        function: {
          name: 'codex',
          parameters: {},
        },
      }] as any,
      generateTextImpl,
    }))).rejects.toThrow(/explicit toolRegistry/u)
    expect(generateTextImpl).not.toHaveBeenCalled()
  })

  it('rejects a legacy executor tool choice before calling the Provider', async () => {
    const toolRegistry = createCanonicalToolRegistry()
    const generateTextImpl = vi.fn(async () => ({
      text: 'should not run',
      finishReason: 'stop',
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      tools: [{
        type: 'function',
        function: {
          name: 'codex',
          parameters: {},
        },
      }] as any,
      toolChoice: {
        type: 'function',
        function: {
          name: 'executor_run_cli',
        },
      } as any,
      toolRegistry,
      generateTextImpl,
    }))).rejects.toThrow(/Legacy executor tool choice/u)
    expect(generateTextImpl).not.toHaveBeenCalled()
  })

  it.each([
    ['unknown provider tool', 'unknown_provider_tool', undefined],
    ['legacy adapter tool', 'executor_run_codex', undefined],
    ['inactive provider tool', 'codex', 'disabled'],
  ])('rejects %s before calling the Provider', async (_label, toolName, activationStatus) => {
    const toolRegistry = createCanonicalToolRegistry()
    if (activationStatus) {
      toolRegistry.setActivationStatus('coding_agent.codex', activationStatus as 'disabled')
    }
    const generateTextImpl = vi.fn(async () => ({
      text: 'should not run',
      finishReason: 'stop',
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      tools: [{
        type: 'function',
        function: {
          name: toolName,
          parameters: {},
        },
      }] as any,
      toolRegistry,
      generateTextImpl,
    }))).rejects.toThrow(/Legacy executor|Provider tool/u)
    expect(generateTextImpl).not.toHaveBeenCalled()
  })

  it.each([
    ['unknown provider tool', 'unknown_provider_tool', undefined],
    ['inactive provider tool', 'codex', 'disabled'],
  ])('rejects function toolChoice for %s before calling the Provider', async (_label, toolName, activationStatus) => {
    const toolRegistry = createCanonicalToolRegistry()
    if (activationStatus) {
      toolRegistry.setActivationStatus('coding_agent.codex', activationStatus as 'disabled')
    }
    const generateTextImpl = vi.fn(async () => ({
      text: 'should not run',
      finishReason: 'stop',
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      tools: [{
        type: 'function',
        function: {
          name: 'set_reminder',
          parameters: {},
        },
      }] as any,
      toolChoice: {
        type: 'function',
        function: {
          name: toolName,
        },
      } as any,
      toolRegistry,
      generateTextImpl,
    }))).rejects.toThrow(/tool choice/u)
    expect(generateTextImpl).not.toHaveBeenCalled()
  })

  it('returns a structured capability input failure without calling an executable tool for invalid input', async () => {
    const toolRegistry = createCanonicalToolRegistry()
    const execute = vi.fn(async () => ({
      ok: true,
      status: 'completed',
    }))
    const tools = [{
      type: 'function',
      function: {
        name: 'codex',
        parameters: {},
      },
      execute,
    }] as any
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      const providerTools = input.tools as Array<{ execute?: (toolInput: unknown) => Promise<unknown> }>
      const result = await providerTools[0]?.execute?.({})
      expect(result).toMatchObject({
        status: 'failed',
        errorCode: 'CAPABILITY_INPUT_INVALID',
      })
      return {
        text: 'input rejected',
        finishReason: 'stop',
      }
    })

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      tools,
      toolRegistry,
      generateTextImpl,
    }))).resolves.toEqual({
      finishReason: 'stop',
      fullText: 'input rejected',
    })
    expect(execute).not.toHaveBeenCalled()
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
