export function buildSelfEvolutionBaselineAdoptionHistorySummary(input: Array<{
  version?: string
  adoptedAt?: number
  snapshotCapturedAt: number
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId?: string | null
  selectedCardId?: string | null
  activePatternKey?: string | null
  repairOwnerHint: string | null
  adoptionMode?: string | null
  summaryLine?: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  prosodyAuthorityNote?: string | null
  continuityGovernanceNote?: string | null
  relationshipCadenceGovernanceNote?: string | null
  projectStateContinuityGovernanceNote?: string | null
  bodyContinuityGovernanceNote?: string | null
}>) {
  if (input.length === 0)
    return null

  const latest = input[0]
  const previous = input[1] ?? null

  const survivingVisibleLane = latest.survivingVisibleLane
    ?? (latest.bodyContinuityGovernanceNote?.includes('当前仅剩表情、口型、声音维持同一段连续性')
      ? 'face+lipsync+voice-only'
      : latest.bodyContinuityGovernanceNote?.includes('当前仅剩动作、口型、声音维持同一段连续性')
        ? 'motion+lipsync+voice-only'
        : latest.bodyContinuityGovernanceNote?.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线')
          ? 'face+lipsync-only'
          : latest.bodyContinuityGovernanceNote?.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线')
            ? 'motion+lipsync-only'
            : null)

  const inferredBodyContinuityPhase = survivingVisibleLane
    ? 'renderer-rejoin-without-body'
    : latest.bodyContinuityGovernanceNote?.includes('显形回接失身态')
      ? 'renderer-rejoin-without-body'
      : latest.bodyContinuityGovernanceNote?.includes('跨模态重锁态')
        ? 'full-cross-modal-lock'
        : latest.bodyContinuityGovernanceNote?.includes('身体独撑态')
          || latest.bodyContinuityGovernanceNote?.includes('独自托住同一段 living segment')
          ? 'body-only-hold'
          : latest.bodyContinuityGovernanceNote?.includes('身体连续性已经明确进入身体承接态 -> 显形补回态')
            || latest.bodyContinuityGovernanceNote?.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
            ? 'body-carried-to-renderer-rejoin'
            : latest.bodyContinuityPhase ?? null
  const bodyContinuityPhase = latest.bodyContinuityPhase ?? inferredBodyContinuityPhase

  const lines = [
    `当前默认连续性参照：快照 ${latest.snapshotCapturedAt}，候选项 ${latest.candidateId ?? 'n/a'}，轨迹 ${latest.decisionTraceId ?? 'n/a'}。`,
    `最近 ${input.length} 次基线采纳均带有显式审计记录。`,
    `最新采纳归属：${latest.repairOwnerHint ?? 'n/a'}；上一轮采纳归属：${previous?.repairOwnerHint ?? 'n/a'}。`,
  ]

  const surface = latest.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
    ? 'Live2D'
    : latest.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
      ? 'VRM'
      : latest.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech'
        ? 'speech'
        : null

  if (bodyContinuityPhase === 'body-carried-to-renderer-rejoin') {
    lines.push(
      surface
        ? `最新身体连续性阶段：身体承接态 -> 显形补回态（${surface} authority rejoin）。`
        : '最新身体连续性阶段：身体承接态 -> 显形补回态。',
    )
  }
  else if (bodyContinuityPhase === 'full-cross-modal-lock') {
    lines.push(
      surface
        ? `最新身体连续性阶段：跨模态重锁态（${surface} authority lock）。`
        : '最新身体连续性阶段：跨模态重锁态。',
    )
  }
  else if (bodyContinuityPhase === 'renderer-rejoin-without-body') {
    lines.push(
      survivingVisibleLane === 'face+lipsync+voice-only'
        ? '最新身体连续性阶段：显形回接失身态（表情、口型、声音 identity-continuity continuity 仍在维持）。'
        : survivingVisibleLane === 'motion+lipsync+voice-only'
          ? '最新身体连续性阶段：显形回接失身态（动作、口型、声音 identity-continuity continuity 仍在维持）。'
          : survivingVisibleLane === 'face+lipsync-only'
            ? '最新身体连续性阶段：显形回接失身态（表情、口型 identity-continuity continuity 仍在维持）。'
            : survivingVisibleLane === 'motion+lipsync-only'
              ? '最新身体连续性阶段：显形回接失身态（动作、口型 identity-continuity continuity 仍在维持）。'
              : surface
                ? `最新身体连续性阶段：显形回接失身态（${surface} authority rejoin without same-segment body carry）。`
                : '最新身体连续性阶段：显形回接失身态。',
    )
  }
  else if (bodyContinuityPhase === 'body-only-hold') {
    lines.push('最新身体连续性阶段：身体独撑态。')
  }

  if (latest.prosodyAuthorityNote)
    lines.push(`最新采纳说明：${latest.prosodyAuthorityNote}`)
  else if (latest.bodyContinuityGovernanceNote)
    lines.push(`最新采纳说明：${latest.bodyContinuityGovernanceNote}`)
  else if (latest.projectStateContinuityGovernanceNote)
    lines.push(`最新采纳说明：${latest.projectStateContinuityGovernanceNote}`)
  else if (latest.continuityGovernanceNote)
    lines.push(`最新采纳说明：${latest.continuityGovernanceNote}`)
  else if (latest.relationshipCadenceGovernanceNote)
    lines.push(`最新采纳说明：${latest.relationshipCadenceGovernanceNote}`)

  return lines
}
