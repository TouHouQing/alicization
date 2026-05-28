import { resolveDriverAuthorityAlignment } from './performance-visualizer-driver-authority'

export interface PerformanceVisualizerLive2DAuthorityComparisonView {
  cueId: string
  plannedExpressionAliases: string[]
  plannedMotionAliases: string[]
  consumedExpressionName: string | null
  consumedMotionGroup: string | null
  expressionAligned: boolean | null
  motionAligned: boolean | null
  plannedFaceCue: string | null
  consumedFaceCue: string | null
  faceSource: string | null
  faceSegmentAligned: boolean | null
  plannedMotionCue: string | null
  consumedMotionCue: string | null
  motionSource: string | null
  motionSegmentAligned: boolean | null
  consumedLipsyncCue: string | null
  lipsyncSource: string | null
  lipsyncConfidence: number | null
  lipsyncSegmentAligned: boolean | null
  plannedLive2dFacialReleaseMs: number | null
  consumedLive2dFacialReleaseMs: number | null
  facialReleaseAligned: boolean | null
  plannedLive2dMotionFollowThroughMs: number | null
  consumedLive2dMotionFollowThroughMs: number | null
  motionFollowThroughAligned: boolean | null
}

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
        faceSegmentMatched?: boolean | null
        motionSegmentMatched?: boolean | null
        lipsyncSegmentMatched?: boolean | null
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
  const faceSource = normalizeText(snapshot?.speech?.driverSummary?.face?.source)
  const motionSource = normalizeText(snapshot?.speech?.driverSummary?.motion?.source)
  const lipsyncSource = normalizeText(snapshot?.speech?.driverSummary?.lipsync?.source)
  const lipsyncConfidence = normalizeNumber(snapshot?.speech?.driverSummary?.lipsync?.confidence)
  const faceSegmentId = normalizeText(snapshot?.speech?.driverSummary?.face?.segmentId)
    ?? normalizeText(consumed?.activeExpression?.segmentId)
  const motionSegmentId = normalizeText(snapshot?.speech?.driverSummary?.motion?.segmentId)
    ?? normalizeText(consumed?.activeMotion?.segmentId)
  const lipsyncSegmentId = normalizeText(snapshot?.speech?.driverSummary?.lipsync?.segmentId)
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
    || plannedLive2dFacialReleaseMs != null
    || consumedLive2dFacialReleaseMs != null
    || plannedLive2dMotionFollowThroughMs != null
    || consumedLive2dMotionFollowThroughMs != null

  if (!hasSignal)
    return null

  const hasFaceAuthoritySignal = plannedFaceCue != null || consumedFaceCue != null || faceSource != null || faceSegmentId != null || typeof authority?.faceSegmentMatched === 'boolean'
  const hasMotionAuthoritySignal = consumedMotionCue != null || motionSource != null || motionSegmentId != null || typeof authority?.motionSegmentMatched === 'boolean'
  const hasLipsyncAuthoritySignal = consumedLipsyncCue != null || lipsyncSource != null || lipsyncSegmentId != null || typeof authority?.lipsyncSegmentMatched === 'boolean'

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
    faceSegmentAligned: hasFaceAuthoritySignal
      ? resolveDriverAuthorityAlignment(authority?.faceSegmentMatched, cueId, faceSegmentId)
      : null,
    plannedMotionCue,
    consumedMotionCue,
    motionSource,
    motionSegmentAligned: hasMotionAuthoritySignal
      ? resolveDriverAuthorityAlignment(authority?.motionSegmentMatched, cueId, motionSegmentId)
      : null,
    consumedLipsyncCue,
    lipsyncSource,
    lipsyncConfidence,
    lipsyncSegmentAligned: hasLipsyncAuthoritySignal
      ? resolveDriverAuthorityAlignment(authority?.lipsyncSegmentMatched, cueId, lipsyncSegmentId)
      : null,
    plannedLive2dFacialReleaseMs,
    consumedLive2dFacialReleaseMs,
    facialReleaseAligned: resolveNumberAlignment(plannedLive2dFacialReleaseMs, consumedLive2dFacialReleaseMs),
    plannedLive2dMotionFollowThroughMs,
    consumedLive2dMotionFollowThroughMs,
    motionFollowThroughAligned: resolveNumberAlignment(
      plannedLive2dMotionFollowThroughMs,
      consumedLive2dMotionFollowThroughMs,
    ),
  }
}
