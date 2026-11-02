import { describe, expect, it } from 'vitest'

import { compileVisualDrag, validateVisualWindowGeometry, visualPointToAbsolute, visualPointToScreen } from './visual-window-geometry'

function snapshot() {
  return {
    coordinateSpace: 'screen-physical' as const,
    clientBounds: { left: 100, top: 200, width: 800, height: 600 },
    virtualScreen: { left: 0, top: 0, width: 1920, height: 1080 },
    displays: [{ left: 0, top: 0, width: 1920, height: 1080 }],
    imageWidth: 400,
    imageHeight: 300,
    dpiX: 144,
    dpiY: 144,
  }
}

describe('native visual coordinates are bound to the actual window image', () => {
  it('uses pixel centers when a client screenshot is downscaled', () => {
    expect(visualPointToScreen({ space: 'image-pixel', x: 0, y: 0 }, snapshot())).toEqual({ x: 101, y: 201 })
    expect(visualPointToScreen({ space: 'image-pixel', x: 399, y: 299 }, snapshot())).toEqual({ x: 899, y: 799 })
  })

  it('maps normalized endpoints inside the window rather than onto its neighbour', () => {
    expect(visualPointToScreen({ space: 'image-normalized', x: 0, y: 0 }, snapshot())).toEqual({ x: 100, y: 200 })
    expect(visualPointToScreen({ space: 'image-normalized', x: 1, y: 1 }, snapshot())).toEqual({ x: 899, y: 799 })
    expect(visualPointToScreen({ space: 'image-normalized', x: 0.5, y: 0.5 }, snapshot())).toEqual({ x: 500, y: 500 })
  })

  it('does not multiply physical coordinates by DPI a second time', () => {
    const point = { space: 'image-normalized' as const, x: 0.5, y: 0.5 }
    expect(visualPointToScreen(point, { ...snapshot(), dpiX: 96, dpiY: 96 })).toEqual({ x: 500, y: 500 })
    expect(visualPointToScreen(point, { ...snapshot(), dpiX: 192, dpiY: 192 })).toEqual({ x: 500, y: 500 })
  })

  it('preserves negative monitor origins and native physical positions', () => {
    const geometry = { ...snapshot(), clientBounds: { left: -1000, top: 200, width: 800, height: 600 }, virtualScreen: { left: -1920, top: -200, width: 3840, height: 1280 }, displays: [{ left: -1920, top: -200, width: 1920, height: 1280 }, { left: 0, top: 0, width: 1920, height: 1080 }] }
    expect(visualPointToScreen({ space: 'image-normalized', x: 0.5, y: 0.5 }, geometry)).toEqual({ x: -600, y: 500 })
  })

  it('rejects an offscreen part of a captured window while retaining its visible part', () => {
    const geometry = { ...snapshot(), clientBounds: { left: -100, top: 200, width: 800, height: 600 } }
    expect(() => visualPointToScreen({ space: 'image-pixel', x: 0, y: 0 }, geometry)).toThrow('OUTSIDE_VISIBLE_DISPLAY')
    expect(visualPointToScreen({ space: 'image-normalized', x: 1, y: 1 }, geometry)).toEqual({ x: 699, y: 799 })
  })

  it.each([
    { space: 'image-pixel', x: -1, y: 0 },
    { space: 'image-pixel', x: 400, y: 0 },
    { space: 'image-pixel', x: 0, y: 300 },
    { space: 'image-pixel', x: 0.25, y: 0 },
    { space: 'image-normalized', x: 1.01, y: 0 },
    { space: 'image-normalized', x: 0, y: -0.01 },
    { space: 'image-normalized', x: Number.NaN, y: 0 },
    { space: 'image-normalized', x: 0, y: Number.POSITIVE_INFINITY },
    { space: 'screen-dip', x: 0, y: 0 },
    { space: undefined, x: 0, y: 0 },
  ])('rejects invalid coordinates or implicit units: %j', (point) => {
    expect(() => visualPointToScreen(point as Parameters<typeof visualPointToScreen>[0], snapshot())).toThrow('WINDOWS_VISUAL_POINT_')
  })

  it('rejects distorted images, displays outside the actual virtual desktop and extra target fields', () => {
    expect(() => validateVisualWindowGeometry({ ...snapshot(), imageHeight: 200 })).toThrow('IMAGE_GEOMETRY_MISMATCH')
    expect(() => validateVisualWindowGeometry({ ...snapshot(), displays: [{ left: 1800, top: 0, width: 800, height: 600 }] })).toThrow('DISPLAY_GEOMETRY_INVALID')
    expect(() => validateVisualWindowGeometry({ ...snapshot(), windowId: '123' })).toThrow()
    expect(() => validateVisualWindowGeometry({ ...snapshot(), coordinateSpace: 'screen-dip' })).toThrow()
  })

  it('rounds native absolute input into the intended pixels, including both corners', () => {
    const geometry = { ...snapshot(), clientBounds: snapshot().virtualScreen, imageWidth: 960, imageHeight: 540 }
    expect(visualPointToAbsolute({ x: 0, y: 0 }, geometry)).toEqual({ x: 1, y: 1 })
    expect(visualPointToAbsolute({ x: 1919, y: 1079 }, geometry)).toEqual({ x: 65502, y: 65476 })
    expect(visualPointToAbsolute({ x: 1, y: 1 }, geometry)).toEqual({ x: 35, y: 61 })
    expect(() => visualPointToAbsolute({ x: 1920, y: 1079 }, geometry)).toThrow('ABSOLUTE_POINT_INVALID')
    expect(() => visualPointToAbsolute({ x: 10.5, y: 10 }, geometry)).toThrow('ABSOLUTE_POINT_INVALID')
  })

  it('handles a single physical pixel without division by zero', () => {
    const rectangle = { left: -1, top: -1, width: 1, height: 1 }
    const geometry = { ...snapshot(), clientBounds: rectangle, virtualScreen: rectangle, displays: [rectangle], imageWidth: 1, imageHeight: 1 }
    expect(visualPointToAbsolute({ x: -1, y: -1 }, geometry)).toEqual({ x: 1, y: 1 })
  })

  it('compiles a complete bounded route before any native side effect can start', () => {
    const route = compileVisualDrag({ space: 'image-normalized', x: 0, y: 0 }, { space: 'image-normalized', x: 1, y: 1 }, snapshot(), 2)
    expect(route).toHaveLength(3)
    expect(route.map(entry => entry.physical)).toEqual([{ x: 100, y: 200 }, { x: 500, y: 500 }, { x: 899, y: 799 }])
    expect(route.every(entry => Number.isInteger(entry.absolute.x) && Number.isInteger(entry.absolute.y))).toBe(true)
  })

  it('rejects a route through a monitor gap even when both endpoints are visible', () => {
    const geometry = { ...snapshot(), clientBounds: { left: 800, top: 100, width: 600, height: 600 }, virtualScreen: { left: 0, top: 0, width: 2200, height: 1000 }, displays: [{ left: 0, top: 0, width: 1000, height: 1000 }, { left: 1200, top: 0, width: 1000, height: 1000 }], imageWidth: 300, imageHeight: 300 }
    const from = { space: 'image-normalized' as const, x: 0.1, y: 0.5 }
    const to = { space: 'image-normalized' as const, x: 0.9, y: 0.5 }
    expect(visualPointToScreen(from, geometry)).toEqual({ x: 860, y: 400 })
    expect(visualPointToScreen(to, geometry)).toEqual({ x: 1340, y: 400 })
    expect(() => compileVisualDrag(from, to, geometry, 2)).toThrow('CROSSES_DISPLAY_GAP')
    const narrow = { ...geometry, displays: [{ left: 0, top: 0, width: 1111, height: 1000 }, { left: 1112, top: 0, width: 1088, height: 1000 }] }
    expect(() => compileVisualDrag(from, to, narrow, 2)).toThrow('CROSSES_DISPLAY_GAP')
  })

  it.each([0, 1, 33, Number.NaN, 2.5])('rejects an unbounded or malformed drag length %s', (steps) => {
    expect(() => compileVisualDrag({ space: 'image-normalized', x: 0, y: 0 }, { space: 'image-normalized', x: 1, y: 1 }, snapshot(), steps)).toThrow('DRAG_BUDGET')
  })

  it('rejects a drag that rounds to the same physical pixel', () => {
    expect(() => compileVisualDrag({ space: 'image-normalized', x: 0.5, y: 0.5 }, { space: 'image-normalized', x: 0.50001, y: 0.50001 }, snapshot())).toThrow('ZERO_DISTANCE')
  })
})
