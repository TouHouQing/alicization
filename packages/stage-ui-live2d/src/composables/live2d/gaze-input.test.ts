import { describe, expect, it } from 'vitest'

import { createLive2DGazeInput } from './gaze-input'

describe('live2D pointer attention ownership', () => {
  it('does not renew attention when reactive updates repeat a parked cursor', () => {
    const input = createLive2DGazeInput()
    expect(input.observe({ x: 300, y: 200 }, 1, 'external')).toBe(true)
    expect(input.holdUntil).toBe(2.6)
    expect(input.observe({ x: 300, y: 200 }, 30, 'external')).toBe(false)
    expect(input.holdUntil).toBe(2.6)
  })

  it('lets a direct character interaction own attention before global cursor updates', () => {
    const input = createLive2DGazeInput()
    expect(input.observe({ x: 100, y: 200 }, 1, 'local')).toBe(true)
    expect(input.observe({ x: 800, y: 600 }, 1.1, 'external')).toBe(false)
    expect(input.holdUntil).toBe(2.6)
    expect(input.observe({ x: 810, y: 600 }, 1.8, 'external')).toBe(true)
  })

  it('rejects invalid coordinates and releases the old model input on reset', () => {
    const input = createLive2DGazeInput()
    expect(input.observe({ x: Number.NaN, y: 0 }, 1, 'local')).toBe(false)
    input.observe({ x: 10, y: 20 }, 1, 'external')
    input.reset()
    expect(input.holdUntil).toBe(Number.NEGATIVE_INFINITY)
    expect(input.observe({ x: 10, y: 20 }, 0, 'external')).toBe(true)
  })
})
