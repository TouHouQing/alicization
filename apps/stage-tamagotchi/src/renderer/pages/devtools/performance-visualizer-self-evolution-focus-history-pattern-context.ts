import { formatSelfEvolutionWorkflowSideLabel } from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionFocusHistoryPattern {
  patternKey: string
  occurrenceCount: number
  summaryLine: string
  focusCardTransition: string
  traceEventTransition: string
  evidenceGained: string[]
  evidenceLost: string[]
  traceTargetsGained: string[]
  traceTargetsLost: string[]
  occurrences: Array<{
    currentCapturedAt: number
    previousCapturedAt: number
  }>
}

export function buildSelfEvolutionFocusHistoryPatternContext(input: {
  pattern: SelfEvolutionFocusHistoryPattern
  preferredSide: 'current' | 'previous'
}) {
  const occurrence = input.pattern.occurrences[0]
  if (!occurrence)
    return null

  return {
    currentCapturedAt: occurrence.currentCapturedAt,
    previousCapturedAt: occurrence.previousCapturedAt,
    side: input.preferredSide,
    summaryLine: `将工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}。`,
  }
}
