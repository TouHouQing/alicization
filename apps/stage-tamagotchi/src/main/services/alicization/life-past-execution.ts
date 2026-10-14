import type { LifeEffect, LifeIngress, LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'

type TimedLifePastEffect = LifeEffect & { receipt: NonNullable<LifeEffect['receipt']> & { observedAt: number } }

export function requestsLifePastRecall(question: string) {
  return /回顾|回忆|记得|(?:刚才|之前|先前|当时)[\s\S]{0,50}(?:发生|做过|读过|执行过|做了|说过|问过|说了|要求|告诉|提过)|\b(?:remember|recap|what happened|what did you|did you read|did you say|previously did)\b/iu.test(question)
}

/** Recall uses past observations, never fresh execution or current-state proof. */
export async function readLifePastExecution(view: LifeStateView, input: { question: string, turnId: string, now: number }, ports: { getIngress?: (id: string) => Promise<LifeIngress | null>, readUserInput: (id: string) => Promise<Record<string, unknown> | null> }) {
  if (!ports.getIngress || !requestsLifePastRecall(input.question))
    return []
  const current = await ports.getIngress(`user:${input.turnId}`)
  if (!current?.payload.conversationId)
    return []
  const candidates = view.effects.filter(effect => effect.kind === 'execute' && effect.turnId !== input.turnId && ['settled', 'failed', 'uncertain', 'cancelled'].includes(effect.status) && effect.receipt && typeof effect.receipt.output === 'object' && effect.receipt.output !== null && !Array.isArray(effect.receipt.output)).slice(0, 16)
  const historical: TimedLifePastEffect[] = []
  for (const effect of candidates) {
    const observedAt = effect.receipt!.observedAt
    if (typeof observedAt !== 'number' || !Number.isFinite(observedAt) || observedAt > input.now || input.now - observedAt > 24 * 60 * 60 * 1000)
      continue
    try {
      const source = await ports.getIngress(`user:${effect.turnId}`)
      if (source?.kind !== 'user-turn' || source.source !== 'dialogue' || source.payload.conversationId !== current.payload.conversationId || observedAt < source.occurredAt)
        continue
      const message = await ports.readUserInput(source.id)
      if (message && createHash('sha256').update(JSON.stringify(message)).digest('hex') === source.payload.inputHash)
        historical.push({ ...effect, receipt: { ...effect.receipt!, observedAt } })
    }
    catch {
      // Withdrawn or unavailable source text cannot certify a historical account.
    }
  }
  return historical
}

export function claimsCurrentExecutionState(quote: string) {
  return /现在|目前|当前|此刻|依然|仍然|明天|接下来|\b(?:now|currently|at present|still|tomorrow|next)\b/iu.test(quote)
}
