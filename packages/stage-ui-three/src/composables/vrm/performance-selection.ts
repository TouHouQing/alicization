import type { AlicizationEmotion, StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'

import type {
  VrmActionBinding,
  VrmCustomExpressionBinding,
} from '../../types/performance'

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

function normalizeVrmActionBindingIdentity(value: unknown) {
  const identity = normalizeCapabilityIdentity(value)
  if (
    identity === 'idle_settle'
    || identity === 'idlesettle'
    || identity === 'settle_idle'
    || identity === 'settleidle'
  ) {
    return 'idle_settle'
  }

  return identity
}

function normalizeCapabilityList(values: readonly string[] | string[] | null | undefined) {
  return (values ?? [])
    .map(value => normalizeCapabilityText(value))
    .filter(Boolean)
}

function isTimelineShellSegmentId(value: unknown) {
  const normalized = normalizeCapabilityText(value)
  if (!normalized)
    return false

  return normalized.startsWith('driver:')
    || /^turn-[^|]*:\d+$/u.test(normalized)
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

function resolvePerformanceAuthoritySegmentId(
  state: StageEmbodimentPerformanceState | null | undefined,
) {
  const activeSegmentFrameId = normalizeCapabilityText(state?.activeSegment?.digitalLifeFrame?.id)
  if (activeSegmentFrameId)
    return activeSegmentFrameId

  const activeSegmentCueId = normalizeCapabilityText(state?.activeSegment?.cue?.id)
  if (activeSegmentCueId && !isTimelineShellSegmentId(activeSegmentCueId))
    return activeSegmentCueId

  const candidates = [
    state?.activeSegment?.segmentId,
    state?.driverAuthority?.segmentId,
    state?.activeCue?.id,
    activeSegmentCueId,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeCapabilityText(candidate)
    if (normalized)
      return normalized
  }

  return null
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
  const candidates = uniqueCandidateOrder([
    ...(state?.activeCue?.rendererHints?.preferredExpressionAliases ?? []),
    state?.activeFacialCue ?? null,
    state?.performance.facialCue ?? null,
  ])

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
  const candidates = uniqueCandidateOrder([
    ...(state?.activeCue?.rendererHints?.preferredMotionAliases ?? []),
    state?.actionPulse.cue ?? null,
    state?.activeActionCue ?? null,
    state?.performance.actionCue ?? null,
  ])

  if (candidates.length === 0)
    return undefined

  const availableBindings = (bindings ?? [])
    .filter(binding => normalizeCapabilityText(binding.actionKey))
  if (availableBindings.length === 0)
    return undefined

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeVrmActionBindingIdentity(candidate)
    const matched = availableBindings.find(binding =>
      normalizeVrmActionBindingIdentity(binding.actionKey) === normalizedCandidate,
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
  return JSON.stringify([
    state?.phase ?? 'idle',
    resolvePerformanceAuthoritySegmentId(state),
    state?.performance.baseEmotion ?? 'neutral',
    state?.activeFacialCue ?? state?.performance.facialCue ?? null,
    normalizeCapabilityList(rendererHints?.preferredExpressionAliases),
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
