import { describe, expect, it } from 'vitest'

import {
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
} from './stage-embodiment-speech-playback'

function createPlaybackItemWithProsody(input: {
  segmentId: string
  text: string
  pauseClass: 'comma' | 'full-stop' | 'question'
  phraseBoundary: 'soft' | 'hard'
  contour: 'flat' | 'falling' | 'rising'
  emphasisStrength: number
  tempoShift: number
}) {
  return createStageEmbodimentSpeechPlaybackItem({
    intentId: 'intent-prosody',
    streamId: 'stream-prosody',
    segmentId: input.segmentId,
    text: input.text,
    special: null,
    metadata: {
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-prosody',
        rendererTarget: 'live2d',
        replyText: input.text,
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
            id: input.segmentId,
            index: 0,
            text: input.text,
            interruptPolicy: 'soft-settle',
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

describe('stage embodiment speech playback dynamics', () => {
  it('raises prosody intensity and cadence for rising question contours', () => {
    const neutral = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-neutral',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.42,
        tempoShift: 0,
      }),
      mouthOpenSize: 36,
      now: 320,
      speechEnergy: 0.48,
      startedAt: 0,
      styleRate: 1,
    })

    const rising = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-rising',
        text: '先看这里',
        pauseClass: 'question',
        phraseBoundary: 'hard',
        contour: 'rising',
        emphasisStrength: 0.82,
        tempoShift: 0.08,
      }),
      mouthOpenSize: 36,
      now: 320,
      speechEnergy: 0.48,
      startedAt: 0,
      styleRate: 1,
    })

    expect(rising.prosodyIntensity).toBeGreaterThan(neutral.prosodyIntensity)
    expect(rising.cadencePulse).toBeGreaterThan(neutral.cadencePulse)
    expect(rising.emphasisLevel).toBeGreaterThan(neutral.emphasisLevel)
  })

  it('slows cadence pressure for soft comma pauses with negative tempo shift', () => {
    const comma = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-comma',
        text: '先看这里',
        pauseClass: 'comma',
        phraseBoundary: 'soft',
        contour: 'falling',
        emphasisStrength: 0.68,
        tempoShift: -0.08,
      }),
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.46,
      startedAt: 0,
      styleRate: 1,
    })

    const fullStop = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-stop',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.68,
        tempoShift: 0,
      }),
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.46,
      startedAt: 0,
      styleRate: 1,
    })

    expect(comma.cadencePulse).toBeLessThan(fullStop.cadencePulse)
  })
})
