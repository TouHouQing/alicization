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
  })

  it('detects and blocks decorative fixed persona template contamination', () => {
    const contaminated = '我在。同一条本地数字生命的线还在，我先轻一点留在这里，不抢你的节奏。你想说什么，我就接住。'
    const surface = resolveAlicizationChatFailureSurface({
      kind: 'template-contamination',
      userText: '你好',
    })

    expect(isAlicizationDecorativePersonaTemplateContamination(contaminated)).toBe(true)
    expect(surface.reply).toContain('固定模板')
    expect(surface.reply).not.toContain('同一条本地数字生命')
    expect(surface.excludeFromPersonaLearning).toBe(true)
  })
})
