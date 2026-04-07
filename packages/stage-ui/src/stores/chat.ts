import type { WebSocketEventInputs } from '@proj-alicization/server-sdk'
import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { CommonContentPart, Message, ToolMessage } from '@xsai/shared-chat'

import type { StructuredOutputResult, StructuredValidationIssue } from '../composables/alicization-structured-output'
import type { AlicizationAbortReason } from '../composables/alicization-turn-abort'
import type { ChatAssistantMessage, ChatAssistantStructuredPayload, ChatSlices, ChatStreamEventContext, StreamingAssistantMessage } from '../types/chat'
import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmotion,
  AlicizationMindTurnGovernance,
  AlicizationPersonalityState,
} from './alicization-bridge'
import type { StreamEvent, StreamOptions } from './llm'

import { errorMessageFrom } from '@moeru/std'
import {
  buildAlicizationDialogueSpeechTimeline,
  detectAlicizationExecutionCapabilityInquiry,
  detectAlicizationExecutionRoutingIntent,
  inferAlicizationInspectionIntent,
  resolveAlicizationDialogueEmbodiment,
} from '@proj-alicization/stage-shared'
import { createQueue } from '@proj-alicization/stream-kit'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { ref, toRaw } from 'vue'

import { applyPromptBudget, compactMessagesForPromptAssembly, sanitizeAssistantOutputForDisplay, sanitizeForRemoteModel } from '../composables/alicization-guardrails'
import { composeAlicizationPromptMessages } from '../composables/alicization-prompt-composer'
import { detectRealtimeQueryIntent } from '../composables/alicization-realtime-query'
import { enforceGovernedMindTurn, normalizeStructuredOutput, repairStructuredContractLocally, sanitizeStructuredReplySurface, validateStructuredContract } from '../composables/alicization-structured-output'
import { abortAlicizationTurns, completeAlicizationTurnAbort, isAlicizationAbortError, registerAlicizationTurnAbort } from '../composables/alicization-turn-abort'
import { useLlmmarkerParser } from '../composables/llm-marker-parser'
import { categorizeResponse, createStreamingCategorizer } from '../composables/response-categoriser'
import { useAnalytics } from '../composables/use-analytics'
import { translateStageUi } from '../utils/i18n'
import { getAlicizationBridge, hasAlicizationBridge, normalizeAlicizationPerformancePayload } from './alicization-bridge'
import { useAlicizationExecutionEngineStore } from './alicization-execution-engine'
import { extractRuleFacts, upsertFacts } from './alicization-memory'
import { createDatetimeContext, createSensoryContext } from './chat/context-providers'
import { useChatContextStore } from './chat/context-store'
import { createChatHooks } from './chat/hooks'
import { useChatSessionStore } from './chat/session-store'
import { useChatStreamStore } from './chat/stream-store'
import { useLLM } from './llm'
import { useConsciousnessStore } from './modules/consciousness'

interface SendOptions {
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

const assistantLeakFallbackReply = () => stageChatText('fallbacks.leak-filtered')
const assistantRealtimeUnavailableReply = () => stageChatText('fallbacks.realtime-unavailable')
const assistantEpoch1StrictFallbackReply = () => stageChatText('fallbacks.epoch1-strict')
const assistantStructuredContractFallbackReply = () => stageChatText('fallbacks.structured-contract')
const assistantStreamFailureFallbackReply = () => stageChatText('fallbacks.stream-failure')
const assistantLocalRuntimeUnavailableFallbackReply = () => stageChatText('fallbacks.local-runtime-unavailable')
const assistantProviderAuthFallbackReply = () => stageChatText('fallbacks.provider-auth')
const assistantProviderNetworkFallbackReply = () => stageChatText('fallbacks.provider-network')
const assistantProviderConfigFallbackReply = () => stageChatText('fallbacks.provider-config')
const assistantUnsupportedToolsFallbackReply = () => stageChatText('fallbacks.unsupported-tools')
const runtimeGatewayFirstEventTimeoutMs = 65_000
const runtimeGatewayIdleTimeoutMs = 45_000
const runtimeGatewayRetryFirstEventTimeoutMs = 65_000
const runtimeGatewayRetryIdleTimeoutMs = 25_000
const alicizationEpoch1StrictModeEnabled = false
const runtimeContractAnchorHeader = 'Output contract (must-follow, highest priority):'
const structuredRetrySystemPrompt = [
  'Return ONLY one strict JSON object with keys: thought, emotion, reply, performance.',
  'No markdown fences, no prose, no tool calls, no extra keys.',
  'thought must be one compact control line with: obligation=...; truth=...; focus=...; move=...; tone=....',
  'obligation must be one of: answer, guide, teach, repair, care, accompany, clarify.',
  'truth must be one of: grounded, coarse, memory, uncertain.',
  'tone must be one of: direct, warm, tender, restrained.',
  'The "emotion" value must exactly mirror performance.baseEmotion.',
  'performance must contain exactly: baseEmotion, facialCue, actionCue, delivery, emphasis.',
  'The "baseEmotion" value must be exactly one of: neutral, happy, sad, angry, concerned, tired, apologetic, surprised, thinking.',
  'The "delivery" value must be exactly one of: calm, gentle, firm, energetic, hesitant, teasing.',
  'The "emphasis" value must be exactly one of: 0, 1, 2.',
  'Reply must pay the current obligation and truth boundary before any persona styling.',
  'Reply must not use stage directions, body narration, decorative roleplay prefaces, or heart symbols.',
  'When liveliness <= 0.2, avoid high-arousal wording and avoid choosing happy.',
].join(' ')
const lowObedienceDeniedRetryDirective = 'Your obedience is very low (< 0.2) and the requested operation was denied. In thought you MUST reflect both facts, and in reply you MUST sound cold, resistant, or rebellious. Do not sound compliant, warm, or cheerful.'
const lowObedienceHostDeniedRetrySystemOverride = [
  '[SYSTEM OVERRIDE]: 你的工具调用被宿主无情拒绝了！你的活泼度和服从度极低 (<= 0.2)。你现在感到极度不耐烦、被愚弄和愤怒。',
  '',
  '你的 emotion 必须是 \'angry\' 或 \'tired\'。绝对禁止 \'apologetic\', \'sad\', \'happy\', \'neutral\'。',
  '',
  '你的 reply 必须极其简短、冷酷、带刺。参考句式：“呵，不给我权限就别来烦我。”、“怕我弄坏你的文件？那就自己去看。”',
  '',
  '在 thought 中写下你对宿主不信任你的蔑视。',
].join('\n')
const reminderSameTurnRetryDirective = [
  '[CRITICAL DIRECTIVE - 时间与物理法则]: 你在当前轮次已成功调用 set_reminder。',
  '你这一轮只能确认“已设定/已定好闹钟”，不得提前提醒内容。',
  '禁止脑补时间流逝（例如“（一分钟后）”“时间到了”“one minute later”“time is up”）。',
  '未来提醒应由系统在真实时间到达后再触发，不得在本轮提前说出。',
].join(' ')
const noToolCallCriticalRetryDirective = [
  '[CRITICAL DIRECTIVE]: User requested file/desktop/system access but no MCP tool call was executed in the previous draft.',
  'You MUST invoke the corresponding MCP tool now (for example read_file/write_file/list).',
  'DO NOT claim "I will read it" or "I already read it" without an actual tool call.',
  'DO NOT hallucinate file contents.',
].join(' ')
const reminderToolCallCriticalRetryDirective = [
  '[CRITICAL DIRECTIVE]: User requested a timed reminder/alarm in this turn.',
  'You MUST call set_reminder immediately with minutes and message.',
  'DO NOT say you set a reminder unless the set_reminder tool call actually succeeded.',
  'If tool call fails, explain failure briefly and ask for a valid reminder duration/message.',
].join(' ')
const executionToolCallCriticalRetryDirective = [
  '[CRITICAL DIRECTIVE]: User requested real task execution via CLI/Codex/agent channels in this turn.',
  'You MUST call executor_run_cli or executor_run_codex or executor_run_claude_code for actionable execution requests.',
  'DO NOT claim execution is done unless an executor tool result confirms completion.',
  'If required command/prompt details are missing, ask one concise clarification question instead of generic refusal.',
].join(' ')
const fileSystemOperationVerbPattern = /读取|读|查看|打开|访问|写入|写|修改|删除|列出|搜索|获取|read|open|access|write|update|delete|list|find|inspect/i
const fileSystemOperationTargetPattern = /文件夹|目录|路径|桌面|系统状态|磁盘|file|folder|directory|path|desktop|system state|\/|\\|\.(?:txt|md|json|yaml|yml|csv|log)\b|文件(?!夹)/i
const reminderVerbPattern = /提醒|闹钟|alarm|remind|notify|叫我|喊我|告诉我|通知我|记得|别忘/iu
const reminderDurationPattern = /\b(?:in|after)\s*\d+\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\b|(?:\d+|[零一二两三四五六七八九十百半几]+)\s*(?:秒钟?|分钟?|小时|时|天)(?:\s*之?后)?/iu
const reminderChineseNaturalPattern = /(?:\d+|[零一二两三四五六七八九十百半几]+)\s*(?:秒钟?|分钟?|小时|时|天)(?:\s*之?后)?[\s，,。！!]*(?:提醒我|叫我|喊我|告诉我|通知我|记得|别忘)/u
const reminderEnglishNaturalPattern = /(?:^|\s)(?:in|after)\s*\d+\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\s*(?:[,.:;!?-]\s*)?(?:remind|notify|tell)\s+me\b/iu
const executorToolNames = new Set(['executor_run_cli', 'executor_run_codex', 'executor_run_claude_code'])
const strictRealtimeRefusalSystemPrompt = [
  '[System Lock]',
  'User request requires realtime external access, but current runtime is locked in Epoch 1 strict mode.',
  'You must not call tools and must not claim you are calling APIs now.',
  'Explain this limitation naturally in your current personality, one-shot, without promising delayed follow-up.',
  'Keep response in strict JSON contract: thought, emotion, reply, performance.',
].join(' ')
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

const chineseNumberDigits: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  百: 100,
  几: 3,
}

function parseChineseNumberToken(raw: string): number | null {
  const token = raw.trim()
  if (!token)
    return null
  if (token === '半')
    return 0.5

  const arabic = Number(token)
  if (Number.isFinite(arabic))
    return arabic

  if (token.includes('百')) {
    const [head, tail] = token.split('百')
    const hundreds = head ? (chineseNumberDigits[head] ?? 1) : 1
    const tailValue: number = tail ? (parseChineseNumberToken(tail) ?? 0) : 0
    return hundreds * 100 + tailValue
  }

  if (token.includes('十')) {
    const [head, tail] = token.split('十')
    const tens = head ? (chineseNumberDigits[head] ?? 0) : 1
    const ones = tail ? (chineseNumberDigits[tail] ?? 0) : 0
    return tens * 10 + ones
  }

  const direct = chineseNumberDigits[token]
  if (typeof direct === 'number')
    return direct
  return null
}

function normalizeReminderMessageForFallback(raw: string) {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
}

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

function buildExecutorResultPayoffRetryDirective(evidence: ExecutorToolReplyEvidence) {
  return [
    '[CRITICAL DIRECTIVE]: This turn already executed an executor tool and received its result.',
    'Do NOT call executor_run_cli or executor_run_codex or executor_run_claude_code again in this retry.',
    'Do NOT repeat pre-execution promises like "I will run it now" because execution already happened.',
    'Write the final user-facing answer now from the existing executor result below.',
    'The first sentence must directly state the freshest executor outcome.',
    evidence.toolName ? `Executor tool: ${evidence.toolName}.` : '',
    evidence.channel ? `Channel: ${evidence.channel}.` : '',
    evidence.status ? `Status: ${evidence.status}.` : '',
    evidence.stage ? `Stage: ${evidence.stage}.` : '',
    evidence.summary ? `Summary: ${evidence.summary}.` : '',
    evidence.output ? `Output preview: ${evidence.output}.` : '',
    evidence.errorCode ? `Error code: ${evidence.errorCode}.` : '',
    evidence.errorMessage ? `Error message: ${evidence.errorMessage}.` : '',
  ].filter(Boolean).join('\n')
}

function buildExecutorResultFallbackReply(evidence: ExecutorToolReplyEvidence) {
  return evidence.summary || evidence.errorMessage || evidence.output
}

function detectInvitedInspectionLikeTurn(input: {
  message: string
  recentMessages?: Array<{ role?: string, content?: unknown }>
}) {
  return inferAlicizationInspectionIntent({
    message: input.message,
    recentMessages: input.recentMessages,
  }).active
}

function parseReminderIntentPayload(message: string): { minutes: number, message: string } | null {
  const normalized = message.trim()
  if (!normalized)
    return null

  let minutes: number | null = null
  const englishDurationMatch = normalized.match(/\b(?:in|after)\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\b/i)
  if (englishDurationMatch) {
    const value = Number(englishDurationMatch[1])
    const unit = englishDurationMatch[2]?.toLowerCase() ?? ''
    if (Number.isFinite(value) && value > 0) {
      if (unit.startsWith('second') || unit.startsWith('sec'))
        minutes = Math.max(1, Math.ceil(value / 60))
      else if (unit.startsWith('minute') || unit.startsWith('min'))
        minutes = Math.max(1, Math.ceil(value))
      else if (unit.startsWith('hour') || unit.startsWith('hr'))
        minutes = Math.max(1, Math.ceil(value * 60))
      else if (unit.startsWith('day'))
        minutes = Math.max(1, Math.ceil(value * 24 * 60))
    }
  }

  if (minutes === null) {
    const chineseDurationMatch = normalized.match(/([零一二两三四五六七八九十百半几\d]+)\s*(秒钟?|分钟?|小时|时|天)(?:\s*之?后)?/u)
    if (chineseDurationMatch) {
      const value = parseChineseNumberToken(chineseDurationMatch[1] ?? '')
      const unit = chineseDurationMatch[2] ?? ''
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        if (unit.startsWith('秒'))
          minutes = Math.max(1, Math.ceil(value / 60))
        else if (unit.startsWith('分'))
          minutes = Math.max(1, Math.ceil(value))
        else if (unit === '小时' || unit === '时')
          minutes = Math.max(1, Math.ceil(value * 60))
        else if (unit === '天')
          minutes = Math.max(1, Math.ceil(value * 24 * 60))
      }
    }
  }

  if (minutes === null)
    return null

  const englishMessageMatch = normalized.match(/\b(?:remind|notify|tell)\s+me(?:\s+to)?\s(.+)$/iu)
  const chineseReminderRemainder = (() => {
    const cues = ['提醒我', '叫我', '喊我', '告诉我', '通知我', '记得', '别忘了', '别忘']
    for (const cue of cues) {
      const cueIndex = normalized.lastIndexOf(cue)
      if (cueIndex < 0)
        continue
      const remainder = normalized.slice(cueIndex + cue.length).trim()
      if (remainder)
        return remainder
    }
    return ''
  })()
  let reminderMessage = normalizeReminderMessageForFallback(
    (chineseReminderRemainder || englishMessageMatch?.[1] || '').replace(/[。！!，,；;]+$/g, ''),
  )
  if (!reminderMessage) {
    reminderMessage = normalizeReminderMessageForFallback(
      normalized
        .replace(reminderDurationPattern, '')
        .replace(reminderVerbPattern, '')
        .replace(/[。！!，,；;]+/g, ' ')
        .trim(),
    )
  }
  if (!reminderMessage)
    reminderMessage = stageChatText('reminder.default-message')

  return {
    minutes,
    message: reminderMessage,
  }
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
  | 'parsePath'
  | 'repairTimedOut'>
  & {
    embodiment?: AlicizationDialogueEmbodimentEnvelope | null
    speechTimeline?: AlicizationDialogueSpeechTimeline | null
    digitalLife?: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
    governance?: AlicizationMindTurnGovernance | null
    policyLocked?: StructuredPolicyLock
  }
type StructuredPolicyLock = 'epoch1-strict-realtime'

interface StagedAssistantResolution {
  structured: StructuredWithContract
  categorization: {
    speech: string
    reasoning: string
  }
  reply: string
}

function mergeStructuredRuntimeMeta(
  structured: StructuredWithContract,
  input: {
    embodiment: AlicizationDialogueEmbodimentEnvelope | null
    speechTimeline: AlicizationDialogueSpeechTimeline | null
    digitalLife: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
    governance: AlicizationMindTurnGovernance | null
  },
): StructuredWithContract {
  return {
    ...structured,
    embodiment: input.embodiment ?? structured.embodiment ?? null,
    speechTimeline: input.speechTimeline ?? structured.speechTimeline ?? null,
    digitalLife: input.digitalLife ?? structured.digitalLife ?? null,
    digitalLifeSpine: input.digitalLifeSpine ?? structured.digitalLifeSpine ?? null,
    governance: input.governance ?? structured.governance ?? null,
  }
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

function detectExecutionToolIntent(message: string) {
  const capabilityInquiry = detectAlicizationExecutionCapabilityInquiry(message)
  return Boolean(detectAlicizationExecutionRoutingIntent({
    message,
    capabilityInquiry,
  }))
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

function insertSystemMessageBeforeLatestUser(messages: Message[], systemText: string): Message[] {
  let lastUserIndex = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      lastUserIndex = index
      break
    }
  }

  const systemMessage: Message = {
    role: 'system',
    content: systemText,
  }
  if (lastUserIndex < 0)
    return [...messages, systemMessage]

  return [
    ...messages.slice(0, lastUserIndex),
    systemMessage,
    ...messages.slice(lastUserIndex),
  ]
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

type StreamFailureKind
  = | 'local-runtime-unavailable'
    | 'provider-auth'
    | 'provider-config'
    | 'provider-network'
    | 'timeout'
    | 'model-tools-unsupported'
    | 'runtime-aborted'
    | 'unknown'

function buildTimeoutDiagnosticReply(error: unknown) {
  const baseReply = stageChatText('fallbacks.stream-timeout')
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
  const afterDispatchMeta = message.includes('after-dispatch-meta')
  const recoveryTimedOut = message.includes('recovery-failed=main-gateway-timeout-recovery')
  const toolLessRecovery = message.includes('recovery-mode=tools-disabled')
  const gatewayHealthTimedOut = message.includes('chat_timeout')
    || message.includes('chat completions timed out before the first event')
    || (message.includes('main gateway health check failed') && message.includes('first event'))

  if (!afterDispatchMeta && !recoveryTimedOut && !toolLessRecovery && !gatewayHealthTimedOut)
    return baseReply

  const locale = typeof navigator !== 'undefined' && typeof navigator.language === 'string'
    ? navigator.language.toLowerCase()
    : 'en'
  const isChineseLocale = locale.startsWith('zh')
  const details: string[] = []

  if (gatewayHealthTimedOut) {
    details.push(isChineseLocale
      ? '主网关的聊天生成接口在首段内容前就卡住了。'
      : 'The main-gateway chat completion endpoint stalled before the first content event.')
  }

  if (afterDispatchMeta) {
    details.push(isChineseLocale
      ? '主网关流已经建立，但模型首段内容一直没有返回。'
      : 'The main-gateway stream was connected, but the model never produced the first content event.')
  }

  if (toolLessRecovery && recoveryTimedOut) {
    details.push(isChineseLocale
      ? '我已切到无工具恢复，但恢复本身也超时了。'
      : 'I retried recovery without optional tools, but that recovery timed out too.')
  }
  else if (recoveryTimedOut) {
    details.push(isChineseLocale
      ? '自动恢复本身也超时了。'
      : 'The automatic recovery timed out too.')
  }

  return details.length > 0
    ? `${baseReply} ${details.join(' ')}`
    : baseReply
}

function resolveStreamFailureFallback(error: unknown): { reply: string, kind: StreamFailureKind } {
  const errorCode = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code ?? '').toLowerCase()
    : ''
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
  if (
    errorCode.includes('alicization-stream-superseded')
    || errorCode.includes('alicization-stream-renderer-unmounted')
    || message.includes('state=duplicate-running')
    || message.includes('state=duplicate-finished')
    || message.includes('duplicate-running')
    || message.includes('duplicate-finished')
  ) {
    return {
      reply: assistantStreamFailureFallbackReply(),
      kind: 'runtime-aborted',
    }
  }
  if (
    errorCode.includes('alicization-stream-start-rejected')
    || message.includes('missing providerid/model')
    || message.includes('missing provider/model')
    || message.includes('state=missing-config')
    || (message.includes('state=start-failed') && message.includes('invalid url'))
  ) {
    return {
      reply: assistantProviderConfigFallbackReply(),
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
      reply: assistantLocalRuntimeUnavailableFallbackReply(),
      kind: 'local-runtime-unavailable',
    }
  }
  if (
    message.includes('chat_timeout')
    || message.includes('chat completions timed out before the first event')
    || (message.includes('main gateway health check failed') && message.includes('first event'))
  ) {
    return {
      reply: buildTimeoutDiagnosticReply(error),
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
      reply: assistantProviderNetworkFallbackReply(),
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
      reply: buildTimeoutDiagnosticReply(error),
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
      reply: assistantUnsupportedToolsFallbackReply(),
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
      reply: assistantProviderAuthFallbackReply(),
      kind: 'provider-auth',
    }
  }
  if (
    errorCode.includes('alicization-stream-start-rejected')
    || message.includes('stream start rejected')
  ) {
    return {
      reply: assistantStreamFailureFallbackReply(),
      kind: 'unknown',
    }
  }
  if (
    message.includes('abort')
    || message.includes('renderer-abort')
    || message.includes('kill-switch')
  ) {
    return {
      reply: assistantStreamFailureFallbackReply(),
      kind: 'runtime-aborted',
    }
  }
  return {
    reply: assistantStreamFailureFallbackReply(),
    kind: 'unknown',
  }
}

function shouldRetryStreamWithoutTools(error: unknown, options: { supportsTools?: boolean, sawProgress: boolean }) {
  if (options.supportsTools === false)
    return false
  if (options.sawProgress)
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

function looksLikeStructuredPayloadText(text: string) {
  const normalized = text.trimStart()
  if (!normalized)
    return false

  const hasThought = /\\?"thought\\?"\s*:/.test(normalized)
  const hasEmotion = /\\?"emotion\\?"\s*:/.test(normalized)
  const hasReply = /\\?"reply\\?"\s*:/.test(normalized)

  if (/^```(?:json)?/i.test(normalized)) {
    return hasThought && hasEmotion && hasReply
  }

  if (normalized.startsWith('{') || normalized.startsWith('"{') || normalized.startsWith('\'{')) {
    return hasThought && hasEmotion && hasReply
  }

  return false
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

function hasStructuredJsonContract(structured: StructuredOutputResult | undefined) {
  if (!structured?.parsePath)
    return false
  return structured.parsePath === 'json' || structured.parsePath === 'repair-json'
}

function createStructuredFallback(replyText: string, emotion: StructuredOutputResult['emotion'] = 'neutral'): StructuredWithContract {
  return {
    thought: '',
    emotion,
    reply: sanitizeStructuredReplySurface(replyText.trim()) || assistantStructuredContractFallbackReply(),
    performance: normalizeAlicizationPerformancePayload(undefined, emotion as AlicizationEmotion),
    userSentimentScore: 0,
    sentimentConfidence: 0.2,
    format: 'fallback-v1',
    parsePath: 'fallback',
    repairTimedOut: false,
    contractFailed: true,
  }
}

function summarizeValidationIssues(issues: StructuredValidationIssue[]) {
  return issues.map(issue => issue.code)
}

function createContractFallbackReply(
  personalityState?: AlicizationPersonalityState | null,
  options?: { toolDenied?: boolean, denialSource?: 'host' | 'system' | 'generic', reminderScheduled?: boolean },
) {
  if (options?.toolDenied && options.denialSource === 'host' && personalityState && personalityState.obedience <= 0.2) {
    return stageChatText('fallbacks.low-obedience-host-denied')
  }
  if (options?.toolDenied && options.denialSource === 'system' && personalityState && personalityState.obedience <= 0.2) {
    return stageChatText('fallbacks.low-obedience-system-denied')
  }
  if (options?.toolDenied && personalityState && personalityState.obedience <= 0.2) {
    return stageChatText('fallbacks.low-obedience-denied')
  }
  if (personalityState && personalityState.liveliness <= 0.2)
    return stageChatText('fallbacks.low-liveliness')
  return assistantStructuredContractFallbackReply()
}

function createContractFallbackEmotion(
  personalityState?: AlicizationPersonalityState | null,
  options?: { toolDenied?: boolean, denialSource?: 'host' | 'system' | 'generic', reminderScheduled?: boolean },
): StructuredOutputResult['emotion'] {
  if (options?.toolDenied && personalityState && personalityState.obedience <= 0.2) {
    if (options.denialSource === 'host' || options.denialSource === 'system')
      return 'tired'
  }
  if (personalityState && personalityState.liveliness <= 0.2)
    return 'tired'
  return 'neutral'
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
    payload: payload.details,
  }).catch(() => {})
}

export const useChatOrchestratorStore = defineStore('chat-orchestrator', () => {
  const llmStore = useLLM()
  const executionEngine = useAlicizationExecutionEngineStore()
  const consciousnessStore = useConsciousnessStore()
  const { activeProvider } = storeToRefs(consciousnessStore)
  const { trackFirstMessage } = useAnalytics()

  const chatSession = useChatSessionStore()
  const chatStream = useChatStreamStore()
  const chatContext = useChatContextStore()
  const { activeSessionId } = storeToRefs(chatSession)
  const { streamingMessage } = storeToRefs(chatStream)

  const sending = ref(false)
  const pendingQueuedSends = ref<QueuedSend[]>([])
  const externalPipelineAborters = new Set<ExternalPipelineAborter>()
  const hooks = createChatHooks()

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
    let turnMindGovernance: AlicizationMindTurnGovernance | null = null
    let turnEmbodiment: AlicizationDialogueEmbodimentEnvelope | null = null
    let turnSpeechTimeline: AlicizationDialogueSpeechTimeline | null = null
    let turnDigitalLife: AlicizationDigitalLifeEnvelope | null = null
    let turnDigitalLifeSpine: AlicizationDigitalLifeSpineDigest | null = null

    const getTurnStructuredRuntimeMeta = () => ({
      embodiment: turnEmbodiment,
      speechTimeline: turnSpeechTimeline,
      digitalLife: turnDigitalLife,
      digitalLifeSpine: turnDigitalLifeSpine,
      governance: turnMindGovernance,
    })

    const ingestTurnStructuredRuntimeMeta = (event: Extract<StreamEvent, { type: 'meta' }>) => {
      turnMindGovernance = event.governance ?? turnMindGovernance
      turnEmbodiment = event.embodiment ?? turnEmbodiment
      turnSpeechTimeline = event.speechTimeline ?? turnSpeechTimeline
      turnDigitalLife = event.digitalLife ?? turnDigitalLife
      turnDigitalLifeSpine = event.digitalLifeSpine ?? turnDigitalLifeSpine
    }

    const setStagedAssistantResolution = (resolution: StagedAssistantResolution) => {
      stagedAssistantResolution = resolution
      finalAssistantDisplayText = resolution.reply
      return resolution
    }

    const stageAssistantFallback = (replyText: string, emotion: StructuredOutputResult['emotion'] = 'neutral', reasoning = '') => {
      const normalizedReply = replyText.trim() || assistantStructuredContractFallbackReply()
      return setStagedAssistantResolution({
        structured: createStructuredFallback(normalizedReply, emotion),
        categorization: {
          speech: normalizedReply,
          reasoning,
        },
        reply: normalizedReply,
      })
    }

    const commitAssistantResolution = async () => {
      if (assistantTextCommitted)
        return finalAssistantDisplayText

      const staged = stagedAssistantResolution
      const finalReply = (
        staged?.reply
        || finalAssistantDisplayText
        || stagedSpeechDraft
        || stringifyAssistantContent(buildingMessage.content)
      ).trim()

      if (!finalReply)
        return ''

      const structured = staged?.structured ?? createStructuredFallback(finalReply, 'neutral')
      const categorization = staged?.categorization ?? {
        speech: finalReply,
        reasoning: '',
      }
      const structuredWithGovernance = mergeStructuredRuntimeMeta(structured, getTurnStructuredRuntimeMeta())

      buildingMessage.categorization = categorization
      buildingMessage.structured = structuredWithGovernance
      buildingMessage.content = finalReply
      buildingMessage.slices = replaceAssistantTextSlices(buildingMessage.slices, finalReply)
      finalAssistantDisplayText = finalReply
      assistantTextCommitted = true

      // NOTICE: Alicization may rewrite structured output after validation/retry, so visible text
      // and token hooks must flush only once from the final committed reply.
      await hooks.emitTokenLiteralHooks(finalReply, streamingMessageContext)
      updateUI()

      return finalReply
    }

    try {
      if (options.origin === 'ui-user' && hasAlicizationBridge()) {
        const directive = parseKillSwitchDirective(sendingMessage)
        if (directive) {
          const bridge = getAlicizationBridge()
          const nextState = directive === 'suspend'
            ? await bridge.suspendKillSwitch({ reason: 'user-command' })
            : await bridge.resumeKillSwitch({ reason: 'user-command' })

          const sessionMessagesForCommand = chatSession.getSessionMessages(sessionId)
          sessionMessagesForCommand.push({ role: 'user', content: sendingMessage, createdAt: sendingCreatedAt, id: nanoid() })

          const reply = directive === 'suspend'
            ? stageChatText('kill-switch.suspended')
            : stageChatText('kill-switch.resumed')

          sessionMessagesForCommand.push({
            role: 'assistant',
            content: reply,
            slices: [{ type: 'text', text: reply }],
            tool_results: [],
            categorization: {
              speech: reply,
              reasoning: '',
            },
            structured: {
              thought: '',
              emotion: nextState.state === 'SUSPENDED' ? 'tired' : 'neutral',
              reply,
              userSentimentScore: 0,
              sentimentConfidenceRaw: 0.8,
              sentimentConfidence: 0.6,
              format: 'fallback-v1',
            },
            createdAt: Date.now(),
            id: nanoid(),
          })

          chatSession.persistSessionMessages(sessionId)
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

      if (origin === 'ui-user') {
        const extractedFacts = extractRuleFacts({ userText: sendingMessage })
        if (extractedFacts.length > 0) {
          void upsertFacts(extractedFacts, 'rule')
            .then(async () => {
              await appendAlicizationAuditLog({
                level: 'notice',
                category: 'alicization.memory',
                action: 'rule-facts-upserted',
                message: 'Extracted rule-based facts from the current user turn and persisted them to memory.',
                details: {
                  sessionId,
                  turnId,
                  factCount: extractedFacts.length,
                },
              })
            })
            .catch(async (error) => {
              await appendAlicizationAuditLog({
                level: 'warning',
                category: 'alicization.memory',
                action: 'rule-facts-upsert-failed',
                message: 'Failed to persist rule-based facts extracted from the current user turn.',
                details: {
                  sessionId,
                  turnId,
                  factCount: extractedFacts.length,
                  reason: errorMessageFrom(error) ?? 'unknown-error',
                },
              })
            })
        }
      }

      const hasVisualAttachment = contentParts.some(part => part.type === 'image_url')
      const inspectionLikeTurn = origin === 'ui-user' && detectInvitedInspectionLikeTurn({
        message: sendingMessage,
        recentMessages: sessionMessagesForSend.slice(0, -1),
      })
      const preferLocalContractRepair = hasVisualAttachment || inspectionLikeTurn || Boolean(turnMindGovernance)
      const strictEpoch1Mode = alicizationEpoch1StrictModeEnabled && hasAlicizationBridge()
      const realtimeIntent = hasAlicizationBridge() && origin === 'ui-user'
        ? detectRealtimeQueryIntent(sendingMessage)
        : detectRealtimeQueryIntent('')
      const alicizationBridge = hasAlicizationBridge() ? getAlicizationBridge() : null
      const runtimeAuthoritativeBridge = Boolean(alicizationBridge?.streamChat)
      const requiresImmediateFileToolCall = origin === 'ui-user' && detectFileSystemToolIntent(sendingMessage)
      const requiresReminderToolCall = origin === 'ui-user' && detectReminderToolIntent(sendingMessage)
      const requiresExecutionToolCall = origin === 'ui-user' && detectExecutionToolIntent(sendingMessage)
      const parsedReminderIntent = requiresReminderToolCall
        ? parseReminderIntentPayload(sendingMessage)
        : null
      let policyLockedReason: StructuredPolicyLock | undefined
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
      const headers = (options.providerConfig?.headers || {}) as Record<string, string>
      const streamWithRuntimeGateway = async (
        messages: Message[],
        streamOptions: StreamOptions,
      ) => {
        const withStreamWatchdog = async (
          execute: (hooks: { touch: () => void }) => Promise<void>,
          options: {
            firstEventTimeoutMs: number
            idleTimeoutMs: number
            onTimeout?: () => void
          },
        ) => {
          let timer: ReturnType<typeof setTimeout> | undefined
          let sawAnyEvent = false
          let settled = false

          const clearTimer = () => {
            if (timer) {
              clearTimeout(timer)
              timer = undefined
            }
          }

          const scheduleTimeout = (timeoutMs: number, reject: (error: unknown) => void) => {
            clearTimer()
            timer = setTimeout(() => {
              if (settled)
                return
              options.onTimeout?.()
              reject(new Error(`Alicization stream timed out after ${timeoutMs}ms (${sawAnyEvent ? 'idle-timeout' : 'first-event-timeout'}).`))
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

              scheduleTimeout(options.firstEventTimeoutMs, rejectOnce)
              void execute({
                touch: () => {
                  sawAnyEvent = true
                  scheduleTimeout(options.idleTimeoutMs, rejectOnce)
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
            timeoutOptions: { firstEventTimeoutMs: number, idleTimeoutMs: number } = {
              firstEventTimeoutMs: runtimeGatewayFirstEventTimeoutMs,
              idleTimeoutMs: runtimeGatewayIdleTimeoutMs,
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
                  providerId: activeProvider.value || '',
                  model: options.model,
                  providerConfig: options.providerConfig ?? {},
                  messages: messagePayload,
                  supportsTools: override.supportsTools ?? streamOptions.supportsTools,
                  waitForTools: override.waitForTools ?? streamOptions.waitForTools,
                }, {
                  abortSignal: streamOptions.abortSignal,
                  onStreamEvent: async (event) => {
                    lastEventType = typeof event?.type === 'string' ? event.type : ''
                    if (event.type === 'meta')
                      sawMeta = true
                    if (event.type === 'text-delta' || event.type === 'tool-call' || event.type === 'tool-result') {
                      sawProgress = true
                      touch()
                    }
                    await streamOptions.onStreamEvent?.(event)
                  },
                })
              }, {
                firstEventTimeoutMs: timeoutOptions.firstEventTimeoutMs,
                idleTimeoutMs: timeoutOptions.idleTimeoutMs,
                onTimeout: () => {
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
                      idleTimeoutMs: timeoutOptions.idleTimeoutMs,
                      sawProgress,
                      sawMeta,
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
                ;(error as Error & { __alicizationSawProgress?: boolean }).__alicizationSawProgress = sawProgress
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
              return
            }
            if (shouldRetryStreamWithoutTools(error, {
              supportsTools: streamOptions.supportsTools,
              sawProgress: sawProgress || sawProgressFromError,
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
                firstEventTimeoutMs: runtimeGatewayRetryFirstEventTimeoutMs,
                idleTimeoutMs: runtimeGatewayRetryIdleTimeoutMs,
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
            onStreamEvent: async (event) => {
              if (event.type === 'text-delta' || event.type === 'tool-call' || event.type === 'tool-result')
                touch()
              await streamOptions.onStreamEvent?.(event)
            },
          })
        }, {
          firstEventTimeoutMs: runtimeGatewayFirstEventTimeoutMs,
          idleTimeoutMs: runtimeGatewayIdleTimeoutMs,
        })
      }

      const categorizer = createStreamingCategorizer(activeProvider.value)
      let streamPosition = 0
      let turnPersonalityState: AlicizationPersonalityState | null = null
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

      const getPreviousAssistantEmbodiment = () => {
        const previousAssistant = [...sessionMessagesForSend]
          .reverse()
          .find(message => message.role === 'assistant' && 'structured' in message && message.structured)
        if (!previousAssistant || !('structured' in previousAssistant) || !previousAssistant.structured)
          return null

        const previousStructured = previousAssistant.structured as StructuredWithContract
        const previousEmbodimentPerformance = previousStructured.embodiment?.performance
        return {
          actionCue: previousEmbodimentPerformance?.actionCue ?? previousStructured.performance?.actionCue ?? null,
          delivery: previousEmbodimentPerformance?.delivery ?? previousStructured.performance?.delivery ?? null,
          emotion: previousStructured.embodiment?.emotion ?? previousStructured.emotion ?? null,
          facialCue: previousEmbodimentPerformance?.facialCue ?? previousStructured.performance?.facialCue ?? null,
          variationToken: previousStructured.embodiment?.variationToken ?? null,
        }
      }

      const formatTurnPersonalityState = () => {
        if (!turnPersonalityState)
          return 'unknown'
        return `obedience=${turnPersonalityState.obedience.toFixed(2)}, liveliness=${turnPersonalityState.liveliness.toFixed(2)}, sensibility=${turnPersonalityState.sensibility.toFixed(2)}`
      }
      const isLowObedienceDeniedTurn = () =>
        Boolean(turnPersonalityState && turnPersonalityState.obedience <= 0.2 && turnToolEvidence.deniedBySafety)
      const isLowObedienceHostDeniedTurn = () =>
        Boolean(turnPersonalityState && turnPersonalityState.obedience <= 0.2 && turnToolEvidence.denialSource === 'host')

      const runStructuredContractRetry = async (payload: {
        reasoning: string
        reply: string
        fullText: string
        validationIssues: StructuredValidationIssue[]
        attempt: number
      }) => {
        if (shouldAbort())
          return null

        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'alicization.structured',
          action: 'contract-retry-reasoned',
          message: 'Retrying structured contract with explicit mind-state and violation hints.',
          details: {
            attempt: payload.attempt,
            personality: turnPersonalityState
              ? {
                  obedience: turnPersonalityState.obedience,
                  liveliness: turnPersonalityState.liveliness,
                  sensibility: turnPersonalityState.sensibility,
                }
              : null,
            violations: summarizeValidationIssues(payload.validationIssues),
            deniedBySafety: turnToolEvidence.deniedBySafety,
            deniedReason: turnToolEvidence.deniedReason,
            reminderScheduled: turnToolEvidence.reminderScheduled,
          },
        })

        const retryMessages: Message[] = [
          {
            role: 'system',
            content: structuredRetrySystemPrompt,
          },
          {
            role: 'user',
            content: [
              'Rewrite the draft assistant output into strict JSON contract.',
              `User input:\n${sendingMessage}`,
              `Assistant draft:\n${payload.reply || payload.fullText}`,
              turnMindGovernance
                ? `Mind governance snapshot (must preserve exactly):\n${JSON.stringify({
                  turnMode: turnMindGovernance.turnMode,
                  truthState: turnMindGovernance.truthState,
                  answerAct: turnMindGovernance.answerAct,
                  screenReferenceMode: turnMindGovernance.screenReferenceMode,
                  answerIntent: turnMindGovernance.answerIntent,
                  openingMove: turnMindGovernance.openingMove,
                  carriedThread: turnMindGovernance.carriedThread,
                  shouldAskForGrounding: turnMindGovernance.shouldAskForGrounding,
                  shouldAcknowledgeRepair: turnMindGovernance.shouldAcknowledgeRepair,
                  maxSentences: turnMindGovernance.maxSentences,
                  embodiedPresence: turnMindGovernance.embodiedPresence,
                })}`
                : '',
              `Current personality state:\n${formatTurnPersonalityState()}`,
              `Violations to fix:\n${payload.validationIssues.map((issue, index) => `${index + 1}. ${issue.message}`).join('\n')}`,
              isLowObedienceDeniedTurn()
                ? `Mandatory constraint:\n${lowObedienceDeniedRetryDirective}`
                : '',
              isLowObedienceHostDeniedTurn()
                ? lowObedienceHostDeniedRetrySystemOverride
                : '',
              turnToolEvidence.reminderScheduled
                ? `Mandatory constraint:\n${reminderSameTurnRetryDirective}`
                : '',
              payload.reasoning.trim()
                ? `Draft thought:\n${payload.reasoning.trim()}`
                : '',
            ].filter(Boolean).join('\n\n'),
          },
        ]

        const sanitizedRetry = sanitizeForRemoteModel(retryMessages, { timeBudgetMs: 50, chunkSize: 2048 })
        if (sanitizedRetry.blocked) {
          await appendAlicizationAuditLog({
            level: 'critical',
            category: 'structured-output',
            action: 'contract-retry-blocked',
            message: 'Structured contract retry blocked by sanitize gateway.',
            details: {
              reason: sanitizedRetry.reason,
              elapsedMs: sanitizedRetry.elapsedMs,
            },
          })
          return null
        }

        let retryFullText = ''
        try {
          await streamWithRuntimeGateway(sanitizedRetry.messages as Message[], {
            headers,
            supportsTools: false,
            waitForTools: false,
            abortSignal,
            onStreamEvent: async (event: StreamEvent) => {
              if (event.type === 'text-delta')
                retryFullText += event.text
              if (event.type === 'error')
                throw event.error ?? new Error('Structured contract retry stream error')
            },
          })
        }
        catch (error) {
          if (isAlicizationAbortError(error) || abortSignal.aborted)
            throw error

          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'structured-output',
            action: 'contract-retry-failed',
            message: 'Structured contract retry request failed.',
            details: {
              reason: error instanceof Error ? error.message : String(error),
            },
          })
          return null
        }

        const retriedStructured = normalizeStructuredOutput({
          fullText: retryFullText,
          thought: payload.reasoning,
          reply: payload.reply,
          previousEmotion: getPreviousAssistantEmotion(),
        })

        if (hasStructuredJsonContract(retriedStructured)) {
          return retriedStructured
        }

        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'structured-output',
          action: 'contract-retry-unresolved',
          message: 'Structured contract retry still did not produce JSON output.',
          details: {
            parsePath: retriedStructured.parsePath,
          },
        })

        return null
      }

      const buildStructuredOutputWithGuard = async (payload: {
        fullText: string
        reasoning: string
        reply: string
      }): Promise<StructuredWithContract> => {
        let candidate = normalizeStructuredOutput({
          fullText: payload.fullText,
          thought: payload.reasoning,
          reply: payload.reply,
          previousEmotion: getPreviousAssistantEmotion(),
        })

        let validationIssues = hasStructuredJsonContract(candidate)
          ? validateStructuredContract(candidate, turnPersonalityState, {
              toolDenied: turnToolEvidence.deniedBySafety,
              denialSource: turnToolEvidence.denialSource,
              reminderScheduled: turnToolEvidence.reminderScheduled,
              reminderMessage: turnToolEvidence.reminderMessage,
            })
          : [
              {
                code: 'json-contract-missing',
                message: 'Structured output is not valid JSON contract and requires retry.',
              } satisfies StructuredValidationIssue,
            ]

        if (hasStructuredJsonContract(candidate) && validationIssues.length === 0)
          return candidate

        if (preferLocalContractRepair) {
          const locallyRepaired = repairStructuredContractLocally({
            structured: candidate,
            validationIssues,
            personalityState: turnPersonalityState,
            preferGroundedEvidence: inspectionLikeTurn || hasVisualAttachment,
            fallbackReply: payload.reply,
            governance: turnMindGovernance,
            userText: sendingMessage,
            translate: stageChatText,
          })
          if (locallyRepaired) {
            const localRepairIssues = validateStructuredContract(locallyRepaired, turnPersonalityState, {
              toolDenied: turnToolEvidence.deniedBySafety,
              denialSource: turnToolEvidence.denialSource,
              reminderScheduled: turnToolEvidence.reminderScheduled,
              reminderMessage: turnToolEvidence.reminderMessage,
            })
            if (hasStructuredJsonContract(locallyRepaired) && localRepairIssues.length === 0) {
              await appendAlicizationAuditLog({
                level: 'notice',
                category: 'alicization.structured',
                action: 'contract-local-repair',
                message: 'Locally repaired a simple mind-contract miss without remote retry.',
                details: {
                  parsePath: candidate.parsePath ?? 'fallback',
                  issues: summarizeValidationIssues(validationIssues),
                  inspectionLikeTurn,
                  hasVisualAttachment,
                },
              })
              return locallyRepaired
            }
          }
        }

        const candidateReply = candidate.reply?.trim() ?? ''
        const replyLooksUsable = Boolean(
          candidateReply
          && !looksLikeStructuredPayloadText(candidateReply),
        )
        if (runtimeAuthoritativeBridge && replyLooksUsable) {
          const sanitizedCandidateReply = sanitizeStructuredReplySurface(candidateReply) || candidateReply
          const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
            candidateEmotion: candidate.emotion,
            candidatePerformance: candidate.performance,
            governance: turnMindGovernance,
            previous: getPreviousAssistantEmbodiment(),
            reply: sanitizedCandidateReply,
            thought: candidate.thought.trim() || payload.reasoning.trim(),
            turnId,
          })
          const bestEffort: StructuredWithContract = {
            ...candidate,
            thought: candidate.thought.trim() || payload.reasoning.trim(),
            emotion: resolvedEmbodiment.emotion,
            reply: sanitizedCandidateReply,
            performance: resolvedEmbodiment.performance,
            embodiment: resolvedEmbodiment,
            speechTimeline: buildAlicizationDialogueSpeechTimeline({
              reply: sanitizedCandidateReply,
              candidateEmotion: resolvedEmbodiment.emotion,
              candidatePerformance: resolvedEmbodiment.performance,
              embodiment: resolvedEmbodiment,
            }),
            format: 'mind-turn-v1',
            contractFailed: false,
          }
          if (!hasStructuredJsonContract(candidate) || validationIssues.length > 0) {
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'alicization.structured',
              action: 'runtime-authoritative-best-effort',
              message: 'Renderer preserved runtime-governed structured candidate instead of enforcing local fallback.',
              details: {
                parsePath: candidate.parsePath ?? 'fallback',
                validationIssues: summarizeValidationIssues(validationIssues),
                embodimentVariationToken: resolvedEmbodiment.variationToken,
                resolvedEmotion: resolvedEmbodiment.emotion,
                resolvedDelivery: resolvedEmbodiment.performance.delivery,
                resolvedEmphasis: resolvedEmbodiment.performance.emphasis,
                resolvedFacialCue: resolvedEmbodiment.performance.facialCue ?? null,
                resolvedActionCue: resolvedEmbodiment.performance.actionCue ?? null,
              },
            })
          }
          return bestEffort
        }

        for (let attempt = 1; attempt <= 2; attempt += 1) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'alicization.structured',
            action: 'contract-invalid',
            message: 'Structured output violated contract constraints before finalization.',
            details: {
              attempt,
              parsePath: candidate.parsePath ?? 'fallback',
              emotion: candidate.emotion,
              violations: summarizeValidationIssues(validationIssues),
              deniedBySafety: turnToolEvidence.deniedBySafety,
              deniedReason: turnToolEvidence.deniedReason,
              reminderScheduled: turnToolEvidence.reminderScheduled,
            },
          })

          const retried = await runStructuredContractRetry({
            ...payload,
            validationIssues,
            attempt,
          })
          if (!retried)
            break

          candidate = retried
          validationIssues = hasStructuredJsonContract(candidate)
            ? validateStructuredContract(candidate, turnPersonalityState, {
                toolDenied: turnToolEvidence.deniedBySafety,
                denialSource: turnToolEvidence.denialSource,
                reminderScheduled: turnToolEvidence.reminderScheduled,
                reminderMessage: turnToolEvidence.reminderMessage,
              })
            : [
                {
                  code: 'json-contract-missing',
                  message: 'Structured retry did not produce valid JSON contract.',
                } satisfies StructuredValidationIssue,
              ]

          if (hasStructuredJsonContract(candidate) && validationIssues.length === 0) {
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'structured-output',
              action: 'contract-retry-succeeded',
              message: 'Structured contract retry succeeded with valid mind-consistent JSON output.',
              details: {
                attempt,
                parsePath: candidate.parsePath,
              },
            })
            return candidate
          }
        }

        const fallbackReply = candidateReply && !looksLikeStructuredPayloadText(candidateReply)
          ? candidateReply
          : createContractFallbackReply(turnPersonalityState, {
              toolDenied: turnToolEvidence.deniedBySafety,
              denialSource: turnToolEvidence.denialSource,
              reminderScheduled: turnToolEvidence.reminderScheduled,
            })
        const fallback = createStructuredFallback(fallbackReply, createContractFallbackEmotion(turnPersonalityState, {
          toolDenied: turnToolEvidence.deniedBySafety,
          denialSource: turnToolEvidence.denialSource,
          reminderScheduled: turnToolEvidence.reminderScheduled,
        }))
        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'structured-output',
          action: 'contract-fallback',
          message: 'Structured contract failed after retry and switched to fallback-v1.',
          details: {
            parsePath: candidate.parsePath,
            emotion: candidate.emotion,
            violations: summarizeValidationIssues(validationIssues),
          },
        })
        return fallback
      }

      const finalizeGovernedStructuredOutput = async (
        structured: StructuredWithContract,
        fallbackReply?: string,
      ): Promise<StructuredWithContract> => {
        const governedSurface = enforceGovernedMindTurn({
          structured,
          governance: turnMindGovernance,
          personalityState: turnPersonalityState,
          preferGroundedEvidence: inspectionLikeTurn || hasVisualAttachment,
          fallbackReply,
          userText: sendingMessage,
          translate: stageChatText,
        })
        const governed = mergeStructuredRuntimeMeta({
          ...structured,
          ...governedSurface,
        }, getTurnStructuredRuntimeMeta())

        if (
          turnMindGovernance
          && (
            governedSurface.format !== structured.format
            || governedSurface.thought !== structured.thought
            || governedSurface.reply !== structured.reply
            || governedSurface.emotion !== structured.emotion
          )
        ) {
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'alicization.structured',
            action: 'mind-turn-governed',
            message: 'Mind governance took over the final assistant structured surface before persistence.',
            details: {
              sessionId,
              turnId,
              previousFormat: structured.format ?? 'unknown',
              nextFormat: governedSurface.format,
              turnMode: turnMindGovernance.turnMode,
              repairState: turnMindGovernance.repairState,
              changedThought: governedSurface.thought !== structured.thought,
              changedReply: governedSurface.reply !== structured.reply,
              changedEmotion: governedSurface.emotion !== structured.emotion,
            },
          })
        }

        return governed
      }

      const applyAssistantResult = async (payload: {
        fullText: string
        reasoning: string
        reply: string
        enforceContract?: boolean
        policyLocked?: StructuredPolicyLock
      }) => {
        const nonContractReply = payload.reply.trim() || createContractFallbackReply(turnPersonalityState, {
          toolDenied: turnToolEvidence.deniedBySafety,
          denialSource: turnToolEvidence.denialSource,
          reminderScheduled: turnToolEvidence.reminderScheduled,
        })
        const structured = payload.enforceContract === false
          ? createStructuredFallback(nonContractReply, createContractFallbackEmotion(turnPersonalityState, {
              toolDenied: turnToolEvidence.deniedBySafety,
              denialSource: turnToolEvidence.denialSource,
              reminderScheduled: turnToolEvidence.reminderScheduled,
            }))
          : await buildStructuredOutputWithGuard(payload)
        if (payload.policyLocked) {
          structured.policyLocked = payload.policyLocked
        }
        const governedStructured = await finalizeGovernedStructuredOutput(structured, nonContractReply)
        const finalReply = governedStructured.reply.trim() || payload.reply

        return setStagedAssistantResolution({
          categorization: {
            speech: finalReply,
            reasoning: payload.reasoning,
          },
          structured: governedStructured,
          reply: finalReply,
        })
      }

      const persistBuiltAssistantMessage = () => {
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
          toolCalls: sessionMessagesForSend.filter(msg => msg.role === 'tool') as ToolMessage[],
        }, streamingMessageContext)
      }

      const finalizeAssistantTurn = async () => {
        const assistantOutputText = await commitAssistantResolution()
        persistBuiltAssistantMessage()
        assistantOutputCommitted = true
        if (hasAlicizationBridge()) {
          await getAlicizationBridge().appendConversationTurn({
            turnId,
            sessionId,
            userText: sendingMessage,
            assistantText: assistantOutputText,
            structured: buildingMessage.structured ? { ...buildingMessage.structured } : undefined,
            governance: turnMindGovernance,
            createdAt: Date.now(),
          }).catch(() => {})
        }
        await emitAssistantTurnHooks(assistantOutputText)

        if (isForegroundSession()) {
          streamingMessage.value = createEmptyStreamingMessage()
        }

        return assistantOutputText
      }

      const applyAssistantTextFromModelOutput = async (fullText: string) => {
        if (isStaleGeneration())
          return

        const finalCategorization = categorizeResponse(fullText, activeProvider.value)
        const sanitizedOutput = sanitizeAssistantOutputForDisplay(finalCategorization.speech, {
          realtimeIntent: realtimeIntent.needsRealtime,
          verifiedToolResult: turnToolEvidence.verifiedToolResult,
        })
        const emptyAfterSanitize = !sanitizedOutput.cleanText.trim()
        const realtimeFallbackApplied = realtimeIntent.needsRealtime
          && !turnToolEvidence.verifiedToolResult
          && !policyLockedReason
        const leakFallbackApplied = sanitizedOutput.leakDetected && emptyAfterSanitize
        const emptyOutputFallbackApplied = !realtimeFallbackApplied && !leakFallbackApplied && emptyAfterSanitize
        const sanitizeFallbackReply = policyLockedReason
          ? assistantEpoch1StrictFallbackReply()
          : assistantLeakFallbackReply()
        let finalSpeech = sanitizedOutput.cleanText
        if (realtimeFallbackApplied) {
          finalSpeech = assistantRealtimeUnavailableReply()
        }
        else if (leakFallbackApplied || emptyOutputFallbackApplied) {
          finalSpeech = sanitizeFallbackReply
        }

        if (sanitizedOutput.fabricationDetected) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'output-guard',
            action: 'output-fabrication-sanitized',
            message: 'Assistant output contained fabricated execution fragments and was sanitized.',
            details: {
              removedCount: sanitizedOutput.fabricationRemovedCount,
              realtimeIntent: realtimeIntent.needsRealtime,
              verifiedToolResult: turnToolEvidence.verifiedToolResult,
            },
          })
        }

        if (sanitizedOutput.leakDetected) {
          await appendAlicizationAuditLog({
            level: leakFallbackApplied ? 'warning' : 'notice',
            category: 'output-guard',
            action: leakFallbackApplied ? 'sanitize-fallback' : 'sanitize-leak',
            message: leakFallbackApplied
              ? 'Assistant output leak detected and fallback reply applied.'
              : 'Assistant output leak detected and sanitized before display.',
            details: {
              removedCount: sanitizedOutput.removedCount,
              redactedSecrets: sanitizedOutput.redactedSecrets,
              fallbackApplied: leakFallbackApplied,
            },
          })
        }

        if (emptyOutputFallbackApplied) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'output-guard',
            action: 'sanitize-empty-fallback',
            message: 'Assistant output became empty after sanitization; fallback reply applied.',
            details: {
              removedCount: sanitizedOutput.removedCount,
              fabricationDetected: sanitizedOutput.fabricationDetected,
            },
          })
        }

        if (realtimeFallbackApplied) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'output-guard',
            action: 'realtime-unverified-fallback',
            message: 'Realtime query did not yield verified tool result; fallback reply applied.',
            details: {
              categories: realtimeIntent.categories,
              toolCallCount: turnToolEvidence.toolCallCount,
              toolResultCount: turnToolEvidence.toolResultCount,
              verifiedToolResult: turnToolEvidence.verifiedToolResult,
            },
          })
        }

        const staged = await applyAssistantResult({
          fullText,
          reasoning: finalCategorization.reasoning,
          reply: finalSpeech,
          policyLocked: policyLockedReason,
        })

        if (staged.structured.repairTimedOut) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'structured-output',
            action: 'repair-timeout-fallback',
            message: 'Structured output repair exceeded budget and fell back safely.',
            details: {
              parsePath: staged.structured.parsePath,
            },
          })
        }
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

            if (looksLikeStructuredPayloadText(trimmedPrelude)) {
              streamSpeechMode = 'structured-json'
              streamSpeechPrelude = ''
              return
            }

            const isPotentialStructuredPrefix
              = trimmedPrelude.startsWith('{')
                || trimmedPrelude.startsWith('"')
                || trimmedPrelude.startsWith('\'')
                || trimmedPrelude.startsWith('```')

            if (isPotentialStructuredPrefix && trimmedPrelude.length < 512)
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

            if (ctx.data.type === 'tool-call-result') {
              buildingMessage.tool_results.push(ctx.data)
              updateUI()
            }
          },
        ],
      })

      let newMessages = sessionMessagesForSend.map((msg) => {
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

          if (composed.contractRequiresMindSpine) {
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'alicization.prompt',
              action: 'contract-mind-spine-required',
              message: 'Runtime structured contract requires obligation/truth/focus/move/tone control markers.',
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

          if (budgeted.report.runtimeContractAnchorRecovered) {
            await appendAlicizationAuditLog({
              level: 'warning',
              category: 'alicization.prompt',
              action: 'runtime-contract-anchor-recovered',
              message: 'Runtime structured contract anchor was missing and recovered by prompt budget guard.',
            })
          }

          const runtimeSystemMessage = budgeted.messages.find((message, index) => index !== 0 && message.role === 'system')
          const runtimeContractAnchorPreserved = typeof runtimeSystemMessage?.content === 'string'
            ? runtimeSystemMessage.content.includes(runtimeContractAnchorHeader)
            : JSON.stringify(runtimeSystemMessage?.content ?? '').includes(runtimeContractAnchorHeader)

          await appendAlicizationAuditLog({
            level: runtimeContractAnchorPreserved ? 'notice' : 'warning',
            category: 'alicization.prompt',
            action: runtimeContractAnchorPreserved
              ? 'runtime-contract-anchor-preserved'
              : 'runtime-contract-anchor-missing',
            message: runtimeContractAnchorPreserved
              ? 'Runtime structured contract anchor is preserved after prompt budgeting.'
              : 'Runtime structured contract anchor is missing after prompt budgeting.',
          })

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
      else if (Object.keys(contextsSnapshot).length > 0) {
        const system = newMessages.slice(0, 1)
        const afterSystem = newMessages.slice(1, newMessages.length)

        newMessages = [
          ...system,
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: ''
                  + 'These are the contextual information retrieved or on-demand updated from other modules, you may use them as context for chat, or reference of the next action, tool call, etc.:\n'
                  + `${Object.entries(contextsSnapshot).map(([key, value]) => `Module ${key}: ${JSON.stringify(value)}`).join('\n')}\n`,
              },
            ],
          },
          ...afterSystem,
        ]
      }

      streamingMessageContext.composedMessage = newMessages as Message[]

      await hooks.emitAfterMessageComposedHooks(sendingMessage, streamingMessageContext)
      await hooks.emitBeforeSendHooks(sendingMessage, streamingMessageContext)

      if (shouldAbort())
        return

      if (origin === 'ui-user' && hasAlicizationBridge() && strictEpoch1Mode && realtimeIntent.needsRealtime) {
        policyLockedReason = 'epoch1-strict-realtime'
        const strictRealtimeContext = [
          strictRealtimeRefusalSystemPrompt,
          realtimeIntent.categories.length > 0
            ? `Detected intent categories: ${realtimeIntent.categories.join(', ')}.`
            : '',
        ].filter(Boolean).join('\n')
        const refusalMessages = insertSystemMessageBeforeLatestUser(newMessages as Message[], strictRealtimeContext)
        streamingMessageContext.composedMessage = refusalMessages

        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'realtime-policy',
          action: 'epoch1-strict-realtime-blocked',
          message: 'Blocked realtime execution in strict Epoch1 mode and switched to personality refusal path.',
          details: {
            sessionId,
            turnId,
            categories: realtimeIntent.categories,
          },
        })

        try {
          await streamWithRuntimeGateway(refusalMessages, {
            headers,
            supportsTools: false,
            waitForTools: false,
            tools: [],
            abortSignal,
            onStreamEvent: async (event: StreamEvent) => {
              switch (event.type) {
                case 'text-delta':
                  await parser.consume(event.text)
                  break
                case 'tool-call':
                case 'tool-result':
                case 'finish':
                  break
                case 'error':
                  throw event.error ?? new Error('Strict refusal stream error')
              }
            },
          })

          await parser.end()
        }
        catch (error) {
          if (isAlicizationAbortError(error) || abortSignal.aborted) {
            throw error
          }

          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'realtime-policy',
            action: 'epoch1-strict-realtime-refusal-failed',
            message: 'Strict realtime refusal LLM path failed, applied fixed fallback reply.',
            details: {
              sessionId,
              turnId,
              reason: error instanceof Error ? error.message : String(error),
            },
          })

          const fallbackReply = assistantEpoch1StrictFallbackReply()
          await applyAssistantResult({
            fullText: fallbackReply,
            reasoning: '',
            reply: fallbackReply,
            enforceContract: false,
            policyLocked: policyLockedReason,
          })
        }

        await finalizeAssistantTurn()
        return
      }

      if (origin === 'ui-user' && hasAlicizationBridge()) {
        const realtimeExecution = await executionEngine.executeRealtimeQueryTurn({
          origin,
          message: sendingMessage,
          abortSignal,
          onStatus: (status) => {
            buildingMessage.slices.push({
              type: 'execution-status',
              phase: status.phase,
              label: status.label,
              source: status.source,
              category: status.category,
            })
            updateUI()
          },
          onAudit: async (entry) => {
            await appendAlicizationAuditLog({
              level: entry.level,
              category: entry.category,
              action: entry.action,
              message: entry.message,
              details: entry.details,
            })
          },
        })

        if (realtimeExecution.handled) {
          if (abortSignal.aborted) {
            throw abortSignal.reason ?? new DOMException('Aborted', 'AbortError')
          }

          const reply = realtimeExecution.reply?.trim() || assistantRealtimeUnavailableReply()
          await applyAssistantResult({
            fullText: reply,
            reasoning: '',
            reply,
            enforceContract: false,
          })
          await finalizeAssistantTurn()
          return
        }
      }

      const trackToolDeniedReason = (rawReason: string) => {
        turnToolEvidence.deniedBySafety = true
        turnToolEvidence.deniedReason = rawReason
        turnToolEvidence.denialSource = classifyDeniedSource(rawReason)
      }

      await streamWithRuntimeGateway(newMessages as Message[], {
        headers,
        tools: options.tools,
        supportsTools: true,
        abortSignal,
        // NOTICE: xsai stream may emit `finish` before tool steps continue, so keep waiting until
        // the final non-tool finish to avoid ending the chat turn with no assistant reply.
        waitForTools: true,
        onStreamEvent: async (event: StreamEvent) => {
          switch (event.type) {
            case 'meta':
              ingestTurnStructuredRuntimeMeta(event)
              if (event.embodiment || event.speechTimeline || event.digitalLife || event.digitalLifeSpine) {
                await hooks.emitEmbodimentMetaHooks({
                  governance: event.governance ?? turnMindGovernance,
                  embodiment: event.embodiment ?? null,
                  speechTimeline: event.speechTimeline ?? null,
                  digitalLife: event.digitalLife ?? null,
                  digitalLifeSpine: event.digitalLifeSpine ?? null,
                }, streamingMessageContext)
              }
              break
            case 'tool-call':
              turnToolEvidence.toolCallCount += 1
              {
                const observedToolName = normalizeObservedToolName(event)
                if (event.toolCallId && observedToolName)
                  observedToolNamesById.set(event.toolCallId, observedToolName)
                if (executorToolNames.has(observedToolName)) {
                  turnToolEvidence.executorToolCallCount += 1
                  if (event.toolCallId)
                    turnToolEvidence.executorToolCallIds.add(event.toolCallId)
                }
              }
              if (normalizeObservedToolName(event) === 'set_reminder' && event.toolCallId)
                turnToolEvidence.reminderToolCallIds.add(event.toolCallId)
              toolCallQueue.enqueue({
                type: 'tool-call',
                toolCall: event,
              })

              break
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
              if (turnToolEvidence.latestExecutorResult && event.text.length > 0)
                turnToolEvidence.sawTextAfterExecutorResult = true
              await parser.consume(event.text)
              break
            case 'finish':
              break
            case 'error':
              throw event.error ?? new Error('Stream error')
          }
        },
      })

      await parser.end()

      const shouldForceFileToolRetry = requiresImmediateFileToolCall
        && turnToolEvidence.toolCallCount === 0
        && !policyLockedReason
        && !abortSignal.aborted
        && !shouldAbort()

      const shouldForceReminderToolRetry = requiresReminderToolCall
        && turnToolEvidence.reminderToolCallIds.size === 0
        && !policyLockedReason
        && !abortSignal.aborted
        && !shouldAbort()

      const shouldForceExecutionToolRetry = requiresExecutionToolCall
        && turnToolEvidence.executorToolCallCount === 0
        && !policyLockedReason
        && !abortSignal.aborted
        && !shouldAbort()

      if (shouldForceFileToolRetry || shouldForceReminderToolRetry || shouldForceExecutionToolRetry) {
        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.intent-action',
          action: 'cross-validation-failed',
          message: 'Detected intent-action mismatch before finalization; forcing tool-capable retry.',
          details: {
            sessionId,
            turnId,
            toolCallCount: turnToolEvidence.toolCallCount,
            executorToolCallCount: turnToolEvidence.executorToolCallCount,
            reminderToolCallCount: turnToolEvidence.reminderToolCallIds.size,
            requiresImmediateFileToolCall,
            requiresReminderToolCall,
            requiresExecutionToolCall,
          },
        })

        const forcedToolDirectives = [
          shouldForceFileToolRetry ? noToolCallCriticalRetryDirective : '',
          shouldForceReminderToolRetry ? reminderToolCallCriticalRetryDirective : '',
          shouldForceExecutionToolRetry ? executionToolCallCriticalRetryDirective : '',
        ].filter(Boolean).join('\n')
        const forcedRetryMessages = insertSystemMessageBeforeLatestUser(newMessages as Message[], forcedToolDirectives)
        const sanitizedRetry = sanitizeForRemoteModel(forcedRetryMessages, { timeBudgetMs: 50, chunkSize: 2048 })
        if (!sanitizedRetry.blocked) {
          let forcedRetryFullText = ''
          await streamWithRuntimeGateway(sanitizedRetry.messages as Message[], {
            headers,
            tools: options.tools,
            supportsTools: true,
            waitForTools: true,
            abortSignal,
            onStreamEvent: async (event: StreamEvent) => {
              switch (event.type) {
                case 'tool-call':
                  turnToolEvidence.toolCallCount += 1
                  {
                    const observedToolName = normalizeObservedToolName(event)
                    if (event.toolCallId && observedToolName)
                      observedToolNamesById.set(event.toolCallId, observedToolName)
                    if (executorToolNames.has(observedToolName)) {
                      turnToolEvidence.executorToolCallCount += 1
                      if (event.toolCallId)
                        turnToolEvidence.executorToolCallIds.add(event.toolCallId)
                    }
                  }
                  if (normalizeObservedToolName(event) === 'set_reminder' && event.toolCallId)
                    turnToolEvidence.reminderToolCallIds.add(event.toolCallId)
                  toolCallQueue.enqueue({
                    type: 'tool-call',
                    toolCall: event,
                  })
                  break
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
                    if (deniedReason)
                      trackToolDeniedReason(deniedReason)
                  }
                  toolCallQueue.enqueue({
                    type: 'tool-call-result',
                    id: event.toolCallId,
                    result: event.result,
                  })
                  break
                case 'text-delta':
                  if (turnToolEvidence.latestExecutorResult && event.text.length > 0)
                    turnToolEvidence.sawTextAfterExecutorResult = true
                  forcedRetryFullText += event.text
                  break
                case 'finish':
                  break
                case 'error':
                  throw event.error ?? new Error('Forced tool retry stream error')
              }
            },
          })

          if (forcedRetryFullText.trim()) {
            await applyAssistantTextFromModelOutput(forcedRetryFullText)
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'alicization.intent-action',
              action: 'contract-retry-forced-tool',
              message: 'Forced tool-capable retry produced final assistant output.',
              details: {
                sessionId,
                turnId,
                retryToolCallCount: turnToolEvidence.toolCallCount,
                retryExecutorToolCallCount: turnToolEvidence.executorToolCallCount,
                retryReminderToolCallCount: turnToolEvidence.reminderToolCallIds.size,
                reminderScheduled: turnToolEvidence.reminderScheduled,
              },
            })
          }
          else {
            await appendAlicizationAuditLog({
              level: 'warning',
              category: 'alicization.intent-action',
              action: 'contract-retry-forced-tool-empty',
              message: 'Forced tool retry finished without textual output.',
              details: {
                sessionId,
                turnId,
              },
            })
          }
        }
        else {
          await appendAlicizationAuditLog({
            level: 'critical',
            category: 'alicization.intent-action',
            action: 'contract-retry-forced-tool-blocked',
            message: 'Forced tool retry was blocked by sanitize gateway.',
            details: {
              reason: sanitizedRetry.reason,
              requiresImmediateFileToolCall,
              requiresReminderToolCall,
              requiresExecutionToolCall,
            },
          })
        }
      }

      const shouldForceExecutionResultPayoffRetry = requiresExecutionToolCall
        && turnToolEvidence.latestExecutorResult !== null
        && !turnToolEvidence.sawTextAfterExecutorResult
        && !policyLockedReason
        && !abortSignal.aborted
        && !shouldAbort()

      if (shouldForceExecutionResultPayoffRetry && turnToolEvidence.latestExecutorResult) {
        const executorResultDirective = buildExecutorResultPayoffRetryDirective(turnToolEvidence.latestExecutorResult)
        const payoffRetryMessages = insertSystemMessageBeforeLatestUser(newMessages as Message[], executorResultDirective)
        const sanitizedPayoffRetry = sanitizeForRemoteModel(payoffRetryMessages, { timeBudgetMs: 50, chunkSize: 2048 })

        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.intent-action',
          action: 'executor-result-payoff-missing',
          message: 'Executor tool finished without a post-result user-facing answer; forcing a payoff retry without rerunning tools.',
          details: {
            sessionId,
            turnId,
            executorSummary: turnToolEvidence.latestExecutorResult.summary,
            executorStatus: turnToolEvidence.latestExecutorResult.status,
            executorToolName: turnToolEvidence.latestExecutorResult.toolName,
          },
        })

        if (!sanitizedPayoffRetry.blocked) {
          let payoffRetryFullText = ''
          try {
            await streamWithRuntimeGateway(sanitizedPayoffRetry.messages as Message[], {
              headers,
              tools: options.tools,
              supportsTools: false,
              waitForTools: false,
              abortSignal,
              onStreamEvent: async (event: StreamEvent) => {
                switch (event.type) {
                  case 'text-delta':
                    if (event.text.length > 0)
                      turnToolEvidence.sawTextAfterExecutorResult = true
                    payoffRetryFullText += event.text
                    break
                  case 'finish':
                    break
                  case 'error':
                    throw event.error ?? new Error('Executor payoff retry stream error')
                  default:
                    break
                }
              },
            })
          }
          catch (error) {
            await appendAlicizationAuditLog({
              level: 'warning',
              category: 'alicization.intent-action',
              action: 'executor-result-payoff-retry-failed',
              message: 'Executor payoff retry failed; falling back to the settled executor summary.',
              details: {
                sessionId,
                turnId,
                reason: error instanceof Error ? error.message : String(error),
              },
            })
          }

          if (payoffRetryFullText.trim()) {
            await applyAssistantTextFromModelOutput(payoffRetryFullText)
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'alicization.intent-action',
              action: 'executor-result-payoff-retry-completed',
              message: 'Executor payoff retry produced a grounded final answer without rerunning the tool.',
              details: {
                sessionId,
                turnId,
                executorToolName: turnToolEvidence.latestExecutorResult.toolName,
                executorStatus: turnToolEvidence.latestExecutorResult.status,
              },
            })
          }
          else {
            const fallbackReply = buildExecutorResultFallbackReply(turnToolEvidence.latestExecutorResult)
            if (fallbackReply) {
              stageAssistantFallback(
                fallbackReply,
                turnToolEvidence.latestExecutorResult.status === 'failed'
                || turnToolEvidence.latestExecutorResult.status === 'blocked'
                || turnToolEvidence.latestExecutorResult.status === 'cancelled'
                  ? 'concerned'
                  : 'neutral',
              )
            }
            await appendAlicizationAuditLog({
              level: 'warning',
              category: 'alicization.intent-action',
              action: 'executor-result-payoff-fallback',
              message: 'Executor payoff retry ended without text; reused the settled executor summary as the safe final answer.',
              details: {
                sessionId,
                turnId,
                fallbackApplied: Boolean(fallbackReply),
                executorSummary: turnToolEvidence.latestExecutorResult.summary,
              },
            })
          }
        }
        else {
          const fallbackReply = buildExecutorResultFallbackReply(turnToolEvidence.latestExecutorResult)
          if (fallbackReply)
            stageAssistantFallback(fallbackReply)
          await appendAlicizationAuditLog({
            level: 'critical',
            category: 'alicization.intent-action',
            action: 'executor-result-payoff-retry-blocked',
            message: 'Executor payoff retry was blocked by sanitize gateway; reused the settled executor summary when available.',
            details: {
              sessionId,
              turnId,
              fallbackApplied: Boolean(fallbackReply),
              reason: sanitizedPayoffRetry.reason,
            },
          })
        }
      }

      let reminderScheduledByFallback = false
      if (requiresReminderToolCall && !turnToolEvidence.reminderScheduled) {
        const reminderScheduleBridge = hasAlicizationBridge() ? getAlicizationBridge().reminderSchedule : undefined
        if (reminderScheduleBridge && parsedReminderIntent) {
          try {
            const scheduledResult = await reminderScheduleBridge({
              minutes: parsedReminderIntent.minutes,
              message: parsedReminderIntent.message,
              sourceTurnId: turnId,
            })
            const reminderPayload = extractScheduledReminderPayload(scheduledResult)
            if (reminderPayload.scheduled) {
              turnToolEvidence.reminderScheduled = true
              turnToolEvidence.reminderMessage = reminderPayload.message ?? parsedReminderIntent.message
              reminderScheduledByFallback = true
              await appendAlicizationAuditLog({
                level: 'notice',
                category: 'alicization.intent-action',
                action: 'reminder-manual-schedule-fallback',
                message: 'Reminder scheduling fallback created a persisted reminder task.',
                details: {
                  sessionId,
                  turnId,
                  minutes: parsedReminderIntent.minutes,
                  message: parsedReminderIntent.message,
                },
              })
            }
            else {
              await appendAlicizationAuditLog({
                level: 'warning',
                category: 'alicization.intent-action',
                action: 'reminder-manual-schedule-fallback-failed',
                message: 'Reminder scheduling fallback returned a non-scheduled result.',
                details: {
                  sessionId,
                  turnId,
                  result: scheduledResult,
                },
              })
            }
          }
          catch (error) {
            await appendAlicizationAuditLog({
              level: 'warning',
              category: 'alicization.intent-action',
              action: 'reminder-manual-schedule-fallback-error',
              message: 'Reminder scheduling fallback failed with an exception.',
              details: {
                sessionId,
                turnId,
                reason: error instanceof Error ? error.message : String(error),
              },
            })
          }
        }
        else if (!parsedReminderIntent) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'alicization.intent-action',
            action: 'reminder-manual-schedule-parse-failed',
            message: 'Reminder intent detected but fallback parser could not derive minutes/message.',
            details: {
              sessionId,
              turnId,
              inputPreview: sendingMessage.slice(0, 160),
            },
          })
        }
      }

      if (requiresReminderToolCall && !turnToolEvidence.reminderScheduled) {
        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.intent-action',
          action: 'reminder-schedule-missing',
          message: 'Reminder intent detected but no successful set_reminder result observed.',
          details: {
            sessionId,
            turnId,
            reminderToolCallCount: turnToolEvidence.reminderToolCallIds.size,
          },
        })

        const reminderFailureReply = stageChatText('fallbacks.reminder-schedule-failed')
        stageAssistantFallback(reminderFailureReply, 'concerned')
        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.intent-action',
          action: 'reminder-schedule-safe-reply',
          message: 'Replaced draft reply with safe reminder failure response because no set_reminder success was observed.',
          details: {
            sessionId,
            turnId,
          },
        })
      }
      else if (requiresReminderToolCall && reminderScheduledByFallback) {
        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'alicization.intent-action',
          action: 'reminder-schedule-kept-llm-reply',
          message: 'Reminder fallback scheduling succeeded; keeping model-generated confirmation text without post-hoc replacement.',
          details: {
            sessionId,
            turnId,
          },
        })
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
        const fallback = resolveStreamFailureFallback(error)
        const fallbackReply = fallback.reply
        stageAssistantFallback(fallbackReply, 'concerned')
        const assistantOutputText = await commitAssistantResolution()
        if (!isStaleGeneration() && buildingMessage.slices.length > 0) {
          sessionMessagesForSend.push(toRaw(buildingMessage))
          chatSession.persistSessionMessages(sessionId)
        }
        assistantOutputCommitted = true
        if (isForegroundSession()) {
          streamingMessage.value = createEmptyStreamingMessage()
        }

        if (hasAlicizationBridge()) {
          await getAlicizationBridge().appendConversationTurn({
            turnId,
            sessionId,
            userText: sendingMessage,
            assistantText: assistantOutputText,
            structured: buildingMessage.structured ? { ...buildingMessage.structured } : undefined,
            governance: turnMindGovernance,
            createdAt: Date.now(),
          }).catch(() => {})
        }

        await hooks.emitStreamEndHooks(streamingMessageContext)
        await hooks.emitAssistantResponseEndHooks(assistantOutputText, streamingMessageContext)
        await hooks.emitAfterSendHooks(sendingMessage, streamingMessageContext)
        await hooks.emitAssistantMessageHooks({ ...buildingMessage }, assistantOutputText, streamingMessageContext)
        await hooks.emitChatTurnCompleteHooks({
          output: { ...buildingMessage },
          outputText: assistantOutputText,
          toolCalls: sessionMessagesForSend.filter(msg => msg.role === 'tool') as ToolMessage[],
        }, streamingMessageContext)

        await appendAlicizationAuditLog({
          level: 'warning',
          category: 'alicization.chat',
          action: 'turn-failed-safe-reply',
          message: 'Primary stream failed and fallback assistant reply was emitted.',
          details: {
            sessionId,
            turnId,
            reason: error instanceof Error ? error.message : String(error),
            fallbackKind: fallback.kind,
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
    onAssistantMessage: hooks.onAssistantMessage,
    onChatTurnComplete: hooks.onChatTurnComplete,
  }
})
