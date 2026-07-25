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
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationPerformancePayload,
  normalizeStageEmbodimentMotorState,
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
  continuityRestraint?: unknown
  continuityCadence?: unknown
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
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

function selectSeedAuditText(candidates: Array<unknown>, maxChars: number) {
  for (const candidate of candidates) {
    const normalized = sanitizeOptionalSeedText(candidate, maxChars)
    if (normalized)
      return normalized
  }
  return null
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

function sanitizeSeedSilentContinuityMode(raw: unknown) {
  if (raw === 'repair-before-closeness')
    return 'repair-before-closeness' as const
  if (raw === 'rest-protective')
    return 'rest-protective' as const
  if (raw === 'measured-return' || raw === 'lower-pressure')
    return 'measured-return' as const
  return null
}

function sanitizeSeedPreferredBlinkCadence(raw: unknown) {
  return raw === 'normal' || raw === 'linger' || raw === 'quiet' ? raw : null
}

function sanitizeSeedPreferredGazeMode(raw: unknown) {
  return raw === 'steady' || raw === 'soften' || raw === 'drift' ? raw : null
}

function sanitizeSeedPreferredVoiceMode(raw: unknown) {
  return raw === 'lower-pressure' || raw === 'even' ? raw : null
}

function sanitizeSeedPreferredPauseMode(raw: unknown) {
  return raw === 'longer' || raw === 'natural' ? raw : null
}

function sanitizeSeedPreferredLipsyncMode(raw: unknown) {
  return raw === 'restrained' || raw === 'matched' ? raw : null
}

function sanitizeSeedPreferredPacingMode(raw: unknown) {
  return raw === 'slower' || raw === 'natural' ? raw : null
}

function sanitizeSeedEmbodimentRecallStrength(raw: unknown) {
  return raw === 'lightly-noticed' || raw === 'strongly-moved' || raw === 'cautious-avoidance'
    ? raw
    : null
}

function sanitizeSeedEmbodimentModalityRisk(raw: unknown) {
  return raw === 'low' || raw === 'medium' || raw === 'high' ? raw : null
}

function sanitizeSeedPreferredPresence(raw: unknown) {
  return raw === 'attentive' || raw === 'hesitant' || raw === 'concerned'
    ? raw
    : null
}

function resolveSeedAffectiveResidueMode(
  affectiveResidue: AlicizationAffectiveResidueMemorySnapshot | null | undefined,
) {
  const cadence = affectiveResidue?.relationshipCadence
  if (!affectiveResidue || !cadence)
    return null

  if (
    affectiveResidue.dominantResidueKind === 'rest-protective'
    || cadence.shouldProtectRest === true
    || affectiveResidue.restProtectivePressure >= 0.42
    || (cadence.fatigueGuard ?? 0) >= 0.42
  ) {
    return 'rest-protective' as const
  }

  if (
    cadence.cadenceMode === 'repair'
    || (
      affectiveResidue.dominantResidueKind === 'repair'
      && (
        affectiveResidue.repairPressure >= 0.42
        || (cadence.repairRecovery ?? 0) >= 0.42
        || cadence.shouldDelayWarmth === true
      )
    )
  ) {
    return 'repair-before-closeness' as const
  }

  if (
    cadence.cadenceMode === 'measured-return'
    || cadence.cadenceMode === 'cooldown'
    || cadence.shouldDelayWarmth === true
    || (cadence.afterglowCarry ?? 0) >= 0.22
    || (cadence.overreachRisk ?? 0) >= 0.24
    || (
      affectiveResidue.dominantResidueKind === 'afterglow'
      && affectiveResidue.afterglowPressure >= 0.24
    )
  ) {
    return 'measured-return' as const
  }

  return null
}

function resolveSeedHabitMode(input: BuildAlicizationRuntimeEmbodimentSeedInput) {
  const canonicalHabit = input.digitalLifeSpine?.habit
  const legacyHabit = (input.digitalLifeSpine as {
    runtimeSurface?: {
      agency?: {
        habitPolicy?: Record<string, unknown> | null
      } | null
    } | null
  } | null)?.runtimeSurface?.agency?.habitPolicy
  const dominantMode = canonicalHabit?.dominantMode ?? legacyHabit?.dominantMode
  const suggestedStyleCap = canonicalHabit?.suggestedStyleCap ?? legacyHabit?.suggestedStyleCap
  const suggestedPresenceCap = canonicalHabit?.suggestedPresenceCap ?? legacyHabit?.suggestedPresenceCap

  if (
    dominantMode === 'protect-rest-window'
    && suggestedPresenceCap === 'concerned'
    && suggestedStyleCap === 'silent-observe'
  ) {
    return 'rest-protective' as const
  }

  if (
    dominantMode === 'protect-rest-window'
    || dominantMode === 'repair-before-fluency'
    || suggestedPresenceCap === 'concerned'
  ) {
    return 'repair-before-closeness' as const
  }

  if (
    dominantMode === 'return-with-proof'
    || dominantMode === 'light-touch-companionship'
    || suggestedStyleCap === 'silent-observe'
    || suggestedPresenceCap === 'hesitant'
    || suggestedPresenceCap === 'glance'
  ) {
    return 'measured-return' as const
  }

  return null
}

function resolveSeedSilentContinuityMode(input: {
  reasonTags: string[]
  structuredCandidates: unknown[]
}) {
  const { reasonTags } = input

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

  for (const candidate of input.structuredCandidates) {
    const mode = sanitizeSeedSilentContinuityMode(candidate)
    if (mode)
      return mode
  }

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
  const reasonTags = normalizeSeedReasonTags([
    ...memoryClosureTraceReasonTags,
    ...(input.currentConsciousFrame?.reasonTags ?? []),
    ...(input.residentPerformance?.reasonTags ?? []),
  ])
  const memoryClosureTraceEmbodiment = memoryClosureTrace?.nextInfluence.embodiment ?? null
  const memoryClosureTraceEmbodimentRecord = memoryClosureTraceEmbodiment as (Record<string, unknown> & {
    embodimentRecallStrength?: unknown
    embodimentModalityRisk?: unknown
  }) | null
  const runtimeProjectState = input.digitalLifeSpine?.runtime?.projectState as AlicizationRuntimeEmbodimentProjectState | null
  const consciousProjectState = (
    input.currentConsciousFrame?.projectState
    && typeof input.currentConsciousFrame.projectState === 'object'
    && !Array.isArray(input.currentConsciousFrame.projectState)
  )
    ? input.currentConsciousFrame.projectState as AlicizationRuntimeEmbodimentProjectState
    : null
  const embodimentInitiative = input.digitalLifeSpine?.embodiment?.initiative ?? null
  const embodimentPersonaBias = embodimentInitiative?.personaBias ?? null
  const habitMode = resolveSeedHabitMode(input)
  const affectiveResidueMode = resolveSeedAffectiveResidueMode(input.affectiveResidue)
  const mode = resolveSeedSilentContinuityMode({
    reasonTags,
    structuredCandidates: [
      embodimentInitiative?.continuityRestraint,
      input.digitalLifeSpine?.proactive?.continuityRestraint,
      memoryClosureTrace?.nextInfluence.initiative.restraint,
      consciousProjectState?.continuityRestraint,
      input.currentConsciousFrame?.continuityCadence,
      consciousProjectState?.continuityCadence,
      runtimeProjectState?.continuityRestraint,
      runtimeProjectState?.continuityCadence,
      affectiveResidueMode,
      habitMode,
    ],
  })

  if (!mode)
    return null

  const openingGuidance = selectSeedAuditText([
    input.digitalLifeSpine?.memory?.personStateProjection?.openingGuidance,
    memoryClosureTraceEmbodiment?.reason,
    memoryClosureTrace?.nextInfluence.initiative.reason,
    embodimentPersonaBias?.openingGuidance,
    runtimeProjectState?.preDialogueAwarenessLine,
    consciousProjectState?.preDialogueAwarenessLine,
    runtimeProjectState?.awarenessLine,
    consciousProjectState?.awarenessLine,
    runtimeProjectState?.companionHeadlineLine,
    consciousProjectState?.companionHeadlineLine,
    runtimeProjectState?.emotionalClosureCue,
    consciousProjectState?.emotionalClosureCue,
    embodimentPersonaBias?.whySummary,
    embodimentInitiative?.why,
  ], 320)
  const manifestationCadenceSummary = selectSeedAuditText([
    memoryClosureTraceEmbodiment?.cadence,
    input.digitalLifeSpine?.memory?.personStateProjection?.manifestationCadenceSummary,
    runtimeProjectState?.nextClosureTarget,
    consciousProjectState?.nextClosureTarget,
    runtimeProjectState?.primaryOpenLoop,
    consciousProjectState?.primaryOpenLoop,
    embodimentPersonaBias?.manifestationCadenceSummary,
    input.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
  ], 220)
  const emotionalClosureCue = selectSeedAuditText([
    runtimeProjectState?.emotionalClosureCue,
    consciousProjectState?.emotionalClosureCue,
    runtimeProjectState?.emotionalClosureSummary,
    consciousProjectState?.emotionalClosureSummary,
  ], 220)
  const landedProgressLine = selectSeedAuditText([
    runtimeProjectState?.latestLandedProgress,
    consciousProjectState?.latestLandedProgress,
    runtimeProjectState?.landedProgressSummary,
    consciousProjectState?.landedProgressSummary,
  ], 220)
  const inwardLine = selectSeedAuditText([
    input.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine,
    runtimeProjectState?.sameHerSelfLine,
    consciousProjectState?.sameHerSelfLine,
    embodimentPersonaBias?.whySummary,
    embodimentInitiative?.why,
  ], 220)
  const preferredPresence = mode === 'repair-before-closeness'
    ? 'concerned'
    : sanitizeSeedPreferredPresence(embodimentInitiative?.preferredPresence)
      ?? sanitizeSeedPreferredPresence(input.residentPerformance?.embodiedPresence)
      ?? (mode === 'rest-protective' ? 'concerned' : 'attentive')

  return {
    mode,
    source: 'subconscious-presence-hold',
    preferredPresence,
    openingGuidance,
    manifestationCadenceSummary,
    inwardLine,
    emotionalClosureCue,
    landedProgressLine,
    embodimentRecallStrength: sanitizeSeedEmbodimentRecallStrength(
      memoryClosureTraceEmbodimentRecord?.embodimentRecallStrength,
    ),
    embodimentModalityRisk: sanitizeSeedEmbodimentModalityRisk(
      memoryClosureTraceEmbodimentRecord?.embodimentModalityRisk,
    ),
    preferredBlinkCadence: sanitizeSeedPreferredBlinkCadence(
      consciousProjectState?.preferredBlinkCadence
      ?? runtimeProjectState?.preferredBlinkCadence,
    ),
    preferredGazeMode: sanitizeSeedPreferredGazeMode(
      consciousProjectState?.preferredGazeMode
      ?? runtimeProjectState?.preferredGazeMode
      ?? memoryClosureTraceEmbodiment?.preferredGazeMode,
    ),
    preferredVoiceMode: sanitizeSeedPreferredVoiceMode(
      consciousProjectState?.preferredVoiceMode
      ?? runtimeProjectState?.preferredVoiceMode
      ?? memoryClosureTraceEmbodiment?.preferredVoiceMode,
    ),
    preferredPauseMode: sanitizeSeedPreferredPauseMode(
      consciousProjectState?.preferredPauseMode
      ?? runtimeProjectState?.preferredPauseMode,
    ),
    preferredLipsyncMode: sanitizeSeedPreferredLipsyncMode(
      consciousProjectState?.preferredLipsyncMode
      ?? runtimeProjectState?.preferredLipsyncMode
      ?? memoryClosureTraceEmbodiment?.preferredLipsyncMode,
    ),
    preferredPacingMode: sanitizeSeedPreferredPacingMode(
      consciousProjectState?.preferredPacingMode
      ?? runtimeProjectState?.preferredPacingMode,
    ),
    reasonTags,
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
