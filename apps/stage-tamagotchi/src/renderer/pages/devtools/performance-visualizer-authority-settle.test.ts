import { describe, expect, it } from 'vitest'

import { buildAuthoritySettleLines } from './performance-visualizer-authority-settle'

describe('performance visualizer authority settle lines', () => {
  it('formats structured settle fields for live2d and vrm rows', () => {
    expect(buildAuthoritySettleLines({
      settle: {
        live2dFacialReleaseMs: {
          planned: 320,
          consumed: 300,
        },
        live2dMotionFollowThroughMs: {
          planned: 440,
          consumed: 440,
        },
      },
    } as any)).toEqual([
      'live2dFacialReleaseMs: 320 -> 300',
      'live2dMotionFollowThroughMs: 440 -> 440',
    ])

    expect(buildAuthoritySettleLines({
      settle: {
        vrmActionFadeMs: {
          planned: 280,
          consumed: 280,
        },
        vrmExpressionBlendMs: {
          planned: 360,
          consumed: 320,
        },
      },
    } as any)).toEqual([
      'vrmActionFadeMs: 280 -> 280',
      'vrmExpressionBlendMs: 360 -> 320',
    ])
  })

  it('returns an empty list when settle fields are absent', () => {
    expect(buildAuthoritySettleLines(null)).toEqual([])
  })
})
