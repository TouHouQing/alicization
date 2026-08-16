import type {
  AlicizationChatFailureKind,
  AlicizationExecutionChannel,
  AlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'
import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'

import type {
  AlicizationActiveThought,
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationChannelCapability,
  AlicizationChatAbortPayload,
  AlicizationChatAbortResult,
  AlicizationChatStartPayload,
  AlicizationChatStartResult,
  AlicizationChatToolProgressInput,
  AlicizationClawTaskIntent,
  AlicizationConversationStateSnapshot,
  AlicizationConversationTurnInput,
  AlicizationCoreIncarnationReforgePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDispatchTaskThreadPayload,
  AlicizationDreamMetabolismPayload,
  AlicizationDreamRunResult,
  AlicizationDurabilityPulseSnapshot,
  AlicizationExecutionEventInput,
  AlicizationGenesisInput,
  AlicizationMindHeadKey,
  AlicizationPersonalityState,
  AlicizationPersonaTrainingExecutorConfig,
  AlicizationPresencePulsePayload,
  AlicizationProactiveMetadata,
  AlicizationProactiveReasonCode,
  AlicizationReminderScheduleResult,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousTickResult,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionContinuityInput,
  AlicizationAgentTurnRuntime,
} from './agent-runtime'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationLocalDesktopInspectionInteractable, AlicizationLocalDesktopInspectSceneInput } from './local-desktop-inspection'
import type { MainGatewayExecutionToolContext } from './main-chat-execution-surface'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationMemoryTrialProvider } from './memory-live-provider-trial'
import type { AlicizationMemoryGatewayTextProvider } from './memory-os/provider-planning'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type {
  AlicizationProactiveLoopState,
} from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  AlicizationMindTraceMemorySnapshot,
  AlicizationNormalizedDialogueRespondedPayload,
  AlicizationRuntimeSetupOptions,
} from './runtime-governance'
import type { AlicizationMainGatewayTextProvider } from './runtime-main-gateway-one-shot'
import type {
  ChatRunState,
  DesktopCaptureAccessResult,
  OrganicMemoryPromptContext,
  ScreenSemanticCacheState,
  SubconsciousCardState,
} from './runtime-soul'
import type { AlicizationSkillLoader } from './turn-os/skill-loader'
import type {
  AlicizationVisibleReplyRealizationArtifact,
  AlicizationVisibleReplyValidationStatus,
} from './visible-reply/facade'

import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pid, platform, cwd as processCwd } from 'node:process'

import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { errorMessageFrom } from '@moeru/std'
import { getScreenCaptureDiagnosticsForWebContentsId } from '@proj-alicization/electron-screen-capture/main'
import {
  alicizationExecutionCapabilityChannels,
  alicizationProviderResponseFormat,
  buildAlicizationMemoryDecisionTraceRecords,
  buildAlicizationProviderFactBlock,
  containsAlicizationFixedTemplateResidue,
  inferAlicizationInspectionIntent,
  isWeakAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceTarget,
  normalizeAlicizationDerivedMindStateBundle,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'
import { app, desktopCapturer, globalShortcut, ipcMain, powerMonitor, systemPreferences, webContents } from 'electron'

import {
  alicizationChatAbortInvokeChannel,
  alicizationChatStartInvokeChannel,
  alicizationChatStreamChunk,
  alicizationChatStreamDispatchChannel,
  alicizationChatStreamError,
  alicizationChatStreamFinish,
  alicizationChatStreamMeta,
  alicizationChatStreamToolCall,
  alicizationChatStreamToolProgress,
  alicizationChatStreamToolResult,
  alicizationDialogueResponded,
  alicizationKillSwitchStateChanged,
  alicizationSoulChanged,
  clampAlicizationPerformancePayloadToManifest,
  electronAlicizationVisualPresenceChanged,
  electronAlicizationVisualPresenceStateChanged,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../shared/eventa'
import { onAppBeforeQuit } from '../../libs/bootkit/lifecycle'
import { invokeAlicizationMcpCallToolFromMain, invokeAlicizationMcpListToolsFromMain } from '../airi/mcp-servers'
import { createAlicizationAgentRuntime } from './agent-runtime'
import {
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import {
  createDefaultPerceptionState,
  detectInvitedInspectionIntent,
  extractInspectionHintTerms,
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  normalizePerceptionState,
  rememberPerceptionBrowserWorkflowState,
  rememberPerceptionSceneResidue,
  updatePerceptionStateWithObservation,
} from './attention-anchor'
import { updateVisualAttentionModel } from './attention-model'
import { createAlicizationBodyKernel } from './body-kernel'
import { setupAlicizationDb } from './db'
import { createDesktopCaptureAccessRuntime } from './desktop-capture-runtime'
import { buildDialogueIngressGovernor } from './dialogue-ingress-governor'
import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import {
  buildDialogueTurnSemantics,
} from './dialogue-turn-semantics'
import {
  buildAlicizationDigitalLifeRuntimeSurface,
} from './digital-life-kernel'
import {
  commitAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpine,
} from './digital-life-spine'
import { resolveAlicizationEmotionalTransitionDecay } from './emotional-ledger'
import {
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import {
  createAlicizationExecutionDeliveryRuntime,
} from './execution-delivery-runtime'
import {
  alicizationTerminalTaskThreadStatuses,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import { createAlicizationExecutorRuntime } from './executor-runtime'
import { buildAsyncFactMemoryFragments } from './fact-memory'
import { buildHostSocialContexts } from './host-social-guidance'
import { resolveAlicizationLearningEligibility } from './life-core/working-memory-policy'
import { createWorkingMemoryStore } from './life-core/working-memory-store'
import { buildQuietCompanionshipMindTurnEvent, deriveQuietCompanionshipOutcome } from './living-world-state'
import { createAlicizationLocalBrowserAutomationService } from './local-browser-automation'
import {

  buildAlicizationDesktopInspectionSceneSnapshot,
  buildAlicizationDesktopInspectionSuggestedActions,
  summarizeAlicizationDesktopInspection,
} from './local-desktop-inspection'
import { resolveOpenAICompatibleLongTermMemoryEmbeddingProvider } from './long-term-memory-openai-embedding-provider'
import { abortAlicizationDirectChatRun, abortAlicizationRunningChatRuns } from './main-chat-abort'
import { runAlicizationMainChatBackground } from './main-chat-background-run'
import { handleAlicizationDirectChatStart } from './main-chat-direct-start'
import { syncAlicizationMainChatLlmRoute } from './main-chat-llm-route-sync'
import {
  armAlicizationMainChatPreparationDeadline,
  raceAlicizationMainChatPreparation,
} from './main-chat-preparation-deadline'
import { createAlicizationMainChatRunStateController } from './main-chat-run-state'
import {
  createAlicizationMainChatSessionRuntime,
} from './main-chat-session-runtime'
import { acceptAlicizationMainChatStart } from './main-chat-start-acceptance'
import { cleanupAlicizationAcceptedMainChatStartFailure } from './main-chat-start-cleanup'
import { resolveAlicizationMainChatStartResult } from './main-chat-start-result'
import { createAbortError } from './main-chat-stream-primitives'
import { createAlicizationMainGatewayWorkCoordinator } from './main-gateway-work-coordinator'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import {
  emptyAlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import {
  generateMemoryDeliberationWithGateway as generateMemoryDeliberationWithMemoryOsGateway,
  generateMemoryRecollectionIntentWithGateway as generateMemoryRecollectionIntentWithMemoryOsGateway,
  generateMemoryRecollectionPlanWithGateway as generateMemoryRecollectionPlanWithMemoryOsGateway,
  generateMemoryRecollectionSpeechPlanWithGateway as generateMemoryRecollectionSpeechPlanWithMemoryOsGateway,
} from './memory-os/provider-planning'
import { buildMindContinuityFragment, buildMindContinuityRecallSeed } from './mind-continuity'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { isPersonaResidueMemoryText, normalizeOrganicMemoryText } from './organic-memory-hygiene'
import {
  attachSynthesizedReflections,
  buildDialogueReplyFeedbackOutcomeClosure,
  buildExecutionProposalFeedbackOutcomeClosure,
  buildExecutionResultFeedbackOutcomeClosure,
  buildProactiveFeedbackOutcomeClosure,
  deriveDialogueReplyFeedbackKind,
  deriveExecutionProposalFeedbackKind,
  deriveExecutionResultFeedbackKind,
} from './outcome-reinforcement'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import {
  createPersonaTrainingProcessExecutor,
  normalizePersonaTrainingProcessConfig,
  testPersonaTrainingProcessConnection,
} from './persona-training-process-executor'
import { progressProactiveCadenceState } from './proactive-cadence'
import {
  createDefaultProactiveLoopState,
  normalizeProactiveLoopState,
  proactiveDismissCooldownMs,
  proactiveImplicitIgnoredAfterMs,
  proactiveReplyWindowMs,
  recoverProactiveRhythmAfterDream,
  registerProactiveDelivery,
  reportExplicitProactiveFeedback,
  updateLateNightActivityState,
} from './proactive-feedback'
import {
  buildProactiveLayeredContext,
  inferScenarioFromContext,
  isLateNightWindow,
} from './proactive-layered-context'
import { evaluateProactivePolicy } from './proactive-policy'
import {
  rankScreenSemanticCaptureCandidates,
} from './proactive-screen-semantic'
import { buildReflectionLedgerFragment } from './reflection-memory'
import { createAlicizationReplayBenchmarkRuntime } from './replay-benchmark-runtime'
import { createAlicizationAgentSessionMirrorRuntime } from './runtime-agent-session-mirror'
import { writeAlicizationAtomicContent } from './runtime-atomic-write'
import { createAlicizationCardPromptRuntime } from './runtime-card-prompt'
import { createAlicizationRuntimeCardScopeLifecycle } from './runtime-card-scope-lifecycle'
import { createAlicizationRuntimeCardScopeOrchestrator } from './runtime-card-scope-orchestrator'
import { createAlicizationRuntimeCardScopeState } from './runtime-card-scope-state'
import { createAlicizationChatPerceptionAugmentRuntime } from './runtime-chat-perception-augment'
import {
  buildChatInspectionGroundingParts,
} from './runtime-chat-prompt-blocks'
import { createAlicizationChatStreamRuntime } from './runtime-chat-stream'
import { createAlicizationRuntimeContinuityPresenceComposition } from './runtime-continuity-presence-composition'
import { createAlicizationDeliveryReminderRuntime } from './runtime-delivery-reminders'
import { createAlicizationRuntimeDialogueDelivery } from './runtime-dialogue-delivery'
import { createAlicizationRuntimeDialogueFeedback } from './runtime-dialogue-feedback'
import { createAlicizationDreamRuntime } from './runtime-dream'
import {
  alicizationCoreIncarnationReforgeResponseFormat,
  alicizationDreamAutobiographicalSummariesResponseFormat,
  alicizationDreamMetabolismResponseFormat,
  alicizationMemoryConsolidationRefinementResponseFormat,
} from './runtime-dream-provider-contract'
import { createAlicizationRuntimeExecutionDelivery } from './runtime-execution-delivery'
import { createAlicizationRuntimeExecutionFeedback } from './runtime-execution-feedback'
import { buildAlicizationChatStreamEmbodimentMeta, buildCompressedNativeImageDataUrl, buildDefaultDialoguePerformancePayload, buildMindTurnTraceEvents, coerceConversationTurnToMindGovernedPayload, isAbortError, latestUserMessageContainsVisualInput, normalizeDialogueRespondedPayload, readStringValue } from './runtime-governance'
import { registerAlicizationChatInvokeHandlers } from './runtime-invoke-handlers-chat'
import { registerAlicizationDialogueInvokeHandlers } from './runtime-invoke-handlers-dialogue'
import { registerAlicizationMaintenanceInvokeHandlers } from './runtime-invoke-handlers-maintenance'
import { registerAlicizationMemoryInvokeHandlers } from './runtime-invoke-handlers-memory'
import { registerAlicizationSkillInvokeHandlers } from './runtime-invoke-handlers-skill'
import { registerAlicizationSoulStateInvokeHandlers } from './runtime-invoke-handlers-soul-state'
import { registerAlicizationTaskInvokeHandlers } from './runtime-invoke-handlers-task'
import { createAlicizationRuntimeMainChatRuntime } from './runtime-main-chat-runtime'
import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'
import { createAlicizationMainGatewayOneShotRuntime } from './runtime-main-gateway-one-shot'
import { createAlicizationRuntimeMemoryRuntime } from './runtime-memory-runtime'
import { createAlicizationRuntimeMemorySupportingComposition } from './runtime-memory-supporting-composition'
import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { buildOrganicMemoryProviderFactBlocks } from './runtime-organic-memory-prompt-blocks'
import {
  normalizeOrganicRecallText,
  selectPromptActiveThoughts,
} from './runtime-organic-recall'
import {
  buildInspectionSceneResidue,
  buildProactivePerceptionSignals,
  buildScreenSemanticSummaryFromResidue,
  describePerceptionTarget,
  getUsablePerceptionSceneResidue,
  isGenericScreenInspectionRequest,
  isResidueBackedScreenSemanticSummary,
  isWeakGenericBrowserFocusTarget,
  purgeWeakGenericBrowserInspectionState,
  resolveForegroundDecisionTarget,
  shouldSuppressWeakGenericBrowserInspectionAnchor,
  shouldUsePerceptionResidueAsLiveSceneSummary,
} from './runtime-perception-helpers'
import { createAlicizationRuntimeProactiveFeedback } from './runtime-proactive-feedback'
import {
  executeBuiltinRealtimeQuery,
  normalizeReminderMessage,
  sanitizeBriefText,
} from './runtime-realtime'
import { resolveReminderDueTimerDelay } from './runtime-reminder-due-scheduler'
import {
  alicizationCardActiveSessionMetaKey,
  alicizationCardKillSwitchMetaKey,
  alicizationDialogueAckStateMetaKey,
  alicizationDialogueReplyFeedbackAckMetaKey,
  alicizationDreamLastRunMetaKey,
  alicizationExecutionDeliveryStateMetaKey,
  alicizationPerceptionStateMetaKey,
  alicizationProactiveLoopStateMetaKey,
  alicizationSubconsciousPersistMs,
  alicizationSubconsciousStateMetaKey,
  alicizationSubconsciousTickMs,
  alicizationVisualPresenceStateMetaKey,
  buildSoulBody,
  chatRunFinishedRetentionMs,
  clamp01,
  currentSoulSchemaVersion,
  defaultAlicizationCardId,
  defaultFrontmatter,
  defaultSoulBody,
  dialogueDeliveryRetryBaseMs,
  dialogueDeliveryRetryMaxAttempts,
  dialogueDeliveryRetryMaxMs,
  dreamMaxCharsPerAssistantTurn,
  dreamMaxCharsPerUserTurn,
  dreamMaxTotalChars,
  dreamMaxTurns,
  extractPersonaNotesFromBody,
  hashContent,
  inspectionGroundingImageJpegQuality,
  inspectionGroundingImageMaxHeight,
  inspectionGroundingImageMaxWidth,
  mainChatPreparationTimeoutMs,
  normalizeCardId,
  normalizeCoreIncarnation,
  normalizeCustomDirectives,
  normalizeGender,
  normalizeHostAttitude,
  normalizeMindAge,
  parseSoul,
  reminderClaimBatchSize,
  reminderLlmRetryDelayMs,
  reminderMaxMessageChars,
  reminderMaxMinutes,
  reminderMinMinutes,
  reminderOverdueTierThresholdMinutes,
  resolveAlicizationSoulPersonaKernel,
  sanitizeMultilineText,
  sanitizeText,
  subconsciousInterruptionProbeTimeoutMs,
  syncPersonalityBaselineInBody,
  toSoulContent,
  winRenameRetryDelaysMs,
  withNeedsGenesis,
} from './runtime-soul'
import { createAlicizationRuntimeSoulLifecycle } from './runtime-soul-lifecycle'
import {
  isAlicizationAutonomousDialogueFamily,
  isAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueFamilyClassification,
  resolveAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueStructuredFormat,
} from './runtime-structured-format'
import { createAlicizationSubconsciousProbeRuntime } from './runtime-subconscious-probe'
import { createAlicizationSubconsciousTickRuntime } from './runtime-subconscious-tick'
import { createAlicizationRuntimeSupportingRuntimesComposition } from './runtime-supporting-runtimes-composition'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import {
  appendContentPartsToLatestUserMessage,
  hasImageTransportContent,
  normalizeTransportMessageContent,
  parseJsonObjectFromText,
  readTransportContentAsText,
} from './runtime-transport-content'
import { createAlicizationSensoryBus } from './sensory-bus'
import {
  deriveRuntimeCaptureGovernance,
  deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot,
  deriveSensoryCaptureSnapshotFromDiagnostics,
} from './sensory-capture'
import { createAlicizationSensoryRuntime } from './sensory-runtime'
import {
  getAlicizationCardKillSwitchSnapshot,
  getAlicizationKillSwitchSnapshot,
  isAlicizationKillSwitchSuspended,
  onAlicizationCardKillSwitchChanged,
  onAlicizationKillSwitchChanged,
  setAlicizationAuditLogger,
  setAlicizationCardKillSwitchState,
  setAlicizationKillSwitchState,
} from './state'
import { createTaskThreadOrchestrator } from './task-thread-orchestrator'
import { resolveAlicizationLocalRuntimeUserId } from './turn-os/main-chat-participant'
import { createAlicizationSkillLoader } from './turn-os/skill-loader'
import { createAlicizationSkillRegistry } from './turn-os/skill-registry'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'
import { registerDialogueWorldThreadAssistantTurn } from './turn-outcome-reducer'
import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
} from './visual-episodic-memory'
import { buildVisualHeartbeat } from './visual-heartbeat'

const alicizationSelfEvolutionVersionRuntimeMetaKey = 'self_evolution_version_runtime_v1'

type VisibleReplyPublicCriticSummary
  = NonNullable<AlicizationVisibleReplyRealizationArtifact['critic']>
interface PendingVisibleReplyRealizationTelemetry {
  version: 'visible-reply-realization-v1'
  expectedAuthority: 'llm-mind' | null
  actualAuthority: 'llm-mind' | 'local-deterministic-fallback' | 'non-human-authored-blocked' | null
  providerMindExecuted: boolean | null
  mode: string | null
  visibleText: string | null
  visibleReplyValidationStatus: AlicizationVisibleReplyValidationStatus
  nonHumanAuthoredStatus: string | null
  blockedReasons: string[]
  reason: string | null
  critic: AlicizationVisibleReplyRealizationArtifact['critic']
  closure: AlicizationVisibleReplyRealizationArtifact['closure']
}

function normalizeVisibleReplyReasonCodes(raw: unknown, limit = 12) {
  return Array.isArray(raw)
    ? raw
        .map(item => sanitizeText(item, ''))
        .filter(Boolean)
        .slice(0, limit)
    : []
}

function normalizeVisibleReplyCriticStatus(raw: unknown): VisibleReplyPublicCriticSummary['status'] | null {
  return raw === 'pass' || raw === 'blocked'
    ? raw
    : null
}

function normalizeVisibleReplyPublicCriticSummary(raw: unknown): AlicizationVisibleReplyRealizationArtifact['critic'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const status = normalizeVisibleReplyCriticStatus((raw as any).status)
  if (!status)
    return null

  return {
    version: 'visible-reply-critic-public-summary-v1',
    status,
    providerMindRequired: (raw as any).providerMindRequired === true,
    reasonCodes: normalizeVisibleReplyReasonCodes((raw as any).reasonCodes),
  }
}

function normalizeVisibleReplyPublicClosureSummary(raw: unknown): AlicizationVisibleReplyRealizationArtifact['closure'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const status = (raw as any).status
  if (status !== 'approved' && status !== 'blocked')
    return null

  return {
    version: 'visible-reply-closure-public-summary-v1',
    status,
    reasonCodes: normalizeVisibleReplyReasonCodes((raw as any).reasonCodes),
    initialCriticStatus: normalizeVisibleReplyCriticStatus((raw as any).initialCriticStatus),
    finalCriticStatus: normalizeVisibleReplyCriticStatus((raw as any).finalCriticStatus),
  }
}

function normalizeVisibleReplyRealizationTelemetry(raw: unknown): PendingVisibleReplyRealizationTelemetry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const expectedAuthority = sanitizeText((raw as any).expectedAuthority, '') === 'llm-mind'
    ? 'llm-mind'
    : null
  const rawActualAuthority = sanitizeText((raw as any).actualAuthority, '')
  const actualAuthority = rawActualAuthority === 'llm-mind'
    || rawActualAuthority === 'local-deterministic-fallback'
    || rawActualAuthority === 'non-human-authored-blocked'
    ? rawActualAuthority
    : null
  const closure = normalizeVisibleReplyPublicClosureSummary((raw as any).closure)

  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority,
    actualAuthority,
    providerMindExecuted: typeof (raw as any).providerMindExecuted === 'boolean'
      ? (raw as any).providerMindExecuted
      : null,
    mode: sanitizeText((raw as any).mode, '') || null,
    visibleText: sanitizeText((raw as any).visibleText, '') || null,
    visibleReplyValidationStatus: closure?.status ?? 'unknown',
    nonHumanAuthoredStatus: sanitizeText((raw as any).nonHumanAuthoredStatus, '') || null,
    blockedReasons: normalizeVisibleReplyReasonCodes((raw as any).blockedReasons),
    reason: sanitizeText((raw as any).reason, '') || null,
    critic: normalizeVisibleReplyPublicCriticSummary((raw as any).critic),
    closure,
  }
}

function mergeVisibleReplyRealizationTelemetry(input: {
  primary?: unknown
  payload?: unknown
  structured?: unknown
  pending?: unknown
}): PendingVisibleReplyRealizationTelemetry | null {
  const primary = normalizeVisibleReplyRealizationTelemetry(input.primary)
  const payload = normalizeVisibleReplyRealizationTelemetry(input.payload)
  const structured = normalizeVisibleReplyRealizationTelemetry(input.structured)
  const pending = normalizeVisibleReplyRealizationTelemetry(input.pending)
  const sources = [primary, payload, structured, pending]
    .filter((source): source is PendingVisibleReplyRealizationTelemetry => Boolean(source))
  if (sources.length === 0)
    return null

  const base = primary ?? payload ?? structured ?? pending!
  const closure = sources.find(source => source.closure?.status === 'blocked')?.closure
    ?? sources.find(source => source.closure?.status === 'approved')?.closure
    ?? null
  const blockedReasons = sources.find(source => source.blockedReasons.length > 0)?.blockedReasons ?? []

  return {
    ...base,
    expectedAuthority:
      primary?.expectedAuthority
      ?? payload?.expectedAuthority
      ?? structured?.expectedAuthority
      ?? pending?.expectedAuthority
      ?? null,
    actualAuthority:
      primary?.actualAuthority
      ?? payload?.actualAuthority
      ?? structured?.actualAuthority
      ?? pending?.actualAuthority
      ?? null,
    providerMindExecuted:
      primary?.providerMindExecuted
      ?? payload?.providerMindExecuted
      ?? structured?.providerMindExecuted
      ?? pending?.providerMindExecuted
      ?? null,
    mode: primary?.mode ?? payload?.mode ?? structured?.mode ?? pending?.mode ?? null,
    visibleText:
      primary?.visibleText
      ?? payload?.visibleText
      ?? structured?.visibleText
      ?? pending?.visibleText
      ?? null,
    visibleReplyValidationStatus: closure?.status ?? 'unknown',
    nonHumanAuthoredStatus:
      primary?.nonHumanAuthoredStatus
      ?? payload?.nonHumanAuthoredStatus
      ?? structured?.nonHumanAuthoredStatus
      ?? pending?.nonHumanAuthoredStatus
      ?? null,
    blockedReasons: [...blockedReasons],
    reason: primary?.reason ?? payload?.reason ?? structured?.reason ?? pending?.reason ?? null,
    critic: primary?.critic ?? payload?.critic ?? structured?.critic ?? pending?.critic ?? null,
    closure,
  }
}

export const runtimeTestInternals = {
  normalizeVisibleReplyRealizationTelemetry,
  getProactiveLoopStateCache: (cache: unknown, cardId: string) => {
    if (!(cache instanceof Map))
      return undefined
    return cache.get(cardId)
  },
  getPendingProactiveDeliverySnapshot: (runtime: { peekLatestPendingProactiveDelivery?: (cardId: string) => unknown } | null | undefined, cardId: string) => {
    return runtime?.peekLatestPendingProactiveDelivery?.(cardId) ?? null
  },
  currentDialogueDeliveryRuntime: null as {
    clearAllState?: () => void
    peekLatestPendingProactiveDelivery?: (cardId: string) => unknown
  } | null,
  currentExecutionCallbackRuntime: null as {
    buildPendingExecutionCallbackContext?: (input: { sessionId: string, consume?: boolean }) => Promise<unknown>
    peekSurfacedCursor?: (sessionId: string) => number
  } | null,
  currentDesktopInspectScene: null as ((input: AlicizationLocalDesktopInspectSceneInput) => Promise<unknown>) | null,
  currentProactiveLoopStateByCard: null as Map<string, unknown> | null,
  currentEnsureProactiveLoopState: null as ((
    cardId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>) | null,
}

function normalizePersistedConversationTurnStructure(input: {
  structured?: Record<string, unknown> | null
}) {
  if (!input.structured || typeof input.structured !== 'object')
    return input.structured ?? null

  const structured = { ...input.structured }
  delete structured.memoryEvidence

  if (!Object.prototype.hasOwnProperty.call(input.structured, 'visibleReplyRealization'))
    return structured

  const realization = normalizeVisibleReplyRealizationTelemetry(
    input.structured.visibleReplyRealization,
  )
  if (!realization) {
    structured.visibleReplyRealization = null
    return structured
  }

  structured.visibleReplyRealization = realization

  return structured
}

export async function setupAlicizationRuntime(options?: AlicizationRuntimeSetupOptions) {
  const userDataPath = options?.userDataPathOverride ?? app.getPath('userData')
  const backgroundMaintenanceEnabled = options?.backgroundMaintenanceEnabled ?? !options?.userDataPathOverride
  const runtimeDebugLogEnabled = options?.runtimeDebugLogEnabled ?? !options?.userDataPathOverride
  const resolveCardPaths = (cardId: string) => {
    const soulRoot = join(userDataPath, 'alicizations', 'cards', cardId)
    return {
      soulRoot,
      soulPath: join(soulRoot, 'SOUL.md'),
      legacyPromptProfilePath: join(soulRoot, 'prompt-profile.json'),
      legacySparkProfilePath: join(soulRoot, 'spark-profile.json'),
    }
  }
  let activeCardId = defaultAlicizationCardId
  let { soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId)
  let activeProviderId = ''
  let activeModelId = ''
  let providerCredentials: Record<string, Record<string, unknown>> = {}
  let memoryTrialProvider: AlicizationMemoryTrialProvider | null = null
  const personaTrainingConfigPath = join(userDataPath, 'alicizations', 'persona-training-config.json')
  let personaTrainingExecutorConfig: AlicizationPersonaTrainingExecutorConfig | null = null
  let personaTrainingExecutorConfigError: string | null = null
  const clonePersonaTrainingExecutorConfig = (config: AlicizationPersonaTrainingExecutorConfig | null) => config
    ? { ...config }
    : null
  const personaTrainingExecutorConfigState = () => ({
    configured: personaTrainingExecutorConfig != null,
    config: clonePersonaTrainingExecutorConfig(personaTrainingExecutorConfig),
    error: personaTrainingExecutorConfigError,
  })
  const restorePersonaTrainingExecutorConfig = async () => {
    try {
      const raw = await readFile(personaTrainingConfigPath, 'utf8')
      personaTrainingExecutorConfig = normalizePersonaTrainingProcessConfig(JSON.parse(raw))
      personaTrainingExecutorConfigError = null
    }
    catch (error) {
      personaTrainingExecutorConfig = null
      personaTrainingExecutorConfigError = (error as NodeJS.ErrnoException)?.code === 'ENOENT'
        ? null
        : errorMessageFrom(error) ?? String(error)
    }
  }
  const persistPersonaTrainingExecutorConfig = async (rawConfig: AlicizationPersonaTrainingExecutorConfig | null) => {
    if (!rawConfig) {
      personaTrainingExecutorConfig = null
      personaTrainingExecutorConfigError = null
      await unlink(personaTrainingConfigPath).catch(() => {})
      return personaTrainingExecutorConfigState()
    }
    const normalized = normalizePersonaTrainingProcessConfig(rawConfig)
    await mkdir(join(userDataPath, 'alicizations'), { recursive: true })
    await writeFile(personaTrainingConfigPath, JSON.stringify(normalized, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    })
    personaTrainingExecutorConfig = normalized
    personaTrainingExecutorConfigError = null
    return personaTrainingExecutorConfigState()
  }
  const createLocalPersonaTrainingExecutor = (cardRootDir: string) => {
    const executor = createPersonaTrainingProcessExecutor({
      cardsRootDir: join(userDataPath, 'alicizations', 'cards'),
      cardRootDir,
    })
    return async (input: Parameters<typeof executor.execute>[0]) => {
      if (!input.configSnapshot)
        throw new Error('persona training executor is not configured')
      return await executor.execute(input, input.configSnapshot)
    }
  }
  await restorePersonaTrainingExecutorConfig()
  const resolveLongTermMemoryEmbeddingProvider = () => resolveOpenAICompatibleLongTermMemoryEmbeddingProvider({
    activeProviderId,
    providerCredentials,
  })
  let alicizationDb = await setupAlicizationDb(userDataPath, {
    cardId: activeCardId,
    resolveEmbeddingProvider: resolveLongTermMemoryEmbeddingProvider,
    resolveMemoryTrialProvider: () => memoryTrialProvider,
    personaTrainingExecutor: createLocalPersonaTrainingExecutor(soulRoot),
    resolvePersonaTrainingExecutorConfig: () => clonePersonaTrainingExecutorConfig(personaTrainingExecutorConfig),
  })
  const runtimeToolRegistry = createCanonicalToolRegistry()
  const runtimeSkillRegistry = createAlicizationSkillRegistry()
  const runtimeSkillsDirectory = join(userDataPath, 'alicizations', 'skills')
  await mkdir(runtimeSkillsDirectory, { recursive: true })
  const runtimeSkillLoader: AlicizationSkillLoader = createAlicizationSkillLoader({
    skillsDirectory: runtimeSkillsDirectory,
    skillRegistry: runtimeSkillRegistry,
    toolRegistry: runtimeToolRegistry,
    projection: {
      scope: 'turn',
      executionChannel: 'skill',
      timeoutMs: 30_000,
      supportsProgress: true,
      supportsCancellation: true,
      idempotency: 'best-effort',
      providerToolName: skill => `skill_${skill.id.replaceAll('.', '_')}`,
      adapterToolName: skill => `skill_adapter_${skill.id.replaceAll('.', '_')}`,
    },
    availableTools: runtimeToolRegistry.list().map(manifest => manifest.capabilityId),
    availablePermissions: [
      'memory.read',
      'memory.write',
      'workspace.read',
      'workspace.write',
      'mcp.invoke',
      'execution.invoke',
    ],
    onAudit: async (event) => {
      await alicizationDb.appendAuditLog({
        level: event.action === 'revoke' ? 'warning' : 'info',
        category: 'alicization.skill',
        action: event.action,
        message: `${event.id}@${event.version} ${event.previousActivationStatus} -> ${event.activationStatus}`,
        payload: { ...event },
        createdAt: event.occurredAt,
      })
    },
  })
  try {
    await runtimeSkillLoader.projectProduction()
  }
  catch (error) {
    await alicizationDb.appendAuditLog({
      level: 'warning',
      category: 'alicization.skill',
      action: 'projection-failed',
      message: errorMessageFrom(error) ?? String(error),
      payload: {
        skillsDirectory: runtimeSkillsDirectory,
      },
      createdAt: Date.now(),
    }).catch(() => {})
  }
  const localRuntimeUserId = await resolveAlicizationLocalRuntimeUserId({
    getMetaValue: key => alicizationDb.getMetaValue(key),
    setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
  })
  const taskThreadOrchestrator = createTaskThreadOrchestrator()

  const { context } = createContext(ipcMain)

  const scopeLifecycleQueueState = {
    queue: Promise.resolve<unknown>(undefined),
  }
  let cardScopeOrchestrator: ReturnType<typeof createAlicizationRuntimeCardScopeOrchestrator> | null = null
  const soulLifecycleState = {
    revision: 0,
    watching: false,
    soulSnapshot: null as AlicizationSoulSnapshot | null,
    queuedWrite: Promise.resolve<AlicizationSoulSnapshot | void>(undefined),
    soulWatchTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    soulWatcher: undefined as import('node:fs').FSWatcher | undefined,
    muteWatchUntil: 0,
  }
  let pruneTimer: ReturnType<typeof setInterval> | undefined
  let subconsciousTimer: ReturnType<typeof setInterval> | undefined
  let reminderDueTimer: ReturnType<typeof setTimeout> | undefined
  let dreamTimer: ReturnType<typeof setInterval> | undefined
  let backgroundMaintenanceStartupTimer: ReturnType<typeof setTimeout> | undefined
  let backgroundMaintenanceStarted = false
  const turnWriteAbortControllers = new Map<string, AbortController>()
  const activeSessionIdByCard = new Map<string, string>()
  const subconsciousStateByCard = new Map<string, SubconsciousCardState>()
  const proactiveLoopStateByCard = new Map<string, AlicizationProactiveLoopState>()
  runtimeTestInternals.currentProactiveLoopStateByCard = proactiveLoopStateByCard
  const perceptionStateByCard = new Map<string, AlicizationPerceptionState>()
  const visualPresenceStateByCard = new Map<string, AlicizationVisualPresenceStateSnapshot>()
  const visualPresenceCapturePersistMetaByCard = new Map<string, {
    fingerprint: string
    persistedAt: number
  }>()
  const screenSemanticCacheByCard = new Map<string, ScreenSemanticCacheState>()
  const pendingDurabilityPulseByCard = new Map<string, AlicizationDurabilityPulseSnapshot>()
  const foregroundProbeTimeoutStreakByPid = new Map<number, number>()
  let soulLifecycleRuntime: ReturnType<typeof createAlicizationRuntimeSoulLifecycle> | null = null
  const snapshotFromContent = (content: string) => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    return soulLifecycleRuntime.snapshotFromContent(content)
  }
  const stopWatch = () => {
    if (!soulLifecycleRuntime)
      return
    soulLifecycleRuntime.stopWatch()
  }
  const ensureWatchState = async () => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    await soulLifecycleRuntime.ensureWatchState()
  }
  const bootstrap = async () => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    return await soulLifecycleRuntime.bootstrap()
  }
  async function withCardScope<T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) {
    if (!cardScopeOrchestrator)
      throw new Error('Card scope orchestrator is not initialized yet.')
    return await cardScopeOrchestrator.withCardScope(nextCardIdRaw, task, options)
  }
  const queueSoulMutation = async (task: (current: AlicizationSoulSnapshot) => Promise<AlicizationSoulSnapshot>) => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    return await soulLifecycleRuntime.queueSoulMutation(task)
  }
  const initializeGenesis = async (input: AlicizationGenesisInput) => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    return await soulLifecycleRuntime.initializeGenesis(input)
  }
  const desktopCaptureAccessRuntime = createDesktopCaptureAccessRuntime({
    getSources: async options => await desktopCapturer.getSources(options),
    getScreenPermissionStatus: () => {
      if (platform !== 'darwin')
        return undefined

      try {
        return systemPreferences.getMediaAccessStatus('screen')
      }
      catch {
        return undefined
      }
    },
  })
  let sensoryBus!: ReturnType<typeof createAlicizationSensoryBus>
  const chatRuns = new Map<string, ChatRunState>()
  const mainGatewayWorkCoordinator = createAlicizationMainGatewayWorkCoordinator()
  const chatRunSessionTraceGetters = new Map<string, () => AlicizationRuntimeCallChainSnapshot>()
  const recentlyFinishedChatRuns = new Map<string, number>()
  let redactStaleInspectionHistoryMessagesForChat = (
    messages: AlicizationChatStartPayload['messages'],
    _latestUserText: string,
  ) => messages
  const chatStreamRuntime = createAlicizationChatStreamRuntime({
    normalizeTransportMessageContent,
    sanitizeText,
    redactStaleInspectionHistoryMessages: (messages, latestUserText) =>
      redactStaleInspectionHistoryMessagesForChat(messages, latestUserText),
    dispatchChannel: alicizationChatStreamDispatchChannel,
    emitContextEvent: (event, body, options) => {
      if (options) {
        context.emit(event as never, body as never, options as never)
        return
      }
      context.emit(event as never, body as never)
    },
    metaEvent: alicizationChatStreamMeta,
    chunkEvent: alicizationChatStreamChunk,
    toolCallEvent: alicizationChatStreamToolCall,
    toolProgressEvent: alicizationChatStreamToolProgress,
    toolResultEvent: alicizationChatStreamToolResult,
    finishEvent: alicizationChatStreamFinish,
    errorEvent: alicizationChatStreamError,
    queueScopedAuditLog,
    appendRuntimeDebugLine,
  })
  const {
    resolveChatMessages,
    toAlicizationChatStreamDispatchPayload,
    emitChatStreamEventForState,
  } = chatStreamRuntime
  const deliverDialogueResponded = (payload: AlicizationDialogueRespondedPayload) => {
    context.emit(alicizationDialogueResponded, payload)

    const dispatchPayload = toAlicizationChatStreamDispatchPayload('dialogue-responded', payload)
    const dispatchedSenderIds = new Set<number>()
    const allWebContents = webContents.getAllWebContents()
    for (const target of allWebContents) {
      if (target.isDestroyed())
        continue
      try {
        target.send(alicizationChatStreamDispatchChannel, dispatchPayload)
        dispatchedSenderIds.add(target.id)
      }
      catch (error) {
        void appendRuntimeDebugLine('dialogue-dispatch.failed', {
          cardId: payload.cardId,
          sessionId: payload.sessionId,
          turnId: payload.turnId,
          senderId: target.id,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (dispatchedSenderIds.size === 0) {
      void appendRuntimeDebugLine('dialogue-dispatch.skipped', {
        cardId: payload.cardId,
        sessionId: payload.sessionId,
        turnId: payload.turnId,
        reason: 'no-renderer',
      })
    }
  }
  const cardScopeStateRuntime = createAlicizationRuntimeCardScopeState({
    now: () => Date.now(),
    userDataPath,
    activeCardIdRef: () => activeCardId,
    normalizeCardId,
    getMetaValue: key => alicizationDb.getMetaValue(key),
    setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
    getLatestConversationSessionId: async () => await alicizationDb.getLatestConversationSessionId().catch(() => undefined),
    appendAuditLog: async (input, cardId) => await appendAuditLog(input, cardId),
    getAlicizationKillSwitchSnapshot,
    getAlicizationCardKillSwitchSnapshot,
    setAlicizationCardKillSwitchState,
    activeSessionIdByCard,
    subconsciousStateByCard,
    proactiveLoopStateByCard,
    visualPresenceStateByCard,
    readdir,
    activeSessionMetaKey: alicizationCardActiveSessionMetaKey,
    scopedKillSwitchMetaKey: alicizationCardKillSwitchMetaKey,
  })
  const normalizeSessionId = cardScopeStateRuntime.normalizeSessionId
  const getScopedKillSwitchSnapshot = (cardId = activeCardId) => cardScopeStateRuntime.getScopedKillSwitchSnapshot(cardId)
  const persistScopedKillSwitch = cardScopeStateRuntime.persistScopedKillSwitch
  const persistActiveSessionId = cardScopeStateRuntime.persistActiveSessionId
  const restoreActiveSessionId = cardScopeStateRuntime.restoreActiveSessionId
  const ensureActiveOrLatestSessionId = cardScopeStateRuntime.ensureActiveOrLatestSessionId
  const listKnownCardIds = cardScopeStateRuntime.listKnownCardIds
  const restoreScopedKillSwitch = cardScopeStateRuntime.restoreScopedKillSwitch
  const dialogueDeliveryRuntime = createAlicizationRuntimeDialogueDelivery({
    normalizeCardId,
    normalizeSessionId,
    sanitizeText,
    getActiveCardId: () => activeCardId,
    getActiveSessionIdForCard: cardId => activeSessionIdByCard.get(normalizeCardId(cardId)) ?? '',
    withCardScope,
    appendRuntimeDebugLine,
    deliverDialogueResponded,
    alicizationDb,
    dialogueAckStateMetaKey: alicizationDialogueAckStateMetaKey,
    dialogueReplyFeedbackAckMetaKey: alicizationDialogueReplyFeedbackAckMetaKey,
    dialogueDeliveryRetryBaseMs,
    dialogueDeliveryRetryMaxMs,
    dialogueDeliveryRetryMaxAttempts,
  })
  runtimeTestInternals.currentDialogueDeliveryRuntime = dialogueDeliveryRuntime
  const {
    getDialogueAckCursor,
    restoreDialogueAckMap,
    ensureDialogueReplyFeedbackAck,
    persistDialogueReplyFeedbackAck,
    emitDialogueRespondedWithDelivery,
    ackDialogueDelivery,
    clearPendingDialogueDeliveriesByCard,
    clearAllPendingDialogueDeliveries,
  } = dialogueDeliveryRuntime
  const mainChatRunState = createAlicizationMainChatRunStateController({
    runs: chatRuns,
    sessionTraceGetters: chatRunSessionTraceGetters,
    recentlyFinishedRuns: recentlyFinishedChatRuns,
    finishedRetentionMs: chatRunFinishedRetentionMs,
    normalizeCardId,
    appendRuntimeDebugLine,
    emitFinishEvent: (state, payload) => emitChatStreamEventForState(state, 'finish', payload),
  })
  const pendingMindTraceTelemetryByTurnId = new Map<string, {
    memoryTrace: AlicizationMindTraceMemorySnapshot | null
    visibleReplyRealization?: PendingVisibleReplyRealizationTelemetry | null
  }>()

  function buildMindTraceMemorySnapshotFromPrepared(
    prepared: AlicizationPreparedMainChatExecutionResult,
  ): AlicizationMindTraceMemorySnapshot | null {
    const context = prepared.organicMemoryContext ?? null
    const deliberation = context?.memoryDeliberation ?? null
    if (!deliberation)
      return null

    const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
      deliberation,
      speech: context?.recollectionSpeechPlan ?? null,
      recollectionIntent: context?.recollectionIntent ?? null,
      knowledgeEvidence: context?.knowledgeEvidence ?? null,
      hostPersonModel: context?.hostPersonModel ?? null,
    })
    const personStateProjection = prepared.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection ?? null
    const personalityContinuityState = personStateProjection?.personalityContinuityState
      ?? prepared.runtimeSurface.digitalLifeRuntimeSurface?.memory.personalityContinuityState
      ?? null

    return {
      shouldRecall: deliberation.shouldRecall,
      surfacePolicy: deliberation.surfacePolicy,
      confidence: deliberation.confidence,
      whyNow: deliberation.whyNow,
      inwardLine: deliberation.inwardLine,
      visibleLine: null,
      ambiguityPosture: deliberation.ambiguityPosture ?? 'settled',
      withheldReasons: deliberationKernel?.restraint.withheldReasons ?? [],
      shouldStayInward: deliberationKernel?.shouldStayInward ?? false,
      restraintSurfaceMode: deliberationKernel?.restraint.surfaceMode ?? null,
      restraintProvenanceMode: deliberationKernel?.restraint.provenanceMode ?? null,
      shouldOnlySurfaceStableCore: deliberationKernel?.restraint.shouldOnlySurfaceStableCore ?? false,
      shouldLabelProvenance: deliberationKernel?.restraint.shouldLabelProvenance ?? false,
      shouldLabelHypothesis: deliberationKernel?.restraint.shouldLabelHypothesis ?? false,
      shouldSuppressSpecificity: deliberationKernel?.restraint.shouldSuppressSpecificity ?? false,
      shouldDelayUntilAfterPayoff: deliberationKernel?.restraint.shouldDelayUntilAfterPayoff ?? false,
      memoryControl: deliberationKernel?.memoryControl ?? null,
      activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
      activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
      relationshipPosture: personStateProjection?.relationshipPosture ?? null,
      personalityCurrentRegime: personalityContinuityState?.currentRegime ?? null,
      personalityRepairPosture: personalityContinuityState?.repairPosture ?? null,
      recollectionIntentMode: context?.recollectionIntent?.mode ?? null,
      recollectionIntentTemporalFocus: context?.recollectionIntent?.temporalFocus ?? null,
      speechShouldSurface: context?.recollectionSpeechPlan?.shouldSurface ?? null,
      speechSurfaceMode: context?.recollectionSpeechPlan?.surfaceMode ?? null,
      speechPlacement: context?.recollectionSpeechPlan?.placement ?? null,
      knowledgeValidationCount: context?.knowledgeEvidence?.validationCount ?? 0,
      knowledgeContradictionCount: context?.knowledgeEvidence?.contradictionCount ?? 0,
      stronglyValidatedProcedureCount: context?.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0,
      contradictionHeavyFactCount: context?.knowledgeEvidence?.contradictionHeavyFactCount ?? 0,
      selectedEras: deliberation.selectedEras.map(item => ({
        id: item.id,
        facet: item.facet,
        summary: item.summary,
      })),
      selectedPeriods: deliberation.selectedPeriods.map(item => ({
        id: item.id,
        kind: item.kind,
        summary: item.summary,
      })),
      selectedEpisodes: deliberation.selectedEpisodes.map(item => ({
        id: item.id,
        summary: item.summary,
        provenance: item.provenance,
        reconsolidatedFromTraceId: item.reconsolidatedFromTraceId ?? null,
      })),
      conflictSeverity: deliberation.conflictSeverity ?? 'none',
      conflictVariants: (deliberation.conflictVariants ?? []).map(item => ({
        id: item.id,
        summary: item.summary,
        provenance: item.provenance,
        reason: item.reason ?? null,
      })),
      stableCore: [...(deliberation.stableCore ?? [])],
      unsafeDetails: [...(deliberation.unsafeDetails ?? [])],
      selectedProcedures: deliberation.selectedProcedures.map(item => ({
        id: item.id,
        label: item.label,
        approach: item.approach,
      })),
      selectedBundles: deliberation.selectedBundles.map(item => ({
        id: item.id,
        summary: item.summary,
        rationale: item.rationale,
        confidence: item.confidence,
        relationshipLine: item.relationshipLine ?? null,
      })),
      selectedChains: deliberation.selectedChains.map(item => ({
        id: item.id,
        kind: item.kind,
        summary: item.summary,
        rationale: item.rationale,
        confidence: item.confidence,
        currentStance: item.currentStance ?? null,
        answerPosture: item.answerPosture ?? null,
      })),
      selectedSituations: (context?.memorySituationCandidates?.selected ?? []).map(item => ({
        id: item.candidateId,
        kind: item.situationKind,
        summary: item.summary,
        evidenceSummary: item.evidenceSummary ?? null,
        statusReason: item.statusReason ?? null,
        sourceKinds: [...item.sourceKinds],
      })),
      selectedRelationshipLines: [...deliberation.selectedRelationshipLines],
      followUpAffordance: deliberation.followUpAffordance
        ? {
            summary: deliberation.followUpAffordance.summary,
            whyNow: deliberation.followUpAffordance.whyNow,
            intrusionRisk: deliberation.followUpAffordance.intrusionRisk,
            payoffDependency: deliberation.followUpAffordance.payoffDependency,
            preferredTiming: deliberation.followUpAffordance.preferredTiming,
          }
        : null,
      searchTrace: deliberation.searchTrace
        ? {
            firstHop: {
              focus: deliberation.searchTrace.firstHop.focus,
              summary: deliberation.searchTrace.firstHop.summary,
              targetIds: [...deliberation.searchTrace.firstHop.targetIds],
            },
            secondHop: {
              action: deliberation.searchTrace.secondHop.action,
              evidenceGap: deliberation.searchTrace.secondHop.evidenceGap,
              summary: deliberation.searchTrace.secondHop.summary,
              targetIds: [...deliberation.searchTrace.secondHop.targetIds],
            },
            thirdHop: {
              ambiguityPosture: deliberation.searchTrace.thirdHop.ambiguityPosture,
              summary: deliberation.searchTrace.thirdHop.summary,
            },
          }
        : null,
    }
  }

  function rememberPreparedMindTrace(input: {
    payload: AlicizationChatStartPayload
    prepared: AlicizationPreparedMainChatExecutionResult
  }) {
    const turnId = sanitizeText(input.payload.turnId, '')
    if (!turnId)
      return

    const memoryTrace = buildMindTraceMemorySnapshotFromPrepared(input.prepared)
    const surface = input.prepared.turnGraph?.surface ?? null
    const normalizedSurfaceRealization = normalizeVisibleReplyRealizationTelemetry(surface)
    const visibleReplyRealization: PendingVisibleReplyRealizationTelemetry | null = surface
      ? {
          ...(
            normalizedSurfaceRealization
            ?? normalizeVisibleReplyRealizationTelemetry({})!
          ),
          reason: normalizedSurfaceRealization?.reason ?? null,
        }
      : null

    if (!memoryTrace && !visibleReplyRealization) {
      pendingMindTraceTelemetryByTurnId.delete(turnId)
      return
    }

    const previous = pendingMindTraceTelemetryByTurnId.get(turnId) ?? null
    pendingMindTraceTelemetryByTurnId.set(turnId, {
      memoryTrace: memoryTrace ?? previous?.memoryTrace ?? null,
      visibleReplyRealization: visibleReplyRealization ?? previous?.visibleReplyRealization ?? null,
    })
    if (pendingMindTraceTelemetryByTurnId.size > 128) {
      const oldestKey = pendingMindTraceTelemetryByTurnId.keys().next().value
      if (typeof oldestKey === 'string')
        pendingMindTraceTelemetryByTurnId.delete(oldestKey)
    }
  }

  const {
    memoryLedgerRuntime,
    executionCallbackRuntime,
    memoryRetrievalTelemetryRuntime,
    getRecallFeedbackSummary: _getRecallFeedbackSummary,
    selfEvolutionRuntime,
  } = createAlicizationRuntimeSupportingRuntimesComposition({
    execution: {
      alicizationDb: {
        listExecutionEvents: input => alicizationDb.listExecutionEvents(input),
        listTaskThreads: input => alicizationDb.listTaskThreads(input),
      },
    },
    memoryFeedback: {
      now: () => Date.now(),
      activeCardId,
      summaryMetaKey: 'memory_recall_feedback_summary_v1',
      alicizationDb: {
        getMetaValue: key => alicizationDb.getMetaValue(key),
        setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
        listMemoryReflections: input => alicizationDb.listMemoryReflections(input),
      },
    },
    selfEvolution: {
      now: () => Date.now(),
      snapshotMetaKey: alicizationSelfEvolutionVersionRuntimeMetaKey,
      alicizationDb: {
        getMetaValue: key => alicizationDb.getMetaValue(key),
        setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
      },
    },
  })
  runtimeTestInternals.currentExecutionCallbackRuntime = executionCallbackRuntime
  const memoryRuntime = createAlicizationRuntimeMemoryRuntime({
    organicMemoryAccess: {
      getActiveCardId: () => activeCardId,
      getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
      bootstrap: async () => await bootstrap(),
      listActiveThoughts: async () => await alicizationDb.listActiveThoughts(),
      countSubconsciousFragments: async () => await alicizationDb.countSubconsciousFragments(),
      listRecentSubconsciousFragments: async limit => await alicizationDb.listRecentSubconsciousFragments(limit),
      getMetaValue: async key => await alicizationDb.getMetaValue(key),
      replaceActiveThoughts: async (items) => {
        await alicizationDb.replaceActiveThoughts(items)
      },
      setMetaValue: async (key, value) => await alicizationDb.setMetaValue(key, value),
      searchSubconsciousFragments: async (query, limit) => await alicizationDb.searchSubconsciousFragments(query, limit),
      listRecentEpisodicEvents: async limit => await alicizationDb.listRecentEpisodicEvents(limit),
      listMemoryConsolidations: async limit => await alicizationDb.listMemoryConsolidations(limit).catch(() => []),
      getLatestRelationshipDynamics: async () => await alicizationDb.getLatestRelationshipDynamics().catch(() => null),
      listRelationshipOutcomes: async input => await alicizationDb.listRelationshipOutcomes(input).catch(() => []),
      listMemoryReflections: async input => await alicizationDb.listMemoryReflections(input).catch(() => []),
      listPersonaReinforcementEvents: async input => await alicizationDb.listPersonaReinforcementEvents(input).catch(() => []),
      summarizePersonStateEvolution: async input => await alicizationDb.summarizePersonStateEvolution(input).catch(() => ({
        trustShift: 0,
        closenessShift: 0,
        repairShift: 0,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0,
        latestDoctrine: null,
        latestBurdenLine: null,
        latestTrustMeaning: null,
        latestDominantRung: null,
        recentSummaries: [],
        explanation: [],
        updatedAt: null,
      })),
      readMindHead: async <T>(cardId: string, key: 'person-state-update-surface') => await alicizationDb.readMindHead<T>(cardId, key).catch((): T | null => null),
      searchEpisodicEvents: async input => await alicizationDb.searchEpisodicEvents(input),
      searchMemoryConsolidations: async input => await alicizationDb.searchMemoryConsolidations?.(input) ?? [],
      listConversationTurnsBySession: async (sessionId, options) => await alicizationDb.listConversationTurnsBySession(sessionId, options),
      getLatestLearningExecutionState: async cardId => await alicizationDb.getLatestLearningExecutionState(cardId).catch(() => null),
      recordMemoryCacheAccess: async hit => await memoryRetrievalTelemetryRuntime.recordCacheAccess(hit),
      recordMemoryPrewarmAccess: async hit => await memoryRetrievalTelemetryRuntime.recordPrewarmAccess(hit),
      recordMemoryBudgetClass: async budgetClass => await memoryRetrievalTelemetryRuntime.recordBudgetClass(budgetClass),
      recordMemoryHotKeyOutcome: async input => await memoryRetrievalTelemetryRuntime.recordHotKeyOutcome(input),
      getMemoryRetrievalTelemetry: async () => await memoryRetrievalTelemetryRuntime.getTelemetry(),
      getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
      getActiveSelfEvolutionCandidateId: async () => (await selfEvolutionRuntime.getActiveCandidate())?.id ?? null,
    },
    organicMemorySearch: {
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getLatestRelationshipDynamics: async () => await alicizationDb.getLatestRelationshipDynamics().catch(() => null),
      listMindTurnEvents: input => alicizationDb.listMindTurnEvents(input),
      retrieveMemoryFacts: async (recallSeed, limit) => await alicizationDb.retrieveMemoryFacts(recallSeed, limit).catch(() => []),
      planRecollectionIntent: async input => await generateMemoryRecollectionIntentWithMemoryOsGateway({
        ...input,
        generateMainGatewayText: memoryGatewayTextProvider,
        cardId: activeCardId,
      }),
      planMemoryRecollection: async input => await generateMemoryRecollectionPlanWithMemoryOsGateway({
        ...input,
        generateMainGatewayText: memoryGatewayTextProvider,
        cardId: activeCardId,
      }),
      planRecollectionSpeech: async input => await generateMemoryRecollectionSpeechPlanWithMemoryOsGateway({
        ...input,
        generateMainGatewayText: memoryGatewayTextProvider,
        cardId: activeCardId,
      }),
      planMemoryDeliberation: async input => await generateMemoryDeliberationWithMemoryOsGateway({
        ...input,
        generateMainGatewayText: memoryGatewayTextProvider,
        cardId: activeCardId,
      }),
      isPersonaResidueMemoryText,
      recordMemoryCandidateGenerationLatency: async (latencyMs: number) => await memoryRetrievalTelemetryRuntime.recordCandidateGenerationLatency(latencyMs),
      recordMemoryPlannerLatency: async (latencyMs: number) => await memoryRetrievalTelemetryRuntime.recordPlannerLatency(latencyMs),
      recordMemorySpeechPlanLatency: async (latencyMs: number) => await memoryRetrievalTelemetryRuntime.recordSpeechPlanLatency(latencyMs),
      recordOrganicMemoryStageLatency: async input => await memoryRetrievalTelemetryRuntime.recordOrganicStageLatency(input),
      recordOrganicMemoryStageBudget: async input => await memoryRetrievalTelemetryRuntime.recordOrganicStageBudget(input),
    },
    memoryReconsolidation: {
      sanitizeMindGovernanceDecisionTraceId,
      sanitizeText,
      errorMessageFrom,
      appendAuditLog,
      alicizationDb: {
        listMindTurnEvents: input => alicizationDb.listMindTurnEvents(input),
        searchEpisodicEvents: input => alicizationDb.searchEpisodicEvents(input),
        appendMindTurnEvents: events => alicizationDb.appendMindTurnEvents(events),
      },
    },
  })
  const {
    getOrganicMemorySnapshot,
    getPerformanceManifest,
    setPerformanceManifest,
    searchOrganicSubconsciousFragments,
    buildHostPersonModel,
    buildProactiveRecallSeed,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    resolveOrganicMemoryPromptContext: resolveBaseOrganicMemoryPromptContext,
  } = memoryRuntime
  const resolveOrganicMemoryPromptContext = resolveBaseOrganicMemoryPromptContext
  const {
    executeLearningTask: _executeLearningTask,
    learningActionScheduler,
    memoryClosureRuntime,
  } = createAlicizationRuntimeMemorySupportingComposition({
    learning: {
      now: () => Date.now(),
      activeCardId,
      randomUUID,
      getActiveCardId: () => activeCardId,
      appendAuditLog,
      alicizationDb: {
        listMemoryFacts: () => alicizationDb.listMemoryFacts(),
        listMemoryReflections: input => alicizationDb.listMemoryReflections(input),
        listRelationshipOutcomes: input => alicizationDb.listRelationshipOutcomes(input),
        upsertMemoryReflections: entries => alicizationDb.upsertMemoryReflections(entries),
        applyMemoryFactCorrections: corrections => alicizationDb.applyMemoryFactCorrections(corrections),
        upsertMemoryFacts: (facts, source) => alicizationDb.upsertMemoryFacts(facts, source),
        appendMindTurnEvents: events => alicizationDb.appendMindTurnEvents(events),
        insertLearningTask: (input, writeOptions) => alicizationDb.insertLearningTask(input, writeOptions),
        claimDueLearningTasks: (cardId, nowMs, limit) => alicizationDb.claimDueLearningTasks(cardId, nowMs, limit),
        startLearningTask: (taskId, startedAt) => alicizationDb.startLearningTask(taskId, startedAt),
        blockLearningTask: (taskId, input, updatedAt) => alicizationDb.blockLearningTask(taskId, input, updatedAt),
        completeLearningTask: (taskId, input, completedAt) => alicizationDb.completeLearningTask(taskId, input, completedAt),
        failLearningTask: (taskId, input, updatedAt) => alicizationDb.failLearningTask(taskId, input, updatedAt),
        reopenLearningTask: (taskId, input, updatedAt) => alicizationDb.reopenLearningTask(taskId, input, updatedAt),
        downgradeLearningTask: (taskId, input, updatedAt) => alicizationDb.downgradeLearningTask(taskId, input, updatedAt),
        cancelLearningTask: (taskId, input, updatedAt) => alicizationDb.cancelLearningTask(taskId, input, updatedAt),
        listLearningTasks: input => alicizationDb.listLearningTasks(input),
      },
      assimilateMemoryFactsDetailed: input => memoryRuntime.knowledgeAssimilationRuntime.assimilateMemoryFactsDetailed(input),
      recordLearningExecutionTelemetry: input => memoryRetrievalTelemetryRuntime.recordLearningExecution(input),
      proposeSelfEvolutionVersion: input => selfEvolutionRuntime.proposeVersion(input),
    },
    memoryClosure: {
      now: () => Date.now(),
      normalizeCardId,
      getActiveCardId: () => activeCardId,
      withCardScope,
      errorMessageFrom,
      ensureMindGovernanceDecisionTraceId: (raw, traceNow) => {
        const normalized = sanitizeMindGovernanceDecisionTraceId(raw)
        return normalized || `mind:${Math.max(0, Math.floor(traceNow ?? Date.now())).toString(36)}:${randomUUID().replace(/-/g, '').slice(0, 12)}`
      },
      appendAuditLog,
      knowledgeAssimilationRuntime: memoryRuntime.knowledgeAssimilationRuntime,
      alicizationDb: {
        appendRelationshipOutcomes: entries => alicizationDb.appendRelationshipOutcomes(entries),
        appendEpisodicEvents: events => alicizationDb.appendEpisodicEvents(events),
        persistEpisodicReconsolidations: events => alicizationDb.persistEpisodicReconsolidations(events),
        appendPersonaReinforcementEvents: events => alicizationDb.appendPersonaReinforcementEvents(events),
        appendPersonStateEvolutionEntries: entries => alicizationDb.appendPersonStateEvolutionEntries(entries),
        upsertMemoryReflections: reflections => alicizationDb.upsertMemoryReflections(reflections),
        upsertMemoryFacts: (facts, source) => alicizationDb.upsertMemoryFacts(facts, source),
        applyMemoryFactCorrections: corrections => alicizationDb.applyMemoryFactCorrections(corrections),
        listMemoryFacts: () => alicizationDb.listMemoryFacts(),
        readMindHead: (cardId, key) => alicizationDb.readMindHead(cardId, key),
        upsertMindHead: (cardId, key, value) => alicizationDb.upsertMindHead(cardId, key, value),
        appendMindTurnEvents: events => alicizationDb.appendMindTurnEvents(events),
      },
    },
  })
  const {
    sessionContinuityBuildersRuntime,
    visualPresenceStateRuntime,
  } = createAlicizationRuntimeContinuityPresenceComposition({
    sessionContinuity: {
      sanitizeText,
      sanitizeBriefText,
      sanitizeExecutionLedgerText,
      readTaskThreadActivityAt,
      terminalTaskThreadStatuses: alicizationTerminalTaskThreadStatuses,
      proactiveReplyWindowMs,
      proactiveImplicitIgnoredAfterMs,
      proactiveDismissCooldownMs,
      buildVisualPresenceCapturePersistFingerprint,
    },
    visualPresence: {
      now: () => Date.now(),
      normalizeCardId,
      getActiveCardId: () => activeCardId,
      withCardScope,
      alicizationDb: {
        getMetaValue: key => alicizationDb.getMetaValue(key),
        setMetaValue: (key, value, writeOptions) => alicizationDb.setMetaValue(key, value, writeOptions),
        upsertMindHead: (cardId, key, value, writeOptions) =>
          alicizationDb.upsertMindHead(cardId, key, value, writeOptions),
      },
      perceptionStateByCard,
      visualPresenceStateByCard,
      visualPresenceCapturePersistMetaByCard,
      createDefaultPerceptionState,
      normalizePerceptionState,
      createDefaultVisualPresenceState,
      normalizeVisualPresenceState,
      buildVisualPresenceCapturePersistFingerprint,
      emitVisualPresenceState,
      perceptionMetaKey: alicizationPerceptionStateMetaKey,
      visualPresenceMetaKey: alicizationVisualPresenceStateMetaKey,
    },
  })
  const persistPerceptionState = visualPresenceStateRuntime.persistPerceptionState
  const queuePerceptionStateMutation = visualPresenceStateRuntime.queuePerceptionStateMutation
  const ensurePerceptionState = visualPresenceStateRuntime.ensurePerceptionState
  const persistVisualPresenceState = visualPresenceStateRuntime.persistVisualPresenceState
  const ensureVisualPresenceState = visualPresenceStateRuntime.ensureVisualPresenceState
  const persistOutcomeClosure = memoryClosureRuntime.persistOutcomeClosure
  const persistPreparedMirrorAutobiographicalEpisodes = memoryClosureRuntime.persistPreparedMirrorAutobiographicalEpisodes
  const persistSessionMirrorAutobiographicalEpisodes = memoryClosureRuntime.persistSessionMirrorAutobiographicalEpisodes
  const {
    buildExecutionDeliveryAction,
    buildTaskThreadSessionMirrorAction,
    buildSceneResidueSessionMirrorAction,
    buildReminderContinuitySignal,
    buildReminderSessionMirrorAction,
    buildProactiveFeedbackSessionMirrorAction,
    buildProactiveOutcomeContinuitySignal,
    buildDeferredAutonomyContinuitySignal,
    buildPendingProactiveContinuitySignal,
    buildProactiveContinuitySignals,
    buildAutobiographicalAfterglowContinuitySignals,
    buildDialogueContinuitySignal,
    buildVisualPresenceContinuitySignal,
  } = sessionContinuityBuildersRuntime
  const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime()
  const agentRuntime = createAlicizationAgentRuntime({
    getSensorySnapshot: async () => sensoryBus.getSnapshot(),
    resolveConversationSessionId: async cardId => await ensureActiveOrLatestSessionId(cardId),
  })
  const dialogueSessionManager = createAlicizationDialogueSessionManager()
  const executorRuntime = createAlicizationExecutorRuntime({
    appendAuditLog,
    dispatchTaskThread: invocation => dispatchTaskThreadWithExecutionDelivery(invocation),
    ensureSessionId: ensureActiveOrLatestSessionId,
    getAlicizationDb: () => alicizationDb,
    getCardKillSwitchState: cardId => getAlicizationCardKillSwitchSnapshot(cardId).state,
    getGlobalKillSwitchState: () => getAlicizationKillSwitchSnapshot().state,
    normalizeSessionId,
    resolveLocalCapabilityChannels: async () => await localBrowserAutomation.resolveCapabilityChannels(),
    sanitizeText,
  })
  const mainGatewayConfigRuntime = createAlicizationMainGatewayConfigRuntime({
    sanitizeText,
    getActiveProviderId: () => activeProviderId,
    getActiveModelId: () => activeModelId,
    getProviderCredentials: () => providerCredentials,
  })
  const {
    normalizeProviderCredentialsMap,
    normalizeProviderConfig,
    rememberMainGatewayRoute,
    resolveMainGatewayConfig,
    ensureMainGatewayReachable,
    recordMainGatewayGenerationTimeout,
  } = mainGatewayConfigRuntime
  const cardPromptRuntime = createAlicizationCardPromptRuntime({
    getActiveCardId: () => activeCardId,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    resolveCardPaths,
    normalizeCardId,
    sanitizeText,
    appendRuntimeDebugLine,
  })
  const {
    resolveCardHostName,
    resolveCardPersonaKernel,
    buildMainRuntimeCorePromptBlocks,
    resolveCardCustomDirectives,
    buildMainGatewayAgentTurnId,
  } = cardPromptRuntime
  const agentSessionMirrorRuntime = createAlicizationAgentSessionMirrorRuntime({
    sanitizeText,
    sanitizeBriefText,
    normalizeCardId,
    normalizeSessionId,
    getActiveSessionIdByCard: cardId => activeSessionIdByCard.get(cardId),
    getLatestConversationSessionId: async () => await alicizationDb.getLatestConversationSessionId().catch(() => undefined),
    openAgentTurn: input => agentRuntime.openTurn(input),
    buildMainGatewayAgentTurnId,
    resolveAgentSessionContinuityContext: async cardId => await resolveAgentSessionContinuityContext(cardId),
    buildTaskThreadSessionMirrorAction,
    buildSceneResidueSessionMirrorAction,
    buildProactiveFeedbackSessionMirrorAction,
    buildProactiveOutcomeContinuitySignal,
    buildReminderSessionMirrorAction,
    dialogueSessionManager,
    persistAutobiographicalEpisodesFromSessionMirror: persistSessionMirrorAutobiographicalEpisodes,
  })
  const {
    buildAgentRuntimeAuditSnapshot,
    hydrateAgentTurnFromCurrentCardState,
    syncAgentTurnSessionMirror,
    syncSessionMirrorFromCurrentCardState,
  } = agentSessionMirrorRuntime
  const mainGatewayOneShotRuntime = createAlicizationMainGatewayOneShotRuntime({
    getActiveCardId: () => activeCardId,
    getActiveProviderId: () => activeProviderId,
    getActiveModelId: () => activeModelId,
    openAgentTurn: input => agentRuntime.openTurn(input),
    resolveMainGatewayConfig,
    rememberMainGatewayRoute,
    appendRuntimeDebugLine,
    resolveCardCustomDirectives,
    buildPendingExecutionCallbackContext: input => executionCallbackRuntime.buildPendingExecutionCallbackContext(input),
    resolveAgentSessionContinuityContext: async (cardId, input) => await resolveAgentSessionContinuityContext(cardId, input),
    getPerformanceManifest,
    syncAgentTurnSessionMirror,
    appendAuditLog,
    describePerceptionTarget,
    buildMainGatewayAgentTurnId,
    screenSemanticCacheByCard,
    ensurePerceptionState,
    getUsablePerceptionSceneResidue,
    buildScreenSemanticSummaryFromResidue,
    clearDesktopCaptureAccessCache: () => desktopCaptureAccessRuntime.clear(),
    resolveDesktopCaptureAccess,
    getDesktopCaptureAccessRuntimeSnapshot: input => deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot(
      desktopCaptureAccessRuntime.getSnapshot(input),
    ),
    rememberSceneResidue,
    providerWorkCoordinator: mainGatewayWorkCoordinator,
  })
  const {
    buildScreenSemanticSceneResidue,
    generateScreenSemanticSummaryFromImage,
    generateMainGatewayText,
    resolveProactiveScreenSemanticSummary,
  } = mainGatewayOneShotRuntime
  const mainGatewayTextProvider: AlicizationMainGatewayTextProvider = generateMainGatewayText
  memoryTrialProvider = {
    generate: async (input) => {
      const startedAt = Date.now()
      let failureReason: string | null = null
      let providerResult: {
        providerId: string
        modelId: string
        finishReason: string | null
        retryCount: number
        latencyMs: number
      } | null = null
      const resolvedRoute = resolveMainGatewayConfig({
        cardId: input.cardId,
      })
      const userMessage = [...input.messages].reverse().find(message => message.role === 'user')
      const text = await mainGatewayTextProvider({
        cardId: input.cardId,
        source: 'memory-quality-trial',
        system: '',
        extraSystemBlocks: [input.memoryContext.providerSystemBlock],
        user: userMessage?.content ?? '',
        timeoutMs: input.timeoutMs,
        abortSignal: input.signal,
        injectCustomDirectives: false,
        injectPerformanceManifest: false,
        captureAgentSensorySnapshot: false,
        onFailure: (failure) => {
          failureReason = failure.reason
        },
        onProviderResult: (result) => {
          providerResult = result
        },
      })
      if (!text)
        throw new Error(failureReason ?? 'memory quality trial Provider returned no reply')
      const trace = providerResult ?? {
        providerId: resolvedRoute?.providerId ?? 'unknown-provider',
        modelId: resolvedRoute?.model ?? 'unknown-model',
        finishReason: null,
        retryCount: 0,
        latencyMs: Date.now() - startedAt,
      }
      return {
        text,
        ...trace,
      }
    },
  }
  async function resolveMemoryGatewayDigitalLifeRuntimeSurface(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const readRuntimeSurface = async () => {
      const visualPresenceState = await ensureVisualPresenceState(cardId).catch(() => null)
      return visualPresenceState ? buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState) : null
    }

    if (cardId === activeCardId)
      return await readRuntimeSurface()

    return await withCardScope(cardId, readRuntimeSurface, {
      label: `memory-gateway-runtime-surface:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
  }
  const memoryGatewayTextProvider: AlicizationMemoryGatewayTextProvider = async (input) => {
    const explicitRuntimeSurface = input.digitalLifeRuntimeSurface ?? null
    const liveRuntimeSurface = explicitRuntimeSurface ?? await resolveMemoryGatewayDigitalLifeRuntimeSurface(input.cardId ?? activeCardId)
    return await mainGatewayTextProvider({
      ...input,
      extraSystemBlocks: input.extraSystemBlocks ? [...input.extraSystemBlocks] : undefined,
      digitalLifeRuntimeSurface: liveRuntimeSurface,
    })
  }
  const mainChatRuntime = createAlicizationRuntimeMainChatRuntime({
    context: {
      getActiveCardId: () => activeCardId,
      normalizeOrganicRecallText,
      readTransportContentAsText,
      emptyAlicizationExecutionCallbackContext,
      emptyAlicizationExecutionLedgerContext,
      ensureActiveOrLatestSessionId,
      buildPendingExecutionCallbackContext: input => executionCallbackRuntime.buildPendingExecutionCallbackContext(input),
      buildExecutionLedgerContext: input => memoryLedgerRuntime.buildExecutionLedgerContext(input),
      detectInvitedInspectionIntent,
    },
    inspection: {
      normalizeOrganicRecallText,
      readLatestAssistantMessageText: messages => mainChatRuntime.readLatestAssistantMessageText(messages as any),
      readTransportContentAsText,
    },
  })
  const {
    readLatestUserMessageText,
    readLatestAssistantMessageText,
    redactStaleInspectionHistoryMessages,
    buildDialogueIngressContext,
    resolveInspectionIntentForChatTurn,
  } = mainChatRuntime
  redactStaleInspectionHistoryMessagesForChat = redactStaleInspectionHistoryMessages
  const mindStateRuntime = createAlicizationMindStateRuntime({
    buildDialogueIngressContext,
    generateMainGatewayText: mainGatewayTextProvider,
    buildMainGatewayAgentTurnId,
    readLatestAssistantMessageText,
    readTransportContentAsText,
    retrieveMemoryFacts: async (query, limit) => await alicizationDb.retrieveMemoryFacts(query, limit).catch(() => []),
    listRelationshipOutcomes: async (cardId, limit) => await alicizationDb.listRelationshipOutcomes({ cardId, limit }).catch(() => []),
    listPersonaReinforcementEvents: async (cardId, limit) => await alicizationDb.listPersonaReinforcementEvents({ cardId, limit }).catch(() => []),
    listMemoryReflections: async (cardId, limit) => await alicizationDb.listMemoryReflections({ cardId, limit }).catch(() => []),
    listMemoryConsolidations: async limit => await alicizationDb.listMemoryConsolidations?.(limit).catch(() => []) ?? [],
    getPersonStateEvolutionSummary: async ({ cardId, limit }) => await alicizationDb.summarizePersonStateEvolution({ cardId, limit }).catch(() => null),
    readMindHead: async <T>(cardId: string, key: AlicizationMindHeadKey) => await alicizationDb.readMindHead<T>(cardId, key).catch((): T | null => null),
  })
  const {
    buildDigitalLifeMindState,
    buildMindAttentionSignature,
    buildMindSceneSignature,
  } = mindStateRuntime
  const bodyKernel = createAlicizationBodyKernel({ now: Date.now })

  function commitAlicizationDigitalLifeSpineWithBodyAuthority(input: {
    now: number
    previousState: AlicizationVisualPresenceStateSnapshot
    watchMode: AlicizationVisualPresenceStateSnapshot['watchMode']
    scene: AlicizationVisualPresenceStateSnapshot['currentScene']
    attention: AlicizationVisualPresenceStateSnapshot['attention']
    mindState: Awaited<ReturnType<typeof buildDigitalLifeMindState>>
    captureState: AlicizationVisualPresenceStateSnapshot['captureState']
    durabilityPulse: AlicizationDurabilityPulseSnapshot | null
    recentTransition: AlicizationVisualPresenceStateSnapshot['recentTransition']
    nextSuggestedProbeMs: number
    activeConversation: boolean
  }) {
    const committed = commitAlicizationDigitalLifeSpine({
      now: input.now,
      previousState: input.previousState,
      watchMode: input.watchMode,
      scene: input.scene,
      attention: input.attention,
      mindState: input.mindState,
      captureState: input.captureState,
      durabilityPulse: input.durabilityPulse,
      recentTransition: input.recentTransition,
      nextSuggestedProbeMs: input.nextSuggestedProbeMs,
    })
    const emotionalTransitionLedger = committed.current.runtimeSurface.memory?.derivedMindStateBundle?.emotionalTransitionLedger ?? null
    const emotionalKernelForDecay = committed.current.runtimeSurface.memory?.emotionalKernel
      ?? committed.current.runtimeSurface.memory?.derivedMindStateBundle?.emotionalKernel
      ?? committed.nextState.emotionalKernel
      ?? null
    const emotionalTransitionDecay = emotionalTransitionLedger
      ? resolveAlicizationEmotionalTransitionDecay({
          ledger: emotionalTransitionLedger,
          now: input.now,
          current: emotionalKernelForDecay,
        })
      : null
    const nextState = bodyKernel.applyToVisualPresenceState({
      now: input.now,
      previousState: input.previousState,
      candidateState: {
        ...committed.nextState,
        emotionalTransitionDecay,
      },
      activeConversation: input.activeConversation,
    })

    return {
      ...committed,
      nextState,
      current: deriveAlicizationDigitalLifeSpine(nextState),
    }
  }
  const replayBenchmarkRuntime = createAlicizationReplayBenchmarkRuntime({
    getAlicizationDb: () => alicizationDb,
    appendAuditLog,
    selfEvolutionRuntime,
  })
  const {
    probeForegroundPidLiveness,
    updateForegroundProbeTimeoutStreak,
    clearForegroundProbeTimeoutStreakForPid,
    sampleSubconsciousInterruptionContext,
  } = createAlicizationSubconsciousProbeRuntime({
    platform,
    getSystemIdleTime: () => powerMonitor.getSystemIdleTime(),
    getSensorySnapshot: () => sensoryBus.getSnapshot(),
    sanitizeText,
    errorMessageFrom,
    subconsciousInterruptionProbeTimeoutMs,
    foregroundProbeTimeoutStreakByPid,
  })
  const localBrowserAutomation = createAlicizationLocalBrowserAutomationService({
    errorMessageFrom,
  })
  const resolveDesktopInspectionBrowserName = (input: {
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    summary?: {
      workload?: {
        kind?: string
      } | null
    } | null
  }) => {
    if (input.summary?.workload?.kind !== 'browser') {
      const haystack = [
        sanitizeText(input.focusTarget?.appName, '') ?? '',
        sanitizeText(input.focusTarget?.processName, '') ?? '',
        sanitizeText(input.foregroundWindow?.appName, '') ?? '',
        sanitizeText(input.foregroundWindow?.processName, '') ?? '',
      ].join(' ').toLowerCase()
      if (!/\b(?:google chrome|chrome|safari)\b/u.test(haystack))
        return null
    }

    const haystack = [
      sanitizeText(input.focusTarget?.appName, '') ?? '',
      sanitizeText(input.focusTarget?.processName, '') ?? '',
      sanitizeText(input.foregroundWindow?.appName, '') ?? '',
      sanitizeText(input.foregroundWindow?.processName, '') ?? '',
    ].join(' ').toLowerCase()

    if (/\bsafari\b/u.test(haystack))
      return 'safari' as const
    if (/\b(?:google chrome|chrome)\b/u.test(haystack))
      return 'chrome' as const
    return null
  }
  const readDesktopInspectionBrowserPageContext = async (input: {
    abortSignal?: AbortSignal
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    summary?: {
      workload?: {
        kind?: string
      } | null
    } | null
  }) => {
    type DesktopInspectionBrowserPageContext = NonNullable<ReturnType<typeof buildAlicizationDesktopInspectionSceneSnapshot>['browserPageContext']>
    const normalizeBrowserScrollState = (raw: unknown) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null

      const record = raw as Record<string, unknown>
      return {
        offsetY: typeof record.offsetY === 'number' && Number.isFinite(record.offsetY) ? record.offsetY : null,
        viewportHeight: typeof record.viewportHeight === 'number' && Number.isFinite(record.viewportHeight) ? record.viewportHeight : null,
        documentHeight: typeof record.documentHeight === 'number' && Number.isFinite(record.documentHeight) ? record.documentHeight : null,
        canScrollDown: record.canScrollDown === true,
        canScrollUp: record.canScrollUp === true,
      }
    }

    const browser = resolveDesktopInspectionBrowserName(input)
    if (!browser)
      return null

    const [interactablesResult, textResult] = await Promise.all([
      localBrowserAutomation.readPage({
        abortSignal: input.abortSignal,
        browser,
        format: 'interactables',
      }).catch((error) => {
        if (input.abortSignal?.aborted || isAbortError(error))
          throw error
        return null
      }),
      localBrowserAutomation.readPage({
        abortSignal: input.abortSignal,
        browser,
        format: 'text',
        maxChars: 600,
      }).catch((error) => {
        if (input.abortSignal?.aborted || isAbortError(error))
          throw error
        return null
      }),
    ])

    const interactablesRecord = interactablesResult && typeof interactablesResult === 'object' && !Array.isArray(interactablesResult)
      ? interactablesResult as Record<string, unknown>
      : null
    const textRecord = textResult && typeof textResult === 'object' && !Array.isArray(textResult)
      ? textResult as Record<string, unknown>
      : null
    const interactables = Array.isArray(interactablesRecord?.interactables)
      ? interactablesRecord.interactables as DesktopInspectionBrowserPageContext['interactables']
      : []
    const url = sanitizeText(interactablesRecord?.url, '') || sanitizeText(textRecord?.url, '') || null
    const title = sanitizeText(interactablesRecord?.title, '') || sanitizeText(textRecord?.title, '') || null
    const textExcerpt = sanitizeText(textRecord?.content, '') || null
    const scrollState = normalizeBrowserScrollState(interactablesRecord?.scrollState)
      ?? normalizeBrowserScrollState(textRecord?.scrollState)

    if (interactables.length <= 0 && !url && !title && !textExcerpt)
      return null

    return {
      browser,
      interactables,
      scrollState,
      textExcerpt,
      title,
      url,
    }
  }
  const buildDesktopInspectionWorkflowTaskKey = (input: {
    browserPageContext?: {
      title?: string | null
      url?: string | null
    } | null
    question?: string | null
    targetPhase?: string | null
  }) => {
    return sanitizeText(
      input.question
      || input.browserPageContext?.title
      || input.browserPageContext?.url
      || '',
      '',
    )
    || sanitizeText(input.targetPhase, '')
    || ''
  }
  const desktopInspectScene = async (input: AlicizationLocalDesktopInspectSceneInput) => {
    const cardId = normalizeCardId(input.cardId ?? activeCardId)
    const question = typeof input.question === 'string'
      ? input.question.trim().replace(/\s+/g, ' ').slice(0, 240)
      : ''
    const goal = question
      ? `Inspect the current desktop scene for: ${question}`
      : 'Inspect the current desktop scene.'
    const now = Date.now()

    try {
      if (input.abortSignal?.aborted)
        throw input.abortSignal.reason ?? createAbortError('desktop-inspection-cancelled')

      if (input.forceRefresh === true)
        screenSemanticCacheByCard.delete(cardId)

      const snapshot = sensoryBus.getSnapshot()
      let perceptionState = await ensurePerceptionState(cardId)
      const interruptionContext = await sampleSubconsciousInterruptionContext()
      const resolvedForegroundWindow = resolveForegroundDecisionTarget({
        snapshotForeground: snapshot.sample.foregroundWindow,
        probedForeground: interruptionContext.foregroundWindow,
        attentionAnchor: getActiveAttentionAnchor(perceptionState, now),
      })

      await rememberPerceptionObservation({
        cardId,
        now,
        target: resolvedForegroundWindow,
        source: 'chat-start',
      })

      perceptionState = await ensurePerceptionState(cardId)

      const grounding = await resolveProactiveScreenSemanticSummary({
        cardId,
        now,
        foregroundWindow: resolvedForegroundWindow,
        perceptionState,
      })
      const foregroundWindow = resolvedForegroundWindow ?? snapshot.sample.foregroundWindow ?? null
      const focusTarget = grounding.focusTarget ?? null
      const screenSemanticSummary = grounding.summary ?? null
      const unavailableReason = grounding.unavailableReason ?? null
      const browserPageContext = await readDesktopInspectionBrowserPageContext({
        abortSignal: input.abortSignal,
        focusTarget,
        foregroundWindow,
        summary: screenSemanticSummary,
      })
      const interactableResult = await localBrowserAutomation.listDesktopInteractables({
        abortSignal: input.abortSignal,
        maxItems: 20,
      }).catch((error) => {
        if (input.abortSignal?.aborted || isAbortError(error))
          throw error
        return null
      })
      const interactables: AlicizationLocalDesktopInspectionInteractable[] = interactableResult
        && typeof interactableResult === 'object'
        && !Array.isArray(interactableResult)
        && interactableResult.status === 'completed'
        && 'interactables' in interactableResult
        && Array.isArray(interactableResult.interactables)
        ? interactableResult.interactables as AlicizationLocalDesktopInspectionInteractable[]
        : []
      const provisionalInspectionSnapshot = buildAlicizationDesktopInspectionSceneSnapshot({
        browserPageContext,
        capture: grounding.capture ?? snapshot.capture ?? null,
        focusTarget,
        foregroundWindow,
        interactables,
        maxSuggestedActions: input.maxSuggestedActions,
        question: question || null,
        site: input.site ?? null,
        summary: screenSemanticSummary,
        unavailableReason,
        url: input.url ?? null,
      })
      const workflowState = provisionalInspectionSnapshot.browserPageContext
        ? (await queuePerceptionStateMutation(cardId, current => rememberPerceptionBrowserWorkflowState({
            state: current,
            now,
            currentPhase: provisionalInspectionSnapshot.pagePhase,
            targetPhase: provisionalInspectionSnapshot.workflowPlan.targetPhase,
            taskKey: buildDesktopInspectionWorkflowTaskKey({
              browserPageContext: provisionalInspectionSnapshot.browserPageContext,
              question: question || null,
              targetPhase: provisionalInspectionSnapshot.workflowPlan.targetPhase,
            }),
            title: provisionalInspectionSnapshot.browserPageContext?.title,
            url: provisionalInspectionSnapshot.browserPageContext?.url,
          }))).browserWorkflowState ?? null
        : null
      const inspectionSnapshot = {
        ...provisionalInspectionSnapshot,
        suggestedActions: buildAlicizationDesktopInspectionSuggestedActions({
          blockingSignals: provisionalInspectionSnapshot.blockingSignals,
          browserPageContext: provisionalInspectionSnapshot.browserPageContext,
          executionStrategy: provisionalInspectionSnapshot.executionStrategy,
          focusTarget,
          foregroundWindow,
          guiStructure: provisionalInspectionSnapshot.guiStructure,
          maxSuggestedActions: input.maxSuggestedActions,
          nextActionIntent: provisionalInspectionSnapshot.nextActionIntent,
          pagePhase: provisionalInspectionSnapshot.pagePhase,
          question: question || null,
          site: input.site ?? null,
          summary: screenSemanticSummary,
          unavailableReason,
          url: input.url ?? null,
          workflowPlan: provisionalInspectionSnapshot.workflowPlan,
          workflowState,
        }),
      }
      const summary = summarizeAlicizationDesktopInspection({
        browserPageContext: inspectionSnapshot.browserPageContext,
        focusTarget,
        foregroundWindow,
        guiStructure: inspectionSnapshot.guiStructure,
        summary: screenSemanticSummary,
        unavailableReason,
        workflowPlan: inspectionSnapshot.workflowPlan,
        workflowState,
      })
      const output = JSON.stringify({
        question: inspectionSnapshot.question,
        foregroundWindow: inspectionSnapshot.foregroundWindow,
        focusTarget: inspectionSnapshot.focusTarget,
        capture: inspectionSnapshot.capture,
        browserPageContext: inspectionSnapshot.browserPageContext,
        interactables: inspectionSnapshot.interactables,
        guiStructure: inspectionSnapshot.guiStructure,
        pagePhase: inspectionSnapshot.pagePhase,
        nextActionIntent: inspectionSnapshot.nextActionIntent,
        blockingSignals: inspectionSnapshot.blockingSignals,
        workflowPlan: inspectionSnapshot.workflowPlan,
        workflowState,
        executionStrategy: inspectionSnapshot.executionStrategy,
        screenSemanticSummary: inspectionSnapshot.screenSemanticSummary,
        suggestedActions: inspectionSnapshot.suggestedActions,
        unavailableReason: inspectionSnapshot.unavailableReason,
      })

      return {
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        question: inspectionSnapshot.question,
        foregroundWindow: inspectionSnapshot.foregroundWindow,
        capture: inspectionSnapshot.capture,
        focusTarget: inspectionSnapshot.focusTarget,
        browserPageContext: inspectionSnapshot.browserPageContext,
        interactables: inspectionSnapshot.interactables,
        guiStructure: inspectionSnapshot.guiStructure,
        pagePhase: inspectionSnapshot.pagePhase,
        nextActionIntent: inspectionSnapshot.nextActionIntent,
        blockingSignals: inspectionSnapshot.blockingSignals,
        workflowPlan: inspectionSnapshot.workflowPlan,
        workflowState,
        executionStrategy: inspectionSnapshot.executionStrategy,
        screenSemanticSummary: inspectionSnapshot.screenSemanticSummary,
        suggestedActions: inspectionSnapshot.suggestedActions,
        unavailableReason: inspectionSnapshot.unavailableReason,
        goal,
        summary,
        output,
      } as const
    }
    catch (error) {
      const cancelled = input.abortSignal?.aborted || isAbortError(error)
      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_inspect_scene',
        question: question || null,
        goal,
        summary: cancelled
          ? 'Desktop inspection was cancelled.'
          : 'Failed to inspect current desktop scene.',
        errorCode: cancelled
          ? 'ALICIZATION_TOOL_ABORTED'
          : 'DESKTOP_INSPECT_SCENE_FAILED',
        errorMessage: errorMessageFrom(error) ?? 'Unknown desktop inspection error.',
        ...(cancelled ? { cancelled: true } : {}),
        output: '',
      } as const
    }
  }
  runtimeTestInternals.currentDesktopInspectScene = desktopInspectScene
  const sensoryRuntime = createAlicizationSensoryRuntime({
    appendContentPartsToLatestUserMessage,
    buildChatInspectionGroundingParts,
    buildCompressedNativeImageDataUrl,
    buildDialogueIngressContext,
    buildDialogueIngressGovernor,
    buildDialogueTurnSemantics,
    buildInspectionSceneResidue,
    buildScreenSemanticSceneResidue,
    clearDesktopCaptureAccessCache: () => desktopCaptureAccessRuntime.clear(),
    describePerceptionTarget,
    detectInvitedInspectionIntent,
    ensurePerceptionState,
    queuePerceptionStateMutation,
    ensureProactiveLoopState: async cardId => await ensureProactiveLoopState(cardId),
    ensureSubconsciousState,
    ensureVisualPresenceState,
    extractInspectionHintTerms,
    generateScreenSemanticSummaryFromImage,
    getActiveAttentionAnchor,
    getSensorySnapshot: () => sensoryBus.getSnapshot(),
    hasImageTransportContent,
    inferAlicizationInspectionIntent,
    inspectionGroundingImageJpegQuality,
    inspectionGroundingImageMaxHeight,
    inspectionGroundingImageMaxWidth,
    isGenericScreenInspectionRequest,
    isWeakAlicizationScreenSurfaceCue,
    isWeakAlicizationScreenSurfaceTarget,
    isWeakGenericBrowserFocusTarget,
    listPendingScheduledTaskCount: async limit => (await alicizationDb.listPendingScheduledTasks(limit).catch(() => [])).length,
    persistPerceptionState: async (cardId, state) => await persistPerceptionState(cardId, state),
    purgeWeakGenericBrowserInspectionState,
    rankScreenSemanticCaptureCandidates,
    readLatestAssistantMessageText,
    rememberPerceptionObservation,
    rememberSceneResidue,
    resolveDesktopCaptureAccess,
    resolveForegroundDecisionTarget,
    resolveHostAttitude: async () => (soulLifecycleState.soulSnapshot ?? await bootstrap()).frontmatter.host_attitude,
    resolveInspectionIntentForChatTurn,
    resolveSenderCaptureSnapshot: senderWebContentsId => senderWebContentsId
      ? deriveSensoryCaptureSnapshotFromDiagnostics(getScreenCaptureDiagnosticsForWebContentsId(senderWebContentsId))
      : null,
    sampleSubconsciousInterruptionContext,
    shouldSuppressWeakGenericBrowserInspectionAnchor,
  })
  mainChatRuntime.bindInspectionIntentFromMessageHistory(sensoryRuntime.resolveInspectionIntentFromMessageHistory)
  const workingMemoryStore = createWorkingMemoryStore()
  const mainChatSessionRuntime = createAlicizationMainChatSessionRuntime({
    buildToolRegistry: () => runtimeToolRegistry,
    workingMemoryStore,
    buildMainRuntimeCorePromptBlocks,
    dialogueSessionManager,
    persistAutobiographicalEpisodesFromPreparedMirror: persistPreparedMirrorAutobiographicalEpisodes,
    enqueueWorkingMemoryLongTermQueue: async input => await alicizationDb.enqueueWorkingMemoryLongTermQueueItems(input),
    drainWorkingMemoryLongTermQueue: async limit => await alicizationDb.drainWorkingMemoryLongTermQueue(limit),
    drainWorkingMemoryLongTermQueueScoped: async input =>
      await alicizationDb.drainWorkingMemoryLongTermQueueScoped(input),
    listConversationTurnsBySession: async (sessionId, options) =>
      await alicizationDb.listConversationTurnsBySession(sessionId, options),
    getWorkingMemoryCheckpoint: async (cardId, sessionId) =>
      await alicizationDb.getWorkingMemoryCheckpoint(cardId, sessionId),
    persistWorkingMemoryCheckpoint: async snapshot =>
      await alicizationDb.upsertWorkingMemoryCheckpoint(snapshot),
    retrieveLongTermMemoryEvidence: async input => await alicizationDb.retrieveLongTermMemoryEvidence(input),
    executionCapabilityChannels: alicizationExecutionCapabilityChannels,
    executeMainGatewayTaskThread,
    resumeMainGatewayTaskThread,
    getPerformanceManifest,
    getSensorySnapshot: async () => sensoryBus.getSnapshot(),
    latestUserMessageContainsVisualInput,
    openAgentTurn: input => agentRuntime.openTurn(input),
    resolveCardCustomDirectives,
    resolveCardHostName,
    resolveCardPersonaKernel,
    resolveExecutionCapabilitiesForPrompt,
    prewarmOrganicMemoryAccessibility: async input => await memoryRuntime.prewarmAccessibilityLine(input),
    resolveTurnRetrievalPolicySnapshot: async input => await memoryRuntime.resolveTurnRetrievalPolicySnapshot(input),
    getActiveSelfEvolutionSnapshot: async () => await selfEvolutionRuntime.getSnapshot(),
    resolveOrganicMemoryPromptContext,
    scheduleOrganicLearningAction: async input => await learningActionScheduler.scheduleLearningTask(input),
    listMemoryReflections: async (cardId, limit) => await alicizationDb.listMemoryReflections({ cardId, limit }).catch(() => []),
    listRelationshipOutcomes: async (cardId, limit) => await alicizationDb.listRelationshipOutcomes({ cardId, limit }).catch(() => []),
    resolveSessionContinuitySignals: async ({ cardId }) => await resolveAgentSessionContinuitySignals(cardId),
    browserOpenUrl: localBrowserAutomation.openUrl,
    browserSearchWeb: localBrowserAutomation.searchWeb,
    browserReadPage: localBrowserAutomation.readPage,
    browserClickElement: localBrowserAutomation.clickElement,
    browserTypeText: localBrowserAutomation.typeBrowserText,
    browserNavigate: localBrowserAutomation.navigateBrowser,
    browserScroll: localBrowserAutomation.scrollBrowser,
    browserWait: localBrowserAutomation.waitForBrowser,
    desktopListInteractables: localBrowserAutomation.listDesktopInteractables,
    desktopClickElement: localBrowserAutomation.clickDesktopElement,
    desktopTypeText: localBrowserAutomation.typeDesktopText,
    desktopPressKeys: localBrowserAutomation.pressDesktopKeys,
    desktopWait: localBrowserAutomation.waitForDesktop,
    desktopInspectScene,
    desktopOpenApplication: localBrowserAutomation.openApplication,
    resolveTaskPlanningCapabilities,
    scheduleReminderTask,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    invokeMcpListTools: invokeAlicizationMcpListToolsFromMain,
    invokeMcpCallTool: invokeAlicizationMcpCallToolFromMain,
  })
  let subconsciousTickInFlight: Promise<AlicizationSubconsciousTickResult> | null = null
  let queuedSubconsciousWakeTimer: NodeJS.Timeout | undefined
  const queuedSubconsciousWakeCardIds = new Set<string>()
  const queuedSubconsciousWakeReasons = new Set<string>()
  const visualPresenceCapturePersistDebounceWindowMs = 5000

  const observedWebContentsIds = new Set<number>()
  const isEventCapableWebContents = (
    contents: Partial<WebContents> | null | undefined,
  ): contents is WebContents & Pick<Required<WebContents>, 'id' | 'on'> => {
    return typeof contents?.id === 'number' && typeof contents?.on === 'function'
  }
  const registerWebContentsDurabilityHooks = (contents: Partial<WebContents> | null | undefined) => {
    if (!isEventCapableWebContents(contents) || observedWebContentsIds.has(contents.id))
      return
    observedWebContentsIds.add(contents.id)
    contents.on('unresponsive', () => {
      queueDurabilityPulse(activeCardId, {
        kind: 'window-unresponsive',
        source: 'electron-window',
        detectedAt: Date.now(),
        detail: `webcontents:${contents.id}:unresponsive`,
      })
    })
    contents.on('responsive', () => {
      queueDurabilityPulse(activeCardId, {
        kind: 'window-responsive',
        source: 'electron-window',
        detectedAt: Date.now(),
        detail: `webcontents:${contents.id}:responsive`,
      }, {
        triggerThoughtLoop: false,
      })
    })
    contents.on('destroyed', () => {
      observedWebContentsIds.delete(contents.id)
    })
  }

  const listAllWebContents = typeof webContents?.getAllWebContents === 'function'
    ? webContents.getAllWebContents.bind(webContents)
    : null
  const appOn = typeof app?.on === 'function'
    ? app.on.bind(app)
    : null

  if (listAllWebContents) {
    for (const contents of listAllWebContents())
      registerWebContentsDurabilityHooks(contents)
  }

  if (appOn) {
    appOn('web-contents-created', (_event, contents) => {
      registerWebContentsDurabilityHooks(contents)
    })
    appOn('render-process-gone', (_event, contents, details) => {
      queueDurabilityPulse(activeCardId, {
        kind: 'render-process-gone',
        source: 'electron-process',
        detectedAt: Date.now(),
        detail: `reason:${details.reason};exitCode:${details.exitCode};wc:${contents.id}`,
      })
    })
    appOn('child-process-gone', (_event, details) => {
      const childDetails = details as {
        type?: string
        reason?: string
        name?: string
        serviceName?: string
      }
      queueDurabilityPulse(activeCardId, {
        kind: 'child-process-gone',
        source: 'electron-process',
        detectedAt: Date.now(),
        detail: `type:${childDetails.type ?? ''};reason:${childDetails.reason ?? ''};name:${childDetails.name ?? ''};service:${childDetails.serviceName ?? ''}`,
      })
    })
  }

  const emitSoulChanged = (snapshot: AlicizationSoulSnapshot, cardId = activeCardId) => {
    context.emit(alicizationSoulChanged, {
      cardId,
      ...snapshot,
    })
  }

  const emitKillSwitchChanged = (cardId = activeCardId) => {
    context.emit(alicizationKillSwitchStateChanged, {
      cardId,
      ...getScopedKillSwitchSnapshot(cardId),
    })
  }

  async function appendAuditLog(input: AlicizationAuditLogInput, cardId = activeCardId) {
    try {
      await alicizationDb.appendAuditLog({
        ...input,
        payload: {
          ...input.payload,
          cardId,
        },
      })
    }
    catch (error) {
      console.warn('[alicization-runtime] failed to append audit log:', error)
    }
  }
  soulLifecycleRuntime = createAlicizationRuntimeSoulLifecycle({
    state: soulLifecycleState,
    getPaths: () => ({
      soulRoot,
      soulPath,
      legacyPromptProfilePath,
      legacySparkProfilePath,
    }),
    now: () => Date.now(),
    existsSync,
    mkdir,
    readFile: async (path, encoding) => await readFile(path, encoding),
    unlink,
    importWatch: async () => await import('node:fs'),
    writeSoulContent,
    parseSoul,
    hashContent,
    withNeedsGenesis,
    defaultFrontmatter,
    defaultSoulBody,
    toSoulContent,
    extractPersonaNotesFromBody,
    buildSoulBody,
    resolveAlicizationSoulPersonaKernel,
    normalizeCustomDirectives,
    normalizeHostAttitude,
    normalizeCoreIncarnation,
    normalizeGender,
    normalizeMindAge,
    clamp01,
    currentSoulSchemaVersion,
    emitSoulChanged: snapshot => emitSoulChanged(snapshot),
    appendAuditLog: async input => await appendAuditLog(input),
  })
  setAlicizationAuditLogger(appendAuditLog)

  sensoryBus = createAlicizationSensoryBus({
    tickMs: 60_000,
    staleMs: 90_000,
    cpuWindowMs: 1_000,
    appendAuditLog: input => appendAuditLog(input, activeCardId),
  })

  async function resolveAgentSessionContinuitySignals(
    cardIdRaw: unknown,
  ): Promise<AlicizationAgentSessionContinuityInput[]> {
    const context = await resolveAgentSessionContinuityContext(cardIdRaw)
    return context.sessionContinuitySignals
  }

  async function resolveAgentSessionContinuityContext(
    cardIdRaw: unknown,
    options?: {
      digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
    },
  ): Promise<{
    digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
    sessionContinuitySignals: AlicizationAgentSessionContinuityInput[]
  }> {
    const cardId = normalizeCardId(cardIdRaw)
    const readState = async () => {
      const now = Date.now()
      const activeSessionId = normalizeSessionId(
        activeSessionIdByCard.get(cardId)
        ?? await alicizationDb.getLatestConversationSessionId().catch(() => undefined),
      )
      const [visualPresenceState, proactiveState, recentEpisodicEvents] = await Promise.all([
        ensureVisualPresenceState(cardId).catch(() => null),
        ensureProactiveLoopState(cardId).catch(() => null),
        alicizationDb.listRecentEpisodicEvents(24).catch(() => []),
      ])
      const dialogueSignal = visualPresenceState ? buildDialogueContinuitySignal(visualPresenceState) : null
      const visualPresenceSignal = visualPresenceState ? buildVisualPresenceContinuitySignal(visualPresenceState) : null
      const autobiographicalAfterglowSignals = buildAutobiographicalAfterglowContinuitySignals({
        activeSessionId: activeSessionId || null,
        events: recentEpisodicEvents,
        now,
      })
      const proactiveSignals = proactiveState ? buildProactiveContinuitySignals(proactiveState, now) : []
      const latestSettledProactiveOutcome = [...proactiveSignals]
        .reverse()
        .find((signal) => {
          const source = sanitizeText((signal.metadata as { source?: unknown } | null)?.source, '')
          const outcome = sanitizeText((signal.metadata as { outcome?: unknown } | null)?.outcome, '')
          return source === 'proactive-feedback' && outcome.length > 0
        })
      const latestSettledProactiveTurnId = sanitizeText(
        (latestSettledProactiveOutcome?.metadata as { turnId?: unknown } | null)?.turnId,
        '',
      )
      const sessionContinuitySignals = [
        ...autobiographicalAfterglowSignals,
        ...proactiveSignals.filter((signal) => {
          const source = sanitizeText((signal.metadata as { source?: unknown } | null)?.source, '')
          if (source !== 'proactive-deferred')
            return true

          const deferredTurnId = sanitizeText((signal.metadata as { turnId?: unknown } | null)?.turnId, '')
          return !latestSettledProactiveTurnId || !deferredTurnId || deferredTurnId !== latestSettledProactiveTurnId
        }),
        ...(dialogueSignal ? [dialogueSignal] : []),
        ...(visualPresenceSignal ? [visualPresenceSignal] : []),
      ].sort((left, right) => Number(left.createdAt) - Number(right.createdAt))
      const digitalLifeRuntimeSurface = resolvePreferredRuntimeSurface({
        spineRuntimeSurface: options?.digitalLifeRuntimeSurface ?? null,
        preparedRuntimeSurface: visualPresenceState ? buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState) : null,
      })
      return {
        digitalLifeRuntimeSurface,
        sessionContinuitySignals,
      }
    }

    if (cardId === activeCardId)
      return await readState()

    return await withCardScope(cardId, async () => await readState(), {
      label: `agent-session-continuity:${cardId}`,
    })
  }

  const runtimeExecutionDelivery = createAlicizationRuntimeExecutionDelivery({
    getActiveCardId: () => activeCardId,
    getActiveSessionId: cardId => activeSessionIdByCard.get(cardId) ?? '',
    getNow: () => Date.now(),
    normalizeCardId,
    normalizeSessionId,
    withCardScope,
    queueSubconsciousWake,
    appendAuditLog,
    syncSessionMirrorFromCurrentCardState,
    alicizationDb: {
      getMetaValue: key => alicizationDb.getMetaValue(key),
      setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
      listExecutionEvents: input => alicizationDb.listExecutionEvents(input),
      listTaskThreads: input => alicizationDb.listTaskThreads(input),
    },
    executionDeliveryRuntime,
    executionDeliveryStateMetaKey: alicizationExecutionDeliveryStateMetaKey,
    generateMainGatewayText: mainGatewayTextProvider,
    getPerformanceManifest,
    normalizeAlicizationEmotion,
    normalizeAlicizationPerformancePayload,
    clampAlicizationPerformancePayloadToManifest,
    ensureVisualPresenceState,
    buildHostPersonModel,
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
    getActiveSelfEvolutionCandidateId: async () => (await selfEvolutionRuntime.getActiveCandidate())?.id ?? null,
  })

  const queueExecutionDeliveryCandidate = runtimeExecutionDelivery.queueExecutionDeliveryCandidate

  function resolveDispatchPayloadRuntimeContext(input: {
    cli?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    codex?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    claudeCode?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    localVisual?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    openclaw?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
  }) {
    return input.cli?.runtimeContext
      ?? input.codex?.runtimeContext
      ?? input.claudeCode?.runtimeContext
      ?? input.localVisual?.runtimeContext
      ?? input.openclaw?.runtimeContext
      ?? null
  }

  function resolveStoredDispatchRuntimeContext(thread: {
    metadata?: Record<string, unknown> | null
  } | null | undefined) {
    const metadata = thread?.metadata
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
      return null

    const execution = metadata.execution
    if (!execution || typeof execution !== 'object' || Array.isArray(execution))
      return null

    const runtimeContext = (execution as Record<string, unknown>).runtimeContext
    if (!runtimeContext || typeof runtimeContext !== 'object' || Array.isArray(runtimeContext))
      return null

    return runtimeContext as AlicizationExecutionRuntimeContext
  }

  function withDispatchRuntimeContext<Command extends { runtimeContext?: AlicizationExecutionRuntimeContext | null }>(
    command: Command | null | undefined,
    runtimeContext: AlicizationExecutionRuntimeContext | null,
  ): Command | null | undefined {
    if (!command || !runtimeContext || command.runtimeContext)
      return command

    return {
      ...command,
      runtimeContext,
    }
  }

  function applyDispatchRuntimeContext<Input extends {
    cli?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    codex?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    claudeCode?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    localVisual?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    openclaw?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
  }>(
    input: Input,
    runtimeContext: AlicizationExecutionRuntimeContext | null,
  ): Input {
    if (!runtimeContext)
      return input

    return {
      ...input,
      cli: withDispatchRuntimeContext(input.cli, runtimeContext),
      codex: withDispatchRuntimeContext(input.codex, runtimeContext),
      claudeCode: withDispatchRuntimeContext(input.claudeCode, runtimeContext),
      localVisual: withDispatchRuntimeContext(input.localVisual, runtimeContext),
      openclaw: withDispatchRuntimeContext(input.openclaw, runtimeContext),
    }
  }

  async function buildRuntimeOwnedExecutionRuntimeContext(input: {
    cardId: string
    thread: {
      decisionTraceId?: string | null
      metadata?: Record<string, unknown> | null
      sessionId?: string | null
      turnId?: string | null
    } | null
    threadId: string
  }) {
    const fallbackTurnId = `execution-dispatch:${sanitizeText(input.threadId, '').slice(0, 80) || randomUUID()}`
    const fallbackDecisionTraceId = `mind:${Date.now().toString(36)}:dispatch-runtime-context`
    const turnId = sanitizeText(input.thread?.turnId, '').slice(0, 160) || fallbackTurnId
    const decisionTraceId = sanitizeText(input.thread?.decisionTraceId, '').slice(0, 200) || fallbackDecisionTraceId
    const sessionId = sanitizeText(input.thread?.sessionId, '').slice(0, 160) || null
    const sensorySnapshot = await sensoryBus.getSnapshot()
    const agentTurn = await agentRuntime.openTurn({
      cardId: input.cardId,
      turnId,
      decisionTraceId,
    })

    return await agentTurn.buildExecutionRuntimeContext({
      cardId: input.cardId,
      turnId,
      decisionTraceId,
      sessionId,
      sensorySnapshot,
    })
  }

  async function ensureDispatchInvocationRuntimeContext(
    invocation: Parameters<typeof taskThreadOrchestrator.dispatch>[0],
    cardId: string,
  ) {
    if (resolveDispatchPayloadRuntimeContext(invocation.input))
      return invocation

    const thread = await invocation.port.getTaskThread(invocation.input.threadId).catch(() => undefined)
    if (!thread || resolveStoredDispatchRuntimeContext(thread))
      return invocation

    try {
      const runtimeContext = await buildRuntimeOwnedExecutionRuntimeContext({
        cardId,
        thread,
        threadId: invocation.input.threadId,
      })
      return {
        ...invocation,
        input: applyDispatchRuntimeContext(invocation.input, runtimeContext),
      }
    }
    catch (error) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.executor.dispatch',
        action: 'runtime-context-build-failed',
        message: 'Runtime-owned dispatch bridge failed to build execution runtime context before dispatch.',
        payload: {
          cardId,
          threadId: invocation.input.threadId,
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      }, cardId)
      return invocation
    }
  }

  async function dispatchTaskThreadWithExecutionDelivery(invocation: Parameters<typeof taskThreadOrchestrator.dispatch>[0]) {
    const scopedCardId = activeCardId
    const preparedInvocation = await ensureDispatchInvocationRuntimeContext(invocation, scopedCardId)
    const result = await taskThreadOrchestrator.dispatch({
      ...preparedInvocation,
      port: {
        ...preparedInvocation.port,
        localVisualSurface: {
          browserOpenUrl: localBrowserAutomation.openUrl,
          browserSearchWeb: localBrowserAutomation.searchWeb,
          browserReadPage: localBrowserAutomation.readPage,
          browserClickElement: localBrowserAutomation.clickElement,
          browserTypeText: localBrowserAutomation.typeBrowserText,
          browserNavigate: localBrowserAutomation.navigateBrowser,
          browserScroll: localBrowserAutomation.scrollBrowser,
          browserWait: localBrowserAutomation.waitForBrowser,
          desktopListInteractables: localBrowserAutomation.listDesktopInteractables,
          desktopClickElement: localBrowserAutomation.clickDesktopElement,
          desktopTypeText: localBrowserAutomation.typeDesktopText,
          desktopPressKeys: localBrowserAutomation.pressDesktopKeys,
          desktopOpenApplication: localBrowserAutomation.openApplication,
          desktopWait: localBrowserAutomation.waitForDesktop,
          desktopInspectScene,
        },
      },
    })
    await syncSessionMirrorFromCurrentCardState({
      cardId: scopedCardId,
      decisionTraceId: result.thread.decisionTraceId,
      sessionId: result.thread.sessionId,
      source: 'task-dispatch',
      turnId: result.thread.turnId,
      taskThread: result.thread,
    })
    if (alicizationTerminalTaskThreadStatuses.has(result.thread.status)) {
      await queueExecutionDeliveryCandidate({
        cardId: scopedCardId,
        resultDeliveryMode: invocation.resultDeliveryMode,
        thread: result.thread,
      })
    }
    return result
  }

  function clampNeed(value: number) {
    if (!Number.isFinite(value))
      return 0
    return Math.max(0, Math.min(100, value))
  }

  function createDefaultSubconsciousState(now = Date.now()): SubconsciousCardState {
    return {
      boredom: 0,
      loneliness: 0,
      fatigue: 0,
      lastTickAt: now,
      lastInteractionAt: now,
      lastSavedAt: now,
      lastDreamedAt: 0,
      updatedAt: now,
    }
  }

  function normalizeSubconsciousState(raw: unknown, now = Date.now()): SubconsciousCardState {
    const data = typeof raw === 'object' && raw ? raw as Record<string, unknown> : {}
    const pickNumber = (key: string, fallback: number) => {
      const value = data[key]
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback
    }
    return {
      boredom: clampNeed(pickNumber('boredom', 0)),
      loneliness: clampNeed(pickNumber('loneliness', 0)),
      fatigue: clampNeed(pickNumber('fatigue', 0)),
      lastTickAt: Math.max(0, pickNumber('lastTickAt', now)),
      lastInteractionAt: Math.max(0, pickNumber('lastInteractionAt', now)),
      lastSavedAt: Math.max(0, pickNumber('lastSavedAt', now)),
      lastDreamedAt: Math.max(0, pickNumber('lastDreamedAt', 0)),
      updatedAt: Math.max(0, pickNumber('updatedAt', now)),
    }
  }

  async function persistSubconsciousState(cardId: string, state: SubconsciousCardState) {
    const normalizedCardId = normalizeCardId(cardId)
    subconsciousStateByCard.set(normalizedCardId, state)
    await alicizationDb.setMetaValue(
      alicizationSubconsciousStateMetaKey,
      JSON.stringify({
        boredom: state.boredom,
        loneliness: state.loneliness,
        fatigue: state.fatigue,
        lastTickAt: state.lastTickAt,
        lastInteractionAt: state.lastInteractionAt,
        lastSavedAt: state.lastSavedAt,
        updatedAt: state.updatedAt,
      }),
    ).catch(() => {})
    await alicizationDb.setMetaValue(alicizationDreamLastRunMetaKey, `${state.lastDreamedAt}`).catch(() => {})
  }

  async function restoreSubconsciousState(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const now = Date.now()
    const raw = await alicizationDb.getMetaValue(alicizationSubconsciousStateMetaKey).catch(() => undefined)
    const rawDreamedAt = await alicizationDb.getMetaValue(alicizationDreamLastRunMetaKey).catch(() => undefined)
    const parsed = (() => {
      if (!raw)
        return createDefaultSubconsciousState(now)
      try {
        return normalizeSubconsciousState(JSON.parse(raw), now)
      }
      catch {
        return createDefaultSubconsciousState(now)
      }
    })()
    const dreamedAt = Number.parseInt(String(rawDreamedAt ?? ''), 10)
    const normalized = {
      ...parsed,
      lastDreamedAt: Number.isFinite(dreamedAt) ? Math.max(0, dreamedAt) : parsed.lastDreamedAt,
    }
    const offlineMinutes = Math.max(0, (now - normalized.lastSavedAt) / 60_000)
    if (offlineMinutes >= 1) {
      normalized.boredom = clampNeed(normalized.boredom + offlineMinutes * 0.8)
      normalized.loneliness = clampNeed(normalized.loneliness + offlineMinutes * 0.6)
      normalized.fatigue = clampNeed(normalized.fatigue + offlineMinutes * 0.3)
      normalized.lastTickAt = now
      normalized.updatedAt = now
    }
    subconsciousStateByCard.set(normalizedCardId, normalized)
    if (offlineMinutes >= 1) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.subconscious',
        action: 'offline-compensated',
        message: 'Applied subconscious offline compensation on cold start restore.',
        payload: {
          cardId: normalizedCardId,
          offlineMinutes: Number(offlineMinutes.toFixed(2)),
          boredom: normalized.boredom,
          loneliness: normalized.loneliness,
          fatigue: normalized.fatigue,
        },
      }, normalizedCardId)
    }
    return normalized
  }

  async function ensureSubconsciousState(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const current = subconsciousStateByCard.get(normalizedCardId)
    if (current)
      return current
    return await restoreSubconsciousState(normalizedCardId)
  }

  async function persistProactiveLoopState(
    cardIdRaw: unknown,
    state: AlicizationProactiveLoopState,
    persistOptions: { signal?: AbortSignal } = {},
  ) {
    const assertNotAborted = () => {
      if (!persistOptions.signal?.aborted)
        return
      throw persistOptions.signal.reason ?? createAbortError('proactive-loop-state-persistence')
    }
    const persistMeta = async () => {
      try {
        await alicizationDb.setMetaValue(
          alicizationProactiveLoopStateMetaKey,
          JSON.stringify(state),
          { signal: persistOptions.signal },
        )
      }
      catch (error) {
        if (persistOptions.signal?.aborted || isAbortError(error))
          throw persistOptions.signal?.reason ?? error
      }
    }

    assertNotAborted()
    const cardId = normalizeCardId(cardIdRaw)
    if (cardId === activeCardId) {
      await persistMeta()
    }
    else {
      await withCardScope(cardId, async () => {
        assertNotAborted()
        await persistMeta()
      }, {
        label: `proactive-loop.persist:${cardId}`,
      })
    }
    assertNotAborted()
    proactiveLoopStateByCard.set(cardId, state)
  }

  async function restoreProactiveLoopState(
    cardIdRaw: unknown,
    restoreOptions: { signal?: AbortSignal } = {},
  ) {
    const assertNotAborted = () => {
      if (!restoreOptions.signal?.aborted)
        return
      throw restoreOptions.signal.reason ?? createAbortError('proactive-loop-state-restore')
    }
    const cardId = normalizeCardId(cardIdRaw)
    const now = Date.now()
    const setState = (state: AlicizationProactiveLoopState) => {
      assertNotAborted()
      proactiveLoopStateByCard.set(cardId, state)
      return state
    }

    assertNotAborted()
    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationProactiveLoopStateMetaKey).catch(() => undefined)
        assertNotAborted()
        if (!raw) {
          setState(createDefaultProactiveLoopState(now))
          return
        }
        try {
          setState(normalizeProactiveLoopState(JSON.parse(raw), now))
        }
        catch {
          setState(createDefaultProactiveLoopState(now))
        }
      }, {
        label: `proactive-loop.restore:${cardId}`,
      })
      assertNotAborted()
      return proactiveLoopStateByCard.get(cardId) ?? createDefaultProactiveLoopState(now)
    }

    const raw = await alicizationDb.getMetaValue(alicizationProactiveLoopStateMetaKey).catch(() => undefined)
    assertNotAborted()
    if (!raw)
      return setState(createDefaultProactiveLoopState(now))
    try {
      return setState(normalizeProactiveLoopState(JSON.parse(raw), now))
    }
    catch {
      return setState(createDefaultProactiveLoopState(now))
    }
  }

  async function ensureProactiveLoopState(
    cardIdRaw: unknown,
    ensureOptions: { signal?: AbortSignal } = {},
  ) {
    if (ensureOptions.signal?.aborted)
      throw ensureOptions.signal.reason ?? createAbortError('proactive-loop-state-ensure')
    const cardId = normalizeCardId(cardIdRaw)
    const current = proactiveLoopStateByCard.get(cardId)
    if (current)
      return current
    return await restoreProactiveLoopState(cardId, ensureOptions)
  }
  runtimeTestInternals.currentEnsureProactiveLoopState = ensureProactiveLoopState

  const persistExecutionDeliveryState = runtimeExecutionDelivery.persistExecutionDeliveryState

  const restoreExecutionDeliveryState = runtimeExecutionDelivery.restoreExecutionDeliveryState

  function buildVisualPresenceCapturePersistFingerprint(state: AlicizationVisualPresenceStateSnapshot) {
    return [
      buildMindSceneSignature(state.currentScene),
      buildMindAttentionSignature(state.attention),
      state.captureState.health ?? '',
      state.captureState.permission,
      sanitizeText(state.captureState.sourceName),
      sanitizeText(state.captureState.degradedReason),
    ].join('::').toLowerCase()
  }

  function senderWebContentsIdFromInvokeOptions(
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ) {
    const senderId = Number(invokeOptions?.raw?.ipcMainEvent?.sender?.id)
    return Number.isFinite(senderId) ? Math.max(1, Math.floor(senderId)) : null
  }

  function buildPresencePulsePayload(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot): AlicizationPresencePulsePayload | null {
    const cardId = normalizeCardId(cardIdRaw)
    const privateThought = state.privateThought
    const currentScene = state.currentScene
    const activeThread = state.worldModel?.activeThread
    const scenario = currentScene?.scenario
      ?? (
        activeThread?.kind === 'debugging' || activeThread?.kind === 'change-review' || activeThread?.kind === 'deep-focus'
          ? 'coding'
          : activeThread?.kind === 'co-viewing'
            ? 'media'
            : activeThread?.kind === 'late-night-endurance'
              ? 'late-night-care'
              : 'general'
      )
    if (!privateThought || privateThought.embodiedPresence === 'none' || (!currentScene && !activeThread))
      return null

    const normalizedReasonTags = Array.from(new Set(privateThought.rationaleTags))

    return {
      cardId,
      watchMode: state.watchMode,
      embodiedPresence: privateThought.embodiedPresence,
      scenario,
      stance: privateThought.stance,
      currentBodyState: state.currentBodyState,
      continuityMode: state.continuityMode,
      quietLineMs: state.quietLineMs,
      currentInwardPreoccupation: state.currentInwardPreoccupation,
      confidence: privateThought.confidence,
      reasonTags: normalizedReasonTags,
      emotionalTension: privateThought.emotionalTension,
      expiresAt: privateThought.expiresAt,
    }
  }

  function emitVisualPresencePulse(payload: AlicizationPresencePulsePayload | null) {
    if (!payload || payload.embodiedPresence === 'none' || payload.expiresAt <= Date.now())
      return
    context.emit(electronAlicizationVisualPresenceChanged, payload)
  }

  function emitVisualPresenceState(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) {
    context.emit(electronAlicizationVisualPresenceStateChanged, {
      cardId: normalizeCardId(cardIdRaw),
      state,
    })
  }

  async function rememberPerceptionObservation(input: {
    cardId: string
    now: number
    target?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    source: 'sensory-snapshot' | 'subconscious-tick' | 'chat-start'
  }) {
    return await queuePerceptionStateMutation(input.cardId, current => updatePerceptionStateWithObservation({
      state: current,
      now: input.now,
      target: input.target,
      source: input.source,
    }))
  }

  async function rememberSceneResidue(input: {
    cardId: string
    now: number
    residue: AlicizationPerceptionSceneResidue
  }) {
    const next = await queuePerceptionStateMutation(input.cardId, current => rememberPerceptionSceneResidue({
      state: current,
      now: input.now,
      residue: input.residue,
    }))
    await syncSessionMirrorFromCurrentCardState({
      cardId: input.cardId,
      source: input.residue.source,
      turnId: buildMainGatewayAgentTurnId('perception', input.residue.source, input.cardId, input.now),
      sceneResidue: input.residue,
    })
    return next
  }

  function parseStoredConversationStructured(raw: unknown) {
    if (typeof raw !== 'string' || !raw.trim())
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

  const runtimeDialogueFeedback = createAlicizationRuntimeDialogueFeedback({
    normalizeCardId,
    sanitizeText,
    readLatestUserMessageText,
    ensureActiveOrLatestSessionId,
    withCardScope,
    ensureDialogueReplyFeedbackAck,
    persistDialogueReplyFeedbackAck,
    parseStoredConversationStructured,
    deriveDialogueReplyFeedbackKind,
    attachSynthesizedReflections,
    buildDialogueReplyFeedbackOutcomeClosure,
    persistOutcomeClosure,
    appendAuditLog,
    memoryReconsolidationRuntime: memoryRuntime.memoryReconsolidationRuntime,
    alicizationDb: {
      listConversationTurnsBySession: (sessionId, options) => alicizationDb.listConversationTurnsBySession(sessionId, options),
      getLatestRelationshipDynamics: () => alicizationDb.getLatestRelationshipDynamics(),
      appendRelationshipDynamics: input => alicizationDb.appendRelationshipDynamics(input),
    },
  })

  const settleRecentDialogueReplyFeedbackFromUserTurn
    = runtimeDialogueFeedback.settleRecentDialogueReplyFeedbackFromUserTurn

  const runtimeExecutionFeedback = createAlicizationRuntimeExecutionFeedback({
    normalizeCardId,
    sanitizeText,
    readLatestUserMessageText,
    readLatestAssistantMessageText,
    ensureActiveOrLatestSessionId,
    withCardScope,
    readTaskThreadActivityAt,
    attachSynthesizedReflections,
    buildExecutionProposalFeedbackOutcomeClosure,
    buildExecutionResultFeedbackOutcomeClosure,
    deriveExecutionProposalFeedbackKind,
    deriveExecutionResultFeedbackKind,
    persistOutcomeClosure,
    appendAuditLog,
    memoryReconsolidationRuntime: memoryRuntime.memoryReconsolidationRuntime,
    alicizationDb: {
      getLatestRelationshipDynamics: () => alicizationDb.getLatestRelationshipDynamics(),
      appendRelationshipDynamics: input => alicizationDb.appendRelationshipDynamics(input),
      listTaskThreads: input => alicizationDb.listTaskThreads(input),
      upsertTaskThread: input => alicizationDb.upsertTaskThread(input),
    },
  })

  const runtimeProactiveFeedback = createAlicizationRuntimeProactiveFeedback({
    normalizeCardId,
    ensureProactiveLoopState,
    persistProactiveLoopState,
    applyCurrentCardProactiveState: async ({ cardId, state }) => {
      proactiveLoopStateByCard.set(cardId, state)
      const currentPresenceState = visualPresenceStateByCard.get(cardId)
      if (currentPresenceState) {
        visualPresenceStateByCard.set(cardId, {
          ...currentPresenceState,
          proactiveLoopState: state,
        })
      }
    },
    peekLatestPendingProactiveDelivery: (cardId) => {
      const snapshot = dialogueDeliveryRuntime.peekLatestPendingProactiveDelivery(cardId)
      if (!snapshot)
        return null
      return {
        turnId: snapshot.turnId,
        createdAt: snapshot.createdAt,
        scenario: snapshot.scenario,
        feedbackWindowMs: snapshot.feedbackWindowMs,
        learningAction:
          snapshot.learningAction === 'record'
          || snapshot.learningAction === 'reflect'
          || snapshot.learningAction === 'verify'
          || snapshot.learningAction === 'revise'
          || snapshot.learningAction === 'internalize'
          || snapshot.learningAction === 'hold'
            ? snapshot.learningAction
            : null,
        learningFocuses: snapshot.learningFocuses,
        emotionalTransitionLedger: snapshot.emotionalTransitionLedger ?? null,
        affectiveResidue: snapshot.affectiveResidue ?? null,
      }
    },
    syncSessionMirrorFromCurrentCardState,
    syncSettledProactiveContinuityIntoActiveSession: async ({ cardId, source, proactiveOutcomes }) => {
      if (proactiveOutcomes.length === 0)
        return

      const sessionId = await ensureActiveOrLatestSessionId(cardId).catch(() => '')
      if (!sessionId)
        return

      const agentTurn = await agentRuntime.openTurn({
        cardId,
        turnId: buildMainGatewayAgentTurnId('proactive-feedback-session', source, cardId, Date.now()),
      }).catch(() => null)
      if (!agentTurn)
        return

      syncAgentTurnSessionMirror({
        agentTurn,
        cardId,
        continuitySignals: typeof buildProactiveOutcomeContinuitySignal === 'function'
          ? proactiveOutcomes.map(outcome => buildProactiveOutcomeContinuitySignal(outcome))
          : [],
        sessionId,
        source,
      })
    },
    buildMainGatewayAgentTurnId,
    appendAuditLog,
    persistOutcomeClosure,
    buildProactiveFeedbackOutcomeClosure,
    queueSubconsciousWake,
  })

  const settlePendingProactiveOutcomesFromUserTurn
    = runtimeProactiveFeedback.settlePendingProactiveOutcomesFromUserTurn

  const settlePendingExecutionProposalFeedbackFromUserTurn
    = runtimeExecutionFeedback.settlePendingExecutionProposalFeedbackFromUserTurn

  const settleRecentExecutionResultFeedbackFromUserTurn
    = runtimeExecutionFeedback.settleRecentExecutionResultFeedbackFromUserTurn

  const settleExpiredPendingProactiveOutcomes
    = runtimeProactiveFeedback.settleExpiredPendingProactiveOutcomes

  async function flushCurrentSubconsciousState(reason: string) {
    const current = subconsciousStateByCard.get(activeCardId)
    if (!current)
      return

    const now = Date.now()
    const next: SubconsciousCardState = {
      ...current,
      updatedAt: now,
      lastSavedAt: now,
    }
    await persistSubconsciousState(activeCardId, next)
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'state-flushed',
      message: 'Persisted in-memory subconscious state to disk.',
      payload: {
        reason,
        boredom: next.boredom,
        loneliness: next.loneliness,
        fatigue: next.fatigue,
      },
    })
  }

  async function markSubconsciousInteraction(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const current = await ensureSubconsciousState(normalizedCardId)
    const now = Date.now()
    const next: SubconsciousCardState = {
      ...current,
      boredom: 0,
      loneliness: 0,
      fatigue: clampNeed(current.fatigue + 2),
      lastInteractionAt: now,
      lastTickAt: now,
      updatedAt: now,
      lastSavedAt: now,
    }
    await persistSubconsciousState(normalizedCardId, next)
    return next
  }

  async function flushSubconsciousStatesAcrossCards(reason: string, specificCardIds?: string[]) {
    const previousCardId = activeCardId
    const cardIds = specificCardIds?.length
      ? specificCardIds.map(cardId => normalizeCardId(cardId))
      : [...new Set([...subconsciousStateByCard.keys(), normalizeCardId(activeCardId)])]
    try {
      for (const cardId of cardIds) {
        await withCardScope(cardId, async () => await flushCurrentSubconsciousState(reason), {
          label: `subconscious-flush:${reason}:${cardId}`,
        })
      }
    }
    finally {
      await withCardScope(previousCardId, async () => {}, {
        label: `subconscious-flush:return:${reason}:${previousCardId}`,
      })
    }
  }

  const llmConfigPath = join(userDataPath, 'alicizations', 'llm-config.json')
  const runtimeDebugLogPath = join(userDataPath, 'alicizations', 'runtime-debug.log')

  async function appendRuntimeDebugLine(event: string, payload?: Record<string, unknown>) {
    if (!runtimeDebugLogEnabled)
      return
    try {
      await mkdir(join(userDataPath, 'alicizations'), { recursive: true })
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        pid,
        event,
        ...payload,
      })
      await appendFile(runtimeDebugLogPath, `${line}\n`, 'utf-8')
    }
    catch {
      // ignore debug logging failures
    }
  }

  async function queueScopedAuditLog(cardId: string, input: AlicizationAuditLogInput) {
    void appendAuditLog(input, cardId).catch(() => {})
  }

  async function persistLlmConfigToDisk() {
    await mkdir(join(userDataPath, 'alicizations'), { recursive: true })
    await writeFile(
      llmConfigPath,
      JSON.stringify({
        activeProviderId,
        activeModelId,
        providerCredentials,
      }, null, 2),
      'utf-8',
    ).catch(() => {})
  }

  async function restoreLlmConfigFromDisk() {
    try {
      const raw = await readFile(llmConfigPath, 'utf-8')
      const parsed = JSON.parse(raw) as {
        activeProviderId?: unknown
        activeModelId?: unknown
        providerCredentials?: unknown
      }
      if (typeof parsed.activeProviderId === 'string')
        activeProviderId = parsed.activeProviderId
      if (typeof parsed.activeModelId === 'string')
        activeModelId = parsed.activeModelId
      if (parsed.providerCredentials && typeof parsed.providerCredentials === 'object')
        providerCredentials = parsed.providerCredentials as Record<string, Record<string, unknown>>
    }
    catch {
      // ignore
    }
  }

  async function switchCardScopeInner(nextCardIdRaw: unknown) {
    const nextCardId = normalizeCardId(nextCardIdRaw)
    if (nextCardId === activeCardId)
      return

    const previousCardId = activeCardId
    const startedAt = Date.now()
    await appendRuntimeDebugLine('card-scope.switch-started', {
      fromCardId: previousCardId,
      toCardId: nextCardId,
    })

    await flushCurrentSubconsciousState('card-switch').catch(() => {})
    sensoryBus.stop('manual')
    stopWatch()
    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    clearReminderDueTimer()
    turnWriteAbortControllers.clear()
    soulLifecycleState.queuedWrite = Promise.resolve()
    soulLifecycleState.soulSnapshot = null
    soulLifecycleState.watching = false
    soulLifecycleState.muteWatchUntil = 0
    soulLifecycleState.revision = 0

    await alicizationDb.close().catch(() => {})

    activeCardId = nextCardId
    ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
    alicizationDb = await setupAlicizationDb(userDataPath, {
      cardId: activeCardId,
      resolveEmbeddingProvider: resolveLongTermMemoryEmbeddingProvider,
      resolveMemoryTrialProvider: () => memoryTrialProvider,
      personaTrainingExecutor: createLocalPersonaTrainingExecutor(soulRoot),
      resolvePersonaTrainingExecutorConfig: () => clonePersonaTrainingExecutorConfig(personaTrainingExecutorConfig),
    })
    await restoreScopedKillSwitch(activeCardId)
    await restoreActiveSessionId(activeCardId)
    await restoreDialogueAckMap(activeCardId)
    await restoreSubconsciousState(activeCardId)
    await restoreExecutionDeliveryState(activeCardId)

    sensoryBus = createAlicizationSensoryBus({
      tickMs: 60_000,
      staleMs: 90_000,
      cpuWindowMs: 1_000,
      appendAuditLog: input => appendAuditLog(input, activeCardId),
    })

    if (!isAlicizationKillSwitchSuspended() && getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED') {
      sensoryBus.start()
    }
    startMemorySalienceRefreshTimer()
    await scheduleNextReminderDueCheck('card-scope-switch')
    await appendRuntimeDebugLine('card-scope.switch-completed', {
      fromCardId: previousCardId,
      toCardId: activeCardId,
      elapsedMs: Date.now() - startedAt,
    })
  }

  cardScopeOrchestrator = createAlicizationRuntimeCardScopeOrchestrator({
    scopeLifecycleQueueState,
    now: () => Date.now(),
    getActiveCardId: () => activeCardId,
    normalizeCardId,
    sanitizeText,
    appendRuntimeDebugLine,
    switchCardScopeInner: async nextCardIdRaw => await switchCardScopeInner(nextCardIdRaw),
  })
  const switchCardScope = cardScopeOrchestrator.switchCardScope
  const cardScopeLifecycleRuntime = createAlicizationRuntimeCardScopeLifecycle({
    now: () => Date.now(),
    getActiveCardId: () => activeCardId,
    defaultAlicizationCardId,
    normalizeCardId,
    listKnownCardIds,
    switchCardScope: async nextCardIdRaw => await switchCardScope(nextCardIdRaw),
    abortAllTurnWrites: async reason => await abortAllTurnWrites(reason),
    clearReminderDueTimer,
    clearAllPendingDialogueDeliveries,
    clearQueuedSubconsciousWake,
    clearExecutionDeliveryStateAll: () => executionDeliveryRuntime.clear(),
    clearExecutionDeliveryStateCard: (cardId: string) => executionDeliveryRuntime.clear(cardId),
    clearMainChatFinishedRuns: () => mainChatRunState.clearFinishedRuns(),
    clearMainChatRunsAll: () => mainChatRunState.clearAll(),
    clearDialogueDeliveryCardState: (cardId: string) => dialogueDeliveryRuntime.clearCardState(cardId),
    clearDialogueDeliveryAllState: () => dialogueDeliveryRuntime.clearAllState(),
    clearDialogueSessionMirrorCard: (cardId: string) => dialogueSessionManager.clear(cardId),
    clearDialogueSessionMirrorAll: () => dialogueSessionManager.clear(),
    clearPendingDialogueDeliveriesByCard,
    stopWatch,
    stopSensoryBus: () => sensoryBus.stop('manual'),
    clearPruneTimer: () => {
      if (pruneTimer) {
        clearInterval(pruneTimer)
        pruneTimer = undefined
      }
    },
    clearSubconsciousTimer: () => {
      if (subconsciousTimer) {
        clearInterval(subconsciousTimer)
        subconsciousTimer = undefined
      }
    },
    clearDreamTimer: () => {
      if (dreamTimer) {
        clearInterval(dreamTimer)
        dreamTimer = undefined
      }
    },
    turnWriteAbortControllers,
    alicizationDb: {
      clearConversationData: () => alicizationDb.clearConversationData(),
      setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
      close: () => alicizationDb.close(),
    },
    activeSessionIdByCard,
    subconsciousStateByCard,
    proactiveLoopStateByCard,
    perceptionStateByCard,
    visualPresenceStateByCard,
    visualPresenceCapturePersistMetaByCard,
    screenSemanticCacheByCard,
    pendingDurabilityPulseByCard,
    foregroundProbeTimeoutStreakByPid,
    resetSubconsciousTickInFlight: () => {
      subconsciousTickInFlight = null
    },
    resetSoulLifecycleState: () => {
      soulLifecycleState.queuedWrite = Promise.resolve()
      soulLifecycleState.soulSnapshot = null
      soulLifecycleState.watching = false
      soulLifecycleState.muteWatchUntil = 0
      soulLifecycleState.revision = 0
    },
    removeAlicizationsRoot: async () => {
      await rm(join(userDataPath, 'alicizations'), { recursive: true, force: true })
      personaTrainingExecutorConfig = null
      personaTrainingExecutorConfigError = null
    },
    resetProviderConfig: () => {
      activeProviderId = ''
      activeModelId = ''
      providerCredentials = {}
    },
    resetKillSwitches: () => {
      setAlicizationKillSwitchState('ACTIVE', 'delete-all-data')
      setAlicizationCardKillSwitchState(defaultAlicizationCardId, 'ACTIVE', 'delete-all-data')
    },
    reinitializeDefaultScope: async () => {
      activeCardId = defaultAlicizationCardId
      ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
      alicizationDb = await setupAlicizationDb(userDataPath, {
        cardId: activeCardId,
        resolveEmbeddingProvider: resolveLongTermMemoryEmbeddingProvider,
        resolveMemoryTrialProvider: () => memoryTrialProvider,
        personaTrainingExecutor: createLocalPersonaTrainingExecutor(soulRoot),
        resolvePersonaTrainingExecutorConfig: () => clonePersonaTrainingExecutorConfig(personaTrainingExecutorConfig),
      })
      await restoreScopedKillSwitch(activeCardId)
      await restoreActiveSessionId(activeCardId)
      await restoreDialogueAckMap(activeCardId)
      await restoreSubconsciousState(activeCardId)
      await restoreProactiveLoopState(activeCardId)
      await restoreExecutionDeliveryState(activeCardId)

      sensoryBus = createAlicizationSensoryBus({
        tickMs: 60_000,
        staleMs: 90_000,
        cpuWindowMs: 1_000,
        appendAuditLog: input => appendAuditLog(input, activeCardId),
      })
      if (!isAlicizationKillSwitchSuspended() && getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
        sensoryBus.start()

      await persistLlmConfigToDisk().catch(() => {})
      await bootstrap()
      await scheduleNextReminderDueCheck('delete-all-data:reinitialize').catch(() => {})
      startMemorySalienceRefreshTimer()
      startSubconsciousTimer()
      startDreamTimer()
      emitKillSwitchChanged(activeCardId)
    },
    emitVisualPresenceState,
    appendRuntimeDebugLine,
    appendAuditLog,
    scheduleNextReminderDueCheck: async reason => await scheduleNextReminderDueCheck(reason),
    activeSessionMetaKey: alicizationCardActiveSessionMetaKey,
    dialogueAckStateMetaKey: alicizationDialogueAckStateMetaKey,
    dialogueReplyFeedbackAckMetaKey: alicizationDialogueReplyFeedbackAckMetaKey,
    proactiveLoopStateMetaKey: alicizationProactiveLoopStateMetaKey,
    executionDeliveryStateMetaKey: alicizationExecutionDeliveryStateMetaKey,
    perceptionStateMetaKey: alicizationPerceptionStateMetaKey,
    visualPresenceStateMetaKey: alicizationVisualPresenceStateMetaKey,
  })
  const clearAllConversationData = cardScopeLifecycleRuntime.clearAllConversationData
  const deleteAllAlicizationData = cardScopeLifecycleRuntime.deleteAllAlicizationData

  type ReminderScheduleSource = 'tool' | 'manual-fallback' | 'autonomy'

  async function scheduleReminderTask(
    cardId: string,
    input: {
      minutes: unknown
      message: unknown
      sourceTurnId?: string
    },
    source: ReminderScheduleSource,
  ): Promise<AlicizationReminderScheduleResult> {
    const debugPrefix = source === 'tool'
      ? 'reminder.tool-execute'
      : source === 'autonomy'
        ? 'reminder.autonomy-schedule'
        : 'reminder.manual-schedule'
    await appendRuntimeDebugLine(`${debugPrefix}-requested`, {
      cardId,
      minutes: input.minutes,
      sourceTurnId: sanitizeText(input.sourceTurnId),
      messagePreview: sanitizeBriefText(String(input.message ?? ''), 120),
    })

    const parsedMinutes = Number(input.minutes)
    if (!Number.isFinite(parsedMinutes)) {
      await appendRuntimeDebugLine(`${debugPrefix}-rejected`, {
        cardId,
        reason: 'invalid-minutes-not-finite',
        minutes: input.minutes,
      })
      return {
        status: 'error',
        code: 'ALICIZATION_REMINDER_INVALID_MINUTES',
        message: 'Reminder minutes must be a valid number.',
      }
    }

    const normalizedMinutes = Math.floor(parsedMinutes)
    if (normalizedMinutes < reminderMinMinutes || normalizedMinutes > reminderMaxMinutes) {
      await appendRuntimeDebugLine(`${debugPrefix}-rejected`, {
        cardId,
        reason: 'invalid-minutes-out-of-range',
        normalizedMinutes,
        min: reminderMinMinutes,
        max: reminderMaxMinutes,
      })
      return {
        status: 'error',
        code: 'ALICIZATION_REMINDER_INVALID_MINUTES',
        message: `Reminder minutes must be between ${reminderMinMinutes} and ${reminderMaxMinutes}.`,
      }
    }

    const normalizedMessage = normalizeReminderMessage(String(input.message ?? ''))
    if (!normalizedMessage) {
      await appendRuntimeDebugLine(`${debugPrefix}-rejected`, {
        cardId,
        reason: 'invalid-message-empty',
      })
      return {
        status: 'error',
        code: 'ALICIZATION_REMINDER_INVALID_MESSAGE',
        message: 'Reminder message must be a non-empty string.',
      }
    }

    if (normalizedMessage.length > reminderMaxMessageChars) {
      await appendRuntimeDebugLine(`${debugPrefix}-rejected`, {
        cardId,
        reason: 'invalid-message-too-long',
        length: normalizedMessage.length,
        limit: reminderMaxMessageChars,
      })
      return {
        status: 'error',
        code: 'ALICIZATION_REMINDER_INVALID_MESSAGE',
        message: `Reminder message must be at most ${reminderMaxMessageChars} characters.`,
      }
    }

    const triggerAt = Date.now() + normalizedMinutes * 60_000
    const taskId = `reminder:${cardId}:${Date.now()}:${randomUUID().slice(0, 8)}`
    const sourceTurnId = sanitizeText(input.sourceTurnId)
    const record = await withCardScope(cardId, async () => await alicizationDb.insertScheduledTask({
      taskId,
      triggerAt,
      message: normalizedMessage,
      sourceTurnId: sourceTurnId || undefined,
    }), {
      label: source === 'tool'
        ? `tool:set-reminder:${cardId}`
        : source === 'autonomy'
          ? `autonomy:set-reminder:${cardId}`
          : `manual:set-reminder:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })

    await appendRuntimeDebugLine('reminder.task-inserted', {
      cardId,
      source,
      taskId: record.taskId,
      sourceTurnId: sourceTurnId || undefined,
      createdAt: record.createdAt,
      createdIso: new Date(record.createdAt).toISOString(),
      triggerAt: record.triggerAt,
      triggerIso: new Date(record.triggerAt).toISOString(),
      delayMs: record.triggerAt - record.createdAt,
      delayMinutes: Number(((record.triggerAt - record.createdAt) / 60_000).toFixed(2)),
      messagePreview: sanitizeBriefText(record.message, 120),
    })

    await queueScopedAuditLog(cardId, {
      level: 'notice',
      category: 'alicization.reminder',
      action: 'alicization.reminder.task.created',
      message: source === 'tool'
        ? 'Created reminder task via main gateway top-level tool.'
        : source === 'autonomy'
          ? 'Created reminder task from the subconscious autonomy loop.'
          : 'Created reminder task via deterministic fallback scheduler.',
      payload: {
        taskId: record.taskId,
        triggerAt: record.triggerAt,
        minutes: normalizedMinutes,
        source,
        sourceTurnId: sourceTurnId || undefined,
      },
    })

    await scheduleNextReminderDueCheck('task-created')

    return {
      status: 'scheduled',
      taskId: record.taskId,
      triggerTime: new Date(record.triggerAt).toISOString(),
      triggerAt: record.triggerAt,
      message: record.message,
    }
  }

  function clearReminderDueTimer() {
    if (!reminderDueTimer)
      return
    clearTimeout(reminderDueTimer)
    reminderDueTimer = undefined
  }

  async function scheduleNextReminderDueCheck(reason: string) {
    clearReminderDueTimer()

    if (isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
      await appendRuntimeDebugLine('reminder.next-due-skipped', {
        cardId: activeCardId,
        reason: 'kill-switch-suspended',
        trigger: reason,
      })
      return
    }

    const pendingPreview = await alicizationDb.listPendingScheduledTasks(1).catch(() => [])
    const nextPending = pendingPreview.at(0)
    if (!nextPending) {
      await appendRuntimeDebugLine('reminder.next-due-none', {
        cardId: activeCardId,
        trigger: reason,
      })
      return
    }

    const nowMs = Date.now()
    const dueInMs = Math.max(0, nextPending.triggerAt - nowMs)
    const timeoutMs = resolveReminderDueTimerDelay({
      nowMs,
      triggerAt: nextPending.triggerAt,
      startupGrace: reason === 'startup',
    })
    await appendRuntimeDebugLine('reminder.next-due-scheduled', {
      cardId: activeCardId,
      trigger: reason,
      taskId: nextPending.taskId,
      triggerAt: nextPending.triggerAt,
      triggerIso: new Date(nextPending.triggerAt).toISOString(),
      dueInMs,
      timeoutMs,
    })

    reminderDueTimer = setTimeout(() => {
      reminderDueTimer = undefined
      void appendRuntimeDebugLine('reminder.next-due-fired', {
        cardId: activeCardId,
        taskId: nextPending.taskId,
      })

      if (subconsciousTickInFlight) {
        const retryInMs = resolveReminderDueTimerDelay({
          nowMs: Date.now(),
          triggerAt: nextPending.triggerAt,
          deferredBecauseTickInFlight: true,
        })
        void appendRuntimeDebugLine('reminder.next-due-deferred', {
          cardId: activeCardId,
          reason: 'tick-in-flight',
          retryInMs,
        })
        reminderDueTimer = setTimeout(() => {
          reminderDueTimer = undefined
          void scheduleNextReminderDueCheck('deferred-after-inflight').catch(() => {})
        }, retryInMs)
        return
      }

      subconsciousTickInFlight = runSubconsciousTickAcrossCards('force', [activeCardId])
      void subconsciousTickInFlight.catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.reminder',
          action: 'next-due-trigger-failed',
          message: 'Reminder next-due trigger failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
            cardId: activeCardId,
          },
        })
      }).finally(() => {
        subconsciousTickInFlight = null
        void scheduleNextReminderDueCheck('post-next-due-trigger').catch(() => {})
      })
    }, timeoutMs)
  }

  function startMemorySalienceRefreshTimer() {
    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    pruneTimer = setInterval(() => {
      void alicizationDb.runMemoryPrune().catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'memory',
          action: 'salience-refresh-scheduled-failed',
          message: 'Scheduled memory salience refresh failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      })
    }, 24 * 60 * 60 * 1000)
  }

  function startSubconsciousTimer() {
    if (subconsciousTimer) {
      clearInterval(subconsciousTimer)
      subconsciousTimer = undefined
    }
    subconsciousTimer = setInterval(() => {
      if (subconsciousTickInFlight) {
        void appendRuntimeDebugLine('subconscious.timer.skipped', {
          reason: 'tick-in-flight',
          activeCardId,
        })
        return
      }

      void appendRuntimeDebugLine('subconscious.timer.fired', {
        activeCardId,
        tickMs: alicizationSubconsciousTickMs,
      })

      subconsciousTickInFlight = runSubconsciousTickAcrossCards('timer')
      void subconsciousTickInFlight.catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.subconscious',
          action: 'tick-failed',
          message: 'Background subconscious tick failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }).finally(() => {
        subconsciousTickInFlight = null
      })
    }, alicizationSubconsciousTickMs)
  }

  function startDreamTimer() {
    if (dreamTimer) {
      clearInterval(dreamTimer)
      dreamTimer = undefined
    }
    if (backgroundMaintenanceStartupTimer) {
      clearTimeout(backgroundMaintenanceStartupTimer)
      backgroundMaintenanceStartupTimer = undefined
    }
    let running = false
    let lastScheduleKey = ''
    const makeDayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    const runScheduledDream = async (reason: string, key: string) => {
      if (running)
        return
      running = true
      try {
        await runDreamAcrossCards(reason)
        lastScheduleKey = key
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dream',
          action: reason === 'schedule-catch-up' ? 'catch-up-failed' : 'scheduled-failed',
          message: reason === 'schedule-catch-up'
            ? 'Catch-up dreaming run failed after missing schedule window.'
            : 'Scheduled dreaming run failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
      finally {
        running = false
      }
    }

    void (async () => {
      const now = new Date()
      const key = makeDayKey(now)
      if (now.getHours() < 3 || key === lastScheduleKey)
        return
      await runScheduledDream('schedule-catch-up', key)
    })()

    dreamTimer = setInterval(() => {
      const now = new Date()
      const key = makeDayKey(now)
      const inWindow = now.getHours() === 3 && now.getMinutes() < 10
      if (!inWindow || key === lastScheduleKey)
        return
      void runScheduledDream('schedule-03:00', key)
    }, 60_000)
  }

  function startBackgroundMaintenance() {
    if (!backgroundMaintenanceEnabled || backgroundMaintenanceStarted)
      return
    backgroundMaintenanceStarted = true
    void alicizationDb.resumePendingMemoryEmbeddingReindexJobs().catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'memory',
        action: 'embedding-reindex-startup-failed',
        message: 'Pending embedding reindex recovery failed during background startup.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
    })
    startMemorySalienceRefreshTimer()
    startSubconsciousTimer()
    startDreamTimer()
  }

  function scheduleBackgroundMaintenanceStartup(reason: string) {
    if (!backgroundMaintenanceEnabled || backgroundMaintenanceStarted || backgroundMaintenanceStartupTimer)
      return
    void appendRuntimeDebugLine('background-maintenance.startup-scheduled', {
      reason,
      delayMs: 30_000,
    })
    backgroundMaintenanceStartupTimer = setTimeout(() => {
      backgroundMaintenanceStartupTimer = undefined
      void appendRuntimeDebugLine('background-maintenance.started', {
        reason: 'after-first-foreground-turn',
      })
      startBackgroundMaintenance()
    }, 30_000)
  }

  function createTurnWriteAbortSignal(turnId?: string) {
    const normalizedTurnId = turnId?.trim()
    if (!normalizedTurnId)
      return undefined

    const existing = turnWriteAbortControllers.get(normalizedTurnId)
    if (existing)
      return existing.signal

    const controller = new AbortController()
    turnWriteAbortControllers.set(normalizedTurnId, controller)
    return controller.signal
  }

  function releaseTurnWriteAbortController(turnId?: string) {
    const normalizedTurnId = turnId?.trim()
    if (!normalizedTurnId)
      return
    turnWriteAbortControllers.delete(normalizedTurnId)
  }

  async function abortAllTurnWrites(reason: string) {
    let aborted = 0
    for (const controller of turnWriteAbortControllers.values()) {
      if (controller.signal.aborted)
        continue
      controller.abort(createAbortError(reason))
      aborted += 1
    }
    turnWriteAbortControllers.clear()

    const abortedChatRuns = await abortAlicizationRunningChatRuns({
      runs: chatRuns.entries(),
      reason,
      mainChatRunState,
      createAbortError,
    })

    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'kill-switch-abort-broadcast',
      message: 'Broadcasted kill switch abort to pending runtime turn writes.',
      payload: {
        reason,
        aborted,
        abortedChatRuns,
      },
    })
  }

  async function writeAtomicContent(path: string, category: string, content: string) {
    await writeAlicizationAtomicContent({
      path,
      category,
      content,
      directoryFsyncPath: soulRoot,
      platform,
      processId: pid,
      randomId: randomUUID,
      renameRetryDelaysMs: winRenameRetryDelaysMs,
      appendAuditLog,
    })
  }

  async function writeSoulContent(content: string) {
    await writeAtomicContent(soulPath, 'soul', content)
  }

  async function suspendKillSwitch(reason?: string) {
    const normalizedReason = reason ?? 'manual'
    const abortPromise = abortAllTurnWrites(normalizedReason)
    sensoryBus.stop('kill-switch')
    clearReminderDueTimer()
    const [snapshot] = await Promise.all([
      persistScopedKillSwitch(activeCardId, 'SUSPENDED', reason),
      abortPromise,
    ])
    emitKillSwitchChanged()
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'suspend',
      message: 'Kill switch set to SUSPENDED.',
      payload: {
        reason: normalizedReason,
      },
    })
    return snapshot
  }

  async function resumeKillSwitch(reason?: string) {
    const snapshot = await persistScopedKillSwitch(activeCardId, 'ACTIVE', reason)
    if (!isAlicizationKillSwitchSuspended())
      sensoryBus.start()
    await scheduleNextReminderDueCheck('kill-switch-resume')
    emitKillSwitchChanged()
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'resume',
      message: 'Kill switch resumed to ACTIVE.',
      payload: {
        reason: reason ?? 'manual',
      },
    })
    return snapshot
  }

  async function suspendGlobalKillSwitch(reason?: string) {
    const snapshot = setAlicizationKillSwitchState('SUSPENDED', reason)
    sensoryBus.stop('kill-switch')
    clearReminderDueTimer()
    await abortAllTurnWrites(reason ?? 'manual')
    emitKillSwitchChanged(activeCardId)
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'global-suspend',
      message: 'Global kill switch set to SUSPENDED.',
      payload: {
        reason: reason ?? 'manual',
      },
    })
    return snapshot
  }

  async function resumeGlobalKillSwitch(reason?: string) {
    const snapshot = setAlicizationKillSwitchState('ACTIVE', reason)
    if (getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
      sensoryBus.start()
    await scheduleNextReminderDueCheck('global-kill-switch-resume')
    emitKillSwitchChanged(activeCardId)
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'global-resume',
      message: 'Global kill switch resumed to ACTIVE.',
      payload: {
        reason: reason ?? 'manual',
      },
    })
    return snapshot
  }

  async function appendConversationTurnWithGuards(payload: AlicizationConversationTurnInput & {
    turnRuntimeContext?: unknown
    onPersisted?: (() => Promise<void> | void) | null
  }) {
    const payloadStructured = payload.structured && typeof payload.structured === 'object'
      ? payload.structured as Record<string, unknown>
      : null
    const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId: payload.turnId,
      rawFormat: payloadStructured?.format,
      origin: payload.origin,
    })
    const originOnlyAutonomousSpoof
      = isAlicizationAutonomousDialogueOrigin(payload.origin)
        && !autonomousDialogueFamily.matchedBy.includes('turn-id-prefix')
        && !autonomousDialogueFamily.matchedBy.includes('structured-format')

    if (originOnlyAutonomousSpoof) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dialogue',
        action: 'autonomous-turn-spoof-rejected',
        message: 'Rejected an autonomous dialogue turn because it only claimed proactive origin without structural family proof.',
        payload: {
          turnId: payload.turnId ?? null,
          sessionId: normalizeSessionId(payload.sessionId) || null,
          origin: payload.origin,
          matchedBy: autonomousDialogueFamily.matchedBy,
          structuredFormat: payloadStructured?.format ?? null,
        },
      })
      return false
    }

    const normalizedSessionId = normalizeSessionId(payload.sessionId) || await ensureActiveOrLatestSessionId(activeCardId)
    if (normalizeSessionId(payload.sessionId))
      await persistActiveSessionId(activeCardId, normalizedSessionId)
    const normalizedCreatedAt = Number.isFinite(payload.createdAt)
      ? Math.max(0, Math.floor(Number(payload.createdAt)))
      : Date.now()

    let normalizedPayload: AlicizationConversationTurnInput = {
      ...payload,
      sessionId: normalizedSessionId,
      origin: autonomousDialogueFamily.isAutonomous
        ? autonomousDialogueFamily.canonicalOrigin ?? resolveAlicizationAutonomousDialogueOrigin('proactive')
        : 'user-turn',
      createdAt: normalizedCreatedAt,
    }
    const pendingMindTraceTelemetry = normalizedPayload.turnId
      ? pendingMindTraceTelemetryByTurnId.get(normalizedPayload.turnId) ?? null
      : null
    const payloadVisibleReplyRealization = normalizeVisibleReplyRealizationTelemetry(payload.visibleReplyRealization)

    const performanceManifest = await getPerformanceManifest()
    const governedTurn = coerceConversationTurnToMindGovernedPayload(normalizedPayload, performanceManifest, {
      currentConsciousFrame: visualPresenceStateByCard.get(activeCardId)?.currentConsciousFrame ?? null,
    })
    normalizedPayload = {
      ...governedTurn.payload,
      structured: normalizePersistedConversationTurnStructure({
        structured: governedTurn.payload.structured && typeof governedTurn.payload.structured === 'object'
          ? governedTurn.payload.structured as Record<string, unknown>
          : null,
      }) ?? governedTurn.payload.structured,
    }
    if (governedTurn.tookOver && governedTurn.governance) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dialogue',
        action: 'mind-governance-takeover',
        message: 'Mind governance rewrote the final user-turn structured payload before persistence.',
        payload: {
          turnId: normalizedPayload.turnId,
          sessionId: normalizedPayload.sessionId,
          turnMode: governedTurn.governance.turnMode,
          repairState: governedTurn.governance.repairState,
          replyOverridden: governedTurn.replyOverridden,
          overrideClass: governedTurn.overrideClass ?? 'none',
          fallbackPatternId: governedTurn.fallbackPatternId ?? 'none',
          reasons: governedTurn.reasons,
          format: readStringValue((normalizedPayload.structured as Record<string, unknown> | undefined)?.format),
          ...governedTurn.audit,
        },
      })
    }

    if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.userText).length > 0) {
      const proactiveStateBeforeSettlement = await ensureProactiveLoopState(activeCardId).catch(() => null)
      const proactiveRecentOutcomeCountBeforeSettlement = proactiveStateBeforeSettlement?.recentOutcomes.length ?? 0
      const proactiveStateAfterSettlement = await settlePendingProactiveOutcomesFromUserTurn(
        activeCardId,
        normalizedCreatedAt,
        'append-conversation-turn',
        {
          userText: normalizedPayload.userText,
        },
      ).catch(() => proactiveStateBeforeSettlement)
      const newlySettledProactiveOutcomes = proactiveStateAfterSettlement?.recentOutcomes.slice(proactiveRecentOutcomeCountBeforeSettlement) ?? []
      if (newlySettledProactiveOutcomes.length > 0) {
        await syncSessionMirrorFromCurrentCardState({
          cardId: activeCardId,
          proactiveOutcomes: newlySettledProactiveOutcomes,
          sessionId: normalizedSessionId,
          source: 'proactive-feedback',
          turnId: normalizedPayload.turnId ?? null,
        })
      }
      await markSubconsciousInteraction(activeCardId)
    }

    if (isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
      await appendAuditLog({
        level: 'notice',
        category: 'kill-switch',
        action: 'turn-write-skipped-aborted',
        message: 'Skipped conversation turn persistence because kill switch is suspended.',
        payload: {
          sessionId: normalizedPayload.sessionId,
          turnId: normalizedPayload.turnId,
        },
      })
      return false
    }

    const signal = createTurnWriteAbortSignal(normalizedPayload.turnId)
    if (signal?.aborted) {
      releaseTurnWriteAbortController(normalizedPayload.turnId)
      await appendAuditLog({
        level: 'notice',
        category: 'kill-switch',
        action: 'turn-write-skipped-aborted',
        message: 'Skipped conversation turn persistence because turn write signal was already aborted.',
        payload: {
          sessionId: normalizedPayload.sessionId,
          turnId: normalizedPayload.turnId,
        },
      })
      return false
    }

    const areTurnSideEffectsAborted = () =>
      signal?.aborted === true
      || isAlicizationKillSwitchSuspended()
      || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED'
    const dropTurnSideEffectsIfAborted = () => areTurnSideEffectsAborted()
    const appendMindTurnTraceEvents = async (
      dialoguePayload?: AlicizationNormalizedDialogueRespondedPayload | null,
    ) => {
      if (areTurnSideEffectsAborted())
        return []
      const events = buildMindTurnTraceEvents({
        payload: normalizedPayload,
        governedTurn,
        createdAt: normalizedCreatedAt,
        dialoguePayload,
        memoryTrace: pendingMindTraceTelemetry?.memoryTrace ?? null,
      })
      if (events.length === 0)
        return [] as typeof events
      try {
        if (areTurnSideEffectsAborted())
          return [] as typeof events
        await alicizationDb.appendMindTurnEvents(events, { signal })
        if (areTurnSideEffectsAborted())
          return [] as typeof events
        const participation = events.find(event => event.kind === 'governance-normalized')?.payload?.participation
        if (participation && typeof participation === 'object') {
          await memoryRetrievalTelemetryRuntime.recordParticipation({
            mindParticipation: Number((participation as any).mindParticipation ?? 0),
            memoryParticipation: Number((participation as any).memoryParticipation ?? 0),
            personalityParticipation: Number((participation as any).personalityParticipation ?? 0),
            relationshipParticipation: Number((participation as any).relationshipParticipation ?? 0),
            continuityParticipation: Number((participation as any).continuityParticipation ?? 0),
          }).catch(() => {})
        }
      }
      catch (error) {
        if (areTurnSideEffectsAborted() || isAbortError(error))
          return [] as typeof events
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dialogue',
          action: 'mind-turn-events-append-failed',
          message: 'Failed to append replayable mind-turn events for governed dialogue persistence.',
          payload: {
            turnId: normalizedPayload.turnId,
            sessionId: normalizedPayload.sessionId,
            decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
            reason: errorMessageFrom(error) ?? 'unknown-error',
          },
        })
      }
      return events
    }

    try {
      let persistedDialogueState: AlicizationVisualPresenceStateSnapshot | null = null
      let visualPresenceState: AlicizationVisualPresenceStateSnapshot | null = null
      const structured = normalizedPayload.structured && typeof normalizedPayload.structured === 'object'
        ? normalizedPayload.structured as Record<string, unknown>
        : null
      const memorySideFailures = Array.isArray(structured?.memoryFailures)
        ? structured.memoryFailures.flatMap((rawFailure, index) => {
            if (!rawFailure || typeof rawFailure !== 'object' || Array.isArray(rawFailure))
              return []

            const failure = rawFailure as Record<string, unknown>
            const stage = readStringValue(failure.stage)
            const kind = readStringValue(failure.kind)
            if (
              failure.origin !== 'failure-surface'
              || !kind
              || (
                stage !== 'long-term-memory-recall'
                && stage !== 'working-memory-history'
                && stage !== 'working-memory-checkpoint-load'
                && stage !== 'working-memory-checkpoint-save'
                && stage !== 'working-memory-long-term-queue'
                && stage !== 'working-memory-long-term-drain'
                && stage !== 'dialogue-session-mirror-commit'
                && stage !== 'autobiographical-memory-write'
                && stage !== 'persona-learning-schedule'
                && stage !== 'runtime-event-store'
                && stage !== 'memory-turn-settlement'
              )
            ) {
              return []
            }

            return [{
              failure,
              index,
              kind,
              stage,
            }]
          })
        : []
      await alicizationDb.appendConversationTurn(normalizedPayload, { signal })
      if (dropTurnSideEffectsIfAborted())
        return true

      for (const memorySideFailure of memorySideFailures) {
        if (dropTurnSideEffectsIfAborted())
          return true
        const parentTurnId = sanitizeText(normalizedPayload.turnId, '')
        if (!parentTurnId)
          continue

        const failureSurface = {
          ...memorySideFailure.failure,
          kind: memorySideFailure.kind,
          origin: 'failure-surface' as const,
          allowLongTermCondensation: false as const,
          allowPersonaLearning: false as const,
          allowTraining: false as const,
        }
        try {
          await alicizationDb.appendConversationTurn({
            turnId: `${parentTurnId}:memory-failure:${memorySideFailure.stage}:${memorySideFailure.index}`,
            sessionId: normalizedSessionId,
            origin: normalizedPayload.origin,
            structured: {
              format: 'alicization-memory-side-failure-v1',
              origin: 'failure-surface',
              artifactRole: 'memory-side-failure',
              parentTurnId,
              stage: memorySideFailure.stage,
              learningPolicy: {
                allowLongTermCondensation: false,
                allowPersonaLearning: false,
                allowTraining: false,
              },
              failureSurface,
            },
            createdAt: Number.isFinite(memorySideFailure.failure.occurredAt)
              ? Number(memorySideFailure.failure.occurredAt)
              : normalizedCreatedAt,
          }, { signal })
        }
        catch (error) {
          if (dropTurnSideEffectsIfAborted())
            return true
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.dialogue',
            action: 'memory-side-failure-persistence-failed',
            message: 'Failed to persist an independent memory side-failure artifact after the Provider turn was saved.',
            payload: {
              parentTurnId,
              sessionId: normalizedSessionId,
              stage: memorySideFailure.stage,
              failureKind: memorySideFailure.kind,
              reason: errorMessageFrom(error) ?? 'unknown-error',
            },
          })
        }
        if (dropTurnSideEffectsIfAborted())
          return true
      }
      await payload.onPersisted?.()
      if (dropTurnSideEffectsIfAborted())
        return true

      const structuredFailureSurface = structured?.failureSurface && typeof structured.failureSurface === 'object'
        ? structured.failureSurface as Record<string, unknown>
        : null
      const structuredLearningPolicy = structured?.learningPolicy && typeof structured.learningPolicy === 'object'
        ? structured.learningPolicy as Record<string, unknown>
        : null
      const artifactOrigin = structuredFailureSurface?.origin === 'failure-surface'
        ? 'failure-surface' as const
        : structured?.origin === 'provider'
          || structured?.origin === 'failure-surface'
          || structured?.origin === 'authorization-surface'
          ? structured.origin
          : null
      const hasTypedLearningMetadata = Boolean(
        artifactOrigin
        || structuredLearningPolicy
        || structuredFailureSurface,
      )
      const artifactLearningPolicy = structuredLearningPolicy
        ? {
            allowLongTermCondensation: structuredLearningPolicy.allowLongTermCondensation === true,
            allowPersonaLearning: structuredLearningPolicy.allowPersonaLearning === true,
            allowTraining: false,
          }
        : structuredFailureSurface
          ? {
              allowLongTermCondensation: false,
              allowPersonaLearning: false,
              allowTraining: false,
            }
          : null
      const artifactContaminated = containsAlicizationFixedTemplateResidue([
        normalizedPayload.assistantText ?? '',
        readStringValue(structured?.reply),
      ].join('\n'), {
        provenance: 'internal-structured-fact',
      })
      const learningEligibility = hasTypedLearningMetadata
        ? artifactOrigin && artifactLearningPolicy
          ? resolveAlicizationLearningEligibility({
              origin: artifactOrigin,
              learningPolicy: artifactLearningPolicy,
              contaminated: artifactContaminated,
            })
          : {
              allowLongTermCondensation: false,
              allowPersonaLearning: false,
              allowTraining: false,
            }
        : {
            allowLongTermCondensation: false,
            allowPersonaLearning: false,
            allowTraining: false,
          }
      const allowDialogueLearning = learningEligibility.allowLongTermCondensation
        || learningEligibility.allowPersonaLearning
      const visibleReplyExecution = structured?.visibleReplyExecution
        && typeof structured.visibleReplyExecution === 'object'
        && !Array.isArray(structured.visibleReplyExecution)
        ? structured.visibleReplyExecution as Record<string, unknown>
        : null
      const visibleReplyAuthority = readStringValue(structured?.visibleReplyAuthority)
        || readStringValue(visibleReplyExecution?.actualVisibleReplyAuthority)
      const shouldTrackDialogueContinuity = artifactOrigin !== 'failure-surface'
        && artifactOrigin !== 'authorization-surface'
        && visibleReplyAuthority !== 'local-deterministic-fallback'
        && visibleReplyAuthority !== 'non-human-authored-blocked'
      if (!allowDialogueLearning) {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.dialogue',
          action: 'visible-artifact-learning-blocked',
          message: 'Persisted the visible artifact for audit without running memory or persona learning side effects.',
          payload: {
            turnId: normalizedPayload.turnId,
            sessionId: normalizedPayload.sessionId,
            artifactOrigin,
            failureKind: readStringValue(structuredFailureSurface?.kind) || null,
            contaminated: artifactContaminated,
            learningEligibility,
          },
        })
      }
      const derivedBundleForLearning = normalizeAlicizationDerivedMindStateBundle(structured?.derivedMindStateBundle ?? null)
      const emotionalKernelForPersistence = derivedBundleForLearning?.emotionalKernel ?? null
      if (
        learningEligibility.allowPersonaLearning
        && derivedBundleForLearning?.selfEvolution
        && normalizedPayload.origin === 'user-turn'
      ) {
        if (dropTurnSideEffectsIfAborted())
          return true
        const retrievedFactsForLearning = Array.isArray(structured?.retrievedFacts)
          ? (structured.retrievedFacts as unknown[]).filter(item => item && typeof item === 'object')
          : []
        await learningActionScheduler.scheduleLearningTask({
          context: {
            hostAttitude: '',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: retrievedFactsForLearning as any,
            recalledFragments: [],
            selfEvolution: derivedBundleForLearning.selfEvolution,
            decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
            sessionId: normalizedPayload.sessionId ?? null,
          },
          turnId: normalizedPayload.turnId ?? null,
          signal,
        }).catch(() => {})
        if (dropTurnSideEffectsIfAborted())
          return true
      }
      if (
        shouldTrackDialogueContinuity
        && normalizedPayload.origin === 'user-turn'
        && sanitizeText(normalizedPayload.assistantText).length > 0
      ) {
        try {
          if (dropTurnSideEffectsIfAborted())
            return true
          visualPresenceState = await ensureVisualPresenceState(activeCardId, { signal })
          if (dropTurnSideEffectsIfAborted())
            return true
          const dialogueWorldThread = registerDialogueWorldThreadAssistantTurn({
            now: normalizedCreatedAt,
            previous: visualPresenceState.dialogueWorldThread ?? null,
            conversationState: visualPresenceState.conversationState,
            replyDeliberation: visualPresenceState.replyDeliberation,
            answerCompiler: visualPresenceState.answerCompiler,
            assistantText: normalizedPayload.assistantText,
            runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
          })
          if (dialogueWorldThread) {
            const persistedRuntimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
            const previousDialogueWorldThread = visualPresenceState.dialogueWorldThread
            const previousConversationState = visualPresenceState.conversationState
            const proactiveHostContexts = buildHostSocialContexts({
              workloadKind: visualPresenceState.currentScene?.workloadKind ?? null,
              extraContexts: ['open-window'],
            })
            const basePersistedPersonStateProjection = buildAlicizationPersonStateProjection({
              now: normalizedCreatedAt,
              contexts: proactiveHostContexts,
              autobiographicalSelf: persistedRuntimeSurface.memory.autobiographicalSelf ?? null,
              hostPersonModel: null,
              longHorizonMemory: persistedRuntimeSurface.memory.longHorizonMemory ?? null,
              motiveEngine: persistedRuntimeSurface.memory.motiveEngine ?? null,
              habitPolicy: persistedRuntimeSurface.agency.habitPolicy ?? null,
              selfContinuity: persistedRuntimeSurface.memory.selfContinuity ?? null,
              selfState: persistedRuntimeSurface.agency.selfState ?? null,
              privateThought: persistedRuntimeSurface.cognition.privateThought ?? null,
              mindEcology: buildMindEcologyFromRuntimeSurface(persistedRuntimeSurface),
              selfEvolution: persistedRuntimeSurface.memory.selfEvolution ?? null,
              previousContinuityState: persistedRuntimeSurface.memory.personalityContinuityState ?? null,
            })
            const persistedPersonStateProjection = basePersistedPersonStateProjection
            const preservedConversationState = (() => {
              const currentConversationState = visualPresenceState.conversationState ?? null
              if (
                previousConversationState?.carryEligible === true
                && previousConversationState.carryReason
                && previousConversationState.continuityPolicy === 'stay-on-thread'
              ) {
                const baseConversationState = currentConversationState ?? previousConversationState
                return {
                  ...baseConversationState,
                  carryEligible: true,
                  carryReason: previousConversationState.carryReason,
                  continuityPolicy: 'stay-on-thread' as const,
                  narrative: Array.from(new Set([
                    ...(baseConversationState.narrative ?? []),
                    ...(previousConversationState.narrative ?? []),
                  ])).slice(0, 8),
                } satisfies AlicizationConversationStateSnapshot
              }
              return currentConversationState
            })()
            const preservedDialogueWorldThread = (() => {
              if (
                previousDialogueWorldThread?.carryEligible === true
                && previousDialogueWorldThread.carryReason
              ) {
                return {
                  ...dialogueWorldThread,
                  carryEligible: true,
                  carryReason: previousDialogueWorldThread.carryReason,
                  openLoops: Array.from(new Set([
                    ...(dialogueWorldThread.openLoops ?? []),
                    ...(previousDialogueWorldThread.openLoops ?? []),
                  ])).slice(0, 6),
                  narrative: Array.from(new Set([
                    ...(dialogueWorldThread.narrative ?? []),
                    ...(previousDialogueWorldThread.narrative ?? []),
                  ])).slice(0, 6),
                }
              }
              return dialogueWorldThread
            })()
            const nextVisualPresenceState = updateVisualPresenceState({
              now: normalizedCreatedAt,
              previousState: visualPresenceState,
              watchMode: visualPresenceState.watchMode,
              scene: visualPresenceState.currentScene,
              attention: visualPresenceState.attention,
              conversationState: preservedConversationState,
              dialogueWorldThread: preservedDialogueWorldThread,
              personStateProjection: persistedPersonStateProjection,
              currentConsciousFrame: visualPresenceState.currentConsciousFrame,
              initiative: visualPresenceState.initiative,
              emotionalKernel: emotionalKernelForPersistence ?? visualPresenceState.emotionalKernel,
              privateThought: visualPresenceState.privateThought,
              captureState: visualPresenceState.captureState,
              durabilityPulse: visualPresenceState.durabilityPulse,
              recentTransition: visualPresenceState.recentTransition,
              nextSuggestedProbeMs: visualPresenceState.nextSuggestedProbeMs,
            })
            const nextVisualPresenceStateWithBodyAuthority = bodyKernel.applyToVisualPresenceState({
              now: normalizedCreatedAt,
              previousState: visualPresenceState,
              candidateState: {
                ...nextVisualPresenceState,
                emotionalTransitionDecay: derivedBundleForLearning?.emotionalTransitionLedger
                  ? resolveAlicizationEmotionalTransitionDecay({
                      ledger: derivedBundleForLearning.emotionalTransitionLedger,
                      now: normalizedCreatedAt,
                      current: emotionalKernelForPersistence ?? visualPresenceState.emotionalKernel ?? null,
                    })
                  : null,
              },
              activeConversation: true,
            })
            if (dropTurnSideEffectsIfAborted())
              return true
            await persistVisualPresenceState(activeCardId, nextVisualPresenceStateWithBodyAuthority, { signal })
            if (dropTurnSideEffectsIfAborted())
              return true
            persistedDialogueState = nextVisualPresenceStateWithBodyAuthority
          }
          else {
            persistedDialogueState = visualPresenceState
          }
        }
        catch (error) {
          if (dropTurnSideEffectsIfAborted())
            return true
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.dialogue',
            action: 'dialogue-world-thread-register-failed',
            message: 'Failed to register the persisted assistant turn into the dialogue world thread.',
            payload: {
              turnId: normalizedPayload.turnId,
              sessionId: normalizedPayload.sessionId,
              reason: errorMessageFrom(error) ?? 'unknown-error',
            },
          })
        }
      }

      if (dropTurnSideEffectsIfAborted())
        return true

      let emittedDialoguePayload: AlicizationNormalizedDialogueRespondedPayload | null = null
      const performanceManifest = await getPerformanceManifest()
      if (dropTurnSideEffectsIfAborted())
        return true
      const dialoguePayload = normalizeDialogueRespondedPayload(
        normalizedPayload,
        performanceManifest,
        {
          residentPerformance: (persistedDialogueState ?? visualPresenceState)?.residentPerformance ?? null,
          currentConsciousFrame: visualPresenceStateByCard.get(activeCardId)?.currentConsciousFrame ?? null,
        },
      )
      if (dialoguePayload) {
        const rawStructured = normalizedPayload.structured
        const mergedStructured = rawStructured && typeof rawStructured === 'object'
          ? {
              ...(rawStructured as Record<string, unknown>),
              ...dialoguePayload.structured,
            }
          : dialoguePayload.structured
        if (rawStructured && typeof rawStructured === 'object') {
          const rawStructuredRecord = rawStructured as Record<string, unknown>
          if (rawStructuredRecord.embodiment && dialoguePayload.structured.embodiment) {
            mergedStructured.embodiment = dialoguePayload.structured.embodiment
          }
          if (rawStructuredRecord.embodimentScript && dialoguePayload.structured.embodimentScript) {
            mergedStructured.embodimentScript = dialoguePayload.structured.embodimentScript
          }
          if (rawStructuredRecord.digitalLife && dialoguePayload.structured.digitalLife) {
            mergedStructured.digitalLife = dialoguePayload.structured.digitalLife
          }
          if (rawStructuredRecord.performance && dialoguePayload.structured.performance) {
            mergedStructured.performance = dialoguePayload.structured.performance
          }
        }
        const enrichedStructured = normalizePersistedConversationTurnStructure({
          structured: mergedStructured as unknown as Record<string, unknown>,
        }) as typeof dialoguePayload.structured | null
        const enrichedDialoguePayload = {
          ...dialoguePayload,
          structured: enrichedStructured ?? dialoguePayload.structured,
        }
        const mergedVisibleReplyRealization = mergeVisibleReplyRealizationTelemetry({
          primary: enrichedDialoguePayload.visibleReplyRealization,
          payload: payloadVisibleReplyRealization,
          structured: enrichedDialoguePayload.structured.visibleReplyRealization,
          pending: pendingMindTraceTelemetry?.visibleReplyRealization,
        })
        if (mergedVisibleReplyRealization) {
          enrichedDialoguePayload.visibleReplyRealization = {
            version: 'visible-reply-realization-v1',
            expectedAuthority: mergedVisibleReplyRealization.expectedAuthority ?? 'llm-mind',
            actualAuthority: mergedVisibleReplyRealization.actualAuthority,
            providerMindExecuted: mergedVisibleReplyRealization.providerMindExecuted ?? false,
            mode: (mergedVisibleReplyRealization.mode as any) ?? 'provider-stream',
            visibleText: mergedVisibleReplyRealization.visibleText,
            visibleReplyValidationStatus: mergedVisibleReplyRealization.visibleReplyValidationStatus,
            nonHumanAuthoredStatus: mergedVisibleReplyRealization.nonHumanAuthoredStatus,
            blockedReasons: [...mergedVisibleReplyRealization.blockedReasons],
            reason: mergedVisibleReplyRealization.reason,
            critic: mergedVisibleReplyRealization.critic,
            closure: mergedVisibleReplyRealization.closure,
          }
          enrichedDialoguePayload.structured.visibleReplyRealization
            = enrichedDialoguePayload.visibleReplyRealization
        }
        if (isAlicizationAutonomousDialogueOrigin(enrichedDialoguePayload.origin) && enrichedDialoguePayload.structured.proactive) {
          const proactiveReasonCodes = enrichedDialoguePayload.structured.proactive.reasonCodes
          const proactiveAssistantText
            = dialoguePayload.assistantText?.trim()
              || readStringValue(enrichedDialoguePayload.structured.reply).trim()
              || null
          const learningAction = proactiveReasonCodes.find(code =>
            /^learning:(?:record|reflect|verify|revise|internalize|hold)$/u.test(code),
          )?.slice('learning:'.length) as
          | 'record'
          | 'reflect'
          | 'verify'
          | 'revise'
          | 'internalize'
          | 'hold'
          | undefined
          const learningFocuses = proactiveReasonCodes
            .filter(code => code.startsWith('learning-focus:'))
            .map(code => code.slice('learning-focus:'.length).trim())
            .filter(Boolean)
            .slice(0, 6)
          const proactiveState = await ensureProactiveLoopState(activeCardId, { signal })
          if (dropTurnSideEffectsIfAborted())
            return true
          const nextProactiveState = registerProactiveDelivery(proactiveState, {
            turnId: enrichedDialoguePayload.turnId,
            scenario: enrichedDialoguePayload.structured.proactive.scenario,
            deliveredAt: enrichedDialoguePayload.createdAt,
            feedbackWindowMs: enrichedDialoguePayload.structured.proactive.feedbackWindowMs,
            assistantText: proactiveAssistantText,
            learningAction: learningAction ?? null,
            learningFocuses,
            emotionalTransitionLedger: derivedBundleForLearning?.emotionalTransitionLedger ?? null,
            affectiveResidue: derivedBundleForLearning?.affectiveResidue ?? null,
          })
          if (dropTurnSideEffectsIfAborted())
            return true
          await persistProactiveLoopState(activeCardId, nextProactiveState, { signal })
          if (dropTurnSideEffectsIfAborted())
            return true
          const currentPresenceState = visualPresenceStateByCard.get(activeCardId)
          if (currentPresenceState) {
            visualPresenceStateByCard.set(activeCardId, {
              ...currentPresenceState,
              proactiveLoopState: nextProactiveState,
            })
          }
        }
        if (dropTurnSideEffectsIfAborted())
          return true
        emittedDialoguePayload = enrichedDialoguePayload
        emitDialogueRespondedWithDelivery({
          cardId: activeCardId,
          ...enrichedDialoguePayload,
        })
        await appendRuntimeDebugLine('dialogue-responded.emitted', {
          cardId: activeCardId,
          turnId: enrichedDialoguePayload.turnId,
          sessionId: enrichedDialoguePayload.sessionId,
          origin: enrichedDialoguePayload.origin,
          emotion: enrichedDialoguePayload.structured.emotion,
        })
        if (dropTurnSideEffectsIfAborted())
          return true
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.dialogue',
          action: 'alicization.dialogue.responded.emitted',
          message: 'Emitted Alicization dialogue event after successful turn persistence.',
          payload: {
            turnId: enrichedDialoguePayload.turnId,
            sessionId: enrichedDialoguePayload.sessionId,
            isFallback: enrichedDialoguePayload.isFallback,
            emotion: enrichedDialoguePayload.structured.emotion,
            rawEmotion: enrichedDialoguePayload.structured.rawEmotion,
            origin: enrichedDialoguePayload.origin,
            format: enrichedDialoguePayload.structured.format,
            proactive: enrichedDialoguePayload.structured.proactive ?? null,
          },
        })
        if (dropTurnSideEffectsIfAborted())
          return true
      }
      const appendedMindTurnTraceEvents = await appendMindTurnTraceEvents(emittedDialoguePayload)
      if (dropTurnSideEffectsIfAborted())
        return true
      const replaySamplingUserText = normalizedPayload.origin === 'user-turn'
        ? sanitizeText(normalizedPayload.userText, '')
        : sanitizeText(normalizedPayload.userText, '')
          || sanitizeText(normalizedPayload.visibleReplyRealization?.visibleText, '')
          || sanitizeText(normalizedPayload.assistantText, '')
      const shouldSampleRuntimeTurn = appendedMindTurnTraceEvents.length > 0
        && (
          (normalizedPayload.origin === 'user-turn' && replaySamplingUserText.length > 0)
          || (
            isAlicizationAutonomousDialogueOrigin(normalizedPayload.origin)
            && replaySamplingUserText.length > 0
          )
        )
      if (shouldSampleRuntimeTurn) {
        const payloadVisibleReplyExecution = normalizedPayload.visibleReplyExecution ?? null
        const structuredVisibleReplyRealization = normalizeVisibleReplyRealizationTelemetry(
          (normalizedPayload.structured as Record<string, unknown> | undefined)?.visibleReplyRealization,
        )
        const runtimeSamplingSources = [
          pendingMindTraceTelemetry?.visibleReplyRealization,
          payloadVisibleReplyRealization,
          structuredVisibleReplyRealization,
        ].filter((source): source is PendingVisibleReplyRealizationTelemetry => Boolean(source))
        const runtimeSamplingClosure = runtimeSamplingSources
          .find(source => source.closure?.status === 'blocked')
          ?.closure
          ?? runtimeSamplingSources.find(source => source.closure?.status === 'approved')?.closure
          ?? null
        const runtimeSamplingVisibleReplyValidationStatus
          = runtimeSamplingClosure?.status ?? 'unknown'
        await replayBenchmarkRuntime.ingestRuntimeSamplingConversationTurn({
          row: {
            turnId: normalizedPayload.turnId ?? null,
            sessionId: normalizedPayload.sessionId ?? '',
            userText: replaySamplingUserText,
            assistantText: normalizedPayload.assistantText ?? null,
            structuredJson: normalizedPayload.structured ? JSON.stringify(normalizedPayload.structured) : null,
            createdAt: normalizedCreatedAt,
          },
          visibleReplyRealization: pendingMindTraceTelemetry?.visibleReplyRealization?.expectedAuthority
            && pendingMindTraceTelemetry.visibleReplyRealization.actualAuthority
            ? {
                version: 'visible-reply-realization-v1',
                expectedAuthority: pendingMindTraceTelemetry.visibleReplyRealization.expectedAuthority,
                actualAuthority: pendingMindTraceTelemetry.visibleReplyRealization.actualAuthority,
                providerMindExecuted: pendingMindTraceTelemetry.visibleReplyRealization.providerMindExecuted ?? false,
                mode: (pendingMindTraceTelemetry.visibleReplyRealization.mode as any) ?? 'provider-stream',
                visibleText: pendingMindTraceTelemetry.visibleReplyRealization.visibleText,
                visibleReplyValidationStatus: runtimeSamplingVisibleReplyValidationStatus,
                nonHumanAuthoredStatus: pendingMindTraceTelemetry.visibleReplyRealization.nonHumanAuthoredStatus,
                blockedReasons: [...pendingMindTraceTelemetry.visibleReplyRealization.blockedReasons],
                reason: pendingMindTraceTelemetry.visibleReplyRealization.reason,
                critic: pendingMindTraceTelemetry.visibleReplyRealization.critic,
                closure: runtimeSamplingClosure,
              }
            : payloadVisibleReplyRealization?.expectedAuthority
              && payloadVisibleReplyRealization.actualAuthority
              ? {
                  version: 'visible-reply-realization-v1',
                  expectedAuthority: payloadVisibleReplyRealization.expectedAuthority,
                  actualAuthority: payloadVisibleReplyRealization.actualAuthority,
                  providerMindExecuted: payloadVisibleReplyRealization.providerMindExecuted ?? false,
                  mode: (payloadVisibleReplyRealization.mode as any) ?? 'provider-stream',
                  visibleText: payloadVisibleReplyRealization.visibleText,
                  visibleReplyValidationStatus: runtimeSamplingVisibleReplyValidationStatus,
                  nonHumanAuthoredStatus: payloadVisibleReplyRealization.nonHumanAuthoredStatus,
                  blockedReasons: [...payloadVisibleReplyRealization.blockedReasons],
                  reason: payloadVisibleReplyRealization.reason,
                  critic: payloadVisibleReplyRealization.critic,
                  closure: runtimeSamplingClosure,
                }
              : structuredVisibleReplyRealization?.expectedAuthority
                && structuredVisibleReplyRealization.actualAuthority
                ? {
                    version: 'visible-reply-realization-v1',
                    expectedAuthority: structuredVisibleReplyRealization.expectedAuthority,
                    actualAuthority: structuredVisibleReplyRealization.actualAuthority,
                    providerMindExecuted: structuredVisibleReplyRealization.providerMindExecuted ?? false,
                    mode: (structuredVisibleReplyRealization.mode as any) ?? 'provider-stream',
                    visibleText: structuredVisibleReplyRealization.visibleText,
                    visibleReplyValidationStatus: runtimeSamplingVisibleReplyValidationStatus,
                    nonHumanAuthoredStatus: structuredVisibleReplyRealization.nonHumanAuthoredStatus,
                    blockedReasons: [...structuredVisibleReplyRealization.blockedReasons],
                    reason: structuredVisibleReplyRealization.reason,
                    critic: structuredVisibleReplyRealization.critic,
                    closure: runtimeSamplingClosure,
                  }
                : payloadVisibleReplyExecution?.expectedVisibleReplyAuthority
                  && payloadVisibleReplyExecution.actualVisibleReplyAuthority
                  ? {
                      version: 'visible-reply-realization-v1',
                      expectedAuthority: payloadVisibleReplyExecution.expectedVisibleReplyAuthority,
                      actualAuthority: payloadVisibleReplyExecution.actualVisibleReplyAuthority,
                      providerMindExecuted: payloadVisibleReplyExecution.providerMindExecuted,
                      mode: payloadVisibleReplyExecution.mode,
                      visibleText: sanitizeText(normalizedPayload.assistantText, '') || null,
                      visibleReplyValidationStatus: runtimeSamplingVisibleReplyValidationStatus,
                      nonHumanAuthoredStatus: payloadVisibleReplyExecution.providerMindExecuted
                        ? null
                        : payloadVisibleReplyExecution.reason ?? 'visible-reply-local-fallback',
                      blockedReasons: payloadVisibleReplyExecution.providerMindExecuted
                        ? []
                        : ['non-human-authored-visible-fallback'],
                      reason: payloadVisibleReplyExecution.reason,
                      critic: null,
                      closure: runtimeSamplingClosure,
                    }
                  : undefined,
          traceRecords: buildAlicizationMemoryDecisionTraceRecords(
            appendedMindTurnTraceEvents.map((event, index) => ({
              id: `${event.decisionTraceId}:${event.kind}:${index}`,
              decisionTraceId: event.decisionTraceId,
              turnId: event.turnId ?? null,
              sessionId: event.sessionId ?? null,
              origin: event.origin ?? 'user-turn',
              kind: event.kind,
              payload: event.payload ?? null,
              createdAt: event.createdAt ?? normalizedCreatedAt,
            })),
          ),
          signal,
        }).catch(async (error) => {
          if (signal?.aborted || isAbortError(error))
            return
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.memory-benchmark',
            action: 'runtime-sampling-backlog-ingest-failed',
            message: 'Failed to ingest a real runtime turn into the replay benchmark sampling backlog.',
            payload: {
              turnId: normalizedPayload.turnId ?? null,
              sessionId: normalizedPayload.sessionId ?? null,
              decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
              reason: errorMessageFrom(error) ?? 'unknown-error',
            },
          })
        })
      }
      return true
    }
    catch (error) {
      if (isAbortError(error) || signal?.aborted)
        return

      throw error
    }
    finally {
      releaseTurnWriteAbortController(normalizedPayload.turnId)
      if (normalizedPayload.turnId)
        pendingMindTraceTelemetryByTurnId.delete(normalizedPayload.turnId)
    }
  }

  function truncateForDream(value: string | null | undefined, maxChars: number) {
    const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
    if (!text)
      return ''
    if (text.length <= maxChars)
      return text
    return `${text.slice(0, Math.max(12, maxChars - 1))}…`
  }

  function parseStructuredHint(raw: string | null | undefined) {
    if (!raw || typeof raw !== 'string')
      return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return parsed
    }
    catch {
      return {}
    }
  }

  function toReplayDialogueRespondedPayload(row: {
    turnId: string | null
    sessionId: string
    userText: string | null
    assistantText: string | null
    structuredJson: string | null
    createdAt: number
  }, performanceManifest?: CharacterPerformanceCapabilitiesManifest | null): AlicizationDialogueRespondedPayload | null {
    const structured = parseStructuredHint(row.structuredJson)
    const normalizedTurnId = sanitizeText(row.turnId)
    const structuredFormat = sanitizeText((structured as { format?: unknown }).format).toLowerCase()
    const origin = isAlicizationAutonomousDialogueFamily({
      turnId: normalizedTurnId,
      rawFormat: structuredFormat,
    })
      ? resolveAlicizationAutonomousDialogueOrigin('proactive')
      : 'user-turn'

    const normalized = normalizeDialogueRespondedPayload({
      turnId: row.turnId ?? undefined,
      sessionId: row.sessionId,
      userText: row.userText ?? undefined,
      assistantText: row.assistantText ?? undefined,
      structured,
      origin,
      createdAt: row.createdAt,
    }, performanceManifest)
    if (!normalized || !isAlicizationAutonomousDialogueOrigin(normalized.origin))
      return null

    return {
      cardId: activeCardId,
      ...normalized,
      structured: {
        ...structured,
        ...normalized.structured,
      },
    }
  }

  function clampSoulDelta(value: number, maxAbs = 0.08) {
    if (!Number.isFinite(value))
      return 0
    return Math.max(-maxAbs, Math.min(maxAbs, value))
  }

  function inferDreamPrimaryLanguage(serializedTurns: string[]) {
    const sample = serializedTurns.join('\n')
    const zhMatches = sample.match(/[\u4E00-\u9FFF]/g)?.length ?? 0
    const enMatches = sample.match(/[A-Z]/gi)?.length ?? 0
    if (zhMatches > enMatches * 1.2)
      return 'zh-Hans'
    if (enMatches > zhMatches * 1.2)
      return 'en'
    return 'mixed'
  }

  function normalizeOrganicMemoryItemText(raw: unknown, maxChars: number) {
    return normalizeOrganicMemoryText(
      sanitizeMultilineText(raw, '').replace(/\s+/g, ' ').trim(),
      maxChars,
    )
  }

  function normalizeOrganicMemoryItemArray(raw: unknown, options: {
    maxItems: number
    maxChars: number
  }) {
    if (!Array.isArray(raw))
      return [] as Array<{ text: string }>

    const deduped: Array<{ text: string }> = []
    for (const item of raw) {
      const text = normalizeOrganicMemoryItemText(
        item && typeof item === 'object' && 'text' in item
          ? (item as { text?: unknown }).text
          : '',
        options.maxChars,
      )
      if (!text)
        continue
      if (deduped.some(candidate => candidate.text.toLowerCase() === text.toLowerCase()))
        continue
      deduped.push({ text })
      if (deduped.length >= options.maxItems)
        break
    }
    return deduped
  }

  function parseDreamMetabolismPayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const hostAttitude = sanitizeText(parsed.host_attitude)
    const soulShift = parsed.soul_shift && typeof parsed.soul_shift === 'object'
      ? parsed.soul_shift as Record<string, unknown>
      : null
    if (
      !hostAttitude
      || !soulShift
      || !Array.isArray(parsed.next_active_thoughts)
      || !Array.isArray(parsed.explicit_demoted_thoughts)
      || !Array.isArray(parsed.new_sediment_fragments)
      || !Object.hasOwn(parsed, 'shattering_event')
    ) {
      return null
    }

    const obedienceDelta = Number(soulShift.obedience_delta)
    const livelinessDelta = Number(soulShift.liveliness_delta)
    const sensibilityDelta = Number(soulShift.sensibility_delta)
    if (
      !Number.isFinite(obedienceDelta)
      || !Number.isFinite(livelinessDelta)
      || !Number.isFinite(sensibilityDelta)
    ) {
      return null
    }

    if (
      parsed.shattering_event !== null
      && (
        typeof parsed.shattering_event !== 'object'
        || !sanitizeText((parsed.shattering_event as { text?: unknown }).text)
      )
    ) {
      return null
    }

    const shatteringEventText = normalizeOrganicMemoryItemText(
      parsed.shattering_event && typeof parsed.shattering_event === 'object'
        ? (parsed.shattering_event as { text?: unknown }).text
        : '',
      280,
    )

    return {
      host_attitude: normalizeHostAttitude(hostAttitude),
      soul_shift: {
        obedience_delta: clampSoulDelta(obedienceDelta),
        liveliness_delta: clampSoulDelta(livelinessDelta),
        sensibility_delta: clampSoulDelta(sensibilityDelta),
      },
      next_active_thoughts: normalizeOrganicMemoryItemArray(parsed.next_active_thoughts, {
        maxItems: 5,
        maxChars: 120,
      }),
      explicit_demoted_thoughts: normalizeOrganicMemoryItemArray(parsed.explicit_demoted_thoughts, {
        maxItems: 8,
        maxChars: 120,
      }),
      new_sediment_fragments: normalizeOrganicMemoryItemArray(parsed.new_sediment_fragments, {
        maxItems: 8,
        maxChars: 160,
      }),
      shattering_event: shatteringEventText
        ? { text: shatteringEventText }
        : null,
    } satisfies AlicizationDreamMetabolismPayload
  }

  function parseCoreIncarnationReforgePayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null
    const coreIncarnation = normalizeCoreIncarnation(parsed.core_incarnation)
    if (!coreIncarnation)
      return null
    return {
      core_incarnation: coreIncarnation,
    } satisfies AlicizationCoreIncarnationReforgePayload
  }

  function parseDreamMemoryCues(raw: unknown) {
    if (!Array.isArray(raw) || raw.some(value => typeof value !== 'string'))
      return null

    const cues: string[] = []
    for (const value of raw) {
      const cue = sanitizeBriefText(value, 120)
      if (!cue || cues.some(candidate => candidate.toLowerCase() === cue.toLowerCase()))
        continue
      cues.push(cue)
      if (cues.length >= 5)
        break
    }
    return cues
  }

  function parseMemoryConsolidationRefinementPayload(
    raw: string,
    allowedIds: ReadonlySet<string>,
  ) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed || !Array.isArray(parsed.consolidations))
      return null

    const consolidations: Array<{
      id: string
      summary: string
      lesson: string | null
      cues: string[]
      confidence: number
    }> = []
    const seenIds = new Set<string>()
    for (const item of parsed.consolidations) {
      if (!item || typeof item !== 'object')
        continue
      const candidate = item as Record<string, unknown>
      const id = typeof candidate.id === 'string' ? candidate.id.trim() : ''
      const summary = typeof candidate.summary === 'string'
        ? sanitizeBriefText(candidate.summary, 320)
        : ''
      const lesson = candidate.lesson === null
        ? null
        : typeof candidate.lesson === 'string'
          ? sanitizeBriefText(candidate.lesson, 220) || null
          : undefined
      const confidence = candidate.confidence
      const cues = parseDreamMemoryCues(candidate.cues)
      if (
        !id
        || !allowedIds.has(id)
        || seenIds.has(id)
        || !summary
        || lesson === undefined
        || cues === null
        || typeof confidence !== 'number'
        || !Number.isFinite(confidence)
        || confidence < 0
        || confidence > 1
      ) {
        continue
      }
      seenIds.add(id)
      consolidations.push({
        id,
        summary,
        lesson,
        cues,
        confidence,
      })
      if (consolidations.length >= Math.min(8, allowedIds.size))
        break
    }
    return consolidations
  }

  function parseDreamAutobiographicalSummariesPayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed || !Array.isArray(parsed.summaries))
      return null

    const summaries: Array<{
      periodKey: string
      facet: NonNullable<AlicizationMemoryConsolidationRecord['facet']>
      summary: string
      lesson: string | null
      cues: string[]
      confidence: number
    }> = []
    const seenPeriods = new Set<string>()
    for (const item of parsed.summaries) {
      if (!item || typeof item !== 'object')
        continue
      const candidate = item as Record<string, unknown>
      const periodKey = typeof candidate.periodKey === 'string'
        ? sanitizeBriefText(candidate.periodKey, 96)
        : ''
      const facet = candidate.facet
      const summary = typeof candidate.summary === 'string'
        ? sanitizeBriefText(candidate.summary, 320)
        : ''
      const lesson = candidate.lesson === null
        ? null
        : typeof candidate.lesson === 'string'
          ? sanitizeBriefText(candidate.lesson, 220) || null
          : undefined
      const confidence = candidate.confidence
      const cues = parseDreamMemoryCues(candidate.cues)
      if (
        !periodKey
        || (
          facet !== 'phase'
          && facet !== 'relationship-era'
          && facet !== 'task-era'
          && facet !== 'self-era'
        )
        || !summary
        || lesson === undefined
        || cues === null
        || typeof confidence !== 'number'
        || !Number.isFinite(confidence)
        || confidence < 0
        || confidence > 1
      ) {
        continue
      }
      const periodIdentity = `${facet}:${periodKey}`
      if (seenPeriods.has(periodIdentity))
        continue
      seenPeriods.add(periodIdentity)
      summaries.push({
        periodKey,
        facet,
        summary,
        lesson,
        cues,
        confidence,
      })
      if (summaries.length >= 4)
        break
    }
    return summaries
  }

  async function generateMemoryConsolidationRefinementWithGateway(input: {
    serializedTurns: string[]
    consolidations: AlicizationMemoryConsolidationRecord[]
    hostAttitude: string
    coreIncarnation: string
    agentTurn?: AlicizationAgentTurnRuntime | null
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
  }) {
    if (input.serializedTurns.length === 0 || input.consolidations.length === 0)
      return null

    const consolidationCandidates = input.consolidations.slice(0, 8).map(item => ({
      id: item.id,
      kind: item.kind,
      facet: item.facet ?? null,
      periodKey: item.periodKey,
      summary: sanitizeBriefText(item.summary, 220),
      lesson: sanitizeBriefText(item.lesson ?? '', 180) || null,
      confidence: item.confidence,
      cues: item.cues.slice(0, 5),
    }))
    const allowedIds = new Set(
      consolidationCandidates.map(item => item.id),
    )
    const system = buildAlicizationProviderFactBlock('alicization-memory-consolidation-context', {
      version: 'alicization-memory-consolidation-context-v1',
      currentSelf: {
        hostAttitude: sanitizeBriefText(input.hostAttitude, 120),
        coreIncarnation: sanitizeBriefText(input.coreIncarnation, 220),
      },
      dialogueEvidence: input.serializedTurns.slice(-20),
      consolidationCandidates,
      sourcePolicy: {
        consolidationCandidatesConfirmedLongTermMemory: true,
        inventedEventsAllowed: false,
        newConsolidationIdsAllowed: false,
        rawTranscriptPersonaTrainingEligible: false,
        reviewCandidatesConfirmedLongTermMemory: false,
        toolLogsEligible: false,
        providerFailureArtifactsEligible: false,
        localFallbackArtifactsEligible: false,
      },
    })
    const user = buildAlicizationProviderFactBlock('alicization-memory-consolidation-request', {
      version: 'alicization-memory-consolidation-request-v1',
      operation: 'refine-memory-consolidations',
      responseSchema: 'alicization_memory_consolidation_refinement',
      allowedIds: [...allowedIds],
    })

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 8_000,
      source: 'dream',
      responseFormat: alicizationMemoryConsolidationRefinementResponseFormat,
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    }).catch(() => null)

    if (!raw)
      return null
    return parseMemoryConsolidationRefinementPayload(raw, allowedIds)
  }

  async function generateDreamAutobiographicalSummariesWithGateway(input: {
    serializedTurns: string[]
    consolidations: AlicizationMemoryConsolidationRecord[]
    hostAttitude: string
    coreIncarnation: string
    periodStartedAt: number
    periodEndedAt: number
    agentTurn?: AlicizationAgentTurnRuntime | null
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
  }) {
    if (input.serializedTurns.length === 0 || input.consolidations.length === 0)
      return null

    const system = buildAlicizationProviderFactBlock('alicization-autobiographical-synthesis-context', {
      version: 'alicization-autobiographical-synthesis-context-v1',
      period: {
        startedAt: input.periodStartedAt,
        endedAt: input.periodEndedAt,
      },
      currentSelf: {
        hostAttitude: sanitizeBriefText(input.hostAttitude, 120),
        coreIncarnation: sanitizeBriefText(input.coreIncarnation, 220),
      },
      dialogueEvidence: input.serializedTurns.slice(-20),
      consolidationEvidence: input.consolidations.slice(0, 8).map(item => ({
        id: item.id,
        kind: item.kind,
        facet: item.facet ?? null,
        periodKey: item.periodKey,
        summary: sanitizeBriefText(item.summary, 220),
        lesson: sanitizeBriefText(item.lesson ?? '', 180) || null,
        confidence: item.confidence,
        cues: item.cues.slice(0, 5),
      })),
      sourcePolicy: {
        consolidationEvidenceConfirmedLongTermMemory: true,
        inventedEventsAllowed: false,
        rawTranscriptPersonaTrainingEligible: false,
        reviewCandidatesConfirmedLongTermMemory: false,
        toolLogsEligible: false,
        providerFailureArtifactsEligible: false,
        localFallbackArtifactsEligible: false,
      },
    })
    const user = buildAlicizationProviderFactBlock('alicization-autobiographical-synthesis-request', {
      version: 'alicization-autobiographical-synthesis-request-v1',
      operation: 'synthesize-dream-autobiographical-summaries',
      responseSchema: 'alicization_dream_autobiographical_summaries',
    })

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 8_000,
      source: 'dream',
      responseFormat: alicizationDreamAutobiographicalSummariesResponseFormat,
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    }).catch(() => null)

    if (!raw)
      return null
    return parseDreamAutobiographicalSummariesPayload(raw)
  }

  function buildProactiveMetadataFromDecision(input: {
    decision: ReturnType<typeof evaluateProactivePolicy>
    selfEvolution?: OrganicMemoryPromptContext['selfEvolution'] | null
    learningExecutionState?: OrganicMemoryPromptContext['learningExecutionState'] | null
  }): AlicizationProactiveMetadata {
    const reasonCodes: AlicizationProactiveReasonCode[] = [...input.decision.reasonCodes]
    const learningAction = input.learningExecutionState?.nextLearningAction
      ?? input.selfEvolution?.nextLearningAction
      ?? null
    if (learningAction)
      reasonCodes.push(`learning:${learningAction}` as AlicizationProactiveReasonCode)
    for (const focus of input.learningExecutionState?.activeLearningFocuses ?? input.selfEvolution?.activeLearningFocuses ?? []) {
      const normalized = sanitizeBriefText(focus, 64)
      if (!normalized)
        continue
      reasonCodes.push(`learning-focus:${normalized}` as AlicizationProactiveReasonCode)
    }
    const presenceOnlyHoldReason: AlicizationProactiveReasonCode | null
      = (
        input.decision.style === 'silent-observe'
        && input.decision.reasonCodes.includes('continuity-next-open-window')
        && !input.decision.reasonCodes.includes('held-autonomy-carry')
        && !input.decision.reasonCodes.includes('continuity-execution-callback-carry')
        && !input.decision.reasonCodes.includes('continuity-execution-callback-afterglow-hold')
      )
        ? 'presence-only-hold'
        : null
    return {
      shouldInterrupt: input.decision.shouldInterrupt,
      confidence: input.decision.confidence,
      reasonCodes: [...new Set<AlicizationProactiveReasonCode>([
        ...reasonCodes,
        ...(presenceOnlyHoldReason ? [presenceOnlyHoldReason] : []),
      ])],
      urgency: input.decision.urgency,
      style: input.decision.style,
      cooldownMs: input.decision.cooldownMs,
      scenario: input.decision.scenario,
      policyVersion: input.decision.policyVersion,
      feedbackWindowMs: proactiveReplyWindowMs,
    }
  }

  async function generateProactiveStructuredWithGateway(
    personality: AlicizationPersonalityState,
    state: SubconsciousCardState,
    layeredContext: AlicizationProactiveLayeredContext,
    policyDecision: ReturnType<typeof evaluateProactivePolicy>,
    organicPromptContext: OrganicMemoryPromptContext,
    perceptionState: AlicizationPerceptionState,
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    },
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const now = Date.now()
    const hostPersonModel = organicPromptContext.hostPersonModel ?? null
    const providerHostPersonModel = hostPersonModel
      ? {
          summary: sanitizeAlicizationProviderFacingText(hostPersonModel.summary, 180) || null,
          trustStage: hostPersonModel.trustLadder.stage,
          trustRationale: sanitizeAlicizationProviderFacingText(hostPersonModel.trustLadder.rationale, 160) || null,
          sensitivities: hostPersonModel.sensitivities
            .slice(0, 3)
            .map(value => sanitizeAlicizationProviderFacingText(value, 160))
            .filter(Boolean),
          repairTriggers: hostPersonModel.repairTriggers
            .slice(0, 3)
            .map(value => sanitizeAlicizationProviderFacingText(value, 160))
            .filter(Boolean),
          preferredClosenessByContext: hostPersonModel.preferredClosenessByContext
            .slice(0, 3)
            .map(item => ({
              context: sanitizeAlicizationProviderFacingText(item.context, 100) || null,
              preference: sanitizeAlicizationProviderFacingText(item.preference, 160) || null,
              confidence: item.confidence,
            })),
          recurrentBurdens: hostPersonModel.recurrentBurdens
            .slice(0, 3)
            .map(value => sanitizeAlicizationProviderFacingText(value, 160))
            .filter(Boolean),
        }
      : null
    const providerSelfEvolution = organicPromptContext.selfEvolution
      ? {
          dominantTrajectory: sanitizeAlicizationProviderFacingText(
            organicPromptContext.selfEvolution.dominantTrajectory,
            180,
          ) || null,
          nextLearningAction: organicPromptContext.selfEvolution.nextLearningAction ?? null,
          nextLearningReason: sanitizeAlicizationProviderFacingText(
            organicPromptContext.selfEvolution.nextLearningReason,
            180,
          ) || null,
          contradictionPressure: organicPromptContext.selfEvolution.contradictionPressure,
          activeLearningFocuses: organicPromptContext.selfEvolution.activeLearningFocuses
            .slice(0, 4)
            .map(value => sanitizeAlicizationProviderFacingText(value, 140))
            .filter(Boolean),
          summary: sanitizeAlicizationProviderFacingText(organicPromptContext.selfEvolution.summary, 220) || null,
        }
      : null
    const providerLearningExecutionState = organicPromptContext.learningExecutionState
      ? {
          nextLearningAction: organicPromptContext.learningExecutionState.nextLearningAction ?? null,
          activeLearningFocuses: organicPromptContext.learningExecutionState.activeLearningFocuses
            .slice(0, 6)
            .map(value => sanitizeAlicizationProviderFacingText(value, 140))
            .filter(Boolean),
        }
      : null
    const system = buildAlicizationProviderFactBlock('alicization-proactive-turn-context', {
      version: 'alicization-proactive-turn-context-v1',
      generatedAt: now,
      personality: {
        obedience: personality.obedience,
        liveliness: personality.liveliness,
        sensibility: personality.sensibility,
      },
      subconsciousState: {
        boredom: state.boredom,
        loneliness: state.loneliness,
        fatigue: state.fatigue,
        lastInteractionAt: state.lastInteractionAt,
        updatedAt: state.updatedAt,
      },
      layeredContext: {
        ...layeredContext,
        relationship: {
          ...layeredContext.relationship,
          hostAttitude: sanitizeAlicizationProviderFacingText(
            layeredContext.relationship.hostAttitude,
            180,
          ) || null,
        },
      },
      policyDecision: {
        shouldInterrupt: policyDecision.shouldInterrupt,
        confidence: policyDecision.confidence,
        scenario: policyDecision.scenario,
        style: policyDecision.style,
        urgency: policyDecision.urgency,
        cooldownMs: policyDecision.cooldownMs,
        policyVersion: policyDecision.policyVersion,
      },
      perception: buildProactivePerceptionSignals({
        now,
        state: perceptionState,
        currentForeground: layeredContext.system.foregroundWindow,
      }),
      hostPersonModel: providerHostPersonModel,
      learningState: {
        selfEvolution: providerSelfEvolution,
        execution: providerLearningExecutionState,
      },
    })
    const user = buildAlicizationProviderFactBlock('alicization-proactive-generation-request', {
      version: 'alicization-proactive-generation-request-v1',
      turnId: agentTurnInput?.turnId ?? null,
      decisionTraceId: agentTurnInput?.decisionTraceId ?? null,
    })

    let providerFailure: {
      reason: string
      providerId: string
      model: string
      failureKind?: AlicizationChatFailureKind | null
    } | null = null
    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 15_000,
      source: 'proactive',
      responseFormat: alicizationProviderResponseFormat,
      cardId: activeCardId,
      agentTurn,
      agentTurnInput,
      extraSystemBlocks: [
        ...buildOrganicMemoryProviderFactBlocks(organicPromptContext),
      ],
      onFailure: failure => providerFailure = {
        reason: failure.reason,
        providerId: failure.providerId,
        model: failure.model,
      },
    })
    if (!raw) {
      return {
        structured: null,
        providerFailure,
      }
    }

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed || parsed.format !== 'mind-turn-v1') {
      return {
        structured: null,
        providerFailure: {
          reason: 'Provider returned an invalid proactive response.',
          providerId: activeProviderId,
          model: activeModelId,
          failureKind: 'provider-schema-unsupported',
        },
      }
    }

    const thought = sanitizeText(parsed.thought)
    const reply = sanitizeText(parsed.reply)
    const normalizedEmotion = normalizeAlicizationEmotion(parsed.emotion)
    const performanceManifest = await getPerformanceManifest()
    const performance = clampAlicizationPerformancePayloadToManifest(
      normalizeAlicizationPerformancePayload(parsed.performance, normalizedEmotion.emotion),
      performanceManifest,
      normalizedEmotion.emotion,
    ).performance
    if (!thought || !reply || normalizedEmotion.downgraded) {
      return {
        structured: null,
        providerFailure: {
          reason: 'Provider returned an incomplete proactive response.',
          providerId: activeProviderId,
          model: activeModelId,
          failureKind: 'provider-schema-unsupported',
        },
      }
    }

    return {
      structured: {
        thought,
        emotion: performance.baseEmotion,
        reply,
        performance,
        parsePath: 'json',
        format: resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-proactive-llm'),
        proactive: buildProactiveMetadataFromDecision({
          decision: policyDecision,
          selfEvolution: organicPromptContext.selfEvolution ?? null,
          learningExecutionState: organicPromptContext.learningExecutionState ?? null,
        }),
      },
      providerFailure: null,
    }
  }

  async function generateDreamMetabolismWithGateway(input: {
    serializedTurns: string[]
    personality: AlicizationPersonalityState
    hostAttitude: string
    coreIncarnation: string
    activeThoughts: AlicizationActiveThought[]
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    if (input.serializedTurns.length === 0)
      return null
    const primaryLanguage = inferDreamPrimaryLanguage(input.serializedTurns)
    const system = buildAlicizationProviderFactBlock('alicization-dream-metabolism-context', {
      version: 'alicization-dream-metabolism-context-v1',
      primaryLanguage,
      currentSelf: {
        personality: input.personality,
        hostAttitude: input.hostAttitude,
        coreIncarnation: input.coreIncarnation,
      },
      activeThoughts: input.activeThoughts
        .slice(0, 8)
        .map(item => normalizeOrganicMemoryItemText(item.text, 120))
        .filter(Boolean),
      dialogueEvidence: input.serializedTurns,
      sourcePolicy: {
        rawTranscriptPersonaTrainingEligible: false,
        reviewCandidatesConfirmedLongTermMemory: false,
        toolLogsEligible: false,
        providerFailureArtifactsEligible: false,
        localFallbackArtifactsEligible: false,
      },
    })
    const user = buildAlicizationProviderFactBlock('alicization-dream-metabolism-request', {
      version: 'alicization-dream-metabolism-request-v1',
      operation: 'derive-dream-memory-metabolism',
      responseSchema: 'alicization_dream_metabolism',
    })

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      responseFormat: alicizationDreamMetabolismResponseFormat,
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      injectPerformanceManifest: false,
      extraSystemBlocks: buildOrganicMemoryProviderFactBlocks({
        hostAttitude: input.hostAttitude,
        coreIncarnation: input.coreIncarnation,
        activeThoughts: input.activeThoughts,
        retrievedFacts: [],
        recalledFragments: [],
      }),
    })
    if (!raw)
      return null

    return parseDreamMetabolismPayload(raw)
  }

  async function generateCoreIncarnationReforgeWithGateway(input: {
    coreIncarnation: string
    shatteringEventText: string
    hostAttitude: string
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    const system = buildAlicizationProviderFactBlock('alicization-core-reforge-context', {
      version: 'alicization-core-reforge-context-v1',
      currentCoreIncarnation: input.coreIncarnation,
      hostAttitude: input.hostAttitude,
      sourceReflection: {
        kind: 'cleaned-dream-reflection',
        text: input.shatteringEventText,
        rawTranscript: false,
      },
      sourcePolicy: {
        rawTranscriptPersonaTrainingEligible: false,
        reviewCandidatesConfirmedLongTermMemory: false,
        providerFailureArtifactsEligible: false,
        localFallbackArtifactsEligible: false,
      },
    })
    const user = buildAlicizationProviderFactBlock('alicization-core-reforge-request', {
      version: 'alicization-core-reforge-request-v1',
      operation: 'reforge-core-incarnation',
      responseSchema: 'alicization_core_incarnation_reforge',
    })

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      responseFormat: alicizationCoreIncarnationReforgeResponseFormat,
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      injectPerformanceManifest: false,
      extraSystemBlocks: buildOrganicMemoryProviderFactBlocks({
        hostAttitude: input.hostAttitude,
        coreIncarnation: input.coreIncarnation,
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      }),
    })
    if (!raw)
      return null

    return parseCoreIncarnationReforgePayload(raw)
  }

  const selectExecutionDeliveryReplySurface
    = runtimeExecutionDelivery.selectExecutionDeliveryReplySurface

  const generateExecutionCallbackStructuredWithGateway
    = runtimeExecutionDelivery.generateExecutionCallbackStructuredWithGateway

  const resolveExecutionResultDeliveryPolicyForRuntime
    = runtimeExecutionDelivery.resolveExecutionResultDeliveryPolicyForRuntime

  const resolveExecutionSelfContinuityAuthorityForRuntime
    = runtimeExecutionDelivery.resolveExecutionSelfContinuityAuthorityForRuntime

  const resolveExecutionHostPersonModelForRuntime
    = runtimeExecutionDelivery.resolveExecutionHostPersonModelForRuntime

  const resolveExecutionKnowledgeEvidenceForRuntime
    = runtimeExecutionDelivery.resolveExecutionKnowledgeEvidenceForRuntime

  const resolveExecutionPersonStateProjectionForRuntime
    = runtimeExecutionDelivery.resolveExecutionPersonStateProjectionForRuntime

  async function generateReminderStructuredWithGateway(
    personality: AlicizationPersonalityState,
    reminder: { minutes: number, message: string, tier: 'mild' | 'severe' },
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    },
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const system = buildAlicizationProviderFactBlock('alicization-reminder-turn-context', {
      version: 'alicization-reminder-turn-context-v1',
      generatedAt: Date.now(),
      reminder: {
        status: 'due',
        delayMinutes: reminder.minutes,
        message: reminder.message,
        tier: reminder.tier,
      },
      personality: {
        obedience: personality.obedience,
        liveliness: personality.liveliness,
        sensibility: personality.sensibility,
      },
    })
    const user = buildAlicizationProviderFactBlock('alicization-reminder-generation-request', {
      version: 'alicization-reminder-generation-request-v1',
      turnId: agentTurnInput?.turnId ?? null,
      decisionTraceId: agentTurnInput?.decisionTraceId ?? null,
    })

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 15_000,
      source: 'reminder',
      responseFormat: alicizationProviderResponseFormat,
      cardId: activeCardId,
      agentTurn,
      agentTurnInput,
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed || parsed.format !== 'mind-turn-v1')
      return null

    const thought = sanitizeText(parsed.thought)
    const reply = sanitizeText(parsed.reply)
    const normalizedEmotion = normalizeAlicizationEmotion(parsed.emotion)
    const performanceManifest = await getPerformanceManifest()
    const performance = clampAlicizationPerformancePayloadToManifest(
      normalizeAlicizationPerformancePayload(parsed.performance, normalizedEmotion.emotion),
      performanceManifest,
      normalizedEmotion.emotion,
    ).performance
    if (!thought || !reply || normalizedEmotion.downgraded)
      return null

    return {
      thought,
      emotion: performance.baseEmotion,
      reply,
      performance,
      parsePath: 'json',
      format: resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-reminder'),
    }
  }

  const { processDueRemindersForCurrentCard, processPendingExecutionDeliveriesForCurrentCard } = createAlicizationDeliveryReminderRuntime({
    getActiveCardId: () => activeCardId,
    isAlicizationKillSwitchSuspended,
    getAlicizationCardKillSwitchState: cardId => getAlicizationCardKillSwitchSnapshot(cardId).state,
    appendRuntimeDebugLine,
    clearReminderDueTimer,
    getAlicizationDb: () => alicizationDb,
    scheduleNextReminderDueCheck,
    reminderClaimBatchSize,
    reminderOverdueTierThresholdMinutes,
    reminderLlmRetryDelayMs,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    bootstrap,
    generateReminderStructuredWithGateway,
    appendAuditLog,
    buildReminderContinuitySignal,
    ensureActiveOrLatestSessionId,
    appendConversationTurnWithGuards,
    sanitizeBriefText,
    buildReminderSessionMirrorAction,
    syncAgentTurnSessionMirror,
    syncSessionMirrorFromCurrentCardState,
    hydrateAgentTurnFromCurrentCardState,
    buildAgentRuntimeAuditSnapshot,
    normalizeSessionId,
    getActiveSessionIdByCard: cardId => activeSessionIdByCard.get(cardId),
    executionDeliveryRuntime,
    buildExecutionDeliveryAction,
    generateExecutionCallbackStructuredWithGateway,
    selectExecutionDeliveryReplySurface,
    resolveExecutionResultDeliveryPolicy: resolveExecutionResultDeliveryPolicyForRuntime,
    resolveExecutionSelfContinuityAuthority: resolveExecutionSelfContinuityAuthorityForRuntime,
    resolveExecutionHostPersonModel: resolveExecutionHostPersonModelForRuntime,
    resolveExecutionKnowledgeEvidence: resolveExecutionKnowledgeEvidenceForRuntime,
    resolveReminderMemorySurfaceRestraint: async ({ reminder }) => {
      const organicPromptContext = await resolveOrganicMemoryPromptContext({
        recallSeed: `reminder:${reminder.tier}:${reminder.message}`,
        budgetClass: 'proactive-generation',
      }).catch(() => null)
      const ledger = organicPromptContext?.memoryResolutionLedger ?? null
      if (!ledger)
        return null
      return {
        shouldStayInward: ledger.shouldStayInward,
        shouldDelayUntilAfterPayoff: ledger.shouldDelayUntilAfterPayoff,
        stableCoreOnly: ledger.stableCoreOnly,
        visibleCarryMode: ledger.visibleCarryMode,
      }
    },
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
    resolveExecutionPersonStateProjection: async (input) => {
      const projection = await resolveExecutionPersonStateProjectionForRuntime(input)
      return projection as AlicizationPersonStateProjection | null
    },
    persistExecutionDeliveryState: async cardId => await persistExecutionDeliveryState(cardId),
    queueSubconsciousWake,
    executionCallbackRuntime,
    errorMessageFrom,
  })

  function clearQueuedSubconsciousWake() {
    if (queuedSubconsciousWakeTimer) {
      clearTimeout(queuedSubconsciousWakeTimer)
      queuedSubconsciousWakeTimer = undefined
    }
    queuedSubconsciousWakeCardIds.clear()
    queuedSubconsciousWakeReasons.clear()
  }

  function queueSubconsciousWake(cardIdRaw: unknown, reason: string, delayMs = 1_200) {
    const cardId = normalizeCardId(cardIdRaw)
    queuedSubconsciousWakeCardIds.add(cardId)
    const normalizedReason = sanitizeText(reason).slice(0, 120)
    if (normalizedReason)
      queuedSubconsciousWakeReasons.add(normalizedReason)
    if (queuedSubconsciousWakeTimer)
      return
    queuedSubconsciousWakeTimer = setTimeout(() => {
      queuedSubconsciousWakeTimer = undefined
      const targetCardIds = [...queuedSubconsciousWakeCardIds]
      const wakeReasons = [...queuedSubconsciousWakeReasons]
      queuedSubconsciousWakeCardIds.clear()
      queuedSubconsciousWakeReasons.clear()
      if (targetCardIds.length === 0)
        return
      if (subconsciousTickInFlight) {
        void appendRuntimeDebugLine('subconscious.wake.deferred', {
          cardIds: targetCardIds,
          reasons: wakeReasons,
          because: 'tick-in-flight',
        })
        for (const targetCardId of targetCardIds)
          queuedSubconsciousWakeCardIds.add(targetCardId)
        for (const wakeReason of wakeReasons)
          queuedSubconsciousWakeReasons.add(wakeReason)
        queueSubconsciousWake(targetCardIds[0], 'deferred-after-inflight', delayMs)
        return
      }
      void appendRuntimeDebugLine('subconscious.wake.fired', {
        cardIds: targetCardIds,
        reasons: wakeReasons,
      })
      subconsciousTickInFlight = runSubconsciousTickAcrossCards('force', targetCardIds)
      void subconsciousTickInFlight.catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.subconscious',
          action: 'wake-failed',
          message: 'Event-driven subconscious wake failed.',
          payload: {
            reasons: wakeReasons,
            cardIds: targetCardIds,
            reason: errorMessageFrom(error) ?? 'unknown',
          },
        })
      }).finally(() => {
        subconsciousTickInFlight = null
      })
    }, Math.max(120, Math.floor(delayMs)))
  }

  function queueDurabilityPulse(
    cardIdRaw: unknown,
    pulse: AlicizationDurabilityPulseSnapshot,
    options?: { triggerThoughtLoop?: boolean },
  ) {
    const cardId = normalizeCardId(cardIdRaw)
    pendingDurabilityPulseByCard.set(cardId, {
      ...pulse,
      detectedAt: Math.max(0, Math.floor(pulse.detectedAt || Date.now())),
    })
    if (options?.triggerThoughtLoop === false)
      return
    queueSubconsciousWake(cardId, `durability:${pulse.kind}`, 80)
  }

  function consumeDurabilityPulse(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const pending = pendingDurabilityPulseByCard.get(cardId) ?? null
    if (pending)
      pendingDurabilityPulseByCard.delete(cardId)
    return pending
  }

  const processDueLearningActionsForCurrentCard = async (trigger: 'timer' | 'force') => {
    const recovery = await learningActionScheduler.recoverRetryableLearningTasks()
    const result = await learningActionScheduler.processDueLearningTasks()
    if (recovery.reopened > 0) {
      for (let index = 0; index < recovery.reopened; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'reopened' })
    }
    if (result.failed > 0) {
      for (let index = 0; index < result.failed; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'failed' })
    }
    if (result.blocked > 0) {
      for (let index = 0; index < result.blocked; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'blocked' })
    }
    if (result.reopened > 0) {
      for (let index = 0; index < result.reopened; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'reopened' })
    }
    if (result.downgraded > 0) {
      for (let index = 0; index < result.downgraded; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'downgraded' })
    }
    if (result.cancelled > 0) {
      for (let index = 0; index < result.cancelled; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'cancelled' })
    }
    if (result.claimed > 0 || result.completed > 0 || result.failed > 0 || recovery.reopened > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.learning',
        action: 'alicization.learning.scheduler.tick',
        message: 'Processed due learning action tasks.',
        payload: {
          trigger,
          retryRecovery: recovery,
          claimed: result.claimed,
          completed: result.completed,
          failed: result.failed,
        },
      })
    }
    return result
  }

  const { runSubconsciousTickForCurrentCard } = createAlicizationSubconsciousTickRuntime({
    getActiveCardId: () => activeCardId,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    getAlicizationDb: () => alicizationDb,
    setProactiveLoopStateCache: (cardId: string, state: unknown) => proactiveLoopStateByCard.set(cardId, state as any),
    setSubconsciousStateCache: (cardId: string, state: unknown) => subconsciousStateByCard.set(cardId, state as any),
    clearForegroundProbeTimeoutStreakForPid,
    ensureSubconsciousState,
    ensureProactiveLoopState,
    openAgentTurn: (input: Parameters<typeof agentRuntime.openTurn>[0]) => agentRuntime.openTurn(input),
    buildMainGatewayAgentTurnId,
    processDueRemindersForCurrentCard,
    processDueLearningActionsForCurrentCard,
    settleExpiredPendingProactiveOutcomes,
    getSensorySnapshot: () => sensoryBus.getSnapshot(),
    ensurePerceptionState,
    sampleSubconsciousInterruptionContext,
    resolveForegroundDecisionTarget,
    getActiveAttentionAnchor,
    rememberPerceptionObservation,
    ensureVisualPresenceState,
    clampNeed,
    bootstrap,
    isAlicizationKillSwitchSuspended,
    getAlicizationCardKillSwitchState: (cardId: string) => getAlicizationCardKillSwitchSnapshot(cardId).state,
    updateLateNightActivityState,
    isLateNightWindow,
    resolveProactiveScreenSemanticSummary,
    isResidueBackedScreenSemanticSummary,
    buildProactiveLayeredContext,
    buildProactivePerceptionSignals,
    progressProactiveCadenceState,
    inferScenarioFromContext,
    consumeDurabilityPulse,
    probeForegroundPidLiveness,
    updateForegroundProbeTimeoutStreak,
    getActivePerceptionSceneResidue,
    shouldUsePerceptionResidueAsLiveSceneSummary,
    deriveRuntimeCaptureGovernance,
    buildVisualHeartbeat,
    updateVisualAttentionModel,
    buildDigitalLifeMindState,
    commitAlicizationDigitalLifeSpine: (input: Parameters<typeof commitAlicizationDigitalLifeSpineWithBodyAuthority>[0]) => commitAlicizationDigitalLifeSpineWithBodyAuthority({
      ...input,
      activeConversation: false,
    }),
    updateVisualPresenceState,
    bodyKernel,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    buildMindContinuityFragment,
    appendAuditLog,
    errorMessageFrom,
    buildReflectionLedgerFragment,
    buildVisualSedimentFragment,
    processPendingExecutionDeliveriesForCurrentCard,
    deriveAlicizationRuntimeSnapshot,
    deriveAlicizationAgentRuntimeTelemetryFromSession,
    evaluateProactivePolicy,
    emitVisualPresencePulse,
    buildPresencePulsePayload,
    buildAgentRuntimeAuditSnapshot,
    queueSoulMutation,
    parseSoul,
    clamp01,
    syncPersonalityBaselineInBody,
    snapshotFromContent,
    toSoulContent,
    normalizeCustomDirectives,
    buildProactiveRecallSeed,
    buildVisualRecallSeed,
    buildMindContinuityRecallSeed,
    getOrganicMemorySnapshot,
    resolveOrganicMemoryPromptContext,
    generateProactiveStructuredWithGateway,
    getPerformanceManifest,
    clampAlicizationPerformancePayloadToManifest,
    appendConversationTurnWithGuards,
    syncAgentTurnSessionMirror,
    buildDeferredAutonomyContinuitySignal,
    buildPendingProactiveContinuitySignal,
    ensureActiveOrLatestSessionId,
    resolveTaskPlanningCapabilities,
    scheduleAutonomyReminder: async (cardId: string, payload: {
      minutes: unknown
      message: unknown
      sourceTurnId?: string
    }) => await scheduleReminderTask(cardId, payload, 'autonomy'),
    planAutonomyTaskThread,
    dispatchAutonomyTaskThread: async (payload: any) => await dispatchTaskThreadWithExecutionDelivery({
      port: {
        getTaskThread: alicizationDb.getTaskThread,
        upsertTaskThread: alicizationDb.upsertTaskThread,
        upsertExecutorSession: alicizationDb.upsertExecutorSession,
        appendExecutionEvents: alicizationDb.appendExecutionEvents,
        appendAuditLog,
      },
      input: payload,
    }),
    workspaceRoot: processCwd(),
    buildDefaultDialoguePerformancePayload,
    buildProactiveMetadataFromDecision,
    alicizationSubconsciousPersistMs,
    persistProactiveLoopState,
    persistSubconsciousState,
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
  })

  async function runSubconsciousTickAcrossCards(
    trigger: 'timer' | 'force',
    specificCardIds?: string[],
  ): Promise<AlicizationSubconsciousTickResult> {
    const previousCardId = activeCardId
    const cardIds = specificCardIds?.length
      ? specificCardIds.map(cardId => normalizeCardId(cardId))
      : await listKnownCardIds()
    const processedCards: string[] = []
    const proactiveTriggered: string[] = []
    const suppressedCards: string[] = []
    try {
      for (const cardId of cardIds) {
        await withCardScope(cardId, async () => {
          const previousVisualPresenceState = await ensureVisualPresenceState(activeCardId)
          const result = await runSubconsciousTickForCurrentCard(trigger)
          const nextVisualPresenceState = visualPresenceStateByCard.get(activeCardId)
            ?? await ensureVisualPresenceState(activeCardId)
          const quietCompanionshipOutcome = deriveQuietCompanionshipOutcome({
            now: nextVisualPresenceState.updatedAt,
            state: nextVisualPresenceState,
            previousState: previousVisualPresenceState,
            activeConversation: false,
          })
          if (quietCompanionshipOutcome) {
            if (quietCompanionshipOutcome.shouldDispatchSilentPresencePulse) {
              emitVisualPresencePulse({
                cardId: activeCardId,
                watchMode: nextVisualPresenceState.watchMode,
                embodiedPresence: nextVisualPresenceState.privateThought?.embodiedPresence === 'none'
                  ? 'attentive'
                  : nextVisualPresenceState.privateThought?.embodiedPresence ?? 'attentive',
                scenario: nextVisualPresenceState.currentScene?.scenario ?? 'general',
                stance: nextVisualPresenceState.privateThought?.stance ?? 'accompany',
                currentBodyState: nextVisualPresenceState.currentBodyState,
                continuityMode: nextVisualPresenceState.continuityMode,
                quietLineMs: nextVisualPresenceState.quietLineMs,
                currentInwardPreoccupation: nextVisualPresenceState.currentInwardPreoccupation,
                confidence: nextVisualPresenceState.privateThought?.confidence ?? 0.82,
                reasonTags: Array.from(new Set([
                  ...(nextVisualPresenceState.privateThought?.rationaleTags ?? []),
                  'continuity-mind:quiet-companionship',
                ])),
                emotionalTension: nextVisualPresenceState.privateThought?.emotionalTension ?? 'soft-covision',
                expiresAt: Date.now() + 30_000,
              })
              const sessionId = await ensureActiveOrLatestSessionId(activeCardId).catch(() => null)
              const event = buildQuietCompanionshipMindTurnEvent({
                now: nextVisualPresenceState.updatedAt,
                decisionTraceId: sanitizeMindGovernanceDecisionTraceId(
                  `mind:${Math.max(0, Math.floor(nextVisualPresenceState.updatedAt)).toString(36)}:${randomUUID().replace(/-/g, '').slice(0, 12)}`,
                ),
                sessionId,
                outcome: quietCompanionshipOutcome,
              })
              await alicizationDb.appendMindTurnEvents([event]).catch(async (error) => {
                await appendAuditLog({
                  level: 'warning',
                  category: 'alicization.subconscious',
                  action: 'quiet-companionship-event-append-failed',
                  message: 'Failed to append quiet companionship memory-facing mind-turn event.',
                  payload: {
                    cardId: activeCardId,
                    trigger,
                    reason: errorMessageFrom(error) ?? 'unknown-error',
                  },
                })
              })
            }
          }
          processedCards.push(activeCardId)
          if (result.outwardProactiveTriggered)
            proactiveTriggered.push(activeCardId)
          if (result.suppressed)
            suppressedCards.push(activeCardId)
        }, {
          label: `subconscious-tick:${trigger}:${cardId}`,
        })
      }
    }
    finally {
      await withCardScope(previousCardId, async () => {}, {
        label: `subconscious-tick:return:${trigger}:${previousCardId}`,
      })
    }
    return {
      processedCards,
      proactiveTriggered,
      suppressedCards,
    }
  }

  const { runDreamForCurrentCard } = createAlicizationDreamRuntime({
    ensureSubconsciousState,
    ensureProactiveLoopState,
    getAlicizationDb: () => alicizationDb,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    bootstrap,
    buildMainGatewayAgentTurnId,
    getActiveCardId: () => activeCardId,
    openAgentTurn: input => agentRuntime.openTurn(input),
    generateDreamMetabolismWithGateway,
    generateCoreIncarnationReforgeWithGateway,
    generateMemoryConsolidationRefinementWithGateway,
    generateDreamAutobiographicalSummariesWithGateway,
    appendAuditLog,
    buildAgentRuntimeAuditSnapshot,
    hydrateAgentTurnFromCurrentCardState,
    truncateForDream,
    clampSoulDelta,
    normalizeOrganicMemoryItemText,
    normalizeOrganicMemoryItemArray,
    sanitizeBriefText,
    queueSoulMutation,
    snapshotFromContent,
    persistSubconsciousState,
    persistProactiveLoopState,
    syncSessionMirrorFromCurrentCardState,
    recoverProactiveRhythmAfterDream,
    clampNeed,
    dreamMaxTurns,
    dreamMaxCharsPerAssistantTurn,
    dreamMaxCharsPerUserTurn,
    dreamMaxTotalChars,
  })

  async function runDreamAcrossCards(reason = 'manual', specificCardIds?: string[]): Promise<AlicizationDreamRunResult> {
    const previousCardId = activeCardId
    const cardIds = specificCardIds?.length
      ? specificCardIds.map(cardId => normalizeCardId(cardId))
      : await listKnownCardIds()
    const processedCards: string[] = []
    const skippedCards: Array<{ cardId: string, reason: string }> = []
    try {
      for (const cardId of cardIds) {
        await withCardScope(cardId, async () => {
          const result = await runDreamForCurrentCard(reason)
          if (result.processed)
            processedCards.push(activeCardId)
          else
            skippedCards.push({ cardId: activeCardId, reason: result.skippedReason ?? 'skipped' })

          // NOTICE: The nightly replay gate should only run after a real dream pass.
          // Fresh bootstraps often trigger schedule catch-up with no new turns, and
          // benchmarking in that state creates avoidable startup contention without
          // validating any newly consolidated continuity.
          const shouldRunNightlyReplayBenchmark
            = result.processed && (reason === 'schedule-03:00' || reason === 'schedule-catch-up')
          if (shouldRunNightlyReplayBenchmark) {
            const nightlyResult = await replayBenchmarkRuntime.runNightlyReplayBenchmarkGate({
              cardId: activeCardId,
              persistTelemetry: true,
              reason,
            })
            if (!nightlyResult.ran && nightlyResult.skippedReason) {
              await appendRuntimeDebugLine('replay-benchmark-nightly.skipped', {
                cardId: activeCardId,
                reason,
                skippedReason: nightlyResult.skippedReason,
              })
            }
            else {
              await appendRuntimeDebugLine('replay-benchmark-nightly.completed', {
                cardId: activeCardId,
                reason,
                packIds: nightlyResult.results.map(item => item.packId),
                failingKeys: nightlyResult.results.flatMap(item => item.gate.failingKeys),
              })
            }
          }
        }, {
          label: `dream:${reason}:${cardId}`,
        })
      }
    }
    finally {
      await withCardScope(previousCardId, async () => {}, {
        label: `dream:return:${reason}:${previousCardId}`,
      })
    }
    return {
      processedCards,
      skippedCards,
    }
  }

  async function resolveDesktopCaptureAccess(input: {
    types: Array<'window' | 'screen'>
    thumbnailSize: {
      width: number
      height: number
    }
  }): Promise<DesktopCaptureAccessResult> {
    return await desktopCaptureAccessRuntime.resolveAccess(input)
  }

  const { augmentMainChatMessagesWithPerception } = createAlicizationChatPerceptionAugmentRuntime({
    sensoryRuntime,
    ensureProactiveLoopState,
    ensureSubconsciousState,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    bootstrap,
    listPendingScheduledTaskCount: async limit => (await alicizationDb.listPendingScheduledTasks(limit).catch(() => [])).length,
    buildDigitalLifeMindState,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    appendAuditLog,
    listHumanlikeMemoryRecallEvents: async input => await alicizationDb.listMindTurnEvents(input),
  })

  const mainChatStartEagerPreparationBudgetMs = 120

  async function executeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    dispatchMode?: 'inline' | 'background'
    task: AlicizationClawTaskIntent
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'cli' | 'codex' | 'claudeCode' | 'localVisual' | 'openclaw'>
    abortSignal?: AbortSignal
    onExecutionEvent?: (event: AlicizationExecutionEventInput) => Promise<void> | void
  }) {
    return await executorRuntime.executeMainGatewayTaskThread(input)
  }

  async function resumeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    dispatchMode?: 'inline' | 'background'
    expectedChannel: AlicizationExecutionChannel
    threadId: string
    abortSignal?: AbortSignal
    onExecutionEvent?: (event: AlicizationExecutionEventInput) => Promise<void> | void
  }) {
    return await executorRuntime.resumeMainGatewayTaskThread(input)
  }

  const { prepareMainChatPrelude, prepareMainChatExecution } = mainChatRuntime.createPreludeRuntime({
    senderWebContentsIdFromInvokeOptions,
    resolveChatMessages,
    hydrateWorkingMemory: async input => await mainChatSessionRuntime.hydrateWorkingMemory(input),
    augmentMainChatMessagesWithPerception,
    prepareMainChatSessionExecution: async input => await mainChatSessionRuntime.prepareExecution(input),
  })

  async function startMainChatStream(
    payload: AlicizationChatStartPayload,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ): Promise<AlicizationChatStartResult> {
    const normalizedPayload = payload
    await appendRuntimeDebugLine('chat-start.entered', {
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      providerId: sanitizeText(normalizedPayload.providerId),
      model: sanitizeText(normalizedPayload.model),
      activeCardId,
      hasInvokeSender: Boolean(invokeOptions?.raw?.ipcMainEvent?.sender),
    })
    const foregroundWork = mainGatewayWorkCoordinator.openForeground({
      turnId: normalizedPayload.turnId,
    })
    let foregroundReleased = false
    const releaseForeground = () => {
      if (foregroundReleased)
        return
      foregroundReleased = true
      foregroundWork.release()
    }
    const rawInvokeOptions = invokeOptions?.raw && typeof invokeOptions.raw === 'object'
      ? invokeOptions.raw as { ipcMainEvent?: IpcMainEvent, event?: unknown }
      : undefined
    // Arm the turn deadline before any feedback, persistence, or maintenance
    // work can run. The same controller is handed to the accepted run so a
    // cold-start stall cannot silently consume the whole user-visible turn.
    const startController = new AbortController()
    const clearPreparationDeadline = armAlicizationMainChatPreparationDeadline({
      controller: startController,
      timeoutMs: mainChatPreparationTimeoutMs,
      onTimeout: () => {
        void appendRuntimeDebugLine('chat-start.preparation-timeout-fired', {
          cardId: normalizedPayload.cardId,
          turnId: normalizedPayload.turnId,
          providerId: normalizedPayload.providerId,
          model: normalizedPayload.model,
          timeoutMs: mainChatPreparationTimeoutMs,
          phase: 'acceptance-or-preparation',
        })
      },
    })
    let accepted: Awaited<ReturnType<typeof acceptAlicizationMainChatStart>>
    try {
      accepted = await raceAlicizationMainChatPreparation({
        preparationPromise: foregroundWork.run(async () => await acceptAlicizationMainChatStart({
          payload: normalizedPayload,
          rawInvokeOptions,
          controller: startController,
          getExistingRun: key => chatRuns.get(key),
          registerRun: (key, runState) => chatRuns.set(key, runState),
          unregisterRun: key => chatRuns.delete(key),
          mainChatRunState,
          settleRecentDialogueReplyFeedbackFromUserTurn,
          settleRecentExecutionResultFeedbackFromUserTurn,
          settlePendingExecutionProposalFeedbackFromUserTurn,
          settlePendingProactiveOutcomesFromUserTurn,
          resolveMainGatewayConfig,
          rememberMainGatewayRoute,
          syncMainGatewayConfigFromChatStart: async ({ mainGateway, providerConfig }) =>
            // NOTICE: Keep reminder/proactive one-shot generation aligned with the latest confirmed
            // chat model route, even if renderer-side llm sync races or misses.
            await syncAlicizationMainChatLlmRoute({
              mainGateway,
              providerConfig,
              normalizeProviderConfig,
              getProviderCredentials: () => providerCredentials,
              setProviderCredentials: value => providerCredentials = value,
              setActiveProviderId: value => activeProviderId = value,
              setActiveModelId: value => activeModelId = value,
              persistLlmConfigToDisk,
            }),
          ensureMainGatewayReachable,
          appendRuntimeDebugLine,
          normalizeCardId,
          sanitizeText,
        })),
        signal: startController.signal,
      })
    }
    catch (error) {
      clearPreparationDeadline()
      releaseForeground()
      throw error
    }
    if (!accepted.accepted) {
      clearPreparationDeadline()
      releaseForeground()
      return accepted.result
    }

    const { key, mainGateway, runState } = accepted
    const isRunActive = () => chatRuns.get(key)?.state === 'running'
    let agentTurn: Awaited<ReturnType<typeof mainChatSessionRuntime.openExecutionTurn>>
    try {
      agentTurn = await foregroundWork.run(async () => await mainChatSessionRuntime.openExecutionTurn({
        cardId: normalizedPayload.cardId,
        turnId: normalizedPayload.turnId,
      }))
    }
    catch (error) {
      cleanupAlicizationAcceptedMainChatStartFailure({
        clearPreparationDeadline,
        abortController: () => startController.abort(createAbortError('agent-turn-open-failed')),
        controllerAlreadyAborted: startController.signal.aborted,
        finishRun: () => mainChatRunState.finishRun(key, {
          status: 'failed',
          finishReason: 'agent-turn-open-failed',
          error: error instanceof Error ? error.message : String(error),
        }),
        releaseForeground,
      })
      throw error
    }
    const conversationId = sanitizeText(agentTurn.conversationSessionId)
    if (!conversationId) {
      const error = new TypeError('main chat agent turn opened without a conversation identity')
      cleanupAlicizationAcceptedMainChatStartFailure({
        clearPreparationDeadline,
        abortController: () => startController.abort(createAbortError('agent-turn-missing-conversation')),
        controllerAlreadyAborted: startController.signal.aborted,
        finishRun: () => mainChatRunState.finishRun(key, {
          status: 'failed',
          finishReason: 'agent-turn-missing-conversation',
          error: error.message,
        }),
        releaseForeground,
      })
      throw error
    }

    let resolvePrelude!: (value: Awaited<ReturnType<typeof prepareMainChatPrelude>>) => void
    let rejectPrelude!: (reason?: unknown) => void
    const preludePromise = new Promise<Awaited<ReturnType<typeof prepareMainChatPrelude>>>((resolve, reject) => {
      resolvePrelude = resolve
      rejectPrelude = reject
    })
    let resolvePreparation!: (value: Awaited<ReturnType<typeof prepareMainChatExecution>>) => void
    let rejectPreparation!: (reason?: unknown) => void
    const preparationPromise = new Promise<Awaited<ReturnType<typeof prepareMainChatExecution>>>((resolve, reject) => {
      resolvePreparation = resolve
      rejectPreparation = reject
    })
    const emitToolProgress = (event: Omit<AlicizationChatToolProgressInput, 'cardId' | 'turnId'>) => {
      const state = mainChatRunState.getRun(key)
      for (const listener of state?.toolProgressListeners ?? []) {
        try {
          listener(event)
        }
        catch {
          // Tool progress observers are lifecycle sidecars and must not break execution.
        }
      }
    }
    void preparationPromise.then(clearPreparationDeadline, clearPreparationDeadline)

    void foregroundWork.run(async () => await runAlicizationMainChatBackground({
      key,
      payload: normalizedPayload,
      activeCardId,
      mainGateway,
      runState,
      prepareTurn: async ({ abortSignal }) => {
        try {
          const prelude = await foregroundWork.run(
            async () => await prepareMainChatPrelude(normalizedPayload, mainGateway, invokeOptions, {
              abortSignal,
              agentTurn,
            }),
          )
          resolvePrelude(prelude)
          const prepared = await foregroundWork.run(
            async () => await prepareMainChatExecution(
              normalizedPayload,
              mainGateway,
              Promise.resolve(prelude),
              {
                agentTurn,
                emitToolProgress,
                abortSignal,
                userId: localRuntimeUserId,
              },
            ),
          )
          resolvePreparation(prepared)
          return prepared
        }
        catch (error) {
          rejectPrelude(error)
          rejectPreparation(error)
          throw error
        }
      },
      headers: mainGateway.headers,
      isRunActive,
      runStateController: mainChatRunState,
      emitMeta: meta => emitChatStreamEventForState(mainChatRunState.getRun(key), 'meta', meta),
      emitChunk: event => emitChatStreamEventForState(mainChatRunState.getRun(key), 'chunk', event),
      emitToolCall: event => emitChatStreamEventForState(mainChatRunState.getRun(key), 'tool-call', event),
      emitToolProgress: event => emitChatStreamEventForState(mainChatRunState.getRun(key), 'tool-progress', event),
      emitToolResult: event => emitChatStreamEventForState(mainChatRunState.getRun(key), 'tool-result', event),
      emitError: event => emitChatStreamEventForState(mainChatRunState.getRun(key), 'error', event),
      incrementChunkStats: (rawDelta) => {
        const currentRun = chatRuns.get(key)
        if (currentRun) {
          currentRun.chunkCount += 1
          currentRun.rawChunkChars += rawDelta.length
        }
      },
      ensureMainGatewayReachable,
      recordMainGatewayGenerationTimeout,
      appendRuntimeDebugLine,
      queueScopedAuditLog,
      recordPreparedMindTrace: async ({ payload, prepared }) => {
        rememberPreparedMindTrace({ payload, prepared })
      },
      settlePresentedExecutionCallbacks: async ({ cardId, callbacks }) => {
        const suppressedCount = callbacks.reduce((count, callback) => {
          if (!callback.sessionId)
            return count
          return count + executionDeliveryRuntime.suppressMatching({
            cardId,
            sessionId: callback.sessionId,
            threadId: callback.threadId,
            completedAt: callback.createdAt,
          })
        }, 0)
        if (suppressedCount === 0)
          return

        await persistExecutionDeliveryState(cardId)
        await appendRuntimeDebugLine('chat-stream.execution-callbacks-settled', {
          cardId,
          turnId: normalizedPayload.turnId,
          callbackCount: callbacks.length,
          suppressedCount,
        })
      },
      turnLoop: {
        conversationId,
        userId: localRuntimeUserId,
        persistence: {
          appendRuntimeEvent: async (scope, event) =>
            await alicizationDb.appendRuntimeEvent(scope, event),
          saveRuntimeCheckpoint: async checkpoint =>
            await alicizationDb.saveRuntimeCheckpoint(checkpoint),
        },
      },
    })).finally(() => {
      releaseForeground()
      scheduleBackgroundMaintenanceStartup('foreground-turn-finished')
    })

    const startResult = await resolveAlicizationMainChatStartResult({
      cardId: normalizeCardId(normalizedPayload.cardId),
      turnId: payload.turnId,
      preludePromise,
      preparationPromise,
      eagerPreparationBudgetMs: mainChatStartEagerPreparationBudgetMs,
      buildEmbodimentMeta: buildAlicizationChatStreamEmbodimentMeta,
    })
    return startResult
  }

  async function handleDirectChatStart(
    ipcMainEvent: IpcMainInvokeEvent,
    payload: AlicizationChatStartPayload,
  ): Promise<AlicizationChatStartResult> {
    return await handleAlicizationDirectChatStart({
      ipcMainEvent,
      payload,
      withCardScope,
      startMainChatStream,
      normalizeCardId,
      sanitizeText,
      appendRuntimeDebugLine,
    })
  }

  async function handleDirectChatAbort(payload: AlicizationChatAbortPayload): Promise<AlicizationChatAbortResult> {
    return await abortAlicizationDirectChatRun({
      payload,
      getRun: key => chatRuns.get(key),
      mainChatRunState,
      createAbortError,
      appendRuntimeDebugLine,
    })
  }

  const cardIdFrom = (scope?: Partial<AlicizationCardScope>) => normalizeCardId(scope?.cardId)

  function mergeExecutionCapabilitiesWithLocalAutomation(
    baseCapabilities: AlicizationChannelCapability[],
    localCapabilities: AlicizationChannelCapability[],
  ) {
    const capabilityMap = new Map<string, AlicizationChannelCapability>()
    for (const capability of baseCapabilities) {
      capabilityMap.set(capability.channel, capability)
    }

    for (const localCapability of localCapabilities) {
      const existing = capabilityMap.get(localCapability.channel)
      if (!existing) {
        capabilityMap.set(localCapability.channel, localCapability)
        continue
      }

      const mergedAvailable = existing.available !== false || localCapability.available !== false
      const mergedEnabled = existing.enabled !== false || localCapability.enabled !== false
      const mergedReady = existing.ready !== false || localCapability.ready !== false
      capabilityMap.set(localCapability.channel, {
        channel: localCapability.channel,
        available: mergedAvailable,
        enabled: mergedEnabled,
        ready: mergedReady,
        sessionAffinity: localCapability.sessionAffinity ?? existing.sessionAffinity,
        reason: mergedReady
          ? null
          : localCapability.reason ?? existing.reason ?? null,
      })
    }

    const ordered = alicizationExecutionCapabilityChannels
      .map(channel => capabilityMap.get(channel))
      .filter((capability): capability is AlicizationChannelCapability => Boolean(capability))
    const extras = [...capabilityMap.values()].filter(capability =>
      !alicizationExecutionCapabilityChannels.includes(capability.channel as typeof alicizationExecutionCapabilityChannels[number]),
    )
    return [...ordered, ...extras]
  }

  async function resolveTaskPlanningCapabilities(capabilities?: AlicizationChannelCapability[]) {
    const [baseCapabilities, localCapabilities] = await Promise.all([
      executorRuntime.resolveTaskPlanningCapabilities(capabilities),
      localBrowserAutomation.resolveCapabilityChannels(),
    ])
    return mergeExecutionCapabilitiesWithLocalAutomation(baseCapabilities, localCapabilities)
  }

  async function planAutonomyTaskThread(
    cardId: string,
    input: Parameters<typeof executorRuntime.planTaskThread>[0],
  ) {
    const result = await executorRuntime.planTaskThread(input)
    await syncSessionMirrorFromCurrentCardState({
      cardId,
      decisionTraceId: result.thread.decisionTraceId,
      sessionId: result.thread.sessionId,
      source: 'task-planning',
      turnId: result.thread.turnId,
      taskThread: result.thread,
    })
    return result
  }

  async function resolveExecutionCapabilitiesForPrompt() {
    const [baseCapabilities, localCapabilities] = await Promise.all([
      executorRuntime.resolveExecutionCapabilitiesForPrompt(),
      localBrowserAutomation.resolveCapabilityChannels(),
    ])
    return mergeExecutionCapabilitiesWithLocalAutomation(baseCapabilities, localCapabilities)
  }

  registerAlicizationSoulStateInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    bootstrap,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    getWatching: () => soulLifecycleState.watching,
    initializeGenesis,
    queueSoulMutation,
    parseSoul,
    extractPersonaNotesFromBody,
    buildSoulBody,
    toSoulContent,
    snapshotFromContent,
    clamp01,
    getScopedKillSwitchSnapshot,
    suspendKillSwitch,
    resumeKillSwitch,
    sensoryBus,
    isAlicizationKillSwitchSuspended,
    appendAuditLog,
    rememberPerceptionObservation,
    getActiveCardId: () => activeCardId,
    ensureVisualPresenceState,
    getScreenCaptureDiagnosticsForWebContentsId,
  })
  registerAlicizationMemoryInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    getAlicizationDb: () => alicizationDb,
    getOrganicMemorySnapshot,
    getPerformanceManifest,
    setPerformanceManifest,
    searchOrganicSubconsciousFragments,
    scheduleReminderTask,
    buildAsyncFactMemoryFragments,
    knowledgeAssimilationRuntime: memoryRuntime.knowledgeAssimilationRuntime,
    appendAuditLog,
    sanitizeMindGovernanceDecisionTraceId,
    sanitizeText,
    normalizeSessionId,
    errorMessageFrom,
    workingMemoryStore,
    getPersonaTrainingExecutorConfig: personaTrainingExecutorConfigState,
    setPersonaTrainingExecutorConfig: persistPersonaTrainingExecutorConfig,
    testPersonaTrainingExecutor: async (config) => {
      if (!config) {
        return {
          ok: false,
          executable: '',
          error: 'persona training executor is not configured',
        }
      }
      return await testPersonaTrainingProcessConnection(config)
    },
  })
  registerAlicizationSkillInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    getSkillLoader: () => runtimeSkillLoader,
    appendAuditLog,
    sanitizeText,
  })
  registerAlicizationDialogueInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    normalizeSessionId,
    sanitizeText,
    appendRuntimeDebugLine,
    getActiveCardId: () => activeCardId,
    localRuntimeUserId,
    persistActiveSessionId,
    appendConversationTurnWithGuards,
    getDialogueAckCursor,
    ackDialogueDelivery,
    ensureProactiveLoopState,
    reportExplicitProactiveFeedback,
    persistProactiveLoopState,
    persistProactiveFeedbackOutcomeClosure: async (input) => {
      await persistOutcomeClosure(input.cardId, buildProactiveFeedbackOutcomeClosure(input))
    },
    syncSessionMirrorFromCurrentCardState,
    appendAuditLog,
    queueSubconsciousWake,
    getAlicizationDb: () => alicizationDb,
    getPerformanceManifest,
    getSelfEvolutionState: async () => await selfEvolutionRuntime.getSnapshot(),
    toReplayDialogueRespondedPayload,
    clearAllConversationData,
    parseStructuredHint,
  })
  registerAlicizationTaskInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    getActiveCardId: () => activeCardId,
    getAlicizationDb: () => alicizationDb,
    getAlicizationKillSwitchState: () => getAlicizationKillSwitchSnapshot().state,
    getAlicizationCardKillSwitchState: cardId => getAlicizationCardKillSwitchSnapshot(cardId).state,
    resolveTaskPlanningCapabilities,
    planTaskThread: async (input) => {
      const result = await executorRuntime.planTaskThread(input)
      await syncSessionMirrorFromCurrentCardState({
        cardId: activeCardId,
        decisionTraceId: result.thread.decisionTraceId,
        sessionId: result.thread.sessionId,
        source: 'task-planning',
        turnId: result.thread.turnId,
        taskThread: result.thread,
      })
      return result
    },
    dispatchTaskThread: async (port, payload) => await dispatchTaskThreadWithExecutionDelivery({
      port,
      input: payload,
    }),
    appendAuditLog,
    onAlicizationKillSwitchChanged,
    onAlicizationCardKillSwitchChanged,
  })
  registerAlicizationMaintenanceInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    getActiveCardId: () => activeCardId,
    getAlicizationDb: () => alicizationDb,
    appendAuditLog,
    executeBuiltinRealtimeQuery,
    defaultAlicizationCardId,
    normalizeCardId,
    switchCardScope,
    resolveCardPaths,
    rm,
    proactiveLoopStateByCard,
    perceptionStateByCard,
    visualPresenceStateByCard,
    visualPresenceCapturePersistMetaByCard,
    emitVisualPresenceState,
    screenSemanticCacheByCard,
    subconsciousStateByCard,
    activeSessionIdByCard,
    clearDialogueDeliveryCardState: cardId => dialogueDeliveryRuntime.clearCardState(cardId),
    clearDialogueSessionMirrorCard: cardId => dialogueSessionManager.clear(cardId),
    clearExecutionDeliveryStateMemory: (cardId: string) => executionDeliveryRuntime.clear(cardId),
    bootstrap,
    deleteAllAlicizationData,
    ensureSubconsciousState,
    runSubconsciousTickAcrossCards,
    runDreamAcrossCards,
    sanitizeText,
    normalizeProviderCredentialsMap,
    setActiveProviderId: value => activeProviderId = value,
    setActiveModelId: value => activeModelId = value,
    setProviderCredentials: value => providerCredentials = value,
    persistLlmConfigToDisk,
    resumePendingEmbeddingReindexJobs: async () => await alicizationDb.resumePendingMemoryEmbeddingReindexJobs(),
    getActiveProviderId: () => activeProviderId,
    getActiveModelId: () => activeModelId,
    getProviderCredentials: () => providerCredentials,
  })
  registerAlicizationChatInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    normalizeCardId,
    sanitizeText,
    appendRuntimeDebugLine,
    startMainChatStream,
    handleDirectChatAbort,
    handleDirectChatStart,
    getActiveCardId: () => activeCardId,
    ipcMain,
  })

  await restoreScopedKillSwitch(activeCardId)
  await restoreActiveSessionId(activeCardId)
  await restoreDialogueAckMap(activeCardId)
  await restoreSubconsciousState(activeCardId)
  await restoreProactiveLoopState(activeCardId)
  await restoreExecutionDeliveryState(activeCardId)
  await restoreLlmConfigFromDisk()
  const journalMode = await alicizationDb.getJournalMode().catch(() => '')
  if (journalMode !== 'wal') {
    await appendAuditLog({
      level: 'warning',
      category: 'memory',
      action: 'pragma-journal-mode',
      message: 'SQLite journal mode is not WAL.',
      payload: {
        journalMode,
      },
    })
  }

  const killSwitchShortcut = 'CommandOrControl+Alt+S'
  const shortcutRegistered = globalShortcut.register(killSwitchShortcut, () => {
    if (isAlicizationKillSwitchSuspended()) {
      void resumeGlobalKillSwitch('global-shortcut')
      return
    }
    void suspendGlobalKillSwitch('global-shortcut')
  })

  if (!shortcutRegistered) {
    console.warn(`[alicization-runtime] failed to register kill switch shortcut: ${killSwitchShortcut}`)
  }

  const handleSystemSuspend = () => {
    void flushSubconsciousStatesAcrossCards('system-suspend').catch(() => {})
    void runDreamAcrossCards('system-suspend').catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'suspend-trigger-failed',
        message: 'Dreaming run failed during system suspend trigger.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
    })
  }
  powerMonitor.on('suspend', handleSystemSuspend)

  onAppBeforeQuit(async () => {
    await taskThreadOrchestrator.dispose()
    desktopCaptureAccessRuntime.clear()
    executionDeliveryRuntime.clear()
    dialogueSessionManager.clear()
    await flushSubconsciousStatesAcrossCards('app-before-quit').catch(() => {})
    stopWatch()
    sensoryBus.stop('shutdown')
    turnWriteAbortControllers.clear()
    dialogueDeliveryRuntime.clearAllPendingDialogueDeliveries()
    mainChatRunState.clearAll()
    if (typeof ipcMain.removeHandler === 'function') {
      ipcMain.removeHandler(alicizationChatStartInvokeChannel)
      ipcMain.removeHandler(alicizationChatAbortInvokeChannel)
    }
    setAlicizationAuditLogger(undefined)
    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    if (subconsciousTimer) {
      clearInterval(subconsciousTimer)
      subconsciousTimer = undefined
    }
    if (dreamTimer) {
      clearInterval(dreamTimer)
      dreamTimer = undefined
    }
    if (backgroundMaintenanceStartupTimer) {
      clearTimeout(backgroundMaintenanceStartupTimer)
      backgroundMaintenanceStartupTimer = undefined
    }
    clearReminderDueTimer()
    clearQueuedSubconsciousWake()
    await alicizationDb.close().catch((error) => {
      console.warn('[alicization-runtime] failed to close sqlite database:', error)
    })
    if (globalShortcut.isRegistered(killSwitchShortcut)) {
      globalShortcut.unregister(killSwitchShortcut)
    }
    powerMonitor.removeListener('suspend', handleSystemSuspend)
  })

  // Sync initial snapshots for listeners.
  await bootstrap()
  if (!isAlicizationKillSwitchSuspended() && getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
    sensoryBus.start()
  void alicizationDb.runMemoryPrune().catch(async (error) => {
    await appendAuditLog({
      level: 'warning',
      category: 'memory',
      action: 'salience-refresh-startup-failed',
      message: 'Startup memory salience refresh failed.',
      payload: {
        reason: error instanceof Error ? error.message : String(error),
      },
    })
  })
  void scheduleNextReminderDueCheck('startup').catch(() => {})
  if (backgroundMaintenanceEnabled) {
    // Background maintenance is scheduled only after the first foreground
    // dialogue turn finishes. It is not a prerequisite for opening chat.
  }
  emitKillSwitchChanged()

  // `fs.watch` is only enabled after Genesis is completed.
  await ensureWatchState()
}
