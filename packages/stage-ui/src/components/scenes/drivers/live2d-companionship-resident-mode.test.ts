import type { AlicizationEmbodimentScriptV1 } from '@proj-alicization/stage-shared'

import { describe, expect, it } from 'vitest'

import {
  resolveLive2DDriverRendererHints,
  resolveLive2DDriverResidentMode,
} from './live2d-companionship-resident-mode'

function createScript(): AlicizationEmbodimentScriptV1 {
  return {
    version: 'embodiment-script-v1',
    turnId: 'turn-live2d-resident-mode',
    rendererTarget: 'live2d',
    replyText: '我还在同一条线上。',
    state: {
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      residentMode: 'dialogue',
    },
    speechPlan: {
      interruptPolicy: 'soft-settle',
      preRollMs: 0,
      settleMs: 180,
      segments: [
        {
          id: 'segment-default',
          index: 0,
          text: '默认段落',
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 160,
          rendererHints: {
            preferredExpressionAliases: ['soft-gaze'],
          },
        },
        {
          id: 'segment-measured-return',
          index: 1,
          text: '慢一点接回来',
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['same-her-inward-carry'],
            signature: 'same-her-measured-return',
          } as any,
        },
      ],
    },
    facePlan: {
      speakingCues: [],
    },
    motionPlan: {
      idleBase: 'idle',
      actionBursts: [],
      attentionMode: 'ambient',
    },
    lipsyncPlan: {
      mode: 'energy-phoneme-hybrid',
      visemeHints: [],
    },
  }
}

describe('live2d companionship resident mode', () => {
  it('prefers segment renderer resident mode over script state for the active segment', () => {
    const script = createScript()

    expect(resolveLive2DDriverResidentMode(script, 'segment-measured-return')).toBe('measured-return')
    expect(resolveLive2DDriverResidentMode(script, 'missing-segment')).toBe('dialogue')
  })

  it('returns active segment renderer hints so face, motion, and lipsync stay on the same inner state', () => {
    const hints = resolveLive2DDriverRendererHints(createScript(), 'segment-measured-return')

    expect(hints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'same-her-measured-return',
    }))
  })
})
