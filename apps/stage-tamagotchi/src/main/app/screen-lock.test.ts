import { describe, expect, it, vi } from 'vitest'

import { createScreenLockWindowLifecycle } from './screen-lock'

function createWindow(visible = true) {
  const listeners = new Map<'closed' | 'show', Set<() => void>>([
    ['closed', new Set()],
    ['show', new Set()],
  ])
  const window = {
    hide: vi.fn(() => {
      visible = false
    }),
    isDestroyed: vi.fn(() => false),
    isVisible: vi.fn(() => visible),
    on: vi.fn((event, listener) => {
      listeners.get(event)?.add(listener)
    }),
    removeListener: vi.fn((event, listener) => {
      listeners.get(event)?.delete(listener)
    }),
    show: vi.fn(() => {
      visible = true
      for (const listener of listeners.get('show') ?? [])
        listener()
    }),
  } as unknown as Parameters<ReturnType<typeof createScreenLockWindowLifecycle>['watchWindow']>[0]

  return {
    emitClosed: () => {
      for (const listener of listeners.get('closed') ?? [])
        listener()
    },
    emitShow: () => {
      visible = true
      for (const listener of listeners.get('show') ?? [])
        listener()
    },
    window,
  }
}

describe('createScreenLockWindowLifecycle', () => {
  it('hides visible windows and restores only the windows visible before locking', () => {
    const visible = createWindow(true)
    const hidden = createWindow(false)
    const lifecycle = createScreenLockWindowLifecycle(() => [visible.window, hidden.window])

    lifecycle.watchWindow(visible.window)
    lifecycle.watchWindow(hidden.window)
    lifecycle.lock()

    expect(visible.window.hide).toHaveBeenCalledOnce()
    expect(hidden.window.hide).not.toHaveBeenCalled()
    expect(lifecycle.isLocked()).toBe(true)

    lifecycle.unlock()

    expect(visible.window.show).toHaveBeenCalledOnce()
    expect(hidden.window.show).not.toHaveBeenCalled()
    expect(lifecycle.isLocked()).toBe(false)
  })

  it('hides a window created or shown while the system is locked', () => {
    const existing = createWindow(true)
    const createdWhileLocked = createWindow(false)
    const lifecycle = createScreenLockWindowLifecycle(() => [existing.window])

    lifecycle.watchWindow(existing.window)
    lifecycle.lock()
    lifecycle.watchWindow(createdWhileLocked.window)

    createdWhileLocked.emitShow()

    expect(createdWhileLocked.window.hide).toHaveBeenCalledOnce()
    lifecycle.unlock()
    expect(createdWhileLocked.window.show).not.toHaveBeenCalled()
  })

  it('does not restore a window that closed during the lock', () => {
    const window = createWindow(true)
    const lifecycle = createScreenLockWindowLifecycle(() => [window.window])

    lifecycle.watchWindow(window.window)
    lifecycle.lock()
    window.emitClosed()
    lifecycle.unlock()

    expect(window.window.show).not.toHaveBeenCalled()
  })

  it('removes lifecycle listeners on dispose', () => {
    const window = createWindow(true)
    const lifecycle = createScreenLockWindowLifecycle(() => [window.window])

    lifecycle.watchWindow(window.window)
    lifecycle.dispose()

    window.emitShow()

    expect(window.window.hide).not.toHaveBeenCalled()
    expect(window.window.removeListener).toHaveBeenCalledTimes(2)
  })
})
