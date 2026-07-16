import type { AlicizationDialoguePerformancePayload, CharacterPerformanceCapabilitiesManifest } from '../../stores/alicization-bridge'

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
    supportedBaseEmotions: ['neutral', 'thinking'],
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

  it('preserves quiet companionship steady focus when resident authority is silent accompanying even if the renderer lacks that exact action capability', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'steady_focus',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 2,
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' },
        ],
      }),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment'],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|subconscious-proactive|silent-observe',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('steady_focus')
  })

  it('preserves measured-return callback restraint as observe focus instead of warming back up to steady focus in renderer fallback', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'observe_focus',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 2,
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
        ],
      }),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment', 'measured-return'],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|measured-return',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('keeps proactive silent-observe accompaniment on observe focus instead of warming to steady focus in renderer fallback', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'observe_focus',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 2,
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
        ],
      }),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment', 'continuity-next-open-window'],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|subconscious-proactive|silent-observe|continuity-next-open-window',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('preserves repair-before-closeness callback restraint as idle settle in renderer fallback', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 2,
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
        ],
      }),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment', 'repair-before-closeness'],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|repair-before-closeness',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('idle_settle')
  })

  it('keeps longer repair-before-closeness quiet hold on idle settle instead of warming back up to a nod-like fallback action', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'companion_settle_nod', label: 'Companion Settle Nod', description: 'gentle companionship nod', source: 'builtin' },
        ],
      }),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.9,
        reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment', 'repair-before-closeness', 'durable-relationship-rhythm'],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|repair-before-closeness|durable-relationship-rhythm',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('idle_settle')
  })

  it('preserves rest-protective quiet companionship callback restraint as idle settle in renderer fallback', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
        ],
      }),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'focus',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiedPresence: 'concerned',
        stance: 'care',
        emotionalTension: 'late-night-drain',
        confidence: 0.9,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'rest-protective',
          'rest-protective-companionship',
        ],
        signature: 'resident|main-runtime|care|quiet-accompaniment|rest-protective',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('idle_settle')
  })

  it('keeps browser-fallback rest-protective quiet companionship on the same idle-settle body line', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
      }),
      manifest: createManifest({
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'companion_settle_nod', label: 'Companion Settle Nod', description: 'gentle companionship nod', source: 'builtin' },
        ],
      }),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'browser-fallback',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'focus',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiedPresence: 'concerned',
        stance: 'care',
        emotionalTension: 'late-night-drain',
        confidence: 0.82,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'rest-protective',
          'rest-protective-companionship',
        ],
        signature: 'resident|browser-fallback|care|quiet-accompaniment|rest-protective',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('idle_settle')
  })

  it('keeps measured-return callback baselines on observe focus after a gentle release when the resident cadence still says leave room before widening back out', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
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
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'measured-return',
          'continuity-next-open-window',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|measured-return|continuity-next-open-window',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('keeps still-voiced continuity callback baselines on observe focus after a gentle release when the identity-continuity', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
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
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:still-voiced-face-line',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-line',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('keeps still-voiced continuity callback baselines on observe focus even when resident continuity tags arrive in canonical underscore form', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
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
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:still_voiced_face_line',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still_voiced_face_line',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('keeps signature-only still-voiced motion-line callback baselines on observe focus when the identity-continuity', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
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
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('keeps body+voice-only identity-continuity', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
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
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:audible-same-her-line',
          'embodiment:body+voice-only',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|embodiment:audible_same_her_line|body+voice-only',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('keeps body-lipsync-voice-rejoin identity-continuity', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
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
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:audible-same-her-line',
          'embodiment:body-lipsync-voice-rejoin',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|embodiment:audible-same-her-line|body-lipsync-voice-rejoin',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })

  it('keeps quieter body+lipsync-only identity-continuity', () => {
    const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
      performance: createPerformance({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        actionCue: 'idle_settle',
        facialCue: 'focus',
        delivery: 'gentle',
        emphasis: 1,
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
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.86,
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'embodiment:body+lipsync-only',
        ],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|embodiment:body+lipsync-only',
        updatedAt: 1,
      },
    })

    expect(adapted.performance.actionCue).toBe('observe_focus')
  })
})
