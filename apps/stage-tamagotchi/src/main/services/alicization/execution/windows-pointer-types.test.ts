import type { VisualWindowGeometry } from './visual-window-geometry'

import { describe, expect, it } from 'vitest'

import { compileWindowsPointerAction, validateWindowsPointerSnapshot } from './windows-pointer-types'

const geometry: VisualWindowGeometry = { coordinateSpace: 'screen-physical', clientBounds: { left: 100, top: 200, width: 800, height: 600 }, virtualScreen: { left: -1920, top: 0, width: 4480, height: 1440 }, displays: [{ left: -1920, top: 0, width: 1920, height: 1080 }, { left: 0, top: 0, width: 2560, height: 1440 }], imageWidth: 400, imageHeight: 300, dpiX: 144, dpiY: 144 }
const point = { space: 'image-pixel' as const, x: 10, y: 20 }

describe('finite native mouse operations', () => {
  it('preserves every exact pixel center across the complete two-times scaled image', () => {
    for (let x = 0; x < geometry.imageWidth; x++) {
      const actual = compileWindowsPointerAction({ kind: 'click', button: 'left', point: { space: 'image-pixel', x, y: 100 } }, geometry)
      expect(actual.action.points[0]).toEqual({ x: geometry.clientBounds.left + 2 * x + 1, y: 401 })
    }
    for (let y = 0; y < geometry.imageHeight; y++) {
      const actual = compileWindowsPointerAction({ kind: 'click', button: 'left', point: { space: 'image-pixel', x: 100, y } }, geometry)
      expect(actual.action.points[0]).toEqual({ x: 301, y: geometry.clientBounds.top + 2 * y + 1 })
    }
  })
  it.each([['left', 1], ['right', 2], ['middle', 4]] as const)('compiles a whole %s click into the actual physical client without applying DPI twice', (button, vk) => {
    expect(compileWindowsPointerAction({ kind: 'click', button, point }, geometry)).toEqual({ action: { kind: 'click', button, wheel: 0, points: [{ x: 121, y: 241 }] }, buttons: [vk], expectedEvents: 3 })
  })
  it.each([['up', 1200], ['down', -1200]] as const)('bounds %s scroll to actual wheel units and no button ownership', (direction, wheel) => {
    expect(compileWindowsPointerAction({ kind: 'scroll', point, direction, notches: 10 }, geometry)).toMatchObject({ action: { kind: 'scroll', button: 'none', wheel }, buttons: [], expectedEvents: 2 })
  })
  it('compiles a finite complete left drag and proves its physical route', () => {
    const actual = compileWindowsPointerAction({ kind: 'drag', from: point, to: { ...point, x: 150, y: 200 } }, geometry)
    expect(actual).toMatchObject({ action: { kind: 'drag', button: 'left', wheel: 0 }, buttons: [1], expectedEvents: 19 })
    expect(actual.action.points).toHaveLength(17)
    expect(actual.action.points.at(-1)).toEqual({ x: 401, y: 601 })
  })
  it.each([
    { kind: 'down', point },
    { kind: 'up', point },
    { kind: 'move', point },
    { kind: 'click', button: 'left', point, repeat: 2 },
    { kind: 'scroll', point, direction: 'down', notches: 11 },
    { kind: 'scroll', point, direction: 'down', notches: 0 },
    { kind: 'click', button: 'left', point: { x: 1, y: 1 } },
    { kind: 'click', button: 'left', point: { ...point, x: Number.NaN } },
  ])('rejects unbounded, partial or ambiguous actions %j', (input) => {
    expect(() => compileWindowsPointerAction(input as never, geometry)).toThrow()
  })
  it('does not propagate raw screenshots or arbitrary metadata into the native receipt snapshot', () => {
    const snapshot = { owner: { windowId: '123', processId: 55, processStartTicks: '639000000000000000', windowClass: 'Owned', desktop: 'Default' }, authority: { userSid: 'S-1-5-21-123-456-789-1001', sessionId: 1, integrityLevel: 8192, ownerWindowId: null }, geometry, imageSha256: 'a'.repeat(64), png: 'private-pixels' }
    expect(validateWindowsPointerSnapshot(snapshot)).not.toHaveProperty('png')
    expect(validateWindowsPointerSnapshot(snapshot)).not.toBe(snapshot)
  })
})
