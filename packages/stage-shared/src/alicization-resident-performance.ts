import type {
  AlicizationEmbodiedPresenceState,
  AlicizationEmotionalTension,
  AlicizationLearningAction,
  AlicizationResidentPerformanceSnapshot,
  AlicizationResidentPerformanceSource,
  AlicizationSelfEvolutionKernelSnapshot,
} from './alicization-transport-contracts'

import { normalizeAlicizationPerformancePayload } from './alicization-performance-contracts'

export interface AlicizationResidentPerformanceDerivationInput {
  attention?: {
    confidence?: number | null
    target?: {
      appName?: string | null
      title?: string | null
    } | null
  } | null
  captureState?: {
    degradedReason?: string | null
  } | null
  currentScene?: {
    confidence?: number | null
    contentKind?: string | null
    scenario?: string | null
    summary?: string | null
    workloadKind?: string | null
  } | null
  currentBodyState?: 'sleep' | 'idle' | 'noticing' | 'accompanying' | 'speaking' | 'warning' | 'recovering' | null
  continuityMode?: 'ambient-covision' | 'quiet-accompaniment' | 'active-dialogue' | 'protective-watch' | 'rest-withdrawal' | null
  currentInwardPreoccupation?: string | null
  quietLineMs?: number | null
  privateThought?: {
    shouldSpeak?: boolean | null
    confidence?: number | null
    embodiedPresence?: AlicizationEmbodiedPresenceState | null
    emotionalTension?: AlicizationEmotionalTension | null
    rationaleTags?: readonly string[] | null
    stance?: AlicizationResidentPerformanceSnapshot['stance']
  } | null
  relationshipTimingBias?: {
    relationshipDoctrine?: string | null
    latestInflection?: string | null
    burdenLine?: string | null
    trustMeaning?: string | null
    nextLearningAction?: AlicizationLearningAction | 'hold' | null
    evolutionMomentum?: number | null
    learningReadiness?: number | null
    source?: 'self-evolution' | 'outcome-learning' | 'autobiographical-self' | null
  } | AlicizationSelfEvolutionKernelSnapshot | null
  updatedAt?: number | null
  watchMode?: string | null
}

export interface DeriveAlicizationResidentPerformanceOptions {
  fallbackUpdatedAt?: number
  source?: AlicizationResidentPerformanceSource
}

function clamp01(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function sanitizeTokenText(raw: unknown, maxChars = 96) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function resolveRelationshipTimingBias(input: AlicizationResidentPerformanceDerivationInput) {
  const bias = input.relationshipTimingBias ?? null
  if (!bias || typeof bias !== 'object')
    return null

  const relationshipDoctrine = sanitizeTokenText(
    'relationshipDoctrine' in bias ? bias.relationshipDoctrine : null,
    180,
  ).toLowerCase()
  const latestInflection = sanitizeTokenText(
    'latestInflection' in bias ? bias.latestInflection : null,
    180,
  ).toLowerCase()
  const burdenLine = sanitizeTokenText(
    'burdenLine' in bias ? bias.burdenLine : null,
    180,
  ).toLowerCase()
  const trustMeaning = sanitizeTokenText(
    'trustMeaning' in bias ? bias.trustMeaning : null,
    180,
  ).toLowerCase()

  const doctrineSoftensRoom = includesAny(relationshipDoctrine, [
    'leave more room',
    'more room',
    'space first',
    'space-before',
    'slower return',
    'lower-pressure',
    'less eager',
    'repair should settle before closeness expands',
  ])
  const inflectionSoftensCadence = includesAny(latestInflection, [
    'pressure stayed low',
    'slower return',
    'return stayed slower',
    'lower-pressure',
    'less eager',
    'more room',
  ])
  const burdenSoftensCadence = includesAny(burdenLine, [
    'overloaded',
    'pressure',
    'crowd',
    'interrupt',
    'eager re-entry',
    'do not crowd',
  ])
  const trustSoftensCadence = includesAny(trustMeaning, [
    'lower-pressure',
    'less eager',
    'measured warmth',
    'timing',
    'slower',
    'room',
  ])

  if (!doctrineSoftensRoom && !inflectionSoftensCadence && !burdenSoftensCadence && !trustSoftensCadence)
    return null

  const nextLearningAction = 'nextLearningAction' in bias ? bias.nextLearningAction : null
  const internalizing = nextLearningAction === 'internalize'
  const evolutionMomentum = Number('evolutionMomentum' in bias ? bias.evolutionMomentum : 0)
  const learningReadiness = Number('learningReadiness' in bias ? bias.learningReadiness : 0)
  const weighting = 0.72
    + Math.min(0.18, Math.max(0, evolutionMomentum) * 0.18)
    + Math.min(0.1, Math.max(0, learningReadiness) * 0.1)
  const softening = (
    (doctrineSoftensRoom ? 0.2 : 0)
    + (inflectionSoftensCadence ? 0.18 : 0)
    + (burdenSoftensCadence ? 0.22 : 0)
    + (trustSoftensCadence ? 0.18 : 0)
    + (internalizing ? 0.1 : 0)
  ) * weighting
  const normalizedStrength = clamp01(Math.min(1, softening), 0)
  const explicitSource = sanitizeTokenText('source' in bias ? bias.source : '', 48)
  const inferredSelfEvolution = 'version' in bias
    || nextLearningAction === 'record'
    || nextLearningAction === 'reflect'
    || nextLearningAction === 'verify'
    || nextLearningAction === 'revise'
    || nextLearningAction === 'internalize'
    || Number.isFinite(evolutionMomentum)
    || Number.isFinite(learningReadiness)

  return {
    strength: normalizedStrength,
    source: explicitSource || (inferredSelfEvolution ? 'self-evolution' : 'relationship-timing'),
  }
}

function resolveEmbodiedPresence(input: AlicizationResidentPerformanceDerivationInput): AlicizationEmbodiedPresenceState {
  return input.privateThought?.embodiedPresence ?? 'none'
}

function hasQuietAccompanyingAuthority(input: AlicizationResidentPerformanceDerivationInput) {
  return input.currentBodyState === 'accompanying'
    && input.continuityMode === 'quiet-accompaniment'
    && Number(input.quietLineMs ?? 0) >= 120_000
    && input.privateThought?.shouldSpeak === false
}

function hasProtectiveWatchAuthority(input: AlicizationResidentPerformanceDerivationInput) {
  return input.currentBodyState === 'recovering'
    && input.continuityMode === 'protective-watch'
    && input.privateThought?.shouldSpeak === false
}

function resolveResidentConfidence(input: AlicizationResidentPerformanceDerivationInput) {
  return clamp01(Math.max(
    Number(input.privateThought?.confidence ?? 0),
    Number(input.attention?.confidence ?? 0),
    Number(input.currentScene?.confidence ?? 0),
  ))
}

function resolveResidentEmotion(input: AlicizationResidentPerformanceDerivationInput) {
  if (hasProtectiveWatchAuthority(input))
    return input.privateThought?.emotionalTension === 'late-night-drain' ? 'tired' : 'concerned'

  if (hasQuietAccompanyingAuthority(input))
    return input.privateThought?.emotionalTension === 'soft-covision' ? 'thinking' : 'neutral'

  const embodiedPresence = resolveEmbodiedPresence(input)
  const watchMode = input.watchMode
  const contentKind = input.currentScene?.contentKind
  const emotionalTension = input.privateThought?.emotionalTension
  const stance = input.privateThought?.stance
  const degradedReason = input.captureState?.degradedReason

  if (watchMode === 'recovering' || sanitizeTokenText(degradedReason, 80))
    return emotionalTension === 'late-night-drain' ? 'tired' : 'concerned'

  if (emotionalTension === 'late-night-drain')
    return 'tired'

  if (stance === 'care' || stance === 'warn' || embodiedPresence === 'concerned')
    return 'concerned'

  if (
    watchMode === 'invited-inspection'
    || contentKind === 'error'
    || contentKind === 'diff'
    || contentKind === 'doc'
    || emotionalTension === 'focused-flow'
  ) {
    return 'thinking'
  }

  if (embodiedPresence === 'hesitant' || stance === 'uncertain' || emotionalTension === 'restless-switching')
    return 'thinking'

  return 'neutral'
}

function resolveResidentDelivery(input: AlicizationResidentPerformanceDerivationInput) {
  if (hasProtectiveWatchAuthority(input))
    return 'gentle'

  if (hasQuietAccompanyingAuthority(input))
    return input.privateThought?.emotionalTension === 'soft-covision' ? 'gentle' : 'calm'

  const embodiedPresence = resolveEmbodiedPresence(input)
  const watchMode = input.watchMode
  const contentKind = input.currentScene?.contentKind
  const scenario = input.currentScene?.scenario
  const emotionalTension = input.privateThought?.emotionalTension
  const stance = input.privateThought?.stance
  const degradedReason = input.captureState?.degradedReason

  if (watchMode === 'recovering' || sanitizeTokenText(degradedReason, 80))
    return 'gentle'

  if (stance === 'warn')
    return 'firm'

  const relationshipTimingBias = resolveRelationshipTimingBias(input)
  const relationshipTimingBiasStrength = relationshipTimingBias?.strength ?? 0
  if (watchMode === 'invited-inspection') {
    if (relationshipTimingBiasStrength >= 0.28)
      return contentKind === 'error' ? 'gentle' : 'calm'
    return contentKind === 'error' || contentKind === 'diff' ? 'firm' : 'calm'
  }

  if (emotionalTension === 'late-night-drain')
    return 'gentle'

  if (embodiedPresence === 'concerned' || stance === 'care')
    return contentKind === 'error' ? 'firm' : 'gentle'

  if (embodiedPresence === 'hesitant' || stance === 'uncertain' || emotionalTension === 'restless-switching')
    return 'hesitant'

  if (scenario === 'media' && emotionalTension === 'soft-covision')
    return 'gentle'

  if (contentKind === 'error' || contentKind === 'diff')
    return 'firm'

  return 'calm'
}

function resolveResidentEmphasis(
  input: AlicizationResidentPerformanceDerivationInput,
  confidence: number,
): 0 | 1 | 2 {
  if (hasProtectiveWatchAuthority(input))
    return 1

  if (hasQuietAccompanyingAuthority(input))
    return confidence >= 0.84 ? 1 : 0

  const embodiedPresence = resolveEmbodiedPresence(input)
  const watchMode = input.watchMode
  const contentKind = input.currentScene?.contentKind
  const emotionalTension = input.privateThought?.emotionalTension
  const stance = input.privateThought?.stance
  const relationshipTimingBias = resolveRelationshipTimingBias(input)
  const relationshipTimingBiasStrength = relationshipTimingBias?.strength ?? 0

  if (relationshipTimingBiasStrength >= 0.28 && watchMode === 'invited-inspection')
    return confidence >= 0.78 ? 1 : 0

  if (watchMode === 'recovering' || stance === 'warn')
    return confidence >= 0.42 ? 2 : 1

  if (watchMode === 'invited-inspection')
    return confidence >= 0.72 ? 2 : 1

  if (emotionalTension === 'late-night-drain')
    return confidence >= 0.68 ? 1 : 0

  if (embodiedPresence === 'concerned')
    return confidence >= 0.72 ? 2 : 1

  if (contentKind === 'error' || contentKind === 'diff')
    return confidence >= 0.5 ? 1 : 0

  if (embodiedPresence === 'hesitant')
    return confidence >= 0.68 ? 1 : 0

  if (embodiedPresence === 'attentive')
    return confidence >= 0.76 ? 1 : 0

  return confidence >= 0.84 ? 1 : 0
}

function buildResidentReasonTags(
  input: AlicizationResidentPerformanceDerivationInput,
  embodiedPresence: AlicizationEmbodiedPresenceState,
) {
  const rationaleTags = input.privateThought?.rationaleTags ?? []
  const relationshipTimingBias = resolveRelationshipTimingBias(input)

  return [...new Set([
    'resident-performance',
    relationshipTimingBias ? 'timing:lower-pressure-opening' : '',
    relationshipTimingBias?.source ? `timing-source:${sanitizeTokenText(relationshipTimingBias.source, 48)}` : '',
    sanitizeTokenText(input.watchMode, 48) ? `watch:${sanitizeTokenText(input.watchMode, 48)}` : '',
    sanitizeTokenText(input.currentBodyState, 32) ? `body:${sanitizeTokenText(input.currentBodyState, 32)}` : '',
    sanitizeTokenText(input.continuityMode, 48) ? `continuity:${sanitizeTokenText(input.continuityMode, 48)}` : '',
    sanitizeTokenText(embodiedPresence, 32) ? `presence:${sanitizeTokenText(embodiedPresence, 32)}` : '',
    sanitizeTokenText(input.privateThought?.stance, 32) ? `stance:${sanitizeTokenText(input.privateThought?.stance, 32)}` : '',
    sanitizeTokenText(input.privateThought?.emotionalTension, 48) ? `tension:${sanitizeTokenText(input.privateThought?.emotionalTension, 48)}` : '',
    sanitizeTokenText(input.currentScene?.scenario, 32) ? `scene:${sanitizeTokenText(input.currentScene?.scenario, 32)}` : '',
    sanitizeTokenText(input.currentScene?.contentKind, 32) ? `content:${sanitizeTokenText(input.currentScene?.contentKind, 32)}` : '',
    sanitizeTokenText(input.currentScene?.workloadKind, 32) ? `workload:${sanitizeTokenText(input.currentScene?.workloadKind, 32)}` : '',
    ...rationaleTags
      .map(tag => sanitizeTokenText(tag, 64))
      .filter(Boolean)
      .map(tag => `thought:${tag}`),
  ].filter(Boolean))].slice(0, 8)
}

export function buildAlicizationResidentPerformanceSignature(input: {
  embodiedPresence: AlicizationEmbodiedPresenceState
  performance: AlicizationResidentPerformanceSnapshot['performance']
  source?: string | null
} & AlicizationResidentPerformanceDerivationInput) {
  const scene = input.currentScene
  const thought = input.privateThought
  const attentionTarget = input.attention?.target

  return [
    sanitizeTokenText(input.source, 48) || 'resident',
    sanitizeTokenText(input.watchMode, 48) || 'mnemonic-passive',
    sanitizeTokenText(input.currentBodyState, 32) || 'idle',
    sanitizeTokenText(input.continuityMode, 48) || 'ambient-covision',
    sanitizeTokenText(input.embodiedPresence, 32) || 'none',
    sanitizeTokenText(thought?.stance, 32) || 'observe',
    sanitizeTokenText(thought?.emotionalTension, 48) || 'calm-browse',
    sanitizeTokenText(scene?.scenario, 32) || 'general',
    sanitizeTokenText(scene?.contentKind, 32) || 'unknown',
    sanitizeTokenText(scene?.workloadKind, 32) || 'unknown',
    sanitizeTokenText(scene?.summary, 96)
    || sanitizeTokenText(attentionTarget?.title, 96)
    || sanitizeTokenText(attentionTarget?.appName, 48)
    || 'ambient',
    input.performance.baseEmotion,
    input.performance.delivery,
    String(input.performance.emphasis),
  ].join('|')
}

export function deriveAlicizationResidentPerformanceSnapshot(
  input: AlicizationResidentPerformanceDerivationInput,
  options: DeriveAlicizationResidentPerformanceOptions = {},
): AlicizationResidentPerformanceSnapshot {
  const confidence = resolveResidentConfidence(input)
  const embodiedPresence = resolveEmbodiedPresence(input)
  const baseEmotion = resolveResidentEmotion(input)
  const delivery = resolveResidentDelivery(input)
  const emphasis = resolveResidentEmphasis(input, confidence)
  const quietAccompanying = hasQuietAccompanyingAuthority(input)
  const protectiveWatch = hasProtectiveWatchAuthority(input)
  const performance = normalizeAlicizationPerformancePayload({
    baseEmotion,
    emotion: baseEmotion,
    delivery,
    emphasis,
    facialCue: protectiveWatch
      ? 'soft-gaze'
      : quietAccompanying
        ? 'focus'
        : null,
    actionCue: protectiveWatch
      ? 'comfort_sway'
      : quietAccompanying
        ? 'steady_focus'
        : null,
  })
  const updatedAt = Number.isFinite(input.updatedAt)
    ? Math.max(0, Math.floor(input.updatedAt as number))
    : Number.isFinite(options.fallbackUpdatedAt)
      ? Math.max(0, Math.floor(options.fallbackUpdatedAt as number))
      : Date.now()

  return {
    version: 'resident-performance-v1',
    source: options.source ?? 'main-runtime',
    performance,
    embodiedPresence,
    stance: input.privateThought?.stance ?? null,
    emotionalTension: input.privateThought?.emotionalTension ?? null,
    confidence,
    reasonTags: buildResidentReasonTags(input, embodiedPresence),
    signature: buildAlicizationResidentPerformanceSignature({
      ...input,
      embodiedPresence,
      performance,
      source: options.source ?? 'resident',
    }),
    updatedAt,
  }
}
