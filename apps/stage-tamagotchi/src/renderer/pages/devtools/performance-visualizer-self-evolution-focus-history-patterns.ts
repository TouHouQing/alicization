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

function diffGained(current: string[], previous: string[]) {
  return current.filter(value => !previous.includes(value))
}

function diffLost(current: string[], previous: string[]) {
  return previous.filter(value => !current.includes(value))
}

function sortValues(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

function formatSignedList(
  values: string[],
  formatter: (value: string) => string,
) {
  return values.map((value) => {
    const prefix = value.startsWith('+') || value.startsWith('-') ? value[0] : ''
    const payload = prefix ? value.slice(1) : value
    return `${prefix}${formatter(payload)}`
  }).join(' ')
}

export function buildSelfEvolutionFocusHistoryPatterns(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  if (history.length < 2)
    return []

  const sortedHistory = [...history]
    .sort((left, right) => right.capturedAt - left.capturedAt)

  const patternMap = new Map<string, {
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
  }>()

  for (let index = 0; index < sortedHistory.length - 1; index += 1) {
    const current = sortedHistory[index]!
    const previous = sortedHistory[index + 1]!

    const evidenceGained = sortValues(diffGained(current.highlightedEvidencePanelIds, previous.highlightedEvidencePanelIds))
    const evidenceLost = sortValues(diffLost(current.highlightedEvidencePanelIds, previous.highlightedEvidencePanelIds))
    const traceTargetsGained = sortValues(diffGained(current.highlightedTraceSectionIds, previous.highlightedTraceSectionIds))
    const traceTargetsLost = sortValues(diffLost(current.highlightedTraceSectionIds, previous.highlightedTraceSectionIds))
    const focusCardTransition = `${previous.selectedCardId} -> ${current.selectedCardId}`
    const traceEventTransition = `${previous.recommendedTraceEventId ?? 'n/a'} -> ${current.recommendedTraceEventId ?? 'n/a'}`

    const patternKey = [
      `focus:${focusCardTransition.replaceAll(' ', '')}`,
      `event:${traceEventTransition.replaceAll(' ', '')}`,
      `evidence:${evidenceGained.length > 0 || evidenceLost.length > 0
        ? [...evidenceGained.map(value => `+${value}`), ...evidenceLost.map(value => `-${value}`)].join(',')
        : 'none'}`,
      `trace:${traceTargetsGained.length > 0 || traceTargetsLost.length > 0
        ? [...traceTargetsGained.map(value => `+${value}`), ...traceTargetsLost.map(value => `-${value}`)].join(',')
        : 'none'}`,
    ].join('|')

    const summaryParts = [
      `${formatSelfEvolutionFocusCardLabel(previous.selectedCardId)} -> ${formatSelfEvolutionFocusCardLabel(current.selectedCardId)}`,
      traceEventTransition !== 'n/a -> n/a'
        ? `${formatSelfEvolutionTraceEventLabel(previous.recommendedTraceEventId ?? 'n/a')} -> ${formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId ?? 'n/a')}`
        : null,
      evidenceGained.length > 0 || evidenceLost.length > 0
        ? formatSignedList([
            ...evidenceGained.map(value => `+${value}`),
            ...evidenceLost.map(value => `-${value}`),
          ], formatSelfEvolutionEvidencePanelLabel)
        : null,
      traceTargetsGained.length > 0 || traceTargetsLost.length > 0
        ? formatSignedList([
            ...traceTargetsGained.map(value => `+${value}`),
            ...traceTargetsLost.map(value => `-${value}`),
          ], formatSelfEvolutionTraceSectionLabel)
        : null,
    ].filter(Boolean) as string[]

    const existing = patternMap.get(patternKey)
    if (existing) {
      existing.occurrenceCount += 1
      existing.summaryLine = `${existing.occurrenceCount}次 ${summaryParts.join(' | ')}`
      existing.occurrences.push({
        currentCapturedAt: current.capturedAt,
        previousCapturedAt: previous.capturedAt,
      })
      continue
    }

    patternMap.set(patternKey, {
      patternKey,
      occurrenceCount: 1,
      summaryLine: `1次 ${summaryParts.join(' | ')}`,
      focusCardTransition,
      traceEventTransition,
      evidenceGained,
      evidenceLost,
      traceTargetsGained,
      traceTargetsLost,
      occurrences: [{
        currentCapturedAt: current.capturedAt,
        previousCapturedAt: previous.capturedAt,
      }],
    })
  }

  return [...patternMap.values()]
    .sort((left, right) => right.occurrenceCount - left.occurrenceCount || left.patternKey.localeCompare(right.patternKey))
}
