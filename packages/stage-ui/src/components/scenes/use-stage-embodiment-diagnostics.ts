import type { StageEmbodimentPresencePostureState, StageEmbodimentSpeechRenderPhase, StageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import type { ComputedRef, Ref } from 'vue'

import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'
import type { StageEmbodimentAttentionPresenceState } from './use-stage-embodiment-attention'

import { computed, readonly } from 'vue'

import {
  resolveStageEmbodimentRuntimeAttentionBias,
  resolveStageEmbodimentRuntimePresence,
} from './use-stage-embodiment-attention'

interface Point2D {
  x: number
  y: number
}

interface Size2D {
  width: number
  height: number
}

export interface StageEmbodimentDiagnosticsSnapshot {
  visualPresence: {
    watchMode: AlicizationVisualPresenceStateSnapshot['watchMode'] | null
    scenario: string | null
    thoughtStance: NonNullable<AlicizationVisualPresenceStateSnapshot['privateThought']>['stance'] | null
    embodiedPresence: NonNullable<AlicizationVisualPresenceStateSnapshot['privateThought']>['embodiedPresence'] | null
    capturePermission: AlicizationVisualPresenceStateSnapshot['captureState']['permission'] | null
    captureSourceName: string | null
    degradedReason: string | null
    stateAgeMs: number | null
  }
  attention: {
    engaged: boolean
    targetPoint: Point2D
    resolvedPresence: StageEmbodimentAttentionPresenceState | null
    runtimePresence: StageEmbodimentAttentionPresenceState | null
    runtimeBias: {
      engaged: boolean
      confidence: number
      x: number
      y: number
    }
  }
  posture: StageEmbodimentPresencePostureState
  speech: {
    phase: StageEmbodimentSpeechRenderPhase
    playbackPhase: StageEmbodimentSpeechRenderState['playbackPhase']
    speechEnergy: number
    prosodyIntensity: number
    emphasisLevel: number
    cadencePulse: number
  }
  stage: Size2D
}

export interface UseStageEmbodimentDiagnosticsOptions {
  activePresence: Readonly<Ref<StageEmbodimentAttentionPresenceState | null>>
  presencePosture: Readonly<Ref<StageEmbodimentPresencePostureState>>
  speechRenderState: Readonly<Ref<StageEmbodimentSpeechRenderState | null | undefined>>
  stageBounds: Readonly<Ref<Size2D>>
  targetPoint: Readonly<Ref<Point2D>>
  visualPresenceState?: Readonly<Ref<AlicizationVisualPresenceStateSnapshot | null | undefined>>
}

export function useStageEmbodimentDiagnostics(options: UseStageEmbodimentDiagnosticsOptions) {
  const snapshot = computed<StageEmbodimentDiagnosticsSnapshot>(() => {
    const now = Date.now()
    const visualPresenceState = options.visualPresenceState?.value
    const runtimePresence = resolveStageEmbodimentRuntimePresence(visualPresenceState, now)
    const runtimeBias = resolveStageEmbodimentRuntimeAttentionBias(visualPresenceState, now, runtimePresence)
    const speechRenderState = options.speechRenderState.value

    return {
      visualPresence: {
        watchMode: visualPresenceState?.watchMode ?? null,
        scenario: visualPresenceState?.currentScene?.scenario ?? null,
        thoughtStance: visualPresenceState?.privateThought?.stance ?? null,
        embodiedPresence: visualPresenceState?.privateThought?.embodiedPresence ?? null,
        capturePermission: visualPresenceState?.captureState.permission ?? null,
        captureSourceName: visualPresenceState?.captureState.sourceName ?? null,
        degradedReason: visualPresenceState?.captureState.degradedReason ?? null,
        stateAgeMs: Number.isFinite(visualPresenceState?.updatedAt)
          ? Math.max(0, now - Number(visualPresenceState?.updatedAt))
          : null,
      },
      attention: {
        engaged: runtimeBias.engaged || speechRenderState?.active === true || Boolean(options.activePresence.value),
        targetPoint: options.targetPoint.value,
        resolvedPresence: options.activePresence.value,
        runtimePresence,
        runtimeBias,
      },
      posture: options.presencePosture.value,
      speech: {
        phase: speechRenderState?.phase ?? 'idle',
        playbackPhase: speechRenderState?.playbackPhase ?? 'idle',
        speechEnergy: speechRenderState?.dynamics.speechEnergy ?? 0,
        prosodyIntensity: speechRenderState?.dynamics.prosodyIntensity ?? 0,
        emphasisLevel: speechRenderState?.dynamics.emphasisLevel ?? 0,
        cadencePulse: speechRenderState?.dynamics.cadencePulse ?? 0,
      },
      stage: options.stageBounds.value,
    }
  })

  return {
    snapshot: readonly(snapshot) as Readonly<ComputedRef<StageEmbodimentDiagnosticsSnapshot>>,
  }
}
