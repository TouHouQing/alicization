import { describe, expect, it, vi } from 'vitest'

import { createInitialStageSurfaceBinding } from './stage-surface-binding'

describe('initial native stage surface binding', () => {
  it('presents controls before a delayed body and binds the later body only once', () => {
    const window = { isDestroyed: () => false, isVisible: () => true, isMinimized: () => false, hide: vi.fn(), showInactive: vi.fn() }
    const bind = createInitialStageSurfaceBinding({ platform: 'win32', window, restoreUtilityOrder: vi.fn() })
    expect(bind('controls')).toBe(true)
    expect(bind('controls')).toBe(false)
    expect(bind('body')).toBe(true)
    expect(bind('body')).toBe(false)
    expect(window.showInactive).toHaveBeenCalledTimes(2)
  })
  it('rebinds one visible Windows body without stealing utility focus and never repeats on later body mounts', () => {
    const calls: string[] = []
    const window = { isDestroyed: () => false, isVisible: () => true, isMinimized: () => false, hide: () => calls.push('hide'), showInactive: () => calls.push('show-inactive') }
    const bind = createInitialStageSurfaceBinding({ platform: 'win32', window, restoreUtilityOrder: () => calls.push('utility-order') })
    expect(bind()).toBe(true)
    expect(bind()).toBe(false)
    expect(calls).toEqual(['hide', 'show-inactive', 'utility-order'])
  })
  it('leaves hidden/minimized/destroyed and other-platform stages alone', () => {
    for (const state of ['hidden', 'minimized', 'destroyed', 'mac']) {
      const window = { isDestroyed: () => state === 'destroyed', isVisible: () => state !== 'hidden', isMinimized: () => state === 'minimized', hide: vi.fn(), showInactive: vi.fn() }
      expect(createInitialStageSurfaceBinding({ platform: state === 'mac' ? 'darwin' : 'win32', window, restoreUtilityOrder: vi.fn() })()).toBe(false)
      expect(window.hide).not.toHaveBeenCalled()
      expect(window.showInactive).not.toHaveBeenCalled()
    }
  })
})
