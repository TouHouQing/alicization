import type { LifeInputReadSet, LifeMutation, LifeStateView } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

import { LifeStateConflictError } from './life-state-conflict'

const ingressId = v.pipe(v.string(), v.startsWith('user:'), v.maxLength(512))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
export const lifeInputReadSetSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('active-input'), ingressId, payloadHash: hash, inputHash: hash }),
  v.strictObject({ kind: v.literal('absent-input'), ingressId }),
])

/** Capture both the presence and absence of this turn's current user input. */
export function createLifeInputReadSet(view: LifeStateView, turnId: string): LifeInputReadSet {
  const id = `user:${turnId}`
  const source = view.ingress.find(item => item.id === id)
  if (!source)
    return v.parse(lifeInputReadSetSchema, { kind: 'absent-input', ingressId: id })
  if (source.kind !== 'user-turn' || !['accepted', 'processing'].includes(source.status))
    throw new LifeStateConflictError('Current reply input is no longer active')
  return v.parse(lifeInputReadSetSchema, { kind: 'active-input', ingressId: id, payloadHash: source.payloadHash, inputHash: source.payload.inputHash })
}

export function lifeInputReadAssertion(readSet: LifeInputReadSet): Extract<LifeMutation, { type: 'input-assert-current' }> {
  return { type: 'input-assert-current', readSet: structuredClone(readSet) }
}

/** Called inside the same SQLite transaction that certifies or publishes text. */
export async function assertLifeInputReadSet(tx: Pick<LifeTransaction, 'cardId' | 'get'>, raw: LifeInputReadSet) {
  const readSet = v.parse(lifeInputReadSetSchema, raw)
  const source = await tx.get<{ kind: string, status: string, payload_hash: string, payload_ref_json: string }>('SELECT kind,status,payload_hash,payload_ref_json FROM life_ingress WHERE card_id = ? AND ingress_id = ?', [tx.cardId, readSet.ingressId])
  if (readSet.kind === 'absent-input') {
    if (source)
      throw new LifeStateConflictError('Previously absent reply input appeared before commit')
    return
  }
  if (!source || source.kind !== 'user-turn' || !['accepted', 'processing'].includes(source.status) || source.payload_hash !== readSet.payloadHash || createHash('sha256').update(source.payload_ref_json).digest('hex') !== readSet.payloadHash)
    throw new LifeStateConflictError('Current reply input was ended, withdrawn or changed before commit')
  const payload = await tx.get<{ input_hash: string, body_json: string, lifecycle: string }>('SELECT input_hash,body_json,lifecycle FROM life_input_payloads WHERE card_id = ? AND ingress_id = ?', [tx.cardId, readSet.ingressId])
  if (!payload || payload.lifecycle !== 'active' || payload.input_hash !== readSet.inputHash || JSON.parse(source.payload_ref_json).inputHash !== readSet.inputHash || createHash('sha256').update(payload.body_json).digest('hex') !== readSet.inputHash)
    throw new LifeStateConflictError('Current reply input payload is unavailable or changed before commit')
}
