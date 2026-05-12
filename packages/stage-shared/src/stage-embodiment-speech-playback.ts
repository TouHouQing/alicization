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

function normalizeEmbodimentScriptFromPlaybackMetadata(
  metadata: Record<string, unknown> | null | undefined,
): AlicizationEmbodimentScriptV1 | null {
  if (!metadata)
    return null

  return normalizeAlicizationEmbodimentScript(metadata.embodimentScript)
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
    segment => normalizePlaybackText(segment.text) === normalizedText,
  )
  if (textMatches.length !== 1)
    return null

  return textMatches[0]?.prosody ?? null
}

function cloneRendererHints(
  hints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
): AlicizationDialogueEmbodimentRendererHints | null {
  if (!hints)
    return null

  return {
    preferredExpressionAliases: hints.preferredExpressionAliases
      ? [...hints.preferredExpressionAliases]
      : undefined,
    preferredMotionAliases: hints.preferredMotionAliases
      ? [...hints.preferredMotionAliases]
      : undefined,
  }
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

function mergeRendererHints(
  hints: Array<AlicizationDialogueEmbodimentRendererHints | null | undefined>,
): AlicizationDialogueEmbodimentRendererHints | null {
  const preferredExpressionAliases = mergeRendererHintAliases(
    hints.map(item => item?.preferredExpressionAliases),
  )
  const preferredMotionAliases = mergeRendererHintAliases(
    hints.map(item => item?.preferredMotionAliases),
  )

  if (preferredExpressionAliases.length === 0 && preferredMotionAliases.length === 0)
    return null

  return {
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
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
      frame.action.actionMode === 'hold'
        ? 'prefer-longer'
        : frame.action.actionMode === 'none'
          ? 'prefer-shorter'
          : 'prefer-derived',
    ),
    vrmActionFadeMs: resolveProjectedRendererSettleValue(
      fallback?.vrmActionFadeMs,
      actionFadeMs,
      frame.action.actionMode === 'hold'
        ? 'prefer-longer'
        : frame.action.actionMode === 'none'
          ? 'prefer-shorter'
          : 'prefer-derived',
    ),
  }
}

export function projectStageEmbodimentSpeechCue(input: {
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
}): AlicizationDialogueSpeechTimelineSegment | null {
  const cue = input.cue ?? null
  const frame = input.digitalLifeFrame ?? null
  if (!cue && !frame)
    return null

  const text = cue?.text ?? frame?.text ?? ''
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
      ])
    : cloneRendererHints(cue?.rendererHints)
  const projectedActionCue = frame
    ? frame.action.actionMode === 'none'
      ? null
      : normalizeCueToken(frame.action.actionCue)
    : normalizeCueToken(cue?.actionCue)
  const projectedFacialCue = frame
    ? normalizeCueToken(frame.face.facialCue)
    : normalizeCueToken(cue?.facialCue)

  return {
    id: frame?.id ?? cue?.id ?? 'stage-embodiment:segment',
    index: frame?.index ?? cue?.index ?? 0,
    startOffset,
    endOffset,
    text,
    emotion: frame?.face.emotion ?? cue?.emotion,
    gestureWeight: frame ? clampUnit(frame.action.intensity, cue?.gestureWeight ?? 0) : clampUnit(cue?.gestureWeight ?? 0),
    facialWeight: frame ? clampUnit(frame.face.intensity, cue?.facialWeight ?? 0) : clampUnit(cue?.facialWeight ?? 0),
    prosodyWeight: frame ? clampUnit(frame.voice.cadence, cue?.prosodyWeight ?? 0) : clampUnit(cue?.prosodyWeight ?? 0),
    beatWeight: frame ? resolveProjectedCueBeatWeight(frame) : clampUnit(cue?.beatWeight ?? 0),
    mouthWeight: frame ? resolveProjectedCueMouthWeight(frame) : cue?.mouthWeight,
    headWeight: frame ? clampUnit(frame.action.intensity, cue?.headWeight ?? cue?.gestureWeight ?? 0) : cue?.headWeight,
    facialHoldMs: frame
      ? Math.round(clampRange(frame.face.holdMs, 80, 960))
      : cue?.facialHoldMs,
    actionHoldMs: frame
      ? Math.round(clampRange(frame.action.holdMs, 70, 720))
      : cue?.actionHoldMs,
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
      : cue?.emotionHoldMs,
    settleMode: frame?.settleMode ?? cue?.settleMode,
    rendererSettle: frame
      ? resolveProjectedRendererSettleHints(frame, cue?.rendererSettle)
      : cloneRendererSettleHints(cue?.rendererSettle),
    rendererHints,
    actionCue: projectedActionCue,
    facialCue: projectedFacialCue,
    actionWindow: frame
      ? !projectedActionCue
        ? 'none'
        : cue?.actionWindow === 'cadence-peak' || resolveProjectedCueBeatWeight(frame) >= 0.66
          ? 'cadence-peak'
          : 'segment-start'
      : cue?.actionWindow ?? 'none',
    interruptMode: frame?.interruptPolicy ?? cue?.interruptMode ?? 'continue',
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
  const prosodyStrength = clampUnit(planProsody?.emphasisStrength ?? 0)
  const tempoShift = clampRange(planProsody?.tempoShift ?? 0, -1, 1)
  const contourBoost = planProsody?.contour === 'rising'
    ? 0.12
    : planProsody?.contour === 'dip-rise'
      ? 0.08
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
    + prosodyStrength * 0.28
    + contourBoost * 0.4,
  )
  const mouthPresence = clampUnit(input.mouthOpenSize / 100)
  const cueProsody = clampUnit(input.item?.cue?.prosodyWeight ?? 0)
  const cueMouth = clampUnit(input.item?.cue?.mouthWeight ?? 0)
  const cueHead = clampUnit(input.item?.cue?.headWeight ?? 0)
  const styleIntensity = clampUnit(
    normalizeStylePitch(input.stylePitch) * 0.45
    + normalizeStyleRate(input.styleRate) * 0.55,
  )

  return {
    speechEnergy,
    emphasisLevel,
    prosodyIntensity: clampUnit(
      emphasisLevel * 0.38
      + cueProsody * 0.2
      + cueMouth * 0.12
      + styleIntensity * 0.24
      + mouthPresence * 0.14
      + speechEnergy * 0.22
      + prosodyStrength * 0.24
      + contourBoost
      + Math.max(0, tempoShift) * 0.08,
    ),
    cadencePulse: clampUnit(
      resolveCadencePulse({
        emphasisLevel: clampUnit(
          emphasisLevel
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
        styleRate: Number.isFinite(input.styleRate)
          ? Number(input.styleRate) + tempoShift * 0.22
          : 1 + tempoShift * 0.22,
      })
      + prosodyStrength * 0.04
      + contourBoost * 0.22
      + boundaryBias * 0.2
      + tempoShift * 0.12
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
  const visemeIntensity = clampUnit(Math.max(
    articulationIntensity * 0.92,
    mouthOpenRatio * 0.76,
    speechEnergy * 0.92,
    prosodyIntensity * 0.44,
  ))
  const phase = resolveSpeechRenderPhase(input.state, input.lastEventType ?? null)

  return {
    phase,
    playbackPhase: input.state.phase,
    lastEventType: input.lastEventType ?? null,
    revision: Math.max(0, Math.floor(input.revision ?? 0)),
    active: phase !== 'idle' || visemeIntensity > 0.015,
    item: input.state.item ? { ...input.state.item } : null,
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

  return {
    intentId: input.intentId ?? null,
    streamId: input.streamId ?? null,
    segmentId: input.segmentId ?? null,
    ownerId: input.ownerId ?? null,
    text: input.text,
    special: input.special ?? null,
    continuityHoldMs: normalizeStageEmbodimentSpeechContinuityHoldMs(input.continuityHoldMs),
    playbackDurationMs: normalizeStageEmbodimentSpeechPlaybackDurationMs(input.playbackDurationMs),
    metadata: input.metadata ? { ...input.metadata } : null,
    cue: projectStageEmbodimentSpeechCue({
      cue: input.cue,
      digitalLifeFrame,
    }),
    digitalLifeFrame,
  }
}
