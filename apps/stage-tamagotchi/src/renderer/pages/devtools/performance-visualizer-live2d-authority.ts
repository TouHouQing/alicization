import { resolveDriverAuthorityAlignment } from './performance-visualizer-driver-authority'

export interface PerformanceVisualizerLive2DAuthorityComparisonView {
  cueId: string
  plannedExpressionAliases: string[]
  plannedMotionAliases: string[]
  consumedExpressionAliases?: string[]
  consumedMotionAliases?: string[]
  consumedExpressionName?: string | null
  consumedMotionGroup?: string | null
  expressionAligned: boolean | null
  motionAligned: boolean | null
  plannedFaceCue: string | null
  consumedFaceCue: string | null
  faceSource: string | null
  faceSegmentAligned: boolean | null
  plannedActionCue?: string | null
  consumedActionCue?: string | null
  plannedMotionCue?: string | null
  consumedMotionCue?: string | null
  motionSource: string | null
  motionSegmentAligned: boolean | null
  consumedLipsyncCue: string | null
  lipsyncSource: string | null
  lipsyncConfidence: number | null
  lipsyncSegmentAligned: boolean | null
  consumedVoiceSummary?: string | null
  voiceSource?: string | null
  voiceSegmentAligned?: boolean | null
  plannedLive2dFacialReleaseMs: number | null
  consumedLive2dFacialReleaseMs: number | null
  live2dFacialReleaseAligned?: boolean | null
  facialReleaseAligned?: boolean | null
  plannedLive2dMotionFollowThroughMs: number | null
  consumedLive2dMotionFollowThroughMs: number | null
  live2dMotionFollowThroughAligned?: boolean | null
  motionFollowThroughAligned?: boolean | null
  sameHerExecutionAligned?: boolean | null
  sameHerExecutionAuthoritySegmentId?: string | null
  sameHerExecutionMismatchDrivers?: Array<'face' | 'motion' | 'lipsync' | 'voice'>
  sameHerExecutionSummary?: string | null
}

type Live2DSameHerExecutionDriver = 'face' | 'motion' | 'lipsync' | 'voice'

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function normalizeAliasList(values: unknown) {
  if (!Array.isArray(values))
    return []

  const aliases: string[] = []
  const seen = new Set<string>()
  for (const item of values) {
    const normalized = normalizeText(item)
    if (!normalized)
      continue

    const key = normalized.toLowerCase()
    if (seen.has(key))
      continue

    seen.add(key)
    aliases.push(normalized)
  }

  return aliases
}

function normalizeNumber(value: unknown) {
  return Number.isFinite(value)
    ? Number(value)
    : null
}

function extractStructuredField(
  summary: string | null,
  field: 'segment' | 'source',
) {
  if (!summary)
    return null

  const match = summary.match(new RegExp(`(?:^|\\s|\\|)${field}=([^|\\s]+)`))
  return normalizeText(match?.[1])
}

function resolveAliasAlignment(plannedAliases: string[], consumedValue: string | null) {
  if (plannedAliases.length === 0 && !consumedValue)
    return null
  if (plannedAliases.length === 0 || !consumedValue)
    return false

  return plannedAliases.some(alias => alias.toLowerCase() === consumedValue.toLowerCase())
}

function resolveNumberAlignment(plannedValue: number | null, consumedValue: number | null) {
  if (plannedValue == null && consumedValue == null)
    return null
  if (plannedValue == null || consumedValue == null)
    return false

  return plannedValue === consumedValue
}

function buildSameHerExecutionSummary(input: {
  activeDrivers: Live2DSameHerExecutionDriver[]
  authoritySegmentId: string | null
  mismatchDrivers: Live2DSameHerExecutionDriver[]
}) {
  if (input.activeDrivers.length === 0)
    return null

  const allDrivers: Live2DSameHerExecutionDriver[] = ['face', 'motion', 'lipsync', 'voice']
  const activeSummary = input.activeDrivers.join(', ')
  const mismatchDriverSet = new Set(input.mismatchDrivers)
  const matchedDrivers = input.activeDrivers.filter(driver => !mismatchDriverSet.has(driver))
  const matchedDriverKey = matchedDrivers.join('+')
  const lane = (() => {
    if (matchedDriverKey === 'face+motion+lipsync+voice')
      return 'face+motion+lipsync+voice-only'
    if (matchedDriverKey === 'face+motion+lipsync')
      return 'face+motion+lipsync-only'
    if (matchedDriverKey === 'face+motion')
      return 'face+motion-only'
    if (matchedDriverKey === 'lipsync+voice')
      return 'lipsync+voice-only'
    if (matchedDriverKey === 'face+lipsync')
      return 'face+lipsync-only'
    if (matchedDriverKey === 'motion+lipsync')
      return 'motion+lipsync-only'
    return matchedDrivers.length > 0 ? `${matchedDriverKey}-only` : null
  })()
  const closure = (() => {
    if (matchedDriverKey === 'face+motion+lipsync+voice')
      return 'renderer-rejoin-without-body'
    if (matchedDriverKey === 'lipsync+voice')
      return 'voice-lipsync-carry'
    if (matchedDriverKey === 'face+lipsync' || matchedDriverKey === 'motion+lipsync')
      return 'renderer-rejoin-without-body'
    return null
  })()
  const remainingOpenSummary = allDrivers
    .filter(driver => !matchedDrivers.includes(driver))
    .join('+') || 'none'
  const closureSegments = [
    closure ? `closure=${closure}` : null,
    lane ? `lane=${lane}` : null,
    `remaining-open=${remainingOpenSummary}`,
  ].filter((segment): segment is string => Boolean(segment))

  if (input.mismatchDrivers.length === 0) {
    return [
      'aligned',
      `authority=${input.authoritySegmentId ?? 'n/a'}`,
      `active=${activeSummary}`,
      ...closureSegments,
    ].join(' | ')
  }

  return [
    'drift',
    `authority=${input.authoritySegmentId ?? 'n/a'}`,
    `active=${activeSummary}`,
    `mismatch=${input.mismatchDrivers.join(', ')}`,
    ...closureSegments,
  ].join(' | ')
}

export function buildLive2DAuthorityComparisonView(snapshot: {
  speech?: {
    driverSummary?: {
      face?: {
        cue?: string | null
        source?: string | null
        segmentId?: string | null
      } | null
      motion?: {
        cue?: string | null
        source?: string | null
        segmentId?: string | null
      } | null
      lipsync?: {
        cue?: string | null
        source?: string | null
        confidence?: number | null
        segmentId?: string | null
      } | null
      voice?: string | null
    } | null
    speechEvidence?: {
      voiceSummary?: string | null
    } | null
    live2dExecution?: {
      activeExpression?: {
        name?: string | null
        segmentId?: string | null
      } | null
      activeMotion?: {
        group?: string | null
        segmentId?: string | null
      } | null
      cue?: {
        facialCue?: string | null
        live2dFacialReleaseMs?: number | null
        live2dMotionFollowThroughMs?: number | null
      } | null
    } | null
    playbackTelemetry?: {
      driverAuthority?: {
        segmentId?: string | null
        faceSegmentMatched?: boolean | null
        motionSegmentMatched?: boolean | null
        lipsyncSegmentMatched?: boolean | null
        voiceSegmentMatched?: boolean | null
      } | null
      cue?: {
        id?: string | null
        rendererHints?: {
          preferredExpressionAliases?: string[]
          preferredMotionAliases?: string[]
        } | null
        rendererSettle?: {
          live2dFacialReleaseMs?: number | null
          live2dMotionFollowThroughMs?: number | null
        } | null
      } | null
    } | null
  } | null
} | null | undefined): PerformanceVisualizerLive2DAuthorityComparisonView | null {
  const plannedCue = snapshot?.speech?.playbackTelemetry?.cue
  const consumed = snapshot?.speech?.live2dExecution

  const cueId = normalizeText(plannedCue?.id)
  const plannedExpressionAliases = normalizeAliasList(plannedCue?.rendererHints?.preferredExpressionAliases)
  const plannedMotionAliases = normalizeAliasList(plannedCue?.rendererHints?.preferredMotionAliases)
  const plannedFaceCue = normalizeText(consumed?.cue?.facialCue)
  const plannedMotionCue = plannedMotionAliases[0] ?? null
  const consumedExpressionName = normalizeText(consumed?.activeExpression?.name)
  const consumedMotionGroup = normalizeText(consumed?.activeMotion?.group)
  const consumedFaceCue = normalizeText(snapshot?.speech?.driverSummary?.face?.cue)
  const consumedMotionCue = normalizeText(snapshot?.speech?.driverSummary?.motion?.cue)
  const consumedLipsyncCue = normalizeText(snapshot?.speech?.driverSummary?.lipsync?.cue)
  const consumedVoiceSummary = normalizeText(snapshot?.speech?.speechEvidence?.voiceSummary)
    ?? normalizeText(snapshot?.speech?.driverSummary?.voice)
  const faceSource = normalizeText(snapshot?.speech?.driverSummary?.face?.source)
  const motionSource = normalizeText(snapshot?.speech?.driverSummary?.motion?.source)
  const lipsyncSource = normalizeText(snapshot?.speech?.driverSummary?.lipsync?.source)
  const voiceSource = extractStructuredField(consumedVoiceSummary, 'source')
  const lipsyncConfidence = normalizeNumber(snapshot?.speech?.driverSummary?.lipsync?.confidence)
  const faceSegmentId = normalizeText(snapshot?.speech?.driverSummary?.face?.segmentId)
    ?? normalizeText(consumed?.activeExpression?.segmentId)
  const motionSegmentId = normalizeText(snapshot?.speech?.driverSummary?.motion?.segmentId)
    ?? normalizeText(consumed?.activeMotion?.segmentId)
  const lipsyncSegmentId = normalizeText(snapshot?.speech?.driverSummary?.lipsync?.segmentId)
  const voiceSegmentId = extractStructuredField(consumedVoiceSummary, 'segment')
  const authority = snapshot?.speech?.playbackTelemetry?.driverAuthority
  const plannedLive2dFacialReleaseMs = normalizeNumber(plannedCue?.rendererSettle?.live2dFacialReleaseMs)
  const consumedLive2dFacialReleaseMs = normalizeNumber(consumed?.cue?.live2dFacialReleaseMs)
  const plannedLive2dMotionFollowThroughMs = normalizeNumber(plannedCue?.rendererSettle?.live2dMotionFollowThroughMs)
  const consumedLive2dMotionFollowThroughMs = normalizeNumber(consumed?.cue?.live2dMotionFollowThroughMs)

  const hasSignal = cueId
    || plannedExpressionAliases.length > 0
    || plannedMotionAliases.length > 0
    || plannedFaceCue
    || consumedExpressionName
    || consumedMotionGroup
    || consumedFaceCue
    || consumedMotionCue
    || consumedLipsyncCue
    || consumedVoiceSummary
    || plannedLive2dFacialReleaseMs != null
    || consumedLive2dFacialReleaseMs != null
    || plannedLive2dMotionFollowThroughMs != null
    || consumedLive2dMotionFollowThroughMs != null

  if (!hasSignal)
    return null

  const hasFaceAuthoritySignal = plannedFaceCue != null || consumedFaceCue != null || faceSource != null || typeof authority?.faceSegmentMatched === 'boolean'
  const hasMotionAuthoritySignal = consumedMotionCue != null || motionSource != null || typeof authority?.motionSegmentMatched === 'boolean'
  const hasLipsyncAuthoritySignal = consumedLipsyncCue != null || lipsyncSource != null || (lipsyncConfidence ?? 0) > 0 || typeof authority?.lipsyncSegmentMatched === 'boolean'
  const hasVoiceAuthoritySignal = consumedVoiceSummary != null || voiceSource != null || typeof authority?.voiceSegmentMatched === 'boolean'
  const faceSegmentAligned = hasFaceAuthoritySignal
    ? resolveDriverAuthorityAlignment(authority?.faceSegmentMatched, cueId, faceSegmentId)
    : null
  const motionSegmentAligned = hasMotionAuthoritySignal
    ? resolveDriverAuthorityAlignment(authority?.motionSegmentMatched, cueId, motionSegmentId)
    : null
  const lipsyncSegmentAligned = hasLipsyncAuthoritySignal
    ? resolveDriverAuthorityAlignment(authority?.lipsyncSegmentMatched, cueId, lipsyncSegmentId)
    : null
  const voiceSegmentAligned = hasVoiceAuthoritySignal
    ? resolveDriverAuthorityAlignment(authority?.voiceSegmentMatched, cueId, voiceSegmentId)
    : null
  const sameHerExecutionActiveDrivers = [
    faceSegmentAligned != null ? 'face' : null,
    motionSegmentAligned != null ? 'motion' : null,
    lipsyncSegmentAligned != null ? 'lipsync' : null,
    voiceSegmentAligned != null ? 'voice' : null,
  ].filter((driver): driver is Live2DSameHerExecutionDriver => Boolean(driver))
  const sameHerExecutionMismatchDrivers = [
    faceSegmentAligned === false ? 'face' : null,
    motionSegmentAligned === false ? 'motion' : null,
    lipsyncSegmentAligned === false ? 'lipsync' : null,
    voiceSegmentAligned === false ? 'voice' : null,
  ].filter((driver): driver is Live2DSameHerExecutionDriver => Boolean(driver))
  const sameHerExecutionAligned = sameHerExecutionActiveDrivers.length > 0
    ? sameHerExecutionMismatchDrivers.length === 0
    : null
  const sameHerExecutionAuthoritySegmentId = normalizeText(authority?.segmentId) ?? cueId
  const sameHerExecutionSummary = buildSameHerExecutionSummary({
    activeDrivers: sameHerExecutionActiveDrivers,
    authoritySegmentId: sameHerExecutionAuthoritySegmentId,
    mismatchDrivers: sameHerExecutionMismatchDrivers,
  })
  const hasSameHerExecutionEvidence = sameHerExecutionAligned != null || sameHerExecutionSummary != null

  return {
    cueId: cueId ?? 'n/a',
    plannedExpressionAliases,
    plannedMotionAliases,
    consumedExpressionName,
    consumedMotionGroup,
    expressionAligned: resolveAliasAlignment(plannedExpressionAliases, consumedExpressionName),
    motionAligned: resolveAliasAlignment(plannedMotionAliases, consumedMotionGroup),
    plannedFaceCue,
    consumedFaceCue,
    faceSource,
    faceSegmentAligned,
    plannedMotionCue,
    consumedMotionCue,
    motionSource,
    motionSegmentAligned,
    consumedLipsyncCue,
    lipsyncSource,
    lipsyncConfidence,
    lipsyncSegmentAligned,
    consumedVoiceSummary,
    voiceSource,
    voiceSegmentAligned,
    plannedLive2dFacialReleaseMs,
    consumedLive2dFacialReleaseMs,
    facialReleaseAligned: resolveNumberAlignment(plannedLive2dFacialReleaseMs, consumedLive2dFacialReleaseMs),
    plannedLive2dMotionFollowThroughMs,
    consumedLive2dMotionFollowThroughMs,
    motionFollowThroughAligned: resolveNumberAlignment(
      plannedLive2dMotionFollowThroughMs,
      consumedLive2dMotionFollowThroughMs,
    ),
    ...(hasSameHerExecutionEvidence
      ? {
          sameHerExecutionAligned,
          sameHerExecutionAuthoritySegmentId,
          sameHerExecutionMismatchDrivers,
          sameHerExecutionSummary,
        }
      : {}),
  }
}
