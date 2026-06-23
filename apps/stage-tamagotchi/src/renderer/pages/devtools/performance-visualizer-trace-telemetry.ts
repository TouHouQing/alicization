import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerAuthorityDriver } from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerTraceTelemetrySummary } from './performance-visualizer-runtime-diagnostic-summary'

function pushUniqueSource(target: string[], source: string | null | undefined) {
  const normalized = typeof source === 'string' ? source.trim() : ''
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

function hasTraceFaceAuthoritySignal(
  driver: NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary']>['face'],
) {
  if (!driver)
    return false

  return Boolean(
    driver.cue
    || driver.source
    || ((driver.confidence ?? 0) > 0),
  )
}

function hasTraceMotionAuthoritySignal(
  driver: NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary']>['motion'],
) {
  if (!driver)
    return false

  return Boolean(
    driver.cue
    || driver.source
    || ((driver.confidence ?? 0) > 0),
  )
}

function hasTraceLipsyncAuthoritySignal(
  driver: NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary']>['lipsync'],
) {
  if (!driver)
    return false

  return Boolean(
    driver.cue
    || driver.source
    || driver.mode
    || ((driver.confidence ?? 0) > 0),
  )
}

function resolveMatchedDriversFromSeededAuthority(input: {
  matchedDrivers: PerformanceVisualizerAuthorityDriver[]
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
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

export function resolveTraceSegmentBinding(input: {
  cueId?: string | null
  playbackCueAuthorityView?: Pick<
    PerformanceVisualizerPlaybackCueAuthorityView,
    'authoritySegmentId'
    | 'authorityRendererTarget'
    | 'authorityMatchedDrivers'
    | 'authoritySources'
    | 'bodySegmentMatched'
    | 'faceSegmentMatched'
    | 'motionSegmentMatched'
    | 'lipsyncSegmentMatched'
    | 'voiceSegmentMatched'
  > | null
  traceContext?: Pick<
    StageThreeRuntimeSpeechEmbodimentDiagnostics,
    'driverSummary' | 'playbackTelemetry'
  >
}) {
  const cueId = input.cueId ?? null
  const playbackCueAuthorityView = input.playbackCueAuthorityView ?? null

  if (playbackCueAuthorityView && (cueId == null || playbackCueAuthorityView.authoritySegmentId === cueId)) {
    const resolvedMatchedDrivers = resolveMatchedDriversFromSeededAuthority({
      matchedDrivers: [...playbackCueAuthorityView.authorityMatchedDrivers],
      bodySegmentMatched: playbackCueAuthorityView.bodySegmentMatched,
      faceSegmentMatched: playbackCueAuthorityView.faceSegmentMatched,
      motionSegmentMatched: playbackCueAuthorityView.motionSegmentMatched,
      lipsyncSegmentMatched: playbackCueAuthorityView.lipsyncSegmentMatched,
      voiceSegmentMatched: playbackCueAuthorityView.voiceSegmentMatched,
    })
    return {
      matched: resolvedMatchedDrivers.length > 0,
      rendererTarget: playbackCueAuthorityView.authorityRendererTarget ?? input.traceContext?.playbackTelemetry?.rendererTarget ?? null,
      matchedDrivers: [...resolvedMatchedDrivers],
      matchedSources: [...playbackCueAuthorityView.authoritySources],
      bodySegmentMatched: playbackCueAuthorityView.bodySegmentMatched ?? null,
      faceSegmentMatched: playbackCueAuthorityView.faceSegmentMatched ?? null,
      motionSegmentMatched: playbackCueAuthorityView.motionSegmentMatched ?? null,
      lipsyncSegmentMatched: playbackCueAuthorityView.lipsyncSegmentMatched ?? null,
      ...(playbackCueAuthorityView.voiceSegmentMatched != null
        ? { voiceSegmentMatched: playbackCueAuthorityView.voiceSegmentMatched }
        : {}),
    }
  }

  const seededAuthority = input.traceContext?.playbackTelemetry?.driverAuthority
  if (seededAuthority) {
    const resolvedMatchedDrivers = resolveMatchedDriversFromSeededAuthority({
      matchedDrivers: [...seededAuthority.matchedDrivers],
      bodySegmentMatched: seededAuthority.bodySegmentMatched,
      faceSegmentMatched: seededAuthority.faceSegmentMatched,
      motionSegmentMatched: seededAuthority.motionSegmentMatched,
      lipsyncSegmentMatched: seededAuthority.lipsyncSegmentMatched,
      voiceSegmentMatched: seededAuthority.voiceSegmentMatched,
    })
    const matched = cueId == null
      ? resolvedMatchedDrivers.length > 0
      : seededAuthority.segmentId === cueId
        || (seededAuthority.segmentId == null && resolvedMatchedDrivers.length > 0)
    return {
      matched,
      rendererTarget: seededAuthority.rendererTarget ?? input.traceContext?.playbackTelemetry?.rendererTarget ?? null,
      matchedDrivers: matched ? [...resolvedMatchedDrivers] : [],
      matchedSources: matched ? [...seededAuthority.sources] : [],
      bodySegmentMatched: matched ? seededAuthority.bodySegmentMatched ?? null : null,
      faceSegmentMatched: matched ? seededAuthority.faceSegmentMatched ?? null : null,
      motionSegmentMatched: matched ? seededAuthority.motionSegmentMatched ?? null : null,
      lipsyncSegmentMatched: matched ? seededAuthority.lipsyncSegmentMatched ?? null : null,
      ...(matched && seededAuthority.voiceSegmentMatched != null
        ? { voiceSegmentMatched: seededAuthority.voiceSegmentMatched }
        : {}),
    }
  }

  const matchedDrivers: PerformanceVisualizerAuthorityDriver[] = []
  const matchedSources: string[] = []
  if (cueId && input.traceContext?.driverSummary?.body?.segmentId === cueId) {
    matchedDrivers.push('body')
  }
  if (
    cueId
    && input.traceContext?.driverSummary?.face?.segmentId === cueId
    && hasTraceFaceAuthoritySignal(input.traceContext.driverSummary.face)
  ) {
    matchedDrivers.push('face')
    pushUniqueSource(matchedSources, input.traceContext.driverSummary.face.source)
  }
  if (
    cueId
    && input.traceContext?.driverSummary?.motion?.segmentId === cueId
    && hasTraceMotionAuthoritySignal(input.traceContext.driverSummary.motion)
  ) {
    matchedDrivers.push('motion')
    pushUniqueSource(matchedSources, input.traceContext.driverSummary.motion.source)
  }
  if (
    cueId
    && input.traceContext?.driverSummary?.lipsync?.segmentId === cueId
    && hasTraceLipsyncAuthoritySignal(input.traceContext.driverSummary.lipsync)
  ) {
    matchedDrivers.push('lipsync')
    pushUniqueSource(matchedSources, input.traceContext.driverSummary.lipsync.source)
  }

  return {
    matched: matchedDrivers.length > 0,
    rendererTarget: input.traceContext?.driverSummary?.rendererTarget ?? input.traceContext?.playbackTelemetry?.rendererTarget ?? null,
    matchedDrivers,
    matchedSources,
    bodySegmentMatched: matchedDrivers.includes('body') ? true : null,
    faceSegmentMatched: matchedDrivers.includes('face') ? true : null,
    motionSegmentMatched: matchedDrivers.includes('motion') ? true : null,
    lipsyncSegmentMatched: matchedDrivers.includes('lipsync') ? true : null,
    ...(matchedDrivers.includes('voice') ? { voiceSegmentMatched: true } : {}),
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
    | 'bodySegmentMatched'
    | 'faceSegmentMatched'
    | 'motionSegmentMatched'
    | 'lipsyncSegmentMatched'
    | 'voiceSegmentMatched'
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
