import {
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionFocusCardLabel,
  formatSelfEvolutionTraceEventLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionCurrentFocusLike {
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path' | null
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  explanation: string | null
}

interface SelfEvolutionCapturedFocusLike {
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

export function buildSelfEvolutionFocusDiffSummary(input: {
  current: SelfEvolutionCurrentFocusLike
  snapshot: SelfEvolutionCapturedFocusLike | null
}) {
  if (!input.snapshot)
    return null

  const lines: string[] = []
  const currentCard = input.current.selectedCardId ?? 'n/a'
  const snapshotCard = input.snapshot.selectedCardId
  lines.push(
    currentCard === snapshotCard
      ? `聚焦卡片：未变化（${formatSelfEvolutionFocusCardLabel(currentCard)}）`
      : `聚焦卡片：${formatSelfEvolutionFocusCardLabel(snapshotCard)} -> ${formatSelfEvolutionFocusCardLabel(currentCard)}`,
  )

  const currentEvidence = joinArrow(input.current.highlightedEvidencePanelIds.map(formatSelfEvolutionEvidencePanelLabel))
  const snapshotEvidence = joinArrow(input.snapshot.highlightedEvidencePanelIds.map(formatSelfEvolutionEvidencePanelLabel))
  lines.push(
    currentEvidence === snapshotEvidence
      ? '证据面板：未变化'
      : `证据面板：${snapshotEvidence} => ${currentEvidence}`,
  )

  const currentTrace = joinArrow(input.current.highlightedTraceSectionIds.map(formatSelfEvolutionTraceSectionLabel))
  const snapshotTrace = joinArrow(input.snapshot.highlightedTraceSectionIds.map(formatSelfEvolutionTraceSectionLabel))
  lines.push(
    currentTrace === snapshotTrace
      ? '轨迹段：未变化'
      : `轨迹段：${snapshotTrace} => ${currentTrace}`,
  )

  const currentEvent = formatSelfEvolutionTraceEventLabel(input.current.recommendedTraceEventId ?? 'n/a')
  const snapshotEvent = formatSelfEvolutionTraceEventLabel(input.snapshot.recommendedTraceEventId ?? 'n/a')
  lines.push(
    currentEvent === snapshotEvent
      ? `轨迹事件：未变化（${currentEvent}）`
      : `轨迹事件：${snapshotEvent} -> ${currentEvent}`,
  )

  const sameHerContinuityProgression = (
    input.snapshot.selectedCardId === 'repair-owner'
    && input.current.selectedCardId === 'first-check'
    && input.snapshot.recommendedTraceEventId === 'event-takeover'
    && input.current.recommendedTraceEventId === 'event-governance'
    && input.current.highlightedEvidencePanelIds.includes('candidate-trajectory-summary')
    && input.current.highlightedEvidencePanelIds.includes('proactive-decision-consumption-summary')
    && input.current.highlightedEvidencePanelIds.includes('identity-drift-governance-summary')
  )

  if (sameHerContinuityProgression) {
    lines.push('连续性说明：这不是普通聚焦漂移，而是 same-her continuity governance 从审视阶段推进到确认阶段。')
  }

  return lines
}
