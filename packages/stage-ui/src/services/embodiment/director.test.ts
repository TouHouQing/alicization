import type { AlicizationResidentPerformanceSnapshot } from '../../stores/alicization-bridge'
import type { BuildAlicizationEmbodimentScriptInput } from './director'

import { createIdleStageEmbodimentMotorState } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

function createSeed(overrides?: Partial<{
  decisionTraceId: string | null
  turnId: string
  replyText: string
  residentMode: 'speaking' | 'recovering'
}>): BuildAlicizationEmbodimentScriptInput['seed'] {
  return {
    decisionTraceId: overrides?.decisionTraceId ?? 'trace-1',
    turnId: overrides?.turnId ?? 'turn-1',
    replyText: overrides?.replyText ?? '你好，我们慢慢来。',
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
          postureHint: 'concerned' as const,
          performance: {
            baseEmotion: 'concerned' as const,
            emotion: 'concerned' as const,
            facialCue: null,
            actionCue: null,
            delivery: 'gentle' as const,
            emphasis: 1 as const,
          },
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 1,
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
          motor: createIdleStageEmbodimentMotorState(),
          frames: [],
        }
      : null,
    digitalLifeSpine: null,
  }
}

function createResidentPerformance(source: 'main-runtime' | 'browser-fallback'): AlicizationResidentPerformanceSnapshot {
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

  it('creates per-segment face and motion cues for multi-segment chinese guidance turns', () => {
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
              emotion: 'thinking',
              gestureWeight: 0.24,
              facialWeight: 0.38,
              prosodyWeight: 0.42,
              beatWeight: 0.48,
              facialHoldMs: 360,
              actionHoldMs: 140,
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
              emotion: 'happy',
              gestureWeight: 0.36,
              facialWeight: 0.54,
              prosodyWeight: 0.46,
              beatWeight: 0.52,
              facialHoldMs: 420,
              actionHoldMs: 180,
              actionCue: 'idle_gentle_nod',
              facialCue: 'reassure_smile',
              actionWindow: 'cadence-peak',
              interruptMode: 'soft-interrupt',
            },
          ],
        },
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking', 'happy'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.facePlan.speakingCues.map(cue => cue.segmentId)).toEqual(['segment-1', 'segment-2'])
    expect(script.facePlan.speakingCues.map(cue => cue.facialCue)).toEqual(['focused', 'reassure_smile'])
    expect(script.facePlan.speakingCues.map(cue => cue.emotion)).toEqual(['thinking', 'happy'])
    expect(script.facePlan.speakingCues.map(cue => cue.source)).toEqual(['prosody-authority', 'prosody-authority'])
    expect(script.facePlan.speakingCues.map(cue => cue.confidence)).toEqual([0.94, 0.94])
    expect(script.motionPlan.actionBursts.map(burst => burst.segmentId)).toEqual(['segment-1', 'segment-2'])
    expect(script.motionPlan.actionBursts.map(burst => burst.actionCue)).toEqual(['point_screen', 'idle_gentle_nod'])
    expect(script.motionPlan.actionBursts.map(burst => burst.source)).toEqual(['timeline-projection', 'timeline-projection'])
    expect(script.motionPlan.actionBursts.map(burst => burst.confidence)).toEqual([0.88, 0.88])
    expect(script.speechPlan.segments[0]?.settleMs).toBeGreaterThan(140)
    expect(script.speechPlan.segments[1]?.settleMs).toBeGreaterThan(180)
    expect(script.motionPlan.actionBursts[0]?.holdMs).toBe(140)
    expect(script.motionPlan.actionBursts[1]?.holdMs).toBe(180)
  })
})
