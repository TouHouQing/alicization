import type { ScreenCaptureReportSessionStateRequest } from '..'

import { describe, expect, it } from 'vitest'

import { createScreenCaptureDiagnosticsStore } from './diagnostics-store'

describe('createScreenCaptureDiagnosticsStore', () => {
  it('merges renderer state, source probes, and lease state into one snapshot', () => {
    let now = 1_000
    const store = createScreenCaptureDiagnosticsStore({
      now: () => now,
    })
    const identity = {
      windowId: 7,
      windowTitle: 'Screen Capture Devtools',
    }

    store.noteGetSourcesStarted(identity, {
      types: ['screen', 'window'],
      fetchWindowIcons: true,
    })

    now = 1_150
    store.noteGetSourcesCompleted(identity, {
      sourceCount: 4,
    })

    now = 1_225
    const report: ScreenCaptureReportSessionStateRequest = {
      state: {
        phase: 'active',
        reason: 'selected-source',
        selectedSourceId: 'screen:1',
        currentSourceId: 'screen:1',
        sourcePreference: 'manual',
        lastUsedAt: 1_220,
        lastError: null,
      },
    }
    store.noteRendererSessionState(identity, report)

    now = 1_300
    store.noteLeaseAcquired(identity, {
      handle: 'lease-1',
      ownerWebContentsId: 42,
      sourceId: 'screen:1',
      sourcesOptions: {
        types: ['screen', 'window'],
      },
      timeoutMs: 5_000,
    })

    now = 1_350
    let snapshot = store.getSnapshot(identity, 'granted')

    expect(snapshot.window).toEqual({
      id: 7,
      title: 'Screen Capture Devtools',
    })
    expect(snapshot.permissionStatus).toBe('granted')
    expect(snapshot.renderer.sessionState).toMatchObject({
      phase: 'active',
      currentSourceId: 'screen:1',
      sourcePreference: 'manual',
    })
    expect(snapshot.main.getSources).toMatchObject({
      inFlight: false,
      requestedAt: 1_000,
      completedAt: 1_150,
      durationMs: 150,
      sourceCount: 4,
      error: null,
      options: {
        types: ['screen', 'window'],
        fetchWindowIcons: true,
      },
    })
    expect(snapshot.main.lease).toMatchObject({
      status: 'leased',
      handle: 'lease-1',
      sourceId: 'screen:1',
      ownerWindowId: 7,
      ownerWebContentsId: 42,
      acquiredAt: 1_300,
      expiresAt: 6_300,
      timeoutMs: 5_000,
      releasedAt: null,
      releaseReason: null,
    })

    now = 1_500
    store.noteLeaseReleased({
      handle: 'lease-1',
      reason: 'manual-reset',
    })

    snapshot = store.getSnapshot(identity, 'granted')
    expect(snapshot.main.lease).toMatchObject({
      status: 'idle',
      handle: 'lease-1',
      releasedAt: 1_500,
      releaseReason: 'manual-reset',
    })
  })
})
