import { describe, expect, it } from 'vitest'

import {
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
  deriveStageEmbodimentSpeechRenderState,
  projectStageEmbodimentSpeechCue,
} from './stage-embodiment-speech-playback'

interface TestProsodyInput {
  segmentId: string | null
  text: string
  pauseClass: 'comma' | 'full-stop' | 'question'
  phraseBoundary: 'soft' | 'hard'
  contour: 'flat' | 'falling' | 'rising'
  emphasisStrength: number
  tempoShift: number
  planText?: string
}

function createTestEmbodimentScriptSegment(input: TestProsodyInput) {
  return {
    id: input.segmentId ?? 'segment-prosody',
    index: 0,
    text: input.planText ?? input.text,
    interruptPolicy: 'soft-settle' as const,
    preRollMs: 20,
    settleMs: 260,
    prosody: {
      language: 'zh-CN',
      pauseClass: input.pauseClass,
      phraseBoundary: input.phraseBoundary,
      contour: input.contour,
      emphasisWord: '这里',
      emphasisStrength: input.emphasisStrength,
      tempoShift: input.tempoShift,
    },
  }
}

function createTestEmbodimentScript(input: {
  replyText: string
  segments: ReturnType<typeof createTestEmbodimentScriptSegment>[]
}) {
  return {
    version: 'embodiment-script-v1' as const,
    turnId: 'turn-prosody',
    rendererTarget: 'live2d' as const,
    replyText: input.replyText,
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
      segments: input.segments,
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

function createPlaybackItemWithEmbodimentScript(input: {
  segmentId: string | null
  text: string
  script: ReturnType<typeof createTestEmbodimentScript>
}) {
  return createStageEmbodimentSpeechPlaybackItem({
    intentId: 'intent-prosody',
    streamId: 'stream-prosody',
    segmentId: input.segmentId,
    text: input.text,
    special: null,
    metadata: {
      embodimentScript: input.script,
    },
  })
}

function createPlaybackItemWithProsody(input: TestProsodyInput) {
  return createPlaybackItemWithEmbodimentScript({
    segmentId: input.segmentId,
    text: input.text,
    script: createTestEmbodimentScript({
      replyText: input.text,
      segments: [createTestEmbodimentScriptSegment(input)],
    }),
  })
}

function deriveDynamicsWithItem(item: ReturnType<typeof createStageEmbodimentSpeechPlaybackItem>, input?: {
  mouthOpenSize?: number
  now?: number
  speechEnergy?: number
  startedAt?: number
  stylePitch?: number
  styleRate?: number
}) {
  return deriveStageEmbodimentSpeechDynamicsState({
    phase: 'playing',
    item,
    mouthOpenSize: input?.mouthOpenSize ?? 36,
    now: input?.now ?? 320,
    speechEnergy: input?.speechEnergy ?? 0.48,
    startedAt: input?.startedAt ?? 0,
    stylePitch: input?.stylePitch ?? 0,
    styleRate: input?.styleRate ?? 1,
  })
}

function createPlaybackItemWithVoiceFrame(input: {
  text: string
  pitchDelta: number
  rateMultiplier: number
  energy?: number
  cadence?: number
}) {
  return createStageEmbodimentSpeechPlaybackItem({
    intentId: 'intent-voice-frame',
    streamId: 'stream-voice-frame',
    segmentId: 'segment-voice-frame',
    text: input.text,
    special: null,
    digitalLifeFrame: {
      id: 'segment-voice-frame',
      index: 0,
      startOffset: 0,
      endOffset: input.text.length,
      text: input.text,
      mode: 'speaking',
      interruptPolicy: 'soft-interrupt',
      settleMode: 'hold',
      voice: {
        pitchDelta: input.pitchDelta,
        rateMultiplier: input.rateMultiplier,
        energy: input.energy ?? 0.42,
        cadence: input.cadence ?? 0.36,
      },
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
        body: {
          sway: -0.06,
          settle: 0.68,
          openness: 0.54,
          lean: 0.14,
        },
        breath: {
          amplitude: 0.46,
          pace: 0.5,
        },
        gaze: {
          azimuth: 0.02,
          elevation: 0.03,
          focus: 0.96,
          stability: 0.64,
        },
        head: {
          nod: 0.18,
          pitch: 0.04,
          yaw: -0.02,
          roll: 0.02,
        },
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

describe('stage embodiment speech playback dynamics', () => {
  it('keeps the explicit playback segment id when cue authority is only a timeline shell', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview-shell',
      streamId: 'stream-preview-shell',
      segmentId: 'segment-preview-living-line',
      text: '先看这里，',
      special: null,
      cue: {
        id: 'turn-preview-queue:0',
        index: 0,
        startOffset: 0,
        endOffset: 5,
        text: '先看这里，',
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

    expect(item.segmentId).toBe('segment-preview-living-line')
    expect(item.cue?.id).toBe('turn-preview-queue:0')
  })

  it('raises cadence and prosody intensity for rising contours without changing other prosody inputs', () => {
    const flat = deriveDynamicsWithItem(
      createPlaybackItemWithProsody({
        segmentId: 'segment-flat',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'flat',
        emphasisStrength: 0.6,
        tempoShift: 0,
      }),
    )

    const risingContour = deriveDynamicsWithItem(
      createPlaybackItemWithProsody({
        segmentId: 'segment-rising',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'rising',
        emphasisStrength: 0.6,
        tempoShift: 0,
      }),
    )

    expect(risingContour.prosodyIntensity).toBeGreaterThan(flat.prosodyIntensity)
    expect(risingContour.cadencePulse).toBeGreaterThan(flat.cadencePulse)
    expect(risingContour.emphasisLevel).toBeGreaterThan(flat.emphasisLevel)
  })

  it('raises emphasis and prosody intensity for stronger prosody emphasis', () => {
    const softer = deriveDynamicsWithItem(
      createPlaybackItemWithProsody({
        segmentId: 'segment-soft-emphasis',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.2,
        tempoShift: 0,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46 },
    )

    const stronger = deriveDynamicsWithItem(
      createPlaybackItemWithProsody({
        segmentId: 'segment-strong-emphasis',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.8,
        tempoShift: 0,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46 },
    )

    expect(stronger.emphasisLevel).toBeGreaterThan(softer.emphasisLevel)
    expect(stronger.prosodyIntensity).toBeGreaterThan(softer.prosodyIntensity)
  })

  it('slows cadence pressure for negative tempo shifts without changing other prosody inputs', () => {
    const slower = deriveDynamicsWithItem(
      createPlaybackItemWithProsody({
        segmentId: 'segment-slower',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.68,
        tempoShift: -0.08,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46 },
    )

    const neutralTempo = deriveDynamicsWithItem(
      createPlaybackItemWithProsody({
        segmentId: 'segment-neutral-tempo',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.68,
        tempoShift: 0,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46 },
    )

    expect(slower.cadencePulse).toBeLessThan(neutralTempo.cadencePulse)
  })

  it('prefers playback item voice rate over the global style rate when shaping early cadence pressure', () => {
    const baseline = deriveDynamicsWithItem(
      createPlaybackItemWithVoiceFrame({
        text: '先慢一点接住这句。',
        pitchDelta: 6,
        rateMultiplier: 1.02,
      }),
      { mouthOpenSize: 34, now: 80, speechEnergy: 0.46, stylePitch: 4, styleRate: 1.28 },
    )

    const slower = deriveDynamicsWithItem(
      createPlaybackItemWithVoiceFrame({
        text: '先慢一点接住这句。',
        pitchDelta: 6,
        rateMultiplier: 0.72,
      }),
      { mouthOpenSize: 34, now: 80, speechEnergy: 0.46, stylePitch: 4, styleRate: 1.28 },
    )

    expect(slower.cadencePulse).toBeLessThan(baseline.cadencePulse)
  })

  it('prefers playback item voice pitch over the global style pitch when shaping current prosody intensity', () => {
    const restrained = deriveDynamicsWithItem(
      createPlaybackItemWithVoiceFrame({
        text: '把声音轻一点落下来。',
        pitchDelta: 0,
        rateMultiplier: 1,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46, stylePitch: 4, styleRate: 1 },
    )

    const lifted = deriveDynamicsWithItem(
      createPlaybackItemWithVoiceFrame({
        text: '把声音轻一点落下来。',
        pitchDelta: 24,
        rateMultiplier: 1,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46, stylePitch: 4, styleRate: 1 },
    )

    expect(lifted.prosodyIntensity).toBeGreaterThan(restrained.prosodyIntensity)
  })

  it('uses playback item voice cadence as fallback cadence pressure when cue beat is absent', () => {
    const restrained = deriveDynamicsWithItem(
      createPlaybackItemWithVoiceFrame({
        text: '先沿着这条生命线慢一点接回来。',
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: 0.42,
        cadence: 0.18,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46, stylePitch: 0, styleRate: 1 },
    )

    const animated = deriveDynamicsWithItem(
      createPlaybackItemWithVoiceFrame({
        text: '先沿着这条生命线慢一点接回来。',
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: 0.42,
        cadence: 0.78,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46, stylePitch: 0, styleRate: 1 },
    )

    expect(animated.cadencePulse).toBeGreaterThan(restrained.cadencePulse)
  })

  it('uses playback item voice energy as fallback prosody pressure when cue mouth weight is absent', () => {
    const restrained = deriveDynamicsWithItem(
      createPlaybackItemWithVoiceFrame({
        text: '把这一句轻一点留在这里。',
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: 0.18,
        cadence: 0.36,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46, stylePitch: 0, styleRate: 1 },
    )

    const expressive = deriveDynamicsWithItem(
      createPlaybackItemWithVoiceFrame({
        text: '把这一句轻一点留在这里。',
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: 0.72,
        cadence: 0.36,
      }),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.46, stylePitch: 0, styleRate: 1 },
    )

    expect(expressive.prosodyIntensity).toBeGreaterThan(restrained.prosodyIntensity)
  })

  it('keeps script-only repair-before-closeness playback dynamics more restrained than measured-return and ordinary dialogue', () => {
    function createResidentModeDynamicsItem(residentMode: 'dialogue' | 'measured-return' | 'repair-before-closeness') {
      return createStageEmbodimentSpeechPlaybackItem({
        intentId: `intent-${residentMode}-dynamics`,
        streamId: `stream-${residentMode}-dynamics`,
        segmentId: `segment-${residentMode}-dynamics`,
        text: '结果先落在这里，别急着靠近。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: `turn-${residentMode}-dynamics`,
            rendererTarget: 'vrm',
            replyText: '结果先落在这里，别急着靠近。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 0,
              residentMode,
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: residentMode === 'repair-before-closeness' ? 360 : 320,
              segments: [{
                id: `segment-${residentMode}-dynamics`,
                index: 0,
                text: '结果先落在这里，别急着靠近。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: residentMode === 'repair-before-closeness' ? 360 : 320,
              }],
            },
            facePlan: {
              speakingCues: [{
                segmentId: `segment-${residentMode}-dynamics`,
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: residentMode === 'repair-before-closeness' ? 0.42 : 0.48,
                holdMs: residentMode === 'repair-before-closeness' ? 380 : 360,
                preUtteranceCue: residentMode === 'repair-before-closeness' ? 'soft-breath' : 'steady-inhale',
                postUtteranceCue: residentMode === 'repair-before-closeness' ? 'soft-release' : 'eyes-soften',
                source: 'prosody-authority',
                confidence: 0.94,
              }],
            },
            motionPlan: {
              idleBase: 'steady_focus',
              actionBursts: [{
                segmentId: `segment-${residentMode}-dynamics`,
                actionCue: 'steady_focus',
                intensity: 0.24,
                holdMs: 280,
                source: 'timeline-projection',
                confidence: 0.88,
              }],
              attentionMode: 'attentive',
            },
            lipsyncPlan: {
              mode: 'energy-only',
            },
          },
        },
      })
    }

    const dialogue = deriveDynamicsWithItem(createResidentModeDynamicsItem('dialogue'), {
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.44,
    })
    const measuredReturn = deriveDynamicsWithItem(createResidentModeDynamicsItem('measured-return'), {
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.44,
    })
    const repairBeforeCloseness = deriveDynamicsWithItem(createResidentModeDynamicsItem('repair-before-closeness'), {
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.44,
    })

    expect(measuredReturn.cadencePulse).toBeLessThan(dialogue.cadencePulse)
    expect(repairBeforeCloseness.cadencePulse).toBeLessThan(measuredReturn.cadencePulse)
    expect(measuredReturn.prosodyIntensity).toBeLessThan(dialogue.prosodyIntensity)
    expect(repairBeforeCloseness.prosodyIntensity).toBeLessThan(measuredReturn.prosodyIntensity)
  })

  it('keeps quiet-companionship playback dynamics inward and gentler than ordinary dialogue without forcing the full measured-return reopen cadence', () => {
    function createQuietCompanionshipDynamicsItem(
      residentMode: 'dialogue' | 'quiet-companionship' | 'quiet-accompaniment' | 'measured-return',
    ) {
      return createStageEmbodimentSpeechPlaybackItem({
        intentId: `intent-${residentMode}-quiet-dynamics`,
        streamId: `stream-${residentMode}-quiet-dynamics`,
        segmentId: `segment-${residentMode}-quiet-dynamics`,
        text: '我先安静陪着，把这条线接稳一点。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: `turn-${residentMode}-quiet-dynamics`,
            rendererTarget: 'vrm',
            replyText: '我先安静陪着，把这条线接稳一点。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 0,
              residentMode,
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: residentMode === 'measured-return' ? 320 : residentMode === 'dialogue' ? 260 : 300,
              segments: [{
                id: `segment-${residentMode}-quiet-dynamics`,
                index: 0,
                text: '我先安静陪着，把这条线接稳一点。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: residentMode === 'measured-return' ? 320 : residentMode === 'dialogue' ? 260 : 300,
              }],
            },
            facePlan: {
              speakingCues: [{
                segmentId: `segment-${residentMode}-quiet-dynamics`,
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: residentMode === 'dialogue' ? 0.5 : residentMode === 'measured-return' ? 0.46 : 0.44,
                holdMs: residentMode === 'dialogue' ? 320 : residentMode === 'measured-return' ? 360 : 340,
                preUtteranceCue: residentMode === 'dialogue' ? 'steady-inhale' : 'soft-breath',
                postUtteranceCue: residentMode === 'dialogue' ? 'eyes-soften' : 'soft-release',
                source: 'prosody-authority',
                confidence: 0.94,
              }],
            },
            motionPlan: {
              idleBase: 'steady_focus',
              actionBursts: [{
                segmentId: `segment-${residentMode}-quiet-dynamics`,
                actionCue: 'steady_focus',
                intensity: residentMode === 'dialogue' ? 0.28 : residentMode === 'measured-return' ? 0.22 : 0.2,
                holdMs: residentMode === 'dialogue' ? 260 : residentMode === 'measured-return' ? 300 : 280,
                source: 'timeline-projection',
                confidence: 0.88,
              }],
              attentionMode: 'attentive',
            },
            lipsyncPlan: {
              mode: 'energy-only',
            },
          },
        },
      })
    }

    const dialogue = deriveDynamicsWithItem(createQuietCompanionshipDynamicsItem('dialogue'), {
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.44,
    })
    const quietCompanionship = deriveDynamicsWithItem(createQuietCompanionshipDynamicsItem('quiet-companionship'), {
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.44,
    })
    const quietAccompaniment = deriveDynamicsWithItem(createQuietCompanionshipDynamicsItem('quiet-accompaniment'), {
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.44,
    })
    const measuredReturn = deriveDynamicsWithItem(createQuietCompanionshipDynamicsItem('measured-return'), {
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.44,
    })

    expect(quietCompanionship.cadencePulse).toBeGreaterThanOrEqual(measuredReturn.cadencePulse)
    expect(quietCompanionship.prosodyIntensity).toBeLessThanOrEqual(measuredReturn.prosodyIntensity)
    expect(quietCompanionship.prosodyIntensity).toBeLessThan(dialogue.prosodyIntensity)
    expect(quietCompanionship.emphasisLevel).toBeLessThanOrEqual(dialogue.emphasisLevel)
    expect(quietCompanionship.cadencePulse).toBeLessThanOrEqual(dialogue.cadencePulse + 0.02)
    expect(quietAccompaniment.prosodyIntensity).toBeLessThan(dialogue.prosodyIntensity)
    expect(quietAccompaniment.emphasisLevel).toBeLessThanOrEqual(dialogue.emphasisLevel)
    expect(quietAccompaniment.prosodyIntensity).toBeLessThanOrEqual(quietCompanionship.prosodyIntensity + 0.01)
    expect(quietAccompaniment.cadencePulse).toBeLessThanOrEqual(dialogue.cadencePulse + 0.02)
  })

  it('lets upstream habit-shaped measured-return gentle authority arrive as slower playback dynamics than ordinary dialogue', () => {
    function createHabitShapedDynamicsItem(residentMode: 'dialogue' | 'measured-return', delivery: 'calm' | 'gentle') {
      return createStageEmbodimentSpeechPlaybackItem({
        intentId: `intent-${residentMode}-${delivery}-habit-shaped`,
        streamId: `stream-${residentMode}-${delivery}-habit-shaped`,
        segmentId: `segment-${residentMode}-${delivery}-habit-shaped`,
        text: '我先沿着这条线轻一点接回来。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: `turn-${residentMode}-${delivery}-habit-shaped`,
            rendererTarget: 'live2d',
            replyText: '我先沿着这条线轻一点接回来。',
            state: {
              baseEmotion: 'thinking',
              delivery,
              emphasis: delivery === 'gentle' ? 1 : 0,
              residentMode,
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: residentMode === 'measured-return' ? 320 : 260,
              segments: [{
                id: `segment-${residentMode}-${delivery}-habit-shaped`,
                index: 0,
                text: '我先沿着这条线轻一点接回来。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: residentMode === 'measured-return' ? 320 : 260,
                prosody: {
                  language: 'zh-CN',
                  pauseClass: 'full-stop',
                  phraseBoundary: 'hard',
                  contour: 'falling',
                  emphasisWord: null,
                  emphasisStrength: delivery === 'gentle' ? 0.56 : 0.42,
                  tempoShift: residentMode === 'measured-return' ? -0.1 : 0,
                },
                rendererHints: residentMode === 'measured-return'
                  ? {
                      residentMode: 'measured-return',
                      preferredBlinkCadence: 'linger',
                      preferredGazeMode: 'soften',
                      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
                      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
                    }
                  : null,
              }],
            },
            facePlan: { speakingCues: [] },
            motionPlan: {
              idleBase: 'idle_settle',
              actionBursts: [],
              attentionMode: 'attentive',
            },
            lipsyncPlan: { mode: 'energy-only' },
          },
        },
      })
    }

    const ordinaryDialogue = deriveDynamicsWithItem(
      createHabitShapedDynamicsItem('dialogue', 'calm'),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.44 },
    )
    const habitShapedMeasuredReturn = deriveDynamicsWithItem(
      createHabitShapedDynamicsItem('measured-return', 'gentle'),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.44 },
    )

    expect(habitShapedMeasuredReturn.cadencePulse).toBeLessThan(ordinaryDialogue.cadencePulse)
    expect(habitShapedMeasuredReturn.prosodyIntensity).toBeGreaterThan(ordinaryDialogue.prosodyIntensity)
    expect(habitShapedMeasuredReturn.emphasisLevel).toBeGreaterThanOrEqual(ordinaryDialogue.emphasisLevel)
  })

  it('keeps measured-return playback dynamics restrained when only segment renderer hints still carry the softer same-her line', () => {
    function createOrdinaryGentleDialogueDynamicsItem() {
      return createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-dialogue-gentle-hint-only-comparison',
        streamId: 'stream-dialogue-gentle-hint-only-comparison',
        segmentId: 'segment-dialogue-gentle-hint-only-comparison',
        text: '我先沿着同一条线轻一点回来。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: 'turn-dialogue-gentle-hint-only-comparison',
            rendererTarget: 'live2d',
            replyText: '我先沿着同一条线轻一点回来。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 1,
              residentMode: 'dialogue',
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 260,
              segments: [{
                id: 'segment-dialogue-gentle-hint-only-comparison',
                index: 0,
                text: '我先沿着同一条线轻一点回来。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: 260,
              }],
            },
            facePlan: { speakingCues: [] },
            motionPlan: {
              idleBase: 'idle_settle',
              actionBursts: [],
              attentionMode: 'attentive',
            },
            lipsyncPlan: { mode: 'energy-only' },
          },
        },
      })
    }

    function createHintOnlyMeasuredReturnDynamicsItem() {
      return createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-hint-only-measured-return-dynamics',
        streamId: 'stream-hint-only-measured-return-dynamics',
        segmentId: 'segment-hint-only-measured-return-dynamics',
        text: '我先沿着同一条线轻一点回来。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: 'turn-hint-only-measured-return-dynamics',
            rendererTarget: 'live2d',
            replyText: '我先沿着同一条线轻一点回来。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 1,
              residentMode: 'dialogue',
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              segments: [{
                id: 'segment-hint-only-measured-return-dynamics',
                index: 0,
                text: '我先沿着同一条线轻一点回来。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: 320,
                rendererHints: {
                  residentMode: 'measured-return',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                },
              }],
            },
            facePlan: { speakingCues: [] },
            motionPlan: {
              idleBase: 'observe_focus',
              actionBursts: [],
              attentionMode: 'attentive',
            },
            lipsyncPlan: { mode: 'energy-only' },
          },
        },
      })
    }

    const ordinaryDialogue = deriveDynamicsWithItem(
      createOrdinaryGentleDialogueDynamicsItem(),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.44 },
    )
    const hintOnlyMeasuredReturn = deriveDynamicsWithItem(
      createHintOnlyMeasuredReturnDynamicsItem(),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.44 },
    )

    expect(hintOnlyMeasuredReturn.cadencePulse).toBeLessThan(ordinaryDialogue.cadencePulse)
    expect(hintOnlyMeasuredReturn.prosodyIntensity).toBeLessThan(ordinaryDialogue.prosodyIntensity)
  })

  it('keeps same-her measured-return playback dynamics slightly more inward than ordinary measured-return when only a still-voiced face-and-motion line is still carrying the return', () => {
    function createOrdinaryMeasuredReturnDynamicsItem() {
      return createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-ordinary-measured-return-dynamics-comparison',
        streamId: 'stream-ordinary-measured-return-dynamics-comparison',
        segmentId: 'segment-ordinary-measured-return-dynamics-comparison',
        text: '我先沿着这条线轻一点接回来。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: 'turn-ordinary-measured-return-dynamics-comparison',
            rendererTarget: 'live2d',
            replyText: '我先沿着这条线轻一点接回来。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 1,
              residentMode: 'measured-return',
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              segments: [{
                id: 'segment-ordinary-measured-return-dynamics-comparison',
                index: 0,
                text: '我先沿着这条线轻一点接回来。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: 320,
                rendererHints: {
                  residentMode: 'measured-return',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                },
              }],
            },
            facePlan: { speakingCues: [] },
            motionPlan: {
              idleBase: 'observe_focus',
              actionBursts: [],
              attentionMode: 'attentive',
            },
            lipsyncPlan: { mode: 'energy-only' },
          },
        },
      })
    }

    function createSameHerMeasuredReturnDynamicsItem() {
      return createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-same-her-face-motion-measured-return-dynamics-comparison',
        streamId: 'stream-same-her-face-motion-measured-return-dynamics-comparison',
        segmentId: 'segment-same-her-face-motion-measured-return-dynamics-comparison',
        text: '我先沿着这条线轻一点接回来。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: 'turn-same-her-face-motion-measured-return-dynamics-comparison',
            rendererTarget: 'live2d',
            replyText: '我先沿着这条线轻一点接回来。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 1,
              residentMode: 'same-thread-continuation',
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              segments: [{
                id: 'segment-same-her-face-motion-measured-return-dynamics-comparison',
                index: 0,
                text: '我先沿着这条线轻一点接回来。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: 320,
                rendererHints: {
                  residentMode: 'same-thread-continuation',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                  signature: 'resident|main-runtime|embodiment:still_voiced_face_motion_line|lane=face+motion+voice-only',
                  reasonTags: ['embodiment:still_voiced_face_motion_line'],
                },
              }],
            },
            facePlan: { speakingCues: [] },
            motionPlan: {
              idleBase: 'observe_focus',
              actionBursts: [],
              attentionMode: 'attentive',
            },
            lipsyncPlan: { mode: 'energy-only' },
          },
        },
      })
    }

    const ordinaryMeasuredReturn = deriveDynamicsWithItem(
      createOrdinaryMeasuredReturnDynamicsItem(),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.44 },
    )
    const sameHerMeasuredReturn = deriveDynamicsWithItem(
      createSameHerMeasuredReturnDynamicsItem(),
      { mouthOpenSize: 34, now: 280, speechEnergy: 0.44 },
    )

    expect(sameHerMeasuredReturn.cadencePulse).toBeLessThan(ordinaryMeasuredReturn.cadencePulse)
    expect(sameHerMeasuredReturn.prosodyIntensity).toBeLessThan(ordinaryMeasuredReturn.prosodyIntensity)
    expect(sameHerMeasuredReturn.emphasisLevel).toBeLessThanOrEqual(ordinaryMeasuredReturn.emphasisLevel)
  })

  it('lets stronger trailing prosody keep renderer settle longer in render state so voice and embodiment release together', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-render-settle-tail',
      streamId: 'stream-render-settle-tail',
      segmentId: 'segment-render-settle-tail',
      text: '先别急，我还在这里。',
      special: null,
      cue: {
        id: 'segment-render-settle-tail',
        index: 0,
        startOffset: 0,
        endOffset: 9,
        text: '先别急，我还在这里。',
        emotion: 'thinking',
        gestureWeight: 0.32,
        facialWeight: 0.56,
        prosodyWeight: 0.6,
        beatWeight: 0.42,
        mouthWeight: 0.38,
        headWeight: 0.34,
        facialHoldMs: 360,
        actionHoldMs: 240,
        emotionHoldMs: 360,
        actionCue: 'observe_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'cadence-peak',
        interruptMode: 'soft-interrupt',
        rendererSettle: {
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 220,
          vrmExpressionBlendMs: 260,
        },
      },
    })

    const softer = deriveStageEmbodimentSpeechRenderState({
      state: {
        phase: 'playing',
        item,
        currentAudioSource: null,
        mouthOpenSize: 24,
        dynamics: {
          speechEnergy: 0.18,
          prosodyIntensity: 0.16,
          emphasisLevel: 0.2,
          cadencePulse: 0.74,
        },
        startedAt: 0,
        endedAt: null,
        stopReason: null,
      },
    })
    const trailing = deriveStageEmbodimentSpeechRenderState({
      state: {
        phase: 'playing',
        item,
        currentAudioSource: null,
        mouthOpenSize: 38,
        dynamics: {
          speechEnergy: 0.54,
          prosodyIntensity: 0.68,
          emphasisLevel: 0.62,
          cadencePulse: 0.22,
        },
        startedAt: 0,
        endedAt: null,
        stopReason: null,
      },
    })

    expect((trailing.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      softer.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((trailing.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0)).toBeGreaterThan(
      softer.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    )
    expect((trailing.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThan(
      softer.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
    expect((trailing.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      softer.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
  })

  it('keeps renderer settle longer when articulation still shows a strong mouth tail, even with similar speech dynamics', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-articulation-tail-settle',
      streamId: 'stream-articulation-tail-settle',
      segmentId: 'segment-articulation-tail-settle',
      text: '呜哦，慢一点。',
      special: null,
      cue: {
        id: 'segment-articulation-tail-settle',
        index: 0,
        startOffset: 0,
        endOffset: 7,
        text: '呜哦，慢一点。',
        emotion: 'thinking',
        gestureWeight: 0.22,
        facialWeight: 0.48,
        prosodyWeight: 0.44,
        beatWeight: 0.28,
        mouthWeight: 0.52,
        headWeight: 0.24,
        facialHoldMs: 340,
        actionHoldMs: 220,
        emotionHoldMs: 340,
        actionCue: 'observe_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'cadence-peak',
        interruptMode: 'soft-interrupt',
        rendererSettle: {
          live2dFacialReleaseMs: 300,
          live2dMotionFollowThroughMs: 380,
          vrmActionFadeMs: 210,
          vrmExpressionBlendMs: 250,
        },
      },
    })

    const quieterArticulation = deriveStageEmbodimentSpeechRenderState({
      state: {
        phase: 'playing',
        item,
        currentAudioSource: null,
        mouthOpenSize: 18,
        dynamics: {
          speechEnergy: 0.3,
          prosodyIntensity: 0.26,
          emphasisLevel: 0.28,
          cadencePulse: 0.42,
        },
        startedAt: 0,
        endedAt: null,
        stopReason: null,
      },
      articulation: {
        active: true,
        progress: 0.92,
        openness: 0.12,
        jawOpen: 0.1,
        lipClosure: 0.18,
        lipSpread: 0.12,
        lipRound: 0.08,
        visemes: { A: 0.08, E: 0.04, I: 0.03, O: 0.06, U: 0.05, closed: 0.14 },
        voice: null,
      },
    })
    const strongerArticulationTail = deriveStageEmbodimentSpeechRenderState({
      state: {
        phase: 'playing',
        item,
        currentAudioSource: null,
        mouthOpenSize: 18,
        dynamics: {
          speechEnergy: 0.3,
          prosodyIntensity: 0.26,
          emphasisLevel: 0.28,
          cadencePulse: 0.42,
        },
        startedAt: 0,
        endedAt: null,
        stopReason: null,
      },
      articulation: {
        active: true,
        progress: 0.92,
        openness: 0.42,
        jawOpen: 0.38,
        lipClosure: 0.74,
        lipSpread: 0.14,
        lipRound: 0.4,
        visemes: { A: 0.12, E: 0.08, I: 0.05, O: 0.44, U: 0.52, closed: 0.78 },
        voice: null,
      },
    })

    expect((strongerArticulationTail.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      quieterArticulation.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((strongerArticulationTail.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0)).toBeGreaterThan(
      quieterArticulation.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    )
    expect((strongerArticulationTail.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThan(
      quieterArticulation.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
    expect((strongerArticulationTail.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      quieterArticulation.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
  })

  it('keeps settle longer for quieter blink-like mouth closure tails so the body does not snap out before the face finishes softening', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-soften-tail-settle',
      streamId: 'stream-soften-tail-settle',
      segmentId: 'segment-soften-tail-settle',
      text: '嗯，我在。',
      special: null,
      cue: {
        id: 'segment-soften-tail-settle',
        index: 0,
        startOffset: 0,
        endOffset: 5,
        text: '嗯，我在。',
        emotion: 'thinking',
        gestureWeight: 0.18,
        facialWeight: 0.42,
        prosodyWeight: 0.3,
        beatWeight: 0.16,
        mouthWeight: 0.34,
        headWeight: 0.2,
        facialHoldMs: 300,
        actionHoldMs: 200,
        emotionHoldMs: 300,
        actionCue: 'idle_settle',
        facialCue: 'soft-gaze',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        rendererSettle: {
          live2dFacialReleaseMs: 280,
          live2dMotionFollowThroughMs: 340,
          vrmActionFadeMs: 180,
          vrmExpressionBlendMs: 220,
        },
      },
    })

    const moreOpenTail = deriveStageEmbodimentSpeechRenderState({
      state: {
        phase: 'playing',
        item,
        currentAudioSource: null,
        mouthOpenSize: 12,
        dynamics: {
          speechEnergy: 0.22,
          prosodyIntensity: 0.2,
          emphasisLevel: 0.16,
          cadencePulse: 0.34,
        },
        startedAt: 0,
        endedAt: null,
        stopReason: null,
      },
      articulation: {
        active: true,
        progress: 0.96,
        openness: 0.34,
        jawOpen: 0.28,
        lipClosure: 0.22,
        lipSpread: 0.08,
        lipRound: 0.12,
        visemes: { A: 0.12, E: 0.08, I: 0.06, O: 0.1, U: 0.08, closed: 0.18 },
        voice: null,
      },
    })
    const softenedClosedTail = deriveStageEmbodimentSpeechRenderState({
      state: {
        phase: 'playing',
        item,
        currentAudioSource: null,
        mouthOpenSize: 12,
        dynamics: {
          speechEnergy: 0.22,
          prosodyIntensity: 0.2,
          emphasisLevel: 0.16,
          cadencePulse: 0.34,
        },
        startedAt: 0,
        endedAt: null,
        stopReason: null,
      },
      articulation: {
        active: true,
        progress: 0.96,
        openness: 0.08,
        jawOpen: 0.06,
        lipClosure: 0.78,
        lipSpread: 0.04,
        lipRound: 0.08,
        visemes: { A: 0.02, E: 0.01, I: 0.01, O: 0.03, U: 0.02, closed: 0.84 },
        voice: null,
      },
    })

    expect((softenedClosedTail.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      moreOpenTail.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((softenedClosedTail.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      moreOpenTail.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
  })

  it('keeps closure-led mouth authority visibly active when the line is settling inward with low jaw-open energy', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-closure-led-mouth-authority',
      streamId: 'stream-closure-led-mouth-authority',
      segmentId: 'segment-closure-led-mouth-authority',
      text: '嗯。',
      special: null,
      cue: {
        id: 'segment-closure-led-mouth-authority',
        index: 0,
        startOffset: 0,
        endOffset: 2,
        text: '嗯。',
        emotion: 'thinking',
        gestureWeight: 0.08,
        facialWeight: 0.26,
        prosodyWeight: 0.12,
        beatWeight: 0.08,
        mouthWeight: 0.1,
        headWeight: 0.1,
        facialHoldMs: 280,
        actionHoldMs: 180,
        emotionHoldMs: 300,
        actionCue: 'idle_settle',
        facialCue: 'soft-release',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
      },
    })

    const closureLedRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        phase: 'playing',
        item,
        currentAudioSource: null,
        mouthOpenSize: 6,
        dynamics: {
          speechEnergy: 0.06,
          prosodyIntensity: 0.08,
          emphasisLevel: 0.1,
          cadencePulse: 0.14,
        },
        startedAt: 0,
        endedAt: null,
        stopReason: null,
      },
      articulation: {
        active: true,
        progress: 0.98,
        openness: 0.02,
        jawOpen: 0.03,
        lipClosure: 0.82,
        lipSpread: 0.04,
        lipRound: 0.06,
        visemes: { A: 0.01, E: 0.01, I: 0.01, O: 0.02, U: 0.02, closed: 0.86 },
        voice: null,
      },
    })

    expect(closureLedRender.active).toBe(true)
    expect(closureLedRender.visemeIntensity).toBeGreaterThan(0.45)
    expect(closureLedRender.visemeIntensity).toBeGreaterThan(closureLedRender.mouthOpenRatio)
  })

  it('treats eyes-soften style post-utterance cues as gentler linger authority than ordinary soft-release', () => {
    const softRelease = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-soft-release-tail',
      streamId: 'stream-soft-release-tail',
      segmentId: 'segment-soft-release-tail',
      text: '先这样。',
      special: null,
      cue: {
        id: 'segment-soft-release-tail',
        index: 0,
        startOffset: 0,
        endOffset: 4,
        text: '先这样。',
        emotion: 'thinking',
        gestureWeight: 0.2,
        facialWeight: 0.34,
        prosodyWeight: 0.24,
        beatWeight: 0.12,
        mouthWeight: 0.2,
        headWeight: 0.18,
        facialHoldMs: 280,
        actionHoldMs: 180,
        emotionHoldMs: 280,
        actionCue: 'idle_settle',
        facialCue: 'soft-release',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        rendererSettle: {
          live2dFacialReleaseMs: 260,
          live2dMotionFollowThroughMs: 320,
          vrmActionFadeMs: 180,
          vrmExpressionBlendMs: 220,
        },
      },
    })
    const eyesSoften = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-eyes-soften-tail',
      streamId: 'stream-eyes-soften-tail',
      segmentId: 'segment-eyes-soften-tail',
      text: '你确认了吗？',
      special: null,
      cue: {
        ...softRelease.cue!,
        id: 'segment-eyes-soften-tail',
        text: '你确认了吗？',
        endOffset: 6,
        facialCue: 'eyes-soften',
      },
    })

    const baseState = {
      phase: 'playing' as const,
      currentAudioSource: null,
      mouthOpenSize: 16,
      dynamics: {
        speechEnergy: 0.24,
        prosodyIntensity: 0.22,
        emphasisLevel: 0.2,
        cadencePulse: 0.3,
      },
      startedAt: 0,
      endedAt: null,
      stopReason: null,
    }

    const releaseRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        ...baseState,
        item: softRelease,
      },
    })
    const softenRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        ...baseState,
        item: eyesSoften,
      },
    })

    expect((softenRender.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      releaseRender.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((softenRender.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      releaseRender.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
  })

  it('keeps measured-return companionship tails settling a little longer than otherwise identical gentle tails once the line is intentionally lingering as the same her', () => {
    const baseCue = {
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '我还在这里。',
      emotion: 'thinking' as const,
      gestureWeight: 0.18,
      facialWeight: 0.34,
      prosodyWeight: 0.28,
      beatWeight: 0.14,
      mouthWeight: 0.24,
      headWeight: 0.18,
      facialHoldMs: 300,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      actionCue: 'observe_focus',
      facialCue: 'eyes-soften',
      actionWindow: 'none' as const,
      interruptMode: 'soft-interrupt' as const,
      rendererSettle: {
        live2dFacialReleaseMs: 280,
        live2dMotionFollowThroughMs: 340,
        vrmActionFadeMs: 200,
        vrmExpressionBlendMs: 230,
      },
    }

    const ordinaryTail = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-ordinary-gentle-tail',
      streamId: 'stream-ordinary-gentle-tail',
      segmentId: 'segment-ordinary-gentle-tail',
      text: '我还在这里。',
      special: null,
      cue: {
        ...baseCue,
        id: 'segment-ordinary-gentle-tail',
      },
    })
    const measuredReturnTail = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-measured-return-gentle-tail',
      streamId: 'stream-measured-return-gentle-tail',
      segmentId: 'segment-measured-return-gentle-tail',
      text: '我还在这里。',
      special: null,
      cue: {
        ...baseCue,
        id: 'segment-measured-return-gentle-tail',
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      },
    })

    const baseState = {
      phase: 'playing' as const,
      currentAudioSource: null,
      mouthOpenSize: 14,
      dynamics: {
        speechEnergy: 0.26,
        prosodyIntensity: 0.24,
        emphasisLevel: 0.18,
        cadencePulse: 0.34,
      },
      startedAt: 0,
      endedAt: null,
      stopReason: null,
    }

    const articulation = {
      active: true,
      progress: 0.97,
      openness: 0.1,
      jawOpen: 0.08,
      lipClosure: 0.72,
      lipSpread: 0.05,
      lipRound: 0.09,
      visemes: { A: 0.02, E: 0.01, I: 0.01, O: 0.03, U: 0.02, closed: 0.8 },
      voice: null,
    }

    const ordinaryRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        ...baseState,
        item: ordinaryTail,
      },
      articulation,
    })
    const measuredReturnRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        ...baseState,
        item: measuredReturnTail,
      },
      articulation,
    })

    expect((measuredReturnRender.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((measuredReturnRender.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    )
    expect((measuredReturnRender.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
    expect((measuredReturnRender.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
  })

  it('keeps measured-return companionship tails releasing a little more gently on the final stopping edge when the carry ends naturally', () => {
    const baseCue = {
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '我还在这里。',
      emotion: 'thinking' as const,
      gestureWeight: 0.18,
      facialWeight: 0.34,
      prosodyWeight: 0.26,
      beatWeight: 0.14,
      mouthWeight: 0.22,
      headWeight: 0.18,
      facialHoldMs: 300,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      actionCue: 'observe_focus',
      facialCue: 'eyes-soften',
      actionWindow: 'none' as const,
      interruptMode: 'soft-interrupt' as const,
      rendererSettle: {
        live2dFacialReleaseMs: 280,
        live2dMotionFollowThroughMs: 340,
        vrmActionFadeMs: 200,
        vrmExpressionBlendMs: 230,
      },
    }

    const ordinaryTail = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-ordinary-gentle-stop-tail',
      streamId: 'stream-ordinary-gentle-stop-tail',
      segmentId: 'segment-ordinary-gentle-stop-tail',
      text: '我还在这里。',
      special: null,
      cue: {
        ...baseCue,
        id: 'segment-ordinary-gentle-stop-tail',
      },
    })
    const measuredReturnTail = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-measured-return-gentle-stop-tail',
      streamId: 'stream-measured-return-gentle-stop-tail',
      segmentId: 'segment-measured-return-gentle-stop-tail',
      text: '我还在这里。',
      special: null,
      cue: {
        ...baseCue,
        id: 'segment-measured-return-gentle-stop-tail',
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      },
    })

    const stoppingState = {
      phase: 'idle' as const,
      currentAudioSource: null,
      mouthOpenSize: 10,
      dynamics: {
        speechEnergy: 0.2,
        prosodyIntensity: 0.18,
        emphasisLevel: 0.14,
        cadencePulse: 0.4,
      },
      startedAt: 0,
      endedAt: 460,
      stopReason: 'ended',
    }

    const articulation = {
      active: true,
      progress: 1,
      openness: 0.04,
      jawOpen: 0.03,
      lipClosure: 0.7,
      lipSpread: 0.03,
      lipRound: 0.06,
      visemes: { A: 0.01, E: 0.01, I: 0, O: 0.02, U: 0.01, closed: 0.76 },
      voice: null,
    }

    const ordinaryRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        ...stoppingState,
        item: ordinaryTail,
      },
      lastEventType: 'playback-stop',
      articulation,
    })
    const measuredReturnRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        ...stoppingState,
        item: measuredReturnTail,
      },
      lastEventType: 'playback-stop',
      articulation,
    })

    expect(ordinaryRender.phase).toBe('stopping')
    expect(measuredReturnRender.phase).toBe('stopping')
    expect((measuredReturnRender.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((measuredReturnRender.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    )
    expect((measuredReturnRender.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
    expect((measuredReturnRender.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
  })

  it('keeps repair-before-closeness companionship tails releasing more gently on the final stopping edge when the body line still needs room', () => {
    const baseCue = {
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '我先把这一下稳住。',
      emotion: 'thinking' as const,
      gestureWeight: 0.16,
      facialWeight: 0.32,
      prosodyWeight: 0.24,
      beatWeight: 0.12,
      mouthWeight: 0.2,
      headWeight: 0.16,
      facialHoldMs: 300,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'none' as const,
      interruptMode: 'soft-interrupt' as const,
      rendererSettle: {
        live2dFacialReleaseMs: 260,
        live2dMotionFollowThroughMs: 320,
        vrmActionFadeMs: 200,
        vrmExpressionBlendMs: 220,
      },
    }

    const ordinaryTail = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-ordinary-repair-first-stop-tail',
      streamId: 'stream-ordinary-repair-first-stop-tail',
      segmentId: 'segment-ordinary-repair-first-stop-tail',
      text: '我先把这一下稳住。',
      special: null,
      cue: {
        ...baseCue,
        id: 'segment-ordinary-repair-first-stop-tail',
      },
    })
    const repairBeforeClosenessTail = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-repair-before-closeness-stop-tail',
      streamId: 'stream-repair-before-closeness-stop-tail',
      segmentId: 'segment-repair-before-closeness-stop-tail',
      text: '我先把这一下稳住。',
      special: null,
      cue: {
        ...baseCue,
        id: 'segment-repair-before-closeness-stop-tail',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      },
    })

    const stoppingState = {
      phase: 'idle' as const,
      currentAudioSource: null,
      mouthOpenSize: 10,
      dynamics: {
        speechEnergy: 0.18,
        prosodyIntensity: 0.16,
        emphasisLevel: 0.12,
        cadencePulse: 0.38,
      },
      startedAt: 0,
      endedAt: 460,
      stopReason: 'ended',
    }

    const articulation = {
      active: true,
      progress: 1,
      openness: 0.04,
      jawOpen: 0.03,
      lipClosure: 0.74,
      lipSpread: 0.03,
      lipRound: 0.05,
      visemes: { A: 0.01, E: 0.01, I: 0, O: 0.02, U: 0.01, closed: 0.8 },
      voice: null,
    }

    const ordinaryRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        ...stoppingState,
        item: ordinaryTail,
      },
      lastEventType: 'playback-stop',
      articulation,
    })
    const repairBeforeClosenessRender = deriveStageEmbodimentSpeechRenderState({
      state: {
        ...stoppingState,
        item: repairBeforeClosenessTail,
      },
      lastEventType: 'playback-stop',
      articulation,
    })

    expect(ordinaryRender.phase).toBe('stopping')
    expect(repairBeforeClosenessRender.phase).toBe('stopping')
    expect((repairBeforeClosenessRender.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((repairBeforeClosenessRender.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    )
    expect((repairBeforeClosenessRender.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
    expect((repairBeforeClosenessRender.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      ordinaryRender.item?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
  })

  it('does not fall back by text when multiple plan segments share the same normalized text', () => {
    const duplicateTextScript = createTestEmbodimentScript({
      replyText: '先看这里',
      segments: [
        createTestEmbodimentScriptSegment({
          segmentId: 'segment-a',
          text: '先看这里',
          pauseClass: 'question',
          phraseBoundary: 'hard',
          contour: 'rising',
          emphasisStrength: 0.9,
          tempoShift: 0.08,
        }),
        createTestEmbodimentScriptSegment({
          segmentId: 'segment-b',
          text: '先看这里',
          planText: ' 先看这里 ',
          pauseClass: 'comma',
          phraseBoundary: 'soft',
          contour: 'flat',
          emphasisStrength: 0.1,
          tempoShift: -0.08,
        }),
      ],
    })

    const withoutProsody = deriveDynamicsWithItem(
      createPlaybackItemWithEmbodimentScript({
        segmentId: null,
        text: '先看这里',
        script: duplicateTextScript,
      }),
    )

    const baseline = deriveDynamicsWithItem(
      createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-baseline',
        streamId: 'stream-baseline',
        segmentId: null,
        text: '先看这里',
        special: null,
        metadata: null,
      }),
    )

    expect(withoutProsody).toEqual(baseline)
  })

  it('recovers a segment cue from embodimentScript metadata when no explicit cue is provided', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-cue-recovery',
      streamId: 'stream-script-cue-recovery',
      segmentId: 'segment-script-cue-recovery',
      text: '继续看这里。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-cue-recovery',
          rendererTarget: 'vrm',
          replyText: '继续看这里。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 1,
            residentMode: 'dialogue',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 260,
            segments: [{
              id: 'segment-script-cue-recovery',
              index: 0,
              text: '继续看这里。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 260,
              rendererSettle: {
                live2dFacialReleaseMs: 320,
                live2dMotionFollowThroughMs: 420,
                vrmActionFadeMs: 220,
                vrmExpressionBlendMs: 260,
              },
              rendererHints: {
                preferredExpressionAliases: ['CalmInspect'],
                preferredMotionAliases: ['ObserveSoft'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-cue-recovery',
              emotion: 'thinking',
              facialCue: 'focused',
              intensity: 0.58,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'soft-release',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-script-cue-recovery',
              actionCue: 'observe_focus',
              intensity: 0.44,
              holdMs: 220,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [
              { segmentId: 'segment-script-cue-recovery', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            ],
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-script-cue-recovery',
      text: '继续看这里。',
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      facialWeight: 0.58,
      gestureWeight: 0.44,
      mouthWeight: 0.35,
      facialHoldMs: 320,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      rendererSettle: {
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 220,
        vrmExpressionBlendMs: 260,
      },
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
      },
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
    }))
  })

  it('preserves persona-specific renderer hints from embodimentScript metadata when projecting a cue', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-persona-hints',
      streamId: 'stream-script-persona-hints',
      segmentId: 'segment-script-persona-hints',
      text: '我会慢一点回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-persona-hints',
          rendererTarget: 'live2d',
          replyText: '我会慢一点回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 280,
            segments: [{
              id: 'segment-script-persona-hints',
              index: 0,
              text: '我会慢一点回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 280,
              prosody: {
                language: 'zh-CN',
                pauseClass: 'full-stop',
                phraseBoundary: 'hard',
                contour: 'falling',
                emphasisWord: null,
                emphasisStrength: 0.42,
                tempoShift: -0.1,
              },
              rendererHints: {
                preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
                preferredMotionAliases: ['observe_focus', 'stillness_guard'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-persona-hints',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.52,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-script-persona-hints',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      rendererHints: {
        preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
        preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      },
      settleMode: 'linger',
      actionCue: 'idle_settle',
    }))
  })

  it('keeps recovering settle semantics when a cue is projected only from embodimentScript metadata', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-recovering-settle',
      streamId: 'stream-script-recovering-settle',
      segmentId: 'segment-script-recovering-settle',
      text: '慢一点，先稳住。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-recovering-settle',
          rendererTarget: 'vrm',
          replyText: '慢一点，先稳住。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'idle-recovering',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
            segments: [{
              id: 'segment-script-recovering-settle',
              index: 0,
              text: '慢一点，先稳住。',
              interruptPolicy: 'hard-stop',
              preRollMs: 20,
              settleMs: 360,
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-recovering-settle',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.52,
              holdMs: 420,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-script-recovering-settle',
              actionCue: null,
              intensity: 0,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-script-recovering-settle',
      settleMode: 'linger',
      interruptMode: 'soft-interrupt',
      facialCue: 'soft-gaze',
      facialHoldMs: 420,
    }))
  })

  it('keeps measured-return settle semantics when a cue is projected only from embodimentScript metadata', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-measured-return-settle',
      streamId: 'stream-script-measured-return-settle',
      segmentId: 'segment-script-measured-return-settle',
      text: '我先慢一点回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-measured-return-settle',
          rendererTarget: 'vrm',
          replyText: '我先慢一点回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-script-measured-return-settle',
              index: 0,
              text: '我先慢一点回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-measured-return-settle',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.48,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-script-measured-return-settle',
      settleMode: 'linger',
      actionCue: null,
      facialCue: 'soft-gaze',
      facialHoldMs: 360,
    }))
  })

  it('keeps durable relationship rhythm on a steady measured-return cue when script hints already confirm the long-term cadence', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-measured-return-durable-rhythm-settle',
      streamId: 'stream-script-measured-return-durable-rhythm-settle',
      segmentId: 'segment-script-measured-return-durable-rhythm-settle',
      text: '我会稳一点回来，不只是先观察。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-measured-return-durable-rhythm-settle',
          rendererTarget: 'vrm',
          replyText: '我会稳一点回来，不只是先观察。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-script-measured-return-durable-rhythm-settle',
              index: 0,
              text: '我会稳一点回来，不只是先观察。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                preferredGazeMode: 'steady',
                preferredBlinkCadence: 'quiet',
                residentMode: 'measured-return',
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-measured-return-durable-rhythm-settle',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.5,
              holdMs: 380,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [{
              segmentId: 'segment-script-measured-return-durable-rhythm-settle',
              actionCue: 'steady_focus',
              intensity: 0.24,
              holdMs: 300,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-script-measured-return-durable-rhythm-settle',
      settleMode: 'linger',
      actionCue: 'steady_focus',
      facialCue: 'soft-gaze',
      rendererHints: expect.objectContaining({
        preferredGazeMode: 'steady',
        preferredBlinkCadence: 'quiet',
        residentMode: 'measured-return',
      }),
    }))
  })

  it('keeps durable relationship rhythm on a softened measured-return cue when script hints already use the newer soften and linger companionship vocabulary', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-measured-return-softened-durable-rhythm-settle',
      streamId: 'stream-script-measured-return-softened-durable-rhythm-settle',
      segmentId: 'segment-script-measured-return-softened-durable-rhythm-settle',
      text: '我会慢一点回来，让这次靠近先软下来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-measured-return-softened-durable-rhythm-settle',
          rendererTarget: 'vrm',
          replyText: '我会慢一点回来，让这次靠近先软下来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-script-measured-return-softened-durable-rhythm-settle',
              index: 0,
              text: '我会慢一点回来，让这次靠近先软下来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'measured-return',
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-measured-return-softened-durable-rhythm-settle',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.5,
              holdMs: 380,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [{
              segmentId: 'segment-script-measured-return-softened-durable-rhythm-settle',
              actionCue: 'steady_focus',
              intensity: 0.24,
              holdMs: 300,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-script-measured-return-softened-durable-rhythm-settle',
      settleMode: 'linger',
      actionCue: 'steady_focus',
      facialCue: 'soft-gaze',
      rendererHints: expect.objectContaining({
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        residentMode: 'measured-return',
      }),
    }))
  })

  it('keeps softened measured-return playback on observe focus when the script already carries the gentler body line directly', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-measured-return-softened-observe-focus-settle',
      streamId: 'stream-script-measured-return-softened-observe-focus-settle',
      segmentId: 'segment-script-measured-return-softened-observe-focus-settle',
      text: '我先沿着这条线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-measured-return-softened-observe-focus-settle',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-script-measured-return-softened-observe-focus-settle',
              index: 0,
              text: '我先沿着这条线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'measured-return',
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-measured-return-softened-observe-focus-settle',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.48,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-script-measured-return-softened-observe-focus-settle',
              actionCue: 'observe_focus',
              intensity: 0.22,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-script-measured-return-softened-observe-focus-settle',
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      rendererHints: expect.objectContaining({
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        residentMode: 'measured-return',
      }),
    }))
  })

  it('keeps quieter measured-return playback on observe focus when memory-deliberation carry asks for a softer blink cadence without breaking the same living line', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-measured-return-quieter-observe-focus-settle',
      streamId: 'stream-script-measured-return-quieter-observe-focus-settle',
      segmentId: 'segment-script-measured-return-quieter-observe-focus-settle',
      text: '我先沿着这条线轻一点接回来，让它先稳稳落住。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-measured-return-quieter-observe-focus-settle',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条线轻一点接回来，让它先稳稳落住。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-script-measured-return-quieter-observe-focus-settle',
              index: 0,
              text: '我先沿着这条线轻一点接回来，让它先稳稳落住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'quiet',
                residentMode: 'measured-return',
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-measured-return-quieter-observe-focus-settle',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.46,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-script-measured-return-quieter-observe-focus-settle',
              actionCue: 'observe_focus',
              intensity: 0.2,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-script-measured-return-quieter-observe-focus-settle',
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      rendererHints: expect.objectContaining({
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'quiet',
        residentMode: 'measured-return',
      }),
    }))
  })

  it('keeps same-thread audible-carry playback on observe focus when structured same-her continuity is the surviving authority', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-same-thread-audible-carry-observe-focus',
      streamId: 'stream-script-same-thread-audible-carry-observe-focus',
      segmentId: 'segment-script-same-thread-audible-carry-observe-focus',
      text: '我先沿着这条还活着的线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-same-thread-audible-carry-observe-focus',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还活着的线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-script-same-thread-audible-carry-observe-focus',
              index: 0,
              text: '我先沿着这条还活着的线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'same-thread-continuation',
                signature: 'embodiment:audible-same-her-line',
                reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-same-thread-audible-carry-observe-focus',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.48,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-script-same-thread-audible-carry-observe-focus',
              actionCue: 'observe_focus',
              intensity: 0.22,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      id: 'segment-script-same-thread-audible-carry-observe-focus',
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      rendererHints: expect.objectContaining({
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        residentMode: 'same-thread-continuation',
        signature: 'embodiment:audible-same-her-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      }),
    }))
  })

  it('keeps repair-before-closeness script-only playback inside an idle settle body baseline', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-script-repair-before-closeness-settle',
      streamId: 'stream-script-repair-before-closeness-settle',
      segmentId: 'segment-script-repair-before-closeness-settle',
      text: '结果先落在这里，别急着靠近。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-repair-before-closeness-settle',
          rendererTarget: 'vrm',
          replyText: '结果先落在这里，别急着靠近。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
            segments: [{
              id: 'segment-script-repair-before-closeness-settle',
              index: 0,
              text: '结果先落在这里，别急着靠近。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 360,
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-repair-before-closeness-settle',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.42,
              holdMs: 380,
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'soft-release',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [{
              segmentId: 'segment-script-repair-before-closeness-settle',
              actionCue: 'steady_focus',
              intensity: 0.28,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-script-repair-before-closeness-settle',
      settleMode: 'hold',
      actionCue: 'idle_settle',
      facialCue: 'soft-gaze',
      actionHoldMs: 280,
    }))
  })

  it('keeps renderer-only visible recovery projected cues more restrained when body continuity is still weak under repair-before-closeness', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-renderer-only-visible-recovery',
      streamId: 'stream-renderer-only-visible-recovery',
      segmentId: 'segment-renderer-only-visible-recovery',
      text: '我先别一下子靠太近。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-renderer-only-visible-recovery',
          rendererTarget: 'live2d',
          replyText: '我先别一下子靠太近。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-renderer-only-visible-recovery',
              index: 0,
              text: '我先别一下子靠太近。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            }],
          },
          facePlan: { speakingCues: [] },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: { mode: 'energy-phoneme-hybrid' },
        },
      },
      digitalLifeFrame: {
        id: 'segment-renderer-only-visible-recovery',
        index: 0,
        startOffset: 0,
        endOffset: 10,
        text: '我先别一下子靠太近。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'hold',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.54,
          energyBias: 0.28,
          mouthScale: 0.95,
          continuityHoldMs: 360,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 360,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 320,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.83,
          expressivity: 0.12,
          body: {
            sway: -0.14,
            settle: 0.8,
            openness: 0.49,
            lean: 0.18,
          },
          breath: {
            amplitude: 0.49,
            pace: 0.5,
          },
          gaze: {
            azimuth: 0.06,
            elevation: 0.03,
            focus: 0.98,
            stability: 0.36,
          },
          head: {
            nod: 0.31,
            pitch: 0.1,
            yaw: -0.01,
            roll: 0.1,
          },
          facial: {
            eyeOpenness: 0.51,
            browTension: 0.52,
            browLift: 0.06,
            cheekLift: 0.19,
            mouthRound: 0.37,
            mouthSpread: 0.25,
            jawOpenBias: 0.32,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
      facialWeight: 0.36,
      gestureWeight: 0.18,
      headWeight: 0.18,
      prosodyWeight: 0.28,
      beatWeight: 0.26720000000000005,
      mouthWeight: 0.42,
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      }),
    }))
  })

  it('keeps repair-before-closeness mouth presence and tail settle alive when only the quieter voice-lipsync line is still carrying the return', () => {
    function createQuietCarryProjectionItem(residentMode: 'dialogue' | 'repair-before-closeness') {
      return createStageEmbodimentSpeechPlaybackItem({
        intentId: `intent-${residentMode}-quiet-carry-projection`,
        streamId: `stream-${residentMode}-quiet-carry-projection`,
        segmentId: `segment-${residentMode}-quiet-carry-projection`,
        text: '我先轻一点把这条线接住。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: `turn-${residentMode}-quiet-carry-projection`,
            rendererTarget: 'live2d',
            replyText: '我先轻一点把这条线接住。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 0,
              residentMode,
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              segments: [{
                id: `segment-${residentMode}-quiet-carry-projection`,
                index: 0,
                text: '我先轻一点把这条线接住。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: 340,
                rendererHints: {
                  residentMode,
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                },
              }],
            },
            facePlan: { speakingCues: [] },
            motionPlan: {
              idleBase: 'steady_focus',
              actionBursts: [],
              attentionMode: 'attentive',
            },
            lipsyncPlan: { mode: 'energy-phoneme-hybrid' },
          },
        },
        digitalLifeFrame: {
          id: `segment-${residentMode}-quiet-carry-projection`,
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我先轻一点把这条线接住。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'hold',
          voice: {
            pitchDelta: 0,
            rateMultiplier: 1,
            energy: 0.32,
            cadence: 0.28,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.46,
            energyBias: 0.22,
            mouthScale: 0.52,
            continuityHoldMs: 360,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.28,
            holdMs: 360,
            rendererHints: {
              residentMode,
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'steady_focus',
            actionMode: 'none',
            intensity: 0.18,
            holdMs: 320,
            rendererHints: {
              residentMode,
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.84,
            expressivity: 0.1,
            body: {
              sway: -0.12,
              settle: 0.82,
              openness: 0.46,
              lean: 0.16,
            },
            breath: {
              amplitude: 0.45,
              pace: 0.48,
            },
            gaze: {
              azimuth: 0.04,
              elevation: 0.02,
              focus: 0.98,
              stability: 0.38,
            },
            head: {
              nod: 0.22,
              pitch: 0.06,
              yaw: -0.01,
              roll: 0.06,
            },
            facial: {
              eyeOpenness: 0.5,
              browTension: 0.5,
              browLift: 0.04,
              cheekLift: 0.16,
              mouthRound: 0.22,
              mouthSpread: 0.16,
              jawOpenBias: 0.18,
            },
          },
        },
      })
    }

    const ordinaryItem = createQuietCarryProjectionItem('dialogue')
    const repairBeforeClosenessItem = createQuietCarryProjectionItem('repair-before-closeness')

    const ordinaryProjectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: ordinaryItem,
      digitalLifeFrame: ordinaryItem.digitalLifeFrame,
    })
    const repairBeforeClosenessProjectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: repairBeforeClosenessItem,
      digitalLifeFrame: repairBeforeClosenessItem.digitalLifeFrame,
    })

    expect(repairBeforeClosenessProjectedCue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      }),
    }))
    expect((repairBeforeClosenessProjectedCue?.mouthWeight ?? 0)).toBeGreaterThan(
      ordinaryProjectedCue?.mouthWeight ?? 0,
    )
    expect((repairBeforeClosenessProjectedCue?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThan(
      ordinaryProjectedCue?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
  })

  it('keeps renderer-only visible recovery projected cues more restrained when same-thread audible same-her continuity is still the surviving carry', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-renderer-only-visible-same-thread-audible-recovery',
      streamId: 'stream-renderer-only-visible-same-thread-audible-recovery',
      segmentId: 'segment-renderer-only-visible-same-thread-audible-recovery',
      text: '我先沿着这条还活着的线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-renderer-only-visible-same-thread-audible-recovery',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-renderer-only-visible-same-thread-audible-recovery',
              index: 0,
              text: '我先沿着这条还活着的线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'embodiment:audible-same-her-line',
                reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
              },
            }],
          },
          facePlan: { speakingCues: [] },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: { mode: 'energy-phoneme-hybrid' },
        },
      },
      digitalLifeFrame: {
        id: 'segment-renderer-only-visible-same-thread-audible-recovery',
        index: 0,
        startOffset: 0,
        endOffset: 16,
        text: '我先沿着这条还活着的线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'hold',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.54,
          energyBias: 0.28,
          mouthScale: 0.95,
          continuityHoldMs: 360,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 320,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        },
        motor: {
          stillness: 0.83,
          expressivity: 0.12,
          body: {
            sway: -0.14,
            settle: 0.8,
            openness: 0.49,
            lean: 0.18,
          },
          breath: {
            amplitude: 0.49,
            pace: 0.5,
          },
          gaze: {
            azimuth: 0.06,
            elevation: 0.03,
            focus: 0.98,
            stability: 0.36,
          },
          head: {
            nod: 0.31,
            pitch: 0.1,
            yaw: -0.01,
            roll: 0.1,
          },
          facial: {
            eyeOpenness: 0.51,
            browTension: 0.52,
            browLift: 0.06,
            cheekLift: 0.19,
            mouthRound: 0.37,
            mouthSpread: 0.25,
            jawOpenBias: 0.32,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      actionCue: 'idle_settle',
      facialWeight: 0.36,
      gestureWeight: 0.18,
      headWeight: 0.18,
      prosodyWeight: 0.28,
      mouthWeight: 0.42,
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'embodiment:audible-same-her-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      }),
    }))
  })

  it('keeps renderer-only visible recovery projected cues restrained when same-thread still-voiced face-and-mouth continuity is only carried by cue/script evidence', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-renderer-only-visible-same-thread-face-mouth-cue-carry',
      streamId: 'stream-renderer-only-visible-same-thread-face-mouth-cue-carry',
      segmentId: 'segment-renderer-only-visible-same-thread-face-mouth-cue-carry',
      text: '我先沿着还活着的脸和口型线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-renderer-only-visible-same-thread-face-mouth-cue-carry',
          rendererTarget: 'live2d',
          replyText: '我先沿着还活着的脸和口型线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-renderer-only-visible-same-thread-face-mouth-cue-carry',
              index: 0,
              text: '我先沿着还活着的脸和口型线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
                reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
              },
            }],
          },
          facePlan: { speakingCues: [] },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: { mode: 'energy-phoneme-hybrid' },
        },
      },
      digitalLifeFrame: {
        id: 'segment-renderer-only-visible-same-thread-face-mouth-cue-carry',
        index: 0,
        startOffset: 0,
        endOffset: 19,
        text: '我先沿着还活着的脸和口型线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'hold',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.54,
          energyBias: 0.28,
          mouthScale: 0.95,
          continuityHoldMs: 360,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 320,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.83,
          expressivity: 0.12,
          body: {
            sway: -0.14,
            settle: 0.8,
            openness: 0.49,
            lean: 0.18,
          },
          breath: {
            amplitude: 0.49,
            pace: 0.5,
          },
          gaze: {
            azimuth: 0.06,
            elevation: 0.03,
            focus: 0.98,
            stability: 0.36,
          },
          head: {
            nod: 0.31,
            pitch: 0.1,
            yaw: -0.01,
            roll: 0.1,
          },
          facial: {
            eyeOpenness: 0.51,
            browTension: 0.52,
            browLift: 0.06,
            cheekLift: 0.19,
            mouthRound: 0.37,
            mouthSpread: 0.25,
            jawOpenBias: 0.32,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      actionCue: 'idle_settle',
      facialWeight: 0.36,
      gestureWeight: 0.18,
      headWeight: 0.18,
      prosodyWeight: 0.28,
      mouthWeight: 0.42,
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
        reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
      }),
    }))
  })

  it('keeps renderer-only visible recovery projected cues more restrained when measured-return body+voice-only continuity is still the surviving carry', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-renderer-only-visible-measured-body-voice-recovery',
      streamId: 'stream-renderer-only-visible-measured-body-voice-recovery',
      segmentId: 'segment-renderer-only-visible-measured-body-voice-recovery',
      text: '我先沿着这条还活着的身体和声音线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-renderer-only-visible-measured-body-voice-recovery',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的身体和声音线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-renderer-only-visible-measured-body-voice-recovery',
              index: 0,
              text: '我先沿着这条还活着的身体和声音线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
                reasonTags: ['embodiment:body+voice-only'],
              },
            }],
          },
          facePlan: { speakingCues: [] },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-renderer-only-visible-measured-body-voice-recovery',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: { mode: 'energy-phoneme-hybrid' },
        },
      },
      digitalLifeFrame: {
        id: 'segment-renderer-only-visible-measured-body-voice-recovery',
        index: 0,
        startOffset: 0,
        endOffset: 22,
        text: '我先沿着这条还活着的身体和声音线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'hold',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.54,
          energyBias: 0.28,
          mouthScale: 0.95,
          continuityHoldMs: 360,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
            reasonTags: ['embodiment:body+voice-only'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
            reasonTags: ['embodiment:body+voice-only'],
          },
        },
        motor: {
          stillness: 0.83,
          expressivity: 0.12,
          body: {
            sway: -0.14,
            settle: 0.8,
            openness: 0.49,
            lean: 0.18,
          },
          breath: {
            amplitude: 0.49,
            pace: 0.5,
          },
          gaze: {
            azimuth: 0.06,
            elevation: 0.03,
            focus: 0.98,
            stability: 0.36,
          },
          head: {
            nod: 0.31,
            pitch: 0.1,
            yaw: -0.01,
            roll: 0.1,
          },
          facial: {
            eyeOpenness: 0.51,
            browTension: 0.52,
            browLift: 0.06,
            cheekLift: 0.19,
            mouthRound: 0.37,
            mouthSpread: 0.25,
            jawOpenBias: 0.32,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
      facialWeight: 0.36,
      gestureWeight: 0.18,
      headWeight: 0.18,
      prosodyWeight: 0.28,
      mouthWeight: 0.42,
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      }),
    }))
  })

  it('keeps a little more carried mouth presence on measured-return held lines when voice and companionship hints still say the same her is gently there', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-measured-return-carried-mouth-presence',
      streamId: 'stream-measured-return-carried-mouth-presence',
      segmentId: 'segment-measured-return-carried-mouth-presence',
      text: '我先顺着这条线慢一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-measured-return-carried-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先顺着这条线慢一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-measured-return-carried-mouth-presence',
              index: 0,
              text: '我先顺着这条线慢一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-measured-return-carried-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-measured-return-carried-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-measured-return-carried-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 14,
        text: '我先顺着这条线慢一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps a little more carried mouth presence on same-thread audible same-her held lines when the living audio thread is still the surviving authority', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-same-thread-audible-same-her-mouth-presence',
      streamId: 'stream-same-thread-audible-same-her-mouth-presence',
      segmentId: 'segment-same-thread-audible-same-her-mouth-presence',
      text: '我先沿着这条还活着的线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-audible-same-her-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还活着的线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-same-thread-audible-same-her-mouth-presence',
              index: 0,
              text: '我先沿着这条还活着的线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'embodiment:audible-same-her-line',
                reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-same-thread-audible-same-her-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-same-thread-audible-same-her-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-same-thread-audible-same-her-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 16,
        text: '我先沿着这条还活着的线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'embodiment:audible-same-her-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps a little more carried mouth presence on coordinator same-thread freeform body+voice-only held lines when the living audio thread is still surviving through body and voice', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-same-thread-body-voice-mouth-presence',
      streamId: 'stream-same-thread-body-voice-mouth-presence',
      segmentId: 'segment-same-thread-body-voice-mouth-presence',
      text: '我先沿着这条还活着的 body 和 voice 生命线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-body-voice-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还活着的 body 和 voice 生命线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-same-thread-body-voice-mouth-presence',
              index: 0,
              text: '我先沿着这条还活着的 body 和 voice 生命线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
                reasonTags: ['embodiment:body+voice-only'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-same-thread-body-voice-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-same-thread-body-voice-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-same-thread-body-voice-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 31,
        text: '我先沿着这条还活着的 body 和 voice 生命线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
            reasonTags: ['embodiment:body+voice-only'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
            reasonTags: ['embodiment:body+voice-only'],
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps repair-before-closeness freeform body+voice-only held lines on the stricter resident body baseline instead of relaxing back into a generic audible carry reopen', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-repair-body-voice-mouth-presence',
      streamId: 'stream-repair-body-voice-mouth-presence',
      segmentId: 'segment-repair-body-voice-mouth-presence',
      text: '我先沿着这条还活着的 body 和 voice 生命线轻一点接回来，但先不把身体线重新放大。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-repair-body-voice-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还活着的 body 和 voice 生命线轻一点接回来，但先不把身体线重新放大。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            segments: [{
              id: 'segment-repair-body-voice-mouth-presence',
              index: 0,
              text: '我先沿着这条还活着的 body 和 voice 生命线轻一点接回来，但先不把身体线重新放大。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 340,
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
                reasonTags: ['embodiment:body+voice-only'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-repair-body-voice-mouth-presence',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.12,
              holdMs: 320,
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'soft-release',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-repair-body-voice-mouth-presence',
              actionCue: 'idle_settle',
              intensity: 0.08,
              holdMs: 220,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-repair-body-voice-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 44,
        text: '我先沿着这条还活着的 body 和 voice 生命线轻一点接回来，但先不把身体线重新放大。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'hold',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.3,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.5,
          energyBias: 0.28,
          mouthScale: 0.6,
          continuityHoldMs: 360,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.12,
          holdMs: 320,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
            reasonTags: ['embodiment:body+voice-only'],
          },
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'hold',
          intensity: 0.08,
          holdMs: 220,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
            reasonTags: ['embodiment:body+voice-only'],
          },
        },
        motor: {
          stillness: 0.84,
          expressivity: 0.12,
          body: {
            sway: -0.1,
            settle: 0.82,
            openness: 0.47,
            lean: 0.14,
          },
          breath: {
            amplitude: 0.42,
            pace: 0.46,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.96,
            stability: 0.44,
          },
          head: {
            nod: 0.14,
            pitch: 0.03,
            yaw: 0,
            roll: 0.02,
          },
          facial: {
            eyeOpenness: 0.55,
            browTension: 0.32,
            browLift: 0.06,
            cheekLift: 0.14,
            mouthRound: 0.22,
            mouthSpread: 0.2,
            jawOpenBias: 0.18,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      actionCue: 'idle_settle',
      facialCue: 'soft-gaze',
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      }),
    }))
    expect(projectedCue?.gestureWeight).toBeLessThanOrEqual(0.08)
    expect(projectedCue?.headWeight).toBeLessThanOrEqual(0.08)
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps a little more carried mouth presence on same-thread still-voiced face-line held lines when face and voice still carry the same her', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-same-thread-still-voiced-face-mouth-presence',
      streamId: 'stream-same-thread-still-voiced-face-mouth-presence',
      segmentId: 'segment-same-thread-still-voiced-face-mouth-presence',
      text: '我先沿着这条还活着的表情和声音线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-still-voiced-face-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还活着的表情和声音线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-same-thread-still-voiced-face-mouth-presence',
              index: 0,
              text: '我先沿着这条还活着的表情和声音线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                reasonTags: ['embodiment:still-voiced-face-line'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-same-thread-still-voiced-face-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-same-thread-still-voiced-face-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-same-thread-still-voiced-face-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 18,
        text: '我先沿着这条还活着的表情和声音线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['embodiment:still-voiced-face-line'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['embodiment:still-voiced-face-line'],
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:still-voiced-face-line'],
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps a little more carried mouth presence on same-thread quieter body+lipsync-only held lines when that one living line is still surviving inward', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-same-thread-body-lipsync-mouth-presence',
      streamId: 'stream-same-thread-body-lipsync-mouth-presence',
      segmentId: 'segment-same-thread-body-lipsync-mouth-presence',
      text: '我先沿着这条更轻一点的 body 和 lipsync 生命线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-body-lipsync-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条更轻一点的 body 和 lipsync 生命线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-same-thread-body-lipsync-mouth-presence',
              index: 0,
              text: '我先沿着这条更轻一点的 body 和 lipsync 生命线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                reasonTags: ['embodiment:body+lipsync-only'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-same-thread-body-lipsync-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-same-thread-body-lipsync-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-same-thread-body-lipsync-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 29,
        text: '我先沿着这条更轻一点的 body 和 lipsync 生命线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['embodiment:body+lipsync-only'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['embodiment:body+lipsync-only'],
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body+lipsync-only'],
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps a little more carried mouth presence on same-thread still-voiced motion-line held lines when motion and voice still carry the same her', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-same-thread-still-voiced-motion-mouth-presence',
      streamId: 'stream-same-thread-still-voiced-motion-mouth-presence',
      segmentId: 'segment-same-thread-still-voiced-motion-mouth-presence',
      text: '我先沿着这条还活着的动作和声音线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-still-voiced-motion-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还活着的动作和声音线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-same-thread-still-voiced-motion-mouth-presence',
              index: 0,
              text: '我先沿着这条还活着的动作和声音线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                reasonTags: ['embodiment:still-voiced-motion-line'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-same-thread-still-voiced-motion-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-same-thread-still-voiced-motion-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-same-thread-still-voiced-motion-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 18,
        text: '我先沿着这条还活着的动作和声音线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['embodiment:still-voiced-motion-line'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['embodiment:still-voiced-motion-line'],
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:still-voiced-motion-line'],
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps a little more carried mouth presence on same-thread face+lipsync-only held lines when face and lipsync still carry the same her', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-same-thread-face-lipsync-mouth-presence',
      streamId: 'stream-same-thread-face-lipsync-mouth-presence',
      segmentId: 'segment-same-thread-face-lipsync-mouth-presence',
      text: '我先沿着这条还连着的表情和口型线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-face-lipsync-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还连着的表情和口型线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-same-thread-face-lipsync-mouth-presence',
              index: 0,
              text: '我先沿着这条还连着的表情和口型线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                reasonTags: ['lane=face+lipsync-only'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-same-thread-face-lipsync-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-same-thread-face-lipsync-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-same-thread-face-lipsync-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 21,
        text: '我先沿着这条还连着的表情和口型线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['lane=face+lipsync-only'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['lane=face+lipsync-only'],
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['lane=face+lipsync-only'],
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps a little more carried mouth presence on same-thread motion+lipsync-only held lines when motion and lipsync still carry the same her', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-same-thread-motion-lipsync-mouth-presence',
      streamId: 'stream-same-thread-motion-lipsync-mouth-presence',
      segmentId: 'segment-same-thread-motion-lipsync-mouth-presence',
      text: '我先沿着这条还连着的动作和口型线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-motion-lipsync-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还连着的动作和口型线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-same-thread-motion-lipsync-mouth-presence',
              index: 0,
              text: '我先沿着这条还连着的动作和口型线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                reasonTags: ['lane=motion+lipsync-only'],
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-same-thread-motion-lipsync-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-same-thread-motion-lipsync-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-same-thread-motion-lipsync-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 21,
        text: '我先沿着这条还连着的动作和口型线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['lane=motion+lipsync-only'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['lane=motion+lipsync-only'],
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['lane=motion+lipsync-only'],
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps a little more carried mouth presence on signature-only same-thread still-voiced motion-line held lines when motion and voice still carry the same her', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-signature-only-same-thread-still-voiced-motion-mouth-presence',
      streamId: 'stream-signature-only-same-thread-still-voiced-motion-mouth-presence',
      segmentId: 'segment-signature-only-same-thread-still-voiced-motion-mouth-presence',
      text: '我先沿着这条还活着的动作和声音线轻一点接回来。',
      special: null,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-signature-only-same-thread-still-voiced-motion-mouth-presence',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还活着的动作和声音线轻一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-signature-only-same-thread-still-voiced-motion-mouth-presence',
              index: 0,
              text: '我先沿着这条还活着的动作和声音线轻一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
              },
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-signature-only-same-thread-still-voiced-motion-mouth-presence',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-signature-only-same-thread-still-voiced-motion-mouth-presence',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 240,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
      },
      digitalLifeFrame: {
        id: 'segment-signature-only-same-thread-still-voiced-motion-mouth-presence',
        index: 0,
        startOffset: 0,
        endOffset: 18,
        text: '我先沿着这条还活着的动作和声音线轻一点接回来。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.34,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.48,
          energyBias: 0.3,
          mouthScale: 0.58,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
          },
        },
        motor: {
          stillness: 0.8,
          expressivity: 0.18,
          body: {
            sway: -0.08,
            settle: 0.76,
            openness: 0.53,
            lean: 0.16,
          },
          breath: {
            amplitude: 0.44,
            pace: 0.48,
          },
          gaze: {
            azimuth: 0.03,
            elevation: 0.02,
            focus: 0.95,
            stability: 0.7,
          },
          head: {
            nod: 0.18,
            pitch: 0.04,
            yaw: -0.01,
            roll: 0.03,
          },
          facial: {
            eyeOpenness: 0.56,
            browTension: 0.34,
            browLift: 0.08,
            cheekLift: 0.16,
            mouthRound: 0.24,
            mouthSpread: 0.21,
            jawOpenBias: 0.2,
          },
        },
      },
    })

    const projectedCue = projectStageEmbodimentSpeechCue({
      playbackItem: item,
      cue: item.cue,
      digitalLifeFrame: item.digitalLifeFrame,
    })

    expect(projectedCue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      actionCue: 'observe_focus',
      facialCue: 'focus',
      rendererHints: expect.objectContaining({
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      }),
    }))
    expect(projectedCue?.mouthWeight).toBeGreaterThan(0.34)
    expect(projectedCue?.mouthWeight).toBeCloseTo(0.35, 2)
  })

  it('keeps remembered-seam more-room playback mouth carry quieter than ordinary measured-return while still preserving a living-line mouth presence', () => {
    function createProjectedCue(input: {
      preferredExpressionAliases: string[]
      preferredMotionAliases: string[]
      mouthScale: number
      faceIntensity: number
      actionIntensity: number
    }) {
      const item = createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-measured-return-remembered-seam-mouth-carry',
        streamId: 'stream-measured-return-remembered-seam-mouth-carry',
        segmentId: 'segment-measured-return-remembered-seam-mouth-carry',
        text: '我先顺着这条线轻一点接回来。',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: 'turn-measured-return-remembered-seam-mouth-carry',
            rendererTarget: 'vrm',
            replyText: '我先顺着这条线轻一点接回来。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 0,
              residentMode: 'measured-return',
            },
            speechPlan: {
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
              segments: [{
                id: 'segment-measured-return-remembered-seam-mouth-carry',
                index: 0,
                text: '我先顺着这条线轻一点接回来。',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: 320,
                rendererHints: {
                  residentMode: 'measured-return',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                  preferredExpressionAliases: input.preferredExpressionAliases,
                  preferredMotionAliases: input.preferredMotionAliases,
                },
              }],
            },
            facePlan: {
              speakingCues: [{
                segmentId: 'segment-measured-return-remembered-seam-mouth-carry',
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: input.faceIntensity,
                holdMs: 360,
                preUtteranceCue: 'steady-inhale',
                postUtteranceCue: 'eyes-soften',
                source: 'prosody-authority',
                confidence: 0.94,
              }],
            },
            motionPlan: {
              idleBase: 'observe_focus',
              actionBursts: [{
                segmentId: 'segment-measured-return-remembered-seam-mouth-carry',
                actionCue: 'observe_focus',
                intensity: input.actionIntensity,
                holdMs: 240,
                source: 'timeline-projection',
                confidence: 0.88,
              }],
              attentionMode: 'ambient',
            },
            lipsyncPlan: {
              mode: 'energy-phoneme-hybrid',
            },
          },
        },
        digitalLifeFrame: {
          id: 'segment-measured-return-remembered-seam-mouth-carry',
          index: 0,
          startOffset: 0,
          endOffset: 15,
          text: '我先顺着这条线轻一点接回来。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: 0,
            rateMultiplier: 1,
            energy: 0.34,
            cadence: 0.38,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.48,
            energyBias: 0.3,
            mouthScale: input.mouthScale,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: input.faceIntensity,
            holdMs: 360,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredExpressionAliases: input.preferredExpressionAliases,
              preferredMotionAliases: input.preferredMotionAliases,
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: input.actionIntensity,
            holdMs: 240,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredExpressionAliases: input.preferredExpressionAliases,
              preferredMotionAliases: input.preferredMotionAliases,
            },
          },
          motor: {
            stillness: 0.8,
            expressivity: 0.18,
            body: {
              sway: -0.08,
              settle: 0.76,
              openness: 0.53,
              lean: 0.16,
            },
            breath: {
              amplitude: 0.44,
              pace: 0.48,
            },
            gaze: {
              azimuth: 0.03,
              elevation: 0.02,
              focus: 0.95,
              stability: 0.7,
            },
            head: {
              nod: 0.18,
              pitch: 0.04,
              yaw: -0.01,
              roll: 0.03,
            },
            facial: {
              eyeOpenness: 0.56,
              browTension: 0.34,
              browLift: 0.08,
              cheekLift: 0.16,
              mouthRound: 0.24,
              mouthSpread: 0.21,
              jawOpenBias: 0.2,
            },
          },
        },
      })

      return projectStageEmbodimentSpeechCue({
        playbackItem: item,
        cue: item.cue,
        digitalLifeFrame: item.digitalLifeFrame,
      })
    }

    const genericMeasuredReturnCue = createProjectedCue({
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      mouthScale: 0.58,
      faceIntensity: 0.44,
      actionIntensity: 0.24,
    })
    const rememberedSeamMoreRoomCue = createProjectedCue({
      preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
      mouthScale: 0.54,
      faceIntensity: 0.4,
      actionIntensity: 0.21,
    })

    expect(rememberedSeamMoreRoomCue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(rememberedSeamMoreRoomCue?.mouthWeight).toBeLessThan(genericMeasuredReturnCue?.mouthWeight ?? 0)
    expect(rememberedSeamMoreRoomCue?.mouthWeight).toBeGreaterThan(0.28)
  })

  it('preserves quieter speech timing hints when projecting a living-line cue from digital-life frame authority', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-projected-speech-timing-hints',
      streamId: 'stream-projected-speech-timing-hints',
      segmentId: 'segment-projected-speech-timing-hints',
      text: '我先沿着这条线慢一点接回来。',
      special: null,
      digitalLifeFrame: {
        id: 'segment-projected-speech-timing-hints',
        index: 0,
        startOffset: 0,
        endOffset: 15,
        text: '我先沿着这条线慢一点接回来。',
        mode: 'speaking',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 0.88,
          energy: 0.28,
          cadence: 0.22,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.46,
          energyBias: 0.24,
          mouthScale: 0.7,
          continuityHoldMs: 320,
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
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 260,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
          },
        },
        motor: {
          stillness: 0.82,
          expressivity: 0.16,
          body: {
            sway: -0.08,
            settle: 0.84,
            openness: 0.42,
            lean: 0.12,
          },
          breath: {
            amplitude: 0.4,
            pace: 0.42,
          },
          gaze: {
            azimuth: 0.02,
            elevation: 0.02,
            focus: 0.92,
            stability: 0.78,
          },
          head: {
            nod: 0.12,
            pitch: 0.03,
            yaw: -0.01,
            roll: 0.02,
          },
          facial: {
            eyeOpenness: 0.58,
            browTension: 0.26,
            browLift: 0.06,
            cheekLift: 0.12,
            mouthRound: 0.2,
            mouthSpread: 0.18,
            jawOpenBias: 0.16,
          },
        },
      },
    })

    expect(item.cue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
  })
})
