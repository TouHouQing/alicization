import type { SerializableDesktopCapturerSource } from '.'
import type { BoundScreenCaptureApi } from './session'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createScreenCaptureSession } from './session'

function createSource(id: string, name: string): SerializableDesktopCapturerSource {
  return {
    id,
    name,
    display_id: '',
  }
}

function createTrack() {
  let endedListener: (() => void) | undefined
  let readyState: 'live' | 'ended' = 'live'

  return {
    addEventListener: vi.fn((_type: 'ended', listener: () => void) => {
      endedListener = listener
    }),
    get readyState() {
      return readyState
    },
    removeEventListener: vi.fn((_type: 'ended', listener: () => void) => {
      if (endedListener === listener)
        endedListener = undefined
    }),
    stop: vi.fn(() => {
      readyState = 'ended'
      endedListener?.()
    }),
  }
}

function createStream() {
  const tracks = [createTrack()]

  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter(track => track.readyState === 'live'),
    removeTrack: vi.fn(),
    tracks,
  }
}

function createStorage(initialEntries: Record<string, string> = {}) {
  const values = new Map(Object.entries(initialEntries))

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key)
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value)
    }),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('createScreenCaptureSession', () => {
  it('reuses the active stream and releases it after the idle timeout', async () => {
    vi.useFakeTimers()

    const stream = createStream()
    const getDisplayMedia = vi.fn(async () => stream)
    const sources = [createSource('screen:1', 'Entire Screen')]
    let selectWithSourceCalls = 0

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia,
      },
    })

    const api: BoundScreenCaptureApi = {
      getSources: async () => sources,
      selectWithSource: async <R>(selectFn: (availableSources: SerializableDesktopCapturerSource[]) => string | Promise<string>, useFn: () => R | Promise<R>) => {
        selectWithSourceCalls += 1
        expect(await selectFn(sources)).toBe('screen:1')
        return await useFn()
      },
    }

    const session = createScreenCaptureSession(api, {
      idleCheckIntervalMs: 1_000,
      idleTimeoutMs: 5_000,
    })

    const firstStream = await session.acquireStream({
      allowPrompt: false,
      mediaStreamOptions: { video: true },
    })
    const secondStream = await session.acquireStream({
      allowPrompt: false,
      mediaStreamOptions: { video: true },
    })

    expect(firstStream).toBe(stream)
    expect(secondStream).toBe(stream)
    expect(selectWithSourceCalls).toBe(1)
    expect(getDisplayMedia).toHaveBeenCalledTimes(1)
    expect(session.getState()).toMatchObject({
      phase: 'active',
      reason: 'reuse',
      currentSourceId: 'screen:1',
    })

    await vi.advanceTimersByTimeAsync(5_000)

    expect(stream.tracks[0].stop).toHaveBeenCalledTimes(1)
    expect(session.getCurrentStream()).toBeNull()
    expect(session.getState()).toMatchObject({
      phase: 'idle',
      reason: 'idle-timeout',
      currentSourceId: null,
    })
  })

  it('falls back to prompt mode when selected-source capture fails and prompting is allowed', async () => {
    const promptStream = createStream()
    const getDisplayMedia = vi.fn(async () => promptStream)
    const storage = createStorage({
      'capture/source': 'screen:1',
    })
    const sources = [createSource('screen:1', 'Entire Screen')]
    let selectWithSourceCalls = 0

    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia,
      },
    })

    const api: BoundScreenCaptureApi = {
      getSources: async () => sources,
      selectWithSource: async () => {
        selectWithSourceCalls += 1
        throw new Error('Selected source became unavailable')
      },
    }

    const session = createScreenCaptureSession(api, {
      selectedSourceStorageKey: 'capture/source',
    })

    const stream = await session.acquireStream({
      allowPrompt: true,
      mediaStreamOptions: { video: true },
    })

    expect(stream).toBe(promptStream)
    expect(selectWithSourceCalls).toBe(1)
    expect(getDisplayMedia).toHaveBeenCalledTimes(1)
    expect(storage.getItem).toHaveBeenCalledWith('capture/source')
    expect(session.getState()).toMatchObject({
      phase: 'active',
      reason: 'prompt',
      sourcePreference: 'prompt',
      currentSourceId: null,
    })
  })

  it('publishes explicit session state transitions during capture fallback', async () => {
    const promptStream = createStream()
    const getDisplayMedia = vi.fn(async () => promptStream)
    const storage = createStorage({
      'capture/source': 'screen:1',
    })
    const sources = [createSource('screen:1', 'Entire Screen')]
    const phases: string[] = []

    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia,
      },
    })

    const api: BoundScreenCaptureApi = {
      getSources: async () => sources,
      selectWithSource: async () => {
        throw new Error('Selected source became unavailable')
      },
    }

    const session = createScreenCaptureSession(api, {
      selectedSourceStorageKey: 'capture/source',
    })

    const stopWatching = session.onStateChange((state) => {
      phases.push(`${state.phase}:${state.reason}`)
    })

    await session.acquireStream({
      allowPrompt: true,
      mediaStreamOptions: { video: true },
    })
    stopWatching()

    expect(phases).toContain('capturing-selected-source:stored-selection')
    expect(phases).toContain('error:selected-source-failed')
    expect(phases).toContain('prompting:prompt')
    expect(phases.at(-1)).toBe('active:prompt')
  })

  it('reports session state snapshots through the bound api when available', async () => {
    const promptStream = createStream()
    const getDisplayMedia = vi.fn(async () => promptStream)
    const reportSessionState = vi.fn(async () => undefined)

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia,
      },
    })

    const api: BoundScreenCaptureApi = {
      getSources: async () => [],
      reportSessionState,
      selectWithSource: async () => {
        throw new Error('selected source unavailable')
      },
    }

    const session = createScreenCaptureSession(api)
    await vi.waitFor(() => {
      expect(reportSessionState).toHaveBeenCalledWith(expect.objectContaining({
        phase: 'idle',
        reason: 'initial',
      }))
    })

    await session.acquireStream({
      allowPrompt: true,
      mediaStreamOptions: { video: true },
    })

    await vi.waitFor(() => {
      expect(reportSessionState).toHaveBeenLastCalledWith(expect.objectContaining({
        phase: 'active',
        reason: 'prompt',
        sourcePreference: 'prompt',
      }))
    })
  })
})
