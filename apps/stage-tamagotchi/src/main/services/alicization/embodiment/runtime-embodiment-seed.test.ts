import { describe, expect, it } from 'vitest'

import { buildAlicizationRuntimeEmbodimentSeed } from './runtime-embodiment-seed'

describe('runtime embodiment seed', () => {
  it('freezes one governed turn into one canonical local seed with normalized performance and decision trace', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: ' trace-1 ',
      turnId: 'turn-1',
      reply: ' 你好  ',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'sad',
        facialCue: '  soft-gaze  ',
        actionCue: '  comfort_sway  ',
        delivery: 'calm',
        emphasis: 2,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    expect(seed.decisionTraceId).toBe('trace-1')
    expect(seed.turnId).toBe('turn-1')
    expect(seed.replyText).toBe('你好')
    expect(seed.performance).toEqual({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'calm',
      emphasis: 2,
    })
  })
})
