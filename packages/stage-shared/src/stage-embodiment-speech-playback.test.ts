import { describe, expect, it } from 'vitest'

import {
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
} from './stage-embodiment-speech-playback'

function createPlaybackItemWithProsody(input: {
  segmentId: string | null
  text: string
  pauseClass: 'comma' | 'full-stop' | 'question'
  phraseBoundary: 'soft' | 'hard'
  contour: 'flat' | 'falling' | 'rising'
  emphasisStrength: number
  tempoShift: number
  planText?: string
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
            id: input.segmentId ?? 'segment-prosody',
            index: 0,
            text: input.planText ?? input.text,
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
  it('raises cadence and prosody intensity for rising contours without changing other prosody inputs', () => {
    const flat = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-flat',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'flat',
        emphasisStrength: 0.6,
        tempoShift: 0,
      }),
      mouthOpenSize: 36,
      now: 320,
      speechEnergy: 0.48,
      startedAt: 0,
      styleRate: 1,
    })

    const risingContour = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-rising',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'rising',
        emphasisStrength: 0.6,
        tempoShift: 0,
      }),
      mouthOpenSize: 36,
      now: 320,
      speechEnergy: 0.48,
      startedAt: 0,
      styleRate: 1,
    })

    expect(risingContour.prosodyIntensity).toBeGreaterThan(flat.prosodyIntensity)
    expect(risingContour.cadencePulse).toBeGreaterThan(flat.cadencePulse)
    expect(risingContour.emphasisLevel).toBeGreaterThan(flat.emphasisLevel)
  })

  it('raises emphasis and prosody intensity for stronger prosody emphasis', () => {
    const softer = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-soft-emphasis',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.2,
        tempoShift: 0,
      }),
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.46,
      startedAt: 0,
      styleRate: 1,
    })

    const stronger = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-strong-emphasis',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.8,
        tempoShift: 0,
      }),
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.46,
      startedAt: 0,
      styleRate: 1,
    })

    expect(stronger.emphasisLevel).toBeGreaterThan(softer.emphasisLevel)
    expect(stronger.prosodyIntensity).toBeGreaterThan(softer.prosodyIntensity)
  })

  it('slows cadence pressure for negative tempo shifts without changing other prosody inputs', () => {
    const slower = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-slower',
        text: '先看这里',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
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

    const neutralTempo = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-neutral-tempo',
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

    expect(slower.cadencePulse).toBeLessThan(neutralTempo.cadencePulse)
  })

  it('does not fall back by text when multiple plan segments share the same normalized text', () => {
    const withoutProsody = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-duplicate-text',
        streamId: 'stream-duplicate-text',
        segmentId: null,
        text: '先看这里',
        special: null,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: 'turn-duplicate-text',
            rendererTarget: 'live2d',
            replyText: '先看这里',
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
              segments: [
                {
                  id: 'segment-a',
                  index: 0,
                  text: '先看这里',
                  interruptPolicy: 'soft-settle',
                  preRollMs: 20,
                  settleMs: 260,
                  prosody: {
                    language: 'zh-CN',
                    pauseClass: 'question',
                    phraseBoundary: 'hard',
                    contour: 'rising',
                    emphasisWord: '这里',
                    emphasisStrength: 0.9,
                    tempoShift: 0.08,
                  },
                },
                {
                  id: 'segment-b',
                  index: 1,
                  text: ' 先看这里 ',
                  interruptPolicy: 'soft-settle',
                  preRollMs: 20,
                  settleMs: 260,
                  prosody: {
                    language: 'zh-CN',
                    pauseClass: 'comma',
                    phraseBoundary: 'soft',
                    contour: 'flat',
                    emphasisWord: '这里',
                    emphasisStrength: 0.1,
                    tempoShift: -0.08,
                  },
                },
              ],
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
      }),
      mouthOpenSize: 36,
      now: 320,
      speechEnergy: 0.48,
      startedAt: 0,
      styleRate: 1,
    })

    const baseline = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createStageEmbodimentSpeechPlaybackItem({
        intentId: 'intent-baseline',
        streamId: 'stream-baseline',
        segmentId: null,
        text: '先看这里',
        special: null,
        metadata: null,
      }),
      mouthOpenSize: 36,
      now: 320,
      speechEnergy: 0.48,
      startedAt: 0,
      styleRate: 1,
    })

    expect(withoutProsody).toEqual(baseline)
  })
})
