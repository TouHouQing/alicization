import { describe, expect, it } from 'vitest'

import { buildPresenceOnlyHoldContinuityProjection } from './runtime-subconscious-tick'

describe('buildPresenceOnlyHoldContinuityProjection thin cues', () => {
  it('does not copy initiative wording into measured-return continuity prose', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: null,
      continuityRestraint: 'measured-return',
      initiativeWhy: '余韵还在，先留白，别立刻把温度放大。',
    })

    expect(projection).toEqual(expect.objectContaining({
      openingGuidance: '',
      selfContinuityAuthority: expect.objectContaining({
        inwardLine: null,
      }),
    }))
    expect(JSON.stringify(projection)).not.toContain('余韵')
    expect(JSON.stringify(projection)).not.toContain('留白')
  })
})
