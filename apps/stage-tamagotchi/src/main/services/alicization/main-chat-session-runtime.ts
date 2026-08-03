import type {
  AlicizationChannelCapability,
  AlicizationChatFailureKind,
  AlicizationChatMemoryFailureSurface,
  AlicizationExecutionCapabilityChannel,
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionRoutingIntent,
  AlicizationPersonaKernelSnapshot,
} from '@proj-alicization/stage-shared'
import type { PromptBudgetReport } from '@proj-alicization/stage-ui/composables/alicization-guardrails'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatStartPayload,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationMindTurnContractSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationRecallGovernorSnapshot,
  AlicizationSensoryCacheSnapshot,
  AlicizationSensoryCaptureHealth,
  AlicizationSensoryCapturePermission,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionContinuityInput,
  AlicizationAgentTurnRuntime,
} from './agent-runtime'
import type {
  AlicizationDialogueSessionManager,
  AlicizationDialogueSessionMirror,
} from './dialogue-session-manager'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'
import type {
  AlicizationExecutionCallbackContext,
  AlicizationExecutionCallbackDigest,
} from './execution-callback-runtime'
import type { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type { WorkingMemoryRecentTurnInput } from './life-core/working-memory-builder'
import type { WorkingMemoryStore } from './life-core/working-memory-store'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'
import type { AlicizationMainChatActionObligation } from './main-chat-action-obligation'
import type { AlicizationMainChatExecutionReplyObligation } from './main-chat-execution-reply-obligation'
import type {
  BuildMainGatewayToolsOptions,
  MainGatewayExecutionToolContext,
} from './main-chat-execution-surface'
import type { AlicizationMainChatMemoryContext } from './main-chat-memory-context'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'
import type { AlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'
import type { AlicizationExecutionLedgerContext } from './memory-ledger-runtime'
import type { buildAlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import type { AlicizationMemoryOsTurnRuntimeArtifact } from './memory-os/runtime'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  MainGatewayResolvedConfig,
  OrganicMemoryPromptContext,
  OrganicMemoryRecollectionCarry,
  PreparedMainChatExecution,
  ResolvedCardCustomDirectives,
} from './runtime-soul'
import type { AlicizationSelfEvolutionVersionRuntimeSnapshot } from './self-evolution/version-runtime'
import type { AlicizationTurnRuntimeContext } from './turn-os/runtime'
import type { AlicizationTurnGraph } from './turn-os/turn-graph'
import type { AlicizationMainChatReplyAuthoritySurface, AlicizationMainChatReplyExecutionPlanSurface } from './visible-reply/facade'

import { errorMessageFrom } from '@moeru/std'
import {
  containsAlicizationFixedTemplateResidue,
  normalizeAlicizationRuntimeDigest,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'
import { applyPromptBudget } from '@proj-alicization/stage-ui/composables/alicization-guardrails'

import { deriveAlicizationDialogueMemoryCarryPolicy } from './dialogue-memory-governor'
import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { buildWorkingMemorySnapshot } from './life-core/working-memory-builder'
import {
  buildWorkingMemoryOwnerContext,
  projectWorkingMemoryOwnerEpisodes,
} from './life-core/working-memory-owner-context'
import { createWorkingMemoryStore } from './life-core/working-memory-store'
import {
  applyMainChatExecutionReplyObligationToGovernance,
  buildMainChatExecutionReplyObligationSystemBlock,
  deriveMainChatExecutionReplyObligation,
} from './main-chat-execution-reply-obligation'
import {
  buildExecutionCapabilitySystemBlocks,
  buildExecutionRoutingEnforcementSystemBlock,
  buildMainGatewayExecutionRoutingToolChoice,
  buildMainGatewayTools,
} from './main-chat-execution-surface'
import { buildAlicizationMainChatMemoryContext } from './main-chat-memory-context'
import {
  buildAlicizationMainChatRuntimeSurface,
  filterAlicizationProviderSystemMessages,
} from './main-chat-runtime-surface'
import { runAlicizationMemoryOsTurnRuntime } from './memory-os/runtime'
import { buildAlicizationPersonMemoryCapsule } from './person-memory-capsule'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import {
  deriveRuntimeProjectionRelationshipCarry,
} from './prepared-runtime-continuity'
import { reduceRuntimeAnswerPlanner } from './runtime-answer-planner-reducer'
import { reduceRuntimeConsciousFrame } from './runtime-conscious-frame-reducer'
import { applyExecutionCallbackCarryToDigitalLifeRuntimeSurface } from './runtime-execution-callback-carry-reducer'
import {
  applyHostPersonModelToDigitalLifeRuntimeSurface,
  applyHostPersonModelToGovernance,
} from './runtime-host-person-model-reducer'
import { runOrganicLearningGovernor } from './runtime-learning-governor'
import {
  applyMemoryDeliberationToDigitalLifeRuntimeSurface,
  applyMemoryDeliberationToGovernance,
} from './runtime-memory-deliberation-reducer'
import { deriveRuntimeReplyAuthorityGovernance } from './runtime-reply-authority'
import {
  resolvePreferredRuntimeSurface as resolveRuntimeSurfaceContinuityPreferredRuntimeSurface,
} from './runtime-surface-continuity-selection'
import { readTransportContentAsText } from './runtime-transport-content'
import {
  deriveOrganicMemoryBudgetClass,
  filterMainGatewayToolsForRoutingIntent,
  sanitizeToolPhaseSegment,
} from './runtime-turn-composition'
import { createAlicizationTurnRuntime } from './turn-os/runtime'

export interface AlicizationMainChatPerceptionAugmentation {
  messages: Message[]
  systemBlocks: string[]
  promptSystemBlocks: string[]
  digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  memoryRecallSeed: string
  organicMemoryPromptContext?: OrganicMemoryPromptContext | null
  recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
  capture: {
    inspectionRequested: boolean
    groundedThisTurn: boolean
    snapshot: {
      degradedReasons: string[]
      health: AlicizationSensoryCaptureHealth
      permission: AlicizationSensoryCapturePermission
    } | null
    fallbackReason: string | null
  }
  chatGovernance: {
    turnMode: AlicizationMindTurnGovernance['turnMode']
    personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
    mindTurnContract: AlicizationMindTurnContractSnapshot | null
    mindTurnGovernance: AlicizationMindTurnGovernance | null
  }
}

export interface AlicizationPreparedMainChatPrelude {
  actionObligation: AlicizationMainChatActionObligation
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  contextualStringPromise: Promise<string>
  executionCallbackContextPromise: Promise<AlicizationExecutionCallbackContext>
  executionLedgerContextPromise: Promise<AlicizationExecutionLedgerContext>
  executionCapabilityInquiry: AlicizationExecutionCapabilityInquiry
  executionRoutingIntent: AlicizationExecutionRoutingIntent | null
  perceptionAugmentation: AlicizationMainChatPerceptionAugmentation
}

export type AlicizationMainChatMemoryFailureSurface = AlicizationChatMemoryFailureSurface

export interface AlicizationPreparedMainChatExecutionResult extends PreparedMainChatExecution {
  conversationSessionId: string | null
  executionReplyObligation?: AlicizationMainChatExecutionReplyObligation | null
  freshExecutionReplyCallback?: AlicizationExecutionCallbackDigest | null
  getSessionTrace: () => AlicizationRuntimeCallChainSnapshot
  memoryContext: AlicizationMainChatMemoryContext
  memoryFailures: AlicizationMainChatMemoryFailureSurface[]
  promptBudgetReport?: PromptBudgetReport
  mindTurnContract: AlicizationMindTurnContractSnapshot | null
  organicMemoryContext?: OrganicMemoryPromptContext
  memoryTurnArtifact?: ReturnType<typeof buildAlicizationMemoryTurnArtifact>
  memoryOsRuntime?: AlicizationMemoryOsTurnRuntimeArtifact
  turnRuntimeContext?: AlicizationTurnRuntimeContext
  personaKernel: AlicizationPersonaKernelSnapshot | null
  performanceManifest: CharacterPerformanceCapabilitiesManifest | null
  replyRealization: AlicizationMainChatReplyAuthoritySurface | null
  replyExecutionPlan: AlicizationMainChatReplyExecutionPlanSurface | null
  runtimeSurface: AlicizationMainChatRuntimeSurface
  sessionMirror: AlicizationDialogueSessionMirror | null
  sessionTrace: AlicizationRuntimeCallChainSnapshot
  turnGraph: AlicizationTurnGraph
}

interface PreparedRuntimeSurfaceChainDiagnostics {
  memoryDeliberationRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  effectiveDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  sociallyShapedDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  executionCallbackCarryRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  consciousFrameReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  answerPlannerReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
}

interface WorkingMemoryConversationTurnRecord {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structuredJson: string | null
  createdAt: number
}

interface CreateAlicizationMainChatSessionRuntimeOptions {
  buildMainRuntimeCorePromptBlocks: (input: {
    hostName: string
    personaKernel?: AlicizationPersonaKernelSnapshot | null
  }) => string[]
  dialogueSessionManager?: AlicizationDialogueSessionManager
  dialogueSessionMirrorTtlMs?: number
  workingMemoryStore?: WorkingMemoryStore
  enqueueWorkingMemoryLongTermQueue?: (input: {
    cardId: string
    sessionId: string
    items: ReturnType<typeof buildWorkingMemoryOwnerContext>['longTermQueue']
  }) => Promise<void>
  drainWorkingMemoryLongTermQueue?: (limit?: number) => Promise<unknown>
  listConversationTurnsBySession?: (
    sessionId: string,
    options?: { limit?: number },
  ) => Promise<WorkingMemoryConversationTurnRecord[]>
  getWorkingMemoryCheckpoint?: (cardId: string, sessionId: string) => Promise<WorkingMemorySnapshot | null>
  persistWorkingMemoryCheckpoint?: (snapshot: WorkingMemorySnapshot) => Promise<void>
  promptBudgetTokens?: number
  retrieveLongTermMemoryEvidence?: (input: {
    cardId: string
    currentUserText: string
    workingMemoryQueryHints?: string[]
    currentThreadTitle?: string | null
    activeTask?: string | null
    limit?: number
  }) => Promise<LongTermMemoryEvidenceBundle>
  persistAutobiographicalEpisodesFromPreparedMirror?: (input: {
    cardId: string
    decisionTraceId?: string | null
    turnId?: string | null
    sessionId: string
    previousMirror?: AlicizationDialogueSessionMirror | null
    mirror: AlicizationDialogueSessionMirror
  }) => Promise<void> | void
  executionCapabilityChannels: readonly AlicizationExecutionCapabilityChannel[]
  executeMainGatewayTaskThread: BuildMainGatewayToolsOptions['executeTaskThread']
  resumeMainGatewayTaskThread?: BuildMainGatewayToolsOptions['resumeTaskThread']
  getNow?: () => number
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot> | AlicizationSensoryCacheSnapshot
  latestUserMessageContainsVisualInput: (messages: Message[]) => boolean
  openAgentTurn: (input: {
    cardId: string
    decisionTraceId?: string | null
    turnId: string
  }) => Promise<AlicizationAgentTurnRuntime> | AlicizationAgentTurnRuntime
  resolveCardCustomDirectives: (cardId: string, input: { messages: Message[] }) => Promise<ResolvedCardCustomDirectives>
  resolveCardPersonaKernel: (cardId: string, input: { messages: Message[] }) => Promise<AlicizationPersonaKernelSnapshot | null>
  resolveCardHostName: (cardId: string, input: { messages: Message[] }) => Promise<string>
  resolveExecutionCapabilitiesForPrompt: () => Promise<AlicizationChannelCapability[]>
  resolveOrganicMemoryPromptContext: (input: {
    recallSeed: string
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
    sessionMirrorRecollection?: OrganicMemoryRecollectionCarry | null
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<OrganicMemoryPromptContext>
  scheduleOrganicLearningAction?: (input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
  }) => Promise<unknown>
  listMemoryReflections?: (cardId: string, limit?: number) => Promise<Array<{
    id: string
    summary: string
    lesson: string
    status: 'pending' | 'confirmed' | 'denied' | 'superseded'
  }>>
  listRelationshipOutcomes?: (cardId: string, limit?: number) => Promise<Array<{
    id: string
    summary: string
  }>>
  prewarmOrganicMemoryAccessibility?: (input: {
    recallSeed: string
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) => Promise<unknown>
  resolveTurnRetrievalPolicySnapshot?: (input: {
    recallSeed: string
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<AlicizationTurnRetrievalPolicySnapshot>
  getActiveSelfEvolutionSnapshot?: () => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot | null>
  resolveSessionContinuitySignals?: (input: {
    cardId: string
    turnId: string
  }) => Promise<AlicizationAgentSessionContinuityInput[]>
  browserOpenUrl?: BuildMainGatewayToolsOptions['browserOpenUrl']
  browserSearchWeb?: BuildMainGatewayToolsOptions['browserSearchWeb']
  browserReadPage?: BuildMainGatewayToolsOptions['browserReadPage']
  browserClickElement?: BuildMainGatewayToolsOptions['browserClickElement']
  browserTypeText?: BuildMainGatewayToolsOptions['browserTypeText']
  browserNavigate?: BuildMainGatewayToolsOptions['browserNavigate']
  browserScroll?: BuildMainGatewayToolsOptions['browserScroll']
  browserWait?: BuildMainGatewayToolsOptions['browserWait']
  desktopListInteractables?: BuildMainGatewayToolsOptions['desktopListInteractables']
  desktopClickElement?: BuildMainGatewayToolsOptions['desktopClickElement']
  desktopTypeText?: BuildMainGatewayToolsOptions['desktopTypeText']
  desktopPressKeys?: BuildMainGatewayToolsOptions['desktopPressKeys']
  desktopWait?: BuildMainGatewayToolsOptions['desktopWait']
  desktopInspectScene?: BuildMainGatewayToolsOptions['desktopInspectScene']
  desktopOpenApplication?: BuildMainGatewayToolsOptions['desktopOpenApplication']
  resolveTaskPlanningCapabilities: BuildMainGatewayToolsOptions['resolveTaskPlanningCapabilities']
  scheduleReminderTask: BuildMainGatewayToolsOptions['scheduleReminderTask']
  tuneOrganicMemoryPromptContextForExecutiveTurn: (input: {
    context: OrganicMemoryPromptContext
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
  }) => OrganicMemoryPromptContext
  invokeMcpCallTool: BuildMainGatewayToolsOptions['invokeMcpCallTool']
  invokeMcpListTools: BuildMainGatewayToolsOptions['invokeMcpListTools']
  onPreparedExecutionDiagnostics?: (input: {
    preparedRuntimeSurfaceChain: PreparedRuntimeSurfaceChainDiagnostics
    preparedRuntimeSurfaceSelection: {
      fresherRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
      runtimeSurfaceForBuilder: AlicizationDigitalLifeRuntimeSurface | null
      selectionDiagnostics: {
        preAdjustmentSelectedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
      } | null
    }
    rebuiltMindTurnContract: AlicizationMindTurnContractSnapshot | null
    normalizedMindTurnContract: AlicizationMindTurnContractSnapshot | null
    mirrorFlowDiagnostics?: {
      incomingPreludeDialogueSessionMirror: AlicizationDialogueSessionMirror | null
      rawSessionMirror: AlicizationDialogueSessionMirror | null
      finalSessionMirror: AlicizationDialogueSessionMirror | null
    } | null
    baseNextClosureTargets?: {
      dialogue: string | null
      raw: string | null
      cognition: string | null
    }
    preparedChainStageNextClosureTargets?: Record<string, {
      dialogue: string | null
      raw: string | null
      cognition: string | null
    }>
    selectedRuntimeSurfaceBeforeAdjustmentNextClosureTargets?: {
      dialogue: string | null
      raw: string | null
      cognition: string | null
    }
    selectedFresherNextClosureTargets?: {
      dialogue: string | null
      raw: string | null
      cognition: string | null
    }
    postBuilderNextClosureTargets?: {
      rawRuntimeSurfaceDialogue: string | null
      finalRuntimeSurfaceDialogue: string | null
    }
    answerPlannerReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
    baseDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
    runtimeSurfaceForBuilder: AlicizationDigitalLifeRuntimeSurface | null
    returnedMindTurnContract?: AlicizationMindTurnContractSnapshot | null
    finalizedReturnedMindTurnContract?: AlicizationMindTurnContractSnapshot | null
    runtimeSurface?: AlicizationMainChatRuntimeSurface | null
    returnedRuntimeSurface?: AlicizationMainChatRuntimeSurface | null
  }) => void
}

function normalizeSessionPhases(phases: string[]) {
  return [...new Set(phases.map(phase => phase.trim()).filter(Boolean))]
}

function normalizePreparedExecutionText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return null
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  return normalized || null
}

function readLatestUserMessageText(messages: Message[]) {
  const latestUserMessage = [...messages].reverse().find(message => message?.role === 'user')
  return normalizePreparedExecutionText(readTransportContentAsText(latestUserMessage?.content), 1200) || ''
}

const alicizationProviderMemoryFactTypes = new Set([
  'alicization-long-term-memory-recall',
  'alicization-memory-context',
  'alicization-turn-memory-context',
])

function isAlicizationProviderMemorySystemMessage(message: Message) {
  if (message.role !== 'system' || typeof message.content !== 'string')
    return false

  try {
    const parsed = JSON.parse(message.content) as { type?: unknown }
    return typeof parsed?.type === 'string'
      && alicizationProviderMemoryFactTypes.has(parsed.type)
  }
  catch {
    return false
  }
}

function injectAlicizationMainChatMemoryContext(
  messages: Message[],
  context: AlicizationMainChatMemoryContext,
) {
  const messagesWithoutMemoryContext = messages.filter(
    message => !isAlicizationProviderMemorySystemMessage(message),
  )
  const firstNonSystemIndex = messagesWithoutMemoryContext.findIndex(
    message => message.role !== 'system',
  )
  const insertionIndex = firstNonSystemIndex === -1
    ? messagesWithoutMemoryContext.length
    : firstNonSystemIndex
  const memoryContextMessage = {
    role: 'system',
    content: context.providerSystemBlock,
  } as Message

  return [
    ...messagesWithoutMemoryContext.slice(0, insertionIndex),
    memoryContextMessage,
    ...messagesWithoutMemoryContext.slice(insertionIndex),
  ]
}

function normalizeAlicizationMemoryFailureErrorSummary(error: unknown) {
  const errorSummary = errorMessageFrom(error)
    ?.trim()
    .replace(/\s+/gu, ' ')
    .slice(0, 320)
    .trim()

  return errorSummary || 'Long-term memory recall failed.'
}

function buildUnavailableLongTermMemoryEvidenceBundle(
  currentUserText: string,
  riskFlag: 'recall-failed' | 'recall-owner-unavailable',
): LongTermMemoryEvidenceBundle {
  return {
    intent: {
      mode: 'none',
      shouldRecall: false,
      confidence: 0,
      rationale: 'recall:unavailable',
      temporalFocus: 'unspecified',
      targetKinds: [],
      queryHints: [],
      riskFlags: [riskFlag],
    },
    plan: {
      rawQuery: currentUserText,
      normalizedQuery: currentUserText,
      keywordQueries: [],
      phraseQueries: [],
      charGramQueries: [],
      semanticQueries: [],
      episodicQueries: [],
      temporalHints: [],
      entityHints: [],
      procedureHints: [],
      threadHints: [],
      negativeCues: [],
      confidencePolicy: 'direct',
      riskFlags: [riskFlag],
      targetKinds: [],
    },
    evidence: [],
    confidence: 0,
    budgetClass: 'none',
  }
}

function normalizeProviderReplyAuthorityContract(
  contract: AlicizationMindTurnContractSnapshot,
): AlicizationMindTurnContractSnapshot {
  return {
    version: 'mind-turn-contract-v1',
    expectedVisibleReplyAuthority: contract.expectedVisibleReplyAuthority === 'llm-mind'
      ? contract.expectedVisibleReplyAuthority
      : 'llm-mind',
    replyRealizationMode: 'provider-mind-required',
    updatedAt: Number.isFinite(contract.updatedAt)
      ? Math.max(0, Math.floor(contract.updatedAt))
      : Date.now(),
  }
}

function buildWorkingMemoryRecentTurns(
  messages: Message[],
  now: number,
  executionCarryText: string | null,
): WorkingMemoryRecentTurnInput[] {
  const visibleMessages = messages
    .filter(message => message?.role === 'user' || message?.role === 'assistant')
    .slice(-6)
  const recentMessages = visibleMessages.at(-1)?.role === 'user'
    ? visibleMessages.slice(0, -1)
    : visibleMessages

  const recentTurns: WorkingMemoryRecentTurnInput[] = recentMessages
    .map((message, index): WorkingMemoryRecentTurnInput | null => {
      const text = normalizePreparedExecutionText(readTransportContentAsText(message.content), 1200)
      if (!text)
        return null
      return message.role === 'assistant'
        ? {
            turnId: `message-${index + 1}`,
            assistantText: text,
            createdAt: now - (recentMessages.length - index),
          }
        : {
            turnId: `message-${index + 1}`,
            userText: text,
            createdAt: now - (recentMessages.length - index),
          }
    })
    .filter((turn): turn is WorkingMemoryRecentTurnInput => Boolean(turn))

  if (executionCarryText) {
    recentTurns.push({
      turnId: 'execution-carry',
      assistantText: executionCarryText,
      createdAt: now,
    })
  }

  return recentTurns
}

function mergeWorkingMemoryRecentTurns(
  persistedTurns: WorkingMemoryRecentTurnInput[],
  inMemoryTurns: WorkingMemoryRecentTurnInput[],
) {
  const merged: WorkingMemoryRecentTurnInput[] = []
  const seenUserTexts = new Set<string>()
  const seenAssistantTexts = new Set<string>()

  const appendTurn = (turn: WorkingMemoryRecentTurnInput) => {
    const userText = normalizePreparedExecutionText(turn.userText, 1200)
    const assistantText = normalizePreparedExecutionText(turn.assistantText, 1200)
    const nextUserText = userText && !seenUserTexts.has(userText)
      ? userText
      : null
    const nextAssistantText = assistantText && !seenAssistantTexts.has(assistantText)
      ? assistantText
      : null
    if (!nextUserText && !nextAssistantText)
      return

    if (nextUserText)
      seenUserTexts.add(nextUserText)
    if (nextAssistantText)
      seenAssistantTexts.add(nextAssistantText)
    merged.push({
      ...turn,
      userText: nextUserText,
      assistantText: nextAssistantText,
    })
  }

  persistedTurns.forEach(appendTurn)
  inMemoryTurns.forEach(appendTurn)

  return merged
    .sort((left, right) => Number(left.createdAt ?? 0) - Number(right.createdAt ?? 0))
    .slice(-8)
}

function parseWorkingMemoryStructuredTurn(raw: string | null | undefined) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

function mapPersistedConversationTurnsToWorkingMemory(
  turns: Awaited<ReturnType<NonNullable<CreateAlicizationMainChatSessionRuntimeOptions['listConversationTurnsBySession']>>>,
): WorkingMemoryRecentTurnInput[] {
  return turns.slice(-6).map((turn, index) => {
    const structured = parseWorkingMemoryStructuredTurn(turn.structuredJson)
    const nestedFailureSurface = structured?.failureSurface && typeof structured.failureSurface === 'object'
      ? structured.failureSurface as Record<string, unknown>
      : null
    const rawFailureSurface = nestedFailureSurface
      ?? (
        structured?.origin === 'failure-surface'
        && typeof structured.kind === 'string'
          ? structured
          : null
      )
    const rawOrigin = rawFailureSurface?.origin === 'failure-surface'
      ? 'failure-surface'
      : structured?.origin
    const origin = rawOrigin === 'provider'
      || rawOrigin === 'failure-surface'
      || rawOrigin === 'authorization-surface'
      ? rawOrigin
      : null
    const rawLearningPolicy = structured?.learningPolicy && typeof structured.learningPolicy === 'object'
      ? structured.learningPolicy as Record<string, unknown>
      : structured
        && (
          'allowLongTermCondensation' in structured
          || 'allowPersonaLearning' in structured
          || 'allowTraining' in structured
        )
        ? structured
        : null
    const learningPolicy = rawLearningPolicy
      ? {
          allowLongTermCondensation: rawLearningPolicy.allowLongTermCondensation === true,
          allowPersonaLearning: rawLearningPolicy.allowPersonaLearning === true,
          allowTraining: false,
        }
      : rawFailureSurface
        ? {
            allowLongTermCondensation: false,
            allowPersonaLearning: false,
            allowTraining: false,
          }
        : null
    const failureKind = typeof rawFailureSurface?.kind === 'string'
      ? rawFailureSurface.kind as AlicizationChatFailureKind
      : null
    const memorySideFailureAuditText = structured?.artifactRole === 'memory-side-failure'
      ? [
          rawFailureSurface?.reply,
          rawFailureSurface?.errorSummary,
          failureKind,
        ].find(value => typeof value === 'string' && value.trim().length > 0) as string | undefined
      : undefined
    const assistantText = turn.assistantText ?? memorySideFailureAuditText ?? null

    return {
      turnId: turn.turnId ?? `persisted-${index + 1}`,
      userText: turn.userText,
      assistantText,
      createdAt: turn.createdAt,
      origin,
      learningPolicy,
      failureSurface: failureKind && origin === 'failure-surface'
        ? {
            kind: failureKind,
            origin: 'failure-surface',
            allowLongTermCondensation: false,
            allowPersonaLearning: false,
            allowTraining: false,
          }
        : null,
      contaminated: containsAlicizationFixedTemplateResidue(assistantText ?? '', {
        provenance: 'internal-structured-fact',
      }),
    }
  })
}

function buildWorkingMemoryOwnerContextFromRuntime(input: {
  cardId: string
  currentConsciousFrame: AlicizationCurrentConsciousFrameSnapshot | null
  conversationState: AlicizationConversationStateSnapshot | null
  dialogueWorldThread: AlicizationDialogueWorldThreadSnapshot | null
  executionCallbackRecallText: string
  executionLedgerRecallText: string
  messages: Message[]
  now: number
  persistedRecentTurns?: WorkingMemoryRecentTurnInput[]
  previousSnapshot?: WorkingMemorySnapshot | null
  sessionId: string
}) {
  const executionCarryText = [
    input.executionCallbackRecallText,
    input.executionLedgerRecallText,
  ].map(text => normalizePreparedExecutionText(text, 1200)).filter(Boolean).join('\n') || null
  const recentTurns = mergeWorkingMemoryRecentTurns(
    input.persistedRecentTurns ?? [],
    buildWorkingMemoryRecentTurns(input.messages, input.now, null),
  )
  if (executionCarryText) {
    recentTurns.push({
      turnId: 'execution-carry',
      assistantText: executionCarryText,
      createdAt: input.now,
    })
  }

  const snapshot = buildWorkingMemorySnapshot({
    cardId: input.cardId,
    sessionId: input.sessionId,
    now: input.now,
    currentUserText: readLatestUserMessageText(input.messages),
    recentTurns,
    conversationState: input.conversationState as any,
    dialogueWorldThread: input.dialogueWorldThread as any,
    currentConsciousFrame: input.currentConsciousFrame as any,
    executionCarry: executionCarryText,
    previousSnapshot: input.previousSnapshot,
  })
  const ownerContext = buildWorkingMemoryOwnerContext(snapshot)

  return {
    ownerContext,
    snapshot,
  }
}

function applyWorkingMemoryOwnerToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  snapshot: WorkingMemorySnapshot
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = ensurePreparedRuntimeSurfaceShape(input.surface)
  if (!surface)
    return surface

  return {
    ...surface,
    memory: {
      ...surface.memory,
      workingMemoryEpisodes: projectWorkingMemoryOwnerEpisodes(
        input.snapshot,
        surface.memory.workingMemoryEpisodes ?? [],
      ),
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}

function cloneRuntimeSurfaceForDiagnostics(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationDigitalLifeRuntimeSurface | null {
  if (!surface)
    return null
  return JSON.parse(JSON.stringify(surface)) as AlicizationDigitalLifeRuntimeSurface
}

function clonePreparedExecutionRuntimeSurfaceForDiagnostics(
  surface: AlicizationMainChatRuntimeSurface | null | undefined,
): AlicizationMainChatRuntimeSurface | null {
  if (!surface)
    return null
  return JSON.parse(JSON.stringify(surface)) as AlicizationMainChatRuntimeSurface
}

function normalizeProviderFacingProjectText(raw: unknown, maxChars = 1600) {
  if (typeof raw !== 'string')
    return null
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  return normalized || null
}

const SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS = 320
const SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS = 1600

function preferIncomingDialogueSessionMirror<T extends {
  recollection?: OrganicMemoryRecollectionCarry | null
}>(input: {
  incoming: T | null | undefined
  generated: T | null | undefined
}) {
  const incoming = input.incoming ?? null
  const generated = input.generated ?? null
  if (!incoming)
    return generated
  if (!generated)
    return incoming

  return {
    ...incoming,
    ...generated,
    recollection: generated.recollection ?? incoming.recollection ?? null,
  } as T
}

function createDefaultProviderFacingMindTurnContract(input: {
  governance: AlicizationMindTurnGovernance | null
}): AlicizationMindTurnContractSnapshot {
  void input.governance
  return {
    version: 'mind-turn-contract-v1',
    expectedVisibleReplyAuthority: 'llm-mind',
    replyRealizationMode: 'provider-mind-required',
    updatedAt: Date.now(),
  }
}

function restorePreparedRuntimeRelationshipCarry(
  surface: AlicizationDigitalLifeRuntimeSurface | null,
  context: OrganicMemoryPromptContext,
): AlicizationDigitalLifeRuntimeSurface | null {
  if (!surface)
    return surface

  const fallbackSelfContinuityAuthority = (() => {
    const rawAuthority = (
      context as {
        personState?: {
          selfContinuityAuthority?: {
            selfLine?: unknown
            relationshipLine?: unknown
            inwardLine?: unknown
            authoritySummary?: unknown
          } | null
        } | null
      }
    ).personState?.selfContinuityAuthority ?? null
    if (!rawAuthority)
      return null
    return {
      selfLine: normalizeProviderFacingProjectText(rawAuthority.selfLine, SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS) ?? null,
      relationshipLine: normalizeProviderFacingProjectText(rawAuthority.relationshipLine, 320) ?? null,
      motiveLine: null,
      habitLine: null,
      inwardLine: normalizeProviderFacingProjectText(rawAuthority.inwardLine, SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS) ?? null,
      authoritySummary: normalizeProviderFacingProjectText(rawAuthority.authoritySummary, SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS) ?? null,
      sourceTags: [],
    }
  })()
  const relationshipCarry
    = deriveRuntimeProjectionRelationshipCarry(
      context.personStateProjection ?? null,
    )
    ?? normalizeProviderFacingProjectText(fallbackSelfContinuityAuthority?.relationshipLine, 320)
  if (!relationshipCarry)
    return surface

  const currentAuthority = surface.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const currentRelationshipLine = normalizeProviderFacingProjectText(currentAuthority?.relationshipLine, 320)
  if (currentRelationshipLine)
    return surface
  const surfaceProjection = surface.memory?.personStateProjection ?? null
  const contextProjection = context.personStateProjection ?? null
  const fallbackProjectionContexts = surfaceProjection?.contexts
    ?? contextProjection?.contexts
    ?? ['general']
  const fallbackPreviousContinuityState = surface.memory?.personalityContinuityState
    ?? contextProjection?.personalityContinuityState
    ?? null
  const baseProjection = surfaceProjection
    ?? contextProjection
    ?? (
      currentAuthority || fallbackSelfContinuityAuthority
        ? buildAlicizationPersonStateProjection({
            now: surface.perception?.updatedAt ?? Date.now(),
            contexts: fallbackProjectionContexts,
            personStateAuthority: currentAuthority ?? fallbackSelfContinuityAuthority,
            autobiographicalSelf: surface.memory?.autobiographicalSelf ?? null,
            hostPersonModel: context.hostPersonModel ?? surface.memory?.hostPersonModel ?? null,
            longHorizonMemory: surface.memory?.longHorizonMemory ?? null,
            motiveEngine: surface.memory?.motiveEngine ?? null,
            habitPolicy: surface.agency?.habitPolicy ?? null,
            selfContinuity: surface.memory?.selfContinuity ?? null,
            selfState: surface.agency?.selfState ?? null,
            privateThought: surface.cognition?.privateThought ?? null,
            mindEcology: null,
            selfEvolution: context.selfEvolution ?? surface.memory?.selfEvolution ?? null,
            previousContinuityState: fallbackPreviousContinuityState,
          })
        : null
    )
  if (!baseProjection)
    return surface

  const resolvedSelfLine
    = normalizeProviderFacingProjectText(currentAuthority?.selfLine, SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS)
      ?? normalizeProviderFacingProjectText(fallbackSelfContinuityAuthority?.selfLine, SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS)
      ?? null
  const resolvedSelfLineForSummary
    = normalizeProviderFacingProjectText(currentAuthority?.selfLine, SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS)
      ?? normalizeProviderFacingProjectText(fallbackSelfContinuityAuthority?.selfLine, SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS)
      ?? null
  const resolvedInwardLine
    = normalizeProviderFacingProjectText(currentAuthority?.inwardLine, SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS)
      ?? normalizeProviderFacingProjectText(fallbackSelfContinuityAuthority?.inwardLine, SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS)
      ?? null
  const resolvedInwardLineForSummary
    = normalizeProviderFacingProjectText(currentAuthority?.inwardLine, SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS)
      ?? normalizeProviderFacingProjectText(fallbackSelfContinuityAuthority?.inwardLine, SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS)
      ?? null

  const rebuiltAuthoritySummary = normalizeProviderFacingProjectText(
    [
      resolvedSelfLineForSummary,
      relationshipCarry,
      resolvedInwardLineForSummary,
    ].filter(Boolean).join(' | '),
    SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS,
  )

  return {
    ...surface,
    memory: {
      ...surface.memory,
      personStateProjection: {
        ...baseProjection,
        selfContinuityAuthority: {
          ...currentAuthority,
          selfLine: resolvedSelfLine,
          relationshipLine: relationshipCarry,
          motiveLine:
            normalizeProviderFacingProjectText(currentAuthority?.motiveLine, 320)
            ?? null,
          habitLine:
            normalizeProviderFacingProjectText(currentAuthority?.habitLine, 320)
            ?? null,
          inwardLine: resolvedInwardLine,
          authoritySummary:
            normalizeProviderFacingProjectText(currentAuthority?.authoritySummary, SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS)
            ?? normalizeProviderFacingProjectText(fallbackSelfContinuityAuthority?.authoritySummary, SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS)
            ?? rebuiltAuthoritySummary
            ?? null,
          sourceTags: Array.isArray(currentAuthority?.sourceTags) ? currentAuthority.sourceTags : [],
        },
      },
    },
  }
}

function ensurePreparedRuntimeSurfaceShape(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationDigitalLifeRuntimeSurface | null {
  if (!surface)
    return null

  const currentConsciousFrame = surface.dialogue?.currentConsciousFrame
    ? {
        subject: surface.dialogue.currentConsciousFrame.subject,
        centerOfGravity: surface.dialogue.currentConsciousFrame.centerOfGravity,
        truthDiscipline: surface.dialogue.currentConsciousFrame.truthDiscipline,
        consciousNeed: surface.dialogue.currentConsciousFrame.consciousNeed,
        consciousNeedSource: surface.dialogue.currentConsciousFrame.consciousNeedSource,
        consciousTension: surface.dialogue.currentConsciousFrame.consciousTension,
        speakingIntention: surface.dialogue.currentConsciousFrame.speakingIntention,
        focusAnchor: surface.dialogue.currentConsciousFrame.focusAnchor,
        focusAnchorSource: surface.dialogue.currentConsciousFrame.focusAnchorSource,
        withheldImpulse: surface.dialogue.currentConsciousFrame.withheldImpulse,
        shouldWithholdSpecificity: surface.dialogue.currentConsciousFrame.shouldWithholdSpecificity,
        shouldSelfRevise: surface.dialogue.currentConsciousFrame.shouldSelfRevise,
        confidence: surface.dialogue.currentConsciousFrame.confidence,
        reasonTags: Array.isArray(surface.dialogue.currentConsciousFrame.reasonTags)
          ? surface.dialogue.currentConsciousFrame.reasonTags.filter((tag): tag is string => typeof tag === 'string')
          : [],
        updatedAt: surface.dialogue.currentConsciousFrame.updatedAt,
      }
    : null
  const rawRuntimeDigest = normalizeAlicizationRuntimeDigest(surface.raw?.runtimeDigest)
  const cognitionRuntimeDigest = normalizeAlicizationRuntimeDigest(surface.cognition?.runtimeDigest)

  return {
    version: 'digital-life-runtime-surface-v1',
    raw: surface.raw
      ? {
          personStateProjection: surface.raw.personStateProjection ?? null,
          runtimeDigest: rawRuntimeDigest,
        }
      : null,
    perception: {
      ...surface.perception,
      watchMode: surface.perception?.watchMode ?? 'idle',
      currentScene: surface.perception?.currentScene ?? null,
      attention: surface.perception?.attention ?? null,
      captureState: surface.perception?.captureState ?? null,
      durabilityPulse: surface.perception?.durabilityPulse ?? null,
      recentTransition: surface.perception?.recentTransition ?? null,
      nextSuggestedProbeMs: surface.perception?.nextSuggestedProbeMs ?? 0,
      currentBodyState: surface.perception?.currentBodyState,
      continuityMode: surface.perception?.continuityMode,
      quietLineMs: surface.perception?.quietLineMs,
      currentInwardPreoccupation: surface.perception?.currentInwardPreoccupation ?? null,
      updatedAt: surface.perception?.updatedAt ?? Date.now(),
    },
    world: {
      ...surface.world,
      worldModel: surface.world?.worldModel ?? null,
      worldOntology: surface.world?.worldOntology ?? null,
      entityWorld: surface.world?.entityWorld ?? null,
      livingWorldState: surface.world?.livingWorldState ?? null,
      relationshipModel: surface.world?.relationshipModel ?? null,
    },
    cognition: {
      ...surface.cognition,
      mindTurnFrame: surface.cognition?.mindTurnFrame ?? null,
      subjectiveInference: surface.cognition?.subjectiveInference ?? null,
      appraisal: surface.cognition?.appraisal ?? null,
      beliefLedger: surface.cognition?.beliefLedger ?? null,
      beliefRevision: surface.cognition?.beliefRevision ?? null,
      hypothesisGraph: surface.cognition?.hypothesisGraph ?? null,
      mindDynamics: surface.cognition?.mindDynamics ?? null,
      mindKernel: surface.cognition?.mindKernel ?? null,
      privateThought: surface.cognition?.privateThought ?? null,
      runtimeDigest: cognitionRuntimeDigest,
    } as AlicizationDigitalLifeRuntimeSurface['cognition'],
    memory: {
      ...surface.memory,
      workingMemoryEpisodes: surface.memory?.workingMemoryEpisodes ?? [],
      goalStack: surface.memory?.goalStack ?? null,
      concerns: surface.memory?.concerns ?? [],
      concernContinuity: surface.memory?.concernContinuity ?? null,
      longHorizonMemory: surface.memory?.longHorizonMemory ?? null,
      selfContinuity: surface.memory?.selfContinuity ?? null,
      autobiographicalSelf: surface.memory?.autobiographicalSelf ?? null,
      threadRuntime: surface.memory?.threadRuntime ?? null,
      commitmentLedger: surface.memory?.commitmentLedger ?? null,
      inquiryPlanner: surface.memory?.inquiryPlanner ?? null,
      repairLedger: surface.memory?.repairLedger ?? null,
      intentionStream: surface.memory?.intentionStream ?? null,
      reflectionLedger: surface.memory?.reflectionLedger ?? null,
      executiveCycle: surface.memory?.executiveCycle ?? null,
      thoughtThreads: surface.memory?.thoughtThreads ?? null,
      desireMemory: surface.memory?.desireMemory ?? null,
      recallGovernor: surface.memory?.recallGovernor ?? null,
      motiveEngine: surface.memory?.motiveEngine ?? null,
      emotionalKernel: surface.memory?.emotionalKernel ?? null,
      hostPersonModel: surface.memory?.hostPersonModel ?? null,
      personalityContinuityState: surface.memory?.personalityContinuityState ?? null,
      personStateProjection: surface.memory?.personStateProjection ?? null,
      recollectionPlan: surface.memory?.recollectionPlan ?? null,
      recollectionSpeechPlan: surface.memory?.recollectionSpeechPlan ?? null,
      memoryDeliberation: surface.memory?.memoryDeliberation ?? null,
      memoryTuningAdvice: surface.memory?.memoryTuningAdvice ?? null,
      knowledgeEvidence: surface.memory?.knowledgeEvidence ?? null,
      selfEvolution: surface.memory?.selfEvolution ?? null,
      learningExecutionState: surface.memory?.learningExecutionState ?? null,
      affectiveResidue: surface.memory?.affectiveResidue ?? null,
      derivedMindStateBundle: surface.memory?.derivedMindStateBundle ?? null,
      memoryStageReplay: surface.memory?.memoryStageReplay ?? null,
      memoryResolutionLedger: surface.memory?.memoryResolutionLedger ?? null,
      memoryClosureTrace: surface.memory?.memoryClosureTrace ?? null,
      personMemoryCapsule: surface.memory?.personMemoryCapsule ?? null,
    } as AlicizationDigitalLifeRuntimeSurface['memory'],
    dialogue: {
      ...surface.dialogue,
      discourseState: surface.dialogue?.discourseState ?? null,
      dialogueEncounter: surface.dialogue?.dialogueEncounter ?? null,
      mindSynthesis: surface.dialogue?.mindSynthesis ?? null,
      conversationState: surface.dialogue?.conversationState ?? null,
      dialogueWorldThread: surface.dialogue?.dialogueWorldThread ?? null,
      dialogueActKernel: surface.dialogue?.dialogueActKernel ?? null,
      answerCompiler: surface.dialogue?.answerCompiler ?? null,
      currentConsciousFrame,
      claimEvidenceLedger: surface.dialogue?.claimEvidenceLedger ?? null,
      replyDeliberation: surface.dialogue?.replyDeliberation ?? null,
      answerPlanner: null,
    },
    agency: {
      ...surface.agency,
      selfState: surface.agency?.selfState ?? null,
      selfGovernor: surface.agency?.selfGovernor ?? null,
      inquiryLoop: surface.agency?.inquiryLoop ?? null,
      deliberationState: surface.agency?.deliberationState ?? null,
      counterfactualDeliberation: surface.agency?.counterfactualDeliberation ?? null,
      actionEcology: surface.agency?.actionEcology ?? null,
      initiativeArbitration: surface.agency?.initiativeArbitration ?? null,
      initiative: surface.agency?.initiative ?? null,
      autonomy: surface.agency?.autonomy ?? null,
      habitPolicy: surface.agency?.habitPolicy ?? null,
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}

function applyMemoryClosureTraceToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  memoryTurnArtifact: ReturnType<typeof buildAlicizationMemoryTurnArtifact> | null
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = ensurePreparedRuntimeSurfaceShape(input.surface)
  const memoryClosureTrace = input.memoryTurnArtifact?.memoryClosureTrace ?? null
  if (!surface || !memoryClosureTrace)
    return surface

  return {
    ...surface,
    memory: {
      ...surface.memory,
      memoryClosureTrace,
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}

function applyPersonMemoryCapsuleToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  context: OrganicMemoryPromptContext
  memoryTurnArtifact: ReturnType<typeof buildAlicizationMemoryTurnArtifact> | null
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = ensurePreparedRuntimeSurfaceShape(input.surface)
  if (!surface)
    return surface

  return {
    ...surface,
    memory: {
      ...surface.memory,
      personMemoryCapsule: buildAlicizationPersonMemoryCapsule(input.context, input.memoryTurnArtifact),
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}

function seedPreparedRuntimeProjectAwareness(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  rawPayload: AlicizationChatStartPayload | null | undefined
  sessionMirror: AlicizationDialogueSessionMirror | null | undefined
}): AlicizationDigitalLifeRuntimeSurface | null {
  void input.rawPayload
  void input.sessionMirror
  return ensurePreparedRuntimeSurfaceShape(input.surface)
}

function resolvePreferredRuntimeSurface(input: {
  preparedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  spineRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationDigitalLifeRuntimeSurface | null {
  const preparedRuntimeSurface = input.preparedRuntimeSurface ?? null
  const spineRuntimeSurface = input.spineRuntimeSurface ?? null
  if (!preparedRuntimeSurface)
    return spineRuntimeSurface
  if (!spineRuntimeSurface)
    return preparedRuntimeSurface

  const preparedHasPersonState = Boolean(preparedRuntimeSurface.memory?.personStateProjection)
  const spineHasPersonState = Boolean(spineRuntimeSurface.memory?.personStateProjection)
  if (preparedHasPersonState !== spineHasPersonState)
    return preparedHasPersonState ? preparedRuntimeSurface : spineRuntimeSurface

  const preparedHasMemoryClosure = preparedRuntimeSurface.memory?.memoryClosureTrace?.authority === 'memory-os'
  const spineHasMemoryClosure = spineRuntimeSurface.memory?.memoryClosureTrace?.authority === 'memory-os'
  if (preparedHasMemoryClosure !== spineHasMemoryClosure)
    return preparedHasMemoryClosure ? preparedRuntimeSurface : spineRuntimeSurface

  const preparedHasPersonMemoryCapsule = Boolean(preparedRuntimeSurface.memory?.personMemoryCapsule)
  const spineHasPersonMemoryCapsule = Boolean(spineRuntimeSurface.memory?.personMemoryCapsule)
  if (preparedHasPersonMemoryCapsule !== spineHasPersonMemoryCapsule)
    return preparedHasPersonMemoryCapsule ? preparedRuntimeSurface : spineRuntimeSurface

  return resolveRuntimeSurfaceContinuityPreferredRuntimeSurface({
    preparedRuntimeSurface,
    spineRuntimeSurface,
  })
}

function inheritPreparedRuntimeSurfaceSessionMirrorIfMissing(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  fallbackSurfaces: Array<AlicizationDigitalLifeRuntimeSurface | null | undefined>
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface
  if (!surface)
    return null

  if (surface.dialogue?.sessionMirror)
    return surface

  const inheritedSessionMirror = input.fallbackSurfaces
    .map(candidate => candidate?.dialogue?.sessionMirror ?? null)
    .find(Boolean)

  if (!inheritedSessionMirror)
    return surface

  return {
    ...surface,
    dialogue: {
      ...surface.dialogue,
      sessionMirror: inheritedSessionMirror,
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}

function inheritPreparedRuntimeSurfaceMemoryClosureTraceIfMissing(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  fallbackSurfaces: Array<AlicizationDigitalLifeRuntimeSurface | null | undefined>
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface
  if (!surface)
    return null

  if (surface.memory?.memoryClosureTrace?.authority === 'memory-os')
    return surface

  const inheritedMemoryClosureTrace = input.fallbackSurfaces
    .map(candidate => candidate?.memory?.memoryClosureTrace ?? null)
    .find(trace => trace?.authority === 'memory-os')

  if (!inheritedMemoryClosureTrace)
    return surface

  return {
    ...surface,
    memory: {
      ...surface.memory,
      memoryClosureTrace: inheritedMemoryClosureTrace,
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}

function inheritPreparedRuntimeSurfacePersonMemoryCapsuleIfMissing(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  fallbackSurfaces: Array<AlicizationDigitalLifeRuntimeSurface | null | undefined>
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface
  if (!surface)
    return null

  if (surface.memory?.personMemoryCapsule)
    return surface

  const inheritedCapsule = input.fallbackSurfaces
    .map(candidate => candidate?.memory?.personMemoryCapsule ?? null)
    .find(Boolean)

  if (!inheritedCapsule)
    return surface

  return {
    ...surface,
    memory: {
      ...surface.memory,
      personMemoryCapsule: inheritedCapsule,
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}

export function resolvePreparedRuntimeSurfaceSelection(input: {
  answerPlannerReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  baseDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  digitalLifeSpine: AlicizationMainChatRuntimeSurface['digitalLifeSpine']
}): {
  fresherRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  runtimeSurfaceForBuilder: AlicizationDigitalLifeRuntimeSurface | null
  selectionDiagnostics: {
    preAdjustmentSelectedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  }
} {
  const memoryDeliberationReducedRuntimeSurface = input.answerPlannerReducedRuntimeSurface?.memory?.memoryDeliberation
    && input.answerPlannerReducedRuntimeSurface?.dialogue?.currentConsciousFrame
    ? input.answerPlannerReducedRuntimeSurface
    : null
  const preAdjustmentSelectedRuntimeSurface = ensurePreparedRuntimeSurfaceShape(memoryDeliberationReducedRuntimeSurface
    ?? resolvePreferredRuntimeSurface({
      preparedRuntimeSurface: input.answerPlannerReducedRuntimeSurface ?? null,
      spineRuntimeSurface: input.digitalLifeSpine?.runtimeSurface ?? input.baseDigitalLifeRuntimeSurface ?? null,
    }))
  const runtimeSurfaceFallbacks = [
    input.baseDigitalLifeRuntimeSurface ?? null,
    input.answerPlannerReducedRuntimeSurface ?? null,
    input.digitalLifeSpine?.runtimeSurface ?? null,
  ]
  const fresherRuntimeSurface = ensurePreparedRuntimeSurfaceShape(
    inheritPreparedRuntimeSurfacePersonMemoryCapsuleIfMissing({
      surface: inheritPreparedRuntimeSurfaceMemoryClosureTraceIfMissing({
        surface: inheritPreparedRuntimeSurfaceSessionMirrorIfMissing({
          surface: preAdjustmentSelectedRuntimeSurface,
          fallbackSurfaces: [
            input.digitalLifeSpine?.runtimeSurface ?? null,
            input.baseDigitalLifeRuntimeSurface ?? null,
          ],
        }),
        fallbackSurfaces: runtimeSurfaceFallbacks,
      }),
      fallbackSurfaces: runtimeSurfaceFallbacks,
    }),
  )
  const runtimeSurfaceForBuilder = ensurePreparedRuntimeSurfaceShape(
    inheritPreparedRuntimeSurfacePersonMemoryCapsuleIfMissing({
      surface: inheritPreparedRuntimeSurfaceMemoryClosureTraceIfMissing({
        surface: inheritPreparedRuntimeSurfaceSessionMirrorIfMissing({
          surface:
            fresherRuntimeSurface
            ?? input.baseDigitalLifeRuntimeSurface
            ?? input.digitalLifeSpine?.runtimeSurface
            ?? null,
          fallbackSurfaces: [
            input.digitalLifeSpine?.runtimeSurface ?? null,
            input.baseDigitalLifeRuntimeSurface ?? null,
          ],
        }),
        fallbackSurfaces: runtimeSurfaceFallbacks,
      }),
      fallbackSurfaces: runtimeSurfaceFallbacks,
    }),
  )
  return {
    fresherRuntimeSurface,
    runtimeSurfaceForBuilder,
    selectionDiagnostics: {
      preAdjustmentSelectedRuntimeSurface: preAdjustmentSelectedRuntimeSurface ?? null,
    },
  }
}

export function buildEffectiveDigitalLifeSpine(input: {
  digitalLifeSpine: AlicizationMainChatRuntimeSurface['digitalLifeSpine']
  fresherRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationDigitalLifeSpineSnapshot | null {
  const normalizedFresherRuntimeSurface = ensurePreparedRuntimeSurfaceShape(input.fresherRuntimeSurface)
  const normalizedSpineRuntimeSurface = ensurePreparedRuntimeSurfaceShape(input.digitalLifeSpine?.runtimeSurface ?? null)
  if (!input.digitalLifeSpine)
    return normalizedFresherRuntimeSurface ? deriveAlicizationDigitalLifeSpineFromSurface(normalizedFresherRuntimeSurface) : null
  if (!normalizedFresherRuntimeSurface) {
    return normalizedSpineRuntimeSurface
      ? {
          ...input.digitalLifeSpine,
          runtimeSurface: normalizedSpineRuntimeSurface,
        }
      : input.digitalLifeSpine
  }

  return {
    ...input.digitalLifeSpine,
    runtimeSurface: normalizedFresherRuntimeSurface,
    memory: input.digitalLifeSpine.memory
      ? {
          ...input.digitalLifeSpine.memory,
          personStateProjection:
            normalizedFresherRuntimeSurface.memory?.personStateProjection
            ?? input.digitalLifeSpine.memory.personStateProjection
            ?? null,
          memoryClosureTrace:
            normalizedFresherRuntimeSurface.memory?.memoryClosureTrace
            ?? input.digitalLifeSpine.memory.memoryClosureTrace
            ?? null,
        }
      : input.digitalLifeSpine.memory ?? null,
  }
}

export function buildPreparedRuntimeSurfaceChain(input: {
  baseDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}): {
  effectiveDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  sociallyShapedDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  executionCallbackCarryRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  consciousFrameReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  answerPlannerReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
} {
  const effectiveDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = ensurePreparedRuntimeSurfaceShape(restorePreparedRuntimeRelationshipCarry(
    applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: input.baseDigitalLifeRuntimeSurface,
      governance: input.governance,
      context: input.context,
      now: input.now,
    }) as AlicizationDigitalLifeRuntimeSurface | null,
    input.context,
  ))
  const sociallyShapedDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = ensurePreparedRuntimeSurfaceShape(restorePreparedRuntimeRelationshipCarry(
    applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface: effectiveDigitalLifeRuntimeSurface,
      governance: input.governance,
      context: input.context,
      now: input.now,
    }) as AlicizationDigitalLifeRuntimeSurface | null,
    input.context,
  ))
  const executionCallbackCarryRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = ensurePreparedRuntimeSurfaceShape(restorePreparedRuntimeRelationshipCarry(
    applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: sociallyShapedDigitalLifeRuntimeSurface,
      governance: input.governance,
      context: input.context,
      now: input.now,
    }) as AlicizationDigitalLifeRuntimeSurface | null,
    input.context,
  ))
  const consciousFrameReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = ensurePreparedRuntimeSurfaceShape(reduceRuntimeConsciousFrame({
    surface: executionCallbackCarryRuntimeSurface,
    governance: input.governance,
    now: input.now,
  }) as AlicizationDigitalLifeRuntimeSurface | null)
  const answerPlannerReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = ensurePreparedRuntimeSurfaceShape(reduceRuntimeAnswerPlanner({
    surface: consciousFrameReducedRuntimeSurface,
    governance: input.governance,
    now: input.now,
  }) as AlicizationDigitalLifeRuntimeSurface | null)

  return {
    effectiveDigitalLifeRuntimeSurface,
    sociallyShapedDigitalLifeRuntimeSurface,
    executionCallbackCarryRuntimeSurface,
    consciousFrameReducedRuntimeSurface,
    answerPlannerReducedRuntimeSurface,
  }
}

export function rebuildProviderFacingMindTurnContract(input: {
  contract: AlicizationMindTurnContractSnapshot | null
  governance: AlicizationMindTurnGovernance | null
  runtimeSurface: AlicizationMainChatRuntimeSurface | null
  rawPayload?: AlicizationChatStartPayload | null
}): AlicizationMindTurnContractSnapshot {
  void input.runtimeSurface
  void input.rawPayload
  const baseContract = input.contract ?? createDefaultProviderFacingMindTurnContract({
    governance: input.governance,
  })

  return normalizeProviderReplyAuthorityContract(baseContract)
}

export function normalizeProviderFacingMindTurnContract(
  contract: AlicizationMindTurnContractSnapshot | null,
  rawPayload: AlicizationChatStartPayload | null | undefined,
  runtimeSurface: AlicizationMainChatRuntimeSurface | null,
) {
  void rawPayload
  void runtimeSurface
  return contract
    ? normalizeProviderReplyAuthorityContract(contract)
    : null
}

export function createAlicizationMainChatSessionRuntime(options: CreateAlicizationMainChatSessionRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const turnRuntime = createAlicizationTurnRuntime({
    now: getNow,
  })
  const dialogueSessionManager = options.dialogueSessionManager
    ?? createAlicizationDialogueSessionManager({
      getNow: options.getNow,
      staleAfterMs: options.dialogueSessionMirrorTtlMs,
    })
  const workingMemoryStore = options.workingMemoryStore ?? createWorkingMemoryStore()

  async function prepareExecution(input: {
    payload: AlicizationChatStartPayload
    prelude: AlicizationPreparedMainChatPrelude
  }): Promise<AlicizationPreparedMainChatExecutionResult> {
    const payload = input.payload
    const rawPayload = payload
    const { prelude } = input

    const now = getNow()
    const activeSelfEvolutionSnapshot = await options.getActiveSelfEvolutionSnapshot?.().catch(() => null) ?? null
    const turnContext = turnRuntime.beginTurn({
      cardId: payload.cardId,
      turnId: payload.turnId,
      governance: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance,
      activeSelfEvolutionSnapshot,
    })
    turnRuntime.settleStage(turnContext, 'encounter', {
      inputSummary: [
        `messages=${Array.isArray(payload.messages) ? payload.messages.length : 0}`,
        `waitForTools=${payload.waitForTools === true ? 'yes' : 'no'}`,
      ],
      outputSummary: [
        prelude.actionObligation.kind,
        prelude.actionObligation.routingIntent ? 'routing=required' : 'routing=not-required',
      ],
      reasonCodes: prelude.actionObligation.reasonCodes,
    })
    turnRuntime.settleStage(turnContext, 'conscious-frame', {
      status: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance ? 'completed' : 'skipped',
      outputSummary: [
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.turnMode ?? null,
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.personaKernelMode ?? null,
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.answerIntent ?? null,
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.focusAnchor ?? null,
      ],
      reasonCodes: [
        turnContext.selfRevisionConsumption.activePatchId
          ? 'turn-os:active-self-revision-snapshot-frozen'
          : 'turn-os:no-active-self-revision',
      ],
    })
    turnRuntime.settleStage(turnContext, 'obligation', {
      outputSummary: [
        prelude.actionObligation.kind,
        prelude.actionObligation.summary,
        prelude.actionObligation.source,
      ],
      reasonCodes: prelude.actionObligation.reasonCodes,
    })
    const effectiveExecutionRoutingIntent = prelude.actionObligation.routingIntent ?? prelude.executionRoutingIntent
    const routingRequired = Boolean(effectiveExecutionRoutingIntent)
    const incomingPreludeDigitalLifeSpine
      = (prelude.perceptionAugmentation as {
        digitalLifeSpine?: AlicizationMainChatRuntimeSurface['digitalLifeSpine'] | null
      }).digitalLifeSpine ?? null
    const digitalLifeSpine = incomingPreludeDigitalLifeSpine
      ?? (
        prelude.perceptionAugmentation.digitalLifeRuntimeSurface
          ? deriveAlicizationDigitalLifeSpineFromSurface(prelude.perceptionAugmentation.digitalLifeRuntimeSurface)
          : null
      )
    const digitalLifeArchitecture = digitalLifeSpine?.architecture ?? null
    const incomingPreludeDialogueSessionMirror
      = (digitalLifeSpine?.runtimeSurface?.dialogue.sessionMirror
        ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.sessionMirror) as AlicizationDialogueSessionMirror | null | undefined
        ?? null
    const agentTurn = await options.openAgentTurn({
      cardId: payload.cardId,
      turnId: payload.turnId,
      decisionTraceId: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.decisionTraceId ?? null,
    })
    turnContext.sessionId = agentTurn.conversationSessionId
    let messages = prelude.messages

    agentTurn.ingestDigitalLifeSpine(digitalLifeSpine)
    agentTurn.ingestDigitalLifeArchitecture(digitalLifeArchitecture)
    const previousSessionMirror = preferIncomingDialogueSessionMirror({
      incoming: incomingPreludeDialogueSessionMirror,
      generated: agentTurn.conversationSessionId
        ? dialogueSessionManager.getSessionMirror(payload.cardId, agentTurn.conversationSessionId)
        : null,
    })
    const memoryCarryPolicy = deriveAlicizationDialogueMemoryCarryPolicy({
      now,
      mirror: previousSessionMirror
        ? {
            memorySummary: previousSessionMirror.memorySummary,
            updatedAt: previousSessionMirror.updatedAt,
          }
        : null,
      mirrorStaleAfterMs: options.dialogueSessionMirrorTtlMs,
      spine: digitalLifeSpine,
    })
    const provisionalHasVisualGrounding = !effectiveExecutionRoutingIntent && options.latestUserMessageContainsVisualInput(messages)
    const [contextualString, executionCallbackContext, executionLedgerContext, sessionContinuitySignals] = await Promise.all([
      agentTurn.trackPhase('contextual-memory', async () => await prelude.contextualStringPromise, {
        turnId: payload.turnId,
      }),
      agentTurn.trackPhase('execution-callbacks', async () => {
        const context = await prelude.executionCallbackContextPromise
        agentTurn.ingestRuntimeActions(context.actions)
        return context
      }, {
        sessionId: agentTurn.conversationSessionId,
      }),
      agentTurn.trackPhase('execution-ledger', async () => await prelude.executionLedgerContextPromise, {
        routingRequired,
      }),
      agentTurn.trackPhase('session-continuity', async () => {
        const signals = await options.resolveSessionContinuitySignals?.({
          cardId: payload.cardId,
          turnId: payload.turnId,
        }) ?? []
        const digitalLifeSignal = digitalLifeSpine?.continuitySignal ?? null
        const mergedSignals = digitalLifeSignal
          ? [...signals, digitalLifeSignal]
          : signals
        agentTurn.ingestContinuitySignals(mergedSignals)
        return mergedSignals
      }, {
        cardId: payload.cardId,
      }),
    ])
    agentTurn.ingestContinuitySignals(executionCallbackContext.continuitySignals)
    agentTurn.ingestContinuitySignals(sessionContinuitySignals)

    const organicRecallSeed = [
      contextualString,
      executionCallbackContext.recallText,
      executionLedgerContext.recallText,
      prelude.perceptionAugmentation.memoryRecallSeed,
      memoryCarryPolicy.recallSeed,
    ].filter(Boolean).join('\n')
    const organicMemoryBudgetClass = deriveOrganicMemoryBudgetClass(
      prelude.perceptionAugmentation.recallGovernor,
    )
    const organicMemoryRetrievalPolicySnapshot = options.resolveTurnRetrievalPolicySnapshot
      ? await agentTurn.trackPhase('organic-memory-policy-snapshot', async () => await options.resolveTurnRetrievalPolicySnapshot?.({
          recallSeed: organicRecallSeed,
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          budgetClass: organicMemoryBudgetClass,
        }) ?? null, {
          budgetClass: organicMemoryBudgetClass,
        })
      : null
    if (options.prewarmOrganicMemoryAccessibility) {
      await agentTurn.trackPhase('organic-memory-prewarm', async () => {
        await options.prewarmOrganicMemoryAccessibility?.({
          recallSeed: organicRecallSeed,
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          turnId: payload.turnId,
          budgetClass: organicMemoryRetrievalPolicySnapshot?.plan.budgetClass ?? organicMemoryBudgetClass,
          retrievalPolicySnapshot: organicMemoryRetrievalPolicySnapshot,
        })
      }, {
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
      })
    }

    const memoryOsRuntime = await turnRuntime.runStage(turnContext, 'memory', {
      inputSummary: [
        `budget=${organicMemoryRetrievalPolicySnapshot?.plan.budgetClass ?? organicMemoryBudgetClass}`,
        `recallSeedChars=${organicRecallSeed.length}`,
      ],
      run: async () => await agentTurn.trackPhase('memory-os-runtime', async () => {
        return await runAlicizationMemoryOsTurnRuntime({
          recallSeed: organicRecallSeed,
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          turnId: payload.turnId,
          budgetClass: organicMemoryRetrievalPolicySnapshot?.plan.budgetClass ?? organicMemoryBudgetClass,
          retrievalPolicySnapshot: organicMemoryRetrievalPolicySnapshot,
          digitalLifeRuntimeSurface: digitalLifeSpine?.runtimeSurface
            ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface
            ?? null,
          resolveContext: async () => await options.resolveOrganicMemoryPromptContext({
            recallSeed: organicRecallSeed,
            recallGovernor: prelude.perceptionAugmentation.recallGovernor,
            sessionMirrorRecollection: previousSessionMirror?.recollection ?? null,
            turnId: payload.turnId,
            budgetClass: organicMemoryRetrievalPolicySnapshot?.plan.budgetClass ?? organicMemoryBudgetClass,
            retrievalPolicySnapshot: organicMemoryRetrievalPolicySnapshot,
            digitalLifeRuntimeSurface: digitalLifeSpine?.runtimeSurface
              ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface
              ?? null,
          }),
          tuneContext: input => options.tuneOrganicMemoryPromptContextForExecutiveTurn({
            context: input.context,
            recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          }),
          nowMs: getNow,
        })
      }, {
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
      }),
      summarizeOutput: runtime => ({
        outputSummary: [
          `adapter=${runtime.adapterSource}`,
          `gate=${runtime.artifact.visibleMemoryGate.status}`,
          `selected=${runtime.artifact.candidates.selectedCandidateIds.length}`,
        ],
        reasonCodes: [
          ...runtime.artifact.visibleMemoryGate.reasons,
          ...runtime.closure.missingStages.map(stage => `memory-os-missing:${stage}`),
        ],
      }),
    })
    const organicPromptContext = memoryOsRuntime.context
    const memoryTurnArtifact = memoryOsRuntime.artifact
    await runOrganicLearningGovernor({
      agentTurn,
      cardId: payload.cardId,
      turnId: payload.turnId,
      personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
      organicPromptContext,
      scheduleOrganicLearningAction: options.scheduleOrganicLearningAction,
      listMemoryReflections: options.listMemoryReflections,
      listRelationshipOutcomes: options.listRelationshipOutcomes,
    })
    const executionReplyObligation: AlicizationMainChatExecutionReplyObligation | null = deriveMainChatExecutionReplyObligation({
      messages: payload.messages as Message[],
      callbackContext: executionCallbackContext,
      ledgerContext: executionLedgerContext,
    })
    const freshExecutionReplyCallback = executionReplyObligation?.source === 'fresh-callback'
      ? [...executionCallbackContext.callbacks].sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
      : null
    const shouldIncludeExecutionCapabilityContext = Boolean(
      prelude.executionCapabilityInquiry.active
      || prelude.executionCapabilityInquiry.capabilityQuestion
      || effectiveExecutionRoutingIntent
      || executionReplyObligation,
    )
    const {
      effectiveMindTurnGovernanceWithRecollection,
      llmMindAuthorityGovernance,
    } = deriveRuntimeReplyAuthorityGovernance({
      now,
      governance: applyMainChatExecutionReplyObligationToGovernance(
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance,
        executionReplyObligation,
      ),
      context: organicPromptContext,
      memoryTurnArtifact,
      applyMemoryDeliberationToGovernance,
      applyHostPersonModelToGovernance,
    })

    // NOTICE: Execution-routing intents are execution-governed turns. Do not allow
    // renderer payload flags to silently downgrade them into tool-disabled responses.
    const allowTools = payload.supportsTools !== false || routingRequired
    const waitForTools = payload.waitForTools === true || routingRequired
    const toolChoice = allowTools && effectiveExecutionRoutingIntent
      ? buildMainGatewayExecutionRoutingToolChoice(effectiveExecutionRoutingIntent)
      : undefined

    let executionRuntimeAffectiveResidue: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['affectiveResidue'] = null
    let executionRuntimeDerivedMindStateBundle: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['derivedMindStateBundle'] = null
    let executionRuntimeMemoryClosureTrace: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['memoryClosureTrace'] = null
    const sessionBoundToolOptions: Pick<BuildMainGatewayToolsOptions, 'executeTaskThread'
      | 'resumeTaskThread'
      | 'buildExecutionRuntimeContext'
      | 'browserOpenUrl'
      | 'browserSearchWeb'
      | 'browserReadPage'
      | 'browserClickElement'
      | 'browserTypeText'
      | 'browserNavigate'
      | 'browserScroll'
      | 'browserWait'
      | 'desktopListInteractables'
      | 'desktopClickElement'
      | 'desktopTypeText'
      | 'desktopPressKeys'
      | 'desktopWait'
      | 'desktopInspectScene'
      | 'desktopOpenApplication'
      | 'getSensorySnapshot'
      | 'invokeMcpCallTool'
      | 'invokeMcpListTools'
      | 'resolveTaskPlanningCapabilities'
      | 'scheduleReminderTask'> = {
      buildExecutionRuntimeContext: async (toolContext) => {
        return await agentTurn.buildExecutionRuntimeContext({
          affectiveResidue: executionRuntimeAffectiveResidue ?? null,
          cardId: toolContext.cardId,
          turnId: toolContext.turnId,
          decisionTraceId: toolContext.decisionTraceId ?? null,
          derivedMindStateBundle: executionRuntimeDerivedMindStateBundle ?? null,
          memoryClosureTrace: executionRuntimeMemoryClosureTrace ?? null,
          sessionId: toolContext.sessionId ?? agentTurn.conversationSessionId,
        })
      },
      executeTaskThread: async (nextInput) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextInput.task.requestedChannel ?? nextInput.task.kind)
        return await agentTurn.trackTool({
          phaseId: `tool:executor:${phaseSuffix || 'dispatch'}`,
          kind: 'executor',
          label: `executor:${nextInput.task.requestedChannel ?? nextInput.task.kind}`,
          metadata: {
            requestedChannel: nextInput.task.requestedChannel,
            kind: nextInput.task.kind,
          },
          traceMetadata: {
            turnId: nextInput.context.turnId,
            requestedChannel: nextInput.task.requestedChannel,
            kind: nextInput.task.kind,
          },
          run: async () => await options.executeMainGatewayTaskThread(nextInput),
          summarizeSuccess: result => result.summary,
        })
      },
      resumeTaskThread: async (nextInput: { context: MainGatewayExecutionToolContext, threadId: string }) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextInput.threadId)
        if (!options.resumeMainGatewayTaskThread)
          throw new Error('resumeMainGatewayTaskThread is not configured.')
        return await agentTurn.trackTool({
          phaseId: `tool:executor-resume:${phaseSuffix || 'thread'}`,
          kind: 'executor',
          label: 'executor:resume-thread',
          metadata: {
            threadId: nextInput.threadId,
          },
          traceMetadata: {
            turnId: nextInput.context.turnId,
            threadId: nextInput.threadId,
          },
          run: async () => await options.resumeMainGatewayTaskThread!(nextInput),
          summarizeSuccess: result => result.summary,
        })
      },
      getSensorySnapshot: async () => {
        return await agentTurn.trackTool({
          phaseId: 'tool:sensory-capture-state',
          kind: 'sensory',
          label: 'sensory_capture_state',
          traceMetadata: {
            cardId: payload.cardId,
          },
          run: async () => await agentTurn.getSensorySnapshot({
            forceRefresh: true,
          }),
          summarizeSuccess: snapshot => [
            `foreground=${snapshot.sample.foregroundWindow?.appName ?? snapshot.sample.foregroundWindow?.processName ?? 'unknown'}`,
            `capture=${snapshot.capture?.health ?? 'unknown'}/${snapshot.capture?.permission ?? 'unknown'}`,
            `stale=${snapshot.stale === true ? 'true' : 'false'}`,
          ].join(' '),
        })
      },
      invokeMcpCallTool: async (nextPayload) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextPayload.name)
        return await agentTurn.trackTool({
          phaseId: `tool:mcp-call:${phaseSuffix || 'unknown'}`,
          kind: 'mcp',
          label: `mcp:${nextPayload.name}`,
          metadata: {
            cardId: nextPayload.cardId ?? payload.cardId,
            toolName: nextPayload.name,
          },
          traceMetadata: {
            cardId: nextPayload.cardId ?? payload.cardId,
            toolName: nextPayload.name,
          },
          run: async () => await options.invokeMcpCallTool(nextPayload),
          summarizeSuccess: () => `mcp tool ${nextPayload.name} completed`,
        })
      },
      invokeMcpListTools: async () => {
        return await agentTurn.trackTool({
          phaseId: 'tool:mcp-list-tools',
          kind: 'mcp',
          label: 'mcp_list_tools',
          traceMetadata: {
            cardId: payload.cardId,
          },
          run: async () => await options.invokeMcpListTools(),
          summarizeSuccess: () => 'listed available MCP tools',
        })
      },
      resolveTaskPlanningCapabilities: async () => {
        return await agentTurn.trackPhase('tool:executor-capability-snapshot', async () => await options.resolveTaskPlanningCapabilities(), {
          cardId: payload.cardId,
        })
      },
      scheduleReminderTask: async (cardId, nextPayload, source) => {
        return await agentTurn.trackTool({
          phaseId: 'tool:set-reminder',
          kind: 'runtime',
          label: 'set_reminder',
          metadata: {
            cardId,
            minutes: nextPayload.minutes,
          },
          traceMetadata: {
            cardId,
            minutes: nextPayload.minutes,
          },
          run: async () => await options.scheduleReminderTask(cardId, nextPayload, source),
          summarizeSuccess: () => `scheduled reminder in ${nextPayload.minutes} minutes`,
        })
      },
      browserOpenUrl: options.browserOpenUrl
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:browser-open-url',
            kind: 'runtime',
            label: 'browser_open_url',
            metadata: {
              browser: nextPayload.browser ?? 'default',
              site: nextPayload.site ?? null,
              url: nextPayload.url ?? 'about:blank',
            },
            traceMetadata: {
              browser: nextPayload.browser ?? 'default',
              site: nextPayload.site ?? null,
            },
            run: async () => await options.browserOpenUrl!(nextPayload),
            summarizeSuccess: () => nextPayload.url
              ? `opened url ${nextPayload.url}`
              : nextPayload.site
                ? `opened site ${nextPayload.site}`
                : `opened ${nextPayload.browser ?? 'default'} browser`,
          })
        }
        : undefined,
      browserSearchWeb: options.browserSearchWeb
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:browser-search-web',
            kind: 'runtime',
            label: 'browser_search_web',
            metadata: {
              browser: nextPayload.browser ?? 'default',
              query: nextPayload.query,
              searchEngine: nextPayload.searchEngine ?? 'google',
            },
            traceMetadata: {
              browser: nextPayload.browser ?? 'default',
            },
            run: async () => await options.browserSearchWeb!(nextPayload),
            summarizeSuccess: () => `searched web for ${nextPayload.query}`,
          })
        }
        : undefined,
      browserReadPage: options.browserReadPage
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:browser-read-page',
            kind: 'runtime',
            label: 'browser_read_page',
            metadata: {
              browser: nextPayload.browser ?? 'default',
              format: nextPayload.format ?? 'text',
            },
            traceMetadata: {
              browser: nextPayload.browser ?? 'default',
            },
            run: async () => await options.browserReadPage!(nextPayload),
            summarizeSuccess: () => `read browser page in ${nextPayload.format ?? 'text'} format`,
          })
        }
        : undefined,
      browserClickElement: options.browserClickElement
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:browser-click-element',
            kind: 'runtime',
            label: 'browser_click_element',
            metadata: {
              browser: nextPayload.browser ?? 'default',
              ordinal: nextPayload.ordinal ?? null,
              selector: nextPayload.selector,
              targetType: nextPayload.targetType ?? null,
              text: nextPayload.text ?? null,
            },
            traceMetadata: {
              browser: nextPayload.browser ?? 'default',
            },
            run: async () => await options.browserClickElement!(nextPayload),
            summarizeSuccess: () => nextPayload.selector
              ? `clicked browser selector ${nextPayload.selector}`
              : nextPayload.ordinal
                ? `clicked browser ${nextPayload.targetType ?? 'element'} #${nextPayload.ordinal}`
                : `clicked browser element ${nextPayload.text ?? 'target'}`,
          })
        }
        : undefined,
      browserTypeText: options.browserTypeText
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:browser-type-text',
            kind: 'runtime',
            label: 'browser_type_text',
            metadata: {
              browser: nextPayload.browser ?? 'default',
              ordinal: nextPayload.ordinal ?? null,
              selector: nextPayload.selector ?? null,
              targetText: nextPayload.targetText ?? null,
              submit: nextPayload.submit === true,
            },
            traceMetadata: {
              browser: nextPayload.browser ?? 'default',
            },
            run: async () => await options.browserTypeText!(nextPayload),
            summarizeSuccess: () => `typed text into browser${nextPayload.targetText ? ` via ${nextPayload.targetText}` : nextPayload.selector ? ` via ${nextPayload.selector}` : ''}`,
          })
        }
        : undefined,
      browserNavigate: options.browserNavigate
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:browser-navigate',
            kind: 'runtime',
            label: 'browser_navigate',
            metadata: {
              browser: nextPayload.browser ?? 'default',
              action: nextPayload.action,
            },
            traceMetadata: {
              browser: nextPayload.browser ?? 'default',
            },
            run: async () => await options.browserNavigate!(nextPayload),
            summarizeSuccess: () => nextPayload.action === 'reload'
              ? 'reloaded browser page'
              : `navigated browser ${nextPayload.action}`,
          })
        }
        : undefined,
      browserScroll: options.browserScroll
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:browser-scroll',
            kind: 'runtime',
            label: 'browser_scroll',
            metadata: {
              browser: nextPayload.browser ?? 'default',
              action: nextPayload.action,
              amount: nextPayload.amount ?? 1,
            },
            traceMetadata: {
              browser: nextPayload.browser ?? 'default',
            },
            run: async () => await options.browserScroll!(nextPayload),
            summarizeSuccess: () => `scrolled browser ${nextPayload.action}${nextPayload.amount && nextPayload.amount > 1 ? ` x${nextPayload.amount}` : ''}`,
          })
        }
        : undefined,
      browserWait: options.browserWait
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:browser-wait',
            kind: 'runtime',
            label: 'browser_wait',
            metadata: {
              browser: nextPayload.browser ?? 'default',
              state: nextPayload.state ?? 'complete',
              text: nextPayload.text ?? null,
              urlIncludes: nextPayload.urlIncludes ?? null,
              timeoutMs: nextPayload.timeoutMs ?? null,
            },
            traceMetadata: {
              browser: nextPayload.browser ?? 'default',
            },
            run: async () => await options.browserWait!(nextPayload),
            summarizeSuccess: () => `waited for browser ${nextPayload.state ?? 'complete'} readiness`,
          })
        }
        : undefined,
      desktopListInteractables: options.desktopListInteractables
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:desktop-list-interactables',
            kind: 'runtime',
            label: 'desktop_list_interactables',
            metadata: {
              role: nextPayload.role ?? null,
              maxItems: nextPayload.maxItems ?? null,
            },
            traceMetadata: {
              turnId: payload.turnId,
            },
            run: async () => await options.desktopListInteractables!(nextPayload),
            summarizeSuccess: () => `listed desktop interactables${nextPayload.role ? ` for ${nextPayload.role}` : ''}`,
          })
        }
        : undefined,
      desktopClickElement: options.desktopClickElement
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:desktop-click-element',
            kind: 'runtime',
            label: 'desktop_click_element',
            metadata: {
              role: nextPayload.role ?? null,
              ordinal: nextPayload.ordinal ?? null,
              text: nextPayload.text ?? null,
            },
            traceMetadata: {
              turnId: payload.turnId,
            },
            run: async () => await options.desktopClickElement!(nextPayload),
            summarizeSuccess: () => nextPayload.ordinal
              ? `clicked desktop ${nextPayload.role ?? 'element'} #${nextPayload.ordinal}`
              : `clicked desktop element ${nextPayload.text ?? 'target'}`,
          })
        }
        : undefined,
      desktopTypeText: options.desktopTypeText
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:desktop-type-text',
            kind: 'runtime',
            label: 'desktop_type_text',
            metadata: {
              role: nextPayload.role ?? null,
              ordinal: nextPayload.ordinal ?? null,
              targetText: nextPayload.targetText ?? null,
              submit: nextPayload.submit === true,
            },
            traceMetadata: {
              turnId: payload.turnId,
            },
            run: async () => await options.desktopTypeText!(nextPayload),
            summarizeSuccess: () => `typed text into desktop${nextPayload.targetText ? ` via ${nextPayload.targetText}` : ''}`,
          })
        }
        : undefined,
      desktopPressKeys: options.desktopPressKeys
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:desktop-press-keys',
            kind: 'runtime',
            label: 'desktop_press_keys',
            metadata: {
              shortcut: nextPayload.shortcut ?? '',
              repeat: nextPayload.repeat ?? 1,
            },
            traceMetadata: {
              turnId: payload.turnId,
            },
            run: async () => await options.desktopPressKeys!(nextPayload),
            summarizeSuccess: () => `pressed desktop shortcut ${nextPayload.shortcut ?? 'unknown'}`,
          })
        }
        : undefined,
      desktopWait: options.desktopWait
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:desktop-wait',
            kind: 'runtime',
            label: 'desktop_wait',
            metadata: {
              appName: nextPayload.appName ?? null,
              titleIncludes: nextPayload.titleIncludes ?? null,
              timeoutMs: nextPayload.timeoutMs ?? null,
            },
            traceMetadata: {
              turnId: payload.turnId,
            },
            run: async () => await options.desktopWait!(nextPayload),
            summarizeSuccess: () => `waited for desktop target ${nextPayload.appName ?? nextPayload.titleIncludes ?? 'frontmost window'}`,
          })
        }
        : undefined,
      desktopInspectScene: options.desktopInspectScene
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:desktop-inspect-scene',
            kind: 'runtime',
            label: 'desktop_inspect_scene',
            metadata: {
              question: nextPayload.question ?? '',
              forceRefresh: nextPayload.forceRefresh === true,
              maxSuggestedActions: nextPayload.maxSuggestedActions ?? null,
            },
            traceMetadata: {
              turnId: payload.turnId,
            },
            run: async () => await options.desktopInspectScene!(nextPayload),
            summarizeSuccess: (result) => {
              const payload = result && typeof result === 'object' && !Array.isArray(result)
                ? result as Record<string, unknown>
                : null
              const foregroundWindow = payload?.foregroundWindow && typeof payload.foregroundWindow === 'object' && !Array.isArray(payload.foregroundWindow)
                ? payload.foregroundWindow as Record<string, unknown>
                : null
              const appName = typeof foregroundWindow?.appName === 'string' ? foregroundWindow.appName : ''
              const processName = typeof foregroundWindow?.processName === 'string' ? foregroundWindow.processName : ''
              const title = typeof foregroundWindow?.title === 'string' ? foregroundWindow.title : ''
              return `inspected desktop scene around ${appName || processName || title || 'current foreground'}`
            },
          })
        }
        : undefined,
      desktopOpenApplication: options.desktopOpenApplication
        ? async (nextPayload) => {
          return await agentTurn.trackTool({
            phaseId: 'tool:desktop-open-application',
            kind: 'runtime',
            label: 'desktop_open_application',
            metadata: {
              appName: nextPayload.appName ?? '',
              path: nextPayload.path ?? '',
            },
            traceMetadata: {
              appName: nextPayload.appName ?? '',
            },
            run: async () => await options.desktopOpenApplication!(nextPayload),
            summarizeSuccess: () => `opened application ${nextPayload.appName ?? nextPayload.path ?? 'unknown'}`,
          })
        }
        : undefined,
    }

    const [performanceManifest, customDirectivesResolution, hostName, personaKernel, builtTools, executionCapabilities] = await Promise.all([
      agentTurn.trackPhase('performance-manifest', async () => await options.getPerformanceManifest(), {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('card-directives', async () => await options.resolveCardCustomDirectives(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('host-name', async () => await options.resolveCardHostName(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('persona-kernel', async () => await options.resolveCardPersonaKernel(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      allowTools
        ? agentTurn.trackPhase('tool-registry', async () => await buildMainGatewayTools({
            context: {
              cardId: payload.cardId,
              turnId: payload.turnId,
              decisionTraceId: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.decisionTraceId ?? null,
              sessionId: agentTurn.conversationSessionId,
            },
            buildExecutionRuntimeContext: sessionBoundToolOptions.buildExecutionRuntimeContext,
            executeTaskThread: sessionBoundToolOptions.executeTaskThread,
            resumeTaskThread: sessionBoundToolOptions.resumeTaskThread,
            browserOpenUrl: sessionBoundToolOptions.browserOpenUrl,
            browserSearchWeb: sessionBoundToolOptions.browserSearchWeb,
            browserReadPage: sessionBoundToolOptions.browserReadPage,
            browserClickElement: sessionBoundToolOptions.browserClickElement,
            browserTypeText: sessionBoundToolOptions.browserTypeText,
            browserNavigate: sessionBoundToolOptions.browserNavigate,
            browserScroll: sessionBoundToolOptions.browserScroll,
            browserWait: sessionBoundToolOptions.browserWait,
            desktopListInteractables: sessionBoundToolOptions.desktopListInteractables,
            desktopClickElement: sessionBoundToolOptions.desktopClickElement,
            desktopTypeText: sessionBoundToolOptions.desktopTypeText,
            desktopPressKeys: sessionBoundToolOptions.desktopPressKeys,
            desktopWait: sessionBoundToolOptions.desktopWait,
            desktopInspectScene: sessionBoundToolOptions.desktopInspectScene,
            desktopOpenApplication: sessionBoundToolOptions.desktopOpenApplication,
            executionCapabilityChannels: options.executionCapabilityChannels,
            getSensorySnapshot: sessionBoundToolOptions.getSensorySnapshot,
            resolveTaskPlanningCapabilities: sessionBoundToolOptions.resolveTaskPlanningCapabilities,
            scheduleReminderTask: sessionBoundToolOptions.scheduleReminderTask,
            invokeMcpListTools: sessionBoundToolOptions.invokeMcpListTools,
            invokeMcpCallTool: sessionBoundToolOptions.invokeMcpCallTool,
          }), {
            routingRequired,
          })
        : Promise.resolve(undefined),
      agentTurn.trackPhase('execution-capabilities', async () => await options.resolveExecutionCapabilitiesForPrompt(), {
        inquiryActive: prelude.executionCapabilityInquiry.active,
      }),
    ])
    const tools = filterMainGatewayToolsForRoutingIntent(builtTools, effectiveExecutionRoutingIntent)

    const runtimeCorePromptBlocks = options.buildMainRuntimeCorePromptBlocks({
      hostName,
      personaKernel,
    })
    const hasVisualGrounding = provisionalHasVisualGrounding
    const sessionPhases = normalizeSessionPhases([
      ...agentTurn.snapshot().phaseOrder,
      'runtime-surface',
    ])
    const preludePreparedRuntimeSurface = prelude.perceptionAugmentation.digitalLifeRuntimeSurface ?? null
    const spinePreparedRuntimeSurface = digitalLifeSpine?.runtimeSurface ?? null

    const preparedRuntimeAwarenessSeedSurface = resolvePreferredRuntimeSurface({
      preparedRuntimeSurface: preludePreparedRuntimeSurface,
      spineRuntimeSurface: spinePreparedRuntimeSurface,
    })
    ?? spinePreparedRuntimeSurface
    ?? preludePreparedRuntimeSurface
    const preparedRuntimeSurfaceBase = applyMemoryClosureTraceToDigitalLifeRuntimeSurface({
      surface: applyPersonMemoryCapsuleToDigitalLifeRuntimeSurface({
        surface: seedPreparedRuntimeProjectAwareness({
          surface: preparedRuntimeAwarenessSeedSurface,
          rawPayload,
          sessionMirror: previousSessionMirror,
        }),
        context: organicPromptContext,
        memoryTurnArtifact,
      }),
      memoryTurnArtifact,
    })
    const preparedRuntimeSurfaceChain = buildPreparedRuntimeSurfaceChain({
      baseDigitalLifeRuntimeSurface: preparedRuntimeSurfaceBase,
      governance: effectiveMindTurnGovernanceWithRecollection,
      context: organicPromptContext,
      now,
    })
    const {
      effectiveDigitalLifeRuntimeSurface,
      sociallyShapedDigitalLifeRuntimeSurface,
      executionCallbackCarryRuntimeSurface,
      consciousFrameReducedRuntimeSurface,
      answerPlannerReducedRuntimeSurface,
    } = preparedRuntimeSurfaceChain
    const preparedRuntimeSurfaceSelection = resolvePreparedRuntimeSurfaceSelection({
      answerPlannerReducedRuntimeSurface,
      baseDigitalLifeRuntimeSurface: preparedRuntimeSurfaceBase,
      digitalLifeSpine,
    })
    const runtimeSurfaceForBuilder = preparedRuntimeSurfaceSelection.runtimeSurfaceForBuilder
    executionRuntimeAffectiveResidue = runtimeSurfaceForBuilder?.memory?.affectiveResidue ?? null
    executionRuntimeDerivedMindStateBundle = runtimeSurfaceForBuilder?.memory?.derivedMindStateBundle ?? null
    executionRuntimeMemoryClosureTrace = runtimeSurfaceForBuilder?.memory?.memoryClosureTrace ?? null
    const effectiveDigitalLifeSpine = buildEffectiveDigitalLifeSpine({
      digitalLifeSpine,
      fresherRuntimeSurface: preparedRuntimeSurfaceSelection.fresherRuntimeSurface,
    })

    const runtimeSurface = await agentTurn.trackPhase('runtime-surface', async () => {
      return buildAlicizationMainChatRuntimeSurface({
        actionObligation: prelude.actionObligation,
        allowTools,
        waitForTools,
        baseMessages: messages,
        hasVisualGrounding,
        runtimeCorePromptBlocks,
        digitalLifeSpine: effectiveDigitalLifeSpine,
        digitalLifeArchitecture,
        perceptionPromptSystemBlocks: prelude.perceptionAugmentation.promptSystemBlocks,
        perceptionSystemBlocks: prelude.perceptionAugmentation.systemBlocks,
        digitalLifeRuntimeSurface: runtimeSurfaceForBuilder,
        executionCapabilitySystemBlocks: shouldIncludeExecutionCapabilityContext
          ? buildExecutionCapabilitySystemBlocks(
              executionCapabilities,
              options.executionCapabilityChannels,
              {
                inquiry: prelude.executionCapabilityInquiry,
              },
            )
          : [],
        executionRoutingEnforcementSystemBlock: effectiveExecutionRoutingIntent
          ? buildExecutionRoutingEnforcementSystemBlock(effectiveExecutionRoutingIntent)
          : undefined,
        executionCallbackSystemBlocks: executionCallbackContext.systemBlock
          ? [executionCallbackContext.systemBlock]
          : [],
        executionLedgerSystemBlocks: executionLedgerContext.systemBlock
          ? [executionLedgerContext.systemBlock]
          : [],
        executionReplyObligationSystemBlock: executionReplyObligation
          ? buildMainChatExecutionReplyObligationSystemBlock(executionReplyObligation)
          : undefined,
        customDirectivesResolution,
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
        personaKernelReason: prelude.perceptionAugmentation.chatGovernance.personaKernelMode === 'muted'
          ? 'truth-or-repair-obligation'
          : prelude.perceptionAugmentation.chatGovernance.personaKernelMode === 'backgrounded'
            ? 'task-or-direct-answer-obligation'
            : undefined,
        turnMode: prelude.perceptionAugmentation.chatGovernance.turnMode,
        governance: llmMindAuthorityGovernance,
        tools,
        toolChoice,
        sessionPhases,
        capture: {
          inspectionRequested: prelude.perceptionAugmentation.capture.inspectionRequested,
          groundedThisTurn: prelude.perceptionAugmentation.capture.groundedThisTurn,
          health: prelude.perceptionAugmentation.capture.snapshot?.health ?? null,
          permission: prelude.perceptionAugmentation.capture.snapshot?.permission ?? null,
          fallbackReason: prelude.perceptionAugmentation.capture.fallbackReason,
          degradedReasons: prelude.perceptionAugmentation.capture.snapshot?.degradedReasons ?? [],
        },
      })
    }, {
      hasVisualGrounding,
      routingRequired,
      sessionPhases: sessionPhases.join(' -> '),
    })
    turnRuntime.settleStage(turnContext, 'deliberation', {
      outputSummary: [
        runtimeSurface.replyAuthority?.expectedVisibleReplyAuthority ?? null,
        runtimeSurface.replyExecutionPlan?.preferredMode ?? null,
      ],
      reasonCodes: runtimeSurface.replyAuthority
        ? ['visible-reply-authority-settled']
        : ['visible-reply-authority-missing'],
    })
    const providerPlanningMessages = filterAlicizationProviderSystemMessages(runtimeSurface.messages)
    const workingMemorySessionId = agentTurn.conversationSessionId ?? payload.turnId
    const memoryFailures: AlicizationMainChatMemoryFailureSurface[] = []
    const persistedRecentTurns = options.listConversationTurnsBySession
      ? await options.listConversationTurnsBySession(workingMemorySessionId, {
          limit: 6,
        }).then(mapPersistedConversationTurnsToWorkingMemory).catch((error) => {
          memoryFailures.push({
            ...resolveAlicizationChatFailureSurface({
              kind: 'recall-failure',
            }),
            stage: 'working-memory-history',
            cardId: payload.cardId,
            turnId: payload.turnId,
            occurredAt: now,
            errorSummary: normalizeAlicizationMemoryFailureErrorSummary(error),
          })
          return []
        })
      : []
    let previousWorkingMemorySnapshot = workingMemoryStore.get(payload.cardId, workingMemorySessionId)
    if (!previousWorkingMemorySnapshot && options.getWorkingMemoryCheckpoint) {
      try {
        previousWorkingMemorySnapshot = await options.getWorkingMemoryCheckpoint(
          payload.cardId,
          workingMemorySessionId,
        )
        if (previousWorkingMemorySnapshot)
          workingMemoryStore.upsert(previousWorkingMemorySnapshot)
      }
      catch (error) {
        memoryFailures.push({
          ...resolveAlicizationChatFailureSurface({
            kind: 'recall-failure',
          }),
          stage: 'working-memory-checkpoint-load',
          cardId: payload.cardId,
          turnId: payload.turnId,
          occurredAt: now,
          errorSummary: normalizeAlicizationMemoryFailureErrorSummary(error),
        })
      }
    }
    const workingMemoryOwner = buildWorkingMemoryOwnerContextFromRuntime({
      cardId: payload.cardId,
      currentConsciousFrame: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame ?? null,
      conversationState: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.conversationState ?? null,
      dialogueWorldThread: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.dialogueWorldThread ?? null,
      executionCallbackRecallText: executionCallbackContext.recallText,
      executionLedgerRecallText: executionLedgerContext.recallText,
      messages: providerPlanningMessages,
      now,
      persistedRecentTurns,
      previousSnapshot: previousWorkingMemorySnapshot,
      sessionId: workingMemorySessionId,
    })
    workingMemoryStore.upsert(workingMemoryOwner.snapshot)
    if (options.persistWorkingMemoryCheckpoint) {
      try {
        await options.persistWorkingMemoryCheckpoint(workingMemoryOwner.snapshot)
      }
      catch (error) {
        memoryFailures.push({
          ...resolveAlicizationChatFailureSurface({
            kind: 'memory-persistence',
          }),
          stage: 'working-memory-checkpoint-save',
          cardId: payload.cardId,
          turnId: payload.turnId,
          occurredAt: now,
          errorSummary: normalizeAlicizationMemoryFailureErrorSummary(error),
        })
      }
    }
    let longTermMemoryBundle: LongTermMemoryEvidenceBundle | null = null
    const currentUserText = readLatestUserMessageText(providerPlanningMessages)
    if (options.retrieveLongTermMemoryEvidence) {
      try {
        longTermMemoryBundle = await options.retrieveLongTermMemoryEvidence({
          cardId: payload.cardId,
          currentUserText,
          workingMemoryQueryHints: workingMemoryOwner.ownerContext.queryHints,
          currentThreadTitle: workingMemoryOwner.ownerContext.current.threadTitle,
          activeTask: workingMemoryOwner.ownerContext.current.activeTask,
          limit: 5,
        })
      }
      catch (error) {
        longTermMemoryBundle = buildUnavailableLongTermMemoryEvidenceBundle(
          currentUserText,
          'recall-failed',
        )
        memoryFailures.push({
          ...resolveAlicizationChatFailureSurface({
            kind: 'recall-failure',
          }),
          stage: 'long-term-memory-recall',
          cardId: payload.cardId,
          turnId: payload.turnId,
          occurredAt: now,
          errorSummary: normalizeAlicizationMemoryFailureErrorSummary(error),
        })
      }
    }
    else {
      longTermMemoryBundle = buildUnavailableLongTermMemoryEvidenceBundle(
        currentUserText,
        'recall-owner-unavailable',
      )
      memoryFailures.push({
        ...resolveAlicizationChatFailureSurface({
          kind: 'recall-failure',
        }),
        stage: 'long-term-memory-recall',
        cardId: payload.cardId,
        turnId: payload.turnId,
        occurredAt: now,
        errorSummary: 'LongTermMemoryRecall owner is unavailable.',
      })
    }
    const memoryContext = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryOwner.ownerContext,
      workingMemorySnapshot: workingMemoryOwner.snapshot,
      longTermRecall: longTermMemoryBundle,
    })
    if (workingMemoryOwner.ownerContext.longTermQueue.length > 0 && options.enqueueWorkingMemoryLongTermQueue) {
      try {
        await options.enqueueWorkingMemoryLongTermQueue({
          cardId: payload.cardId,
          sessionId: workingMemorySessionId,
          items: workingMemoryOwner.ownerContext.longTermQueue,
        })
        await options.drainWorkingMemoryLongTermQueue?.(4)
      }
      catch (error) {
        memoryFailures.push({
          ...resolveAlicizationChatFailureSurface({
            kind: 'memory-persistence',
          }),
          stage: 'working-memory-long-term-queue',
          cardId: payload.cardId,
          turnId: payload.turnId,
          occurredAt: now,
          errorSummary: normalizeAlicizationMemoryFailureErrorSummary(error),
        })
      }
    }
    const workingMemoryOwnedRuntimeSurface = applyWorkingMemoryOwnerToDigitalLifeRuntimeSurface({
      surface: runtimeSurface.digitalLifeRuntimeSurface,
      snapshot: workingMemoryOwner.snapshot,
    })
    if (workingMemoryOwnedRuntimeSurface) {
      runtimeSurface.digitalLifeRuntimeSurface = workingMemoryOwnedRuntimeSurface
      prelude.perceptionAugmentation.digitalLifeRuntimeSurface = workingMemoryOwnedRuntimeSurface
    }
    const preparedRuntimeSurfaceChainDiagnostics: PreparedRuntimeSurfaceChainDiagnostics | null = options.onPreparedExecutionDiagnostics
      ? ({
          memoryDeliberationRuntimeSurface: cloneRuntimeSurfaceForDiagnostics(effectiveDigitalLifeRuntimeSurface),
          effectiveDigitalLifeRuntimeSurface: cloneRuntimeSurfaceForDiagnostics(effectiveDigitalLifeRuntimeSurface),
          sociallyShapedDigitalLifeRuntimeSurface: cloneRuntimeSurfaceForDiagnostics(sociallyShapedDigitalLifeRuntimeSurface),
          executionCallbackCarryRuntimeSurface: cloneRuntimeSurfaceForDiagnostics(executionCallbackCarryRuntimeSurface),
          consciousFrameReducedRuntimeSurface: cloneRuntimeSurfaceForDiagnostics(consciousFrameReducedRuntimeSurface),
          answerPlannerReducedRuntimeSurface: cloneRuntimeSurfaceForDiagnostics(answerPlannerReducedRuntimeSurface),
        } satisfies PreparedRuntimeSurfaceChainDiagnostics)
      : null
    const baseDigitalLifeRuntimeSurfaceDiagnostics = options.onPreparedExecutionDiagnostics
      ? cloneRuntimeSurfaceForDiagnostics(preparedRuntimeSurfaceBase)
      : null
    const preparedSelectionBase = options.onPreparedExecutionDiagnostics
      ? cloneRuntimeSurfaceForDiagnostics(preparedRuntimeSurfaceSelection.fresherRuntimeSurface)
      : null
    const selectionDiagnosticsBase = options.onPreparedExecutionDiagnostics
      ? cloneRuntimeSurfaceForDiagnostics(preparedRuntimeSurfaceSelection.selectionDiagnostics?.preAdjustmentSelectedRuntimeSurface)
      : null
    const builderSurface = options.onPreparedExecutionDiagnostics
      ? cloneRuntimeSurfaceForDiagnostics(runtimeSurfaceForBuilder)
      : null

    messages = runtimeSurface.messages
    const rebuiltMindTurnContract = rebuildProviderFacingMindTurnContract({
      contract: prelude.perceptionAugmentation.chatGovernance.mindTurnContract,
      governance: llmMindAuthorityGovernance,
      runtimeSurface,
      rawPayload,
    })
    const normalizedMindTurnContract = normalizeProviderFacingMindTurnContract(
      rebuiltMindTurnContract,
      rawPayload,
      runtimeSurface,
    )
    const finalizedReturnedMindTurnContract = normalizedMindTurnContract
    messages = runtimeSurface.messages
    messages = filterAlicizationProviderSystemMessages(messages)
    messages = injectAlicizationMainChatMemoryContext(messages, memoryContext)
    messages = filterAlicizationProviderSystemMessages(messages)
    const promptBudgetResult = applyPromptBudget(
      messages,
      Number.isFinite(options.promptBudgetTokens)
        ? { totalTokens: options.promptBudgetTokens }
        : undefined,
    )
    messages = promptBudgetResult.messages
    runtimeSurface.messages = messages

    if (options.onPreparedExecutionDiagnostics) {
      options.onPreparedExecutionDiagnostics({
        preparedRuntimeSurfaceChain: preparedRuntimeSurfaceChainDiagnostics ?? {
          memoryDeliberationRuntimeSurface: null,
          effectiveDigitalLifeRuntimeSurface: null,
          sociallyShapedDigitalLifeRuntimeSurface: null,
          executionCallbackCarryRuntimeSurface: null,
          consciousFrameReducedRuntimeSurface: null,
          answerPlannerReducedRuntimeSurface: null,
        },
        preparedRuntimeSurfaceSelection: {
          fresherRuntimeSurface: preparedSelectionBase,
          runtimeSurfaceForBuilder: builderSurface,
          selectionDiagnostics: {
            preAdjustmentSelectedRuntimeSurface: selectionDiagnosticsBase,
          },
        },
        rebuiltMindTurnContract,
        normalizedMindTurnContract,
        mirrorFlowDiagnostics: null,
        answerPlannerReducedRuntimeSurface: preparedRuntimeSurfaceChainDiagnostics?.answerPlannerReducedRuntimeSurface ?? null,
        baseDigitalLifeRuntimeSurface: baseDigitalLifeRuntimeSurfaceDiagnostics,
        runtimeSurfaceForBuilder: builderSurface,
        returnedMindTurnContract: normalizedMindTurnContract,
        finalizedReturnedMindTurnContract,
        runtimeSurface: clonePreparedExecutionRuntimeSurfaceForDiagnostics(runtimeSurface),
        returnedRuntimeSurface: clonePreparedExecutionRuntimeSurfaceForDiagnostics(runtimeSurface),
      })
    }

    const rawGeneratedSessionMirror = agentTurn.conversationSessionId
      ? dialogueSessionManager.ingestPreparedExecution({
          agentSession: agentTurn.getSessionSnapshot(),
          cardId: payload.cardId,
          organicMemoryContext: organicPromptContext,
          runtimeSurface,
          sessionId: agentTurn.conversationSessionId,
        })
      : previousSessionMirror
    const rawSessionMirror = preferIncomingDialogueSessionMirror({
      incoming: previousSessionMirror,
      generated: rawGeneratedSessionMirror,
    })
    const sessionMirror = preferIncomingDialogueSessionMirror({
      incoming: incomingPreludeDialogueSessionMirror,
      generated: rawSessionMirror,
    })
    if (agentTurn.conversationSessionId && sessionMirror) {
      await options.persistAutobiographicalEpisodesFromPreparedMirror?.({
        cardId: payload.cardId,
        decisionTraceId: runtimeSurface.trace.decisionTraceId ?? null,
        turnId: payload.turnId,
        sessionId: agentTurn.conversationSessionId,
        previousMirror: previousSessionMirror,
        mirror: sessionMirror,
      })
    }

    const preparedResultBase = {
      chatConfig: prelude.chatConfig,
      conversationSessionId: agentTurn.conversationSessionId,
      executionReplyObligation,
      freshExecutionReplyCallback,
      getSessionTrace: () => agentTurn.snapshot(),
      messages,
      waitForTools,
      tools,
      toolChoice,
      executionToolInputOverrides: effectiveExecutionRoutingIntent?.toolInputOverrides,
      customDirectivesResolution,
      hasVisualGrounding: runtimeSurface.hasVisualGrounding,
      governance: runtimeSurface.governance,
      memoryContext,
      memoryFailures,
      promptBudgetReport: promptBudgetResult.report,
      mindTurnContract: finalizedReturnedMindTurnContract,
      organicMemoryContext: organicPromptContext,
      memoryTurnArtifact,
      memoryOsRuntime,
      turnRuntimeContext: turnContext,
      personaKernel,
      performanceManifest,
      replyRealization: runtimeSurface.replyAuthority ?? null,
      replyExecutionPlan: runtimeSurface.replyExecutionPlan ?? null,
      runtimeSurface,
      sessionMirror,
      sessionTrace: agentTurn.snapshot(),
    }
    turnRuntime.settleStage(turnContext, 'learning', {
      outputSummary: [
        organicPromptContext.selfEvolution?.nextLearningAction
          ? `next=${organicPromptContext.selfEvolution.nextLearningAction}`
          : 'next=none',
        turnContext.selfRevisionConsumption.activePatchId
          ? `activePatch=${turnContext.selfRevisionConsumption.activePatchId}`
          : 'activePatch=none',
      ],
      reasonCodes: turnContext.selfRevisionConsumption.reasonCodes,
    })
    turnRuntime.settleStage(turnContext, 'telemetry', {
      outputSummary: [
        `phases=${agentTurn.snapshot().phaseOrder.length}`,
        agentTurn.snapshot().phaseOrder.join(' -> '),
      ],
    })
    const turnGraph = turnRuntime.finalizeTurn({
      context: turnContext,
      prepared: preparedResultBase as AlicizationPreparedMainChatExecutionResult,
      actionObligation: prelude.actionObligation,
      memory: memoryTurnArtifact,
      surface: null,
      routingRequired,
    })

    return {
      ...preparedResultBase,
      turnGraph,
    }
  }

  return {
    clear: () => dialogueSessionManager.clear(),
    prepareExecution,
  }
}
