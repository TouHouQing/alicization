interface SelfEvolutionBaselineAdoptionLike {
  mode: 'adopt-now' | 'observe' | 'reject'
  summaryLine: string
  detailLine: string
  supportingLines: string[]
}

interface SelfEvolutionFocusSnapshotLike {
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

function pickBodyContinuityGovernanceNote(supportingLines: string[]) {
  return supportingLines.find(line =>
    line.includes('身体连续性已经明确进入身体承接态 -> 显形补回态')
    || line.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
    || line.includes('身体线已经先把这段 living segment 托住')
    || line.includes('同一条连续身体线')
    || line.includes('身体连续性已经明确处于身体独撑态')
    || line.includes('独自托住同一段 living segment')
    || line.includes('跨模态重锁态')
    || line.includes('显形回接失身态'),
  ) ?? null
}

function inferBodyContinuityPhaseFromGovernanceNote(note: string | null) {
  if (!note)
    return null
  if (note.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body' as const
  if (note.includes('跨模态重锁态'))
    return 'full-cross-modal-lock' as const
  if (note.includes('身体独撑态') || note.includes('独自托住同一段 living segment'))
    return 'body-only-hold' as const
  if (
    note.includes('身体连续性已经明确进入身体承接态 -> 显形补回态')
    || note.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }
  return null
}

export function buildSelfEvolutionBaselineAdoptionRecord(input: {
  baselineAdoption: SelfEvolutionBaselineAdoptionLike | null
  latestSnapshot: SelfEvolutionFocusSnapshotLike | null
  activePatternKey: string | null
  repairOwnerHint: string | null
  prosodyAuthorityNote: string | null
  capturedAt: number
}) {
  if (!input.baselineAdoption || input.baselineAdoption.mode !== 'adopt-now' || !input.latestSnapshot)
    return null

  const prosodyAuthorityNote = input.prosodyAuthorityNote
    ?? input.baselineAdoption.supportingLines.find(line => line.includes('韵律权威链'))
    ?? null
  const continuityGovernanceNote = input.baselineAdoption.supportingLines.find(line =>
    line.includes('identity-continuity 连续性治理已经再次确认'),
  ) ?? null
  const projectStateContinuityGovernanceNote = input.baselineAdoption.supportingLines.find(line =>
    line.includes('项目状态连续性治理已经再次确认'),
  ) ?? null
  const relationshipCadenceGovernanceNote = input.baselineAdoption.supportingLines.find(line =>
    line.includes('relationship cadence 治理已经再次确认'),
  ) ?? input.baselineAdoption.supportingLines.find(line =>
    line.includes('relationship cadence 治理已经再次确认，并开始内化为长期关系节律'),
  ) ?? null
  const bodyContinuityGovernanceNote = pickBodyContinuityGovernanceNote(input.baselineAdoption.supportingLines)
  const bodyContinuityPhase = input.latestSnapshot.bodyContinuityPhase
    ?? inferBodyContinuityPhaseFromGovernanceNote(bodyContinuityGovernanceNote)
    ?? null

  return {
    version: 'self-evolution-baseline-adoption/v1',
    adoptedAt: input.capturedAt,
    snapshotCapturedAt: input.latestSnapshot.capturedAt,
    candidateId: input.latestSnapshot.candidateId,
    decisionTraceId: input.latestSnapshot.decisionTraceId,
    activeThreadId: input.latestSnapshot.activeThreadId,
    selectedCardId: input.latestSnapshot.selectedCardId,
    activePatternKey: input.activePatternKey,
    repairOwnerHint: input.repairOwnerHint,
    adoptionMode: input.baselineAdoption.mode,
    summaryLine: input.baselineAdoption.summaryLine,
    bodyContinuityPhase,
    rendererRejoinSurfaceKey: input.latestSnapshot.rendererRejoinSurfaceKey ?? null,
    ...(input.latestSnapshot.survivingVisibleLane
      ? { survivingVisibleLane: input.latestSnapshot.survivingVisibleLane }
      : {}),
    prosodyAuthorityNote,
    continuityGovernanceNote,
    relationshipCadenceGovernanceNote,
    projectStateContinuityGovernanceNote,
    bodyContinuityGovernanceNote,
  }
}
