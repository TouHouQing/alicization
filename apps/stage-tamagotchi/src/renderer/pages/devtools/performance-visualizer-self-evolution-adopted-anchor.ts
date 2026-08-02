export function buildSelfEvolutionAdoptedAnchor(input: Array<{
  version?: string
  adoptedAt: number
  snapshotCapturedAt: number
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: string | null
  activePatternKey: string | null
  repairOwnerHint: string | null
  adoptionMode?: string | null
  summaryLine?: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  prosodyAuthorityNote?: string | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}>) {
  if (input.length === 0)
    return null

  const latest = [...input].sort((left, right) => right.adoptedAt - left.adoptedAt)[0]
  return {
    adoptedAt: latest.adoptedAt,
    snapshotCapturedAt: latest.snapshotCapturedAt,
    candidateId: latest.candidateId,
    decisionTraceId: latest.decisionTraceId,
    activeThreadId: latest.activeThreadId,
    focusLabel: latest.selectedCardId,
    activePatternKey: latest.activePatternKey,
    repairOwnerHint: latest.repairOwnerHint,
    summaryLine: `当前默认连续性参照已经切换到 ${latest.snapshotCapturedAt} 的已采纳基线。`,
    bodyContinuityPhase: latest.bodyContinuityPhase ?? null,
    rendererRejoinSurfaceKey: latest.rendererRejoinSurfaceKey ?? null,
    survivingVisibleLane: latest.survivingVisibleLane ?? null,
    prosodyAuthorityNote: latest.prosodyAuthorityNote ?? null,
  }
}
