import { formatRendererRejoinSurfaceLabel } from './performance-visualizer-self-evolution-focus-history-display'

type SelfEvolutionSurvivingVisibleLane = 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null

interface SelfEvolutionComparisonSideLike {
  capturedAt?: number
  decisionTraceId?: string | null
  recommendedTraceEventId: string | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: SelfEvolutionSurvivingVisibleLane
}

interface SelfEvolutionAdoptedAnchorLike {
  snapshotCapturedAt: number
  decisionTraceId: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: SelfEvolutionSurvivingVisibleLane
}

interface SelfEvolutionFocusHistoryComparisonLike {
  previous: SelfEvolutionComparisonSideLike
  current: SelfEvolutionComparisonSideLike
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  survivingVisibleLane?: SelfEvolutionSurvivingVisibleLane
}

function resolveSelectedSideBodyContinuitySource(input: {
  comparison: SelfEvolutionFocusHistoryComparisonLike
  adoptedAnchor?: SelfEvolutionAdoptedAnchorLike | null
  selectedSide: 'current' | 'previous'
}) {
  const selectedSide = input.comparison[input.selectedSide]
  const adoptedAnchor = input.adoptedAnchor
  if (
    adoptedAnchor
    && selectedSide.capturedAt === adoptedAnchor.snapshotCapturedAt
    && (selectedSide.decisionTraceId ?? null) === adoptedAnchor.decisionTraceId
  ) {
    return {
      bodyContinuityPhase: input.comparison.bodyContinuityPhase ?? adoptedAnchor.bodyContinuityPhase ?? null,
      rendererRejoinSurfaceKey: selectedSide.rendererRejoinSurfaceKey ?? adoptedAnchor.rendererRejoinSurfaceKey ?? null,
      survivingVisibleLane: selectedSide.survivingVisibleLane ?? adoptedAnchor.survivingVisibleLane ?? null,
    }
  }

  return {
    bodyContinuityPhase: input.comparison.bodyContinuityPhase ?? null,
    rendererRejoinSurfaceKey: selectedSide.rendererRejoinSurfaceKey ?? null,
    survivingVisibleLane: selectedSide.survivingVisibleLane ?? null,
  }
}

export function buildSelfEvolutionAdoptedAnchorTraceEventSelection(input: {
  comparison: SelfEvolutionFocusHistoryComparisonLike | null
  adoptedAnchor?: SelfEvolutionAdoptedAnchorLike | null
  selectedSide: 'current' | 'previous' | null
}) {
  if (!input.comparison || !input.selectedSide)
    return null

  const eventId = input.comparison[input.selectedSide].recommendedTraceEventId
  if (!eventId)
    return null

  const bodyContinuitySource = resolveSelectedSideBodyContinuitySource({
    comparison: input.comparison,
    adoptedAnchor: input.adoptedAnchor,
    selectedSide: input.selectedSide,
  })
  const rendererRejoinSurfaceKey = bodyContinuitySource.rendererRejoinSurfaceKey
  const rendererRejoinSurface = rendererRejoinSurfaceKey
    ? formatRendererRejoinSurfaceLabel(rendererRejoinSurfaceKey)
    : null
  const bodyContinuityPhase = bodyContinuitySource.bodyContinuityPhase

  return {
    eventId,
    ...(bodyContinuitySource.survivingVisibleLane
      ? { survivingVisibleLane: bodyContinuitySource.survivingVisibleLane }
      : {}),
    summaryLine: bodyContinuityPhase === 'body-only-hold'
      ? `当前默认连续性锚点会自动回到事件 ${eventId}，继续核对身体线是否仍在独自托住同一段 living segment。`
      : bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
        ? rendererRejoinSurface
          ? `当前默认连续性锚点会自动回到事件 ${eventId}，继续核对 ${rendererRejoinSurface} 是否沿同一条连续身体线补回显形权威。`
          : `当前默认连续性锚点会自动回到事件 ${eventId}，继续核对显形权威是否沿同一条连续身体线补回。`
        : bodyContinuityPhase === 'full-cross-modal-lock'
          ? rendererRejoinSurface
            ? `当前默认连续性锚点会自动回到事件 ${eventId}，继续核对身体线与 ${rendererRejoinSurface} 是否仍稳定锁在同一段 living segment 上。`
            : `当前默认连续性锚点会自动回到事件 ${eventId}，继续核对身体线与显形权威是否仍稳定锁在同一段 living segment 上。`
          : bodyContinuityPhase === 'renderer-rejoin-without-body'
            ? rendererRejoinSurface
              ? `当前默认连续性锚点会自动回到事件 ${eventId}，继续核对为什么 ${rendererRejoinSurface} 已经回接、但身体线没有继续托住同一段 living segment。`
              : `当前默认连续性锚点会自动回到事件 ${eventId}，继续核对为什么显形权威已经回接、但身体线没有继续托住同一段 living segment。`
            : `当前默认连续性锚点会自动回到事件 ${eventId}。`,
  }
}
