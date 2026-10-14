import type { LifeMutation } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { assertLifeId, boundedJson } from './life-transaction'

export interface LifeSurfaceRegistration { id: string, surface: string, issuedAt: number }

export async function applyLifeBody(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'surface-register' | 'body-health' }>) {
  assertLifeId(input.sessionId)
  const stored = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', ['life:expression'])
  const state = stored?.value ? JSON.parse(stored.value) as { surfaces?: LifeSurfaceRegistration[], body?: unknown } : {}
  if (input.type === 'surface-register') {
    assertLifeId(input.surface)
    await tx.run('INSERT INTO life_surface_sessions(card_id, session_id, surface, issued_at) VALUES (?, ?, ?, ?)', [tx.cardId, input.sessionId, input.surface, tx.now])
    state.surfaces = [...state.surfaces ?? [], { id: input.sessionId, surface: input.surface, issuedAt: tx.now }].slice(-64)
  }
  else {
    if (!await tx.get('SELECT 1 FROM life_surface_sessions WHERE card_id = ? AND session_id = ?', [tx.cardId, input.sessionId]))
      throw new Error('Body health requires an issued surface session')
    state.body = { ...input.health, surfaceSessionId: input.sessionId, observedAt: tx.now }
  }
  await tx.updateOwner({ owner: 'expression', key: 'life:expression', value: boundedJson(state) })
}
