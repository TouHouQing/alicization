import type { DesktopCapturerSource } from 'electron'

import type { DesktopCaptureAccessRequest } from './desktop-capture-runtime'

import { describe, expect, it, vi } from 'vitest'

import { createDesktopCaptureAccessRuntime } from './desktop-capture-runtime'

function createRequest(overrides: Partial<DesktopCaptureAccessRequest> = {}): DesktopCaptureAccessRequest {
  return {
    types: ['window', 'screen'],
    thumbnailSize: {
      width: 640,
      height: 360,
    },
    ...overrides,
  }
}

function createSource(id: string, name: string): DesktopCapturerSource {
  return {
    id,
    name,
    appIcon: null,
    display_id: '',
    thumbnail: null as never,
  } as unknown as DesktopCapturerSource
}

describe('desktop capture access runtime', () => {
  it('reuses a short-lived access probe cache for identical requests', async () => {
    let now = 1_000
    const getSources = vi.fn(async (_options: unknown) => [createSource('screen:1', 'Entire Screen')])

    const runtime = createDesktopCaptureAccessRuntime({
      cacheTtlMs: 1_500,
      getNow: () => now,
      getScreenPermissionStatus: () => 'granted',
      getSources,
    })

    const first = await runtime.resolveAccess(createRequest())
    const second = await runtime.resolveAccess(createRequest())

    expect(first.sources).toHaveLength(1)
    expect(second.sources).toHaveLength(1)
    expect(getSources).toBeCalledTimes(1)

    now += 1_600
    await runtime.resolveAccess(createRequest())

    expect(getSources).toBeCalledTimes(2)
  })

  it('retries with narrower probe plans and records recovery metadata', async () => {
    const getSources = vi
      .fn()
      .mockRejectedValueOnce(new Error('desktop capture failed'))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createSource('screen:2', 'Screen 2')])

    const runtime = createDesktopCaptureAccessRuntime({
      getScreenPermissionStatus: () => 'granted',
      getSources,
    })

    const result = await runtime.resolveAccess(createRequest())

    expect(result.sources).toHaveLength(1)
    expect(result.recoveredFromRetry).toBe(true)
    expect(result.probeStrategy).toBe('retry-window-only')
    expect(result.probeAttempts).toEqual([
      expect.objectContaining({
        label: 'primary',
        error: 'desktop capture failed',
      }),
      expect.objectContaining({
        label: 'retry-screen-only',
        sourceCount: 0,
      }),
      expect.objectContaining({
        label: 'retry-window-only',
        sourceCount: 1,
      }),
    ])
  })

  it('surfaces permission denial when no sources are available', async () => {
    const runtime = createDesktopCaptureAccessRuntime({
      getScreenPermissionStatus: () => 'denied',
      getSources: vi.fn(async (_options: unknown) => []),
    })

    const result = await runtime.resolveAccess(createRequest({
      types: ['screen'],
    }))

    expect(result.sources).toEqual([])
    expect(result.unavailableReason).toBe('screen-capture-permission-denied')
  })
})
