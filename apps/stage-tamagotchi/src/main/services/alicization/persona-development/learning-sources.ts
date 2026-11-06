import type { LifeEvidenceRef } from '../../../../shared/life-contracts'
import type { LifeTransaction } from '../life-transaction'
import type { PersonaExtractionSource } from './runtime'

import { resolvePersonaSource } from './sources'

/** Read bounded, reviewed evidence; private or withdrawn text never reaches extraction. */
export async function readPersonaLearningSources(tx: Pick<LifeTransaction, 'get' | 'all' | 'cardId' | 'now'>): Promise<PersonaExtractionSource[]> {
  const rows = await tx.all<{ kind: string, id: string, version: string }>(`WITH candidates AS (
    SELECT 'memory_reflections' AS kind,id,CAST(updated_at AS TEXT) AS version,created_at FROM memory_reflections WHERE card_id=? AND status='confirmed' AND turn_id IS NOT NULL
    UNION ALL SELECT 'persona_reinforcement_events',id,CAST(created_at AS TEXT),created_at FROM persona_reinforcement_events WHERE card_id=? AND turn_id IS NOT NULL
    UNION ALL SELECT 'goals',obligation_id,CAST(generation AS TEXT),created_at FROM life_obligations o WHERE card_id=? AND kind='personal-project' AND status='fulfilled' AND EXISTS (SELECT 1 FROM life_evidence_dependencies d WHERE d.card_id=o.card_id AND d.source_kind='personal-proposal' AND d.dependent_owner='goals' AND d.dependent_id=o.obligation_id)
  ) SELECT kind,id,version FROM candidates c WHERE NOT EXISTS (SELECT 1 FROM life_persona_extractions e WHERE e.card_id=? AND e.source_kind=c.kind AND e.source_id=c.id AND e.source_version=c.version) ORDER BY created_at DESC,id DESC LIMIT 48`, [tx.cardId, tx.cardId, tx.cardId, tx.cardId])
  const sources: PersonaExtractionSource[] = []
  for (const row of rows) {
    try {
      const source = await resolvePersonaSource(tx, { cardId: tx.cardId, ...row } as LifeEvidenceRef)
      sources.push({ ref: source.ref, text: source.text, context: source.context, selfChosen: source.selfChosen, positive: source.positive, learningAllowed: source.feedback !== 'unknown' })
    }
    catch {
      // The writer independently rechecks eligibility before acknowledging a
      // skipped source. No private text or exception is exposed to generation.
      sources.push({ ref: { cardId: tx.cardId, ...row }, text: '', context: '', selfChosen: false, positive: false, rejected: true })
    }
  }
  return sources
}
