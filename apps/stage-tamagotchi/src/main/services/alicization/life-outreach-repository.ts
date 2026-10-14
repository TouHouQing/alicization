import type { LifeMutation, LifeOutreachPolicy } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import { createDefaultLifeOutreachPolicy } from '../../../shared/life-contracts'
import { createLifeQuietBoundary, readLifeQuietBoundary, requestsQuietCompanionship } from './life-interaction-boundary'
import { assertLifeId, boundedJson } from './life-transaction'

export const defaultLifeOutreachPolicy = createDefaultLifeOutreachPolicy

function validatePolicy(policy: LifeOutreachPolicy) {
  if (!Number.isSafeInteger(policy.maximumPerDay) || policy.maximumPerDay < 0 || policy.maximumPerDay > 20 || !Number.isSafeInteger(policy.minimumIntervalMinutes) || policy.minimumIntervalMinutes < 15 || policy.minimumIntervalMinutes > 1440 || ![policy.quietStartHour, policy.quietEndHour].every(hour => Number.isInteger(hour) && hour >= 0 && hour < 24) || typeof policy.quietEnabled !== 'boolean')
    throw new TypeError('Initiative policy is outside its allowed bounds')
  new Intl.DateTimeFormat('en', { timeZone: policy.timezone }).format(0)
}

export function evaluateLifeOutreach(input: { policy: LifeOutreachPolicy, now: number, heldByHost?: boolean, dayKey?: string, count?: number, lastAt?: number, evidenceKey: string, recentEvidence?: string[] }) {
  validatePolicy(input.policy)
  const local = new Intl.DateTimeFormat('en-CA', { timeZone: input.policy.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(input.now)
  const component = (kind: Intl.DateTimeFormatPartTypes) => local.find(part => part.type === kind)!.value
  const day = `${component('year')}-${component('month')}-${component('day')}`
  const hour = Number(component('hour'))
  const count = input.dayKey === day ? input.count ?? 0 : 0
  const quiet = input.policy.quietEnabled && (input.policy.quietStartHour < input.policy.quietEndHour ? hour >= input.policy.quietStartHour && hour < input.policy.quietEndHour : hour >= input.policy.quietStartHour || hour < input.policy.quietEndHour)
  const reason = input.heldByHost ? 'host-quiet-boundary' : quiet ? 'quiet-hours' : count >= input.policy.maximumPerDay ? 'daily-outreach-budget' : input.lastAt != null && input.now - input.lastAt < input.policy.minimumIntervalMinutes * 60_000 ? 'outreach-cooldown' : input.recentEvidence?.includes(input.evidenceKey) ? 'outreach-no-new-evidence' : null
  return { allowed: reason == null, reason, day, count }
}

export async function applyLifeOutreach(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'outreach-reserve' | 'outreach-policy' | 'outreach-boundary' }>) {
  const stored = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', ['life:initiative'])
  const state = stored ? JSON.parse(stored.value) as Record<string, unknown> : {}
  if (input.type === 'outreach-boundary') {
    assertLifeId(input.turnId)
    const source = await tx.get<{ payload_ref_json: string, payload_hash: string, body_json: string, input_hash: string }>(`SELECT i.payload_ref_json, i.payload_hash, p.body_json, p.input_hash FROM life_ingress i JOIN life_input_payloads p ON p.card_id = i.card_id AND p.ingress_id = i.ingress_id WHERE i.card_id = ? AND i.ingress_id = ? AND i.kind = 'user-turn' AND i.source = 'dialogue' AND i.status IN ('accepted', 'processing') AND p.lifecycle = 'active'`, [tx.cardId, `user:${input.turnId}`])
    if (!source)
      throw new Error('Interaction boundary requires a current host input')
    const payload = JSON.parse(source.payload_ref_json) as { turnId: string, inputHash: string }
    if (createHash('sha256').update(source.payload_ref_json).digest('hex') !== source.payload_hash || createHash('sha256').update(source.body_json).digest('hex') !== source.input_hash || payload.inputHash !== source.input_hash || payload.turnId !== input.turnId || requestsQuietCompanionship(JSON.parse(source.body_json)) !== input.quiet)
      throw new Error('Interaction boundary differs from its host input')
    const previous = readLifeQuietBoundary({ 'life:initiative': stored?.value ?? '{}' })
    if (!input.quiet && previous) {
      state.lastQuietInterval = { id: previous.id, beganAt: previous.createdAt, endedAt: tx.now, beganByTurnId: previous.sourceTurnId, endedByTurnId: input.turnId, endingInputHash: payload.inputHash }
    }
    else if (!input.quiet) {
      // Use the actual prior handler settlement, not the time of its request:
      // tools and their answer have already completed before this gap begins.
      const conversationId = (JSON.parse(source.payload_ref_json) as { conversationId?: string }).conversationId
      const settled = await tx.get<{ ingress_id: string, observed_at: number, source_key: string }>(`SELECT marker.ingress_id, marker.observed_at, marker.source_key FROM life_ingress marker JOIN life_ingress host ON host.card_id = marker.card_id AND host.ingress_id = json_extract(marker.payload_ref_json, '$.sourceInputId') WHERE marker.card_id = ? AND marker.kind = 'system' AND marker.source = 'dialogue-settlement' AND marker.status = 'settled' AND host.kind = 'user-turn' AND host.source = 'dialogue' AND host.status = 'settled' AND json_extract(host.payload_ref_json, '$.conversationId') = ? AND marker.observed_at <= ? ORDER BY marker.observed_at DESC, marker.ingress_id DESC LIMIT 1`, [tx.cardId, conversationId ?? '', tx.now])
      if (!settled || tx.now - settled.observed_at < 30_000)
        return
      state.lastQuietInterval = { id: `conversation-gap:${settled.ingress_id}`, beganAt: settled.observed_at, endedAt: tx.now, beganByTurnId: settled.source_key, endedByTurnId: input.turnId, endingInputHash: payload.inputHash }
    }
    state.outreachHold = input.quiet ? createLifeQuietBoundary(tx.cardId, input.turnId, payload.inputHash, tx.now) : null
  }
  else if (input.type === 'outreach-policy') {
    validatePolicy(input.policy)
    if (input.expectedPolicy && boundedJson(state.outreachPolicy ?? defaultLifeOutreachPolicy()) !== boundedJson(input.expectedPolicy))
      throw new Error('Initiative policy changed; reload before saving')
    state.outreachPolicy = input.policy
  }
  else {
    assertLifeId(input.evidenceKey)
    assertLifeId(input.turnId)
    const now = Math.max(tx.now, Number(state.observedAt) || 0, Number(state.lastOutreachAt) || 0)
    const decision = evaluateLifeOutreach({ policy: state.outreachPolicy as LifeOutreachPolicy ?? defaultLifeOutreachPolicy(), heldByHost: Boolean(readLifeQuietBoundary({ 'life:initiative': stored?.value ?? '{}' })), now, dayKey: state.outreachDay as string | undefined, count: state.outreachCount as number | undefined, lastAt: state.lastOutreachAt as number | undefined, evidenceKey: input.evidenceKey, recentEvidence: state.outreachEvidence as string[] | undefined })
    if (!decision.allowed)
      throw new Error(`Initiative held: ${decision.reason}`)
    state.outreachDay = decision.day
    state.outreachCount = decision.count + 1
    state.lastOutreachAt = now
    state.lastOutreachTurnId = input.turnId
    state.outreachEvidence = [...state.outreachEvidence as string[] ?? [], input.evidenceKey].slice(-64)
  }
  await tx.updateOwner({ owner: 'initiative', key: 'life:initiative', value: boundedJson(state) })
}
