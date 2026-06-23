import type { StageEmbodimentPerformanceMatchedDriver } from '@proj-alicization/stage-shared'

import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerTraceTelemetrySummary } from './performance-visualizer-runtime-diagnostic-summary'

function pushUniqueSource(target: string[], source: string | null | undefined) {
  const normalized = typeof source === 'string' ? source.trim() : ''
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

export function resolveTraceSegmentBinding(input: {
  cueId?: string | null
  playbackCueAuthorityView?: Pick<
    PerformanceVisualizerPlaybackCueAuthorityView,
    'authoritySegmentId'
    | 'authorityRendererTarget'
    | 'authorityMatchedDrivers'
    | 'authoritySources'
  > | null
  traceContext?: Pick<
    StageThreeRuntimeSpeechEmbodimentDiagnostics,
    'driverSummary' | 'playbackTelemetry'
  >
}) {
  const cueId = input.cueId ?? null
  const playbackCueAuthorityView = input.playbackCueAuthorityView ?? null

  if (playbackCueAuthorityView && (cueId == null || playbackCueAuthorityView.authoritySegmentId === cueId)) {
    return {
      matched: playbackCueAuthorityView.authorityMatchedDrivers.length > 0,
      rendererTarget: playbackCueAuthorityView.authorityRendererTarget ?? input.traceContext?.playbackTelemetry?.rendererTarget ?? null,
      matchedDrivers: [...playbackCueAuthorityView.authorityMatchedDrivers],
      matchedSources: [...playbackCueAuthorityView.authoritySources],
    }
  }

  const seededAuthority = input.traceContext?.playbackTelemetry?.driverAuthority
  if (seededAuthority) {
    const matched = cueId == null
      ? seededAuthority.matchedDrivers.length > 0
      : seededAuthority.segmentId === cueId
        || (seededAuthority.segmentId == null && seededAuthority.matchedDrivers.length > 0)
    return {
      matched,
      rendererTarget: seededAuthority.rendererTarget ?? input.traceContext?.playbackTelemetry?.rendererTarget ?? null,
      matchedDrivers: matched ? [...seededAuthority.matchedDrivers] : [],
      matchedSources: matched ? [...seededAuthority.sources] : [],
    }
  }

  const matchedDrivers: StageEmbodimentPerformanceMatchedDriver[] = []
  const matchedSources: string[] = []
  if (cueId && input.traceContext?.driverSummary?.face?.segmentId === cueId) {
    matchedDrivers.push('face')
    pushUniqueSource(matchedSources, input.traceContext.driverSummary.face.source)
  }
  if (cueId && input.traceContext?.driverSummary?.motion?.segmentId === cueId) {
    matchedDrivers.push('motion')
    pushUniqueSource(matchedSources, input.traceContext.driverSummary.motion.source)
  }
  if (cueId && input.traceContext?.driverSummary?.lipsync?.segmentId === cueId) {
    matchedDrivers.push('lipsync')
    pushUniqueSource(matchedSources, input.traceContext.driverSummary.lipsync.source)
  }

  return {
    matched: matchedDrivers.length > 0,
    rendererTarget: input.traceContext?.driverSummary?.rendererTarget ?? input.traceContext?.playbackTelemetry?.rendererTarget ?? null,
    matchedDrivers,
    matchedSources,
  }
}

export function buildTraceTelemetrySummary(input: {
  cueId?: string | null
  playbackCueAuthorityView?: Pick<
    PerformanceVisualizerPlaybackCueAuthorityView,
    'authoritySegmentId'
    | 'authorityRendererTarget'
    | 'authorityMatchedDrivers'
    | 'authoritySources'
  > | null
  traceContext?: Pick<
    StageThreeRuntimeSpeechEmbodimentDiagnostics,
    'recentDrivingEvent' | 'recentDrivingTraceRecord' | 'recentDrivingTraceEvents' | 'driverSummary' | 'playbackTelemetry'
  >
}): PerformanceVisualizerTraceTelemetrySummary | null {
  const traceRecord = input.traceContext?.recentDrivingTraceRecord
  if (!traceRecord)
    return null

  const latestEventSummary = input.traceContext?.recentDrivingEvent?.summary
    ?? input.traceContext?.recentDrivingTraceEvents?.at(-1)?.summary
    ?? null

  return {
    cueId: input.cueId ?? null,
    decisionTraceId: traceRecord.decisionTraceId,
    turnMode: traceRecord.turnMode,
    truthState: traceRecord.truthState,
    repairState: traceRecord.repairState,
    finalSurfacePolicy: traceRecord.finalSurfacePolicy,
    closureState: traceRecord.closureState,
    activeThreadId: traceRecord.activeThreadId,
    suppressionTags: traceRecord.suppressionTags,
    latestEventSummary,
    segmentBinding: resolveTraceSegmentBinding({
      cueId: input.cueId,
      playbackCueAuthorityView: input.playbackCueAuthorityView,
      traceContext: input.traceContext,
    }),
  }
}
