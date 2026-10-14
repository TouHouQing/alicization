import type { StageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'

import type { VrmMotionExecutionState } from './action-playback'

export function activeVrmSpeechOwner(speech?: StageEmbodimentSpeechRenderState | null) {
  return speech?.active && speech.audioBound ? speech.item?.segmentId?.trim() || null : null
}

export function allowsVrmMotionOwner(speech: StageEmbodimentSpeechRenderState | null | undefined, motionOwner: string | null) {
  const owner = activeVrmSpeechOwner(speech)
  return !owner || !motionOwner || owner === motionOwner
}

/** Reconcile actual mixer ownership before its next render update, never relabel a stale action. */
export function reconcileVrmSpeechMotionOwnership(input: {
  speech: StageEmbodimentSpeechRenderState | null | undefined
  motion: VrmMotionExecutionState
  interrupt: () => void
  cancelRetiringOthers: (owner: string) => void
}) {
  const owner = activeVrmSpeechOwner(input.speech)
  if (!owner)
    return false
  input.cancelRetiringOthers(owner)
  if (!input.motion.segmentId || input.motion.segmentId === owner)
    return false
  input.interrupt()
  return true
}
