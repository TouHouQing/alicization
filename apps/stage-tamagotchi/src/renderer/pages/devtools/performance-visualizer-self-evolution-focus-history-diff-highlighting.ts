type DiffHighlightState = 'shared' | 'current-only' | 'previous-only'

interface SelfEvolutionFocusHistoryComparisonLike {
  previous: {
    capturedAt?: number | null
    candidateId?: string | null
    decisionTraceId?: string | null
    activeThreadId?: string | null
    selectedCardId?: string | null
    recommendedTraceEventId?: string | null
    evidenceTargets: string[]
    traceTargets: string[]
  }
  current: {
    capturedAt?: number | null
    candidateId?: string | null
    decisionTraceId?: string | null
    activeThreadId?: string | null
    selectedCardId?: string | null
    recommendedTraceEventId?: string | null
    evidenceTargets: string[]
    traceTargets: string[]
  }
  focusCardChanged?: boolean
  traceEventChanged?: boolean
  evidenceGained?: string[]
  evidenceLost?: string[]
  traceTargetsGained?: string[]
  traceTargetsLost?: string[]
  summaryLines?: string[]
}

function buildTargetStateMap(current: string[], previous: string[]) {
  const states: Record<string, DiffHighlightState> = {}
  const currentSet = new Set(current)
  const previousSet = new Set(previous)

  for (const value of previousSet) {
    states[value] = currentSet.has(value)
      ? 'shared'
      : 'previous-only'
  }

  for (const value of currentSet) {
    states[value] = previousSet.has(value)
      ? 'shared'
      : 'current-only'
  }

  return states
}

export function buildSelfEvolutionFocusHistoryDiffHighlighting(
  comparison: SelfEvolutionFocusHistoryComparisonLike | null,
) {
  if (!comparison) {
    return {
      evidencePanels: {} as Record<string, DiffHighlightState>,
      traceSections: {} as Record<string, DiffHighlightState>,
    }
  }

  return {
    evidencePanels: buildTargetStateMap(
      comparison.current.evidenceTargets,
      comparison.previous.evidenceTargets,
    ),
    traceSections: buildTargetStateMap(
      comparison.current.traceTargets,
      comparison.previous.traceTargets,
    ),
  }
}
