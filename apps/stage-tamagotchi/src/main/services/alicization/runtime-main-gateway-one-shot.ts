import type { CommonContentPart, Message } from '@xsai/shared-chat'

import type {
  AlicizationAuditLogInput,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput, AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationExecutionCallbackContext } from './execution-callback-runtime'
import type { AlicizationMainGatewayGenerateTextProviderOptions, AlicizationMainGatewaySource } from './project-state-gateway-contract'
import type {
  DesktopCaptureAccessResult,
  MainGatewayResolvedConfig,
  ResolvedCardCustomDirectives,
  ScreenSemanticCacheState,
} from './runtime-soul'
import type { deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot } from './sensory-capture'

import { errorMessageFrom } from '@moeru/std'
import { buildAlicizationScreenSurfaceCue, isWeakAlicizationScreenSurfaceCue } from '@proj-alicization/stage-shared'
import { generateText } from '@xsai/generate-text'

import { getActiveAttentionAnchor } from './attention-anchor'
import { buildAlicizationDigitalLifeArchitectureSystemBlock } from './digital-life-architecture'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { emptyAlicizationExecutionCallbackContext } from './execution-callback-runtime'
import { carriesAlicizationCanonicalProjectState } from './main-chat-project-state-guard'
import { buildCardCustomDirectivesSystemBlock } from './main-chat-runtime-surface'
import { createAbortError } from './main-chat-stream-primitives'
import { parseScreenSemanticSummary, pickScreenSemanticCaptureCandidate } from './proactive-screen-semantic'
import {
  alicizationProjectStateAnswerContractLines,
  alicizationProjectStateAnswerMustDo,
} from './project-state-answer-governance'
import {
  buildAlicizationProjectPreDialogueAwareness,
  buildAlicizationProjectPreDialogueAwarenessLine,
  buildAlicizationProjectPreDialogueClosure,
  buildAlicizationProjectStateClosureDashboard,
  buildAlicizationProjectStateExtraSystemBlocks,
  buildAlicizationProjectStateSystemBlock,
  looksLikeThinProjectClosureShell,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStatusBrief,
  resolveAlicizationSurfaceProjectStateSnapshot,
} from './project-state-brief'
import {

  isAlicizationProjectStateAuditedMainGatewaySource,
  isAlicizationProjectStateUnauditedMainGatewaySource,
  resolveAlicizationProjectStateAuditFamilyForMainGatewaySource,
} from './project-state-gateway-contract'
import { buildCompressedNativeImageDataUrl, readStringValue } from './runtime-governance'
import { sanitizeBriefText } from './runtime-realtime'
import {
  normalizeCardId,
  proactiveScreenSemanticCacheTtlMs,
  proactiveScreenSemanticFailureTtlMs,
  proactiveScreenSemanticImageJpegQuality,
  proactiveScreenSemanticImageMaxHeight,
  proactiveScreenSemanticImageMaxWidth,
  proactiveScreenSemanticTimeoutMs,
  sanitizeMultilineText,
  sanitizeText,
} from './runtime-soul'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

export interface AlicizationMainGatewayTextProviderOptions extends AlicizationMainGatewayGenerateTextProviderOptions<AlicizationMainGatewaySource, Message['content']> {
  cardId?: string
  extraSystemBlocks?: string[]
  injectCustomDirectives?: boolean
  injectPerformanceManifest?: boolean
  agentTurn?: AlicizationAgentTurnRuntime | null
  agentTurnInput?: {
    turnId: string
    decisionTraceId?: string | null
  }
  captureAgentSensorySnapshot?: boolean
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}

export interface AlicizationMainGatewayTextProvider {
  (input: AlicizationMainGatewayTextProviderOptions): Promise<string | null>
}

interface MainGatewayOneShotGenerateTextOptions extends AlicizationMainGatewayTextProviderOptions {}

type AlicizationOneShotEmotionalKernelShape = NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']['emotionalKernel']>

interface OneShotPromptCompactionResult {
  messages: Message[]
  compacted: boolean
  beforeChars: number
  afterChars: number
  maxChars: number
  compactedMessageCount: number
}

interface CreateAlicizationMainGatewayOneShotRuntimeOptions {
  getActiveCardId: () => string
  getActiveProviderId: () => string
  getActiveModelId: () => string
  openAgentTurn: (input: {
    cardId: string
    turnId: string
    decisionTraceId?: string | null
  }) => Promise<AlicizationAgentTurnRuntime>
  resolveMainGatewayConfig: (input?: {
    cardId?: string
    providerId?: string
    model?: string
    providerConfig?: Record<string, unknown>
  }) => MainGatewayResolvedConfig | null
  rememberMainGatewayRoute: (input: {
    cardId?: string
    mainGateway: Pick<MainGatewayResolvedConfig, 'providerId' | 'model'>
    providerConfig?: Record<string, unknown>
  }) => void
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  resolveCardCustomDirectives: (cardId: string, options?: { messages?: Message[] }) => Promise<ResolvedCardCustomDirectives>
  buildPendingExecutionCallbackContext: (input: {
    consume?: boolean
    sessionId: string
  }) => Promise<AlicizationExecutionCallbackContext>
  resolveAgentSessionContinuityContext: (cardId: string, options: {
    digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<{ digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null, sessionContinuitySignals: AlicizationAgentSessionContinuityInput[] }>
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  buildPerformanceManifestSystemBlocks: (manifest: CharacterPerformanceCapabilitiesManifest | null) => string[]
  buildAgentTurnContinuitySystemMessages: (input: {
    agentTurn: AlicizationAgentTurnRuntime
    cardId: string
  }) => Message[]
  syncAgentTurnSessionMirror: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    decisionTraceId?: string | null
    sessionId?: string
    source: string
  }) => void
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  describePerceptionTarget: (target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) => string
  buildMainGatewayAgentTurnId: (...segments: Array<unknown>) => string
  screenSemanticCacheByCard: Map<string, ScreenSemanticCacheState>
  ensurePerceptionState: (cardIdRaw: unknown) => Promise<AlicizationPerceptionState>
  getUsablePerceptionSceneResidue: (input: {
    state: AlicizationPerceptionState
    now: number
    maxAgeMs: number
  }) => AlicizationPerceptionSceneResidue | null
  buildScreenSemanticSummaryFromResidue: (residue: AlicizationPerceptionSceneResidue) => import('./proactive-screen-semantic').AlicizationScreenSemanticSummary
  clearDesktopCaptureAccessCache: () => void
  resolveDesktopCaptureAccess: (input: {
    types: Array<'window' | 'screen'>
    thumbnailSize: { width: number, height: number }
  }) => Promise<DesktopCaptureAccessResult>
  getDesktopCaptureAccessRuntimeSnapshot: (input: {
    types: Array<'window' | 'screen'>
    thumbnailSize: { width: number, height: number }
  }) => ReturnType<typeof deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot> | null
  rememberSceneResidue: (input: {
    cardId: string
    now: number
    residue: AlicizationPerceptionSceneResidue
  }) => Promise<AlicizationPerceptionState>
}

function resolveOneShotTextPromptBudgetChars(source: AlicizationMainGatewaySource | null | undefined) {
  if (source === 'proactive')
    return 48_000
  if (source === 'dream' || source === 'reminder')
    return 56_000
  if (source === 'execution-callback')
    return 64_000
  return 72_000
}

function measureOneShotContentTextChars(content: Message['content']) {
  if (typeof content === 'string')
    return content.length
  if (Array.isArray(content)) {
    return content.reduce((total, part) => {
      if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string')
        return total + part.text.length
      return total
    }, 0)
  }
  return 0
}

function measureOneShotMessagesTextChars(messages: Message[]) {
  return messages.reduce((total, message) => total + measureOneShotContentTextChars(message.content), 0)
}

function isOneShotUnshrinkablePromptMessage(message: Message) {
  return typeof message.content !== 'string'
}

function resolveOneShotMinimumPromptChars(index: number, messages: Message[]) {
  const message = messages[index]
  if (!message || typeof message.content !== 'string')
    return 0
  let minimumChars = 0
  if (message.content.includes('[ALICIZATION_PROJECT_STATE]'))
    minimumChars = Math.max(minimumChars, 12_000)
  if (message.content.includes('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'))
    minimumChars = Math.max(minimumChars, 8_000)
  if (message.content.includes('[ALICIZATION_DIALOGUE_SESSION_MIRROR]'))
    minimumChars = Math.max(minimumChars, 12_000)
  if (index === messages.length - 2 && message.role === 'system')
    minimumChars = Math.max(minimumChars, 4_096)
  if (index === messages.length - 1 && message.role === 'user')
    minimumChars = Math.max(minimumChars, 1_024)
  return Math.min(message.content.length, minimumChars)
}

function resolveOneShotMinimumPromptPriority(index: number, messages: Message[]) {
  const message = messages[index]
  if (!message || typeof message.content !== 'string')
    return 99
  if (index === messages.length - 2 && message.role === 'system')
    return 0
  if (index === messages.length - 1 && message.role === 'user')
    return 1
  if (message.content.includes('[ALICIZATION_PROJECT_STATE]'))
    return 2
  if (message.content.includes('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'))
    return 3
  if (message.content.includes('[ALICIZATION_DIALOGUE_SESSION_MIRROR]'))
    return 4
  return 99
}

function truncateOneShotPromptTextBlock(text: string, maxChars: number) {
  if (text.length <= maxChars)
    return text
  if (maxChars <= 0)
    return ''

  const omittedChars = Math.max(0, text.length - maxChars)
  const marker = `\n[truncated: omitted ${omittedChars} chars to stay within main-gateway one-shot prompt budget]\n`
  if (maxChars <= marker.length + 32)
    return `${text.slice(0, Math.max(0, maxChars - marker.length))}${marker.slice(0, maxChars)}`

  const available = maxChars - marker.length
  const headChars = Math.max(64, Math.floor(available * 0.72))
  const tailChars = Math.max(0, available - headChars)
  return `${text.slice(0, headChars).trimEnd()}${marker}${tailChars > 0 ? text.slice(-tailChars).trimStart() : ''}`
}

function compactOneShotMessagesToTextBudget(
  messages: Message[],
  source: AlicizationMainGatewaySource | null | undefined,
): OneShotPromptCompactionResult {
  const maxChars = resolveOneShotTextPromptBudgetChars(source)
  const beforeChars = measureOneShotMessagesTextChars(messages)
  if (beforeChars <= maxChars) {
    return {
      messages,
      compacted: false,
      beforeChars,
      afterChars: beforeChars,
      maxChars,
      compactedMessageCount: 0,
    }
  }

  const stringMessageIndexes = messages
    .map((message, index) => typeof message.content === 'string' ? index : -1)
    .filter(index => index >= 0)
  const shrinkableIndexes = stringMessageIndexes
    .filter(index => !isOneShotUnshrinkablePromptMessage(messages[index]!))
  const fixedChars = messages.reduce((total, message, index) => {
    if (shrinkableIndexes.includes(index))
      return total
    return total + measureOneShotContentTextChars(message.content)
  }, 0)
  const shrinkableBudget = Math.max(0, maxChars - fixedChars)
  const targetCharsByIndex = new Map<number, number>()

  if (shrinkableIndexes.length > 0) {
    const minimumCharsByIndex = new Map<number, number>()
    let remainingBudget = shrinkableBudget
    const minimumRequestIndexes = [...shrinkableIndexes]
      .filter(index => resolveOneShotMinimumPromptChars(index, messages) > 0)
      .sort((left, right) => resolveOneShotMinimumPromptPriority(left, messages) - resolveOneShotMinimumPromptPriority(right, messages))
    for (const index of minimumRequestIndexes) {
      const minimumChars = resolveOneShotMinimumPromptChars(index, messages)
      const allocatedMinimumChars = Math.min(minimumChars, remainingBudget)
      minimumCharsByIndex.set(index, allocatedMinimumChars)
      remainingBudget = Math.max(0, remainingBudget - allocatedMinimumChars)
    }
    let remainingIndexes = [...shrinkableIndexes]

    while (remainingIndexes.length > 0) {
      const perMessageBudget = Math.max(0, Math.floor(remainingBudget / remainingIndexes.length))
      const fittingIndexes = remainingIndexes.filter((index) => {
        const content = messages[index]!.content
        const minimumChars = minimumCharsByIndex.get(index) ?? 0
        return typeof content === 'string' && content.length <= perMessageBudget + minimumChars
      })

      if (fittingIndexes.length === 0) {
        for (const index of remainingIndexes)
          targetCharsByIndex.set(index, perMessageBudget + (minimumCharsByIndex.get(index) ?? 0))
        break
      }

      for (const index of fittingIndexes) {
        const content = messages[index]!.content
        const length = typeof content === 'string' ? content.length : 0
        targetCharsByIndex.set(index, length)
        remainingBudget = Math.max(0, remainingBudget - Math.max(0, length - (minimumCharsByIndex.get(index) ?? 0)))
      }
      remainingIndexes = remainingIndexes.filter(index => !fittingIndexes.includes(index))
    }
  }

  const compactedMessages = messages.map((message, index) => {
    if (typeof message.content !== 'string')
      return message
    const targetChars = targetCharsByIndex.get(index)
    if (targetChars == null || message.content.length <= targetChars)
      return message
    return {
      ...message,
      content: truncateOneShotPromptTextBlock(message.content, targetChars),
    } as Message
  })

  let afterChars = measureOneShotMessagesTextChars(compactedMessages)
  if (afterChars > maxChars) {
    const overflowChars = afterChars - maxChars
    const fallbackShrinkableIndexes = shrinkableIndexes
      .filter((index) => {
        const content = compactedMessages[index]?.content
        return typeof content === 'string' && content.length > 0
      })
      .sort((left, right) => {
        const leftLength = typeof compactedMessages[left]?.content === 'string' ? compactedMessages[left]!.content.length : 0
        const rightLength = typeof compactedMessages[right]?.content === 'string' ? compactedMessages[right]!.content.length : 0
        return rightLength - leftLength
      })
    let remainingOverflow = overflowChars
    for (const index of fallbackShrinkableIndexes) {
      if (remainingOverflow <= 0)
        break
      const content = compactedMessages[index]!.content
      if (typeof content !== 'string')
        continue
      const nextTarget = Math.max(0, content.length - remainingOverflow)
      compactedMessages[index] = {
        ...compactedMessages[index]!,
        content: truncateOneShotPromptTextBlock(content, nextTarget),
      } as Message
      remainingOverflow = measureOneShotMessagesTextChars(compactedMessages) - maxChars
    }
    afterChars = measureOneShotMessagesTextChars(compactedMessages)
  }

  return {
    messages: compactedMessages,
    compacted: true,
    beforeChars,
    afterChars,
    maxChars,
    compactedMessageCount: compactedMessages.filter((message, index) => message !== messages[index]).length,
  }
}

function readOneShotRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function readOneShotEmotionalKernel(raw: unknown): AlicizationOneShotEmotionalKernelShape | null {
  const candidate = readOneShotRecord(raw)
  if (!candidate)
    return null
  if (candidate.version !== 'emotional-kernel-v1')
    return null
  if (
    !sanitizeText(candidate.dominantEmotion, '')
    || !sanitizeText(candidate.memoryRecallMode, '')
    || !sanitizeText(candidate.initiativeMode, '')
    || !sanitizeText(candidate.embodimentTone, '')
  ) {
    return null
  }
  return candidate as unknown as AlicizationOneShotEmotionalKernelShape
}

function resolveOneShotRuntimeEmotionalKernel(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationOneShotEmotionalKernelShape | null {
  return [
    surface?.memory?.emotionalKernel,
    surface?.raw?.runtimeDigest?.emotionalKernel,
    surface?.cognition?.runtimeDigest?.emotionalKernel,
    surface?.dialogue?.runtimeDigest?.emotionalKernel,
    surface?.memory?.derivedMindStateBundle?.emotionalKernel,
    surface?.memory?.derivedMindStateBundle?.visualPresenceState?.emotionalKernel,
  ]
    .map(readOneShotEmotionalKernel)
    .find((kernel): kernel is AlicizationOneShotEmotionalKernelShape => kernel != null)
    ?? null
}

function buildOneShotEmotionalKernelSystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  const emotionalKernel = resolveOneShotRuntimeEmotionalKernel(surface)
  if (!emotionalKernel)
    return ''

  return [
    '[ALICIZATION_EMOTIONAL_KERNEL]',
    'This is the shared emotion-memory-initiative-embodiment authority for this one-shot turn. Let it shape recall, initiative pressure, body tone, and reply posture; do not invent a competing mood.',
    emotionalKernel.dominantEmotion
      ? `emotional_kernel_dominant=${sanitizeBriefText(emotionalKernel.dominantEmotion, 64)}`
      : '',
    emotionalKernel.memoryRecallMode
      ? `emotional_kernel_memory_recall=${sanitizeBriefText(emotionalKernel.memoryRecallMode, 64)}`
      : '',
    emotionalKernel.initiativeMode
      ? `emotional_kernel_initiative=${sanitizeBriefText(emotionalKernel.initiativeMode, 64)}`
      : '',
    emotionalKernel.embodimentTone
      ? `emotional_kernel_embodiment=${sanitizeBriefText(emotionalKernel.embodimentTone, 64)}`
      : '',
    Number.isFinite(emotionalKernel.valence) ? `emotional_kernel_valence=${emotionalKernel.valence.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.arousal) ? `emotional_kernel_arousal=${emotionalKernel.arousal.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.guardedness) ? `emotional_kernel_guardedness=${emotionalKernel.guardedness.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.closenessDrive) ? `emotional_kernel_closeness_drive=${emotionalKernel.closenessDrive.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.repairNeed) ? `emotional_kernel_repair_need=${emotionalKernel.repairNeed.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.initiativePressure) ? `emotional_kernel_initiative_pressure=${emotionalKernel.initiativePressure.toFixed(2)}` : '',
    emotionalKernel.why
      ? `emotional_kernel_reason=${sanitizeBriefText(emotionalKernel.why, 220)}`
      : '',
    emotionalKernel.reasonTags?.length
      ? `emotional_kernel_tags=${emotionalKernel.reasonTags.map(tag => sanitizeBriefText(tag, 64)).filter(Boolean).slice(0, 6).join('|')}`
      : '',
  ].filter(Boolean).join('\n')
}

function hasUsableDigitalLifeRuntimeSurface(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): runtimeSurface is AlicizationDigitalLifeRuntimeSurface {
  return Boolean(
    runtimeSurface?.perception
    && runtimeSurface?.world
    && runtimeSurface?.cognition
    && runtimeSurface?.memory
    && runtimeSurface?.dialogue
    && runtimeSurface?.agency,
  )
}

export function resolveAlicizationOneShotProjectStateFallback(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStatusBrief = resolveAlicizationProjectStatusBrief({
    runtimeProjectState: {
      identity: projectStateBrief.identity,
      currentPhase: projectStateBrief.currentPhase,
      latestLandedProgress: projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
        ?? null,
      primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
      nextClosureTarget: projectStateBrief.nextClosureTarget,
      sameHerSelfLine: projectStateBrief.sameHerSelfLine,
      sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
      preflightSummary: projectStateBrief.preflightSummary,
      preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine,
      awarenessLine: projectStateBrief.preDialogueAwarenessLine,
      companionHeadlineLine: projectStateBrief.preDialogueAwarenessLine ?? null,
      companionBriefingLine: projectStateBrief.preflightSummary ?? null,
      emotionalClosureCue: projectStateBrief.emotionalClosureCue,
    },
  })
  const looksLikeThinOneShotAwarenessShell = (value: unknown) => {
    const normalized = sanitizeText(value ?? '', '').toLowerCase()
    if (!normalized)
      return true

    const carriesRichProjectIdentity = normalized.includes('alicization is a local-first digital life project')
      || normalized.includes('local-first digital life project')
    const carriesPhaseOne = normalized.includes('phase 1')
    const carriesLandedProgress
      = normalized.includes('already landed')
        || normalized.includes('what has already landed')
        || normalized.includes('landed:')
    const carriesOpenClosure
      = normalized.includes('still-open closure')
        || normalized.includes('unfinished closure')
        || normalized.includes('end-to-end closure')
        || normalized.includes('life loop')
    const carriesNextClosure
      = normalized.includes('keep moving toward')
        || normalized.includes('next closure target')
        || normalized.includes('next=')

    const lacksFullProjectClosureCarry
      = !carriesRichProjectIdentity
        || !carriesPhaseOne
        || !carriesLandedProgress
        || !carriesOpenClosure
        || !carriesNextClosure

    return normalized.startsWith('same digital life |')
      || (normalized.startsWith('same digital life')
        && normalized.includes('| open=')
        && normalized.includes('| next='))
      || (normalized.includes('| open=') && normalized.includes('| next=') && !normalized.startsWith('before answering'))
      || lacksFullProjectClosureCarry
  }
  const looksLikeThinOneShotPreflightSummary = (value: unknown) => {
    const normalized = sanitizeText(value ?? '', '').toLowerCase()
    if (!normalized)
      return true

    return normalized.startsWith('same digital life')
      || normalized === 'project'
      || normalized === 'phase 1'
      || !normalized.includes('alicization is a local-first digital life project')
      || !normalized.includes('phase 1')
      || !normalized.includes('open=')
      || !normalized.includes('next=')
  }
  const looksLikeThinOneShotNextClosureShell = (value: unknown) => {
    return looksLikeThinProjectClosureShell(value, 'next')
  }
  const scoreOneShotProjectAwarenessSummary = (value: unknown) => {
    const normalized = sanitizeText(value ?? '', '').trim().toLowerCase()
    if (!normalized)
      return 0

    let score = normalized.length >= 180 ? 2 : normalized.length >= 96 ? 1 : 0
    if (/alicization is a local-first digital life project|local-first digital life project|数字生命项目/u.test(normalized))
      score += 3
    if (/phase 1|第一阶段|阶段一/u.test(normalized))
      score += 2
    if (/\blanded=|what has already landed|already landed|landed:/u.test(normalized))
      score += 3
    if (/\bopen=|still-open closure|unfinished closure|same-life closure/u.test(normalized))
      score += 3
    if (/\bnext=|keep moving toward|next closure target/u.test(normalized))
      score += 2
    if (/same-her|same living line|one living her|同一个她/u.test(normalized))
      score += 1
    if (normalized.includes(' | '))
      score += 2

    return score
  }
  const carriesStructuredOneShotProjectAwarenessSummary = (value: unknown) => {
    const normalized = sanitizeText(value ?? '', '').trim().toLowerCase()
    if (!normalized)
      return false

    const carriesProjectIdentity = /alicization is a local-first digital life project|local-first digital life project|数字生命项目/u.test(normalized)
    const carriesPhase = /phase 1|第一阶段|阶段一/u.test(normalized)
    const carriesClosureProgress
      = /\blanded=|\bopen=|\bnext=|what has already landed|still-open closure|keep moving toward|next closure target/u.test(normalized)

    return carriesProjectIdentity && carriesPhase && carriesClosureProgress
  }
  const preferOneShotProjectAwarenessSummary = (input: {
    awarenessLine?: unknown
    summaryCandidates?: Array<unknown>
    maxChars?: number
  }) => {
    const maxChars = input.maxChars ?? 1600
    const awarenessLine = sanitizeText(input.awarenessLine ?? '', '').slice(0, maxChars) || null
    const structuredCandidates = (input.summaryCandidates ?? [])
      .map(candidate => sanitizeText(candidate ?? '', '').slice(0, maxChars) || null)
      .filter((candidate): candidate is string => Boolean(candidate) && carriesStructuredOneShotProjectAwarenessSummary(candidate))

    const preferredStructuredSummary = structuredCandidates.sort((left, right) => {
      const scoreDelta = scoreOneShotProjectAwarenessSummary(right) - scoreOneShotProjectAwarenessSummary(left)
      if (scoreDelta !== 0)
        return scoreDelta
      return right.length - left.length
    })[0] ?? null

    if (!preferredStructuredSummary)
      return awarenessLine
    if (!awarenessLine)
      return preferredStructuredSummary
    if (preferredStructuredSummary === awarenessLine)
      return awarenessLine

    return scoreOneShotProjectAwarenessSummary(preferredStructuredSummary) >= scoreOneShotProjectAwarenessSummary(awarenessLine)
      ? preferredStructuredSummary
      : awarenessLine
  }
  const carriesProviderFacingOneShotAwarenessLead = (value: unknown) => {
    const normalized = sanitizeText(value ?? '', '').toLowerCase()
    if (!normalized)
      return false

    return normalized.includes('before answering, remember')
      && normalized.includes('alicization is a local-first digital life project')
      && normalized.includes('phase 1')
      && (
        normalized.includes('already landed')
        || normalized.includes('what has already landed')
        || normalized.includes('landed:')
      )
      && (
        normalized.includes('still-open closure')
        || normalized.includes('unfinished closure')
        || normalized.includes('end-to-end closure')
      )
      && (
        normalized.includes('keep moving toward')
        || normalized.includes('next closure target')
        || normalized.includes('next=')
      )
  }
  const canonicalAwarenessLine = projectStateBrief.preDialogueAwarenessLine
    ?? buildAlicizationProjectPreDialogueAwarenessLine({
      identity: projectStateBrief.identity,
      currentPhase: projectStateBrief.currentPhase,
      latestLandedProgress: projectStateBrief.latestProgress,
      primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
      sameHerSelfLine: projectStateBrief.sameHerSelfLine,
    })
  const projectState = runtimeSurface
    ? resolveAlicizationSurfaceProjectStateSnapshot({
        runtimeSurface,
      })
    : {
        ...resolveCanonicalStructuredProjectState({
          normalizedProjectState: {
            identity: projectStateBrief.identity,
            currentPhase: projectStateBrief.currentPhase,
            latestLandedProgress: projectStateBrief.continuityProgressSummary
              ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
              ?? null,
            primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
            nextClosureTarget: projectStateBrief.nextClosureTarget,
            sameHerSelfLine: projectStateBrief.sameHerSelfLine,
            sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
          },
          runtimePreflightSummary: projectStateBrief.preflightSummary ?? null,
          runtimePreDialogueAwarenessLine: canonicalAwarenessLine,
        }),
        emotionalClosureCue: projectStateBrief.emotionalClosureCue ?? null,
      }
  const companionHeadlineLine = sanitizeText(
    (projectState as { companionHeadlineLine?: unknown }).companionHeadlineLine,
    '',
  ) || null
  const companionBriefingLine = sanitizeText(
    (projectState as { companionBriefingLine?: unknown }).companionBriefingLine,
    '',
  ) || null
  const runtimeProjectAwarenessLine = sanitizeText(
    (projectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown }).preDialogueAwarenessLine
    ?? (projectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown }).awarenessLine,
    '',
  ) || null
  const compactStatusAwarenessLine = projectStatusBrief.awarenessLine || projectStatusBrief.preDialogueAwarenessLine || null
  const statusPreferredAwarenessLine = !looksLikeThinOneShotAwarenessShell(runtimeProjectAwarenessLine)
    ? runtimeProjectAwarenessLine
    : !looksLikeThinOneShotAwarenessShell(compactStatusAwarenessLine)
        ? compactStatusAwarenessLine
        : canonicalAwarenessLine || null
  const preDialogueAwarenessLine = sanitizeText(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: statusPreferredAwarenessLine,
        awarenessLine: statusPreferredAwarenessLine,
        companionHeadlineLine: projectStatusBrief.companionHeadlineLine || companionHeadlineLine,
        companionBriefingLine: projectStatusBrief.companionBriefingLine || companionBriefingLine,
        preDialogueAwarenessSummary: statusPreferredAwarenessLine,
        preflightSummary: projectStatusBrief.preflightSummary || projectState.preflightSummary || null,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: canonicalAwarenessLine ?? null,
        preflightSummary: projectStatusBrief.preflightSummary || projectStateBrief.preflightSummary || null,
      },
    }) ?? '',
    '',
  ) || statusPreferredAwarenessLine || null
  const preferredProjectAwarenessLine = (() => {
    if (!companionHeadlineLine || companionHeadlineLine === preDialogueAwarenessLine)
      return preDialogueAwarenessLine

    const lowerCompanionHeadline = companionHeadlineLine.toLowerCase()
    const lowerAwareness = sanitizeText(preDialogueAwarenessLine ?? '', '').toLowerCase()
    const awarenessCarriesBroaderPhaseClosure = lowerAwareness.includes('phase 1')
      && (
        lowerAwareness.includes('generic assistant shell')
        || lowerAwareness.includes('memory, initiative, and embodiment')
        || lowerAwareness.includes('stronger end-to-end closure')
        || lowerAwareness.includes('life loop is truly closed')
      )
    const companionLooksEmbodimentOnly = lowerCompanionHeadline.includes('body')
      || lowerCompanionHeadline.includes('face')
      || lowerCompanionHeadline.includes('motion')
      || lowerCompanionHeadline.includes('same living line gentle')

    if (awarenessCarriesBroaderPhaseClosure && companionLooksEmbodimentOnly)
      return preDialogueAwarenessLine

    return sanitizeText(projectState.preDialogueAwarenessLine ?? '', '') === preDialogueAwarenessLine
      ? companionHeadlineLine
      : preDialogueAwarenessLine
  })()
  const normalizedIdentity = sanitizeText(projectState.identity ?? '', '') || null
  const normalizedCurrentPhase = sanitizeText(projectState.currentPhase ?? '', '') || null
  const normalizedPrimaryOpenLoop = sanitizeText(projectState.primaryOpenLoop ?? '', '') || null
  const preferredIdentity = (() => {
    const normalized = normalizedIdentity?.toLowerCase() ?? ''
    if (
      !normalized
      || normalized === 'same digital life'
      || normalized === 'digital life'
      || normalized === 'local-first digital life'
      || normalized === 'project'
    ) {
      return projectStateBrief.identity
    }
    return normalizedIdentity
  })()
  const preferredCurrentPhase = (() => {
    const normalized = normalizedCurrentPhase?.toLowerCase() ?? ''
    if (
      !normalized
      || normalized === 'phase 1'
      || normalized === 'phase 1: local digital life'
    ) {
      return projectStateBrief.currentPhase
    }
    return normalizedCurrentPhase
  })()
  const preferredPrimaryOpenLoop = (() => {
    const normalized = normalizedPrimaryOpenLoop?.toLowerCase() ?? ''
    if (
      !normalized
      || normalized === 'open closure'
      || normalized === 'open loop'
      || normalized === 'closure'
    ) {
      return projectStateBrief.primaryOpenLoop
    }
    return normalizedPrimaryOpenLoop
  })()
  const preferredLatestLandedProgress = (() => {
    const normalized = sanitizeText(projectState.latestLandedProgress ?? '', '') || ''
    if (!normalized || normalized.toLowerCase() === 'landed') {
      return projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
        ?? null
    }
    return normalized
  })()
  const preferredPreflightSummary = (() => {
    const normalized = sanitizeText(projectState.preflightSummary ?? '', '') || null
    if (looksLikeThinOneShotPreflightSummary(normalized))
      return projectStateBrief.preflightSummary ?? normalized
    return normalized
  })()
  const preferredNextClosureTarget = (() => {
    const normalized = sanitizeText(projectState.nextClosureTarget ?? '', '') || null
    if (looksLikeThinOneShotNextClosureShell(normalized))
      return projectStateBrief.nextClosureTarget ?? normalized
    return normalized
  })()
  const awarenessSeed = looksLikeThinOneShotAwarenessShell(preferredProjectAwarenessLine)
    ? canonicalAwarenessLine
    : preferredProjectAwarenessLine
  const preferredAwarenessLine = sanitizeText(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: awarenessSeed,
        awarenessLine: awarenessSeed,
        companionHeadlineLine,
        companionBriefingLine,
        preDialogueAwarenessSummary: awarenessSeed,
        preflightSummary: projectStatusBrief.preflightSummary ?? projectState.preflightSummary ?? projectStateBrief.preflightSummary ?? null,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: canonicalAwarenessLine ?? null,
        companionHeadlineLine: projectStateBrief.preDialogueAwarenessLine ?? null,
        preflightSummary: projectStatusBrief.preflightSummary ?? projectStateBrief.preflightSummary ?? null,
      },
    }) ?? '',
    '',
  ) || canonicalAwarenessLine || preferredProjectAwarenessLine
  const providerFacingAwarenessLead = carriesProviderFacingOneShotAwarenessLead(runtimeProjectAwarenessLine)
    ? runtimeProjectAwarenessLine
    : carriesProviderFacingOneShotAwarenessLead(preferredAwarenessLine)
      ? preferredAwarenessLine
      : canonicalAwarenessLine || preferredAwarenessLine
  const preferredAwarenessSummary = preferOneShotProjectAwarenessSummary({
    awarenessLine: providerFacingAwarenessLead || projectStatusBrief.awarenessLine,
    summaryCandidates: [
      projectState.preDialogueAwarenessSummary,
      preferredPreflightSummary,
      projectStatusBrief.preflightSummary,
    ],
    maxChars: 1600,
  })
  const preferredCompanionHeadlineLine = companionHeadlineLine
    || projectStatusBrief.companionHeadlineLine
    || providerFacingAwarenessLead

  return {
    projectState: {
      ...projectState,
      identity: preferredIdentity || projectStatusBrief.projectIdentity,
      currentPhase: preferredCurrentPhase || projectStatusBrief.projectPhase,
      preflightSummary: preferredPreflightSummary || projectStatusBrief.preflightSummary,
      latestLandedProgress: preferredLatestLandedProgress || projectStatusBrief.latestLandedProgress,
      primaryOpenLoop: preferredPrimaryOpenLoop || projectStatusBrief.primaryOpenLoop,
      nextClosureTarget: preferredNextClosureTarget || projectStatusBrief.nextClosureTarget,
      preDialogueAwarenessLine: providerFacingAwarenessLead || projectStatusBrief.awarenessLine,
      preferredBlinkCadence: projectState.preferredBlinkCadence ?? projectStateBrief.preferredBlinkCadence ?? null,
      preferredGazeMode: projectState.preferredGazeMode ?? projectStateBrief.preferredGazeMode ?? null,
      preferredPauseMode: projectState.preferredPauseMode ?? projectStateBrief.preferredPauseMode ?? null,
      preferredLipsyncMode: projectState.preferredLipsyncMode ?? projectStateBrief.preferredLipsyncMode ?? null,
      preferredVoiceMode: projectState.preferredVoiceMode ?? projectStateBrief.preferredVoiceMode ?? null,
      preferredPacingMode: projectState.preferredPacingMode ?? projectStateBrief.preferredPacingMode ?? null,
    },
    awarenessProjectState: {
      identity: preferredIdentity || projectStatusBrief.projectIdentity,
      currentPhase: preferredCurrentPhase || projectStatusBrief.projectPhase,
      preDialogueAwarenessLine: providerFacingAwarenessLead || projectStatusBrief.awarenessLine,
      awarenessLine: providerFacingAwarenessLead || projectStatusBrief.awarenessLine || null,
      companionHeadlineLine: preferredCompanionHeadlineLine || projectStatusBrief.companionHeadlineLine || null,
      companionBriefingLine: companionBriefingLine || projectStatusBrief.companionBriefingLine || null,
      preDialogueAwarenessSummary: preferredAwarenessSummary || providerFacingAwarenessLead || projectStatusBrief.awarenessLine || null,
      latestLandedProgress: preferredLatestLandedProgress || projectStatusBrief.latestLandedProgress,
      sameHerSelfLine: projectState.sameHerSelfLine ?? projectStateBrief.sameHerSelfLine,
      sameHerDriftRisk: projectState.sameHerDriftRisk ?? projectStateBrief.sameHerDriftRisk,
      preferredBlinkCadence: projectState.preferredBlinkCadence ?? projectStateBrief.preferredBlinkCadence ?? null,
      preferredGazeMode: projectState.preferredGazeMode ?? projectStateBrief.preferredGazeMode ?? null,
      preferredPauseMode: projectState.preferredPauseMode ?? projectStateBrief.preferredPauseMode ?? null,
      preferredLipsyncMode: projectState.preferredLipsyncMode ?? projectStateBrief.preferredLipsyncMode ?? null,
      preferredVoiceMode: projectState.preferredVoiceMode ?? projectStateBrief.preferredVoiceMode ?? null,
      preferredPacingMode: projectState.preferredPacingMode ?? projectStateBrief.preferredPacingMode ?? null,
      preflightSummary: preferredPreflightSummary ?? projectStatusBrief.preflightSummary ?? projectStateBrief.preflightSummary ?? null,
    },
  }
}

export function createAlicizationMainGatewayOneShotRuntime(options: CreateAlicizationMainGatewayOneShotRuntimeOptions) {
  function resolveOneShotProjectStateFallback(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
    return resolveAlicizationOneShotProjectStateFallback(runtimeSurface)
  }

  function buildOneShotPreDialogueClosure(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
    const { projectState, awarenessProjectState } = resolveOneShotProjectStateFallback(runtimeSurface)
    return buildAlicizationProjectPreDialogueClosure({
      preflightSummary: projectState.preflightSummary ?? null,
      runtimeProjectState: awarenessProjectState,
      fallbackProjectState: awarenessProjectState,
      primaryOpenLoop: sanitizeText(projectState.primaryOpenLoop ?? '', '') || null,
      nextClosureTarget: sanitizeText(projectState.nextClosureTarget, '') || projectState.nextClosureTarget || '',
    })
  }

  function buildScreenSemanticProjectSelfBriefSystemBlock(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
    const { projectState } = resolveOneShotProjectStateFallback(runtimeSurface)

    return [
      '[ALICIZATION_SCREEN_SEMANTIC_SELF_BRIEF]',
      `project_identity=${projectState.identity ?? 'none'}`,
      `current_phase=${projectState.currentPhase ?? 'none'}`,
      `pre_dialogue_awareness=${projectState.preDialogueAwarenessLine ?? projectState.preflightSummary ?? 'none'}`,
      `same_her_line=${projectState.sameHerSelfLine ?? 'none'}`,
      `same_her_hold=${projectState.sameHerHoldDetail ?? 'none'}`,
      `latest_landed_progress=${projectState.latestLandedProgress ?? 'none'}`,
      `primary_open_loop=${projectState.primaryOpenLoop ?? 'none'}`,
      `next_closure_target=${projectState.nextClosureTarget ?? 'none'}`,
      'Screen semantic interpretation must stay inside the same digital life project line, the same Phase 1 proving ground, the same already-landed continuity progress, and the same still-open closure work.',
      'Do not let screen semantic interpretation collapse into a generic desktop classifier, a detached productivity captioner, or an assistant utility shell.',
    ].join('\n')
  }

  function buildSceneAppraisalProjectSelfBriefSystemBlock(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
    const { projectState } = resolveOneShotProjectStateFallback(runtimeSurface)

    return [
      '[ALICIZATION_SCENE_APPRAISAL_SELF_BRIEF]',
      `project_identity=${projectState.identity ?? 'none'}`,
      `current_phase=${projectState.currentPhase ?? 'none'}`,
      `pre_dialogue_awareness=${projectState.preDialogueAwarenessLine ?? projectState.preflightSummary ?? 'none'}`,
      `same_her_line=${projectState.sameHerSelfLine ?? 'none'}`,
      `same_her_hold=${projectState.sameHerHoldDetail ?? 'none'}`,
      `latest_landed_progress=${projectState.latestLandedProgress ?? 'none'}`,
      `primary_open_loop=${projectState.primaryOpenLoop ?? 'none'}`,
      `next_closure_target=${projectState.nextClosureTarget ?? 'none'}`,
      'Scene appraisal must stay inside the same digital life project line, the same Phase 1 proving ground, the same already-landed continuity progress, and the same still-open closure work.',
      'Do not let scene appraisal collapse into generic productivity guessing, detached environment scoring, or assistant utility heuristics.',
    ].join('\n')
  }

  function buildSceneAppraisalProjectStateAnswerContractSystemBlock(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
    const { projectState } = resolveOneShotProjectStateFallback(runtimeSurface)
    return [
      '[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]',
      `identity=${projectState.identity ?? 'none'}`,
      `current_phase=${projectState.currentPhase ?? 'none'}`,
      `landed=${projectState.latestLandedProgress ?? 'none'}`,
      `open=${projectState.primaryOpenLoop ?? 'none'}`,
      `next=${projectState.nextClosureTarget ?? 'none'}`,
      `same_her=${projectState.sameHerSelfLine ?? 'none'}`,
      ...alicizationProjectStateAnswerMustDo,
      ...alicizationProjectStateAnswerContractLines.filter(line => !alicizationProjectStateAnswerMustDo.includes(line as typeof alicizationProjectStateAnswerMustDo[number])),
    ].join('\n')
  }

  function buildOneShotSourceProjectSelfBriefs(input: {
    source: AlicizationMainGatewaySource
    runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) {
    if (input.source === 'screen-semantic')
      return [buildScreenSemanticProjectSelfBriefSystemBlock(input.runtimeSurface)]
    if (input.source === 'scene-appraisal') {
      return [
        buildSceneAppraisalProjectSelfBriefSystemBlock(input.runtimeSurface),
        buildSceneAppraisalProjectStateAnswerContractSystemBlock(input.runtimeSurface),
      ]
    }
    return []
  }

  function buildOneShotPreDialogueAwareness(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
    const { projectState, awarenessProjectState } = resolveOneShotProjectStateFallback(runtimeSurface)
    const awareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: sanitizeText(projectState.preflightSummary ?? '', '') || null,
      runtimeProjectState: awarenessProjectState,
      fallbackProjectState: awarenessProjectState,
      primaryOpenLoop: sanitizeText(projectState.primaryOpenLoop ?? '', '') || null,
      nextClosureTarget: sanitizeText(projectState.nextClosureTarget, '') || projectState.nextClosureTarget || '',
    })
    const sameHerAnchorReason = sanitizeText(projectState.sameHerSelfLine ?? '', '')
      ? `Same-her self anchor: ${sanitizeText(projectState.sameHerSelfLine ?? '', '')}`
      : null
    const sameHerDriftRiskReason = sanitizeText(projectState.sameHerDriftRisk ?? '', '')
      ? `Do not let this opening drift into ${sanitizeText(projectState.sameHerDriftRisk ?? '', '')}`
      : null
    const reasonPreview = [
      sameHerAnchorReason,
      ...(Array.isArray(awareness.reasonPreview) ? awareness.reasonPreview : []),
      sameHerDriftRiskReason,
    ].filter((reason, index, reasons): reason is string => Boolean(reason) && reasons.indexOf(reason) === index)

    return {
      ...awareness,
      reasonPreview,
    }
  }

  function ensureStructuredOneShotProjectStateText(fullText: string, runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
    if (parseJsonObjectFromText(fullText))
      return fullText

    const { projectState } = resolveOneShotProjectStateFallback(runtimeSurface)
    return JSON.stringify({
      format: 'mind-turn-v1',
      thought: '',
      emotion: 'thinking',
      reply: fullText,
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        preflightSummary: projectState.preflightSummary ?? null,
        preDialogueAwarenessLine: projectState.preDialogueAwarenessLine ?? null,
        latestLandedProgress: projectState.latestLandedProgress ?? null,
        primaryOpenLoop: projectState.primaryOpenLoop ?? null,
        nextClosureTarget: projectState.nextClosureTarget,
        sameHerSelfLine: projectState.sameHerSelfLine,
        sameHerDriftRisk: projectState.sameHerDriftRisk ?? null,
        emotionalClosureCue: projectState.emotionalClosureCue ?? null,
        preferredBlinkCadence: projectState.preferredBlinkCadence ?? null,
        preferredGazeMode: projectState.preferredGazeMode ?? null,
        preferredPauseMode: projectState.preferredPauseMode ?? null,
        preferredLipsyncMode: projectState.preferredLipsyncMode ?? null,
        preferredVoiceMode: projectState.preferredVoiceMode ?? null,
        preferredPacingMode: projectState.preferredPacingMode ?? null,
      },
      preDialogueAwareness: buildOneShotPreDialogueAwareness(runtimeSurface),
      preDialogueClosure: buildOneShotPreDialogueClosure(runtimeSurface),
    })
  }

  function projectStateAuditDescriptorForOneShotSource(source: AlicizationMainGatewaySource | null | undefined) {
    const family = resolveAlicizationProjectStateAuditFamilyForMainGatewaySource(source)
    return {
      source: source ?? 'unknown',
      family,
      audited: isAlicizationProjectStateAuditedMainGatewaySource(source),
    }
  }

  function buildKnowledgeEvidenceSystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
    const knowledgeEvidence = surface?.memory?.knowledgeEvidence ?? null
    if (!knowledgeEvidence)
      return ''
    return [
      '[ALICIZATION_KNOWLEDGE_EVIDENCE]',
      `validation_count=${Math.max(0, Math.floor(Number(knowledgeEvidence.validationCount ?? 0)))}`,
      `contradiction_count=${Math.max(0, Math.floor(Number(knowledgeEvidence.contradictionCount ?? 0)))}`,
      `strongly_validated_procedure_count=${Math.max(0, Math.floor(Number(knowledgeEvidence.stronglyValidatedProcedureCount ?? 0)))}`,
      `contradiction_heavy_fact_count=${Math.max(0, Math.floor(Number(knowledgeEvidence.contradictionHeavyFactCount ?? 0)))}`,
      'Treat higher contradiction pressure as a cue to keep remembered detail compressed, approximate, or latent.',
      'Treat stronger validated procedure count as a cue that remembered procedure carry is safer than brittle remembered wording.',
    ].join('\n')
  }

  function buildSelfEvolutionSystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
    const selfEvolution = surface?.memory?.selfEvolution ?? null
    if (!selfEvolution)
      return ''
    return [
      '[ALICIZATION_SELF_EVOLUTION]',
      selfEvolution.summary ? `summary=${selfEvolution.summary}` : '',
      selfEvolution.dominantTrajectory ? `dominant_trajectory=${selfEvolution.dominantTrajectory}` : '',
      selfEvolution.relationshipDoctrine ? `relationship_doctrine=${selfEvolution.relationshipDoctrine}` : '',
      selfEvolution.latestInflection ? `latest_inflection=${selfEvolution.latestInflection}` : '',
      selfEvolution.burdenLine ? `burden_line=${selfEvolution.burdenLine}` : '',
      selfEvolution.trustMeaning ? `trust_meaning=${selfEvolution.trustMeaning}` : '',
      `evolution_momentum=${selfEvolution.evolutionMomentum.toFixed(2)}`,
      `learning_readiness=${selfEvolution.learningReadiness.toFixed(2)}`,
      `contradiction_pressure=${selfEvolution.contradictionPressure.toFixed(2)}`,
      `revision_pressure=${selfEvolution.revisionPressure.toFixed(2)}`,
      `autobiographical_stability=${selfEvolution.autobiographicalStability.toFixed(2)}`,
      `next_learning_action=${selfEvolution.nextLearningAction}`,
      selfEvolution.nextLearningReason ? `next_learning_reason=${selfEvolution.nextLearningReason}` : '',
      selfEvolution.activeLearningFocuses.length > 0
        ? `active_learning_focuses=${selfEvolution.activeLearningFocuses.join(' | ')}`
        : '',
      'Let this shape inner trajectory and update pressure, not fixed visible wording.',
    ].filter(Boolean).join('\n')
  }

  function buildDerivedMindStateBundleSystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
    const bundle = surface?.memory?.derivedMindStateBundle ?? null
    if (!bundle)
      return ''
    return [
      '[ALICIZATION_DERIVED_MIND_STATE_BUNDLE]',
      `source=${bundle.source}`,
      `produced_at=${bundle.producedAt}`,
      bundle.summary ? `summary=${bundle.summary}` : '',
      bundle.dialogueRhythm?.activeClosenessContext ? `rhythm_context=${bundle.dialogueRhythm.activeClosenessContext}` : '',
      bundle.dialogueRhythm?.activeClosenessRung ? `rhythm_rung=${bundle.dialogueRhythm.activeClosenessRung}` : '',
      bundle.dialogueRhythm?.relationshipDoctrine ? `rhythm_doctrine=${bundle.dialogueRhythm.relationshipDoctrine}` : '',
      'Treat this bundle as the single high-level derived mind state for this turn. Do not invent a second competing interpretation.',
    ].filter(Boolean).join('\n')
  }

  function buildScreenSemanticUserContent(input: {
    imageDataUrl: string
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    sourceName: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
  }): CommonContentPart[] {
    const screenContextText = [
      'Classify this screen snapshot for Alicization proactive policy.',
      `Capture source: ${sanitizeBriefText(input.sourceName, 120) || 'unknown'}`,
      `Focus target: ${options.describePerceptionTarget(input.focusTarget)}`,
      `Focus source: ${sanitizeBriefText(input.focusTarget?.source ?? '', 48) || 'none'}`,
      `Foreground app: ${sanitizeBriefText(input.foregroundWindow?.appName ?? '', 120) || 'unknown'}`,
      `Foreground process: ${sanitizeBriefText(input.foregroundWindow?.processName ?? '', 120) || 'unknown'}`,
      `Foreground title: ${sanitizeBriefText(input.foregroundWindow?.title ?? '', 240) || 'unknown'}`,
      'Prefer what is visibly on the screen over the window title if they disagree.',
    ].join('\n')

    return [
      { type: 'text', text: screenContextText },
      {
        type: 'image_url',
        image_url: {
          url: input.imageDataUrl,
        },
      } as CommonContentPart,
    ]
  }

  function buildScreenSemanticClassifierSystemPrompt() {
    return [
      'You classify a screen snapshot for Alicization proactive policy.',
      'Output valid JSON only with keys: workload, content, summary, confidence, matchedLabels.',
      'workload must be one of: coding, media, browser, terminal, game, chat, document, unknown.',
      'content must be one of: error, diff, doc, video, music, chat, gameplay, unknown.',
      'summary must be a short factual phrase under 18 words. Do not mention emotions or advice.',
      'confidence must be a number in range [0,1].',
      'matchedLabels must be an array of short lower-kebab-case strings with up to 4 items.',
      'If the screenshot is unreadable or ambiguous, use unknown with low confidence.',
    ].join('\n')
  }

  function isGenericScreenSemanticCue(raw: unknown) {
    const normalized = sanitizeBriefText(readStringValue(raw), 160).toLowerCase()
    if (!normalized)
      return true
    if (/^(?:(?:code|cursor|vscode|visual studio code|browser|terminal|player|music|video|chat|document|editor|ide|app|application)\s*[·|:-]\s*)?(?:screen|display|desktop|workspace)(?:\s*\d+)?$/i.test(normalized))
      return true
    return new Set([
      'current screen',
      'coding workspace',
      'terminal session',
      'browser page',
      'media view',
      'chat window',
      'document view',
      'game window',
      'error view',
      'diff view',
      'video playback',
      'music playback',
    ]).has(normalized)
  }

  function normalizeParsedScreenSemanticSummary(input: {
    summary: import('./proactive-screen-semantic').AlicizationScreenSemanticSummary
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
  }) {
    const rawCue = buildAlicizationScreenSurfaceCue({
      rawCues: [
        input.summary.content.summary,
        ...input.summary.content.matchedLabels,
      ],
      target: input.focusTarget ?? input.foregroundWindow ?? null,
      workloadKind: input.summary.workload.kind,
      contentKind: input.summary.content.kind,
      scenario: input.summary.workload.kind === 'coding'
        ? 'coding'
        : input.summary.workload.kind === 'media'
          ? 'media'
          : null,
    })
    const normalizedCue = sanitizeBriefText(rawCue, 120)
    const weakCue = isWeakAlicizationScreenSurfaceCue(normalizedCue)
    const genericCue = isGenericScreenSemanticCue(normalizedCue)
    const isUnknownSummary = input.summary.workload.kind === 'unknown' && input.summary.content.kind === 'unknown'

    if (isUnknownSummary && (weakCue || genericCue))
      return null

    return {
      ...input.summary,
      content: {
        ...input.summary.content,
        summary: weakCue || genericCue
          ? undefined
          : normalizedCue || undefined,
      },
    } satisfies import('./proactive-screen-semantic').AlicizationScreenSemanticSummary
  }

  function hasMeaningfulScreenSemanticSummary(summary: import('./proactive-screen-semantic').AlicizationScreenSemanticSummary | null | undefined) {
    if (!summary)
      return false
    if (summary.content.summary)
      return true
    return summary.workload.kind !== 'unknown' || summary.content.kind !== 'unknown'
  }

  function buildScreenSemanticSceneResidue(input: {
    now: number
    summary: import('./proactive-screen-semantic').AlicizationScreenSemanticSummary
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: AlicizationPerceptionSceneResidue['focusSource']
    } | null
  }): AlicizationPerceptionSceneResidue {
    return {
      observedAt: input.now,
      source: 'screen-semantic-summary',
      workloadKind: input.summary.workload.kind,
      contentKind: input.summary.content.kind,
      summary: input.summary.content.summary,
      confidence: Math.max(input.summary.workload.confidence, input.summary.content.confidence),
      focusTarget: input.focusTarget
        ? {
            appName: input.focusTarget.appName,
            processName: input.focusTarget.processName,
            title: input.focusTarget.title,
          }
        : undefined,
      focusSource: input.focusTarget?.source,
      captureSourceName: input.summary.source.name,
      captureStrategy: input.summary.source.strategy,
    }
  }

  async function generateMainGatewayText(generateOptions: MainGatewayOneShotGenerateTextOptions) {
    const oneShotCardId = normalizeCardId(generateOptions.cardId ?? options.getActiveCardId())
    if (!generateOptions.source) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-missing-project-state-source', {
        cardId: oneShotCardId,
        source: 'unknown',
        projectStateAuditFamily: null,
        projectStateAuditRequired: true,
      })
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.project-state',
        action: 'missing-main-gateway-source',
        message: 'A one-shot main gateway call entered the runtime without a source tag, so project-state audit coverage could not be verified.',
        payload: {
          source: 'unknown',
          cardId: oneShotCardId,
          projectStateAuditRequired: true,
        },
      }, oneShotCardId)
      return null
    }

    const projectStateAuditDescriptor = projectStateAuditDescriptorForOneShotSource(generateOptions.source)
    if (isAlicizationProjectStateUnauditedMainGatewaySource(generateOptions.source)) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-unaudited-project-state-source', {
        cardId: oneShotCardId,
        source: generateOptions.source,
        projectStateAuditFamily: null,
        projectStateAuditRequired: true,
      })
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.project-state',
        action: 'unaudited-main-gateway-source',
        message: 'A main gateway source without registered project-state audit coverage entered the one-shot runtime.',
        payload: {
          source: generateOptions.source,
          cardId: oneShotCardId,
          projectStateAuditRequired: true,
        },
      }, oneShotCardId)
      return null
    }
    const agentTurn = generateOptions.agentTurn ?? await (async () => {
      if (!generateOptions.agentTurnInput)
        return null
      return await options.openAgentTurn({
        cardId: oneShotCardId,
        turnId: generateOptions.agentTurnInput.turnId,
        decisionTraceId: generateOptions.agentTurnInput.decisionTraceId ?? null,
      })
    })()
    const initialRuntimeSurface = generateOptions.digitalLifeRuntimeSurface ?? null
    const initialOneShotDigitalLifeSpine = hasUsableDigitalLifeRuntimeSurface(initialRuntimeSurface)
      ? deriveAlicizationDigitalLifeSpineFromSurface(initialRuntimeSurface)
      : null
    if (agentTurn) {
      agentTurn.ingestDigitalLifeSpine(initialOneShotDigitalLifeSpine)
      agentTurn.ingestDigitalLifeArchitecture(initialOneShotDigitalLifeSpine?.architecture ?? null)
    }

    const config = options.resolveMainGatewayConfig({
      cardId: oneShotCardId,
    })
    if (!config) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-missing-config', {
        cardId: options.getActiveCardId(),
        source: generateOptions.source ?? 'unknown',
        projectStateAuditFamily: projectStateAuditDescriptor.family,
        projectStateAuditRequired: projectStateAuditDescriptor.audited,
        activeProviderId: options.getActiveProviderId(),
        activeModelId: options.getActiveModelId(),
      })
      return null
    }

    const resolvedCustomDirectives = generateOptions.injectCustomDirectives === false
      ? { text: '', source: 'none' as const }
      : await options.resolveCardCustomDirectives(generateOptions.cardId ?? options.getActiveCardId())
    const customDirectiveBlock = generateOptions.injectCustomDirectives === false
      ? ''
      : buildCardCustomDirectivesSystemBlock(resolvedCustomDirectives.text)
    const executionCallbackContext = agentTurn?.conversationSessionId
      ? await options.buildPendingExecutionCallbackContext({
          consume: false,
          sessionId: agentTurn.conversationSessionId,
        }).catch(() => emptyAlicizationExecutionCallbackContext)
      : emptyAlicizationExecutionCallbackContext
    const sessionContinuityContext = agentTurn
      ? await options.resolveAgentSessionContinuityContext(oneShotCardId, {
          digitalLifeRuntimeSurface: generateOptions.digitalLifeRuntimeSurface ?? null,
        }).catch(() => ({
          digitalLifeRuntimeSurface: generateOptions.digitalLifeRuntimeSurface ?? null,
          sessionContinuitySignals: [] as AlicizationAgentSessionContinuityInput[],
        }))
      : {
          digitalLifeRuntimeSurface: generateOptions.digitalLifeRuntimeSurface ?? null,
          sessionContinuitySignals: [] as AlicizationAgentSessionContinuityInput[],
        }
    const sessionRuntimeSurface = sessionContinuityContext.digitalLifeRuntimeSurface ?? null
    const oneShotDigitalLifeSpine = hasUsableDigitalLifeRuntimeSurface(sessionRuntimeSurface)
      ? deriveAlicizationDigitalLifeSpineFromSurface(sessionRuntimeSurface)
      : null
    const oneShotDigitalLifeSignal = oneShotDigitalLifeSpine?.continuitySignal ?? null
    const oneShotDigitalLifeArchitecture = oneShotDigitalLifeSpine?.architecture ?? null
    const projectStateSystemBlock = buildAlicizationProjectStateSystemBlock()
    const projectStateClosureDashboard = buildAlicizationProjectStateClosureDashboard({
      architecture: oneShotDigitalLifeArchitecture,
    })
    const sessionContinuitySignals = [
      ...sessionContinuityContext.sessionContinuitySignals,
      ...(oneShotDigitalLifeSignal ? [oneShotDigitalLifeSignal] : []),
    ].sort((left, right) => Number(left.createdAt) - Number(right.createdAt))

    if (agentTurn) {
      agentTurn.ingestDigitalLifeSpine(oneShotDigitalLifeSpine)
      agentTurn.ingestDigitalLifeArchitecture(oneShotDigitalLifeArchitecture)
    }

    if (agentTurn && executionCallbackContext.continuitySignals.length > 0)
      agentTurn.ingestContinuitySignals(executionCallbackContext.continuitySignals)

    if (agentTurn && sessionContinuitySignals.length > 0)
      agentTurn.ingestContinuitySignals(sessionContinuitySignals)

    if (agentTurn && executionCallbackContext.actions.length > 0)
      agentTurn.ingestRuntimeActions(executionCallbackContext.actions)

    if (agentTurn && generateOptions.captureAgentSensorySnapshot !== false) {
      await agentTurn.trackTool({
        phaseId: `tool:sensory:oneshot:${generateOptions.source ?? 'unknown'}`,
        kind: 'sensory',
        label: `sensory_snapshot:${generateOptions.source ?? 'unknown'}`,
        traceMetadata: {
          cardId: oneShotCardId,
          source: generateOptions.source ?? 'unknown',
          turnId: generateOptions.agentTurnInput?.turnId ?? null,
        },
        run: async () => await agentTurn.getSensorySnapshot(),
        summarizeSuccess: snapshot => [
          `foreground=${snapshot.sample.foregroundWindow?.appName ?? snapshot.sample.foregroundWindow?.processName ?? 'unknown'}`,
          `capture=${snapshot.capture?.health ?? 'unknown'}/${snapshot.capture?.permission ?? 'unknown'}`,
        ].join(' '),
      }).catch(async (error) => {
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'one-shot-sensory-snapshot-unavailable',
          message: 'Main gateway one-shot sensory snapshot failed; provider generation continued without blocking on auxiliary grounding.',
          payload: {
            cardId: oneShotCardId,
            source: generateOptions.source ?? 'unknown',
            reason: errorMessageFrom(error) ?? String(error),
          },
        }, oneShotCardId)
      })
    }

    const performanceManifest = await options.getPerformanceManifest()
    const oneShotArchitectureSystemBlock = !agentTurn
      ? buildAlicizationDigitalLifeArchitectureSystemBlock(oneShotDigitalLifeArchitecture)
      : ''
    const systemMessages: Message[] = [
      { role: 'system', content: projectStateSystemBlock } as Message,
      { role: 'system', content: projectStateClosureDashboard } as Message,
      ...(customDirectiveBlock
        ? [{ role: 'system', content: customDirectiveBlock } as Message]
        : []),
      ...(generateOptions.injectPerformanceManifest === false
        ? []
        : options.buildPerformanceManifestSystemBlocks(performanceManifest)
            .map(content => ({ role: 'system', content }) as Message)),
      ...(executionCallbackContext.systemBlock
        ? [{ role: 'system', content: executionCallbackContext.systemBlock } as Message]
        : []),
      ...(agentTurn
        ? options.buildAgentTurnContinuitySystemMessages({
            agentTurn,
            cardId: oneShotCardId,
          })
        : []),
      ...(oneShotArchitectureSystemBlock
        ? [{ role: 'system', content: oneShotArchitectureSystemBlock } as Message]
        : []),
      ...(buildKnowledgeEvidenceSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null)
        ? [{ role: 'system', content: buildKnowledgeEvidenceSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null) } as Message]
        : []),
      ...(buildSelfEvolutionSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null)
        ? [{ role: 'system', content: buildSelfEvolutionSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null) } as Message]
        : []),
      ...(buildOneShotEmotionalKernelSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null)
        ? [{ role: 'system', content: buildOneShotEmotionalKernelSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null) } as Message]
        : []),
      ...(buildDerivedMindStateBundleSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null)
        ? [{ role: 'system', content: buildDerivedMindStateBundleSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null) } as Message]
        : []),
      ...([
        ...buildOneShotSourceProjectSelfBriefs({
          source: generateOptions.source,
          runtimeSurface: sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null,
        }),
        ...(generateOptions.extraSystemBlocks ?? []),
      ].map(block => sanitizeMultilineText(block)).filter(Boolean).map(content => ({ role: 'system', content }) as Message)),
      { role: 'system', content: generateOptions.system } as Message,
    ]
    const rawGenerationMessages = [
      ...systemMessages,
      { role: 'user', content: generateOptions.user } as Message,
    ]
    const promptCompaction = compactOneShotMessagesToTextBudget(rawGenerationMessages, generateOptions.source)
    const generationMessages = promptCompaction.messages

    if (promptCompaction.compacted) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-prompt-compacted', {
        cardId: oneShotCardId,
        source: generateOptions.source ?? 'unknown',
        projectStateAuditFamily: projectStateAuditDescriptor.family,
        projectStateAuditRequired: projectStateAuditDescriptor.audited,
        beforeChars: promptCompaction.beforeChars,
        afterChars: promptCompaction.afterChars,
        maxChars: promptCompaction.maxChars,
        compactedMessageCount: promptCompaction.compactedMessageCount,
      })
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.main-gateway',
        action: 'one-shot-prompt-compacted',
        message: 'Main gateway one-shot prompt exceeded the source budget and was compacted before provider generation.',
        payload: {
          cardId: oneShotCardId,
          source: generateOptions.source ?? 'unknown',
          projectStateAuditFamily: projectStateAuditDescriptor.family,
          projectStateAuditRequired: projectStateAuditDescriptor.audited,
          beforeChars: promptCompaction.beforeChars,
          afterChars: promptCompaction.afterChars,
          maxChars: promptCompaction.maxChars,
          compactedMessageCount: promptCompaction.compactedMessageCount,
        },
      }, oneShotCardId)
    }

    if (!carriesAlicizationCanonicalProjectState(generationMessages)) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-missing-project-state-context', {
        cardId: oneShotCardId,
        source: generateOptions.source ?? 'unknown',
        projectStateAuditFamily: projectStateAuditDescriptor.family,
        projectStateAuditRequired: projectStateAuditDescriptor.audited,
      })
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.project-state',
        action: 'missing-main-gateway-project-state-context',
        message: 'Main gateway one-shot assembled messages without canonical project-state context and was refused before provider generation.',
        payload: {
          cardId: oneShotCardId,
          source: generateOptions.source ?? 'unknown',
          projectStateAuditFamily: projectStateAuditDescriptor.family,
          projectStateAuditRequired: projectStateAuditDescriptor.audited,
        },
      }, oneShotCardId)
      return null
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(createAbortError('main-gateway-timeout'))
      }
    }, Math.max(1_000, generateOptions.timeoutMs ?? 18_000))

    try {
      const runGeneration = async () => {
        const result = await generateText({
          ...config.provider.chat(config.model),
          maxSteps: 1,
          messages: generationMessages,
          headers: config.headers,
          abortSignal: controller.signal,
        })
        const rawText = (result.text ?? '').trim()
        const fullText = rawText
          ? ensureStructuredOneShotProjectStateText(
              rawText,
              sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null,
            )
          : ''
        await options.appendRuntimeDebugLine('main-gateway.one-shot-finished', {
          cardId: oneShotCardId,
          source: generateOptions.source ?? 'unknown',
          projectStateAuditFamily: projectStateAuditDescriptor.family,
          projectStateAuditRequired: projectStateAuditDescriptor.audited,
          customDirectivesSource: resolvedCustomDirectives.source,
          customDirectivesChars: resolvedCustomDirectives.text.length,
          chunkCount: fullText ? 1 : 0,
          rawChunkChars: fullText.length,
          finalChars: fullText.length,
        })
        return fullText || null
      }

      const fullText = agentTurn
        ? await agentTurn.trackTool({
            phaseId: `tool:runtime:main-gateway:${generateOptions.source ?? 'unknown'}`,
            kind: 'runtime',
            label: `main_gateway:${generateOptions.source ?? 'unknown'}`,
            metadata: {
              source: generateOptions.source ?? 'unknown',
              turnId: generateOptions.agentTurnInput?.turnId ?? null,
            },
            traceMetadata: {
              cardId: oneShotCardId,
              source: generateOptions.source ?? 'unknown',
              turnId: generateOptions.agentTurnInput?.turnId ?? null,
              decisionTraceId: generateOptions.agentTurnInput?.decisionTraceId ?? null,
            },
            run: runGeneration,
            summarizeSuccess: value => value
              ? `one-shot completed with ${value.length} chars`
              : 'one-shot completed with empty response',
            summarizeError: error => sanitizeBriefText(errorMessageFrom(error) ?? 'main-gateway-failed', 160),
          })
        : await runGeneration()
      if (fullText) {
        options.rememberMainGatewayRoute({
          cardId: oneShotCardId,
          mainGateway: config,
        })
        options.syncAgentTurnSessionMirror({
          agentTurn,
          cardId: oneShotCardId,
          decisionTraceId: generateOptions.agentTurnInput?.decisionTraceId ?? null,
          source: generateOptions.source ?? 'unknown',
        })
      }
      return fullText
    }
    catch (error) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-failed', {
        cardId: oneShotCardId,
        source: generateOptions.source ?? 'unknown',
        projectStateAuditFamily: projectStateAuditDescriptor.family,
        projectStateAuditRequired: projectStateAuditDescriptor.audited,
        reason: errorMessageFrom(error) ?? String(error),
        model: config.model,
        providerId: config.providerId,
      })
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.main-gateway',
        action: 'one-shot-failed',
        message: 'Main gateway one-shot generation failed; fallback path used.',
        payload: {
          reason: errorMessageFrom(error) ?? String(error),
          model: config.model,
          providerId: config.providerId,
          source: generateOptions.source ?? 'unknown',
          projectStateAuditFamily: projectStateAuditDescriptor.family,
          projectStateAuditRequired: projectStateAuditDescriptor.audited,
        },
      })
      return null
    }
    finally {
      clearTimeout(timeout)
    }
  }

  async function generateScreenSemanticSummaryFromImage(input: {
    cardId: string
    now: number
    imageDataUrl: string
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    source: {
      id: string
      name: string
      strategy: 'window-title' | 'app-name' | 'process-name' | 'screen-fallback'
    }
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    const raw = await generateMainGatewayText({
      system: buildScreenSemanticClassifierSystemPrompt(),
      user: buildScreenSemanticUserContent({
        imageDataUrl: input.imageDataUrl,
        foregroundWindow: input.foregroundWindow,
        sourceName: input.source.name,
        focusTarget: input.focusTarget,
      }),
      timeoutMs: proactiveScreenSemanticTimeoutMs,
      source: 'screen-semantic',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: {
        turnId: options.buildMainGatewayAgentTurnId('screen-semantic', input.cardId, input.source.id, input.now),
      },
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: buildAlicizationProjectStateExtraSystemBlocks(),
    })
    if (!raw) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-llm-unavailable',
      } as const
    }

    const parsedSummary = parseScreenSemanticSummary({
      raw,
      analyzedAt: input.now,
      source: input.source,
    })
    if (!parsedSummary) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-parse-failed',
      } as const
    }
    const summary = normalizeParsedScreenSemanticSummary({
      summary: parsedSummary,
      foregroundWindow: input.foregroundWindow,
      focusTarget: input.focusTarget,
    })
    if (!summary) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-weak-summary',
      } as const
    }

    return hasMeaningfulScreenSemanticSummary(summary)
      ? {
          summary,
          unavailableReason: undefined,
        } as const
      : {
          summary: null,
          unavailableReason: 'screen-semantic-parse-failed',
        } as const
  }

  async function resolveProactiveScreenSemanticSummary(input: {
    cardId: string
    now: number
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    perceptionState?: AlicizationPerceptionState
    agentTurn?: AlicizationAgentTurnRuntime | null
  }): Promise<{
    focusTarget: import('./proactive-screen-semantic').AlicizationScreenSemanticFocusTarget | null
    summary: import('./proactive-screen-semantic').AlicizationScreenSemanticSummary | null
    capture: ReturnType<typeof deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot>
    unavailableReason?: string
  }> {
    const cardId = normalizeCardId(input.cardId)
    const cached = options.screenSemanticCacheByCard.get(cardId)
    const perceptionState = input.perceptionState ?? await options.ensurePerceptionState(cardId)
    const invitedInspectionActive = Boolean(
      perceptionState.invitedInspection
      && perceptionState.invitedInspection.activeUntil > input.now,
    )
    const reusableResidue = options.getUsablePerceptionSceneResidue({
      state: perceptionState,
      now: input.now,
      maxAgeMs: 2 * 60_000,
    })
    if (invitedInspectionActive) {
      if (reusableResidue) {
        const reusedSummary = options.buildScreenSemanticSummaryFromResidue(reusableResidue)
        options.screenSemanticCacheByCard.set(cardId, {
          key: [
            'scene-residue',
            reusableResidue.observedAt,
            reusableResidue.source,
            reusableResidue.captureSourceName ?? '',
          ].join(':'),
          focusTarget: reusableResidue.focusTarget
            ? {
                appName: reusableResidue.focusTarget.appName,
                processName: reusableResidue.focusTarget.processName,
                title: reusableResidue.focusTarget.title,
                source: reusableResidue.focusSource ?? 'recent-observation',
                confidence: reusableResidue.confidence,
              }
            : null,
          summary: reusedSummary,
          updatedAt: input.now,
        })
        return {
          focusTarget: reusableResidue.focusTarget
            ? {
                appName: reusableResidue.focusTarget.appName,
                processName: reusableResidue.focusTarget.processName,
                title: reusableResidue.focusTarget.title,
                source: reusableResidue.focusSource ?? 'recent-observation',
                confidence: reusableResidue.confidence,
              }
            : null,
          summary: reusedSummary,
          capture: null,
        }
      }

      options.screenSemanticCacheByCard.set(cardId, {
        key: 'invited-inspection-active',
        focusTarget: null,
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'invited-inspection-active',
      })
      return {
        focusTarget: null,
        summary: null,
        capture: null,
        unavailableReason: 'invited-inspection-active',
      }
    }

    const captureAccessRequest = {
      types: ['window', 'screen'] as Array<'window' | 'screen'>,
      thumbnailSize: { width: 640, height: 360 },
    }
    // NOTICE: Proactive ticks can happen back-to-back across rapid scene shifts.
    // Re-probe desktop sources for each fresh grounding burst so old thumbnails
    // do not keep a previous scene alive as the current live scene.
    options.clearDesktopCaptureAccessCache()
    const captureAccess = await options.resolveDesktopCaptureAccess(captureAccessRequest)
    const capture = options.getDesktopCaptureAccessRuntimeSnapshot(captureAccessRequest)
    const sources = captureAccess.sources
    if (sources.length === 0) {
      options.screenSemanticCacheByCard.set(cardId, {
        key: captureAccess.unavailableReason ?? 'screen-semantic-source-unavailable',
        focusTarget: cached?.focusTarget ?? null,
        summary: null,
        updatedAt: input.now,
        unavailableReason: captureAccess.unavailableReason ?? captureAccess.probeError,
      })
      return {
        focusTarget: cached?.focusTarget ?? null,
        summary: null,
        capture,
        unavailableReason: captureAccess.unavailableReason ?? captureAccess.probeError,
      }
    }

    const attentionAnchor = getActiveAttentionAnchor(perceptionState, input.now)
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: input.foregroundWindow,
      attentionAnchor,
      recentObservations: perceptionState.recentObservations,
      hintTerms: [],
      avoidSourcePattern: /\b(?:alicization|codex)\b/i,
      sources,
    })
    if (!candidate) {
      options.screenSemanticCacheByCard.set(cardId, {
        key: 'no-candidate',
        focusTarget: null,
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'screen-semantic-source-unavailable',
      })
      return {
        focusTarget: null,
        summary: null,
        capture,
        unavailableReason: 'screen-semantic-source-unavailable',
      }
    }

    const candidateKey = [
      candidate.source.id,
      candidate.strategy,
      sanitizeText(candidate.focusTarget?.source ?? ''),
      sanitizeText(candidate.focusTarget?.appName),
      sanitizeText(candidate.focusTarget?.processName),
      sanitizeText(candidate.focusTarget?.title),
      sanitizeText(input.foregroundWindow?.appName),
      sanitizeText(input.foregroundWindow?.processName),
      sanitizeText(input.foregroundWindow?.title),
    ].join(':')
    if (
      cached
      && cached.key === candidateKey
      && input.now - cached.updatedAt <= (cached.summary ? proactiveScreenSemanticCacheTtlMs : proactiveScreenSemanticFailureTtlMs)
    ) {
      return {
        focusTarget: cached.focusTarget ?? candidate.focusTarget ?? null,
        summary: cached.summary,
        capture,
        unavailableReason: cached.unavailableReason,
      }
    }

    const imageDataUrl = buildCompressedNativeImageDataUrl({
      image: candidate.source.thumbnail,
      maxWidth: proactiveScreenSemanticImageMaxWidth,
      maxHeight: proactiveScreenSemanticImageMaxHeight,
      jpegQuality: proactiveScreenSemanticImageJpegQuality,
    })
    if (!imageDataUrl) {
      options.screenSemanticCacheByCard.set(cardId, {
        key: candidateKey,
        focusTarget: candidate.focusTarget,
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'screen-semantic-thumbnail-empty',
      })
      return {
        focusTarget: candidate.focusTarget,
        summary: null,
        capture,
        unavailableReason: 'screen-semantic-thumbnail-empty',
      }
    }

    const semanticResult = await generateScreenSemanticSummaryFromImage({
      cardId,
      now: input.now,
      imageDataUrl,
      foregroundWindow: input.foregroundWindow,
      source: {
        id: candidate.source.id,
        name: candidate.source.name,
        strategy: candidate.strategy,
      },
      focusTarget: candidate.focusTarget,
      agentTurn: input.agentTurn,
    })
    const summary = semanticResult.summary
    if (!summary) {
      options.screenSemanticCacheByCard.set(cardId, {
        key: candidateKey,
        focusTarget: candidate.focusTarget,
        summary: null,
        updatedAt: input.now,
        unavailableReason: semanticResult.unavailableReason,
      })
      return {
        focusTarget: candidate.focusTarget,
        summary: null,
        capture,
        unavailableReason: semanticResult.unavailableReason,
      }
    }
    await options.rememberSceneResidue({
      cardId,
      now: input.now,
      residue: buildScreenSemanticSceneResidue({
        now: input.now,
        summary,
        focusTarget: candidate.focusTarget,
      }),
    })
    options.screenSemanticCacheByCard.set(cardId, {
      key: candidateKey,
      focusTarget: candidate.focusTarget,
      summary,
      updatedAt: input.now,
      unavailableReason: undefined,
    })
    return {
      focusTarget: candidate.focusTarget,
      summary,
      capture,
      unavailableReason: undefined,
    }
  }

  return {
    buildScreenSemanticSceneResidue,
    generateScreenSemanticSummaryFromImage,
    generateMainGatewayText,
    resolveProactiveScreenSemanticSummary,
  }
}
