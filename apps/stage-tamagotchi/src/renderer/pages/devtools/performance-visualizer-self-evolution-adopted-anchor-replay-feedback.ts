interface SelfEvolutionAdoptedAnchorReplayPlanLike {
  patternKey: string
  transitionKey: string
  selectedSide: 'current' | 'previous'
  eventId: string
  summaryLine?: string | null
  supportingLines: string[]
}

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function resolveRendererRejoinSurface(lines: string[]) {
  for (const line of lines) {
    const directRejoinMatch = line.match(/身体承接态 -> (Live2D|VRM|speech) 显形补回态/u)
    if (directRejoinMatch)
      return directRejoinMatch[1]

    const rejoinAuthorityMatch = line.match(/(Live2D|VRM|speech) 显形权威仍在沿同一条连续身体线补回/u)
    if (rejoinAuthorityMatch)
      return rejoinAuthorityMatch[1]

    const crossModalLockMatch = line.match(
      /身体线与 (Live2D|VRM|speech) 共同锁回同一段 living segment|(?:Live2D|VRM|speech) 显形权威仍与身体线共同锁在同一段 living segment/u,
    )
    if (crossModalLockMatch)
      return crossModalLockMatch[1]

    const rendererRejoinWithoutBodyMatch = line.match(
      /(?:显形回接失身态已经被完整记录：)?(?:(Live2D|VRM|speech) 显形权威已经回接|(Live2D|VRM|speech) 已经回接)、但身体线没有继续托住同一段 living segment/u,
    )
    if (rendererRejoinWithoutBodyMatch)
      return rendererRejoinWithoutBodyMatch[1] ?? rendererRejoinWithoutBodyMatch[2]
  }
  return null
}

function resolveSurvivingVisibleLane(lines: string[]): SelfEvolutionSurvivingVisibleLane {
  const joined = lines.join('\n')

  if (
    joined.includes('当前仅剩表情、口型、声音维持同一段连续性')
    || joined.includes('表情、口型、声音 same-her 存活线治理特征')
  ) {
    return 'face+lipsync+voice-only'
  }

  if (
    joined.includes('当前仅剩动作、口型、声音维持同一段连续性')
    || joined.includes('动作、口型、声音 same-her 存活线治理特征')
  ) {
    return 'motion+lipsync+voice-only'
  }

  if (
    joined.includes('当前只有 face 和 lipsync 这条 same-her 生命线')
    || joined.includes('表情、口型 same-her 存活线治理特征')
  ) {
    return 'face+lipsync-only'
  }

  if (
    joined.includes('当前只有 motion 和 lipsync 这条 same-her 生命线')
    || joined.includes('动作、口型 same-her 存活线治理特征')
  ) {
    return 'motion+lipsync-only'
  }

  return null
}

export function buildSelfEvolutionAdoptedAnchorReplayFeedback(
  replayPlan: SelfEvolutionAdoptedAnchorReplayPlanLike | null,
) {
  if (!replayPlan)
    return null

  const bodyContinuityRendererRejoinLine = replayPlan.supportingLines.find(line =>
    line.startsWith('显形补回：'),
  )
  const crossModalLockLine = replayPlan.supportingLines.find(line =>
    line.includes('跨模态重锁态'),
  )
  const rendererRejoinWithoutBodyLine = replayPlan.supportingLines.find(line =>
    line.includes('显形回接失身态'),
  )
  const survivingVisibleLane = resolveSurvivingVisibleLane(
    replayPlan.supportingLines.filter(line =>
      line.startsWith('工作流：')
      || line.startsWith('连续性前提：'),
    ),
  )
  const rendererRejoinSurface = resolveRendererRejoinSurface(
    replayPlan.supportingLines.filter(line =>
      line.startsWith('显形补回：')
      || line.startsWith('连续性前提：'),
    ),
  )

  return {
    tone: 'progress' as const,
    summaryLine: survivingVisibleLane === 'face+lipsync+voice-only'
      ? '默认连续性锚点表情、口型、声音 same-her 存活线回放已完成。'
      : survivingVisibleLane === 'motion+lipsync+voice-only'
        ? '默认连续性锚点动作、口型、声音 same-her 存活线回放已完成。'
        : survivingVisibleLane === 'face+lipsync-only'
          ? '默认连续性锚点表情、口型 same-her 存活线回放已完成。'
          : survivingVisibleLane === 'motion+lipsync-only'
            ? '默认连续性锚点动作、口型 same-her 存活线回放已完成。'
            : rendererRejoinWithoutBodyLine
              ? '默认连续性锚点显形回接失身态回放已完成。'
              : crossModalLockLine
                ? '默认连续性锚点跨模态重锁回放已完成。'
                : bodyContinuityRendererRejoinLine
                  ? '默认连续性锚点显形补回回放已完成。'
                  : '默认连续性锚点回放已完成。',
    detailLine: survivingVisibleLane === 'face+lipsync+voice-only'
      ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐、而 body、motion 还没有重新接回这条表情口型声音线的 quieter carry 审计路径。`
      : survivingVisibleLane === 'motion+lipsync+voice-only'
        ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次仍只有动作、口型、声音这条 same-her 生命线与同一段 living segment 对齐、而 body、face 还没有重新接回这条动作口型声音线的 quieter carry 审计路径。`
        : survivingVisibleLane === 'face+lipsync-only'
          ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次仍只有表情、口型这条 same-her 生命线与同一段 living segment 对齐、而 body、motion、voice 还没有重新接回这条表情口型线的 quieter carry 审计路径。`
          : survivingVisibleLane === 'motion+lipsync-only'
            ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次仍只有动作、口型这条 same-her 生命线与同一段 living segment 对齐、而 body、face、voice 还没有重新接回这条动作口型线的 quieter carry 审计路径。`
            : rendererRejoinWithoutBodyLine
              ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次显形已经回接、但身体线没有继续托住同一段 living segment 的可见恢复审计路径。`
              : crossModalLockLine
                ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次身体线与显形权威共同锁在同一段 living segment 上的跨模态重锁路径。`
                : bodyContinuityRendererRejoinLine
                  ? rendererRejoinSurface
                    ? `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次 ${rendererRejoinSurface} 显形权威沿同一条连续身体线补回的 same-her 显形回归路径。`
                    : `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复，并重新对齐到这次显形权威沿同一条连续身体线补回的 same-her 显形回归路径。`
                  : `工作流 ${replayPlan.patternKey}、历史转移 ${replayPlan.transitionKey}、对比侧 ${replayPlan.selectedSide} 和事件 ${replayPlan.eventId} 已同步恢复。`,
    supportingLines: replayPlan.supportingLines,
  }
}
