import type { AlicizationChatStartPayload, AlicizationChatStreamChunkEvent, AlicizationChatToolCallEvent, AlicizationChatToolResultEvent } from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'

import { errorMessageFrom } from '@moeru/std'
import { streamText } from '@xsai/stream-text'

import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import { createAbortError, isMainGatewayProgressEventType, readRawTextDelta, sanitizeText } from './main-chat-stream-primitives'
import { parseReminderToolResultForDebug, sanitizeBriefText } from './runtime-realtime'

type StreamTextInvoker = (input: Record<string, unknown>) => unknown

export interface AlicizationMainChatStreamRunnerResult {
  finishReason: string
  fullText: string
}

export interface AlicizationMainChatStreamMetaController {
  emit: (reply: string, options?: { force?: boolean }) => void
  getLastReply: () => string
}

interface RunAlicizationMainChatStreamOptions {
  payload: AlicizationChatStartPayload
  prepared: AlicizationPreparedMainChatExecutionResult
  headers?: Record<string, string>
  controller: AbortController
  firstEventTimeoutMs: number
  isRunActive: () => boolean
  incrementChunkStats: (rawDelta: string) => void
  emitChunk: (payload: AlicizationChatStreamChunkEvent) => void
  emitToolCall: (payload: AlicizationChatToolCallEvent) => void
  emitToolResult: (payload: AlicizationChatToolResultEvent) => void
  streamMeta: AlicizationMainChatStreamMetaController
  nonProgressEventTypes: Set<string>
  generateNonStreaming: (input: {
    chatConfig: AlicizationPreparedMainChatExecutionResult['chatConfig']
    messages: AlicizationPreparedMainChatExecutionResult['messages']
    headers?: Record<string, string>
    tools: AlicizationPreparedMainChatExecutionResult['tools']
    toolChoice: AlicizationPreparedMainChatExecutionResult['toolChoice']
    timeoutMs: number
    cardId?: string
    turnId?: string
  }) => Promise<{
    finishReason: string
    fullText: string
  }>
  logReminderToolCall?: (input: {
    toolCallId: string
    toolName: string
    argumentsPreview: string
  }) => Promise<void> | void
  logReminderToolResult?: (input: {
    toolCallId: string
    summary: ReturnType<typeof parseReminderToolResultForDebug>
  }) => Promise<void> | void
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void>
  streamTextImpl?: StreamTextInvoker
}

export async function runAlicizationMainChatStream(
  input: RunAlicizationMainChatStreamOptions,
): Promise<AlicizationMainChatStreamRunnerResult> {
  const reminderToolCallIds = new Set<string>()
  const startedAt = Date.now()
  let lastEventType = ''

  const appendStreamDebugLine = (event: string, payload: Record<string, unknown>) => {
    if (!input.appendRuntimeDebugLine)
      return
    void input.appendRuntimeDebugLine(event, {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      ...payload,
    })
  }

  if (input.prepared.hasVisualGrounding) {
    const visualOneShot = await input.generateNonStreaming({
      chatConfig: input.prepared.chatConfig,
      messages: input.prepared.messages,
      headers: input.headers,
      tools: input.prepared.tools,
      toolChoice: input.prepared.toolChoice,
      timeoutMs: input.firstEventTimeoutMs,
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
    })
    if (visualOneShot.fullText && input.isRunActive()) {
      input.incrementChunkStats(visualOneShot.fullText)
      input.streamMeta.emit(visualOneShot.fullText)
      input.emitChunk({
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        text: visualOneShot.fullText,
      })
    }
    return {
      finishReason: visualOneShot.finishReason || 'stop',
      fullText: visualOneShot.fullText || '',
    }
  }

  const invokeStreamText = input.streamTextImpl ?? (streamText as StreamTextInvoker)
  let finishReason = 'stop'
  let fullText = ''
  let sawProgressEvent = false
  appendStreamDebugLine('chat-stream.invoke-stream-text', {
    elapsedMs: 0,
    firstEventTimeoutMs: input.firstEventTimeoutMs,
    hasVisualGrounding: input.prepared.hasVisualGrounding,
    messageCount: input.prepared.messages.length,
    toolCount: Array.isArray(input.prepared.tools) ? input.prepared.tools.length : 0,
    waitForTools: input.prepared.waitForTools,
  })

  await new Promise<void>((resolve, reject) => {
    const firstEventTimeout = setTimeout(() => {
      if (!sawProgressEvent && input.isRunActive()) {
        appendStreamDebugLine('chat-stream.first-event-timeout-fired', {
          elapsedMs: Date.now() - startedAt,
          lastEventType: lastEventType || null,
          nonProgressEventTypes: [...input.nonProgressEventTypes],
        })
        reject(createAbortError('chat-first-event-timeout'))
      }
    }, input.firstEventTimeoutMs)
    const abortHandler = () => {
      clearTimeout(firstEventTimeout)
      reject(input.controller.signal.reason ?? createAbortError('chat-abort'))
    }
    input.controller.signal.addEventListener('abort', abortHandler, { once: true })
    const resolveOnce = () => {
      clearTimeout(firstEventTimeout)
      input.controller.signal.removeEventListener('abort', abortHandler)
      resolve()
    }
    const rejectOnce = (nextError: unknown) => {
      clearTimeout(firstEventTimeout)
      input.controller.signal.removeEventListener('abort', abortHandler)
      reject(nextError)
    }

    void Promise.resolve(invokeStreamText({
      ...input.prepared.chatConfig,
      maxSteps: 10,
      messages: input.prepared.messages,
      headers: input.headers,
      abortSignal: input.controller.signal,
      tools: input.prepared.tools,
      toolChoice: input.prepared.toolChoice,
      onEvent: async (event: any) => {
        const eventType = sanitizeText(event?.type)
        lastEventType = eventType
        if (isMainGatewayProgressEventType(eventType)) {
          if (!sawProgressEvent) {
            appendStreamDebugLine('chat-stream.first-progress-event', {
              elapsedMs: Date.now() - startedAt,
              eventType,
            })
          }
          sawProgressEvent = true
        }
        else if (eventType && input.nonProgressEventTypes.size < 12) {
          const previousSize = input.nonProgressEventTypes.size
          input.nonProgressEventTypes.add(eventType)
          if (input.nonProgressEventTypes.size !== previousSize) {
            appendStreamDebugLine('chat-stream.non-progress-event', {
              elapsedMs: Date.now() - startedAt,
              eventType,
              observedNonProgressCount: input.nonProgressEventTypes.size,
            })
          }
        }

        if (event?.type === 'text-delta') {
          if (!input.isRunActive())
            return
          const rawDelta = readRawTextDelta(event.text)
          fullText += rawDelta
          input.incrementChunkStats(rawDelta)
          input.emitChunk({
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            text: rawDelta,
          })
          if (shouldEmitAlicizationChatMetaUpdate({
            delta: rawDelta,
            reply: fullText,
            previousReply: input.streamMeta.getLastReply(),
          })) {
            input.streamMeta.emit(fullText)
          }
          return
        }

        if (event?.type === 'tool-call') {
          if (!input.isRunActive())
            return
          const observedToolName = sanitizeText(event.toolName ?? event.name)
          if (observedToolName === 'set_reminder') {
            const toolCallId = sanitizeText(event.toolCallId)
            if (toolCallId)
              reminderToolCallIds.add(toolCallId)
            await input.logReminderToolCall?.({
              toolCallId,
              toolName: observedToolName,
              argumentsPreview: sanitizeBriefText(JSON.stringify(event.arguments ?? {}), 200),
            })
          }
          input.emitToolCall({
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            toolCallId: sanitizeText(event.toolCallId),
            toolName: observedToolName,
            arguments: typeof event.arguments === 'object' && event.arguments
              ? event.arguments as Record<string, unknown>
              : undefined,
          })
          return
        }

        if (event?.type === 'tool-result') {
          if (!input.isRunActive())
            return
          const toolCallId = sanitizeText(event.toolCallId)
          if (reminderToolCallIds.has(toolCallId)) {
            await input.logReminderToolResult?.({
              toolCallId,
              summary: parseReminderToolResultForDebug(event.result),
            })
          }
          input.emitToolResult({
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            toolCallId,
            result: event.result,
          })
          return
        }

        if (event?.type === 'finish') {
          if (!input.isRunActive())
            return
          finishReason = sanitizeText(event.finishReason, 'stop')
          appendStreamDebugLine('chat-stream.finish-event', {
            elapsedMs: Date.now() - startedAt,
            finishReason,
            fullTextChars: fullText.length,
          })
          if (input.prepared.waitForTools && (finishReason === 'tool_calls' || finishReason === 'tool-calls'))
            return
          resolveOnce()
          return
        }

        if (event?.type === 'error') {
          if (!input.isRunActive())
            return
          appendStreamDebugLine('chat-stream.error-event', {
            elapsedMs: Date.now() - startedAt,
            reason: errorMessageFrom(event.error) ?? String(event.error ?? 'chat stream error'),
          })
          rejectOnce(event.error ?? new Error('chat stream error'))
        }
      },
    })).catch((nextError) => {
      if (!input.isRunActive())
        return
      appendStreamDebugLine('chat-stream.invoke-rejected', {
        elapsedMs: Date.now() - startedAt,
        lastEventType: lastEventType || null,
        reason: errorMessageFrom(nextError) ?? String(nextError),
      })
      rejectOnce(nextError)
    })
  })

  if (!sawProgressEvent && input.isRunActive()) {
    appendStreamDebugLine('chat-stream.completed-without-progress', {
      elapsedMs: Date.now() - startedAt,
      lastEventType: lastEventType || null,
      nonProgressEventTypes: [...input.nonProgressEventTypes],
    })
    throw createAbortError('chat-first-event-timeout')
  }

  return {
    finishReason,
    fullText,
  }
}
