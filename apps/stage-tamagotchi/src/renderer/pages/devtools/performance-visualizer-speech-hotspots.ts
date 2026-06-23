import type { StageEmbodimentPerformanceMatchedDriver } from '@proj-alicization/stage-shared'

import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerAuthorityMismatchFilter } from './performance-visualizer-authority-mismatch-filter'
import type { PerformanceVisualizerAuthoritySegmentRow } from './performance-visualizer-authority-summary'
import type { PerformanceVisualizerRuntimeDiagnosticSummaryEntry } from './performance-visualizer-runtime-diagnostic-summary'
import type { SpeechAuthoritySegmentRow } from './performance-visualizer-speech-authority'
import type { PerformanceVisualizerSpeechDiagnosticSummaryEntry } from './performance-visualizer-speech-diagnostic-summary'
import type { PerformanceVisualizerSpeechEvidenceSnapshot } from './performance-visualizer-speech-evidence'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import {
  buildAuthorityMismatchReasonSummary,
  buildAuthorityMismatchSummary,
  matchesAuthorityMismatchFilter,

} from './performance-visualizer-authority-mismatch-filter'
import { buildAuthoritySettleLines } from './performance-visualizer-authority-settle'
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
import { buildTraceTelemetrySummary } from './performance-visualizer-trace-telemetry'

export interface SpeechAuthorityHotspot {
  cueId: string
  cueText: string | null
  driftStatus: PerformanceVisualizerAuthoritySegmentRow['driftStatus']
  aligned: boolean | null
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
      rendererTarget: 'live2d' | 'vrm' | null
      matchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
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
    rendererTarget: 'live2d' | 'vrm' | null
    matchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
    matchedSources: string[]
  }
  traceContext?: Pick<StageThreeRuntimeSpeechEmbodimentDiagnostics, 'driverSummary'>
}) {
  if (input.settleDriftSummary.length === 0)
    return null

  if (input.segmentBinding.matched) {
    return `authority-bound | segment=${input.cueId} | target=${input.segmentBinding.rendererTarget ?? 'n/a'} | drivers=${input.segmentBinding.matchedDrivers.join(', ') || 'n/a'} | sources=${input.segmentBinding.matchedSources.join(', ') || 'n/a'}`
  }

  const fallbackDrivers: StageEmbodimentPerformanceMatchedDriver[] = []
  const fallbackSources: string[] = []
  if (input.traceContext?.driverSummary?.face?.segmentId === input.cueId) {
    fallbackDrivers.push('face')
    const source = input.traceContext.driverSummary.face.source?.trim()
    if (source && !fallbackSources.includes(source))
      fallbackSources.push(source)
  }
  if (input.traceContext?.driverSummary?.motion?.segmentId === input.cueId) {
    fallbackDrivers.push('motion')
    const source = input.traceContext.driverSummary.motion.source?.trim()
    if (source && !fallbackSources.includes(source))
      fallbackSources.push(source)
  }
  if (input.traceContext?.driverSummary?.lipsync?.segmentId === input.cueId) {
    fallbackDrivers.push('lipsync')
    const source = input.traceContext.driverSummary.lipsync.source?.trim()
    if (source && !fallbackSources.includes(source))
      fallbackSources.push(source)
  }

  return `fallback-derived | target=${input.segmentBinding.rendererTarget ?? 'n/a'} | drivers=${fallbackDrivers.join(', ') || 'n/a'} | sources=${fallbackSources.join(', ') || 'n/a'}`
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

function deriveAuthorityTrustSummary(input: {
  prosodyAuthoritySummary: string | null
  authoritySegmentId: string | null
}) {
  if (!input.prosodyAuthoritySummary || !input.authoritySegmentId)
    return null

  if (
    input.prosodyAuthoritySummary.includes('provenance=authority-bound')
    && input.prosodyAuthoritySummary.includes(`segment=${input.authoritySegmentId}`)
  ) {
    return '韵律权威链已重新绑定到当前片段，可直接进入长期基线。'
  }

  return null
}

function formatRuntimeProsodyAuthoritySummary(
  prosodyAuthority: {
    segmentId: string | null
    provenance: 'authority-bound' | 'fallback-derived'
    source: string | null
    mode: string | null
    cueProsodyWeight: number | null
    cueMouthWeight: number | null
    cueHeadWeight: number | null
    visemePeakWeight: number | null
  } | null | undefined,
) {
  if (!prosodyAuthority)
    return null

  return [
    `mode=${prosodyAuthority.mode ?? 'n/a'}`,
    `prosody=${Number.isFinite(prosodyAuthority.cueProsodyWeight) ? Number(prosodyAuthority.cueProsodyWeight).toFixed(2) : 'n/a'}`,
    `mouth=${Number.isFinite(prosodyAuthority.cueMouthWeight) ? Number(prosodyAuthority.cueMouthWeight).toFixed(2) : 'n/a'}`,
    `head=${Number.isFinite(prosodyAuthority.cueHeadWeight) ? Number(prosodyAuthority.cueHeadWeight).toFixed(2) : 'n/a'}`,
    `visemePeak=${Number.isFinite(prosodyAuthority.visemePeakWeight) ? Number(prosodyAuthority.visemePeakWeight).toFixed(2) : 'n/a'}`,
    `provenance=${prosodyAuthority.provenance ?? 'fallback-derived'}`,
    `source=${prosodyAuthority.source ?? 'n/a'}`,
    `segment=${prosodyAuthority.segmentId ?? 'n/a'}`,
  ].join(' | ')
}

function resolveHotspotProsodyAuthoritySummary(input: {
  speechEvidence: PerformanceVisualizerSpeechEvidenceSnapshot | null | undefined
  traceContext?: Pick<StageThreeRuntimeSpeechEmbodimentDiagnostics, 'playbackTelemetry'>
}) {
  return input.speechEvidence?.prosodyAuthoritySummary
    ?? formatRuntimeProsodyAuthoritySummary(
      input.traceContext?.playbackTelemetry?.driverAuthority?.prosodyAuthority
      ?? input.traceContext?.playbackTelemetry?.prosodyAuthority
      ?? null,
    )
    ?? null
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

function normalizeTraceSummaryCueId(
  traceSummary: SpeechAuthorityHotspot['traceSummary'],
  cueId: string,
) {
  if (!traceSummary)
    return null

  if (traceSummary.cueId || !cueId)
    return traceSummary

  return {
    ...traceSummary,
    cueId,
  }
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
    'recentDrivingEvent' | 'recentDrivingTraceRecord' | 'recentDrivingTraceEvents' | 'recentDrivingTraceDetails' | 'traceSummary' | 'driverSummary' | 'playbackTelemetry'
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
      || lane === 'face'
      || lane === 'expression'
      || lane === 'action'
      || lane === 'settle',
    )

    const speechEvidence = speechRow.speechEvidence ?? buildSpeechEvidenceSnapshot(speechRow)
    const severityScore = driftWeight(authorityRow.driftStatus)
      + authorityDriftLanes.length
      + evidenceKinds.length
      + prosodyAuthorityWeight(speechEvidence)

    const upstreamTraceSummary = traceContext?.traceSummary
    const traceSummary = normalizeTraceSummaryCueId((
      upstreamTraceSummary
      && (!upstreamTraceSummary.cueId || upstreamTraceSummary.cueId === authorityRow.cueId)
    )
      ? upstreamTraceSummary
      : buildTraceTelemetrySummary({
          cueId: authorityRow.cueId,
          traceContext,
        }), authorityRow.cueId)
    const segmentBinding = traceSummary?.segmentBinding ?? {
      matched: false,
      rendererTarget: traceContext?.driverSummary?.rendererTarget ?? traceContext?.playbackTelemetry?.rendererTarget ?? null,
      matchedDrivers: [],
      matchedSources: [],
    }
    const enrichedSpeechTraceEmbodimentSummary = enrichTraceEmbodimentSummary({
      upstreamSummary: speechRow.traceEmbodimentSummary,
      localSummary: buildTraceEmbodimentSummary({
        recentDrivingTraceRecord: traceContext?.recentDrivingTraceRecord ?? null,
        recentDrivingTraceDetails: traceContext?.recentDrivingTraceDetails ?? [],
      }),
    })
    const traceEmbodimentSummary = traceSummary
      ? (enrichedSpeechTraceEmbodimentSummary && !isGeneratedTraceEmbodimentSummary(enrichedSpeechTraceEmbodimentSummary)
          ? enrichedSpeechTraceEmbodimentSummary
          : buildTraceAuthorityExecutionSummary({
              turnMode: traceSummary.turnMode,
              closureState: traceSummary.closureState,
              finalSurfacePolicy: traceSummary.finalSurfacePolicy,
              matchedDrivers: traceSummary.segmentBinding.matchedDrivers,
              driverExecutionSummary: speechRow.driverExecutionSummary,
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
          segmentBinding,
          traceContext,
        })

    const authority = {
      faceSegmentMatched: segmentBinding.matchedDrivers.includes('face') ? true : segmentBinding.matched ? false : null,
      motionSegmentMatched: segmentBinding.matchedDrivers.includes('motion') ? true : segmentBinding.matched ? false : null,
      lipsyncSegmentMatched: segmentBinding.matchedDrivers.includes('lipsync') ? true : segmentBinding.matched ? false : null,
    } as const
    const authorityMismatchSummary = speechRow.authorityMismatchSummary
      ?? buildAuthorityMismatchSummary(authority)
    const authorityMismatchReasonSummary = speechRow.authorityMismatchReasonSummary
      ?? buildAuthorityMismatchReasonSummary({
        authority,
        matchedSources: segmentBinding.matchedSources,
        driverExecutionSummary: speechRow.driverExecutionSummary,
        finalSurfacePolicy: traceSummary?.finalSurfacePolicy ?? null,
      })
    const upstreamAuthorityTrustSummary = speechRow.authorityTrustSummary
      ?? speechRow.speechSummaryEntries?.find(entry => entry.key === 'authority-trust')?.value
      ?? null
    const resolvedProsodyAuthoritySummary = resolveHotspotProsodyAuthoritySummary({
      speechEvidence,
      traceContext,
    })
    const resolvedAuthorityTrustSummary = upstreamAuthorityTrustSummary
      ?? deriveAuthorityTrustSummary({
        prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
        authoritySegmentId: speechRow.cueId ?? null,
      })

    const speechSummaryEntries = buildSpeechDiagnosticSummaryEntries({
      authorityMatchSummary: speechRow.authorityMatchSummary,
      authorityTrustSummary: resolvedAuthorityTrustSummary,
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
      authorityMismatchDisplay: speechRow.authorityMismatchDisplay
        ?? resolveAuthorityMismatchDisplay({
          authorityMismatchSummary,
          authorityMismatchReasonSummary,
        }),
      settleAuthoritySummary,
      traceEmbodimentSummary,
      includeSettleAuthority: true,
      speechEvidence,
    })
    const traceSummaryEntries = buildTraceTelemetrySummaryEntries(traceSummary)

    return [{
      cueId: authorityRow.cueId,
      cueText: authorityRow.cueText,
      driftStatus: authorityRow.driftStatus,
      aligned: authorityRow.aligned,
      severityScore,
      hasSpeechDrift,
      surfaces: authorityRow.surfaces.join(', '),
      lanes: authorityRow.lanes.join(', '),
      authorityDriftLanes,
      evidenceKinds,
      speechEvidence,
      speechSummaryEntries,
      authorityTrustSummary: resolvedAuthorityTrustSummary,
      settleAuthoritySummary,
      rendererDriftSummary: speechRow.rendererDriftSummary ?? null,
      settleDriftSummary,
      traceEmbodimentSummary,
      authorityMatchSummary: speechRow.authorityMatchSummary,
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
      authorityMismatchDisplay: speechRow.authorityMismatchDisplay
        ?? resolveAuthorityMismatchDisplay({
          authorityMismatchSummary,
          authorityMismatchReasonSummary,
        }),
      traceSummaryEntries,
      traceSummary,
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
