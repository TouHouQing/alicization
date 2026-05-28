type EventLocalizationState = 'recommended' | 'candidate-anchor'

interface SelfEvolutionComparisonSideLike {
  recommendedTraceEventId: string | null
  traceTargets: string[]
}

interface SelfEvolutionFocusHistoryComparisonLike {
  previous: SelfEvolutionComparisonSideLike
  current: SelfEvolutionComparisonSideLike
}

interface SelfEvolutionTraceEventLike {
  id: string
  kind: string
  summary?: string | null
}

function candidateKindsFromTraceTargets(traceTargets: string[]) {
  const kinds = new Set<string>()
  if (traceTargets.includes('trace-details'))
    kinds.add('governance-normalized')
  if (traceTargets.includes('selected-trace-event'))
    kinds.add('person-state-updated')
  if (traceTargets.includes('trace-timeline'))
    kinds.add('takeover-audit')
  return kinds
}

export function buildSelfEvolutionFocusHistoryEventLocalization(input: {
  comparison: SelfEvolutionFocusHistoryComparisonLike | null
  selectedSide: 'current' | 'previous' | null
  traceEvents: SelfEvolutionTraceEventLike[]
}) {
  if (!input.comparison || !input.selectedSide) {
    return {
      timelineStates: {} as Record<string, EventLocalizationState>,
      selectedEventState: null as EventLocalizationState | null,
    }
  }

  const side = input.comparison[input.selectedSide]
  const candidateKinds = candidateKindsFromTraceTargets(side.traceTargets)
  const timelineStates: Record<string, EventLocalizationState> = {}

  for (const event of input.traceEvents) {
    if (side.recommendedTraceEventId && event.id === side.recommendedTraceEventId) {
      timelineStates[event.id] = 'recommended'
      continue
    }
    if (candidateKinds.has(event.kind))
      timelineStates[event.id] = 'candidate-anchor'
  }

  return {
    timelineStates,
    selectedEventState: side.recommendedTraceEventId ? 'recommended' : null,
  }
}
