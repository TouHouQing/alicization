import type { AlicizationEmotionalTransitionLedgerSnapshot } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import {
  createDefaultProactiveLoopState,
  proactiveDismissCooldownMs,
  recoverProactiveRhythmAfterDream,
  registerProactiveDelivery,
  reportExplicitProactiveFeedback,
  settleExpiredProactiveOutcomes,
  settleProactiveOutcomesOnUserTurnStart,
  updateLateNightActivityState,
} from './proactive-feedback'

describe('proactive feedback loop state', () => {
  const emotionalTransitionLedger = {
    version: 'emotional-transition-ledger-v1',
    createdAt: 1_000,
    turnId: 'turn-reply',
    previousEmotion: 'measured-companionship',
    nextEmotion: 'rest-protective-companionship',
    transitionKind: 'rest-protective-shift',
    axisDeltas: {
      valence: -0.1,
      arousal: -0.18,
      guardedness: 0.14,
      closenessDrive: -0.24,
      repairNeed: 0.04,
      initiativePressure: -0.42,
    },
    changedAxes: ['closenessDrive', 'initiativePressure'],
    sourceTags: ['rest-protective'],
    decayPolicy: {
      mode: 'protect-rest-window',
      carryTtlMs: 3_600_000,
      reason: 'Rest protection should keep initiative quiet.',
    },
    memoryWriteback: {
      shouldWrite: true,
      lane: 'rest-protection',
      reason: 'Rest-protective initiative pressure should be available to later recall.',
    },
    initiativeSuppression: {
      shouldSuppress: true,
      mode: 'rest-guard',
      reason: 'Rest-protective emotion should suppress outward initiative during the rest window.',
    },
    embodimentDrive: {
      shouldDrive: true,
      tone: 'rest-protective',
      reason: 'The body should stay quiet and rest-protective.',
    },
    traceSummary: 'rest-protective-shift cooled initiative pressure',
    replayLine: 'emotion_initiative_suppression:rest-guard',
  } satisfies AlicizationEmotionalTransitionLedgerSnapshot

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
      learningAction: 'verify',
      learningFocuses: ['world-model'],
      emotionalTransitionLedger,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [{
          kind: 'afterglow',
          intensity: 0.72,
          persistence: 0.66,
          confidence: 0.82,
          polarity: 'warm',
          releaseMode: 'delay-until-open-window',
          summary: 'This proactive reopen should stay gentle and same-line.',
          sourceSignals: ['proactive-feedback-window'],
          lastUpdatedAt: 1_000,
        }],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.72,
        repairPressure: 0.16,
        burdenPressure: 0.08,
        trustPressure: 0.54,
        restProtectivePressure: 0.06,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.46,
          repairRecovery: 0.22,
          afterglowCarry: 0.71,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          overreachRisk: 0.14,
          fatigueGuard: 0.08,
          reasonTags: ['proactive-feedback-window', 'same-living-line'],
          summary: 'Keep the initiative gentle and on the continuity state.',
        },
        sourceSignals: ['proactive-feedback-window'],
        summary: 'Measured return remains the right proactive cadence.',
      },
    })
    const settled = settleProactiveOutcomesOnUserTurnStart(state, 20_000)

    expect(settled.appliedOutcomes[0]?.outcome).toBe('reply-within-120s')
    expect(settled.appliedOutcomes[0]).toEqual(expect.objectContaining({
      learningAction: 'verify',
      learningFocuses: ['world-model'],
      emotionalTransitionLedger: expect.objectContaining({
        transitionKind: 'rest-protective-shift',
        memoryWriteback: expect.objectContaining({
          lane: 'rest-protection',
        }),
        initiativeSuppression: expect.objectContaining({
          mode: 'rest-guard',
        }),
        embodimentDrive: expect.objectContaining({
          tone: 'rest-protective',
        }),
      }),
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'afterglow',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'measured-return',
        }),
      }),
    }))
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

  it('lets dream recovery cool momentum without erasing initiative trust', () => {
    const recovered = recoverProactiveRhythmAfterDream({
      ...createDefaultProactiveLoopState(1_000),
      openingMomentum: 0.74,
      initiativeTrust: 0.62,
      lateNightActivityStartedAt: 100,
      lateNightActivityLastActiveAt: 900,
    }, 5_000)

    expect(recovered.openingMomentum).toBeLessThan(0.74)
    expect(recovered.initiativeTrust).toBeGreaterThan(0.5)
    expect(recovered.lateNightActivityStartedAt).toBeNull()
    expect(recovered.lateNightActivityLastActiveAt).toBeNull()
  })
})
