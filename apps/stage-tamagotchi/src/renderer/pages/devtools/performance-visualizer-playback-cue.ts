import type { PerformanceVisualizerAuthorityDriver, PerformanceVisualizerRendererTarget } from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerLive2DAuthorityComparisonView } from './performance-visualizer-live2d-authority'
import type { PerformanceVisualizerRuntimeDiagnosticSummaryEntry } from './performance-visualizer-runtime-diagnostic-summary'
import type { PerformanceVisualizerVrmAuthorityComparisonView } from './performance-visualizer-vrm-authority'

import {
  formatDriverAuthorityBindingSummary,
  formatDriverAuthorityMatchSummary,

  resolveDriverMatchFlagFromAuthoritySummary,
  resolveDriverMatchFlagFromSummary,
} from './performance-visualizer-driver-authority'
import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './performance-visualizer-prosody-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'
import {
  buildPlaybackCueAuthoritySummaryEntries,

  resolveAuthorityTrustSummaryFromSettleAuthority,
} from './performance-visualizer-runtime-diagnostic-summary'

export interface PerformanceVisualizerPlaybackCueAuthorityView {
  cueId: string
  authoritySegmentId: string | null
  authorityRendererTarget: PerformanceVisualizerRendererTarget
  authorityMatchedDrivers: PerformanceVisualizerAuthorityDriver[]
  authoritySources: string[]
  bodyContinuitySummary?: string | null
  embodimentClosureStage?: string | null
  authorityTrustSummary?: string | null
  prosodyAuthoritySummary?: string | null
  traceEmbodimentSummary?: string | null
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  reasonTags?: string[]
  signature?: string | null
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
  authorityBindingSummary: string | null
  authorityMatchSummary: string | null
  settleAuthoritySummary: string | null
  summaryEntries?: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[]
  preferredExpressionAliases?: string[]
  preferredMotionAliases?: string[]
  live2dFacialReleaseMs?: number | null
  live2dMotionFollowThroughMs?: number | null
  vrmActionFadeMs?: number | null
  vrmExpressionBlendMs?: number | null
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function normalizeAliasList(values: unknown) {
  return Array.isArray(values)
    ? values
        .map(item => normalizeText(item))
        .filter((item): item is string => Boolean(item))
        .filter((item, index, items) => items.indexOf(item) === index)
    : []
}

function normalizeDriverList(values: unknown): PerformanceVisualizerAuthorityDriver[] {
  return Array.isArray(values)
    ? values.filter((value): value is PerformanceVisualizerAuthorityDriver =>
        value === 'body' || value === 'face' || value === 'motion' || value === 'lipsync' || value === 'voice',
      )
    : []
}

function normalizeNumber(value: unknown) {
  return Number.isFinite(value)
    ? Number(value)
    : null
}

function normalizeReasonSummary(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return normalizeText(match?.[1])
}

function extractStructuredContinuitySegmentIds(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized) {
    return {
      authoritySegmentId: null,
      summarySegmentId: null,
      performanceSegmentId: null,
      speechSegmentId: null,
    }
  }

  return {
    authoritySegmentId: normalizeText(normalized.match(/(?:^|\s|\|)authority=([^|\s]+)/)?.[1]),
    summarySegmentId: normalizeText(normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)?.[1]),
    performanceSegmentId: normalizeText(normalized.match(/(?:^|\s|\|)performance=([^|\s]+)/)?.[1]),
    speechSegmentId: normalizeText(normalized.match(/(?:^|\s|\|)speech=([^|\s]+)/)?.[1]),
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

function structuredContinuitySummaryMatchesScopedSegment(summary: string | null | undefined, activeSegmentId: string | null | undefined) {
  const segmentIds = extractStructuredContinuitySegmentIds(summary)
  return [
    segmentIds.authoritySegmentId,
    segmentIds.summarySegmentId,
    segmentIds.performanceSegmentId,
    segmentIds.speechSegmentId,
  ].every(segmentId => matchesScopedSegment(segmentId, activeSegmentId))
}

function extractEmbodimentClosureStage(...summaries: Array<string | null | undefined>) {
  for (const summary of summaries) {
    const normalized = summary?.trim() ?? ''
    if (!normalized)
      continue
    if (
      /(?:^|\s|\|)timing=body-lipsync-carry(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+lipsync-only(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+voice-only(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+face\+motion-only(?:\s|\||$)/.test(normalized)
    ) {
      return 'body-carried-to-renderer-rejoin'
    }
    if (
      /(?:^|\s|\|)lane=body\+lipsync\+voice-only(?:\s|\||$)/.test(normalized)
    ) {
      return 'audible-body-carry'
    }
    if (
      normalized === 'face+lipsync-only'
      || normalized === 'motion+lipsync-only'
      || normalized === 'face+lipsync+voice-only'
      || normalized === 'motion+lipsync+voice-only'
      || normalized === 'face+motion+lipsync+voice-only'
    ) {
      return 'renderer-rejoin-without-body'
    }
    if (
      normalized === 'audible-body-carry'
      || normalized === 'full-driver-rejoin'
      || normalized === 'body-only-hold'
      || normalized === 'body-carried-to-renderer-rejoin'
      || normalized === 'full-cross-modal-lock'
      || normalized === 'renderer-rejoin-without-body'
      || normalized === 'voice-lipsync-carry'
    ) {
      return normalized
    }
    const match = normalized.match(/(?:^|\s|\|)(?:closure|lane)=(face\+lipsync-only|motion\+lipsync-only|face\+lipsync\+voice-only|motion\+lipsync\+voice-only|face\+motion\+lipsync\+voice-only|audible-body-carry|full-driver-rejoin|body-only-hold|body-carried-to-renderer-rejoin|full-cross-modal-lock|renderer-rejoin-without-body|voice-lipsync-carry)(?:\s|\||$)/)
    if (match?.[1]) {
      if (
        match[1] === 'face+lipsync-only'
        || match[1] === 'motion+lipsync-only'
        || match[1] === 'face+lipsync+voice-only'
        || match[1] === 'motion+lipsync+voice-only'
        || match[1] === 'face+motion+lipsync+voice-only'
      ) {
        return 'renderer-rejoin-without-body'
      }
      return match[1]
    }
  }

  return null
}

function resolveCueScopedContinuitySummaries(input: {
  cueId: string
  live2dAuthorityView?: Pick<
    PerformanceVisualizerLive2DAuthorityComparisonView,
    'continuityExecutionAuthoritySegmentId' | 'continuityExecutionSummary'
  > | null
  vrmAuthorityView?: Pick<
    PerformanceVisualizerVrmAuthorityComparisonView,
    'continuityFramePerformanceSegmentId' | 'continuityFrameSpeechSegmentId' | 'continuityFrameSummary'
  > | null
}) {
  const live2dContinuityExecutionSummary = (() => {
    const summary = normalizeText(input.live2dAuthorityView?.continuityExecutionSummary)
    if (!summary)
      return null

    const authoritySegmentId = normalizeText(input.live2dAuthorityView?.continuityExecutionAuthoritySegmentId)
    if (!matchesScopedSegment(authoritySegmentId, input.cueId))
      return null
    if (!structuredContinuitySummaryMatchesScopedSegment(summary, input.cueId))
      return null

    return summary
  })()

  const vrmContinuityFrameSummary = (() => {
    const summary = normalizeText(input.vrmAuthorityView?.continuityFrameSummary)
    if (!summary)
      return null

    const performanceSegmentId = normalizeText(input.vrmAuthorityView?.continuityFramePerformanceSegmentId)
    const speechSegmentId = normalizeText(input.vrmAuthorityView?.continuityFrameSpeechSegmentId)
    if (!matchesScopedSegment(performanceSegmentId, input.cueId))
      return null
    if (!matchesScopedSegment(speechSegmentId, input.cueId))
      return null
    if (!structuredContinuitySummaryMatchesScopedSegment(summary, input.cueId))
      return null

    return summary
  })()

  return {
    live2dContinuityExecutionSummary,
    vrmContinuityFrameSummary,
  }
}

function resolveSharedDriverReasonSummary(input: {
  cueId: string | null
  driverSummary?: {
    face?: {
      segmentId?: string | null
      reasonSummary?: string | null
    } | null
    motion?: {
      segmentId?: string | null
      reasonSummary?: string | null
    } | null
    lipsync?: {
      segmentId?: string | null
      reasonSummary?: string | null
    } | null
  } | null
}) {
  const cueId = normalizeText(input.cueId)
  const reasons = [
    input.driverSummary?.face,
    input.driverSummary?.motion,
    input.driverSummary?.lipsync,
  ]
    .filter((driver): driver is NonNullable<typeof driver> => Boolean(driver))
    .filter(driver => !cueId || normalizeText(driver.segmentId) === cueId)
    .map(driver => normalizeReasonSummary(driver.reasonSummary))
    .filter((reason): reason is string => Boolean(reason))

  if (reasons.length === 0)
    return null

  return reasons.every(reason => reason === reasons[0])
    ? reasons[0]
    : null
}

function appendSettleAuthorityReasonSummary(
  summary: string | null,
  reasonSummary: string | null,
) {
  if (!summary || !reasonSummary)
    return summary
  if (summary.includes(`reason=${reasonSummary}`) || summary.includes(reasonSummary))
    return summary
  return `${summary} | reason=${reasonSummary}`
}

function buildSettleAuthoritySummary(input: {
  authoritySegmentId: string | null
  authorityRendererTarget: PerformanceVisualizerRendererTarget
  authorityMatchedDrivers: PerformanceVisualizerAuthorityDriver[]
  authoritySources: string[]
}) {
  const hasAuthorityBinding = Boolean(
    input.authoritySegmentId
    || input.authorityRendererTarget
    || input.authorityMatchedDrivers.length > 0
    || input.authoritySources.length > 0,
  )
  if (!hasAuthorityBinding)
    return null

  return `authority-bound | segment=${input.authoritySegmentId ?? 'n/a'} | target=${input.authorityRendererTarget ?? 'n/a'} | drivers=${input.authorityMatchedDrivers.join(', ') || 'n/a'} | sources=${input.authoritySources.join(', ') || 'n/a'}`
}

function resolveMatchedDriversFromLaneTruth(input: {
  matchedDrivers: PerformanceVisualizerAuthorityDriver[]
  bodySegmentMatched: boolean | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  voiceSegmentMatched: boolean | null
}) {
  const resolved = [
    input.bodySegmentMatched === true ? 'body' : null,
    input.faceSegmentMatched === true ? 'face' : null,
    input.motionSegmentMatched === true ? 'motion' : null,
    input.lipsyncSegmentMatched === true ? 'lipsync' : null,
    input.voiceSegmentMatched === true ? 'voice' : null,
  ].filter((driver): driver is PerformanceVisualizerAuthorityDriver => Boolean(driver))

  return resolved.length > 0 ? resolved : input.matchedDrivers
}

function resolveVoiceSegmentMatched(input: {
  authoritySegmentId: string | null | undefined
  prosodyAuthoritySummary: string | null | undefined
  telemetryProsodySegmentId: string | null | undefined
}) {
  const authoritySegmentId = normalizeText(input.authoritySegmentId)
  if (!authoritySegmentId)
    return null

  const voiceSegmentId = extractStructuredSegmentId(input.prosodyAuthoritySummary)
    ?? normalizeText(input.telemetryProsodySegmentId)
  if (!voiceSegmentId)
    return null

  return authoritySegmentId === voiceSegmentId
}

function appendLaneTruthToDescriptiveAuthoritySummary(input: {
  summary: string | null | undefined
  matchSummary?: string | null
  matchedDrivers?: PerformanceVisualizerAuthorityDriver[] | null
  authorityMismatchSummary?: string | null
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
}) {
  const summary = normalizeText(input.summary)
  if (!summary)
    return null

  const alreadyStructured = ['body', 'face', 'motion', 'lipsync'].some(driver =>
    resolveDriverMatchFlagFromSummary(summary, driver as 'body' | 'face' | 'motion' | 'lipsync') != null,
  )
  if (alreadyStructured)
    return summary

  const bodySegmentMatched = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: input.matchSummary,
    matchedDrivers: input.matchedDrivers,
    authorityMismatchSummary: input.authorityMismatchSummary,
    driver: 'body',
  }) ?? input.bodySegmentMatched ?? null
  const faceSegmentMatched = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: input.matchSummary,
    matchedDrivers: input.matchedDrivers,
    authorityMismatchSummary: input.authorityMismatchSummary,
    driver: 'face',
  }) ?? input.faceSegmentMatched ?? null
  const motionSegmentMatched = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: input.matchSummary,
    matchedDrivers: input.matchedDrivers,
    authorityMismatchSummary: input.authorityMismatchSummary,
    driver: 'motion',
  }) ?? input.motionSegmentMatched ?? null
  const lipsyncSegmentMatched = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: input.matchSummary,
    matchedDrivers: input.matchedDrivers,
    authorityMismatchSummary: input.authorityMismatchSummary,
    driver: 'lipsync',
  }) ?? input.lipsyncSegmentMatched ?? null

  const laneDisplay = [
    bodySegmentMatched != null
      ? bodySegmentMatched ? '身体命中' : '身体未命中'
      : null,
    faceSegmentMatched == null ? '表情未知' : faceSegmentMatched ? '表情命中' : '表情未命中',
    motionSegmentMatched == null ? '动作未知' : motionSegmentMatched ? '动作命中' : '动作未命中',
    lipsyncSegmentMatched == null ? '口型未知' : lipsyncSegmentMatched ? '口型命中' : '口型未命中',
    input.voiceSegmentMatched == null ? null : input.voiceSegmentMatched ? '声音命中' : '声音未命中',
  ].filter((part): part is string => Boolean(part)).join(' / ')
  if (!laneDisplay || laneDisplay === '身体未知 / 表情未知 / 动作未知 / 口型未知')
    return summary
  if (summary.includes(laneDisplay))
    return summary

  return `${summary} | ${laneDisplay}`
}

export function buildPlaybackCueAuthorityView(snapshot: {
  speech?: {
    driverSummary?: {
      face?: {
        segmentId?: string | null
        reasonSummary?: string | null
      } | null
      motion?: {
        segmentId?: string | null
        reasonSummary?: string | null
      } | null
      lipsync?: {
        segmentId?: string | null
        reasonSummary?: string | null
      } | null
    } | null
    authoritySummary?: {
      cueId?: string | null
      segmentId?: string | null
      rendererTarget?: PerformanceVisualizerRendererTarget
      matchedDrivers?: PerformanceVisualizerAuthorityDriver[]
      matchedSources?: string[]
      bodyContinuitySummary?: string | null
      embodimentClosureStage?: string | null
      bindingSummary?: string | null
      matchSummary?: string | null
      authorityTrustSummary?: string | null
      prosodyAuthoritySummary?: string | null
      settleSummary?: string | null
      traceEmbodimentSummary?: string | null
    } | null
    playbackTelemetry?: {
      rendererTarget?: PerformanceVisualizerRendererTarget
      driverAuthority?: {
        segmentId?: string | null
        rendererTarget?: PerformanceVisualizerRendererTarget
        matchedDrivers?: PerformanceVisualizerAuthorityDriver[]
        sources?: string[]
        bodySegmentMatched?: boolean | null
        faceSegmentMatched?: boolean | null
        motionSegmentMatched?: boolean | null
        lipsyncSegmentMatched?: boolean | null
        prosodyAuthority?: {
          segmentId?: string | null
          provenance?: 'authority-bound' | 'fallback-derived'
          source?: string | null
          mode?: string | null
          cueProsodyWeight?: number | null
          cueMouthWeight?: number | null
          cueHeadWeight?: number | null
          visemePeakWeight?: number | null
        } | null
      } | null
      prosodyAuthority?: {
        segmentId?: string | null
        provenance?: 'authority-bound' | 'fallback-derived'
        source?: string | null
        mode?: string | null
        cueProsodyWeight?: number | null
        cueMouthWeight?: number | null
        cueHeadWeight?: number | null
        visemePeakWeight?: number | null
      } | null
      cue?: {
        id?: string | null
        actionWindow?: string | null
        rendererHints?: {
          preferredExpressionAliases?: string[]
          preferredMotionAliases?: string[]
          preferredBlinkCadence?: string | null
          preferredGazeMode?: string | null
          residentMode?: string | null
          reasonTags?: string[]
          signature?: string | null
        } | null
        rendererSettle?: {
          live2dFacialReleaseMs?: number | null
          live2dMotionFollowThroughMs?: number | null
          vrmActionFadeMs?: number | null
          vrmExpressionBlendMs?: number | null
        } | null
      } | null
    } | null
  } | null
  live2dAuthorityView?: Pick<
    PerformanceVisualizerLive2DAuthorityComparisonView,
    'continuityExecutionAuthoritySegmentId' | 'continuityExecutionSummary'
  > | null
  vrmAuthorityView?: Pick<
    PerformanceVisualizerVrmAuthorityComparisonView,
    'continuityFramePerformanceSegmentId' | 'continuityFrameSpeechSegmentId' | 'continuityFrameSummary'
  > | null
} | null | undefined): PerformanceVisualizerPlaybackCueAuthorityView | null {
  const telemetry = snapshot?.speech?.playbackTelemetry
  const authority = telemetry?.driverAuthority
  const authoritySummary = snapshot?.speech?.authoritySummary ?? null
  const authoritySummaryCueId = normalizeText(authoritySummary?.cueId)
  const authoritySummarySegmentId = normalizeText(authoritySummary?.segmentId)
  const cue = snapshot?.speech?.playbackTelemetry?.cue
  const playbackCueId = normalizeText(cue?.id)
  const currentAuthoritySegmentId = normalizeText(authority?.segmentId) ?? playbackCueId ?? authoritySummaryCueId
  const cueId = playbackCueId ?? authoritySummaryCueId ?? currentAuthoritySegmentId
  if (!cueId)
    return null
  const authoritySummaryMatchesCue = !authoritySummaryCueId || authoritySummaryCueId === cueId
  const authoritySummaryMatchesSegment = matchesScopedSegment(authoritySummarySegmentId, currentAuthoritySegmentId)
  const preferUpstreamAuthoritySummary = authoritySummaryMatchesCue && authoritySummaryMatchesSegment && Boolean(authoritySummary)
  const authoritySegmentId = preferUpstreamAuthoritySummary
    ? authoritySummarySegmentId ?? currentAuthoritySegmentId
    : currentAuthoritySegmentId

  const authorityRendererTarget = preferUpstreamAuthoritySummary
    ? authoritySummary?.rendererTarget ?? authority?.rendererTarget ?? telemetry?.rendererTarget ?? null
    : authority?.rendererTarget ?? telemetry?.rendererTarget ?? null
  const authorityMatchedDrivers = preferUpstreamAuthoritySummary && authoritySummary?.matchedDrivers
    ? normalizeDriverList(authoritySummary.matchedDrivers)
    : normalizeDriverList(authority?.matchedDrivers)
  const authoritySources = preferUpstreamAuthoritySummary && authoritySummary?.matchedSources
    ? normalizeAliasList(authoritySummary.matchedSources)
    : normalizeAliasList(authority?.sources)
  const normalizedAuthorityBodyContinuitySummary = preferUpstreamAuthoritySummary
    ? normalizeText((authoritySummary as { bodyContinuitySummary?: string | null } | null | undefined)?.bodyContinuitySummary)
    : null
  const authorityBodyContinuitySegmentId = extractStructuredSegmentId(normalizedAuthorityBodyContinuitySummary)
  const bodyContinuitySummary = normalizedAuthorityBodyContinuitySummary && authorityBodyContinuitySegmentId && authorityBodyContinuitySegmentId !== cueId
    ? null
    : normalizedAuthorityBodyContinuitySummary
  const authoritySummaryMatchSummary = preferUpstreamAuthoritySummary
    ? normalizeText(authoritySummary?.matchSummary)
    : null
  const normalizedAuthorityProsodyAuthoritySummary = preferUpstreamAuthoritySummary
    ? normalizeText(authoritySummary?.prosodyAuthoritySummary)
    : null
  const authoritySummaryMatchedDrivers = preferUpstreamAuthoritySummary
    ? normalizeDriverList(authoritySummary?.matchedDrivers)
    : []
  const authorityMismatchSummary = preferUpstreamAuthoritySummary
    ? normalizeText((authoritySummary as { authorityMismatchSummary?: string | null } | null | undefined)?.authorityMismatchSummary)
    : null
  const bodySegmentMatched = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: authoritySummaryMatchSummary,
    matchedDrivers: authoritySummaryMatchedDrivers,
    authorityMismatchSummary,
    driver: 'body',
  })
  ?? (typeof authority?.bodySegmentMatched === 'boolean' ? authority.bodySegmentMatched : null)
  const faceSegmentMatched = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: authoritySummaryMatchSummary,
    matchedDrivers: authoritySummaryMatchedDrivers,
    authorityMismatchSummary,
    driver: 'face',
  })
  ?? (typeof authority?.faceSegmentMatched === 'boolean' ? authority.faceSegmentMatched : null)
  const motionSegmentMatched = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: authoritySummaryMatchSummary,
    matchedDrivers: authoritySummaryMatchedDrivers,
    authorityMismatchSummary,
    driver: 'motion',
  })
  ?? (typeof authority?.motionSegmentMatched === 'boolean' ? authority.motionSegmentMatched : null)
  const lipsyncSegmentMatched = resolveDriverMatchFlagFromAuthoritySummary({
    matchSummary: authoritySummaryMatchSummary,
    matchedDrivers: authoritySummaryMatchedDrivers,
    authorityMismatchSummary,
    driver: 'lipsync',
  })
  ?? (typeof authority?.lipsyncSegmentMatched === 'boolean' ? authority.lipsyncSegmentMatched : null)
  const resolvedProsodyAuthority = resolveProsodyAuthorityFromSources(telemetry)
  const voiceSegmentMatched = resolveVoiceSegmentMatched({
    authoritySegmentId,
    prosodyAuthoritySummary: normalizedAuthorityProsodyAuthoritySummary,
    telemetryProsodySegmentId: resolvedProsodyAuthority?.segmentId ?? null,
  })
  const resolvedAuthorityMatchedDrivers = resolveMatchedDriversFromLaneTruth({
    matchedDrivers: authorityMatchedDrivers,
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched,
  })
  const authorityBindingSummary = appendLaneTruthToDescriptiveAuthoritySummary({
    summary: preferUpstreamAuthoritySummary ? normalizeText(authoritySummary?.bindingSummary) : null,
    matchSummary: authoritySummaryMatchSummary,
    matchedDrivers: authoritySummaryMatchedDrivers,
    authorityMismatchSummary,
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched,
  })
  ?? (authorityRendererTarget || authorityMatchedDrivers.length > 0 || authoritySources.length > 0
    ? formatDriverAuthorityBindingSummary({
        rendererTarget: authorityRendererTarget,
        matchedDrivers: resolvedAuthorityMatchedDrivers,
        matchedSources: authoritySources,
        bodySegmentMatched,
        faceSegmentMatched,
        motionSegmentMatched,
        lipsyncSegmentMatched,
        voiceSegmentMatched,
      })
    : null)
  const authorityMatchSummary = appendLaneTruthToDescriptiveAuthoritySummary({
    summary: authoritySummaryMatchSummary,
    matchSummary: authoritySummaryMatchSummary,
    matchedDrivers: authoritySummaryMatchedDrivers,
    authorityMismatchSummary,
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched,
  }) ?? authoritySummaryMatchSummary ?? formatDriverAuthorityMatchSummary({
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched,
  })
  const sharedDriverReasonSummary = resolveSharedDriverReasonSummary({
    cueId,
    driverSummary: snapshot?.speech?.driverSummary ?? null,
  })
  const normalizedAuthoritySettleSummary = preferUpstreamAuthoritySummary && structuredSummaryMatchesScopedSegment(
    authoritySummary?.settleSummary,
    authoritySegmentId ?? cueId,
  )
    ? normalizeText(authoritySummary?.settleSummary)
    : null
  const settleAuthoritySummary = appendSettleAuthorityReasonSummary((normalizedAuthoritySettleSummary ?? buildSettleAuthoritySummary({
    authoritySegmentId,
    authorityRendererTarget,
    authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
    authoritySources,
  })), sharedDriverReasonSummary)
  const {
    live2dContinuityExecutionSummary,
    vrmContinuityFrameSummary,
  } = resolveCueScopedContinuitySummaries({
    cueId,
    live2dAuthorityView: snapshot?.live2dAuthorityView ?? null,
    vrmAuthorityView: snapshot?.vrmAuthorityView ?? null,
  })
  const embodimentClosureStage = extractEmbodimentClosureStage(
    preferUpstreamAuthoritySummary
      ? normalizeText((authoritySummary as { embodimentClosureStage?: string | null } | null | undefined)?.embodimentClosureStage)
      : null,
    live2dContinuityExecutionSummary,
    vrmContinuityFrameSummary,
    authorityBindingSummary,
    settleAuthoritySummary,
    bodyContinuitySummary,
  )
  const authorityProsodySegmentId = extractStructuredSegmentId(normalizedAuthorityProsodyAuthoritySummary)
  const scopedAuthorityProsodyAuthoritySummary = normalizedAuthorityProsodyAuthoritySummary && authorityProsodySegmentId && authorityProsodySegmentId !== cueId
    ? null
    : normalizedAuthorityProsodyAuthoritySummary
  const prosodyAuthoritySummary = scopedAuthorityProsodyAuthoritySummary ?? formatResolvedProsodyAuthoritySummary(resolvedProsodyAuthority)
  const residentMode = normalizeText(cue?.rendererHints?.residentMode)
  const actionWindow = normalizeText(cue?.actionWindow)
  const preferredBlinkCadence = normalizeText(cue?.rendererHints?.preferredBlinkCadence)
  const preferredGazeMode = normalizeText(cue?.rendererHints?.preferredGazeMode)
  const settleAuthorityTrustSummary = resolveAuthorityTrustSummaryFromSettleAuthority({
    authorityTrustSummary: null,
    authorityBindingSummary,
    settleAuthoritySummary,
    rendererTarget: authorityRendererTarget,
  })
  const normalizedAuthorityTrustSummary = preferUpstreamAuthoritySummary && structuredSummaryMatchesScopedSegment(
    authoritySummary?.authorityTrustSummary,
    authoritySegmentId ?? cueId,
  )
    ? normalizeText(authoritySummary?.authorityTrustSummary)
    : null
  const authorityTrustSummary = settleAuthorityTrustSummary
    ?? resolveAuthorityTrustSummaryWithFallback({
      authorityTrustSummary: normalizedAuthorityTrustSummary,
      authorityBindingSummary,
      settleAuthoritySummary,
      rendererTarget: authorityRendererTarget,
      preferredBlinkCadence,
      preferredGazeMode,
      residentMode,
      actionWindow,
      prosodyAuthoritySummary,
      authoritySegmentId,
      authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
      bodySegmentMatched,
      faceSegmentMatched,
      motionSegmentMatched,
      lipsyncSegmentMatched,
      voiceSegmentMatched,
    })
  const traceEmbodimentSummary = preferUpstreamAuthoritySummary
    ? normalizeText(authoritySummary?.traceEmbodimentSummary)
    : null
  const preferredExpressionAliases = normalizeAliasList(cue?.rendererHints?.preferredExpressionAliases)
  const preferredMotionAliases = normalizeAliasList(cue?.rendererHints?.preferredMotionAliases)
  const reasonTags = normalizeAliasList(cue?.rendererHints?.reasonTags)
  const signature = normalizeText(cue?.rendererHints?.signature)
  const live2dFacialReleaseMs = normalizeNumber(cue?.rendererSettle?.live2dFacialReleaseMs)
  const live2dMotionFollowThroughMs = normalizeNumber(cue?.rendererSettle?.live2dMotionFollowThroughMs)
  const vrmActionFadeMs = normalizeNumber(cue?.rendererSettle?.vrmActionFadeMs)
  const vrmExpressionBlendMs = normalizeNumber(cue?.rendererSettle?.vrmExpressionBlendMs)
  const summaryEntries = buildPlaybackCueAuthoritySummaryEntries({
    cueId,
    authoritySegmentId,
    authorityRendererTarget,
    authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
    authoritySources,
    ...(embodimentClosureStage ? { embodimentClosureStage } : {}),
    authorityTrustSummary,
    prosodyAuthoritySummary,
    traceEmbodimentSummary,
    residentMode,
    preferredBlinkCadence,
    preferredGazeMode,
    ...(reasonTags.length > 0 ? { reasonTags } : {}),
    ...(signature ? { signature } : {}),
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched,
    authorityBindingSummary,
    authorityMatchSummary,
    settleAuthoritySummary,
    preferredExpressionAliases,
    preferredMotionAliases,
    live2dFacialReleaseMs,
    live2dMotionFollowThroughMs,
    vrmActionFadeMs,
    vrmExpressionBlendMs,
  })

  return {
    cueId,
    authoritySegmentId,
    authorityRendererTarget,
    authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
    authoritySources,
    bodyContinuitySummary,
    ...(embodimentClosureStage ? { embodimentClosureStage } : {}),
    authorityTrustSummary,
    prosodyAuthoritySummary,
    traceEmbodimentSummary,
    residentMode,
    preferredBlinkCadence,
    preferredGazeMode,
    ...(reasonTags.length > 0 ? { reasonTags } : {}),
    ...(signature ? { signature } : {}),
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched,
    authorityBindingSummary,
    authorityMatchSummary,
    settleAuthoritySummary,
    summaryEntries,
    preferredExpressionAliases,
    preferredMotionAliases,
    live2dFacialReleaseMs,
    live2dMotionFollowThroughMs,
    vrmActionFadeMs,
    vrmExpressionBlendMs,
  }
}
