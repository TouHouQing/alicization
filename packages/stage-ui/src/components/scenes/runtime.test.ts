import type { AlicizationEmbodimentScriptV1 } from '@proj-alicization/stage-shared'

import { describe, expect, it } from 'vitest'

import { resolveLive2DFaceDriverState } from './drivers/live2d-face-driver'
import { resolveLive2DLipSyncDriverState } from './drivers/live2d-lipsync-driver'
import { resolveLive2DMotionDriverState } from './drivers/live2d-motion-driver'
import { shouldDeferLive2DEmotionMotionOverride, shouldRunLive2dLipSyncLoop } from './runtime'

import * as stageRuntime from './runtime'

describe('shouldRunLive2dLipSyncLoop', () => {
  it('runs only for live2d while not paused', () => {
    expect(shouldRunLive2dLipSyncLoop({ stageModelRenderer: 'live2d', paused: false })).toBe(true)
    expect(shouldRunLive2dLipSyncLoop({ stageModelRenderer: 'live2d', paused: true })).toBe(false)
    expect(shouldRunLive2dLipSyncLoop({ stageModelRenderer: 'vrm', paused: false })).toBe(false)
  })
})

describe('shouldDeferLive2DEmotionMotionOverride', () => {
  it('keeps live2d emotion motion from overriding held segment motion during post-utterance follow-through', () => {
    expect(shouldDeferLive2DEmotionMotionOverride({
      stageModelRenderer: 'live2d',
      runtimeSegmentMotionActive: true,
      runtimeSegmentMotionFollowThroughMs: 600,
    })).toBe(true)

    expect(shouldDeferLive2DEmotionMotionOverride({
      stageModelRenderer: 'live2d',
      runtimeSegmentMotionActive: true,
      runtimeSegmentMotionFollowThroughMs: 0,
    })).toBe(false)

    expect(shouldDeferLive2DEmotionMotionOverride({
      stageModelRenderer: 'vrm',
      runtimeSegmentMotionActive: true,
      runtimeSegmentMotionFollowThroughMs: 600,
    })).toBe(false)
  })
})

describe('resolveStageEmbodimentMetaAuthority', () => {
  it('prefers authoritative digitalLife variationToken and speechStyle over stale embodiment meta', () => {
    const resolveStageEmbodimentMetaAuthority = (stageRuntime as any).resolveStageEmbodimentMetaAuthority

    const resolved = resolveStageEmbodimentMetaAuthority({
      embodiment: {
        variationToken: ' stale-embodiment-variation ',
        speechStyle: {
          pitchDelta: 5,
          rateMultiplier: 1.08,
        },
      },
      speechTimeline: {
        variationToken: ' speech-timeline-variation ',
      },
      digitalLife: {
        variationToken: ' authoritative-digital-life-variation ',
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.93,
        },
      },
    })

    expect(resolved).toEqual({
      digitalLife: {
        variationToken: ' authoritative-digital-life-variation ',
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.93,
        },
      },
      rendererHints: null,
      variationToken: 'authoritative-digital-life-variation',
      speechStyle: {
        pitchDelta: -4,
        rateMultiplier: 0.93,
      },
      voice: null,
    })
  })

  it('falls back to speechTimeline variationToken before stale embodiment variationToken when digitalLife token is absent', () => {
    const resolveStageEmbodimentMetaAuthority = (stageRuntime as any).resolveStageEmbodimentMetaAuthority

    const resolved = resolveStageEmbodimentMetaAuthority({
      embodiment: {
        variationToken: ' stale-embodiment-variation ',
        speechStyle: {
          pitchDelta: 5,
          rateMultiplier: 1.08,
        },
      },
      speechTimeline: {
        variationToken: ' authoritative-speech-timeline-variation ',
      },
      digitalLife: {
        variationToken: '   ',
        speechStyle: null,
      },
    })

    expect(resolved).toEqual({
      digitalLife: {
        variationToken: '   ',
        speechStyle: null,
      },
      rendererHints: null,
      variationToken: 'authoritative-speech-timeline-variation',
      speechStyle: {
        pitchDelta: 5,
        rateMultiplier: 1.08,
      },
      voice: null,
    })
  })

  it('prefers canonical speechTimeline and embodimentScript renderer hints over stale embodiment hints for first-frame alias authority', () => {
    const resolveStageEmbodimentMetaAuthority = (stageRuntime as any).resolveStageEmbodimentMetaAuthority

    const resolved = resolveStageEmbodimentMetaAuthority({
      embodiment: {
        variationToken: ' stale-embodiment-variation ',
        speechStyle: {
          pitchDelta: 5,
          rateMultiplier: 1.08,
        },
        rendererHints: {
          residentMode: 'dialogue',
          preferredExpressionAliases: ['StaleEmbodimentAlias'],
          preferredMotionAliases: ['StaleEmbodimentMotion'],
          preferredBlinkCadence: 'normal',
          preferredGazeMode: 'drift',
          reasonTags: ['stale-embodiment'],
          signature: 'stale-embodiment-signature',
        },
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-runtime-first-frame-alias-authority',
        rendererTarget: 'live2d',
        replyText: '先保持同一条线。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'dialogue',
          rendererHints: {
            preferredExpressionAliases: ['ScriptStateAlias'],
            reasonTags: ['script-state'],
          },
        },
        speechPlan: {
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 260,
          segments: [{
            id: 'segment-runtime-first-frame-alias-authority',
            index: 0,
            text: '先保持同一条线。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 260,
            rendererHints: {
              residentMode: 'measured-return',
              preferredExpressionAliases: ['ScriptSegmentAlias'],
              preferredMotionAliases: ['ScriptSegmentMotion'],
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              reasonTags: ['script-segment'],
              signature: 'script-segment-signature',
            },
          }],
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: ' authoritative-speech-timeline-variation ',
        reply: '先保持同一条线。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-runtime-first-frame-alias-authority',
          index: 0,
          startOffset: 0,
          endOffset: 8,
          text: '先保持同一条线。',
          emotion: 'thinking',
          gestureWeight: 0.2,
          facialWeight: 0.6,
          prosodyWeight: 0.4,
          beatWeight: 0.2,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredExpressionAliases: ['TimelineAlias'],
            preferredMotionAliases: ['TimelineMotion'],
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'steady',
            reasonTags: ['timeline'],
            signature: 'timeline-signature',
          },
          actionCue: 'steady_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      },
      digitalLife: {
        variationToken: ' authoritative-digital-life-variation ',
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.93,
        },
      },
    })

    expect(resolved).toEqual({
      digitalLife: {
        variationToken: ' authoritative-digital-life-variation ',
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.93,
        },
      },
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['TimelineAlias', 'ScriptSegmentAlias', 'ScriptStateAlias', 'StaleEmbodimentAlias'],
        preferredMotionAliases: ['TimelineMotion', 'ScriptSegmentMotion', 'StaleEmbodimentMotion'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'steady',
        reasonTags: ['timeline', 'script-segment', 'script-state', 'stale-embodiment'],
        signature: 'timeline-signature',
      },
      variationToken: 'authoritative-digital-life-variation',
      speechStyle: {
        pitchDelta: -4,
        rateMultiplier: 0.93,
      },
      voice: null,
    })
  })

  it('falls back to embodimentScript digitalLife when top-level digitalLife is absent', () => {
    const resolveStageEmbodimentMetaAuthority = (stageRuntime as any).resolveStageEmbodimentMetaAuthority

    const resolved = resolveStageEmbodimentMetaAuthority({
      embodiment: {
        variationToken: ' stale-embodiment-variation ',
        speechStyle: {
          pitchDelta: 5,
          rateMultiplier: 1.08,
        },
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-runtime-script-digital-life-fallback',
        rendererTarget: 'live2d',
        replyText: '先把这条身体线稳住。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
          rendererHints: {
            preferredExpressionAliases: ['ScriptStateAlias'],
            reasonTags: ['script-state'],
          },
        },
        speechPlan: {
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 260,
          segments: [{
            id: 'segment-runtime-script-digital-life-fallback',
            index: 0,
            text: '先把这条身体线稳住。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 260,
            rendererHints: {
              residentMode: 'measured-return',
              preferredExpressionAliases: ['ScriptSegmentAlias'],
              preferredMotionAliases: ['ScriptSegmentMotion'],
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              reasonTags: ['script-segment'],
              signature: 'script-segment-signature',
            },
          }],
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: ' script-digital-life-authority ',
          emotion: 'thinking',
          mode: 'recovering',
          postureHint: 'inspection',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'idle_settle',
            delivery: 'gentle',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: -3,
            rateMultiplier: 0.9,
          },
          rendererHints: {
            residentMode: 'measured-return',
            signature: 'script-digital-life-signature',
          },
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.9,
            energy: 0.24,
            cadence: 0.2,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.18,
            energyBias: 0.14,
            mouthScale: 0.72,
            continuityHoldMs: 400,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.22,
            holdMs: 340,
          },
          action: {
            actionCue: 'idle_settle',
            actionMode: 'hold',
            intensity: 0.1,
            holdMs: 300,
          },
          motor: {},
          frames: [{
            id: 'segment-runtime-script-digital-life-fallback',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '先把这条身体线稳住。',
            mode: 'recovering',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.9,
              energy: 0.24,
              cadence: 0.2,
            },
            lipSync: {
              mode: 'closed',
              visemeBias: 0.18,
              energyBias: 0.14,
              mouthScale: 0.72,
              continuityHoldMs: 400,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.22,
              holdMs: 340,
            },
            action: {
              actionCue: 'idle_settle',
              actionMode: 'hold',
              intensity: 0.1,
              holdMs: 300,
            },
            motor: {},
          }],
        },
      },
    })

    expect(resolved).toEqual({
      digitalLife: expect.objectContaining({
        variationToken: 'script-digital-life-authority',
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.9,
        },
        rendererHints: expect.objectContaining({
          signature: 'script-digital-life-signature',
        }),
      }),
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['ScriptSegmentAlias', 'ScriptStateAlias'],
        preferredMotionAliases: ['ScriptSegmentMotion'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['script-segment', 'script-state'],
        signature: 'script-segment-signature',
      },
      variationToken: 'script-digital-life-authority',
      speechStyle: {
        pitchDelta: -3,
        rateMultiplier: 0.9,
      },
      voice: {
        pitchDelta: -3,
        rateMultiplier: 0.9,
        energy: 0.24,
        cadence: 0.2,
      },
    })
  })
})

describe('live2d embodiment drivers', () => {
  const script: AlicizationEmbodimentScriptV1 = {
    version: 'embodiment-script-v1' as const,
    turnId: 'turn-1',
    rendererTarget: 'live2d' as const,
    replyText: '你好',
    state: {
      baseEmotion: 'happy' as const,
      delivery: 'energetic' as const,
      emphasis: 2 as const,
      residentMode: 'dialogue' as const,
    },
    speechPlan: {
      segments: [{
        id: 'segment-1',
        index: 0,
        text: '你好',
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 260,
      }],
      interruptPolicy: 'soft-settle' as const,
      preRollMs: 20,
      settleMs: 260,
    },
    facePlan: {
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'settle-smile',
      speakingCues: [{
        segmentId: 'segment-1',
        emotion: 'happy' as const,
        facialCue: 'smile',
        intensity: 0.8,
        holdMs: 360,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        source: 'prosody-authority' as const,
        confidence: 0.94,
      }],
    },
    motionPlan: {
      idleBase: 'idle_settle',
      actionBursts: [{
        segmentId: 'segment-1',
        actionCue: 'wave',
        intensity: 0.7,
        holdMs: 320,
        source: 'timeline-projection' as const,
        confidence: 0.88,
      }],
      attentionMode: 'attentive' as const,
    },
    lipsyncPlan: {
      mode: 'energy-phoneme-hybrid' as const,
    },
  }

  it('resolves live2d face cues from the embodiment script', () => {
    expect(resolveLive2DFaceDriverState({
      script,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      emotion: 'happy',
      facialCue: 'smile',
      intensity: 0.8,
      holdMs: 360,
      source: 'prosody-authority',
      confidence: 0.94,
    }))
  })

  it('routes pre and post utterance timing through the live2d face driver', () => {
    expect(resolveLive2DFaceDriverState({
      script,
      segmentId: 'segment-1',
      idleCuePhase: 'pre-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'steady-inhale',
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'settle-smile',
    }))

    expect(resolveLive2DFaceDriverState({
      script,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'soft-release',
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'settle-smile',
    }))
  })

  it('defaults idle face timing to the pre-utterance cue when no idle cue phase is provided', () => {
    expect(resolveLive2DFaceDriverState({
      script,
      segmentId: 'segment-1',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'steady-inhale',
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'settle-smile',
    }))
  })

  it('prefers segment-level idle face timing cues when they are available', () => {
    expect(resolveLive2DFaceDriverState({
      script,
      segmentId: 'segment-1',
      idleCuePhase: 'pre-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'steady-inhale',
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'settle-smile',
    }))

    expect(resolveLive2DFaceDriverState({
      script,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'soft-release',
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'settle-smile',
    }))
  })

  it('resolves live2d lipsync mode from the embodiment script', () => {
    expect(resolveLive2DLipSyncDriverState({
      script,
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      mode: 'energy-phoneme-hybrid',
    }))
  })

  it('keeps live2d lipsync on the first embodied speech line when no explicit segment id is available instead of mixing multiple segment viseme lanes together', () => {
    const multiSegmentScript: AlicizationEmbodimentScriptV1 = {
      ...script,
      speechPlan: {
        ...script.speechPlan,
        segments: [
          {
            ...script.speechPlan.segments[0],
            id: 'segment-1',
          },
          {
            ...script.speechPlan.segments[0],
            id: 'segment-2',
            index: 1,
            text: '我还在这里',
          },
        ],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [
          { segmentId: 'segment-1', viseme: 'A', weight: 0.42, source: 'prosody-authority', confidence: 0.92 },
          { segmentId: 'segment-2', viseme: 'O', weight: 0.57, source: 'prosody-authority', confidence: 0.94 },
        ],
      },
    }

    expect(resolveLive2DLipSyncDriverState({
      script: multiSegmentScript,
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      segmentId: null,
      visemeHints: [
        expect.objectContaining({
          segmentId: 'segment-1',
          viseme: 'A',
          weight: 0.42,
        }),
      ],
    }))
  })

  it('keeps same-her audible-return live2d viseme hints softer than an ordinary measured-return callback line', () => {
    const genericMeasuredReturnScript: AlicizationEmbodimentScriptV1 = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return',
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'normal',
            preferredGazeMode: 'steady',
          },
        }],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [
          { segmentId: 'segment-1', viseme: 'closed', weight: 0.6, source: 'prosody-authority', confidence: 0.94 },
          { segmentId: 'segment-1', viseme: 'O', weight: 0.34, source: 'prosody-authority', confidence: 0.94 },
        ],
      },
    }
    const audibleSameHerMeasuredReturnScript: AlicizationEmbodimentScriptV1 = {
      ...genericMeasuredReturnScript,
      speechPlan: {
        ...genericMeasuredReturnScript.speechPlan,
        segments: [{
          ...genericMeasuredReturnScript.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        }],
      },
    }

    const genericState = resolveLive2DLipSyncDriverState({
      script: genericMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })
    const audibleSameHerState = resolveLive2DLipSyncDriverState({
      script: audibleSameHerMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })

    expect(genericState?.visemeHints).toHaveLength(2)
    expect(audibleSameHerState?.visemeHints).toHaveLength(2)
    for (const genericHint of genericState?.visemeHints ?? []) {
      const audibleSameHerHint = audibleSameHerState?.visemeHints.find(hint => hint.viseme === genericHint.viseme)
      expect(audibleSameHerHint?.weight).toBeLessThan(genericHint.weight)
    }
  })

  it('keeps repair-before-closeness same-her audible-return live2d visemes on the most restrained tier', () => {
    const measuredReturnScript: AlicizationEmbodimentScriptV1 = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return',
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        }],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [
          { segmentId: 'segment-1', viseme: 'closed', weight: 0.6, source: 'prosody-authority', confidence: 0.94 },
        ],
      },
    }
    const repairScript: AlicizationEmbodimentScriptV1 = {
      ...measuredReturnScript,
      state: {
        ...measuredReturnScript.state,
        residentMode: 'repair-before-closeness',
      },
      speechPlan: {
        ...measuredReturnScript.speechPlan,
        segments: [{
          ...measuredReturnScript.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        }],
      },
    }

    const measuredReturnState = resolveLive2DLipSyncDriverState({
      script: measuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })
    const repairState = resolveLive2DLipSyncDriverState({
      script: repairScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })

    expect(measuredReturnState?.visemeHints[0]?.weight).toBeGreaterThan(repairState?.visemeHints[0]?.weight ?? 1)
  })

  it('keeps still-voiced same-her live2d viseme hints softer than an otherwise equally softened measured-return line', () => {
    const genericMeasuredReturnScript: AlicizationEmbodimentScriptV1 = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return',
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        }],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [
          { segmentId: 'segment-1', viseme: 'closed', weight: 0.6, source: 'prosody-authority', confidence: 0.94 },
          { segmentId: 'segment-1', viseme: 'O', weight: 0.34, source: 'prosody-authority', confidence: 0.94 },
        ],
      },
    }
    const stillVoicedMeasuredReturnScript: AlicizationEmbodimentScriptV1 = {
      ...genericMeasuredReturnScript,
      speechPlan: {
        ...genericMeasuredReturnScript.speechPlan,
        segments: [{
          ...genericMeasuredReturnScript.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:still-voiced-face-line',
            reasonTags: ['embodiment:still-voiced-face-line'],
          },
        }],
      },
    }

    const genericState = resolveLive2DLipSyncDriverState({
      script: genericMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })
    const stillVoicedState = resolveLive2DLipSyncDriverState({
      script: stillVoicedMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })

    expect(genericState?.visemeHints).toHaveLength(2)
    expect(stillVoicedState?.visemeHints).toHaveLength(2)
    for (const genericHint of genericState?.visemeHints ?? []) {
      const stillVoicedHint = stillVoicedState?.visemeHints.find(hint => hint.viseme === genericHint.viseme)
      expect(stillVoicedHint?.weight).toBeLessThan(genericHint.weight)
    }
  })

  it('resolves live2d motion cues from the embodiment script', () => {
    expect(resolveLive2DMotionDriverState({
      script,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'idle_settle',
      actionCue: 'wave',
      holdMs: 320,
      source: 'timeline-projection',
      confidence: 0.88,
    }))
  })

  it('keeps restrained callback motion cues clamped when live2d driver resolves measured-return and repair-before-closeness scripts', () => {
    const measuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.32,
          holdMs: 260,
          source: 'timeline-projection' as const,
          confidence: 0.86,
        }],
      },
    }
    const repairBeforeClosenessScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'repair-before-closeness' as const,
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.2,
          holdMs: 280,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: measuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: 'observe_focus',
    }))

    expect(resolveLive2DMotionDriverState({
      script: repairBeforeClosenessScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'idle_settle',
      actionCue: 'idle_settle',
    }))
  })

  it('uses restrained callback expression alias authority when live2d face driver resolves measured-return and repair-before-closeness idle cues', () => {
    const measuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
          },
        }],
      },
    }
    const repairBeforeClosenessScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'repair-before-closeness' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'repair-before-closeness' as const,
            preferredExpressionAliases: ['RecoverSoft', 'soft-release'],
          },
        }],
      },
    }

    expect(resolveLive2DFaceDriverState({
      script: measuredReturnScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'soft-release',
      postUtteranceCue: 'calminspect',
    }))

    expect(resolveLive2DFaceDriverState({
      script: repairBeforeClosenessScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'soft-release',
      postUtteranceCue: 'soft-release',
    }))
  })

  it('keeps durable relationship rhythm on a steady measured-return baseline when the script already settled into that cadence', () => {
    const durableMeasuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            preferredGazeMode: 'steady' as const,
            preferredBlinkCadence: 'quiet' as const,
            residentMode: 'measured-return',
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.26,
          holdMs: 300,
          source: 'timeline-projection' as const,
          confidence: 0.9,
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: durableMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'steady_focus',
      actionCue: 'steady_focus',
    }))
  })

  it('keeps softened measured-return motion authority when companionship hints already say linger and soften', () => {
    const softenedMeasuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.facePlan.speakingCues[0],
          ...script.speechPlan.segments[0],
          rendererHints: {
            preferredGazeMode: 'soften' as const,
            preferredBlinkCadence: 'linger' as const,
            residentMode: 'measured-return',
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.24,
          holdMs: 280,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: softenedMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'steady_focus',
      actionCue: 'steady_focus',
    }))
  })

  it('keeps restrained callback face cues clamped when live2d driver resolves warmer post-utterance fallback cues', () => {
    const measuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      facePlan: {
        ...script.facePlan,
        postUtteranceCue: 'settle-smile',
        speakingCues: [{
          ...script.facePlan.speakingCues[0],
          postUtteranceCue: 'settle-smile',
        }],
      },
    }
    const repairBeforeClosenessScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'repair-before-closeness' as const,
      },
      facePlan: {
        ...script.facePlan,
        postUtteranceCue: 'settle-smile',
        speakingCues: [{
          ...script.facePlan.speakingCues[0],
          postUtteranceCue: 'settle-smile',
        }],
      },
    }

    expect(resolveLive2DFaceDriverState({
      script: measuredReturnScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'eyes-soften',
      postUtteranceCue: 'eyes-soften',
    }))

    expect(resolveLive2DFaceDriverState({
      script: repairBeforeClosenessScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'soft-release',
      postUtteranceCue: 'soft-release',
    }))
  })

  it('keeps same-her audible-return live2d face post-utterance cues softer than ordinary measured-return', () => {
    const genericMeasuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      facePlan: {
        ...script.facePlan,
        postUtteranceCue: 'settle-smile',
        speakingCues: [{
          ...script.facePlan.speakingCues[0],
          postUtteranceCue: 'settle-smile',
        }],
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredExpressionAliases: ['EyesSoften', 'soft-gaze'],
            preferredBlinkCadence: 'normal' as const,
            preferredGazeMode: 'steady' as const,
          },
        }],
      },
    }
    const audibleSameHerScript = {
      ...genericMeasuredReturnScript,
      speechPlan: {
        ...genericMeasuredReturnScript.speechPlan,
        segments: [{
          ...genericMeasuredReturnScript.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredExpressionAliases: ['Relaxed', 'soft-gaze'],
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        }],
      },
    }

    expect(resolveLive2DFaceDriverState({
      script: genericMeasuredReturnScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'soft-gaze',
      postUtteranceCue: 'soft-gaze',
    }))

    expect(resolveLive2DFaceDriverState({
      script: audibleSameHerScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'relaxed',
      postUtteranceCue: 'relaxed',
    }))
  })

  it('keeps still-voiced same-her live2d face post-utterance cues softer than an otherwise equally softened measured-return line', () => {
    const genericMeasuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      facePlan: {
        ...script.facePlan,
        postUtteranceCue: 'settle-smile',
        speakingCues: [{
          ...script.facePlan.speakingCues[0],
          postUtteranceCue: 'settle-smile',
        }],
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredExpressionAliases: ['Relaxed', 'soft-gaze'],
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
          },
        }],
      },
    }
    const stillVoicedScript = {
      ...genericMeasuredReturnScript,
      speechPlan: {
        ...genericMeasuredReturnScript.speechPlan,
        segments: [{
          ...genericMeasuredReturnScript.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredExpressionAliases: ['Relaxed', 'soft-gaze'],
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
            signature: 'embodiment:still-voiced-face-line',
            reasonTags: ['embodiment:still-voiced-face-line'],
          },
        }],
      },
    }

    expect(resolveLive2DFaceDriverState({
      script: genericMeasuredReturnScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'soft-gaze',
      postUtteranceCue: 'soft-gaze',
    }))

    expect(resolveLive2DFaceDriverState({
      script: stillVoicedScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'relaxed',
      postUtteranceCue: 'relaxed',
    }))
  })

  it('keeps quieter body+lipsync-only and lipsync+voice-only live2d face post-utterance cues on the same softer line', () => {
    const genericSameThreadScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'same-thread-continuation' as const,
      },
      facePlan: {
        ...script.facePlan,
        postUtteranceCue: 'settle-smile',
        speakingCues: [{
          ...script.facePlan.speakingCues[0],
          postUtteranceCue: 'settle-smile',
        }],
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'same-thread-continuation' as const,
            preferredExpressionAliases: ['Relaxed', 'soft-gaze'],
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
          },
        }],
      },
    }
    const bodyLipsyncOnlyScript = {
      ...genericSameThreadScript,
      speechPlan: {
        ...genericSameThreadScript.speechPlan,
        segments: [{
          ...genericSameThreadScript.speechPlan.segments[0],
          rendererHints: {
            ...genericSameThreadScript.speechPlan.segments[0].rendererHints,
            reasonTags: ['embodiment:body+lipsync-only'],
          },
        }],
      },
    }
    const lipsyncVoiceOnlyScript = {
      ...genericSameThreadScript,
      speechPlan: {
        ...genericSameThreadScript.speechPlan,
        segments: [{
          ...genericSameThreadScript.speechPlan.segments[0],
          rendererHints: {
            ...genericSameThreadScript.speechPlan.segments[0].rendererHints,
            reasonTags: ['embodiment:lipsync+voice-only'],
          },
        }],
      },
    }

    expect(resolveLive2DFaceDriverState({
      script: genericSameThreadScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'settle-smile',
      postUtteranceCue: 'settle-smile',
    }))

    expect(resolveLive2DFaceDriverState({
      script: bodyLipsyncOnlyScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'relaxed',
      postUtteranceCue: 'relaxed',
    }))

    expect(resolveLive2DFaceDriverState({
      script: lipsyncVoiceOnlyScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'relaxed',
      postUtteranceCue: 'relaxed',
    }))
  })

  it('keeps same-her audible-return live2d motion on the softer steady-focus tier instead of dropping to observe-focus', () => {
    const genericMeasuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredBlinkCadence: 'normal' as const,
            preferredGazeMode: 'steady' as const,
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.24,
          holdMs: 280,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
    }
    const audibleSameHerScript = {
      ...genericMeasuredReturnScript,
      speechPlan: {
        ...genericMeasuredReturnScript.speechPlan,
        segments: [{
          ...genericMeasuredReturnScript.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: genericMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: 'observe_focus',
    }))

    expect(resolveLive2DMotionDriverState({
      script: audibleSameHerScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'steady_focus',
      actionCue: 'steady_focus',
    }))
  })

  it('keeps still-voiced same-her live2d motion on the softer steady-focus tier instead of dropping to observe-focus', () => {
    const genericMeasuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'steady' as const,
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.24,
          holdMs: 280,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
    }
    const stillVoicedScript = {
      ...genericMeasuredReturnScript,
      speechPlan: {
        ...genericMeasuredReturnScript.speechPlan,
        segments: [{
          ...genericMeasuredReturnScript.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return' as const,
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'steady' as const,
            signature: 'embodiment:still-voiced-motion-line',
            reasonTags: ['embodiment:still-voiced-motion-line'],
          },
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: genericMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: 'observe_focus',
    }))

    expect(resolveLive2DMotionDriverState({
      script: stillVoicedScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'steady_focus',
      actionCue: 'steady_focus',
    }))
  })

  it('keeps same-her audible-return live2d preview motion on the observing line until playback actually reopens the burst', () => {
    const sameThreadAudibleSameHerScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'same-thread-continuation' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'same-thread-continuation' as const,
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.24,
          holdMs: 280,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: sameThreadAudibleSameHerScript,
      segmentId: 'segment-1',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
  })

  it('keeps same-thread audible body-lipsync-voice rejoin motion on the observing line without reintroducing an extra action pulse', () => {
    const sameThreadAudibleSameHerScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'same-thread-continuation' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'same-thread-continuation' as const,
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.24,
          holdMs: 280,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: sameThreadAudibleSameHerScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
  })

  it('keeps body+voice-only same-her live2d motion on an observing body line without reintroducing an extra action pulse', () => {
    const bodyVoiceOnlyScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'same-thread-continuation' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'same-thread-continuation' as const,
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
            signature: 'embodiment:audible_same_her_line',
            reasonTags: ['embodiment:body+voice-only'],
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.22,
          holdMs: 240,
          source: 'timeline-projection' as const,
          confidence: 0.86,
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: bodyVoiceOnlyScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
  })

  it('keeps quieter body+lipsync-only and lipsync+voice-only live2d motion on the observing line without reintroducing an extra action pulse', () => {
    const bodyLipsyncOnlyScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'same-thread-continuation' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'same-thread-continuation' as const,
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
            reasonTags: ['embodiment:body+lipsync-only'],
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.22,
          holdMs: 240,
          source: 'timeline-projection' as const,
          confidence: 0.86,
        }],
      },
    }
    const lipsyncVoiceOnlyScript = {
      ...bodyLipsyncOnlyScript,
      speechPlan: {
        ...bodyLipsyncOnlyScript.speechPlan,
        segments: [{
          ...bodyLipsyncOnlyScript.speechPlan.segments[0],
          rendererHints: {
            ...bodyLipsyncOnlyScript.speechPlan.segments[0].rendererHints,
            reasonTags: ['embodiment:lipsync+voice-only'],
          },
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: bodyLipsyncOnlyScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))

    expect(resolveLive2DMotionDriverState({
      script: lipsyncVoiceOnlyScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
  })

  it('keeps same-thread still-voiced motion-line and face-and-motion carry on the observing line without reintroducing an extra action pulse', () => {
    const stillVoicedMotionScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'same-thread-continuation' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'same-thread-continuation' as const,
            preferredBlinkCadence: 'linger' as const,
            preferredGazeMode: 'soften' as const,
            signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
          },
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.22,
          holdMs: 240,
          source: 'timeline-projection' as const,
          confidence: 0.86,
        }],
      },
    }
    const stillVoicedFaceMotionScript = {
      ...stillVoicedMotionScript,
      speechPlan: {
        ...stillVoicedMotionScript.speechPlan,
        segments: [{
          ...stillVoicedMotionScript.speechPlan.segments[0],
          rendererHints: {
            ...stillVoicedMotionScript.speechPlan.segments[0].rendererHints,
            signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line|lane=face+motion+voice-only',
            reasonTags: ['embodiment:still-voiced-face-motion-line'],
          },
        }],
      },
    }

    expect(resolveLive2DMotionDriverState({
      script: stillVoicedMotionScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))

    expect(resolveLive2DMotionDriverState({
      script: stillVoicedFaceMotionScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'observe_focus',
      actionCue: null,
    }))
  })

  it('dampens restrained callback lipsync viseme weights at the live2d driver layer without changing mode', () => {
    const measuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [{
          segmentId: 'segment-1',
          viseme: 'A' as const,
          weight: 0.5,
          source: 'prosody-authority' as const,
          confidence: 0.9,
        }],
      },
    }
    const repairBeforeClosenessScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'repair-before-closeness' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [{
          segmentId: 'segment-1',
          viseme: 'A' as const,
          weight: 0.5,
          source: 'prosody-authority' as const,
          confidence: 0.9,
        }],
      },
    }

    expect(resolveLive2DLipSyncDriverState({
      script: measuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      mode: 'energy-phoneme-hybrid',
      continuityHoldMs: 0,
      visemeHints: [
        expect.objectContaining({
          viseme: 'A',
          weight: 0.41,
        }),
      ],
    }))

    expect(resolveLive2DLipSyncDriverState({
      script: repairBeforeClosenessScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      mode: 'energy-phoneme-hybrid',
      continuityHoldMs: 0,
      visemeHints: [
        expect.objectContaining({
          viseme: 'A',
          weight: 0.34,
        }),
      ],
    }))
  })

  it('keeps later-segment live2d lipsync continuity hold attached to the same restrained body line', () => {
    const laterMeasuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [
          {
            ...script.speechPlan.segments[0],
            id: 'segment-1',
            continuityHoldMs: 120,
          },
          {
            ...script.speechPlan.segments[0],
            id: 'segment-2',
            index: 1,
            text: '我还在这里',
            continuityHoldMs: 320,
            rendererHints: {
              preferredGazeMode: 'soften' as const,
              preferredBlinkCadence: 'linger' as const,
              residentMode: 'measured-return',
            },
          },
        ],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [
          {
            segmentId: 'segment-1',
            viseme: 'A' as const,
            weight: 0.44,
            source: 'prosody-authority' as const,
            confidence: 0.82,
          },
          {
            segmentId: 'segment-2',
            viseme: 'A' as const,
            weight: 0.5,
            source: 'prosody-authority' as const,
            confidence: 0.9,
          },
        ],
      },
    }

    expect(resolveLive2DLipSyncDriverState({
      continuityHoldMs: 320,
      script: laterMeasuredReturnScript,
      segmentId: 'segment-2',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      mode: 'energy-phoneme-hybrid',
      segmentId: 'segment-2',
      continuityHoldMs: 320,
      visemeHints: [
        expect.objectContaining({
          segmentId: 'segment-2',
          viseme: 'A',
          weight: 0.41,
        }),
      ],
    }))
  })

  it('keeps quieter body+lipsync-only and lipsync+voice-only live2d viseme hints softer than an otherwise identical same-thread line', () => {
    const genericSameThreadScript: AlicizationEmbodimentScriptV1 = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'same-thread-continuation',
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        }],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [
          { segmentId: 'segment-1', viseme: 'closed', weight: 0.6, source: 'prosody-authority', confidence: 0.94 },
          { segmentId: 'segment-1', viseme: 'O', weight: 0.34, source: 'prosody-authority', confidence: 0.94 },
        ],
      },
    }
    const bodyLipsyncOnlyScript: AlicizationEmbodimentScriptV1 = {
      ...genericSameThreadScript,
      speechPlan: {
        ...genericSameThreadScript.speechPlan,
        segments: [{
          ...genericSameThreadScript.speechPlan.segments[0],
          rendererHints: {
            ...genericSameThreadScript.speechPlan.segments[0].rendererHints,
            reasonTags: ['embodiment:body+lipsync-only'],
          },
        }],
      },
    }
    const lipsyncVoiceOnlyScript: AlicizationEmbodimentScriptV1 = {
      ...genericSameThreadScript,
      speechPlan: {
        ...genericSameThreadScript.speechPlan,
        segments: [{
          ...genericSameThreadScript.speechPlan.segments[0],
          rendererHints: {
            ...genericSameThreadScript.speechPlan.segments[0].rendererHints,
            reasonTags: ['embodiment:lipsync+voice-only'],
          },
        }],
      },
    }

    const genericState = resolveLive2DLipSyncDriverState({
      script: genericSameThreadScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })
    const bodyLipsyncOnlyState = resolveLive2DLipSyncDriverState({
      script: bodyLipsyncOnlyScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })
    const lipsyncVoiceOnlyState = resolveLive2DLipSyncDriverState({
      script: lipsyncVoiceOnlyScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })

    expect(genericState?.visemeHints).toHaveLength(2)
    expect(bodyLipsyncOnlyState?.visemeHints).toHaveLength(2)
    expect(lipsyncVoiceOnlyState?.visemeHints).toHaveLength(2)
    for (const genericHint of genericState?.visemeHints ?? []) {
      const bodyLipsyncOnlyHint = bodyLipsyncOnlyState?.visemeHints.find(hint => hint.viseme === genericHint.viseme)
      const lipsyncVoiceOnlyHint = lipsyncVoiceOnlyState?.visemeHints.find(hint => hint.viseme === genericHint.viseme)
      expect(bodyLipsyncOnlyHint?.weight).toBeLessThan(genericHint.weight)
      expect(lipsyncVoiceOnlyHint?.weight).toBeLessThan(genericHint.weight)
    }
  })

  it('lets active segment companionship mode override a thinner dialogue shell across face, motion, and lipsync drivers', () => {
    const segmentMeasuredReturnScript = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'dialogue' as const,
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'measured-return',
            preferredGazeMode: 'soften' as const,
            preferredBlinkCadence: 'linger' as const,
          },
        }],
      },
      facePlan: {
        ...script.facePlan,
        postUtteranceCue: 'settle-smile',
        speakingCues: [{
          ...script.facePlan.speakingCues[0],
          postUtteranceCue: 'settle-smile',
        }],
      },
      motionPlan: {
        ...script.motionPlan,
        idleBase: 'steady_focus',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'steady_focus',
          intensity: 0.24,
          holdMs: 280,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [{
          segmentId: 'segment-1',
          viseme: 'A' as const,
          weight: 0.5,
          source: 'prosody-authority' as const,
          confidence: 0.9,
        }],
      },
    }

    expect(resolveLive2DFaceDriverState({
      script: segmentMeasuredReturnScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'eyes-soften',
      postUtteranceCue: 'eyes-soften',
    }))

    expect(resolveLive2DMotionDriverState({
      script: segmentMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'steady_focus',
      actionCue: 'steady_focus',
    }))

    expect(resolveLive2DLipSyncDriverState({
      script: segmentMeasuredReturnScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      visemeHints: [
        expect.objectContaining({
          viseme: 'A',
          weight: 0.41,
        }),
      ],
    }))
  })
})
