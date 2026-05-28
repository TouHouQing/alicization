interface SelfEvolutionComparisonSideLike {
  recommendedTraceEventId: string | null
}

interface SelfEvolutionFocusHistoryComparisonLike {
  previous: SelfEvolutionComparisonSideLike
  current: SelfEvolutionComparisonSideLike
}

export function buildSelfEvolutionAdoptedAnchorTraceEventSelection(input: {
  comparison: SelfEvolutionFocusHistoryComparisonLike | null
  selectedSide: 'current' | 'previous' | null
}) {
  if (!input.comparison || !input.selectedSide)
    return null

  const eventId = input.comparison[input.selectedSide].recommendedTraceEventId
  if (!eventId)
    return null

  return {
    eventId,
    summaryLine: `当前默认连续性锚点会自动回到事件 ${eventId}。`,
  }
}
