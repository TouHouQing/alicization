import type { InternalModel } from 'pixi-live2d-display/cubism4'

import { describe, expect, it, vi } from 'vitest'

import { startLive2DProceduralAction } from './procedural-action'
import { createLive2DProceduralGesture } from './procedural-gesture'

function setup(currentPriority = 3, reservePriority = 0) {
  const state = { currentPriority, reservePriority, reservedGroup: 'old-asset' }
  const manager = {
    state: state as InternalModel['motionManager']['state'],
    stopAllMotions: vi.fn(() => { Object.assign(state, { currentPriority: 0, reservePriority: 0, reservedGroup: undefined }) }),
  }
  return {
    gesture: createLive2DProceduralGesture(),
    manager,
    request: { cue: 'nod_soft', revision: 2, now: 10, intensity: 0.8 },
    supports: () => true,
    background: false,
    onHandoff: vi.fn(),
  }
}

describe('live2D native and procedural motion ownership', () => {
  it('hands an active asset to one finite foreground nod and releases it', () => {
    const input = setup()
    expect(startLive2DProceduralAction(input)).toBe(true)
    expect(input.manager.state.currentPriority).toBe(0)
    expect(input.onHandoff).toHaveBeenCalledOnce()
    expect(input.gesture.sample(10.45)?.offset).toBeCloseTo(-4)
    expect(input.gesture.sample(11)).toBeNull()
    expect(input.gesture.active).toBe(false)
  })

  it('revokes a loading asset reservation so it cannot resume over the nod', async () => {
    const input = setup(0, 3)
    let finishLoad!: () => void
    const loading = new Promise<void>((resolve) => {
      finishLoad = resolve
    })
      .then(() => input.manager.state.reservedGroup === 'old-asset')
    expect(startLive2DProceduralAction(input)).toBe(true)
    finishLoad()
    expect(await loading).toBe(false)
    expect(input.gesture.sample(10.45)?.revision).toBe(2)
  })

  it.each([[3, 0], [0, 3]])('keeps foreground work when a background pulse arrives (%i/%i)', (current, reserved) => {
    const input = { ...setup(current, reserved), background: true }
    expect(startLive2DProceduralAction(input)).toBe(false)
    expect(input.manager.stopAllMotions).not.toHaveBeenCalled()
    expect(input.onHandoff).not.toHaveBeenCalled()
    expect(input.gesture.active).toBe(false)
  })

  it.each(['missing-cue', 'unsupported-rig'])('does not interrupt for an unrenderable request (%s)', (reason) => {
    const input = setup()
    if (reason === 'missing-cue')
      input.request.cue = 'unknown'
    else
      input.supports = () => false
    expect(startLive2DProceduralAction(input)).toBe(false)
    expect(input.manager.state.currentPriority).toBe(3)
    expect(input.onHandoff).not.toHaveBeenCalled()
  })

  it('keeps an accepted procedural nod when a later unsupported gesture arrives', () => {
    const input = setup(0)
    startLive2DProceduralAction(input)
    expect(startLive2DProceduralAction({ ...input, request: { ...input.request, cue: 'unknown' } })).toBe(false)
    expect(input.gesture.sample(10.45)?.offset).toBeCloseTo(-4)
  })
})
