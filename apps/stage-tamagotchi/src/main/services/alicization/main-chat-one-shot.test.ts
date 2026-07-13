import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
import { buildAlicizationProjectStateSystemBlock } from './project-state-brief'

const canonicalMemoryGovernanceProjectStateBlock = [
  '[ALICIZATION_PROJECT_STATE]',
  'context_role=memory_governance_status',
  'short_term_owner=WorkingMemory',
  'long_term_recall_owner=LongTermMemoryRecall',
  'template_policy=no_fixed_persona_templates',
  'failure_surface=transparent_errors_only',
  'latest_landed_progress=Memory Workbench policy and recall diagnostics are visible.',
  'primary_open_loop=Semantic recall and provider failure transparency still need closure.',
].join('\n')

function createInput(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      {
        role: 'system',
        content: buildAlicizationProjectStateSystemBlock(),
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

  it('rejects one-shot generation when messages omit canonical project-state context', async () => {
    const generateTextImpl = vi.fn(async () => ({
      text: 'should not run',
      finishReason: 'stop',
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      messages: [
        { role: 'system', content: '[ALICIZATION_CURRENT_CONSCIOUS_FRAME]\nOnly local reply shaping appears here.' },
        { role: 'user', content: '你好' },
      ],
      generateTextImpl,
    }))).rejects.toThrow('Alicization one-shot messages must include canonical project-state context before generation.')
    expect(generateTextImpl).not.toHaveBeenCalled()
  })

  it('rejects one-shot generation when messages only carry a thin project-state shell with the marker but not the canonical same-her closure fields', async () => {
    const generateTextImpl = vi.fn(async () => ({
      text: 'should not run',
      finishReason: 'stop',
    }))

    await expect(generateAlicizationMainChatNonStreaming(createInput({
      messages: [
        { role: 'system', content: '[ALICIZATION_PROJECT_STATE]\nproject_preflight=Alicization is a local-first digital life project.' },
        { role: 'user', content: '你好' },
      ],
      generateTextImpl,
    }))).rejects.toThrow('Alicization one-shot messages must include canonical project-state context before generation.')
    expect(generateTextImpl).not.toHaveBeenCalled()
  })

  it('allows one-shot generation when canonical project-state context is present in the message payload', async () => {
    const generateTextImpl = vi.fn(async () => ({
      text: '  我还记得这是同一个数字生命项目。  ',
      finishReason: 'stop',
    }))

    const result = await generateAlicizationMainChatNonStreaming(createInput({
      messages: [
        { role: 'system', content: buildAlicizationProjectStateSystemBlock() },
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

  it('passes the native response schema without converting emotional state into one-shot provider prose', async () => {
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
      reasonTags: ['phase1-life-loop', 'same-her-authority'],
      why: 'Keep one-shot recovery on the same emotion-memory-initiative-embodiment authority line.',
    }
    const generateTextImpl = vi.fn(async (input: Record<string, unknown>) => {
      const systemText = ((input.messages as Array<{ role?: string, content?: unknown }> | undefined) ?? [])
        .filter(message => message.role === 'system')
        .map(message => typeof message.content === 'string' ? message.content : '')
        .join('\n')

      expect(input.responseFormat).toBe(alicizationProviderResponseFormat)
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
          content: canonicalMemoryGovernanceProjectStateBlock,
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
