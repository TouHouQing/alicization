import type { StageEmbodimentPerformanceContinuityState } from '../../components/scenes/stage-embodiment-performance-plan'
import type {
  AlicizationDialoguePerformancePayload,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { buildStageEmbodimentPerformancePlan } from '../../components/scenes/stage-embodiment-performance-plan'

export interface AdaptAlicizationEmbodimentPerformanceToRendererInput {
  performance: AlicizationDialoguePerformancePayload
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  continuity?: StageEmbodimentPerformanceContinuityState
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
}

function isRestProtectiveQuietCompanionshipResidentAuthority(
  input: AdaptAlicizationEmbodimentPerformanceToRendererInput,
) {
  return (input.residentPerformance?.source === 'main-runtime' || input.residentPerformance?.source === 'browser-fallback')
    && input.residentPerformance?.stance === 'care'
    && input.residentPerformance?.embodiedPresence === 'concerned'
    && input.residentPerformance?.emotionalTension === 'late-night-drain'
    && input.residentPerformance?.performance?.delivery === 'gentle'
    && input.performance.delivery === 'gentle'
    && (
      input.performance.baseEmotion === 'concerned'
      || input.performance.baseEmotion === 'tired'
      || input.performance.baseEmotion === 'thinking'
    )
}

function resolveManifestSupportedActionCue(input: {
  fallback: string | null | undefined
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  preferred: string | null | undefined
}): string | null {
  const fallback = input.fallback?.trim() || null
  const preferred = input.preferred?.trim() || null
  if (!preferred)
    return fallback
  if (!input.manifest)
    return preferred

  return input.manifest.supportedActions.some(action => action.key === preferred)
    ? preferred
    : fallback
}

export function adaptAlicizationEmbodimentPerformanceToRenderer(
  input: AdaptAlicizationEmbodimentPerformanceToRendererInput,
) {
  const plan = buildStageEmbodimentPerformancePlan({
    continuity: input.continuity,
    manifest: input.manifest,
    performance: input.performance,
  })
  const residentMode = input.residentPerformance?.performance?.residentMode
    ?? input.residentPerformance?.performance?.action?.residentMode
    ?? input.residentPerformance?.performance?.face?.residentMode
    ?? null
  const restProtectiveQuietCompanionshipAuthority = isRestProtectiveQuietCompanionshipResidentAuthority(input)

  const preserveQuietCompanionshipSteadyFocus = input.residentPerformance?.source === 'main-runtime'
    && input.residentPerformance?.stance === 'accompany'
    && input.residentPerformance?.embodiedPresence === 'attentive'
    && input.residentPerformance?.performance?.delivery === 'gentle'
    && input.residentPerformance?.performance?.actionCue === 'steady_focus'
    && input.performance.delivery === 'gentle'
    && input.performance.baseEmotion === 'thinking'
    && (
      input.performance.actionCue === 'steady_focus'
      || input.performance.actionCue === 'observe_focus'
      || input.performance.actionCue === 'idle_settle'
    )
  const preserveRestProtectiveQuietCompanionshipIdleSettle = restProtectiveQuietCompanionshipAuthority
    && input.performance.actionCue === 'idle_settle'
  const preserveMeasuredReturnObserveFocusAfterGentleRelease
    = input.residentPerformance?.source === 'main-runtime'
      && input.residentPerformance?.stance === 'accompany'
      && input.residentPerformance?.embodiedPresence === 'attentive'
      && input.residentPerformance?.performance?.delivery === 'gentle'
      && residentMode === 'measured-return'
      && input.performance.delivery === 'gentle'
      && input.performance.baseEmotion === 'thinking'
      && input.performance.actionCue === 'idle_settle'

  let performance = plan.performance
  if (preserveMeasuredReturnObserveFocusAfterGentleRelease) {
    performance = {
      ...performance,
      actionCue: resolveManifestSupportedActionCue({
        fallback: performance.actionCue,
        manifest: input.manifest,
        preferred: 'observe_focus',
      }),
    }
  }
  else if (preserveRestProtectiveQuietCompanionshipIdleSettle || preserveQuietCompanionshipSteadyFocus) {
    performance = {
      ...performance,
      actionCue: resolveManifestSupportedActionCue({
        fallback: performance.actionCue,
        manifest: input.manifest,
        preferred: input.residentPerformance?.performance?.actionCue,
      }),
    }
  }

  return {
    performance,
    plannedFacialCue: plan.plannedFacialCue,
    plannedActionCue: performance.actionCue ?? null,
    residentPerformance: input.residentPerformance ?? null,
  }
}
