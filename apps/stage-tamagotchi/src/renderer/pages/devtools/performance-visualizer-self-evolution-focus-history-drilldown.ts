import {
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionFocusCardLabel,
  formatSelfEvolutionTraceEventLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

type SelfEvolutionBodyContinuityPhase
  = | 'body-only-hold'
    | 'body-carried-to-renderer-rejoin'
    | 'full-cross-modal-lock'
    | 'renderer-rejoin-without-body'
    | null

type SelfEvolutionRendererRejoinSurfaceKey
  = | 'authority:renderer-rejoin:speech'
    | 'authority:renderer-rejoin:live2d'
    | 'authority:renderer-rejoin:vrm'
    | null

interface SelfEvolutionFocusSnapshotRecord {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path'
  explanation: string | null
  bodyContinuityPhase?: SelfEvolutionBodyContinuityPhase
  rendererRejoinSurfaceKey?: SelfEvolutionRendererRejoinSurfaceKey
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  bodyContinuityGovernanceNote?: string | null
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  capturedAt: number
}

function joinArrow(values: string[]) {
  return values.join(' -> ')
}

function formatRendererRejoinSurfaceLabel(
  surfaceKey: SelfEvolutionRendererRejoinSurfaceKey,
) {
  if (surfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'

  if (surfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'

  if (surfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'

  return null
}

function normalizeSummaryFragment(value: string) {
  return value.trim().replace(/[。.!?]$/u, '')
}

function extractSurvivingVisibleLaneTruth(
  value: string | null | undefined,
) {
  if (!value)
    return null

  if (
    value.includes('当前仅剩表情、口型、声音维持同一段连续性')
    || value.includes('当前仅剩动作、口型、声音维持同一段连续性')
    || value.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线')
    || value.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线')
  ) {
    return normalizeSummaryFragment(value)
  }

  return null
}

function formatStructuredSurvivingVisibleLaneTruth(
  survivingVisibleLane: SelfEvolutionFocusSnapshotRecord['survivingVisibleLane'],
) {
  if (survivingVisibleLane === 'face+lipsync+voice-only')
    return '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线'
  if (survivingVisibleLane === 'motion+lipsync+voice-only')
    return '当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线'
  if (survivingVisibleLane === 'face+lipsync-only')
    return '当前只有 face 和 lipsync 这条 identity-continuity 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线'
  if (survivingVisibleLane === 'motion+lipsync-only')
    return '当前只有 motion 和 lipsync 这条 identity-continuity 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线'
  return null
}

function resolveBodyContinuityPhase(params: {
  currentBodyContinuityPhase: SelfEvolutionBodyContinuityPhase
  previousBodyContinuityPhase: SelfEvolutionBodyContinuityPhase
}) {
  return params.currentBodyContinuityPhase ?? params.previousBodyContinuityPhase
}

function isBodyContinuityTransition(params: {
  previousBodyContinuityPhase: SelfEvolutionBodyContinuityPhase
  currentBodyContinuityPhase: SelfEvolutionBodyContinuityPhase
  previousEvidenceIds: string[]
  currentEvidenceIds: string[]
  previousTraceSectionIds: string[]
  currentTraceSectionIds: string[]
  previousRecommendedTraceEventId: string | null
  currentRecommendedTraceEventId: string | null
}) {
  if (resolveBodyContinuityPhase(params)) {
    return true
  }

  const previousEvidence = new Set(params.previousEvidenceIds)
  const currentEvidence = new Set(params.currentEvidenceIds)
  const previousTraceSections = new Set(params.previousTraceSectionIds)
  const currentTraceSections = new Set(params.currentTraceSectionIds)
  const traceEventPair = new Set([
    params.previousRecommendedTraceEventId,
    params.currentRecommendedTraceEventId,
  ])

  return (
    previousEvidence.has('runtime-continuity-projection')
    && currentEvidence.has('runtime-continuity-projection')
    && (
      previousEvidence.has('renderer-authority-projection')
      || currentEvidence.has('renderer-authority-projection')
    )
    && (
      previousTraceSections.has('trace-timeline')
      || currentTraceSections.has('trace-timeline')
    )
    && (
      previousTraceSections.has('selected-trace-event')
      || currentTraceSections.has('selected-trace-event')
    )
    && traceEventPair.has('event-person-state')
    && traceEventPair.has('event-takeover')
  )
}

function formatBodyContinuityLeadLine(params: {
  bodyContinuityPhase: SelfEvolutionBodyContinuityPhase
  rendererRejoinSurfaceLabel: string | null
  survivingVisibleLaneTruth: string | null
}) {
  if (params.bodyContinuityPhase === 'full-cross-modal-lock') {
    return params.rendererRejoinSurfaceLabel
      ? `身体连续性：当前已进入跨模态重锁态，身体线与 ${params.rendererRejoinSurfaceLabel} 显形权威仍共同锁在同一段 living segment 上，不应把这段稳定回归误写成普通显形补回。`
      : '身体连续性：当前已进入跨模态重锁态，身体线与显形权威仍共同锁在同一段 living segment 上，不应把这段稳定回归误写成普通显形补回。'
  }

  if (params.bodyContinuityPhase === 'renderer-rejoin-without-body') {
    if (params.survivingVisibleLaneTruth) {
      return `身体连续性：${params.survivingVisibleLaneTruth}，不应把这次 quieter carry 误写成同一条身体线上的可信补回。`
    }

    return params.rendererRejoinSurfaceLabel
      ? `身体连续性：当前已进入显形回接失身态，${params.rendererRejoinSurfaceLabel} 显形权威虽然已经回接，但身体线没有继续托住同一段 living segment，不应把这次可见恢复误写成同一条身体线上的可信补回。`
      : '身体连续性：当前已进入显形回接失身态，显形权威虽然已经回接，但身体线没有继续托住同一段 living segment，不应把这次可见恢复误写成同一条身体线上的可信补回。'
  }

  if (params.bodyContinuityPhase === 'body-only-hold') {
    return '身体连续性：当前仍是身体独撑态，身体线还在独自托住同一段 living segment，不应把这段低显形延续误写成已经失败或已经完成。'
  }

  return params.rendererRejoinSurfaceLabel
    ? `身体连续性：运行时连续性投影仍在，${params.rendererRejoinSurfaceLabel} 显形补回与选中轨迹事件重新进入，说明这段 same living segment 更像先由身体线托住，再沿同一条身体线补回 ${params.rendererRejoinSurfaceLabel} 显形。`
    : '身体连续性：运行时连续性投影仍在，显形权威投影与选中轨迹事件重新进入，说明这段 same living segment 更像先由身体线托住，再沿同一条身体线补回显形权威。'
}

function isProjectStateContinuityTransition(params: {
  changedFocusCard: boolean
  changedEvidenceTargets: boolean
  currentSelectedCardId: SelfEvolutionFocusSnapshotRecord['selectedCardId']
  currentEvidenceIds: string[]
}) {
  return (
    (params.changedFocusCard || params.changedEvidenceTargets)
    && params.currentSelectedCardId === 'first-check'
    && params.currentEvidenceIds.includes('candidate-trajectory-summary')
    && params.currentEvidenceIds.includes('proactive-decision-consumption-summary')
    && params.currentEvidenceIds.includes('identity-drift-governance-summary')
  )
}

export function buildSelfEvolutionFocusHistoryDrilldown(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  if (history.length < 2)
    return []

  const sortedHistory = [...history]
    .sort((left, right) => right.capturedAt - left.capturedAt)

  const drilldown = []

  for (let index = 0; index < sortedHistory.length - 1; index += 1) {
    const current = sortedHistory[index]!
    const previous = sortedHistory[index + 1]!

    const currentCard = current.selectedCardId
    const previousCard = previous.selectedCardId
    const currentEvidence = joinArrow(current.highlightedEvidencePanelIds.map(formatSelfEvolutionEvidencePanelLabel))
    const previousEvidence = joinArrow(previous.highlightedEvidencePanelIds.map(formatSelfEvolutionEvidencePanelLabel))
    const currentTraceTargets = joinArrow(current.highlightedTraceSectionIds.map(formatSelfEvolutionTraceSectionLabel))
    const previousTraceTargets = joinArrow(previous.highlightedTraceSectionIds.map(formatSelfEvolutionTraceSectionLabel))
    const currentTraceEvent = formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId ?? 'n/a')
    const previousTraceEvent = formatSelfEvolutionTraceEventLabel(previous.recommendedTraceEventId ?? 'n/a')

    const changedFocusCard = currentCard !== previousCard
    const changedEvidenceTargets = currentEvidence !== previousEvidence
    const changedTraceTargets = currentTraceTargets !== previousTraceTargets
    const changedTraceEvent = currentTraceEvent !== previousTraceEvent
    const bodyContinuityPhase = resolveBodyContinuityPhase({
      currentBodyContinuityPhase: current.bodyContinuityPhase ?? null,
      previousBodyContinuityPhase: previous.bodyContinuityPhase ?? null,
    })
    const survivingVisibleLaneTruth = formatStructuredSurvivingVisibleLaneTruth(current.survivingVisibleLane)
      ?? formatStructuredSurvivingVisibleLaneTruth(previous.survivingVisibleLane)
      ?? extractSurvivingVisibleLaneTruth(current.bodyContinuityGovernanceNote)
      ?? extractSurvivingVisibleLaneTruth(previous.bodyContinuityGovernanceNote)
      ?? extractSurvivingVisibleLaneTruth(current.explanation)
      ?? extractSurvivingVisibleLaneTruth(previous.explanation)
    const rendererRejoinSurfaceLabel = formatRendererRejoinSurfaceLabel(
      current.rendererRejoinSurfaceKey ?? previous.rendererRejoinSurfaceKey ?? null,
    )
    const bodyContinuityTransition = isBodyContinuityTransition({
      previousBodyContinuityPhase: previous.bodyContinuityPhase ?? null,
      currentBodyContinuityPhase: current.bodyContinuityPhase ?? null,
      previousEvidenceIds: previous.highlightedEvidencePanelIds,
      currentEvidenceIds: current.highlightedEvidencePanelIds,
      previousTraceSectionIds: previous.highlightedTraceSectionIds,
      currentTraceSectionIds: current.highlightedTraceSectionIds,
      previousRecommendedTraceEventId: previous.recommendedTraceEventId,
      currentRecommendedTraceEventId: current.recommendedTraceEventId,
    })
    const projectStateContinuityTransition = isProjectStateContinuityTransition({
      changedFocusCard,
      changedEvidenceTargets,
      currentSelectedCardId: current.selectedCardId,
      currentEvidenceIds: current.highlightedEvidencePanelIds,
    })

    const lines = [
      projectStateContinuityTransition
        ? '项目状态连续性：当前仍在首查 Project identity carry -> Phase 1 route carry -> Unresolved closure carry，不应把这次转移误写成普通 identity-continuity 漂移。'
        : null,
      bodyContinuityTransition
        ? formatBodyContinuityLeadLine({
            bodyContinuityPhase,
            rendererRejoinSurfaceLabel,
            survivingVisibleLaneTruth,
          })
        : null,
      changedFocusCard ? `聚焦卡片：${formatSelfEvolutionFocusCardLabel(previousCard)} -> ${formatSelfEvolutionFocusCardLabel(currentCard)}` : null,
      changedEvidenceTargets ? `证据面板：${previousEvidence} => ${currentEvidence}` : null,
      changedTraceTargets ? `轨迹段：${previousTraceTargets} => ${currentTraceTargets}` : null,
      changedTraceEvent ? `轨迹事件：${previousTraceEvent} -> ${currentTraceEvent}` : null,
    ].filter((line): line is string => Boolean(line))

    if (lines.length === 0)
      continue

    drilldown.push({
      currentCapturedAt: current.capturedAt,
      previousCapturedAt: previous.capturedAt,
      currentDecisionTraceId: current.decisionTraceId,
      previousDecisionTraceId: previous.decisionTraceId,
      changedFocusCard,
      changedEvidenceTargets,
      changedTraceTargets,
      changedTraceEvent,
      lines,
    })
  }

  return drilldown
}
