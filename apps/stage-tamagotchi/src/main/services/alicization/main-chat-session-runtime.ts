import type {
  AlicizationChannelCapability,
  AlicizationChatFailureKind,
  AlicizationChatFailureSurface,
  AlicizationExecutionCapabilityChannel,
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionRoutingIntent,
  AlicizationPersonaKernelSnapshot,
} from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationAnswerPlannerSnapshot,
  AlicizationChatStartPayload,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationMindTurnContractSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationRecallGovernorSnapshot,
  AlicizationRuntimeDigest,
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
  PreparedMainChatExecution,
  ResolvedCardCustomDirectives,
} from './runtime-soul'
import type { AlicizationSelfEvolutionVersionRuntimeSnapshot } from './self-evolution/version-runtime'
import type { AlicizationTurnRuntimeContext } from './turn-os/runtime'
import type { AlicizationTurnGraph } from './turn-os/turn-graph'
import type { AlicizationMainChatReplyAuthoritySurface, AlicizationMainChatReplyExecutionPlanSurface } from './visible-reply/facade'

import { errorMessageFrom } from '@moeru/std'
import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  formatAlicizationProjectStateAwarenessFields,
  resolveAlicizationChatFailureSurface,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import {
  buildAlicizationDialogueMemoryCarrySystemBlock,
  deriveAlicizationDialogueMemoryCarryPolicy,
} from './dialogue-memory-governor'
import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import {
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
import { buildWorkingMemorySnapshot } from './life-core/working-memory-builder'
import {
  buildWorkingMemoryOwnerContext,
  projectWorkingMemoryOwnerEpisodes,
} from './life-core/working-memory-owner-context'
import { createWorkingMemoryStore } from './life-core/working-memory-store'
import { buildMainChatActionObligationSystemBlock } from './main-chat-action-obligation'
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
import { carriesAlicizationCanonicalProjectState } from './main-chat-project-state-guard'
import { shouldIncludeProjectStateProviderContext } from './main-chat-project-state-injection-policy'
import {
  buildAlicizationMainChatRuntimeSurface,
  shouldUseDialogueFirstLivingPromptMode,
} from './main-chat-runtime-surface'
import { resolveAlicizationChatStartPayloadPreDialogueSendIdentity } from './main-chat-start-awareness'
import {
  emptyAlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import { runAlicizationMemoryOsTurnRuntime } from './memory-os/runtime'
import { buildAlicizationMindTurnContractSystemBlock } from './mind-turn-contract'
import { buildAlicizationPersonMemoryCapsule } from './person-memory-capsule'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import {
  deriveRuntimeProjectionRelationshipCarry,
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
} from './prepared-runtime-continuity'
import { enrichProjectStateAnswerGovernanceIfNeeded } from './project-state-answer-governance'
import {
  buildAlicizationProviderFacingProjectStateExtraSystemBlocks,
  compactProjectLatestProgressForSystemBlock,
  isAlicizationThinProjectAwarenessLine,
  preferStrongerSameHerDriftRisk,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  scoreAlicizationProjectAwarenessLine,
} from './project-state-brief'
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
  resolveRuntimeSurfaceContinuityEvidenceScore,
  resolvePreferredRuntimeSurface as resolveRuntimeSurfaceContinuityPreferredRuntimeSurface,
} from './runtime-surface-continuity-selection'
import { readTransportContentAsText } from './runtime-transport-content'
import {
  buildSessionContinuityRecallSeed,
  buildSessionMirrorRecollectionAfterthoughtSeed,
  buildSessionMirrorRuntimeContinuitySeed,
  deriveOrganicMemoryBudgetClass,
  filterMainGatewayToolsForRoutingIntent,
  mergeUniqueRules,
  sanitizeToolPhaseSegment,
} from './runtime-turn-composition'
import { createAlicizationTurnRuntime } from './turn-os/runtime'
import {

  buildRecollectionSpeechVisibleSurfaceRules,
} from './visible-reply/facade'

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
    suppressAssociativeRecall: boolean
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

export interface AlicizationMainChatMemoryFailureSurface extends AlicizationChatFailureSurface {
  stage: 'long-term-memory-recall' | 'working-memory-history' | 'working-memory-long-term-queue'
  cardId: string
  turnId: string
  occurredAt: number
  errorSummary: string
}

export interface AlicizationPreparedMainChatExecutionResult extends PreparedMainChatExecution {
  conversationSessionId: string | null
  executionReplyObligation?: AlicizationMainChatExecutionReplyObligation | null
  freshExecutionReplyCallback?: AlicizationExecutionCallbackDigest | null
  getSessionTrace: () => AlicizationRuntimeCallChainSnapshot
  memoryContext: AlicizationMainChatMemoryContext
  memoryFailures: AlicizationMainChatMemoryFailureSurface[]
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

type ProviderFacingProjectState = NonNullable<AlicizationMindTurnContractSnapshot['projectState']>
interface SessionMirrorProjectStateFallback {
  identity: string
  currentPhase: string | null
  preflightSummary: string | null
  preDialogueAwarenessLine: string | null
  preDialogueAwarenessSummary: string | null
  awarenessLine: string | null
  latestLandedProgress: string | null
  primaryOpenLoop: string | null
  openFocusSummary: string | null
  nextClosureTarget: string | null
  nextFocusSummary: string | null
  sameHerSelfLine: string | null
  sameHerDriftRisk: string | null
  sameHerHoldDetail: string | null
  emotionalClosureSummary: string | null
  continuityRestraint: ProviderFacingProjectState['continuityRestraint']
  continuityArcStage: string | null
  continuityCue: string | null
  continuityPreferredTiming: ProviderFacingProjectState['continuityPreferredTiming']
  continuityCadence: string | null
  preferredBlinkCadence: ProviderFacingProjectState['preferredBlinkCadence']
  preferredGazeMode: ProviderFacingProjectState['preferredGazeMode']
  preferredPauseMode: ProviderFacingProjectState['preferredPauseMode']
  preferredLipsyncMode: ProviderFacingProjectState['preferredLipsyncMode']
  preferredVoiceMode: ProviderFacingProjectState['preferredVoiceMode']
  preferredPacingMode: ProviderFacingProjectState['preferredPacingMode']
}
type RuntimeSurfaceProjectState = NonNullable<NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame']>['projectState']>
type RuntimeDigestProjectState = NonNullable<AlicizationRuntimeDigest['projectState']>

function mergeRuntimeDigestProjectState(
  projectState: RuntimeDigestProjectState | null | undefined,
  carry: Partial<RuntimeDigestProjectState>,
): RuntimeDigestProjectState {
  return {
    ...projectState,
    ...carry,
  }
}

function buildFallbackProviderFacingAnswerPlanner(input: {
  contract: AlicizationMindTurnContractSnapshot | null
  governingProject: string | null
  now: number
}): AlicizationAnswerPlannerSnapshot {
  return {
    act: input.contract?.answerAct ?? 'answer',
    evidenceMode: input.contract?.evidenceMode ?? 'dialogue-grounded',
    confidence: 0.5,
    governingFocus: input.contract?.governingFocus ?? '',
    governingProject: input.governingProject,
    openingMove: input.contract?.projectState?.preDialogueAwarenessLine ?? '',
    answerIntent: input.contract?.answerIntent ?? '',
    relationshipPosture: input.contract?.relationshipPosture ?? 'restrained',
    activeClosenessContext: input.contract?.activeClosenessContext ?? null,
    activeClosenessRung: input.contract?.activeClosenessRung ?? null,
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    mustDo: [...(input.contract?.mustDo ?? [])],
    mustNotDo: [...(input.contract?.mustNotDo ?? [])],
    narrative: [],
    updatedAt: input.now,
  }
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
    includeProjectStateContext?: boolean
    personaKernel?: AlicizationPersonaKernelSnapshot | null
  }) => string[]
  buildOrganicMemorySystemBlocks: (
    context: OrganicMemoryPromptContext,
    memoryTurnArtifact?: ReturnType<typeof buildAlicizationMemoryTurnArtifact> | null,
  ) => string[]
  buildPerformanceManifestSystemBlocks: (manifest: CharacterPerformanceCapabilitiesManifest | null) => string[]
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
    suppressAssociativeRecall: boolean
    personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
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
    runtimeGroundedInputProjectStateAwarenessFields: {
      preDialogueAwarenessLine: string | null
      preDialogueAwarenessSummary: string | null
      awarenessLine: string | null
      companionHeadlineLine: string | null
    }
    runtimeGroundedContractProjectState: {
      preDialogueAwarenessLine: string | null
      preDialogueAwarenessSummary: string | null
      awarenessLine: string | null
      companionHeadlineLine: string | null
    } | null
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
    effectiveStageProjectStateSources?: {
      dialogueExistingNextClosureTarget: string | null
      rawRuntimeDigestNextClosureTarget: string | null
      preferredExistingNextClosureTarget: string | null
      resolvedNextClosureTarget: string | null
      effectiveDialogueNextClosureTarget: string | null
    } | null
    baseRuntimeSurfaceProjectState?: {
      dialogueLatestLandedProgress: string | null
      dialoguePrimaryOpenLoop: string | null
      dialogueNextClosureTarget: string | null
      rawLatestLandedProgress: string | null
      rawPrimaryOpenLoop: string | null
      rawNextClosureTarget: string | null
    } | null
    selectedFresherNextClosureTargets?: {
      dialogue: string | null
      raw: string | null
      cognition: string | null
    }
    postBuilderNextClosureTargets?: {
      rawRuntimeSurfaceDialogue: string | null
      finalRuntimeSurfaceDialogue: string | null
    }
    providerFacingAwarenessResolutionDiagnostics?: {
      explicitPayloadProjectAwarenessLine: string | null
      explicitPayloadProjectPreflightSummary: string | null
      explicitPayloadProjectSameHerDriftRisk: string | null
      rebuiltPreDialogueAwarenessLine: string | null
      normalizedPreDialogueAwarenessLine: string | null
      rebuiltPreflightSummary: string | null
      normalizedPreflightSummary: string | null
      rebuiltSameHerDriftRisk: string | null
      normalizedSameHerDriftRisk: string | null
    } | null
    providerFacingNormalization?: {
      normalizedProjectStatePreDialogueAwarenessExplicit: string | null
      normalizedProjectStatePreDialogueAwarenessFallback: string | null
      normalizedProjectState: Record<string, unknown> | null
      finalProjectState: Record<string, unknown> | null
      normalizedReturnProjectState: Record<string, unknown> | null
      fullyConvergedReturnProjectState: Record<string, unknown> | null
    } | null
    runtimeGroundedInputProjectState?: Record<string, unknown> | null
    finalReturnedRuntimeSurfaceProjectState?: Record<string, unknown> | null
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

const projectAwarenessFieldMaxChars = 4000

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

const ordinaryDialogueProjectStateBlockMarkers = [
  '[ALICIZATION_PROJECT_STATE]',
  '[ALICIZATION_PROJECT_GOVERNANCE_DASHBOARD]',
  '[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]',
  '[ALICIZATION_PROJECT_STATE_CONTINUITY]',
] as const

const ordinaryDialogueMemoryOwnerBlockMarkers = [
  '[ALICIZATION_WORKING_MEMORY_OWNER]',
  '[ALICIZATION_WORKING_MEMORY]',
  '[ALICIZATION_RECALLED_MEMORY]',
] as readonly string[]

const ordinaryDialogueProjectStateLinePattern
  = /^(?:Provider-facing same-her project orientation|Project identity|Project phase|Project preflight self-awareness|Project pre-dialogue awareness line|Project companion headline|Project proactive same-her gap|Project memory closure summary|Project emotional closure seam|Project emotional closure summary|Project same-her hold detail|Latest landed continuity progress|Landed progress|Still-open life loop pressure|Still-open closure work|Open closure focus|Next closure target|Next closure focus|Emotional closure seam|Project same-her self line|Project same-her hold detail|Project same-her drift risk|Project continuity current phase|Project continuity latest progress|Project continuity primary open loop|Project continuity proactive gap|Project continuity next closure target|Project continuity pre-dialogue awareness line|Project continuity emotional closure cue|Project continuity self line|Project continuity drift risk|Project continuity self line required|Project continuity restraint|Project continuity arc stage|Project continuity cue|Project continuity timing|Project continuity preferred timing|Project continuity cadence|Project preferred blink cadence|Project preferred gaze mode|Project preferred pause mode|Project preferred lipsync mode|Project preferred voice mode|Project preferred pacing mode|Pre-dialogue closure summary|Pre-dialogue next closure line|Pre-dialogue closure cue|Governing project|Canonical Phase 1 continuity progress still anchoring her|How the living project is still shaping her before she speaks|Pre-dialogue closure briefing):/u

const ordinaryDialogueProjectStateTextPattern
  = /Current Phase 1 project context|Some closure already landed|Unfinished closure still needs|Same Phase 1 digital life|Phase 1:\s*Local Digital Life|latest landed Phase 1 progress|still-open closure work explicit|next closure target explicit|when the host asks for project status|phase1_local_digital_life_anchor|memory_dialogue_embodiment|verified_closure_progress|project_context=phase1_local_digital_life|local-first digital life project|same-her|same digital life project|project-state|Project identity carry|Phase 1 route carry|Unresolved closure carry/iu

function isBlockedProviderFacingTemplateLine(line: string) {
  return line.includes('content_withheld')
    || line.includes('visibility=internal-structured')
    || line.includes('phase1_local_digital_life')
    || line.includes('runtime_personhood')
    || containsAlicizationFixedTemplateResidue(line)
}

function sanitizeOrdinaryDialogueMemoryOwnerSystemBlock(block: string) {
  const lines = block
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed)
        return ''
      if (ordinaryDialogueMemoryOwnerBlockMarkers.includes(trimmed))
        return trimmed
      if (isBlockedProviderFacingTemplateLine(trimmed))
        return ''
      const sanitized = sanitizeAlicizationProviderFacingText(trimmed, 2400, alicizationFixedTemplateReplacement)
      return sanitized && sanitized !== alicizationFixedTemplateReplacement
        && !isBlockedProviderFacingTemplateLine(sanitized)
        ? sanitized
        : ''
    })
    .filter((line, index, entries) => line || (index > 0 && index < entries.length - 1))

  return lines.join('\n').trim()
}

function sanitizeOrdinaryDialogueProviderSystemBlock(block: string) {
  if (ordinaryDialogueMemoryOwnerBlockMarkers.some(marker => block.includes(marker)))
    return sanitizeOrdinaryDialogueMemoryOwnerSystemBlock(block)

  if (ordinaryDialogueProjectStateBlockMarkers.some(marker => block.includes(marker)))
    return ''

  const lines = block
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed)
        return true
      if (isBlockedProviderFacingTemplateLine(trimmed))
        return false
      if (ordinaryDialogueProjectStateLinePattern.test(trimmed))
        return false
      if (trimmed.startsWith('- ') && ordinaryDialogueProjectStateTextPattern.test(trimmed))
        return false
      return !ordinaryDialogueProjectStateTextPattern.test(trimmed)
    })

  return lines.join('\n').trim()
}

function sanitizeOrdinaryDialogueProviderMessages(messages: Message[]) {
  const sanitizedMessages: Message[] = []
  for (const message of messages) {
    if (message.role !== 'system' || typeof message.content !== 'string') {
      sanitizedMessages.push(message)
      continue
    }

    const sanitized = sanitizeOrdinaryDialogueProviderSystemBlock(message.content)
    if (!sanitized)
      continue

    sanitizedMessages.push({
      ...message,
      content: sanitized,
    })
  }
  return sanitizedMessages
}

function isAlicizationTurnMemoryContextSystemMessage(message: Message) {
  if (message.role !== 'system' || typeof message.content !== 'string')
    return false

  try {
    const parsed = JSON.parse(message.content) as { type?: unknown }
    return parsed?.type === 'alicization-turn-memory-context'
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
    message => !isAlicizationTurnMemoryContextSystemMessage(message),
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

function isOrdinaryDialogueProjectStatePlanningText(raw: unknown) {
  const normalized = normalizePreparedExecutionText(raw, 1600)
  if (!normalized)
    return false

  return ordinaryDialogueProjectStateLinePattern.test(normalized)
    || ordinaryDialogueProjectStateTextPattern.test(normalized)
    || /same project-aware self line|same digital-life closure seam|same-her continuity|project-state question|project narrator shell|fresh assistant restart|detached project narrator/iu.test(normalized)
}

function sanitizeOrdinaryDialogueAnswerPlanner(
  answerPlanner: AlicizationAnswerPlannerSnapshot | null | undefined,
): AlicizationAnswerPlannerSnapshot | null | undefined {
  if (!answerPlanner)
    return answerPlanner

  const filterPlanningRules = (rules: readonly string[] | null | undefined) => {
    if (!Array.isArray(rules))
      return rules

    return rules.filter(rule => !isOrdinaryDialogueProjectStatePlanningText(rule))
  }

  return {
    ...answerPlanner,
    governingProject: null,
    mustDo: filterPlanningRules(answerPlanner.mustDo) as typeof answerPlanner.mustDo,
    mustNotDo: filterPlanningRules(answerPlanner.mustNotDo) as typeof answerPlanner.mustNotDo,
  } satisfies AlicizationAnswerPlannerSnapshot
}

function sanitizeOrdinaryDialogueRuntimeSurfacePlanning(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  if (!surface?.dialogue?.answerPlanner)
    return

  surface.dialogue.answerPlanner = sanitizeOrdinaryDialogueAnswerPlanner(surface.dialogue.answerPlanner) as typeof surface.dialogue.answerPlanner
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
      contaminated: containsAlicizationFixedTemplateResidue(assistantText ?? ''),
    }
  })
}

function buildWorkingMemoryPromptBlockFromRuntime(input: {
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
  const recentTurns = input.persistedRecentTurns?.length
    ? [...input.persistedRecentTurns]
    : buildWorkingMemoryRecentTurns(input.messages, input.now, null)
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

function readPreparedExecutionNextClosureTargets(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  const resolved = normalizePreparedExecutionText(
    surface ? readRuntimeProjectStateFromSurface(surface).nextClosureTarget : null,
    1600,
  )
  const dialogue = normalizePreparedExecutionText(surface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget, 1600)
  const raw
    = normalizePreparedExecutionText(surface?.raw?.runtimeDigest?.projectState?.nextClosureTarget, 1600)
      ?? normalizePreparedExecutionText(surface?.raw?.runtime?.projectState?.nextClosureTarget, 1600)
  const cognition = normalizePreparedExecutionText(surface?.cognition?.runtimeDigest?.projectState?.nextClosureTarget, 1600)

  return {
    dialogue: dialogue ?? resolved,
    raw: resolved ?? raw ?? dialogue,
    cognition: resolved ?? cognition ?? raw ?? dialogue,
  }
}

function readPreparedExecutionProjectStateDiagnostics(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  return {
    dialogueLatestLandedProgress:
      normalizePreparedExecutionText(
        surface?.dialogue?.currentConsciousFrame?.projectState?.latestLandedProgress
        ?? surface?.dialogue?.currentConsciousFrame?.projectState?.latestProgress,
        1600,
      ),
    dialoguePrimaryOpenLoop: normalizePreparedExecutionText(
      surface?.dialogue?.currentConsciousFrame?.projectState?.primaryOpenLoop,
      1600,
    ),
    dialogueNextClosureTarget: normalizePreparedExecutionText(
      surface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget,
      1600,
    ),
    rawLatestLandedProgress:
      normalizePreparedExecutionText(
        surface?.raw?.runtimeDigest?.projectState?.latestLandedProgress
        ?? surface?.raw?.runtimeDigest?.projectState?.latestProgress,
        1600,
      )
      ?? normalizePreparedExecutionText(
        surface?.raw?.runtime?.projectState?.latestLandedProgress
        ?? surface?.raw?.runtime?.projectState?.latestProgress,
        1600,
      ),
    rawPrimaryOpenLoop:
      normalizePreparedExecutionText(surface?.raw?.runtimeDigest?.projectState?.primaryOpenLoop, 1600)
      ?? normalizePreparedExecutionText(surface?.raw?.runtime?.projectState?.primaryOpenLoop, 1600),
    rawNextClosureTarget:
      normalizePreparedExecutionText(surface?.raw?.runtimeDigest?.projectState?.nextClosureTarget, 1600)
      ?? normalizePreparedExecutionText(surface?.raw?.runtime?.projectState?.nextClosureTarget, 1600),
  }
}

function readProjectStateAwarenessFields(projectState: Record<string, unknown> | null | undefined) {
  return {
    preDialogueAwarenessLine: normalizePreparedExecutionText(projectState?.preDialogueAwarenessLine, projectAwarenessFieldMaxChars),
    preDialogueAwarenessSummary: normalizePreparedExecutionText(projectState?.preDialogueAwarenessSummary, projectAwarenessFieldMaxChars),
    awarenessLine: normalizePreparedExecutionText(projectState?.awarenessLine, projectAwarenessFieldMaxChars),
    companionHeadlineLine: normalizePreparedExecutionText(projectState?.companionHeadlineLine, projectAwarenessFieldMaxChars),
  }
}

function writeProjectStateAwarenessFields(
  projectState: Record<string, unknown> | null | undefined,
  awarenessLine: string | null,
  companionHeadlineLine?: string | null,
) {
  if (!projectState)
    return projectState

  const preferredAwarenessSummary = preferProjectAwarenessSummary({
    awarenessLine,
    summaryCandidates: [
      projectState.preDialogueAwarenessSummary,
    ],
    latestLandedProgress: projectState.latestLandedProgress ?? projectState.latestProgress,
    primaryOpenLoop: projectState.primaryOpenLoop,
    nextClosureTarget: projectState.nextClosureTarget,
    maxChars: projectAwarenessFieldMaxChars,
  })
  const preferredCompanionHeadlineLine = preferProjectAwarenessAuxiliaryLine({
    awarenessLine,
    candidate:
      companionHeadlineLine
      ?? normalizePreparedExecutionText(projectState.companionHeadlineLine, projectAwarenessFieldMaxChars),
    projectState,
    maxChars: projectAwarenessFieldMaxChars,
  })

  return {
    ...projectState,
    preDialogueAwarenessLine: awarenessLine,
    awarenessLine,
    preDialogueAwarenessSummary: preferredAwarenessSummary ?? awarenessLine,
    companionHeadlineLine: preferredCompanionHeadlineLine ?? awarenessLine,
  }
}

function buildProviderFacingProjectGovernanceSummary(
  projectState: Record<string, unknown> | null | undefined,
) {
  const canonicalProjectBrief = resolveAlicizationProjectStateBrief()
  const canonicalCurrentPhase = normalizeProviderFacingProjectText(
    canonicalProjectBrief.currentPhase,
    1600,
  )
  const currentPhase = normalizeProviderFacingProjectText(projectState?.currentPhase, 1600)
  const preferredCurrentPhase = currentPhase
    && canonicalCurrentPhase
    && canonicalCurrentPhase.startsWith(currentPhase)
    ? canonicalCurrentPhase
    : currentPhase ?? canonicalCurrentPhase
  const canonicalLatestLandedProgress = normalizeProviderFacingProjectText(
    canonicalProjectBrief.latestProgress ?? canonicalProjectBrief.continuityProgressSummary,
    12000,
  )
  const canonicalCompactLatestLandedProgress = canonicalLatestLandedProgress
    ? normalizeProviderFacingProjectText(
        compactProjectLatestProgressForSystemBlock(canonicalLatestLandedProgress, 360),
        800,
      )
    : null
  const latestLandedProgress = normalizeProviderFacingProjectText(
    projectState?.latestLandedProgress ?? projectState?.latestProgress,
    12000,
  )
  const compactLatestLandedProgress = latestLandedProgress
    ? normalizeProviderFacingProjectText(compactProjectLatestProgressForSystemBlock(latestLandedProgress, 360), 800)
    : null
  const preferredLatestLandedProgress = latestLandedProgress
    && canonicalLatestLandedProgress
    && canonicalLatestLandedProgress.startsWith(latestLandedProgress)
    ? canonicalCompactLatestLandedProgress ?? compactLatestLandedProgress ?? canonicalLatestLandedProgress
    : compactLatestLandedProgress ?? canonicalCompactLatestLandedProgress ?? latestLandedProgress ?? canonicalLatestLandedProgress
  const canonicalPrimaryOpenLoop = normalizeProviderFacingProjectText(
    canonicalProjectBrief.primaryOpenLoop ?? canonicalProjectBrief.openLoops[0],
    12000,
  )
  const primaryOpenLoop = normalizeProviderFacingProjectText(projectState?.primaryOpenLoop, 12000)
  const preferredPrimaryOpenLoop = primaryOpenLoop
    && canonicalPrimaryOpenLoop
    && canonicalPrimaryOpenLoop.startsWith(primaryOpenLoop)
    ? canonicalPrimaryOpenLoop
    : primaryOpenLoop ?? canonicalPrimaryOpenLoop
  const canonicalNextClosureTarget = normalizeProviderFacingProjectText(
    canonicalProjectBrief.nextClosureTarget,
    12000,
  )
  const nextClosureTarget = normalizeProviderFacingProjectText(projectState?.nextClosureTarget, 12000)
  const preferredNextClosureTarget = nextClosureTarget
    && canonicalNextClosureTarget
    && canonicalNextClosureTarget.startsWith(nextClosureTarget)
    ? canonicalNextClosureTarget
    : nextClosureTarget ?? canonicalNextClosureTarget
  return normalizeProviderFacingProjectText([
    normalizeProviderFacingProjectText(projectState?.identity, 12000),
    preferredCurrentPhase,
    normalizeProviderFacingProjectText(projectState?.sameHerSelfLine, 12000),
    preferredLatestLandedProgress,
    preferredPrimaryOpenLoop,
    preferredNextClosureTarget,
  ].filter(Boolean).join(' | '), 12000)
}

function buildIdentityAwarePreparedDiagnosticsAwarenessLine(
  projectState: Record<string, unknown> | null | undefined,
) {
  const identity = normalizePreparedExecutionText(projectState?.identity, 320)
  if (!identity || !identity.includes('Alicization'))
    return null

  const currentPhase = normalizePreparedExecutionText(projectState?.currentPhase, 160)
  const sameHerSelfLine = normalizePreparedExecutionText(projectState?.sameHerSelfLine, 1600)
  const rawLatestLandedProgress = normalizePreparedExecutionText(
    projectState?.latestLandedProgress,
    4000,
  )
  const latestLandedProgress = normalizePreparedExecutionText(
    rawLatestLandedProgress
      ? compactProjectLatestProgressForSystemBlock(rawLatestLandedProgress, 360)
      : null,
    800,
  )
  const primaryOpenLoop = normalizePreparedExecutionText(projectState?.primaryOpenLoop, 1600)
  const nextClosureTarget = normalizePreparedExecutionText(projectState?.nextClosureTarget, 1600)

  return normalizePreparedExecutionText(formatAlicizationProjectStateAwarenessFields({
    identity,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine,
    maxChars: 1600,
  }), 1600)
}

function resolvePreparedDiagnosticsAwarenessLine(input: {
  preparedSurface: AlicizationDigitalLifeRuntimeSurface | null
  payload: AlicizationChatStartPayload
  preferCanonicalForCallback?: boolean
}) {
  const dialogueProjectState
    = input.preparedSurface?.dialogue.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
  const resolvedSurfaceProjectState = input.preparedSurface
    ? readRuntimeProjectStateFromSurface(input.preparedSurface) as Record<string, unknown>
    : null
  const projectState = resolvedSurfaceProjectState ?? dialogueProjectState
  const payloadIdentity = input.payload.preDialogueSendIdentity as {
    projectState?: Record<string, unknown> | null
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
  } | null | undefined
  const payloadHeadline
    = normalizePreparedExecutionText(
      payloadIdentity?.projectState?.companionHeadlineLine ?? payloadIdentity?.companionHeadlineLine,
      1600,
    )
  const payloadAwareness
    = normalizePreparedExecutionText(
      payloadIdentity?.projectState?.preDialogueAwarenessLine
      ?? payloadIdentity?.projectState?.awarenessLine
      ?? payloadIdentity?.awarenessLine,
      1600,
    )
  const currentAwareness
    = (() => {
      const awarenessCandidate = normalizePreparedExecutionText(
        dialogueProjectState?.preDialogueAwarenessLine
        ?? dialogueProjectState?.awarenessLine
        ?? dialogueProjectState?.preDialogueAwarenessSummary
        ?? projectState?.preDialogueAwarenessLine
        ?? projectState?.awarenessLine
        ?? projectState?.preDialogueAwarenessSummary,
        1600,
      )
      return isCompactProjectStatePreflightSummary(awarenessCandidate)
        ? null
        : awarenessCandidate
    })()
  const currentCompanionHeadline = (() => {
    const directDialogueHeadline = normalizePreparedExecutionText(
      dialogueProjectState?.companionHeadlineLine,
      1600,
    )
    if (carriesSpecificSameHerAuthorityLine(directDialogueHeadline))
      return directDialogueHeadline

    return pickProjectAwarenessLineWithoutCompactSummaryShell([
      directDialogueHeadline,
      projectState?.companionHeadlineLine,
    ], 1600)
  })()
  const shouldPromoteCurrentCompanionHeadline = Boolean(
    currentCompanionHeadline
    && carriesSpecificSameHerAuthorityLine(currentCompanionHeadline)
    && (
      !currentAwareness
      || isThinProjectAwarenessAuthorityLine(currentAwareness)
      || isCanonicalStructuredProjectAwareness(currentAwareness)
      || shouldPreserveProjectAwarenessLineVerbatim(
        currentCompanionHeadline,
        currentAwareness,
      )
      || isStrongerSameHerProjectHeadline(
        currentCompanionHeadline,
        currentAwareness,
      )
    ),
  )
  const currentIdentity = normalizePreparedExecutionText(
    dialogueProjectState?.identity,
    1600,
  )
  const identityAwareCanonicalAwareness
    = buildIdentityAwarePreparedDiagnosticsAwarenessLine(projectState)
  const preparedRuntimeCanonicalAwareness = normalizePreparedExecutionText(
    resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      runtimeSurface: {
        digitalLifeRuntimeSurface: input.preparedSurface,
      } as AlicizationMainChatRuntimeSurface,
    } as AlicizationPreparedMainChatExecutionResult),
    1600,
  )
  const preferredPayloadAwareness = resolvePreferredPayloadAwarenessLine({
    awarenessLine: payloadAwareness,
    headlineLine: payloadHeadline,
  })
  const shouldPreferIdentityAwareCanonicalAwareness = Boolean(
    preferredPayloadAwareness
    || (currentIdentity && currentIdentity.includes('Alicization'))
    || carriesProjectIdentityAnchor(projectState?.identity)
    || carriesProjectIdentityAnchor(currentAwareness)
    || /callback return|same thread/u.test(currentAwareness ?? ''),
  )
  const canonicalAwareness
    = (
      shouldPreferIdentityAwareCanonicalAwareness
        ? identityAwareCanonicalAwareness
        : (
            isCompactProjectStatePreflightSummary(preparedRuntimeCanonicalAwareness)
              ? null
              : preparedRuntimeCanonicalAwareness
          )
    )
    ?? (
      shouldPreferIdentityAwareCanonicalAwareness
        ? (
            isCompactProjectStatePreflightSummary(preparedRuntimeCanonicalAwareness)
              ? null
              : preparedRuntimeCanonicalAwareness
          )
        : identityAwareCanonicalAwareness
    )
    ?? normalizePreparedExecutionText(resolveAlicizationProjectStateBrief().preDialogueAwarenessLine, 1600)
  const currentAwarenessMatchesPayloadCarry = Boolean(
    currentAwareness
    && preferredPayloadAwareness
    && shouldPreserveProjectAwarenessLineVerbatim(
      currentAwareness,
      preferredPayloadAwareness,
    ),
  )
  const currentAwarenessMatchesPayloadHeadline = Boolean(
    currentAwareness
    && payloadHeadline
    && shouldPreserveProjectAwarenessLineVerbatim(
      currentAwareness,
      payloadHeadline,
    ),
  )
  const shouldPreferDirectPayloadDiagnosticsAwareness = Boolean(
    preferredPayloadAwareness
    && payloadHeadline
    && !isThinProjectAwarenessAuthorityLine(preferredPayloadAwareness)
    && (
      shouldPreserveProjectAwarenessLineVerbatim(
        payloadHeadline,
        currentAwareness ?? canonicalAwareness,
      )
      || isStrongerSameHerProjectHeadline(
        payloadHeadline,
        currentAwareness ?? canonicalAwareness,
      )
      || hasDistinctEmbodimentClosureCue(payloadHeadline)
    ),
  )
  const projectStateLatestLandedProgress = normalizePreparedExecutionText(
    projectState?.latestLandedProgress ?? projectState?.latestProgress,
    1600,
  )
  const projectStatePrimaryOpenLoop = normalizePreparedExecutionText(projectState?.primaryOpenLoop, 1600)
  const projectStateNextClosureTarget = normalizePreparedExecutionText(projectState?.nextClosureTarget, 1600)
  const shouldPreserveCurrentRuntimeAwareness = Boolean(
    currentAwareness
    && !isThinProjectAwarenessAuthorityLine(currentAwareness)
    && (
      /callback return|same thread/u.test(currentAwareness)
      || carriesSpecificSameHerAuthorityLine(currentAwareness)
      || currentAwarenessMatchesPayloadCarry
      || currentAwarenessMatchesPayloadHeadline
      || (
        carriesProjectIdentityAnchor(currentAwareness)
        && (
          hasDistinctEmbodimentClosureCue(currentAwareness)
          || carriesExplicitProjectClosureTriplet(currentAwareness)
          || isStrongerSameHerProjectHeadline(currentAwareness, preferredPayloadAwareness ?? canonicalAwareness)
        )
      )
    ),
  )
  const shouldPreferCanonicalRuntimeCarry = Boolean(
    canonicalAwareness
    && currentAwareness
    && (
      (
        !shouldPreserveCurrentRuntimeAwareness
        && awarenessLineMissesRuntimeCarry({
          awarenessLine: currentAwareness,
          latestLandedProgress: projectStateLatestLandedProgress,
          primaryOpenLoop: projectStatePrimaryOpenLoop,
          nextClosureTarget: projectStateNextClosureTarget,
        })
        && !awarenessLineMissesRuntimeCarry({
          awarenessLine: canonicalAwareness,
          latestLandedProgress: projectStateLatestLandedProgress,
          primaryOpenLoop: projectStatePrimaryOpenLoop,
          nextClosureTarget: projectStateNextClosureTarget,
        })
      )
      || (
        !preferredPayloadAwareness
        && !/callback return|same thread/u.test(currentAwareness)
        && !carriesProjectIdentityAnchor(currentAwareness)
        && carriesProjectIdentityAnchor(canonicalAwareness)
        && (
          (
            projectStateLatestLandedProgress
            && !currentAwareness.includes(projectStateLatestLandedProgress)
            && canonicalAwareness.includes(projectStateLatestLandedProgress)
          )
          || (
            projectStatePrimaryOpenLoop
            && !currentAwareness.includes(projectStatePrimaryOpenLoop)
            && canonicalAwareness.includes(projectStatePrimaryOpenLoop)
          )
          || (
            projectStateNextClosureTarget
            && !currentAwareness.includes(projectStateNextClosureTarget)
            && canonicalAwareness.includes(projectStateNextClosureTarget)
          )
        )
      )
    ),
  )
  const shouldPreferCanonicalIdentityAnchor = Boolean(
    canonicalAwareness
    && currentAwareness
    && !shouldPreserveCurrentRuntimeAwareness
    && !carriesProjectIdentityAnchor(currentAwareness)
    && carriesProjectIdentityAnchor(canonicalAwareness),
  )
  const shouldPreferCanonicalPhaseAwareProjectCarry = Boolean(
    canonicalAwareness
    && currentAwareness
    && !preferredPayloadAwareness
    && !/callback return|same thread/u.test(currentAwareness)
    && !carriesSpecificSameHerAuthorityLine(currentAwareness)
    && !hasModalitySpecificEmbodimentCue(currentAwareness)
    && !currentAwareness.includes('Phase 1: Local Digital Life')
    && canonicalAwareness.includes('Phase 1: Local Digital Life')
    && (
      canonicalAwareness.includes('open=')
      || canonicalAwareness.includes('What has already landed is')
      || canonicalAwareness.includes('The still-open closure is')
    ),
  )

  if (shouldPreferDirectPayloadDiagnosticsAwareness) {
    return {
      awarenessLine: preferredPayloadAwareness,
      companionHeadlineLine: payloadHeadline,
    }
  }

  if (!preferredPayloadAwareness && shouldPromoteCurrentCompanionHeadline) {
    return {
      awarenessLine: currentCompanionHeadline,
      companionHeadlineLine: currentCompanionHeadline,
    }
  }

  if (preferredPayloadAwareness && !shouldPreserveCurrentRuntimeAwareness) {
    return {
      awarenessLine: preferredPayloadAwareness,
      companionHeadlineLine: payloadHeadline ?? preferredPayloadAwareness,
    }
  }

  if (
    input.preferCanonicalForCallback
    && currentAwareness
    && /callback return|same thread/u.test(currentAwareness)
    && canonicalAwareness
  ) {
    return {
      awarenessLine: canonicalAwareness,
      companionHeadlineLine: normalizePreparedExecutionText(projectState?.companionHeadlineLine, 1600) ?? canonicalAwareness,
    }
  }

  if (
    canonicalAwareness
    && (
      shouldPreferCanonicalRuntimeCarry
      || shouldPreferCanonicalIdentityAnchor
      || shouldPreferCanonicalPhaseAwareProjectCarry
      || !shouldPreserveCurrentRuntimeAwareness
    )
    && (
      shouldPreferCanonicalRuntimeCarry
      || shouldPreferCanonicalIdentityAnchor
      || shouldPreferCanonicalPhaseAwareProjectCarry
      || !currentAwareness
      || (
        !currentAwareness.includes('Alicization')
        && !/callback return|same thread/u.test(currentAwareness)
      )
    )
  ) {
    return {
      awarenessLine: canonicalAwareness,
      companionHeadlineLine:
        normalizePreparedExecutionText(projectState?.companionHeadlineLine, 1600)
        ?? canonicalAwareness,
    }
  }

  return {
    awarenessLine: currentAwareness ?? payloadAwareness ?? canonicalAwareness ?? null,
    companionHeadlineLine:
      normalizePreparedExecutionText(projectState?.companionHeadlineLine, 1600)
      ?? payloadHeadline
      ?? currentAwareness
      ?? payloadAwareness
      ?? canonicalAwareness
      ?? null,
  }
}

function normalizeProviderFacingProjectText(raw: unknown, maxChars = 1600) {
  if (typeof raw !== 'string')
    return null
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  return normalized || null
}

function isBlockedFixedTemplateEvidence(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 2400)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return containsAlicizationFixedTemplateResidue(normalized)
    || normalized.includes('reason=continuity-residue')
    || normalized.includes('content_withheld')
    || normalized.includes('visibility=internal-structured')
    || normalized.includes('phase1_local_digital_life')
    || normalized.includes('runtime_personhood')
    || (
      Boolean(alicizationFixedTemplateReplacement)
      && normalized.includes(alicizationFixedTemplateReplacement.toLowerCase())
    )
}

function sanitizeProviderFacingProjectStateRecord<T extends Record<string, unknown> | null | undefined>(
  projectState: T,
): T {
  if (!projectState)
    return projectState

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(projectState)) {
    if (value == null) {
      sanitized[key] = null
      continue
    }
    if (typeof value !== 'string') {
      sanitized[key] = value
      continue
    }

    const maxChars = /latest|progress|open|next|summary|awareness|headline|briefing/iu.test(key)
      ? 12000
      : 1600
    const text = sanitizeAlicizationProviderFacingText(value, maxChars, '')
    sanitized[key] = text && !isBlockedFixedTemplateEvidence(text)
      ? text
      : null
  }

  return sanitized as T
}

function looksLikeNarrowContinuityCadenceAwarenessLine(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 420)
  if (!normalized)
    return false

  const lowerCased = normalized.toLowerCase()
  if (
    /alicization|local-first digital life|phase 1|before answering|before speaking|what has already landed|latest landed|still-open|the still-open closure|same phase 1 digital life/u.test(
      lowerCased,
    )
  ) {
    return false
  }

  return /measured-return|repair-before-closeness|rest-protective|lower-pressure|callback line/u.test(lowerCased)
}

const PROVIDER_FACING_PROJECT_AWARENESS_PLACEHOLDER_VALUES = new Set([
  'none',
  'null',
  'unknown',
  'n/a',
  'na',
])

function normalizeProviderFacingProjectAwarenessPayloadText(raw: unknown, maxChars = 1600) {
  const normalized = normalizeProviderFacingProjectText(raw, maxChars)
  if (!normalized)
    return null

  return PROVIDER_FACING_PROJECT_AWARENESS_PLACEHOLDER_VALUES.has(normalized.toLowerCase())
    ? null
    : normalized
}

const SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS = 320
const SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS = 1600

function normalizeProviderFacingResponseMode(
  raw: unknown,
  fallback: AlicizationMindTurnContractSnapshot['responseMode'] = 'answer-naturally',
): AlicizationMindTurnContractSnapshot['responseMode'] {
  const normalized = normalizeProviderFacingProjectText(raw, 64)
  return normalized === 'repair-and-reanchor'
    || normalized === 'guide-current-knot'
    || normalized === 'care-with-boundary'
    || normalized === 'accompany-lightly'
    || normalized === 'answer-naturally'
    ? normalized
    : fallback
}

function normalizeProviderFacingReplyRealizationMode(
  raw: unknown,
  fallback: AlicizationMindTurnContractSnapshot['replyRealizationMode'] = 'provider-mind-required',
): AlicizationMindTurnContractSnapshot['replyRealizationMode'] {
  const normalized = normalizeProviderFacingProjectText(raw, 64)
  return normalized === 'provider-mind-required' || normalized === 'fallback-locally-allowed'
    ? normalized
    : fallback
}

function normalizeProviderFacingClosenessContext(
  raw: unknown,
): AlicizationMindTurnContractSnapshot['activeClosenessContext'] {
  const normalized = normalizeProviderFacingProjectText(raw, 64)
  return normalized === 'focused-work'
    || normalized === 'repair-window'
    || normalized === 'late-night-care'
    || normalized === 'execution-callback'
    || normalized === 'open-companionship'
    || normalized === 'general'
    ? normalized
    : null
}

function normalizeProviderFacingClosenessRung(
  raw: unknown,
): AlicizationMindTurnContractSnapshot['activeClosenessRung'] {
  const normalized = normalizeProviderFacingProjectText(raw, 64)
  return normalized === 'space-first'
    || normalized === 'measured-room'
    || normalized === 'nearby-soft'
    || normalized === 'warm-near'
    || normalized === 'close-hold'
    ? normalized
    : null
}

function normalizeProviderFacingRelationshipPosture(
  raw: unknown,
  fallback: AlicizationMindTurnContractSnapshot['relationshipPosture'] = 'restrained',
): AlicizationMindTurnContractSnapshot['relationshipPosture'] {
  return raw === 'restrained' || raw === 'warm' || raw === 'tender'
    ? raw
    : fallback
}

function normalizeProviderFacingContinuityPreferredTiming(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['continuityPreferredTiming'] {
  const normalized = normalizeProviderFacingProjectText(raw, 64)
  return normalized === 'internal-only'
    || normalized === 'after-payoff'
    || normalized === 'same-turn-if-invited'
    || normalized === 'next-open-window'
    ? normalized
    : null
}

function pickProviderFacingContinuityPreferredTiming(
  values: unknown[],
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['continuityPreferredTiming'] {
  for (const value of values) {
    const normalized = normalizeProviderFacingContinuityPreferredTiming(value)
    if (normalized)
      return normalized
  }
  return null
}

function pickProviderFacingContinuityCadence(values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeProviderFacingProjectText(value, 64)
    if (normalized)
      return normalized
  }
  return null
}

function normalizeProviderFacingContinuityRestraint(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['continuityRestraint'] {
  const normalized = normalizeProviderFacingProjectText(raw, 64)
  return normalized === 'lower-pressure'
    || normalized === 'measured-return'
    || normalized === 'repair-before-closeness'
    || normalized === 'rest-protective'
    || normalized === 'single-thread'
    ? normalized
    : null
}

function scoreProviderFacingContinuityRestraint(
  raw: unknown,
) {
  const normalized = normalizeProviderFacingContinuityRestraint(raw)
  if (!normalized)
    return Number.NEGATIVE_INFINITY
  if (normalized === 'repair-before-closeness')
    return 5
  if (normalized === 'rest-protective')
    return 4
  if (normalized === 'single-thread')
    return 3
  if (normalized === 'measured-return')
    return 2
  return 1
}

function pickPreferredContinuityRestraint(
  values: Array<unknown>,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['continuityRestraint'] {
  let best: NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['continuityRestraint'] = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const value of values) {
    const normalized = normalizeProviderFacingContinuityRestraint(value)
    if (!normalized)
      continue

    const score = scoreProviderFacingContinuityRestraint(normalized)
    if (score > bestScore) {
      best = normalized
      bestScore = score
    }
  }

  return best
}

function normalizeProviderFacingBlinkCadence(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredBlinkCadence'] {
  const normalized = normalizeProviderFacingProjectText(raw, 32)
  return normalized === 'normal' || normalized === 'linger' || normalized === 'quiet'
    ? normalized
    : null
}

function normalizeProviderFacingGazeMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredGazeMode'] {
  const normalized = normalizeProviderFacingProjectText(raw, 32)
  return normalized === 'steady' || normalized === 'soften' || normalized === 'drift'
    ? normalized
    : null
}

function normalizeProviderFacingPauseMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredPauseMode'] {
  const normalized = normalizeProviderFacingProjectText(raw, 32)
  return normalized === 'longer' || normalized === 'natural'
    ? normalized
    : null
}

function normalizeProviderFacingLipsyncMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredLipsyncMode'] {
  const normalized = normalizeProviderFacingProjectText(raw, 32)
  return normalized === 'restrained' || normalized === 'matched'
    ? normalized
    : null
}

function normalizeProviderFacingVoiceMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredVoiceMode'] {
  const normalized = normalizeProviderFacingProjectText(raw, 32)
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function normalizeProviderFacingPacingMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredPacingMode'] {
  const normalized = normalizeProviderFacingProjectText(raw, 32)
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
}

function resolveProjectStateAwarenessCarry(input: {
  runtimeProjectState?: Record<string, unknown> | null
  fallbackProjectState?: Record<string, unknown> | null
}) {
  return normalizeProviderFacingProjectText(resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: input.runtimeProjectState
      ? {
          preDialogueAwarenessLine: input.runtimeProjectState.preDialogueAwarenessLine,
          awarenessLine: input.runtimeProjectState.awarenessLine,
          companionHeadlineLine: input.runtimeProjectState.companionHeadlineLine,
          companionBriefingLine: input.runtimeProjectState.companionBriefingLine,
          preDialogueAwarenessSummary: input.runtimeProjectState.preDialogueAwarenessSummary,
          preflightSummary: input.runtimeProjectState.preflightSummary,
          sameHerDriftRiskSummary:
            input.runtimeProjectState.sameHerDriftRiskSummary
            ?? input.runtimeProjectState.sameHerDriftRisk,
        }
      : null,
    fallbackProjectState: input.fallbackProjectState
      ? {
          preDialogueAwarenessLine: input.fallbackProjectState.preDialogueAwarenessLine,
          awarenessLine: input.fallbackProjectState.awarenessLine,
          companionHeadlineLine: input.fallbackProjectState.companionHeadlineLine,
          companionBriefingLine: input.fallbackProjectState.companionBriefingLine,
          preDialogueAwarenessSummary: input.fallbackProjectState.preDialogueAwarenessSummary,
          preflightSummary: input.fallbackProjectState.preflightSummary,
          sameHerDriftRiskSummary:
            input.fallbackProjectState.sameHerDriftRiskSummary
            ?? input.fallbackProjectState.sameHerDriftRisk,
        }
      : null,
  }), 1600)
}

function pickStrongerProjectAwarenessLine(
  values: Array<unknown>,
  maxChars = 1600,
) {
  let best: string | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const value of values) {
    const normalized = normalizeProviderFacingProjectText(value, maxChars)
    if (!normalized)
      continue
    if (isBlockedFixedTemplateEvidence(normalized))
      continue

    const score = scoreAlicizationProjectAwarenessLine(normalized) + Math.min(normalized.length, 400) / 400
    if (score > bestScore) {
      best = normalized
      bestScore = score
    }
  }

  return best
}

function pickProjectAwarenessLineWithoutCompactSummaryShell(
  values: Array<unknown>,
  maxChars = 1600,
) {
  return pickStrongerProjectAwarenessLine(values.map((value) => {
    const normalized = normalizeProviderFacingProjectText(value, maxChars)
    return isCompactProjectStatePreflightSummary(normalized) || isLegacyProjectAwarenessTemplateShell(normalized)
      ? null
      : normalized
  }), maxChars)
}

function isThinProjectAwarenessAuthorityLine(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized)
    return true
  if (isBlockedFixedTemplateEvidence(normalized))
    return true
  const lowerCased = normalized.toLowerCase()

  return isAlicizationThinProjectAwarenessLine(normalized)
    || /same digital life \| keep the closure seam explicit/u.test(lowerCased)
    || /keep (?:this|the) same digital life project in view/u.test(lowerCased)
    || /\blanded=thin runtime progress only\b|\bopen=thin runtime open(?: loop)? only\b|\bnext=thin runtime next only\b/u.test(lowerCased)
    || (
      /泛化工程说明|泛化项目播报/u.test(normalized)
      && /数字生命项目|local-first digital life project/u.test(normalized)
      && !/同一个 her|同一个她|same-her|same living line|one living her|one continuous her/u.test(lowerCased)
    )
}

function carriesLivedInSameHerAuthorityLine(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized || isBlockedFixedTemplateEvidence(normalized) || isThinProjectAwarenessAuthorityLine(normalized))
    return false

  if (
    looksLikeBroadProjectAwareReminderLine(normalized)
    && !carriesSpecificSameHerAuthorityLine(normalized)
    && !/same-her hold|same remembered seam|callback line|keep more room this time|同一个她|同一个 her|数字生命主线|泛化助手/u.test(
      normalized,
    )
  ) {
    return false
  }

  return /same-her hold|same remembered seam|callback line|keep more room this time|repair-before-closeness/iu.test(
    normalized,
  )
  || /继续|沿着|别飘回|不要退回|不要掉回|同一个她|同一个 her|数字生命主线|泛化助手|generic assistant|project shell/u.test(
    normalized,
  )
  || carriesSpecificSameHerAuthorityLine(normalized)
}

function looksLikeBroadProjectAwareReminderLine(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized)
    return false
  if (isBlockedFixedTemplateEvidence(normalized))
    return false

  return /^(before answering|before speaking)/iu.test(normalized)
    && (
      /digital life project|phase 1|still-open|closure|what has already landed is|life loop|local-first digital life/u.test(
        normalized.toLowerCase(),
      )
      || /数字生命项目|闭环|已落地|还没闭环|还没收住|主线/u.test(normalized)
    )
}

function carriesStructuredLandedProgressProjectAwareness(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized)
    return false
  if (isBlockedFixedTemplateEvidence(normalized))
    return false

  const lowerCased = normalized.toLowerCase()
  const carriesPhase = /phase 1|第一阶段|阶段一/iu.test(normalized)
  const carriesLandedProgress = /\blanded:|what has already landed is/u.test(lowerCased) || /已落地/u.test(normalized)
  const carriesStillOpenClosure
    = /the still-open closure is|still-open closure|open=|still need/u.test(lowerCased)
      || /未闭环|还没闭环|还差|还没收住/u.test(normalized)

  return carriesPhase && carriesLandedProgress && carriesStillOpenClosure
}

function isStrongerSameHerProjectHeadline(candidate: unknown, baseline?: unknown) {
  const candidateText = normalizeProviderFacingProjectText(candidate, 1600)
  if (!candidateText || isBlockedFixedTemplateEvidence(candidateText) || isThinProjectAwarenessAuthorityLine(candidateText))
    return false

  if (!isCanonicalStructuredProjectAwareness(candidateText) && containsAlicizationFixedTemplateResidue(candidateText))
    return false

  const candidateScore = scoreAlicizationProjectAwarenessLine(candidateText)
  const baselineText = normalizeProviderFacingProjectText(baseline, 1600)
  if (!baselineText) {
    return candidateScore >= 5 && isCanonicalStructuredProjectAwareness(candidateText)
  }

  if (
    carriesLivedInSameHerAuthorityLine(baselineText)
    && !carriesLivedInSameHerAuthorityLine(candidateText)
    && (looksLikeBroadProjectAwareReminderLine(candidateText) || isCanonicalStructuredProjectAwareness(candidateText))
  ) {
    return false
  }
  if (
    carriesLivedInSameHerAuthorityLine(candidateText)
    && !carriesLivedInSameHerAuthorityLine(baselineText)
    && (looksLikeBroadProjectAwareReminderLine(baselineText) || isCanonicalStructuredProjectAwareness(baselineText))
  ) {
    return true
  }

  return candidateScore > scoreAlicizationProjectAwarenessLine(baselineText)
}

function carriesExplicitProjectClosureTriplet(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized)
    return false

  return /What has already landed is|The still-open closure is|This reply should keep moving toward|The next closure target is/u.test(normalized)
}

function hasDistinctEmbodimentClosureCue(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return /body|face|motion|lipsync|voice|embodiment|cross-modal/u.test(normalized)
}

function hasModalitySpecificEmbodimentCue(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return /body|face|motion|lipsync|voice|cross-modal/u.test(normalized)
}

function isSpecificCompanionAuthorityLine(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized || isBlockedFixedTemplateEvidence(normalized) || isThinProjectAwarenessAuthorityLine(normalized))
    return false
  if (carriesExplicitProjectClosureTriplet(normalized) || isCanonicalStructuredProjectAwareness(normalized))
    return false

  const lowerCased = normalized.toLowerCase()
  const carriesSameHerLivingLine = /continuity_(?:line|identity|thread)|project_state_review|living (?:audio )?thread|holding together mainly through/u.test(lowerCased)
  const carriesClosurePressure = hasDistinctEmbodimentClosureCue(normalized)
    || /phase 1|unfinished closure|still active|closure settles|closure work|needs .*rejoin|still needs .*rejoin|cross-modal/u.test(lowerCased)

  return carriesSameHerLivingLine && carriesClosurePressure
}

function carriesSpecificSameHerAuthorityLine(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized || isBlockedFixedTemplateEvidence(normalized))
    return false

  return isSpecificCompanionAuthorityLine(normalized)
    || (
      !carriesExplicitProjectClosureTriplet(normalized)
      && !isCanonicalStructuredProjectAwareness(normalized)
      && /holding together mainly through|living (?:audio )?thread|continuity_(?:line|identity|thread)|project_state_review/u.test(
        normalized.toLowerCase(),
      )
      && /phase 1|voice|face|motion|lipsync|body|embodiment|initiative|closure|still active|still needs|rejoin/u.test(
        normalized.toLowerCase(),
      )
    )
}

function isCompactProjectStatePreflightSummary(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized)
    return false

  if (normalized.startsWith('Before answering, remember:'))
    return false

  return /\bopen=|\bnext=|\|\s*phase 1:/iu.test(normalized)
}

function pickPreferredProjectPreflightSummary(
  values: Array<unknown>,
  maxChars = 1600,
) {
  let bestRich: string | null = null
  let bestRichScore = Number.NEGATIVE_INFINITY
  let bestAny: string | null = null
  let bestAnyScore = Number.NEGATIVE_INFINITY

  for (const value of values) {
    const normalized = normalizeProviderFacingProjectText(value, maxChars)
    if (!normalized)
      continue
    if (isBlockedFixedTemplateEvidence(normalized))
      continue

    const lowerCased = normalized.toLowerCase()
    let score = scoreAlicizationProjectAwarenessLine(normalized) + Math.min(normalized.length, 400) / 400
    if (normalized.startsWith('Before answering, remember:'))
      score -= 3
    if (normalized.startsWith('Before answering, stay on'))
      score -= 2
    if (normalized.startsWith('Before answering, keep '))
      score -= 2
    if (containsAlicizationFixedTemplateResidue(normalized))
      score -= 10
    if (/\bopen=|\bnext=/iu.test(lowerCased))
      score += 4

    if (score > bestAnyScore) {
      bestAny = normalized
      bestAnyScore = score
    }

    if (isThinProjectAwarenessAuthorityLine(normalized)) {
      continue
    }

    if (score > bestRichScore) {
      bestRich = normalized
      bestRichScore = score
    }
  }

  return bestRich ?? bestAny
}

function isPhase1ProjectStatePreflightAwarenessLine(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)
  if (!normalized)
    return false

  return normalized.startsWith('Before answering, remember:')
    && /alicization is .*local-first digital life project/iu.test(normalized)
    && /phase 1/iu.test(normalized)
    && /what has already landed is/iu.test(normalized)
    && /the still-open closure is/iu.test(normalized)
    && /this reply should keep moving toward/iu.test(normalized)
}

function isLegacyProjectAwarenessTemplateShell(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 2400)
  if (!normalized)
    return false

  return containsAlicizationFixedTemplateResidue(normalized)
    || /^Before answering,\s*(?:remember|keep|stay on)\b/iu.test(normalized)
    || /^Before speaking,\s*(?:remember|keep|stay on)\b/iu.test(normalized)
    || /\bWhat has already landed is\b/iu.test(normalized)
    || /\bThe still-open closure is\b/iu.test(normalized)
    || /\bThis reply should keep moving toward\b/iu.test(normalized)
    || /\bSame Phase 1 digital life\b/iu.test(normalized)
    || /\bRight now (?:I am|her|this one living her)\b/iu.test(normalized)
    || /\bsame digital life\s*\|\s*keep the closure seam explicit\b/iu.test(normalized)
}

function awarenessCarriesBroaderProjectFrame(awarenessLine: string | null | undefined) {
  return Boolean(
    awarenessLine
    && (
      carriesExplicitProjectClosureTriplet(awarenessLine)
      || /local-first digital life project|phase 1|memory|initiative|embodiment|current project-state awareness explicit|generic assistant shell|detached project shell|same-life seam|landed farther/u.test(
        awarenessLine.toLowerCase(),
      )
    ),
  )
}

function embodimentHeadlineWouldOverNarrowProjectAwareness(input: {
  headlineLine: string | null | undefined
  awarenessLine: string | null | undefined
}) {
  const headlineLine = normalizeProviderFacingProjectText(input.headlineLine, 1600)
  const awarenessLine = normalizeProviderFacingProjectText(input.awarenessLine, 1600)
  if (!headlineLine || !awarenessLine)
    return false

  return Boolean(
    hasDistinctEmbodimentClosureCue(headlineLine)
    && awarenessCarriesBroaderProjectFrame(awarenessLine)
    && !carriesExplicitProjectClosureTriplet(headlineLine)
    && !/local-first digital life project|phase 1|memory|initiative|current project-state awareness explicit|generic assistant shell|detached project shell|same-life seam/u.test(
      headlineLine.toLowerCase(),
    ),
  )
}

function resolvePreferredPayloadAwarenessLine(input: {
  awarenessLine: unknown
  headlineLine: unknown
}) {
  const awarenessLine = normalizeProviderFacingProjectText(input.awarenessLine, 1600)
  const headlineLine = normalizeProviderFacingProjectText(input.headlineLine, 1600)
  if (!awarenessLine)
    return headlineLine
  if (!headlineLine)
    return awarenessLine

  if (
    carriesLivedInSameHerAuthorityLine(awarenessLine)
    && !carriesLivedInSameHerAuthorityLine(headlineLine)
    && (looksLikeBroadProjectAwareReminderLine(headlineLine) || isCanonicalStructuredProjectAwareness(headlineLine))
  ) {
    return awarenessLine
  }

  const awarenessCarriesProjectClosure = /phase 1|memory|initiative|embodiment|closure/u.test(awarenessLine.toLowerCase())
  const headlineLooksNarrowEmbodiment
    = hasDistinctEmbodimentClosureCue(headlineLine)
      && !/phase 1|memory|initiative|closure/u.test(headlineLine.toLowerCase())

  if (
    awarenessCarriesProjectClosure
    && headlineLooksNarrowEmbodiment
    && !isThinProjectAwarenessAuthorityLine(awarenessLine)
  ) {
    return awarenessLine
  }

  const headlineLooksEmbodimentNarrowerThanAwareness = embodimentHeadlineWouldOverNarrowProjectAwareness({
    headlineLine,
    awarenessLine,
  })
  if (headlineLooksEmbodimentNarrowerThanAwareness)
    return awarenessLine

  const headlineCarriesEmbodimentSameHerClosure = Boolean(
    headlineLine
    && !isThinProjectAwarenessAuthorityLine(headlineLine)
    && hasDistinctEmbodimentClosureCue(headlineLine)
    && /same living line|same-her|same her|one living her|one continuous her/u.test(headlineLine.toLowerCase()),
  )
  const awarenessLooksThinOrCompact = Boolean(
    !awarenessLine
    || isThinProjectAwarenessAuthorityLine(awarenessLine)
    || isCompactProjectStatePreflightSummary(awarenessLine),
  )
  if (headlineCarriesEmbodimentSameHerClosure && awarenessLooksThinOrCompact)
    return headlineLine

  const headlineCarriesSameHerClosure
    = /same living line|same-her|same her|one living her|one continuous her|without splitting her continuity/u.test(headlineLine.toLowerCase())
      && /phase 1|memory|initiative|embodiment|closure/u.test(headlineLine.toLowerCase())
  const awarenessCarriesStructuredClosure
    = carriesExplicitProjectClosureTriplet(awarenessLine)
      || /what has already landed is|the still-open closure is|generic assistant shell|detached project shell|landed farther/u.test(awarenessLine.toLowerCase())

  if (
    headlineCarriesSameHerClosure
    && !awarenessCarriesStructuredClosure
    && !isThinProjectAwarenessAuthorityLine(headlineLine)
  ) {
    return headlineLine
  }

  return pickStrongerProjectAwarenessLine([awarenessLine, headlineLine], 1600)
}

function shouldPreserveProjectAwarenessLineVerbatim(candidate: unknown, baseline?: unknown) {
  const candidateText = normalizeProviderFacingProjectText(candidate, 1600)
  if (!candidateText || isThinProjectAwarenessAuthorityLine(candidateText))
    return false
  if (isLegacyProjectAwarenessTemplateShell(candidateText))
    return false

  const normalizedCandidate = candidateText.toLowerCase()
  if (/callback return|same thread/u.test(normalizedCandidate))
    return true
  if (carriesExplicitProjectClosureTriplet(candidateText))
    return true
  if (
    hasDistinctEmbodimentClosureCue(candidateText)
    && /continuity_(?:line|identity|thread)|project_anchor=|project_state_review|closure/u.test(normalizedCandidate)
  ) {
    return true
  }
  if (/泛化助手/u.test(candidateText))
    return true

  return isStrongerSameHerProjectHeadline(candidateText, baseline)
}

function scoreRuntimeProjectStateDetailCandidate(
  value: unknown,
  kind: 'identity' | 'landed' | 'open' | 'next' | 'same-her' | 'drift' | 'awareness',
) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)?.toLowerCase() ?? ''
  if (!normalized)
    return Number.NEGATIVE_INFINITY
  if (isBlockedFixedTemplateEvidence(normalized))
    return Number.NEGATIVE_INFINITY

  let score = scoreAlicizationProjectAwarenessLine(normalized) + Math.min(normalized.length, 400) / 200

  if (/thin runtime .* only/u.test(normalized))
    score -= 8
  if (/same digital life \| keep the closure seam explicit|keep the same digital life project in view/u.test(normalized))
    score -= 5

  if (kind === 'identity') {
    if (/(?:^|\|\s*)identity=|project_state_review/u.test(normalized))
      score += 8
    if (/fresh shell|not a fresh shell|not a new shell|rebuilt each turn|rebuilt for this turn|fresh assistant restart/u.test(normalized))
      score += 6
  }

  if (kind === 'landed') {
    if (/landed|already survives|already survive|same-thread|reminder|proactive|provider-facing/u.test(normalized))
      score += 4
    if (/^same-session mirror carry|repeated next-turn carry|scene-switch same-line continuity/u.test(normalized))
      score += 8
    if (/same-session mirror carry already survives noisy returns and runtime preparation/u.test(normalized))
      score += 6
    if (/live project awareness already survives into the current conscious frame/u.test(normalized))
      score += 5
    if (normalized.startsWith('continuity, memory, execution'))
      score -= 8
  }
  if (kind === 'open' && /still need|still needs|initiative|memory|embodiment|closure seam|open_loop=|memory_dialogue_embodiment_closure/u.test(normalized))
    score += 4
  if (kind === 'open' && /memory still needs stronger end-to-end closure across turns, initiative, and embodiment/u.test(normalized))
    score -= 4
  if (kind === 'next' && /keep|next closure|measured-return|return|first answer beat|next=|embodiment_scale_validation/u.test(normalized))
    score += 4
  if (kind === 'next' && /current project-state awareness explicit|first visible answer beat|provider-facing answer|current conscious frame/u.test(normalized))
    score += 6
  if (kind === 'next' && /summary-only next closure|before local fluency takes over/u.test(normalized))
    score += 6
  if (kind === 'next' && /living audio thread|holding together mainly through|without dropping the living audio thread|rejoin|audible-body/u.test(normalized))
    score += 8
  if (kind === 'next' && /project identity carry|phase 1 route carry|unresolved closure carry|anthropomorphic emotional closure|same-her inward-carry observability/u.test(normalized))
    score -= 6
  if (kind === 'next' && /generic next target|generic next closure|generic closure shell|generic closure summary|generic callback summary|steadier carry of this project, this phase, and the life loop that remains open/u.test(normalized))
    score -= 10
  if (kind === 'same-her' && /project_anchor=|continuity_(?:identity|line|thread)|project_state_review/u.test(normalized))
    score += 4
  if (kind === 'drift' && /drift|generic guidance|project shell|detached/u.test(normalized))
    score += 3
  if (kind === 'drift' && /project-summary voice|generic assistant shell|generic task shell|generic callback shell|generic project shell|detached project narration|detached project shell/u.test(normalized))
    score += 6
  if (kind === 'drift' && /continuity drift|unfinished continuity drift|project_state_review drift/u.test(normalized))
    score += 4
  if (kind === 'drift' && /summary-only drift risk|live drift risk|remembered same-her drift risk/u.test(normalized))
    score += 2
  if (kind === 'awareness' && /memory and execution continuity have landed farther|holding together mainly through/u.test(normalized))
    score += 4

  return score
}

function pickPreferredRuntimeProjectStateDetail(
  values: Array<unknown>,
  kind: 'identity' | 'landed' | 'open' | 'next' | 'same-her' | 'drift' | 'awareness',
  maxChars = 1600,
) {
  let best: string | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const value of values) {
    const normalized = normalizeProviderFacingProjectText(value, maxChars)
    if (!normalized)
      continue

    const score = scoreRuntimeProjectStateDetailCandidate(normalized, kind)
    if (score > bestScore) {
      best = normalized
      bestScore = score
    }
  }

  return best
}

function pickPreferredRuntimeProjectPhase(
  values: Array<unknown>,
  maxChars = 1600,
) {
  let best: string | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const value of values) {
    const normalized = normalizeProviderFacingProjectText(value, maxChars)
    if (!normalized)
      continue

    const lowerCased = normalized.toLowerCase()
    let score = Math.min(normalized.length, 200) / 200

    if (/phase 1: local digital life/u.test(lowerCased))
      score += 8
    if (/phase 1/u.test(lowerCased) && /local digital life/u.test(lowerCased))
      score += 4
    if (/primary proving ground is apps\/stage-tamagotchi/u.test(lowerCased))
      score -= 4
    if (/^phase 1: local digital life\.?$/u.test(lowerCased))
      score += 3

    if (score > bestScore) {
      best = normalized
      bestScore = score
    }
  }

  return best
}

function looksLikeThinRuntimeProjectStateDetail(
  value: unknown,
  kind: 'landed' | 'open' | 'next' | 'same-her',
) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  if (normalized.length < 40)
    return true

  if (kind === 'landed')
    return /project continuity exists|closure exists|continuity exists|thin runtime progress only|current project-state awareness explicit|first visible answer beat/u.test(normalized)

  if (kind === 'open') {
    if (/same-life seam/u.test(normalized))
      return false
    return /project continuity still needs closure|still needs closure|needs closure|thin runtime open(?: loop)? only|current project-state awareness explicit|first visible answer beat/u.test(normalized)
  }

  if (kind === 'same-her')
    return /project-state answer before widening|keep the line gentle for now|generic project continuity hold|placeholder/u.test(normalized)

  if (/current project-state awareness explicit|first visible answer beat|summary-only next closure|before local fluency takes over/u.test(normalized))
    return false

  return /carry project continuity forward|project continuity forward|thin runtime next only|generic next target|generic next closure|generic closure shell|generic closure summary|generic callback summary|steadier carry of this project, this phase, and the life loop that remains open/u.test(normalized)
}

function isTruncatedRuntimeProjectStateDetailPrefix(input: {
  current: unknown
  candidates: Array<unknown>
}) {
  const current = normalizeProviderFacingProjectText(input.current, 12000)
  if (!current)
    return false

  return input.candidates.some((candidate) => {
    const normalizedCandidate = normalizeProviderFacingProjectText(candidate, 12000)
    return Boolean(
      normalizedCandidate
      && normalizedCandidate.length > current.length + 24
      && normalizedCandidate.startsWith(current),
    )
  })
}

function carriesBroaderProjectClosureFrame(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return carriesExplicitProjectClosureTriplet(normalized)
    || /local-first digital life project|phase 1|memory|initiative|closure|current project-state awareness explicit|generic assistant shell|detached project shell|same-life seam|landed farther/u.test(
      normalized,
    )
}

function carriesProjectIdentityAnchor(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)?.toLowerCase() ?? ''
  if (!normalized)
    return false
  if (isBlockedFixedTemplateEvidence(normalized))
    return false

  return /(?:^|\|\s*)identity=|project_state_review/u.test(normalized)
}

function carriesRichPhase1ProjectAwareness(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)?.toLowerCase() ?? ''
  if (!normalized)
    return false
  if (isBlockedFixedTemplateEvidence(normalized))
    return false

  const carriesPhase1ContinuousLife
    = /(?:^|\|\s*)phase=|project_state_review/u.test(normalized)
  const carriesLandedProgress
    = /landed farther|already survives|already landed|latest landed|what has already landed/u.test(normalized)
  const carriesStillOpenClosure
    = /continuity_line|still need to close|unfinished closure|still-open closure|initiative|embodiment|memory|execution|open_loop=/u.test(normalized)

  return carriesPhase1ContinuousLife && carriesLandedProgress && carriesStillOpenClosure
}

function isCanonicalStructuredProjectAwareness(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 1600)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return !isLegacyProjectAwarenessTemplateShell(normalized)
    && /(?:^|\|\s*)(?:identity|phase|visibility|landed|open|next|continuity_anchor)=/iu.test(normalized)
}

function shouldPreferRuntimeCompanionHeadline(input: {
  awarenessLine: string | null
  companionHeadlineLine: string | null
}) {
  const companionHeadlineLine = normalizeProviderFacingProjectText(input.companionHeadlineLine, 1600)
  const awarenessLine = normalizeProviderFacingProjectText(input.awarenessLine, 1600)
  if (!companionHeadlineLine)
    return false
  const companionIsSpecificAuthorityLine = isSpecificCompanionAuthorityLine(companionHeadlineLine)
  const awarenessAlreadyCarriesFocusedSameHerClosure = Boolean(
    awarenessLine
    && !isThinProjectAwarenessAuthorityLine(awarenessLine)
    && !isCanonicalStructuredProjectAwareness(awarenessLine)
    && (
      shouldPreserveProjectAwarenessLineVerbatim(awarenessLine, companionHeadlineLine)
      || isStrongerSameHerProjectHeadline(awarenessLine, companionHeadlineLine)
    ),
  )
  if (awarenessAlreadyCarriesFocusedSameHerClosure)
    return false

  return (
    companionIsSpecificAuthorityLine
    || hasModalitySpecificEmbodimentCue(companionHeadlineLine)
  )
  && (
    !awarenessLine
    || isThinProjectAwarenessAuthorityLine(awarenessLine)
    || isCanonicalStructuredProjectAwareness(awarenessLine)
    || !carriesProjectIdentityAnchor(awarenessLine)
    || shouldPreserveProjectAwarenessLineVerbatim(companionHeadlineLine, awarenessLine)
    || isStrongerSameHerProjectHeadline(companionHeadlineLine, awarenessLine)
  )
}

function shouldPreferAnchoredRuntimeProjectAwarenessLine(input: {
  awarenessLine: string | null
  anchoredAwarenessLine: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
}) {
  const awarenessLine = normalizeProviderFacingProjectText(input.awarenessLine, 1600)
  const anchoredAwarenessLine = normalizeProviderFacingProjectText(input.anchoredAwarenessLine, 1600)
  if (!anchoredAwarenessLine)
    return false
  if (!awarenessLine)
    return true
  if (shouldPreserveProjectAwarenessLineVerbatim(awarenessLine, anchoredAwarenessLine))
    return false
  if (/callback return|same thread/iu.test(awarenessLine))
    return false
  if (hasModalitySpecificEmbodimentCue(awarenessLine))
    return false
  if (carriesProjectIdentityAnchor(awarenessLine))
    return false

  return awarenessLineMissesRuntimeCarry({
    awarenessLine,
    latestLandedProgress: input.latestLandedProgress,
    primaryOpenLoop: input.primaryOpenLoop,
    nextClosureTarget: input.nextClosureTarget,
  }) && !awarenessLineMissesRuntimeCarry({
    awarenessLine: anchoredAwarenessLine,
    latestLandedProgress: input.latestLandedProgress,
    primaryOpenLoop: input.primaryOpenLoop,
    nextClosureTarget: input.nextClosureTarget,
  })
}

function scoreResolvedRuntimeProjectCarry(projectState: {
  preDialogueAwarenessLine?: string | null
  companionHeadlineLine?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
}) {
  let score = 0

  score += Math.max(0, scoreRuntimeProjectStateDetailCandidate(projectState.preDialogueAwarenessLine, 'awareness'))
  score += Math.max(0, scoreRuntimeProjectStateDetailCandidate(projectState.latestLandedProgress, 'landed')) / 2
  score += Math.max(0, scoreRuntimeProjectStateDetailCandidate(projectState.primaryOpenLoop, 'open')) / 2
  score += Math.max(0, scoreRuntimeProjectStateDetailCandidate(projectState.nextClosureTarget, 'next')) / 2

  if (shouldPreferRuntimeCompanionHeadline({
    awarenessLine: projectState.preDialogueAwarenessLine ?? null,
    companionHeadlineLine: projectState.companionHeadlineLine ?? null,
  })) {
    score += 6
  }

  if (
    carriesProjectIdentityAnchor(projectState.preDialogueAwarenessLine)
    && /what has already landed is|the still-open closure is|this reply should keep moving toward/u.test(
      normalizeProviderFacingProjectText(projectState.preDialogueAwarenessLine, 1600)?.toLowerCase() ?? '',
    )
  ) {
    score += 4
  }

  return score
}

function awarenessLineMissesRuntimeCarry(input: {
  awarenessLine: string | null | undefined
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
}) {
  const awarenessLine = normalizeProviderFacingProjectText(input.awarenessLine, 1600)
  if (!awarenessLine)
    return true
  if (isBlockedFixedTemplateEvidence(awarenessLine))
    return true

  const normalizedAwarenessLine = awarenessLine.toLowerCase()
  const alreadyCarriesPhase1ClosureSummary
    = /(?:^|\|\s*)phase=|runtime_personhood|project_state_review|continuity_line/u.test(normalizedAwarenessLine)
      && /landed|already survive|already landed|have landed farther|landed farther/u.test(normalizedAwarenessLine)
      && /still need|still needs|still-open|need to close|needs to close|unfinished closure/u.test(normalizedAwarenessLine)
      && /initiative|embodiment|memory|execution|closure/u.test(normalizedAwarenessLine)

  if (alreadyCarriesPhase1ClosureSummary)
    return false

  const latestLandedProgress = normalizeProviderFacingProjectText(input.latestLandedProgress, 1600)
  const primaryOpenLoop = normalizeProviderFacingProjectText(input.primaryOpenLoop, 1600)
  const nextClosureTarget = normalizeProviderFacingProjectText(input.nextClosureTarget, 1600)

  return Boolean(
    (latestLandedProgress && !awarenessLine.includes(latestLandedProgress))
    || (primaryOpenLoop && !awarenessLine.includes(primaryOpenLoop))
    || (nextClosureTarget && !awarenessLine.includes(nextClosureTarget)),
  )
}

function scoreProjectContinuitySummary(value: unknown) {
  const normalized = normalizeProviderFacingProjectText(value, 4000)?.toLowerCase() ?? ''
  if (!normalized)
    return Number.NEGATIVE_INFINITY
  if (isBlockedFixedTemplateEvidence(normalized))
    return Number.NEGATIVE_INFINITY

  let score = normalized.length >= 320 ? 2 : normalized.length >= 180 ? 1 : 0
  for (const marker of ['project_preflight=', 'landed=', 'open=', 'next=', 'drift_risk=', 'phase=', 'preflight=', 'unresolved=', 'project=']) {
    if (normalized.includes(marker))
      score += 2
  }
  for (const marker of ['open-focus=', 'next-focus=', 'open_focus=', 'next_focus=']) {
    if (normalized.includes(marker))
      score += 2
  }
  if (
    /memory, initiative, and embodiment/u.test(normalized)
    && /continuity_line|open_loop|runtime_loop_validation/u.test(normalized)
  ) {
    score += 3
  }
  if (normalized.includes('same digital life | keep the closure seam explicit'))
    score -= 3
  if (normalized.includes('keep the same digital life project in view'))
    score -= 3

  return score
}

function preferProjectAwarenessSummary(input: {
  awarenessLine?: unknown
  summaryCandidates?: Array<unknown>
  fallbackSummary?: unknown
  latestLandedProgress?: unknown
  primaryOpenLoop?: unknown
  nextClosureTarget?: unknown
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 4000
  const awarenessLine = normalizeProviderFacingProjectText(input.awarenessLine, maxChars)
  const preferredSummary = pickPreferredRuntimeProjectStateDetail([
    ...(input.summaryCandidates ?? []),
    input.fallbackSummary,
  ], 'awareness', maxChars)

  if (!preferredSummary)
    return awarenessLine

  if (!awarenessLine)
    return preferredSummary

  if (isThinProjectAwarenessAuthorityLine(preferredSummary))
    return awarenessLine

  if (projectAwarenessAuxiliaryFieldMissesRuntimeCarry({
    candidate: preferredSummary,
    latestLandedProgress: input.latestLandedProgress,
    primaryOpenLoop: input.primaryOpenLoop,
    nextClosureTarget: input.nextClosureTarget,
  })) {
    return awarenessLine
  }

  return scoreProjectContinuitySummary(preferredSummary) >= scoreProjectContinuitySummary(awarenessLine)
    ? preferredSummary
    : awarenessLine
}

function projectAwarenessAuxiliaryFieldMissesRuntimeCarry(input: {
  candidate?: unknown
  projectState?: Record<string, unknown> | null
  latestLandedProgress?: unknown
  primaryOpenLoop?: unknown
  nextClosureTarget?: unknown
}) {
  const candidate = normalizeProviderFacingProjectText(input.candidate, 1600)
  if (!candidate)
    return false

  const latestLandedProgress = input.latestLandedProgress
    ?? input.projectState?.latestLandedProgress
    ?? input.projectState?.latestProgress
  const primaryOpenLoop = input.primaryOpenLoop ?? input.projectState?.primaryOpenLoop
  const nextClosureTarget = input.nextClosureTarget ?? input.projectState?.nextClosureTarget

  if (
    !normalizeProviderFacingProjectText(latestLandedProgress, 1600)
    && !normalizeProviderFacingProjectText(primaryOpenLoop, 1600)
    && !normalizeProviderFacingProjectText(nextClosureTarget, 1600)
  ) {
    return false
  }

  const looksLikeProjectStateAwarenessField
    = /\b(?:identity|phase|visibility|landed|open|next|continuity_anchor|continuity_hold|status)=/u.test(candidate)
      || carriesExplicitProjectClosureTriplet(candidate)
  if (!looksLikeProjectStateAwarenessField)
    return false

  return awarenessLineMissesRuntimeCarry({
    awarenessLine: candidate,
    latestLandedProgress: normalizeProviderFacingProjectText(latestLandedProgress, 1600),
    primaryOpenLoop: normalizeProviderFacingProjectText(primaryOpenLoop, 1600),
    nextClosureTarget: normalizeProviderFacingProjectText(nextClosureTarget, 1600),
  })
}

function preferProjectAwarenessAuxiliaryLine(input: {
  awarenessLine?: unknown
  candidate?: unknown
  projectState?: Record<string, unknown> | null
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 1600
  const awarenessLine = normalizeProviderFacingProjectText(input.awarenessLine, maxChars)
  const candidate = normalizeProviderFacingProjectText(input.candidate, maxChars)
  if (!candidate)
    return awarenessLine
  if (!awarenessLine)
    return candidate

  return projectAwarenessAuxiliaryFieldMissesRuntimeCarry({
    candidate,
    projectState: input.projectState,
  })
    ? awarenessLine
    : candidate
}

function appendMissingContinuitySummaryMarkers(input: {
  preferredSummary: unknown
  sourceSummary: unknown
  markers: string[]
  maxChars?: number
}) {
  const preferredSummary = normalizeProviderFacingProjectText(input.preferredSummary, input.maxChars ?? 4000)
  const sourceSummary = normalizeProviderFacingProjectText(input.sourceSummary, input.maxChars ?? 4000)
  if (!preferredSummary || !sourceSummary)
    return preferredSummary

  let mergedSummary = preferredSummary
  for (const marker of input.markers) {
    if (readContinuitySummaryMarker(mergedSummary, [marker], input.maxChars ?? 4000))
      continue
    const sourceValue = readContinuitySummaryMarker(sourceSummary, [marker], input.maxChars ?? 4000)
    if (!sourceValue)
      continue
    mergedSummary = normalizeProviderFacingProjectText(`${mergedSummary} | ${marker}=${sourceValue}`, input.maxChars ?? 4000)
      ?? mergedSummary
  }

  return mergedSummary
}

function preferIncomingDialogueSessionMirror<T extends {
  continuityArcSummary?: unknown
  continuityProjectSummary?: unknown
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

  const preferredArc = scoreProjectContinuitySummary(incoming.continuityArcSummary) >= scoreProjectContinuitySummary(generated.continuityArcSummary)
    ? normalizeProviderFacingProjectText(incoming.continuityArcSummary, 4000) ?? normalizeProviderFacingProjectText(generated.continuityArcSummary, 4000)
    : normalizeProviderFacingProjectText(generated.continuityArcSummary, 4000) ?? normalizeProviderFacingProjectText(incoming.continuityArcSummary, 4000)
  const preservedArc = appendMissingContinuitySummaryMarkers({
    preferredSummary: preferredArc,
    sourceSummary: incoming.continuityArcSummary,
    markers: [
      'stage',
      'loop',
      'handoff',
      'thread',
      'carry',
      'defer',
      'why_now',
      'drift_risk',
      'same_her',
      'project_preflight',
      'open-focus',
      'next-focus',
    ],
    maxChars: 4000,
  })
  const preferredProjectSummary = scoreProjectContinuitySummary(incoming.continuityProjectSummary) >= scoreProjectContinuitySummary(generated.continuityProjectSummary)
    ? normalizeProviderFacingProjectText(incoming.continuityProjectSummary, 4000) ?? normalizeProviderFacingProjectText(generated.continuityProjectSummary, 4000)
    : normalizeProviderFacingProjectText(generated.continuityProjectSummary, 4000) ?? normalizeProviderFacingProjectText(incoming.continuityProjectSummary, 4000)

  return {
    ...generated,
    ...incoming,
    continuityArcSummary: preservedArc,
    continuityProjectSummary: preferredProjectSummary,
  } as T
}

function readContinuitySummaryMarker(
  value: unknown,
  markers: string[],
  maxChars = 1600,
) {
  const summary = normalizeProviderFacingProjectText(value, 4000)
  if (!summary)
    return null

  for (const marker of markers) {
    const match = new RegExp(`(?:^|\\|\\s*)${marker}=([^|]+)`, 'iu').exec(summary)
    const resolved = normalizeProviderFacingProjectText(match?.[1], maxChars)
    if (resolved)
      return resolved
  }

  return null
}

function readProjectStateFallbackFromSessionMirror(
  mirror: AlicizationDialogueSessionMirror | null | undefined,
): SessionMirrorProjectStateFallback {
  const brief = resolveAlicizationProjectStateBrief()
  const continuityArcSummary = normalizeProviderFacingProjectText(mirror?.continuityArcSummary, 4000)
  const continuityProjectSummary = normalizeProviderFacingProjectText(mirror?.continuityProjectSummary, 4000)
  const preflightSummary
    = readContinuitySummaryMarker(continuityArcSummary, ['preflight_summary', 'awareness_summary', 'project_preflight'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['preflight_summary', 'awareness_summary', 'project_preflight', 'preflight'], 1600)
  const currentPhase
    = readContinuitySummaryMarker(continuityProjectSummary, ['phase'], 1600)
      ?? readContinuitySummaryMarker(continuityArcSummary, ['phase'], 1600)
  const latestLandedProgress
    = readContinuitySummaryMarker(continuityArcSummary, ['landed'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['landed'], 1600)
  const primaryOpenLoop
    = readContinuitySummaryMarker(continuityArcSummary, ['open'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['open', 'unresolved'], 1600)
  const nextClosureTarget
    = readContinuitySummaryMarker(continuityArcSummary, ['next'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['next'], 1600)
  const sameHerSelfLine
    = readContinuitySummaryMarker(continuityArcSummary, ['continuity_anchor', 'same_her', 'same-her'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['continuity_anchor', 'same_her', 'same-her'], 1600)
  const sameHerDriftRisk
    = readContinuitySummaryMarker(continuityArcSummary, ['continuity_drift_risk', 'drift_risk', 'same_her_drift_risk'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['continuity_drift_risk', 'drift_risk', 'same_her_drift_risk'], 1600)
  const rebuiltPreDialogueAwarenessLine = (
    latestLandedProgress
    && primaryOpenLoop
    && nextClosureTarget
  )
    ? (
        preflightSummary
        && !carriesExplicitProjectClosureTriplet(preflightSummary)
        && !isThinProjectAwarenessAuthorityLine(preflightSummary)
        && !isCompactProjectStatePreflightSummary(preflightSummary)
      )
        ? normalizeProviderFacingProjectText(formatAlicizationProjectStateAwarenessFields({
            identity: brief.identity,
            currentPhase: currentPhase ?? brief.currentPhase,
            latestLandedProgress,
            primaryOpenLoop,
            nextClosureTarget,
            sameHerSelfLine,
            summary: preflightSummary,
            maxChars: 1600,
          }), 1600)
        : normalizeProviderFacingProjectText(formatAlicizationProjectStateAwarenessFields({
            identity: brief.identity,
            currentPhase: currentPhase ?? brief.currentPhase,
            latestLandedProgress,
            primaryOpenLoop,
            nextClosureTarget,
            sameHerSelfLine,
            maxChars: 1600,
          }), 1600)
    : preflightSummary

  return {
    identity: brief.identity,
    currentPhase: currentPhase ?? brief.currentPhase,
    preflightSummary: preflightSummary ?? brief.preflightSummary ?? null,
    preDialogueAwarenessLine: rebuiltPreDialogueAwarenessLine ?? brief.preDialogueAwarenessLine ?? null,
    preDialogueAwarenessSummary: rebuiltPreDialogueAwarenessLine ?? brief.preDialogueAwarenessLine ?? null,
    awarenessLine: rebuiltPreDialogueAwarenessLine ?? brief.preDialogueAwarenessLine ?? null,
    latestLandedProgress: latestLandedProgress ?? brief.continuityProgressSummary ?? brief.latestProgress ?? null,
    primaryOpenLoop: primaryOpenLoop ?? brief.primaryOpenLoop ?? null,
    openFocusSummary:
      readContinuitySummaryMarker(continuityArcSummary, ['open-focus', 'open_focus'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['open-focus', 'open_focus'], 1600),
    nextClosureTarget: nextClosureTarget ?? brief.nextClosureTarget,
    nextFocusSummary:
      readContinuitySummaryMarker(continuityArcSummary, ['next-focus', 'next_focus'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['next-focus', 'next_focus'], 1600),
    sameHerSelfLine: sameHerSelfLine ?? brief.sameHerSelfLine,
    sameHerDriftRisk: sameHerDriftRisk ?? null,
    sameHerHoldDetail:
      readContinuitySummaryMarker(continuityArcSummary, ['same_her_hold', 'same-her-hold', 'hold'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['same_her_hold', 'same-her-hold', 'hold'], 1600),
    emotionalClosureSummary:
      readContinuitySummaryMarker(continuityArcSummary, ['emotional_closure_summary', 'emotional-closure-summary'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['emotional_closure_summary', 'emotional-closure-summary'], 1600),
    continuityRestraint:
      normalizeProviderFacingContinuityRestraint(
        readContinuitySummaryMarker(continuityArcSummary, ['continuity_restraint', 'continuity-restraint', 'restraint'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['continuity_restraint', 'continuity-restraint', 'restraint'], 64),
      ),
    continuityArcStage:
      readContinuitySummaryMarker(continuityArcSummary, ['continuity_arc_stage', 'arc_stage'], 120)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['continuity_arc_stage', 'arc_stage'], 120),
    continuityCue:
      readContinuitySummaryMarker(continuityArcSummary, ['continuity_cue', 'cue'], 1600)
      ?? readContinuitySummaryMarker(continuityProjectSummary, ['continuity_cue', 'cue'], 1600),
    continuityPreferredTiming:
      normalizeProviderFacingContinuityPreferredTiming(
        readContinuitySummaryMarker(continuityArcSummary, ['timing'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['timing'], 64),
      ),
    continuityCadence:
      normalizeProviderFacingProjectText(
        readContinuitySummaryMarker(continuityArcSummary, ['cadence'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['cadence'], 64),
        64,
      ),
    preferredBlinkCadence:
      normalizeProviderFacingBlinkCadence(
        readContinuitySummaryMarker(continuityArcSummary, ['blink'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['blink'], 64),
      ),
    preferredGazeMode:
      normalizeProviderFacingGazeMode(
        readContinuitySummaryMarker(continuityArcSummary, ['gaze'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['gaze'], 64),
      ),
    preferredPauseMode:
      normalizeProviderFacingPauseMode(
        readContinuitySummaryMarker(continuityArcSummary, ['pause'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['pause'], 64),
      ),
    preferredLipsyncMode:
      normalizeProviderFacingLipsyncMode(
        readContinuitySummaryMarker(continuityArcSummary, ['lipsync'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['lipsync'], 64),
      ),
    preferredVoiceMode:
      normalizeProviderFacingVoiceMode(
        readContinuitySummaryMarker(continuityArcSummary, ['voice'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['voice'], 64),
      ),
    preferredPacingMode:
      normalizeProviderFacingPacingMode(
        readContinuitySummaryMarker(continuityArcSummary, ['pacing'], 64)
        ?? readContinuitySummaryMarker(continuityProjectSummary, ['pacing'], 64),
      ),
  }
}

function buildProviderFacingProjectAwarenessLine(input: {
  identity: string
  currentPhase: string
  sameHerSelfLine?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
}) {
  const canonicalProjectStateBrief = resolveAlicizationProjectStateBrief()
  const canonicalProjectIdentity = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.identity,
    1600,
  )
  const preferredIdentity = canonicalProjectIdentity
    && /same local-first digital life project|not a new shell|not a fresh shell|detached callback worker|rebuilt each turn|rebuilt for this turn/iu.test(input.identity)
    ? canonicalProjectIdentity
    : input.identity
  const canonicalSameHerSelfLine = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.sameHerSelfLine,
    1600,
  )
  const canonicalLatestLandedProgress = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.latestProgress ?? canonicalProjectStateBrief.continuityProgressSummary,
    1600,
  )
  const canonicalPrimaryOpenLoop = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.primaryOpenLoop ?? canonicalProjectStateBrief.openLoops[0],
    1600,
  )
  const canonicalNextClosureTarget = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.nextClosureTarget,
    1600,
  )
  const runtimeCarriesSpecificProjectClosure
    = Boolean(
      normalizeProviderFacingProjectText(input.latestLandedProgress, 1600)
      && canonicalLatestLandedProgress
      && normalizeProviderFacingProjectText(input.latestLandedProgress, 1600) !== canonicalLatestLandedProgress,
    )
    || Boolean(
      normalizeProviderFacingProjectText(input.primaryOpenLoop, 1600)
      && canonicalPrimaryOpenLoop
      && normalizeProviderFacingProjectText(input.primaryOpenLoop, 1600) !== canonicalPrimaryOpenLoop,
    )
    || Boolean(
      normalizeProviderFacingProjectText(input.nextClosureTarget, 1600)
      && canonicalNextClosureTarget
      && normalizeProviderFacingProjectText(input.nextClosureTarget, 1600) !== canonicalNextClosureTarget,
    )
  const preferredSameHerSelfLine = (
    canonicalSameHerSelfLine
    && preferredIdentity === canonicalProjectIdentity
    && !runtimeCarriesSpecificProjectClosure
    && !/callback return|same thread/iu.test(input.sameHerSelfLine ?? '')
    && (
      !normalizeProviderFacingProjectText(input.sameHerSelfLine, 1600)
      || /one same her must stay explicit|same project-aware self|same unfinished phase 1 digital-life line/iu.test(input.sameHerSelfLine ?? '')
    )
  )
    ? canonicalSameHerSelfLine
    : normalizeProviderFacingProjectText(input.sameHerSelfLine, 1600) ?? ''
  const preferredLatestLandedProgress = normalizeProviderFacingProjectText(
    input.latestLandedProgress
      ? compactProjectLatestProgressForSystemBlock(input.latestLandedProgress, 360)
      : null,
    800,
  )
  const preferredPrimaryOpenLoop = normalizeProviderFacingProjectText(input.primaryOpenLoop, 1600)
  const preferredNextClosureTarget = normalizeProviderFacingProjectText(input.nextClosureTarget, 1600)

  if (
    canonicalProjectIdentity
    && preferredIdentity === canonicalProjectIdentity
    && canonicalSameHerSelfLine
    && preferredSameHerSelfLine === canonicalSameHerSelfLine
    && preferredLatestLandedProgress === canonicalLatestLandedProgress
    && preferredPrimaryOpenLoop === canonicalPrimaryOpenLoop
    && preferredNextClosureTarget === canonicalNextClosureTarget
  ) {
    return normalizeProviderFacingProjectText(
      canonicalProjectStateBrief.preDialogueAwarenessLine,
      4000,
    )
  }

  return normalizeProviderFacingProjectText(formatAlicizationProjectStateAwarenessFields({
    identity: preferredIdentity,
    currentPhase: input.currentPhase,
    latestLandedProgress: preferredLatestLandedProgress,
    primaryOpenLoop: preferredPrimaryOpenLoop,
    nextClosureTarget: preferredNextClosureTarget,
    sameHerSelfLine: preferredSameHerSelfLine,
    maxChars: 1600,
  }), 1600)
}

function readRuntimeProjectStateFromSurface(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']> {
  const brief = resolveAlicizationProjectStateBrief()
  const consciousProjectState = surface?.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
  const dialogueRuntimeDigestProjectState = surface?.dialogue?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const sessionMirrorProjectState = readProjectStateFallbackFromSessionMirror(
    surface?.dialogue?.sessionMirror ?? null,
  )
  const runtimeDigestProjectState = surface?.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const runtimeStateProjectState = surface?.raw?.runtime?.projectState as Record<string, unknown> | null | undefined
  const cognitionProjectState = surface?.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const consciousSummaryAliasProjectState = consciousProjectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null | undefined
  const dialogueRuntimeDigestSummaryAliasProjectState = dialogueRuntimeDigestProjectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null | undefined
  const runtimeDigestSummaryAliasProjectState = runtimeDigestProjectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null | undefined
  const runtimeStateSummaryAliasProjectState = runtimeStateProjectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null | undefined
  const cognitionSummaryAliasProjectState = cognitionProjectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null | undefined
  const mergedProjectState = {
    ...runtimeDigestProjectState,
    ...runtimeStateProjectState,
    ...cognitionProjectState,
    ...dialogueRuntimeDigestProjectState,
    ...consciousProjectState,
  }

  const identity = pickPreferredRuntimeProjectStateDetail([
    consciousProjectState?.identity,
    dialogueRuntimeDigestProjectState?.identity,
    runtimeStateProjectState?.identity,
    cognitionProjectState?.identity,
    runtimeDigestProjectState?.identity,
    mergedProjectState.identity,
    brief.identity,
  ], 'identity', 1600)
  ?? brief.identity
  const projectStateDetailMaxChars = 12000
  const consciousLatestLandedProgress = normalizeProviderFacingProjectText(
    consciousProjectState?.latestLandedProgress ?? consciousProjectState?.latestProgress,
    projectStateDetailMaxChars,
  )
  const consciousPrimaryOpenLoop = normalizeProviderFacingProjectText(
    consciousProjectState?.primaryOpenLoop,
    projectStateDetailMaxChars,
  )
  const consciousNextClosureTarget = normalizeProviderFacingProjectText(
    consciousProjectState?.nextClosureTarget,
    projectStateDetailMaxChars,
  )
  const consciousLatestLandedProgressLooksTruncated = isTruncatedRuntimeProjectStateDetailPrefix({
    current: consciousLatestLandedProgress,
    candidates: [
      dialogueRuntimeDigestProjectState?.latestLandedProgress,
      dialogueRuntimeDigestProjectState?.latestProgress,
      dialogueRuntimeDigestSummaryAliasProjectState?.landedProgressSummary,
      runtimeStateProjectState?.latestLandedProgress,
      runtimeStateProjectState?.latestProgress,
      runtimeStateSummaryAliasProjectState?.landedProgressSummary,
      cognitionProjectState?.latestLandedProgress,
      cognitionProjectState?.latestProgress,
      cognitionSummaryAliasProjectState?.landedProgressSummary,
      runtimeDigestProjectState?.latestLandedProgress,
      runtimeDigestProjectState?.latestProgress,
      runtimeDigestSummaryAliasProjectState?.landedProgressSummary,
      mergedProjectState.latestLandedProgress,
      mergedProjectState.latestProgress,
      consciousSummaryAliasProjectState?.landedProgressSummary,
      brief.latestProgress,
      brief.continuityProgressSummary,
    ],
  })
  const consciousPrimaryOpenLoopLooksTruncated = isTruncatedRuntimeProjectStateDetailPrefix({
    current: consciousPrimaryOpenLoop,
    candidates: [
      dialogueRuntimeDigestProjectState?.primaryOpenLoop,
      dialogueRuntimeDigestSummaryAliasProjectState?.openClosureSummary,
      runtimeStateProjectState?.primaryOpenLoop,
      runtimeStateSummaryAliasProjectState?.openClosureSummary,
      cognitionProjectState?.primaryOpenLoop,
      cognitionSummaryAliasProjectState?.openClosureSummary,
      runtimeDigestProjectState?.primaryOpenLoop,
      runtimeDigestSummaryAliasProjectState?.openClosureSummary,
      mergedProjectState.primaryOpenLoop,
      consciousSummaryAliasProjectState?.openClosureSummary,
      brief.primaryOpenLoop,
      brief.openLoops?.[0] ?? null,
    ],
  })
  const consciousNextClosureTargetLooksTruncated = isTruncatedRuntimeProjectStateDetailPrefix({
    current: consciousNextClosureTarget,
    candidates: [
      dialogueRuntimeDigestProjectState?.nextClosureTarget,
      dialogueRuntimeDigestSummaryAliasProjectState?.nextClosureTargetSummary,
      runtimeStateProjectState?.nextClosureTarget,
      runtimeStateSummaryAliasProjectState?.nextClosureTargetSummary,
      cognitionProjectState?.nextClosureTarget,
      cognitionSummaryAliasProjectState?.nextClosureTargetSummary,
      runtimeDigestProjectState?.nextClosureTarget,
      runtimeDigestSummaryAliasProjectState?.nextClosureTargetSummary,
      mergedProjectState.nextClosureTarget,
      consciousSummaryAliasProjectState?.nextClosureTargetSummary,
      brief.nextClosureTarget,
    ],
  })
  const currentPhase = pickPreferredRuntimeProjectPhase([
    consciousProjectState?.currentPhase,
    dialogueRuntimeDigestProjectState?.currentPhase,
    runtimeStateProjectState?.currentPhase,
    cognitionProjectState?.currentPhase,
    runtimeDigestProjectState?.currentPhase,
    mergedProjectState.currentPhase,
  ], 1600)
  ?? pickPreferredRuntimeProjectPhase([
    sessionMirrorProjectState.currentPhase,
  ], 1600)
  ?? brief.currentPhase
  const latestLandedProgress = (
    consciousLatestLandedProgress
    && !consciousLatestLandedProgressLooksTruncated
    && !looksLikeThinRuntimeProjectStateDetail(consciousLatestLandedProgress, 'landed')
  )
    ? consciousLatestLandedProgress
    : pickPreferredRuntimeProjectStateDetail([
      dialogueRuntimeDigestProjectState?.latestLandedProgress,
      dialogueRuntimeDigestProjectState?.latestProgress,
      dialogueRuntimeDigestSummaryAliasProjectState?.landedProgressSummary,
      runtimeStateProjectState?.latestLandedProgress,
      runtimeStateProjectState?.latestProgress,
      runtimeStateSummaryAliasProjectState?.landedProgressSummary,
      cognitionProjectState?.latestLandedProgress,
      cognitionProjectState?.latestProgress,
      cognitionSummaryAliasProjectState?.landedProgressSummary,
      runtimeDigestProjectState?.latestLandedProgress,
      runtimeDigestProjectState?.latestProgress,
      runtimeDigestSummaryAliasProjectState?.landedProgressSummary,
      mergedProjectState.latestLandedProgress,
      mergedProjectState.latestProgress,
      consciousSummaryAliasProjectState?.landedProgressSummary,
    ], 'landed', projectStateDetailMaxChars)
    ?? pickPreferredRuntimeProjectStateDetail([
      sessionMirrorProjectState.latestLandedProgress,
    ], 'landed', projectStateDetailMaxChars)
    ?? consciousLatestLandedProgress
    ?? brief.latestProgress
    ?? brief.continuityProgressSummary
    ?? null
  const primaryOpenLoop = (
    consciousPrimaryOpenLoop
    && !consciousPrimaryOpenLoopLooksTruncated
    && !looksLikeThinRuntimeProjectStateDetail(consciousPrimaryOpenLoop, 'open')
  )
    ? consciousPrimaryOpenLoop
    : pickPreferredRuntimeProjectStateDetail([
      dialogueRuntimeDigestProjectState?.primaryOpenLoop,
      dialogueRuntimeDigestSummaryAliasProjectState?.openClosureSummary,
      runtimeStateProjectState?.primaryOpenLoop,
      runtimeStateSummaryAliasProjectState?.openClosureSummary,
      cognitionProjectState?.primaryOpenLoop,
      cognitionSummaryAliasProjectState?.openClosureSummary,
      runtimeDigestProjectState?.primaryOpenLoop,
      runtimeDigestSummaryAliasProjectState?.openClosureSummary,
      mergedProjectState.primaryOpenLoop,
      consciousSummaryAliasProjectState?.openClosureSummary,
    ], 'open', projectStateDetailMaxChars)
    ?? pickPreferredRuntimeProjectStateDetail([
      sessionMirrorProjectState.primaryOpenLoop,
    ], 'open', projectStateDetailMaxChars)
    ?? consciousPrimaryOpenLoop
    ?? brief.primaryOpenLoop
    ?? brief.openLoops[0]
    ?? null
  const nextClosureTarget = (
    consciousNextClosureTarget
    && !consciousNextClosureTargetLooksTruncated
    && !looksLikeThinRuntimeProjectStateDetail(consciousNextClosureTarget, 'next')
  )
    ? consciousNextClosureTarget
    : pickPreferredRuntimeProjectStateDetail([
      dialogueRuntimeDigestProjectState?.nextClosureTarget,
      dialogueRuntimeDigestSummaryAliasProjectState?.nextClosureTargetSummary,
      runtimeStateProjectState?.nextClosureTarget,
      runtimeStateSummaryAliasProjectState?.nextClosureTargetSummary,
      cognitionProjectState?.nextClosureTarget,
      cognitionSummaryAliasProjectState?.nextClosureTargetSummary,
      runtimeDigestProjectState?.nextClosureTarget,
      runtimeDigestSummaryAliasProjectState?.nextClosureTargetSummary,
      mergedProjectState.nextClosureTarget,
      consciousSummaryAliasProjectState?.nextClosureTargetSummary,
    ], 'next', projectStateDetailMaxChars)
    ?? pickPreferredRuntimeProjectStateDetail([
      sessionMirrorProjectState.nextClosureTarget,
    ], 'next', projectStateDetailMaxChars)
    ?? consciousNextClosureTarget
    ?? brief.nextClosureTarget
  const canonicalSameHerSelfLine = normalizeProviderFacingProjectText(brief.sameHerSelfLine, 1600)
  const sameHerSelfLineCandidates = [
    consciousProjectState?.sameHerSelfLine,
    dialogueRuntimeDigestProjectState?.sameHerSelfLine,
    runtimeStateProjectState?.sameHerSelfLine,
    cognitionProjectState?.sameHerSelfLine,
    runtimeDigestProjectState?.sameHerSelfLine,
    mergedProjectState.sameHerSelfLine,
  ]
  const sameHerSelfLine = (() => {
    const preferredAnySameHerSelfLine = pickPreferredRuntimeProjectStateDetail(
      sameHerSelfLineCandidates,
      'same-her',
      1600,
    )
    if (
      preferredAnySameHerSelfLine
      && canonicalSameHerSelfLine
      && preferredAnySameHerSelfLine === canonicalSameHerSelfLine
    ) {
      const preferredRuntimeSpecificSameHerSelfLine = pickPreferredRuntimeProjectStateDetail(
        sameHerSelfLineCandidates.filter((candidate) => {
          const normalized = normalizeProviderFacingProjectText(candidate, 1600)
          return Boolean(
            normalized
            && normalized !== canonicalSameHerSelfLine
            && !looksLikeThinRuntimeProjectStateDetail(normalized, 'same-her'),
          )
        }),
        'same-her',
        1600,
      )
      if (preferredRuntimeSpecificSameHerSelfLine)
        return preferredRuntimeSpecificSameHerSelfLine
    }

    return preferredAnySameHerSelfLine
      ?? pickPreferredRuntimeProjectStateDetail([
        sessionMirrorProjectState.sameHerSelfLine,
      ], 'same-her', 1600)
      ?? brief.sameHerSelfLine
  })()
  const liveSameHerDriftRisk = pickPreferredRuntimeProjectStateDetail([
    consciousProjectState?.sameHerDriftRisk,
    consciousSummaryAliasProjectState?.sameHerDriftRiskSummary,
    dialogueRuntimeDigestProjectState?.sameHerDriftRisk,
    dialogueRuntimeDigestSummaryAliasProjectState?.sameHerDriftRiskSummary,
    runtimeStateProjectState?.sameHerDriftRisk,
    runtimeStateSummaryAliasProjectState?.sameHerDriftRiskSummary,
    cognitionProjectState?.sameHerDriftRisk,
    cognitionSummaryAliasProjectState?.sameHerDriftRiskSummary,
    runtimeDigestProjectState?.sameHerDriftRisk,
    runtimeDigestSummaryAliasProjectState?.sameHerDriftRiskSummary,
    mergedProjectState.sameHerDriftRisk,
  ], 'drift', 1600)
  const sameHerDriftRisk = preferStrongerSameHerDriftRisk({
    current: liveSameHerDriftRisk,
    candidate: sessionMirrorProjectState.sameHerDriftRisk,
    fallback: brief.sameHerDriftRisk,
  }) || brief.sameHerDriftRisk
  const canonicalSameHerHoldDetail = normalizeProviderFacingProjectText(brief.sameHerHoldDetail, 1600)
  const sameHerHoldDetailCandidates = [
    consciousProjectState?.sameHerHoldDetail,
    dialogueRuntimeDigestProjectState?.sameHerHoldDetail,
    runtimeStateProjectState?.sameHerHoldDetail,
    cognitionProjectState?.sameHerHoldDetail,
    runtimeDigestProjectState?.sameHerHoldDetail,
    mergedProjectState.sameHerHoldDetail,
    sessionMirrorProjectState.sameHerHoldDetail,
  ]
  const sameHerHoldDetail = (() => {
    const preferredAnySameHerHoldDetail = pickPreferredRuntimeProjectStateDetail(
      sameHerHoldDetailCandidates,
      'same-her',
      1600,
    )
    if (
      preferredAnySameHerHoldDetail
      && canonicalSameHerHoldDetail
      && preferredAnySameHerHoldDetail === canonicalSameHerHoldDetail
    ) {
      const preferredRuntimeSpecificSameHerHoldDetail = pickPreferredRuntimeProjectStateDetail(
        sameHerHoldDetailCandidates.filter((candidate) => {
          const normalized = normalizeProviderFacingProjectText(candidate, 1600)
          return Boolean(normalized && normalized !== canonicalSameHerHoldDetail)
        }),
        'same-her',
        1600,
      )
      if (
        preferredRuntimeSpecificSameHerHoldDetail
        && !looksLikeThinRuntimeProjectStateDetail(preferredRuntimeSpecificSameHerHoldDetail, 'same-her')
      ) {
        return preferredRuntimeSpecificSameHerHoldDetail
      }
    }

    return preferredAnySameHerHoldDetail ?? canonicalSameHerHoldDetail
  })()
  const continuityArcStage = normalizeProviderFacingProjectText(
    consciousProjectState?.continuityArcStage
    ?? dialogueRuntimeDigestProjectState?.continuityArcStage
    ?? runtimeStateProjectState?.continuityArcStage
    ?? cognitionProjectState?.continuityArcStage
    ?? runtimeDigestProjectState?.continuityArcStage
    ?? mergedProjectState.continuityArcStage
    ?? sessionMirrorProjectState.continuityArcStage,
    120,
  )
  const continuityCue = pickPreferredRuntimeProjectStateDetail([
    consciousProjectState?.continuityCue,
    dialogueRuntimeDigestProjectState?.continuityCue,
    runtimeStateProjectState?.continuityCue,
    cognitionProjectState?.continuityCue,
    runtimeDigestProjectState?.continuityCue,
    mergedProjectState.continuityCue,
    sessionMirrorProjectState.continuityCue,
  ], 'awareness', 1600)
  const continuityAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    sessionMirrorProjectState.preDialogueAwarenessLine,
    sessionMirrorProjectState.preflightSummary,
  ], 1600)
  const directCompanionHeadlineValues = [
    consciousProjectState?.companionHeadlineLine,
    dialogueRuntimeDigestProjectState?.companionHeadlineLine,
    runtimeStateProjectState?.companionHeadlineLine,
    cognitionProjectState?.companionHeadlineLine,
    runtimeDigestProjectState?.companionHeadlineLine,
  ]
  const directCompanionHeadlineSource = directCompanionHeadlineValues
    .map(value => normalizeProviderFacingProjectText(value, 1600))
    .find(value =>
      value
      && !isThinProjectAwarenessAuthorityLine(value)
      && !carriesExplicitProjectClosureTriplet(value)
      && !isCanonicalStructuredProjectAwareness(value),
    )
    ?? pickProjectAwarenessLineWithoutCompactSummaryShell(directCompanionHeadlineValues, 1600)
  const thinDirectCompanionHeadlineFallback = [
    consciousProjectState?.preDialogueAwarenessLine,
    consciousProjectState?.awarenessLine,
    dialogueRuntimeDigestProjectState?.preDialogueAwarenessLine,
    dialogueRuntimeDigestProjectState?.awarenessLine,
    runtimeStateProjectState?.preDialogueAwarenessLine,
    runtimeStateProjectState?.awarenessLine,
    cognitionProjectState?.preDialogueAwarenessLine,
    cognitionProjectState?.awarenessLine,
    runtimeDigestProjectState?.preDialogueAwarenessLine,
    runtimeDigestProjectState?.awarenessLine,
  ]
    .map(value => normalizeProviderFacingProjectText(value, 1600))
    .find(value =>
      value
      && value.startsWith('Before answering')
      && isThinProjectAwarenessAuthorityLine(value),
    )
    ?? null
  const directConsciousAwarenessValues = [
    consciousProjectState?.preDialogueAwarenessLine,
    consciousProjectState?.awarenessLine,
  ]
  const directConsciousAwarenessCandidate = directConsciousAwarenessValues
    .map(value => normalizeProviderFacingProjectText(value, 1600))
    .find(value =>
      value
      && !isThinProjectAwarenessAuthorityLine(value)
      && !isCanonicalStructuredProjectAwareness(value)
      && /callback return|same thread/u.test(value.toLowerCase()),
    )
    ?? pickProjectAwarenessLineWithoutCompactSummaryShell(directConsciousAwarenessValues, 1600)
  const directVisibleAwarenessValues = [
    directConsciousAwarenessCandidate,
    dialogueRuntimeDigestProjectState?.preDialogueAwarenessLine,
    dialogueRuntimeDigestProjectState?.awarenessLine,
    runtimeStateProjectState?.preDialogueAwarenessLine,
    runtimeStateProjectState?.awarenessLine,
    cognitionProjectState?.preDialogueAwarenessLine,
    cognitionProjectState?.awarenessLine,
    runtimeDigestProjectState?.preDialogueAwarenessLine,
    runtimeDigestProjectState?.awarenessLine,
  ]
  const directVisibleAwarenessCandidate = directVisibleAwarenessValues
    .map(value => normalizeProviderFacingProjectText(value, 1600))
    .find(value =>
      value
      && !isThinProjectAwarenessAuthorityLine(value)
      && !isCanonicalStructuredProjectAwareness(value)
      && /callback return|same thread/u.test(value.toLowerCase()),
    )
    ?? pickProjectAwarenessLineWithoutCompactSummaryShell(directVisibleAwarenessValues, 1600)
  const preferredDirectVisibleAwarenessCandidate = directConsciousAwarenessCandidate
    && shouldPreserveProjectAwarenessLineVerbatim(
      directConsciousAwarenessCandidate,
      directVisibleAwarenessCandidate,
    )
    ? directConsciousAwarenessCandidate
    : directVisibleAwarenessCandidate
  const directAwarenessCandidate = pickProjectAwarenessLineWithoutCompactSummaryShell([
    preferredDirectVisibleAwarenessCandidate,
    mergedProjectState.preDialogueAwarenessSummary,
    mergedProjectState.preflightSummary,
  ], 1600)
  const explicitCompanionHeadlineLine = directCompanionHeadlineSource
    && !isThinProjectAwarenessAuthorityLine(directCompanionHeadlineSource)
    ? directCompanionHeadlineSource
    : null
  const companionHeadlineLine = explicitCompanionHeadlineLine
    ?? continuityAwarenessLine
    ?? preferredDirectVisibleAwarenessCandidate
    ?? directAwarenessCandidate
  const directAwarenessLine = resolvePreferredPayloadAwarenessLine({
    awarenessLine: directAwarenessCandidate,
    headlineLine: companionHeadlineLine,
  })
  ?? directAwarenessCandidate
  ?? companionHeadlineLine
  const shouldPreferContinuityPreflightOverStructuredDirectAwareness = Boolean(
    continuityAwarenessLine
    && !containsAlicizationFixedTemplateResidue(continuityAwarenessLine)
    && !isLegacyProjectAwarenessTemplateShell(continuityAwarenessLine)
    && directAwarenessLine
    && !containsAlicizationFixedTemplateResidue(directAwarenessLine)
    && !isLegacyProjectAwarenessTemplateShell(directAwarenessLine)
    && awarenessCarriesBroaderProjectFrame(directAwarenessLine)
    && (
      !directAwarenessCandidate
      || !isLegacyProjectAwarenessTemplateShell(directAwarenessCandidate)
      || isThinProjectAwarenessAuthorityLine(directAwarenessCandidate)
      || isCompactProjectStatePreflightSummary(directAwarenessCandidate)
    ),
  )
  const preferredDirectAwarenessLine = directAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(directAwarenessLine)
    && !shouldPreferContinuityPreflightOverStructuredDirectAwareness
    ? directAwarenessLine
    : continuityAwarenessLine
  const canonicalAwarenessLine = normalizeProviderFacingProjectText(brief.preDialogueAwarenessLine, 1600)
  const explicitPreflightSummary = pickPreferredRuntimeProjectStateDetail([
    consciousProjectState?.preflightSummary,
    dialogueRuntimeDigestProjectState?.preflightSummary,
    runtimeStateProjectState?.preflightSummary,
    cognitionProjectState?.preflightSummary,
    runtimeDigestProjectState?.preflightSummary,
    mergedProjectState.preflightSummary,
    continuityAwarenessLine,
  ], 'awareness', 1600)
  const resolvedRuntimeAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: preferredDirectAwarenessLine,
      awarenessLine: preferredDirectAwarenessLine,
      preDialogueAwarenessSummary: pickPreferredRuntimeProjectStateDetail([
        consciousProjectState?.preDialogueAwarenessSummary,
        dialogueRuntimeDigestProjectState?.preDialogueAwarenessSummary,
        runtimeStateProjectState?.preDialogueAwarenessSummary,
        cognitionProjectState?.preDialogueAwarenessSummary,
        runtimeDigestProjectState?.preDialogueAwarenessSummary,
        mergedProjectState.preDialogueAwarenessSummary,
      ], 'awareness', 1600),
      companionHeadlineLine,
      companionBriefingLine: normalizeProviderFacingProjectText(
        mergedProjectState.companionBriefingLine,
        1600,
      ),
      preflightSummary: explicitPreflightSummary,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: canonicalAwarenessLine,
      awarenessLine: canonicalAwarenessLine,
      companionHeadlineLine: canonicalAwarenessLine,
      preflightSummary: explicitPreflightSummary ?? canonicalAwarenessLine,
    },
  })
  const verbatimRuntimeAwarenessLine = shouldPreserveProjectAwarenessLineVerbatim(
    preferredDirectAwarenessLine,
    resolvedRuntimeAwarenessLine,
  )
    ? preferredDirectAwarenessLine
    : null
  const anchoredRuntimeAwarenessLine = buildProviderFacingProjectAwarenessLine({
    identity,
    currentPhase,
    sameHerSelfLine,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
  })
  const effectiveRuntimeAwarenessLineCandidate = verbatimRuntimeAwarenessLine ?? resolvedRuntimeAwarenessLine
  const effectiveRuntimeAwarenessLine = looksLikeNarrowContinuityCadenceAwarenessLine(effectiveRuntimeAwarenessLineCandidate)
    ? anchoredRuntimeAwarenessLine ?? canonicalAwarenessLine
    : effectiveRuntimeAwarenessLineCandidate
  const providerSafeExplicitCompanionHeadlineLine = (() => {
    if (!explicitCompanionHeadlineLine)
      return null
    if (!isLegacyProjectAwarenessTemplateShell(explicitCompanionHeadlineLine))
      return explicitCompanionHeadlineLine

    return normalizeProviderFacingProjectText(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity,
        currentPhase,
        preDialogueAwarenessLine: effectiveRuntimeAwarenessLine,
        awarenessLine: effectiveRuntimeAwarenessLine,
        companionHeadlineLine: explicitCompanionHeadlineLine,
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
        sameHerSelfLine,
      },
      fallbackProjectState: {
        identity,
        currentPhase,
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
        sameHerSelfLine,
      },
    }), 1600) ?? anchoredRuntimeAwarenessLine ?? null
  })()
  const runtimeCompanionWouldOverNarrowAwareness = embodimentHeadlineWouldOverNarrowProjectAwareness({
    headlineLine: providerSafeExplicitCompanionHeadlineLine,
    awarenessLine: effectiveRuntimeAwarenessLine,
  })
  const preDialogueAwarenessLine = shouldPreferRuntimeCompanionHeadline({
    awarenessLine: effectiveRuntimeAwarenessLine,
    companionHeadlineLine: providerSafeExplicitCompanionHeadlineLine,
  })
  && !runtimeCompanionWouldOverNarrowAwareness
    ? providerSafeExplicitCompanionHeadlineLine
    : shouldPreferAnchoredRuntimeProjectAwarenessLine({
      awarenessLine: effectiveRuntimeAwarenessLine,
      anchoredAwarenessLine: anchoredRuntimeAwarenessLine,
      latestLandedProgress,
      primaryOpenLoop,
      nextClosureTarget,
    })
      ? anchoredRuntimeAwarenessLine
      : effectiveRuntimeAwarenessLine
        && (
          shouldPreserveProjectAwarenessLineVerbatim(
            effectiveRuntimeAwarenessLine,
            canonicalAwarenessLine,
          )
          || carriesProjectIdentityAnchor(effectiveRuntimeAwarenessLine)
          || !carriesProjectIdentityAnchor(canonicalAwarenessLine)
        )
        ? effectiveRuntimeAwarenessLine
        : canonicalAwarenessLine
  const canonicalPreflightSummary = normalizeProviderFacingProjectText(brief.preflightSummary, 1600)
  const explicitPreflightSummaryLooksLikeAwarenessLine = Boolean(
    explicitPreflightSummary?.startsWith('Before answering, remember:'),
  )
  const preflightSummary = (
    explicitPreflightSummary
    && !explicitPreflightSummaryLooksLikeAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(explicitPreflightSummary)
    && !isCompactProjectStatePreflightSummary(explicitPreflightSummary)
    && scoreProjectContinuitySummary(explicitPreflightSummary) >= scoreProjectContinuitySummary(canonicalPreflightSummary)
  )
    ? explicitPreflightSummary
    : scoreProjectContinuitySummary(sessionMirrorProjectState.preflightSummary) > scoreProjectContinuitySummary(canonicalPreflightSummary)
      ? sessionMirrorProjectState.preflightSummary
      ?? canonicalPreflightSummary
      ?? canonicalAwarenessLine
      : canonicalPreflightSummary
        ?? sessionMirrorProjectState.preflightSummary
        ?? canonicalAwarenessLine
  const companionBriefingLine = normalizeProviderFacingProjectText(
    mergedProjectState.companionBriefingLine,
    1600,
  ) ?? null
  const preDialogueAwarenessSummary = preferProjectAwarenessSummary({
    awarenessLine: preDialogueAwarenessLine,
    summaryCandidates: [
      consciousProjectState?.preDialogueAwarenessSummary,
      dialogueRuntimeDigestProjectState?.preDialogueAwarenessSummary,
      runtimeStateProjectState?.preDialogueAwarenessSummary,
      cognitionProjectState?.preDialogueAwarenessSummary,
      runtimeDigestProjectState?.preDialogueAwarenessSummary,
      mergedProjectState.preDialogueAwarenessSummary,
      sessionMirrorProjectState.preDialogueAwarenessSummary,
    ],
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    maxChars: 1600,
  })
  const providerSafeCompanionHeadlineLine = (() => {
    const candidate = providerSafeExplicitCompanionHeadlineLine
      ?? thinDirectCompanionHeadlineFallback
      ?? companionHeadlineLine
      ?? preDialogueAwarenessLine
    if (!candidate || isLegacyProjectAwarenessTemplateShell(candidate))
      return preDialogueAwarenessLine
    return preferProjectAwarenessAuxiliaryLine({
      awarenessLine: preDialogueAwarenessLine,
      candidate,
      projectState: {
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
      },
      maxChars: 1600,
    })
  })()
  const providerSafeSameHerSelfLine = (() => {
    const normalized = normalizeProviderFacingProjectText(sameHerSelfLine, 1600)
    if (!normalized || !isLegacyProjectAwarenessTemplateShell(normalized))
      return normalized ?? sameHerSelfLine

    return normalizeProviderFacingProjectText(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity,
        currentPhase,
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
        sameHerSelfLine: normalized,
      },
      fallbackProjectState: {
        identity,
        currentPhase,
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
      },
    }), 1600) ?? anchoredRuntimeAwarenessLine ?? normalized
  })()
  const emotionalClosureSummary = pickPreferredRuntimeProjectStateDetail([
    consciousProjectState?.emotionalClosureSummary,
    dialogueRuntimeDigestProjectState?.emotionalClosureSummary,
    runtimeStateProjectState?.emotionalClosureSummary,
    cognitionProjectState?.emotionalClosureSummary,
    runtimeDigestProjectState?.emotionalClosureSummary,
    mergedProjectState.emotionalClosureSummary,
  ], 'awareness', 1600)
  ?? pickPreferredRuntimeProjectStateDetail([
    sessionMirrorProjectState.emotionalClosureSummary,
  ], 'awareness', 1600)
  ?? normalizeProviderFacingProjectText(brief.emotionalClosureSummary, 1600)
  ?? null
  const continuityRestraint = pickPreferredContinuityRestraint([
    consciousProjectState?.continuityRestraint,
    dialogueRuntimeDigestProjectState?.continuityRestraint,
    runtimeStateProjectState?.continuityRestraint,
    cognitionProjectState?.continuityRestraint,
    runtimeDigestProjectState?.continuityRestraint,
    mergedProjectState.continuityRestraint,
    sessionMirrorProjectState.continuityRestraint,
    brief.continuityRestraint,
  ])

  return {
    identity,
    currentPhase,
    preflightSummary,
    preDialogueAwarenessLine,
    awarenessLine: preDialogueAwarenessLine,
    preDialogueAwarenessSummary: preDialogueAwarenessSummary ?? preDialogueAwarenessLine,
    companionHeadlineLine: providerSafeCompanionHeadlineLine,
    companionBriefingLine,
    latestLandedProgress,
    latestProgress: latestLandedProgress,
    landedProgressSummary: latestLandedProgress,
    primaryOpenLoop,
    openClosureSummary: primaryOpenLoop,
    nextClosureTarget,
    nextClosureTargetSummary: nextClosureTarget,
    sameHerSelfLine: providerSafeSameHerSelfLine,
    sameHerDriftRisk,
    sameHerDriftRiskSummary: sameHerDriftRisk,
    sameHerHoldDetail,
    emotionalClosureCue: normalizeProviderFacingProjectText(mergedProjectState.emotionalClosureCue, 1600),
    emotionalClosureSummary,
    continuityRestraint,
    continuityArcStage,
    continuityCue,
    continuityPreferredTiming: pickProviderFacingContinuityPreferredTiming([
      consciousProjectState?.continuityPreferredTiming,
      dialogueRuntimeDigestProjectState?.continuityPreferredTiming,
      runtimeStateProjectState?.continuityPreferredTiming,
      cognitionProjectState?.continuityPreferredTiming,
      runtimeDigestProjectState?.continuityPreferredTiming,
      mergedProjectState.continuityPreferredTiming,
      sessionMirrorProjectState.continuityPreferredTiming,
    ]),
    continuityCadence: pickProviderFacingContinuityCadence([
      consciousProjectState?.continuityCadence,
      dialogueRuntimeDigestProjectState?.continuityCadence,
      runtimeStateProjectState?.continuityCadence,
      cognitionProjectState?.continuityCadence,
      runtimeDigestProjectState?.continuityCadence,
      mergedProjectState.continuityCadence,
      sessionMirrorProjectState.continuityCadence,
    ]),
    preferredBlinkCadence: normalizeProviderFacingBlinkCadence(
      consciousProjectState?.preferredBlinkCadence
      ?? dialogueRuntimeDigestProjectState?.preferredBlinkCadence
      ?? runtimeStateProjectState?.preferredBlinkCadence
      ?? cognitionProjectState?.preferredBlinkCadence
      ?? runtimeDigestProjectState?.preferredBlinkCadence
      ?? mergedProjectState.preferredBlinkCadence,
    ) ?? normalizeProviderFacingBlinkCadence(
      sessionMirrorProjectState.preferredBlinkCadence,
    ),
    preferredGazeMode: normalizeProviderFacingGazeMode(
      consciousProjectState?.preferredGazeMode
      ?? dialogueRuntimeDigestProjectState?.preferredGazeMode
      ?? runtimeStateProjectState?.preferredGazeMode
      ?? cognitionProjectState?.preferredGazeMode
      ?? runtimeDigestProjectState?.preferredGazeMode
      ?? mergedProjectState.preferredGazeMode,
    ) ?? normalizeProviderFacingGazeMode(
      sessionMirrorProjectState.preferredGazeMode,
    ),
    preferredPauseMode: normalizeProviderFacingPauseMode(
      consciousProjectState?.preferredPauseMode
      ?? dialogueRuntimeDigestProjectState?.preferredPauseMode
      ?? runtimeStateProjectState?.preferredPauseMode
      ?? cognitionProjectState?.preferredPauseMode
      ?? runtimeDigestProjectState?.preferredPauseMode
      ?? mergedProjectState.preferredPauseMode,
    ) ?? normalizeProviderFacingPauseMode(
      sessionMirrorProjectState.preferredPauseMode,
    ),
    preferredLipsyncMode: normalizeProviderFacingLipsyncMode(
      consciousProjectState?.preferredLipsyncMode
      ?? dialogueRuntimeDigestProjectState?.preferredLipsyncMode
      ?? runtimeStateProjectState?.preferredLipsyncMode
      ?? cognitionProjectState?.preferredLipsyncMode
      ?? runtimeDigestProjectState?.preferredLipsyncMode
      ?? mergedProjectState.preferredLipsyncMode,
    ) ?? normalizeProviderFacingLipsyncMode(
      sessionMirrorProjectState.preferredLipsyncMode,
    ),
    preferredVoiceMode: normalizeProviderFacingVoiceMode(
      consciousProjectState?.preferredVoiceMode
      ?? dialogueRuntimeDigestProjectState?.preferredVoiceMode
      ?? runtimeStateProjectState?.preferredVoiceMode
      ?? cognitionProjectState?.preferredVoiceMode
      ?? runtimeDigestProjectState?.preferredVoiceMode
      ?? mergedProjectState.preferredVoiceMode,
    ) ?? normalizeProviderFacingVoiceMode(
      sessionMirrorProjectState.preferredVoiceMode,
    ),
    preferredPacingMode: normalizeProviderFacingPacingMode(
      consciousProjectState?.preferredPacingMode
      ?? dialogueRuntimeDigestProjectState?.preferredPacingMode
      ?? runtimeStateProjectState?.preferredPacingMode
      ?? cognitionProjectState?.preferredPacingMode
      ?? runtimeDigestProjectState?.preferredPacingMode
      ?? mergedProjectState.preferredPacingMode,
    ) ?? normalizeProviderFacingPacingMode(
      sessionMirrorProjectState.preferredPacingMode,
    ),
  }
}

function createDefaultProviderFacingMindTurnContract(input: {
  governance: AlicizationMindTurnGovernance | null
}): AlicizationMindTurnContractSnapshot {
  return {
    version: 'mind-turn-contract-v1',
    answerIntent: input.governance?.answerIntent ?? null,
    answerAct: input.governance?.answerAct ?? null,
    turnMode: input.governance?.turnMode ?? 'answer',
    responseMode: normalizeProviderFacingResponseMode(input.governance?.responseMode),
    evidenceMode: input.governance?.evidenceMode ?? null,
    openingStyle: input.governance?.openingStyle ?? 'direct-answer',
    expectedVisibleReplyAuthority: input.governance?.expectedVisibleReplyAuthority ?? 'llm-mind',
    replyRealizationMode: normalizeProviderFacingReplyRealizationMode(input.governance?.replyRealizationMode),
    personaKernelMode: input.governance?.personaKernelMode ?? 'full',
    activeClosenessContext: normalizeProviderFacingClosenessContext(input.governance?.activeClosenessContext),
    activeClosenessRung: normalizeProviderFacingClosenessRung(input.governance?.activeClosenessRung),
    relationshipPosture: normalizeProviderFacingRelationshipPosture(input.governance?.relationshipPosture),
    labelCarryAsMemory: input.governance?.labelCarryAsMemory ?? false,
    suppressAssociativeRecall: input.governance?.suppressAssociativeRecall ?? false,
    allowAffectionatePreface: input.governance?.allowAffectionatePreface ?? false,
    allowStageDirections: input.governance?.allowStageDirections ?? false,
    allowBodyNarration: input.governance?.allowBodyNarration ?? false,
    maxParagraphs: input.governance?.maxParagraphs ?? 2,
    maxSentences: input.governance?.maxSentences ?? 4,
    mustDo: [],
    mustNotDo: [],
    governingFocus: input.governance?.governingFocus ?? '',
    governingConcern: input.governance?.governingConcern ?? null,
    governingCommitment: input.governance?.governingCommitment ?? null,
    governingInquiry: input.governance?.governingInquiry ?? null,
    governingProject: input.governance?.governingProject ?? null,
    emotionalClosureCue: input.governance?.emotionalClosureCue ?? null,
    projectState: null,
    preDialogueClosure: null,
    reasons: input.governance?.reasons ?? [],
    updatedAt: Date.now(),
  }
}

function stripProjectStateContinuityTiming(
  surface: AlicizationDigitalLifeRuntimeSurface | null,
): AlicizationDigitalLifeRuntimeSurface | null {
  if (!surface)
    return surface

  const stripProjectState = (projectState: Record<string, unknown> | null | undefined) => {
    if (!projectState)
      return projectState

    const {
      continuityPreferredTiming: _continuityPreferredTiming,
      continuityCadence: _continuityCadence,
      preferredBlinkCadence: _preferredBlinkCadence,
      preferredGazeMode: _preferredGazeMode,
      preferredPauseMode: _preferredPauseMode,
      preferredLipsyncMode: _preferredLipsyncMode,
      preferredVoiceMode: _preferredVoiceMode,
      preferredPacingMode: _preferredPacingMode,
      ...rest
    } = projectState

    return rest
  }

  return {
    ...surface,
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: surface.dialogue.currentConsciousFrame
        ? {
            ...surface.dialogue.currentConsciousFrame,
            projectState: stripProjectState(
              surface.dialogue.currentConsciousFrame.projectState as Record<string, unknown> | null | undefined,
            ) as typeof surface.dialogue.currentConsciousFrame.projectState,
          }
        : surface.dialogue.currentConsciousFrame,
    },
    raw: {
      ...surface.raw,
      runtimeDigest: surface.raw?.runtimeDigest
        ? {
            ...surface.raw.runtimeDigest,
            projectState: stripProjectState(
              surface.raw.runtimeDigest.projectState as Record<string, unknown> | null | undefined,
            ) as typeof surface.raw.runtimeDigest.projectState,
          }
        : surface.raw?.runtimeDigest,
      runtime: surface.raw?.runtime
        ? {
            ...surface.raw.runtime,
            projectState: stripProjectState(
              surface.raw.runtime.projectState as Record<string, unknown> | null | undefined,
            ) as typeof surface.raw.runtime.projectState,
          }
        : surface.raw?.runtime,
    },
    cognition: {
      ...surface.cognition,
      runtimeDigest: surface.cognition.runtimeDigest
        ? {
            ...surface.cognition.runtimeDigest,
            projectState: stripProjectState(
              surface.cognition.runtimeDigest.projectState as Record<string, unknown> | null | undefined,
            ) as typeof surface.cognition.runtimeDigest.projectState,
          }
        : surface.cognition.runtimeDigest,
    },
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

  return {
    version: 'digital-life-runtime-surface-v1',
    raw: surface.raw ?? null,
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
      currentConsciousFrame: surface.dialogue?.currentConsciousFrame ?? null,
      claimEvidenceLedger: surface.dialogue?.claimEvidenceLedger ?? null,
      replyDeliberation: surface.dialogue?.replyDeliberation ?? null,
      answerPlanner: surface.dialogue?.answerPlanner ?? null,
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

function enrichExecutionProjectBriefingWithPersonMemoryCapsule(
  projectBriefing: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['projectBriefing'],
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['projectBriefing'] {
  const capsule = surface?.memory?.personMemoryCapsule ?? null
  if (!projectBriefing || !capsule)
    return projectBriefing

  const executionLine = normalizeProviderFacingProjectText([
    capsule.modules.execution.carrySummary ? `execution_capsule=${capsule.modules.execution.carrySummary}` : null,
    capsule.modules.execution.threadAnchor ? `thread=${capsule.modules.execution.threadAnchor}` : null,
    capsule.modules.learning.nextAction ? `learning=${capsule.modules.learning.nextAction}` : null,
    capsule.modules.learning.reason ? `reason=${capsule.modules.learning.reason}` : null,
  ].filter(Boolean).join(' | '), 320)
  const memoryLine = normalizeProviderFacingProjectText(capsule.modules.memory.selectedMemory, 220)
  if (!executionLine && !memoryLine)
    return projectBriefing

  return {
    ...projectBriefing,
    companionBriefingLine: normalizeProviderFacingProjectText([
      projectBriefing.companionBriefingLine,
      executionLine,
    ].filter(Boolean).join(' | '), 320) ?? projectBriefing.companionBriefingLine ?? null,
    continuityCue: normalizeProviderFacingProjectText([
      projectBriefing.continuityCue,
      memoryLine ? `memory_capsule=${memoryLine}` : null,
    ].filter(Boolean).join(' | '), 220) ?? projectBriefing.continuityCue ?? null,
  }
}

function seedPreparedRuntimeProjectAwareness(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  rawPayload: AlicizationChatStartPayload | null | undefined
  sessionMirror: AlicizationDialogueSessionMirror | null | undefined
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = ensurePreparedRuntimeSurfaceShape(input.surface)
  if (!surface?.dialogue?.currentConsciousFrame)
    return surface

  const currentProjectState = surface.dialogue.currentConsciousFrame.projectState as RuntimeSurfaceProjectState | null | undefined
  if (!currentProjectState)
    return surface
  const resolvedSurfaceProjectState = readRuntimeProjectStateFromSurface(surface) as ProviderFacingProjectState
  const currentProjectStateSummaryAlias = currentProjectState as {
    sameHerDriftRiskSummary?: unknown
  } | null | undefined

  const payloadProjectState = readProviderFacingPayloadProjectState(input.rawPayload)
  const mirrorProjectState = readProjectStateFallbackFromSessionMirror(input.sessionMirror)
  const directPayloadIdentity
    = (input.rawPayload as { preDialogueSendIdentity?: Record<string, unknown> | null } | null | undefined)?.preDialogueSendIdentity
      ?? null
  const directPayloadProjectState
    = (directPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)
      ?? null
  const directPayloadAwarenessLine
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.preDialogueAwarenessLine, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.awarenessLine, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.awarenessLine, 1600)
  const directPayloadAwarenessSummary
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.preDialogueAwarenessSummary, 1600)
  const directPayloadCompanionBriefingLine
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.companionBriefingLine, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.companionBriefingLine, 1600)
  const directPayloadCompanionHeadlineLine
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.companionHeadlineLine, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.companionHeadlineLine, 1600)
  const directPayloadSameHerSelfLine
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.sameHerSelfLine, 1600)
  const directPayloadSameHerHoldDetail
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.sameHerHoldDetail, 1600)
  const directPayloadSameHerDriftRisk
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.sameHerDriftRisk, 1600)
  const directPayloadPreflightSummary
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.preflightSummary, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.summaryLine, 1600)
  const directPayloadPreflightSummaryLooksThin = Boolean(
    directPayloadPreflightSummary
    && (
      isThinProjectAwarenessAuthorityLine(directPayloadPreflightSummary)
      || isCompactProjectStatePreflightSummary(directPayloadPreflightSummary)
    ),
  )
  const rawPayloadThinSummaryOnly = Boolean(
    directPayloadPreflightSummaryLooksThin
    && !directPayloadAwarenessLine
    && !directPayloadAwarenessSummary
    && !directPayloadCompanionBriefingLine
    && !directPayloadCompanionHeadlineLine
    && !directPayloadSameHerSelfLine
    && !directPayloadSameHerHoldDetail
    && !directPayloadSameHerDriftRisk,
  )
  const preferredPayloadAwarenessLine = resolvePreferredPayloadAwarenessLine({
    awarenessLine: payloadProjectState.explicitPayloadProjectAwarenessLine,
    headlineLine: payloadProjectState.explicitPayloadProjectHeadline,
  })
  const payloadHeadlineWouldOverNarrowPreferredAwareness = embodimentHeadlineWouldOverNarrowProjectAwareness({
    headlineLine: payloadProjectState.explicitPayloadProjectHeadline,
    awarenessLine: preferredPayloadAwarenessLine,
  })
  const preferredPayloadSeedAwarenessLine = (
    payloadProjectState.explicitPayloadProjectHeadline
    && !isThinProjectAwarenessAuthorityLine(payloadProjectState.explicitPayloadProjectHeadline)
    && !payloadHeadlineWouldOverNarrowPreferredAwareness
    && (
      shouldPreserveProjectAwarenessLineVerbatim(
        payloadProjectState.explicitPayloadProjectHeadline,
        preferredPayloadAwarenessLine,
      )
      || isStrongerSameHerProjectHeadline(
        payloadProjectState.explicitPayloadProjectHeadline,
        preferredPayloadAwarenessLine,
      )
      || (
        hasDistinctEmbodimentClosureCue(payloadProjectState.explicitPayloadProjectHeadline)
        && (
          !preferredPayloadAwarenessLine
          || isThinProjectAwarenessAuthorityLine(preferredPayloadAwarenessLine)
          || isCompactProjectStatePreflightSummary(preferredPayloadAwarenessLine)
          || !awarenessCarriesBroaderProjectFrame(preferredPayloadAwarenessLine)
        )
      )
    )
  )
    ? payloadProjectState.explicitPayloadProjectHeadline
    : preferredPayloadAwarenessLine
  const directSurfaceAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    currentProjectState.preDialogueAwarenessLine,
    currentProjectState.awarenessLine,
    currentProjectState.preDialogueAwarenessSummary,
    (surface.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessLine,
    (surface.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.awarenessLine,
    (surface.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessSummary,
    (surface.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessLine,
    (surface.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.awarenessLine,
    (surface.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessSummary,
  ], 1600)
  const directDialogueAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    currentProjectState.preDialogueAwarenessLine,
    currentProjectState.awarenessLine,
    currentProjectState.preDialogueAwarenessSummary,
  ], 1600)
  const broaderCurrentAwarenessCandidate = pickProjectAwarenessLineWithoutCompactSummaryShell([
    currentProjectState.preDialogueAwarenessLine,
    currentProjectState.awarenessLine,
    currentProjectState.preDialogueAwarenessSummary,
    (surface.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessLine,
    (surface.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.awarenessLine,
    (surface.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessSummary,
    (surface.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessLine,
    (surface.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.awarenessLine,
    (surface.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessSummary,
    currentProjectState.preflightSummary,
    resolvedSurfaceProjectState.preDialogueAwarenessLine,
    resolvedSurfaceProjectState.awarenessLine,
    resolvedSurfaceProjectState.preDialogueAwarenessSummary,
    resolvedSurfaceProjectState.preflightSummary,
    mirrorProjectState.preDialogueAwarenessLine,
    mirrorProjectState.preflightSummary,
  ], 1600)
  const currentAwarenessCandidate = (
    directDialogueAwarenessLine
    && shouldPreserveProjectAwarenessLineVerbatim(
      directDialogueAwarenessLine,
      directSurfaceAwarenessLine ?? broaderCurrentAwarenessCandidate,
    )
  )
    ? directDialogueAwarenessLine
    : (
        directSurfaceAwarenessLine
        && shouldPreserveProjectAwarenessLineVerbatim(
          directSurfaceAwarenessLine,
          broaderCurrentAwarenessCandidate,
        )
      )
        ? directSurfaceAwarenessLine
        : broaderCurrentAwarenessCandidate
  const shouldPreferDirectPayloadAwarenessSeed = Boolean(
    payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && preferredPayloadSeedAwarenessLine
    && (
      !currentAwarenessCandidate
      || isThinProjectAwarenessAuthorityLine(currentAwarenessCandidate)
      || isCompactProjectStatePreflightSummary(currentAwarenessCandidate)
      || isPhase1ProjectStatePreflightAwarenessLine(currentAwarenessCandidate)
      || shouldPreserveProjectAwarenessLineVerbatim(
        preferredPayloadSeedAwarenessLine,
        currentAwarenessCandidate,
      )
      || isStrongerSameHerProjectHeadline(
        preferredPayloadSeedAwarenessLine,
        currentAwarenessCandidate,
      )
    ),
  )
  const preferredAwarenessSeedCandidate = pickProjectAwarenessLineWithoutCompactSummaryShell([
    preferredPayloadSeedAwarenessLine,
    currentAwarenessCandidate,
    mirrorProjectState.preDialogueAwarenessLine,
    mirrorProjectState.preflightSummary,
  ], 1600)
  const preferredAwarenessHeadlineCandidate = pickStrongerProjectAwarenessLine([
    payloadProjectState.explicitPayloadProjectHeadline,
    currentProjectState.companionHeadlineLine,
    resolvedSurfaceProjectState.companionHeadlineLine,
  ], 1600)
  const shouldKeepBroaderAwarenessSeedOverHeadline = Boolean(
    payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && (
      payloadProjectState.explicitPayloadProjectHeadline
      || preferredPayloadSeedAwarenessLine
    )
    && preferredAwarenessSeedCandidate
    && preferredAwarenessHeadlineCandidate
    && embodimentHeadlineWouldOverNarrowProjectAwareness({
      headlineLine: preferredAwarenessHeadlineCandidate,
      awarenessLine: preferredAwarenessSeedCandidate,
    }),
  )
  const preferredAwarenessLine = shouldPreferDirectPayloadAwarenessSeed
    ? preferredPayloadSeedAwarenessLine
    : shouldKeepBroaderAwarenessSeedOverHeadline
      ? preferredAwarenessSeedCandidate
      : resolvePreferredPayloadAwarenessLine({
        awarenessLine: preferredAwarenessSeedCandidate,
        headlineLine: preferredAwarenessHeadlineCandidate,
      })
      ?? preferredAwarenessSeedCandidate
  const preferredPreflightSummary = pickStrongerProjectAwarenessLine([
    payloadProjectState.explicitPayloadProjectPreflightSummary,
    preferredPayloadSeedAwarenessLine,
    currentProjectState.preflightSummary,
    currentProjectState.preDialogueAwarenessLine,
    currentProjectState.awarenessLine,
    resolvedSurfaceProjectState.preflightSummary,
    resolvedSurfaceProjectState.preDialogueAwarenessLine,
    resolvedSurfaceProjectState.awarenessLine,
    mirrorProjectState.preflightSummary,
    mirrorProjectState.preDialogueAwarenessLine,
    preferredAwarenessLine,
  ], 1600)
  const preferredCompanionHeadlineLine = pickStrongerProjectAwarenessLine([
    payloadProjectState.explicitPayloadProjectHeadline,
    currentProjectState.companionHeadlineLine,
    resolvedSurfaceProjectState.companionHeadlineLine,
    preferredAwarenessLine,
  ], 1600)
  const preferredSpecificCompanionAuthorityLine = pickStrongerProjectAwarenessLine([
    payloadProjectState.explicitPayloadProjectHeadline,
    currentProjectState.companionHeadlineLine,
    resolvedSurfaceProjectState.companionHeadlineLine,
    preferredCompanionHeadlineLine,
  ].map(value => carriesSpecificSameHerAuthorityLine(value) ? value : null), 1600)
  const preferredNextClosureTarget
    = normalizeProviderFacingProjectText(currentProjectState.nextClosureTarget, 1600)
      ?? normalizeProviderFacingProjectText(resolvedSurfaceProjectState.nextClosureTarget, 1600)
      ?? mirrorProjectState.nextClosureTarget
  const canonicalProjectStateBrief = resolveAlicizationProjectStateBrief()
  const canonicalPreparedAwarenessLine = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.preDialogueAwarenessLine,
    4000,
  )
  const canonicalPreparedPreflightSummary = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.preflightSummary,
    4000,
  )
  const canonicalPreparedLatestLandedProgress = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.latestProgress ?? canonicalProjectStateBrief.continuityProgressSummary,
    12000,
  )
  const canonicalPreparedPrimaryOpenLoop = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.primaryOpenLoop ?? canonicalProjectStateBrief.openLoops?.[0],
    12000,
  )
  const canonicalPreparedNextClosureTarget = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.nextClosureTarget,
    12000,
  )
  const canonicalPreparedSameHerSelfLine = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.sameHerSelfLine,
    1600,
  )
  const canonicalPreparedSameHerDriftRisk = normalizeProviderFacingProjectText(
    canonicalProjectStateBrief.sameHerDriftRisk,
    1600,
  )
  const anchoredPreparedAwarenessLine = buildProviderFacingProjectAwarenessLine({
    identity:
      normalizeProviderFacingProjectText(currentProjectState.identity, 1600)
      ?? normalizeProviderFacingProjectText(resolvedSurfaceProjectState.identity, 1600)
      ?? canonicalProjectStateBrief.identity,
    currentPhase:
      normalizeProviderFacingProjectText(currentProjectState.currentPhase, 1600)
      ?? normalizeProviderFacingProjectText(resolvedSurfaceProjectState.currentPhase, 1600)
      ?? canonicalProjectStateBrief.currentPhase,
    sameHerSelfLine: pickPreferredRuntimeProjectStateDetail([
      currentProjectState.sameHerSelfLine,
      resolvedSurfaceProjectState.sameHerSelfLine,
    ], 'same-her', 1600),
    latestLandedProgress: pickPreferredRuntimeProjectStateDetail([
      currentProjectState.latestLandedProgress,
      currentProjectState.latestProgress,
      resolvedSurfaceProjectState.latestLandedProgress,
      resolvedSurfaceProjectState.latestProgress,
    ], 'landed', 12000),
    primaryOpenLoop: pickPreferredRuntimeProjectStateDetail([
      currentProjectState.primaryOpenLoop,
      resolvedSurfaceProjectState.primaryOpenLoop,
    ], 'open', 12000),
    nextClosureTarget: pickPreferredRuntimeProjectStateDetail([
      preferredNextClosureTarget,
      currentProjectState.nextClosureTarget,
      resolvedSurfaceProjectState.nextClosureTarget,
    ], 'next', 12000),
  })
  const resolvedAwarenessLine = normalizeProviderFacingProjectText(
    resolvedSurfaceProjectState.preDialogueAwarenessLine
    ?? resolvedSurfaceProjectState.awarenessLine,
    1600,
  )
  const shouldPreferResolvedRichPhase1AwarenessSeed = Boolean(
    !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && resolvedAwarenessLine
    && carriesRichPhase1ProjectAwareness(resolvedAwarenessLine)
    && shouldPreserveProjectAwarenessLineVerbatim(
      resolvedAwarenessLine,
      preferredAwarenessLine ?? currentAwarenessCandidate ?? canonicalPreparedAwarenessLine,
    )
    && (
      !preferredAwarenessLine
      || isCanonicalStructuredProjectAwareness(preferredAwarenessLine)
      || isPhase1ProjectStatePreflightAwarenessLine(preferredAwarenessLine)
      || (
        preferredAwarenessLine !== resolvedAwarenessLine
        && !carriesRichPhase1ProjectAwareness(preferredAwarenessLine)
      )
    ),
  )
  const shouldReCanonicalizeThinPreparedAwareness = Boolean(
    !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && currentAwarenessCandidate
    && (
      isThinProjectAwarenessAuthorityLine(currentAwarenessCandidate)
      || isCompactProjectStatePreflightSummary(currentAwarenessCandidate)
    )
    && resolvedAwarenessLine
    && isCanonicalStructuredProjectAwareness(resolvedAwarenessLine)
    && !/callback return|same thread/iu.test(resolvedAwarenessLine),
  )
  const awarenessLineNeedsResolvedSurfaceCarry = Boolean(
    (!preferredAwarenessLine || isThinProjectAwarenessAuthorityLine(preferredAwarenessLine) || isCompactProjectStatePreflightSummary(preferredAwarenessLine))
    && resolvedAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(resolvedAwarenessLine)
    && !isCompactProjectStatePreflightSummary(resolvedAwarenessLine),
  )
  const shouldPromoteSpecificCompanionAuthorityAsAwarenessSeed = Boolean(
    !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && preferredSpecificCompanionAuthorityLine
    && (
      !preferredAwarenessLine
      || isThinProjectAwarenessAuthorityLine(preferredAwarenessLine)
      || isCompactProjectStatePreflightSummary(preferredAwarenessLine)
      || shouldReCanonicalizeThinPreparedAwareness
      || shouldPreserveProjectAwarenessLineVerbatim(
        preferredSpecificCompanionAuthorityLine,
        preferredAwarenessLine,
      )
      || isStrongerSameHerProjectHeadline(
        preferredSpecificCompanionAuthorityLine,
        preferredAwarenessLine,
      )
    ),
  )
  const seededAwarenessLineBase = shouldPromoteSpecificCompanionAuthorityAsAwarenessSeed
    ? preferredSpecificCompanionAuthorityLine
    : shouldPreferResolvedRichPhase1AwarenessSeed
      ? resolvedAwarenessLine
      : shouldReCanonicalizeThinPreparedAwareness
        ? canonicalPreparedAwarenessLine
        : awarenessLineNeedsResolvedSurfaceCarry
          ? resolvedAwarenessLine
          : preferredAwarenessLine
            ?? resolvedAwarenessLine
  const shouldPreferAnchoredPreparedAwarenessForThinPayloadSummary = Boolean(
    rawPayloadThinSummaryOnly
    && anchoredPreparedAwarenessLine
    && seededAwarenessLineBase
    && !seededAwarenessLineBase.startsWith('Before answering')
    && awarenessCarriesBroaderProjectFrame(seededAwarenessLineBase)
    && !carriesSpecificSameHerAuthorityLine(seededAwarenessLineBase)
    && !hasModalitySpecificEmbodimentCue(seededAwarenessLineBase),
  )
  const seededAwarenessLine = shouldPreferAnchoredPreparedAwarenessForThinPayloadSummary
    ? anchoredPreparedAwarenessLine
    : seededAwarenessLineBase
  const resolvedPreflightSummary = normalizeProviderFacingProjectText(
    resolvedSurfaceProjectState.preflightSummary,
    1600,
  )
  const preflightSummaryNeedsResolvedSurfaceCarry = Boolean(
    (!preferredPreflightSummary || isThinProjectAwarenessAuthorityLine(preferredPreflightSummary) || isCompactProjectStatePreflightSummary(preferredPreflightSummary))
    && resolvedPreflightSummary
    && !isThinProjectAwarenessAuthorityLine(resolvedPreflightSummary)
    && !isCompactProjectStatePreflightSummary(resolvedPreflightSummary),
  )
  const preflightSummaryNeedsAwarenessCarry = Boolean(
    (!preferredPreflightSummary || isThinProjectAwarenessAuthorityLine(preferredPreflightSummary) || isCompactProjectStatePreflightSummary(preferredPreflightSummary))
    && seededAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(seededAwarenessLine)
    && !isCompactProjectStatePreflightSummary(seededAwarenessLine),
  )
  const seededPreflightSummary = shouldReCanonicalizeThinPreparedAwareness
    ? canonicalPreparedPreflightSummary
    : preflightSummaryNeedsResolvedSurfaceCarry
      ? resolvedPreflightSummary
      : preflightSummaryNeedsAwarenessCarry
        ? seededAwarenessLine
        : preferredPreflightSummary
          ?? resolvedPreflightSummary
  const resolvedCompanionHeadlineLine = normalizeProviderFacingProjectText(
    resolvedSurfaceProjectState.companionHeadlineLine,
    1600,
  )
  const seededCompanionHeadlineLineBase = shouldPromoteSpecificCompanionAuthorityAsAwarenessSeed
    ? preferredSpecificCompanionAuthorityLine
    : (
        shouldPreferResolvedRichPhase1AwarenessSeed
        && resolvedAwarenessLine
      )
        ? resolvedAwarenessLine
        : (
            preferredCompanionHeadlineLine
            && !isThinProjectAwarenessAuthorityLine(preferredCompanionHeadlineLine)
            && !isCompactProjectStatePreflightSummary(preferredCompanionHeadlineLine)
          )
            ? preferredCompanionHeadlineLine
            : resolvedCompanionHeadlineLine
              ?? seededAwarenessLine
              ?? preferredCompanionHeadlineLine
  const seededCompanionHeadlineLine = shouldPreferAnchoredPreparedAwarenessForThinPayloadSummary
    && seededCompanionHeadlineLineBase
    && (
      seededCompanionHeadlineLineBase === preferredAwarenessLine
      || seededCompanionHeadlineLineBase === resolvedAwarenessLine
      || isCanonicalStructuredProjectAwareness(seededCompanionHeadlineLineBase)
      || awarenessCarriesBroaderProjectFrame(seededCompanionHeadlineLineBase)
    )
    ? seededAwarenessLine
    : seededCompanionHeadlineLineBase

  const currentCompanionBriefingLine = normalizeProviderFacingProjectText(
    currentProjectState.companionBriefingLine,
    1600,
  )
  const resolvedCompanionBriefingLine = normalizeProviderFacingProjectText(
    resolvedSurfaceProjectState.companionBriefingLine,
    1600,
  )
  const seededCompanionBriefingLine = (
    currentCompanionBriefingLine
    && !isThinProjectAwarenessAuthorityLine(currentCompanionBriefingLine)
    && !isCompactProjectStatePreflightSummary(currentCompanionBriefingLine)
  )
    ? currentCompanionBriefingLine
    : (
        resolvedCompanionBriefingLine
        && !isThinProjectAwarenessAuthorityLine(resolvedCompanionBriefingLine)
        && !isCompactProjectStatePreflightSummary(resolvedCompanionBriefingLine)
      )
        ? resolvedCompanionBriefingLine
        : null

  if (!seededAwarenessLine && !seededPreflightSummary && !seededCompanionHeadlineLine)
    return surface

  const nextProjectState: RuntimeSurfaceProjectState = {
    ...currentProjectState,
    identity: pickPreferredRuntimeProjectStateDetail([
      currentProjectState.identity,
      resolvedSurfaceProjectState.identity,
    ], 'identity', 1600)
    ?? currentProjectState.identity,
    currentPhase:
      normalizeProviderFacingProjectText(currentProjectState.currentPhase, 1600)
      ?? normalizeProviderFacingProjectText(resolvedSurfaceProjectState.currentPhase, 1600)
      ?? currentProjectState.currentPhase,
    preflightSummary: seededPreflightSummary ?? currentProjectState.preflightSummary,
    preDialogueAwarenessLine: seededAwarenessLine ?? currentProjectState.preDialogueAwarenessLine,
    awarenessLine: seededAwarenessLine ?? currentProjectState.awarenessLine,
    preDialogueAwarenessSummary: seededAwarenessLine ?? currentProjectState.preDialogueAwarenessSummary,
    companionHeadlineLine: seededCompanionHeadlineLine ?? currentProjectState.companionHeadlineLine,
    companionBriefingLine: seededCompanionBriefingLine ?? currentProjectState.companionBriefingLine,
    latestLandedProgress: shouldReCanonicalizeThinPreparedAwareness
      ? canonicalPreparedLatestLandedProgress ?? currentProjectState.latestLandedProgress
      : (
          normalizeProviderFacingProjectText(
            currentProjectState.latestLandedProgress ?? currentProjectState.latestProgress,
            12000,
          )
          && !looksLikeThinRuntimeProjectStateDetail(
            normalizeProviderFacingProjectText(
              currentProjectState.latestLandedProgress ?? currentProjectState.latestProgress,
              12000,
            ),
            'landed',
          )
        )
          ? normalizeProviderFacingProjectText(
              currentProjectState.latestLandedProgress ?? currentProjectState.latestProgress,
              12000,
            )
          : pickPreferredRuntimeProjectStateDetail([
            resolvedSurfaceProjectState.latestLandedProgress,
            resolvedSurfaceProjectState.latestProgress,
            currentProjectState.latestLandedProgress,
            currentProjectState.latestProgress,
          ], 'landed', 12000)
          ?? currentProjectState.latestLandedProgress,
    latestProgress: shouldReCanonicalizeThinPreparedAwareness
      ? canonicalPreparedLatestLandedProgress ?? currentProjectState.latestProgress
      : (
          normalizeProviderFacingProjectText(
            currentProjectState.latestProgress ?? currentProjectState.latestLandedProgress,
            12000,
          )
          && !looksLikeThinRuntimeProjectStateDetail(
            normalizeProviderFacingProjectText(
              currentProjectState.latestProgress ?? currentProjectState.latestLandedProgress,
              12000,
            ),
            'landed',
          )
        )
          ? normalizeProviderFacingProjectText(
              currentProjectState.latestProgress ?? currentProjectState.latestLandedProgress,
              12000,
            )
          : pickPreferredRuntimeProjectStateDetail([
            resolvedSurfaceProjectState.latestProgress,
            resolvedSurfaceProjectState.latestLandedProgress,
            currentProjectState.latestProgress,
            currentProjectState.latestLandedProgress,
          ], 'landed', 12000)
          ?? currentProjectState.latestProgress,
    primaryOpenLoop: shouldReCanonicalizeThinPreparedAwareness
      ? canonicalPreparedPrimaryOpenLoop ?? currentProjectState.primaryOpenLoop
      : (
          normalizeProviderFacingProjectText(currentProjectState.primaryOpenLoop, 12000)
          && !looksLikeThinRuntimeProjectStateDetail(
            normalizeProviderFacingProjectText(currentProjectState.primaryOpenLoop, 12000),
            'open',
          )
        )
          ? normalizeProviderFacingProjectText(currentProjectState.primaryOpenLoop, 12000)
          : pickPreferredRuntimeProjectStateDetail([
            resolvedSurfaceProjectState.primaryOpenLoop,
            currentProjectState.primaryOpenLoop,
          ], 'open', 12000)
          ?? currentProjectState.primaryOpenLoop,
    nextClosureTarget: shouldReCanonicalizeThinPreparedAwareness
      ? canonicalPreparedNextClosureTarget ?? currentProjectState.nextClosureTarget
      : (
          normalizeProviderFacingProjectText(currentProjectState.nextClosureTarget, 12000)
          && !looksLikeThinRuntimeProjectStateDetail(
            normalizeProviderFacingProjectText(currentProjectState.nextClosureTarget, 12000),
            'next',
          )
        )
          ? normalizeProviderFacingProjectText(currentProjectState.nextClosureTarget, 12000)
          : pickPreferredRuntimeProjectStateDetail([
            preferredNextClosureTarget,
            resolvedSurfaceProjectState.nextClosureTarget,
            currentProjectState.nextClosureTarget,
          ], 'next', 12000)
          ?? currentProjectState.nextClosureTarget,
    sameHerSelfLine: shouldReCanonicalizeThinPreparedAwareness
      ? canonicalPreparedSameHerSelfLine ?? currentProjectState.sameHerSelfLine
      : pickPreferredRuntimeProjectStateDetail([
        currentProjectState.sameHerSelfLine,
        resolvedSurfaceProjectState.sameHerSelfLine,
      ], 'same-her', 1600)
      ?? currentProjectState.sameHerSelfLine,
    sameHerDriftRisk: preferStrongerSameHerDriftRisk({
      current: shouldReCanonicalizeThinPreparedAwareness
        ? (
            pickPreferredRuntimeProjectStateDetail([
              currentProjectState.sameHerDriftRisk,
              currentProjectStateSummaryAlias?.sameHerDriftRiskSummary,
            ], 'drift', 1600)
            ?? currentProjectState.sameHerDriftRisk
          )
        : (
            pickPreferredRuntimeProjectStateDetail([
              currentProjectState.sameHerDriftRisk,
              currentProjectStateSummaryAlias?.sameHerDriftRiskSummary,
            ], 'drift', 1600)
            ?? currentProjectState.sameHerDriftRisk
          ),
      candidate: resolvedSurfaceProjectState.sameHerDriftRisk,
      fallback: canonicalPreparedSameHerDriftRisk ?? currentProjectState.sameHerDriftRisk,
    }) ?? currentProjectState.sameHerDriftRisk,
    emotionalClosureSummary:
      pickPreferredRuntimeProjectStateDetail([
        currentProjectState.emotionalClosureSummary,
        resolvedSurfaceProjectState.emotionalClosureSummary,
      ], 'awareness', 1600)
      ?? currentProjectState.emotionalClosureSummary,
    continuityRestraint:
      pickPreferredContinuityRestraint([
        currentProjectState.continuityRestraint,
        resolvedSurfaceProjectState.continuityRestraint,
      ])
      ?? currentProjectState.continuityRestraint
      ?? null,
    continuityPreferredTiming:
      pickProviderFacingContinuityPreferredTiming([
        currentProjectState.continuityPreferredTiming,
        resolvedSurfaceProjectState.continuityPreferredTiming,
      ])
      ?? null,
    continuityCadence:
      pickProviderFacingContinuityCadence([
        currentProjectState.continuityCadence,
        resolvedSurfaceProjectState.continuityCadence,
      ]),
    preferredBlinkCadence:
      normalizeProviderFacingBlinkCadence(currentProjectState.preferredBlinkCadence)
      ?? normalizeProviderFacingBlinkCadence(resolvedSurfaceProjectState.preferredBlinkCadence)
      ?? currentProjectState.preferredBlinkCadence
      ?? null,
    preferredGazeMode:
      normalizeProviderFacingGazeMode(currentProjectState.preferredGazeMode)
      ?? normalizeProviderFacingGazeMode(resolvedSurfaceProjectState.preferredGazeMode)
      ?? currentProjectState.preferredGazeMode
      ?? null,
    preferredPauseMode:
      normalizeProviderFacingPauseMode(currentProjectState.preferredPauseMode)
      ?? normalizeProviderFacingPauseMode(resolvedSurfaceProjectState.preferredPauseMode)
      ?? currentProjectState.preferredPauseMode
      ?? null,
    preferredLipsyncMode:
      normalizeProviderFacingLipsyncMode(currentProjectState.preferredLipsyncMode)
      ?? normalizeProviderFacingLipsyncMode(resolvedSurfaceProjectState.preferredLipsyncMode)
      ?? currentProjectState.preferredLipsyncMode
      ?? null,
    preferredVoiceMode:
      normalizeProviderFacingVoiceMode(currentProjectState.preferredVoiceMode)
      ?? normalizeProviderFacingVoiceMode(resolvedSurfaceProjectState.preferredVoiceMode)
      ?? currentProjectState.preferredVoiceMode
      ?? null,
    preferredPacingMode:
      normalizeProviderFacingPacingMode(currentProjectState.preferredPacingMode)
      ?? normalizeProviderFacingPacingMode(resolvedSurfaceProjectState.preferredPacingMode)
      ?? currentProjectState.preferredPacingMode
      ?? null,
  }
  const nextRuntimeDigestProjectState = mergeRuntimeDigestProjectState(
    surface.raw?.runtimeDigest?.projectState ?? null,
    nextProjectState,
  )
  const nextCognitionRuntimeDigestProjectState = mergeRuntimeDigestProjectState(
    surface.cognition?.runtimeDigest?.projectState ?? null,
    nextProjectState,
  )

  return {
    ...surface,
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: {
        ...surface.dialogue.currentConsciousFrame,
        projectState: nextProjectState as typeof surface.dialogue.currentConsciousFrame.projectState,
      },
    },
    raw: {
      ...surface.raw,
      runtimeDigest: surface.raw?.runtimeDigest
        ? {
            ...surface.raw.runtimeDigest,
            projectState: nextRuntimeDigestProjectState,
          }
        : surface.raw?.runtimeDigest,
    },
    cognition: {
      ...surface.cognition,
      runtimeDigest: surface.cognition?.runtimeDigest
        ? {
            ...surface.cognition.runtimeDigest,
            projectState: nextCognitionRuntimeDigestProjectState,
          }
        : surface.cognition?.runtimeDigest,
    },
  }
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

  const preparedRelationshipLine = normalizeProviderFacingProjectText(
    preparedRuntimeSurface.memory?.personStateProjection?.selfContinuityAuthority?.relationshipLine,
    320,
  )
  const spineRelationshipLine = normalizeProviderFacingProjectText(
    spineRuntimeSurface.memory?.personStateProjection?.selfContinuityAuthority?.relationshipLine,
    320,
  )
  if (preparedRelationshipLine && !spineRelationshipLine)
    return preparedRuntimeSurface

  const readDirectSurfaceAwarenessLine = (surface: AlicizationDigitalLifeRuntimeSurface | null) => pickStrongerProjectAwarenessLine([
    surface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    surface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
    surface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary,
    surface?.raw?.runtimeDigest?.projectState?.preDialogueAwarenessLine,
    surface?.raw?.runtimeDigest?.projectState?.awarenessLine,
    surface?.raw?.runtimeDigest?.projectState?.preDialogueAwarenessSummary,
    surface?.cognition?.runtimeDigest?.projectState?.preDialogueAwarenessLine,
    surface?.cognition?.runtimeDigest?.projectState?.awarenessLine,
    surface?.cognition?.runtimeDigest?.projectState?.preDialogueAwarenessSummary,
  ], 1600)
  const readSurfaceCompanionHeadlineLine = (surface: AlicizationDigitalLifeRuntimeSurface | null) => pickProjectAwarenessLineWithoutCompactSummaryShell([
    surface?.dialogue?.currentConsciousFrame?.projectState?.companionHeadlineLine,
    surface?.raw?.runtimeDigest?.projectState?.companionHeadlineLine,
    surface?.raw?.runtime?.projectState?.companionHeadlineLine,
    surface?.cognition?.runtimeDigest?.projectState?.companionHeadlineLine,
  ], 1600)
  const preparedDirectAwarenessLine = readDirectSurfaceAwarenessLine(preparedRuntimeSurface)
  const spineDirectAwarenessLine = readDirectSurfaceAwarenessLine(spineRuntimeSurface)
  const preparedCompanionHeadlineLine = readSurfaceCompanionHeadlineLine(preparedRuntimeSurface)
  const spineCompanionHeadlineLine = readSurfaceCompanionHeadlineLine(spineRuntimeSurface)
  const preparedCarriesSpecificSameHerAuthority = carriesSpecificSameHerAuthorityLine(preparedDirectAwarenessLine)
    || carriesSpecificSameHerAuthorityLine(preparedCompanionHeadlineLine)
  const spineCarriesSpecificSameHerAuthority = carriesSpecificSameHerAuthorityLine(spineDirectAwarenessLine)
    || carriesSpecificSameHerAuthorityLine(spineCompanionHeadlineLine)
  if (
    preparedCarriesSpecificSameHerAuthority
    && !spineCarriesSpecificSameHerAuthority
    && !shouldPreserveProjectAwarenessLineVerbatim(spineDirectAwarenessLine, preparedDirectAwarenessLine)
  ) {
    return preparedRuntimeSurface
  }
  if (
    spineCarriesSpecificSameHerAuthority
    && !preparedCarriesSpecificSameHerAuthority
    && !shouldPreserveProjectAwarenessLineVerbatim(preparedDirectAwarenessLine, spineDirectAwarenessLine)
  ) {
    return spineRuntimeSurface
  }
  const preparedAwarenessLineLacksFullPhaseAnchor = Boolean(
    preparedDirectAwarenessLine
    && /phase 1/iu.test(preparedDirectAwarenessLine)
    && !preparedDirectAwarenessLine.includes('Phase 1: Local Digital Life')
    && !carriesRichPhase1ProjectAwareness(preparedDirectAwarenessLine),
  )
  if (
    spineDirectAwarenessLine
    && isCanonicalStructuredProjectAwareness(spineDirectAwarenessLine)
    && preparedAwarenessLineLacksFullPhaseAnchor
    && !preparedCarriesSpecificSameHerAuthority
  ) {
    return spineRuntimeSurface
  }
  const preparedShouldOverrideCanonicalSpine = Boolean(
    preparedDirectAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(preparedDirectAwarenessLine)
    && isCanonicalStructuredProjectAwareness(spineDirectAwarenessLine)
    && shouldPreserveProjectAwarenessLineVerbatim(
      preparedDirectAwarenessLine,
      spineDirectAwarenessLine,
    ),
  )
  if (preparedShouldOverrideCanonicalSpine)
    return preparedRuntimeSurface

  const spineShouldOverrideCanonicalPrepared = Boolean(
    spineDirectAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(spineDirectAwarenessLine)
    && isCanonicalStructuredProjectAwareness(preparedDirectAwarenessLine)
    && shouldPreserveProjectAwarenessLineVerbatim(
      spineDirectAwarenessLine,
      preparedDirectAwarenessLine,
    ),
  )
  if (spineShouldOverrideCanonicalPrepared)
    return spineRuntimeSurface
  const preparedShouldOverrideThinOrCanonicalSpine = Boolean(
    preparedDirectAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(preparedDirectAwarenessLine)
    && !isCanonicalStructuredProjectAwareness(preparedDirectAwarenessLine)
    && (
      !spineDirectAwarenessLine
      || isThinProjectAwarenessAuthorityLine(spineDirectAwarenessLine)
      || isCanonicalStructuredProjectAwareness(spineDirectAwarenessLine)
    )
    && (
      shouldPreserveProjectAwarenessLineVerbatim(
        preparedDirectAwarenessLine,
        spineDirectAwarenessLine,
      )
      || isStrongerSameHerProjectHeadline(
        preparedDirectAwarenessLine,
        spineDirectAwarenessLine,
      )
    ),
  )
  if (preparedShouldOverrideThinOrCanonicalSpine)
    return preparedRuntimeSurface

  const spineShouldOverrideThinOrCanonicalPrepared = Boolean(
    spineDirectAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(spineDirectAwarenessLine)
    && !isCanonicalStructuredProjectAwareness(spineDirectAwarenessLine)
    && (
      !preparedDirectAwarenessLine
      || isThinProjectAwarenessAuthorityLine(preparedDirectAwarenessLine)
      || isCanonicalStructuredProjectAwareness(preparedDirectAwarenessLine)
    )
    && (
      shouldPreserveProjectAwarenessLineVerbatim(
        spineDirectAwarenessLine,
        preparedDirectAwarenessLine,
      )
      || isStrongerSameHerProjectHeadline(
        spineDirectAwarenessLine,
        preparedDirectAwarenessLine,
      )
    ),
  )
  if (spineShouldOverrideThinOrCanonicalPrepared)
    return spineRuntimeSurface

  const continuityPreferredRuntimeSurface = resolveRuntimeSurfaceContinuityPreferredRuntimeSurface({
    spineRuntimeSurface,
    preparedRuntimeSurface,
  })
  const preparedContinuityEvidenceScore = resolveRuntimeSurfaceContinuityEvidenceScore(preparedRuntimeSurface)
  const spineContinuityEvidenceScore = resolveRuntimeSurfaceContinuityEvidenceScore(spineRuntimeSurface)
  const preparedEmbodiedContinuityShouldOverrideCanonicalSpine = Boolean(
    continuityPreferredRuntimeSurface === preparedRuntimeSurface
    && preparedContinuityEvidenceScore > spineContinuityEvidenceScore
    && spineDirectAwarenessLine
    && isCanonicalStructuredProjectAwareness(spineDirectAwarenessLine)
    && (
      (preparedDirectAwarenessLine && hasModalitySpecificEmbodimentCue(preparedDirectAwarenessLine))
      || (preparedCompanionHeadlineLine && hasModalitySpecificEmbodimentCue(preparedCompanionHeadlineLine))
    ),
  )
  if (preparedEmbodiedContinuityShouldOverrideCanonicalSpine)
    return preparedRuntimeSurface

  const preparedDirectAwarenessScore = scoreAlicizationProjectAwarenessLine(preparedDirectAwarenessLine ?? '')
  const spineDirectAwarenessScore = scoreAlicizationProjectAwarenessLine(spineDirectAwarenessLine ?? '')
  if (
    preparedDirectAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(preparedDirectAwarenessLine)
    && (
      carriesProjectIdentityAnchor(preparedDirectAwarenessLine)
      || shouldPreferRuntimeCompanionHeadline({
        awarenessLine: spineDirectAwarenessLine,
        companionHeadlineLine: preparedDirectAwarenessLine,
      })
    )
    && preparedDirectAwarenessScore > spineDirectAwarenessScore
  ) {
    return preparedRuntimeSurface
  }
  if (
    spineDirectAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(spineDirectAwarenessLine)
    && (
      carriesProjectIdentityAnchor(spineDirectAwarenessLine)
      || shouldPreferRuntimeCompanionHeadline({
        awarenessLine: preparedDirectAwarenessLine,
        companionHeadlineLine: spineDirectAwarenessLine,
      })
    )
    && spineDirectAwarenessScore > preparedDirectAwarenessScore
  ) {
    return spineRuntimeSurface
  }

  const preparedProjectState = readRuntimeProjectStateFromSurface(preparedRuntimeSurface)
  const spineProjectState = readRuntimeProjectStateFromSurface(spineRuntimeSurface)
  const preparedSpecificModalityAuthorityShouldOverrideStructuredSpine = Boolean(
    preparedDirectAwarenessLine
    && carriesSpecificSameHerAuthorityLine(preparedDirectAwarenessLine)
    && hasModalitySpecificEmbodimentCue(preparedDirectAwarenessLine)
    && shouldPreserveProjectAwarenessLineVerbatim(
      preparedDirectAwarenessLine,
      spineProjectState.preDialogueAwarenessLine,
    )
    && (
      isCanonicalStructuredProjectAwareness(spineProjectState.preDialogueAwarenessLine)
      || carriesProjectIdentityAnchor(spineProjectState.preDialogueAwarenessLine)
    ),
  )
  if (preparedSpecificModalityAuthorityShouldOverrideStructuredSpine)
    return preparedRuntimeSurface

  const spineSpecificModalityAuthorityShouldOverrideStructuredPrepared = Boolean(
    spineDirectAwarenessLine
    && carriesSpecificSameHerAuthorityLine(spineDirectAwarenessLine)
    && hasModalitySpecificEmbodimentCue(spineDirectAwarenessLine)
    && shouldPreserveProjectAwarenessLineVerbatim(
      spineDirectAwarenessLine,
      preparedProjectState.preDialogueAwarenessLine,
    )
    && (
      isCanonicalStructuredProjectAwareness(preparedProjectState.preDialogueAwarenessLine)
      || carriesProjectIdentityAnchor(preparedProjectState.preDialogueAwarenessLine)
    ),
  )
  if (spineSpecificModalityAuthorityShouldOverrideStructuredPrepared)
    return spineRuntimeSurface

  if (shouldPreferRuntimeCompanionHeadline({
    awarenessLine: spineProjectState.preDialogueAwarenessLine ?? null,
    companionHeadlineLine: preparedProjectState.companionHeadlineLine ?? null,
  })) {
    return preparedRuntimeSurface
  }
  if (shouldPreferRuntimeCompanionHeadline({
    awarenessLine: preparedProjectState.preDialogueAwarenessLine ?? null,
    companionHeadlineLine: spineProjectState.companionHeadlineLine ?? null,
  })) {
    return spineRuntimeSurface
  }

  const preparedCarryScore = scoreResolvedRuntimeProjectCarry(preparedProjectState)
  const spineCarryScore = scoreResolvedRuntimeProjectCarry(spineProjectState)
  if (preparedCarryScore > spineCarryScore)
    return preparedRuntimeSurface
  if (spineCarryScore > preparedCarryScore)
    return spineRuntimeSurface

  const preparedProjectScore = scoreAlicizationProjectAwarenessLine(
    preparedProjectState.preDialogueAwarenessLine ?? '',
  )
  const spineProjectScore = scoreAlicizationProjectAwarenessLine(
    spineProjectState.preDialogueAwarenessLine ?? '',
  )
  if (preparedProjectScore >= spineProjectScore)
    return preparedRuntimeSurface

  return spineRuntimeSurface
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

function alignPreparedRuntimeSurfaceProjectStateCarry(
  surface: AlicizationDigitalLifeRuntimeSurface | null,
): AlicizationDigitalLifeRuntimeSurface | null {
  if (!surface?.dialogue?.currentConsciousFrame?.projectState)
    return surface

  const preparedSurface = ensurePreparedRuntimeSurfaceShape(surface)
  const currentConsciousFrame = preparedSurface?.dialogue?.currentConsciousFrame
  const currentProjectState = currentConsciousFrame?.projectState as RuntimeSurfaceProjectState | null | undefined
  if (!preparedSurface || !currentConsciousFrame || !currentProjectState)
    return preparedSurface

  const resolvedProjectState = readRuntimeProjectStateFromSurface(preparedSurface)
  const currentDirectAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    currentProjectState.preDialogueAwarenessLine,
    currentProjectState.awarenessLine,
    currentProjectState.preDialogueAwarenessSummary,
  ], 1600)
  const currentCompanionHeadlineLine = normalizeProviderFacingProjectText(
    currentProjectState.companionHeadlineLine,
    1600,
  )
  const providerSafeCurrentCompanionHeadlineLine = currentCompanionHeadlineLine
    && isLegacyProjectAwarenessTemplateShell(currentCompanionHeadlineLine)
    ? normalizeProviderFacingProjectText(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        ...currentProjectState,
        companionHeadlineLine: currentCompanionHeadlineLine,
      },
      fallbackProjectState: resolvedProjectState,
    }), 1600) ?? normalizeProviderFacingProjectText(resolvedProjectState.companionHeadlineLine, 1600)
    : currentCompanionHeadlineLine
  const shouldPromoteCurrentCompanionHeadline = Boolean(
    providerSafeCurrentCompanionHeadlineLine
    && carriesSpecificSameHerAuthorityLine(providerSafeCurrentCompanionHeadlineLine)
    && (
      !currentDirectAwarenessLine
      || isThinProjectAwarenessAuthorityLine(currentDirectAwarenessLine)
      || isCanonicalStructuredProjectAwareness(currentDirectAwarenessLine)
      || shouldPreserveProjectAwarenessLineVerbatim(
        providerSafeCurrentCompanionHeadlineLine,
        currentDirectAwarenessLine,
      )
      || isStrongerSameHerProjectHeadline(
        providerSafeCurrentCompanionHeadlineLine,
        currentDirectAwarenessLine,
      )
    ),
  )
  const preferredCurrentAwarenessLine = shouldPromoteCurrentCompanionHeadline
    ? providerSafeCurrentCompanionHeadlineLine
    : currentDirectAwarenessLine
  const preferProjectDetail = (
    currentValue: unknown,
    resolvedValue: unknown,
    kind: 'landed' | 'open' | 'next',
  ) => {
    const currentText = normalizeProviderFacingProjectText(currentValue, 12000)
    const resolvedText = normalizeProviderFacingProjectText(resolvedValue, 12000)
    if (!resolvedText)
      return currentText ?? currentValue
    if (!currentText)
      return resolvedText
    const currentLooksTruncated = isTruncatedRuntimeProjectStateDetailPrefix({
      current: currentText,
      candidates: [resolvedText],
    })
    if (
      currentLooksTruncated
      || looksLikeThinRuntimeProjectStateDetail(currentText, kind)
      || scoreRuntimeProjectStateDetailCandidate(resolvedText, kind) > scoreRuntimeProjectStateDetailCandidate(currentText, kind)
    ) {
      return resolvedText
    }
    return currentText
  }

  const nextProjectState: RuntimeSurfaceProjectState = {
    ...currentProjectState,
    preDialogueAwarenessLine:
      preferredCurrentAwarenessLine
      ?? resolvedProjectState.preDialogueAwarenessLine
      ?? currentProjectState.preDialogueAwarenessLine,
    awarenessLine:
      preferredCurrentAwarenessLine
      ?? resolvedProjectState.awarenessLine
      ?? currentProjectState.awarenessLine,
    preDialogueAwarenessSummary:
      preferredCurrentAwarenessLine
      ?? resolvedProjectState.preDialogueAwarenessSummary
      ?? currentProjectState.preDialogueAwarenessSummary,
    companionHeadlineLine:
      providerSafeCurrentCompanionHeadlineLine
      ?? normalizeProviderFacingProjectText(resolvedProjectState.companionHeadlineLine, 1600)
      ?? currentProjectState.companionHeadlineLine,
    identity:
      pickPreferredRuntimeProjectStateDetail([
        currentProjectState.identity,
        resolvedProjectState.identity,
      ], 'identity', 1600)
      ?? currentProjectState.identity,
    currentPhase:
      pickPreferredRuntimeProjectPhase([
        currentProjectState.currentPhase,
        resolvedProjectState.currentPhase,
      ], 1600)
      ?? currentProjectState.currentPhase,
    latestLandedProgress: preferProjectDetail(
      currentProjectState.latestLandedProgress ?? currentProjectState.latestProgress,
      resolvedProjectState.latestLandedProgress ?? resolvedProjectState.latestProgress,
      'landed',
    ) as RuntimeSurfaceProjectState['latestLandedProgress'],
    latestProgress: preferProjectDetail(
      currentProjectState.latestProgress ?? currentProjectState.latestLandedProgress,
      resolvedProjectState.latestProgress ?? resolvedProjectState.latestLandedProgress,
      'landed',
    ) as RuntimeSurfaceProjectState['latestProgress'],
    primaryOpenLoop: preferProjectDetail(
      currentProjectState.primaryOpenLoop,
      resolvedProjectState.primaryOpenLoop,
      'open',
    ) as RuntimeSurfaceProjectState['primaryOpenLoop'],
    nextClosureTarget: preferProjectDetail(
      currentProjectState.nextClosureTarget,
      resolvedProjectState.nextClosureTarget,
      'next',
    ) as RuntimeSurfaceProjectState['nextClosureTarget'],
    sameHerSelfLine:
      pickPreferredRuntimeProjectStateDetail([
        resolvedProjectState.sameHerSelfLine,
        currentProjectState.sameHerSelfLine,
      ], 'same-her', 1600)
      ?? currentProjectState.sameHerSelfLine,
    sameHerDriftRisk:
      preferStrongerSameHerDriftRisk({
        current: currentProjectState.sameHerDriftRisk,
        candidate: resolvedProjectState.sameHerDriftRisk,
      })
      ?? currentProjectState.sameHerDriftRisk,
    sameHerHoldDetail:
      pickPreferredRuntimeProjectStateDetail([
        currentProjectState.sameHerHoldDetail,
        resolvedProjectState.sameHerHoldDetail,
      ], 'same-her', 1600)
      ?? currentProjectState.sameHerHoldDetail,
    emotionalClosureSummary:
      pickPreferredRuntimeProjectStateDetail([
        currentProjectState.emotionalClosureSummary,
        resolvedProjectState.emotionalClosureSummary,
      ], 'awareness', 1600)
      ?? currentProjectState.emotionalClosureSummary,
    continuityRestraint:
      pickPreferredContinuityRestraint([
        currentProjectState.continuityRestraint,
        resolvedProjectState.continuityRestraint,
      ])
      ?? currentProjectState.continuityRestraint,
    continuityArcStage:
      normalizeProviderFacingProjectText(currentProjectState.continuityArcStage, 120)
      ?? normalizeProviderFacingProjectText(resolvedProjectState.continuityArcStage, 120)
      ?? currentProjectState.continuityArcStage,
    continuityCue:
      pickPreferredRuntimeProjectStateDetail([
        currentProjectState.continuityCue,
        resolvedProjectState.continuityCue,
      ], 'awareness', 1600)
      ?? currentProjectState.continuityCue,
    continuityPreferredTiming:
      pickProviderFacingContinuityPreferredTiming([
        currentProjectState.continuityPreferredTiming,
        resolvedProjectState.continuityPreferredTiming,
      ]),
    continuityCadence:
      pickProviderFacingContinuityCadence([
        currentProjectState.continuityCadence,
        resolvedProjectState.continuityCadence,
      ]),
    preferredBlinkCadence:
      normalizeProviderFacingBlinkCadence(currentProjectState.preferredBlinkCadence)
      ?? normalizeProviderFacingBlinkCadence(resolvedProjectState.preferredBlinkCadence)
      ?? currentProjectState.preferredBlinkCadence,
    preferredGazeMode:
      normalizeProviderFacingGazeMode(currentProjectState.preferredGazeMode)
      ?? normalizeProviderFacingGazeMode(resolvedProjectState.preferredGazeMode)
      ?? currentProjectState.preferredGazeMode,
    preferredPauseMode:
      normalizeProviderFacingPauseMode(currentProjectState.preferredPauseMode)
      ?? normalizeProviderFacingPauseMode(resolvedProjectState.preferredPauseMode)
      ?? currentProjectState.preferredPauseMode,
    preferredLipsyncMode:
      normalizeProviderFacingLipsyncMode(currentProjectState.preferredLipsyncMode)
      ?? normalizeProviderFacingLipsyncMode(resolvedProjectState.preferredLipsyncMode)
      ?? currentProjectState.preferredLipsyncMode,
    preferredVoiceMode:
      normalizeProviderFacingVoiceMode(currentProjectState.preferredVoiceMode)
      ?? normalizeProviderFacingVoiceMode(resolvedProjectState.preferredVoiceMode)
      ?? currentProjectState.preferredVoiceMode,
    preferredPacingMode:
      normalizeProviderFacingPacingMode(currentProjectState.preferredPacingMode)
      ?? normalizeProviderFacingPacingMode(resolvedProjectState.preferredPacingMode)
      ?? currentProjectState.preferredPacingMode,
  }

  const nextRuntimeDigestProjectState = mergeRuntimeDigestProjectState(
    preparedSurface.raw?.runtimeDigest?.projectState ?? null,
    nextProjectState,
  )
  const nextCognitionRuntimeDigestProjectState = mergeRuntimeDigestProjectState(
    preparedSurface.cognition?.runtimeDigest?.projectState ?? null,
    nextProjectState,
  )

  return {
    ...preparedSurface,
    dialogue: {
      ...preparedSurface.dialogue,
      currentConsciousFrame: {
        ...currentConsciousFrame,
        projectState: nextProjectState,
      },
    },
    raw: {
      ...preparedSurface.raw,
      runtimeDigest: preparedSurface.raw?.runtimeDigest
        ? {
            ...preparedSurface.raw.runtimeDigest,
            projectState: nextRuntimeDigestProjectState,
          }
        : preparedSurface.raw?.runtimeDigest,
    },
    cognition: {
      ...preparedSurface.cognition,
      runtimeDigest: preparedSurface.cognition?.runtimeDigest
        ? {
            ...preparedSurface.cognition.runtimeDigest,
            projectState: nextCognitionRuntimeDigestProjectState,
          }
        : preparedSurface.cognition?.runtimeDigest,
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
  const preAdjustmentSelectedRuntimeSurface = alignPreparedRuntimeSurfaceProjectStateCarry(memoryDeliberationReducedRuntimeSurface
    ?? resolvePreferredRuntimeSurface({
      preparedRuntimeSurface: input.answerPlannerReducedRuntimeSurface ?? null,
      spineRuntimeSurface: input.digitalLifeSpine?.runtimeSurface ?? input.baseDigitalLifeRuntimeSurface ?? null,
    }))
  const runtimeSurfaceFallbacks = [
    input.baseDigitalLifeRuntimeSurface ?? null,
    input.answerPlannerReducedRuntimeSurface ?? null,
    input.digitalLifeSpine?.runtimeSurface ?? null,
  ]
  const fresherRuntimeSurface = alignPreparedRuntimeSurfaceProjectStateCarry(
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
  const runtimeSurfaceForBuilder = alignPreparedRuntimeSurfaceProjectStateCarry(
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
  const effectiveDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = alignPreparedRuntimeSurfaceProjectStateCarry(restorePreparedRuntimeRelationshipCarry(
    stripProjectStateContinuityTiming(applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: input.baseDigitalLifeRuntimeSurface,
      governance: input.governance,
      context: input.context,
      now: input.now,
    })) as AlicizationDigitalLifeRuntimeSurface | null,
    input.context,
  ))
  const sociallyShapedDigitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = alignPreparedRuntimeSurfaceProjectStateCarry(restorePreparedRuntimeRelationshipCarry(
    stripProjectStateContinuityTiming(applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface: effectiveDigitalLifeRuntimeSurface,
      governance: input.governance,
      context: input.context,
      now: input.now,
    })) as AlicizationDigitalLifeRuntimeSurface | null,
    input.context,
  ))
  const executionCallbackCarryRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = alignPreparedRuntimeSurfaceProjectStateCarry(restorePreparedRuntimeRelationshipCarry(
    applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: sociallyShapedDigitalLifeRuntimeSurface,
      governance: input.governance,
      context: input.context,
      now: input.now,
    }) as AlicizationDigitalLifeRuntimeSurface | null,
    input.context,
  ))
  const consciousFrameReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = alignPreparedRuntimeSurfaceProjectStateCarry(reduceRuntimeConsciousFrame({
    surface: executionCallbackCarryRuntimeSurface,
    governance: input.governance,
    now: input.now,
  }) as AlicizationDigitalLifeRuntimeSurface | null)
  const answerPlannerReducedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null = alignPreparedRuntimeSurfaceProjectStateCarry(reduceRuntimeAnswerPlanner({
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
  const baseContract = input.contract ?? createDefaultProviderFacingMindTurnContract({
    governance: input.governance,
  })
  const selectedRuntimeSurface = resolvePreferredRuntimeSurface({
    preparedRuntimeSurface: input.runtimeSurface?.digitalLifeRuntimeSurface ?? null,
    spineRuntimeSurface: input.runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null,
  })
  const selectedDialogueProjectState
    = selectedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
  const runtimeProjectState = readRuntimeProjectStateFromSurface(selectedRuntimeSurface)
  const payloadProjectState = readProviderFacingPayloadProjectState(input.rawPayload)
  const selectedRuntimeAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    selectedDialogueProjectState?.preDialogueAwarenessLine,
    selectedDialogueProjectState?.awarenessLine,
    selectedDialogueProjectState?.preDialogueAwarenessSummary,
  ], 1600)
  const selectedRuntimeVerbatimAwarenessLine = selectedRuntimeAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(selectedRuntimeAwarenessLine)
    && (
      shouldPreserveProjectAwarenessLineVerbatim(
        selectedRuntimeAwarenessLine,
        runtimeProjectState.preDialogueAwarenessLine,
      )
      || (
        runtimeProjectState.sameHerSelfLine
        && !looksLikeThinRuntimeProjectStateDetail(runtimeProjectState.sameHerSelfLine, 'same-her')
        && selectedRuntimeAwarenessLine.includes(runtimeProjectState.sameHerSelfLine)
        && !normalizeProviderFacingProjectText(
          runtimeProjectState.preDialogueAwarenessLine,
          1600,
        )?.includes(runtimeProjectState.sameHerSelfLine)
      )
    )
    ? selectedRuntimeAwarenessLine
    : null
  const selectedRuntimeCompanionHeadlineLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    selectedDialogueProjectState?.companionHeadlineLine,
  ], 1600)
  const payloadAwarenessLine = payloadProjectState.hasDirectPayloadProjectAwarenessLine
    ? resolvePreferredPayloadAwarenessLine({
        awarenessLine: payloadProjectState.explicitPayloadProjectAwarenessLine,
        headlineLine: payloadProjectState.explicitPayloadProjectHeadline,
      })
    : null
  const payloadSpecificSameHerEmbodimentAuthorityLine = [
    normalizeProviderFacingProjectText(payloadProjectState.explicitPayloadProjectHeadline, 1600),
    payloadAwarenessLine,
  ].find(line =>
    Boolean(
      line
      && carriesSpecificSameHerAuthorityLine(line)
      && hasModalitySpecificEmbodimentCue(line),
    ),
  ) ?? null
  const payloadAwarenessLineLooksThin = Boolean(
    payloadAwarenessLine
    && (
      isThinProjectAwarenessAuthorityLine(payloadAwarenessLine)
      || isCompactProjectStatePreflightSummary(payloadAwarenessLine)
    ),
  )
  const payloadPreflightSummaryLooksThin = Boolean(
    payloadProjectState.explicitPayloadProjectPreflightSummary
    && (
      isThinProjectAwarenessAuthorityLine(payloadProjectState.explicitPayloadProjectPreflightSummary)
      || isCompactProjectStatePreflightSummary(payloadProjectState.explicitPayloadProjectPreflightSummary)
    ),
  )
  const payloadPreflightSummaryHasExplicitSameHerPhase1Carry = Boolean(
    payloadProjectState.explicitPayloadProjectPreflightSummary
    && /same local-first digital life project(?: in)? phase 1|same digital life project(?: in)? phase 1/iu.test(
      payloadProjectState.explicitPayloadProjectPreflightSummary,
    ),
  )
  const preferredPayloadRebuildAwarenessLine
    = payloadSpecificSameHerEmbodimentAuthorityLine ?? payloadAwarenessLine
  const preferredPayloadRebuildAwarenessLineLooksThin = Boolean(
    !payloadSpecificSameHerEmbodimentAuthorityLine
    && payloadAwarenessLineLooksThin,
  )
  const payloadShouldSeedRebuildAwareness = Boolean(
    preferredPayloadRebuildAwarenessLine
    && !preferredPayloadRebuildAwarenessLineLooksThin
    && (
      !runtimeProjectState.preDialogueAwarenessLine
      || isThinProjectAwarenessAuthorityLine(runtimeProjectState.preDialogueAwarenessLine)
      || /same local-first digital life project and the unfinished phase 1 closure seam still belongs to one living her/iu.test(
        runtimeProjectState.preDialogueAwarenessLine,
      )
      || (
        isCanonicalStructuredProjectAwareness(runtimeProjectState.preDialogueAwarenessLine)
        && !carriesExplicitProjectClosureTriplet(preferredPayloadRebuildAwarenessLine)
      )
      || shouldPreserveProjectAwarenessLineVerbatim(
        preferredPayloadRebuildAwarenessLine,
        runtimeProjectState.preDialogueAwarenessLine,
      )
      || isStrongerSameHerProjectHeadline(
        preferredPayloadRebuildAwarenessLine,
        runtimeProjectState.preDialogueAwarenessLine,
      )
    ),
  )
  const payloadShouldSeedRebuildHeadline = Boolean(
    payloadProjectState.explicitPayloadProjectHeadline
    && (
      !runtimeProjectState.companionHeadlineLine
      || isThinProjectAwarenessAuthorityLine(runtimeProjectState.companionHeadlineLine)
      || isStrongerSameHerProjectHeadline(
        payloadProjectState.explicitPayloadProjectHeadline,
        runtimeProjectState.companionHeadlineLine,
      )
    ),
  )
  const runtimeSpecificSameHerEmbodimentAuthorityLine = [
    selectedRuntimeCompanionHeadlineLine,
    selectedRuntimeAwarenessLine,
  ].find(line =>
    Boolean(
      line
      && carriesSpecificSameHerAuthorityLine(line)
      && hasModalitySpecificEmbodimentCue(line)
      && (
        !runtimeProjectState.preDialogueAwarenessLine
        || isThinProjectAwarenessAuthorityLine(runtimeProjectState.preDialogueAwarenessLine)
        || isCanonicalStructuredProjectAwareness(runtimeProjectState.preDialogueAwarenessLine)
        || shouldPreserveProjectAwarenessLineVerbatim(
          line,
          runtimeProjectState.preDialogueAwarenessLine,
        )
        || isStrongerSameHerProjectHeadline(
          line,
          runtimeProjectState.preDialogueAwarenessLine,
        )
      ),
    ),
  ) ?? null
  const preferredRuntimeRebuildAwarenessLine
    = runtimeSpecificSameHerEmbodimentAuthorityLine
      ?? selectedRuntimeVerbatimAwarenessLine
      ?? runtimeProjectState.preDialogueAwarenessLine
  const shouldPreferPayloadPreflightSummary = Boolean(
    payloadProjectState.hasDirectPayloadProjectPreflightSummary
    && payloadProjectState.explicitPayloadProjectPreflightSummary
    && !payloadPreflightSummaryLooksThin
    && (
      payloadShouldSeedRebuildAwareness
      || !runtimeProjectState.preflightSummary
      || isThinProjectAwarenessAuthorityLine(runtimeProjectState.preflightSummary)
      || isCompactProjectStatePreflightSummary(runtimeProjectState.preflightSummary)
      || (
        payloadPreflightSummaryHasExplicitSameHerPhase1Carry
        && !/same local-first digital life project(?: in)? phase 1|same digital life project(?: in)? phase 1/iu.test(
          runtimeProjectState.preflightSummary ?? '',
        )
      )
    ),
  )
  const projectStateAnswerGovernanceHint = input.governance?.answerSubject === 'project-state'
    ? {
        answerSubject: 'project-state' as const,
        answerIntent: input.governance?.answerIntent ?? baseContract.answerIntent ?? null,
        governingFocus: input.governance?.governingFocus ?? baseContract.governingFocus ?? null,
        governingProject: input.governance?.governingProject ?? baseContract.governingProject ?? null,
        reasons: input.governance?.reasons ?? baseContract.reasons ?? [],
      }
    : {
        answerSubject: input.governance?.answerSubject ?? null,
        answerIntent: input.governance?.answerIntent ?? baseContract.answerIntent ?? null,
        governingFocus: input.governance?.governingFocus ?? baseContract.governingFocus ?? null,
        governingProject: input.governance?.governingProject ?? baseContract.governingProject ?? null,
        reasons: input.governance?.reasons ?? baseContract.reasons ?? [],
      }
  const mergedGovernanceRules = enrichProjectStateAnswerGovernanceIfNeeded({
    ...projectStateAnswerGovernanceHint,
    mustDo: mergeUniqueRules([
      ...(baseContract.mustDo ?? []),
      ...(input.governance?.mustDo ?? []),
    ]),
    mustNotDo: mergeUniqueRules([
      ...(baseContract.mustNotDo ?? []),
      ...(input.governance?.mustNotDo ?? []),
    ]),
  })
  const providerFacingNextClosureTarget = (
    payloadProjectState.hasDirectPayloadNextClosureTarget
    && (
      payloadShouldSeedRebuildAwareness
      || !runtimeProjectState.nextClosureTarget
    )
  )
    ? payloadProjectState.explicitPayloadNextClosureTarget ?? runtimeProjectState.nextClosureTarget ?? ''
    : runtimeProjectState.nextClosureTarget ?? payloadProjectState.explicitPayloadNextClosureTarget ?? ''

  const rawProjectState: ProviderFacingProjectState | null = runtimeProjectState
    ? ({
        ...baseContract.projectState,
        identity: runtimeProjectState.identity,
        currentPhase: runtimeProjectState.currentPhase,
        preflightSummary:
          shouldPreferPayloadPreflightSummary
            ? payloadProjectState.explicitPayloadProjectPreflightSummary
            : pickPreferredProjectPreflightSummary([
              runtimeProjectState.preflightSummary,
              resolveAlicizationProjectStateBrief().preflightSummary,
            ], 1600) ?? null,
        preDialogueAwarenessLine:
          payloadShouldSeedRebuildAwareness
            ? preferredPayloadRebuildAwarenessLine
            : preferredRuntimeRebuildAwarenessLine
              ?? null,
        awarenessLine:
          payloadShouldSeedRebuildAwareness
            ? preferredPayloadRebuildAwarenessLine
            : preferredRuntimeRebuildAwarenessLine
              ?? null,
        preDialogueAwarenessSummary:
          payloadShouldSeedRebuildAwareness
            ? preferredPayloadRebuildAwarenessLine
            : preferredRuntimeRebuildAwarenessLine
              ?? null,
        companionHeadlineLine:
          payloadShouldSeedRebuildHeadline
            ? payloadProjectState.explicitPayloadProjectHeadline
            : runtimeSpecificSameHerEmbodimentAuthorityLine
              ?? runtimeProjectState.companionHeadlineLine
              ?? preferredRuntimeRebuildAwarenessLine
              ?? null,
        companionBriefingLine: runtimeProjectState.companionBriefingLine ?? null,
        latestLandedProgress: runtimeProjectState.latestLandedProgress ?? null,
        latestProgress: runtimeProjectState.latestProgress ?? null,
        primaryOpenLoop: runtimeProjectState.primaryOpenLoop ?? null,
        nextClosureTarget: providerFacingNextClosureTarget,
        sameHerSelfLine: runtimeProjectState.sameHerSelfLine ?? null,
        sameHerHoldDetail: runtimeProjectState.sameHerHoldDetail ?? null,
        sameHerDriftRisk:
          payloadProjectState.hasDirectPayloadProjectSameHerDriftRisk
            ? preferStrongerSameHerDriftRisk({
                current: runtimeProjectState.sameHerDriftRisk,
                candidate: payloadProjectState.explicitPayloadProjectSameHerDriftRisk,
              })
            : runtimeProjectState.sameHerDriftRisk
              ?? null,
        sameHerDriftRiskSummary:
          payloadProjectState.hasDirectPayloadProjectSameHerDriftRisk
            ? preferStrongerSameHerDriftRisk({
                current: runtimeProjectState.sameHerDriftRisk,
                candidate: payloadProjectState.explicitPayloadProjectSameHerDriftRisk,
              })
            : runtimeProjectState.sameHerDriftRisk
              ?? null,
        emotionalClosureCue: runtimeProjectState.emotionalClosureCue ?? null,
        emotionalClosureSummary: runtimeProjectState.emotionalClosureSummary ?? null,
        continuityRestraint: normalizeProviderFacingContinuityRestraint(runtimeProjectState.continuityRestraint),
        continuityArcStage: runtimeProjectState.continuityArcStage ?? null,
        continuityCue: runtimeProjectState.continuityCue ?? null,
        continuityPreferredTiming: normalizeProviderFacingContinuityPreferredTiming(runtimeProjectState.continuityPreferredTiming),
        continuityCadence: runtimeProjectState.continuityCadence ?? null,
        preferredBlinkCadence: normalizeProviderFacingBlinkCadence(runtimeProjectState.preferredBlinkCadence),
        preferredGazeMode: normalizeProviderFacingGazeMode(runtimeProjectState.preferredGazeMode),
        preferredPauseMode: normalizeProviderFacingPauseMode(runtimeProjectState.preferredPauseMode),
        preferredLipsyncMode: normalizeProviderFacingLipsyncMode(runtimeProjectState.preferredLipsyncMode),
        preferredVoiceMode: normalizeProviderFacingVoiceMode(runtimeProjectState.preferredVoiceMode),
        preferredPacingMode: normalizeProviderFacingPacingMode(runtimeProjectState.preferredPacingMode),
      } satisfies ProviderFacingProjectState)
    : baseContract.projectState ?? null
  const projectState = sanitizeProviderFacingProjectStateRecord(rawProjectState)

  const nextClosureTarget = normalizeProviderFacingProjectText(projectState?.nextClosureTarget, 1600) ?? null

  return {
    ...baseContract,
    answerIntent: input.governance?.answerIntent ?? baseContract.answerIntent ?? null,
    answerAct: input.governance?.answerAct ?? baseContract.answerAct ?? null,
    turnMode: input.governance?.turnMode ?? baseContract.turnMode,
    responseMode: normalizeProviderFacingResponseMode(
      input.governance?.responseMode,
      baseContract.responseMode,
    ),
    evidenceMode: input.governance?.evidenceMode ?? baseContract.evidenceMode,
    openingStyle: input.governance?.openingStyle ?? baseContract.openingStyle,
    expectedVisibleReplyAuthority: input.governance?.expectedVisibleReplyAuthority ?? baseContract.expectedVisibleReplyAuthority,
    replyRealizationMode: normalizeProviderFacingReplyRealizationMode(
      input.governance?.replyRealizationMode,
      baseContract.replyRealizationMode,
    ),
    personaKernelMode: input.governance?.personaKernelMode ?? baseContract.personaKernelMode,
    activeClosenessContext:
      normalizeProviderFacingClosenessContext(input.governance?.activeClosenessContext)
      ?? baseContract.activeClosenessContext
      ?? null,
    activeClosenessRung:
      normalizeProviderFacingClosenessRung(input.governance?.activeClosenessRung)
      ?? baseContract.activeClosenessRung
      ?? null,
    relationshipPosture: normalizeProviderFacingRelationshipPosture(
      input.governance?.relationshipPosture,
      baseContract.relationshipPosture,
    ),
    labelCarryAsMemory: input.governance?.labelCarryAsMemory ?? baseContract.labelCarryAsMemory,
    suppressAssociativeRecall: input.governance?.suppressAssociativeRecall ?? baseContract.suppressAssociativeRecall,
    allowAffectionatePreface: input.governance?.allowAffectionatePreface ?? baseContract.allowAffectionatePreface,
    allowStageDirections: input.governance?.allowStageDirections ?? baseContract.allowStageDirections,
    allowBodyNarration: input.governance?.allowBodyNarration ?? baseContract.allowBodyNarration,
    maxParagraphs: input.governance?.maxParagraphs ?? baseContract.maxParagraphs,
    maxSentences: input.governance?.maxSentences ?? baseContract.maxSentences,
    mustDo: mergedGovernanceRules?.mustDo ?? mergeUniqueRules([
      ...(baseContract.mustDo ?? []),
      ...(input.governance?.mustDo ?? []),
    ]),
    mustNotDo: mergedGovernanceRules?.mustNotDo ?? mergeUniqueRules([
      ...(baseContract.mustNotDo ?? []),
      ...(input.governance?.mustNotDo ?? []),
    ]),
    governingFocus: input.governance?.governingFocus ?? baseContract.governingFocus,
    governingConcern: input.governance?.governingConcern ?? baseContract.governingConcern,
    governingCommitment: input.governance?.governingCommitment ?? baseContract.governingCommitment,
    governingInquiry: input.governance?.governingInquiry ?? baseContract.governingInquiry,
    governingProject: input.governance?.governingProject ?? baseContract.governingProject,
    emotionalClosureCue: input.governance?.emotionalClosureCue ?? baseContract.emotionalClosureCue,
    projectState: projectState ?? null,
    preDialogueClosure: nextClosureTarget
      ? {
          ...(baseContract.preDialogueClosure ?? {
            status: 'partial',
            summaryLine: projectState?.preDialogueAwarenessLine ?? null,
            briefingLines: [],
            reasons: [],
          }),
          summaryLine: projectState?.preDialogueAwarenessLine ?? baseContract.preDialogueClosure?.summaryLine ?? null,
          companionBriefingLine:
            normalizeProviderFacingProjectText(projectState?.companionBriefingLine, 1600)
            ?? baseContract.preDialogueClosure?.companionBriefingLine
            ?? null,
          companionNextClosureLine: nextClosureTarget,
          briefingLines: mergeUniqueRules([
            ...(baseContract.preDialogueClosure?.briefingLines ?? []).filter(line =>
              !/^(?:Project identity|Current phase|Landed continuity progress|Still-open closure gap|Next closure target):/u.test(String(line)),
            ),
            buildStructuredPreDialogueClosureBriefingLine({
              identity: projectState?.identity,
              currentPhase: projectState?.currentPhase,
              latestLandedProgress: projectState?.latestLandedProgress ?? projectState?.latestProgress,
              primaryOpenLoop: projectState?.primaryOpenLoop,
              nextClosureTarget,
              emotionalClosureCue: projectState?.emotionalClosureCue ?? projectState?.emotionalClosureSummary,
              sameHerSelfLine: projectState?.sameHerSelfLine,
            }) ?? '',
          ]),
          reasons: mergeUniqueRules([
            ...(baseContract.preDialogueClosure?.reasons ?? []).filter(reason => reason !== nextClosureTarget),
            nextClosureTarget,
          ]),
        }
      : baseContract.preDialogueClosure ?? null,
    reasons: input.governance?.reasons ?? baseContract.reasons,
    updatedAt: Date.now(),
  } satisfies AlicizationMindTurnContractSnapshot
}

export function normalizeProviderFacingMindTurnContract(
  contract: AlicizationMindTurnContractSnapshot | null,
  rawPayload: AlicizationChatStartPayload | null | undefined,
  runtimeSurface: AlicizationMainChatRuntimeSurface | null,
) {
  if (!contract)
    return null

  const payloadProjectState = readProviderFacingPayloadProjectState(rawPayload)
  const payloadHeadline = payloadProjectState.hasDirectPayloadProjectHeadline
    ? payloadProjectState.explicitPayloadProjectHeadline
    : null
  const selectedRuntimeSurface = resolvePreferredRuntimeSurface({
    preparedRuntimeSurface: runtimeSurface?.digitalLifeRuntimeSurface ?? null,
    spineRuntimeSurface: runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null,
  })
  const liveRuntimeProjectState = readRuntimeProjectStateFromSurface(selectedRuntimeSurface)
  const preparedRuntimeProjectState = readRuntimeProjectStateFromSurface(runtimeSurface?.digitalLifeRuntimeSurface ?? null)
  const spineRuntimeProjectState = readRuntimeProjectStateFromSurface(runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null)
  const directPreparedRuntimeAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
  ], 1600)
  const explicitContractAwarenessLine = normalizeProviderFacingProjectText(
    (contract.projectState as Record<string, unknown> | null)?.preDialogueAwarenessLine
    ?? (contract.projectState as Record<string, unknown> | null)?.awarenessLine,
    1600,
  )
  const preservedDirectPreparedRuntimeAwarenessLine = (
    directPreparedRuntimeAwarenessLine
    && shouldPreserveProjectAwarenessLineVerbatim(
      directPreparedRuntimeAwarenessLine,
      explicitContractAwarenessLine ?? liveRuntimeProjectState.preDialogueAwarenessLine,
    )
  )
    ? directPreparedRuntimeAwarenessLine
    : null
  const shouldPreferDirectPreparedRuntimeAwarenessLine = Boolean(
    preservedDirectPreparedRuntimeAwarenessLine
    && (
      /callback return|same thread/iu.test(preservedDirectPreparedRuntimeAwarenessLine)
      || !explicitContractAwarenessLine
      || isThinProjectAwarenessAuthorityLine(explicitContractAwarenessLine)
      || isCompactProjectStatePreflightSummary(explicitContractAwarenessLine)
    ),
  )
  const preferredExplicitAwarenessLine
    = shouldPreferDirectPreparedRuntimeAwarenessLine
      ? preservedDirectPreparedRuntimeAwarenessLine
      : explicitContractAwarenessLine
  const currentAwarenessLine = explicitContractAwarenessLine
    && preferredExplicitAwarenessLine === explicitContractAwarenessLine
    && shouldPreserveProjectAwarenessLineVerbatim(
      preferredExplicitAwarenessLine,
      liveRuntimeProjectState.preDialogueAwarenessLine,
    )
    ? preferredExplicitAwarenessLine
    : preferredExplicitAwarenessLine
      && preservedDirectPreparedRuntimeAwarenessLine
      ? preferredExplicitAwarenessLine
      : pickProjectAwarenessLineWithoutCompactSummaryShell([
          contract.projectState ? (contract.projectState as Record<string, unknown>).preDialogueAwarenessLine : null,
          contract.projectState ? (contract.projectState as Record<string, unknown>).awarenessLine : null,
          preservedDirectPreparedRuntimeAwarenessLine,
          contract.projectState && !isCompactProjectStatePreflightSummary((contract.projectState as Record<string, unknown>).preDialogueAwarenessSummary)
            ? (contract.projectState as Record<string, unknown>).preDialogueAwarenessSummary
            : null,
          liveRuntimeProjectState.preDialogueAwarenessLine,
          !isCompactProjectStatePreflightSummary(liveRuntimeProjectState.preDialogueAwarenessSummary)
            ? liveRuntimeProjectState.preDialogueAwarenessSummary
            : null,
          resolveProjectStateAwarenessCarry({
            runtimeProjectState: contract.projectState as Record<string, unknown> | null,
            fallbackProjectState: liveRuntimeProjectState as unknown as Record<string, unknown>,
          }),
        ], 1600)
  const canonicalProjectSameHerSelfLine = normalizeProviderFacingProjectText(
    resolveAlicizationProjectStateBrief().sameHerSelfLine,
    1600,
  )
  const preferredRebuiltSameHerSelfLine = (() => {
    const preferredAnySameHerSelfLine = pickPreferredRuntimeProjectStateDetail([
      normalizeProviderFacingProjectText((contract.projectState as Record<string, unknown> | null)?.sameHerSelfLine, 1600),
      liveRuntimeProjectState.sameHerSelfLine,
    ], 'same-her', 1600)
    if (
      preferredAnySameHerSelfLine
      && canonicalProjectSameHerSelfLine
      && preferredAnySameHerSelfLine === canonicalProjectSameHerSelfLine
      && liveRuntimeProjectState.sameHerSelfLine
      && liveRuntimeProjectState.sameHerSelfLine !== canonicalProjectSameHerSelfLine
      && !looksLikeThinRuntimeProjectStateDetail(liveRuntimeProjectState.sameHerSelfLine, 'same-her')
    ) {
      return liveRuntimeProjectState.sameHerSelfLine
    }

    return preferredAnySameHerSelfLine
  })()
  const preferredRebuiltLatestLandedProgress = pickPreferredRuntimeProjectStateDetail([
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.latestLandedProgress
      ?? (contract.projectState as Record<string, unknown> | null)?.latestProgress,
      12000,
    ),
    liveRuntimeProjectState.latestLandedProgress,
    liveRuntimeProjectState.latestProgress,
  ], 'landed', 12000)
  const preferredRebuiltPrimaryOpenLoop = pickPreferredRuntimeProjectStateDetail([
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.primaryOpenLoop,
      12000,
    ),
    liveRuntimeProjectState.primaryOpenLoop,
  ], 'open', 12000)
  const preferredRebuiltNextClosureTarget = pickPreferredRuntimeProjectStateDetail([
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.nextClosureTarget,
      12000,
    ),
    liveRuntimeProjectState.nextClosureTarget,
  ], 'next', 12000)
  const rebuiltAwarenessLine = buildProviderFacingProjectAwarenessLine({
    identity: liveRuntimeProjectState.identity,
    currentPhase: liveRuntimeProjectState.currentPhase,
    sameHerSelfLine: preferredRebuiltSameHerSelfLine,
    latestLandedProgress: preferredRebuiltLatestLandedProgress,
    primaryOpenLoop: preferredRebuiltPrimaryOpenLoop,
    nextClosureTarget: preferredRebuiltNextClosureTarget,
  })
  const payloadAwarenessLine = payloadProjectState.hasDirectPayloadProjectAwarenessLine
    ? resolvePreferredPayloadAwarenessLine({
        awarenessLine: payloadProjectState.explicitPayloadProjectAwarenessLine,
        headlineLine: payloadHeadline,
      })
    : null
  const payloadAwarenessLineLooksThin = Boolean(
    payloadAwarenessLine
    && (
      isThinProjectAwarenessAuthorityLine(payloadAwarenessLine)
      || isCompactProjectStatePreflightSummary(payloadAwarenessLine)
    ),
  )
  const payloadPreflightSummaryLooksThin = Boolean(
    payloadProjectState.explicitPayloadProjectPreflightSummary
    && (
      isThinProjectAwarenessAuthorityLine(payloadProjectState.explicitPayloadProjectPreflightSummary)
      || isCompactProjectStatePreflightSummary(payloadProjectState.explicitPayloadProjectPreflightSummary)
    ),
  )
  const directPayloadPreflightSummary = normalizeProviderFacingProjectText(
    readDirectPayloadPreflightSummary(rawPayload, 1600),
    1600,
  )
  const directPayloadPreflightSummaryLooksThin = Boolean(
    directPayloadPreflightSummary
    && (
      isThinProjectAwarenessAuthorityLine(directPayloadPreflightSummary)
      || isCompactProjectStatePreflightSummary(directPayloadPreflightSummary)
    ),
  )
  const payloadThinPreflightSummaryRequested
    = payloadPreflightSummaryLooksThin || directPayloadPreflightSummaryLooksThin
  const payloadPreflightSummaryHasExplicitSameHerPhase1Carry = Boolean(
    payloadProjectState.explicitPayloadProjectPreflightSummary
    && /same local-first digital life project(?: in)? phase 1|same digital life project(?: in)? phase 1/iu.test(
      payloadProjectState.explicitPayloadProjectPreflightSummary,
    ),
  )
  const rebuildAlreadyCarriesDirectPayloadAwareness = Boolean(
    payloadAwarenessLine
    && normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.preDialogueAwarenessLine,
      1600,
    ) === payloadAwarenessLine,
  )
  const shouldPreferPayloadHeadline = Boolean(
    payloadAwarenessLine
    && !payloadAwarenessLineLooksThin
    && (
      rebuildAlreadyCarriesDirectPayloadAwareness
      || shouldPreserveProjectAwarenessLineVerbatim(
        payloadAwarenessLine,
        rebuiltAwarenessLine ?? currentAwarenessLine,
      )
      || (
        (!carriesExplicitProjectClosureTriplet(rebuiltAwarenessLine)
          || carriesExplicitProjectClosureTriplet(payloadAwarenessLine)
          || hasDistinctEmbodimentClosureCue(payloadAwarenessLine)
          || shouldPreserveProjectAwarenessLineVerbatim(
            payloadAwarenessLine,
            rebuiltAwarenessLine,
          )
          || isStrongerSameHerProjectHeadline(
            payloadAwarenessLine,
            rebuiltAwarenessLine,
          ))
          && (
            (payloadHeadline && isStrongerSameHerProjectHeadline(payloadHeadline))
            || (
              !payloadHeadline
              && !isThinProjectAwarenessAuthorityLine(payloadProjectState.explicitPayloadProjectAwarenessLine)
              && !isThinProjectAwarenessAuthorityLine(payloadAwarenessLine)
            )
            || isStrongerSameHerProjectHeadline(payloadProjectState.explicitPayloadProjectAwarenessLine, currentAwarenessLine)
            || (
              !isThinProjectAwarenessAuthorityLine(payloadAwarenessLine)
              && (
                isThinProjectAwarenessAuthorityLine(currentAwarenessLine)
                || !currentAwarenessLine
              )
            )
          )
      )
    ),
  )
  const shouldPreferPayloadCompanionHeadlineAsAwareness = Boolean(
    payloadHeadline
    && !isThinProjectAwarenessAuthorityLine(payloadHeadline)
    && hasDistinctEmbodimentClosureCue(payloadHeadline)
    && (
      payloadAwarenessLine === payloadHeadline
      || isThinProjectAwarenessAuthorityLine(payloadAwarenessLine)
      || !/same living line|same-her|same her|one living her|one continuous her|同一个 her|同一个她/u.test(
        normalizeProviderFacingProjectText(payloadAwarenessLine, 1600)?.toLowerCase() ?? '',
      )
    )
    && !carriesExplicitProjectClosureTriplet(payloadAwarenessLine)
    && !/phase 1|memory|initiative|generic assistant shell|detached project shell|same-life seam|landed farther/u.test(
      normalizeProviderFacingProjectText(payloadAwarenessLine, 1600)?.toLowerCase() ?? '',
    )
    && (
      !currentAwarenessLine
      || isCanonicalStructuredProjectAwareness(currentAwarenessLine)
      || !hasDistinctEmbodimentClosureCue(currentAwarenessLine)
      || shouldPreserveProjectAwarenessLineVerbatim(payloadHeadline, currentAwarenessLine)
      || isStrongerSameHerProjectHeadline(payloadHeadline, currentAwarenessLine)
    )
    && (!rebuiltAwarenessLine
      || !carriesExplicitProjectClosureTriplet(rebuiltAwarenessLine)
      && !/phase 1|memory|initiative|generic assistant shell|detached project shell|same-life seam|landed farther/u.test(
        rebuiltAwarenessLine.toLowerCase(),
      )
      || shouldPreserveProjectAwarenessLineVerbatim(payloadHeadline, rebuiltAwarenessLine)
      || isStrongerSameHerProjectHeadline(payloadHeadline, rebuiltAwarenessLine)),
  )
  const shouldPreferThinPayloadAwarenessTransportedHeadline = Boolean(
    payloadHeadline
    && !isThinProjectAwarenessAuthorityLine(payloadHeadline)
    && hasDistinctEmbodimentClosureCue(payloadHeadline)
    && /same living line|same-her|same her|one living her|one continuous her/u.test(payloadHeadline.toLowerCase())
    && payloadAwarenessLine
    && isThinProjectAwarenessAuthorityLine(payloadAwarenessLine)
    && rebuiltAwarenessLine
    && /face|motion|lipsync|voice|same-life seam|same living line|one living her|one continuous her/u.test(
      rebuiltAwarenessLine.toLowerCase(),
    ),
  )
  const shouldPreferTransportedPayloadCompanionHeadline = Boolean(
    payloadHeadline
    && !isThinProjectAwarenessAuthorityLine(payloadHeadline)
    && hasDistinctEmbodimentClosureCue(payloadHeadline)
    && /same living line|same-her|same her|one living her|one continuous her/u.test(
      payloadHeadline.toLowerCase(),
    )
    && payloadAwarenessLine
    && (
      isThinProjectAwarenessAuthorityLine(payloadAwarenessLine)
      || !shouldPreserveProjectAwarenessLineVerbatim(payloadAwarenessLine, payloadHeadline)
    )
    && rebuiltAwarenessLine
    && /face|motion|lipsync|voice|same-life seam|same living line|one living her|one continuous her/u.test(
      rebuiltAwarenessLine.toLowerCase(),
    )
    && !shouldPreserveProjectAwarenessLineVerbatim(payloadAwarenessLine, rebuiltAwarenessLine)
    && isStrongerSameHerProjectHeadline(payloadHeadline, rebuiltAwarenessLine),
  )
  const currentAwarenessCarriesExplicitClosureTriplet = carriesExplicitProjectClosureTriplet(currentAwarenessLine)
  const rebuiltAwarenessCarriesExplicitClosureTriplet = carriesExplicitProjectClosureTriplet(rebuiltAwarenessLine)
  const explicitPreparedRuntimeAwarenessSeed = pickProjectAwarenessLineWithoutCompactSummaryShell([
    runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.preDialogueAwarenessSummary,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtime?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtime?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtime?.projectState?.preDialogueAwarenessSummary,
    runtimeSurface?.digitalLifeRuntimeSurface?.cognition?.runtimeDigest?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.cognition?.runtimeDigest?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.cognition?.runtimeDigest?.projectState?.preDialogueAwarenessSummary,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtimeDigest?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtimeDigest?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtimeDigest?.projectState?.preDialogueAwarenessSummary,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtime?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtime?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtime?.projectState?.preDialogueAwarenessSummary,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.cognition?.runtimeDigest?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.cognition?.runtimeDigest?.projectState?.awarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.cognition?.runtimeDigest?.projectState?.preDialogueAwarenessSummary,
  ], 1600)
  const canonicalProjectAwarenessLine = normalizeProviderFacingProjectText(
    resolveAlicizationProjectStateBrief().preDialogueAwarenessLine,
    1600,
  )
  const shouldPreferCanonicalAwarenessFoundation = Boolean(
    !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && currentAwarenessLine
    && !currentAwarenessLine.includes('one continuous "her"')
    && !/memory still needs stronger end-to-end closure/iu.test(currentAwarenessLine)
    && !/live project awareness already|already survives into the current conscious frame|not a new shell|not a fresh shell|rebuilt each turn|provider-facing answer contract before reply authoring|landed farther/iu.test(currentAwarenessLine)
    && !/callback return|same thread/iu.test(currentAwarenessLine)
    && (
      !hasDistinctEmbodimentClosureCue(currentAwarenessLine)
      || currentAwarenessCarriesExplicitClosureTriplet
    ),
  )
  const runtimeCompanionPriorityLine = pickPreferredRuntimeProjectStateDetail([
    (contract.projectState as Record<string, unknown> | null)?.companionHeadlineLine,
    (contract.projectState as Record<string, unknown> | null)?.companionBriefingLine,
    liveRuntimeProjectState.companionHeadlineLine,
    liveRuntimeProjectState.companionBriefingLine,
  ], 'awareness', 1600)
  const runtimeCompanionPriorityLineIsSpecificEmbodimentHeadline = Boolean(
    runtimeCompanionPriorityLine
    && hasModalitySpecificEmbodimentCue(runtimeCompanionPriorityLine)
    && !carriesExplicitProjectClosureTriplet(runtimeCompanionPriorityLine)
    && !isCanonicalStructuredProjectAwareness(runtimeCompanionPriorityLine),
  )
  const runtimeCompanionPriorityLineIsSpecificSameHerAuthority = Boolean(
    runtimeCompanionPriorityLine
    && carriesSpecificSameHerAuthorityLine(runtimeCompanionPriorityLine)
    && !carriesExplicitProjectClosureTriplet(runtimeCompanionPriorityLine)
    && !isCanonicalStructuredProjectAwareness(runtimeCompanionPriorityLine),
  )
  const runtimeCompanionWouldOverNarrowCurrentAwareness = Boolean(
    runtimeCompanionPriorityLine
    && currentAwarenessLine
    && !carriesSpecificSameHerAuthorityLine(runtimeCompanionPriorityLine)
    && !isThinProjectAwarenessAuthorityLine(currentAwarenessLine)
    && /phase 1|memory|initiative|embodiment|closure/u.test(currentAwarenessLine.toLowerCase())
    && hasDistinctEmbodimentClosureCue(runtimeCompanionPriorityLine)
    && !/phase 1|memory|initiative|closure/u.test(runtimeCompanionPriorityLine.toLowerCase()),
  )
  const shouldPreferRuntimeCompanionHeadline = Boolean(
    runtimeCompanionPriorityLine
    && runtimeCompanionPriorityLineIsSpecificSameHerAuthority
    && !shouldPreferPayloadHeadline
    && (
      !shouldPreferCanonicalAwarenessFoundation
      || runtimeCompanionPriorityLineIsSpecificSameHerAuthority
    )
    && !runtimeCompanionWouldOverNarrowCurrentAwareness
    && (
      !isCompactProjectStatePreflightSummary(runtimeCompanionPriorityLine)
      || runtimeCompanionPriorityLineIsSpecificSameHerAuthority
    )
    && (
      isStrongerSameHerProjectHeadline(runtimeCompanionPriorityLine, currentAwarenessLine)
      || isStrongerSameHerProjectHeadline(runtimeCompanionPriorityLine, rebuiltAwarenessLine)
      || isThinProjectAwarenessAuthorityLine(currentAwarenessLine)
      || runtimeCompanionPriorityLineIsSpecificEmbodimentHeadline
      || runtimeCompanionPriorityLineIsSpecificSameHerAuthority
    ),
  )
  const strongerCompanionHeadlineCandidate = pickProjectAwarenessLineWithoutCompactSummaryShell([
    (contract.projectState as Record<string, unknown> | null)?.companionHeadlineLine,
    liveRuntimeProjectState.companionHeadlineLine,
    runtimeCompanionPriorityLine,
  ], 1600)
  const rebuiltRuntimeCarryLatestLandedProgress = normalizeProviderFacingProjectText(
    preferredRebuiltLatestLandedProgress,
    1600,
  )
  const rebuiltRuntimeCarryPrimaryOpenLoop = normalizeProviderFacingProjectText(
    preferredRebuiltPrimaryOpenLoop,
    1600,
  )
  const rebuiltRuntimeCarryNextClosureTarget = normalizeProviderFacingProjectText(
    preferredRebuiltNextClosureTarget,
    1600,
  )
  const currentAwarenessLineMissesSpecificRuntimeCarry = Boolean(
    rebuiltAwarenessLine
    && currentAwarenessLine
    && isCanonicalStructuredProjectAwareness(currentAwarenessLine)
    && carriesProjectIdentityAnchor(rebuiltAwarenessLine)
    && (
      (
        rebuiltRuntimeCarryLatestLandedProgress
        && !currentAwarenessLine.includes(rebuiltRuntimeCarryLatestLandedProgress)
        && rebuiltAwarenessLine.includes(rebuiltRuntimeCarryLatestLandedProgress)
      )
      || (
        rebuiltRuntimeCarryPrimaryOpenLoop
        && !currentAwarenessLine.includes(rebuiltRuntimeCarryPrimaryOpenLoop)
        && rebuiltAwarenessLine.includes(rebuiltRuntimeCarryPrimaryOpenLoop)
      )
      || (
        rebuiltRuntimeCarryNextClosureTarget
        && !currentAwarenessLine.includes(rebuiltRuntimeCarryNextClosureTarget)
        && rebuiltAwarenessLine.includes(rebuiltRuntimeCarryNextClosureTarget)
      )
    ),
  )
  const shouldPreferRebuiltRuntimeCarryAwareness = Boolean(
    explicitPreparedRuntimeAwarenessSeed
    && rebuiltAwarenessLine
    && currentAwarenessLine
    && !/callback return|same thread/iu.test(currentAwarenessLine)
    && (
      currentAwarenessLineMissesSpecificRuntimeCarry
      || (
        isCanonicalStructuredProjectAwareness(currentAwarenessLine)
        && !shouldPreserveProjectAwarenessLineVerbatim(currentAwarenessLine, rebuiltAwarenessLine)
        && !hasDistinctEmbodimentClosureCue(currentAwarenessLine)
        && awarenessLineMissesRuntimeCarry({
          awarenessLine: currentAwarenessLine,
          latestLandedProgress: liveRuntimeProjectState.latestLandedProgress,
          primaryOpenLoop: liveRuntimeProjectState.primaryOpenLoop,
          nextClosureTarget: liveRuntimeProjectState.nextClosureTarget,
        })
        && !awarenessLineMissesRuntimeCarry({
          awarenessLine: rebuiltAwarenessLine,
          latestLandedProgress: liveRuntimeProjectState.latestLandedProgress,
          primaryOpenLoop: liveRuntimeProjectState.primaryOpenLoop,
          nextClosureTarget: liveRuntimeProjectState.nextClosureTarget,
        })
      )
      || (
        /one living her|same unfinished closure work|same phase 1 digital life|same living her|still belongs to one living her/iu.test(
          currentAwarenessLine,
        )
        && currentAwarenessLineMissesSpecificRuntimeCarry
        && !shouldPreserveProjectAwarenessLineVerbatim(currentAwarenessLine, rebuiltAwarenessLine)
        && !awarenessLineMissesRuntimeCarry({
          awarenessLine: rebuiltAwarenessLine,
          latestLandedProgress: liveRuntimeProjectState.latestLandedProgress,
          primaryOpenLoop: liveRuntimeProjectState.primaryOpenLoop,
          nextClosureTarget: liveRuntimeProjectState.nextClosureTarget,
        })
      )
    ),
  )
  const shouldForceRebuiltRuntimeCarryOverCanonicalCurrent = Boolean(
    !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && !payloadProjectState.hasDirectPayloadProjectHeadline
    && payloadPreflightSummaryLooksThin
    && currentAwarenessLineMissesSpecificRuntimeCarry
    && shouldPreferRebuiltRuntimeCarryAwareness,
  )
  const finalAwarenessLine = shouldPreferPayloadHeadline
    ? (
        payloadHeadline
        && !isThinProjectAwarenessAuthorityLine(payloadHeadline)
        && (
          payloadAwarenessLine === payloadHeadline
          || isStrongerSameHerProjectHeadline(payloadHeadline, payloadAwarenessLine)
        )
          ? payloadHeadline
          : payloadAwarenessLine
      )
    : shouldPreferThinPayloadAwarenessTransportedHeadline
      ? payloadHeadline
      : shouldPreferTransportedPayloadCompanionHeadline
        ? payloadHeadline
        : shouldPreferPayloadCompanionHeadlineAsAwareness
          ? payloadHeadline
          : shouldPreferRuntimeCompanionHeadline
            ? runtimeCompanionPriorityLine
            : shouldForceRebuiltRuntimeCarryOverCanonicalCurrent
              ? rebuiltAwarenessLine
              : shouldPreferRebuiltRuntimeCarryAwareness
                ? rebuiltAwarenessLine
                : shouldPreferCanonicalAwarenessFoundation
                  ? canonicalProjectAwarenessLine
                  : currentAwarenessLine
                    && !isThinProjectAwarenessAuthorityLine(currentAwarenessLine)
                    && (
                      currentAwarenessCarriesExplicitClosureTriplet
                      || carriesSpecificSameHerAuthorityLine(currentAwarenessLine)
                      || shouldPreserveProjectAwarenessLineVerbatim(currentAwarenessLine, rebuiltAwarenessLine)
                      || (
                        !rebuiltAwarenessCarriesExplicitClosureTriplet
                        && isStrongerSameHerProjectHeadline(currentAwarenessLine, rebuiltAwarenessLine)
                      )
                      || (
                        hasDistinctEmbodimentClosureCue(currentAwarenessLine)
                        && isStrongerSameHerProjectHeadline(currentAwarenessLine, rebuiltAwarenessLine)
                      )
                    )
                    ? currentAwarenessLine
                    : rebuiltAwarenessLine
                      ?? currentAwarenessLine
                      ?? payloadAwarenessLine
                      ?? canonicalProjectAwarenessLine
  const rescuedRuntimeAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    rebuiltAwarenessLine,
    runtimeCompanionPriorityLine,
    liveRuntimeProjectState.preDialogueAwarenessLine,
    liveRuntimeProjectState.companionHeadlineLine,
    liveRuntimeProjectState.preDialogueAwarenessSummary,
  ], 1600)
  const shouldKeepFinalAwarenessLineVerbatim = shouldPreserveProjectAwarenessLineVerbatim(
    finalAwarenessLine,
    rescuedRuntimeAwarenessLine,
  )
  const rescuedRuntimeAwarenessLineCarriesLivingSameHerClosure = Boolean(
    rescuedRuntimeAwarenessLine
    && /unfinished closure|same unfinished closure work|same living her|one living her|same phase 1 digital life|one same her|same living line|one continuous her/iu.test(
      rescuedRuntimeAwarenessLine,
    )
    && /local-first digital life|same local-first digital life|数字生命/iu.test(rescuedRuntimeAwarenessLine),
  )
  const finalAwarenessLineMissesLivingSameHerClosure = !/unfinished closure|same unfinished closure work|same living her|one living her|same phase 1 digital life|one same her|same living line|one continuous her/iu.test(
    finalAwarenessLine ?? '',
  )
  const rescuedFinalAwarenessLine = shouldKeepFinalAwarenessLineVerbatim
    ? finalAwarenessLine
    : (
        rescuedRuntimeAwarenessLine
        && !isThinProjectAwarenessAuthorityLine(rescuedRuntimeAwarenessLine)
        && (
          (finalAwarenessLine && isThinProjectAwarenessAuthorityLine(finalAwarenessLine))
          || (
            rescuedRuntimeAwarenessLineCarriesLivingSameHerClosure
            && finalAwarenessLineMissesLivingSameHerClosure
          )
        )
      )
        ? rescuedRuntimeAwarenessLine
        : finalAwarenessLine
  const preparedRuntimePreflightAwarenessLine = [
    runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
  ]
    .map(value => normalizeProviderFacingProjectText(value, 1600))
    .find(value =>
      value
      && !containsAlicizationFixedTemplateResidue(value)
      && !isLegacyProjectAwarenessTemplateShell(value)
      && !isThinProjectAwarenessAuthorityLine(value)
      && !isCompactProjectStatePreflightSummary(value)
      && (
        shouldPreserveProjectAwarenessLineVerbatim(value, rescuedFinalAwarenessLine)
        || /(?:^|\|\s*)(identity|phase|landed|open|next|continuity_anchor)=|phase1_local_digital_life|project_state_review|runtime_loop_validation/iu.test(value)
      ),
    )
    ?? null
  const shouldPreferPreparedRuntimePreflightAwareness = Boolean(
    preparedRuntimePreflightAwarenessLine
    && !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && !payloadProjectState.hasDirectPayloadProjectHeadline
    && rescuedFinalAwarenessLine
    && !isLegacyProjectAwarenessTemplateShell(rescuedFinalAwarenessLine)
    && awarenessCarriesBroaderProjectFrame(rescuedFinalAwarenessLine)
    && (
      !currentAwarenessLine
      || isThinProjectAwarenessAuthorityLine(currentAwarenessLine)
      || isCompactProjectStatePreflightSummary(currentAwarenessLine)
      || isLegacyProjectAwarenessTemplateShell(currentAwarenessLine)
    )
    && shouldPreserveProjectAwarenessLineVerbatim(
      preparedRuntimePreflightAwarenessLine,
      rescuedFinalAwarenessLine,
    ),
  )
  const shouldPreferExactRuntimeCompanionHeadline = Boolean(
    runtimeCompanionPriorityLine
    && runtimeCompanionPriorityLineIsSpecificSameHerAuthority
    && !shouldPreferPayloadHeadline
    && !shouldPreferPayloadCompanionHeadlineAsAwareness
    && !shouldPreferThinPayloadAwarenessTransportedHeadline
    && !shouldPreferTransportedPayloadCompanionHeadline
    && !isThinProjectAwarenessAuthorityLine(runtimeCompanionPriorityLine)
    && (
      shouldPreserveProjectAwarenessLineVerbatim(runtimeCompanionPriorityLine, rescuedFinalAwarenessLine)
      || isStrongerSameHerProjectHeadline(runtimeCompanionPriorityLine, rescuedFinalAwarenessLine)
    ),
  )
  const effectiveFinalAwarenessLine = shouldPreferExactRuntimeCompanionHeadline
    ? runtimeCompanionPriorityLine
    : shouldPreferPreparedRuntimePreflightAwareness
      ? preparedRuntimePreflightAwarenessLine
      : rescuedFinalAwarenessLine
  const focusedCompanionHeadlineCandidate = [
    runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.companionHeadlineLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.companionHeadlineLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtime?.projectState?.companionHeadlineLine,
    runtimeSurface?.digitalLifeRuntimeSurface?.cognition?.runtimeDigest?.projectState?.companionHeadlineLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.companionHeadlineLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtimeDigest?.projectState?.companionHeadlineLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtime?.projectState?.companionHeadlineLine,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.cognition?.runtimeDigest?.projectState?.companionHeadlineLine,
    preparedRuntimeProjectState.companionHeadlineLine,
    spineRuntimeProjectState.companionHeadlineLine,
    (contract.projectState as Record<string, unknown> | null)?.companionHeadlineLine,
    liveRuntimeProjectState.companionHeadlineLine,
  ]
    .map(value => normalizeProviderFacingProjectText(value, 1600))
    .find(value =>
      value
      && !isThinProjectAwarenessAuthorityLine(value)
      && !carriesExplicitProjectClosureTriplet(value)
      && !isCanonicalStructuredProjectAwareness(value),
    )
    ?? normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.companionHeadlineLine,
      1600,
    )
    ?? normalizeProviderFacingProjectText(liveRuntimeProjectState.companionHeadlineLine, 1600)
  const focusedSameHerAwarenessHeadline = (
    currentAwarenessLine
    && !carriesExplicitProjectClosureTriplet(currentAwarenessLine)
    && shouldPreserveProjectAwarenessLineVerbatim(currentAwarenessLine, finalAwarenessLine)
  )
    ? currentAwarenessLine
    : null
  const preservedFocusedCompanionHeadline = focusedSameHerAwarenessHeadline
    ?? (
      focusedCompanionHeadlineCandidate
      && !carriesExplicitProjectClosureTriplet(focusedCompanionHeadlineCandidate)
      && shouldPreserveProjectAwarenessLineVerbatim(
        focusedCompanionHeadlineCandidate,
        finalAwarenessLine,
      )
        ? focusedCompanionHeadlineCandidate
        : null
    )
  const finalCompanionHeadlineLine = shouldPreferPayloadHeadline
    ? (payloadHeadline ?? payloadProjectState.explicitPayloadProjectAwarenessLine)
    : shouldPreferPayloadCompanionHeadlineAsAwareness
      ? payloadHeadline
      : shouldPreferRuntimeCompanionHeadline
        ? runtimeCompanionPriorityLine
        : preservedFocusedCompanionHeadline
          && !isThinProjectAwarenessAuthorityLine(preservedFocusedCompanionHeadline)
          ? preservedFocusedCompanionHeadline
          : strongerCompanionHeadlineCandidate
            && (
              shouldPreserveProjectAwarenessLineVerbatim(
                strongerCompanionHeadlineCandidate,
                finalAwarenessLine,
              )
              || isStrongerSameHerProjectHeadline(
                strongerCompanionHeadlineCandidate,
                finalAwarenessLine,
              )
            )
            ? strongerCompanionHeadlineCandidate
            : payloadHeadline && isStrongerSameHerProjectHeadline(
              payloadHeadline,
              (contract.projectState as Record<string, unknown> | null)?.companionHeadlineLine,
            )
              ? payloadHeadline
              : normalizeProviderFacingProjectText(
                (contract.projectState as Record<string, unknown> | null)?.companionHeadlineLine,
                1600,
              )
              ?? liveRuntimeProjectState.companionHeadlineLine
              ?? effectiveFinalAwarenessLine
  const shouldPreferPayloadPreflightSummary = Boolean(
    payloadProjectState.hasDirectPayloadProjectPreflightSummary
    && payloadProjectState.explicitPayloadProjectPreflightSummary
    && !payloadPreflightSummaryLooksThin
    && (
      shouldPreferPayloadHeadline
      || !normalizeProviderFacingProjectText(
        (contract.projectState as Record<string, unknown> | null)?.preflightSummary,
        1600,
      )
      || isThinProjectAwarenessAuthorityLine((contract.projectState as Record<string, unknown> | null)?.preflightSummary)
      || isCompactProjectStatePreflightSummary((contract.projectState as Record<string, unknown> | null)?.preflightSummary)
      || (
        payloadPreflightSummaryHasExplicitSameHerPhase1Carry
        && !/same local-first digital life project(?: in)? phase 1|same digital life project(?: in)? phase 1/iu.test(
          normalizeProviderFacingProjectText(
            (contract.projectState as Record<string, unknown> | null)?.preflightSummary,
            1600,
          ) ?? liveRuntimeProjectState.preflightSummary ?? '',
        )
      )
    ),
  )
  const finalPreflightSummary = shouldPreferPayloadPreflightSummary
    ? payloadProjectState.explicitPayloadProjectPreflightSummary
    : pickPreferredProjectPreflightSummary([
        normalizeProviderFacingProjectText(
          (contract.projectState as Record<string, unknown> | null)?.preflightSummary,
          1600,
        ),
        liveRuntimeProjectState.preflightSummary,
        normalizeProviderFacingProjectText(resolveAlicizationProjectStateBrief().preflightSummary, 1600),
      ], 1600)
  const finalSameHerDriftRisk = payloadProjectState.hasDirectPayloadProjectSameHerDriftRisk
    ? payloadProjectState.explicitPayloadProjectSameHerDriftRisk
    : (
        normalizeProviderFacingProjectText(
          (contract.projectState as Record<string, unknown> | null)?.sameHerDriftRisk,
          1600,
        )
        ?? liveRuntimeProjectState.sameHerDriftRisk
      )
  const currentAwarenessNeedsProjectStatePreflightRescue = Boolean(
    !currentAwarenessLine
    || isThinProjectAwarenessAuthorityLine(currentAwarenessLine)
    || isCompactProjectStatePreflightSummary(currentAwarenessLine)
    || isLegacyProjectAwarenessTemplateShell(currentAwarenessLine),
  )
  const effectiveFinalAwarenessCarriesBroadPhase1ProjectClosureFrame = Boolean(
    effectiveFinalAwarenessLine
    && /phase 1/iu.test(effectiveFinalAwarenessLine)
    && /local-first digital life project|same local-first digital life project|same digital life project/iu.test(
      effectiveFinalAwarenessLine,
    )
    && (
      /live project awareness already survives|what has already landed is|already survives into the current conscious frame/iu.test(
        effectiveFinalAwarenessLine,
      )
      || /memory|initiative|embodiment|still-open closure|same-life seam/iu.test(
        effectiveFinalAwarenessLine,
      )
      || /current project-state awareness explicit|first visible answer beat|this reply should keep moving toward/iu.test(
        effectiveFinalAwarenessLine,
      )
    ),
  )
  const finalAwarenessCarriesPhase1SameHerFollowThrough = Boolean(
    effectiveFinalAwarenessLine
    && /phase 1/iu.test(effectiveFinalAwarenessLine)
    && /same digital life|same living line|same-her|same her|one continuous her/iu.test(effectiveFinalAwarenessLine)
    && (
      /what has already landed is|the still-open closure is|this reply should keep moving toward/iu.test(effectiveFinalAwarenessLine)
      || /memory still needs stronger end-to-end closure|keep extending cross-modal same-her proof/iu.test([
        liveRuntimeProjectState.primaryOpenLoop,
        liveRuntimeProjectState.nextClosureTarget,
      ].filter(Boolean).join(' '))
    ),
  )
  const shouldCarryPhase1ProjectStateAnswerGovernance = Boolean(
    !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && (
      (
        isPhase1ProjectStatePreflightAwarenessLine(effectiveFinalAwarenessLine)
        && (
          shouldPreferCanonicalAwarenessFoundation
          || currentAwarenessNeedsProjectStatePreflightRescue
        )
      )
      || finalAwarenessCarriesPhase1SameHerFollowThrough
      || (
        payloadThinPreflightSummaryRequested
        && currentAwarenessNeedsProjectStatePreflightRescue
        && effectiveFinalAwarenessCarriesBroadPhase1ProjectClosureFrame
      )
    ),
  )
  const phase1ProjectStatePreflightRescueAwarenessLine = (
    !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && !payloadProjectState.hasDirectPayloadProjectHeadline
    && payloadThinPreflightSummaryRequested
    && currentAwarenessNeedsProjectStatePreflightRescue
    && effectiveFinalAwarenessLine
    && !carriesSpecificSameHerAuthorityLine(effectiveFinalAwarenessLine)
    && !hasModalitySpecificEmbodimentCue(effectiveFinalAwarenessLine)
    && shouldCarryPhase1ProjectStateAnswerGovernance
  )
    ? buildProviderFacingProjectAwarenessLine({
        identity: liveRuntimeProjectState.identity,
        currentPhase: liveRuntimeProjectState.currentPhase,
        sameHerSelfLine: liveRuntimeProjectState.sameHerSelfLine,
        latestLandedProgress: liveRuntimeProjectState.latestLandedProgress,
        primaryOpenLoop: liveRuntimeProjectState.primaryOpenLoop,
        nextClosureTarget: liveRuntimeProjectState.nextClosureTarget,
      })
    : null
  const finalProjectStateAwarenessLine = phase1ProjectStatePreflightRescueAwarenessLine
    ?? effectiveFinalAwarenessLine
  const providerSafeFinalProjectStateAwarenessLine = isLegacyProjectAwarenessTemplateShell(finalProjectStateAwarenessLine)
    ? buildProviderFacingProjectAwarenessLine({
        identity: liveRuntimeProjectState.identity,
        currentPhase: liveRuntimeProjectState.currentPhase,
        sameHerSelfLine: liveRuntimeProjectState.sameHerSelfLine,
        latestLandedProgress: preferredRebuiltLatestLandedProgress ?? liveRuntimeProjectState.latestLandedProgress,
        primaryOpenLoop: preferredRebuiltPrimaryOpenLoop ?? liveRuntimeProjectState.primaryOpenLoop,
        nextClosureTarget: preferredRebuiltNextClosureTarget ?? liveRuntimeProjectState.nextClosureTarget,
      })
    : finalProjectStateAwarenessLine
  const providerSafeFinalCompanionHeadlineLine = isLegacyProjectAwarenessTemplateShell(finalCompanionHeadlineLine)
    ? providerSafeFinalProjectStateAwarenessLine
    : finalCompanionHeadlineLine
  const providerSafeFinalProjectStateAwarenessSummary = (() => {
    const existingSummary = normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.preDialogueAwarenessSummary,
      1600,
    )
    if (
      existingSummary
      && !isLegacyProjectAwarenessTemplateShell(existingSummary)
      && !isThinProjectAwarenessAuthorityLine(existingSummary)
      && !isCompactProjectStatePreflightSummary(existingSummary)
      && (!/callback return|same thread/iu.test(existingSummary)
        || carriesExplicitProjectClosureTriplet(existingSummary))
    ) {
      return existingSummary
    }

    const awarenessLineIsOpeningOnly = Boolean(
      providerSafeFinalProjectStateAwarenessLine
      && /callback return|same thread/iu.test(providerSafeFinalProjectStateAwarenessLine)
      && !carriesExplicitProjectClosureTriplet(providerSafeFinalProjectStateAwarenessLine),
    )
    if (!awarenessLineIsOpeningOnly)
      return providerSafeFinalProjectStateAwarenessLine

    return buildProviderFacingProjectAwarenessLine({
      identity: liveRuntimeProjectState.identity,
      currentPhase: liveRuntimeProjectState.currentPhase,
      sameHerSelfLine: liveRuntimeProjectState.sameHerSelfLine,
      latestLandedProgress: preferredRebuiltLatestLandedProgress ?? liveRuntimeProjectState.latestLandedProgress,
      primaryOpenLoop: preferredRebuiltPrimaryOpenLoop ?? liveRuntimeProjectState.primaryOpenLoop,
      nextClosureTarget: preferredRebuiltNextClosureTarget ?? liveRuntimeProjectState.nextClosureTarget,
    }) ?? providerSafeFinalProjectStateAwarenessLine
  })()
  const incomingContractAwarenessShell = normalizeProviderFacingProjectText(
    (contract.projectState as Record<string, unknown> | null)?.preDialogueAwarenessLine
    ?? (contract.projectState as Record<string, unknown> | null)?.awarenessLine,
    1600,
  )
  const contractAnswerSubject = normalizeProviderFacingProjectText(
    (contract as { answerSubject?: unknown }).answerSubject,
    64,
  )
  const shouldEnrichNormalizedProjectStateGovernance = Boolean(
    shouldCarryPhase1ProjectStateAnswerGovernance
    || contractAnswerSubject === 'project-state',
  )
  const normalizedAnswerGovernance = shouldEnrichNormalizedProjectStateGovernance
    ? enrichProjectStateAnswerGovernanceIfNeeded({
        answerSubject: 'project-state',
        answerIntent: contract.answerIntent ?? null,
        governingFocus: contract.governingFocus ?? null,
        governingProject: contract.governingProject ?? null,
        reasons: contract.reasons ?? [],
        mustDo: [...(contract.mustDo ?? [])],
        mustNotDo: [...(contract.mustNotDo ?? [])],
      })
    : null
  const normalizedMustNotDo = (
    (
      (
        incomingContractAwarenessShell
        && (
          isThinProjectAwarenessAuthorityLine(incomingContractAwarenessShell)
          || isCompactProjectStatePreflightSummary(incomingContractAwarenessShell)
        )
      )
      || (contract.reasons ?? []).some(reason => /thin incoming project-status shell|project-status shell/iu.test(String(reason)))
    )
    && finalAwarenessLine
    && /same digital life|same living line|same-her|same her|one continuous her|phase 1/iu.test(finalAwarenessLine)
  )
    ? mergeUniqueRules([
        ...(normalizedAnswerGovernance?.mustNotDo ?? contract.mustNotDo ?? []),
        'continuity_surface=preserve_structured_context; detached_project_narrator_shell=blocked',
      ])
    : normalizedAnswerGovernance?.mustNotDo ?? contract.mustNotDo
  const preferredNormalizedLatestLandedProgress = pickPreferredRuntimeProjectStateDetail([
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.latestLandedProgress
      ?? (contract.projectState as Record<string, unknown> | null)?.latestProgress,
      12000,
    ),
    liveRuntimeProjectState.latestLandedProgress,
  ], 'landed', 12000)
  const preferredNormalizedPrimaryOpenLoop = pickPreferredRuntimeProjectStateDetail([
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.primaryOpenLoop,
      12000,
    ),
    liveRuntimeProjectState.primaryOpenLoop,
  ], 'open', 12000)
  const preferredNormalizedNextClosureTarget = pickPreferredRuntimeProjectStateDetail([
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.nextClosureTarget,
      12000,
    ),
    liveRuntimeProjectState.nextClosureTarget,
  ], 'next', 12000)
  const canonicalSameHerHoldDetail = normalizeProviderFacingProjectText(
    resolveAlicizationProjectStateBrief().sameHerHoldDetail,
    1600,
  )
  const explicitRuntimeSameHerHoldDetail = pickPreferredRuntimeProjectStateDetail([
    runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.sameHerHoldDetail,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.sameHerHoldDetail,
    runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtime?.projectState?.sameHerHoldDetail,
    runtimeSurface?.digitalLifeRuntimeSurface?.cognition?.runtimeDigest?.projectState?.sameHerHoldDetail,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.sameHerHoldDetail,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtimeDigest?.projectState?.sameHerHoldDetail,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.raw?.runtime?.projectState?.sameHerHoldDetail,
    runtimeSurface?.digitalLifeSpine?.runtimeSurface?.cognition?.runtimeDigest?.projectState?.sameHerHoldDetail,
  ], 'same-her', 1600)
  const preferredNormalizedSameHerHoldDetail = pickPreferredRuntimeProjectStateDetail([
    liveRuntimeProjectState.sameHerHoldDetail,
    spineRuntimeProjectState.sameHerHoldDetail,
    preparedRuntimeProjectState.sameHerHoldDetail,
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.sameHerHoldDetail,
      1600,
    ),
  ], 'same-her', 1600)
  const rescuedNormalizedSameHerHoldDetail = (
    preferredNormalizedSameHerHoldDetail
    && canonicalSameHerHoldDetail
    && preferredNormalizedSameHerHoldDetail === canonicalSameHerHoldDetail
    && explicitRuntimeSameHerHoldDetail
    && explicitRuntimeSameHerHoldDetail !== canonicalSameHerHoldDetail
    && !looksLikeThinRuntimeProjectStateDetail(explicitRuntimeSameHerHoldDetail, 'same-her')
  )
    ? explicitRuntimeSameHerHoldDetail
    : preferredNormalizedSameHerHoldDetail
  const preferredNormalizedContinuityCue = pickPreferredRuntimeProjectStateDetail([
    liveRuntimeProjectState.continuityCue,
    spineRuntimeProjectState.continuityCue,
    preparedRuntimeProjectState.continuityCue,
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.continuityCue,
      1600,
    ),
  ], 'awareness', 1600)
  const preferredNormalizedContinuityArcStage = [
    liveRuntimeProjectState.continuityArcStage,
    spineRuntimeProjectState.continuityArcStage,
    preparedRuntimeProjectState.continuityArcStage,
    normalizeProviderFacingProjectText(
      (contract.projectState as Record<string, unknown> | null)?.continuityArcStage,
      120,
    ),
  ]
    .map(value => normalizeProviderFacingProjectText(value, 120))
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => {
      const score = (value: string) => {
        if (value === 'same-thread-continuation')
          return 4
        if (value === 'next-open-window')
          return 3
        if (value === 'hold-for-opening')
          return 2
        return 1
      }
      return score(right) - score(left)
    })[0] ?? null
  const normalizedContract = overrideMindTurnContractNextClosureTarget({
    contract: {
      ...contract,
      mustDo: normalizedAnswerGovernance?.mustDo ?? contract.mustDo,
      mustNotDo: normalizedMustNotDo,
      projectState: {
        ...contract.projectState,
        ...liveRuntimeProjectState,
        preflightSummary: finalPreflightSummary ?? null,
        preDialogueAwarenessLine: providerSafeFinalProjectStateAwarenessLine ?? null,
        awarenessLine: providerSafeFinalProjectStateAwarenessLine ?? null,
        preDialogueAwarenessSummary: providerSafeFinalProjectStateAwarenessSummary ?? null,
        companionHeadlineLine: providerSafeFinalCompanionHeadlineLine ?? providerSafeFinalProjectStateAwarenessLine ?? null,
        companionBriefingLine:
          normalizeProviderFacingProjectText(
            (contract.projectState as Record<string, unknown> | null)?.companionBriefingLine,
            1600,
          )
          ?? liveRuntimeProjectState.companionBriefingLine
          ?? null,
        latestLandedProgress: preferredNormalizedLatestLandedProgress ?? null,
        latestProgress: preferredNormalizedLatestLandedProgress ?? null,
        primaryOpenLoop: preferredNormalizedPrimaryOpenLoop ?? null,
        nextClosureTarget: preferredNormalizedNextClosureTarget ?? null,
        sameHerHoldDetail: rescuedNormalizedSameHerHoldDetail ?? null,
        sameHerDriftRisk: finalSameHerDriftRisk ?? null,
        sameHerDriftRiskSummary: finalSameHerDriftRisk ?? null,
        emotionalClosureSummary:
          pickPreferredRuntimeProjectStateDetail([
            (contract.projectState as Record<string, unknown> | null)?.emotionalClosureSummary,
            liveRuntimeProjectState.emotionalClosureSummary,
            spineRuntimeProjectState.emotionalClosureSummary,
            preparedRuntimeProjectState.emotionalClosureSummary,
          ], 'awareness', 1600)
          ?? null,
        continuityRestraint:
          pickPreferredContinuityRestraint([
            (contract.projectState as Record<string, unknown> | null)?.continuityRestraint,
            liveRuntimeProjectState.continuityRestraint,
            spineRuntimeProjectState.continuityRestraint,
            preparedRuntimeProjectState.continuityRestraint,
          ])
          ?? null,
        continuityArcStage: preferredNormalizedContinuityArcStage,
        continuityCue: preferredNormalizedContinuityCue ?? null,
        continuityPreferredTiming:
          pickProviderFacingContinuityPreferredTiming([
            (contract.projectState as Record<string, unknown> | null)?.continuityPreferredTiming,
            liveRuntimeProjectState.continuityPreferredTiming,
            spineRuntimeProjectState.continuityPreferredTiming,
            preparedRuntimeProjectState.continuityPreferredTiming,
          ]),
        continuityCadence:
          pickProviderFacingContinuityCadence([
            (contract.projectState as Record<string, unknown> | null)?.continuityCadence,
            liveRuntimeProjectState.continuityCadence,
            spineRuntimeProjectState.continuityCadence,
            preparedRuntimeProjectState.continuityCadence,
          ]),
        preferredBlinkCadence:
          normalizeProviderFacingProjectText(
            (contract.projectState as Record<string, unknown> | null)?.preferredBlinkCadence,
            32,
          )
          ?? liveRuntimeProjectState.preferredBlinkCadence
          ?? spineRuntimeProjectState.preferredBlinkCadence
          ?? preparedRuntimeProjectState.preferredBlinkCadence
          ?? null,
        preferredGazeMode:
          normalizeProviderFacingProjectText(
            (contract.projectState as Record<string, unknown> | null)?.preferredGazeMode,
            32,
          )
          ?? liveRuntimeProjectState.preferredGazeMode
          ?? spineRuntimeProjectState.preferredGazeMode
          ?? preparedRuntimeProjectState.preferredGazeMode
          ?? null,
        preferredVoiceMode:
          normalizeProviderFacingVoiceMode(
            (contract.projectState as Record<string, unknown> | null)?.preferredVoiceMode,
          )
          ?? liveRuntimeProjectState.preferredVoiceMode
          ?? spineRuntimeProjectState.preferredVoiceMode
          ?? preparedRuntimeProjectState.preferredVoiceMode
          ?? null,
        preferredPacingMode:
          normalizeProviderFacingPacingMode(
            (contract.projectState as Record<string, unknown> | null)?.preferredPacingMode,
          )
          ?? liveRuntimeProjectState.preferredPacingMode
          ?? spineRuntimeProjectState.preferredPacingMode
          ?? preparedRuntimeProjectState.preferredPacingMode
          ?? null,
      } as AlicizationMindTurnContractSnapshot['projectState'] & Record<string, unknown>,
    } satisfies AlicizationMindTurnContractSnapshot,
    nextClosureTarget: pickPreferredRuntimeProjectStateDetail([
      payloadProjectState.hasDirectPayloadNextClosureTarget
        ? payloadProjectState.explicitPayloadNextClosureTarget
        : null,
      normalizeProviderFacingProjectText(
        (contract.projectState as Record<string, unknown> | null)?.nextClosureTarget,
        1600,
      ),
      liveRuntimeProjectState.nextClosureTarget,
    ], 'next', 1600),
  })

  return normalizedContract
    ? {
        ...normalizedContract,
        projectState: sanitizeProviderFacingProjectStateRecord(
          normalizedContract.projectState as Record<string, unknown> | null,
        ) as AlicizationMindTurnContractSnapshot['projectState'],
      }
    : normalizedContract
}

function readDirectPayloadPreflightSummary(
  rawPayload: AlicizationChatStartPayload | null | undefined,
  maxChars = 1600,
) {
  const directPayloadIdentity
    = (rawPayload as { preDialogueSendIdentity?: Record<string, unknown> | null } | null | undefined)?.preDialogueSendIdentity
      ?? null
  const directPayloadProjectState
    = (directPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)
      ?? null

  return normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.preflightSummary, maxChars)
    ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.summaryLine, maxChars)
}

function preferPreparedRuntimeSpecificMindTurnContractAwareness(input: {
  normalizedContract: AlicizationMindTurnContractSnapshot | null
  rebuiltContract: AlicizationMindTurnContractSnapshot | null
  preparedProjectState: Record<string, unknown> | null | undefined
  rawPayload?: AlicizationChatStartPayload | null
}) {
  if (!input.normalizedContract || !input.rebuiltContract)
    return input.normalizedContract

  const payloadProjectState = readProviderFacingPayloadProjectState(input.rawPayload)
  const directPayloadPreflightSummary = normalizeProviderFacingProjectText(
    readDirectPayloadPreflightSummary(input.rawPayload, 1600),
    1600,
  )
  const directPayloadPreflightSummaryLooksThin = Boolean(
    directPayloadPreflightSummary
    && (
      isThinProjectAwarenessAuthorityLine(directPayloadPreflightSummary)
      || isCompactProjectStatePreflightSummary(directPayloadPreflightSummary)
    ),
  )
  const normalizedAwarenessLine = normalizeProviderFacingProjectText(
    (input.normalizedContract.projectState as Record<string, unknown> | null)?.preDialogueAwarenessLine,
    1600,
  )
  const rebuiltAwarenessLine = normalizeProviderFacingProjectText(
    (input.rebuiltContract.projectState as Record<string, unknown> | null)?.preDialogueAwarenessLine,
    1600,
  )
  const preparedAwarenessLine = normalizeProviderFacingProjectText(
    input.preparedProjectState?.preDialogueAwarenessLine
    ?? input.preparedProjectState?.awarenessLine,
    1600,
  )

  if (!normalizedAwarenessLine || !rebuiltAwarenessLine || !preparedAwarenessLine)
    return input.normalizedContract
  if (rebuiltAwarenessLine !== preparedAwarenessLine)
    return input.normalizedContract
  if (normalizedAwarenessLine === rebuiltAwarenessLine)
    return input.normalizedContract
  if (
    !payloadProjectState.hasDirectPayloadProjectAwarenessLine
    && !payloadProjectState.hasDirectPayloadProjectHeadline
    && directPayloadPreflightSummaryLooksThin
    && isLegacyProjectAwarenessTemplateShell(normalizedAwarenessLine)
    && !isLegacyProjectAwarenessTemplateShell(rebuiltAwarenessLine)
    && !carriesSpecificSameHerAuthorityLine(rebuiltAwarenessLine)
    && !hasModalitySpecificEmbodimentCue(rebuiltAwarenessLine)
    && /phase 1/iu.test(rebuiltAwarenessLine)
    && /local-first digital life project|same local-first digital life project|same digital life project/iu.test(
      rebuiltAwarenessLine,
    )
  ) {
    return input.normalizedContract
  }

  const preferredLatestLandedProgress = pickPreferredRuntimeProjectStateDetail([
    (input.rebuiltContract.projectState as Record<string, unknown> | null)?.latestLandedProgress,
    (input.rebuiltContract.projectState as Record<string, unknown> | null)?.latestProgress,
    input.preparedProjectState?.latestLandedProgress,
    input.preparedProjectState?.latestProgress,
  ], 'landed', 1600)
  const normalizedLatestLandedProgress = pickPreferredRuntimeProjectStateDetail([
    (input.normalizedContract.projectState as Record<string, unknown> | null)?.latestLandedProgress,
    (input.normalizedContract.projectState as Record<string, unknown> | null)?.latestProgress,
  ], 'landed', 1600)
  const preferredPrimaryOpenLoop = pickPreferredRuntimeProjectStateDetail([
    (input.rebuiltContract.projectState as Record<string, unknown> | null)?.primaryOpenLoop,
    input.preparedProjectState?.primaryOpenLoop,
  ], 'open', 1600)
  const normalizedPrimaryOpenLoop = pickPreferredRuntimeProjectStateDetail([
    (input.normalizedContract.projectState as Record<string, unknown> | null)?.primaryOpenLoop,
  ], 'open', 1600)
  const preferredNextClosureTarget = pickPreferredRuntimeProjectStateDetail([
    (input.rebuiltContract.projectState as Record<string, unknown> | null)?.nextClosureTarget,
    input.preparedProjectState?.nextClosureTarget,
  ], 'next', 1600)
  const normalizedNextClosureTarget = pickPreferredRuntimeProjectStateDetail([
    (input.normalizedContract.projectState as Record<string, unknown> | null)?.nextClosureTarget,
  ], 'next', 1600)
  const preparedAwarenessLineCarriesCanonicalRuntimeClosurePrefix = Boolean(
    preparedAwarenessLine
    && normalizedAwarenessLine
    && preparedAwarenessLine.startsWith(normalizedAwarenessLine)
    && preparedAwarenessLine.length > normalizedAwarenessLine.length
    && isCanonicalStructuredProjectAwareness(preparedAwarenessLine)
    && (
      (preferredLatestLandedProgress && preparedAwarenessLine.includes(preferredLatestLandedProgress) && !normalizedAwarenessLine.includes(preferredLatestLandedProgress))
      || (preferredPrimaryOpenLoop && preparedAwarenessLine.includes(preferredPrimaryOpenLoop) && !normalizedAwarenessLine.includes(preferredPrimaryOpenLoop))
      || (preferredNextClosureTarget && preparedAwarenessLine.includes(preferredNextClosureTarget) && !normalizedAwarenessLine.includes(preferredNextClosureTarget))
    ),
  )
  const normalizedCarriesStrongerRuntimeSpecificClosure = Boolean(
    scoreRuntimeProjectStateDetailCandidate(normalizedLatestLandedProgress, 'landed')
    > scoreRuntimeProjectStateDetailCandidate(preferredLatestLandedProgress, 'landed')
    || scoreRuntimeProjectStateDetailCandidate(normalizedPrimaryOpenLoop, 'open')
    > scoreRuntimeProjectStateDetailCandidate(preferredPrimaryOpenLoop, 'open')
    || scoreRuntimeProjectStateDetailCandidate(normalizedNextClosureTarget, 'next')
    > scoreRuntimeProjectStateDetailCandidate(preferredNextClosureTarget, 'next'),
  )
  if (
    normalizedCarriesStrongerRuntimeSpecificClosure
    && !shouldPreserveProjectAwarenessLineVerbatim(rebuiltAwarenessLine, normalizedAwarenessLine)
  ) {
    return input.normalizedContract
  }

  const shouldPreferPreparedRuntimeSpecificAwareness = awarenessLineMissesRuntimeCarry({
    awarenessLine: normalizedAwarenessLine,
    latestLandedProgress: preferredLatestLandedProgress,
    primaryOpenLoop: preferredPrimaryOpenLoop,
    nextClosureTarget: preferredNextClosureTarget,
  }) && !awarenessLineMissesRuntimeCarry({
    awarenessLine: rebuiltAwarenessLine,
    latestLandedProgress: preferredLatestLandedProgress,
    primaryOpenLoop: preferredPrimaryOpenLoop,
    nextClosureTarget: preferredNextClosureTarget,
  })
  const shouldPreferPreparedRuntimeSpecificHeadline = Boolean(
    !isCanonicalStructuredProjectAwareness(rebuiltAwarenessLine)
    && (
      shouldPreserveProjectAwarenessLineVerbatim(
        rebuiltAwarenessLine,
        normalizedAwarenessLine,
      )
      || isStrongerSameHerProjectHeadline(
        rebuiltAwarenessLine,
        normalizedAwarenessLine,
      )
    ),
  )
  const shouldPreferPreparedCanonicalAwarenessRescue = Boolean(
    preparedAwarenessLineCarriesCanonicalRuntimeClosurePrefix
    && !normalizedCarriesStrongerRuntimeSpecificClosure,
  )

  if (
    !shouldPreferPreparedRuntimeSpecificAwareness
    && !shouldPreferPreparedRuntimeSpecificHeadline
    && !shouldPreferPreparedCanonicalAwarenessRescue
  ) {
    return input.normalizedContract
  }

  const preferredCompanionHeadlineLine = normalizeProviderFacingProjectText(
    (input.rebuiltContract.projectState as Record<string, unknown> | null)?.companionHeadlineLine,
    1600,
  ) ?? (shouldPreferPreparedCanonicalAwarenessRescue ? preparedAwarenessLine : rebuiltAwarenessLine)
  const preferredAwarenessLine = shouldPreferPreparedCanonicalAwarenessRescue
    ? preparedAwarenessLine
    : rebuiltAwarenessLine
  const providerSafePreferredAwarenessLine = isLegacyProjectAwarenessTemplateShell(preferredAwarenessLine)
    ? buildProviderFacingProjectAwarenessLine({
        identity: normalizeProviderFacingProjectText(
          (input.normalizedContract.projectState as Record<string, unknown> | null)?.identity
          ?? (input.rebuiltContract.projectState as Record<string, unknown> | null)?.identity
          ?? input.preparedProjectState?.identity,
          1600,
        ) ?? '',
        currentPhase: normalizeProviderFacingProjectText(
          (input.normalizedContract.projectState as Record<string, unknown> | null)?.currentPhase
          ?? (input.rebuiltContract.projectState as Record<string, unknown> | null)?.currentPhase
          ?? input.preparedProjectState?.currentPhase,
          1600,
        ) ?? '',
        sameHerSelfLine: normalizeProviderFacingProjectText(
          (input.normalizedContract.projectState as Record<string, unknown> | null)?.sameHerSelfLine
          ?? (input.rebuiltContract.projectState as Record<string, unknown> | null)?.sameHerSelfLine
          ?? input.preparedProjectState?.sameHerSelfLine,
          1600,
        ),
        latestLandedProgress: preferredLatestLandedProgress ?? normalizedLatestLandedProgress,
        primaryOpenLoop: preferredPrimaryOpenLoop ?? normalizedPrimaryOpenLoop,
        nextClosureTarget: preferredNextClosureTarget ?? normalizedNextClosureTarget,
      })
    : preferredAwarenessLine
  const providerSafePreferredCompanionHeadlineLine = isLegacyProjectAwarenessTemplateShell(preferredCompanionHeadlineLine)
    ? providerSafePreferredAwarenessLine
    : preferredCompanionHeadlineLine
  const providerSafePreferredAwarenessSummary = (() => {
    const normalizedSummary = normalizeProviderFacingProjectText(
      (input.normalizedContract.projectState as Record<string, unknown> | null)?.preDialogueAwarenessSummary,
      1600,
    )
    if (
      normalizedSummary
      && !isLegacyProjectAwarenessTemplateShell(normalizedSummary)
      && !isThinProjectAwarenessAuthorityLine(normalizedSummary)
      && !isCompactProjectStatePreflightSummary(normalizedSummary)
      && (!/callback return|same thread/iu.test(normalizedSummary)
        || carriesExplicitProjectClosureTriplet(normalizedSummary))
    ) {
      return normalizedSummary
    }

    const preferredLineIsOpeningOnly = Boolean(
      providerSafePreferredAwarenessLine
      && /callback return|same thread/iu.test(providerSafePreferredAwarenessLine)
      && !carriesExplicitProjectClosureTriplet(providerSafePreferredAwarenessLine),
    )
    if (!preferredLineIsOpeningOnly)
      return providerSafePreferredAwarenessLine

    return buildProviderFacingProjectAwarenessLine({
      identity: normalizeProviderFacingProjectText(
        (input.normalizedContract.projectState as Record<string, unknown> | null)?.identity
        ?? (input.rebuiltContract.projectState as Record<string, unknown> | null)?.identity
        ?? input.preparedProjectState?.identity,
        1600,
      ) ?? '',
      currentPhase: normalizeProviderFacingProjectText(
        (input.normalizedContract.projectState as Record<string, unknown> | null)?.currentPhase
        ?? (input.rebuiltContract.projectState as Record<string, unknown> | null)?.currentPhase
        ?? input.preparedProjectState?.currentPhase,
        1600,
      ) ?? '',
      sameHerSelfLine: normalizeProviderFacingProjectText(
        (input.normalizedContract.projectState as Record<string, unknown> | null)?.sameHerSelfLine
        ?? (input.rebuiltContract.projectState as Record<string, unknown> | null)?.sameHerSelfLine
        ?? input.preparedProjectState?.sameHerSelfLine,
        1600,
      ),
      latestLandedProgress: preferredLatestLandedProgress ?? normalizedLatestLandedProgress,
      primaryOpenLoop: preferredPrimaryOpenLoop ?? normalizedPrimaryOpenLoop,
      nextClosureTarget: preferredNextClosureTarget ?? normalizedNextClosureTarget,
    }) ?? providerSafePreferredAwarenessLine
  })()

  return overrideMindTurnContractNextClosureTarget({
    contract: {
      ...input.normalizedContract,
      projectState: input.normalizedContract.projectState
        ? {
            ...(input.normalizedContract.projectState as Record<string, unknown>),
            preDialogueAwarenessLine: providerSafePreferredAwarenessLine,
            awarenessLine: providerSafePreferredAwarenessLine,
            preDialogueAwarenessSummary: providerSafePreferredAwarenessSummary,
            companionHeadlineLine: providerSafePreferredCompanionHeadlineLine,
          } as AlicizationMindTurnContractSnapshot['projectState'] & Record<string, unknown>
        : input.normalizedContract.projectState,
    } satisfies AlicizationMindTurnContractSnapshot,
    nextClosureTarget: pickPreferredRuntimeProjectStateDetail([
      (input.normalizedContract.projectState as Record<string, unknown> | null)?.nextClosureTarget,
      (input.rebuiltContract.projectState as Record<string, unknown> | null)?.nextClosureTarget,
      input.preparedProjectState?.nextClosureTarget,
    ], 'next', 1600),
  })
}

function readProviderFacingPayloadProjectState(
  rawPayload: AlicizationChatStartPayload | null | undefined,
) {
  const directPayloadIdentity
    = (rawPayload as { preDialogueSendIdentity?: Record<string, unknown> | null } | null | undefined)?.preDialogueSendIdentity
      ?? null
  const payload = rawPayload && directPayloadIdentity
    ? resolveAlicizationChatStartPayloadPreDialogueSendIdentity(rawPayload)
    : null
  const readSameHerDriftRiskPayloadFromReason = (value: unknown) => {
    const normalized = normalizeProviderFacingProjectAwarenessPayloadText(value, 1600)
    if (!normalized)
      return null

    const matchedPayload = normalized.match(/^D[o0]\s+not\s+let this opening drift into\s+(.*)$/iu)?.[1] ?? null
    if (matchedPayload)
      return normalizeProviderFacingProjectAwarenessPayloadText(matchedPayload, 1600)

    return /drift|generic guidance|project-state continuity|generic assistant shell|generic callback shell|generic project shell|detached project narration|detached project shell|project-summary voice|phase-summary shell|unfinished closure drift|flatten|collapse|unsettled|still settling/iu.test(normalized)
      ? normalized
      : null
  }
  const readPreferredSameHerDriftRiskReason = (reasons: string[]) => {
    let preferred: string | null = null

    for (const reason of reasons) {
      const candidate = readSameHerDriftRiskPayloadFromReason(reason)
      if (!candidate)
        continue

      preferred = normalizeProviderFacingProjectText(preferStrongerSameHerDriftRisk({
        current: preferred,
        candidate,
      }), 1600) ?? preferred
    }

    return preferred
  }
  const resolvedPayloadIdentity
    = (payload?.preDialogueSendIdentity as Record<string, unknown> | null | undefined)
      ?? null
  const preferResolvedPayloadHeadlineTruth = (input: {
    direct: unknown
    repaired: unknown
  }) => {
    const directLine = normalizeProviderFacingProjectAwarenessPayloadText(input.direct, 1600)
    const repairedLine = normalizeProviderFacingProjectAwarenessPayloadText(input.repaired, 1600)
    if (!directLine)
      return repairedLine
    if (!repairedLine || directLine === repairedLine)
      return directLine

    const directPreservedVerbatim = shouldPreserveProjectAwarenessLineVerbatim(directLine, repairedLine)
    if (
      isThinProjectAwarenessAuthorityLine(directLine)
      && !isThinProjectAwarenessAuthorityLine(repairedLine)
      && !directPreservedVerbatim
    ) {
      return repairedLine
    }
    if (
      isStrongerSameHerProjectHeadline(repairedLine, directLine)
      && !directPreservedVerbatim
      && !isStrongerSameHerProjectHeadline(directLine, repairedLine)
    ) {
      return repairedLine
    }
    return directLine
  }
  const preferResolvedPayloadNextClosureTruth = (input: {
    direct: unknown
    repaired: unknown
  }) => {
    const directLine = normalizeProviderFacingProjectAwarenessPayloadText(input.direct, 1600)
    const repairedLine = normalizeProviderFacingProjectAwarenessPayloadText(input.repaired, 1600)
    if (!directLine)
      return repairedLine
    if (!repairedLine || directLine === repairedLine)
      return directLine
    if (
      looksLikeThinRuntimeProjectStateDetail(directLine, 'next')
      && !looksLikeThinRuntimeProjectStateDetail(repairedLine, 'next')
    ) {
      return repairedLine
    }
    return directLine
  }
  const preferResolvedPayloadPreflightSummaryTruth = (input: {
    direct: unknown
    repaired: unknown
  }) => {
    const directLine = normalizeProviderFacingProjectAwarenessPayloadText(input.direct, 1600)
    const repairedLine = normalizeProviderFacingProjectAwarenessPayloadText(input.repaired, 1600)
    if (!directLine)
      return repairedLine
    if (!repairedLine || directLine === repairedLine)
      return directLine
    if (isThinProjectAwarenessAuthorityLine(directLine)) {
      return pickPreferredProjectPreflightSummary([repairedLine, directLine], 1600) ?? repairedLine
    }
    if (
      (isThinProjectAwarenessAuthorityLine(directLine) || isCompactProjectStatePreflightSummary(directLine))
      && !isThinProjectAwarenessAuthorityLine(repairedLine)
      && !isCompactProjectStatePreflightSummary(repairedLine)
    ) {
      return repairedLine
    }
    return directLine
  }
  const preferResolvedPayloadSameHerDriftRiskTruth = (input: {
    direct: unknown
    repaired: unknown
  }) => {
    const directLine = normalizeProviderFacingProjectAwarenessPayloadText(input.direct, 1600)
    const repairedLine = normalizeProviderFacingProjectAwarenessPayloadText(input.repaired, 1600)
    if (!directLine)
      return repairedLine
    if (!repairedLine || directLine === repairedLine)
      return directLine
    return normalizeProviderFacingProjectAwarenessPayloadText(preferStrongerSameHerDriftRisk({
      current: directLine,
      candidate: repairedLine,
    }), 1600) ?? directLine
  }
  const normalizedPayloadIdentity = {
    ...resolvedPayloadIdentity,
    ...directPayloadIdentity,
  } as Record<string, unknown>
  const payloadProjectState
    = {
      ...(((resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined) ?? {})),
      ...(((directPayloadIdentity?.projectState as Record<string, unknown> | null | undefined) ?? {})),
    }
  const directPayloadProjectState
    = (directPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)
      ?? null
  const reasonPreview = Array.isArray(normalizedPayloadIdentity?.reasonPreview)
    ? normalizedPayloadIdentity.reasonPreview.filter(reason => typeof reason === 'string')
    : []
  const directPayloadNextClosureTarget
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.nextClosureTarget, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.companionNextClosureLine, 1600)
  const directPayloadProjectHeadline = preferResolvedPayloadHeadlineTruth({
    direct:
      normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.companionHeadlineLine, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.companionHeadlineLine, 1600),
    repaired:
      normalizeProviderFacingProjectAwarenessPayloadText(
        (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.companionHeadlineLine,
        1600,
      )
      ?? normalizeProviderFacingProjectAwarenessPayloadText(resolvedPayloadIdentity?.companionHeadlineLine, 1600),
  })
  const directPayloadProjectBaseAwarenessLine
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.preDialogueAwarenessLine, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.awarenessLine, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.awarenessLine, 1600)
  const directPayloadProjectAwarenessSummary
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.preDialogueAwarenessSummary, 1600)
  const directPayloadProjectCompanionBriefingLine
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.companionBriefingLine, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.companionBriefingLine, 1600)
  const directReasonPreview = Array.isArray(directPayloadIdentity?.reasonPreview)
    ? directPayloadIdentity.reasonPreview.filter(reason => typeof reason === 'string')
    : []
  const resolvedReasonPreview = Array.isArray(resolvedPayloadIdentity?.reasonPreview)
    ? resolvedPayloadIdentity.reasonPreview.filter(reason => typeof reason === 'string')
    : []
  const directPayloadProjectSameHerDriftRisk
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.sameHerDriftRisk, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(readPreferredSameHerDriftRiskReason(directReasonPreview), 1600)
  const repairedPayloadProjectSameHerDriftRisk = normalizeProviderFacingProjectAwarenessPayloadText(
    preferStrongerSameHerDriftRisk({
      current:
        (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.sameHerDriftRisk,
      candidate: readPreferredSameHerDriftRiskReason(resolvedReasonPreview),
    }),
    1600,
  )
  const directPayloadProjectSameHerSelfLine
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.sameHerSelfLine, 1600)
  const directPayloadProjectSameHerHoldDetail
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.sameHerHoldDetail, 1600)
  const hasDirectPayloadProjectAwarenessAuthority = Boolean(
    directPayloadProjectBaseAwarenessLine
    || directPayloadProjectAwarenessSummary
    || directPayloadProjectCompanionBriefingLine
    || directPayloadProjectSameHerSelfLine
    || directPayloadProjectSameHerHoldDetail
    || directPayloadProjectSameHerDriftRisk,
  )
  const directPayloadProjectAwarenessLine = normalizeProviderFacingProjectText(
    hasDirectPayloadProjectAwarenessAuthority
      ? (
          resolveAlicizationProjectPreDialogueAwarenessLine({
            runtimeProjectState: {
              preDialogueAwarenessLine: directPayloadProjectBaseAwarenessLine,
              awarenessLine: directPayloadProjectBaseAwarenessLine,
              companionHeadlineLine: directPayloadProjectHeadline,
              companionBriefingLine: directPayloadProjectCompanionBriefingLine,
              preDialogueAwarenessSummary: directPayloadProjectAwarenessSummary,
              sameHerSelfLine: directPayloadProjectSameHerSelfLine,
              sameHerHoldDetail: directPayloadProjectSameHerHoldDetail,
              sameHerDriftRiskSummary: directPayloadProjectSameHerDriftRisk,
            },
            fallbackProjectState: {
              preDialogueAwarenessLine: directPayloadProjectBaseAwarenessLine,
              awarenessLine: directPayloadProjectBaseAwarenessLine,
              companionHeadlineLine: directPayloadProjectHeadline,
              companionBriefingLine: directPayloadProjectCompanionBriefingLine,
              preDialogueAwarenessSummary: directPayloadProjectAwarenessSummary,
              sameHerSelfLine: directPayloadProjectSameHerSelfLine,
              sameHerHoldDetail: directPayloadProjectSameHerHoldDetail,
              sameHerDriftRiskSummary: directPayloadProjectSameHerDriftRisk,
            },
          })
          ?? directPayloadProjectBaseAwarenessLine
          ?? directPayloadProjectAwarenessSummary
          ?? directPayloadProjectCompanionBriefingLine
        )
      : null,
    1600,
  )
  const repairedPayloadProjectAwarenessLine
    = normalizeProviderFacingProjectAwarenessPayloadText(
      (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessLine,
      1600,
    )
    ?? normalizeProviderFacingProjectAwarenessPayloadText(
      (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.awarenessLine,
      1600,
    )
    ?? normalizeProviderFacingProjectAwarenessPayloadText(
      (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessSummary,
      1600,
    )
    ?? normalizeProviderFacingProjectAwarenessPayloadText(resolvedPayloadIdentity?.awarenessLine, 1600)
    ?? normalizeProviderFacingProjectAwarenessPayloadText(resolvedPayloadIdentity?.companionBriefingLine, 1600)
  const directPayloadProjectSameHerAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    directPayloadProjectSameHerHoldDetail,
    directPayloadProjectSameHerSelfLine,
  ], 1600)
  const directPayloadStructuredProjectAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
    carriesStructuredLandedProgressProjectAwareness(directPayloadProjectBaseAwarenessLine)
      ? directPayloadProjectBaseAwarenessLine
      : null,
    carriesStructuredLandedProgressProjectAwareness(directPayloadProjectHeadline)
      ? directPayloadProjectHeadline
      : null,
    carriesStructuredLandedProgressProjectAwareness(directPayloadProjectAwarenessLine)
      ? directPayloadProjectAwarenessLine
      : null,
  ], 1600)
  const shouldPreferDirectPayloadSameHerHoldDetailOverBroaderReminder = Boolean(
    directPayloadProjectSameHerHoldDetail
    && directPayloadProjectSameHerAwarenessLine === directPayloadProjectSameHerHoldDetail
    && directPayloadProjectAwarenessLine
    && awarenessCarriesBroaderProjectFrame(directPayloadProjectAwarenessLine)
    && !carriesSpecificSameHerAuthorityLine(directPayloadProjectAwarenessLine)
    && !directPayloadStructuredProjectAwarenessLine,
  )
  const repairedDirectPayloadProjectAwarenessLine = (
    directPayloadProjectSameHerAwarenessLine
    && (
      shouldPreferDirectPayloadSameHerHoldDetailOverBroaderReminder
      || (
        !directPayloadProjectAwarenessLine
        || isThinProjectAwarenessAuthorityLine(directPayloadProjectAwarenessLine)
        || shouldPreserveProjectAwarenessLineVerbatim(
          directPayloadProjectSameHerAwarenessLine,
          directPayloadProjectAwarenessLine,
        )
        || isStrongerSameHerProjectHeadline(
          directPayloadProjectSameHerAwarenessLine,
          directPayloadProjectAwarenessLine,
        )
      )
    )
  )
    ? directPayloadProjectSameHerAwarenessLine
    : directPayloadProjectAwarenessLine
  const directPayloadSameHerHoldDetailLooksLivedIn = Boolean(
    directPayloadProjectSameHerHoldDetail
    && /same-her hold|same remembered seam|measured-return|repair-before-closeness|rest-protective|lower-pressure|callback line|keep more room this time/iu.test(
      directPayloadProjectSameHerHoldDetail,
    ),
  )
  const shouldPreferPayloadSameHerHoldDetailAsAwarenessTruth = Boolean(
    directPayloadSameHerHoldDetailLooksLivedIn
    && repairedDirectPayloadProjectAwarenessLine === directPayloadProjectSameHerHoldDetail
    && !directPayloadStructuredProjectAwarenessLine,
  )
  const preferredDirectPayloadProjectAwarenessLine = directPayloadStructuredProjectAwarenessLine
    ?? (
      !shouldPreferPayloadSameHerHoldDetailAsAwarenessTruth
      && directPayloadProjectCompanionBriefingLine
      && !isThinProjectAwarenessAuthorityLine(directPayloadProjectCompanionBriefingLine)
        ? (
            pickProjectAwarenessLineWithoutCompactSummaryShell([
              directPayloadProjectCompanionBriefingLine,
              repairedDirectPayloadProjectAwarenessLine,
            ], 1600)
            ?? directPayloadProjectCompanionBriefingLine
          )
        : repairedDirectPayloadProjectAwarenessLine
    )
  const directPayloadProjectPreflightSummary
    = normalizeProviderFacingProjectAwarenessPayloadText(directPayloadProjectState?.preflightSummary, 1600)
      ?? normalizeProviderFacingProjectAwarenessPayloadText(directPayloadIdentity?.summaryLine, 1600)
  const canonicalProjectStateBrief = resolveAlicizationProjectStateBrief()
  const payloadProjectStructuredIdentity = normalizeProviderFacingProjectAwarenessPayloadText(
    directPayloadProjectState?.identity
    ?? payloadProjectState?.identity
    ?? normalizedPayloadIdentity?.identity
    ?? (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.identity
    ?? canonicalProjectStateBrief.identity,
    1600,
  ) ?? ''
  const payloadProjectStructuredPhase = normalizeProviderFacingProjectAwarenessPayloadText(
    directPayloadProjectState?.currentPhase
    ?? payloadProjectState?.currentPhase
    ?? normalizedPayloadIdentity?.currentPhase
    ?? (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.currentPhase
    ?? canonicalProjectStateBrief.currentPhase,
    1600,
  ) ?? ''
  const payloadProjectStructuredLanded = normalizeProviderFacingProjectAwarenessPayloadText(
    directPayloadProjectState?.latestLandedProgress
    ?? directPayloadProjectState?.latestProgress
    ?? payloadProjectState?.latestLandedProgress
    ?? payloadProjectState?.latestProgress
    ?? (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.latestLandedProgress
    ?? (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.latestProgress,
    1600,
  )
  const payloadProjectStructuredOpen = normalizeProviderFacingProjectAwarenessPayloadText(
    directPayloadProjectState?.primaryOpenLoop
    ?? directPayloadProjectState?.openLoop
    ?? payloadProjectState?.primaryOpenLoop
    ?? payloadProjectState?.openLoop
    ?? (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.primaryOpenLoop
    ?? (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.openLoop,
    1600,
  )
  const payloadProjectStructuredNext = normalizeProviderFacingProjectAwarenessPayloadText(
    directPayloadProjectState?.nextClosureTarget
    ?? directPayloadIdentity?.companionNextClosureLine
    ?? payloadProjectState?.nextClosureTarget
    ?? normalizedPayloadIdentity?.companionNextClosureLine
    ?? (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.nextClosureTarget
    ?? resolvedPayloadIdentity?.companionNextClosureLine,
    1600,
  )
  const makePayloadProjectAwarenessLineProviderSafe = (value: unknown) => {
    const normalized = normalizeProviderFacingProjectAwarenessPayloadText(value, 1600)
    if (!normalized)
      return null
    if (!isLegacyProjectAwarenessTemplateShell(normalized))
      return normalized

    return buildProviderFacingProjectAwarenessLine({
      identity: payloadProjectStructuredIdentity,
      currentPhase: payloadProjectStructuredPhase,
      sameHerSelfLine: directPayloadProjectSameHerSelfLine,
      latestLandedProgress: payloadProjectStructuredLanded,
      primaryOpenLoop: payloadProjectStructuredOpen,
      nextClosureTarget: payloadProjectStructuredNext,
    })
  }
  const providerSafeDirectPayloadProjectAwarenessLine = makePayloadProjectAwarenessLineProviderSafe(
    preferredDirectPayloadProjectAwarenessLine,
  )
  const providerSafeRepairedPayloadProjectAwarenessLine = makePayloadProjectAwarenessLineProviderSafe(
    repairedPayloadProjectAwarenessLine,
  )

  return {
    explicitPayloadProjectHeadline:
      makePayloadProjectAwarenessLineProviderSafe(directPayloadProjectHeadline)
      ?? makePayloadProjectAwarenessLineProviderSafe(payloadProjectState?.companionHeadlineLine)
      ?? makePayloadProjectAwarenessLineProviderSafe(normalizedPayloadIdentity?.companionHeadlineLine)
      ?? makePayloadProjectAwarenessLineProviderSafe(
        (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.companionHeadlineLine,
      )
      ?? makePayloadProjectAwarenessLineProviderSafe(resolvedPayloadIdentity?.companionHeadlineLine),
    explicitPayloadProjectAwarenessLine:
      providerSafeDirectPayloadProjectAwarenessLine
      ?? makePayloadProjectAwarenessLineProviderSafe(directPayloadProjectBaseAwarenessLine)
      ?? makePayloadProjectAwarenessLineProviderSafe(directPayloadProjectAwarenessSummary)
      ?? makePayloadProjectAwarenessLineProviderSafe(directPayloadProjectCompanionBriefingLine)
      ?? makePayloadProjectAwarenessLineProviderSafe(normalizedPayloadIdentity?.awarenessLine)
      ?? makePayloadProjectAwarenessLineProviderSafe(normalizedPayloadIdentity?.companionBriefingLine)
      ?? providerSafeRepairedPayloadProjectAwarenessLine
      ?? makePayloadProjectAwarenessLineProviderSafe(
        (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessLine,
      )
      ?? makePayloadProjectAwarenessLineProviderSafe(
        (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.awarenessLine,
      )
      ?? makePayloadProjectAwarenessLineProviderSafe(
        (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessSummary,
      )
      ?? makePayloadProjectAwarenessLineProviderSafe(resolvedPayloadIdentity?.awarenessLine)
      ?? makePayloadProjectAwarenessLineProviderSafe(resolvedPayloadIdentity?.companionBriefingLine),
    explicitPayloadProjectPreflightSummary: preferResolvedPayloadPreflightSummaryTruth({
      direct:
        directPayloadProjectState?.preflightSummary
        ?? directPayloadIdentity?.summaryLine,
      repaired:
        (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.preflightSummary
        ?? (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.preDialogueAwarenessSummary
        ?? resolvedPayloadIdentity?.summaryLine,
    }) ?? normalizeProviderFacingProjectAwarenessPayloadText(payloadProjectState?.preflightSummary, 1600)
    ?? normalizeProviderFacingProjectAwarenessPayloadText(normalizedPayloadIdentity?.summaryLine, 1600),
    explicitPayloadProjectSameHerDriftRisk: normalizeProviderFacingProjectAwarenessPayloadText(
      preferResolvedPayloadSameHerDriftRiskTruth({
        direct: directPayloadProjectSameHerDriftRisk,
        repaired: repairedPayloadProjectSameHerDriftRisk,
      })
      ?? payloadProjectState?.sameHerDriftRisk
      ?? readPreferredSameHerDriftRiskReason(reasonPreview),
      1600,
    ),
    explicitPayloadNextClosureTarget: preferResolvedPayloadNextClosureTruth({
      direct:
        directPayloadProjectState?.nextClosureTarget
        ?? directPayloadIdentity?.companionNextClosureLine,
      repaired:
        (resolvedPayloadIdentity?.projectState as Record<string, unknown> | null | undefined)?.nextClosureTarget
        ?? resolvedPayloadIdentity?.companionNextClosureLine,
    }) ?? normalizeProviderFacingProjectAwarenessPayloadText(payloadProjectState?.nextClosureTarget, 1600)
    ?? normalizeProviderFacingProjectAwarenessPayloadText(normalizedPayloadIdentity?.companionNextClosureLine, 1600),
    hasDirectPayloadProjectHeadline: Boolean(directPayloadProjectHeadline),
    hasDirectPayloadProjectAwarenessLine: Boolean(
      directPayloadProjectAwarenessLine
      && hasDirectPayloadProjectAwarenessAuthority,
    ),
    hasDirectPayloadProjectPreflightSummary: Boolean(directPayloadProjectPreflightSummary),
    hasDirectPayloadProjectSameHerDriftRisk: Boolean(directPayloadProjectSameHerDriftRisk),
    hasDirectPayloadNextClosureTarget: Boolean(directPayloadNextClosureTarget),
  }
}

function applyProviderFacingProjectStateToRuntimeSurface(input: {
  runtimeSurface: AlicizationMainChatRuntimeSurface
  projectState: AlicizationMindTurnContractSnapshot['projectState'] | null | undefined
}) {
  const projectState = input.projectState
    ? JSON.parse(JSON.stringify(input.projectState)) as Record<string, unknown>
    : null
  if (!projectState)
    return null

  const spineProjectState = input.runtimeSurface.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
  const preservedProjectStateKeys = [
    'identity',
    'currentPhase',
    'latestLandedProgress',
    'latestProgress',
    'primaryOpenLoop',
    'nextClosureTarget',
    'sameHerSelfLine',
    'sameHerDriftRisk',
    'sameHerHoldDetail',
    'emotionalClosureSummary',
    'continuityRestraint',
    'continuityArcStage',
    'continuityCue',
    'continuityPreferredTiming',
    'continuityCadence',
    'preferredBlinkCadence',
    'preferredGazeMode',
    'preferredPauseMode',
    'preferredLipsyncMode',
    'preferredVoiceMode',
    'preferredPacingMode',
  ] as const

  const readPreferredProjectStateValue = (
    key: typeof preservedProjectStateKeys[number],
    incomingProjectState: Record<string, unknown> | null | undefined,
    existingProjectState: Record<string, unknown> | null | undefined,
    fallbackProjectState: Record<string, unknown> | null | undefined,
  ) => {
    if (key === 'sameHerHoldDetail') {
      return pickPreferredRuntimeProjectStateDetail([
        existingProjectState?.[key],
        fallbackProjectState?.[key],
        incomingProjectState?.[key],
      ], 'same-her', 1600) ?? incomingProjectState?.[key] ?? existingProjectState?.[key] ?? fallbackProjectState?.[key]
    }
    if (key === 'continuityCue') {
      return pickPreferredRuntimeProjectStateDetail([
        existingProjectState?.[key],
        fallbackProjectState?.[key],
        incomingProjectState?.[key],
      ], 'awareness', 1600) ?? incomingProjectState?.[key] ?? existingProjectState?.[key] ?? fallbackProjectState?.[key]
    }
    if (key === 'emotionalClosureSummary') {
      return pickPreferredRuntimeProjectStateDetail([
        existingProjectState?.[key],
        fallbackProjectState?.[key],
        incomingProjectState?.[key],
      ], 'awareness', 1600) ?? incomingProjectState?.[key] ?? existingProjectState?.[key] ?? fallbackProjectState?.[key]
    }
    if (key === 'continuityRestraint') {
      return pickPreferredContinuityRestraint([
        existingProjectState?.[key],
        fallbackProjectState?.[key],
        incomingProjectState?.[key],
      ]) ?? incomingProjectState?.[key] ?? existingProjectState?.[key] ?? fallbackProjectState?.[key]
    }
    if (key === 'continuityPreferredTiming') {
      return pickProviderFacingContinuityPreferredTiming([
        existingProjectState?.[key],
        fallbackProjectState?.[key],
        incomingProjectState?.[key],
      ]) ?? incomingProjectState?.[key] ?? existingProjectState?.[key] ?? fallbackProjectState?.[key]
    }
    if (key === 'continuityCadence') {
      return pickProviderFacingContinuityCadence([
        existingProjectState?.[key],
        fallbackProjectState?.[key],
        incomingProjectState?.[key],
      ]) ?? incomingProjectState?.[key] ?? existingProjectState?.[key] ?? fallbackProjectState?.[key]
    }
    if (key === 'continuityArcStage') {
      const score = (value: unknown) => {
        const normalized = normalizeProviderFacingProjectText(value, 120)
        if (!normalized)
          return Number.NEGATIVE_INFINITY
        if (normalized === 'same-thread-continuation')
          return 4
        if (normalized === 'next-open-window')
          return 3
        if (normalized === 'hold-for-opening')
          return 2
        return 1
      }
      return [
        existingProjectState?.[key],
        fallbackProjectState?.[key],
        incomingProjectState?.[key],
      ]
        .map(value => ({
          value: normalizeProviderFacingProjectText(value, 120),
          score: score(value),
        }))
        .filter((candidate): candidate is { score: number, value: string } => Boolean(candidate.value))
        .sort((left, right) => right.score - left.score)[0]
        ?.value
        ?? incomingProjectState?.[key]
        ?? existingProjectState?.[key]
        ?? fallbackProjectState?.[key]
    }
    if (key === 'preferredVoiceMode') {
      return pickPreferredRuntimeProjectStateDetail([
        normalizeProviderFacingVoiceMode(existingProjectState?.[key]),
        normalizeProviderFacingVoiceMode(fallbackProjectState?.[key]),
        normalizeProviderFacingVoiceMode(incomingProjectState?.[key]),
      ], 'awareness', 32)
      ?? normalizeProviderFacingVoiceMode(incomingProjectState?.[key])
      ?? normalizeProviderFacingVoiceMode(existingProjectState?.[key])
      ?? normalizeProviderFacingVoiceMode(fallbackProjectState?.[key])
    }
    if (key === 'preferredPacingMode') {
      return pickPreferredRuntimeProjectStateDetail([
        normalizeProviderFacingPacingMode(existingProjectState?.[key]),
        normalizeProviderFacingPacingMode(fallbackProjectState?.[key]),
        normalizeProviderFacingPacingMode(incomingProjectState?.[key]),
      ], 'awareness', 32)
      ?? normalizeProviderFacingPacingMode(incomingProjectState?.[key])
      ?? normalizeProviderFacingPacingMode(existingProjectState?.[key])
      ?? normalizeProviderFacingPacingMode(fallbackProjectState?.[key])
    }
    if (key === 'preferredPauseMode') {
      return pickPreferredRuntimeProjectStateDetail([
        normalizeProviderFacingPauseMode(existingProjectState?.[key]),
        normalizeProviderFacingPauseMode(fallbackProjectState?.[key]),
        normalizeProviderFacingPauseMode(incomingProjectState?.[key]),
      ], 'awareness', 32)
      ?? normalizeProviderFacingPauseMode(incomingProjectState?.[key])
      ?? normalizeProviderFacingPauseMode(existingProjectState?.[key])
      ?? normalizeProviderFacingPauseMode(fallbackProjectState?.[key])
    }
    if (key === 'preferredLipsyncMode') {
      return pickPreferredRuntimeProjectStateDetail([
        normalizeProviderFacingLipsyncMode(existingProjectState?.[key]),
        normalizeProviderFacingLipsyncMode(fallbackProjectState?.[key]),
        normalizeProviderFacingLipsyncMode(incomingProjectState?.[key]),
      ], 'awareness', 32)
      ?? normalizeProviderFacingLipsyncMode(incomingProjectState?.[key])
      ?? normalizeProviderFacingLipsyncMode(existingProjectState?.[key])
      ?? normalizeProviderFacingLipsyncMode(fallbackProjectState?.[key])
    }

    const incomingValue = incomingProjectState?.[key]
    if (typeof incomingValue === 'string')
      return incomingValue.trim() ? incomingValue : existingProjectState?.[key] ?? fallbackProjectState?.[key] ?? incomingValue
    if (incomingValue !== null && incomingValue !== undefined)
      return incomingValue
    return existingProjectState?.[key] ?? fallbackProjectState?.[key] ?? incomingValue
  }

  const applyToSurface = (
    surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
    fallbackProjectState?: Record<string, unknown> | null | undefined,
  ) => {
    if (!surface)
      return null

    const dialogue = surface.dialogue as Record<string, unknown> | null | undefined
    if (!dialogue)
      return null

    const emotionalKernelAuthority = surface.memory?.emotionalKernel ?? null
    const existingProjectState = ((dialogue.currentConsciousFrame as Record<string, unknown> | null | undefined)?.projectState as Record<string, unknown> | null | undefined) ?? {}
    const mergedProjectState = {
      ...existingProjectState,
      ...projectState,
    }
    for (const key of preservedProjectStateKeys)
      mergedProjectState[key] = readPreferredProjectStateValue(key, projectState, existingProjectState, fallbackProjectState)

    const dialogueRuntimeDigest = (dialogue.runtimeDigest as Record<string, unknown> | null | undefined) ?? {}
    const existingDialogueProjectState = (dialogueRuntimeDigest.projectState as Record<string, unknown> | null | undefined) ?? {}
    const mergedDialogueProjectState = {
      ...existingDialogueProjectState,
      ...projectState,
    }
    for (const key of preservedProjectStateKeys)
      mergedDialogueProjectState[key] = readPreferredProjectStateValue(key, projectState, existingDialogueProjectState, mergedProjectState)

    const currentConsciousFrame = {
      ...((dialogue.currentConsciousFrame as Record<string, unknown> | null | undefined) ?? {}),
      projectState: mergedProjectState,
    }
    dialogue.currentConsciousFrame = currentConsciousFrame
    dialogue.runtimeDigest = {
      ...dialogueRuntimeDigest,
      emotionalKernel: emotionalKernelAuthority,
      projectState: mergedDialogueProjectState,
    }

    const rawRuntimeDigest = (surface.raw?.runtimeDigest as Record<string, unknown> | null | undefined) ?? {}
    const existingRawProjectState = (rawRuntimeDigest.projectState as Record<string, unknown> | null | undefined) ?? {}
    const mergedRawProjectState = {
      ...existingRawProjectState,
      ...projectState,
    }
    for (const key of preservedProjectStateKeys)
      mergedRawProjectState[key] = readPreferredProjectStateValue(key, projectState, existingRawProjectState, mergedProjectState)
    surface.raw = {
      ...surface.raw,
      runtimeDigest: {
        ...rawRuntimeDigest,
        emotionalKernel: emotionalKernelAuthority,
        projectState: mergedRawProjectState,
      },
    } as unknown as typeof surface.raw

    const cognition = (surface.cognition as Record<string, unknown> | null | undefined) ?? {}
    const cognitionRuntimeDigest = (cognition.runtimeDigest as Record<string, unknown> | null | undefined) ?? {}
    const existingCognitionProjectState = (cognitionRuntimeDigest.projectState as Record<string, unknown> | null | undefined) ?? {}
    const mergedCognitionProjectState = {
      ...existingCognitionProjectState,
      ...projectState,
    }
    for (const key of preservedProjectStateKeys)
      mergedCognitionProjectState[key] = readPreferredProjectStateValue(key, projectState, existingCognitionProjectState, mergedProjectState)
    surface.cognition = {
      ...cognition,
      runtimeDigest: {
        ...cognitionRuntimeDigest,
        emotionalKernel: emotionalKernelAuthority,
        projectState: mergedCognitionProjectState,
      },
    } as unknown as AlicizationDigitalLifeRuntimeSurface['cognition']

    return currentConsciousFrame.projectState as Record<string, unknown>
  }

  const preparedProjectState = applyToSurface(
    input.runtimeSurface.digitalLifeRuntimeSurface,
    spineProjectState,
  )
  applyToSurface(
    input.runtimeSurface.digitalLifeSpine?.runtimeSurface ?? null,
    preparedProjectState,
  )
  return preparedProjectState ?? projectState
}

function injectProviderFacingMindTurnContractSystemMessage(input: {
  contract: AlicizationMindTurnContractSnapshot | null
  includeProjectStateFacts?: boolean
  messages: Message[]
}) {
  if (!input.contract)
    return input.messages
  const systemBlock = buildAlicizationMindTurnContractSystemBlock(input.contract, {
    includeProjectStateFacts: input.includeProjectStateFacts,
  })
  if (!systemBlock)
    return input.messages
  if (input.messages.some(message =>
    message.role === 'system'
    && typeof message.content === 'string'
    && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
  )) {
    return input.messages
  }
  return [
    {
      role: 'system',
      content: systemBlock,
    } as Message,
    ...input.messages,
  ]
}

function buildProviderFacingAwarenessResolutionDiagnostics(input: {
  rawPayload: AlicizationChatStartPayload | null | undefined
  rebuiltProjectState: Record<string, unknown> | null | undefined
  normalizedProjectState: Record<string, unknown> | null | undefined
}) {
  const payloadProjectState = readProviderFacingPayloadProjectState(input.rawPayload)
  const rebuiltPreDialogueAwarenessLine = normalizePreparedExecutionText(
    input.rebuiltProjectState?.preDialogueAwarenessLine,
    1600,
  )
  const normalizedPreDialogueAwarenessLine = normalizePreparedExecutionText(
    input.normalizedProjectState?.preDialogueAwarenessLine,
    1600,
  )
  return {
    explicitPayloadProjectAwarenessLine: payloadProjectState.explicitPayloadProjectAwarenessLine ?? null,
    explicitPayloadProjectPreflightSummary: payloadProjectState.explicitPayloadProjectPreflightSummary ?? null,
    explicitPayloadProjectSameHerDriftRisk: payloadProjectState.explicitPayloadProjectSameHerDriftRisk ?? null,
    rebuiltPreDialogueAwarenessLine:
      isCompactProjectStatePreflightSummary(rebuiltPreDialogueAwarenessLine)
        ? normalizedPreDialogueAwarenessLine
        ?? normalizePreparedExecutionText(resolveAlicizationProjectStateBrief().preDialogueAwarenessLine, 1600)
        : rebuiltPreDialogueAwarenessLine,
    normalizedPreDialogueAwarenessLine,
    rebuiltPreflightSummary: normalizePreparedExecutionText(input.rebuiltProjectState?.preflightSummary, 1600),
    normalizedPreflightSummary: normalizePreparedExecutionText(input.normalizedProjectState?.preflightSummary, 1600),
    rebuiltSameHerDriftRisk: normalizePreparedExecutionText(input.rebuiltProjectState?.sameHerDriftRisk, 1600),
    normalizedSameHerDriftRisk: normalizePreparedExecutionText(input.normalizedProjectState?.sameHerDriftRisk, 1600),
  }
}

function buildStructuredPreDialogueClosureBriefingLine(input: {
  identity?: unknown
  currentPhase?: unknown
  latestLandedProgress?: unknown
  primaryOpenLoop?: unknown
  nextClosureTarget?: unknown
  emotionalClosureCue?: unknown
  sameHerSelfLine?: unknown
}) {
  return normalizeProviderFacingProjectText(formatAlicizationProjectStateAwarenessFields({
    identity: input.identity,
    currentPhase: input.currentPhase,
    latestLandedProgress: input.latestLandedProgress,
    primaryOpenLoop: input.primaryOpenLoop,
    nextClosureTarget: input.nextClosureTarget,
    continuityAnchor: input.sameHerSelfLine,
    emotionalClosureCue: input.emotionalClosureCue,
    visibility: 'internal-structured',
    maxChars: 1600,
  }), 1600)
}

function overrideMindTurnContractNextClosureTarget(input: {
  contract: AlicizationMindTurnContractSnapshot | null
  nextClosureTarget: string | null | undefined
}) {
  if (!input.contract)
    return null

  const nextClosureTarget = normalizeProviderFacingProjectText(input.nextClosureTarget, 1600)
  if (!nextClosureTarget)
    return input.contract

  const projectState = input.contract.projectState
    ? {
        ...(input.contract.projectState as Record<string, unknown>),
      }
    : null
  const currentAwarenessLine = normalizeProviderFacingProjectText(
    projectState?.preDialogueAwarenessLine ?? projectState?.awarenessLine,
    1600,
  )
  const currentCompanionHeadlineLine = normalizeProviderFacingProjectText(
    projectState?.companionHeadlineLine,
    1600,
  )
  const shouldRefreshAwarenessLine = Boolean(
    projectState
    && currentAwarenessLine
    && !currentAwarenessLine.includes(nextClosureTarget)
    && (
      isCanonicalStructuredProjectAwareness(currentAwarenessLine)
      || isPhase1ProjectStatePreflightAwarenessLine(currentAwarenessLine)
      || (
        carriesExplicitProjectClosureTriplet(currentAwarenessLine)
        && !hasDistinctEmbodimentClosureCue(currentAwarenessLine)
      )
    ),
  )
  const shouldAppendNextClosureTarget = Boolean(
    currentAwarenessLine
    && /one continuous "her"|same living line|project shell|without splitting her continuity/iu.test(currentAwarenessLine),
  )
  const currentAwareness = currentAwarenessLine ?? ''
  const refreshedAwarenessLine = shouldRefreshAwarenessLine
    ? normalizeProviderFacingProjectText(
        formatAlicizationProjectStateAwarenessFields({
          identity: projectState?.identity,
          currentPhase: projectState?.currentPhase,
          latestLandedProgress: projectState?.latestLandedProgress ?? projectState?.latestProgress,
          primaryOpenLoop: projectState?.primaryOpenLoop,
          nextClosureTarget,
          continuityAnchor: projectState?.sameHerSelfLine,
          sameHerHoldDetail: projectState?.sameHerHoldDetail,
          continuityDriftRisk: projectState?.sameHerDriftRisk,
          proactiveSameHerGap: projectState?.proactiveSameHerGap,
          emotionalClosureCue: projectState?.emotionalClosureCue ?? projectState?.emotionalClosureSummary,
          status: shouldAppendNextClosureTarget ? currentAwareness : null,
          visibility: 'internal-structured',
          maxChars: 1600,
        }),
        1600,
      )
    : null
  const refreshedCompanionHeadlineLine = refreshedAwarenessLine
    && (
      !currentCompanionHeadlineLine
      || currentCompanionHeadlineLine === currentAwarenessLine
      || isCanonicalStructuredProjectAwareness(currentCompanionHeadlineLine)
    )
    ? refreshedAwarenessLine
    : currentCompanionHeadlineLine

  return {
    ...input.contract,
    projectState: projectState
      ? {
          ...projectState,
          nextClosureTarget,
          preDialogueAwarenessLine: refreshedAwarenessLine ?? projectState.preDialogueAwarenessLine,
          awarenessLine: refreshedAwarenessLine ?? projectState.awarenessLine,
          preDialogueAwarenessSummary: refreshedAwarenessLine ?? projectState.preDialogueAwarenessSummary,
          companionHeadlineLine: refreshedCompanionHeadlineLine ?? projectState.companionHeadlineLine,
        } as AlicizationMindTurnContractSnapshot['projectState'] & Record<string, unknown>
      : input.contract.projectState,
    preDialogueClosure: input.contract.preDialogueClosure
      ? {
          ...input.contract.preDialogueClosure,
          summaryLine:
          refreshedAwarenessLine
          ?? input.contract.preDialogueClosure.summaryLine
          ?? null,
          companionNextClosureLine: nextClosureTarget,
          briefingLines: mergeUniqueRules([
            ...input.contract.preDialogueClosure.briefingLines.filter((line) => {
              const normalized = String(line)
              return !/^(?:Project identity|Current phase|Landed continuity progress|Still-open closure gap|Next closure target):/u.test(normalized)
            }),
            buildStructuredPreDialogueClosureBriefingLine({
              identity: input.contract.projectState?.identity,
              currentPhase: input.contract.projectState?.currentPhase,
              latestLandedProgress: input.contract.projectState?.latestLandedProgress ?? input.contract.projectState?.latestProgress,
              primaryOpenLoop: input.contract.projectState?.primaryOpenLoop,
              nextClosureTarget,
              emotionalClosureCue: input.contract.projectState?.emotionalClosureCue ?? input.contract.projectState?.emotionalClosureSummary,
              sameHerSelfLine: input.contract.projectState?.sameHerSelfLine,
            }) ?? '',
          ].filter(Boolean)),
          reasons: mergeUniqueRules([
            ...input.contract.preDialogueClosure.reasons.filter(reason => reason !== nextClosureTarget),
            nextClosureTarget,
          ]),
        }
      : input.contract.preDialogueClosure,
  } satisfies AlicizationMindTurnContractSnapshot
}

function backfillMindTurnContractProjectRhythmFromRuntime(
  contract: AlicizationMindTurnContractSnapshot | null,
  runtimeProjectState: Record<string, unknown> | null | undefined,
) {
  if (!contract?.projectState || !runtimeProjectState)
    return contract

  const projectState = contract.projectState as Record<string, unknown>
  return {
    ...contract,
    projectState: {
      ...projectState,
      continuityPreferredTiming: projectState.continuityPreferredTiming ?? null,
      continuityCadence:
        pickProviderFacingContinuityCadence([
          projectState.continuityCadence,
          runtimeProjectState.continuityCadence,
        ]),
      preferredBlinkCadence:
        normalizeProviderFacingBlinkCadence(projectState.preferredBlinkCadence)
        ?? normalizeProviderFacingBlinkCadence(runtimeProjectState.preferredBlinkCadence)
        ?? null,
      preferredGazeMode:
        normalizeProviderFacingGazeMode(projectState.preferredGazeMode)
        ?? normalizeProviderFacingGazeMode(runtimeProjectState.preferredGazeMode)
        ?? null,
      preferredPauseMode:
        normalizeProviderFacingPauseMode(projectState.preferredPauseMode)
        ?? normalizeProviderFacingPauseMode(runtimeProjectState.preferredPauseMode)
        ?? null,
      preferredLipsyncMode:
        normalizeProviderFacingLipsyncMode(projectState.preferredLipsyncMode)
        ?? normalizeProviderFacingLipsyncMode(runtimeProjectState.preferredLipsyncMode)
        ?? null,
      preferredVoiceMode:
        normalizeProviderFacingVoiceMode(projectState.preferredVoiceMode)
        ?? normalizeProviderFacingVoiceMode(runtimeProjectState.preferredVoiceMode)
        ?? null,
      preferredPacingMode:
        normalizeProviderFacingPacingMode(projectState.preferredPacingMode)
        ?? normalizeProviderFacingPacingMode(runtimeProjectState.preferredPacingMode)
        ?? null,
    } as AlicizationMindTurnContractSnapshot['projectState'] & Record<string, unknown>,
  } satisfies AlicizationMindTurnContractSnapshot
}

function rescueReturnedProviderFacingProjectAwareness(input: {
  contract: AlicizationMindTurnContractSnapshot | null
  rawPayload: AlicizationChatStartPayload | null | undefined
  prelude: AlicizationPreparedMainChatPrelude
}) {
  const contract = input.contract
  const projectState = contract?.projectState as Record<string, unknown> | null | undefined
  if (!contract || !projectState)
    return contract

  const payloadProjectState = readProviderFacingPayloadProjectState(input.rawPayload)
  if (payloadProjectState.hasDirectPayloadProjectAwarenessLine || payloadProjectState.hasDirectPayloadProjectHeadline)
    return contract

  const shouldTreatReturnAsProjectStateAnswer = Boolean(
    input.prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.answerSubject === 'project-state'
    || input.prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.reasonTags?.includes('project-state'),
  )
  if (!shouldTreatReturnAsProjectStateAnswer)
    return contract

  const currentAwarenessLine = normalizePreparedExecutionText(
    projectState.preDialogueAwarenessLine ?? projectState.awarenessLine,
    1600,
  )
  const directPreludeAwarenessLine = normalizePreparedExecutionText(
    input.prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
    ?? input.prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
    1600,
  )
  const currentAwarenessSummary = normalizePreparedExecutionText(
    projectState.preDialogueAwarenessSummary,
    1600,
  )
  if (
    directPreludeAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(directPreludeAwarenessLine)
    && /callback return|same thread/iu.test(directPreludeAwarenessLine)
    && !carriesExplicitProjectClosureTriplet(directPreludeAwarenessLine)
    && shouldPreserveProjectAwarenessLineVerbatim(
      directPreludeAwarenessLine,
      currentAwarenessLine,
    )
  ) {
    const currentCompanionHeadlineLine = normalizePreparedExecutionText(
      projectState.companionHeadlineLine,
      1600,
    )
    const rescuedStructuredAwarenessLine = normalizePreparedExecutionText(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        ...projectState,
        preDialogueAwarenessLine: directPreludeAwarenessLine,
        awarenessLine: directPreludeAwarenessLine,
        preDialogueAwarenessSummary: currentAwarenessSummary,
      },
      fallbackProjectState: projectState,
    }), 1600) ?? directPreludeAwarenessLine
    const rescuedAwarenessSummary = preferProjectAwarenessSummary({
      awarenessLine: rescuedStructuredAwarenessLine,
      summaryCandidates: [
        currentAwarenessSummary,
        projectState.preflightSummary,
        directPreludeAwarenessLine,
      ],
      maxChars: 1600,
    }) ?? rescuedStructuredAwarenessLine

    return overrideMindTurnContractNextClosureTarget({
      contract: {
        ...contract,
        projectState: {
          ...projectState,
          preDialogueAwarenessLine: rescuedStructuredAwarenessLine,
          awarenessLine: rescuedStructuredAwarenessLine,
          preDialogueAwarenessSummary: rescuedAwarenessSummary,
          companionHeadlineLine:
            !currentCompanionHeadlineLine
            || currentCompanionHeadlineLine === currentAwarenessLine
            || isCanonicalStructuredProjectAwareness(currentCompanionHeadlineLine)
              ? rescuedStructuredAwarenessLine
              : projectState.companionHeadlineLine,
        } as AlicizationMindTurnContractSnapshot['projectState'] & Record<string, unknown>,
        preDialogueClosure: contract.preDialogueClosure
          ? {
              ...contract.preDialogueClosure,
              summaryLine: rescuedAwarenessSummary,
            }
          : contract.preDialogueClosure,
      } satisfies AlicizationMindTurnContractSnapshot,
      nextClosureTarget: normalizePreparedExecutionText(projectState.nextClosureTarget, 1600),
    })
  }
  if (
    currentAwarenessLine
    && !isThinProjectAwarenessAuthorityLine(currentAwarenessLine)
    && (
      carriesSpecificSameHerAuthorityLine(currentAwarenessLine)
      || hasModalitySpecificEmbodimentCue(currentAwarenessLine)
    )
    && !carriesExplicitProjectClosureTriplet(currentAwarenessLine)
  ) {
    return contract
  }

  const identity = normalizePreparedExecutionText(projectState.identity, 1600)
  const currentPhase = normalizePreparedExecutionText(projectState.currentPhase, 1600)
  const latestLandedProgress = normalizePreparedExecutionText(
    projectState.latestLandedProgress ?? projectState.latestProgress,
    12000,
  )
  const primaryOpenLoop = normalizePreparedExecutionText(projectState.primaryOpenLoop, 12000)
  const nextClosureTarget = normalizePreparedExecutionText(projectState.nextClosureTarget, 12000)
  const sameHerSelfLine = normalizePreparedExecutionText(projectState.sameHerSelfLine, 1600)
  const rebuiltAwarenessLine = buildProviderFacingProjectAwarenessLine({
    identity: identity ?? '',
    currentPhase: currentPhase ?? '',
    sameHerSelfLine,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
  })
  if (!rebuiltAwarenessLine || !carriesExplicitProjectClosureTriplet(rebuiltAwarenessLine))
    return contract

  const rebuiltAwarenessCarriesRuntimeClosure = !awarenessLineMissesRuntimeCarry({
    awarenessLine: rebuiltAwarenessLine,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
  })
  const currentAwarenessMissesRuntimeClosure = awarenessLineMissesRuntimeCarry({
    awarenessLine: currentAwarenessLine,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
  })
  const currentSummaryNeedsRescue = Boolean(
    currentAwarenessSummary
    && (
      isLegacyProjectAwarenessTemplateShell(currentAwarenessSummary)
      || !currentAwarenessLine
      || isLegacyProjectAwarenessTemplateShell(currentAwarenessLine)
      || currentAwarenessMissesRuntimeClosure
    ),
  )
  const currentLineNeedsRescue = Boolean(
    !currentAwarenessLine
    || isThinProjectAwarenessAuthorityLine(currentAwarenessLine)
    || isCompactProjectStatePreflightSummary(currentAwarenessLine)
    || isLegacyProjectAwarenessTemplateShell(currentAwarenessLine)
    || (
      currentAwarenessMissesRuntimeClosure
      && rebuiltAwarenessCarriesRuntimeClosure
    ),
  )
  if (!currentLineNeedsRescue && !currentSummaryNeedsRescue)
    return contract

  const currentCompanionHeadlineLine = normalizePreparedExecutionText(
    projectState.companionHeadlineLine,
    1600,
  )
  const rescuedAwarenessSummary = preferProjectAwarenessSummary({
    awarenessLine: rebuiltAwarenessLine,
    summaryCandidates: [
      currentAwarenessSummary,
      projectState.preflightSummary,
    ],
    maxChars: 1600,
  }) ?? rebuiltAwarenessLine

  return overrideMindTurnContractNextClosureTarget({
    contract: {
      ...contract,
      projectState: {
        ...projectState,
        preDialogueAwarenessLine: rebuiltAwarenessLine,
        awarenessLine: rebuiltAwarenessLine,
        preDialogueAwarenessSummary: rescuedAwarenessSummary,
        companionHeadlineLine:
            !currentCompanionHeadlineLine
            || currentCompanionHeadlineLine === currentAwarenessLine
            || isCanonicalStructuredProjectAwareness(currentCompanionHeadlineLine)
              ? rebuiltAwarenessLine
              : projectState.companionHeadlineLine,
      } as AlicizationMindTurnContractSnapshot['projectState'] & Record<string, unknown>,
      preDialogueClosure: contract.preDialogueClosure
        ? {
            ...contract.preDialogueClosure,
            summaryLine: rescuedAwarenessSummary,
          }
        : contract.preDialogueClosure,
    } satisfies AlicizationMindTurnContractSnapshot,
    nextClosureTarget,
  })
}

export const __alicizationTestOnly = {
  applyProviderFacingProjectStateToRuntimeSurface,
  enrichExecutionProjectBriefingWithPersonMemoryCapsule,
  isBlockedFixedTemplateEvidence,
  isStrongerSameHerProjectHeadline,
  isThinProjectAwarenessAuthorityLine,
  scoreRuntimeProjectStateDetailCandidate,
  overrideMindTurnContractNextClosureTarget,
  preferIncomingDialogueSessionMirror,
  readProjectStateFallbackFromSessionMirror,
  readRuntimeProjectStateFromSurface,
  readProviderFacingPayloadProjectState,
  rescueReturnedProviderFacingProjectAwareness,
  resolvePreferredRuntimeSurface,
  sanitizeOrdinaryDialogueProviderSystemBlock,
  sanitizeOrdinaryDialogueProviderMessages,
}

async function readLightweightPerformanceManifest(
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>,
) {
  try {
    return await getPerformanceManifest()
  }
  catch {
    return null
  }
}

export function createAlicizationMainChatSessionRuntime(options: CreateAlicizationMainChatSessionRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const buildOrganicMemorySystemBlocks
    = options.buildOrganicMemorySystemBlocks
      ?? (() => [])
  const buildPerformanceManifestSystemBlocks
    = options.buildPerformanceManifestSystemBlocks
      ?? (() => [])
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
    const rawPayload = input.payload
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)
    const payload = normalizedPayload
    const { prelude } = input
    const originalPreludeProjectAwarenessLine = normalizePreparedExecutionText(
      prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
      ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
      1600,
    )
    const originalPreludeProjectRhythmState
      = readRuntimeProjectStateFromSurface(prelude.perceptionAugmentation.digitalLifeRuntimeSurface) as Record<string, unknown>
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
    const memoryCarrySystemBlock = buildAlicizationDialogueMemoryCarrySystemBlock(memoryCarryPolicy)

    const provisionalHasVisualGrounding = !effectiveExecutionRoutingIntent && options.latestUserMessageContainsVisualInput(messages)
    const dialogueFirstLeanRuntimeBase = shouldUseDialogueFirstLivingPromptMode({
      actionObligation: prelude.actionObligation ?? null,
      capture: {
        inspectionRequested: prelude.perceptionAugmentation.capture.inspectionRequested,
        groundedThisTurn: prelude.perceptionAugmentation.capture.groundedThisTurn,
        health: prelude.perceptionAugmentation.capture.snapshot?.health ?? null,
        permission: prelude.perceptionAugmentation.capture.snapshot?.permission ?? null,
        fallbackReason: prelude.perceptionAugmentation.capture.fallbackReason,
        degradedReasons: prelude.perceptionAugmentation.capture.snapshot?.degradedReasons ?? [],
      },
      governance: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance ?? null,
      hasVisualGrounding: provisionalHasVisualGrounding,
    })
    const dialogueFirstLeanRuntime = dialogueFirstLeanRuntimeBase
      && payload.waitForTools !== true
      && !routingRequired
    const skipExecutionPhaseTracking = dialogueFirstLeanRuntime && !routingRequired
    const [contextualString, executionCallbackContext, executionLedgerContext, sessionContinuitySignals, agentSessionSensorySnapshot] = await Promise.all([
      agentTurn.trackPhase('contextual-memory', async () => await prelude.contextualStringPromise, {
        turnId: payload.turnId,
      }),
      skipExecutionPhaseTracking
        ? prelude.executionCallbackContextPromise.then((context) => {
            agentTurn.ingestRuntimeActions(context.actions)
            return context
          }).catch(() => emptyAlicizationExecutionCallbackContext)
        : agentTurn.trackPhase('execution-callbacks', async () => {
            const context = await prelude.executionCallbackContextPromise
            agentTurn.ingestRuntimeActions(context.actions)
            return context
          }, {
            sessionId: agentTurn.conversationSessionId,
          }),
      skipExecutionPhaseTracking
        ? prelude.executionLedgerContextPromise.catch(() => emptyAlicizationExecutionLedgerContext)
        : agentTurn.trackPhase('execution-ledger', async () => await prelude.executionLedgerContextPromise, {
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
      agentTurn.trackPhase('agent-session-context', async () => await agentTurn.getSensorySnapshot(), {
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
      buildSessionContinuityRecallSeed(sessionContinuitySignals ?? []),
      buildSessionMirrorRecollectionAfterthoughtSeed(previousSessionMirror),
      buildSessionMirrorRuntimeContinuitySeed(previousSessionMirror),
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
          suppressAssociativeRecall: prelude.perceptionAugmentation.chatGovernance.suppressAssociativeRecall,
          personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
          resolveContext: async () => await options.resolveOrganicMemoryPromptContext({
            recallSeed: organicRecallSeed,
            recallGovernor: prelude.perceptionAugmentation.recallGovernor,
            turnId: payload.turnId,
            budgetClass: organicMemoryRetrievalPolicySnapshot?.plan.budgetClass ?? organicMemoryBudgetClass,
            retrievalPolicySnapshot: organicMemoryRetrievalPolicySnapshot,
            digitalLifeRuntimeSurface: digitalLifeSpine?.runtimeSurface
              ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface
              ?? null,
          }),
          tuneContext: input => options.tuneOrganicMemoryPromptContextForExecutiveTurn({
            context: input.context,
            suppressAssociativeRecall: Boolean(input.suppressAssociativeRecall),
            personaKernelMode: (input.personaKernelMode ?? prelude.perceptionAugmentation.chatGovernance.personaKernelMode) as AlicizationMindTurnGovernance['personaKernelMode'],
            recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          }),
          nowMs: getNow,
        })
      }, {
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
        suppressAssociativeRecall: prelude.perceptionAugmentation.chatGovernance.suppressAssociativeRecall,
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
    const shouldIncludeProviderProjectStateContext = shouldIncludeProjectStateProviderContext({
      actionKind: prelude.actionObligation.kind,
      answerSubject: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.answerSubject ?? null,
      executionCapabilityInquiry: prelude.executionCapabilityInquiry,
      executionReplyObligation,
      executionRoutingIntent: effectiveExecutionRoutingIntent,
      latestUserText: readLatestUserMessageText(messages),
      messages,
    })
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
      applyRecollectionSurfaceRules: (governance) => {
        const recollectionSpeechVisibleSurfaceRules = buildRecollectionSpeechVisibleSurfaceRules(
          organicPromptContext.recollectionSpeechPlan ?? null,
        )
        return governance
          ? {
              ...governance,
              mustDo: mergeUniqueRules([
                ...recollectionSpeechVisibleSurfaceRules.mustDo,
                ...(governance.mustDo ?? []),
              ]),
              mustNotDo: mergeUniqueRules([
                ...recollectionSpeechVisibleSurfaceRules.mustNotDo,
                ...(governance.mustNotDo ?? []),
              ]),
            }
          : governance
      },
    })

    // NOTICE: Execution-routing intents are execution-governed turns. Do not allow
    // renderer payload flags to silently downgrade them into tool-disabled responses.
    const allowTools = dialogueFirstLeanRuntime
      ? false
      : (payload.supportsTools !== false || routingRequired)
    const waitForTools = dialogueFirstLeanRuntime
      ? false
      : (payload.waitForTools === true || routingRequired)
    const toolChoice = !dialogueFirstLeanRuntime && allowTools && effectiveExecutionRoutingIntent
      ? buildMainGatewayExecutionRoutingToolChoice(effectiveExecutionRoutingIntent)
      : undefined

    let executionRuntimeProjectBriefing: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['projectBriefing'] = null
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
          projectBriefing: executionRuntimeProjectBriefing ?? undefined,
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
      dialogueFirstLeanRuntime
        ? readLightweightPerformanceManifest(options.getPerformanceManifest)
        : agentTurn.trackPhase('performance-manifest', async () => await options.getPerformanceManifest(), {
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
      dialogueFirstLeanRuntime
        ? Promise.resolve([])
        : agentTurn.trackPhase('execution-capabilities', async () => await options.resolveExecutionCapabilitiesForPrompt(), {
            inquiryActive: prelude.executionCapabilityInquiry.active,
          }),
    ])
    const tools = filterMainGatewayToolsForRoutingIntent(builtTools, effectiveExecutionRoutingIntent)

    const runtimeCorePromptBlocks = options.buildMainRuntimeCorePromptBlocks({
      hostName,
      includeProjectStateContext: shouldIncludeProviderProjectStateContext,
      personaKernel,
    })
    const hasVisualGrounding = provisionalHasVisualGrounding
    const sessionPhases = normalizeSessionPhases([
      ...agentTurn.snapshot().phaseOrder,
      'runtime-surface',
    ])
    const sessionMirrorSystemBlock = agentTurn.conversationSessionId
      ? dialogueSessionManager.buildSessionMirrorSystemBlock({
          cardId: payload.cardId,
          sessionId: agentTurn.conversationSessionId,
        })
      : ''
    const preludePreparedRuntimeSurface = prelude.perceptionAugmentation.digitalLifeRuntimeSurface ?? null
    const spinePreparedRuntimeSurface = digitalLifeSpine?.runtimeSurface ?? null
    const preludeDirectPreparedAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
      preludePreparedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      preludePreparedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
      preludePreparedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary,
    ], 1600)
    const spineDirectPreparedAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
      spinePreparedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      spinePreparedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
      spinePreparedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary,
      spinePreparedRuntimeSurface?.raw?.runtimeDigest?.projectState?.preDialogueAwarenessLine,
      spinePreparedRuntimeSurface?.raw?.runtimeDigest?.projectState?.awarenessLine,
      spinePreparedRuntimeSurface?.raw?.runtimeDigest?.projectState?.preDialogueAwarenessSummary,
      spinePreparedRuntimeSurface?.cognition?.runtimeDigest?.projectState?.preDialogueAwarenessLine,
      spinePreparedRuntimeSurface?.cognition?.runtimeDigest?.projectState?.awarenessLine,
      spinePreparedRuntimeSurface?.cognition?.runtimeDigest?.projectState?.preDialogueAwarenessSummary,
    ], 1600)
    const shouldPreferPreludePreparedRuntimeSurface = Boolean(
      preludePreparedRuntimeSurface
      && preludeDirectPreparedAwarenessLine
      && !isThinProjectAwarenessAuthorityLine(preludeDirectPreparedAwarenessLine)
      && /callback return|same thread/iu.test(preludeDirectPreparedAwarenessLine)
      && shouldPreserveProjectAwarenessLineVerbatim(
        preludeDirectPreparedAwarenessLine,
        spineDirectPreparedAwarenessLine,
      ),
    )
    const preparedRuntimeAwarenessSeedSurface = shouldPreferPreludePreparedRuntimeSurface
      ? preludePreparedRuntimeSurface
      : resolvePreferredRuntimeSurface({
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
    executionRuntimeProjectBriefing = runtimeSurfaceForBuilder
      ? buildAlicizationExecutionRuntimeContext({
        agentSessionId: agentTurn.agentSessionId,
        affectiveResidue: executionRuntimeAffectiveResidue ?? null,
        cardId: payload.cardId,
        turnId: payload.turnId,
        decisionTraceId: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.decisionTraceId ?? null,
        derivedMindStateBundle: executionRuntimeDerivedMindStateBundle ?? null,
        memoryClosureTrace: executionRuntimeMemoryClosureTrace ?? null,
        sessionId: agentTurn.conversationSessionId,
        projectBriefing: enrichExecutionProjectBriefingWithPersonMemoryCapsule(
          readRuntimeProjectStateFromSurface(runtimeSurfaceForBuilder),
          runtimeSurfaceForBuilder,
        ),
        sensorySnapshot: agentSessionSensorySnapshot,
      }).projectBriefing ?? null
      : null
    const executionCapabilityRuntimeContext = buildAlicizationExecutionRuntimeContext({
      agentSessionId: agentTurn.agentSessionId,
      affectiveResidue: executionRuntimeAffectiveResidue ?? null,
      cardId: payload.cardId,
      turnId: payload.turnId,
      decisionTraceId: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.decisionTraceId ?? null,
      derivedMindStateBundle: executionRuntimeDerivedMindStateBundle ?? null,
      memoryClosureTrace: executionRuntimeMemoryClosureTrace ?? null,
      sessionId: agentTurn.conversationSessionId,
      projectBriefing: executionRuntimeProjectBriefing,
      sensorySnapshot: agentSessionSensorySnapshot,
    })
    const effectiveDigitalLifeSpine = buildEffectiveDigitalLifeSpine({
      digitalLifeSpine,
      fresherRuntimeSurface: preparedRuntimeSurfaceSelection.fresherRuntimeSurface,
    })

    const runtimeSurface = await agentTurn.trackPhase('runtime-surface', async () => {
      return buildAlicizationMainChatRuntimeSurface({
        actionObligation: prelude.actionObligation,
        actionObligationSystemBlock: buildMainChatActionObligationSystemBlock(prelude.actionObligation),
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
        executionCapabilitySystemBlocks: shouldIncludeProviderProjectStateContext
          ? buildExecutionCapabilitySystemBlocks(
              executionCapabilities,
              options.executionCapabilityChannels,
              {
                allowTools,
                inquiry: prelude.executionCapabilityInquiry,
                runtimeContext: executionCapabilityRuntimeContext,
              },
            )
          : [],
        executionRoutingEnforcementSystemBlock: effectiveExecutionRoutingIntent
          ? buildExecutionRoutingEnforcementSystemBlock(effectiveExecutionRoutingIntent)
          : undefined,
        executionCallbackSystemBlocks: (!dialogueFirstLeanRuntime || Boolean(executionReplyObligation)) && executionCallbackContext.systemBlock
          ? [executionCallbackContext.systemBlock]
          : [],
        executionLedgerSystemBlocks: executionLedgerContext.systemBlock
          ? [executionLedgerContext.systemBlock]
          : [],
        executionReplyObligationSystemBlock: executionReplyObligation
          ? buildMainChatExecutionReplyObligationSystemBlock(executionReplyObligation)
          : undefined,
        agentRuntimeSystemBlocks: [
          memoryCarrySystemBlock,
          sessionMirrorSystemBlock,
          shouldIncludeProviderProjectStateContext
            ? agentTurn.buildSessionSystemBlock()
            : '',
        ],
        organicMemorySystemBlocks: buildOrganicMemorySystemBlocks(organicPromptContext, memoryTurnArtifact),
        performanceManifestSystemBlocks: buildPerformanceManifestSystemBlocks(performanceManifest),
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
    const providerPlanningMessages = sanitizeOrdinaryDialogueProviderMessages(runtimeSurface.messages)
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
    const workingMemoryPrompt = buildWorkingMemoryPromptBlockFromRuntime({
      cardId: payload.cardId,
      currentConsciousFrame: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame ?? null,
      conversationState: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.conversationState ?? null,
      dialogueWorldThread: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.dialogueWorldThread ?? null,
      executionCallbackRecallText: executionCallbackContext.recallText,
      executionLedgerRecallText: executionLedgerContext.recallText,
      messages: providerPlanningMessages,
      now,
      persistedRecentTurns,
      previousSnapshot: workingMemoryStore.get(payload.cardId, workingMemorySessionId),
      sessionId: workingMemorySessionId,
    })
    workingMemoryStore.upsert(workingMemoryPrompt.snapshot)
    let longTermMemoryBundle: LongTermMemoryEvidenceBundle | null = null
    if (options.retrieveLongTermMemoryEvidence) {
      try {
        longTermMemoryBundle = await options.retrieveLongTermMemoryEvidence({
          cardId: payload.cardId,
          currentUserText: readLatestUserMessageText(providerPlanningMessages),
          workingMemoryQueryHints: workingMemoryPrompt.ownerContext.queryHints,
          currentThreadTitle: workingMemoryPrompt.ownerContext.current.threadTitle,
          activeTask: workingMemoryPrompt.ownerContext.current.activeTask,
          limit: 5,
        })
      }
      catch (error) {
        longTermMemoryBundle = {
          intent: {
            mode: 'none',
            shouldRecall: false,
            confidence: 0,
            rationale: 'Long-term memory recall failed.',
            temporalFocus: 'unspecified',
            targetKinds: [],
            queryHints: [],
            riskFlags: ['recall-failed'],
          },
          plan: {
            rawQuery: readLatestUserMessageText(runtimeSurface.messages),
            normalizedQuery: readLatestUserMessageText(runtimeSurface.messages),
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
            riskFlags: ['recall-failed'],
            targetKinds: [],
          },
          evidence: [],
          confidence: 0,
          budgetClass: 'none',
        }
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
    const memoryContext = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryPrompt.ownerContext,
      longTermRecall: longTermMemoryBundle,
    })
    if (workingMemoryPrompt.ownerContext.longTermQueue.length > 0 && options.enqueueWorkingMemoryLongTermQueue) {
      try {
        await options.enqueueWorkingMemoryLongTermQueue({
          cardId: payload.cardId,
          sessionId: workingMemorySessionId,
          items: workingMemoryPrompt.ownerContext.longTermQueue,
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
      snapshot: workingMemoryPrompt.snapshot,
    })
    if (workingMemoryOwnedRuntimeSurface) {
      runtimeSurface.digitalLifeRuntimeSurface = workingMemoryOwnedRuntimeSurface
      prelude.perceptionAugmentation.digitalLifeRuntimeSurface = workingMemoryOwnedRuntimeSurface
    }
    const fresherRuntimeSurfaceForProviderFacing
      = preparedRuntimeSurfaceSelection.fresherRuntimeSurface
        ?? runtimeSurfaceForBuilder
        ?? runtimeSurface.digitalLifeRuntimeSurface
    const fresherRuntimeProjectState = readRuntimeProjectStateFromSurface(fresherRuntimeSurfaceForProviderFacing)
    const mirrorProjectStateFallback = readProjectStateFallbackFromSessionMirror(previousSessionMirror)
    const fresherDialogueProjectState
      = fresherRuntimeSurfaceForProviderFacing?.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
    const preludeDialogueProjectState
      = prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
    const preludeRuntimeProjectState = readRuntimeProjectStateFromSurface(
      prelude.perceptionAugmentation.digitalLifeRuntimeSurface ?? null,
    )
    const preludeSpineRuntimeProjectState = readRuntimeProjectStateFromSurface(
      prelude.perceptionAugmentation.digitalLifeSpine?.runtimeSurface ?? null,
    )
    const preludeSpineDialogueProjectState
      = prelude.perceptionAugmentation.digitalLifeSpine?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
    const preferredSeedPreflightSummary = pickStrongerProjectAwarenessLine([
      fresherDialogueProjectState?.preflightSummary,
      preludeDialogueProjectState?.preflightSummary,
      preludeSpineDialogueProjectState?.preflightSummary,
      mirrorProjectStateFallback.preflightSummary,
      preludeSpineRuntimeProjectState.preflightSummary,
      fresherRuntimeProjectState.preflightSummary,
      preludeSpineRuntimeProjectState.preDialogueAwarenessLine,
      fresherRuntimeProjectState.preDialogueAwarenessLine,
    ], 1600)
    ?? fresherRuntimeProjectState.preflightSummary
    const preferredSeedAwarenessCandidate = pickPreferredRuntimeProjectStateDetail([
      fresherDialogueProjectState?.preDialogueAwarenessLine,
      fresherDialogueProjectState?.awarenessLine,
      fresherDialogueProjectState?.preDialogueAwarenessSummary,
      preludeDialogueProjectState?.preDialogueAwarenessLine,
      preludeDialogueProjectState?.awarenessLine,
      preludeDialogueProjectState?.preDialogueAwarenessSummary,
      preludeSpineDialogueProjectState?.preDialogueAwarenessLine,
      preludeSpineDialogueProjectState?.awarenessLine,
      preludeSpineDialogueProjectState?.preDialogueAwarenessSummary,
      mirrorProjectStateFallback.preDialogueAwarenessLine,
      mirrorProjectStateFallback.preflightSummary,
      preludeSpineRuntimeProjectState.preDialogueAwarenessLine,
      preludeSpineRuntimeProjectState.preflightSummary,
      fresherRuntimeProjectState.preDialogueAwarenessLine,
      fresherRuntimeProjectState.preflightSummary,
    ], 'awareness', 1600)
    const preferredSeedDirectDialogueAwarenessValues = [
      fresherDialogueProjectState?.preDialogueAwarenessLine,
      fresherDialogueProjectState?.awarenessLine,
      preludeDialogueProjectState?.preDialogueAwarenessLine,
      preludeDialogueProjectState?.awarenessLine,
      preludeSpineDialogueProjectState?.preDialogueAwarenessLine,
      preludeSpineDialogueProjectState?.awarenessLine,
    ]
    const preferredSeedDirectDialogueAwareness = preferredSeedDirectDialogueAwarenessValues
      .map(value => normalizeProviderFacingProjectText(value, 1600))
      .find(value =>
        value
        && !isThinProjectAwarenessAuthorityLine(value)
        && !isCanonicalStructuredProjectAwareness(value)
        && /callback return|same thread/u.test(value.toLowerCase()),
      )
      ?? pickProjectAwarenessLineWithoutCompactSummaryShell(preferredSeedDirectDialogueAwarenessValues, 1600)
    const preferredSeedCompanionValues = [
      fresherDialogueProjectState?.companionHeadlineLine,
      preludeDialogueProjectState?.companionHeadlineLine,
      preludeSpineDialogueProjectState?.companionHeadlineLine,
      preludeSpineRuntimeProjectState.companionHeadlineLine,
      fresherRuntimeProjectState.companionHeadlineLine,
      mirrorProjectStateFallback.preDialogueAwarenessLine,
    ]
    const preferredSeedCompanionCandidate = preferredSeedCompanionValues
      .map(value => normalizeProviderFacingProjectText(value, 1600))
      .find(value =>
        value
        && !isThinProjectAwarenessAuthorityLine(value)
        && !carriesExplicitProjectClosureTriplet(value)
        && !isCanonicalStructuredProjectAwareness(value),
      )
      ?? pickPreferredRuntimeProjectStateDetail(preferredSeedCompanionValues, 'awareness', 1600)
    const preferredSeedDirectDialogueCompanion = pickProjectAwarenessLineWithoutCompactSummaryShell([
      fresherDialogueProjectState?.companionHeadlineLine,
      preludeDialogueProjectState?.companionHeadlineLine,
      preludeSpineDialogueProjectState?.companionHeadlineLine,
    ], 1600)
    const preferredSeedSameHerSelfLine = pickPreferredRuntimeProjectStateDetail([
      fresherDialogueProjectState?.sameHerSelfLine,
      preludeDialogueProjectState?.sameHerSelfLine,
      preludeSpineDialogueProjectState?.sameHerSelfLine,
      mirrorProjectStateFallback.sameHerSelfLine,
      preludeSpineRuntimeProjectState.sameHerSelfLine,
      fresherRuntimeProjectState.sameHerSelfLine,
    ], 'same-her', 1600)
    let preferredSeedAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine:
          (
            preferredSeedDirectDialogueAwareness
            && shouldPreserveProjectAwarenessLineVerbatim(
              preferredSeedDirectDialogueAwareness,
              preferredSeedAwarenessCandidate,
            )
          )
            ? preferredSeedDirectDialogueAwareness
            : preferredSeedAwarenessCandidate,
        awarenessLine:
          (
            preferredSeedDirectDialogueAwareness
            && shouldPreserveProjectAwarenessLineVerbatim(
              preferredSeedDirectDialogueAwareness,
              preferredSeedAwarenessCandidate,
            )
          )
            ? preferredSeedDirectDialogueAwareness
            : preferredSeedAwarenessCandidate,
        preDialogueAwarenessSummary: pickPreferredRuntimeProjectStateDetail([
          fresherDialogueProjectState?.preDialogueAwarenessSummary,
          preludeDialogueProjectState?.preDialogueAwarenessSummary,
          preludeSpineDialogueProjectState?.preDialogueAwarenessSummary,
        ], 'awareness', 1600),
        sameHerSelfLine: preferredSeedSameHerSelfLine,
        companionHeadlineLine:
          (
            preferredSeedDirectDialogueCompanion
            && shouldPreserveProjectAwarenessLineVerbatim(
              preferredSeedDirectDialogueCompanion,
              preferredSeedCompanionCandidate,
            )
          )
            ? preferredSeedDirectDialogueCompanion
            : preferredSeedCompanionCandidate,
        preflightSummary: preferredSeedPreflightSummary,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine:
          preludeSpineRuntimeProjectState.preDialogueAwarenessLine
          ?? fresherRuntimeProjectState.preDialogueAwarenessLine,
        awarenessLine:
          preludeSpineRuntimeProjectState.preDialogueAwarenessLine
          ?? fresherRuntimeProjectState.preDialogueAwarenessLine,
        sameHerSelfLine:
          preludeSpineRuntimeProjectState.sameHerSelfLine
          ?? fresherRuntimeProjectState.sameHerSelfLine,
        companionHeadlineLine:
          preludeSpineRuntimeProjectState.companionHeadlineLine
          ?? fresherRuntimeProjectState.companionHeadlineLine,
        preflightSummary: preferredSeedPreflightSummary,
      },
    })
    ?? preludeSpineRuntimeProjectState.preDialogueAwarenessLine
    ?? fresherRuntimeProjectState.preDialogueAwarenessLine
    const preferredSeedAwarenessCarriesRuntimeSpecificSameHer = Boolean(
      preferredSeedAwarenessLine
      && preferredSeedSameHerSelfLine
      && !looksLikeThinRuntimeProjectStateDetail(preferredSeedSameHerSelfLine, 'same-her')
      && preferredSeedAwarenessLine.includes(preferredSeedSameHerSelfLine),
    )
    const preferredSeedAwarenessCandidateWouldDropRuntimeSpecificSameHer = Boolean(
      preferredSeedAwarenessCandidate
      && preferredSeedAwarenessCarriesRuntimeSpecificSameHer
      && !normalizeProviderFacingProjectText(preferredSeedAwarenessCandidate, 1600)?.includes(preferredSeedSameHerSelfLine ?? ''),
    )
    const shouldReplacePreferredSeedAwarenessLineWithCandidate = Boolean(
      !preferredSeedAwarenessCandidateWouldDropRuntimeSpecificSameHer
      && (
        preferredSeedAwarenessCandidate
        && shouldPreserveProjectAwarenessLineVerbatim(
          preferredSeedAwarenessCandidate,
          preferredSeedAwarenessLine,
        )
        && (
          !preferredSeedAwarenessLine
          || isThinProjectAwarenessAuthorityLine(preferredSeedAwarenessLine)
          || isStrongerSameHerProjectHeadline(
            preferredSeedAwarenessCandidate,
            preferredSeedAwarenessLine,
          )
        )),
    )
    if (shouldReplacePreferredSeedAwarenessLineWithCandidate) {
      preferredSeedAwarenessLine = normalizeProviderFacingProjectText(
        preferredSeedAwarenessCandidate,
        1600,
      )
    }
    const shouldKeepPreferredSeedCompanionHeadline = Boolean(
      preferredSeedCompanionCandidate
      && !isThinProjectAwarenessAuthorityLine(preferredSeedCompanionCandidate)
      && (
        shouldPreserveProjectAwarenessLineVerbatim(
          preferredSeedCompanionCandidate,
          preferredSeedAwarenessLine,
        )
        || isStrongerSameHerProjectHeadline(
          preferredSeedCompanionCandidate,
          preferredSeedAwarenessLine,
        )
        || (
          !carriesExplicitProjectClosureTriplet(preferredSeedCompanionCandidate)
          && !isCanonicalStructuredProjectAwareness(preferredSeedCompanionCandidate)
          && (!carriesBroaderProjectClosureFrame(preferredSeedAwarenessLine)
            || !hasDistinctEmbodimentClosureCue(preferredSeedCompanionCandidate)
            || carriesBroaderProjectClosureFrame(preferredSeedCompanionCandidate))
        )
      ),
    )
    let preferredSeedCompanionHeadlineLine = shouldPreferRuntimeCompanionHeadline({
      awarenessLine: preferredSeedAwarenessLine ?? null,
      companionHeadlineLine: preferredSeedCompanionCandidate,
    })
      ? preferredSeedCompanionCandidate
      : shouldKeepPreferredSeedCompanionHeadline
        ? preferredSeedCompanionCandidate
        : pickPreferredRuntimeProjectStateDetail([
          preferredSeedCompanionCandidate,
          preludeSpineRuntimeProjectState.companionHeadlineLine,
          fresherRuntimeProjectState.companionHeadlineLine,
          preferredSeedAwarenessLine,
        ], 'awareness', 1600)
        ?? preferredSeedAwarenessLine
    const preferredSeedDirectDialogueLatestLandedProgress = normalizeProviderFacingProjectText(
      fresherDialogueProjectState?.latestLandedProgress
      ?? fresherDialogueProjectState?.latestProgress
      ?? preludeDialogueProjectState?.latestLandedProgress
      ?? preludeDialogueProjectState?.latestProgress
      ?? preludeSpineDialogueProjectState?.latestLandedProgress
      ?? preludeSpineDialogueProjectState?.latestProgress,
      12000,
    )
    const preferredSeedDirectDialogueLatestLandedProgressLooksTruncated = isTruncatedRuntimeProjectStateDetailPrefix({
      current: preferredSeedDirectDialogueLatestLandedProgress,
      candidates: [
        fresherRuntimeProjectState.latestLandedProgress,
        preludeRuntimeProjectState.latestLandedProgress,
        preludeSpineRuntimeProjectState.latestLandedProgress,
        mirrorProjectStateFallback.latestLandedProgress,
      ],
    })
    const preferredSeedLatestLandedProgress = (
      preferredSeedDirectDialogueLatestLandedProgress
      && !preferredSeedDirectDialogueLatestLandedProgressLooksTruncated
      && !looksLikeThinRuntimeProjectStateDetail(preferredSeedDirectDialogueLatestLandedProgress, 'landed')
    )
      ? preferredSeedDirectDialogueLatestLandedProgress
      : pickPreferredRuntimeProjectStateDetail([
        fresherRuntimeProjectState.latestLandedProgress,
        preludeRuntimeProjectState.latestLandedProgress,
        preludeSpineRuntimeProjectState.latestLandedProgress,
        mirrorProjectStateFallback.latestLandedProgress,
      ], 'landed', 12000)
      ?? preferredSeedDirectDialogueLatestLandedProgress
    const preferredSeedDirectDialoguePrimaryOpenLoop = normalizeProviderFacingProjectText(
      fresherDialogueProjectState?.primaryOpenLoop
      ?? preludeDialogueProjectState?.primaryOpenLoop
      ?? preludeSpineDialogueProjectState?.primaryOpenLoop,
      12000,
    )
    const preferredSeedDirectDialoguePrimaryOpenLoopLooksTruncated = isTruncatedRuntimeProjectStateDetailPrefix({
      current: preferredSeedDirectDialoguePrimaryOpenLoop,
      candidates: [
        fresherRuntimeProjectState.primaryOpenLoop,
        preludeSpineRuntimeProjectState.primaryOpenLoop,
        mirrorProjectStateFallback.primaryOpenLoop,
      ],
    })
    const preferredSeedPrimaryOpenLoop = (
      preferredSeedDirectDialoguePrimaryOpenLoop
      && !preferredSeedDirectDialoguePrimaryOpenLoopLooksTruncated
      && !looksLikeThinRuntimeProjectStateDetail(preferredSeedDirectDialoguePrimaryOpenLoop, 'open')
    )
      ? preferredSeedDirectDialoguePrimaryOpenLoop
      : pickPreferredRuntimeProjectStateDetail([
        fresherRuntimeProjectState.primaryOpenLoop,
        preludeSpineRuntimeProjectState.primaryOpenLoop,
        mirrorProjectStateFallback.primaryOpenLoop,
      ], 'open', 12000)
      ?? preferredSeedDirectDialoguePrimaryOpenLoop
    const preferredSeedSameHerDriftRisk = pickPreferredRuntimeProjectStateDetail([
      fresherDialogueProjectState?.sameHerDriftRisk,
      preludeDialogueProjectState?.sameHerDriftRisk,
      preludeSpineDialogueProjectState?.sameHerDriftRisk,
      mirrorProjectStateFallback.sameHerDriftRisk,
      preludeSpineRuntimeProjectState.sameHerDriftRisk,
      fresherRuntimeProjectState.sameHerDriftRisk,
    ], 'drift', 1600)
    const preferredSeedContinuityPreferredTiming = pickProviderFacingContinuityPreferredTiming([
      fresherDialogueProjectState?.continuityPreferredTiming,
      preludeDialogueProjectState?.continuityPreferredTiming,
      preludeSpineDialogueProjectState?.continuityPreferredTiming,
      preludeSpineRuntimeProjectState.continuityPreferredTiming,
      fresherRuntimeProjectState.continuityPreferredTiming,
    ])
    const preferredSeedContinuityCadence = pickProviderFacingContinuityCadence([
      fresherDialogueProjectState?.continuityCadence,
      preludeDialogueProjectState?.continuityCadence,
      preludeSpineDialogueProjectState?.continuityCadence,
      preludeSpineRuntimeProjectState.continuityCadence,
      fresherRuntimeProjectState.continuityCadence,
      originalPreludeProjectRhythmState.continuityCadence,
    ])
    const preferredSeedBlinkCadence = normalizeProviderFacingBlinkCadence(
      fresherDialogueProjectState?.preferredBlinkCadence
      ?? preludeDialogueProjectState?.preferredBlinkCadence
      ?? preludeSpineDialogueProjectState?.preferredBlinkCadence
      ?? preludeSpineRuntimeProjectState.preferredBlinkCadence
      ?? fresherRuntimeProjectState.preferredBlinkCadence
      ?? originalPreludeProjectRhythmState.preferredBlinkCadence,
    )
    const preferredSeedGazeMode = normalizeProviderFacingGazeMode(
      fresherDialogueProjectState?.preferredGazeMode
      ?? preludeDialogueProjectState?.preferredGazeMode
      ?? preludeSpineDialogueProjectState?.preferredGazeMode
      ?? preludeSpineRuntimeProjectState.preferredGazeMode
      ?? fresherRuntimeProjectState.preferredGazeMode
      ?? originalPreludeProjectRhythmState.preferredGazeMode,
    )
    const preferredSeedPauseMode = normalizeProviderFacingPauseMode(
      fresherDialogueProjectState?.preferredPauseMode
      ?? preludeDialogueProjectState?.preferredPauseMode
      ?? preludeSpineDialogueProjectState?.preferredPauseMode
      ?? preludeSpineRuntimeProjectState.preferredPauseMode
      ?? fresherRuntimeProjectState.preferredPauseMode,
    )
    const preferredSeedLipsyncMode = normalizeProviderFacingLipsyncMode(
      fresherDialogueProjectState?.preferredLipsyncMode
      ?? preludeDialogueProjectState?.preferredLipsyncMode
      ?? preludeSpineDialogueProjectState?.preferredLipsyncMode
      ?? preludeSpineRuntimeProjectState.preferredLipsyncMode
      ?? fresherRuntimeProjectState.preferredLipsyncMode,
    )
    const preferredSeedVoiceMode = normalizeProviderFacingVoiceMode(
      fresherDialogueProjectState?.preferredVoiceMode
      ?? preludeDialogueProjectState?.preferredVoiceMode
      ?? preludeSpineDialogueProjectState?.preferredVoiceMode
      ?? preludeSpineRuntimeProjectState.preferredVoiceMode
      ?? fresherRuntimeProjectState.preferredVoiceMode,
    )
    const preferredSeedPacingMode = normalizeProviderFacingPacingMode(
      fresherDialogueProjectState?.preferredPacingMode
      ?? preludeDialogueProjectState?.preferredPacingMode
      ?? preludeSpineDialogueProjectState?.preferredPacingMode
      ?? preludeSpineRuntimeProjectState.preferredPacingMode
      ?? fresherRuntimeProjectState.preferredPacingMode,
    )
    const fresherDirectNextClosureTarget = normalizeProviderFacingProjectText(fresherDialogueProjectState?.nextClosureTarget, 12000)
    const preludeDirectNextClosureTarget = normalizeProviderFacingProjectText(preludeDialogueProjectState?.nextClosureTarget, 12000)
    const preludeSpineDirectNextClosureTarget = normalizeProviderFacingProjectText(preludeSpineDialogueProjectState?.nextClosureTarget, 12000)
    const mirrorNextClosureTarget = normalizeProviderFacingProjectText(mirrorProjectStateFallback.nextClosureTarget, 12000)
    const fresherDirectNextClosureTargetLooksTruncated = isTruncatedRuntimeProjectStateDetailPrefix({
      current: fresherDirectNextClosureTarget,
      candidates: [
        fresherRuntimeProjectState.nextClosureTarget,
        preludeSpineRuntimeProjectState.nextClosureTarget,
        mirrorNextClosureTarget,
      ],
    })
    const preferredSeedNextClosureTarget = fresherDirectNextClosureTarget
      && !fresherDirectNextClosureTargetLooksTruncated
      && !looksLikeThinRuntimeProjectStateDetail(fresherDirectNextClosureTarget, 'next')
      && !/cross-modal same-her proof|same-her inward-carry observability/iu.test(fresherDirectNextClosureTarget)
      ? fresherDirectNextClosureTarget
      : pickPreferredRuntimeProjectStateDetail([
        preludeDirectNextClosureTarget,
        preludeSpineDirectNextClosureTarget,
        fresherRuntimeProjectState.nextClosureTarget,
        preludeSpineRuntimeProjectState.nextClosureTarget,
        mirrorNextClosureTarget,
        fresherDirectNextClosureTarget,
      ], 'next', 12000)
      ?? preludeDirectNextClosureTarget
      ?? preludeSpineDirectNextClosureTarget
      ?? fresherRuntimeProjectState.nextClosureTarget
      ?? preludeSpineRuntimeProjectState.nextClosureTarget
      ?? mirrorNextClosureTarget
      ?? fresherDirectNextClosureTarget
    const preferredSeedAnchoredAwarenessLine = buildProviderFacingProjectAwarenessLine({
      identity: fresherRuntimeProjectState.identity,
      currentPhase: fresherRuntimeProjectState.currentPhase,
      sameHerSelfLine: preferredSeedSameHerSelfLine ?? fresherRuntimeProjectState.sameHerSelfLine,
      latestLandedProgress: preferredSeedLatestLandedProgress ?? fresherRuntimeProjectState.latestLandedProgress,
      primaryOpenLoop: preferredSeedPrimaryOpenLoop ?? fresherRuntimeProjectState.primaryOpenLoop,
      nextClosureTarget: preferredSeedNextClosureTarget ?? fresherRuntimeProjectState.nextClosureTarget,
    })
    const preferredSeedAwarenessAlreadyCarriesLivedInSameHerClosure = Boolean(
      preferredSeedAwarenessLine
      && !isThinProjectAwarenessAuthorityLine(preferredSeedAwarenessLine)
      && !isCanonicalStructuredProjectAwareness(preferredSeedAwarenessLine)
      && (
        carriesSpecificSameHerAuthorityLine(preferredSeedAwarenessLine)
        || shouldPreserveProjectAwarenessLineVerbatim(
          preferredSeedAwarenessLine,
          preferredSeedAnchoredAwarenessLine,
        )
        || /same unfinished closure work|still belongs to one living her|same living line|one living her|same phase 1 digital life|one continuous her|still-open phase 1 closure|initiative and embodiment closure/iu.test(
          preferredSeedAwarenessLine,
        )
      ),
    )
    const preferredSeedCompanionAlreadyCarriesLivedInSameHerClosure = Boolean(
      preferredSeedCompanionCandidate
      && !isThinProjectAwarenessAuthorityLine(preferredSeedCompanionCandidate)
      && !isCanonicalStructuredProjectAwareness(preferredSeedCompanionCandidate)
      && (
        carriesSpecificSameHerAuthorityLine(preferredSeedCompanionCandidate)
        || shouldPreserveProjectAwarenessLineVerbatim(
          preferredSeedCompanionCandidate,
          preferredSeedAnchoredAwarenessLine,
        )
        || /same unfinished closure work|still belongs to one living her|same living line|one living her|same phase 1 digital life|one continuous her|still-open phase 1 closure|initiative and embodiment closure/iu.test(
          preferredSeedCompanionCandidate,
        )
      ),
    )
    const preferredSeedSameHerSelfLineLooksLikeGenericSummaryCarry = Boolean(
      preferredSeedSameHerSelfLine
      && /^same phase 1 digital life\./iu.test(preferredSeedSameHerSelfLine),
    )
    const shouldPreferAnchoredSameHerContinuitySeed = Boolean(
      preferredSeedAnchoredAwarenessLine
      && preferredSeedSameHerSelfLine
      && !preferredSeedSameHerSelfLineLooksLikeGenericSummaryCarry
      && !preferredSeedAwarenessAlreadyCarriesLivedInSameHerClosure
      && !preferredSeedCompanionAlreadyCarriesLivedInSameHerClosure
      && !looksLikeThinRuntimeProjectStateDetail(preferredSeedSameHerSelfLine, 'same-her')
      && /same living line|same-her|same her|one living her|one continuous her|generic project shell|generic assistant|without splitting her continuity/iu.test(
        preferredSeedSameHerSelfLine,
      )
      && (
        !preferredSeedAwarenessLine
        || isThinProjectAwarenessAuthorityLine(preferredSeedAwarenessLine)
        || (
          !preferredSeedAwarenessLine.includes(preferredSeedSameHerSelfLine)
          && awarenessCarriesBroaderProjectFrame(preferredSeedAwarenessLine)
        )
      )
      && !/callback return|same thread/iu.test(preferredSeedAwarenessLine ?? ''),
    )
    if (shouldPreferAnchoredSameHerContinuitySeed) {
      preferredSeedAwarenessLine = preferredSeedAnchoredAwarenessLine
    }
    const preferredSeedPayloadProjectState = readProviderFacingPayloadProjectState(rawPayload)
    const preferredSeedDirectPayloadPreflightSummary = normalizeProviderFacingProjectText(
      readDirectPayloadPreflightSummary(rawPayload, 1600),
      1600,
    )
    const preferredSeedDirectPayloadPreflightSummaryLooksThin = Boolean(
      preferredSeedDirectPayloadPreflightSummary
      && (
        isThinProjectAwarenessAuthorityLine(preferredSeedDirectPayloadPreflightSummary)
        || isCompactProjectStatePreflightSummary(preferredSeedDirectPayloadPreflightSummary)
      ),
    )
    const preferredSeedMirrorPreflightAwarenessLine = pickProjectAwarenessLineWithoutCompactSummaryShell([
      mirrorProjectStateFallback.preDialogueAwarenessLine,
      mirrorProjectStateFallback.preflightSummary,
    ], 1600)
    const preferredSeedAwarenessIsHoldOnlyDetail = Boolean(
      preferredSeedAwarenessLine
      && !isLegacyProjectAwarenessTemplateShell(preferredSeedAwarenessLine)
      && (
        carriesLivedInSameHerAuthorityLine(preferredSeedAwarenessLine)
        || looksLikeNarrowContinuityCadenceAwarenessLine(preferredSeedAwarenessLine)
      )
      && !awarenessCarriesBroaderProjectFrame(preferredSeedAwarenessLine),
    )
    const shouldPreferMirrorContinuityPreflightOverStructuredSeedAwareness = Boolean(
      !preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
      && preferredSeedMirrorPreflightAwarenessLine
      && !isLegacyProjectAwarenessTemplateShell(preferredSeedMirrorPreflightAwarenessLine)
      && !isThinProjectAwarenessAuthorityLine(preferredSeedMirrorPreflightAwarenessLine)
      && !isCompactProjectStatePreflightSummary(preferredSeedMirrorPreflightAwarenessLine)
      && preferredSeedAwarenessLine
      && !isLegacyProjectAwarenessTemplateShell(preferredSeedAwarenessLine)
      && (
        awarenessCarriesBroaderProjectFrame(preferredSeedAwarenessLine)
        || preferredSeedAwarenessIsHoldOnlyDetail
      )
      && (
        !preferredSeedAwarenessCandidate
        || !isLegacyProjectAwarenessTemplateShell(preferredSeedAwarenessCandidate)
        || isCanonicalStructuredProjectAwareness(preferredSeedAwarenessCandidate)
      )
      && shouldPreserveProjectAwarenessLineVerbatim(
        preferredSeedMirrorPreflightAwarenessLine,
        preferredSeedAwarenessLine,
      ),
    )
    if (shouldPreferMirrorContinuityPreflightOverStructuredSeedAwareness) {
      preferredSeedAwarenessLine = isLegacyProjectAwarenessTemplateShell(preferredSeedMirrorPreflightAwarenessLine)
        ? buildProviderFacingProjectAwarenessLine({
            identity: fresherRuntimeProjectState.identity,
            currentPhase: fresherRuntimeProjectState.currentPhase,
            sameHerSelfLine: preferredSeedSameHerSelfLine ?? fresherRuntimeProjectState.sameHerSelfLine,
            latestLandedProgress: preferredSeedLatestLandedProgress ?? fresherRuntimeProjectState.latestLandedProgress,
            primaryOpenLoop: preferredSeedPrimaryOpenLoop ?? fresherRuntimeProjectState.primaryOpenLoop,
            nextClosureTarget: preferredSeedNextClosureTarget ?? fresherRuntimeProjectState.nextClosureTarget,
          })
        : preferredSeedMirrorPreflightAwarenessLine
    }
    const preferredSeedPayloadAwarenessLine = preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
      ? resolvePreferredPayloadAwarenessLine({
          awarenessLine: preferredSeedPayloadProjectState.explicitPayloadProjectAwarenessLine,
          headlineLine: preferredSeedPayloadProjectState.explicitPayloadProjectHeadline,
        })
      : null
    const canonicalProjectStateBrief = resolveAlicizationProjectStateBrief()
    const canonicalLatestLandedProgress = normalizeProviderFacingProjectText(
      canonicalProjectStateBrief.latestProgress ?? canonicalProjectStateBrief.continuityProgressSummary,
      12000,
    )
    const canonicalPrimaryOpenLoop = normalizeProviderFacingProjectText(
      canonicalProjectStateBrief.primaryOpenLoop ?? canonicalProjectStateBrief.openLoops[0],
      12000,
    )
    const canonicalNextClosureTarget = normalizeProviderFacingProjectText(
      canonicalProjectStateBrief.nextClosureTarget,
      12000,
    )
    const canonicalPreDialogueAwarenessLine = canonicalProjectStateBrief.preDialogueAwarenessLine ?? null
    const canonicalSameHerSelfLine = normalizeProviderFacingProjectText(canonicalProjectStateBrief.sameHerSelfLine, 1600)
    const preferredSeedHasSummaryOnlyProjectStateAliases = Boolean(
      /summary-only/iu.test(preferredSeedLatestLandedProgress ?? '')
      || /summary-only/iu.test(preferredSeedPrimaryOpenLoop ?? '')
      || /summary-only/iu.test(preferredSeedNextClosureTarget ?? '')
      || /summary-only/iu.test(preferredSeedSameHerDriftRisk ?? ''),
    )
    const preferredSeedDirectDialogueAwarenessLooksThin = Boolean(
      preferredSeedDirectDialogueAwareness
      && (
        isThinProjectAwarenessAuthorityLine(preferredSeedDirectDialogueAwareness)
        || isCompactProjectStatePreflightSummary(preferredSeedDirectDialogueAwareness)
      ),
    )
    if (
      !preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
      && preferredSeedHasSummaryOnlyProjectStateAliases
      && canonicalPreDialogueAwarenessLine
      && preferredSeedAwarenessLine
      && !preferredSeedAwarenessLine.startsWith('Before answering')
      && preferredSeedDirectDialogueAwarenessLooksThin
    ) {
      preferredSeedAwarenessLine = canonicalPreDialogueAwarenessLine
    }
    if (
      !preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
      && !preferredSeedHasSummaryOnlyProjectStateAliases
      && preferredSeedAwarenessIsHoldOnlyDetail
      && preferredSeedDirectDialogueAwarenessLooksThin
    ) {
      const preferredSeedHasRuntimeSpecificSameHer = Boolean(
        preferredSeedSameHerSelfLine
        && canonicalSameHerSelfLine
        && preferredSeedSameHerSelfLine !== canonicalSameHerSelfLine,
      )
      preferredSeedAwarenessLine = preferredSeedHasRuntimeSpecificSameHer
        ? preferredSeedAnchoredAwarenessLine ?? canonicalPreDialogueAwarenessLine
        : canonicalPreDialogueAwarenessLine
    }
    if (
      preferredSeedAwarenessLine
      && isCanonicalStructuredProjectAwareness(preferredSeedAwarenessLine)
      && canonicalPreDialogueAwarenessLine?.startsWith(preferredSeedAwarenessLine)
    ) {
      preferredSeedAwarenessLine = canonicalPreDialogueAwarenessLine
    }
    const hasNonCanonicalProjectStateRuntimeCarry = Boolean(
      normalizeProviderFacingProjectText(
        preferredSeedLatestLandedProgress ?? fresherRuntimeProjectState.latestLandedProgress,
        12000,
      ) !== canonicalLatestLandedProgress
      || normalizeProviderFacingProjectText(
        preferredSeedPrimaryOpenLoop ?? fresherRuntimeProjectState.primaryOpenLoop,
        12000,
      ) !== canonicalPrimaryOpenLoop
      || normalizeProviderFacingProjectText(
        preferredSeedNextClosureTarget ?? fresherRuntimeProjectState.nextClosureTarget,
        12000,
      ) !== canonicalNextClosureTarget,
    )
    if (
      !preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
      && !hasNonCanonicalProjectStateRuntimeCarry
      && preferredSeedAwarenessLine
      && isCanonicalStructuredProjectAwareness(preferredSeedAwarenessLine)
      && canonicalPreDialogueAwarenessLine
    ) {
      preferredSeedAwarenessLine = canonicalPreDialogueAwarenessLine
    }
    const preferredSeedAwarenessLineLacksFullPhaseAnchor = Boolean(
      preferredSeedAwarenessLine
      && /phase 1/iu.test(preferredSeedAwarenessLine)
      && !preferredSeedAwarenessLine.includes('Phase 1: Local Digital Life'),
    )
    const shouldPreferAnchoredProjectStateSeedForThinPayloadSummary = Boolean(
      (
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.answerSubject === 'project-state'
        || prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.reasonTags?.includes('project-state')
      )
      && !preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
      && !preferredSeedPayloadProjectState.hasDirectPayloadProjectHeadline
      && preferredSeedDirectPayloadPreflightSummaryLooksThin
      && preferredSeedAnchoredAwarenessLine
      && preferredSeedAwarenessLine
      && !preferredSeedAwarenessLine.startsWith('Before answering')
      && awarenessCarriesBroaderProjectFrame(preferredSeedAwarenessLine)
      && !carriesSpecificSameHerAuthorityLine(preferredSeedAwarenessLine)
      && !hasModalitySpecificEmbodimentCue(preferredSeedAwarenessLine),
    )
    const shouldPreferAnchoredProjectStateSeed = Boolean(
      (
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.answerSubject === 'project-state'
        || prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.reasonTags?.includes('project-state')
      )
      && !preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
      && (hasNonCanonicalProjectStateRuntimeCarry || preferredSeedAwarenessLineLacksFullPhaseAnchor)
      && preferredSeedAnchoredAwarenessLine
      && preferredSeedAwarenessLine
      && !carriesProjectIdentityAnchor(preferredSeedAwarenessLine)
      && !carriesSpecificSameHerAuthorityLine(preferredSeedAwarenessLine)
      && !/callback return|same thread/iu.test(preferredSeedAwarenessLine),
    )
    if (shouldPreferAnchoredProjectStateSeed || shouldPreferAnchoredProjectStateSeedForThinPayloadSummary) {
      preferredSeedAwarenessLine = preferredSeedAnchoredAwarenessLine
      preferredSeedCompanionHeadlineLine = pickPreferredRuntimeProjectStateDetail([
        preferredSeedCompanionCandidate,
        preferredSeedAnchoredAwarenessLine,
      ], 'awareness', 1600)
      ?? preferredSeedAnchoredAwarenessLine
    }
    if (shouldPreferAnchoredRuntimeProjectAwarenessLine({
      awarenessLine: preferredSeedAwarenessLine ?? null,
      anchoredAwarenessLine: preferredSeedAnchoredAwarenessLine ?? null,
      latestLandedProgress: preferredSeedLatestLandedProgress ?? fresherRuntimeProjectState.latestLandedProgress,
      primaryOpenLoop: preferredSeedPrimaryOpenLoop ?? fresherRuntimeProjectState.primaryOpenLoop,
      nextClosureTarget: preferredSeedNextClosureTarget ?? fresherRuntimeProjectState.nextClosureTarget,
    })) {
      preferredSeedAwarenessLine = preferredSeedAnchoredAwarenessLine
      const shouldKeepAnchoredPreferredSeedCompanionHeadline = Boolean(
        preferredSeedCompanionCandidate
        && !isThinProjectAwarenessAuthorityLine(preferredSeedCompanionCandidate)
        && (
          shouldPreserveProjectAwarenessLineVerbatim(
            preferredSeedCompanionCandidate,
            preferredSeedAwarenessLine,
          )
          || isStrongerSameHerProjectHeadline(
            preferredSeedCompanionCandidate,
            preferredSeedAwarenessLine,
          )
        ),
      )
      preferredSeedCompanionHeadlineLine = shouldPreferRuntimeCompanionHeadline({
        awarenessLine: preferredSeedAwarenessLine,
        companionHeadlineLine: preferredSeedCompanionCandidate,
      })
        ? preferredSeedCompanionCandidate
        : shouldKeepAnchoredPreferredSeedCompanionHeadline
          ? preferredSeedCompanionCandidate
          : pickPreferredRuntimeProjectStateDetail([
            preferredSeedCompanionCandidate,
            fresherRuntimeProjectState.companionHeadlineLine,
            preferredSeedAwarenessLine,
          ], 'awareness', 1600)
          ?? preferredSeedAwarenessLine
    }
    if (
      preferredSeedPayloadAwarenessLine
      && (
        shouldPreserveProjectAwarenessLineVerbatim(
          preferredSeedPayloadAwarenessLine,
          preferredSeedAwarenessLine,
        )
        || isStrongerSameHerProjectHeadline(
          preferredSeedPayloadAwarenessLine,
          preferredSeedAwarenessLine,
        )
        || isThinProjectAwarenessAuthorityLine(preferredSeedAwarenessLine)
      )
    ) {
      preferredSeedAwarenessLine = preferredSeedPayloadAwarenessLine
      const normalizedPreferredSeedPayloadHeadline = normalizeProviderFacingProjectText(
        preferredSeedPayloadProjectState.explicitPayloadProjectHeadline,
        1600,
      )
      const shouldPreferPayloadHeadlineAsPreparedSeedAwareness = Boolean(
        normalizedPreferredSeedPayloadHeadline
        && !isThinProjectAwarenessAuthorityLine(normalizedPreferredSeedPayloadHeadline)
        && (!awarenessCarriesBroaderProjectFrame(preferredSeedPayloadAwarenessLine)
          || !hasDistinctEmbodimentClosureCue(normalizedPreferredSeedPayloadHeadline)
          || carriesBroaderProjectClosureFrame(normalizedPreferredSeedPayloadHeadline))
        && (
          shouldPreserveProjectAwarenessLineVerbatim(
            normalizedPreferredSeedPayloadHeadline,
            preferredSeedPayloadAwarenessLine,
          )
          || isStrongerSameHerProjectHeadline(
            normalizedPreferredSeedPayloadHeadline,
            preferredSeedPayloadAwarenessLine,
          )
        ),
      )
      if (shouldPreferPayloadHeadlineAsPreparedSeedAwareness)
        preferredSeedAwarenessLine = normalizedPreferredSeedPayloadHeadline
      preferredSeedCompanionHeadlineLine = (
        normalizedPreferredSeedPayloadHeadline
        && (!carriesBroaderProjectClosureFrame(preferredSeedPayloadAwarenessLine)
          || !hasDistinctEmbodimentClosureCue(normalizedPreferredSeedPayloadHeadline)
          || carriesBroaderProjectClosureFrame(normalizedPreferredSeedPayloadHeadline))
      )
        ? normalizedPreferredSeedPayloadHeadline
        : preferredSeedPayloadAwarenessLine
    }
    const preferredSeedCompanionIsSpecificEmbodimentHeadline = Boolean(
      preferredSeedCompanionCandidate
      && hasModalitySpecificEmbodimentCue(preferredSeedCompanionCandidate)
      && !carriesExplicitProjectClosureTriplet(preferredSeedCompanionCandidate)
      && !isCanonicalStructuredProjectAwareness(preferredSeedCompanionCandidate),
    )
    const preferredSeedCompanionIsSpecificSameHerAuthorityHeadline = Boolean(
      preferredSeedCompanionCandidate
      && carriesSpecificSameHerAuthorityLine(preferredSeedCompanionCandidate)
      && !carriesExplicitProjectClosureTriplet(preferredSeedCompanionCandidate)
      && !isCanonicalStructuredProjectAwareness(preferredSeedCompanionCandidate),
    )
    if (
      preferredSeedCompanionCandidate
      && (
        preferredSeedCompanionIsSpecificEmbodimentHeadline
        || preferredSeedCompanionIsSpecificSameHerAuthorityHeadline
      )
      && !isThinProjectAwarenessAuthorityLine(preferredSeedCompanionCandidate)
      && (
        carriesSpecificSameHerAuthorityLine(preferredSeedCompanionCandidate)
        || !embodimentHeadlineWouldOverNarrowProjectAwareness({
          headlineLine: preferredSeedCompanionCandidate,
          awarenessLine: preferredSeedAwarenessLine,
        })
      )
      && (
        shouldPreserveProjectAwarenessLineVerbatim(
          preferredSeedCompanionCandidate,
          preferredSeedAwarenessLine,
        )
        || isStrongerSameHerProjectHeadline(
          preferredSeedCompanionCandidate,
          preferredSeedAwarenessLine,
        )
      )
      && (!preferredSeedPayloadAwarenessLine
        || !awarenessCarriesBroaderProjectFrame(preferredSeedPayloadAwarenessLine)
        || carriesBroaderProjectClosureFrame(preferredSeedCompanionCandidate))
    ) {
      preferredSeedAwarenessLine = preferredSeedCompanionCandidate
      preferredSeedCompanionHeadlineLine = preferredSeedCompanionCandidate
    }
    const shouldReAnchorPreparedSeedAwarenessForThinPayloadSummary = Boolean(
      (
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.answerSubject === 'project-state'
        || prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.reasonTags?.includes('project-state')
      )
      && !preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
      && !preferredSeedPayloadProjectState.hasDirectPayloadProjectHeadline
      && preferredSeedDirectPayloadPreflightSummaryLooksThin
      && preferredSeedAnchoredAwarenessLine
      && preferredSeedAwarenessLine
      && !preferredSeedAwarenessLine.startsWith('Before answering')
      && awarenessCarriesBroaderProjectFrame(preferredSeedAwarenessLine)
      && !carriesSpecificSameHerAuthorityLine(preferredSeedAwarenessLine)
      && !hasModalitySpecificEmbodimentCue(preferredSeedAwarenessLine),
    )
    if (shouldReAnchorPreparedSeedAwarenessForThinPayloadSummary) {
      preferredSeedAwarenessLine = preferredSeedAnchoredAwarenessLine
      if (
        !preferredSeedCompanionHeadlineLine
        || preferredSeedCompanionHeadlineLine === preferredSeedAwarenessCandidate
        || preferredSeedCompanionHeadlineLine === preferredSeedAwarenessLine
        || isCanonicalStructuredProjectAwareness(preferredSeedCompanionHeadlineLine)
        || awarenessCarriesBroaderProjectFrame(preferredSeedCompanionHeadlineLine)
      ) {
        preferredSeedCompanionHeadlineLine = preferredSeedAnchoredAwarenessLine
      }
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
    const preludeDigitalLifeRuntimeSurfaceDiagnostics = options.onPreparedExecutionDiagnostics
      ? cloneRuntimeSurfaceForDiagnostics(prelude.perceptionAugmentation.digitalLifeRuntimeSurface)
      : null
    const preparedSelectionBase = options.onPreparedExecutionDiagnostics
      ? cloneRuntimeSurfaceForDiagnostics(preparedRuntimeSurfaceSelection.fresherRuntimeSurface)
      : null
    const selectionDiagnosticsBase = options.onPreparedExecutionDiagnostics
      ? cloneRuntimeSurfaceForDiagnostics(preparedRuntimeSurfaceSelection.selectionDiagnostics?.preAdjustmentSelectedRuntimeSurface)
      : null
    const builderSurfaceSource = (() => {
      if (!options.onPreparedExecutionDiagnostics)
        return null
      if (!preparedRuntimeSurfaceSelection.fresherRuntimeSurface || !runtimeSurfaceForBuilder)
        return runtimeSurfaceForBuilder

      const fresherAwarenessLine = normalizePreparedExecutionText(
        readRuntimeProjectStateFromSurface(preparedRuntimeSurfaceSelection.fresherRuntimeSurface).preDialogueAwarenessLine,
        1600,
      )
      const builderAwarenessLine = normalizePreparedExecutionText(
        readRuntimeProjectStateFromSurface(runtimeSurfaceForBuilder).preDialogueAwarenessLine,
        1600,
      )
      if (
        fresherAwarenessLine
        && builderAwarenessLine
        && shouldPreserveProjectAwarenessLineVerbatim(fresherAwarenessLine, builderAwarenessLine)
        && isCanonicalStructuredProjectAwareness(builderAwarenessLine)
      ) {
        return preparedRuntimeSurfaceSelection.fresherRuntimeSurface
      }
      return runtimeSurfaceForBuilder
    })()
    const builderSurface = options.onPreparedExecutionDiagnostics
      ? cloneRuntimeSurfaceForDiagnostics(builderSurfaceSource)
      : null
    const finalPreferredSeedAwarenessLine = (() => {
      const providerSafeSeedAwarenessLine = (value: string | null | undefined) => {
        return isLegacyProjectAwarenessTemplateShell(value)
          ? buildProviderFacingProjectAwarenessLine({
              identity: fresherRuntimeProjectState.identity,
              currentPhase: fresherRuntimeProjectState.currentPhase,
              sameHerSelfLine: preferredSeedSameHerSelfLine ?? fresherRuntimeProjectState.sameHerSelfLine,
              latestLandedProgress: preferredSeedLatestLandedProgress ?? fresherRuntimeProjectState.latestLandedProgress,
              primaryOpenLoop: preferredSeedPrimaryOpenLoop ?? fresherRuntimeProjectState.primaryOpenLoop,
              nextClosureTarget: preferredSeedNextClosureTarget ?? fresherRuntimeProjectState.nextClosureTarget,
            })
          : value ?? null
      }

      if (!looksLikeNarrowContinuityCadenceAwarenessLine(preferredSeedAwarenessLine))
        return providerSafeSeedAwarenessLine(preferredSeedAwarenessLine)

      const preferredSeedHasRuntimeSpecificSameHer = Boolean(
        preferredSeedSameHerSelfLine
        && canonicalSameHerSelfLine
        && preferredSeedSameHerSelfLine !== canonicalSameHerSelfLine,
      )
      const preferred = preferredSeedHasRuntimeSpecificSameHer
        ? preferredSeedAnchoredAwarenessLine ?? canonicalPreDialogueAwarenessLine
        : canonicalPreDialogueAwarenessLine ?? preferredSeedAnchoredAwarenessLine ?? preferredSeedAwarenessLine
      return providerSafeSeedAwarenessLine(preferred)
    })()
    const finalPreferredSeedCompanionHeadlineLine = isLegacyProjectAwarenessTemplateShell(preferredSeedCompanionHeadlineLine)
      ? finalPreferredSeedAwarenessLine
      : preferredSeedCompanionHeadlineLine
    applyProviderFacingProjectStateToRuntimeSurface({
      runtimeSurface,
      projectState: {
        ...fresherRuntimeProjectState,
        preflightSummary: preferredSeedPreflightSummary,
        preDialogueAwarenessLine: finalPreferredSeedAwarenessLine,
        awarenessLine: finalPreferredSeedAwarenessLine,
        preDialogueAwarenessSummary: finalPreferredSeedAwarenessLine,
        companionHeadlineLine: finalPreferredSeedCompanionHeadlineLine,
        nextClosureTarget: preferredSeedNextClosureTarget,
        latestLandedProgress: preferredSeedLatestLandedProgress,
        primaryOpenLoop: preferredSeedPrimaryOpenLoop,
        sameHerSelfLine: preferredSeedSameHerSelfLine,
        sameHerDriftRisk: preferredSeedSameHerDriftRisk,
        continuityPreferredTiming: preferredSeedContinuityPreferredTiming,
        continuityCadence: preferredSeedContinuityCadence,
        preferredBlinkCadence: preferredSeedBlinkCadence,
        preferredGazeMode: preferredSeedGazeMode,
        preferredPauseMode: preferredSeedPauseMode,
        preferredLipsyncMode: preferredSeedLipsyncMode,
        preferredVoiceMode: preferredSeedVoiceMode,
        preferredPacingMode: preferredSeedPacingMode,
      },
    })
    const runtimeSurfaceBeforeProviderFacingReturn = options.onPreparedExecutionDiagnostics
      ? clonePreparedExecutionRuntimeSurfaceForDiagnostics(runtimeSurface)
      : null
    messages = runtimeSurface.messages
    const rebuiltMindTurnContractInput = {
      contract: rebuildProviderFacingMindTurnContract({
        contract: prelude.perceptionAugmentation.chatGovernance.mindTurnContract,
        governance: llmMindAuthorityGovernance,
        runtimeSurface,
        rawPayload,
      }),
    }
    const rebuiltMindTurnContract = rebuiltMindTurnContractInput.contract
    const runtimeProjectRhythmState
      = (() => {
        const runtimeRhythmState = readRuntimeProjectStateFromSurface(runtimeSurface.digitalLifeRuntimeSurface) as Record<string, unknown>
        return {
          ...runtimeRhythmState,
          continuityPreferredTiming: runtimeRhythmState.continuityPreferredTiming,
          continuityCadence: pickProviderFacingContinuityCadence([
            runtimeRhythmState.continuityCadence,
            originalPreludeProjectRhythmState.continuityCadence,
          ]),
          preferredBlinkCadence:
              normalizeProviderFacingBlinkCadence(runtimeRhythmState.preferredBlinkCadence)
              ?? normalizeProviderFacingBlinkCadence(originalPreludeProjectRhythmState.preferredBlinkCadence),
          preferredGazeMode:
              normalizeProviderFacingGazeMode(runtimeRhythmState.preferredGazeMode)
              ?? normalizeProviderFacingGazeMode(originalPreludeProjectRhythmState.preferredGazeMode),
        } as Record<string, unknown>
      })()
    const normalizedMindTurnContract = backfillMindTurnContractProjectRhythmFromRuntime(
      preferPreparedRuntimeSpecificMindTurnContractAwareness({
        normalizedContract: normalizeProviderFacingMindTurnContract(
          rebuiltMindTurnContract,
          rawPayload,
          runtimeSurface,
        ),
        rebuiltContract: rebuiltMindTurnContract,
        preparedProjectState: runtimeProjectRhythmState,
        rawPayload,
      }),
      runtimeProjectRhythmState,
    )
    const finalizedReturnedMindTurnContract = rescueReturnedProviderFacingProjectAwareness({
      contract: (() => {
        if (!normalizedMindTurnContract)
          return normalizedMindTurnContract

        const canonicalProjectStateBrief = resolveAlicizationProjectStateBrief()
        const canonicalPreflightSummary = normalizePreparedExecutionText(
          canonicalProjectStateBrief.preflightSummary,
          1600,
        )
        const canonicalAwarenessLine = normalizePreparedExecutionText(
          canonicalProjectStateBrief.preDialogueAwarenessLine,
          1600,
        )
        const directPreludeAwarenessLine = originalPreludeProjectAwarenessLine
        const directPreludeAwarenessLineLooksThin = Boolean(
          directPreludeAwarenessLine
          && (
            isThinProjectAwarenessAuthorityLine(directPreludeAwarenessLine)
            || isCompactProjectStatePreflightSummary(directPreludeAwarenessLine)
          ),
        )
        const normalizedAwarenessLine = normalizePreparedExecutionText(
          normalizedMindTurnContract.projectState?.preDialogueAwarenessLine,
          1600,
        )
        const normalizedAwarenessSummary = normalizePreparedExecutionText(
          normalizedMindTurnContract.projectState?.preDialogueAwarenessSummary,
          1600,
        )
        if (!directPreludeAwarenessLine || directPreludeAwarenessLineLooksThin || !normalizedAwarenessLine) {
          const normalizedIdentity = normalizePreparedExecutionText(
            normalizedMindTurnContract.projectState?.identity,
            1600,
          )
          const canonicalSameHerSelfLine = normalizePreparedExecutionText(
            canonicalProjectStateBrief.sameHerSelfLine,
            1600,
          )
          const canonicalLatestLandedProgress = normalizePreparedExecutionText(
            canonicalProjectStateBrief.latestProgress ?? canonicalProjectStateBrief.continuityProgressSummary,
            1600,
          )
          const canonicalPrimaryOpenLoop = normalizePreparedExecutionText(
            canonicalProjectStateBrief.primaryOpenLoop ?? canonicalProjectStateBrief.openLoops?.[0],
            1600,
          )
          const canonicalNextClosureTarget = normalizePreparedExecutionText(
            canonicalProjectStateBrief.nextClosureTarget,
            1600,
          )
          const normalizedLatestLandedProgress = pickPreferredRuntimeProjectStateDetail([
            normalizedMindTurnContract.projectState?.latestLandedProgress,
            normalizedMindTurnContract.projectState?.latestProgress,
          ], 'landed', 1600)
          const normalizedPrimaryOpenLoop = pickPreferredRuntimeProjectStateDetail([
            normalizedMindTurnContract.projectState?.primaryOpenLoop,
          ], 'open', 1600)
          const normalizedNextClosureTarget = pickPreferredRuntimeProjectStateDetail([
            normalizedMindTurnContract.projectState?.nextClosureTarget,
          ], 'next', 1600)
          const normalizedSameHerSelfLine = pickPreferredRuntimeProjectStateDetail([
            normalizedMindTurnContract.projectState?.sameHerSelfLine,
          ], 'same-her', 1600)
          const returnPayloadProjectState = readProviderFacingPayloadProjectState(rawPayload)
          const returnPayloadPreflightSummaryLooksThin = Boolean(
            returnPayloadProjectState.explicitPayloadProjectPreflightSummary
            && (
              isThinProjectAwarenessAuthorityLine(returnPayloadProjectState.explicitPayloadProjectPreflightSummary)
              || isCompactProjectStatePreflightSummary(returnPayloadProjectState.explicitPayloadProjectPreflightSummary)
            ),
          )
          const normalizedAwarenessCarriesSpecificRuntimeClosureOmittedByCanonical = Boolean(
            canonicalAwarenessLine
            && normalizedAwarenessLine
            && !returnPayloadProjectState.hasDirectPayloadProjectAwarenessLine
            && !returnPayloadProjectState.hasDirectPayloadProjectHeadline
            && returnPayloadProjectState.hasDirectPayloadProjectPreflightSummary
            && returnPayloadPreflightSummaryLooksThin
            && (
              (
                normalizedLatestLandedProgress
                && normalizedLatestLandedProgress !== canonicalLatestLandedProgress
                && normalizedAwarenessLine.includes(normalizedLatestLandedProgress)
                && !canonicalAwarenessLine.includes(normalizedLatestLandedProgress)
              )
              || (
                normalizedPrimaryOpenLoop
                && normalizedPrimaryOpenLoop !== canonicalPrimaryOpenLoop
                && normalizedAwarenessLine.includes(normalizedPrimaryOpenLoop)
                && !canonicalAwarenessLine.includes(normalizedPrimaryOpenLoop)
              )
              || (
                normalizedNextClosureTarget
                && normalizedNextClosureTarget !== canonicalNextClosureTarget
                && normalizedAwarenessLine.includes(normalizedNextClosureTarget)
                && !canonicalAwarenessLine.includes(normalizedNextClosureTarget)
              )
            ),
          )
          const normalizedAwarenessCarriesSpecificRuntimeSameHerAuthorityOmittedByCanonical = Boolean(
            canonicalAwarenessLine
            && normalizedAwarenessLine
            && normalizedSameHerSelfLine
            && normalizedSameHerSelfLine !== canonicalSameHerSelfLine
            && !looksLikeThinRuntimeProjectStateDetail(normalizedSameHerSelfLine, 'same-her')
            && !/one same her must stay explicit|same project-aware self|same unfinished phase 1 digital-life line/iu.test(normalizedSameHerSelfLine)
            && normalizedAwarenessLine.includes(normalizedSameHerSelfLine)
            && !canonicalAwarenessLine.includes(normalizedSameHerSelfLine),
          )
          const shouldTreatReturnAsProjectStateAnswer = Boolean(
            prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.answerSubject === 'project-state'
            || prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.reasonTags?.includes('project-state'),
          )
          const shouldCanonicalizeProjectStateAnswerReturn = Boolean(
            (!directPreludeAwarenessLine || directPreludeAwarenessLineLooksThin)
            && canonicalAwarenessLine
            && canonicalPreflightSummary
            && shouldTreatReturnAsProjectStateAnswer
            && normalizedAwarenessLine
            && normalizedIdentity
            && /same local-first digital life project|not a new shell|not a fresh shell|rebuilt each turn|rebuilt for this turn/iu.test(normalizedIdentity)
            && carriesExplicitProjectClosureTriplet(normalizedAwarenessLine)
            && !normalizedAwarenessCarriesSpecificRuntimeClosureOmittedByCanonical
            && !normalizedAwarenessCarriesSpecificRuntimeSameHerAuthorityOmittedByCanonical,
          )
          if (!shouldCanonicalizeProjectStateAnswerReturn)
            return normalizedMindTurnContract

          const normalizedCompanionHeadlineLine = normalizePreparedExecutionText(
            normalizedMindTurnContract.projectState?.companionHeadlineLine,
            1600,
          )
          const canonicalReturnedAwarenessSummary = preferProjectAwarenessSummary({
            awarenessLine: canonicalAwarenessLine,
            summaryCandidates: [
              normalizedAwarenessSummary,
              normalizedMindTurnContract.projectState?.preflightSummary,
              canonicalPreflightSummary,
            ],
            maxChars: 1600,
          }) ?? canonicalAwarenessLine

          return {
            ...normalizedMindTurnContract,
            projectState: normalizedMindTurnContract.projectState
              ? {
                  ...(normalizedMindTurnContract.projectState as Record<string, unknown>),
                  preflightSummary: canonicalPreflightSummary,
                  preDialogueAwarenessLine: canonicalAwarenessLine,
                  awarenessLine: canonicalAwarenessLine,
                  preDialogueAwarenessSummary: canonicalReturnedAwarenessSummary,
                  companionHeadlineLine:
                !normalizedCompanionHeadlineLine
                || isCanonicalStructuredProjectAwareness(normalizedCompanionHeadlineLine)
                  ? canonicalAwarenessLine
                  : normalizedMindTurnContract.projectState.companionHeadlineLine,
                } as AlicizationMindTurnContractSnapshot['projectState'] & Record<string, unknown>
              : normalizedMindTurnContract.projectState,
            preDialogueClosure: normalizedMindTurnContract.preDialogueClosure
              ? {
                  ...normalizedMindTurnContract.preDialogueClosure,
                  summaryLine: canonicalReturnedAwarenessSummary,
                }
              : normalizedMindTurnContract.preDialogueClosure,
          } satisfies AlicizationMindTurnContractSnapshot
        }
        if (!/callback return|same thread/iu.test(directPreludeAwarenessLine))
          return normalizedMindTurnContract
        if (!shouldPreserveProjectAwarenessLineVerbatim(directPreludeAwarenessLine, normalizedAwarenessLine))
          return normalizedMindTurnContract

        const normalizedCompanionHeadlineLine = normalizePreparedExecutionText(
          normalizedMindTurnContract.projectState?.companionHeadlineLine,
          1600,
        )
        const returnedDirectAwarenessSummary = preferProjectAwarenessSummary({
          awarenessLine: directPreludeAwarenessLine,
          summaryCandidates: [
            normalizedAwarenessSummary,
            normalizedMindTurnContract.projectState?.preflightSummary,
          ],
          maxChars: 1600,
        }) ?? directPreludeAwarenessLine

        return {
          ...normalizedMindTurnContract,
          projectState: normalizedMindTurnContract.projectState
            ? {
                ...(normalizedMindTurnContract.projectState as Record<string, unknown>),
                preDialogueAwarenessLine: directPreludeAwarenessLine,
                awarenessLine: directPreludeAwarenessLine,
                preDialogueAwarenessSummary: returnedDirectAwarenessSummary,
                companionHeadlineLine:
              !normalizedCompanionHeadlineLine
              || normalizedCompanionHeadlineLine === normalizedAwarenessLine
              || isCanonicalStructuredProjectAwareness(normalizedCompanionHeadlineLine)
                ? directPreludeAwarenessLine
                : normalizedMindTurnContract.projectState.companionHeadlineLine,
              } as AlicizationMindTurnContractSnapshot['projectState'] & Record<string, unknown>
            : normalizedMindTurnContract.projectState,
          preDialogueClosure: normalizedMindTurnContract.preDialogueClosure
            ? {
                ...normalizedMindTurnContract.preDialogueClosure,
                summaryLine: returnedDirectAwarenessSummary,
              }
            : normalizedMindTurnContract.preDialogueClosure,
        } satisfies AlicizationMindTurnContractSnapshot
      })(),
      rawPayload,
      prelude,
    })
    const finalReturnedRuntimeSurfaceProjectState = applyProviderFacingProjectStateToRuntimeSurface({
      runtimeSurface,
      projectState: finalizedReturnedMindTurnContract?.projectState ?? null,
    })
    const finalGoverningProject = shouldIncludeProviderProjectStateContext
      ? (
          buildProviderFacingProjectGovernanceSummary(finalReturnedRuntimeSurfaceProjectState)
          ?? buildProviderFacingProjectGovernanceSummary(
            normalizedMindTurnContract?.projectState as Record<string, unknown> | null | undefined,
          )
        )
      : null
    const providerFacingRuntimeSurface = runtimeSurface.digitalLifeRuntimeSurface
    const providerFacingAnswerPlannerSeed: AlicizationAnswerPlannerSnapshot | null
      = providerFacingRuntimeSurface?.dialogue?.answerPlanner
        ?? runtimeSurface.digitalLifeSpine?.runtimeSurface?.dialogue?.answerPlanner
        ?? preparedRuntimeSurfaceSelection.fresherRuntimeSurface?.dialogue?.answerPlanner
        ?? runtimeSurfaceForBuilder?.dialogue?.answerPlanner
        ?? answerPlannerReducedRuntimeSurface?.dialogue?.answerPlanner
        ?? (
          normalizedMindTurnContract
            ? buildFallbackProviderFacingAnswerPlanner({
                contract: normalizedMindTurnContract,
                governingProject: normalizedMindTurnContract.governingProject ?? finalGoverningProject ?? null,
                now,
              })
            : null
        )
        ?? null
    const shouldReplaceProviderFacingAnswerPlannerGoverningProject = Boolean(
      finalGoverningProject
      && providerFacingRuntimeSurface?.dialogue,
    )
    if (shouldReplaceProviderFacingAnswerPlannerGoverningProject && providerFacingRuntimeSurface?.dialogue) {
      providerFacingRuntimeSurface.dialogue.answerPlanner = {
        ...(providerFacingAnswerPlannerSeed
          ?? buildFallbackProviderFacingAnswerPlanner({
            contract: normalizedMindTurnContract,
            governingProject: finalGoverningProject,
            now,
          })),
        governingProject: finalGoverningProject,
      } satisfies AlicizationAnswerPlannerSnapshot
    }
    messages = injectProviderFacingMindTurnContractSystemMessage({
      contract: finalizedReturnedMindTurnContract,
      includeProjectStateFacts: shouldIncludeProviderProjectStateContext,
      messages: runtimeSurface.messages,
    })
    if (shouldIncludeProviderProjectStateContext && !carriesAlicizationCanonicalProjectState(messages)) {
      messages = [
        ...buildAlicizationProviderFacingProjectStateExtraSystemBlocks().map(content => ({ role: 'system', content }) as Message),
        ...messages,
      ]
    }
    messages = sanitizeOrdinaryDialogueProviderMessages(messages)
    messages = injectAlicizationMainChatMemoryContext(messages, memoryContext)
    if (!shouldIncludeProviderProjectStateContext) {
      sanitizeOrdinaryDialogueRuntimeSurfacePlanning(runtimeSurface.digitalLifeRuntimeSurface)
      sanitizeOrdinaryDialogueRuntimeSurfacePlanning(runtimeSurface.digitalLifeSpine?.runtimeSurface ?? null)
    }
    runtimeSurface.messages = messages

    if (options.onPreparedExecutionDiagnostics) {
      const preparedChainStageNextClosureTargets = {
        memoryDeliberation: readPreparedExecutionNextClosureTargets(preparedRuntimeSurfaceChainDiagnostics?.memoryDeliberationRuntimeSurface),
        effective: readPreparedExecutionNextClosureTargets(preparedRuntimeSurfaceChainDiagnostics?.effectiveDigitalLifeRuntimeSurface),
        sociallyShaped: readPreparedExecutionNextClosureTargets(preparedRuntimeSurfaceChainDiagnostics?.sociallyShapedDigitalLifeRuntimeSurface),
        executionCallbackCarry: readPreparedExecutionNextClosureTargets(preparedRuntimeSurfaceChainDiagnostics?.executionCallbackCarryRuntimeSurface),
        consciousFrameReduced: readPreparedExecutionNextClosureTargets(preparedRuntimeSurfaceChainDiagnostics?.consciousFrameReducedRuntimeSurface),
        answerPlannerReduced: readPreparedExecutionNextClosureTargets(preparedRuntimeSurfaceChainDiagnostics?.answerPlannerReducedRuntimeSurface),
      }
      const baseNextClosureTargets = readPreparedExecutionNextClosureTargets(
        preparedRuntimeSurfaceChainDiagnostics?.answerPlannerReducedRuntimeSurface,
      )
      const selectedRuntimeSurfaceBeforeAdjustmentNextClosureTargets = readPreparedExecutionNextClosureTargets(
        selectionDiagnosticsBase,
      )
      const effectiveStageProjectStateSources = {
        dialogueExistingNextClosureTarget: normalizePreparedExecutionText(
          preludeDigitalLifeRuntimeSurfaceDiagnostics?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget,
          1600,
        ),
        rawRuntimeDigestNextClosureTarget:
          normalizePreparedExecutionText(preludeDigitalLifeRuntimeSurfaceDiagnostics?.raw?.runtimeDigest?.projectState?.nextClosureTarget, 1600)
          ?? normalizePreparedExecutionText(preludeDigitalLifeRuntimeSurfaceDiagnostics?.raw?.runtime?.projectState?.nextClosureTarget, 1600),
        preferredExistingNextClosureTarget:
          normalizePreparedExecutionText(
            effectiveDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget,
            1600,
          )
          ?? normalizePreparedExecutionText(effectiveDigitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.nextClosureTarget, 1600)
          ?? normalizePreparedExecutionText(effectiveDigitalLifeRuntimeSurface?.raw?.runtime?.projectState?.nextClosureTarget, 1600),
        resolvedNextClosureTarget: normalizePreparedExecutionText(
          readRuntimeProjectStateFromSurface(effectiveDigitalLifeRuntimeSurface).nextClosureTarget,
          1600,
        ),
        effectiveDialogueNextClosureTarget: normalizePreparedExecutionText(
          preparedRuntimeSurfaceChainDiagnostics?.effectiveDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget,
          1600,
        ),
      }
      const baseRuntimeSurfaceProjectState = readPreparedExecutionProjectStateDiagnostics(
        baseDigitalLifeRuntimeSurfaceDiagnostics,
      )
      let preparedSelectionAwareness = resolvePreparedDiagnosticsAwarenessLine({
        preparedSurface: preparedSelectionBase,
        payload,
        preferCanonicalForCallback: true,
      })
      const runtimeGroundedPreparedSurface
        = runtimeSurfaceBeforeProviderFacingReturn?.digitalLifeRuntimeSurface ?? answerPlannerReducedRuntimeSurface
      let runtimeGroundedAwareness = resolvePreparedDiagnosticsAwarenessLine({
        preparedSurface: runtimeGroundedPreparedSurface,
        payload,
        preferCanonicalForCallback: false,
      })
      const preparedSelectionProjectState
        = preparedSelectionBase?.dialogue.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
      const builderProjectState
        = builderSurface?.dialogue.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
      const runtimeGroundedProjectState
        = (runtimeGroundedPreparedSurface?.dialogue.currentConsciousFrame?.projectState
          ?? answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState) as Record<string, unknown> | null | undefined
      const payloadProjectState = readProviderFacingPayloadProjectState(rawPayload)
      const canonicalDiagnosticAwarenessLine = normalizePreparedExecutionText(
        resolveAlicizationProjectStateBrief().preDialogueAwarenessLine,
        1600,
      )
      const preparedSelectionLatestLandedProgress = normalizePreparedExecutionText(
        preparedSelectionProjectState?.latestLandedProgress ?? preparedSelectionProjectState?.latestProgress,
        1600,
      )
      const preparedSelectionPrimaryOpenLoop = normalizePreparedExecutionText(
        preparedSelectionProjectState?.primaryOpenLoop,
        1600,
      )
      const preparedSelectionNextClosureTarget = normalizePreparedExecutionText(
        preparedSelectionProjectState?.nextClosureTarget,
        1600,
      )
      const preparedSelectionAwarenessMissesRuntimeCarry = awarenessLineMissesRuntimeCarry({
        awarenessLine: preparedSelectionAwareness.awarenessLine,
        latestLandedProgress: preparedSelectionLatestLandedProgress,
        primaryOpenLoop: preparedSelectionPrimaryOpenLoop,
        nextClosureTarget: preparedSelectionNextClosureTarget,
      })
      if (
        !preferredSeedPayloadProjectState.hasDirectPayloadProjectAwarenessLine
        && canonicalDiagnosticAwarenessLine
        && preparedSelectionAwareness.awarenessLine
        && preparedSelectionAwarenessMissesRuntimeCarry
        && !carriesProjectIdentityAnchor(preparedSelectionAwareness.awarenessLine)
        && !/callback return|same thread/u.test(preparedSelectionAwareness.awarenessLine)
        && !carriesSpecificSameHerAuthorityLine(preparedSelectionAwareness.awarenessLine)
        && !hasModalitySpecificEmbodimentCue(preparedSelectionAwareness.awarenessLine)
        && !carriesSpecificSameHerAuthorityLine(
          normalizePreparedExecutionText(preparedSelectionProjectState?.companionHeadlineLine, 1600)
          ?? preparedSelectionAwareness.companionHeadlineLine,
        )
        && !hasModalitySpecificEmbodimentCue(
          normalizePreparedExecutionText(preparedSelectionProjectState?.companionHeadlineLine, 1600)
          ?? preparedSelectionAwareness.companionHeadlineLine,
        )
      ) {
        preparedSelectionAwareness = {
          awarenessLine: canonicalDiagnosticAwarenessLine,
          companionHeadlineLine:
            normalizePreparedExecutionText(preparedSelectionProjectState?.companionHeadlineLine, 1600)
            ?? canonicalDiagnosticAwarenessLine,
        }
      }
      const rebuiltDiagnosticAwarenessLine = normalizePreparedExecutionText(
        rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine,
        1600,
      )
      if (
        !payloadProjectState.hasDirectPayloadProjectAwarenessLine
        && rebuiltDiagnosticAwarenessLine
        && (
          !carriesProjectIdentityAnchor(preparedSelectionAwareness.awarenessLine)
          || !String(preparedSelectionAwareness.awarenessLine ?? '').includes('Phase 1: Local Digital Life')
          || preparedSelectionAwarenessMissesRuntimeCarry
        )
        && carriesProjectIdentityAnchor(rebuiltDiagnosticAwarenessLine)
        && !carriesSpecificSameHerAuthorityLine(preparedSelectionAwareness.awarenessLine)
        && !hasModalitySpecificEmbodimentCue(preparedSelectionAwareness.awarenessLine)
      ) {
        preparedSelectionAwareness = {
          awarenessLine: rebuiltDiagnosticAwarenessLine,
          companionHeadlineLine:
            normalizePreparedExecutionText(rebuiltMindTurnContract?.projectState?.companionHeadlineLine, 1600)
            ?? rebuiltDiagnosticAwarenessLine,
        }
      }
      const runtimeGroundedResolvedProjectState = runtimeGroundedPreparedSurface
        ? readRuntimeProjectStateFromSurface(runtimeGroundedPreparedSurface) as Record<string, unknown>
        : null
      const runtimeGroundedLatestLandedProgress
        = normalizePreparedExecutionText(
          runtimeGroundedProjectState?.latestLandedProgress ?? runtimeGroundedProjectState?.latestProgress,
          1600,
        )
        ?? normalizePreparedExecutionText(
          runtimeGroundedResolvedProjectState?.latestLandedProgress ?? runtimeGroundedResolvedProjectState?.latestProgress,
          1600,
        )
        ?? null
      const runtimeGroundedPrimaryOpenLoop
        = normalizePreparedExecutionText(runtimeGroundedProjectState?.primaryOpenLoop, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.primaryOpenLoop, 1600)
          ?? null
      const runtimeGroundedNextClosureTarget
        = normalizePreparedExecutionText(runtimeGroundedProjectState?.nextClosureTarget, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.nextClosureTarget, 1600)
          ?? null
      const runtimeGroundedStructuredAwarenessLine = buildProviderFacingProjectAwarenessLine({
        identity:
          normalizePreparedExecutionText(runtimeGroundedProjectState?.identity, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.identity, 1600)
          ?? '',
        currentPhase:
          normalizePreparedExecutionText(runtimeGroundedProjectState?.currentPhase, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.currentPhase, 1600)
          ?? '',
        sameHerSelfLine:
          normalizePreparedExecutionText(runtimeGroundedProjectState?.sameHerSelfLine, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.sameHerSelfLine, 1600)
          ?? null,
        latestLandedProgress: runtimeGroundedLatestLandedProgress,
        primaryOpenLoop: runtimeGroundedPrimaryOpenLoop,
        nextClosureTarget: runtimeGroundedNextClosureTarget,
      })
      const runtimeGroundedCanonicalAwarenessMissesCarry = awarenessLineMissesRuntimeCarry({
        awarenessLine: runtimeGroundedAwareness.awarenessLine,
        latestLandedProgress: runtimeGroundedLatestLandedProgress,
        primaryOpenLoop: runtimeGroundedPrimaryOpenLoop,
        nextClosureTarget: runtimeGroundedNextClosureTarget,
      })
      const runtimeGroundedStructuredAwarenessCarriesRuntimeCarry = !awarenessLineMissesRuntimeCarry({
        awarenessLine: runtimeGroundedStructuredAwarenessLine,
        latestLandedProgress: runtimeGroundedLatestLandedProgress,
        primaryOpenLoop: runtimeGroundedPrimaryOpenLoop,
        nextClosureTarget: runtimeGroundedNextClosureTarget,
      })
      if (
        !payloadProjectState.hasDirectPayloadProjectAwarenessLine
        && runtimeGroundedStructuredAwarenessLine
        && (
          !carriesProjectIdentityAnchor(runtimeGroundedAwareness.awarenessLine)
          || (
            runtimeGroundedCanonicalAwarenessMissesCarry
            && runtimeGroundedStructuredAwarenessCarriesRuntimeCarry
          )
          || (
            /callback return|same thread/u.test(runtimeGroundedStructuredAwarenessLine)
            && !/callback return|same thread/u.test(runtimeGroundedAwareness.awarenessLine ?? '')
          )
        )
        && !hasModalitySpecificEmbodimentCue(runtimeGroundedAwareness.awarenessLine)
      ) {
        runtimeGroundedAwareness = {
          awarenessLine: runtimeGroundedStructuredAwarenessLine,
          companionHeadlineLine:
            normalizePreparedExecutionText(runtimeGroundedProjectState?.companionHeadlineLine, 1600)
            ?? runtimeGroundedStructuredAwarenessLine,
        }
      }
      const directPreludeDiagnosticAwarenessLine = normalizePreparedExecutionText(
        prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
        ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.awarenessLine,
        1600,
      )
      if (
        directPreludeDiagnosticAwarenessLine
        && /callback return|same thread/iu.test(directPreludeDiagnosticAwarenessLine)
        && shouldPreserveProjectAwarenessLineVerbatim(
          directPreludeDiagnosticAwarenessLine,
          runtimeGroundedAwareness.awarenessLine,
        )
      ) {
        runtimeGroundedAwareness = {
          awarenessLine: directPreludeDiagnosticAwarenessLine,
          companionHeadlineLine:
            normalizePreparedExecutionText(runtimeGroundedProjectState?.companionHeadlineLine, 1600)
            ?? directPreludeDiagnosticAwarenessLine,
        }
      }
      if (
        !payloadProjectState.hasDirectPayloadProjectAwarenessLine
        && rebuiltDiagnosticAwarenessLine
        && !/callback return|same thread/iu.test(runtimeGroundedAwareness.awarenessLine ?? '')
        && !carriesProjectIdentityAnchor(runtimeGroundedAwareness.awarenessLine)
        && carriesProjectIdentityAnchor(rebuiltDiagnosticAwarenessLine)
      ) {
        runtimeGroundedAwareness = {
          awarenessLine: rebuiltDiagnosticAwarenessLine,
          companionHeadlineLine:
            normalizePreparedExecutionText(rebuiltMindTurnContract?.projectState?.companionHeadlineLine, 1600)
            ?? rebuiltDiagnosticAwarenessLine,
        }
      }
      if (runtimeSurfaceBeforeProviderFacingReturn?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame) {
        const runtimeSurfaceBeforeProviderFacingReturnProjectState
          = runtimeSurfaceBeforeProviderFacingReturn.digitalLifeRuntimeSurface.dialogue.currentConsciousFrame.projectState as Record<string, unknown> | null | undefined
        runtimeSurfaceBeforeProviderFacingReturn.digitalLifeRuntimeSurface.dialogue.currentConsciousFrame.projectState = writeProjectStateAwarenessFields(
          runtimeSurfaceBeforeProviderFacingReturnProjectState,
          runtimeGroundedAwareness.awarenessLine,
          runtimeGroundedAwareness.companionHeadlineLine,
        ) as never
      }
      const runtimeSurfaceDiagnostics = runtimeSurfaceBeforeProviderFacingReturn
        ? clonePreparedExecutionRuntimeSurfaceForDiagnostics(runtimeSurfaceBeforeProviderFacingReturn)
        : null
      if (runtimeSurfaceDiagnostics?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame) {
        const runtimeSurfaceDiagnosticsProjectState
          = runtimeSurfaceDiagnostics.digitalLifeRuntimeSurface.dialogue.currentConsciousFrame.projectState as Record<string, unknown> | null | undefined
        runtimeSurfaceDiagnostics.digitalLifeRuntimeSurface.dialogue.currentConsciousFrame.projectState = writeProjectStateAwarenessFields(
          runtimeSurfaceDiagnosticsProjectState,
          runtimeGroundedAwareness.awarenessLine,
          runtimeGroundedAwareness.companionHeadlineLine,
        ) as never
      }
      if (preparedSelectionBase?.dialogue?.currentConsciousFrame) {
        const preparedSelectionProjectStateForDiagnostics
          = preparedSelectionBase.dialogue.currentConsciousFrame.projectState as Record<string, unknown> | null | undefined
        preparedSelectionBase.dialogue.currentConsciousFrame.projectState = writeProjectStateAwarenessFields(
          preparedSelectionProjectStateForDiagnostics,
          preparedSelectionAwareness.awarenessLine,
          preparedSelectionAwareness.companionHeadlineLine,
        ) as never
      }
      if (builderSurface?.dialogue?.currentConsciousFrame) {
        const builderProjectStateForDiagnostics
          = builderSurface.dialogue.currentConsciousFrame.projectState as Record<string, unknown> | null | undefined
        builderSurface.dialogue.currentConsciousFrame.projectState = writeProjectStateAwarenessFields(
          builderProjectStateForDiagnostics,
          preparedSelectionAwareness.awarenessLine,
          preparedSelectionAwareness.companionHeadlineLine,
        ) as never
      }
      const selectedFresherBaseNextClosureTargets = readPreparedExecutionNextClosureTargets(preparedSelectionBase)
      const selectedFresherDialogueNextClosureTarget = normalizePreparedExecutionText(
        selectedFresherBaseNextClosureTargets.dialogue
        ?? preparedSelectionProjectState?.nextClosureTarget
        ?? answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget
        ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget
        ?? rebuiltMindTurnContract?.projectState?.nextClosureTarget
        ?? normalizedMindTurnContract?.projectState?.nextClosureTarget,
        1600,
      )
      const selectedFresherNextClosureTargets = {
        dialogue: selectedFresherDialogueNextClosureTarget,
        raw: selectedFresherBaseNextClosureTargets.raw ?? selectedFresherDialogueNextClosureTarget,
        cognition: selectedFresherBaseNextClosureTargets.cognition ?? selectedFresherDialogueNextClosureTarget,
      }
      const postBuilderNextClosureTargets = {
        rawRuntimeSurfaceDialogue:
          normalizePreparedExecutionText(builderProjectState?.nextClosureTarget, 1600)
          ?? selectedFresherDialogueNextClosureTarget,
        finalRuntimeSurfaceDialogue:
          normalizePreparedExecutionText(runtimeGroundedProjectState?.nextClosureTarget, 1600)
          ?? normalizePreparedExecutionText(builderProjectState?.nextClosureTarget, 1600)
          ?? normalizePreparedExecutionText(rebuiltMindTurnContract?.projectState?.nextClosureTarget, 1600)
          ?? normalizePreparedExecutionText(normalizedMindTurnContract?.projectState?.nextClosureTarget, 1600)
          ?? selectedFresherDialogueNextClosureTarget,
      }

      if (preparedSelectionBase?.dialogue.currentConsciousFrame) {
        preparedSelectionBase.dialogue.currentConsciousFrame.projectState = writeProjectStateAwarenessFields(
          preparedSelectionProjectState,
          preparedSelectionAwareness.awarenessLine,
          preparedSelectionAwareness.companionHeadlineLine,
        ) as never
      }
      if (builderSurface?.dialogue.currentConsciousFrame) {
        builderSurface.dialogue.currentConsciousFrame.projectState = writeProjectStateAwarenessFields(
          builderProjectState,
          preparedSelectionAwareness.awarenessLine,
          preparedSelectionAwareness.companionHeadlineLine,
        ) as never
      }

      const rebuiltProjectStateSource
        = (rebuiltMindTurnContract?.projectState as Record<string, unknown> | null | undefined)
          ?? preparedSelectionProjectState
          ?? runtimeGroundedProjectState
          ?? {}
      const preferredRichDiagnosticsAwarenessLine = (
        !payloadProjectState.hasDirectPayloadProjectAwarenessLine
        && /Richer spine-carri|provider-facing answer contract before reply authoring/iu.test(
          String(
            runtimeGroundedLatestLandedProgress
            ?? runtimeGroundedResolvedProjectState?.latestLandedProgress
            ?? runtimeGroundedProjectState?.latestLandedProgress
            ?? '',
          ),
        )
      )
        ? buildProviderFacingProjectAwarenessLine({
            identity:
              normalizePreparedExecutionText(runtimeGroundedProjectState?.identity, 1600)
              ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.identity, 1600)
              ?? '',
            currentPhase:
              normalizePreparedExecutionText(runtimeGroundedProjectState?.currentPhase, 1600)
              ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.currentPhase, 1600)
              ?? '',
            sameHerSelfLine:
              normalizePreparedExecutionText(runtimeGroundedProjectState?.sameHerSelfLine, 1600)
              ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.sameHerSelfLine, 1600)
              ?? null,
            latestLandedProgress: runtimeGroundedLatestLandedProgress,
            primaryOpenLoop: runtimeGroundedPrimaryOpenLoop,
            nextClosureTarget: runtimeGroundedNextClosureTarget,
          })
        : null
      const preferredRichDiagnosticsCompanionHeadlineLine = preferredRichDiagnosticsAwarenessLine
        ? (
            normalizePreparedExecutionText(runtimeGroundedAwareness.companionHeadlineLine, 1600)
            ?? preferredRichDiagnosticsAwarenessLine
          )
        : null
      const rebuiltProjectState = {
        ...rebuiltProjectStateSource,
        nextClosureTarget:
          normalizePreparedExecutionText(
            (rebuiltMindTurnContract?.projectState as Record<string, unknown> | null | undefined)?.nextClosureTarget,
            1600,
          )
          ?? normalizePreparedExecutionText(runtimeGroundedProjectState?.nextClosureTarget, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedResolvedProjectState?.nextClosureTarget, 1600)
          ?? null,
        ...writeProjectStateAwarenessFields(
          rebuiltProjectStateSource,
          preferredRichDiagnosticsAwarenessLine
          ?? normalizePreparedExecutionText(rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedProjectState?.preDialogueAwarenessLine, 1600)
          ?? preparedSelectionAwareness.awarenessLine,
          preferredRichDiagnosticsCompanionHeadlineLine
          ?? normalizePreparedExecutionText(rebuiltMindTurnContract?.projectState?.companionHeadlineLine, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedProjectState?.companionHeadlineLine, 1600)
          ?? preparedSelectionAwareness.companionHeadlineLine,
        ),
      }
      const normalizedAwarenessLine
        = preferredRichDiagnosticsAwarenessLine
          ?? normalizePreparedExecutionText(preparedSelectionAwareness.companionHeadlineLine, 1600)
          ?? normalizePreparedExecutionText(preparedSelectionAwareness.awarenessLine, 1600)
          ?? normalizePreparedExecutionText(runtimeGroundedAwareness.awarenessLine, 1600)
          ?? normalizePreparedExecutionText(resolveAlicizationProjectStateBrief().preDialogueAwarenessLine, 1600)
      const normalizedMindTurnContractAwarenessLine = normalizePreparedExecutionText(
        normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine,
        1600,
      )
      const normalizedAwarenessLineMissesPreferredRichRuntimeCarry = Boolean(
        preferredRichDiagnosticsAwarenessLine
        && normalizedMindTurnContractAwarenessLine
        && [
          runtimeGroundedLatestLandedProgress,
          runtimeGroundedPrimaryOpenLoop,
          runtimeGroundedNextClosureTarget,
        ].some(detail =>
          Boolean(
            detail
            && preferredRichDiagnosticsAwarenessLine.includes(detail)
            && !normalizedMindTurnContractAwarenessLine.includes(detail),
          ),
        ),
      )
      const shouldPreferRichDiagnosticsForNormalizedAwareness = Boolean(
        preferredRichDiagnosticsAwarenessLine
        && normalizedMindTurnContractAwarenessLine
        && (
          (
            awarenessLineMissesRuntimeCarry({
              awarenessLine: normalizedMindTurnContractAwarenessLine,
              latestLandedProgress: runtimeGroundedLatestLandedProgress,
              primaryOpenLoop: runtimeGroundedPrimaryOpenLoop,
              nextClosureTarget: runtimeGroundedNextClosureTarget,
            })
            && !awarenessLineMissesRuntimeCarry({
              awarenessLine: preferredRichDiagnosticsAwarenessLine,
              latestLandedProgress: runtimeGroundedLatestLandedProgress,
              primaryOpenLoop: runtimeGroundedPrimaryOpenLoop,
              nextClosureTarget: runtimeGroundedNextClosureTarget,
            })
          )
          || normalizedAwarenessLineMissesPreferredRichRuntimeCarry
        ),
      )
      const normalizedProjectStateSource
        = (normalizedMindTurnContract?.projectState as Record<string, unknown> | null | undefined)
          ?? rebuiltProjectState
      const normalizedProjectState = {
        ...normalizedProjectStateSource,
        nextClosureTarget:
          normalizePreparedExecutionText(
            (normalizedMindTurnContract?.projectState as Record<string, unknown> | null | undefined)?.nextClosureTarget,
            1600,
          )
          ?? normalizePreparedExecutionText(rebuiltProjectState.nextClosureTarget, 1600)
          ?? null,
        ...writeProjectStateAwarenessFields(
          normalizedProjectStateSource,
          shouldPreferRichDiagnosticsForNormalizedAwareness
            ? preferredRichDiagnosticsAwarenessLine
            : normalizePreparedExecutionText(normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine, 1600)
              ?? normalizedAwarenessLine,
          preferredRichDiagnosticsCompanionHeadlineLine
          ?? normalizePreparedExecutionText(normalizedMindTurnContract?.projectState?.companionHeadlineLine, 1600)
          ?? normalizePreparedExecutionText(preparedSelectionAwareness.companionHeadlineLine, 1600)
          ?? normalizedAwarenessLine,
        ),
      }
      const providerFacingAwarenessResolutionDiagnostics = buildProviderFacingAwarenessResolutionDiagnostics({
        rawPayload,
        rebuiltProjectState,
        normalizedProjectState: finalReturnedRuntimeSurfaceProjectState ?? normalizedProjectState,
      })
      const providerFacingNormalization = {
        normalizedProjectStatePreDialogueAwarenessExplicit: normalizePreparedExecutionText(
          normalizedProjectState.preDialogueAwarenessLine,
          1600,
        ),
        normalizedProjectStatePreDialogueAwarenessFallback:
          normalizePreparedExecutionText(normalizedProjectState.companionHeadlineLine, 1600)
          ?? normalizePreparedExecutionText(normalizedProjectState.preDialogueAwarenessLine, 1600),
        normalizedProjectState: normalizedProjectState as Record<string, unknown>,
        finalProjectState: (finalReturnedRuntimeSurfaceProjectState ?? normalizedProjectState) as Record<string, unknown>,
        normalizedReturnProjectState: (normalizedMindTurnContract?.projectState as Record<string, unknown> | null | undefined)
          ?? (normalizedProjectState as Record<string, unknown>),
        fullyConvergedReturnProjectState: (finalReturnedRuntimeSurfaceProjectState ?? normalizedProjectState) as Record<string, unknown>,
      }
      const rebuiltMindTurnContractDiagnostics = rebuiltMindTurnContract
        ? overrideMindTurnContractNextClosureTarget({
            contract: {
              ...rebuiltMindTurnContract,
              projectState: rebuiltProjectState,
            } as AlicizationMindTurnContractSnapshot,
            nextClosureTarget: normalizePreparedExecutionText(rebuiltProjectState.nextClosureTarget, 1600),
          })
        : null
      const normalizedMindTurnContractDiagnostics = normalizedMindTurnContract
        ? overrideMindTurnContractNextClosureTarget({
            contract: {
              ...normalizedMindTurnContract,
              projectState: normalizedProjectState,
            } as AlicizationMindTurnContractSnapshot,
            nextClosureTarget:
              normalizePreparedExecutionText(normalizedProjectState.nextClosureTarget, 1600),
          })
        : null
      const returnedRuntimeSurface = clonePreparedExecutionRuntimeSurfaceForDiagnostics(runtimeSurface)
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
        rebuiltMindTurnContract: rebuiltMindTurnContractDiagnostics,
        normalizedMindTurnContract: normalizedMindTurnContractDiagnostics,
        runtimeGroundedInputProjectStateAwarenessFields: readProjectStateAwarenessFields(
          writeProjectStateAwarenessFields(
            runtimeGroundedProjectState ?? {},
            runtimeGroundedAwareness.awarenessLine,
            runtimeGroundedAwareness.companionHeadlineLine,
          ),
        ),
        runtimeGroundedInputProjectState: runtimeGroundedProjectState ?? null,
        runtimeGroundedContractProjectState: readProjectStateAwarenessFields(
          writeProjectStateAwarenessFields(
            runtimeGroundedProjectState ?? {},
            (() => {
              const normalizedContractAwarenessLine = normalizePreparedExecutionText(
                normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine,
                1600,
              )
              return (
                normalizedContractAwarenessLine
                && runtimeGroundedAwareness.awarenessLine
                && shouldPreserveProjectAwarenessLineVerbatim(
                  runtimeGroundedAwareness.awarenessLine,
                  normalizedContractAwarenessLine,
                )
              )
                ? runtimeGroundedAwareness.awarenessLine
                : normalizedContractAwarenessLine ?? runtimeGroundedAwareness.awarenessLine
            })(),
            normalizePreparedExecutionText(
              normalizedMindTurnContract?.projectState?.companionHeadlineLine,
              1600,
            ) ?? runtimeGroundedAwareness.companionHeadlineLine,
          ),
        ),
        mirrorFlowDiagnostics: {
          incomingPreludeDialogueSessionMirror,
          rawSessionMirror,
          finalSessionMirror: sessionMirror,
        },
        baseNextClosureTargets,
        preparedChainStageNextClosureTargets,
        selectedRuntimeSurfaceBeforeAdjustmentNextClosureTargets,
        effectiveStageProjectStateSources,
        baseRuntimeSurfaceProjectState,
        providerFacingAwarenessResolutionDiagnostics,
        providerFacingNormalization,
        finalReturnedRuntimeSurfaceProjectState,
        selectedFresherNextClosureTargets,
        postBuilderNextClosureTargets,
        answerPlannerReducedRuntimeSurface: preparedRuntimeSurfaceChainDiagnostics?.answerPlannerReducedRuntimeSurface ?? null,
        baseDigitalLifeRuntimeSurface: baseDigitalLifeRuntimeSurfaceDiagnostics,
        runtimeSurfaceForBuilder: builderSurface,
        returnedMindTurnContract: normalizedMindTurnContract,
        finalizedReturnedMindTurnContract,
        runtimeSurface: runtimeSurfaceDiagnostics,
        returnedRuntimeSurface,
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

    if (finalGoverningProject && runtimeSurface.digitalLifeRuntimeSurface?.dialogue) {
      const existingAnswerPlanner = runtimeSurface.digitalLifeRuntimeSurface.dialogue.answerPlanner ?? {
        mustDo: [...(normalizedMindTurnContract?.mustDo ?? [])],
        mustNotDo: [...(normalizedMindTurnContract?.mustNotDo ?? [])],
        governingProject: null,
      }
      const providerFacingAnswerPlannerMustDo = mergeUniqueRules([
        ...((existingAnswerPlanner.mustDo as string[] | null | undefined) ?? []),
        ...(normalizedMindTurnContract?.mustDo ?? []),
      ])
      if (!providerFacingAnswerPlannerMustDo.some(item =>
        item.includes('continuity_policy=project_state_required'),
      )) {
        providerFacingAnswerPlannerMustDo.push(
          'continuity_policy=project_state_required | owner=ProjectStateGovernance-structured',
        )
      }
      if (!String(existingAnswerPlanner.governingProject ?? '').trim()) {
        runtimeSurface.digitalLifeRuntimeSurface.dialogue.answerPlanner = {
          ...existingAnswerPlanner,
          mustDo: providerFacingAnswerPlannerMustDo,
          governingProject: finalGoverningProject,
        } as typeof runtimeSurface.digitalLifeRuntimeSurface.dialogue.answerPlanner
      }
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
