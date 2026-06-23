interface SelfEvolutionAdoptedAnchorLike {
  snapshotCapturedAt: number
  decisionTraceId: string | null
  activePatternKey: string | null
}

interface SelfEvolutionHistoryTransitionLike {
  currentCapturedAt: number
  previousCapturedAt: number
  currentDecisionTraceId: string | null
  previousDecisionTraceId?: string | null
  changedFocusCard?: boolean | string | null
  changedEvidenceTargets?: boolean | string | null
  changedTraceTargets?: boolean | string | null
  changedTraceEvent?: boolean | string | null
  lines?: string[]
}

export function buildSelfEvolutionAdoptedAnchorHistoryTransition(input: {
  adoptedAnchor: SelfEvolutionAdoptedAnchorLike | null
  historyDrilldown: SelfEvolutionHistoryTransitionLike[]
}) {
  if (!input.adoptedAnchor)
    return null

  const matchedTransition = input.historyDrilldown.find(transition =>
    transition.currentCapturedAt === input.adoptedAnchor?.snapshotCapturedAt
    && transition.currentDecisionTraceId === input.adoptedAnchor?.decisionTraceId,
  )

  if (!matchedTransition)
    return null

  const supportingLines = [
    `这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 ${matchedTransition.currentDecisionTraceId ?? 'n/a'}。`,
    '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
  ]

  if (input.adoptedAnchor.activePatternKey === 'pattern-same-her-governance') {
    supportingLines.push('这次历史转移对应的是同一个她连续性治理，而不是把记忆先行的熟悉感当成待修漂移。')
  }

  return {
    transitionKey: `${matchedTransition.currentCapturedAt}:${matchedTransition.previousCapturedAt}`,
    currentCapturedAt: matchedTransition.currentCapturedAt,
    previousCapturedAt: matchedTransition.previousCapturedAt,
    selectedSide: 'current' as const,
    summaryLine: `当前默认连续性锚点对应 ${matchedTransition.previousCapturedAt} -> ${matchedTransition.currentCapturedAt} 这次历史转移。`,
    supportingLines,
  }
}
