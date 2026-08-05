import type { AlicizationChatFailureSurface } from '@proj-alicization/stage-shared'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { MainGatewayResolvedConfig } from './runtime-soul'

import {
  isAlicizationProviderSchemaUnsupportedError,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'

import { readTransportContentAsText } from './runtime-transport-content'
import { AlicizationVisibleReplySettlementBlockedError } from './visible-reply/settlement'

function isAbortLikeError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

export function normalizeAlicizationMainChatAbortReason(reason: unknown) {
  const normalized = String(reason ?? 'abort')
  return normalized.includes('chat-first-event-timeout')
    ? 'chat-first-event-timeout'
    : 'abort'
}

export function shouldRecordAlicizationMainGatewayGenerationTimeout(reason: unknown) {
  if (
    typeof reason === 'object'
    && reason !== null
    && 'name' in reason
    && String((reason as { name?: unknown }).name).toLowerCase() === 'aborterror'
  ) {
    return true
  }

  const normalized = String(reason instanceof Error ? reason.message : reason ?? '')
    .trim()
    .toLowerCase()

  return normalized.includes('timeout')
    || normalized.includes('timed out')
    || normalized.includes('main-gateway-timeout-recovery')
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
    status: 'completed' | 'aborted' | 'failed'
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
  status: 'aborted' | 'failed'
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

  const aborted = isAbortLikeError(input.error) || input.controller.signal.aborted
  if (aborted) {
    const abortReasonText = String(input.controller.signal.reason ?? reason ?? 'abort')
    const normalizedAbortReason = normalizeAlicizationMainChatAbortReason(abortReasonText)
    if (normalizedAbortReason !== 'chat-first-event-timeout') {
      await input.finish({
        status: 'aborted',
        finishReason: normalizedAbortReason,
      })
      return
    }

    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'timeout',
      userText: currentUserText,
    })
    if (shouldRecordAlicizationMainGatewayGenerationTimeout(input.error)) {
      await Promise.resolve(
        input.recordMainGatewayGenerationTimeout(input.mainGateway, input.error),
      )
    }
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
      finishReason: buildTimeoutAbortFinishReason({
        dispatchBound: input.dispatchBound,
        nonProgressEventTypes: input.nonProgressEventTypes,
      }),
      status: 'aborted',
      options: input,
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
