import type {
  AlicizationDialogueEmbodimentRendererHints,
  AlicizationDialogueSpeechRendererSettleHints,
  StageEmbodimentPerformanceCueSource,
  StageEmbodimentPerformanceState,
} from '@proj-alicization/stage-shared'

import type { VrmActionBinding } from '../../types/performance'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationBodyVoiceOnlySameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
} from '@proj-alicization/stage-shared'

export interface VrmMotionExecutionState {
  cue: string | null
  segmentId: string | null
  cueSnapshot: VrmMotionExecutionCueSnapshot | null
}

export interface VrmMotionExecutionCueSnapshot {
  id?: string | null
  emotion?: string | null
  facialCue?: string | null
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  rendererSettle?: AlicizationDialogueSpeechRendererSettleHints | null
}

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

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function roundKeyNumber(value: number | null | undefined, scale: number) {
  return Number.isFinite(value as number) ? Math.round(Number(value) * scale) : null
}

export function createIdleVrmMotionExecutionState(): VrmMotionExecutionState {
  return {
    cue: null,
    segmentId: null,
    cueSnapshot: null,
  }
}

export function createSettledVrmMotionExecutionState(): VrmMotionExecutionState {
  return {
    cue: 'settle_idle',
    segmentId: null,
    cueSnapshot: null,
  }
}

function cloneVrmMotionExecutionCueSnapshot(
  cueSnapshot: VrmMotionExecutionCueSnapshot | null | undefined,
): VrmMotionExecutionCueSnapshot | null {
  if (!cueSnapshot)
    return null

  return {
    id: normalizeText(cueSnapshot.id) || null,
    emotion: normalizeText(cueSnapshot.emotion) || null,
    facialCue: normalizeText(cueSnapshot.facialCue) || null,
    rendererHints: cueSnapshot.rendererHints
      ? {
          ...cueSnapshot.rendererHints,
          preferredExpressionAliases: cueSnapshot.rendererHints.preferredExpressionAliases
            ? [...cueSnapshot.rendererHints.preferredExpressionAliases]
            : undefined,
          preferredMotionAliases: cueSnapshot.rendererHints.preferredMotionAliases
            ? [...cueSnapshot.rendererHints.preferredMotionAliases]
            : undefined,
          reasonTags: cueSnapshot.rendererHints.reasonTags
            ? [...cueSnapshot.rendererHints.reasonTags]
            : undefined,
        }
      : null,
    rendererSettle: cueSnapshot.rendererSettle
      ? { ...cueSnapshot.rendererSettle }
      : null,
  }
}

export function resolveVrmMotionExecutionStateFromBinding(
  binding: VrmActionBinding,
  segmentId?: string | null,
  cueSnapshot?: VrmMotionExecutionCueSnapshot | null,
): VrmMotionExecutionState {
  const cue = normalizeText(binding.actionKey)
  return {
    cue: cue || null,
    segmentId: normalizeText(segmentId) || null,
    cueSnapshot: cloneVrmMotionExecutionCueSnapshot(cueSnapshot),
  }
}

export function resolveCurrentVrmMotionAuthorityCueSnapshot(
  state: StageEmbodimentPerformanceState | null | undefined,
): VrmMotionExecutionCueSnapshot | null {
  return cloneVrmMotionExecutionCueSnapshot(
    state?.activeSegment?.cue ?? state?.activeCue ?? null,
  )
}

export interface VrmActionFadeInput {
  actionCueSource: StageEmbodimentPerformanceCueSource | null | undefined
  actionIntensity: number | null | undefined
  bodySegmentMatched?: boolean | null | undefined
  fadeDurationSeconds: number
  preferredBlinkCadence?: string | null | undefined
  preferredGazeMode?: string | null | undefined
  reasonTags?: readonly string[] | null | undefined
  residentMode?: string | null | undefined
  signature?: string | null | undefined
}

export function resolveVrmActionFadeInputFromPerformanceState(input: {
  fadeDurationSeconds: number
  state: StageEmbodimentPerformanceState | null | undefined
}): VrmActionFadeInput {
  const rendererHints = input.state?.activeCue?.rendererHints
  return {
    actionCueSource: input.state?.activeActionCueSource ?? 'none',
    actionIntensity: input.state?.actionIntensity ?? null,
    bodySegmentMatched: input.state?.driverAuthority?.bodySegmentMatched,
    fadeDurationSeconds: input.fadeDurationSeconds,
    preferredBlinkCadence: rendererHints?.preferredBlinkCadence ?? null,
    preferredGazeMode: rendererHints?.preferredGazeMode ?? null,
    reasonTags: rendererHints?.reasonTags ?? null,
    residentMode: rendererHints?.residentMode ?? null,
    signature: rendererHints?.signature ?? null,
  }
}

export function buildVrmTransientActionReplayKey(input: {
  binding: VrmActionBinding
  fadeInput?: VrmActionFadeInput | null | undefined
}) {
  const source = input.binding.source || 'unknown'
  const identity = input.binding.id || input.binding.actionKey || input.binding.fileName || 'anonymous-action'
  if (!input.fadeInput)
    return `${source}:${identity}`.trim()

  return JSON.stringify([
    `${source}:${identity}`.trim(),
    input.fadeInput.actionCueSource ?? 'none',
    roundKeyNumber(input.fadeInput.actionIntensity, 100),
    roundKeyNumber(input.fadeInput.fadeDurationSeconds, 1000),
    normalizeText(input.fadeInput.residentMode).toLowerCase(),
    normalizeText(input.fadeInput.preferredGazeMode).toLowerCase(),
    normalizeText(input.fadeInput.preferredBlinkCadence).toLowerCase(),
    input.fadeInput.bodySegmentMatched == null ? 'unknown' : input.fadeInput.bodySegmentMatched ? 'matched' : 'renderer-only',
  ])
}

export function resolveVrmActionFadeDurationSeconds(input: VrmActionFadeInput) {
  const baseFade = clampRange(input.fadeDurationSeconds, 0.08, 1.2, 0.18)
  const actionIntensity = clampUnit(input.actionIntensity)
  const residentMode = normalizeText(input.residentMode)
  const preferredGazeMode = normalizeText(input.preferredGazeMode)
  const preferredBlinkCadence = normalizeText(input.preferredBlinkCadence)
  const hasAudibleSameHerCarry = hasAlicizationAudibleSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const hasBodyVoiceOnlySameHerCarry = hasAlicizationBodyVoiceOnlySameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerAudibleReturn = (
    preferredGazeMode === 'steady'
    || preferredGazeMode === 'soften'
    || preferredBlinkCadence === 'quiet'
    || preferredBlinkCadence === 'linger'
  ) && hasAudibleSameHerCarry
  const sameHerBodyVoiceOnlyReturn = (
    preferredGazeMode === 'steady'
    || preferredGazeMode === 'soften'
    || preferredBlinkCadence === 'quiet'
    || preferredBlinkCadence === 'linger'
  ) && hasBodyVoiceOnlySameHerCarry
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
  const sameHerSoftenedReturn = sameHerAudibleReturn || sameHerBodyVoiceOnlyReturn || sameHerQuieterReturn || sameHerStillVoicedReturn
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
