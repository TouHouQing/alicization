import type {
  AlicizationDialoguePerformancePayload,
  CharacterPerformanceCapabilitiesManifest,
  AlicizationResidentPerformanceSnapshot,
} from '../../stores/alicization-bridge'
import type { StageEmbodimentPerformanceContinuityState } from '../../components/scenes/stage-embodiment-performance-plan'

import { buildStageEmbodimentPerformancePlan } from '../../components/scenes/stage-embodiment-performance-plan'

export interface AdaptAlicizationEmbodimentPerformanceToRendererInput {
  performance: AlicizationDialoguePerformancePayload
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  continuity?: StageEmbodimentPerformanceContinuityState
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
}

export function adaptAlicizationEmbodimentPerformanceToRenderer(
  input: AdaptAlicizationEmbodimentPerformanceToRendererInput,
) {
  const plan = buildStageEmbodimentPerformancePlan({
    continuity: input.continuity,
    manifest: input.manifest,
    performance: input.performance,
  })

  return {
    performance: plan.performance,
    plannedFacialCue: plan.plannedFacialCue,
    plannedActionCue: plan.plannedActionCue,
    residentPerformance: input.residentPerformance ?? null,
  }
}
