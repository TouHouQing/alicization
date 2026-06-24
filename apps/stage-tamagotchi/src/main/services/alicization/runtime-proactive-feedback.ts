import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAuditLogInput,
  AlicizationEmotionalTransitionLedgerSnapshot,
} from '../../../shared/eventa'
import type { buildProactiveFeedbackOutcomeClosure } from './outcome-reinforcement'
import type { AlicizationProactiveLoopState } from './proactive-feedback'

import { registerProactiveDelivery, settleExpiredProactiveOutcomes, settleProactiveOutcomesOnUserTurnStart } from './proactive-feedback'

interface CreateAlicizationRuntimeProactiveFeedbackOptions {
  normalizeCardId: (raw: unknown) => string
  ensureProactiveLoopState: (cardIdRaw: unknown) => Promise<AlicizationProactiveLoopState>
  persistProactiveLoopState: (cardIdRaw: unknown, state: AlicizationProactiveLoopState) => Promise<void>
  applyCurrentCardProactiveState?: (input: {
    cardId: string
    state: AlicizationProactiveLoopState
    source: string
  }) => Promise<void> | void
  peekLatestPendingProactiveDelivery?: (cardIdRaw: unknown) => {
    turnId: string
    createdAt: number
    assistantText?: string | null
    scenario: string | null
    feedbackWindowMs: number | null
    learningAction: 'record' | 'reflect' | 'verify' | 'revise' | 'internalize' | 'hold' | null
    learningFocuses: string[]
    emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
    affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  } | null
  syncSessionMirrorFromCurrentCardState: (input: {
    cardId: string
    source: string
    proactiveOutcomes: AlicizationProactiveLoopState['recentOutcomes']
    turnId: string
  }) => Promise<void>
  syncSettledProactiveContinuityIntoActiveSession?: (input: {
    cardId: string
    source: string
    proactiveOutcomes: AlicizationProactiveLoopState['recentOutcomes']
  }) => Promise<void> | void
  buildMainGatewayAgentTurnId: (kind: string, source: string, cardId: string, at: number) => string
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  persistOutcomeClosure: (cardIdRaw: unknown, input: ReturnType<typeof buildProactiveFeedbackOutcomeClosure>) => Promise<void>
  buildProactiveFeedbackOutcomeClosure: typeof buildProactiveFeedbackOutcomeClosure
  queueSubconsciousWake: (cardIdRaw: unknown, reason: string, delayMs?: number) => void
}

export function createAlicizationRuntimeProactiveFeedback(
  options: CreateAlicizationRuntimeProactiveFeedbackOptions,
) {
  const settlePendingProactiveOutcomesFromUserTurn = async (
    cardIdRaw: unknown,
    at: number,
    source: string,
    carry?: {
      userText?: string | null
    },
  ) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    let current = await options.ensureProactiveLoopState(cardId)
    const reconstructedPendingDelivery = options.peekLatestPendingProactiveDelivery?.(cardId) ?? null
    if (current.pendingOutcomes.length === 0) {
      const latestPendingDelivery = reconstructedPendingDelivery
      if (
        latestPendingDelivery
        && latestPendingDelivery.createdAt > 0
        && latestPendingDelivery.createdAt <= at
        && latestPendingDelivery.feedbackWindowMs
        && latestPendingDelivery.scenario
      ) {
        current = registerProactiveDelivery(current, {
          turnId: latestPendingDelivery.turnId,
          scenario: latestPendingDelivery.scenario as 'coding' | 'media' | 'late-night-care' | 'general',
          deliveredAt: latestPendingDelivery.createdAt,
          feedbackWindowMs: latestPendingDelivery.feedbackWindowMs,
          assistantText: latestPendingDelivery.assistantText ?? null,
          learningAction: latestPendingDelivery.learningAction,
          learningFocuses: latestPendingDelivery.learningFocuses,
          emotionalTransitionLedger: latestPendingDelivery.emotionalTransitionLedger ?? null,
          affectiveResidue: latestPendingDelivery.affectiveResidue ?? null,
        })
        await options.persistProactiveLoopState(cardId, current)
        await options.applyCurrentCardProactiveState?.({
          cardId,
          state: current,
          source: `${source}:reconstructed-pending`,
        })
      }
    }
    const settled = settleProactiveOutcomesOnUserTurnStart(current, at, carry?.userText ?? null)
    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-user-turn-inspected',
      message: 'Inspected proactive state before automatic user-turn settlement.',
      payload: {
        source,
        at,
        pendingOutcomeCount: current.pendingOutcomes.length,
        recentOutcomeCount: current.recentOutcomes.length,
        reconstructedPendingDelivery,
        appliedOutcomeCount: settled.appliedOutcomes.length,
      },
    }, cardId)
    if (settled.appliedOutcomes.length === 0)
      return settled.state

    await options.persistProactiveLoopState(cardId, settled.state)
    await options.applyCurrentCardProactiveState?.({
      cardId,
      state: settled.state,
      source,
    })
    await options.syncSessionMirrorFromCurrentCardState({
      cardId,
      source: 'proactive-feedback',
      proactiveOutcomes: settled.appliedOutcomes,
      turnId: options.buildMainGatewayAgentTurnId('proactive-feedback', source, cardId, at),
    })
    await options.syncSettledProactiveContinuityIntoActiveSession?.({
      cardId,
      source: 'proactive-feedback',
      proactiveOutcomes: settled.appliedOutcomes,
    })
    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-settled',
      message: 'Settled proactive feedback from a direct user reply window.',
      payload: {
        source,
        outcomes: settled.appliedOutcomes,
      },
    }, cardId)
    await options.persistOutcomeClosure(cardId, options.buildProactiveFeedbackOutcomeClosure({
      now: at,
      cardId,
      outcomes: settled.appliedOutcomes,
    }))
    options.queueSubconsciousWake(cardId, 'feedback:user-turn-settlement', 600)
    return settled.state
  }

  const settleExpiredPendingProactiveOutcomes = async (cardIdRaw: unknown, at: number, source: string) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    let current = await options.ensureProactiveLoopState(cardId)
    const reconstructedPendingDelivery = options.peekLatestPendingProactiveDelivery?.(cardId) ?? null
    if (current.pendingOutcomes.length === 0) {
      const latestPendingDelivery = reconstructedPendingDelivery
      if (
        latestPendingDelivery
        && latestPendingDelivery.createdAt > 0
        && latestPendingDelivery.createdAt <= at
        && latestPendingDelivery.feedbackWindowMs
        && latestPendingDelivery.scenario
      ) {
        current = registerProactiveDelivery(current, {
          turnId: latestPendingDelivery.turnId,
          scenario: latestPendingDelivery.scenario as 'coding' | 'media' | 'late-night-care' | 'general',
          deliveredAt: latestPendingDelivery.createdAt,
          feedbackWindowMs: latestPendingDelivery.feedbackWindowMs,
          assistantText: latestPendingDelivery.assistantText ?? null,
          learningAction: latestPendingDelivery.learningAction,
          learningFocuses: latestPendingDelivery.learningFocuses,
          emotionalTransitionLedger: latestPendingDelivery.emotionalTransitionLedger ?? null,
          affectiveResidue: latestPendingDelivery.affectiveResidue ?? null,
        })
        await options.persistProactiveLoopState(cardId, current)
        await options.applyCurrentCardProactiveState?.({
          cardId,
          state: current,
          source: `${source}:reconstructed-pending`,
        })
      }
    }
    const settled = settleExpiredProactiveOutcomes(current, at)
    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-timeout-inspected',
      message: 'Inspected proactive state before automatic timeout settlement.',
      payload: {
        source,
        at,
        pendingOutcomeCount: current.pendingOutcomes.length,
        recentOutcomeCount: current.recentOutcomes.length,
        pendingOutcomes: current.pendingOutcomes,
        reconstructedPendingDelivery,
        appliedOutcomeCount: settled.appliedOutcomes.length,
      },
    }, cardId)
    if (settled.appliedOutcomes.length === 0)
      return settled.state

    await options.persistProactiveLoopState(cardId, settled.state)
    await options.applyCurrentCardProactiveState?.({
      cardId,
      state: settled.state,
      source,
    })
    await options.syncSessionMirrorFromCurrentCardState({
      cardId,
      source: 'proactive-feedback',
      proactiveOutcomes: settled.appliedOutcomes,
      turnId: options.buildMainGatewayAgentTurnId('proactive-feedback', source, cardId, at),
    })
    await options.syncSettledProactiveContinuityIntoActiveSession?.({
      cardId,
      source: 'proactive-feedback',
      proactiveOutcomes: settled.appliedOutcomes,
    })
    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-settled',
      message: 'Settled proactive feedback after reply timeout elapsed.',
      payload: {
        source,
        outcomes: settled.appliedOutcomes,
      },
    }, cardId)
    await options.persistOutcomeClosure(cardId, options.buildProactiveFeedbackOutcomeClosure({
      now: at,
      cardId,
      outcomes: settled.appliedOutcomes,
    }))
    return settled.state
  }

  return {
    settlePendingProactiveOutcomesFromUserTurn,
    settleExpiredPendingProactiveOutcomes,
  }
}
