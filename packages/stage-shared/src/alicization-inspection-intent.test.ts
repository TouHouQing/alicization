import { describe, expect, it } from 'vitest'

import { inferAlicizationInspectionIntent } from './alicization-inspection-intent'

describe('inferAlicizationInspectionIntent', () => {
  it('does not treat dialogue complaints as inspection continuation under shared-attention carry', () => {
    const result = inferAlicizationInspectionIntent({
      message: '能不能说人话',
      recentMessages: [
        { role: 'user', content: '帮我看看我屏幕上现在是什么' },
        { role: 'assistant', content: '我在看着。' },
      ],
      contextPhrases: [
        'Code | Code | Entire screen',
        'Entire screen',
        '帮我看看我屏幕上现在是什么',
      ],
      sharedAttentionActive: true,
    })

    expect(result.active).toBe(false)
    expect(result.contextOverlap).toBeLessThan(0.34)
    expect(result.reasonCodes).not.toContain('contextual-continuation')
    expect(result.signalProfile.decisive).toBe(false)
  })

  it('keeps explicit short follow-up rechecks inspection-active when the anchor is real', () => {
    const result = inferAlicizationInspectionIntent({
      message: '这首呢',
      recentMessages: [
        { role: 'user', content: '帮我看看 QQ 音乐现在放的歌名是什么' },
        { role: 'assistant', content: '我在看着。' },
      ],
      contextPhrases: [
        'QQ 音乐 Melt',
        '这首歌',
      ],
      sharedAttentionActive: true,
    })

    expect(result.active).toBe(true)
    expect(result.reasonCodes).toEqual(expect.arrayContaining([
      'deictic-cue',
      'contextual-continuation',
    ]))
    expect(result.signalProfile.decisive).toBe(true)
  })

  it('keeps short observed follow-up questions inside the same shared-attention window', () => {
    const result = inferAlicizationInspectionIntent({
      message: '你看看歌名是什么',
      recentMessages: [
        { role: 'user', content: '帮我看看 QQ 音乐现在放的是什么歌' },
        { role: 'assistant', content: '我在看着。' },
      ],
      contextPhrases: [
        'QQMusic',
        'Melt - QQMusic',
      ],
      sharedAttentionActive: true,
    })

    expect(result.active).toBe(true)
    expect(result.reasonCodes).toEqual(expect.arrayContaining([
      'observe-cue',
      'question-cue',
      'observed-shared-attention-continuation',
      'contextual-continuation',
    ]))
    expect(result.signalProfile.decisive).toBe(true)
  })

  it('does not let repeated self dialogue turns be misread as inspection carry by context overlap alone', () => {
    const result = inferAlicizationInspectionIntent({
      message: '你觉得你可爱吗',
      recentMessages: [
        { role: 'user', content: '帮我看看我在 Cursor 里这个 diff 哪里有问题' },
        { role: 'assistant', content: '我在看着。' },
        { role: 'user', content: '你觉得你可爱吗' },
      ],
      contextPhrases: [
        'Cursor diff view',
        'inspection continuity',
      ],
      sharedAttentionActive: true,
    })

    expect(result.active).toBe(false)
    expect(result.contextOverlap).toBe(0)
    expect(result.reasonCodes).not.toContain('contextual-continuation')
    expect(result.signalProfile.actionable).toBe(false)
  })

  it('keeps weak observe fillers non-actionable even when an old inspection carry exists', () => {
    const result = inferAlicizationInspectionIntent({
      message: '看看',
      recentMessages: [
        { role: 'user', content: '帮我看看 Cursor 里面这个 diff 有什么问题' },
        { role: 'assistant', content: '我在看着。' },
      ],
      contextPhrases: [
        'Cursor',
        'main.ts - diff',
      ],
      sharedAttentionActive: true,
    })

    expect(result.active).toBe(false)
    expect(result.reasonCodes).toContain('observe-cue')
    expect(result.signalProfile.actionable).toBe(false)
    expect(result.signalProfile.decisive).toBe(false)
  })
})
