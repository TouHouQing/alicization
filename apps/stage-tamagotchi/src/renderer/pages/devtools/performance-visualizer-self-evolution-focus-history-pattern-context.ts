import { formatSelfEvolutionWorkflowSideLabel } from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionFocusHistoryPattern {
  patternKey: string
  bodyContinuityPattern?: boolean
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
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

  const summaryLine = `将工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}。`

  return {
    currentCapturedAt: occurrence.currentCapturedAt,
    previousCapturedAt: occurrence.previousCapturedAt,
    side: input.preferredSide,
    summaryLine,
  }
}
