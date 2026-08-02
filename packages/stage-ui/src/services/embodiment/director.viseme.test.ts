import type { BuildAlicizationEmbodimentScriptInput } from './director'

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

function createVisemeSeed(replyText: string, segmentText: string): BuildAlicizationEmbodimentScriptInput['seed'] {
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

function buildLive2dScript(seed: BuildAlicizationEmbodimentScriptInput['seed']) {
  return buildAlicizationEmbodimentScript({
    seed,
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
}

describe('director viseme hints', () => {
  it('derives authoritative viseme hints from a Chinese guidance segment', () => {
    const script = buildLive2dScript(createVisemeSeed('先看这里，', '先看这里，'))

    expect(script.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(script.lipsyncPlan.visemeHints).toEqual([
      { segmentId: 'segment-1', viseme: 'closed', weight: 0.51, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-1', viseme: 'O', weight: 0.32, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-1', viseme: 'E', weight: 0.34, source: 'prosody-authority', confidence: 0.94 },
    ])
  })

  it('uses softer closed-viseme pressure for comma pauses than for full-stop closures', () => {
    const commaScript = buildLive2dScript(createVisemeSeed('先看这里，', '先看这里，'))
    const fullStopScript = buildLive2dScript(createVisemeSeed('先看这里。', '先看这里。'))

    const commaClosed = commaScript.lipsyncPlan.visemeHints?.find(hint =>
      hint.segmentId === 'segment-1' && hint.viseme === 'closed',
    )
    const fullStopClosed = fullStopScript.lipsyncPlan.visemeHints?.find(hint =>
      hint.segmentId === 'segment-1' && hint.viseme === 'closed',
    )

    expect(commaClosed).toBeDefined()
    expect(fullStopClosed).toBeDefined()
    expect(fullStopClosed?.weight).toBeGreaterThan(commaClosed?.weight ?? -1)
  })

  it('keeps fallback speech-plan synthesis free of prosody-authority viseme hints', () => {
    const script = buildLive2dScript({
      ...createVisemeSeed('你好，我们慢慢来。', '你好，我们慢慢来。'),
      speechTimeline: null,
    })

    expect(script.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(script.lipsyncPlan.visemeHints).toBeUndefined()
  })
})
