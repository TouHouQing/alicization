import type {
  AlicizationDialoguePerformancePayload,
  CharacterPerformanceCapabilitiesManifest,
  AlicizationResidentPerformanceSnapshot,
} from '../../stores/alicization-bridge'
import type { StageEmbodimentPerformanceContinuityState } from '../../components/scenes/stage-embodiment-performance-plan'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
} from '@proj-alicization/stage-shared'
import { buildStageEmbodimentPerformancePlan } from '../../components/scenes/stage-embodiment-performance-plan'

export interface AdaptAlicizationEmbodimentPerformanceToRendererInput {
  performance: AlicizationDialoguePerformancePayload
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  continuity?: StageEmbodimentPerformanceContinuityState
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
}

function normalizeResidentReasonTag(value: string | null | undefined) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/-/g, '_')
    : ''
}

function hasResidentReasonTag(
  residentReasonTags: readonly string[] | string[] | null | undefined,
  expectedTag: string,
) {
  const normalizedExpectedTag = normalizeResidentReasonTag(expectedTag)
  return (residentReasonTags ?? []).some(reasonTag =>
    normalizeResidentReasonTag(reasonTag) === normalizedExpectedTag,
  )
}

function isRestProtectiveQuietCompanionshipResidentAuthority(
  input: AdaptAlicizationEmbodimentPerformanceToRendererInput,
) {
  const residentReasonTags = input.residentPerformance?.reasonTags ?? []
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
    && (
      hasResidentReasonTag(residentReasonTags, 'rest-protective')
      || hasResidentReasonTag(residentReasonTags, 'rest-protective-companionship')
    )
}

export function adaptAlicizationEmbodimentPerformanceToRenderer(
  input: AdaptAlicizationEmbodimentPerformanceToRendererInput,
) {
  const plan = buildStageEmbodimentPerformancePlan({
    continuity: input.continuity,
    manifest: input.manifest,
    performance: input.performance,
  })
  const residentReasonTags = input.residentPerformance?.reasonTags ?? []
  const hasAudibleSameHerContinuity = hasAlicizationAudibleSameHerCarry({
    signature: input.residentPerformance?.signature ?? null,
    reasonTags: residentReasonTags,
  })
  const hasQuieterSameHerContinuity = hasAlicizationQuieterSameHerCarry({
    signature: input.residentPerformance?.signature ?? null,
    reasonTags: residentReasonTags,
  })
  const hasStillVoicedContinuity = hasAlicizationStillVoicedSameHerCarry({
    signature: input.residentPerformance?.signature ?? null,
    reasonTags: residentReasonTags,
  })
  const quietObserveActionCue = hasResidentReasonTag(residentReasonTags, 'subconscious-proactive')
    && hasResidentReasonTag(residentReasonTags, 'silent-observe')
    && hasResidentReasonTag(residentReasonTags, 'continuity:quiet-accompaniment')
    && (
      hasResidentReasonTag(residentReasonTags, 'measured-return')
      || hasAudibleSameHerContinuity
      || hasQuieterSameHerContinuity
      || hasStillVoicedContinuity
      || hasResidentReasonTag(residentReasonTags, 'repair-before-closeness')
      || hasResidentReasonTag(residentReasonTags, 'continuity-next-open-window')
      || hasResidentReasonTag(residentReasonTags, 'lower-pressure')
    )
  const restProtectiveQuietCompanionshipAuthority = isRestProtectiveQuietCompanionshipResidentAuthority(input)
  const restrainedCallbackActionCue = hasResidentReasonTag(residentReasonTags, 'repair-before-closeness')
    ? 'idle_settle'
    : restProtectiveQuietCompanionshipAuthority
    ? 'idle_settle'
    : hasResidentReasonTag(residentReasonTags, 'measured-return')
      ? 'observe_focus'
      : quietObserveActionCue
        ? 'observe_focus'
        : 'steady_focus'

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
  const preserveMeasuredReturnObserveFocusAfterGentleRelease = input.residentPerformance?.source === 'main-runtime'
    && input.residentPerformance?.stance === 'accompany'
    && input.residentPerformance?.embodiedPresence === 'attentive'
    && input.residentPerformance?.performance?.delivery === 'gentle'
    && input.performance.delivery === 'gentle'
    && input.performance.baseEmotion === 'thinking'
    && input.performance.actionCue === 'idle_settle'
    && (
      hasResidentReasonTag(residentReasonTags, 'measured-return')
      || hasAudibleSameHerContinuity
      || hasQuieterSameHerContinuity
      || hasStillVoicedContinuity
    )
    && (
      hasResidentReasonTag(residentReasonTags, 'continuity-next-open-window')
      || hasAudibleSameHerContinuity
      || hasQuieterSameHerContinuity
      || hasStillVoicedContinuity
      || hasResidentReasonTag(residentReasonTags, 'lower-pressure')
      || hasResidentReasonTag(residentReasonTags, 'durable-relationship-rhythm')
    )

  return {
    performance: preserveMeasuredReturnObserveFocusAfterGentleRelease
      ? {
          ...plan.performance,
          actionCue: 'observe_focus',
        }
      : preserveRestProtectiveQuietCompanionshipIdleSettle
      ? {
          ...plan.performance,
          actionCue: restrainedCallbackActionCue,
        }
      : preserveQuietCompanionshipSteadyFocus
      ? {
          ...plan.performance,
          actionCue: restrainedCallbackActionCue,
        }
      : plan.performance,
    plannedFacialCue: plan.plannedFacialCue,
    plannedActionCue: plan.plannedActionCue,
    residentPerformance: input.residentPerformance ?? null,
  }
}
