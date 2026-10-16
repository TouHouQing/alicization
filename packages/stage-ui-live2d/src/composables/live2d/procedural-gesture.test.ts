import { describe, expect, it } from 'vitest'

import { createLive2DProceduralGesture, listLive2DProceduralActions } from './procedural-gesture'

describe('live2D semantic gesture fallback', () => {
  it('only advertises and starts gestures supported by the actual rig', () => {
    const supports = (id: string) => id === 'ParamAngleY'
    expect(listLive2DProceduralActions(supports).map(item => item.key)).toContain('reassuring_nod')
    expect(listLive2DProceduralActions(supports).map(item => item.key)).not.toContain('head_shake')
    const gesture = createLive2DProceduralGesture()
    expect(gesture.start({ cue: 'head_shake', revision: 1, now: 10, intensity: 1 }, supports)).toBe(false)
    expect(gesture.sample(10)).toBeNull()
  })

  it('nods once and returns exactly to the authored pose, allowing a later identical action', () => {
    const gesture = createLive2DProceduralGesture()
    const request = { cue: 'nod_soft', revision: 1, now: 10, intensity: 0.8 }
    gesture.start(request, () => true)
    expect(gesture.sample(10)?.offset).toBeCloseTo(0)
    expect(gesture.sample(10.45)?.offset).toBeCloseTo(-4)
    expect(gesture.sample(11)).toBeNull()
    gesture.start({ ...request, revision: 2, now: 11 }, () => true)
    expect(gesture.sample(11.45)?.revision).toBe(2)
  })

  it('bounds the shake and cancels on interruption or an invalid clock', () => {
    const gesture = createLive2DProceduralGesture()
    gesture.start({ cue: 'head_shake', revision: 3, now: 0, intensity: 9 }, () => true)
    const samples = Array.from({ length: 30 }, (_, index) => gesture.sample(index / 30)?.offset ?? 0)
    expect(Math.max(...samples)).toBeGreaterThan(1)
    expect(Math.min(...samples)).toBeLessThan(-1)
    expect(samples.every(value => Math.abs(value) <= 7)).toBe(true)
    gesture.cancel()
    expect(gesture.sample(1.1)).toBeNull()
    gesture.start({ cue: 'head_tilt', revision: 4, now: 2, intensity: 1 }, () => true)
    expect(gesture.sample(Number.NaN)).toBeNull()
    expect(gesture.sample(2.5)).toBeNull()
  })
})
