import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentSpeechPlan } from './speech-planner'

type SpeechPlannerInput = Parameters<typeof buildAlicizationEmbodimentSpeechPlan>[0]
type SpeechTimeline = NonNullable<SpeechPlannerInput['speechTimeline']>
type SpeechRendererHints = NonNullable<SpeechTimeline['segments'][number]['rendererHints']>

function pickComparableSegment(segment: NonNullable<ReturnType<typeof buildAlicizationEmbodimentSpeechPlan>['segments']>[number]) {
  return {
    index: segment.index,
    text: segment.text,
    interruptPolicy: segment.interruptPolicy,
    prosody: segment.prosody,
    preRollMs: segment.preRollMs,
    settleMs: segment.settleMs,
  }
}

function buildSingleSegmentPlan(input: {
  turnId: string
  segmentId: string
  text: string
  rendererHints?: SpeechRendererHints
  digitalLife?: SpeechPlannerInput['digitalLife']
}) {
  return buildAlicizationEmbodimentSpeechPlan({
    turnId: input.turnId,
    replyText: input.text,
    speechTimeline: {
      version: 'speech-timeline-v1',
      variationToken: input.turnId,
      reply: input.text,
      emotion: 'thinking',
      segments: [
        {
          id: input.segmentId,
          index: 0,
          startOffset: 0,
          endOffset: input.text.length,
          text: input.text,
          gestureWeight: 0.3,
          facialWeight: 0.4,
          prosodyWeight: 0.52,
          beatWeight: 0.36,
          actionCue: 'steady_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          ...(input.rendererHints ? { rendererHints: input.rendererHints } : {}),
        },
      ],
    },
    digitalLife: input.digitalLife ?? null,
  })
}

function createDigitalLifeWithFrameHints(input: {
  turnId: string
  segmentId: string
  text: string
  source: 'face' | 'action'
  rendererHints: SpeechRendererHints
}): NonNullable<SpeechPlannerInput['digitalLife']> {
  const faceRendererHints = input.source === 'face' ? input.rendererHints : undefined
  const actionRendererHints = input.source === 'action' ? input.rendererHints : undefined

  return {
    version: 'digital-life-v1',
    variationToken: input.turnId,
    emotion: 'thinking',
    mode: 'speaking',
    postureHint: 'attentive',
    performance: {
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 1,
    },
    speechStyle: {
      pitchDelta: 0,
      rateMultiplier: 1,
    },
    voice: {
      pitchDelta: 0,
      rateMultiplier: 1,
      energy: 0.42,
      cadence: 0.34,
    },
    lipSync: {
      mode: 'hybrid',
      visemeBias: 0.52,
      energyBias: 0.28,
      mouthScale: 0.92,
      continuityHoldMs: 260,
    },
    face: {
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      expressionMode: 'hold',
      intensity: 0.34,
      holdMs: 360,
    },
    action: {
      actionCue: 'steady_focus',
      actionMode: 'hold',
      intensity: 0.18,
      holdMs: 260,
    },
    motor: {
      stillness: 0.72,
      expressivity: 0.2,
      gaze: { focus: 0.58, stability: 0.78, azimuth: 0, elevation: 0.02 },
      head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.08 },
      breath: { amplitude: 0.18, pace: 0.24 },
      facial: {
        eyeOpenness: 0.62,
        browLift: 0.06,
        browTension: 0.14,
        cheekLift: 0.08,
        mouthSpread: 0.08,
        mouthRound: 0.1,
        jawOpenBias: 0.08,
      },
      body: {
        sway: 0.03,
        lean: 0.08,
        openness: 0.22,
        settle: 0.82,
      },
    },
    frames: [
      {
        id: input.segmentId,
        index: 0,
        startOffset: 0,
        endOffset: input.text.length,
        text: input.text,
        mode: 'speaking',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'hold',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.34,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.52,
          energyBias: 0.28,
          mouthScale: 0.92,
          continuityHoldMs: 260,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 360,
          ...(faceRendererHints ? { rendererHints: faceRendererHints } : {}),
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 260,
          ...(actionRendererHints ? { rendererHints: actionRendererHints } : {}),
        },
        motor: {
          stillness: 0.72,
          expressivity: 0.2,
          gaze: { focus: 0.58, stability: 0.78, azimuth: 0, elevation: 0.02 },
          head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.08 },
          breath: { amplitude: 0.18, pace: 0.24 },
          facial: {
            eyeOpenness: 0.62,
            browLift: 0.06,
            browTension: 0.14,
            cheekLift: 0.08,
            mouthSpread: 0.08,
            mouthRound: 0.1,
            jawOpenBias: 0.08,
          },
          body: {
            sway: 0.03,
            lean: 0.08,
            openness: 0.22,
            settle: 0.82,
          },
        },
      },
    ],
  } as NonNullable<SpeechPlannerInput['digitalLife']>
}

describe('speech planner prosody', () => {
  it('classifies chinese punctuation into phrase-level pause intent', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-prosody',
      replyText: '先看这里，然后点保存。最后告诉我结果。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-prosody',
        reply: '先看这里，然后点保存。最后告诉我结果。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 5,
            text: '先看这里，',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: null,
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 5,
            endOffset: 11,
            text: '然后点保存。',
            gestureWeight: 0.28,
            facialWeight: 0.38,
            prosodyWeight: 0.62,
            beatWeight: 0.42,
            actionCue: null,
            facialCue: 'focused',
            actionWindow: 'cadence-peak',
            interruptMode: 'soft-interrupt',
          },
        ],
      },
      digitalLife: null,
    })

    expect(plan.segments[0]?.prosody?.pauseClass).toBe('comma')
    expect(plan.segments[0]?.prosody?.phraseBoundary).toBe('soft')
    expect(plan.segments[1]?.prosody?.pauseClass).toBe('full-stop')
    expect(plan.segments[1]?.prosody?.phraseBoundary).toBe('hard')
  })

  it('softens measured-return identity-continuity', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-measured-return-prosody',
      replyText: '先慢一点回来。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-measured-return-prosody',
        reply: '先慢一点回来。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 7,
            text: '先慢一点回来。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-zh-measured-return-prosody',
        emotion: 'thinking',
        mode: 'speaking',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.34,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.52,
          energyBias: 0.28,
          mouthScale: 0.92,
          continuityHoldMs: 260,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 360,
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'segment',
          intensity: 0.18,
          holdMs: 260,
        },
        motor: {
          stillness: 0.72,
          expressivity: 0.2,
          gaze: { focus: 0.58, stability: 0.78, azimuth: 0, elevation: 0.02 },
          head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.08 },
          breath: { amplitude: 0.18, pace: 0.24 },
          facial: {
            eyeOpenness: 0.62,
            browLift: 0.06,
            browTension: 0.14,
            cheekLift: 0.08,
            mouthSpread: 0.08,
            mouthRound: 0.1,
            jawOpenBias: 0.08,
          },
          body: {
            sway: 0.03,
            lean: 0.08,
            openness: 0.22,
            settle: 0.82,
          },
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 7,
            text: '先慢一点回来。',
            mode: 'speaking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'hold',
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.34,
            },
            lipSync: {
              mode: 'hybrid',
              visemeBias: 0.52,
              energyBias: 0.28,
              mouthScale: 0.92,
              continuityHoldMs: 260,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.34,
              holdMs: 360,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'steady_focus',
              actionMode: 'segment',
              intensity: 0.18,
              holdMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0.72,
              expressivity: 0.2,
              gaze: { focus: 0.58, stability: 0.78, azimuth: 0, elevation: 0.02 },
              head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.08 },
              breath: { amplitude: 0.18, pace: 0.24 },
              facial: {
                eyeOpenness: 0.62,
                browLift: 0.06,
                browTension: 0.14,
                cheekLift: 0.08,
                mouthSpread: 0.08,
                mouthRound: 0.1,
                jawOpenBias: 0.08,
              },
              body: {
                sway: 0.03,
                lean: 0.08,
                openness: 0.22,
                settle: 0.82,
              },
            },
          },
        ],
      } as any,
    })

    expect(plan.segments[0]?.prosody).toEqual({
      language: 'zh-CN',
      pauseClass: 'full-stop',
      phraseBoundary: 'hard',
      contour: 'falling',
      emphasisWord: '回来',
      emphasisStrength: 0.45,
      tempoShift: -0.12,
    })
  })

  it('lets remembered longer pause cadence further slow and lengthen a measured-return segment', () => {
    const naturalPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-natural-pause-prosody',
      replyText: '我先中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-natural-pause-prosody',
        reply: '我先中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 9,
            text: '我先中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'natural',
            } as any,
          },
        ],
      },
      digitalLife: null,
    })

    const longerPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-longer-pause-prosody',
      replyText: '我先中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-longer-pause-prosody',
        reply: '我先中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 9,
            text: '我先中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
            } as any,
          },
        ],
      },
      digitalLife: null,
    })

    expect(longerPlan.segments[0]?.prosody?.tempoShift).toBeLessThan(
      naturalPlan.segments[0]?.prosody?.tempoShift ?? Number.POSITIVE_INFINITY,
    )
    expect(longerPlan.segments[0]?.settleMs).toBeGreaterThan(
      naturalPlan.segments[0]?.settleMs ?? Number.NEGATIVE_INFINITY,
    )
  })

  it('lets lower-pressure slower voice hints keep a measured-return segment more inward than an otherwise identical natural-even line', () => {
    const naturalEvenPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-natural-even-voice-prosody',
      replyText: '我先沿着这条线中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-natural-even-voice-prosody',
        reply: '我先沿着这条线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-natural-even-voice',
            index: 0,
            startOffset: 0,
            endOffset: 13,
            text: '我先沿着这条线中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: 'even',
              preferredPacingMode: 'natural',
            } as any,
          },
        ],
      },
      digitalLife: null,
    })

    const slowerLowerPressurePlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-slower-lower-pressure-voice-prosody',
      replyText: '我先沿着这条线中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-slower-lower-pressure-voice-prosody',
        reply: '我先沿着这条线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-slower-lower-pressure-voice',
            index: 0,
            startOffset: 0,
            endOffset: 13,
            text: '我先沿着这条线中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
            } as any,
          },
        ],
      },
      digitalLife: null,
    })

    expect(slowerLowerPressurePlan.segments[0]?.prosody?.emphasisStrength).toBeLessThan(
      naturalEvenPlan.segments[0]?.prosody?.emphasisStrength ?? Number.POSITIVE_INFINITY,
    )
    expect(slowerLowerPressurePlan.segments[0]?.prosody?.tempoShift).toBeLessThan(
      naturalEvenPlan.segments[0]?.prosody?.tempoShift ?? Number.POSITIVE_INFINITY,
    )
    expect(slowerLowerPressurePlan.segments[0]?.settleMs).toBeGreaterThan(
      naturalEvenPlan.segments[0]?.settleMs ?? Number.NEGATIVE_INFINITY,
    )
  })

  it('treats polluted measured-return face-motion tokens the same as clean measured-return hints', () => {
    const cleanPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-measured-return-face-motion-prosody',
      replyText: '我先沿着脸、动作和声音还连着的这条线中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-measured-return-face-motion-prosody',
        reply: '我先沿着脸、动作和声音还连着的这条线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-measured-return-face-motion',
            index: 0,
            startOffset: 0,
            endOffset: 23,
            text: '我先沿着脸、动作和声音还连着的这条线中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      },
      digitalLife: null,
    })

    const pollutedPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-measured-return-face-motion-prosody',
      replyText: '我先沿着脸、动作和声音还连着的这条线中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-measured-return-face-motion-prosody',
        reply: '我先沿着脸、动作和声音还连着的这条线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-measured-return-face-motion',
            index: 0,
            startOffset: 0,
            endOffset: 23,
            text: '我先沿着脸、动作和声音还连着的这条线中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              signature: 'resident|main-runtime|embodiment:still_voiced_face_motion_line|lane=face+motion+voice-only',
              reasonTags: ['embodiment:still_voiced_face_motion_line'],
            },
          },
        ],
      },
      digitalLife: null,
    })

    expect(pickComparableSegment(pollutedPlan.segments[0]!)).toEqual(pickComparableSegment(cleanPlan.segments[0]!))
  })

  it('treats polluted repair-before-closeness body+voice tokens the same as clean repair hints', () => {
    const cleanPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-repair-prosody',
      replyText: '先慢一点回来。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-repair-prosody',
        reply: '先慢一点回来。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-repair',
            index: 0,
            startOffset: 0,
            endOffset: 7,
            text: '先慢一点回来。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
        ],
      },
      digitalLife: null,
    })

    const pollutedPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-repair-prosody',
      replyText: '先慢一点回来。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-repair-prosody',
        reply: '先慢一点回来。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-repair',
            index: 0,
            startOffset: 0,
            endOffset: 7,
            text: '先慢一点回来。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
              signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
              reasonTags: ['embodiment:body+voice-only'],
            },
          },
        ],
      },
      digitalLife: null,
    })

    expect(pickComparableSegment(pollutedPlan.segments[0]!)).toEqual(pickComparableSegment(cleanPlan.segments[0]!))
  })

  it('treats polluted same-thread body+voice tokens the same as clean same-thread hints', () => {
    const cleanPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-same-thread-prosody',
      replyText: '我先沿着这条还活着的线中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-same-thread-prosody',
        reply: '我先沿着这条还活着的线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-same-thread',
            index: 0,
            startOffset: 0,
            endOffset: 16,
            text: '我先沿着这条还活着的线中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'same-thread-continuation',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      },
      digitalLife: null,
    })

    const pollutedPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-same-thread-prosody',
      replyText: '我先沿着这条还活着的线中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-same-thread-prosody',
        reply: '我先沿着这条还活着的线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-same-thread',
            index: 0,
            startOffset: 0,
            endOffset: 16,
            text: '我先沿着这条还活着的线中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'same-thread-continuation',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
              reasonTags: ['embodiment:body+voice-only'],
            },
          },
        ],
      },
      digitalLife: null,
    })

    expect(pickComparableSegment(pollutedPlan.segments[0]!)).toEqual(pickComparableSegment(cleanPlan.segments[0]!))
  })

  it('treats polluted same-thread motion-line tokens the same as clean same-thread hints', () => {
    const cleanPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-same-thread-motion-prosody',
      replyText: '我先沿着动作和声音还连着的这条线中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-same-thread-motion-prosody',
        reply: '我先沿着动作和声音还连着的这条线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-same-thread-motion',
            index: 0,
            startOffset: 0,
            endOffset: 20,
            text: '我先沿着动作和声音还连着的这条线中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'same-thread-continuation',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      },
      digitalLife: null,
    })

    const pollutedPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-same-thread-motion-prosody',
      replyText: '我先沿着动作和声音还连着的这条线中性可见占位。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-same-thread-motion-prosody',
        reply: '我先沿着动作和声音还连着的这条线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-same-thread-motion',
            index: 0,
            startOffset: 0,
            endOffset: 20,
            text: '我先沿着动作和声音还连着的这条线中性可见占位。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'same-thread-continuation',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              signature: 'resident|main-runtime|embodiment:still-voiced-motion-line',
              reasonTags: ['embodiment:still-voiced-motion-line'],
            },
          },
        ],
      },
      digitalLife: null,
    })

    expect(pickComparableSegment(pollutedPlan.segments[0]!)).toEqual(pickComparableSegment(cleanPlan.segments[0]!))
  })

  it('ignores polluted frame face audit hints when segment renderer hints are absent', () => {
    const turnId = 'turn-zh-frame-face-fallback-prosody'
    const segmentId = 'segment-frame-face-fallback'
    const text = '我先按结构化表情节奏把这句话接稳。'
    const rendererHints: SpeechRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }
    const cleanPlan = buildSingleSegmentPlan({
      turnId,
      segmentId,
      text,
      digitalLife: createDigitalLifeWithFrameHints({
        turnId,
        segmentId,
        text,
        source: 'face',
        rendererHints,
      }),
    })
    const pollutedPlan = buildSingleSegmentPlan({
      turnId,
      segmentId,
      text,
      digitalLife: createDigitalLifeWithFrameHints({
        turnId,
        segmentId,
        text,
        source: 'face',
        rendererHints: {
          ...rendererHints,
          signature: 'resident|main-runtime|embodiment:still-voiced-face-line',
          reasonTags: ['embodiment:still-voiced-face-line'],
        },
      }),
    })

    expect(pickComparableSegment(pollutedPlan.segments[0]!)).toEqual(pickComparableSegment(cleanPlan.segments[0]!))
  })

  it('ignores polluted frame action audit hints when segment renderer hints are absent', () => {
    const turnId = 'turn-zh-frame-action-fallback-prosody'
    const segmentId = 'segment-frame-action-fallback'
    const text = '我先按结构化动作节奏把这句话接稳。'
    const rendererHints: SpeechRendererHints = {
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }
    const cleanPlan = buildSingleSegmentPlan({
      turnId,
      segmentId,
      text,
      digitalLife: createDigitalLifeWithFrameHints({
        turnId,
        segmentId,
        text,
        source: 'action',
        rendererHints,
      }),
    })
    const pollutedPlan = buildSingleSegmentPlan({
      turnId,
      segmentId,
      text,
      digitalLife: createDigitalLifeWithFrameHints({
        turnId,
        segmentId,
        text,
        source: 'action',
        rendererHints: {
          ...rendererHints,
          signature: 'resident|main-runtime|embodiment:body+voice-only',
          reasonTags: ['embodiment:body+voice-only'],
        },
      }),
    })

    expect(pickComparableSegment(pollutedPlan.segments[0]!)).toEqual(pickComparableSegment(cleanPlan.segments[0]!))
  })

  it('softens repair-before-closeness prosody relative to the same hints without resident mode', () => {
    const turnId = 'turn-zh-repair-structured-baseline-prosody'
    const segmentId = 'segment-repair-structured-baseline'
    const text = '先慢一点回来。'
    const softeningHints: SpeechRendererHints = {
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }
    const baselinePlan = buildSingleSegmentPlan({
      turnId,
      segmentId,
      text,
      rendererHints: softeningHints,
    })
    const repairPlan = buildSingleSegmentPlan({
      turnId,
      segmentId,
      text,
      rendererHints: {
        ...softeningHints,
        residentMode: 'repair-before-closeness',
      },
    })

    expect(repairPlan.segments[0]?.prosody?.emphasisStrength).toBeLessThan(
      baselinePlan.segments[0]?.prosody?.emphasisStrength ?? Number.POSITIVE_INFINITY,
    )
    expect(repairPlan.segments[0]?.prosody?.tempoShift).toBeLessThan(
      baselinePlan.segments[0]?.prosody?.tempoShift ?? Number.POSITIVE_INFINITY,
    )
  })

  it('softens same-thread-continuation prosody relative to the same hints without resident mode', () => {
    const turnId = 'turn-zh-same-thread-structured-baseline-prosody'
    const segmentId = 'segment-same-thread-structured-baseline'
    const text = '我继续沿着当前这条线说。'
    const softeningHints: SpeechRendererHints = {
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }
    const baselinePlan = buildSingleSegmentPlan({
      turnId,
      segmentId,
      text,
      rendererHints: softeningHints,
    })
    const sameThreadPlan = buildSingleSegmentPlan({
      turnId,
      segmentId,
      text,
      rendererHints: {
        ...softeningHints,
        residentMode: 'same-thread-continuation',
      },
    })

    expect(sameThreadPlan.segments[0]?.prosody?.emphasisStrength).toBeLessThan(
      baselinePlan.segments[0]?.prosody?.emphasisStrength ?? Number.POSITIVE_INFINITY,
    )
    expect(sameThreadPlan.segments[0]?.prosody?.tempoShift).toBeLessThan(
      baselinePlan.segments[0]?.prosody?.tempoShift ?? Number.POSITIVE_INFINITY,
    )
  })

  it('keeps quiet-companionship segment prosody inward and gentler than ordinary dialogue without forcing the full measured-return reopen cadence', () => {
    const ordinaryDialoguePlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-ordinary-dialogue-prosody',
      replyText: '我先安静陪着，把这条线接稳一点。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-ordinary-dialogue-prosody',
        reply: '我先安静陪着，把这条线接稳一点。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-ordinary-dialogue',
            index: 0,
            startOffset: 0,
            endOffset: 15,
            text: '我先安静陪着，把这条线接稳一点。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'dialogue',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
        ],
      },
      digitalLife: null,
    })

    const quietCompanionshipPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-quiet-companionship-prosody',
      replyText: '我先安静陪着，把这条线接稳一点。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-quiet-companionship-prosody',
        reply: '我先安静陪着，把这条线接稳一点。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-quiet-companionship',
            index: 0,
            startOffset: 0,
            endOffset: 15,
            text: '我先安静陪着，把这条线接稳一点。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
        ],
      },
      digitalLife: null,
    })

    const measuredReturnPlan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-measured-return-compare-prosody',
      replyText: '我先安静陪着，把这条线接稳一点。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-measured-return-compare-prosody',
        reply: '我先安静陪着，把这条线接稳一点。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-measured-return-compare',
            index: 0,
            startOffset: 0,
            endOffset: 15,
            text: '我先安静陪着，把这条线接稳一点。',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: 'steady_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      },
      digitalLife: null,
    })

    expect(quietCompanionshipPlan.segments[0]?.prosody?.emphasisStrength).toBeLessThan(
      ordinaryDialoguePlan.segments[0]?.prosody?.emphasisStrength ?? Number.POSITIVE_INFINITY,
    )
    expect(quietCompanionshipPlan.segments[0]?.prosody?.emphasisStrength).toBeGreaterThanOrEqual(
      measuredReturnPlan.segments[0]?.prosody?.emphasisStrength ?? Number.NEGATIVE_INFINITY,
    )
    expect(quietCompanionshipPlan.segments[0]?.prosody?.tempoShift).toBeLessThan(
      ordinaryDialoguePlan.segments[0]?.prosody?.tempoShift ?? Number.POSITIVE_INFINITY,
    )
    expect(quietCompanionshipPlan.segments[0]?.prosody?.tempoShift).toBeGreaterThanOrEqual(
      measuredReturnPlan.segments[0]?.prosody?.tempoShift ?? Number.NEGATIVE_INFINITY,
    )
  })
})
