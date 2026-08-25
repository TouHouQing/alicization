import type { AlicizationChatFailureSurface } from '@proj-alicization/stage-shared'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { MainGatewayResolvedConfig } from './runtime-soul'

import {
  extractAlicizationProviderRequestFailure,
  extractAlicizationToolExecutionFailure,
  isAlicizationProviderSchemaUnsupportedError,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'

import { readTransportContentAsText } from './runtime-transport-content'
import {
  readAlicizationRuntimeTimeoutDescriptor,
  resolveAlicizationRuntimeTimeoutReason,
} from './turn-os/runtime-errors'
import { AlicizationVisibleReplySettlementBlockedError } from './visible-reply/settlement'

function isAbortLikeError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

function resolveMainChatBoundaryTimeoutReason(reason: unknown) {
  return resolveAlicizationRuntimeTimeoutReason(reason)
}

const externalTransportTimeoutCodes = new Set([
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
])

function isExplicitExternalTransportTimeout(reason: unknown) {
  const visited = new Set<object>()
  let current: unknown = reason
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== 'object')
      return false
    if (visited.has(current))
      return false
    visited.add(current)

    const record = current as Record<string, unknown>
    const code = String(record.code ?? record.errorCode ?? '').trim().toUpperCase()
    if (externalTransportTimeoutCodes.has(code))
      return true

    const message = current instanceof Error
      ? current.message
      : String(record.message ?? '')
    if (
      /\b(?:request|connect(?:ion)?|headers?|socket)\s+(?:timed?\s*out|timeout)\b/iu.test(message)
      || /\b(?:timed?\s*out|timeout)\s+(?:while\s+)?(?:requesting|connecting|reading\s+headers|waiting\s+for\s+(?:the\s+)?(?:request|connection|socket))\b/iu.test(message)
    ) {
      return true
    }

    current = record.cause
  }
  return false
}

export function normalizeAlicizationMainChatAbortReason(reason: unknown) {
  const timeoutReason = resolveMainChatBoundaryTimeoutReason(reason)
  if (timeoutReason)
    return timeoutReason

  return 'abort'
}

export function shouldRecordAlicizationMainGatewayGenerationTimeout(reason: unknown) {
  const normalizedTimeoutReason = normalizeAlicizationMainChatAbortReason(reason)
  if (normalizedTimeoutReason !== 'abort') {
    return normalizedTimeoutReason === 'chat-first-event-timeout'
      || normalizedTimeoutReason === 'chat-provider-liveness-timeout'
      || normalizedTimeoutReason === 'chat-provider-idle-timeout'
      || normalizedTimeoutReason === 'chat-provider-continuation-timeout'
      || normalizedTimeoutReason === 'chat-provider-retry-deadline'
      || normalizedTimeoutReason === 'main-gateway-attempt-timeout'
      || normalizedTimeoutReason === 'main-gateway-timeout'
      || normalizedTimeoutReason === 'main-gateway-timeout-recovery'
      || normalizedTimeoutReason === 'main-gateway-visual-one-shot-timeout'
  }

  return isExplicitExternalTransportTimeout(reason)
}

export function isProviderSchemaUnsupportedError(error: unknown) {
  return isAlicizationProviderSchemaUnsupportedError(error)
}

function sanitizeTimeoutDiagnosticSegment(raw: unknown) {
  return String(raw ?? '')
    .trim()
    .replace(/^Alicization runtime aborted:\s*/i, '')
    .replace(/^error:\s*/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function buildTimeoutAbortFinishReason(input: {
  dispatchBound: boolean
  nonProgressEventTypes: Set<string>
}) {
  const tags: string[] = []
  if (input.dispatchBound)
    tags.push('after-dispatch-meta')

  const normalizedNonProgress = [...input.nonProgressEventTypes]
    .map(eventType => sanitizeTimeoutDiagnosticSegment(eventType))
    .filter(Boolean)
    .slice(0, 3)
  if (normalizedNonProgress.length > 0)
    tags.push(`non-progress=${normalizedNonProgress.join(',')}`)

  return tags.length > 0
    ? `chat-first-event-timeout|${tags.join('|')}`
    : 'chat-first-event-timeout'
}

interface HandleAlicizationMainChatRunFailureOptions {
  error: unknown
  prepared: AlicizationPreparedMainChatExecutionResult | null
  controller: AbortController
  mainGateway: MainGatewayResolvedConfig
  payload: Pick<AlicizationChatStartPayload, 'cardId' | 'turnId' | 'providerId' | 'model' | 'messages'>
  dispatchBound: boolean
  nonProgressEventTypes: Set<string>
  recordMainGatewayGenerationTimeout: (
    mainGateway: MainGatewayResolvedConfig,
    reason: unknown,
  ) => void | Promise<void>
  emitError: (
    reason: string,
    metadata?: Pick<AlicizationChatErrorEvent, 'origin' | 'learningPolicy' | 'failureSurface'>,
  ) => void | Promise<void>
  finish: (payload: {
    status: 'completed' | 'aborted' | 'timed-out' | 'failed'
    finishReason: string
    origin?: AlicizationChatFinishEvent['origin']
    learningPolicy?: AlicizationChatFinishEvent['learningPolicy']
    failureSurface?: AlicizationChatFinishEvent['failureSurface']
    fullText?: string
    error?: string
  }) => void | Promise<void>
  appendRuntimeDebugLine: (event: string, payload: Record<string, unknown>) => Promise<void>
  queueScopedAuditLog: (cardId: string, input: {
    level: 'warning' | 'notice'
    category: string
    action: string
    message: string
    payload: Record<string, unknown>
  }) => Promise<void> | void
}

function buildFailureMetadata(failureSurface: AlicizationChatFailureSurface) {
  return {
    origin: failureSurface.origin,
    learningPolicy: {
      allowLongTermCondensation: failureSurface.allowLongTermCondensation,
      allowPersonaLearning: failureSurface.allowPersonaLearning,
      allowTraining: failureSurface.allowTraining,
    },
    failureSurface,
  } as const
}

async function emitFailureSurface(input: {
  failureSurface: AlicizationChatFailureSurface
  finishReason: string
  status: 'aborted' | 'timed-out' | 'failed'
  options: HandleAlicizationMainChatRunFailureOptions
}) {
  const metadata = buildFailureMetadata(input.failureSurface)
  await input.options.emitError(input.failureSurface.reply, metadata)
  await input.options.finish({
    status: input.status,
    finishReason: input.finishReason,
    error: input.failureSurface.reply,
    ...metadata,
  })
}

export async function handleAlicizationMainChatRunFailure(
  input: HandleAlicizationMainChatRunFailureOptions,
) {
  const reason = input.error instanceof Error ? input.error.message : String(input.error)
  const userText = [...input.payload.messages]
    .reverse()
    .find(message => message.role === 'user')
  const currentUserText = readTransportContentAsText(userText?.content).trim()
  const toolExecution = extractAlicizationToolExecutionFailure(input.error)
    ?? extractAlicizationToolExecutionFailure(input.controller.signal.reason)

  const aborted = isAbortLikeError(input.error) || input.controller.signal.aborted
  if (aborted && !toolExecution) {
    const abortReason = input.controller.signal.aborted
      ? input.controller.signal.reason
      : input.error
    const normalizedAbortReason = normalizeAlicizationMainChatAbortReason(abortReason)
    const preparationTimeout = normalizedAbortReason === 'chat-preparation-timeout'
    const providerLivenessTimeout = normalizedAbortReason === 'chat-provider-liveness-timeout'
    const providerIdleTimeout = normalizedAbortReason === 'chat-provider-idle-timeout'
    const continuationTimeout = normalizedAbortReason === 'chat-provider-continuation-timeout'
    const retryDeadlineTimeout = normalizedAbortReason === 'chat-provider-retry-deadline'
    const toolResultHandoffTimeout = normalizedAbortReason === 'chat-tool-result-handoff-timeout'
    const mainGatewayTimeout = normalizedAbortReason === 'main-gateway-attempt-timeout'
      || normalizedAbortReason === 'main-gateway-timeout'
      || normalizedAbortReason === 'main-gateway-timeout-recovery'
      || normalizedAbortReason === 'main-gateway-visual-one-shot-timeout'
    const recognizedTimeout = normalizedAbortReason === 'chat-first-event-timeout'
      || preparationTimeout
      || providerLivenessTimeout
      || providerIdleTimeout
      || continuationTimeout
      || retryDeadlineTimeout
      || toolResultHandoffTimeout
      || mainGatewayTimeout
    if (!recognizedTimeout) {
      await input.finish({
        status: 'aborted',
        finishReason: normalizedAbortReason,
      })
      return
    }

    const timeoutDescriptor = readAlicizationRuntimeTimeoutDescriptor(abortReason)
      ?? readAlicizationRuntimeTimeoutDescriptor(input.error)
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: continuationTimeout ? 'provider-continuation-timeout' : 'timeout',
      userText: currentUserText,
      timeout: {
        providerId: input.payload.providerId || input.mainGateway.providerId,
        model: input.payload.model || input.mainGateway.model,
        ...(retryDeadlineTimeout || mainGatewayTimeout || providerLivenessTimeout || providerIdleTimeout
          ? { timeoutReason: normalizedAbortReason }
          : {}),
        phase: toolResultHandoffTimeout
          ? 'tool-result-handoff'
          : continuationTimeout
            ? 'provider-continuation'
            : providerIdleTimeout
              ? 'provider-continuation'
              : preparationTimeout
                ? 'preparation'
                : 'provider-first-event',
        ...(timeoutDescriptor
          ? {
              timeoutPhase: timeoutDescriptor.timeoutPhase,
              timeoutStage: timeoutDescriptor.timeoutStage,
              timeoutMs: timeoutDescriptor.timeoutMs,
              elapsedMs: timeoutDescriptor.elapsedMs,
              lastEventType: timeoutDescriptor.lastEventType,
              sawAnyEvent: timeoutDescriptor.sawAnyEvent,
              sawProgress: timeoutDescriptor.sawProgress,
              descriptor: timeoutDescriptor,
            }
          : {}),
      },
    })
    if (shouldRecordAlicizationMainGatewayGenerationTimeout(abortReason)) {
      await Promise.resolve(
        input.recordMainGatewayGenerationTimeout(input.mainGateway, abortReason),
      )
    }
    const retryDeadlineFailure = retryDeadlineTimeout
    await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
      level: 'warning',
      category: 'alicization.main-gateway',
      action: toolResultHandoffTimeout
        ? 'tool-result-handoff-timeout-failed'
        : preparationTimeout
          ? 'preparation-timeout-failed'
          : providerLivenessTimeout
            ? 'provider-liveness-timeout-failed'
            : providerIdleTimeout
              ? 'provider-idle-timeout-failed'
              : continuationTimeout
                ? 'provider-continuation-timeout-failed'
                : retryDeadlineFailure
                  ? 'provider-retry-deadline-failed'
                  : mainGatewayTimeout
                    ? 'main-gateway-timeout-failed'
                    : 'stream-timeout-failed',
      message: toolResultHandoffTimeout
        ? 'The tool result could not be handed back to the Provider before the handoff deadline.'
        : preparationTimeout
          ? 'Dialogue preparation timed out before the Provider stream started.'
          : providerLivenessTimeout
            ? 'The Provider emitted transport activity but no semantic progress before the liveness deadline.'
            : providerIdleTimeout
              ? 'The Provider stopped emitting events after semantic progress before the idle deadline.'
              : continuationTimeout
                ? 'The tool completed, but the Provider timed out before producing the final reply.'
                : retryDeadlineFailure
                  ? 'The Provider retry deadline expired before a reply could be produced.'
                  : mainGatewayTimeout
                    ? 'The main gateway timed out before a reply could be produced.'
                    : 'The Provider stream timed out; no local or one-shot dialogue recovery was attempted.',
      payload: {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        providerId: input.payload.providerId,
        model: input.payload.model,
        dispatchBound: input.dispatchBound,
        nonProgressEventTypes: [...input.nonProgressEventTypes],
        ...(timeoutDescriptor ? { timeoutDescriptor } : {}),
      },
    }))
    await input.appendRuntimeDebugLine(
      toolResultHandoffTimeout
        ? 'chat-stream.tool-result-handoff-timeout-failed'
        : preparationTimeout
          ? 'chat-stream.preparation-timeout-failed'
          : providerLivenessTimeout
            ? 'chat-stream.provider-liveness-timeout-failed'
            : providerIdleTimeout
              ? 'chat-stream.provider-idle-timeout-failed'
              : continuationTimeout
                ? 'chat-stream.provider-continuation-timeout-failed'
                : retryDeadlineFailure
                  ? 'chat-stream.provider-retry-deadline-failed'
                  : mainGatewayTimeout
                    ? 'chat-stream.main-gateway-timeout-failed'
                    : 'chat-stream.timeout-failed',
      {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        dispatchBound: input.dispatchBound,
        nonProgressEventTypes: [...input.nonProgressEventTypes],
        ...(timeoutDescriptor ? { timeoutDescriptor } : {}),
      },
    )
    await emitFailureSurface({
      failureSurface,
      finishReason: toolResultHandoffTimeout
        ? 'chat-tool-result-handoff-timeout'
        : preparationTimeout
          ? 'chat-preparation-timeout'
          : providerLivenessTimeout
            ? 'chat-provider-liveness-timeout'
            : providerIdleTimeout
              ? 'chat-provider-idle-timeout'
              : continuationTimeout
                ? 'chat-provider-continuation-timeout'
                : retryDeadlineFailure
                  ? 'chat-provider-retry-deadline'
                  : mainGatewayTimeout
                    ? normalizedAbortReason
                    : buildTimeoutAbortFinishReason({
                        dispatchBound: input.dispatchBound,
                        nonProgressEventTypes: input.nonProgressEventTypes,
                      }),
      status: 'timed-out',
      options: input,
    })
    return
  }

  if (!aborted && !toolExecution && isExplicitExternalTransportTimeout(input.error)) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'timeout',
      userText: currentUserText,
      timeout: {
        providerId: input.payload.providerId || input.mainGateway.providerId,
        model: input.payload.model || input.mainGateway.model,
        phase: 'provider-first-event',
      },
    })
    await Promise.resolve(
      input.recordMainGatewayGenerationTimeout(input.mainGateway, input.error),
    )
    await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
      level: 'warning',
      category: 'alicization.main-gateway',
      action: 'stream-timeout-failed',
      message: 'The Provider stream timed out; no local or one-shot dialogue recovery was attempted.',
      payload: {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        providerId: input.payload.providerId,
        model: input.payload.model,
        dispatchBound: input.dispatchBound,
        nonProgressEventTypes: [...input.nonProgressEventTypes],
      },
    }))
    await input.appendRuntimeDebugLine('chat-stream.timeout-failed', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      dispatchBound: input.dispatchBound,
      nonProgressEventTypes: [...input.nonProgressEventTypes],
    })
    await emitFailureSurface({
      failureSurface,
      finishReason: 'provider-transport-timeout',
      status: 'timed-out',
      options: input,
    })
    return
  }

  if (reason.includes('chat-provider-continuation-incomplete')) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'provider-continuation-incomplete',
      userText: currentUserText,
    })
    await emitFailureSurface({
      failureSurface,
      finishReason: 'provider-continuation-incomplete',
      status: 'failed',
      options: input,
    })
    await input.appendRuntimeDebugLine('chat-stream.provider-continuation-incomplete', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
    })
    return
  }

  if (isProviderSchemaUnsupportedError(input.error)) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'provider-schema-unsupported',
      userText: currentUserText,
    })
    await emitFailureSurface({
      failureSurface,
      finishReason: 'provider-schema-unsupported',
      status: 'failed',
      options: input,
    })
    await input.appendRuntimeDebugLine('chat-stream.provider-schema-unsupported', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      reason,
    })
    return
  }

  if (toolExecution) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'tool-execution',
      userText: currentUserText,
      toolExecution,
    })
    await emitFailureSurface({
      failureSurface,
      finishReason: 'tool-execution',
      status: 'failed',
      options: input,
    })
    await input.queueScopedAuditLog(input.payload.cardId, {
      level: 'warning',
      category: 'alicization.tool',
      action: 'tool-execution-failed',
      message: 'A tool execution failure was surfaced without generating a persona fallback.',
      payload: {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        toolName: toolExecution.toolName,
        code: toolExecution.code,
        message: toolExecution.message,
      },
    })
    await input.appendRuntimeDebugLine('chat-stream.tool-execution-failed', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      toolName: toolExecution.toolName,
      code: toolExecution.code,
      message: toolExecution.message,
    })
    return
  }

  const providerRequest = extractAlicizationProviderRequestFailure(input.error)
  if (providerRequest) {
    const failureKind = providerRequest.status === 401 || providerRequest.status === 403
      ? 'provider-auth'
      : 'provider-request'
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: failureKind,
      userText: currentUserText,
      ...(failureKind === 'provider-request'
        ? {
            providerRequest: {
              ...providerRequest,
              providerId: input.mainGateway.providerId,
              model: input.mainGateway.model,
            },
          }
        : {}),
    })
    await emitFailureSurface({
      failureSurface,
      finishReason: failureKind,
      status: 'failed',
      options: input,
    })
    await input.appendRuntimeDebugLine('chat-stream.provider-request-failed', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      providerId: input.mainGateway.providerId,
      model: input.mainGateway.model,
      status: providerRequest.status,
      code: providerRequest.code,
      message: providerRequest.message,
    })
    return
  }

  if (!input.prepared) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'stream-failure',
      userText: currentUserText,
    })
    await emitFailureSurface({
      failureSurface,
      finishReason: 'prepare-failed',
      status: 'failed',
      options: input,
    })
    await input.appendRuntimeDebugLine('chat-start.prepare-failed', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      reason,
    })
    return
  }

  if (input.error instanceof AlicizationVisibleReplySettlementBlockedError) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: input.error.failureSurface.kind,
      userText: currentUserText,
    })
    await emitFailureSurface({
      failureSurface,
      finishReason: 'provider-output-invalid',
      status: 'failed',
      options: input,
    })
    await input.appendRuntimeDebugLine('chat-stream.provider-output-invalid', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      reason,
    })
    return
  }

  const failureSurface = resolveAlicizationChatFailureSurface({
    kind: 'stream-failure',
    userText: currentUserText,
  })
  await emitFailureSurface({
    failureSurface,
    finishReason: 'error',
    status: 'failed',
    options: input,
  })
  await input.appendRuntimeDebugLine('chat-stream.failed', {
    cardId: input.payload.cardId,
    turnId: input.payload.turnId,
    reason,
  })
}
