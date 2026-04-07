import type { SourcesOptions } from 'electron'

import type {
  ScreenCaptureDiagnosticsSnapshot,
  ScreenCaptureGetSourcesDiagnosticsSnapshot,
  ScreenCaptureLeaseDiagnosticsSnapshot,
  ScreenCaptureLeaseReleaseReason,
  ScreenCapturePermissionStatus,
  ScreenCaptureRendererDiagnosticsSnapshot,
  ScreenCaptureReportSessionStateRequest,
} from '..'

interface ScreenCaptureDiagnosticsWindowIdentity {
  windowId: number
  windowTitle: string
}

interface ScreenCaptureWindowDiagnosticsState {
  updatedAt: number
  windowTitle: string
  renderer: ScreenCaptureRendererDiagnosticsSnapshot
  getSources: ScreenCaptureGetSourcesDiagnosticsSnapshot
}

interface ScreenCaptureDiagnosticsStoreOptions {
  now?: () => number
}

function cloneSourcesOptions(options: SourcesOptions | null | undefined): SourcesOptions | null {
  if (!options)
    return null

  return {
    ...options,
    types: [...options.types],
    thumbnailSize: options.thumbnailSize
      ? {
          width: options.thumbnailSize.width,
          height: options.thumbnailSize.height,
        }
      : undefined,
  }
}

function cloneLeaseDiagnostics(lease: ScreenCaptureLeaseDiagnosticsSnapshot): ScreenCaptureLeaseDiagnosticsSnapshot {
  return {
    ...lease,
    options: cloneSourcesOptions(lease.options),
  }
}

function createDefaultWindowState(windowTitle: string, updatedAt: number): ScreenCaptureWindowDiagnosticsState {
  return {
    updatedAt,
    windowTitle,
    renderer: {
      updatedAt: null,
      sessionState: null,
    },
    getSources: {
      inFlight: false,
      requestedAt: null,
      completedAt: null,
      durationMs: null,
      options: null,
      sourceCount: null,
      error: null,
    },
  }
}

export function createScreenCaptureDiagnosticsStore(options: ScreenCaptureDiagnosticsStoreOptions = {}) {
  const now = options.now ?? (() => Date.now())
  const windows = new Map<number, ScreenCaptureWindowDiagnosticsState>()
  let lease: ScreenCaptureLeaseDiagnosticsSnapshot = {
    status: 'idle',
    handle: null,
    sourceId: null,
    ownerWindowId: null,
    ownerWebContentsId: null,
    acquiredAt: null,
    expiresAt: null,
    timeoutMs: null,
    options: null,
    releasedAt: null,
    releaseReason: null,
  }

  function ensureWindowState(identity: ScreenCaptureDiagnosticsWindowIdentity, updatedAt = now()) {
    const existing = windows.get(identity.windowId)
    if (existing) {
      existing.updatedAt = updatedAt
      existing.windowTitle = identity.windowTitle
      return existing
    }

    const created = createDefaultWindowState(identity.windowTitle, updatedAt)
    windows.set(identity.windowId, created)
    return created
  }

  function noteGetSourcesStarted(identity: ScreenCaptureDiagnosticsWindowIdentity, sourcesOptions: SourcesOptions, updatedAt = now()) {
    const state = ensureWindowState(identity, updatedAt)
    state.getSources = {
      ...state.getSources,
      inFlight: true,
      requestedAt: updatedAt,
      options: cloneSourcesOptions(sourcesOptions),
      error: null,
    }
  }

  function noteGetSourcesCompleted(identity: ScreenCaptureDiagnosticsWindowIdentity, input: {
    error?: string | null
    sourceCount?: number | null
    updatedAt?: number
  }) {
    const updatedAt = input.updatedAt ?? now()
    const state = ensureWindowState(identity, updatedAt)
    const requestedAt = state.getSources.requestedAt

    state.getSources = {
      ...state.getSources,
      inFlight: false,
      completedAt: updatedAt,
      durationMs: requestedAt == null ? null : Math.max(0, updatedAt - requestedAt),
      sourceCount: input.sourceCount ?? null,
      error: input.error ?? null,
    }
  }

  function noteRendererSessionState(identity: ScreenCaptureDiagnosticsWindowIdentity, request: ScreenCaptureReportSessionStateRequest) {
    const updatedAt = request.updatedAt ?? now()
    const state = ensureWindowState(identity, updatedAt)
    state.renderer = {
      updatedAt,
      sessionState: {
        ...request.state,
      },
    }
  }

  function noteLeaseAcquired(identity: ScreenCaptureDiagnosticsWindowIdentity, input: {
    handle: string
    ownerWebContentsId: number
    sourceId: string
    sourcesOptions: SourcesOptions
    timeoutMs: number
    updatedAt?: number
  }) {
    const updatedAt = input.updatedAt ?? now()
    ensureWindowState(identity, updatedAt)
    lease = {
      status: 'leased',
      handle: input.handle,
      sourceId: input.sourceId,
      ownerWindowId: identity.windowId,
      ownerWebContentsId: input.ownerWebContentsId,
      acquiredAt: updatedAt,
      expiresAt: updatedAt + input.timeoutMs,
      timeoutMs: input.timeoutMs,
      options: cloneSourcesOptions(input.sourcesOptions),
      releasedAt: null,
      releaseReason: null,
    }
  }

  function noteLeaseReleased(input: {
    handle?: string | null
    reason: ScreenCaptureLeaseReleaseReason
    updatedAt?: number
  }) {
    if (lease.status !== 'leased')
      return
    if (input.handle && lease.handle !== input.handle)
      return

    lease = {
      ...lease,
      status: 'idle',
      releasedAt: input.updatedAt ?? now(),
      releaseReason: input.reason,
    }
  }

  function forgetWindow(identity: ScreenCaptureDiagnosticsWindowIdentity, updatedAt = now()) {
    const ownedActiveLease = lease.status === 'leased' && lease.ownerWindowId === identity.windowId
    windows.delete(identity.windowId)
    if (ownedActiveLease) {
      noteLeaseReleased({
        reason: 'window-closed',
        updatedAt,
      })
    }
  }

  function getSnapshot(identity: ScreenCaptureDiagnosticsWindowIdentity, permissionStatus: ScreenCapturePermissionStatus): ScreenCaptureDiagnosticsSnapshot {
    const state = ensureWindowState(identity)
    return {
      updatedAt: Math.max(
        state.updatedAt,
        state.renderer.updatedAt ?? 0,
        state.getSources.completedAt ?? 0,
        state.getSources.requestedAt ?? 0,
        lease.acquiredAt ?? 0,
        lease.releasedAt ?? 0,
      ),
      window: {
        id: identity.windowId,
        title: state.windowTitle,
      },
      permissionStatus,
      renderer: {
        updatedAt: state.renderer.updatedAt,
        sessionState: state.renderer.sessionState ? { ...state.renderer.sessionState } : null,
      },
      main: {
        getSources: {
          ...state.getSources,
          options: cloneSourcesOptions(state.getSources.options),
        },
        lease: cloneLeaseDiagnostics(lease),
      },
    }
  }

  return {
    forgetWindow,
    getLeaseOwnerWindowId: () => lease.ownerWindowId,
    getSnapshot,
    noteGetSourcesCompleted,
    noteGetSourcesStarted,
    noteLeaseAcquired,
    noteLeaseReleased,
    noteRendererSessionState,
  }
}
