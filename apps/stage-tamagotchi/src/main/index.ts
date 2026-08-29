import type { FileLoggerHandle } from './app/file-logger'

import process, { env, platform } from 'node:process'

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import messages from '@proj-alicization/i18n/locales'

import { electronApp, optimizer } from '@electron-toolkit/utils'
import { Format, LogLevel, setGlobalFormat, setGlobalHookPostLog, setGlobalLogLevel, useLogg } from '@guiiai/logg'
import { initScreenCaptureForMain } from '@proj-alicization/electron-screen-capture/main'
import { app, BrowserWindow, ipcMain, powerMonitor, webContents } from 'electron'
import { noop } from 'es-toolkit'
import { createLoggLogger, injeca, lifecycle } from 'injeca'
import { isLinux } from 'std-env'

import icon from '../../resources/icon.png?asset'

import { electronSystemLockStateChannel } from '../shared/eventa'
import { registerAppExitSignalHandlers } from './app-exit-signal-handlers'
import { openDebugger, setupDebugger } from './app/debugger'
import { nullFileLoggerHandle, setupFileLogger } from './app/file-logger'
import { createScreenLockWindowLifecycle } from './app/screen-lock'
import { createGlobalAppConfig } from './configs/global'
import { emitAppBeforeQuit, emitAppReady, emitAppWindowAllClosed, onAppBeforeQuit } from './libs/bootkit/lifecycle'
import { setElectronMainDirname } from './libs/electron/location'
import { createI18n } from './libs/i18n'
import { setupServerChannel } from './services/airi/channel-server'
import { setupMcpStdioManager } from './services/airi/mcp-servers'
import { setupPluginHost } from './services/airi/plugins'
import { setupAlicizationRuntime } from './services/alicization/runtime'
import { setupAutoUpdater } from './services/electron/auto-updater'
import { setupTray } from './tray'
import { setupAboutWindowReusable } from './windows/about'
import { setupBeatSync } from './windows/beat-sync'
import { setupCaptionWindowManager } from './windows/caption'
import { setupChatWindowReusableFunc } from './windows/chat'
import { setupDevtoolsWindow } from './windows/devtools'
import { setupMainWindow } from './windows/main'
import { setupNoticeWindowManager } from './windows/notice'
import { setupOnboardingWindowManager } from './windows/onboarding'
import { setupSettingsWindowReusableFunc } from './windows/settings'
import { setupWidgetsWindowManager } from './windows/widgets'

// TODO: once we refactored eventa to support window-namespaced contexts,
// we can remove the setMaxListeners call below since eventa will be able to dispatch and
// manage events within eventa's context system.
ipcMain.setMaxListeners(100)

setElectronMainDirname(dirname(fileURLToPath(import.meta.url)))
setGlobalFormat(Format.Pretty)
setGlobalLogLevel(LogLevel.Log)
const configuredUserDataPath = env.ALICIZATION_USER_DATA_PATH?.trim()
if (configuredUserDataPath)
  app.setPath('userData', configuredUserDataPath)
setupDebugger()

const log = useLogg('main').useGlobalConfig()

// Thanks to [@blurymind](https://github.com/blurymind),
//
// When running Electron on Linux, navigator.gpu.requestAdapter() fails.
// In order to enable WebGPU and process the shaders fast enough, we need the following
// command line switches to be set.
//
// https://github.com/electron/electron/issues/41763#issuecomment-2051725363
// https://github.com/electron/electron/issues/41763#issuecomment-3143338995
if (isLinux) {
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer')
  app.commandLine.appendSwitch('enable-unsafe-webgpu')
  app.commandLine.appendSwitch('enable-features', 'Vulkan')

  // NOTICE: we need UseOzonePlatform and WaylandWindowDecorations for reliable Wayland support.
  // X11 is deprecating, so these switches can be removed once Electron enables them by default.
  // Ref: https://github.com/mmaura/poe2linuxcompanion/blob/90664607a147ea5ccea28df6139bd95fb0ebab0e/electron/main/index.ts#L28-L46
  if (env.XDG_SESSION_TYPE === 'wayland') {
    app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal')

    app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform')
    app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations')
  }
}

app.dock?.setIcon(icon)
electronApp.setAppUserModelId('com.tohoqing.alicization')

initScreenCaptureForMain()

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
}
else {
  app.on('second-instance', () => {
    const targetWindow = BrowserWindow.getAllWindows().find(window => !window.isDestroyed())
    if (!targetWindow)
      return

    if (targetWindow.isMinimized())
      targetWindow.restore()

    targetWindow.show()
    targetWindow.focus()
  })
}

let fileLogger: FileLoggerHandle = nullFileLoggerHandle
let skipFileLogging = false

if (hasSingleInstanceLock) {
  app.whenReady().then(async () => {
  // Initialize file logger and register the hook
    fileLogger = await setupFileLogger()

    // Register the global hook for file logging
    setGlobalHookPostLog((_, formatted) => {
      if (skipFileLogging || fileLogger.logFileFd === null)
        return
      void fileLogger.appendLog(formatted)
    })

    const screenLockWindowLifecycle = createScreenLockWindowLifecycle(() => BrowserWindow.getAllWindows())
    const broadcastSystemLockState = (payload: { locked: boolean }) => {
      for (const contents of webContents.getAllWebContents()) {
        if (!contents.isDestroyed())
          contents.send(electronSystemLockStateChannel, payload)
      }
    }
    const handleLockScreen = () => {
      screenLockWindowLifecycle.lock()
      broadcastSystemLockState({ locked: true })
    }
    const handleUnlockScreen = () => {
      screenLockWindowLifecycle.unlock()
      broadcastSystemLockState({ locked: false })
    }
    const handleBrowserWindowCreated = (_event: Electron.Event, window: BrowserWindow) => {
      screenLockWindowLifecycle.watchWindow(window)
      optimizer.watchWindowShortcuts(window)
    }

    powerMonitor.on('lock-screen', handleLockScreen)
    powerMonitor.on('unlock-screen', handleUnlockScreen)
    app.on('browser-window-created', handleBrowserWindowCreated)
    for (const window of BrowserWindow.getAllWindows())
      screenLockWindowLifecycle.watchWindow(window)

    onAppBeforeQuit(() => {
      powerMonitor.removeListener('lock-screen', handleLockScreen)
      powerMonitor.removeListener('unlock-screen', handleUnlockScreen)
      app.removeListener('browser-window-created', handleBrowserWindowCreated)
      screenLockWindowLifecycle.dispose()
    })

    injeca.setLogger(createLoggLogger(useLogg('injeca').useGlobalConfig()))

    const appConfig = injeca.provide('configs:app', () => createGlobalAppConfig())
    const electronApp = injeca.provide('host:electron:app', () => app)
    const autoUpdater = injeca.provide('services:auto-updater', () => setupAutoUpdater())

    const i18n = injeca.provide('libs:i18n', {
      dependsOn: { appConfig },
      build: ({ dependsOn }) => createI18n({ messages, locale: dependsOn.appConfig.get()?.language }),
    })

    const serverChannel = injeca.provide('modules:channel-server', {
      dependsOn: { app: electronApp, lifecycle },
      build: async ({ dependsOn }) => setupServerChannel(dependsOn),
    })

    const mcpStdioManager = injeca.provide('modules:mcp-stdio-manager', {
      build: async () => setupMcpStdioManager(),
    })

    const pluginHost = injeca.provide('modules:plugin-host', {
      dependsOn: { serverChannel },
      build: () => setupPluginHost(),
    })

    const alicizationRuntime = injeca.provide('modules:alicization-runtime', {
      build: async () => setupAlicizationRuntime(),
    })

    // BeatSync will create a background window to capture and process audio.
    const beatSync = injeca.provide('windows:beat-sync', () => setupBeatSync())

    const devtoolsMarkdownStressWindow = injeca.provide('windows:devtools:markdown-stress', () => setupDevtoolsWindow())

    const onboardingWindowManager = injeca.provide('windows:onboarding', {
      dependsOn: { serverChannel, i18n },
      build: ({ dependsOn }) => setupOnboardingWindowManager(dependsOn),
    })

    const noticeWindow = injeca.provide('windows:notice', {
      dependsOn: { i18n, serverChannel },
      build: ({ dependsOn }) => setupNoticeWindowManager(dependsOn),
    })

    const widgetsManager = injeca.provide('windows:widgets', {
      dependsOn: { serverChannel, i18n },
      build: ({ dependsOn }) => setupWidgetsWindowManager(dependsOn),
    })

    const aboutWindow = injeca.provide('windows:about', {
      dependsOn: { autoUpdater, i18n, serverChannel },
      build: ({ dependsOn }) => setupAboutWindowReusable(dependsOn),
    })

    const chatWindow = injeca.provide('windows:chat', {
      dependsOn: { widgetsManager, serverChannel, mcpStdioManager, i18n },
      build: ({ dependsOn }) => setupChatWindowReusableFunc(dependsOn),
    })

    const settingsWindow = injeca.provide('windows:settings', {
      dependsOn: { widgetsManager, beatSync, autoUpdater, devtoolsMarkdownStressWindow, serverChannel, mcpStdioManager, i18n },
      build: async ({ dependsOn }) => setupSettingsWindowReusableFunc(dependsOn),
    })

    const mainWindow = injeca.provide('windows:main', {
      dependsOn: { settingsWindow, chatWindow, widgetsManager, noticeWindow, beatSync, autoUpdater, serverChannel, mcpStdioManager, i18n, onboardingWindowManager },
      build: async ({ dependsOn }) => setupMainWindow(dependsOn),
    })

    const captionWindow = injeca.provide('windows:caption', {
      dependsOn: { mainWindow, serverChannel, i18n },
      build: async ({ dependsOn }) => setupCaptionWindowManager(dependsOn),
    })

    const tray = injeca.provide('app:tray', {
      dependsOn: { mainWindow, settingsWindow, captionWindow, widgetsWindow: widgetsManager, serverChannel, beatSyncBgWindow: beatSync, aboutWindow, i18n },
      build: async ({ dependsOn }) => setupTray(dependsOn),
    })

    injeca.invoke({
      dependsOn: {
        mainWindow,
        tray,
        serverChannel,
        pluginHost,
        mcpStdioManager,
        alicizationRuntime,
        onboardingWindow: onboardingWindowManager,
      },
      callback: noop,
    })

    injeca.start().catch(err => console.error(err))

    // Lifecycle
    emitAppReady()

    // Extra
    openDebugger()
  }).catch((err) => {
    log.withError(err).error('Error during app initialization')
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  emitAppWindowAllClosed()

  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  const targetWindow = BrowserWindow.getAllWindows().find(window =>
    !window.isDestroyed() && window.getTitle() === 'ALICIZATION',
  )
  if (!targetWindow)
    return
  if (targetWindow.isMinimized())
    targetWindow.restore()
  targetWindow.show()
  targetWindow.focus()
})

let appExiting = false

// Clean up server and intervals when app quits
async function handleAppExit() {
  if (appExiting)
    return

  appExiting = true

  let exitedNormally = true

  /**
   * Safely execute fn and log any errors that occur, marking the exit as abnormal
   * if an error is caught.
   *
   * @param operation - A verb phrase describing the operation.
   * @param fn - Any function to execute. It can be either sync or async.
   * @returns A promise that resolves when the operation is complete.
   */
  async function logIfError(operation: string, fn: () => unknown): Promise<void> {
    try {
      await fn()
    }
    catch (error) {
      exitedNormally = false
      log.withError(error).error(`[app-exit] Failed to ${operation}:`)
    }
  }

  await Promise.all([
    logIfError('execute onAppBeforeQuit hooks', () => emitAppBeforeQuit()),
    logIfError('stop injeca', () => injeca.stop()),
  ])

  // Prevent the global log hook from trying to write to the file after close() is called,
  // which would cause a recursive failure if close() itself throws.
  skipFileLogging = true
  await logIfError('flush file logs', () => fileLogger.close()) // Ensure all logs are flushed

  app.exit(exitedNormally ? 0 : 1)
}

registerAppExitSignalHandlers(process, handleAppExit)

app.on('before-quit', (event) => {
  event.preventDefault()
  handleAppExit()
})
