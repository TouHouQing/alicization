import type { BrowserWindow } from 'electron'

import { platform } from 'node:process'

export const transparentWindowBackgroundColor = '#00000000'

export interface StageAppVisibilityController {
  focus: (options: { steal: boolean }) => void
  show: () => void
}

export interface UtilityAppActivationController {
  focus: (options: { steal: boolean }) => void
}

export function setDesktopWindowAlwaysOnTop(
  window: Pick<BrowserWindow, 'setAlwaysOnTop'>,
  enabled: boolean,
  relativeLevel = 1,
) {
  if (!enabled) {
    window.setAlwaysOnTop(false)
    return
  }

  // NOTICE: Windows maps floating levels below its taskbar into the normal window band.
  // Use a topmost level for the transparent companion; its bounds exclude the taskbar.
  if (platform === 'win32')
    window.setAlwaysOnTop(true, 'screen-saver')
  else
    window.setAlwaysOnTop(true, 'floating', relativeLevel)
}

export function promoteStageWindowAboveDesktop(window: Pick<BrowserWindow, 'moveTop' | 'setAlwaysOnTop' | 'setVisibleOnAllWorkspaces'>) {
  setDesktopWindowAlwaysOnTop(window, true)
  window.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  })
  window.moveTop()
}

export function showStageWindow(
  window: Pick<BrowserWindow, 'focus' | 'isVisible' | 'moveTop' | 'show'>,
  app: StageAppVisibilityController,
) {
  ensureStageWindowVisible(window, app)
}

export function ensureStageWindowVisible(
  window: Pick<BrowserWindow, 'focus' | 'isVisible' | 'moveTop' | 'show'>,
  app: StageAppVisibilityController,
) {
  if (platform === 'darwin')
    app.show()
  app.focus({ steal: true })
  if (!window.isVisible())
    window.show()
  window.moveTop()
  window.focus()
}

export function promoteUtilityWindowAboveStage(window: Pick<BrowserWindow, 'moveTop' | 'setAlwaysOnTop' | 'setVisibleOnAllWorkspaces'>) {
  setDesktopWindowAlwaysOnTop(window, true, 2)
  window.setVisibleOnAllWorkspaces(true)
  window.moveTop()
}

export function activateUtilityWindow(
  window: Pick<BrowserWindow, 'focus' | 'moveTop' | 'show'>,
  app: UtilityAppActivationController,
) {
  app.focus({ steal: true })
  window.show()
  window.moveTop()
  window.focus()
}
