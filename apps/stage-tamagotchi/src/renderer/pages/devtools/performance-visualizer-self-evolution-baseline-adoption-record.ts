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
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
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
  prosodyAuthorityNote: string | null
  capturedAt: number
}) {
  if (!input.baselineAdoption || input.baselineAdoption.mode !== 'adopt-now' || !input.latestSnapshot)
    return null

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
    bodyContinuityPhase: input.latestSnapshot.bodyContinuityPhase ?? null,
    rendererRejoinSurfaceKey: input.latestSnapshot.rendererRejoinSurfaceKey ?? null,
    ...(input.latestSnapshot.survivingVisibleLane
      ? { survivingVisibleLane: input.latestSnapshot.survivingVisibleLane }
      : {}),
    prosodyAuthorityNote: input.prosodyAuthorityNote,
  }
}
