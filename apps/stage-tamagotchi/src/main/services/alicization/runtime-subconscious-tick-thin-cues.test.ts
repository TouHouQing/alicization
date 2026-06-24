import { describe, expect, it } from 'vitest'

import { buildPresenceOnlyHoldContinuityProjection } from './runtime-subconscious-tick'

describe('buildPresenceOnlyHoldContinuityProjection thin cues', () => {
  it('preserves thinner affective-residue room-making initiative wording inside measured-return continuity guidance', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: null,
      continuityRestraint: 'measured-return',
      initiativeWhy: '余韵还在，先留白，别立刻把温度放大。',
    })

    expect(projection).toEqual(expect.objectContaining({
      openingGuidance: expect.stringContaining('余韵'),
      selfContinuityAuthority: expect.objectContaining({
        inwardLine: expect.stringContaining('余韵'),
      }),
    }))
    expect(projection?.openingGuidance).toContain('留白')
  })
})
