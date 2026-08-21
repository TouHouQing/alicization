import type { IpcMainEvent, Rectangle } from 'electron'

import type { ElectronMainStageStartupStatusPayload } from '../../../shared/eventa'
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
import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { isLinux, isMacOS } from 'std-env'
import { array, object, optional, string } from 'valibot'

import icon from '../../../../resources/icon.png?asset'

import { electronMainStageStartupStatusChannel, electronStartDraggingWindow } from '../../../shared/eventa'
import { baseUrl, getElectronMainDirname, load } from '../../libs/electron/location'
import { createConfig } from '../../libs/electron/persistence'
import { promoteStageWindowAboveDesktop, showStageWindow, transparentWindowConfig } from '../shared'
import { setupMainWindowElectronInvokes } from './rpc/index.electron'
import { resolveRendererStartupWatchdogDecision } from './startup-watchdog'

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

  const forceShowFallbackDelayMs = 3500
  const rendererStartupWatchdogDelayMs = 9000
  const rendererStartupSlowLoadingTimeoutMs = 30000
  const stageStartupWatchdogDelayMs = 15000
  const stageStartupWatchdogEnabled = false
  let forceShowFallbackTimer: ReturnType<typeof setTimeout> | undefined
  let rendererStartupWatchdogTimer: ReturnType<typeof setTimeout> | undefined
  let rendererStartupWatchdogStartedAt = Date.now()
  let stageStartupWatchdogTimer: ReturnType<typeof setTimeout> | undefined
  let rendererDidFinishLoad = false
  let rendererStageMounted = false
  let lastStageStartupStatus: ElectronMainStageStartupStatusPayload | undefined

  function clearForceShowFallbackTimer() {
    if (!forceShowFallbackTimer)
      return

    clearTimeout(forceShowFallbackTimer)
    forceShowFallbackTimer = undefined
  }

  function clearRendererStartupWatchdogTimer() {
    if (!rendererStartupWatchdogTimer)
      return

    clearTimeout(rendererStartupWatchdogTimer)
    rendererStartupWatchdogTimer = undefined
  }

  function reportRendererStartupWatchdogTimeout() {
    const details = [
      `url: ${window.webContents.getURL() || '<empty>'}`,
      `isLoading: ${String(window.webContents.isLoading())}`,
      `isDestroyed: ${String(window.webContents.isDestroyed())}`,
      `elapsedMs: ${String(Date.now() - rendererStartupWatchdogStartedAt)}`,
    ].join('\n')
    console.error('[main-window] renderer startup watchdog timeout (no renderer takeover)', details)
  }

  function scheduleRendererStartupWatchdogTimer(delayMs = rendererStartupWatchdogDelayMs) {
    clearRendererStartupWatchdogTimer()
    rendererStartupWatchdogTimer = setTimeout(() => {
      if (window.isDestroyed())
        return

      const webContentsDestroyed = window.webContents.isDestroyed()
      const decision = resolveRendererStartupWatchdogDecision({
        elapsedMs: Date.now() - rendererStartupWatchdogStartedAt,
        rendererDidFinishLoad,
        rendererIsLoading: !webContentsDestroyed && window.webContents.isLoading(),
        slowLoadingTimeoutMs: rendererStartupSlowLoadingTimeoutMs,
        webContentsDestroyed,
        windowDestroyed: false,
      })

      switch (decision) {
        case 'ignore':
          return
        case 'wait-for-load':
          scheduleRendererStartupWatchdogTimer(1000)
          return
        case 'report-timeout':
          reportRendererStartupWatchdogTimeout()
      }
    }, delayMs)
  }

  function clearStageStartupWatchdogTimer() {
    if (!stageStartupWatchdogTimer)
      return

    clearTimeout(stageStartupWatchdogTimer)
    stageStartupWatchdogTimer = undefined
  }

  function scheduleStageStartupWatchdogTimer() {
    if (!stageStartupWatchdogEnabled || !rendererDidFinishLoad || rendererStageMounted || window.isDestroyed())
      return

    clearStageStartupWatchdogTimer()
    stageStartupWatchdogTimer = setTimeout(() => {
      if (window.isDestroyed() || rendererStageMounted)
        return

      void window.webContents.executeJavaScript(`(() => {
        const appRoot = document.querySelector('#app')
        return {
          readyState: document.readyState,
          hash: window.location.hash || '',
          appChildElementCount: appRoot?.childElementCount ?? -1,
          appTextSample: appRoot?.textContent?.slice(0, 120) ?? '',
          stagePageReady: document.documentElement.dataset.alicizationStagePageReady ?? null,
          stageMounted: document.documentElement.dataset.alicizationStageMounted ?? null,
        }
      })()`, true).then((snapshot) => {
        console.info('[main-window] stage startup watchdog dom-snapshot', snapshot)
      }).catch((error) => {
        console.warn('[main-window] stage startup watchdog dom-snapshot failed', error)
      })

      const details = [
        `url: ${window.webContents.getURL() || '<empty>'}`,
        `isLoading: ${String(window.webContents.isLoading())}`,
        `lastStageStartupStatus: ${lastStageStartupStatus ? JSON.stringify(lastStageStartupStatus) : '<none>'}`,
      ].join('\n')
      // NOTICE: Do not replace the live transparent desktop window with a fallback page here.
      // Replacing the whole renderer can force mouse capture and block desktop interaction.
      console.error('[main-window] stage startup watchdog timeout (no renderer takeover)', details)
    }, stageStartupWatchdogDelayMs)
  }

  function normalizeStageStartupStatusPayload(raw: unknown): ElectronMainStageStartupStatusPayload | undefined {
    if (!raw || typeof raw !== 'object')
      return undefined

    const input = raw as Partial<ElectronMainStageStartupStatusPayload>
    if (input.state !== 'stage-page-mounted' && input.state !== 'stage-mounted' && input.state !== 'stage-unmounted')
      return undefined

    return {
      state: input.state,
      route: typeof input.route === 'string' ? input.route : '/',
      timestamp: typeof input.timestamp === 'number' ? input.timestamp : Date.now(),
    }
  }

  function handleMainWindowStageStartupStatus(event: IpcMainEvent, rawPayload?: unknown) {
    if (window.isDestroyed() || event.sender.id !== window.webContents.id)
      return

    const payload = normalizeStageStartupStatusPayload(rawPayload)
    if (!payload)
      return

    lastStageStartupStatus = payload
    console.info('[main-window] renderer stage startup status', payload)
    switch (payload.state) {
      case 'stage-mounted':
        rendererStageMounted = true
        clearStageStartupWatchdogTimer()
        console.info('[main-window] renderer stage mounted', payload)
        return
      case 'stage-unmounted':
        rendererStageMounted = false
        if (payload.route === '/')
          scheduleStageStartupWatchdogTimer()
        else
          clearStageStartupWatchdogTimer()
        return
      case 'stage-page-mounted':
        if (payload.route === '/')
          scheduleStageStartupWatchdogTimer()
    }
  }

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
  promoteStageWindowAboveDesktop(window)
  window.setFullScreenable(false)
  // NOTICE: start in click-through mode to avoid desktop hard-blocking if renderer-side
  // mouse-capture sync has not been initialized yet.
  window.setIgnoreMouseEvents(true, { forward: true })
  if (isMacOS) {
    window.setWindowButtonVisibility(false)
  }

  window.on('ready-to-show', () => {
    clearForceShowFallbackTimer()
    syncWindowToDesktopBounds()
    showStageWindow(window, app)
  })
  ipcMain.on(electronMainStageStartupStatusChannel, handleMainWindowStageStartupStatus)
  window.webContents.on('did-finish-load', () => {
    rendererDidFinishLoad = true
    clearRendererStartupWatchdogTimer()
    clearForceShowFallbackTimer()
    scheduleStageStartupWatchdogTimer()
    console.info('[main-window] did-finish-load', {
      url: window.webContents.getURL(),
    })
  })
  window.webContents.on('console-message', (details) => {
    const { level, message, lineNumber: line, sourceId } = details
    if (level !== 'warning' && level !== 'error' && !/\b(?:error|failed|exception)\b/i.test(message) && !message.includes('[stage-startup-trace]'))
      return

    console.error('[main-window] renderer-console', {
      level,
      line,
      sourceId,
      message,
    })
  })
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || rendererDidFinishLoad || window.isDestroyed())
      return

    const details = [
      `errorCode: ${String(errorCode)}`,
      `errorDescription: ${String(errorDescription)}`,
      `validatedURL: ${String(validatedURL)}`,
    ].join('\n')
    console.error('[main-window] did-fail-load', details)
  })
  window.webContents.on('render-process-gone', (_event, details) => {
    if (window.isDestroyed())
      return

    console.error('[main-window] render-process-gone', details)
  })
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // NOTICE: Transparent windows can appear as "completely missing" when ready-to-show
  // does not fire in time. Force-show as a safety net so startup failures remain debuggable.
  forceShowFallbackTimer = setTimeout(() => {
    if (window.isDestroyed() || window.isVisible())
      return

    syncWindowToDesktopBounds()
    showStageWindow(window, app)
  }, forceShowFallbackDelayMs)

  rendererStartupWatchdogStartedAt = Date.now()
  scheduleRendererStartupWatchdogTimer()

  try {
    await load(window, baseUrl(resolve(getElectronMainDirname(), '..', 'renderer')))
  }
  catch (error) {
    console.error('[main-window] Failed to load renderer entry:', error)
  }

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
      clearForceShowFallbackTimer()
      clearRendererStartupWatchdogTimer()
      clearStageStartupWatchdogTimer()
      ipcMain.off(electronMainStageStartupStatusChannel, handleMainWindowStageStartupStatus)
      cleanUpWindowDraggingInvokeHandler()
      screen.off('display-added', handleDisplayMetricsChanged)
      screen.off('display-removed', handleDisplayMetricsChanged)
      screen.off('display-metrics-changed', handleDisplayMetricsChanged)
    })
  }
  else {
    window.on('closed', () => {
      clearForceShowFallbackTimer()
      clearRendererStartupWatchdogTimer()
      clearStageStartupWatchdogTimer()
      ipcMain.off(electronMainStageStartupStatusChannel, handleMainWindowStageStartupStatus)
      screen.off('display-added', handleDisplayMetricsChanged)
      screen.off('display-removed', handleDisplayMetricsChanged)
      screen.off('display-metrics-changed', handleDisplayMetricsChanged)
    })
  }

  initScreenCaptureForWindow(window)

  return window
}
