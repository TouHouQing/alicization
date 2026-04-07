import type { AlicizationDialogueSpeechTimelineSegment } from './alicization-dialogue-speech-timeline'
import type { AlicizationDigitalLifeFrame } from './alicization-digital-life'

export type StageEmbodimentSpeechPlaybackPhase = 'idle' | 'playing'

export interface StageEmbodimentSpeechPlaybackItem {
  intentId: string | null
  streamId: string | null
  segmentId: string | null
  ownerId: string | null
  text: string
  special: string | null
  continuityHoldMs: number
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
  const emphasisLevel = resolveTextEmphasis(input.item)
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
      emphasisLevel * 0.42
      + cueProsody * 0.24
      + cueMouth * 0.12
      + styleIntensity * 0.28
      + mouthPresence * 0.14
      + speechEnergy * 0.24,
    ),
    cadencePulse: resolveCadencePulse({
      emphasisLevel: clampUnit(emphasisLevel + cueHead * 0.08),
      item: input.item,
      mouthOpenSize: input.mouthOpenSize,
      now: input.now,
      phase: input.phase,
      speechEnergy,
      startedAt: input.startedAt,
      styleRate: input.styleRate,
    }),
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
    dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
    startedAt: null,
    endedAt: null,
    stopReason: null,
  }
}

export function deriveStageEmbodimentSpeechRenderState(input: {
  state: StageEmbodimentSpeechPlaybackState
  lastEventType?: StageEmbodimentSpeechPlaybackEvent['type'] | null
  revision?: number
}): StageEmbodimentSpeechRenderState {
  const mouthOpenRatio = clampUnit(input.state.mouthOpenSize / 100)
  const speechEnergy = clampUnit(input.state.dynamics.speechEnergy)
  const prosodyIntensity = clampUnit(input.state.dynamics.prosodyIntensity)
  const visemeIntensity = clampUnit(Math.max(
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
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
}): StageEmbodimentSpeechPlaybackItem {
  return {
    intentId: input.intentId ?? null,
    streamId: input.streamId ?? null,
    segmentId: input.segmentId ?? null,
    ownerId: input.ownerId ?? null,
    text: input.text,
    special: input.special ?? null,
    continuityHoldMs: normalizeStageEmbodimentSpeechContinuityHoldMs(input.continuityHoldMs),
    cue: input.cue ?? null,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
  }
}
