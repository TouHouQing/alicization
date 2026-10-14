import type { LifeEvidenceRef, LifeMutation } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash, randomUUID } from 'node:crypto'

import { serializeLifeUserInput } from './life-input-payload'
import { assertLifeMemoryEvidence } from './life-memory-evidence'
import { assertLifeId, assertLifeTime, boundedJson } from './life-transaction'

export async function applyLifeIngress(tx: LifeTransaction, mutation: Extract<LifeMutation, { type: 'ingress-accept' | 'ingress-settle' | 'input-resume' }>) {
  if (mutation.type === 'input-resume') {
    assertLifeId(mutation.childTurnId)
    assertLifeId(mutation.conversationId)
    const parent = await tx.get<{ payload_ref_json: string, payload_hash: string, status: string }>('SELECT payload_ref_json, payload_hash, status FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND kind = \'user-turn\'', [tx.cardId, mutation.parentIngressId])
    if (!parent || parent.status !== 'held' || parent.payload_hash !== mutation.expectedPayloadHash)
      throw new Error('The held input changed before continuation')
    const envelope = JSON.parse(parent.payload_ref_json)
    if (await tx.get('SELECT 1 FROM life_effect_intents WHERE card_id = ? AND turn_id = ? AND kind = \'execute\' AND status NOT IN (\'prepared\',\'cancelled\')', [tx.cardId, envelope.turnId]))
      throw new Error('Prior actions require independent reconciliation before continuing this request')
    const original = await tx.get<{ body_json: string, input_hash: string }>('SELECT body_json, input_hash FROM life_input_payloads WHERE card_id = ? AND ingress_id = ? AND lifecycle = \'active\'', [tx.cardId, mutation.parentIngressId])
    if (!original || createHash('sha256').update(original.body_json).digest('hex') !== original.input_hash || original.input_hash !== envelope.inputHash)
      throw new Error('The original input is unavailable or changed')
    await applyLifeIngress(tx, { type: 'ingress-accept', ingress: { id: `user:${mutation.childTurnId}`, source: 'dialogue', sourceKey: mutation.childTurnId, kind: 'user-turn', occurredAt: tx.now, payload: { turnId: mutation.childTurnId, conversationId: mutation.conversationId, originalConversationId: envelope.conversationId, inputHash: original.input_hash, currentMessage: JSON.parse(original.body_json), recoveryParent: mutation.parentIngressId } } })
    await applyLifeIngress(tx, { type: 'ingress-settle', id: mutation.parentIngressId, status: 'failed', expectedStatus: 'held', expectedPayloadHash: mutation.expectedPayloadHash })
    await applyLifeIngress(tx, { type: 'ingress-accept', ingress: { id: `recovery:${mutation.childTurnId}`, source: 'input-recovery', sourceKey: mutation.parentIngressId, kind: 'system', occurredAt: tx.now, payload: { turnId: mutation.childTurnId, parentIngressId: mutation.parentIngressId, originalInputHash: original.input_hash } } })
    await applyLifeIngress(tx, { type: 'ingress-settle', id: `recovery:${mutation.childTurnId}`, status: 'settled' })
    return
  }
  if (mutation.type === 'ingress-settle') {
    assertLifeId(mutation.id)
    if (mutation.nextAttemptAt != null)
      assertLifeTime(mutation.nextAttemptAt)
    const row = await tx.get<{ status: string, payload_hash: string }>('SELECT status, payload_hash FROM life_ingress WHERE card_id = ? AND ingress_id = ?', [tx.cardId, mutation.id])
    if (!row || (row.status === 'settled' && mutation.status !== 'settled'))
      throw new Error('Ingress is absent or already settled')
    if ((mutation.expectedStatus !== undefined && row.status !== mutation.expectedStatus) || (mutation.expectedPayloadHash !== undefined && row.payload_hash !== mutation.expectedPayloadHash))
      throw new Error('Input changed before its governance action could commit')
    await tx.run('UPDATE life_ingress SET status = ?, next_attempt_at = ?, lease_owner = NULL, lease_until = NULL WHERE card_id = ? AND ingress_id = ?', [mutation.status, mutation.nextAttemptAt ?? null, tx.cardId, mutation.id])
    return
  }
  const event = { ...mutation.ingress, payload: { ...mutation.ingress.payload } }
  let sourceInput: ReturnType<typeof serializeLifeUserInput> | null = null
  if (event.kind === 'user-turn') {
    sourceInput = serializeLifeUserInput(event.payload.currentMessage)
    if (event.payload.inputHash !== sourceInput.inputHash)
      throw new Error('Current input differs from its admission hash')
    const { currentMessage: _currentMessage, ...envelope } = event.payload
    event.payload = { ...envelope, inputRef: { kind: 'life-user-input', id: event.id } }
  }
  if (event.source === 'provider-context') {
    const refs: LifeEvidenceRef[] = []
    const provided = Array.isArray(event.payload.evidenceRefs) ? event.payload.evidenceRefs as LifeEvidenceRef[] : []
    for (const factId of (Array.isArray(event.payload.evidenceIds) ? event.payload.evidenceIds : []).slice(0, 64)) {
      if (typeof factId !== 'string')
        throw new TypeError('Provider context evidence identity is invalid')
      const selected = provided.find(ref => ref.id === factId && ref.kind === 'memory_facts')
      if (selected) {
        if (selected.cardId !== tx.cardId || !/^\d+$/u.test(selected.version) || selected.usage && !['current', 'historical'].includes(selected.usage))
          throw new Error('Selected memory version has invalid scope or usage')
        const fact = await tx.get<{ recorded_to: number | null, lifecycle: string }>('SELECT recorded_to, lifecycle FROM memory_fact_versions WHERE card_id = ? AND fact_id = ? AND CAST(version AS TEXT) = ?', [tx.cardId, factId, selected.version])
        if (!fact || ['revoked', 'disputed', 'candidate'].includes(fact.lifecycle) || selected.usage !== 'historical' && (fact.recorded_to != null || fact.lifecycle !== 'active'))
          throw new Error('Selected memory version is no longer eligible for this request')
        await assertLifeMemoryEvidence(tx, selected)
        refs.push(selected)
        continue
      }
      const fact = await tx.get<{ version: number }>('SELECT version FROM memory_fact_versions WHERE card_id = ? AND fact_id = ? AND recorded_to IS NULL ORDER BY version DESC LIMIT 1', [tx.cardId, factId])
      if (fact)
        refs.push({ cardId: tx.cardId, kind: 'memory_facts', id: factId, version: String(fact.version) })
    }
    event.payload = { ...event.payload, evidenceRefs: refs }
  }
  for (const value of [event.id, event.source, event.sourceKey])
    assertLifeId(value)
  assertLifeTime(event.occurredAt)
  const payload = boundedJson(event.payload)
  const digest = createHash('sha256').update(payload).digest('hex')
  const existing = await tx.get<{ payload_hash: string, ingress_id: string }>('SELECT payload_hash, ingress_id FROM life_ingress WHERE card_id = ? AND source = ? AND source_key = ?', [tx.cardId, event.source, event.sourceKey])
  if (existing) {
    if (existing.payload_hash !== digest || existing.ingress_id !== event.id)
      throw new Error('Ingress source key was reused with different content')
    return
  }
  await tx.run('INSERT INTO life_ingress(card_id, ingress_id, kind, source, source_key, payload_hash, payload_ref_json, occurred_at, observed_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tx.cardId, event.id, event.kind, event.source, event.sourceKey, digest, payload, event.occurredAt, tx.now, 'accepted'])
  if (sourceInput) {
    await tx.run(`INSERT INTO life_input_payloads(card_id, ingress_id, input_hash, body_json, lifecycle, stored_at) VALUES (?, ?, ?, ?, 'active', ?)`, [tx.cardId, event.id, sourceInput.inputHash, sourceInput.body, tx.now])
    const message = JSON.parse(sourceInput.body) as { content?: unknown }
    const userText = typeof message.content === 'string' ? message.content : Array.isArray(message.content) ? message.content.flatMap(part => part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string' ? [part.text] : []).join('\n') : ''
    assertLifeId(String(event.payload.conversationId ?? ''))
    assertLifeId(String(event.payload.turnId ?? ''))
    await tx.run(`INSERT INTO conversation_turns(id, card_id, turn_id, session_id, user_text, assistant_text, structured_json, created_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?) ON CONFLICT(card_id, session_id, turn_id) WHERE card_id IS NOT NULL AND TRIM(card_id) != '' AND session_id IS NOT NULL AND TRIM(session_id) != '' AND turn_id IS NOT NULL AND TRIM(turn_id) != '' DO NOTHING`, [randomUUID(), tx.cardId, event.payload.turnId, event.payload.conversationId, userText, event.occurredAt])
  }
}
