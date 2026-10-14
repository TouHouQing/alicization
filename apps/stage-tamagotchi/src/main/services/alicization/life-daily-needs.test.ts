import { describe, expect, it } from 'vitest'

import { applyLifeDailyNeedsEffects } from './life-daily-needs'

describe('body feedback is part of the persisted needs snapshot', () => {
  it('retries an unsaved result but applies a saved result once after restart and time drift', () => {
    const initial = { fatigue: 30, appliedDailyNeedsEffects: [] }
    const result = [{ id: 'daily:stretch-a', fatigueRelief: 3 }]
    expect(applyLifeDailyNeedsEffects(initial, result).fatigue).toBe(27)
    expect(initial.fatigue).toBe(30)
    const saved = JSON.parse(JSON.stringify(applyLifeDailyNeedsEffects(initial, result)))
    saved.fatigue += 2
    expect(applyLifeDailyNeedsEffects(saved, result).fatigue).toBe(29)
    expect(applyLifeDailyNeedsEffects(saved, [...result, { id: 'daily:rest-b', fatigueRelief: 12 }]).fatigue).toBe(17)
  })
})
