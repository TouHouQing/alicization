interface SelfEvolutionFocusHistoryPattern {
  patternKey: string
  bodyContinuityPattern?: boolean
  bodyContinuityPhase?: SelfEvolutionBodyContinuityPhase
  rendererRejoinSurfaceKey?: SelfEvolutionRendererRejoinSurfaceKey
  survivingVisibleLane?: SelfEvolutionSurvivingVisibleLane
  occurrenceCount: number
  summaryLine: string
  focusCardTransition: string
  traceEventTransition: string
  evidenceGained: string[]
  evidenceLost: string[]
  traceTargetsGained: string[]
  traceTargetsLost: string[]
  occurrences: Array<{
    currentCapturedAt: number
    previousCapturedAt: number
  }>
}

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

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort()
}

function normalizeEventKind(value: string) {
  if (value === 'event-person-state')
    return 'person-state-updated'
  if (value === 'event-takeover')
    return 'takeover-audit'
  if (value === 'event-governance')
    return 'governance-normalized'
  return value
}

function readEventKinds(transition: string) {
  return uniqueSorted(
    transition
      .split(/\s*->\s*/)
      .map(value => value.trim())
      .filter(value => value && value !== 'n/a')
      .map(normalizeEventKind),
  )
}

function resolveRendererTarget(surfaceKey: SelfEvolutionRendererRejoinSurfaceKey) {
  if (surfaceKey === 'authority:renderer-rejoin:live2d')
    return 'live2d' as const
  if (surfaceKey === 'authority:renderer-rejoin:vrm')
    return 'vrm' as const
  if (surfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech' as const
  return null
}

export function buildSelfEvolutionFocusHistoryPatternGuidance(
  pattern: SelfEvolutionFocusHistoryPattern,
) {
  const evidence = uniqueSorted([...pattern.evidenceGained, ...pattern.evidenceLost])
  const traceTargets = uniqueSorted([...pattern.traceTargetsGained, ...pattern.traceTargetsLost])
  const eventKinds = readEventKinds(pattern.traceEventTransition)
  const bodyContinuityPhase = pattern.bodyContinuityPhase ?? null
  const rendererRejoinSurfaceKey = pattern.rendererRejoinSurfaceKey ?? null
  const survivingVisibleLane = pattern.survivingVisibleLane ?? null
  const bodyPattern = pattern.bodyContinuityPattern === true
    || bodyContinuityPhase != null
    || rendererRejoinSurfaceKey != null
    || survivingVisibleLane != null

  const diagnosticLayer = bodyPattern
    ? 'body-continuity'
    : evidence.includes('persona-bias-provenance') || evidence.includes('proactive-action-chain')
      ? 'persona'
      : evidence.includes('renderer-authority-projection') || traceTargets.includes('trace-timeline')
        ? 'renderer-authority'
        : null

  if (!diagnosticLayer)
    return null

  return {
    governanceLayer: diagnosticLayer,
    governanceLayerDisplay: diagnosticLayer,
    repairOwnerHint: diagnosticLayer,
    prosodyAuthorityHint: null,
    bodyContinuityHint: null,
    bodyContinuityPhase,
    rendererRejoinSurfaceKey,
    survivingVisibleLane,
    rendererTarget: resolveRendererTarget(rendererRejoinSurfaceKey),
    recommendedEvidencePanels: evidence,
    recommendedTraceSections: traceTargets,
    recommendedEventKinds: eventKinds,
    summaryLine: `检测到 ${pattern.occurrenceCount} 次历史模式。`,
  }
}
