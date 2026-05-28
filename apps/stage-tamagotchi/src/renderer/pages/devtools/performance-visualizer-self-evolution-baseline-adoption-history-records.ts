interface SelfEvolutionBaselineAdoptionRecordLike {
  adoptedAt: number
  snapshotCapturedAt: number
  decisionTraceId: string | null
  adoptionMode: 'adopt-now'
  prosodyAuthorityNote?: string | null
  continuityGovernanceNote?: string | null
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
        if (!existingNote && incomingNote)
          return { ...item, prosodyAuthorityNote: incomingNote }
        if (!existingContinuityNote && incomingContinuityNote)
          return { ...item, continuityGovernanceNote: incomingContinuityNote }
      }
      return item
    })
  }

  return [
    input.record,
    ...input.history,
  ].sort((left, right) => right.adoptedAt - left.adoptedAt).slice(0, 10)
}
