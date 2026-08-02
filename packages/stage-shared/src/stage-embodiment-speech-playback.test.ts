import { describe, expect, it } from 'vitest'

import {
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
  projectStageEmbodimentSpeechCue,
} from './stage-embodiment-speech-playback'

interface TestProsodyInput {
  contour: 'falling' | 'flat' | 'rising'
  emphasisStrength: number
  segmentId: string
  tempoShift: number
  text: string
}

function createScript(input: TestProsodyInput) {
  return {
    version: 'embodiment-script-v1' as const,
    turnId: 'turn-prosody',
    rendererTarget: 'live2d' as const,
    replyText: input.text,
    state: {
      baseEmotion: 'thinking' as const,
      delivery: 'gentle' as const,
      emphasis: 1 as const,
      residentMode: 'dialogue' as const,
    },
    speechPlan: {
      interruptPolicy: 'soft-settle' as const,
      preRollMs: 20,
      settleMs: 260,
      segments: [{
        id: input.segmentId,
        index: 0,
        text: input.text,
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 260,
        prosody: {
          language: 'zh-CN',
          pauseClass: 'full-stop' as const,
          phraseBoundary: 'hard' as const,
          contour: input.contour,
          emphasisWord: null,
          emphasisStrength: input.emphasisStrength,
          tempoShift: input.tempoShift,
        },
      }],
    },
    facePlan: { speakingCues: [] },
    motionPlan: {
      idleBase: 'idle_settle',
      actionBursts: [],
      attentionMode: 'attentive' as const,
    },
    lipsyncPlan: { mode: 'energy-only' as const },
  }
}

function createProsodyItem(input: TestProsodyInput) {
  return createStageEmbodimentSpeechPlaybackItem({
    intentId: 'intent-prosody',
    streamId: 'stream-prosody',
    segmentId: input.segmentId,
    text: input.text,
    special: null,
    metadata: {
      embodimentScript: createScript(input),
    },
  })
}

function createVoiceItem(input: {
  cadence: number
  energy: number
  pitchDelta: number
  rateMultiplier: number
}) {
  const text = '请核对这段结果。'
  return createStageEmbodimentSpeechPlaybackItem({
    intentId: 'intent-voice',
    streamId: 'stream-voice',
    segmentId: 'segment-voice',
    text,
    special: null,
    digitalLifeFrame: {
      id: 'segment-voice',
      index: 0,
      startOffset: 0,
      endOffset: text.length,
      text,
      mode: 'speaking',
      interruptPolicy: 'soft-interrupt',
      settleMode: 'hold',
      voice: input,
      lipSync: {
        mode: 'hybrid',
        visemeBias: 0.5,
        energyBias: 0.28,
        mouthScale: 0.92,
        continuityHoldMs: 320,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'focused',
        expressionMode: 'hold',
        intensity: 0.46,
        holdMs: 320,
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.24,
        holdMs: 240,
      },
      motor: {
        stillness: 0.72,
        expressivity: 0.28,
        body: { sway: -0.06, settle: 0.68, openness: 0.54, lean: 0.14 },
        breath: { amplitude: 0.46, pace: 0.5 },
        gaze: { azimuth: 0.02, elevation: 0.03, focus: 0.96, stability: 0.64 },
        head: { nod: 0.18, pitch: 0.04, yaw: -0.02, roll: 0.02 },
        facial: {
          eyeOpenness: 0.58,
          browTension: 0.38,
          browLift: 0.08,
          cheekLift: 0.16,
          mouthRound: 0.26,
          mouthSpread: 0.24,
          jawOpenBias: 0.22,
        },
      },
    },
  })
}

function deriveDynamics(
  item: ReturnType<typeof createStageEmbodimentSpeechPlaybackItem>,
  overrides: Partial<Parameters<typeof deriveStageEmbodimentSpeechDynamicsState>[0]> = {},
) {
  return deriveStageEmbodimentSpeechDynamicsState({
    phase: 'playing',
    item,
    mouthOpenSize: 36,
    now: 320,
    speechEnergy: 0.48,
    startedAt: 0,
    stylePitch: 0,
    styleRate: 1,
    ...overrides,
  })
}

describe('stage embodiment speech playback', () => {
  it('keeps an explicit playback segment id when the cue id differs', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview',
      streamId: 'stream-preview',
      segmentId: 'segment-playback',
      text: '先看这里。',
      special: null,
      cue: {
        id: 'timeline-cue:0',
        index: 0,
        startOffset: 0,
        endOffset: 5,
        text: '先看这里。',
        emotion: 'thinking',
        gestureWeight: 0.24,
        facialWeight: 0.32,
        prosodyWeight: 0.28,
        beatWeight: 0.22,
        mouthWeight: 0.26,
        headWeight: 0.2,
        facialHoldMs: 180,
        actionHoldMs: 220,
        emotionHoldMs: 220,
        settleMode: 'release',
        rendererHints: null,
        rendererSettle: null,
        actionCue: null,
        facialCue: 'focused',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
      },
    })

    expect(item.segmentId).toBe('segment-playback')
    expect(item.cue?.id).toBe('timeline-cue:0')
  })

  it('raises cadence, emphasis, and prosody for a rising contour', () => {
    const flat = deriveDynamics(createProsodyItem({
      segmentId: 'flat',
      text: '先看这里。',
      contour: 'flat',
      emphasisStrength: 0.6,
      tempoShift: 0,
    }))
    const rising = deriveDynamics(createProsodyItem({
      segmentId: 'rising',
      text: '先看这里。',
      contour: 'rising',
      emphasisStrength: 0.6,
      tempoShift: 0,
    }))

    expect(rising.prosodyIntensity).toBeGreaterThan(flat.prosodyIntensity)
    expect(rising.cadencePulse).toBeGreaterThan(flat.cadencePulse)
    expect(rising.emphasisLevel).toBeGreaterThan(flat.emphasisLevel)
  })

  it('raises emphasis and prosody when the explicit emphasis strength increases', () => {
    const softer = deriveDynamics(createProsodyItem({
      segmentId: 'soft',
      text: '核对结果。',
      contour: 'falling',
      emphasisStrength: 0.2,
      tempoShift: 0,
    }))
    const stronger = deriveDynamics(createProsodyItem({
      segmentId: 'strong',
      text: '核对结果。',
      contour: 'falling',
      emphasisStrength: 0.8,
      tempoShift: 0,
    }))

    expect(stronger.emphasisLevel).toBeGreaterThan(softer.emphasisLevel)
    expect(stronger.prosodyIntensity).toBeGreaterThan(softer.prosodyIntensity)
  })

  it('reduces cadence pressure for an explicit negative tempo shift', () => {
    const slower = deriveDynamics(createProsodyItem({
      segmentId: 'slower',
      text: '核对结果。',
      contour: 'falling',
      emphasisStrength: 0.68,
      tempoShift: -0.08,
    }))
    const neutral = deriveDynamics(createProsodyItem({
      segmentId: 'neutral',
      text: '核对结果。',
      contour: 'falling',
      emphasisStrength: 0.68,
      tempoShift: 0,
    }))

    expect(slower.cadencePulse).toBeLessThan(neutral.cadencePulse)
  })

  it('uses frame voice rate and pitch instead of unrelated global style values', () => {
    const baseline = deriveDynamics(createVoiceItem({
      pitchDelta: 0,
      rateMultiplier: 1.02,
      energy: 0.42,
      cadence: 0.36,
    }), { now: 80, stylePitch: 20, styleRate: 1.28 })
    const slowerAndLifted = deriveDynamics(createVoiceItem({
      pitchDelta: 24,
      rateMultiplier: 0.72,
      energy: 0.42,
      cadence: 0.36,
    }), { now: 80, stylePitch: 0, styleRate: 1.28 })

    expect(slowerAndLifted.cadencePulse).toBeLessThan(baseline.cadencePulse)
    expect(slowerAndLifted.prosodyIntensity).toBeGreaterThan(baseline.prosodyIntensity)
  })

  it('uses explicit frame cadence and energy when no cue weights exist', () => {
    const restrained = deriveDynamics(createVoiceItem({
      pitchDelta: 0,
      rateMultiplier: 1,
      energy: 0.18,
      cadence: 0.18,
    }))
    const expressive = deriveDynamics(createVoiceItem({
      pitchDelta: 0,
      rateMultiplier: 1,
      energy: 0.72,
      cadence: 0.78,
    }))

    expect(expressive.cadencePulse).toBeGreaterThan(restrained.cadencePulse)
    expect(expressive.prosodyIntensity).toBeGreaterThan(restrained.prosodyIntensity)
  })

  it('projects explicit frame renderer and settle data without semantic label inference', () => {
    const item = createVoiceItem({
      pitchDelta: -2,
      rateMultiplier: 0.96,
      energy: 0.38,
      cadence: 0.34,
    })
    const frame = item.digitalLifeFrame!
    frame.face.rendererHints = {
      preferredBlinkCadence: 'quiet',
      preferredExpressionAliases: ['focus-soft'],
    }
    frame.action.rendererHints = {
      preferredMotionAliases: ['observe_focus'],
    }

    const cue = projectStageEmbodimentSpeechCue({
      digitalLifeFrame: frame,
      playbackItem: item,
    })

    expect(cue?.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'quiet',
      preferredExpressionAliases: ['focus-soft'],
      preferredMotionAliases: ['observe_focus'],
    }))
    expect(cue?.rendererSettle?.live2dFacialReleaseMs).toBeGreaterThan(0)
    expect(cue?.rendererSettle?.live2dMotionFollowThroughMs).toBeGreaterThan(0)
  })

  it('does not use text fallback when multiple script segments normalize to the same text', () => {
    const text = '重复片段。'
    const script = createScript({
      segmentId: 'first',
      text,
      contour: 'falling',
      emphasisStrength: 0.2,
      tempoShift: 0,
    })
    script.speechPlan.segments.push({
      ...script.speechPlan.segments[0],
      id: 'second',
      prosody: {
        ...script.speechPlan.segments[0].prosody,
        emphasisStrength: 0.9,
      },
    })
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-ambiguous',
      streamId: 'stream-ambiguous',
      segmentId: null,
      text,
      special: null,
      metadata: { embodimentScript: script },
    })

    const dynamics = deriveDynamics(item)
    expect(dynamics.emphasisLevel).toBeLessThan(0.5)
  })
})
