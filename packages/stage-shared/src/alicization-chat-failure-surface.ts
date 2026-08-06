import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from './alicization-provider-response'

import { translateGovernedMindFallback } from './alicization-mind-fallback-messages'

export type AlicizationChatFailureKind
  = | 'internal-leak'
    | 'realtime-unavailable'
    | 'structured-contract'
    | 'provider-output-invalid'
    | 'provider-request'
    | 'stream-failure'
    | 'timeout'
    | 'local-runtime-unavailable'
    | 'provider-auth'
    | 'provider-network'
    | 'provider-config'
    | 'provider-schema-unsupported'
    | 'recall-failure'
    | 'memory-persistence'
    | 'model-tools-unsupported'
    | 'runtime-aborted'
    | 'unknown'

export interface AlicizationChatFailureSurface extends AlicizationVisibleArtifactLearningPolicy {
  kind: AlicizationChatFailureKind
  reply: string
  providerRequest?: AlicizationProviderRequestFailureContext
  origin: Extract<AlicizationVisibleArtifactOrigin, 'failure-surface'>
  allowLongTermCondensation: false
  allowPersonaLearning: false
  allowTraining: false
  nonHumanAuthoredStatus: `direct-infra-repair:${AlicizationChatFailureKind}`
  visibleReplySource: 'infrastructure-failure'
  excludeFromPersonaLearning: true
  excludeFromMemoryCondensation: true
  auditCategory: 'alicization.chat-failure'
}

export type AlicizationChatMemoryFailureStage
  = | 'long-term-memory-recall'
    | 'working-memory-history'
    | 'working-memory-checkpoint-load'
    | 'working-memory-checkpoint-save'
    | 'working-memory-long-term-queue'

export interface AlicizationChatMemoryFailureSurface extends AlicizationChatFailureSurface {
  stage: AlicizationChatMemoryFailureStage
  cardId: string
  turnId: string
  occurredAt: number
  errorSummary: string
}

export interface AlicizationProviderRequestFailure {
  status: number | null
  code: string | null
  message: string
}

export interface AlicizationProviderRequestFailureContext extends AlicizationProviderRequestFailure {
  providerId: string
  model: string
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  if (typeof error === 'object' && error !== null && 'message' in error)
    return String((error as { message?: unknown }).message ?? '')
  return String(error ?? '')
}

function readFiniteStatus(value: unknown) {
  const status = Number(value)
  return Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : null
}

function readStringField(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function sanitizeProviderFailureMessage(value: unknown) {
  if (typeof value !== 'string' || !value.trim())
    return 'Provider rejected the request.'

  return value
    .replace(/Bearer\s+[\w.~+/=-]+/giu, 'Bearer [redacted]')
    .replace(/(?:api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/giu, '$1=[redacted]')
    .replace(/user[_ -]?input\s*[:=][^,;]+/giu, 'user_input=[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

function trimTerminalSentencePunctuation(value: string) {
  return value.replace(/[.!?。！？]+$/u, '').trim()
}

function parseEmbeddedJsonObject(raw: string) {
  const start = raw.indexOf('{')
  if (start < 0)
    return null

  try {
    const parsed: unknown = JSON.parse(raw.slice(start))
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

export function extractAlicizationProviderRequestFailure(
  error: unknown,
): AlicizationProviderRequestFailure | null {
  const rawMessage = readErrorMessage(error)
  const parsed = parseEmbeddedJsonObject(rawMessage)
  const nestedError = parsed?.error && typeof parsed.error === 'object' && !Array.isArray(parsed.error)
    ? parsed.error as Record<string, unknown>
    : null
  const statusFromError = typeof error === 'object' && error !== null
    ? readFiniteStatus(
        (error as { status?: unknown, statusCode?: unknown }).status
        ?? (error as { statusCode?: unknown }).statusCode,
      )
    : null
  const statusFromMessage = /\b(?:remote sent|http status|http|status code|status)[:=\s]+(\d{3})\b/iu.exec(rawMessage)?.[1]
  const status = statusFromError ?? readFiniteStatus(statusFromMessage)
  const code = readStringField(
    nestedError?.code
    ?? nestedError?.type
    ?? parsed?.code
    ?? parsed?.type
    ?? /\bresponse:\s*([a-z][\w.-]{2,80})\b/iu.exec(rawMessage)?.[1],
  )
  const message = sanitizeProviderFailureMessage(
    nestedError?.message
    ?? parsed?.message
    ?? (parsed ? null : undefined),
  )

  if (
    status === null
    && !/invalid_request_error|upstream request failed|remote sent \d{3}/iu.test(rawMessage)
  ) {
    return null
  }

  return {
    status,
    code,
    message,
  }
}

const failureKindRepairPath: Record<AlicizationChatFailureKind, string> = {
  'internal-leak': 'internal-leak',
  'realtime-unavailable': 'realtime-unavailable',
  'structured-contract': 'provider-output-invalid',
  'provider-output-invalid': 'provider-output-invalid',
  'provider-request': 'provider-request',
  'stream-failure': 'stream-failure',
  'timeout': 'stream-timeout',
  'local-runtime-unavailable': 'local-runtime-unavailable',
  'provider-auth': 'provider-auth',
  'provider-network': 'provider-network',
  'provider-config': 'provider-config',
  'provider-schema-unsupported': 'provider-schema-unsupported',
  'recall-failure': 'recall-failure',
  'memory-persistence': 'memory-persistence',
  'model-tools-unsupported': 'unsupported-tools',
  'runtime-aborted': 'stream-failure',
  'unknown': 'stream-failure',
}

export function resolveAlicizationChatFailureSurface(input: {
  kind: AlicizationChatFailureKind
  userText?: string
  providerRequest?: AlicizationProviderRequestFailureContext
}): AlicizationChatFailureSurface {
  const repairPath = failureKindRepairPath[input.kind]
  const params = input.kind === 'provider-request'
    ? {
        provider: input.providerRequest?.providerId || 'unknown-provider',
        model: input.providerRequest?.model || 'unknown-model',
        status: input.providerRequest?.status ?? 'unknown',
        code: input.providerRequest?.code || 'provider-request-failed',
        message: trimTerminalSentencePunctuation(
          input.providerRequest?.message || 'Provider rejected the request.',
        ),
      }
    : undefined
  return {
    kind: input.kind,
    reply: translateGovernedMindFallback(`mind-repair.${repairPath}`, params, input.userText),
    ...(input.providerRequest
      ? { providerRequest: input.providerRequest }
      : {}),
    origin: 'failure-surface',
    allowLongTermCondensation: false,
    allowPersonaLearning: false,
    allowTraining: false,
    nonHumanAuthoredStatus: `direct-infra-repair:${input.kind}`,
    visibleReplySource: 'infrastructure-failure',
    excludeFromPersonaLearning: true,
    excludeFromMemoryCondensation: true,
    auditCategory: 'alicization.chat-failure',
  }
}
