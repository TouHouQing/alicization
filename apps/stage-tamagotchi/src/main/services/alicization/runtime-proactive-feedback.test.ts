import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeProactiveFeedback } from './runtime-proactive-feedback'

describe('runtime proactive feedback', () => {
  it('settles reply-within-120s feedback from the next user turn and queues follow-up wake', async () => {
    const persistProactiveLoopState = vi.fn(async (_cardId, state) => state)
    const syncSessionMirrorFromCurrentCardState = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const persistOutcomeClosure = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const runtime = createAlicizationRuntimeProactiveFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      ensureProactiveLoopState: async () => ({
        globalCooldownUntil: 0,
        scenarioBias: {
          coding: 0,
          media: 0,
          'late-night-care': 0,
          general: 0,
        },
        consecutiveIgnored: {
          coding: 0,
          media: 0,
          'late-night-care': 0,
          general: 0,
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
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'proactive-feedback-settled',
    }), 'card-1')
    expect(persistOutcomeClosure).toHaveBeenCalled()
    expect(queueSubconsciousWake).toHaveBeenCalledWith('card-1', 'feedback:user-turn-settlement', 600)
  })

  it('settles ignored proactive outcomes after the timeout window', async () => {
    const persistProactiveLoopState = vi.fn(async (_cardId, state) => state)
    const runtime = createAlicizationRuntimeProactiveFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      ensureProactiveLoopState: async () => ({
        globalCooldownUntil: 0,
        scenarioBias: {
          coding: 0,
          media: 0,
          'late-night-care': 0,
          general: 0,
        },
        consecutiveIgnored: {
          coding: 0,
          media: 0,
          'late-night-care': 0,
          general: 0,
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
  })
})
