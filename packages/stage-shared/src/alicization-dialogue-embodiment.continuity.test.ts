import type { AlicizationDialoguePerformancePayload, AlicizationEmotion } from './alicization-performance-contracts'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationDialogueEmbodiment } from './alicization-dialogue-embodiment'

function performance(emotion: AlicizationEmotion): AlicizationDialoguePerformancePayload {
  return { baseEmotion: emotion, emotion, delivery: 'gentle', emphasis: 0, facialCue: null, actionCue: null }
}

describe('dialogue expression continuity', () => {
  it.each([
    ['neutral', '必须先关闭这个窗口。'],
    ['neutral', 'I need to check the file first.'],
    ['sad', '他只说了一句“太好了”。'],
    ['concerned', '你刚才说“对不起”，但我更在意你现在怎么样。'],
    ['happy', '我们明天再试一次好吗？'],
  ] as const)('preserves the committed %s emotion while saying %s', (emotion, reply) => {
    const resolved = resolveAlicizationDialogueEmbodiment({ candidateEmotion: emotion, candidatePerformance: performance(emotion), reply })
    expect(resolved.emotion).toBe(emotion)
    expect(resolved.performance.baseEmotion).toBe(emotion)
    expect(resolved.performance.emotion).toBe(emotion)
    expect(resolved.performance.delivery).toBe('gentle')
    expect(resolved.performance.emphasis).toBe(0)
  })

  it('does not change emotion, voice or intensity merely because the previous turn used them', () => {
    let previous = { emotion: 'concerned', delivery: 'gentle', variationToken: 'initial' }
    let firstSpeechStyle: ReturnType<typeof resolveAlicizationDialogueEmbodiment>['speechStyle'] | undefined
    for (let index = 0; index < 30; index++) {
      const resolved = resolveAlicizationDialogueEmbodiment({ candidateEmotion: 'concerned', candidatePerformance: performance('concerned'), previous, turnId: `care-${index}`, reply: '我在听。' })
      expect(resolved.emotion).toBe('concerned')
      expect(resolved.performance.delivery).toBe('gentle')
      firstSpeechStyle ??= resolved.speechStyle
      expect(resolved.speechStyle).toEqual(firstSpeechStyle)
      previous = { emotion: resolved.emotion, delivery: resolved.performance.delivery, variationToken: resolved.variationToken }
    }
  })

  it('retains the previous emotion when a sparse payload supplies no new emotional evidence', () => {
    const resolved = resolveAlicizationDialogueEmbodiment({ previous: { emotion: 'sad', delivery: 'gentle' }, reply: '我们晚一点再聊。' })
    expect(resolved.emotion).toBe('sad')
  })

  it('does not read a quoted instruction as anger without an emotional state', () => {
    const resolved = resolveAlicizationDialogueEmbodiment({ reply: '说明书写着“必须关闭电源”。' })
    expect(resolved.emotion).toBe('neutral')
  })

  it('keeps the first explicitly requested action and facial cue from the actual renderer manifest', () => {
    const resolved = resolveAlicizationDialogueEmbodiment({
      candidateEmotion: 'concerned',
      candidatePerformance: { ...performance('concerned'), actionCue: 'comfort_sway', facialCue: 'relaxed' },
      previous: { actionCue: 'nod', facialCue: 'smile' },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['concerned'],
        supportedFacialCues: [{ key: 'relaxed', label: 'Relaxed', description: 'soft face', source: 'preset', affectsMouth: false }],
        supportedActions: [{ key: 'comfort_sway', label: 'Comfort', description: 'quiet comfort', source: 'builtin' }],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      reply: '我在听。',
    })
    expect(resolved.performance.actionCue).toBe('comfort_sway')
    expect(resolved.performance.facialCue).toBe('relaxed')
  })
})
