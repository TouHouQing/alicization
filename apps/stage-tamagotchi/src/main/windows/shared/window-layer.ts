import type { BrowserWindow } from 'electron'

export const transparentWindowBackgroundColor = '#00000000'

export interface StageAppVisibilityController {
  focus: (options: { steal: boolean }) => void
  show: () => void
}

export interface UtilityAppActivationController {
  focus: (options: { steal: boolean }) => void
}

export function promoteStageWindowAboveDesktop(window: Pick<BrowserWindow, 'moveTop' | 'setAlwaysOnTop' | 'setVisibleOnAllWorkspaces'>) {
  window.setAlwaysOnTop(true, 'floating', 1)
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
  app.show()
  app.focus({ steal: true })
  if (!window.isVisible())
    window.show()
  window.moveTop()
  window.focus()
}

export function promoteUtilityWindowAboveStage(window: Pick<BrowserWindow, 'moveTop' | 'setAlwaysOnTop' | 'setVisibleOnAllWorkspaces'>) {
  window.setAlwaysOnTop(true, 'floating', 2)
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
