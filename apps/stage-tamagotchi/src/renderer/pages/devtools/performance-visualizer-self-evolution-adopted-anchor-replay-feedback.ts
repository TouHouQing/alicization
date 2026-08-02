interface SelfEvolutionAdoptedAnchorReplayPlanLike {
  patternKey: string
  transitionKey: string
  selectedSide: 'current' | 'previous'
  eventId: string
  summaryLine?: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: SelfEvolutionSurvivingVisibleLane
  supportingLines: string[]
}

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

export function buildSelfEvolutionAdoptedAnchorReplayFeedback(
  replayPlan: SelfEvolutionAdoptedAnchorReplayPlanLike | null,
) {
  if (!replayPlan)
    return null

  const bodyContinuityPhase = replayPlan.bodyContinuityPhase ?? null
  const survivingVisibleLane = replayPlan.survivingVisibleLane ?? null
  const rendererRejoinSurface = replayPlan.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
    ? 'Live2D'
    : replayPlan.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
      ? 'VRM'
      : replayPlan.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech'
        ? 'speech'
        : null
  const isBodyRejoin = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
  const isCrossModalLock = bodyContinuityPhase === 'full-cross-modal-lock'
  const isRendererRejoinWithoutBody = bodyContinuityPhase === 'renderer-rejoin-without-body'

  return {
    tone: 'progress' as const,
    summaryLine: survivingVisibleLane === 'face+lipsync+voice-only'
      ? '默认连续性锚点表情、口型、声音连续性存活线回放已完成。'
      : survivingVisibleLane === 'motion+lipsync+voice-only'
        ? '默认连续性锚点动作、口型、声音连续性存活线回放已完成。'
        : survivingVisibleLane === 'face+lipsync-only'
          ? '默认连续性锚点表情、口型连续性存活线回放已完成。'
          : survivingVisibleLane === 'motion+lipsync-only'
            ? '默认连续性锚点动作、口型连续性存活线回放已完成。'
            : isRendererRejoinWithoutBody
              ? '默认连续性锚点显形回接失身态回放已完成。'
              : isCrossModalLock
                ? '默认连续性锚点跨模态重锁回放已完成。'
                : isBodyRejoin
                  ? '默认连续性锚点显形补回回放已完成。'
                  : '默认连续性锚点回放已完成。',
    detailLine: survivingVisibleLane === 'face+lipsync+voice-only'
      ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次仍只有表情、口型、声音这条连续性线与同一段 living segment 对齐、而 body、motion 还没有重新接回这条表情口型声音线的 quieter carry 审计路径。`
      : survivingVisibleLane === 'motion+lipsync+voice-only'
        ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次仍只有动作、口型、声音这条连续性线与同一段 living segment 对齐、而 body、face 还没有重新接回这条动作口型声音线的 quieter carry 审计路径。`
        : survivingVisibleLane === 'face+lipsync-only'
          ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次仍只有表情、口型这条连续性线与同一段 living segment 对齐、而 body、motion、voice 还没有重新接回这条表情口型线的 quieter carry 审计路径。`
          : survivingVisibleLane === 'motion+lipsync-only'
            ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次仍只有动作、口型这条连续性线与同一段 living segment 对齐、而 body、face、voice 还没有重新接回这条动作口型线的 quieter carry 审计路径。`
            : isRendererRejoinWithoutBody
              ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次显形已经回接、但身体线没有继续托住同一段 living segment 的可见恢复审计路径。`
              : isCrossModalLock
                ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次身体线与显形权威共同锁在同一段 living segment 上的跨模态重锁路径。`
                : isBodyRejoin
                  ? rendererRejoinSurface
                    ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次 ${rendererRejoinSurface} 显形权威沿同一条连续身体线补回的连续性显形回归路径。`
                    : `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次显形权威沿同一条连续身体线补回的连续性显形回归路径。`
                  : `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复。`,
    supportingLines: replayPlan.supportingLines,
  }
}
