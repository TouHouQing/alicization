import type {
  VrmActionBinding,
  VrmCustomExpressionBinding,
} from '@proj-alicization/stage-ui-three'

import { describe, expect, it } from 'vitest'

import {
  resolveVrmManifestActionCapabilities,
  resolveVrmManifestBaseEmotions,
  resolveVrmManifestFacialCapabilities,
} from './stage-vrm-performance-manifest'

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

function createActionBinding(overrides?: Partial<VrmActionBinding>): VrmActionBinding {
  return {
    id: 'binding-observe-focus',
    fileName: 'observe_focus.vrma',
    actionKey: 'observe_focus',
    label: 'Observe Focus Clip',
    description: 'configured observe focus clip',
    importedAt: 1,
    source: 'external-vrma',
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

  it('supplements vrm action bindings with runtime semantic action support', () => {
    const supportedActions = resolveVrmManifestActionCapabilities({
      runtimeSupportedActions: [
        {
          key: 'steady_focus',
          label: 'Steady Focus',
          description: 'steady focused idle hold',
          source: 'builtin',
        },
        {
          key: 'observe_focus',
          label: 'Observe Focus',
          description: 'gentle observe focus',
          source: 'builtin',
        },
        {
          key: 'idle_settle',
          label: 'Idle Settle',
          description: 'quiet idle settle',
          source: 'builtin',
        },
      ],
      actionBindings: [
        createActionBinding({
          actionKey: 'inspect_follow',
          label: 'Inspect Follow Clip',
          description: 'configured inspect follow clip',
        }),
      ],
    })

    expect(supportedActions.map(item => item.key)).toEqual(
      expect.arrayContaining(['inspect_follow', 'steady_focus', 'observe_focus', 'idle_settle']),
    )
  })

  it('keeps explicit action bindings authoritative when runtime semantic support repeats the same cue', () => {
    const supportedActions = resolveVrmManifestActionCapabilities({
      runtimeSupportedActions: [
        {
          key: 'observe_focus',
          label: 'Observe Focus',
          description: 'gentle observe focus',
          source: 'builtin',
        },
      ],
      actionBindings: [
        createActionBinding(),
      ],
    })

    expect(supportedActions.filter(item => item.key === 'observe_focus')).toEqual([
      expect.objectContaining({
        key: 'observe_focus',
        label: 'Observe Focus Clip',
        description: 'configured observe focus clip',
        source: 'external-vrma',
      }),
    ])
  })
})
