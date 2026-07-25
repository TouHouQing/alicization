import type {
  AlicizationDialoguePerformancePayload,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { describe, expect, it } from 'vitest'

import { adaptAlicizationEmbodimentPerformanceToRenderer } from './renderer-capability-adapter'

function createPerformance(overrides?: Partial<AlicizationDialoguePerformancePayload>): AlicizationDialoguePerformancePayload {
  return {
    baseEmotion: 'thinking',
    emotion: 'thinking',
    facialCue: null,
    actionCue: null,
    delivery: 'hesitant',
    emphasis: 1,
    ...overrides,
  }
}

function createManifest(overrides?: Partial<CharacterPerformanceCapabilitiesManifest>): CharacterPerformanceCapabilitiesManifest {
  return {
    renderer: 'live2d',
    supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
    supportedFacialCues: [
      { key: 'frown', label: 'Frown', description: 'thoughtful frown', source: 'preset', affectsMouth: false },
    ],
    supportedActions: [
      { key: 'pout_confused', label: 'Pout', description: 'confused pout and tentative reaction', source: 'live2d-motion' },
    ],
    supportsLookAt: true,
    supportsVisemeLipSync: true,
    supportsMicroDynamics: true,
    ...overrides,
  }
}

function createResidentPerformance(
  overrides?: Partial<AlicizationResidentPerformanceSnapshot>,
): AlicizationResidentPerformanceSnapshot {
  return {
    version: 'resident-performance-v1',
    source: 'main-runtime',
    performance: createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 2,
    }),
    embodiedPresence: 'attentive',
    stance: 'accompany',
    emotionalTension: 'soft-covision',
    confidence: 0.86,
    reasonTags: [],
    signature: '',
    updatedAt: 1,
    ...overrides,
  }
}

function createQuietCompanionshipInput(overrides?: {
  residentPerformance?: Partial<AlicizationResidentPerformanceSnapshot>
  performance?: Partial<AlicizationDialoguePerformancePayload>
}) {
  return {
    performance: createPerformance({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      actionCue: 'idle_settle',
      facialCue: 'focus',
      delivery: 'gentle',
      emphasis: 2,
      ...overrides?.performance,
    }),
    manifest: createManifest({
      renderer: 'vrm',
      supportedFacialCues: [
        { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
      ],
    }),
    residentPerformance: createResidentPerformance(overrides?.residentPerformance),
  }
}

describe('renderer capability adapter', () => {
  it('reuses the performance-plan helper to clamp one performance payload to the renderer manifest', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance(),
      manifest: createManifest(),
      continuity: {
        variationToken: 'turn-1',
      },
    })

    expect(adapted.performance.baseEmotion).toBe('thinking')
    expect(adapted.performance.facialCue).toBe('frown')
    expect(adapted.performance.actionCue).toBe('pout_confused')
  })

  it('keeps custom vrm facial capabilities alongside runtime-reported preset cues', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        facialCue: 'custom_focus',
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'custom_focus', label: 'Custom Focus', description: 'custom mapped expression', source: 'custom', affectsMouth: false },
          { key: 'frown', label: 'Frown', description: 'thoughtful frown', source: 'preset', affectsMouth: false },
        ],
      }),
    })

    expect(adapted.performance.facialCue).toBe('custom_focus')
  })

  it('keeps structured quiet companionship mode on steady focus without audit text', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer(createQuietCompanionshipInput())

    expect(adapted.performance.actionCue).toBe('steady_focus')
  })

  it('uses structured measured-return resident mode to preserve observe focus after a sparse idle fallback', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
      }),
      residentPerformance: createResidentPerformance({
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          actionCue: 'steady_focus',
          facialCue: 'focus',
          delivery: 'gentle',
          residentMode: 'measured-return',
        }),
      }),
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('keeps the manifest-supported fallback when measured-return observe focus is unavailable', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
      }),
      residentPerformance: createResidentPerformance({
        performance: createPerformance({
          baseEmotion: 'thinking',
          emotion: 'thinking',
          actionCue: 'steady_focus',
          facialCue: 'focus',
          delivery: 'gentle',
          residentMode: 'measured-return',
        }),
      }),
    })

    expect(adapted.performance.actionCue).toBe('idle_settle')
    expect(adapted.plannedActionCue).toBe('idle_settle')
  })

  it.each([
    {
      name: 'same-her',
      residentPerformance: {
        reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment'],
        signature: 'resident|same-her',
      },
    },
    {
      name: 'body+voice',
      residentPerformance: {
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:body+voice-only',
        ],
        signature: 'resident|body+voice-only',
      },
    },
    {
      name: 'still-voiced',
      residentPerformance: {
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:still-voiced-motion-line',
        ],
        signature: 'resident|still-voiced-motion-line',
      },
    },
    {
      name: 'callback',
      residentPerformance: {
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'measured-return',
          'repair-before-closeness',
          'continuity-next-open-window',
          'lower-pressure',
        ],
        signature: 'resident|callback',
      },
    },
  ])('ignores polluted $name audit fields when adapting action cues', ({ residentPerformance }) => {
    const clean = adaptAlicizationEmbodimentPerformanceToRenderer(createQuietCompanionshipInput())
    const polluted = adaptAlicizationEmbodimentPerformanceToRenderer(createQuietCompanionshipInput({
      residentPerformance,
    }))

    expect(polluted.performance.actionCue).toBe(clean.performance.actionCue)
    expect(polluted.performance).toEqual(clean.performance)
  })

  it('keeps structured rest-protective mode on idle settle without audit text', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
      }),
      residentPerformance: createResidentPerformance({
        performance: createPerformance({
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'focus',
          actionCue: 'idle_settle',
          delivery: 'gentle',
        }),
        embodiedPresence: 'concerned',
        stance: 'care',
        emotionalTension: 'late-night-drain',
      }),
    })

    expect(adapted.performance.actionCue).toBe('idle_settle')
  })

  it('preserves structured rest-protective comfort sway instead of narrowing it to idle settle', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
      }),
      manifest: createManifest({
        renderer: 'live2d',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'comfort_sway', label: 'Comfort Sway', description: 'quiet comfort sway', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
      }),
      residentPerformance: createResidentPerformance({
        performance: createPerformance({
          baseEmotion: 'concerned',
          emotion: 'concerned',
          actionCue: 'comfort_sway',
          facialCue: 'focus',
          delivery: 'gentle',
          residentMode: 'quiet-companionship',
        }),
        embodiedPresence: 'concerned',
        stance: 'care',
        emotionalTension: 'late-night-drain',
      }),
    })

    expect(adapted.performance.actionCue).toBe('comfort_sway')
  })

  it('keeps the manifest-supported fallback when rest-protective comfort sway is unavailable', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
      }),
      manifest: createManifest({
        renderer: 'live2d',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
      }),
      residentPerformance: createResidentPerformance({
        performance: createPerformance({
          baseEmotion: 'concerned',
          emotion: 'concerned',
          actionCue: 'comfort_sway',
          facialCue: 'focus',
          delivery: 'gentle',
          residentMode: 'quiet-companionship',
        }),
        embodiedPresence: 'concerned',
        stance: 'care',
        emotionalTension: 'late-night-drain',
      }),
    })

    expect(adapted.performance.actionCue).toBe('idle_settle')
    expect(adapted.plannedActionCue).toBe('idle_settle')
  })

  it('uses only structured resident mode fields when deciding a quiet companionship override', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer(createQuietCompanionshipInput({
      residentPerformance: {
        stance: 'observe',
      },
    }))

    expect(adapted.performance.actionCue).toBe('idle_settle')
  })

  it('keeps renderer fallback equal when audit fields are polluted outside a structured resident mode', () => {
    const clean = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
      }),
      residentPerformance: createResidentPerformance({
        stance: 'observe',
      }),
    })
    const polluted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: clean.performance,
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
      }),
      residentPerformance: createResidentPerformance({
        stance: 'observe',
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'same-her',
          'body+voice-only',
          'still-voiced',
          'measured-return',
          'repair-before-closeness',
        ],
        signature: 'same-her|body+voice-only|still-voiced|callback',
      }),
    })

    expect(polluted.performance).toEqual(clean.performance)
  })
})
