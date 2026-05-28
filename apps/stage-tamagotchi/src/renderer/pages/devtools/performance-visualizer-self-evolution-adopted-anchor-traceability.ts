interface SelfEvolutionAdoptedAnchorLike {
  snapshotCapturedAt: number
  decisionTraceId: string | null
  activePatternKey: string | null
  repairOwnerHint: string | null
  prosodyAuthorityNote?: string | null
  continuityGovernanceNote?: string | null
}

interface SelfEvolutionPatternWorkflowLike {
  headline: string
}

interface SelfEvolutionPatternContextLike {
  summaryLine: string
}

export function buildSelfEvolutionAdoptedAnchorTraceability(input: {
  adoptedAnchor: SelfEvolutionAdoptedAnchorLike | null
  patternSummaryByKey: Record<string, string>
  workflowByPatternKey: Record<string, SelfEvolutionPatternWorkflowLike | undefined>
  patternContextByKey: Record<string, SelfEvolutionPatternContextLike | undefined>
}) {
  if (!input.adoptedAnchor)
    return null

  const patternKey = input.adoptedAnchor.activePatternKey
  if (!patternKey)
    return null

  const workflow = input.workflowByPatternKey[patternKey]
  const context = input.patternContextByKey[patternKey]
  const patternSummary = input.patternSummaryByKey[patternKey]

  const supportingLines = [
    `这张默认连续性锚点来自模式 ${patternKey}，对应快照 ${input.adoptedAnchor.snapshotCapturedAt} 与轨迹 ${input.adoptedAnchor.decisionTraceId ?? 'n/a'}。`,
    `采纳归属仍然锚定在 ${input.adoptedAnchor.repairOwnerHint ?? 'n/a'}，而不是脱离原始修复归属单独漂移。`,
  ]

  if (input.adoptedAnchor.prosodyAuthorityNote) {
    supportingLines.push(
      `采纳前提仍然可追溯到${input.adoptedAnchor.prosodyAuthorityNote.replace(/。$/, '')}，而不是 renderer 本地猜测重新接管口型。`,
    )
  }

  if (input.adoptedAnchor.continuityGovernanceNote) {
    supportingLines.push(
      `采纳前提仍然可追溯到${input.adoptedAnchor.continuityGovernanceNote.replace(/。$/, '')}，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。`,
    )
  }

  supportingLines.push('若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。')

  return {
    patternKey,
    patternSummary,
    workflowHeadline: workflow?.headline ?? null,
    workflowContextLine: context?.summaryLine ?? null,
    supportingLines,
  }
}
