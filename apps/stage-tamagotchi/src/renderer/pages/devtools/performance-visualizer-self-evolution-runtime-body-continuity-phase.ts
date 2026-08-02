interface SelfEvolutionRuntimeBodyContinuityAuthorityView {
  cueId?: string | null
  authoritySegmentId?: string | null
  authorityRendererTarget?: 'live2d' | 'vrm' | 'speech' | null
  authorityMatchedDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  authoritySources?: string[]
  authorityTrustSummary?: string | null
  authorityBindingSummary?: string | null
  authorityMatchSummary?: string | null
  settleAuthoritySummary?: string | null
  prosodyAuthoritySummary?: string | null
  traceEmbodimentSummary?: string | null
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  summaryEntries?: unknown[]
  preferredExpressionAliases?: string[]
  preferredMotionAliases?: string[]
  live2dFacialReleaseMs?: number | null
  live2dMotionFollowThroughMs?: number | null
  vrmActionFadeMs?: number | null
  vrmExpressionBlendMs?: number | null
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
  continuityFrameActiveDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  continuityFrameMismatchDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  continuityFramePerformanceSegmentId?: string | null
  continuityFrameSpeechSegmentId?: string | null
  continuityFrameSummary?: string | null
  continuityExecutionActiveDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  continuityExecutionMismatchDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  continuityExecutionAuthoritySegmentId?: string | null
  continuityExecutionSummary?: string | null
}

type ContinuityDriver = 'body' | 'face' | 'motion' | 'lipsync' | 'voice'

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function matchesScopedSegment(segmentId: string | null | undefined, activeSegmentId: string | null | undefined) {
  const normalizedSegmentId = normalizeText(segmentId)
  const normalizedActiveSegmentId = normalizeText(activeSegmentId)
  return !normalizedSegmentId || !normalizedActiveSegmentId || normalizedSegmentId === normalizedActiveSegmentId
}

function normalizeContinuityDrivers(values: ContinuityDriver[] | null | undefined) {
  return (values ?? []).filter((driver): driver is ContinuityDriver =>
    driver === 'body'
    || driver === 'face'
    || driver === 'motion'
    || driver === 'lipsync'
    || driver === 'voice',
  )
}

function resolveMatchedDriversFromContinuitySignals(input: {
  activeSegmentId: string | null
  activeDrivers?: ContinuityDriver[] | null
  mismatchDrivers?: ContinuityDriver[] | null
  authoritySegmentId?: string | null
  performanceSegmentId?: string | null
  speechSegmentId?: string | null
}) {
  if (!matchesScopedSegment(input.authoritySegmentId, input.activeSegmentId))
    return []
  if (!matchesScopedSegment(input.performanceSegmentId, input.activeSegmentId))
    return []
  if (!matchesScopedSegment(input.speechSegmentId, input.activeSegmentId))
    return []

  const activeDrivers = normalizeContinuityDrivers(input.activeDrivers)
  const mismatchDrivers = new Set(normalizeContinuityDrivers(input.mismatchDrivers))
  return activeDrivers.filter(driver => !mismatchDrivers.has(driver))
}

export function resolveSelfEvolutionRuntimeBodyContinuityPhase(
  authorityView: SelfEvolutionRuntimeBodyContinuityAuthorityView | null | undefined,
) {
  if (!authorityView)
    return null

  const activeSegmentId = normalizeText(authorityView.authoritySegmentId)
    ?? normalizeText(authorityView.cueId)
    ?? null

  const hasExplicitBodyEvidence = typeof authorityView.bodySegmentMatched === 'boolean'
  const hasExplicitRendererLaneEvidence = [
    authorityView.faceSegmentMatched,
    authorityView.motionSegmentMatched,
    authorityView.lipsyncSegmentMatched,
    authorityView.voiceSegmentMatched,
  ].some(value => typeof value === 'boolean')
  const explicitBodyHeld = authorityView.bodySegmentMatched === true
  const explicitMatchedRendererLaneCount = [
    authorityView.faceSegmentMatched === true,
    authorityView.motionSegmentMatched === true,
    authorityView.lipsyncSegmentMatched === true,
    authorityView.voiceSegmentMatched === true,
  ].filter(Boolean).length
  const continuityMatchedDrivers = resolveMatchedDriversFromContinuitySignals({
    activeSegmentId,
    activeDrivers: authorityView.continuityFrameActiveDrivers,
    mismatchDrivers: authorityView.continuityFrameMismatchDrivers,
    performanceSegmentId: authorityView.continuityFramePerformanceSegmentId,
    speechSegmentId: authorityView.continuityFrameSpeechSegmentId,
  })
  const continuityExecutionMatchedDrivers = resolveMatchedDriversFromContinuitySignals({
    activeSegmentId,
    activeDrivers: authorityView.continuityExecutionActiveDrivers,
    mismatchDrivers: authorityView.continuityExecutionMismatchDrivers,
    authoritySegmentId: authorityView.continuityExecutionAuthoritySegmentId,
  })
  const fallbackMatchedDrivers = continuityMatchedDrivers.length > 0
    ? continuityMatchedDrivers
    : continuityExecutionMatchedDrivers
  const bodyHeld = hasExplicitBodyEvidence
    ? explicitBodyHeld
    : fallbackMatchedDrivers.includes('body')
  const matchedRendererLaneCount = hasExplicitRendererLaneEvidence
    ? explicitMatchedRendererLaneCount
    : fallbackMatchedDrivers.filter(driver => driver !== 'body').length

  if (bodyHeld && matchedRendererLaneCount === 0)
    return 'body-only-hold'

  if (bodyHeld && matchedRendererLaneCount >= 3)
    return 'full-cross-modal-lock'

  if (bodyHeld && matchedRendererLaneCount > 0)
    return 'body-carried-to-renderer-rejoin'

  if (!bodyHeld && matchedRendererLaneCount > 0)
    return 'renderer-rejoin-without-body'

  return null
}
