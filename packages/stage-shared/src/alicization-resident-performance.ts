import type {
  AlicizationAffectiveResidueMemorySnapshot,
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
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  updatedAt?: number | null
  watchMode?: string | null
}

export interface DeriveAlicizationResidentPerformanceOptions {
  fallbackUpdatedAt?: number
  source?: AlicizationResidentPerformanceSource
}

interface StructuredAffectiveBias {
  dominantKind: AlicizationAffectiveResidueMemorySnapshot['dominantResidueKind']
  shouldRecover: boolean
  shouldSoften: boolean
  strength: number
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

function resolveStructuredAffectiveBias(
  input: AlicizationResidentPerformanceDerivationInput,
): StructuredAffectiveBias | null {
  const residue = input.affectiveResidue
  const cadence = residue?.relationshipCadence
  if (!residue || !cadence)
    return null

  const repairPressure = clamp01(Number(residue.repairPressure ?? 0))
  const restPressure = clamp01(Number(residue.restProtectivePressure ?? 0))
  const burdenPressure = clamp01(Number(residue.burdenPressure ?? 0))
  const afterglowPressure = clamp01(Number(residue.afterglowPressure ?? 0))
  const fatigueGuard = clamp01(Number(cadence.fatigueGuard ?? 0))
  const overreachRisk = clamp01(Number(cadence.overreachRisk ?? 0))
  const repairRecovery = clamp01(Number(cadence.repairRecovery ?? 0))
  const shouldRecover = cadence.shouldProtectRest === true
    || residue.dominantResidueKind === 'rest-protective'
    || (residue.dominantResidueKind === 'repair' && repairRecovery >= 0.5)
  const shouldSoften = shouldRecover
    || cadence.shouldDelayWarmth === true
    || repairPressure >= 0.42
    || restPressure >= 0.42
    || burdenPressure >= 0.56
    || afterglowPressure >= 0.56
  const strength = clamp01(Math.max(
    repairPressure,
    restPressure,
    burdenPressure,
    afterglowPressure * 0.8,
    fatigueGuard,
    overreachRisk,
    repairRecovery * 0.8,
  ))

  if (!shouldSoften || strength < 0.28)
    return null

  return {
    dominantKind: residue.dominantResidueKind,
    shouldRecover,
    shouldSoften,
    strength,
  }
}

function resolveResidentConfidence(input: AlicizationResidentPerformanceDerivationInput) {
  return clamp01(Math.max(
    Number(input.privateThought?.confidence ?? 0),
    Number(input.attention?.confidence ?? 0),
    Number(input.currentScene?.confidence ?? 0),
  ))
}

function resolveResidentMode(input: AlicizationResidentPerformanceDerivationInput) {
  if (hasProtectiveWatchAuthority(input))
    return 'idle-recovering' as const
  if (hasQuietAccompanyingAuthority(input))
    return 'quiet-accompaniment' as const
  if (input.currentBodyState === 'speaking' || input.continuityMode === 'active-dialogue')
    return 'dialogue' as const
  return null
}

function resolveResidentEmotion(input: AlicizationResidentPerformanceDerivationInput) {
  const emotionalTension = input.privateThought?.emotionalTension
  const stance = input.privateThought?.stance
  const embodiedPresence = resolveEmbodiedPresence(input)

  if (hasProtectiveWatchAuthority(input))
    return emotionalTension === 'late-night-drain' ? 'tired' : 'concerned'

  if (hasQuietAccompanyingAuthority(input)) {
    if (emotionalTension === 'late-night-drain')
      return 'tired'
    if (stance === 'care' || stance === 'warn' || embodiedPresence === 'concerned')
      return 'concerned'
    return 'thinking'
  }

  const watchMode = input.watchMode
  const contentKind = input.currentScene?.contentKind
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

  const affectiveBias = resolveStructuredAffectiveBias(input)
  if (hasQuietAccompanyingAuthority(input))
    return input.privateThought?.emotionalTension === 'soft-covision' || affectiveBias?.shouldSoften ? 'gentle' : 'calm'

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
  if (affectiveBias?.shouldSoften)
    return 'gentle'
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
  if (hasProtectiveWatchAuthority(input))
    return 1

  const affectiveBias = resolveStructuredAffectiveBias(input)
  if (hasQuietAccompanyingAuthority(input))
    return affectiveBias?.shouldSoften || confidence >= 0.84 ? 1 : 0

  const embodiedPresence = resolveEmbodiedPresence(input)
  const watchMode = input.watchMode
  const contentKind = input.currentScene?.contentKind
  const emotionalTension = input.privateThought?.emotionalTension
  const stance = input.privateThought?.stance

  if (affectiveBias?.shouldSoften)
    return confidence >= 0.72 ? 1 : 0
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
  const affectiveBias = resolveStructuredAffectiveBias(input)

  return [...new Set([
    'resident-performance',
    affectiveBias?.dominantKind ? `affect:${sanitizeTokenText(affectiveBias.dominantKind, 32)}` : '',
    affectiveBias?.shouldRecover ? 'affect:recovery' : '',
    affectiveBias?.shouldSoften ? 'affect:softened' : '',
    sanitizeTokenText(input.watchMode, 48) ? `watch:${sanitizeTokenText(input.watchMode, 48)}` : '',
    sanitizeTokenText(input.currentBodyState, 32) ? `body:${sanitizeTokenText(input.currentBodyState, 32)}` : '',
    sanitizeTokenText(input.continuityMode, 48) ? `continuity:${sanitizeTokenText(input.continuityMode, 48)}` : '',
    sanitizeTokenText(embodiedPresence, 32) ? `presence:${sanitizeTokenText(embodiedPresence, 32)}` : '',
    sanitizeTokenText(input.privateThought?.stance, 32) ? `stance:${sanitizeTokenText(input.privateThought?.stance, 32)}` : '',
    sanitizeTokenText(input.privateThought?.emotionalTension, 48) ? `tension:${sanitizeTokenText(input.privateThought?.emotionalTension, 48)}` : '',
    sanitizeTokenText(input.currentScene?.scenario, 32) ? `scene:${sanitizeTokenText(input.currentScene?.scenario, 32)}` : '',
    sanitizeTokenText(input.currentScene?.contentKind, 32) ? `content:${sanitizeTokenText(input.currentScene?.contentKind, 32)}` : '',
    sanitizeTokenText(input.currentScene?.workloadKind, 32) ? `workload:${sanitizeTokenText(input.currentScene?.workloadKind, 32)}` : '',
  ].filter(Boolean))].slice(0, 16)
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
  const residentMode = resolveResidentMode(input)
  const quietAccompanying = hasQuietAccompanyingAuthority(input)
  const protectiveWatch = hasProtectiveWatchAuthority(input)
  const affectiveBias = resolveStructuredAffectiveBias(input)
  const quietNeedsRecovery = quietAccompanying
    && (affectiveBias?.shouldRecover || input.privateThought?.emotionalTension === 'late-night-drain')
  const quietNeedsSoftening = quietAccompanying
    && (quietNeedsRecovery || affectiveBias?.shouldSoften || input.privateThought?.emotionalTension === 'soft-covision')
  const performance = normalizeAlicizationPerformancePayload({
    baseEmotion,
    emotion: baseEmotion,
    delivery,
    emphasis,
    facialCue: protectiveWatch
      ? 'soft-gaze'
      : quietAccompanying
        ? quietNeedsSoftening ? 'soft-gaze' : 'focus'
        : null,
    actionCue: protectiveWatch
      ? 'comfort_sway'
      : quietAccompanying
        ? quietNeedsRecovery ? 'idle_settle' : quietNeedsSoftening ? 'observe_focus' : 'steady_focus'
        : null,
    residentMode,
    face: residentMode
      ? {
          residentMode,
        }
      : undefined,
    action: residentMode
      ? {
          residentMode,
        }
      : undefined,
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
