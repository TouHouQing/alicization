import type { LifeFactVersion } from '../../../shared/life-contracts'

export interface LifeFactVersionRow {
  stream_id: string
  fact_id: string
  version: number
  recorded_from: number
  recorded_to: number | null
  valid_from: number | null
  valid_to: number | null
  subject_ref_json: string
  predicate: string
  value_json: string
  provenance: LifeFactVersion['provenance']
  lifecycle: LifeFactVersion['lifecycle']
  evidence_refs_json: string
}

export function mapLifeFactVersion(row: LifeFactVersionRow): LifeFactVersion {
  return { streamId: row.stream_id, factId: row.fact_id, version: row.version, recordedFrom: row.recorded_from, recordedTo: row.recorded_to, validFrom: row.valid_from, validTo: row.valid_to, subject: JSON.parse(row.subject_ref_json), predicate: row.predicate, value: JSON.parse(row.value_json), provenance: row.provenance, lifecycle: row.lifecycle, evidence: JSON.parse(row.evidence_refs_json) }
}

export function filterLifeRecallFacts<T extends { id: string, source: string, evidenceVersion?: string | null, version?: string | null }>(candidates: T[], versions: LifeFactVersion[], input: { historical: boolean, now: number, recordedRange?: { from: number, to: number } | null, validRange?: { from: number, to: number } | null }) {
  if (input.recordedRange && input.recordedRange.from > input.now)
    return candidates.filter(candidate => candidate.source !== 'memory_facts')
  const byFact = new Map<string, LifeFactVersion>()
  for (const version of versions) {
    if (input.validRange && (version.recordedTo !== null || version.validFrom === null && version.validTo === null || version.validFrom !== null && version.validFrom >= input.validRange.to || version.validTo !== null && version.validTo <= input.validRange.from || version.validFrom === null && version.recordedFrom >= input.validRange.to))
      continue
    if (!input.historical && (version.recordedTo !== null || version.validFrom !== null && version.validFrom > input.now || version.validTo !== null && version.validTo <= input.now))
      continue
    if (input.recordedRange && (version.recordedFrom >= input.recordedRange.to || version.recordedTo != null && version.recordedTo <= input.recordedRange.from))
      continue
    const previous = byFact.get(version.factId)
    if (!previous || previous.version < version.version)
      byFact.set(version.factId, version)
  }
  return candidates.flatMap((candidate) => {
    const version = candidate.source === 'memory_facts' ? byFact.get(candidate.id) : undefined
    // Unversioned legacy entries still use the existing cleaning and source-policy
    // gates. New versioned facts additionally obey provenance and time fences.
    if (!version)
      return (input.recordedRange || input.validRange || versions.some(version => version.factId === candidate.id)) && candidate.source === 'memory_facts' ? [] : [candidate]
    if (['revoked', 'candidate', 'disputed'].includes(version.lifecycle) || ['imagined', 'fictional'].includes(version.provenance))
      return []
    if (!input.historical && (version.recordedTo != null || version.lifecycle !== 'active' || (version.validFrom != null && version.validFrom > input.now) || (version.validTo != null && version.validTo <= input.now)))
      return []
    // Asking about both then and now must not relabel the active version as
    // historical. Explicit date ranges still describe an as-of record.
    const current = !input.recordedRange && !input.validRange && version.lifecycle === 'active' && version.recordedTo === null
      && (version.validFrom === null || version.validFrom <= input.now) && (version.validTo === null || version.validTo > input.now)
    return [{ ...candidate, evidenceVersion: `life-fact:${version.streamId}:${version.version}`, version: String(version.version), lifeFact: { version: version.version, perspective: current ? 'current' as const : 'historical' as const, provenance: version.provenance, recordedFrom: version.recordedFrom, recordedTo: version.recordedTo, validFrom: version.validFrom, validTo: version.validTo } }]
  })
}
