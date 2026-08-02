interface SelfEvolutionFocusSnapshotRecord {
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

function countValues(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function formatCounts(counts: Map<string, number>) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([value, count]) => `${value} x${count}`)
    .join(', ')
}

function formatValues(values: string[]) {
  return values.length > 0 ? values.join(', ') : 'n/a'
}

export function buildSelfEvolutionFocusHistorySummary(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  if (history.length === 0)
    return null

  const latest = [...history].sort((left, right) => right.capturedAt - left.capturedAt)[0]!
  const evidenceCounts = countValues(history.flatMap(item => item.highlightedEvidencePanelIds))
  const stableEvidence = [...evidenceCounts.entries()]
    .filter(([, count]) => count === history.length)
    .map(([value]) => value)
    .sort()
  const driftingEvidence = [...evidenceCounts.entries()]
    .filter(([, count]) => count < history.length)
    .map(([value]) => value)
    .sort()
  const focusCounts = countValues(history.map(item => item.selectedCardId))
  const eventCounts = countValues(history.map(item => item.recommendedTraceEventId ?? 'n/a'))
  const phaseCounts = countValues(history
    .map(item => item.bodyContinuityPhase)
    .filter((value): value is NonNullable<typeof value> => Boolean(value)))
  const surfaceCounts = countValues(history
    .map(item => item.rendererRejoinSurfaceKey)
    .filter((value): value is NonNullable<typeof value> => Boolean(value)))
  const laneCounts = countValues(history
    .map(item => item.survivingVisibleLane)
    .filter((value): value is NonNullable<typeof value> => Boolean(value)))

  return [
    `historySnapshotCount=${history.length}`,
    `latestCapturedAt=${latest.capturedAt}`,
    `latestCandidateId=${latest.candidateId ?? 'n/a'}`,
    `latestDecisionTraceId=${latest.decisionTraceId ?? 'n/a'}`,
    `latestActiveThreadId=${latest.activeThreadId ?? 'n/a'}`,
    `focusCards=${formatCounts(focusCounts)}`,
    `stableEvidencePanelIds=${formatValues(stableEvidence)}`,
    `driftingEvidencePanelIds=${formatValues(driftingEvidence)}`,
    `traceEventIds=${formatCounts(eventCounts)}`,
    `bodyContinuityPhases=${phaseCounts.size > 0 ? formatCounts(phaseCounts) : 'n/a'}`,
    `rendererRejoinSurfaceKeys=${surfaceCounts.size > 0 ? formatCounts(surfaceCounts) : 'n/a'}`,
    `survivingVisibleLanes=${laneCounts.size > 0 ? formatCounts(laneCounts) : 'n/a'}`,
  ]
}
