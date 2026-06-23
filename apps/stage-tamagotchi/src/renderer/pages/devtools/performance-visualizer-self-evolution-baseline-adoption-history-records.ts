interface SelfEvolutionBaselineAdoptionRecordLike {
  adoptedAt: number
  snapshotCapturedAt: number
  decisionTraceId: string | null
  adoptionMode: 'adopt-now'
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  prosodyAuthorityNote?: string | null
  continuityGovernanceNote?: string | null
  relationshipCadenceGovernanceNote?: string | null
  projectStateContinuityGovernanceNote?: string | null
  bodyContinuityGovernanceNote?: string | null
}

export function appendSelfEvolutionBaselineAdoptionHistory(input: {
  history: SelfEvolutionBaselineAdoptionRecordLike[]
  record: SelfEvolutionBaselineAdoptionRecordLike | null
}) {
  if (!input.record)
    return input.history

  const hasDuplicate = input.history.some(item =>
    item.snapshotCapturedAt === input.record?.snapshotCapturedAt
    && item.decisionTraceId === input.record?.decisionTraceId
    && item.adoptionMode === input.record?.adoptionMode,
  )

  if (hasDuplicate) {
    return input.history.map((item) => {
      if (
        item.snapshotCapturedAt === input.record?.snapshotCapturedAt
        && item.decisionTraceId === input.record?.decisionTraceId
        && item.adoptionMode === input.record?.adoptionMode
      ) {
        const existingNote = typeof item.prosodyAuthorityNote === 'string' ? item.prosodyAuthorityNote.trim() : ''
        const incomingNote = typeof input.record?.prosodyAuthorityNote === 'string' ? input.record.prosodyAuthorityNote.trim() : ''
        const existingContinuityNote = typeof item.continuityGovernanceNote === 'string' ? item.continuityGovernanceNote.trim() : ''
        const incomingContinuityNote = typeof input.record?.continuityGovernanceNote === 'string' ? input.record.continuityGovernanceNote.trim() : ''
        const existingRelationshipCadenceNote = typeof item.relationshipCadenceGovernanceNote === 'string' ? item.relationshipCadenceGovernanceNote.trim() : ''
        const incomingRelationshipCadenceNote = typeof input.record?.relationshipCadenceGovernanceNote === 'string' ? input.record.relationshipCadenceGovernanceNote.trim() : ''
        const existingProjectStateContinuityNote = typeof item.projectStateContinuityGovernanceNote === 'string' ? item.projectStateContinuityGovernanceNote.trim() : ''
        const incomingProjectStateContinuityNote = typeof input.record?.projectStateContinuityGovernanceNote === 'string' ? input.record.projectStateContinuityGovernanceNote.trim() : ''
        const existingBodyContinuityNote = typeof item.bodyContinuityGovernanceNote === 'string' ? item.bodyContinuityGovernanceNote.trim() : ''
        const incomingBodyContinuityNote = typeof input.record?.bodyContinuityGovernanceNote === 'string' ? input.record.bodyContinuityGovernanceNote.trim() : ''
        const shouldRefreshSurvivingVisibleLane = item.survivingVisibleLane == null && input.record?.survivingVisibleLane != null
        const shouldRefreshBodyPhase = (item.bodyContinuityPhase == null && input.record?.bodyContinuityPhase != null)
          || (item.rendererRejoinSurfaceKey == null && input.record?.rendererRejoinSurfaceKey != null)
        const nextItem = {
          ...item,
          prosodyAuthorityNote: !existingNote && incomingNote
            ? incomingNote
            : item.prosodyAuthorityNote,
          continuityGovernanceNote: !existingContinuityNote && incomingContinuityNote
            ? incomingContinuityNote
            : item.continuityGovernanceNote,
          relationshipCadenceGovernanceNote: !existingRelationshipCadenceNote && incomingRelationshipCadenceNote
            ? incomingRelationshipCadenceNote
            : item.relationshipCadenceGovernanceNote,
          projectStateContinuityGovernanceNote: !existingProjectStateContinuityNote && incomingProjectStateContinuityNote
            ? incomingProjectStateContinuityNote
            : item.projectStateContinuityGovernanceNote,
          bodyContinuityGovernanceNote: !existingBodyContinuityNote && incomingBodyContinuityNote
            ? incomingBodyContinuityNote
            : item.bodyContinuityGovernanceNote,
          survivingVisibleLane: shouldRefreshSurvivingVisibleLane
            ? input.record?.survivingVisibleLane ?? item.survivingVisibleLane ?? null
            : item.survivingVisibleLane,
          bodyContinuityPhase: (!existingBodyContinuityNote && incomingBodyContinuityNote) || shouldRefreshBodyPhase
            ? input.record?.bodyContinuityPhase ?? item.bodyContinuityPhase ?? null
            : item.bodyContinuityPhase,
          rendererRejoinSurfaceKey: (!existingBodyContinuityNote && incomingBodyContinuityNote) || shouldRefreshBodyPhase
            ? input.record?.rendererRejoinSurfaceKey ?? item.rendererRejoinSurfaceKey ?? null
            : item.rendererRejoinSurfaceKey,
        }
        return nextItem
      }
      return item
    })
  }

  return [
    input.record,
    ...input.history,
  ].sort((left, right) => right.adoptedAt - left.adoptedAt).slice(0, 10)
}
