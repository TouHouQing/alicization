import type { AlicizationAuditLogInput } from '../../../shared/eventa'

import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { buildProactiveFeedbackOutcomeClosure } from './outcome-reinforcement'

import { settleExpiredProactiveOutcomes, settleProactiveOutcomesOnUserTurnStart } from './proactive-feedback'

interface CreateAlicizationRuntimeProactiveFeedbackOptions {
  normalizeCardId: (raw: unknown) => string
  ensureProactiveLoopState: (cardIdRaw: unknown) => Promise<AlicizationProactiveLoopState>
  persistProactiveLoopState: (cardIdRaw: unknown, state: AlicizationProactiveLoopState) => Promise<void>
  syncSessionMirrorFromCurrentCardState: (input: {
    cardId: string
    source: string
    proactiveOutcomes: AlicizationProactiveLoopState['recentOutcomes']
    turnId: string
  }) => Promise<void>
  buildMainGatewayAgentTurnId: (kind: string, source: string, cardId: string, at: number) => string
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  persistOutcomeClosure: (cardIdRaw: unknown, input: ReturnType<typeof buildProactiveFeedbackOutcomeClosure>) => Promise<void>
  buildProactiveFeedbackOutcomeClosure: typeof buildProactiveFeedbackOutcomeClosure
  queueSubconsciousWake: (cardIdRaw: unknown, reason: string, delayMs?: number) => void
}

export function createAlicizationRuntimeProactiveFeedback(
  options: CreateAlicizationRuntimeProactiveFeedbackOptions,
) {
  const settlePendingProactiveOutcomesFromUserTurn = async (cardIdRaw: unknown, at: number, source: string) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    const current = await options.ensureProactiveLoopState(cardId)
    const settled = settleProactiveOutcomesOnUserTurnStart(current, at)
    if (settled.appliedOutcomes.length === 0)
      return settled.state

    await options.persistProactiveLoopState(cardId, settled.state)
    await options.syncSessionMirrorFromCurrentCardState({
      cardId,
      source: 'proactive-feedback',
      proactiveOutcomes: settled.appliedOutcomes,
      turnId: options.buildMainGatewayAgentTurnId('proactive-feedback', source, cardId, at),
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
    const current = await options.ensureProactiveLoopState(cardId)
    const settled = settleExpiredProactiveOutcomes(current, at)
    if (settled.appliedOutcomes.length === 0)
      return settled.state

    await options.persistProactiveLoopState(cardId, settled.state)
    await options.syncSessionMirrorFromCurrentCardState({
      cardId,
      source: 'proactive-feedback',
      proactiveOutcomes: settled.appliedOutcomes,
      turnId: options.buildMainGatewayAgentTurnId('proactive-feedback', source, cardId, at),
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
