import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentSpeechPlan } from './speech-planner'

describe('speech planner prosody', () => {
  it('classifies chinese punctuation into phrase-level pause intent', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-prosody',
      replyText: '先看这里，然后点保存。最后告诉我结果。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-prosody',
        reply: '先看这里，然后点保存。最后告诉我结果。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 5,
            text: '先看这里，',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: null,
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 5,
            endOffset: 11,
            text: '然后点保存。',
            gestureWeight: 0.28,
            facialWeight: 0.38,
            prosodyWeight: 0.62,
            beatWeight: 0.42,
            actionCue: null,
            facialCue: 'focused',
            actionWindow: 'cadence-peak',
            interruptMode: 'soft-interrupt',
          },
        ],
      },
      digitalLife: null,
    })

    expect(plan.segments[0]?.prosody?.pauseClass).toBe('comma')
    expect(plan.segments[0]?.prosody?.phraseBoundary).toBe('soft')
    expect(plan.segments[1]?.prosody?.pauseClass).toBe('full-stop')
    expect(plan.segments[1]?.prosody?.phraseBoundary).toBe('hard')
  })
})
