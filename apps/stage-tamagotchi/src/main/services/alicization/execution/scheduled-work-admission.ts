import type { LifeEffect, LifeStateView } from '../../../../shared/life-contracts'

import { automationParameters } from '../agent-harness/work-automation'
import { executionDigest } from './acceptance-compiler'

/** A complete admitted group proves scheduling, never execution or completion. */
export function scheduledWorkAdmission(view: LifeStateView, effect: LifeEffect, turnId: string) {
  const parsed = automationParameters.safeParse(effect.payload.parameters)
  const output = effect.receipt?.output as Record<string, unknown> | undefined
  if (!parsed.success || output?.status !== 'scheduled' || !Array.isArray(output.occurrences))
    return []
  const groupId = `automation:${executionDigest({ cardId: view.cardId, turnId, input: parsed.data })}`
  const group = view.ingress.find(item => item.id === groupId && item.source === 'agent-work-schedule' && item.status === 'settled')
  if (!group || output.groupId !== groupId || group.payload.sourceInputId !== `user:${turnId}` || view.ingress.some(item => item.id === `${groupId}:stop`) || executionDigest(output.occurrences) !== executionDigest(group.payload.occurrences) || output.occurrences.length !== parsed.data.maxRuns)
    return []
  const source = view.ingress.find(item => item.id === `user:${turnId}`)
  if (!source || source.payloadHash !== group.payload.sourcePayloadHash)
    return []
  const occurrences = output.occurrences as Array<{ at: number, planId: string, proposalHash: string }>
  const plans = occurrences.map((occurrence, index) => view.execution?.plans.find(plan => plan.id === occurrence.planId && plan.schedule?.groupId === groupId && plan.schedule.index === index && plan.schedule.at === occurrence.at && plan.sourceEvidenceRefs.includes(source.id)))
  if (!plans.length || plans.some(plan => !plan || !view.obligations.some(goal => goal.id === plan.rootObligationId && goal.generation === plan.obligationGeneration && !['cancelled', 'failed', 'superseded'].includes(goal.status))))
    return []
  const plan = plans[0]!
  const goal = view.obligations.find(goal => goal.id === plan.rootObligationId)!
  return [{ binding: { kind: 'effect' as const, id: effect.id, version: String(effect.generation) }, responsibility: { kind: 'obligation' as const, id: goal.id, version: String(goal.generation) }, planId: plan.id, planRevision: plan.revision, parametersHash: executionDigest(effect.payload.parameters), scope: 'accepted-schedule-only-no-step-or-goal-completion', schedule: { groupId, occurrences: occurrences.map(({ at, planId }) => ({ at, planId })), missedPolicy: 'latest-only' } }]
}
