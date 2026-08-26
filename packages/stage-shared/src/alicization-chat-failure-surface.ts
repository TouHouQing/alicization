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
    | 'provider-continuation-timeout'
    | 'provider-continuation-incomplete'
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
    | 'tool-execution'
    | 'runtime-aborted'
    | 'unknown'

export interface AlicizationChatFailureSurface extends AlicizationVisibleArtifactLearningPolicy {
  kind: AlicizationChatFailureKind
  reply: string
  providerRequest?: AlicizationProviderRequestFailureContext
  timeout?: AlicizationChatTimeoutFailureContext
  toolExecution?: AlicizationToolExecutionFailureContext
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
    | 'working-memory-long-term-drain'
    | 'dialogue-session-mirror-commit'
    | 'autobiographical-memory-write'
    | 'persona-learning-schedule'
    | 'runtime-event-store'
    | 'memory-turn-settlement'

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

export type AlicizationChatTimeoutPhase
  = | 'first-event-timeout'
    | 'liveness-timeout'
    | 'idle-timeout'

export type AlicizationChatTimeoutStage
  = | 'provider'
    | 'tool-execution'
    | 'provider-continuation'

export interface AlicizationChatTimeoutDescriptor {
  origin: 'renderer-watchdog' | 'main-watchdog'
  timeoutPhase: AlicizationChatTimeoutPhase
  timeoutStage: AlicizationChatTimeoutStage
  timeoutMs: number
  elapsedMs: number
  lastEventType: string | null
  sawAnyEvent: boolean
  sawProgress: boolean
}

export interface AlicizationChatTimeoutFailureContext {
  providerId: string
  model: string
  phase: 'preparation' | 'provider-first-event' | 'provider-continuation' | 'tool-result-handoff'
  transportCode?: string
  transportMessage?: string
  timeoutPhase?: AlicizationChatTimeoutPhase
  timeoutStage?: AlicizationChatTimeoutStage
  timeoutReason?: string
  timeoutMs?: number
  elapsedMs?: number
  lastEventType?: string | null
  sawAnyEvent?: boolean
  sawProgress?: boolean
  descriptor?: AlicizationChatTimeoutDescriptor
}

export interface AlicizationToolExecutionFailureContext {
  code: string
  message: string
  toolName: string
}

const nonExecutionToolFailureCodes = new Set([
  'ALICIZATION_TOOL_ABORTED',
  'ALICIZATION_TOOL_DENIED',
  'ALICIZATION_TOOL_DENIED_BY_HOST',
  'ALICIZATION_TOOL_DENIED_SYSTEM',
])

const explicitToolExecutionFailureCodes = new Set([
  'RUNTIME_CALL_CIRCULAR',
  'TOOL_EXECUTION_FAILED',
])

function isExplicitToolExecutionFailureCode(errorCode: string) {
  return explicitToolExecutionFailureCodes.has(errorCode)
    || /^(?:CODEX|CLI|CLAUDE_CODE|OPENCLAW)_(?:TIMEOUT|PROVIDER_UNAVAILABLE|COMMAND_NOT_FOUND|EXECUTION_FAILED|EXECUTE_FAILED|EMPTY_OUTPUT|PROTOCOL_INCOMPLETE|PROCESS_REAP_FAILED|CONFIG_INVALID|PROFILE_INVALID)$/u.test(errorCode)
}

function readJsonObjectValue(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>
  if (typeof value !== 'string' || !value.trim().startsWith('{'))
    return null

  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

export function isAlicizationToolExecutionFailureResult(result: unknown) {
  const payload = readJsonObjectValue(result)
  if (!payload)
    return false

  const errorCode = String(payload.errorCode ?? payload.code ?? '').trim().toUpperCase()
  const explicitlyStopsContinuation = payload.continuationPolicy === 'stop'
  if (nonExecutionToolFailureCodes.has(errorCode) && !explicitlyStopsContinuation)
    return false

  const status = String(payload.status ?? '').trim().toLowerCase()
  const finalStatus = String(payload.finalStatus ?? '').trim().toLowerCase()
  const isTimeoutTerminal = status === 'timeout' || finalStatus === 'timeout'
  return payload.failureKind === 'tool-execution'
    || (
      explicitlyStopsContinuation
      && (status === 'failed' || finalStatus === 'failed')
    )
    || (status === 'failed' && isExplicitToolExecutionFailureCode(errorCode))
    || (
      isTimeoutTerminal
      && (Boolean(payload.toolName ?? payload.tool) || isExplicitToolExecutionFailureCode(errorCode))
    )
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

function sanitizeToolFailureMessage(value: unknown) {
  if (typeof value !== 'string' || !value.trim())
    return 'Tool execution failed.'

  return value
    .replace(/Bearer\s+[\w.~+/=-]+/giu, 'Bearer [redacted]')
    .replace(/(?:api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/giu, '$1=[redacted]')
    .replace(/user[_ -]?input\s*[:=][^,;]+/giu, 'user_input=[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320)
}

function readErrorRecord(error: unknown) {
  return readJsonObjectValue(error)
}

function normalizeToolName(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/[^\w-]+/g, '_').slice(0, 96)
}

const legacyExecutorToolNameAliases: Record<string, string> = {
  executor_run_coding_agent: 'coding_agent',
  executor_run_cli: 'cli',
  executor_run_codex: 'codex',
  executor_run_claude_code: 'claude_code',
  executor_run_local_visual: 'local_visual',
  executor_run_openclaw: 'openclaw',
}

function projectFailureSurfaceToolName(raw: unknown) {
  const toolName = normalizeToolName(raw)
  if (!toolName)
    return ''
  if (legacyExecutorToolNameAliases[toolName])
    return legacyExecutorToolNameAliases[toolName]
  return toolName.startsWith('executor_run_') ? 'tool' : toolName
}

function canonicalExecutorChannelName(raw: string) {
  const channel = raw.toLowerCase().replace(/[\s-]+/g, '_')
  if (channel === 'coding_agent')
    return 'coding_agent'
  if (channel === 'cli')
    return 'cli'
  if (channel === 'codex')
    return 'codex'
  if (channel === 'claude_code')
    return 'claude_code'
  if (channel === 'local_visual')
    return 'local_visual'
  if (channel === 'openclaw')
    return 'openclaw'
  return ''
}

function inferToolNameFromFailureMessage(message: string) {
  const executorMatch = /tool:executor:([\w-]+)/iu.exec(message)
  if (executorMatch?.[1])
    return canonicalExecutorChannelName(executorMatch[1])

  const namedChannel = /\b(coding[\s_-]*agent|codex|claude[\s_-]*code|local[\s_-]*visual|openclaw|cli)\b/iu.exec(message)?.[1]
  if (!namedChannel)
    return ''

  return canonicalExecutorChannelName(namedChannel)
}

function toolChannelCode(toolName: string) {
  if (toolName.includes('codex'))
    return 'CODEX'
  if (toolName.includes('claude'))
    return 'CLAUDE_CODE'
  if (toolName.includes('openclaw'))
    return 'OPENCLAW'
  if (toolName.includes('cli'))
    return 'CLI'
  return 'TOOL'
}

function toolDisplayName(toolName: string) {
  if (toolName === 'coding_agent')
    return 'Coding Agent'
  if (toolName === 'codex')
    return 'Codex'
  if (toolName === 'cli')
    return 'CLI'
  if (toolName === 'claude_code')
    return 'Claude Code'
  if (toolName === 'openclaw')
    return 'OpenClaw'
  if (toolName.startsWith('browser_'))
    return '浏览器工具'
  if (toolName.startsWith('desktop_'))
    return '桌面工具'
  return toolName || '工具'
}

function normalizeToolFailureCode(input: {
  error: unknown
  message: string
  toolName: string
}) {
  const record = readErrorRecord(input.error)
  const explicitCode = readStringField(record?.errorCode ?? record?.code)
  const normalizedExplicitCode = explicitCode
    ? explicitCode.replace(/[^\w-]+/g, '_').toUpperCase().slice(0, 96)
    : ''
  const lowerMessage = input.message.toLowerCase()
  const errorName = String(record?.name ?? '').toLowerCase()
  const channelCode = toolChannelCode(input.toolName)

  if (
    lowerMessage.includes('circular runtime call detected')
    || errorName.includes('circularcall')
  ) {
    return 'RUNTIME_CALL_CIRCULAR'
  }

  if (
    normalizedExplicitCode === 'ENOENT'
    || normalizedExplicitCode === 'ENOTFOUND'
    || lowerMessage.includes('command not found')
    || lowerMessage.includes('executable file not found')
    || lowerMessage.includes('no such file or directory')
  ) {
    return `${channelCode}_COMMAND_NOT_FOUND`
  }

  if (
    normalizedExplicitCode === 'ETIMEDOUT'
    || normalizedExplicitCode === 'TIMEOUT'
    || lowerMessage.includes('timed out')
    || lowerMessage.includes('timeout')
    || lowerMessage.includes('sigterm')
    || lowerMessage.includes('killed')
  ) {
    return `${channelCode}_TIMEOUT`
  }

  return normalizedExplicitCode || 'TOOL_EXECUTION_FAILED'
}

export function extractAlicizationToolExecutionFailure(
  error: unknown,
  fallbackToolName?: string,
): AlicizationToolExecutionFailureContext | null {
  const record = readErrorRecord(error)
  const rawMessage = readErrorMessage(error)
  const message = sanitizeToolFailureMessage(
    record?.errorMessage
    ?? record?.message
    ?? rawMessage,
  )
  const rawFailureKind = String(record?.failureKind ?? '').trim().toLowerCase()
  const toolName = normalizeToolName(
    record?.toolName
    ?? record?.tool
    ?? fallbackToolName
    ?? inferToolNameFromFailureMessage(rawMessage),
  )
  const providerLikeFailure = /\b(?:remote sent|http status|status code)\b|invalid_request_error/iu.test(rawMessage)
  const namedExecutorFailure = /\b(?:codex|claude[\s_-]*code|openclaw|cli)\b/iu.test(rawMessage)
    && /timed? out|timeout|command not found|enoent|execution failed/iu.test(rawMessage)
  const hasExecutorIdentity = /tool:executor:[\w-]+/iu.test(rawMessage)
  const explicitlyStoppedExecutorFailure = record?.continuationPolicy === 'stop'
    && String(record?.status ?? record?.finalStatus ?? '').trim().toLowerCase() === 'failed'
  const hasToolSignal = rawFailureKind === 'tool-execution'
    || Boolean(toolName)
    || hasExecutorIdentity
    || explicitlyStoppedExecutorFailure
    || /circular runtime call detected/iu.test(rawMessage)
    || (!providerLikeFailure && /tool execution failed|tool call failed/iu.test(rawMessage))
    || namedExecutorFailure

  if (!hasToolSignal)
    return null

  const resolvedToolName = projectFailureSurfaceToolName(
    toolName || inferToolNameFromFailureMessage(rawMessage) || 'tool',
  )
  return {
    code: normalizeToolFailureCode({
      error,
      message: rawMessage,
      toolName: resolvedToolName,
    }),
    message,
    toolName: resolvedToolName,
  }
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
  'provider-continuation-timeout': 'provider-continuation-timeout',
  'provider-continuation-incomplete': 'provider-continuation-incomplete',
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
  'tool-execution': 'tool-execution',
  'runtime-aborted': 'stream-failure',
  'unknown': 'stream-failure',
}

export function resolveAlicizationChatFailureSurface(input: {
  kind: AlicizationChatFailureKind
  userText?: string
  providerRequest?: AlicizationProviderRequestFailureContext
  timeout?: AlicizationChatTimeoutFailureContext
  toolExecution?: AlicizationToolExecutionFailureContext
}): AlicizationChatFailureSurface {
  const toolExecution = input.toolExecution
    ? {
        ...input.toolExecution,
        toolName: projectFailureSurfaceToolName(input.toolExecution.toolName) || 'tool',
      }
    : undefined
  const repairPath = input.kind === 'timeout' && input.timeout?.phase === 'preparation'
    ? 'preparation-timeout'
    : failureKindRepairPath[input.kind]
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
    : input.kind === 'tool-execution'
      ? {
          tool: toolDisplayName(toolExecution?.toolName || 'tool'),
          code: toolExecution?.code || 'TOOL_EXECUTION_FAILED',
          message: trimTerminalSentencePunctuation(
            sanitizeToolFailureMessage(toolExecution?.message),
          ),
        }
      : input.kind === 'timeout' || input.kind === 'provider-continuation-timeout'
        ? {
            provider: input.timeout?.providerId || 'unknown-provider',
            model: input.timeout?.model || 'unknown-model',
          }
        : undefined
  return {
    kind: input.kind,
    reply: translateGovernedMindFallback(`mind-repair.${repairPath}`, params, input.userText),
    ...(input.providerRequest
      ? { providerRequest: input.providerRequest }
      : {}),
    ...(input.timeout
      ? { timeout: input.timeout }
      : {}),
    ...(toolExecution
      ? { toolExecution }
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
