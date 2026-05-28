type SelfEvolutionFocusCardId = 'repair-owner' | 'first-check' | 'repair-path'

interface SelfEvolutionFocusSnapshotRecord {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: SelfEvolutionFocusCardId
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

export function buildSelfEvolutionFocusHistoryRestorePlan(input: {
  history: SelfEvolutionFocusSnapshotRecord[]
  transition: SelfEvolutionFocusHistoryTransition
  side: 'current' | 'previous'
}) {
  const capturedAt = input.side === 'current'
    ? input.transition.currentCapturedAt
    : input.transition.previousCapturedAt

  const snapshot = input.history.find(item => item.capturedAt === capturedAt)
  if (!snapshot)
    return null

  return {
    snapshotCapturedAt: snapshot.capturedAt,
    candidateId: snapshot.candidateId,
    decisionTraceId: snapshot.decisionTraceId,
    selectedCardId: snapshot.selectedCardId,
    recommendedTraceEventId: snapshot.recommendedTraceEventId,
    shouldDrillTrace: snapshot.highlightedTraceSectionIds.length > 0 || Boolean(snapshot.recommendedTraceEventId),
    highlightedEvidencePanelIds: snapshot.highlightedEvidencePanelIds,
    highlightedTraceSectionIds: snapshot.highlightedTraceSectionIds,
  }
}
