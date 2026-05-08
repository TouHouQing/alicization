import type {
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationTurnRuntimeContext } from './turn-os/runtime'
import type {
  AlicizationVisibleReplyClosureArtifact,
  AlicizationVisibleReplyCriticArtifact,
} from './visible-reply/facade'

import { shouldBufferAlicizationStructuredSpeechPrelude } from '@proj-alicization/stage-shared'
import { errorMessageFrom } from '@moeru/std'
import { streamText } from '@xsai/stream-text'

import { extractAllowedToolNamesFromToolChoice } from './main-chat-runtime-surface'
import { AlicizationRequiredToolMissingError } from './main-chat-required-tool'
import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import { createAlicizationTurnRuntime } from './turn-os/runtime'
import {
  deriveAlicizationVisibleReplyText,
  resolveAlicizationPreparedVisibleReplyExecution,
} from './visible-reply/facade'
import { createAbortError, isMainGatewayProgressEventType, readRawTextDelta, sanitizeText } from './main-chat-stream-primitives'
import { parseReminderToolResultForDebug, sanitizeBriefText } from './runtime-realtime'
import { parseJsonObjectFromText } from './runtime-transport-content'

type StreamTextInvoker = (input: Record<string, unknown>) => unknown

export interface AlicizationMainChatStreamRunnerResult {
  finishReason: string
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  visibleReplyCritic?: AlicizationVisibleReplyCriticArtifact | null
  visibleReplyClosure?: AlicizationVisibleReplyClosureArtifact | null
}

export interface AlicizationMainChatStreamMetaController {
  emit: (reply: string, options?: { force?: boolean }) => void
  getLastReply: () => string
}

interface AlicizationStructuredVisibleReplyRewriteInput {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
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
  rewriteStructuredVisibleReply?: (input: AlicizationStructuredVisibleReplyRewriteInput) => Promise<AlicizationStructuredVisibleReplyRewriteInput | null> | AlicizationStructuredVisibleReplyRewriteInput | null
  delayVisibleRelease?: boolean
  streamTextImpl?: StreamTextInvoker
  turnRuntimeContext?: AlicizationTurnRuntimeContext | null
}

export async function runAlicizationMainChatStream(
  input: RunAlicizationMainChatStreamOptions,
): Promise<AlicizationMainChatStreamRunnerResult> {
  const turnRuntime = createAlicizationTurnRuntime()
  const reminderToolCallIds = new Set<string>()
  const requiredToolNames = new Set(
    input.prepared.waitForTools
      ? extractAllowedToolNamesFromToolChoice(input.prepared.toolChoice, input.prepared.tools)
      : [],
  )
  const observedRequiredToolCalls = new Set<string>()
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

  const settleVisibleReplyLifecycle = (surface: ReturnType<typeof buildSurfaceArtifact>) => {
    if (!input.turnRuntimeContext)
      return
    turnRuntime.settleSurface({
      context: input.turnRuntimeContext,
      surface,
    })
    turnRuntime.settleDelivery({
      context: input.turnRuntimeContext,
      surface,
    })
  }

  const buildSurfaceArtifact = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    critic?: AlicizationVisibleReplyCriticArtifact | null
    closure?: AlicizationVisibleReplyClosureArtifact | null
  }) => {
    return {
      version: 'visible-reply-realization-v1' as const,
      expectedAuthority: inputSurface.visibleReplyExecution.expectedVisibleReplyAuthority ?? 'llm-mind',
      actualAuthority: inputSurface.visibleReplyExecution.actualVisibleReplyAuthority ?? null,
      providerMindExecuted: inputSurface.visibleReplyExecution.providerMindExecuted,
      mode: inputSurface.visibleReplyExecution.mode,
      visibleText: deriveAlicizationVisibleReplyText(inputSurface.fullText) || null,
      nonHumanAuthoredStatus: null,
      blockedReasons: [],
      reason: inputSurface.visibleReplyExecution.reason,
      critic: inputSurface.critic ?? null,
      closure: inputSurface.closure ?? null,
    }
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
    const initialVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: input.prepared,
      mode: 'provider-one-shot',
      providerMindExecuted: true,
      reason: 'visual-grounding-one-shot',
    })
    const shapedVisualOneShot = await input.rewriteStructuredVisibleReply?.({
      fullText: visualOneShot.fullText || '',
      visibleReplyExecution: initialVisibleReplyExecution,
    }) ?? null
    const visualFullText = shapedVisualOneShot?.fullText ?? visualOneShot.fullText ?? ''
    const visualReplyExecution = shapedVisualOneShot?.visibleReplyExecution ?? initialVisibleReplyExecution
    const visualVisibleText = deriveAlicizationVisibleReplyText(visualFullText)
    if (visualVisibleText && input.isRunActive()) {
      input.incrementChunkStats(visualVisibleText)
      input.streamMeta.emit(visualVisibleText)
      input.emitChunk({
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        text: visualVisibleText,
      })
    }
    settleVisibleReplyLifecycle(buildSurfaceArtifact({
      fullText: visualFullText,
      visibleReplyExecution: visualReplyExecution,
      critic: shapedVisualOneShot?.critic ?? null,
      closure: shapedVisualOneShot?.closure ?? null,
    }))
    return {
      finishReason: visualOneShot.finishReason || 'stop',
      fullText: visualFullText,
      visibleReplyExecution: visualReplyExecution,
      ...(shapedVisualOneShot?.critic ? { visibleReplyCritic: shapedVisualOneShot.critic } : {}),
      ...(shapedVisualOneShot?.closure ? { visibleReplyClosure: shapedVisualOneShot.closure } : {}),
    }
  }

  const invokeStreamText = input.streamTextImpl ?? (streamText as StreamTextInvoker)
  let finishReason = 'stop'
  let fullText = ''
  let visibleText = ''
  let bufferingStructuredPrelude = false
  let releasedStructuredReply = false
  let sawProgressEvent = false
  let sawAnyEvent = false
  let firstEventGraceApplied = false
  const shouldDelayVisibleRelease = input.delayVisibleRelease === true
  const shouldDelayStructuredRelease = Boolean(input.rewriteStructuredVisibleReply) || shouldDelayVisibleRelease
  const firstEventGraceTimeoutMs = Math.max(
    1_000,
    Math.min(12_000, Math.floor(input.firstEventTimeoutMs * 0.2)),
  )
  appendStreamDebugLine('chat-stream.invoke-stream-text', {
    elapsedMs: 0,
    firstEventTimeoutMs: input.firstEventTimeoutMs,
    firstEventGraceTimeoutMs,
    hasVisualGrounding: input.prepared.hasVisualGrounding,
    messageCount: input.prepared.messages.length,
    toolCount: Array.isArray(input.prepared.tools) ? input.prepared.tools.length : 0,
    waitForTools: input.prepared.waitForTools,
  })

  const emitVisibleDelta = (delta: string) => {
    if (!delta)
      return
    visibleText += delta
    input.incrementChunkStats(delta)
    input.emitChunk({
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      text: delta,
    })
    if (shouldEmitAlicizationChatMetaUpdate({
      delta,
      reply: visibleText,
      previousReply: input.streamMeta.getLastReply(),
    })) {
      input.streamMeta.emit(visibleText)
    }
  }

  const flushStructuredVisibleReply = () => {
    const parsed = parseJsonObjectFromText(fullText)
    const parsedReply = typeof parsed?.reply === 'string'
      ? parsed.reply.trim()
      : ''
    if (!parsedReply)
      return false

    const delta = parsedReply.startsWith(visibleText)
      ? parsedReply.slice(visibleText.length)
      : visibleText
        ? ''
        : parsedReply
    if (delta)
      emitVisibleDelta(delta)
    return true
  }

  await new Promise<void>((resolve, reject) => {
    let firstEventTimeout: ReturnType<typeof setTimeout> | null = null
    const armFirstEventTimeout = (delayMs: number, reason: 'initial' | 'grace') => {
      if (firstEventTimeout)
        clearTimeout(firstEventTimeout)
      firstEventTimeout = setTimeout(() => {
        if (sawProgressEvent || !input.isRunActive())
          return

        if (reason === 'initial' && sawAnyEvent && !firstEventGraceApplied) {
          firstEventGraceApplied = true
          appendStreamDebugLine('chat-stream.first-event-timeout-grace-armed', {
            elapsedMs: Date.now() - startedAt,
            graceTimeoutMs: firstEventGraceTimeoutMs,
            lastEventType: lastEventType || null,
            nonProgressEventTypes: [...input.nonProgressEventTypes],
          })
          armFirstEventTimeout(firstEventGraceTimeoutMs, 'grace')
          return
        }

        appendStreamDebugLine('chat-stream.first-event-timeout-fired', {
          elapsedMs: Date.now() - startedAt,
          timeoutPhase: reason,
          sawAnyEvent,
          firstEventGraceApplied,
          lastEventType: lastEventType || null,
          nonProgressEventTypes: [...input.nonProgressEventTypes],
        })
        const timeoutError = createAbortError('chat-first-event-timeout')
        if (!input.controller.signal.aborted) {
          input.controller.abort(timeoutError)
          return
        }
        rejectOnce(timeoutError)
      }, delayMs)
    }
    armFirstEventTimeout(input.firstEventTimeoutMs, 'initial')
    const abortHandler = () => {
      if (firstEventTimeout)
        clearTimeout(firstEventTimeout)
      reject(input.controller.signal.reason ?? createAbortError('chat-abort'))
    }
    input.controller.signal.addEventListener('abort', abortHandler, { once: true })
    const resolveOnce = () => {
      if (firstEventTimeout)
        clearTimeout(firstEventTimeout)
      input.controller.signal.removeEventListener('abort', abortHandler)
      resolve()
    }
    const rejectOnce = (nextError: unknown) => {
      if (firstEventTimeout)
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
        if (eventType)
          sawAnyEvent = true
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
          if (shouldDelayVisibleRelease)
            return
          const shouldBufferStructured = bufferingStructuredPrelude
            || shouldBufferAlicizationStructuredSpeechPrelude(fullText)
          if (shouldBufferStructured) {
            if (!bufferingStructuredPrelude) {
              bufferingStructuredPrelude = true
              appendStreamDebugLine('chat-stream.structured-prelude-buffering', {
                elapsedMs: Date.now() - startedAt,
                bufferedChars: fullText.length,
              })
            }
            if (!shouldDelayStructuredRelease && flushStructuredVisibleReply() && !releasedStructuredReply) {
              releasedStructuredReply = true
              appendStreamDebugLine('chat-stream.structured-prelude-released', {
                elapsedMs: Date.now() - startedAt,
                visibleChars: visibleText.length,
              })
            }
            return
          }

          emitVisibleDelta(rawDelta)
          return
        }

        if (event?.type === 'tool-call') {
          if (!input.isRunActive())
            return
          const observedToolName = sanitizeText(event.toolName ?? event.name)
          if (requiredToolNames.has(observedToolName))
            observedRequiredToolCalls.add(observedToolName)
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
          if (!shouldDelayStructuredRelease && bufferingStructuredPrelude && flushStructuredVisibleReply() && !releasedStructuredReply) {
            releasedStructuredReply = true
            appendStreamDebugLine('chat-stream.structured-prelude-released', {
              elapsedMs: Date.now() - startedAt,
              visibleChars: visibleText.length,
              atFinish: true,
            })
          }
          finishReason = sanitizeText(event.finishReason, 'stop')
          appendStreamDebugLine('chat-stream.finish-event', {
            elapsedMs: Date.now() - startedAt,
            finishReason,
            fullTextChars: fullText.length,
          })
          if (input.prepared.waitForTools && (finishReason === 'tool_calls' || finishReason === 'tool-calls'))
            return
          // NOTICE: Some provider/model pairs can ignore a forced executor tool choice
          // and still terminate with `finishReason=stop`. Failing hard here prevents
          // those turns from being persisted as fake natural-language "successes".
          if (requiredToolNames.size > 0 && observedRequiredToolCalls.size === 0) {
            appendStreamDebugLine('chat-stream.required-tool-missing', {
              elapsedMs: Date.now() - startedAt,
              finishReason,
              requiredToolNames: [...requiredToolNames],
            })
            rejectOnce(new AlicizationRequiredToolMissingError({
              stage: 'stream',
              finishReason,
              requiredToolNames: [...requiredToolNames],
              observedToolNames: [...observedRequiredToolCalls],
            }))
            return
          }
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
      sawAnyEvent,
      firstEventGraceApplied,
      lastEventType: lastEventType || null,
      nonProgressEventTypes: [...input.nonProgressEventTypes],
    })
    throw createAbortError('chat-first-event-timeout')
  }

  let visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
    prepared: input.prepared,
    mode: 'provider-stream',
    providerMindExecuted: true,
    reason: 'provider-stream',
  })
  let visibleReplyCritic: AlicizationVisibleReplyCriticArtifact | null = null
  let visibleReplyClosure: AlicizationVisibleReplyClosureArtifact | null = null
  if ((bufferingStructuredPrelude || shouldDelayVisibleRelease) && input.rewriteStructuredVisibleReply) {
    const shaped = await input.rewriteStructuredVisibleReply?.({
      fullText,
      visibleReplyExecution,
    }) ?? null
    if (shaped) {
      fullText = shaped.fullText
      visibleReplyExecution = shaped.visibleReplyExecution
      visibleReplyCritic = shaped.critic ?? null
      visibleReplyClosure = shaped.closure ?? null
    }
  }
  if (shouldDelayVisibleRelease) {
    const visibleReleaseText = deriveAlicizationVisibleReplyText(fullText)
    if (visibleReleaseText) {
      emitVisibleDelta(visibleReleaseText)
      appendStreamDebugLine('chat-stream.visible-release-after-closure', {
        elapsedMs: Date.now() - startedAt,
        visibleChars: visibleReleaseText.length,
        closureStatus: visibleReplyClosure?.status ?? null,
      })
    }
  }
  else if (bufferingStructuredPrelude && shouldDelayStructuredRelease) {
    if (flushStructuredVisibleReply() && !releasedStructuredReply) {
      releasedStructuredReply = true
      appendStreamDebugLine('chat-stream.structured-prelude-released', {
        elapsedMs: Date.now() - startedAt,
        visibleChars: visibleText.length,
        afterRewrite: Boolean(visibleReplyClosure),
      })
    }
  }

  settleVisibleReplyLifecycle(buildSurfaceArtifact({
    fullText,
    visibleReplyExecution,
    critic: visibleReplyCritic,
    closure: visibleReplyClosure,
  }))

  return {
    finishReason,
    fullText,
    visibleReplyExecution,
    ...(visibleReplyCritic ? { visibleReplyCritic } : {}),
    ...(visibleReplyClosure ? { visibleReplyClosure } : {}),
  }
}
