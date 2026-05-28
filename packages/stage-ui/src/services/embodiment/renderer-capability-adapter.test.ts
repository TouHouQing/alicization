import { describe, expect, it } from 'vitest'

import type { AlicizationDialoguePerformancePayload, CharacterPerformanceCapabilitiesManifest } from '../../stores/alicization-bridge'

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
})
