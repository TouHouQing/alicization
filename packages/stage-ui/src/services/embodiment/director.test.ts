import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

function createSeed(overrides?: Partial<{
  decisionTraceId: string | null
  turnId: string
  replyText: string
  residentMode: 'speaking' | 'recovering'
}>){
  return {
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    replyText: '你好，我们慢慢来。',
    performance: {
      baseEmotion: 'concerned',
      emotion: 'concerned',
      facialCue: null,
      actionCue: null,
      delivery: 'gentle',
      emphasis: 1,
    },
    embodiment: null,
    speechTimeline: null,
    digitalLife: overrides?.residentMode
      ? {
          version: 'digital-life-v1' as const,
          variationToken: 'life-1',
          emotion: 'concerned' as const,
          mode: overrides.residentMode,
          postureHint: 'speaking' as const,
          performance: {
            baseEmotion: 'concerned' as const,
            emotion: 'concerned' as const,
            facialCue: null,
            actionCue: null,
            delivery: 'gentle' as const,
            emphasis: 1 as const,
          },
          speechStyle: {
            voiceName: 'default',
            pitchDelta: 0,
            rateMultiplier: 1,
            stylePrompt: 'gentle',
          },
          voice: {
            pitchDelta: 0,
            rateMultiplier: 1,
            energy: 0.5,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'energy',
            visemeBias: 0.5,
            energyBias: 0.5,
            mouthScale: 1,
            continuityHoldMs: 120,
          },
          face: {
            emotion: 'concerned' as const,
            facialCue: null,
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 120,
          },
          action: {
            actionCue: null,
            actionMode: 'none',
            intensity: 0.2,
            holdMs: 120,
          },
          motor: {
            emotion: 'concerned',
            expression: 'neutral',
            action: 'idle',
            intensity: 0.5,
            mouthOpen: 0,
            gazeTarget: null,
          },
          frames: [],
        }
      : null,
    digitalLifeSpine: null,
    ...overrides,
  }
}

function createResidentPerformance(source: 'main-runtime' | 'browser-fallback') {
  return {
    version: 'resident-performance-v1' as const,
    source,
    performance: {
      baseEmotion: 'concerned' as const,
      emotion: 'concerned' as const,
      facialCue: null,
      actionCue: null,
      delivery: 'gentle' as const,
      emphasis: 1 as const,
    },
    embodiedPresence: 'concerned' as const,
    stance: 'care' as const,
    emotionalTension: 'soft-covision' as const,
    confidence: 0.8,
    reasonTags: ['care'],
    signature: `resident-${source}`,
    updatedAt: 1,
  }
}

describe('embodiment director', () => {
  it('produces one normalized live2d script from the local seed shape and preserves decision trace id', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: createSeed(),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.version).toBe('embodiment-script-v1')
    expect(script.decisionTraceId).toBe('trace-1')
    expect(script.rendererTarget).toBe('live2d')
    expect(script.speechPlan.interruptPolicy).toBeDefined()
  })

  it('uses corrected resident source semantics for quiet companionship and keeps recovering digital life authoritative', () => {
    const quietScript = buildAlicizationEmbodimentScript({
      seed: createSeed({ decisionTraceId: 'trace-main-runtime' }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createResidentPerformance('main-runtime'),
      rendererTarget: 'live2d',
    })
    const recoveringScript = buildAlicizationEmbodimentScript({
      seed: createSeed({
        decisionTraceId: 'trace-recovering',
        residentMode: 'recovering',
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createResidentPerformance('browser-fallback'),
      rendererTarget: 'live2d',
    })

    expect(quietScript.state.residentMode).toBe('quiet-companionship')
    expect(recoveringScript.state.residentMode).toBe('idle-recovering')
  })

  it('preserves multi-segment speech timing from the provided speechTimeline', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed(),
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-1',
          reply: '先看这里。然后点保存。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 5,
              text: '先看这里。',
              gestureWeight: 0.2,
              facialWeight: 0.3,
              prosodyWeight: 0.4,
              beatWeight: 0.5,
              actionCue: 'point_screen',
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
              gestureWeight: 0.1,
              facialWeight: 0.2,
              prosodyWeight: 0.3,
              beatWeight: 0.4,
              actionCue: 'idle_gentle_nod',
              facialCue: 'focused',
              actionWindow: 'cadence-peak',
              interruptMode: 'hard-interrupt',
            },
          ],
        },
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.speechPlan.segments).toHaveLength(2)
    expect(script.speechPlan.segments.map(segment => segment.id)).toEqual(['segment-1', 'segment-2'])
    expect(script.speechPlan.interruptPolicy).toBe('hard-stop')
  })
})
