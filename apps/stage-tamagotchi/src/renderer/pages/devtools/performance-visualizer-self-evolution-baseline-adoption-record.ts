interface SelfEvolutionBaselineAdoptionLike {
  mode: 'adopt-now' | 'observe' | 'reject'
  summaryLine: string
  detailLine: string
  supportingLines: string[]
}

interface SelfEvolutionFocusSnapshotLike {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path'
  explanation: string | null
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  capturedAt: number
}

export function buildSelfEvolutionBaselineAdoptionRecord(input: {
  baselineAdoption: SelfEvolutionBaselineAdoptionLike | null
  latestSnapshot: SelfEvolutionFocusSnapshotLike | null
  activePatternKey: string | null
  repairOwnerHint: string | null
  prosodyAuthorityNote?: string | null
  capturedAt: number
}) {
  if (!input.baselineAdoption || input.baselineAdoption.mode !== 'adopt-now' || !input.latestSnapshot)
    return null

  const prosodyAuthorityNote = input.prosodyAuthorityNote
    ?? input.baselineAdoption.supportingLines.find(line => line.includes('韵律权威链'))
    ?? null
  const continuityGovernanceNote = input.baselineAdoption.supportingLines.find(line =>
    line.includes('same-her 连续性治理已经再次确认'),
  ) ?? null

  return {
    version: 'self-evolution-baseline-adoption/v1',
    adoptedAt: input.capturedAt,
    snapshotCapturedAt: input.latestSnapshot.capturedAt,
    candidateId: input.latestSnapshot.candidateId,
    decisionTraceId: input.latestSnapshot.decisionTraceId,
    activeThreadId: input.latestSnapshot.activeThreadId,
    selectedCardId: input.latestSnapshot.selectedCardId,
    activePatternKey: input.activePatternKey,
    repairOwnerHint: input.repairOwnerHint,
    adoptionMode: input.baselineAdoption.mode,
    summaryLine: input.baselineAdoption.summaryLine,
    prosodyAuthorityNote,
    continuityGovernanceNote,
  }
}
