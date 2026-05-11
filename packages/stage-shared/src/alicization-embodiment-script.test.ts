import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationEmbodimentScript,
} from './index'

describe('alicization embodiment script', () => {
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
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [{
          segmentId: 'segment-1',
          actionCue: 'comfort_sway',
          intensity: 0.55,
          holdMs: 420,
        }],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [{
          segmentId: 'segment-1',
          viseme: 'A',
          weight: 0.8,
        }],
      },
    })

    expect(script?.decisionTraceId).toBe('trace-1')
    expect(script?.rendererTarget).toBe('live2d')
    expect(script?.state.residentMode).toBe('quiet-companionship')
    expect(script?.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(script?.facePlan.postUtteranceCue).toBe('settle-smile')
    expect(script?.speechPlan.segments[0]?.interruptPolicy).toBe('soft-settle')
    expect(script?.motionPlan.actionBursts[0]?.holdMs).toBe(420)
    expect(script?.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
  })

  it('normalizes the reviewed resident modes and restricts lipsync mode to task-1 values', () => {
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
        mode: 'phoneme-only',
      },
    })

    expect(idleRecovering?.state.residentMode).toBe('idle-recovering')
    expect(idleRecovering?.lipsyncPlan.mode).toBe('energy-only')
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
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: { mode: 'energy-only' },
        },
      },
    } as any)

    expect(state?.structured?.embodimentScript?.version).toBe('embodiment-script-v1')
    expect(state?.structured?.embodimentScript?.decisionTraceId).toBe('trace-structured-1')
    expect(state?.structured?.embodimentScript?.state.residentMode).toBe('idle-recovering')
    expect(state?.structured?.embodimentScript?.facePlan.preUtteranceCue).toBe('breathe-in')
    expect(state?.structured?.embodimentScript?.motionPlan.actionBursts[0]?.holdMs).toBe(260)
  })
})
