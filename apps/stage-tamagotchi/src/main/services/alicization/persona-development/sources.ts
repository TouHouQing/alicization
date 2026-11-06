import type { LifeEvidenceRef, LifeObligation } from '../../../../shared/life-contracts'
import type { PersonaContext } from '../../../../shared/persona-development-contracts'
import type { LifeTransaction } from '../life-transaction'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

import { detectPersonaTrainingPii } from '../persona-training-pii'
import { personaDigest } from './schema'

export interface PersonaSource { ref: LifeEvidenceRef, rootId: string, occurredAt: number, text: string, hash: string, context: PersonaContext, selfChosen: boolean, positive: boolean, strength: number, feedback: 'positive' | 'negative' | 'unknown' | null }

export async function resolvePersonaSource(tx: Pick<LifeTransaction, 'get' | 'cardId' | 'now'>, ref: LifeEvidenceRef): Promise<PersonaSource> {
  if (ref.cardId !== tx.cardId)
    throw new Error('Personality evidence crossed the character boundary')
  const withdrawn = await tx.get('SELECT 1 FROM long_term_memory_tombstones WHERE card_id = ? AND source_id = ? AND source IN (?, \'long_term_memory\')', [tx.cardId, ref.id, ref.kind])
  const invalidated = await tx.get('SELECT 1 FROM life_memory_source_withdrawals WHERE card_id = ? AND source_id = ? AND source = ?', [tx.cardId, ref.id, ref.kind])
  if (withdrawn || invalidated)
    throw new Error('Personality source was withdrawn')
  let result: Omit<PersonaSource, 'ref' | 'hash'>
  let version: string
  if (ref.kind === 'memory_reflections') {
    const row = await tx.get<{ turn_id: string | null, source_kind: string, status: string, summary: string, lesson: string, created_at: number, updated_at: number }>('SELECT turn_id,source_kind,status,summary,lesson,created_at,updated_at FROM memory_reflections WHERE card_id = ? AND id = ?', [tx.cardId, ref.id])
    if (!row || row.status !== 'confirmed' || !row.turn_id || /dream|fallback|failure|internal/u.test(row.source_kind))
      throw new Error('Personality requires a confirmed, sourced reflection')
    version = String(row.updated_at)
    result = { rootId: `turn:${row.turn_id}`, occurredAt: row.created_at, text: row.lesson || row.summary, context: /execution/u.test(row.source_kind) ? 'execution' : 'companionship', selfChosen: false, positive: true, strength: 0.6, feedback: null }
  }
  else if (ref.kind === 'persona_reinforcement_events') {
    const row = await tx.get<{ turn_id: string | null, source_kind: string, dimension: string, valence: string, summary: string, delta: number, created_at: number }>('SELECT turn_id,source_kind,dimension,valence,summary,delta,created_at FROM persona_reinforcement_events WHERE card_id = ? AND id = ?', [tx.cardId, ref.id])
    if (!row || !row.turn_id || /dream|fallback|failure|internal/u.test(row.source_kind))
      throw new Error('Personality reinforcement lacks an actual interaction')
    version = String(row.created_at)
    const feedbackKind = row.source_kind === 'reply' ? row.summary.match(/^dialogue_feedback=(received|robotic|missed|intrusive|interrupted); dimension=[a-z-]+$/u)?.[1] : undefined
    const feedback = feedbackKind ? feedbackKind === 'received' ? 'positive' : feedbackKind === 'interrupted' ? 'unknown' : 'negative' : null
    const feedbackText: Record<string, string> = { received: '用户明确表示这次回应很合适。', robotic: '用户明确表示这次回应过于机械。', missed: '用户明确表示这次回应没有理解自己。', intrusive: '用户明确表示这次回应打扰了自己，需要更多空间。', interrupted: '本次回应被打断，暂时无法判断回应是否合适。' }
    result = { rootId: `turn:${row.turn_id}`, occurredAt: row.created_at, text: feedbackKind ? feedbackText[feedbackKind] : row.summary, context: /execution/u.test(row.source_kind) ? 'execution' : row.dimension === 'gentle-repair' ? 'repair' : 'companionship', selfChosen: false, positive: feedback ? feedback === 'positive' : row.valence === 'reinforce', strength: Math.min(1, Math.max(0.1, Math.abs(row.delta) * 6)), feedback }
  }
  else if (ref.kind === 'goals') {
    const row = await tx.get<{ kind: string, status: string, generation: number, source_ref_json: string, fulfilled_receipt_ref_json: string | null, created_at: number }>('SELECT kind,status,generation,source_ref_json,fulfilled_receipt_ref_json,created_at FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, ref.id])
    const source = row ? JSON.parse(row.source_ref_json) : null
    const verification = row?.fulfilled_receipt_ref_json ? JSON.parse(row.fulfilled_receipt_ref_json) as LifeObligation['verification'] : null
    if (!row || row.kind !== 'personal-project' || row.status !== 'fulfilled' || source?.invalidatedBy || source?.personalOrigin !== 'self-initiated' || !source?.personalChoice || !source?.personalAuthorship || verification?.verdict !== 'satisfied' || !verification.independent)
      throw new Error('Personal interest requires an independently verified own choice')
    const choice = await tx.get('SELECT 1 FROM life_evidence_dependencies WHERE card_id = ? AND source_kind = \'personal-proposal\' AND dependent_owner = \'goals\' AND dependent_id = ?', [tx.cardId, ref.id])
    if (!choice)
      throw new Error('Personal interest needs an actual authored choice, not a host-inspired automatic project')
    version = String(row.generation)
    result = { rootId: `choice:${ref.id}`, occurredAt: row.created_at, text: String(source.personalTopic ?? ''), context: 'companionship', selfChosen: true, positive: !source.personalDevelopment?.feedback?.some((item: { feedback: string }) => item.feedback === 'dismiss'), strength: 0.9, feedback: null }
  }
  else {
    throw new Error('Unsupported personality evidence source')
  }
  if (version !== ref.version || result.occurredAt > tx.now || !result.text.trim() || result.text.length > 2000 || containsAlicizationFixedTemplateResidue(result.text, { provenance: 'internal-structured-fact' }) || detectPersonaTrainingPii(result.text).detected)
    throw new Error('Personality source is stale, sensitive or contaminated')
  return { ...result, ref, hash: personaDigest(result) }
}
