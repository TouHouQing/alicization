import { describe, expect, it } from 'vitest'

import type { VrmCustomExpressionBinding } from '@proj-alicization/stage-ui-three'

import { resolveVrmManifestFacialCapabilities } from './stage-vrm-performance-manifest'
import { resolveVrmManifestBaseEmotions } from './stage-vrm-performance-manifest'

function createCustomBinding(overrides?: Partial<VrmCustomExpressionBinding>): VrmCustomExpressionBinding {
  return {
    expressionName: 'custom_focus',
    facialKey: 'custom_focus',
    label: 'Custom Focus',
    description: 'custom mapped expression',
    affectsMouth: false,
    source: 'custom',
    ...overrides,
  }
}

describe('stage vrm performance manifest helpers', () => {
  it('preserves custom facial bindings alongside runtime preset cues', () => {
    const supportedFacialCues = resolveVrmManifestFacialCapabilities({
      runtimeSupportedFacialCues: [
        {
          key: 'frown',
          label: 'Frown',
          description: 'thoughtful frown',
          source: 'preset',
          affectsMouth: false,
        },
      ],
      customExpressionBindings: [createCustomBinding()],
      fallbackFacialCues: [],
    })

    expect(supportedFacialCues.map(item => item.key)).toEqual(
      expect.arrayContaining(['frown', 'custom_focus']),
    )
  })

  it('falls back to the provided facial cue list when runtime cues are absent', () => {
    const supportedFacialCues = resolveVrmManifestFacialCapabilities({
      runtimeSupportedFacialCues: [],
      customExpressionBindings: [createCustomBinding()],
      fallbackFacialCues: [
        {
          key: 'relaxed',
          label: 'Relaxed',
          description: 'neutral relaxed face',
          source: 'preset',
          affectsMouth: false,
        },
      ],
    })

    expect(supportedFacialCues.map(item => item.key)).toEqual(
      expect.arrayContaining(['relaxed', 'custom_focus']),
    )
  })

  it('prefers runtime base emotions when available', () => {
    expect(resolveVrmManifestBaseEmotions({
      runtimeSupportedBaseEmotions: ['happy', 'thinking'],
      fallbackBaseEmotions: ['neutral', 'sad'],
    })).toEqual(['happy', 'thinking', 'neutral', 'sad'])
  })

  it('falls back to the provided base emotion list when runtime emotions are absent', () => {
    expect(resolveVrmManifestBaseEmotions({
      runtimeSupportedBaseEmotions: [],
      fallbackBaseEmotions: ['neutral', 'sad'],
    })).toEqual(['neutral', 'sad'])
  })
})
