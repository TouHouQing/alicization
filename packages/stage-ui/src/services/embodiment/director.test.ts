import { describe, expect, it } from 'vitest'

import { buildAlicizationRuntimeEmbodimentSeed } from '../../../../../apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed'
import { buildAlicizationEmbodimentScript } from './director'

describe('embodiment director', () => {
  it('produces one normalized live2d script from seed plus manifest', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: buildAlicizationRuntimeEmbodimentSeed({
        turnId: 'turn-1',
        reply: '你好，我们慢慢来。',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: null,
          actionCue: null,
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiment: null,
        speechTimeline: null,
        digitalLife: null,
        digitalLifeSpine: null,
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.version).toBe('embodiment-script-v1')
    expect(script.rendererTarget).toBe('live2d')
    expect(script.speechPlan.interruptPolicy).toBeDefined()
  })
})
