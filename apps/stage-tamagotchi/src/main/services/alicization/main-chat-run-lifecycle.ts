import type { Message } from '@xsai/shared-chat'

import type { AlicizationChatStartPayload } from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMainGatewayReachabilitySnapshot } from './main-gateway-health'
import type { AlicizationResolvedVisibleReply } from './main-chat-visible-reply-execution'
import type { MainGatewayResolvedConfig } from './runtime-soul'

function isAbortLikeError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

export type AlicizationMainChatTimeoutRecoveryMode
  = 'original'
    | 'tools-disabled'
    | 'non-streaming'
    | 'active-dialogue-local'
    | 'active-dialogue-deterministic'
    | 'active-dialogue-compact'
    | 'deterministic-required-tool'
    | 'local-fallback'
    | 'minimal-context-non-streaming'

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

function isMainGatewayRecoveryLivenessTag(tag: string) {
  return tag.includes('keepalive')
    || tag.includes('heartbeat')
    || tag.includes('metadata')
    || tag.includes('response-start')
    || tag.includes('stream-open')
}

function isNonHumanAuthoredRecoveredReply(reply: AlicizationResolvedVisibleReply) {
  const execution = reply.visibleReplyExecution
  return execution.mode === 'local-fallback'
    || execution.actualVisibleReplyAuthority === 'local-deterministic-fallback'
    || execution.providerMindExecuted === false
    || !reply.visibleText.trim()
}

export function deriveAlicizationTimeoutRecoveryMs(input: {
  baseTimeoutMs: number
  timeoutRecoveryMode: AlicizationMainChatTimeoutRecoveryMode
  nonProgressEventTypes: Set<string>
}) {
  const safeBaseTimeoutMs = Number.isFinite(input.baseTimeoutMs)
    ? Math.max(1_000, Math.floor(input.baseTimeoutMs))
    : 1_000
  const hasStreamLivenessSignals = [...input.nonProgressEventTypes]
    .map(eventType => sanitizeTimeoutDiagnosticSegment(eventType))
    .some(isMainGatewayRecoveryLivenessTag)
  if (!hasStreamLivenessSignals)
    return safeBaseTimeoutMs

  // NOTICE: If stream metadata/keepalive arrived before first content, the route is alive.
  // Fixed 12s recovery often re-times out for slower providers; extend recovery window to
  // keep timeout fallback from degenerating into deterministic double-timeout loops.
  const livenessFloorMs = input.timeoutRecoveryMode === 'minimal-context-non-streaming'
    ? 30_000
    : input.timeoutRecoveryMode === 'tools-disabled'
      ? 25_000
      : input.timeoutRecoveryMode === 'active-dialogue-compact'
        ? 12_000
      : 20_000
  return Math.max(safeBaseTimeoutMs, livenessFloorMs)
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

  if (input.timeoutRecoveryMode !== 'original')
    tags.push(`recovery-mode=${input.timeoutRecoveryMode}`)

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
  }) => Promise<{
    recoveredReply: AlicizationResolvedVisibleReply
    recoveryMode: AlicizationMainChatTimeoutRecoveryMode
  }>
  emitRecoveredText: (reply: AlicizationResolvedVisibleReply) => void | Promise<void>
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
      const effectiveTimeoutRecoveryMs = deriveAlicizationTimeoutRecoveryMs({
        baseTimeoutMs: input.timeoutRecoveryMs,
        timeoutRecoveryMode: input.timeoutRecoveryMode,
        nonProgressEventTypes: input.nonProgressEventTypes,
      })
      try {
        const recoveryResult = await input.recoverFromTimeout({
          chatConfig: input.chatConfig,
          messages: input.messages,
          headers: input.headers,
          tools: input.tools,
          toolChoice: input.toolChoice,
          timeoutMs: effectiveTimeoutRecoveryMs,
        })
        if (isNonHumanAuthoredRecoveredReply(recoveryResult.recoveredReply)) {
          const execution = recoveryResult.recoveredReply.visibleReplyExecution
          await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
            level: 'warning',
            category: 'alicization.main-gateway',
            action: 'stream-timeout-non-human-recovery-blocked',
            message: 'Blocked timeout recovery because it did not produce a provider-authored visible reply.',
            payload: {
              cardId: input.payload.cardId,
              turnId: input.payload.turnId,
              providerId: input.payload.providerId,
              model: input.payload.model,
              dispatchBound: input.dispatchBound,
              timeoutRecoveryMs: effectiveTimeoutRecoveryMs,
              timeoutRecoveryMode: recoveryResult.recoveryMode || input.timeoutRecoveryMode,
              visibleReplyMode: execution.mode,
              actualVisibleReplyAuthority: execution.actualVisibleReplyAuthority,
              providerMindExecuted: execution.providerMindExecuted,
              visibleChars: recoveryResult.recoveredReply.visibleText.length,
            },
          }))
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-non-human-blocked', {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            dispatchBound: input.dispatchBound,
            timeoutRecoveryMs: effectiveTimeoutRecoveryMs,
            timeoutRecoveryMode: recoveryResult.recoveryMode || input.timeoutRecoveryMode,
            visibleReplyMode: execution.mode,
            actualVisibleReplyAuthority: execution.actualVisibleReplyAuthority,
            providerMindExecuted: execution.providerMindExecuted,
            visibleChars: recoveryResult.recoveredReply.visibleText.length,
          })
          throw new Error(`main-gateway-timeout-recovery-non-human-authored:${execution.reason ?? execution.actualVisibleReplyAuthority ?? execution.mode}`)
        }
        const recoveredText = recoveryResult.recoveredReply.fullText
        const effectiveRecoveryMode = recoveryResult.recoveryMode || input.timeoutRecoveryMode
        if (recoveredText) {
          if (input.isRunActive())
            await input.emitRecoveredText(recoveryResult.recoveredReply)

          try {
            const reachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true })
            if (!reachability.reachable) {
              await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
                level: 'warning',
                category: 'alicization.main-gateway',
                action: 'stream-gateway-unreachable-advisory',
                message: 'Recovered the reply, but the main gateway probe is still unreachable.',
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
              await input.appendRuntimeDebugLine('chat-stream.gateway-unreachable-advisory', {
                cardId: input.payload.cardId,
                turnId: input.payload.turnId,
                dispatchBound: input.dispatchBound,
                cached: reachability.cached ?? false,
                code: reachability.code,
                reason: reachability.reason,
                timeoutRecoveryMs: effectiveTimeoutRecoveryMs,
                timeoutRecoveryMode: effectiveRecoveryMode,
                nonProgressEventTypes: [...input.nonProgressEventTypes],
              })
            }
          }
          catch {}

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
              timeoutRecoveryMs: effectiveTimeoutRecoveryMs,
              timeoutRecoveryMode: effectiveRecoveryMode,
              nonProgressEventTypes: [...input.nonProgressEventTypes],
            },
          }))

          await input.appendRuntimeDebugLine('chat-stream.timeout-recovered', {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            dispatchBound: input.dispatchBound,
            recoveredChars: recoveredText.length,
            timeoutRecoveryMs: effectiveTimeoutRecoveryMs,
            timeoutRecoveryMode: effectiveRecoveryMode,
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
        let gatewayUnreachableReason: string | undefined
        try {
          const reachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true })
          if (!reachability.reachable) {
            gatewayUnreachableReason = reachability.code ?? reachability.reason ?? 'gateway-unreachable'
            await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
              level: 'warning',
              category: 'alicization.main-gateway',
              action: 'stream-gateway-unreachable-advisory',
              message: 'Timeout path detected an unreachable main gateway; recovery fallback also failed.',
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
          }
        }
        catch {}
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
            timeoutRecoveryMs: effectiveTimeoutRecoveryMs,
            reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
            timeoutRecoveryMode: input.timeoutRecoveryMode,
            nonProgressEventTypes: [...input.nonProgressEventTypes],
          },
        }))
        await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          dispatchBound: input.dispatchBound,
          timeoutRecoveryMs: effectiveTimeoutRecoveryMs,
          reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
          timeoutRecoveryMode: input.timeoutRecoveryMode,
          nonProgressEventTypes: [...input.nonProgressEventTypes],
        })
        await input.finish({
          status: 'aborted',
          finishReason: buildTimeoutAbortFinishReason({
            dispatchBound: input.dispatchBound,
            nonProgressEventTypes: input.nonProgressEventTypes,
            gatewayUnreachableReason,
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
