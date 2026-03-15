import { describe, expect, it } from 'vitest'

import { computePersonalityDelta } from './alicization-personality'

describe('alicization personality drift', () => {
  it('returns zero deltas when sentiment score is too weak', () => {
    const delta = computePersonalityDelta(0.12, 0.9)
    expect(delta).toEqual({
      obedience: 0,
      liveliness: 0,
      sensibility: 0,
    })
  })

  it('returns positive deltas across three axes for positive sentiment', () => {
    const delta = computePersonalityDelta(0.8, 0.9)
    expect(delta.obedience).toBeGreaterThan(0)
    expect(delta.liveliness).toBeGreaterThan(0)
    expect(delta.sensibility).toBeGreaterThan(0)
  })

  it('returns negative deltas across three axes for negative sentiment', () => {
    const delta = computePersonalityDelta(-0.8, 0.9)
    expect(delta.obedience).toBeLessThan(0)
    expect(delta.liveliness).toBeLessThan(0)
    expect(delta.sensibility).toBeLessThan(0)
  })
})
