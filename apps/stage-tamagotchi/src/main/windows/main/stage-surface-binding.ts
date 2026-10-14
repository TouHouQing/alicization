import type { BrowserWindow } from 'electron'

// Electron can present a transparent Windows surface before its first body
// frame without attaching that frame to DWM. A single visibility rebind after
// mounting fixes the native surface; repaint/resize alone does not. Never
// repeat on hover, steal focus or reopen a stage the user hid.
export function createInitialStageSurfaceBinding(options: {
  platform: string
  window: Pick<BrowserWindow, 'isDestroyed' | 'isVisible' | 'isMinimized' | 'hide' | 'showInactive'>
  restoreUtilityOrder: () => void
}) {
  let bound = false
  return () => {
    if (bound || options.platform !== 'win32' || options.window.isDestroyed() || !options.window.isVisible() || options.window.isMinimized())
      return false
    bound = true
    options.window.hide()
    options.window.showInactive()
    options.restoreUtilityOrder()
    return true
  }
}
