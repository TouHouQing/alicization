import type {
  StageEmbodimentIdleMotionPreference,
  StageEmbodimentPresencePostureMode,
  StageEmbodimentPresencePostureState,
} from '@proj-alicization/stage-shared'
import type { VrmActionBinding, VrmIdleActionPreference } from '@proj-alicization/stage-ui-three'
import type { ComputedRef, Ref } from 'vue'

import type { StageEmbodimentAttentionPresenceState } from './use-stage-embodiment-attention'

import { computed, readonly } from 'vue'

interface Live2DIdleCapability {
  actionKey: string
  motionName: string
  motionIndex: number
  label?: string
  description?: string
}

interface UseStageEmbodimentIdlePerformanceOptions {
  activePresence?: Readonly<Ref<StageEmbodimentAttentionPresenceState | null | undefined>>
  live2dActionCapabilities: Readonly<Ref<Live2DIdleCapability[]>>
  presencePosture: Readonly<Ref<StageEmbodimentPresencePostureState | null | undefined>>
  residentRestraint?: Readonly<Ref<StageEmbodimentIdleRestraintContext | null | undefined>>
  vrmActionBindings: Readonly<Ref<VrmActionBinding[]>>
}

interface IdlePreferenceProfile {
  avoid: RegExp[]
  settleBoost: number
  soft: RegExp[]
  strong: RegExp[]
}

interface StageEmbodimentIdleRestraintContext {
  reasonTags?: readonly string[] | null
  residentMode?: string | null
}

const idlePreferenceProfiles: Record<Exclude<StageEmbodimentPresencePostureMode, 'idle'>, IdlePreferenceProfile> = {
  inspection: {
    strong: [/inspect/i, /focus/i, /observe/i, /study/i, /scan/i, /read/i, /check/i],
    soft: [/nod/i, /lean/i, /idle/i, /settle/i, /gentle/i, /attentive/i],
    avoid: [/shock/i, /freeze/i, /cheer/i, /excited/i, /raise/i],
    settleBoost: 0.08,
  },
  attentive: {
    strong: [/attentive/i, /nod/i, /sway/i, /relax/i, /idle/i, /settle/i],
    soft: [/gentle/i, /smile/i, /observe/i, /focus/i],
    avoid: [/shock/i, /freeze/i, /pout/i, /disdain/i],
    settleBoost: 0.12,
  },
  hesitant: {
    strong: [/hesitant/i, /think/i, /ponder/i, /confus/i, /pout/i, /glance/i, /tilt/i],
    soft: [/idle/i, /settle/i, /slow/i, /gentle/i],
    avoid: [/cheer/i, /excited/i, /raise/i],
    settleBoost: 0.04,
  },
  concerned: {
    strong: [/concern/i, /comfort/i, /gentle/i, /reassur/i, /soothe/i, /soft/i],
    soft: [/idle/i, /settle/i, /nod/i, /slow/i, /calm/i],
    avoid: [/cheer/i, /excited/i, /shock/i, /freeze/i, /disdain/i],
    settleBoost: 0.18,
  },
}

function clampUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function normalizeCandidateText(...segments: Array<string | null | undefined>) {
  return segments
    .map(segment => typeof segment === 'string' ? segment.trim() : '')
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function countPatternMatches(text: string, patterns: RegExp[]) {
  let score = 0
  for (const pattern of patterns) {
    if (pattern.test(text))
      score += 1
  }
  return score
}

function resolveIdleRestraintReasonTags(
  activePresence: StageEmbodimentAttentionPresenceState | null | undefined,
  residentRestraint?: StageEmbodimentIdleRestraintContext | null | undefined,
) {
  const activeReasonTags = (activePresence?.reasonTags ?? [])
    .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  if (activeReasonTags.length > 0)
    return activeReasonTags

  const residentReasonTags = (residentRestraint?.reasonTags ?? [])
    .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  const residentMode = residentRestraint?.residentMode

  return Array.from(new Set([
    ...residentReasonTags,
    residentMode === 'measured-return'
    || residentMode === 'repair-before-closeness'
    || residentMode === 'quiet-companionship'
      ? residentMode
      : null,
  ].filter((tag): tag is string => Boolean(tag))))
}

function resolveIdlePreferenceScore(
  mode: Exclude<StageEmbodimentPresencePostureMode, 'idle'>,
  confidence: number,
  posture: StageEmbodimentPresencePostureState,
  activePresence: StageEmbodimentAttentionPresenceState | null | undefined,
  residentRestraint: StageEmbodimentIdleRestraintContext | null | undefined,
  text: string,
  settleLike: boolean,
) {
  const profile = idlePreferenceProfiles[mode]
  const strongMatches = countPatternMatches(text, profile.strong)
  const softMatches = countPatternMatches(text, profile.soft)
  const avoidMatches = countPatternMatches(text, profile.avoid)
  const genericIdleMatches = countPatternMatches(text, [/idle/i, /settle/i, /rest/i, /neutral/i, /loop/i])
  const quietMatches = countPatternMatches(text, [/quiet/i, /companion/i, /nearby/i, /soft/i, /hold/i])
  const protectiveMatches = countPatternMatches(text, [/protect/i, /guard/i, /watch/i, /hold/i, /nearby/i])
  const focusHoldMatches = countPatternMatches(text, [/focus/i, /observe/i, /inspect/i, /hold/i, /study/i])
  const responsiveMatches = countPatternMatches(text, [/nod/i, /sway/i, /smile/i, /lean/i, /settle/i])
  const activeReasonTags = resolveIdleRestraintReasonTags(activePresence, residentRestraint)
  const callbackMeasuredReturn = activeReasonTags.includes('measured-return')
  const durableRelationshipRhythm = activeReasonTags.includes('durable-relationship-rhythm')
  const callbackRepairBeforeCloseness = activeReasonTags.includes('repair-before-closeness')
  const measuredReturnLowerPressureCarry = callbackMeasuredReturn
    && (
      activeReasonTags.includes('continuity-next-open-window')
      || activeReasonTags.includes('lower-pressure')
    )
  const repairBeforeClosenessDurabilityBias = mode === 'attentive'
    && callbackRepairBeforeCloseness
    && durableRelationshipRhythm
    && posture.gazeStability >= 0.9
    && posture.breathBoost <= 0.12
    && Math.abs(posture.bodyYaw) <= 0.02
    && posture.bodyPitch <= 0.22
    ? quietMatches * 0.32
    + protectiveMatches * 0.12
    - responsiveMatches * 0.18
    - focusHoldMatches * 0.1
    : 0
  const restrainedCallbackBias = mode === 'attentive'
    ? callbackRepairBeforeCloseness
      ? quietMatches * 0.34 + protectiveMatches * 0.14 - focusHoldMatches * 0.22 - responsiveMatches * 0.16
      : callbackMeasuredReturn
        ? quietMatches * (
          durableRelationshipRhythm
            ? 0.32
            : measuredReturnLowerPressureCarry
              ? 0.3
              : 0.22
        )
        + (settleLike ? 1 : 0) * (measuredReturnLowerPressureCarry ? 0.02 : 0.04)
        - responsiveMatches * (
          durableRelationshipRhythm
            ? 0.12
            : measuredReturnLowerPressureCarry
              ? 0.16
              : 0.08
        )
        - focusHoldMatches * (measuredReturnLowerPressureCarry ? 0.06 : 0)
        : 0
    : 0
  const quietAttentiveBias = mode === 'attentive'
    && posture.gazeStability >= 0.84
    && posture.breathBoost <= 0.18
    && Math.abs(posture.bodyYaw) <= 0.05
    && posture.bodyPitch <= 0.28
    ? quietMatches * 0.3 - focusHoldMatches * 0.08
    : 0
  const lowerPressureQuietAttentiveBias = mode === 'attentive'
    && posture.gazeStability >= 0.88
    && posture.breathBoost <= 0.14
    && Math.abs(posture.bodyYaw) <= 0.03
    && posture.bodyPitch <= 0.24
    ? quietMatches * 0.26
    + protectiveMatches * (durableRelationshipRhythm ? 0.12 : 0.08)
    - responsiveMatches * (durableRelationshipRhythm ? 0.16 : 0.12)
    - (settleLike ? 0.08 : 0)
    : 0
  const activeAttentiveBias = mode === 'attentive'
    && posture.gazeStability <= 0.72
    && posture.breathBoost >= 0.24
    && posture.bodyPitch >= 0.34
    ? focusHoldMatches * 0.24 - quietMatches * 0.08
    : 0
  const protectiveConcernedBias = mode === 'concerned'
    && posture.gazeStability >= 0.86
    && posture.breathBoost <= 0.2
    && Math.abs(posture.bodyYaw) <= 0.04
    ? protectiveMatches * 0.46 - genericIdleMatches * 0.08
    : 0
  const ordinaryConcernedBias = mode === 'concerned'
    && posture.breathBoost >= 0.26
    && posture.bodyPitch >= 0.38
    ? genericIdleMatches * 0.12
    : 0

  return confidence * 0.35
    + strongMatches * 0.42
    + softMatches * 0.18
    + genericIdleMatches * 0.08
    + quietAttentiveBias
    + restrainedCallbackBias
    + repairBeforeClosenessDurabilityBias
    + lowerPressureQuietAttentiveBias
    + activeAttentiveBias
    + protectiveConcernedBias
    + ordinaryConcernedBias
    + (settleLike ? profile.settleBoost : 0)
    - avoidMatches * 0.32
}

function resolvePostureMode(posture: StageEmbodimentPresencePostureState | null | undefined) {
  if (!posture?.engaged || posture.mode === 'idle')
    return null

  return posture.mode
}

function resolveLive2DIdleMotionPreference(
  posture: StageEmbodimentPresencePostureState | null | undefined,
  activePresence: StageEmbodimentAttentionPresenceState | null | undefined,
  capabilities: Live2DIdleCapability[],
  residentRestraint?: StageEmbodimentIdleRestraintContext | null | undefined,
): StageEmbodimentIdleMotionPreference | null {
  const mode = resolvePostureMode(posture)
  if (!mode || capabilities.length === 0)
    return null

  const confidence = clampUnit(posture?.confidence ?? 0)
  const restraintReasonTags = resolveIdleRestraintReasonTags(activePresence, residentRestraint)
  const ranked = capabilities
    .map((capability) => {
      const text = normalizeCandidateText(
        capability.actionKey,
        capability.label,
        capability.description,
        capability.motionName,
      )
      const settleLike = /(?:^|[_\s-])(?:idle|settle)(?:[_\s-]|$)/i.test(capability.actionKey) || /(?:^|[_\s-])idle(?:[_\s-]|$)/i.test(capability.motionName)
      const residentOnlyRestProtectiveCarryHold = mode === 'concerned'
        && restraintReasonTags.includes('rest-protective')
        && restraintReasonTags.includes('quiet-companionship')
        && (
          activePresence?.source === 'runtime-visual-presence'
          || !activePresence
        )
        // Keep Live2D on the same quieter inward line as VRM when resident-only
        // rest-protective carry is still the surviving body authority.
        && posture!.gazeStability >= 0.84
        && posture!.breathBoost <= 0.18
        && Math.abs(posture!.bodyYaw) <= 0.03
        && posture!.bodyPitch <= 0.38
      const live2dRestProtectiveSettleFallbackBias = residentOnlyRestProtectiveCarryHold
        && capability.actionKey === 'idle_settle'
        ? 1.34
        : 0
      const live2dRestProtectiveNodPenalty = residentOnlyRestProtectiveCarryHold
        && /nod/i.test(text)
        ? -0.46
        : 0
      const score = resolveIdlePreferenceScore(mode, confidence, posture!, activePresence, residentRestraint, text, settleLike)
        + live2dRestProtectiveSettleFallbackBias
        + live2dRestProtectiveNodPenalty
      return {
        capability,
        score,
      }
    })
    .sort((left, right) => right.score - left.score)

  const best = ranked[0]
  if (!best || best.score < 0.12)
    return null

  return {
    mode,
    confidence,
    actionKey: best.capability.actionKey,
    motionName: best.capability.motionName,
    motionIndex: best.capability.motionIndex,
  }
}

function resolveVrmIdleActionPreference(
  posture: StageEmbodimentPresencePostureState | null | undefined,
  activePresence: StageEmbodimentAttentionPresenceState | null | undefined,
  bindings: VrmActionBinding[],
  residentRestraint?: StageEmbodimentIdleRestraintContext | null | undefined,
): VrmIdleActionPreference | null {
  const mode = resolvePostureMode(posture)
  if (!mode)
    return null

  const confidence = clampUnit(posture?.confidence ?? 0)
  const restraintReasonTags = resolveIdleRestraintReasonTags(activePresence, residentRestraint)
  const ranked = bindings
    .map((binding) => {
      const text = normalizeCandidateText(
        binding.actionKey,
        binding.label,
        binding.description,
        binding.fileName,
      )
      const settleLike = binding.actionKey === 'settle_idle' || /(?:^|[_\s-])(?:idle|settle)(?:[_\s-]|$)/i.test(binding.actionKey)
      const callbackRepairBeforeCloseness = restraintReasonTags.includes('repair-before-closeness')
      const durableRelationshipRhythm = restraintReasonTags.includes('durable-relationship-rhythm')
      const durableLowerPressureHold = mode === 'attentive'
        && callbackRepairBeforeCloseness
        && durableRelationshipRhythm
        && posture!.gazeStability >= 0.9
        && posture!.breathBoost <= 0.12
        && Math.abs(posture!.bodyYaw) <= 0.02
        && posture!.bodyPitch <= 0.22
      // Runtime visual-presence posture rebuilds land softer than a full presence-pulse restore,
      // but resident-only repair carry should still keep VRM on the quieter nearby guard line.
      const residentOnlyRepairCarryHold = mode === 'attentive'
        && callbackRepairBeforeCloseness
        && durableRelationshipRhythm
        && (
          activePresence?.source === 'runtime-visual-presence'
          || !activePresence
        )
        && posture!.gazeStability >= 0.8
        && posture!.breathBoost <= 0.08
        && Math.abs(posture!.bodyYaw) <= 0.02
        && posture!.bodyPitch <= 0.28
      const residentOnlyRestProtectiveCarryHold = mode === 'concerned'
        && restraintReasonTags.includes('rest-protective')
        && restraintReasonTags.includes('quiet-companionship')
        && (
          activePresence?.source === 'runtime-visual-presence'
          || !activePresence
        )
        // Runtime visual-presence rebuilds recovering care with a slightly more
        // alert concerned posture than the narrower unit fixture, but the
        // resident-only rest-protective carry should still stay on the quieter
        // settle loop instead of warming back into a companionship nod.
        && posture!.gazeStability >= 0.84
        && posture!.breathBoost <= 0.18
        && Math.abs(posture!.bodyYaw) <= 0.03
        && posture!.bodyPitch <= 0.38
      const vrmDurableNearbyBias = mode === 'attentive'
        && durableLowerPressureHold
        && /nearby/i.test(text)
        ? 0.22
        : 0
      const vrmDurableNodPenalty = mode === 'attentive'
        && durableLowerPressureHold
        && /nod/i.test(text)
        ? -0.18
        : 0
      const vrmResidentCarryNearbyBias = mode === 'attentive'
        && residentOnlyRepairCarryHold
        && /nearby|guard/i.test(text)
        ? 0.82
        : 0
      const vrmResidentCarrySettleFallbackBias = mode === 'attentive'
        && callbackRepairBeforeCloseness
        && (
          activePresence?.source === 'runtime-visual-presence'
          || !activePresence
        )
        && binding.actionKey === 'settle_idle'
        ? 1.68
        : 0
      const vrmRestProtectiveSettleFallbackBias = residentOnlyRestProtectiveCarryHold
        && binding.actionKey === 'settle_idle'
        ? 1.34
        : 0
      const vrmResidentCarryNodPenalty = mode === 'attentive'
        && residentOnlyRepairCarryHold
        && /nod/i.test(text)
        ? -0.62
        : 0
      const vrmRestProtectiveNodPenalty = residentOnlyRestProtectiveCarryHold
        && /nod/i.test(text)
        ? -0.46
        : 0
      const score = resolveIdlePreferenceScore(mode, confidence, posture!, activePresence, residentRestraint, text, settleLike)
        + vrmDurableNearbyBias
        + vrmDurableNodPenalty
        + vrmResidentCarryNearbyBias
        + vrmResidentCarrySettleFallbackBias
        + vrmResidentCarryNodPenalty
        + vrmRestProtectiveSettleFallbackBias
        + vrmRestProtectiveNodPenalty
      return {
        binding,
        score,
      }
    })
    .sort((left, right) => right.score - left.score)

  const best = ranked[0]
  if (!best) {
    return {
      binding: null,
      confidence,
      mode,
    }
  }

  return {
    binding: best.binding,
    confidence,
    mode,
  }
}

export function useStageEmbodimentIdlePerformance(options: UseStageEmbodimentIdlePerformanceOptions) {
  const live2dIdleMotionPreference = computed(() => {
    return resolveLive2DIdleMotionPreference(
      options.presencePosture.value,
      options.activePresence?.value,
      options.live2dActionCapabilities.value,
      options.residentRestraint?.value,
    )
  })

  const vrmIdleActionPreference = computed(() => {
    return resolveVrmIdleActionPreference(
      options.presencePosture.value,
      options.activePresence?.value,
      options.vrmActionBindings.value,
      options.residentRestraint?.value,
    )
  })

  return {
    live2dIdleMotionPreference: readonly(live2dIdleMotionPreference) as Readonly<ComputedRef<StageEmbodimentIdleMotionPreference | null>>,
    vrmIdleActionPreference: readonly(vrmIdleActionPreference) as Readonly<ComputedRef<VrmIdleActionPreference | null>>,
  }
}

export {
  resolveLive2DIdleMotionPreference,
  resolveVrmIdleActionPreference,
}
