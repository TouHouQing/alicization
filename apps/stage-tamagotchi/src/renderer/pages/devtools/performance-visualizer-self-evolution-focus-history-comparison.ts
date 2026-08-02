import {
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionFocusCardLabel,
  formatSelfEvolutionTraceEventLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

type SelfEvolutionSurvivingVisibleLane = 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null

interface SelfEvolutionFocusSnapshotRecord {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path'
  explanation: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: SelfEvolutionSurvivingVisibleLane
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  capturedAt: number
}

interface SelfEvolutionFocusHistoryTransition {
  currentCapturedAt: number
  previousCapturedAt: number
  currentDecisionTraceId: string | null
  previousDecisionTraceId: string | null
  changedFocusCard: boolean
  changedEvidenceTargets: boolean
  changedTraceTargets: boolean
  changedTraceEvent: boolean
  lines: string[]
}

function diffGained(current: string[], previous: string[]) {
  return current.filter(value => !previous.includes(value))
}

function diffLost(current: string[], previous: string[]) {
  return previous.filter(value => !current.includes(value))
}

function formatStable(label: string, value: string | null) {
  return `${label}：稳定（${value ?? 'n/a'}）`
}

function formatChanged(label: string, previous: string | null, current: string | null) {
  return `${label}：${previous ?? 'n/a'} -> ${current ?? 'n/a'}`
}

function formatRendererRejoinSurfaceLabel(
  surfaceKey: SelfEvolutionFocusSnapshotRecord['rendererRejoinSurfaceKey'],
) {
  if (surfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'

  if (surfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'

  if (surfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'

  return null
}

function resolveBodyContinuityPhase(params: {
  previousBodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  currentBodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  previousEvidenceIds: string[]
  currentEvidenceIds: string[]
  previousTraceSectionIds: string[]
  currentTraceSectionIds: string[]
  previousRecommendedTraceEventId: string | null
  currentRecommendedTraceEventId: string | null
}) {
  if (
    params.currentBodyContinuityPhase === 'body-only-hold'
    || params.currentBodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || params.currentBodyContinuityPhase === 'full-cross-modal-lock'
    || params.currentBodyContinuityPhase === 'renderer-rejoin-without-body'
  ) {
    return params.currentBodyContinuityPhase
  }

  if (
    params.previousBodyContinuityPhase === 'body-only-hold'
    || params.previousBodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || params.previousBodyContinuityPhase === 'full-cross-modal-lock'
    || params.previousBodyContinuityPhase === 'renderer-rejoin-without-body'
  ) {
    return params.previousBodyContinuityPhase
  }

  const previousEvidence = new Set(params.previousEvidenceIds)
  const currentEvidence = new Set(params.currentEvidenceIds)
  const previousTraceSections = new Set(params.previousTraceSectionIds)
  const currentTraceSections = new Set(params.currentTraceSectionIds)

  const previousRuntimeContinuity = previousEvidence.has('runtime-continuity-projection')
  const currentRuntimeContinuity = currentEvidence.has('runtime-continuity-projection')
  const previousRendererAuthority = previousEvidence.has('renderer-authority-projection')
  const currentRendererAuthority = currentEvidence.has('renderer-authority-projection')
  const previousSelectedTraceEvent = previousTraceSections.has('selected-trace-event')
  const currentSelectedTraceEvent = currentTraceSections.has('selected-trace-event')
  const traceEventPair = new Set([
    params.previousRecommendedTraceEventId,
    params.currentRecommendedTraceEventId,
  ])

  if (
    currentRuntimeContinuity
    && currentRendererAuthority
    && currentSelectedTraceEvent
    && (
      !previousRuntimeContinuity
      || !previousSelectedTraceEvent
      || !previousRendererAuthority
    )
    && traceEventPair.has('event-person-state')
    && traceEventPair.has('event-takeover')
  ) {
    return 'body-carried-to-renderer-rejoin'
  }

  return null
}

export function buildSelfEvolutionFocusHistoryComparison(input: {
  history: SelfEvolutionFocusSnapshotRecord[]
  transition: SelfEvolutionFocusHistoryTransition
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
}) {
  const previous = input.history.find(item => item.capturedAt === input.transition.previousCapturedAt)
  const current = input.history.find(item => item.capturedAt === input.transition.currentCapturedAt)

  if (!previous || !current)
    return null

  const evidenceGained = diffGained(current.highlightedEvidencePanelIds, previous.highlightedEvidencePanelIds)
  const evidenceLost = diffLost(current.highlightedEvidencePanelIds, previous.highlightedEvidencePanelIds)
  const traceTargetsGained = diffGained(current.highlightedTraceSectionIds, previous.highlightedTraceSectionIds)
  const traceTargetsLost = diffLost(current.highlightedTraceSectionIds, previous.highlightedTraceSectionIds)
  const bodyContinuityPhase = input.bodyContinuityPhase
    ?? resolveBodyContinuityPhase({
      previousBodyContinuityPhase: previous.bodyContinuityPhase ?? null,
      currentBodyContinuityPhase: current.bodyContinuityPhase ?? null,
      previousEvidenceIds: previous.highlightedEvidencePanelIds,
      currentEvidenceIds: current.highlightedEvidencePanelIds,
      previousTraceSectionIds: previous.highlightedTraceSectionIds,
      currentTraceSectionIds: current.highlightedTraceSectionIds,
      previousRecommendedTraceEventId: previous.recommendedTraceEventId,
      currentRecommendedTraceEventId: current.recommendedTraceEventId,
    })
  const survivingVisibleLane = current.survivingVisibleLane
    ?? previous.survivingVisibleLane
    ?? null
  const rendererRejoinSurfaceLabel = formatRendererRejoinSurfaceLabel(
    current.rendererRejoinSurfaceKey ?? previous.rendererRejoinSurfaceKey ?? null,
  )

  const summaryLines = [
    bodyContinuityPhase === 'body-only-hold'
      ? '身体连续性：身体线仍在独自托住同一段 living segment，当前还没有进入显形补回。'
      : bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
        ? rendererRejoinSurfaceLabel
          ? `身体连续性：运行时连续性投影刚被补入，说明这段 same living segment 正从身体承接态向 ${rendererRejoinSurfaceLabel} 显形补回态靠拢。`
          : '身体连续性：运行时连续性投影刚被补入，说明这段 same living segment 正从身体承接态向显形权威补回态靠拢。'
        : bodyContinuityPhase === 'full-cross-modal-lock'
          ? rendererRejoinSurfaceLabel
            ? `身体连续性：身体线与 ${rendererRejoinSurfaceLabel} 已经共同锁回同一段 living segment，而不是短暂同步。`
            : '身体连续性：身体线与显形权威已经共同锁回同一段 living segment，而不是短暂同步。'
          : bodyContinuityPhase === 'renderer-rejoin-without-body'
            ? rendererRejoinSurfaceLabel
              ? `身体连续性：${rendererRejoinSurfaceLabel} 虽然已经回接，但身体线没有继续托住同一段 living segment，这更像显形回接失身而不是修复完成。`
              : '身体连续性：显形权威虽然已经回接，但身体线没有继续托住同一段 living segment，这更像显形回接失身而不是修复完成。'
            : null,
    input.transition.changedFocusCard
      ? formatChanged('聚焦卡片', formatSelfEvolutionFocusCardLabel(previous.selectedCardId), formatSelfEvolutionFocusCardLabel(current.selectedCardId))
      : formatStable('聚焦卡片', formatSelfEvolutionFocusCardLabel(current.selectedCardId)),
    previous.candidateId === current.candidateId
      ? formatStable('候选项', current.candidateId)
      : formatChanged('候选项', previous.candidateId, current.candidateId),
    previous.decisionTraceId === current.decisionTraceId
      ? formatStable('决策轨迹', current.decisionTraceId)
      : formatChanged('决策轨迹', previous.decisionTraceId, current.decisionTraceId),
    input.transition.changedTraceEvent
      ? formatChanged('轨迹事件', formatSelfEvolutionTraceEventLabel(previous.recommendedTraceEventId), formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId))
      : formatStable('轨迹事件', formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId)),
    evidenceGained.length > 0 ? `新增证据面板：${evidenceGained.map(formatSelfEvolutionEvidencePanelLabel).join('，')}` : null,
    evidenceLost.length > 0 ? `移除证据面板：${evidenceLost.map(formatSelfEvolutionEvidencePanelLabel).join('，')}` : null,
    traceTargetsGained.length > 0 ? `新增轨迹段：${traceTargetsGained.map(formatSelfEvolutionTraceSectionLabel).join('，')}` : null,
    traceTargetsLost.length > 0 ? `移除轨迹段：${traceTargetsLost.map(formatSelfEvolutionTraceSectionLabel).join('，')}` : null,
  ].filter((line): line is string => Boolean(line))

  return {
    previous: {
      capturedAt: previous.capturedAt,
      candidateId: previous.candidateId,
      decisionTraceId: previous.decisionTraceId,
      activeThreadId: previous.activeThreadId,
      selectedCardId: previous.selectedCardId,
      recommendedTraceEventId: previous.recommendedTraceEventId,
      ...(previous.rendererRejoinSurfaceKey
        ? { rendererRejoinSurfaceKey: previous.rendererRejoinSurfaceKey }
        : {}),
      ...(previous.survivingVisibleLane
        ? { survivingVisibleLane: previous.survivingVisibleLane }
        : {}),
      evidenceTargets: previous.highlightedEvidencePanelIds,
      traceTargets: previous.highlightedTraceSectionIds,
    },
    current: {
      capturedAt: current.capturedAt,
      candidateId: current.candidateId,
      decisionTraceId: current.decisionTraceId,
      activeThreadId: current.activeThreadId,
      selectedCardId: current.selectedCardId,
      recommendedTraceEventId: current.recommendedTraceEventId,
      ...(current.rendererRejoinSurfaceKey
        ? { rendererRejoinSurfaceKey: current.rendererRejoinSurfaceKey }
        : {}),
      ...(current.survivingVisibleLane
        ? { survivingVisibleLane: current.survivingVisibleLane }
        : {}),
      evidenceTargets: current.highlightedEvidencePanelIds,
      traceTargets: current.highlightedTraceSectionIds,
    },
    focusCardChanged: input.transition.changedFocusCard,
    traceEventChanged: input.transition.changedTraceEvent,
    evidenceGained,
    evidenceLost,
    traceTargetsGained,
    traceTargetsLost,
    bodyContinuityPhase,
    ...(survivingVisibleLane ? { survivingVisibleLane } : {}),
    summaryLines,
  }
}
