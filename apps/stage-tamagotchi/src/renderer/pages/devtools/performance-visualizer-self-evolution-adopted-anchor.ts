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
  prosodyAuthorityNote?: string | null
  continuityGovernanceNote?: string | null
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
    prosodyAuthorityNote: latest.prosodyAuthorityNote ?? null,
    continuityGovernanceNote: latest.continuityGovernanceNote ?? null,
  }
}
