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

function resolveCoordinatorMemoryEmbodiment(
  seed: AlicizationRuntimeEmbodimentSeed | null | undefined,
) {
  const trace = seed?.digitalLifeSpine?.memory?.memoryClosureTrace
  if (trace?.authority !== 'memory-os')
    return null

  const embodiment = trace.nextInfluence.embodiment
  return embodiment && typeof embodiment === 'object'
    ? embodiment as Record<string, unknown>
    : null
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

  const embodimentHints = seed.embodiment?.rendererHints ?? null
  const memoryEmbodiment = resolveCoordinatorMemoryEmbodiment(seed)

  return {
    preferredBlinkCadence: sanitizeCoordinatorPreferredBlinkCadence(
      embodimentHints?.preferredBlinkCadence
      ?? memoryEmbodiment?.preferredBlinkCadence
      ?? null,
    ),
    preferredGazeMode: sanitizeCoordinatorPreferredGazeMode(
      embodimentHints?.preferredGazeMode
      ?? memoryEmbodiment?.preferredGazeMode
      ?? null,
    ),
    preferredVoiceMode: sanitizeCoordinatorPreferredVoiceMode(
      embodimentHints?.preferredVoiceMode
      ?? memoryEmbodiment?.preferredVoiceMode
      ?? null,
    ),
    preferredPauseMode: sanitizeCoordinatorPreferredPauseMode(
      embodimentHints?.preferredPauseMode
      ?? memoryEmbodiment?.preferredPauseMode
      ?? null,
    ),
    preferredLipsyncMode: sanitizeCoordinatorPreferredLipsyncMode(
      embodimentHints?.preferredLipsyncMode
      ?? memoryEmbodiment?.preferredLipsyncMode
      ?? null,
    ),
    preferredPacingMode: sanitizeCoordinatorPreferredPacingMode(
      embodimentHints?.preferredPacingMode
      ?? memoryEmbodiment?.preferredPacingMode
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

function resolveCoordinatorMemoryEmbodimentCarry(seed: AlicizationRuntimeEmbodimentSeed | null | undefined) {
  const memoryEmbodiment = resolveCoordinatorMemoryEmbodiment(seed)
  return {
    embodimentRecallStrength: sanitizeCoordinatorEmbodimentRecallStrength(memoryEmbodiment?.embodimentRecallStrength),
    embodimentModalityRisk: sanitizeCoordinatorEmbodimentModalityRisk(memoryEmbodiment?.embodimentModalityRisk),
    preferredGazeMode: sanitizeCoordinatorPreferredGazeMode(
      memoryEmbodiment?.preferredGazeMode,
    ),
    preferredBlinkCadence: sanitizeCoordinatorPreferredBlinkCadence(
      memoryEmbodiment?.preferredBlinkCadence,
    ),
    preferredVoiceMode: sanitizeCoordinatorPreferredVoiceMode(
      memoryEmbodiment?.preferredVoiceMode,
    ),
    preferredPauseMode: sanitizeCoordinatorPreferredPauseMode(
      memoryEmbodiment?.preferredPauseMode,
    ),
    preferredLipsyncMode: sanitizeCoordinatorPreferredLipsyncMode(
      memoryEmbodiment?.preferredLipsyncMode,
    ),
    preferredPacingMode: sanitizeCoordinatorPreferredPacingMode(
      memoryEmbodiment?.preferredPacingMode,
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

function hasMemoryEmbodimentSettling(seed: AlicizationRuntimeEmbodimentSeed | null | undefined) {
  const carry = resolveCoordinatorMemoryEmbodimentCarry(seed)
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

type AlicizationCoordinatorMemoryEmbodimentCarry = ReturnType<
  typeof resolveCoordinatorMemoryEmbodimentCarry
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
  explicitEmbodimentCarry?: AlicizationCoordinatorMemoryEmbodimentCarry | null
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

function resolveEmbodimentHabitPolicy(seed: AlicizationRuntimeEmbodimentSeed) {
  const canonicalHabit = seed.digitalLifeSpine?.habit
  if (!canonicalHabit)
    return null

  return {
    dominantMode: sanitizeCadenceText(canonicalHabit.dominantMode, 80),
    suggestedStyleCap: sanitizeCadenceText(canonicalHabit.suggestedStyleCap, 80),
    suggestedPresenceCap: sanitizeCadenceText(canonicalHabit.suggestedPresenceCap, 80),
  }
}

function reconcileRuntimeVoiceAuthority(input: {
  voice: AlicizationDigitalLifeEnvelope['voice']
  speechStyle?: AlicizationDigitalLifeEnvelope['speechStyle']
  recovering: boolean
  settledCompanionship: boolean
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  lowerPressureTiming: boolean
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
  explicitEmbodimentCarry?: ReturnType<typeof resolveCoordinatorMemoryEmbodimentCarry>
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

function hasLowerPressureRelationshipTiming(
  seed: AlicizationRuntimeEmbodimentSeed,
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  const preferences = resolveCoordinatorExplicitRendererPreferences(seed)
  const affectiveResidue = seed.affectiveResidue
  const relationshipCadence = affectiveResidue?.relationshipCadence

  return preferences.preferredVoiceMode === 'lower-pressure'
    || preferences.preferredPacingMode === 'slower'
    || preferences.preferredPauseMode === 'longer'
    || relationshipCadence?.shouldDelayWarmth === true
    || (relationshipCadence?.overreachRisk ?? 0) >= 0.24
    || residentPerformance?.emotionalTension === 'late-night-drain'
    || residentPerformance?.emotionalTension === 'restless-switching'
}

function resolveResidentCompanionshipMode(residentPerformance: AlicizationResidentPerformanceSnapshot | null) {
  if (residentPerformance?.source !== 'main-runtime')
    return null

  if (residentPerformance?.emotionalTension === 'late-night-drain')
    return 'repair-before-closeness' as const
  if (residentPerformance?.emotionalTension === 'restless-switching')
    return 'measured-return' as const

  return 'quiet-companionship' as const
}

function resolveAffectiveResidueEmbodimentRestraint(seed: AlicizationRuntimeEmbodimentSeed) {
  const affectiveResidue = seed.affectiveResidue ?? null
  const cadence = affectiveResidue?.relationshipCadence ?? null
  if (!affectiveResidue || !cadence)
    return null

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

  return null
}

function resolveHabitPolicyEmbodimentRestraint(seed: AlicizationRuntimeEmbodimentSeed) {
  const habitPolicy = resolveEmbodimentHabitPolicy(seed)
  const dominantMode = habitPolicy?.dominantMode ?? ''
  const suggestedStyleCap = habitPolicy?.suggestedStyleCap ?? ''
  const suggestedPresenceCap = habitPolicy?.suggestedPresenceCap ?? ''

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

function habitPolicyPrefersGentleDelivery(seed: AlicizationRuntimeEmbodimentSeed) {
  const habitPolicy = resolveEmbodimentHabitPolicy(seed)
  const dominantMode = habitPolicy?.dominantMode ?? ''
  const suggestedStyleCap = habitPolicy?.suggestedStyleCap ?? ''
  const suggestedPresenceCap = habitPolicy?.suggestedPresenceCap ?? ''

  return (
    dominantMode === 'return-with-proof'
    || dominantMode === 'light-touch-companionship'
    || dominantMode === 'repair-before-fluency'
    || suggestedStyleCap === 'silent-observe'
    || suggestedPresenceCap === 'glance'
    || suggestedPresenceCap === 'hesitant'
    || suggestedPresenceCap === 'concerned'
  )
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
    ? resolveAffectiveResidueEmbodimentRestraint(input.seed) != null && (
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

function resolveCoordinatorSpeechSegmentRendererHints(input: {
  seed?: AlicizationRuntimeEmbodimentSeed | null
  companionshipResidentMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | null
  rendererTarget: 'live2d' | 'vrm'
  tempoShift: number
  rememberedSeamMoreRoom?: boolean
}): AlicizationDialogueEmbodimentRendererHints | null {
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
    } satisfies AlicizationDialogueEmbodimentRendererHints
  }

  if (Object.keys(explicitRendererPreferences).length > 0)
    return explicitRendererPreferences

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
  const lowerPressureTiming = hasLowerPressureRelationshipTiming(
    input.seed,
    input.residentPerformance,
  )
  const residentCompanionshipMode = resolveResidentCompanionshipMode(input.residentPerformance)
  const companionshipResidentMode = resolveAffectiveResidueEmbodimentRestraint(input.seed)
    ?? resolveHabitPolicyEmbodimentRestraint(input.seed)
    ?? residentCompanionshipMode
  const rendererTarget = input.manifest?.renderer === 'vrm' ? 'vrm' : 'live2d'
  const rememberedEmbodimentRecallSettling = companionshipResidentMode === 'measured-return'
    && hasMemoryEmbodimentSettling(input.seed)
  const explicitMeasuredReturnRendererPreference = companionshipResidentMode === 'measured-return'
    && hasQuieterMeasuredReturnRendererPreference(
      resolveCoordinatorExplicitRendererPreferences(input.seed),
    )
  const quieterMeasuredReturnSettling = rememberedEmbodimentRecallSettling
    || explicitMeasuredReturnRendererPreference
  const explicitEmbodimentCarry = resolveCoordinatorMemoryEmbodimentCarry(input.seed)
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
  const lowerPressureTiming = hasLowerPressureRelationshipTiming(
    input.seed,
    input.residentPerformance,
  )
  const residentCompanionshipMode = resolveResidentCompanionshipMode(input.residentPerformance)
  const companionshipResidentMode = resolveAffectiveResidueEmbodimentRestraint(input.seed)
    ?? resolveHabitPolicyEmbodimentRestraint(input.seed)
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
  const rememberedEmbodimentRecallSettling = measuredReturn
    && hasMemoryEmbodimentSettling(input.seed)
  const explicitMeasuredReturnRendererPreference = measuredReturn
    && hasQuieterMeasuredReturnRendererPreference(
      resolveCoordinatorExplicitRendererPreferences(input.seed),
    )
  const quieterMeasuredReturnSettling = rememberedEmbodimentRecallSettling
    || explicitMeasuredReturnRendererPreference
  const explicitEmbodimentCarry = resolveCoordinatorMemoryEmbodimentCarry(input.seed)
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
  const companionshipResidentMode = resolveAffectiveResidueEmbodimentRestraint(input.seed)
    ?? resolveHabitPolicyEmbodimentRestraint(input.seed)
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
        digitalLifeSpine: null,
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
