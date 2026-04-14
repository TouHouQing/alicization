import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatStreamDispatchPayload,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationDialogueRespondedPayload,
} from '../../../shared/eventa'
import type {
  ChatRunState,
  StreamDispatchEventType,
} from './runtime-soul'

interface CreateAlicizationChatStreamRuntimeOptions {
  normalizeTransportMessageContent: (content: unknown) => unknown
  sanitizeText: (raw: unknown, fallback?: string) => string
  redactStaleInspectionHistoryMessages: (
    messages: AlicizationChatStartPayload['messages'],
    latestUserText: string,
  ) => AlicizationChatStartPayload['messages']
  dispatchChannel: unknown
  emitContextEvent: (event: unknown, body: unknown, options?: unknown) => void
  metaEvent: unknown
  chunkEvent: unknown
  toolCallEvent: unknown
  toolResultEvent: unknown
  finishEvent: unknown
  errorEvent: unknown
  queueScopedAuditLog: (cardId: string, input: {
    level: 'notice' | 'warning'
    category: string
    action: string
    message: string
    payload?: Record<string, unknown>
  }) => Promise<void>
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
}

export function createAlicizationChatStreamRuntime(options: CreateAlicizationChatStreamRuntimeOptions) {
  function resolveChatMessages(
    payload: AlicizationChatStartPayload,
    contextOptions?: {
      redactStaleInspectionHistoryForUserText?: string
    },
  ): Message[] {
    const sourceMessages = contextOptions?.redactStaleInspectionHistoryForUserText
      ? options.redactStaleInspectionHistoryMessages(payload.messages, contextOptions.redactStaleInspectionHistoryForUserText)
      : payload.messages

    return sourceMessages.flatMap((message) => {
      const rawRole = typeof (message as { role?: unknown }).role === 'string'
        ? (message as { role: string }).role
        : ''
      const role = rawRole === 'developer'
        ? 'system'
        : rawRole

      if (role === 'error')
        return []
      if (role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool')
        return []

      if (role === 'tool') {
        return [{
          role: 'tool',
          content: options.normalizeTransportMessageContent(message.content),
          tool_call_id: options.sanitizeText(message.toolCallId),
        } as Message]
      }

      return [{
        // NOTICE: Renderer session history may contain UI-only pseudo roles such as
        // `error`. OpenAI-compatible providers only accept the standard chat roles,
        // and some compatibility gateways hang instead of returning a validation error.
        role,
        content: options.normalizeTransportMessageContent(message.content),
      } as Message]
    })
  }

  function toAlicizationChatStreamDispatchPayload(
    eventType: AlicizationChatStreamDispatchPayload['eventType'],
    body: AlicizationChatMetaEvent | AlicizationChatStreamChunkEvent | AlicizationChatToolCallEvent | AlicizationChatToolResultEvent | AlicizationChatFinishEvent | AlicizationChatErrorEvent | AlicizationDialogueRespondedPayload,
  ): AlicizationChatStreamDispatchPayload {
    switch (eventType) {
      case 'meta':
        return { eventType, body: body as AlicizationChatMetaEvent }
      case 'chunk':
        return { eventType, body: body as AlicizationChatStreamChunkEvent }
      case 'tool-call':
        return { eventType, body: body as AlicizationChatToolCallEvent }
      case 'tool-result':
        return { eventType, body: body as AlicizationChatToolResultEvent }
      case 'finish':
        return { eventType, body: body as AlicizationChatFinishEvent }
      case 'error':
        return { eventType, body: body as AlicizationChatErrorEvent }
      case 'dialogue-responded':
        return { eventType, body: body as AlicizationDialogueRespondedPayload }
    }
  }

  function emitChatStreamEventForState(
    state: ChatRunState | undefined,
    eventType: StreamDispatchEventType,
    body: AlicizationChatMetaEvent | AlicizationChatStreamChunkEvent | AlicizationChatToolCallEvent | AlicizationChatToolResultEvent | AlicizationChatFinishEvent | AlicizationChatErrorEvent,
  ) {
    if (!state)
      return

    const sender = state.sender
    if (sender && !sender.isDestroyed()) {
      try {
        sender.send(options.dispatchChannel as never, toAlicizationChatStreamDispatchPayload(eventType, body))
        if (!state.hasLoggedDispatchBinding) {
          state.hasLoggedDispatchBinding = true
          void options.queueScopedAuditLog(state.cardId, {
            level: 'notice',
            category: 'alicization.main-gateway',
            action: 'stream-dispatch-bound',
            message: 'Bound main chat stream dispatch to the originating renderer sender.',
            payload: {
              cardId: state.cardId,
              turnId: state.turnId,
              eventType,
              senderId: sender.id,
            },
          })
          void options.appendRuntimeDebugLine('chat-stream.dispatch-bound', {
            cardId: state.cardId,
            turnId: state.turnId,
            eventType,
            senderId: sender.id,
          })
        }
        return
      }
      catch (error) {
        void options.queueScopedAuditLog(state.cardId, {
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'stream-dispatch-failed',
          message: 'Failed to dispatch main chat stream event to the originating renderer sender.',
          payload: {
            cardId: state.cardId,
            turnId: state.turnId,
            eventType,
            senderId: sender.id,
            reason: error instanceof Error ? error.message : String(error),
          },
        })
        void options.appendRuntimeDebugLine('chat-stream.dispatch-failed', {
          cardId: state.cardId,
          turnId: state.turnId,
          eventType,
          senderId: sender.id,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const eventaOptions = state.rawInvokeOptions?.ipcMainEvent
      ? {
          raw: {
            ipcMainEvent: state.rawInvokeOptions.ipcMainEvent,
            event: state.rawInvokeOptions.event,
          },
        }
      : undefined

    const eventaEvent = eventType === 'meta'
      ? options.metaEvent
      : eventType === 'chunk'
        ? options.chunkEvent
        : eventType === 'tool-call'
          ? options.toolCallEvent
          : eventType === 'tool-result'
            ? options.toolResultEvent
            : eventType === 'finish'
              ? options.finishEvent
              : options.errorEvent

    if (eventaOptions) {
      options.emitContextEvent(eventaEvent, body, eventaOptions)
      return
    }

    options.emitContextEvent(eventaEvent, body)
  }

  return {
    resolveChatMessages,
    toAlicizationChatStreamDispatchPayload,
    emitChatStreamEventForState,
  }
}
