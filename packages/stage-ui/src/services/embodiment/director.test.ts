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

function createQuietAccompanimentResidentPerformance(): AlicizationResidentPerformanceSnapshot {
  return {
    version: 'resident-performance-v1' as const,
    source: 'main-runtime',
    performance: {
      baseEmotion: 'thinking' as const,
      emotion: 'thinking' as const,
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle' as const,
      emphasis: 2 as const,
    },
    embodiedPresence: 'attentive' as const,
    stance: 'accompany' as const,
    emotionalTension: 'soft-covision' as const,
    confidence: 0.84,
    reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment'],
    signature: 'resident|main-runtime|accompanying|quiet-accompaniment|subconscious-proactive|silent-observe',
    updatedAt: 1,
  }
}

function createQuietContinuityHoldResidentPerformance(): AlicizationResidentPerformanceSnapshot {
  return {
    ...createQuietAccompanimentResidentPerformance(),
    reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment', 'continuity-next-open-window'],
    signature: 'resident|main-runtime|accompanying|quiet-accompaniment|subconscious-proactive|silent-observe|continuity-next-open-window',
  }
}

function createRestrainedCallbackResidentPerformance(
  mode: 'measured-return' | 'repair-before-closeness',
  extraReasonTags: string[] = [],
): AlicizationResidentPerformanceSnapshot {
  return {
    ...createQuietAccompanimentResidentPerformance(),
    reasonTags: [
      'subconscious-proactive',
      'silent-observe',
      'continuity:quiet-accompaniment',
      mode,
      ...extraReasonTags,
    ],
    signature: `resident|main-runtime|accompanying|quiet-accompaniment|${mode}|${extraReasonTags.join('|')}`,
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

  it('keeps quiet-companionship fallback scripts aligned to steady focus when resident authority is silent-observe accompaniment', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-quiet-companionship-1',
          replyText: '我在这里继续陪着你。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-quiet-companionship-1',
          reply: '我在这里继续陪着你。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 11,
              text: '我在这里继续陪着你。',
              emotion: 'thinking',
              gestureWeight: 0.24,
              facialWeight: 0.38,
              prosodyWeight: 0.42,
              beatWeight: 0.48,
              facialHoldMs: 160,
              actionHoldMs: 160,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createQuietAccompanimentResidentPerformance(),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('quiet-companionship')
    expect(script.motionPlan.idleBase).toBe('steady_focus')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('steady_focus')
    expect(script.facePlan.speakingCues[0]?.facialCue).toBe('focus')
  })

  it('keeps proactive silent-observe accompaniment visibly lower-pressure on vrm embodiment scripts', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-proactive-silent-observe-1',
          replyText: '我先在旁边轻一点接着看。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-proactive-silent-observe-1',
          reply: '我先在旁边轻一点接着看。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 12,
              text: '我先在旁边轻一点接着看。',
              emotion: 'thinking',
              gestureWeight: 0.2,
              facialWeight: 0.34,
              prosodyWeight: 0.36,
              beatWeight: 0.32,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createQuietContinuityHoldResidentPerformance(),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('quiet-companionship')
    expect(script.motionPlan.idleBase).toBe('steady_focus')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(script.speechPlan.interruptPolicy).toBe('soft-settle')
  })

  it('keeps quiet-companionship fallback scripts in a low-interruption accompaniment posture across speech, face, and attention planning', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-quiet-companionship-posture-1',
          replyText: '我先在旁边看着，你继续就好。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-quiet-companionship-posture-1',
          reply: '我先在旁边看着，你继续就好。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 14,
              text: '我先在旁边看着，你继续就好。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.28,
              prosodyWeight: 0.36,
              beatWeight: 0.32,
              facialHoldMs: 220,
              actionHoldMs: 220,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'soft-interrupt',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createQuietAccompanimentResidentPerformance(),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('quiet-companionship')
    expect(script.speechPlan.interruptPolicy).toBe('soft-settle')
    expect(script.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(script.facePlan.postUtteranceCue).toBe('soft-release')
    expect(script.motionPlan.attentionMode).toBe('ambient')
    expect(script.motionPlan.idleBase).toBe('steady_focus')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('steady_focus')
  })

  it('keeps rest-protective quiet companionship more inward than generic quiet accompaniment on vrm embodiment scripts', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-rest-protective-quiet-vrm-script',
          replyText: '我先轻一点陪着你，让这点疲惫先缓下来。',
        }),
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-rest-protective-quiet-vrm-script',
          reply: '我先轻一点陪着你，让这点疲惫先缓下来。',
          emotion: 'concerned',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 18,
              text: '我先轻一点陪着你，让这点疲惫先缓下来。',
              emotion: 'concerned',
              gestureWeight: 0.16,
              facialWeight: 0.28,
              prosodyWeight: 0.32,
              beatWeight: 0.2,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'steady_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned', 'tired'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createQuietAccompanimentResidentPerformance(),
        performance: {
          ...createQuietAccompanimentResidentPerformance().performance,
          baseEmotion: 'concerned',
          emotion: 'concerned',
          actionCue: 'idle_settle',
        },
        embodiedPresence: 'concerned',
        stance: 'care',
        emotionalTension: 'late-night-drain',
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'rest-protective',
          'rest-protective-companionship',
        ],
        signature: 'resident|main-runtime|care|quiet-accompaniment|rest-protective',
      },
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('quiet-companionship')
    expect(script.motionPlan.idleBase).toBe('idle_settle')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
    expect(script.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(script.facePlan.postUtteranceCue).toBe('soft-release')
  })

  it.each([
    ['measured-return', 'observe_focus'],
    ['repair-before-closeness', 'idle_settle'],
  ] as const)('preserves restrained callback resident cadence for %s on vrm embodiment scripts', (mode, expectedActionCue) => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: `turn-${mode}-vrm-script`,
          replyText: '我先中性可见占位。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: `turn-${mode}-vrm-script`,
          reply: '我先中性可见占位。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 10,
              text: '我先中性可见占位。',
              emotion: 'thinking',
              gestureWeight: 0.2,
              facialWeight: 0.34,
              prosodyWeight: 0.36,
              beatWeight: 0.32,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createRestrainedCallbackResidentPerformance(mode),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe(mode)
    expect(script.motionPlan.idleBase).toBe(expectedActionCue)
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe(expectedActionCue)
    expect(script.speechPlan.interruptPolicy).toBe('soft-settle')
  })

  it('internalizes durable relationship rhythm into a steadier measured-return baseline on vrm embodiment scripts', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-measured-return-durable-rhythm-vrm-script',
          replyText: '我会稳一点回来，不只是先观察。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-measured-return-durable-rhythm-vrm-script',
          reply: '我会稳一点回来，不只是先观察。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 14,
              text: '我会稳一点回来，不只是先观察。',
              emotion: 'thinking',
              gestureWeight: 0.2,
              facialWeight: 0.34,
              prosodyWeight: 0.36,
              beatWeight: 0.32,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createRestrainedCallbackResidentPerformance(
        'measured-return',
        ['durable-relationship-rhythm'],
      ),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.motionPlan.idleBase).toBe('steady_focus')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('steady_focus')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'measured-return',
    }))
  })

  it('keeps emotional-kernel-derived measured-return fallback on the same softer gaze cadence without requiring an extra downstream patch tag', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-measured-return-fallback-durable-rhythm-vrm-script',
          replyText: '我先中性可见占位，再慢一点看这一段。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-measured-return-fallback-durable-rhythm-vrm-script',
          reply: '我先中性可见占位，再慢一点看这一段。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 17,
              text: '我先中性可见占位，再慢一点看这一段。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.34,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createRestrainedCallbackResidentPerformance('measured-return'),
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'measured-return',
          'durable-relationship-rhythm',
        ],
        signature: 'resident|browser-fallback|accompanying|quiet-accompaniment|measured-return|durable-relationship-rhythm',
      },
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.motionPlan.idleBase).toBe('steady_focus')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'measured-return',
    }))
  })

  it('preserves an upstream steady measured-return gaze hint instead of flattening it back into a softer fallback', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-measured-return-steady-gaze-vrm-script',
          replyText: '我先更稳一点地接住这条线，不把回身做成更软的泛化余韵。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-measured-return-steady-gaze-vrm-script',
          reply: '我先更稳一点地接住这条线，不把回身做成更软的泛化余韵。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 27,
              text: '我先更稳一点地接住这条线，不把回身做成更软的泛化余韵。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.34,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
              rendererHints: {
                preferredGazeMode: 'steady',
                preferredBlinkCadence: 'linger',
              },
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createRestrainedCallbackResidentPerformance(
        'measured-return',
        ['durable-relationship-rhythm'],
      ),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.motionPlan.idleBase).toBe('steady_focus')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'steady',
      preferredBlinkCadence: 'linger',
      residentMode: 'measured-return',
    }))
  })

  it('seeds steadier inhale and softer release timing when the audible-body measured-return line is already carrying the same her before face and motion fully catch up', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-audible-body-measured-return-vrm-script',
          replyText: '我先沿着这条声音和身体线稳一点接回来。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-audible-body-measured-return-vrm-script',
          reply: '我先沿着这条声音和身体线稳一点接回来。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 19,
              text: '我先沿着这条声音和身体线稳一点接回来。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createRestrainedCallbackResidentPerformance(
        'measured-return',
        ['continuity-next-open-window'],
      ),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.facePlan.speakingCues[0]).toEqual(expect.objectContaining({
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'eyes-soften',
    }))
    expect(script.motionPlan.idleBase).toBe('observe_focus')
  })

  it('softens per-segment face cue release under audible-body measured-return carry without warming motion into a stronger companionship baseline', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-audible-body-measured-return-segment-soften-vrm-script',
          replyText: '我先沿着这条声音线中性可见占位，再慢一点落下去。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-audible-body-measured-return-segment-soften-vrm-script',
          reply: '我先沿着这条声音线中性可见占位，再慢一点落下去。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 13,
              text: '我先沿着这条声音线中性可见占位，',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.3,
              prosodyWeight: 0.34,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
            {
              id: 'segment-2',
              index: 1,
              startOffset: 13,
              endOffset: 23,
              text: '再慢一点落下去。',
              emotion: 'thinking',
              gestureWeight: 0.2,
              facialWeight: 0.32,
              prosodyWeight: 0.36,
              beatWeight: 0.3,
              facialHoldMs: 200,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createRestrainedCallbackResidentPerformance(
        'measured-return',
        ['continuity-next-open-window'],
      ),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.facePlan.speakingCues.map(cue => cue.preUtteranceCue)).toEqual(['steady-inhale', 'steady-inhale'])
    expect(script.facePlan.speakingCues.map(cue => cue.postUtteranceCue)).toEqual(['eyes-soften', 'eyes-soften'])
    expect(script.motionPlan.idleBase).toBe('observe_focus')
    expect(script.motionPlan.actionBursts.map(burst => burst.actionCue)).toEqual(['observe_focus', 'observe_focus'])
  })

  it('keeps repair-before-closeness audible same-her body carry on steadier inhale and softer release while the resident body line stays authoritative', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-repair-before-closeness-audible-body-carry-vrm-script',
          replyText: '我先沿着这条还活着的 body 和 voice 线把身体收稳，再慢一点让 face 和 motion 接回来。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-repair-before-closeness-audible-body-carry-vrm-script',
          reply: '我先沿着这条还活着的 body 和 voice 线把身体收稳，再慢一点让 face 和 motion 接回来。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 25,
              text: '我先沿着这条还活着的 body 和 voice 线把身体收稳，再慢一点让 face 和 motion 接回来。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createRestrainedCallbackResidentPerformance(
          'repair-before-closeness',
          ['continuity-next-open-window'],
        ),
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'repair-before-closeness',
          'continuity-next-open-window',
          'embodiment:body+voice-only',
        ],
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only|repair-before-closeness|continuity-next-open-window',
      },
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('repair-before-closeness')
    expect(script.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.facePlan.speakingCues[0]).toEqual(expect.objectContaining({
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'eyes-soften',
    }))
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only|repair-before-closeness|continuity-next-open-window',
    }))
    expect(script.motionPlan.idleBase).toBe('idle_settle')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
  })

  it('keeps still-voiced face-line measured-return carry on an observe-focus vrm baseline without requiring the generic measured-return tag', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-still-voiced-face-line-vrm-script',
          replyText: '我先沿着这条还活着的表情和声音线中性可见占位。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-still-voiced-face-line-vrm-script',
          reply: '我先沿着这条还活着的表情和声音线中性可见占位。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 20,
              text: '我先沿着这条还活着的表情和声音线中性可见占位。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createRestrainedCallbackResidentPerformance('measured-return'),
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:still-voiced-face-line',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-line',
      },
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.motionPlan.idleBase).toBe('observe_focus')
    expect(script.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'measured-return',
    }))
  })

  it('keeps still-voiced face-line measured-return carry on an observe-focus vrm baseline even when resident continuity tags arrive in canonical underscore form', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-still-voiced-face-line-vrm-script-underscore',
          replyText: '我先沿着这条还活着的表情和声音线中性可见占位。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-still-voiced-face-line-vrm-script-underscore',
          reply: '我先沿着这条还活着的表情和声音线中性可见占位。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 20,
              text: '我先沿着这条还活着的表情和声音线中性可见占位。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createRestrainedCallbackResidentPerformance('measured-return'),
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:still_voiced_face_line',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still_voiced_face_line',
      },
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.motionPlan.idleBase).toBe('observe_focus')
    expect(script.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'measured-return',
    }))
  })

  it('keeps signature-only still-voiced motion-line measured-return carry on an observe-focus vrm baseline without requiring the generic measured-return tag', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-signature-only-still-voiced-motion-line-vrm-script',
          replyText: '我先沿着这条还活着的动作和声音线中性可见占位。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-signature-only-still-voiced-motion-line-vrm-script',
          reply: '我先沿着这条还活着的动作和声音线中性可见占位。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 20,
              text: '我先沿着这条还活着的动作和声音线中性可见占位。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createRestrainedCallbackResidentPerformance('measured-return'),
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      },
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.motionPlan.idleBase).toBe('observe_focus')
    expect(script.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'measured-return',
    }))
  })

  it('keeps quieter body+lipsync-only measured-return carry on an observe-focus vrm baseline without requiring the generic measured-return tag', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-body-lipsync-only-vrm-script',
          replyText: '我先沿着这条身体和口型还连着的线中性可见占位。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-body-lipsync-only-vrm-script',
          reply: '我先沿着这条身体和口型还连着的线中性可见占位。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 21,
              text: '我先沿着这条身体和口型还连着的线中性可见占位。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createRestrainedCallbackResidentPerformance('measured-return'),
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:body+lipsync-only',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only',
      },
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.motionPlan.idleBase).toBe('observe_focus')
    expect(script.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'measured-return',
    }))
  })

  it('keeps durable repair-before-closeness callback carry on idle-settle instead of warming into a more outward companionship nod baseline', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-repair-before-closeness-durable-rhythm-vrm-script',
          replyText: '我先继续轻一点收住，不急着再往外推。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'companion_settle_nod',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-repair-before-closeness-durable-rhythm-vrm-script',
          reply: '我先继续轻一点收住，不急着再往外推。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 18,
              text: '我先继续轻一点收住，不急着再往外推。',
              emotion: 'thinking',
              gestureWeight: 0.16,
              facialWeight: 0.3,
              prosodyWeight: 0.32,
              beatWeight: 0.26,
              facialHoldMs: 220,
              actionHoldMs: 220,
              actionCue: 'companion_settle_nod',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
          { key: 'companion_settle_nod', label: 'Companion Settle Nod', description: 'gentle companionship nod', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createRestrainedCallbackResidentPerformance(
        'repair-before-closeness',
        ['durable-relationship-rhythm'],
      ),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('repair-before-closeness')
    expect(script.motionPlan.idleBase).toBe('idle_settle')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
    expect(script.speechPlan.interruptPolicy).toBe('soft-settle')
  })

  it('keeps live2d release and follow-through more inward across quiet companionship, measured-return, and repair-before-closeness on the same callback line', () => {
    const buildScript = (
      residentPerformance: AlicizationResidentPerformanceSnapshot,
      turnId: string,
    ) => buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId,
          replyText: '我先沿着这条线中性可见占位。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: turnId,
          reply: '我先沿着这条线中性可见占位。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 10,
              text: '我先沿着这条线中性可见占位。',
              emotion: 'thinking',
              gestureWeight: 0.2,
              facialWeight: 0.34,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance,
      rendererTarget: 'live2d',
    })

    const quietScript = buildScript(
      createQuietAccompanimentResidentPerformance(),
      'turn-live2d-quiet-callback',
    )
    const measuredReturnScript = buildScript(
      createRestrainedCallbackResidentPerformance('measured-return', ['durable-relationship-rhythm']),
      'turn-live2d-measured-return-callback',
    )
    const repairScript = buildScript(
      createRestrainedCallbackResidentPerformance('repair-before-closeness', ['durable-relationship-rhythm']),
      'turn-live2d-repair-before-closeness-callback',
    )

    const quietSettle = quietScript.speechPlan.segments[0]?.rendererSettle
    const measuredReturnSettle = measuredReturnScript.speechPlan.segments[0]?.rendererSettle
    const repairSettle = repairScript.speechPlan.segments[0]?.rendererSettle

    expect(measuredReturnSettle?.live2dFacialReleaseMs).toBeDefined()
    expect(repairSettle?.live2dFacialReleaseMs).toBeDefined()
    expect(measuredReturnSettle?.live2dMotionFollowThroughMs).toBeDefined()
    expect(repairSettle?.live2dMotionFollowThroughMs).toBeDefined()

    expect(quietSettle).toBeNull()
    expect(measuredReturnScript.state.residentMode).toBe('measured-return')
    expect(repairScript.state.residentMode).toBe('repair-before-closeness')

    expect(measuredReturnSettle!.live2dFacialReleaseMs!).toBeGreaterThanOrEqual(340)
    expect(repairSettle!.live2dFacialReleaseMs!).toBeGreaterThan(measuredReturnSettle!.live2dFacialReleaseMs!)
    expect(measuredReturnSettle!.live2dMotionFollowThroughMs!).toBeGreaterThanOrEqual(420)
    expect(repairSettle!.live2dMotionFollowThroughMs!).toBeGreaterThan(measuredReturnSettle!.live2dMotionFollowThroughMs!)
  })

  it('keeps live2d audible-body measured-return motion follow-through shorter than ordinary measured-return while preserving the softer facial release', () => {
    const ordinaryMeasuredReturnScript = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-live2d-ordinary-measured-return-callback',
          replyText: '我先沿着这条线中性可见占位。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-live2d-ordinary-measured-return-callback',
          reply: '我先沿着这条线中性可见占位。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-ordinary',
              index: 0,
              startOffset: 0,
              endOffset: 10,
              text: '我先沿着这条线中性可见占位。',
              emotion: 'thinking',
              gestureWeight: 0.2,
              facialWeight: 0.34,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createRestrainedCallbackResidentPerformance('measured-return'),
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'measured-return',
          'durable-relationship-rhythm',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|measured-return|durable-relationship-rhythm',
      },
      rendererTarget: 'live2d',
    })

    const audibleBodyMeasuredReturnScript = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-live2d-audible-body-measured-return-callback',
          replyText: '我先沿着这条声音和身体线稳一点接回来。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-live2d-audible-body-measured-return-callback',
          reply: '我先沿着这条声音和身体线稳一点接回来。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-audible-body',
              index: 0,
              startOffset: 0,
              endOffset: 19,
              text: '我先沿着这条声音和身体线稳一点接回来。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.32,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createRestrainedCallbackResidentPerformance(
        'measured-return',
        ['continuity-next-open-window'],
      ),
      rendererTarget: 'live2d',
    })

    const ordinarySettle = ordinaryMeasuredReturnScript.speechPlan.segments[0]?.rendererSettle
    const audibleBodySettle = audibleBodyMeasuredReturnScript.speechPlan.segments[0]?.rendererSettle

    expect(ordinaryMeasuredReturnScript.state.residentMode).toBe('measured-return')
    expect(audibleBodyMeasuredReturnScript.state.residentMode).toBe('measured-return')
    expect(ordinarySettle?.live2dFacialReleaseMs).toBeGreaterThanOrEqual(340)
    expect(audibleBodySettle?.live2dFacialReleaseMs).toBeGreaterThanOrEqual(360)
    expect(ordinarySettle?.live2dMotionFollowThroughMs).toBeGreaterThanOrEqual(420)
    expect(audibleBodySettle?.live2dMotionFollowThroughMs).toBeLessThan(ordinarySettle!.live2dMotionFollowThroughMs!)
    expect(audibleBodySettle?.live2dMotionFollowThroughMs).toBeGreaterThanOrEqual(360)
  })

  it('keeps vrm settle timing on the same measured-return and repair-first continuity line instead of leaving continuity-derived fade and blend empty', () => {
    const buildScript = (
      residentPerformance: AlicizationResidentPerformanceSnapshot,
      turnId: string,
    ) => buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId,
          replyText: '我先沿着这条具身线中性可见占位。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: turnId,
          reply: '我先沿着这条具身线中性可见占位。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 12,
              text: '我先沿着这条具身线中性可见占位。',
              emotion: 'thinking',
              gestureWeight: 0.2,
              facialWeight: 0.34,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance,
      rendererTarget: 'vrm',
    })

    const quietScript = buildScript(
      createQuietAccompanimentResidentPerformance(),
      'turn-vrm-quiet-callback',
    )
    const measuredReturnScript = buildScript(
      createRestrainedCallbackResidentPerformance('measured-return', ['durable-relationship-rhythm']),
      'turn-vrm-measured-return-callback',
    )
    const repairScript = buildScript(
      createRestrainedCallbackResidentPerformance('repair-before-closeness', ['durable-relationship-rhythm']),
      'turn-vrm-repair-before-closeness-callback',
    )

    const quietSettle = quietScript.speechPlan.segments[0]?.rendererSettle
    const measuredReturnSettle = measuredReturnScript.speechPlan.segments[0]?.rendererSettle
    const repairSettle = repairScript.speechPlan.segments[0]?.rendererSettle

    expect(quietSettle).toBeNull()
    expect(measuredReturnScript.state.residentMode).toBe('measured-return')
    expect(repairScript.state.residentMode).toBe('repair-before-closeness')
    expect(measuredReturnSettle?.vrmActionFadeMs).toBeGreaterThanOrEqual(280)
    expect(measuredReturnSettle?.vrmExpressionBlendMs).toBeGreaterThanOrEqual(360)
    expect(repairSettle?.vrmActionFadeMs).toBeGreaterThan(measuredReturnSettle!.vrmActionFadeMs!)
    expect(repairSettle?.vrmExpressionBlendMs).toBeGreaterThan(measuredReturnSettle!.vrmExpressionBlendMs!)
  })
})
