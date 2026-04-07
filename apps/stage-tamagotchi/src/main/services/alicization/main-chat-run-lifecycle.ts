import type { Message } from '@xsai/shared-chat'

import type { AlicizationChatStartPayload } from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMainGatewayReachabilitySnapshot } from './main-gateway-health'
import type { MainGatewayResolvedConfig } from './runtime-soul'

function isAbortLikeError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

export type AlicizationMainChatTimeoutRecoveryMode = 'original' | 'tools-disabled'

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

function sanitizeTimeoutDiagnosticSegment(raw: unknown) {
  const normalized = String(raw ?? '')
    .trim()
    .replace(/^Alicization runtime aborted:\s*/i, '')
    .replace(/^error:\s*/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized.slice(0, 80)
}

function buildTimeoutAbortFinishReason(input: {
  dispatchBound: boolean
  nonProgressEventTypes: Set<string>
  gatewayUnreachableReason?: string
  recoveryFailureReason?: string
  timeoutRecoveryMode: AlicizationMainChatTimeoutRecoveryMode
}) {
  const tags: string[] = []

  if (input.dispatchBound)
    tags.push('after-dispatch-meta')

  if (input.timeoutRecoveryMode === 'tools-disabled')
    tags.push('recovery-mode=tools-disabled')

  const normalizedNonProgress = [...input.nonProgressEventTypes]
    .map(eventType => sanitizeTimeoutDiagnosticSegment(eventType))
    .filter(Boolean)
    .slice(0, 3)
  if (normalizedNonProgress.length > 0)
    tags.push(`non-progress=${normalizedNonProgress.join(',')}`)

  const normalizedGatewayUnreachable = sanitizeTimeoutDiagnosticSegment(input.gatewayUnreachableReason)
  if (normalizedGatewayUnreachable)
    tags.push(`gateway-unreachable=${normalizedGatewayUnreachable}`)

  const normalizedRecoveryFailure = sanitizeTimeoutDiagnosticSegment(input.recoveryFailureReason)
  if (normalizedRecoveryFailure)
    tags.push(`recovery-failed=${normalizedRecoveryFailure}`)

  return tags.length > 0
    ? `chat-first-event-timeout|${tags.join('|')}`
    : 'chat-first-event-timeout'
}

interface HandleAlicizationMainChatRunFailureOptions {
  error: unknown
  prepared: AlicizationPreparedMainChatExecutionResult | null
  controller: AbortController
  mainGateway: MainGatewayResolvedConfig
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']> | null
  messages: Message[]
  headers?: Record<string, string>
  tools: AlicizationPreparedMainChatExecutionResult['tools']
  toolChoice: AlicizationPreparedMainChatExecutionResult['toolChoice']
  timeoutRecoveryMode: AlicizationMainChatTimeoutRecoveryMode
  timeoutRecoveryMs: number
  payload: Pick<AlicizationChatStartPayload, 'cardId' | 'turnId' | 'providerId' | 'model'>
  dispatchBound: boolean
  nonProgressEventTypes: Set<string>
  isRunActive: () => boolean
  ensureMainGatewayReachable: (mainGateway: MainGatewayResolvedConfig, options?: {
    bypassCache?: boolean
  }) => Promise<AlicizationMainGatewayReachabilitySnapshot>
  recordMainGatewayGenerationTimeout: (mainGateway: MainGatewayResolvedConfig, reason: unknown) => void | Promise<void>
  recoverFromTimeout: (input: {
    chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
    messages: Message[]
    headers?: Record<string, string>
    tools: AlicizationPreparedMainChatExecutionResult['tools']
    toolChoice: AlicizationPreparedMainChatExecutionResult['toolChoice']
    timeoutMs: number
  }) => Promise<string>
  emitRecoveredText: (text: string) => void | Promise<void>
  emitError: (reason: string) => void | Promise<void>
  finish: (payload: {
    status: 'completed' | 'aborted' | 'failed'
    finishReason: string
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

export async function handleAlicizationMainChatRunFailure(input: HandleAlicizationMainChatRunFailureOptions) {
  const reason = input.error instanceof Error ? input.error.message : String(input.error)

  if (!input.prepared) {
    await input.emitError(reason)
    await input.finish({
      status: 'failed',
      finishReason: 'prepare-failed',
      error: reason,
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

    if (normalizedAbortReason === 'chat-first-event-timeout' && input.chatConfig) {
      const reachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true })
      if (!reachability.reachable) {
        const unreachableReason = reachability.code ?? reachability.reason ?? 'gateway-unreachable'
        await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'stream-gateway-unreachable',
          message: 'Timeout path detected an unreachable main gateway; recovery was skipped.',
          payload: {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            providerId: input.payload.providerId,
            model: input.payload.model,
            dispatchBound: input.dispatchBound,
            cached: reachability.cached ?? false,
            code: reachability.code,
            reason: reachability.reason,
          },
        }))
        await input.appendRuntimeDebugLine('chat-stream.gateway-unreachable', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          dispatchBound: input.dispatchBound,
          cached: reachability.cached ?? false,
          code: reachability.code,
          reason: reachability.reason ?? reachability.formattedReason,
          timeoutRecoveryMode: input.timeoutRecoveryMode,
          nonProgressEventTypes: [...input.nonProgressEventTypes],
        })
        await input.finish({
          status: 'aborted',
          finishReason: buildTimeoutAbortFinishReason({
            dispatchBound: input.dispatchBound,
            nonProgressEventTypes: input.nonProgressEventTypes,
            gatewayUnreachableReason: unreachableReason,
            timeoutRecoveryMode: input.timeoutRecoveryMode,
          }),
        })
        return
      }

      try {
        const recoveredText = await input.recoverFromTimeout({
          chatConfig: input.chatConfig,
          messages: input.messages,
          headers: input.headers,
          tools: input.tools,
          toolChoice: input.toolChoice,
          timeoutMs: input.timeoutRecoveryMs,
        })
        if (recoveredText) {
          if (input.isRunActive())
            await input.emitRecoveredText(recoveredText)

          await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
            level: 'warning',
            category: 'alicization.main-gateway',
            action: 'stream-timeout-recovered',
            message: 'Recovered chat turn via one-shot generation after stream first-event timeout.',
            payload: {
              cardId: input.payload.cardId,
              turnId: input.payload.turnId,
              providerId: input.payload.providerId,
              model: input.payload.model,
              dispatchBound: input.dispatchBound,
              recoveredChars: recoveredText.length,
              timeoutRecoveryMode: input.timeoutRecoveryMode,
              nonProgressEventTypes: [...input.nonProgressEventTypes],
            },
          }))

          await input.appendRuntimeDebugLine('chat-stream.timeout-recovered', {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            dispatchBound: input.dispatchBound,
            recoveredChars: recoveredText.length,
            timeoutRecoveryMode: input.timeoutRecoveryMode,
            nonProgressEventTypes: [...input.nonProgressEventTypes],
          })
          await input.finish({
            status: 'completed',
            finishReason: 'timeout-recovered',
            fullText: recoveredText,
          })
          return
        }
      }
      catch (recoveryError) {
        if (shouldRecordAlicizationMainGatewayGenerationTimeout(recoveryError))
          await Promise.resolve(input.recordMainGatewayGenerationTimeout(input.mainGateway, recoveryError))
        await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'stream-timeout-recovery-failed',
          message: 'Timeout recovery attempt failed; emitting aborted finish.',
          payload: {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            providerId: input.payload.providerId,
            model: input.payload.model,
            dispatchBound: input.dispatchBound,
            reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
            timeoutRecoveryMode: input.timeoutRecoveryMode,
            nonProgressEventTypes: [...input.nonProgressEventTypes],
          },
        }))
        await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          dispatchBound: input.dispatchBound,
          reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
          timeoutRecoveryMode: input.timeoutRecoveryMode,
          nonProgressEventTypes: [...input.nonProgressEventTypes],
        })
        await input.finish({
          status: 'aborted',
          finishReason: buildTimeoutAbortFinishReason({
            dispatchBound: input.dispatchBound,
            nonProgressEventTypes: input.nonProgressEventTypes,
            recoveryFailureReason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
            timeoutRecoveryMode: input.timeoutRecoveryMode,
          }),
        })
        return
      }
    }

    await input.finish({
      status: 'aborted',
      finishReason: normalizedAbortReason === 'chat-first-event-timeout'
        ? buildTimeoutAbortFinishReason({
            dispatchBound: input.dispatchBound,
            nonProgressEventTypes: input.nonProgressEventTypes,
            timeoutRecoveryMode: input.timeoutRecoveryMode,
          })
        : normalizedAbortReason,
    })
    return
  }

  await input.emitError(reason)
  await input.finish({
    status: 'failed',
    finishReason: 'error',
    error: reason,
  })
  await input.appendRuntimeDebugLine('chat-stream.failed', {
    cardId: input.payload.cardId,
    turnId: input.payload.turnId,
    reason,
  })
}
