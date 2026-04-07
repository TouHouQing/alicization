import type {
  AlicizationDialoguePerformancePayload,
  AlicizationEmotion,
  AlicizationPerformanceDelivery,
  CharacterActionCapability,
  CharacterFacialCapability,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { resolveStageEmbodimentCueCandidates } from '@proj-alicization/stage-shared'

interface CapabilityTextProfile {
  avoid: RegExp[]
  soft: RegExp[]
  strong: RegExp[]
}

export interface StageEmbodimentPerformanceContinuityState {
  previousActionCue?: string | null
  previousFacialCue?: string | null
  variationToken?: string | null
}

const deliveryActionProfiles: Record<AlicizationPerformanceDelivery, CapabilityTextProfile> = {
  calm: {
    strong: [/idle/i, /settle/i, /gentle/i, /calm/i, /nod/i, /relax/i],
    soft: [/observe/i, /focus/i, /sway/i, /soft/i],
    avoid: [/shock/i, /cheer/i, /excited/i, /raise/i],
  },
  gentle: {
    strong: [/gentle/i, /comfort/i, /soothe/i, /reassur/i, /soft/i, /nod/i],
    soft: [/idle/i, /settle/i, /relax/i, /calm/i],
    avoid: [/glare/i, /shock/i, /cheer/i, /excited/i],
  },
  firm: {
    strong: [/firm/i, /focus/i, /observe/i, /inspect/i, /scan/i, /steady/i],
    soft: [/attentive/i, /nod/i, /settle/i],
    avoid: [/tease/i, /playful/i, /shock/i],
  },
  energetic: {
    strong: [/cheer/i, /excited/i, /raise/i, /wave/i, /smile/i, /happy/i],
    soft: [/surprise/i, /bright/i, /sway/i, /bounce/i],
    avoid: [/idle/i, /settle/i, /slow/i, /hesitant/i],
  },
  hesitant: {
    strong: [/hesitant/i, /think/i, /ponder/i, /confus/i, /glance/i, /tilt/i, /pout/i],
    soft: [/idle/i, /settle/i, /observe/i, /soft/i],
    avoid: [/cheer/i, /excited/i, /raise/i],
  },
  teasing: {
    strong: [/tease/i, /playful/i, /smile/i, /sway/i, /glance/i, /pout/i],
    soft: [/cheer/i, /idle/i, /relax/i],
    avoid: [/comfort/i, /soothe/i, /firm/i],
  },
}

const emotionActionProfiles: Partial<Record<AlicizationEmotion, CapabilityTextProfile>> = {
  happy: {
    strong: [/smile/i, /cheer/i, /happy/i, /wave/i],
    soft: [/sway/i, /idle/i],
    avoid: [/glare/i, /sad/i],
  },
  sad: {
    strong: [/gentle/i, /comfort/i, /soft/i, /settle/i],
    soft: [/idle/i, /slow/i],
    avoid: [/cheer/i, /excited/i],
  },
  concerned: {
    strong: [/comfort/i, /reassur/i, /soft/i, /gentle/i],
    soft: [/settle/i, /idle/i],
    avoid: [/cheer/i, /shock/i],
  },
  apologetic: {
    strong: [/soft/i, /gentle/i, /slow/i, /settle/i],
    soft: [/idle/i, /nod/i],
    avoid: [/cheer/i, /raise/i],
  },
  tired: {
    strong: [/relax/i, /idle/i, /settle/i, /slow/i],
    soft: [/gentle/i, /soft/i],
    avoid: [/shock/i, /excited/i],
  },
  thinking: {
    strong: [/think/i, /ponder/i, /observe/i, /focus/i, /inspect/i],
    soft: [/idle/i, /settle/i, /glance/i],
    avoid: [/cheer/i, /shock/i],
  },
  surprised: {
    strong: [/shock/i, /surprise/i, /raise/i],
    soft: [/glance/i, /freeze/i],
    avoid: [/idle/i, /settle/i],
  },
  angry: {
    strong: [/firm/i, /focus/i, /steady/i, /glare/i],
    soft: [/observe/i, /settle/i],
    avoid: [/smile/i, /cheer/i],
  },
}

function normalizeCapabilityText(...segments: Array<string | null | undefined>) {
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

function resolveGenericIdleBoost(key: string) {
  if (/settle|idle|rest|neutral/i.test(key))
    return 0.2
  if (/nod|observe|focus/i.test(key))
    return 0.08
  return 0
}

function scoreActionCapability(
  capability: CharacterActionCapability,
  performance: AlicizationDialoguePerformancePayload,
) {
  const deliveryProfile = deliveryActionProfiles[performance.delivery]
  const emotionProfile = emotionActionProfiles[performance.baseEmotion]
  const text = normalizeCapabilityText(
    capability.key,
    capability.label,
    capability.description,
  )

  const strongMatches = countPatternMatches(text, deliveryProfile.strong)
  const softMatches = countPatternMatches(text, deliveryProfile.soft)
  const avoidMatches = countPatternMatches(text, deliveryProfile.avoid)
  const emotionStrongMatches = emotionProfile ? countPatternMatches(text, emotionProfile.strong) : 0
  const emotionSoftMatches = emotionProfile ? countPatternMatches(text, emotionProfile.soft) : 0
  const emotionAvoidMatches = emotionProfile ? countPatternMatches(text, emotionProfile.avoid) : 0
  const emphasisBias = performance.emphasis * 0.06
  const genericIdleBoost = resolveGenericIdleBoost(capability.key)

  return strongMatches * 0.44
    + softMatches * 0.16
    + emotionStrongMatches * 0.24
    + emotionSoftMatches * 0.08
    + genericIdleBoost
    + emphasisBias
    - avoidMatches * 0.34
    - emotionAvoidMatches * 0.2
}

function hashStableSeed(text: string) {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33 + text.charCodeAt(index)) >>> 0
  }
  return hash
}

function resolveCueWithVariation(input: {
  channel: 'action' | 'facial'
  candidates: string[]
  continuity?: StageEmbodimentPerformanceContinuityState
}) {
  if (input.candidates.length === 0)
    return null

  const uniqueCandidates = [...new Set(input.candidates.map(candidate => candidate.trim()).filter(Boolean))]
  if (uniqueCandidates.length === 0)
    return null

  const previousCue = input.channel === 'action'
    ? input.continuity?.previousActionCue?.trim()
    : input.continuity?.previousFacialCue?.trim()
  const pool = previousCue && uniqueCandidates.length > 1
    ? uniqueCandidates.filter(candidate => candidate !== previousCue)
    : uniqueCandidates
  const resolvedPool = pool.length > 0 ? pool : uniqueCandidates
  const variationToken = input.continuity?.variationToken?.trim() ?? ''
  const seed = hashStableSeed(`${input.channel}:${variationToken}:${uniqueCandidates.join('|')}`)
  return resolvedPool[seed % resolvedPool.length] ?? resolvedPool[0] ?? null
}

function resolveSupportedHintCues(input: {
  preferredCandidates?: Iterable<string>
  supportedKeys: Set<string>
}) {
  if (input.preferredCandidates == null)
    return []

  return [...new Set(
    [...input.preferredCandidates]
      .map(candidate => candidate.trim())
      .filter(candidate => candidate && input.supportedKeys.has(candidate)),
  )]
}

function resolveSupportedActionCue(
  performance: AlicizationDialoguePerformancePayload,
  manifest: CharacterPerformanceCapabilitiesManifest,
  supportedActions: CharacterActionCapability[],
  continuity?: StageEmbodimentPerformanceContinuityState,
) {
  if (performance.actionCue && supportedActions.some(item => item.key === performance.actionCue))
    return performance.actionCue

  const embodimentHint = manifest.embodimentHints?.[performance.baseEmotion]
  const cueCandidates = resolveStageEmbodimentCueCandidates({
    delivery: performance.delivery,
    emotion: performance.baseEmotion,
  })
  const supportedActionKeys = new Set(supportedActions.map(item => item.key))
  const preferredActionCues = resolveSupportedHintCues({
    preferredCandidates: embodimentHint?.preferredActionCues,
    supportedKeys: supportedActionKeys,
  })
  if (preferredActionCues.length > 0) {
    return resolveCueWithVariation({
      channel: 'action',
      candidates: preferredActionCues,
      continuity,
    })
  }

  const directCandidates = cueCandidates.actionCueCandidates.filter(candidate => supportedActionKeys.has(candidate))
  if (directCandidates.length > 0) {
    return resolveCueWithVariation({
      channel: 'action',
      candidates: directCandidates,
      continuity,
    })
  }

  const ranked = supportedActions
    .map(capability => ({
      key: capability.key,
      score: scoreActionCapability(capability, performance),
    }))
    .sort((left, right) => right.score - left.score)

  const best = ranked[0]
  if (!best)
    return null

  const minimumScore = performance.delivery === 'calm' || performance.delivery === 'gentle' ? 0.08 : 0.14
  if (best.score < minimumScore) {
    const fallbackActionCues = ranked
      .slice(0, Math.min(3, ranked.length))
      .map(item => item.key)
    if (
      continuity?.previousActionCue
      && fallbackActionCues.length === 1
      && fallbackActionCues[0] === continuity.previousActionCue
    ) {
      const alternative = ranked.find(item => item.key !== fallbackActionCues[0])
      if (alternative)
        fallbackActionCues.push(alternative.key)
    }

    return resolveCueWithVariation({
      channel: 'action',
      candidates: fallbackActionCues,
      continuity,
    })
  }

  const viableActionCues = ranked
    .filter(item => item.score >= minimumScore && item.score >= best.score - 0.18)
    .map(item => item.key)
  if (
    continuity?.previousActionCue
    && viableActionCues.length === 1
    && viableActionCues[0] === continuity.previousActionCue
  ) {
    const nextBest = ranked.find(item => item.key !== viableActionCues[0] && item.score >= minimumScore)
    if (nextBest)
      viableActionCues.push(nextBest.key)
  }

  return resolveCueWithVariation({
    channel: 'action',
    candidates: viableActionCues.length > 0 ? viableActionCues : [best.key],
    continuity,
  })
}

function resolveSupportedFacialCue(
  performance: AlicizationDialoguePerformancePayload,
  manifest: CharacterPerformanceCapabilitiesManifest,
  supportedFacialCues: CharacterFacialCapability[],
  continuity?: StageEmbodimentPerformanceContinuityState,
) {
  if (performance.facialCue && supportedFacialCues.some(item => item.key === performance.facialCue))
    return performance.facialCue

  const embodimentHint = manifest.embodimentHints?.[performance.baseEmotion]
  const supportedCueKeys = new Set(supportedFacialCues.map(item => item.key))
  const preferredCues = resolveSupportedHintCues({
    preferredCandidates: embodimentHint?.preferredFacialCues,
    supportedKeys: supportedCueKeys,
  })
  if (preferredCues.length > 0) {
    return resolveCueWithVariation({
      channel: 'facial',
      candidates: preferredCues,
      continuity,
    })
  }

  const candidates = resolveStageEmbodimentCueCandidates({
    delivery: performance.delivery,
    emotion: performance.baseEmotion,
  }).facialCueCandidates
  const viableFacialCues: string[] = []

  for (const candidate of candidates) {
    if (supportedCueKeys.has(candidate))
      viableFacialCues.push(candidate)
  }

  return resolveCueWithVariation({
    channel: 'facial',
    candidates: viableFacialCues,
    continuity,
  })
}

export function buildStageEmbodimentPerformancePlan(input: {
  continuity?: StageEmbodimentPerformanceContinuityState
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  performance: AlicizationDialoguePerformancePayload
}) {
  const performance = { ...input.performance } satisfies AlicizationDialoguePerformancePayload

  const manifest = input.manifest
  if (!manifest) {
    return {
      performance,
      plannedFacialCue: performance.facialCue ?? null,
      plannedActionCue: performance.actionCue ?? null,
    }
  }

  const plannedFacialCue = resolveSupportedFacialCue(
    performance,
    manifest,
    manifest.supportedFacialCues,
    input.continuity,
  )
  const plannedActionCue = resolveSupportedActionCue(
    performance,
    manifest,
    manifest.supportedActions,
    input.continuity,
  )

  return {
    performance: {
      ...performance,
      facialCue: plannedFacialCue,
      actionCue: plannedActionCue,
    } satisfies AlicizationDialoguePerformancePayload,
    plannedFacialCue,
    plannedActionCue,
  }
}
