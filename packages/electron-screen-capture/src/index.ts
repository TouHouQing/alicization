import type { DesktopCapturerSource, SourcesOptions, systemPreferences } from 'electron'

import type { ScreenCaptureSessionStateSnapshot } from './session'

import { defineInvokeEventa } from '@moeru/eventa'

export interface SerializableDesktopCapturerSource extends Pick<DesktopCapturerSource, 'id' | 'name' | 'display_id'> {
  appIcon?: Uint8Array
  thumbnail?: Uint8Array
}

export interface ScreenCaptureSetSourceRequest {
  options: SourcesOptions
  sourceId: string
  /**
   * Timeout in milliseconds to release the setSourceMutex.
   *
   * @default 5000
   */
  timeout?: number
}

export type ScreenCapturePermissionStatus = ReturnType<typeof systemPreferences.getMediaAccessStatus> | 'granted' | 'unknown'

export interface ScreenCaptureReportSessionStateRequest {
  state: ScreenCaptureSessionStateSnapshot
  updatedAt?: number
}

export interface ScreenCaptureGetSourcesDiagnosticsSnapshot {
  inFlight: boolean
  requestedAt: number | null
  completedAt: number | null
  durationMs: number | null
  options: SourcesOptions | null
  sourceCount: number | null
  error: string | null
}

export type ScreenCaptureLeaseReleaseReason
  = | 'manual-reset'
    | 'timeout'
    | 'window-closed'
    | 'set-source-error'

export interface ScreenCaptureLeaseDiagnosticsSnapshot {
  status: 'idle' | 'leased'
  handle: string | null
  sourceId: string | null
  ownerWindowId: number | null
  ownerWebContentsId: number | null
  acquiredAt: number | null
  expiresAt: number | null
  timeoutMs: number | null
  options: SourcesOptions | null
  releasedAt: number | null
  releaseReason: ScreenCaptureLeaseReleaseReason | null
}

export interface ScreenCaptureRendererDiagnosticsSnapshot {
  updatedAt: number | null
  sessionState: ScreenCaptureSessionStateSnapshot | null
}

export interface ScreenCaptureDiagnosticsSnapshot {
  updatedAt: number
  window: {
    id: number
    title: string
  }
  permissionStatus: ScreenCapturePermissionStatus
  renderer: ScreenCaptureRendererDiagnosticsSnapshot
  main: {
    getSources: ScreenCaptureGetSourcesDiagnosticsSnapshot
    lease: ScreenCaptureLeaseDiagnosticsSnapshot
  }
}

export const screenCaptureGetSources = defineInvokeEventa<SerializableDesktopCapturerSource[], SourcesOptions>('eventa:invoke:electron:screen-capture:get-sources')
export const screenCaptureSetSourceEx = defineInvokeEventa<string, ScreenCaptureSetSourceRequest>('eventa:invoke:electron:screen-capture:set-source')
export const screenCaptureResetSource = defineInvokeEventa<void, string>('eventa:invoke:electron:screen-capture:reset-source')
export const screenCaptureReportSessionState = defineInvokeEventa<void, ScreenCaptureReportSessionStateRequest>('eventa:invoke:electron:screen-capture:report-session-state')
export const screenCaptureGetDiagnostics = defineInvokeEventa<ScreenCaptureDiagnosticsSnapshot>('eventa:invoke:electron:screen-capture:get-diagnostics')

export const screenCaptureCheckMacOSPermission = defineInvokeEventa<ReturnType<typeof systemPreferences.getMediaAccessStatus>, never>('eventa:invoke:electron:screen-capture:check-macos-permission')
export const screenCaptureRequestMacOSPermission = defineInvokeEventa<void, never>('eventa:invoke:electron:screen-capture:request-macos-permission')

export const screenCapture = {
  getSources: screenCaptureGetSources,
  setSource: screenCaptureSetSourceEx,
  resetSource: screenCaptureResetSource,
  reportSessionState: screenCaptureReportSessionState,
  getDiagnostics: screenCaptureGetDiagnostics,
  checkMacOSPermission: screenCaptureCheckMacOSPermission,
  requestMacOSPermission: screenCaptureRequestMacOSPermission,
}

export type { ScreenCaptureSessionStateSnapshot } from './session'

export {
  choosePreferredScreenCaptureSource,
  classifyScreenCaptureSourceKind,
  sortScreenCaptureSources,
} from './source-policy'

export type {
  ScreenCaptureSourceIdentity,
  ScreenCaptureSourceKind,
  SortScreenCaptureSourcesOptions,
} from './source-policy'
