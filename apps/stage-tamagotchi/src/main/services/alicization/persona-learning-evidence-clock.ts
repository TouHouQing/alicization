import type { AlicizationAutobiographicalSelfInput } from './autobiographical-self'

import { createHash } from 'node:crypto'

/** Derived summaries and maintenance timestamps cannot manufacture another experience. */
export function personaLearningEvidenceRoots(input: AlicizationAutobiographicalSelfInput) {
  const entries = [
    ...(input.recentReinforcementEvents ?? []).map(item => item.turnId ? `turn:${item.turnId}` : `reinforcement:${item.id}`),
    ...(input.recentRelationshipOutcomes ?? []).map(item => item.turnId ? `turn:${item.turnId}` : `relationship:${item.id}`),
    ...(input.recentMemoryReflections ?? []).filter(item => item.status === 'confirmed').map(item => item.turnId ? `turn:${item.turnId}` : `reflection:${item.id}`),
    ...(input.recentMemoryConsolidations ?? []).flatMap(item => item.derivedEventIds?.length ? item.derivedEventIds.map(id => `episode:${id}`) : [`consolidation:${item.id}`]),
  ]
  return [...new Set(entries)].sort()
}
export const personaLearningEvidenceFingerprint = (input: AlicizationAutobiographicalSelfInput) => createHash('sha256').update(JSON.stringify(personaLearningEvidenceRoots(input))).digest('hex')
