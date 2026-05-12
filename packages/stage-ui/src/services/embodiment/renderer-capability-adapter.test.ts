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
})
