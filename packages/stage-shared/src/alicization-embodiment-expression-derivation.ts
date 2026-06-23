import type { AlicizationDialogueSpeechTimeline } from './alicization-dialogue-speech-timeline'
import type {
  AlicizationEmbodimentExecutionCueSource,
  AlicizationEmbodimentFaceCue,
  AlicizationEmbodimentMotionBurst,
} from './alicization-embodiment-script'
import type { AlicizationEmbodimentLipSyncVisemeHint } from './alicization-lipsync-contracts'
import type { AlicizationEmbodimentSpeechSegment } from './alicization-speech-plan'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationBodyVoiceOnlySameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
} from './alicization-same-her-renderer-hints'

function clampUnit(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.max(0, Math.min(1, value))
}

function roundHintWeight(value: number) {
  return Number(clampUnit(value).toFixed(2))
}

function roundDerivedIntensity(value: number) {
  return Number(clampUnit(value).toFixed(2))
}

function normalizeRendererHintAlias(value: string | null | undefined) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/-/g, '_')
    : null
}

function hasRememberedSeamMoreRoomRendererHints(rendererHints: {
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  preferredExpressionAliases?: readonly string[] | null
  preferredMotionAliases?: readonly string[] | null
  signature?: string | null
  reasonTags?: readonly string[] | null
} | null | undefined) {
  if (!rendererHints)
    return false

  const primaryExpressionAlias = normalizeRendererHintAlias(rendererHints.preferredExpressionAliases?.[0] ?? null)
  const primaryMotionAlias = normalizeRendererHintAlias(rendererHints.preferredMotionAliases?.[0] ?? null)
  const hasAudibleSameHerCarry = hasAlicizationAudibleSameHerCarry({
    signature: rendererHints.signature,
    reasonTags: rendererHints.reasonTags,
  })
  const hasBodyVoiceOnlySameHerCarry = hasAlicizationBodyVoiceOnlySameHerCarry({
    signature: rendererHints.signature,
    reasonTags: rendererHints.reasonTags,
  })
  const hasQuieterSameHerCarry = hasAlicizationQuieterSameHerCarry({
    signature: rendererHints.signature,
    reasonTags: rendererHints.reasonTags,
  })
  const hasStillVoicedCarry = hasAlicizationStillVoicedSameHerCarry({
    signature: rendererHints.signature,
    reasonTags: rendererHints.reasonTags,
  })
  const restrainedResidentMode = ['measured-return', 'repair-before-closeness'].includes(rendererHints.residentMode ?? '')
  const explicitQuietRestrainedReturn = restrainedResidentMode
    && rendererHints.preferredBlinkCadence === 'quiet'
    && (rendererHints.preferredGazeMode === 'soften' || rendererHints.preferredGazeMode === 'steady')

  if (!restrainedResidentMode && !hasAudibleSameHerCarry && !hasBodyVoiceOnlySameHerCarry && !hasQuieterSameHerCarry && !hasStillVoicedCarry)
    return false

  if (explicitQuietRestrainedReturn)
    return true

  return (
    primaryExpressionAlias === 'soft_gaze'
    && primaryMotionAlias === 'idle_settle'
    && rendererHints.preferredBlinkCadence === 'linger'
    && rendererHints.preferredGazeMode === 'soften'
  ) || (
    (hasAudibleSameHerCarry || hasBodyVoiceOnlySameHerCarry || hasQuieterSameHerCarry || hasStillVoicedCarry)
    && (rendererHints.preferredBlinkCadence === 'linger' || rendererHints.preferredBlinkCadence === 'quiet')
    && (rendererHints.preferredGazeMode === 'soften' || rendererHints.preferredGazeMode === 'steady')
    && ['soft_gaze', 'relaxed'].includes(primaryExpressionAlias ?? '')
    && ['idle_settle', 'steady_focus', 'observe_soft'].includes(primaryMotionAlias ?? '')
  )
}

function hasPendingSameHerEmbodimentRepairPressureRendererHints(rendererHints: {
  reasonTags?: readonly string[] | null
} | null | undefined) {
  return (rendererHints?.reasonTags ?? []).some(tag =>
    tag === 'same-her-causality-repair-pressure'
    || tag === 'runtimeSameHerEmbodimentCausality',
  )
}

function hasRememberedSeamMoreRoomSoftness(input: {
  segment: AlicizationEmbodimentSpeechSegment
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined
}) {
  return hasRememberedSeamMoreRoomRendererHints(input.timelineSegment?.rendererHints)
    || hasRememberedSeamMoreRoomRendererHints(input.segment.rendererHints)
}

function hasPendingSameHerEmbodimentRepairPressure(input: {
  segment: AlicizationEmbodimentSpeechSegment
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined
}) {
  return hasPendingSameHerEmbodimentRepairPressureRendererHints(input.timelineSegment?.rendererHints)
    || hasPendingSameHerEmbodimentRepairPressureRendererHints(input.segment.rendererHints)
}

function resolveSameHerRepairAdditionalSoftnessScaleFromRendererHints(rendererHints: {
  residentMode?: string | null
  signature?: string | null
  reasonTags?: readonly string[] | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  preferredExpressionAliases?: readonly string[] | null
  preferredMotionAliases?: readonly string[] | null
} | null | undefined) {
  if (!rendererHints || rendererHints.residentMode !== 'repair-before-closeness')
    return 1

  const hasSameHerCarry = hasAlicizationAudibleSameHerCarry({
    signature: rendererHints.signature,
    reasonTags: rendererHints.reasonTags,
  }) || hasAlicizationBodyVoiceOnlySameHerCarry({
    signature: rendererHints.signature,
    reasonTags: rendererHints.reasonTags,
  }) || hasAlicizationQuieterSameHerCarry({
    signature: rendererHints.signature,
    reasonTags: rendererHints.reasonTags,
  }) || hasAlicizationStillVoicedSameHerCarry({
    signature: rendererHints.signature,
    reasonTags: rendererHints.reasonTags,
  })

  if (!hasSameHerCarry || !hasRememberedSeamMoreRoomRendererHints(rendererHints))
    return 1

  return 0.96
}

function resolveSameHerRepairAdditionalSoftnessScale(input: {
  segment: AlicizationEmbodimentSpeechSegment
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined
}) {
  return Math.min(
    resolveSameHerRepairAdditionalSoftnessScaleFromRendererHints(input.timelineSegment?.rendererHints),
    resolveSameHerRepairAdditionalSoftnessScaleFromRendererHints(input.segment.rendererHints),
  )
}

function resolvePreferredLipsyncMode(input: {
  segment: AlicizationEmbodimentSpeechSegment
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined
}) {
  return input.timelineSegment?.rendererHints?.preferredLipsyncMode
    ?? input.segment.rendererHints?.preferredLipsyncMode
    ?? null
}

export function resolveAlicizationClosedVisemeWeight(segment: AlicizationEmbodimentSpeechSegment) {
  const prosody = segment.prosody
  const emphasis = prosody?.emphasisStrength ?? 0.5
  const prosodyWeight = emphasis * 0.22

  switch (prosody?.pauseClass) {
    case 'full-stop':
    case 'question':
    case 'exclaim':
      return roundHintWeight(0.58 + prosodyWeight)
    case 'ellipsis':
      return roundHintWeight(0.48 + prosodyWeight)
    case 'comma':
      return roundHintWeight(0.36 + prosodyWeight)
    case 'enumeration':
      return roundHintWeight(0.32 + prosodyWeight)
    case 'none':
    default:
      return roundHintWeight(0.28 + prosodyWeight)
  }
}

export function resolveAlicizationContourViseme(segment: AlicizationEmbodimentSpeechSegment) {
  switch (segment.prosody?.contour) {
    case 'rising':
      return 'I' as const
    case 'dip-rise':
      return 'U' as const
    case 'falling':
      return 'O' as const
    case 'flat':
    default:
      return 'E' as const
  }
}

export function resolveAlicizationSecondaryViseme(segment: AlicizationEmbodimentSpeechSegment) {
  const text = segment.text.trim()
  if (!text)
    return 'A' as const

  if (segment.prosody?.pauseClass === 'comma' || segment.prosody?.pauseClass === 'enumeration')
    return 'E' as const

  // Chinese-first fallback bucket stays coarse until phoneme-grade authority exists.
  const lastCharacter = Array.from(text.replace(/[，,。．.？！!?…⋯、]+$/u, '')).at(-1)
  if (!lastCharacter)
    return 'A' as const

  if (/[\u4E00-\u9FFF]/u.test(lastCharacter))
    return 'A' as const

  return 'O' as const
}

export function resolveAlicizationVisemeConfidence(
  timelineSegment: NonNullable<AlicizationDialogueSpeechTimeline['segments'][number]> | null | undefined,
) {
  if (!timelineSegment)
    return null

  const hasExplicitEmphasisCues = timelineSegment.emotion !== undefined || timelineSegment.facialCue !== undefined || timelineSegment.actionCue !== undefined
  return hasExplicitEmphasisCues ? 0.94 : 0.9
}

export function resolveAlicizationTimelineBackedCueConfidence(
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined,
) {
  if (!timelineSegment)
    return 0

  const hasExplicitCue = Boolean(timelineSegment.facialCue || timelineSegment.actionCue)
  const hasHoldWindow = Number.isFinite(timelineSegment.facialHoldMs) || Number.isFinite(timelineSegment.actionHoldMs)
  return hasExplicitCue || hasHoldWindow ? 0.94 : 0.88
}

export function resolveAlicizationTimelineProjectionConfidence(
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined,
) {
  if (!timelineSegment)
    return 0

  const hasActionWindow = timelineSegment.actionWindow !== 'none'
  const hasHoldWindow = Number.isFinite(timelineSegment.actionHoldMs)
  return hasActionWindow || hasHoldWindow ? 0.88 : 0.82
}

export function resolveAlicizationSegmentPreUtteranceCue(segment: AlicizationEmbodimentSpeechSegment) {
  switch (segment.prosody?.pauseClass) {
    case 'question':
    case 'exclaim':
    case 'full-stop':
      return 'steady-inhale' as const
    case 'comma':
    case 'enumeration':
    case 'ellipsis':
      return 'steady-inhale' as const
    case 'none':
    default:
      return null
  }
}

export function resolveAlicizationSegmentPostUtteranceCue(segment: AlicizationEmbodimentSpeechSegment) {
  switch (segment.prosody?.pauseClass) {
    case 'question':
      return 'eyes-soften' as const
    case 'exclaim':
      return 'settle-smile' as const
    case 'full-stop':
    case 'ellipsis':
      return 'soft-release' as const
    case 'comma':
    case 'enumeration':
      return 'soft-release' as const
    case 'none':
    default:
      return null
  }
}

export function buildAlicizationEmbodimentLipSyncHints(input: {
  segment: AlicizationEmbodimentSpeechSegment
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null
}): AlicizationEmbodimentLipSyncVisemeHint[] {
  const { segment, timelineSegment } = input
  const softenRememberedSeamReturn = hasRememberedSeamMoreRoomSoftness({ segment, timelineSegment })
  const pendingSameHerEmbodimentRepairPressure = hasPendingSameHerEmbodimentRepairPressure({ segment, timelineSegment })
  const sameHerRepairAdditionalSoftnessScale = resolveSameHerRepairAdditionalSoftnessScale({ segment, timelineSegment })
  const closedWeight = resolveAlicizationClosedVisemeWeight(segment)
  const contourViseme = resolveAlicizationContourViseme(segment)
  const secondaryViseme = resolveAlicizationSecondaryViseme(segment)
  const prosody = segment.prosody
  const emphasis = prosody?.emphasisStrength ?? 0.5
  const openWeight = roundHintWeight(Math.max(0.08, Math.min(0.62, 0.18 + emphasis * 0.24)))
  const contourWeight = roundHintWeight(Math.max(0.12, Math.min(0.54, 0.2 + emphasis * 0.18)))
  const confidence = resolveAlicizationVisemeConfidence(timelineSegment)
  if (confidence === null)
    return []

  const preferredLipsyncMode = resolvePreferredLipsyncMode({ segment, timelineSegment })
  const visemeWeightScale
    = (softenRememberedSeamReturn ? 0.9 : 1)
      * (pendingSameHerEmbodimentRepairPressure ? 0.86 : 1)
      * sameHerRepairAdditionalSoftnessScale
      * (preferredLipsyncMode === 'restrained' ? 0.88 : 1)
  const scaledClosedWeight = roundHintWeight(closedWeight * visemeWeightScale)
  const scaledContourWeight = roundHintWeight(contourWeight * visemeWeightScale)
  const scaledOpenWeight = roundHintWeight(openWeight * visemeWeightScale)

  return [
    {
      segmentId: segment.id,
      viseme: 'closed',
      weight: scaledClosedWeight,
      source: 'prosody-authority',
      confidence,
    },
    {
      segmentId: segment.id,
      viseme: contourViseme,
      weight: scaledContourWeight,
      source: 'prosody-authority',
      confidence,
    },
    {
      segmentId: segment.id,
      viseme: secondaryViseme,
      weight: scaledOpenWeight,
      source: 'prosody-authority',
      confidence,
    },
  ]
}

export function buildAlicizationEmbodimentFaceCue(input: {
  segment: AlicizationEmbodimentSpeechSegment
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null
  fallbackEmotion: AlicizationEmbodimentFaceCue['emotion']
  fallbackFacialCue: string | null
  fallbackIntensity: number
  fallbackSource?: AlicizationEmbodimentExecutionCueSource
  fallbackConfidence?: number
}): AlicizationEmbodimentFaceCue {
  const {
    fallbackConfidence = 0.72,
    fallbackEmotion,
    fallbackFacialCue,
    fallbackIntensity,
    fallbackSource = 'timeline-projection',
    segment,
    timelineSegment,
  } = input
  const softenRememberedSeamReturn = hasRememberedSeamMoreRoomSoftness({ segment, timelineSegment })
  const pendingSameHerEmbodimentRepairPressure = hasPendingSameHerEmbodimentRepairPressure({ segment, timelineSegment })
  const sameHerRepairAdditionalSoftnessScale = resolveSameHerRepairAdditionalSoftnessScale({ segment, timelineSegment })
  const faceIntensity = timelineSegment?.facialWeight ?? fallbackIntensity
  const faceIntensityScale = (softenRememberedSeamReturn ? 0.9 : 1)
    * (pendingSameHerEmbodimentRepairPressure ? 0.86 : 1)
    * sameHerRepairAdditionalSoftnessScale
  const scaledFaceIntensity = faceIntensityScale < 1
    ? roundDerivedIntensity(faceIntensity * faceIntensityScale)
    : faceIntensity

  return {
    segmentId: segment.id,
    emotion: timelineSegment?.emotion ?? fallbackEmotion,
    facialCue: timelineSegment?.facialCue ?? fallbackFacialCue,
    intensity: scaledFaceIntensity,
    holdMs: Math.max(0, timelineSegment?.facialHoldMs ?? segment.settleMs),
    preUtteranceCue: resolveAlicizationSegmentPreUtteranceCue(segment),
    postUtteranceCue: resolveAlicizationSegmentPostUtteranceCue(segment),
    source: timelineSegment ? 'prosody-authority' : fallbackSource,
    confidence: timelineSegment ? resolveAlicizationTimelineBackedCueConfidence(timelineSegment) : fallbackConfidence,
  }
}

export function buildAlicizationEmbodimentMotionBurst(input: {
  segment: AlicizationEmbodimentSpeechSegment
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null
  fallbackActionCue: string | null
  fallbackIntensity: number
  fallbackSource?: AlicizationEmbodimentExecutionCueSource
  fallbackConfidence?: number
}): AlicizationEmbodimentMotionBurst {
  const {
    fallbackActionCue,
    fallbackConfidence = 0.72,
    fallbackIntensity,
    fallbackSource = 'digital-life-projection',
    segment,
    timelineSegment,
  } = input
  const softenRememberedSeamReturn = hasRememberedSeamMoreRoomSoftness({ segment, timelineSegment })
  const pendingSameHerEmbodimentRepairPressure = hasPendingSameHerEmbodimentRepairPressure({ segment, timelineSegment })
  const sameHerRepairAdditionalSoftnessScale = resolveSameHerRepairAdditionalSoftnessScale({ segment, timelineSegment })
  const preserveFallbackCue = Boolean(
    fallbackActionCue
    && timelineSegment?.rendererHints?.residentMode
    && ['measured-return', 'repair-before-closeness'].includes(timelineSegment.rendererHints.residentMode)
    && timelineSegment.rendererHints.preferredMotionAliases?.includes('InspectFollow'),
  )
  const motionIntensity = timelineSegment?.gestureWeight ?? fallbackIntensity
  const motionIntensityScale = (softenRememberedSeamReturn ? 0.86 : 1)
    * (pendingSameHerEmbodimentRepairPressure ? 0.82 : 1)
    * sameHerRepairAdditionalSoftnessScale
  const scaledMotionIntensity = motionIntensityScale < 1
    ? roundDerivedIntensity(motionIntensity * motionIntensityScale)
    : motionIntensity

  return {
    segmentId: segment.id,
    actionCue: pendingSameHerEmbodimentRepairPressure
      ? 'idle_settle'
      : preserveFallbackCue ? fallbackActionCue : (timelineSegment?.actionCue ?? fallbackActionCue),
    intensity: scaledMotionIntensity,
    holdMs: Math.max(0, timelineSegment?.actionHoldMs ?? segment.settleMs),
    source: timelineSegment ? 'timeline-projection' : fallbackSource,
    confidence: timelineSegment ? resolveAlicizationTimelineProjectionConfidence(timelineSegment) : fallbackConfidence,
  }
}
