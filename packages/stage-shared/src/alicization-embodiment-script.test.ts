import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationEmbodimentScript,
} from './index'

describe('alicization embodiment script', () => {
  it('accepts vrm as a valid embodiment renderer target', () => {
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-vrm-renderer-target',
      rendererTarget: 'vrm',
      replyText: '我会继续看着这个问题。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'soft-settle',
        preRollMs: 0,
        settleMs: 180,
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
        mode: 'energy-only',
      },
    })

    expect(script?.rendererTarget).toBe('vrm')
  })

  it('normalizes one live2d embodiment script with speech, face, motion, and lipsync plans', () => {
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      decisionTraceId: 'trace-1',
      turnId: 'turn-1',
      rendererTarget: 'live2d',
      replyText: '你好，我们慢慢来。',
      state: {
        baseEmotion: 'concerned',
        delivery: 'gentle',
        emphasis: 1,
        residentMode: 'quiet-companionship',
      },
      speechPlan: {
        segments: [{
          id: 'segment-1',
          index: 0,
          text: '你好，我们慢慢来。',
          interruptPolicy: 'soft-settle',
          preRollMs: 60,
          settleMs: 240,
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
          prosody: {
            language: 'zh-CN',
            pauseClass: 'comma',
            phraseBoundary: 'soft',
            contour: 'falling',
            emphasisWord: '慢慢',
            emphasisStrength: 0.64,
            tempoShift: -0.06,
          },
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 60,
        settleMs: 240,
      },
      facePlan: {
        preUtteranceCue: 'soft-breath',
        postUtteranceCue: 'settle-smile',
        speakingCues: [{
          segmentId: 'segment-1',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          intensity: 0.62,
          holdMs: 360,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          source: 'prosody-authority',
          confidence: 0.9,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'comfort_sway',
          intensity: 0.55,
          holdMs: 420,
          source: 'timeline-projection',
          confidence: 0.86,
        }],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [{
          segmentId: 'segment-1',
          viseme: 'A',
          weight: 0.8,
          source: 'prosody-authority',
          confidence: 0.94,
        }],
      },
    })

    expect(script?.decisionTraceId).toBe('trace-1')
    expect(script?.rendererTarget).toBe('live2d')
    expect(script?.state.residentMode).toBe('quiet-companionship')
    expect(script?.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(script?.facePlan.postUtteranceCue).toBe('settle-smile')
    expect(script?.speechPlan.segments[0]?.interruptPolicy).toBe('soft-settle')
    expect(script?.speechPlan.segments[0]?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 420,
      vrmActionFadeMs: 220,
      vrmExpressionBlendMs: 260,
    })
    expect(script?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
    })
    expect(script?.speechPlan.segments[0]?.prosody).toEqual({
      language: 'zh-CN',
      pauseClass: 'comma',
      phraseBoundary: 'soft',
      contour: 'falling',
      emphasisWord: '慢慢',
      emphasisStrength: 0.64,
      tempoShift: -0.06,
    })
    expect(script?.facePlan.speakingCues[0]?.holdMs).toBe(360)
    expect(script?.facePlan.speakingCues[0]?.preUtteranceCue).toBe('steady-inhale')
    expect(script?.facePlan.speakingCues[0]?.postUtteranceCue).toBe('soft-release')
    expect(script?.facePlan.speakingCues[0]).toEqual(expect.objectContaining({
      source: 'prosody-authority',
      confidence: 0.9,
    }))
    expect(script?.motionPlan.actionBursts[0]?.holdMs).toBe(420)
    expect(script?.motionPlan.actionBursts[0]).toEqual(expect.objectContaining({
      source: 'timeline-projection',
      confidence: 0.86,
    }))
    expect(script?.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(script?.lipsyncPlan.visemeHints?.[0]).toEqual({
      segmentId: 'segment-1',
      viseme: 'A',
      weight: 0.8,
      source: 'prosody-authority',
      confidence: 0.94,
    })
  })

  it('preserves long segment ids consistently across speech, face, motion, and lipsync plans', () => {
    const longSegmentIdA = 'turn-callback-afterglow-chat-meta-measured-return-vrm-noisy|mind:mpr3ttm0:6319b0a3c2a9||guide|我先沿着刚才那条 callback 线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。:0'
    const longSegmentIdB = 'turn-callback-afterglow-chat-meta-measured-return-vrm-noisy|mind:mpr3ttm0:6319b0a3c2a9||guide|我先沿着刚才那条 callback 线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。:1'
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-long-segment-id',
      rendererTarget: 'vrm',
      replyText: '我先沿着刚才那条 callback 线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
        residentMode: 'measured-return',
      },
      speechPlan: {
        segments: [
          {
            id: longSegmentIdA,
            index: 0,
            text: '我先沿着刚才那条 callback 线轻一点跟回去，',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 280,
          },
          {
            id: longSegmentIdB,
            index: 1,
            text: '先看这一处 runtime seam 怎么继续收口。',
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 300,
          },
        ],
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 300,
      },
      facePlan: {
        speakingCues: [
          {
            segmentId: longSegmentIdA,
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.62,
            holdMs: 360,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'prosody-authority',
            confidence: 0.9,
          },
          {
            segmentId: longSegmentIdB,
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.58,
            holdMs: 340,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.9,
          },
        ],
      },
      motionPlan: {
        idleBase: 'inspect_follow',
        actionBursts: [
          {
            segmentId: longSegmentIdA,
            actionCue: 'inspect_follow',
            intensity: 0.52,
            holdMs: 360,
            source: 'timeline-projection',
            confidence: 0.86,
          },
          {
            segmentId: longSegmentIdB,
            actionCue: 'inspect_follow',
            intensity: 0.48,
            holdMs: 340,
            source: 'timeline-projection',
            confidence: 0.86,
          },
        ],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [
          {
            segmentId: longSegmentIdA,
            viseme: 'A',
            weight: 0.8,
            source: 'prosody-authority',
            confidence: 0.94,
          },
          {
            segmentId: longSegmentIdB,
            viseme: 'I',
            weight: 0.74,
            source: 'prosody-authority',
            confidence: 0.94,
          },
        ],
      },
    })

    expect(script?.speechPlan.segments.map(segment => segment.id)).toEqual([longSegmentIdA, longSegmentIdB])
    expect(script?.facePlan.speakingCues.map(cue => cue.segmentId)).toEqual([longSegmentIdA, longSegmentIdB])
    expect(script?.motionPlan.actionBursts.map(burst => burst.segmentId)).toEqual([longSegmentIdA, longSegmentIdB])
    expect(script?.lipsyncPlan.visemeHints?.map(hint => hint.segmentId)).toEqual([longSegmentIdA, longSegmentIdB])
  })

  it('preserves optional digital-life authority when embodimentScript crosses a normalize boundary', () => {
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-script-digital-life-authority',
      rendererTarget: 'live2d',
      replyText: '我先沿着这条生命线中性可见占位。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
        residentMode: 'measured-return',
      },
      speechPlan: {
        segments: [{
          id: 'segment-script-digital-life-authority',
          index: 0,
          text: '我先沿着这条生命线中性可见占位。',
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 320,
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 320,
      },
      facePlan: {
        speakingCues: [],
      },
      motionPlan: {
        idleBase: 'observe_soft',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-script-digital-life-authority',
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
          pitchDelta: -4,
          rateMultiplier: 0.91,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect'],
          signature: 'embodiment:script-digital-life-authority',
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.91,
          energy: 0.28,
          cadence: 0.24,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.22,
          energyBias: 0.18,
          mouthScale: 0.78,
          continuityHoldMs: 420,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.28,
          holdMs: 420,
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['CalmInspect'],
            signature: 'embodiment:script-digital-life-authority',
          },
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'hold',
          intensity: 0.12,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredMotionAliases: ['ObserveSoft'],
            signature: 'embodiment:script-digital-life-authority',
          },
        },
        motor: {},
        frames: [{
          id: 'segment-script-digital-life-authority',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条生命线中性可见占位。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.91,
            energy: 0.28,
            cadence: 0.24,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.22,
            energyBias: 0.18,
            mouthScale: 0.78,
            continuityHoldMs: 420,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.28,
            holdMs: 420,
            rendererHints: {
              residentMode: 'measured-return',
              preferredExpressionAliases: ['CalmInspect'],
              signature: 'embodiment:script-digital-life-authority',
            },
          },
          action: {
            actionCue: 'idle_settle',
            actionMode: 'hold',
            intensity: 0.12,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredMotionAliases: ['ObserveSoft'],
              signature: 'embodiment:script-digital-life-authority',
            },
          },
          motor: {},
        }],
      },
    })

    expect(script?.digitalLife).toEqual(expect.objectContaining({
      variationToken: 'turn-script-digital-life-authority',
      mode: 'recovering',
      speechStyle: {
        pitchDelta: -4,
        rateMultiplier: 0.91,
      },
      frames: [
        expect.objectContaining({
          id: 'segment-script-digital-life-authority',
          lipSync: expect.objectContaining({
            continuityHoldMs: 420,
          }),
          face: expect.objectContaining({
            rendererHints: expect.objectContaining({
              residentMode: 'measured-return',
              signature: 'embodiment:script-digital-life-authority',
            }),
          }),
          action: expect.objectContaining({
            rendererHints: expect.objectContaining({
              signature: 'embodiment:script-digital-life-authority',
            }),
          }),
        }),
      ],
    }))
  })

  it('normalizes the reviewed resident modes and rejects invalid lipsync authority blocks', () => {
    const idleRecovering = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-2',
      rendererTarget: 'live2d',
      replyText: '先休息一下。',
      state: {
        baseEmotion: 'tired',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'idle-recovering',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'hard-stop',
        preRollMs: 0,
        settleMs: 160,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'ambient',
      },
      lipsyncPlan: {
        mode: 'energy-only',
      },
    })

    const invalidLipSyncAuthority = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-2-invalid-lipsync',
      rendererTarget: 'live2d',
      replyText: '先休息一下。',
      state: {
        baseEmotion: 'tired',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'idle-recovering',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'hard-stop',
        preRollMs: 0,
        settleMs: 160,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'ambient',
      },
      lipsyncPlan: {
        mode: 'phoneme-only',
      },
    })

    expect(idleRecovering?.state.residentMode).toBe('idle-recovering')
    expect(idleRecovering?.lipsyncPlan.mode).toBe('energy-only')
    expect(invalidLipSyncAuthority).toBeNull()
  })

  it('accepts measured-return and repair-before-closeness as distinct companionship resident modes', () => {
    const measuredReturn = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-measured-return',
      rendererTarget: 'live2d',
      replyText: '我先轻一点接着这条线。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
        residentMode: 'measured-return',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'soft-settle',
        preRollMs: 0,
        settleMs: 220,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-only',
      },
    })

    const repairBeforeCloseness = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-repair-before-closeness',
      rendererTarget: 'live2d',
      replyText: '我先把这一下稳住，再慢慢接近。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
        residentMode: 'repair-before-closeness',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'soft-settle',
        preRollMs: 0,
        settleMs: 220,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-only',
      },
    })

    expect(measuredReturn?.state.residentMode).toBe('measured-return')
    expect(repairBeforeCloseness?.state.residentMode).toBe('repair-before-closeness')
  })

  it('preserves quiet-accompaniment as a low-pressure same-her resident mode', () => {
    const quietAccompaniment = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-quiet-accompaniment',
      rendererTarget: 'vrm',
      replyText: '我先安静陪在这里。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
        residentMode: 'quiet-accompaniment',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'soft-settle',
        preRollMs: 0,
        settleMs: 220,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'ambient',
      },
      lipsyncPlan: {
        mode: 'energy-only',
      },
    })

    expect(quietAccompaniment?.state.residentMode).toBe('quiet-accompaniment')
  })

  it('accepts same-thread-continuation as a resident carry mode', () => {
    const sameThreadContinuation = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-same-thread-continuation',
      rendererTarget: 'live2d',
      replyText: '我继续沿着刚才那条线陪着你往下走。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
        residentMode: 'same-thread-continuation',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'soft-settle',
        preRollMs: 0,
        settleMs: 220,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-only',
      },
    })

    expect(sameThreadContinuation?.state.residentMode).toBe('same-thread-continuation')
  })

  it('preserves null cue semantics for face and motion entries when the rest of the entry is valid', () => {
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-null-cues',
      rendererTarget: 'live2d',
      replyText: '先别着急。',
      state: {
        baseEmotion: 'concerned',
        delivery: 'gentle',
        emphasis: 1,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [{
          id: 'segment-1',
          index: 0,
          text: '先别着急。',
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 220,
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
      },
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-1',
          emotion: 'concerned',
          facialCue: null,
          intensity: 0.4,
          holdMs: 180,
          preUtteranceCue: null,
          postUtteranceCue: null,
          source: 'prosody-authority',
          confidence: 0.72,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: null,
          intensity: 0.2,
          holdMs: 180,
          source: 'timeline-projection',
          confidence: 0.72,
        }],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-only',
      },
    })

    expect(script?.facePlan.speakingCues[0]?.facialCue).toBeNull()
    expect(script?.motionPlan.actionBursts[0]?.actionCue).toBeNull()
  })

  it('preserves cue-bridge as an embodiment source when renderer authority rejoins a carried segment', () => {
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-cue-bridge',
      rendererTarget: 'vrm',
      replyText: '我把刚才那段动作和表情桥回同一个身体。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
        residentMode: 'same-thread-continuation',
      },
      speechPlan: {
        segments: [{
          id: 'segment-cue-bridge-1',
          index: 0,
          text: '我把刚才那段动作和表情桥回同一个身体。',
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 220,
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
      },
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-cue-bridge-1',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.4,
          holdMs: 180,
          preUtteranceCue: null,
          postUtteranceCue: null,
          source: 'cue-bridge',
          confidence: 0.72,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [{
          segmentId: 'segment-cue-bridge-1',
          actionCue: 'observe_focus',
          intensity: 0.2,
          holdMs: 180,
          source: 'cue-bridge',
          confidence: 0.72,
        }],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-only',
      },
    })

    expect(script?.facePlan.speakingCues[0]?.source).toBe('cue-bridge')
    expect(script?.motionPlan.actionBursts[0]?.source).toBe('cue-bridge')
  })

  it('rejects malformed nested plan blocks instead of normalizing a plausible authority payload', () => {
    const missingSpeechPlan = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-missing-speech',
      rendererTarget: 'live2d',
      replyText: '你好',
      state: {
        baseEmotion: 'neutral',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'dialogue',
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: { mode: 'energy-only' },
    })

    const malformedFacePlan = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-bad-face',
      rendererTarget: 'live2d',
      replyText: '你好',
      state: {
        baseEmotion: 'neutral',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'hard-stop',
        preRollMs: 0,
        settleMs: 160,
      },
      facePlan: {
        speakingCues: 'bad-data',
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: { mode: 'energy-only' },
    } as any)

    const malformedLipSyncPlan = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-bad-lipsync',
      rendererTarget: 'live2d',
      replyText: '你好',
      state: {
        baseEmotion: 'neutral',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'hard-stop',
        preRollMs: 0,
        settleMs: 160,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: null,
    })

    expect(missingSpeechPlan).toBeNull()
    expect(malformedFacePlan).toBeNull()
    expect(malformedLipSyncPlan).toBeNull()
  })

  it('threads embodimentScript through the shared derived-mind payload normalization', () => {
    const state = normalizeAlicizationDerivedMindStateBundle({
      source: 'browser-fallback',
      producedAt: 1,
      visualPresenceState: {
        watchMode: 'symbiotic-vision',
        updatedAt: 1,
      },
      structured: {
        format: 'mind-turn-v1',
        thought: 'focus',
        emotion: 'neutral',
        reply: '你好',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        embodimentScript: {
          version: 'embodiment-script-v1',
          decisionTraceId: 'trace-structured-1',
          turnId: 'turn-1',
          rendererTarget: 'live2d',
          replyText: '你好',
          state: {
            baseEmotion: 'neutral',
            delivery: 'calm',
            emphasis: 0,
            residentMode: 'idle-recovering',
          },
          speechPlan: {
            segments: [],
            interruptPolicy: 'hard-stop',
            preRollMs: 0,
            settleMs: 160,
          },
          facePlan: {
            preUtteranceCue: 'breathe-in',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-1',
              actionCue: 'comfort_sway',
              intensity: 0.4,
              holdMs: 260,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: { mode: 'energy-only' },
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          sessionId: 'session-1',
          turnId: 'turn-1',
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '你好',
            actionCue: 'comfort_sway',
            facialCue: 'eyes-soften',
            emphasis: 0,
            emotion: 'neutral',
            voice: {
              provider: null,
              model: null,
              voiceId: null,
              voiceName: null,
              rateMultiplier: 0.96,
              pitchDelta: 0,
              cadence: 0.54,
            },
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
            },
          }],
        },
        digitalLife: {
          version: 'digital-life-v1',
          mode: 'thinking',
          preferredPresence: 'attentive',
          action: {
            actionCue: 'comfort_sway',
            actionMode: 'hold',
            rendererHints: {
              residentMode: 'measured-return',
            },
          },
          performance: {
            baseEmotion: 'neutral',
            emotion: 'neutral',
            facialCue: 'eyes-soften',
            actionCue: 'comfort_sway',
            delivery: 'calm',
            emphasis: 0,
          },
          frames: [],
        },
        digitalLifeSpine: {
          continuitySignal: {
            kind: 'same-thread-return',
            summary: 'thread=same callback line',
            confidence: 0.82,
            createdAt: 1,
          },
          proactive: {
            preferredStyle: 'silent-observe',
            shouldSpeak: false,
            continuityRestraint: 'measured-return',
            personaBias: 'room-first',
          },
        },
      },
    } as any)

    expect(state?.structured?.embodimentScript?.version).toBe('embodiment-script-v1')
    expect(state?.structured?.embodimentScript?.decisionTraceId).toBe('trace-structured-1')
    expect(state?.structured?.embodimentScript?.state.residentMode).toBe('idle-recovering')
    expect(state?.structured?.embodimentScript?.facePlan.preUtteranceCue).toBe('breathe-in')
    expect(state?.structured?.embodimentScript?.motionPlan.actionBursts[0]?.holdMs).toBe(260)
    expect(state?.structured?.speechTimeline?.version).toBe('speech-timeline-v1')
    expect(state?.structured?.speechTimeline?.segments[0]?.rendererHints?.residentMode).toBe('measured-return')
    expect(state?.structured?.digitalLife?.mode).toBe('thinking')
    expect(state?.structured?.digitalLife?.action?.rendererHints?.residentMode).toBe('measured-return')
    expect(state?.structured?.digitalLifeSpine?.proactive?.continuityRestraint).toBe('measured-return')
  })

  it('preserves measured-return renderer cadence preferences on script state and speech segments', () => {
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-measured-return-renderer-preferences',
      rendererTarget: 'live2d',
      replyText: '我会慢一点，把这条线轻轻接回来。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
        residentMode: 'measured-return',
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
          preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
          preferredMotionAliases: ['idle_settle', 'stillness_guard'],
        },
      },
      speechPlan: {
        segments: [{
          id: 'segment-measured-return-renderer-preferences-1',
          index: 0,
          text: '我会慢一点，把这条线轻轻接回来。',
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 220,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
            preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
            preferredMotionAliases: ['idle_settle', 'stillness_guard'],
          },
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
      },
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-measured-return-renderer-preferences-1',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.4,
          holdMs: 180,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          source: 'prosody-authority',
          confidence: 0.82,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [{
          segmentId: 'segment-measured-return-renderer-preferences-1',
          actionCue: 'idle_settle',
          intensity: 0.2,
          holdMs: 180,
          source: 'timeline-projection',
          confidence: 0.78,
        }],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
      },
    })

    expect(script?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expect(script?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
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
