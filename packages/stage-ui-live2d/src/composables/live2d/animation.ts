import type { InternalModel } from 'pixi-live2d-display/cubism4'

import { MathUtils } from 'three'

import { randomSaccadeInterval } from '../../utils'

export interface Live2DIdleEyeFocusBias {
  azimuthScale?: number | null | undefined
  elevationScale?: number | null | undefined
  stabilityBias?: number | null | undefined
  eyeOpenScale?: number | null | undefined
}

function clamp01(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

/**
 * Choose quiet fixation targets in SDK motion time (seconds).
 * The SDK advances its focus controller once per frame using milliseconds.
 */
export function useLive2DIdleEyeFocus() {
  let nextSaccadeAfter = -1
  let focusTarget: [number, number] | undefined
  let lastSaccadeAt = -1

  // Function to handle idle eye saccades and focus (head) movements
  function update(model: InternalModel, now: number, bias?: Live2DIdleEyeFocusBias) {
    if (now >= nextSaccadeAfter || now < lastSaccadeAt) {
      const previousFocusTarget = focusTarget
      const azimuthScale = Number.isFinite(bias?.azimuthScale) ? Number(bias?.azimuthScale) : 1
      const elevationScale = Number.isFinite(bias?.elevationScale) ? Number(bias?.elevationScale) : 1
      const stabilityCarry = clamp01(0.18 + Number(bias?.stabilityBias ?? 0) * 0.75, 0.18)
      const nextFocusTarget: [number, number] = [
        MathUtils.randFloat(-1, 1) * azimuthScale,
        MathUtils.randFloat(-1, 0.7) * elevationScale,
      ]

      focusTarget = previousFocusTarget == null
        ? nextFocusTarget
        : [
            MathUtils.lerp(nextFocusTarget[0], previousFocusTarget[0], stabilityCarry),
            MathUtils.lerp(nextFocusTarget[1], previousFocusTarget[1], stabilityCarry),
          ]
      lastSaccadeAt = now
      // Keep a fixation for several seconds. Frequent large random targets also
      // turn the head through Cubism's focus controller, even without a motion.
      nextSaccadeAfter = now + 3.5 + (randomSaccadeInterval() / 1000) * 1.5 + stabilityCarry * 2
      model.focusController.focus(focusTarget![0] * 0.12, focusTarget![1] * 0.12, false)
    }

    // SDK updateFocus applies the same controller to eyes and head after motions.
    // Writing eyeballs here would be added a second time and saturate the rig.
  }

  // Pointer attention has its own owner and expiry. Releasing it must not wait
  // for the previous autonomous fixation's longer dwell deadline.
  function interrupt() {
    nextSaccadeAfter = -1
  }

  return { update, interrupt }
}
