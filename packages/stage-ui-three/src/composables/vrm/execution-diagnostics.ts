import type {
  StageEmbodimentPerformanceState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'

import type { VrmMotionExecutionCueSnapshot } from './action-playback'
import type { VrmLipSyncCueSnapshot } from './lip-sync'

export interface VrmExecutionDiagnosticsSnapshot {
  activeEmotion: {
    name: string | null
    resolvedExpressionNames: string[]
    segmentId: string | null
  } | null
  activeFacialCue: {
    name: string | null
    affectsMouth: boolean | null
    segmentId: string | null
  } | null
  activeMotion: {
    cue: string | null
    segmentId: string | null
  } | null
  activeBody: {
    settle: number | null
    openness: number | null
    segmentId: string | null
  } | null
  activeLipSync: {
    active: boolean
    dominantViseme: string | null
    dominantWeight: number | null
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
    preferredBlinkCadence: string | null
    preferredGazeMode: string | null
    preferredPauseMode: string | null
    preferredLipsyncMode: string | null
    preferredVoiceMode: string | null
    preferredPacingMode: string | null
    reasonTags: string[]
    residentMode: string | null
    signature: string | null
    vrmActionFadeMs: number | null
    vrmExpressionBlendMs: number | null
  } | null
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function normalizeAliasList(values: readonly string[] | string[] | null | undefined) {
  return (values ?? [])
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
}

function normalizeResolvedExpressionNames(values: readonly string[] | string[] | null | undefined) {
  return [...new Set(normalizeAliasList(values).map(value => value.toLowerCase()))]
}

function resolveSpeechRenderAuthoritySegmentId(
  speechRenderState: StageEmbodimentSpeechRenderState | null | undefined,
) {
  return normalizeText(
    speechRenderState?.item?.digitalLifeFrame?.id
    ?? speechRenderState?.item?.segmentId
    ?? speechRenderState?.item?.cue?.id
    ?? null,
  )
}

function resolveExecutionSegmentId(performanceState: StageEmbodimentPerformanceState | null | undefined) {
  const activeSegmentFrameId = normalizeText(performanceState?.activeSegment?.digitalLifeFrame?.id ?? null)
  if (activeSegmentFrameId)
    return activeSegmentFrameId

  const activeSegmentCueId = normalizeText(performanceState?.activeSegment?.cue?.id ?? null)
  if (activeSegmentCueId && !activeSegmentCueId.startsWith('turn-') && !activeSegmentCueId.startsWith('driver:'))
    return activeSegmentCueId

  return normalizeText(
    performanceState?.activeSegment?.segmentId
    ?? performanceState?.driverAuthority?.segmentId
    ?? performanceState?.activeCue?.id
    ?? activeSegmentCueId
    ?? null,
  )
}

function hasAuthoritativeBodySegment(
  performanceState: StageEmbodimentPerformanceState | null | undefined,
) {
  return performanceState?.driverAuthority?.bodySegmentMatched === true
}

function resolveAuthoritativeCue(
  performanceState: StageEmbodimentPerformanceState | null | undefined,
) {
  return performanceState?.activeSegment?.cue ?? performanceState?.activeCue ?? null
}

function resolveMotionExecutionCueSnapshot(
  currentMotion: {
    cueSnapshot?: VrmMotionExecutionCueSnapshot | null
  } | null | undefined,
) {
  return currentMotion?.cueSnapshot ?? null
}

function resolveLipSyncExecutionCueSnapshot(
  currentLipSync: {
    cueSnapshot?: VrmLipSyncCueSnapshot | null
  } | null | undefined,
) {
  return currentLipSync?.cueSnapshot ?? null
}

export function createIdleVrmExecutionDiagnosticsSnapshot(): VrmExecutionDiagnosticsSnapshot {
  return {
    activeEmotion: null,
    activeFacialCue: null,
    activeMotion: null,
    activeBody: null,
    activeLipSync: null,
    activeVoice: null,
    cue: null,
  }
}

export function buildVrmExecutionDiagnosticsSnapshot(input: {
  currentBody?: {
    settle?: number | null
    openness?: number | null
  } | null
  currentEmotion?: string | null
  currentEmotionResolvedExpressionNames?: string[] | null
  currentFacialCue?: string | null
  currentFacialCueAffectsMouth?: boolean | null
  currentMotion?: {
    cue?: string | null
    segmentId?: string | null
    cueSnapshot?: VrmMotionExecutionCueSnapshot | null
  } | null
  currentLipSync?: {
    active?: boolean | null
    dominantViseme?: string | null
    dominantWeight?: number | null
    segmentId?: string | null
    cueSnapshot?: VrmLipSyncCueSnapshot | null
  } | null
  performanceState?: StageEmbodimentPerformanceState | null
  speechRenderState?: StageEmbodimentSpeechRenderState | null
}) {
  const performanceState = input.performanceState
  const authoritativeCue = resolveAuthoritativeCue(performanceState)
    ?? resolveMotionExecutionCueSnapshot(input.currentMotion)
    ?? resolveLipSyncExecutionCueSnapshot(input.currentLipSync)
  const emotion = normalizeText(
    authoritativeCue?.emotion
    ?? performanceState?.performance.baseEmotion
    ?? null,
  )
  const facialCue = normalizeText(
    performanceState?.activeFacialCue
    ?? performanceState?.performance.facialCue
    ?? authoritativeCue?.facialCue
    ?? null,
  )
  const segmentId = resolveExecutionSegmentId(performanceState)
  const rendererSettle = authoritativeCue?.rendererSettle
  const rendererHints = authoritativeCue?.rendererHints
  const currentEmotion = normalizeText(input.currentEmotion)
  const currentEmotionResolvedExpressionNames = normalizeResolvedExpressionNames(input.currentEmotionResolvedExpressionNames)
  const currentFacialCue = normalizeText(input.currentFacialCue)
  const currentMotionCue = normalizeText(input.currentMotion?.cue)
  const currentMotionSegmentId = normalizeText(input.currentMotion?.segmentId) || segmentId
  const currentLipSync = input.currentLipSync
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
  const preferredBlinkCadence = normalizeText(rendererHints?.preferredBlinkCadence ?? null)
  const preferredGazeMode = normalizeText(rendererHints?.preferredGazeMode ?? null)
  const preferredPauseMode = normalizeText((rendererHints as { preferredPauseMode?: string | null | undefined } | null | undefined)?.preferredPauseMode ?? null)
  const preferredLipsyncMode = normalizeText((rendererHints as { preferredLipsyncMode?: string | null | undefined } | null | undefined)?.preferredLipsyncMode ?? null)
  const preferredVoiceMode = normalizeText((rendererHints as { preferredVoiceMode?: string | null | undefined } | null | undefined)?.preferredVoiceMode ?? null)
  const preferredPacingMode = normalizeText((rendererHints as { preferredPacingMode?: string | null | undefined } | null | undefined)?.preferredPacingMode ?? null)
  const reasonTags = normalizeAliasList(rendererHints?.reasonTags)
  const residentMode = normalizeText(rendererHints?.residentMode ?? null)
  const signature = normalizeText(rendererHints?.signature ?? null)
  const preferredMotionAliases = normalizeAliasList(rendererHints?.preferredMotionAliases)

  return {
    activeEmotion: currentEmotion || currentEmotionResolvedExpressionNames.length > 0
      ? {
          name: currentEmotion,
          resolvedExpressionNames: currentEmotionResolvedExpressionNames,
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
          dominantWeight: Number.isFinite(currentLipSync.dominantWeight)
            ? Number(currentLipSync.dominantWeight)
            : null,
          segmentId: normalizeText(currentLipSync.segmentId) ?? segmentId,
        }
      : null,
    activeVoice: hasActiveVoice
      ? {
          active: input.speechRenderState?.active === true,
          phase: speechVoicePhase,
          segmentId: speechVoiceSegmentId,
        }
      : null,
    activeFacialCue: currentFacialCue || typeof input.currentFacialCueAffectsMouth === 'boolean'
      ? {
          name: currentFacialCue,
          affectsMouth: typeof input.currentFacialCueAffectsMouth === 'boolean'
            ? input.currentFacialCueAffectsMouth
            : null,
          segmentId,
        }
      : null,
    activeMotion: currentMotionCue
      ? {
          cue: currentMotionCue,
          segmentId: currentMotionSegmentId,
        }
      : null,
    activeBody: hasAuthoritativeBodySegment(performanceState) && input.currentBody && (
      Number.isFinite(input.currentBody.settle)
      || Number.isFinite(input.currentBody.openness)
    )
      ? {
          settle: Number.isFinite(input.currentBody.settle)
            ? Number(input.currentBody.settle)
            : null,
          openness: Number.isFinite(input.currentBody.openness)
            ? Number(input.currentBody.openness)
            : null,
          segmentId,
        }
      : null,
    cue: emotion
      || facialCue
      || rendererSettle
      || preferredBlinkCadence
      || preferredGazeMode
      || preferredPauseMode
      || preferredLipsyncMode
      || preferredVoiceMode
      || preferredPacingMode
      || reasonTags.length > 0
      || residentMode
      || signature
      || normalizeAliasList(authoritativeCue?.rendererHints?.preferredExpressionAliases).length > 0
      || preferredMotionAliases.length > 0
      ? {
          emotion,
          facialCue,
          preferredExpressionAliases: normalizeAliasList(authoritativeCue?.rendererHints?.preferredExpressionAliases),
          preferredMotionAliases,
          preferredBlinkCadence,
          preferredGazeMode,
          preferredPauseMode,
          preferredLipsyncMode,
          preferredVoiceMode,
          preferredPacingMode,
          reasonTags,
          residentMode,
          signature,
          vrmActionFadeMs: Number.isFinite(rendererSettle?.vrmActionFadeMs)
            ? Number(rendererSettle?.vrmActionFadeMs)
            : null,
          vrmExpressionBlendMs: Number.isFinite(rendererSettle?.vrmExpressionBlendMs)
            ? Number(rendererSettle?.vrmExpressionBlendMs)
            : null,
        }
      : null,
  } satisfies VrmExecutionDiagnosticsSnapshot
}
