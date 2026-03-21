import type { Rectangle } from 'electron'

import type { I18n } from '../../libs/i18n'
import type { ServerChannel } from '../../services/airi/channel-server'
import type { McpStdioManager } from '../../services/airi/mcp-servers'
import type { AutoUpdater } from '../../services/electron/auto-updater'
import type { NoticeWindowManager } from '../notice'
import type { OnboardingWindowManager } from '../onboarding'
import type { SettingsWindowManager } from '../settings'
import type { WidgetsWindowManager } from '../widgets'

import { dirname, join, resolve } from 'node:path'
import { env } from 'node:process'
import { fileURLToPath } from 'node:url'

import clickDragPlugin from 'electron-click-drag-plugin'

import { is } from '@electron-toolkit/utils'
import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { initScreenCaptureForWindow } from '@proj-alicization/electron-screen-capture/main'
import { BrowserWindow, ipcMain, screen, shell } from 'electron'
import { isLinux, isMacOS } from 'std-env'
import { array, object, optional, string } from 'valibot'

import icon from '../../../../resources/icon.png?asset'

import { electronStartDraggingWindow } from '../../../shared/eventa'
import { baseUrl, getElectronMainDirname, load } from '../../libs/electron/location'
import { createConfig } from '../../libs/electron/persistence'
import { transparentWindowConfig } from '../shared'
import { setupMainWindowElectronInvokes } from './rpc/index.electron'

const appConfigSchema = object({
  windows: optional(array(object({
    title: optional(string()),
    tag: string(),
  }))),
})

const mainWindowTitle = 'ALICIZATION'

export async function setupMainWindow(params: {
  settingsWindow: SettingsWindowManager
  chatWindow: () => Promise<BrowserWindow>
  widgetsManager: WidgetsWindowManager
  noticeWindow: NoticeWindowManager
  autoUpdater: AutoUpdater
  onWindowCreated?: (window: BrowserWindow) => void
  serverChannel: ServerChannel
  mcpStdioManager: McpStdioManager
  i18n: I18n
  onboardingWindowManager: OnboardingWindowManager
}) {
  const {
    setup: setupConfig,
  } = createConfig('app', 'config.json', appConfigSchema, {
    default: { windows: [] },
    autoHeal: true,
  })

  setupConfig()

  function getDesktopBounds() {
    return screen.getPrimaryDisplay().workArea
  }

  const desktopBounds = getDesktopBounds()

  const window = new BrowserWindow({
    title: mainWindowTitle,
    width: desktopBounds.width,
    height: desktopBounds.height,
    x: desktopBounds.x,
    y: desktopBounds.y,
    show: false,
    icon,
    movable: false,
    maximizable: false,
    resizable: false,
    webPreferences: {
      preload: join(dirname(fileURLToPath(import.meta.url)), '../preload/index.mjs'),
      sandbox: false,
    },
    // Thanks to [@HeartArmy](https://github.com/HeartArmy) for the tip implementation.
    //
    // https://github.com/electron/electron/issues/10078#issuecomment-3410164802
    // https://stackoverflow.com/questions/39835282/set-browserwindow-always-on-top-even-other-app-is-in-fullscreen-electron-mac
    type: 'panel',
    ...transparentWindowConfig(),
  })

  if (params.onWindowCreated) {
    params.onWindowCreated(window)
  }

  // NOTICE: in development mode, open devtools by default
  if (is.dev || env.MAIN_APP_DEBUG || env.APP_DEBUG) {
    try {
      window.webContents.openDevTools({ mode: 'detach' })
    }
    catch (err) {
      console.error('failed to open devtools:', err)
    }
  }

  function syncWindowToDesktopBounds(bounds: Rectangle = getDesktopBounds()) {
    if (window.isDestroyed())
      return

    const currentBounds = window.getBounds()
    if (
      currentBounds.x === bounds.x
      && currentBounds.y === bounds.y
      && currentBounds.width === bounds.width
      && currentBounds.height === bounds.height
    ) {
      return
    }

    window.setBounds(bounds, false)
  }

  const handleDisplayMetricsChanged = () => {
    syncWindowToDesktopBounds()
  }

  screen.on('display-added', handleDisplayMetricsChanged)
  screen.on('display-removed', handleDisplayMetricsChanged)
  screen.on('display-metrics-changed', handleDisplayMetricsChanged)

  // Thanks to [@HeartArmy](https://github.com/HeartArmy) for the tip implementation.
  //
  // https://github.com/electron/electron/issues/10078#issuecomment-3410164802
  // https://stackoverflow.com/questions/39835282/set-browserwindow-always-on-top-even-other-app-is-in-fullscreen-electron-mac
  window.setAlwaysOnTop(true, 'screen-saver', 1)
  window.setFullScreenable(false)
  window.setVisibleOnAllWorkspaces(true)
  if (isMacOS) {
    window.setWindowButtonVisibility(false)
  }

  window.on('ready-to-show', () => {
    syncWindowToDesktopBounds()
    window.show()
  })
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  await load(window, baseUrl(resolve(getElectronMainDirname(), '..', 'renderer')))

  await setupMainWindowElectronInvokes({
    window,
    settingsWindow: params.settingsWindow,
    chatWindow: params.chatWindow,
    widgetsManager: params.widgetsManager,
    noticeWindow: params.noticeWindow,
    autoUpdater: params.autoUpdater,
    serverChannel: params.serverChannel,
    mcpStdioManager: params.mcpStdioManager,
    i18n: params.i18n,
    onboardingWindowManager: params.onboardingWindowManager,
  })

  /**
   * This is a know issue (or expected behavior maybe) to Electron.
   * We don't use this approach on Linux because it's not working.
   *
   * Discussion: https://github.com/electron/electron/issues/37789
   * Workaround: https://github.com/noobfromph/electron-click-drag-plugin
   */
  if (!isLinux) {
    function handleStartDraggingWindow() {
      try {
        const windowId = window.getNativeWindowHandle()
        clickDragPlugin.startDrag(windowId)
      }
      catch (error) {
        console.error(error)
      }
    }

    // TODO: once we refactored eventa to support window-namespaced contexts,
    // we can remove the setMaxListeners call below since eventa will be able to dispatch and
    // manage events within eventa's context system.
    ipcMain.setMaxListeners(0)

    const { context } = createContext(ipcMain, window)
    const cleanUpWindowDraggingInvokeHandler = defineInvokeHandler(context, electronStartDraggingWindow, handleStartDraggingWindow)

    window.on('closed', () => {
      cleanUpWindowDraggingInvokeHandler()
      screen.off('display-added', handleDisplayMetricsChanged)
      screen.off('display-removed', handleDisplayMetricsChanged)
      screen.off('display-metrics-changed', handleDisplayMetricsChanged)
    })
  }
  else {
    window.on('closed', () => {
      screen.off('display-added', handleDisplayMetricsChanged)
      screen.off('display-removed', handleDisplayMetricsChanged)
      screen.off('display-metrics-changed', handleDisplayMetricsChanged)
    })
  }

  initScreenCaptureForWindow(window)

  return window
}
