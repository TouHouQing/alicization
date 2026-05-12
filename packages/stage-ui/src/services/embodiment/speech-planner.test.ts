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
    expect(plan.segments[0]?.prosody).toEqual({
      language: 'zh-CN',
      pauseClass: 'full-stop',
      phraseBoundary: 'hard',
      contour: 'falling',
      emphasisWord: '慢慢',
      emphasisStrength: 0.48,
      tempoShift: -0.08,
    })
  })

  it('derives neutral chinese-first prosody for fallback segments without a speech timeline', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-fallback',
      replyText: '先继续',
      speechTimeline: null,
      digitalLife: null,
    })

    expect(plan.segments).toHaveLength(1)
    expect(plan.segments[0]?.prosody).toEqual({
      language: 'zh-CN',
      pauseClass: 'none',
      phraseBoundary: 'none',
      contour: 'flat',
      emphasisWord: '继续',
      emphasisStrength: 0.49,
      tempoShift: 0,
    })
  })
})
