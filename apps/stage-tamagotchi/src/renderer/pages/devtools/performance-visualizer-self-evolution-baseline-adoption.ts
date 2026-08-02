interface SelfEvolutionBaselineQualityLike {
  verdict: 'trusted' | 'provisional' | 'stale'
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

function buildSnapshotFacts(
  snapshot: SelfEvolutionFocusSnapshotLike,
  newestHistoryCapturedAt: number,
) {
  return [
    `snapshotCapturedAt=${snapshot.capturedAt}`,
    `newestHistoryCapturedAt=${newestHistoryCapturedAt}`,
    `candidateId=${snapshot.candidateId ?? 'n/a'}`,
    `decisionTraceId=${snapshot.decisionTraceId ?? 'n/a'}`,
    `activeThreadId=${snapshot.activeThreadId ?? 'n/a'}`,
    `selectedCardId=${snapshot.selectedCardId}`,
    `recommendedTraceEventId=${snapshot.recommendedTraceEventId ?? 'n/a'}`,
    `evidencePanelCount=${snapshot.highlightedEvidencePanelIds.length}`,
    `traceSectionCount=${snapshot.highlightedTraceSectionIds.length}`,
    `bodyContinuityPhase=${snapshot.bodyContinuityPhase ?? 'n/a'}`,
    `rendererRejoinSurfaceKey=${snapshot.rendererRejoinSurfaceKey ?? 'n/a'}`,
    `survivingVisibleLane=${snapshot.survivingVisibleLane ?? 'n/a'}`,
  ]
}

export function buildSelfEvolutionBaselineAdoption(input: {
  baselineQuality: SelfEvolutionBaselineQualityLike | null
  latestSnapshot: SelfEvolutionFocusSnapshotLike | null
  history: SelfEvolutionFocusSnapshotLike[]
}) {
  if (!input.baselineQuality || !input.latestSnapshot)
    return null

  const newestHistoryCapturedAt = input.history.reduce(
    (latest, snapshot) => Math.max(latest, snapshot.capturedAt),
    input.latestSnapshot.capturedAt,
  )
  const supportingLines = [
    `baselineVerdict=${input.baselineQuality.verdict}`,
    ...buildSnapshotFacts(input.latestSnapshot, newestHistoryCapturedAt),
  ]

  if (input.baselineQuality.verdict === 'stale') {
    return {
      mode: 'reject',
      summaryLine: 'Baseline rejected: verdict=stale.',
      detailLine: 'Capture a newer validation snapshot before adoption.',
      supportingLines,
    }
  }

  if (input.baselineQuality.verdict === 'provisional') {
    return {
      mode: 'observe',
      summaryLine: 'Baseline not adopted: verdict=provisional.',
      detailLine: 'Another validation snapshot is required before adoption.',
      supportingLines,
    }
  }

  if (input.latestSnapshot.capturedAt < newestHistoryCapturedAt) {
    return {
      mode: 'observe',
      summaryLine: 'Baseline not adopted: a newer snapshot exists.',
      detailLine: 'Select or validate the newest snapshot before adoption.',
      supportingLines,
    }
  }

  return {
    mode: 'adopt-now',
    summaryLine: 'Baseline ready for adoption.',
    detailLine: 'The trusted snapshot is the newest snapshot in history.',
    supportingLines,
  }
}
