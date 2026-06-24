import type { StageEmbodimentSpeechRenderPhase } from '@proj-alicization/stage-shared'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationBodyVoiceOnlySameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationStillVoicedMouthSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
} from '@proj-alicization/stage-shared'

export interface VrmLipSyncContinuityState {
  continuityKey: string | null
  envelope: number
  holdSeconds: number
  segmentId: string | null
}

export interface VrmLipSyncContinuityInput {
  continuityHoldMs?: number | null | undefined
  deltaSeconds: number
  fallbackSignal: number
  preferredBlinkCadence?: string | null | undefined
  preferredGazeMode?: string | null | undefined
  reasonTags?: readonly string[] | null | undefined
  residentMode?: string | null | undefined
  segmentId?: string | null | undefined
  signature?: string | null | undefined
  speechActive: boolean
  speechPhase: StageEmbodimentSpeechRenderPhase | null | undefined
  wlipsyncSignal: number
}

export interface VrmLipSyncContinuityConfig {
  activationThreshold: number
  envelopeAttack: number
  envelopeRelease: number
  holdSeconds: number
  minimumFloor: number
}

export interface VrmLipSyncContinuityResult {
  active: boolean
  drive: number
  envelope: number
  holdSeconds: number
}

const defaultContinuityConfig: VrmLipSyncContinuityConfig = {
  activationThreshold: 0.03,
  envelopeAttack: 16,
  envelopeRelease: 6,
  holdSeconds: 0.16,
  minimumFloor: 0.03,
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

function phaseSignal(phase: StageEmbodimentSpeechRenderPhase | null | undefined) {
  if (phase === 'starting')
    return 0.14
  if (phase === 'playing')
    return 0.08
  if (phase === 'stopping')
    return 0.06
  return 0
}

export function createVrmLipSyncContinuityState(): VrmLipSyncContinuityState {
  return {
    continuityKey: null,
    envelope: 0,
    holdSeconds: 0,
    segmentId: null,
  }
}

export function resolveVrmLipSyncContinuity(
  state: VrmLipSyncContinuityState,
  input: VrmLipSyncContinuityInput,
  config: Partial<VrmLipSyncContinuityConfig> = {},
): VrmLipSyncContinuityResult {
  const resolvedConfig: VrmLipSyncContinuityConfig = {
    ...defaultContinuityConfig,
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
      ? 1.34 * stillVoicedMouthCarryHoldScale
      : hasSofterReturnCadence
        ? 1.28
        : 1.22
    : residentMode === 'measured-return'
      ? hasStructuredSameHerCarry ? 1.18 * stillVoicedMouthCarryHoldScale : hasSofterReturnCadence ? 1.13 : 1.1
      : residentMode === 'same-thread-continuation'
        ? hasStructuredSameHerCarry ? 1.18 * stillVoicedMouthCarryHoldScale : hasSofterReturnCadence ? 1.08 : 1
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
      ? hasStructuredSameHerCarry ? 0.86 : hasSofterReturnCadence ? 0.9 : 0.92
      : residentMode === 'same-thread-continuation'
        ? hasStructuredSameHerCarry ? 0.9 : hasSofterReturnCadence ? 0.96 : 1
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
    input.wlipsyncSignal,
    input.fallbackSignal,
    phaseSignal(input.speechPhase),
  ))
  const nonPhaseSignal = clamp01(Math.max(
    input.wlipsyncSignal,
    input.fallbackSignal,
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
