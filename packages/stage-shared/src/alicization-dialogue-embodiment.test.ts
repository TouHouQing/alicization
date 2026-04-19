import { describe, expect, it } from 'vitest'

import { resolveAlicizationDialogueEmbodiment } from './alicization-dialogue-embodiment'

describe('alicization dialogue embodiment', () => {
  it('keeps dialogue-first care rhythm steadier instead of oscillating every turn', () => {
    const embodiment = resolveAlicizationDialogueEmbodiment({
      candidateEmotion: 'concerned',
      candidatePerformance: {
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: null,
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      previous: {
        emotion: 'concerned',
        delivery: 'gentle',
        facialCue: 'concerned',
        actionCue: 'settled',
        variationToken: 'prev-token',
      },
      governance: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        turnMode: 'care',
      },
      reply: '我在，你慢一点也可以。',
      thought: 'stay close without crowding',
    })

    expect(embodiment.emotion).toBe('concerned')
    expect(embodiment.performance.delivery).toBe('gentle')
    expect(embodiment.speechStyle.rateMultiplier).toBeLessThan(1)
    expect(embodiment.speechStyle.pitchDelta).toBeLessThanOrEqual(8)
  })
})
