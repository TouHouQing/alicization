import type {
  StageEmbodimentPerformanceState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'

import type { Live2DResolvedExpressionSelection } from './expression-runtime'
import type { Live2DMotionExecutionCueSnapshot } from './motion-execution'

export interface Live2DExecutionDiagnosticsSnapshot {
  activeExpression: {
    name: string | null
    reason: Live2DResolvedExpressionSelection['reason'] | null
    score: number | null
    segmentId: string | null
  } | null
  activeLipSync: {
    active: boolean
    dominantViseme: string | null
    dominantWeight: number | null
    segmentId: string | null
  } | null
  activeMotion: {
    group: string | null
    index: number | null
    segmentId: string | null
  } | null
  activeBody: {
    settle: number | null
    openness: number | null
    segmentId: string | null
  } | null
  activeVoice: {
    active: boolean
    phase: string | null
    segmentId: string | null
  } | null
  cue: {
    emotion: string | null
    facialCue: string | null
    preferredExpressionAliases: string[]
    preferredMotionAliases: string[]
    residentMode: string | null
    preferredBlinkCadence: string | null
    preferredGazeMode: string | null
    preferredPauseMode: string | null
    preferredLipsyncMode: string | null
    preferredVoiceMode: string | null
    preferredPacingMode: string | null
    reasonTags: string[]
    signature: string | null
    live2dFacialReleaseMs: number | null
    live2dMotionFollowThroughMs: number | null
  } | null
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function normalizeOptionalIndex(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Math.max(0, Math.floor(Number(value)))
}

function normalizeOptionalScore(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Number(value)
}

function normalizeAliasList(values: readonly string[] | string[] | null | undefined) {
  return (values ?? [])
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
}

function normalizeTextList(values: readonly string[] | string[] | null | undefined) {
  return normalizeAliasList(values)
}

function normalizeOptionalHint(value: string | null | undefined) {
  return normalizeText(value)
}

function isTimelineShellSegmentId(value: string | null | undefined) {
  const normalized = normalizeText(value)
  if (!normalized)
    return false

  return normalized.startsWith('driver:')
    || /^turn-[^|]*:\d+$/u.test(normalized)
}

function resolveSpeechRenderAuthoritySegmentId(
  speechRenderState: StageEmbodimentSpeechRenderState | null | undefined,
) {
  const candidates = [
    speechRenderState?.item?.digitalLifeFrame?.id,
    speechRenderState?.item?.segmentId,
    speechRenderState?.item?.cue?.id,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate)
    if (normalized)
      return normalized
  }

  return null
}

function resolveExecutionSegmentId(performanceState: StageEmbodimentPerformanceState | null | undefined) {
  const activeSegmentFrameId = normalizeText(performanceState?.activeSegment?.digitalLifeFrame?.id ?? null)
  if (activeSegmentFrameId)
    return activeSegmentFrameId

  const activeSegmentCueId = normalizeText(performanceState?.activeSegment?.cue?.id ?? null)
  if (activeSegmentCueId && !isTimelineShellSegmentId(activeSegmentCueId))
    return activeSegmentCueId

  const candidates = [
    performanceState?.activeSegment?.segmentId,
    performanceState?.driverAuthority?.segmentId,
    performanceState?.activeCue?.id,
    activeSegmentCueId,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate)
    if (normalized)
      return normalized
  }

  return null
}

function resolveAuthoritativeCue(
  performanceState: StageEmbodimentPerformanceState | null | undefined,
) {
  return performanceState?.activeSegment?.cue ?? performanceState?.activeCue ?? null
}

function resolveMotionExecutionCue(
  currentMotion: {
    cue?: Live2DMotionExecutionCueSnapshot | null
  } | null | undefined,
) {
  return currentMotion?.cue ?? null
}

function hasAuthoritativeBodySegment(
  performanceState: StageEmbodimentPerformanceState | null | undefined,
) {
  return performanceState?.driverAuthority?.bodySegmentMatched === true
}

export function createIdleLive2DExecutionDiagnosticsSnapshot(): Live2DExecutionDiagnosticsSnapshot {
  return {
    activeExpression: null,
    activeLipSync: null,
    activeMotion: null,
    activeBody: null,
    activeVoice: null,
    cue: null,
  }
}

export function buildLive2DExecutionDiagnosticsSnapshot(input: {
  currentBody?: { settle?: number | null, openness?: number | null } | null
  currentLipSync?: {
    active?: boolean | null
    dominantViseme?: string | null
    dominantWeight?: number | null
    segmentId?: string | null
  } | null
  currentMotion?: {
    group?: string | null
    index?: number | null
    segmentId?: string | null
    cue?: Live2DMotionExecutionCueSnapshot | null
  } | null
  performanceState?: StageEmbodimentPerformanceState | null
  preferredExpressionAliases?: string[] | null
  selection?: Live2DResolvedExpressionSelection | null
  speechRenderState?: StageEmbodimentSpeechRenderState | null
}) {
  const authoritativeCue = resolveAuthoritativeCue(input.performanceState)
    ?? resolveMotionExecutionCue(input.currentMotion)
  const facialCue = normalizeText(
    input.performanceState?.activeFacialCue
    ?? input.performanceState?.performance.facialCue
    ?? authoritativeCue?.facialCue
    ?? null,
  )
  const emotion = normalizeText(
    authoritativeCue?.emotion
    ?? input.performanceState?.performance.baseEmotion
    ?? null,
  )
  const rendererHints = authoritativeCue?.rendererHints
  const rendererSettle = authoritativeCue?.rendererSettle
  const reasonTags = normalizeTextList(rendererHints?.reasonTags)
  const signature = normalizeText(rendererHints?.signature ?? null)
  const preferredPauseMode = normalizeOptionalHint((rendererHints as { preferredPauseMode?: string | null | undefined } | null | undefined)?.preferredPauseMode)
  const preferredLipsyncMode = normalizeOptionalHint((rendererHints as { preferredLipsyncMode?: string | null | undefined } | null | undefined)?.preferredLipsyncMode)
  const preferredVoiceMode = normalizeOptionalHint((rendererHints as { preferredVoiceMode?: string | null | undefined } | null | undefined)?.preferredVoiceMode)
  const preferredPacingMode = normalizeOptionalHint((rendererHints as { preferredPacingMode?: string | null | undefined } | null | undefined)?.preferredPacingMode)
  const motionGroup = normalizeText(input.currentMotion?.group)
  const motionIndex = normalizeOptionalIndex(input.currentMotion?.index)
  const currentLipSync = input.currentLipSync
  const segmentId = resolveExecutionSegmentId(input.performanceState)
  const motionSegmentId = normalizeText((input.currentMotion as { segmentId?: string | null } | null | undefined)?.segmentId) ?? segmentId
  const speechVoicePhase = normalizeText(
    input.speechRenderState?.playbackPhase
    ?? input.speechRenderState?.phase
    ?? null,
  )
  const speechVoiceSegmentId = resolveSpeechRenderAuthoritySegmentId(input.speechRenderState) ?? segmentId
  const hasActiveVoice = Boolean(
    input.speechRenderState
    && (
      input.speechRenderState.active === true
      || (speechVoicePhase != null && speechVoicePhase !== 'idle')
      || speechVoiceSegmentId != null
    ),
  )

  return {
    activeExpression: input.selection
      ? {
          name: normalizeText(input.selection.name),
          reason: input.selection.reason,
          score: normalizeOptionalScore(input.selection.score),
          segmentId,
        }
      : null,
    activeLipSync: currentLipSync && (
      typeof currentLipSync.active === 'boolean'
      || normalizeText(currentLipSync.dominantViseme) != null
      || Number.isFinite(currentLipSync.dominantWeight)
    )
      ? {
          active: currentLipSync.active === true,
          dominantViseme: normalizeText(currentLipSync.dominantViseme),
          dominantWeight: normalizeOptionalScore(currentLipSync.dominantWeight),
          segmentId: normalizeText(currentLipSync.segmentId) ?? segmentId,
        }
      : null,
    activeMotion: motionGroup || motionIndex != null
      ? {
          group: motionGroup,
          index: motionIndex,
          segmentId: motionSegmentId,
        }
      : null,
    activeBody: hasAuthoritativeBodySegment(input.performanceState) && input.currentBody && (
      Number.isFinite(input.currentBody.settle)
      || Number.isFinite(input.currentBody.openness)
    )
      ? {
          settle: normalizeOptionalScore(input.currentBody.settle),
          openness: normalizeOptionalScore(input.currentBody.openness),
          segmentId,
        }
      : null,
    activeVoice: hasActiveVoice
      ? {
          active: input.speechRenderState?.active === true,
          phase: speechVoicePhase,
          segmentId: speechVoiceSegmentId,
        }
      : null,
    cue: emotion
      || facialCue
      || rendererSettle
      || normalizeAliasList(input.preferredExpressionAliases).length > 0
      || normalizeAliasList(rendererHints?.preferredMotionAliases).length > 0
      || preferredPauseMode
      || preferredLipsyncMode
      || preferredVoiceMode
      || preferredPacingMode
      || reasonTags.length > 0
      || signature
      ? {
          emotion,
          facialCue,
          preferredExpressionAliases: normalizeAliasList(input.preferredExpressionAliases),
          preferredMotionAliases: normalizeAliasList(rendererHints?.preferredMotionAliases),
          residentMode: normalizeOptionalHint(rendererHints?.residentMode),
          preferredBlinkCadence: normalizeOptionalHint(rendererHints?.preferredBlinkCadence),
          preferredGazeMode: normalizeOptionalHint(rendererHints?.preferredGazeMode),
          preferredPauseMode,
          preferredLipsyncMode,
          preferredVoiceMode,
          preferredPacingMode,
          reasonTags,
          signature,
          live2dFacialReleaseMs: Number.isFinite(rendererSettle?.live2dFacialReleaseMs)
            ? Number(rendererSettle?.live2dFacialReleaseMs)
            : null,
          live2dMotionFollowThroughMs: Number.isFinite(rendererSettle?.live2dMotionFollowThroughMs)
            ? Number(rendererSettle?.live2dMotionFollowThroughMs)
            : null,
        }
      : null,
  } satisfies Live2DExecutionDiagnosticsSnapshot
}
