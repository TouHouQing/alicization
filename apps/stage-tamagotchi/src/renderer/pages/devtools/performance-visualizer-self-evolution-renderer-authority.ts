import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerLive2DAuthorityComparisonView } from './performance-visualizer-live2d-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { SelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence'
import type { PerformanceVisualizerVrmAuthorityComparisonView } from './performance-visualizer-vrm-authority'

import { resolveAlicizationCompanionshipReasonSummary } from '@proj-alicization/stage-shared'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import { resolveAuthorityLaneTruth } from './performance-visualizer-authority-lane-truth'
import { buildAuthorityMismatchSummary } from './performance-visualizer-authority-mismatch-filter'
import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './performance-visualizer-prosody-authority'
import { resolveSelfEvolutionRuntimeBodyContinuityPhase } from './performance-visualizer-self-evolution-runtime-body-continuity-phase'
import {
  formatDriverExecutionSummary,
  resolvePrimaryRendererAlignmentSummary,
} from './performance-visualizer-speech-observability'

export interface SelfEvolutionRendererAuthorityProjection {
  status: 'grounded' | 'partial' | 'drift' | 'missing'
  rendererTarget: 'live2d' | 'vrm' | 'speech' | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  runtimeProfile: string | null
  runtimeBodyState: string | null
  runtimeContinuityMode: string | null
  runtimeResidentEmotion: string | null
  runtimeResidentDelivery: string | null
  runtimeResidentFacialCue: string | null
  runtimeResidentActionCue: string | null
  playbackCueFacialCue: string | null
  playbackCueActionCue: string | null
  driverFaceCue: string | null
  driverActionCue: string | null
  authorityMatchSummary: string | null
  authorityMismatchSummary?: string | null
  authorityMismatchDisplay?: string | null
  prosodyAuthoritySummary?: string | null
  matchedSignals: string[]
  missingSignals: string[]
  driftingSignals: string[]
  reasons: string[]
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function pushUnique(values: Array<string | null | undefined>) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
  }
  return result
}

function formatRendererManifestationLabel(rendererTarget: 'live2d' | 'vrm' | 'speech' | null) {
  if (rendererTarget === 'live2d')
    return 'Live2D manifestation'
  if (rendererTarget === 'vrm')
    return 'VRM manifestation'
  if (rendererTarget === 'speech')
    return 'speech manifestation'
  return 'manifestation authority'
}

function extractSettleReasonSummary(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const matched = normalized.match(/(?:^|\|\s*)reason=([^|]+)$/u)
  return normalizeText(matched?.[1] ?? null)
}

function extractSummaryField(
  summary: string | null | undefined,
  field: string,
) {
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

function extractThinAffectiveAuthorityTrustReason(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const matched = normalized.match(/余韵还在[^”"]*|先留白[^”"]*|别立刻把温度放大[^”"]*|别把温度放大[^”"]*|不要立刻把温度放大[^”"]*/u)
  return normalizeText(matched?.[0] ?? null)
}

function summarizeProsodyAuthority(value: string | null | undefined) {
  const normalized = normalizeText(value)
  if (!normalized)
    return null

  let mode: string | null = null
  let segment: string | null = null

  for (const part of normalized.split('|').map(part => part.trim()).filter(Boolean)) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0)
      continue
    const key = part.slice(0, separatorIndex).trim()
    const rawValue = part.slice(separatorIndex + 1).trim()
    if (key === 'mode')
      mode = rawValue
    else if (key === 'segment')
      segment = rawValue
  }

  if (!mode && !segment)
    return null

  return `Prosody authority still anchors ${mode ?? 'n/a'} on ${segment ?? 'n/a'}, so the mouth-driving chain remains attributable to one authoritative speech segment instead of a renderer-local guess.`
}

function extractStructuredSegmentId(value: string | null | undefined) {
  const normalized = normalizeText(value)
  if (!normalized)
    return null

  const parts = normalized
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
  const segmentPart = parts.find(part => part.startsWith('segment='))
    ?? parts.find(part => part.startsWith('seg='))
  if (!segmentPart)
    return null

  return normalizeText(segmentPart.slice(segmentPart.indexOf('=') + 1))
}

function extractStructuredSameHerSegmentIds(value: string | null | undefined) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return {
      authoritySegmentId: null,
      summarySegmentId: null,
      performanceSegmentId: null,
      speechSegmentId: null,
    }
  }

  return {
    authoritySegmentId: extractSummaryField(normalized, 'authority'),
    summarySegmentId: extractSummaryField(normalized, 'segment')
      ?? extractSummaryField(normalized, 'seg'),
    performanceSegmentId: extractSummaryField(normalized, 'performance'),
    speechSegmentId: extractSummaryField(normalized, 'speech'),
  }
}

function matchesScopedSegment(segmentId: string | null | undefined, activeSegmentId: string | null | undefined) {
  const normalizedSegmentId = normalizeText(segmentId)
  const normalizedActiveSegmentId = normalizeText(activeSegmentId)
  return !normalizedSegmentId || !normalizedActiveSegmentId || normalizedSegmentId === normalizedActiveSegmentId
}

function structuredSummaryMatchesScopedSegment(summary: string | null | undefined, activeSegmentId: string | null | undefined) {
  const structuredSegmentId = extractStructuredSegmentId(summary)
  return matchesScopedSegment(structuredSegmentId, activeSegmentId)
}

function resolveRendererDriftSummary(
  speech: StageThreeRuntimeSpeechEmbodimentDiagnostics | null | undefined,
) {
  const upstreamSummary = normalizeText(speech?.rendererDriftSummary?.primary)
    ?? normalizeText(speech?.rendererDriftSummary?.live2d)
    ?? normalizeText(speech?.rendererDriftSummary?.vrm)

  if (upstreamSummary)
    return upstreamSummary

  return resolvePrimaryRendererAlignmentSummary(speech?.rendererAlignment)
}

function resolveVoiceSummarySegmentId(value: string | null | undefined) {
  return extractStructuredSegmentId(value)
}

function resolveSameHerEvidenceBelongsToActiveSegment(input: {
  activeSegmentId: string | null | undefined
  summary: string | null | undefined
  segmentIds?: Array<string | null | undefined>
}) {
  const normalizedActiveSegmentId = normalizeText(input.activeSegmentId)
  if (!normalizedActiveSegmentId)
    return true

  const summarySegmentIds = extractStructuredSameHerSegmentIds(input.summary)
  const candidateSegmentIds = pushUnique([
    ...(input.segmentIds ?? []),
    summarySegmentIds.authoritySegmentId,
    summarySegmentIds.summarySegmentId,
    summarySegmentIds.performanceSegmentId,
    summarySegmentIds.speechSegmentId,
  ])

  if (candidateSegmentIds.length === 0)
    return true

  return candidateSegmentIds.includes(normalizedActiveSegmentId)
}

function resolveVoiceSegmentMatched(input: {
  authoritySegmentId: string | null | undefined
  voiceSummary: string | null | undefined
  matchedDrivers?: string[] | null | undefined
  matchedSources?: string[] | null | undefined
}) {
  const authoritySegmentId = normalizeText(input.authoritySegmentId)
  if (!authoritySegmentId)
    return null

  const voiceSegmentId = resolveVoiceSummarySegmentId(input.voiceSummary)
  if (voiceSegmentId)
    return authoritySegmentId === voiceSegmentId

  const matchedDrivers = pushUnique(input.matchedDrivers ?? [])
  if (matchedDrivers.includes('voice'))
    return true

  const matchedSources = pushUnique(input.matchedSources ?? [])
  if (matchedSources.includes('voice-segment'))
    return true

  return null
}

function resolveAuthorityLaneSummary(input: {
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
} | null | undefined) {
  if (!input)
    return null

  const hasVoiceEvidence = typeof input.voiceSegmentMatched === 'boolean'
  const survivingLanes = hasVoiceEvidence
    ? [
        input.faceSegmentMatched === true ? 'face' : null,
        input.motionSegmentMatched === true ? 'motion' : null,
        input.lipsyncSegmentMatched === true ? 'lipsync' : null,
        input.voiceSegmentMatched === true ? 'voice' : null,
      ].filter((value): value is string => Boolean(value))
    : [
        input.faceSegmentMatched === true ? 'face' : null,
        input.motionSegmentMatched === true ? 'motion' : null,
        input.lipsyncSegmentMatched === true ? 'lipsync' : null,
      ].filter((value): value is string => Boolean(value))

  const fullLaneCount = hasVoiceEvidence ? 4 : 3
  if (survivingLanes.length === 0 || survivingLanes.length === fullLaneCount)
    return null

  return `lane=${survivingLanes.join('+')}-only`
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

export function buildSelfEvolutionRendererAuthorityProjection(input: {
  embodimentOutputProjection?: SelfEvolutionEvidencePanelInput['embodimentOutputProjection']
  speechEmbodiment?: StageThreeRuntimeSpeechEmbodimentDiagnostics | null
  live2dAuthorityView?: PerformanceVisualizerLive2DAuthorityComparisonView | null
  vrmAuthorityView?: PerformanceVisualizerVrmAuthorityComparisonView | null
  playbackCueAuthorityView?: PerformanceVisualizerPlaybackCueAuthorityView | null
}): SelfEvolutionRendererAuthorityProjection | null {
  const embodiment = input.embodimentOutputProjection
  const speech = input.speechEmbodiment
  const runtimeDynamics = speech?.runtimeDynamics ?? null
  const playbackCue = speech?.playbackTelemetry?.cue ?? null
  const driverFaceCue = speech?.playbackTelemetry?.drivers?.face?.facialCue ?? speech?.driverSummary?.face?.cue ?? null
  const driverActionCue = speech?.playbackTelemetry?.drivers?.motion?.actionCue ?? speech?.driverSummary?.motion?.cue ?? null
  const explicitSpeechRendererTarget = (
    normalizeText(input.playbackCueAuthorityView?.authorityRendererTarget) === 'speech'
    || normalizeText(extractSummaryField(input.playbackCueAuthorityView?.authorityBindingSummary, 'target')) === 'speech'
    || normalizeText(extractSummaryField(input.playbackCueAuthorityView?.settleAuthoritySummary, 'target')) === 'speech'
    || normalizeText(extractSummaryField(speech?.authoritySummary?.bindingSummary, 'target')) === 'speech'
    || normalizeText(extractSummaryField(speech?.authoritySummary?.settleSummary, 'target')) === 'speech'
  )
    ? 'speech'
    : null

  const rendererTarget = explicitSpeechRendererTarget
    ?? input.playbackCueAuthorityView?.authorityRendererTarget
    ?? speech?.playbackTelemetry?.rendererTarget
    ?? speech?.driverSummary?.rendererTarget
    ?? null

  const hasSignal = Boolean(
    embodiment
    || runtimeDynamics
    || playbackCue
    || driverFaceCue
    || driverActionCue
    || input.live2dAuthorityView
    || input.vrmAuthorityView
    || input.playbackCueAuthorityView,
  )

  if (!hasSignal)
    return null

  const runtimeBodyState = normalizeText(runtimeDynamics?.provenance?.bodyState)
  const runtimeContinuityMode = normalizeText(runtimeDynamics?.provenance?.continuityMode)
  const runtimeResidentEmotion = normalizeText(runtimeDynamics?.residentEmotion)
  const runtimeResidentDelivery = normalizeText(runtimeDynamics?.residentDelivery)
  const runtimeResidentFacialCue = normalizeText(runtimeDynamics?.residentFacialCue)
  const runtimeResidentActionCue = normalizeText(runtimeDynamics?.residentActionCue)
  const playbackCueFacialCue = normalizeText(playbackCue?.facialCue)
  const playbackCueActionCue = normalizeText(playbackCue?.actionCue)
  const authoritySummaryCueId = normalizeText(speech?.authoritySummary?.cueId)
  const playbackCueAuthorityCueId = normalizeText(input.playbackCueAuthorityView?.cueId)
  const playbackCueId = playbackCueAuthorityCueId ?? normalizeText(playbackCue?.id) ?? authoritySummaryCueId
  const resolvedProsodyAuthority = resolveProsodyAuthorityFromSources(speech?.playbackTelemetry)
  const activePlaybackSegmentId = normalizeText(input.playbackCueAuthorityView?.authoritySegmentId)
    ?? normalizeText(speech?.playbackTelemetry?.driverAuthority?.segmentId)
    ?? playbackCueId
    ?? normalizeText(resolvedProsodyAuthority?.segmentId)
    ?? null
  const authoritySummarySegmentId = normalizeText(speech?.authoritySummary?.segmentId)
  const authoritySummaryMatchesPlaybackCue = !authoritySummaryCueId || !playbackCueAuthorityCueId || authoritySummaryCueId === playbackCueAuthorityCueId
  const authoritySummaryMatchesPlaybackSegment = matchesScopedSegment(authoritySummarySegmentId, activePlaybackSegmentId)
  const authoritySummaryTrustSummary = authoritySummaryMatchesPlaybackCue && authoritySummaryMatchesPlaybackSegment && structuredSummaryMatchesScopedSegment(
    speech?.authoritySummary?.authorityTrustSummary,
    activePlaybackSegmentId,
  )
    ? normalizeText(speech?.authoritySummary?.authorityTrustSummary)
    : null
  const authoritySummarySettleSummary = authoritySummaryMatchesPlaybackCue && authoritySummaryMatchesPlaybackSegment && structuredSummaryMatchesScopedSegment(
    speech?.authoritySummary?.settleSummary,
    activePlaybackSegmentId,
  )
    ? normalizeText(speech?.authoritySummary?.settleSummary)
    : null
  const preferUpstreamAuthoritySummary = authoritySummaryMatchesPlaybackCue && authoritySummaryMatchesPlaybackSegment && Boolean(speech?.authoritySummary)
  const normalizedSpeechEvidenceProsodyAuthoritySummary = normalizeText(speech?.speechEvidence?.prosodyAuthoritySummary)
  const speechEvidenceProsodySegmentId = extractStructuredSegmentId(normalizedSpeechEvidenceProsodyAuthoritySummary)
  const scopedSpeechEvidenceProsodyAuthoritySummary = normalizedSpeechEvidenceProsodyAuthoritySummary && speechEvidenceProsodySegmentId && playbackCueId && speechEvidenceProsodySegmentId !== playbackCueId
    ? null
    : normalizedSpeechEvidenceProsodyAuthoritySummary
  const voiceSummary = normalizeText(speech?.speechEvidence?.voiceSummary)
    ?? normalizeText(speech?.articulationSummary?.voice)
  const authorityMatchSummary = preferUpstreamAuthoritySummary
    ? normalizeText(speech?.authoritySummary?.matchSummary)
    : normalizeText(input.playbackCueAuthorityView?.authorityMatchSummary)
  const authorityBindingSummary = preferUpstreamAuthoritySummary
    ? normalizeText((speech?.authoritySummary as { bindingSummary?: string | null } | null | undefined)?.bindingSummary)
    : normalizeText(input.playbackCueAuthorityView?.authorityBindingSummary)
  const settleAuthoritySummary = preferUpstreamAuthoritySummary
    ? authoritySummarySettleSummary
    : normalizeText(input.playbackCueAuthorityView?.settleAuthoritySummary)
  const sameHerFrameSummary = normalizeText(input.vrmAuthorityView?.sameHerFrameSummary)
  const rawSameHerFrameAligned = typeof input.vrmAuthorityView?.sameHerFrameAligned === 'boolean'
    ? input.vrmAuthorityView.sameHerFrameAligned
    : null
  const rawSameHerFrameMismatchDrivers = pushUnique(input.vrmAuthorityView?.sameHerFrameMismatchDrivers ?? [])
  const sameHerExecutionSummary = normalizeText(input.live2dAuthorityView?.sameHerExecutionSummary)
  const rawSameHerExecutionAligned = typeof input.live2dAuthorityView?.sameHerExecutionAligned === 'boolean'
    ? input.live2dAuthorityView.sameHerExecutionAligned
    : null
  const rawSameHerExecutionMismatchDrivers = pushUnique(input.live2dAuthorityView?.sameHerExecutionMismatchDrivers ?? [])
  const sameHerFrameBelongsToActiveSegment = resolveSameHerEvidenceBelongsToActiveSegment({
    activeSegmentId: activePlaybackSegmentId,
    summary: sameHerFrameSummary,
    segmentIds: [
      input.vrmAuthorityView?.sameHerFramePerformanceSegmentId,
      input.vrmAuthorityView?.sameHerFrameSpeechSegmentId,
    ],
  })
  const sameHerExecutionBelongsToActiveSegment = resolveSameHerEvidenceBelongsToActiveSegment({
    activeSegmentId: activePlaybackSegmentId,
    summary: sameHerExecutionSummary,
    segmentIds: [
      input.live2dAuthorityView?.sameHerExecutionAuthoritySegmentId,
    ],
  })
  const sameHerFrameAligned = sameHerFrameBelongsToActiveSegment ? rawSameHerFrameAligned : null
  const sameHerFrameMismatchDrivers = sameHerFrameBelongsToActiveSegment ? rawSameHerFrameMismatchDrivers : []
  const scopedSameHerFrameSummary = sameHerFrameBelongsToActiveSegment ? sameHerFrameSummary : null
  const sameHerExecutionAligned = sameHerExecutionBelongsToActiveSegment ? rawSameHerExecutionAligned : null
  const sameHerExecutionMismatchDrivers = sameHerExecutionBelongsToActiveSegment ? rawSameHerExecutionMismatchDrivers : []
  const scopedSameHerExecutionSummary = sameHerExecutionBelongsToActiveSegment ? sameHerExecutionSummary : null
  const remainingOpenAuthoritySummary = extractSummaryField(authorityBindingSummary, 'remaining-open')
    ?? extractSummaryField(settleAuthoritySummary, 'remaining-open')
  const upstreamMatchedDrivers = preferUpstreamAuthoritySummary
    ? pushUnique(
      (speech?.authoritySummary?.matchedDrivers ?? [])
        .filter((driver): driver is 'body' | 'face' | 'motion' | 'lipsync' | 'voice' =>
          driver === 'body' || driver === 'face' || driver === 'motion' || driver === 'lipsync' || driver === 'voice',
        ),
    ) as Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
    : []
  const upstreamAuthorityMismatchSummary = preferUpstreamAuthoritySummary
    ? normalizeText(speech?.authoritySummary?.authorityMismatchSummary)
    : null
  const upstreamAuthorityLaneTruth = preferUpstreamAuthoritySummary
    ? resolveAuthorityLaneTruth({
        matchSummary: authorityMatchSummary,
        matchedDrivers: upstreamMatchedDrivers,
        authorityMismatchSummary: upstreamAuthorityMismatchSummary,
      })
    : null
  const authority = preferUpstreamAuthoritySummary
    ? {
        bodySegmentMatched: upstreamAuthorityLaneTruth?.authority.bodySegmentMatched ?? null,
        faceSegmentMatched: upstreamAuthorityLaneTruth?.authority.faceSegmentMatched ?? null,
        motionSegmentMatched: upstreamAuthorityLaneTruth?.authority.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: upstreamAuthorityLaneTruth?.authority.lipsyncSegmentMatched ?? null,
        voiceSegmentMatched: resolveVoiceSegmentMatched({
          authoritySegmentId: speech?.authoritySummary?.segmentId ?? speech?.authoritySummary?.cueId ?? null,
          voiceSummary,
          matchedDrivers: upstreamMatchedDrivers,
          matchedSources: speech?.authoritySummary?.matchedSources ?? null,
        }),
      }
    : input.playbackCueAuthorityView
      ? {
          bodySegmentMatched: input.playbackCueAuthorityView.bodySegmentMatched,
          faceSegmentMatched: input.playbackCueAuthorityView.faceSegmentMatched,
          motionSegmentMatched: input.playbackCueAuthorityView.motionSegmentMatched,
          lipsyncSegmentMatched: input.playbackCueAuthorityView.lipsyncSegmentMatched,
          voiceSegmentMatched: resolveVoiceSegmentMatched({
            authoritySegmentId: input.playbackCueAuthorityView.authoritySegmentId ?? input.playbackCueAuthorityView.cueId ?? null,
            voiceSummary,
            matchedDrivers: input.playbackCueAuthorityView.authorityMatchedDrivers,
            matchedSources: input.playbackCueAuthorityView.authoritySources,
          }),
        }
      : speech?.playbackTelemetry?.driverAuthority
        ? {
            bodySegmentMatched: speech.playbackTelemetry.driverAuthority.bodySegmentMatched,
            faceSegmentMatched: speech.playbackTelemetry.driverAuthority.faceSegmentMatched,
            motionSegmentMatched: speech.playbackTelemetry.driverAuthority.motionSegmentMatched,
            lipsyncSegmentMatched: speech.playbackTelemetry.driverAuthority.lipsyncSegmentMatched,
            voiceSegmentMatched: resolveVoiceSegmentMatched({
              authoritySegmentId: speech.playbackTelemetry.driverAuthority.segmentId ?? null,
              voiceSummary,
              matchedDrivers: speech.playbackTelemetry.driverAuthority.matchedDrivers,
              matchedSources: speech.playbackTelemetry.driverAuthority.matchedSources
                ?? speech.playbackTelemetry.driverAuthority.sources
                ?? null,
            }),
          }
        : null
  const authorityLaneSummary = resolveAuthorityLaneSummary(authority ?? undefined)
  const bodyContinuityPhase = resolveSelfEvolutionRuntimeBodyContinuityPhase({
    cueId: playbackCueId,
    authoritySegmentId: activePlaybackSegmentId,
    authorityRendererTarget: rendererTarget,
    authorityMatchedDrivers: (
      preferUpstreamAuthoritySummary
        ? upstreamMatchedDrivers
        : input.playbackCueAuthorityView?.authorityMatchedDrivers
    ) ?? [],
    authoritySources: (
      preferUpstreamAuthoritySummary
        ? speech?.authoritySummary?.matchedSources
        : input.playbackCueAuthorityView?.authoritySources
    ) ?? [],
    authorityTrustSummary: preferUpstreamAuthoritySummary
      ? authoritySummaryTrustSummary
      : normalizeText(input.playbackCueAuthorityView?.authorityTrustSummary),
    prosodyAuthoritySummary: preferUpstreamAuthoritySummary
      ? scopedSpeechEvidenceProsodyAuthoritySummary
      : null,
    traceEmbodimentSummary: null,
    residentMode: null,
    preferredBlinkCadence: null,
    preferredGazeMode: null,
    bodySegmentMatched: authority?.bodySegmentMatched ?? null,
    faceSegmentMatched: authority?.faceSegmentMatched ?? null,
    motionSegmentMatched: authority?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: authority?.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: authority?.voiceSegmentMatched ?? null,
    sameHerFramePerformanceSegmentId: sameHerFrameBelongsToActiveSegment ? normalizeText(input.vrmAuthorityView?.sameHerFramePerformanceSegmentId) : null,
    sameHerFrameSpeechSegmentId: sameHerFrameBelongsToActiveSegment ? normalizeText(input.vrmAuthorityView?.sameHerFrameSpeechSegmentId) : null,
    sameHerFrameSummary: scopedSameHerFrameSummary,
    sameHerExecutionAuthoritySegmentId: sameHerExecutionBelongsToActiveSegment ? normalizeText(input.live2dAuthorityView?.sameHerExecutionAuthoritySegmentId) : null,
    sameHerExecutionSummary: scopedSameHerExecutionSummary,
    authorityBindingSummary,
    authorityMatchSummary,
    settleAuthoritySummary,
  })
  const rendererRejoinSurfaceKey = (
    bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || bodyContinuityPhase === 'full-cross-modal-lock'
    || bodyContinuityPhase === 'renderer-rejoin-without-body'
  )
    ? resolveRendererRejoinSurfaceKey(rendererTarget)
    : null
  const authorityMismatchTechnicalSummary = preferUpstreamAuthoritySummary
    ? upstreamAuthorityMismatchSummary
    : buildAuthorityMismatchSummary(authority)
  const fallbackDriverExecutionSummary = formatDriverExecutionSummary(
    speech?.playbackTelemetry?.drivers
      ? {
          face: speech.playbackTelemetry.drivers.face
            ? {
                segmentId: normalizeText(speech.playbackTelemetry.drivers.face.segmentId),
                emotion: normalizeText(speech.playbackTelemetry.drivers.face.emotion),
                facialCue: normalizeText(speech.playbackTelemetry.drivers.face.facialCue),
                intensity: speech.playbackTelemetry.drivers.face.intensity ?? null,
                holdMs: speech.playbackTelemetry.drivers.face.holdMs ?? null,
                source: normalizeText(speech.playbackTelemetry.drivers.face.source),
                confidence: speech.playbackTelemetry.drivers.face.confidence ?? null,
                preUtteranceCue: normalizeText(speech.playbackTelemetry.drivers.face.preUtteranceCue),
                postUtteranceCue: normalizeText(speech.playbackTelemetry.drivers.face.postUtteranceCue),
              }
            : null,
          motion: speech.playbackTelemetry.drivers.motion
            ? {
                segmentId: normalizeText(speech.playbackTelemetry.drivers.motion.segmentId),
                idleBase: normalizeText(speech.playbackTelemetry.drivers.motion.idleBase),
                attentionMode: normalizeText(speech.playbackTelemetry.drivers.motion.attentionMode),
                actionCue: normalizeText(speech.playbackTelemetry.drivers.motion.actionCue),
                intensity: speech.playbackTelemetry.drivers.motion.intensity ?? null,
                holdMs: speech.playbackTelemetry.drivers.motion.holdMs ?? null,
                source: normalizeText(speech.playbackTelemetry.drivers.motion.source),
                confidence: speech.playbackTelemetry.drivers.motion.confidence ?? null,
              }
            : null,
          lipsync: speech.playbackTelemetry.drivers.lipsync
            ? {
                segmentId: normalizeText(speech.playbackTelemetry.drivers.lipsync.segmentId),
                mode: normalizeText(speech.playbackTelemetry.drivers.lipsync.mode),
                playbackPhase: normalizeText(speech.playbackTelemetry.drivers.lipsync.playbackPhase),
              }
            : null,
        }
      : null,
    input.playbackCueAuthorityView?.cueId ?? normalizeText(playbackCue?.id) ?? normalizeText(speech?.authoritySummary?.cueId),
  )
  const authorityMismatchReasonSummary = (preferUpstreamAuthoritySummary ? normalizeText(speech?.authoritySummary?.authorityMismatchReasonSummary) : null)
    ?? resolveAuthorityLaneTruth({
      bodySegmentMatched: authority?.bodySegmentMatched ?? null,
      faceSegmentMatched: authority?.faceSegmentMatched ?? null,
      motionSegmentMatched: authority?.motionSegmentMatched ?? null,
      lipsyncSegmentMatched: authority?.lipsyncSegmentMatched ?? null,
      authorityMismatchSummary: authorityMismatchTechnicalSummary,
      matchedSources: input.playbackCueAuthorityView?.authoritySources
        ?? speech?.playbackTelemetry?.driverAuthority?.sources
        ?? speech?.authoritySummary?.matchedSources,
      driverExecutionSummary: normalizeText(speech?.driverExecutionSummary) ?? fallbackDriverExecutionSummary,
      finalSurfacePolicy: speech?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
    }).authorityMismatchReasonSummary
  const upstreamAuthorityMismatchDisplay = preferUpstreamAuthoritySummary
    ? normalizeText(speech?.authoritySummary?.authorityMismatchDisplay)
    : null
  const authorityMismatchDisplay = upstreamAuthorityMismatchDisplay
    ?? resolveAuthorityMismatchDisplay({
      authorityMismatchSummary: authorityMismatchTechnicalSummary,
      authorityMismatchReasonSummary,
    })
  const rendererDriftSummary = resolveRendererDriftSummary(speech)
  const normalizedPlaybackTelemetryProsodyAuthoritySummary = normalizeText(
    (speech as { playbackTelemetry?: { prosodyAuthority?: { summary?: string | null } | null } | null } | null | undefined)?.playbackTelemetry?.prosodyAuthority?.summary,
  )
  const playbackTelemetryProsodyAuthoritySummarySegmentId = extractStructuredSegmentId(
    normalizedPlaybackTelemetryProsodyAuthoritySummary,
  )
  const scopedPlaybackTelemetryProsodyAuthoritySummary = normalizedPlaybackTelemetryProsodyAuthoritySummary
    && playbackTelemetryProsodyAuthoritySummarySegmentId
    && resolvedProsodyAuthority?.segmentId
    && playbackTelemetryProsodyAuthoritySummarySegmentId !== resolvedProsodyAuthority.segmentId
    ? null
    : normalizedPlaybackTelemetryProsodyAuthoritySummary
  const prosodyAuthoritySummary = scopedSpeechEvidenceProsodyAuthoritySummary
    ?? scopedPlaybackTelemetryProsodyAuthoritySummary
    ?? formatResolvedProsodyAuthoritySummary(resolvedProsodyAuthority)
  const prosodyAuthorityReason = summarizeProsodyAuthority(prosodyAuthoritySummary)
  const companionshipReasonSummary = extractSettleReasonSummary(
    preferUpstreamAuthoritySummary
      ? authoritySummarySettleSummary
      : normalizeText(input.playbackCueAuthorityView?.settleAuthoritySummary),
  ) ?? extractThinAffectiveAuthorityTrustReason(
    preferUpstreamAuthoritySummary
      ? authoritySummaryTrustSummary
      : normalizeText(input.playbackCueAuthorityView?.authorityTrustSummary),
  ) ?? resolveAlicizationCompanionshipReasonSummary({
    residentMode: normalizeText(input.playbackCueAuthorityView?.residentMode)
      ?? normalizeText(runtimeDynamics?.provenance?.continuityMode),
  })
  const matchedSignals = pushUnique([
    rendererTarget ? `renderer-target:${rendererTarget}` : null,
    embodiment?.projectedBodyState && runtimeBodyState === embodiment.projectedBodyState ? `runtime-body:${runtimeBodyState}` : null,
    embodiment?.projectedContinuityMode && runtimeContinuityMode === embodiment.projectedContinuityMode ? `runtime-continuity:${runtimeContinuityMode}` : null,
    embodiment?.projectedBaseEmotion && runtimeResidentEmotion === embodiment.projectedBaseEmotion ? `runtime-emotion:${runtimeResidentEmotion}` : null,
    embodiment?.projectedDelivery && runtimeResidentDelivery === embodiment.projectedDelivery ? `runtime-delivery:${runtimeResidentDelivery}` : null,
    embodiment?.projectedFacialCue && runtimeResidentFacialCue === embodiment.projectedFacialCue ? `runtime-facialCue:${runtimeResidentFacialCue}` : null,
    embodiment?.projectedActionCue && runtimeResidentActionCue === embodiment.projectedActionCue ? `runtime-actionCue:${runtimeResidentActionCue}` : null,
    embodiment?.projectedFacialCue && playbackCueFacialCue === embodiment.projectedFacialCue ? `playback-facialCue:${playbackCueFacialCue}` : null,
    embodiment?.projectedActionCue && playbackCueActionCue === embodiment.projectedActionCue ? `playback-actionCue:${playbackCueActionCue}` : null,
    embodiment?.projectedFacialCue && normalizeText(driverFaceCue) === embodiment.projectedFacialCue ? `driver-faceCue:${normalizeText(driverFaceCue)}` : null,
    embodiment?.projectedActionCue && normalizeText(driverActionCue) === embodiment.projectedActionCue ? `driver-actionCue:${normalizeText(driverActionCue)}` : null,
    authority?.bodySegmentMatched === true ? 'authority-body:yes' : null,
    authority?.faceSegmentMatched === true ? 'authority-face:yes' : null,
    authority?.motionSegmentMatched === true ? 'authority-motion:yes' : null,
    authority?.lipsyncSegmentMatched === true ? 'authority-lipsync:yes' : null,
    authority?.voiceSegmentMatched === true ? 'authority-voice:yes' : null,
    authorityLaneSummary,
    remainingOpenAuthoritySummary ? `remaining-open=${remainingOpenAuthoritySummary}` : null,
    sameHerFrameAligned === true ? 'same-her-frame:aligned' : null,
    sameHerExecutionAligned === true ? 'same-her-execution:aligned' : null,
  ])

  const missingSignals = pushUnique([
    embodiment?.projectedBodyState && !runtimeBodyState ? 'runtime-body' : null,
    embodiment?.projectedContinuityMode && !runtimeContinuityMode ? 'runtime-continuity' : null,
    embodiment?.projectedBaseEmotion && !runtimeResidentEmotion ? 'runtime-emotion' : null,
    embodiment?.projectedDelivery && !runtimeResidentDelivery ? 'runtime-delivery' : null,
    embodiment?.projectedFacialCue && !runtimeResidentFacialCue ? 'runtime-facialCue' : null,
    embodiment?.projectedActionCue && !runtimeResidentActionCue ? 'runtime-actionCue' : null,
    embodiment?.projectedFacialCue && !playbackCueFacialCue ? 'playback-facialCue' : null,
    embodiment?.projectedActionCue && !playbackCueActionCue ? 'playback-actionCue' : null,
    embodiment?.projectedFacialCue && !normalizeText(driverFaceCue) ? 'driver-faceCue' : null,
    embodiment?.projectedActionCue && !normalizeText(driverActionCue) ? 'driver-actionCue' : null,
    !authorityMatchSummary ? 'authority-match-summary' : null,
  ])

  const driftingSignals = pushUnique([
    embodiment?.projectedBodyState && runtimeBodyState && runtimeBodyState !== embodiment.projectedBodyState ? `runtime-body:${runtimeBodyState}` : null,
    embodiment?.projectedContinuityMode && runtimeContinuityMode && runtimeContinuityMode !== embodiment.projectedContinuityMode ? `runtime-continuity:${runtimeContinuityMode}` : null,
    embodiment?.projectedBaseEmotion && runtimeResidentEmotion && runtimeResidentEmotion !== embodiment.projectedBaseEmotion ? `runtime-emotion:${runtimeResidentEmotion}` : null,
    embodiment?.projectedDelivery && runtimeResidentDelivery && runtimeResidentDelivery !== embodiment.projectedDelivery ? `runtime-delivery:${runtimeResidentDelivery}` : null,
    embodiment?.projectedFacialCue && runtimeResidentFacialCue && runtimeResidentFacialCue !== embodiment.projectedFacialCue ? `runtime-facialCue:${runtimeResidentFacialCue}` : null,
    embodiment?.projectedActionCue && runtimeResidentActionCue && runtimeResidentActionCue !== embodiment.projectedActionCue ? `runtime-actionCue:${runtimeResidentActionCue}` : null,
    embodiment?.projectedFacialCue && playbackCueFacialCue && playbackCueFacialCue !== embodiment.projectedFacialCue ? `playback-facialCue:${playbackCueFacialCue}` : null,
    embodiment?.projectedActionCue && playbackCueActionCue && playbackCueActionCue !== embodiment.projectedActionCue ? `playback-actionCue:${playbackCueActionCue}` : null,
    embodiment?.projectedFacialCue && normalizeText(driverFaceCue) && normalizeText(driverFaceCue) !== embodiment.projectedFacialCue ? `driver-faceCue:${normalizeText(driverFaceCue)}` : null,
    embodiment?.projectedActionCue && normalizeText(driverActionCue) && normalizeText(driverActionCue) !== embodiment.projectedActionCue ? `driver-actionCue:${normalizeText(driverActionCue)}` : null,
    authority?.bodySegmentMatched === false ? 'authority-body:no' : null,
    authority?.faceSegmentMatched === false ? 'authority-face:no' : null,
    authority?.motionSegmentMatched === false ? 'authority-motion:no' : null,
    authority?.lipsyncSegmentMatched === false ? 'authority-lipsync:no' : null,
    authority?.voiceSegmentMatched === false ? 'authority-voice:no' : null,
    ...(sameHerFrameAligned === false
      ? sameHerFrameMismatchDrivers.length > 0
        ? sameHerFrameMismatchDrivers.map(driver => `same-her-frame:${driver}`)
        : ['same-her-frame:drift']
      : []),
    ...(sameHerExecutionAligned === false
      ? sameHerExecutionMismatchDrivers.length > 0
        ? sameHerExecutionMismatchDrivers.map(driver => `same-her-execution:${driver}`)
        : ['same-her-execution:drift']
      : []),
    rendererDriftSummary ? `renderer-drift:${rendererDriftSummary}` : null,
    sameHerFrameAligned === false && scopedSameHerFrameSummary ? `renderer-drift:${scopedSameHerFrameSummary}` : null,
    sameHerExecutionAligned === false && scopedSameHerExecutionSummary ? `renderer-drift:${scopedSameHerExecutionSummary}` : null,
    authorityMismatchDisplay ? `authority-mismatch:${authorityMismatchDisplay}` : null,
  ])

  return {
    status: driftingSignals.length > 0
      ? 'drift'
      : missingSignals.length === 0
        ? 'grounded'
        : matchedSignals.length > 0
          ? 'partial'
          : 'missing',
    rendererTarget,
    bodyContinuityPhase,
    rendererRejoinSurfaceKey,
    runtimeProfile: normalizeText(runtimeDynamics?.profile),
    runtimeBodyState,
    runtimeContinuityMode,
    runtimeResidentEmotion,
    runtimeResidentDelivery,
    runtimeResidentFacialCue,
    runtimeResidentActionCue,
    playbackCueFacialCue,
    playbackCueActionCue,
    driverFaceCue: normalizeText(driverFaceCue),
    driverActionCue: normalizeText(driverActionCue),
    authorityMatchSummary,
    authorityMismatchSummary: authorityMismatchTechnicalSummary,
    authorityMismatchDisplay,
    prosodyAuthoritySummary,
    matchedSignals,
    missingSignals,
    driftingSignals,
    reasons: pushUnique([
      runtimeResidentFacialCue || runtimeResidentActionCue || runtimeResidentEmotion || runtimeResidentDelivery
        ? `Runtime dynamics still publish ${runtimeResidentFacialCue ?? 'n/a'}/${runtimeResidentActionCue ?? 'n/a'} with ${runtimeResidentEmotion ?? 'n/a'}/${runtimeResidentDelivery ?? 'n/a'} output, so the renderer runtime is carrying the same embodiment projection rather than inventing a separate shell state.`
        : null,
      (playbackCueFacialCue || playbackCueActionCue || normalizeText(driverFaceCue) || normalizeText(driverActionCue))
        ? `Playback cue and driver execution both still consume ${playbackCueFacialCue ?? normalizeText(driverFaceCue) ?? 'n/a'} and ${playbackCueActionCue ?? normalizeText(driverActionCue) ?? 'n/a'}, so the visible face and action are the same ones projected by the resident line.`
        : null,
      embodiment
        ? 'Resident projection is still carrying one continuous manifestation line into renderer authority, so the visible embodiment remains downstream of persona-guided private thought rather than a detached renderer-only posture.'
        : null,
      authorityMatchSummary && rendererTarget
        ? `Authority matching remains ${authorityMatchSummary} on ${rendererTarget}, which shows the bound renderer segment is the one the desktop runtime actually executed.`
        : null,
      bodyContinuityPhase === 'body-only-hold'
        ? 'Body continuity is still the only lane carrying this same living segment, so the current embodiment should be read as one continuous her being held inward rather than as a renderer-neutral idle settle.'
        : null,
      bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
        ? `Body continuity is still carrying the same living segment while ${formatRendererManifestationLabel(rendererTarget)} rejoins that exact line, so the visible renderer recovery is a same-her manifestation repair instead of a fresh shell takeover.`
        : null,
      bodyContinuityPhase === 'full-cross-modal-lock'
        ? `Body continuity and ${formatRendererManifestationLabel(rendererTarget)} are now locked back onto the same living segment together, so voice, face, motion, and lipsync are re-forming one explicit same-her embodiment line instead of merely approximating it.`
        : null,
      bodyContinuityPhase === 'renderer-rejoin-without-body'
        ? `Renderer lanes have rejoined on ${formatRendererManifestationLabel(rendererTarget)}, but the body line is no longer carrying that same living segment, so the visible recovery should still be treated as same-her drift risk rather than a completed embodiment repair.`
        : null,
      companionshipReasonSummary
        ? `Companionship restraint is still carrying "${companionshipReasonSummary}", so renderer authority is preserving the same lower-pressure relationship line instead of flattening the body back into a generic technical settle.`
        : null,
      prosodyAuthorityReason,
      rendererDriftSummary
        ? `Renderer drift still shows ${rendererDriftSummary}, so the visible face is diverging after mind-to-render projection rather than before it.`
        : null,
      sameHerFrameAligned === false && scopedSameHerFrameSummary
        ? `VRM same-her frame evidence reports ${scopedSameHerFrameSummary}, so self-evolution should treat this as an embodiment lane drift inside the same digital-life thread rather than a separate renderer personality.`
        : null,
      sameHerExecutionAligned === false && scopedSameHerExecutionSummary
        ? `Live2D same-her execution evidence reports ${scopedSameHerExecutionSummary}, so self-evolution should treat this as an execution-lane drift inside the same digital-life thread rather than a separate Live2D shell personality.`
        : null,
      authorityMismatchDisplay,
    ]),
  }
}
