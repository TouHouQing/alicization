import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { CompletionToolCall, UserMessage } from '@xsai/shared-chat'

import type { ChatStreamEvent, ContextMessage } from '../../../types/chat'

import { isStageTamagotchi, isStageWeb } from '@proj-alicization/stage-shared'
import { useBroadcastChannel } from '@vueuse/core'
import { Mutex } from 'es-toolkit'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { ref, toRaw, watch } from 'vue'

import { useChatOrchestratorStore } from '../../chat'
import { CHAT_STREAM_CHANNEL_NAME, CONTEXT_CHANNEL_NAME } from '../../chat/constants'
import { useChatContextStore } from '../../chat/context-store'
import { useChatSessionStore } from '../../chat/session-store'
import { useChatStreamStore } from '../../chat/stream-store'
import { useConsciousnessStore } from '../../modules/consciousness'
import { useProvidersStore } from '../../providers'
import { useModsServerChannelStore } from './channel-server'

type BroadcastCloneSafeValue
  = | null
    | string
    | number
    | boolean
    | BroadcastCloneSafeValue[]
    | { [key: string]: BroadcastCloneSafeValue }

function sanitizeBroadcastCloneSafeValue(
  value: unknown,
  seen: WeakSet<object>,
): BroadcastCloneSafeValue | undefined {
  if (value === null)
    return null

  if (typeof value === 'string' || typeof value === 'boolean')
    return value

  if (typeof value === 'number')
    return Number.isFinite(value) ? value : String(value)

  if (typeof value === 'bigint')
    return value.toString()

  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol')
    return undefined

  if (typeof value !== 'object')
    return null

  if (seen.has(value))
    return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    const next: BroadcastCloneSafeValue[] = []
    value.forEach((entry) => {
      const sanitized = sanitizeBroadcastCloneSafeValue(entry, seen)
      if (sanitized !== undefined)
        next.push(sanitized)
    })
    return next
  }

  if (value instanceof Date)
    return value.toISOString()

  if (value instanceof URL)
    return value.toString()

  if (value instanceof Map) {
    const next: Record<string, BroadcastCloneSafeValue> = {}
    for (const [entryKey, entryValue] of value.entries()) {
      const sanitized = sanitizeBroadcastCloneSafeValue(entryValue, seen)
      if (sanitized !== undefined)
        next[typeof entryKey === 'string' ? entryKey : String(entryKey)] = sanitized
    }
    return next
  }

  if (value instanceof Set) {
    const next: BroadcastCloneSafeValue[] = []
    for (const entry of value.values()) {
      const sanitized = sanitizeBroadcastCloneSafeValue(entry, seen)
      if (sanitized !== undefined)
        next.push(sanitized)
    }
    return next
  }

  if (value instanceof RegExp)
    return value.toString()

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    }
  }

  if (value instanceof ArrayBuffer)
    return Array.from(new Uint8Array(value))

  if (ArrayBuffer.isView(value))
    return Array.from(new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)))

  const next: Record<string, BroadcastCloneSafeValue> = {}
  for (const [entryKey, entryValue] of Object.entries(value)) {
    const sanitized = sanitizeBroadcastCloneSafeValue(entryValue, seen)
    if (sanitized !== undefined)
      next[entryKey] = sanitized
  }
  return next
}

function sanitizeBroadcastPayload<T>(value: T): T {
  const rawValue = toRaw(value)
  return sanitizeBroadcastCloneSafeValue(rawValue, new WeakSet()) as T
}

export const useContextBridgeStore = defineStore('mods:api:context-bridge', () => {
  const mutex = new Mutex()

  const chatOrchestrator = useChatOrchestratorStore()
  const chatSession = useChatSessionStore()
  const chatStream = useChatStreamStore()
  const chatContext = useChatContextStore()
  const serverChannelStore = useModsServerChannelStore()
  const consciousnessStore = useConsciousnessStore()
  const providersStore = useProvidersStore()
  const { activeProvider, activeModel } = storeToRefs(consciousnessStore)

  const { post: broadcastContext, data: incomingContext } = useBroadcastChannel<ContextMessage, ContextMessage>({ name: CONTEXT_CHANNEL_NAME })
  const { post: broadcastStreamEvent, data: incomingStreamEvent } = useBroadcastChannel<ChatStreamEvent, ChatStreamEvent>({ name: CHAT_STREAM_CHANNEL_NAME })

  const disposeHookFns = ref<Array<() => void>>([])
  let remoteStreamGuard: { sessionId: string, generation: number } | null = null

  async function initialize() {
    await mutex.acquire()

    try {
      let isProcessingRemoteStream = false

      const { stop } = watch(incomingContext, (event) => {
        if (event)
          chatContext.ingestContextMessage(event)
      })
      disposeHookFns.value.push(stop)

      disposeHookFns.value.push(serverChannelStore.onContextUpdate((event) => {
        const contextMessage: ContextMessage = {
          ...event.data,
          metadata: event.metadata,
          createdAt: Date.now(),
        }
        chatContext.ingestContextMessage(contextMessage)
        broadcastContext(sanitizeBroadcastPayload(contextMessage))
      }))

      const postBroadcastStreamEvent = (event: ChatStreamEvent) => {
        broadcastStreamEvent(sanitizeBroadcastPayload(event))
      }

      disposeHookFns.value.push(serverChannelStore.onEvent('input:text', async (event) => {
        const {
          text,
          textRaw,
          overrides,
          contextUpdates,
        } = event.data

        const normalizedContextUpdates = contextUpdates?.map((update) => {
          const id = update.id ?? nanoid()
          const contextId = update.contextId ?? id
          return {
            ...update,
            id,
            contextId,
          }
        })

        if (normalizedContextUpdates?.length) {
          const createdAt = Date.now()
          for (const update of normalizedContextUpdates) {
            chatContext.ingestContextMessage({
              ...update,
              metadata: event.metadata,
              createdAt,
            })
          }
        }

        if (activeProvider.value && activeModel.value) {
          let chatProvider: ChatProvider
          try {
            chatProvider = await providersStore.getProviderInstance<ChatProvider>(activeProvider.value)
          }
          catch (err) {
            console.error('[context-bridge] getProviderInstance failed for provider:', activeProvider.value, err)
            return
          }

          let messageText = text
          const targetSessionId = overrides?.sessionId

          if (overrides?.messagePrefix) {
            messageText = `${overrides.messagePrefix}${text}`
          }

          // TODO(@nekomeowww): This only guard for input:text events handling and doesn't cover the entire ingestion
          // process. Another critical path of spark:notify is affected too, I think for better future development
          // experience, we should discover and find either a leader election or distributed lock solution to
          // coordinate the modules that handles context bridge ingestion across multiple windows/tabs.
          //
          // Background behind this, as server-sdk is in fact integrated in every Stage Web window/tab, each
          // window/tab has its own connection & chat orchestrator instance, when multiple windows/tabs are open,
          // each of them will receive the same input:text event and process ingestion independently, causing
          // duplicated messages handling and output:* events emission.
          //
          // We don't have ability to control how many windows/tabs the user will open (sometimes) user will forget
          // to close the extra windows/tabs, so we need a way to coordinate the ingestion processing to
          // ensure only one window/tab is handling the ingestion at a time.
          //
          // SharedWorker solution was considered but it's completely disabled in Chromium based Android browsers
          // (which is a big portion of mobile Stage Web users as stage-ui serves as the unified / universal
          // api wrapper for most of the shared logic across Web, Pocket, and Tamagotchi).
          //
          // Read more here:
          // - https://chromestatus.com/feature/6265472244514816
          // - https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
          // - https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
          navigator.locks.request('context-bridge:event:input:text', async () => {
            try {
              await chatOrchestrator.ingest(messageText, {
                providerId: activeProvider.value,
                model: activeModel.value,
                chatProvider,
                providerConfig: providersStore.getProviderConfig(activeProvider.value),
                input: sanitizeBroadcastPayload({
                  type: 'input:text',
                  data: {
                    ...event.data,
                    text,
                    textRaw,
                    overrides,
                    contextUpdates: normalizedContextUpdates,
                  },
                }),
                origin: 'context-recall',
              }, targetSessionId)
            }
            catch (err) {
              console.error('Error ingesting text input via context bridge:', err)
            }
          })
        }
      }))

      disposeHookFns.value.push(
        chatOrchestrator.onBeforeMessageComposed(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          postBroadcastStreamEvent({ type: 'before-compose', message, sessionId: chatSession.activeSessionId, context })
        }),
        chatOrchestrator.onAfterMessageComposed(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          postBroadcastStreamEvent({ type: 'after-compose', message, sessionId: chatSession.activeSessionId, context })
        }),
        chatOrchestrator.onBeforeSend(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          postBroadcastStreamEvent({ type: 'before-send', message, sessionId: chatSession.activeSessionId, context })
        }),
        chatOrchestrator.onAfterSend(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          postBroadcastStreamEvent({ type: 'after-send', message, sessionId: chatSession.activeSessionId, context })
        }),
        chatOrchestrator.onTokenLiteral(async (literal, context) => {
          if (isProcessingRemoteStream)
            return

          postBroadcastStreamEvent({ type: 'token-literal', literal, sessionId: chatSession.activeSessionId, context })
        }),
        chatOrchestrator.onTokenSpecial(async (special, context) => {
          if (isProcessingRemoteStream)
            return

          postBroadcastStreamEvent({ type: 'token-special', special, sessionId: chatSession.activeSessionId, context })
        }),
        chatOrchestrator.onStreamEnd(async (context) => {
          if (isProcessingRemoteStream)
            return

          postBroadcastStreamEvent({ type: 'stream-end', sessionId: chatSession.activeSessionId, context })
        }),
        chatOrchestrator.onAssistantResponseEnd(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          postBroadcastStreamEvent({ type: 'assistant-end', message, sessionId: chatSession.activeSessionId, context })
        }),
        chatOrchestrator.onToolCall(async (toolCall: CompletionToolCall, context: any) => {
          if (!isProcessingRemoteStream)
            postBroadcastStreamEvent({ type: 'tool-call', toolCall, sessionId: chatSession.activeSessionId, context })

          serverChannelStore.send(sanitizeBroadcastPayload({
            type: 'output:gen-ai:chat:tool-call',
            data: {
              ...context.input?.data,
              'toolCalls': [toolCall],
              'stage-web': isStageWeb(),
              'stage-tamagotchi': isStageTamagotchi(),
              'gen-ai:chat': {
                message: context.message as UserMessage,
                composedMessage: context.composedMessage,
                contexts: context.contexts,
                input: context.input,
              },
            },
          }))
        }),

        chatOrchestrator.onAssistantMessage(async (message, messageText, context) => {
          if (!isProcessingRemoteStream) {
            postBroadcastStreamEvent({
              type: 'assistant-message',
              message,
              messageText,
              sessionId: chatSession.activeSessionId,
              context,
            })
          }

          serverChannelStore.send(sanitizeBroadcastPayload({
            type: 'output:gen-ai:chat:message',
            data: {
              ...context.input?.data,
              message,
              'stage-web': isStageWeb(),
              'stage-tamagotchi': isStageTamagotchi(),
              'gen-ai:chat': {
                message: context.message as UserMessage,
                composedMessage: context.composedMessage,
                contexts: context.contexts,
                input: context.input,
              },
            },
          }))
        }),

        chatOrchestrator.onChatTurnComplete(async (chat, context) => {
          serverChannelStore.send(sanitizeBroadcastPayload({
            type: 'output:gen-ai:chat:complete',
            data: {
              ...context.input?.data,
              'message': chat.output,
              'toolCalls': chat.toolCalls,
              'stage-web': isStageWeb(),
              'stage-tamagotchi': isStageTamagotchi(),
              // TODO: Properly calculate usage data
              'usage': {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                source: 'estimate-based',
              },
              'gen-ai:chat': {
                message: context.message as UserMessage,
                composedMessage: context.composedMessage,
                contexts: context.contexts,
                input: context.input,
              },
            },
          }))
        }),
      )

      const { stop: stopIncomingStreamWatch } = watch(incomingStreamEvent, async (event) => {
        if (!event)
          return

        isProcessingRemoteStream = true

        try {
          // Use the receiver's active session to avoid clobbering chat state when events come from other windows/devtools.
          switch (event.type) {
            case 'before-compose':
              await chatOrchestrator.emitBeforeMessageComposedHooks(event.message, event.context)
              break
            case 'after-compose':
              await chatOrchestrator.emitAfterMessageComposedHooks(event.message, event.context)
              break
            case 'before-send':
              await chatOrchestrator.emitBeforeSendHooks(event.message, event.context)
              remoteStreamGuard = {
                sessionId: chatSession.activeSessionId,
                generation: chatSession.getSessionGenerationValue(),
              }
              chatOrchestrator.sending = true
              chatStream.beginStream()
              break
            case 'after-send':
              await chatOrchestrator.emitAfterSendHooks(event.message, event.context)
              break
            case 'token-literal':
              if (!remoteStreamGuard)
                return
              if (remoteStreamGuard.sessionId !== chatSession.activeSessionId)
                return
              if (chatSession.getSessionGenerationValue(remoteStreamGuard.sessionId) !== remoteStreamGuard.generation)
                return
              chatStream.appendStreamLiteral(event.literal)
              await chatOrchestrator.emitTokenLiteralHooks(event.literal, event.context)
              break
            case 'token-special':
              await chatOrchestrator.emitTokenSpecialHooks(event.special, event.context)
              break
            case 'stream-end':
              if (!remoteStreamGuard)
                break
              if (remoteStreamGuard.sessionId !== chatSession.activeSessionId)
                break
              if (chatSession.getSessionGenerationValue(remoteStreamGuard.sessionId) !== remoteStreamGuard.generation)
                break
              await chatOrchestrator.emitStreamEndHooks(event.context)
              chatStream.finalizeStream()
              chatOrchestrator.sending = false
              remoteStreamGuard = null
              break
            case 'assistant-end':
              if (!remoteStreamGuard)
                break
              if (remoteStreamGuard.sessionId !== chatSession.activeSessionId)
                break
              if (chatSession.getSessionGenerationValue(remoteStreamGuard.sessionId) !== remoteStreamGuard.generation)
                break
              await chatOrchestrator.emitAssistantResponseEndHooks(event.message, event.context)
              chatStream.finalizeStream(event.message)
              chatOrchestrator.sending = false
              remoteStreamGuard = null
              break
            case 'tool-call':
              await chatOrchestrator.emitToolCallHooks(event.toolCall, event.context)
              break
            case 'assistant-message':
              await chatOrchestrator.emitAssistantMessageHooks(event.message, event.messageText, event.context)
              break
          }
        }
        finally {
          isProcessingRemoteStream = false
        }
      })
      disposeHookFns.value.push(stopIncomingStreamWatch)
    }
    finally {
      mutex.release()
    }
  }

  async function dispose() {
    await mutex.acquire()

    try {
      for (const fn of disposeHookFns.value) {
        fn()
      }
    }
    finally {
      mutex.release()
    }

    disposeHookFns.value = []
  }

  return {
    initialize,
    dispose,
  }
})
