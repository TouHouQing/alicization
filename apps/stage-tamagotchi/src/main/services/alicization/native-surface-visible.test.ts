import { expect, it } from 'vitest'

import { isNativeSurfaceVisible } from './native-surface-visible'

it('requires an opaque visible window to intersect an actual monitor', () => {
  const displays = [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }, { bounds: { x: -1280, y: 0, width: 1280, height: 1024 } }]
  const window = { isDestroyed: () => false, isVisible: () => true, isMinimized: () => false, getOpacity: () => 1, getBounds: () => ({ x: -100, y: 40, width: 200, height: 300 }) }
  expect(isNativeSurfaceVisible(window, displays)).toBe(true)
  expect(isNativeSurfaceVisible({ ...window, getOpacity: () => 0 }, displays)).toBe(false)
  expect(isNativeSurfaceVisible({ ...window, isMinimized: () => true }, displays)).toBe(false)
  expect(isNativeSurfaceVisible({ ...window, getBounds: () => ({ x: 4000, y: 100, width: 200, height: 300 }) }, displays)).toBe(false)
  expect(isNativeSurfaceVisible({ ...window, getBounds: () => { throw new Error('native unavailable') } }, displays)).toBe(false)
})
