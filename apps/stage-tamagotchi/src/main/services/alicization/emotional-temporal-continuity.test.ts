import { describe, expect, it } from 'vitest'

import { buildAlicizationEmotionalKernel } from './emotional-kernel'
import { continueTemporalEmotion } from './emotional-temporal-continuity'
import { normalizeVisualPresenceState } from './visual-episodic-memory'

describe('short emotional continuity and durable relationships', () => {
  it('decays the same event by half life without applying its impulse twice', () => {
    const proposed = { ...buildAlicizationEmotionalKernel({}), valence: 0.8, arousal: 0.9, initiativePressure: 0.8, guardedness: 0.6, closenessDrive: 0.7 }
    const first = continueTemporalEmotion({ proposed, previous: null, now: 1_000_000, turnId: 'one' })
    const after = continueTemporalEmotion({ proposed, previous: first.state, now: 1_300_000, turnId: 'one' })
    expect(first.kernel.arousal).toBeCloseTo(0.9)
    expect(after.kernel.arousal).toBeCloseTo(0.55)
    expect(after.kernel.initiativePressure).toBeCloseTo(0.4)
    expect(after.kernel.valence).toBeCloseTo(0.5 + 0.3 * Math.SQRT1_2)
    expect(continueTemporalEmotion({ proposed, previous: after.state, now: 1_300_000, turnId: 'one' }).kernel).toEqual(after.kernel)
    expect(after.kernel.guardedness).toBe(0.6)
    expect(after.kernel.closenessDrive).toBe(0.7)
  })
  it('preserves a restart snapshot and rebases a clock rollback without revival', () => {
    const proposed = { ...buildAlicizationEmotionalKernel({}), arousal: 0.8 }
    const first = continueTemporalEmotion({ proposed, previous: null, now: 1_000_000, turnId: 'one' })
    const after = continueTemporalEmotion({ proposed, previous: first.state, now: 1_300_000, turnId: 'one' })
    const restarted = normalizeVisualPresenceState({ updatedAt: 1_300_000, emotionalTemporalState: JSON.parse(JSON.stringify(after.state)), emotionalKernel: after.kernel }, 1_300_000)
    expect(restarted.emotionalTemporalState).toEqual(after.state)
    const rollback = continueTemporalEmotion({ proposed, previous: restarted.emotionalTemporalState!, now: 700_000, turnId: 'one' })
    expect(rollback.kernel.arousal).toBeCloseTo(after.kernel.arousal)
    expect(continueTemporalEmotion({ proposed, previous: after.state, now: 0, turnId: 'one' }).kernel.arousal).toBeCloseTo(after.kernel.arousal)
    const next = continueTemporalEmotion({ proposed, previous: rollback.state, now: 1_000_000, turnId: 'one' })
    expect(next.kernel.arousal).toBeCloseTo(0.35)
    const sleep = continueTemporalEmotion({ proposed, previous: next.state, now: 1_000_000 + 30 * 86_400_000, turnId: 'one' })
    expect(sleep.kernel.arousal).toBeCloseTo(0.2)
  })
  it('bounds new impulses and rejects corrupt temporal state', () => {
    const proposed = { ...buildAlicizationEmotionalKernel({}), arousal: 0.9 }
    let result = continueTemporalEmotion({ proposed, previous: null, now: 1_000_000, turnId: 'first' })
    for (let i = 0; i < 100; i++) result = continueTemporalEmotion({ proposed, previous: result.state, now: 1_000_000 + i, turnId: String(i) })
    expect(result.kernel.arousal).toBeLessThanOrEqual(1)
    expect(() => normalizeVisualPresenceState({ emotionalTemporalState: { ...result.state, anchoredAt: Infinity } })).toThrow()
  })
})
