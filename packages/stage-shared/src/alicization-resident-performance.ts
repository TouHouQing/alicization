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
  currentConsciousFrame?: {
    reasonTags?: readonly string[] | null
    projectState?: {
      emotionalClosureCue?: string | null
    } | null
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
    '先留白',
    '留一点空间',
    '同一条生命线',
    '慢一点接回去',
    'same-her drift risk',
    'generic assistant shell',
    'project-summary voice',
    'detached status talk',
    'continuity drift',
    'drift rather than completion',
  ])
  const inflectionSoftensCadence = includesAny(latestInflection, [
    'pressure stayed low',
    'slower return',
    'return stayed slower',
    'lower-pressure',
    'less eager',
    'more room',
    '别立刻把温度放大',
    '上次这条线回得太快了',
    '慢一点回来',
  ])
  const burdenSoftensCadence = includesAny(burdenLine, [
    'overloaded',
    'pressure',
    'crowd',
    'interrupt',
    'eager re-entry',
    'do not crowd',
    '不要一下子贴太近',
    '留一点空间',
    '先留白',
  ])
  const trustSoftensCadence = includesAny(trustMeaning, [
    'lower-pressure',
    'less eager',
    'measured warmth',
    'timing',
    'slower',
    'room',
    '先留白',
    '慢一点回来',
    '同一条生命线',
  ])
  const sameHerContinuityCarrySignal = includesAny(
    `${relationshipDoctrine} ${latestInflection} ${burdenLine} ${trustMeaning}`,
    [
      'same-her drift risk',
      'generic assistant shell',
      'project-summary voice',
      'detached status talk',
      'continuity drift',
      'drift rather than completion',
      'same living line',
      'one continuous her',
      'continuous her',
    ],
  )
  const repairBeforeClosenessSignal = includesAny(
    `${relationshipDoctrine} ${latestInflection} ${burdenLine} ${trustMeaning}`,
    [
      'repair-first',
      'repair should settle before closeness expands',
      'repair lands before closeness returns',
      'repair lands first',
      'repair before closeness',
      '先修复再靠近',
      '修复优先',
      '先把身体收稳',
    ],
  )
  const measuredReturnSignal = includesAny(
    `${relationshipDoctrine} ${latestInflection} ${burdenLine} ${trustMeaning}`,
    [
      'measured warmth',
      'return stayed slower',
      'slower return',
      'lower-pressure',
      'less eager',
      'keep more room',
      'more room',
      'do not crowd',
      '先留白',
      '别立刻把温度放大',
      '同一条生命线',
      '慢一点接回去',
      '留一点空间',
      'same-her drift risk',
      'generic assistant shell',
      'project-summary voice',
      'detached status talk',
      'continuity drift',
      'drift rather than completion',
    ],
  )
  const rememberedSeamReinterpretationSignal = includesAny(
    `${relationshipDoctrine} ${latestInflection} ${burdenLine} ${trustMeaning}`,
    [
      'reopened too eagerly',
      'too eagerly before',
      'more room this time',
      'this time keep more room',
      '这次更要留白',
      '这次要更慢一点',
      '不要重开得太快',
      '上次太急',
    ],
  )

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
    + (sameHerContinuityCarrySignal ? 0.34 : 0)
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
  const companionshipRestraint = sameHerContinuityCarrySignal
    ? 'measured-return'
    : normalizedStrength >= 0.45
      ? repairBeforeClosenessSignal
        ? 'repair-before-closeness'
        : measuredReturnSignal || sameHerContinuityCarrySignal
          ? 'measured-return'
          : null
      : null

  return {
    strength: normalizedStrength,
    source: explicitSource || (inferredSelfEvolution ? 'self-evolution' : 'relationship-timing'),
    companionshipRestraint,
    rememberedSeamReinterpretationSignal,
  }
}

function resolveInwardPreoccupationTimingBias(input: AlicizationResidentPerformanceDerivationInput) {
  const inwardPreoccupation = sanitizeTokenText(
    input.currentInwardPreoccupation,
    220,
  ).toLowerCase()
  if (!inwardPreoccupation)
    return null

  const sameThreadSeamSignal = includesAny(inwardPreoccupation, [
    'same remembered seam',
    'remembered seam',
    'same seam',
    'same callback line',
    'callback seam',
    'callback line',
    'same relationship seam',
    'same thread',
    'same living line',
    '同一条生命线',
    '同一条线',
  ])
  const repairBeforeClosenessSignal = includesAny(inwardPreoccupation, [
    'repair settle',
    'repair should settle',
    'repair before closeness',
    'let repair land',
    '先修复再靠近',
    '先把身体收稳',
  ])
  const measuredReturnSignal = includesAny(inwardPreoccupation, [
    'leave more room',
    'more room',
    'slower return',
    'stay slower',
    'lower-pressure',
    'before closeness widens',
    'before warmth widens',
    'without reopening from scratch',
    '先留白',
    '慢一点回来',
    '慢一点接回去',
    '别立刻把温度放大',
    '留一点空间',
  ])
  const rememberedSeamReinterpretationSignal = sameThreadSeamSignal && includesAny(inwardPreoccupation, [
    'leave more room',
    'more room',
    'slower return',
    'stay slower',
    'before closeness widens',
    'before warmth widens',
    'this time',
    '这次',
    '先留白',
    '慢一点',
  ])

  if (!repairBeforeClosenessSignal && !measuredReturnSignal && !rememberedSeamReinterpretationSignal)
    return null

  return {
    strength: clamp01(
      0.34
      + (sameThreadSeamSignal ? 0.12 : 0)
      + (measuredReturnSignal ? 0.16 : 0)
      + (rememberedSeamReinterpretationSignal ? 0.18 : 0)
      + (repairBeforeClosenessSignal ? 0.22 : 0),
      0,
    ),
    source: 'inward-preoccupation',
    companionshipRestraint: repairBeforeClosenessSignal
      ? 'repair-before-closeness' as const
      : 'measured-return' as const,
    rememberedSeamReinterpretationSignal,
  }
}

function resolveAffectiveResidueTimingBias(input: AlicizationResidentPerformanceDerivationInput) {
  const affectiveResidue = input.affectiveResidue ?? null
  const cadence = affectiveResidue?.relationshipCadence ?? null
  if (!affectiveResidue || !cadence)
    return null

  const measuredReturnSignal = affectiveResidue.dominantResidueKind === 'afterglow'
    || affectiveResidue.dominantResidueKind === 'repair'
    || cadence.cadenceMode === 'measured-return'
    || cadence.cadenceMode === 'cooldown'
  const repairBeforeClosenessSignal = affectiveResidue.dominantResidueKind === 'repair'
    && (cadence.repairRecovery ?? 0) >= 0.5
  const protectRestSignal = affectiveResidue.dominantResidueKind === 'rest-protective'
    || cadence.shouldProtectRest === true

  if (!measuredReturnSignal && !repairBeforeClosenessSignal && !protectRestSignal)
    return null

  const strength = clamp01(
    (measuredReturnSignal ? 0.24 : 0)
    + ((cadence.afterglowCarry ?? 0) * 0.26)
    + ((cadence.fatigueGuard ?? 0) * 0.18)
    + ((cadence.overreachRisk ?? 0) * 0.18)
    + (cadence.shouldDelayWarmth ? 0.16 : 0)
    + (cadence.shouldProtectRest ? 0.2 : 0)
    + ((affectiveResidue.restProtectivePressure ?? 0) * 0.22)
    + ((affectiveResidue.afterglowPressure ?? 0) * 0.16)
    + ((affectiveResidue.repairPressure ?? 0) * 0.14),
    0,
  )

  const companionshipRestraint = protectRestSignal || repairBeforeClosenessSignal
    ? 'repair-before-closeness'
    : measuredReturnSignal
      ? 'measured-return'
      : null

  if (!companionshipRestraint || strength < 0.28)
    return null

  return {
    strength,
    source: 'affective-residue' as const,
    companionshipRestraint,
  }
}

function resolveRuntimeContinuityArcTimingBias(input: AlicizationResidentPerformanceDerivationInput) {
  const reasonTags = (input.currentConsciousFrame?.reasonTags ?? [])
    .map(tag => sanitizeTokenText(tag, 64).toLowerCase())
    .filter(Boolean)

  if (reasonTags.includes('continuity-arc:same-thread-continuation')) {
    return {
      strength: 0.54,
      source: 'runtime-continuity-arc' as const,
      companionshipRestraint: 'measured-return' as const,
    }
  }

  if (reasonTags.includes('continuity-arc:hold-for-opening')) {
    return {
      strength: 0.54,
      source: 'runtime-continuity-arc' as const,
      companionshipRestraint: 'measured-return' as const,
    }
  }

  if (reasonTags.includes('continuity-arc:gentle-reopen')) {
    return {
      strength: 0.42,
      source: 'runtime-continuity-arc' as const,
      companionshipRestraint: 'measured-return' as const,
    }
  }

  return null
}

function resolveProjectEmotionalClosureTimingBias(input: AlicizationResidentPerformanceDerivationInput) {
  const emotionalClosureCue = sanitizeTokenText(
    input.currentConsciousFrame?.projectState?.emotionalClosureCue,
    220,
  ).toLowerCase()

  if (!emotionalClosureCue)
    return null

  const repairBeforeClosenessSignal = includesAny(emotionalClosureCue, [
    'repair-before-closeness',
    'repair before closeness',
    'repair should settle before closeness expands',
    'repair lands before closeness returns',
    'repair lands first',
    'rest-protective',
    '先修复再靠近',
    '修复优先',
    '先把身体收稳',
  ])
  const measuredReturnSignal = includesAny(emotionalClosureCue, [
    'low-pressure',
    'lower-pressure',
    'leave more room',
    'more room',
    'measured-return',
    'without reopening from scratch',
    'same living line',
    'return stayed slower',
    'slower return',
    '先留白',
    '同一条生命线',
    '别立刻把温度放大',
    '不要从头重开',
    '慢一点回来',
  ])

  if (!repairBeforeClosenessSignal && !measuredReturnSignal)
    return null

  const strength = clamp01(
    0.36
    + (repairBeforeClosenessSignal ? 0.24 : 0)
    + (measuredReturnSignal ? 0.18 : 0),
    0,
  )

  return {
    strength,
    source: 'project-emotional-closure' as const,
    companionshipRestraint: repairBeforeClosenessSignal
      ? 'repair-before-closeness' as const
      : 'measured-return' as const,
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

function resolveResidentAuthorityTimingBias(input: AlicizationResidentPerformanceDerivationInput) {
  if (hasProtectiveWatchAuthority(input)) {
    return {
      strength: 0.52,
      source: 'resident-authority' as const,
      companionshipRestraint: 'repair-before-closeness' as const,
    }
  }

  if (hasQuietAccompanyingAuthority(input)) {
    return {
      strength: 0.48,
      source: 'resident-authority' as const,
      companionshipRestraint: 'measured-return' as const,
    }
  }

  return null
}

function resolveResidentConfidence(input: AlicizationResidentPerformanceDerivationInput) {
  return clamp01(Math.max(
    Number(input.privateThought?.confidence ?? 0),
    Number(input.attention?.confidence ?? 0),
    Number(input.currentScene?.confidence ?? 0),
  ))
}

function resolveMeasuredReturnToneAuthority(input: AlicizationResidentPerformanceDerivationInput) {
  const residentAuthorityTimingBias = resolveResidentAuthorityTimingBias(input)
  const affectiveResidueTimingBias = resolveAffectiveResidueTimingBias(input)
  const relationshipTimingBias = resolveRelationshipTimingBias(input)
  const inwardPreoccupationTimingBias = resolveInwardPreoccupationTimingBias(input)
  const runtimeContinuityArcTimingBias = resolveRuntimeContinuityArcTimingBias(input)
  const projectEmotionalClosureTimingBias = resolveProjectEmotionalClosureTimingBias(input)
  const rationaleTags = input.privateThought?.rationaleTags ?? []

  const hasMeasuredReturnTag = rationaleTags.includes('measured-return')
    || residentAuthorityTimingBias?.companionshipRestraint === 'measured-return'
    || affectiveResidueTimingBias?.companionshipRestraint === 'measured-return'
    || relationshipTimingBias?.companionshipRestraint === 'measured-return'
    || inwardPreoccupationTimingBias?.companionshipRestraint === 'measured-return'
    || runtimeContinuityArcTimingBias?.companionshipRestraint === 'measured-return'
    || projectEmotionalClosureTimingBias?.companionshipRestraint === 'measured-return'

  return hasMeasuredReturnTag
    ? {
        shouldSoftenTone: true,
        affectiveResidueTimingStrength: Math.max(
          affectiveResidueTimingBias?.strength ?? 0,
          projectEmotionalClosureTimingBias?.strength ?? 0,
        ),
      }
    : {
        shouldSoftenTone: false,
        affectiveResidueTimingStrength: 0,
      }
}

function resolveResidentEmotion(input: AlicizationResidentPerformanceDerivationInput) {
  if (hasProtectiveWatchAuthority(input))
    return input.privateThought?.emotionalTension === 'late-night-drain' ? 'tired' : 'concerned'

  if (hasQuietAccompanyingAuthority(input)) {
    const measuredReturnToneAuthority = resolveMeasuredReturnToneAuthority(input)
    const residentAuthorityTimingBias = resolveResidentAuthorityTimingBias(input)
    return input.privateThought?.emotionalTension === 'soft-covision' || measuredReturnToneAuthority.shouldSoftenTone
      ? residentAuthorityTimingBias?.companionshipRestraint === 'repair-before-closeness'
        ? 'concerned'
        : 'thinking'
      : 'neutral'
  }

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

  if (hasQuietAccompanyingAuthority(input)) {
    const measuredReturnToneAuthority = resolveMeasuredReturnToneAuthority(input)
    const residentAuthorityTimingBias = resolveResidentAuthorityTimingBias(input)
    return input.privateThought?.emotionalTension === 'soft-covision' || measuredReturnToneAuthority.shouldSoftenTone
      ? residentAuthorityTimingBias?.companionshipRestraint === 'repair-before-closeness'
        ? 'gentle'
        : 'gentle'
      : 'calm'
  }

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
  const affectiveResidueTimingBias = resolveAffectiveResidueTimingBias(input)
  const affectiveResidueTimingStrength = affectiveResidueTimingBias?.strength ?? 0
  const projectEmotionalClosureTimingBias = resolveProjectEmotionalClosureTimingBias(input)
  const projectEmotionalClosureTimingStrength = projectEmotionalClosureTimingBias?.strength ?? 0
  if (affectiveResidueTimingStrength >= 0.28)
    return 'gentle'
  if (projectEmotionalClosureTimingStrength >= 0.28)
    return 'gentle'
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
  const affectiveResidueTimingBias = resolveAffectiveResidueTimingBias(input)
  const affectiveResidueTimingStrength = affectiveResidueTimingBias?.strength ?? 0
  const projectEmotionalClosureTimingBias = resolveProjectEmotionalClosureTimingBias(input)
  const projectEmotionalClosureTimingStrength = projectEmotionalClosureTimingBias?.strength ?? 0

  if (hasProtectiveWatchAuthority(input))
    return 1

  if (hasQuietAccompanyingAuthority(input)) {
    const measuredReturnToneAuthority = resolveMeasuredReturnToneAuthority(input)
    const residentAuthorityTimingBias = resolveResidentAuthorityTimingBias(input)
    return affectiveResidueTimingStrength >= 0.28 || measuredReturnToneAuthority.shouldSoftenTone || confidence >= 0.84 || residentAuthorityTimingBias?.companionshipRestraint === 'repair-before-closeness' ? 1 : 0
  }

  const embodiedPresence = resolveEmbodiedPresence(input)
  const watchMode = input.watchMode
  const contentKind = input.currentScene?.contentKind
  const emotionalTension = input.privateThought?.emotionalTension
  const stance = input.privateThought?.stance
  const relationshipTimingBias = resolveRelationshipTimingBias(input)
  const relationshipTimingBiasStrength = relationshipTimingBias?.strength ?? 0

  if (affectiveResidueTimingStrength >= 0.28)
    return confidence >= 0.72 ? 1 : 0

  if (projectEmotionalClosureTimingStrength >= 0.28)
    return confidence >= 0.72 ? 1 : 0

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
  const consciousFrameReasonTags = input.currentConsciousFrame?.reasonTags ?? []
  const relationshipTimingBias = resolveRelationshipTimingBias(input)
  const inwardPreoccupationTimingBias = resolveInwardPreoccupationTimingBias(input)
  const affectiveResidueTimingBias = resolveAffectiveResidueTimingBias(input)
  const runtimeContinuityArcTimingBias = resolveRuntimeContinuityArcTimingBias(input)
  const projectEmotionalClosureTimingBias = resolveProjectEmotionalClosureTimingBias(input)
  const residentAuthorityTimingBias = resolveResidentAuthorityTimingBias(input)
  const continuityHoldTags = rationaleTags
    .map(tag => sanitizeTokenText(tag, 64))
    .filter(tag =>
      tag === 'measured-return'
      || tag === 'repair-before-closeness'
      || tag === 'rest-protective'
      || tag === 'quiet-companionship',
    )
  const sameHerInwardCarry = rationaleTags
    .map(tag => sanitizeTokenText(tag, 64))
    .includes('same-her-inward-carry')
  const derivedContinuityRestraintTag = relationshipTimingBias?.companionshipRestraint
    ?? inwardPreoccupationTimingBias?.companionshipRestraint
    ?? affectiveResidueTimingBias?.companionshipRestraint
    ?? runtimeContinuityArcTimingBias?.companionshipRestraint
    ?? projectEmotionalClosureTimingBias?.companionshipRestraint
    ?? residentAuthorityTimingBias?.companionshipRestraint
    ?? null
  const durableProjectClosureRepairBeforeCloseness = projectEmotionalClosureTimingBias?.companionshipRestraint === 'repair-before-closeness'

  return [...new Set([
    'resident-performance',
    sameHerInwardCarry ? 'same-her-inward-carry' : '',
    ...continuityHoldTags,
    derivedContinuityRestraintTag ?? '',
    durableProjectClosureRepairBeforeCloseness ? 'durable-relationship-rhythm' : '',
    ...consciousFrameReasonTags
      .map(tag => sanitizeTokenText(tag, 64))
      .filter(Boolean)
      .map(tag => `frame:${tag}`),
    relationshipTimingBias || inwardPreoccupationTimingBias ? 'timing:lower-pressure-opening' : '',
    relationshipTimingBias?.rememberedSeamReinterpretationSignal || inwardPreoccupationTimingBias?.rememberedSeamReinterpretationSignal ? 'timing:remembered-seam-more-room' : '',
    relationshipTimingBias?.source ? `timing-source:${sanitizeTokenText(relationshipTimingBias.source, 48)}` : '',
    inwardPreoccupationTimingBias?.source ? `timing-source:${sanitizeTokenText(inwardPreoccupationTimingBias.source, 48)}` : '',
    affectiveResidueTimingBias ? 'timing:affective-residue' : '',
    affectiveResidueTimingBias?.source ? `timing-source:${sanitizeTokenText(affectiveResidueTimingBias.source, 48)}` : '',
    runtimeContinuityArcTimingBias ? 'timing:runtime-continuity-arc' : '',
    runtimeContinuityArcTimingBias?.source ? `timing-source:${sanitizeTokenText(runtimeContinuityArcTimingBias.source, 48)}` : '',
    projectEmotionalClosureTimingBias ? 'timing:project-emotional-closure' : '',
    projectEmotionalClosureTimingBias?.source ? `timing-source:${sanitizeTokenText(projectEmotionalClosureTimingBias.source, 48)}` : '',
    residentAuthorityTimingBias ? 'timing:resident-authority' : '',
    residentAuthorityTimingBias?.source ? `timing-source:${sanitizeTokenText(residentAuthorityTimingBias.source, 48)}` : '',
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
  ].filter(Boolean))]
    .filter((tag, _index, tags) => tag !== 'thought:same-her-inward-carry' || tags.includes('same-her-inward-carry') === false)
    // Keep enough room for embodiment/body continuity tags even when multiple timing authorities are active.
    .slice(0, 16)
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
  const relationshipTimingBias = resolveRelationshipTimingBias(input)
  const inwardPreoccupationTimingBias = resolveInwardPreoccupationTimingBias(input)
  const affectiveResidueTimingBias = resolveAffectiveResidueTimingBias(input)
  const runtimeContinuityArcTimingBias = resolveRuntimeContinuityArcTimingBias(input)
  const projectEmotionalClosureTimingBias = resolveProjectEmotionalClosureTimingBias(input)
  const residentAuthorityTimingBias = resolveResidentAuthorityTimingBias(input)
  const companionshipRestraint = relationshipTimingBias?.companionshipRestraint
    ?? inwardPreoccupationTimingBias?.companionshipRestraint
    ?? affectiveResidueTimingBias?.companionshipRestraint
    ?? runtimeContinuityArcTimingBias?.companionshipRestraint
    ?? projectEmotionalClosureTimingBias?.companionshipRestraint
    ?? residentAuthorityTimingBias?.companionshipRestraint
    ?? null
  const rememberedSeamReinterpretationSignal = relationshipTimingBias?.rememberedSeamReinterpretationSignal
    || inwardPreoccupationTimingBias?.rememberedSeamReinterpretationSignal
    || false
  const quietAccompanying = hasQuietAccompanyingAuthority(input)
  const protectiveWatch = hasProtectiveWatchAuthority(input)
  const measuredReturnToneAuthority = resolveMeasuredReturnToneAuthority(input)
  const performance = normalizeAlicizationPerformancePayload({
    baseEmotion,
    emotion: baseEmotion,
    delivery,
    emphasis,
    facialCue: protectiveWatch
      ? 'soft-gaze'
      : quietAccompanying
        ? measuredReturnToneAuthority.shouldSoftenTone
          ? rememberedSeamReinterpretationSignal
            ? 'half-lid'
            : 'soft-gaze'
          : 'focus'
        : null,
    actionCue: protectiveWatch
      ? 'comfort_sway'
      : quietAccompanying
        ? measuredReturnToneAuthority.shouldSoftenTone
          ? rememberedSeamReinterpretationSignal
            ? 'idle_settle'
            : 'observe_focus'
          : 'steady_focus'
        : null,
    residentMode: companionshipRestraint,
    face: companionshipRestraint
      ? {
          residentMode: companionshipRestraint,
        }
      : undefined,
    action: companionshipRestraint
      ? {
          residentMode: companionshipRestraint,
        }
      : undefined,
  })
  if (
    performance.actionCue === 'idle_settle'
    && (relationshipTimingBias?.companionshipRestraint ?? inwardPreoccupationTimingBias?.companionshipRestraint) === 'repair-before-closeness'
  ) {
    performance.actionCue = 'idle_gentle_nod'
  }
  if (
    performance.facialCue === 'focus'
    && performance.delivery === 'gentle'
    && (performance.baseEmotion === 'thinking' || performance.baseEmotion === 'concerned' || performance.baseEmotion === 'tired')
    && (relationshipTimingBias?.companionshipRestraint ?? inwardPreoccupationTimingBias?.companionshipRestraint) === 'measured-return'
  ) {
    performance.facialCue = 'soft-gaze'
  }
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
