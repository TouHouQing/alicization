import type { StageEmbodimentPresencePostureState, StageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import type { ComputedRef, Ref } from 'vue'

import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'
import type { StageEmbodimentAttentionPresenceState } from './use-stage-embodiment-attention'

import {
  createIdleStageEmbodimentPresencePostureState,
} from '@proj-alicization/stage-shared'
import { computed, readonly } from 'vue'

interface Point2D {
  x: number
  y: number
}

interface Size2D {
  width: number
  height: number
}

export interface UseStageEmbodimentPostureOptions {
  activePresence: Readonly<Ref<StageEmbodimentAttentionPresenceState | null>>
  focusAt: Readonly<Ref<Point2D>>
  speechRenderState: Readonly<Ref<StageEmbodimentSpeechRenderState | null | undefined>>
  stageBounds: Readonly<Ref<Size2D>>
  targetPoint: Readonly<Ref<Point2D>>
  visualPresenceState?: Readonly<Ref<AlicizationVisualPresenceStateSnapshot | null | undefined>>
}

function clampUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function clampSignedUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(-1, value))
}

export function deriveStageEmbodimentPresencePostureState(input: {
  activePresence: StageEmbodimentAttentionPresenceState | null
  basePoint: Point2D
  speechRenderState: StageEmbodimentSpeechRenderState | null | undefined
  stageBounds: Size2D
  targetPoint: Point2D
  visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null | undefined
}): StageEmbodimentPresencePostureState {
  const stageWidth = Math.max(1, input.stageBounds.width)
  const stageHeight = Math.max(1, input.stageBounds.height)
  const offsetX = clampSignedUnit((input.targetPoint.x - input.basePoint.x) / (stageWidth * 0.2))
  const offsetY = clampSignedUnit((input.basePoint.y - input.targetPoint.y) / (stageHeight * 0.22))
  const presence = input.activePresence
  const speechRenderState = input.speechRenderState
  const speechEnergy = clampUnit(speechRenderState?.dynamics.speechEnergy ?? 0)
  const prosodyIntensity = clampUnit(speechRenderState?.dynamics.prosodyIntensity ?? 0)
  const emphasisLevel = clampUnit(speechRenderState?.dynamics.emphasisLevel ?? 0)
  const cadencePulse = clampUnit(speechRenderState?.dynamics.cadencePulse ?? 0)
  const watchMode = input.visualPresenceState?.watchMode
  const thought = input.visualPresenceState?.privateThought
  const baseConfidence = clampUnit(
    (presence?.confidence ?? 0) * 0.62
    + (thought?.confidence ?? 0) * 0.18
    + (watchMode === 'invited-inspection'
      ? 0.18
      : watchMode === 'recovering'
        ? 0.14
        : watchMode === 'symbiotic-vision'
          ? 0.1
          : 0)
        + (speechRenderState?.active === true ? 0.08 : 0),
  )

  const mode = (() => {
    if (presence?.embodiedPresence === 'concerned' || watchMode === 'recovering')
      return 'concerned'
    if (watchMode === 'invited-inspection')
      return 'inspection'
    if (presence?.embodiedPresence === 'hesitant')
      return 'hesitant'
    if (presence?.embodiedPresence === 'attentive' || watchMode === 'symbiotic-vision' || speechRenderState?.active === true)
      return 'attentive'
    return 'idle'
  })()

  const engaged = mode !== 'idle' || baseConfidence > 0.18
  if (!engaged)
    return createIdleStageEmbodimentPresencePostureState()

  const bodyYaw = clampSignedUnit(
    offsetX * (0.3 + baseConfidence * 0.42)
    + (cadencePulse * 2 - 1) * speechEnergy * 0.08,
  )
  const bodyPitchBase = mode === 'inspection'
    ? 0.5
    : mode === 'concerned'
      ? 0.42
      : mode === 'hesitant'
        ? 0.22
        : 0.28

  const bodyPitch = clampUnit(
    bodyPitchBase
    + Math.max(0, offsetY) * 0.18
    + speechEnergy * 0.08
    + prosodyIntensity * 0.05
    + (watchMode === 'invited-inspection' ? 0.08 : 0),
  )

  const breathBoost = clampUnit(
    speechEnergy * 0.46
    + prosodyIntensity * 0.2
    + emphasisLevel * 0.12
    + baseConfidence * 0.18
    + (mode === 'concerned' ? 0.08 : 0),
  )

  const gazeStability = clampUnit(
    (mode === 'inspection'
      ? 0.9
      : mode === 'concerned'
        ? 0.82
        : mode === 'attentive'
          ? 0.72
          : 0.62)
        + baseConfidence * 0.12
        + (input.visualPresenceState?.captureState.permission === 'granted' ? 0.04 : 0),
  )

  return {
    engaged: true,
    mode,
    confidence: baseConfidence,
    bodyYaw,
    bodyPitch,
    breathBoost,
    gazeStability,
  }
}

export function useStageEmbodimentPosture(options: UseStageEmbodimentPostureOptions) {
  const presencePosture = computed(() => {
    return deriveStageEmbodimentPresencePostureState({
      activePresence: options.activePresence.value,
      basePoint: options.focusAt.value,
      speechRenderState: options.speechRenderState.value,
      stageBounds: options.stageBounds.value,
      targetPoint: options.targetPoint.value,
      visualPresenceState: options.visualPresenceState?.value,
    })
  })

  return {
    presencePosture: readonly(presencePosture) as Readonly<ComputedRef<StageEmbodimentPresencePostureState>>,
  }
}
