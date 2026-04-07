import type { StageEmbodimentSpeechRenderPhase } from '@proj-alicization/stage-shared'

export interface Live2DSpeechContinuityState {
  envelope: number
  holdSeconds: number
}

export interface Live2DSpeechContinuityInput {
  deltaSeconds: number
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

export function createLive2DSpeechContinuityState(): Live2DSpeechContinuityState {
  return {
    envelope: 0,
    holdSeconds: 0,
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
  const directSignal = clamp01(Math.max(
    input.speechEnergy,
    input.visemeIntensity,
    normalizePhaseSignal(input.speechPhase),
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
