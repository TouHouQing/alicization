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
  suppressionTags: string[]
  closureState: 'grounded-recall' | 'approximate-recall' | 'conflicted-recall' | 'inward-only' | 'no-recall'
  surfaceConfidence: number | null
  shouldLabelUncertainty: boolean
  visibleCarryMode: 'explicit-recall' | 'gist-only' | 'tone-carry' | 'withhold'
  conflictPressure: 'none' | 'low' | 'medium' | 'high'
  retrievalQuality: 'high' | 'medium' | 'low' | 'insufficient'
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
    suppressionTags: Array.isArray(candidate.suppressionTags)
      ? candidate.suppressionTags.map(item => sanitizeText(item, 80)).filter(Boolean).slice(0, 8)
      : [],
    closureState: (() => {
      const value = sanitizeText(candidate.closureState, 48)
      if (
        value === 'grounded-recall'
        || value === 'approximate-recall'
        || value === 'conflicted-recall'
        || value === 'inward-only'
        || value === 'no-recall'
      ) {
        return value
      }
      return candidate.shouldStayInward === true
        ? 'inward-only'
        : 'no-recall'
    })(),
    surfaceConfidence: (() => {
      const value = Number(candidate.surfaceConfidence)
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null
    })(),
    shouldLabelUncertainty: candidate.shouldLabelUncertainty === true,
    visibleCarryMode: (() => {
      const value = sanitizeText(candidate.visibleCarryMode, 48)
      if (
        value === 'explicit-recall'
        || value === 'gist-only'
        || value === 'tone-carry'
        || value === 'withhold'
      ) {
        return value
      }
      return candidate.shouldStayInward === true
        ? 'withhold'
        : 'tone-carry'
    })(),
    conflictPressure: (() => {
      const value = sanitizeText(candidate.conflictPressure, 32)
      if (value === 'none' || value === 'low' || value === 'medium' || value === 'high')
        return value
      return candidate.competingClusterSummary ? 'medium' : 'none'
    })(),
    retrievalQuality: (() => {
      const value = sanitizeText(candidate.retrievalQuality, 32)
      if (value === 'high' || value === 'medium' || value === 'low' || value === 'insufficient')
        return value
      return candidate.selectedCandidates && Array.isArray(candidate.selectedCandidates) && candidate.selectedCandidates.length > 0
        ? 'medium'
        : 'insufficient'
    })(),
    finalRationale: sanitizeText(candidate.finalRationale, 240) || null,
  }
}
