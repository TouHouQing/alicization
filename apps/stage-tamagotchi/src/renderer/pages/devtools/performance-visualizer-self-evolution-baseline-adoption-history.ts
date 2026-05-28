export function buildSelfEvolutionBaselineAdoptionHistorySummary(input: Array<{
  snapshotCapturedAt: number
  candidateId: string | null
  decisionTraceId: string | null
  repairOwnerHint: string | null
  prosodyAuthorityNote?: string | null
  continuityGovernanceNote?: string | null
}>) {
  if (input.length === 0)
    return null

  const latest = input[0]
  const previous = input[1] ?? null

  const lines = [
    `当前默认连续性参照：快照 ${latest.snapshotCapturedAt}，候选项 ${latest.candidateId ?? 'n/a'}，轨迹 ${latest.decisionTraceId ?? 'n/a'}。`,
    `最近 ${input.length} 次基线采纳均带有显式审计记录。`,
    `最新采纳归属：${latest.repairOwnerHint ?? 'n/a'}；上一轮采纳归属：${previous?.repairOwnerHint ?? 'n/a'}。`,
  ]

  if (latest.prosodyAuthorityNote)
    lines.push(`最新采纳说明：${latest.prosodyAuthorityNote}`)
  else if (latest.continuityGovernanceNote)
    lines.push(`最新采纳说明：${latest.continuityGovernanceNote}`)

  return lines
}
