import type {
  AlicizationEmbodimentLipSyncVisemeHint,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'

export interface ResolveLive2DLipSyncDriverStateInput {
  playbackPhase: 'idle' | 'playing'
  script: AlicizationEmbodimentScriptV1 | null | undefined
  segmentId?: string | null
}

export interface Live2DLipSyncDriverState {
  mode: AlicizationEmbodimentScriptV1['lipsyncPlan']['mode']
  playbackPhase: 'idle' | 'playing'
  segmentId: string | null
  visemeHints: AlicizationEmbodimentLipSyncVisemeHint[]
}

function resolveVisemeHints(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
) {
  const visemeHints = script.lipsyncPlan.visemeHints ?? []
  if (!segmentId)
    return [...visemeHints]

  return visemeHints.filter(hint => hint.segmentId === segmentId)
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
    visemeHints: resolveVisemeHints(script, input.segmentId),
  }
}
