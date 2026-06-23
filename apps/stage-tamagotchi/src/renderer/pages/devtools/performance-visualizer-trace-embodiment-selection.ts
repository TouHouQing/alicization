import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { SpeechAuthoritySegmentRow } from './performance-visualizer-speech-authority'

import { resolveProsodyAuthorityFromSources } from './performance-visualizer-prosody-authority'

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

export function resolveScopedTraceEmbodimentSummary(input: {
  playbackCueAuthorityView?: Pick<
    PerformanceVisualizerPlaybackCueAuthorityView,
    'cueId' | 'authoritySegmentId' | 'traceEmbodimentSummary'
  > | null
  speechEmbodiment?: Pick<
    StageThreeRuntimeSpeechEmbodimentDiagnostics,
    'authoritySummary' | 'playbackTelemetry'
  > | null
  speechAuthoritySegmentRowsByCueId?: Record<
    string,
    Pick<SpeechAuthoritySegmentRow, 'traceEmbodimentSummary'> | undefined
  > | null
}) {
  const playbackCueAuthorityView = input.playbackCueAuthorityView ?? null
  const speechEmbodiment = input.speechEmbodiment ?? null
  const speechAuthoritySegmentRowsByCueId = input.speechAuthoritySegmentRowsByCueId ?? {}

  const playbackCueTraceEmbodimentSummary = normalizeText(playbackCueAuthorityView?.traceEmbodimentSummary)
  if (playbackCueTraceEmbodimentSummary)
    return playbackCueTraceEmbodimentSummary

  const authoritySummaryCueId = normalizeText(speechEmbodiment?.authoritySummary?.cueId)
  const authoritySummarySegmentId = normalizeText(speechEmbodiment?.authoritySummary?.segmentId)
  const authoritySummaryTraceEmbodimentSummary = normalizeText(speechEmbodiment?.authoritySummary?.traceEmbodimentSummary)
  const activePlaybackCueId = normalizeText(playbackCueAuthorityView?.cueId)
  const resolvedProsodyAuthority = resolveProsodyAuthorityFromSources(speechEmbodiment?.playbackTelemetry)
  const activeAuthoritySegmentId = normalizeText(playbackCueAuthorityView?.authoritySegmentId)
    ?? normalizeText(speechEmbodiment?.playbackTelemetry?.driverAuthority?.segmentId)
    ?? normalizeText(speechEmbodiment?.playbackTelemetry?.cue?.id)
    ?? normalizeText(resolvedProsodyAuthority?.segmentId)
    ?? null
  const authoritySummaryMatchesCue = !activePlaybackCueId || !authoritySummaryCueId || authoritySummaryCueId === activePlaybackCueId
  const authoritySummaryMatchesSegment = !activeAuthoritySegmentId || !authoritySummarySegmentId || authoritySummarySegmentId === activeAuthoritySegmentId
  if (authoritySummaryTraceEmbodimentSummary && authoritySummaryMatchesCue && authoritySummaryMatchesSegment)
    return authoritySummaryTraceEmbodimentSummary

  const fallbackTraceCueId = normalizeText(playbackCueAuthorityView?.authoritySegmentId)
    ?? activePlaybackCueId
    ?? activeAuthoritySegmentId
    ?? authoritySummaryCueId
    ?? null
  if (!fallbackTraceCueId)
    return null

  return normalizeText(speechAuthoritySegmentRowsByCueId[fallbackTraceCueId]?.traceEmbodimentSummary)
}
