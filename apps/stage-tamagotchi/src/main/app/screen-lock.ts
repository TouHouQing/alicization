import type { BrowserWindow } from 'electron'

export type ScreenLockWindow = Pick<
  BrowserWindow,
  'hide' | 'isDestroyed' | 'isVisible' | 'on' | 'removeListener' | 'show'
>

/**
 * Keeps application windows out of the OS lock screen and restores only the
 * windows that were visible before the lock began.
 */
export function createScreenLockWindowLifecycle(getWindows: () => readonly ScreenLockWindow[]) {
  const watchedWindows = new Map<ScreenLockWindow, {
    onClosed: () => void
    onShow: () => void
  }>()
  const visibleBeforeLock = new Set<ScreenLockWindow>()
  let locked = false

  function unwatchWindow(window: ScreenLockWindow) {
    const listeners = watchedWindows.get(window)
    if (!listeners)
      return

    window.removeListener('closed', listeners.onClosed)
    window.removeListener('show', listeners.onShow)
    watchedWindows.delete(window)
    visibleBeforeLock.delete(window)
  }

  function watchWindow(window: ScreenLockWindow) {
    if (watchedWindows.has(window))
      return

    const onClosed = () => unwatchWindow(window)
    const onShow = () => {
      if (!locked || window.isDestroyed())
        return

      window.hide()
    }

    watchedWindows.set(window, { onClosed, onShow })
    window.on('closed', onClosed)
    window.on('show', onShow)

    if (locked && !window.isDestroyed() && window.isVisible())
      window.hide()
  }

  function lock() {
    if (locked)
      return

    locked = true
    for (const window of getWindows()) {
      watchWindow(window)
      if (window.isDestroyed() || !window.isVisible())
        continue

      visibleBeforeLock.add(window)
      window.hide()
    }
  }

  function unlock() {
    if (!locked)
      return

    locked = false
    const windowsToRestore = [...visibleBeforeLock]
    visibleBeforeLock.clear()

    for (const window of windowsToRestore) {
      if (!window.isDestroyed())
        window.show()
    }
  }

  function dispose() {
    for (const window of watchedWindows.keys())
      unwatchWindow(window)
    visibleBeforeLock.clear()
    locked = false
  }

  return {
    dispose,
    isLocked: () => locked,
    lock,
    unlock,
    watchWindow,
  }
}
