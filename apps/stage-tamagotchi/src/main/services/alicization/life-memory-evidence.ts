import type { LifeEvidenceRef } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

export async function assertLifeMemoryEvidence(tx: LifeTransaction, ref: LifeEvidenceRef, chain = new Set<string>(), budget = { remaining: 128, verified: new Set<string>() }) {
  if (ref.cardId !== tx.cardId)
    throw new Error('Memory evidence crossed the card boundary')
  if (ref.kind !== 'memory_facts')
    return
  const key = `${ref.kind}:${ref.id}:${ref.version}:${ref.usage ?? 'current'}`
  if (budget.verified.has(key))
    return
  if (chain.has(key) || chain.size >= 64 || budget.remaining-- <= 0)
    throw new Error('Memory evidence lineage is cyclic or exceeds its verification budget')
  const nextChain = new Set(chain).add(key)
  const version = await tx.get<{ recorded_to: number | null, lifecycle: string, provenance: string, valid_from: number | null, valid_to: number | null, evidence_refs_json: string }>('SELECT recorded_to, lifecycle, provenance, valid_from, valid_to, evidence_refs_json FROM memory_fact_versions WHERE card_id = ? AND fact_id = ? AND CAST(version AS TEXT) = ?', [tx.cardId, ref.id, ref.version])
  const withdrawn = await tx.get(`SELECT 1 FROM long_term_memory_tombstones t LEFT JOIN life_memory_source_withdrawals w ON w.card_id = t.card_id AND w.source = t.source AND w.source_id = t.source_id WHERE t.card_id = ? AND t.source_id = ? AND t.source IN ('memory_facts','long_term_memory') AND (? <> 'historical' OR COALESCE(w.mode, 'forget') <> 'correction')`, [tx.cardId, ref.id, ref.usage ?? 'current'])
  if (!version || withdrawn || ['revoked', 'disputed', 'candidate'].includes(version.lifecycle) || ['imagined', 'fictional'].includes(version.provenance))
    throw new Error('Memory evidence was withdrawn or is not grounded')
  if (ref.usage !== 'historical' && (version.recorded_to != null || version.lifecycle !== 'active' || version.valid_from != null && version.valid_from > tx.now || version.valid_to != null && version.valid_to <= tx.now))
    throw new Error('Current memory evidence was superseded before use')
  // Tombstones block adoption immediately, even while a large dependency
  // cleanup is still paginating. A live child cannot outrun a revoked alias.
  for (const parent of JSON.parse(version.evidence_refs_json) as LifeEvidenceRef[])
    await assertLifeMemoryEvidence(tx, ref.usage === 'historical' ? { ...parent, usage: 'historical' } : parent, nextChain, budget)
  budget.verified.add(key)
}
