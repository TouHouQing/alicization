import { describe, expect, it } from 'vitest'

import {
  replyUsesSameThreadRestartShell,
  replyViolatesSameThreadContinuationGuidance,
  resolveAlicizationOpeningGuidanceHoldDetail,
  resolveAlicizationOpeningGuidanceViolationReason,
} from './proactive-opening-guidance'

describe('proactive-opening-guidance', () => {
  it('detects same-thread restart shells without flagging explicit anti-reopen continuation wording', () => {
    expect(replyUsesSameThreadRestartShell('那我们重新开始，我从头陪你把这件事再说一遍。')).toBe(true)
    expect(replyUsesSameThreadRestartShell('我先沿着刚才那条 callback 线轻一点跟回去，不把这些绕路后的回到 coding 当成重新贴近。')).toBe(true)
    expect(replyUsesSameThreadRestartShell('嗯，我还是沿着这条 callback 线慢一点往下接，不把它拐成另一段新的开头。')).toBe(false)
  })

  it('turns same-thread guidance violations into explicit repair reasons and hold detail', () => {
    const openingGuidance = 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.'
    const reply = '我重新从头说一下，这个项目现在已经把记忆和执行接起来了。'

    expect(replyViolatesSameThreadContinuationGuidance({ reply, openingGuidance })).toBe(true)
    expect(resolveAlicizationOpeningGuidanceViolationReason({ reply, openingGuidance })).toBe('proactive-opening-guidance-violation:same-thread-continuation')
    expect(resolveAlicizationOpeningGuidanceHoldDetail({
      reply,
      openingGuidance,
      openingGuidanceViolationReason: 'proactive-opening-guidance-violation:same-thread-continuation',
    })).toBe('same-thread-restart-shell')
  })

  it('keeps lower-pressure guidance from widening into generic availability or performative warmth shells', () => {
    expect(resolveAlicizationOpeningGuidanceViolationReason({
      reply: '你现在要是方便，我可以先轻轻问你一句。',
      openingGuidance: 'Stay lower-pressure and leave room before widening closeness.',
    })).toBe('proactive-opening-guidance-violation:lower-pressure')

    expect(resolveAlicizationOpeningGuidanceViolationReason({
      reply: '我顺势把气氛一起推高，再回来接这条线。',
      openingGuidance: 'Use an even, steady voice with natural, unforced pacing.',
    })).toBe('proactive-opening-guidance-violation:lower-pressure')
  })
})
