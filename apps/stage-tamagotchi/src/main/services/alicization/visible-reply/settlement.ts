import type {
  AlicizationProviderMemoryUsage,
  AlicizationProviderResponsePayload,
} from '@proj-alicization/stage-shared'

import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationVisibleReplyClosureResult } from './closure-orchestrator'
import type {
  AlicizationResolvedVisibleReply,
  AlicizationVisibleReplyClosureArtifact,
  AlicizationVisibleReplyRealizationArtifact,
} from './realization-engine'

import {
  alicizationEmotionWhitelist,
  alicizationPerformanceDeliveryWhitelist,
  looksLikeAlicizationStructuredPayloadText,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'

import { parseJsonObjectFromText } from '../runtime-transport-content'
import {
  AlicizationVisibleReplyClosureBlockedError,
  closeAlicizationVisibleReply,
} from './closure-orchestrator'

const providerPayloadFields = [
  'format',
  'thought',
  'emotion',
  'reply',
  'performance',
  'memoryUsage',
] as const

const providerPerformanceFields = [
  'baseEmotion',
  'facialCue',
  'actionCue',
  'delivery',
  'emphasis',
] as const

const providerMemoryUsageFields = [
  'workingMemoryVersion',
  'longTermEvidenceIds',
] as const

const embeddedStructuredEnvelopePattern
  = /"format"\s*:\s*"mind-turn-v1"|"(?:thought|emotion|reply|performance|memoryUsage|digitalLife|runtimeDigest)"\s*:/iu

export interface AlicizationVisibleReplySettlementDraft {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}

export interface AlicizationVisibleReplySettlementResult extends AlicizationResolvedVisibleReply {
  closureResult: AlicizationVisibleReplyClosureResult
}

export class AlicizationVisibleReplySettlementBlockedError extends Error {
  readonly failureSurface = resolveAlicizationChatFailureSurface({
    kind: 'structured-contract',
  })

  constructor(message: string, readonly closure: AlicizationVisibleReplyClosureArtifact | null) {
    super(message)
    this.name = 'AlicizationVisibleReplySettlementBlockedError'
  }
}

export function validateAlicizationProviderMemoryUsage(input: {
  memoryUsage: AlicizationProviderMemoryUsage
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const memoryContext = input.prepared.memoryContext
  if (!memoryContext) {
    return {
      valid: true,
      workingMemoryVersionMatches: true,
      unknownEvidenceIds: [],
    }
  }

  const workingMemoryVersionMatches
    = input.memoryUsage.workingMemoryVersion
      === memoryContext.workingMemory.version
  const allowedEvidenceIds = new Set(
    memoryContext.availableLongTermEvidenceIds,
  )
  const unknownEvidenceIds = input.memoryUsage.longTermEvidenceIds
    .filter(id => !allowedEvidenceIds.has(id))

  return {
    valid: workingMemoryVersionMatches && unknownEvidenceIds.length === 0,
    workingMemoryVersionMatches,
    unknownEvidenceIds,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
) {
  const actual = Object.keys(record).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index])
}

function isValidNullableString(value: unknown, maxLength: number) {
  return value === null
    || (typeof value === 'string' && value.length <= maxLength)
}

function looksLikeEmbeddedStructuredProviderPayload(text: string) {
  return looksLikeAlicizationStructuredPayloadText(text)
    || embeddedStructuredEnvelopePattern.test(text)
}

function buildPlainTextProviderPayload(input: {
  fullText: string
  prepared: AlicizationPreparedMainChatExecutionResult
}): {
  payload: AlicizationProviderResponsePayload | null
  issues: string[]
} {
  const reply = input.fullText.trim()
  const issues: string[] = []

  if (!reply || reply.length > 12_000)
    issues.push('provider-payload-reply-invalid')
  if (looksLikeEmbeddedStructuredProviderPayload(reply))
    issues.push('provider-payload-json-invalid')

  if (issues.length > 0) {
    return {
      payload: null,
      issues,
    }
  }

  const memoryUsage: AlicizationProviderMemoryUsage = {
    workingMemoryVersion: input.prepared.memoryContext?.workingMemory.version ?? null,
    longTermEvidenceIds: [],
  }

  return {
    payload: {
      format: 'mind-turn-v1',
      thought: '',
      emotion: 'neutral',
      reply,
      performance: {
        baseEmotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      memoryUsage,
    },
    issues,
  }
}

export function validateAlicizationProviderSettlementPayload(input: {
  fullText: string
  prepared: AlicizationPreparedMainChatExecutionResult
  allowPlainTextProviderReply?: boolean
}) {
  const parsed = parseJsonObjectFromText(input.fullText)
  const issues: string[] = []

  if (!parsed) {
    if (input.allowPlainTextProviderReply) {
      const plainText = buildPlainTextProviderPayload({
        fullText: input.fullText,
        prepared: input.prepared,
      })
      if (plainText.payload) {
        return {
          valid: true,
          payload: plainText.payload,
          issues: [],
          memoryUsage: plainText.payload.memoryUsage,
        }
      }
      return {
        valid: false,
        payload: null,
        issues: plainText.issues,
        memoryUsage: null,
      }
    }

    return {
      valid: false,
      payload: null,
      issues: ['provider-payload-json-invalid'],
      memoryUsage: null,
    }
  }

  if (!hasExactKeys(parsed, providerPayloadFields))
    issues.push('provider-payload-fields-invalid')

  if (parsed.format !== 'mind-turn-v1')
    issues.push('provider-payload-format-invalid')
  if (typeof parsed.thought !== 'string' || parsed.thought.length > 2_000)
    issues.push('provider-payload-thought-invalid')
  if (
    typeof parsed.emotion !== 'string'
    || !alicizationEmotionWhitelist.includes(parsed.emotion as never)
  ) {
    issues.push('provider-payload-emotion-invalid')
  }
  if (
    typeof parsed.reply !== 'string'
    || !parsed.reply.trim()
    || parsed.reply.length > 12_000
  ) {
    issues.push('provider-payload-reply-invalid')
  }
  const performance = isRecord(parsed.performance)
    ? parsed.performance
    : null
  let normalizedPerformance: AlicizationProviderResponsePayload['performance'] | null = null
  if (!performance || !hasExactKeys(performance, providerPerformanceFields)) {
    issues.push('provider-payload-performance-invalid')
  }
  else {
    if (
      typeof performance.baseEmotion !== 'string'
      || !alicizationEmotionWhitelist.includes(performance.baseEmotion as never)
      || performance.baseEmotion !== parsed.emotion
    ) {
      issues.push('provider-payload-performance-emotion-invalid')
    }
    if (!isValidNullableString(performance.facialCue, 80))
      issues.push('provider-payload-facial-cue-invalid')
    if (!isValidNullableString(performance.actionCue, 80))
      issues.push('provider-payload-action-cue-invalid')
    if (
      typeof performance.delivery !== 'string'
      || !alicizationPerformanceDeliveryWhitelist.includes(performance.delivery as never)
    ) {
      issues.push('provider-payload-delivery-invalid')
    }
    if (
      typeof performance.emphasis !== 'number'
      || !Number.isInteger(performance.emphasis)
      || ![0, 1, 2].includes(performance.emphasis)
    ) {
      issues.push('provider-payload-emphasis-invalid')
    }

    if (
      typeof performance.baseEmotion === 'string'
      && alicizationEmotionWhitelist.includes(performance.baseEmotion as never)
      && performance.baseEmotion === parsed.emotion
      && isValidNullableString(performance.facialCue, 80)
      && isValidNullableString(performance.actionCue, 80)
      && typeof performance.delivery === 'string'
      && alicizationPerformanceDeliveryWhitelist.includes(performance.delivery as never)
      && typeof performance.emphasis === 'number'
      && Number.isInteger(performance.emphasis)
      && [0, 1, 2].includes(performance.emphasis)
    ) {
      normalizedPerformance = {
        baseEmotion: performance.baseEmotion as AlicizationProviderResponsePayload['performance']['baseEmotion'],
        facialCue: performance.facialCue as string | null,
        actionCue: performance.actionCue as string | null,
        delivery: performance.delivery as AlicizationProviderResponsePayload['performance']['delivery'],
        emphasis: performance.emphasis as 0 | 1 | 2,
      }
    }
  }

  const memoryUsage = isRecord(parsed.memoryUsage)
    ? parsed.memoryUsage
    : null
  let normalizedMemoryUsage: AlicizationProviderMemoryUsage | null = null
  if (
    !memoryUsage
    || !hasExactKeys(memoryUsage, providerMemoryUsageFields)
    || !isValidNullableString(memoryUsage.workingMemoryVersion, 120)
    || !Array.isArray(memoryUsage.longTermEvidenceIds)
    || memoryUsage.longTermEvidenceIds.length > 16
    || memoryUsage.longTermEvidenceIds.some(id =>
      typeof id !== 'string'
      || !id.trim()
      || id.length > 160,
    )
  ) {
    issues.push('provider-memory-usage-invalid')
  }
  else {
    normalizedMemoryUsage = {
      workingMemoryVersion: memoryUsage.workingMemoryVersion as string | null,
      longTermEvidenceIds: [...memoryUsage.longTermEvidenceIds] as string[],
    }
    const validation = validateAlicizationProviderMemoryUsage({
      memoryUsage: normalizedMemoryUsage,
      prepared: input.prepared,
    })
    if (!validation.valid)
      issues.push('provider-memory-usage-invalid')
  }

  if (issues.length > 0 || normalizedPerformance === null || normalizedMemoryUsage === null) {
    return {
      valid: false,
      payload: null,
      issues,
      memoryUsage: normalizedMemoryUsage,
    }
  }

  return {
    valid: true,
    payload: {
      format: 'mind-turn-v1',
      thought: parsed.thought as string,
      emotion: parsed.emotion as AlicizationProviderResponsePayload['emotion'],
      reply: parsed.reply as string,
      performance: normalizedPerformance,
      memoryUsage: normalizedMemoryUsage,
    } satisfies AlicizationProviderResponsePayload,
    issues,
    memoryUsage: normalizedMemoryUsage,
  }
}

function buildObservedRealization(input: {
  payload: AlicizationProviderResponsePayload
  closureResult: AlicizationVisibleReplyClosureResult
}): AlicizationVisibleReplyRealizationArtifact {
  const execution = input.closureResult.visibleReplyExecution
  const critic = input.closureResult.critic
  const closure = input.closureResult.closure
  const nonHumanAuthoredStatus
    = execution.actualVisibleReplyAuthority !== 'llm-mind'
      || execution.providerMindExecuted === false
      ? execution.actualVisibleReplyAuthority ?? 'provider-mind-not-executed'
      : null

  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: execution.actualVisibleReplyAuthority,
    providerMindExecuted: execution.providerMindExecuted,
    mode: execution.mode,
    visibleText: input.payload.reply,
    visibleReplyValidationStatus: 'approved',
    nonHumanAuthoredStatus,
    blockedReasons: [],
    reason: execution.reason,
    critic: {
      version: 'visible-reply-critic-public-summary-v1',
      status: critic.status,
      providerMindRequired: critic.providerMindRequired,
      reasonCodes: [...critic.reasonCodes],
    },
    closure: {
      version: 'visible-reply-closure-public-summary-v1',
      status: closure.status,
      reasonCodes: [...closure.reasonCodes],
      initialCriticStatus: closure.initialCritic?.status ?? null,
      finalCriticStatus: closure.finalCritic?.status ?? null,
    },
  }
}

export async function settleAlicizationVisibleReply(input: {
  draft: AlicizationVisibleReplySettlementDraft
  prepared: AlicizationPreparedMainChatExecutionResult
  requireProviderMemoryUsage?: boolean
  allowPlainTextProviderReply?: boolean
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void> | void
}): Promise<AlicizationVisibleReplySettlementResult> {
  const validation = validateAlicizationProviderSettlementPayload({
    fullText: input.draft.fullText,
    prepared: input.prepared,
    allowPlainTextProviderReply: input.allowPlainTextProviderReply,
  })
  if (!validation.valid || !validation.payload) {
    throw new AlicizationVisibleReplySettlementBlockedError(
      `provider-settlement-invalid:${validation.issues.join(',')}`,
      null,
    )
  }
  if (
    input.draft.visibleReplyExecution.providerMindExecuted !== true
    || input.draft.visibleReplyExecution.actualVisibleReplyAuthority !== 'llm-mind'
  ) {
    throw new AlicizationVisibleReplySettlementBlockedError(
      'provider-visible-reply-authority-invalid',
      null,
    )
  }

  let closureResult: AlicizationVisibleReplyClosureResult | null
  try {
    closureResult = await closeAlicizationVisibleReply({
      draft: input.draft,
      prepared: input.prepared,
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
    })
  }
  catch (error) {
    if (error instanceof AlicizationVisibleReplyClosureBlockedError) {
      throw new AlicizationVisibleReplySettlementBlockedError(
        error.message,
        error.closure,
      )
    }
    throw error
  }
  if (!closureResult) {
    throw new AlicizationVisibleReplySettlementBlockedError(
      'visible-reply-settlement-not-produced',
      null,
    )
  }

  return {
    fullText: input.draft.fullText,
    visibleText: validation.payload.reply,
    visibleReplyExecution: input.draft.visibleReplyExecution,
    realization: buildObservedRealization({
      payload: validation.payload,
      closureResult,
    }),
    closureResult,
  }
}
