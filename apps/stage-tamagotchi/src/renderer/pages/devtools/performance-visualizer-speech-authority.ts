import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerAuthoritySegmentRow } from './performance-visualizer-authority-summary'
import type {
  PerformanceVisualizerAuthorityDriver,
  PerformanceVisualizerRendererTarget,
} from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerLive2DAuthorityComparisonView } from './performance-visualizer-live2d-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerSpeechDiagnosticSummaryEntry } from './performance-visualizer-speech-diagnostic-summary'
import type { PerformanceVisualizerSpeechEvidenceSnapshot } from './performance-visualizer-speech-evidence'
import type { SpeechObservabilityView } from './performance-visualizer-speech-observability'
import type { PerformanceVisualizerVrmAuthorityComparisonView } from './performance-visualizer-vrm-authority'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import { resolveAuthorityLaneTruth } from './performance-visualizer-authority-lane-truth'
import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './performance-visualizer-prosody-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'
import {
  buildSpeechDiagnosticSummaryEntries,

} from './performance-visualizer-speech-diagnostic-summary'
import {
  buildSpeechEvidenceSnapshot,

} from './performance-visualizer-speech-evidence'
import {
  formatAuthorityBindingSummary,
  formatAuthorityMatchSummary,
  formatDriverExecutionSummary,
} from './performance-visualizer-speech-observability'
import {
  buildTraceAuthorityExecutionSummary,
  buildTraceEmbodimentSummary,
} from './performance-visualizer-trace-embodiment'

export interface SpeechAuthoritySegmentRow {
  cueId: string
  cueText: string | null
  driftStatus: PerformanceVisualizerAuthoritySegmentRow['driftStatus']
  aligned: boolean | null
  embodimentClosureStage?: string | null
  authorityRendererTarget?: PerformanceVisualizerRendererTarget
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  authoritySegmentMatched?: boolean | null
  authorityMatchedDrivers?: PerformanceVisualizerAuthorityDriver[]
  authorityMatchedSources?: string[]
  authorityBindingSummary: string | null
  authorityMatchSummary: string | null
  authorityTrustSummary?: string | null
  sameHerSignature?: string | null
  sameHerReasonTags?: string[]
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  speechEvidence?: PerformanceVisualizerSpeechEvidenceSnapshot | null
  speechSummaryEntries?: PerformanceVisualizerSpeechDiagnosticSummaryEntry[]
  settleAuthoritySummary: string | null
  rendererDriftSummary?: string | null
  voiceSummary: string | null
  bodyContinuitySummary?: string | null
  prosodyAuthoritySummary?: string | null
  topVisemeSummary: string | null
  cueSummary?: string | null
  cueIdentityPresent?: boolean
  cueProsodyPresent?: boolean
  faceCue: string | null
  actionCue: string | null
  weightSummary: string | null
  personaStyleSummary: string | null
  timingSummary: string | null
  driverExecutionSummary: string | null
  traceEmbodimentSummary: string | null
  visemeHintsSummary: string | null
  playbackTelemetry?: SpeechObservabilityView['playbackTelemetry']
}

function buildSettleAuthoritySummary(
  row: PerformanceVisualizerAuthoritySegmentRow,
  authorityBindingSummary: string | null,
  preferredSummary?: string | null,
) {
  const hasSettleLane = (Array.isArray(row.lanes) && row.lanes.includes('settle'))
    || row.entries.some(entry => entry.lane === 'settle' && entry.settle)
  if (!hasSettleLane)
    return null

  if (preferredSummary)
    return preferredSummary

  if (authorityBindingSummary) {
    const bindingSummary = authorityBindingSummary.trim()
    return `authority-bound | segment=${row.cueId} | ${bindingSummary}`
  }

  return `fallback-derived | segment=${row.cueId}`
}

function collectObservedSegmentIds(view: SpeechObservabilityView) {
  const ids = new Set<string>()

  if (view.authorityBinding?.segmentId)
    ids.add(view.authorityBinding.segmentId)

  if (view.cueMicro?.cueId)
    ids.add(view.cueMicro.cueId)

  for (const hint of view.visemeHints) {
    if (hint.segmentId)
      ids.add(hint.segmentId)
  }

  return ids
}

function normalizeText(value: unknown) {
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

function extractStructuredSameHerSegmentIds(summary: string | null | undefined) {
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

function matchesCueScopedSegment(segmentId: string | null | undefined, cueId: string) {
  const normalizedSegmentId = normalizeText(segmentId)
  return !normalizedSegmentId || normalizedSegmentId === cueId
}

function structuredSummaryMatchesCueSegment(summary: string | null | undefined, cueId: string) {
  const structuredSegmentId = extractStructuredSegmentId(summary)
  return !structuredSegmentId || structuredSegmentId === cueId
}

function structuredSameHerSummaryMatchesCueSegment(summary: string | null | undefined, cueId: string) {
  const segmentIds = extractStructuredSameHerSegmentIds(summary)
  return [
    segmentIds.authoritySegmentId,
    segmentIds.summarySegmentId,
    segmentIds.performanceSegmentId,
    segmentIds.speechSegmentId,
  ].every(segmentId => !segmentId || segmentId === cueId)
}

function isPerformanceVisualizerAuthorityDriver(value: unknown): value is PerformanceVisualizerAuthorityDriver {
  return value === 'body'
    || value === 'face'
    || value === 'motion'
    || value === 'lipsync'
    || value === 'voice'
}

function normalizeMatchedDrivers(
  values: readonly unknown[] | null | undefined,
): PerformanceVisualizerAuthorityDriver[] {
  return Array.isArray(values)
    ? values.filter(isPerformanceVisualizerAuthorityDriver)
    : []
}

function resolveStructuredVoiceSegmentMatched(input: {
  cueId: string
  authorityBinding: SpeechObservabilityView['authorityBinding']
  playbackTelemetry: SpeechObservabilityView['playbackTelemetry']
  playbackCueAuthorityView: PerformanceVisualizerPlaybackCueAuthorityView | null | undefined
}) {
  if (typeof input.authorityBinding?.voiceSegmentMatched === 'boolean')
    return input.authorityBinding.voiceSegmentMatched

  const driverAuthority = input.playbackTelemetry?.driverAuthority
  if (
    driverAuthority
    && matchesCueScopedSegment(driverAuthority.segmentId, input.cueId)
    && typeof driverAuthority.voiceSegmentMatched === 'boolean'
  ) {
    return driverAuthority.voiceSegmentMatched
  }

  const playbackCueAuthorityView = input.playbackCueAuthorityView
  if (
    playbackCueAuthorityView
    && matchesCueScopedSegment(playbackCueAuthorityView.authoritySegmentId, input.cueId)
    && typeof playbackCueAuthorityView.voiceSegmentMatched === 'boolean'
  ) {
    return playbackCueAuthorityView.voiceSegmentMatched
  }

  return null
}

function appendVoiceMatchedDriver(
  matchedDrivers: PerformanceVisualizerAuthorityDriver[],
  voiceSegmentMatched: boolean | null,
): PerformanceVisualizerAuthorityDriver[] {
  if (voiceSegmentMatched !== true || matchedDrivers.includes('voice'))
    return matchedDrivers

  return [...matchedDrivers, 'voice']
}

function extractStructuredLaneValue(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  return normalized.match(/(?:^|\s|\|)lane=([^|\s]+)/)?.[1]?.trim() ?? null
}

function hasNonOnlyContinuityLane(summary: string | null | undefined) {
  const lane = extractStructuredLaneValue(summary)
  return Boolean(lane && !lane.endsWith('-only'))
}

function replaceStructuredSummaryField(summary: string, key: string, value: string) {
  const pattern = new RegExp(`(^|\\|\\s*)${key}=[^|]+`)
  if (!pattern.test(summary))
    return summary

  return summary.replace(pattern, (_, prefix: string) => `${prefix}${key}=${value}`)
}

function resolveSpeechAuthorityRendererTarget(input: {
  row: PerformanceVisualizerAuthoritySegmentRow
  authorityBinding: SpeechObservabilityView['authorityBinding']
  playbackCueAuthorityView: PerformanceVisualizerPlaybackCueAuthorityView | null | undefined
  playbackTelemetry: SpeechObservabilityView['playbackTelemetry']
}) {
  if (input.authorityBinding?.rendererTarget)
    return input.authorityBinding.rendererTarget

  if (input.playbackCueAuthorityView?.authorityRendererTarget)
    return input.playbackCueAuthorityView.authorityRendererTarget

  if (input.playbackTelemetry?.driverAuthority?.rendererTarget)
    return input.playbackTelemetry.driverAuthority.rendererTarget

  if (input.playbackTelemetry?.rendererTarget)
    return input.playbackTelemetry.rendererTarget

  if (Array.isArray(input.row.surfaces) && input.row.surfaces.includes('vrm'))
    return 'vrm'

  if (Array.isArray(input.row.surfaces) && input.row.surfaces.includes('live2d'))
    return 'live2d'

  return null
}

function resolveEnrichedAuthorityBindingSummary(input: {
  authorityBinding: SpeechObservabilityView['authorityBinding']
  originalSummary: string | null
  resolvedMatchedDrivers: PerformanceVisualizerAuthorityDriver[]
  resolvedMatchedSources: string[]
  bodySegmentMatched: boolean | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  voiceSegmentMatched: boolean | null
}) {
  if (!input.authorityBinding)
    return input.originalSummary

  const resolvedBinding = {
    ...input.authorityBinding,
    matchedDrivers: [...input.resolvedMatchedDrivers],
    matchedSources: [...input.resolvedMatchedSources],
    ...(input.bodySegmentMatched != null ? { bodySegmentMatched: input.bodySegmentMatched } : {}),
    faceSegmentMatched: input.faceSegmentMatched,
    motionSegmentMatched: input.motionSegmentMatched,
    lipsyncSegmentMatched: input.lipsyncSegmentMatched,
    ...(input.voiceSegmentMatched != null ? { voiceSegmentMatched: input.voiceSegmentMatched } : {}),
  }
  const resolvedSummary = formatAuthorityBindingSummary(resolvedBinding)
  if (!input.originalSummary)
    return resolvedSummary

  if (
    input.voiceSegmentMatched != null
    && !input.originalSummary.includes('voice:')
    && input.originalSummary.includes('matches=')
  ) {
    if (hasNonOnlyContinuityLane(input.originalSummary)) {
      const resolvedMatchSummary = formatAuthorityMatchSummary(resolvedBinding) ?? 'n/a'
      return replaceStructuredSummaryField(
        replaceStructuredSummaryField(
          replaceStructuredSummaryField(
            input.originalSummary,
            'drivers',
            input.resolvedMatchedDrivers.join(', ') || 'n/a',
          ),
          'sources',
          input.resolvedMatchedSources.join(', ') || 'n/a',
        ),
        'matches',
        resolvedMatchSummary,
      )
    }

    return resolvedSummary
  }

  return input.originalSummary
}

function resolveEnrichedAuthorityMatchSummary(input: {
  authorityBinding: SpeechObservabilityView['authorityBinding']
  originalSummary: string | null
  resolvedMatchedDrivers: PerformanceVisualizerAuthorityDriver[]
  resolvedMatchedSources: string[]
  bodySegmentMatched: boolean | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  voiceSegmentMatched: boolean | null
}) {
  if (!input.authorityBinding)
    return input.originalSummary

  const resolvedBinding = {
    ...input.authorityBinding,
    matchedDrivers: [...input.resolvedMatchedDrivers],
    matchedSources: [...input.resolvedMatchedSources],
    ...(input.bodySegmentMatched != null ? { bodySegmentMatched: input.bodySegmentMatched } : {}),
    faceSegmentMatched: input.faceSegmentMatched,
    motionSegmentMatched: input.motionSegmentMatched,
    lipsyncSegmentMatched: input.lipsyncSegmentMatched,
    ...(input.voiceSegmentMatched != null ? { voiceSegmentMatched: input.voiceSegmentMatched } : {}),
  }
  const resolvedSummary = formatAuthorityMatchSummary(resolvedBinding)
  if (!input.originalSummary)
    return resolvedSummary

  if (
    input.voiceSegmentMatched != null
    && !input.originalSummary.includes('voice:')
    && /(?:^|\s)(?:body:\S+\s+)?face:\S+\s+motion:\S+\s+lipsync:\S+(?:\s|$)/.test(input.originalSummary)
  ) {
    return `${input.originalSummary} voice:${input.voiceSegmentMatched ? 'yes' : 'no'}`
  }

  return input.originalSummary
}

function resolveEnrichedSettleAuthoritySummary(input: {
  cueId: string
  settleAuthoritySummary: string | null
  authorityBindingSummary: string | null
  voiceSegmentMatched: boolean | null
}) {
  if (!input.settleAuthoritySummary)
    return null

  if (hasNonOnlyContinuityLane(input.settleAuthoritySummary))
    return input.settleAuthoritySummary

  if (
    input.voiceSegmentMatched != null
    && input.settleAuthoritySummary.startsWith('authority-bound | segment=')
    && !input.settleAuthoritySummary.includes('voice:')
    && !input.settleAuthoritySummary.includes('voice-only')
    && input.authorityBindingSummary
  ) {
    return `authority-bound | segment=${input.cueId} | ${input.authorityBindingSummary.trim()}`
  }

  return input.settleAuthoritySummary
}

function formatNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(2)
    : 'n/a'
}

function hasNumericCueWeight(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
}

function annotateStructuredVoiceSummary(input: {
  summary: string | null | undefined
  authorityBinding: SpeechObservabilityView['authorityBinding']
  visemeHints: SpeechObservabilityView['visemeHints']
  cueId: string
  driverExecution: SpeechObservabilityView['driverExecution']
}) {
  const summary = typeof input.summary === 'string' && input.summary.trim()
    ? input.summary.trim()
    : null
  if (!summary)
    return null

  if (!summary.includes('closure=') || summary.includes('provenance='))
    return summary

  const provenance = input.authorityBinding?.segmentId === input.cueId
    ? 'authority-bound'
    : 'fallback-derived'
  const source = input.visemeHints.find(hint => hint.segmentId === input.cueId && hint.source)?.source
    ?? (input.driverExecution?.face?.segmentId === input.cueId ? input.driverExecution.face.source : null)
    ?? (input.driverExecution?.motion?.segmentId === input.cueId ? input.driverExecution.motion.source : null)
    ?? 'n/a'

  return `${summary} | provenance=${provenance} | segment=${input.cueId} | source=${source ?? 'n/a'}`
}

function resolveSpeechAuthorityProsodySummary(input: {
  cueId: string
  speechView: SpeechObservabilityView
}) {
  const speechEvidenceProsodyAuthoritySummary = normalizeText(
    input.speechView.speechEvidence?.prosodyAuthoritySummary,
  )
  if (
    speechEvidenceProsodyAuthoritySummary
    && structuredSummaryMatchesCueSegment(speechEvidenceProsodyAuthoritySummary, input.cueId)
  ) {
    return speechEvidenceProsodyAuthoritySummary
  }

  const playbackCueProsodyAuthoritySummary = normalizeText(
    input.speechView.playbackCue?.authorityView?.prosodyAuthoritySummary,
  )
  if (
    playbackCueProsodyAuthoritySummary
    && structuredSummaryMatchesCueSegment(playbackCueProsodyAuthoritySummary, input.cueId)
  ) {
    return playbackCueProsodyAuthoritySummary
  }

  const resolvedSummary = formatResolvedProsodyAuthoritySummary(
    resolveProsodyAuthorityFromSources(input.speechView.playbackTelemetry),
  )
  return structuredSummaryMatchesCueSegment(resolvedSummary, input.cueId)
    ? resolvedSummary
    : null
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

function resolveCueScopedSameHerSummaries(input: {
  cueId: string
  sameHerEvidence?: {
    live2dAuthorityView?: Pick<
      PerformanceVisualizerLive2DAuthorityComparisonView,
      'sameHerExecutionAuthoritySegmentId' | 'sameHerExecutionSummary'
    > | null
    vrmAuthorityView?: Pick<
      PerformanceVisualizerVrmAuthorityComparisonView,
      'sameHerFramePerformanceSegmentId' | 'sameHerFrameSpeechSegmentId' | 'sameHerFrameSummary'
    > | null
  }
}) {
  const live2dSameHerExecutionSummary = (() => {
    const summary = normalizeText(input.sameHerEvidence?.live2dAuthorityView?.sameHerExecutionSummary)
    if (!summary)
      return null

    const authoritySegmentId = normalizeText(input.sameHerEvidence?.live2dAuthorityView?.sameHerExecutionAuthoritySegmentId)
    if (!matchesCueScopedSegment(authoritySegmentId, input.cueId))
      return null
    if (!structuredSameHerSummaryMatchesCueSegment(summary, input.cueId))
      return null

    return summary
  })()

  const vrmSameHerFrameSummary = (() => {
    const summary = normalizeText(input.sameHerEvidence?.vrmAuthorityView?.sameHerFrameSummary)
    if (!summary)
      return null

    const performanceSegmentId = normalizeText(input.sameHerEvidence?.vrmAuthorityView?.sameHerFramePerformanceSegmentId)
    const speechSegmentId = normalizeText(input.sameHerEvidence?.vrmAuthorityView?.sameHerFrameSpeechSegmentId)
    if (!matchesCueScopedSegment(performanceSegmentId, input.cueId))
      return null
    if (!matchesCueScopedSegment(speechSegmentId, input.cueId))
      return null
    if (!structuredSameHerSummaryMatchesCueSegment(summary, input.cueId))
      return null

    return summary
  })()

  return {
    live2dSameHerExecutionSummary,
    vrmSameHerFrameSummary,
  }
}

export function buildSpeechAuthoritySegmentRows(
  authorityRows: PerformanceVisualizerAuthoritySegmentRow[],
  speechView: SpeechObservabilityView,
  traceContext?: Pick<
    StageThreeRuntimeSpeechEmbodimentDiagnostics,
    'recentDrivingTraceRecord' | 'recentDrivingTraceDetails'
  >,
  sameHerEvidence?: {
    live2dAuthorityView?: Pick<
      PerformanceVisualizerLive2DAuthorityComparisonView,
      'sameHerExecutionAuthoritySegmentId' | 'sameHerExecutionSummary'
    > | null
    vrmAuthorityView?: Pick<
      PerformanceVisualizerVrmAuthorityComparisonView,
      'sameHerFramePerformanceSegmentId' | 'sameHerFrameSpeechSegmentId' | 'sameHerFrameSummary'
    > | null
  },
): SpeechAuthoritySegmentRow[] {
  const observedSegmentIds = collectObservedSegmentIds(speechView)
  if (observedSegmentIds.size === 0)
    return []

  return authorityRows
    .filter(row => observedSegmentIds.has(row.cueId))
    .map((row) => {
      const hasSettleEvidence = (Array.isArray(row.lanes) && row.lanes.includes('settle'))
        || row.entries.some(entry => entry.lane === 'settle' && entry.settle)
      const authorityBinding = speechView.authorityBinding?.segmentId === row.cueId
        ? speechView.authorityBinding
        : null
      const isAuthorityMatchedCue = authorityBinding != null
      const cueMicro = speechView.cueMicro?.cueId === row.cueId
        ? speechView.cueMicro
        : null
      const segmentVisemeHints = speechView.visemeHints.filter(hint => hint.segmentId === row.cueId)
      const voiceSummary = isAuthorityMatchedCue
        ? annotateStructuredVoiceSummary({
            summary: speechView.articulationSummary?.voice ?? null,
            authorityBinding,
            visemeHints: speechView.visemeHints,
            cueId: row.cueId,
            driverExecution: speechView.driverExecution,
          })
        : null
      const topVisemeSummary = isAuthorityMatchedCue
        ? speechView.articulationSummary?.topVisemes ?? null
        : null
      const cueHasIdentity = Boolean(
        cueMicro?.facialCue
        || cueMicro?.actionCue,
      )
      const cueHasProsodyWeights = hasNumericCueWeight(cueMicro?.prosodyWeight)
        || hasNumericCueWeight(cueMicro?.mouthWeight)
        || hasNumericCueWeight(cueMicro?.headWeight)
      const cueSummary = cueMicro && (cueHasIdentity || cueHasProsodyWeights)
        ? speechView.cueMicroSummary?.cue ?? null
        : null
      const weightSummary = cueHasProsodyWeights && cueSummary
        ? cueSummary
          .split(' | ')
          .at(1)
          ?.split(' ')
          .filter(part => part.startsWith('prosody=') || part.startsWith('mouth=') || part.startsWith('head='))
          .join(' ') ?? null
        : null
      const cueIdentityPresent = Boolean(
        cueMicro?.facialCue
        || cueMicro?.actionCue,
      )
      const cueProsodyPresent = cueHasProsodyWeights
      const timingSummary = cueMicro && (cueHasIdentity || cueHasProsodyWeights || cueMicro?.settleMode)
        ? speechView.cueMicroSummary?.timing ?? null
        : null
      const scopedDriverExecutionSummary = formatDriverExecutionSummary(
        speechView.driverExecution,
        row.cueId,
      )
      const scopedSpeechEvidenceDriverExecutionSummary = structuredSummaryMatchesCueSegment(
        speechView.speechEvidence?.driverExecutionSummary ?? null,
        row.cueId,
      )
        ? speechView.speechEvidence?.driverExecutionSummary ?? null
        : null
      const driverExecutionSummary = isAuthorityMatchedCue
        ? scopedSpeechEvidenceDriverExecutionSummary
        ?? speechView.driverExecutionSummary
        ?? scopedDriverExecutionSummary
        : scopedDriverExecutionSummary
      const scopedVisemeHintsSummary = segmentVisemeHints.length > 0
        ? segmentVisemeHints.map(hint =>
            `${hint.viseme ?? 'n/a'}:${formatNumber(hint.weight)}@${formatNumber(hint.confidence)}`,
          ).join(' | ')
        : null
      const visemeHintsSummary = isAuthorityMatchedCue
        ? speechView.visemeHintsSummary ?? scopedVisemeHintsSummary
        : scopedVisemeHintsSummary
      const authoritySummaryCueMatchesRow = matchesCueScopedSegment(
        speechView.authoritySummary?.cueId,
        row.cueId,
      )
      const authoritySummarySegmentMatchesRow = matchesCueScopedSegment(
        speechView.authoritySummary?.segmentId,
        row.cueId,
      )
      const authoritySummaryMatchesRow = authoritySummaryCueMatchesRow && authoritySummarySegmentMatchesRow
      const hasMatchingAuthoritySummary = Boolean(speechView.authoritySummary) && authoritySummaryMatchesRow
      // Stale upstream summaries can keep the same cue id while their explicit segment text still points at another embodied line.
      const authoritySummaryTrustMatchesRow = structuredSummaryMatchesCueSegment(
        speechView.authoritySummary?.authorityTrustSummary,
        row.cueId,
      )
      const authoritySummarySettleMatchesRow = structuredSummaryMatchesCueSegment(
        speechView.authoritySummary?.settleSummary,
        row.cueId,
      )
      const authorityBindingSummary = isAuthorityMatchedCue
        ? (hasMatchingAuthoritySummary ? speechView.authoritySummary?.bindingSummary : null)
        ?? formatAuthorityBindingSummary(authorityBinding)
        : null
      const authorityMatchSummary = isAuthorityMatchedCue
        ? (hasMatchingAuthoritySummary ? speechView.authoritySummary?.matchSummary : null)
        ?? formatAuthorityMatchSummary(authorityBinding)
        : null
      const authorityMatchedDrivers: PerformanceVisualizerAuthorityDriver[] = isAuthorityMatchedCue
        ? (
            hasMatchingAuthoritySummary
              ? normalizeMatchedDrivers(speechView.authoritySummary?.matchedDrivers)
              : []
          )
        : []
      const structuredAuthorityVoiceSegmentMatched = resolveStructuredVoiceSegmentMatched({
        cueId: row.cueId,
        authorityBinding,
        playbackTelemetry: speechView.playbackTelemetry ?? null,
        playbackCueAuthorityView: speechView.playbackCue?.authorityView ?? null,
      })
      const authorityVoiceSegmentMatched = structuredAuthorityVoiceSegmentMatched ?? (() => {
        const voiceSegmentId = voiceSummary
          ? extractStructuredSegmentId(voiceSummary)
          : null
        return voiceSegmentId
          ? voiceSegmentId === row.cueId
          : null
      })()
      const baseAuthorityMatchedDrivers: PerformanceVisualizerAuthorityDriver[] = authorityMatchedDrivers.length > 0
        ? authorityMatchedDrivers
        : authorityBinding
          ? normalizeMatchedDrivers(authorityBinding.matchedDrivers)
          : []
      const resolvedAuthorityMatchedDrivers: PerformanceVisualizerAuthorityDriver[] = appendVoiceMatchedDriver(
        baseAuthorityMatchedDrivers,
        authorityVoiceSegmentMatched,
      )
      const authorityMatchedSources = isAuthorityMatchedCue
        ? (
            hasMatchingAuthoritySummary
              ? speechView.authoritySummary?.matchedSources?.filter((source): source is string => typeof source === 'string' && source.trim().length > 0) ?? []
              : []
          )
        : []
      const resolvedAuthorityMatchedSources = authorityMatchedSources.length > 0
        ? authorityMatchedSources
        : authorityBinding
          ? [...authorityBinding.matchedSources]
          : []
      const preliminaryAuthorityLaneTruth = authorityBinding
        ? resolveAuthorityLaneTruth({
            matchSummary: authorityMatchSummary,
            matchedDrivers: resolvedAuthorityMatchedDrivers,
            authorityMismatchSummary: speechView.authorityMismatchSummary ?? null,
            bodySegmentMatched: speechView.playbackCue?.authorityView?.bodySegmentMatched ?? authorityBinding.bodySegmentMatched ?? null,
            faceSegmentMatched: authorityBinding.faceSegmentMatched ?? null,
            motionSegmentMatched: authorityBinding.motionSegmentMatched ?? null,
            lipsyncSegmentMatched: authorityBinding.lipsyncSegmentMatched ?? null,
            voiceSegmentMatched: authorityVoiceSegmentMatched,
            matchedSources: authorityBinding.matchedSources,
            driverExecutionSummary,
            finalSurfacePolicy: traceContext?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
            authorityMismatchReasonSummary: speechView.authorityMismatchReasonSummary ?? null,
            authorityMismatchDisplay: speechView.authorityMismatchDisplay ?? null,
          })
        : null
      const resolvedAuthorityBindingSummary = resolveEnrichedAuthorityBindingSummary({
        authorityBinding,
        originalSummary: authorityBindingSummary,
        resolvedMatchedDrivers: resolvedAuthorityMatchedDrivers,
        resolvedMatchedSources: resolvedAuthorityMatchedSources,
        bodySegmentMatched: preliminaryAuthorityLaneTruth?.authority.bodySegmentMatched ?? speechView.playbackCue?.authorityView?.bodySegmentMatched ?? authorityBinding?.bodySegmentMatched ?? null,
        faceSegmentMatched: preliminaryAuthorityLaneTruth?.authority.faceSegmentMatched ?? authorityBinding?.faceSegmentMatched ?? null,
        motionSegmentMatched: preliminaryAuthorityLaneTruth?.authority.motionSegmentMatched ?? authorityBinding?.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: preliminaryAuthorityLaneTruth?.authority.lipsyncSegmentMatched ?? authorityBinding?.lipsyncSegmentMatched ?? null,
        voiceSegmentMatched: authorityVoiceSegmentMatched,
      })
      const resolvedAuthorityMatchSummary = resolveEnrichedAuthorityMatchSummary({
        authorityBinding,
        originalSummary: authorityMatchSummary,
        resolvedMatchedDrivers: resolvedAuthorityMatchedDrivers,
        resolvedMatchedSources: resolvedAuthorityMatchedSources,
        bodySegmentMatched: preliminaryAuthorityLaneTruth?.authority.bodySegmentMatched ?? speechView.playbackCue?.authorityView?.bodySegmentMatched ?? authorityBinding?.bodySegmentMatched ?? null,
        faceSegmentMatched: preliminaryAuthorityLaneTruth?.authority.faceSegmentMatched ?? authorityBinding?.faceSegmentMatched ?? null,
        motionSegmentMatched: preliminaryAuthorityLaneTruth?.authority.motionSegmentMatched ?? authorityBinding?.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: preliminaryAuthorityLaneTruth?.authority.lipsyncSegmentMatched ?? authorityBinding?.lipsyncSegmentMatched ?? null,
        voiceSegmentMatched: authorityVoiceSegmentMatched,
      })
      const authorityLaneTruth = authorityBinding
        ? resolveAuthorityLaneTruth({
            matchSummary: resolvedAuthorityMatchSummary,
            matchedDrivers: resolvedAuthorityMatchedDrivers,
            authorityMismatchSummary: speechView.authorityMismatchSummary ?? null,
            bodySegmentMatched: preliminaryAuthorityLaneTruth?.authority.bodySegmentMatched ?? speechView.playbackCue?.authorityView?.bodySegmentMatched ?? authorityBinding.bodySegmentMatched ?? null,
            faceSegmentMatched: preliminaryAuthorityLaneTruth?.authority.faceSegmentMatched ?? authorityBinding.faceSegmentMatched ?? null,
            motionSegmentMatched: preliminaryAuthorityLaneTruth?.authority.motionSegmentMatched ?? authorityBinding.motionSegmentMatched ?? null,
            lipsyncSegmentMatched: preliminaryAuthorityLaneTruth?.authority.lipsyncSegmentMatched ?? authorityBinding.lipsyncSegmentMatched ?? null,
            voiceSegmentMatched: authorityVoiceSegmentMatched,
            matchedSources: resolvedAuthorityMatchedSources,
            driverExecutionSummary,
            finalSurfacePolicy: traceContext?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
            authorityMismatchReasonSummary: speechView.authorityMismatchReasonSummary ?? null,
            authorityMismatchDisplay: speechView.authorityMismatchDisplay ?? null,
          })
        : null
      const authorityMismatchSummary = authorityLaneTruth?.authorityMismatchSummary ?? null
      const authorityMismatchReasonSummary = authorityLaneTruth?.authorityMismatchReasonSummary ?? null
      const authorityMismatchDisplay = authorityLaneTruth?.authorityMismatchDisplay
        ?? (isAuthorityMatchedCue
          ? resolveAuthorityMismatchDisplay({
              authorityMismatchSummary,
              authorityMismatchReasonSummary,
            })
          : null)
      const settleAuthoritySummary = buildSettleAuthoritySummary(
        row,
        resolvedAuthorityBindingSummary,
        isAuthorityMatchedCue
          ? (
              (hasMatchingAuthoritySummary && authoritySummarySettleMatchesRow
                ? speechView.authoritySummary?.settleSummary ?? null
                : null)
              ?? speechView.playbackCue?.authorityView?.settleAuthoritySummary
              ?? null
            )
          : null,
      )
      const resolvedSettleAuthoritySummary = resolveEnrichedSettleAuthoritySummary({
        cueId: row.cueId,
        settleAuthoritySummary,
        authorityBindingSummary: resolvedAuthorityBindingSummary,
        voiceSegmentMatched: authorityVoiceSegmentMatched,
      })
      const baseTraceEmbodimentSummary = (isAuthorityMatchedCue || hasSettleEvidence)
        ? buildTraceEmbodimentSummary(traceContext)
        : null
      const traceEmbodimentSummary = baseTraceEmbodimentSummary
        ? buildTraceAuthorityExecutionSummary({
            turnMode: traceContext?.recentDrivingTraceRecord?.turnMode ?? null,
            closureState: traceContext?.recentDrivingTraceRecord?.closureState ?? null,
            finalSurfacePolicy: traceContext?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
            matchedDrivers: isAuthorityMatchedCue ? [...resolvedAuthorityMatchedDrivers] : [],
            driverExecutionSummary,
            traceEmbodimentSummary: baseTraceEmbodimentSummary,
          })
        : null
      const resolvedProsodyAuthoritySummary = resolveSpeechAuthorityProsodySummary({
        cueId: row.cueId,
        speechView,
      })
      const {
        live2dSameHerExecutionSummary,
        vrmSameHerFrameSummary,
      } = resolveCueScopedSameHerSummaries({
        cueId: row.cueId,
        sameHerEvidence,
      })
      const sameHerEmbodimentClosureStage = isAuthorityMatchedCue
        ? extractEmbodimentClosureStage(
            live2dSameHerExecutionSummary,
            vrmSameHerFrameSummary,
          )
        : null
      const speechEvidence = buildSpeechEvidenceSnapshot({
        voiceSummary,
        bodyContinuitySummary: isAuthorityMatchedCue
          ? speechView.speechEvidence?.bodyContinuitySummary ?? null
          : null,
        embodimentClosureStage: isAuthorityMatchedCue
          ? speechView.embodimentClosureStage
          ?? sameHerEmbodimentClosureStage
          ?? null
          : null,
        prosodyAuthoritySummary: isAuthorityMatchedCue
          ? resolvedProsodyAuthoritySummary
          : null,
        authorityMatchSummary: resolvedAuthorityMatchSummary,
        topVisemeSummary,
        cueSummary,
        cueIdentityPresent,
        cueProsodyPresent,
        personaStyleSummary: speechView.cueMicro?.cueId === row.cueId
          ? speechView.cueMicroSummary?.personaStyle ?? null
          : null,
        timingSummary,
        driverExecutionSummary,
        visemeHintsSummary,
      })
      const upstreamAuthorityTrustSummary = hasMatchingAuthoritySummary && authoritySummaryTrustMatchesRow
        ? speechView.authoritySummary?.authorityTrustSummary ?? null
        : speechView.playbackCue?.authorityView?.authorityTrustSummary ?? null
      const authorityTrustSummary = resolveAuthorityTrustSummaryWithFallback({
        authorityTrustSummary: upstreamAuthorityTrustSummary,
        authorityBindingSummary: resolvedAuthorityBindingSummary,
        settleAuthoritySummary: resolvedSettleAuthoritySummary,
        rendererTarget: resolveSpeechAuthorityRendererTarget({
          row,
          authorityBinding,
          playbackCueAuthorityView: speechView.playbackCue?.authorityView ?? null,
          playbackTelemetry: speechView.playbackTelemetry ?? null,
        }),
        preferredBlinkCadence: speechView.playbackCue?.authorityView?.preferredBlinkCadence ?? null,
        preferredGazeMode: speechView.playbackCue?.authorityView?.preferredGazeMode ?? null,
        residentMode: speechView.playbackCue?.authorityView?.residentMode ?? null,
        prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
        authoritySegmentId: row.cueId,
        authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
        bodySegmentMatched: authorityLaneTruth?.authority.bodySegmentMatched ?? null,
        faceSegmentMatched: authorityLaneTruth?.authority.faceSegmentMatched ?? null,
        motionSegmentMatched: authorityLaneTruth?.authority.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: authorityLaneTruth?.authority.lipsyncSegmentMatched ?? null,
        voiceSegmentMatched: authorityVoiceSegmentMatched,
      })
      const speechSummaryEntries = buildSpeechDiagnosticSummaryEntries({
        authorityBindingSummary: resolvedAuthorityBindingSummary,
        authorityMatchSummary: resolvedAuthorityMatchSummary,
        authorityMatchedDrivers: isAuthorityMatchedCue
          ? [...resolvedAuthorityMatchedDrivers]
          : [],
        authorityVoiceSegmentMatched,
        authorityTrustSummary,
        sameHerSignature: isAuthorityMatchedCue
          ? speechView.playbackCue?.authorityView?.signature ?? null
          : null,
        sameHerReasonTags: isAuthorityMatchedCue
          ? speechView.playbackCue?.authorityView?.reasonTags ?? null
          : null,
        authorityMismatchSummary,
        authorityMismatchReasonSummary,
        authorityMismatchDisplay,
        settleAuthoritySummary: resolvedSettleAuthoritySummary,
        traceEmbodimentSummary,
        includeSettleAuthority: true,
        speechEvidence,
      })
      const embodimentClosureStage = isAuthorityMatchedCue
        ? (
            speechView.embodimentClosureStage
            ?? sameHerEmbodimentClosureStage
            ?? speechSummaryEntries.find(entry => entry.key === 'closure-stage')?.value
            ?? null
          )
        : null
      const resolvedSpeechEvidence = {
        ...speechEvidence,
        embodimentClosureStage: speechEvidence.embodimentClosureStage ?? embodimentClosureStage ?? null,
      }

      return {
        cueId: row.cueId,
        cueText: row.cueText,
        driftStatus: row.driftStatus,
        aligned: row.aligned,
        ...(embodimentClosureStage ? { embodimentClosureStage } : {}),
        authorityRendererTarget: resolveSpeechAuthorityRendererTarget({
          row,
          authorityBinding,
          playbackCueAuthorityView: speechView.playbackCue?.authorityView ?? null,
          playbackTelemetry: speechView.playbackTelemetry ?? null,
        }),
        residentMode: speechView.playbackCue?.authorityView?.residentMode ?? null,
        preferredBlinkCadence: speechView.playbackCue?.authorityView?.preferredBlinkCadence ?? null,
        preferredGazeMode: speechView.playbackCue?.authorityView?.preferredGazeMode ?? null,
        authoritySegmentMatched: isAuthorityMatchedCue,
        authorityMatchedDrivers: isAuthorityMatchedCue
          ? [...resolvedAuthorityMatchedDrivers]
          : [],
        authorityMatchedSources: resolvedAuthorityMatchedSources,
        authorityBindingSummary: resolvedAuthorityBindingSummary,
        authorityMatchSummary: resolvedAuthorityMatchSummary,
        authorityTrustSummary,
        ...(isAuthorityMatchedCue && speechView.playbackCue?.authorityView?.signature
          ? { sameHerSignature: speechView.playbackCue.authorityView.signature }
          : {}),
        ...(isAuthorityMatchedCue && (speechView.playbackCue?.authorityView?.reasonTags?.length ?? 0) > 0
          ? { sameHerReasonTags: [...(speechView.playbackCue?.authorityView?.reasonTags ?? [])] }
          : {}),
        authorityMismatchSummary,
        authorityMismatchReasonSummary,
        authorityMismatchDisplay,
        speechEvidence: resolvedSpeechEvidence,
        speechSummaryEntries,
        settleAuthoritySummary: resolvedSettleAuthoritySummary,
        rendererDriftSummary: isAuthorityMatchedCue
          ? (speechView.rendererAlignmentSummary.live2d ?? speechView.rendererAlignmentSummary.vrm ?? null)
          : null,
        voiceSummary,
        bodyContinuitySummary: resolvedSpeechEvidence.bodyContinuitySummary ?? null,
        prosodyAuthoritySummary: resolvedSpeechEvidence.prosodyAuthoritySummary,
        topVisemeSummary,
        cueSummary,
        cueIdentityPresent,
        cueProsodyPresent,
        faceCue: cueMicro?.facialCue ?? null,
        actionCue: cueMicro?.actionCue ?? null,
        weightSummary,
        personaStyleSummary: resolvedSpeechEvidence.personaStyleSummary,
        timingSummary,
        driverExecutionSummary,
        traceEmbodimentSummary,
        visemeHintsSummary,
      }
    })
    .filter(row =>
      row.voiceSummary
      || row.bodyContinuitySummary
      || row.prosodyAuthoritySummary
      || row.authorityBindingSummary
      || row.authorityMatchSummary
      || row.settleAuthoritySummary
      || row.topVisemeSummary
      || row.faceCue
      || row.actionCue
      || row.weightSummary
      || row.personaStyleSummary
      || row.timingSummary
      || row.driverExecutionSummary
      || row.traceEmbodimentSummary
      || row.visemeHintsSummary,
    )
}
