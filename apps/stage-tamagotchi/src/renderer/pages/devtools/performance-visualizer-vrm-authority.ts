import { resolveDriverAuthorityAlignment } from './performance-visualizer-driver-authority'

export interface PerformanceVisualizerVrmAuthorityComparisonView {
  cueId: string
  plannedExpressionAliases: string[]
  consumedExpressionAliases: string[]
  expressionAligned: boolean | null
  plannedMotionAliases: string[]
  consumedMotionAliases: string[]
  motionAligned: boolean | null
  plannedFaceCue: string | null
  consumedFaceCue: string | null
  faceSource: string | null
  faceSegmentAligned: boolean | null
  plannedActionCue: string | null
  consumedActionCue: string | null
  motionSource: string | null
  motionSegmentAligned: boolean | null
  consumedLipsyncCue: string | null
  lipsyncSource: string | null
  lipsyncConfidence: number | null
  lipsyncSegmentAligned: boolean | null
  consumedVoiceSummary?: string | null
  voiceSource?: string | null
  voiceSegmentAligned?: boolean | null
  plannedVrmActionFadeMs: number | null
  consumedVrmActionFadeMs: number | null
  vrmActionFadeAligned: boolean | null
  plannedVrmExpressionBlendMs: number | null
  consumedVrmExpressionBlendMs: number | null
  vrmExpressionBlendAligned: boolean | null
  sameHerFrameAligned?: boolean | null
  sameHerFrameMismatchDrivers?: string[]
  sameHerFramePerformanceSegmentId?: string | null
  sameHerFrameSpeechSegmentId?: string | null
  sameHerFrameSummary?: string | null
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

function extractStructuredField(
  summary: string | null,
  field: 'segment' | 'source',
) {
  if (!summary)
    return null

  const match = summary.match(new RegExp(`(?:^|\\s|\\|)${field}=([^|\\s]+)`))
  return normalizeText(match?.[1])
}

function resolveSetAlignment(planned: string[], consumed: string[]) {
  if (planned.length === 0 && consumed.length === 0)
    return null
  if (planned.length !== consumed.length)
    return false

  const left = [...planned].map(item => item.toLowerCase()).sort()
  const right = [...consumed].map(item => item.toLowerCase()).sort()
  return left.every((item, index) => item === right[index])
}

function resolveAliasContainsAlignment(planned: string[], consumed: string[]) {
  if (planned.length === 0 && consumed.length === 0)
    return null
  if (planned.length === 0 || consumed.length === 0)
    return false

  const normalizedConsumed = new Set(consumed.map(item => item.toLowerCase()))
  return planned.some(item => normalizedConsumed.has(item.toLowerCase()))
}

function resolveNumberAlignment(left: number | null, right: number | null) {
  if (left == null && right == null)
    return null
  if (left == null || right == null)
    return false

  return left === right
}

export function buildVrmAuthorityComparisonView(snapshot: {
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
    playbackTelemetry?: {
      driverAuthority?: {
        faceSegmentMatched?: boolean | null
        motionSegmentMatched?: boolean | null
        lipsyncSegmentMatched?: boolean | null
        voiceSegmentMatched?: boolean | null
      } | null
      cue?: {
        id?: string | null
        facialCue?: string | null
        actionCue?: string | null
        rendererHints?: {
          preferredExpressionAliases?: string[]
          preferredMotionAliases?: string[]
        } | null
        rendererSettle?: {
          vrmActionFadeMs?: number | null
          vrmExpressionBlendMs?: number | null
        } | null
      } | null
    } | null
  } | null
  vrmUpdate?: {
    activeEmotion?: {
      segmentId?: string | null
    } | null
    activeFacialCue?: {
      segmentId?: string | null
    } | null
    lastConsumedExpressionAliases?: string[]
    lastConsumedMotionAliases?: string[]
    lastConsumedVrmActionFadeMs?: number | null
    lastConsumedVrmExpressionBlendMs?: number | null
    embodimentSegmentAligned?: boolean | null
    embodimentSegmentMismatchDrivers?: string[] | null
    performanceSegmentId?: string | null
    sameHerFrameSummary?: string | null
    speechSegmentId?: string | null
  } | null
} | null | undefined): PerformanceVisualizerVrmAuthorityComparisonView | null {
  const plannedCue = snapshot?.speech?.playbackTelemetry?.cue
  const driverSummary = snapshot?.speech?.driverSummary
  const vrmUpdate = snapshot?.vrmUpdate

  const cueId = normalizeText(plannedCue?.id)
  const plannedExpressionAliases = normalizeAliasList(plannedCue?.rendererHints?.preferredExpressionAliases)
  const consumedExpressionAliases = normalizeAliasList(vrmUpdate?.lastConsumedExpressionAliases)
  const plannedMotionAliases = normalizeAliasList(plannedCue?.rendererHints?.preferredMotionAliases)
  const consumedMotionAliases = normalizeAliasList(vrmUpdate?.lastConsumedMotionAliases)
  const plannedFaceCue = normalizeText(plannedCue?.facialCue)
  const consumedFaceCue = normalizeText(driverSummary?.face?.cue)
  const faceSource = normalizeText(driverSummary?.face?.source)
  const faceSegmentId = normalizeText(driverSummary?.face?.segmentId)
    ?? normalizeText(vrmUpdate?.activeFacialCue?.segmentId)
    ?? normalizeText(vrmUpdate?.activeEmotion?.segmentId)
  const plannedActionCue = normalizeText(plannedCue?.actionCue)
  const consumedActionCue = normalizeText(driverSummary?.motion?.cue)
  const motionSource = normalizeText(driverSummary?.motion?.source)
  const motionSegmentId = normalizeText(driverSummary?.motion?.segmentId)
  const consumedLipsyncCue = normalizeText(driverSummary?.lipsync?.cue)
  const lipsyncSource = normalizeText(driverSummary?.lipsync?.source)
  const lipsyncConfidence = normalizeNumber(driverSummary?.lipsync?.confidence)
  const lipsyncSegmentId = normalizeText(driverSummary?.lipsync?.segmentId)
  const consumedVoiceSummary = normalizeText(snapshot?.speech?.speechEvidence?.voiceSummary)
    ?? normalizeText(driverSummary?.voice)
  const voiceSource = extractStructuredField(consumedVoiceSummary, 'source')
  const voiceSegmentId = extractStructuredField(consumedVoiceSummary, 'segment')
  const authority = snapshot?.speech?.playbackTelemetry?.driverAuthority
  const plannedVrmActionFadeMs = normalizeNumber(plannedCue?.rendererSettle?.vrmActionFadeMs)
  const consumedVrmActionFadeMs = normalizeNumber(vrmUpdate?.lastConsumedVrmActionFadeMs)
  const plannedVrmExpressionBlendMs = normalizeNumber(plannedCue?.rendererSettle?.vrmExpressionBlendMs)
  const consumedVrmExpressionBlendMs = normalizeNumber(vrmUpdate?.lastConsumedVrmExpressionBlendMs)
  const sameHerFrameSummary = normalizeText(vrmUpdate?.sameHerFrameSummary)
  const sameHerFramePerformanceSegmentId = normalizeText(vrmUpdate?.performanceSegmentId)
  const sameHerFrameSpeechSegmentId = normalizeText(vrmUpdate?.speechSegmentId)
  const sameHerFrameMismatchDrivers = normalizeAliasList(vrmUpdate?.embodimentSegmentMismatchDrivers)
  const hasSameHerFrameEvidence = sameHerFrameSummary != null
    || typeof vrmUpdate?.embodimentSegmentAligned === 'boolean'
    || sameHerFramePerformanceSegmentId != null
    || sameHerFrameSpeechSegmentId != null
    || sameHerFrameMismatchDrivers.length > 0

  const hasSignal = cueId
    || plannedExpressionAliases.length > 0
    || consumedExpressionAliases.length > 0
    || plannedMotionAliases.length > 0
    || consumedMotionAliases.length > 0
    || plannedFaceCue
    || consumedFaceCue
    || plannedActionCue
    || consumedActionCue
    || consumedLipsyncCue
    || consumedVoiceSummary
    || plannedVrmActionFadeMs != null
    || consumedVrmActionFadeMs != null
    || plannedVrmExpressionBlendMs != null
    || consumedVrmExpressionBlendMs != null
    || hasSameHerFrameEvidence

  if (!hasSignal)
    return null

  const hasFaceAuthoritySignal = plannedFaceCue != null || consumedFaceCue != null || faceSource != null || typeof authority?.faceSegmentMatched === 'boolean'
  const hasMotionAuthoritySignal = plannedActionCue != null || consumedActionCue != null || motionSource != null || typeof authority?.motionSegmentMatched === 'boolean'
  const hasLipsyncAuthoritySignal = consumedLipsyncCue != null || lipsyncSource != null || (lipsyncConfidence ?? 0) > 0 || typeof authority?.lipsyncSegmentMatched === 'boolean'
  const hasVoiceAuthoritySignal = consumedVoiceSummary != null || voiceSource != null || typeof authority?.voiceSegmentMatched === 'boolean'

  return {
    cueId: cueId ?? 'n/a',
    plannedExpressionAliases,
    consumedExpressionAliases,
    expressionAligned: (() => {
      const exactAlignment = resolveSetAlignment(plannedExpressionAliases, consumedExpressionAliases)
      return exactAlignment === true
        ? true
        : resolveAliasContainsAlignment(plannedExpressionAliases, consumedExpressionAliases)
    })(),
    plannedMotionAliases,
    consumedMotionAliases,
    motionAligned: resolveSetAlignment(plannedMotionAliases, consumedMotionAliases),
    plannedFaceCue,
    consumedFaceCue,
    faceSource,
    faceSegmentAligned: hasFaceAuthoritySignal
      ? resolveDriverAuthorityAlignment(authority?.faceSegmentMatched, cueId, faceSegmentId)
      : null,
    plannedActionCue,
    consumedActionCue,
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
    consumedVoiceSummary,
    voiceSource,
    voiceSegmentAligned: hasVoiceAuthoritySignal
      ? resolveDriverAuthorityAlignment(authority?.voiceSegmentMatched, cueId, voiceSegmentId)
      : null,
    plannedVrmActionFadeMs,
    consumedVrmActionFadeMs,
    vrmActionFadeAligned: resolveNumberAlignment(plannedVrmActionFadeMs, consumedVrmActionFadeMs),
    plannedVrmExpressionBlendMs,
    consumedVrmExpressionBlendMs,
    vrmExpressionBlendAligned: resolveNumberAlignment(plannedVrmExpressionBlendMs, consumedVrmExpressionBlendMs),
    ...(hasSameHerFrameEvidence
      ? {
          sameHerFrameAligned: vrmUpdate?.embodimentSegmentAligned ?? null,
          sameHerFrameMismatchDrivers,
          sameHerFramePerformanceSegmentId,
          sameHerFrameSpeechSegmentId,
          sameHerFrameSummary,
        }
      : {}),
  }
}
