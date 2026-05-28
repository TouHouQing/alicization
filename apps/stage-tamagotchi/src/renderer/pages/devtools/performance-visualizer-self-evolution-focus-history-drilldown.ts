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
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  capturedAt: number
}

function joinArrow(values: string[]) {
  return values.join(' -> ')
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

    const currentCard = current.selectedCardId
    const previousCard = previous.selectedCardId
    const currentEvidence = joinArrow(current.highlightedEvidencePanelIds.map(formatSelfEvolutionEvidencePanelLabel))
    const previousEvidence = joinArrow(previous.highlightedEvidencePanelIds.map(formatSelfEvolutionEvidencePanelLabel))
    const currentTraceTargets = joinArrow(current.highlightedTraceSectionIds.map(formatSelfEvolutionTraceSectionLabel))
    const previousTraceTargets = joinArrow(previous.highlightedTraceSectionIds.map(formatSelfEvolutionTraceSectionLabel))
    const currentTraceEvent = formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId ?? 'n/a')
    const previousTraceEvent = formatSelfEvolutionTraceEventLabel(previous.recommendedTraceEventId ?? 'n/a')

    const changedFocusCard = currentCard !== previousCard
    const changedEvidenceTargets = currentEvidence !== previousEvidence
    const changedTraceTargets = currentTraceTargets !== previousTraceTargets
    const changedTraceEvent = currentTraceEvent !== previousTraceEvent

    const lines = [
      changedFocusCard ? `聚焦卡片：${formatSelfEvolutionFocusCardLabel(previousCard)} -> ${formatSelfEvolutionFocusCardLabel(currentCard)}` : null,
      changedEvidenceTargets ? `证据面板：${previousEvidence} => ${currentEvidence}` : null,
      changedTraceTargets ? `轨迹段：${previousTraceTargets} => ${currentTraceTargets}` : null,
      changedTraceEvent ? `轨迹事件：${previousTraceEvent} -> ${currentTraceEvent}` : null,
    ].filter((line): line is string => Boolean(line))

    if (lines.length === 0)
      continue

    drilldown.push({
      currentCapturedAt: current.capturedAt,
      previousCapturedAt: previous.capturedAt,
      currentDecisionTraceId: current.decisionTraceId,
      previousDecisionTraceId: previous.decisionTraceId,
      changedFocusCard,
      changedEvidenceTargets,
      changedTraceTargets,
      changedTraceEvent,
      lines,
    })
  }

  return drilldown
}
