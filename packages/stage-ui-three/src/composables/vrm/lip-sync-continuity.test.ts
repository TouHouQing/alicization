import { describe, expect, it } from 'vitest'

import { createVrmLipSyncContinuityState, resolveVrmLipSyncContinuity } from './lip-sync-continuity'

describe('vrm lip sync continuity', () => {
  it('holds activity briefly when speech enters short stopping gaps', () => {
    const state = createVrmLipSyncContinuityState()

    const active = resolveVrmLipSyncContinuity(state, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.55,
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.6,
    })
    const held = resolveVrmLipSyncContinuity(state, {
      deltaSeconds: 0.1,
      fallbackSignal: 0,
      speechActive: false,
      speechPhase: 'stopping',
      wlipsyncSignal: 0,
    })

    expect(active.active).toBe(true)
    expect(held.active).toBe(true)
    expect(held.drive).toBeGreaterThan(0.03)
  })

  it('falls back to inactive after the hold tail drains', () => {
    const state = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(state, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    let tail = resolveVrmLipSyncContinuity(state, {
      deltaSeconds: 0.4,
      fallbackSignal: 0,
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    for (let i = 0; i < 8; i += 1) {
      tail = resolveVrmLipSyncContinuity(state, {
        deltaSeconds: 0.25,
        fallbackSignal: 0,
        speechActive: false,
        speechPhase: 'idle',
        wlipsyncSignal: 0,
      })
    }

    expect(tail.active).toBe(false)
    expect(tail.drive).toBeLessThan(0.02)
  })
})
