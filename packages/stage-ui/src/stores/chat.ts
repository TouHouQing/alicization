import type { WebSocketEventInputs } from '@proj-alicization/server-sdk'
import type {
  AlicizationChatFailureKind,
  AlicizationChatFailureSurface,
  AlicizationChatMemoryFailureSurface,
  AlicizationProviderToolCapabilityObservation,
  AlicizationToolExecutionFailureContext,
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from '@proj-alicization/stage-shared'
import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { CommonContentPart, Message, ToolMessage } from '@xsai/shared-chat'

import type { StructuredOutputResult, StructuredValidationIssue } from '../composables/alicization-structured-output'
import type { AlicizationAbortReason } from '../composables/alicization-turn-abort'
import type { ChatAssistantMessage, ChatAssistantStructuredPayload, ChatSlices, ChatStreamEventContext, StreamingAssistantMessage } from '../types/chat'
import type {
  AlicizationConversationTurnInput,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmbodimentScriptV1,
  AlicizationEmotion,
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from './alicization-bridge'
import type { ChatToolProjectionSlice } from './chat-tool-projection'
import type { StreamEvent, StreamOptions } from './llm'

import {
  AlicizationToolEventDeliveryError,
  deriveAlicizationRendererBridgeWatchdogTimeoutPolicy,
  extractAlicizationProviderRequestFailure,
  extractAlicizationToolExecutionFailure,
  isAlicizationProviderSchemaUnsupportedError,
  isAlicizationToolExecutionFailureResult,
  looksLikeAlicizationStructuredPayloadText,
  normalizeAlicizationProviderToolCapabilityLastError,
  resolveAlicizationChatFailureSurface,
  sanitizeAlicizationProviderFacingText,
  shouldBufferAlicizationStructuredSpeechPrelude,
} from '@proj-alicization/stage-shared'
import { createQueue } from '@proj-alicization/stream-kit'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { ref, toRaw } from 'vue'

import { compactMessagesForPromptAssembly, sanitizeAssistantOutputForDisplay } from '../composables/alicization-guardrails'
import {
  normalizeDialogueStructuredArtifact,
  normalizeStructuredOutput,
  validateStructuredContract,
} from '../composables/alicization-structured-output'
import { abortAlicizationTurns, completeAlicizationTurnAbort, registerAlicizationTurnAbort } from '../composables/alicization-turn-abort'
import { useLlmmarkerParser } from '../composables/llm-marker-parser'
import { categorizeResponse, createStreamingCategorizer } from '../composables/response-categoriser'
import { useAnalytics } from '../composables/use-analytics'
import { translateStageUi } from '../utils/i18n'
import {
  getAlicizationBridge,
  hasAlicizationBridge,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationPerformancePayload,
} from './alicization-bridge'
import { useAlicizationPresenceDispatcherStore } from './alicization-presence-dispatcher'
import {
  blockAlicizationRendererLocalVisibleReply,
  shouldBlockAlicizationRendererLocalVisibleReply,
} from './alicization-visible-reply-guard'
import { resolveChatToolCallProjection } from './chat-tool-call-identity'
import {
  applyChatToolProjectionSlice,
  buildChatExecutionStatusFromProjection,
  extractChatExecutorToolReplyEvidence,
  isChatExecutionProjectionToolName,
} from './chat-tool-projection'
import { createDatetimeContext, createSensoryContext } from './chat/context-providers'
import { useChatContextStore } from './chat/context-store'
import { createChatHooks } from './chat/hooks'
import { useChatSessionStore } from './chat/session-store'
import { useChatStreamStore } from './chat/stream-store'
import { useLLM } from './llm'
import { useConsciousnessStore } from './modules/consciousness'
import { useProvidersStore } from './providers'

type StreamToolCallPayload = Extract<StreamEvent, { type: 'tool-call' }>

const runtimeAuthoritativeVisibleReplyBlockedErrorMessage = 'Alicization runtime-authoritative visible reply was blocked before a model-authored reply could be persisted.'

function createRuntimeAuthoritativeVisibleReplyBlockedError() {
  return new Error(runtimeAuthoritativeVisibleReplyBlockedErrorMessage)
}

function containsChatVisibleReplyFixedTemplateResidue(value: unknown, maxChars = 4000) {
  if (typeof value !== 'string' || !value.trim())
    return false
  return !sanitizeAlicizationProviderFacingText(value, maxChars, '', {
    provenance: 'internal-structured-fact',
  })
}

function isRecordPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const memoryFailureStages = new Set<AlicizationChatMemoryFailureSurface['stage']>([
  'long-term-memory-recall',
  'working-memory-history',
  'working-memory-checkpoint-load',
  'working-memory-checkpoint-save',
  'working-memory-long-term-queue',
  'working-memory-long-term-drain',
  'dialogue-session-mirror-commit',
  'autobiographical-memory-write',
  'persona-learning-schedule',
  'runtime-event-store',
  'memory-turn-settlement',
])

function normalizeTransportMemoryFailures(raw: unknown): AlicizationChatMemoryFailureSurface[] {
  if (!Array.isArray(raw))
    return []

  return raw.flatMap((value) => {
    if (!isRecordPayload(value))
      return []

    const stage = typeof value.stage === 'string'
      && memoryFailureStages.has(value.stage as AlicizationChatMemoryFailureSurface['stage'])
      ? value.stage as AlicizationChatMemoryFailureSurface['stage']
      : null
    const expectedKind = stage === 'working-memory-long-term-queue'
      || stage === 'working-memory-long-term-drain'
      || stage === 'working-memory-checkpoint-save'
      || stage === 'dialogue-session-mirror-commit'
      || stage === 'autobiographical-memory-write'
      || stage === 'persona-learning-schedule'
      || stage === 'runtime-event-store'
      || stage === 'memory-turn-settlement'
      ? 'memory-persistence'
      : 'recall-failure'
    const reply = typeof value.reply === 'string' ? value.reply.trim() : ''
    const cardId = typeof value.cardId === 'string' ? value.cardId.trim() : ''
    const turnId = typeof value.turnId === 'string' ? value.turnId.trim() : ''
    const errorSummary = typeof value.errorSummary === 'string' ? value.errorSummary.trim() : ''
    if (
      !stage
      || value.kind !== expectedKind
      || value.origin !== 'failure-surface'
      || !reply
      || !cardId
      || !turnId
      || !errorSummary
    ) {
      return []
    }

    return [{
      ...resolveAlicizationChatFailureSurface({ kind: expectedKind }),
      reply,
      stage,
      cardId,
      turnId,
      occurredAt: Number.isFinite(value.occurredAt) ? Math.max(0, Math.floor(Number(value.occurredAt))) : Date.now(),
      errorSummary,
    }]
  }).slice(0, 8)
}

function compactStringList(value: unknown, limit = 16) {
  if (!Array.isArray(value))
    return []

  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string')
      continue
    const trimmed = item.trim()
    if (!trimmed || result.includes(trimmed))
      continue
    result.push(trimmed)
    if (result.length >= limit)
      break
  }
  return result
}

function normalizeVisibleReplyCriticForPersistence(
  raw: AlicizationConversationTurnInput['visibleReplyCritic'] | null | undefined,
): AlicizationConversationTurnInput['visibleReplyCritic'] | null {
  if (!isRecordPayload(raw))
    return null

  const status = raw.status === 'pass' || raw.status === 'blocked'
    ? raw.status
    : null
  if (!status)
    return null

  return {
    version: 'visible-reply-critic-public-summary-v1',
    status,
    providerMindRequired: raw.providerMindRequired === true,
    reasonCodes: compactStringList(raw.reasonCodes),
  }
}

function normalizeVisibleReplyClosureForPersistence(
  raw: AlicizationConversationTurnInput['visibleReplyClosure'] | null | undefined,
): AlicizationConversationTurnInput['visibleReplyClosure'] | null {
  if (!isRecordPayload(raw))
    return null

  const status = raw.status === 'approved' || raw.status === 'blocked'
    ? raw.status
    : null
  if (!status)
    return null

  const normalizeCriticStatus = (value: unknown) =>
    value === 'pass' || value === 'blocked'
      ? value
      : null

  return {
    version: 'visible-reply-closure-public-summary-v1',
    status,
    reasonCodes: compactStringList(raw.reasonCodes),
    initialCriticStatus: normalizeCriticStatus(raw.initialCriticStatus),
    finalCriticStatus: normalizeCriticStatus(raw.finalCriticStatus),
  }
}

function sanitizeAlicizationAuditDetails(
  details: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!details)
    return undefined

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(details)) {
    if (key === 'candidateReply') {
      sanitized.candidateReplyChars = typeof value === 'string' ? value.length : 0
      sanitized.candidateReplyInternalLeakBlocked = typeof value === 'string'
        ? containsChatVisibleReplyFixedTemplateResidue(value)
        : true
      continue
    }
    if (key === 'finalHostVisiblePayload') {
      sanitized.finalHostVisiblePayloadChars = typeof value === 'string' ? value.length : 0
      sanitized.finalHostVisiblePayloadStructured = typeof value === 'string'
        ? looksLikeAlicizationStructuredPayloadText(value)
        : false
      continue
    }
    if (key === 'visibleReplyCritic') {
      sanitized.visibleReplyCritic = normalizeVisibleReplyCriticForPersistence(value as AlicizationConversationTurnInput['visibleReplyCritic'])
      continue
    }
    if (key === 'visibleReplyClosure') {
      sanitized.visibleReplyClosure = normalizeVisibleReplyClosureForPersistence(value as AlicizationConversationTurnInput['visibleReplyClosure'])
      continue
    }
    sanitized[key] = value
  }

  return sanitized
}

interface SendOptions {
  providerId?: string
  model: string
  chatProvider: ChatProvider
  providerConfig?: Record<string, unknown>
  attachments?: { type: 'image', data: string, mimeType: string }[]
  tools?: StreamOptions['tools']
  input?: WebSocketEventInputs
  origin?: 'ui-user' | 'tool-output' | 'context-recall' | 'system'
}

interface ForkOptions {
  fromSessionId?: string
  atIndex?: number
  reason?: string
  hidden?: boolean
}

interface QueuedSend {
  sendingMessage: string
  options: SendOptions
  generation: number
  sessionId: string
  cancelled?: boolean
  deferred: {
    resolve: () => void
    reject: (error: unknown) => void
  }
}

type ExternalPipelineAborter = (reason: AlicizationAbortReason) => Promise<void> | void

function stageChatText(path: string, params?: Record<string, unknown>) {
  return translateStageUi(`stage.chat.${path}`, params)
}

function chatFailureReply(kind: AlicizationChatFailureKind, userText?: string) {
  return resolveAlicizationChatFailureSurface({ kind, userText }).reply
}

const assistantStreamFailureFallbackReply = (userText?: string) => chatFailureReply('stream-failure', userText)
const assistantLocalRuntimeUnavailableFallbackReply = (userText?: string) => chatFailureReply('local-runtime-unavailable', userText)
const assistantProviderAuthFallbackReply = (userText?: string) => chatFailureReply('provider-auth', userText)
const assistantProviderNetworkFallbackReply = (userText?: string) => chatFailureReply('provider-network', userText)
const assistantProviderConfigFallbackReply = (userText?: string) => chatFailureReply('provider-config', userText)
const assistantUnsupportedToolsFallbackReply = (userText?: string) => chatFailureReply('model-tools-unsupported', userText)
const runtimeGatewayWatchdogPolicy = deriveAlicizationRendererBridgeWatchdogTimeoutPolicy()
function createEmptyStreamingMessage(): StreamingAssistantMessage {
  return {
    role: 'assistant',
    content: '',
    slices: [],
    tool_results: [],
  }
}

interface TurnToolEvidence {
  verifiedToolResult: boolean
  toolExecutionFailure: AlicizationToolExecutionFailureContext | null
  executorToolCallIds: Set<string>
  deniedBySafety: boolean
  deniedReason?: string
  denialSource?: 'host' | 'system' | 'generic'
  reminderToolCallIds: Set<string>
  reminderScheduled: boolean
  reminderMessage?: string
}

function resolveStreamLifecycleOwner(bridge: {
  streamLifecycleOwner?: 'main' | 'renderer'
}): 'main' | 'renderer' {
  // An omitted marker is treated as renderer-owned. Lifecycle ownership must
  // come from the bridge contract, never from the host environment shape.
  return bridge.streamLifecycleOwner ?? 'renderer'
}

function retainTerminalExecutionStatusSlices(slices: ChatSlices[]) {
  return slices.filter(slice => (
    slice.type !== 'execution-status'
    || slice.phase === 'completed'
    || slice.phase === 'tool-cancelled'
    || slice.phase === 'tool-timeout'
    || slice.phase === 'tool-failed'
  ))
}

type StructuredWithContract = StructuredOutputResult
  & Omit<ChatAssistantStructuredPayload, | 'thought'
  | 'emotion'
  | 'reply'
  | 'performance'
  | 'userSentimentScore'
  | 'sentimentConfidenceRaw'
  | 'sentimentConfidence'
  | 'format'
  | 'parsePath'>
  & {
    embodiment?: AlicizationDialogueEmbodimentEnvelope | null
    embodimentScript?: AlicizationEmbodimentScriptV1 | null
    speechTimeline?: AlicizationDialogueSpeechTimeline | null
    digitalLife?: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
    runtimeDigest?: AlicizationRuntimeDigest | null
    governance?: AlicizationMindTurnGovernance | null
    origin?: AlicizationVisibleArtifactOrigin
    learningPolicy?: {
      allowLongTermCondensation: boolean
      allowPersonaLearning: boolean
      allowTraining: boolean
    }
    failureSurface?: ReturnType<typeof resolveAlicizationChatFailureSurface> | null
  }

interface StagedAssistantResolution {
  structured: StructuredWithContract
  categorization: {
    speech: string
    reasoning: string
  }
  reply: string
  origin: AlicizationVisibleArtifactOrigin
}

export function mergeStructuredRuntimeMeta(
  structured: StructuredWithContract,
  input: {
    embodiment: AlicizationDialogueEmbodimentEnvelope | null
    embodimentScript: AlicizationEmbodimentScriptV1 | null
    speechTimeline: AlicizationDialogueSpeechTimeline | null
    digitalLife: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
    runtimeDigest: AlicizationRuntimeDigest | null
    governance: AlicizationMindTurnGovernance | null
  },
): StructuredWithContract {
  const normalizedInputDigitalLife = resolveChatRuntimeDigitalLifeAuthority({
    digitalLife: input.digitalLife,
    embodimentScript: input.embodimentScript,
  })
  const normalizedStructuredDigitalLife = resolveChatRuntimeDigitalLifeAuthority({
    digitalLife: structured.digitalLife ?? null,
    embodimentScript: structured.embodimentScript ?? null,
  })
  return normalizeDialogueStructuredArtifact({
    ...structured,
    embodiment: input.embodiment ?? structured.embodiment ?? null,
    embodimentScript: input.embodimentScript ?? structured.embodimentScript ?? null,
    speechTimeline: input.speechTimeline ?? structured.speechTimeline ?? null,
    digitalLife: normalizedInputDigitalLife ?? normalizedStructuredDigitalLife ?? input.digitalLife ?? structured.digitalLife ?? null,
    digitalLifeSpine: input.digitalLifeSpine ?? structured.digitalLifeSpine ?? null,
    runtimeDigest: input.runtimeDigest ?? structured.runtimeDigest ?? null,
    governance: input.governance ?? structured.governance ?? null,
  }) as StructuredWithContract
}

function normalizeChatRuntimeDigitalLifeEnvelope(
  digitalLife: AlicizationDigitalLifeEnvelope | null | undefined,
): AlicizationDigitalLifeEnvelope | null {
  return normalizeAlicizationDigitalLifeEnvelope(digitalLife ?? null) ?? digitalLife ?? null
}

function resolveChatRuntimeDigitalLifeAuthority(input: {
  digitalLife: AlicizationDigitalLifeEnvelope | null | undefined
  embodimentScript: AlicizationEmbodimentScriptV1 | null | undefined
}) {
  return normalizeChatRuntimeDigitalLifeEnvelope(input.digitalLife)
    ?? normalizeChatRuntimeDigitalLifeEnvelope(input.embodimentScript?.digitalLife ?? null)
}

const providerToolCapabilityStoragePrefix = 'alicization/provider-tool-capability/v1'
const providerToolCapabilityNegativeTtlMs = 24 * 60 * 60 * 1000

function buildProviderToolCapabilityStorageKey(providerId: string, model: string) {
  return `${providerToolCapabilityStoragePrefix}/${encodeURIComponent(providerId)}/${encodeURIComponent(model)}`
}

function normalizeProviderToolCapabilityObservation(
  value: unknown,
): AlicizationProviderToolCapabilityObservation | null {
  if (!isRecordPayload(value))
    return null
  if (typeof value.supported !== 'boolean')
    return null
  if (
    value.source !== 'observed-provider-error'
    && value.source !== 'observed-provider-success'
  ) {
    return null
  }
  if (!Number.isFinite(value.checkedAt) || Number(value.checkedAt) <= 0)
    return null
  if (value.lastError !== null && typeof value.lastError !== 'string')
    return null

  return {
    supported: value.supported,
    source: value.source,
    checkedAt: Math.floor(Number(value.checkedAt)),
    lastError: normalizeAlicizationProviderToolCapabilityLastError(value.source),
  }
}

function readProviderToolCapabilityObservation(
  providerId: string,
  model: string,
): AlicizationProviderToolCapabilityObservation | null {
  if (!providerId || !model || typeof localStorage === 'undefined')
    return null

  try {
    const storageKey = buildProviderToolCapabilityStorageKey(providerId, model)
    const stored = localStorage.getItem(storageKey)
    const observation = stored
      ? normalizeProviderToolCapabilityObservation(JSON.parse(stored))
      : null
    if (
      observation?.supported === false
      && Date.now() - observation.checkedAt >= providerToolCapabilityNegativeTtlMs
    ) {
      localStorage.removeItem(storageKey)
      return null
    }
    return observation
  }
  catch {
    return null
  }
}

function persistProviderToolCapabilityObservation(input: {
  providerId: string
  model: string
  supported: boolean
  source: AlicizationProviderToolCapabilityObservation['source']
}) {
  if (!input.providerId || !input.model)
    return null

  const observation: AlicizationProviderToolCapabilityObservation = {
    supported: input.supported,
    source: input.source,
    checkedAt: Date.now(),
    lastError: normalizeAlicizationProviderToolCapabilityLastError(input.source),
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(
        buildProviderToolCapabilityStorageKey(input.providerId, input.model),
        JSON.stringify(observation),
      )
    }
    catch {}
  }
  return observation
}

function resolveMainGatewayToolingPolicy(providerId: string, model: string) {
  const providerToolCapabilityObservation = readProviderToolCapabilityObservation(providerId, model)
  // Capability observations explain a previous turn; every new turn must probe tools again.
  const supportsTools = true
  return {
    toolingRequired: false,
    supportsTools,
    waitForTools: supportsTools,
    providerToolCapabilityObservation,
  }
}

function normalizeObservedToolName(event: {
  toolName?: unknown
  name?: unknown
}) {
  const toolName = typeof event.toolName === 'string' ? event.toolName : ''
  if (toolName.trim())
    return toolName.trim()
  const fallbackName = typeof event.name === 'string' ? event.name : ''
  return fallbackName.trim()
}

function toToolMessageFromStreamEvent(event: StreamToolCallPayload): ToolMessage {
  return {
    role: 'tool',
    content: '',
    tool_call_id: typeof event.toolCallId === 'string' ? event.toolCallId : '',
    toolName: normalizeObservedToolName(event),
  } as ToolMessage
}

function parseKillSwitchDirective(message: string): 'suspend' | 'resume' | null {
  const normalized = message.trim()
  const suspendPattern = /^(?:Alicization[,，]?\s*)?(?:强制休眠|休眠|suspend|sleep)\s*$/i
  const resumePattern = /^(?:Alicization[,，]?\s*)?(?:恢复|唤醒|resume|wake)\s*$/i
  if (suspendPattern.test(normalized))
    return 'suspend'
  if (resumePattern.test(normalized))
    return 'resume'
  return null
}

function resolveAbortReason(error: unknown, stale: boolean): AlicizationAbortReason {
  if (stale)
    return 'session-reset'

  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '')
    const match = /Turn aborted:\s*([a-z-]+)/i.exec(message)
    const reason = match?.[1]?.toLowerCase()
    if (reason === 'kill-switch' || reason === 'session-reset' || reason === 'manual' || reason === 'shutdown')
      return reason
  }

  return 'unknown'
}

type StreamFailureKind = AlicizationChatFailureKind

function buildTimeoutDiagnosticFailure(error: unknown, userText?: string, providerContext?: {
  providerId?: string
  model?: string
}) {
  void error
  return resolveAlicizationChatFailureSurface({
    kind: 'timeout',
    userText,
    timeout: {
      providerId: providerContext?.providerId?.trim() || 'unknown-provider',
      model: providerContext?.model?.trim() || 'unknown-model',
      phase: 'provider-first-event',
    },
  })
}

function resolveStreamFailureFallback(error: unknown, userText?: string, providerContext?: {
  providerId?: string
  model?: string
}): {
  reply: string
  kind: StreamFailureKind
  failureSurface?: AlicizationChatFailureSurface
} {
  const errorCode = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code ?? '').toLowerCase()
    : ''
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
  if (error instanceof AlicizationToolEventDeliveryError) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'tool-execution',
      userText,
      toolExecution: {
        code: error.code,
        message: error.message,
        toolName: error.toolName,
      },
    })
    return {
      reply: failureSurface.reply,
      kind: 'tool-execution',
      failureSurface,
    }
  }
  if (isAlicizationProviderSchemaUnsupportedError(error)) {
    return {
      reply: chatFailureReply('provider-schema-unsupported', userText),
      kind: 'provider-schema-unsupported',
    }
  }
  const isStartRejectedError
    = errorCode.includes('alicization-stream-start-rejected')
      || message.includes('stream start rejected')
  if (
    errorCode.includes('alicization-stream-superseded')
    || errorCode.includes('alicization-stream-renderer-unmounted')
    || message.includes('state=duplicate-running')
    || message.includes('state=duplicate-finished')
    || message.includes('duplicate-running')
    || message.includes('duplicate-finished')
  ) {
    return {
      reply: assistantStreamFailureFallbackReply(userText),
      kind: 'runtime-aborted',
    }
  }
  if (
    message.includes('missing providerid/model')
    || message.includes('missing provider/model')
    || message.includes('state=missing-config')
    || message.includes('missing providerid/model for main-process chat stream')
    || message.includes('missing provider/model for main-process chat stream')
    || (isStartRejectedError && message.includes('reason=missing providerid/model'))
    || (isStartRejectedError && message.includes('reason=missing provider/model'))
  ) {
    return {
      reply: assistantProviderConfigFallbackReply(userText),
      kind: 'provider-config',
    }
  }
  if (
    message.includes('localhost:11434')
    || message.includes('localhost:1234')
    || message.includes('127.0.0.1:11434')
    || message.includes('127.0.0.1:1234')
    || message.includes('ollama')
    || message.includes('lm studio')
  ) {
    return {
      reply: assistantLocalRuntimeUnavailableFallbackReply(userText),
      kind: 'local-runtime-unavailable',
    }
  }
  const toolExecution = extractAlicizationToolExecutionFailure(error)
  if (toolExecution) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'tool-execution',
      userText,
      toolExecution,
    })
    return {
      reply: failureSurface.reply,
      kind: 'tool-execution',
      failureSurface,
    }
  }
  if (
    message.includes('chat_timeout')
    || message.includes('chat completions timed out before the first event')
    || (message.includes('main gateway health check failed') && message.includes('first event'))
    || message.includes('after-dispatch-meta')
    || message.includes('main-gateway-timeout-recovery')
  ) {
    const failureSurface = buildTimeoutDiagnosticFailure(error, userText, providerContext)
    return {
      reply: failureSurface.reply,
      kind: 'timeout',
      failureSurface,
    }
  }
  if (
    message.includes('gateway-unreachable')
    || message.includes('main gateway connectivity check failed')
    || message.includes('enotfound')
    || message.includes('econnreset')
    || message.includes('econnrefused')
    || message.includes('network')
    || message.includes('fetch failed')
    || message.includes('socket hang up')
  ) {
    return {
      reply: assistantProviderNetworkFallbackReply(userText),
      kind: 'provider-network',
    }
  }
  if (
    message.includes('chat-first-event-timeout')
    || message.includes('stream timed out')
    || message.includes('main-gateway-timeout')
    || message.includes('timeout')
    || message.includes('timed out')
  ) {
    const failureSurface = buildTimeoutDiagnosticFailure(error, userText, providerContext)
    return {
      reply: failureSurface.reply,
      kind: 'timeout',
      failureSurface,
    }
  }
  if (
    message.includes('does not support tools')
    || message.includes('no endpoints found that support tool use')
    || message.includes('function calling is not supported')
    || message.includes('tool use is not supported')
    || message.includes('unsupported tool')
  ) {
    return {
      reply: assistantUnsupportedToolsFallbackReply(userText),
      kind: 'model-tools-unsupported',
    }
  }
  if (
    message.includes('401')
    || message.includes('403')
    || message.includes('unauthorized')
    || message.includes('forbidden')
    || message.includes('authentication')
    || message.includes('api key')
    || message.includes('invalid key')
  ) {
    return {
      reply: assistantProviderAuthFallbackReply(userText),
      kind: 'provider-auth',
    }
  }
  const providerRequest = extractAlicizationProviderRequestFailure(error)
  if (providerRequest) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'provider-request',
      userText,
      providerRequest: {
        ...providerRequest,
        providerId: providerContext?.providerId?.trim() || 'unknown-provider',
        model: providerContext?.model?.trim() || 'unknown-model',
      },
    })
    return {
      reply: failureSurface.reply,
      kind: 'provider-request',
      failureSurface,
    }
  }
  if (
    errorCode.includes('alicization-stream-start-rejected')
    || message.includes('state=start-failed')
    || message.includes('stream start rejected')
  ) {
    return {
      reply: assistantStreamFailureFallbackReply(userText),
      kind: 'unknown',
    }
  }
  if (
    message.includes('abort')
    || message.includes('renderer-abort')
    || message.includes('kill-switch')
  ) {
    return {
      reply: assistantStreamFailureFallbackReply(userText),
      kind: 'runtime-aborted',
    }
  }
  return {
    reply: assistantStreamFailureFallbackReply(userText),
    kind: 'unknown',
  }
}

function shouldRetryStreamWithoutTools(error: unknown, options: {
  supportsTools?: boolean
  sawProgress: boolean
}) {
  if (options.supportsTools === false)
    return false
  if (options.sawProgress)
    return false

  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
  const providerRequest = extractAlicizationProviderRequestFailure(error)
  if (
    providerRequest?.status === 400
    && (
      providerRequest.code === 'invalid_request_error'
      || message.includes('upstream request failed')
      || message.includes('invalid_request_error')
    )
  ) {
    return true
  }
  return message.includes('does not support tools')
    || message.includes('no endpoints found that support tool use')
    || message.includes('function calling is not supported')
    || message.includes('tool use is not supported')
    || message.includes('unsupported tool')
}

function isStreamTimeoutError(error: unknown) {
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
  return message.includes('timed out')
    || message.includes('timeout')
    || message.includes('chat-first-event-timeout')
}

function readStreamErrorProgressFlag(error: unknown) {
  if (!error || typeof error !== 'object')
    return false
  return Boolean((error as { __alicizationSawProgress?: unknown }).__alicizationSawProgress)
}

function replaceAssistantTextSlices(slices: ChatSlices[], text: string): ChatSlices[] {
  const normalizedText = text.trim()
  const nextSlices: ChatSlices[] = []
  let inserted = false

  for (const slice of slices) {
    if (slice.type === 'text') {
      if (!inserted && normalizedText) {
        nextSlices.push({
          type: 'text',
          text: normalizedText,
        })
        inserted = true
      }
      continue
    }

    nextSlices.push(slice)
  }

  if (!inserted && normalizedText) {
    nextSlices.unshift({
      type: 'text',
      text: normalizedText,
    })
  }

  return nextSlices
}

function stringifyAssistantContent(content: unknown) {
  if (typeof content === 'string')
    return content

  if (!Array.isArray(content))
    return ''

  return content
    .map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String((part as { text?: unknown }).text ?? '')
      return ''
    })
    .join('')
}

function hasVerifiedToolResult(result?: unknown) {
  if (typeof result === 'string') {
    return result.trim().length > 0
  }

  if (Array.isArray(result)) {
    return result.some((part) => {
      if (typeof part === 'string')
        return part.trim().length > 0
      if (part && typeof part === 'object' && 'text' in part)
        return String((part as { text?: unknown }).text ?? '').trim().length > 0
      return Boolean(part && typeof part === 'object' && Object.keys(part).length > 0)
    })
  }

  if (!result || typeof result !== 'object')
    return false

  const payload = result as Record<string, unknown>
  if (payload.isError === true || payload.ok === false)
    return false

  const content = payload.content
  const structuredContent = payload.structuredContent
  const toolResult = payload.toolResult

  const hasContent = (value: unknown): boolean => {
    if (typeof value === 'string')
      return value.trim().length > 0
    if (Array.isArray(value)) {
      return value.some((entry) => {
        if (typeof entry === 'string')
          return entry.trim().length > 0
        if (entry && typeof entry === 'object' && 'text' in entry)
          return String((entry as { text?: unknown }).text ?? '').trim().length > 0
        return Boolean(entry && typeof entry === 'object' && Object.keys(entry).length > 0)
      })
    }
    if (value && typeof value === 'object')
      return Object.keys(value as Record<string, unknown>).length > 0
    return false
  }

  return hasContent(content) || hasContent(structuredContent) || hasContent(toolResult)
}

function extractDeniedToolReason(result?: unknown): string | null {
  if (!result || typeof result !== 'object')
    return null

  const payload = result as Record<string, unknown>
  const errorCode = typeof payload.errorCode === 'string' ? payload.errorCode : ''
  if (
    errorCode === 'ALICIZATION_TOOL_DENIED'
    || errorCode === 'ALICIZATION_TOOL_DENIED_BY_HOST'
    || errorCode === 'ALICIZATION_TOOL_DENIED_SYSTEM'
    || errorCode === 'ALICIZATION_TOOL_ABORTED'
  ) {
    return errorCode
  }

  const content = Array.isArray(payload.content) ? payload.content : []
  for (const part of content) {
    if (!part || typeof part !== 'object')
      continue
    const text = typeof (part as Record<string, unknown>).text === 'string'
      ? String((part as Record<string, unknown>).text)
      : ''
    if (!text.trim())
      continue
    try {
      const parsed = JSON.parse(text) as { code?: unknown, status?: unknown }
      const parsedCode = typeof parsed.code === 'string' ? parsed.code : ''
      const parsedStatus = typeof parsed.status === 'string' ? parsed.status : ''
      if (
        parsedStatus === 'error'
        && (
          parsedCode === 'ALICIZATION_TOOL_DENIED'
          || parsedCode === 'ALICIZATION_TOOL_DENIED_BY_HOST'
          || parsedCode === 'ALICIZATION_TOOL_DENIED_SYSTEM'
          || parsedCode === 'ALICIZATION_TOOL_ABORTED'
        )
      ) {
        return parsedCode
      }
    }
    catch {
      // NOTICE: Tool content may contain plain text; ignore JSON parse failures here.
    }
  }

  return null
}

function classifyDeniedSource(deniedReason?: string): 'host' | 'system' | 'generic' | undefined {
  if (!deniedReason)
    return undefined
  if (deniedReason === 'ALICIZATION_TOOL_DENIED_BY_HOST')
    return 'host'
  if (deniedReason === 'ALICIZATION_TOOL_DENIED_SYSTEM')
    return 'system'
  return 'generic'
}

function extractScheduledReminderPayload(result?: unknown): { scheduled: boolean, message?: string } {
  const parseFromObject = (value: Record<string, unknown>) => {
    const status = typeof value.status === 'string' ? value.status.toLowerCase() : ''
    if (status !== 'scheduled')
      return null
    const message = typeof value.message === 'string' ? value.message.trim() : ''
    return {
      scheduled: true,
      message: message || undefined,
    }
  }

  if (!result || typeof result !== 'object')
    return { scheduled: false }

  const payload = result as Record<string, unknown>
  const direct = parseFromObject(payload)
  if (direct)
    return direct

  if (payload.toolResult && typeof payload.toolResult === 'object') {
    const nested = parseFromObject(payload.toolResult as Record<string, unknown>)
    if (nested)
      return nested
  }

  if (payload.structuredContent && typeof payload.structuredContent === 'object') {
    const nested = parseFromObject(payload.structuredContent as Record<string, unknown>)
    if (nested)
      return nested
  }

  return { scheduled: false }
}

function isUsableMindTurnGovernanceCandidate(value: unknown): value is AlicizationMindTurnGovernance {
  if (!value || typeof value !== 'object')
    return false

  const candidate = value as Partial<AlicizationMindTurnGovernance>
  return typeof candidate.turnMode === 'string'
    && candidate.turnMode.trim().length > 0
    && typeof candidate.truthState === 'string'
    && candidate.truthState.trim().length > 0
    && typeof candidate.personaKernelMode === 'string'
    && candidate.personaKernelMode.trim().length > 0
    && typeof candidate.openingStyle === 'string'
    && candidate.openingStyle.trim().length > 0
    && typeof candidate.relationshipPosture === 'string'
    && candidate.relationshipPosture.trim().length > 0
    && typeof candidate.repairState === 'string'
    && candidate.repairState.trim().length > 0
    && typeof candidate.labelCarryAsMemory === 'boolean'
    && typeof candidate.shouldAskForGrounding === 'boolean'
    && typeof candidate.shouldAcknowledgeRepair === 'boolean'
    && typeof candidate.maxSentences === 'number'
    && Number.isFinite(candidate.maxSentences)
    && Array.isArray(candidate.mustDo)
    && Array.isArray(candidate.mustNotDo)
}

function hasProviderAuthoredVisibleReplyContract(
  structured: StructuredOutputResult | undefined,
  _validationIssues: StructuredValidationIssue[],
) {
  return Boolean(
    structured
    && structured.reply.trim()
    && (structured.parsePath === 'json' || structured.parsePath === 'fallback'),
  )
}

function normalizeStructuredTurnForPersistence(
  structured: StructuredWithContract | undefined,
): Record<string, unknown> | undefined {
  if (!structured)
    return undefined

  const normalizedDigitalLife = resolveChatRuntimeDigitalLifeAuthority({
    digitalLife: structured.digitalLife ?? null,
    embodimentScript: structured.embodimentScript ?? null,
  })
  return normalizeDialogueStructuredArtifact({
    ...structured,
    digitalLife: normalizedDigitalLife,
  })
}

function asStructuredWithContract(
  structured: ChatAssistantMessage['structured'] | undefined,
): StructuredWithContract | undefined {
  return structured ? structured as StructuredWithContract : undefined
}

function createFailureStructuredArtifact(input: {
  kind: StreamFailureKind
  failureSurface?: AlicizationChatFailureSurface
  replyText?: string
  emotion?: StructuredOutputResult['emotion']
  userText?: string
}): StructuredWithContract {
  const emotion = input.emotion ?? 'concerned'
  const failureSurface = input.failureSurface ?? resolveAlicizationChatFailureSurface({
    kind: input.kind,
    userText: input.userText,
  })
  const reply = input.replyText?.trim() || failureSurface.reply
  return {
    thought: '',
    emotion,
    reply,
    performance: normalizeAlicizationPerformancePayload(undefined, emotion as AlicizationEmotion),
    userSentimentScore: 0,
    sentimentConfidence: 0.2,
    format: 'mind-turn-v1',
    parsePath: 'fallback',
    contractFailed: true,
    origin: failureSurface.origin,
    learningPolicy: {
      allowLongTermCondensation: failureSurface.allowLongTermCondensation,
      allowPersonaLearning: failureSurface.allowPersonaLearning,
      allowTraining: failureSurface.allowTraining,
    },
    failureSurface,
    nonHumanAuthoredStatus: failureSurface.nonHumanAuthoredStatus,
    excludeFromPersonaLearning: failureSurface.excludeFromPersonaLearning,
    excludeFromMemoryCondensation: failureSurface.excludeFromMemoryCondensation,
  }
}

function isDirectInfrastructureRepairFallback(structured?: StructuredWithContract | null) {
  return structured?.parsePath === 'fallback'
    && structured.contractFailed === true
    && typeof structured.nonHumanAuthoredStatus === 'string'
    && structured.nonHumanAuthoredStatus.startsWith('direct-infra-repair:')
}

async function appendAlicizationAuditLog(payload: {
  level: 'info' | 'notice' | 'warning' | 'critical'
  category: string
  action: string
  message: string
  details?: Record<string, unknown>
}) {
  if (!hasAlicizationBridge())
    return

  await getAlicizationBridge().appendAuditLog({
    level: payload.level,
    category: payload.category,
    action: payload.action,
    message: payload.message,
    payload: sanitizeAlicizationAuditDetails(payload.details),
  }).catch(() => {})
}

export const useChatOrchestratorStore = defineStore('chat-orchestrator', () => {
  const llmStore = useLLM()
  const consciousnessStore = useConsciousnessStore()
  const providersStore = useProvidersStore()
  const { activeProvider, activeModel } = storeToRefs(consciousnessStore)
  const { trackFirstMessage } = useAnalytics()

  const chatSession = useChatSessionStore()
  const chatStream = useChatStreamStore()
  const chatContext = useChatContextStore()
  const presenceDispatcher = useAlicizationPresenceDispatcherStore()
  const { activeSessionId } = storeToRefs(chatSession)
  const { streamingMessage } = storeToRefs(chatStream)

  const sending = ref(false)
  const pendingQueuedSends = ref<QueuedSend[]>([])
  const externalPipelineAborters = new Set<ExternalPipelineAborter>()
  const hooks = createChatHooks()
  let stopVisualPresencePulseSubscription: (() => void) | null = null

  function ensureVisualPresencePulseSubscription() {
    if (stopVisualPresencePulseSubscription || !hasAlicizationBridge())
      return

    const bridge = getAlicizationBridge()
    if (typeof bridge.onVisualPresencePulse !== 'function')
      return

    stopVisualPresencePulseSubscription = bridge.onVisualPresencePulse((payload) => {
      if (!payload || payload.expiresAt <= Date.now())
        return
      if (!payload.reasonTags?.includes('continuity-mind:quiet-companionship'))
        return

      void presenceDispatcher.dispatchSilentPresencePulse({
        payload,
      })
    })
  }

  function resolveSendRoute(options: SendOptions) {
    const providerId = typeof options.providerId === 'string' && options.providerId.trim()
      ? options.providerId.trim()
      : activeProvider.value?.trim() ?? ''
    const model = typeof options.model === 'string' && options.model.trim()
      ? options.model.trim()
      : activeModel.value?.trim() ?? ''
    const providerConfig = options.providerConfig && typeof options.providerConfig === 'object'
      ? options.providerConfig
      : providerId
        ? providersStore.getProviderConfig(providerId) ?? {}
        : {}
    return {
      providerId,
      model,
      providerConfig,
    }
  }

  const sendQueue = createQueue<QueuedSend>({
    handlers: [
      async ({ data }) => {
        const { sendingMessage, options, generation, deferred, sessionId, cancelled } = data

        if (cancelled)
          return

        if (chatSession.getSessionGeneration(sessionId) !== generation) {
          deferred.reject(new Error(stageChatText('errors.session-reset-before-send')))
          return
        }

        try {
          await performSend(sendingMessage, options, generation, sessionId)
          deferred.resolve()
        }
        catch (error) {
          deferred.reject(error)
        }
      },
    ],
  })

  sendQueue.on('enqueue', (queuedSend) => {
    pendingQueuedSends.value = [...pendingQueuedSends.value, queuedSend]
  })

  sendQueue.on('dequeue', (queuedSend) => {
    pendingQueuedSends.value = pendingQueuedSends.value.filter(item => item !== queuedSend)
  })

  async function performSend(
    sendingMessage: string,
    options: SendOptions,
    generation: number,
    sessionId: string,
  ) {
    if (!sendingMessage && !options.attachments?.length)
      return

    const isForegroundSession = () => sessionId === activeSessionId.value
    const isStaleGeneration = () => chatSession.getSessionGeneration(sessionId) !== generation
    const earlyPlaceholderCreatedAt = Date.now()
    let earlyPlaceholderVisible = false
    const clearEarlyPlaceholder = () => {
      if (earlyPlaceholderVisible && isForegroundSession()) {
        streamingMessage.value = createEmptyStreamingMessage()
      }
      earlyPlaceholderVisible = false
      sending.value = false
    }

    sending.value = true
    if (isForegroundSession()) {
      streamingMessage.value = {
        ...createEmptyStreamingMessage(),
        createdAt: earlyPlaceholderCreatedAt,
        id: `chat:${sessionId}:pending:${earlyPlaceholderCreatedAt}`,
      }
      earlyPlaceholderVisible = true
    }

    try {
      await chatSession.ensureSessionReady(sessionId)
    }
    catch (error) {
      clearEarlyPlaceholder()
      throw error
    }

    // Inject current datetime context before composing the message
    chatContext.ingestContextMessage(createDatetimeContext())
    if (hasAlicizationBridge()) {
      try {
        const sensorySnapshot = await getAlicizationBridge().getSensorySnapshot()
        chatContext.ingestContextMessage(createSensoryContext(sensorySnapshot))

        if (sensorySnapshot.sample.degraded?.length) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'alicization.sensory',
            action: 'degraded',
            message: 'Sensory probe sample contains degraded fields.',
            details: {
              reasons: sensorySnapshot.sample.degraded,
            },
          })
        }

        if (sensorySnapshot.stale) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'alicization.sensory',
            action: 'stale',
            message: 'Sensory probe snapshot is stale before prompt injection.',
            details: {
              ageMs: sensorySnapshot.ageMs,
            },
          })
        }

        if (sensorySnapshot.capture && sensorySnapshot.capture.health !== 'healthy') {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'alicization.sensory',
            action: 'capture-degraded',
            message: 'Screen capture diagnostics indicate degraded or unavailable visual grounding.',
            details: {
              health: sensorySnapshot.capture.health,
              permission: sensorySnapshot.capture.permission,
              reasons: sensorySnapshot.capture.degradedReasons,
            },
          })
        }

        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'alicization.sensory',
          action: 'injected',
          message: 'Injected sensory context into runtime prompt section.',
          details: {
            stale: sensorySnapshot.stale,
            ageMs: sensorySnapshot.ageMs,
            running: sensorySnapshot.running,
            captureHealth: sensorySnapshot.capture?.health ?? null,
            capturePermission: sensorySnapshot.capture?.permission ?? null,
          },
        })
      }
      catch (error) {
        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.sensory',
          action: 'inject-failed',
          message: 'Failed to inject sensory context before compose.',
          details: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    const sendingCreatedAt = Date.now()
    const streamingMessageContext: ChatStreamEventContext = {
      sessionId,
      message: { role: 'user', content: sendingMessage, createdAt: sendingCreatedAt, id: nanoid() },
      contexts: chatContext.getContextsSnapshot(),
      composedMessage: [],
      input: options.input,
    }

    if (isStaleGeneration()) {
      clearEarlyPlaceholder()
      return
    }

    const activeTurn = registerAlicizationTurnAbort({
      scope: 'chat',
      turnId: `chat:${sessionId}:${streamingMessageContext.message.id}`,
    })
    const abortSignal = activeTurn.signal
    const turnId = activeTurn.turnId
    const shouldAbort = () => isStaleGeneration() || abortSignal.aborted

    sending.value = true

    // NOTICE: Keep the assistant message id stable per turn so renderer-side
    // reconcile can upsert the main-process replay instead of inserting a duplicate.
    const buildingMessage: StreamingAssistantMessage = { role: 'assistant', content: '', slices: [], tool_results: [], createdAt: Date.now(), id: turnId }
    let stagedAssistantResolution: StagedAssistantResolution | null = null
    let stagedSpeechDraft = ''
    let finalAssistantDisplayText = ''
    let assistantTextCommitted = false
    let blockedStructuredTurnForPersistence: StructuredWithContract | null = null
    let blockedStructuredTurnPersisted = false
    let resolvedRouteForFailure: ReturnType<typeof resolveSendRoute> | null = null

    const updateUI = () => {
      if (isForegroundSession()) {
        streamingMessage.value = JSON.parse(JSON.stringify(buildingMessage))
      }
    }

    updateUI()
    trackFirstMessage()

    const sessionMessagesForSend = chatSession.getSessionMessages(sessionId)
    let userTurnMessageId: string | null = null
    let assistantOutputCommitted = false
    let runtimeAuthoritativeVisibleReplyBlocked = false
    let runtimeAuthoritativeModelTextObserved = false
    let finalizeAssistantTurn: (() => Promise<string>) | null = null
    let turnTransportArtifactOrigin: AlicizationVisibleArtifactOrigin | null = null
    let turnTransportLearningPolicy: AlicizationVisibleArtifactLearningPolicy | null = null
    let turnTransportFailureSurface: AlicizationChatFailureSurface | null = null
    let turnMemoryFailures: AlicizationChatMemoryFailureSurface[] = []
    let turnTransportProviderFullText = ''
    let turnTransportVisibleText = ''
    let turnMindGovernance: AlicizationMindTurnGovernance | null = null
    let turnEmbodiment: AlicizationDialogueEmbodimentEnvelope | null = null
    let turnEmbodimentScript: AlicizationEmbodimentScriptV1 | null = null
    let turnSpeechTimeline: AlicizationDialogueSpeechTimeline | null = null
    let turnDigitalLife: AlicizationDigitalLifeEnvelope | null = null
    let turnDigitalLifeSpine: AlicizationDigitalLifeSpineDigest | null = null
    let turnRuntimeDigest: AlicizationRuntimeDigest | null = null
    let turnVisibleReplyExecution: AlicizationConversationTurnInput['visibleReplyExecution'] | null = null
    let turnVisibleReplyCritic: AlicizationConversationTurnInput['visibleReplyCritic'] | null = null
    let turnVisibleReplyClosure: AlicizationConversationTurnInput['visibleReplyClosure'] | null = null
    const turnToolCalls: ToolMessage[] = []

    const getTurnStructuredRuntimeMeta = () => {
      return {
        embodiment: turnEmbodiment,
        embodimentScript: turnEmbodimentScript,
        speechTimeline: turnSpeechTimeline,
        digitalLife: turnDigitalLife,
        digitalLifeSpine: turnDigitalLifeSpine,
        runtimeDigest: turnRuntimeDigest,
        governance: turnMindGovernance,
      }
    }

    const ingestTurnStructuredRuntimeMeta = (event: Extract<StreamEvent, { type: 'meta' }>) => {
      if (isUsableMindTurnGovernanceCandidate(event.governance)) {
        turnMindGovernance = event.governance
      }
      turnEmbodiment = normalizeDialogueStructuredArtifact(event.embodiment ?? turnEmbodiment)
      turnEmbodimentScript = normalizeDialogueStructuredArtifact(event.embodimentScript ?? turnEmbodimentScript)
      turnSpeechTimeline = normalizeDialogueStructuredArtifact(event.speechTimeline ?? turnSpeechTimeline)
      turnDigitalLife = normalizeDialogueStructuredArtifact(resolveChatRuntimeDigitalLifeAuthority({
        digitalLife: event.digitalLife,
        embodimentScript: event.embodimentScript,
      }) ?? turnDigitalLife)
      turnDigitalLifeSpine = normalizeDialogueStructuredArtifact(event.digitalLifeSpine ?? turnDigitalLifeSpine)
      turnRuntimeDigest = normalizeDialogueStructuredArtifact(event.runtimeDigest ?? turnRuntimeDigest)
    }

    const transportFailurePriority = (failureSurface: AlicizationChatFailureSurface) => {
      if (failureSurface.kind === 'tool-execution')
        return 100
      if (failureSurface.kind === 'provider-output-invalid' || failureSurface.kind === 'internal-leak')
        return 10
      return 50
    }

    const setStagedAssistantResolution = (resolution: StagedAssistantResolution) => {
      if (turnTransportFailureSurface) {
        const resolutionFailureSurface = resolution.structured.failureSurface
        if (
          resolution.origin !== 'failure-surface'
          || (
            resolutionFailureSurface
            && transportFailurePriority(resolutionFailureSurface) < transportFailurePriority(turnTransportFailureSurface)
          )
        ) {
          return stagedAssistantResolution ?? resolution
        }
      }
      stagedAssistantResolution = resolution
      finalAssistantDisplayText = resolution.reply
      return resolution
    }

    const stageFailureSurface = (
      kind: StreamFailureKind,
      replyText?: string,
      emotion: StructuredOutputResult['emotion'] = 'concerned',
    ) => {
      if (stagedAssistantResolution?.origin === 'failure-surface')
        return stagedAssistantResolution

      const structured = createFailureStructuredArtifact({
        kind,
        replyText,
        emotion,
        userText: sendingMessage,
      })
      return setStagedAssistantResolution({
        structured,
        categorization: {
          speech: structured.reply,
          reasoning: '',
        },
        reply: structured.reply,
        origin: 'failure-surface',
      })
    }

    const stageTransportFailureSurface = (
      failureSurface: AlicizationChatFailureSurface,
      emotion: StructuredOutputResult['emotion'] = 'concerned',
    ) => {
      if (
        turnTransportFailureSurface
        && transportFailurePriority(turnTransportFailureSurface) >= transportFailurePriority(failureSurface)
      ) {
        return stagedAssistantResolution
      }

      turnTransportArtifactOrigin = failureSurface.origin
      turnTransportLearningPolicy = {
        allowLongTermCondensation: failureSurface.allowLongTermCondensation,
        allowPersonaLearning: failureSurface.allowPersonaLearning,
        allowTraining: failureSurface.allowTraining,
      }
      turnTransportFailureSurface = failureSurface
      const structured = createFailureStructuredArtifact({
        kind: failureSurface.kind,
        failureSurface,
        emotion,
      })
      return setStagedAssistantResolution({
        structured,
        categorization: {
          speech: structured.reply,
          reasoning: '',
        },
        reply: structured.reply,
        origin: 'failure-surface',
      })
    }

    const clearTransportFailureSurfaceForRetry = () => {
      turnTransportArtifactOrigin = null
      turnTransportLearningPolicy = null
      turnTransportFailureSurface = null
      stagedAssistantResolution = null
      stagedSpeechDraft = ''
      finalAssistantDisplayText = ''
      turnTransportProviderFullText = ''
      turnTransportVisibleText = ''
    }

    const ingestTransportVisibleArtifactMetadata = (
      event: Pick<
        Extract<StreamEvent, { type: 'text-delta' | 'finish' | 'error' }>,
        'origin' | 'learningPolicy' | 'failureSurface'
      >,
    ) => {
      if (event.origin)
        turnTransportArtifactOrigin = event.origin
      if (event.learningPolicy)
        turnTransportLearningPolicy = event.learningPolicy
      if (event.origin === 'failure-surface' && event.failureSurface)
        stageTransportFailureSurface(event.failureSurface)
    }

    const isAlicizationUserTurn = () =>
      (options.origin ?? 'ui-user') === 'ui-user'
      && hasAlicizationBridge()

    const shouldBlockRendererLocalVisibleReply = () => shouldBlockAlicizationRendererLocalVisibleReply({
      isAlicizationUserTurn: isAlicizationUserTurn(),
    })

    const ensureRuntimeAuthoritativeVisibleReplyExecution = () => {
      if (turnVisibleReplyExecution || !runtimeAuthoritativeModelTextObserved)
        return
      turnVisibleReplyExecution = {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      }
    }

    const blockRuntimeAuthoritativeLocalVisibleReply = async (input: {
      action: string
      message: string
      details?: Record<string, unknown>
      level?: 'warning' | 'critical'
    }) => {
      const blockedStructuredTurnCandidate = (
        buildingMessage.structured && typeof buildingMessage.structured === 'object'
          ? buildingMessage.structured
          : stagedAssistantResolution?.structured
      ) as StructuredWithContract | undefined
      if (!blockedStructuredTurnForPersistence && blockedStructuredTurnCandidate) {
        blockedStructuredTurnForPersistence = {
          ...blockedStructuredTurnCandidate,
        }
      }
      const blockResult = blockAlicizationRendererLocalVisibleReply({
        buildingMessage,
        setRuntimeBlocked: () => {
          runtimeAuthoritativeVisibleReplyBlocked = true
        },
        resetStagedResolution: () => {
          stagedAssistantResolution = null
        },
        resetSpeechDraft: () => {
          stagedSpeechDraft = ''
        },
        resetFinalAssistantDisplayText: () => {
          finalAssistantDisplayText = ''
        },
        createEmptyStreamingMessage,
      })
      await appendAlicizationAuditLog({
        level: input.level ?? 'warning',
        category: 'alicization.visible-reply',
        action: input.action,
        message: input.message,
        details: {
          sessionId,
          turnId,
          ...input.details,
        },
      })
      if (isForegroundSession()) {
        streamingMessage.value = blockResult.streamingMessage
      }

      if (
        !blockedStructuredTurnPersisted
        && blockedStructuredTurnForPersistence
        && hasAlicizationBridge()
      ) {
        blockedStructuredTurnPersisted = true
        await getAlicizationBridge().appendConversationTurn({
          turnId,
          sessionId,
          userText: sendingMessage,
          assistantText: '',
          structured: normalizeStructuredTurnForPersistence({ ...blockedStructuredTurnForPersistence }),
          visibleReplyExecution: turnVisibleReplyExecution,
          visibleReplyCritic: normalizeVisibleReplyCriticForPersistence(turnVisibleReplyCritic),
          visibleReplyClosure: normalizeVisibleReplyClosureForPersistence(turnVisibleReplyClosure),
          governance: turnMindGovernance,
          createdAt: Date.now(),
        }).catch(() => {})
      }
    }

    const commitAssistantResolution = async () => {
      if (runtimeAuthoritativeVisibleReplyBlocked)
        return ''

      if (assistantTextCommitted)
        return finalAssistantDisplayText

      const staged = stagedAssistantResolution
      if (!staged?.reply.trim())
        return ''

      if (isAlicizationUserTurn()) {
        const providerArtifact = staged.origin === 'provider'
        const failureArtifact = staged.origin === 'failure-surface'
          && isDirectInfrastructureRepairFallback(staged.structured)
        if ((!providerArtifact && !failureArtifact) || (providerArtifact && !runtimeAuthoritativeModelTextObserved)) {
          await blockRuntimeAuthoritativeLocalVisibleReply({
            action: 'runtime-authoritative-renderer-finalization-blocked',
            message: 'Renderer blocked finalization because Alicization visible artifacts must come from the provider or a transparent failure surface.',
            details: {
              stagedOrigin: staged.origin,
              hasStagedReply: Boolean(staged?.reply?.trim()),
              hasFinalAssistantDisplayText: Boolean(finalAssistantDisplayText.trim()),
              hasStagedSpeechDraft: Boolean(stagedSpeechDraft.trim()),
              hasBuildingContent: Boolean(stringifyAssistantContent(buildingMessage.content).trim()),
              runtimeAuthoritativeModelTextObserved,
            },
            level: 'critical',
          })
          return ''
        }
        if (providerArtifact)
          ensureRuntimeAuthoritativeVisibleReplyExecution()
      }
      const structuredWithRuntimeMeta = mergeStructuredRuntimeMeta(
        staged.structured,
        getTurnStructuredRuntimeMeta(),
      )
      const finalReply = staged.reply.trim()
      const categorization = staged.categorization
      const finalizedCategorization = {
        ...categorization,
        speech: finalReply,
      }
      const finalizedSlices = finalReply
        ? retainTerminalExecutionStatusSlices(replaceAssistantTextSlices(buildingMessage.slices, finalReply))
        : replaceAssistantTextSlices(buildingMessage.slices, finalReply)

      buildingMessage.categorization = finalizedCategorization
      buildingMessage.structured = structuredWithRuntimeMeta
      buildingMessage.content = finalReply
      buildingMessage.slices = finalizedSlices
      finalAssistantDisplayText = finalReply
      assistantTextCommitted = true

      // NOTICE: Provider output becomes visible only after structural settlement.
      await hooks.emitTokenLiteralHooks(finalReply, streamingMessageContext)
      updateUI()

      return finalReply
    }

    try {
      if (options.origin === 'ui-user' && hasAlicizationBridge()) {
        const directive = parseKillSwitchDirective(sendingMessage)
        if (directive) {
          const bridge = getAlicizationBridge()
          if (directive === 'suspend')
            await bridge.suspendKillSwitch({ reason: 'user-command' })
          else
            await bridge.resumeKillSwitch({ reason: 'user-command' })
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'kill-switch',
            action: directive === 'suspend'
              ? 'kill-switch-command-suspended'
              : 'kill-switch-command-resumed',
            message: 'Applied the user kill-switch command without creating an assistant dialogue artifact.',
            details: {
              sessionId,
              directive,
            },
          })
          if (isForegroundSession()) {
            streamingMessage.value = createEmptyStreamingMessage()
          }
          return
        }
      }

      await hooks.emitBeforeMessageComposedHooks(sendingMessage, streamingMessageContext)

      const contentParts: CommonContentPart[] = [{ type: 'text', text: sendingMessage }]

      if (options.attachments) {
        for (const attachment of options.attachments) {
          if (attachment.type === 'image') {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimeType};base64,${attachment.data}`,
              },
            })
          }
        }
      }

      const finalContent = contentParts.length > 1 ? contentParts : sendingMessage
      if (!streamingMessageContext.input) {
        streamingMessageContext.input = {
          type: 'input:text',
          data: {
            text: sendingMessage,
          },
        }
      }
      const origin = options.origin ?? 'ui-user'

      if (shouldAbort())
        return

      // NOTICE: Keep the user message id deterministic per turn so renderer-side
      // replay/reconcile can upsert instead of inserting duplicates.
      userTurnMessageId = `${turnId}:user`
      sessionMessagesForSend.push({ role: 'user', content: finalContent, createdAt: sendingCreatedAt, id: userTurnMessageId })
      chatSession.persistSessionMessages(sessionId)

      const alicizationBridge = hasAlicizationBridge() ? getAlicizationBridge() : null
      const runtimeAuthoritativeBridge = Boolean(alicizationBridge?.streamChat)
      const resolvedRoute = resolveSendRoute(options)
      resolvedRouteForFailure = resolvedRoute
      const runtimeGatewayToolingPolicy = resolveMainGatewayToolingPolicy(
        resolvedRoute.providerId,
        resolvedRoute.model,
      )
      const turnToolEvidence: TurnToolEvidence = {
        verifiedToolResult: false,
        toolExecutionFailure: null,
        executorToolCallIds: new Set<string>(),
        deniedBySafety: false,
        reminderToolCallIds: new Set<string>(),
        reminderScheduled: false,
      }
      let bridgeStreamAttemptSeq = 0
      const headers = (resolvedRoute.providerConfig.headers || {}) as Record<string, string>
      await appendAlicizationAuditLog({
        level: 'notice',
        category: 'alicization.main-gateway',
        action: 'stream-tooling-policy-resolved',
        message: 'Resolved turn-level main-gateway tooling policy before stream dispatch.',
        details: {
          sessionId,
          turnId,
          origin,
          supportsTools: runtimeGatewayToolingPolicy.supportsTools,
          waitForTools: runtimeGatewayToolingPolicy.waitForTools,
          toolingRequired: runtimeGatewayToolingPolicy.toolingRequired,
        },
      })
      const streamWithRuntimeGateway = async (
        messages: Message[],
        streamOptions: StreamOptions,
      ) => {
        type StreamWatchdogTouchKind = 'provider-progress' | 'tool-execution' | 'provider-continuation' | 'liveness'
        type StreamWatchdogStage = 'provider' | 'tool-execution' | 'provider-continuation'
        type StreamWatchdogTimeoutPhase = 'first-event-timeout' | 'liveness-timeout' | 'idle-timeout'

        const withStreamWatchdog = async (
          execute: (hooks: { touch: (kind?: StreamWatchdogTouchKind) => void }) => Promise<void>,
          options: {
            firstEventTimeoutMs: number
            livenessTimeoutMs: number
            idleTimeoutMs: number
            onTimeout?: (payload: {
              phase: StreamWatchdogTimeoutPhase
              stage: StreamWatchdogStage
              timeoutMs: number
              sawAnyEvent: boolean
              sawProgress: boolean
            }) => void
          },
        ) => {
          let timer: ReturnType<typeof setTimeout> | undefined
          let sawAnyEvent = false
          let sawProgress = false
          let stage: StreamWatchdogStage = 'provider'
          let settled = false

          const clearTimer = () => {
            if (timer) {
              clearTimeout(timer)
              timer = undefined
            }
          }

          const scheduleTimeout = (
            timeoutMs: number,
            phase: StreamWatchdogTimeoutPhase,
            reject: (error: unknown) => void,
          ) => {
            clearTimer()
            timer = setTimeout(() => {
              if (settled)
                return
              options.onTimeout?.({
                phase,
                stage,
                timeoutMs,
                sawAnyEvent,
                sawProgress,
              })
              reject(new Error(`Alicization stream timed out after ${timeoutMs}ms (${phase}).`))
            }, timeoutMs)
          }

          try {
            await new Promise<void>((resolve, reject) => {
              const resolveOnce = () => {
                if (settled)
                  return
                settled = true
                clearTimer()
                resolve()
              }
              const rejectOnce = (error: unknown) => {
                if (settled)
                  return
                settled = true
                clearTimer()
                reject(error)
              }

              scheduleTimeout(options.firstEventTimeoutMs, 'first-event-timeout', rejectOnce)
              void execute({
                touch: (kind = 'provider-progress') => {
                  sawAnyEvent = true
                  if (kind === 'tool-execution') {
                    stage = 'tool-execution'
                    sawProgress = true
                    scheduleTimeout(options.idleTimeoutMs, 'idle-timeout', rejectOnce)
                    return
                  }
                  if (kind === 'provider-continuation') {
                    stage = 'provider-continuation'
                    sawProgress = true
                    scheduleTimeout(options.livenessTimeoutMs, 'liveness-timeout', rejectOnce)
                    return
                  }
                  if (kind === 'provider-progress') {
                    stage = 'provider'
                    sawProgress = true
                    scheduleTimeout(options.idleTimeoutMs, 'idle-timeout', rejectOnce)
                    return
                  }

                  scheduleTimeout(options.livenessTimeoutMs, 'liveness-timeout', rejectOnce)
                },
              })
                .then(resolveOnce)
                .catch(rejectOnce)
            })
          }
          finally {
            clearTimer()
          }
        }

        const bridge = alicizationBridge
        const bridgeStreamChat = bridge?.streamChat
        if (bridgeStreamChat) {
          const messagePayload = messages.flatMap((message) => {
            const entry = message as unknown as Record<string, unknown>
            const rawRole = typeof entry.role === 'string' ? entry.role : ''
            const normalizedRole: 'system' | 'user' | 'assistant' | 'tool' | null
              = rawRole === 'developer'
                ? 'system'
                : rawRole === 'system' || rawRole === 'user' || rawRole === 'assistant' || rawRole === 'tool'
                  ? rawRole
                  : null
            if (!normalizedRole)
              return []

            return [{
              // NOTICE: OpenAI-compatible transports reject or hang on unsupported roles
              // such as renderer-only `error`; keep the bridge payload provider-safe.
              role: normalizedRole,
              content: message.content ?? '',
              toolCallId: typeof entry.tool_call_id === 'string'
                ? entry.tool_call_id
                : undefined,
              toolName: typeof entry.toolName === 'string'
                ? entry.toolName
                : undefined,
            }]
          })

          const runBridgeStream = async (
            override: {
              supportsTools?: boolean
              waitForTools?: boolean
              providerToolCapabilityObservation?: AlicizationProviderToolCapabilityObservation
            } = {},
            timeoutOptions: {
              firstEventTimeoutMs: number
              livenessTimeoutMs: number
              idleTimeoutMs: number
            } = {
              firstEventTimeoutMs: runtimeGatewayWatchdogPolicy.firstEventTimeoutMs,
              livenessTimeoutMs: runtimeGatewayWatchdogPolicy.livenessTimeoutMs,
              idleTimeoutMs: runtimeGatewayWatchdogPolicy.idleTimeoutMs,
            },
          ) => {
            bridgeStreamAttemptSeq += 1
            const bridgeAttemptTurnId = `${turnId}:gw${bridgeStreamAttemptSeq}`
            const supportsTools = override.supportsTools ?? streamOptions.supportsTools
            const waitForTools = override.waitForTools ?? streamOptions.waitForTools
            const providerToolCapabilityObservation
              = override.providerToolCapabilityObservation
                ?? runtimeGatewayToolingPolicy.providerToolCapabilityObservation
            let sawProgress = false
            let sawMeta = false
            let lastEventType = ''
            const startedAt = Date.now()
            const streamAbortController = new AbortController()
            const parentAbortHandler = () => {
              streamAbortController.abort(
                streamOptions.abortSignal?.reason
                ?? new DOMException('Renderer stream aborted', 'AbortError'),
              )
            }
            if (streamOptions.abortSignal?.aborted)
              parentAbortHandler()
            else
              streamOptions.abortSignal?.addEventListener('abort', parentAbortHandler, { once: true })
            try {
              const executeBridgeStream = async (touch?: (kind?: StreamWatchdogTouchKind) => void) => {
                await bridgeStreamChat({
                  turnId: bridgeAttemptTurnId,
                  providerId: resolvedRoute.providerId,
                  model: resolvedRoute.model,
                  providerConfig: resolvedRoute.providerConfig,
                  messages: messagePayload,
                  supportsTools,
                  waitForTools,
                  ...(providerToolCapabilityObservation
                    ? { providerToolCapabilityObservation }
                    : {}),
                }, {
                  abortSignal: streamAbortController.signal,
                  onStreamEvent: async (event) => {
                    if (streamAbortController.signal.aborted)
                      return
                    lastEventType = typeof event?.type === 'string' ? event.type : ''
                    if (event.type === 'meta') {
                      sawMeta = true
                      touch?.('liveness')
                    }
                    if (event.type === 'finish') {
                      turnVisibleReplyExecution = (event as { visibleReplyExecution?: AlicizationConversationTurnInput['visibleReplyExecution'] }).visibleReplyExecution ?? turnVisibleReplyExecution
                      turnVisibleReplyCritic = normalizeVisibleReplyCriticForPersistence(
                        (event as { visibleReplyCritic?: AlicizationConversationTurnInput['visibleReplyCritic'] }).visibleReplyCritic,
                      ) ?? turnVisibleReplyCritic
                      turnVisibleReplyClosure = normalizeVisibleReplyClosureForPersistence(
                        (event as { visibleReplyClosure?: AlicizationConversationTurnInput['visibleReplyClosure'] }).visibleReplyClosure,
                      ) ?? turnVisibleReplyClosure
                    }
                    if (event.type === 'text-delta') {
                      sawProgress = true
                      touch?.('provider-progress')
                    }
                    if (event.type === 'provider-progress') {
                      sawProgress = true
                      touch?.('provider-progress')
                    }
                    if (event.type === 'tool-call') {
                      sawProgress = true
                      touch?.('tool-execution')
                    }
                    if (event.type === 'tool-progress') {
                      if (event.signal === 'liveness') {
                        touch?.('liveness')
                      }
                      else {
                        sawProgress = true
                        touch?.(
                          event.phase === 'started' || event.phase === 'running'
                            ? 'tool-execution'
                            : 'provider-continuation',
                        )
                      }
                    }
                    if (event.type === 'tool-result') {
                      sawProgress = true
                      touch?.('provider-continuation')
                    }
                    if (event.type === 'text-delta' && event.text.trim())
                      runtimeAuthoritativeModelTextObserved = true
                    await streamOptions.onStreamEvent?.(event)
                  },
                })
              }
              const streamLifecycleOwner = resolveStreamLifecycleOwner(bridge)
              const mainProcessOwnsStreamLifecycle = streamLifecycleOwner === 'main'
              void appendAlicizationAuditLog({
                level: 'info',
                category: 'alicization.main-gateway',
                action: 'stream-lifecycle-owner-resolved',
                message: 'Resolved the bridge stream lifecycle owner before starting the Provider request.',
                details: {
                  sessionId,
                  turnId,
                  bridgeAttemptTurnId,
                  lifecycleOwner: streamLifecycleOwner,
                  watchdogEnabled: !mainProcessOwnsStreamLifecycle,
                  declaredLifecycleOwner: bridge.streamLifecycleOwner ?? null,
                },
              })
              if (mainProcessOwnsStreamLifecycle) {
                // The Electron main process owns provider and executor deadlines.
                // A renderer-side idle timer must not abort a live Codex process
                // just because one IPC progress event was delayed or dropped.
                await executeBridgeStream()
              }
              else {
                await withStreamWatchdog(async ({ touch }) => {
                  await executeBridgeStream(touch)
                }, {
                  firstEventTimeoutMs: timeoutOptions.firstEventTimeoutMs,
                  livenessTimeoutMs: timeoutOptions.livenessTimeoutMs,
                  idleTimeoutMs: timeoutOptions.idleTimeoutMs,
                  onTimeout: ({ phase, stage, timeoutMs, sawAnyEvent: watchdogSawAnyEvent, sawProgress: watchdogSawProgress }) => {
                    if (!streamAbortController.signal.aborted) {
                      streamAbortController.abort(
                        new DOMException('Renderer stream watchdog timed out', 'AbortError'),
                      )
                    }
                    void appendAlicizationAuditLog({
                      level: 'warning',
                      category: 'alicization.main-gateway',
                      action: 'renderer-stream-watchdog-timeout',
                      message: 'Renderer bridge watchdog timed out while waiting for main-process stream progress.',
                      details: {
                        sessionId,
                        turnId,
                        bridgeAttemptTurnId,
                        supportsTools,
                        waitForTools,
                        firstEventTimeoutMs: timeoutOptions.firstEventTimeoutMs,
                        livenessTimeoutMs: timeoutOptions.livenessTimeoutMs,
                        idleTimeoutMs: timeoutOptions.idleTimeoutMs,
                        timeoutMs,
                        timeoutPhase: phase,
                        watchdogStage: stage,
                        sawProgress,
                        sawMeta,
                        watchdogSawAnyEvent,
                        watchdogSawProgress,
                        lastEventType: lastEventType || null,
                        elapsedMs: Date.now() - startedAt,
                      },
                    })
                    void bridge?.chatAbort?.({
                      turnId: bridgeAttemptTurnId,
                      reason: 'stream-timeout',
                    }).catch(() => {})
                  },
                })
              }
            }
            catch (error) {
              if (error instanceof Error) {
                const streamError = error as Error & { __alicizationSawProgress?: boolean }
                streamError.__alicizationSawProgress = sawProgress || streamError.__alicizationSawProgress === true
              }
              throw error
            }
            finally {
              streamOptions.abortSignal?.removeEventListener('abort', parentAbortHandler)
            }
            if (supportsTools === true) {
              persistProviderToolCapabilityObservation({
                providerId: resolvedRoute.providerId,
                model: resolvedRoute.model,
                supported: true,
                source: 'observed-provider-success',
              })
            }
            return sawProgress
          }

          let sawProgress = false
          try {
            sawProgress = await runBridgeStream()
          }
          catch (error) {
            const sawProgressFromError = readStreamErrorProgressFlag(error)
            if (sawProgressFromError && isStreamTimeoutError(error)) {
              await appendAlicizationAuditLog({
                level: 'warning',
                category: 'alicization.main-gateway',
                action: 'stream-timeout-after-progress',
                message: 'Bridge stream timed out after receiving content; finalized using received partial stream.',
                details: {
                  sessionId,
                  turnId,
                  reason: error instanceof Error ? error.message : String(error),
                },
              })
              throw error
            }
            if (shouldRetryStreamWithoutTools(error, {
              supportsTools: streamOptions.supportsTools,
              sawProgress: sawProgress || sawProgressFromError,
            })) {
              clearTransportFailureSurfaceForRetry()
              const providerToolCapabilityObservation: AlicizationProviderToolCapabilityObservation = {
                supported: false,
                source: 'observed-provider-error',
                checkedAt: Date.now(),
                lastError: normalizeAlicizationProviderToolCapabilityLastError('observed-provider-error'),
              }
              await appendAlicizationAuditLog({
                level: 'warning',
                category: 'alicization.main-gateway',
                action: 'stream-retry-without-tools',
                message: 'Main gateway stream failed without progress; retried once with tools disabled.',
                details: {
                  sessionId,
                  turnId,
                  reason: error instanceof Error ? error.message : String(error),
                },
              })
              await runBridgeStream({
                supportsTools: false,
                waitForTools: false,
                ...(providerToolCapabilityObservation
                  ? { providerToolCapabilityObservation }
                  : {}),
              }, {
                firstEventTimeoutMs: runtimeGatewayWatchdogPolicy.retryFirstEventTimeoutMs,
                livenessTimeoutMs: runtimeGatewayWatchdogPolicy.retryLivenessTimeoutMs,
                idleTimeoutMs: runtimeGatewayWatchdogPolicy.retryIdleTimeoutMs,
              })
              persistProviderToolCapabilityObservation({
                providerId: resolvedRoute.providerId,
                model: resolvedRoute.model,
                supported: false,
                source: 'observed-provider-error',
              })
              return
            }
            throw error
          }
          return
        }

        const streamAbortController = new AbortController()
        const parentAbortHandler = () => {
          streamAbortController.abort(
            streamOptions.abortSignal?.reason
            ?? new DOMException('Renderer stream aborted', 'AbortError'),
          )
        }
        if (streamOptions.abortSignal?.aborted)
          parentAbortHandler()
        else
          streamOptions.abortSignal?.addEventListener('abort', parentAbortHandler, { once: true })

        try {
          await withStreamWatchdog(async ({ touch }) => {
            await llmStore.stream(options.model, options.chatProvider, messages, {
              ...streamOptions,
              abortSignal: streamAbortController.signal,
              onStreamEvent: async (event) => {
                if (streamAbortController.signal.aborted)
                  return
                if (event.type === 'meta')
                  touch('liveness')
                if (event.type === 'finish') {
                  turnVisibleReplyExecution = (event as { visibleReplyExecution?: AlicizationConversationTurnInput['visibleReplyExecution'] }).visibleReplyExecution ?? turnVisibleReplyExecution
                  turnVisibleReplyCritic = normalizeVisibleReplyCriticForPersistence(
                    (event as { visibleReplyCritic?: AlicizationConversationTurnInput['visibleReplyCritic'] }).visibleReplyCritic,
                  ) ?? turnVisibleReplyCritic
                  turnVisibleReplyClosure = normalizeVisibleReplyClosureForPersistence(
                    (event as { visibleReplyClosure?: AlicizationConversationTurnInput['visibleReplyClosure'] }).visibleReplyClosure,
                  ) ?? turnVisibleReplyClosure
                }
                if (event.type === 'text-delta')
                  touch('provider-progress')
                if (event.type === 'provider-progress')
                  touch('provider-progress')
                if (event.type === 'tool-call')
                  touch('tool-execution')
                if (event.type === 'tool-progress') {
                  if (event.signal === 'liveness') {
                    touch('liveness')
                  }
                  else {
                    touch(
                      event.phase === 'started' || event.phase === 'running'
                        ? 'tool-execution'
                        : 'provider-continuation',
                    )
                  }
                }
                if (event.type === 'tool-result')
                  touch('provider-continuation')
                await streamOptions.onStreamEvent?.(event)
              },
            })
          }, {
            firstEventTimeoutMs: runtimeGatewayWatchdogPolicy.firstEventTimeoutMs,
            livenessTimeoutMs: runtimeGatewayWatchdogPolicy.livenessTimeoutMs,
            idleTimeoutMs: runtimeGatewayWatchdogPolicy.idleTimeoutMs,
          })
        }
        finally {
          streamOptions.abortSignal?.removeEventListener('abort', parentAbortHandler)
        }
      }

      const categorizer = createStreamingCategorizer(activeProvider.value)
      let streamPosition = 0
      let streamSpeechMode: 'undecided' | 'plain' | 'structured-json' = 'undecided'
      let streamSpeechPrelude = ''

      const appendSpeechLiteral = async (speechLiteral: string) => {
        if (!speechLiteral.trim())
          return

        stagedSpeechDraft += speechLiteral
      }

      const getPreviousAssistantEmotion = () => {
        const previousAssistant = [...sessionMessagesForSend]
          .reverse()
          .find(message => message.role === 'assistant' && 'structured' in message && message.structured)
        return previousAssistant && 'structured' in previousAssistant
          ? previousAssistant.structured?.emotion
          : undefined
      }

      const isCompleteRuntimeProviderArtifact = (fullText: string) => {
        const candidate = mergeStructuredRuntimeMeta(
          normalizeStructuredOutput({
            fullText,
            thought: '',
            previousEmotion: getPreviousAssistantEmotion(),
          }),
          getTurnStructuredRuntimeMeta(),
        )
        const validationIssues = validateStructuredContract(candidate)
        return candidate.parsePath === 'json'
          && candidate.format === 'mind-turn-v1'
          && hasProviderAuthoredVisibleReplyContract(candidate, validationIssues)
      }

      const buildStructuredOutputWithGuard = async (payload: {
        fullText: string
        reasoning: string
      }): Promise<StructuredWithContract> => {
        const candidate = mergeStructuredRuntimeMeta(
          normalizeStructuredOutput({
            fullText: payload.fullText,
            thought: payload.reasoning,
            previousEmotion: getPreviousAssistantEmotion(),
          }),
          getTurnStructuredRuntimeMeta(),
        )
        const validationIssues = validateStructuredContract(candidate)

        if (!hasProviderAuthoredVisibleReplyContract(candidate, validationIssues)) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'alicization.structured',
            action: 'contract-invalid',
            message: 'Provider output failed renderer parse and validation without local repair.',
            details: {
              parsePath: candidate.parsePath ?? 'fallback',
              violations: validationIssues.map(issue => issue.code),
            },
          })
          return mergeStructuredRuntimeMeta(createFailureStructuredArtifact({
            kind: 'provider-output-invalid',
            userText: sendingMessage,
          }), getTurnStructuredRuntimeMeta())
        }

        return {
          ...candidate,
          origin: 'provider',
          learningPolicy: turnTransportArtifactOrigin === 'provider' && turnTransportLearningPolicy
            ? turnTransportLearningPolicy
            : {
                allowLongTermCondensation: true,
                allowPersonaLearning: true,
                allowTraining: false,
              },
          contractFailed: false,
        }
      }

      const applyAssistantResult = async (payload: {
        fullText: string
        reasoning: string
      }) => {
        const structured = await buildStructuredOutputWithGuard(payload)
        if (structured.origin === 'failure-surface') {
          return setStagedAssistantResolution({
            categorization: {
              speech: structured.reply,
              reasoning: '',
            },
            structured,
            reply: structured.reply,
            origin: 'failure-surface',
          })
        }

        const finalReply = structured.reply.trim()
        const inspectedOutput = sanitizeAssistantOutputForDisplay(finalReply, {
          realtimeIntent: false,
          verifiedToolResult: turnToolEvidence.verifiedToolResult,
        })
        const displayReply = inspectedOutput.cleanText.trim()
        const outputRejected = !displayReply
          || inspectedOutput.fabricationDetected
          || inspectedOutput.leakDetected

        if (outputRejected) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'output-guard',
            action: 'provider-output-rejected',
            message: 'Renderer rejected unsafe provider output without writing substitute dialogue.',
            details: {
              empty: !displayReply,
              fabricationDetected: inspectedOutput.fabricationDetected,
              leakDetected: inspectedOutput.leakDetected,
              removedCount: inspectedOutput.removedCount,
            },
          })
          return stageFailureSurface(inspectedOutput.leakDetected ? 'internal-leak' : 'provider-output-invalid')
        }

        if (containsChatVisibleReplyFixedTemplateResidue(finalReply)) {
          await appendAlicizationAuditLog({
            level: 'critical',
            category: 'alicization.visible-reply',
            action: 'runtime-authoritative-internal-leak-blocked',
            message: 'Blocked structured internal text from the provider-visible reply.',
            details: {
              sessionId,
              turnId,
              candidateReplyChars: finalReply.length,
            },
          })
          return stageFailureSurface('internal-leak')
        }

        return setStagedAssistantResolution({
          categorization: {
            speech: displayReply,
            reasoning: payload.reasoning,
          },
          structured,
          reply: displayReply,
          origin: 'provider',
        })
      }

      const persistBuiltAssistantMessage = () => {
        if (runtimeAuthoritativeVisibleReplyBlocked)
          return

        if (!isStaleGeneration() && buildingMessage.slices.length > 0) {
          sessionMessagesForSend.push(toRaw(buildingMessage))
          chatSession.persistSessionMessages(sessionId)
        }
      }

      const emitAssistantTurnHooks = async (assistantOutputText: string) => {
        await hooks.emitStreamEndHooks(streamingMessageContext)
        await hooks.emitAssistantResponseEndHooks(assistantOutputText, streamingMessageContext)

        await hooks.emitAfterSendHooks(sendingMessage, streamingMessageContext)
        await hooks.emitAssistantMessageHooks({ ...buildingMessage }, assistantOutputText, streamingMessageContext)
        await hooks.emitChatTurnCompleteHooks({
          output: { ...buildingMessage },
          outputText: assistantOutputText,
          toolCalls: [...turnToolCalls],
        }, streamingMessageContext)
      }

      finalizeAssistantTurn = async () => {
        if (runtimeAuthoritativeVisibleReplyBlocked) {
          if (isForegroundSession()) {
            streamingMessage.value = createEmptyStreamingMessage()
          }
          if (!blockedStructuredTurnPersisted)
            throw createRuntimeAuthoritativeVisibleReplyBlockedError()
          return ''
        }

        const assistantOutputText = await commitAssistantResolution()
        if (!assistantOutputText.trim() && shouldBlockRendererLocalVisibleReply()) {
          await blockRuntimeAuthoritativeLocalVisibleReply({
            action: 'runtime-authoritative-empty-reply-blocked',
            message: 'Renderer blocked empty local finalization because Alicization turns require a model-authored visible reply.',
            details: {
              runtimeAuthoritativeModelTextObserved,
              hasStagedResolution: Boolean(stagedAssistantResolution),
              hasFinalAssistantDisplayText: Boolean(finalAssistantDisplayText.trim()),
              hasStagedSpeechDraft: Boolean(stagedSpeechDraft.trim()),
              hasBuildingContent: Boolean(stringifyAssistantContent(buildingMessage.content).trim()),
            },
          })
          assistantOutputCommitted = true
          throw createRuntimeAuthoritativeVisibleReplyBlockedError()
        }
        if (buildingMessage.structured) {
          const structuredWithRuntimeMeta = mergeStructuredRuntimeMeta(
            buildingMessage.structured as StructuredWithContract,
            getTurnStructuredRuntimeMeta(),
          )
          buildingMessage.structured = turnMemoryFailures.length > 0
            ? {
                ...structuredWithRuntimeMeta,
                memoryFailures: turnMemoryFailures,
              }
            : structuredWithRuntimeMeta
        }
        persistBuiltAssistantMessage()
        assistantOutputCommitted = true
        if (hasAlicizationBridge()) {
          await getAlicizationBridge().appendConversationTurn({
            turnId,
            sessionId,
            userText: sendingMessage,
            assistantText: assistantOutputText,
            structured: normalizeStructuredTurnForPersistence(
              asStructuredWithContract(buildingMessage.structured)
                ? { ...asStructuredWithContract(buildingMessage.structured)! }
                : undefined,
            ),
            visibleReplyExecution: turnVisibleReplyExecution,
            visibleReplyCritic: normalizeVisibleReplyCriticForPersistence(turnVisibleReplyCritic),
            visibleReplyClosure: normalizeVisibleReplyClosureForPersistence(turnVisibleReplyClosure),
            governance: turnMindGovernance,
            createdAt: Date.now(),
          }).catch(() => {})
        }
        if (!isStaleGeneration() && turnMemoryFailures.length > 0) {
          const visibleMemoryFailures = turnMemoryFailures.map((failure, index): StreamingAssistantMessage => ({
            role: 'assistant',
            content: failure.reply,
            slices: [{
              type: 'text',
              text: failure.reply,
            }],
            tool_results: [],
            categorization: {
              speech: failure.reply,
              reasoning: '',
            },
            structured: createFailureStructuredArtifact({
              kind: failure.kind,
              failureSurface: failure,
            }),
            createdAt: failure.occurredAt,
            id: `${turnId}:memory-failure:${failure.stage}:${index}`,
          }))
          sessionMessagesForSend.push(...visibleMemoryFailures)
          chatSession.persistSessionMessages(sessionId)
          turnMemoryFailures = []
        }
        await emitAssistantTurnHooks(assistantOutputText)

        if (isForegroundSession()) {
          streamingMessage.value = createEmptyStreamingMessage()
        }

        return assistantOutputText
      }

      if (hasAlicizationBridge() && !runtimeAuthoritativeBridge) {
        stageFailureSurface('local-runtime-unavailable')
        await finalizeAssistantTurn()
        return
      }

      const applyAssistantTextFromModelOutput = async (fullText: string) => {
        if (isStaleGeneration())
          return

        const finalCategorization = categorizeResponse(fullText, activeProvider.value)

        await applyAssistantResult({
          fullText,
          reasoning: finalCategorization.reasoning,
        })
      }

      const parser = useLlmmarkerParser({
        onLiteral: async (literal) => {
          if (shouldAbort())
            return

          categorizer.consume(literal)

          const speechOnly = categorizer.filterToSpeech(literal, streamPosition)
          streamPosition += literal.length

          if (!speechOnly.trim())
            return

          if (streamSpeechMode === 'undecided') {
            streamSpeechPrelude += speechOnly
            const trimmedPrelude = streamSpeechPrelude.trimStart()
            if (!trimmedPrelude)
              return

            if (looksLikeAlicizationStructuredPayloadText(trimmedPrelude)) {
              streamSpeechMode = 'structured-json'
              streamSpeechPrelude = ''
              return
            }

            if (shouldBufferAlicizationStructuredSpeechPrelude(trimmedPrelude))
              return

            streamSpeechMode = 'plain'
            const prelude = streamSpeechPrelude
            streamSpeechPrelude = ''
            await appendSpeechLiteral(prelude)
            return
          }

          if (streamSpeechMode === 'structured-json')
            return

          await appendSpeechLiteral(speechOnly)
        },
        onSpecial: async (special) => {
          if (shouldAbort())
            return

          await hooks.emitTokenSpecialHooks(special, streamingMessageContext)
        },
        onEnd: async (fullText) => {
          await applyAssistantTextFromModelOutput(fullText)
        },
        minLiteralEmitLength: 24,
      })

      const toolCallQueue = createQueue<ChatToolProjectionSlice>({
        handlers: [
          async (ctx) => {
            if (shouldAbort())
              return
            applyChatToolProjectionSlice(buildingMessage, ctx.data, updateUI)
          },
        ],
      })
      let toolProjectionQueueFailure: AlicizationToolEventDeliveryError | undefined
      toolCallQueue.on('error', (payload, error) => {
        if (toolProjectionQueueFailure)
          return

        const event = payload.type === 'tool-call'
          ? {
              type: 'tool-call' as const,
              toolCallId: typeof payload.toolCall?.toolCallId === 'string'
                ? payload.toolCall.toolCallId
                : '',
              toolName: typeof payload.toolCall?.toolName === 'string'
                ? payload.toolCall.toolName
                : undefined,
            }
          : payload.type === 'tool-call-result'
            ? {
                type: 'tool-result' as const,
                toolCallId: payload.id,
                toolName: undefined,
              }
            : {
                type: 'tool-progress' as const,
                toolCallId: payload.toolCallId ?? '',
                toolName: payload.toolName,
              }
        toolProjectionQueueFailure = new AlicizationToolEventDeliveryError(error, event)
      })

      let newMessages = sessionMessagesForSend
        .filter(msg =>
          msg.role !== 'assistant'
          || !isDirectInfrastructureRepairFallback(asStructuredWithContract(msg.structured)),
        )
        .map((msg) => {
          const { context: _context, id: _id, createdAt: _createdAt, ...withoutContext } = msg
          const rawMessage = toRaw(withoutContext)

          if (rawMessage.role === 'assistant') {
            const {
              slices: _slices,
              tool_results: _toolResults,
              categorization: _categorization,
              structured: _structured,
              ...rest
            } = rawMessage as ChatAssistantMessage
            return toRaw(rest)
          }

          return rawMessage
        })
      const promptAssembly = compactMessagesForPromptAssembly(newMessages as Message[])
      newMessages = promptAssembly.messages as any
      if (promptAssembly.report.afterCount < promptAssembly.report.beforeCount) {
        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'alicization.prompt',
          action: 'assembly-compacted',
          message: 'Compacted dialogue history before Alicization prompt composition to preserve current mind context.',
          details: {
            beforeCount: promptAssembly.report.beforeCount,
            afterCount: promptAssembly.report.afterCount,
            beforeTokens: promptAssembly.report.beforeTokens,
            afterTokens: promptAssembly.report.afterTokens,
            droppedMessageCount: promptAssembly.report.droppedMessageCount,
            retainedUserTurns: promptAssembly.report.retainedUserTurns,
          },
        })
      }

      streamingMessageContext.composedMessage = newMessages as Message[]

      await hooks.emitAfterMessageComposedHooks(sendingMessage, streamingMessageContext)
      await hooks.emitBeforeSendHooks(sendingMessage, streamingMessageContext)

      if (shouldAbort())
        return

      const trackToolDeniedReason = (rawReason: string) => {
        turnToolEvidence.deniedBySafety = true
        turnToolEvidence.deniedReason = rawReason
        turnToolEvidence.denialSource = classifyDeniedSource(rawReason)
      }

      const runStreamSideEffectSafely = async (
        sideEffect: string,
        callback: () => Promise<void>,
      ) => {
        try {
          await callback()
        }
        catch (error) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'alicization.chat',
            action: 'stream-side-effect-failed',
            message: 'A renderer-side stream projection failed without interrupting the Provider/tool lifecycle.',
            details: {
              sideEffect,
              error: error instanceof Error ? error.message : String(error),
            },
          })
        }
      }

      const recordObservedToolCall = async (event: StreamToolCallPayload) => {
        const toolMessage = toToolMessageFromStreamEvent(event)
        turnToolCalls.push(toolMessage)
        await runStreamSideEffectSafely(
          'tool-call-hook',
          async () => await hooks.emitToolCallHooks(event, streamingMessageContext),
        )
      }

      let primaryStreamError: unknown
      try {
        await streamWithRuntimeGateway(newMessages as Message[], {
          headers,
          tools: options.tools,
          supportsTools: runtimeGatewayToolingPolicy.supportsTools,
          abortSignal,
          // NOTICE: xsai stream may emit `finish` before tool steps continue, so keep waiting until
          // the final non-tool finish to avoid ending the chat turn with no assistant reply.
          waitForTools: runtimeGatewayToolingPolicy.waitForTools,
          onStreamEvent: async (event: StreamEvent) => {
            try {
              switch (event.type) {
                case 'meta':
                  ingestTurnStructuredRuntimeMeta(event)
                  if (event.embodiment || event.embodimentScript || event.speechTimeline || event.digitalLife || event.digitalLifeSpine || event.runtimeDigest) {
                    await runStreamSideEffectSafely(
                      'embodiment-meta-hook',
                      async () => await hooks.emitEmbodimentMetaHooks({
                        governance: event.governance ?? turnMindGovernance,
                        embodiment: normalizeDialogueStructuredArtifact(event.embodiment ?? null),
                        embodimentScript: normalizeDialogueStructuredArtifact(event.embodimentScript ?? null),
                        speechTimeline: normalizeDialogueStructuredArtifact(event.speechTimeline ?? null),
                        digitalLife: normalizeDialogueStructuredArtifact(resolveChatRuntimeDigitalLifeAuthority({
                          digitalLife: event.digitalLife,
                          embodimentScript: event.embodimentScript,
                        })),
                        digitalLifeSpine: normalizeDialogueStructuredArtifact(event.digitalLifeSpine ?? null),
                        runtimeDigest: normalizeDialogueStructuredArtifact(event.runtimeDigest ?? null),
                      }, streamingMessageContext),
                    )
                  }
                  break
                case 'tool-call': {
                  const projection = resolveChatToolCallProjection({
                    ...event,
                    eventType: 'tool-call',
                  })
                  if (!projection)
                    break
                  const observedToolName = projection.toolName
                  const toolCallId = projection.toolCallId
                  const projectedEvent = {
                    ...event,
                    toolCallId,
                    toolName: observedToolName,
                  }
                  await recordObservedToolCall(projectedEvent)
                  if (isChatExecutionProjectionToolName(observedToolName))
                    turnToolEvidence.executorToolCallIds.add(toolCallId)
                  if (observedToolName === 'set_reminder')
                    turnToolEvidence.reminderToolCallIds.add(toolCallId)
                  toolCallQueue.enqueue(isChatExecutionProjectionToolName(observedToolName)
                    ? buildChatExecutionStatusFromProjection(projection)
                    : {
                        type: 'tool-call',
                        toolCall: projectedEvent,
                      })

                  break
                }
                case 'tool-result': {
                  const projection = resolveChatToolCallProjection({
                    ...event,
                    eventType: 'tool-result',
                  })
                  if (!projection)
                    break
                  const toolCallId = projection.toolCallId
                  const toolName = projection.toolName
                  if (
                    isAlicizationToolExecutionFailureResult(event.result)
                    && !turnToolEvidence.toolExecutionFailure
                  ) {
                    const toolExecution = extractAlicizationToolExecutionFailure(event.result, toolName)
                    if (toolExecution) {
                      turnToolEvidence.toolExecutionFailure = toolExecution
                      stageTransportFailureSurface(resolveAlicizationChatFailureSurface({
                        kind: 'tool-execution',
                        userText: sendingMessage,
                        toolExecution,
                      }))
                    }
                  }
                  if (hasVerifiedToolResult(event.result))
                    turnToolEvidence.verifiedToolResult = true
                  if (turnToolEvidence.executorToolCallIds.has(toolCallId)) {
                    const executorResult = extractChatExecutorToolReplyEvidence(event.result, toolName)
                    if (executorResult) {
                      toolCallQueue.enqueue(buildChatExecutionStatusFromProjection(projection, {
                        result: executorResult,
                      }))
                    }
                  }
                  if (turnToolEvidence.reminderToolCallIds.has(toolCallId)) {
                    const reminderPayload = extractScheduledReminderPayload(event.result)
                    if (reminderPayload.scheduled) {
                      turnToolEvidence.reminderScheduled = true
                      if (reminderPayload.message)
                        turnToolEvidence.reminderMessage = reminderPayload.message
                    }
                  }
                  toolCallQueue.enqueue({
                    type: 'tool-call-result',
                    id: toolCallId,
                    result: event.result,
                  })
                  {
                    const deniedReason = extractDeniedToolReason(event.result)
                    if (deniedReason) {
                      trackToolDeniedReason(deniedReason)
                    }
                  }

                  break
                }
                case 'tool-progress':
                  {
                    const projection = resolveChatToolCallProjection({
                      ...event,
                      eventType: 'tool-progress',
                    })
                    if (!projection)
                      break
                    if (isChatExecutionProjectionToolName(projection.toolName))
                      toolCallQueue.enqueue(buildChatExecutionStatusFromProjection(projection))
                  }
                  break
                case 'provider-progress':
                  break
                case 'text-delta':
                  ingestTransportVisibleArtifactMetadata(event)
                  if (runtimeAuthoritativeBridge) {
                    turnTransportVisibleText += event.text
                    if (event.origin === 'provider' && event.text.trim())
                      runtimeAuthoritativeModelTextObserved = true
                    break
                  }
                  await parser.consume(event.text)
                  break
                case 'finish':
                  ingestTransportVisibleArtifactMetadata(event)
                  turnMemoryFailures = normalizeTransportMemoryFailures(event.memoryFailures)
                  if (event.origin === 'provider' && typeof event.fullText === 'string' && event.fullText.trim()) {
                    turnTransportProviderFullText = event.fullText
                    runtimeAuthoritativeModelTextObserved = true
                  }
                  break
                case 'error':
                  ingestTransportVisibleArtifactMetadata(event)
                  break
              }
            }
            catch (error) {
              if (
                event.type === 'tool-call'
                || event.type === 'tool-result'
                || event.type === 'tool-progress'
              ) {
                if (error instanceof AlicizationToolEventDeliveryError) {
                  void appendAlicizationAuditLog({
                    level: 'warning',
                    category: 'alicization.chat',
                    action: 'tool-projection-delivery-failed',
                    message: 'A tool projection fact could not be rendered, but the Provider/tool lifecycle remains authoritative.',
                    details: {
                      error: error.message,
                      errorCode: error.code,
                      eventType: error.eventType,
                      toolCallId: error.toolCallId,
                      toolName: error.toolName,
                    },
                  }).catch(() => {})
                  return
                }
              }
              throw error
            }
          },
        })
      }
      catch (error) {
        primaryStreamError = error
      }

      let toolProjectionDeliveryError: AlicizationToolEventDeliveryError | undefined
      // Tool/progress slices are projected asynchronously so they cannot block
      // Provider streaming. Drain them before settlement even when the primary
      // stream failed, while preserving the primary Provider/main error.
      try {
        await toolCallQueue.waitForIdle()
      }
      catch (error) {
        toolProjectionDeliveryError = toolProjectionQueueFailure
          ?? (error instanceof AlicizationToolEventDeliveryError
            ? error
            : new AlicizationToolEventDeliveryError(error, {
                type: 'tool-progress',
                toolCallId: '',
              }))
      }
      toolProjectionDeliveryError ??= toolProjectionQueueFailure
      if (toolProjectionDeliveryError) {
        void appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.chat',
          action: 'tool-projection-drain-failed',
          message: 'Provider streaming completed, but one or more renderer tool projections failed.',
          details: {
            error: toolProjectionDeliveryError.message,
            errorCode: toolProjectionDeliveryError.code,
            eventType: toolProjectionDeliveryError.eventType,
            toolCallId: toolProjectionDeliveryError.toolCallId,
          },
        }).catch(() => {})
      }

      if (primaryStreamError !== undefined)
        throw primaryStreamError

      if (runtimeAuthoritativeBridge) {
        const approvedVisibleText = turnTransportVisibleText.trim()
        const visibleTextLooksStructured = looksLikeAlicizationStructuredPayloadText(approvedVisibleText)
        if (
          !turnTransportFailureSurface
          && turnTransportProviderFullText
          && isCompleteRuntimeProviderArtifact(turnTransportProviderFullText)
        ) {
          await applyAssistantTextFromModelOutput(turnTransportProviderFullText)
        }
        else if (!turnTransportFailureSurface && approvedVisibleText && !visibleTextLooksStructured) {
          await applyAssistantTextFromModelOutput(turnTransportVisibleText)
        }
        else if (!turnTransportFailureSurface && turnTransportProviderFullText) {
          await applyAssistantTextFromModelOutput(turnTransportProviderFullText)
        }
        else if (!turnTransportFailureSurface && approvedVisibleText) {
          await applyAssistantTextFromModelOutput(turnTransportVisibleText)
        }
      }
      else {
        await parser.end()
      }

      await finalizeAssistantTurn()
    }
    catch (error) {
      if (abortSignal.aborted || shouldAbort()) {
        const abortReason = resolveAbortReason(error, isStaleGeneration())
        const beforeLength = sessionMessagesForSend.length
        if (userTurnMessageId) {
          const nextMessages = sessionMessagesForSend.filter(item => item.id !== userTurnMessageId)
          if (nextMessages.length !== sessionMessagesForSend.length) {
            sessionMessagesForSend.splice(0, sessionMessagesForSend.length, ...nextMessages)
            chatSession.persistSessionMessages(sessionId)
          }
        }

        if (isForegroundSession()) {
          streamingMessage.value = createEmptyStreamingMessage()
        }

        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'kill-switch',
          action: 'turn-aborted',
          message: 'Active chat turn aborted.',
          details: {
            sessionId,
            turnId,
            reason: abortReason,
          },
        })

        const droppedCount = Math.max(0, beforeLength - sessionMessagesForSend.length)
        if (droppedCount > 0) {
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'kill-switch',
            action: 'turn-abort-dropped',
            message: 'Dropped in-flight turn artifacts after abort.',
            details: {
              sessionId,
              turnId,
              droppedCount,
            },
          })
        }
        return
      }

      if (!assistantOutputCommitted) {
        const transportedFailure = turnTransportFailureSurface as AlicizationChatFailureSurface | null
        const stagedResolution = stagedAssistantResolution as StagedAssistantResolution | null
        if (!transportedFailure && stagedResolution?.origin !== 'failure-surface') {
          const failure = resolveStreamFailureFallback(error, sendingMessage, {
            providerId: resolvedRouteForFailure?.providerId,
            model: resolvedRouteForFailure?.model,
          })
          if (failure.failureSurface)
            stageTransportFailureSurface(failure.failureSurface)
          else
            stageFailureSurface(failure.kind, failure.reply)
        }
        if (!finalizeAssistantTurn)
          throw error
        await finalizeAssistantTurn()
        const finalizedTransportFailure = turnTransportFailureSurface as AlicizationChatFailureSurface | null
        const finalizedResolution = stagedAssistantResolution as StagedAssistantResolution | null
        const failureKind = finalizedTransportFailure?.kind
          ?? finalizedResolution?.structured.failureSurface?.kind
          ?? 'unknown'
        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.chat',
          action: 'turn-failed-transparent-surface',
          message: 'Primary stream failed and a transparent failure surface was emitted.',
          details: {
            sessionId,
            turnId,
            reason: error instanceof Error ? error.message : String(error),
            failureKind,
          },
        })
        return
      }

      if (isForegroundSession()) {
        streamingMessage.value = createEmptyStreamingMessage()
      }
      console.error('Error sending message:', error)
      throw error
    }
    finally {
      completeAlicizationTurnAbort(turnId)
      sending.value = false
    }
  }

  async function ingest(
    sendingMessage: string,
    options: SendOptions,
    targetSessionId?: string,
  ) {
    ensureVisualPresencePulseSubscription()

    if (hasAlicizationBridge()) {
      const origin = options.origin ?? 'ui-user'
      const isTopLevelInput = origin === 'ui-user'
      const directive = isTopLevelInput ? parseKillSwitchDirective(sendingMessage) : null

      if (!directive) {
        const killSwitch = await getAlicizationBridge().getKillSwitchState().catch(() => null)
        if (killSwitch?.state === 'SUSPENDED' && isTopLevelInput) {
          throw new Error(stageChatText('errors.suspended'))
        }
      }
    }

    if (!targetSessionId && !activeSessionId.value)
      await chatSession.initialize()

    const sessionId = targetSessionId || activeSessionId.value
    if (!sessionId)
      throw new Error(stageChatText('errors.session-not-ready'))

    const generation = chatSession.getSessionGeneration(sessionId)

    return new Promise<void>((resolve, reject) => {
      sendQueue.enqueue({
        sendingMessage,
        options,
        generation,
        sessionId,
        deferred: { resolve, reject },
      })
    })
  }

  async function ingestOnFork(
    sendingMessage: string,
    options: SendOptions,
    forkOptions?: ForkOptions,
  ) {
    const baseSessionId = forkOptions?.fromSessionId ?? activeSessionId.value
    if (!forkOptions)
      return ingest(sendingMessage, options, baseSessionId)

    const forkSessionId = await chatSession.forkSession({
      fromSessionId: baseSessionId,
      atIndex: forkOptions.atIndex,
      reason: forkOptions.reason,
      hidden: forkOptions.hidden,
    })
    return ingest(sendingMessage, options, forkSessionId || baseSessionId)
  }

  function cancelPendingSends(sessionId?: string, reason = stageChatText('errors.session-reset-before-send')) {
    const error = new Error(reason)
    for (const queued of pendingQueuedSends.value) {
      if (sessionId && queued.sessionId !== sessionId)
        continue

      queued.cancelled = true
      queued.deferred.reject(error)
    }

    pendingQueuedSends.value = sessionId
      ? pendingQueuedSends.value.filter(item => item.sessionId !== sessionId)
      : []
  }

  async function abortActiveTurns(reason: AlicizationAbortReason = 'kill-switch') {
    const result = abortAlicizationTurns({ reason })
    cancelPendingSends(undefined, stageChatText('errors.turn-aborted', { reason }))
    streamingMessage.value = createEmptyStreamingMessage()

    if (result.aborted > 0) {
      await appendAlicizationAuditLog({
        level: 'notice',
        category: 'kill-switch',
        action: 'kill-switch-abort-broadcast',
        message: 'Broadcasted turn abort to active pipelines.',
        details: {
          reason,
          aborted: result.aborted,
        },
      })
    }

    return result
  }

  function registerPipelineAborter(aborter: ExternalPipelineAborter) {
    externalPipelineAborters.add(aborter)
    return () => {
      externalPipelineAborters.delete(aborter)
    }
  }

  async function abortAllPipelines(reason: AlicizationAbortReason = 'kill-switch') {
    const turnAbortResult = await abortActiveTurns(reason)
    const pipelines = [...externalPipelineAborters]
    let pipelineErrors = 0

    await Promise.all(pipelines.map(async (aborter) => {
      try {
        await aborter(reason)
      }
      catch (error) {
        pipelineErrors += 1
        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'kill-switch',
          action: 'pipeline-abort-failed',
          message: 'Failed to abort external pipeline during kill switch.',
          details: {
            reason,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }))

    return {
      ...turnAbortResult,
      pipelineAborters: pipelines.length,
      pipelineErrors,
    }
  }

  return {
    sending,

    discoverToolsCompatibility: llmStore.discoverToolsCompatibility,

    ingest,
    ingestOnFork,
    cancelPendingSends,
    abortActiveTurns,
    abortAllPipelines,
    registerPipelineAborter,

    clearHooks: hooks.clearHooks,

    emitBeforeMessageComposedHooks: hooks.emitBeforeMessageComposedHooks,
    emitAfterMessageComposedHooks: hooks.emitAfterMessageComposedHooks,
    emitBeforeSendHooks: hooks.emitBeforeSendHooks,
    emitAfterSendHooks: hooks.emitAfterSendHooks,
    emitTokenLiteralHooks: hooks.emitTokenLiteralHooks,
    emitTokenSpecialHooks: hooks.emitTokenSpecialHooks,
    emitStreamEndHooks: hooks.emitStreamEndHooks,
    emitEmbodimentMetaHooks: hooks.emitEmbodimentMetaHooks,
    emitAssistantResponseEndHooks: hooks.emitAssistantResponseEndHooks,
    emitToolCallHooks: hooks.emitToolCallHooks,
    emitAssistantMessageHooks: hooks.emitAssistantMessageHooks,
    emitChatTurnCompleteHooks: hooks.emitChatTurnCompleteHooks,

    onBeforeMessageComposed: hooks.onBeforeMessageComposed,
    onAfterMessageComposed: hooks.onAfterMessageComposed,
    onBeforeSend: hooks.onBeforeSend,
    onAfterSend: hooks.onAfterSend,
    onTokenLiteral: hooks.onTokenLiteral,
    onTokenSpecial: hooks.onTokenSpecial,
    onStreamEnd: hooks.onStreamEnd,
    onEmbodimentMeta: hooks.onEmbodimentMeta,
    onAssistantResponseEnd: hooks.onAssistantResponseEnd,
    onToolCall: hooks.onToolCall,
    onAssistantMessage: hooks.onAssistantMessage,
    onChatTurnComplete: hooks.onChatTurnComplete,
  }
})
