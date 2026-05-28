interface SelfEvolutionFocusPlanSnapshotInput {
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path' | null
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  explanation: string | null
}

interface BuildSelfEvolutionFocusSnapshotInput {
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  focusPlan: SelfEvolutionFocusPlanSnapshotInput
  capturedAt: number
}

export function buildSelfEvolutionFocusSnapshot(
  input: BuildSelfEvolutionFocusSnapshotInput,
) {
  if (!input.focusPlan.selectedCardId)
    return null

  return {
    version: 'self-evolution-focus-snapshot/v1',
    candidateId: input.candidateId,
    decisionTraceId: input.decisionTraceId,
    activeThreadId: input.activeThreadId,
    selectedCardId: input.focusPlan.selectedCardId,
    explanation: input.focusPlan.explanation,
    highlightedEvidencePanelIds: input.focusPlan.highlightedEvidencePanelIds,
    highlightedTraceSectionIds: input.focusPlan.highlightedTraceSectionIds,
    recommendedTraceEventId: input.focusPlan.recommendedTraceEventId,
    capturedAt: input.capturedAt,
  }
}
