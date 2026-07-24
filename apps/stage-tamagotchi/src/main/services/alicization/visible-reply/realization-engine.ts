import type {
  AlicizationVisibleReplyExecution,
  AlicizationVisibleReplyExecutionMode,
} from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationVisibleReplyCriticArtifact } from './critic'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  isAlicizationNormalVisibleReplyAuthority,
  looksLikeAlicizationStructuredPayloadText,
  normalizeAlicizationNormalVisibleReplyAuthority,
  sanitizeAlicizationProviderFacingText,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import { parseJsonObjectFromText } from '../runtime-transport-content'

function containsVisibleReplyStructuredTemplateResidue(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return Boolean(normalized)
    && (
      /\bruntime_personhood\b|phase1_local_digital_life|project_phase=life_core|continuity_identity|continuity_line|content_withheld|visibility=internal[-_]structured/u.test(normalized)
      || /\b[a-z][\w-]{2,}\s*=/iu.test(normalized)
      || /\b(?:local_desktop_life_loop|life_core)\b/iu.test(normalized)
    )
}

function sanitizeVisibleReplyMetadataText(raw: string | null | undefined, maxChars = 1600) {
  if (typeof raw !== 'string')
    return null
  const sanitized = sanitizeAlicizationStructuredInternalText(raw, maxChars, '')
  if (!sanitized || sanitized === alicizationFixedTemplateReplacement)
    return null
  return containsAlicizationFixedTemplateResidue(sanitized) || containsVisibleReplyStructuredTemplateResidue(sanitized)
    ? null
    : sanitized
}

function sanitizeVisibleReplyReasonCode(raw: unknown) {
  if (typeof raw !== 'string')
    return null
  const sanitized = sanitizeAlicizationStructuredInternalText(raw, 240, '')
  return sanitized || null
}

function sanitizeVisibleReplyReasonCodes(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return raw
    .map(sanitizeVisibleReplyReasonCode)
    .filter((value): value is string => Boolean(value))
}

function buildPublicVisibleReplyCriticSummary(
  critic: AlicizationVisibleReplyCriticArtifact | null | undefined,
): AlicizationVisibleReplyPublicCriticSummary | null {
  if (!critic)
    return null

  return {
    version: 'visible-reply-critic-public-summary-v1',
    status: critic.status,
    providerMindRequired: Boolean(critic.providerMindRequired),
    reasonCodes: sanitizeVisibleReplyReasonCodes(critic.reasonCodes),
  }
}

function buildPublicVisibleReplyClosureSummary(
  closure: AlicizationVisibleReplyClosureArtifact | null | undefined,
): AlicizationVisibleReplyPublicClosureSummary | null {
  if (!closure)
    return null

  return {
    version: 'visible-reply-closure-public-summary-v1',
    status: closure.status,
    reasonCodes: sanitizeVisibleReplyReasonCodes(closure.reasonCodes),
    initialCriticStatus: closure.initialCritic?.status ?? null,
    finalCriticStatus: closure.finalCritic?.status ?? null,
  }
}

export interface AlicizationVisibleReplyClosureArtifact {
  version: 'visible-reply-closure-v1'
  status: 'approved' | 'blocked'
  initialCritic: AlicizationVisibleReplyCriticArtifact | null
  finalCritic: AlicizationVisibleReplyCriticArtifact | null
  reasonCodes: string[]
}

export interface AlicizationVisibleReplyPublicCriticSummary {
  version: 'visible-reply-critic-public-summary-v1'
  status: AlicizationVisibleReplyCriticArtifact['status']
  providerMindRequired: boolean
  reasonCodes: string[]
}

export interface AlicizationVisibleReplyPublicClosureSummary {
  version: 'visible-reply-closure-public-summary-v1'
  status: AlicizationVisibleReplyClosureArtifact['status']
  reasonCodes: string[]
  initialCriticStatus: AlicizationVisibleReplyCriticArtifact['status'] | null
  finalCriticStatus: AlicizationVisibleReplyCriticArtifact['status'] | null
}

export type AlicizationVisibleReplyValidationStatus = 'approved' | 'blocked' | 'unknown'

export function normalizeAlicizationVisibleReplyValidationStatus(
  raw: unknown,
): AlicizationVisibleReplyValidationStatus {
  return raw === 'approved' || raw === 'blocked' ? raw : 'unknown'
}

export interface AlicizationVisibleReplyRealizationArtifact {
  version: 'visible-reply-realization-v1'
  expectedAuthority: 'llm-mind'
  actualAuthority: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority'] | null
  providerMindExecuted: boolean
  mode: AlicizationVisibleReplyExecutionMode
  visibleText: string | null
  visibleReplyValidationStatus?: AlicizationVisibleReplyValidationStatus
  nonHumanAuthoredStatus: string | null
  blockedReasons: string[]
  emotionalClosureAudit?: {
    activeCue: string | null
    lowPressureRequired?: boolean
    antiRestartRequired?: boolean
  } | null
  selfAuthorityAudit?: {
    authoritySummary: string | null
    closenessPosture: string | null
  } | null
  reason: string | null
  critic?: AlicizationVisibleReplyPublicCriticSummary | null
  closure?: AlicizationVisibleReplyPublicClosureSummary | null
}

export interface AlicizationResolvedVisibleReply {
  fullText: string
  visibleText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  realization: AlicizationVisibleReplyRealizationArtifact
}

function isLocalDeterministicVisibleFallback(execution: AlicizationVisibleReplyExecution) {
  return execution.actualVisibleReplyAuthority === 'local-deterministic-fallback'
    || execution.providerMindExecuted === false
    || execution.mode === 'local-fallback'
}

function resolvePreparedReplyExecutionPlan(prepared: AlicizationPreparedMainChatExecutionResult) {
  if (prepared.mindTurnContract) {
    return {
      preferredMode: prepared.hasVisualGrounding
        ? 'provider-one-shot'
        : 'provider-stream',
      expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
        prepared.mindTurnContract.expectedVisibleReplyAuthority,
        'llm-mind',
      ),
      reason: 'mind-turn-contract',
    } as const
  }
  const plan = prepared.replyExecutionPlan
    ?? prepared.runtimeSurface.replyExecutionPlan
    ?? null
  if (!plan)
    return null
  return {
    ...plan,
    preferredMode: plan.preferredMode === 'local-fallback'
      ? prepared.hasVisualGrounding ? 'provider-one-shot' : 'provider-stream'
      : plan.preferredMode,
    expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
      plan.expectedVisibleReplyAuthority as any,
      'llm-mind',
    ),
    reason: plan.reason ?? 'visible-reply-authority-gate',
  } as const
}

function resolvePreparedVisibleReplyAuthority(prepared: AlicizationPreparedMainChatExecutionResult) {
  if (prepared.mindTurnContract) {
    return normalizeAlicizationNormalVisibleReplyAuthority(
      prepared.mindTurnContract.expectedVisibleReplyAuthority,
      'llm-mind',
    )
  }
  return normalizeAlicizationNormalVisibleReplyAuthority(
    (prepared.replyRealization?.expectedVisibleReplyAuthority
      ?? prepared.runtimeSurface.replyAuthority?.expectedVisibleReplyAuthority
      ?? prepared.governance?.visibleReplyAuthority
      ?? 'llm-mind') as any,
    'llm-mind',
  )
}

function resolveActualVisibleReplyAuthority(input: {
  mode: AlicizationVisibleReplyExecutionMode
  expectedVisibleReplyAuthority: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  requestedAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  providerMindExecuted: boolean
}) {
  if (!input.providerMindExecuted || input.mode === 'local-fallback')
    return 'local-deterministic-fallback' as const

  if (isAlicizationNormalVisibleReplyAuthority(input.requestedAuthority))
    return input.requestedAuthority

  return normalizeAlicizationNormalVisibleReplyAuthority(
    input.expectedVisibleReplyAuthority,
    'llm-mind',
  )
}

function cueRequiresLowPressure(cue: string | null) {
  const normalized = typeof cue === 'string' ? cue.toLowerCase() : ''
  if (!normalized)
    return false
  return normalized.includes('low-pressure')
    || normalized.includes('lower-pressure')
    || normalized.includes('leave more room')
    || normalized.includes('轻一点')
    || normalized.includes('放轻')
}

function cueAvoidsRestart(cue: string | null) {
  const normalized = typeof cue === 'string' ? cue.toLowerCase() : ''
  if (!normalized)
    return false
  return normalized.includes('do not reopen from scratch')
    || normalized.includes('without reopening from scratch')
    || normalized.includes('same living line is still settling')
    || normalized.includes('不要重新开')
    || normalized.includes('不要从头重开')
}

export function createAlicizationVisibleReplyExecution(input: {
  mode: AlicizationVisibleReplyExecutionMode
  expectedVisibleReplyAuthority: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  providerMindExecuted?: boolean
  reason?: string | null
}): AlicizationVisibleReplyExecution {
  const providerMindExecuted = input.providerMindExecuted ?? input.mode !== 'local-fallback'
  const expectedVisibleReplyAuthority = normalizeAlicizationNormalVisibleReplyAuthority(
    input.expectedVisibleReplyAuthority,
    'llm-mind',
  )
  const actualVisibleReplyAuthority = resolveActualVisibleReplyAuthority({
    mode: input.mode,
    expectedVisibleReplyAuthority,
    requestedAuthority: input.actualVisibleReplyAuthority,
    providerMindExecuted,
  })

  return {
    mode: input.mode,
    expectedVisibleReplyAuthority,
    actualVisibleReplyAuthority: actualVisibleReplyAuthority ?? null,
    providerMindExecuted,
    reason: input.reason ?? null,
  }
}

export function buildAlicizationVisibleReplyRealizationArtifact(input: {
  fullText?: string | null
  visibleReplyExecution: AlicizationVisibleReplyExecution
  emotionalClosureCue?: string | null
  selfAuthoritySummary?: string | null
  selfAuthorityClosenessPosture?: string | null
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
}): AlicizationVisibleReplyRealizationArtifact {
  const localDeterministicFallback = isLocalDeterministicVisibleFallback(input.visibleReplyExecution)
  const visibleText = localDeterministicFallback
    ? ''
    : deriveAlicizationVisibleReplyText(input.fullText ?? '')
  const emotionalClosureCue = typeof input.emotionalClosureCue === 'string'
    ? input.emotionalClosureCue.trim() || null
    : null
  const selfAuthoritySummary = typeof input.selfAuthoritySummary === 'string'
    ? input.selfAuthoritySummary.trim() || null
    : null
  const selfAuthorityClosenessPosture = typeof input.selfAuthorityClosenessPosture === 'string'
    ? input.selfAuthorityClosenessPosture.trim() || null
    : null

  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: input.visibleReplyExecution.expectedVisibleReplyAuthority ?? 'llm-mind',
    actualAuthority: input.visibleReplyExecution.actualVisibleReplyAuthority ?? null,
    providerMindExecuted: input.visibleReplyExecution.providerMindExecuted,
    mode: input.visibleReplyExecution.mode,
    visibleText: visibleText || null,
    visibleReplyValidationStatus: normalizeAlicizationVisibleReplyValidationStatus(input.closure?.status),
    nonHumanAuthoredStatus: localDeterministicFallback
      ? input.visibleReplyExecution.reason ?? 'visible-reply-local-fallback'
      : null,
    blockedReasons: localDeterministicFallback
      ? ['non-human-authored-visible-fallback']
      : [],
    emotionalClosureAudit: emotionalClosureCue
      ? {
          activeCue: emotionalClosureCue,
          lowPressureRequired: cueRequiresLowPressure(emotionalClosureCue),
          antiRestartRequired: cueAvoidsRestart(emotionalClosureCue),
        }
      : null,
    selfAuthorityAudit: selfAuthoritySummary || selfAuthorityClosenessPosture
      ? {
          authoritySummary: sanitizeVisibleReplyMetadataText(selfAuthoritySummary),
          closenessPosture: sanitizeVisibleReplyMetadataText(selfAuthorityClosenessPosture),
        }
      : null,
    reason: input.visibleReplyExecution.reason,
    critic: buildPublicVisibleReplyCriticSummary(input.critic),
    closure: buildPublicVisibleReplyClosureSummary(input.closure),
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

  const visibleTextOrEmpty = (value: string) =>
    sanitizeAlicizationProviderFacingText(value, 4000, '')

  const parsed = parseJsonObjectFromText(normalizedText)
  const structuredReply = typeof parsed?.reply === 'string'
    ? parsed.reply.trim()
    : ''
  if (structuredReply)
    return visibleTextOrEmpty(structuredReply)

  const realizedVisibleText
    = parsed?.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
      && typeof (parsed.visibleReplyRealization as { visibleText?: unknown }).visibleText === 'string'
      ? ((parsed.visibleReplyRealization as { visibleText?: string }).visibleText?.trim() ?? '')
      : ''
  if (realizedVisibleText)
    return visibleTextOrEmpty(realizedVisibleText)

  return looksLikeAlicizationStructuredPayloadText(normalizedText)
    ? ''
    : visibleTextOrEmpty(normalizedText)
}

export function buildAlicizationResolvedVisibleReply(input: {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  emotionalClosureCue?: string | null
  selfAuthoritySummary?: string | null
  selfAuthorityClosenessPosture?: string | null
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
}): AlicizationResolvedVisibleReply {
  const realization = buildAlicizationVisibleReplyRealizationArtifact({
    fullText: input.fullText,
    visibleReplyExecution: input.visibleReplyExecution,
    emotionalClosureCue: input.emotionalClosureCue ?? null,
    selfAuthoritySummary: input.selfAuthoritySummary ?? null,
    selfAuthorityClosenessPosture: input.selfAuthorityClosenessPosture ?? null,
    critic: input.critic ?? null,
    closure: input.closure ?? null,
  })
  return {
    fullText: input.fullText,
    visibleText: realization.visibleText ?? '',
    visibleReplyExecution: input.visibleReplyExecution,
    realization,
  }
}

function buildAlicizationTransparentRecoveryVisibleReply(input: {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}): AlicizationResolvedVisibleReply {
  const localDeterministicFallback = isLocalDeterministicVisibleFallback(input.visibleReplyExecution)
  const visibleText = localDeterministicFallback
    ? ''
    : deriveAlicizationVisibleReplyText(input.fullText)
  const reason = input.visibleReplyExecution.reason

  const realization: AlicizationVisibleReplyRealizationArtifact = {
    version: 'visible-reply-realization-v1',
    expectedAuthority: input.visibleReplyExecution.expectedVisibleReplyAuthority ?? 'llm-mind',
    actualAuthority: input.visibleReplyExecution.actualVisibleReplyAuthority ?? null,
    providerMindExecuted: input.visibleReplyExecution.providerMindExecuted,
    mode: input.visibleReplyExecution.mode,
    visibleText: visibleText || null,
    visibleReplyValidationStatus: 'unknown',
    nonHumanAuthoredStatus: localDeterministicFallback
      ? reason ?? 'visible-reply-local-fallback'
      : null,
    blockedReasons: localDeterministicFallback
      ? ['non-human-authored-visible-fallback']
      : [],
    emotionalClosureAudit: null,
    selfAuthorityAudit: null,
    reason,
    critic: null,
    closure: null,
  }

  return {
    fullText: input.fullText,
    visibleText,
    visibleReplyExecution: input.visibleReplyExecution,
    realization,
  }
}

export function resolveAlicizationTimeoutRecoveredVisibleReply(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  recoveredText: string
  recoveryMode: string
}): AlicizationResolvedVisibleReply {
  const localFallback = input.recoveryMode === 'local-fallback'
  return buildAlicizationTransparentRecoveryVisibleReply({
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
