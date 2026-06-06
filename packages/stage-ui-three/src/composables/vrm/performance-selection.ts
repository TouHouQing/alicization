import type { AlicizationEmotion, StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'

import type {
  VrmActionBinding,
  VrmCustomExpressionBinding,
} from '../../types/performance'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
} from '@proj-alicization/stage-shared'

export interface VrmDialoguePerformanceInput {
  actionCue: string | null
  baseEmotion: AlicizationEmotion
  emphasis: 0 | 1 | 2
  facialCue: string | null
}

function normalizeCapabilityText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCapabilityIdentity(value: unknown) {
  return normalizeCapabilityText(value).toLowerCase()
}

function normalizeCapabilityList(values: readonly string[] | string[] | null | undefined) {
  return (values ?? [])
    .map(value => normalizeCapabilityText(value))
    .filter(Boolean)
}

function uniqueCandidateOrder(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = normalizeCapabilityText(value)
    if (!normalized)
      continue
    const signature = normalized.toLowerCase()
    if (seen.has(signature))
      continue
    seen.add(signature)
    result.push(normalized)
  }

  return result
}

function resolveSameHerExpressionPriority(
  state: StageEmbodimentPerformanceState | null | undefined,
  candidates: string[],
) {
  const rendererHints = state?.activeCue?.rendererHints
  const residentMode = normalizeCapabilityIdentity(rendererHints?.residentMode)
  const hasStructuredSameHerSignal = hasAlicizationAudibleSameHerCarry(rendererHints)
    || hasAlicizationQuieterSameHerCarry(rendererHints)
    || hasAlicizationStillVoicedSameHerCarry(rendererHints)
  const hasRestrainedResidentMode = residentMode === 'measured-return'
    || residentMode === 'repair-before-closeness'
    || residentMode === 'quiet-companionship'

  if (!hasRestrainedResidentMode && !hasStructuredSameHerSignal)
    return candidates

  const preferredSoftReturnAliases = candidates.filter((candidate) => {
    const signature = normalizeCapabilityIdentity(candidate)
    return signature === 'recoversoft'
      || signature === 'recover_soft'
      || signature === 'calminspect'
      || signature === 'calm_inspect'
      || signature === 'relaxed'
      || signature === 'soft'
      || signature === 'softgaze'
      || signature === 'soft_gaze'
      || signature === 'halflid'
      || signature === 'half_lid'
  })
  const remainingAliases = candidates.filter((candidate) => {
    if (preferredSoftReturnAliases.includes(candidate))
      return false

    return !/smile|joy|cheer|bright|grin|happy/iu.test(candidate)
  })

  return uniqueCandidateOrder([
    ...preferredSoftReturnAliases,
    ...remainingAliases,
  ])
}

function resolveSameHerMotionPriority(
  state: StageEmbodimentPerformanceState | null | undefined,
  candidates: string[],
) {
  const rendererHints = state?.activeCue?.rendererHints
  const residentMode = normalizeCapabilityIdentity(rendererHints?.residentMode)
  const preferredMotionAliases = normalizeCapabilityList(rendererHints?.preferredMotionAliases)
  const aliasSignatures = new Set(preferredMotionAliases.map(alias => alias.toLowerCase()))
  const hasSoftReturnMotionAlias = (
    aliasSignatures.has('observesoft')
    || aliasSignatures.has('observe_soft')
    || aliasSignatures.has('steadyfocus')
    || aliasSignatures.has('steady_focus')
    || aliasSignatures.has('idlesettle')
    || aliasSignatures.has('idle_settle')
    || aliasSignatures.has('stillnessguard')
    || aliasSignatures.has('stillness_guard')
  )
  const hasAudibleSameHerSignal = hasAlicizationAudibleSameHerCarry(rendererHints)
  const hasStructuredSameHerSignal = hasAudibleSameHerSignal
    || hasAlicizationQuieterSameHerCarry(rendererHints)
    || hasAlicizationStillVoicedSameHerCarry(rendererHints)
  const hasSameHerSignal = hasSoftReturnMotionAlias
    && (
      residentMode === 'measured-return'
      || residentMode === 'quiet-companionship'
      || residentMode === 'repair-before-closeness'
      || hasStructuredSameHerSignal
    )

  if (!hasSameHerSignal)
    return candidates

  const preferredSoftReturnAliases = candidates.filter((candidate) => {
    const signature = normalizeCapabilityIdentity(candidate)
    return signature === 'steady_focus'
      || signature === 'steadyfocus'
      || signature === 'idle_settle'
      || signature === 'idlesettle'
      || signature === 'observe_soft'
      || signature === 'observesoft'
      || signature === 'stillness_guard'
      || signature === 'stillnessguard'
  })
  const remainingAliases = candidates.filter(candidate => !preferredSoftReturnAliases.includes(candidate))
  return uniqueCandidateOrder([
    ...preferredSoftReturnAliases,
    ...remainingAliases,
  ])
}

function resolvePerformanceAuthoritySegmentId(
  state: StageEmbodimentPerformanceState | null | undefined,
) {
  return normalizeCapabilityText(
    state?.activeSegment?.segmentId
    ?? state?.driverAuthority?.segmentId
    ?? state?.activeCue?.id
    ?? null,
  ) || null
}

export function resolveVrmDialoguePerformanceFromState(
  state?: StageEmbodimentPerformanceState | null,
): VrmDialoguePerformanceInput | null {
  if (!state || state.phase === 'idle')
    return null

  return {
    actionCue: state.activeActionCue ?? state.performance.actionCue ?? null,
    baseEmotion: state.performance.baseEmotion,
    emphasis: state.performance.emphasis,
    facialCue: state.activeFacialCue ?? state.performance.facialCue ?? null,
  }
}

export function resolveVrmPreferredCustomExpressionBinding(
  state: StageEmbodimentPerformanceState | null | undefined,
  bindings: VrmCustomExpressionBinding[] | null | undefined,
) {
  const candidates = resolveSameHerExpressionPriority(state, [
    ...(state?.activeCue?.rendererHints?.preferredExpressionAliases ?? []),
    state?.activeFacialCue ?? null,
    state?.performance.facialCue ?? null,
  ]
    .map(value => normalizeCapabilityText(value))
    .filter(Boolean))

  if (candidates.length === 0)
    return undefined

  const availableBindings = (bindings ?? [])
    .filter(binding =>
      normalizeCapabilityText(binding.expressionName)
      && normalizeCapabilityText(binding.facialKey)
      && normalizeCapabilityText(binding.label)
      && normalizeCapabilityText(binding.description),
    )
  if (availableBindings.length === 0)
    return undefined

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeCapabilityIdentity(candidate)
    const matched = availableBindings.find((binding) => {
      return normalizeCapabilityIdentity(binding.expressionName) === normalizedCandidate
        || normalizeCapabilityIdentity(binding.facialKey) === normalizedCandidate
    })
    if (matched)
      return matched
  }

  return undefined
}

export function resolveVrmPreferredActionBinding(
  state: StageEmbodimentPerformanceState | null | undefined,
  bindings: VrmActionBinding[] | null | undefined,
) {
  const candidates = resolveSameHerMotionPriority(state, uniqueCandidateOrder([
    ...(state?.activeCue?.rendererHints?.preferredMotionAliases ?? []),
    state?.actionPulse.cue ?? null,
    state?.activeActionCue ?? null,
    state?.performance.actionCue ?? null,
  ]))

  if (candidates.length === 0)
    return undefined

  const availableBindings = (bindings ?? [])
    .filter(binding => normalizeCapabilityText(binding.actionKey))
  if (availableBindings.length === 0)
    return undefined

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeCapabilityIdentity(candidate)
    const matched = availableBindings.find(binding =>
      normalizeCapabilityIdentity(binding.actionKey) === normalizedCandidate,
    )
    if (matched)
      return matched
  }

  return undefined
}

export function resolveVrmDialogueExpressionWatchKey(
  state?: StageEmbodimentPerformanceState | null,
) {
  const rendererHints = state?.activeCue?.rendererHints
  const normalizedReasonTags = normalizeCapabilityList(rendererHints?.reasonTags)
  return JSON.stringify([
    state?.phase ?? 'idle',
    resolvePerformanceAuthoritySegmentId(state),
    state?.performance.baseEmotion ?? 'neutral',
    state?.activeFacialCue ?? state?.performance.facialCue ?? null,
    normalizeCapabilityList(rendererHints?.preferredExpressionAliases),
    rendererHints?.residentMode ?? null,
    rendererHints?.preferredGazeMode ?? null,
    rendererHints?.preferredBlinkCadence ?? null,
    rendererHints?.signature ?? null,
    normalizedReasonTags,
    state?.activeCue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    Math.round((state?.expressionIntensity ?? 0) * 10),
    Math.round((state?.facialCueIntensity ?? 0) * 10),
    Math.round((state?.motor.expressivity ?? 0) * 100),
    Math.round((state?.motor.facial.cheekLift ?? 0) * 100),
    Math.round((state?.motor.facial.browTension ?? 0) * 100),
    Math.round((state?.motor.facial.eyeOpenness ?? 0) * 100),
    Math.round((state?.motor.stillness ?? 0) * 100),
  ])
}
