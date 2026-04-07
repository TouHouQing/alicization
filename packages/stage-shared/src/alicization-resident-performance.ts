import type {
  AlicizationEmbodiedPresenceState,
  AlicizationEmotionalTension,
  AlicizationResidentPerformanceSnapshot,
  AlicizationResidentPerformanceSource,
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
  privateThought?: {
    confidence?: number | null
    embodiedPresence?: AlicizationEmbodiedPresenceState | null
    emotionalTension?: AlicizationEmotionalTension | null
    rationaleTags?: readonly string[] | null
    stance?: AlicizationResidentPerformanceSnapshot['stance']
  } | null
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

function resolveEmbodiedPresence(input: AlicizationResidentPerformanceDerivationInput): AlicizationEmbodiedPresenceState {
  return input.privateThought?.embodiedPresence ?? 'none'
}

function resolveResidentConfidence(input: AlicizationResidentPerformanceDerivationInput) {
  return clamp01(Math.max(
    Number(input.privateThought?.confidence ?? 0),
    Number(input.attention?.confidence ?? 0),
    Number(input.currentScene?.confidence ?? 0),
  ))
}

function resolveResidentEmotion(input: AlicizationResidentPerformanceDerivationInput) {
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

  if (watchMode === 'invited-inspection')
    return contentKind === 'error' || contentKind === 'diff' ? 'firm' : 'calm'

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
  const embodiedPresence = resolveEmbodiedPresence(input)
  const watchMode = input.watchMode
  const contentKind = input.currentScene?.contentKind
  const emotionalTension = input.privateThought?.emotionalTension
  const stance = input.privateThought?.stance

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

  return [...new Set([
    'resident-performance',
    sanitizeTokenText(input.watchMode, 48) ? `watch:${sanitizeTokenText(input.watchMode, 48)}` : '',
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
  const performance = normalizeAlicizationPerformancePayload({
    baseEmotion: resolveResidentEmotion(input),
    emotion: resolveResidentEmotion(input),
    delivery: resolveResidentDelivery(input),
    emphasis: resolveResidentEmphasis(input, confidence),
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
