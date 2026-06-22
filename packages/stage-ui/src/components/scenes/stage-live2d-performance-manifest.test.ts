import type { CharacterActionCapability } from '../../stores/alicization-bridge'

import { describe, expect, it } from 'vitest'

import { resolveLive2DManifestActionCapabilities } from './stage-live2d-performance-manifest'

function createActionCapability(
  overrides?: Partial<CharacterActionCapability>,
): CharacterActionCapability {
  return {
    key: 'idle_gentle_nod',
    label: 'Gentle Nod',
    description: 'gentle nod',
    source: 'live2d-motion',
    ...overrides,
  }
}

describe('stage live2d performance manifest helpers', () => {
  it('keeps restrained runtime live2d actions available when scanned motions are missing them', () => {
    const supportedActions = resolveLive2DManifestActionCapabilities({
      motionCapabilities: [
        createActionCapability(),
      ],
      runtimeSupportedActions: [],
    })

    expect(supportedActions.map(item => item.key)).toEqual(
      expect.arrayContaining(['idle_gentle_nod', 'steady_focus', 'observe_focus', 'idle_settle']),
    )
  })

  it('keeps an explicit live2d motion capability ahead of a builtin fallback with the same key', () => {
    const supportedActions = resolveLive2DManifestActionCapabilities({
      motionCapabilities: [
        createActionCapability({
          key: 'observe_focus',
          label: 'Observe Soft Motion',
          description: 'resolved from live2d motion scan',
          source: 'live2d-motion',
        }),
      ],
      runtimeSupportedActions: [
        createActionCapability({
          key: 'observe_focus',
          label: 'Observe Focus',
          description: 'steady observe focus',
          source: 'builtin',
        }),
        createActionCapability({
          key: 'idle_settle',
          label: 'Idle Settle',
          description: 'idle settle',
          source: 'builtin',
        }),
      ],
    })

    expect(supportedActions.filter(item => item.key === 'observe_focus')).toEqual([
      expect.objectContaining({
        key: 'observe_focus',
        label: 'Observe Soft Motion',
        description: 'resolved from live2d motion scan',
        source: 'live2d-motion',
      }),
    ])
    expect(supportedActions.map(item => item.key)).toContain('idle_settle')
  })
})
