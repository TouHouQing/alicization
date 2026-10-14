import { describe, expect, it } from 'vitest'

import { createOneEuroFilter } from './one-euro-filter'

describe('adapted gaze filter', () => {
  it('suppresses sensor jitter while tracking a deliberate change promptly without overshoot', () => {
    const filter = createOneEuroFilter({ minCutoff: 6, beta: 0.45, derivativeCutoff: 1 })
    filter.filter(0, 1 / 60)
    const noise = Array.from({ length: 120 }, (_, index) => filter.filter(index % 2 ? 0.02 : -0.02, 1 / 60))
    expect(Math.max(...noise) - Math.min(...noise)).toBeLessThan(0.03)
    const response = Array.from({ length: 12 }, () => filter.filter(1, 1 / 60))
    expect(response.every(value => value <= 1 && value >= 0)).toBe(true)
    expect(response[0]).toBeLessThan(1)
    expect(response.at(-1)).toBeGreaterThan(0.98)
  })

  it('holds invalid time and input samples, and resets without an old model tail', () => {
    const filter = createOneEuroFilter({ minCutoff: 6, beta: 0.45, derivativeCutoff: 1 })
    expect(filter.filter(0.3, 0.016)).toBe(0.3)
    expect(filter.filter(1, -1)).toBe(0.3)
    expect(filter.filter(Number.NaN, 0.016)).toBe(0.3)
    expect(filter.filter(1, Number.NaN)).toBe(0.3)
    filter.reset()
    expect(filter.filter(-0.4, 0.016)).toBe(-0.4)
  })
})
