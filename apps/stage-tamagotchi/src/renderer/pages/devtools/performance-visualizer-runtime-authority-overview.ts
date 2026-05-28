import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import {
  buildAuthorityMismatchReasonSummary,
  buildAuthorityMismatchSummary,
} from './performance-visualizer-authority-mismatch-filter'
import {
  buildRuntimeAuthoritySummaryEntries,
  buildTraceTelemetrySummaryEntries,
  type PerformanceVisualizerRuntimeDiagnosticSummaryEntry,
  type PerformanceVisualizerTraceTelemetrySummary,
} from './performance-visualizer-runtime-diagnostic-summary'
import { buildTraceTelemetrySummary } from './performance-visualizer-trace-telemetry'

export interface PerformanceVisualizerRuntimeAuthorityOverview {
  rendererTarget: 'live2d' | 'vrm' | null
  authoritySegmentId: string | null
  authorityBindingSummary: string | null
  authorityMatchSummary: string | null
  authorityTrustSummary?: string | null
  prosodyAuthoritySummary: string | null
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
  traceSummary: PerformanceVisualizerTraceTelemetrySummary | null | undefined,
  cueId: string | null,
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

function normalizeRuntimeProsodyAuthoritySummary(
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
    `provenance=${prosodyAuthority.provenance}`,
    `source=${prosodyAuthority.source ?? 'n/a'}`,
    `segment=${prosodyAuthority.segmentId ?? 'n/a'}`,
  ].join(' | ')
}

function resolveRuntimeProsodyAuthority(
  playbackTelemetry: StageThreeRuntimeSpeechEmbodimentDiagnostics['playbackTelemetry'] | null | undefined,
) {
  return playbackTelemetry?.driverAuthority?.prosodyAuthority
    ?? playbackTelemetry?.prosodyAuthority
    ?? null
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

export function buildRuntimeAuthorityOverview(input: {
  speechEmbodiment?: StageThreeRuntimeSpeechEmbodimentDiagnostics | null
  playbackCueAuthorityView?: PerformanceVisualizerPlaybackCueAuthorityView | null
  traceEmbodimentSummary?: string | null
}): PerformanceVisualizerRuntimeAuthorityOverview | null {
  const playbackCueAuthorityView = input.playbackCueAuthorityView ?? null
  const authoritySummary = input.speechEmbodiment?.authoritySummary ?? null
  const playbackTelemetry = input.speechEmbodiment?.playbackTelemetry ?? null
  const driverAuthority = playbackTelemetry?.driverAuthority ?? null
  if (!playbackCueAuthorityView && !driverAuthority && !authoritySummary)
    return null

  const authority = playbackCueAuthorityView
    ? {
        faceSegmentMatched: playbackCueAuthorityView.faceSegmentMatched,
        motionSegmentMatched: playbackCueAuthorityView.motionSegmentMatched,
        lipsyncSegmentMatched: playbackCueAuthorityView.lipsyncSegmentMatched,
      }
    : driverAuthority
  const fallbackAuthorityMismatchSummary = buildAuthorityMismatchSummary(authority)
  const fallbackAuthorityMismatchReasonSummary = buildAuthorityMismatchReasonSummary({
    authority,
    matchedSources: playbackCueAuthorityView?.authoritySources ?? driverAuthority?.sources,
    driverExecutionSummary: null,
    finalSurfacePolicy: input.speechEmbodiment?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
  })
  const authoritySummaryCueId = authoritySummary?.cueId ?? null
  const playbackCueId = playbackCueAuthorityView?.cueId ?? null
  const authoritySummaryMatchesPlaybackCue = !authoritySummaryCueId || !playbackCueId || authoritySummaryCueId === playbackCueId

  const rendererTarget = playbackCueAuthorityView?.authorityRendererTarget ?? authoritySummary?.rendererTarget ?? playbackTelemetry?.rendererTarget ?? null
  const authoritySegmentId = playbackCueAuthorityView?.authoritySegmentId ?? authoritySummary?.segmentId ?? driverAuthority?.segmentId ?? null
  const authorityBindingSummary = playbackCueAuthorityView?.authorityBindingSummary ?? (authoritySummaryMatchesPlaybackCue ? authoritySummary?.bindingSummary : null) ?? null
  const authorityMatchSummary = playbackCueAuthorityView?.authorityMatchSummary ?? (authoritySummaryMatchesPlaybackCue ? authoritySummary?.matchSummary : null) ?? null
  const authorityMismatchSummary = (authoritySummaryMatchesPlaybackCue ? authoritySummary?.authorityMismatchSummary : null) ?? fallbackAuthorityMismatchSummary
  const authorityMismatchReasonSummary = (authoritySummaryMatchesPlaybackCue ? authoritySummary?.authorityMismatchReasonSummary : null) ?? fallbackAuthorityMismatchReasonSummary
  const authorityMismatchDisplay = (authoritySummaryMatchesPlaybackCue ? authoritySummary?.authorityMismatchDisplay : null) ?? resolveAuthorityMismatchDisplay({
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
  })
  const prosodyAuthoritySummary = normalizeRuntimeProsodyAuthoritySummary(resolveRuntimeProsodyAuthority(playbackTelemetry))
  const authorityTrustSummary = (authoritySummaryMatchesPlaybackCue ? authoritySummary?.authorityTrustSummary : null)
    ?? deriveAuthorityTrustSummary({
      prosodyAuthoritySummary,
      authoritySegmentId,
    })
  const settleAuthoritySummary = playbackCueAuthorityView?.settleAuthoritySummary ?? (authoritySummaryMatchesPlaybackCue ? authoritySummary?.settleSummary : null) ?? null
  const authoritySummaryTraceEmbodimentSummary = (
    authoritySummaryCueId
    && playbackCueId
    && authoritySummaryCueId !== playbackCueId
  )
    ? null
    : authoritySummary?.traceEmbodimentSummary
  const traceEmbodimentSummary = playbackCueAuthorityView?.traceEmbodimentSummary
    ?? authoritySummaryTraceEmbodimentSummary
    ?? input.traceEmbodimentSummary
    ?? null
  const expectedCueId = playbackCueAuthorityView?.cueId ?? authoritySummary?.cueId ?? authoritySegmentId ?? null
  const upstreamTraceSummary = input.speechEmbodiment?.traceSummary
  const traceSummary = normalizeTraceSummaryCueId((
    upstreamTraceSummary
    && (!expectedCueId || !upstreamTraceSummary.cueId || upstreamTraceSummary.cueId === expectedCueId)
  )
    ? upstreamTraceSummary
    ?? buildTraceTelemetrySummary({
        cueId: expectedCueId,
        playbackCueAuthorityView: playbackCueAuthorityView
          ? {
              authoritySegmentId: playbackCueAuthorityView.authoritySegmentId,
              authorityRendererTarget: playbackCueAuthorityView.authorityRendererTarget,
              authorityMatchedDrivers: playbackCueAuthorityView.authorityMatchedDrivers,
              authoritySources: playbackCueAuthorityView.authoritySources,
            }
          : null,
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
        playbackCueAuthorityView: playbackCueAuthorityView
          ? {
              authoritySegmentId: playbackCueAuthorityView.authoritySegmentId,
              authorityRendererTarget: playbackCueAuthorityView.authorityRendererTarget,
              authorityMatchedDrivers: playbackCueAuthorityView.authorityMatchedDrivers,
              authoritySources: playbackCueAuthorityView.authoritySources,
            }
          : null,
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
    authorityTrustSummary,
    prosodyAuthoritySummary,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
    authorityMismatchDisplay,
    settleAuthoritySummary,
  })
  const traceSummaryEntries = buildTraceTelemetrySummaryEntries(traceSummary)
  const enrichedTraceSummaryEntries = buildTraceTelemetrySummaryEntries(traceSummary, {
    traceEmbodimentSummary,
  })

  return {
    rendererTarget,
    authoritySegmentId,
    authorityBindingSummary,
    authorityMatchSummary,
    authorityTrustSummary,
    prosodyAuthoritySummary,
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
