import {
  formatSelfEvolutionEventKindLabel,
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionActiveWorkflowFocus {
  title: string
  summaryLine: string
  repairOwnerHint: string
  prosodyAuthorityHint: string | null
  bodyContinuityHint?: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  rendererTarget?: 'live2d' | 'vrm' | 'speech' | null
  evidencePanels: Set<string>
  traceSections: Set<string>
  eventKinds: Set<string>
}

function resolveRendererRejoinSurfaceKey(rendererTarget: 'live2d' | 'vrm' | 'speech' | null) {
  if (rendererTarget === 'live2d')
    return 'authority:renderer-rejoin:live2d'
  if (rendererTarget === 'vrm')
    return 'authority:renderer-rejoin:vrm'
  if (rendererTarget === 'speech')
    return 'authority:renderer-rejoin:speech'
  return null
}

function formatRendererSurfaceLabel(rendererTarget: 'live2d' | 'vrm' | 'speech' | null) {
  if (rendererTarget === 'live2d')
    return 'Live2D'
  if (rendererTarget === 'vrm')
    return 'VRM'
  if (rendererTarget === 'speech')
    return 'speech'
  return null
}

function formatRendererRejoinSurfaceLabel(
  rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null,
) {
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'
  return null
}

function isBodyContinuityPhase(
  bodyContinuityPhase: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null,
) {
  return bodyContinuityPhase === 'body-only-hold'
    || bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || bodyContinuityPhase === 'full-cross-modal-lock'
    || bodyContinuityPhase === 'renderer-rejoin-without-body'
}

function inferBodyContinuityPhaseFromHint(hint: string | null | undefined) {
  if (!hint)
    return null
  if (
    hint.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线')
    || hint.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线')
    || hint.includes('当前仅剩表情、口型、声音维持同一段连续性')
    || hint.includes('当前仅剩动作、口型、声音维持同一段连续性')
  ) {
    return 'renderer-rejoin-without-body' as const
  }
  if (hint.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body' as const
  if (hint.includes('跨模态重锁态'))
    return 'full-cross-modal-lock' as const
  if (
    hint.includes('身体承接态 -> 显形补回态')
    || hint.includes('沿同一条连续身体线补回')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }
  if (
    hint.includes('身体独撑态')
    || hint.includes('独自托住同一段 living segment')
  ) {
    return 'body-only-hold' as const
  }
  return null
}

export function buildSelfEvolutionRepairSession(input: {
  activeWorkflowFocus: SelfEvolutionActiveWorkflowFocus | null
  rendererTarget?: 'live2d' | 'vrm' | 'speech' | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  viewedEvidencePanels: Set<string>
  viewedTraceSections: Set<string>
  viewedEventKinds: Set<string>
}) {
  if (!input.activeWorkflowFocus)
    return null

  const evidenceChecklist = [...input.activeWorkflowFocus.evidencePanels]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `evidence:${item}`)
  const traceChecklist = [...input.activeWorkflowFocus.traceSections]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `trace:${item}`)
  const eventChecklist = [...input.activeWorkflowFocus.eventKinds]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `event:${item}`)

  const completedChecklist = [
    ...evidenceChecklist.filter(item => input.viewedEvidencePanels.has(item.replace('evidence:', ''))),
    ...traceChecklist.filter(item => input.viewedTraceSections.has(item.replace('trace:', ''))),
    ...eventChecklist.filter(item => input.viewedEventKinds.has(item.replace('event:', ''))),
  ]

  const remainingEvidence = evidenceChecklist.filter(item => !completedChecklist.includes(item))
  const remainingTrace = traceChecklist.filter(item => !completedChecklist.includes(item))
  const remainingEvents = eventChecklist.filter(item => !completedChecklist.includes(item))
  const remainingChecklist = [
    ...remainingEvidence,
    ...remainingTrace,
    ...remainingEvents,
  ]

  const totalCount = evidenceChecklist.length + traceChecklist.length + eventChecklist.length
  const completedCount = completedChecklist.length
  const completionPercent = totalCount === 0
    ? 100
    : Math.round((completedCount / totalCount) * 100)

  const summaryLines = [
    `已完成 ${totalCount} 项中的 ${completedCount} 项修复检查，当前归属为${input.activeWorkflowFocus.repairOwnerHint}。`,
  ]
  const survivingVisibleLane = input.activeWorkflowFocus.survivingVisibleLane ?? (
    input.activeWorkflowFocus.bodyContinuityHint?.includes('当前仅剩表情、口型、声音维持同一段连续性')
      ? 'face+lipsync+voice-only'
      : input.activeWorkflowFocus.bodyContinuityHint?.includes('当前仅剩动作、口型、声音维持同一段连续性')
        ? 'motion+lipsync+voice-only'
        : input.activeWorkflowFocus.bodyContinuityHint?.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线')
          ? 'face+lipsync-only'
          : input.activeWorkflowFocus.bodyContinuityHint?.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线')
            ? 'motion+lipsync-only'
            : null
  )
  const bodyContinuityPhase = input.bodyContinuityPhase
    ?? (survivingVisibleLane ? 'renderer-rejoin-without-body' : null)
    ?? input.activeWorkflowFocus.bodyContinuityPhase
    ?? inferBodyContinuityPhaseFromHint(input.activeWorkflowFocus.bodyContinuityHint)
    ?? null
  const rendererRejoinSurfaceKey = (
    bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || bodyContinuityPhase === 'full-cross-modal-lock'
    || bodyContinuityPhase === 'renderer-rejoin-without-body'
  )
    ? survivingVisibleLane
      ? null
      : input.rendererRejoinSurfaceKey ?? input.activeWorkflowFocus.rendererRejoinSurfaceKey ?? null
    : null
  const isProjectStateContinuity = input.activeWorkflowFocus.repairOwnerHint.includes('项目状态连续性治理')
    || input.activeWorkflowFocus.summaryLine.includes('project-state continuity')
    || input.activeWorkflowFocus.summaryLine.includes('项目状态连续性')
  const isBodyContinuity = isBodyContinuityPhase(bodyContinuityPhase)
    || input.activeWorkflowFocus.repairOwnerHint.includes('身体连续性治理')
    || input.activeWorkflowFocus.summaryLine.includes('body continuity')
    || input.activeWorkflowFocus.summaryLine.includes('身体连续性')

  if (input.activeWorkflowFocus.prosodyAuthorityHint)
    summaryLines.push(`韵律权威：${input.activeWorkflowFocus.prosodyAuthorityHint}`)
  if (input.activeWorkflowFocus.bodyContinuityHint)
    summaryLines.push(`身体连续性：${input.activeWorkflowFocus.bodyContinuityHint}`)
  if (bodyContinuityPhase === 'body-only-hold')
    summaryLines.push('身体连续性阶段：身体独撑态。')
  if (bodyContinuityPhase === 'body-carried-to-renderer-rejoin')
    summaryLines.push('身体连续性阶段：身体承接态 -> 显形补回态。')
  if (bodyContinuityPhase === 'full-cross-modal-lock')
    summaryLines.push('身体连续性阶段：跨模态重锁态。')
  if (bodyContinuityPhase === 'renderer-rejoin-without-body')
    summaryLines.push('身体连续性阶段：显形回接失身态。')
  const rendererTarget = survivingVisibleLane
    ? null
    : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
      ? 'live2d'
      : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
        ? 'vrm'
        : input.rendererTarget ?? input.activeWorkflowFocus.rendererTarget ?? null
  const rendererSurfaceLabel = formatRendererSurfaceLabel(rendererTarget)
  const rendererRejoinSurfaceLabel = rendererSurfaceLabel
    ?? formatRendererRejoinSurfaceLabel(rendererRejoinSurfaceKey)
  if (rendererTarget === 'live2d')
    summaryLines.push('显形目标：Live2D')
  else if (rendererTarget === 'vrm')
    summaryLines.push('显形目标：VRM')
  else if (rendererTarget === 'speech')
    summaryLines.push('显形目标：speech')

  if (remainingEvidence.length > 0)
    summaryLines.push(`剩余证据：${remainingEvidence.map(item => formatSelfEvolutionEvidencePanelLabel(item.replace('evidence:', ''))).join('，')}`)
  if (remainingTrace.length > 0)
    summaryLines.push(`剩余轨迹：${remainingTrace.map(item => formatSelfEvolutionTraceSectionLabel(item.replace('trace:', ''))).join('，')}`)
  if (remainingEvents.length > 0)
    summaryLines.push(`剩余事件：${remainingEvents.map(item => formatSelfEvolutionEventKindLabel(item.replace('event:', ''))).join('，')}`)
  if (isProjectStateContinuity && remainingChecklist.length > 0) {
    summaryLines.push(
      '本轮仍在核对项目身份、Phase 1 本地主continuity evidence与未闭环任务承接，确认这些生命线是否还被身份连续性连续带入下一轮。',
    )
  }
  if (isBodyContinuity && remainingChecklist.length > 0) {
    let bodyContinuitySummaryLine = '本轮仍在核对身体线是否继续托住同一段 living segment，并确认表情、动作、口型是否正在补回同一条连续身体线。'

    if (bodyContinuityPhase === 'body-only-hold') {
      bodyContinuitySummaryLine = '本轮仍在核对身体线是否还在独自托住同一段 living segment，并确认显形层为什么还没有完整回到这条连续身体线。'
    }
    else if (bodyContinuityPhase === 'body-carried-to-renderer-rejoin') {
      bodyContinuitySummaryLine = rendererRejoinSurfaceLabel
        ? `本轮仍在核对身体线是否继续托住同一段 living segment，并确认 ${rendererRejoinSurfaceLabel} 显形权威是否正在沿同一条连续身体线补回。`
        : '本轮仍在核对身体线是否继续托住同一段 living segment，并确认显形权威是否正在沿同一条连续身体线补回。'
    }
    else if (bodyContinuityPhase === 'full-cross-modal-lock') {
      bodyContinuitySummaryLine = rendererRejoinSurfaceLabel
        ? `本轮仍在确认身体线与 ${rendererRejoinSurfaceLabel} 显形权威是否已经稳定锁回同一段 living segment，而不是短暂对齐后再次散开。`
        : '本轮仍在确认身体线与显形权威是否已经稳定锁回同一段 living segment，而不是短暂对齐后再次散开。'
    }
    else if (bodyContinuityPhase === 'renderer-rejoin-without-body') {
      if (survivingVisibleLane === 'face+lipsync+voice-only') {
        bodyContinuitySummaryLine = '本轮仍在核对当前是否仍只有 face、lipsync 和 voice 这条 identity-continuity 生命线与同一段 living segment 对齐，并确认 body、motion 为什么还没有重新接回这条表情口型声音线。'
      }
      else if (survivingVisibleLane === 'motion+lipsync+voice-only') {
        bodyContinuitySummaryLine = '本轮仍在核对当前是否仍只有 motion、lipsync 和 voice 这条 identity-continuity 生命线与同一段 living segment 对齐，并确认 body、face 为什么还没有重新接回这条动作口型声音线。'
      }
      else if (survivingVisibleLane === 'face+lipsync-only') {
        bodyContinuitySummaryLine = '本轮仍在核对当前是否仍只有 face 和 lipsync 这条 identity-continuity 生命线与同一段 living segment 对齐，并确认 body、motion 和 voice 为什么还没有重新接回这条表情口型线。'
      }
      else if (survivingVisibleLane === 'motion+lipsync-only') {
        bodyContinuitySummaryLine = '本轮仍在核对当前是否仍只有 motion 和 lipsync 这条 identity-continuity 生命线与同一段 living segment 对齐，并确认 body、face 和 voice 为什么还没有重新接回这条动作口型线。'
      }
      else {
        bodyContinuitySummaryLine = rendererRejoinSurfaceLabel
          ? `本轮仍在核对为什么 ${rendererRejoinSurfaceLabel} 显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把这种失身回接误判成修复完成。`
          : '本轮仍在核对为什么显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把这种失身回接误判成修复完成。'
      }
    }

    summaryLines.push(bodyContinuitySummaryLine)
  }
  if (remainingChecklist.length === 0)
    summaryLines.push('该反复漂移工作流的修复检查已全部覆盖。')

  return {
    completionPercent,
    completedCount,
    totalCount,
    completedChecklist,
    remainingChecklist,
    summaryLines,
    bodyContinuityPhase,
    rendererTarget,
    ...(survivingVisibleLane
      ? { survivingVisibleLane }
      : {}),
    rendererRejoinSurfaceKey: (
      bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
      || bodyContinuityPhase === 'full-cross-modal-lock'
      || bodyContinuityPhase === 'renderer-rejoin-without-body'
    )
      ? rendererRejoinSurfaceKey ?? resolveRendererRejoinSurfaceKey(rendererTarget)
      : null,
  }
}
