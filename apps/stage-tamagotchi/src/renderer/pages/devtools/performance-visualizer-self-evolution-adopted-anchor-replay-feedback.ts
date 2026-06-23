interface SelfEvolutionAdoptedAnchorReplayPlanLike {
  patternKey: string
  transitionKey: string
  selectedSide: 'current' | 'previous'
  eventId: string
  summaryLine?: string | null
  supportingLines: string[]
}

export function buildSelfEvolutionAdoptedAnchorReplayFeedback(
  replayPlan: SelfEvolutionAdoptedAnchorReplayPlanLike | null,
) {
  if (!replayPlan)
    return null

  return {
    tone: 'progress' as const,
    summaryLine: '默认连续性锚点回放已完成。',
    detailLine: `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复。`,
    supportingLines: replayPlan.supportingLines,
  }
}
