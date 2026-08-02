import {
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionFocusCardLabel,
  formatSelfEvolutionTraceEventLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

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

function formatList(values: string[]) {
  return values.length > 0 ? values.join(' -> ') : 'n/a'
}

function formatValue(value: string | null | undefined) {
  return value ?? 'n/a'
}

export function buildSelfEvolutionFocusHistoryDrilldown(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  if (history.length < 2)
    return []

  const sortedHistory = [...history]
    .sort((left, right) => right.capturedAt - left.capturedAt)
  const drilldown = []

  for (let index = 0; index < sortedHistory.length - 1; index += 1) {
    const current = sortedHistory[index]!
    const previous = sortedHistory[index + 1]!
    const currentEvidence = current.highlightedEvidencePanelIds.map(formatSelfEvolutionEvidencePanelLabel)
    const previousEvidence = previous.highlightedEvidencePanelIds.map(formatSelfEvolutionEvidencePanelLabel)
    const currentTraceTargets = current.highlightedTraceSectionIds.map(formatSelfEvolutionTraceSectionLabel)
    const previousTraceTargets = previous.highlightedTraceSectionIds.map(formatSelfEvolutionTraceSectionLabel)
    const currentTraceEvent = formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId ?? 'n/a')
    const previousTraceEvent = formatSelfEvolutionTraceEventLabel(previous.recommendedTraceEventId ?? 'n/a')

    const changedFocusCard = current.selectedCardId !== previous.selectedCardId
    const changedEvidenceTargets = current.highlightedEvidencePanelIds.join('\n') !== previous.highlightedEvidencePanelIds.join('\n')
    const changedTraceTargets = current.highlightedTraceSectionIds.join('\n') !== previous.highlightedTraceSectionIds.join('\n')
    const changedTraceEvent = current.recommendedTraceEventId !== previous.recommendedTraceEventId
    const changedBodyContinuityPhase = current.bodyContinuityPhase !== previous.bodyContinuityPhase
    const changedRendererRejoinSurface = current.rendererRejoinSurfaceKey !== previous.rendererRejoinSurfaceKey
    const changedSurvivingVisibleLane = current.survivingVisibleLane !== previous.survivingVisibleLane

    const lines = [
      changedFocusCard
        ? `focusCard: ${formatSelfEvolutionFocusCardLabel(previous.selectedCardId)} -> ${formatSelfEvolutionFocusCardLabel(current.selectedCardId)}`
        : null,
      changedEvidenceTargets
        ? `evidencePanels: ${formatList(previousEvidence)} => ${formatList(currentEvidence)}`
        : null,
      changedTraceTargets
        ? `traceSections: ${formatList(previousTraceTargets)} => ${formatList(currentTraceTargets)}`
        : null,
      changedTraceEvent
        ? `traceEvent: ${previousTraceEvent} -> ${currentTraceEvent}`
        : null,
      changedBodyContinuityPhase
        ? `bodyContinuityPhase: ${formatValue(previous.bodyContinuityPhase)} -> ${formatValue(current.bodyContinuityPhase)}`
        : null,
      changedRendererRejoinSurface
        ? `rendererRejoinSurfaceKey: ${formatValue(previous.rendererRejoinSurfaceKey)} -> ${formatValue(current.rendererRejoinSurfaceKey)}`
        : null,
      changedSurvivingVisibleLane
        ? `survivingVisibleLane: ${formatValue(previous.survivingVisibleLane)} -> ${formatValue(current.survivingVisibleLane)}`
        : null,
    ].filter((line): line is string => Boolean(line))

    if (lines.length === 0)
      continue

    drilldown.push({
      currentCapturedAt: current.capturedAt,
      previousCapturedAt: previous.capturedAt,
      currentCandidateId: current.candidateId,
      previousCandidateId: previous.candidateId,
      currentDecisionTraceId: current.decisionTraceId,
      previousDecisionTraceId: previous.decisionTraceId,
      currentActiveThreadId: current.activeThreadId,
      previousActiveThreadId: previous.activeThreadId,
      changedFocusCard,
      changedEvidenceTargets,
      changedTraceTargets,
      changedTraceEvent,
      changedBodyContinuityPhase,
      changedRendererRejoinSurface,
      changedSurvivingVisibleLane,
      lines,
    })
  }

  return drilldown
}
