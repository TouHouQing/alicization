import type { WebSocketEventInputs } from '@proj-alicization/server-sdk'
import type {
  AlicizationChatFailureKind,
  AlicizationChatFailureSurface,
  AlicizationChatMemoryFailureSurface,
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from '@proj-alicization/stage-shared'
import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { CommonContentPart, Message, ToolMessage } from '@xsai/shared-chat'

import type { StructuredOutputResult, StructuredValidationIssue } from '../composables/alicization-structured-output'
import type { AlicizationAbortReason } from '../composables/alicization-turn-abort'
import type { ChatAssistantMessage, ChatAssistantStructuredPayload, ChatSlices, ChatSlicesExecutionStatus, ChatStreamEventContext, StreamingAssistantMessage } from '../types/chat'
import type {
  AlicizationConversationTurnInput,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmbodimentScriptV1,
  AlicizationEmotion,
  AlicizationMindTurnGovernance,
  AlicizationPersonalityState,
  AlicizationRuntimeDigest,
} from './alicization-bridge'
import type { StreamEvent, StreamOptions } from './llm'

import {
  alicizationProviderResponseFormat,
  deriveAlicizationRendererBridgeWatchdogTimeoutPolicy,
  detectAlicizationExecutionCapabilityInquiry,
  detectAlicizationExecutionRoutingIntent,
  isAlicizationProviderSchemaUnsupportedError,
  looksLikeAlicizationStructuredPayloadText,
  resolveAlicizationChatFailureSurface,
  sanitizeAlicizationProviderFacingText,
  shouldBufferAlicizationStructuredSpeechPrelude,
} from '@proj-alicization/stage-shared'
import { createQueue } from '@proj-alicization/stream-kit'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { ref, toRaw } from 'vue'

import { applyPromptBudget, compactMessagesForPromptAssembly, sanitizeAssistantOutputForDisplay, sanitizeForRemoteModel } from '../composables/alicization-guardrails'
import { composeAlicizationPromptMessages } from '../composables/alicization-prompt-composer'
import {
  normalizeStructuredOutput,
  normalizeStructuredProjectStatePayload,
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
  removeAlicizationExecutionStatusSlices,
  shouldBlockAlicizationRendererLocalVisibleReply,
} from './alicization-visible-reply-guard'
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
  return !sanitizeAlicizationProviderFacingText(value, maxChars, '')
}

function isRecordPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const memoryFailureStages = new Set<AlicizationChatMemoryFailureSurface['stage']>([
  'long-term-memory-recall',
  'working-memory-history',
  'working-memory-long-term-queue',
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
const executionEvidenceToolNames = new Set([
  'executor_run_cli',
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_local_visual',
  'executor_run_openclaw',
  'browser_open_url',
  'browser_search_web',
  'browser_read_page',
  'browser_click_element',
  'browser_type_text',
  'browser_navigate',
  'browser_scroll',
  'browser_wait',
  'desktop_inspect_scene',
  'desktop_list_interactables',
  'desktop_click_element',
  'desktop_type_text',
  'desktop_press_keys',
  'desktop_open_application',
  'desktop_wait',
])
const fileSystemOperationVerbPattern = /读取|读|查看|打开|访问|写入|写|修改|删除|列出|搜索|获取|read|open|access|write|update|delete|list|find|inspect/i
const fileSystemOperationTargetPattern = /文件夹|目录|路径|桌面|系统状态|磁盘|file|folder|directory|path|desktop|system state|\/|\\|\.(?:txt|md|json|yaml|yml|csv|log)\b|文件(?!夹)/i
const reminderVerbPattern = /提醒|闹钟|alarm|remind|notify|叫我|喊我|告诉我|通知我|记得|别忘/iu
const reminderDurationPattern = /\b(?:in|after)\s*\d+\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\b|(?:\d+|[零一二两三四五六七八九十百半几]+)\s*(?:秒钟?|分钟?|小时|时|天)(?:\s*之?后)?/iu
const reminderChineseNaturalPattern = /(?:\d+|[零一二两三四五六七八九十百半几]+)\s*(?:秒钟?|分钟?|小时|时|天)(?:\s*之?后)?[\s，,。！!]*(?:提醒我|叫我|喊我|告诉我|通知我|记得|别忘)/u
const reminderEnglishNaturalPattern = /(?:^|\s)(?:in|after)\s*\d+\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\s*(?:[,.:;!?-]\s*)?(?:remind|notify|tell)\s+me\b/iu
function createEmptyStreamingMessage(): StreamingAssistantMessage {
  return {
    role: 'assistant',
    content: '',
    slices: [],
    tool_results: [],
  }
}

interface TurnToolEvidence {
  toolCallCount: number
  toolResultCount: number
  executorToolCallCount: number
  verifiedToolResult: boolean
  executorToolCallIds: Set<string>
  latestExecutorResult: ExecutorToolReplyEvidence | null
  sawTextAfterExecutorResult: boolean
  deniedBySafety: boolean
  deniedReason?: string
  denialSource?: 'host' | 'system' | 'generic'
  reminderToolCallIds: Set<string>
  reminderScheduled: boolean
  reminderMessage?: string
}

interface ExecutorToolReplyEvidence {
  channel: string
  errorCode: string
  errorMessage: string
  output: string
  stage: string
  status: string
  summary: string
  toolName: string
}

function isExecutionEvidenceToolName(toolName: string) {
  return executionEvidenceToolNames.has(toolName)
}

function isExecutionToolNameSatisfiedByRoutingIntent(input: {
  requiredToolNames: Set<string>
  toolName: string
}) {
  if (!input.toolName)
    return false
  if (input.requiredToolNames.size <= 0)
    return isExecutionEvidenceToolName(input.toolName)
  return input.requiredToolNames.has(input.toolName)
}

function normalizeExecutorChannelLabel(toolName: string) {
  if (toolName === 'executor_run_cli')
    return 'CLI'
  if (toolName === 'executor_run_codex')
    return 'Codex'
  if (toolName === 'executor_run_claude_code')
    return 'Claude Code'
  if (toolName === 'executor_run_local_visual')
    return '本地视觉执行'
  if (toolName === 'executor_run_openclaw')
    return 'OpenClaw'
  if (toolName.startsWith('browser_'))
    return '浏览器'
  if (toolName.startsWith('desktop_'))
    return '桌面'
  return '执行通道'
}

function buildExecutorExecutionStatus(input: {
  toolName: string
  result?: ExecutorToolReplyEvidence | null
}): ChatSlicesExecutionStatus {
  const channel = normalizeExecutorChannelLabel(input.toolName)
  const status = input.result?.status ?? 'running'
  const detail = sanitizeExecutorReplyEvidenceText(
    input.result?.summary || input.result?.errorMessage || input.result?.output || '',
    96,
  )

  if (status === 'failed' || status === 'blocked' || status === 'cancelled') {
    return {
      type: 'execution-status',
      phase: 'tool-failed',
      label: detail ? `${channel} 没有跑通: ${detail}` : `${channel} 没有跑通`,
      source: 'builtin',
    }
  }

  if (status === 'completed') {
    return {
      type: 'execution-status',
      phase: 'completed',
      label: detail ? `${channel} 已经拿到结果: ${detail}` : `${channel} 已经拿到结果`,
      source: 'builtin',
    }
  }

  return {
    type: 'execution-status',
    phase: 'tool-running',
    label: `${channel} 正在处理这件事`,
    source: 'builtin',
  }
}

function upsertExecutionStatusSlice(slices: ChatSlices[], next: ChatSlicesExecutionStatus) {
  const existingIndex = slices.findIndex(slice => slice.type === 'execution-status')
  if (existingIndex >= 0) {
    slices.splice(existingIndex, 1, next)
    return
  }
  slices.push(next)
}

const removeExecutionStatusSlices = removeAlicizationExecutionStatusSlices

function sanitizeExecutorReplyEvidenceText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function extractExecutorToolReplyEvidence(result: unknown, toolName: string): ExecutorToolReplyEvidence | null {
  const normalizedToolName = sanitizeExecutorReplyEvidenceText(toolName, 96) || 'executor'

  if (typeof result === 'string') {
    const summary = sanitizeExecutorReplyEvidenceText(result)
    if (!summary)
      return null
    return {
      toolName: normalizedToolName,
      channel: '',
      status: 'unknown',
      stage: '',
      summary,
      output: summary,
      errorCode: '',
      errorMessage: '',
    }
  }

  if (!result || typeof result !== 'object')
    return null

  const payload = result as Record<string, unknown>
  const rawOutput = typeof payload.output === 'string'
    ? payload.output
    : payload.output != null
      ? JSON.stringify(payload.output)
      : ''
  const summary = sanitizeExecutorReplyEvidenceText(payload.summary)
    || sanitizeExecutorReplyEvidenceText(payload.errorMessage)
    || sanitizeExecutorReplyEvidenceText(rawOutput, 420)
    || sanitizeExecutorReplyEvidenceText(payload.status)

  if (!summary)
    return null

  const status = sanitizeExecutorReplyEvidenceText(payload.status, 48).toLowerCase()
    || (payload.ok === true ? 'completed' : payload.ok === false ? 'failed' : 'unknown')

  return {
    toolName: normalizedToolName,
    channel: sanitizeExecutorReplyEvidenceText(payload.selectedChannel, 48).toLowerCase(),
    status,
    stage: sanitizeExecutorReplyEvidenceText(payload.stage, 48).toLowerCase(),
    summary,
    output: sanitizeExecutorReplyEvidenceText(rawOutput, 420),
    errorCode: sanitizeExecutorReplyEvidenceText(payload.errorCode, 96),
    errorMessage: sanitizeExecutorReplyEvidenceText(payload.errorMessage, 280),
  }
}

type StructuredWithContract = Omit<StructuredOutputResult, 'preDialogueAwareness' | 'preDialogueClosure'>
  & Omit<ChatAssistantStructuredPayload, | 'thought'
  | 'emotion'
  | 'reply'
  | 'performance'
  | 'userSentimentScore'
  | 'sentimentConfidenceRaw'
  | 'sentimentConfidence'
  | 'format'
  | 'parsePath'
  | 'preDialogueAwareness'
  | 'preDialogueClosure'>
  & {
    embodiment?: AlicizationDialogueEmbodimentEnvelope | null
    embodimentScript?: AlicizationEmbodimentScriptV1 | null
    speechTimeline?: AlicizationDialogueSpeechTimeline | null
    digitalLife?: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
    runtimeDigest?: AlicizationRuntimeDigest | null
    projectState?: StructuredOutputResult['projectState']
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
    projectState?: StructuredOutputResult['projectState']
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
  const normalizedInputProjectState = normalizeStructuredProjectStatePayload(
    (input.projectState ?? null) as Record<string, unknown> | null,
  ) ?? null
  const normalizedStructuredProjectState = normalizeStructuredProjectStatePayload(
    (structured.projectState ?? null) as Record<string, unknown> | null,
  ) ?? null
  const {
    preDialogueAwareness: _preDialogueAwareness,
    preDialogueClosure: _preDialogueClosure,
    ...structuredWithoutPreDialogue
  } = structured as StructuredWithContract & {
    preDialogueAwareness?: unknown
    preDialogueClosure?: unknown
  }

  return {
    ...structuredWithoutPreDialogue,
    embodiment: input.embodiment ?? structured.embodiment ?? null,
    embodimentScript: input.embodimentScript ?? structured.embodimentScript ?? null,
    speechTimeline: input.speechTimeline ?? structured.speechTimeline ?? null,
    digitalLife: normalizedInputDigitalLife ?? normalizedStructuredDigitalLife ?? input.digitalLife ?? structured.digitalLife ?? null,
    digitalLifeSpine: input.digitalLifeSpine ?? structured.digitalLifeSpine ?? null,
    runtimeDigest: input.runtimeDigest ?? structured.runtimeDigest ?? null,
    projectState: normalizedInputProjectState ?? normalizedStructuredProjectState ?? null,
    governance: input.governance ?? structured.governance ?? null,
  }
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

function detectFileSystemToolIntent(message: string) {
  const normalized = message.trim()
  if (!normalized)
    return false
  return fileSystemOperationVerbPattern.test(normalized) && fileSystemOperationTargetPattern.test(normalized)
}

function detectReminderToolIntent(message: string) {
  const normalized = message.trim()
  if (!normalized)
    return false
  if (!reminderDurationPattern.test(normalized))
    return false
  if (reminderVerbPattern.test(normalized))
    return true
  return reminderChineseNaturalPattern.test(normalized) || reminderEnglishNaturalPattern.test(normalized)
}

function detectExecutionToolRoutingIntent(message: string) {
  const capabilityInquiry = detectAlicizationExecutionCapabilityInquiry(message)
  return detectAlicizationExecutionRoutingIntent({
    message,
    capabilityInquiry,
  })
}

function resolveMainGatewayToolingPolicy(input: {
  origin: 'ui-user' | 'tool-output' | 'context-recall' | 'system'
  requiresImmediateFileToolCall: boolean
  requiresReminderToolCall: boolean
  requiresExecutionToolCall: boolean
}) {
  const toolingRequired
    = input.requiresImmediateFileToolCall
      || input.requiresReminderToolCall
      || input.requiresExecutionToolCall
  if (input.origin !== 'ui-user') {
    return {
      toolingRequired,
      supportsTools: true,
      waitForTools: true,
    }
  }

  return {
    toolingRequired,
    supportsTools: toolingRequired,
    waitForTools: toolingRequired,
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

function buildTimeoutDiagnosticReply(error: unknown, userText?: string) {
  void error
  return chatFailureReply('timeout', userText)
}

function resolveStreamFailureFallback(error: unknown, userText?: string): { reply: string, kind: StreamFailureKind } {
  const errorCode = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code ?? '').toLowerCase()
    : ''
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
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
  if (
    message.includes('chat_timeout')
    || message.includes('chat completions timed out before the first event')
    || (message.includes('main gateway health check failed') && message.includes('first event'))
    || message.includes('after-dispatch-meta')
    || message.includes('main-gateway-timeout-recovery')
  ) {
    return {
      reply: buildTimeoutDiagnosticReply(error, userText),
      kind: 'timeout',
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
    return {
      reply: buildTimeoutDiagnosticReply(error, userText),
      kind: 'timeout',
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
  toolingRequired?: boolean
}) {
  if (options.supportsTools === false)
    return false
  if (options.sawProgress)
    return false
  if (options.toolingRequired)
    return false

  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
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

function hasStructuredJsonContract(
  structured: StructuredOutputResult | undefined,
  validationIssues: StructuredValidationIssue[],
) {
  return structured?.parsePath === 'json' && validationIssues.length === 0
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
  const normalizedProjectState = normalizeStructuredProjectStatePayload(
    (structured.projectState ?? null) as Record<string, unknown> | null,
  ) ?? null

  return {
    ...structured,
    digitalLife: normalizedDigitalLife,
    projectState: normalizedProjectState,
  }
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

async function safelyGetAlicizationSoulSnapshot() {
  if (!hasAlicizationBridge())
    return null

  try {
    return await getAlicizationBridge().getSoul()
  }
  catch {
    return null
  }
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
        label: 'quiet-companionship',
        summary: 'Still quietly accompanying the host through the current focus.',
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

    await chatSession.ensureSessionReady(sessionId)

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

    const isStaleGeneration = () => chatSession.getSessionGeneration(sessionId) !== generation
    if (isStaleGeneration())
      return

    const activeTurn = registerAlicizationTurnAbort({
      scope: 'chat',
      turnId: `chat:${sessionId}:${streamingMessageContext.message.id}`,
    })
    const abortSignal = activeTurn.signal
    const turnId = activeTurn.turnId
    const shouldAbort = () => isStaleGeneration() || abortSignal.aborted

    sending.value = true

    const isForegroundSession = () => sessionId === activeSessionId.value

    // NOTICE: Keep the assistant message id stable per turn so renderer-side
    // reconcile can upsert the main-process replay instead of inserting a duplicate.
    const buildingMessage: StreamingAssistantMessage = { role: 'assistant', content: '', slices: [], tool_results: [], createdAt: Date.now(), id: turnId }
    let stagedAssistantResolution: StagedAssistantResolution | null = null
    let stagedSpeechDraft = ''
    let finalAssistantDisplayText = ''
    let assistantTextCommitted = false
    let blockedStructuredTurnForPersistence: StructuredWithContract | null = null
    let blockedStructuredTurnPersisted = false

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
    let turnProjectState: StructuredOutputResult['projectState'] = null
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
        projectState: turnProjectState,
        governance: turnMindGovernance,
      }
    }

    const ingestTurnStructuredRuntimeMeta = (event: Extract<StreamEvent, { type: 'meta' }>) => {
      if (isUsableMindTurnGovernanceCandidate(event.governance)) {
        turnMindGovernance = event.governance
      }
      turnEmbodiment = event.embodiment ?? turnEmbodiment
      turnEmbodimentScript = event.embodimentScript ?? turnEmbodimentScript
      turnSpeechTimeline = event.speechTimeline ?? turnSpeechTimeline
      turnDigitalLife = resolveChatRuntimeDigitalLifeAuthority({
        digitalLife: event.digitalLife,
        embodimentScript: event.embodimentScript,
      }) ?? turnDigitalLife
      turnDigitalLifeSpine = event.digitalLifeSpine ?? turnDigitalLifeSpine
      turnRuntimeDigest = event.runtimeDigest ?? turnRuntimeDigest
      if (Object.hasOwn(event, 'projectState')) {
        turnProjectState = normalizeStructuredProjectStatePayload(
          (event.projectState ?? null) as Record<string, unknown> | null,
        ) ?? null
      }
      else {
        turnProjectState = normalizeStructuredProjectStatePayload(
          (event.runtimeDigest?.projectState ?? turnProjectState ?? null) as Record<string, unknown> | null,
        ) ?? turnProjectState
      }
    }

    const setStagedAssistantResolution = (resolution: StagedAssistantResolution) => {
      stagedAssistantResolution = resolution
      finalAssistantDisplayText = resolution.reply
      return resolution
    }

    let turnPersonalityState: AlicizationPersonalityState | null = null
    const stageFailureSurface = (
      kind: StreamFailureKind,
      replyText?: string,
      emotion: StructuredOutputResult['emotion'] = 'concerned',
    ) => {
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
      const finalReply = structuredWithRuntimeMeta.reply.trim()
      const categorization = staged.categorization
      const finalizedCategorization = {
        ...categorization,
        speech: finalReply,
      }
      const finalizedSlices = finalReply
        ? removeExecutionStatusSlices(replaceAssistantTextSlices(buildingMessage.slices, finalReply))
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
      const requiresImmediateFileToolCall = origin === 'ui-user' && detectFileSystemToolIntent(sendingMessage)
      const requiresReminderToolCall = origin === 'ui-user' && detectReminderToolIntent(sendingMessage)
      const executionToolRoutingIntent = origin === 'ui-user'
        ? detectExecutionToolRoutingIntent(sendingMessage)
        : null
      const requiresExecutionToolCall = Boolean(executionToolRoutingIntent)
      const requiredExecutionToolNames = new Set(executionToolRoutingIntent?.requiredToolNames ?? [])
      const runtimeGatewayToolingPolicy = resolveMainGatewayToolingPolicy({
        origin,
        requiresImmediateFileToolCall,
        requiresReminderToolCall,
        requiresExecutionToolCall,
      })
      const turnToolEvidence: TurnToolEvidence = {
        toolCallCount: 0,
        toolResultCount: 0,
        executorToolCallCount: 0,
        verifiedToolResult: false,
        executorToolCallIds: new Set<string>(),
        latestExecutorResult: null,
        sawTextAfterExecutorResult: false,
        deniedBySafety: false,
        reminderToolCallIds: new Set<string>(),
        reminderScheduled: false,
      }
      const observedToolNamesById = new Map<string, string>()
      let bridgeStreamAttemptSeq = 0
      const resolvedRoute = resolveSendRoute(options)
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
          requiresImmediateFileToolCall,
          requiresReminderToolCall,
          requiresExecutionToolCall,
        },
      })
      const streamWithRuntimeGateway = async (
        messages: Message[],
        streamOptions: StreamOptions,
      ) => {
        type StreamWatchdogTouchKind = 'progress' | 'liveness'
        type StreamWatchdogTimeoutPhase = 'first-event-timeout' | 'liveness-timeout' | 'idle-timeout'

        const withStreamWatchdog = async (
          execute: (hooks: { touch: (kind?: StreamWatchdogTouchKind) => void }) => Promise<void>,
          options: {
            firstEventTimeoutMs: number
            livenessTimeoutMs: number
            idleTimeoutMs: number
            onTimeout?: (payload: {
              phase: StreamWatchdogTimeoutPhase
              timeoutMs: number
              sawAnyEvent: boolean
              sawProgress: boolean
            }) => void
          },
        ) => {
          let timer: ReturnType<typeof setTimeout> | undefined
          let sawAnyEvent = false
          let sawProgress = false
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
                touch: (kind = 'progress') => {
                  sawAnyEvent = true
                  if (kind === 'progress') {
                    sawProgress = true
                    scheduleTimeout(options.idleTimeoutMs, 'idle-timeout', rejectOnce)
                    return
                  }
                  if (!sawProgress) {
                    scheduleTimeout(options.livenessTimeoutMs, 'liveness-timeout', rejectOnce)
                  }
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
            override: { supportsTools?: boolean, waitForTools?: boolean } = {},
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
            let sawProgress = false
            let sawMeta = false
            let lastEventType = ''
            const startedAt = Date.now()
            try {
              await withStreamWatchdog(async ({ touch }) => {
                await bridgeStreamChat({
                  turnId: bridgeAttemptTurnId,
                  providerId: resolvedRoute.providerId,
                  model: resolvedRoute.model,
                  providerConfig: resolvedRoute.providerConfig,
                  messages: messagePayload,
                  supportsTools: override.supportsTools ?? streamOptions.supportsTools,
                  waitForTools: override.waitForTools ?? streamOptions.waitForTools,
                }, {
                  abortSignal: streamOptions.abortSignal,
                  onStreamEvent: async (event) => {
                    lastEventType = typeof event?.type === 'string' ? event.type : ''
                    if (event.type === 'meta') {
                      sawMeta = true
                      touch('liveness')
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
                    if (event.type === 'text-delta' || event.type === 'tool-call' || event.type === 'tool-result') {
                      sawProgress = true
                      touch('progress')
                    }
                    if (event.type === 'text-delta' && event.text.trim())
                      runtimeAuthoritativeModelTextObserved = true
                    await streamOptions.onStreamEvent?.(event)
                  },
                })
              }, {
                firstEventTimeoutMs: timeoutOptions.firstEventTimeoutMs,
                livenessTimeoutMs: timeoutOptions.livenessTimeoutMs,
                idleTimeoutMs: timeoutOptions.idleTimeoutMs,
                onTimeout: ({ phase, timeoutMs, sawAnyEvent: watchdogSawAnyEvent, sawProgress: watchdogSawProgress }) => {
                  void appendAlicizationAuditLog({
                    level: 'warning',
                    category: 'alicization.main-gateway',
                    action: 'renderer-stream-watchdog-timeout',
                    message: 'Renderer bridge watchdog timed out while waiting for main-process stream progress.',
                    details: {
                      sessionId,
                      turnId,
                      bridgeAttemptTurnId,
                      supportsTools: override.supportsTools ?? streamOptions.supportsTools,
                      waitForTools: override.waitForTools ?? streamOptions.waitForTools,
                      firstEventTimeoutMs: timeoutOptions.firstEventTimeoutMs,
                      livenessTimeoutMs: timeoutOptions.livenessTimeoutMs,
                      idleTimeoutMs: timeoutOptions.idleTimeoutMs,
                      timeoutMs,
                      timeoutPhase: phase,
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
            catch (error) {
              if (error instanceof Error) {
                const streamError = error as Error & { __alicizationSawProgress?: boolean }
                streamError.__alicizationSawProgress = sawProgress || streamError.__alicizationSawProgress === true
              }
              throw error
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
              toolingRequired: runtimeGatewayToolingPolicy.toolingRequired,
            })) {
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
              }, {
                firstEventTimeoutMs: runtimeGatewayWatchdogPolicy.retryFirstEventTimeoutMs,
                livenessTimeoutMs: runtimeGatewayWatchdogPolicy.retryLivenessTimeoutMs,
                idleTimeoutMs: runtimeGatewayWatchdogPolicy.retryIdleTimeoutMs,
              })
              return
            }
            throw error
          }
          return
        }

        await withStreamWatchdog(async ({ touch }) => {
          await llmStore.stream(options.model, options.chatProvider, messages, {
            ...streamOptions,
            responseFormat: alicizationProviderResponseFormat,
            onStreamEvent: async (event) => {
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
              if (event.type === 'text-delta' || event.type === 'tool-call' || event.type === 'tool-result')
                touch('progress')
              await streamOptions.onStreamEvent?.(event)
            },
          })
        }, {
          firstEventTimeoutMs: runtimeGatewayWatchdogPolicy.firstEventTimeoutMs,
          livenessTimeoutMs: runtimeGatewayWatchdogPolicy.livenessTimeoutMs,
          idleTimeoutMs: runtimeGatewayWatchdogPolicy.idleTimeoutMs,
        })
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

        if (!hasStructuredJsonContract(candidate, validationIssues)) {
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
            kind: 'structured-contract',
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
        const outputRejected = !finalReply
          || inspectedOutput.fabricationDetected
          || inspectedOutput.leakDetected
          || inspectedOutput.cleanText.trim() !== finalReply

        if (outputRejected) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'output-guard',
            action: 'provider-output-rejected',
            message: 'Renderer rejected unsafe provider output without writing substitute dialogue.',
            details: {
              empty: !finalReply,
              fabricationDetected: inspectedOutput.fabricationDetected,
              leakDetected: inspectedOutput.leakDetected,
              removedCount: inspectedOutput.removedCount,
            },
          })
          return stageFailureSurface(inspectedOutput.leakDetected ? 'internal-leak' : 'structured-contract')
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
            speech: finalReply,
            reasoning: payload.reasoning,
          },
          structured,
          reply: finalReply,
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

      const toolCallQueue = createQueue<ChatSlices>({
        handlers: [
          async (ctx) => {
            if (shouldAbort())
              return
            if (ctx.data.type === 'tool-call') {
              buildingMessage.slices.push(ctx.data)
              updateUI()
              return
            }

            if (ctx.data.type === 'execution-status') {
              upsertExecutionStatusSlice(buildingMessage.slices, ctx.data)
              updateUI()
              return
            }

            if (ctx.data.type === 'tool-call-result') {
              buildingMessage.tool_results.push(ctx.data)
              updateUI()
            }
          },
        ],
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

      const contextsSnapshot = chatContext.getContextsSnapshot()
      if (hasAlicizationBridge()) {
        const soulSnapshot = await safelyGetAlicizationSoulSnapshot()
        turnPersonalityState = soulSnapshot?.frontmatter?.personality ?? null
        if (runtimeAuthoritativeBridge) {
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'alicization.prompt',
            action: 'runtime-governance-delegated',
            message: 'Delegated Alicization prompt governance to main runtime pipeline.',
            details: {
              contextSourceCount: Object.keys(contextsSnapshot).length,
            },
          })
        }
        else {
          const composed = composeAlicizationPromptMessages({
            messages: newMessages as Message[],
            soulContent: soulSnapshot?.content ?? null,
            hostName: soulSnapshot?.frontmatter?.profile?.hostName ?? null,
            personalityState: turnPersonalityState,
            contextsSnapshot,
          })
          newMessages = composed.messages as any

          if (composed.personalityDirectiveResult) {
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'alicization.prompt',
              action: 'personality-directives.injected',
              message: 'Injected low-personality semantic directives into SOUL anchor.',
              details: {
                triggered: composed.personalityDirectiveResult.triggered,
              },
            })
          }

          const budgeted = applyPromptBudget(newMessages as Message[])
          newMessages = budgeted.messages as any
          if (budgeted.report.safeMode.activated) {
            await appendAlicizationAuditLog({
              level: 'critical',
              category: 'alicization.budget',
              action: 'overflow_soul',
              message: 'SOUL exceeded prompt budget and safe mode degradation was applied.',
              details: {
                totalBeforeTokens: budgeted.report.totalBeforeTokens,
                totalAfterTokens: budgeted.report.totalAfterTokens,
                soulTokensBefore: budgeted.report.safeMode.soulTokensBefore,
                soulTokensAfter: budgeted.report.safeMode.soulTokensAfter,
                reason: budgeted.report.safeMode.reason,
              },
            })
          }

          if (!budgeted.report.anchorPreserved) {
            await appendAlicizationAuditLog({
              level: 'warning',
              category: 'prompt-budget',
              action: 'anchor-mutated',
              message: 'SOUL anchor message changed during budget processing unexpectedly.',
              details: {
                sections: budgeted.report.sections,
              },
            })
          }

          if (budgeted.report.truncated) {
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'prompt-budget',
              action: 'truncate',
              message: 'Prompt budget manager truncated context before model call.',
              details: {
                totalBeforeTokens: budgeted.report.totalBeforeTokens,
                totalAfterTokens: budgeted.report.totalAfterTokens,
                droppedMessageCount: budgeted.report.droppedMessageCount,
                sections: budgeted.report.sections,
              },
            })
          }

          const sanitized = sanitizeForRemoteModel(newMessages as Message[], { timeBudgetMs: 50, chunkSize: 2048 })
          if (sanitized.blocked) {
            await appendAlicizationAuditLog({
              level: 'critical',
              category: 'sanitize',
              action: 'blocked',
              message: 'Outbound model request blocked by sanitize gateway.',
              details: {
                reason: sanitized.reason,
                elapsedMs: sanitized.elapsedMs,
              },
            })
            throw new Error(stageChatText('errors.privacy-blocked'))
          }

          if (sanitized.redactions > 0) {
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'sanitize',
              action: 'redacted',
              message: 'Sanitize gateway redacted sensitive content before model call.',
              details: {
                redactions: sanitized.redactions,
                elapsedMs: sanitized.elapsedMs,
              },
            })
          }

          newMessages = sanitized.messages as any
        }
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

      const recordObservedToolCall = async (event: StreamToolCallPayload) => {
        const toolMessage = toToolMessageFromStreamEvent(event)
        turnToolCalls.push(toolMessage)
        await hooks.emitToolCallHooks(event, streamingMessageContext)
      }

      await streamWithRuntimeGateway(newMessages as Message[], {
        headers,
        tools: options.tools,
        supportsTools: runtimeGatewayToolingPolicy.supportsTools,
        abortSignal,
        // NOTICE: xsai stream may emit `finish` before tool steps continue, so keep waiting until
        // the final non-tool finish to avoid ending the chat turn with no assistant reply.
        waitForTools: runtimeGatewayToolingPolicy.waitForTools,
        onStreamEvent: async (event: StreamEvent) => {
          switch (event.type) {
            case 'meta':
              ingestTurnStructuredRuntimeMeta(event)
              if (event.embodiment || event.embodimentScript || event.speechTimeline || event.digitalLife || event.digitalLifeSpine || event.runtimeDigest) {
                await hooks.emitEmbodimentMetaHooks({
                  governance: event.governance ?? turnMindGovernance,
                  embodiment: event.embodiment ?? null,
                  embodimentScript: event.embodimentScript ?? null,
                  speechTimeline: event.speechTimeline ?? null,
                  digitalLife: resolveChatRuntimeDigitalLifeAuthority({
                    digitalLife: event.digitalLife,
                    embodimentScript: event.embodimentScript,
                  }),
                  digitalLifeSpine: event.digitalLifeSpine ?? null,
                  runtimeDigest: event.runtimeDigest ?? null,
                }, streamingMessageContext)
              }
              break
            case 'tool-call': {
              turnToolEvidence.toolCallCount += 1
              await recordObservedToolCall(event)
              {
                const observedToolName = normalizeObservedToolName(event)
                if (event.toolCallId && observedToolName)
                  observedToolNamesById.set(event.toolCallId, observedToolName)
                if (isExecutionToolNameSatisfiedByRoutingIntent({
                  requiredToolNames: requiredExecutionToolNames,
                  toolName: observedToolName,
                })) {
                  turnToolEvidence.executorToolCallCount += 1
                  if (event.toolCallId)
                    turnToolEvidence.executorToolCallIds.add(event.toolCallId)
                }
              }
              if (normalizeObservedToolName(event) === 'set_reminder' && event.toolCallId)
                turnToolEvidence.reminderToolCallIds.add(event.toolCallId)
              const observedToolName = normalizeObservedToolName(event)
              toolCallQueue.enqueue(isExecutionEvidenceToolName(observedToolName)
                ? buildExecutorExecutionStatus({
                    toolName: observedToolName,
                  })
                : {
                    type: 'tool-call',
                    toolCall: event,
                  })

              break
            }
            case 'tool-result':
              turnToolEvidence.toolResultCount += 1
              if (hasVerifiedToolResult(event.result))
                turnToolEvidence.verifiedToolResult = true
              if (turnToolEvidence.executorToolCallIds.has(event.toolCallId)) {
                const executorToolName = observedToolNamesById.get(event.toolCallId) ?? 'executor'
                const executorResult = extractExecutorToolReplyEvidence(event.result, executorToolName)
                if (executorResult) {
                  turnToolEvidence.latestExecutorResult = executorResult
                  turnToolEvidence.sawTextAfterExecutorResult = false
                  toolCallQueue.enqueue(buildExecutorExecutionStatus({
                    toolName: executorToolName,
                    result: executorResult,
                  }))
                }
              }
              if (turnToolEvidence.reminderToolCallIds.has(event.toolCallId)) {
                const reminderPayload = extractScheduledReminderPayload(event.result)
                if (reminderPayload.scheduled) {
                  turnToolEvidence.reminderScheduled = true
                  if (reminderPayload.message)
                    turnToolEvidence.reminderMessage = reminderPayload.message
                }
              }
              {
                const deniedReason = extractDeniedToolReason(event.result)
                if (deniedReason) {
                  trackToolDeniedReason(deniedReason)
                }
              }
              toolCallQueue.enqueue({
                type: 'tool-call-result',
                id: event.toolCallId,
                result: event.result,
              })

              break
            case 'text-delta':
              ingestTransportVisibleArtifactMetadata(event)
              if (runtimeAuthoritativeBridge) {
                turnTransportVisibleText += event.text
                if (event.origin === 'provider' && event.text.trim())
                  runtimeAuthoritativeModelTextObserved = true
                break
              }
              if (turnToolEvidence.latestExecutorResult && event.text.length > 0)
                turnToolEvidence.sawTextAfterExecutorResult = true
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
        },
      })

      if (runtimeAuthoritativeBridge) {
        if (!turnTransportFailureSurface && turnTransportProviderFullText) {
          await applyAssistantTextFromModelOutput(turnTransportProviderFullText)
        }
        else if (!turnTransportFailureSurface && turnTransportVisibleText.trim()) {
          stageFailureSurface('structured-contract')
        }
      }
      else {
        await parser.end()
      }

      const missingRequiredTool = (
        requiresImmediateFileToolCall && turnToolEvidence.toolCallCount === 0
      ) || (
        requiresReminderToolCall && turnToolEvidence.reminderToolCallIds.size === 0
      ) || (
        requiresExecutionToolCall && turnToolEvidence.executorToolCallCount === 0
      )
      const missingExecutionPayoff = requiresExecutionToolCall
        && turnToolEvidence.latestExecutorResult !== null
        && !turnToolEvidence.sawTextAfterExecutorResult

      if (missingRequiredTool || missingExecutionPayoff) {
        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.intent-action',
          action: missingRequiredTool ? 'required-tool-missing' : 'execution-payoff-missing',
          message: 'Renderer detected an incomplete tool turn and exposed only a transparent failure surface.',
          details: {
            sessionId,
            turnId,
            toolCallCount: turnToolEvidence.toolCallCount,
            executorToolCallCount: turnToolEvidence.executorToolCallCount,
            reminderToolCallCount: turnToolEvidence.reminderToolCallIds.size,
          },
        })
        stageFailureSurface(missingRequiredTool ? 'model-tools-unsupported' : 'stream-failure')
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
          const failure = resolveStreamFailureFallback(error, sendingMessage)
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
