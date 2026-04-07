import type {
  AlicizationDialoguePerformancePayload,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { describe, expect, it } from 'vitest'

import { buildStageEmbodimentPerformancePlan } from './stage-embodiment-performance-plan'

function createPerformance(overrides?: Partial<AlicizationDialoguePerformancePayload>): AlicizationDialoguePerformancePayload {
  return {
    baseEmotion: 'neutral',
    emotion: 'neutral',
    facialCue: null,
    actionCue: null,
    delivery: 'calm',
    emphasis: 0,
    ...overrides,
  }
}

function createManifest(overrides?: Partial<CharacterPerformanceCapabilitiesManifest>): CharacterPerformanceCapabilitiesManifest {
  return {
    renderer: 'vrm',
    supportedBaseEmotions: ['neutral', 'happy', 'thinking', 'surprised'],
    supportedFacialCues: [],
    supportedActions: [],
    supportsLookAt: true,
    supportsVisemeLipSync: true,
    supportsMicroDynamics: true,
    ...overrides,
  }
}

describe('stage embodiment performance plan', () => {
  it('preserves explicit supported cues from governance', () => {
    const plan = buildStageEmbodimentPerformancePlan({
      manifest: createManifest({
        supportedFacialCues: [
          { key: 'smile', label: 'Smile', description: 'Bright smile', source: 'preset', affectsMouth: true },
        ],
        supportedActions: [
          { key: 'wave', label: 'Wave', description: 'Friendly wave', source: 'builtin' },
        ],
      }),
      performance: createPerformance({
        baseEmotion: 'happy',
        emotion: 'happy',
        facialCue: 'smile',
        actionCue: 'wave',
        delivery: 'energetic',
        emphasis: 2,
      }),
    })

    expect(plan.performance.facialCue).toBe('smile')
    expect(plan.performance.actionCue).toBe('wave')
  })

  it('fills hesitant live2d action cues from capability text when governance keeps actionCue empty', () => {
    const plan = buildStageEmbodimentPerformancePlan({
      manifest: createManifest({
        renderer: 'live2d',
        supportedFacialCues: [],
        supportedActions: [
          { key: 'idle_gentle_nod', label: '轻轻点头', description: 'gentle calm idle nod', source: 'live2d-motion' },
          { key: 'pout_confused', label: '惊讶疑惑闷气', description: 'confused pout and tentative reaction', source: 'live2d-motion' },
        ],
      }),
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        delivery: 'hesitant',
        emphasis: 1,
      }),
    })

    expect(plan.performance.actionCue).toBe('pout_confused')
  })

  it('prefers shared embodiment cue candidates before fuzzy text scoring', () => {
    const plan = buildStageEmbodimentPerformancePlan({
      manifest: createManifest({
        renderer: 'live2d',
        supportedActions: [
          { key: 'comfort_sway', label: '动作 A', description: 'slot a', source: 'live2d-motion' },
          { key: 'idle_settle', label: '动作 B', description: 'slot b', source: 'live2d-motion' },
        ],
      }),
      performance: createPerformance({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        delivery: 'gentle',
      }),
    })

    expect(plan.performance.actionCue).toBe('comfort_sway')
  })

  it('chooses a relaxed vrm facial fallback for reflective turns', () => {
    const plan = buildStageEmbodimentPerformancePlan({
      manifest: createManifest({
        supportedFacialCues: [
          { key: 'smile', label: 'Smile', description: 'Bright smile', source: 'preset', affectsMouth: true },
          { key: 'relaxed', label: 'Relaxed', description: 'Looser face for thinking', source: 'preset', affectsMouth: false },
        ],
      }),
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        delivery: 'calm',
      }),
    })

    expect(plan.performance.facialCue).toBe('relaxed')
  })

  it('prefers embodiment hint action cues before shared candidates', () => {
    const plan = buildStageEmbodimentPerformancePlan({
      manifest: createManifest({
        supportedActions: [
          { key: 'comfort_sway', label: 'Comfort', description: 'comfort sway', source: 'live2d-motion' },
          { key: 'idle_gentle_nod', label: 'Nod', description: 'gentle nod', source: 'live2d-motion' },
        ],
        embodimentHints: {
          concerned: {
            preferredActionCues: ['idle_gentle_nod'],
          },
        },
      }),
      performance: createPerformance({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        delivery: 'gentle',
      }),
    })

    expect(plan.performance.actionCue).toBe('idle_gentle_nod')
  })

  it('prefers embodiment hint facial cues before shared candidates', () => {
    const plan = buildStageEmbodimentPerformancePlan({
      manifest: createManifest({
        supportedFacialCues: [
          { key: 'relaxed', label: 'Relaxed', description: 'relaxed face', source: 'preset', affectsMouth: false },
          { key: 'frown', label: 'Frown', description: 'gentle frown', source: 'preset', affectsMouth: false },
        ],
        embodimentHints: {
          thinking: {
            preferredFacialCues: ['frown'],
          },
        },
      }),
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        delivery: 'hesitant',
      }),
    })

    expect(plan.performance.facialCue).toBe('frown')
  })

  it('keeps null cues when the manifest offers no meaningful fallback', () => {
    const plan = buildStageEmbodimentPerformancePlan({
      manifest: createManifest(),
      performance: createPerformance({
        baseEmotion: 'neutral',
        emotion: 'neutral',
        delivery: 'calm',
      }),
    })

    expect(plan.performance.facialCue).toBeNull()
    expect(plan.performance.actionCue).toBeNull()
  })

  it('avoids repeating the same action cue when multiple candidates are available', () => {
    const performance = createPerformance({
      baseEmotion: 'concerned',
      emotion: 'concerned',
      delivery: 'gentle',
      emphasis: 1,
    })
    const manifest = createManifest({
      supportedActions: [
        { key: 'idle_gentle_nod', label: '轻轻点头', description: 'gentle calm comfort nod settle', source: 'live2d-motion' },
        { key: 'comfort_sway', label: '安抚摇摆', description: 'gentle calm comfort sway nod settle', source: 'live2d-motion' },
      ],
    })
    const firstPlan = buildStageEmbodimentPerformancePlan({
      manifest,
      performance,
      continuity: {
        variationToken: 'dialogue-turn-1',
      },
    })
    const secondPlan = buildStageEmbodimentPerformancePlan({
      manifest,
      performance,
      continuity: {
        previousActionCue: firstPlan.performance.actionCue,
        variationToken: 'dialogue-turn-2',
      },
    })

    expect(firstPlan.performance.actionCue).toBeTruthy()
    expect(secondPlan.performance.actionCue).toBeTruthy()
    expect(secondPlan.performance.actionCue).not.toBe(firstPlan.performance.actionCue)
  })

  it('still emits action cues under low-signal capability text and rotates continuity', () => {
    const performance = createPerformance({
      baseEmotion: 'neutral',
      emotion: 'neutral',
      delivery: 'calm',
      emphasis: 0,
    })
    const manifest = createManifest({
      supportedActions: [
        { key: '动作一', label: '动作一', description: '第一套动作', source: 'live2d-motion' },
        { key: '动作二', label: '动作二', description: '第二套动作', source: 'live2d-motion' },
      ],
    })

    const firstPlan = buildStageEmbodimentPerformancePlan({
      manifest,
      performance,
      continuity: {
        variationToken: 'low-signal-turn-1',
      },
    })
    const secondPlan = buildStageEmbodimentPerformancePlan({
      manifest,
      performance,
      continuity: {
        previousActionCue: firstPlan.performance.actionCue,
        variationToken: 'low-signal-turn-2',
      },
    })

    expect(firstPlan.performance.actionCue).toBeTruthy()
    expect(secondPlan.performance.actionCue).toBeTruthy()
    expect(secondPlan.performance.actionCue).not.toBe(firstPlan.performance.actionCue)
  })

  it('avoids repeating the same facial cue when multiple candidates are available', () => {
    const performance = createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      delivery: 'hesitant',
      emphasis: 0,
    })
    const manifest = createManifest({
      supportedFacialCues: [
        { key: 'relaxed', label: 'Relaxed', description: 'relaxed face', source: 'preset', affectsMouth: false },
        { key: 'frown', label: 'Frown', description: 'gentle frown', source: 'preset', affectsMouth: false },
      ],
    })
    const firstPlan = buildStageEmbodimentPerformancePlan({
      manifest,
      performance,
      continuity: {
        variationToken: 'dialogue-turn-3',
      },
    })
    const secondPlan = buildStageEmbodimentPerformancePlan({
      manifest,
      performance,
      continuity: {
        previousFacialCue: firstPlan.performance.facialCue,
        variationToken: 'dialogue-turn-4',
      },
    })

    expect(firstPlan.performance.facialCue).toBeTruthy()
    expect(secondPlan.performance.facialCue).toBeTruthy()
    expect(secondPlan.performance.facialCue).not.toBe(firstPlan.performance.facialCue)
  })
})
