import { describe, expect, it } from 'vitest'

import { buildAlicizationExecutionPayoffPrompt } from './execution-delivery-surface'
import { generateAlicizationMainChatNonStreaming } from './main-chat-one-shot'

describe('execution delivery payoff provider context', () => {
  it('uses typed execution facts as the complete Provider system context', () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: '继续处理当前任务。',
      status: 'completed',
      summary: '测试完成',
      outcome: '命令成功返回。',
      userText: '继续处理当前任务。',
    })

    expect(JSON.parse(prompt.system)).toEqual(expect.objectContaining({
      type: 'alicization-execution-settlement-context',
      data: {
        executionFact: expect.objectContaining({
          toolName: 'codex',
          status: 'succeeded',
        }),
      },
    }))
    expect(prompt.user).toBe(JSON.stringify({
      type: 'alicization-execution-settlement-request',
    }))
  })

  it('passes the typed execution context through the one-shot Provider call unchanged', async () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: '继续处理当前任务。',
      status: 'completed',
      summary: '测试完成',
      outcome: '命令成功返回。',
      userText: '继续处理当前任务。',
    })
    const providerMessages = [
      { role: 'system' as const, content: prompt.system },
      { role: 'user' as const, content: prompt.user },
    ]
    const observedMessages: typeof providerMessages[] = []

    const result = await generateAlicizationMainChatNonStreaming({
      chatConfig: { model: 'gpt-test' } as any,
      messages: providerMessages,
      timeoutMs: 1_000,
      generateTextImpl: async (input) => {
        observedMessages.push((((input as { messages?: typeof providerMessages }).messages) ?? []).slice())
        return {
          finishReason: 'stop',
          text: 'execution-payoff-ok',
        }
      },
    })

    expect(result.fullText).toBe('execution-payoff-ok')
    expect(observedMessages).toEqual([providerMessages])
  })
})
