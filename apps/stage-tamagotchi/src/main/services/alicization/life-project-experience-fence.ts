import type { ObligationRow } from './life-obligation-repository'

import { mapLifeObligation } from './life-obligation-repository'
import { projectExperienceEpisode } from './life-project-experience'

interface ProjectExperienceWrite {
  id: string
  cardId: string
  turnId: string | null
  sourceKind: string
  provenance: string
  occurredAt: number
  whatHappened: string
  sourceSummary: string | null
  derivedFromJson: string
}

/**
 * Runs on the memory journal's writer connection, inside its transaction.
 * A withdrawal may commit after episode preparation; replay must not restore it.
 * Obsolete derived events are consumed without poisoning the ingest journal.
 */
export async function allowProjectExperienceWrite(event: ProjectExperienceWrite, get: <T>(sql: string, params: unknown[]) => Promise<T | undefined>) {
  if (!event.id.startsWith('project-experience:'))
    return true
  if (!event.turnId)
    return false
  const row = await get<ObligationRow>('SELECT * FROM life_obligations WHERE card_id = ? AND obligation_id = ? AND thread_id = ?', [event.cardId, `task:${event.turnId}`, event.turnId])
  if (!row)
    return false
  const canonical = projectExperienceEpisode(mapLifeObligation(event.cardId, row))
  return canonical !== null
    && event.id === canonical.id
    && event.sourceKind === canonical.sourceKind
    && event.provenance === canonical.provenance
    && event.occurredAt === canonical.occurredAt
    && event.whatHappened === canonical.whatHappened
    && event.sourceSummary === canonical.sourceSummary
    && event.derivedFromJson === JSON.stringify(canonical.derivedFrom?.map(ref => ({ kind: ref.kind, id: ref.id, label: ref.label ?? null })))
}
