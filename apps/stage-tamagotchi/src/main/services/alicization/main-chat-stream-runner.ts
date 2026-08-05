import type {
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationEmotionalKernelSnapshot,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationTurnRuntimeContext } from './turn-os/runtime'
import type {
  AlicizationVisibleReplyClosureArtifact,
  AlicizationVisibleReplyCriticArtifact,
  AlicizationVisibleReplyRealizationArtifact,
} from './visible-reply/facade'

import { errorMessageFrom } from '@moeru/std'
import {
  createAlicizationProviderVisibleArtifact,
} from '@proj-alicization/stage-shared'
import { streamText } from '@xsai/stream-text'

import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import {
  createAbortError,
  isMainGatewayProgressEventType,
  normalizeMainGatewayStreamEventType,
  readRawTextDelta,
  sanitizeText,
} from './main-chat-stream-primitives'
import { parseReminderToolResultForDebug, sanitizeBriefText } from './runtime-realtime'
import { createAlicizationTurnRuntime } from './turn-os/runtime'
import { resolveAlicizationPreparedVisibleReplyExecution } from './visible-reply/facade'
import {
  AlicizationVisibleReplySettlementBlockedError,
  validateAlicizationProviderSettlementPayload,
} from './visible-reply/settlement'

type StreamTextInvoker = (input: Record<string, unknown>) => unknown
type AlicizationStreamEmotionalKernelShape = AlicizationEmotionalKernelSnapshot

function observeStreamTextResultErrors(
  result: unknown,
  onError: (error: unknown) => void,
) {
  if (!result || typeof result !== 'object')
    return

  const streamResult = result as Record<string, unknown>
  const fullStream = streamResult.fullStream as {
    pipeTo?: (destination: WritableStream<unknown>) => Promise<void>
  } | undefined
  if (typeof fullStream?.pipeTo === 'function') {
    try {
      void fullStream
        .pipeTo(new WritableStream())
        .catch(onError)
    }
    catch (error) {
      onError(error)
    }
  }

  for (const key of ['messages', 'steps', 'totalUsage', 'usage'] as const) {
    const pending = streamResult[key]
    if (pending && typeof (pending as PromiseLike<unknown>).then === 'function')
      void Promise.resolve(pending).catch(onError)
  }
}

export interface AlicizationMainChatStreamRunnerResult {
  finishReason: string
  fullText: string
  origin: 'provider'
  learningPolicy: {
    allowLongTermCondensation: true
    allowPersonaLearning: true
    allowTraining: false
  }
  failureSurface: null
  visibleReplyExecution: AlicizationVisibleReplyExecution
  visibleReplyRealization: AlicizationVisibleReplyRealizationArtifact
}

export interface AlicizationMainChatStreamMetaController {
  emit: (reply: string, options?: { force?: boolean }) => void
  getLastReply: () => string
}

interface AlicizationStructuredVisibleReplySettlementInput {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
  visibleReplyRealization?: AlicizationVisibleReplyRealizationArtifact | null
}

export interface RunAlicizationMainChatStreamOptions {
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
    emotionalKernel?: AlicizationStreamEmotionalKernelShape | null
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
  settleStructuredVisibleReply?: (
    input: AlicizationStructuredVisibleReplySettlementInput,
  ) => Promise<AlicizationStructuredVisibleReplySettlementInput | null>
    | AlicizationStructuredVisibleReplySettlementInput
    | null
  delayVisibleRelease?: boolean
  streamTextImpl?: StreamTextInvoker
  turnRuntimeContext?: AlicizationTurnRuntimeContext | null
}

function buildPublicCriticSummary(
  critic: AlicizationVisibleReplyCriticArtifact | null | undefined,
) {
  if (!critic)
    return null

  return {
    version: 'visible-reply-critic-public-summary-v1' as const,
    status: critic.status,
    providerMindRequired: critic.providerMindRequired,
    reasonCodes: [...critic.reasonCodes],
  }
}

function buildPublicClosureSummary(
  closure: AlicizationVisibleReplyClosureArtifact | null | undefined,
) {
  if (!closure)
    return null

  return {
    version: 'visible-reply-closure-public-summary-v1' as const,
    status: closure.status,
    reasonCodes: [...closure.reasonCodes],
    initialCriticStatus: closure.initialCritic?.status ?? null,
    finalCriticStatus: closure.finalCritic?.status ?? null,
  }
}

function buildObservedVisibleReplyRealization(input: {
  visibleText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
}): AlicizationVisibleReplyRealizationArtifact {
  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: input.visibleReplyExecution.actualVisibleReplyAuthority,
    providerMindExecuted: input.visibleReplyExecution.providerMindExecuted,
    mode: input.visibleReplyExecution.mode,
    visibleText: input.visibleText,
    visibleReplyValidationStatus: 'approved',
    nonHumanAuthoredStatus: null,
    blockedReasons: [],
    reason: input.visibleReplyExecution.reason,
    critic: buildPublicCriticSummary(input.critic),
    closure: buildPublicClosureSummary(input.closure),
  }
}

function assertProviderVisibleReplyExecution(
  execution: AlicizationVisibleReplyExecution,
  closure: AlicizationVisibleReplyClosureArtifact | null,
) {
  if (
    execution.providerMindExecuted === true
    && execution.actualVisibleReplyAuthority === 'llm-mind'
  ) {
    return
  }

  throw new AlicizationVisibleReplySettlementBlockedError(
    'provider-visible-reply-authority-invalid',
    closure,
  )
}

function createProviderResult(input: {
  finishReason: string
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  visibleReplyRealization: AlicizationVisibleReplyRealizationArtifact
  memoryUsage: Parameters<typeof createAlicizationProviderVisibleArtifact>[0]['memoryUsage']
}) {
  const artifact = createAlicizationProviderVisibleArtifact({
    reply: input.visibleReplyRealization.visibleText ?? '',
    memoryUsage: input.memoryUsage,
  })

  return {
    finishReason: input.finishReason,
    fullText: input.fullText,
    origin: artifact.origin,
    learningPolicy: {
      allowLongTermCondensation: artifact.allowLongTermCondensation,
      allowPersonaLearning: artifact.allowPersonaLearning,
      allowTraining: artifact.allowTraining,
    },
    failureSurface: null,
    visibleReplyExecution: input.visibleReplyExecution,
    visibleReplyRealization: input.visibleReplyRealization,
  } satisfies AlicizationMainChatStreamRunnerResult
}

export async function runAlicizationMainChatStream(
  input: RunAlicizationMainChatStreamOptions,
): Promise<AlicizationMainChatStreamRunnerResult> {
  const providerMessages = input.prepared.messages
  const normalizedPayload = input.payload
  const turnRuntime = createAlicizationTurnRuntime()
  const reminderToolCallIds = new Set<string>()
  const startedAt = Date.now()
  let lastEventType = ''

  const appendStreamDebugLine = (event: string, payload: Record<string, unknown>) => {
    if (!input.appendRuntimeDebugLine)
      return
    void input.appendRuntimeDebugLine(event, {
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      ...payload,
    })
  }

  const settleVisibleReplyLifecycle = (
    surface: AlicizationVisibleReplyRealizationArtifact,
  ) => {
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

  const emitProviderVisibleReply = (
    visibleText: string,
    memoryUsage: Parameters<typeof createAlicizationProviderVisibleArtifact>[0]['memoryUsage'],
  ) => {
    if (!visibleText || !input.isRunActive())
      return

    const artifact = createAlicizationProviderVisibleArtifact({
      reply: visibleText,
      memoryUsage,
    })
    input.incrementChunkStats(visibleText)
    input.emitChunk({
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      text: visibleText,
      origin: artifact.origin,
      learningPolicy: {
        allowLongTermCondensation: artifact.allowLongTermCondensation,
        allowPersonaLearning: artifact.allowPersonaLearning,
        allowTraining: artifact.allowTraining,
      },
      failureSurface: null,
    })
    if (shouldEmitAlicizationChatMetaUpdate({
      delta: visibleText,
      reply: visibleText,
      previousReply: input.streamMeta.getLastReply(),
    })) {
      input.streamMeta.emit(visibleText)
    }
  }

  const settleObservedReply = async (inputSurface: {
    fullText: string
    visibleText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
  }): Promise<AlicizationVisibleReplyRealizationArtifact> => {
    const settled = await input.settleStructuredVisibleReply?.({
      fullText: inputSurface.fullText,
      visibleReplyExecution: inputSurface.visibleReplyExecution,
    }) ?? null
    const critic = settled?.critic ?? null
    const closure = settled?.closure ?? null

    assertProviderVisibleReplyExecution(inputSurface.visibleReplyExecution, closure)

    return buildObservedVisibleReplyRealization({
      visibleText: inputSurface.visibleText,
      visibleReplyExecution: inputSurface.visibleReplyExecution,
      critic,
      closure,
    })
  }

  if (input.prepared.hasVisualGrounding) {
    const visualOneShot = await input.generateNonStreaming({
      chatConfig: input.prepared.chatConfig,
      messages: providerMessages,
      headers: input.headers,
      tools: input.prepared.tools,
      toolChoice: input.prepared.toolChoice,
      timeoutMs: input.firstEventTimeoutMs,
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
    })
    const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: input.prepared,
      mode: 'provider-one-shot',
      providerMindExecuted: true,
      reason: 'visual-grounding-one-shot',
    })
    const rawFullText = visualOneShot.fullText || ''
    const validation = validateAlicizationProviderSettlementPayload({
      fullText: rawFullText,
      prepared: input.prepared,
      allowPlainTextProviderReply: true,
    })
    const validatedPayload = validation.payload
    if (!validation.valid || !validatedPayload) {
      throw new AlicizationVisibleReplySettlementBlockedError(
        `provider-settlement-invalid:${validation.issues.join(',')}`,
        null,
      )
    }
    const visibleReplyRealization = await settleObservedReply({
      fullText: rawFullText,
      visibleText: validatedPayload.reply,
      visibleReplyExecution,
    })

    emitProviderVisibleReply(
      validatedPayload.reply,
      validatedPayload.memoryUsage,
    )
    settleVisibleReplyLifecycle(visibleReplyRealization)

    return createProviderResult({
      finishReason: visualOneShot.finishReason || 'stop',
      fullText: rawFullText,
      visibleReplyExecution,
      visibleReplyRealization,
      memoryUsage: validatedPayload.memoryUsage,
    })
  }

  const invokeStreamText = input.streamTextImpl ?? (streamText as StreamTextInvoker)
  let finishReason = 'stop'
  let fullText = ''
  let sawProgressEvent = false
  let sawAnyEvent = false
  let firstEventGraceApplied = false
  const firstEventGraceTimeoutMs = Math.max(
    1_000,
    Math.min(12_000, Math.floor(input.firstEventTimeoutMs * 0.2)),
  )
  appendStreamDebugLine('chat-stream.invoke-stream-text', {
    elapsedMs: 0,
    firstEventTimeoutMs: input.firstEventTimeoutMs,
    firstEventGraceTimeoutMs,
    hasVisualGrounding: input.prepared.hasVisualGrounding,
    messageCount: providerMessages.length,
    toolCount: Array.isArray(input.prepared.tools) ? input.prepared.tools.length : 0,
    waitForTools: input.prepared.waitForTools,
  })

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
    function rejectOnce(nextError: unknown) {
      if (firstEventTimeout)
        clearTimeout(firstEventTimeout)
      input.controller.signal.removeEventListener('abort', abortHandler)
      reject(nextError)
    }
    const rejectInvocation = (nextError: unknown) => {
      if (!input.isRunActive())
        return
      appendStreamDebugLine('chat-stream.invoke-rejected', {
        elapsedMs: Date.now() - startedAt,
        lastEventType: lastEventType || null,
        reason: errorMessageFrom(nextError) ?? String(nextError),
      })
      rejectOnce(nextError)
    }

    void Promise.resolve(invokeStreamText({
      ...input.prepared.chatConfig,
      maxSteps: 10,
      messages: providerMessages,
      headers: input.headers,
      abortSignal: input.controller.signal,
      tools: input.prepared.tools,
      toolChoice: input.prepared.toolChoice,
      onEvent: async (event: any) => {
        const rawEventType = sanitizeText(event?.type)
        const eventType = normalizeMainGatewayStreamEventType(rawEventType)
        if (eventType)
          sawAnyEvent = true
        lastEventType = rawEventType || eventType

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

        if (eventType === 'text-delta') {
          if (!input.isRunActive())
            return
          fullText += readRawTextDelta(event)
          return
        }

        if (eventType === 'tool-call') {
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
            cardId: normalizedPayload.cardId,
            turnId: normalizedPayload.turnId,
            toolCallId: sanitizeText(event.toolCallId),
            toolName: observedToolName,
            arguments: typeof event.arguments === 'object' && event.arguments
              ? event.arguments as Record<string, unknown>
              : undefined,
          })
          return
        }

        if (eventType === 'tool-result') {
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
            cardId: normalizedPayload.cardId,
            turnId: normalizedPayload.turnId,
            toolCallId,
            result: event.result,
          })
          return
        }

        if (eventType === 'finish') {
          if (!input.isRunActive())
            return
          finishReason = sanitizeText(event.finishReason ?? event.finish_reason ?? event.reason, 'stop')
          appendStreamDebugLine('chat-stream.finish-event', {
            elapsedMs: Date.now() - startedAt,
            finishReason,
            fullTextChars: fullText.length,
          })
          if (
            input.prepared.waitForTools
            && (finishReason === 'tool_calls' || finishReason === 'tool-calls')
          ) {
            return
          }
          resolveOnce()
          return
        }

        if (eventType === 'error') {
          if (!input.isRunActive())
            return
          appendStreamDebugLine('chat-stream.error-event', {
            elapsedMs: Date.now() - startedAt,
            reason: errorMessageFrom(event.error) ?? String(event.error ?? 'chat stream error'),
          })
          rejectOnce(event.error ?? new Error('chat stream error'))
        }
      },
    }))
      .then(result => observeStreamTextResultErrors(result, rejectInvocation))
      .catch(rejectInvocation)
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

  const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
    prepared: input.prepared,
    mode: 'provider-stream',
    providerMindExecuted: true,
    reason: 'provider-stream',
  })
  const validation = validateAlicizationProviderSettlementPayload({
    fullText,
    prepared: input.prepared,
    allowPlainTextProviderReply: true,
  })
  const validatedPayload = validation.payload
  if (!validation.valid || !validatedPayload) {
    throw new AlicizationVisibleReplySettlementBlockedError(
      `provider-settlement-invalid:${validation.issues.join(',')}`,
      null,
    )
  }
  const visibleReplyRealization = await settleObservedReply({
    fullText,
    visibleText: validatedPayload.reply,
    visibleReplyExecution,
  })

  emitProviderVisibleReply(
    validatedPayload.reply,
    validatedPayload.memoryUsage,
  )
  appendStreamDebugLine('chat-stream.visible-release-after-closure', {
    elapsedMs: Date.now() - startedAt,
    visibleChars: validatedPayload.reply.length,
    closureStatus: visibleReplyRealization.closure?.status ?? null,
  })
  settleVisibleReplyLifecycle(visibleReplyRealization)

  return createProviderResult({
    finishReason,
    fullText,
    visibleReplyExecution,
    visibleReplyRealization,
    memoryUsage: validatedPayload.memoryUsage,
  })
}
