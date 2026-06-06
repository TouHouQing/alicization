import type { AlicizationEmbodimentScriptV1 } from '@proj-alicization/stage-shared'
import type { AlicizationDialogueSpeechTimelineSegment } from '@proj-alicization/stage-shared'

export interface EmbodimentPlaybackFaceDriverTelemetry {
  emotion: AlicizationEmbodimentScriptV1['state']['baseEmotion']
  facialCue: string | null
  intensity: number
  holdMs: number
  source: AlicizationEmbodimentScriptV1['facePlan']['speakingCues'][number]['source'] | null
  confidence: number
  preUtteranceCue: string | null
  postUtteranceCue: string | null
  segmentId: string | null
}

export interface EmbodimentPlaybackLipSyncDriverTelemetry {
  mode: AlicizationEmbodimentScriptV1['lipsyncPlan']['mode']
  playbackPhase: 'idle' | 'playing'
  segmentId: string | null
  continuityHoldMs: number
  visemeHints: NonNullable<AlicizationEmbodimentScriptV1['lipsyncPlan']['visemeHints']>
}

export interface EmbodimentPlaybackMotionDriverTelemetry {
  idleBase: string
  attentionMode: AlicizationEmbodimentScriptV1['motionPlan']['attentionMode']
  actionCue: string | null
  intensity: number
  holdMs: number
  source: AlicizationEmbodimentScriptV1['motionPlan']['actionBursts'][number]['source'] | null
  confidence: number
  segmentId: string | null
}

export interface EmbodimentPlaybackBodyDriverTelemetry {
  frameMode: string | null
  stillness: number | null
  gazeStability: number | null
  breathAmplitude: number | null
  expressivity: number | null
  segmentId: string | null
}

export interface EmbodimentPlaybackDriverTelemetry {
  body: EmbodimentPlaybackBodyDriverTelemetry | null
  face: EmbodimentPlaybackFaceDriverTelemetry | null
  lipsync: EmbodimentPlaybackLipSyncDriverTelemetry | null
  motion: EmbodimentPlaybackMotionDriverTelemetry | null
}

export interface EmbodimentPlaybackDriverAuthorityTelemetry {
  segmentId: string | null
  rendererTarget: AlicizationEmbodimentScriptV1['rendererTarget'] | null
  matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  sources: string[]
  bodySegmentMatched: boolean
  faceSegmentMatched: boolean
  motionSegmentMatched: boolean
  lipsyncSegmentMatched: boolean
  voiceSegmentMatched?: boolean
  prosodyAuthority?: EmbodimentPlaybackProsodyAuthorityTelemetry | null
}

export interface EmbodimentPlaybackProsodyAuthorityTelemetry {
  segmentId: string | null
  provenance: 'authority-bound' | 'fallback-derived'
  source: string | null
  mode: AlicizationEmbodimentScriptV1['lipsyncPlan']['mode'] | null
  cueProsodyWeight: number | null
  cueMouthWeight: number | null
  cueHeadWeight: number | null
  visemePeakWeight: number | null
}

export interface ReconcileEmbodimentPlaybackInput {
  actualDurationMs: number | null | undefined
  plannedDurationMs: number | null | undefined
  script: AlicizationEmbodimentScriptV1 | null | undefined
  stopReason: string | null | undefined
}

export interface EmbodimentPlaybackReconciliation {
  actualDurationMs: number
  driftMs: number
  plannedDurationMs: number
  settleMs: number
  stopReason: string | null
  rendererTarget?: AlicizationEmbodimentScriptV1['rendererTarget'] | null
}

export interface EmbodimentPlaybackTelemetry extends EmbodimentPlaybackReconciliation {
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  drivers: EmbodimentPlaybackDriverTelemetry
  driverAuthority?: EmbodimentPlaybackDriverAuthorityTelemetry | null
  prosodyAuthority?: EmbodimentPlaybackProsodyAuthorityTelemetry | null
}

function normalizePlaybackDriverAuthoritySegmentId(segmentId: string | null | undefined) {
  const normalized = segmentId?.trim()
  return normalized || null
}

function resolveLipsyncHintSegmentId(
  lipsync: EmbodimentPlaybackDriverTelemetry['lipsync'],
) {
  if (!lipsync)
    return null

  const hintSegmentIds = [...new Set(
    lipsync.visemeHints
      .map(hint => normalizePlaybackDriverAuthoritySegmentId(hint.segmentId))
      .filter((segmentId): segmentId is string => Boolean(segmentId)),
  )]

  return hintSegmentIds.length === 1
    ? hintSegmentIds[0]
    : null
}

function matchesPlaybackDriverAuthoritySegment(
  driverSegmentId: string | null | undefined,
  activeSegmentId: string | null | undefined,
) {
  const normalizedDriverSegmentId = normalizePlaybackDriverAuthoritySegmentId(driverSegmentId)
  const normalizedActiveSegmentId = normalizePlaybackDriverAuthoritySegmentId(activeSegmentId)
  if (!normalizedActiveSegmentId)
    return true
  if (!normalizedDriverSegmentId)
    return false
  return normalizedDriverSegmentId === normalizedActiveSegmentId
}

function hasFaceAuthoritySignal(driver: EmbodimentPlaybackDriverTelemetry['face']) {
  if (!driver)
    return false

  return Boolean(
    (typeof driver.intensity === 'number' && driver.intensity > 0)
    || (typeof driver.holdMs === 'number' && driver.holdMs > 0)
    || (typeof driver.confidence === 'number' && driver.confidence > 0)
    || driver.source,
  )
}

function hasMotionAuthoritySignal(driver: EmbodimentPlaybackDriverTelemetry['motion']) {
  if (!driver)
    return false

  return Boolean(
    (typeof driver.intensity === 'number' && driver.intensity > 0)
    || (typeof driver.holdMs === 'number' && driver.holdMs > 0)
    || (typeof driver.confidence === 'number' && driver.confidence > 0)
    || driver.source
    || driver.actionCue
  )
}

function hasLipsyncAuthoritySignal(driver: EmbodimentPlaybackDriverTelemetry['lipsync']) {
  if (!driver)
    return false

  return driver.playbackPhase === 'playing'
    || (
      driver.continuityHoldMs > 0
      && Boolean(normalizePlaybackDriverAuthoritySegmentId(
        driver.segmentId
        ?? resolveLipsyncHintSegmentId(driver),
      ))
    )
    || driver.visemeHints.length > 0
}

function hasLipsyncPlaybackOrContinuityHold(driver: EmbodimentPlaybackDriverTelemetry['lipsync']) {
  if (!driver)
    return false

  return driver.playbackPhase === 'playing'
    || driver.continuityHoldMs > 0
}

export function resolveEmbodimentPlaybackDriverAuthority(input: {
  drivers: EmbodimentPlaybackDriverTelemetry
  rendererTarget?: AlicizationEmbodimentScriptV1['rendererTarget'] | null | undefined
  segmentId?: string | null | undefined
  prosodyAuthority?: EmbodimentPlaybackProsodyAuthorityTelemetry | null | undefined
}): EmbodimentPlaybackDriverAuthorityTelemetry | null {
  const explicitSegmentId = normalizePlaybackDriverAuthoritySegmentId(input.segmentId)
  const prosodySegmentId = normalizePlaybackDriverAuthoritySegmentId(input.prosodyAuthority?.segmentId)
  const lipsyncSegmentId = normalizePlaybackDriverAuthoritySegmentId(
    input.drivers.lipsync?.segmentId
    ?? resolveLipsyncHintSegmentId(input.drivers.lipsync),
  )
  const bodySegmentId = normalizePlaybackDriverAuthoritySegmentId(input.drivers.body?.segmentId)
  const faceSegmentId = normalizePlaybackDriverAuthoritySegmentId(input.drivers.face?.segmentId)
  const motionSegmentId = normalizePlaybackDriverAuthoritySegmentId(input.drivers.motion?.segmentId)
  const shouldPreferProsodySegment = Boolean(
    explicitSegmentId
    && prosodySegmentId
    && prosodySegmentId !== explicitSegmentId
    && (
      bodySegmentId === prosodySegmentId
      || 
      lipsyncSegmentId === prosodySegmentId
      || faceSegmentId === prosodySegmentId
      || motionSegmentId === prosodySegmentId
    ),
  )
  const shouldPreferActiveLipsyncSegment = Boolean(
    !explicitSegmentId
    && !prosodySegmentId
    && lipsyncSegmentId
    && input.drivers.lipsync?.playbackPhase === 'playing'
    && input.drivers.face?.segmentId
    && input.drivers.face.segmentId !== lipsyncSegmentId
    && input.drivers.motion?.segmentId
    && input.drivers.motion.segmentId !== lipsyncSegmentId,
  )
  const shouldPreferBodyLipsyncLivingLineOverExplicitShell = Boolean(
    explicitSegmentId
    && !prosodySegmentId
    && bodySegmentId
    && lipsyncSegmentId
    && bodySegmentId === lipsyncSegmentId
    && bodySegmentId !== explicitSegmentId
    && hasLipsyncPlaybackOrContinuityHold(input.drivers.lipsync)
    && (
      faceSegmentId === explicitSegmentId
      || motionSegmentId === explicitSegmentId
      || (!faceSegmentId && !motionSegmentId)
    ),
  )
  const shouldPreferAudibleBodySegment = Boolean(
    !explicitSegmentId
    && prosodySegmentId
    && bodySegmentId
    && lipsyncSegmentId
    && prosodySegmentId === bodySegmentId
    && prosodySegmentId === lipsyncSegmentId
    && input.drivers.lipsync?.playbackPhase === 'playing'
    && (
      (input.drivers.face?.segmentId && input.drivers.face.segmentId !== prosodySegmentId)
      || (input.drivers.motion?.segmentId && input.drivers.motion.segmentId !== prosodySegmentId)
    ),
  )
  const segmentId = normalizePlaybackDriverAuthoritySegmentId(
    (shouldPreferProsodySegment ? prosodySegmentId : null)
    ?? (shouldPreferBodyLipsyncLivingLineOverExplicitShell ? bodySegmentId : null)
    ?? (shouldPreferAudibleBodySegment ? prosodySegmentId : null)
    ?? explicitSegmentId
    ?? prosodySegmentId
    ?? (shouldPreferActiveLipsyncSegment ? lipsyncSegmentId : null)
    ?? bodySegmentId
    ?? input.drivers.face?.segmentId
    ?? input.drivers.motion?.segmentId
    ?? lipsyncSegmentId,
  )
  const matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'> = []
  const sources: string[] = []
  const seenSources = new Set<string>()

  function pushSource(source: string | null | undefined) {
    const normalized = source?.trim() || ''
    if (!normalized || seenSources.has(normalized))
      return
    seenSources.add(normalized)
    sources.push(normalized)
  }

  const bodySegmentMatched = matchesPlaybackDriverAuthoritySegment(bodySegmentId, segmentId)
    && Boolean(input.drivers.body)
  if (bodySegmentMatched)
    matchedDrivers.push('body')

  const faceSegmentMatched = matchesPlaybackDriverAuthoritySegment(input.drivers.face?.segmentId, segmentId)
    && hasFaceAuthoritySignal(input.drivers.face)
  if (faceSegmentMatched) {
    matchedDrivers.push('face')
    pushSource(input.drivers.face?.source)
  }

  const motionSegmentMatched = matchesPlaybackDriverAuthoritySegment(input.drivers.motion?.segmentId, segmentId)
    && hasMotionAuthoritySignal(input.drivers.motion)
  if (motionSegmentMatched) {
    matchedDrivers.push('motion')
    pushSource(input.drivers.motion?.source)
  }

  const lipsyncSegmentMatched = matchesPlaybackDriverAuthoritySegment(lipsyncSegmentId, segmentId)
    && hasLipsyncAuthoritySignal(input.drivers.lipsync)
  if (lipsyncSegmentMatched) {
    matchedDrivers.push('lipsync')
    for (const source of new Set(
      input.drivers.lipsync?.visemeHints
        .map(hint => hint.source?.trim() || '')
        .filter(Boolean) ?? [],
    )) {
      pushSource(source)
    }
  }

  const prosodySegmentMatched = Boolean(prosodySegmentId)
    && matchesPlaybackDriverAuthoritySegment(prosodySegmentId, segmentId)
  if (prosodySegmentMatched) {
    matchedDrivers.push('voice')
    pushSource(input.prosodyAuthority?.source)
  }

  if (!segmentId && matchedDrivers.length === 0 && !input.rendererTarget)
    return null

  return {
    segmentId,
    rendererTarget: input.rendererTarget ?? null,
    matchedDrivers,
    sources,
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched: prosodySegmentMatched,
    prosodyAuthority: input.prosodyAuthority ?? null,
  }
}

export function cloneEmbodimentPlaybackTelemetry(
  metadata: EmbodimentPlaybackTelemetry | null | undefined,
): EmbodimentPlaybackTelemetry | null {
  if (!metadata)
    return null

  return {
    actualDurationMs: metadata.actualDurationMs,
    driftMs: metadata.driftMs,
    plannedDurationMs: metadata.plannedDurationMs,
    settleMs: metadata.settleMs,
    stopReason: metadata.stopReason,
    rendererTarget: metadata.rendererTarget ?? null,
    driverAuthority: metadata.driverAuthority
      ? {
          segmentId: metadata.driverAuthority.segmentId ?? null,
          rendererTarget: metadata.driverAuthority.rendererTarget ?? null,
          matchedDrivers: [...metadata.driverAuthority.matchedDrivers],
          sources: [...metadata.driverAuthority.sources],
          bodySegmentMatched: metadata.driverAuthority.bodySegmentMatched,
          faceSegmentMatched: metadata.driverAuthority.faceSegmentMatched,
          motionSegmentMatched: metadata.driverAuthority.motionSegmentMatched,
          lipsyncSegmentMatched: metadata.driverAuthority.lipsyncSegmentMatched,
          voiceSegmentMatched: metadata.driverAuthority.voiceSegmentMatched,
          prosodyAuthority: metadata.driverAuthority.prosodyAuthority
            ? {
                segmentId: metadata.driverAuthority.prosodyAuthority.segmentId ?? null,
                provenance: metadata.driverAuthority.prosodyAuthority.provenance,
                source: metadata.driverAuthority.prosodyAuthority.source ?? null,
                mode: metadata.driverAuthority.prosodyAuthority.mode ?? null,
                cueProsodyWeight: metadata.driverAuthority.prosodyAuthority.cueProsodyWeight ?? null,
                cueMouthWeight: metadata.driverAuthority.prosodyAuthority.cueMouthWeight ?? null,
                cueHeadWeight: metadata.driverAuthority.prosodyAuthority.cueHeadWeight ?? null,
                visemePeakWeight: metadata.driverAuthority.prosodyAuthority.visemePeakWeight ?? null,
              }
            : null,
        }
      : null,
    prosodyAuthority: metadata.prosodyAuthority
      ? {
          segmentId: metadata.prosodyAuthority.segmentId ?? null,
          provenance: metadata.prosodyAuthority.provenance,
          source: metadata.prosodyAuthority.source ?? null,
          mode: metadata.prosodyAuthority.mode ?? null,
          cueProsodyWeight: metadata.prosodyAuthority.cueProsodyWeight ?? null,
          cueMouthWeight: metadata.prosodyAuthority.cueMouthWeight ?? null,
          cueHeadWeight: metadata.prosodyAuthority.cueHeadWeight ?? null,
          visemePeakWeight: metadata.prosodyAuthority.visemePeakWeight ?? null,
        }
      : null,
    cue: metadata.cue
      ? {
          ...metadata.cue,
          rendererSettle: metadata.cue.rendererSettle
            ? { ...metadata.cue.rendererSettle }
            : null,
          rendererHints: metadata.cue.rendererHints
            ? {
                residentMode: metadata.cue.rendererHints.residentMode ?? undefined,
                preferredExpressionAliases: metadata.cue.rendererHints.preferredExpressionAliases
                  ? [...metadata.cue.rendererHints.preferredExpressionAliases]
                  : undefined,
                preferredMotionAliases: metadata.cue.rendererHints.preferredMotionAliases
                  ? [...metadata.cue.rendererHints.preferredMotionAliases]
                  : undefined,
                preferredBlinkCadence: metadata.cue.rendererHints.preferredBlinkCadence ?? undefined,
                preferredGazeMode: metadata.cue.rendererHints.preferredGazeMode ?? undefined,
                reasonTags: metadata.cue.rendererHints.reasonTags
                  ? [...metadata.cue.rendererHints.reasonTags]
                  : undefined,
                signature: metadata.cue.rendererHints.signature ?? undefined,
              }
            : null,
        }
      : null,
    drivers: {
      body: metadata.drivers.body ? { ...metadata.drivers.body } : null,
      face: metadata.drivers.face ? { ...metadata.drivers.face } : null,
      lipsync: metadata.drivers.lipsync
        ? {
            ...metadata.drivers.lipsync,
            continuityHoldMs: metadata.drivers.lipsync.continuityHoldMs,
            visemeHints: [...metadata.drivers.lipsync.visemeHints],
          }
        : null,
      motion: metadata.drivers.motion ? { ...metadata.drivers.motion } : null,
    },
  }
}

function roundPlaybackAuthorityWeight(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Number(Number(value).toFixed(2))
}

function resolvePlaybackProsodyAuthoritySegmentId(input: {
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  authority?: EmbodimentPlaybackDriverAuthorityTelemetry | null
  drivers: EmbodimentPlaybackDriverTelemetry
}) {
  const cueSegmentId = normalizePlaybackDriverAuthoritySegmentId(input.cue?.id)
  const authoritySegmentId = normalizePlaybackDriverAuthoritySegmentId(input.authority?.segmentId)
  const lipsyncSegmentId = normalizePlaybackDriverAuthoritySegmentId(
    input.drivers.lipsync?.segmentId
    ?? resolveLipsyncHintSegmentId(input.drivers.lipsync),
  )
  const faceSegmentId = normalizePlaybackDriverAuthoritySegmentId(input.drivers.face?.segmentId)
  const motionSegmentId = normalizePlaybackDriverAuthoritySegmentId(input.drivers.motion?.segmentId)

  if (
    cueSegmentId
    && (
      cueSegmentId === lipsyncSegmentId
      || cueSegmentId === faceSegmentId
      || cueSegmentId === motionSegmentId
    )
    && cueSegmentId !== authoritySegmentId
  ) {
    return cueSegmentId
  }

  return normalizePlaybackDriverAuthoritySegmentId(
    authoritySegmentId
    ?? cueSegmentId
    ?? input.drivers.lipsync?.segmentId
    ?? input.drivers.face?.segmentId
    ?? input.drivers.motion?.segmentId
    ?? resolveLipsyncHintSegmentId(input.drivers.lipsync),
  )
}

export function resolveEmbodimentPlaybackProsodyAuthority(input: {
  cue?: AlicizationDialogueSpeechTimelineSegment | null | undefined
  driverAuthority?: EmbodimentPlaybackDriverAuthorityTelemetry | null | undefined
  drivers: EmbodimentPlaybackDriverTelemetry
}): EmbodimentPlaybackProsodyAuthorityTelemetry | null {
  const segmentId = resolvePlaybackProsodyAuthoritySegmentId({
    cue: input.cue ?? null,
    authority: input.driverAuthority ?? null,
    drivers: input.drivers,
  })
  const lipsync = input.drivers.lipsync
  const relevantHints = segmentId
    ? (lipsync?.visemeHints ?? []).filter(hint => normalizePlaybackDriverAuthoritySegmentId(hint.segmentId) === segmentId)
    : (lipsync?.visemeHints ?? [])
  const visemePeakWeight = relevantHints.reduce<number | null>((peak, hint) => {
    const nextWeight = roundPlaybackAuthorityWeight(hint.weight)
    if (nextWeight == null)
      return peak
    return peak == null ? nextWeight : Math.max(peak, nextWeight)
  }, null)
  const source = (
    relevantHints.find(hint => hint.source?.trim())?.source
    ?? input.drivers.face?.source
    ?? input.drivers.motion?.source
  )?.trim() || null
  const cue = input.cue ?? null
  const hasCueWeights = Number.isFinite(cue?.prosodyWeight)
    || Number.isFinite(cue?.mouthWeight)
    || Number.isFinite(cue?.headWeight)
  const hasDriverSignal = Boolean(lipsync || input.drivers.face || input.drivers.motion)
  if (!segmentId && !hasCueWeights && !hasDriverSignal)
    return null

  return {
    segmentId,
    provenance: input.driverAuthority ? 'authority-bound' : 'fallback-derived',
    source,
    mode: lipsync?.mode ?? null,
    cueProsodyWeight: roundPlaybackAuthorityWeight(cue?.prosodyWeight),
    cueMouthWeight: roundPlaybackAuthorityWeight(cue?.mouthWeight),
    cueHeadWeight: roundPlaybackAuthorityWeight(cue?.headWeight),
    visemePeakWeight,
  }
}

function normalizeDurationMs(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0

  return Math.max(0, Math.round(Number(value)))
}

function shouldExtendSettleWindow(stopReason: string | null | undefined) {
  return stopReason == null || stopReason === 'ended'
}

export function reconcileEmbodimentPlayback(
  input: ReconcileEmbodimentPlaybackInput,
): EmbodimentPlaybackReconciliation {
  const plannedDurationMs = normalizeDurationMs(input.plannedDurationMs)
  const actualDurationMs = normalizeDurationMs(input.actualDurationMs)
  const driftMs = actualDurationMs - plannedDurationMs
  const baseSettleMs = normalizeDurationMs(input.script?.speechPlan.settleMs)
  const settleMs = shouldExtendSettleWindow(input.stopReason)
    ? Math.max(baseSettleMs, baseSettleMs + Math.max(0, driftMs))
    : baseSettleMs

  return {
    actualDurationMs,
    driftMs,
    plannedDurationMs,
    settleMs,
    stopReason: input.stopReason ?? null,
    rendererTarget: input.script?.rendererTarget ?? null,
  }
}
