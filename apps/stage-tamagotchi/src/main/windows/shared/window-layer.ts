import type { BrowserWindow } from 'electron'

export const transparentWindowBackgroundColor = '#00000000'

export function promoteUtilityWindowAboveStage(window: Pick<BrowserWindow, 'setAlwaysOnTop' | 'setVisibleOnAllWorkspaces'>) {
  window.setAlwaysOnTop(true, 'screen-saver', 2)
  window.setVisibleOnAllWorkspaces(true)
}
