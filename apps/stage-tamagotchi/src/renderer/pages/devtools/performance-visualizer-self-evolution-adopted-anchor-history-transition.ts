import { formatRendererRejoinSurfaceLabel } from './performance-visualizer-self-evolution-focus-history-display'

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

interface SelfEvolutionAdoptedAnchorLike {
  snapshotCapturedAt: number
  decisionTraceId: string | null
  activePatternKey: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  bodyContinuityGovernanceNote?: string | null
}

interface SelfEvolutionHistoryTransitionLike {
  currentCapturedAt: number
  previousCapturedAt: number
  currentDecisionTraceId: string | null
  previousDecisionTraceId?: string | null
  changedFocusCard?: boolean
  changedEvidenceTargets?: boolean
  changedTraceTargets?: boolean
  changedTraceEvent?: boolean
  lines?: string[]
}

function resolveSurvivingVisibleLane(
  value: string | null | undefined,
): SelfEvolutionSurvivingVisibleLane {
  if (!value)
    return null

  if (value.includes('当前仅剩表情、口型、声音维持同一段连续性'))
    return 'face+lipsync+voice-only'
  if (value.includes('当前仅剩动作、口型、声音维持同一段连续性'))
    return 'motion+lipsync+voice-only'
  if (value.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线'))
    return 'face+lipsync-only'
  if (value.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线'))
    return 'motion+lipsync-only'

  return null
}

function inferBodyContinuityPhase(input: {
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  bodyContinuityGovernanceNote?: string | null
}) {
  if (input.bodyContinuityPhase)
    return input.bodyContinuityPhase
  const note = input.bodyContinuityGovernanceNote
  if (!note)
    return null
  if (resolveSurvivingVisibleLane(note))
    return 'renderer-rejoin-without-body' as const
  if (note.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body' as const
  if (note.includes('跨模态重锁态'))
    return 'full-cross-modal-lock' as const
  if (
    note.includes('身体连续性已经明确进入身体承接态 -> 显形补回态')
    || note.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }
  return null
}

function formatRendererRejoinWithoutBodyHistoryLine(input: {
  survivingVisibleLane: SelfEvolutionSurvivingVisibleLane
  rendererRejoinSurface: string | null
}) {
  if (input.survivingVisibleLane === 'face+lipsync+voice-only') {
    return '这次历史转移对应的是身体连续性治理，应优先确认当前是否仍只有表情、口型、声音这条 identity-continuity 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误写成 body、motion 已经补回的修复完成。'
  }

  if (input.survivingVisibleLane === 'motion+lipsync+voice-only') {
    return '这次历史转移对应的是身体连续性治理，应优先确认当前是否仍只有动作、口型、声音这条 identity-continuity 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误写成 body、face 已经补回的修复完成。'
  }

  if (input.survivingVisibleLane === 'face+lipsync-only') {
    return '这次历史转移对应的是身体连续性治理，应优先确认当前是否仍只有表情、口型这条 identity-continuity 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误写成 body、motion、voice 已经补回的修复完成。'
  }

  if (input.survivingVisibleLane === 'motion+lipsync-only') {
    return '这次历史转移对应的是身体连续性治理，应优先确认当前是否仍只有动作、口型这条 identity-continuity 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误写成 body、face、voice 已经补回的修复完成。'
  }

  return input.rendererRejoinSurface
    ? `这次历史转移对应的是身体连续性治理，应优先确认为什么 ${input.rendererRejoinSurface} 已经回接、但身体线没有继续托住同一段 living segment，而不是把这段失身回接误写成可信长期基线。`
    : '这次历史转移对应的是身体连续性治理，应优先确认为什么显形权威已经回接、但身体线没有继续托住同一段 living segment，而不是把这段失身回接误写成可信长期基线。'
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
    '如果需要验证 identity-continuity 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
  ]
  const bodyContinuityPhase = inferBodyContinuityPhase({
    bodyContinuityPhase: input.adoptedAnchor.bodyContinuityPhase,
    bodyContinuityGovernanceNote: input.adoptedAnchor.bodyContinuityGovernanceNote,
  })
  const survivingVisibleLane = resolveSurvivingVisibleLane(
    input.adoptedAnchor.bodyContinuityGovernanceNote,
  )

  if (input.adoptedAnchor.activePatternKey === 'pattern-identity-continuity-governance') {
    supportingLines.push('这次历史转移对应的是身份连续性连续性治理，而不是把记忆先行的熟悉感当成待修漂移。')
  }

  if (input.adoptedAnchor.activePatternKey === 'pattern-body-continuity-governance') {
    const rendererRejoinSurface = (
      bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
      || bodyContinuityPhase === 'full-cross-modal-lock'
      || bodyContinuityPhase === 'renderer-rejoin-without-body'
    )
      ? input.adoptedAnchor.rendererRejoinSurfaceKey
        ? formatRendererRejoinSurfaceLabel(input.adoptedAnchor.rendererRejoinSurfaceKey)
        : null
      : null
    supportingLines.push(
      bodyContinuityPhase === 'body-only-hold'
        ? '这次历史转移对应的是身体连续性治理，应优先确认身体线是否仍在独自托住同一段 living segment，而不是把这段低显形延续误写成已经失败或已经完成。'
        : bodyContinuityPhase === 'full-cross-modal-lock' && rendererRejoinSurface
          ? `这次历史转移对应的是身体连续性治理，应优先确认身体线与 ${rendererRejoinSurface} 是否仍共同锁在同一段 living segment 上，而不是把这段稳定回归误写成短暂同步。`
          : bodyContinuityPhase === 'full-cross-modal-lock'
            ? '这次历史转移对应的是身体连续性治理，应优先确认身体线与显形权威是否仍共同锁在同一段 living segment 上，而不是把这段稳定回归误写成短暂同步。'
            : bodyContinuityPhase === 'renderer-rejoin-without-body'
              ? formatRendererRejoinWithoutBodyHistoryLine({
                  survivingVisibleLane,
                  rendererRejoinSurface,
                })
              : rendererRejoinSurface
                ? `这次历史转移对应的是身体连续性治理，应优先确认身体线是否仍托住同一段 living segment，并确认 ${rendererRejoinSurface} 是否沿同一条连续身体线补回显形权威，而不是把这段回收误写成 generic partial drift。`
                : '这次历史转移对应的是身体连续性治理，应优先确认身体线是否仍托住同一段 living segment，并确认显形权威是否沿同一条连续身体线补回，而不是把这段回收误写成 generic partial drift。',
    )
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
