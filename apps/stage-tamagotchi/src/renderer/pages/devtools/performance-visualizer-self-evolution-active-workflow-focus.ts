interface SelfEvolutionFocusHistoryPatternContext {
  currentCapturedAt: number
  previousCapturedAt: number
  side: 'current' | 'previous'
  summaryLine: string
}

interface SelfEvolutionFocusHistoryPatternGuidance {
  governanceLayer: string
  governanceLayerDisplay: string
  repairOwnerHint: string
  prosodyAuthorityHint: string | null
  bodyContinuityHint?: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  rendererTarget?: 'live2d' | 'vrm' | 'speech' | null
  recommendedEvidencePanels: string[]
  recommendedTraceSections: string[]
  recommendedEventKinds: string[]
  summaryLine: string
}

function resolveBodyContinuityPhase(
  bodyContinuityHint: string | null,
  summaryLine: string,
) {
  if (
    bodyContinuityHint?.includes('当前只有 face 和 lipsync 这条 same-her 生命线')
    || bodyContinuityHint?.includes('当前只有 motion 和 lipsync 这条 same-her 生命线')
    || bodyContinuityHint?.includes('当前仅剩表情、口型、声音维持同一段连续性')
    || bodyContinuityHint?.includes('当前仅剩动作、口型、声音维持同一段连续性')
    || summaryLine.includes('当前只有 face 和 lipsync 这条 same-her 生命线')
    || summaryLine.includes('当前只有 motion 和 lipsync 这条 same-her 生命线')
    || summaryLine.includes('当前仅剩表情、口型、声音维持同一段连续性')
    || summaryLine.includes('当前仅剩动作、口型、声音维持同一段连续性')
  ) {
    return 'renderer-rejoin-without-body' as const
  }

  if (bodyContinuityHint?.includes('显形回接失身态') || summaryLine.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body' as const

  if (
    bodyContinuityHint?.includes('稳定锁在同一段 living segment')
    || bodyContinuityHint?.includes('稳定锁回同一段 living segment')
    || bodyContinuityHint?.includes('跨模态重锁态')
    || summaryLine.includes('稳定锁在同一段 living segment')
    || summaryLine.includes('稳定锁回同一段 living segment')
    || summaryLine.includes('跨模态重锁态')
  ) {
    return 'full-cross-modal-lock' as const
  }

  if (
    bodyContinuityHint?.includes('沿同一条连续身体线补回')
    || bodyContinuityHint?.includes('身体承接态 ->')
    || summaryLine.includes('沿着同一条连续身体线补回')
    || summaryLine.includes('沿同一条连续身体线补回')
    || summaryLine.includes('身体承接态 ->')
    || summaryLine.includes('身体连续性承接 ->')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }

  if (
    bodyContinuityHint?.includes('独自托住同一段 living segment')
    || bodyContinuityHint?.includes('身体独撑态')
    || summaryLine.includes('独自托住同一段 living segment')
    || summaryLine.includes('身体独撑态')
  ) {
    return 'body-only-hold' as const
  }

  return null
}

function resolveRendererTargetFromSurfaceKey(
  rendererRejoinSurfaceKey: SelfEvolutionFocusHistoryPatternGuidance['rendererRejoinSurfaceKey'],
) {
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d')
    return 'live2d' as const
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm')
    return 'vrm' as const
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech' as const
  return null
}

export function buildSelfEvolutionActiveWorkflowFocus(input: {
  activePatternKey: string | null
  rendererTarget?: 'live2d' | 'vrm' | 'speech' | null
  patternContextByKey: Record<string, SelfEvolutionFocusHistoryPatternContext>
  patternGuidanceByKey: Record<string, SelfEvolutionFocusHistoryPatternGuidance>
}) {
  if (!input.activePatternKey)
    return null

  const context = input.patternContextByKey[input.activePatternKey]
  const guidance = input.patternGuidanceByKey[input.activePatternKey]

  if (!context || !guidance)
    return null

  const isBodyContinuity = guidance.governanceLayer === 'body-continuity'
  const bodyContinuityHint = (
    guidance.bodyContinuityHint
    ?? (isBodyContinuity ? guidance.prosodyAuthorityHint : null)
    ?? null
  )
  const survivingVisibleLane = guidance.survivingVisibleLane ?? (
    bodyContinuityHint?.includes('当前仅剩表情、口型、声音维持同一段连续性')
      ? 'face+lipsync+voice-only'
      : bodyContinuityHint?.includes('当前仅剩动作、口型、声音维持同一段连续性')
        ? 'motion+lipsync+voice-only'
        : bodyContinuityHint?.includes('当前只有 face 和 lipsync 这条 same-her 生命线')
          ? 'face+lipsync-only'
          : bodyContinuityHint?.includes('当前只有 motion 和 lipsync 这条 same-her 生命线')
            ? 'motion+lipsync-only'
            : guidance.summaryLine.includes('当前仅剩表情、口型、声音维持同一段连续性')
              ? 'face+lipsync+voice-only'
              : guidance.summaryLine.includes('当前仅剩动作、口型、声音维持同一段连续性')
                ? 'motion+lipsync+voice-only'
                : guidance.summaryLine.includes('当前只有 face 和 lipsync 这条 same-her 生命线')
                  ? 'face+lipsync-only'
                  : guidance.summaryLine.includes('当前只有 motion 和 lipsync 这条 same-her 生命线')
                    ? 'motion+lipsync-only'
                    : null
  )
  const bodyContinuityPhase = guidance.bodyContinuityPhase
    ?? (survivingVisibleLane ? 'renderer-rejoin-without-body' : null)
    ?? resolveBodyContinuityPhase(bodyContinuityHint, guidance.summaryLine)
  const rendererTarget = input.rendererTarget
    ?? guidance.rendererTarget
    ?? resolveRendererTargetFromSurfaceKey(guidance.rendererRejoinSurfaceKey ?? null)
    ?? null

  return {
    title: `当前工作流焦点：${guidance.governanceLayerDisplay}`,
    summaryLine: `正在修复该反复漂移模式的${context.side === 'current' ? '当前侧' : '前一侧'}。`,
    repairOwnerHint: guidance.repairOwnerHint,
    prosodyAuthorityHint: isBodyContinuity ? null : guidance.prosodyAuthorityHint,
    bodyContinuityHint,
    bodyContinuityPhase,
    rendererRejoinSurfaceKey: guidance.rendererRejoinSurfaceKey ?? null,
    ...(survivingVisibleLane
      ? { survivingVisibleLane }
      : {}),
    rendererTarget: survivingVisibleLane ? null : rendererTarget,
    evidencePanels: new Set(guidance.recommendedEvidencePanels),
    traceSections: new Set(guidance.recommendedTraceSections),
    eventKinds: new Set(guidance.recommendedEventKinds),
  }
}
