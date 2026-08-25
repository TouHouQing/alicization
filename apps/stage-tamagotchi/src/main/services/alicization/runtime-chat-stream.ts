import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatStreamDispatchPayload,
  AlicizationChatToolCallEvent,
  AlicizationChatToolCallInput,
  AlicizationChatToolProgressEvent,
  AlicizationChatToolProgressInput,
  AlicizationChatToolResultEvent,
  AlicizationChatToolResultInput,
  AlicizationDialogueRespondedPayload,
} from '../../../shared/eventa'
import type {
  ChatRunState,
  StreamDispatchEventType,
} from './runtime-soul'

import {
  AlicizationToolEventDeliveryError,
  createAlicizationRuntimeToolProjectionReducer,
} from '@proj-alicization/stage-shared'

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
  toolProgressEvent: unknown
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

type AlicizationChatStreamVisibleDispatchPayload = Exclude<
  AlicizationChatStreamDispatchPayload,
  { eventType: 'dialogue-responded' }
>
type AlicizationChatStreamVisibleDispatchBody = AlicizationChatStreamVisibleDispatchPayload['body']
type AlicizationChatStreamDispatchBodyFor<EventType extends AlicizationChatStreamDispatchPayload['eventType']> = Extract<
  AlicizationChatStreamDispatchPayload,
  { eventType: EventType }
>['body']

type AlicizationChatStreamEventArgs = {
  [EventType in StreamDispatchEventType]: [
    eventType: EventType,
    body: EventType extends 'tool-call'
      ? AlicizationChatToolCallInput
      : EventType extends 'tool-result'
        ? AlicizationChatToolResultInput
        : EventType extends 'tool-progress'
          ? AlicizationChatToolProgressInput
          : Extract<
            AlicizationChatStreamDispatchPayload,
            { eventType: EventType }
          >['body'],
  ]
}[StreamDispatchEventType]

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
    eventType: StreamDispatchEventType,
    body: AlicizationChatStreamVisibleDispatchBody,
  ): AlicizationChatStreamVisibleDispatchPayload
  function toAlicizationChatStreamDispatchPayload(
    eventType: 'dialogue-responded',
    body: AlicizationDialogueRespondedPayload,
  ): Extract<AlicizationChatStreamDispatchPayload, { eventType: 'dialogue-responded' }>
  function toAlicizationChatStreamDispatchPayload<
    EventType extends AlicizationChatStreamDispatchPayload['eventType'],
  >(
    eventType: EventType,
    body: AlicizationChatStreamDispatchBodyFor<EventType>,
  ): Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }> {
    switch (eventType) {
      case 'meta':
        return { eventType, body: body as AlicizationChatMetaEvent } as Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }>
      case 'chunk':
        return { eventType, body: body as AlicizationChatStreamChunkEvent } as Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }>
      case 'tool-call':
        return { eventType, body: body as AlicizationChatToolCallEvent } as Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }>
      case 'tool-result':
        return { eventType, body: body as AlicizationChatToolResultEvent } as Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }>
      case 'tool-progress':
        return { eventType, body: body as AlicizationChatToolProgressEvent } as Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }>
      case 'finish':
        return { eventType, body: body as AlicizationChatFinishEvent } as Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }>
      case 'error':
        return { eventType, body: body as AlicizationChatErrorEvent } as Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }>
      case 'dialogue-responded':
        return { eventType, body: body as AlicizationDialogueRespondedPayload } as Extract<AlicizationChatStreamDispatchPayload, { eventType: EventType }>
    }
  }

  function emitChatStreamEventForState(
    state: ChatRunState | undefined,
    ...[eventType, body]: AlicizationChatStreamEventArgs
  ) {
    if (!state)
      return

    const isToolEvent = eventType === 'tool-call'
      || eventType === 'tool-progress'
      || eventType === 'tool-result'
    const isFinishedRun = state.state === 'finished'

    if (isFinishedRun && eventType !== 'finish' && !isToolEvent)
      return

    if (state.errorEmitted) {
      // A provider error ends visible dialogue delivery, but executor progress
      // and terminal results can still arrive from the main-owned action stream.
      // Preserve those facts so a concrete tool failure can supersede a generic
      // stream error and remain traceable after terminal settlement.
      if (
        eventType !== 'finish'
        && eventType !== 'tool-progress'
        && eventType !== 'tool-result'
        && (!isFinishedRun || !isToolEvent)
      ) {
        return
      }
    }

    if (eventType === 'error') {
      if (state.errorEmitted)
        return
      state.errorEmitted = true
    }

    const readToolCallId = () => {
      if (!body || typeof body !== 'object' || !('toolCallId' in body))
        return ''
      return typeof body.toolCallId === 'string'
        ? body.toolCallId.trim()
        : ''
    }

    if (eventType === 'tool-call') {
      const toolCallId = readToolCallId()
      if (toolCallId) {
        const emittedToolCallIds = state.emittedToolCallIds ??= new Set<string>()
        if (emittedToolCallIds.has(toolCallId))
          return
        emittedToolCallIds.add(toolCallId)
      }
    }

    if (eventType === 'tool-progress') {
      const progress = body as AlicizationChatToolProgressInput
      const toolCallId = readToolCallId()
      const progressKey = progress.eventId?.trim()
        ? `event:${toolCallId}:${progress.eventId.trim()}`
        : [
            'snapshot',
            toolCallId,
            progress.toolName.trim(),
            progress.signal ?? '',
            progress.phase,
            progress.elapsedMs,
            progress.occurredAt ?? '',
            progress.adapterEventType ?? '',
            progress.itemType ?? '',
            progress.summary ?? '',
            progress.errorCode ?? '',
            progress.errorMessage ?? '',
          ].join('|')
      const emittedToolProgressKeys = state.emittedToolProgressKeys ??= new Set<string>()
      if (emittedToolProgressKeys.has(progressKey))
        return
      emittedToolProgressKeys.add(progressKey)
    }

    let projectedBody: AlicizationChatStreamVisibleDispatchBody = body as AlicizationChatStreamVisibleDispatchBody
    if (isToolEvent) {
      const projectionReducer = state.toolProjection ??= createAlicizationRuntimeToolProjectionReducer()
      // A completed turn's late tool telemetry is audit-only. An errored turn
      // still needs its concrete terminal tool fact to replace a generic stream
      // failure on the renderer, so that failure remains user-visible.
      const projectionOptions = isFinishedRun && !state.errorEmitted
        ? { traceOnly: true }
        : undefined
      if (eventType === 'tool-call') {
        const input = body as AlicizationChatToolCallInput
        const projection = projectionReducer.reduce({
          type: 'tool-call',
          toolCallId: input.toolCallId,
          toolName: input.toolName,
          selectedChannel: input.selectedChannel,
          arguments: input.arguments,
        }, projectionOptions)
        projectedBody = {
          ...input,
          selectedChannel: projection.card.selectedChannel,
          projection,
        } satisfies AlicizationChatToolCallEvent
      }
      else if (eventType === 'tool-progress') {
        const input = body as AlicizationChatToolProgressInput
        const projection = projectionReducer.reduce({
          type: 'tool-progress',
          toolCallId: input.toolCallId,
          toolName: input.toolName,
          selectedChannel: input.selectedChannel,
          signal: input.signal,
          phase: input.phase,
          elapsedMs: input.elapsedMs,
          timeoutMs: input.timeoutMs,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
          occurredAt: input.occurredAt,
          eventId: input.eventId,
          threadId: input.threadId,
          adapterEventType: input.adapterEventType,
          itemType: input.itemType,
          summary: input.summary,
          command: input.command,
          commandStatus: input.commandStatus,
          commandExitCode: input.commandExitCode,
          outputPreview: input.outputPreview,
        }, projectionOptions)
        projectedBody = {
          ...input,
          selectedChannel: projection.card.selectedChannel,
          projection,
        } satisfies AlicizationChatToolProgressEvent
      }
      else {
        const input = body as AlicizationChatToolResultInput
        const projection = projectionReducer.reduce({
          type: 'tool-result',
          toolCallId: input.toolCallId,
          toolName: input.toolName ?? '',
          selectedChannel: input.selectedChannel,
          phase: input.phase,
          result: input.result,
        }, projectionOptions)
        projectedBody = {
          ...input,
          selectedChannel: projection.card.selectedChannel,
          projection,
        } satisfies AlicizationChatToolResultEvent
      }
    }

    if (eventType === 'tool-result') {
      const toolResult = projectedBody as AlicizationChatToolResultEvent
      if (toolResult.projection.card.terminal) {
        const toolCallId = readToolCallId()
        if (toolCallId) {
          const emittedToolResultIds = state.emittedToolResultIds ??= new Set<string>()
          if (emittedToolResultIds.has(toolCallId))
            return
          emittedToolResultIds.add(toolCallId)
        }
      }
    }

    const sender = state.sender
    if (sender && !sender.isDestroyed()) {
      try {
        sender.send(options.dispatchChannel as never, toAlicizationChatStreamDispatchPayload(eventType, projectedBody))
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
          : eventType === 'tool-progress'
            ? options.toolProgressEvent
            : eventType === 'tool-result'
              ? options.toolResultEvent
              : eventType === 'finish'
                ? options.finishEvent
                : options.errorEvent

    try {
      if (eventaOptions) {
        options.emitContextEvent(eventaEvent, projectedBody, eventaOptions)
        return
      }

      options.emitContextEvent(eventaEvent, projectedBody)
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      void options.queueScopedAuditLog(state.cardId, {
        level: 'warning',
        category: 'alicization.main-gateway',
        action: 'stream-eventa-dispatch-failed',
        message: 'Failed to deliver a main-owned chat stream projection through the Eventa fallback.',
        payload: {
          cardId: state.cardId,
          turnId: state.turnId,
          eventType,
          reason,
        },
      }).catch(() => {})
      void options.appendRuntimeDebugLine('chat-stream.eventa-dispatch-failed', {
        cardId: state.cardId,
        turnId: state.turnId,
        eventType,
        reason,
      }).catch(() => {})
      if (isToolEvent) {
        throw new AlicizationToolEventDeliveryError(error, {
          type: eventType === 'tool-result' ? 'tool-result' : eventType,
          toolCallId: readToolCallId(),
          toolName: 'toolName' in body && typeof body.toolName === 'string'
            ? body.toolName
            : undefined,
        })
      }
    }
  }

  return {
    resolveChatMessages,
    toAlicizationChatStreamDispatchPayload,
    emitChatStreamEventForState,
  }
}
