import { describe, expect, it } from 'vitest'

import {
  createDefaultProactiveLoopState,
  proactiveDismissCooldownMs,
  registerProactiveDelivery,
  reportExplicitProactiveFeedback,
  settleExpiredProactiveOutcomes,
  settleProactiveOutcomesOnUserTurnStart,
  updateLateNightActivityState,
} from './proactive-feedback'

describe('proactive feedback loop state', () => {
  it('applies dismiss cooldown and scenario bias immediately', () => {
    const state = registerProactiveDelivery(createDefaultProactiveLoopState(1_000), {
      turnId: 'turn-dismiss',
      scenario: 'coding',
      deliveredAt: 1_000,
      feedbackWindowMs: 120_000,
    })
    const settled = reportExplicitProactiveFeedback(state, {
      turnId: 'turn-dismiss',
      feedback: 'dismiss',
      at: 5_000,
    })

    expect(settled.appliedOutcomes).toHaveLength(1)
    expect(settled.state.globalCooldownUntil).toBe(5_000 + proactiveDismissCooldownMs)
    expect(settled.state.scenarioBias.coding).toBe(0.15)
  })

  it('treats direct user replies within 120 seconds as positive recovery', () => {
    const seeded = createDefaultProactiveLoopState(1_000)
    seeded.scenarioBias.media = 0.05
    const state = registerProactiveDelivery(seeded, {
      turnId: 'turn-reply',
      scenario: 'media',
      deliveredAt: 1_000,
      feedbackWindowMs: 120_000,
    })
    const settled = settleProactiveOutcomesOnUserTurnStart(state, 20_000)

    expect(settled.appliedOutcomes[0]?.outcome).toBe('reply-within-120s')
    expect(settled.state.scenarioBias.media).toBe(0)
    expect(settled.state.consecutiveIgnored.media).toBe(0)
  })

  it('converts stale pending proactive turns into ignored and raises bias after three misses', () => {
    let state = createDefaultProactiveLoopState(1_000)

    for (const index of [1, 2, 3]) {
      state = registerProactiveDelivery(state, {
        turnId: `turn-ignored-${index}`,
        scenario: 'coding',
        deliveredAt: index * 1_000,
        feedbackWindowMs: 120_000,
      })
      state = settleExpiredProactiveOutcomes(state, index * 1_000 + 11 * 60_000).state
    }

    expect(state.consecutiveIgnored.coding).toBe(3)
    expect(state.scenarioBias.coding).toBe(0.1)
    expect(state.recentOutcomes.at(-1)?.outcome).toBe('ignored')
  })

  it('tracks late-night activity continuously and resets once the host disengages', () => {
    const state = createDefaultProactiveLoopState(0)

    const started = updateLateNightActivityState(state, {
      now: 0,
      hostActive: true,
      isLateNight: true,
    })
    const continued = updateLateNightActivityState(started.state, {
      now: 9 * 60_000,
      hostActive: true,
      isLateNight: true,
    })
    const continuedAgain = updateLateNightActivityState(continued.state, {
      now: 18 * 60_000,
      hostActive: true,
      isLateNight: true,
    })
    const reset = updateLateNightActivityState(continuedAgain.state, {
      now: 19 * 60_000,
      hostActive: false,
      isLateNight: true,
    })

    expect(started.lateNightActiveMinutes).toBe(0)
    expect(continued.lateNightActiveMinutes).toBe(9)
    expect(continuedAgain.lateNightActiveMinutes).toBe(18)
    expect(reset.lateNightActiveMinutes).toBe(0)
    expect(reset.state.lateNightActivityStartedAt).toBeNull()
  })
})
