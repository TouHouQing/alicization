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
    version: 'embodiment-script-v1',
    turnId: 'turn-1',
    rendererTarget: 'live2d',
    replyText: '你好',
    state: {
      baseEmotion: 'happy',
      delivery: 'energetic',
      emphasis: 2,
      residentMode: 'dialogue',
    },
    speechPlan: {
      segments: [{
        id: 'segment-1',
        index: 0,
        text: '你好',
        interruptPolicy: 'soft-settle',
        preRollMs: 20,
        settleMs: 260,
      }],
      interruptPolicy: 'soft-settle',
      preRollMs: 20,
      settleMs: 260,
    },
    facePlan: {
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'settle-smile',
      speakingCues: [{
        segmentId: 'segment-1',
        emotion: 'happy',
        facialCue: 'smile',
        intensity: 0.8,
        holdMs: 360,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        source: 'prosody-authority',
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
        source: 'timeline-projection',
        confidence: 0.88,
      }],
      attentionMode: 'attentive',
    },
    lipsyncPlan: {
      mode: 'energy-phoneme-hybrid',
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

  it('keeps live2d lipsync on the first embodied speech line when no explicit segment id is available', () => {
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
            text: '第二段',
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

  it('keeps explicit live2d driver cues authoritative over resident audit metadata', () => {
    const auditedScript: AlicizationEmbodimentScriptV1 = {
      ...script,
      state: {
        ...script.state,
        residentMode: 'repair-before-closeness',
      },
      speechPlan: {
        ...script.speechPlan,
        segments: [{
          ...script.speechPlan.segments[0],
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredExpressionAliases: ['ConfiguredExpression'],
            preferredMotionAliases: ['ConfiguredMotion'],
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
            reasonTags: ['audit-only'],
            signature: 'audit:opaque',
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
          source: 'timeline-projection',
          confidence: 0.88,
        }],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [{
          segmentId: 'segment-1',
          viseme: 'A',
          weight: 0.5,
          source: 'prosody-authority',
          confidence: 0.9,
        }],
      },
    }

    expect(resolveLive2DFaceDriverState({
      script: auditedScript,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'settle-smile',
      postUtteranceCue: 'settle-smile',
    }))

    expect(resolveLive2DMotionDriverState({
      script: auditedScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'steady_focus',
      actionCue: 'steady_focus',
    }))

    expect(resolveLive2DLipSyncDriverState({
      script: auditedScript,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      visemeHints: [
        expect.objectContaining({
          viseme: 'A',
          weight: 0.5,
        }),
      ],
    }))
  })
})
