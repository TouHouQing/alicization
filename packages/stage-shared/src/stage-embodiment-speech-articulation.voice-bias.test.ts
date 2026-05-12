import { describe, expect, it } from 'vitest'

import { deriveStageEmbodimentSpeechArticulationState } from './stage-embodiment-speech-articulation'

describe('speech articulation voice bias', () => {
  it('changes viseme openness and spread for chinese voice profiles with stronger consonant precision', () => {
    const soft = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '先看这里。',
      metadata: {
        voice: {
          provider: 'test',
          voiceId: 'soft-zh',
          language: 'zh-CN',
          consonantPrecision: 0.2,
          vowelLegato: 0.9,
          roundBias: 0.1,
          spreadBias: 0.1,
          jawBias: 0.1,
          closureBias: 0.1,
          rateMultiplier: 1,
          pitchDelta: 0,
        },
      },
      playbackDurationMs: 800,
      startedAt: 0,
      now: 200,
      mouthOpenRatio: 0.4,
    })

    const crisp = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '先看这里。',
      metadata: {
        voice: {
          provider: 'test',
          voiceId: 'crisp-zh',
          language: 'zh-CN',
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
          roundBias: 0.1,
          spreadBias: 0.1,
          jawBias: 0.1,
          closureBias: 0.1,
          rateMultiplier: 1,
          pitchDelta: 0,
        },
      },
      playbackDurationMs: 800,
      startedAt: 0,
      now: 200,
      mouthOpenRatio: 0.4,
    })

    expect(crisp.lipClosure).toBeGreaterThan(soft.lipClosure)
    expect(crisp.visemes.closed).toBeGreaterThan(soft.visemes.closed)
  })
})
