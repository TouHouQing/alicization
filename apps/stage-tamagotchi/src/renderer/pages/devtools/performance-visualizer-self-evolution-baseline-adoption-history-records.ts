interface SelfEvolutionBaselineAdoptionRecordLike {
  adoptedAt: number
  snapshotCapturedAt: number
  decisionTraceId: string | null
  adoptionMode: 'adopt-now'
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  prosodyAuthorityNote?: string | null
}

export function appendSelfEvolutionBaselineAdoptionHistory(input: {
  history: SelfEvolutionBaselineAdoptionRecordLike[]
  record: SelfEvolutionBaselineAdoptionRecordLike | null
}) {
  if (!input.record)
    return input.history

  const record = input.record
  const hasDuplicate = input.history.some(item =>
    item.snapshotCapturedAt === record.snapshotCapturedAt
    && item.decisionTraceId === record.decisionTraceId
    && item.adoptionMode === record.adoptionMode,
  )

  if (hasDuplicate) {
    return input.history.map((item) => {
      if (
        item.snapshotCapturedAt === record.snapshotCapturedAt
        && item.decisionTraceId === record.decisionTraceId
        && item.adoptionMode === record.adoptionMode
      ) {
        const existingNote = typeof item.prosodyAuthorityNote === 'string' ? item.prosodyAuthorityNote.trim() : ''
        const incomingNote = typeof record.prosodyAuthorityNote === 'string' ? record.prosodyAuthorityNote.trim() : ''
        const shouldRefreshBodyPhase = item.bodyContinuityPhase == null && record.bodyContinuityPhase != null
        const shouldRefreshRendererSurface = item.rendererRejoinSurfaceKey == null && record.rendererRejoinSurfaceKey != null
        const shouldRefreshSurvivingVisibleLane = item.survivingVisibleLane == null && record.survivingVisibleLane != null
        return {
          ...item,
          prosodyAuthorityNote: !existingNote && incomingNote
            ? incomingNote
            : item.prosodyAuthorityNote,
          ...(shouldRefreshBodyPhase
            ? { bodyContinuityPhase: record.bodyContinuityPhase }
            : {}),
          ...(shouldRefreshRendererSurface
            ? { rendererRejoinSurfaceKey: record.rendererRejoinSurfaceKey }
            : {}),
          ...(shouldRefreshSurvivingVisibleLane
            ? { survivingVisibleLane: record.survivingVisibleLane }
            : {}),
        }
      }
      return item
    })
  }

  return [
    record,
    ...input.history,
  ].sort((left, right) => right.adoptedAt - left.adoptedAt).slice(0, 10)
}
