import {
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionFocusCardLabel,
  formatSelfEvolutionTraceEventLabel,
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

function countValues(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function formatCounts(counts: Map<string, number>) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([value, count]) => `${formatSelfEvolutionFocusCardLabel(value)} x${count}`)
    .join('，')
}

export function buildSelfEvolutionFocusHistorySummary(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  if (history.length === 0)
    return null

  const focusCounts = countValues(history.map(item => item.selectedCardId))
  const stableEvidence = [...countValues(history.flatMap(item => item.highlightedEvidencePanelIds)).entries()]
    .filter(([, count]) => count === history.length)
    .map(([value]) => value)
    .sort()
    .map(formatSelfEvolutionEvidencePanelLabel)
  const driftingEvidence = [...countValues(history.flatMap(item => item.highlightedEvidencePanelIds)).entries()]
    .filter(([, count]) => count < history.length)
    .map(([value]) => value)
    .sort()
    .map(formatSelfEvolutionEvidencePanelLabel)
  const eventCounts = countValues(history.map(item => formatSelfEvolutionTraceEventLabel(item.recommendedTraceEventId ?? 'n/a')))

  return [
    `历史快照数：${history.length}`,
    focusCounts.size === 1
      ? `聚焦卡片：稳定（${formatSelfEvolutionFocusCardLabel(history[0]!.selectedCardId)}）`
      : `聚焦卡片：存在漂移（${formatCounts(focusCounts)}）`,
    `稳定证据面板：${stableEvidence.length > 0 ? stableEvidence.join('，') : 'n/a'}`,
    `漂移证据面板：${driftingEvidence.length > 0 ? driftingEvidence.join('，') : 'n/a'}`,
    eventCounts.size === 1
      ? `轨迹事件：稳定（${formatSelfEvolutionTraceEventLabel(history[0]!.recommendedTraceEventId ?? 'n/a')}）`
      : `轨迹事件：存在漂移（${[...eventCounts.keys()].join('，')}）`,
  ]
}
