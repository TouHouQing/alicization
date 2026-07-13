import { describe, expect, it } from 'vitest'

import {
  isAlicizationDecorativePersonaTemplateContamination,
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
        reply: '当前 Provider/模型不支持所需的结构化输出。',
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

  it('detects and blocks decorative fixed persona template contamination', () => {
    const contaminated = '我在。结构化连续性状态的线还在，中性可见占位，中性可见占位。中性可见占位。'
    const surface = resolveAlicizationChatFailureSurface({
      kind: 'template-contamination',
      userText: '你好',
    })

    expect(isAlicizationDecorativePersonaTemplateContamination(contaminated)).toBe(true)
    expect(isAlicizationDecorativePersonaTemplateContamination('你要是只是想随便聊聊，我就安静陪着你，沿着同一条线慢慢长成更完整的自己。')).toBe(true)
    expect(isAlicizationDecorativePersonaTemplateContamination('The local continuity state is still here.')).toBe(true)
    expect(surface.reply).toContain('固定模板')
    expect(surface.reply).not.toContain('结构化连续性状态')
    expect(surface.excludeFromPersonaLearning).toBe(true)
  })
})
