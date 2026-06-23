interface SelfEvolutionFocusPlanSnapshotInput {
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path' | null
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  explanation: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  bodyContinuityGovernanceNote?: string | null
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
    bodyContinuityPhase: input.focusPlan.bodyContinuityPhase ?? null,
    rendererRejoinSurfaceKey: input.focusPlan.rendererRejoinSurfaceKey ?? null,
    ...(input.focusPlan.survivingVisibleLane
      ? { survivingVisibleLane: input.focusPlan.survivingVisibleLane }
      : {}),
    ...(input.focusPlan.bodyContinuityGovernanceNote
      ? { bodyContinuityGovernanceNote: input.focusPlan.bodyContinuityGovernanceNote }
      : {}),
    highlightedEvidencePanelIds: input.focusPlan.highlightedEvidencePanelIds,
    highlightedTraceSectionIds: input.focusPlan.highlightedTraceSectionIds,
    recommendedTraceEventId: input.focusPlan.recommendedTraceEventId,
    capturedAt: input.capturedAt,
  }
}
