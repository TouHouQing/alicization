import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTrayMenuRebuild } from './menu-rebuild'

afterEach(() => vi.useRealTimers())

describe('native tray menu lifetime', () => {
  it('cancels a pending visibility rebuild before native destruction', () => {
    vi.useFakeTimers()
    let destroyed = false
    const getBounds = vi.fn(() => {
      if (destroyed)
        throw new Error('Object has been destroyed')
    })
    const menu = createTrayMenuRebuild({ isAvailable: () => !destroyed, rebuild: getBounds })
    menu.request()
    menu.dispose()
    destroyed = true
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
    expect(getBounds).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores captured visibility and locale notifications arriving after disposal', () => {
    vi.useFakeTimers()
    const rebuild = vi.fn()
    const menu = createTrayMenuRebuild({ isAvailable: () => true, rebuild })
    const lateVisibilityNotification = menu.request
    menu.dispose()
    lateVisibilityNotification()
    vi.advanceTimersByTime(1000)
    expect(rebuild).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('coalesces live changes and checks native availability again at execution', () => {
    vi.useFakeTimers()
    let available = true
    const rebuild = vi.fn()
    const menu = createTrayMenuRebuild({ isAvailable: () => available, rebuild })
    menu.request()
    menu.request()
    available = false
    vi.advanceTimersByTime(100)
    expect(rebuild).not.toHaveBeenCalled()
    available = true
    menu.request()
    menu.request()
    vi.advanceTimersByTime(100)
    expect(rebuild).toHaveBeenCalledOnce()
    menu.dispose()
  })
})
