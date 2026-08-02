import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'

import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { resolvePreferredPersonStateProjection } from './person-state-projection-resolution'

export type AlicizationExecutionInteractionTone = 'cautious' | 'balanced' | 'direct'
export type AlicizationExecutionResultDeliveryMode = 'deliver-now' | 'check-availability-first' | 'hold-for-opening'

export interface AlicizationExecutionInteractionLearningProfile {
  proposalTone: AlicizationExecutionInteractionTone
  resultTone: AlicizationExecutionInteractionTone
  autonomyRespect: number
  directness: number
  proofBias: number
  openingPatience: number
  mutateThreshold: number
  resultCheckInBias: number
  payoffWarmth: number
  closurePatience: number
  companionshipFraming: 'quiet-presence' | 'steady-handoff' | 'close-carry'
  resultLeadStyle: 'result-first' | 'availability-first' | 'soft-handoff'
  holdResultsWhenBusy: boolean
}

export interface AlicizationExecutionResultDeliveryPolicy {
  mode: AlicizationExecutionResultDeliveryMode
  tone: AlicizationExecutionInteractionTone
  payoffWarmth?: number
  closurePatience?: number
  companionshipFraming?: 'quiet-presence' | 'steady-handoff' | 'close-carry'
  resultLeadStyle?: 'result-first' | 'availability-first' | 'soft-handoff'
  reasonTags: string[]
}

function clampUnit(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object')
    return null
  return value as Record<string, unknown>
}

function readUnit(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return null
  return clampUnit(numeric)
}

function readFlag(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function sanitizeText(raw: unknown, maxChars = 64) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function hasExecutionCallbackAfterglowHold(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const surface = input.digitalLifeSpine?.runtimeSurface ?? null
  const bundleProjection = toRecord(surface?.memory?.derivedMindStateBundle?.personStateProjection)
  const runtimeProjection = toRecord(surface?.memory?.personStateProjection)
  const projection = resolvePreferredPersonStateProjection({
    bundleProjection: bundleProjection as Record<string, any> | null | undefined,
    runtimeProjection: runtimeProjection as Record<string, any> | null | undefined,
  }) as Record<string, any> | null | undefined
  const projectionCandidates = [projection, bundleProjection, runtimeProjection]
    .filter((candidate): candidate is Record<string, any> => Boolean(candidate))
  const continuityStates = projectionCandidates
    .map(candidate => candidate.personalityContinuityState)
    .filter((candidate): candidate is Record<string, any> => Boolean(candidate && typeof candidate === 'object' && !Array.isArray(candidate)))
  const rhythmStates = continuityStates
    .map(candidate => candidate.rhythmState)
    .filter((candidate): candidate is Record<string, any> => Boolean(candidate && typeof candidate === 'object' && !Array.isArray(candidate)))
  const executionCallbackContext = projectionCandidates.some(candidate => candidate.activeClosenessContext === 'execution-callback')
    || continuityStates.some(candidate => candidate.currentRegime === 'execution-callback')
  const holdForOpeningActive = rhythmStates.some(candidate => candidate.cadenceMode === 'cooldown')

  return executionCallbackContext && holdForOpeningActive
}

function readExecutionResultFeedbackSignal(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const world = input.digitalLifeSpine?.runtimeSurface.world
  const hostState = toRecord(world?.worldModel?.hostState)
  const relationshipModel = toRecord(world?.relationshipModel)
  const hostAttitude = sanitizeText(
    hostState?.attitude
    ?? relationshipModel?.hostAttitude
    ?? relationshipModel?.climate
    ?? relationshipModel?.approachVector
    ?? (Array.isArray(relationshipModel?.activeBoundaries) ? relationshipModel.activeBoundaries.join(' ') : null)
    ?? (Array.isArray(relationshipModel?.narrative) ? relationshipModel.narrative.join(' ') : null)
    ?? hostState?.availability
    ?? hostState?.burden
    ?? '',
    220,
  ).toLowerCase()

  return {
    valued: /(?:^|;\s*)execution_feedback=valued(?:;|$)/u.test(hostAttitude),
    doubted: /(?:^|;\s*)execution_feedback=doubted(?:;|$)/u.test(hostAttitude),
    intrusive: /(?:^|;\s*)execution_feedback=intrusive(?:;|$)/u.test(hostAttitude),
    interrupted: /(?:^|;\s*)execution_feedback=interrupted(?:;|$)/u.test(hostAttitude),
  }
}

export function deriveExecutionInteractionLearningProfile(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}): AlicizationExecutionInteractionLearningProfile {
  let digest = null as ReturnType<typeof projectAlicizationDigitalLifeSpineDigest>
  try {
    digest = projectAlicizationDigitalLifeSpineDigest(input.digitalLifeSpine ?? null)
  }
  catch {
    digest = null
  }

  const surface = input.digitalLifeSpine?.runtimeSurface ?? null
  const surfaceMemory = toRecord(surface?.memory)
  const surfaceAgency = toRecord(surface?.agency)
  const rawAutobiographicalSelf = toRecord(surfaceMemory?.autobiographicalSelf)
  const rawPersonaDrift = toRecord(rawAutobiographicalSelf?.personaDrift)
  const rawPreferenceEvolution = toRecord(rawAutobiographicalSelf?.preferenceEvolution)
  const rawLongHorizonMemory = toRecord(surfaceMemory?.longHorizonMemory)
  const rawPreferenceBias = toRecord(rawLongHorizonMemory?.preferenceBias)
  const rawIdentityBias = toRecord(rawLongHorizonMemory?.identityBias)
  const rawSelfContinuity = toRecord(surfaceMemory?.selfContinuity)
  const rawHabit = toRecord(surfaceAgency?.habitPolicy)
  const rawMotiveEngine = toRecord(surfaceMemory?.motiveEngine)
  const rawMotiveDrives = toRecord(rawMotiveEngine?.drives)
  const executionFeedbackSignal = readExecutionResultFeedbackSignal(input)

  const autobiographicalSelf = digest?.embodiment?.autobiographicalSelf ?? null
  const mindEcology = digest?.embodiment?.mindEcology ?? null
  const habit = digest?.habit ?? null
  const motive = digest?.motive ?? null

  const rememberedAutonomy = readUnit(rawPreferenceBias?.autonomyRespect) ?? 0
  const rememberedTruth = readUnit(rawPreferenceBias?.truthfulGrounding) ?? 0
  const rememberedObservation = readUnit(rawPreferenceBias?.quietObservation) ?? 0
  const rememberedRepair = readUnit(rawPreferenceBias?.gentleRepair) ?? 0
  const rememberedDirectness = readUnit(rawIdentityBias?.directness) ?? 0
  const rememberedGuardedness = readUnit(rawIdentityBias?.guardedness) ?? 0
  const rememberedTenderness = readUnit(rawIdentityBias?.tenderness) ?? 0
  const selfGuarding = readUnit(rawSelfContinuity?.guardingTendency) ?? 0
  const selfTemperament = sanitizeText(rawSelfContinuity?.initiativeTemperament, 48) || null
  const requiresGroundingBeforeSurface = habit?.requiresGroundingBeforeSurface
    ?? readFlag(rawHabit?.requiresGroundingBeforeSurface)
    ?? false
  const prefersQuietCompanionship = habit?.prefersQuietCompanionship
    ?? readFlag(rawHabit?.prefersQuietCompanionship)
    ?? false
  const blocksDirectSpeakWhenBusy = habit?.blocksDirectSpeakWhenBusy
    ?? readFlag(rawHabit?.blocksDirectSpeakWhenBusy)
    ?? false

  const autobiographicalAutonomy = clampUnit(
    (autobiographicalSelf?.autonomyRespect ?? readUnit(rawPreferenceEvolution?.autonomyRespect) ?? 0.52) * 0.68
    + rememberedAutonomy * 0.22
    + (selfTemperament === 'reserved' ? 0.06 : 0),
  )
  const autobiographicalTruth = clampUnit(
    (autobiographicalSelf?.truthfulGrounding ?? readUnit(rawPreferenceEvolution?.truthfulGrounding) ?? 0.56) * 0.72
    + rememberedTruth * 0.2
    + rememberedRepair * 0.08,
  )
  const autobiographicalAgency = autobiographicalSelf?.agencyStyle
    ?? (sanitizeText(rawPersonaDrift?.agencyStyle, 48) || null)
    ?? (selfTemperament === 'eager' ? 'self-starting' : selfTemperament === 'reserved' ? 'reserved' : null)
  const expressionStyle = autobiographicalSelf?.expressionStyle
    ?? (sanitizeText(rawPersonaDrift?.expressionStyle, 48) || null)
  const conflictStyle = autobiographicalSelf?.conflictStyle
    ?? (sanitizeText(rawPersonaDrift?.conflictStyle, 64) || null)
  const mindDirectness = clampUnit(
    mindEcology?.temperament.directness
    ?? rememberedDirectness * 0.88
    + (selfTemperament === 'eager' ? 0.12 : 0),
  )
  const mindGuardedness = clampUnit(
    mindEcology?.temperament.irritability
    ?? rememberedGuardedness * 0.72
    + selfGuarding * 0.28,
  )
  const mindSolitude = clampUnit(
    mindEcology?.climate.solitudeNeed
    ?? rememberedObservation * 0.62
    + selfGuarding * 0.18
    + (selfTemperament === 'reserved' ? 0.08 : 0),
  )
  const mindReflectivePull = clampUnit(
    mindEcology?.climate.reflectivePull
    ?? rememberedTruth * 0.32
    + rememberedObservation * 0.28
    + rememberedRepair * 0.18
    + (requiresGroundingBeforeSurface ? 0.12 : 0),
  )
  const truthDrive = motive?.truthDisciplineDrive
    ?? readUnit(rawMotiveDrives?.truthDiscipline)
    ?? 0

  const autonomyRespect = clampUnit(
    autobiographicalAutonomy * 0.48
    + (blocksDirectSpeakWhenBusy ? 0.12 : 0)
    + (prefersQuietCompanionship ? 0.1 : 0)
    + mindSolitude * 0.16
    + mindGuardedness * 0.14,
  )
  const directness = clampUnit(
    (autobiographicalAgency === 'self-starting' ? 0.18 : autobiographicalAgency === 'balanced' ? 0.08 : -0.08)
    + mindDirectness * 0.44
    + (expressionStyle === 'sharp' ? 0.16 : expressionStyle === 'measured' ? 0.06 : 0)
    + (conflictStyle === 'direct-when-certain' ? 0.08 : 0)
    + (selfTemperament === 'eager' ? 0.06 : selfTemperament === 'reserved' ? -0.06 : 0),
  )
  const proofBias = clampUnit(
    autobiographicalTruth * 0.42
    + truthDrive * 0.24
    + (requiresGroundingBeforeSurface ? 0.14 : 0)
    + mindReflectivePull * 0.12,
  )
  const openingPatience = clampUnit(
    autonomyRespect * 0.4
    + (prefersQuietCompanionship ? 0.12 : 0)
    + (blocksDirectSpeakWhenBusy ? 0.12 : 0)
    + (autobiographicalAgency === 'reserved' ? 0.12 : 0)
    + mindSolitude * 0.1
    + (selfTemperament === 'reserved' ? 0.08 : selfTemperament === 'eager' ? -0.06 : 0)
    - directness * 0.16,
  )
  const mutateThreshold = clampUnit(
    0.78
    + autonomyRespect * 0.12
    + openingPatience * 0.06
    + proofBias * 0.04
    - directness * 0.1,
  )
  const resultCheckInBias = clampUnit(
    autonomyRespect * 0.32
    + openingPatience * 0.26
    + (prefersQuietCompanionship ? 0.12 : 0)
    + (blocksDirectSpeakWhenBusy ? 0.12 : 0)
    + mindSolitude * 0.12
    + mindReflectivePull * 0.08
    + (executionFeedbackSignal.doubted ? 0.12 : 0)
    + (executionFeedbackSignal.intrusive ? 0.18 : 0)
    + (executionFeedbackSignal.interrupted ? 0.16 : 0)
    - (executionFeedbackSignal.valued ? 0.14 : 0)
    - directness * 0.16,
  )
  const payoffWarmth = clampUnit(
    autonomyRespect * 0.22
    + resultCheckInBias * 0.18
    + rememberedRepair * 0.08
    + rememberedAutonomy * 0.08
    + rememberedTruth * 0.06
    + (prefersQuietCompanionship ? 0.08 : 0)
    + (conflictStyle === 'soften-first' ? 0.08 : 0)
    + (expressionStyle === 'warm' ? 0.06 : expressionStyle === 'sharp' ? -0.04 : 0)
    + rememberedTenderness * 0.18
    + (executionFeedbackSignal.valued ? 0.12 : 0)
    - (executionFeedbackSignal.intrusive ? 0.06 : 0)
    - (executionFeedbackSignal.interrupted ? 0.04 : 0)
    - rememberedGuardedness * 0.04,
  )
  const closurePatience = clampUnit(
    openingPatience * 0.34
    + resultCheckInBias * 0.32
    + mindReflectivePull * 0.14
    + rememberedRepair * 0.06
    + rememberedTruth * 0.04
    + rememberedAutonomy * 0.03
    + (prefersQuietCompanionship ? 0.08 : 0)
    - directness * 0.08,
  )
  const companionshipFraming
    = executionFeedbackSignal.valued && !executionFeedbackSignal.intrusive && !executionFeedbackSignal.interrupted
      ? 'close-carry'
      : payoffWarmth >= 0.62 && resultCheckInBias >= 0.48
        ? 'close-carry'
        : directness >= 0.6 && resultCheckInBias < 0.46
          ? 'steady-handoff'
          : 'quiet-presence'
  const resultLeadStyle
    = executionFeedbackSignal.intrusive || executionFeedbackSignal.interrupted || executionFeedbackSignal.doubted
      ? 'availability-first'
      : resultCheckInBias >= 0.58
        ? 'availability-first'
        : companionshipFraming === 'close-carry' && payoffWarmth >= 0.62
          ? 'soft-handoff'
          : 'result-first'

  const proposalTone: AlicizationExecutionInteractionTone
    = openingPatience >= 0.62 || autonomyRespect >= directness + 0.12
      ? 'cautious'
      : directness >= 0.62 && openingPatience <= 0.42
        ? 'direct'
        : 'balanced'
  const resultTone: AlicizationExecutionInteractionTone
    = executionFeedbackSignal.intrusive || executionFeedbackSignal.doubted || executionFeedbackSignal.interrupted
      ? 'cautious'
      : resultCheckInBias >= 0.56 || autonomyRespect >= directness + 0.08
        ? 'cautious'
        : directness >= 0.64 && resultCheckInBias <= 0.38
          ? 'direct'
          : 'balanced'

  return {
    proposalTone,
    resultTone,
    autonomyRespect,
    directness,
    proofBias,
    openingPatience,
    mutateThreshold,
    resultCheckInBias,
    payoffWarmth,
    closurePatience,
    companionshipFraming,
    resultLeadStyle,
    holdResultsWhenBusy: Boolean(
      resultCheckInBias >= 0.58
      || blocksDirectSpeakWhenBusy
      || prefersQuietCompanionship,
    ),
  }
}

export function deriveExecutionResultDeliveryPolicy(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  status: 'completed' | 'failed' | 'blocked' | 'cancelled'
}): AlicizationExecutionResultDeliveryPolicy {
  const profile = deriveExecutionInteractionLearningProfile(input)
  const executionCallbackAfterglowHold = hasExecutionCallbackAfterglowHold(input)
  const hostAvailability = input.digitalLifeSpine?.runtimeSurface.world.worldModel?.hostState?.availability ?? 'open'
  const hostBusy = hostAvailability === 'focused' || hostAvailability === 'immersed'
  const sensitiveResult = input.status === 'completed'

  const mode: AlicizationExecutionResultDeliveryMode
    = executionCallbackAfterglowHold
      ? 'hold-for-opening'
      : hostBusy && sensitiveResult && profile.holdResultsWhenBusy
        ? 'hold-for-opening'
        : profile.resultLeadStyle === 'availability-first'
          ? 'check-availability-first'
          : profile.resultCheckInBias >= 0.56 || (hostBusy && profile.resultCheckInBias >= 0.42)
            ? 'check-availability-first'
            : 'deliver-now'

  return {
    mode,
    tone: profile.resultTone,
    payoffWarmth: profile.payoffWarmth,
    closurePatience: profile.closurePatience,
    companionshipFraming: profile.companionshipFraming,
    resultLeadStyle: profile.resultLeadStyle,
    reasonTags: [
      `result-mode:${mode}`,
      `result-tone:${profile.resultTone}`,
      `result-framing:${profile.companionshipFraming}`,
      `result-lead:${profile.resultLeadStyle}`,
      `host:${sanitizeText(hostAvailability, 32) || 'unknown'}`,
      `check-in:${profile.resultCheckInBias.toFixed(2)}`,
      ...(executionCallbackAfterglowHold ? ['callback-afterglow-hold'] : []),
    ],
  }
}
