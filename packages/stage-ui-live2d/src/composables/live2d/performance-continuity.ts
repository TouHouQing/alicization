import type { StageEmbodimentSpeechRenderPhase } from '@proj-alicization/stage-shared'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationBodyVoiceOnlySameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationStillVoicedMouthSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
} from '@proj-alicization/stage-shared'

export interface Live2DSpeechContinuityState {
  continuityKey: string | null
  envelope: number
  holdSeconds: number
  segmentId: string | null
}

export interface Live2DSpeechContinuityInput {
  continuityHoldMs?: number | null | undefined
  deltaSeconds: number
  preferredBlinkCadence?: string | null | undefined
  preferredGazeMode?: string | null | undefined
  reasonTags?: readonly string[] | null | undefined
  residentMode?: string | null | undefined
  segmentId?: string | null | undefined
  signature?: string | null | undefined
  speechActive: boolean
  speechEnergy: number
  speechPhase: StageEmbodimentSpeechRenderPhase | null | undefined
  visemeIntensity: number
}

export interface Live2DSpeechContinuityConfig {
  activationThreshold: number
  envelopeAttack: number
  envelopeRelease: number
  holdSeconds: number
  minimumFloor: number
}

export interface Live2DSpeechContinuityResult {
  active: boolean
  drive: number
  envelope: number
  holdSeconds: number
}

const defaultSpeechContinuityConfig: Live2DSpeechContinuityConfig = {
  activationThreshold: 0.03,
  envelopeAttack: 18,
  envelopeRelease: 7,
  holdSeconds: 0.14,
  minimumFloor: 0.04,
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0

  return Math.min(1, Math.max(0, value))
}

function normalizeDeltaSeconds(value: number) {
  if (!Number.isFinite(value))
    return 0

  return Math.min(0.25, Math.max(0, value))
}

function normalizePhaseSignal(phase: StageEmbodimentSpeechRenderPhase | null | undefined) {
  if (phase === 'starting')
    return 0.18
  if (phase === 'playing')
    return 0.08
  if (phase === 'stopping')
    return 0.06
  return 0
}

function normalizeResidentMode(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeHintToken(value: unknown) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/-/g, '_')
    : ''
}

function resolveContinuityKey(input: {
  continuityHoldMs?: number | null | undefined
  preferredBlinkCadence?: string | null | undefined
  preferredGazeMode?: string | null | undefined
  reasonTags?: readonly string[] | null | undefined
  residentMode?: string | null | undefined
  signature?: string | null | undefined
}) {
  return JSON.stringify([
    normalizeResidentMode(input.residentMode),
    normalizeHintToken(input.preferredBlinkCadence),
    normalizeHintToken(input.preferredGazeMode),
    typeof input.signature === 'string' ? input.signature.trim() : '',
    (input.reasonTags ?? [])
      .map(tag => normalizeHintToken(tag))
      .filter(Boolean)
      .sort()
      .join('|'),
    Math.max(0, Math.round(Number(input.continuityHoldMs ?? 0))),
  ])
}

export function createLive2DSpeechContinuityState(): Live2DSpeechContinuityState {
  return {
    continuityKey: null,
    envelope: 0,
    holdSeconds: 0,
    segmentId: null,
  }
}

export function resolveLive2DSpeechContinuity(
  state: Live2DSpeechContinuityState,
  input: Live2DSpeechContinuityInput,
  config: Partial<Live2DSpeechContinuityConfig> = {},
): Live2DSpeechContinuityResult {
  const resolvedConfig: Live2DSpeechContinuityConfig = {
    ...defaultSpeechContinuityConfig,
    ...config,
  }
  const dt = normalizeDeltaSeconds(input.deltaSeconds)
  const residentMode = normalizeResidentMode(input.residentMode)
  const preferredBlinkCadence = normalizeHintToken(input.preferredBlinkCadence)
  const preferredGazeMode = normalizeHintToken(input.preferredGazeMode)
  const nextContinuityKey = resolveContinuityKey({
    continuityHoldMs: input.continuityHoldMs,
    preferredBlinkCadence: input.preferredBlinkCadence,
    preferredGazeMode: input.preferredGazeMode,
    reasonTags: input.reasonTags,
    residentMode: input.residentMode,
    signature: input.signature,
  })
  const hasAudibleSameHerCarry = hasAlicizationAudibleSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const hasBodyVoiceOnlySameHerCarry = hasAlicizationBodyVoiceOnlySameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const hasQuieterSameHerCarry = hasAlicizationQuieterSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const hasStillVoicedSameHerCarry = hasAlicizationStillVoicedSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const hasStillVoicedMouthSameHerCarry = hasAlicizationStillVoicedMouthSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const hasStructuredSameHerCarry = hasAudibleSameHerCarry
    || hasBodyVoiceOnlySameHerCarry
    || hasQuieterSameHerCarry
    || hasStillVoicedSameHerCarry
  const hasSofterReturnCadence = preferredBlinkCadence === 'linger'
    || preferredBlinkCadence === 'quiet'
    || preferredGazeMode === 'soften'
    || preferredGazeMode === 'steady'
  const holdCompensationScale = resolvedConfig.holdSeconds > 0
    ? 0.16 / resolvedConfig.holdSeconds
    : 1
  const previousSegmentId = state.segmentId
  const previousContinuityKey = state.continuityKey
  const nextSegmentId = typeof input.segmentId === 'string'
    ? input.segmentId.trim() || null
    : null
  if (previousSegmentId && nextSegmentId && previousSegmentId !== nextSegmentId) {
    state.envelope = 0
    state.holdSeconds = 0
  }
  state.segmentId = nextSegmentId
  state.continuityKey = nextContinuityKey
  const stillVoicedMouthCarryHoldScale = hasStillVoicedMouthSameHerCarry ? 1.06 : 1
  const holdSecondsBias = residentMode === 'repair-before-closeness'
    ? hasStructuredSameHerCarry
      ? 1.34 * holdCompensationScale * stillVoicedMouthCarryHoldScale
      : hasSofterReturnCadence
        ? 1.28 * holdCompensationScale
        : 1.22 * holdCompensationScale
    : residentMode === 'measured-return'
      ? hasStructuredSameHerCarry
        ? 1.18 * holdCompensationScale * stillVoicedMouthCarryHoldScale
        : hasSofterReturnCadence
          ? 1.13 * holdCompensationScale
          : 1.1 * holdCompensationScale
      : residentMode === 'same-thread-continuation'
        ? hasStructuredSameHerCarry
          ? 1.18 * holdCompensationScale * stillVoicedMouthCarryHoldScale
          : hasSofterReturnCadence
            ? 1.08 * holdCompensationScale
            : holdCompensationScale
        : 1
  const continuityHoldSeconds = Number.isFinite(Number(input.continuityHoldMs))
    ? Math.max(0, Number(input.continuityHoldMs) / 1000)
    : 0
  const sameSegmentContinuityChanged = previousSegmentId != null
    && nextSegmentId != null
    && previousSegmentId === nextSegmentId
    && previousContinuityKey != null
    && previousContinuityKey !== nextContinuityKey
  const releaseBias = residentMode === 'repair-before-closeness'
    ? hasStructuredSameHerCarry
      ? 0.72
      : hasSofterReturnCadence
        ? 0.76
        : 0.82
    : residentMode === 'measured-return'
      ? hasStructuredSameHerCarry
        ? 0.86
        : hasSofterReturnCadence
          ? 0.9
          : 0.92
      : residentMode === 'same-thread-continuation'
        ? hasStructuredSameHerCarry
          ? 0.9
          : hasSofterReturnCadence
            ? 0.96
            : 1
        : 1
  const softenedReleaseBias = hasStillVoicedMouthSameHerCarry
    ? Math.max(0.72, releaseBias * 0.94)
    : releaseBias
  if (sameSegmentContinuityChanged && (state.holdSeconds > 0 || state.envelope >= resolvedConfig.activationThreshold)) {
    state.holdSeconds = Math.max(
      state.holdSeconds,
      resolvedConfig.holdSeconds * holdSecondsBias,
      continuityHoldSeconds,
    )
  }
  const directSignal = clamp01(Math.max(
    input.speechEnergy,
    input.visemeIntensity,
    normalizePhaseSignal(input.speechPhase),
  ))
  const nonPhaseSignal = clamp01(Math.max(
    input.speechEnergy,
    input.visemeIntensity,
  ))
  const triggered = input.speechActive || nonPhaseSignal >= resolvedConfig.activationThreshold

  if (triggered) {
    state.holdSeconds = Math.max(
      resolvedConfig.holdSeconds * holdSecondsBias,
      continuityHoldSeconds,
    )
  }
  else {
    state.holdSeconds = Math.max(0, state.holdSeconds - dt)
  }

  const holdActive = state.holdSeconds > 0
  const targetEnvelope = triggered || holdActive
    ? Math.max(directSignal, resolvedConfig.minimumFloor)
    : 0
  const smoothingRate = 1 - Math.exp(-(
    targetEnvelope > state.envelope
      ? resolvedConfig.envelopeAttack
      : resolvedConfig.envelopeRelease * softenedReleaseBias
  ) * dt)
  state.envelope = clamp01(state.envelope + (targetEnvelope - state.envelope) * smoothingRate)

  const drive = clamp01(Math.max(directSignal, state.envelope))
  return {
    active: triggered || holdActive || drive >= resolvedConfig.activationThreshold,
    drive,
    envelope: state.envelope,
    holdSeconds: state.holdSeconds,
  }
}
