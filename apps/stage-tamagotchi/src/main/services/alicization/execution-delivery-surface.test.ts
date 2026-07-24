import { describe, expect, it } from 'vitest'

import {
  buildAlicizationExecutionDeliveryFact,
  buildAlicizationExecutionPayoffPrompt,
  selectAlicizationExecutionDeliveryReply,
} from './execution-delivery-surface'

describe('execution delivery surface', () => {
  it('returns tool execution as a structured fact without visible reply authorship', () => {
    const fact = buildAlicizationExecutionDeliveryFact({
      toolName: 'executor_run_cli',
      status: 'succeeded',
      summary: '构建完成',
      result: { exitCode: 0 },
    })

    expect(fact).toEqual({
      type: 'execution-result',
      toolName: 'executor_run_cli',
      status: 'succeeded',
      summary: '构建完成',
      result: { exitCode: 0 },
    })
    expect(fact).not.toHaveProperty('reply')
    expect(fact).not.toHaveProperty('source', 'llm-repaired')
  })

  it('keeps delivery pending when the Provider has not settled visible text', () => {
    const delivery = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: '构建应用',
      status: 'completed',
      summary: '构建完成',
      outcome: 'exitCode=0',
      llmReply: null,
    })

    expect(delivery).toMatchObject({
      status: 'pending-provider-settlement',
      reason: 'missing-provider-reply',
    })
    expect(delivery.visibleReply).toBeUndefined()
    expect(delivery).not.toHaveProperty('reply')
    expect(delivery).not.toHaveProperty('source', 'llm-repaired')
  })

  it('settles only the Provider-authored visible reply without local rewriting', () => {
    const delivery = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: '构建应用',
      status: 'completed',
      summary: '构建完成',
      outcome: 'exitCode=0',
      llmReply: '应用已经构建完成，退出码是 0。',
    })

    expect(delivery).toEqual({
      status: 'settled',
      source: 'llm',
      visibleReply: '应用已经构建完成，退出码是 0。',
    })
  })

  it('serializes execution context as data instead of payoff prose rules', () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: '构建应用',
      status: 'completed',
      summary: '构建完成',
      outcome: 'exitCode=0',
    })

    expect(JSON.parse(prompt.system)).toEqual({
      type: 'alicization-execution-settlement-context',
      data: {
        executionFact: {
          type: 'execution-result',
          toolName: 'cli',
          status: 'succeeded',
          summary: '构建完成',
          result: {
            goal: '构建应用',
            outcome: 'exitCode=0',
          },
        },
      },
    })
    expect(JSON.parse(prompt.user)).toEqual({
      type: 'alicization-execution-settlement-request',
    })
    expect(`${prompt.system}\n${prompt.user}`).not.toMatch(
      /pay off|sound like|lead with|same-her|continuity|relationship posture|陪伴|语气|开场|结尾/i,
    )
  })
})
