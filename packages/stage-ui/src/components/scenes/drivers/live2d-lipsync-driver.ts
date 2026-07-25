import type {
  AlicizationEmbodimentLipSyncVisemeHint,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'

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
    visemeHints: resolveVisemeHints(script, input.segmentId),
  }
}
