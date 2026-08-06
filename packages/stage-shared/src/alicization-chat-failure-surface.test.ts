import { describe, expect, it } from 'vitest'

import {
  extractAlicizationProviderRequestFailure,
  resolveAlicizationChatFailureSurface,
} from './alicization-chat-failure-surface'

describe('alicization chat failure surface', () => {
  it('renders timeout as direct infrastructure failure instead of persona prose', () => {
    const surface = resolveAlicizationChatFailureSurface({
      kind: 'timeout',
      userText: '你好',
    })

    expect(surface.reply).toBe('超时了。')
    expect(surface.nonHumanAuthoredStatus).toBe('direct-infra-repair:timeout')
    expect(surface.excludeFromPersonaLearning).toBe(true)
    expect(surface.visibleReplySource).toBe('infrastructure-failure')
    expect(surface.origin).toBe('failure-surface')
    expect(surface.allowLongTermCondensation).toBe(false)
    expect(surface.allowPersonaLearning).toBe(false)
    expect(surface.allowTraining).toBe(false)
  })

  it('routes schema, recall, and persistence failures to explicit transparent surfaces', () => {
    const cases = [
      {
        kind: 'provider-schema-unsupported',
        reply: '当前 Provider/模型不支持所需的输出模式。',
      },
      {
        kind: 'provider-output-invalid',
        reply: '模型输出格式异常，这轮回复已拦截。',
      },
      {
        kind: 'recall-failure',
        reply: '本轮长期记忆召回失败。',
      },
      {
        kind: 'memory-persistence',
        reply: '本轮记忆持久化失败。',
      },
    ] as const

    for (const failure of cases) {
      const surface = resolveAlicizationChatFailureSurface({
        kind: failure.kind,
        userText: '请继续这一轮',
      })

      expect(surface.reply).toBe(failure.reply)
      expect(surface.reply).not.toMatch(/mind-repair|回复流失败/)
      expect(surface.nonHumanAuthoredStatus).toBe(`direct-infra-repair:${failure.kind}`)
      expect(surface.origin).toBe('failure-surface')
      expect(surface.allowLongTermCondensation).toBe(false)
      expect(surface.allowPersonaLearning).toBe(false)
      expect(surface.allowTraining).toBe(false)
      expect(surface.visibleReplySource).toBe('infrastructure-failure')
      expect(surface.excludeFromPersonaLearning).toBe(true)
      expect(surface.excludeFromMemoryCondensation).toBe(true)
    }
  })

  it('preserves safe Provider request diagnostics instead of collapsing HTTP 400 into stream failure', () => {
    const error = new Error(
      'Remote sent 400 response: {"error":{"message":"Upstream request failed.","type":"invalid_request_error"}}',
    )
    const providerRequest = extractAlicizationProviderRequestFailure(error)
    expect(providerRequest).toEqual({
      status: 400,
      code: 'invalid_request_error',
      message: 'Upstream request failed.',
    })
    if (!providerRequest)
      throw new Error('Expected Provider request diagnostics.')

    const surface = resolveAlicizationChatFailureSurface({
      kind: 'provider-request',
      userText: '你好',
      providerRequest: {
        ...providerRequest,
        providerId: 'openai-compatible',
        model: 'gpt-5.4-mini',
      },
    })

    expect(surface.reply).toContain('openai-compatible')
    expect(surface.reply).toContain('gpt-5.4-mini')
    expect(surface.reply).toContain('HTTP 400')
    expect(surface.reply).toContain('invalid_request_error')
    expect(surface.reply).toContain('Upstream request failed。')
    expect(surface.reply).not.toContain('failed.。')
    expect(surface.reply).not.toBe('回复流失败。')
    expect(surface.kind).toBe('provider-request')
    expect(surface.allowLongTermCondensation).toBe(false)
    expect(surface.allowPersonaLearning).toBe(false)
    expect(surface.allowTraining).toBe(false)
    expect(surface.providerRequest).toEqual({
      providerId: 'openai-compatible',
      model: 'gpt-5.4-mini',
      status: 400,
      code: 'invalid_request_error',
      message: 'Upstream request failed.',
    })
  })

  it('redacts credentials and user input from Provider request diagnostics', () => {
    const failure = extractAlicizationProviderRequestFailure(new Error(
      'Remote sent 400 response: {"error":{"message":"Authorization: Bearer secret-token api_key=private-key user_input=private-message","type":"invalid_request_error"}}',
    ))

    expect(failure?.message).not.toContain('secret-token')
    expect(failure?.message).not.toContain('private-key')
    expect(failure?.message).not.toContain('private-message')
    expect(failure?.message).toContain('[redacted]')
  })
})
