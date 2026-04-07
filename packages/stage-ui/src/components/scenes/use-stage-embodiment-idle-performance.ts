import type {
  StageEmbodimentIdleMotionPreference,
  StageEmbodimentPresencePostureMode,
  StageEmbodimentPresencePostureState,
} from '@proj-alicization/stage-shared'
import type { VrmActionBinding, VrmIdleActionPreference } from '@proj-alicization/stage-ui-three'
import type { ComputedRef, Ref } from 'vue'

import { computed, readonly } from 'vue'

interface Live2DIdleCapability {
  actionKey: string
  motionName: string
  motionIndex: number
  label?: string
  description?: string
}

interface UseStageEmbodimentIdlePerformanceOptions {
  live2dActionCapabilities: Readonly<Ref<Live2DIdleCapability[]>>
  presencePosture: Readonly<Ref<StageEmbodimentPresencePostureState | null | undefined>>
  vrmActionBindings: Readonly<Ref<VrmActionBinding[]>>
}

interface IdlePreferenceProfile {
  avoid: RegExp[]
  settleBoost: number
  soft: RegExp[]
  strong: RegExp[]
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

function resolveIdlePreferenceScore(
  mode: Exclude<StageEmbodimentPresencePostureMode, 'idle'>,
  confidence: number,
  text: string,
  settleLike: boolean,
) {
  const profile = idlePreferenceProfiles[mode]
  const strongMatches = countPatternMatches(text, profile.strong)
  const softMatches = countPatternMatches(text, profile.soft)
  const avoidMatches = countPatternMatches(text, profile.avoid)
  const genericIdleMatches = countPatternMatches(text, [/idle/i, /settle/i, /rest/i, /neutral/i, /loop/i])

  return confidence * 0.35
    + strongMatches * 0.42
    + softMatches * 0.18
    + genericIdleMatches * 0.08
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
  capabilities: Live2DIdleCapability[],
): StageEmbodimentIdleMotionPreference | null {
  const mode = resolvePostureMode(posture)
  if (!mode || capabilities.length === 0)
    return null

  const confidence = clampUnit(posture?.confidence ?? 0)
  const ranked = capabilities
    .map((capability) => {
      const text = normalizeCandidateText(
        capability.actionKey,
        capability.label,
        capability.description,
        capability.motionName,
      )
      const settleLike = /(?:^|[_\s-])(?:idle|settle)(?:[_\s-]|$)/i.test(capability.actionKey) || /(?:^|[_\s-])idle(?:[_\s-]|$)/i.test(capability.motionName)
      const score = resolveIdlePreferenceScore(mode, confidence, text, settleLike)
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
  bindings: VrmActionBinding[],
): VrmIdleActionPreference | null {
  const mode = resolvePostureMode(posture)
  if (!mode)
    return null

  const confidence = clampUnit(posture?.confidence ?? 0)
  const ranked = bindings
    .map((binding) => {
      const text = normalizeCandidateText(
        binding.actionKey,
        binding.label,
        binding.description,
        binding.fileName,
      )
      const settleLike = binding.actionKey === 'settle_idle' || /(?:^|[_\s-])(?:idle|settle)(?:[_\s-]|$)/i.test(binding.actionKey)
      const score = resolveIdlePreferenceScore(mode, confidence, text, settleLike)
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
      options.live2dActionCapabilities.value,
    )
  })

  const vrmIdleActionPreference = computed(() => {
    return resolveVrmIdleActionPreference(
      options.presencePosture.value,
      options.vrmActionBindings.value,
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
