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
 * This is to simulate idle eye saccades and focus (head) movements in a *pretty* naive way.
 * Not using any reactivity here as it's not yet needed.
 * Keeping it here as a composable for future extension.
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
      nextSaccadeAfter = now + (randomSaccadeInterval() / 1000)
      model.focusController.focus(focusTarget![0] * 0.5, focusTarget![1] * 0.5, false)
    }

    model.focusController.update(now - lastSaccadeAt)
    const coreModel = model.coreModel as any
    // TODO: After emotion mapper, stage editor, eye related parameters should be take cared to be dynamical instead of hardcoding
    coreModel.setParameterValueById('ParamEyeBallX', MathUtils.lerp(coreModel.getParameterValueById('ParamEyeBallX'), focusTarget![0], 0.3))
    coreModel.setParameterValueById('ParamEyeBallY', MathUtils.lerp(coreModel.getParameterValueById('ParamEyeBallY'), focusTarget![1], 0.3))
  }

  return { update }
}
