import { expect, it, vi } from 'vitest'

import { createLive2DPoseRecovery } from './pose-recovery'

it('restores virtual pose selectors without jumping visible part opacities or appearance parameters', () => {
  const opacities = [0, 1, 0.35]
  const selectors = { rest: 0, raised: 1 }
  const model = {
    getModel: () => ({ parts: { opacities } }),
    setPartOpacityByIndex: (index: number, value: number) => {
      opacities[index] = value
    },
  }
  const reset = vi.fn(() => {
    selectors.rest = 1
    selectors.raised = 0
    opacities[0] = 1
    opacities[1] = 0
  })
  const recovery = createLive2DPoseRecovery()
  expect(recovery.update(model, reset, { quiet: true, currentPriority: 0, reservePriority: 0 })).toBe(true)
  expect(selectors).toEqual({ rest: 1, raised: 0 })
  expect(opacities).toEqual([0, 1, 0.35])
  expect(recovery.update(model, reset, { quiet: true, currentPriority: 0, reservePriority: 0 })).toBe(false)
  expect(reset).toHaveBeenCalledOnce()
})

it('waits for native actions and reservations, and resumes recovery when opt-in looping is disabled', () => {
  const model = { getModel: () => ({ parts: { opacities: [1, 0] } }), setPartOpacityByIndex: vi.fn() }
  const reset = vi.fn()
  const recovery = createLive2DPoseRecovery()
  for (const options of [
    { quiet: true, currentPriority: 3, reservePriority: 0 },
    { quiet: true, currentPriority: 0, reservePriority: 3 },
    { quiet: false, currentPriority: 1, reservePriority: 0 },
  ]) expect(recovery.update(model, reset, options)).toBe(false)
  expect(reset).not.toHaveBeenCalled()
  expect(recovery.update(model, undefined, { quiet: true, currentPriority: 0, reservePriority: 0 })).toBe(false)
  expect(recovery.update(model, reset, { quiet: true, currentPriority: 0, reservePriority: 0 })).toBe(true)
  recovery.markMotion()
  expect(recovery.update(model, reset, { quiet: true, currentPriority: 0, reservePriority: 0 })).toBe(true)
  expect(reset).toHaveBeenCalledTimes(2)
})
