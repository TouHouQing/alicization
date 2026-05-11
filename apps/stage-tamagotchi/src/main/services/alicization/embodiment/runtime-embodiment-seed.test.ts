import { describe, expect, it } from 'vitest'

import { buildAlicizationRuntimeEmbodimentSeed } from './runtime-embodiment-seed'

describe('runtime embodiment seed', () => {
  it('freezes one governed turn into one canonical local seed', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      turnId: 'turn-1',
      reply: '你好',
      performance: {
        baseEmotion: 'neutral',
        emotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    expect(seed.turnId).toBe('turn-1')
    expect(seed.replyText).toBe('你好')
  })
})
