import { describe, expect, it, vi } from 'vitest'

import { hitLive2DRenderedPoint, mapLive2DClientPoint } from './canvas-point'

describe('live2D visible input geometry', () => {
  it('maps an offset preview and a doubled renderer to the actual character coordinates', () => {
    expect(mapLive2DClientPoint(250, 175, { left: 100, top: 50, width: 300, height: 250 }, { width: 600, height: 500 })).toEqual({ x: 300, y: 250 })
  })

  it('rejects collapsed canvases and invalid pointer values', () => {
    expect(mapLive2DClientPoint(10, 20, { left: 0, top: 0, width: 0, height: 200 }, { width: 1, height: 1 })).toBeNull()
    expect(mapLive2DClientPoint(Number.NaN, 20, { left: 0, top: 0, width: 100, height: 200 }, { width: 100, height: 200 })).toBeNull()
  })

  it('keeps transparent margins interactive for the underlying desktop', () => {
    expect(hitLive2DRenderedPoint({ x: 30, y: 40 }, { width: 100, height: 100 }, { width: 200, height: 200 }, () => 0)).toBe(false)
  })

  it('reads an opaque point from the correct inverted framebuffer row', () => {
    const read = vi.fn(() => 255)
    expect(hitLive2DRenderedPoint({ x: 30, y: 40 }, { width: 100, height: 100 }, { width: 200, height: 200 }, read)).toBe(true)
    expect(read).toHaveBeenCalledWith(60, 119)
  })

  it('never reads a pixel outside the actual canvas', () => {
    const read = vi.fn(() => 255)
    expect(hitLive2DRenderedPoint({ x: 100, y: 40 }, { width: 100, height: 100 }, { width: 200, height: 200 }, read)).toBe(false)
    expect(read).not.toHaveBeenCalled()
  })
})
