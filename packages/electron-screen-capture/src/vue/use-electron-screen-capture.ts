import type { IpcRenderer } from '@electron-toolkit/preload'
import type { SourcesOptions } from 'electron'
import type { MaybeRefOrGetter } from 'vue'

import type { ScreenCaptureSetSourceRequest, SerializableDesktopCapturerSource } from '..'
import type { CreateScreenCaptureSessionOptions } from '../session'

import { createContext } from '@moeru/eventa/adapters/electron/renderer'
import { onScopeDispose, toRaw, toValue } from 'vue'

import { setupElectronScreenCapture } from '../renderer'
import { createScreenCaptureSession } from '../session'

export function useElectronScreenCapture(ipcRenderer: IpcRenderer, sourcesOptions: MaybeRefOrGetter<SourcesOptions>) {
  const context = createContext(ipcRenderer).context
  const resolveSourcesOptions = () => toRaw(toValue(sourcesOptions))
  const boundApi = setupElectronScreenCapture(context).bind(resolveSourcesOptions)

  async function getSources() {
    return boundApi.getSources()
  }

  async function getDiagnostics() {
    return await boundApi.getDiagnostics()
  }

  async function selectWithSource<R>(
    selectFn: (sources: SerializableDesktopCapturerSource[]) => string,
    useFn: () => Promise<R>,
    request?: Omit<ScreenCaptureSetSourceRequest, 'options' | 'sourceId'>,
  ): Promise<R> {
    const sources = await getSources()
    const sourceId = selectFn(sources)

    let handle: string | undefined
    try {
      handle = await boundApi.setSource(sourceId, request)
      return await useFn()
    }
    finally {
      if (handle) {
        await boundApi.resetSource(handle)
      }
    }
  }

  function createSession(options: CreateScreenCaptureSessionOptions = {}) {
    return createScreenCaptureSession(boundApi, options)
  }

  return {
    createSession,
    getDiagnostics,
    getSources,
    setSource: boundApi.setSource,
    resetSource: boundApi.resetSource,
    selectWithSource,
    checkMacOSPermission: boundApi.checkMacOSPermission,
    requestMacOSPermission: boundApi.requestMacOSPermission,
  }
}

export function useElectronScreenCaptureSession(
  ipcRenderer: IpcRenderer,
  sourcesOptions: MaybeRefOrGetter<SourcesOptions>,
  sessionOptions: CreateScreenCaptureSessionOptions = {},
) {
  const api = useElectronScreenCapture(ipcRenderer, sourcesOptions)
  const session = api.createSession(sessionOptions)

  onScopeDispose(() => {
    session.dispose()
  })

  return {
    ...api,
    session,
  }
}
