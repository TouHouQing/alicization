type SelfEvolutionFocusCardId = 'repair-owner' | 'first-check' | 'repair-path'

interface SelfEvolutionFocusSnapshotRecord {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: SelfEvolutionFocusCardId
  explanation: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  bodyContinuityGovernanceNote?: string | null
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

interface SelfEvolutionAdoptedAnchorLike {
  snapshotCapturedAt: number
  decisionTraceId: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  bodyContinuityGovernanceNote?: string | null
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
    || value.includes('当前只有 face 和 lipsync 这条 same-her 生命线')
    || value.includes('当前只有 motion 和 lipsync 这条 same-her 生命线')
  ) {
    return normalizeSummarySentence(value)
  }

  return null
}

function inferBodyContinuityPhaseFromGovernanceNote(note: string | null | undefined) {
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

function resolveBodyContinuityPhase(params: {
  snapshot: SelfEvolutionFocusSnapshotRecord
  adoptedAnchor?: SelfEvolutionAdoptedAnchorLike | null
}) {
  const snapshot = params.snapshot
  if (
    snapshot.bodyContinuityPhase === 'body-only-hold'
    || snapshot.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || snapshot.bodyContinuityPhase === 'full-cross-modal-lock'
    || snapshot.bodyContinuityPhase === 'renderer-rejoin-without-body'
  ) {
    return snapshot.bodyContinuityPhase
  }

  const snapshotNotePhase = inferBodyContinuityPhaseFromGovernanceNote(
    snapshot.bodyContinuityGovernanceNote,
  )
  if (snapshotNotePhase)
    return snapshotNotePhase

  const adoptedAnchor = params.adoptedAnchor
  if (
    adoptedAnchor
    && snapshot.capturedAt === adoptedAnchor.snapshotCapturedAt
    && snapshot.decisionTraceId === adoptedAnchor.decisionTraceId
  ) {
    return adoptedAnchor.bodyContinuityPhase
      ?? inferBodyContinuityPhaseFromGovernanceNote(adoptedAnchor.bodyContinuityGovernanceNote)
      ?? null
  }

  const evidence = new Set(snapshot.highlightedEvidencePanelIds)
  const traceTargets = new Set(snapshot.highlightedTraceSectionIds)

  if (
    evidence.has('runtime-continuity-projection')
    && evidence.has('renderer-authority-projection')
    && traceTargets.has('trace-timeline')
    && traceTargets.has('selected-trace-event')
  ) {
    return 'body-carried-to-renderer-rejoin'
  }

  return null
}

function resolveRendererRejoinSurfaceKey(params: {
  snapshot: SelfEvolutionFocusSnapshotRecord
  relatedSnapshot: SelfEvolutionFocusSnapshotRecord | null
  adoptedAnchor?: SelfEvolutionAdoptedAnchorLike | null
  bodyContinuityPhase: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
}) {
  if (
    params.bodyContinuityPhase !== 'body-carried-to-renderer-rejoin'
    && params.bodyContinuityPhase !== 'full-cross-modal-lock'
    && params.bodyContinuityPhase !== 'renderer-rejoin-without-body'
  ) {
    return null
  }

  if (
    params.adoptedAnchor
    && params.snapshot.capturedAt === params.adoptedAnchor.snapshotCapturedAt
    && params.snapshot.decisionTraceId === params.adoptedAnchor.decisionTraceId
  ) {
    return params.snapshot.rendererRejoinSurfaceKey
      ?? params.adoptedAnchor.rendererRejoinSurfaceKey
      ?? params.relatedSnapshot?.rendererRejoinSurfaceKey
      ?? null
  }

  return params.snapshot.rendererRejoinSurfaceKey
    ?? params.relatedSnapshot?.rendererRejoinSurfaceKey
    ?? null
}

function resolveSurvivingVisibleLaneTruth(params: {
  snapshot: SelfEvolutionFocusSnapshotRecord
  relatedSnapshot: SelfEvolutionFocusSnapshotRecord | null
  adoptedAnchor?: SelfEvolutionAdoptedAnchorLike | null
}) {
  const snapshot = params.snapshot

  const directTruth = extractSurvivingVisibleLaneTruth(snapshot.bodyContinuityGovernanceNote)
    ?? extractSurvivingVisibleLaneTruth(snapshot.explanation)
  if (directTruth)
    return directTruth

  const adoptedAnchor = params.adoptedAnchor
  if (
    adoptedAnchor
    && snapshot.capturedAt === adoptedAnchor.snapshotCapturedAt
    && snapshot.decisionTraceId === adoptedAnchor.decisionTraceId
  ) {
    const adoptedTruth = extractSurvivingVisibleLaneTruth(adoptedAnchor.bodyContinuityGovernanceNote)
    if (adoptedTruth)
      return adoptedTruth
  }

  return extractSurvivingVisibleLaneTruth(params.relatedSnapshot?.bodyContinuityGovernanceNote)
    ?? extractSurvivingVisibleLaneTruth(params.relatedSnapshot?.explanation)
    ?? null
}

export function buildSelfEvolutionFocusHistoryRestorePlan(input: {
  history: SelfEvolutionFocusSnapshotRecord[]
  transition: SelfEvolutionFocusHistoryTransition
  adoptedAnchor?: SelfEvolutionAdoptedAnchorLike | null
  side: 'current' | 'previous'
}) {
  const capturedAt = input.side === 'current'
    ? input.transition.currentCapturedAt
    : input.transition.previousCapturedAt

  const snapshot = input.history.find(item => item.capturedAt === capturedAt)
  if (!snapshot)
    return null

  const relatedCapturedAt = input.side === 'current'
    ? input.transition.previousCapturedAt
    : input.transition.currentCapturedAt
  const relatedSnapshot = input.history.find(item => item.capturedAt === relatedCapturedAt) ?? null

  const bodyContinuityPhase = resolveBodyContinuityPhase({
    snapshot,
    adoptedAnchor: input.adoptedAnchor,
  })
  const rendererRejoinSurfaceKey = resolveRendererRejoinSurfaceKey({
    snapshot,
    relatedSnapshot,
    adoptedAnchor: input.adoptedAnchor,
    bodyContinuityPhase,
  })
  const rendererRejoinSurface = rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
    ? 'Live2D'
    : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
      ? 'VRM'
      : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech'
        ? 'speech'
        : null
  const survivingVisibleLaneTruth = resolveSurvivingVisibleLaneTruth({
    snapshot,
    relatedSnapshot,
    adoptedAnchor: input.adoptedAnchor,
  })

  return {
    snapshotCapturedAt: snapshot.capturedAt,
    candidateId: snapshot.candidateId,
    decisionTraceId: snapshot.decisionTraceId,
    selectedCardId: snapshot.selectedCardId,
    recommendedTraceEventId: snapshot.recommendedTraceEventId,
    shouldDrillTrace: snapshot.highlightedTraceSectionIds.length > 0 || Boolean(snapshot.recommendedTraceEventId),
    bodyContinuityPhase,
    rendererRejoinSurfaceKey: bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
      || bodyContinuityPhase === 'full-cross-modal-lock'
      || bodyContinuityPhase === 'renderer-rejoin-without-body'
      ? rendererRejoinSurfaceKey
      : null,
    restoreSummaryLine: bodyContinuityPhase === 'body-only-hold'
      ? '恢复到身体连续性独撑态：身体线仍在独自托住同一段 living segment，当前还不能把显形权威的回接视为已经成立。'
      : bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
        ? rendererRejoinSurface
          ? `恢复到身体连续性补回态：身体线已经托住同一段 living segment，并开始沿同一条身体线补回 ${rendererRejoinSurface} 显形权威。`
          : '恢复到身体连续性补回态：身体线已经托住同一段 living segment，并开始沿同一条身体线补回显形权威。'
        : bodyContinuityPhase === 'full-cross-modal-lock'
          ? rendererRejoinSurface
            ? `恢复到跨模态重锁态：身体线与 ${rendererRejoinSurface} 显形权威仍稳定锁在同一段 living segment 上。`
            : '恢复到跨模态重锁态：身体线与显形权威仍稳定锁在同一段 living segment 上。'
          : bodyContinuityPhase === 'renderer-rejoin-without-body'
            ? survivingVisibleLaneTruth
              ? `恢复到显形回接失身态：${survivingVisibleLaneTruth}`
              : rendererRejoinSurface
                ? `恢复到显形回接失身态：${rendererRejoinSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment。`
                : '恢复到显形回接失身态：显形权威已经回接，但身体线没有继续托住同一段 living segment。'
            : null,
    highlightedEvidencePanelIds: snapshot.highlightedEvidencePanelIds,
    highlightedTraceSectionIds: snapshot.highlightedTraceSectionIds,
  }
}
