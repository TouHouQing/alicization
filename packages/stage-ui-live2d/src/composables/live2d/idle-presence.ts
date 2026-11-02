import type { InternalModel } from 'pixi-live2d-display/cubism4'

import { supportsLive2DParameter } from './parameter-support'

export type Live2DIdleMotionMode = 'presence' | 'animation'

type IdleMotionManager = Pick<InternalModel['motionManager'], 'definitions' | 'startRandomMotion' | 'startMotion'>

export function releaseLive2DIdleMotion(manager: Pick<InternalModel['motionManager'], 'state' | 'stopAllMotions'>, onReleased: () => void) {
  // stopAllMotions also resets reservations. An asynchronously loading foreground
  // action must keep its reservation when the user changes a background setting.
  if (manager.state.currentPriority !== 1 || manager.state.reservePriority > 1)
    return false
  manager.stopAllMotions()
  onReleased()
  return true
}

/** SDK idle requests are background requests; foreground actions retain their own priority. */
export function installLive2DIdleMotionPolicy(manager: IdleMotionManager, options: {
  canLoop: () => boolean
  preferred: () => { group: string, index: number } | null
}) {
  const original = manager.startRandomMotion
  manager.startRandomMotion = function (group, priority) {
    // The pinned SDK uses IDLE=1. Do not let its completion callback reserve
    // this priority when quiet presence owns the resting body.
    if (priority === 1) {
      if (!options.canLoop())
        return Promise.resolve(false)
      const preferred = options.preferred()
      if (preferred && this.definitions[preferred.group]?.[preferred.index])
        return this.startMotion(preferred.group, preferred.index, priority)
    }
    return original.call(this, group, priority)
  }
}

interface PresenceModel {
  getModel: () => { parameters: { ids: readonly string[], defaultValues: ArrayLike<number> } }
  getParameterValueById: (id: string) => number
  setParameterValueById: (id: string, value: number) => void
}

interface PresenceInput {
  enabled: boolean
  occupied: boolean
  stillness?: number
  breathPace?: number
  breathAmplitude?: number
}

function unit(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value!)) : fallback
}

/** Local body timing only: emotion, intent and relationship remain runtime-owned. */
export function createLive2DIdlePresence(random: () => number = Math.random) {
  const sample = () => unit(random(), 0.5)
  let breathPhase = sample() * Math.PI * 2
  let breathPeriod = 5.2 + sample() * 1.6
  let shiftAfter = 18 + sample() * 25
  let recovery = 0
  const target = [0, 0, 0, 0]
  const pose = [0, 0, 0, 0]
  let shifts = 0
  let naturalAnimationWeight = 0
  const naturalChannels = ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamBodyAngleX', 'ParamBreath']

  function settle(model: PresenceModel, deltaSeconds: number) {
    const parameters = model.getModel().parameters
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(deltaSeconds, 0.12)) : 0
    const blend = 1 - Math.exp(-dt * 4)
    // Restore authored motion parameters before Cubism saves its baseline.
    // Named expressions, blink, focus, physics and runtime emotion run later.
    for (let index = 0; index < parameters.ids.length; index++) {
      const id = parameters.ids[index]
      const rest = parameters.defaultValues[index]
      const current = model.getParameterValueById(id)
      if (Number.isFinite(rest) && Number.isFinite(current))
        model.setParameterValueById(id, current + (rest - current) * blend)
    }
  }

  function update(model: PresenceModel, deltaSeconds: number, input: PresenceInput) {
    // A resumed tab does not replay the movements missed while it was paused.
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(deltaSeconds, 0.12)) : 0
    const stillness = unit(input.stillness, 0.58)
    breathPhase += dt * Math.PI * 2 / breathPeriod
    if (breathPhase >= Math.PI * 2) {
      breathPhase %= Math.PI * 2
      breathPeriod = 4.6 + sample() * 1.8 + stillness * 0.8 - unit(input.breathPace, 0.46) * 0.5
    }
    const breath = (0.5 - Math.cos(breathPhase) * 0.5) * (0.16 + unit(input.breathAmplitude, 0.42) * 0.14)
    if (supportsLive2DParameter(model, 'ParamBreath'))
      model.setParameterValueById('ParamBreath', model.getParameterValueById('ParamBreath') + breath)

    if (input.occupied || !input.enabled) {
      recovery = 6
    }
    else if (recovery > 0) {
      recovery = Math.max(0, recovery - dt)
    }
    else {
      shiftAfter -= dt
      if (shiftAfter <= 0) {
        for (let index = 0; index < target.length; index++)
          target[index] = (sample() * 2 - 1) * (1 - stillness * 0.65)
        shiftAfter = 16 + sample() * 28 + stillness * 8
        shifts += 1
      }
    }

    const blend = 1 - Math.exp(-dt / 1.8)
    const available = input.enabled && !input.occupied && recovery <= 0
    const channels = ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamBodyAngleX']
    for (let index = 0; index < channels.length; index++) {
      pose[index] += ((available ? target[index] : 0) - pose[index]) * blend
      const id = channels[index]
      if (supportsLive2DParameter(model, id))
        model.setParameterValueById(id, model.getParameterValueById(id) + pose[index] * (index === 3 ? 0.25 : 0.8))
    }
  }

  function updateNatural(model: PresenceModel, deltaSeconds: number, input: PresenceInput, animationMode: boolean, updateNative: () => void) {
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(deltaSeconds, 0.12)) : 0
    naturalAnimationWeight += ((animationMode ? 1 : 0) - naturalAnimationWeight) * (1 - Math.exp(-dt * 6))
    if (!animationMode && naturalAnimationWeight < 0.0001)
      naturalAnimationWeight = 0
    const channels = naturalChannels.filter(id => supportsLive2DParameter(model, id))
    const baseline = channels.map(id => model.getParameterValueById(id))
    if (animationMode || naturalAnimationWeight > 0)
      updateNative()
    const nativeDelta = channels.map((id, index) => model.getParameterValueById(id) - baseline[index])
    channels.forEach((id, index) => model.setParameterValueById(id, baseline[index]))
    update(model, deltaSeconds, { ...input, occupied: input.occupied || animationMode })
    // Blend only physiological offsets, preserving expressions and foreground
    // motion in the baseline. Switching modes must not instantly remove a large
    // SDK breath-induced head rotation or jump the chest to another phase.
    channels.forEach((id, index) => {
      const quietValue = model.getParameterValueById(id)
      model.setParameterValueById(id, quietValue + (baseline[index] + nativeDelta[index] - quietValue) * naturalAnimationWeight)
    })
  }

  return { settle, update, updateNatural, snapshot: () => ({ shifts, shiftAfter, recovery, pose: [...pose], breathPeriod }) }
}
