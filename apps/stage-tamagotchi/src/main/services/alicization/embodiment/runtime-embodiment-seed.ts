import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationResidentPerformanceSnapshot,
} from '@proj-alicization/stage-shared'

import type { AlicizationCurrentConsciousFrameSnapshot } from '../../../../shared/eventa'

import {
  createIdleStageEmbodimentMotorState,
  isAlicizationThinProjectAwarenessLine,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationPerformancePayload,
  normalizeStageEmbodimentMotorState,
  resolveAlicizationProjectPreDialogueAwarenessLine,
} from '@proj-alicization/stage-shared'

export interface AlicizationRuntimeEmbodimentSeed {
  decisionTraceId?: string | null
  turnId: string
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  silentContinuity?: AlicizationRuntimeEmbodimentSilentContinuity | null
}

export interface AlicizationRuntimeEmbodimentSilentContinuity {
  mode: 'measured-return' | 'repair-before-closeness' | 'rest-protective'
  source: 'subconscious-presence-hold'
  preferredPresence: 'attentive' | 'hesitant' | 'concerned'
  openingGuidance: string | null
  manifestationCadenceSummary: string | null
  inwardLine: string | null
  emotionalClosureCue?: string | null
  landedProgressLine?: string | null
  embodimentRecallStrength?: 'lightly-noticed' | 'strongly-moved' | 'cautious-avoidance' | null
  embodimentModalityRisk?: 'low' | 'medium' | 'high' | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  preferredVoiceMode?: 'lower-pressure' | 'even' | null
  preferredPauseMode?: 'longer' | 'natural' | null
  preferredLipsyncMode?: 'restrained' | 'matched' | null
  preferredPacingMode?: 'slower' | 'natural' | null
  reasonTags: string[]
}

export interface BuildAlicizationRuntimeEmbodimentSeedInput {
  decisionTraceId?: string | null
  turnId: string
  reply: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
}

interface AlicizationRuntimeEmbodimentProjectState {
  identity?: unknown
  currentPhase?: unknown
  emotionalClosureCue?: unknown
  emotionalClosureSummary?: unknown
  openClosureSummary?: unknown
  primaryOpenLoop?: unknown
  landedProgressSummary?: unknown
  preDialogueAwarenessLine?: unknown
  awarenessLine?: unknown
  companionHeadlineLine?: unknown
  nextClosureTarget?: unknown
  latestLandedProgress?: unknown
  sameHerSelfLine?: unknown
  sameHerHoldDetail?: unknown
  continuityCue?: unknown
}

function normalizeSeedText(raw: string, maxChars: number) {
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeSeedDecisionTraceId(raw: string | null | undefined) {
  if (typeof raw !== 'string')
    return null

  const normalized = normalizeSeedText(raw, 120)
  return normalized || null
}

function sanitizeOptionalSeedText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return null
  const normalized = normalizeSeedText(raw, maxChars)
  return normalized || null
}

function looksLikeThinSeedClosureCarry(text: string | null | undefined) {
  const normalized = sanitizeOptionalSeedText(text, 320)?.toLowerCase()
  if (!normalized)
    return true

  return /generic shell continuity cue|generic continuity cue|placeholder/u.test(normalized)
}

function choosePreferredSeedClosureCarry(candidates: Array<unknown>, maxChars: number) {
  const normalizedCandidates = candidates
    .map(candidate => sanitizeOptionalSeedText(candidate, maxChars))
    .filter((candidate): candidate is string => Boolean(candidate))

  return normalizedCandidates.reduce<string | null>((best, current) => {
    if (!best)
      return current

    const bestIsThin = looksLikeThinSeedClosureCarry(best)
    const currentIsThin = looksLikeThinSeedClosureCarry(current)
    if (bestIsThin !== currentIsThin)
      return currentIsThin ? best : current

    if (current.startsWith(best) && current.length >= best.length + 24)
      return current
    if (best.startsWith(current) && best.length >= current.length + 24)
      return best

    return best
  }, null)
}

function choosePreferredSeedClosureCarryWithFallback(input: {
  runtimeCandidates: Array<unknown>
  consciousCandidates?: Array<unknown>
  maxChars: number
}) {
  const runtimeValue = choosePreferredSeedClosureCarry(input.runtimeCandidates, input.maxChars)
  if (runtimeValue && !looksLikeThinSeedClosureCarry(runtimeValue))
    return runtimeValue

  const consciousValue = choosePreferredSeedClosureCarry(input.consciousCandidates ?? [], input.maxChars)
  return consciousValue ?? runtimeValue
}

function normalizeRuntimeEmbodimentSeedMotor(raw: unknown): AlicizationDigitalLifeEnvelope['motor'] {
  const fallbackMotor = createIdleStageEmbodimentMotorState()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return fallbackMotor

  const candidate = raw as Record<string, unknown>
  const alreadyCanonical
    = candidate.gaze && typeof candidate.gaze === 'object'
      && candidate.head && typeof candidate.head === 'object'
      && candidate.breath && typeof candidate.breath === 'object'
      && candidate.facial && typeof candidate.facial === 'object'
      && candidate.body && typeof candidate.body === 'object'

  if (alreadyCanonical)
    return normalizeStageEmbodimentMotorState(candidate, fallbackMotor)

  return normalizeStageEmbodimentMotorState({
    stillness: candidate.stillness,
    expressivity: candidate.expressivity,
    gaze: {
      focus: candidate.gazeFocus,
      stability: candidate.gazeStability,
      azimuth: candidate.gazeAzimuth,
      elevation: candidate.gazeElevation,
    },
    head: {
      yaw: candidate.headYaw,
      pitch: candidate.headPitch,
      roll: candidate.headRoll,
      nod: candidate.headNod,
    },
    breath: {
      amplitude: candidate.breathAmplitude,
      pace: candidate.breathPace,
    },
    facial: {
      eyeOpenness: candidate.eyeOpenness,
      browLift: candidate.browLift,
      browTension: candidate.browTension,
      cheekLift: candidate.cheekLift,
      mouthSpread: candidate.mouthSpread,
      mouthRound: candidate.mouthRound,
      jawOpenBias: candidate.jawOpenBias,
    },
    body: {
      sway: candidate.bodySway,
      lean: candidate.bodyLean,
      openness: candidate.bodyOpenness,
      settle: candidate.bodySettle,
    },
  }, fallbackMotor)
}

function normalizeRuntimeEmbodimentSeedDigitalLife(
  raw: AlicizationDigitalLifeEnvelope,
  fallbackEmotion: AlicizationDialoguePerformancePayload['baseEmotion'],
): AlicizationDigitalLifeEnvelope {
  const normalized = normalizeAlicizationDigitalLifeEnvelope(raw, fallbackEmotion)
  if (normalized)
    return normalized

  return {
    ...raw,
    motor: normalizeRuntimeEmbodimentSeedMotor(raw.motor),
    frames: Array.isArray(raw.frames)
      ? raw.frames.map(frame => ({
          ...frame,
          motor: normalizeRuntimeEmbodimentSeedMotor(frame.motor),
        }))
      : raw.frames,
  }
}

function normalizeSeedReasonTags(tags: readonly unknown[] | null | undefined) {
  return Array.from(new Set(
    (Array.isArray(tags) ? tags : [])
      .filter((tag): tag is string => typeof tag === 'string')
      .map(tag => normalizeSeedText(tag, 96))
      .filter(Boolean),
  )).slice(0, 12)
}

function includesAnyNormalizedSeedText(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function deriveSilentContinuityEmbodimentCarry(input: {
  memorySummary: string | null
  openingGuidance: string | null
  manifestationCadenceSummary: string | null
  emotionalClosureCue: string | null
  primaryOpenLoop: string | null
  nextClosureTarget: string | null
  sameHerHoldDetail: string | null
}) {
  const combined = [
    input.memorySummary,
    input.openingGuidance,
    input.manifestationCadenceSummary,
    input.emotionalClosureCue,
    input.primaryOpenLoop,
    input.nextClosureTarget,
    input.sameHerHoldDetail,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const embodimentRecallStrength
    = /embodiment_recall_strength=strongly-moved|strongly-moved/u.test(combined)
      ? 'strongly-moved' as const
      : /embodiment_recall_strength=cautious-avoidance|cautious-avoidance/u.test(combined)
        ? 'cautious-avoidance' as const
        : /embodiment_recall_strength=lightly-noticed|lightly-noticed/u.test(combined)
          ? 'lightly-noticed' as const
          : null
  const embodimentModalityRisk
    = /embodiment_modality_risk=high|modality risk high/u.test(combined)
      ? 'high' as const
      : /embodiment_modality_risk=medium|modality risk medium/u.test(combined)
        ? 'medium' as const
        : /embodiment_modality_risk=low|modality risk low/u.test(combined)
          ? 'low' as const
          : null
  const preferredBlinkCadence
    = /embodiment_blink=quiet|blink=quiet/u.test(combined)
      ? 'quiet' as const
      : /embodiment_blink=slower|blink=slower|slower blink|blink slower/u.test(combined)
        ? 'linger' as const
        : /embodiment_blink=natural|blink=natural/u.test(combined)
          ? 'normal' as const
          : null
  const preferredGazeMode
    = /embodiment_gaze=stable|gaze stable|stable gaze|steadier gaze|keep gaze stable|gaze steadier|视线更稳|眼神更稳|目光更稳/u.test(combined)
      ? 'steady' as const
      : /embodiment_gaze=soft|soft gaze|gaze=soft|视线放软|目光放软/u.test(combined)
        ? 'soften' as const
        : /embodiment_gaze=drift|gaze=drift|drift gaze/u.test(combined)
          ? 'drift' as const
          : null
  const preferredVoiceMode
    = /embodiment_voice=lower-pressure|voice=lower-pressure|lower-pressure voice|lighter and quieter|reply should stay lighter/u.test(combined)
      ? 'lower-pressure' as const
      : /embodiment_voice=even|voice=even|even voice/u.test(combined)
        ? 'even' as const
        : null
  const preferredPauseMode
    = /embodiment_pause=longer|pause=longer|longer pause|pause longer/u.test(combined)
      ? 'longer' as const
      : /embodiment_pause=natural|pause=natural|natural pause/u.test(combined)
        ? 'natural' as const
        : null
  const preferredLipsyncMode
    = /embodiment_lipsync=restrained|lipsync=restrained|restrained lipsync|克制/u.test(combined)
      ? 'restrained' as const
      : /embodiment_lipsync=matched|lipsync=matched|matched lipsync/u.test(combined)
        ? 'matched' as const
        : null
  const preferredPacingMode
    = /embodiment_pacing=slower|pacing=slower|slow down|slower pacing|slow the reply|reply should slow down|放慢|慢一点|慢下来|放缓/u.test(combined)
      ? 'slower' as const
      : /embodiment_pacing=natural|pacing=natural|natural pacing/u.test(combined)
        ? 'natural' as const
        : null

  return {
    embodimentRecallStrength,
    embodimentModalityRisk,
    preferredBlinkCadence,
    preferredGazeMode,
    preferredVoiceMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredPacingMode,
  }
}

function hasCorrectedSamePersonQuietEmbodimentSettling(input: {
  reasonTags: string[]
  memorySummary: string | null
  proactiveCadenceSummary: string | null
  runtimeContinuityCue: string | null
  habitNarrative: string | null
  openingGuidance?: string | null
  manifestationCadenceSummary?: string | null
  emotionalClosureCue?: string | null
  primaryOpenLoop?: string | null
  sameHerHoldDetail?: string | null
  autobiographicalIdentityNarrative?: string | null
  autobiographicalRelationshipDoctrine?: string | null
  autobiographicalLatestInflection?: string | null
}) {
  const combined = [
    ...input.reasonTags,
    input.memorySummary,
    input.proactiveCadenceSummary,
    input.runtimeContinuityCue,
    input.habitNarrative,
    input.openingGuidance,
    input.manifestationCadenceSummary,
    input.emotionalClosureCue,
    input.primaryOpenLoop,
    input.sameHerHoldDetail,
    input.autobiographicalIdentityNarrative,
    input.autobiographicalRelationshipDoctrine,
    input.autobiographicalLatestInflection,
  ].filter(Boolean).join(' ').toLowerCase()

  const correctedSamePersonSettling
    = includesAnyNormalizedSeedText(combined, [
      'self-evolution:corrected-same-person-manifestation',
      'corrected same-person continuity',
      'corrected same person continuity',
      'corrected same-person line',
      '纠正后的同一人格连续性',
      '同一人连续性',
    ])
  const quieterEmbodimentSettling
    = includesAnyNormalizedSeedText(combined, [
      'self-evolution:quieter-embodiment-settling',
      'embodiment quieter',
      'body quieter',
      'body should stay quieter',
      'body quieter and steadier',
      'body settle more quietly',
      'let the body settle more quietly',
      '身体更安静',
      '先把身体收稳',
    ])
  const metabolizedNoiseMuted
    = correctedSamePersonSettling
      && includesAnyNormalizedSeedText(combined, [
        'forget=older-emotional-spike',
        'older emotional spike',
        'old spike noise fades back',
        'faded noise stay background',
        'noise fades back',
        'stale emotional wobble',
      ])
      && includesAnyNormalizedSeedText(combined, [
        'merge=older-same-thread-echo',
        'merged same-thread echo',
        'same-thread echo stays background',
        'same-thread continuity echoes',
        'older-same-thread-echo',
      ])

  return correctedSamePersonSettling || quieterEmbodimentSettling || metabolizedNoiseMuted
}

function hasMetabolizedNoiseMutedEmbodimentCarry(input: {
  reasonTags: string[]
  memorySummary: string | null
  openingGuidance: string | null
  manifestationCadenceSummary: string | null
  emotionalClosureCue: string | null
  primaryOpenLoop: string | null
  nextClosureTarget: string | null
  sameHerHoldDetail: string | null
}) {
  const combined = [
    ...input.reasonTags,
    input.memorySummary,
    input.openingGuidance,
    input.manifestationCadenceSummary,
    input.emotionalClosureCue,
    input.primaryOpenLoop,
    input.nextClosureTarget,
    input.sameHerHoldDetail,
  ].filter(Boolean).join(' ').toLowerCase()

  const correctedSamePersonContinuity = includesAnyNormalizedSeedText(combined, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    'host corrected this memory meaning',
    'same-person continuity stays foreground',
  ])
  const olderSpikeFaded = includesAnyNormalizedSeedText(combined, [
    'forget=older-emotional-spike',
    'older emotional spike',
    'old spike noise fades back',
    'faded noise stay background',
    'noise fades back',
    'stale emotional wobble',
  ])
  const mergedSameThreadEcho = includesAnyNormalizedSeedText(combined, [
    'merge=older-same-thread-echo',
    'merged same-thread echo',
    'same-thread echo stays background',
    'same-thread continuity echoes',
    'older-same-thread-echo',
  ])

  return correctedSamePersonContinuity && olderSpikeFaded && mergedSameThreadEcho
}

function hasVulnerableCareRestProtectiveEmbodimentCarry(input: {
  reasonTags: string[]
  memorySummary: string | null
  openingGuidance: string | null
  manifestationCadenceSummary: string | null
  emotionalClosureCue: string | null
  primaryOpenLoop: string | null
  sameHerHoldDetail: string | null
  autobiographicalIdentityNarrative?: string | null
  autobiographicalRelationshipDoctrine?: string | null
  autobiographicalLatestInflection?: string | null
}) {
  const combined = [
    ...input.reasonTags,
    input.memorySummary,
    input.openingGuidance,
    input.manifestationCadenceSummary,
    input.emotionalClosureCue,
    input.primaryOpenLoop,
    input.sameHerHoldDetail,
    input.autobiographicalIdentityNarrative,
    input.autobiographicalRelationshipDoctrine,
    input.autobiographicalLatestInflection,
  ].filter(Boolean).join(' ').toLowerCase()

  const vulnerableCare
    = includesAnyNormalizedSeedText(combined, [
      'vulnerable-care',
      'vulnerable care',
      'fragile care',
      'lighter companionship',
      'host is overloaded',
      '撑不住',
      '脆弱照料',
    ])
  const careBeforeAnalysis
    = includesAnyNormalizedSeedText(combined, [
      'care-before-analysis',
      'care before analysis',
      'care arrives before analysis',
      'care arrive before analysis',
      'let care arrive before analysis',
      '先照料再分析',
      '先照料后分析',
    ])
    || (
      includesAnyNormalizedSeedText(combined, [
        'analysis-heavy care',
        'analysis heavy care',
        'older analysis-heavy pressure',
        'older analysis-heavy care',
      ])
      && includesAnyNormalizedSeedText(combined, [
        'lighter',
        'quieter',
        'slower',
        'lower-pressure',
      ])
    )

  return vulnerableCare && careBeforeAnalysis
}

function hasRememberedInitiativeRhythm(input: {
  reasonTags: string[]
  memorySummary: string | null
  proactiveCadenceSummary: string | null
  runtimeContinuityCue: string | null
  openingGuidance: string | null
  manifestationCadenceSummary: string | null
  emotionalClosureCue: string | null
  landedProgressLine: string | null
  primaryOpenLoop: string | null
  nextClosureTarget: string | null
  speakingIntention: string | null
  consciousNeed: string | null
}) {
  const explicitTag = input.reasonTags.includes('initiative-rhythm-memory')
  const combined = [
    ...input.reasonTags,
    input.memorySummary,
    input.proactiveCadenceSummary,
    input.runtimeContinuityCue,
    input.openingGuidance,
    input.manifestationCadenceSummary,
    input.emotionalClosureCue,
    input.landedProgressLine,
    input.primaryOpenLoop,
    input.nextClosureTarget,
    input.speakingIntention,
    input.consciousNeed,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const visiblyReopening = combined.includes('visibly reopening')
    || combined.includes('already re-entering the same line')
    || combined.includes('same line is visibly reopening')
    || combined.includes('same line is reopening')
    || combined.includes('re-entering the same line')
  const antiSpam = combined.includes('timer spam')
    || combined.includes('anti-spam')
    || combined.includes('anti spam')
    || combined.includes('not pushing')
    || combined.includes('i am not pushing you')
  const gentlerCadence = combined.includes('gentler cadence')
    || combined.includes('quieter and slower')
    || combined.includes('reply should stay quieter')
    || combined.includes('return only when')
    || combined.includes('wait until the same line is visibly reopening on its own')
    || combined.includes('wait until the host is already re-entering the same line')

  return explicitTag || (visiblyReopening && (antiSpam || gentlerCadence))
}

function readAutobiographicalInitiativeHabitCarry(input: {
  autobiographicalIdentityNarrative?: string | null
  autobiographicalRelationshipDoctrine?: string | null
  autobiographicalLatestInflection?: string | null
  autobiographicalBehaviorSignatures?: string[] | null
}) {
  const combined = [
    input.autobiographicalIdentityNarrative,
    input.autobiographicalRelationshipDoctrine,
    input.autobiographicalLatestInflection,
    ...(input.autobiographicalBehaviorSignatures ?? []),
  ].filter(Boolean).join(' ').toLowerCase()

  const chooseOpeningsCarefully = combined.includes('habit:choose-openings-carefully')
    || includesAnyNormalizedSeedText(combined, [
      'clearer opening',
      'fresher opening',
      'wait for a clearer opening',
      'wait for a fresher opening',
      'choose openings more carefully',
    ])
  const keepGentleOpenings = !chooseOpeningsCarefully
    && (combined.includes('habit:keep-gentle-openings')
      || includesAnyNormalizedSeedText(combined, [
        'memory-led',
        'gentle',
        'still receiving',
        'received without obvious resistance',
        'keep the next return gentle',
      ]))

  return {
    chooseOpeningsCarefully,
    keepGentleOpenings,
    hasCarry: chooseOpeningsCarefully || keepGentleOpenings,
  }
}

function resolveSeedSilentContinuityMode(input: {
  reasonTags: string[]
  embodimentContinuityRestraint: string | null
  proactiveContinuityRestraint: string | null
}) {
  const { reasonTags, embodimentContinuityRestraint, proactiveContinuityRestraint } = input

  if (
    reasonTags.includes('embodiment-carry:repair-before-closeness')
    || reasonTags.includes('memory-deliberation-cadence:repair-before-closeness')
  ) {
    return 'repair-before-closeness' as const
  }

  if (
    reasonTags.includes('embodiment-carry:measured-return')
    || reasonTags.includes('memory-deliberation-cadence:measured-return')
    || reasonTags.includes('memory-deliberation-cadence:lower-pressure')
  ) {
    return 'measured-return' as const
  }

  if (
    reasonTags.includes('memory-deliberation-cadence:rest-protective')
    || reasonTags.includes('rest-protective')
    || reasonTags.includes('rest-protective-companionship')
  ) {
    return 'rest-protective' as const
  }

  if (embodimentContinuityRestraint === 'repair-before-closeness')
    return 'repair-before-closeness' as const
  if (embodimentContinuityRestraint === 'rest-protective')
    return 'rest-protective' as const
  if (embodimentContinuityRestraint === 'measured-return' || embodimentContinuityRestraint === 'lower-pressure')
    return 'measured-return' as const

  if (proactiveContinuityRestraint === 'rest-protective')
    return 'rest-protective' as const
  if (proactiveContinuityRestraint === 'repair-before-closeness')
    return 'repair-before-closeness' as const
  if (proactiveContinuityRestraint === 'measured-return' || proactiveContinuityRestraint === 'lower-pressure')
    return 'measured-return' as const

  return null
}

function buildSilentContinuityFromSeed(
  input: BuildAlicizationRuntimeEmbodimentSeedInput,
): AlicizationRuntimeEmbodimentSilentContinuity | null {
  const memoryClosureTrace = input.digitalLifeSpine?.memory?.memoryClosureTrace?.authority === 'memory-os'
    ? input.digitalLifeSpine.memory.memoryClosureTrace
    : null
  const memoryClosureTraceReasonTags = normalizeSeedReasonTags(memoryClosureTrace
    ? [
        'memory-os-closure-trace',
        ...(memoryClosureTrace.reasonTags ?? []),
      ]
    : [])
  const memoryClosureTraceEmbodiment = memoryClosureTrace?.nextInfluence.embodiment ?? null
  const memoryClosureTraceCadence = sanitizeOptionalSeedText(
    memoryClosureTraceEmbodiment?.cadence,
    220,
  )
  const memoryClosureTraceInitiativeRestraint = sanitizeOptionalSeedText(
    memoryClosureTrace?.nextInfluence.initiative.restraint,
    64,
  )
  const memoryClosureTraceOpeningGuidance = sanitizeOptionalSeedText(
    memoryClosureTraceEmbodiment?.reason
    ?? memoryClosureTrace?.nextInfluence.initiative.reason
    ?? memoryClosureTrace?.whySurface?.map(item => item.summary).join(' '),
    320,
  )
  const reasonTags = normalizeSeedReasonTags([
    ...memoryClosureTraceReasonTags,
    ...(input.currentConsciousFrame?.reasonTags ?? []),
    ...(input.residentPerformance?.reasonTags ?? []),
  ])
  const hasSilentContinuity = reasonTags.includes('embodiment-carry:silent-continuity')
    || reasonTags.includes('memory-deliberation-cadence:repair-before-closeness')
    || reasonTags.includes('memory-deliberation-cadence:measured-return')
    || reasonTags.includes('memory-deliberation-cadence:lower-pressure')
    || reasonTags.includes('memory-deliberation-cadence:rest-protective')
    || reasonTags.includes('rest-protective')
    || reasonTags.includes('rest-protective-companionship')
    || memoryClosureTraceReasonTags.includes('memory-os-closure-trace')
  const embodimentInitiative = input.digitalLifeSpine?.embodiment?.initiative ?? null
  const embodimentPersonaBias = embodimentInitiative?.personaBias ?? null
  const runtimeHabitPolicy = (input.digitalLifeSpine as {
    runtimeSurface?: {
      agency?: {
        habitPolicy?: {
          narrative?: unknown
        } | null
      } | null
    } | null
  } | null)?.runtimeSurface?.agency?.habitPolicy ?? null
  const runtimeHabitNarrative = Array.isArray(runtimeHabitPolicy?.narrative)
    ? runtimeHabitPolicy?.narrative
        .map(item => sanitizeOptionalSeedText(item, 120))
        .filter(Boolean)
        .join(' ')
    : sanitizeOptionalSeedText(runtimeHabitPolicy?.narrative, 220)
  const mode = resolveSeedSilentContinuityMode({
    reasonTags,
    embodimentContinuityRestraint: sanitizeOptionalSeedText(
      embodimentInitiative?.continuityRestraint,
      64,
    ),
    proactiveContinuityRestraint: sanitizeOptionalSeedText(
      input.digitalLifeSpine?.proactive?.continuityRestraint
      ?? memoryClosureTraceInitiativeRestraint,
      64,
    ),
  })

  const runtimeProjectState = input.digitalLifeSpine?.runtime?.projectState as AlicizationRuntimeEmbodimentProjectState | null
  const consciousProjectState = (
    input.currentConsciousFrame?.projectState
    && typeof input.currentConsciousFrame.projectState === 'object'
    && !Array.isArray(input.currentConsciousFrame.projectState)
  )
    ? input.currentConsciousFrame.projectState as AlicizationRuntimeEmbodimentProjectState
    : null
  const rawRuntimePreDialogueAwarenessLine = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      runtimeProjectState?.preDialogueAwarenessLine,
      runtimeProjectState?.awarenessLine,
    ],
    consciousCandidates: [
      consciousProjectState?.preDialogueAwarenessLine,
      consciousProjectState?.awarenessLine,
    ],
    maxChars: 320,
  })
  const rebuiltRuntimePreDialogueAwarenessLine = sanitizeOptionalSeedText(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: runtimeProjectState
        ? {
            identity: runtimeProjectState.identity,
            currentPhase: runtimeProjectState.currentPhase,
            preDialogueAwarenessLine: runtimeProjectState.preDialogueAwarenessLine,
            awarenessLine: runtimeProjectState.awarenessLine,
            companionHeadlineLine: runtimeProjectState.companionHeadlineLine,
            latestLandedProgress: runtimeProjectState.latestLandedProgress,
            landedProgressSummary: runtimeProjectState.landedProgressSummary,
            primaryOpenLoop: runtimeProjectState.primaryOpenLoop,
            openClosureSummary: runtimeProjectState.openClosureSummary,
            nextClosureTarget: runtimeProjectState.nextClosureTarget,
            emotionalClosureCue: runtimeProjectState.emotionalClosureCue,
            emotionalClosureSummary: runtimeProjectState.emotionalClosureSummary,
            sameHerSelfLine: runtimeProjectState.sameHerSelfLine,
          }
        : null,
    }),
    320,
  )
  const preferredRuntimePreDialogueAwarenessLine = rawRuntimePreDialogueAwarenessLine
    && !isAlicizationThinProjectAwarenessLine(rawRuntimePreDialogueAwarenessLine)
    ? rawRuntimePreDialogueAwarenessLine
    : rawRuntimePreDialogueAwarenessLine
      ? rebuiltRuntimePreDialogueAwarenessLine
      : null
  const runtimeCompanionHeadlineLine = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      runtimeProjectState?.companionHeadlineLine,
    ],
    consciousCandidates: [
      consciousProjectState?.companionHeadlineLine,
    ],
    maxChars: 220,
  })
  const preferredProjectLatestLandedProgress = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      runtimeProjectState?.latestLandedProgress,
      runtimeProjectState?.landedProgressSummary,
    ],
    consciousCandidates: [
      consciousProjectState?.latestLandedProgress,
    ],
    maxChars: 220,
  })
  const preferredProjectPrimaryOpenLoop = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      runtimeProjectState?.openClosureSummary,
      runtimeProjectState?.primaryOpenLoop,
      preferredRuntimePreDialogueAwarenessLine,
    ],
    consciousCandidates: [
      consciousProjectState?.primaryOpenLoop,
      consciousProjectState?.emotionalClosureSummary,
      consciousProjectState?.continuityCue,
    ],
    maxChars: 220,
  })
  const preferredProjectNextClosureTarget = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      runtimeProjectState?.nextClosureTarget,
    ],
    consciousCandidates: [
      consciousProjectState?.nextClosureTarget,
      consciousProjectState?.primaryOpenLoop,
    ],
    maxChars: 220,
  })
  const preferredProjectEmotionalClosureCue = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      runtimeProjectState?.emotionalClosureCue,
      runtimeProjectState?.emotionalClosureSummary,
    ],
    consciousCandidates: [
      consciousProjectState?.emotionalClosureCue,
      consciousProjectState?.emotionalClosureSummary,
    ],
    maxChars: 220,
  })
  const preferredProjectSameHerSelfLine = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      runtimeProjectState?.latestLandedProgress,
      runtimeProjectState?.landedProgressSummary,
      runtimeProjectState?.sameHerSelfLine,
    ],
    consciousCandidates: [
      consciousProjectState?.latestLandedProgress,
      consciousProjectState?.sameHerSelfLine,
      consciousProjectState?.emotionalClosureSummary,
      consciousProjectState?.continuityCue,
    ],
    maxChars: 220,
  })
  const preferredProjectSameHerHoldDetail = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      runtimeProjectState?.sameHerHoldDetail,
    ],
    consciousCandidates: [
      consciousProjectState?.sameHerHoldDetail,
    ],
    maxChars: 220,
  })
  const preferredProjectContinuityCue = choosePreferredSeedClosureCarryWithFallback({
    runtimeCandidates: [
      input.digitalLifeSpine?.runtime?.continuityCue,
      runtimeProjectState?.continuityCue,
    ],
    consciousCandidates: [
      consciousProjectState?.continuityCue,
    ],
    maxChars: 220,
  })
  const hasAudibleBodyMeasuredReturnCarry = Boolean(
    runtimeCompanionHeadlineLine
    && (
      runtimeCompanionHeadlineLine.includes('living audio thread is still intact')
      || runtimeCompanionHeadlineLine.includes('still-voiced face-and-mouth line')
      || runtimeCompanionHeadlineLine.includes('still-voiced motion-and-mouth line')
      || runtimeCompanionHeadlineLine.includes('still-voiced face line')
      || runtimeCompanionHeadlineLine.includes('still-voiced motion line')
      || runtimeCompanionHeadlineLine.includes('audible-body')
      || runtimeCompanionHeadlineLine.includes('body+voice-only')
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through lipsync and voice')
        && runtimeCompanionHeadlineLine.includes('body, face, and motion')
        && runtimeCompanionHeadlineLine.includes('same-her carry alive')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through face, lipsync, and voice')
        && runtimeCompanionHeadlineLine.includes('body and motion')
        && runtimeCompanionHeadlineLine.includes('same-her carry alive')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through motion, lipsync, and voice')
        && runtimeCompanionHeadlineLine.includes('body and face')
        && runtimeCompanionHeadlineLine.includes('same-her carry alive')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through face and voice')
        && runtimeCompanionHeadlineLine.includes('body, motion, and lipsync')
        && runtimeCompanionHeadlineLine.includes('same-her carry alive')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through motion and voice')
        && runtimeCompanionHeadlineLine.includes('body, face, and lipsync')
        && runtimeCompanionHeadlineLine.includes('same-her carry alive')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together through face, motion, and voice together')
        && runtimeCompanionHeadlineLine.includes('body and lipsync')
        && runtimeCompanionHeadlineLine.includes('same-her carry alive')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through body and voice')
        && runtimeCompanionHeadlineLine.includes('resident body line is still keeping this one living her coherent')
        && runtimeCompanionHeadlineLine.includes('face, motion, and lipsync')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through body and voice')
        && runtimeCompanionHeadlineLine.includes('resident body line is still keeping this one living her coherent')
        && runtimeCompanionHeadlineLine.includes('face motion and lipsync')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through body, lipsync, and voice')
        && runtimeCompanionHeadlineLine.includes('face and motion')
        && runtimeCompanionHeadlineLine.includes('cross-modal closure')
      )
    ),
  )
  const hasQuieterBodyLipsyncMeasuredReturnCarry = Boolean(
    runtimeCompanionHeadlineLine
    && (
      runtimeCompanionHeadlineLine.includes('body+lipsync-only')
      || runtimeCompanionHeadlineLine.includes('quieter living line')
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through body and lipsync')
        && runtimeCompanionHeadlineLine.includes('resident body line and living mouth line')
        && runtimeCompanionHeadlineLine.includes('face, motion, and voice')
      )
      || (
        runtimeCompanionHeadlineLine.includes('holding together mainly through body and lipsync')
        && runtimeCompanionHeadlineLine.includes('one quieter living line is still intact')
        && runtimeCompanionHeadlineLine.includes('cross-modal closure')
      )
    ),
  )
  const audibleBodyMeasuredReturnCadence = hasAudibleBodyMeasuredReturnCarry
    ? sanitizeOptionalSeedText(
        preferredProjectNextClosureTarget
        ?? preferredProjectPrimaryOpenLoop
        ?? runtimeCompanionHeadlineLine,
        220,
      )
    : null
  const quieterBodyLipsyncMeasuredReturnCadence = hasQuieterBodyLipsyncMeasuredReturnCarry
    ? sanitizeOptionalSeedText(
        preferredProjectNextClosureTarget
        ?? preferredProjectPrimaryOpenLoop
        ?? runtimeCompanionHeadlineLine,
        220,
      )
    : null
  const manifestationCadenceSummary = sanitizeOptionalSeedText(
    audibleBodyMeasuredReturnCadence
    ?? quieterBodyLipsyncMeasuredReturnCadence
    ?? memoryClosureTraceCadence
    ?? input.digitalLifeSpine?.memory?.personStateProjection?.manifestationCadenceSummary
    ?? preferredProjectNextClosureTarget
    ?? preferredProjectPrimaryOpenLoop
    ?? embodimentPersonaBias?.manifestationCadenceSummary
    ?? input.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
    220,
  )
  const emotionalClosureCue = sanitizeOptionalSeedText(
    preferredProjectEmotionalClosureCue,
    220,
  )
  const landedProgressLine = sanitizeOptionalSeedText(
    preferredProjectLatestLandedProgress,
    220,
  )
  const primaryOpenLoop = sanitizeOptionalSeedText(
    preferredProjectPrimaryOpenLoop
    ?? preferredRuntimePreDialogueAwarenessLine,
    220,
  )
  const openingGuidance = sanitizeOptionalSeedText(
    input.digitalLifeSpine?.memory?.personStateProjection?.openingGuidance
    ?? memoryClosureTraceOpeningGuidance
    ?? runtimeCompanionHeadlineLine
    ?? preferredRuntimePreDialogueAwarenessLine
    ?? preferredProjectEmotionalClosureCue
    ?? preferredProjectNextClosureTarget
    ?? preferredProjectPrimaryOpenLoop
    ?? embodimentPersonaBias?.openingGuidance
    ?? embodimentPersonaBias?.whySummary
    ?? embodimentInitiative?.why
    ?? preferredProjectContinuityCue,
    320,
  )
  const inwardLine = sanitizeOptionalSeedText(
    input.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine
    ?? preferredProjectSameHerSelfLine
    ?? embodimentPersonaBias?.whySummary
    ?? embodimentInitiative?.why,
    220,
  )
  const correctedSamePersonQuietSettling = hasCorrectedSamePersonQuietEmbodimentSettling({
    reasonTags,
    memorySummary: sanitizeOptionalSeedText(input.digitalLifeSpine?.memory?.summary, 220),
    proactiveCadenceSummary: sanitizeOptionalSeedText(
      input.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
      220,
    ),
    runtimeContinuityCue: sanitizeOptionalSeedText(preferredProjectContinuityCue, 220),
    habitNarrative: runtimeHabitNarrative,
    openingGuidance,
    manifestationCadenceSummary,
    emotionalClosureCue,
    primaryOpenLoop,
    sameHerHoldDetail: sanitizeOptionalSeedText(preferredProjectSameHerHoldDetail, 220),
    autobiographicalIdentityNarrative: sanitizeOptionalSeedText(
      input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.identityNarrative,
      220,
    ),
    autobiographicalRelationshipDoctrine: sanitizeOptionalSeedText(
      input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
      220,
    ),
    autobiographicalLatestInflection: sanitizeOptionalSeedText(
      (input.digitalLifeSpine?.embodiment?.autobiographicalSelf as { latestInflection?: unknown } | null)?.latestInflection,
      220,
    ),
  })
  const autobiographicalIdentityNarrative = sanitizeOptionalSeedText(
    input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.identityNarrative,
    220,
  )
  const autobiographicalRelationshipDoctrine = sanitizeOptionalSeedText(
    input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
    220,
  )
  const autobiographicalSelf = input.digitalLifeSpine?.embodiment?.autobiographicalSelf as unknown as {
    latestInflection?: unknown
    behaviorSignatures?: unknown
  } | null
  const autobiographicalLatestInflection = sanitizeOptionalSeedText(
    autobiographicalSelf?.latestInflection,
    220,
  )
  const autobiographicalBehaviorSignatures = autobiographicalSelf?.behaviorSignatures
  const autobiographicalInitiativeHabitCarry = readAutobiographicalInitiativeHabitCarry({
    autobiographicalIdentityNarrative,
    autobiographicalRelationshipDoctrine,
    autobiographicalLatestInflection,
    autobiographicalBehaviorSignatures: Array.isArray(autobiographicalBehaviorSignatures)
      ? autobiographicalBehaviorSignatures
      : null,
  })
  const rememberedInitiativeRhythm = hasRememberedInitiativeRhythm({
    reasonTags,
    memorySummary: sanitizeOptionalSeedText(input.digitalLifeSpine?.memory?.summary, 220),
    proactiveCadenceSummary: sanitizeOptionalSeedText(
      input.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
      220,
    ),
    runtimeContinuityCue: sanitizeOptionalSeedText(preferredProjectContinuityCue, 220),
    openingGuidance,
    manifestationCadenceSummary,
    emotionalClosureCue,
    landedProgressLine,
    primaryOpenLoop,
    nextClosureTarget: sanitizeOptionalSeedText(preferredProjectNextClosureTarget, 220),
    speakingIntention: sanitizeOptionalSeedText(input.currentConsciousFrame?.speakingIntention, 220),
    consciousNeed: sanitizeOptionalSeedText(input.currentConsciousFrame?.consciousNeed, 220),
  })
  const explicitEmbodimentCarry = deriveSilentContinuityEmbodimentCarry({
    memorySummary: sanitizeOptionalSeedText(input.digitalLifeSpine?.memory?.summary, 1600),
    openingGuidance,
    manifestationCadenceSummary,
    emotionalClosureCue,
    primaryOpenLoop,
    nextClosureTarget: sanitizeOptionalSeedText(preferredProjectNextClosureTarget, 220),
    sameHerHoldDetail: sanitizeOptionalSeedText(preferredProjectSameHerHoldDetail, 220),
  })
  const metabolizedNoiseMuted = hasMetabolizedNoiseMutedEmbodimentCarry({
    reasonTags,
    memorySummary: sanitizeOptionalSeedText(input.digitalLifeSpine?.memory?.summary, 220),
    openingGuidance,
    manifestationCadenceSummary,
    emotionalClosureCue,
    primaryOpenLoop,
    nextClosureTarget: sanitizeOptionalSeedText(preferredProjectNextClosureTarget, 220),
    sameHerHoldDetail: sanitizeOptionalSeedText(preferredProjectSameHerHoldDetail, 220),
  })
  const vulnerableCareRestProtectiveCarry = hasVulnerableCareRestProtectiveEmbodimentCarry({
    reasonTags,
    memorySummary: sanitizeOptionalSeedText(input.digitalLifeSpine?.memory?.summary, 220),
    openingGuidance,
    manifestationCadenceSummary,
    emotionalClosureCue,
    primaryOpenLoop,
    sameHerHoldDetail: sanitizeOptionalSeedText(preferredProjectSameHerHoldDetail, 220),
    autobiographicalIdentityNarrative,
    autobiographicalRelationshipDoctrine,
    autobiographicalLatestInflection,
  })
  const embodimentPreferredPresence = sanitizeOptionalSeedText(
    embodimentInitiative?.preferredPresence,
    64,
  )
  const repairBeforeClosenessCarryGuidance = [
    preferredProjectNextClosureTarget,
    preferredProjectPrimaryOpenLoop,
    input.digitalLifeSpine?.memory?.personStateProjection?.manifestationCadenceSummary,
    input.digitalLifeSpine?.memory?.personStateProjection?.openingGuidance,
    preferredProjectContinuityCue,
  ]
    .map(value => sanitizeOptionalSeedText(value, 220))
    .filter(Boolean)
    .join(' ')
  const hasRepairBeforeClosenessSameHerCarry = (
    hasAudibleBodyMeasuredReturnCarry || hasQuieterBodyLipsyncMeasuredReturnCarry
  ) && (
    reasonTags.includes('repair-before-closeness')
    || repairBeforeClosenessCarryGuidance.includes('repair-before-closeness')
    || repairBeforeClosenessCarryGuidance.includes('repair before closeness')
    || repairBeforeClosenessCarryGuidance.includes('repair-first')
    || repairBeforeClosenessCarryGuidance.includes('let repair settle')
    || repairBeforeClosenessCarryGuidance.includes('repair lands before warmth widens')
  )

  const effectiveMode = mode === 'rest-protective'
    ? mode
    : hasRepairBeforeClosenessSameHerCarry
      ? 'repair-before-closeness' as const
      : mode ?? (
        rememberedInitiativeRhythm || autobiographicalInitiativeHabitCarry.hasCarry || hasAudibleBodyMeasuredReturnCarry || hasQuieterBodyLipsyncMeasuredReturnCarry
          ? 'measured-return' as const
          : null
      )

  if (
    !effectiveMode
    || (
      !hasSilentContinuity
      && !hasAudibleBodyMeasuredReturnCarry
      && !hasQuieterBodyLipsyncMeasuredReturnCarry
      && !openingGuidance
      && !manifestationCadenceSummary
      && !inwardLine
      && !emotionalClosureCue
      && !landedProgressLine
    )
  ) {
    return null
  }

  const preferredPresence = effectiveMode === 'repair-before-closeness'
    ? 'concerned'
    : effectiveMode === 'rest-protective'
      ? embodimentPreferredPresence === 'hesitant'
        ? 'hesitant'
        : embodimentPreferredPresence === 'attentive'
          ? 'attentive'
          : 'concerned'
      : correctedSamePersonQuietSettling
        ? 'hesitant'
        : hasAudibleBodyMeasuredReturnCarry || hasQuieterBodyLipsyncMeasuredReturnCarry
          ? 'hesitant'
          : embodimentPreferredPresence === 'hesitant'
            ? 'hesitant'
            : embodimentPreferredPresence === 'concerned'
              ? 'concerned'
              : embodimentPreferredPresence === 'attentive'
                ? 'attentive'
                : input.residentPerformance?.embodiedPresence === 'hesitant'
                  ? 'hesitant'
                  : 'attentive'

  const effectiveOpeningGuidance
    = effectiveMode === 'rest-protective' && vulnerableCareRestProtectiveCarry
      ? openingGuidance
      ?? 'Let care arrive before analysis and keep this fragile line quiet while the host is overloaded.'
      : openingGuidance
  const effectiveManifestationCadenceSummary
    = effectiveMode === 'rest-protective' && vulnerableCareRestProtectiveCarry
      ? manifestationCadenceSummary
      ?? 'Keep the remembered vulnerable-care body line quieter and slower so care arrives before analysis before older pressure returns.'
      : manifestationCadenceSummary
  const effectiveInwardLine
    = effectiveMode === 'rest-protective' && vulnerableCareRestProtectiveCarry
      ? inwardLine
      ?? autobiographicalIdentityNarrative
      ?? 'I learned to let care arrive before analysis when the host is overloaded.'
      : inwardLine

  return {
    mode: effectiveMode,
    source: 'subconscious-presence-hold',
    preferredPresence,
    openingGuidance: effectiveOpeningGuidance,
    manifestationCadenceSummary: effectiveManifestationCadenceSummary,
    inwardLine: effectiveInwardLine,
    emotionalClosureCue,
    landedProgressLine,
    embodimentRecallStrength: explicitEmbodimentCarry.embodimentRecallStrength,
    embodimentModalityRisk: explicitEmbodimentCarry.embodimentModalityRisk,
    preferredBlinkCadence: explicitEmbodimentCarry.preferredBlinkCadence,
    preferredGazeMode: explicitEmbodimentCarry.preferredGazeMode ?? memoryClosureTraceEmbodiment?.preferredGazeMode ?? null,
    preferredVoiceMode: explicitEmbodimentCarry.preferredVoiceMode ?? memoryClosureTraceEmbodiment?.preferredVoiceMode ?? null,
    preferredPauseMode: explicitEmbodimentCarry.preferredPauseMode,
    preferredLipsyncMode: explicitEmbodimentCarry.preferredLipsyncMode ?? memoryClosureTraceEmbodiment?.preferredLipsyncMode ?? null,
    preferredPacingMode: explicitEmbodimentCarry.preferredPacingMode,
    reasonTags: normalizeSeedReasonTags([
      ...reasonTags,
      ...(correctedSamePersonQuietSettling
        ? [
            'memory-deliberation-cadence:corrected-same-person-settling',
            'embodiment-carry:quieter-embodiment-settling',
          ]
        : []),
      ...(autobiographicalInitiativeHabitCarry.hasCarry ? ['autobiographical-initiative-habit'] : []),
      ...(metabolizedNoiseMuted ? ['metabolized-noise-muted'] : []),
      ...(vulnerableCareRestProtectiveCarry ? ['embodiment-carry:vulnerable-care'] : []),
      ...(rememberedInitiativeRhythm || autobiographicalInitiativeHabitCarry.chooseOpeningsCarefully
        ? ['initiative-rhythm-memory']
        : []),
    ]),
  }
}

export function buildAlicizationRuntimeEmbodimentSeed(
  input: BuildAlicizationRuntimeEmbodimentSeedInput,
): AlicizationRuntimeEmbodimentSeed {
  // NOTICE:
  // In P0 this helper becomes the canonical local input shape for the director,
  // but it is not transported over shared IPC yet. The transported execution
  // authority remains `structured.embodimentScript`.
  return {
    decisionTraceId: normalizeSeedDecisionTraceId(input.decisionTraceId),
    turnId: normalizeSeedText(input.turnId, 120),
    replyText: normalizeSeedText(input.reply, 4000),
    performance: normalizeAlicizationPerformancePayload(
      input.performance,
      input.performance.baseEmotion,
    ),
    embodiment: input.embodiment,
    speechTimeline: input.speechTimeline,
    digitalLife: input.digitalLife
      ? normalizeRuntimeEmbodimentSeedDigitalLife(
          input.digitalLife,
          input.performance.baseEmotion,
        )
      : null,
    digitalLifeSpine: input.digitalLifeSpine,
    affectiveResidue: input.affectiveResidue ?? null,
    currentConsciousFrame: input.currentConsciousFrame ?? null,
    residentPerformance: input.residentPerformance ?? null,
    silentContinuity: buildSilentContinuityFromSeed(input),
  }
}
