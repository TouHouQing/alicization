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
    return 'authority:renderer-rejoin:live2d' as const
  if (rendererTarget === 'vrm')
    return 'authority:renderer-rejoin:vrm' as const
  if (rendererTarget === 'speech')
    return 'authority:renderer-rejoin:speech' as const
  return null
}

function formatValues(values: string[]) {
  return values.length > 0 ? values.join(',') : 'none'
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
  const focus = input.activeWorkflowFocus
  if (!focus)
    return null

  const evidenceChecklist = [...focus.evidencePanels]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `evidence:${item}`)
  const traceChecklist = [...focus.traceSections]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `trace:${item}`)
  const eventChecklist = [...focus.eventKinds]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `event:${item}`)

  const completedChecklist = [
    ...evidenceChecklist.filter(item => input.viewedEvidencePanels.has(item.slice('evidence:'.length))),
    ...traceChecklist.filter(item => input.viewedTraceSections.has(item.slice('trace:'.length))),
    ...eventChecklist.filter(item => input.viewedEventKinds.has(item.slice('event:'.length))),
  ]
  const completedSet = new Set(completedChecklist)
  const remainingEvidence = evidenceChecklist.filter(item => !completedSet.has(item))
  const remainingTrace = traceChecklist.filter(item => !completedSet.has(item))
  const remainingEvents = eventChecklist.filter(item => !completedSet.has(item))
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
  const bodyContinuityPhase = input.bodyContinuityPhase
    ?? focus.bodyContinuityPhase
    ?? null
  const survivingVisibleLane = focus.survivingVisibleLane ?? null
  const rendererTarget = input.rendererTarget
    ?? focus.rendererTarget
    ?? null
  const rendererRejoinSurfaceKey = input.rendererRejoinSurfaceKey
    ?? focus.rendererRejoinSurfaceKey
    ?? (
      bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
      || bodyContinuityPhase === 'full-cross-modal-lock'
      || bodyContinuityPhase === 'renderer-rejoin-without-body'
        ? resolveRendererRejoinSurfaceKey(rendererTarget)
        : null
    )

  return {
    completionPercent,
    completedCount,
    totalCount,
    completedChecklist,
    remainingChecklist,
    summaryLines: [
      `completion=${completedCount}/${totalCount} (${completionPercent}%)`,
      `repairOwnerHint=${focus.repairOwnerHint || 'n/a'}`,
      `bodyContinuityPhase=${bodyContinuityPhase ?? 'n/a'}`,
      `rendererTarget=${rendererTarget ?? 'n/a'}`,
      `rendererRejoinSurfaceKey=${rendererRejoinSurfaceKey ?? 'n/a'}`,
      `survivingVisibleLane=${survivingVisibleLane ?? 'n/a'}`,
      `remainingEvidence=${formatValues(remainingEvidence)}`,
      `remainingTrace=${formatValues(remainingTrace)}`,
      `remainingEvents=${formatValues(remainingEvents)}`,
    ],
    bodyContinuityPhase,
    rendererTarget,
    survivingVisibleLane,
    rendererRejoinSurfaceKey,
  }
}
