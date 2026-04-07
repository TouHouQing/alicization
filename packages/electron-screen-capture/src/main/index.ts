// SPDX-FileCopyrightText: Copyright (c) Alec Armbruster, Licensed under MIT License
// SPDX-FileCopyrightText: Copyright (c) Moeru AI
// SPDX-FileCopyrightText: Copyright (c) TouHouQing

import type { Format, LogLevelString } from '@guiiai/logg'
import type { MutexInterface } from 'async-mutex'
import type { DesktopCapturerSource, SourcesOptions } from 'electron'

import process from 'node:process'

import { useLogg } from '@guiiai/logg'
import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { Mutex, withTimeout } from 'async-mutex'
import { app, BrowserWindow, desktopCapturer, ipcMain, session as sessionModule, webContents } from 'electron'
import { nanoid } from 'nanoid'

import { screenCapture } from '..'
import { createScreenCaptureDiagnosticsStore } from './diagnostics-store'
import {
  checkMacOSScreenCapturePermission,
  requestMacOSScreenCapturePermission,
  toSerializableDesktopCapturerSource,
} from './utils'

export const defaultSourcesOptions: SourcesOptions = { types: ['screen'] }

export const featureSwitchKey = 'enable-features' as const

export enum LoopbackAudioTypes {
  Loopback = 'loopback',
  LoopbackWithMute = 'loopbackWithMute',
}

enum DefaultFeatureFlags {
  PulseaudioLoopbackForScreenShare = 'PulseaudioLoopbackForScreenShare',
  /**
   * Note(Makito): Some discussions on this flag can be found here:
   *
   * - {@link https://issues.chromium.org/issues/355308245}
   * - {@link https://issues.chromium.org/issues/394329567}
   */
  MacLoopbackAudioForScreenShare = 'MacLoopbackAudioForScreenShare',
}

enum CoreAudioTapFeatureFlags {
  MacCoreAudioTapSystemAudioLoopbackOverride = 'MacCatapSystemAudioLoopbackCapture',
}

enum ScreenCaptureKitFeatureFlags {
  MacScreenCaptureKitSystemAudioLoopbackOverride = 'MacSckSystemAudioLoopbackOverride',
}

export function buildFeatureFlags({
  otherEnabledFeatures,
  forceCoreAudioTap,
}: {
  otherEnabledFeatures?: string[]
  forceCoreAudioTap?: boolean
}): string {
  const featureFlags = [...Object.values(DefaultFeatureFlags), ...(otherEnabledFeatures ?? [])]

  if (forceCoreAudioTap) {
    featureFlags.push(CoreAudioTapFeatureFlags.MacCoreAudioTapSystemAudioLoopbackOverride)
  }
  else {
    featureFlags.push(ScreenCaptureKitFeatureFlags.MacScreenCaptureKitSystemAudioLoopbackOverride)
  }

  return featureFlags.join(',')
}

let initMainCalled = false

export interface InitMainOptions {
  forceCoreAudioTap?: boolean
  mutexAcquireTimeout?: number
  loggerOptions?: {
    logLevel?: string
    format?: 'json' | 'plain'
  }
}

export interface InitWindowOptions {
  loopbackWithMute?: boolean
  sourcesOptions?: SourcesOptions
  onAfterGetSources?: (sources: DesktopCapturerSource[]) => DesktopCapturerSource[]
  loggerOptions?: {
    logLevel?: string
    format?: 'json' | 'plain'
  }
}

export interface GetLoopbackAudioMediaStreamOptions {
  removeVideo?: boolean
}

let setSourceMutex: MutexInterface
let screenCaptureSourceMutexHandle: string | undefined
let setSourceMutexTimeoutHandle: NodeJS.Timeout | undefined
const diagnosticsStore = createScreenCaptureDiagnosticsStore()

export function initScreenCaptureForMain(options: InitMainOptions = {}): void {
  const {
    forceCoreAudioTap = false,
    mutexAcquireTimeout = 5000,
  } = options

  let log = useLogg('screen-capture').useGlobalConfig()
  if (options?.loggerOptions?.logLevel) {
    log = log.withLogLevelString((options?.loggerOptions?.logLevel ?? 'info') as LogLevelString)
  }
  if (options?.loggerOptions?.format) {
    log = log.withFormat((options?.loggerOptions?.format ?? 'plain') as Format)
  }

  if (mutexAcquireTimeout <= 0 || !Number.isFinite(mutexAcquireTimeout) || Number.isNaN(mutexAcquireTimeout)) {
    throw new Error('mutexAcquireTimeout must be a positive finite number')
  }

  if (initMainCalled) {
    log.warn('initScreenCaptureForMain should only be called once')
    return
  }
  initMainCalled = true
  setSourceMutex = withTimeout(new Mutex(), mutexAcquireTimeout)

  // Get other enabled features from the command line.
  const otherEnabledFeatures = app.commandLine.getSwitchValue(featureSwitchKey)?.split(',')

  // Remove the switch if it exists.
  if (app.commandLine.hasSwitch(featureSwitchKey)) {
    app.commandLine.removeSwitch(featureSwitchKey)
  }

  // Add the feature flags to the command line with any other user-enabled features concatenated.
  const currentFeatureFlags = buildFeatureFlags({
    otherEnabledFeatures,
    forceCoreAudioTap,
  })

  app.commandLine.appendSwitch(featureSwitchKey, currentFeatureFlags)
}

export function getScreenCaptureDiagnosticsForWindow(window: BrowserWindow) {
  return diagnosticsStore.getSnapshot({
    windowId: window.id,
    windowTitle: tryWindowTitle(window),
  }, getScreenCapturePermissionStatus())
}

export function getScreenCaptureDiagnosticsForWebContentsId(webContentsId: number) {
  const target = webContents.fromId(webContentsId)
  if (!target)
    return null

  const window = BrowserWindow.fromWebContents(target)
  if (!window)
    return null

  return getScreenCaptureDiagnosticsForWindow(window)
}

function resetScreenCaptureSource() {
  sessionModule.defaultSession.setDisplayMediaRequestHandler(null)
  clearTimeout(setSourceMutexTimeoutHandle)
  setSourceMutexTimeoutHandle = undefined
  screenCaptureSourceMutexHandle = undefined
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  try {
    return JSON.stringify(error)
  }
  catch {
    return String(error)
  }
}

function getScreenCapturePermissionStatus() {
  return process.platform === 'darwin'
    ? checkMacOSScreenCapturePermission()
    : 'granted'
}

function releaseScreenCaptureSource(reason: 'manual-reset' | 'timeout' | 'window-closed' | 'set-source-error') {
  const activeHandle = screenCaptureSourceMutexHandle
  if (!activeHandle)
    return

  diagnosticsStore.noteLeaseReleased({
    handle: activeHandle,
    reason,
  })
  resetScreenCaptureSource()
  setSourceMutex.release()
}

const initializedWindows = new WeakSet<BrowserWindow>()

// NOTICE: use this to guard to prevent handling destroyed window
// especially when trying to get window title,
// but window.id is another story as window.id is stable and unique even
// after window is destroyed
function tryWindowTitle(window: BrowserWindow, previous?: string): string {
  if (window.isDestroyed()) {
    return previous || '<destroyed>'
  }

  const title = window.getTitle()
  return title
}

export function initScreenCaptureForWindow(window: BrowserWindow, options?: InitWindowOptions): void {
  let log = useLogg('screen-capture').useGlobalConfig()
  if (options?.loggerOptions?.logLevel) {
    log = log.withLogLevelString((options?.loggerOptions?.logLevel ?? 'info') as LogLevelString)
  }
  if (options?.loggerOptions?.format) {
    log = log.withFormat((options?.loggerOptions?.format ?? 'plain') as Format)
  }

  const windowId = window.id
  const windowTitle = tryWindowTitle(window)

  log.withFields({ windowId, windowTitle: tryWindowTitle(window, windowTitle) }).debug(`init for window`)

  if (!initMainCalled) {
    // Throwing an error because this is unlikely to be recoverable.
    throw new Error('initScreenCaptureForMain must be called before calling initScreenCaptureForWindow')
  }
  if (initializedWindows.has(window)) {
    log.withFields({ windowId, windowTitle: tryWindowTitle(window, windowTitle) }).warn('initScreenCaptureForWindow should only be called once per window')
    return
  }

  initializedWindows.add(window)

  const { context } = createContext(ipcMain, window, { onlySameWindow: true })
  const session = sessionModule.defaultSession
  const getWindowIdentity = () => ({
    windowId,
    windowTitle: tryWindowTitle(window, windowTitle),
  })

  defineInvokeHandler(context, screenCapture.checkMacOSPermission, async () => checkMacOSScreenCapturePermission())
  defineInvokeHandler(context, screenCapture.requestMacOSPermission, async () => requestMacOSScreenCapturePermission())
  defineInvokeHandler(context, screenCapture.reportSessionState, async request => diagnosticsStore.noteRendererSessionState(getWindowIdentity(), request))
  defineInvokeHandler(context, screenCapture.getDiagnostics, async () => diagnosticsStore.getSnapshot(getWindowIdentity(), getScreenCapturePermissionStatus()))

  defineInvokeHandler(context, screenCapture.getSources, async (sourcesOptions) => {
    diagnosticsStore.noteGetSourcesStarted(getWindowIdentity(), sourcesOptions)
    try {
      // NOTICE(@nekomeowww): In probability of 9/10, the window thumbnail is purely empty or black, sources printed and
      // nothing is returned from the desktopCapturer API.
      // NOTICE(@sumimakito): Not only thumbnail is empty, the appIcon could be empty as well with nothing returned.
      // REVIEW(@sumimakito): This has nothing to do with out side, probably related to Electron Bug, you can
      // read more here https://github.com/electron/electron/issues/44504
      let sources = await desktopCapturer.getSources(sourcesOptions)
      if (options?.onAfterGetSources)
        sources = options.onAfterGetSources(sources)

      diagnosticsStore.noteGetSourcesCompleted(getWindowIdentity(), {
        sourceCount: sources.length,
      })
      return sources.map(source => toSerializableDesktopCapturerSource(source))
    }
    catch (error) {
      diagnosticsStore.noteGetSourcesCompleted(getWindowIdentity(), {
        error: toErrorMessage(error),
      })
      throw error
    }
  })

  defineInvokeHandler(context, screenCapture.setSource, async (request, eventaOptions) => {
    // FIXME: Would be better if `onlySameWindow` in `createContext` also filters out invocations here.
    if (window.webContents.id !== eventaOptions?.raw.ipcMainEvent.sender.id)
      return

    const { timeout } = request
    if (typeof timeout === 'number' && (timeout <= 0 || !Number.isFinite(timeout) || Number.isNaN(timeout))) {
      throw new Error('timeout must be a positive finite number')
    }

    await setSourceMutex.acquire()
    log.withFields({ windowId, windowTitle: tryWindowTitle(window, windowTitle) }).debug('setSourceMutex acquired')

    clearTimeout(setSourceMutexTimeoutHandle)
    const handle = nanoid()
    const timeoutMs = request.timeout ?? 5000
    setSourceMutexTimeoutHandle = undefined
    screenCaptureSourceMutexHandle = handle
    diagnosticsStore.noteLeaseAcquired(getWindowIdentity(), {
      handle,
      ownerWebContentsId: eventaOptions?.raw.ipcMainEvent.sender.id,
      sourceId: request.sourceId,
      sourcesOptions: request.options,
      timeoutMs,
    })

    try {
      session.setDisplayMediaRequestHandler(async (_request, callback) => {
        const sources = await desktopCapturer.getSources(request.options)
        const source = sources.find(source => source.id === request.sourceId)
        if (!source) {
          throw new Error(`Source with id ${request.sourceId} not found.`)
        }

        callback({
          video: source,
          audio: options?.loopbackWithMute ? LoopbackAudioTypes.LoopbackWithMute : LoopbackAudioTypes.Loopback,
        })
      })

      setSourceMutexTimeoutHandle = setTimeout(() => {
        if (screenCaptureSourceMutexHandle !== handle)
          return

        releaseScreenCaptureSource('timeout')

        log
          .withFields({ windowId, windowTitle: tryWindowTitle(window, windowTitle) })
          .warn(
            `setSourceMutex released for window due to timeout. `
            + 'Please make sure to invoke screenCaptureResetSource when getDisplayMedia is completed.',
          )
      }, timeoutMs)

      return handle
    }
    catch (e) {
      log
        .withFields({ windowId, windowTitle: tryWindowTitle(window, windowTitle) })
        .withError(e)
        .error('screenCaptureSetSourceEx failed for window')

      releaseScreenCaptureSource('set-source-error')
      throw e
    }
  })

  defineInvokeHandler(context, screenCapture.resetSource, async (mutexHandle) => {
    if (screenCaptureSourceMutexHandle !== mutexHandle)
      return

    releaseScreenCaptureSource('manual-reset')

    log.withFields({ windowId, windowTitle: tryWindowTitle(window, windowTitle) }).debug('setSourceMutex released by window')
  })

  window.once('closed', () => {
    const identity = getWindowIdentity()
    if (diagnosticsStore.getLeaseOwnerWindowId() === windowId) {
      releaseScreenCaptureSource('window-closed')
    }
    diagnosticsStore.forgetWindow(identity)
  })
}
