import type { ScreenCaptureDiagnosticsSnapshot, ScreenCaptureSetSourceRequest, SerializableDesktopCapturerSource } from '.'
import type { SortScreenCaptureSourcesOptions } from './source-policy'

import { choosePreferredScreenCaptureSource } from './source-policy'

export interface BoundScreenCaptureApi {
  getSources: () => Promise<SerializableDesktopCapturerSource[]>
  getDiagnostics?: () => Promise<ScreenCaptureDiagnosticsSnapshot>
  reportSessionState?: (state: ScreenCaptureSessionStateSnapshot) => Promise<void>
  selectWithSource: <R>(
    selectFn: (sources: SerializableDesktopCapturerSource[]) => string | Promise<string>,
    useFn: () => R | Promise<R>,
    request?: Omit<ScreenCaptureSetSourceRequest, 'options' | 'sourceId'>,
  ) => Promise<R>
}

export interface CaptureFrameResult {
  dataUrl: string
  height: number
  width: number
}

export interface CreateScreenCaptureSessionOptions {
  idleCheckIntervalMs?: number
  idleTimeoutMs?: number
  selectedSourceStorageKey?: string
  sourceSelection?: SortScreenCaptureSourcesOptions
}

export interface ScreenCaptureMediaTrackLike {
  addEventListener: (type: 'ended', listener: () => void) => void
  readyState?: string
  removeEventListener: (type: 'ended', listener: () => void) => void
  stop: () => void
}

export interface ScreenCaptureMediaStreamLike {
  getTracks: () => ScreenCaptureMediaTrackLike[]
  getVideoTracks: () => ScreenCaptureMediaTrackLike[]
  removeTrack: (track: ScreenCaptureMediaTrackLike) => void
}

interface ScreenCaptureStorageLike {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
}

interface ScreenCaptureVideoElementLike {
  addEventListener: (type: 'loadeddata', listener: () => void, options?: { once?: boolean }) => void
  autoplay: boolean
  muted: boolean
  play: () => Promise<void>
  playsInline: boolean
  readyState: number
  remove: () => void
  srcObject: unknown
  videoHeight: number
  videoWidth: number
}

interface ScreenCaptureCanvasRenderingContextLike {
  drawImage: (source: unknown, dx: number, dy: number, dw: number, dh: number) => void
}

interface ScreenCaptureCanvasElementLike {
  getContext: (kind: '2d') => ScreenCaptureCanvasRenderingContextLike | null
  height: number
  toDataURL: (type: string, quality?: number) => string
  width: number
}

interface ScreenCaptureDocumentLike {
  createElement: ((tag: 'canvas') => ScreenCaptureCanvasElementLike) & ((tag: 'video') => ScreenCaptureVideoElementLike)
}

export interface ScreenCaptureDisplayMediaOptions {
  audio?: boolean | Record<string, unknown>
  video?: boolean | Record<string, unknown>
}

export interface ScreenCaptureAcquireOptions {
  allowPrompt?: boolean
  mediaStreamOptions?: ScreenCaptureDisplayMediaOptions
  timeoutMs?: number
}

export type ScreenCaptureSessionPhase
  = | 'idle'
    | 'selecting-source'
    | 'capturing-selected-source'
    | 'prompting'
    | 'active'
    | 'error'

export type ScreenCaptureSessionReason
  = | 'initial'
    | 'manual-select'
    | 'stored-selection'
    | 'preferred-selection'
    | 'reuse'
    | 'selected-source'
    | 'selected-source-failed'
    | 'prompt'
    | 'prompt-required'
    | 'prompt-failed'
    | 'track-ended'
    | 'idle-timeout'
    | 'manual-stop'
    | 'dispose'

export interface ScreenCaptureSessionStateSnapshot {
  phase: ScreenCaptureSessionPhase
  reason: ScreenCaptureSessionReason
  selectedSourceId: string | null
  currentSourceId: string | null
  sourcePreference: 'manual' | 'stored' | 'preferred' | 'prompt' | null
  lastUsedAt: number | null
  lastError: string | null
}

type ScreenCaptureSessionStateListener = (state: ScreenCaptureSessionStateSnapshot) => void

const defaultSourceSelection: SortScreenCaptureSourcesOptions = {
  preferredKinds: ['display', 'window', 'device'],
  preferredNameKeywords: ['entire', 'screen', 'display'],
}

function readStoredSourceId(storageKey?: string) {
  const storage = getStorage()
  if (!storageKey || !storage)
    return null

  try {
    return storage.getItem(storageKey)?.trim() || null
  }
  catch {
    return null
  }
}

function writeStoredSourceId(storageKey: string | undefined, sourceId: string | null) {
  const storage = getStorage()
  if (!storageKey || !storage)
    return

  try {
    if (sourceId)
      storage.setItem(storageKey, sourceId)
    else
      storage.removeItem(storageKey)
  }
  catch {
    // NOTICE: Capture source persistence is best-effort and must not block capture flow.
  }
}

function getTrackState(track: ScreenCaptureMediaTrackLike) {
  return typeof track.readyState === 'string' ? track.readyState : 'ended'
}

function isStreamUsable(stream: ScreenCaptureMediaStreamLike | null | undefined) {
  if (!stream)
    return false

  const videoTracks = stream.getVideoTracks()
  if (videoTracks.length === 0)
    return false

  return videoTracks.some(track => getTrackState(track) === 'live')
}

function stopStreamTracks(stream: ScreenCaptureMediaStreamLike | null | undefined) {
  if (!stream)
    return

  stream.getTracks().forEach((track) => {
    try {
      track.stop()
    }
    catch {
      // NOTICE: Track teardown failures should not keep the session alive.
    }
  })
}

function getStorage() {
  return (globalThis as {
    localStorage?: ScreenCaptureStorageLike
  }).localStorage
}

function getMediaDevices() {
  return (globalThis as unknown as {
    navigator?: {
      mediaDevices?: {
        getDisplayMedia: (options?: ScreenCaptureDisplayMediaOptions) => Promise<ScreenCaptureMediaStreamLike>
      }
    }
  }).navigator?.mediaDevices
}

function getDocument() {
  const documentObject = (globalThis as {
    document?: ScreenCaptureDocumentLike
  }).document
  if (!documentObject)
    throw new Error('document is unavailable')

  return documentObject
}

function createVideoElement(stream: ScreenCaptureMediaStreamLike) {
  const video = getDocument().createElement('video')
  video.autoplay = true
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  return video
}

function normalizeCaptureDimension(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value))
    return fallback
  return Math.max(1, Math.round(value ?? fallback))
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

export function createScreenCaptureSession(
  api: BoundScreenCaptureApi,
  options: CreateScreenCaptureSessionOptions = {},
) {
  const idleTimeoutMs = Math.max(5_000, Math.round(options.idleTimeoutMs ?? 300_000))
  const idleCheckIntervalMs = Math.max(1_000, Math.round(options.idleCheckIntervalMs ?? 60_000))
  const sourceSelection = options.sourceSelection ?? defaultSourceSelection
  let selectedSourceId = readStoredSourceId(options.selectedSourceStorageKey)
  let currentStream: ScreenCaptureMediaStreamLike | null = null
  let currentSourceId: string | null = null
  let lastUsedAt: number | null = null
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  let streamEndCleanup: (() => void) | undefined
  const stateListeners = new Set<ScreenCaptureSessionStateListener>()
  let pendingStateReport = Promise.resolve()
  let state: ScreenCaptureSessionStateSnapshot = {
    phase: 'idle',
    reason: 'initial',
    selectedSourceId,
    currentSourceId,
    sourcePreference: selectedSourceId ? 'stored' : null,
    lastUsedAt,
    lastError: null,
  }

  function emitState() {
    const snapshot = { ...state }
    for (const listener of stateListeners)
      listener(snapshot)
  }

  function queueStateReport(snapshot: ScreenCaptureSessionStateSnapshot) {
    if (!api.reportSessionState)
      return

    pendingStateReport = pendingStateReport
      .catch(() => undefined)
      .then(async () => await api.reportSessionState?.({ ...snapshot }))
      .catch(() => undefined)
  }

  function setState(
    patch: Partial<ScreenCaptureSessionStateSnapshot>,
    options: { emit?: boolean } = {},
  ) {
    state = {
      ...state,
      ...patch,
    }
    queueStateReport(state)
    if (options.emit !== false)
      emitState()
  }

  function clearIdleTimer() {
    if (!idleTimer)
      return

    clearTimeout(idleTimer)
    idleTimer = undefined
  }

  function clearStreamEndCleanup() {
    streamEndCleanup?.()
    streamEndCleanup = undefined
  }

  function clearActiveStream(reason: ScreenCaptureSessionReason = 'manual-stop') {
    clearStreamEndCleanup()
    currentStream = null
    currentSourceId = null
    lastUsedAt = null
    clearIdleTimer()
    setState({
      phase: 'idle',
      reason,
      currentSourceId: null,
      lastUsedAt: null,
    })
  }

  function scheduleIdleCheck() {
    clearIdleTimer()
    if (!currentStream || lastUsedAt == null)
      return

    idleTimer = setTimeout(() => {
      if (!currentStream || lastUsedAt == null)
        return

      const idleAgeMs = Date.now() - lastUsedAt
      if (idleAgeMs >= idleTimeoutMs) {
        stop('idle-timeout')
        return
      }

      scheduleIdleCheck()
    }, Math.min(idleCheckIntervalMs, idleTimeoutMs))
  }

  function touch() {
    if (!currentStream)
      return

    lastUsedAt = Date.now()
    setState({
      phase: 'active',
      reason: state.reason === 'prompt' ? 'prompt' : state.reason === 'selected-source' ? 'selected-source' : 'reuse',
      lastUsedAt,
    })
    scheduleIdleCheck()
  }

  function bindCurrentStream(stream: ScreenCaptureMediaStreamLike, metadata: {
    reason: 'prompt' | 'selected-source'
    sourceId: string | null
    sourcePreference: 'manual' | 'stored' | 'preferred' | 'prompt'
  }) {
    clearStreamEndCleanup()
    currentStream = stream
    currentSourceId = metadata.sourceId
    touch()
    setState({
      phase: 'active',
      reason: metadata.reason,
      currentSourceId,
      selectedSourceId,
      sourcePreference: metadata.sourcePreference,
      lastError: null,
    })

    const tracks = stream.getTracks()
    const handleTrackEnded = () => {
      if (currentStream !== stream)
        return

      if (!isStreamUsable(stream))
        clearActiveStream('track-ended')
    }

    tracks.forEach(track => track.addEventListener('ended', handleTrackEnded))
    streamEndCleanup = () => {
      tracks.forEach(track => track.removeEventListener('ended', handleTrackEnded))
    }
  }

  async function listSources() {
    return await api.getSources()
  }

  async function resolveSelectedSourceId() {
    const sources = await listSources()
    const existingSource = selectedSourceId
      ? sources.find(source => source.id === selectedSourceId) ?? null
      : null
    if (existingSource) {
      setState({
        selectedSourceId: existingSource.id,
        sourcePreference: state.sourcePreference === 'manual' ? 'manual' : 'stored',
        reason: state.sourcePreference === 'manual' ? 'manual-select' : 'stored-selection',
      })
      return {
        reason: state.sourcePreference === 'manual' ? 'manual-select' : 'stored-selection',
        sourceId: existingSource.id,
        sourcePreference: state.sourcePreference === 'manual' ? 'manual' : 'stored',
      } as const
    }

    const fallbackSource = choosePreferredScreenCaptureSource(sources, sourceSelection)
    if (!fallbackSource) {
      selectedSourceId = null
      writeStoredSourceId(options.selectedSourceStorageKey, null)
      setState({
        selectedSourceId: null,
        sourcePreference: null,
      })
      return null
    }

    selectedSourceId = fallbackSource.id
    writeStoredSourceId(options.selectedSourceStorageKey, fallbackSource.id)
    setState({
      selectedSourceId,
      sourcePreference: 'preferred',
      reason: 'preferred-selection',
    })
    return {
      reason: 'preferred-selection',
      sourceId: fallbackSource.id,
      sourcePreference: 'preferred',
    } as const
  }

  function selectSource(sourceId: string | null) {
    selectedSourceId = typeof sourceId === 'string' && sourceId.trim()
      ? sourceId.trim()
      : null
    writeStoredSourceId(options.selectedSourceStorageKey, selectedSourceId)
    setState({
      selectedSourceId,
      sourcePreference: selectedSourceId ? 'manual' : null,
      reason: 'manual-select',
    })
  }

  async function acquireStream(acquireOptions: ScreenCaptureAcquireOptions = {}) {
    if (isStreamUsable(currentStream)) {
      setState({
        phase: 'active',
        reason: 'reuse',
        currentSourceId,
      })
      touch()
      return currentStream!
    }

    if (currentStream)
      clearActiveStream('manual-stop')

    const mediaStreamOptions = acquireOptions.mediaStreamOptions ?? { video: true, audio: false }
    const mediaDevices = getMediaDevices()
    if (!mediaDevices?.getDisplayMedia)
      throw new Error('navigator.mediaDevices.getDisplayMedia is unavailable')

    const selectedSource = await resolveSelectedSourceId()
    if (selectedSource) {
      setState({
        phase: 'capturing-selected-source',
        reason: selectedSource.reason,
        selectedSourceId: selectedSource.sourceId,
        sourcePreference: selectedSource.sourcePreference,
        lastError: null,
      })
      try {
        const stream = await api.selectWithSource(
          () => selectedSource.sourceId,
          async () => await mediaDevices.getDisplayMedia(mediaStreamOptions),
          { timeout: acquireOptions.timeoutMs },
        )
        bindCurrentStream(stream, {
          reason: 'selected-source',
          sourceId: selectedSource.sourceId,
          sourcePreference: selectedSource.sourcePreference,
        })
        return stream
      }
      catch (error) {
        setState({
          phase: 'error',
          reason: 'selected-source-failed',
          currentSourceId: null,
          lastError: toErrorMessage(error),
        })
        // NOTICE: Selected-source capture may fail transiently; fall through to prompt mode when allowed.
      }
    }

    if (!acquireOptions.allowPrompt) {
      setState({
        phase: 'error',
        reason: 'prompt-required',
      })
      return null
    }

    setState({
      phase: 'prompting',
      reason: 'prompt',
      currentSourceId: null,
      sourcePreference: 'prompt',
      lastError: null,
    })

    try {
      const stream = await mediaDevices.getDisplayMedia(mediaStreamOptions)
      bindCurrentStream(stream, {
        reason: 'prompt',
        sourceId: null,
        sourcePreference: 'prompt',
      })
      return stream
    }
    catch (error) {
      setState({
        phase: 'error',
        reason: 'prompt-failed',
        currentSourceId: null,
        lastError: toErrorMessage(error),
      })
      throw error
    }
  }

  async function captureFrame(input: {
    height?: number
    jpegQuality?: number
    stream?: ScreenCaptureMediaStreamLike | null
    width?: number
  } = {}): Promise<CaptureFrameResult | null> {
    const stream = input.stream ?? currentStream
    if (!stream || !isStreamUsable(stream))
      return null

    const video = createVideoElement(stream)
    try {
      try {
        await video.play()
      }
      catch {
        // NOTICE: Some browsers still allow frame reads before play() settles.
      }

      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          video.addEventListener('loadeddata', () => resolve(), { once: true })
        })
      }

      const sourceWidth = normalizeCaptureDimension(video.videoWidth, 1)
      const sourceHeight = normalizeCaptureDimension(video.videoHeight, 1)
      const width = normalizeCaptureDimension(input.width, sourceWidth)
      const height = normalizeCaptureDimension(input.height, sourceHeight)
      const canvas = getDocument().createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context)
        return null

      context.drawImage(video, 0, 0, width, height)
      touch()
      return {
        dataUrl: canvas.toDataURL('image/jpeg', input.jpegQuality ?? 0.85),
        width,
        height,
      }
    }
    finally {
      video.srcObject = null
      video.remove()
    }
  }

  function stop(reason: ScreenCaptureSessionReason = 'manual-stop') {
    if (!currentStream) {
      clearActiveStream(reason)
      return
    }

    const activeStream = currentStream
    clearActiveStream(reason)
    stopStreamTracks(activeStream)
  }

  function dispose() {
    stop('dispose')
  }

  function onStateChange(listener: ScreenCaptureSessionStateListener) {
    stateListeners.add(listener)
    listener({ ...state })
    return () => {
      stateListeners.delete(listener)
    }
  }

  queueStateReport(state)

  return {
    acquireStream,
    captureFrame,
    dispose,
    getDiagnostics: async () => await api.getDiagnostics?.() ?? null,
    getState: () => ({ ...state }),
    getCurrentStream: () => currentStream,
    getLastUsedAt: () => lastUsedAt,
    getSelectedSourceId: () => selectedSourceId,
    listSources,
    onStateChange,
    selectSource,
    stop,
    touch,
  }
}
