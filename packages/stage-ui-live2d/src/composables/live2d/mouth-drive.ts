import type { StageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'

import type { MotionManagerPlugin } from './motion-manager'

import { supportsLive2DParameter } from './parameter-support'

/** Audio energy owns aperture; text may still select the vowel shape. */
export function resolveLive2DSpeechMouthDrive(speech: StageEmbodimentSpeechRenderState | null | undefined) {
  if (!speech?.active || speech.playbackPhase !== 'playing')
    return 0

  // The existing text-only fallback has no audio envelope to consult.
  if (!speech.audioBound)
    return 1

  const energy = speech.dynamics.speechEnergy
  if (!Number.isFinite(energy))
    return 0

  // Suppress the analyser's noise floor, while preserving quiet consonants.
  // The render layer already smooths attack/release, so gaps do not snap shut.
  return Math.sqrt(Math.min(1, Math.max(0, (energy - 0.005) / 0.075)))
}

/** Remove speech-like idle curves before Cubism applies named expressions. */
export function useMotionUpdatePluginIdleMouth(): MotionManagerPlugin {
  return (ctx) => {
    if (!ctx.isIdleMotion)
      return

    for (const id of ['ParamMouthOpenY', 'ParamMouthOpen']) {
      if (supportsLive2DParameter(ctx.model, id))
        ctx.model.setParameterValueById(id, 0)
    }
  }
}
