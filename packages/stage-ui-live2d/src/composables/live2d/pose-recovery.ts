interface PoseModel {
  getModel: () => { parts: { opacities: ArrayLike<number> } }
  setPartOpacityByIndex: (index: number, value: number) => void
}

// Cubism pose selectors can be virtual parameters, outside the compiled
// parameter array. Restoring only compiled defaults leaves a raised-arm part
// selected forever. Reset selectors, preserve the visible opacities, and let
// the existing Cubism pose fade interpolate the handover on subsequent frames.
export function createLive2DPoseRecovery() {
  let pending = true
  return {
    markMotion() { pending = true },
    update(model: PoseModel, reset: (() => void) | undefined, options: { quiet: boolean, currentPriority: number, reservePriority: number }) {
      if (!pending || !reset || !options.quiet || options.currentPriority > 1 || options.reservePriority > 1)
        return false
      const opacities = Array.from(model.getModel().parts.opacities)
      reset()
      opacities.forEach((opacity, index) => model.setPartOpacityByIndex(index, opacity))
      pending = false
      return true
    },
  }
}
