import { describe, expect, it } from 'vitest'

import {
  createIdleStageEmbodimentMotorState,
  deriveStageEmbodimentSpeechArticulationState,
  estimateStageEmbodimentSpeechPlaybackDurationMs,
  normalizeStageEmbodimentSpeechArticulationVoiceProfile,
} from './index'

function createMetadata(voiceId: string, options?: {
  gender?: string
  language?: string
  model?: string
  pitchDelta?: number
  provider?: string
  rateMultiplier?: number
  voiceName?: string
}) {
  return {
    speechSynthesis: {
      provider: options?.provider ?? 'openai-compatible-audio-speech',
      model: options?.model ?? 'gpt-4o-mini-tts',
      pitchDelta: options?.pitchDelta ?? 0,
      rateMultiplier: options?.rateMultiplier ?? 1,
      voice: {
        id: voiceId,
        name: options?.voiceName ?? voiceId,
        gender: options?.gender ?? 'neutral',
        languages: [{ code: options?.language ?? 'en-US', title: 'English' }],
      },
    },
  } satisfies Record<string, unknown>
}

describe('stage embodiment speech articulation', () => {
  it('estimates stronger bilabial closure near m/b/p units', () => {
    const articulation = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: 'mama',
      metadata: createMetadata('cedar', { gender: 'male', pitchDelta: -4 }),
      playbackDurationMs: 600,
      startedAt: 0,
      now: 40,
      mouthOpenRatio: 0.42,
      dynamics: {
        speechEnergy: 0.5,
        prosodyIntensity: 0.34,
        emphasisLevel: 0.22,
      },
    })

    expect(articulation.active).toBe(true)
    expect(articulation.lipClosure).toBeGreaterThanOrEqual(0.55)
    expect(articulation.visemes.closed).toBeGreaterThan(0.65)
  })

  it('favors rounded lips for rounded vowels and deeper voices', () => {
    const articulation = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: 'oh you',
      metadata: createMetadata('onyx', {
        gender: 'male',
        pitchDelta: -6,
        rateMultiplier: 0.94,
      }),
      playbackDurationMs: 900,
      startedAt: 0,
      now: 520,
      mouthOpenRatio: 0.5,
      dynamics: {
        speechEnergy: 0.62,
        prosodyIntensity: 0.46,
        emphasisLevel: 0.2,
      },
    })

    expect(articulation.lipRound).toBeGreaterThan(articulation.lipSpread)
    expect(articulation.visemes.O + articulation.visemes.U).toBeGreaterThan(articulation.visemes.E + articulation.visemes.I)
  })

  it('derives different articulation voice bias from different TTS identities', () => {
    const bright = normalizeStageEmbodimentSpeechArticulationVoiceProfile(createMetadata('nova', {
      gender: 'female',
      pitchDelta: 4,
      rateMultiplier: 1.08,
      voiceName: 'Nova Bright',
    }))
    const deep = normalizeStageEmbodimentSpeechArticulationVoiceProfile(createMetadata('onyx', {
      gender: 'male',
      pitchDelta: -5,
      rateMultiplier: 0.94,
      voiceName: 'Onyx Warm',
    }), {
      id: 'frame',
      index: 0,
      startOffset: 0,
      endOffset: 2,
      text: 'hi',
      mode: 'speaking',
      interruptPolicy: 'continue',
      settleMode: 'release',
      voice: {
        pitchDelta: -5,
        rateMultiplier: 0.94,
        energy: 0.6,
        cadence: 0.42,
      },
      lipSync: {
        mode: 'hybrid',
        visemeBias: 0.62,
        energyBias: 0.38,
        mouthScale: 0.92,
        continuityHoldMs: 180,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'focus',
        expressionMode: 'blend',
        intensity: 0.52,
        holdMs: 180,
        rendererHints: null,
      },
      action: {
        actionCue: null,
        actionMode: 'none',
        intensity: 0,
        holdMs: 160,
        rendererHints: null,
      },
      motor: {
        ...createIdleStageEmbodimentMotorState(),
        facial: {
          ...createIdleStageEmbodimentMotorState().facial,
          mouthRound: 0.46,
          mouthSpread: 0.14,
          jawOpenBias: 0.34,
        },
      },
    })

    expect(bright).not.toBeNull()
    expect(deep).not.toBeNull()
    expect((bright?.spreadBias ?? 0)).toBeGreaterThan(bright?.roundBias ?? 0)
    expect((deep?.roundBias ?? 0)).toBeGreaterThan(deep?.spreadBias ?? 1)
    expect((deep?.jawBias ?? 0)).toBeGreaterThan(bright?.jawBias ?? 1)
  })

  it('uses voice rate to estimate playback duration when no audio duration exists yet', () => {
    const fast = estimateStageEmbodimentSpeechPlaybackDurationMs({
      text: 'Please keep speaking.',
      metadata: createMetadata('ash', { rateMultiplier: 1.12 }),
    })
    const slow = estimateStageEmbodimentSpeechPlaybackDurationMs({
      text: 'Please keep speaking.',
      metadata: createMetadata('ballad', { rateMultiplier: 0.88 }),
    })

    expect(slow).toBeGreaterThan(fast)
  })
})
