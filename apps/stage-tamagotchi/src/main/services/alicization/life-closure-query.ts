import type { LifeClosureNode, LifeClosureRecord } from '../../../shared/life-closure-contracts'
import type { LifeOwnerVersion } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

interface Ingress { id: string, source: string, status: string, payload: string, payload_hash: string }
interface Effect { id: string, status: string }
interface Goal { id: string, kind: string, status: string, proof: string, verification: string | null }
interface Expression { id: string, state: string, segment_id: string, presentation_verified: number }
interface Event { id: string, type: string }

// This is an evidence projection inside one read transaction, not a second
// runtime or a claim that every subsystem ran on every conversational turn.
export async function readLifeClosure(tx: Pick<LifeTransaction, 'cardId' | 'all' | 'get'>, turnId: string): Promise<LifeClosureRecord> {
  if (!turnId.trim() || turnId.length > 512)
    throw new TypeError('Closure lookup requires a bounded turn identity')
  const ingress = await tx.all<Ingress>(`SELECT ingress_id AS id, source, status, payload_ref_json AS payload, payload_hash FROM life_ingress WHERE card_id = ? AND (ingress_id = ? OR json_extract(payload_ref_json, '$.turnId') = ? OR source_key = ?) ORDER BY rowid DESC LIMIT 256`, [tx.cardId, `user:${turnId}`, turnId, turnId])
  if (ingress.some(item => createHash('sha256').update(item.payload).digest('hex') !== item.payload_hash))
    throw new Error('Closure evidence no longer matches its durable hash')
  const effects = await tx.all<Effect>('SELECT effect_id AS id, status FROM life_effect_intents WHERE card_id = ? AND turn_id = ? ORDER BY rowid DESC LIMIT 256', [tx.cardId, turnId])
  const goals = await tx.all<Goal>(`SELECT obligation_id AS id, kind, status, required_proof_json AS proof, fulfilled_receipt_ref_json AS verification FROM life_obligations WHERE card_id = ? AND (json_extract(source_ref_json, '$.deliveryTurnId') = ? OR json_extract(source_ref_json, '$.turnId') = ? OR thread_id IN (SELECT id FROM task_threads WHERE turn_id = ?) OR EXISTS (SELECT 1 FROM json_each(source_ref_json, '$.personalDevelopment.shares') s WHERE json_extract(s.value, '$.turnId') = ?)) ORDER BY updated_at DESC LIMIT 256`, [tx.cardId, turnId, turnId, turnId, turnId])
  const expressions = await tx.all<Expression>('SELECT receipt_id AS id, state, segment_id, presentation_verified FROM life_expression_receipts WHERE card_id = ? AND turn_id = ? ORDER BY rowid DESC LIMIT 256', [tx.cardId, turnId])
  const events = await tx.all<Event>('SELECT event_id AS id, event_type AS type FROM alicization_runtime_events WHERE card_id = ? AND turn_id = ? ORDER BY sequence DESC LIMIT 256', [tx.cardId, turnId])
  const checkpoint = await tx.get<{ runtime_status: string, sequence: number }>('SELECT runtime_status, sequence FROM alicization_runtime_checkpoints WHERE card_id = ? AND turn_id = ?', [tx.cardId, turnId])
  const revision = await tx.get<{ revision: number }>('SELECT MAX(revision) AS revision FROM life_commits WHERE card_id = ?', [tx.cardId])
  const latestContext = ingress.find(item => item.source === 'provider-context')
  const adoptedOwners = latestContext ? (JSON.parse(latestContext.payload) as { readSet: LifeOwnerVersion[] }).readSet : []
  const nodes: LifeClosureNode[] = Array.from({ length: 18 }, (_, index) => ({ id: `N${String(index).padStart(2, '0')}`, status: 'not-invoked', references: [], reasons: [] }))
  const set = (index: number, status: LifeClosureNode['status'], references: string[], reasons: string[] = []) => { nodes[index] = { id: nodes[index].id, status, references: references.slice(0, 24), reasons } }
  const matching = (source: string) => ingress.filter(item => item.source === source)
  const input = ingress.find(item => item.id === `user:${turnId}`)
  if (input)
    set(0, input.status === 'failed' ? 'failed' : 'recorded', [input.id], [input.status])
  if (latestContext) {
    set(1, 'adopted', [latestContext.id])
    const evidence = (JSON.parse(latestContext.payload) as { evidenceRefs?: Array<{ id: string, version: string }> }).evidenceRefs ?? []
    set(3, 'recorded', evidence.map(ref => `${ref.id}:${ref.version}`), evidence.length ? [] : ['no-memory-evidence-selected'])
    for (const [index, name] of [[4, 'cognition'], [5, 'emotion']] as const) {
      const owner = adoptedOwners.find(owner => owner.owner === name)
      if (owner)
        set(index, 'adopted', [`${owner.owner}:${owner.revision}:${owner.contentHash}`], ['existing-state-adopted'])
    }
  }
  if (checkpoint)
    set(2, ['failed', 'dead-lettered', 'timed-out'].includes(checkpoint.runtime_status) ? 'failed' : 'recorded', [`checkpoint:${checkpoint.sequence}`], [checkpoint.runtime_status])
  if (goals.length) {
    set(6, 'recorded', goals.map(goal => goal.id))
    const verified = goals.filter(goal => goal.verification && (JSON.parse(goal.verification) as { verdict: string }).verdict === 'satisfied')
    set(11, verified.length === goals.length ? 'recorded' : 'pending', goals.map(goal => goal.id), goals.filter(goal => !verified.includes(goal)).map(goal => `${goal.id}:${goal.status}`).slice(0, 24))
  }
  const outreach = matching('outreach')
  if (outreach.length)
    set(7, 'recorded', outreach.map(item => item.id))
  const projects = goals.filter(goal => goal.kind === 'personal-project')
  const projectFeedback = matching('personal-activity')
  if (projects.length || projectFeedback.length)
    set(7, 'recorded', [...projects.map(goal => goal.id), ...projectFeedback.map(item => item.id)], ['verified-personal-activity-or-observed-feedback'])
  const reviews = matching('reply-grounding')
  if (reviews.length) {
    const accepted = reviews.some(item => (JSON.parse(item.payload) as { accepted: boolean }).accepted)
    set(8, accepted ? 'recorded' : 'failed', reviews.map(item => item.id), accepted ? [] : ['reply-not-certified'])
  }
  const publications = matching('reply-publication')
  const commits = await tx.all<{ commit_id: string }>(`SELECT DISTINCT c.commit_id FROM life_commits c WHERE c.card_id = ? AND (c.operation_key = ? OR c.operation_key IN (SELECT 'runtime-event:' || event_id FROM alicization_runtime_events WHERE card_id = ? AND turn_id = ?) OR EXISTS (SELECT 1 FROM json_each(c.ingress_ids_json) i WHERE i.value IN (SELECT ingress_id FROM life_ingress WHERE card_id = ? AND (ingress_id = ? OR json_extract(payload_ref_json, '$.turnId') = ?)))) ORDER BY c.revision DESC LIMIT 24`, [tx.cardId, `ingress:user:${turnId}`, tx.cardId, turnId, tx.cardId, `user:${turnId}`, turnId])
  if (publications.length || commits.length)
    set(9, 'recorded', [...publications.map(item => item.id), ...commits.map(item => item.commit_id)])
  if (effects.length)
    set(10, effects.some(item => ['uncertain', 'dispatched', 'claimed', 'prepared'].includes(item.status)) ? 'pending' : effects.some(item => item.status === 'failed') ? 'failed' : 'recorded', effects.map(item => item.id), effects.map(item => `${item.id}:${item.status}`).slice(0, 24))
  if (expressions.length) {
    set(12, 'recorded', expressions.map(item => item.id), ['presentation-observations'])
    const delivered = expressions.some(item => item.presentation_verified === 1 && (item.state === 'rendered' || item.state === 'audio-ended' && item.segment_id === 'utterance'))
    set(13, delivered ? 'recorded' : 'unverified', expressions.map(item => item.id), delivered ? [] : ['no-verified-terminal-presentation'])
  }
  const memoryEvents = events.filter(item => item.type.startsWith('memory.'))
  if (memoryEvents.length)
    set(14, 'recorded', memoryEvents.map(item => item.id), ['see-memory-owner-settlement-events'])
  const growth = matching('growth-consumer')
  const adoptedPersona = latestContext ? (JSON.parse(latestContext.payload) as { personaProposalId?: string }).personaProposalId : null
  if (growth.length || adoptedPersona)
    set(15, 'adopted', [...growth.map(item => item.id), ...(adoptedPersona ? [adoptedPersona] : [])])
  const held = input?.status === 'held'
  if (held || effects.some(item => item.status === 'uncertain') || checkpoint?.runtime_status === 'recovery-required')
    set(16, 'pending', [input?.id, ...effects.filter(item => item.status === 'uncertain').map(item => item.id)].filter((id): id is string => Boolean(id)), ['human-recovery-or-independent-verification-required'])
  set(17, 'recorded', [`closure:${turnId}`], ['read-only-diagnostic-projection'])
  const body = { cardId: tx.cardId, turnId, revision: revision?.revision ?? 0, adoptedOwners, nodes, boundaries: { evidenceLimit: 256, rawInputIncluded: false as const, provesConsciousness: false as const } }
  return { ...body, contentHash: createHash('sha256').update(JSON.stringify(body)).digest('hex') }
}
