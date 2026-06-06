import type { StageEmbodimentPresencePostureState } from '@proj-alicization/stage-shared'

import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationSoftenedSameHerCarry,
} from '@proj-alicization/stage-shared'

function uniqueAliases(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized)
      continue

    const signature = normalized.toLowerCase()
    if (seen.has(signature))
      continue

    seen.add(signature)
    result.push(normalized)
  }

  return result
}

function hasLowerPressureTiming(
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined,
) {
  const residentReasonTags = visualPresenceState?.residentPerformance?.reasonTags ?? []
  if (
    residentReasonTags.includes('timing:lower-pressure-opening')
    || residentReasonTags.includes('measured-return')
    || residentReasonTags.includes('repair-before-closeness')
  ) {
    return true
  }

  const rationaleTags = visualPresenceState?.privateThought?.rationaleTags ?? []
  return rationaleTags.includes('timing:lower-pressure-opening')
    || rationaleTags.includes('measured-return')
    || rationaleTags.includes('repair-before-closeness')
}

function hasQuietAccompanimentResidentSignature(
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined,
) {
  if (visualPresenceState?.continuityMode !== 'quiet-accompaniment')
    return false
  if (visualPresenceState?.currentBodyState !== 'accompanying')
    return false
  if (Number(visualPresenceState?.quietLineMs ?? 0) < 120_000)
    return false

  const resident = visualPresenceState?.residentPerformance
  const privateThought = visualPresenceState?.privateThought
  const residentReasonTags = resident?.reasonTags ?? []
  const privateThoughtTags = privateThought?.rationaleTags ?? []
  const residentSignature = typeof resident?.signature === 'string'
    ? resident.signature.toLowerCase()
    : ''

  return resident?.stance === 'accompany'
    && privateThought?.shouldSpeak === false
    && resident?.performance?.delivery === 'gentle'
    && resident?.performance?.actionCue === 'steady_focus'
    && (
      residentReasonTags.includes('continuity:quiet-accompaniment')
      || privateThoughtTags.includes('continuity:quiet-accompaniment')
      || (residentSignature.includes('subconscious-proactive') && residentSignature.includes('silent-observe'))
    )
}

function hasAudibleSameHerResidentSignature(
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined,
) {
  const resident = visualPresenceState?.residentPerformance
  const privateThought = visualPresenceState?.privateThought
  return hasAlicizationAudibleSameHerCarry({
    signature: resident?.signature ?? null,
    reasonTags: [
      ...(resident?.reasonTags ?? []),
      ...(privateThought?.rationaleTags ?? []),
    ],
  })
}

function hasSoftenedSameHerResidentSignature(
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined,
) {
  const resident = visualPresenceState?.residentPerformance
  const privateThought = visualPresenceState?.privateThought
  return hasAlicizationSoftenedSameHerCarry({
    signature: resident?.signature ?? null,
    reasonTags: [
      ...(resident?.reasonTags ?? []),
      ...(privateThought?.rationaleTags ?? []),
    ],
  })
}

function isQuietLowerPressureAttentivePosture(
  presencePosture: StageEmbodimentPresencePostureState | null | undefined,
) {
  return presencePosture?.engaged === true
    && presencePosture.mode === 'attentive'
    && presencePosture.gazeStability >= 0.88
    && presencePosture.breathBoost <= 0.14
    && Math.abs(presencePosture.bodyYaw) <= 0.03
    && presencePosture.bodyPitch <= 0.24
}

export function resolveResidentLive2DPreferredExpressionAliases(input: {
  emotion: string
  configuredAliases: readonly string[] | null | undefined
  presencePosture: StageEmbodimentPresencePostureState | null | undefined
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined
}) {
  const lowerPressureTiming = hasLowerPressureTiming(input.visualPresenceState)
  const audibleSameHerResident = hasAudibleSameHerResidentSignature(input.visualPresenceState)
  const softenedSameHerResident = hasSoftenedSameHerResidentSignature(input.visualPresenceState)
  const quietLowerPressureAttentive = (
    lowerPressureTiming
    || hasQuietAccompanimentResidentSignature(input.visualPresenceState)
    || softenedSameHerResident
  )
  && isQuietLowerPressureAttentivePosture(input.presencePosture)

  if (!quietLowerPressureAttentive)
    return uniqueAliases([...input.configuredAliases ?? [], input.emotion])

  return uniqueAliases([
    ...(audibleSameHerResident ? ['relaxed'] : ['soft-gaze']),
    ...(audibleSameHerResident ? ['soft-gaze'] : ['relaxed']),
    'half-lid',
    ...input.configuredAliases ?? [],
    input.emotion,
  ])
}

export function resolveResidentVrmPreferredExpressionAliases(input: {
  emotion: string
  configuredAliases: readonly string[] | null | undefined
  presencePosture: StageEmbodimentPresencePostureState | null | undefined
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined
}) {
  const lowerPressureTiming = hasLowerPressureTiming(input.visualPresenceState)
  const audibleSameHerResident = hasAudibleSameHerResidentSignature(input.visualPresenceState)
  const softenedSameHerResident = hasSoftenedSameHerResidentSignature(input.visualPresenceState)
  const quietLowerPressureAttentive = (
    lowerPressureTiming
    || hasQuietAccompanimentResidentSignature(input.visualPresenceState)
    || softenedSameHerResident
  )
  && isQuietLowerPressureAttentivePosture(input.presencePosture)

  if (!quietLowerPressureAttentive)
    return uniqueAliases([...input.configuredAliases ?? [], input.emotion])

  return uniqueAliases([
    'relaxed',
    ...(audibleSameHerResident ? ['soft'] : []),
    ...input.configuredAliases ?? [],
    input.emotion,
  ])
}

export function resolveResidentFacialCueBias(input: {
  configuredCue: string | null | undefined
  presencePosture: StageEmbodimentPresencePostureState | null | undefined
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined
}) {
  const configuredCue = typeof input.configuredCue === 'string'
    ? input.configuredCue.trim()
    : ''
  if (!configuredCue)
    return null

  const lowerPressureTiming = hasLowerPressureTiming(input.visualPresenceState)
  const audibleSameHerResident = hasAudibleSameHerResidentSignature(input.visualPresenceState)
  const softenedSameHerResident = hasSoftenedSameHerResidentSignature(input.visualPresenceState)
  const quietLowerPressureAttentive = (
    lowerPressureTiming
    || hasQuietAccompanimentResidentSignature(input.visualPresenceState)
    || softenedSameHerResident
  )
  && isQuietLowerPressureAttentivePosture(input.presencePosture)

  if (!quietLowerPressureAttentive)
    return configuredCue

  if (audibleSameHerResident && (configuredCue === 'focus' || configuredCue === 'focused'))
    return 'relaxed'
  if (configuredCue === 'focus' || configuredCue === 'focused')
    return 'soft-gaze'

  return configuredCue
}
