import type { ExecutionWorkProposal } from '../../../../shared/execution-contracts'
import type { AlicizationDbService } from '../db'
import type { createWorkPlanExecutionRuntime } from '../execution/work-plan-execution-runtime'

import { tool } from '@xsai/tool'
import { z } from 'zod'

import { executionDigest } from '../execution/acceptance-compiler'
import { declaredWorkParameters, normalizeWorkProposal } from '../execution/work-plan-tool'
import { scheduledWorkIdentity } from '../execution/work-schedule'
import { readLifeInputText } from '../life-input-preview'
import { createLifeInputReadSet, lifeInputReadAssertion } from '../life-input-read-set'

export const automationParameters = declaredWorkParameters.extend({ firstRunAt: z.string().datetime({ offset: true }), intervalMinutes: z.number().int().min(1).max(525600).optional(), maxRuns: z.number().int().min(1).max(16).default(1) }).strict()
export type WorkAutomationInput = z.input<typeof automationParameters>

function substitute(value: unknown, run: number, at: number): unknown {
  if (typeof value === 'string')
    return value.replaceAll('{{run}}', String(run)).replaceAll('{{scheduled_at}}', new Date(at).toISOString()).replaceAll('{{utc_date}}', new Date(at).toISOString().slice(0, 10))
  if (Array.isArray(value))
    return value.map(item => substitute(item, run, at))
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item, run, at)]))
  return value
}

/** Hermes bounded automation semantics, backed by ordinary accepted work plans. */
export function createWorkAutomationRuntime(options: { database: () => AlicizationDbService, work: () => ReturnType<typeof createWorkPlanExecutionRuntime>, enabled: (cardId: string) => boolean }) {
  async function schedule(input: WorkAutomationInput, context: { cardId: string, turnId: string, signal?: AbortSignal }) {
    const parsed = automationParameters.parse(input)
    const first = Date.parse(parsed.firstRunAt)
    const count = parsed.maxRuns
    const interval = (parsed.intervalMinutes ?? 0) * 60000
    const now = Date.now()
    if (first <= now || first + interval * (count - 1) > now + 366 * 86400000 || (count > 1 && !interval))
      throw new Error('Automation requires a future first run, an interval for repeats, and a horizon within 366 days')
    const db = options.database()
    const source = await db.getLifeIngress(`user:${context.turnId}`)
    const message = await db.getLifeUserInput(`user:${context.turnId}`)
    if (!options.enabled(context.cardId) || (await db.readLifeState()).cardId !== context.cardId || !source || !['accepted', 'processing'].includes(source.status) || !message)
      throw new Error('Automation requires its current active user authority')
    const request = readLifeInputText(message).text ?? ''
    if (!/定时|定期|每天|每周|每隔|自动|稍后|分钟后|小时后|明天|后天|\b(?:schedule|every|later|tomorrow|recurring)\b/iu.test(request))
      throw new Error('The current request did not ask for scheduled work')
    const groupId = `automation:${executionDigest({ cardId: context.cardId, turnId: context.turnId, input: parsed })}`
    const proposals: ExecutionWorkProposal[] = []
    const occurrences = []
    for (let index = 0; index < count; index++) {
      const at = first + interval * index
      const values = substitute({ goal: parsed.goal, criteria: parsed.criteria, steps: parsed.steps }, index + 1, at) as z.infer<typeof declaredWorkParameters>
      const proposal = normalizeWorkProposal({ ...values, goal: `${values.goal}（${index + 1}/${count}，${new Date(at).toISOString()}）` })
      proposals.push(proposal)
      occurrences.push({ at, planId: `plan:${scheduledWorkIdentity(context.cardId, context.turnId, proposal.goal, at)}`, proposalHash: executionDigest(proposal) })
    }
    const prior = await db.getLifeIngress(groupId)
    if (prior?.status === 'settled')
      return { status: 'scheduled', groupId, occurrences, reused: true, missedPolicy: 'latest-only' }
    if (prior)
      throw new Error('An incomplete automation remains held; cancel it before scheduling a replacement')
    const before = await db.readLifeState()
    const active = before.execution?.plans.filter(plan => plan.schedule && before.obligations.some(goal => goal.id === plan.rootObligationId && !['fulfilled', 'cancelled', 'superseded', 'failed'].includes(goal.status))) ?? []
    if (active.length + count > 64)
      throw new Error('Scheduled work exceeds the active automation budget')
    await db.commitLifeState({ cardId: context.cardId, operationKey: groupId, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: groupId, kind: 'system', source: 'agent-work-schedule', sourceKey: groupId, occurredAt: now, payload: { cardId: context.cardId, turnId: context.turnId, sourceInputId: source.id, sourcePayloadHash: source.payloadHash, occurrences, missedPolicy: 'latest-only' } } }] })
    try {
      for (const [index, proposal] of proposals.entries()) {
        context.signal?.throwIfAborted()
        await options.work().propose({ ...proposal, cardId: context.cardId, turnId: context.turnId, abortSignal: context.signal, schedule: { at: occurrences[index]!.at, groupId, index } })
      }
      const view = await db.readLifeState()
      await db.commitLifeState({ cardId: context.cardId, operationKey: `${groupId}:admitted`, changes: [], mutations: [{ type: 'ingress-settle', id: groupId, status: 'settled', expectedStatus: 'accepted' }, lifeInputReadAssertion(createLifeInputReadSet(view, context.turnId))] })
      void options.work().wakeReady()
      return { status: 'scheduled', groupId, occurrences, missedPolicy: 'latest-only', expiresAfterRuns: count }
    }
    catch (error) {
      await db.commitLifeState({ cardId: context.cardId, operationKey: `${groupId}:held`, changes: [], mutations: [{ type: 'ingress-settle', id: groupId, status: 'held' }] })
      throw error
    }
  }
  async function list(cardId: string) {
    const view = await options.database().readLifeState()
    if (view.cardId !== cardId)
      throw new Error('Automation lookup crossed its life owner')
    return (view.execution?.plans ?? []).filter(plan => plan.schedule).map(plan => ({ groupId: plan.schedule!.groupId, index: plan.schedule!.index, at: plan.schedule!.at, planId: plan.id, revision: plan.revision, goal: view.obligations.find(goal => goal.id === plan.rootObligationId)?.summary, status: view.obligations.find(goal => goal.id === plan.rootObligationId)?.status }))
  }
  async function cancel(groupId: string, cardId: string) {
    const db = options.database()
    const source = await db.getLifeIngress(groupId)
    if (!source || source.source !== 'agent-work-schedule' || source.payload.cardId !== cardId)
      throw new Error('Automation does not belong to this life owner')
    const stopId = `${groupId}:stop`
    if (!await db.getLifeIngress(stopId))
      await db.commitLifeState({ cardId, operationKey: stopId, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: stopId, kind: 'system', source: 'agent-work-schedule-stop', sourceKey: stopId, occurredAt: Date.now(), payload: { cardId, groupId } } }, { type: 'ingress-settle', id: stopId, status: 'settled' }] })
    const results = []
    for (const plan of (await list(cardId)).filter(plan => plan.groupId === groupId && !['fulfilled', 'cancelled', 'superseded'].includes(plan.status ?? ''))) {
      results.push(await options.work().stop({ cardId, planId: plan.planId, expectedRevision: plan.revision, requestId: `automation-stop:${executionDigest({ groupId, planId: plan.planId, revision: plan.revision })}`, action: 'cancel' }))
    }
    return { status: results.some(result => 'stopped' in result && result.stopped === false) ? 'stopping' : 'cancelled', groupId, stoppedOccurrences: results.length }
  }
  return { schedule, list, cancel }
}

export function createWorkAutomationTools(options: { context: { cardId: string, turnId: string }, schedule: (input: WorkAutomationInput, signal?: AbortSignal) => Promise<unknown>, list: () => Promise<unknown>, cancel: (id: string) => Promise<unknown> }) {
  return [
    tool({ name: 'life_schedule_work', description: 'Schedule an explicitly requested independently verifiable work plan. firstRunAt is ISO 8601 with timezone. Optional elapsed intervalMinutes and maxRuns (1–16) bound repeats within 366 days. String slots {{run}}, {{scheduled_at}}, {{utc_date}} bind to each admitted occurrence before hashes are computed. Each run uses ordinary risk/cancellation and independent result verification. Missed runs coalesce to the most recent due occurrence. This executes work, unlike a reminder. Do not schedule unless the user requested it.', parameters: automationParameters, execute: (input, execution) => options.schedule(input, execution?.abortSignal) }),
    tool({ name: 'life_list_automations', description: 'Read this personality\'s scheduled work and actual per-occurrence state.', parameters: z.object({}).strict(), execute: () => options.list() }),
    tool({ name: 'life_cancel_automation', description: 'Stop future and running occurrences of one exact automation group. Unknown running effects remain subject to reconciliation.', parameters: z.object({ groupId: z.string().regex(/^automation:[a-f\d]{64}$/u) }).strict(), execute: input => options.cancel(input.groupId) }),
  ]
}
