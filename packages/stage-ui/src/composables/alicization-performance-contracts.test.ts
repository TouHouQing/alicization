import {
  sanitizeCharacterPerformanceManifest,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

describe('alicization performance contracts', () => {
  it('preserves embodiment hints while sanitizing performance manifests', () => {
    expect(sanitizeCharacterPerformanceManifest({
      renderer: 'vrm',
      supportedBaseEmotions: ['thinking', 'neutral'],
      supportedFacialCues: [{
        key: 'relaxed',
        label: 'Relaxed',
        description: 'Soft reflective expression',
        source: 'preset',
        affectsMouth: false,
      }],
      supportedActions: [{
        key: 'observe_focus',
        label: 'Observe',
        description: 'Quiet observation motion',
        source: 'builtin',
      }],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: {
        thinking: {
          preferredActionCues: ['observe_focus'],
          preferredExpressionAliases: ['CalmLook', 'FocusSoft'],
          preferredFacialCues: ['relaxed'],
          preferredMotionAliases: ['ObserveSoft'],
        },
      },
    })).toEqual(expect.objectContaining({
      embodimentHints: {
        thinking: {
          preferredActionCues: ['observe_focus'],
          preferredExpressionAliases: ['CalmLook', 'FocusSoft'],
          preferredFacialCues: ['relaxed'],
          preferredMotionAliases: ['ObserveSoft'],
        },
      },
    }))
  })
})
