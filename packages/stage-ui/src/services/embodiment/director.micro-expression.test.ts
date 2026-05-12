import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

describe('director micro-expression timing', () => {
  it('adds pre-utterance and post-utterance cues for gentle chinese guidance turns', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        replyText: '先看这里，然后点保存。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_gentle_nod',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiment: null,
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-1',
          reply: '先看这里，然后点保存。',
          emotion: 'thinking',
          segments: [],
        },
        digitalLife: null,
        digitalLifeSpine: null,
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.facePlan.preUtteranceCue).toBeTruthy()
    expect(script.facePlan.postUtteranceCue).toBeTruthy()
  })
})
