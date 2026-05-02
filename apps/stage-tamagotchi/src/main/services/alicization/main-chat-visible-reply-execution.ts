import type { AlicizationVisibleReplyExecution, AlicizationVisibleReplyExecutionMode } from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'

import { looksLikeAlicizationStructuredPayloadText } from '@proj-alicization/stage-shared'

import { parseJsonObjectFromText } from './runtime-transport-content'

export interface AlicizationResolvedVisibleReply {
  fullText: string
  visibleText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}

function resolvePreparedReplyExecutionPlan(prepared: AlicizationPreparedMainChatExecutionResult) {
  if (prepared.mindTurnContract) {
    return {
      preferredMode: prepared.mindTurnContract.replyRealizationMode === 'fallback-locally-allowed'
        ? 'local-fallback'
        : prepared.hasVisualGrounding
          ? 'provider-one-shot'
          : 'provider-stream',
      expectedVisibleReplyAuthority: prepared.mindTurnContract.expectedVisibleReplyAuthority,
      reason: 'mind-turn-contract',
    } as const
  }
  return prepared.replyExecutionPlan
    ?? prepared.runtimeSurface.replyExecutionPlan
    ?? null
}

function resolvePreparedVisibleReplyAuthority(prepared: AlicizationPreparedMainChatExecutionResult) {
  if (prepared.mindTurnContract)
    return prepared.mindTurnContract.expectedVisibleReplyAuthority
  return prepared.replyRealization?.expectedVisibleReplyAuthority
    ?? prepared.runtimeSurface.replyAuthority?.expectedVisibleReplyAuthority
    ?? prepared.governance?.visibleReplyAuthority
    ?? 'llm-mind'
}

export function createAlicizationVisibleReplyExecution(input: {
  mode: AlicizationVisibleReplyExecutionMode
  expectedVisibleReplyAuthority: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  providerMindExecuted?: boolean
  reason?: string | null
}): AlicizationVisibleReplyExecution {
  const providerMindExecuted = input.providerMindExecuted ?? input.mode !== 'local-fallback'
  const actualVisibleReplyAuthority = input.actualVisibleReplyAuthority
    ?? (providerMindExecuted
      ? input.expectedVisibleReplyAuthority
      : input.mode === 'local-fallback'
        ? 'local-deterministic-fallback'
        : null)

  return {
    mode: input.mode,
    expectedVisibleReplyAuthority: input.expectedVisibleReplyAuthority ?? null,
    actualVisibleReplyAuthority: actualVisibleReplyAuthority ?? null,
    providerMindExecuted,
    reason: input.reason ?? null,
  }
}

export function resolveAlicizationPreparedVisibleReplyExecution(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  mode?: AlicizationVisibleReplyExecutionMode
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  providerMindExecuted?: boolean
  reason?: string | null
}): AlicizationVisibleReplyExecution {
  const plan = resolvePreparedReplyExecutionPlan(input.prepared)
  const expectedVisibleReplyAuthority = plan?.expectedVisibleReplyAuthority
    ?? resolvePreparedVisibleReplyAuthority(input.prepared)
  const mode = input.mode
    ?? plan?.preferredMode
    ?? (input.prepared.hasVisualGrounding ? 'provider-one-shot' : 'provider-stream')

  return createAlicizationVisibleReplyExecution({
    mode,
    expectedVisibleReplyAuthority,
    actualVisibleReplyAuthority: input.actualVisibleReplyAuthority,
    providerMindExecuted: input.providerMindExecuted,
    reason: input.reason ?? plan?.reason ?? null,
  })
}

export function deriveAlicizationVisibleReplyText(rawText: string) {
  const normalizedText = typeof rawText === 'string'
    ? rawText.trim()
    : ''
  if (!normalizedText)
    return ''

  const parsed = parseJsonObjectFromText(normalizedText)
  const structuredReply = typeof parsed?.reply === 'string'
    ? parsed.reply.trim()
    : ''
  if (structuredReply)
    return structuredReply

  return looksLikeAlicizationStructuredPayloadText(normalizedText)
    ? ''
    : normalizedText
}

export function buildAlicizationResolvedVisibleReply(input: {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}): AlicizationResolvedVisibleReply {
  return {
    fullText: input.fullText,
    visibleText: deriveAlicizationVisibleReplyText(input.fullText) || input.fullText,
    visibleReplyExecution: input.visibleReplyExecution,
  }
}

export function resolveAlicizationTimeoutRecoveredVisibleReply(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  recoveredText: string
  recoveryMode: string
}): AlicizationResolvedVisibleReply {
  const localFallback = input.recoveryMode === 'local-fallback'
  return buildAlicizationResolvedVisibleReply({
    fullText: input.recoveredText,
    visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
      prepared: input.prepared,
      mode: localFallback ? 'local-fallback' : 'provider-one-shot',
      actualVisibleReplyAuthority: localFallback
        ? 'local-deterministic-fallback'
        : undefined,
      providerMindExecuted: !localFallback,
      reason: localFallback
        ? 'timeout-recovered-local-fallback'
        : `timeout-recovered-${input.recoveryMode}`,
    }),
  })
}
