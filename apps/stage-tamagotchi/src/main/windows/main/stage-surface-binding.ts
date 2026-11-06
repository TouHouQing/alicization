import type { BrowserWindow } from 'electron'

// Electron can present a transparent Windows surface before its first body
// frame without attaching that frame to DWM. Rebind once for the controls and
// once for the body, so a slow archive cannot hide every entry point. Never
// repeat on hover, steal focus or reopen a stage the user hid.
export function createInitialStageSurfaceBinding(options: {
  platform: string
  window: Pick<BrowserWindow, 'isDestroyed' | 'isVisible' | 'isMinimized' | 'hide' | 'showInactive'>
  restoreUtilityOrder: () => void
}) {
  const bound = new Set<'controls' | 'body'>()
  return (surface: 'controls' | 'body' = 'body') => {
    if (bound.has(surface) || options.platform !== 'win32' || options.window.isDestroyed() || !options.window.isVisible() || options.window.isMinimized())
      return false
    bound.add(surface)
    options.window.hide()
    options.window.showInactive()
    options.restoreUtilityOrder()
    return true
  }
}
