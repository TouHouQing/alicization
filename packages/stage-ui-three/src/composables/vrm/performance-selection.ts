import type { AlicizationEmotion } from '@proj-alicization/stage-shared'
import type { StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
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
  const candidates = [
    ...(state?.activeCue?.rendererHints?.preferredExpressionAliases ?? []),
    state?.activeFacialCue ?? null,
    state?.performance.facialCue ?? null,
  ]
    .map(value => normalizeCapabilityText(value))
    .filter(Boolean)

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
  const candidates = [
    ...(state?.activeCue?.rendererHints?.preferredMotionAliases ?? []),
    state?.actionPulse.cue ?? null,
    state?.activeActionCue ?? null,
    state?.performance.actionCue ?? null,
  ]
    .map(value => normalizeCapabilityText(value))
    .filter(Boolean)

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
  return JSON.stringify([
    state?.phase ?? 'idle',
    state?.performance.baseEmotion ?? 'neutral',
    state?.activeFacialCue ?? state?.performance.facialCue ?? null,
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
