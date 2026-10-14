import type { LifeIngress, LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'

import { readLifeConversationTimeline } from './life-conversation-timeline'
import { readLifeInputText } from './life-input-preview'
import { readLifeQuietInterval, requestsQuietIntervalRecall } from './life-interaction-boundary'
import { readLifePastExecution, requestsLifePastRecall } from './life-past-execution'

/** Source-backed short-term recall is supplied before generation, independently of chat compression. */
export async function readLifeConversationRecallContext(view: LifeStateView, ports: {
  getIngress: (id: string) => Promise<LifeIngress | null>
  readUserInput: (id: string) => Promise<Record<string, unknown> | null>
  readConversationStatements?: (conversationId: string) => Promise<Array<{ turnId: string, text: string, occurredAt: number }>>
}, now: number) {
  const current = view.ingress.filter(event => event.kind === 'user-turn' && event.source === 'dialogue').sort((a, b) => b.occurredAt - a.occurredAt || b.observedAt - a.observedAt)[0]
  if (!current || typeof current.payload.conversationId !== 'string')
    return null
  const message = await ports.readUserInput(current.id).catch(() => null)
  const question = readLifeInputText(message).text
  if (!message || createHash('sha256').update(JSON.stringify(message)).digest('hex') !== current.payload.inputHash || !question || !requestsLifePastRecall(question))
    return null
  const conversationId = current.payload.conversationId
  const [timeline, pastEffects, presented] = await Promise.all([
    readLifeConversationTimeline(view, ports.readUserInput, conversationId),
    readLifePastExecution(view, { question, turnId: String(current.payload.turnId), now }, ports),
    ports.readConversationStatements?.(conversationId) ?? Promise.resolve([]),
  ])
  const prior = timeline.filter(event => event.sourceId !== current.id)
  // This is a host report of return, not evidence of physical-world movement.
  const returned = prior.findLast(event => /^(?:我回来了|我回来啦|我忙完了|I(?:'m| am) back)[，,。.!！\s]/iu.test(event.text.trim()))
  const relation = (at: number) => returned ? at < returned.occurredAt ? 'before-host-reported-return' : at === returned.occurredAt ? 'host-reported-return' : 'after-host-reported-return' : null
  const statements = []
  for (const statement of presented.slice(-6)) {
    const source = await ports.getIngress(`user:${statement.turnId}`)
    if (!source || source.payload.conversationId !== conversationId || statement.occurredAt < source.occurredAt || statement.occurredAt > now || !await ports.readUserInput(source.id).catch(() => null))
      continue
    statements.push({ turnId: statement.turnId, speaker: 'companion', occurredAt: statement.occurredAt, text: statement.text.slice(0, 240), relationToHostReturn: relation(statement.occurredAt) })
  }
  const result = {
    authority: 'source-backed-recent-conversation',
    requestedQuietInterval: requestsQuietIntervalRecall(question) ? readLifeQuietInterval(view.values) : null,
    lastHostReportedReturn: returned ? { sourceId: returned.sourceId, occurredAt: returned.occurredAt } : null,
    timeline: prior.slice(-8).map(event => ({ ...event, speaker: 'host', relationToHostReturn: relation(event.occurredAt) })),
    statements,
    executionObservations: pastEffects.slice(0, 8).sort((a, b) => a.receipt!.observedAt! - b.receipt!.observedAt!).map((effect) => {
      const output = effect.receipt!.output as Record<string, unknown>
      return { effectId: effect.id, sourceTurnId: effect.turnId, observedAt: effect.receipt!.observedAt, relationToHostReturn: relation(effect.receipt!.observedAt!), capability: effect.payload.capabilityId, outcome: effect.receipt!.outcome, lifecycle: effect.status, finalStatus: output.finalStatus, operation: output.operation, path: typeof output.path === 'string' ? output.path.slice(0, 512) : null, errorCode: output.errorCode, summary: typeof output.summary === 'string' ? output.summary.slice(0, 240) : null }
    }),
  }
  // Preserve complete records and their provenance; never cut a JSON fact block.
  while (Buffer.byteLength(JSON.stringify(result), 'utf8') > 4000) {
    if (result.statements.length)
      result.statements.shift()
    else if (result.executionObservations.length > 2)
      result.executionObservations.shift()
    else if (result.timeline.length > 2)
      result.timeline.shift()
    else throw new TypeError('Recent conversation evidence exceeded its bounded context')
  }
  return result
}
