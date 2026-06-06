import type { StageEmbodimentPerformanceCueSource } from '@proj-alicization/stage-shared'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
} from '@proj-alicization/stage-shared'

function clampRange(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(max, Math.max(min, value))
}

function clampUnit(value: number | null | undefined, fallback: number | null = null) {
  if (!Number.isFinite(value as number))
    return fallback

  return Math.min(1, Math.max(0, Number(value)))
}

export function resolveVrmActionFadeDurationSeconds(input: {
  actionCueSource: StageEmbodimentPerformanceCueSource | null | undefined
  actionIntensity: number | null | undefined
  bodySegmentMatched?: boolean | null | undefined
  fadeDurationSeconds: number
  preferredBlinkCadence?: string | null | undefined
  preferredGazeMode?: string | null | undefined
  reasonTags?: readonly string[] | null | undefined
  residentMode?: string | null | undefined
  signature?: string | null | undefined
}) {
  const baseFade = clampRange(input.fadeDurationSeconds, 0.08, 1.2, 0.18)
  const actionIntensity = clampUnit(input.actionIntensity)
  const residentMode = typeof input.residentMode === 'string' ? input.residentMode.trim() : ''
  const preferredGazeMode = typeof input.preferredGazeMode === 'string' ? input.preferredGazeMode.trim() : ''
  const preferredBlinkCadence = typeof input.preferredBlinkCadence === 'string' ? input.preferredBlinkCadence.trim() : ''
  const hasAudibleSameHerCarry = hasAlicizationAudibleSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerAudibleReturn = (
    preferredGazeMode === 'steady'
    || preferredGazeMode === 'soften'
    || preferredBlinkCadence === 'quiet'
    || preferredBlinkCadence === 'linger'
  ) && hasAudibleSameHerCarry
  const sameHerQuieterReturn = (
    preferredGazeMode === 'steady'
    || preferredGazeMode === 'soften'
    || preferredBlinkCadence === 'quiet'
    || preferredBlinkCadence === 'linger'
  ) && hasAlicizationQuieterSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerStillVoicedReturn = (
    preferredGazeMode === 'steady'
    || preferredGazeMode === 'soften'
    || preferredBlinkCadence === 'quiet'
    || preferredBlinkCadence === 'linger'
  ) && hasAlicizationStillVoicedSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerSoftenedReturn = sameHerAudibleReturn || sameHerQuieterReturn || sameHerStillVoicedReturn
  const restrainedSameHerCarry = residentMode === 'repair-before-closeness'
    || residentMode === 'measured-return'
    || sameHerSoftenedReturn
  const rendererOnlyRejoinScale = residentMode === 'repair-before-closeness' && input.bodySegmentMatched === false
    ? sameHerSoftenedReturn ? 1.14 : 1.08
    : residentMode === 'measured-return' && input.bodySegmentMatched === false
      ? sameHerSoftenedReturn ? 1.08 : 1.04
      : sameHerSoftenedReturn && input.bodySegmentMatched === false
        ? 1.06
        : 1
  const durableMeasuredReturnScale = restrainedSameHerCarry
    && (preferredGazeMode === 'steady' || preferredGazeMode === 'soften')
    && (preferredBlinkCadence === 'quiet' || preferredBlinkCadence === 'linger')
    ? sameHerSoftenedReturn ? 1.1 : 1.06
    : 1
  if (actionIntensity == null) {
    return clampRange(
      baseFade
      * (residentMode === 'repair-before-closeness'
        ? sameHerSoftenedReturn ? 1.24 : 1.18
        : residentMode === 'measured-return'
          ? sameHerSoftenedReturn ? 1.14 : 1.1
          : sameHerSoftenedReturn
            ? 1.08
            : residentMode === 'quiet-companionship'
              ? 1.06
              : 1)
            * rendererOnlyRejoinScale
            * durableMeasuredReturnScale,
      0.08,
      1.2,
      baseFade,
    )
  }

  const sourceFloor = input.actionCueSource === 'resident'
    ? 0.92
    : input.actionCueSource === 'preview'
      ? 0.82
      : input.actionCueSource === 'segment'
        ? 0.7
        : 1
  const intensityScale = 1 - actionIntensity * 0.38
  const residentModeScale = residentMode === 'repair-before-closeness'
    ? sameHerSoftenedReturn ? 1.24 : 1.18
    : residentMode === 'measured-return'
      ? sameHerSoftenedReturn ? 1.14 : 1.1
      : sameHerSoftenedReturn
        ? 1.08
        : residentMode === 'quiet-companionship'
          ? 1.06
          : 1
  return clampRange(
    baseFade * sourceFloor * intensityScale * residentModeScale * rendererOnlyRejoinScale * durableMeasuredReturnScale,
    0.08,
    1.2,
    baseFade,
  )
}
