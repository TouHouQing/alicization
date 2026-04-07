import type { StageEmbodimentSpeechRenderPhase } from '@proj-alicization/stage-shared'

export interface VrmLipSyncContinuityState {
  envelope: number
  holdSeconds: number
}

export interface VrmLipSyncContinuityInput {
  deltaSeconds: number
  fallbackSignal: number
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
    envelope: 0,
    holdSeconds: 0,
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
  const directSignal = clamp01(Math.max(
    input.wlipsyncSignal,
    input.fallbackSignal,
    phaseSignal(input.speechPhase),
  ))
  const triggered = input.speechActive || directSignal >= resolvedConfig.activationThreshold

  if (triggered) {
    state.holdSeconds = resolvedConfig.holdSeconds
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
      : resolvedConfig.envelopeRelease
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
