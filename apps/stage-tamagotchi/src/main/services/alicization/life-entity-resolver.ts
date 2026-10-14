import type { LifeEvidenceRef } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

export async function lifeAliasEvidenceCurrent(tx: LifeTransaction, ref: LifeEvidenceRef) {
  if (ref.cardId !== tx.cardId || ref.usage === 'historical')
    return false
  if (ref.kind === 'soul') {
    const row = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = \'life:soul-active\'')
    const active = row ? JSON.parse(row.value) : null
    return active?.contentHash === ref.id && String(active.soulRevision) === ref.version
  }
  if (ref.kind !== 'memory_facts')
    return false
  return Boolean(await tx.get(`SELECT 1 FROM memory_fact_versions v WHERE v.card_id = ? AND v.fact_id = ? AND CAST(v.version AS TEXT) = ? AND v.recorded_to IS NULL AND v.lifecycle = 'active' AND v.provenance IN ('reported','observed') AND (v.valid_from IS NULL OR v.valid_from <= ?) AND (v.valid_to IS NULL OR v.valid_to > ?) AND NOT EXISTS (SELECT 1 FROM long_term_memory_tombstones t WHERE t.card_id = v.card_id AND t.source_id = v.fact_id AND t.source IN ('memory_facts','long_term_memory'))`, [tx.cardId, ref.id, ref.version, tx.now, tx.now]))
}

export async function resolveLifeEntityAlias(tx: LifeTransaction, name: string, scope = 'card') {
  const rows = await tx.all<{ entity_id: string, evidence_ref_json: string }>(`SELECT a.entity_id, a.evidence_ref_json FROM memory_entity_aliases a JOIN memory_entities e ON e.card_id = a.card_id AND e.entity_id = a.entity_id WHERE a.card_id = ? AND a.alias = ? AND a.relationship_scope = ? AND e.status = 'active' ORDER BY a.entity_id LIMIT 17`, [tx.cardId, name.normalize('NFKC').toLocaleLowerCase(), scope])
  if (rows.length > 16)
    return null
  const candidates = new Map<string, LifeEvidenceRef>()
  for (const row of rows) {
    const evidence = JSON.parse(row.evidence_ref_json) as LifeEvidenceRef
    if (await lifeAliasEvidenceCurrent(tx, evidence))
      candidates.set(row.entity_id, evidence)
  }
  if (candidates.size !== 1)
    return null
  const [id, evidence] = [...candidates][0]
  return { id, evidence }
}
