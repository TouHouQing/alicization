function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function normalizeStringList(raw: unknown, maxItems = 12, maxChars = 160) {
  if (!Array.isArray(raw))
    return [] as string[]
  const result: string[] = []
  for (const item of raw) {
    const normalized = sanitizeText(item, maxChars)
    if (!normalized)
      continue
    if (result.some(existing => existing.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function asRecord(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

export type AlicizationMemorySituationSourceKind
  = | 'event-graph'
    | 'episodic-event'
    | 'conversation-turn'
    | 'fact'
    | 'consolidation'
    | 'procedure'
    | 'relationship'
    | 'self-model'
    | 'world-model'

export type AlicizationMemorySituationKind
  = | 'episodic-scene'
    | 'task-thread'
    | 'repair-arc'
    | 'relationship-arc'
    | 'procedure'
    | 'self-model'
    | 'world-claim'
    | 'mixed'

export type AlicizationMemorySituationCandidateStatus
  = | 'selected'
    | 'rejected'
    | 'suppressed'
    | 'delayed'
    | 'unresolved'

export interface AlicizationMemorySituationCandidate {
  candidateId: string
  sourceKinds: AlicizationMemorySituationSourceKind[]
  situationKind: AlicizationMemorySituationKind
  eraKey: string | null
  relationshipArcKey: string | null
  procedureKey: string | null
  selfModelKey: string | null
  worldClaimKeys: string[]
  selectedEvidenceIds: string[]
  competingCandidateIds: string[]
  suppressionReasons: string[]
  confidence: number
  latencyCost: number
  status: AlicizationMemorySituationCandidateStatus
  statusReason: string | null
  summary: string
  evidenceSummary: string | null
}

export interface AlicizationMemorySituationCandidateSet {
  version: 'memory-situation-candidates-v1'
  producedAt: number
  queryTexts: string[]
  candidates: AlicizationMemorySituationCandidate[]
  selected: AlicizationMemorySituationCandidate[]
  rejected: AlicizationMemorySituationCandidate[]
  suppressed: AlicizationMemorySituationCandidate[]
  delayed: AlicizationMemorySituationCandidate[]
  unresolved: AlicizationMemorySituationCandidate[]
}

export function normalizeAlicizationMemorySituationCandidate(raw: unknown): AlicizationMemorySituationCandidate | null {
  const candidate = asRecord(raw)
  if (!candidate)
    return null

  const situationKind = sanitizeText(candidate.situationKind, 40)
  const status = sanitizeText(candidate.status, 40)
  if (![
    'episodic-scene',
    'task-thread',
    'repair-arc',
    'relationship-arc',
    'procedure',
    'self-model',
    'world-claim',
    'mixed',
  ].includes(situationKind)) {
    return null
  }
  if (!['selected', 'rejected', 'suppressed', 'delayed', 'unresolved'].includes(status))
    return null

  const candidateId = sanitizeText(candidate.candidateId, 180)
  const summary = sanitizeText(candidate.summary, 300)
  if (!candidateId || !summary)
    return null

  const sourceKinds = normalizeStringList(candidate.sourceKinds, 10, 60)
    .filter(kind => [
      'event-graph',
      'episodic-event',
      'conversation-turn',
      'fact',
      'consolidation',
      'procedure',
      'relationship',
      'self-model',
      'world-model',
    ].includes(kind)) as AlicizationMemorySituationSourceKind[]

  return {
    candidateId,
    sourceKinds,
    situationKind: situationKind as AlicizationMemorySituationKind,
    eraKey: sanitizeText(candidate.eraKey, 120) || null,
    relationshipArcKey: sanitizeText(candidate.relationshipArcKey, 160) || null,
    procedureKey: sanitizeText(candidate.procedureKey, 160) || null,
    selfModelKey: sanitizeText(candidate.selfModelKey, 160) || null,
    worldClaimKeys: normalizeStringList(candidate.worldClaimKeys, 12, 160),
    selectedEvidenceIds: normalizeStringList(candidate.selectedEvidenceIds, 24, 180),
    competingCandidateIds: normalizeStringList(candidate.competingCandidateIds, 12, 180),
    suppressionReasons: normalizeStringList(candidate.suppressionReasons, 12, 180),
    confidence: clamp01(Number(candidate.confidence)),
    latencyCost: clamp01(Number(candidate.latencyCost)),
    status: status as AlicizationMemorySituationCandidateStatus,
    statusReason: sanitizeText(candidate.statusReason, 240) || null,
    summary,
    evidenceSummary: sanitizeText(candidate.evidenceSummary, 320) || null,
  }
}

export function normalizeAlicizationMemorySituationCandidateSet(raw: unknown): AlicizationMemorySituationCandidateSet | null {
  const candidate = asRecord(raw)
  if (!candidate)
    return null
  const producedAt = Number(candidate.producedAt)
  if (!Number.isFinite(producedAt))
    return null

  const candidates = Array.isArray(candidate.candidates)
    ? candidate.candidates.flatMap((entry) => {
        const normalized = normalizeAlicizationMemorySituationCandidate(entry)
        return normalized ? [normalized] : []
      })
    : []

  return {
    version: 'memory-situation-candidates-v1',
    producedAt: Math.max(0, Math.floor(producedAt)),
    queryTexts: normalizeStringList(candidate.queryTexts, 8, 240),
    candidates,
    selected: candidates.filter(item => item.status === 'selected'),
    rejected: candidates.filter(item => item.status === 'rejected'),
    suppressed: candidates.filter(item => item.status === 'suppressed'),
    delayed: candidates.filter(item => item.status === 'delayed'),
    unresolved: candidates.filter(item => item.status === 'unresolved'),
  }
}
