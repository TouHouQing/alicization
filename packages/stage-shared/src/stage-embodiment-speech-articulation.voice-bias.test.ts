import { describe, expect, it } from 'vitest'

import { deriveStageEmbodimentSpeechArticulationState } from './stage-embodiment-speech-articulation'

describe('speech articulation voice bias', () => {
  it('changes viseme openness and spread for chinese voice profiles with stronger consonant precision', () => {
    const soft = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '先看这里。',
      metadata: {
        speechSynthesis: {
          provider: 'test',
          voice: {
            id: 'soft-zh',
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
        speechSynthesis: {
          provider: 'test',
          voice: {
            id: 'crisp-zh',
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
      },
      playbackDurationMs: 800,
      startedAt: 0,
      now: 200,
      mouthOpenRatio: 0.4,
    })

    expect(crisp.lipClosure).toBeGreaterThan(soft.lipClosure)
    expect(crisp.visemes.closed).toBeGreaterThan(soft.visemes.closed)
  })

  it('does not apply the chinese-specific closure lift to non-chinese voice profiles', () => {
    const english = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: 'Look here.',
      metadata: {
        speechSynthesis: {
          provider: 'test',
          voice: {
            id: 'en-voice',
            language: 'en-US',
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
      },
      playbackDurationMs: 800,
      startedAt: 0,
      now: 200,
      mouthOpenRatio: 0.4,
    })

    expect(english.voice?.language).toBe('en-US')
    expect(english.lipClosure).toBeLessThan(1)
  })

  it('keeps stronger rounded U shaping for chinese text with explicit rounded characters', () => {
    const rounded = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '呜。',
      metadata: {
        speechSynthesis: {
          provider: 'test',
          voice: {
            id: 'rounded-zh',
            language: 'zh-CN',
            consonantPrecision: 0.6,
            vowelLegato: 0.5,
            roundBias: 0.1,
            spreadBias: 0.1,
            jawBias: 0.1,
            closureBias: 0.1,
            rateMultiplier: 1,
            pitchDelta: 0,
          },
        },
      },
      playbackDurationMs: 800,
      startedAt: 0,
      now: 200,
      mouthOpenRatio: 0.4,
    })

    const spread = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '衣。',
      metadata: {
        speechSynthesis: {
          provider: 'test',
          voice: {
            id: 'spread-zh',
            language: 'zh-CN',
            consonantPrecision: 0.6,
            vowelLegato: 0.5,
            roundBias: 0.1,
            spreadBias: 0.1,
            jawBias: 0.1,
            closureBias: 0.1,
            rateMultiplier: 1,
            pitchDelta: 0,
          },
        },
      },
      playbackDurationMs: 800,
      startedAt: 0,
      now: 200,
      mouthOpenRatio: 0.4,
    })

    expect(rounded.visemes.U).toBeGreaterThan(spread.visemes.U)
    expect(rounded.lipRound).toBeGreaterThan(spread.lipRound)
  })
})
