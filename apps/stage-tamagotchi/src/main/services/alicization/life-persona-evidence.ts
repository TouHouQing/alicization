import type { LifeEffect } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const digest = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const sourceSchema = v.strictObject({ id: v.pipe(v.string(), v.minLength(1), v.maxLength(512)), summaryHash: digest, provenance: v.string(), confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)) })
const proposalSchema = v.strictObject({ format: v.literal('persona-revision-proposal-v1'), baseHash: digest, targetHash: digest, targetContent: v.pipe(v.string(), v.maxLength(200_000)), sources: v.pipe(v.array(sourceSchema), v.maxLength(32)), evaluationStatus: v.picklist(['requires-clean-source', 'requires-candidate-evaluation']), adopted: v.literal(false) })

export function fingerprintLifePersonaSource(source: Pick<AlicizationMemoryConsolidationRecord, 'summary' | 'lesson' | 'cues' | 'derivedEventIds' | 'dominantProvenance' | 'confidence'>) {
  return hash(JSON.stringify({ summary: source.summary, lesson: source.lesson, cues: source.cues, derivedEventIds: source.derivedEventIds, provenance: source.dominantProvenance, confidence: source.confidence }))
}

export async function bindLifePersonaProposalEvidence(tx: LifeTransaction, effect: Pick<LifeEffect, 'id' | 'payload'>, adoptedHash?: string) {
  const proposal = v.parse(proposalSchema, effect.payload)
  const active = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = \'life:soul-active\'')
  if (!active || (JSON.parse(active.value) as { contentHash: string }).contentHash !== (adoptedHash ?? proposal.baseHash) || hash(proposal.targetContent) !== proposal.targetHash)
    throw new Error('Persona proposal no longer matches its adopted identity or target hash')
  for (const source of proposal.sources) {
    const row = await tx.get<{ summary: string, lesson: string | null, cues_json: string, derived_event_ids_json: string, dominant_provenance: AlicizationMemoryConsolidationRecord['dominantProvenance'], confidence: number }>('SELECT summary, lesson, cues_json, derived_event_ids_json, dominant_provenance, confidence FROM memory_consolidations WHERE card_id = ? AND id = ?', [tx.cardId, source.id])
    const withdrawn = await tx.get('SELECT 1 FROM long_term_memory_tombstones WHERE card_id = ? AND source_id = ? AND source IN (\'memory_consolidations\',\'long_term_memory\')', [tx.cardId, source.id])
    if (!row || withdrawn || fingerprintLifePersonaSource({ ...row, cues: JSON.parse(row.cues_json || '[]'), derivedEventIds: JSON.parse(row.derived_event_ids_json || '[]'), dominantProvenance: row.dominant_provenance }) !== source.summaryHash)
      throw new Error('Persona proposal source changed or was withdrawn before staging')
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, 'memory_consolidations', ?, ?, 'reflection', ?, '1', 'supports', ?)`, [tx.cardId, source.id, source.summaryHash, effect.id, tx.revision])
  }
}
