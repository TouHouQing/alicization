import { describe, expect, it } from 'vitest'

import { resolveAlicizationChatFailureSurface } from './alicization-chat-failure-surface'

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
        kind: 'required-tool-missing',
        reply: '模型未调用本轮要求的工具，操作没有执行。',
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
})
