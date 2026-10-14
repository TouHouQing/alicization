import type { LifeTemporalQuery } from './life-temporal-query'
import type { LongTermMemoryEvidenceCandidate } from './long-term-memory-recall'

interface HistoricalFactRow { id: string, subject: string, predicate: string, object: string, confidence: number, created_at: number, updated_at: number }

// The live index excludes corrected facts. A separate bounded query restores
// only grounded historical records; a true withdrawal always dominates it.
export async function retrieveLifeHistoricalFacts(input: {
  cardId: string
  temporal: LifeTemporalQuery
  terms: string[]
  query: string
  now: number
  all: <T>(sql: string, parameters: unknown[]) => Promise<T[]>
}): Promise<LongTermMemoryEvidenceCandidate[]> {
  if (!input.temporal.historical || input.temporal.recordedRange && input.temporal.recordedRange.from > input.now)
    return []
  const query = input.query.normalize('NFKC').toLocaleLowerCase().slice(0, 240)
  const grams = Array.from({ length: Math.max(0, query.length - 1) }, (_, index) => query.slice(index, index + 2)).filter(term => /^[\p{L}\p{N}]{2}$/u.test(term))
  // The actual question owns the bounded lexical slots, before expanded hints.
  const terms = [...new Set([...grams, ...input.terms.map(term => term.normalize('NFKC').toLocaleLowerCase().trim())].filter(term => term.length >= 2 || /^\p{Script=Han}$/u.test(term)))].slice(0, 48).map(term => term.slice(0, 80))
  const hostPreferenceQuestion = /我[^。！？\n]{0,12}(?:喜欢|偏好)|我的?[^。！？\n]{0,12}偏好|\bmy\b[^.!?\n]{0,30}(?:preference|favou?rite)/iu.test(query)
  if (!terms.length)
    return []
  const range = input.temporal.recordedRange
  const rows = await input.all<HistoricalFactRow>(`
    SELECT DISTINCT f.id, f.subject, f.predicate, f.object, f.confidence, f.created_at, f.updated_at
    FROM memory_facts f JOIN memory_fact_versions v ON v.card_id = f.card_id AND v.fact_id = f.id
    WHERE f.card_id = ? AND v.lifecycle IN ('active','superseded')
      AND v.provenance IN ('reported','observed','remembered')
      ${range ? 'AND v.recorded_from < ? AND (v.recorded_to IS NULL OR v.recorded_to > ?)' : ''}
      AND NOT EXISTS (
        SELECT 1 FROM long_term_memory_tombstones t
        LEFT JOIN life_memory_source_withdrawals w ON w.card_id = t.card_id AND w.source = t.source AND w.source_id = t.source_id
        WHERE t.card_id = f.card_id AND t.source_id = f.id AND t.source IN ('memory_facts','long_term_memory')
          AND COALESCE(w.mode, 'forget') <> 'correction'
      )
      AND (${terms.map(() => 'instr(lower(f.subject || \' \' || f.predicate || \' \' || f.object), ?) > 0').join(' OR ')}
        ${hostPreferenceQuestion ? 'OR (f.subject = \'user\' AND (f.predicate IN (\'prefers\', \'likes\', \'preference\') OR f.predicate LIKE \'preferred_%\'))' : ''})
    ORDER BY f.updated_at DESC LIMIT 100`, [input.cardId, ...range ? [range.to, range.from] : [], ...terms])
  return rows.map(row => ({ id: row.id, kind: 'fact', summary: `${row.subject} ${row.predicate} ${row.object}`, source: 'memory_facts', sourceIds: [row.id], confidence: row.confidence, salience: 0.5, occurredAt: row.created_at, updatedAt: row.updated_at, sensitivity: 'personal' }))
}
