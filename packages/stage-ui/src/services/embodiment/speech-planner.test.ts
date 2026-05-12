import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentSpeechPlan } from './speech-planner'

describe('embodiment speech planner', () => {
  it('upgrades a descriptive speech timeline into executable segment policies', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-1',
      replyText: '你好，我们慢慢来。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '你好，我们慢慢来。',
        emotion: 'concerned',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 8,
          text: '你好，我们慢慢来。',
          gestureWeight: 0.44,
          facialWeight: 0.52,
          prosodyWeight: 0.48,
          beatWeight: 0.36,
          actionCue: 'idle_gentle_nod',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      },
      digitalLife: null,
    })

    expect(plan.segments[0]?.interruptPolicy).toBe('soft-settle')
    expect(plan.segments[0]?.settleMs).toBeGreaterThan(0)
  })
})
