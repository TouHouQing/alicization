import type { Rectangle } from 'electron'

import { expect, it, vi } from 'vitest'

import { installHostViewportPositionGuard } from './host-viewport-position'

it('keeps every native placement outside multiple displays before any move event, while preserving requested size', () => {
  const displays = [{ x: -1920, y: -1080, width: 1920, height: 1080 }, { x: 0, y: 0, width: 2560, height: 1440 }, { x: -31000, y: -31000, width: 2000, height: 2000 }]
  let bounds = { x: -30000, y: -30000, width: 600, height: 800 }
  const calls: Rectangle[] = []
  const nativeSetBounds = vi.fn((requested: Partial<Rectangle>) => {
    const next = { ...bounds, ...requested }
    expect(displays.some(display => next.x < display.x + display.width && next.x + next.width > display.x && next.y < display.y + display.height && next.y + next.height > display.y)).toBe(false)
    calls.push(next)
    bounds = next
  })
  const nativeCenter = vi.fn()
  const nativePosition = vi.fn()
  const window = { getBounds: () => ({ ...bounds }), setBounds: nativeSetBounds, setPosition: nativePosition, center: nativeCenter }
  installHostViewportPositionGuard(window, () => displays)
  window.setBounds({ x: 100, y: 100, width: 900, height: 700 })
  window.setPosition(-1000, -500)
  window.center()
  window.setBounds({ width: 1100, height: 900 })
  window.setPosition(-9000, -9000)
  expect(calls).toHaveLength(5)
  expect(bounds).toEqual({ x: -9000, y: -9000, width: 1100, height: 900 })
  expect(nativePosition).not.toHaveBeenCalled()
  expect(nativeCenter).not.toHaveBeenCalled()
})
