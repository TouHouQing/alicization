import { describe, expect, it } from 'vitest'

import { normalizeMotionDeltaSeconds } from './motion-time'
import { createLive2DSpeechContinuityState, resolveLive2DSpeechContinuity } from './performance-continuity'

describe('live2d speech continuity', () => {
  it('keeps speech activity alive briefly across short pauses', () => {
    const state = createLive2DSpeechContinuityState()

    const activated = resolveLive2DSpeechContinuity(state, {
      deltaSeconds: 1 / 60,
      speechActive: true,
      speechEnergy: 0.7,
      speechPhase: 'playing',
      visemeIntensity: 0.55,
    })
    const held = resolveLive2DSpeechContinuity(state, {
      deltaSeconds: 0.08,
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    })

    expect(activated.active).toBe(true)
    expect(held.active).toBe(true)
    expect(held.drive).toBeGreaterThan(0.03)
  })

  it('releases activity after hold window expires', () => {
    const state = createLive2DSpeechContinuityState()

    resolveLive2DSpeechContinuity(state, {
      deltaSeconds: 1 / 60,
      speechActive: true,
      speechEnergy: 0.65,
      speechPhase: 'playing',
      visemeIntensity: 0.5,
    })

    let tail = resolveLive2DSpeechContinuity(state, {
      deltaSeconds: 0.3,
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'idle',
      visemeIntensity: 0,
    })

    for (let i = 0; i < 8; i += 1) {
      tail = resolveLive2DSpeechContinuity(state, {
        deltaSeconds: 0.25,
        speechActive: false,
        speechEnergy: 0,
        speechPhase: 'idle',
        visemeIntensity: 0,
      })
    }

    expect(tail.active).toBe(false)
    expect(tail.drive).toBeLessThan(0.02)
  })
})

describe('normalizeMotionDeltaSeconds', () => {
  it('normalizes ms values and clamps large deltas', () => {
    expect(normalizeMotionDeltaSeconds(16)).toBeCloseTo(0.016, 4)
    expect(normalizeMotionDeltaSeconds(5000)).toBe(0.25)
  })

  it('returns zero for invalid deltas', () => {
    expect(normalizeMotionDeltaSeconds(-1)).toBe(0)
    expect(normalizeMotionDeltaSeconds(Number.NaN)).toBe(0)
  })
})
