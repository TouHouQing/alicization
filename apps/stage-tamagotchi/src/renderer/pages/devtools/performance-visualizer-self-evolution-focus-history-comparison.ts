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

interface SelfEvolutionFocusHistoryTransition {
  currentCapturedAt: number
  previousCapturedAt: number
  currentDecisionTraceId: string | null
  previousDecisionTraceId: string | null
  changedFocusCard: boolean
  changedEvidenceTargets: boolean
  changedTraceTargets: boolean
  changedTraceEvent: boolean
  lines: string[]
}

function diffGained(current: string[], previous: string[]) {
  return current.filter(value => !previous.includes(value))
}

function diffLost(current: string[], previous: string[]) {
  return previous.filter(value => !current.includes(value))
}

function formatStable(label: string, value: string | null) {
  return `${label}：稳定（${value ?? 'n/a'}）`
}

function formatChanged(label: string, previous: string | null, current: string | null) {
  return `${label}：${previous ?? 'n/a'} -> ${current ?? 'n/a'}`
}

export function buildSelfEvolutionFocusHistoryComparison(input: {
  history: SelfEvolutionFocusSnapshotRecord[]
  transition: SelfEvolutionFocusHistoryTransition
}) {
  const previous = input.history.find(item => item.capturedAt === input.transition.previousCapturedAt)
  const current = input.history.find(item => item.capturedAt === input.transition.currentCapturedAt)

  if (!previous || !current)
    return null

  const evidenceGained = diffGained(current.highlightedEvidencePanelIds, previous.highlightedEvidencePanelIds)
  const evidenceLost = diffLost(current.highlightedEvidencePanelIds, previous.highlightedEvidencePanelIds)
  const traceTargetsGained = diffGained(current.highlightedTraceSectionIds, previous.highlightedTraceSectionIds)
  const traceTargetsLost = diffLost(current.highlightedTraceSectionIds, previous.highlightedTraceSectionIds)

  const summaryLines = [
    input.transition.changedFocusCard
      ? formatChanged('聚焦卡片', formatSelfEvolutionFocusCardLabel(previous.selectedCardId), formatSelfEvolutionFocusCardLabel(current.selectedCardId))
      : formatStable('聚焦卡片', formatSelfEvolutionFocusCardLabel(current.selectedCardId)),
    previous.candidateId === current.candidateId
      ? formatStable('候选项', current.candidateId)
      : formatChanged('候选项', previous.candidateId, current.candidateId),
    previous.decisionTraceId === current.decisionTraceId
      ? formatStable('决策轨迹', current.decisionTraceId)
      : formatChanged('决策轨迹', previous.decisionTraceId, current.decisionTraceId),
    input.transition.changedTraceEvent
      ? formatChanged('轨迹事件', formatSelfEvolutionTraceEventLabel(previous.recommendedTraceEventId), formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId))
      : formatStable('轨迹事件', formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId)),
    evidenceGained.length > 0 ? `新增证据面板：${evidenceGained.map(formatSelfEvolutionEvidencePanelLabel).join('，')}` : null,
    evidenceLost.length > 0 ? `移除证据面板：${evidenceLost.map(formatSelfEvolutionEvidencePanelLabel).join('，')}` : null,
    traceTargetsGained.length > 0 ? `新增轨迹段：${traceTargetsGained.map(formatSelfEvolutionTraceSectionLabel).join('，')}` : null,
    traceTargetsLost.length > 0 ? `移除轨迹段：${traceTargetsLost.map(formatSelfEvolutionTraceSectionLabel).join('，')}` : null,
  ].filter((line): line is string => Boolean(line))

  return {
    previous: {
      capturedAt: previous.capturedAt,
      candidateId: previous.candidateId,
      decisionTraceId: previous.decisionTraceId,
      activeThreadId: previous.activeThreadId,
      selectedCardId: previous.selectedCardId,
      recommendedTraceEventId: previous.recommendedTraceEventId,
      evidenceTargets: previous.highlightedEvidencePanelIds,
      traceTargets: previous.highlightedTraceSectionIds,
    },
    current: {
      capturedAt: current.capturedAt,
      candidateId: current.candidateId,
      decisionTraceId: current.decisionTraceId,
      activeThreadId: current.activeThreadId,
      selectedCardId: current.selectedCardId,
      recommendedTraceEventId: current.recommendedTraceEventId,
      evidenceTargets: current.highlightedEvidencePanelIds,
      traceTargets: current.highlightedTraceSectionIds,
    },
    focusCardChanged: input.transition.changedFocusCard,
    traceEventChanged: input.transition.changedTraceEvent,
    evidenceGained,
    evidenceLost,
    traceTargetsGained,
    traceTargetsLost,
    summaryLines,
  }
}
