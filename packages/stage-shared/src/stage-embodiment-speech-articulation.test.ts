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

  it('keeps durable measured-return mouth release quieter and more closed near the tail than ordinary measured-return', () => {
    const baseMotor = createIdleStageEmbodimentMotorState()
    const ordinaryMeasuredReturn = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '陪着你慢慢说完。',
      metadata: createMetadata('onyx', {
        gender: 'male',
        language: 'zh-CN',
        pitchDelta: -4,
        rateMultiplier: 0.94,
        voiceName: 'Onyx Warm',
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
      digitalLifeFrame: {
        id: 'frame-ordinary-measured-return-tail',
        index: 0,
        startOffset: 0,
        endOffset: 8,
        text: '陪着你慢慢说完。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.94,
          energy: 0.28,
          cadence: 0.24,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.56,
          energyBias: 0.34,
          mouthScale: 0.82,
          continuityHoldMs: 380,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'steady',
            preferredBlinkCadence: 'quiet',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'steady',
            preferredBlinkCadence: 'quiet',
          },
        },
        motor: {
          ...baseMotor,
          facial: {
            ...baseMotor.facial,
            mouthRound: 0.28,
            mouthSpread: 0.12,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const durableMeasuredReturn = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '陪着你慢慢说完。',
      metadata: createMetadata('onyx', {
        gender: 'male',
        language: 'zh-CN',
        pitchDelta: -4,
        rateMultiplier: 0.94,
        voiceName: 'Onyx Warm',
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
      digitalLifeFrame: {
        id: 'frame-durable-measured-return-tail',
        index: 0,
        startOffset: 0,
        endOffset: 8,
        text: '陪着你慢慢说完。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.94,
          energy: 0.28,
          cadence: 0.24,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.56,
          energyBias: 0.34,
          mouthScale: 0.82,
          continuityHoldMs: 380,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'steady',
            preferredBlinkCadence: 'quiet',
          },
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'steady',
            preferredBlinkCadence: 'quiet',
          },
        },
        motor: {
          ...baseMotor,
          facial: {
            ...baseMotor.facial,
            mouthRound: 0.28,
            mouthSpread: 0.12,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    expect(durableMeasuredReturn.openness).toBeLessThanOrEqual(ordinaryMeasuredReturn.openness)
    expect(durableMeasuredReturn.jawOpen).toBeLessThanOrEqual(ordinaryMeasuredReturn.jawOpen)
    expect(durableMeasuredReturn.lipClosure).toBeGreaterThanOrEqual(ordinaryMeasuredReturn.lipClosure)
  })

  it('also treats soften-linger measured-return hints as durable companionship tail authority instead of only the older steady-quiet variant', () => {
    const baseMotor = createIdleStageEmbodimentMotorState()
    const ordinaryMeasuredReturn = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '陪着你慢慢说完。',
      metadata: createMetadata('onyx', {
        gender: 'male',
        language: 'zh-CN',
        pitchDelta: -4,
        rateMultiplier: 0.94,
        voiceName: 'Onyx Warm',
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
      digitalLifeFrame: {
        id: 'frame-ordinary-measured-return-tail-soften-linger-comparison',
        index: 0,
        startOffset: 0,
        endOffset: 8,
        text: '陪着你慢慢说完。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.94,
          energy: 0.28,
          cadence: 0.24,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.56,
          energyBias: 0.34,
          mouthScale: 0.82,
          continuityHoldMs: 380,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        motor: {
          ...baseMotor,
          facial: {
            ...baseMotor.facial,
            mouthRound: 0.28,
            mouthSpread: 0.12,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const durableMeasuredReturn = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '陪着你慢慢说完。',
      metadata: createMetadata('onyx', {
        gender: 'male',
        language: 'zh-CN',
        pitchDelta: -4,
        rateMultiplier: 0.94,
        voiceName: 'Onyx Warm',
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
      digitalLifeFrame: {
        id: 'frame-durable-measured-return-tail-soften-linger',
        index: 0,
        startOffset: 0,
        endOffset: 8,
        text: '陪着你慢慢说完。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.94,
          energy: 0.28,
          cadence: 0.24,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.56,
          energyBias: 0.34,
          mouthScale: 0.82,
          continuityHoldMs: 380,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
          },
        },
        motor: {
          ...baseMotor,
          facial: {
            ...baseMotor.facial,
            mouthRound: 0.28,
            mouthSpread: 0.12,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    expect(durableMeasuredReturn.openness).toBeLessThanOrEqual(ordinaryMeasuredReturn.openness)
    expect(durableMeasuredReturn.jawOpen).toBeLessThanOrEqual(ordinaryMeasuredReturn.jawOpen)
    expect(durableMeasuredReturn.lipClosure).toBeGreaterThanOrEqual(ordinaryMeasuredReturn.lipClosure)
  })

  it('keeps repair-before-closeness mouth release even more restrained than durable measured-return near the tail', () => {
    const baseMotor = createIdleStageEmbodimentMotorState()
    const durableMeasuredReturn = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '结果先落在这里，别急着靠近。',
      metadata: createMetadata('onyx', {
        gender: 'male',
        language: 'zh-CN',
        pitchDelta: -4,
        rateMultiplier: 0.94,
        voiceName: 'Onyx Warm',
      }),
      playbackDurationMs: 1380,
      startedAt: 0,
      now: 1260,
      mouthOpenRatio: 0.12,
      dynamics: {
        speechEnergy: 0.16,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.06,
        cadencePulse: 0.18,
      },
      digitalLifeFrame: {
        id: 'frame-durable-measured-return-repair-comparison',
        index: 0,
        startOffset: 0,
        endOffset: 14,
        text: '结果先落在这里，别急着靠近。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.94,
          energy: 0.24,
          cadence: 0.2,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.54,
          energyBias: 0.32,
          mouthScale: 0.8,
          continuityHoldMs: 420,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 400,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'steady',
            preferredBlinkCadence: 'quiet',
          },
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.16,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'steady',
            preferredBlinkCadence: 'quiet',
          },
        },
        motor: {
          ...baseMotor,
          facial: {
            ...baseMotor.facial,
            mouthRound: 0.26,
            mouthSpread: 0.1,
            jawOpenBias: 0.18,
          },
        },
      },
    })

    const repairBeforeCloseness = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '结果先落在这里，别急着靠近。',
      metadata: createMetadata('onyx', {
        gender: 'male',
        language: 'zh-CN',
        pitchDelta: -4,
        rateMultiplier: 0.94,
        voiceName: 'Onyx Warm',
      }),
      playbackDurationMs: 1380,
      startedAt: 0,
      now: 1260,
      mouthOpenRatio: 0.12,
      dynamics: {
        speechEnergy: 0.16,
        prosodyIntensity: 0.14,
        emphasisLevel: 0.06,
        cadencePulse: 0.18,
      },
      digitalLifeFrame: {
        id: 'frame-repair-before-closeness-tail',
        index: 0,
        startOffset: 0,
        endOffset: 14,
        text: '结果先落在这里，别急着靠近。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'hold',
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.94,
          energy: 0.24,
          cadence: 0.2,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.54,
          energyBias: 0.32,
          mouthScale: 0.8,
          continuityHoldMs: 420,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.38,
          holdMs: 420,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredGazeMode: 'steady',
            preferredBlinkCadence: 'quiet',
          },
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'hold',
          intensity: 0.12,
          holdMs: 320,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredGazeMode: 'steady',
            preferredBlinkCadence: 'quiet',
          },
        },
        motor: {
          ...baseMotor,
          facial: {
            ...baseMotor.facial,
            mouthRound: 0.24,
            mouthSpread: 0.08,
            jawOpenBias: 0.16,
          },
        },
      },
    })

    expect(repairBeforeCloseness.openness).toBeLessThan(durableMeasuredReturn.openness)
    expect(repairBeforeCloseness.jawOpen).toBeLessThan(durableMeasuredReturn.jawOpen)
    expect(repairBeforeCloseness.lipClosure).toBeGreaterThanOrEqual(durableMeasuredReturn.lipClosure)
    expect(repairBeforeCloseness.visemes.closed).toBeGreaterThanOrEqual(durableMeasuredReturn.visemes.closed)
  })
})
