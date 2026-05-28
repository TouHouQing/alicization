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

export function appendSelfEvolutionFocusSnapshotHistory(input: {
  history: SelfEvolutionFocusSnapshotRecord[]
  snapshot: SelfEvolutionFocusSnapshotRecord
  limit: number
}) {
  return [input.snapshot, ...input.history]
    .sort((left, right) => right.capturedAt - left.capturedAt)
    .slice(0, Math.max(1, input.limit))
}
