import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerAuthorityDriver, PerformanceVisualizerRendererTarget } from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerLive2DAuthorityComparisonView } from './performance-visualizer-live2d-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerRuntimeDiagnosticSummaryEntry, PerformanceVisualizerTraceTelemetrySummary } from './performance-visualizer-runtime-diagnostic-summary'
import type { PerformanceVisualizerVrmAuthorityComparisonView } from './performance-visualizer-vrm-authority'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import { resolveAuthorityLaneTruth } from './performance-visualizer-authority-lane-truth'
import {

  resolveDriverMatchFlagFromAuthoritySummary,
  resolveDriverMatchFlagFromSummary,
} from './performance-visualizer-driver-authority'
import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './performance-visualizer-prosody-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'
import {
  buildRuntimeAuthoritySummaryEntries,
  buildTraceTelemetrySummaryEntries,

  resolveAuthorityTrustSummaryFromSettleAuthority,
} from './performance-visualizer-runtime-diagnostic-summary'
import { buildTraceTelemetrySummary } from './performance-visualizer-trace-telemetry'

export interface PerformanceVisualizerRuntimeAuthorityOverview {
  rendererTarget: PerformanceVisualizerRendererTarget
  authoritySegmentId: string | null
  authorityBindingSummary: string | null
  authorityMatchSummary: string | null
  bodyContinuitySummary?: string | null
  embodimentClosureStage?: string | null
  authorityTrustSummary?: string | null
  sameHerSignature?: string | null
  sameHerReasonTags?: string[] | null
  runtimeMemoryClosureIdentityKey?: string | null
  runtimeMemoryClosureIdentityReasonTags?: string[] | null
  sameHerFrameAligned?: boolean | null
  sameHerFrameMismatchDrivers?: string[] | null
  sameHerFramePerformanceSegmentId?: string | null
  sameHerFrameSpeechSegmentId?: string | null
  sameHerFrameSummary?: string | null
  sameHerExecutionAligned?: boolean | null
  sameHerExecutionAuthoritySegmentId?: string | null
  sameHerExecutionMismatchDrivers?: string[] | null
  sameHerExecutionSummary?: string | null
  prosodyAuthoritySummary: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
  authorityMismatchSummary: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  settleAuthoritySummary: string | null
  traceEmbodimentSummary?: string | null
  summaryEntries?: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[]
  traceSummary: PerformanceVisualizerTraceTelemetrySummary | null
  traceSummaryEntries?: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[]
}

function normalizeTraceSummaryCueId(
  traceSummary: (Omit<PerformanceVisualizerTraceTelemetrySummary, 'segmentBinding'> & {
    segmentBinding: PerformanceVisualizerTraceTelemetrySummary['segmentBinding'] | null
  }) | null | undefined,
  cueId: string | null,
): PerformanceVisualizerTraceTelemetrySummary | null {
  if (!traceSummary)
    return null

  const segmentBinding = traceSummary.segmentBinding
  if (!segmentBinding)
    return null

  const normalizedTraceSummary = {
    ...traceSummary,
    segmentBinding,
  }

  if (normalizedTraceSummary.cueId || !cueId)
    return normalizedTraceSummary

  return {
    ...normalizedTraceSummary,
    cueId,
  }
}

function normalizeRuntimeReasonSummary(value: string | null | undefined) {
  const normalized = value?.trim() ?? ''
  return normalized.length > 0 ? normalized : null
}

function normalizeRuntimeAuthorityRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function normalizeRuntimeAuthorityString(value: unknown) {
  return typeof value === 'string' ? normalizeRuntimeReasonSummary(value) : null
}

function normalizeRuntimeAuthorityStringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .map(normalizeRuntimeAuthorityString)
        .filter((item): item is string => Boolean(item))
        .filter((item, index, items) => items.indexOf(item) === index)
    : []
}

function readRuntimeMemoryClosureIdentityFromCausality(value: unknown) {
  const causality = normalizeRuntimeAuthorityRecord(value)
  if (!causality || causality.causedByMemoryClosure !== true)
    return null

  const memoryIdentity = normalizeRuntimeAuthorityRecord(causality.memoryIdentity)
  const continuityKey = normalizeRuntimeAuthorityString(memoryIdentity?.continuityKey)
    ?? normalizeRuntimeAuthorityStringList(memoryIdentity?.selectedCandidateIds)[0]
    ?? null
  if (!continuityKey)
    return null

  return {
    continuityKey,
    reasonTags: normalizeRuntimeAuthorityStringList(memoryIdentity?.reasonTags),
  }
}

function resolveRuntimeMemoryClosureIdentity(runtimeDigest: unknown) {
  const digest = normalizeRuntimeAuthorityRecord(runtimeDigest)
  const derivedMindStateBundle = normalizeRuntimeAuthorityRecord(digest?.derivedMindStateBundle)
  if (!derivedMindStateBundle)
    return null

  const emotionalTransitionLedger = normalizeRuntimeAuthorityRecord(derivedMindStateBundle.emotionalTransitionLedger)
  const initiativeSuppression = normalizeRuntimeAuthorityRecord(emotionalTransitionLedger?.initiativeSuppression)
  const learningExecutionState = normalizeRuntimeAuthorityRecord(derivedMindStateBundle.learningExecutionState)
  const embodimentContinuityLedger = normalizeRuntimeAuthorityRecord(derivedMindStateBundle.embodimentContinuityLedger)

  return [
    readRuntimeMemoryClosureIdentityFromCausality(emotionalTransitionLedger?.memoryClosureCausality),
    readRuntimeMemoryClosureIdentityFromCausality(initiativeSuppression?.memoryClosureCausality),
    readRuntimeMemoryClosureIdentityFromCausality(learningExecutionState?.memoryClosureCausality),
    readRuntimeMemoryClosureIdentityFromCausality(embodimentContinuityLedger?.memoryClosureCausality),
  ].find((candidate): candidate is { continuityKey: string, reasonTags: string[] } => Boolean(candidate)) ?? null
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = normalizeRuntimeReasonSummary(summary)
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return normalizeRuntimeReasonSummary(match?.[1] ?? null)
}

function extractStructuredSameHerSegmentIds(summary: string | null | undefined) {
  const normalized = normalizeRuntimeReasonSummary(summary)
  if (!normalized) {
    return {
      authoritySegmentId: null,
      summarySegmentId: null,
      performanceSegmentId: null,
      speechSegmentId: null,
    }
  }

  return {
    authoritySegmentId: normalizeRuntimeReasonSummary(normalized.match(/(?:^|\s|\|)authority=([^|\s]+)/)?.[1] ?? null),
    summarySegmentId: normalizeRuntimeReasonSummary(normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)?.[1] ?? null),
    performanceSegmentId: normalizeRuntimeReasonSummary(normalized.match(/(?:^|\s|\|)performance=([^|\s]+)/)?.[1] ?? null),
    speechSegmentId: normalizeRuntimeReasonSummary(normalized.match(/(?:^|\s|\|)speech=([^|\s]+)/)?.[1] ?? null),
  }
}

function matchesScopedSegment(segmentId: string | null | undefined, activeSegmentId: string | null | undefined) {
  const normalizedSegmentId = normalizeRuntimeReasonSummary(segmentId)
  const normalizedActiveSegmentId = normalizeRuntimeReasonSummary(activeSegmentId)
  return !normalizedSegmentId || !normalizedActiveSegmentId || normalizedSegmentId === normalizedActiveSegmentId
}

function structuredSummaryMatchesScopedSegment(summary: string | null | undefined, activeSegmentId: string | null | undefined) {
  const structuredSegmentId = extractStructuredSegmentId(summary)
  return matchesScopedSegment(structuredSegmentId, activeSegmentId)
}

function structuredSameHerSummaryMatchesScopedSegment(summary: string | null | undefined, activeSegmentId: string | null | undefined) {
  const segmentIds = extractStructuredSameHerSegmentIds(summary)
  return [
    segmentIds.authoritySegmentId,
    segmentIds.summarySegmentId,
    segmentIds.performanceSegmentId,
    segmentIds.speechSegmentId,
  ].every(segmentId => matchesScopedSegment(segmentId, activeSegmentId))
}

function resolveSameHerEvidenceBelongsToActiveSegment(input: {
  activeSegmentId: string | null | undefined
  summary: string | null | undefined
  segmentIds?: Array<string | null | undefined>
}) {
  const normalizedActiveSegmentId = normalizeRuntimeReasonSummary(input.activeSegmentId)
  if (!normalizedActiveSegmentId)
    return true

  const summarySegmentIds = extractStructuredSameHerSegmentIds(input.summary)
  const candidateSegmentIds = [
    ...(input.segmentIds ?? []),
    summarySegmentIds.authoritySegmentId,
    summarySegmentIds.summarySegmentId,
    summarySegmentIds.performanceSegmentId,
    summarySegmentIds.speechSegmentId,
  ]
    .map(segmentId => normalizeRuntimeReasonSummary(segmentId))
    .filter((segmentId): segmentId is string => Boolean(segmentId))
    .filter((segmentId, index, segmentIds) => segmentIds.indexOf(segmentId) === index)

  if (candidateSegmentIds.length === 0)
    return true

  return candidateSegmentIds.includes(normalizedActiveSegmentId)
}

function resolveCueScopedSameHerSummaries(input: {
  cueId: string | null
  live2dAuthorityView?: Pick<
    PerformanceVisualizerLive2DAuthorityComparisonView,
    'sameHerExecutionAuthoritySegmentId' | 'sameHerExecutionSummary'
  > | null
  vrmAuthorityView?: Pick<
    PerformanceVisualizerVrmAuthorityComparisonView,
    'sameHerFramePerformanceSegmentId' | 'sameHerFrameSpeechSegmentId' | 'sameHerFrameSummary'
  > | null
}) {
  const live2dSameHerExecutionSummary = (() => {
    const summary = normalizeRuntimeReasonSummary(input.live2dAuthorityView?.sameHerExecutionSummary)
    if (!summary)
      return null

    const authoritySegmentId = normalizeRuntimeReasonSummary(input.live2dAuthorityView?.sameHerExecutionAuthoritySegmentId)
    if (!matchesScopedSegment(authoritySegmentId, input.cueId))
      return null
    if (!structuredSameHerSummaryMatchesScopedSegment(summary, input.cueId))
      return null

    return summary
  })()

  const vrmSameHerFrameSummary = (() => {
    const summary = normalizeRuntimeReasonSummary(input.vrmAuthorityView?.sameHerFrameSummary)
    if (!summary)
      return null

    const performanceSegmentId = normalizeRuntimeReasonSummary(input.vrmAuthorityView?.sameHerFramePerformanceSegmentId)
    const speechSegmentId = normalizeRuntimeReasonSummary(input.vrmAuthorityView?.sameHerFrameSpeechSegmentId)
    if (!matchesScopedSegment(performanceSegmentId, input.cueId))
      return null
    if (!matchesScopedSegment(speechSegmentId, input.cueId))
      return null
    if (!structuredSameHerSummaryMatchesScopedSegment(summary, input.cueId))
      return null

    return summary
  })()

  return {
    live2dSameHerExecutionSummary,
    vrmSameHerFrameSummary,
  }
}

function resolveVoiceSegmentMatched(input: {
  authoritySegmentId: string | null | undefined
  voiceSummary: string | null | undefined
}) {
  const authoritySegmentId = normalizeRuntimeReasonSummary(input.authoritySegmentId)
  if (!authoritySegmentId)
    return null

  const voiceSegmentId = extractStructuredSegmentId(input.voiceSummary)
  if (!voiceSegmentId)
    return null

  return authoritySegmentId === voiceSegmentId
}

function resolveRuntimeAuthorityProsodySummary(input: {
  authoritySegmentId: string | null | undefined
  authoritySummaryProsodyAuthoritySummary?: string | null | undefined
  speechEvidenceProsodyAuthoritySummary?: string | null | undefined
  playbackCueProsodyAuthoritySummary?: string | null | undefined
  resolvedProsodyAuthority: ReturnType<typeof resolveProsodyAuthorityFromSources>
}) {
  const candidateSummaries = [
    input.authoritySummaryProsodyAuthoritySummary,
    input.playbackCueProsodyAuthoritySummary,
    input.speechEvidenceProsodyAuthoritySummary,
  ]
    .map(summary => normalizeRuntimeReasonSummary(summary))
    .filter((summary): summary is string => Boolean(summary))

  for (const summary of candidateSummaries) {
    if (structuredSummaryMatchesScopedSegment(summary, input.authoritySegmentId))
      return summary
  }

  const resolvedSummary = formatResolvedProsodyAuthoritySummary(input.resolvedProsodyAuthority)
  return resolvedSummary && structuredSummaryMatchesScopedSegment(resolvedSummary, input.authoritySegmentId)
    ? resolvedSummary
    : null
}

function resolveSharedDriverReasonSummary(input: {
  cueId: string | null | undefined
  driverSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary'] | null | undefined
}) {
  const cueId = input.cueId?.trim() ?? null
  const reasonSummaries = [
    input.driverSummary?.face,
    input.driverSummary?.motion,
    input.driverSummary?.lipsync,
  ]
    .filter((driver): driver is NonNullable<typeof driver> => Boolean(driver))
    .filter(driver => !cueId || driver.segmentId === cueId)
    .map(driver => normalizeRuntimeReasonSummary(driver.reasonSummary))
    .filter((reason): reason is string => Boolean(reason))

  if (reasonSummaries.length === 0)
    return null

  const [sharedReason] = reasonSummaries
  return reasonSummaries.every(reason => reason === sharedReason)
    ? sharedReason
    : null
}

function resolveSharedDriverCadence(input: {
  cueId: string | null | undefined
  driverSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary'] | null | undefined
}) {
  const cueId = input.cueId?.trim() ?? null
  const relevantDrivers = [
    input.driverSummary?.face,
    input.driverSummary?.motion,
    input.driverSummary?.lipsync,
  ]
    .filter((driver): driver is NonNullable<typeof driver> => Boolean(driver))
    .filter(driver => !cueId || driver.segmentId === cueId)

  const preferredBlinkCadences = [...new Set(relevantDrivers
    .map(driver => normalizeRuntimeReasonSummary(driver.preferredBlinkCadence))
    .filter((value): value is string => Boolean(value)))]
  const preferredGazeModes = [...new Set(relevantDrivers
    .map(driver => normalizeRuntimeReasonSummary(driver.preferredGazeMode))
    .filter((value): value is string => Boolean(value)))]

  return {
    preferredBlinkCadence: preferredBlinkCadences.length === 1 ? preferredBlinkCadences[0] : null,
    preferredGazeMode: preferredGazeModes.length === 1 ? preferredGazeModes[0] : null,
  }
}

function buildTraceAuthoritySeed(
  playbackCueAuthorityView: PerformanceVisualizerPlaybackCueAuthorityView | null,
) {
  return playbackCueAuthorityView
    ? {
        authoritySegmentId: playbackCueAuthorityView.authoritySegmentId,
        authorityRendererTarget: playbackCueAuthorityView.authorityRendererTarget,
        authorityMatchedDrivers: playbackCueAuthorityView.authorityMatchedDrivers,
        authoritySources: playbackCueAuthorityView.authoritySources,
        bodySegmentMatched: playbackCueAuthorityView.bodySegmentMatched ?? null,
        faceSegmentMatched: playbackCueAuthorityView.faceSegmentMatched ?? null,
        motionSegmentMatched: playbackCueAuthorityView.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: playbackCueAuthorityView.lipsyncSegmentMatched ?? null,
        voiceSegmentMatched: playbackCueAuthorityView.voiceSegmentMatched ?? null,
      }
    : null
}

function resolveFallbackDriverCadence(
  driverSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary'] | null | undefined,
) {
  const relevantDrivers = [
    driverSummary?.face,
    driverSummary?.motion,
    driverSummary?.lipsync,
  ].filter((driver): driver is NonNullable<typeof driver> => Boolean(driver))

  const preferredBlinkCadences = [...new Set(relevantDrivers
    .map(driver => normalizeRuntimeReasonSummary(driver.preferredBlinkCadence))
    .filter((value): value is string => Boolean(value)))]
  const preferredGazeModes = [...new Set(relevantDrivers
    .map(driver => normalizeRuntimeReasonSummary(driver.preferredGazeMode))
    .filter((value): value is string => Boolean(value)))]

  return {
    preferredBlinkCadence: preferredBlinkCadences.length === 1 ? preferredBlinkCadences[0] : null,
    preferredGazeMode: preferredGazeModes.length === 1 ? preferredGazeModes[0] : null,
  }
}

function appendSettleAuthorityReasonSummary(
  summary: string | null | undefined,
  reasonSummary: string | null | undefined,
) {
  const normalizedSummary = summary?.trim() ?? null
  const normalizedReason = normalizeRuntimeReasonSummary(reasonSummary)
  if (!normalizedSummary)
    return null
  if (!normalizedReason)
    return normalizedSummary
  if (
    normalizedSummary.includes(`reason=${normalizedReason}`)
    || normalizedSummary.includes(normalizedReason)
  ) {
    return normalizedSummary
  }

  return `${normalizedSummary} | reason=${normalizedReason}`
}

function appendLaneTruthToDescriptiveAuthoritySummary(input: {
  summary: string | null
  matchSummary?: string | null
  matchedDrivers?: PerformanceVisualizerAuthorityDriver[] | null
  authorityMismatchSummary?: string | null
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
}) {
  const summary = input.summary?.trim() ?? null
  if (!summary)
    return null
  const voiceLaneDisplay = input.voiceSegmentMatched == null
    ? null
    : input.voiceSegmentMatched ? '声音命中' : '声音未命中'
  const alreadyStructured = ['body', 'face', 'motion', 'lipsync'].some(driver =>
    resolveDriverMatchFlagFromSummary(summary, driver as 'body' | 'face' | 'motion' | 'lipsync') != null,
  )
  if (alreadyStructured) {
    if (
      !voiceLaneDisplay
      || summary.includes(voiceLaneDisplay)
      || summary.includes('声音命中')
      || summary.includes('声音未命中')
    ) {
      return summary
    }

    return `${summary} / ${voiceLaneDisplay}`
  }

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
    voiceLaneDisplay,
  ].filter((part): part is string => Boolean(part)).join(' / ')
  if (!laneDisplay || laneDisplay === '身体未知 / 表情未知 / 动作未知 / 口型未知')
    return summary
  if (summary.includes(laneDisplay))
    return summary

  return `${summary} | ${laneDisplay}`
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

function formatSameHerDriverName(driver: string) {
  if (driver === 'body')
    return '身体'
  if (driver === 'face')
    return '表情'
  if (driver === 'motion')
    return '动作'
  if (driver === 'lipsync')
    return '口型'
  if (driver === 'voice')
    return '声音'
  return driver
}

function formatSameHerMismatchDriverList(drivers: string[]) {
  const normalizedDrivers = drivers
    .map(driver => normalizeRuntimeReasonSummary(driver))
    .filter((driver): driver is string => Boolean(driver))
    .filter((driver, index, values) => values.indexOf(driver) === index)
    .map(formatSameHerDriverName)

  return normalizedDrivers.length > 0
    ? normalizedDrivers.join('、')
    : null
}

function buildSameHerContinuitySummaryEntry(input: {
  rendererTarget: PerformanceVisualizerRendererTarget
  embodimentClosureStage: string | null
  sameHerFrameSummary: string | null
  sameHerFrameAligned: boolean | null
  sameHerFrameMismatchDrivers: string[]
  sameHerFramePerformanceSegmentId: string | null
  sameHerFrameSpeechSegmentId: string | null
  sameHerExecutionSummary: string | null
  sameHerExecutionAligned: boolean | null
  sameHerExecutionMismatchDrivers: string[]
  sameHerExecutionAuthoritySegmentId: string | null
}): PerformanceVisualizerRuntimeDiagnosticSummaryEntry | null {
  const sameHerFrameSegmentIds = extractStructuredSameHerSegmentIds(input.sameHerFrameSummary)
  const sameHerExecutionSegmentIds = extractStructuredSameHerSegmentIds(input.sameHerExecutionSummary)
  const candidates = {
    frame: input.sameHerFrameSummary
      ? {
          source: 'frame' as const,
          summary: input.sameHerFrameSummary,
          aligned: input.sameHerFrameAligned,
          mismatchDrivers: input.sameHerFrameMismatchDrivers,
          segmentId: input.sameHerFramePerformanceSegmentId
            ?? input.sameHerFrameSpeechSegmentId
            ?? sameHerFrameSegmentIds.performanceSegmentId
            ?? sameHerFrameSegmentIds.speechSegmentId
            ?? sameHerFrameSegmentIds.summarySegmentId
            ?? sameHerFrameSegmentIds.authoritySegmentId,
        }
      : null,
    execution: input.sameHerExecutionSummary
      ? {
          source: 'execution' as const,
          summary: input.sameHerExecutionSummary,
          aligned: input.sameHerExecutionAligned,
          mismatchDrivers: input.sameHerExecutionMismatchDrivers,
          segmentId: input.sameHerExecutionAuthoritySegmentId
            ?? sameHerExecutionSegmentIds.authoritySegmentId
            ?? sameHerExecutionSegmentIds.summarySegmentId
            ?? sameHerExecutionSegmentIds.performanceSegmentId
            ?? sameHerExecutionSegmentIds.speechSegmentId,
        }
      : null,
  }

  const preferredSourceOrder = input.rendererTarget === 'live2d'
    ? ['execution', 'frame'] as const
    : ['frame', 'execution'] as const
  const selectedCandidate = preferredSourceOrder
    .map(source => candidates[source])
    .find((candidate): candidate is NonNullable<typeof candidates.frame> => Boolean(candidate))
  if (!selectedCandidate)
    return null

  const mismatchDriversDisplay = formatSameHerMismatchDriverList(selectedCandidate.mismatchDrivers)
  const valueParts = [
    `当前 identity-continuity continuity 主要由${selectedCandidate.source === 'frame' ? '渲染帧线' : '执行线'}继续托住`,
    selectedCandidate.segmentId ? `活跃片段 ${selectedCandidate.segmentId}` : null,
    input.embodimentClosureStage ? `处在 ${input.embodimentClosureStage}` : null,
    mismatchDriversDisplay ? `${mismatchDriversDisplay} 还没重新接回` : null,
  ].filter((part): part is string => Boolean(part))

  const technicalParts = [
    `source=${selectedCandidate.source}`,
    selectedCandidate.segmentId ? `segment=${selectedCandidate.segmentId}` : null,
    input.embodimentClosureStage ? `closure=${input.embodimentClosureStage}` : null,
    selectedCandidate.aligned != null ? `aligned=${String(selectedCandidate.aligned)}` : null,
    selectedCandidate.mismatchDrivers.length > 0 ? `mismatch=${selectedCandidate.mismatchDrivers.join(', ')}` : null,
    `summary=${selectedCandidate.summary}`,
  ].filter((part): part is string => Boolean(part))

  return {
    key: 'identity-continuity-continuity',
    label: '同一生命线总览',
    value: `${valueParts.join('，')}。`,
    technicalValue: technicalParts.join(' | '),
  }
}

export function buildRuntimeAuthorityOverview(input: {
  speechEmbodiment?: StageThreeRuntimeSpeechEmbodimentDiagnostics | null
  live2dAuthorityView?: Pick<
    PerformanceVisualizerLive2DAuthorityComparisonView,
    | 'sameHerExecutionAligned'
    | 'sameHerExecutionAuthoritySegmentId'
    | 'sameHerExecutionMismatchDrivers'
    | 'sameHerExecutionSummary'
  > | null
  playbackCueAuthorityView?: PerformanceVisualizerPlaybackCueAuthorityView | null
  traceEmbodimentSummary?: string | null
  vrmAuthorityView?: Pick<
    PerformanceVisualizerVrmAuthorityComparisonView,
    | 'sameHerFrameAligned'
    | 'sameHerFrameMismatchDrivers'
    | 'sameHerFramePerformanceSegmentId'
    | 'sameHerFrameSpeechSegmentId'
    | 'sameHerFrameSummary'
  > | null
}): PerformanceVisualizerRuntimeAuthorityOverview | null {
  const playbackCueAuthorityView = input.playbackCueAuthorityView ?? null
  const live2dAuthorityView = input.live2dAuthorityView ?? null
  const vrmAuthorityView = input.vrmAuthorityView ?? null
  const authoritySummary = input.speechEmbodiment?.authoritySummary ?? null
  const playbackTelemetry = input.speechEmbodiment?.playbackTelemetry ?? null
  const driverAuthority = playbackTelemetry?.driverAuthority ?? null
  const resolvedProsodyAuthority = resolveProsodyAuthorityFromSources(playbackTelemetry)
  if (!playbackCueAuthorityView && !driverAuthority && !authoritySummary)
    return null

  const authority = playbackCueAuthorityView
    ? {
        bodySegmentMatched: playbackCueAuthorityView.bodySegmentMatched ?? null,
        faceSegmentMatched: playbackCueAuthorityView.faceSegmentMatched ?? null,
        motionSegmentMatched: playbackCueAuthorityView.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: playbackCueAuthorityView.lipsyncSegmentMatched ?? null,
        voiceSegmentMatched: playbackCueAuthorityView.voiceSegmentMatched ?? null,
      }
    : driverAuthority
  const fallbackAuthority = resolveAuthorityLaneTruth({
    bodySegmentMatched: authority?.bodySegmentMatched ?? null,
    faceSegmentMatched: authority?.faceSegmentMatched ?? null,
    motionSegmentMatched: authority?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: authority?.lipsyncSegmentMatched ?? null,
    matchedSources: playbackCueAuthorityView?.authoritySources ?? driverAuthority?.sources,
    driverExecutionSummary: null,
    finalSurfacePolicy: input.speechEmbodiment?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
  })
  const authoritySummaryCueId = normalizeRuntimeReasonSummary(authoritySummary?.cueId)
  const playbackCueId = normalizeRuntimeReasonSummary(playbackCueAuthorityView?.cueId)
  const authoritySummarySegmentId = normalizeRuntimeReasonSummary(authoritySummary?.segmentId)
  const activeAuthoritySegmentId = normalizeRuntimeReasonSummary(playbackCueAuthorityView?.authoritySegmentId)
    ?? normalizeRuntimeReasonSummary(driverAuthority?.segmentId)
    ?? normalizeRuntimeReasonSummary(playbackTelemetry?.cue?.id)
    ?? normalizeRuntimeReasonSummary(resolvedProsodyAuthority?.segmentId)
    ?? null
  const authoritySummaryMatchesPlaybackCue = !authoritySummaryCueId || !playbackCueId || authoritySummaryCueId === playbackCueId
  const authoritySummaryMatchesActiveSegment = !authoritySummarySegmentId || !activeAuthoritySegmentId || authoritySummarySegmentId === activeAuthoritySegmentId
  const preferUpstreamAuthoritySummary = authoritySummaryMatchesPlaybackCue
    && authoritySummaryMatchesActiveSegment
    && Boolean(authoritySummary)
  const voiceSummary = normalizeRuntimeReasonSummary(input.speechEmbodiment?.speechEvidence?.voiceSummary)
    ?? normalizeRuntimeReasonSummary(input.speechEmbodiment?.articulationSummary?.voice)

  const rendererTarget = playbackCueAuthorityView?.authorityRendererTarget
    ?? (preferUpstreamAuthoritySummary ? authoritySummary?.rendererTarget ?? null : null)
    ?? playbackTelemetry?.rendererTarget
    ?? null
  const authoritySegmentId = normalizeRuntimeReasonSummary(playbackCueAuthorityView?.authoritySegmentId)
    ?? (preferUpstreamAuthoritySummary ? authoritySummarySegmentId : null)
    ?? normalizeRuntimeReasonSummary(driverAuthority?.segmentId)
    ?? normalizeRuntimeReasonSummary(playbackTelemetry?.cue?.id)
    ?? normalizeRuntimeReasonSummary(resolvedProsodyAuthority?.segmentId)
    ?? null
  const voiceSegmentMatched = resolveVoiceSegmentMatched({
    authoritySegmentId,
    voiceSummary,
  })
  const upstreamMatchedDrivers = preferUpstreamAuthoritySummary
    ? (authoritySummary?.matchedDrivers ?? []).filter((driver): driver is PerformanceVisualizerAuthorityDriver =>
        driver === 'body' || driver === 'face' || driver === 'motion' || driver === 'lipsync' || driver === 'voice',
      )
    : null
  const upstreamAuthorityBindingSummary = preferUpstreamAuthoritySummary
    ? authoritySummary?.bindingSummary ?? null
    : null
  const upstreamAuthorityMatchSummary = preferUpstreamAuthoritySummary
    ? authoritySummary?.matchSummary ?? null
    : null
  const authorityMismatchSummary = preferUpstreamAuthoritySummary
    ? authoritySummary?.authorityMismatchSummary ?? null
    : fallbackAuthority.authorityMismatchSummary
  const authorityBindingSummary = appendLaneTruthToDescriptiveAuthoritySummary({
    summary: upstreamAuthorityBindingSummary,
    matchSummary: upstreamAuthorityMatchSummary,
    matchedDrivers: upstreamMatchedDrivers,
    authorityMismatchSummary,
    bodySegmentMatched: driverAuthority?.bodySegmentMatched ?? playbackCueAuthorityView?.bodySegmentMatched ?? null,
    faceSegmentMatched: driverAuthority?.faceSegmentMatched ?? playbackCueAuthorityView?.faceSegmentMatched ?? null,
    motionSegmentMatched: driverAuthority?.motionSegmentMatched ?? playbackCueAuthorityView?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: driverAuthority?.lipsyncSegmentMatched ?? playbackCueAuthorityView?.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched,
  }) ?? playbackCueAuthorityView?.authorityBindingSummary ?? null
  const authorityMatchSummary = appendLaneTruthToDescriptiveAuthoritySummary({
    summary: upstreamAuthorityMatchSummary,
    matchSummary: upstreamAuthorityMatchSummary,
    matchedDrivers: upstreamMatchedDrivers,
    authorityMismatchSummary,
    bodySegmentMatched: driverAuthority?.bodySegmentMatched ?? playbackCueAuthorityView?.bodySegmentMatched ?? null,
    faceSegmentMatched: driverAuthority?.faceSegmentMatched ?? playbackCueAuthorityView?.faceSegmentMatched ?? null,
    motionSegmentMatched: driverAuthority?.motionSegmentMatched ?? playbackCueAuthorityView?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: driverAuthority?.lipsyncSegmentMatched ?? playbackCueAuthorityView?.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched,
  }) ?? playbackCueAuthorityView?.authorityMatchSummary ?? null
  const authorityMismatchReasonSummary = preferUpstreamAuthoritySummary
    ? authoritySummary?.authorityMismatchReasonSummary ?? null
    : fallbackAuthority.authorityMismatchReasonSummary
  const authorityMismatchDisplay = (preferUpstreamAuthoritySummary ? authoritySummary?.authorityMismatchDisplay : null) ?? resolveAuthorityMismatchDisplay({
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
  })
  const prosodyAuthoritySummary = resolveRuntimeAuthorityProsodySummary({
    authoritySegmentId,
    authoritySummaryProsodyAuthoritySummary: preferUpstreamAuthoritySummary
      ? authoritySummary?.prosodyAuthoritySummary ?? null
      : null,
    speechEvidenceProsodyAuthoritySummary: input.speechEmbodiment?.speechEvidence?.prosodyAuthoritySummary ?? null,
    playbackCueProsodyAuthoritySummary: playbackCueAuthorityView?.prosodyAuthoritySummary ?? null,
    resolvedProsodyAuthority,
  })
  const settleAuthorityReasonSummary = resolveSharedDriverReasonSummary({
    cueId: playbackCueId ?? authoritySegmentId ?? (preferUpstreamAuthoritySummary ? authoritySummaryCueId : null) ?? null,
    driverSummary: input.speechEmbodiment?.driverSummary,
  })
  const sharedDriverCadence = resolveSharedDriverCadence({
    cueId: playbackCueId ?? authoritySegmentId ?? (preferUpstreamAuthoritySummary ? authoritySummaryCueId : null) ?? null,
    driverSummary: input.speechEmbodiment?.driverSummary,
  })
  const fallbackDriverCadence = resolveFallbackDriverCadence(input.speechEmbodiment?.driverSummary)
  const preferredBlinkCadence = playbackCueAuthorityView?.preferredBlinkCadence
    ?? sharedDriverCadence.preferredBlinkCadence
    ?? fallbackDriverCadence.preferredBlinkCadence
    ?? null
  const preferredGazeMode = playbackCueAuthorityView?.preferredGazeMode
    ?? sharedDriverCadence.preferredGazeMode
    ?? fallbackDriverCadence.preferredGazeMode
    ?? null
  const residentMode = playbackCueAuthorityView?.residentMode ?? null
  const actionWindow = normalizeRuntimeReasonSummary(playbackTelemetry?.cue?.actionWindow)
  const settleAuthoritySummary = appendSettleAuthorityReasonSummary((preferUpstreamAuthoritySummary
    ? authoritySummary?.settleSummary ?? null
    : playbackCueAuthorityView?.settleAuthoritySummary ?? null), settleAuthorityReasonSummary)
  const settleAuthorityTrustSummary = resolveAuthorityTrustSummaryFromSettleAuthority({
    authorityTrustSummary: null,
    authorityBindingSummary,
    settleAuthoritySummary,
    rendererTarget,
    preferredBlinkCadence,
    preferredGazeMode,
  })
  const playbackCueTrustScopedAway = Boolean(
    playbackCueAuthorityView
    && !preferUpstreamAuthoritySummary
    && !playbackCueAuthorityView.authorityBindingSummary
    && !playbackCueAuthorityView.authorityMatchSummary
    && !playbackCueAuthorityView.settleAuthoritySummary
    && !playbackCueAuthorityView.authorityTrustSummary,
  )
  const activeAuthorityTrustSummary = preferUpstreamAuthoritySummary
    ? authoritySummary?.authorityTrustSummary ?? null
    : playbackCueAuthorityView?.authorityTrustSummary ?? null
  const authorityTrustSummary = playbackCueTrustScopedAway
    ? null
    : settleAuthorityTrustSummary ?? resolveAuthorityTrustSummaryWithFallback({
      authorityTrustSummary: activeAuthorityTrustSummary,
      authorityBindingSummary,
      settleAuthoritySummary,
      rendererTarget,
      preferredBlinkCadence,
      preferredGazeMode,
      residentMode,
      actionWindow,
      prosodyAuthoritySummary,
      authoritySegmentId,
      authorityMatchedDrivers: playbackCueAuthorityView?.authorityMatchedDrivers ?? driverAuthority?.matchedDrivers ?? [],
      bodySegmentMatched: authority?.bodySegmentMatched ?? null,
      faceSegmentMatched: authority?.faceSegmentMatched ?? null,
      motionSegmentMatched: authority?.motionSegmentMatched ?? null,
      lipsyncSegmentMatched: authority?.lipsyncSegmentMatched ?? null,
      voiceSegmentMatched,
    }, preferUpstreamAuthoritySummary && playbackCueAuthorityView
      ? [
          {
            authorityTrustSummary: playbackCueAuthorityView.authorityTrustSummary ?? null,
            authorityBindingSummary: playbackCueAuthorityView.authorityBindingSummary
              ?? authorityBindingSummary
              ?? null,
            settleAuthoritySummary: playbackCueAuthorityView.settleAuthoritySummary ?? null,
            rendererTarget: playbackCueAuthorityView.authorityRendererTarget ?? rendererTarget,
            preferredBlinkCadence,
            preferredGazeMode,
            residentMode,
            actionWindow,
          },
        ]
      : [])
  const authoritySummaryTraceEmbodimentSummary = preferUpstreamAuthoritySummary
    ? authoritySummary?.traceEmbodimentSummary ?? null
    : null
  const traceEmbodimentSummary = playbackCueAuthorityView?.traceEmbodimentSummary
    ?? authoritySummaryTraceEmbodimentSummary
    ?? input.traceEmbodimentSummary
    ?? null
  const upstreamSameHerSignature = preferUpstreamAuthoritySummary
    ? normalizeRuntimeReasonSummary((authoritySummary as { signature?: string | null } | null)?.signature ?? null)
    : null
  const upstreamSameHerReasonTags = preferUpstreamAuthoritySummary
    ? ((authoritySummary as { reasonTags?: string[] | null } | null)?.reasonTags ?? [])
        .map(tag => normalizeRuntimeReasonSummary(tag))
        .filter((tag): tag is string => Boolean(tag))
        .filter((tag, index, tags) => tags.indexOf(tag) === index)
    : []
  const sameHerSignature = normalizeRuntimeReasonSummary(playbackCueAuthorityView?.signature ?? null)
    ?? upstreamSameHerSignature
    ?? null
  const sameHerReasonTags = [
    ...(playbackCueAuthorityView?.reasonTags ?? []),
    ...upstreamSameHerReasonTags,
  ]
    .map(tag => normalizeRuntimeReasonSummary(tag))
    .filter((tag): tag is string => Boolean(tag))
    .filter((tag, index, tags) => tags.indexOf(tag) === index)
  const runtimeMemoryClosureIdentity = resolveRuntimeMemoryClosureIdentity(
    (input.speechEmbodiment as { runtimeDigest?: unknown } | null | undefined)?.runtimeDigest,
  )
  const expectedCueId = playbackCueAuthorityView?.cueId
    ?? (preferUpstreamAuthoritySummary ? authoritySummaryCueId : null)
    ?? authoritySegmentId
    ?? null
  const rawSameHerFrameSummary = normalizeRuntimeReasonSummary(vrmAuthorityView?.sameHerFrameSummary)
  const rawSameHerFrameAligned = typeof vrmAuthorityView?.sameHerFrameAligned === 'boolean'
    ? vrmAuthorityView.sameHerFrameAligned
    : null
  const rawSameHerFrameMismatchDrivers = (vrmAuthorityView?.sameHerFrameMismatchDrivers ?? [])
    .map(driver => normalizeRuntimeReasonSummary(driver))
    .filter((driver): driver is string => Boolean(driver))
    .filter((driver, index, drivers) => drivers.indexOf(driver) === index)
  const rawSameHerFramePerformanceSegmentId = normalizeRuntimeReasonSummary(vrmAuthorityView?.sameHerFramePerformanceSegmentId)
  const rawSameHerFrameSpeechSegmentId = normalizeRuntimeReasonSummary(vrmAuthorityView?.sameHerFrameSpeechSegmentId)
  const rawSameHerExecutionSummary = normalizeRuntimeReasonSummary(live2dAuthorityView?.sameHerExecutionSummary)
  const rawSameHerExecutionAligned = typeof live2dAuthorityView?.sameHerExecutionAligned === 'boolean'
    ? live2dAuthorityView.sameHerExecutionAligned
    : null
  const rawSameHerExecutionMismatchDrivers = (live2dAuthorityView?.sameHerExecutionMismatchDrivers ?? [])
    .map(driver => normalizeRuntimeReasonSummary(driver))
    .filter((driver): driver is string => Boolean(driver))
    .filter((driver, index, drivers) => drivers.indexOf(driver) === index)
  const rawSameHerExecutionAuthoritySegmentId = normalizeRuntimeReasonSummary(live2dAuthorityView?.sameHerExecutionAuthoritySegmentId)
  const sameHerFrameBelongsToActiveSegment = resolveSameHerEvidenceBelongsToActiveSegment({
    activeSegmentId: expectedCueId,
    summary: rawSameHerFrameSummary,
    segmentIds: [
      rawSameHerFramePerformanceSegmentId,
      rawSameHerFrameSpeechSegmentId,
    ],
  })
  const sameHerExecutionBelongsToActiveSegment = resolveSameHerEvidenceBelongsToActiveSegment({
    activeSegmentId: expectedCueId,
    summary: rawSameHerExecutionSummary,
    segmentIds: [rawSameHerExecutionAuthoritySegmentId],
  })
  const sameHerFrameSummary = sameHerFrameBelongsToActiveSegment ? rawSameHerFrameSummary : null
  const sameHerFrameAligned = sameHerFrameBelongsToActiveSegment ? rawSameHerFrameAligned : null
  const sameHerFrameMismatchDrivers = sameHerFrameBelongsToActiveSegment ? rawSameHerFrameMismatchDrivers : []
  const sameHerFramePerformanceSegmentId = sameHerFrameBelongsToActiveSegment ? rawSameHerFramePerformanceSegmentId : null
  const sameHerFrameSpeechSegmentId = sameHerFrameBelongsToActiveSegment ? rawSameHerFrameSpeechSegmentId : null
  const sameHerExecutionSummary = sameHerExecutionBelongsToActiveSegment ? rawSameHerExecutionSummary : null
  const sameHerExecutionAligned = sameHerExecutionBelongsToActiveSegment ? rawSameHerExecutionAligned : null
  const sameHerExecutionMismatchDrivers = sameHerExecutionBelongsToActiveSegment ? rawSameHerExecutionMismatchDrivers : []
  const sameHerExecutionAuthoritySegmentId = sameHerExecutionBelongsToActiveSegment ? rawSameHerExecutionAuthoritySegmentId : null
  const cueScopedSameHerSummaries = resolveCueScopedSameHerSummaries({
    cueId: expectedCueId,
    live2dAuthorityView,
    vrmAuthorityView,
  })
  const embodimentClosureStage = extractEmbodimentClosureStage(
    playbackCueAuthorityView?.embodimentClosureStage ?? null,
    authorityBindingSummary,
    settleAuthoritySummary,
    authorityMismatchDisplay,
    authorityMismatchReasonSummary,
    playbackCueAuthorityView?.bodyContinuitySummary ?? null,
    cueScopedSameHerSummaries.vrmSameHerFrameSummary,
    cueScopedSameHerSummaries.live2dSameHerExecutionSummary,
  )
  const upstreamTraceSummary = input.speechEmbodiment?.traceSummary
  const traceSummary = normalizeTraceSummaryCueId((
    upstreamTraceSummary
    && (!expectedCueId || !upstreamTraceSummary.cueId || upstreamTraceSummary.cueId === expectedCueId)
  )
    ? upstreamTraceSummary
    ?? buildTraceTelemetrySummary({
      cueId: expectedCueId,
      playbackCueAuthorityView: buildTraceAuthoritySeed(playbackCueAuthorityView),
      traceContext: input.speechEmbodiment
        ? {
            recentDrivingEvent: input.speechEmbodiment.recentDrivingEvent,
            recentDrivingTraceRecord: input.speechEmbodiment.recentDrivingTraceRecord,
            recentDrivingTraceEvents: input.speechEmbodiment.recentDrivingTraceEvents ?? [],
            driverSummary: input.speechEmbodiment.driverSummary,
            playbackTelemetry: input.speechEmbodiment.playbackTelemetry,
          }
        : undefined,
    })
    : buildTraceTelemetrySummary({
        cueId: expectedCueId,
        playbackCueAuthorityView: buildTraceAuthoritySeed(playbackCueAuthorityView),
        traceContext: input.speechEmbodiment
          ? {
              recentDrivingEvent: input.speechEmbodiment.recentDrivingEvent,
              recentDrivingTraceRecord: input.speechEmbodiment.recentDrivingTraceRecord,
              recentDrivingTraceEvents: input.speechEmbodiment.recentDrivingTraceEvents ?? [],
              driverSummary: input.speechEmbodiment.driverSummary,
              playbackTelemetry: input.speechEmbodiment.playbackTelemetry,
            }
          : undefined,
      }), expectedCueId)
  const summaryEntries = buildRuntimeAuthoritySummaryEntries({
    rendererTarget,
    authoritySegmentId,
    authorityBindingSummary,
    authorityMatchSummary,
    embodimentClosureStage,
    authorityTrustSummary,
    ...(sameHerSignature ? { sameHerSignature } : {}),
    ...(sameHerReasonTags.length > 0 ? { sameHerReasonTags } : {}),
    ...(runtimeMemoryClosureIdentity
      ? {
          runtimeMemoryClosureIdentityKey: runtimeMemoryClosureIdentity.continuityKey,
          runtimeMemoryClosureIdentityReasonTags: runtimeMemoryClosureIdentity.reasonTags,
        }
      : {}),
    prosodyAuthoritySummary,
    preferredBlinkCadence,
    preferredGazeMode,
    bodySegmentMatched: authority?.bodySegmentMatched ?? null,
    faceSegmentMatched: authority?.faceSegmentMatched ?? null,
    motionSegmentMatched: authority?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: authority?.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
    authorityMismatchDisplay,
    settleAuthoritySummary,
    suppressDerivedAuthorityTrust: playbackCueTrustScopedAway,
  })
  const sameHerContinuitySummaryEntry = buildSameHerContinuitySummaryEntry({
    rendererTarget,
    embodimentClosureStage,
    sameHerFrameSummary,
    sameHerFrameAligned,
    sameHerFrameMismatchDrivers,
    sameHerFramePerformanceSegmentId,
    sameHerFrameSpeechSegmentId,
    sameHerExecutionSummary,
    sameHerExecutionAligned,
    sameHerExecutionMismatchDrivers,
    sameHerExecutionAuthoritySegmentId,
  })
  if (sameHerContinuitySummaryEntry)
    summaryEntries.push(sameHerContinuitySummaryEntry)
  if (sameHerFrameSummary) {
    summaryEntries.push({
      key: 'identity-continuity-frame-summary',
      label: '同一生命线帧摘要',
      value: sameHerFrameSummary,
    })
  }
  if (sameHerFrameAligned != null) {
    summaryEntries.push({
      key: 'identity-continuity-frame-aligned',
      label: '同一生命线帧对齐',
      value: String(sameHerFrameAligned),
    })
  }
  if (sameHerFrameMismatchDrivers.length > 0) {
    summaryEntries.push({
      key: 'identity-continuity-frame-mismatch-drivers',
      label: '同一生命线漂移驱动',
      value: sameHerFrameMismatchDrivers.join(', '),
    })
  }
  if (sameHerExecutionSummary) {
    summaryEntries.push({
      key: 'identity-continuity-execution-summary',
      label: '同一生命线执行摘要',
      value: sameHerExecutionSummary,
    })
  }
  if (sameHerExecutionAligned != null) {
    summaryEntries.push({
      key: 'identity-continuity-execution-aligned',
      label: '同一生命线执行对齐',
      value: String(sameHerExecutionAligned),
    })
  }
  if (sameHerExecutionMismatchDrivers.length > 0) {
    summaryEntries.push({
      key: 'identity-continuity-execution-mismatch-drivers',
      label: '同一生命线执行漂移驱动',
      value: sameHerExecutionMismatchDrivers.join(', '),
    })
  }
  const enrichedTraceSummaryEntries = buildTraceTelemetrySummaryEntries(traceSummary, {
    traceEmbodimentSummary,
  })

  return {
    rendererTarget,
    authoritySegmentId,
    authorityBindingSummary,
    authorityMatchSummary,
    bodyContinuitySummary: playbackCueAuthorityView?.bodyContinuitySummary ?? null,
    embodimentClosureStage,
    authorityTrustSummary,
    ...(sameHerSignature ? { sameHerSignature } : {}),
    ...(sameHerReasonTags.length > 0 ? { sameHerReasonTags } : {}),
    ...(runtimeMemoryClosureIdentity
      ? {
          runtimeMemoryClosureIdentityKey: runtimeMemoryClosureIdentity.continuityKey,
          runtimeMemoryClosureIdentityReasonTags: runtimeMemoryClosureIdentity.reasonTags,
        }
      : {}),
    ...(sameHerFrameSummary ? { sameHerFrameSummary } : {}),
    ...(sameHerFrameAligned != null ? { sameHerFrameAligned } : {}),
    ...(sameHerFrameMismatchDrivers.length > 0 ? { sameHerFrameMismatchDrivers } : {}),
    ...(sameHerFramePerformanceSegmentId ? { sameHerFramePerformanceSegmentId } : {}),
    ...(sameHerFrameSpeechSegmentId ? { sameHerFrameSpeechSegmentId } : {}),
    ...(sameHerExecutionSummary ? { sameHerExecutionSummary } : {}),
    ...(sameHerExecutionAligned != null ? { sameHerExecutionAligned } : {}),
    ...(sameHerExecutionMismatchDrivers.length > 0 ? { sameHerExecutionMismatchDrivers } : {}),
    ...(sameHerExecutionAuthoritySegmentId ? { sameHerExecutionAuthoritySegmentId } : {}),
    prosodyAuthoritySummary,
    preferredBlinkCadence,
    preferredGazeMode,
    bodySegmentMatched: authority?.bodySegmentMatched ?? null,
    faceSegmentMatched: authority?.faceSegmentMatched ?? null,
    motionSegmentMatched: authority?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: authority?.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
    authorityMismatchDisplay,
    settleAuthoritySummary,
    traceEmbodimentSummary,
    summaryEntries,
    traceSummary,
    traceSummaryEntries: enrichedTraceSummaryEntries,
  }
}
