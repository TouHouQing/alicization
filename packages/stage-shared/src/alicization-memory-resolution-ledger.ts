function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export interface AlicizationMemoryResolutionLedgerCandidate {
  id: string
  summary: string
  score?: number | null
  status: 'selected' | 'rejected' | 'fallback'
  reason: string | null
}

export interface AlicizationMemoryResolutionLedger {
  version: 'memory-resolution-ledger-v1'
  producedAt: number
  dominantClusterId: string | null
  dominantClusterSummary: string | null
  competingClusterId: string | null
  competingClusterSummary: string | null
  candidates: AlicizationMemoryResolutionLedgerCandidate[]
  selectedCandidates: AlicizationMemoryResolutionLedgerCandidate[]
  rejectedCandidates: AlicizationMemoryResolutionLedgerCandidate[]
  finalSurfacePolicy: string | null
  shouldStayInward: boolean
  shouldDelayUntilAfterPayoff: boolean
  stableCoreOnly: boolean
  finalRationale: string | null
}

function asObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

export function normalizeAlicizationMemoryResolutionLedger(raw: unknown): AlicizationMemoryResolutionLedger | null {
  const candidate = asObject(raw)
  if (!candidate)
    return null
  const producedAt = Number(candidate.producedAt)
  const candidatesRaw = Array.isArray(candidate.candidates) ? candidate.candidates : []
  const normalizeCandidate = (entry: unknown) => {
    const item = asObject(entry)
    if (!item)
      return null
    const status = sanitizeText(item.status, 32)
    if (status !== 'selected' && status !== 'rejected' && status !== 'fallback')
      return null
    const score = Number(item.score)
    return {
      id: sanitizeText(item.id, 120),
      summary: sanitizeText(item.summary, 220),
      score: Number.isFinite(score) ? score : null,
      status,
      reason: sanitizeText(item.reason, 220) || null,
    } satisfies AlicizationMemoryResolutionLedgerCandidate
  }
  if (!Number.isFinite(producedAt))
    return null
  const candidates: AlicizationMemoryResolutionLedgerCandidate[] = candidatesRaw.flatMap((entry) => {
    const normalized = normalizeCandidate(entry)
    return normalized ? [normalized] : []
  })
  return {
    version: 'memory-resolution-ledger-v1',
    producedAt: Math.max(0, Math.floor(producedAt)),
    dominantClusterId: sanitizeText(candidate.dominantClusterId, 120) || null,
    dominantClusterSummary: sanitizeText(candidate.dominantClusterSummary, 220) || null,
    competingClusterId: sanitizeText(candidate.competingClusterId, 120) || null,
    competingClusterSummary: sanitizeText(candidate.competingClusterSummary, 220) || null,
    candidates,
    selectedCandidates: candidates.filter(item => item.status === 'selected'),
    rejectedCandidates: candidates.filter(item => item.status === 'rejected'),
    finalSurfacePolicy: sanitizeText(candidate.finalSurfacePolicy, 80) || null,
    shouldStayInward: candidate.shouldStayInward === true,
    shouldDelayUntilAfterPayoff: candidate.shouldDelayUntilAfterPayoff === true,
    stableCoreOnly: candidate.stableCoreOnly === true,
    finalRationale: sanitizeText(candidate.finalRationale, 240) || null,
  }
}
