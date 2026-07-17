import type { CommonContentPart, Message } from '@xsai/shared-chat'

import type {
  AlicizationAuditLogInput,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput, AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationExecutionCallbackContext } from './execution-callback-runtime'
import type { AlicizationMainGatewayGenerateTextProviderOptions, AlicizationMainGatewaySource } from './main-gateway-contract'
import type {
  DesktopCaptureAccessResult,
  MainGatewayResolvedConfig,
  ResolvedCardCustomDirectives,
  ScreenSemanticCacheState,
} from './runtime-soul'
import type { deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot } from './sensory-capture'

import { errorMessageFrom } from '@moeru/std'
import {
  buildAlicizationProviderFactBlock,
  buildAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceCue,
} from '@proj-alicization/stage-shared'
import { generateText } from '@xsai/generate-text'

import { getActiveAttentionAnchor } from './attention-anchor'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { emptyAlicizationExecutionCallbackContext } from './execution-callback-runtime'
import { buildCardCustomDirectivesSystemBlock } from './main-chat-runtime-surface'
import { createAbortError } from './main-chat-stream-primitives'
import {
  isAlicizationRegisteredMainGatewaySource,
  isAlicizationUnregisteredMainGatewaySource,
  resolveAlicizationMainGatewayAuditFamilyForSource,
} from './main-gateway-contract'
import { parseScreenSemanticSummary, pickScreenSemanticCaptureCandidate } from './proactive-screen-semantic'
import { buildCompressedNativeImageDataUrl, readStringValue } from './runtime-governance'
import { sanitizeBriefText } from './runtime-realtime'
import { alicizationScreenSemanticResponseFormat } from './runtime-screen-semantic-provider-contract'
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

export interface AlicizationMainGatewayResponseFormat {
  readonly type: 'json_schema'
  readonly json_schema: {
    readonly name: string
    readonly strict: boolean
    readonly schema: Readonly<Record<string, unknown>>
  }
}

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
  responseFormat?: AlicizationMainGatewayResponseFormat
}

export interface AlicizationMainGatewayTextProvider {
  (input: AlicizationMainGatewayTextProviderOptions): Promise<string | null>
}

interface MainGatewayOneShotGenerateTextOptions extends AlicizationMainGatewayTextProviderOptions {}

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
  if (message.content.includes('[ALICIZATION_DIALOGUE_SESSION_MIRROR]'))
    return 2
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

export function createAlicizationMainGatewayOneShotRuntime(options: CreateAlicizationMainGatewayOneShotRuntimeOptions) {
  function sanitizeOneShotProviderSystemBlock(raw: unknown) {
    const text = sanitizeMultilineText(raw).trim()
    if (!text)
      return ''

    try {
      const parsed = JSON.parse(text) as {
        data?: unknown
        type?: unknown
      }
      if (
        !parsed
        || typeof parsed !== 'object'
        || typeof parsed.type !== 'string'
        || parsed.data === undefined
      ) {
        return ''
      }
      return JSON.stringify(parsed)
    }
    catch {
      return ''
    }
  }

  function mainGatewayAuditDescriptorForSource(source: AlicizationMainGatewaySource | null | undefined) {
    const family = resolveAlicizationMainGatewayAuditFamilyForSource(source)
    return {
      source: source ?? 'unknown',
      family,
      registered: isAlicizationRegisteredMainGatewaySource(source),
    }
  }

  function buildScreenSemanticContext(input: {
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
  }) {
    return buildAlicizationProviderFactBlock('alicization-screen-semantic-context', {
      version: 'alicization-screen-semantic-context-v1',
      captureSource: {
        name: sanitizeBriefText(input.sourceName, 120) || null,
      },
      focusTarget: input.focusTarget
        ? {
            appName: sanitizeBriefText(input.focusTarget.appName ?? '', 120) || null,
            processName: sanitizeBriefText(input.focusTarget.processName ?? '', 120) || null,
            title: sanitizeBriefText(input.focusTarget.title ?? '', 240) || null,
            source: sanitizeBriefText(input.focusTarget.source ?? '', 48) || null,
          }
        : null,
      foregroundWindow: input.foregroundWindow
        ? {
            appName: sanitizeBriefText(input.foregroundWindow.appName ?? '', 120) || null,
            processName: sanitizeBriefText(input.foregroundWindow.processName ?? '', 120) || null,
            title: sanitizeBriefText(input.foregroundWindow.title ?? '', 240) || null,
          }
        : null,
      evidencePolicy: {
        visiblePixelsAuthoritative: true,
        windowMetadataFallbackOnly: true,
        inventedDetailsAllowed: false,
      },
    })
  }

  function buildScreenSemanticUserContent(imageDataUrl: string): CommonContentPart[] {
    return [
      {
        type: 'text',
        text: buildAlicizationProviderFactBlock('alicization-screen-semantic-request', {
          version: 'alicization-screen-semantic-request-v1',
          operation: 'classify-screen-semantic-summary',
          responseSchema: 'alicization_screen_semantic_summary',
        }),
      },
      {
        type: 'image_url',
        image_url: {
          url: imageDataUrl,
        },
      } as CommonContentPart,
    ]
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
      await options.appendRuntimeDebugLine('main-gateway.one-shot-missing-source', {
        cardId: oneShotCardId,
        source: 'unknown',
        gatewayAuditFamily: null,
        gatewaySourceRegistered: false,
      })
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.main-gateway',
        action: 'missing-main-gateway-source',
        message: 'A one-shot main gateway call entered the runtime without a source tag, so routing and failure attribution could not be verified.',
        payload: {
          source: 'unknown',
          cardId: oneShotCardId,
          gatewaySourceRegistered: false,
        },
      }, oneShotCardId)
      return null
    }

    const gatewayAuditDescriptor = mainGatewayAuditDescriptorForSource(generateOptions.source)
    if (isAlicizationUnregisteredMainGatewaySource(generateOptions.source)) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-unregistered-source', {
        cardId: oneShotCardId,
        source: generateOptions.source,
        gatewayAuditFamily: null,
        gatewaySourceRegistered: false,
      })
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.main-gateway',
        action: 'unregistered-main-gateway-source',
        message: 'A one-shot main gateway call used an unregistered source tag.',
        payload: {
          source: generateOptions.source,
          cardId: oneShotCardId,
          gatewaySourceRegistered: false,
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
        gatewayAuditFamily: gatewayAuditDescriptor.family,
        gatewaySourceRegistered: gatewayAuditDescriptor.registered,
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

    const systemMessages: Message[] = [
      ...(customDirectiveBlock
        ? [{ role: 'system', content: customDirectiveBlock } as Message]
        : []),
      ...(executionCallbackContext.systemBlock
        ? [{ role: 'system', content: executionCallbackContext.systemBlock } as Message]
        : []),
      ...(generateOptions.extraSystemBlocks ?? [])
        .map(block => sanitizeOneShotProviderSystemBlock(block))
        .filter(Boolean)
        .map(content => ({ role: 'system', content }) as Message),
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
        gatewayAuditFamily: gatewayAuditDescriptor.family,
        gatewaySourceRegistered: gatewayAuditDescriptor.registered,
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
          gatewayAuditFamily: gatewayAuditDescriptor.family,
          gatewaySourceRegistered: gatewayAuditDescriptor.registered,
          beforeChars: promptCompaction.beforeChars,
          afterChars: promptCompaction.afterChars,
          maxChars: promptCompaction.maxChars,
          compactedMessageCount: promptCompaction.compactedMessageCount,
        },
      }, oneShotCardId)
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
          responseFormat: generateOptions.responseFormat,
          headers: config.headers,
          abortSignal: controller.signal,
        })
        const rawText = (result.text ?? '').trim()
        const fullText = rawText
        await options.appendRuntimeDebugLine('main-gateway.one-shot-finished', {
          cardId: oneShotCardId,
          source: generateOptions.source ?? 'unknown',
          gatewayAuditFamily: gatewayAuditDescriptor.family,
          gatewaySourceRegistered: gatewayAuditDescriptor.registered,
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
        gatewayAuditFamily: gatewayAuditDescriptor.family,
        gatewaySourceRegistered: gatewayAuditDescriptor.registered,
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
          gatewayAuditFamily: gatewayAuditDescriptor.family,
          gatewaySourceRegistered: gatewayAuditDescriptor.registered,
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
      system: buildScreenSemanticContext({
        foregroundWindow: input.foregroundWindow,
        sourceName: input.source.name,
        focusTarget: input.focusTarget,
      }),
      user: buildScreenSemanticUserContent(input.imageDataUrl),
      timeoutMs: proactiveScreenSemanticTimeoutMs,
      source: 'screen-semantic',
      responseFormat: alicizationScreenSemanticResponseFormat,
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: {
        turnId: options.buildMainGatewayAgentTurnId('screen-semantic', input.cardId, input.source.id, input.now),
      },
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
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
