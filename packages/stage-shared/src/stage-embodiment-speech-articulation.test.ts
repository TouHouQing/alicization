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
  pitchDelta?: number
  rateMultiplier?: number
  voiceName?: string
}) {
  return {
    speechSynthesis: {
      provider: 'openai-compatible-audio-speech',
      model: 'gpt-4o-mini-tts',
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

function createFrame() {
  const motor = createIdleStageEmbodimentMotorState()
  return {
    id: 'frame-articulation',
    index: 0,
    startOffset: 0,
    endOffset: 8,
    text: '请核对结果。',
    mode: 'speaking' as const,
    interruptPolicy: 'soft-interrupt' as const,
    settleMode: 'release' as const,
    voice: {
      pitchDelta: -4,
      rateMultiplier: 0.94,
      energy: 0.28,
      cadence: 0.24,
    },
    lipSync: {
      mode: 'hybrid' as const,
      visemeBias: 0.56,
      energyBias: 0.34,
      mouthScale: 0.82,
      continuityHoldMs: 380,
    },
    face: {
      emotion: 'thinking' as const,
      facialCue: 'soft-gaze',
      expressionMode: 'hold' as const,
      intensity: 0.44,
      holdMs: 360,
      rendererHints: null,
    },
    action: {
      actionCue: 'observe_focus',
      actionMode: 'hold' as const,
      intensity: 0.18,
      holdMs: 260,
      rendererHints: null,
    },
    motor: {
      ...motor,
      facial: {
        ...motor.facial,
        mouthRound: 0.28,
        mouthSpread: 0.12,
        jawOpenBias: 0.2,
      },
    },
  }
}

describe('stage embodiment speech articulation', () => {
  it('estimates stronger bilabial closure near m, b, and p units', () => {
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

  it('favors rounded lips for rounded vowels and a deeper voice profile', () => {
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
    expect(articulation.visemes.O + articulation.visemes.U).toBeGreaterThan(
      articulation.visemes.E + articulation.visemes.I,
    )
  })

  it('derives distinct articulation bias from distinct TTS identities', () => {
    const bright = normalizeStageEmbodimentSpeechArticulationVoiceProfile(createMetadata('nova', {
      gender: 'female',
      pitchDelta: 4,
      rateMultiplier: 1.08,
      voiceName: 'Nova Bright',
    }))
    const deep = normalizeStageEmbodimentSpeechArticulationVoiceProfile(
      createMetadata('onyx', {
        gender: 'male',
        pitchDelta: -5,
        rateMultiplier: 0.94,
        voiceName: 'Onyx Warm',
      }),
      createFrame(),
    )

    expect(bright).not.toBeNull()
    expect(deep).not.toBeNull()
    expect(bright!.spreadBias).toBeGreaterThan(bright!.roundBias)
    expect(deep!.roundBias).toBeGreaterThan(deep!.spreadBias)
    expect(deep!.jawBias).toBeGreaterThan(bright!.jawBias)
  })

  it('uses voice rate to estimate playback duration before audio duration is known', () => {
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

  it('does not infer articulation changes from renderer-only metadata', () => {
    const frame = createFrame()
    const input = {
      active: true,
      text: frame.text,
      metadata: createMetadata('onyx', {
        gender: 'male',
        language: 'zh-CN',
        pitchDelta: -4,
        rateMultiplier: 0.94,
      }),
      playbackDurationMs: 1200,
      startedAt: 0,
      now: 1080,
      mouthOpenRatio: 0.12,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.16,
        emphasisLevel: 0.08,
        cadencePulse: 0.2,
      },
    }
    const explicitRendererHints = {
      preferredGazeMode: 'steady' as const,
      preferredBlinkCadence: 'quiet' as const,
      preferredLipsyncMode: 'restrained' as const,
      preferredVoiceMode: 'even' as const,
    }

    const baseline = deriveStageEmbodimentSpeechArticulationState({
      ...input,
      digitalLifeFrame: frame,
    })
    const withRendererMetadata = deriveStageEmbodimentSpeechArticulationState({
      ...input,
      digitalLifeFrame: {
        ...frame,
        face: { ...frame.face, rendererHints: explicitRendererHints },
        action: { ...frame.action, rendererHints: explicitRendererHints },
      },
    })

    expect(withRendererMetadata).toEqual(baseline)
  })
})
