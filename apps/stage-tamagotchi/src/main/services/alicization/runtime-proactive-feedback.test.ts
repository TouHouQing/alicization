import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeProactiveFeedback } from './runtime-proactive-feedback'

describe('runtime proactive feedback', () => {
  it('settles reply-within-120s feedback from the next user turn and queues follow-up wake', async () => {
    const persistProactiveLoopState = vi.fn(async (_cardId, state) => state)
    const syncSessionMirrorFromCurrentCardState = vi.fn(async () => {})
    const syncSettledProactiveContinuityIntoActiveSession = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const persistOutcomeClosure = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const runtime = createAlicizationRuntimeProactiveFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      ensureProactiveLoopState: async () => ({
        globalCooldownUntil: 0,
        scenarioBias: {
          'coding': 0,
          'media': 0,
          'late-night-care': 0,
          'general': 0,
        },
        consecutiveIgnored: {
          'coding': 0,
          'media': 0,
          'late-night-care': 0,
          'general': 0,
        },
        initiativeTrust: 0.5,
        openingMomentum: 0.4,
        lastProactiveTurnAt: 1,
        lateNightActivityStartedAt: null,
        lateNightActivityLastActiveAt: null,
        pendingOutcomes: [{
          turnId: 'turn-proactive',
          scenario: 'coding',
          deliveredAt: 0,
          feedbackWindowMs: 120_000,
        }],
        recentOutcomes: [],
        updatedAt: 0,
      }),
      persistProactiveLoopState,
      syncSessionMirrorFromCurrentCardState,
      syncSettledProactiveContinuityIntoActiveSession,
      buildMainGatewayAgentTurnId: (kind, source, cardId, at) => `${kind}:${source}:${cardId}:${at}`,
      appendAuditLog,
      persistOutcomeClosure,
      buildProactiveFeedbackOutcomeClosure: input => input as any,
      queueSubconsciousWake,
    })

    const next = await runtime.settlePendingProactiveOutcomesFromUserTurn('card-1', 10, 'append-conversation-turn')

    expect(next.recentOutcomes.at(-1)?.outcome).toBe('reply-within-120s')
    expect(syncSessionMirrorFromCurrentCardState).toHaveBeenCalledWith(expect.objectContaining({
      source: 'proactive-feedback',
    }))
    expect(syncSettledProactiveContinuityIntoActiveSession).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      source: 'proactive-feedback',
      proactiveOutcomes: [
        expect.objectContaining({
          turnId: 'turn-proactive',
          outcome: 'reply-within-120s',
        }),
      ],
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'proactive-feedback-settled',
    }), 'card-1')
    expect(persistOutcomeClosure).toHaveBeenCalled()
    expect(queueSubconsciousWake).toHaveBeenCalledWith('card-1', 'feedback:user-turn-settlement', 600)
  })

  it('settles ignored proactive outcomes after the timeout window', async () => {
    const persistProactiveLoopState = vi.fn(async (_cardId, state) => state)
    const applyCurrentCardProactiveState = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeProactiveFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      ensureProactiveLoopState: async () => ({
        globalCooldownUntil: 0,
        scenarioBias: {
          'coding': 0,
          'media': 0,
          'late-night-care': 0,
          'general': 0,
        },
        consecutiveIgnored: {
          'coding': 0,
          'media': 0,
          'late-night-care': 0,
          'general': 0,
        },
        initiativeTrust: 0.5,
        openingMomentum: 0.4,
        lastProactiveTurnAt: 1,
        lateNightActivityStartedAt: null,
        lateNightActivityLastActiveAt: null,
        pendingOutcomes: [{
          turnId: 'turn-proactive',
          scenario: 'coding',
          deliveredAt: 0,
          feedbackWindowMs: 120_000,
        }],
        recentOutcomes: [],
        updatedAt: 0,
      }),
      persistProactiveLoopState,
      applyCurrentCardProactiveState,
      syncSessionMirrorFromCurrentCardState: async () => {},
      buildMainGatewayAgentTurnId: (kind, source, cardId, at) => `${kind}:${source}:${cardId}:${at}`,
      appendAuditLog: async () => {},
      persistOutcomeClosure: async () => {},
      buildProactiveFeedbackOutcomeClosure: input => input as any,
      queueSubconsciousWake: () => {},
    })

    const next = await runtime.settleExpiredPendingProactiveOutcomes('card-1', 10 * 60_000 + 1, 'subconscious-tick')

    expect(next.recentOutcomes.at(-1)?.outcome).toBe('ignored')
    expect(persistProactiveLoopState).toHaveBeenCalled()
    expect(applyCurrentCardProactiveState).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      source: 'subconscious-tick',
      state: expect.objectContaining({
        recentOutcomes: expect.arrayContaining([
          expect.objectContaining({
            turnId: 'turn-proactive',
            outcome: 'ignored',
          }),
        ]),
      }),
    }))
  })

  it('reconstructs the latest pending proactive delivery when user turn settlement arrives before loop-state persistence catches up', async () => {
    const persistProactiveLoopState = vi.fn(async (_cardId, state) => state)
    const buildProactiveFeedbackOutcomeClosure = vi.fn(input => input as any)
    const runtime = createAlicizationRuntimeProactiveFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      ensureProactiveLoopState: async () => ({
        globalCooldownUntil: 0,
        scenarioBias: {
          'coding': 0,
          'media': 0,
          'late-night-care': 0,
          'general': 0,
        },
        consecutiveIgnored: {
          'coding': 0,
          'media': 0,
          'late-night-care': 0,
          'general': 0,
        },
        initiativeTrust: 0.5,
        openingMomentum: 0.4,
        lastProactiveTurnAt: null,
        lateNightActivityStartedAt: null,
        lateNightActivityLastActiveAt: null,
        pendingOutcomes: [],
        recentOutcomes: [],
        updatedAt: 0,
      }),
      persistProactiveLoopState,
      peekLatestPendingProactiveDelivery: () => ({
        turnId: 'turn-proactive-lagging',
        createdAt: 100,
        scenario: 'coding',
        feedbackWindowMs: 120_000,
        learningAction: 'verify',
        learningFocuses: ['world-model'],
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 100,
          residues: [{
            kind: 'afterglow',
            intensity: 0.75,
            persistence: 0.68,
            confidence: 0.83,
            polarity: 'warm',
            releaseMode: 'delay-until-open-window',
            summary: 'The proactive coding return should stay measured.',
            sourceSignals: ['dialogue-delivery-pending-snapshot'],
            lastUpdatedAt: 100,
          }],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.75,
          repairPressure: 0.18,
          burdenPressure: 0.06,
          trustPressure: 0.56,
          restProtectivePressure: 0.04,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.47,
            repairRecovery: 0.21,
            afterglowCarry: 0.73,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            overreachRisk: 0.11,
            fatigueGuard: 0.07,
            reasonTags: ['dialogue-delivery-pending-snapshot', 'same-living-line'],
            summary: 'Let the proactive reopen stay gentle and same-line.',
          },
          sourceSignals: ['dialogue-delivery-pending-snapshot'],
          summary: 'A measured-return afterglow still shapes this proactive callback.',
        },
      }),
      syncSessionMirrorFromCurrentCardState: async () => {},
      buildMainGatewayAgentTurnId: (kind, source, cardId, at) => `${kind}:${source}:${cardId}:${at}`,
      appendAuditLog: async () => {},
      persistOutcomeClosure: async () => {},
      buildProactiveFeedbackOutcomeClosure,
      queueSubconsciousWake: () => {},
    })

    const next = await runtime.settlePendingProactiveOutcomesFromUserTurn('card-1', 110, 'chat-start')

    expect(next.recentOutcomes.at(-1)).toEqual(expect.objectContaining({
      turnId: 'turn-proactive-lagging',
      outcome: 'reply-within-120s',
      learningAction: 'verify',
      learningFocuses: ['world-model'],
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'afterglow',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'measured-return',
        }),
      }),
    }))
    expect(buildProactiveFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      outcomes: [
        expect.objectContaining({
          turnId: 'turn-proactive-lagging',
          affectiveResidue: expect.objectContaining({
            dominantResidueKind: 'afterglow',
            relationshipCadence: expect.objectContaining({
              cadenceMode: 'measured-return',
            }),
          }),
        }),
      ],
    }))
    expect(persistProactiveLoopState).toHaveBeenCalled()
  })

  it('carries proactive visible dialogue and the next host reply into settled outcomes so later humanlike memory can remember the lived exchange instead of only outcome labels', async () => {
    const persistProactiveLoopState = vi.fn(async (_cardId, state) => state)
    const buildProactiveFeedbackOutcomeClosure = vi.fn(input => input as any)
    const runtime = createAlicizationRuntimeProactiveFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      ensureProactiveLoopState: async () => ({
        globalCooldownUntil: 0,
        scenarioBias: {
          'coding': 0,
          'media': 0,
          'late-night-care': 0,
          'general': 0,
        },
        consecutiveIgnored: {
          'coding': 0,
          'media': 0,
          'late-night-care': 0,
          'general': 0,
        },
        initiativeTrust: 0.5,
        openingMomentum: 0.4,
        lastProactiveTurnAt: 1,
        lateNightActivityStartedAt: null,
        lateNightActivityLastActiveAt: null,
        pendingOutcomes: [{
          turnId: 'turn-proactive-lived-dialogue',
          scenario: 'coding',
          deliveredAt: 0,
          feedbackWindowMs: 120_000,
          assistantText: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
        }],
        recentOutcomes: [],
        updatedAt: 0,
      }),
      persistProactiveLoopState,
      syncSessionMirrorFromCurrentCardState: async () => {},
      buildMainGatewayAgentTurnId: (kind, source, cardId, at) => `${kind}:${source}:${cardId}:${at}`,
      appendAuditLog: async () => {},
      persistOutcomeClosure: async () => {},
      buildProactiveFeedbackOutcomeClosure,
      queueSubconsciousWake: () => {},
    })

    const next = await runtime.settlePendingProactiveOutcomesFromUserTurn('card-1', 110, 'chat-start', {
      userText: '先别催，但这条线你可以中性可见占位。',
    })

    expect(next.recentOutcomes.at(-1)).toEqual(expect.objectContaining({
      turnId: 'turn-proactive-lived-dialogue',
      outcome: 'reply-within-120s',
      assistantText: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
      userText: '先别催，但这条线你可以中性可见占位。',
    }))
    expect(buildProactiveFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      outcomes: [
        expect.objectContaining({
          turnId: 'turn-proactive-lived-dialogue',
          assistantText: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
          userText: '先别催，但这条线你可以中性可见占位。',
        }),
      ],
    }))
  })
})
