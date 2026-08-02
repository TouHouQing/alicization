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
  const bodyContinuityHint = guidance.bodyContinuityHint ?? null
  const survivingVisibleLane = guidance.survivingVisibleLane ?? null
  const bodyContinuityPhase = guidance.bodyContinuityPhase
    ?? (survivingVisibleLane ? 'renderer-rejoin-without-body' : null)
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
