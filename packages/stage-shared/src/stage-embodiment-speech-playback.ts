import type { AlicizationDialogueEmbodimentRendererHints } from './alicization-dialogue-embodiment'
import type {
  AlicizationDialogueSpeechRendererSettleHints,
  AlicizationDialogueSpeechTimelineSegment,
} from './alicization-dialogue-speech-timeline'
import type { AlicizationDigitalLifeFrame } from './alicization-digital-life'
import type { AlicizationEmbodimentScriptV1 } from './alicization-embodiment-script'
import type { StageEmbodimentSpeechArticulationState } from './stage-embodiment-speech-articulation'

import { normalizeAlicizationEmbodimentScript } from './alicization-embodiment-script'
import {
  cloneStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentSpeechArticulationState,
  normalizeStageEmbodimentSpeechPlaybackDurationMs,
} from './stage-embodiment-speech-articulation'

const playbackEmbodimentScriptCache = new WeakMap<Record<string, unknown>, AlicizationEmbodimentScriptV1 | null>()

export type StageEmbodimentSpeechPlaybackPhase = 'idle' | 'playing'

export interface StageEmbodimentSpeechPlaybackItem {
  intentId: string | null
  streamId: string | null
  segmentId: string | null
  ownerId: string | null
  text: string
  special: string | null
  continuityHoldMs: number
  playbackDurationMs: number | null
  metadata: Record<string, unknown> | null
  cue: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame: AlicizationDigitalLifeFrame | null
}

export interface StageEmbodimentSpeechDynamicsState {
  speechEnergy: number
  prosodyIntensity: number
  emphasisLevel: number
  cadencePulse: number
}

export interface StageEmbodimentSpeechPlaybackState {
  phase: StageEmbodimentSpeechPlaybackPhase
  item: StageEmbodimentSpeechPlaybackItem | null
  currentAudioSource: unknown | null
  mouthOpenSize: number
  dynamics: StageEmbodimentSpeechDynamicsState
  startedAt: number | null
  endedAt: number | null
  stopReason: string | null
}

interface StageEmbodimentSpeechPlaybackEventBase {
  state: StageEmbodimentSpeechPlaybackState
}

export type StageEmbodimentSpeechPlaybackEvent
  = | (StageEmbodimentSpeechPlaybackEventBase & { type: 'playback-start' })
    | (StageEmbodimentSpeechPlaybackEventBase & { type: 'audio-source-bound' })
    | (StageEmbodimentSpeechPlaybackEventBase & { type: 'mouth-update' })
    | (StageEmbodimentSpeechPlaybackEventBase & { type: 'dynamics-update' })
    | (StageEmbodimentSpeechPlaybackEventBase & { type: 'playback-stop' })

export type StageEmbodimentSpeechRenderPhase = 'idle' | 'starting' | 'playing' | 'stopping'

export interface StageEmbodimentSpeechRenderState {
  phase: StageEmbodimentSpeechRenderPhase
  playbackPhase: StageEmbodimentSpeechPlaybackPhase
  lastEventType: StageEmbodimentSpeechPlaybackEvent['type'] | null
  revision: number
  active: boolean
  item: StageEmbodimentSpeechPlaybackItem | null
  currentAudioSource: unknown | null
  audioBound: boolean
  mouthOpenSize: number
  mouthOpenRatio: number
  visemeIntensity: number
  articulation: StageEmbodimentSpeechArticulationState
  dynamics: StageEmbodimentSpeechDynamicsState
  startedAt: number | null
  endedAt: number | null
  stopReason: string | null
}

function clampUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function clampRange(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min

  return Math.min(max, Math.max(min, value))
}

function normalizeCueToken(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function normalizePlaybackText(value: string | null | undefined) {
  if (typeof value !== 'string')
    return ''

  return value.trim().replace(/\s+/g, ' ')
}

function resolvePlaybackTextMatchKey(value: string | null | undefined) {
  return normalizePlaybackText(value).replace(/[，。！？、,.!?~～…\s]/g, '')
}

function normalizeEmbodimentScriptFromPlaybackMetadata(
  metadata: Record<string, unknown> | null | undefined,
): AlicizationEmbodimentScriptV1 | null {
  if (!metadata)
    return null

  if (playbackEmbodimentScriptCache.has(metadata))
    return playbackEmbodimentScriptCache.get(metadata) ?? null

  const normalized = normalizeAlicizationEmbodimentScript(metadata.embodimentScript)
  playbackEmbodimentScriptCache.set(metadata, normalized)
  return normalized
}

function resolvePlaybackSegmentProsodyIntent(item: StageEmbodimentSpeechPlaybackItem | null) {
  const script = normalizeEmbodimentScriptFromPlaybackMetadata(item?.metadata)
  if (!script)
    return null

  const directMatch = item?.segmentId
    ? script.speechPlan.segments.find(segment => segment.id === item.segmentId)
    : null
  if (directMatch?.prosody)
    return directMatch.prosody

  const normalizedText = normalizePlaybackText(item?.text)
  if (!normalizedText)
    return null

  const textMatches = script.speechPlan.segments.filter(
    segment => resolvePlaybackTextMatchKey(segment.text) === resolvePlaybackTextMatchKey(normalizedText),
  )
  if (textMatches.length !== 1)
    return null

  return textMatches[0]?.prosody ?? null
}

function resolvePlaybackScriptSegment(item: StageEmbodimentSpeechPlaybackItem | null) {
  const script = normalizeEmbodimentScriptFromPlaybackMetadata(item?.metadata)
  if (!script)
    return null

  const directMatch = item?.segmentId
    ? script.speechPlan.segments.find(segment => segment.id === item.segmentId)
    : null
  if (directMatch)
    return directMatch

  const normalizedText = normalizePlaybackText(item?.text)
  if (!normalizedText)
    return null

  const textMatches = script.speechPlan.segments.filter(
    segment => resolvePlaybackTextMatchKey(segment.text) === resolvePlaybackTextMatchKey(normalizedText),
  )
  if (textMatches.length !== 1)
    return null

  return textMatches[0] ?? null
}

function resolvePlaybackScriptResidentMode(item: StageEmbodimentSpeechPlaybackItem | null) {
  const script = normalizeEmbodimentScriptFromPlaybackMetadata(item?.metadata)
  if (!script)
    return null

  const segmentResidentMode = resolvePlaybackScriptSegment(item)?.rendererHints?.residentMode ?? null
  if (segmentResidentMode === 'measured-return' || segmentResidentMode === 'repair-before-closeness')
    return segmentResidentMode

  return script.state.residentMode ?? segmentResidentMode
}

function resolvePlaybackCompanionshipProfile(input: {
  residentMode: string | null | undefined
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null | undefined
}) {
  if (input.residentMode === 'repair-before-closeness')
    return 'repair-before-closeness' as const
  if (input.residentMode === 'measured-return')
    return 'measured-return' as const
  if (input.residentMode === 'quiet-companionship' || input.residentMode === 'quiet-accompaniment')
    return 'quiet-companionship' as const

  const hintResidentMode = input.rendererHints?.residentMode ?? null
  if (hintResidentMode === 'repair-before-closeness')
    return 'repair-before-closeness' as const
  if (hintResidentMode === 'measured-return')
    return 'measured-return' as const
  if (hintResidentMode === 'quiet-companionship' || hintResidentMode === 'quiet-accompaniment')
    return 'quiet-companionship' as const

  return null
}

function isRendererOnlyVisibleRecoveryFrame(
  frame: AlicizationDigitalLifeFrame | null | undefined,
  residentMode: string | null,
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  if (!frame)
    return false

  const normalizedResidentMode = resolvePlaybackCompanionshipProfile({
    residentMode,
    rendererHints: rendererHints ?? mergeRendererHints([
      frame.face.rendererHints ?? null,
      frame.action.rendererHints ?? null,
    ]),
  })

  if (!normalizedResidentMode)
    return false

  const weakBodyCarry = frame.mode === 'recovering'
    || frame.face.expressionMode === 'recover'
    || frame.motor.expressivity <= 0.18
    || frame.motor.gaze.stability <= 0.42

  return weakBodyCarry
    && frame.settleMode === 'hold'
    && frame.lipSync.mode !== 'closed'
    && frame.lipSync.continuityHoldMs >= 180
    && (
      normalizedResidentMode === 'repair-before-closeness'
      || normalizedResidentMode === 'quiet-companionship'
      || normalizedResidentMode === 'measured-return'
    )
}

function resolvePlaybackResidentModeProsodyFallback(
  residentMode: string | null,
) {
  if (residentMode === 'repair-before-closeness') {
    return {
      emphasisOffset: -0.04,
      prosodyOffset: -0.06,
      tempoShift: -0.16,
    }
  }

  if (residentMode === 'measured-return' || residentMode === 'idle-recovering') {
    return {
      emphasisOffset: -0.02,
      prosodyOffset: -0.03,
      tempoShift: -0.1,
    }
  }

  if (residentMode === 'quiet-companionship' || residentMode === 'quiet-accompaniment') {
    return {
      emphasisOffset: -0.02,
      prosodyOffset: -0.035,
      tempoShift: -0.12,
    }
  }

  return {
    emphasisOffset: 0,
    prosodyOffset: 0,
    tempoShift: 0,
  }
}

function isDurableMeasuredReturnHint(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  return rendererHints?.residentMode === 'measured-return'
    && (
      (
        rendererHints.preferredGazeMode === 'steady'
        && rendererHints.preferredBlinkCadence === 'quiet'
      )
      || (
        rendererHints.preferredGazeMode === 'soften'
        && rendererHints.preferredBlinkCadence === 'linger'
      )
      || (
        // Quieter same-person recollection can stay on the same living line
        // without needing the stronger linger cadence.
        rendererHints.preferredGazeMode === 'soften'
        && rendererHints.preferredBlinkCadence === 'quiet'
      )
    )
}

function resolvePlaybackCompanionshipActionCue(input: {
  actionCue: string | null
  residentMode: string | null
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
}) {
  const companionshipProfile = resolvePlaybackCompanionshipProfile({
    residentMode: input.residentMode,
    rendererHints: input.rendererHints,
  })
  if (!input.actionCue)
    return null
  if (companionshipProfile === 'repair-before-closeness')
    return 'idle_settle'
  if (companionshipProfile === 'measured-return') {
    if (input.actionCue === 'observe_focus')
      return isDurableMeasuredReturnHint(input.rendererHints) ? 'observe_focus' : 'idle_settle'
    return input.actionCue === 'steady_focus'
      ? isDurableMeasuredReturnHint(input.rendererHints)
        ? 'steady_focus'
        : 'observe_focus'
      : 'idle_settle'
  }
  if (companionshipProfile === 'quiet-companionship')
    return input.actionCue === 'steady_focus' || input.actionCue === 'observe_focus' ? input.actionCue : 'idle_settle'
  return input.actionCue
}

function resolvePlaybackScriptFaceCue(item: StageEmbodimentSpeechPlaybackItem | null) {
  const script = normalizeEmbodimentScriptFromPlaybackMetadata(item?.metadata)
  const segment = resolvePlaybackScriptSegment(item)
  if (!script || !segment)
    return null

  return script.facePlan.speakingCues.find(cue => cue.segmentId === segment.id) ?? null
}

function resolvePlaybackScriptMotionBurst(item: StageEmbodimentSpeechPlaybackItem | null) {
  const script = normalizeEmbodimentScriptFromPlaybackMetadata(item?.metadata)
  const segment = resolvePlaybackScriptSegment(item)
  if (!script || !segment)
    return null

  return script.motionPlan.actionBursts.find(burst => burst.segmentId === segment.id) ?? null
}

function resolvePlaybackScriptVisemeHint(item: StageEmbodimentSpeechPlaybackItem | null) {
  const script = normalizeEmbodimentScriptFromPlaybackMetadata(item?.metadata)
  const segment = resolvePlaybackScriptSegment(item)
  if (!script || !segment)
    return null

  return script.lipsyncPlan.visemeHints?.find(hint => hint.segmentId === segment.id) ?? null
}

function mergeRendererHintAliases(values: Array<readonly string[] | undefined>) {
  const merged: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    if (!value)
      continue

    for (const candidate of value) {
      if (typeof candidate !== 'string')
        continue

      const normalized = candidate.trim()
      if (!normalized || seen.has(normalized))
        continue

      seen.add(normalized)
      merged.push(normalized)
    }
  }

  return merged
}

function mergeRendererHintReasonTags(values: Array<readonly string[] | undefined>) {
  return mergeRendererHintAliases(values)
}

function mergeRendererHints(
  hints: Array<AlicizationDialogueEmbodimentRendererHints | null | undefined>,
): AlicizationDialogueEmbodimentRendererHints | null {
  const preferredExpressionAliases = mergeRendererHintAliases(
    hints.map(item => item?.preferredExpressionAliases),
  )
  const preferredMotionAliases = mergeRendererHintAliases(
    hints.map(item => item?.preferredMotionAliases),
  )
  const reasonTags = mergeRendererHintReasonTags(
    hints.map(item => item?.reasonTags),
  )
  const signature = hints.find(item => typeof item?.signature === 'string' && item.signature.trim())?.signature
  const preferredGazeMode = hints.find(item =>
    item?.preferredGazeMode === 'steady'
    || item?.preferredGazeMode === 'soften'
    || item?.preferredGazeMode === 'drift',
  )?.preferredGazeMode
  const preferredBlinkCadence = hints.find(item =>
    item?.preferredBlinkCadence === 'normal'
    || item?.preferredBlinkCadence === 'linger'
    || item?.preferredBlinkCadence === 'quiet',
  )?.preferredBlinkCadence
  const preferredPauseMode = hints.find(item =>
    item?.preferredPauseMode === 'longer'
    || item?.preferredPauseMode === 'natural',
  )?.preferredPauseMode
  const preferredLipsyncMode = hints.find(item =>
    item?.preferredLipsyncMode === 'restrained'
    || item?.preferredLipsyncMode === 'matched',
  )?.preferredLipsyncMode
  const preferredVoiceMode = hints.find(item =>
    item?.preferredVoiceMode === 'lower-pressure'
    || item?.preferredVoiceMode === 'even',
  )?.preferredVoiceMode
  const preferredPacingMode = hints.find(item =>
    item?.preferredPacingMode === 'slower'
    || item?.preferredPacingMode === 'natural',
  )?.preferredPacingMode
  const residentMode = hints.find(item => typeof item?.residentMode === 'string' && item.residentMode.trim())?.residentMode

  if (preferredExpressionAliases.length === 0 && preferredMotionAliases.length === 0) {
    if (
      !preferredGazeMode
      && !preferredBlinkCadence
      && !preferredPauseMode
      && !preferredLipsyncMode
      && !preferredVoiceMode
      && !preferredPacingMode
      && !residentMode
      && reasonTags.length === 0
      && !signature
    ) {
      return null
    }

    return {
      preferredBlinkCadence,
      preferredGazeMode,
      preferredPauseMode,
      preferredLipsyncMode,
      preferredVoiceMode,
      preferredPacingMode,
      reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
      residentMode,
      signature,
    }
  }
  return {
    preferredBlinkCadence,
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
    reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
    residentMode,
    signature,
  }
}

function cloneRendererSettleHints(
  hints: AlicizationDialogueSpeechRendererSettleHints | null | undefined,
): AlicizationDialogueSpeechRendererSettleHints | null {
  if (!hints)
    return null

  return {
    live2dFacialReleaseMs: hints.live2dFacialReleaseMs,
    live2dMotionFollowThroughMs: hints.live2dMotionFollowThroughMs,
    vrmActionFadeMs: hints.vrmActionFadeMs,
    vrmExpressionBlendMs: hints.vrmExpressionBlendMs,
  }
}

function resolveProjectedCueBeatWeight(frame: AlicizationDigitalLifeFrame) {
  return clampUnit(frame.voice.cadence * 0.56 + frame.action.intensity * 0.44)
}

function resolveProjectedCueMouthWeight(frame: AlicizationDigitalLifeFrame) {
  const mouthScaleWeight = clampUnit((frame.lipSync.mouthScale - 0.4) / 0.95)
  return clampUnit(mouthScaleWeight * 0.58 + frame.voice.energy * 0.42)
}

function shouldPreserveMeasuredReturnMouthPresence(input: {
  frame: AlicizationDigitalLifeFrame
  rendererHints: AlicizationDialogueSpeechTimelineSegment['rendererHints'] | null | undefined
  residentMode: string | null | undefined
}) {
  const residentMode = input.residentMode === 'measured-return'
    || input.residentMode === 'repair-before-closeness'
    || input.residentMode === 'quiet-companionship'
    || input.residentMode === 'quiet-accompaniment'
    ? input.residentMode === 'quiet-accompaniment' ? 'quiet-companionship' : input.residentMode
    : input.rendererHints?.residentMode === 'measured-return'
      || input.rendererHints?.residentMode === 'repair-before-closeness'
      || input.rendererHints?.residentMode === 'quiet-companionship'
      || input.rendererHints?.residentMode === 'quiet-accompaniment'
      ? input.rendererHints.residentMode === 'quiet-accompaniment'
        ? 'quiet-companionship'
        : input.rendererHints.residentMode
      : null
  if (
    residentMode !== 'measured-return'
    && residentMode !== 'repair-before-closeness'
    && residentMode !== 'quiet-companionship'
  ) {
    return false
  }

  return input.frame.lipSync.continuityHoldMs >= 180
    && input.frame.face.expressionMode === 'hold'
    && input.frame.voice.energy >= 0.28
    && (
      input.rendererHints?.preferredBlinkCadence === 'linger'
      || input.rendererHints?.preferredGazeMode === 'soften'
    )
}

function resolveProjectedRendererSettleValue(
  current: number | undefined,
  derived: number,
  mode: 'prefer-derived' | 'prefer-longer' | 'prefer-shorter',
) {
  if (!Number.isFinite(current))
    return derived

  switch (mode) {
    case 'prefer-longer':
      return Math.max(Number(current), derived)
    case 'prefer-shorter':
      return Math.min(Number(current), derived)
    case 'prefer-derived':
    default:
      return derived
  }
}

function resolveProjectedRendererSettleHints(
  frame: AlicizationDigitalLifeFrame,
  fallback: AlicizationDialogueSpeechRendererSettleHints | null | undefined,
): AlicizationDialogueSpeechRendererSettleHints {
  const measuredReturnContinuityCarry = shouldPreserveMeasuredReturnMouthPresence({
    frame,
    rendererHints: mergeRendererHints([
      frame.face.rendererHints ?? null,
      frame.action.rendererHints ?? null,
    ]),
    residentMode: frame.face.rendererHints?.residentMode ?? frame.action.rendererHints?.residentMode ?? null,
  })
  const faceHoldMs = Math.round(clampRange(frame.face.holdMs, 80, 960))
  const actionHoldMs = Math.round(clampRange(frame.action.holdMs, 70, 720))
  const facialReleaseMs = Math.round(clampRange(
    frame.face.expressionMode === 'hold'
      ? faceHoldMs * 1.08
      : frame.face.expressionMode === 'recover'
        ? faceHoldMs * 0.78
        : faceHoldMs * 0.92,
    80,
    1600,
  ))
  const expressionBlendMs = Math.round(clampRange(
    frame.face.expressionMode === 'hold'
      ? faceHoldMs * 0.92
      : frame.face.expressionMode === 'recover'
        ? faceHoldMs * 0.66
        : faceHoldMs * 0.8,
    60,
    960,
  ))
  const motionFollowThroughMs = Math.round(clampRange(
    frame.action.actionMode === 'hold'
      ? actionHoldMs * 1.06
      : frame.action.actionMode === 'none'
        ? actionHoldMs * 0.68
        : actionHoldMs * 0.86,
    0,
    1200,
  ))
  const actionFadeMs = Math.round(clampRange(
    frame.action.actionMode === 'hold'
      ? actionHoldMs * 0.94
      : measuredReturnContinuityCarry && frame.action.actionMode === 'none'
        ? actionHoldMs * 0.84
        : frame.action.actionMode === 'none'
          ? actionHoldMs * 0.58
          : actionHoldMs * 0.76,
    80,
    1200,
  ))

  return {
    live2dFacialReleaseMs: resolveProjectedRendererSettleValue(
      fallback?.live2dFacialReleaseMs,
      facialReleaseMs,
      frame.face.expressionMode === 'recover' ? 'prefer-shorter' : 'prefer-longer',
    ),
    vrmExpressionBlendMs: resolveProjectedRendererSettleValue(
      fallback?.vrmExpressionBlendMs,
      expressionBlendMs,
      frame.face.expressionMode === 'recover' ? 'prefer-shorter' : 'prefer-longer',
    ),
    live2dMotionFollowThroughMs: resolveProjectedRendererSettleValue(
      fallback?.live2dMotionFollowThroughMs,
      motionFollowThroughMs,
      frame.action.actionMode === 'hold' || (measuredReturnContinuityCarry && frame.action.actionMode === 'none')
        ? 'prefer-longer'
        : frame.action.actionMode === 'none'
          ? 'prefer-shorter'
          : 'prefer-derived',
    ),
    vrmActionFadeMs: resolveProjectedRendererSettleValue(
      fallback?.vrmActionFadeMs,
      actionFadeMs,
      frame.action.actionMode === 'hold' || (measuredReturnContinuityCarry && frame.action.actionMode === 'none')
        ? 'prefer-longer'
        : frame.action.actionMode === 'none'
          ? 'prefer-shorter'
          : 'prefer-derived',
    ),
  }
}

function resolveProsodyTailSettleBonusMs(input: {
  cadencePulse: number
  prosodyIntensity: number
  speechEnergy: number
}) {
  const prosodyTail = clampUnit(input.prosodyIntensity) * 110
  const speechTail = clampUnit(input.speechEnergy) * 70
  const cadenceTail = (1 - clampUnit(input.cadencePulse)) * 90
  return Math.round(clampRange(prosodyTail + speechTail + cadenceTail - 70, 0, 220))
}

function resolveArticulationTailSettleBonusMs(input: {
  articulation: StageEmbodimentSpeechArticulationState
  visemeIntensity: number
}) {
  const articulation = input.articulation
  const closureTail = clampUnit(Math.max(
    articulation.lipClosure,
    articulation.visemes.closed,
  )) * 80
  const openTail = clampUnit(Math.max(
    articulation.openness,
    articulation.jawOpen,
    input.visemeIntensity,
  )) * 60
  const blinkStillnessTail = clampUnit(
    (1 - articulation.openness) * 0.42
    + articulation.lipClosure * 0.28
    + articulation.visemes.closed * 0.3,
  ) * 56
  return Math.round(clampRange(closureTail + openTail + blinkStillnessTail - 36, 0, 170))
}

function resolveRenderStateRendererSettleHints(input: {
  articulation: StageEmbodimentSpeechArticulationState
  dynamics: StageEmbodimentSpeechDynamicsState
  facialCue?: string | null
  phase: StageEmbodimentSpeechRenderPhase
  rendererSettle: AlicizationDialogueSpeechRendererSettleHints | null | undefined
  rendererHints?: AlicizationDialogueSpeechTimelineSegment['rendererHints'] | null | undefined
  stopReason?: string | null | undefined
  visemeIntensity: number
}) {
  const rendererSettle = input.rendererSettle
  if (!rendererSettle)
    return null

  const rendererHints = input.rendererHints

  if (input.phase !== 'playing' && input.phase !== 'stopping')
    return cloneRendererSettleHints(rendererSettle)

  const tailBonusMs = resolveProsodyTailSettleBonusMs(input.dynamics)
    + resolveArticulationTailSettleBonusMs({
      articulation: input.articulation,
      visemeIntensity: input.visemeIntensity,
    })
    + (
      input.facialCue === 'eyes-soften'
      || input.facialCue === 'soft-gaze'
        ? 60
        : input.facialCue === 'soft-release'
          ? 30
          : 0
    )
    + (
      (
        rendererHints?.residentMode === 'measured-return'
        || rendererHints?.residentMode === 'repair-before-closeness'
      )
      && (
        rendererHints?.preferredBlinkCadence === 'linger'
        || rendererHints?.preferredGazeMode === 'soften'
      )
      && input.dynamics.speechEnergy >= 0.18
      && input.dynamics.cadencePulse <= 0.52
        ? 36
        : 0
    )
    + (
      input.phase === 'stopping'
      && (
        input.stopReason == null
        || input.stopReason === 'ended'
        || input.stopReason === 'synthetic-segment-complete'
      )
      && (
        rendererHints?.residentMode === 'measured-return'
        || rendererHints?.residentMode === 'repair-before-closeness'
      )
      && (
        rendererHints?.preferredBlinkCadence === 'linger'
        || rendererHints?.preferredGazeMode === 'soften'
      )
        ? 28
        : 0
    )
  if (tailBonusMs <= 0)
    return cloneRendererSettleHints(rendererSettle)

  return {
    live2dFacialReleaseMs: resolveProjectedRendererSettleValue(
      rendererSettle.live2dFacialReleaseMs,
      Math.round((rendererSettle.live2dFacialReleaseMs ?? 0) + tailBonusMs),
      'prefer-longer',
    ),
    live2dMotionFollowThroughMs: resolveProjectedRendererSettleValue(
      rendererSettle.live2dMotionFollowThroughMs,
      Math.round((rendererSettle.live2dMotionFollowThroughMs ?? 0) + tailBonusMs),
      'prefer-longer',
    ),
    vrmActionFadeMs: resolveProjectedRendererSettleValue(
      rendererSettle.vrmActionFadeMs,
      Math.round((rendererSettle.vrmActionFadeMs ?? 0) + tailBonusMs),
      'prefer-longer',
    ),
    vrmExpressionBlendMs: resolveProjectedRendererSettleValue(
      rendererSettle.vrmExpressionBlendMs,
      Math.round((rendererSettle.vrmExpressionBlendMs ?? 0) + tailBonusMs),
      'prefer-longer',
    ),
  }
}

export function projectStageEmbodimentSpeechCue(input: {
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
  playbackItem?: StageEmbodimentSpeechPlaybackItem | null
}): AlicizationDialogueSpeechTimelineSegment | null {
  const cue = input.cue ?? null
  const frame = input.digitalLifeFrame ?? null
  const scriptSegment = resolvePlaybackScriptSegment(input.playbackItem ?? null)
  const scriptFaceCue = resolvePlaybackScriptFaceCue(input.playbackItem ?? null)
  const scriptMotionBurst = resolvePlaybackScriptMotionBurst(input.playbackItem ?? null)
  const scriptVisemeHint = resolvePlaybackScriptVisemeHint(input.playbackItem ?? null)
  const scriptResidentMode = resolvePlaybackScriptResidentMode(input.playbackItem ?? null)
  if (!cue && !frame && !scriptSegment && !scriptFaceCue && !scriptMotionBurst && !scriptVisemeHint)
    return null

  const text = cue?.text ?? frame?.text ?? scriptSegment?.text ?? ''
  if (!text)
    return cue ? { ...cue } : null

  const startOffset = frame?.startOffset ?? cue?.startOffset ?? 0
  const endOffset = Math.max(
    startOffset,
    frame?.endOffset
    ?? cue?.endOffset
    ?? (startOffset + Math.max(1, Array.from(text).length)),
  )
  const rendererHints = frame
    ? mergeRendererHints([
        frame.face.rendererHints,
        frame.action.rendererHints,
        cue?.rendererHints,
        scriptSegment?.rendererHints ?? null,
      ])
    : mergeRendererHints([
        cue?.rendererHints,
        scriptSegment?.rendererHints ?? null,
      ])
  const restrainedRendererOnlyRecovery = isRendererOnlyVisibleRecoveryFrame(
    frame,
    scriptResidentMode,
    rendererHints,
  )
  const scriptMouthWeight = scriptVisemeHint?.weight
  const projectedActionCue = frame
    ? frame.action.actionMode === 'none'
      ? null
      : restrainedRendererOnlyRecovery
        ? resolvePlaybackCompanionshipActionCue({
            actionCue: normalizeCueToken(cue?.actionCue) ?? normalizeCueToken(scriptMotionBurst?.actionCue) ?? 'idle_settle',
            residentMode: scriptResidentMode,
            rendererHints,
          })
        : normalizeCueToken(frame.action.actionCue)
    : normalizeCueToken(cue?.actionCue) ?? resolvePlaybackCompanionshipActionCue({
      actionCue: normalizeCueToken(scriptMotionBurst?.actionCue),
      residentMode: scriptResidentMode,
      rendererHints: scriptSegment?.rendererHints ?? cue?.rendererHints ?? null,
    })
  const projectedFacialCue = frame
    ? restrainedRendererOnlyRecovery && (
      scriptResidentMode === 'repair-before-closeness'
      || scriptResidentMode === 'measured-return'
      || rendererHints?.residentMode === 'repair-before-closeness'
      || rendererHints?.residentMode === 'measured-return'
    )
      ? normalizeCueToken(scriptFaceCue?.facialCue) ?? 'soft-gaze'
      : normalizeCueToken(frame.face.facialCue)
    : normalizeCueToken(cue?.facialCue) ?? normalizeCueToken(scriptFaceCue?.facialCue)
  const projectedMouthWeightFromFrame = frame
    ? resolveProjectedCueMouthWeight(frame)
    : null
  const preserveMeasuredReturnMouthPresence = frame
    ? shouldPreserveMeasuredReturnMouthPresence({
        frame,
        rendererHints,
        residentMode: scriptResidentMode,
      })
    : false
  const carriedMouthPresenceFloor = preserveMeasuredReturnMouthPresence && frame
    ? Math.min(0.42, frame.voice.energy * 0.9 + 0.04)
    : null

  return {
    id: frame?.id ?? cue?.id ?? scriptSegment?.id ?? 'stage-embodiment:segment',
    index: frame?.index ?? cue?.index ?? scriptSegment?.index ?? 0,
    startOffset,
    endOffset,
    text,
    emotion: frame?.face.emotion ?? cue?.emotion ?? scriptFaceCue?.emotion,
    gestureWeight: frame
      ? clampUnit(
          restrainedRendererOnlyRecovery
            ? Math.min(frame.action.intensity, 0.18)
            : frame.action.intensity,
          cue?.gestureWeight ?? 0,
        )
      : clampUnit(cue?.gestureWeight ?? scriptMotionBurst?.intensity ?? 0),
    facialWeight: frame
      ? clampUnit(
          restrainedRendererOnlyRecovery
            ? Math.min(frame.face.intensity, 0.36)
            : frame.face.intensity,
          cue?.facialWeight ?? 0,
        )
      : clampUnit(cue?.facialWeight ?? scriptFaceCue?.intensity ?? 0),
    prosodyWeight: frame
      ? clampUnit(
          restrainedRendererOnlyRecovery
            ? Math.min(frame.voice.cadence, cue?.prosodyWeight ?? frame.voice.cadence, 0.28)
            : frame.voice.cadence,
          cue?.prosodyWeight ?? 0,
        )
      : clampUnit(cue?.prosodyWeight ?? scriptMouthWeight ?? 0),
    beatWeight: frame
      ? restrainedRendererOnlyRecovery
        ? clampUnit(Math.min(resolveProjectedCueBeatWeight(frame), cue?.beatWeight ?? resolveProjectedCueBeatWeight(frame), 0.32))
        : resolveProjectedCueBeatWeight(frame)
      : clampUnit(cue?.beatWeight ?? scriptMotionBurst?.intensity ?? scriptMouthWeight ?? 0),
    mouthWeight: frame
      ? restrainedRendererOnlyRecovery
        ? clampUnit(Math.max(
            Math.min(projectedMouthWeightFromFrame ?? 0, cue?.mouthWeight ?? projectedMouthWeightFromFrame ?? 0, 0.42),
            carriedMouthPresenceFloor ?? 0,
          ))
        : preserveMeasuredReturnMouthPresence
          ? clampUnit(Math.max(
              projectedMouthWeightFromFrame ?? 0,
              carriedMouthPresenceFloor ?? 0,
            ))
          : projectedMouthWeightFromFrame ?? undefined
      : cue?.mouthWeight ?? scriptMouthWeight,
    headWeight: frame
      ? clampUnit(
          restrainedRendererOnlyRecovery
            ? Math.min(frame.action.intensity, 0.18)
            : frame.action.intensity,
          cue?.headWeight ?? cue?.gestureWeight ?? 0,
        )
      : cue?.headWeight ?? clampUnit(scriptMotionBurst?.intensity ?? 0),
    facialHoldMs: frame
      ? Math.round(clampRange(frame.face.holdMs, 80, 960))
      : cue?.facialHoldMs ?? scriptFaceCue?.holdMs,
    actionHoldMs: frame
      ? Math.round(clampRange(frame.action.holdMs, 70, 720))
      : cue?.actionHoldMs ?? scriptMotionBurst?.holdMs,
    emotionHoldMs: frame
      ? Math.round(clampRange(
          Math.max(
            frame.face.holdMs,
            frame.lipSync.continuityHoldMs,
            cue?.emotionHoldMs ?? 0,
          ),
          80,
          960,
        ))
      : cue?.emotionHoldMs ?? (Math.max(scriptFaceCue?.holdMs ?? 0, scriptMotionBurst?.holdMs ?? 0) || undefined),
    settleMode: frame?.settleMode ?? cue?.settleMode ?? (
      scriptResidentMode === 'idle-recovering' || scriptResidentMode === 'measured-return'
        ? 'linger'
        : scriptResidentMode === 'repair-before-closeness'
          ? 'hold'
          : undefined
    ),
    rendererSettle: frame
      ? resolveProjectedRendererSettleHints(frame, cue?.rendererSettle)
      : cloneRendererSettleHints(cue?.rendererSettle ?? scriptSegment?.rendererSettle ?? null),
    rendererHints,
    actionCue: projectedActionCue,
    facialCue: projectedFacialCue,
    actionWindow: frame
      ? !projectedActionCue
          ? 'none'
          : cue?.actionWindow === 'cadence-peak' || resolveProjectedCueBeatWeight(frame) >= 0.66
            ? 'cadence-peak'
            : 'segment-start'
      : cue?.actionWindow ?? (projectedActionCue ? 'segment-start' : 'none'),
    interruptMode: frame?.interruptPolicy ?? cue?.interruptMode ?? (projectedActionCue || projectedFacialCue ? 'soft-interrupt' : 'continue'),
  }
}

function normalizeStylePitch(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0

  return clampUnit(Math.abs(Number(value)) / 24)
}

function normalizeStyleRate(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0

  return clampUnit(Math.abs(Number(value) - 1) / 0.45)
}

function resolvePlaybackVoiceStyle(input: {
  item: StageEmbodimentSpeechPlaybackItem | null
  stylePitch?: number | null
  styleRate?: number | null
}) {
  const voice = input.item?.digitalLifeFrame?.voice

  return {
    stylePitch: Number.isFinite(voice?.pitchDelta)
      ? Number(voice?.pitchDelta)
      : input.stylePitch,
    styleRate: Number.isFinite(voice?.rateMultiplier)
      ? Number(voice?.rateMultiplier)
      : input.styleRate,
  }
}

function resolvePlaybackVoiceDynamicsFallback(item: StageEmbodimentSpeechPlaybackItem | null) {
  return {
    cadence: clampUnit(item?.digitalLifeFrame?.voice.cadence ?? 0),
  }
}

function countMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0
}

function resolveTextEmphasis(item: StageEmbodimentSpeechPlaybackItem | null) {
  if (!item)
    return 0

  const text = item.text.trim()
  if (!text)
    return item.special ? 0.12 : 0

  const uppercaseLetters = countMatches(text, /[A-Z]/g)
  const latinLetters = countMatches(text, /[A-Z]/gi)
  const uppercaseRatio = latinLetters > 0 ? uppercaseLetters / latinLetters : 0
  const cueProsody = clampUnit(item.cue?.prosodyWeight ?? 0)
  const cueMouth = clampUnit(item.cue?.mouthWeight ?? 0)

  return clampUnit(
    countMatches(text, /[!！]/g) * 0.24
    + countMatches(text, /[?？]/g) * 0.16
    + countMatches(text, /[~～]/g) * 0.08
    + countMatches(text, /…|\.{3,}/g) * 0.06
    + uppercaseRatio * 0.28
    + cueProsody * 0.22
    + cueMouth * 0.16
    + (item.special ? 0.12 : 0),
  )
}

function resolveCadencePulse(input: {
  emphasisLevel: number
  item: StageEmbodimentSpeechPlaybackItem | null
  mouthOpenSize: number
  now: number
  phase: StageEmbodimentSpeechPlaybackPhase
  speechEnergy: number
  startedAt: number | null | undefined
  styleRate: number | null | undefined
}) {
  if (input.phase !== 'playing')
    return 0

  const elapsedMs = input.startedAt == null ? 0 : Math.max(0, input.now - input.startedAt)
  const attack = clampUnit(elapsedMs / 180)
  const rateBias = Number.isFinite(input.styleRate) ? Math.max(0.7, Number(input.styleRate)) : 1
  const cueBeat = clampUnit(input.item?.cue?.beatWeight ?? 0)
  const cadenceHz = Math.min(4.4, Math.max(1.4, 1.8 * rateBias + input.emphasisLevel * 0.9 + cueBeat * 0.8))
  const cadenceWave = 0.5 + 0.5 * Math.sin((elapsedMs / 1000) * cadenceHz * Math.PI * 2)
  const activity = Math.max(
    attack * 0.22,
    clampUnit(input.mouthOpenSize / 100),
    clampUnit(input.speechEnergy),
  )

  return clampUnit((0.32 + cadenceWave * 0.68) * activity)
}

export function createIdleStageEmbodimentSpeechDynamicsState(): StageEmbodimentSpeechDynamicsState {
  return {
    speechEnergy: 0,
    prosodyIntensity: 0,
    emphasisLevel: 0,
    cadencePulse: 0,
  }
}

export function deriveStageEmbodimentSpeechDynamicsState(input: {
  phase: StageEmbodimentSpeechPlaybackPhase
  item: StageEmbodimentSpeechPlaybackItem | null
  mouthOpenSize: number
  now: number
  speechEnergy?: number | null
  startedAt?: number | null
  stylePitch?: number | null
  styleRate?: number | null
}): StageEmbodimentSpeechDynamicsState {
  if (input.phase !== 'playing')
    return createIdleStageEmbodimentSpeechDynamicsState()

  const speechEnergy = clampUnit(input.speechEnergy ?? 0)
  const planProsody = resolvePlaybackSegmentProsodyIntent(input.item)
  const hasPlanProsody = Boolean(planProsody)
  const residentMode = resolvePlaybackScriptResidentMode(input.item)
  const companionshipProfile = resolvePlaybackCompanionshipProfile({
    residentMode,
    rendererHints: input.item?.cue?.rendererHints,
  })
  const residentModeFallback = !hasPlanProsody
    ? resolvePlaybackResidentModeProsodyFallback(companionshipProfile)
    : resolvePlaybackResidentModeProsodyFallback(null)
  const prosodyStrength = clampUnit(planProsody?.emphasisStrength ?? 0)
  const tempoShift = clampRange(planProsody?.tempoShift ?? residentModeFallback.tempoShift, -1, 1)
  const contourBoost = planProsody?.contour === 'rising'
    ? 0.16
    : planProsody?.contour === 'dip-rise'
      ? 0.1
      : planProsody?.contour === 'falling'
        ? 0.04
        : 0
  const pauseBias = planProsody?.pauseClass === 'question'
    ? 0.04
    : planProsody?.pauseClass === 'comma'
      ? -0.03
      : planProsody?.pauseClass === 'full-stop'
        ? 0.01
        : 0
  const boundaryBias = planProsody?.phraseBoundary === 'hard'
    ? 0.08
    : planProsody?.phraseBoundary === 'soft'
      ? -0.04
      : 0
  const emphasisLevel = clampUnit(
    resolveTextEmphasis(input.item)
    + prosodyStrength * 0.34
    + contourBoost * 0.52,
  )
  const restrainedEmphasisLevel = clampUnit(
    emphasisLevel + residentModeFallback.emphasisOffset,
  )
  const mouthPresence = clampUnit(input.mouthOpenSize / 100)
  const cueProsody = clampUnit(input.item?.cue?.prosodyWeight ?? 0)
  const cueMouth = clampUnit(input.item?.cue?.mouthWeight ?? 0)
  const cueHead = clampUnit(input.item?.cue?.headWeight ?? 0)
  const playbackVoiceStyle = resolvePlaybackVoiceStyle({
    item: input.item,
    stylePitch: input.stylePitch,
    styleRate: input.styleRate,
  })
  const playbackVoiceDynamics = resolvePlaybackVoiceDynamicsFallback(input.item)
  const styleIntensity = clampUnit(
    normalizeStylePitch(playbackVoiceStyle.stylePitch) * 0.45
    + normalizeStyleRate(playbackVoiceStyle.styleRate) * 0.55,
  )

  return {
    speechEnergy,
    emphasisLevel: restrainedEmphasisLevel,
    prosodyIntensity: clampUnit(
      restrainedEmphasisLevel * (hasPlanProsody ? 0.42 : 0.42)
      + cueProsody * (hasPlanProsody ? 0.2 : 0.24)
      + cueMouth * 0.12
      + styleIntensity * (hasPlanProsody ? 0.24 : 0.28)
      + mouthPresence * 0.14
      + speechEnergy * (hasPlanProsody ? 0.22 : 0.24)
      + prosodyStrength * 0.28
      + contourBoost * 1.08
      + Math.max(0, tempoShift) * 0.08
      + residentModeFallback.prosodyOffset,
      0,
    ),
    cadencePulse: clampUnit(
      resolveCadencePulse({
        emphasisLevel: clampUnit(
          restrainedEmphasisLevel
          + cueHead * 0.08
          + prosodyStrength * 0.14
          + contourBoost * 0.1
          + boundaryBias,
        ),
        item: input.item,
        mouthOpenSize: input.mouthOpenSize,
        now: input.now,
        phase: input.phase,
        speechEnergy,
        startedAt: input.startedAt,
        styleRate: Number.isFinite(playbackVoiceStyle.styleRate)
          ? Number(playbackVoiceStyle.styleRate) + tempoShift * 0.22
          : 1 + tempoShift * 0.22,
      })
      + prosodyStrength * 0.06
      + contourBoost * 0.28
      + boundaryBias * 0.2
      + tempoShift * 0.18
      + playbackVoiceDynamics.cadence * 0.16
      + pauseBias,
    ),
  }
}

export function createIdleStageEmbodimentSpeechPlaybackState(): StageEmbodimentSpeechPlaybackState {
  return {
    phase: 'idle',
    item: null,
    currentAudioSource: null,
    mouthOpenSize: 0,
    dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
    startedAt: null,
    endedAt: null,
    stopReason: null,
  }
}

export function normalizeStageEmbodimentSpeechContinuityHoldMs(value: number | null | undefined) {
  return Math.round(clampRange(Number(value ?? 0), 0, 600))
}

export function resolveStageEmbodimentSpeechStopLingerMs(input: {
  item: StageEmbodimentSpeechPlaybackItem | null
  stopReason?: string | null
}) {
  const item = input.item
  if (!item)
    return 0

  if (input.stopReason && input.stopReason !== 'synthetic-segment-complete')
    return 0

  if (!item.text.trim() && item.special)
    return 0

  return normalizeStageEmbodimentSpeechContinuityHoldMs(item.continuityHoldMs)
}

function resolveSpeechRenderPhase(
  state: StageEmbodimentSpeechPlaybackState,
  lastEventType: StageEmbodimentSpeechPlaybackEvent['type'] | null,
): StageEmbodimentSpeechRenderPhase {
  if (state.phase === 'playing') {
    if (lastEventType === 'playback-start' || lastEventType === 'audio-source-bound')
      return 'starting'
    return 'playing'
  }

  if (lastEventType === 'playback-stop' && state.endedAt != null)
    return 'stopping'

  return 'idle'
}

export function createIdleStageEmbodimentSpeechRenderState(): StageEmbodimentSpeechRenderState {
  return {
    phase: 'idle',
    playbackPhase: 'idle',
    lastEventType: null,
    revision: 0,
    active: false,
    item: null,
    currentAudioSource: null,
    audioBound: false,
    mouthOpenSize: 0,
    mouthOpenRatio: 0,
    visemeIntensity: 0,
    articulation: createIdleStageEmbodimentSpeechArticulationState(),
    dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
    startedAt: null,
    endedAt: null,
    stopReason: null,
  }
}

export function deriveStageEmbodimentSpeechRenderState(input: {
  state: StageEmbodimentSpeechPlaybackState
  articulation?: StageEmbodimentSpeechArticulationState | null
  lastEventType?: StageEmbodimentSpeechPlaybackEvent['type'] | null
  revision?: number
}): StageEmbodimentSpeechRenderState {
  const mouthOpenRatio = clampUnit(input.state.mouthOpenSize / 100)
  const speechEnergy = clampUnit(input.state.dynamics.speechEnergy)
  const prosodyIntensity = clampUnit(input.state.dynamics.prosodyIntensity)
  const articulation = cloneStageEmbodimentSpeechArticulationState(input.articulation)
  const articulationIntensity = clampUnit(Math.max(
    articulation.openness,
    articulation.jawOpen,
    articulation.visemes.A,
    articulation.visemes.E,
    articulation.visemes.I,
    articulation.visemes.O,
    articulation.visemes.U,
  ))
  const closureIntensity = clampUnit(Math.max(
    articulation.lipClosure * 0.64,
    articulation.visemes.closed * 0.68,
  ))
  const visemeIntensity = clampUnit(Math.max(
    articulationIntensity * 0.92,
    closureIntensity,
    mouthOpenRatio * 0.76,
    speechEnergy * 0.92,
    prosodyIntensity * 0.44,
  ))
  const phase = resolveSpeechRenderPhase(input.state, input.lastEventType ?? null)
  const projectedCue = input.state.item?.cue
    ? {
        ...input.state.item.cue,
        rendererSettle: resolveRenderStateRendererSettleHints({
          articulation,
          dynamics: input.state.dynamics,
          facialCue: input.state.item.cue.facialCue,
          phase,
          rendererHints: input.state.item.cue.rendererHints,
          rendererSettle: input.state.item.cue.rendererSettle,
          stopReason: input.state.stopReason,
          visemeIntensity,
        }),
      }
    : null

  return {
    phase,
    playbackPhase: input.state.phase,
    lastEventType: input.lastEventType ?? null,
    revision: Math.max(0, Math.floor(input.revision ?? 0)),
    active: phase !== 'idle' || visemeIntensity > 0.015,
    item: input.state.item
      ? {
          ...input.state.item,
          cue: projectedCue,
        }
      : null,
    currentAudioSource: input.state.currentAudioSource,
    audioBound: input.state.currentAudioSource != null,
    mouthOpenSize: Math.max(0, Math.min(100, input.state.mouthOpenSize)),
    mouthOpenRatio,
    visemeIntensity,
    articulation,
    dynamics: {
      speechEnergy,
      prosodyIntensity,
      emphasisLevel: clampUnit(input.state.dynamics.emphasisLevel),
      cadencePulse: clampUnit(input.state.dynamics.cadencePulse),
    },
    startedAt: input.state.startedAt,
    endedAt: input.state.endedAt,
    stopReason: input.state.stopReason,
  }
}

export function createStageEmbodimentSpeechPlaybackItem(input: {
  intentId: string | null | undefined
  streamId: string | null | undefined
  segmentId: string | null | undefined
  ownerId?: string | null
  text: string
  special: string | null | undefined
  continuityHoldMs?: number | null
  playbackDurationMs?: number | null
  metadata?: Record<string, unknown> | null
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
}): StageEmbodimentSpeechPlaybackItem {
  const digitalLifeFrame = input.digitalLifeFrame ?? null
  const authoritySegmentId = normalizeCueToken(digitalLifeFrame?.id)
    ?? normalizeCueToken(input.segmentId)
    ?? null

  return {
    intentId: input.intentId ?? null,
    streamId: input.streamId ?? null,
    segmentId: authoritySegmentId,
    ownerId: input.ownerId ?? null,
    text: input.text,
    special: input.special ?? null,
    continuityHoldMs: normalizeStageEmbodimentSpeechContinuityHoldMs(input.continuityHoldMs),
    playbackDurationMs: normalizeStageEmbodimentSpeechPlaybackDurationMs(input.playbackDurationMs),
    metadata: input.metadata ? { ...input.metadata } : null,
    cue: projectStageEmbodimentSpeechCue({
      cue: input.cue,
      digitalLifeFrame,
      playbackItem: {
        intentId: input.intentId ?? null,
        streamId: input.streamId ?? null,
        segmentId: authoritySegmentId,
        ownerId: input.ownerId ?? null,
        text: input.text,
        special: input.special ?? null,
        continuityHoldMs: normalizeStageEmbodimentSpeechContinuityHoldMs(input.continuityHoldMs),
        playbackDurationMs: normalizeStageEmbodimentSpeechPlaybackDurationMs(input.playbackDurationMs),
        metadata: input.metadata ? { ...input.metadata } : null,
        cue: input.cue ?? null,
        digitalLifeFrame,
      },
    }),
    digitalLifeFrame,
  }
}
