import { describe, expect, it } from 'vitest'

import { resolveLive2DFaceDriverState } from './drivers/live2d-face-driver'
import { resolveLive2DLipSyncDriverState } from './drivers/live2d-lipsync-driver'
import { resolveLive2DMotionDriverState } from './drivers/live2d-motion-driver'
import { shouldRunLive2dLipSyncLoop } from './runtime'

describe('shouldRunLive2dLipSyncLoop', () => {
  it('runs only for live2d while not paused', () => {
    expect(shouldRunLive2dLipSyncLoop({ stageModelRenderer: 'live2d', paused: false })).toBe(true)
    expect(shouldRunLive2dLipSyncLoop({ stageModelRenderer: 'live2d', paused: true })).toBe(false)
    expect(shouldRunLive2dLipSyncLoop({ stageModelRenderer: 'vrm', paused: false })).toBe(false)
  })
})

describe('live2d embodiment drivers', () => {
  const script = {
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
      }],
    },
    motionPlan: {
      idleBase: 'idle_settle',
      actionBursts: [{
        segmentId: 'segment-1',
        actionCue: 'wave',
        intensity: 0.7,
        holdMs: 320,
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
    }))
  })

  it('routes pre and post utterance timing through the live2d face driver', () => {
    expect(resolveLive2DFaceDriverState({
      script,
      segmentId: 'segment-1',
      idleCuePhase: 'pre-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'soft-breath',
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'settle-smile',
    }))

    expect(resolveLive2DFaceDriverState({
      script,
      segmentId: 'segment-1',
      idleCuePhase: 'post-utterance',
      playbackPhase: 'idle',
    })).toEqual(expect.objectContaining({
      facialCue: 'settle-smile',
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
      facialCue: 'soft-breath',
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

  it('resolves live2d motion cues from the embodiment script', () => {
    expect(resolveLive2DMotionDriverState({
      script,
      segmentId: 'segment-1',
      playbackPhase: 'playing',
    })).toEqual(expect.objectContaining({
      idleBase: 'idle_settle',
      actionCue: 'wave',
      holdMs: 320,
    }))
  })
})
