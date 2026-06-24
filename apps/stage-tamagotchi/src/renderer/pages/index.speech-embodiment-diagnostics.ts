import type {
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnEventRecord,
} from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../stores/stage-three-runtime-diagnostics'
import type { TraceEmbodimentDriver } from './devtools/performance-visualizer-trace-embodiment'

import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './devtools/performance-visualizer-prosody-authority'
import {
  buildTraceAuthorityExecutionSummary,
  buildTraceEmbodimentSummary,
  enrichTraceEmbodimentSummary,
} from './devtools/performance-visualizer-trace-embodiment'
import { buildTraceTelemetrySummary } from './devtools/performance-visualizer-trace-telemetry'

type RendererSpeechPlaybackTelemetry = NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['playbackTelemetry']>
type RendererSpeechDriverAuthority = NonNullable<RendererSpeechPlaybackTelemetry['driverAuthority']>
type RendererSpeechProsodyAuthority = NonNullable<RendererSpeechPlaybackTelemetry['prosodyAuthority']>
type RendererSpeechPlaybackCue = NonNullable<RendererSpeechPlaybackTelemetry['cue']>
type RendererSpeechPlaybackDrivers = NonNullable<RendererSpeechPlaybackTelemetry['drivers']>
type RendererSpeechPlaybackBodyDriver = NonNullable<RendererSpeechPlaybackDrivers['body']>
type RendererSpeechPlaybackVoiceDriver = NonNullable<RendererSpeechPlaybackDrivers['voice']>

interface RendererSpeechDriverAuthorityInput {
  segmentId?: RendererSpeechDriverAuthority['segmentId']
  rendererTarget?: RendererSpeechDriverAuthority['rendererTarget']
  matchedDrivers?: RendererSpeechDriverAuthority['matchedDrivers']
  sources?: RendererSpeechDriverAuthority['sources']
  bodySegmentMatched?: RendererSpeechDriverAuthority['bodySegmentMatched']
  faceSegmentMatched?: RendererSpeechDriverAuthority['faceSegmentMatched']
  motionSegmentMatched?: RendererSpeechDriverAuthority['motionSegmentMatched']
  lipsyncSegmentMatched?: RendererSpeechDriverAuthority['lipsyncSegmentMatched']
  voiceSegmentMatched?: RendererSpeechDriverAuthority['voiceSegmentMatched'] | null
  prosodyAuthority?: RendererSpeechDriverAuthority['prosodyAuthority']
}

interface RendererSpeechPlaybackCueInput {
  id?: RendererSpeechPlaybackCue['id']
  text?: RendererSpeechPlaybackCue['text']
  emotion?: RendererSpeechPlaybackCue['emotion']
  prosodyWeight?: RendererSpeechPlaybackCue['prosodyWeight']
  mouthWeight?: RendererSpeechPlaybackCue['mouthWeight']
  headWeight?: RendererSpeechPlaybackCue['headWeight']
  personaStyleSummary?: RendererSpeechPlaybackCue['personaStyleSummary']
  facialHoldMs?: RendererSpeechPlaybackCue['facialHoldMs']
  actionHoldMs?: RendererSpeechPlaybackCue['actionHoldMs']
  emotionHoldMs?: RendererSpeechPlaybackCue['emotionHoldMs']
  facialCue?: RendererSpeechPlaybackCue['facialCue']
  actionCue?: RendererSpeechPlaybackCue['actionCue']
  actionWindow?: RendererSpeechPlaybackCue['actionWindow']
  interruptMode?: RendererSpeechPlaybackCue['interruptMode']
  settleMode?: RendererSpeechPlaybackCue['settleMode']
  rendererHints?: RendererSpeechPlaybackCue['rendererHints']
  rendererSettle?: RendererSpeechPlaybackCue['rendererSettle']
}

interface RendererSpeechPlaybackBodyDriverInput {
  frameMode?: RendererSpeechPlaybackBodyDriver['frameMode']
  stillness?: RendererSpeechPlaybackBodyDriver['stillness']
  gazeStability?: RendererSpeechPlaybackBodyDriver['gazeStability']
  breathAmplitude?: RendererSpeechPlaybackBodyDriver['breathAmplitude']
  expressivity?: RendererSpeechPlaybackBodyDriver['expressivity']
  source?: RendererSpeechPlaybackBodyDriver['source']
  confidence?: RendererSpeechPlaybackBodyDriver['confidence']
  segmentId?: RendererSpeechPlaybackBodyDriver['segmentId']
}

interface RendererSpeechPlaybackDriversInput {
  body?: RendererSpeechPlaybackBodyDriverInput | null
  face?: RendererSpeechPlaybackDrivers['face']
  lipsync?: RendererSpeechPlaybackDrivers['lipsync']
  motion?: RendererSpeechPlaybackDrivers['motion']
  voice?: RendererSpeechPlaybackVoiceDriver | null
}

interface RendererSpeechPlaybackTelemetryInput {
  actualDurationMs?: RendererSpeechPlaybackTelemetry['actualDurationMs']
  plannedDurationMs?: RendererSpeechPlaybackTelemetry['plannedDurationMs']
  driftMs?: RendererSpeechPlaybackTelemetry['driftMs']
  settleMs?: RendererSpeechPlaybackTelemetry['settleMs']
  stopReason?: RendererSpeechPlaybackTelemetry['stopReason']
  rendererTarget?: RendererSpeechPlaybackTelemetry['rendererTarget']
  driverAuthority?: RendererSpeechDriverAuthorityInput | null
  prosodyAuthority?: RendererSpeechPlaybackTelemetry['prosodyAuthority']
  cue?: RendererSpeechPlaybackCueInput | null
  drivers?: RendererSpeechPlaybackDriversInput | null
}

function cloneCue<T>(value: T): T {
  if (!value || typeof value !== 'object')
    return value

  return JSON.parse(JSON.stringify(value)) as T
}

function cloneVisemeHints(value: unknown) {
  if (!Array.isArray(value))
    return []

  return value.map((hint) => {
    const candidate = hint && typeof hint === 'object' && !Array.isArray(hint)
      ? hint as Record<string, unknown>
      : null

    return {
      segmentId: typeof candidate?.segmentId === 'string' ? candidate.segmentId : null,
      viseme: typeof candidate?.viseme === 'string' ? candidate.viseme : null,
      weight: typeof candidate?.weight === 'number' && Number.isFinite(candidate.weight) ? candidate.weight : null,
      source: typeof candidate?.source === 'string' ? candidate.source : null,
      confidence: typeof candidate?.confidence === 'number' && Number.isFinite(candidate.confidence) ? candidate.confidence : null,
    }
  })
}

function normalizeRendererSpeechProsodyAuthority(
  value: RendererSpeechProsodyAuthority | null | undefined,
): RendererSpeechProsodyAuthority | null {
  if (!value)
    return null

  return {
    segmentId: value.segmentId ?? null,
    provenance: value.provenance,
    source: value.source ?? null,
    mode: value.mode ?? null,
    cueProsodyWeight: value.cueProsodyWeight ?? null,
    cueMouthWeight: value.cueMouthWeight ?? null,
    cueHeadWeight: value.cueHeadWeight ?? null,
    visemePeakWeight: value.visemePeakWeight ?? null,
    ...('summary' in value ? { summary: value.summary ?? null } : {}),
  }
}

function normalizeRendererSpeechDriverAuthority(
  value: RendererSpeechDriverAuthorityInput | null | undefined,
): RendererSpeechDriverAuthority | null {
  if (!value)
    return null

  return {
    segmentId: value.segmentId ?? null,
    rendererTarget: value.rendererTarget ?? null,
    matchedDrivers: value.matchedDrivers ? [...value.matchedDrivers] : [],
    sources: value.sources ? [...value.sources] : [],
    bodySegmentMatched: value.bodySegmentMatched ?? null,
    faceSegmentMatched: value.faceSegmentMatched ?? null,
    motionSegmentMatched: value.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: value.lipsyncSegmentMatched ?? null,
    ...(value.voiceSegmentMatched != null
      ? { voiceSegmentMatched: value.voiceSegmentMatched }
      : {}),
    prosodyAuthority: normalizeRendererSpeechProsodyAuthority(value.prosodyAuthority ?? null),
  }
}

function normalizeRendererSpeechPlaybackCue(
  value: RendererSpeechPlaybackCueInput | null | undefined,
): RendererSpeechPlaybackCue | null {
  if (!value)
    return null

  return {
    id: value.id ?? null,
    text: value.text ?? null,
    ...('emotion' in value ? { emotion: value.emotion ?? null } : {}),
    prosodyWeight: value.prosodyWeight ?? null,
    mouthWeight: value.mouthWeight ?? null,
    headWeight: value.headWeight ?? null,
    personaStyleSummary: value.personaStyleSummary ?? null,
    facialHoldMs: value.facialHoldMs ?? null,
    actionHoldMs: value.actionHoldMs ?? null,
    emotionHoldMs: value.emotionHoldMs ?? null,
    facialCue: value.facialCue ?? null,
    actionCue: value.actionCue ?? null,
    actionWindow: value.actionWindow ?? null,
    interruptMode: value.interruptMode ?? null,
    settleMode: value.settleMode ?? null,
    rendererHints: value.rendererHints
      ? {
          residentMode: value.rendererHints.residentMode ?? null,
          preferredBlinkCadence: value.rendererHints.preferredBlinkCadence ?? null,
          preferredExpressionAliases: value.rendererHints.preferredExpressionAliases
            ? [...value.rendererHints.preferredExpressionAliases]
            : undefined,
          preferredGazeMode: value.rendererHints.preferredGazeMode ?? null,
          preferredMotionAliases: value.rendererHints.preferredMotionAliases
            ? [...value.rendererHints.preferredMotionAliases]
            : undefined,
          ...(value.rendererHints.reasonTags?.length
            ? { reasonTags: [...value.rendererHints.reasonTags] }
            : {}),
          ...(value.rendererHints.signature
            ? { signature: value.rendererHints.signature }
            : {}),
        }
      : null,
    rendererSettle: value.rendererSettle
      ? {
          live2dFacialReleaseMs: value.rendererSettle.live2dFacialReleaseMs ?? null,
          live2dMotionFollowThroughMs: value.rendererSettle.live2dMotionFollowThroughMs ?? null,
          vrmActionFadeMs: value.rendererSettle.vrmActionFadeMs ?? null,
          vrmExpressionBlendMs: value.rendererSettle.vrmExpressionBlendMs ?? null,
        }
      : null,
  }
}

function normalizeRendererSpeechPlaybackDrivers(
  value: RendererSpeechPlaybackDriversInput | null | undefined,
): RendererSpeechPlaybackTelemetry['drivers'] {
  if (!value)
    return null

  return {
    ...('body' in value
      ? {
          body: value.body
            ? {
                frameMode: value.body.frameMode ?? null,
                stillness: value.body.stillness ?? null,
                gazeStability: value.body.gazeStability ?? null,
                breathAmplitude: value.body.breathAmplitude ?? null,
                expressivity: value.body.expressivity ?? null,
                source: value.body.source ?? null,
                confidence: value.body.confidence ?? null,
                segmentId: value.body.segmentId ?? null,
              }
            : null,
        }
      : {}),
    face: value.face
      ? {
          emotion: value.face.emotion ?? null,
          facialCue: value.face.facialCue ?? null,
          intensity: value.face.intensity ?? null,
          holdMs: value.face.holdMs ?? null,
          source: value.face.source ?? null,
          confidence: value.face.confidence ?? null,
          preUtteranceCue: value.face.preUtteranceCue ?? null,
          postUtteranceCue: value.face.postUtteranceCue ?? null,
          segmentId: value.face.segmentId ?? null,
        }
      : null,
    lipsync: value.lipsync
      ? {
          mode: value.lipsync.mode ?? null,
          playbackPhase: value.lipsync.playbackPhase ?? null,
          segmentId: value.lipsync.segmentId ?? null,
          continuityHoldMs: typeof value.lipsync.continuityHoldMs === 'number'
            && Number.isFinite(value.lipsync.continuityHoldMs)
            ? value.lipsync.continuityHoldMs
            : null,
          visemeHints: cloneVisemeHints(value.lipsync.visemeHints),
        }
      : null,
    motion: value.motion
      ? {
          idleBase: value.motion.idleBase ?? null,
          attentionMode: value.motion.attentionMode ?? null,
          actionCue: value.motion.actionCue ?? null,
          intensity: value.motion.intensity ?? null,
          holdMs: value.motion.holdMs ?? null,
          source: value.motion.source ?? null,
          confidence: value.motion.confidence ?? null,
          segmentId: value.motion.segmentId ?? null,
        }
      : null,
    ...(Object.prototype.hasOwnProperty.call(value, 'voice')
      ? {
          voice: value.voice
            ? {
                playbackPhase: value.voice.playbackPhase,
                continuityHoldMs: value.voice.continuityHoldMs,
                segmentId: value.voice.segmentId ?? null,
                source: value.voice.source ?? null,
                provenance: value.voice.provenance,
                mode: value.voice.mode ?? null,
                cueProsodyWeight: value.voice.cueProsodyWeight ?? null,
                cueMouthWeight: value.voice.cueMouthWeight ?? null,
                cueHeadWeight: value.voice.cueHeadWeight ?? null,
                visemePeakWeight: value.voice.visemePeakWeight ?? null,
              }
            : null,
        }
      : {}),
  }
}

function normalizeRendererSpeechPlaybackTelemetry(
  value: RendererSpeechPlaybackTelemetryInput | null | undefined,
): RendererSpeechPlaybackTelemetry | null {
  if (!value)
    return null

  return {
    actualDurationMs: value.actualDurationMs ?? null,
    plannedDurationMs: value.plannedDurationMs ?? null,
    driftMs: value.driftMs ?? null,
    settleMs: value.settleMs ?? null,
    stopReason: value.stopReason ?? null,
    rendererTarget: value.rendererTarget ?? null,
    driverAuthority: normalizeRendererSpeechDriverAuthority(value.driverAuthority ?? null),
    ...('prosodyAuthority' in value
      ? { prosodyAuthority: normalizeRendererSpeechProsodyAuthority(value.prosodyAuthority ?? null) }
      : {}),
    cue: normalizeRendererSpeechPlaybackCue(value.cue ?? null),
    drivers: normalizeRendererSpeechPlaybackDrivers(value.drivers ?? null),
  }
}

function normalizeUniqueTextList(values: ReadonlyArray<string | null | undefined> | null | undefined) {
  const unique = new Set<string>()
  for (const value of values ?? []) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized || unique.has(normalized))
      continue
    unique.add(normalized)
  }
  return [...unique]
}

function isTraceEmbodimentDriver(value: string): value is TraceEmbodimentDriver {
  return value === 'body' || value === 'face' || value === 'motion' || value === 'lipsync' || value === 'voice'
}

function filterTraceEmbodimentDrivers(
  values: ReadonlyArray<string> | null | undefined,
): TraceEmbodimentDriver[] {
  return (values ?? []).filter(isTraceEmbodimentDriver)
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function hasSameCueSpeechAuthorityMatch(summary: string | null | undefined) {
  const normalizedSummary = normalizeText(summary)
  if (!normalizedSummary)
    return false

  return normalizedSummary.includes('face:yes')
    && normalizedSummary.includes('motion:yes')
    && normalizedSummary.includes('lipsync:yes')
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return normalizeText(match?.[1])
}

function matchesActiveSegment(segmentId: string | null | undefined, activeSegmentId: string | null) {
  const normalizedSegmentId = normalizeText(segmentId)
  return !activeSegmentId || !normalizedSegmentId || normalizedSegmentId === activeSegmentId
}

function structuredSummaryMatchesActiveSegment(summary: string | null | undefined, activeSegmentId: string | null) {
  const structuredSegmentId = extractStructuredSegmentId(summary)
  return !activeSegmentId || !structuredSegmentId || structuredSegmentId === activeSegmentId
}

function resolvePlaybackCueId(
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined,
) {
  return normalizeText(playbackTelemetry?.cue?.id)
}

function resolvePlaybackActiveSegmentId(
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined,
) {
  const resolvedProsodyAuthority = resolveProsodyAuthorityFromSources(playbackTelemetry)

  return normalizeText(playbackTelemetry?.driverAuthority?.segmentId)
    ?? resolvePlaybackCueId(playbackTelemetry)
    ?? normalizeText(resolvedProsodyAuthority?.segmentId)
    ?? null
}

function resolveAuthoritySummaryPlaybackScope(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  const authoritySummaryCueId = normalizeText(input.authoritySummary?.cueId)
  const authoritySummarySegmentId = normalizeText(input.authoritySummary?.segmentId)
  const playbackCueId = resolvePlaybackCueId(input.playbackTelemetry)
  const activeSegmentId = resolvePlaybackActiveSegmentId(input.playbackTelemetry)
  const authoritySummaryMatchesPlaybackCue = !playbackCueId || !authoritySummaryCueId || authoritySummaryCueId === playbackCueId
  const authoritySummaryMatchesActiveSegment = matchesActiveSegment(authoritySummarySegmentId, activeSegmentId)

  return {
    playbackCueId,
    activeSegmentId,
    authoritySummaryCueId,
    authoritySummarySegmentId,
    authoritySummaryMatchesPlaybackCue,
    authoritySummaryMatchesActiveSegment,
    authoritySummaryMatchesPlaybackScope: authoritySummaryMatchesPlaybackCue && authoritySummaryMatchesActiveSegment,
  }
}

function appendFinalSurfacePolicy(
  value: string | null | undefined,
  finalSurfacePolicy: string | null | undefined,
) {
  const normalizedValue = typeof value === 'string' && value.trim()
    ? value.trim()
    : null
  const normalizedPolicy = typeof finalSurfacePolicy === 'string' && finalSurfacePolicy.trim()
    ? finalSurfacePolicy.trim()
    : null

  if (!normalizedValue || !normalizedPolicy)
    return normalizedValue

  if (normalizedValue.includes(`当前表面策略是 ${normalizedPolicy}`))
    return normalizedValue

  if (normalizedValue.endsWith('。'))
    return `${normalizedValue.slice(0, -1)}；当前表面策略是 ${normalizedPolicy}。`

  return `${normalizedValue}；当前表面策略是 ${normalizedPolicy}`
}

function deriveAuthorityTrustSummary(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  const authoritySummary = input.authoritySummary
  const authoritySegmentId = typeof authoritySummary?.segmentId === 'string' && authoritySummary.segmentId.trim()
    ? authoritySummary.segmentId.trim()
    : null
  const prosodyAuthority = resolveProsodyAuthorityFromSources(input.playbackTelemetry)
  const prosodySegmentId = normalizeText(prosodyAuthority?.segmentId)

  if (!authoritySegmentId || !prosodyAuthority || prosodyAuthority.provenance !== 'authority-bound')
    return null

  if (prosodySegmentId !== authoritySegmentId)
    return null

  return '韵律权威链已重新绑定到当前片段，可直接进入长期基线。'
}

function resolveRendererProsodyAuthority(
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined,
) {
  return resolveProsodyAuthorityFromSources(playbackTelemetry)
}

function buildRendererProsodyAuthoritySummary(
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined,
) {
  return formatResolvedProsodyAuthoritySummary(
    resolveRendererProsodyAuthority(playbackTelemetry),
  )
}

function enrichAuthoritySummaryWithTracePolicy(
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined,
  recentDrivingTraceRecord: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord'] | null | undefined,
) {
  if (!authoritySummary)
    return null

  const finalSurfacePolicy = recentDrivingTraceRecord?.finalSurfacePolicy ?? null
  if (!finalSurfacePolicy)
    return cloneCue(authoritySummary)

  return {
    ...cloneCue(authoritySummary),
    authorityMismatchReasonSummary: appendFinalSurfacePolicy(
      authoritySummary.authorityMismatchReasonSummary,
      finalSurfacePolicy,
    ),
    authorityMismatchDisplay: appendFinalSurfacePolicy(
      authoritySummary.authorityMismatchDisplay,
      finalSurfacePolicy,
    ),
  }
}

function enrichAuthoritySummaryWithTraceEmbodimentSummary(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  recentDrivingTraceRecord: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord'] | null | undefined
  recentDrivingTraceDetails: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceDetails'] | null | undefined
  driverExecutionSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverExecutionSummary'] | null | undefined
}) {
  const authoritySummary = input.authoritySummary
  if (!authoritySummary)
    return null

  const traceRecord = input.recentDrivingTraceRecord
  if (!traceRecord)
    return cloneCue(authoritySummary)

  const localTraceEmbodimentSummary = buildTraceEmbodimentSummary({
    recentDrivingTraceRecord: traceRecord,
    recentDrivingTraceDetails: input.recentDrivingTraceDetails ?? [],
  })
  const authorityExecutionSummary = buildTraceAuthorityExecutionSummary({
    turnMode: traceRecord.turnMode,
    closureState: traceRecord.closureState,
    finalSurfacePolicy: traceRecord.finalSurfacePolicy,
    matchedDrivers: filterTraceEmbodimentDrivers(authoritySummary.matchedDrivers),
    driverExecutionSummary: input.driverExecutionSummary ?? null,
    traceEmbodimentSummary: localTraceEmbodimentSummary,
  })

  return {
    ...cloneCue(authoritySummary),
    traceEmbodimentSummary: enrichTraceEmbodimentSummary({
      upstreamSummary: authoritySummary.traceEmbodimentSummary,
      localSummary: authorityExecutionSummary,
    }),
  }
}

function enrichAuthoritySummaryWithTrust(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  if (!input.authoritySummary)
    return null

  return {
    ...cloneCue(input.authoritySummary),
    prosodyAuthoritySummary: buildRendererProsodyAuthoritySummary(input.playbackTelemetry),
    authorityTrustSummary: deriveAuthorityTrustSummary(input),
  }
}

function scopeAuthoritySummaryToPlaybackCue(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  const authoritySummary = input.authoritySummary
  if (!authoritySummary)
    return null

  const {
    activeSegmentId,
    authoritySummaryMatchesPlaybackScope,
  } = resolveAuthoritySummaryPlaybackScope(input)

  if (authoritySummaryMatchesPlaybackScope) {
    return {
      ...cloneCue(authoritySummary),
      authorityTrustSummary: structuredSummaryMatchesActiveSegment(authoritySummary.authorityTrustSummary, activeSegmentId)
        ? authoritySummary.authorityTrustSummary ?? null
        : null,
      settleSummary: structuredSummaryMatchesActiveSegment(authoritySummary.settleSummary, activeSegmentId)
        ? authoritySummary.settleSummary ?? null
        : null,
    }
  }

  return {
    ...cloneCue(authoritySummary),
    rendererTarget: null,
    matchedDrivers: [],
    matchedSources: [],
    bindingSummary: null,
    matchSummary: null,
    authorityMismatchSummary: null,
    authorityMismatchReasonSummary: null,
    authorityMismatchDisplay: null,
    settleSummary: null,
  }
}

function enrichTraceSummaryWithPlaybackAuthoritySources(input: {
  traceSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['traceSummary'] | null | undefined
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  const traceSummary = input.traceSummary
  if (!traceSummary)
    return null

  const playbackCueId = resolvePlaybackCueId(input.playbackTelemetry)
  const traceCueId = normalizeText(traceSummary.cueId)
  const traceMatchesPlaybackCue = !traceCueId || !playbackCueId || traceCueId === playbackCueId
  const { authoritySummaryMatchesPlaybackScope } = resolveAuthoritySummaryPlaybackScope({
    authoritySummary: input.authoritySummary,
    playbackTelemetry: input.playbackTelemetry,
  })

  const enrichedMatchedSources = normalizeUniqueTextList([
    ...(traceSummary.segmentBinding?.matchedSources ?? []),
    ...(traceMatchesPlaybackCue ? input.playbackTelemetry?.driverAuthority?.sources ?? [] : []),
    ...(authoritySummaryMatchesPlaybackScope ? input.authoritySummary?.matchedSources ?? [] : []),
  ])

  const originalMatchedSources = normalizeUniqueTextList(traceSummary.segmentBinding?.matchedSources ?? [])
  const changed = enrichedMatchedSources.length !== originalMatchedSources.length
    || enrichedMatchedSources.some((source, index) => source !== originalMatchedSources[index])

  if (!changed)
    return cloneCue(traceSummary)

  return {
    ...cloneCue(traceSummary),
    segmentBinding: traceSummary.segmentBinding
      ? {
          ...cloneCue(traceSummary.segmentBinding),
          matchedSources: enrichedMatchedSources,
        }
      : null,
  }
}

function normalizeStructuredVoiceSummary(input: {
  summary: string | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  const summary = typeof input.summary === 'string' && input.summary.trim()
    ? input.summary.trim()
    : null
  if (!summary)
    return null

  if (!summary.includes('closure=') || summary.includes('provenance='))
    return summary

  const residentMode = input.playbackTelemetry?.cue?.rendererHints?.residentMode?.trim() || null
  const driverAuthority = input.playbackTelemetry?.driverAuthority ?? null
  const carriesAudibleBodySegmentAuthority = residentMode === 'measured-return'
    && driverAuthority?.bodySegmentMatched === true
    && driverAuthority?.lipsyncSegmentMatched === true
    && driverAuthority?.faceSegmentMatched === false
    && driverAuthority?.motionSegmentMatched === false
  const voiceEmotion = (
    residentMode === 'repair-before-closeness'
    || carriesAudibleBodySegmentAuthority
  )
    ? input.playbackTelemetry?.cue?.emotion?.trim()
    : null
  const normalizedSummary = voiceEmotion && !summary.includes('emotion=')
    ? (() => {
        const companionIndex = summary.indexOf(' | companion=')
        if (companionIndex >= 0)
          return `${summary.slice(0, companionIndex)} | emotion=${voiceEmotion}${summary.slice(companionIndex)}`
        return `${summary} | emotion=${voiceEmotion}`
      })()
    : summary
  const provenance = input.playbackTelemetry?.driverAuthority ? 'authority-bound' : 'fallback-derived'
  const segmentId = (
    input.playbackTelemetry?.driverAuthority?.segmentId
    ?? input.playbackTelemetry?.drivers?.lipsync?.segmentId
    ?? input.playbackTelemetry?.drivers?.face?.segmentId
    ?? input.playbackTelemetry?.drivers?.motion?.segmentId
  )?.trim() || 'n/a'
  const source = (
    input.playbackTelemetry?.drivers?.lipsync?.visemeHints?.[0]?.source
    ?? input.playbackTelemetry?.drivers?.face?.source
    ?? input.playbackTelemetry?.drivers?.motion?.source
  )?.trim() || 'n/a'

  return `${normalizedSummary} | provenance=${provenance} | segment=${segmentId} | source=${source}`
}

function formatDriverExecutionSummaryFromPlaybackTelemetry(
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined,
  cueId?: string | null,
) {
  const driverExecution = playbackTelemetry?.drivers
  if (!driverExecution)
    return null

  const lines: string[] = []

  if (driverExecution.body && (!cueId || driverExecution.body.segmentId === cueId)) {
    lines.push(
      `body=${driverExecution.body.frameMode ?? 'n/a'} seg=${driverExecution.body.segmentId ?? 'n/a'}`,
    )
  }

  if (driverExecution.face && (!cueId || driverExecution.face.segmentId === cueId)) {
    lines.push(
      `face=${driverExecution.face.emotion ?? 'n/a'}/${driverExecution.face.facialCue ?? 'n/a'}@${typeof driverExecution.face.intensity === 'number' && Number.isFinite(driverExecution.face.intensity) ? driverExecution.face.intensity.toFixed(2) : 'n/a'} hold=${typeof driverExecution.face.holdMs === 'number' && Number.isFinite(driverExecution.face.holdMs) ? Math.round(driverExecution.face.holdMs) : 'n/a'} pre=${driverExecution.face.preUtteranceCue ?? 'n/a'} post=${driverExecution.face.postUtteranceCue ?? 'n/a'} src=${driverExecution.face.source ?? 'n/a'} conf=${typeof driverExecution.face.confidence === 'number' && Number.isFinite(driverExecution.face.confidence) ? driverExecution.face.confidence.toFixed(2) : 'n/a'}`,
    )
  }

  if (driverExecution.motion && (!cueId || driverExecution.motion.segmentId === cueId)) {
    lines.push(
      `motion=${driverExecution.motion.actionCue ?? 'n/a'} mode=${driverExecution.motion.attentionMode ?? 'n/a'} idle=${driverExecution.motion.idleBase ?? 'n/a'}@${typeof driverExecution.motion.intensity === 'number' && Number.isFinite(driverExecution.motion.intensity) ? driverExecution.motion.intensity.toFixed(2) : 'n/a'} hold=${typeof driverExecution.motion.holdMs === 'number' && Number.isFinite(driverExecution.motion.holdMs) ? Math.round(driverExecution.motion.holdMs) : 'n/a'} src=${driverExecution.motion.source ?? 'n/a'} conf=${typeof driverExecution.motion.confidence === 'number' && Number.isFinite(driverExecution.motion.confidence) ? driverExecution.motion.confidence.toFixed(2) : 'n/a'}`,
    )
  }

  if (driverExecution.lipsync && (!cueId || driverExecution.lipsync.segmentId === cueId)) {
    lines.push(
      `lipsync=${driverExecution.lipsync.mode ?? 'n/a'} phase=${driverExecution.lipsync.playbackPhase ?? 'n/a'}`,
    )
  }

  if (driverExecution.voice && (!cueId || driverExecution.voice.segmentId === cueId)) {
    lines.push(
      `voice=${driverExecution.voice.provenance} phase=${driverExecution.voice.playbackPhase} seg=${driverExecution.voice.segmentId ?? 'n/a'}`,
    )
  }

  return lines.length > 0 ? lines.join(' | ') : null
}

function buildSpeechEvidenceSummary(input: {
  articulationSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['articulationSummary'] | null | undefined
  bodyContinuitySummary?: string | null | undefined
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  cueMicroSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['cueMicroSummary'] | null | undefined
  driverExecutionSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverExecutionSummary'] | null | undefined
  visemeHintsSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['visemeHintsSummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}): StageThreeRuntimeSpeechEmbodimentDiagnostics['speechEvidence'] {
  const cue = input.playbackTelemetry?.cue ?? null
  const playbackCueId = resolvePlaybackCueId(input.playbackTelemetry)
  const cueMicroSummaryCueId = normalizeText(input.cueMicroSummary?.cueId)
  const { authoritySummaryMatchesPlaybackScope } = resolveAuthoritySummaryPlaybackScope({
    authoritySummary: input.authoritySummary,
    playbackTelemetry: input.playbackTelemetry,
  })
  const authorityMatchSummary = authoritySummaryMatchesPlaybackScope
    ? input.authoritySummary?.matchSummary ?? null
    : null
  const cueSummary = (!playbackCueId || !cueMicroSummaryCueId || cueMicroSummaryCueId === playbackCueId)
    ? input.cueMicroSummary?.cue ?? null
    : null
  const personaStyleSummary = (!playbackCueId || !cueMicroSummaryCueId || cueMicroSummaryCueId === playbackCueId)
    ? input.cueMicroSummary?.personaStyle ?? null
    : null
  const timingSummary = (!playbackCueId || !cueMicroSummaryCueId || cueMicroSummaryCueId === playbackCueId)
    ? input.cueMicroSummary?.timing ?? null
    : null
  const cueIdentityPresent = Boolean(
    (typeof cue?.facialCue === 'string' && cue.facialCue.trim())
    || (typeof cue?.actionCue === 'string' && cue.actionCue.trim()),
  )
  const cueProsodyPresent = Number.isFinite(cue?.prosodyWeight)
    || Number.isFinite(cue?.mouthWeight)
    || Number.isFinite(cue?.headWeight)
  const resolvedDriverExecutionSummary = hasSameCueSpeechAuthorityMatch(authorityMatchSummary)
    ? formatDriverExecutionSummaryFromPlaybackTelemetry(input.playbackTelemetry ?? null, playbackCueId)
    ?? input.driverExecutionSummary
    ?? null
    : input.driverExecutionSummary ?? null

  const hasEvidence = Boolean(
    input.articulationSummary?.voice
    || input.bodyContinuitySummary
    || input.articulationSummary?.topVisemes
    || authorityMatchSummary
    || cueSummary
    || personaStyleSummary
    || timingSummary
    || resolvedDriverExecutionSummary
    || input.visemeHintsSummary
    || cueIdentityPresent
    || cueProsodyPresent,
  )

  if (!hasEvidence)
    return null

  return {
    voiceSummary: normalizeStructuredVoiceSummary({
      summary: input.articulationSummary?.voice ?? null,
      playbackTelemetry: input.playbackTelemetry ?? null,
    }),
    bodyContinuitySummary: input.bodyContinuitySummary ?? null,
    authorityMatchSummary,
    topVisemeSummary: input.articulationSummary?.topVisemes ?? null,
    cueSummary,
    cueIdentityPresent,
    cueProsodyPresent,
    personaStyleSummary,
    timingSummary,
    driverExecutionSummary: resolvedDriverExecutionSummary,
    visemeHintsSummary: input.visemeHintsSummary ?? null,
  }
}

function formatRendererDriftEntry(
  entry: NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment']['live2d']>,
) {
  const authorityParts = [
    entry.faceDriverCue || entry.faceDriverSource
      ? `face ${entry.faceDriverCue ?? 'none'}@${entry.faceDriverSource ?? 'unknown'}`
      : null,
    entry.motionDriverCue || entry.motionDriverSource
      ? `motion ${entry.motionDriverCue ?? 'none'}@${entry.motionDriverSource ?? 'unknown'}`
      : null,
  ].filter(Boolean)
  const authority = authorityParts.length > 0
    ? ` | ${authorityParts.join(' | ')}`
    : ''

  if (entry.driftKind === 'alias-resolution-drift')
    return `resident ${entry.predicted ?? 'none'} -> actual ${entry.actual ?? 'none'}${authority}`

  if (entry.driftKind === 'resident-not-yet-applied')
    return `resident ${entry.predicted ?? 'none'} is waiting for renderer application`

  if (entry.driftKind === 'runtime-only-visible')
    return `runtime surfaced ${entry.actual ?? 'none'} before resident prediction${authority}`

  return null
}

function buildRendererDriftSummary(
  alignment: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment'] | null | undefined,
  upstreamSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererDriftSummary'] | null,
): StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererDriftSummary'] {
  if (upstreamSummary) {
    const normalized = cloneCue(upstreamSummary)
    if (normalized.live2d || normalized.vrm || normalized.primary)
      return normalized
  }

  const live2d = alignment?.live2d ? formatRendererDriftEntry(alignment.live2d) : null
  const vrm = alignment?.vrm ? formatRendererDriftEntry(alignment.vrm) : null

  if (!live2d && !vrm)
    return null

  return {
    live2d,
    vrm,
    primary: live2d ?? vrm ?? null,
  }
}

export function summarizeMindTurnEvent(event: AlicizationMindTurnEventRecord): string | null {
  const payload = event.payload && typeof event.payload === 'object'
    ? event.payload as Record<string, unknown>
    : null
  if (!payload)
    return null

  const summary = typeof payload.summary === 'string' && payload.summary.trim()
    ? payload.summary.trim()
    : typeof payload.message === 'string' && payload.message.trim()
      ? payload.message.trim()
      : null
  if (summary)
    return summary

  if (event.kind === 'governance-normalized') {
    const turnMode = typeof payload.turnMode === 'string' ? payload.turnMode.trim() : ''
    const truthState = typeof payload.truthState === 'string' ? payload.truthState.trim() : ''
    const repairState = typeof payload.repairState === 'string' ? payload.repairState.trim() : ''
    return [turnMode && `turn=${turnMode}`, truthState && `truth=${truthState}`, repairState && `repair=${repairState}`]
      .filter(Boolean)
      .join(' | ') || null
  }

  if (event.kind === 'person-state-updated') {
    const sourceTrail = Array.isArray(payload.sourceTrail)
      ? payload.sourceTrail.filter(item => typeof item === 'string' && item.trim()).map(item => (item as string).trim())
      : []
    return sourceTrail.length > 0 ? sourceTrail.join(', ') : null
  }

  return null
}

export function resolveRecentDrivingEventFromMindTurnEvents(
  events: AlicizationMindTurnEventRecord[],
): StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingEvent'] {
  const priority: Record<AlicizationMindTurnEventRecord['kind'], number> = {
    'presence-pulse-dispatched': 3,
    'person-state-updated': 2,
    'governance-normalized': 1,
    'recall-attribution': 0,
    'memory-deliberation-judged': 0,
    'memory-recall-withheld': 0,
    'memory-stable-core-surfaced': 0,
    'memory-followup-deferred': 0,
    'memory-wrong-thread-suppressed': 0,
    'takeover-audit': 0,
    'persistence-written': 0,
    'dialogue-emitted': 0,
    'reply-memory-coherence': 0,
    'memory-facts-upserted': 0,
    'memory-reconsolidated': 0,
    'humanlike-memory-corrected': 0,
    'learning-executed': 0,
  }

  const selected = [...events]
    .sort((left, right) => {
      const priorityDelta = (priority[right.kind] ?? 0) - (priority[left.kind] ?? 0)
      if (priorityDelta !== 0)
        return priorityDelta
      if (left.createdAt !== right.createdAt)
        return right.createdAt - left.createdAt
      return left.id.localeCompare(right.id)
    })
    .find((event) => {
      return (priority[event.kind] ?? 0) > 0 && Boolean(summarizeMindTurnEvent(event))
    }) ?? null

  return selected
    ? {
        kind: selected.kind,
        decisionTraceId: selected.decisionTraceId,
        summary: summarizeMindTurnEvent(selected),
        createdAt: selected.createdAt,
      }
    : null
}

export function buildRecentDrivingTraceEventsFromMindTurnEvents(
  events: AlicizationMindTurnEventRecord[],
  decisionTraceId?: string | null,
): StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceEvents'] {
  const allowedKinds = new Set<AlicizationMindTurnEventRecord['kind']>([
    'governance-normalized',
    'presence-pulse-dispatched',
    'person-state-updated',
  ])
  const normalizedDecisionTraceId = typeof decisionTraceId === 'string' && decisionTraceId.trim()
    ? decisionTraceId.trim()
    : null

  return [...events]
    .filter((event) => {
      if (!allowedKinds.has(event.kind))
        return false
      if (!normalizedDecisionTraceId)
        return true
      return event.decisionTraceId === normalizedDecisionTraceId
    })
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
    .map(event => ({
      kind: event.kind,
      summary: summarizeMindTurnEvent(event),
      createdAt: event.createdAt,
    }))
    .filter(event => Boolean(event.summary))
}

export function buildRecentDrivingTraceDetailsFromMindTurnEvents(
  events: AlicizationMindTurnEventRecord[],
  decisionTraceId?: string | null,
): StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceDetails'] {
  const normalizedDecisionTraceId = typeof decisionTraceId === 'string' && decisionTraceId.trim()
    ? decisionTraceId.trim()
    : null

  return [...events]
    .filter((event) => {
      if (!normalizedDecisionTraceId)
        return false
      return event.decisionTraceId === normalizedDecisionTraceId
    })
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
    .map((event) => {
      const payload = event.payload && typeof event.payload === 'object'
        ? event.payload as Record<string, unknown>
        : null
      const details: Array<{ label: string, value: string }> = []

      if (event.kind === 'governance-normalized') {
        if (typeof payload?.turnMode === 'string' && payload.turnMode.trim())
          details.push({ label: 'turnMode', value: payload.turnMode.trim() })
        if (typeof payload?.truthState === 'string' && payload.truthState.trim())
          details.push({ label: 'truthState', value: payload.truthState.trim() })
        if (typeof payload?.repairState === 'string' && payload.repairState.trim())
          details.push({ label: 'repairState', value: payload.repairState.trim() })
      }
      else if (event.kind === 'presence-pulse-dispatched') {
        if (typeof payload?.summary === 'string' && payload.summary.trim())
          details.push({ label: 'summary', value: payload.summary.trim() })
        if (typeof payload?.scenario === 'string' && payload.scenario.trim())
          details.push({ label: 'scenario', value: payload.scenario.trim() })
        if (typeof payload?.stance === 'string' && payload.stance.trim())
          details.push({ label: 'stance', value: payload.stance.trim() })
      }
      else if (event.kind === 'person-state-updated') {
        const sourceTrail = Array.isArray(payload?.sourceTrail)
          ? payload.sourceTrail.filter(item => typeof item === 'string' && item.trim()).map(item => (item as string).trim())
          : []
        if (sourceTrail.length > 0)
          details.push({ label: 'sourceTrail', value: sourceTrail.join(', ') })
      }

      return {
        kind: event.kind,
        summary: summarizeMindTurnEvent(event),
        createdAt: event.createdAt,
        details,
      }
    })
    .filter(event => Boolean(event.summary))
}

export function buildRecentDrivingTraceRecordSummaryFromMemoryDecisionTraces(
  traces: AlicizationMemoryDecisionTraceRecord[],
  decisionTraceId?: string | null,
): StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord'] {
  const normalizedDecisionTraceId = typeof decisionTraceId === 'string' && decisionTraceId.trim()
    ? decisionTraceId.trim()
    : null
  if (!normalizedDecisionTraceId)
    return null

  const selected = traces.find(trace => trace.decisionTraceId === normalizedDecisionTraceId) ?? null
  if (!selected)
    return null

  return {
    decisionTraceId: selected.decisionTraceId,
    activeThreadId: selected.activeThreadId ?? null,
    turnMode: selected.governance?.turnMode ?? null,
    truthState: selected.governance?.truthState ?? null,
    repairState: selected.governance?.repairState ?? null,
    finalSurfacePolicy: selected.memoryResolutionLedger?.finalSurfacePolicy ?? null,
    closureState: selected.memoryResolutionLedger?.closureState ?? null,
    suppressionTags: selected.memoryResolutionLedger?.suppressionTags
      ? [...selected.memoryResolutionLedger.suppressionTags]
      : [],
  }
}

export function buildRecentDrivingEventQueryInput(
  speechDiagnostics: StageThreeRuntimeSpeechEmbodimentDiagnostics | null,
) {
  if (!speechDiagnostics?.runtimeDynamics)
    return null

  const activeThreadId = speechDiagnostics.runtimeDynamics.provenance.activeThreadId?.trim()
  const runtimeThreadId = speechDiagnostics.runtimeDynamics.eventPointers.runtimeThreadId?.trim()
  const resolvedActiveThreadId = activeThreadId || runtimeThreadId || ''
  if (!resolvedActiveThreadId)
    return null

  return {
    activeThreadId: resolvedActiveThreadId,
    limit: 12,
  } as const
}

export function mapSpeechEmbodimentDiagnosticsForRenderer(
  speech: {
    phase?: StageThreeRuntimeSpeechEmbodimentDiagnostics['phase']
    playbackPhase?: StageThreeRuntimeSpeechEmbodimentDiagnostics['playbackPhase']
    speechEnergy?: number
    prosodyIntensity?: number
    emphasisLevel?: number
    cadencePulse?: number
    visemeIntensity?: number
    articulation?: StageThreeRuntimeSpeechEmbodimentDiagnostics['articulation']
    runtimeDynamics?: StageThreeRuntimeSpeechEmbodimentDiagnostics['runtimeDynamics']
    recentDrivingEvent?: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingEvent']
    recentDrivingTraceRecord?: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord']
    recentDrivingTraceEvents?: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceEvents']
    recentDrivingTraceDetails?: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceDetails']
    traceSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['traceSummary']
    rendererAlignment?: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment']
    rendererDriftSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererDriftSummary']
    articulationSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['articulationSummary']
    authoritySummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary']
    convergence?: StageThreeRuntimeSpeechEmbodimentDiagnostics['convergence']
    speechEvidence?: StageThreeRuntimeSpeechEmbodimentDiagnostics['speechEvidence']
    bodyContinuitySummary?: string | null
    cueMicroSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['cueMicroSummary']
    driverSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary']
    driverExecutionSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverExecutionSummary']
    live2dExecution?: StageThreeRuntimeSpeechEmbodimentDiagnostics['live2dExecution']
    visemeHintsSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['visemeHintsSummary']
    playbackTelemetry?: RendererSpeechPlaybackTelemetryInput | null
  } | null | undefined,
): StageThreeRuntimeSpeechEmbodimentDiagnostics {
  if (!speech) {
    return {
      phase: 'idle',
      playbackPhase: 'idle',
      speechEnergy: 0,
      prosodyIntensity: 0,
      emphasisLevel: 0,
      cadencePulse: 0,
      visemeIntensity: 0,
      articulation: null,
      runtimeDynamics: null,
      recentDrivingEvent: null,
      recentDrivingTraceRecord: null,
      recentDrivingTraceEvents: [],
      recentDrivingTraceDetails: [],
      traceSummary: null,
      rendererAlignment: {
        live2d: null,
        vrm: null,
      },
      rendererDriftSummary: null,
      articulationSummary: null,
      authoritySummary: null,
      convergence: null,
      speechEvidence: null,
      cueMicroSummary: null,
      driverSummary: null,
      driverExecutionSummary: null,
      live2dExecution: null,
      visemeHintsSummary: null,
      playbackTelemetry: null,
    }
  }

  const playbackTelemetry = normalizeRendererSpeechPlaybackTelemetry(speech.playbackTelemetry ?? null)

  return {
    phase: speech.phase ?? 'idle',
    playbackPhase: speech.playbackPhase ?? 'idle',
    speechEnergy: speech.speechEnergy ?? 0,
    prosodyIntensity: speech.prosodyIntensity ?? 0,
    emphasisLevel: speech.emphasisLevel ?? 0,
    cadencePulse: speech.cadencePulse ?? 0,
    visemeIntensity: speech.visemeIntensity ?? 0,
    articulation: speech.articulation ? cloneCue(speech.articulation) : null,
    runtimeDynamics: speech.runtimeDynamics ? cloneCue(speech.runtimeDynamics) : null,
    recentDrivingEvent: speech.recentDrivingEvent ? cloneCue(speech.recentDrivingEvent) : null,
    recentDrivingTraceRecord: speech.recentDrivingTraceRecord ? cloneCue(speech.recentDrivingTraceRecord) : null,
    recentDrivingTraceEvents: speech.recentDrivingTraceEvents
      ? speech.recentDrivingTraceEvents.map(event => cloneCue(event))
      : [],
    recentDrivingTraceDetails: speech.recentDrivingTraceDetails
      ? speech.recentDrivingTraceDetails.map(event => cloneCue(event))
      : [],
    traceSummary: speech.traceSummary
      ? enrichTraceSummaryWithPlaybackAuthoritySources({
          traceSummary: speech.traceSummary,
          authoritySummary: speech.authoritySummary ?? null,
          playbackTelemetry,
        })
      : buildTraceTelemetrySummary({
          cueId: playbackTelemetry?.cue?.id
            ?? speech.authoritySummary?.cueId
            ?? null,
          traceContext: {
            recentDrivingEvent: speech.recentDrivingEvent ?? null,
            recentDrivingTraceRecord: speech.recentDrivingTraceRecord ?? null,
            recentDrivingTraceEvents: speech.recentDrivingTraceEvents ?? [],
            driverSummary: speech.driverSummary ?? null,
            playbackTelemetry,
          },
        }),
    rendererAlignment: speech.rendererAlignment
      ? cloneCue(speech.rendererAlignment)
      : {
          live2d: null,
          vrm: null,
        },
    rendererDriftSummary: buildRendererDriftSummary(
      speech.rendererAlignment ?? null,
      speech.rendererDriftSummary ?? null,
    ),
    articulationSummary: speech.articulationSummary ? cloneCue(speech.articulationSummary) : null,
    authoritySummary: enrichAuthoritySummaryWithTraceEmbodimentSummary({
      authoritySummary: enrichAuthoritySummaryWithTrust({
        authoritySummary: scopeAuthoritySummaryToPlaybackCue({
          authoritySummary: enrichAuthoritySummaryWithTracePolicy(
            speech.authoritySummary ?? null,
            speech.recentDrivingTraceRecord ?? null,
          ),
          playbackTelemetry,
        }),
        playbackTelemetry,
      }),
      recentDrivingTraceRecord: speech.recentDrivingTraceRecord ?? null,
      recentDrivingTraceDetails: speech.recentDrivingTraceDetails ?? [],
      driverExecutionSummary: speech.driverExecutionSummary ?? null,
    }),
    convergence: speech.convergence
      ? {
          segmentId: normalizeText(speech.convergence.segmentId),
          state: speech.convergence.state,
          line: normalizeText(speech.convergence.line) ?? 'none',
          matchedDrivers: speech.convergence.matchedDrivers
            ? [...speech.convergence.matchedDrivers]
            : [],
          missingDrivers: speech.convergence.missingDrivers
            ? [...speech.convergence.missingDrivers]
            : [],
          summary: normalizeText(speech.convergence.summary) ?? '',
        }
      : null,
    speechEvidence: buildSpeechEvidenceSummary({
      articulationSummary: speech.articulationSummary ?? null,
      bodyContinuitySummary: speech.bodyContinuitySummary ?? speech.speechEvidence?.bodyContinuitySummary ?? null,
      authoritySummary: speech.authoritySummary ?? null,
      cueMicroSummary: speech.cueMicroSummary ?? null,
      driverExecutionSummary: speech.driverExecutionSummary ?? null,
      visemeHintsSummary: speech.visemeHintsSummary ?? null,
      playbackTelemetry,
    }),
    cueMicroSummary: speech.cueMicroSummary ? cloneCue(speech.cueMicroSummary) : null,
    driverSummary: speech.driverSummary ? cloneCue(speech.driverSummary) : null,
    driverExecutionSummary: speech.driverExecutionSummary ?? null,
    live2dExecution: speech.live2dExecution ? cloneCue(speech.live2dExecution) : null,
    visemeHintsSummary: speech.visemeHintsSummary ?? null,
    playbackTelemetry,
  }
}
