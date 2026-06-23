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
  sameHerFramePerformanceSegmentId?: string | null
  sameHerFrameSpeechSegmentId?: string | null
  sameHerFrameSummary?: string | null
  sameHerExecutionAuthoritySegmentId?: string | null
  sameHerExecutionSummary?: string | null
}

type ContinuityDriver = 'body' | 'face' | 'motion' | 'lipsync' | 'voice'

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function extractSummaryField(summary: string | null | undefined, field: string) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  for (const part of normalized.split('|').map(part => part.trim()).filter(Boolean)) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0)
      continue

    const key = part.slice(0, separatorIndex).trim()
    const rawValue = part.slice(separatorIndex + 1).trim()
    if (key === field)
      return normalizeText(rawValue)
  }

  return null
}

function parseDriverList(value: string | null | undefined) {
  const normalized = normalizeText(value)
  if (!normalized || normalized === 'none')
    return []

  return normalized
    .split(',')
    .map(part => normalizeText(part))
    .filter((driver): driver is ContinuityDriver =>
      driver === 'body'
      || driver === 'face'
      || driver === 'motion'
      || driver === 'lipsync'
      || driver === 'voice',
    )
}

function parseLaneDrivers(value: string | null | undefined) {
  const normalized = normalizeText(value)
  if (!normalized)
    return []

  const laneValue = normalized.endsWith('-only')
    ? normalized.slice(0, -'-only'.length)
    : normalized

  if (laneValue === 'full-driver-rejoin')
    return ['body', 'face', 'motion', 'lipsync', 'voice'] satisfies ContinuityDriver[]

  return laneValue
    .split('+')
    .map(part => normalizeText(part))
    .filter((driver): driver is ContinuityDriver =>
      driver === 'body'
      || driver === 'face'
      || driver === 'motion'
      || driver === 'lipsync'
      || driver === 'voice',
    )
}

function matchesScopedSegment(segmentId: string | null | undefined, activeSegmentId: string | null | undefined) {
  const normalizedSegmentId = normalizeText(segmentId)
  const normalizedActiveSegmentId = normalizeText(activeSegmentId)
  return !normalizedSegmentId || !normalizedActiveSegmentId || normalizedSegmentId === normalizedActiveSegmentId
}

function extractStructuredSameHerSegmentId(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  return extractSummaryField(normalized, 'authority')
    ?? extractSummaryField(normalized, 'segment')
    ?? extractSummaryField(normalized, 'performance')
    ?? extractSummaryField(normalized, 'speech')
}

function structuredSameHerSummaryMatchesSegment(summary: string | null | undefined, activeSegmentId: string | null | undefined) {
  const structuredSegmentId = extractStructuredSameHerSegmentId(summary)
  return matchesScopedSegment(structuredSegmentId, activeSegmentId)
}

function resolveMatchedDriversFromSameHerSummary(input: {
  activeSegmentId: string | null
  authoritySegmentId?: string | null
  performanceSegmentId?: string | null
  speechSegmentId?: string | null
  summary: string | null | undefined
}) {
  const normalized = normalizeText(input.summary)
  if (!normalized)
    return []

  if (!matchesScopedSegment(input.authoritySegmentId, input.activeSegmentId))
    return []
  if (!matchesScopedSegment(input.performanceSegmentId, input.activeSegmentId))
    return []
  if (!matchesScopedSegment(input.speechSegmentId, input.activeSegmentId))
    return []
  if (!structuredSameHerSummaryMatchesSegment(normalized, input.activeSegmentId))
    return []

  const activeDrivers = parseDriverList(extractSummaryField(normalized, 'active'))
  const mismatchDrivers = new Set(parseDriverList(extractSummaryField(normalized, 'mismatch')))
  const matchedActiveDrivers = activeDrivers.filter(driver => !mismatchDrivers.has(driver))
  if (matchedActiveDrivers.length > 0)
    return matchedActiveDrivers

  const closure = extractSummaryField(normalized, 'closure')
  if (closure === 'full-cross-modal-lock')
    return ['body', 'face', 'motion', 'lipsync', 'voice'] satisfies ContinuityDriver[]
  if (closure === 'audible-body-carry')
    return ['body', 'lipsync', 'voice'] satisfies ContinuityDriver[]
  if (closure === 'voice-lipsync-carry')
    return ['lipsync', 'voice'] satisfies ContinuityDriver[]
  if (closure === 'body-only-hold')
    return ['body'] satisfies ContinuityDriver[]
  if (closure === 'renderer-rejoin-without-body')
    return parseLaneDrivers(extractSummaryField(normalized, 'lane'))

  return parseLaneDrivers(extractSummaryField(normalized, 'lane'))
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
  const sameHerMatchedDrivers = resolveMatchedDriversFromSameHerSummary({
    activeSegmentId,
    performanceSegmentId: authorityView.sameHerFramePerformanceSegmentId,
    speechSegmentId: authorityView.sameHerFrameSpeechSegmentId,
    summary: authorityView.sameHerFrameSummary,
  })
  const sameHerExecutionMatchedDrivers = resolveMatchedDriversFromSameHerSummary({
    activeSegmentId,
    authoritySegmentId: authorityView.sameHerExecutionAuthoritySegmentId,
    summary: authorityView.sameHerExecutionSummary,
  })
  const fallbackMatchedDrivers = sameHerMatchedDrivers.length > 0
    ? sameHerMatchedDrivers
    : sameHerExecutionMatchedDrivers
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
