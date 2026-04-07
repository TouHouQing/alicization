import type { createSpeechPipeline, IntentHandle, IntentOptions, TextToken } from '@proj-alicization/pipelines-audio'

import type { SpeechIntentStartPayload, SpeechIntentTokenPayload } from './bus'

import { createPushStream } from '@proj-alicization/pipelines-audio'
import { Mutex } from 'es-toolkit'
import { nanoid } from 'nanoid'

import {
  getSpeechBusContext,
  speechIntentCancelEvent,
  speechIntentEndEvent,
  speechIntentFlushEvent,
  speechIntentLiteralEvent,
  speechIntentSpecialEvent,
  speechIntentStartEvent,
  speechOwnerCancelEvent,
} from './bus'

function createId(prefix: string) {
  return `${prefix}-${nanoid()}`
}

function normalizeIntentMetadata(raw: IntentOptions['metadata']) {
  if (!raw || typeof raw !== 'object')
    return null

  return { ...raw }
}

type HostSpeechPipeline = Pick<ReturnType<typeof createSpeechPipeline<unknown>>, 'openIntent'> & {
  cancelOwner?: (ownerId: string, reason?: string) => void
  stopAll?: (reason: string) => void
}

export interface SpeechPipelineRuntime {
  openIntent: (options?: IntentOptions) => IntentHandle
  cancelOwner: (ownerId: string, reason?: string) => void
  registerHost: (pipeline: HostSpeechPipeline) => Promise<void>
  isHost: () => boolean
  dispose: () => Promise<void>
}

export function createSpeechPipelineRuntime(): SpeechPipelineRuntime {
  const mutex = new Mutex()
  const originId = `speech-${nanoid()}`

  let hostPipeline: HostSpeechPipeline | null = null
  let hostReady = false
  let bound = false

  const busDisposers: Array<() => void> = []
  const localRemoteIntentMap = new Map<string, IntentHandle>()
  const remoteIntentMap = new Map<string, IntentHandle>()
  const context = getSpeechBusContext()

  function bindBusListener<T>(event: T, listener: (evt: any) => void) {
    const stop = context.on(event as never, listener)
    if (typeof stop === 'function')
      busDisposers.push(stop)
  }

  function clearSpeechBusBindings() {
    while (busDisposers.length > 0) {
      const dispose = busDisposers.pop()
      dispose?.()
    }
    bound = false
  }

  function bindSpeechBusToHost() {
    if (bound)
      return
    bound = true

    bindBusListener(speechIntentStartEvent, (evt) => {
      const payload = (evt as { body?: SpeechIntentStartPayload })?.body
      if (!payload || payload.originId === originId)
        return

      if (!hostPipeline)
        return

      if (remoteIntentMap.has(payload.intentId))
        return

      const intent = hostPipeline.openIntent({
        intentId: payload.intentId,
        streamId: payload.streamId,
        ownerId: payload.ownerId,
        priority: payload.priority,
        behavior: payload.behavior,
        metadata: payload.metadata ?? null,
      })

      remoteIntentMap.set(payload.intentId, intent)
    })

    const applyToken = (payload: SpeechIntentTokenPayload, writer: (intent: IntentHandle, value?: string) => void) => {
      if (!payload || payload.originId === originId)
        return
      const intent = remoteIntentMap.get(payload.intentId)
      if (!intent) {
        if (!hostPipeline)
          return
        const fallback = hostPipeline.openIntent({ intentId: payload.intentId, streamId: payload.streamId })
        remoteIntentMap.set(payload.intentId, fallback)
        writer(fallback, payload.value)
        return
      }
      writer(intent, payload.value)
    }

    bindBusListener(speechIntentLiteralEvent, (evt) => {
      const payload = evt?.body
      if (!payload)
        return

      applyToken(payload, (intent, value) => {
        if (value)
          intent.writeLiteral(value)
      })
    })

    bindBusListener(speechIntentSpecialEvent, (evt) => {
      const payload = evt?.body
      if (!payload)
        return

      applyToken(payload, (intent, value) => {
        if (value)
          intent.writeSpecial(value)
      })
    })

    bindBusListener(speechIntentFlushEvent, (evt) => {
      const payload = evt?.body
      if (!payload)
        return

      applyToken(payload, (intent) => {
        intent.writeFlush()
      })
    })

    bindBusListener(speechIntentEndEvent, (evt) => {
      const payload = evt?.body
      if (!payload || payload.originId === originId)
        return
      const intent = remoteIntentMap.get(payload.intentId)
      if (!intent)
        return
      intent.end()
      remoteIntentMap.delete(payload.intentId)
    })

    bindBusListener(speechIntentCancelEvent, (evt) => {
      const payload = evt?.body
      if (!payload || payload.originId === originId)
        return
      const intent = remoteIntentMap.get(payload.intentId)
      if (!intent)
        return
      intent.cancel(payload.reason)
      remoteIntentMap.delete(payload.intentId)
    })

    bindBusListener(speechOwnerCancelEvent, (evt) => {
      const payload = evt?.body
      if (!payload || payload.originId === originId || !payload.ownerId)
        return

      cancelOwner(payload.ownerId, payload.reason, { emitBusEvent: false })
    })
  }

  function cancelLocalRemoteOwner(ownerId: string, reason?: string) {
    const ownedIntentIds = [...localRemoteIntentMap.values()]
      .filter(intent => intent.ownerId === ownerId)
      .map(intent => intent.intentId)

    for (const intentId of ownedIntentIds) {
      const intent = localRemoteIntentMap.get(intentId)
      intent?.cancel(reason ?? 'owner-canceled')
    }
  }

  function clearRemoteOwner(ownerId: string) {
    for (const [intentId, intent] of remoteIntentMap.entries()) {
      if (intent.ownerId !== ownerId)
        continue
      remoteIntentMap.delete(intentId)
    }
  }

  function createRemoteIntent(options?: IntentOptions): IntentHandle {
    const intentId = options?.intentId ?? createId('intent')
    const streamId = options?.streamId ?? createId('stream')
    const priority = typeof options?.priority === 'number' ? options?.priority : undefined
    const behavior = options?.behavior
    const ownerId = options?.ownerId
    const metadata = normalizeIntentMetadata(options?.metadata)

    const { stream, write, close } = createPushStream<TextToken>()
    let sequence = 0
    let closed = false

    function closeRemoteIntent(
      kind: 'cancel' | 'end',
      reason?: string,
    ) {
      if (closed)
        return
      closed = true
      close()
      localRemoteIntentMap.delete(intentId)
      if (kind === 'end') {
        context.emit(speechIntentEndEvent, {
          originId,
          intentId,
          streamId,
        })
        return
      }
      context.emit(speechIntentCancelEvent, {
        originId,
        intentId,
        streamId,
        reason,
      })
    }

    context.emit(speechIntentStartEvent, {
      originId,
      intentId,
      streamId,
      ownerId,
      priority,
      behavior,
      ...(metadata != null ? { metadata } : {}),
    })

    const handle: IntentHandle = {
      intentId,
      streamId,
      ownerId,
      priority: priority ?? 0,
      stream,
      writeLiteral(value: string) {
        if (closed)
          return
        write({
          type: 'literal',
          value,
          streamId,
          intentId,
          sequence,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
        context.emit(speechIntentLiteralEvent, {
          originId,
          intentId,
          streamId,
          sequence: sequence++,
          value,
        })
      },
      writeSpecial(value: string) {
        if (closed)
          return
        write({
          type: 'special',
          value,
          streamId,
          intentId,
          sequence,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
        context.emit(speechIntentSpecialEvent, {
          originId,
          intentId,
          streamId,
          sequence: sequence++,
          value,
        })
      },
      writeFlush() {
        if (closed)
          return
        write({
          type: 'flush',
          streamId,
          intentId,
          sequence,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
        context.emit(speechIntentFlushEvent, {
          originId,
          intentId,
          streamId,
          sequence: sequence++,
        })
      },
      end() {
        closeRemoteIntent('end')
      },
      cancel(reason?: string) {
        closeRemoteIntent('cancel', reason)
      },
    }

    localRemoteIntentMap.set(intentId, handle)
    return handle
  }

  async function registerHost(pipeline: HostSpeechPipeline) {
    await mutex.acquire()
    try {
      if (hostPipeline)
        return
      hostPipeline = pipeline
      hostReady = true
      bindSpeechBusToHost()
    }
    finally {
      mutex.release()
    }
  }

  function openIntent(options?: IntentOptions) {
    if (hostPipeline)
      return hostPipeline.openIntent(options)

    return createRemoteIntent(options)
  }

  function cancelOwner(
    ownerId: string,
    reason?: string,
    options?: {
      emitBusEvent?: boolean
    },
  ) {
    const normalizedOwnerId = ownerId.trim()
    if (!normalizedOwnerId)
      return

    cancelLocalRemoteOwner(normalizedOwnerId, reason)
    hostPipeline?.cancelOwner?.(normalizedOwnerId, reason ?? 'owner-canceled')
    clearRemoteOwner(normalizedOwnerId)

    if (options?.emitBusEvent === false)
      return

    context.emit(speechOwnerCancelEvent, {
      originId,
      ownerId: normalizedOwnerId,
      reason,
    })
  }

  function isHost() {
    return hostReady && !!hostPipeline
  }

  async function dispose() {
    await mutex.acquire()
    try {
      const activeHostPipeline = hostPipeline
      hostPipeline = null
      hostReady = false

      for (const intent of localRemoteIntentMap.values())
        intent.cancel('runtime-dispose')
      localRemoteIntentMap.clear()

      for (const intent of remoteIntentMap.values())
        intent.cancel('runtime-dispose')
      remoteIntentMap.clear()

      clearSpeechBusBindings()
      activeHostPipeline?.stopAll?.('runtime-dispose')
    }
    finally {
      mutex.release()
    }
  }

  return {
    openIntent,
    cancelOwner: (ownerId: string, reason?: string) => cancelOwner(ownerId, reason),
    registerHost,
    isHost,
    dispose,
  }
}
