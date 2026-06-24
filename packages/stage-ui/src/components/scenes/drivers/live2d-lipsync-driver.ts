import type {
  AlicizationEmbodimentLipSyncVisemeHint,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'

import {
  hasAlicizationSoftenedSameHerCarry,
} from '@proj-alicization/stage-shared'

import {
  resolveLive2DDriverRendererHints,
  resolveLive2DDriverResidentMode,
} from './live2d-companionship-resident-mode'

export interface ResolveLive2DLipSyncDriverStateInput {
  playbackPhase: 'idle' | 'playing'
  script: AlicizationEmbodimentScriptV1 | null | undefined
  segmentId?: string | null
  continuityHoldMs?: number | null
}

export interface Live2DLipSyncDriverState {
  mode: AlicizationEmbodimentScriptV1['lipsyncPlan']['mode']
  playbackPhase: 'idle' | 'playing'
  segmentId: string | null
  continuityHoldMs: number
  visemeHints: AlicizationEmbodimentLipSyncVisemeHint[]
}

function resolveActiveVisemeSegmentId(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
) {
  const normalizedSegmentId = segmentId?.trim()
  if (normalizedSegmentId)
    return normalizedSegmentId

  return script.speechPlan.segments[0]?.id?.trim() || null
}

function resolveVisemeHints(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
) {
  const visemeHints = script.lipsyncPlan.visemeHints ?? []
  const activeSegmentId = resolveActiveVisemeSegmentId(script, segmentId)
  if (!activeSegmentId)
    return [...visemeHints]

  return visemeHints.filter(hint => hint.segmentId === activeSegmentId)
}

function clampRestrainedCallbackVisemeHints(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
  visemeHints: AlicizationEmbodimentLipSyncVisemeHint[],
) {
  const residentMode = resolveLive2DDriverResidentMode(script, segmentId)
  const rendererHints = resolveLive2DDriverRendererHints(script, segmentId)
  const sameHerSoftenedReturn = (
    rendererHints?.preferredBlinkCadence === 'linger'
    || rendererHints?.preferredBlinkCadence === 'quiet'
    || rendererHints?.preferredGazeMode === 'soften'
    || rendererHints?.preferredGazeMode === 'steady'
  ) && hasAlicizationSoftenedSameHerCarry(rendererHints)
  if (residentMode !== 'measured-return' && residentMode !== 'repair-before-closeness') {
    return sameHerSoftenedReturn
      ? visemeHints.map(hint => ({
          ...hint,
          weight: Math.max(0, Math.min(1, Number((hint.weight * 0.76).toFixed(3)))),
        }))
      : visemeHints
  }
  const clampFactor = residentMode === 'repair-before-closeness'
    ? sameHerSoftenedReturn ? 0.62 : 0.68
    : sameHerSoftenedReturn ? 0.76 : 0.82
  return visemeHints.map(hint => ({
    ...hint,
    weight: Math.max(0, Math.min(1, Number((hint.weight * clampFactor).toFixed(3)))),
  }))
}

export function resolveLive2DLipSyncDriverState(
  input: ResolveLive2DLipSyncDriverStateInput,
): Live2DLipSyncDriverState | null {
  const script = input.script
  if (!script)
    return null

  return {
    mode: script.lipsyncPlan.mode,
    playbackPhase: input.playbackPhase,
    segmentId: input.segmentId?.trim() ?? null,
    continuityHoldMs: Math.max(
      0,
      Math.round(
        input.continuityHoldMs
        ?? 0,
      ),
    ),
    visemeHints: clampRestrainedCallbackVisemeHints(
      script,
      input.segmentId,
      resolveVisemeHints(script, input.segmentId),
    ),
  }
}
