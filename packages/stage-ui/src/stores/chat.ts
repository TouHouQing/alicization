import type { WebSocketEventInputs } from '@proj-alicization/server-sdk'
import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { CommonContentPart, Message, ToolMessage } from '@xsai/shared-chat'

import type { StructuredOutputResult, StructuredValidationIssue } from '../composables/alicization-structured-output'
import type { AlicizationAbortReason } from '../composables/alicization-turn-abort'
import type { ChatAssistantMessage, ChatAssistantStructuredPayload, ChatHistoryItem, ChatSlices, ChatSlicesExecutionStatus, ChatStreamEventContext, StreamingAssistantMessage } from '../types/chat'
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
  AlicizationPreDialogueSendIdentity,
  AlicizationProjectStateContinuitySnapshot,
  AlicizationRuntimeDigest,
  CharacterPerformanceCapabilitiesManifest,
} from './alicization-bridge'
import type { RealtimeEvidenceItem } from './alicization-execution-engine'
import type { StreamEvent, StreamOptions } from './llm'

import {
  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  deriveAlicizationRendererBridgeWatchdogTimeoutPolicy,
  detectAlicizationExecutionCapabilityInquiry,
  detectAlicizationExecutionRoutingIntent,
  formatAlicizationRealtimeSurfaceSummary,
  inferAlicizationInspectionIntent,
  inferAlicizationRealtimeSurfaceLocale,
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine as isThinSamePhaseCarryLine,
  looksLikeAlicizationStructuredPayloadText,
  resolveAlicizationDialogueEmbodiment,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  shouldBufferAlicizationStructuredSpeechPrelude,
  translateGovernedMindFallback,
} from '@proj-alicization/stage-shared'
import { createQueue } from '@proj-alicization/stream-kit'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { ref, toRaw } from 'vue'

import { applyPromptBudget, compactMessagesForPromptAssembly, sanitizeAssistantOutputForDisplay, sanitizeForRemoteModel } from '../composables/alicization-guardrails'
import { composeAlicizationPromptMessages } from '../composables/alicization-prompt-composer'
import { detectRealtimeQueryIntent } from '../composables/alicization-realtime-query'
import {
  enforceGovernedMindTurn,
  normalizeStructuredOutput,
  normalizeStructuredProjectStatePayload,
  repairStructuredContractLocally,
  sanitizeStructuredReplySurface,
  validateStructuredContract,
} from '../composables/alicization-structured-output'
import { abortAlicizationTurns, completeAlicizationTurnAbort, isAlicizationAbortError, registerAlicizationTurnAbort } from '../composables/alicization-turn-abort'
import { useLlmmarkerParser } from '../composables/llm-marker-parser'
import { categorizeResponse, createStreamingCategorizer } from '../composables/response-categoriser'
import { useAnalytics } from '../composables/use-analytics'
import { translateStageUi } from '../utils/i18n'
import {
  getAlicizationBridge,
  hasAlicizationBridge,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationEmbodimentScript,
  normalizeAlicizationPerformancePayload,
} from './alicization-bridge'
import { useAlicizationExecutionEngineStore } from './alicization-execution-engine'
import { useAlicizationPresenceDispatcherStore } from './alicization-presence-dispatcher'
import { useAlicizationSelfEvolutionInspectorStore } from './alicization-self-evolution-inspector'
import {
  blockAlicizationRendererLocalVisibleReply,
  removeAlicizationExecutionStatusSlices,
  shouldBlockAlicizationRendererLocalVisibleReply,
} from './alicization-visible-reply-guard'
import { createDatetimeContext, createSensoryContext } from './chat/context-providers'
import { useChatContextStore } from './chat/context-store'
import { createChatHooks } from './chat/hooks'
import {
  buildPreDialogueSendIdentityFromSnapshots as buildSharedPreDialogueSendIdentityFromSnapshots,
  resolvePreDialogueClosureCompanionHeadlineLine,
  resolvePreferredCompanionHeadlineLine,
} from './chat/pre-dialogue-send-identity'
import { useChatSessionStore } from './chat/session-store'
import { useChatStreamStore } from './chat/stream-store'
import { useLLM } from './llm'
import { useConsciousnessStore } from './modules/consciousness'
import { useProvidersStore } from './providers'

type AlicizationPreDialogueClosurePayload = NonNullable<ChatAssistantStructuredPayload['preDialogueClosure']>
interface AlicizationPreDialogueAwarenessPayload {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine: string | null
  companionBriefingLine: string | null
  companionNextClosureLine: string | null
  awarenessLine: string | null
  emotionalClosureCue: string | null
  reasonPreview: string[]
}
type ChatPreDialogueSendIdentity = NonNullable<ChatStreamEventContext['preDialogueSendIdentity']>

type StreamToolCallPayload = Extract<StreamEvent, { type: 'tool-call' }>

const runtimeAuthoritativeVisibleReplyBlockedErrorMessage = 'Alicization runtime-authoritative visible reply was blocked before a model-authored reply could be persisted.'

function createRuntimeAuthoritativeVisibleReplyBlockedError() {
  return new Error(runtimeAuthoritativeVisibleReplyBlockedErrorMessage)
}

function toAlicizationChatStartPreDialogueSendIdentity(
  identity: ChatStreamEventContext['preDialogueSendIdentity'],
): AlicizationPreDialogueSendIdentity | null {
  if (!identity)
    return null

  return {
    status: identity.status,
    summaryLine: identity.summaryLine,
    companionHeadlineLine: identity.companionHeadlineLine ?? null,
    companionBriefingLine: identity.companionBriefingLine ?? null,
    companionNextClosureLine: identity.companionNextClosureLine ?? null,
    awarenessLine: identity.awarenessLine ?? null,
    emotionalClosureCue: identity.emotionalClosureCue ?? null,
    projectState: identity.projectState ?? null,
    emotionalKernel: identity.emotionalKernel ?? null,
    reasonPreview: identity.reasonPreview.filter((reason): reason is string => typeof reason === 'string' && reason.trim().length > 0),
  }
}

function toStructuredPreDialogueAwarenessPayload(
  identity: ChatStreamEventContext['preDialogueSendIdentity'],
): AlicizationPreDialogueAwarenessPayload | null {
  if (!identity)
    return null

  return {
    status: identity.status,
    summaryLine: identity.summaryLine,
    companionHeadlineLine: identity.companionHeadlineLine ?? null,
    companionBriefingLine: identity.companionBriefingLine ?? null,
    companionNextClosureLine: identity.companionNextClosureLine ?? null,
    awarenessLine: identity.awarenessLine ?? null,
    emotionalClosureCue: identity.emotionalClosureCue ?? null,
    reasonPreview: identity.reasonPreview.filter((reason): reason is string => typeof reason === 'string' && reason.trim().length > 0),
  }
}

function deriveStructuredPreDialogueAwarenessFromClosure(
  closure: ChatAssistantStructuredPayload['preDialogueClosure'],
): AlicizationPreDialogueAwarenessPayload | null {
  if (!closure)
    return null

  const summaryLine = closure.summaryLine ?? null
  const companionBriefingLine = closure.companionBriefingLine ?? null
  const companionNextClosureLine = closure.companionNextClosureLine ?? null
  const companionHeadlineLine = resolvePreDialogueClosureCompanionHeadlineLine(closure)
  const resolvePreferredClosureAwarenessLine = () => {
    const normalizedCompanionHeadlineLine = typeof companionHeadlineLine === 'string' ? companionHeadlineLine.trim() : ''
    const normalizedCompanionBriefingLine = typeof companionBriefingLine === 'string' ? companionBriefingLine.trim() : ''
    const normalizedSummaryLine = typeof summaryLine === 'string' ? summaryLine.trim() : ''
    const preferredProjectAwareLine = normalizedCompanionBriefingLine || normalizedSummaryLine || ''
    if (!normalizedCompanionHeadlineLine)
      return preferredProjectAwareLine || null
    if (!preferredProjectAwareLine)
      return normalizedCompanionHeadlineLine || null

    const lowerHeadline = normalizedCompanionHeadlineLine.toLowerCase()
    const lowerProjectAwareLine = preferredProjectAwareLine.toLowerCase()
    const projectAwareLineCarriesBroaderPhaseClosure = (lowerProjectAwareLine.includes('phase 1')
      || lowerProjectAwareLine.includes('digital life')
      || lowerProjectAwareLine.includes('same living line')
      || lowerProjectAwareLine.includes('what has landed')
      || lowerProjectAwareLine.includes('life loop is still open')
      || lowerProjectAwareLine.includes('still-open life loop'))
    && (
      lowerProjectAwareLine.includes('before speaking')
      || lowerProjectAwareLine.includes('remember')
      || lowerProjectAwareLine.includes('project')
    )
    const headlineLooksEmbodimentOnly = lowerHeadline.includes('body')
      || lowerHeadline.includes('face')
      || lowerHeadline.includes('motion')
      || lowerHeadline.includes('lipsync')
      || lowerHeadline.includes('voice')

    if (projectAwareLineCarriesBroaderPhaseClosure && headlineLooksEmbodimentOnly)
      return preferredProjectAwareLine

    return normalizedCompanionHeadlineLine || preferredProjectAwareLine || null
  }
  const awarenessLine = resolvePreferredClosureAwarenessLine()
  const reasonPreview = [
    companionHeadlineLine,
    summaryLine,
    ...(closure.reasons ?? []),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  if (!summaryLine && !awarenessLine && reasonPreview.length === 0)
    return null

  return {
    status: closure.status,
    summaryLine,
    companionHeadlineLine,
    companionBriefingLine,
    companionNextClosureLine,
    awarenessLine,
    emotionalClosureCue: closure.emotionalClosureCue ?? null,
    reasonPreview,
  }
}

function normalizeStructuredPreDialogueAwarenessPayload(
  awareness: unknown,
): AlicizationPreDialogueAwarenessPayload | null {
  const payload = awareness && typeof awareness === 'object' && !Array.isArray(awareness)
    ? awareness as Record<string, unknown>
    : null
  if (!payload)
    return null

  const status = payload.status
  if (status !== 'grounded' && status !== 'partial' && status !== 'drift')
    return null

  const summaryLine = typeof payload.summaryLine === 'string'
    ? payload.summaryLine
    : null
  const companionHeadlineLine = typeof payload.companionHeadlineLine === 'string'
    ? payload.companionHeadlineLine
    : null
  const companionBriefingLine = typeof payload.companionBriefingLine === 'string'
    ? payload.companionBriefingLine
    : null
  const companionNextClosureLine = typeof payload.companionNextClosureLine === 'string'
    ? payload.companionNextClosureLine
    : null
  const awarenessLine = typeof payload.awarenessLine === 'string'
    ? payload.awarenessLine
    : null
  const emotionalClosureCue = typeof payload.emotionalClosureCue === 'string'
    ? payload.emotionalClosureCue
    : null
  const reasonPreview = Array.isArray(payload.reasonPreview)
    ? payload.reasonPreview.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    : []

  if (!summaryLine && !companionBriefingLine && !awarenessLine && reasonPreview.length === 0)
    return null

  return {
    status,
    summaryLine,
    companionHeadlineLine,
    companionBriefingLine,
    companionNextClosureLine,
    awarenessLine,
    emotionalClosureCue,
    reasonPreview,
  }
}

function normalizePreDialogueSendIdentityText(value: unknown) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function normalizePreDialogueSendIdentityReasonPreview(
  reasonPreview: ChatPreDialogueSendIdentity['reasonPreview'],
) {
  const normalized: string[] = []

  for (const reason of reasonPreview ?? []) {
    const trimmed = typeof reason === 'string' ? reason.trim() : ''
    if (!trimmed || normalized.includes(trimmed))
      continue
    normalized.push(trimmed)
  }

  return normalized
}

function normalizePreDialogueSendIdentityProjectState(
  projectState: ChatPreDialogueSendIdentity['projectState'],
) {
  return projectState
    && typeof projectState === 'object'
    && !Array.isArray(projectState)
    ? { ...projectState } as Record<string, unknown>
    : null
}

function looksLikeThinPreDialogueSendIdentityLine(value: unknown) {
  const normalized = normalizePreDialogueSendIdentityText(value)
  if (!normalized)
    return false

  const lowered = normalized.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(normalized)
    || isThinSamePhaseCarryLine(normalized)
    || lowered.includes('generic continuity reminder')
    || lowered.includes('generic continuity shell')
    || lowered.includes('generic awareness reminder')
    || lowered.includes('generic same-her reminder')
    || lowered.includes('generic next target')
    || lowered.includes('generic closure summary')
}

function resolveSessionFallbackAwarenessSummaryLine(input: {
  strongerPreDialogueAwarenessSummary: string | null
  structuredPreDialogueAwarenessSummary: string | null
  preferredAwarenessLine: string | null
  strongerContinuitySummary: string | null
}) {
  if (input.strongerPreDialogueAwarenessSummary)
    return input.strongerPreDialogueAwarenessSummary

  const structuredSummaryLooksThin = looksLikeThinPreDialogueSendIdentityLine(
    input.structuredPreDialogueAwarenessSummary,
  )

  if (structuredSummaryLooksThin) {
    return input.preferredAwarenessLine
      ?? input.strongerContinuitySummary
      ?? input.structuredPreDialogueAwarenessSummary
      ?? null
  }

  return input.structuredPreDialogueAwarenessSummary
    ?? input.preferredAwarenessLine
    ?? input.strongerContinuitySummary
    ?? null
}

function mergePreDialogueSendIdentityText(existing: unknown, incoming: unknown) {
  const existingText = normalizePreDialogueSendIdentityText(existing)
  const incomingText = normalizePreDialogueSendIdentityText(incoming)
  if (!incomingText)
    return existingText
  if (!existingText)
    return incomingText

  const existingLooksThin = looksLikeThinPreDialogueSendIdentityLine(existingText)
  const incomingLooksThin = looksLikeThinPreDialogueSendIdentityLine(incomingText)
  if (existingLooksThin && !incomingLooksThin)
    return incomingText
  if (incomingLooksThin && !existingLooksThin)
    return existingText

  return incomingText
}

function mergePreDialogueSendIdentityProjectState(
  existingProjectState: Record<string, unknown> | null,
  incomingProjectState: Record<string, unknown> | null,
) {
  if (!existingProjectState)
    return incomingProjectState
  if (!incomingProjectState)
    return existingProjectState

  const merged: Record<string, unknown> = { ...existingProjectState }
  for (const [key, value] of Object.entries(incomingProjectState)) {
    if (value == null)
      continue
    if (typeof value === 'string' && !value.trim())
      continue
    merged[key] = value
  }

  return merged
}

function alignPersistedPreDialogueAwarenessCompanionHeadline(input: {
  awareness: AlicizationPreDialogueAwarenessPayload | null
  preDialogueSendIdentity: ChatStreamEventContext['preDialogueSendIdentity']
}) {
  const awareness = input.awareness
  const preDialogueSendIdentity = input.preDialogueSendIdentity
  if (!awareness || !preDialogueSendIdentity)
    return awareness

  const preferredCompanionHeadlineLine = resolvePreferredCompanionHeadlineLine({
    awarenessCompanionHeadlineLine: awareness.companionHeadlineLine,
    closureCompanionHeadlineLine: preDialogueSendIdentity.companionHeadlineLine,
  })

  if (preferredCompanionHeadlineLine === awareness.companionHeadlineLine)
    return awareness

  return {
    ...awareness,
    companionHeadlineLine: preferredCompanionHeadlineLine,
  }
}

function needsPreDialogueSendIdentityUpgrade(
  identity: ChatStreamEventContext['preDialogueSendIdentity'],
) {
  if (!identity || typeof identity !== 'object')
    return true

  const projectState = normalizePreDialogueSendIdentityProjectState(identity.projectState ?? null)
  return [
    identity.summaryLine,
    identity.companionHeadlineLine,
    identity.companionBriefingLine,
    identity.companionNextClosureLine,
    identity.awarenessLine,
    projectState?.preflightSummary,
    projectState?.preDialogueAwarenessLine,
    projectState?.awarenessLine,
    projectState?.companionHeadlineLine,
    projectState?.companionBriefingLine,
    projectState?.nextClosureTarget,
  ].some(value => looksLikeThinPreDialogueSendIdentityLine(value))
}

function upgradeExplicitPreDialogueSendIdentity(
  identity: ChatStreamEventContext['preDialogueSendIdentity'],
  rebuiltIdentity: ChatStreamEventContext['preDialogueSendIdentity'],
): ChatStreamEventContext['preDialogueSendIdentity'] {
  if (!identity)
    return rebuiltIdentity
  if (!rebuiltIdentity || !needsPreDialogueSendIdentityUpgrade(identity))
    return identity

  const existingProjectState = normalizePreDialogueSendIdentityProjectState(identity.projectState ?? null)
  const rebuiltProjectState = normalizePreDialogueSendIdentityProjectState(rebuiltIdentity.projectState ?? null)

  return {
    ...identity,
    status: rebuiltIdentity.status ?? identity.status,
    summaryLine: mergePreDialogueSendIdentityText(identity.summaryLine, rebuiltIdentity.summaryLine),
    companionHeadlineLine: mergePreDialogueSendIdentityText(identity.companionHeadlineLine, rebuiltIdentity.companionHeadlineLine),
    companionBriefingLine: mergePreDialogueSendIdentityText(identity.companionBriefingLine, rebuiltIdentity.companionBriefingLine),
    companionNextClosureLine: mergePreDialogueSendIdentityText(identity.companionNextClosureLine, rebuiltIdentity.companionNextClosureLine),
    awarenessLine: mergePreDialogueSendIdentityText(identity.awarenessLine, rebuiltIdentity.awarenessLine),
    emotionalClosureCue: mergePreDialogueSendIdentityText(identity.emotionalClosureCue, rebuiltIdentity.emotionalClosureCue),
    projectState: mergePreDialogueSendIdentityProjectState(existingProjectState, rebuiltProjectState) as ChatPreDialogueSendIdentity['projectState'],
    emotionalKernel: identity.emotionalKernel ?? rebuiltIdentity.emotionalKernel ?? null,
    reasonPreview: normalizePreDialogueSendIdentityReasonPreview([
      ...identity.reasonPreview,
      ...rebuiltIdentity.reasonPreview,
    ]),
  }
}

interface SendOptions {
  providerId?: string
  model: string
  chatProvider: ChatProvider
  providerConfig?: Record<string, unknown>
  attachments?: { type: 'image', data: string, mimeType: string }[]
  tools?: StreamOptions['tools']
  input?: WebSocketEventInputs
  preDialogueSendIdentity?: ChatStreamEventContext['preDialogueSendIdentity']
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

function toAlicizationPreDialogueClosurePayload(input: {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  sameHerDriftRiskLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  emotionalClosureCue?: string | null
  briefingLines?: string[]
  reasons: string[]
}): AlicizationPreDialogueClosurePayload {
  return {
    status: input.status,
    summaryLine: input.summaryLine,
    companionHeadlineLine: input.companionHeadlineLine ?? null,
    sameHerDriftRiskLine: input.sameHerDriftRiskLine ?? null,
    companionBriefingLine: input.companionBriefingLine ?? null,
    companionNextClosureLine: input.companionNextClosureLine ?? null,
    emotionalClosureCue: input.emotionalClosureCue ?? null,
    briefingLines: [...(input.briefingLines ?? [])],
    reasons: [...input.reasons],
  }
}

function toAlicizationPreDialogueClosureSnapshot(
  input: ChatAssistantStructuredPayload['preDialogueClosure'],
): AlicizationProjectStateContinuitySnapshot['preDialogueClosure'] {
  if (!input)
    return null

  return {
    status: input.status,
    summaryLine: input.summaryLine ?? null,
    companionHeadlineLine: input.companionHeadlineLine ?? null,
    sameHerDriftRiskLine: input.sameHerDriftRiskLine ?? null,
    companionBriefingLine: input.companionBriefingLine ?? null,
    emotionalClosureCue: input.emotionalClosureCue ?? null,
    companionNextClosureLine: input.companionNextClosureLine ?? null,
    briefingLines: [...(input.briefingLines ?? [])],
    reasons: [...(input.reasons ?? [])],
  }
}

function stageChatText(path: string, params?: Record<string, unknown>) {
  return translateStageUi(`stage.chat.${path}`, params)
}

function mindRepairText(path: string, userText?: string, params?: Record<string, unknown>) {
  return translateGovernedMindFallback(`mind-repair.${path}`, params, userText)
}

function sanitizeRealtimeEvidenceText(raw: unknown, maxChars = 480) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function buildRealtimeEvidenceSystemPrompt(input: {
  message: string
  evidences: RealtimeEvidenceItem[]
  failedCategories: string[]
  fallbackReply?: string
}) {
  const locale = inferAlicizationRealtimeSurfaceLocale(input.message)
  const lines = [
    '[ALICIZATION_REALTIME_EVIDENCE]',
    locale === 'zh'
      ? '这轮实时查询已经执行完了。最终可见回复只能根据下面这些证据来写。'
      : 'Realtime lookups for this turn already finished. Write the visible reply only from the evidence below.',
    locale === 'zh'
      ? '不要再说“我去查”“我现在调用工具”，也不要假装拿到了更新鲜的数据。'
      : 'Do not say you are about to check or call tools again, and do not invent fresher live data.',
  ]

  input.evidences.forEach((evidence, index) => {
    const summary = evidence.surface
      ? formatAlicizationRealtimeSurfaceSummary(evidence.surface)
      : evidence.summary
    const normalizedSummary = sanitizeRealtimeEvidenceText(summary, 640)
    if (!normalizedSummary)
      return
    lines.push(`evidence_${index + 1}_category=${evidence.category}`)
    lines.push(`evidence_${index + 1}_source=${evidence.source}`)
    lines.push(`evidence_${index + 1}_summary=${normalizedSummary}`)
  })

  if (input.failedCategories.length > 0)
    lines.push(`failed_categories=${input.failedCategories.join('|')}`)

  const fallbackReply = sanitizeRealtimeEvidenceText(input.fallbackReply, 320)
  if (fallbackReply)
    lines.push(`fallback_guidance=${fallbackReply}`)

  return lines.filter(Boolean).join('\n')
}

const assistantLeakFallbackReply = (userText?: string) => mindRepairText('internal-leak', userText)
const assistantRealtimeUnavailableReply = (userText?: string) => mindRepairText('realtime-unavailable', userText)
const assistantEpoch1StrictFallbackReply = (userText?: string) => mindRepairText('epoch1-strict', userText)
const assistantStructuredContractFallbackReply = (userText?: string) => mindRepairText('structured-contract', userText)
const assistantStreamFailureFallbackReply = (userText?: string) => mindRepairText('stream-failure', userText)
const assistantLocalRuntimeUnavailableFallbackReply = (userText?: string) => mindRepairText('local-runtime-unavailable', userText)
const assistantProviderAuthFallbackReply = (userText?: string) => mindRepairText('provider-auth', userText)
const assistantProviderNetworkFallbackReply = (userText?: string) => mindRepairText('provider-network', userText)
const assistantProviderConfigFallbackReply = (userText?: string) => mindRepairText('provider-config', userText)
const assistantUnsupportedToolsFallbackReply = (userText?: string) => mindRepairText('unsupported-tools', userText)
const runtimeGatewayWatchdogPolicy = deriveAlicizationRendererBridgeWatchdogTimeoutPolicy()
const alicizationChatRuntimeFlags = {
  epoch1StrictModeEnabled: false,
}

export function configureAlicizationChatRuntimeForTest(options: {
  epoch1StrictModeEnabled?: boolean
}) {
  const meta = import.meta as unknown as { vitest?: unknown }
  if (!meta.vitest)
    return

  alicizationChatRuntimeFlags.epoch1StrictModeEnabled = Boolean(options.epoch1StrictModeEnabled)
}

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
const executionPromisePattern = /我现在|我这就|马上|稍后|正在|接下来|i(?:'|’)?ll|i will|let me|going to|about to|run it now/iu
const executionSettledPattern = /已经|已|完成|结束|拿到|结果|输出|列出|通过|失败|报错|done|completed|finished|result|output|listed|succeeded|failed|error/iu
const fileSystemOperationVerbPattern = /读取|读|查看|打开|访问|写入|写|修改|删除|列出|搜索|获取|read|open|access|write|update|delete|list|find|inspect/i
const fileSystemOperationTargetPattern = /文件夹|目录|路径|桌面|系统状态|磁盘|file|folder|directory|path|desktop|system state|\/|\\|\.(?:txt|md|json|yaml|yml|csv|log)\b|文件(?!夹)/i
const reminderVerbPattern = /提醒|闹钟|alarm|remind|notify|叫我|喊我|告诉我|通知我|记得|别忘/iu
const reminderDurationPattern = /\b(?:in|after)\s*\d+\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\b|(?:\d+|[零一二两三四五六七八九十百半几]+)\s*(?:秒钟?|分钟?|小时|时|天)(?:\s*之?后)?/iu
const reminderChineseNaturalPattern = /(?:\d+|[零一二两三四五六七八九十百半几]+)\s*(?:秒钟?|分钟?|小时|时|天)(?:\s*之?后)?[\s，,。！!]*(?:提醒我|叫我|喊我|告诉我|通知我|记得|别忘)/u
const reminderEnglishNaturalPattern = /(?:^|\s)(?:in|after)\s*\d+\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\s*(?:[,.:;!?-]\s*)?(?:remind|notify|tell)\s+me\b/iu
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

function buildExecutionToolCallCriticalRetryDirective(requiredToolNames: string[]) {
  const normalizedToolNames = [...new Set(requiredToolNames.map(toolName => sanitizeExecutorReplyEvidenceText(toolName, 96)).filter(Boolean))]
  const toolInstruction = normalizedToolNames.length > 0
    ? `You MUST call ${normalizedToolNames.join(' or ')} for this request.`
    : 'You MUST call an appropriate execution tool for this request.'
  return [
    '[CRITICAL DIRECTIVE]: User requested real task execution in this turn.',
    toolInstruction,
    'DO NOT claim execution is done unless the required execution tool result confirms completion.',
    'If required command, prompt, URL, selector, or page details are missing, ask one concise clarification question instead of generic refusal.',
  ].join(' ')
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
    evidence.toolName
      ? `Do NOT call ${evidence.toolName} again in this retry.`
      : 'Do NOT call the execution tool again in this retry.',
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

function normalizeExecutorEvidenceCompareText(raw: string) {
  return sanitizeExecutorReplyEvidenceText(raw, 640)
    .toLowerCase()
    .replace(/\s+/g, '')
}

function collectExecutorEvidenceTokens(raw: string, limit = 8) {
  const normalized = normalizeExecutorEvidenceCompareText(raw)
  if (!normalized)
    return []

  const tokens: string[] = []
  const seen = new Set<string>()
  const cjkTokens = normalized.match(/[\u4E00-\u9FFF]{2,}/g) ?? []
  const asciiTokens = normalized.match(/[a-z0-9]{3,}/g) ?? []
  for (const token of [...cjkTokens, ...asciiTokens]) {
    if (!token || seen.has(token))
      continue
    seen.add(token)
    tokens.push(token)
    if (tokens.length >= limit)
      break
  }
  return tokens
}

function replyMentionsExecutorEvidence(reply: string, evidence: ExecutorToolReplyEvidence) {
  const normalizedReply = sanitizeExecutorReplyEvidenceText(reply, 640)
  if (!normalizedReply)
    return false

  const replyComparisonText = normalizeExecutorEvidenceCompareText(normalizedReply)
  if (!replyComparisonText)
    return false

  const evidenceTokens = [
    ...collectExecutorEvidenceTokens(evidence.summary, 8),
    ...collectExecutorEvidenceTokens(evidence.output, 6),
    ...collectExecutorEvidenceTokens(evidence.errorMessage, 6),
  ]
  const mentionsEvidence = evidenceTokens.some(token => token.length >= 2 && replyComparisonText.includes(token))
  const hasSettledSignal = executionSettledPattern.test(normalizedReply)
  const hasPromiseSignal = executionPromisePattern.test(normalizedReply)
  const statusSettled = evidence.status === 'completed'
    || evidence.status === 'failed'
    || evidence.status === 'blocked'
    || evidence.status === 'cancelled'

  if (mentionsEvidence)
    return true
  if (hasSettledSignal && statusSettled && !hasPromiseSignal)
    return true
  return false
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
    embodimentScript?: AlicizationEmbodimentScriptV1 | null
    speechTimeline?: AlicizationDialogueSpeechTimeline | null
    digitalLife?: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
    runtimeDigest?: AlicizationRuntimeDigest | null
    projectState?: StructuredOutputResult['projectState']
    preDialogueClosure?: ChatAssistantStructuredPayload['preDialogueClosure']
    preDialogueAwareness?: AlicizationPreDialogueAwarenessPayload | null
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
  visibleReplySource: 'runtime-model' | 'renderer-local'
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
    preDialogueClosure?: ChatAssistantStructuredPayload['preDialogueClosure']
    preDialogueAwareness?: AlicizationPreDialogueAwarenessPayload | null
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
  const normalizedInputPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
    (input.preDialogueAwareness ?? null) as Record<string, unknown> | null,
  )
  const normalizedStructuredPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
    (structured.preDialogueAwareness ?? null) as Record<string, unknown> | null,
  )

  return {
    ...structured,
    embodiment: input.embodiment ?? structured.embodiment ?? null,
    embodimentScript: input.embodimentScript ?? structured.embodimentScript ?? null,
    speechTimeline: input.speechTimeline ?? structured.speechTimeline ?? null,
    digitalLife: normalizedInputDigitalLife ?? normalizedStructuredDigitalLife ?? input.digitalLife ?? structured.digitalLife ?? null,
    digitalLifeSpine: input.digitalLifeSpine ?? structured.digitalLifeSpine ?? null,
    runtimeDigest: input.runtimeDigest ?? structured.runtimeDigest ?? null,
    projectState: normalizedInputProjectState ?? normalizedStructuredProjectState ?? null,
    preDialogueClosure: input.preDialogueClosure ?? structured.preDialogueClosure ?? null,
    preDialogueAwareness: normalizedInputPreDialogueAwareness ?? normalizedStructuredPreDialogueAwareness ?? null,
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

function inferPerformanceManifestFromEmbodimentScript(input: {
  performance: StructuredWithContract['performance'] | null | undefined
  script: AlicizationEmbodimentScriptV1 | null | undefined
}): CharacterPerformanceCapabilitiesManifest | null {
  const script = normalizeAlicizationEmbodimentScript(input.script ?? null) ?? input.script ?? null
  if (!script)
    return null

  const renderer = script.rendererTarget
  if (renderer !== 'live2d' && renderer !== 'vrm')
    return null

  const supportedBaseEmotions = [
    input.performance?.baseEmotion,
    input.performance?.emotion,
    script.state.baseEmotion,
  ].filter((emotion, index, values): emotion is AlicizationEmotion => {
    return Boolean(emotion) && values.indexOf(emotion) === index
  })

  return {
    renderer,
    supportedBaseEmotions,
    supportedFacialCues: [],
    supportedActions: [],
    supportsLookAt: renderer === 'vrm',
    supportsVisemeLipSync: renderer === 'vrm' && script.lipsyncPlan.mode === 'energy-phoneme-hybrid',
    supportsMicroDynamics: true,
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

function buildTimeoutDiagnosticReply(error: unknown, userText?: string) {
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
  const afterDispatchMeta = message.includes('after-dispatch-meta')
  const recoveryTimedOut = message.includes('recovery-failed=main-gateway-timeout-recovery')
  const toolLessRecovery = message.includes('recovery-mode=tools-disabled')
  const gatewayHealthTimedOut = message.includes('chat_timeout')
    || message.includes('chat completions timed out before the first event')
    || (message.includes('main gateway health check failed') && message.includes('first event'))

  const locale = typeof navigator !== 'undefined' && typeof navigator.language === 'string'
    ? navigator.language.toLowerCase()
    : 'en'
  const isChineseLocale = locale.startsWith('zh')
  const seed = [
    afterDispatchMeta ? 'after-dispatch-meta' : '',
    recoveryTimedOut ? 'recovery-timeout' : '',
    toolLessRecovery ? 'tools-disabled' : '',
    gatewayHealthTimedOut ? 'gateway-health-timeout' : '',
    message.slice(0, 200),
  ].join('|')

  const pickVariant = (variants: readonly string[]) => {
    if (variants.length === 0) {
      return isChineseLocale
        ? translateGovernedMindFallback('mind-repair.stream-failure', undefined, userText)
        : translateGovernedMindFallback('mind-repair.stream-failure', undefined, userText)
    }
    if (variants.length === 1)
      return variants[0] ?? ''

    let hash = 0
    for (let index = 0; index < seed.length; index += 1)
      hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
    return variants[hash % variants.length] ?? variants[0] ?? ''
  }

  if (!afterDispatchMeta && !recoveryTimedOut && !toolLessRecovery && !gatewayHealthTimedOut) {
    return pickVariant(isChineseLocale
      ? [
          '我还在。这轮等模型响应等得太久了。你把刚才那句再发一次，我直接续上。',
          '我没有断开，只是这轮迟迟没等到内容出来。你重发一次，我立刻接着说。',
          '这轮卡住了，但我还在这里。你再发一次同一句，我马上继续。',
        ]
      : [
          'I am still here. This turn waited too long for the model to answer. Send the same request again and I will resume directly.',
          'I did not drop the thread. This turn just took too long to produce content. Retry once and I will keep going.',
          'This turn stalled, but I am still here. Send the same line again and I will continue immediately.',
        ])
  }

  const zhReplies = [
    '我还在线，这轮首包没回来。你直接重发同一句，我马上继续。',
    '主通道这次没及时吐出第一段内容。我先不断线，你重发一次我就立刻接着跑。',
    '这轮卡在真正开口之前了。你再发一次目标，我会立即重试。',
  ]
  const enReplies = [
    'I am still here. This turn stalled before first content. Send the same request again and I will continue immediately.',
    'The primary lane did not emit content in time. I am staying on this thread; retry once and I will resume right away.',
    'This turn timed out before first content. Re-send your goal once and I will rerun it now.',
  ]

  return pickVariant(isChineseLocale ? zhReplies : enReplies)
}

function resolveStreamFailureFallback(error: unknown, userText?: string): { reply: string, kind: StreamFailureKind } {
  const errorCode = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code ?? '').toLowerCase()
    : ''
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
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
    && typeof candidate.suppressAssociativeRecall === 'boolean'
    && typeof candidate.labelCarryAsMemory === 'boolean'
    && typeof candidate.shouldAskForGrounding === 'boolean'
    && typeof candidate.shouldAcknowledgeRepair === 'boolean'
    && typeof candidate.maxSentences === 'number'
    && Number.isFinite(candidate.maxSentences)
    && Array.isArray(candidate.mustDo)
    && Array.isArray(candidate.mustNotDo)
}

function hasStructuredJsonContract(structured: StructuredOutputResult | undefined) {
  if (!structured?.parsePath)
    return false
  return structured.parsePath === 'json' || structured.parsePath === 'repair-json'
}

function createStructuredFallback(
  replyText: string,
  emotion: StructuredOutputResult['emotion'] = 'neutral',
  userText?: string,
  projectState?: StructuredOutputResult['projectState'],
  digitalLife?: AlicizationDigitalLifeEnvelope | null,
): StructuredWithContract {
  const normalizedProjectState = normalizeStructuredProjectStatePayload(
    (projectState ?? null) as Record<string, unknown> | null,
  ) ?? null
  const normalizedDigitalLife = normalizeChatRuntimeDigitalLifeEnvelope(digitalLife)
  return {
    thought: '',
    emotion,
    reply: sanitizeStructuredReplySurface(replyText.trim()) || assistantStructuredContractFallbackReply(userText),
    performance: normalizeAlicizationPerformancePayload(undefined, emotion as AlicizationEmotion),
    userSentimentScore: 0,
    sentimentConfidence: 0.2,
    format: 'fallback-v1',
    parsePath: 'fallback',
    repairTimedOut: false,
    contractFailed: true,
    digitalLife: normalizedDigitalLife,
    projectState: normalizedProjectState,
  }
}

function createAlicizationBlockedRendererFallback(
  reason: string,
  projectState?: StructuredOutputResult['projectState'],
  digitalLife?: AlicizationDigitalLifeEnvelope | null,
): StructuredWithContract {
  const normalizedProjectState = normalizeStructuredProjectStatePayload(
    (projectState ?? null) as Record<string, unknown> | null,
  ) ?? null
  const normalizedDigitalLife = normalizeChatRuntimeDigitalLifeEnvelope(digitalLife)
  return {
    thought: 'obligation=repair; truth=uncertain; focus=do not invent visible speech outside runtime mind authority; move=block local renderer fallback and wait for model-authored retry; tone=direct',
    emotion: 'neutral',
    reply: '',
    performance: normalizeAlicizationPerformancePayload(undefined, 'neutral'),
    userSentimentScore: 0,
    sentimentConfidence: 0,
    format: 'mind-turn-v1',
    parsePath: 'fallback',
    repairTimedOut: false,
    contractFailed: true,
    visibleReplyBlocked: true,
    nonHumanAuthoredStatus: reason,
    visibleReplyAuthority: 'local-deterministic-fallback',
    digitalLife: normalizedDigitalLife,
    projectState: normalizedProjectState,
  }
}

function deriveFallbackProjectStateContinuitySnapshotFromSessionMessages(
  messages: ChatAssistantMessage[],
): AlicizationProjectStateContinuitySnapshot | null {
  const sanitizeSessionFallbackText = (raw: unknown, maxChars: number) => {
    if (typeof raw !== 'string')
      return null
    const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    return normalized || null
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== 'assistant' || !message.structured || typeof message.structured !== 'object')
      continue

    const visibleReplyRealization = message.structured.visibleReplyRealization
      && typeof message.structured.visibleReplyRealization === 'object'
      ? message.structured.visibleReplyRealization as {
        projectStateAudit?: {
          sameHerSummary?: unknown
          currentPhaseSummary?: unknown
          sameHerHoldDetail?: unknown
          landedProgressSummary?: unknown
          openClosureSummary?: unknown
          nextClosureTargetSummary?: unknown
          emotionalClosureSummary?: unknown
          preDialogueAwarenessSummary?: unknown
          continuitySummary?: unknown
          embodimentClosureSummary?: unknown
          sameHerDriftRiskSummary?: unknown
          sameHerDriftRisk?: unknown
          proactiveSameHerGapSummary?: unknown
        } | null
      }
      : null
    const projectStateAudit = visibleReplyRealization?.projectStateAudit
      && typeof visibleReplyRealization.projectStateAudit === 'object'
      ? visibleReplyRealization.projectStateAudit
      : null
    const digitalLifeSpine = message.structured.digitalLifeSpine
      && typeof message.structured.digitalLifeSpine === 'object'
      ? message.structured.digitalLifeSpine as {
        memory?: {
          personStateProjection?: {
            selfContinuityAuthority?: {
              authoritySummary?: unknown
              inwardLine?: unknown
              sourceTags?: unknown
            } | null
          } | null
        } | null
      }
      : null
    const spineSelfAuthority = digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority ?? null
    const normalizedProjectState = normalizeStructuredProjectStatePayload(
      (message.structured.projectState ?? null) as Record<string, unknown> | null,
    )
    if (!normalizedProjectState)
      continue

    const strongerSameHerSelfLine
      = sanitizeSessionFallbackText(projectStateAudit?.sameHerSummary, 220)
        ?? sanitizeSessionFallbackText(spineSelfAuthority?.inwardLine, 220)
        ?? sanitizeSessionFallbackText(spineSelfAuthority?.authoritySummary, 220)
        ?? null
    const strongerSameHerHoldDetail
      = sanitizeSessionFallbackText(projectStateAudit?.sameHerHoldDetail, 220)
        ?? sanitizeSessionFallbackText(normalizedProjectState.sameHerHoldDetail, 220)
        ?? null
    const strongerCurrentPhase
      = sanitizeSessionFallbackText(projectStateAudit?.currentPhaseSummary, 180)
        ?? normalizedProjectState.currentPhase
    const strongerNextClosureTarget
      = sanitizeSessionFallbackText(projectStateAudit?.nextClosureTargetSummary, 320)
        ?? normalizedProjectState.nextClosureTarget
    const strongerLatestLandedProgress
      = sanitizeSessionFallbackText(projectStateAudit?.landedProgressSummary, 320)
        ?? null
    const strongerPrimaryOpenLoop
      = sanitizeSessionFallbackText(projectStateAudit?.openClosureSummary, 320)
        ?? null
    const strongerPreDialogueAwarenessSummary
      = sanitizeSessionFallbackText(projectStateAudit?.preDialogueAwarenessSummary, 320)
        ?? null
    const strongerContinuitySummary
      = sanitizeSessionFallbackText(projectStateAudit?.continuitySummary, 480)
        ?? strongerPreDialogueAwarenessSummary
        ?? sanitizeSessionFallbackText((message.structured.projectState as Record<string, unknown> | null | undefined)?.continuitySummary, 480)
        ?? null
    const strongerSameHerDriftRisk
      = sanitizeSessionFallbackText(projectStateAudit?.sameHerDriftRiskSummary, 320)
        ?? sanitizeSessionFallbackText(projectStateAudit?.sameHerDriftRisk, 320)
        ?? sanitizeSessionFallbackText((message.structured.projectState as Record<string, unknown> | null | undefined)?.sameHerDriftRisk, 320)
        ?? null
    const strongerProactiveSameHerGap
      = sanitizeSessionFallbackText(projectStateAudit?.proactiveSameHerGapSummary, 320)
        ?? sanitizeSessionFallbackText((message.structured.projectState as Record<string, unknown> | null | undefined)?.proactiveSameHerGap, 320)
        ?? sanitizeSessionFallbackText(normalizedProjectState.proactiveSameHerGap, 320)
        ?? null
    const structuredPreDialogueAwareness = message.structured.preDialogueAwareness
      && typeof message.structured.preDialogueAwareness === 'object'
      ? message.structured.preDialogueAwareness as {
        status?: 'grounded' | 'partial' | 'drift'
        summaryLine?: unknown
        companionHeadlineLine?: unknown
        companionBriefingLine?: unknown
        companionNextClosureLine?: unknown
        awarenessLine?: unknown
        emotionalClosureCue?: unknown
        reasonPreview?: unknown
      }
      : null
    const structuredPreDialogueAwarenessSummary
      = sanitizeSessionFallbackText(structuredPreDialogueAwareness?.summaryLine, 320)
        ?? null
    const strongerCompanionHeadlineLine
      = sanitizeSessionFallbackText(structuredPreDialogueAwareness?.companionHeadlineLine, 320)
        ?? null
    const structuredAwarenessLine = sanitizeSessionFallbackText(structuredPreDialogueAwareness?.awarenessLine, 320)
    const structuredCompanionBriefingLine = sanitizeSessionFallbackText(structuredPreDialogueAwareness?.companionBriefingLine, 320)
    const awarenessCarriesCompactSamePhaseLine = isThinSamePhaseCarryLine(structuredAwarenessLine)
    const companionBriefingCarriesCompactSamePhaseLine = isThinSamePhaseCarryLine(structuredCompanionBriefingLine)
    const shouldPreferSameHerHoldDetail = Boolean(
      strongerSameHerHoldDetail
      && (
        awarenessCarriesCompactSamePhaseLine
        || companionBriefingCarriesCompactSamePhaseLine
        || isAlicizationThinProjectAwarenessLine(
          structuredAwarenessLine
          || strongerPreDialogueAwarenessSummary
          || structuredCompanionBriefingLine,
        )
      ),
    )
    const shouldRebuildAwarenessFromBaseProjectState = Boolean(
      !shouldPreferSameHerHoldDetail
      && isAlicizationThinProjectAwarenessLine(
        structuredAwarenessLine
        || strongerPreDialogueAwarenessSummary
        || structuredCompanionBriefingLine,
      ),
    )
    const strongerEmotionalClosureCue
      = sanitizeSessionFallbackText(projectStateAudit?.emotionalClosureSummary, 320)
        ?? sanitizeSessionFallbackText(structuredPreDialogueAwareness?.emotionalClosureCue, 320)
        ?? null
    const structuredCompanionNextClosureLine
      = sanitizeSessionFallbackText(structuredPreDialogueAwareness?.companionNextClosureLine, 320)
        ?? null
    const structuredReasonPreview = Array.isArray(structuredPreDialogueAwareness?.reasonPreview)
      ? structuredPreDialogueAwareness.reasonPreview
          .map(reason => sanitizeSessionFallbackText(reason, 320))
          .filter((reason): reason is string => typeof reason === 'string' && reason.trim().length > 0)
      : []
    const preferredAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity: normalizedProjectState.identity,
        currentPhase: strongerCurrentPhase,
        preDialogueAwarenessLine: shouldPreferSameHerHoldDetail
          ? strongerSameHerHoldDetail
          : shouldRebuildAwarenessFromBaseProjectState
            ? null
            : structuredAwarenessLine,
        awarenessLine: shouldPreferSameHerHoldDetail
          ? strongerSameHerHoldDetail
          : shouldRebuildAwarenessFromBaseProjectState
            ? null
            : structuredAwarenessLine,
        companionHeadlineLine: strongerCompanionHeadlineLine,
        companionBriefingLine: shouldPreferSameHerHoldDetail
          ? strongerSameHerHoldDetail
          : shouldRebuildAwarenessFromBaseProjectState
            ? null
            : structuredCompanionBriefingLine,
        preDialogueAwarenessSummary: shouldPreferSameHerHoldDetail
          ? null
          : shouldRebuildAwarenessFromBaseProjectState
            ? null
            : strongerPreDialogueAwarenessSummary,
        emotionalClosureSummary: strongerEmotionalClosureCue,
        latestLandedProgress: strongerLatestLandedProgress ?? normalizedProjectState.latestLandedProgress,
        landedProgressSummary: strongerLatestLandedProgress,
        primaryOpenLoop: strongerPrimaryOpenLoop ?? normalizedProjectState.primaryOpenLoop,
        openClosureSummary: strongerPrimaryOpenLoop,
        nextClosureTarget: strongerNextClosureTarget,
        nextClosureTargetSummary: strongerNextClosureTarget,
        sameHerDriftRiskSummary: strongerSameHerDriftRisk,
        proactiveSameHerGap: strongerProactiveSameHerGap,
      },
    })
    const shouldSynthesizePreDialogueAwareness = Boolean(
      strongerPreDialogueAwarenessSummary
      || structuredPreDialogueAwarenessSummary
      || preferredAwarenessLine
      || strongerCompanionHeadlineLine
      || structuredCompanionBriefingLine
      || strongerNextClosureTarget
      || strongerEmotionalClosureCue,
    )

    return {
      identity: normalizedProjectState.identity,
      currentPhase: strongerCurrentPhase,
      latestLandedProgress: strongerLatestLandedProgress ?? normalizedProjectState.latestLandedProgress,
      primaryOpenLoop: strongerPrimaryOpenLoop ?? normalizedProjectState.primaryOpenLoop,
      nextClosureTarget: strongerNextClosureTarget,
      continuitySummary: strongerContinuitySummary,
      sameHerSelfLine: strongerSameHerSelfLine ?? normalizedProjectState.sameHerSelfLine ?? null,
      sameHerHoldDetail: strongerSameHerHoldDetail,
      sameHerDriftRisk: strongerSameHerDriftRisk ?? normalizedProjectState.sameHerDriftRisk ?? null,
      proactiveSameHerGap: strongerProactiveSameHerGap ?? normalizedProjectState.proactiveSameHerGap ?? null,
      emotionalClosureCue: strongerEmotionalClosureCue,
      preDialogueAwareness: shouldSynthesizePreDialogueAwareness
        ? {
            status: (structuredPreDialogueAwareness?.status ?? 'partial'),
            summaryLine: resolveSessionFallbackAwarenessSummaryLine({
              strongerPreDialogueAwarenessSummary,
              structuredPreDialogueAwarenessSummary,
              preferredAwarenessLine,
              strongerContinuitySummary,
            }),
            companionHeadlineLine: strongerCompanionHeadlineLine,
            companionBriefingLine: structuredCompanionBriefingLine
              ?? strongerSameHerHoldDetail
              ?? strongerSameHerSelfLine
              ?? null,
            companionNextClosureLine: structuredCompanionNextClosureLine
              ?? strongerNextClosureTarget,
            awarenessLine: preferredAwarenessLine
              ?? structuredAwarenessLine
              ?? null,
            emotionalClosureCue: strongerEmotionalClosureCue,
            reasonPreview: [
              ...structuredReasonPreview,
              strongerPreDialogueAwarenessSummary,
              structuredPreDialogueAwarenessSummary,
              strongerLatestLandedProgress,
              strongerPrimaryOpenLoop,
              strongerNextClosureTarget,
              strongerEmotionalClosureCue,
              strongerSameHerHoldDetail,
              strongerSameHerSelfLine,
              strongerProactiveSameHerGap,
            ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
          }
        : message.structured.preDialogueAwareness ?? null,
      preDialogueClosure: toAlicizationPreDialogueClosureSnapshot(message.structured.preDialogueClosure ?? null),
      nonHumanAuthoredStatus: message.structured.nonHumanAuthoredStatus ?? null,
      turnId: message.id ?? `session-history-${index}`,
      sessionId: '',
      origin: message.origin ?? 'user-turn',
    }
  }

  return null
}

function selectAssistantMessages(messages: ChatHistoryItem[]): ChatAssistantMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== 'assistant')
      return []

    return [{
      ...message,
      slices: Array.isArray(message.slices) ? message.slices : [],
      tool_results: Array.isArray(message.tool_results) ? message.tool_results : [],
    }] as ChatAssistantMessage[]
  })
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

function createFailureFallbackThought(kind: StreamFailureKind) {
  switch (kind) {
    case 'provider-config':
      return 'obligation=repair; truth=uncertain; focus=restore the chat route before pretending to answer; move=state the route gap plainly and ask for settings confirmation; tone=direct'
    case 'provider-auth':
      return 'obligation=repair; truth=uncertain; focus=authentication is blocking the next answer; move=state the auth wall plainly and ask for permission repair; tone=direct'
    case 'provider-network':
      return 'obligation=repair; truth=uncertain; focus=keep the turn alive while connectivity is broken; move=state the network break plainly and invite retry; tone=warm'
    case 'timeout':
      return 'obligation=repair; truth=uncertain; focus=keep continuity while the gateway stalls before speaking; move=state the stall plainly and invite immediate retry; tone=warm'
    case 'model-tools-unsupported':
      return 'obligation=repair; truth=uncertain; focus=tool support is missing for this request; move=state the capability mismatch plainly and guide the next step; tone=direct'
    case 'local-runtime-unavailable':
      return 'obligation=repair; truth=uncertain; focus=the local runtime is offline; move=state the offline runtime plainly and ask for restart; tone=direct'
    case 'runtime-aborted':
      return 'obligation=repair; truth=uncertain; focus=this turn was interrupted before the answer surfaced; move=state the interruption plainly and hold continuity; tone=warm'
    default:
      return 'obligation=repair; truth=uncertain; focus=keep the turn coherent through a failed response; move=state the break plainly and invite one immediate retry; tone=warm'
  }
}

function createFailureStructuredFallback(input: {
  kind: StreamFailureKind
  replyText: string
  emotion?: StructuredOutputResult['emotion']
  userText?: string
}): StructuredWithContract {
  const emotion = input.emotion ?? 'concerned'
  return {
    thought: createFailureFallbackThought(input.kind),
    emotion,
    reply: sanitizeStructuredReplySurface(input.replyText.trim()) || assistantStructuredContractFallbackReply(input.userText),
    performance: normalizeAlicizationPerformancePayload(undefined, emotion as AlicizationEmotion),
    userSentimentScore: 0,
    sentimentConfidence: 0.2,
    format: 'mind-turn-v1',
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
  userText?: string,
) {
  if (options?.toolDenied && options.denialSource === 'host' && personalityState && personalityState.obedience <= 0.2) {
    return mindRepairText('low-obedience-host-denied', userText)
  }
  if (options?.toolDenied && options.denialSource === 'system' && personalityState && personalityState.obedience <= 0.2) {
    return mindRepairText('low-obedience-system-denied', userText)
  }
  if (options?.toolDenied && personalityState && personalityState.obedience <= 0.2) {
    return mindRepairText('low-obedience-denied', userText)
  }
  if (personalityState && personalityState.liveliness <= 0.2)
    return mindRepairText('low-liveliness', userText)
  return assistantStructuredContractFallbackReply(userText)
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
  const providersStore = useProvidersStore()
  const { activeProvider, activeModel } = storeToRefs(consciousnessStore)
  const { trackFirstMessage } = useAnalytics()

  const chatSession = useChatSessionStore()
  const chatStream = useChatStreamStore()
  const chatContext = useChatContextStore()
  const presenceDispatcher = useAlicizationPresenceDispatcherStore()
  const selfEvolutionInspector = useAlicizationSelfEvolutionInspectorStore()
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

  function buildPreDialogueSendIdentityFromSnapshots(input: {
    preDialogueSendIdentity?: ChatStreamEventContext['preDialogueSendIdentity']
    projectStateContinuitySnapshot?: Record<string, unknown> | null
    preDialogueClosureSnapshot?: Record<string, unknown> | null
    preDialogueAwarenessSnapshot?: Record<string, unknown> | null
  }): ChatStreamEventContext['preDialogueSendIdentity'] {
    const normalizedAwareness = normalizeStructuredPreDialogueAwarenessPayload(
      (input.preDialogueAwarenessSnapshot ?? null) as Record<string, unknown> | null,
    )
    const normalizedClosure = input.preDialogueClosureSnapshot && typeof input.preDialogueClosureSnapshot === 'object'
      ? toAlicizationPreDialogueClosurePayload(input.preDialogueClosureSnapshot as {
          status: 'grounded' | 'partial' | 'drift'
          summaryLine: string | null
          companionHeadlineLine?: string | null
          sameHerDriftRiskLine?: string | null
          companionBriefingLine?: string | null
          companionNextClosureLine?: string | null
          emotionalClosureCue?: string | null
          briefingLines?: string[]
          reasons: string[]
        })
      : null
    const normalizedContinuity = input.projectStateContinuitySnapshot && typeof input.projectStateContinuitySnapshot === 'object'
      ? input.projectStateContinuitySnapshot as {
        identity?: string | null
        currentPhase?: string | null
        continuitySummary?: string | null
        sameHerSelfLine?: string | null
        sameHerHoldDetail?: string | null
        sameHerDriftRisk?: string | null
        proactiveSameHerGap?: string | null
        emotionalClosureCue?: string | null
        latestLandedProgress?: string | null
        latestProgress?: string | null
        landedProgressSummary?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwareness?: Record<string, unknown> | null
      }
      : null
    const continuityAwareness = normalizeStructuredPreDialogueAwarenessPayload(
      (normalizedContinuity?.preDialogueAwareness ?? null) as Record<string, unknown> | null,
    )
    const latestLandedProgress = normalizedContinuity
      ? [
          normalizedContinuity.latestLandedProgress,
          normalizedContinuity.latestProgress,
          normalizedContinuity.landedProgressSummary,
        ].map(value => typeof value === 'string' ? value.trim() : '').find(value => value.length > 0) ?? null
      : null
    const rebuiltIdentity = buildSharedPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: normalizedContinuity
        ? {
            ...normalizedContinuity,
            latestLandedProgress,
            preDialogueAwareness: continuityAwareness,
          } as AlicizationProjectStateContinuitySnapshot
        : null,
      preDialogueClosureSnapshot: normalizedClosure,
      preDialogueAwarenessSnapshot: normalizedAwareness,
      continuitySummary: normalizedContinuity?.continuitySummary ?? null,
    })

    return upgradeExplicitPreDialogueSendIdentity(
      input.preDialogueSendIdentity ?? null,
      rebuiltIdentity,
    )
  }

  function resolvePreDialogueSendIdentityForTurn(input: {
    preDialogueSendIdentity?: ChatStreamEventContext['preDialogueSendIdentity']
    sessionMessages?: ChatAssistantMessage[]
    preferInspectorSnapshots?: boolean
  }): ChatStreamEventContext['preDialogueSendIdentity'] {
    const inspectorProjectStateContinuitySnapshot = selfEvolutionInspector.projectStateContinuitySnapshot
    const inspectorPreDialogueClosureSnapshot = selfEvolutionInspector.preDialogueClosureSnapshot
    const inspectorPreDialogueAwarenessSnapshot = selfEvolutionInspector.preDialogueAwarenessSnapshot
    const fallbackProjectStateContinuitySnapshot
      = inspectorProjectStateContinuitySnapshot
        ? null
        : deriveFallbackProjectStateContinuitySnapshotFromSessionMessages(input.sessionMessages ?? [])
    const effectiveProjectStateContinuitySnapshot = input.preferInspectorSnapshots === false
      ? fallbackProjectStateContinuitySnapshot ?? inspectorProjectStateContinuitySnapshot
      : inspectorProjectStateContinuitySnapshot ?? fallbackProjectStateContinuitySnapshot
    const shouldTreatContinuityAwarenessAsExplicitSnapshot = Boolean(
      !inspectorPreDialogueAwarenessSnapshot
      && inspectorProjectStateContinuitySnapshot
      && effectiveProjectStateContinuitySnapshot
      && effectiveProjectStateContinuitySnapshot === inspectorProjectStateContinuitySnapshot,
    )
    const effectivePreDialogueClosureSnapshot = inspectorPreDialogueClosureSnapshot
      ?? effectiveProjectStateContinuitySnapshot?.preDialogueClosure
      ?? null
    const effectivePreDialogueAwarenessSnapshot = inspectorPreDialogueAwarenessSnapshot
      ?? (
        shouldTreatContinuityAwarenessAsExplicitSnapshot
          ? effectiveProjectStateContinuitySnapshot?.preDialogueAwareness ?? null
          : null
      )
      ?? deriveStructuredPreDialogueAwarenessFromClosure(
        effectivePreDialogueClosureSnapshot
          ? toAlicizationPreDialogueClosurePayload(effectivePreDialogueClosureSnapshot as {
              status: 'grounded' | 'partial' | 'drift'
              summaryLine: string | null
              companionHeadlineLine?: string | null
              sameHerDriftRiskLine?: string | null
              companionBriefingLine?: string | null
              companionNextClosureLine?: string | null
              emotionalClosureCue?: string | null
              briefingLines?: string[]
              reasons: string[]
            })
          : null,
      )
      ?? null

    return buildPreDialogueSendIdentityFromSnapshots({
      preDialogueSendIdentity: input.preDialogueSendIdentity,
      projectStateContinuitySnapshot: effectiveProjectStateContinuitySnapshot as unknown as Record<string, unknown> | null,
      preDialogueClosureSnapshot: effectivePreDialogueClosureSnapshot as Record<string, unknown> | null,
      preDialogueAwarenessSnapshot: effectivePreDialogueAwarenessSnapshot as Record<string, unknown> | null,
    })
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
    const existingAssistantSessionMessages = selectAssistantMessages(chatSession.getSessionMessages(sessionId))
    const resolvedPreDialogueSendIdentity = resolvePreDialogueSendIdentityForTurn({
      preDialogueSendIdentity: options.preDialogueSendIdentity,
      sessionMessages: existingAssistantSessionMessages,
    })
    let effectivePreDialogueSendIdentity = resolvedPreDialogueSendIdentity
    const streamingMessageContext: ChatStreamEventContext = {
      sessionId,
      message: { role: 'user', content: sendingMessage, createdAt: sendingCreatedAt, id: nanoid() },
      contexts: chatContext.getContextsSnapshot(),
      composedMessage: [],
      input: options.input,
      preDialogueSendIdentity: effectivePreDialogueSendIdentity,
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
    const assistantSessionMessagesForSend = selectAssistantMessages(sessionMessagesForSend)
    effectivePreDialogueSendIdentity = resolvePreDialogueSendIdentityForTurn({
      preDialogueSendIdentity: options.preDialogueSendIdentity,
      sessionMessages: assistantSessionMessagesForSend,
    })
    streamingMessageContext.preDialogueSendIdentity = effectivePreDialogueSendIdentity
    let userTurnMessageId: string | null = null
    let assistantOutputCommitted = false
    let runtimeAuthoritativeVisibleReplyBlocked = false
    let runtimeAuthoritativeModelTextObserved = false
    let turnMindGovernance: AlicizationMindTurnGovernance | null = null
    let turnEmbodiment: AlicizationDialogueEmbodimentEnvelope | null = null
    let turnEmbodimentScript: AlicizationEmbodimentScriptV1 | null = null
    let turnSpeechTimeline: AlicizationDialogueSpeechTimeline | null = null
    let turnDigitalLife: AlicizationDigitalLifeEnvelope | null = null
    let turnDigitalLifeSpine: AlicizationDigitalLifeSpineDigest | null = null
    let turnRuntimeDigest: AlicizationRuntimeDigest | null = null
    let turnProjectState: StructuredOutputResult['projectState'] = null
    let turnPreDialogueClosure: ChatAssistantStructuredPayload['preDialogueClosure'] = null
    let turnPreDialogueAwareness: AlicizationPreDialogueAwarenessPayload | null = null
    let turnVisibleReplyExecution: AlicizationConversationTurnInput['visibleReplyExecution'] | null = null
    let turnVisibleReplyCritic: AlicizationConversationTurnInput['visibleReplyCritic'] | null = null
    let turnVisibleReplyClosure: AlicizationConversationTurnInput['visibleReplyClosure'] | null = null
    const turnToolCalls: ToolMessage[] = []

    const getTurnStructuredRuntimeMeta = () => {
      const preDialogueAwareness
        = turnPreDialogueAwareness
          ?? toStructuredPreDialogueAwarenessPayload(effectivePreDialogueSendIdentity)
          ?? deriveStructuredPreDialogueAwarenessFromClosure(turnPreDialogueClosure)
      return {
        embodiment: turnEmbodiment,
        embodimentScript: turnEmbodimentScript,
        speechTimeline: turnSpeechTimeline,
        digitalLife: turnDigitalLife,
        digitalLifeSpine: turnDigitalLifeSpine,
        runtimeDigest: turnRuntimeDigest,
        projectState: turnProjectState,
        preDialogueClosure: turnPreDialogueClosure,
        preDialogueAwareness,
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
      turnProjectState = normalizeStructuredProjectStatePayload(
        ((event.projectState ?? event.runtimeDigest?.projectState ?? turnProjectState ?? null) as Record<string, unknown> | null),
      ) ?? turnProjectState
      turnPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
        (event.preDialogueAwareness ?? turnPreDialogueAwareness ?? null) as Record<string, unknown> | null,
      ) ?? turnPreDialogueAwareness
    }

    const setStagedAssistantResolution = (resolution: StagedAssistantResolution) => {
      stagedAssistantResolution = resolution
      finalAssistantDisplayText = resolution.reply
      return resolution
    }

    let turnPersonalityState: AlicizationPersonalityState | null = null
    let hasVisualAttachment = false
    let inspectionLikeTurn = false

    const stageAssistantFallback = (
      replyText: string,
      emotion: StructuredOutputResult['emotion'] = 'neutral',
      reasoning = '',
      structuredOverride?: StructuredWithContract,
    ) => {
      const normalizedReply = replyText.trim() || assistantStructuredContractFallbackReply(sendingMessage)
      return setStagedAssistantResolution({
        structured: structuredOverride ?? createStructuredFallback(normalizedReply, emotion, sendingMessage),
        categorization: {
          speech: normalizedReply,
          reasoning,
        },
        reply: normalizedReply,
        visibleReplySource: 'renderer-local',
      })
    }

    const isAlicizationUserTurn = () =>
      (options.origin ?? 'ui-user') === 'ui-user'
      && hasAlicizationBridge()

    const isRendererRuntimeAuthoritativeBridgeMode = () => {
      if (!isAlicizationUserTurn())
        return false
      return Boolean(getAlicizationBridge().streamChat)
    }

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
          visibleReplyCritic: turnVisibleReplyCritic,
          visibleReplyClosure: turnVisibleReplyClosure,
          governance: turnMindGovernance,
          createdAt: Date.now(),
        }).catch(() => {})
      }
    }

    async function finalizeGovernedStructuredOutput(
      input: {
        structured: StructuredWithContract
        fallbackReply?: string
        personalityState: AlicizationPersonalityState | null
        preferGroundedEvidence: boolean
      },
    ): Promise<StructuredWithContract> {
      const governedSurface = enforceGovernedMindTurn({
        structured: input.structured,
        governance: turnMindGovernance,
        personalityState: input.personalityState,
        preferGroundedEvidence: input.preferGroundedEvidence,
        fallbackReply: input.fallbackReply,
        userText: sendingMessage,
        translate: (path, params) => translateGovernedMindFallback(path, params, sendingMessage),
      })
      const governed = mergeStructuredRuntimeMeta({
        ...input.structured,
        ...governedSurface,
      }, getTurnStructuredRuntimeMeta())

      if (
        turnMindGovernance
        && (
          governedSurface.format !== input.structured.format
          || governedSurface.thought !== input.structured.thought
          || governedSurface.reply !== input.structured.reply
          || governedSurface.emotion !== input.structured.emotion
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
            previousFormat: input.structured.format ?? 'unknown',
            nextFormat: governedSurface.format,
            turnMode: turnMindGovernance.turnMode,
            repairState: turnMindGovernance.repairState,
            changedThought: governedSurface.thought !== input.structured.thought,
            changedReply: governedSurface.reply !== input.structured.reply,
            changedEmotion: governedSurface.emotion !== input.structured.emotion,
          },
        })
      }

      return governed
    }

    const commitAssistantResolution = async () => {
      if (runtimeAuthoritativeVisibleReplyBlocked)
        return ''

      if (assistantTextCommitted)
        return finalAssistantDisplayText

      const staged = stagedAssistantResolution
      const fallbackReply = (
        staged?.reply
        || finalAssistantDisplayText
        || stagedSpeechDraft
        || stringifyAssistantContent(buildingMessage.content)
      ).trim()

      if (!fallbackReply)
        return ''

      if (isRendererRuntimeAuthoritativeBridgeMode()) {
        const stagedSource = staged?.visibleReplySource ?? null
        if (stagedSource !== 'runtime-model' || !runtimeAuthoritativeModelTextObserved) {
          await blockRuntimeAuthoritativeLocalVisibleReply({
            action: 'runtime-authoritative-renderer-finalization-blocked',
            message: 'Renderer blocked local finalization because runtime-authoritative visible replies must come from main-runtime model text.',
            details: {
              stagedSource,
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
        ensureRuntimeAuthoritativeVisibleReplyExecution()
      }
      else if (shouldBlockRendererLocalVisibleReply() && staged?.visibleReplySource === 'renderer-local') {
        await blockRuntimeAuthoritativeLocalVisibleReply({
          action: 'renderer-local-visible-fallback-blocked',
          message: 'Renderer blocked local fallback finalization because Alicization visible replies must be model-authored.',
          details: {
            hasStagedReply: Boolean(staged.reply.trim()),
            hasFinalAssistantDisplayText: Boolean(finalAssistantDisplayText.trim()),
            hasStagedSpeechDraft: Boolean(stagedSpeechDraft.trim()),
            hasBuildingContent: Boolean(stringifyAssistantContent(buildingMessage.content).trim()),
          },
          level: 'critical',
        })
        return ''
      }

      const structured = staged?.structured ?? createStructuredFallback(fallbackReply, 'neutral', sendingMessage)
      const structuredWithGovernance = await finalizeGovernedStructuredOutput({
        structured,
        fallbackReply,
        personalityState: turnPersonalityState,
        preferGroundedEvidence: inspectionLikeTurn || hasVisualAttachment,
      })
      const structuredWithRuntimeMeta = mergeStructuredRuntimeMeta(
        structuredWithGovernance,
        getTurnStructuredRuntimeMeta(),
      )
      const finalReply = structuredWithRuntimeMeta.reply.trim() || fallbackReply
      const categorization = staged?.categorization ?? {
        speech: finalReply,
        reasoning: '',
      }
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

      hasVisualAttachment = contentParts.some(part => part.type === 'image_url')
      inspectionLikeTurn = origin === 'ui-user' && detectInvitedInspectionLikeTurn({
        message: sendingMessage,
        recentMessages: sessionMessagesForSend.slice(0, -1),
      })
      const preferLocalContractRepair = hasVisualAttachment || inspectionLikeTurn || Boolean(turnMindGovernance)
      const strictEpoch1Mode = alicizationChatRuntimeFlags.epoch1StrictModeEnabled && hasAlicizationBridge()
      const realtimeIntent = hasAlicizationBridge() && origin === 'ui-user'
        ? detectRealtimeQueryIntent(sendingMessage)
        : detectRealtimeQueryIntent('')
      const alicizationBridge = hasAlicizationBridge() ? getAlicizationBridge() : null
      const runtimeAuthoritativeBridge = Boolean(alicizationBridge?.streamChat)
      if (hasAlicizationBridge()
        && runtimeAuthoritativeBridge
        && needsPreDialogueSendIdentityUpgrade(options.preDialogueSendIdentity ?? null)) {
        await selfEvolutionInspector.refresh()
      }
      effectivePreDialogueSendIdentity = resolvePreDialogueSendIdentityForTurn({
        preDialogueSendIdentity: options.preDialogueSendIdentity,
        sessionMessages: assistantSessionMessagesForSend,
      })
      streamingMessageContext.preDialogueSendIdentity = effectivePreDialogueSendIdentity
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
      let effectiveRuntimeGatewayToolingPolicy = runtimeGatewayToolingPolicy
      const parsedReminderIntent = requiresReminderToolCall
        ? parseReminderIntentPayload(sendingMessage)
        : null
      let policyLockedReason: StructuredPolicyLock | undefined
      let realtimeIntentSettledByEvidence = false
      let realtimeGovernedFallbackReply = ''
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
                  preDialogueSendIdentity: toAlicizationChatStartPreDialogueSendIdentity(effectivePreDialogueSendIdentity),
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
                      turnVisibleReplyCritic = (event as { visibleReplyCritic?: AlicizationConversationTurnInput['visibleReplyCritic'] }).visibleReplyCritic ?? turnVisibleReplyCritic
                      turnVisibleReplyClosure = (event as { visibleReplyClosure?: AlicizationConversationTurnInput['visibleReplyClosure'] }).visibleReplyClosure ?? turnVisibleReplyClosure
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
            onStreamEvent: async (event) => {
              if (event.type === 'meta')
                touch('liveness')
              if (event.type === 'finish') {
                turnVisibleReplyExecution = (event as { visibleReplyExecution?: AlicizationConversationTurnInput['visibleReplyExecution'] }).visibleReplyExecution ?? turnVisibleReplyExecution
                turnVisibleReplyCritic = (event as { visibleReplyCritic?: AlicizationConversationTurnInput['visibleReplyCritic'] }).visibleReplyCritic ?? turnVisibleReplyCritic
                turnVisibleReplyClosure = (event as { visibleReplyClosure?: AlicizationConversationTurnInput['visibleReplyClosure'] }).visibleReplyClosure ?? turnVisibleReplyClosure
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
        const sameHerFirstValidation = Boolean(
          turnPreDialogueClosure
          && (
            turnPreDialogueClosure.status === 'partial'
            || turnPreDialogueClosure.status === 'drift'
            || turnPreDialogueClosure.reasons.some((reason) => {
              const normalized = reason.toLowerCase()
              return normalized.includes('project-state-same-her-continuity-required')
                || normalized.includes('semantic-judge:project-state-same-her-missing')
                || normalized.includes('primary open life loop still centers on')
                || normalized.includes('next closure target is still')
                || normalized.includes('same-her embodiment is now only being carried by')
                || normalized.includes('resident body continuity')
                || normalized.includes('resident-body continuity')
                || normalized.includes('same-her body line')
                || normalized.includes('one living her')
            })
          ),
        )
        let candidate: StructuredWithContract = mergeStructuredRuntimeMeta(
          normalizeStructuredOutput({
            fullText: payload.fullText,
            thought: payload.reasoning,
            reply: payload.reply,
            previousEmotion: getPreviousAssistantEmotion(),
          }),
          getTurnStructuredRuntimeMeta(),
        )

        let validationIssues = hasStructuredJsonContract(candidate)
          ? validateStructuredContract(candidate, turnPersonalityState, {
              toolDenied: turnToolEvidence.deniedBySafety,
              denialSource: turnToolEvidence.denialSource,
              reminderScheduled: turnToolEvidence.reminderScheduled,
              reminderMessage: turnToolEvidence.reminderMessage,
              sameHerFirst: sameHerFirstValidation,
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
            validationContext: {
              sameHerFirst: sameHerFirstValidation,
            },
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
              sameHerFirst: sameHerFirstValidation,
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
                  sameHerFirstValidation,
                },
              })
              return locallyRepaired
            }
          }
        }

        const candidateReply = candidate.reply?.trim() ?? ''
        const replyLooksUsable = Boolean(
          candidateReply
          && !looksLikeAlicizationStructuredPayloadText(candidateReply),
        )
        if (hasAlicizationBridge() && replyLooksUsable) {
          const sanitizedCandidateReply = sanitizeStructuredReplySurface(candidateReply) || candidateReply
          const authoritativeEmbodimentScript
            = normalizeAlicizationEmbodimentScript(candidate.embodimentScript ?? null)
              ?? normalizeAlicizationEmbodimentScript(getTurnStructuredRuntimeMeta().embodimentScript ?? null)
              ?? candidate.embodimentScript
              ?? getTurnStructuredRuntimeMeta().embodimentScript
              ?? null
          const inferredPerformanceManifest = inferPerformanceManifestFromEmbodimentScript({
            performance: candidate.performance,
            script: authoritativeEmbodimentScript,
          })
          const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
            candidateEmotion: candidate.emotion,
            candidatePerformance: candidate.performance,
            governance: turnMindGovernance,
            performanceManifest: inferredPerformanceManifest,
            previous: getPreviousAssistantEmbodiment(),
            reply: sanitizedCandidateReply,
            thought: candidate.thought.trim() || payload.reasoning.trim(),
            turnId,
          })
          const speechTimeline = candidate.speechTimeline ?? buildAlicizationDialogueSpeechTimeline({
            reply: sanitizedCandidateReply,
            candidateEmotion: resolvedEmbodiment.emotion,
            candidatePerformance: resolvedEmbodiment.performance,
            embodiment: resolvedEmbodiment,
            performanceManifest: inferredPerformanceManifest,
          })
          const digitalLife
            = resolveChatRuntimeDigitalLifeAuthority({
              digitalLife: candidate.digitalLife ?? null,
              embodimentScript: authoritativeEmbodimentScript,
            })
            ?? buildAlicizationDigitalLifeEnvelope({
              embodiment: resolvedEmbodiment,
              speechTimeline,
              digitalLifeSpine: candidate.digitalLifeSpine ?? null,
              performanceManifest: inferredPerformanceManifest,
            })
          const bestEffort: StructuredWithContract = {
            ...candidate,
            thought: candidate.thought.trim() || payload.reasoning.trim(),
            emotion: resolvedEmbodiment.emotion,
            reply: sanitizedCandidateReply,
            performance: resolvedEmbodiment.performance,
            embodiment: resolvedEmbodiment,
            embodimentScript: authoritativeEmbodimentScript ?? candidate.embodimentScript ?? null,
            speechTimeline,
            digitalLife,
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
          candidate = mergeStructuredRuntimeMeta(candidate, getTurnStructuredRuntimeMeta())
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

        const fallbackReply = candidateReply && !looksLikeAlicizationStructuredPayloadText(candidateReply)
          ? candidateReply
          : createContractFallbackReply(turnPersonalityState, {
              toolDenied: turnToolEvidence.deniedBySafety,
              denialSource: turnToolEvidence.denialSource,
              reminderScheduled: turnToolEvidence.reminderScheduled,
            }, sendingMessage)
        const fallback = shouldBlockRendererLocalVisibleReply()
          ? createAlicizationBlockedRendererFallback(
              'structured-contract-local-visible-fallback-blocked',
              candidate.projectState,
              candidate.digitalLife ?? null,
            )
          : createStructuredFallback(fallbackReply, createContractFallbackEmotion(turnPersonalityState, {
              toolDenied: turnToolEvidence.deniedBySafety,
              denialSource: turnToolEvidence.denialSource,
              reminderScheduled: turnToolEvidence.reminderScheduled,
            }), sendingMessage, candidate.projectState, candidate.digitalLife ?? null)
        await appendAlicizationAuditLog({
          level: shouldBlockRendererLocalVisibleReply() ? 'critical' : 'warning',
          category: 'structured-output',
          action: 'contract-fallback',
          message: shouldBlockRendererLocalVisibleReply()
            ? 'Structured contract failed after retry; renderer blocked local fallback visible speech for Alicization.'
            : 'Structured contract failed after retry and switched to fallback-v1.',
          details: {
            parsePath: candidate.parsePath,
            emotion: candidate.emotion,
            violations: summarizeValidationIssues(validationIssues),
          },
        })
        if (shouldBlockRendererLocalVisibleReply()) {
          if (candidate.projectState) {
            blockedStructuredTurnForPersistence = {
              ...fallback,
            }
          }
          await blockRuntimeAuthoritativeLocalVisibleReply({
            action: 'structured-contract-local-visible-fallback-blocked',
            message: 'Renderer blocked structured-contract fallback because Alicization visible replies must be model-authored.',
            details: {
              parsePath: candidate.parsePath,
              emotion: candidate.emotion,
              violations: summarizeValidationIssues(validationIssues),
            },
            level: 'critical',
          })
        }
        return fallback
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
        }, sendingMessage)
        if (shouldBlockRendererLocalVisibleReply() && payload.enforceContract === false) {
          await blockRuntimeAuthoritativeLocalVisibleReply({
            action: 'renderer-local-non-contract-visible-fallback-blocked',
            message: 'Renderer blocked non-contract fallback because Alicization visible replies must be model-authored.',
            details: {
              hasPayloadReply: Boolean(payload.reply.trim()),
              policyLocked: payload.policyLocked ?? null,
            },
            level: 'critical',
          })
        }
        const structured = payload.enforceContract === false
          ? createStructuredFallback(nonContractReply, createContractFallbackEmotion(turnPersonalityState, {
              toolDenied: turnToolEvidence.deniedBySafety,
              denialSource: turnToolEvidence.denialSource,
              reminderScheduled: turnToolEvidence.reminderScheduled,
            }), sendingMessage)
          : await buildStructuredOutputWithGuard(payload)
        if (payload.policyLocked) {
          structured.policyLocked = payload.policyLocked
        }
        const governedStructured = await finalizeGovernedStructuredOutput({
          structured,
          fallbackReply: nonContractReply,
          personalityState: turnPersonalityState,
          preferGroundedEvidence: inspectionLikeTurn || hasVisualAttachment,
        })
        const governedStructuredWithRuntimeMeta = mergeStructuredRuntimeMeta(
          governedStructured,
          getTurnStructuredRuntimeMeta(),
        )
        const governedReply = governedStructuredWithRuntimeMeta.reply.trim()
        const safeFallbackReply = nonContractReply
          || assistantStructuredContractFallbackReply(sendingMessage)
        const finalReply = (
          governedReply && !looksLikeAlicizationStructuredPayloadText(governedReply)
            ? governedReply
            : payload.reply.trim() && !looksLikeAlicizationStructuredPayloadText(payload.reply)
              ? payload.reply.trim()
              : safeFallbackReply
        )

        if (
          (governedReply && looksLikeAlicizationStructuredPayloadText(governedReply))
          || looksLikeAlicizationStructuredPayloadText(payload.reply)
        ) {
          await appendAlicizationAuditLog({
            level: 'warning',
            category: 'alicization.structured',
            action: 'structured-visible-json-suppressed',
            message: 'Suppressed a raw structured envelope before it could become visible assistant speech.',
            details: {
              sessionId,
              turnId,
              governedReplyStructured: looksLikeAlicizationStructuredPayloadText(governedReply),
              payloadReplyStructured: looksLikeAlicizationStructuredPayloadText(payload.reply),
            },
          })
        }

        return setStagedAssistantResolution({
          categorization: {
            speech: finalReply,
            reasoning: payload.reasoning,
          },
          structured: governedStructuredWithRuntimeMeta,
          reply: finalReply,
          visibleReplySource: 'runtime-model',
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

      const finalizeAssistantTurn = async () => {
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
          buildingMessage.structured = mergeStructuredRuntimeMeta(
            buildingMessage.structured as StructuredWithContract,
            getTurnStructuredRuntimeMeta(),
          )
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
            visibleReplyCritic: turnVisibleReplyCritic,
            visibleReplyClosure: turnVisibleReplyClosure,
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
          && !realtimeIntentSettledByEvidence
          && !policyLockedReason
        const leakFallbackApplied = sanitizedOutput.leakDetected && emptyAfterSanitize
        const emptyOutputFallbackApplied = !realtimeFallbackApplied && !leakFallbackApplied && emptyAfterSanitize
        const sanitizeFallbackReply = policyLockedReason
          ? assistantEpoch1StrictFallbackReply(sendingMessage)
          : realtimeGovernedFallbackReply || assistantLeakFallbackReply(sendingMessage)
        let finalSpeech = sanitizedOutput.cleanText
        if (realtimeFallbackApplied) {
          finalSpeech = assistantRealtimeUnavailableReply(sendingMessage)
        }
        else if (leakFallbackApplied || emptyOutputFallbackApplied) {
          finalSpeech = sanitizeFallbackReply
        }

        if (shouldBlockRendererLocalVisibleReply() && (realtimeFallbackApplied || leakFallbackApplied || emptyOutputFallbackApplied)) {
          await blockRuntimeAuthoritativeLocalVisibleReply({
            action: 'renderer-local-visible-fallback-blocked',
            message: 'Renderer blocked a local fallback visible reply because Alicization turns require model-authored speech.',
            details: {
              realtimeFallbackApplied,
              leakFallbackApplied,
              emptyOutputFallbackApplied,
              fabricationDetected: sanitizedOutput.fabricationDetected,
              leakDetected: sanitizedOutput.leakDetected,
              removedCount: sanitizedOutput.removedCount,
              verifiedToolResult: turnToolEvidence.verifiedToolResult,
              runtimeAuthoritativeModelTextObserved,
            },
          })
          return
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
          await selfEvolutionInspector.refresh()
          const preDialogueClosureSnapshot = selfEvolutionInspector.preDialogueClosureSnapshot
          const preDialogueAwarenessSnapshot = selfEvolutionInspector.preDialogueAwarenessSnapshot
          turnPreDialogueClosure = preDialogueClosureSnapshot
            ? toAlicizationPreDialogueClosurePayload(preDialogueClosureSnapshot)
            : null
          turnPreDialogueAwareness = preDialogueAwarenessSnapshot
            ? normalizeStructuredPreDialogueAwarenessPayload(preDialogueAwarenessSnapshot)
            ?? turnPreDialogueAwareness
            : turnPreDialogueAwareness
          const fallbackProjectStateContinuitySnapshot
            = selfEvolutionInspector.projectStateContinuitySnapshot
              ? null
              : deriveFallbackProjectStateContinuitySnapshotFromSessionMessages(
                  assistantSessionMessagesForSend,
                )
          const effectiveProjectStateContinuitySnapshot
            = selfEvolutionInspector.projectStateContinuitySnapshot
              ?? fallbackProjectStateContinuitySnapshot
          const shouldTreatContinuityAwarenessAsExplicitPromptSnapshot = Boolean(
            !preDialogueAwarenessSnapshot
            && selfEvolutionInspector.projectStateContinuitySnapshot
            && effectiveProjectStateContinuitySnapshot
            && effectiveProjectStateContinuitySnapshot === selfEvolutionInspector.projectStateContinuitySnapshot,
          )
          const effectivePreDialogueAwarenessSnapshot
            = preDialogueAwarenessSnapshot
              ?? (
                shouldTreatContinuityAwarenessAsExplicitPromptSnapshot
                  ? normalizeStructuredPreDialogueAwarenessPayload(
                      (effectiveProjectStateContinuitySnapshot?.preDialogueAwareness ?? null) as Record<string, unknown> | null,
                    )
                  : null
              )
              ?? deriveStructuredPreDialogueAwarenessFromClosure(turnPreDialogueClosure)
              ?? null
          const shouldUpgradeFallbackPromptAwareness = Boolean(
            !preDialogueAwarenessSnapshot
            && fallbackProjectStateContinuitySnapshot,
          )
          const effectivePromptPreDialogueSendIdentity = shouldUpgradeFallbackPromptAwareness
            ? resolvePreDialogueSendIdentityForTurn({
                preDialogueSendIdentity: options.preDialogueSendIdentity,
                sessionMessages: assistantSessionMessagesForSend,
              })
            : null
          if (effectivePromptPreDialogueSendIdentity) {
            effectivePreDialogueSendIdentity = effectivePromptPreDialogueSendIdentity
            streamingMessageContext.preDialogueSendIdentity = effectivePromptPreDialogueSendIdentity
          }
          const effectivePromptPreDialogueAwarenessSnapshot
            = effectivePromptPreDialogueSendIdentity
              ? toStructuredPreDialogueAwarenessPayload(effectivePromptPreDialogueSendIdentity)
              ?? effectivePreDialogueAwarenessSnapshot
              : effectivePreDialogueAwarenessSnapshot
          turnPreDialogueAwareness = effectivePromptPreDialogueAwarenessSnapshot
            ? normalizeStructuredPreDialogueAwarenessPayload(effectivePromptPreDialogueAwarenessSnapshot)
            ?? turnPreDialogueAwareness
            : turnPreDialogueAwareness
          if (!turnProjectState && effectiveProjectStateContinuitySnapshot) {
            turnProjectState = normalizeStructuredProjectStatePayload({
              identity: effectiveProjectStateContinuitySnapshot.identity,
              currentPhase: effectiveProjectStateContinuitySnapshot.currentPhase,
              latestLandedProgress: effectiveProjectStateContinuitySnapshot.latestLandedProgress,
              primaryOpenLoop: effectiveProjectStateContinuitySnapshot.primaryOpenLoop,
              nextClosureTarget: effectiveProjectStateContinuitySnapshot.nextClosureTarget,
              continuitySummary: effectiveProjectStateContinuitySnapshot.continuitySummary ?? null,
              sameHerSelfLine: effectiveProjectStateContinuitySnapshot.sameHerSelfLine ?? null,
              sameHerHoldDetail: effectiveProjectStateContinuitySnapshot.sameHerHoldDetail ?? null,
              sameHerDriftRisk: effectiveProjectStateContinuitySnapshot.sameHerDriftRisk ?? null,
              proactiveSameHerGap: effectiveProjectStateContinuitySnapshot.proactiveSameHerGap ?? null,
            }) ?? turnProjectState
          }
          const composed = composeAlicizationPromptMessages({
            messages: newMessages as Message[],
            soulContent: soulSnapshot?.content ?? null,
            hostName: soulSnapshot?.frontmatter?.profile?.hostName ?? null,
            personalityState: turnPersonalityState,
            contextsSnapshot,
            projectStateContinuitySnapshot: effectiveProjectStateContinuitySnapshot,
            preDialogueAwarenessSnapshot: effectivePromptPreDialogueAwarenessSnapshot,
            preDialogueClosureSnapshot,
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

          if (effectiveProjectStateContinuitySnapshot) {
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'alicization.prompt',
              action: 'project-state-continuity.injected',
              message: selfEvolutionInspector.projectStateContinuitySnapshot
                ? 'Injected latest project-state continuity snapshot before this dialogue turn.'
                : 'Injected fallback project-state continuity snapshot from recent session carry before this dialogue turn.',
              details: {
                turnId,
                sessionId,
                continuitySourceTurnId: effectiveProjectStateContinuitySnapshot.turnId,
                origin: effectiveProjectStateContinuitySnapshot.origin,
                nonHumanAuthoredStatus: effectiveProjectStateContinuitySnapshot.nonHumanAuthoredStatus,
                sameHerSelfLine: effectiveProjectStateContinuitySnapshot.sameHerSelfLine ?? null,
                sameHerHoldDetail: effectiveProjectStateContinuitySnapshot.sameHerHoldDetail ?? null,
                currentPhase: effectiveProjectStateContinuitySnapshot.currentPhase,
                nextClosureTarget: effectiveProjectStateContinuitySnapshot.nextClosureTarget,
              },
            })
          }

          if (preDialogueClosureSnapshot) {
            await appendAlicizationAuditLog({
              level: 'notice',
              category: 'alicization.prompt',
              action: 'pre-dialogue-closure.injected',
              message: 'Injected pre-dialogue closure snapshot before this dialogue turn.',
              details: {
                turnId,
                sessionId,
                status: preDialogueClosureSnapshot.status,
                summaryLine: preDialogueClosureSnapshot.summaryLine,
                sameHerDriftRiskLine: preDialogueClosureSnapshot.sameHerDriftRiskLine ?? null,
                companionBriefingLine: preDialogueClosureSnapshot.companionBriefingLine ?? null,
                companionNextClosureLine: preDialogueClosureSnapshot.companionNextClosureLine ?? null,
                emotionalClosureCue: preDialogueClosureSnapshot.emotionalClosureCue ?? null,
                briefingLines: preDialogueClosureSnapshot.briefingLines ?? [],
                reasons: preDialogueClosureSnapshot.reasons ?? [],
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
      effectivePreDialogueSendIdentity = streamingMessageContext.preDialogueSendIdentity ?? effectivePreDialogueSendIdentity
      turnPreDialogueAwareness = alignPersistedPreDialogueAwarenessCompanionHeadline({
        awareness: turnPreDialogueAwareness,
        preDialogueSendIdentity: effectivePreDialogueSendIdentity,
      })

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
            message: shouldBlockRendererLocalVisibleReply()
              ? 'Strict realtime refusal LLM path failed; renderer blocked local refusal fallback in Alicization mode.'
              : 'Strict realtime refusal LLM path failed, applied fixed fallback reply.',
            details: {
              sessionId,
              turnId,
              reason: error instanceof Error ? error.message : String(error),
            },
          })

          if (shouldBlockRendererLocalVisibleReply()) {
            await blockRuntimeAuthoritativeLocalVisibleReply({
              action: 'epoch1-strict-local-visible-fallback-blocked',
              message: 'Renderer blocked strict realtime refusal fallback speech because Alicization turns require model-authored visible replies.',
              details: {
                reason: error instanceof Error ? error.message : String(error),
              },
              level: 'critical',
            })
            await finalizeAssistantTurn()
            return
          }

          const fallbackReply = assistantEpoch1StrictFallbackReply(sendingMessage)
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

          turnToolEvidence.toolCallCount += realtimeExecution.trace.toolEvidence.toolCallCount
          turnToolEvidence.toolResultCount += (
            realtimeExecution.trace.toolEvidence.successCount
            + realtimeExecution.trace.toolEvidence.failureCount
          )
          turnToolEvidence.verifiedToolResult = (
            turnToolEvidence.verifiedToolResult
            || realtimeExecution.trace.toolEvidence.verifiedToolResult
          )
          realtimeIntentSettledByEvidence = true
          realtimeGovernedFallbackReply = realtimeExecution.reply?.trim() || assistantRealtimeUnavailableReply(sendingMessage)
          effectiveRuntimeGatewayToolingPolicy = {
            supportsTools: false,
            waitForTools: false,
            toolingRequired: false,
          }
          newMessages = insertSystemMessageBeforeLatestUser(newMessages as Message[], buildRealtimeEvidenceSystemPrompt({
            message: sendingMessage,
            evidences: realtimeExecution.evidences,
            failedCategories: realtimeExecution.failedCategories,
            fallbackReply: realtimeGovernedFallbackReply,
          })) as any
          streamingMessageContext.composedMessage = newMessages as Message[]
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'execution-engine',
            action: 'realtime-evidence-injected',
            message: 'Injected settled realtime evidence into the governed reply prompt instead of replying directly from renderer state.',
            details: {
              sessionId,
              turnId,
              evidenceCount: realtimeExecution.evidences.length,
              failedCategories: realtimeExecution.failedCategories,
              verifiedToolResult: realtimeExecution.trace.toolEvidence.verifiedToolResult,
            },
          })
        }
      }

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
        supportsTools: effectiveRuntimeGatewayToolingPolicy.supportsTools,
        abortSignal,
        // NOTICE: xsai stream may emit `finish` before tool steps continue, so keep waiting until
        // the final non-tool finish to avoid ending the chat turn with no assistant reply.
        waitForTools: effectiveRuntimeGatewayToolingPolicy.waitForTools,
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
          shouldForceExecutionToolRetry
            ? buildExecutionToolCallCriticalRetryDirective([...requiredExecutionToolNames])
            : '',
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

      const stagedResolution = stagedAssistantResolution as StagedAssistantResolution | null
      const stagedExecutorPayoffReply = stagedResolution && typeof stagedResolution.reply === 'string'
        ? stagedResolution.reply
        : finalAssistantDisplayText || stagedSpeechDraft

      const shouldForceExecutionResultPayoffRetry = requiresExecutionToolCall
        && turnToolEvidence.latestExecutorResult !== null
        && !turnToolEvidence.sawTextAfterExecutorResult
        && !replyMentionsExecutorEvidence(
          stagedExecutorPayoffReply,
          turnToolEvidence.latestExecutorResult,
        )
        && !policyLockedReason
        && !abortSignal.aborted
        && !shouldAbort()

      if (
        requiresExecutionToolCall
        && turnToolEvidence.latestExecutorResult !== null
        && !turnToolEvidence.sawTextAfterExecutorResult
        && !shouldForceExecutionResultPayoffRetry
      ) {
        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'alicization.intent-action',
          action: 'executor-result-payoff-retry-skipped',
          message: 'Skipped executor payoff retry because the staged reply already carries settled execution evidence.',
          details: {
            sessionId,
            turnId,
            stagedReplyPreview: sanitizeExecutorReplyEvidenceText(
              stagedExecutorPayoffReply,
              160,
            ),
            executorSummary: turnToolEvidence.latestExecutorResult.summary,
            executorStatus: turnToolEvidence.latestExecutorResult.status,
          },
        })
      }

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
            if (fallbackReply && !shouldBlockRendererLocalVisibleReply()) {
              stageAssistantFallback(
                fallbackReply,
                turnToolEvidence.latestExecutorResult.status === 'failed'
                || turnToolEvidence.latestExecutorResult.status === 'blocked'
                || turnToolEvidence.latestExecutorResult.status === 'cancelled'
                  ? 'concerned'
                  : 'neutral',
              )
            }
            else if (fallbackReply && shouldBlockRendererLocalVisibleReply()) {
              await blockRuntimeAuthoritativeLocalVisibleReply({
                action: 'executor-payoff-local-visible-fallback-blocked',
                message: 'Renderer blocked executor-summary fallback speech because execution payoff must be model-authored in Alicization mode.',
                details: {
                  executorSummary: turnToolEvidence.latestExecutorResult.summary,
                  executorStatus: turnToolEvidence.latestExecutorResult.status,
                },
              })
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
          if (fallbackReply && !shouldBlockRendererLocalVisibleReply()) {
            stageAssistantFallback(fallbackReply)
          }
          else if (fallbackReply && shouldBlockRendererLocalVisibleReply()) {
            await blockRuntimeAuthoritativeLocalVisibleReply({
              action: 'executor-payoff-blocked-retry-local-visible-fallback-blocked',
              message: 'Renderer blocked executor-summary fallback speech after payoff retry sanitization was blocked.',
              details: {
                executorSummary: turnToolEvidence.latestExecutorResult.summary,
                executorStatus: turnToolEvidence.latestExecutorResult.status,
                reason: sanitizedPayoffRetry.reason,
              },
              level: 'critical',
            })
          }
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

        const reminderFailureReply = mindRepairText('reminder-schedule-failed', sendingMessage)
        if (shouldBlockRendererLocalVisibleReply()) {
          await blockRuntimeAuthoritativeLocalVisibleReply({
            action: 'reminder-failure-local-visible-fallback-blocked',
            message: 'Renderer blocked reminder failure fallback speech because Alicization turns require model-authored visible replies.',
            details: {
              reminderToolCallCount: turnToolEvidence.reminderToolCallIds.size,
            },
          })
        }
        else {
          stageAssistantFallback(reminderFailureReply, 'concerned')
        }
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
        if (shouldBlockRendererLocalVisibleReply()) {
          const fallback = resolveStreamFailureFallback(error, sendingMessage)
          await blockRuntimeAuthoritativeLocalVisibleReply({
            action: 'runtime-authoritative-local-failure-reply-blocked',
            message: 'Renderer blocked local failure reply because Alicization turns require model-authored visible speech.',
            details: {
              reason: error instanceof Error ? error.message : String(error),
              fallbackKind: fallback.kind,
              visibleReplyClosure: turnVisibleReplyClosure,
              visibleReplyExecution: turnVisibleReplyExecution,
            },
          })
          throw createRuntimeAuthoritativeVisibleReplyBlockedError()
        }

        const fallback = resolveStreamFailureFallback(error, sendingMessage)
        const fallbackReply = fallback.reply
        stageAssistantFallback(
          fallbackReply,
          'concerned',
          '',
          createFailureStructuredFallback({
            kind: fallback.kind,
            replyText: fallbackReply,
            emotion: 'concerned',
            userText: sendingMessage,
          }),
        )
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
            structured: normalizeStructuredTurnForPersistence(
              asStructuredWithContract(buildingMessage.structured)
                ? { ...asStructuredWithContract(buildingMessage.structured)! }
                : undefined,
            ),
            visibleReplyExecution: turnVisibleReplyExecution,
            visibleReplyCritic: turnVisibleReplyCritic,
            visibleReplyClosure: turnVisibleReplyClosure,
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
          toolCalls: [...turnToolCalls],
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
