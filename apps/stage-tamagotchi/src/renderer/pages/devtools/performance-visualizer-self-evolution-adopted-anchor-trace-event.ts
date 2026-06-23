import { formatRendererRejoinSurfaceLabel } from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionComparisonSideLike {
  capturedAt?: number
  decisionTraceId?: string | null
  recommendedTraceEventId: string | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  bodyContinuityGovernanceNote?: string | null
}

interface SelfEvolutionAdoptedAnchorLike {
  snapshotCapturedAt: number
  decisionTraceId: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  bodyContinuityGovernanceNote?: string | null
}

interface SelfEvolutionFocusHistoryComparisonLike {
  previous: SelfEvolutionComparisonSideLike
  current: SelfEvolutionComparisonSideLike
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
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
  if (note.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body' as const
  if (note.includes('跨模态重锁态'))
    return 'full-cross-modal-lock' as const
  if (note.includes('身体独撑态') || note.includes('独自托住同一段 living segment'))
    return 'body-only-hold' as const
  if (
    note.includes('身体连续性已经明确进入身体承接态 -> 显形补回态')
    || note.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }
  if (note.includes('身体独撑态'))
    return 'body-only-hold' as const
  return null
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
      bodyContinuityGovernanceNote: selectedSide.bodyContinuityGovernanceNote ?? adoptedAnchor.bodyContinuityGovernanceNote ?? null,
    }
  }

  return {
    bodyContinuityPhase: input.comparison.bodyContinuityPhase ?? null,
    rendererRejoinSurfaceKey: selectedSide.rendererRejoinSurfaceKey ?? null,
    bodyContinuityGovernanceNote: selectedSide.bodyContinuityGovernanceNote ?? null,
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
  const bodyContinuityPhase = inferBodyContinuityPhase({
    bodyContinuityPhase: bodyContinuitySource.bodyContinuityPhase,
    bodyContinuityGovernanceNote: bodyContinuitySource.bodyContinuityGovernanceNote,
  })

  return {
    eventId,
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
