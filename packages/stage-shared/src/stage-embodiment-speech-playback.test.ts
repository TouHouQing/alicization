import { describe, expect, it } from 'vitest'

import {
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
} from './stage-embodiment-speech-playback'

type TestProsodyInput = {
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
  styleRate?: number
}) {
  return deriveStageEmbodimentSpeechDynamicsState({
    phase: 'playing',
    item,
    mouthOpenSize: input?.mouthOpenSize ?? 36,
    now: input?.now ?? 320,
    speechEnergy: input?.speechEnergy ?? 0.48,
    startedAt: input?.startedAt ?? 0,
    styleRate: input?.styleRate ?? 1,
  })
}

describe('stage embodiment speech playback dynamics', () => {
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
})
