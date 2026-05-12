import { describe, expect, it } from 'vitest'

import { reconcileEmbodimentPlayback } from './playback-reconciler'

describe('playback reconciler', () => {
  it('extends settle timing when actual playback exceeds the estimate', () => {
    const result = reconcileEmbodimentPlayback({
      plannedDurationMs: 900,
      actualDurationMs: 1280,
      stopReason: 'ended',
      script: {
        version: 'embodiment-script-v1',
        turnId: 'turn-1',
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
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 180,
        },
        facePlan: { speakingCues: [] },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: { mode: 'energy-only' },
      },
    })

    expect(result.settleMs).toBeGreaterThanOrEqual(180)
    expect(result.driftMs).toBe(380)
  })
})
