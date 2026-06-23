import { describe, expect, it } from 'vitest'

import { buildAlicizationExecutionPayoffPrompt } from './execution-delivery-surface'
import { generateAlicizationMainChatNonStreaming } from './main-chat-one-shot'
import { carriesAlicizationCanonicalProjectState } from './main-chat-project-state-guard'

describe('execution delivery payoff provider project-state carry', () => {
  it('keeps canonical project-state context in execution payoff provider prompts', () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: '继续把数字生命的拟人情绪闭环往前收紧。',
      status: 'completed',
      summary: 'same-her continuity guard hardened',
      outcome: 'same-her continuity guard hardened',
      userText: '继续把数字生命的拟人情绪闭环往前收紧。',
    })

    const providerMessages = [
      { role: 'system' as const, content: prompt.system },
      { role: 'user' as const, content: prompt.user },
    ]

    expect(carriesAlicizationCanonicalProjectState(providerMessages)).toBe(true)

    const canonicalProjectStateSystemMessage = providerMessages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_STATE]')
      && message.content.includes('current_phase=')
      && message.content.includes('current_objective=')
      && message.content.includes('project_preflight=')
      && message.content.includes('latest_landed_progress=')
      && message.content.includes('same_her_self_line=')
      && message.content.includes('same_her_drift_risk=')
      && message.content.includes('primary_open_loop=')
      && message.content.includes('next_closure_target='),
    )

    expect(canonicalProjectStateSystemMessage).toBeDefined()
  })

  it('passes execution payoff provider prompts through the one-shot project-state guard', async () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: '继续把数字生命的拟人情绪闭环往前收紧。',
      status: 'completed',
      summary: 'same-her continuity guard hardened',
      outcome: 'same-her continuity guard hardened',
      userText: '继续把数字生命的拟人情绪闭环往前收紧。',
    })

    const providerMessages = [
      { role: 'system' as const, content: prompt.system },
      { role: 'user' as const, content: prompt.user },
    ]
    const observedOneShotMessages: Array<typeof providerMessages> = []

    const result = await generateAlicizationMainChatNonStreaming({
      chatConfig: { model: 'gpt-test' } as any,
      messages: providerMessages,
      timeoutMs: 1_000,
      generateTextImpl: async (input) => {
        observedOneShotMessages.push((((input as { messages?: typeof providerMessages }).messages) ?? []).slice())
        return {
          finishReason: 'stop',
          text: 'execution-payoff-ok',
        }
      },
    })

    expect(result.fullText).toBe('execution-payoff-ok')
    expect(observedOneShotMessages).toHaveLength(1)
    expect(carriesAlicizationCanonicalProjectState(observedOneShotMessages[0]!)).toBe(true)
  })
})
