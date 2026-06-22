import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueEmbodimentRendererHints,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationEmbodimentScriptV1,
  AlicizationEmbodimentSpeechSegment,
  AlicizationResidentPerformanceSnapshot,
  AlicizationSpeechProsodyPauseClass,
  CharacterPerformanceCapabilitiesManifest,
} from '@proj-alicization/stage-shared'

import type { AlicizationRuntimeEmbodimentSeed } from './runtime-embodiment-seed'

import {
  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  buildAlicizationEmbodimentFaceCue,
  buildAlicizationEmbodimentLipSyncHints,
  buildAlicizationEmbodimentMotionBurst,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationEmbodimentScript,
} from '@proj-alicization/stage-shared'

function areDialoguePerformancesEqual(
  left: AlicizationDialoguePerformancePayload,
  right: AlicizationDialoguePerformancePayload,
) {
  return left.baseEmotion === right.baseEmotion
    && left.emotion === right.emotion
    && left.facialCue === right.facialCue
    && left.actionCue === right.actionCue
    && left.delivery === right.delivery
    && left.emphasis === right.emphasis
}

function sanitizeCadenceText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).toLowerCase()
}

function includesCadenceNeedle(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function clampRuntimeRateMultiplier(value: number, fallback = 1) {
  if (!Number.isFinite(value))
    return fallback
  return Number(Math.min(2, Math.max(0.5, value)).toFixed(2))
}

function clampRuntimeUnit(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback
  return Number(Math.min(1, Math.max(0, value)).toFixed(2))
}

function clampRuntimePitchDelta(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback
  return Math.round(Math.min(50, Math.max(-50, value)))
}

function mapEmbodimentResidentModeToPerformanceResidentMode(
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined,
): AlicizationDialoguePerformancePayload['residentMode'] {
  if (!residentMode)
    return null

  // Script continuity can stay more specific than the host-visible performance posture.
  if (residentMode === 'same-thread-continuation')
    return 'measured-return'

  return residentMode
}

type AlicizationRuntimeEmbodimentProjection = NonNullable<
  NonNullable<
    Exclude<AlicizationRuntimeEmbodimentSeed['digitalLifeSpine'], null>['memory']
  >['personStateProjection']
>

interface AlicizationLegacyProjectionContinuityState {
  currentRegime?: string | null
  rhythmState?: {
    cadenceMode?: string | null
  } | null
}

type AlicizationLegacyProjectionRecord = Record<string, unknown> & {
  relationshipDoctrine?: unknown
  trustRationale?: unknown
  personalityContinuityState?: AlicizationLegacyProjectionContinuityState | null
}

type AlicizationCoordinatorRuntimeProjectState = Record<string, unknown> & {
  companionHeadlineLine?: unknown
  currentPhase?: unknown
  emotionalClosureCue?: unknown
  emotionalClosureSummary?: unknown
  identity?: unknown
  landedProgressSummary?: unknown
  latestLandedProgress?: unknown
  nextClosureTarget?: unknown
  nextClosureTargetSummary?: unknown
  openClosureSummary?: unknown
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
  primaryOpenLoop?: unknown
  sameHerSelfLine?: unknown
}

function sanitizeCoordinatorPreferredBlinkCadence(
  raw: unknown,
): NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredBlinkCadence']> | null {
  return raw === 'normal' || raw === 'linger' || raw === 'quiet'
    ? raw
    : null
}

function sanitizeCoordinatorPreferredGazeMode(
  raw: unknown,
): NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredGazeMode']> | null {
  return raw === 'steady' || raw === 'soften' || raw === 'drift'
    ? raw
    : null
}

function sanitizeCoordinatorPreferredVoiceMode(
  raw: unknown,
): NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredVoiceMode']> | null {
  return raw === 'lower-pressure' || raw === 'even'
    ? raw as NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredVoiceMode']>
    : null
}

function sanitizeCoordinatorPreferredPauseMode(
  raw: unknown,
): NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredPauseMode']> | null {
  return raw === 'longer' || raw === 'natural'
    ? raw as NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredPauseMode']>
    : null
}

function sanitizeCoordinatorPreferredLipsyncMode(
  raw: unknown,
): NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredLipsyncMode']> | null {
  return raw === 'restrained' || raw === 'matched'
    ? raw as NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredLipsyncMode']>
    : null
}

function sanitizeCoordinatorPreferredPacingMode(
  raw: unknown,
): NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredPacingMode']> | null {
  return raw === 'slower' || raw === 'natural'
    ? raw as NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredPacingMode']>
    : null
}

function sanitizeCoordinatorEmbodimentRecallStrength(raw: unknown) {
  return raw === 'lightly-noticed' || raw === 'strongly-moved' || raw === 'cautious-avoidance'
    ? raw
    : null
}

function sanitizeCoordinatorEmbodimentModalityRisk(raw: unknown) {
  return raw === 'low' || raw === 'medium' || raw === 'high'
    ? raw
    : null
}

function resolveCoordinatorRuntimeProjectState(seed: AlicizationRuntimeEmbodimentSeed | null | undefined) {
  const runtimeProjectState = seed?.digitalLifeSpine?.runtime?.projectState
  return runtimeProjectState && typeof runtimeProjectState === 'object' && !Array.isArray(runtimeProjectState)
    ? runtimeProjectState as AlicizationCoordinatorRuntimeProjectState
    : null
}

function resolveCoordinatorRuntimeProjectStateText(input: {
  projectState: AlicizationCoordinatorRuntimeProjectState | null
  explicitKey: keyof AlicizationCoordinatorRuntimeProjectState
  summaryKey?: keyof AlicizationCoordinatorRuntimeProjectState
  maxChars?: number
}) {
  const explicitValue = sanitizeCadenceText(
    input.projectState?.[input.explicitKey],
    input.maxChars,
  )
  if (explicitValue)
    return explicitValue

  if (!input.summaryKey)
    return ''

  return sanitizeCadenceText(
    input.projectState?.[input.summaryKey],
    input.maxChars,
  )
}

function resolveCoordinatorExplicitRendererPreferences(seed: AlicizationRuntimeEmbodimentSeed | null | undefined) {
  if (!seed) {
    return {
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      preferredVoiceMode: null,
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredPacingMode: null,
    }
  }

  const consciousProjectState = seed.currentConsciousFrame?.projectState
  const runtimeProjectState = resolveCoordinatorRuntimeProjectState(seed)
  const silentContinuity = seed.silentContinuity ?? null

  return {
    preferredBlinkCadence: sanitizeCoordinatorPreferredBlinkCadence(
      consciousProjectState?.preferredBlinkCadence
      ?? runtimeProjectState?.preferredBlinkCadence
      ?? silentContinuity?.preferredBlinkCadence
      ?? (hasCorrectedSamePersonQuietEmbodimentSettlingCue(seed) ? 'quiet' : null)
      ?? null,
    ),
    preferredGazeMode: sanitizeCoordinatorPreferredGazeMode(
      consciousProjectState?.preferredGazeMode
      ?? runtimeProjectState?.preferredGazeMode
      ?? silentContinuity?.preferredGazeMode
      ?? null,
    ),
    preferredVoiceMode: sanitizeCoordinatorPreferredVoiceMode(
      consciousProjectState?.preferredVoiceMode
      ?? runtimeProjectState?.preferredVoiceMode
      ?? silentContinuity?.preferredVoiceMode
      ?? null,
    ),
    preferredPauseMode: sanitizeCoordinatorPreferredPauseMode(
      consciousProjectState?.preferredPauseMode
      ?? runtimeProjectState?.preferredPauseMode
      ?? silentContinuity?.preferredPauseMode
      ?? null,
    ),
    preferredLipsyncMode: sanitizeCoordinatorPreferredLipsyncMode(
      consciousProjectState?.preferredLipsyncMode
      ?? runtimeProjectState?.preferredLipsyncMode
      ?? silentContinuity?.preferredLipsyncMode
      ?? null,
    ),
    preferredPacingMode: sanitizeCoordinatorPreferredPacingMode(
      consciousProjectState?.preferredPacingMode
      ?? runtimeProjectState?.preferredPacingMode
      ?? silentContinuity?.preferredPacingMode
      ?? null,
    ),
  }
}

type AlicizationCoordinatorExplicitRendererPreferences = ReturnType<typeof resolveCoordinatorExplicitRendererPreferences>

function stripNullCoordinatorExplicitRendererPreferences(
  preferences: AlicizationCoordinatorExplicitRendererPreferences,
) {
  const nonNullPreferences: Partial<{
    preferredBlinkCadence: NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredBlinkCadence']>
    preferredGazeMode: NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredGazeMode']>
    preferredVoiceMode: NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredVoiceMode']>
    preferredPauseMode: NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredPauseMode']>
    preferredLipsyncMode: NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredLipsyncMode']>
    preferredPacingMode: NonNullable<AlicizationDialogueEmbodimentRendererHints['preferredPacingMode']>
  }> = {}

  if (preferences.preferredBlinkCadence)
    nonNullPreferences.preferredBlinkCadence = preferences.preferredBlinkCadence
  if (preferences.preferredGazeMode)
    nonNullPreferences.preferredGazeMode = preferences.preferredGazeMode
  if (preferences.preferredVoiceMode)
    nonNullPreferences.preferredVoiceMode = preferences.preferredVoiceMode
  if (preferences.preferredPauseMode)
    nonNullPreferences.preferredPauseMode = preferences.preferredPauseMode
  if (preferences.preferredLipsyncMode)
    nonNullPreferences.preferredLipsyncMode = preferences.preferredLipsyncMode
  if (preferences.preferredPacingMode)
    nonNullPreferences.preferredPacingMode = preferences.preferredPacingMode

  return nonNullPreferences
}

function resolveCoordinatorSilentContinuityEmbodimentCarry(seed: AlicizationRuntimeEmbodimentSeed | null | undefined) {
  const silentContinuity = seed?.silentContinuity ?? null
  const consciousProjectState = seed?.currentConsciousFrame?.projectState ?? null
  const runtimeProjectState = seed ? resolveCoordinatorRuntimeProjectState(seed) : null
  return {
    embodimentRecallStrength: sanitizeCoordinatorEmbodimentRecallStrength(silentContinuity?.embodimentRecallStrength),
    embodimentModalityRisk: sanitizeCoordinatorEmbodimentModalityRisk(silentContinuity?.embodimentModalityRisk),
    preferredGazeMode: sanitizeCoordinatorPreferredGazeMode(
      silentContinuity?.preferredGazeMode
      ?? consciousProjectState?.preferredGazeMode
      ?? runtimeProjectState?.preferredGazeMode,
    ),
    preferredBlinkCadence: sanitizeCoordinatorPreferredBlinkCadence(
      silentContinuity?.preferredBlinkCadence
      ?? consciousProjectState?.preferredBlinkCadence
      ?? runtimeProjectState?.preferredBlinkCadence,
    ),
    preferredVoiceMode: sanitizeCoordinatorPreferredVoiceMode(
      silentContinuity?.preferredVoiceMode
      ?? consciousProjectState?.preferredVoiceMode
      ?? runtimeProjectState?.preferredVoiceMode,
    ),
    preferredPauseMode: sanitizeCoordinatorPreferredPauseMode(
      silentContinuity?.preferredPauseMode
      ?? consciousProjectState?.preferredPauseMode
      ?? runtimeProjectState?.preferredPauseMode,
    ),
    preferredLipsyncMode: sanitizeCoordinatorPreferredLipsyncMode(
      silentContinuity?.preferredLipsyncMode
      ?? consciousProjectState?.preferredLipsyncMode
      ?? runtimeProjectState?.preferredLipsyncMode,
    ),
    preferredPacingMode: sanitizeCoordinatorPreferredPacingMode(
      silentContinuity?.preferredPacingMode
      ?? consciousProjectState?.preferredPacingMode
      ?? runtimeProjectState?.preferredPacingMode,
    ),
  }
}

function hasQuieterMeasuredReturnRendererPreference(
  preferences: AlicizationCoordinatorExplicitRendererPreferences,
) {
  return preferences.preferredVoiceMode === 'lower-pressure'
    || preferences.preferredPauseMode === 'longer'
    || preferences.preferredLipsyncMode === 'restrained'
    || preferences.preferredPacingMode === 'slower'
}

function hasRememberedEmbodimentRecallSettlingCue(seed: AlicizationRuntimeEmbodimentSeed | null | undefined) {
  const carry = resolveCoordinatorSilentContinuityEmbodimentCarry(seed)
  return carry.embodimentRecallStrength === 'strongly-moved'
    || (
      carry.embodimentRecallStrength !== 'cautious-avoidance'
      && (
        carry.preferredPacingMode === 'slower'
        || carry.preferredPauseMode === 'longer'
        || carry.preferredLipsyncMode === 'restrained'
        || (
          carry.preferredVoiceMode === 'lower-pressure'
          && (
            carry.embodimentModalityRisk === 'high'
            || carry.embodimentModalityRisk === 'medium'
          )
        )
      )
    )
}

type AlicizationCoordinatorSilentContinuityEmbodimentCarry = ReturnType<
  typeof resolveCoordinatorSilentContinuityEmbodimentCarry
>

interface AlicizationCoordinatorMeasuredReturnEmbodimentBias {
  extraSettleMs: number
  extraTempoShift: number
  extraVoiceRateTightening: number
  extraVoiceEnergyTightening: number
  extraVoiceCadenceTightening: number
  extraContinuityHoldMs: number
  extraFaceHoldMs: number
  extraActionHoldMs: number
  extraFrameContinuityHoldMs: number
  extraFrameFaceHoldMs: number
  extraFrameActionHoldMs: number
}

function createEmptyCoordinatorMeasuredReturnEmbodimentBias(): AlicizationCoordinatorMeasuredReturnEmbodimentBias {
  return {
    extraSettleMs: 0,
    extraTempoShift: 0,
    extraVoiceRateTightening: 0,
    extraVoiceEnergyTightening: 0,
    extraVoiceCadenceTightening: 0,
    extraContinuityHoldMs: 0,
    extraFaceHoldMs: 0,
    extraActionHoldMs: 0,
    extraFrameContinuityHoldMs: 0,
    extraFrameFaceHoldMs: 0,
    extraFrameActionHoldMs: 0,
  }
}

function resolveCoordinatorMeasuredReturnEmbodimentBias(input: {
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  quieterMeasuredReturnSettling?: boolean
  explicitEmbodimentCarry?: AlicizationCoordinatorSilentContinuityEmbodimentCarry | null
}) {
  const measuredReturnCarry = input.companionshipResidentMode === 'measured-return'
    && input.quieterMeasuredReturnSettling === true
  const repairBeforeClosenessCarry = input.companionshipResidentMode === 'repair-before-closeness'

  if (!measuredReturnCarry && !repairBeforeClosenessCarry)
    return createEmptyCoordinatorMeasuredReturnEmbodimentBias()

  const carry = input.explicitEmbodimentCarry ?? null
  if (!carry)
    return createEmptyCoordinatorMeasuredReturnEmbodimentBias()

  let extraSettleMs = 0
  let extraTempoShift = 0
  let extraVoiceRateTightening = 0
  let extraVoiceEnergyTightening = 0
  let extraVoiceCadenceTightening = 0
  let extraContinuityHoldMs = 0
  let extraFaceHoldMs = 0
  let extraActionHoldMs = 0
  let extraFrameContinuityHoldMs = 0
  let extraFrameFaceHoldMs = 0
  let extraFrameActionHoldMs = 0

  if (carry.preferredPauseMode === 'longer') {
    extraSettleMs += 28
    extraContinuityHoldMs += 20
    extraFaceHoldMs += 14
    extraActionHoldMs += 8
    extraFrameContinuityHoldMs += 16
    extraFrameFaceHoldMs += 10
    extraFrameActionHoldMs += 6
  }

  if (carry.preferredPacingMode === 'slower') {
    extraSettleMs += 12
    extraTempoShift -= 0.04
    extraVoiceRateTightening += 0.02
    extraVoiceCadenceTightening += 0.03
    extraContinuityHoldMs += 8
    extraFrameContinuityHoldMs += 6
  }

  if (carry.preferredVoiceMode === 'lower-pressure') {
    const highRisk = carry.embodimentModalityRisk === 'high'
    const mediumRisk = carry.embodimentModalityRisk === 'medium'

    extraTempoShift -= highRisk ? 0.03 : mediumRisk ? 0.02 : 0.01
    extraVoiceRateTightening += highRisk ? 0.02 : mediumRisk ? 0.015 : 0.01
    extraVoiceEnergyTightening += highRisk ? 0.08 : mediumRisk ? 0.06 : 0.04
    extraVoiceCadenceTightening += highRisk ? 0.04 : mediumRisk ? 0.03 : 0.02
  }

  if (carry.preferredLipsyncMode === 'restrained') {
    extraContinuityHoldMs += 20
    extraFaceHoldMs += 8
    extraActionHoldMs += 4
    extraFrameContinuityHoldMs += 16
    extraFrameFaceHoldMs += 6
    extraFrameActionHoldMs += 4
  }

  return {
    extraSettleMs,
    extraTempoShift: Number(extraTempoShift.toFixed(2)),
    extraVoiceRateTightening: Number(extraVoiceRateTightening.toFixed(3)),
    extraVoiceEnergyTightening: Number(extraVoiceEnergyTightening.toFixed(3)),
    extraVoiceCadenceTightening: Number(extraVoiceCadenceTightening.toFixed(3)),
    extraContinuityHoldMs,
    extraFaceHoldMs,
    extraActionHoldMs,
    extraFrameContinuityHoldMs,
    extraFrameFaceHoldMs,
    extraFrameActionHoldMs,
  } satisfies AlicizationCoordinatorMeasuredReturnEmbodimentBias
}

function resolveEmbodimentProjection(
  seed: AlicizationRuntimeEmbodimentSeed,
): AlicizationRuntimeEmbodimentProjection | AlicizationLegacyProjectionRecord | null {
  const canonicalProjection = seed.digitalLifeSpine?.memory?.personStateProjection
  if (canonicalProjection && typeof canonicalProjection === 'object')
    return canonicalProjection

  const legacyProjection = (seed.digitalLifeSpine as {
    personStateProjection?: unknown
  } | null)?.personStateProjection
  if (legacyProjection && typeof legacyProjection === 'object' && !Array.isArray(legacyProjection))
    return legacyProjection as AlicizationLegacyProjectionRecord

  return null
}

function resolveLegacyProjectionContinuityState(
  projection: AlicizationRuntimeEmbodimentProjection | AlicizationLegacyProjectionRecord | null,
) {
  const continuityState = (projection as AlicizationLegacyProjectionRecord | null)?.personalityContinuityState
  return continuityState && typeof continuityState === 'object' && !Array.isArray(continuityState)
    ? continuityState
    : null
}

function readLegacyProjectionCadenceText(
  projection: AlicizationRuntimeEmbodimentProjection | AlicizationLegacyProjectionRecord | null,
  key: 'relationshipDoctrine' | 'trustRationale',
  maxChars: number,
) {
  return sanitizeCadenceText((projection as AlicizationLegacyProjectionRecord | null)?.[key], maxChars)
}

function resolveEmbodimentHabitPolicy(seed: AlicizationRuntimeEmbodimentSeed) {
  const canonicalHabit = seed.digitalLifeSpine?.habit
  if (canonicalHabit) {
    return {
      dominantMode: sanitizeCadenceText(canonicalHabit.dominantMode, 80),
      suggestedStyleCap: sanitizeCadenceText(canonicalHabit.suggestedStyleCap, 80),
      suggestedPresenceCap: sanitizeCadenceText(canonicalHabit.suggestedPresenceCap, 80),
      narrative: sanitizeCadenceText(canonicalHabit.narrative, 240),
    }
  }

  const legacyHabitPolicy = (seed.digitalLifeSpine as {
    runtimeSurface?: {
      agency?: {
        habitPolicy?: unknown
      } | null
    } | null
  } | null)?.runtimeSurface?.agency?.habitPolicy
  if (!legacyHabitPolicy || typeof legacyHabitPolicy !== 'object' || Array.isArray(legacyHabitPolicy))
    return null

  const candidate = legacyHabitPolicy as Record<string, unknown>
  const narrative = Array.isArray(candidate.narrative)
    ? candidate.narrative
        .map((item: unknown) => sanitizeCadenceText(item, 120))
        .filter(Boolean)
        .join(' | ')
    : sanitizeCadenceText(candidate.narrative, 240)

  return {
    dominantMode: sanitizeCadenceText(candidate.dominantMode, 80),
    suggestedStyleCap: sanitizeCadenceText(candidate.suggestedStyleCap, 80),
    suggestedPresenceCap: sanitizeCadenceText(candidate.suggestedPresenceCap, 80),
    narrative,
  }
}

function reconcileRuntimeVoiceAuthority(input: {
  voice: AlicizationDigitalLifeEnvelope['voice']
  speechStyle?: AlicizationDigitalLifeEnvelope['speechStyle']
  recovering: boolean
  settledCompanionship: boolean
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  lowerPressureTiming: boolean
  callbackSameThreadMeasuredReturn?: boolean
  quieterMeasuredReturnSettling?: boolean
  explicitMeasuredReturnBias?: AlicizationCoordinatorMeasuredReturnEmbodimentBias
}) {
  const pitchDeltaOffset = input.recovering
    ? 0
    : input.settledCompanionship && input.companionshipResidentMode === 'repair-before-closeness'
      ? -2
      : input.settledCompanionship && input.companionshipResidentMode === 'measured-return'
        ? -1
        : 0
  const ceilings = input.recovering
    ? {
        rateMultiplier: 0.9,
        energy: 0.26,
        cadence: 0.24,
      }
    : input.settledCompanionship && input.companionshipResidentMode === 'repair-before-closeness'
      ? {
          rateMultiplier: 0.92,
          energy: 0.4,
          cadence: 0.34,
        }
      : input.settledCompanionship && input.companionshipResidentMode === 'measured-return'
        ? input.quieterMeasuredReturnSettling
          ? {
              rateMultiplier: 0.94,
              energy: 0.4,
              cadence: 0.34,
            }
          : input.callbackSameThreadMeasuredReturn
            ? {
                rateMultiplier: 0.96,
                energy: 0.5,
                cadence: 0.46,
              }
            : {
                rateMultiplier: 0.96,
                energy: 0.44,
                cadence: 0.38,
              }
        : input.settledCompanionship
          ? {
              rateMultiplier: 0.98,
              energy: 0.48,
              cadence: 0.42,
            }
          : input.lowerPressureTiming
            ? {
                rateMultiplier: 0.98,
                energy: 0.5,
                cadence: 0.4,
              }
            : null

  if (!ceilings) {
    return {
      speechStyle: input.speechStyle,
      voice: input.voice,
    }
  }

  const rateMultiplierCeiling = Math.max(
    0.5,
    ceilings.rateMultiplier - (input.explicitMeasuredReturnBias?.extraVoiceRateTightening ?? 0),
  )
  const energyCeiling = Math.max(
    0,
    ceilings.energy - (input.explicitMeasuredReturnBias?.extraVoiceEnergyTightening ?? 0),
  )
  const cadenceCeiling = Math.max(
    0,
    ceilings.cadence - (input.explicitMeasuredReturnBias?.extraVoiceCadenceTightening ?? 0),
  )

  const voice = {
    ...input.voice,
    pitchDelta: clampRuntimePitchDelta(
      input.voice.pitchDelta + pitchDeltaOffset,
      input.voice.pitchDelta,
    ),
    rateMultiplier: clampRuntimeRateMultiplier(
      Math.min(input.voice.rateMultiplier, rateMultiplierCeiling),
      input.voice.rateMultiplier,
    ),
    energy: clampRuntimeUnit(
      Math.min(input.voice.energy, energyCeiling),
      input.voice.energy,
    ),
    cadence: clampRuntimeUnit(
      Math.min(input.voice.cadence, cadenceCeiling),
      input.voice.cadence,
    ),
  }

  return {
    speechStyle: input.speechStyle
      ? {
          ...input.speechStyle,
          pitchDelta: voice.pitchDelta,
          rateMultiplier: voice.rateMultiplier,
        }
      : undefined,
    voice,
  }
}

function reconcileRuntimeMotorAuthority(input: {
  motor: AlicizationDigitalLifeEnvelope['motor']
  recovering: boolean
  settledCompanionship: boolean
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  lowerPressureTiming: boolean
  quieterMeasuredReturnSettling?: boolean
  explicitEmbodimentCarry?: ReturnType<typeof resolveCoordinatorSilentContinuityEmbodimentCarry>
}) {
  const floors = input.recovering
    ? {
        stillness: 0.28,
        gazeStability: 0.18,
        breathAmplitude: 0.04,
      }
    : input.settledCompanionship && input.companionshipResidentMode === 'repair-before-closeness'
      ? {
          stillness: 0.24,
          gazeStability: 0.16,
          breathAmplitude: 0.02,
        }
      : input.settledCompanionship && input.companionshipResidentMode === 'measured-return'
        ? input.quieterMeasuredReturnSettling
          ? {
              stillness: 0.22,
              gazeStability: 0.16,
              breathAmplitude: 0.03,
            }
          : {
              stillness: 0.18,
              gazeStability: 0.14,
              breathAmplitude: 0.02,
            }
        : input.settledCompanionship || input.lowerPressureTiming
          ? {
              stillness: 0.14,
              gazeStability: 0.1,
              breathAmplitude: 0.02,
            }
          : null

  const expressivityCeiling = input.recovering
    ? 0.06
    : input.settledCompanionship && input.companionshipResidentMode === 'repair-before-closeness'
      ? 0.08
      : input.settledCompanionship && input.companionshipResidentMode === 'measured-return'
        ? input.quieterMeasuredReturnSettling ? 0.1 : 0.12
        : input.settledCompanionship || input.lowerPressureTiming
          ? 0.18
          : null

  if (!floors || expressivityCeiling == null)
    return input.motor

  const quieterStillnessLift = input.quieterMeasuredReturnSettling ? 0.04 : 0
  const quieterGazeLift = input.quieterMeasuredReturnSettling ? 0.03 : 0
  const quieterBreathCeiling = input.quieterMeasuredReturnSettling ? 0.08 : null
  const gazeStabilityCeiling = input.companionshipResidentMode === 'measured-return'
    && (
      input.explicitEmbodimentCarry?.embodimentRecallStrength === 'cautious-avoidance'
      || (
        input.explicitEmbodimentCarry?.preferredGazeMode !== 'steady'
        && input.explicitEmbodimentCarry?.preferredGazeMode === 'soften'
      )
    )
    ? 0.96
    : null

  return {
    ...input.motor,
    stillness: clampRuntimeUnit(
      Math.max(input.motor.stillness + quieterStillnessLift, floors.stillness),
      input.motor.stillness,
    ),
    gaze: {
      ...input.motor.gaze,
      stability: clampRuntimeUnit(
        gazeStabilityCeiling == null
          ? Math.max(input.motor.gaze.stability + quieterGazeLift, floors.gazeStability)
          : Math.min(
              Math.max(input.motor.gaze.stability + quieterGazeLift, floors.gazeStability),
              gazeStabilityCeiling,
            ),
        input.motor.gaze.stability,
      ),
    },
    breath: {
      ...input.motor.breath,
      amplitude: clampRuntimeUnit(
        quieterBreathCeiling == null
          ? Math.max(input.motor.breath.amplitude, floors.breathAmplitude)
          : Math.min(
              Math.max(input.motor.breath.amplitude, floors.breathAmplitude),
              quieterBreathCeiling,
            ),
        input.motor.breath.amplitude,
      ),
    },
    expressivity: clampRuntimeUnit(Math.min(input.motor.expressivity, expressivityCeiling), input.motor.expressivity),
  }
}

function hasLowerPressureRelationshipTiming(seed: AlicizationRuntimeEmbodimentSeed) {
  const personaBias = seed.digitalLifeSpine?.proactive?.personaBias ?? null
  const manifestationCadenceSummary = sanitizeCadenceText(personaBias?.manifestationCadenceSummary, 220)
  const relationshipDoctrine = sanitizeCadenceText(
    seed.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
    220,
  )
  const outcomeSummary = sanitizeCadenceText(seed.digitalLifeSpine?.outcomeLearning?.summary, 220)
  const latestInflection = sanitizeCadenceText(seed.digitalLifeSpine?.outcomeLearning?.latestInflection, 220)

  return includesCadenceNeedle(manifestationCadenceSummary, [
    'observe-first',
    'stay slower',
    'slower until the opening softens',
    'lower-pressure',
  ]) || includesCadenceNeedle(
    `${relationshipDoctrine} ${outcomeSummary} ${latestInflection}`,
    [
      'lower-pressure',
      'pressure stayed low',
      'return stayed slower',
      'slower return',
      'keep more room',
      'repair should settle before closeness expands',
      'do not crowd',
      'less eager',
    ],
  )
}

function hasRememberedSeamMoreRoomCue(input: {
  seed: AlicizationRuntimeEmbodimentSeed
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
}) {
  const residentReasonTags = input.residentPerformance?.reasonTags ?? []
  const consciousReasonTags = input.seed.currentConsciousFrame?.reasonTags ?? []
  if (residentReasonTags.includes('timing:remembered-seam-more-room'))
    return true
  if (consciousReasonTags.includes('remembered-seam:reinterpret-with-more-room'))
    return true

  const relationshipDoctrine = sanitizeCadenceText(
    input.seed.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
    220,
  )
  const rememberedSeamInflection = sanitizeCadenceText(
    input.seed.digitalLifeSpine?.outcomeLearning?.latestInflection,
    220,
  )
  const manifestationCadenceSummary = sanitizeCadenceText(
    input.seed.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
    220,
  )
  const silentContinuityOpeningGuidance = sanitizeCadenceText(
    input.seed.silentContinuity?.openingGuidance,
    220,
  )
  const silentContinuityManifestationCadenceSummary = sanitizeCadenceText(
    input.seed.silentContinuity?.manifestationCadenceSummary,
    220,
  )
  const silentContinuityInwardLine = sanitizeCadenceText(
    input.seed.silentContinuity?.inwardLine,
    220,
  )
  const silentContinuityEmotionalClosureCue = sanitizeCadenceText(
    input.seed.silentContinuity?.emotionalClosureCue,
    220,
  )
  const silentContinuityLandedProgressLine = sanitizeCadenceText(
    input.seed.silentContinuity?.landedProgressLine,
    220,
  )
  const outcomeSummary = sanitizeCadenceText(input.seed.digitalLifeSpine?.outcomeLearning?.summary, 220)
  const outcomeInflection = sanitizeCadenceText(input.seed.digitalLifeSpine?.outcomeLearning?.latestInflection, 220)
  const runtimeContinuityCue = sanitizeCadenceText(input.seed.digitalLifeSpine?.runtime?.continuityCue, 220)
  const memorySummary = sanitizeCadenceText(input.seed.digitalLifeSpine?.memory?.summary, 220)
  const combined = [
    relationshipDoctrine,
    rememberedSeamInflection,
    manifestationCadenceSummary,
    silentContinuityOpeningGuidance,
    silentContinuityManifestationCadenceSummary,
    silentContinuityInwardLine,
    silentContinuityEmotionalClosureCue,
    silentContinuityLandedProgressLine,
    outcomeSummary,
    outcomeInflection,
    runtimeContinuityCue,
    memorySummary,
  ].filter(Boolean).join(' ')

  const explicitRememberedSeamSignal = includesCadenceNeedle(combined, [
    'remembered seam',
    'same remembered seam',
    'same seam is back',
    'seam is back',
    'the seam is back',
    'reopened too eagerly',
    'reopen too eagerly',
  ])
  const callbackAfterglowSignal = includesCadenceNeedle(combined, [
    'callback afterglow',
  ])
  const moreRoomSignal = includesCadenceNeedle(combined, [
    'keep more room',
    'leave more room',
    'leave room before warmth returns',
    'more room before leaning in again',
    'more room before warmth widens',
    'slow the return',
    'slower reopening',
    'this time keep more room',
    'this time leave more room',
  ])
  const explicitRememberedSeamReopenSignal = includesCadenceNeedle(combined, [
    'reopened too eagerly',
    'reopen too eagerly',
    'this time keep more room',
    'this time leave more room',
  ])

  if (explicitRememberedSeamSignal && moreRoomSignal)
    return true

  return callbackAfterglowSignal && moreRoomSignal && explicitRememberedSeamReopenSignal
}

function hasRememberedInitiativeRhythmCue(seed: AlicizationRuntimeEmbodimentSeed) {
  const silentReasonTags = seed.silentContinuity?.reasonTags ?? []
  if (silentReasonTags.includes('initiative-rhythm-memory'))
    return true

  const memorySummary = sanitizeCadenceText(seed.digitalLifeSpine?.memory?.summary, 240)
  const proactiveCadenceSummary = sanitizeCadenceText(
    seed.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
    240,
  )
  const runtimeContinuityCue = sanitizeCadenceText(seed.digitalLifeSpine?.runtime?.continuityCue, 240)
  const silentContinuityOpeningGuidance = sanitizeCadenceText(seed.silentContinuity?.openingGuidance, 240)
  const silentContinuityCadenceSummary = sanitizeCadenceText(seed.silentContinuity?.manifestationCadenceSummary, 240)
  const silentContinuityEmotionalClosureCue = sanitizeCadenceText(seed.silentContinuity?.emotionalClosureCue, 240)
  const consciousNeed = sanitizeCadenceText(seed.currentConsciousFrame?.consciousNeed, 240)
  const speakingIntention = sanitizeCadenceText(seed.currentConsciousFrame?.speakingIntention, 240)
  const combined = [
    memorySummary,
    proactiveCadenceSummary,
    runtimeContinuityCue,
    silentContinuityOpeningGuidance,
    silentContinuityCadenceSummary,
    silentContinuityEmotionalClosureCue,
    consciousNeed,
    speakingIntention,
  ]
    .filter(Boolean)
    .join(' ')

  const visiblyReopening = includesCadenceNeedle(combined, [
    'visibly reopening',
    'already re-entering the same line',
    'same line is visibly reopening',
    'same line is reopening',
    're-entering the same line',
  ])
  const antiSpam = includesCadenceNeedle(combined, [
    'timer spam',
    'anti-spam',
    'anti spam',
    'not pushing',
    'i am not pushing you',
  ])
  const gentlerCadence = includesCadenceNeedle(combined, [
    'gentler cadence',
    'quieter and slower',
    'reply should stay quieter',
    'return only when',
    'wait until the same line is visibly reopening on its own',
    'wait until the host is already re-entering the same line',
  ])

  return visiblyReopening && (antiSpam || gentlerCadence)
}

function hasCorrectedSamePersonQuietEmbodimentSettlingCue(seed: AlicizationRuntimeEmbodimentSeed) {
  const habitPolicy = resolveEmbodimentHabitPolicy(seed)
  const habitNarrative = sanitizeCadenceText(habitPolicy?.narrative, 240)
  const memorySummary = sanitizeCadenceText(seed.digitalLifeSpine?.memory?.summary, 240)
  const autobiographicalIdentityNarrative = sanitizeCadenceText(
    seed.digitalLifeSpine?.embodiment?.autobiographicalSelf?.identityNarrative,
    240,
  )
  const autobiographicalRelationshipDoctrine = sanitizeCadenceText(
    seed.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
    240,
  )
  const autobiographicalLatestInflection = sanitizeCadenceText(
    (seed.digitalLifeSpine?.embodiment?.autobiographicalSelf as { latestInflection?: unknown } | null)?.latestInflection,
    240,
  )
  const proactiveCadenceSummary = sanitizeCadenceText(
    seed.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
    240,
  )
  const runtimeContinuityCue = sanitizeCadenceText(seed.digitalLifeSpine?.runtime?.continuityCue, 240)
  const silentContinuityOpeningGuidance = sanitizeCadenceText(seed.silentContinuity?.openingGuidance, 240)
  const silentContinuityCadenceSummary = sanitizeCadenceText(seed.silentContinuity?.manifestationCadenceSummary, 240)
  const combined = [
    habitNarrative,
    memorySummary,
    autobiographicalIdentityNarrative,
    autobiographicalRelationshipDoctrine,
    autobiographicalLatestInflection,
    proactiveCadenceSummary,
    runtimeContinuityCue,
    silentContinuityOpeningGuidance,
    silentContinuityCadenceSummary,
  ].filter(Boolean).join(' ')

  const correctedSamePersonSettling = includesCadenceNeedle(combined, [
    'self-evolution:corrected-same-person-manifestation',
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    '纠正后的同一人格连续性',
    '同一人连续性',
  ])
  const quieterEmbodimentSettling = includesCadenceNeedle(combined, [
    'self-evolution:quieter-embodiment-settling',
    'embodiment quieter',
    'body quieter',
    'body should stay quieter',
    'body settle more quietly',
    'let the body settle more quietly',
    '身体更安静',
    '先把身体收稳',
  ])

  return correctedSamePersonSettling || quieterEmbodimentSettling
}

function resolveResidentCompanionshipMode(residentPerformance: AlicizationResidentPerformanceSnapshot | null) {
  if (residentPerformance?.source !== 'main-runtime')
    return null

  const reasonTags = residentPerformance.reasonTags ?? []
  const hasRestProtectivePressure = residentPerformance?.emotionalTension === 'late-night-drain'
    && (
      reasonTags.includes('rest-protective')
      || reasonTags.includes('rest-protective-companionship')
      || reasonTags.includes('quiet-companionship')
    )

  if (hasRestProtectivePressure)
    return 'quiet-companionship' as const
  if (residentPerformance?.emotionalTension === 'late-night-drain')
    return 'repair-before-closeness' as const
  if (residentPerformance?.emotionalTension === 'restless-switching')
    return 'measured-return' as const

  if (reasonTags.includes('repair-before-closeness'))
    return 'repair-before-closeness' as const
  if (reasonTags.includes('measured-return'))
    return 'measured-return' as const
  return 'quiet-companionship' as const
}

function resolveSilentSeedEmbodimentRestraint(seed: AlicizationRuntimeEmbodimentSeed) {
  const silentContinuity = seed.silentContinuity ?? null
  if (!silentContinuity)
    return null
  if (silentContinuity.mode === 'repair-before-closeness')
    return 'repair-before-closeness' as const
  if (silentContinuity.mode === 'measured-return')
    return 'measured-return' as const
  if (silentContinuity.mode === 'rest-protective')
    return 'quiet-companionship' as const
  return null
}

function resolveProactiveEmbodimentRestraint(seed: AlicizationRuntimeEmbodimentSeed) {
  const restraint = seed.digitalLifeSpine?.proactive?.continuityRestraint ?? null
  if (restraint === 'rest-protective')
    return 'quiet-companionship' as const
  if (restraint === 'repair-before-closeness')
    return 'repair-before-closeness' as const
  if (restraint === 'measured-return' || restraint === 'lower-pressure')
    return 'measured-return' as const
  return null
}

function resolveRuntimeContinuityArcEmbodimentRestraint(seed: AlicizationRuntimeEmbodimentSeed) {
  const arcStage = sanitizeCadenceText(seed.digitalLifeSpine?.runtime?.continuityArcStage, 64)
  const continuityCue = sanitizeCadenceText(seed.digitalLifeSpine?.runtime?.continuityCue, 220)

  if (
    arcStage === 'hold-for-opening'
    || (!arcStage && includesCadenceNeedle(continuityCue, [
      'hold-for-opening',
      'same line',
      'same-line',
      'reopen gently later',
      'wait for a later opening',
      'reopen gently',
      '先留白',
      '同一条生命线',
      '同一条线',
      '等更自然的 opening',
      '慢一点回来',
      '慢一点接回去',
      '别立刻把温度放大',
    ]))
  ) {
    return 'measured-return' as const
  }

  if (arcStage === 'gentle-reopen')
    return 'measured-return' as const

  if (
    arcStage === 'same-thread-continuation'
    || (!arcStage && includesCadenceNeedle(continuityCue, [
      'same-thread-continuation',
      'same thread continuation',
      'continue the same line',
      'same callback seam',
      'already-reopened line',
      'already reopened line',
    ]))
  ) {
    return 'measured-return' as const
  }

  return null
}

function resolveAffectiveResidueEmbodimentRestraint(seed: AlicizationRuntimeEmbodimentSeed) {
  const affectiveResidue = seed.affectiveResidue ?? null
  const cadence = affectiveResidue?.relationshipCadence ?? null
  if (affectiveResidue && cadence) {
    const restProtective = affectiveResidue.dominantResidueKind === 'rest-protective'
      || cadence.shouldProtectRest === true
      || affectiveResidue.restProtectivePressure >= 0.42
      || (cadence.fatigueGuard ?? 0) >= 0.42
    const repairFirst = cadence.cadenceMode === 'repair'
      || (
        affectiveResidue.dominantResidueKind === 'repair'
        && (
          affectiveResidue.repairPressure >= 0.42
          || (cadence.repairRecovery ?? 0) >= 0.42
          || cadence.shouldDelayWarmth === true
        )
      )
    const measuredReturn = cadence.cadenceMode === 'measured-return'
      || cadence.cadenceMode === 'cooldown'
      || cadence.shouldDelayWarmth === true
      || (cadence.afterglowCarry ?? 0) >= 0.22
      || (cadence.overreachRisk ?? 0) >= 0.24
      || (
        affectiveResidue.dominantResidueKind === 'afterglow'
        && affectiveResidue.afterglowPressure >= 0.24
      )

    if (restProtective)
      return 'quiet-companionship' as const
    if (repairFirst)
      return 'repair-before-closeness' as const
    if (measuredReturn)
      return 'measured-return' as const
  }

  const memorySummary = sanitizeCadenceText(seed.digitalLifeSpine?.memory?.summary, 220)
  const outcomeSummary = sanitizeCadenceText(seed.digitalLifeSpine?.outcomeLearning?.summary, 220)
  const latestInflection = sanitizeCadenceText(seed.digitalLifeSpine?.outcomeLearning?.latestInflection, 220)
  const manifestationCadenceSummary = sanitizeCadenceText(
    seed.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
    220,
  )
  const continuityCue = sanitizeCadenceText(seed.digitalLifeSpine?.runtime?.continuityCue, 220)
  const combined = [
    memorySummary,
    outcomeSummary,
    latestInflection,
    manifestationCadenceSummary,
    continuityCue,
  ].filter(Boolean).join(' ')

  const affectiveResiduePressure = includesCadenceNeedle(combined, [
    'afterglow',
    'affective residue',
    'residue',
    'shared seam still glowing',
    'seam is still glowing',
    'still glowing',
    'still warm',
    'glow is still there',
  ])
  if (!affectiveResiduePressure)
    return null

  if (includesCadenceNeedle(combined, [
    'repair-before-closeness',
    'repair should settle before closeness expands',
  ])) {
    return 'repair-before-closeness' as const
  }

  if (includesCadenceNeedle(combined, [
    'measured-return',
    'lower-pressure',
    'stay slower',
    'slower return',
    'continue more slowly',
    'same-thread-continuation',
    'leave room before warmth returns',
    'leave room before warmth',
    'do not widen warmth yet',
    'should not widen yet',
    'should not widen immediately',
    'instead of widening immediately',
    '先留白',
    '同一条生命线',
    '同一条线',
    '慢一点回来',
    '慢一点接回去',
    '别立刻把温度放大',
  ])) {
    return 'measured-return' as const
  }

  return null
}

function resolveProjectStateEmbodimentRestraint(seed: AlicizationRuntimeEmbodimentSeed) {
  const runtimeProjectState = resolveCoordinatorRuntimeProjectState(seed)
  const currentPhase = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'currentPhase',
    maxChars: 120,
  })
  const primaryOpenLoop = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'primaryOpenLoop',
    summaryKey: 'openClosureSummary',
    maxChars: 220,
  })
  const nextClosureTarget = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'nextClosureTarget',
    summaryKey: 'nextClosureTargetSummary',
    maxChars: 220,
  })
  const identity = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'identity',
    maxChars: 180,
  })
  const sameHerSelfLine = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'sameHerSelfLine',
    maxChars: 220,
  })
  const emotionalClosureCue = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'emotionalClosureCue',
    summaryKey: 'emotionalClosureSummary',
    maxChars: 220,
  })
  const latestLandedProgress = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'latestLandedProgress',
    summaryKey: 'landedProgressSummary',
    maxChars: 220,
  })
  const combined = `${currentPhase} ${primaryOpenLoop} ${nextClosureTarget} ${identity} ${sameHerSelfLine} ${emotionalClosureCue} ${latestLandedProgress}`

  const phaseOneDigitalLife = includesCadenceNeedle(combined, [
    'phase 1',
    'local digital life',
    'digital life',
  ])
  const sameHerPressure = includesCadenceNeedle(combined, [
    'same-her',
    'same digital life',
    'personhood continuity',
    'relationship continuity',
    'one same',
    'same living line',
    'unfinished closure',
    'one continuous her',
  ])
  const repairBeforeClosenessPressure = includesCadenceNeedle(combined, [
    'repair-before-closeness',
    'repair before closeness',
    'repair-first',
    'repair first',
    'repair should settle before closeness expands',
    'before warmth widens again',
    'room settles',
    '修稳',
  ])
  const measuredReturnPressure = includesCadenceNeedle(combined, [
    'measured-return',
    'lower-pressure',
    'embodiment',
    'resident presence',
    'voice',
    'motion',
    'facial state',
    'same living line',
    'before widening outward',
    'before the turn widens outward',
    'initiative should stay nearby',
    'initiative should stay nearby and lower-pressure',
    'same digital life carrying memory, emotion, and embodiment',
    'rechecking on the same living line',
  ])

  if (phaseOneDigitalLife && repairBeforeClosenessPressure)
    return 'repair-before-closeness' as const

  if (phaseOneDigitalLife && (sameHerPressure || measuredReturnPressure))
    return 'measured-return' as const

  return null
}

function resolveHabitPolicyEmbodimentRestraint(seed: AlicizationRuntimeEmbodimentSeed) {
  const habitPolicy = resolveEmbodimentHabitPolicy(seed)
  const dominantMode = habitPolicy?.dominantMode ?? ''
  const suggestedStyleCap = habitPolicy?.suggestedStyleCap ?? ''
  const suggestedPresenceCap = habitPolicy?.suggestedPresenceCap ?? ''
  const narrative = habitPolicy?.narrative ?? ''

  if (
    dominantMode === 'protect-rest-window'
    && suggestedPresenceCap === 'concerned'
    && suggestedStyleCap === 'silent-observe'
  ) {
    return 'quiet-companionship' as const
  }

  if (
    dominantMode === 'protect-rest-window'
    || dominantMode === 'repair-before-fluency'
    || suggestedPresenceCap === 'concerned'
    || narrative.includes('protect-rest-window')
  ) {
    return 'repair-before-closeness' as const
  }

  if (
    dominantMode === 'return-with-proof'
    || dominantMode === 'light-touch-companionship'
    || suggestedStyleCap === 'silent-observe'
    || suggestedPresenceCap === 'hesitant'
    || suggestedPresenceCap === 'glance'
    || narrative.includes('companionship:quiet')
    || narrative.includes('return-open-loop-via-recheck')
  ) {
    return 'measured-return' as const
  }

  return null
}

function habitPolicyPrefersGentleDelivery(seed: AlicizationRuntimeEmbodimentSeed) {
  const habitPolicy = resolveEmbodimentHabitPolicy(seed)
  const dominantMode = habitPolicy?.dominantMode ?? ''
  const suggestedStyleCap = habitPolicy?.suggestedStyleCap ?? ''
  const suggestedPresenceCap = habitPolicy?.suggestedPresenceCap ?? ''
  const narrative = habitPolicy?.narrative ?? ''

  return (
    dominantMode === 'return-with-proof'
    || dominantMode === 'light-touch-companionship'
    || dominantMode === 'repair-before-fluency'
    || suggestedStyleCap === 'silent-observe'
    || suggestedPresenceCap === 'glance'
    || suggestedPresenceCap === 'hesitant'
    || suggestedPresenceCap === 'concerned'
    || narrative.includes('companionship:quiet')
    || narrative.includes('return-open-loop-via-recheck')
  )
}

function resolveExecutionCallbackEmbodimentPosture(seed: AlicizationRuntimeEmbodimentSeed) {
  const projection = resolveEmbodimentProjection(seed)
  const continuityState = resolveLegacyProjectionContinuityState(projection)
  const activeContext = projection?.activeClosenessContext ?? null
  const cadenceMode = continuityState?.rhythmState?.cadenceMode ?? null
  const manifestationCadenceSummary = sanitizeCadenceText(projection?.manifestationCadenceSummary, 220)
  const openingGuidance = sanitizeCadenceText(projection?.openingGuidance, 220)
  const relationshipDoctrine = readLegacyProjectionCadenceText(projection, 'relationshipDoctrine', 220)
    || sanitizeCadenceText(seed.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine, 220)
  const trustRationale = readLegacyProjectionCadenceText(projection, 'trustRationale', 220)
  const proactiveRestraint = sanitizeCadenceText(seed.digitalLifeSpine?.proactive?.continuityRestraint, 64)
  const runtimeContinuityCue = sanitizeCadenceText(seed.digitalLifeSpine?.runtime?.continuityCue, 220)
  const combined = `${manifestationCadenceSummary} ${openingGuidance} ${relationshipDoctrine} ${trustRationale} ${proactiveRestraint} ${runtimeContinuityCue}`

  if (activeContext !== 'execution-callback' && continuityState?.currentRegime !== 'execution-callback')
    return null

  if (proactiveRestraint === 'repair-before-closeness')
    return 'repair-before-closeness' as const

  if (cadenceMode === 'measured-return')
    return 'measured-return' as const

  const measuredReturnSignal = includesCadenceNeedle(combined, [
    'same-her baseline',
    'stay exact, bounded',
    'deliver the result cleanly',
    'callback timing stays measured',
    'leave room before widening closeness',
    'lower-pressure',
  ])
  if (measuredReturnSignal && !includesCadenceNeedle(combined, [
    'repair should settle before closeness expands',
    'repair lands before closeness returns',
  ])) {
    return 'measured-return' as const
  }

  const repairBeforeClosenessSignal = includesCadenceNeedle(combined, [
    'repair-first',
    'repair should settle before closeness expands',
    'repair lands before closeness returns',
  ])

  if (
    repairBeforeClosenessSignal
    || (
      cadenceMode === 'cooldown'
      && repairBeforeClosenessSignal
    )
  ) {
    return 'repair-before-closeness' as const
  }

  if (measuredReturnSignal) {
    return 'measured-return' as const
  }

  return 'quiet-companionship' as const
}

function hasExecutionCallbackSameThreadMeasuredReturn(seed: AlicizationRuntimeEmbodimentSeed) {
  const projection = resolveEmbodimentProjection(seed)
  const continuityState = resolveLegacyProjectionContinuityState(projection)
  const activeContext = projection?.activeClosenessContext ?? null
  const cadenceMode = continuityState?.rhythmState?.cadenceMode ?? null
  const runtimeArcStage = sanitizeCadenceText(seed.digitalLifeSpine?.runtime?.continuityArcStage, 64)
  const runtimeContinuityCue = sanitizeCadenceText(seed.digitalLifeSpine?.runtime?.continuityCue, 240)
  const proactiveRestraint = sanitizeCadenceText(seed.digitalLifeSpine?.proactive?.continuityRestraint, 64)
  const residentPerformanceReasonTags = seed.residentPerformance?.reasonTags ?? []
  const combined = [
    runtimeArcStage,
    runtimeContinuityCue,
    proactiveRestraint,
    projection?.manifestationCadenceSummary,
    projection?.openingGuidance,
    readLegacyProjectionCadenceText(projection, 'relationshipDoctrine', 240)
    || seed.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
    readLegacyProjectionCadenceText(projection, 'trustRationale', 240),
    ...residentPerformanceReasonTags,
  ]
    .map(value => sanitizeCadenceText(value, 240))
    .filter(Boolean)
    .join(' ')

  const executionCallbackContext = activeContext === 'execution-callback'
    || continuityState?.currentRegime === 'execution-callback'
  const sameThreadCarry = runtimeArcStage === 'same-thread-continuation'
    || includesCadenceNeedle(combined, [
      'same-thread-continuation',
      'same thread continuation',
      'same callback seam',
      'same callback line',
      'callback afterglow',
      'callback detour',
      'same living line',
      '沿着刚才那条线',
      '同一条线',
    ])
  const measuredReturnCarry = cadenceMode === 'measured-return'
    || proactiveRestraint === 'measured-return'
    || proactiveRestraint === 'lower-pressure'
    || includesCadenceNeedle(combined, [
      'measured-return',
      'lower-pressure',
      'leave room before widening closeness',
      'return stayed slower',
      'slower return',
      '慢一点回来',
      '慢一点接回去',
      '先留白',
    ])

  return executionCallbackContext && sameThreadCarry && measuredReturnCarry
}

function resolveCallbackActionCueClamp(input: {
  actionCue: string | null | undefined
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  rendererTarget: 'live2d' | 'vrm'
  rememberedSeamMoreRoom?: boolean
}) {
  const actionCue = input.actionCue ?? null
  if (!actionCue) {
    if (input.rendererTarget === 'live2d') {
      if (input.companionshipResidentMode === 'repair-before-closeness')
        return 'idle_settle'
      if (input.companionshipResidentMode === 'measured-return')
        return input.rememberedSeamMoreRoom ? 'idle_settle' : 'observe_focus'
    }
    return null
  }

  if (input.companionshipResidentMode === 'repair-before-closeness')
    return input.rendererTarget === 'vrm' ? actionCue : 'idle_settle'
  if (input.companionshipResidentMode === 'measured-return') {
    if (input.rendererTarget === 'vrm')
      return actionCue
    if (input.rememberedSeamMoreRoom) {
      return actionCue === 'steady_focus' || actionCue === 'observe_focus' || actionCue === 'quick_glance'
        ? 'idle_settle'
        : actionCue
    }
    return actionCue === 'observe_focus' ? actionCue : 'observe_focus'
  }
  return actionCue
}

function shouldSettleMeasuredReturnActionToIdle(actionCue: string | null | undefined) {
  return actionCue === 'steady_focus'
    || actionCue === 'observe_focus'
    || actionCue === 'quick_glance'
    || actionCue === 'pout_confused'
}

function resolveScriptMotionCueClamp(input: {
  actionCue: string | null | undefined
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  rendererTarget: 'live2d' | 'vrm'
  rememberedSeamMoreRoom?: boolean
}) {
  const actionCue = input.actionCue ?? null
  if (!actionCue)
    return null

  if (input.companionshipResidentMode === 'repair-before-closeness') {
    if (input.rendererTarget === 'vrm')
      return actionCue
    return actionCue === 'steady_focus' || actionCue === 'observe_focus'
      ? 'idle_settle'
      : actionCue
  }

  if (input.companionshipResidentMode === 'measured-return') {
    if (input.rendererTarget === 'vrm')
      return actionCue
    if (input.rememberedSeamMoreRoom) {
      return shouldSettleMeasuredReturnActionToIdle(actionCue)
        ? 'idle_settle'
        : actionCue
    }
    return actionCue === 'observe_focus' ? actionCue : 'observe_focus'
  }

  return actionCue
}

function manifestSupportsActionCue(
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined,
  actionCue: string,
) {
  return Array.isArray(manifest?.supportedActions)
    && manifest.supportedActions.some((candidate) => {
      if (typeof candidate === 'string')
        return candidate === actionCue

      return typeof candidate?.key === 'string' && candidate.key === actionCue
    })
}

function resolveRendererNativeMeasuredReturnActionCue(input: {
  actionCue: string | null | undefined
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  rendererTarget: 'live2d' | 'vrm'
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
}) {
  const actionCue = input.actionCue ?? null
  if (!actionCue)
    return actionCue
  if (
    input.rendererTarget !== 'vrm'
    || input.companionshipResidentMode !== 'measured-return'
    || actionCue !== 'leave-room'
    || !manifestSupportsActionCue(input.manifest, 'inspect_follow')
  ) {
    return actionCue
  }

  return 'inspect_follow'
}

function resolveResidentSeededEmbodiment(input: {
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  seededPerformance: AlicizationDialoguePerformancePayload
}) {
  const embodiment = input.embodiment
  if (!embodiment)
    return null

  if (
    embodiment.emotion === input.seededPerformance.baseEmotion
    && areDialoguePerformancesEqual(embodiment.performance, input.seededPerformance)
  ) {
    return embodiment
  }

  const preserveConcernedEmbodiment
    = embodiment.emotion === 'concerned'
      && embodiment.performance.baseEmotion === 'concerned'
      && embodiment.performance.delivery === 'gentle'
      && input.seededPerformance.baseEmotion === 'thinking'
      && input.seededPerformance.delivery === 'gentle'

  if (preserveConcernedEmbodiment) {
    return {
      ...embodiment,
      performance: {
        ...input.seededPerformance,
        baseEmotion: 'concerned',
        emotion: 'concerned',
      },
    } satisfies AlicizationDialogueEmbodimentEnvelope
  }

  return {
    ...embodiment,
    emotion: input.seededPerformance.baseEmotion,
    performance: {
      ...input.seededPerformance,
      baseEmotion: input.seededPerformance.baseEmotion,
      emotion: input.seededPerformance.baseEmotion,
    },
  } satisfies AlicizationDialogueEmbodimentEnvelope
}

function buildCoordinatorSpeechSegment(
  segment: AlicizationDialogueSpeechTimeline['segments'][number],
  options?: {
    companionshipResidentMode?: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
    lowerPressureTiming?: boolean
    rememberedSeamMoreRoom?: boolean
    explicitMeasuredReturnBias?: AlicizationCoordinatorMeasuredReturnEmbodimentBias
  },
): AlicizationEmbodimentSpeechSegment {
  const trimmed = segment.text.trim()
  const pauseClass: AlicizationSpeechProsodyPauseClass = trimmed.endsWith('？') || trimmed.endsWith('?')
    ? 'question'
    : trimmed.endsWith('！') || trimmed.endsWith('!')
      ? 'exclaim'
      : trimmed.endsWith('。') || trimmed.endsWith('.')
        ? 'full-stop'
        : trimmed.endsWith('，') || trimmed.endsWith(',')
          ? 'comma'
          : trimmed.endsWith('、')
            ? 'enumeration'
            : 'none'
  const phraseBoundary = pauseClass === 'comma' || pauseClass === 'enumeration'
    ? 'soft' as const
    : pauseClass === 'full-stop' || pauseClass === 'question' || pauseClass === 'exclaim'
      ? 'hard' as const
      : 'none' as const
  const contour = pauseClass === 'question'
    ? 'rising' as const
    : pauseClass === 'comma' || pauseClass === 'full-stop' || pauseClass === 'exclaim'
      ? 'falling' as const
      : 'flat' as const

  const lowerPressureTiming = options?.lowerPressureTiming === true
  const companionshipResidentMode = options?.companionshipResidentMode ?? null
  const rememberedSeamMoreRoom = companionshipResidentMode === 'measured-return' && options?.rememberedSeamMoreRoom === true
  const explicitMeasuredReturnBias = companionshipResidentMode === 'measured-return'
    || companionshipResidentMode === 'repair-before-closeness'
    ? options?.explicitMeasuredReturnBias
    : null
  const settleFloorMs = lowerPressureTiming
    ? 220
    : 120
  const settleHoldBiasMs = (rememberedSeamMoreRoom ? 48 : 0) + (explicitMeasuredReturnBias?.extraSettleMs ?? 0)
  const tempoShift = companionshipResidentMode === 'measured-return'
    ? rememberedSeamMoreRoom
      ? -0.14
      : -0.1
    : companionshipResidentMode === 'repair-before-closeness'
      ? -0.16
      : lowerPressureTiming
        ? -0.06
        : 0
  const resolvedTempoShift = Number((tempoShift + (explicitMeasuredReturnBias?.extraTempoShift ?? 0)).toFixed(2))

  return {
    id: segment.id,
    index: segment.index,
    text: segment.text,
    interruptPolicy: segment.interruptMode === 'hard-interrupt' ? 'hard-stop' as const : 'soft-settle' as const,
    preRollMs: segment.actionWindow === 'segment-start'
      ? 40
      : segment.actionWindow === 'cadence-peak'
        ? 20
        : 0,
    settleMs: Math.max(
      settleFloorMs,
      segment.emotionHoldMs ?? 0,
      segment.facialHoldMs ?? 0,
      segment.actionHoldMs ?? 0,
    ) + settleHoldBiasMs,
    prosody: {
      language: 'zh-CN' as const,
      pauseClass,
      phraseBoundary,
      contour,
      emphasisWord: null,
      emphasisStrength: Number(Math.max(0, Math.min(1, segment.prosodyWeight ?? 0.5)).toFixed(2)),
      tempoShift: resolvedTempoShift,
    },
  }
}

function stabilizeCompanionshipDelivery(input: {
  embodiment: AlicizationDialogueEmbodimentEnvelope
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  seed?: AlicizationRuntimeEmbodimentSeed | null
}) {
  if (input.companionshipResidentMode == null)
    return input.embodiment

  if (input.embodiment.performance.delivery === 'gentle')
    return input.embodiment

  const residentDelivery = input.residentPerformance?.performance?.delivery ?? null
  const shouldPreferResidentGentle = residentDelivery === 'gentle'
    && (
      input.companionshipResidentMode === 'measured-return'
      || input.companionshipResidentMode === 'repair-before-closeness'
      || input.companionshipResidentMode === 'quiet-companionship'
    )

  const shouldPreferHabitGentle = input.seed
    ? habitPolicyPrefersGentleDelivery(input.seed)
    && (
      input.companionshipResidentMode === 'measured-return'
      || input.companionshipResidentMode === 'repair-before-closeness'
      || input.companionshipResidentMode === 'quiet-companionship'
    )
    : false
  const shouldPreferContinuityGentle = input.seed
    ? (
        resolveAffectiveResidueEmbodimentRestraint(input.seed) != null
        || hasRememberedSeamMoreRoomCue({
          seed: input.seed,
          residentPerformance: input.residentPerformance,
        })
      ) && (
        input.companionshipResidentMode === 'measured-return'
        || input.companionshipResidentMode === 'repair-before-closeness'
        || input.companionshipResidentMode === 'quiet-companionship'
      )
    : false

  if (!shouldPreferResidentGentle && !shouldPreferHabitGentle && !shouldPreferContinuityGentle)
    return input.embodiment

  return {
    ...input.embodiment,
    performance: {
      ...input.embodiment.performance,
      delivery: 'gentle',
    },
  } satisfies AlicizationDialogueEmbodimentEnvelope
}

function dedupeCoordinatorRendererHintReasonTags(tags: Array<string | null | undefined>) {
  return Array.from(new Set(
    tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(Boolean),
  )).slice(0, 8)
}

function resolveCoordinatorSameHerContinuityRendererHints(input: {
  seed?: AlicizationRuntimeEmbodimentSeed | null
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
}) {
  if (
    (
      input.companionshipResidentMode !== 'measured-return'
      && input.companionshipResidentMode !== 'repair-before-closeness'
    )
    || !input.seed
  ) {
    return null
  }

  const runtimeProjectState = resolveCoordinatorRuntimeProjectState(input.seed)
  const runtimeCompanionHeadlineLine = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'companionHeadlineLine',
    maxChars: 240,
  })
  const runtimeLatestLandedProgress = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'latestLandedProgress',
    summaryKey: 'landedProgressSummary',
    maxChars: 240,
  })
  const runtimeNextClosureTarget = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'nextClosureTarget',
    summaryKey: 'nextClosureTargetSummary',
    maxChars: 240,
  })
  const runtimePrimaryOpenLoop = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'primaryOpenLoop',
    summaryKey: 'openClosureSummary',
    maxChars: 240,
  })
  const runtimeSameHerSelfLine = resolveCoordinatorRuntimeProjectStateText({
    projectState: runtimeProjectState,
    explicitKey: 'sameHerSelfLine',
    maxChars: 240,
  })
  const combined = [
    input.seed.digitalLifeSpine?.memory?.summary,
    input.seed.digitalLifeSpine?.memory?.personStateProjection?.openingGuidance,
    input.seed.digitalLifeSpine?.memory?.personStateProjection?.manifestationCadenceSummary,
    runtimeCompanionHeadlineLine,
    runtimeLatestLandedProgress,
    runtimeNextClosureTarget,
    runtimePrimaryOpenLoop,
    runtimeSameHerSelfLine,
    input.seed.silentContinuity?.openingGuidance,
    input.seed.silentContinuity?.manifestationCadenceSummary,
    input.seed.silentContinuity?.inwardLine,
    input.seed.silentContinuity?.emotionalClosureCue,
    input.seed.silentContinuity?.landedProgressLine,
  ]
    .map(value => sanitizeCadenceText(value, 240))
    .filter(Boolean)
    .join(' ')

  if (!combined)
    return null

  const reasonTags: Array<string | null | undefined> = []
  let signature: string | undefined

  const stillVoicedFaceLine = includesCadenceNeedle(combined, [
    'still-voiced face line',
    'holding together mainly through face and voice',
  ]) && includesCadenceNeedle(combined, [
    'body, motion, and lipsync',
    'body motion and lipsync',
  ])
  const stillVoicedMotionLine = includesCadenceNeedle(combined, [
    'still-voiced motion line',
    'holding together mainly through motion and voice',
  ]) && includesCadenceNeedle(combined, [
    'body, face, and lipsync',
    'body face and lipsync',
  ])
  const stillVoicedFaceMotionLine = includesCadenceNeedle(combined, [
    'lane=face+motion+voice-only',
    'holding together through face, motion, and voice together',
    'still-voiced face-and-motion line',
  ]) && includesCadenceNeedle(combined, [
    'body and lipsync',
    'body, and lipsync',
    'body and lipsync need to rejoin',
    'body and lipsync rejoining',
  ])
  const stillVoicedFaceLipsyncLine = includesCadenceNeedle(combined, [
    'lane=face+lipsync+voice-only',
    'holding together through face, lipsync, and voice together',
    'still-voiced face-and-mouth line',
  ]) && includesCadenceNeedle(combined, [
    'body and motion',
    'body, and motion',
    'body and motion need to rejoin',
    'body and motion rejoining',
  ])
  const stillVoicedMotionLipsyncLine = includesCadenceNeedle(combined, [
    'lane=motion+lipsync+voice-only',
    'holding together through motion, lipsync, and voice together',
    'still-voiced motion-and-mouth line',
  ]) && includesCadenceNeedle(combined, [
    'body and face',
    'body, and face',
    'body and face need to rejoin',
    'body and face rejoining',
  ])
  const lipsyncVoiceLine = includesCadenceNeedle(combined, [
    'lane=lipsync+voice-only',
    'holding together mainly through lipsync and voice',
    'living audio thread is keeping the same-her carry alive',
  ]) && includesCadenceNeedle(combined, [
    'body, face, and motion',
    'body face and motion',
  ])
  const quieterBodyLipsyncLine = includesCadenceNeedle(combined, [
    'body+lipsync-only',
    'holding together mainly through body and lipsync',
    'one quieter living line',
  ]) && includesCadenceNeedle(combined, [
    'resident body line and living mouth line',
    'face, motion, and voice',
    'face motion and voice',
  ])
  const bodyVoiceLine = includesCadenceNeedle(combined, [
    'body+voice-only',
    'holding together mainly through body and voice',
  ]) && includesCadenceNeedle(combined, [
    'resident body line is still keeping this one living her coherent',
    'resident body line',
  ]) && includesCadenceNeedle(combined, [
    'face, motion, and lipsync',
    'face motion and lipsync',
  ])
  const audibleBodyLine = includesCadenceNeedle(combined, [
    'living audio thread is still intact',
    'holding together mainly through body, lipsync, and voice',
    'audible-body',
  ]) && includesCadenceNeedle(combined, [
    'face and motion',
    'body, lipsync, and voice',
    'body lipsync and voice',
  ])

  if (stillVoicedFaceLine)
    reasonTags.push('embodiment:still_voiced_face_line')
  if (stillVoicedMotionLine)
    reasonTags.push('embodiment:still_voiced_motion_line')
  if (stillVoicedFaceMotionLine)
    reasonTags.push('embodiment:still_voiced_face_motion_line')
  if (stillVoicedFaceLipsyncLine) {
    reasonTags.push(
      'embodiment:still_voiced_face_lipsync_line',
      'embodiment:still_voiced_face_line',
    )
  }
  if (stillVoicedMotionLipsyncLine) {
    reasonTags.push(
      'embodiment:still_voiced_motion_lipsync_line',
      'embodiment:still_voiced_motion_line',
    )
  }
  if (lipsyncVoiceLine)
    reasonTags.push('embodiment:lipsync+voice-only')
  if (quieterBodyLipsyncLine)
    reasonTags.push('embodiment:body+lipsync-only')
  if (bodyVoiceLine) {
    signature = 'embodiment:audible_same_her_line'
    reasonTags.push(
      'embodiment:audible_same_her_line',
      'embodiment:body+voice-only',
    )
  }
  if (audibleBodyLine) {
    signature = 'embodiment:audible_same_her_line'
    reasonTags.push(
      'embodiment:audible_same_her_line',
      'embodiment:body_lipsync_voice_rejoin',
    )
  }

  const normalizedReasonTags = dedupeCoordinatorRendererHintReasonTags(reasonTags)
  if (normalizedReasonTags.length === 0 && !signature)
    return null

  return {
    reasonTags: normalizedReasonTags.length > 0 ? normalizedReasonTags : undefined,
    signature,
  }
}

function resolveCoordinatorSpeechSegmentRendererHints(input: {
  seed?: AlicizationRuntimeEmbodimentSeed | null
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  rendererTarget: 'live2d' | 'vrm'
  tempoShift: number
  rememberedSeamMoreRoom?: boolean
}): AlicizationDialogueEmbodimentRendererHints | null {
  const sameHerContinuityHints = resolveCoordinatorSameHerContinuityRendererHints({
    seed: input.seed,
    companionshipResidentMode: input.companionshipResidentMode,
  })
  const explicitRendererPreferences = stripNullCoordinatorExplicitRendererPreferences(
    resolveCoordinatorExplicitRendererPreferences(input.seed),
  )

  if (input.companionshipResidentMode === 'repair-before-closeness') {
    return {
      preferredBlinkCadence: explicitRendererPreferences.preferredBlinkCadence ?? 'quiet' as const,
      preferredExpressionAliases: input.rendererTarget === 'vrm'
        ? ['RecoverSoft', 'CalmInspect']
        : ['recover-soft', 'soft-gaze'],
      preferredGazeMode: explicitRendererPreferences.preferredGazeMode ?? 'soften' as const,
      preferredLipsyncMode: explicitRendererPreferences.preferredLipsyncMode,
      preferredMotionAliases: input.rendererTarget === 'vrm'
        ? ['StillnessGuard', 'ObserveSoft']
        : ['stillness_guard', 'observe_focus'],
      preferredPacingMode: explicitRendererPreferences.preferredPacingMode,
      preferredPauseMode: explicitRendererPreferences.preferredPauseMode,
      preferredVoiceMode: explicitRendererPreferences.preferredVoiceMode,
      residentMode: 'repair-before-closeness',
      reasonTags: sameHerContinuityHints?.reasonTags,
      signature: sameHerContinuityHints?.signature,
    } satisfies AlicizationDialogueEmbodimentRendererHints
  }

  if (input.companionshipResidentMode === 'measured-return') {
    return {
      preferredBlinkCadence: explicitRendererPreferences.preferredBlinkCadence ?? 'linger' as const,
      preferredExpressionAliases: input.rendererTarget === 'vrm'
        ? input.rememberedSeamMoreRoom
          ? ['RecoverSoft', 'CalmInspect']
          : ['CalmInspect', 'RecoverSoft']
        : input.rememberedSeamMoreRoom
          ? ['soft-gaze', 'calm_inspect']
          : ['calm_inspect', 'soft-gaze'],
      preferredGazeMode: explicitRendererPreferences.preferredGazeMode ?? 'soften' as const,
      preferredLipsyncMode: explicitRendererPreferences.preferredLipsyncMode,
      preferredMotionAliases: input.rendererTarget === 'vrm'
        ? input.rememberedSeamMoreRoom
          ? ['StillnessGuard', 'ObserveSoft']
          : ['ObserveSoft', 'StillnessGuard']
        : input.rememberedSeamMoreRoom
          ? ['idle_settle', 'stillness_guard']
          : ['observe_focus', 'stillness_guard'],
      preferredPacingMode: explicitRendererPreferences.preferredPacingMode,
      preferredPauseMode: explicitRendererPreferences.preferredPauseMode,
      preferredVoiceMode: explicitRendererPreferences.preferredVoiceMode,
      residentMode: 'measured-return',
      reasonTags: sameHerContinuityHints?.reasonTags,
      signature: sameHerContinuityHints?.signature,
    } satisfies AlicizationDialogueEmbodimentRendererHints
  }

  if (input.companionshipResidentMode === 'quiet-companionship' || input.tempoShift < 0) {
    return {
      preferredBlinkCadence: explicitRendererPreferences.preferredBlinkCadence ?? 'quiet' as const,
      preferredExpressionAliases: input.rendererTarget === 'vrm'
        ? ['RecoverSoft', 'MindCalm']
        : ['soft-gaze', 'mind_calm'],
      preferredGazeMode: explicitRendererPreferences.preferredGazeMode ?? 'soften' as const,
      preferredLipsyncMode: explicitRendererPreferences.preferredLipsyncMode,
      preferredMotionAliases: input.rendererTarget === 'vrm'
        ? ['StillnessGuard', 'ObserveSoft']
        : ['stillness_guard', 'idle_settle'],
      preferredPacingMode: explicitRendererPreferences.preferredPacingMode,
      preferredPauseMode: explicitRendererPreferences.preferredPauseMode,
      preferredVoiceMode: explicitRendererPreferences.preferredVoiceMode,
      residentMode: 'quiet-companionship',
      reasonTags: sameHerContinuityHints?.reasonTags,
      signature: sameHerContinuityHints?.signature,
    } satisfies AlicizationDialogueEmbodimentRendererHints
  }

  return null
}

function normalizeDigitalLifeActionMotionAliases(input: {
  rendererTarget: 'live2d' | 'vrm'
  aliases: readonly string[] | undefined
}) {
  if (!input.aliases?.length)
    return input.aliases
  if (input.rendererTarget !== 'live2d')
    return [...input.aliases]

  const mapped = input.aliases.map((alias) => {
    switch (alias) {
      case 'stillness_guard':
        return 'Still'
      case 'observe_focus':
        return 'Inspect'
      default:
        return alias
    }
  })

  return [...new Set(mapped)]
}

function resolveDigitalLifeActionMotionAliases(input: {
  rendererTarget: 'live2d' | 'vrm'
  settledAliases: readonly string[] | undefined
  actionAliases: readonly string[] | undefined
  embodimentAliases: readonly string[] | undefined
}) {
  if (input.rendererTarget === 'vrm') {
    const explicitAliases = input.actionAliases?.length
      ? input.actionAliases
      : input.embodimentAliases?.length
        ? input.embodimentAliases
        : undefined

    if (explicitAliases?.length)
      return [...new Set(explicitAliases)]
  }

  return normalizeDigitalLifeActionMotionAliases({
    rendererTarget: input.rendererTarget,
    aliases: input.settledAliases,
  })
}

function buildRuntimeEmbodimentScript(input: {
  seed: AlicizationRuntimeEmbodimentSeed
  embodiment: AlicizationDialogueEmbodimentEnvelope
  speechTimeline: AlicizationDialogueSpeechTimeline
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
}) {
  const lowerPressureTiming = hasLowerPressureRelationshipTiming(input.seed)
  const residentCompanionshipMode = resolveResidentCompanionshipMode(input.residentPerformance)
  const projectStateCompanionshipMode = resolveProjectStateEmbodimentRestraint(input.seed)
  const companionshipResidentMode = resolveProactiveEmbodimentRestraint(input.seed)
    ?? resolveSilentSeedEmbodimentRestraint(input.seed)
    ?? resolveRuntimeContinuityArcEmbodimentRestraint(input.seed)
    ?? resolveAffectiveResidueEmbodimentRestraint(input.seed)
    ?? resolveHabitPolicyEmbodimentRestraint(input.seed)
    ?? (residentCompanionshipMode === 'repair-before-closeness'
      ? residentCompanionshipMode
      : projectStateCompanionshipMode)
    ?? resolveExecutionCallbackEmbodimentPosture(input.seed)
    ?? residentCompanionshipMode
  const rendererTarget = input.manifest?.renderer === 'vrm' ? 'vrm' : 'live2d'
  const rememberedSeamMoreRoom = hasRememberedSeamMoreRoomCue({
    seed: input.seed,
    residentPerformance: input.residentPerformance,
  }) || (
    companionshipResidentMode === 'measured-return'
    && hasCorrectedSamePersonQuietEmbodimentSettlingCue(input.seed)
  )
  const rememberedEmbodimentRecallSettling = companionshipResidentMode === 'measured-return'
    && hasRememberedEmbodimentRecallSettlingCue(input.seed)
  const rememberedInitiativeRhythm = companionshipResidentMode === 'measured-return'
    && hasRememberedInitiativeRhythmCue(input.seed)
  const explicitMeasuredReturnRendererPreference = companionshipResidentMode === 'measured-return'
    && hasQuieterMeasuredReturnRendererPreference(
      resolveCoordinatorExplicitRendererPreferences(input.seed),
    )
  const quieterMeasuredReturnSettling = rememberedSeamMoreRoom
    || rememberedInitiativeRhythm
    || rememberedEmbodimentRecallSettling
    || explicitMeasuredReturnRendererPreference
  const explicitEmbodimentCarry = resolveCoordinatorSilentContinuityEmbodimentCarry(input.seed)
  const explicitMeasuredReturnBias = resolveCoordinatorMeasuredReturnEmbodimentBias({
    companionshipResidentMode,
    quieterMeasuredReturnSettling,
    explicitEmbodimentCarry,
  })
  const settledMeasuredReturnTempoShift = Number(((
    quieterMeasuredReturnSettling ? -0.14 : -0.1
  ) + explicitMeasuredReturnBias.extraTempoShift).toFixed(2))
  const settledRendererHints = resolveCoordinatorSpeechSegmentRendererHints({
    seed: input.seed,
    companionshipResidentMode,
    rendererTarget,
    tempoShift: companionshipResidentMode === 'measured-return'
      ? settledMeasuredReturnTempoShift
      : companionshipResidentMode === 'repair-before-closeness'
        ? -0.12
        : lowerPressureTiming
          ? -0.05
          : 0,
    rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
  })
  const residentMode = input.seed.digitalLife?.mode === 'recovering'
    ? 'idle-recovering'
    : companionshipResidentMode || 'dialogue'
  const preUtteranceCue = input.embodiment.performance.delivery === 'gentle'
    ? residentMode === 'quiet-companionship' || residentMode === 'measured-return' || residentMode === 'repair-before-closeness'
      ? residentMode === 'measured-return'
        ? 'steady-inhale'
        : lowerPressureTiming
          ? residentMode === 'repair-before-closeness'
            ? 'soft-breath'
            : 'steady-inhale'
          : 'soft-breath'
      : 'steady-inhale'
    : residentMode === 'quiet-companionship' || residentMode === 'measured-return' || residentMode === 'repair-before-closeness'
      ? lowerPressureTiming
        ? 'soft-breath'
        : 'soft-breath'
      : null
  const postUtteranceCue = input.embodiment.performance.delivery === 'gentle'
    ? residentMode === 'repair-before-closeness'
      ? 'soft-release'
      : residentMode === 'measured-return'
        ? 'eyes-soften'
        : lowerPressureTiming
          ? 'eyes-soften'
          : 'soft-release'
    : residentMode === 'quiet-companionship' || residentMode === 'measured-return' || residentMode === 'repair-before-closeness'
      ? lowerPressureTiming
        ? residentMode === 'repair-before-closeness'
          ? 'soft-release'
          : 'eyes-soften'
        : 'soft-release'
      : null
  const speakingSegments: AlicizationEmbodimentSpeechSegment[] = input.speechTimeline.segments.map(
    (segment) => {
      const coordinatorSegment = buildCoordinatorSpeechSegment(segment, {
        companionshipResidentMode,
        lowerPressureTiming,
        rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
        explicitMeasuredReturnBias,
      })
      return {
        ...coordinatorSegment,
        rendererHints: resolveCoordinatorSpeechSegmentRendererHints({
          seed: input.seed,
          companionshipResidentMode,
          rendererTarget,
          tempoShift: coordinatorSegment.prosody?.tempoShift ?? 0,
          rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
        }),
      } satisfies AlicizationEmbodimentSpeechSegment
    },
  )

  return normalizeAlicizationEmbodimentScript({
    version: 'embodiment-script-v1',
    decisionTraceId: input.seed.decisionTraceId ?? null,
    turnId: input.seed.turnId,
    rendererTarget,
    replyText: input.seed.replyText,
    state: {
      baseEmotion: input.embodiment.performance.baseEmotion,
      delivery: input.embodiment.performance.delivery,
      emphasis: residentMode === 'repair-before-closeness'
        && input.embodiment.performance.delivery === 'gentle'
        ? Math.max(1, input.embodiment.performance.emphasis)
        : input.embodiment.performance.emphasis,
      residentMode,
      rendererHints: settledRendererHints,
    },
    speechPlan: {
      segments: speakingSegments,
      interruptPolicy: input.speechTimeline.segments.some(segment => segment.interruptMode === 'hard-interrupt')
        ? 'hard-stop'
        : 'soft-settle',
      preRollMs: input.speechTimeline.segments.some(segment => segment.actionWindow === 'segment-start') ? 40 : 0,
      settleMs: speakingSegments.reduce((max, segment) => Math.max(max, segment.settleMs), lowerPressureTiming ? 220 : 120),
    },
    facePlan: {
      preUtteranceCue,
      postUtteranceCue,
      speakingCues: input.speechTimeline.segments.map((segment, index) => buildAlicizationEmbodimentFaceCue({
        segment: speakingSegments[index]!,
        timelineSegment: segment,
        fallbackEmotion: input.embodiment.performance.baseEmotion,
        fallbackFacialCue: input.embodiment.performance.facialCue ?? null,
        fallbackIntensity: input.embodiment.performance.emphasis >= 2 ? 0.8 : input.embodiment.performance.emphasis === 1 ? 0.6 : 0.4,
      })),
    },
    motionPlan: {
      idleBase: resolveScriptMotionCueClamp({
        actionCue: input.embodiment.performance.actionCue ?? 'idle_settle',
        companionshipResidentMode,
        rendererTarget,
        rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
      }) ?? input.embodiment.performance.actionCue ?? 'idle_settle',
      actionBursts: input.speechTimeline.segments.map((segment, index) => buildAlicizationEmbodimentMotionBurst({
        segment: speakingSegments[index]!,
        timelineSegment: segment,
        fallbackActionCue: input.embodiment.performance.actionCue ?? null,
        fallbackIntensity: input.embodiment.performance.emphasis >= 2 ? 0.7 : input.embodiment.performance.emphasis === 1 ? 0.5 : 0.3,
      })).map(burst => ({
        ...burst,
        actionCue: resolveScriptMotionCueClamp({
          actionCue: burst.actionCue,
          companionshipResidentMode,
          rendererTarget,
          rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
        }),
      })),
      attentionMode: input.manifest?.supportsLookAt === false ? 'ambient' : 'attentive',
    },
    lipsyncPlan: {
      mode: input.manifest?.supportsVisemeLipSync === true ? 'energy-phoneme-hybrid' : 'energy-only',
      visemeHints: input.manifest?.supportsVisemeLipSync === true
        ? input.speechTimeline.segments.flatMap((segment, index) => buildAlicizationEmbodimentLipSyncHints({
            segment: speakingSegments[index]!,
            timelineSegment: segment,
          }))
        : undefined,
    },
  })
}

function projectEmbodimentScriptHintsToSpeechTimeline(input: {
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  embodimentScript: AlicizationEmbodimentScriptV1 | null
}) {
  if (!input.speechTimeline || !input.embodimentScript)
    return input.speechTimeline

  return {
    ...input.speechTimeline,
    segments: input.speechTimeline.segments.map((segment, index) => {
      const scriptSegment = input.embodimentScript?.speechPlan.segments[index]
      const scriptHints = scriptSegment?.rendererHints
      if (!scriptHints)
        return segment

      const companionshipResidentMode = scriptHints.residentMode === 'measured-return'
        || scriptHints.residentMode === 'repair-before-closeness'
        || scriptHints.residentMode === 'quiet-companionship'
        ? scriptHints.residentMode
        : null

      return {
        ...segment,
        rendererHints: {
          ...scriptHints,
          ...segment.rendererHints,
          residentMode: companionshipResidentMode ?? segment.rendererHints?.residentMode ?? scriptHints.residentMode,
          preferredBlinkCadence: companionshipResidentMode
            ? scriptHints.preferredBlinkCadence ?? segment.rendererHints?.preferredBlinkCadence
            : segment.rendererHints?.preferredBlinkCadence ?? scriptHints.preferredBlinkCadence,
          preferredGazeMode: companionshipResidentMode
            ? scriptHints.preferredGazeMode ?? segment.rendererHints?.preferredGazeMode
            : segment.rendererHints?.preferredGazeMode ?? scriptHints.preferredGazeMode,
          preferredPauseMode: companionshipResidentMode
            ? scriptHints.preferredPauseMode ?? segment.rendererHints?.preferredPauseMode
            : segment.rendererHints?.preferredPauseMode ?? scriptHints.preferredPauseMode,
          preferredLipsyncMode: companionshipResidentMode
            ? scriptHints.preferredLipsyncMode ?? segment.rendererHints?.preferredLipsyncMode
            : segment.rendererHints?.preferredLipsyncMode ?? scriptHints.preferredLipsyncMode,
          preferredVoiceMode: companionshipResidentMode
            ? scriptHints.preferredVoiceMode ?? segment.rendererHints?.preferredVoiceMode
            : segment.rendererHints?.preferredVoiceMode ?? scriptHints.preferredVoiceMode,
          preferredPacingMode: companionshipResidentMode
            ? scriptHints.preferredPacingMode ?? segment.rendererHints?.preferredPacingMode
            : segment.rendererHints?.preferredPacingMode ?? scriptHints.preferredPacingMode,
          preferredExpressionAliases: companionshipResidentMode
            ? scriptHints.preferredExpressionAliases ?? segment.rendererHints?.preferredExpressionAliases
            : segment.rendererHints?.preferredExpressionAliases ?? scriptHints.preferredExpressionAliases,
          preferredMotionAliases: companionshipResidentMode
            ? scriptHints.preferredMotionAliases ?? segment.rendererHints?.preferredMotionAliases
            : segment.rendererHints?.preferredMotionAliases ?? scriptHints.preferredMotionAliases,
          reasonTags: companionshipResidentMode
            ? scriptHints.reasonTags ?? segment.rendererHints?.reasonTags
            : segment.rendererHints?.reasonTags ?? scriptHints.reasonTags,
          signature: companionshipResidentMode
            ? scriptHints.signature ?? segment.rendererHints?.signature
            : segment.rendererHints?.signature ?? scriptHints.signature,
        },
      }
    }),
  } satisfies AlicizationDialogueSpeechTimeline
}

function reconcileRuntimeDigitalLifeAuthority(input: {
  seed: AlicizationRuntimeEmbodimentSeed
  digitalLife: AlicizationDigitalLifeEnvelope
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  rendererTarget: 'live2d' | 'vrm'
}) {
  const residentPerformance = input.residentPerformance?.performance ?? null
  const lowerPressureTiming = hasLowerPressureRelationshipTiming(input.seed)
  const residentCompanionshipMode = resolveResidentCompanionshipMode(input.residentPerformance)
  const projectStateCompanionshipMode = resolveProjectStateEmbodimentRestraint(input.seed)
  const callbackSameThreadMeasuredReturn = hasExecutionCallbackSameThreadMeasuredReturn(input.seed)
  const companionshipResidentMode = resolveProactiveEmbodimentRestraint(input.seed)
    ?? resolveSilentSeedEmbodimentRestraint(input.seed)
    ?? resolveRuntimeContinuityArcEmbodimentRestraint(input.seed)
    ?? resolveAffectiveResidueEmbodimentRestraint(input.seed)
    ?? resolveHabitPolicyEmbodimentRestraint(input.seed)
    ?? (residentCompanionshipMode === 'repair-before-closeness'
      ? residentCompanionshipMode
      : projectStateCompanionshipMode)
    ?? resolveExecutionCallbackEmbodimentPosture(input.seed)
    ?? residentCompanionshipMode
  const continuityResidentMode = companionshipResidentMode === 'measured-return'
    || companionshipResidentMode === 'repair-before-closeness'
  const effectiveGentleDeliveryAuthority = input.residentPerformance?.performance?.delivery === 'gentle'
    || (
      continuityResidentMode
      && (
        input.digitalLife.performance.delivery === 'gentle'
        || habitPolicyPrefersGentleDelivery(input.seed)
      )
    )
  const compatibleCompanionshipAuthority = input.residentPerformance?.source === 'main-runtime'
    && effectiveGentleDeliveryAuthority
    && (
      input.digitalLife.performance.baseEmotion === 'thinking'
      || (
        continuityResidentMode
        && input.digitalLife.performance.baseEmotion === 'concerned'
        && residentPerformance?.baseEmotion === 'thinking'
      )
      || (
        input.digitalLife.performance.baseEmotion === 'neutral'
        && residentPerformance?.baseEmotion === 'thinking'
      )
      || (
        input.digitalLife.performance.baseEmotion === residentPerformance?.baseEmotion
        && residentPerformance?.baseEmotion === 'neutral'
      )
    )
  const quietCompanionship = compatibleCompanionshipAuthority
    && input.residentPerformance?.stance === 'accompany'
    && input.residentPerformance?.embodiedPresence === 'attentive'
  const residentContinuityCompanionship = compatibleCompanionshipAuthority
    && input.residentPerformance?.source === 'main-runtime'
    && (
      companionshipResidentMode === 'measured-return'
      || companionshipResidentMode === 'repair-before-closeness'
    )
    && input.residentPerformance?.stance === 'accompany'
  const continuityCompanionship = compatibleCompanionshipAuthority
    && (
      continuityResidentMode
    )
  const spineOnlyContinuityCompanionship = !input.residentPerformance
    && (
      continuityResidentMode
    )
    && (
      input.digitalLife.performance.baseEmotion === 'thinking'
      || input.digitalLife.performance.baseEmotion === 'concerned'
      || input.digitalLife.performance.baseEmotion === 'neutral'
    )
  const settledCompanionship = quietCompanionship
    || residentContinuityCompanionship
    || continuityCompanionship
    || spineOnlyContinuityCompanionship
  const measuredReturn = settledCompanionship && companionshipResidentMode === 'measured-return'
  const repairBeforeCloseness = settledCompanionship && companionshipResidentMode === 'repair-before-closeness'
  const rememberedSeamMoreRoom = measuredReturn && hasRememberedSeamMoreRoomCue({
    seed: input.seed,
    residentPerformance: input.residentPerformance,
  })
  const rememberedInitiativeRhythm = measuredReturn
    && hasRememberedInitiativeRhythmCue(input.seed)
  const rememberedEmbodimentRecallSettling = measuredReturn
    && hasRememberedEmbodimentRecallSettlingCue(input.seed)
  const correctedSamePersonQuietSettling = measuredReturn
    && hasCorrectedSamePersonQuietEmbodimentSettlingCue(input.seed)
  const explicitMeasuredReturnRendererPreference = measuredReturn
    && hasQuieterMeasuredReturnRendererPreference(
      resolveCoordinatorExplicitRendererPreferences(input.seed),
    )
  const quieterMeasuredReturnSettling = rememberedSeamMoreRoom
    || correctedSamePersonQuietSettling
    || rememberedInitiativeRhythm
    || rememberedEmbodimentRecallSettling
    || explicitMeasuredReturnRendererPreference
  const explicitEmbodimentCarry = resolveCoordinatorSilentContinuityEmbodimentCarry(input.seed)
  const explicitMeasuredReturnBias = resolveCoordinatorMeasuredReturnEmbodimentBias({
    companionshipResidentMode,
    quieterMeasuredReturnSettling,
    explicitEmbodimentCarry,
  })
  const settledMeasuredReturnTempoShift = Number(((
    quieterMeasuredReturnSettling ? -0.14 : -0.1
  ) + explicitMeasuredReturnBias.extraTempoShift).toFixed(2))
  const embodimentPreferredMotionAliases = input.seed.embodiment?.rendererHints?.preferredMotionAliases
  const clampedActionCue = settledCompanionship
    ? resolveCallbackActionCueClamp({
        actionCue: input.digitalLife.action.actionCue,
        companionshipResidentMode,
        rendererTarget: input.rendererTarget,
        rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
      })
    : input.digitalLife.action.actionCue
  const continuityHeldActionCue = settledCompanionship
    ? input.digitalLife.frames
      .map(frame => resolveCallbackActionCueClamp({
        actionCue: frame.action.actionCue,
        companionshipResidentMode,
        rendererTarget: input.rendererTarget,
        rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
      }))
      .find(Boolean) ?? clampedActionCue
    : clampedActionCue
  const recovering = input.digitalLife.mode === 'recovering'
  const maxFrameHoldMs = input.digitalLife.frames.reduce((max, frame) => {
    return Math.max(max, frame.face.holdMs, frame.action.holdMs, frame.lipSync.continuityHoldMs)
  }, 0)
  const quietContinuityFloorMs = repairBeforeCloseness ? 340 : measuredReturn ? 300 : lowerPressureTiming ? 320 : 260
  const quietFaceHoldFloorMs = repairBeforeCloseness ? 340 : measuredReturn ? 300 : lowerPressureTiming ? 320 : 260
  const quietActionHoldFloorMs = repairBeforeCloseness ? 260 : measuredReturn ? 220 : lowerPressureTiming ? 280 : 240
  const quietFrameContinuityFloorMs = repairBeforeCloseness ? 320 : measuredReturn ? 280 : lowerPressureTiming ? 300 : 240
  const quietFrameFaceHoldFloorMs = repairBeforeCloseness ? 320 : measuredReturn ? 280 : lowerPressureTiming ? 300 : 240
  const quietFrameActionHoldFloorMs = repairBeforeCloseness ? 240 : measuredReturn ? 200 : lowerPressureTiming ? 260 : 220
  const quieterMeasuredReturnHoldBiasMs = (quieterMeasuredReturnSettling ? 40 : 0) + explicitMeasuredReturnBias.extraContinuityHoldMs
  const quieterMeasuredReturnFaceHoldBiasMs = (quieterMeasuredReturnSettling ? 40 : 0) + explicitMeasuredReturnBias.extraFaceHoldMs
  const quieterMeasuredReturnActionHoldBiasMs = (quieterMeasuredReturnSettling ? 20 : 0) + explicitMeasuredReturnBias.extraActionHoldMs
  const quieterMeasuredReturnFrameContinuityHoldBiasMs = (quieterMeasuredReturnSettling ? 20 : 0) + explicitMeasuredReturnBias.extraFrameContinuityHoldMs
  const quieterMeasuredReturnFrameFaceHoldBiasMs = (quieterMeasuredReturnSettling ? 20 : 0) + explicitMeasuredReturnBias.extraFrameFaceHoldMs
  const quieterMeasuredReturnFrameActionHoldBiasMs = (quieterMeasuredReturnSettling ? 20 : 0) + explicitMeasuredReturnBias.extraFrameActionHoldMs
  const settledRendererHints = companionshipResidentMode
    ? resolveCoordinatorSpeechSegmentRendererHints({
        seed: input.seed,
        companionshipResidentMode,
        rendererTarget: input.rendererTarget,
        tempoShift: measuredReturn
          ? settledMeasuredReturnTempoShift
          : lowerPressureTiming
            ? -0.08
            : 0,
        rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
      })
    : null
  const settledVoiceAuthority = reconcileRuntimeVoiceAuthority({
    voice: input.digitalLife.voice,
    speechStyle: input.digitalLife.speechStyle,
    recovering,
    settledCompanionship,
    companionshipResidentMode,
    lowerPressureTiming,
    callbackSameThreadMeasuredReturn,
    quieterMeasuredReturnSettling,
    explicitMeasuredReturnBias,
  })
  const settledMotorAuthority = reconcileRuntimeMotorAuthority({
    motor: input.digitalLife.motor,
    recovering,
    settledCompanionship,
    companionshipResidentMode,
    lowerPressureTiming,
    quieterMeasuredReturnSettling,
    explicitEmbodimentCarry,
  })
  const continuityHoldMs = settledCompanionship
    ? Math.max(input.digitalLife.lipSync.continuityHoldMs, maxFrameHoldMs, quietContinuityFloorMs) + quieterMeasuredReturnHoldBiasMs
    : recovering
      ? Math.max(input.digitalLife.lipSync.continuityHoldMs, maxFrameHoldMs, 320)
      : input.digitalLife.lipSync.continuityHoldMs

  return {
    ...input.digitalLife,
    mode: recovering
      ? 'recovering'
      : settledCompanionship
        ? 'thinking'
        : input.digitalLife.mode,
    speechStyle: settledVoiceAuthority.speechStyle ?? input.digitalLife.speechStyle,
    voice: settledVoiceAuthority.voice,
    motor: settledMotorAuthority,
    lipSync: {
      ...input.digitalLife.lipSync,
      continuityHoldMs,
      mode: recovering ? 'closed' : input.digitalLife.lipSync.mode,
    },
    face: {
      ...input.digitalLife.face,
      expressionMode: recovering || settledCompanionship ? 'hold' : input.digitalLife.face.expressionMode,
      holdMs: settledCompanionship
        ? Math.max(input.digitalLife.face.holdMs, quietFaceHoldFloorMs) + quieterMeasuredReturnFaceHoldBiasMs
        : recovering
          ? Math.max(input.digitalLife.face.holdMs, 320)
          : input.digitalLife.face.holdMs,
    },
    action: {
      ...input.digitalLife.action,
      actionCue: recovering ? null : continuityHeldActionCue,
      actionMode: recovering
        ? 'none'
        : repairBeforeCloseness
          ? 'hold'
          : settledCompanionship && continuityHeldActionCue
            ? 'hold'
            : input.digitalLife.action.actionMode,
      rendererHints: settledCompanionship && settledRendererHints
        ? {
            ...input.digitalLife.action.rendererHints,
            residentMode: settledRendererHints.residentMode,
            preferredMotionAliases: resolveDigitalLifeActionMotionAliases({
              rendererTarget: input.rendererTarget,
              settledAliases: settledRendererHints.preferredMotionAliases,
              actionAliases: input.digitalLife.action.rendererHints?.preferredMotionAliases,
              embodimentAliases: embodimentPreferredMotionAliases,
            }),
            reasonTags: settledRendererHints.reasonTags ?? input.digitalLife.action.rendererHints?.reasonTags,
            signature: settledRendererHints.signature ?? input.digitalLife.action.rendererHints?.signature,
          }
        : input.digitalLife.action.rendererHints,
      holdMs: settledCompanionship
        ? Math.max(input.digitalLife.action.holdMs, quietActionHoldFloorMs) + quieterMeasuredReturnActionHoldBiasMs
        : recovering
          ? Math.max(input.digitalLife.action.holdMs, 280)
          : input.digitalLife.action.holdMs,
    },
    frames: input.digitalLife.frames.map((frame) => {
      const settledFrameActionCue = recovering
        ? null
        : settledCompanionship
          ? resolveCallbackActionCueClamp({
              actionCue: frame.action.actionCue ?? continuityHeldActionCue,
              companionshipResidentMode,
              rendererTarget: input.rendererTarget,
              rememberedSeamMoreRoom: quieterMeasuredReturnSettling,
            })
          : frame.action.actionCue
      const settledFrameActionMode = recovering
        ? 'none'
        : repairBeforeCloseness
          ? 'hold'
          : settledCompanionship && (frame.action.actionCue ?? continuityHeldActionCue)
            ? 'hold'
            : frame.action.actionMode
      const settledFrameVoiceAuthority = reconcileRuntimeVoiceAuthority({
        voice: frame.voice,
        recovering,
        settledCompanionship,
        companionshipResidentMode,
        lowerPressureTiming,
        callbackSameThreadMeasuredReturn,
        quieterMeasuredReturnSettling,
        explicitMeasuredReturnBias,
      })
      const settledFrameMotorAuthority = reconcileRuntimeMotorAuthority({
        motor: frame.motor,
        recovering,
        settledCompanionship,
        companionshipResidentMode,
        lowerPressureTiming,
        quieterMeasuredReturnSettling,
        explicitEmbodimentCarry,
      })

      return {
        ...frame,
        mode: recovering
          ? 'recovering'
          : settledCompanionship && (
            measuredReturn
            || repairBeforeCloseness
            || settledFrameActionMode === 'none'
            || settledFrameActionMode === 'hold'
          )
            ? 'thinking'
            : frame.mode,
        voice: settledFrameVoiceAuthority.voice,
        motor: settledFrameMotorAuthority,
        lipSync: {
          ...frame.lipSync,
          continuityHoldMs: settledCompanionship
            ? Math.max(frame.lipSync.continuityHoldMs, quietFrameContinuityFloorMs) + quieterMeasuredReturnFrameContinuityHoldBiasMs
            : recovering
              ? Math.max(frame.lipSync.continuityHoldMs, 300)
              : frame.lipSync.continuityHoldMs,
          mode: recovering ? 'closed' : frame.lipSync.mode,
        },
        face: {
          ...frame.face,
          expressionMode: recovering || settledCompanionship ? 'hold' : frame.face.expressionMode,
          holdMs: settledCompanionship
            ? Math.max(frame.face.holdMs, quietFrameFaceHoldFloorMs) + quieterMeasuredReturnFrameFaceHoldBiasMs
            : recovering
              ? Math.max(frame.face.holdMs, 300)
              : frame.face.holdMs,
        },
        action: {
          ...frame.action,
          actionCue: settledFrameActionCue,
          actionMode: settledFrameActionMode,
          rendererHints: settledCompanionship && settledRendererHints
            ? {
                ...frame.action.rendererHints,
                residentMode: settledRendererHints.residentMode,
                preferredMotionAliases: resolveDigitalLifeActionMotionAliases({
                  rendererTarget: input.rendererTarget,
                  settledAliases: settledRendererHints.preferredMotionAliases,
                  actionAliases: frame.action.rendererHints?.preferredMotionAliases,
                  embodimentAliases: embodimentPreferredMotionAliases,
                }),
                reasonTags: settledRendererHints.reasonTags ?? frame.action.rendererHints?.reasonTags,
                signature: settledRendererHints.signature ?? frame.action.rendererHints?.signature,
              }
            : frame.action.rendererHints,
          holdMs: settledCompanionship
            ? Math.max(frame.action.holdMs, quietFrameActionHoldFloorMs) + quieterMeasuredReturnFrameActionHoldBiasMs
            : recovering
              ? Math.max(frame.action.holdMs, 260)
              : frame.action.holdMs,
        },
      }
    }),
  } satisfies AlicizationDigitalLifeEnvelope
}

export interface CoordinateAlicizationRuntimeEmbodimentInput {
  seed: AlicizationRuntimeEmbodimentSeed
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
}

export interface AlicizationRuntimeEmbodimentAuthority {
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  embodimentScript: AlicizationEmbodimentScriptV1 | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
}

function applyEmbodimentScriptPerformanceAuthority(input: {
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  embodimentScript: AlicizationEmbodimentScriptV1 | null
}): AlicizationDialogueEmbodimentEnvelope | null {
  if (!input.embodiment || !input.embodimentScript)
    return input.embodiment

  const state = input.embodimentScript.state
  const scriptHints = state.rendererHints ?? null
  const explicitRendererHints = input.embodiment.rendererHints ?? null
  const companionshipResidentMode = scriptHints?.residentMode === 'measured-return'
    || scriptHints?.residentMode === 'repair-before-closeness'
    || scriptHints?.residentMode === 'quiet-companionship'
    ? scriptHints.residentMode
    : null

  return {
    ...input.embodiment,
    performance: {
      ...input.embodiment.performance,
      baseEmotion: state.baseEmotion,
      delivery: state.delivery,
      emphasis: state.emphasis,
      residentMode: mapEmbodimentResidentModeToPerformanceResidentMode(state.residentMode),
    },
    rendererHints: scriptHints || explicitRendererHints
      ? {
          ...explicitRendererHints,
          residentMode: companionshipResidentMode ?? explicitRendererHints?.residentMode ?? scriptHints?.residentMode,
          preferredBlinkCadence: explicitRendererHints?.preferredBlinkCadence ?? scriptHints?.preferredBlinkCadence,
          preferredGazeMode: explicitRendererHints?.preferredGazeMode ?? scriptHints?.preferredGazeMode,
          preferredPauseMode: explicitRendererHints?.preferredPauseMode ?? scriptHints?.preferredPauseMode,
          preferredLipsyncMode: explicitRendererHints?.preferredLipsyncMode ?? scriptHints?.preferredLipsyncMode,
          preferredVoiceMode: explicitRendererHints?.preferredVoiceMode ?? scriptHints?.preferredVoiceMode,
          preferredPacingMode: explicitRendererHints?.preferredPacingMode ?? scriptHints?.preferredPacingMode,
          preferredExpressionAliases: explicitRendererHints?.preferredExpressionAliases ?? scriptHints?.preferredExpressionAliases,
          preferredMotionAliases: explicitRendererHints?.preferredMotionAliases ?? scriptHints?.preferredMotionAliases,
          reasonTags: scriptHints?.reasonTags ?? explicitRendererHints?.reasonTags,
          signature: scriptHints?.signature ?? explicitRendererHints?.signature,
        }
      : input.embodiment.rendererHints,
  } satisfies AlicizationDialogueEmbodimentEnvelope
}

function alignDigitalLifeActionCueToEmbodimentScriptAuthority(input: {
  digitalLife: AlicizationDigitalLifeEnvelope | null
  embodimentScript: AlicizationEmbodimentScriptV1 | null
  rendererTarget: 'live2d' | 'vrm'
}) {
  if (!input.digitalLife || !input.embodimentScript || input.rendererTarget === 'vrm')
    return input.digitalLife

  const residentMode = input.embodimentScript.state.residentMode
  const idleBase = input.embodimentScript.motionPlan.idleBase ?? null
  if (residentMode !== 'measured-return' || idleBase !== 'idle_settle')
    return input.digitalLife

  return {
    ...input.digitalLife,
    performance: {
      ...input.digitalLife.performance,
      actionCue: idleBase,
    },
    action: {
      ...input.digitalLife.action,
      actionCue: idleBase,
    },
    frames: input.digitalLife.frames.map(frame => ({
      ...frame,
      action: {
        ...frame.action,
        actionCue: idleBase,
      },
    })),
  } satisfies AlicizationDigitalLifeEnvelope
}

function applyDigitalLifeSpeechStyleToEmbodimentAuthority(input: {
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
}) {
  if (!input.embodiment || !input.digitalLife?.speechStyle)
    return input.embodiment

  return {
    ...input.embodiment,
    speechStyle: {
      ...input.embodiment.speechStyle,
      ...input.digitalLife.speechStyle,
    },
  } satisfies AlicizationDialogueEmbodimentEnvelope
}

export function coordinateAlicizationRuntimeEmbodiment(
  input: CoordinateAlicizationRuntimeEmbodimentInput,
): AlicizationRuntimeEmbodimentAuthority {
  const residentPerformance = input.residentPerformance ?? input.seed.residentPerformance ?? null
  const rendererTarget = input.manifest?.renderer === 'vrm' ? 'vrm' : 'live2d'
  const normalizedEmbodiment = resolveResidentSeededEmbodiment({
    embodiment: input.seed.embodiment,
    seededPerformance: input.seed.performance,
  })
  const residentCompanionshipMode = resolveResidentCompanionshipMode(residentPerformance)
  const projectStateCompanionshipMode = resolveProjectStateEmbodimentRestraint(input.seed)
  const companionshipResidentMode = resolveProactiveEmbodimentRestraint(input.seed)
    ?? resolveSilentSeedEmbodimentRestraint(input.seed)
    ?? resolveRuntimeContinuityArcEmbodimentRestraint(input.seed)
    ?? resolveAffectiveResidueEmbodimentRestraint(input.seed)
    ?? resolveHabitPolicyEmbodimentRestraint(input.seed)
    ?? (residentCompanionshipMode === 'repair-before-closeness'
      ? residentCompanionshipMode
      : projectStateCompanionshipMode)
    ?? resolveExecutionCallbackEmbodimentPosture(input.seed)
    ?? residentCompanionshipMode
  const embodiment = normalizedEmbodiment
    ? stabilizeCompanionshipDelivery({
        embodiment: normalizedEmbodiment,
        residentPerformance,
        companionshipResidentMode,
        seed: input.seed,
      })
    : null
  const speechTimeline = input.seed.speechTimeline ?? (embodiment
    ? buildAlicizationDialogueSpeechTimeline({
        reply: input.seed.replyText,
        candidateEmotion: embodiment.emotion,
        candidatePerformance: embodiment.performance,
        embodiment,
        performanceManifest: input.manifest,
      })
    : null)
  const embodimentScript = embodiment
    && speechTimeline
    ? buildRuntimeEmbodimentScript({
        seed: input.seed,
        embodiment,
        speechTimeline,
        manifest: input.manifest,
        residentPerformance,
      })
    : null
  const authoritativeEmbodiment = applyEmbodimentScriptPerformanceAuthority({
    embodiment,
    embodimentScript,
  })
  const projectedSpeechTimeline = projectEmbodimentScriptHintsToSpeechTimeline({
    speechTimeline,
    embodimentScript,
  })
  const digitalLife = input.seed.digitalLife ?? (authoritativeEmbodiment
    ? buildAlicizationDigitalLifeEnvelope({
        embodiment: authoritativeEmbodiment,
        speechTimeline: projectedSpeechTimeline,
        digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(input.seed.digitalLifeSpine),
        performanceManifest: input.manifest,
      })
    : null)
  const authoritativeDigitalLife = digitalLife
    ? reconcileRuntimeDigitalLifeAuthority({
        seed: input.seed,
        digitalLife,
        residentPerformance,
        rendererTarget,
      })
    : null
  const mapRendererNativeMeasuredReturnActionCue = (actionCue: string | null | undefined) =>
    resolveRendererNativeMeasuredReturnActionCue({
      actionCue,
      manifest: input.manifest,
      rendererTarget,
      companionshipResidentMode,
    })
  const rendererNativeEmbodiment = authoritativeEmbodiment
    ? {
      ...authoritativeEmbodiment,
      performance: {
        ...authoritativeEmbodiment.performance,
        actionCue: mapRendererNativeMeasuredReturnActionCue(authoritativeEmbodiment.performance.actionCue),
      },
    } satisfies AlicizationDialogueEmbodimentEnvelope
    : authoritativeEmbodiment
  const rendererNativeSpeechTimeline = projectedSpeechTimeline
    ? {
      ...projectedSpeechTimeline,
      segments: projectedSpeechTimeline.segments.map(segment => ({
        ...segment,
        actionCue: mapRendererNativeMeasuredReturnActionCue(segment.actionCue),
      })),
    } satisfies AlicizationDialogueSpeechTimeline
    : projectedSpeechTimeline
  const rendererNativeEmbodimentScript = embodimentScript
    ? normalizeAlicizationEmbodimentScript({
        ...embodimentScript,
        motionPlan: {
          ...embodimentScript.motionPlan,
          idleBase: mapRendererNativeMeasuredReturnActionCue(embodimentScript.motionPlan.idleBase),
          actionBursts: embodimentScript.motionPlan.actionBursts.map(burst => ({
            ...burst,
            actionCue: mapRendererNativeMeasuredReturnActionCue(burst.actionCue),
          })),
        },
      })
    : embodimentScript
  const rendererNativeDigitalLife = authoritativeDigitalLife
    ? {
      ...authoritativeDigitalLife,
      performance: {
        ...authoritativeDigitalLife.performance,
        actionCue: mapRendererNativeMeasuredReturnActionCue(authoritativeDigitalLife.performance.actionCue),
      },
      action: {
        ...authoritativeDigitalLife.action,
        actionCue: mapRendererNativeMeasuredReturnActionCue(authoritativeDigitalLife.action.actionCue),
      },
      frames: authoritativeDigitalLife.frames.map(frame => ({
        ...frame,
        action: {
          ...frame.action,
          actionCue: mapRendererNativeMeasuredReturnActionCue(frame.action.actionCue),
        },
      })),
    } satisfies AlicizationDigitalLifeEnvelope
    : authoritativeDigitalLife
  const alignedRendererNativeDigitalLife = alignDigitalLifeActionCueToEmbodimentScriptAuthority({
    digitalLife: rendererNativeDigitalLife,
    embodimentScript: rendererNativeEmbodimentScript,
    rendererTarget,
  })
  const alignedRendererNativeEmbodiment = applyDigitalLifeSpeechStyleToEmbodimentAuthority({
    embodiment: rendererNativeEmbodiment,
    digitalLife: alignedRendererNativeDigitalLife,
  })

  return {
    embodiment: alignedRendererNativeEmbodiment,
    speechTimeline: rendererNativeSpeechTimeline,
    embodimentScript: rendererNativeEmbodimentScript,
    digitalLife: alignedRendererNativeDigitalLife,
  }
}
