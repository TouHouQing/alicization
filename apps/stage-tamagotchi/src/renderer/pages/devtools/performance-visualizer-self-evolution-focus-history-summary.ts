import {
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionFocusCardLabel,
  formatSelfEvolutionTraceEventLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionFocusSnapshotRecord {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path'
  explanation: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  bodyContinuityGovernanceNote?: string | null
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  capturedAt: number
}

function normalizeSummarySentence(value: string) {
  const normalized = value.trim()
  return /[。.!?]$/u.test(normalized) ? normalized : `${normalized}。`
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
    return normalizeSummarySentence(value)
  }

  return null
}

function formatStructuredSurvivingVisibleLaneTruth(
  survivingVisibleLane: SelfEvolutionFocusSnapshotRecord['survivingVisibleLane'],
) {
  if (survivingVisibleLane === 'face+lipsync+voice-only')
    return '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。'
  if (survivingVisibleLane === 'motion+lipsync+voice-only')
    return '当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线。'
  if (survivingVisibleLane === 'face+lipsync-only')
    return '当前只有 face 和 lipsync 这条 identity-continuity 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线。'
  if (survivingVisibleLane === 'motion+lipsync-only')
    return '当前只有 motion 和 lipsync 这条 identity-continuity 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线。'
  return null
}

function countValues(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function formatCounts(counts: Map<string, number>) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([value, count]) => `${formatSelfEvolutionFocusCardLabel(value)} x${count}`)
    .join('，')
}

function formatRendererRejoinSurfaceLabel(
  surfaceKey: SelfEvolutionFocusSnapshotRecord['rendererRejoinSurfaceKey'],
) {
  if (surfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D 显形权威'
  if (surfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM 显形权威'
  if (surfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech 显形权威'
  return '显形权威'
}

function resolveRendererRejoinSurfaceKey(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  return [...history]
    .sort((left, right) => left.capturedAt - right.capturedAt)
    .find(item =>
      (
        item.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
        || item.bodyContinuityPhase === 'full-cross-modal-lock'
        || item.bodyContinuityPhase === 'renderer-rejoin-without-body'
      )
      && item.rendererRejoinSurfaceKey,
    )
    ?.rendererRejoinSurfaceKey
    ?? null
}

function resolveSurvivingVisibleLaneTruth(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  return [...history]
    .sort((left, right) => right.capturedAt - left.capturedAt)
    .map(item =>
      formatStructuredSurvivingVisibleLaneTruth(item.survivingVisibleLane)
      ?? extractSurvivingVisibleLaneTruth(item.bodyContinuityGovernanceNote)
      ?? extractSurvivingVisibleLaneTruth(item.explanation),
    )
    .find((value): value is string => Boolean(value))
    ?? null
}

function hasProjectStateContinuityCarry(params: {
  history: SelfEvolutionFocusSnapshotRecord[]
  stableEvidenceIds: string[]
}) {
  return params.history.length > 0
    && params.history.every(item => item.selectedCardId === 'first-check')
    && params.stableEvidenceIds.includes('candidate-trajectory-summary')
    && params.stableEvidenceIds.includes('proactive-decision-consumption-summary')
    && params.stableEvidenceIds.includes('identity-drift-governance-summary')
}

export function buildSelfEvolutionFocusHistorySummary(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  if (history.length === 0)
    return null

  const focusCounts = countValues(history.map(item => item.selectedCardId))
  const stableEvidence = [...countValues(history.flatMap(item => item.highlightedEvidencePanelIds)).entries()]
    .filter(([, count]) => count === history.length)
    .map(([value]) => value)
    .sort()
    .map(formatSelfEvolutionEvidencePanelLabel)
  const driftingEvidence = [...countValues(history.flatMap(item => item.highlightedEvidencePanelIds)).entries()]
    .filter(([, count]) => count < history.length)
    .map(([value]) => value)
    .sort()
    .map(formatSelfEvolutionEvidencePanelLabel)
  const eventCounts = countValues(history.map(item => formatSelfEvolutionTraceEventLabel(item.recommendedTraceEventId ?? 'n/a')))
  const stableEvidenceIds = [...countValues(history.flatMap(item => item.highlightedEvidencePanelIds)).entries()]
    .filter(([, count]) => count === history.length)
    .map(([value]) => value)
  const driftingEvidenceIds = [...countValues(history.flatMap(item => item.highlightedEvidencePanelIds)).entries()]
    .filter(([, count]) => count < history.length)
    .map(([value]) => value)
  const rendererRejoinSurfaceKey = resolveRendererRejoinSurfaceKey(history)
  const survivingVisibleLaneTruth = resolveSurvivingVisibleLaneTruth(history)
  const projectStateContinuityLine = hasProjectStateContinuityCarry({
    history,
    stableEvidenceIds,
  })
    ? '项目状态连续性：Project identity carry -> Phase 1 route carry -> Unresolved closure carry 仍在这组聚焦历史里持续作为首查点被重新核对。'
    : null

  const bodyLedContinuityLine = stableEvidenceIds.includes('runtime-continuity-projection')
    && driftingEvidenceIds.includes('renderer-authority-projection')
    && history.some(item => item.bodyContinuityPhase === 'body-carried-to-renderer-rejoin')
    ? `身体连续性：运行时连续性投影持续稳定，${formatRendererRejoinSurfaceLabel(rendererRejoinSurfaceKey)}投影在相邻快照间反复出入，说明这段 same living segment 更像先由身体线继续托住。`
    : null
  const bodyOnlyHoldLine = stableEvidenceIds.includes('runtime-continuity-projection')
    && !stableEvidenceIds.includes('renderer-authority-projection')
    && history.some(item => item.bodyContinuityPhase === 'body-only-hold')
    ? '身体连续性：运行时连续性投影持续稳定，但显形权威长期没有稳定补回，说明这段 same living segment 仍主要靠身体线独自托住。'
    : null
  const fullCrossModalLockLine = stableEvidenceIds.includes('runtime-continuity-projection')
    && stableEvidenceIds.includes('renderer-authority-projection')
    && history.some(item => item.bodyContinuityPhase === 'full-cross-modal-lock')
    ? `身体连续性：运行时连续性投影与${formatRendererRejoinSurfaceLabel(rendererRejoinSurfaceKey)}投影都已稳定下来，说明身体线与显形权威正在共同锁住同一段 living segment，而不是短暂同步。`
    : null
  const rendererWithoutBodyLine = history.some(item => item.bodyContinuityPhase === 'renderer-rejoin-without-body')
    ? survivingVisibleLaneTruth
      ? `身体连续性：${survivingVisibleLaneTruth}`
      : `身体连续性：${formatRendererRejoinSurfaceLabel(rendererRejoinSurfaceKey)}投影虽然已经回接，但身体线没有继续托住同一段 living segment，这更像显形回接失身而不是修复完成。`
    : null

  return [
    `历史快照数：${history.length}`,
    focusCounts.size === 1
      ? `聚焦卡片：稳定（${formatSelfEvolutionFocusCardLabel(history[0]!.selectedCardId)}）`
      : `聚焦卡片：存在漂移（${formatCounts(focusCounts)}）`,
    `稳定证据面板：${stableEvidence.length > 0 ? stableEvidence.join('，') : 'n/a'}`,
    `漂移证据面板：${driftingEvidence.length > 0 ? driftingEvidence.join('，') : 'n/a'}`,
    projectStateContinuityLine,
    bodyOnlyHoldLine,
    bodyLedContinuityLine,
    fullCrossModalLockLine,
    rendererWithoutBodyLine,
    eventCounts.size === 1
      ? `轨迹事件：稳定（${formatSelfEvolutionTraceEventLabel(history[0]!.recommendedTraceEventId ?? 'n/a')}）`
      : `轨迹事件：存在漂移（${[...eventCounts.keys()].join('，')}）`,
  ].filter((line): line is string => Boolean(line))
}
