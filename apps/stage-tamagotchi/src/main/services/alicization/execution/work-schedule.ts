import type { ExecutionWorkProposal, WorkPlan } from '../../../../shared/execution-contracts'
import type { LifeIngress } from '../../../../shared/life-contracts'
import type { LifeTransaction } from '../life-transaction'

import { createHash } from 'node:crypto'

import { executionDigest } from './acceptance-compiler'

export function scheduledWorkIdentity(cardId: string, turnId: string, goal: string, at?: number) {
  return executionDigest({ cardId, turnId, goal, ...(at !== undefined ? { scheduledAt: at } : {}) })
}

export async function assertWorkSchedule(getIngress: (id: string) => Promise<LifeIngress | null>, plan: Pick<WorkPlan, 'id' | 'cardId' | 'schedule'>, now: number, preparing?: { turnId: string, proposal: ExecutionWorkProposal }) {
  if (!plan.schedule)
    return
  const { groupId, index, at } = plan.schedule
  if (await getIngress(`${groupId}:stop`))
    throw new Error('Work schedule was stopped')
  const group = await getIngress(groupId)
  if (!group || group.source !== 'agent-work-schedule' || group.kind !== 'system' || group.status !== (preparing ? 'accepted' : 'settled') || group.payload.cardId !== plan.cardId || !Array.isArray(group.payload.occurrences))
    throw new Error('Work schedule is not completely admitted, or was stopped')
  const occurrence = group.payload.occurrences[index] as { at?: number, planId?: string, proposalHash?: string } | undefined
  if (occurrence?.at !== at || occurrence.planId !== plan.id)
    throw new Error('Work occurrence changed its scheduled identity')
  if (preparing && (group.payload.turnId !== preparing.turnId || occurrence.proposalHash !== executionDigest(preparing.proposal)))
    throw new Error('Work occurrence changed its admitted proposal')
  if (!preparing && at > now)
    throw new Error('Work occurrence is not due')
  const origin = typeof group.payload.sourceInputId === 'string' ? await getIngress(group.payload.sourceInputId) : null
  if (!origin || origin.kind !== 'user-turn' || !['accepted', 'processing', 'settled'].includes(origin.status) || origin.payloadHash !== group.payload.sourcePayloadHash)
    throw new Error('Work schedule lost its original user authority')
}

export async function assertWorkScheduleInside(tx: Pick<LifeTransaction, 'get' | 'cardId' | 'now'>, plan: WorkPlan) {
  await assertWorkSchedule(async (id) => {
    const row = await tx.get<{ kind: LifeIngress['kind'], source: string, source_key: string, occurred_at: number, observed_at: number, status: LifeIngress['status'], payload_hash: string, payload_ref_json: string }>('SELECT kind,source,source_key,occurred_at,observed_at,status,payload_hash,payload_ref_json FROM life_ingress WHERE card_id=? AND ingress_id=?', [tx.cardId, id])
    if (!row)
      return null
    if (createHash('sha256').update(row.payload_ref_json).digest('hex') !== row.payload_hash)
      throw new Error('Work schedule source no longer matches its durable hash')
    if (row.kind === 'user-turn' && await tx.get(`SELECT 1 FROM life_input_payloads WHERE card_id=? AND ingress_id=? AND lifecycle IN ('withdrawn','unavailable')`, [tx.cardId, id]))
      return null
    return { id, kind: row.kind, source: row.source, sourceKey: row.source_key, occurredAt: row.occurred_at, observedAt: row.observed_at, status: row.status, payloadHash: row.payload_hash, payload: JSON.parse(row.payload_ref_json) }
  }, plan, tx.now)
}
