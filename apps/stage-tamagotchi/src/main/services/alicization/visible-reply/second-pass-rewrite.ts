import type { Message } from '@xsai/shared-chat'

import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { MainGatewayResolvedConfig } from '../runtime-soul'

import Ajv from 'ajv'

import {
  alicizationProviderResponseFormat,
  alicizationProviderResponseJsonSchema,
  containsAlicizationFixedTemplateResidue,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'

import { mainChatVisibleReplySecondPassTimeoutMs } from '../runtime-soul'
import { parseJsonObjectFromText } from '../runtime-transport-content'

export type AlicizationSecondPassReasonCode
  = | 'schema_parse_failed'
    | 'required_field_missing'
    | 'internal_protocol_leak'
    | 'legacy_template_contamination'
    | 'tool_result_not_settled'
    | 'memory_usage_claim_invalid'

export interface AlicizationSecondPassRetryInput {
  candidate: string
  reasonCodes: AlicizationSecondPassReasonCode[]
  prepared: AlicizationPreparedMainChatExecutionResult
  toolFacts: unknown[]
}

interface AlicizationSecondPassProviderInput {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  responseFormat: typeof alicizationProviderResponseFormat
  headers?: Record<string, string>
  timeoutMs: number
}

export interface AlicizationSecondPassRewriteOptions extends AlicizationSecondPassRetryInput {
  provider: (input: AlicizationSecondPassProviderInput) => Promise<{
    finishReason: string
    fullText: string
  }>
  headers?: Record<string, string>
}

export interface AlicizationSecondPassRewriteResult {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  rewritten: boolean
  reason: string
  audit: Record<string, unknown> | null
}

const secondPassReasonCodes = new Set<AlicizationSecondPassReasonCode>([
  'schema_parse_failed',
  'required_field_missing',
  'internal_protocol_leak',
  'legacy_template_contamination',
  'tool_result_not_settled',
  'memory_usage_claim_invalid',
])

const validateSecondPassPayload = new Ajv({
  allErrors: true,
  strict: false,
}).compile(alicizationProviderResponseJsonSchema)

function uniqueReasonCodes(values: AlicizationSecondPassReasonCode[]) {
  return [...new Set(values)]
}

function mapAlicizationSecondPassReasonCode(raw: unknown): AlicizationSecondPassReasonCode {
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (secondPassReasonCodes.has(normalized as AlicizationSecondPassReasonCode))
    return normalized as AlicizationSecondPassReasonCode

  if (/json|parse|schema/iu.test(normalized))
    return 'schema_parse_failed'
  if (/memory|recall|evidence/iu.test(normalized))
    return 'memory_usage_claim_invalid'
  if (/tool|execution|callback|payoff/iu.test(normalized))
    return 'tool_result_not_settled'
  if (/template|same[-_ ]?her|project[-_ ]?state|continuity|persona|shell|opening[-_ ]?guidance/iu.test(normalized))
    return 'legacy_template_contamination'
  if (/internal|protocol|non[-_ ]?human|authority|leak/iu.test(normalized))
    return 'internal_protocol_leak'
  return 'required_field_missing'
}

export function mapAlicizationSecondPassReasonCodes(
  values: readonly unknown[],
): AlicizationSecondPassReasonCode[] {
  return uniqueReasonCodes(values.map(mapAlicizationSecondPassReasonCode))
}

export function readAlicizationSecondPassToolFacts(
  prepared: AlicizationPreparedMainChatExecutionResult,
) {
  return [
    prepared.freshExecutionReplyCallback ?? null,
    prepared.executionReplyObligation ?? null,
    prepared.executionPayoffStructuredReply ?? null,
  ].filter((value): value is NonNullable<typeof value> => value !== null)
}

function readDynamicIdentityFacts(
  prepared: AlicizationPreparedMainChatExecutionResult,
) {
  return prepared.personaKernel ?? null
}

function readDynamicRelationshipFacts(
  prepared: AlicizationPreparedMainChatExecutionResult,
) {
  const surface = prepared.runtimeSurface?.digitalLifeRuntimeSurface ?? null
  const profile = prepared.personaKernel?.profile ?? null

  return {
    profile: profile
      ? {
          ownerName: profile.ownerName,
          hostName: profile.hostName,
          alicizationName: profile.alicizationName,
          relationship: profile.relationship,
        }
      : null,
    relationshipModel: surface?.world?.relationshipModel ?? null,
    hostPersonModel: surface?.memory?.hostPersonModel ?? null,
  }
}

function readDynamicEmotionFacts(
  prepared: AlicizationPreparedMainChatExecutionResult,
) {
  const memory = prepared.runtimeSurface?.digitalLifeRuntimeSurface?.memory ?? null
  return {
    emotionalKernel: memory?.emotionalKernel ?? null,
    affectiveResidue: memory?.affectiveResidue ?? null,
  }
}

function buildSecondPassMessages(input: AlicizationSecondPassRetryInput): Message[] {
  return [
    {
      role: 'system',
      content: JSON.stringify({
        type: 'alicization-second-pass-context',
        reasonCodes: uniqueReasonCodes(input.reasonCodes),
        memoryContext: input.prepared.memoryContext,
        identityFacts: readDynamicIdentityFacts(input.prepared),
        relationshipFacts: readDynamicRelationshipFacts(input.prepared),
        emotionFacts: readDynamicEmotionFacts(input.prepared),
        toolFacts: input.toolFacts,
      }),
    } as Message,
    {
      role: 'user',
      content: input.candidate,
    } as Message,
  ]
}

function validateMemoryUsageClaim(input: {
  payload: Record<string, unknown>
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const memoryUsage = input.payload.memoryUsage as {
    workingMemoryVersion?: unknown
    longTermEvidenceIds?: unknown
  }
  const expectedWorkingMemoryVersion = input.prepared.memoryContext.workingMemory.version
  if (memoryUsage.workingMemoryVersion !== expectedWorkingMemoryVersion)
    return false

  const allowedEvidenceIds = new Set(input.prepared.memoryContext.availableLongTermEvidenceIds)
  return Array.isArray(memoryUsage.longTermEvidenceIds)
    && memoryUsage.longTermEvidenceIds.every(id => typeof id === 'string' && allowedEvidenceIds.has(id))
}

export class AlicizationSecondPassStructuredContractError extends Error {
  readonly failureSurface = resolveAlicizationChatFailureSurface({
    kind: 'structured-contract',
  })

  constructor(readonly reasonCodes: AlicizationSecondPassReasonCode[]) {
    super(`visible-reply-second-pass-structured-contract:${reasonCodes.join(',')}`)
    this.name = 'AlicizationSecondPassStructuredContractError'
  }
}

function assertValidSecondPassPayload(input: {
  fullText: string
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const parsed = parseJsonObjectFromText(input.fullText)
  if (!parsed || !validateSecondPassPayload(parsed)) {
    throw new AlicizationSecondPassStructuredContractError([
      parsed ? 'required_field_missing' : 'schema_parse_failed',
    ])
  }
  if (
    typeof parsed.reply !== 'string'
    || containsAlicizationFixedTemplateResidue(parsed.reply)
  ) {
    throw new AlicizationSecondPassStructuredContractError([
      'legacy_template_contamination',
    ])
  }
  if (!validateMemoryUsageClaim({
    payload: parsed,
    prepared: input.prepared,
  })) {
    throw new AlicizationSecondPassStructuredContractError([
      'memory_usage_claim_invalid',
    ])
  }
}

export async function rewriteAlicizationVisibleReplySecondPass(
  input: AlicizationSecondPassRewriteOptions,
): Promise<AlicizationSecondPassRewriteResult> {
  const providerResult = await input.provider({
    chatConfig: input.prepared.chatConfig,
    messages: buildSecondPassMessages(input),
    responseFormat: alicizationProviderResponseFormat,
    headers: input.headers,
    timeoutMs: mainChatVisibleReplySecondPassTimeoutMs,
  })

  assertValidSecondPassPayload({
    fullText: providerResult.fullText,
    prepared: input.prepared,
  })

  return {
    fullText: providerResult.fullText,
    visibleReplyExecution: {
      mode: 'provider-one-shot',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
      actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
      providerMindExecuted: true,
      reason: 'visible-reply-second-pass-rewrite',
    },
    rewritten: true,
    reason: 'visible-reply-second-pass-rewrite',
    audit: {
      reasonCodes: uniqueReasonCodes(input.reasonCodes),
      providerFinishReason: providerResult.finishReason,
    },
  }
}
