import type { StageTextArticulationFrame, StageTextMouthShape } from '@proj-alicization/stage-shared'

import type { MotionManagerPlugin } from './motion-manager'

import { resolveStageTextMouthShape } from '@proj-alicization/stage-shared'

import { supportsLive2DParameter } from './parameter-support'

export function useMotionUpdatePluginTextMouth(frame: () => StageTextArticulationFrame | null | undefined): MotionManagerPlugin {
  let previous: { frame: StageTextArticulationFrame, shape: StageTextMouthShape } | null = null
  let transitionFrom: StageTextMouthShape | null = null
  return (ctx) => {
    const current = frame()
    const now = Date.now()
    // Actual playback keeps acoustic authority; text never invents speech energy
    // or feeds the action/performance state machine.
    if (!current || ctx.speechRenderState.value?.active || now > current.startedAt + current.durationMs + 150) {
      previous = null
      transitionFrom = null
      return
    }
    const shape = resolveStageTextMouthShape(current, now)
    if (previous?.frame !== current) {
      transitionFrom = previous && previous.frame.turnId === current.turnId && current.offset > previous.frame.offset
        && current.startedAt <= previous.frame.startedAt + previous.frame.durationMs + 100
        ? previous.shape
        : null
    }
    // Carry the previous vowel into the next over 70 ms. Closed consonants,
    // punctuation and expired input keep immediate authority over the mouth.
    if (transitionFrom && shape.vowel !== 'closed' && shape.vowel !== 'F') {
      const progress = Math.min(1, Math.max(0, (now - current.startedAt) / 70))
      const weight = progress * progress * (3 - 2 * progress)
      for (const key of ['open', 'form', 'round', 'spread', 'closed'] as const)
        shape[key] = transitionFrom[key] + (shape[key] - transitionFrom[key]) * weight
    }
    previous = { frame: current, shape: { ...shape } }
    const parameters: Record<string, number> = {
      ParamMouthOpenY: shape.open,
      ParamMouthOpen: shape.open,
      ParamJawOpen: shape.open,
      ParamMouthForm: shape.form,
      ParamMouthRound: shape.round,
      ParamMouthSpread: shape.spread,
      ParamMouthPucker: shape.round,
      ParamMouthClose: shape.closed,
      ParamMouthA: shape.vowel === 'A' ? shape.open : 0,
      ParamMouthI: shape.vowel === 'I' ? shape.spread : 0,
      ParamMouthU: shape.vowel === 'U' ? shape.round : 0,
      ParamMouthE: shape.vowel === 'E' ? shape.spread : 0,
      ParamMouthO: shape.vowel === 'O' ? shape.round : 0,
      // These are the existing project's compiled vowel bindings. Some rigs
      // use the Mouth-prefixed aliases instead; never write virtual SDK IDs.
      ParamA: shape.vowel === 'A' ? shape.open : 0,
      ParamI: shape.vowel === 'I' ? Math.max(shape.open, shape.spread * 0.65) : 0,
      ParamU: shape.vowel === 'U' ? Math.max(shape.open, shape.round * 0.65) : 0,
      ParamE: shape.vowel === 'E' ? Math.max(shape.open, shape.spread * 0.65) : 0,
      ParamO: shape.vowel === 'O' ? Math.max(shape.open, shape.round * 0.65) : 0,
    }
    for (const [id, value] of Object.entries(parameters)) {
      if (supportsLive2DParameter(ctx.model, id))
        ctx.model.setParameterValueById(id, value)
    }
  }
}
