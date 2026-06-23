interface SelfEvolutionAdoptedAnchorTraceabilityLike {
  patternKey: string
  patternSummary?: string | null
  workflowHeadline: string | null
  workflowContextLine?: string | null
  supportingLines?: string[]
}

interface SelfEvolutionAdoptedAnchorHistoryTransitionLike {
  transitionKey: string
  currentCapturedAt?: number
  previousCapturedAt?: number
  selectedSide: 'current' | 'previous'
  summaryLine: string
  supportingLines?: string[]
}

interface SelfEvolutionAdoptedAnchorTraceEventSelectionLike {
  eventId: string
  summaryLine: string
}

export function buildSelfEvolutionAdoptedAnchorReplayPlan(input: {
  traceability: SelfEvolutionAdoptedAnchorTraceabilityLike | null
  historyTransition: SelfEvolutionAdoptedAnchorHistoryTransitionLike | null
  traceEventSelection: SelfEvolutionAdoptedAnchorTraceEventSelectionLike | null
}) {
  if (!input.traceability || !input.historyTransition || !input.traceEventSelection)
    return null

  const bodyContinuityRendererRejoinLine = (input.traceability.supportingLines ?? [])
    .find(line => line.includes('身体承接态 -> ') && line.includes('显形补回态'))

  return {
    patternKey: input.traceability.patternKey,
    transitionKey: input.historyTransition.transitionKey,
    selectedSide: input.historyTransition.selectedSide,
    eventId: input.traceEventSelection.eventId,
    summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
    supportingLines: [
      `工作流：${input.traceability.workflowHeadline ?? 'n/a'}`,
      `历史转移：${input.historyTransition.summaryLine}`,
      `事件定位：${input.traceEventSelection.summaryLine}`,
      ...(bodyContinuityRendererRejoinLine
        ? [`显形补回：${bodyContinuityRendererRejoinLine}`]
        : []),
      ...((input.traceability.supportingLines ?? [])
        .filter(line => line.startsWith('采纳前提仍然可追溯到'))
        .map(line => `连续性前提：${line}`)),
    ],
  }
}
