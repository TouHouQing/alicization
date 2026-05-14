import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

const guidancePerformance = {
  baseEmotion: 'thinking' as const,
  emotion: 'thinking' as const,
  facialCue: 'focused' as const,
  actionCue: 'point_screen' as const,
  delivery: 'gentle' as const,
  emphasis: 2 as const,
}

function createVisemeSeed(replyText: string, segmentText: string) {
  return {
    decisionTraceId: 'trace-viseme',
    turnId: 'turn-viseme',
    replyText,
    performance: guidancePerformance,
    embodiment: null,
    speechTimeline: {
      version: 'speech-timeline-v1' as const,
      variationToken: 'turn-viseme',
      reply: replyText,
      emotion: 'thinking' as const,
      segments: [
        {
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: segmentText.length,
          text: segmentText,
          emotion: 'thinking' as const,
          gestureWeight: 0.42,
          facialWeight: 0.58,
          prosodyWeight: 0.76,
          beatWeight: 0.69,
          facialHoldMs: 360,
          actionHoldMs: 180,
          actionCue: 'point_screen' as const,
          facialCue: 'focused' as const,
          actionWindow: 'segment-start' as const,
          interruptMode: 'soft-interrupt' as const,
        },
      ],
    },
    digitalLife: null,
    digitalLifeSpine: null,
  }
}

describe('director viseme hints', () => {
  it('derives authoritative viseme hints from a Chinese guidance segment', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: createVisemeSeed('先看这里，', '先看这里，'),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(script.lipsyncPlan.visemeHints).toBeDefined()
    expect(script.lipsyncPlan.visemeHints).not.toHaveLength(0)
    expect(script.lipsyncPlan.visemeHints?.every(hint => hint.segmentId === 'segment-1')).toBe(true)
    expect(script.lipsyncPlan.visemeHints?.some(hint => hint.source === 'prosody-authority')).toBe(true)
    expect(script.lipsyncPlan.visemeHints?.every(hint => hint.confidence >= 0 && hint.confidence <= 1)).toBe(true)
    expect(script.lipsyncPlan.visemeHints?.some(hint => hint.viseme === 'closed')).toBe(true)
  })

  it('uses softer closed-viseme pressure for comma pauses than for full-stop closures', () => {
    const commaScript = buildAlicizationEmbodimentScript({
      seed: createVisemeSeed('先看这里，', '先看这里，'),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })
    const fullStopScript = buildAlicizationEmbodimentScript({
      seed: createVisemeSeed('先看这里。', '先看这里。'),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    const commaClosed = commaScript.lipsyncPlan.visemeHints?.find(hint => hint.segmentId === 'segment-1' && hint.viseme === 'closed')
    const fullStopClosed = fullStopScript.lipsyncPlan.visemeHints?.find(hint => hint.segmentId === 'segment-1' && hint.viseme === 'closed')

    expect(commaClosed).toBeDefined()
    expect(fullStopClosed).toBeDefined()
    expect(fullStopClosed?.weight).toBeGreaterThan(commaClosed?.weight ?? -1)
  })
})
