import type { BrowserWindow } from 'electron'

export const transparentWindowBackgroundColor = '#00000000'

export interface StageAppVisibilityController {
  show: () => void
}

export function promoteStageWindowAboveDesktop(window: Pick<BrowserWindow, 'moveTop' | 'setAlwaysOnTop' | 'setVisibleOnAllWorkspaces'>) {
  window.setAlwaysOnTop(true, 'screen-saver', 1)
  window.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  })
  window.moveTop()
}

export function showStageWindow(
  window: Pick<BrowserWindow, 'focus' | 'moveTop' | 'show'>,
  app: StageAppVisibilityController,
) {
  app.show()
  window.show()
  window.moveTop()
  window.focus()
}

export function promoteUtilityWindowAboveStage(window: Pick<BrowserWindow, 'setAlwaysOnTop' | 'setVisibleOnAllWorkspaces'>) {
  window.setAlwaysOnTop(true, 'screen-saver', 2)
  window.setVisibleOnAllWorkspaces(true)
}
