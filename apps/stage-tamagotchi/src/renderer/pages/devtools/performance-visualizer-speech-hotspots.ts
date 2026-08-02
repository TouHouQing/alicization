import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerAuthorityMismatchFilter } from './performance-visualizer-authority-mismatch-filter'
import type { PerformanceVisualizerAuthoritySegmentRow } from './performance-visualizer-authority-summary'
import type {
  PerformanceVisualizerAuthorityDriver,
  PerformanceVisualizerRendererTarget,
} from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerRuntimeDiagnosticSummaryEntry } from './performance-visualizer-runtime-diagnostic-summary'
import type { SpeechAuthoritySegmentRow } from './performance-visualizer-speech-authority'
import type { PerformanceVisualizerSpeechDiagnosticSummaryEntry } from './performance-visualizer-speech-diagnostic-summary'
import type { PerformanceVisualizerSpeechEvidenceSnapshot } from './performance-visualizer-speech-evidence'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import { resolveAuthorityLaneTruth } from './performance-visualizer-authority-lane-truth'
import {
  matchesAuthorityMismatchFilter,

} from './performance-visualizer-authority-mismatch-filter'
import { buildAuthoritySettleLines } from './performance-visualizer-authority-settle'
import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './performance-visualizer-prosody-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'
import {
  buildTraceTelemetrySummaryEntries,

} from './performance-visualizer-runtime-diagnostic-summary'
import {
  buildSpeechDiagnosticSummaryEntries,

} from './performance-visualizer-speech-diagnostic-summary'
import {
  buildSpeechEvidenceSnapshot,
  collectSpeechEvidenceKinds,

} from './performance-visualizer-speech-evidence'
import {
  buildTraceAuthorityExecutionSummary,
  buildTraceEmbodimentSummary,
  enrichTraceEmbodimentSummary,
  isGeneratedTraceEmbodimentSummary,
} from './performance-visualizer-trace-embodiment'
import {
  buildTraceTelemetrySummary,
  resolveTraceSegmentBinding,
} from './performance-visualizer-trace-telemetry'

export interface SpeechAuthorityHotspot {
  cueId: string
  cueText: string | null
  driftStatus: PerformanceVisualizerAuthoritySegmentRow['driftStatus']
  aligned: boolean | null
  embodimentClosureStage?: string | null
  severityScore: number
  hasSpeechDrift: boolean
  surfaces: string
  lanes: string
  authorityDriftLanes: string[]
  evidenceKinds: Array<'prosody' | 'viseme' | 'micro-expression' | 'settle'>
  speechEvidence: PerformanceVisualizerSpeechEvidenceSnapshot
  speechSummaryEntries: PerformanceVisualizerSpeechDiagnosticSummaryEntry[]
  authorityTrustSummary?: string | null
  settleAuthoritySummary: string | null
  rendererDriftSummary: string | null
  settleDriftSummary: string[]
  traceEmbodimentSummary: string | null
  authorityMatchSummary: string | null
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  traceSummaryEntries?: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[]
  traceSummary: {
    cueId?: string | null
    decisionTraceId: string
    turnMode: string | null
    truthState: string | null
    repairState: string | null
    finalSurfacePolicy: string | null
    closureState: string | null
    activeThreadId: string | null
    suppressionTags: string[]
    latestEventSummary: string | null
    segmentBinding: {
      matched: boolean
      rendererTarget: PerformanceVisualizerRendererTarget
      matchedDrivers: PerformanceVisualizerAuthorityDriver[]
      matchedSources: string[]
    }
  } | null
}

export interface SpeechAuthorityHotspotFilterOptions {
  settleAuthority?: 'authority-bound' | 'fallback-derived'
  authorityMatch?: PerformanceVisualizerAuthorityMismatchFilter
  rendererDrift?: 'present' | 'pending-or-runtime-only' | 'none'
}

function buildSettleAuthoritySummary(input: {
  cueId: string
  settleDriftSummary: string[]
  segmentBinding: {
    matched: boolean
    rendererTarget: PerformanceVisualizerRendererTarget
    matchedDrivers: PerformanceVisualizerAuthorityDriver[]
    matchedSources: string[]
  }
  traceContext?: Pick<StageThreeRuntimeSpeechEmbodimentDiagnostics, 'driverSummary'>
}) {
  if (input.settleDriftSummary.length === 0)
    return null

  const normalizedCueId = input.cueId.trim()
  const sharedReason = [
    input.traceContext?.driverSummary?.body,
    input.traceContext?.driverSummary?.face,
    input.traceContext?.driverSummary?.motion,
    input.traceContext?.driverSummary?.lipsync,
  ]
    .filter((driver): driver is NonNullable<typeof driver> => Boolean(driver))
    .filter(driver => driver.segmentId === normalizedCueId)
    .map((driver) => {
      const reason = driver.reasonSummary?.trim() ?? ''
      return reason.length > 0 ? reason : null
    })
    .filter((reason): reason is string => Boolean(reason))

  const sharedReasonSummary = sharedReason.length > 0 && sharedReason.every(reason => reason === sharedReason[0])
    ? sharedReason[0]
    : null

  if (input.segmentBinding.matched) {
    const summary = `authority-bound | segment=${input.cueId} | target=${input.segmentBinding.rendererTarget ?? 'n/a'} | drivers=${input.segmentBinding.matchedDrivers.join(', ') || 'n/a'} | sources=${input.segmentBinding.matchedSources.join(', ') || 'n/a'}`
    return sharedReasonSummary
      ? `${summary} | reason=${sharedReasonSummary}`
      : summary
  }

  const fallbackBinding = resolveTraceSegmentBinding({
    cueId: input.cueId,
    traceContext: {
      driverSummary: input.traceContext?.driverSummary ?? null,
      playbackTelemetry: null,
    },
  })

  const summary = `fallback-derived | target=${fallbackBinding.rendererTarget ?? input.segmentBinding.rendererTarget ?? 'n/a'} | drivers=${fallbackBinding.matchedDrivers.join(', ') || 'n/a'} | sources=${fallbackBinding.matchedSources.join(', ') || 'n/a'}`
  return sharedReasonSummary
    ? `${summary} | reason=${sharedReasonSummary}`
    : summary
}

function driftWeight(driftStatus: PerformanceVisualizerAuthoritySegmentRow['driftStatus']) {
  switch (driftStatus) {
    case 'hard-drift':
      return 4
    case 'partial-drift':
      return 2
    case 'unknown':
      return 1
    case 'all-aligned':
    default:
      return 0
  }
}

function prosodyAuthorityWeight(
  speechEvidence: PerformanceVisualizerSpeechEvidenceSnapshot | null | undefined,
) {
  return speechEvidence?.prosodyAuthoritySummary?.trim()
    ? 1
    : 0
}

function resolveHotspotProsodyAuthoritySummary(input: {
  cueId: string
  speechEvidence: PerformanceVisualizerSpeechEvidenceSnapshot | null | undefined
  speechRowProsodyAuthoritySummary?: string | null | undefined
  traceContext?: Pick<StageThreeRuntimeSpeechEmbodimentDiagnostics, 'playbackTelemetry'>
}) {
  const candidateSummaries = [
    normalizeText(input.speechEvidence?.prosodyAuthoritySummary),
    normalizeText(input.speechRowProsodyAuthoritySummary),
  ].filter((summary): summary is string => Boolean(summary))

  for (const summary of candidateSummaries) {
    if (structuredSummaryMatchesCueSegment(summary, input.cueId))
      return summary
  }

  const resolvedSummary = formatResolvedProsodyAuthoritySummary(
    resolveProsodyAuthorityFromSources(input.traceContext?.playbackTelemetry),
  )
  return structuredSummaryMatchesCueSegment(resolvedSummary, input.cueId)
    ? resolvedSummary
    : null
}

function isPlaceholderSettleAuthoritySummary(value: string | null | undefined) {
  if (typeof value !== 'string')
    return false

  const normalized = value.trim()
  if (!normalized)
    return false

  const placeholderPrefix = normalized.startsWith('authority-bound | segment=')
    || normalized.startsWith('fallback-derived | segment=')

  return placeholderPrefix && !normalized.includes('target=')
}

type SpeechAuthorityTraceSummaryInput = Omit<NonNullable<SpeechAuthorityHotspot['traceSummary']>, 'segmentBinding'> & {
  segmentBinding: NonNullable<SpeechAuthorityHotspot['traceSummary']>['segmentBinding'] | null
}

type SpeechAuthorityTraceSegmentBinding = NonNullable<SpeechAuthorityHotspot['traceSummary']>['segmentBinding'] & {
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
}

function normalizeTraceSummaryCueId(
  traceSummary: SpeechAuthorityTraceSummaryInput | null | undefined,
  cueId: string,
): SpeechAuthorityHotspot['traceSummary'] {
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

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return normalizeText(match?.[1] ?? null)
}

function structuredSummaryMatchesCueSegment(summary: string | null | undefined, cueId: string) {
  const structuredSegmentId = extractStructuredSegmentId(summary)
  return !structuredSegmentId || structuredSegmentId === cueId
}

function matchesRendererDriftFilter(
  hotspot: Pick<SpeechAuthorityHotspot, 'rendererDriftSummary'>,
  rendererDrift: NonNullable<SpeechAuthorityHotspotFilterOptions['rendererDrift']>,
) {
  const summary = hotspot.rendererDriftSummary?.trim() ?? ''

  if (rendererDrift === 'present')
    return summary.length > 0

  if (rendererDrift === 'pending-or-runtime-only') {
    return summary.includes('waiting for renderer application')
      || summary.includes('before resident prediction')
  }

  return summary.length === 0
}

export function buildSpeechAuthorityHotspots(
  authorityRows: PerformanceVisualizerAuthoritySegmentRow[],
  speechRows: SpeechAuthoritySegmentRow[],
  traceContext?: Pick<
    StageThreeRuntimeSpeechEmbodimentDiagnostics,
    'recentDrivingEvent' | 'recentDrivingTraceRecord' | 'recentDrivingTraceEvents' | 'recentDrivingTraceDetails' | 'driverSummary' | 'playbackTelemetry' | 'traceSummary'
  >,
): SpeechAuthorityHotspot[] {
  const speechByCueId = new Map(speechRows.map(row => [row.cueId, row]))

  return authorityRows.flatMap((authorityRow) => {
    const speechRow = speechByCueId.get(authorityRow.cueId)
    if (!speechRow)
      return []

    const authorityDriftLanes = authorityRow.entries
      .filter(entry => entry.aligned === false)
      .map(entry => entry.lane)

    const settleDriftSummary = authorityRow.entries
      .filter(entry => entry.lane === 'settle' && entry.settle)
      .flatMap(entry => buildAuthoritySettleLines(entry))

    const evidenceKinds = collectSpeechEvidenceKinds({
      speech: speechRow,
      hasSettleEvidence: settleDriftSummary.length > 0,
    }) as SpeechAuthorityHotspot['evidenceKinds']

    const hasSpeechDrift = authorityDriftLanes.some(lane =>
      lane === 'lipsync'
      || lane === 'voice'
      || lane === 'face'
      || lane === 'expression'
      || lane === 'action'
      || lane === 'settle',
    )

    const speechEvidence = speechRow.speechEvidence ?? buildSpeechEvidenceSnapshot(speechRow)
    const scopedRowDriverExecutionSummary = structuredSummaryMatchesCueSegment(
      speechRow.driverExecutionSummary ?? null,
      authorityRow.cueId,
    )
      ? speechRow.driverExecutionSummary ?? null
      : null
    const resolvedRowPlaybackProsodyAuthoritySummary = formatResolvedProsodyAuthoritySummary(
      resolveProsodyAuthorityFromSources(speechRow.playbackTelemetry),
    )
    const resolvedProsodyAuthoritySummary = resolveHotspotProsodyAuthoritySummary({
      cueId: authorityRow.cueId,
      speechEvidence,
      speechRowProsodyAuthoritySummary: speechRow.prosodyAuthoritySummary
        ?? resolvedRowPlaybackProsodyAuthoritySummary,
      traceContext,
    })
    const resolvedSpeechEvidence = speechEvidence
      ? {
          ...speechEvidence,
          prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
          driverExecutionSummary: structuredSummaryMatchesCueSegment(
            speechEvidence.driverExecutionSummary ?? null,
            authorityRow.cueId,
          )
            ? speechEvidence.driverExecutionSummary ?? null
            : null,
        }
      : null
    const effectiveDriverExecutionSummary = scopedRowDriverExecutionSummary
      ?? resolvedSpeechEvidence?.driverExecutionSummary
      ?? null
    const severityScore = driftWeight(authorityRow.driftStatus)
      + authorityDriftLanes.length
      + evidenceKinds.length
      + prosodyAuthorityWeight(resolvedSpeechEvidence)

    const upstreamTraceSummary = traceContext?.traceSummary
    const usesUpstreamTraceSummary = Boolean(
      upstreamTraceSummary
      && (!upstreamTraceSummary.cueId || upstreamTraceSummary.cueId === authorityRow.cueId),
    )
    const traceSummary = normalizeTraceSummaryCueId(
      usesUpstreamTraceSummary
        ? upstreamTraceSummary
        : buildTraceTelemetrySummary({
            cueId: authorityRow.cueId,
            traceContext,
          }),
      authorityRow.cueId,
    )
    const richerMatchedSources = normalizeUniqueTextList([
      ...(traceSummary?.segmentBinding.matchedSources ?? []),
      ...(speechRow.authorityMatchedSources ?? []),
    ])
    const segmentBinding: SpeechAuthorityTraceSegmentBinding = traceSummary?.segmentBinding
      ? {
          ...traceSummary.segmentBinding,
          matchedSources: richerMatchedSources,
        }
      : {
          matched: false,
          rendererTarget: traceContext?.driverSummary?.rendererTarget ?? traceContext?.playbackTelemetry?.rendererTarget ?? null,
          matchedDrivers: [] as PerformanceVisualizerAuthorityDriver[],
          matchedSources: richerMatchedSources,
          bodySegmentMatched: null,
          faceSegmentMatched: null,
          motionSegmentMatched: null,
          lipsyncSegmentMatched: null,
          voiceSegmentMatched: null,
        }
    const authorityMatchSummary = speechRow.authorityMatchSummary ?? null
    const authorityMatchedDrivers = speechRow.authorityMatchedDrivers ?? []
    const upstreamAuthorityMismatchSummary = speechRow.authorityMismatchSummary ?? null
    const hasSpeechRowAuthorityTruth = Boolean(authorityMatchSummary || upstreamAuthorityMismatchSummary || authorityMatchedDrivers.length > 0)
    const fallbackMatchedDriver = (driver: PerformanceVisualizerAuthorityDriver) => {
      if (segmentBinding.matchedDrivers.includes(driver))
        return true
      if (!hasSpeechRowAuthorityTruth && segmentBinding.matched && driver !== 'body')
        return false
      if (speechRow.authoritySegmentMatched === false)
        return false
      if (upstreamAuthorityMismatchSummary?.includes(`${driver}-mismatch`))
        return false
      return null
    }
    const {
      authority,
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
      authorityMismatchDisplay,
    } = resolveAuthorityLaneTruth({
      matchSummary: authorityMatchSummary,
      matchedDrivers: authorityMatchedDrivers,
      authorityMismatchSummary: upstreamAuthorityMismatchSummary,
      fallbackDriverMatched: fallbackMatchedDriver,
      matchedSources: richerMatchedSources,
      driverExecutionSummary: effectiveDriverExecutionSummary,
      finalSurfacePolicy: traceSummary?.finalSurfacePolicy ?? null,
      authorityMismatchReasonSummary: speechRow.authorityMismatchReasonSummary ?? null,
      authorityMismatchDisplay: speechRow.authorityMismatchDisplay ?? null,
    })
    const upstreamAuthorityTrustSummary = speechRow.authorityTrustSummary
      ?? speechRow.speechSummaryEntries?.find(entry => entry.key === 'authority-trust')?.value
      ?? null
    const authorityVoiceSegmentMatched = (() => {
      const voiceSegmentId = extractStructuredSegmentId(resolvedSpeechEvidence?.voiceSummary ?? null)
      const authoritySegmentId = normalizeText(speechRow.cueId)
        ?? normalizeText(authorityRow.cueId)
        ?? null
      return voiceSegmentId && authoritySegmentId
        ? voiceSegmentId === authoritySegmentId
        : null
    })()
    const resolvedAuthorityVoiceSegmentMatched = authorityVoiceSegmentMatched ?? authority.voiceSegmentMatched ?? segmentBinding.voiceSegmentMatched ?? null
    const resolvedAuthorityMatchedDrivers = resolveMatchedDriversFromLaneTruth({
      matchedDrivers: authorityMatchedDrivers.length > 0
        ? authorityMatchedDrivers
        : segmentBinding.matchedDrivers,
      bodySegmentMatched: authority.bodySegmentMatched ?? segmentBinding.bodySegmentMatched ?? null,
      faceSegmentMatched: authority.faceSegmentMatched ?? segmentBinding.faceSegmentMatched ?? null,
      motionSegmentMatched: authority.motionSegmentMatched ?? segmentBinding.motionSegmentMatched ?? null,
      lipsyncSegmentMatched: authority.lipsyncSegmentMatched ?? segmentBinding.lipsyncSegmentMatched ?? null,
      voiceSegmentMatched: resolvedAuthorityVoiceSegmentMatched,
    })
    const resolvedSegmentBinding = {
      ...segmentBinding,
      matched: resolvedAuthorityMatchedDrivers.length > 0 || segmentBinding.matched,
      matchedDrivers: resolvedAuthorityMatchedDrivers,
      bodySegmentMatched: authority.bodySegmentMatched ?? segmentBinding.bodySegmentMatched ?? null,
      faceSegmentMatched: authority.faceSegmentMatched ?? segmentBinding.faceSegmentMatched ?? null,
      motionSegmentMatched: authority.motionSegmentMatched ?? segmentBinding.motionSegmentMatched ?? null,
      lipsyncSegmentMatched: authority.lipsyncSegmentMatched ?? segmentBinding.lipsyncSegmentMatched ?? null,
      ...(resolvedAuthorityVoiceSegmentMatched != null
        ? { voiceSegmentMatched: resolvedAuthorityVoiceSegmentMatched }
        : {}),
    }
    const resolvedTraceSummary = traceSummary
      ? {
          ...traceSummary,
          segmentBinding: resolvedSegmentBinding,
        }
      : null
    const enrichedSpeechTraceEmbodimentSummary = enrichTraceEmbodimentSummary({
      upstreamSummary: speechRow.traceEmbodimentSummary,
      localSummary: buildTraceEmbodimentSummary({
        recentDrivingTraceRecord: traceContext?.recentDrivingTraceRecord ?? null,
        recentDrivingTraceDetails: traceContext?.recentDrivingTraceDetails ?? [],
      }),
    })
    const traceEmbodimentSummary = resolvedTraceSummary
      ? (enrichedSpeechTraceEmbodimentSummary && !isGeneratedTraceEmbodimentSummary(enrichedSpeechTraceEmbodimentSummary)
          ? enrichedSpeechTraceEmbodimentSummary
          : buildTraceAuthorityExecutionSummary({
              turnMode: resolvedTraceSummary.turnMode,
              closureState: resolvedTraceSummary.closureState,
              finalSurfacePolicy: resolvedTraceSummary.finalSurfacePolicy,
              matchedDrivers: resolvedTraceSummary.segmentBinding.matchedDrivers,
              driverExecutionSummary: effectiveDriverExecutionSummary,
              traceEmbodimentSummary: enrichedSpeechTraceEmbodimentSummary,
            }))
      : (enrichedSpeechTraceEmbodimentSummary && !isGeneratedTraceEmbodimentSummary(enrichedSpeechTraceEmbodimentSummary)
          ? enrichedSpeechTraceEmbodimentSummary
          : null)
    const settleAuthoritySummary = speechRow.settleAuthoritySummary && !isPlaceholderSettleAuthoritySummary(speechRow.settleAuthoritySummary)
      ? speechRow.settleAuthoritySummary
      : buildSettleAuthoritySummary({
          cueId: authorityRow.cueId,
          settleDriftSummary,
          segmentBinding: resolvedSegmentBinding,
          traceContext,
        })
    const resolvedAuthorityTrustSummary = resolveAuthorityTrustSummaryWithFallback({
      authorityTrustSummary: upstreamAuthorityTrustSummary,
      authorityBindingSummary: speechRow.authorityBindingSummary ?? null,
      settleAuthoritySummary,
      rendererTarget: speechRow.authorityRendererTarget ?? segmentBinding.rendererTarget,
      preferredBlinkCadence: speechRow.preferredBlinkCadence ?? null,
      preferredGazeMode: speechRow.preferredGazeMode ?? null,
      residentMode: speechRow.residentMode ?? null,
      prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
      authoritySegmentId: speechRow.cueId ?? null,
      authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
      bodySegmentMatched: authority.bodySegmentMatched,
      faceSegmentMatched: authority.faceSegmentMatched,
      motionSegmentMatched: authority.motionSegmentMatched,
      lipsyncSegmentMatched: authority.lipsyncSegmentMatched,
      voiceSegmentMatched: resolvedAuthorityVoiceSegmentMatched,
    })

    const speechSummaryEntries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: speechRow.authorityBindingSummary ?? null,
      authorityMatchSummary: speechRow.authorityMatchSummary,
      authorityMatchedDrivers: [...resolvedAuthorityMatchedDrivers],
      authorityVoiceSegmentMatched: resolvedAuthorityVoiceSegmentMatched,
      authorityTrustSummary: resolvedAuthorityTrustSummary,
      continuitySignature: speechRow.continuitySignature ?? null,
      continuityReasonTags: speechRow.continuityReasonTags ?? null,
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
      authorityMismatchDisplay: authorityMismatchDisplay
        ?? resolveAuthorityMismatchDisplay({
          authorityMismatchSummary,
          authorityMismatchReasonSummary,
        }),
      settleAuthoritySummary,
      traceEmbodimentSummary,
      includeSettleAuthority: true,
      speechEvidence: resolvedSpeechEvidence,
    }).filter(entry => entry.key !== 'authority')
    const embodimentClosureStage = speechRow.embodimentClosureStage
      ?? speechSummaryEntries.find(entry => entry.key === 'closure-stage')?.value
      ?? null
    const traceSummaryEntries = buildTraceTelemetrySummaryEntries(traceSummary)

    return [{
      cueId: authorityRow.cueId,
      cueText: authorityRow.cueText,
      driftStatus: authorityRow.driftStatus,
      aligned: authorityRow.aligned,
      ...(embodimentClosureStage ? { embodimentClosureStage } : {}),
      severityScore,
      hasSpeechDrift,
      surfaces: authorityRow.surfaces.join(', '),
      lanes: authorityRow.lanes.join(', '),
      authorityDriftLanes,
      evidenceKinds,
      speechEvidence: resolvedSpeechEvidence ?? buildSpeechEvidenceSnapshot(speechRow),
      speechSummaryEntries,
      authorityTrustSummary: resolvedAuthorityTrustSummary,
      settleAuthoritySummary,
      rendererDriftSummary: speechRow.rendererDriftSummary ?? null,
      settleDriftSummary,
      traceEmbodimentSummary,
      authorityMatchSummary: speechRow.authorityMatchSummary,
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
      authorityMismatchDisplay: authorityMismatchDisplay
        ?? resolveAuthorityMismatchDisplay({
          authorityMismatchSummary,
          authorityMismatchReasonSummary,
        }),
      traceSummaryEntries,
      traceSummary: usesUpstreamTraceSummary ? traceSummary : resolvedTraceSummary,
    }]
  }).sort((left, right) =>
    right.severityScore - left.severityScore
    || Number(right.hasSpeechDrift) - Number(left.hasSpeechDrift)
    || right.authorityDriftLanes.length - left.authorityDriftLanes.length
    || right.evidenceKinds.length - left.evidenceKinds.length
    || left.cueId.localeCompare(right.cueId),
  )
}

export function filterSpeechAuthorityHotspots(
  hotspots: SpeechAuthorityHotspot[],
  options?: SpeechAuthorityHotspotFilterOptions,
) {
  return hotspots.filter((hotspot) => {
    if (options?.settleAuthority) {
      const prefix = `${options.settleAuthority} |`
      if (!hotspot.settleAuthoritySummary?.startsWith(prefix))
        return false
    }
    if (options?.authorityMatch) {
      if (!matchesAuthorityMismatchFilter({
        authorityDriftLanes: hotspot.authorityDriftLanes,
        authoritySegmentMatched: hotspot.traceSummary?.segmentBinding.matched,
        authorityMatchedDrivers: hotspot.traceSummary?.segmentBinding.matchedDrivers,
      }, options.authorityMatch)) {
        return false
      }
    }
    if (options?.rendererDrift && !matchesRendererDriftFilter(hotspot, options.rendererDrift))
      return false
    return true
  })
}
