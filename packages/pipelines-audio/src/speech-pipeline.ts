import type { Eventa } from '@moeru/eventa'

import type { SpeechPipelineEventName } from './eventa'
import type {
  IntentHandle,
  IntentOptions,
  LoggerLike,
  PlaybackItem,
  SpeechIntentMetadata,
  SpeechPipelineEvents,
  TextSegment,
  TextToken,
  TtsRequest,
  TtsResult,
} from './types'

import { createContext } from '@moeru/eventa'

import { speechPipelineEventMap } from './eventa'
import { createPriorityResolver } from './priority'
import { createTtsSegmentStream } from './processors/tts-chunker'
import { createPushStream } from './stream'

export interface SpeechPipelineOptions<TAudio> {
  tts: (request: TtsRequest, signal: AbortSignal) => Promise<TAudio | null>
  ttsConcurrency?: number
  playback: {
    schedule: (item: PlaybackItem<TAudio>) => void
    stopAll: (reason: string) => void
    stopByIntent: (intentId: string, reason: string) => void
    stopByOwner: (ownerId: string, reason: string) => void
    onStart: (listener: (event: { item: PlaybackItem<TAudio>, startedAt: number }) => void) => void
    onEnd: (listener: (event: { item: PlaybackItem<TAudio>, endedAt: number }) => void) => void
    onInterrupt: (listener: (event: { item: PlaybackItem<TAudio>, reason: string, interruptedAt: number }) => void) => void
    onReject: (listener: (event: { item: PlaybackItem<TAudio>, reason: string }) => void) => void
  }
  logger?: LoggerLike
  priority?: ReturnType<typeof createPriorityResolver>
  segmenter?: (
    tokens: ReadableStream<TextToken>,
    meta: {
      streamId: string
      intentId: string
      metadata?: SpeechIntentMetadata | null
    },
  ) => ReadableStream<TextSegment>
}

interface IntentState {
  intentId: string
  streamId: string
  priority: number
  ownerId?: string
  behavior: 'queue' | 'interrupt' | 'replace'
  metadata?: SpeechIntentMetadata | null
  createdAt: number
  controller: AbortController
  stream: ReadableStream<TextToken>
  closeStream: () => void
  canceled: boolean
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeSpeechIntentMetadata(raw: IntentOptions['metadata']) {
  if (!raw || typeof raw !== 'object')
    return null

  return { ...raw }
}

function isSpeechMetadataRecord(
  value: unknown,
): value is SpeechIntentMetadata {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
}

function looksLikeRuntimeDigestMetadata(
  value: SpeechIntentMetadata,
) {
  return value.version === 'alicization-runtime-digest-v1'
    || 'dominantChannel' in value
    || 'channels' in value
}

function mergeSpeechMetadataPreservingRicherBase(
  base: SpeechIntentMetadata | null | undefined,
  override: SpeechIntentMetadata | null | undefined,
): SpeechIntentMetadata | null {
  const normalizedBase = normalizeSpeechIntentMetadata(base)
  const normalizedOverride = normalizeSpeechIntentMetadata(override)

  if (!normalizedBase)
    return normalizedOverride
  if (!normalizedOverride)
    return normalizedBase

  const merged: SpeechIntentMetadata = { ...normalizedBase }

  for (const [key, value] of Object.entries(normalizedOverride)) {
    const baseValue = normalizedBase[key]

    if (value == null && baseValue != null) {
      merged[key] = baseValue
      continue
    }

    if (Array.isArray(value) && value.length === 0 && Array.isArray(baseValue) && baseValue.length > 0) {
      merged[key] = baseValue
      continue
    }

    if (isSpeechMetadataRecord(baseValue) && isSpeechMetadataRecord(value)) {
      merged[key] = mergeSpeechMetadataPreservingRicherBase(baseValue, value)
      continue
    }

    merged[key] = value
  }

  return merged
}

function mergeSpeechRuntimeDigestMetadata(
  base: SpeechIntentMetadata,
  override: SpeechIntentMetadata,
) {
  return mergeSpeechMetadataPreservingRicherBase(base, override)
}

function mergeSpeechMetadataValue(
  baseValue: unknown,
  overrideValue: unknown,
): unknown {
  if (isSpeechMetadataRecord(baseValue) && isSpeechMetadataRecord(overrideValue)) {
    if (looksLikeRuntimeDigestMetadata(baseValue) || looksLikeRuntimeDigestMetadata(overrideValue))
      return mergeSpeechRuntimeDigestMetadata(baseValue, overrideValue)

    return mergeSpeechIntentMetadata(baseValue, overrideValue)
  }

  return overrideValue
}

function mergeSpeechIntentMetadata(
  base: SpeechIntentMetadata | null | undefined,
  override: SpeechIntentMetadata | null | undefined,
): SpeechIntentMetadata | null {
  const normalizedBase = normalizeSpeechIntentMetadata(base)
  const normalizedOverride = normalizeSpeechIntentMetadata(override)

  if (!normalizedBase)
    return normalizedOverride
  if (!normalizedOverride)
    return normalizedBase

  const merged: SpeechIntentMetadata = { ...normalizedBase }

  for (const [key, value] of Object.entries(normalizedOverride))
    merged[key] = key in normalizedBase ? mergeSpeechMetadataValue(normalizedBase[key], value) : value

  return merged
}

export function createSpeechPipeline<TAudio>(options: SpeechPipelineOptions<TAudio>) {
  const logger = options.logger ?? console
  const priorityResolver = options.priority ?? createPriorityResolver()
  const segmenter = options.segmenter ?? createTtsSegmentStream
  const ttsConcurrency = Math.max(1, Math.floor(options.ttsConcurrency ?? 1))
  const context = createContext()

  const intents = new Map<string, IntentState>()
  const pending: IntentState[] = []
  let activeIntent: IntentState | null = null

  options.playback.onStart(event => context.emit(speechPipelineEventMap.onPlaybackStart, event))
  options.playback.onEnd(event => context.emit(speechPipelineEventMap.onPlaybackEnd, event))
  options.playback.onInterrupt(event => context.emit(speechPipelineEventMap.onPlaybackInterrupt, event))
  options.playback.onReject(event => context.emit(speechPipelineEventMap.onPlaybackReject, event))

  function enqueueIntent(intent: IntentState) {
    pending.push(intent)
  }

  function pickNextIntent() {
    if (pending.length === 0)
      return null
    pending.sort((a, b) => (b.priority - a.priority) || (a.createdAt - b.createdAt))
    return pending.shift() ?? null
  }

  async function runIntent(intent: IntentState) {
    activeIntent = intent
    context.emit(speechPipelineEventMap.onIntentStart, intent.intentId)

    const tokenStream = intent.stream
    const segmentStream = segmenter(tokenStream, {
      streamId: intent.streamId,
      intentId: intent.intentId,
      metadata: intent.metadata ?? null,
    })
    let cancelReader: (() => void) | undefined
    let releaseReader: (() => void) | undefined
    let removeAbortListener: (() => void) | undefined

    try {
      const reader = segmentStream.getReader()
      interface QueuedRequest { sequence: number, request: TtsRequest }
      interface CompletedRequest {
        request: TtsRequest
        audio: TAudio | null
        skipReason?: 'empty-audio' | 'tts-error'
      }
      const queuedRequests: QueuedRequest[] = []
      const completedRequests = new Map<number, CompletedRequest>()
      const queueWaiters = new Set<() => void>()
      const completionWaiters = new Set<() => void>()
      let nextSequence = 0
      let nextSequenceToFlush = 0
      let readerDone = false
      let activeTtsWorkers = 0
      let readerReleased = false

      const notifyQueueWaiters = () => {
        for (const resolve of queueWaiters)
          resolve()
        queueWaiters.clear()
      }

      const notifyCompletionWaiters = () => {
        for (const resolve of completionWaiters)
          resolve()
        completionWaiters.clear()
      }

      const waitForQueue = () => {
        if (queuedRequests.length > 0 || readerDone || intent.controller.signal.aborted)
          return Promise.resolve()

        return new Promise<void>(resolve => queueWaiters.add(resolve))
      }

      const waitForCompletion = () => {
        if (completedRequests.has(nextSequenceToFlush) || (readerDone && activeTtsWorkers === 0))
          return Promise.resolve()

        return new Promise<void>(resolve => completionWaiters.add(resolve))
      }

      releaseReader = () => {
        if (readerReleased)
          return

        readerReleased = true
        reader.releaseLock()
      }

      cancelReader = () => {
        readerDone = true
        notifyQueueWaiters()
        notifyCompletionWaiters()
        void reader.cancel().catch(() => {})
      }

      const flushCompletedRequests = () => {
        while (completedRequests.has(nextSequenceToFlush)) {
          const completed = completedRequests.get(nextSequenceToFlush)
          completedRequests.delete(nextSequenceToFlush)
          nextSequenceToFlush += 1

          if (!completed || intent.controller.signal.aborted)
            continue

          if (completed.audio == null) {
            context.emit(speechPipelineEventMap.onTtsSkipped, {
              request: completed.request,
              reason: completed.skipReason ?? 'empty-audio',
              createdAt: Date.now(),
            })
            continue
          }

          const ttsResult: TtsResult<TAudio> = {
            streamId: completed.request.streamId,
            intentId: completed.request.intentId,
            segmentId: completed.request.segmentId,
            text: completed.request.text,
            special: completed.request.special,
            continuityHoldMs: completed.request.continuityHoldMs,
            audio: completed.audio,
            createdAt: Date.now(),
            ...(completed.request.metadata != null ? { metadata: completed.request.metadata } : {}),
          }

          context.emit(speechPipelineEventMap.onTtsResult, ttsResult)

          options.playback.schedule({
            id: createId('playback'),
            streamId: ttsResult.streamId,
            intentId: ttsResult.intentId,
            segmentId: ttsResult.segmentId,
            ownerId: intent.ownerId,
            priority: intent.priority,
            text: ttsResult.text,
            special: ttsResult.special,
            continuityHoldMs: ttsResult.continuityHoldMs,
            audio: ttsResult.audio,
            createdAt: Date.now(),
            ...(ttsResult.metadata != null ? { metadata: ttsResult.metadata } : {}),
          })
        }
      }

      const processQueuedRequests = async () => {
        activeTtsWorkers += 1
        try {
          while (!intent.controller.signal.aborted) {
            if (queuedRequests.length === 0) {
              if (readerDone)
                return
              await waitForQueue()
              continue
            }

            const queuedRequest = queuedRequests.shift()
            if (!queuedRequest)
              continue

            let audio: TAudio | null = null
            let skipReason: CompletedRequest['skipReason'] | undefined
            try {
              audio = await options.tts(queuedRequest.request, intent.controller.signal)
            }
            catch (err) {
              if (intent.controller.signal.aborted)
                return
              logger.warn('TTS generation failed:', err)
              skipReason = 'tts-error'
            }

            if (audio == null && !skipReason)
              skipReason = 'empty-audio'

            completedRequests.set(queuedRequest.sequence, {
              request: queuedRequest.request,
              audio,
              skipReason,
            })
            notifyCompletionWaiters()
          }
        }
        finally {
          activeTtsWorkers -= 1
          notifyCompletionWaiters()
        }
      }

      const handleAbort = () => {
        cancelReader()
      }
      intent.controller.signal.addEventListener('abort', handleAbort, { once: true })
      removeAbortListener = () => {
        intent.controller.signal.removeEventListener('abort', handleAbort)
      }

      const workers = Array.from({ length: ttsConcurrency }, () => processQueuedRequests())

      while (true) {
        const { value, done } = await reader.read()
        if (done)
          break
        if (!value)
          continue
        if (intent.canceled || intent.controller.signal.aborted) {
          await reader.cancel()
          break
        }

        const metadata = mergeSpeechIntentMetadata(intent.metadata, value.metadata)
        const segment = metadata === value.metadata
          ? value
          : {
              ...value,
              ...(metadata != null ? { metadata } : {}),
            }

        context.emit(speechPipelineEventMap.onSegment, segment)

        if (segment.text === '' && segment.special) {
          context.emit(speechPipelineEventMap.onSpecial, segment)
          continue
        }

        const request: TtsRequest = {
          streamId: segment.streamId,
          intentId: segment.intentId,
          segmentId: segment.segmentId,
          text: segment.text,
          special: segment.special,
          continuityHoldMs: segment.continuityHoldMs,
          priority: intent.priority,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        }

        context.emit(speechPipelineEventMap.onTtsRequest, request)
        queuedRequests.push({
          sequence: nextSequence++,
          request,
        })
        notifyQueueWaiters()
        flushCompletedRequests()
      }

      readerDone = true
      notifyQueueWaiters()

      for (;;) {
        flushCompletedRequests()
        if (readerDone && activeTtsWorkers === 0 && completedRequests.size === 0)
          break
        await waitForCompletion()
      }

      await Promise.all(workers)
      flushCompletedRequests()
    }
    catch (err) {
      if (!intent.controller.signal.aborted)
        logger.warn('Speech pipeline intent failed:', err)
    }
    finally {
      removeAbortListener?.()
      cancelReader?.()
      releaseReader?.()

      if (intent.canceled) {
        context.emit(speechPipelineEventMap.onIntentCancel, { intentId: intent.intentId, reason: intent.controller.signal.reason as string | undefined })
      }
      else {
        context.emit(speechPipelineEventMap.onIntentEnd, intent.intentId)
      }

      intents.delete(intent.intentId)
      activeIntent = null

      const next = pickNextIntent()
      if (next)
        void runIntent(next)
    }
  }

  function openIntent(optionsInput?: IntentOptions): IntentHandle {
    const intentId = optionsInput?.intentId ?? createId('intent')
    const streamId = optionsInput?.streamId ?? createId('stream')
    const priority = priorityResolver.resolve(optionsInput?.priority)
    const behavior = optionsInput?.behavior ?? 'queue'
    const ownerId = optionsInput?.ownerId
    const metadata = normalizeSpeechIntentMetadata(optionsInput?.metadata)

    const controller = new AbortController()
    const { stream, write, close } = createPushStream<TextToken>()
    let sequence = 0

    const intent: IntentState = {
      intentId,
      streamId,
      priority,
      ownerId,
      behavior,
      metadata,
      createdAt: Date.now(),
      controller,
      stream,
      closeStream: close,
      canceled: false,
    }

    intents.set(intentId, intent)

    const handle: IntentHandle = {
      intentId,
      streamId,
      priority,
      ownerId,
      stream,
      writeLiteral(text: string) {
        if (intent.canceled)
          return
        write({
          type: 'literal',
          value: text,
          streamId,
          intentId,
          sequence: sequence++,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
      },
      writeSpecial(special: string) {
        if (intent.canceled)
          return
        write({
          type: 'special',
          value: special,
          streamId,
          intentId,
          sequence: sequence++,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
      },
      writeFlush() {
        if (intent.canceled)
          return
        write({
          type: 'flush',
          streamId,
          intentId,
          sequence: sequence++,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
      },
      end() {
        close()
      },
      cancel(reason?: string) {
        cancelIntent(intentId, reason)
      },
    }

    if (!activeIntent) {
      void runIntent(intent)
      return handle
    }

    if (behavior === 'replace') {
      cancelIntent(activeIntent.intentId, 'replace')
      void runIntent(intent)
      return handle
    }

    if (behavior === 'interrupt' && intent.priority >= activeIntent.priority) {
      cancelIntent(activeIntent.intentId, 'interrupt')
      void runIntent(intent)
      return handle
    }

    enqueueIntent(intent)
    return handle
  }

  function cancelIntent(intentId: string, reason?: string) {
    const intent = intents.get(intentId)
    if (!intent)
      return
    intent.canceled = true
    intent.controller.abort(reason ?? 'canceled')
    intent.closeStream()

    if (activeIntent?.intentId === intentId) {
      options.playback.stopByIntent(intentId, reason ?? 'canceled')
      return
    }

    const index = pending.findIndex(item => item.intentId === intentId)
    if (index >= 0)
      pending.splice(index, 1)
  }

  function cancelOwner(ownerId: string, reason?: string) {
    if (!ownerId)
      return

    const ownedIntentIds = [...intents.values()]
      .filter(intent => intent.ownerId === ownerId)
      .map(intent => intent.intentId)

    for (const intentId of ownedIntentIds)
      cancelIntent(intentId, reason ?? 'owner-canceled')

    options.playback.stopByOwner(ownerId, reason ?? 'owner-canceled')
  }

  function interrupt(reason: string) {
    if (activeIntent)
      cancelIntent(activeIntent.intentId, reason)
  }

  function stopAll(reason: string) {
    for (const intent of intents.values()) {
      intent.canceled = true
      intent.controller.abort(reason)
      intent.closeStream()
    }
    pending.length = 0
    intents.clear()
    activeIntent = null
    options.playback.stopAll(reason)
  }

  return {
    openIntent,
    cancelIntent,
    cancelOwner,
    interrupt,
    stopAll,
    on<K extends SpeechPipelineEventName>(event: K, listener: SpeechPipelineEvents<TAudio>[K]) {
      return context.on(speechPipelineEventMap[event] as Eventa<any>, (payload) => {
        listener(payload?.body ?? payload)
      })
    },
  }
}
