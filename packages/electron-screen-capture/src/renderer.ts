import type { createContext } from '@moeru/eventa/adapters/electron/renderer'
import type { SourcesOptions, systemPreferences } from 'electron'

import type { ScreenCaptureDiagnosticsSnapshot, ScreenCaptureSessionStateSnapshot, ScreenCaptureSetSourceRequest, SerializableDesktopCapturerSource } from '.'

import { defineInvoke } from '@moeru/eventa'

import { screenCaptureCheckMacOSPermission, screenCaptureGetDiagnostics, screenCaptureGetSources, screenCaptureReportSessionState, screenCaptureRequestMacOSPermission, screenCaptureResetSource, screenCaptureSetSourceEx } from '.'

export interface SourceOptionsWithRequest {
  sourcesOptions?: SourcesOptions
  request?: Omit<ScreenCaptureSetSourceRequest, 'options' | 'sourceId'>
}

export interface BoundElectronScreenCaptureApi {
  getSources: () => Promise<SerializableDesktopCapturerSource[]>
  getDiagnostics: () => Promise<ScreenCaptureDiagnosticsSnapshot>
  setSource: (sourceId: string, request?: Omit<ScreenCaptureSetSourceRequest, 'options' | 'sourceId'>) => Promise<string>
  selectWithSource: <R>(
    selectFn: (sources: SerializableDesktopCapturerSource[]) => string | Promise<string>,
    useFn: () => R | Promise<R>,
    request?: Omit<ScreenCaptureSetSourceRequest, 'options' | 'sourceId'>,
  ) => Promise<R>
  resetSource: (mutexHandle: string) => Promise<void>
  reportSessionState: (state: ScreenCaptureSessionStateSnapshot) => Promise<void>
  checkMacOSPermission: () => Promise<ReturnType<typeof systemPreferences.getMediaAccessStatus>>
  requestMacOSPermission: () => Promise<void>
}

function resolveSourcesOptions(sourcesOptions: SourcesOptions | (() => SourcesOptions)) {
  return typeof sourcesOptions === 'function'
    ? sourcesOptions()
    : sourcesOptions
}

function resolveRequestSourcesOptions(options?: SourceOptionsWithRequest): SourcesOptions {
  return options?.sourcesOptions ?? { types: ['screen'] }
}

export function setupElectronScreenCapture(context: ReturnType<typeof createContext>['context']) {
  const invokeGetSources = defineInvoke(context, screenCaptureGetSources)
  const getDiagnostics = defineInvoke(context, screenCaptureGetDiagnostics)
  const setSource = defineInvoke(context, screenCaptureSetSourceEx)
  const resetSource = defineInvoke(context, screenCaptureResetSource)
  const reportSessionState = defineInvoke(context, screenCaptureReportSessionState)

  const checkMacOSPermission = defineInvoke(context, screenCaptureCheckMacOSPermission)
  const requestMacOSPermission = defineInvoke(context, screenCaptureRequestMacOSPermission)

  async function getSources(sourcesOptions: SourcesOptions) {
    return invokeGetSources(sourcesOptions)
  }

  async function selectWithSource<R>(
    selectFn: (sources: SerializableDesktopCapturerSource[]) => string | Promise<string>,
    useFn: () => R | Promise<R>,
    options?: SourceOptionsWithRequest,
  ): Promise<R> {
    const resolvedSourcesOptions = resolveRequestSourcesOptions(options)
    const sources = await getSources(resolvedSourcesOptions)
    const sourceId = await selectFn(sources)

    let handle: string | undefined
    try {
      handle = await setSource({
        options: resolvedSourcesOptions,
        sourceId,
        timeout: options?.request?.timeout,
      })
      return await useFn()
    }
    finally {
      if (handle) {
        await resetSource(handle)
      }
    }
  }

  return {
    bind(sourcesOptions: SourcesOptions | (() => SourcesOptions)): BoundElectronScreenCaptureApi {
      return {
        getSources: async () => getSources(resolveSourcesOptions(sourcesOptions)),
        getDiagnostics,
        setSource: async (sourceId, request) => await setSource({
          options: resolveSourcesOptions(sourcesOptions),
          sourceId,
          timeout: request?.timeout,
        }),
        selectWithSource: async (selectFn, useFn, request) => {
          return await selectWithSource(
            selectFn,
            useFn,
            {
              request,
              sourcesOptions: resolveSourcesOptions(sourcesOptions),
            },
          )
        },
        resetSource,
        reportSessionState: async state => await reportSessionState({
          state,
          updatedAt: Date.now(),
        }),
        checkMacOSPermission,
        requestMacOSPermission,
      }
    },
    getDiagnostics,
    getSources,
    setSource,
    selectWithSource,
    resetSource,
    reportSessionState: async state => await reportSessionState({
      state,
      updatedAt: Date.now(),
    }),
    checkMacOSPermission,
    requestMacOSPermission,
  }
}
