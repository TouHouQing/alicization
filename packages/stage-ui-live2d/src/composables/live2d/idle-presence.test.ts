import type { InternalModel } from 'pixi-live2d-display/cubism4'

import { describe, expect, it, vi } from 'vitest'

import { createLive2DIdlePresence, installLive2DIdleMotionPolicy, releaseLive2DIdleMotion } from './idle-presence'

function createModel() {
  const defaults = { ParamAngleX: 0, ParamAngleY: 0, ParamAngleZ: 0, ParamBodyAngleX: 0, ParamEyeLOpen: 1, ParamEyeLSmile: 0, ParamMouthForm: 0, ParamBreath: 0, CustomSleeve: 0.7 }
  const values = { ...defaults } as Record<string, number>
  return {
    values,
    beginFrame: () => Object.assign(values, defaults),
    getModel: () => ({ parameters: { ids: Object.keys(defaults), defaultValues: Object.values(defaults) } }),
    getParameterValueById: (id: string) => values[id],
    setParameterValueById: (id: string, value: number) => { values[id] = value },
  }
}

function seededRandom() {
  let seed = 31
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

describe('live2D resting body ownership', () => {
  it('releases the running idle and its execution record together', () => {
    const manager = { state: { currentPriority: 1, reservePriority: 0 }, stopAllMotions: vi.fn() }
    const releaseExecution = vi.fn()
    expect(releaseLive2DIdleMotion(manager as unknown as InternalModel['motionManager'], releaseExecution)).toBe(true)
    expect(manager.stopAllMotions).toHaveBeenCalledOnce()
    expect(releaseExecution).toHaveBeenCalledOnce()
  })

  it('leaves active and asynchronously reserved foreground actions untouched', () => {
    for (const [currentPriority, reservePriority] of [[3, 0], [1, 3], [0, 3], [0, 0]]) {
      const manager = { state: { currentPriority, reservePriority }, stopAllMotions: vi.fn() }
      const releaseExecution = vi.fn()
      expect(releaseLive2DIdleMotion(manager as unknown as InternalModel['motionManager'], releaseExecution)).toBe(false)
      expect(manager.stopAllMotions).not.toHaveBeenCalled()
      expect(releaseExecution).not.toHaveBeenCalled()
    }
  })
  it('rejects automatic idle restarts while preserving foreground actions and explicit looping', async () => {
    let loop = false
    const startRandomMotion = vi.fn(async () => true)
    const startMotion = vi.fn(async () => true)
    const manager = { definitions: { Idle: [{}], Rest: [{}, {}] }, startRandomMotion, startMotion }
    installLive2DIdleMotionPolicy(manager as unknown as InternalModel['motionManager'], {
      canLoop: () => loop,
      preferred: () => ({ group: 'Rest', index: 1 }),
    })
    const wrapped = manager as unknown as InternalModel['motionManager']
    for (let completion = 0; completion < 30; completion++)
      expect(await wrapped.startRandomMotion('Idle', 1)).toBe(false)
    expect(startMotion).not.toHaveBeenCalled()
    expect(startRandomMotion).not.toHaveBeenCalled()
    expect(await wrapped.startRandomMotion('Tap', 3)).toBe(true)
    expect(startRandomMotion).toHaveBeenLastCalledWith('Tap', 3)
    loop = true
    expect(await wrapped.startRandomMotion('Idle', 1)).toBe(true)
    expect(startMotion).toHaveBeenLastCalledWith('Rest', 1, 1)
    loop = false
    expect(await wrapped.startRandomMotion('Idle', 1)).toBe(false)
    expect(startMotion).toHaveBeenCalledTimes(1)
  })

  it('falls back to the SDK only in explicit animation mode when a saved motion is missing', async () => {
    const original = vi.fn(async () => true)
    const manager = { definitions: {}, startRandomMotion: original, startMotion: vi.fn() }
    installLive2DIdleMotionPolicy(manager as unknown as InternalModel['motionManager'], {
      canLoop: () => true,
      preferred: () => ({ group: 'Missing', index: 0 }),
    })
    await (manager as unknown as InternalModel['motionManager']).startRandomMotion('Idle', 1)
    expect(original).toHaveBeenCalledWith('Idle', 1)
  })

  it('releases a completed motion to compiled defaults smoothly, including custom nonzero channels', () => {
    const model = createModel()
    const presence = createLive2DIdlePresence(seededRandom())
    Object.assign(model.values, { ParamAngleX: 25, ParamEyeLSmile: 1, ParamMouthForm: -1, CustomSleeve: 0 })
    presence.settle(model, 1 / 60)
    expect(model.values.ParamAngleX).toBeGreaterThan(20)
    expect(model.values.ParamAngleX).toBeLessThan(25)
    for (let frame = 0; frame < 180; frame++)
      presence.settle(model, 1 / 60)
    expect(model.values.ParamAngleX).toBeCloseTo(0, 3)
    expect(model.values.ParamEyeLSmile).toBeCloseTo(0, 3)
    expect(model.values.ParamMouthForm).toBeCloseTo(0, 3)
    expect(model.values.CustomSleeve).toBeCloseTo(0.7, 3)
    expect(Object.keys(model.values)).toEqual(model.getModel().parameters.ids)
  })

  it('keeps five minutes of presence sparse and small without cycling the face', () => {
    const model = createModel()
    const presence = createLive2DIdlePresence(seededRandom())
    const shifts: number[] = []
    const breaths: number[] = []
    const poses: number[] = []
    let previousShift = 0
    for (let frame = 0; frame < 9000; frame++) {
      model.beginFrame()
      presence.update(model, 1 / 30, { enabled: true, occupied: false, stillness: 0.7 })
      breaths.push(model.values.ParamBreath)
      poses.push(model.values.ParamAngleX)
      const state = presence.snapshot()
      if (state.shifts > previousShift)
        shifts.push(frame / 30)
      previousShift = state.shifts
      expect(Math.abs(model.values.ParamAngleX)).toBeLessThan(0.8)
      expect(model.values.ParamEyeLSmile).toBe(0)
      expect(model.values.ParamMouthForm).toBe(0)
      expect(model.values.CustomSleeve).toBe(0.7)
    }
    expect(shifts[0]).toBeGreaterThan(15)
    expect(shifts.length).toBeGreaterThanOrEqual(4)
    expect(shifts.length).toBeLessThan(15)
    expect(shifts.slice(1).every((time, index) => time - shifts[index] > 20)).toBe(true)
    expect(new Set(shifts.slice(1).map((time, index) => Math.round(time - shifts[index]))).size).toBeGreaterThan(2)
    expect(Math.max(...breaths) - Math.min(...breaths)).toBeGreaterThan(0.1)
    expect(Math.max(...poses) - Math.min(...poses)).toBeGreaterThan(0.05)
  })

  it('yields posture shifts during dialogue and leaves a recovery pause afterward', () => {
    const model = createModel()
    const presence = createLive2DIdlePresence(seededRandom())
    for (let frame = 0; frame < 18000; frame++) {
      model.beginFrame()
      presence.update(model, 1 / 30, { enabled: true, occupied: true })
    }
    expect(presence.snapshot().shifts).toBe(0)
    for (let frame = 0; frame < 150; frame++)
      presence.update(model, 1 / 30, { enabled: true, occupied: false })
    expect(presence.snapshot().recovery).toBeGreaterThan(0)
    expect(presence.snapshot().shifts).toBe(0)
  })

  it('does not catch up missed movement or invent unsupported parameters after pause', () => {
    const model = createModel()
    const presence = createLive2DIdlePresence(seededRandom())
    const initial = presence.snapshot()
    presence.update(model, 600, { enabled: true, occupied: false })
    expect(initial.shiftAfter - presence.snapshot().shiftAfter).toBeLessThanOrEqual(0.121)
    expect(presence.snapshot().shifts).toBe(0)
    expect(Object.keys(model.values)).toEqual(model.getModel().parameters.ids)
    presence.update(model, Number.NaN, { enabled: false, occupied: false })
    presence.settle(model, Number.NaN)
    expect(Object.values(model.values).every(Number.isFinite)).toBe(true)
  })

  it('fades native breathing offsets across mode changes without touching a foreground baseline', () => {
    const model = createModel()
    const presence = createLive2DIdlePresence(seededRandom())
    const native = vi.fn(() => {
      model.values.ParamAngleX += 7
      model.values.ParamBreath += 0.4
    })
    const input = { enabled: true, occupied: true }
    model.beginFrame()
    presence.updateNatural(model, 1 / 60, input, false, native)
    expect(native).not.toHaveBeenCalled()
    for (let frame = 0; frame < 150; frame++) {
      model.beginFrame()
      model.values.ParamAngleX = 12
      presence.updateNatural(model, 1 / 60, input, true, native)
    }
    expect(model.values.ParamAngleX).toBeCloseTo(19, 3)
    model.beginFrame()
    model.values.ParamAngleX = 12
    presence.updateNatural(model, 1 / 60, input, false, native)
    expect(model.values.ParamAngleX).toBeGreaterThan(18)
    for (let frame = 0; frame < 150; frame++) {
      model.beginFrame()
      model.values.ParamAngleX = 12
      presence.updateNatural(model, 1 / 60, input, false, native)
    }
    expect(model.values.ParamAngleX).toBeCloseTo(12, 3)
    expect(model.values.CustomSleeve).toBe(0.7)
    expect(model.values.ParamEyeLSmile).toBe(0)
  })
})
