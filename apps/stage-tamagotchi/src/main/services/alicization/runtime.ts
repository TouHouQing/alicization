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
  AlicizationClawTaskIntent,
  AlicizationConversationTurnInput,
  AlicizationCoreIncarnationReforgePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDispatchTaskThreadPayload,
  AlicizationDreamMetabolismPayload,
  AlicizationDreamRunResult,
  AlicizationDurabilityPulseSnapshot,
  AlicizationGenesisInput,
  AlicizationMindHeadKey,
  AlicizationPersonalityState,
  AlicizationPresencePulsePayload,
  AlicizationProactiveMetadata,
  AlicizationReminderScheduleResult,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousTickResult,
  AlicizationTaskThreadRecord,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionContinuityInput,
  AlicizationAgentTurnRuntime,
} from './agent-runtime'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { MainGatewayExecutionToolContext } from './main-chat-execution-surface'
import type {
  AlicizationProactiveLoopState,
} from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  AlicizationRuntimeSetupOptions,
} from './runtime-governance'
import type {
  CardScopeOptions,
  ChatRunState,
  DesktopCaptureAccessResult,
  OrganicMemoryPromptContext,
  PendingDialogueDeliveryState,
  ScreenSemanticCacheState,
  SubconsciousCardState,
} from './runtime-soul'

import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, mkdir, open as openFile, readdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pid, platform } from 'node:process'

import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { errorMessageFrom } from '@moeru/std'
import { getScreenCaptureDiagnosticsForWebContentsId } from '@proj-alicization/electron-screen-capture/main'
import {
  alicizationExecutionCapabilityChannels,
  inferAlicizationInspectionIntent,
  isWeakAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceTarget,
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
  buildAlicizationRuntimeSystemBlock,
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import {
  createDefaultPerceptionState,
  detectInvitedInspectionIntent,
  extractInspectionHintTerms,
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isInternalAlicizationRepairPrompt,
  normalizePerceptionState,
  rememberPerceptionSceneResidue,
  updatePerceptionStateWithObservation,
} from './attention-anchor'
import { updateVisualAttentionModel } from './attention-model'
import { setupAlicizationDb } from './db'
import { createDesktopCaptureAccessRuntime } from './desktop-capture-runtime'
import { buildDialogueIngressGovernor } from './dialogue-ingress-governor'
import { buildDialogueTurnMemoryFragment } from './dialogue-memory'
import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import {
  buildDialogueTurnSemantics,
} from './dialogue-turn-semantics'
import {
  buildAlicizationDigitalLifeRuntimeSurface,
} from './digital-life-kernel'
import {
  commitAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpineFromSurface,
  deriveAlicizationDigitalLifeSpine,
} from './digital-life-spine'
import {
  createAlicizationExecutionCallbackRuntime,
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import {
  createAlicizationExecutionDeliveryRuntime,
  hasAlicizationExecutionDeliveryRetainedState,
} from './execution-delivery-runtime'
import {
  alicizationTerminalTaskThreadStatuses,
  readExecutionOutcome,
  readLatestExecutionEvent,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import {
  buildAlicizationExecutionPayoffDeterministicStructured,
  buildAlicizationExecutionPayoffPrompt,
  selectAlicizationExecutionDeliveryReply,
} from './execution-delivery-surface'
import {
  type AlicizationExecutionResultDeliveryPolicy,
  deriveExecutionResultDeliveryPolicy,
} from './execution-interaction-learning'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import { createAlicizationExecutorRuntime } from './executor-runtime'
import { buildAsyncFactMemoryFragments } from './fact-memory'
import { abortAlicizationDirectChatRun, abortAlicizationRunningChatRuns } from './main-chat-abort'
import { runAlicizationMainChatBackground } from './main-chat-background-run'
import { handleAlicizationDirectChatStart } from './main-chat-direct-start'
import { createAlicizationExecutionFollowUpPayoffResolver } from './main-chat-follow-up-payoff'
import { syncAlicizationMainChatLlmRoute } from './main-chat-llm-route-sync'
import { createAlicizationMainChatRunStateController } from './main-chat-run-state'
import {
  createAlicizationMainChatSessionRuntime,
} from './main-chat-session-runtime'
import { acceptAlicizationMainChatStart } from './main-chat-start-acceptance'
import { resolveAlicizationMainChatStartResult } from './main-chat-start-result'
import { createAbortError } from './main-chat-stream-primitives'
import {
  createAlicizationMemoryLedgerRuntime,
  emptyAlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import { buildMindContinuityFragment, buildMindContinuityRecallSeed } from './mind-continuity'
import { sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { buildMindTruthContractLines, deriveMindTruthContract } from './mind-truth-contract'
import { isPersonaResidueMemoryText, normalizeOrganicMemoryText } from './organic-memory-hygiene'
import {
  createDefaultProactiveLoopState,
  normalizeProactiveLoopState,
  proactiveDismissCooldownMs,
  proactiveImplicitIgnoredAfterMs,
  proactiveReplyWindowMs,
  recoverProactiveRhythmAfterDream,
  registerProactiveDelivery,
  reportExplicitProactiveFeedback,
  settleExpiredProactiveOutcomes,
  settleProactiveOutcomesOnUserTurnStart,
  updateLateNightActivityState,
} from './proactive-feedback'
import { progressProactiveCadenceState } from './proactive-cadence'
import {
  attachSynthesizedReflections,
  buildDialogueReplyFeedbackOutcomeClosure,
  buildExecutionProposalFeedbackOutcomeClosure,
  buildExecutionResultFeedbackOutcomeClosure,
  buildProactiveFeedbackOutcomeClosure,
  buildReplyOutcomeClosure,
  deriveDialogueReplyFeedbackKind,
  deriveExecutionProposalFeedbackKind,
  deriveExecutionResultFeedbackKind,
} from './outcome-reinforcement'
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
import { createAlicizationAgentSessionMirrorRuntime } from './runtime-agent-session-mirror'
import { createAlicizationCardPromptRuntime } from './runtime-card-prompt'
import { createAlicizationChatPerceptionAugmentRuntime } from './runtime-chat-perception-augment'
import {
  buildChatInspectionGroundingParts,
} from './runtime-chat-prompt-blocks'
import { createAlicizationChatStreamRuntime } from './runtime-chat-stream'
import { createAlicizationDeliveryReminderRuntime } from './runtime-delivery-reminders'
import { createAlicizationDreamRuntime } from './runtime-dream'
import {
  buildAlicizationChatStreamEmbodimentMeta,
  buildCompressedNativeImageDataUrl,
  buildDefaultDialoguePerformancePayload,
  buildMindTurnTraceEvents,
  coerceConversationTurnToMindGovernedPayload,
  isAbortError,
  latestUserMessageContainsVisualInput,
  normalizeDialogueRespondedPayload,
  readStringValue,
} from './runtime-governance'
import { createAlicizationInspectionIntentRuntime } from './runtime-inspection-intent'
import { registerAlicizationChatInvokeHandlers } from './runtime-invoke-handlers-chat'
import { registerAlicizationDialogueInvokeHandlers } from './runtime-invoke-handlers-dialogue'
import { registerAlicizationMaintenanceInvokeHandlers } from './runtime-invoke-handlers-maintenance'
import { registerAlicizationMemoryInvokeHandlers } from './runtime-invoke-handlers-memory'
import { registerAlicizationSoulStateInvokeHandlers } from './runtime-invoke-handlers-soul-state'
import { registerAlicizationTaskInvokeHandlers } from './runtime-invoke-handlers-task'
import { createAlicizationMainChatContextRuntime } from './runtime-main-chat-context'
import { createAlicizationMainChatPreludeRuntime } from './runtime-main-chat-prelude'
import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'
import { createAlicizationMainGatewayOneShotRuntime } from './runtime-main-gateway-one-shot'
import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { createAlicizationOrganicMemoryAccessRuntime } from './runtime-organic-memory-access'
import { createAlicizationOrganicMemoryPromptRuntime } from './runtime-organic-memory-prompt'
import {
  normalizeOrganicRecallText,
  selectPromptActiveThoughts,
  shouldExtendContextualRecall,
} from './runtime-organic-recall'
import {
  buildInspectionSceneResidue,
  buildProactivePerceptionSignals,
  buildProactivePerceptionSystemBlock,
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
import {
  executeBuiltinRealtimeQuery,
  normalizeReminderMessage,
  sanitizeBriefText,
} from './runtime-realtime'
import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'
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
  sanitizeMultilineText,
  sanitizeText,
  resolveAlicizationSoulPersonaKernel,
  subconsciousInterruptionProbeTimeoutMs,
  syncPersonalityBaselineInBody,
  toSoulContent,
  winRenameRetryDelaysMs,
  withNeedsGenesis,
} from './runtime-soul'
import { createAlicizationSubconsciousProbeRuntime } from './runtime-subconscious-probe'
import { createAlicizationSubconsciousTickRuntime } from './runtime-subconscious-tick'
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
import { assessAlicizationTaskRouting } from './task-routing-assessor'
import { createTaskThreadOrchestrator } from './task-thread-orchestrator'
import { registerDialogueWorldThreadAssistantTurn } from './turn-outcome-reducer'
import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
} from './visual-episodic-memory'
import { buildVisualHeartbeat } from './visual-heartbeat'

export async function setupAlicizationRuntime(options?: AlicizationRuntimeSetupOptions) {
  const userDataPath = options?.userDataPathOverride ?? app.getPath('userData')
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
  let alicizationDb = await setupAlicizationDb(userDataPath, { cardId: activeCardId })
  const taskThreadOrchestrator = createTaskThreadOrchestrator()

  const { context } = createContext(ipcMain)

  const scopeLifecycleQueueState = {
    queue: Promise.resolve<unknown>(undefined),
  }
  let revision = 0
  let watching = false
  let soulSnapshot: AlicizationSoulSnapshot | null = null
  let queuedWrite: Promise<AlicizationSoulSnapshot | void> = Promise.resolve()
  let soulWatchTimer: ReturnType<typeof setTimeout> | undefined
  let soulWatcher: import('node:fs').FSWatcher | undefined
  let pruneTimer: ReturnType<typeof setInterval> | undefined
  let subconsciousTimer: ReturnType<typeof setInterval> | undefined
  let reminderDueTimer: ReturnType<typeof setTimeout> | undefined
  let dreamTimer: ReturnType<typeof setInterval> | undefined
  let muteWatchUntil = 0
  const turnWriteAbortControllers = new Map<string, AbortController>()
  const activeSessionIdByCard = new Map<string, string>()
  const dialogueAckByCard = new Map<string, Map<string, number>>()
  const dialogueReplyFeedbackAckByCard = new Map<string, string>()
  const pendingDialogueDeliveries = new Map<string, PendingDialogueDeliveryState>()
  const subconsciousStateByCard = new Map<string, SubconsciousCardState>()
  const proactiveLoopStateByCard = new Map<string, AlicizationProactiveLoopState>()
  const perceptionStateByCard = new Map<string, AlicizationPerceptionState>()
  const visualPresenceStateByCard = new Map<string, AlicizationVisualPresenceStateSnapshot>()
  const visualPresenceCapturePersistMetaByCard = new Map<string, {
    fingerprint: string
    persistedAt: number
  }>()
  const screenSemanticCacheByCard = new Map<string, ScreenSemanticCacheState>()
  const pendingDurabilityPulseByCard = new Map<string, AlicizationDurabilityPulseSnapshot>()
  const foregroundProbeTimeoutStreakByPid = new Map<number, number>()
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
  const mainChatRunState = createAlicizationMainChatRunStateController({
    runs: chatRuns,
    sessionTraceGetters: chatRunSessionTraceGetters,
    recentlyFinishedRuns: recentlyFinishedChatRuns,
    finishedRetentionMs: chatRunFinishedRetentionMs,
    normalizeCardId,
    appendRuntimeDebugLine,
    emitFinishEvent: (state, payload) => emitChatStreamEventForState(state, 'finish', payload),
  })
  const memoryLedgerRuntime = createAlicizationMemoryLedgerRuntime({
    listExecutionEvents: input => alicizationDb.listExecutionEvents(input),
    listTaskThreads: input => alicizationDb.listTaskThreads(input),
  })
  const executionCallbackRuntime = createAlicizationExecutionCallbackRuntime({
    listExecutionEvents: input => alicizationDb.listExecutionEvents(input),
    listTaskThreads: input => alicizationDb.listTaskThreads(input),
  })
  const organicMemoryAccessRuntime = createAlicizationOrganicMemoryAccessRuntime({
    getSoulSnapshot: () => soulSnapshot,
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
    searchEpisodicEvents: async input => await alicizationDb.searchEpisodicEvents(input),
    searchConversationTurnsForRecall: async input => await alicizationDb.searchConversationTurnsForRecall(input),
    searchMemoryConsolidations: async input => await alicizationDb.searchMemoryConsolidations?.(input) ?? [],
    listConversationTurnsBySession: async (sessionId, options) => await alicizationDb.listConversationTurnsBySession(sessionId, options),
  })
  const {
    getOrganicMemorySnapshot,
    getPerformanceManifest,
    setPerformanceManifest,
    searchOrganicSubconsciousFragments,
    recallSubconsciousFragmentsWithGovernor,
    recallEpisodicEventsWithGovernor,
    buildHostPersonModel,
    recallConversationHistory,
    recallMemoryConsolidations,
    resolveRecentContextualTurns,
  } = organicMemoryAccessRuntime
  const organicMemoryPromptRuntime = createAlicizationOrganicMemoryPromptRuntime({
    normalizeOrganicRecallText,
    selectPromptActiveThoughts,
    getOrganicMemorySnapshot,
    getLatestRelationshipDynamics: async () => await alicizationDb.getLatestRelationshipDynamics().catch(() => null),
    retrieveMemoryFacts: async (recallSeed, limit) => await alicizationDb.retrieveMemoryFacts(recallSeed, limit).catch(() => []),
    recallSubconsciousFragmentsWithGovernor,
    recallEpisodicEventsWithGovernor,
    buildHostPersonModel,
    recallConversationHistory,
    recallMemoryConsolidations,
    planMemoryRecollection: async input => await generateMemoryRecollectionPlanWithGateway(input),
    isPersonaResidueMemoryText,
  })
  const {
    buildProactiveRecallSeed,
    buildOrganicMemorySystemBlocks,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    buildPerformanceManifestSystemBlocks,
    resolveOrganicMemoryPromptContext,
  } = organicMemoryPromptRuntime
  const sessionContinuityBuildersRuntime = createAlicizationSessionContinuityBuildersRuntime({
    sanitizeText,
    sanitizeBriefText,
    sanitizeExecutionLedgerText,
    readTaskThreadActivityAt,
    terminalTaskThreadStatuses: alicizationTerminalTaskThreadStatuses,
    proactiveReplyWindowMs,
    proactiveImplicitIgnoredAfterMs,
    proactiveDismissCooldownMs,
    buildVisualPresenceCapturePersistFingerprint,
  })
  const {
    buildExecutionDeliveryAction,
    buildTaskThreadSessionMirrorAction,
    buildSceneResidueSessionMirrorAction,
    buildReminderContinuitySignal,
    buildReminderSessionMirrorAction,
    buildProactiveFeedbackSessionMirrorAction,
    buildPendingProactiveContinuitySignal,
    buildProactiveContinuitySignals,
    buildDialogueContinuitySignal,
    buildVisualPresenceContinuitySignal,
  } = sessionContinuityBuildersRuntime
  const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime()
  const resolveActiveDialogueDeterministicReply = createAlicizationExecutionFollowUpPayoffResolver({
    listExecutionEvents: input => alicizationDb.listExecutionEvents(input),
    listTaskThreads: input => alicizationDb.listTaskThreads(input),
  })
  const agentRuntime = createAlicizationAgentRuntime({
    getSensorySnapshot: async () => sensoryBus.getSnapshot(),
    resolveConversationSessionId: async cardId => await ensureActiveOrLatestSessionId(cardId),
  })
  const dialogueSessionManager = createAlicizationDialogueSessionManager()
  const executorRuntime = createAlicizationExecutorRuntime({
    appendAuditLog,
    assessTaskRouting: input => assessAlicizationTaskRouting(input),
    dispatchTaskThread: invocation => dispatchTaskThreadWithExecutionDelivery(invocation),
    ensureSessionId: ensureActiveOrLatestSessionId,
    getAlicizationDb: () => alicizationDb,
    getCardKillSwitchState: cardId => getAlicizationCardKillSwitchSnapshot(cardId).state,
    getGlobalKillSwitchState: () => getAlicizationKillSwitchSnapshot().state,
    normalizeSessionId,
    sanitizeText,
  })
  let activeProviderId = ''
  let activeModelId = ''
  let providerCredentials: Record<string, Record<string, unknown>> = {}
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
    getSoulSnapshot: () => soulSnapshot,
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
    buildReminderSessionMirrorAction,
    dialogueSessionManager,
  })
  const {
    buildAgentRuntimeAuditSnapshot,
    buildAgentTurnContinuitySystemMessages,
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
    buildPerformanceManifestSystemBlocks,
    buildAgentTurnContinuitySystemMessages,
    syncAgentTurnSessionMirror,
    appendAuditLog,
    describePerceptionTarget,
    buildMainGatewayAgentTurnId,
    screenSemanticCacheByCard,
    ensurePerceptionState,
    getUsablePerceptionSceneResidue,
    buildScreenSemanticSummaryFromResidue,
    resolveDesktopCaptureAccess,
    getDesktopCaptureAccessRuntimeSnapshot: input => deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot(
      desktopCaptureAccessRuntime.getSnapshot(input),
    ),
    rememberSceneResidue,
  })
  const {
    buildScreenSemanticSceneResidue,
    generateScreenSemanticSummaryFromImage,
    generateMainGatewayText,
    resolveProactiveScreenSemanticSummary,
  } = mainGatewayOneShotRuntime
  let resolveInspectionIntentFromMessageHistory = (
    _input: { userText: string, messages: AlicizationChatStartPayload['messages'] },
  ) => false
  const mainChatContextRuntime = createAlicizationMainChatContextRuntime({
    getActiveCardId: () => activeCardId,
    normalizeOrganicRecallText,
    readTransportContentAsText,
    isInternalAlicizationRepairPrompt,
    emptyAlicizationExecutionCallbackContext,
    emptyAlicizationExecutionLedgerContext,
    ensureActiveOrLatestSessionId,
    buildPendingExecutionCallbackContext: input => executionCallbackRuntime.buildPendingExecutionCallbackContext(input),
    buildExecutionLedgerContext: input => memoryLedgerRuntime.buildExecutionLedgerContext(input),
    listTaskThreadsBySession: input => alicizationDb.listTaskThreads(input),
    resolveRecentContextualTurns,
    shouldExtendContextualRecall,
    resolveInspectionIntentFromMessageHistory: input => resolveInspectionIntentFromMessageHistory(input),
    detectInvitedInspectionIntent,
  })
  const {
    buildMainChatExecutionCallbackContext,
    buildMainChatExecutionLedgerContext,
    buildMainChatPendingAffirmationThread,
    buildMainChatContextualString,
    readLatestUserMessageText,
    readLatestAssistantMessageText,
    redactStaleInspectionHistoryMessages,
  } = mainChatContextRuntime
  redactStaleInspectionHistoryMessagesForChat = redactStaleInspectionHistoryMessages
  const inspectionIntentRuntime = createAlicizationInspectionIntentRuntime({
    normalizeOrganicRecallText,
    readLatestAssistantMessageText,
    readTransportContentAsText,
  })
  const {
    buildDialogueIngressContext,
    resolveInspectionIntentForChatTurn,
  } = inspectionIntentRuntime
  const mindStateRuntime = createAlicizationMindStateRuntime({
    buildDialogueIngressContext,
    generateMainGatewayText,
    buildMainGatewayAgentTurnId,
    readLatestAssistantMessageText,
    readTransportContentAsText,
    retrieveMemoryFacts: async (query, limit) => await alicizationDb.retrieveMemoryFacts(query, limit).catch(() => []),
    listRelationshipOutcomes: async (cardId, limit) => await alicizationDb.listRelationshipOutcomes({ cardId, limit }).catch(() => []),
    listPersonaReinforcementEvents: async (cardId, limit) => await alicizationDb.listPersonaReinforcementEvents({ cardId, limit }).catch(() => []),
    listMemoryReflections: async (cardId, limit) => await alicizationDb.listMemoryReflections({ cardId, limit }).catch(() => []),
    readMindHead: async <T>(cardId: string, key: AlicizationMindHeadKey) => await alicizationDb.readMindHead<T>(cardId, key).catch((): T | null => null),
  })
  const {
    buildDigitalLifeMindState,
    buildMindAttentionSignature,
    buildMindSceneSignature,
  } = mindStateRuntime
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
    resolveHostAttitude: async () => (soulSnapshot ?? await bootstrap()).frontmatter.host_attitude,
    resolveInspectionIntentForChatTurn,
    resolveSenderCaptureSnapshot: senderWebContentsId => senderWebContentsId
      ? deriveSensoryCaptureSnapshotFromDiagnostics(getScreenCaptureDiagnosticsForWebContentsId(senderWebContentsId))
      : null,
    sampleSubconsciousInterruptionContext,
    shouldSuppressWeakGenericBrowserInspectionAnchor,
  })
  resolveInspectionIntentFromMessageHistory = sensoryRuntime.resolveInspectionIntentFromMessageHistory
  const mainChatSessionRuntime = createAlicizationMainChatSessionRuntime({
    buildMainRuntimeCorePromptBlocks,
    buildOrganicMemorySystemBlocks,
    buildPerformanceManifestSystemBlocks,
    dialogueSessionManager,
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
    resolveOrganicMemoryPromptContext,
    resolveSessionContinuitySignals: async ({ cardId }) => await resolveAgentSessionContinuitySignals(cardId),
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

  const getScopedKillSwitchSnapshot = (cardId = activeCardId) => {
    const globalSnapshot = getAlicizationKillSwitchSnapshot()
    const cardSnapshot = getAlicizationCardKillSwitchSnapshot(cardId)
    if (globalSnapshot.state === 'SUSPENDED') {
      return {
        state: 'SUSPENDED' as const,
        reason: globalSnapshot.reason ?? cardSnapshot.reason ?? 'global',
        updatedAt: Math.max(globalSnapshot.updatedAt, cardSnapshot.updatedAt),
      }
    }
    return cardSnapshot
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
  setAlicizationAuditLogger(appendAuditLog)

  sensoryBus = createAlicizationSensoryBus({
    tickMs: 60_000,
    staleMs: 90_000,
    cpuWindowMs: 1_000,
    appendAuditLog: input => appendAuditLog(input, activeCardId),
  })

  async function persistScopedKillSwitch(cardId: string, state: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    const snapshot = setAlicizationCardKillSwitchState(cardId, state, reason)
    await alicizationDb.setMetaValue(alicizationCardKillSwitchMetaKey, JSON.stringify(snapshot)).catch(() => {})
    return snapshot
  }

  function normalizeSessionId(raw: unknown) {
    if (typeof raw !== 'string')
      return ''
    return raw.trim()
  }

  function getDialogueAckMap(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    let map = dialogueAckByCard.get(cardId)
    if (!map) {
      map = new Map<string, number>()
      dialogueAckByCard.set(cardId, map)
    }
    return map
  }

  function getDialogueAckCursor(cardIdRaw: unknown, sessionIdRaw: unknown) {
    const sessionId = normalizeSessionId(sessionIdRaw)
    if (!sessionId)
      return 0
    const map = getDialogueAckMap(cardIdRaw)
    const cursor = map.get(sessionId)
    return typeof cursor === 'number' && Number.isFinite(cursor) ? cursor : 0
  }

  function normalizeDialogueAckObject(raw: unknown) {
    const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    const entries = Object.entries(source)
      .map(([sessionId, cursorRaw]) => {
        const normalizedSessionId = normalizeSessionId(sessionId)
        const cursor = Number(cursorRaw)
        if (!normalizedSessionId || !Number.isFinite(cursor))
          return null
        return [normalizedSessionId, Math.max(0, Math.floor(cursor))] as const
      })
      .filter((entry): entry is readonly [string, number] => Boolean(entry))
    return new Map<string, number>(entries)
  }

  async function persistDialogueAckMap(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const payload = Object.fromEntries(getDialogueAckMap(cardId).entries())
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationDialogueAckStateMetaKey, JSON.stringify(payload)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationDialogueAckStateMetaKey, JSON.stringify(payload)).catch(() => {})
    }, {
      label: `dialogue-ack.persist:${cardId}`,
    })
  }

  async function restoreDialogueAckMap(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const setMap = (map: Map<string, number>) => {
      dialogueAckByCard.set(cardId, map)
      return map
    }

    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationDialogueAckStateMetaKey).catch(() => undefined)
        if (!raw) {
          setMap(new Map())
          return
        }
        try {
          setMap(normalizeDialogueAckObject(JSON.parse(raw)))
        }
        catch {
          setMap(new Map())
        }
      }, {
        label: `dialogue-ack.restore:${cardId}`,
      })
      return getDialogueAckMap(cardId)
    }

    const raw = await alicizationDb.getMetaValue(alicizationDialogueAckStateMetaKey).catch(() => undefined)
    if (!raw)
      return setMap(new Map())
    try {
      return setMap(normalizeDialogueAckObject(JSON.parse(raw)))
    }
    catch {
      return setMap(new Map())
    }
  }

  async function ensureDialogueReplyFeedbackAck(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const existing = dialogueReplyFeedbackAckByCard.get(cardId)
    if (typeof existing === 'string')
      return existing

    const apply = (raw: unknown) => {
      const normalized = sanitizeText(raw, '')
      dialogueReplyFeedbackAckByCard.set(cardId, normalized)
      return normalized
    }

    if (cardId !== activeCardId) {
      return await withCardScope(cardId, async () => {
        return apply(await alicizationDb.getMetaValue(alicizationDialogueReplyFeedbackAckMetaKey).catch(() => undefined))
      }, {
        label: `dialogue-reply-feedback-ack.restore:${cardId}`,
      })
    }

    return apply(await alicizationDb.getMetaValue(alicizationDialogueReplyFeedbackAckMetaKey).catch(() => undefined))
  }

  async function persistDialogueReplyFeedbackAck(cardIdRaw: unknown, ack: string) {
    const cardId = normalizeCardId(cardIdRaw)
    dialogueReplyFeedbackAckByCard.set(cardId, ack)
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationDialogueReplyFeedbackAckMetaKey, ack).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationDialogueReplyFeedbackAckMetaKey, ack).catch(() => {})
    }, {
      label: `dialogue-reply-feedback-ack.persist:${cardId}`,
    })
  }

  function createPendingDialogueDeliveryKey(payload: Pick<AlicizationDialogueRespondedPayload, 'cardId' | 'sessionId' | 'turnId'>) {
    return `${normalizeCardId(payload.cardId)}::${normalizeSessionId(payload.sessionId)}::${sanitizeText(payload.turnId)}`
  }

  function clearPendingDialogueDelivery(entryOrKey: PendingDialogueDeliveryState | string) {
    const key = typeof entryOrKey === 'string' ? entryOrKey : entryOrKey.key
    const pending = typeof entryOrKey === 'string' ? pendingDialogueDeliveries.get(entryOrKey) : entryOrKey
    if (pending?.timer) {
      clearTimeout(pending.timer)
      pending.timer = undefined
    }
    pendingDialogueDeliveries.delete(key)
  }

  function clearPendingDialogueDeliveriesByCard(cardIdRaw: unknown) {
    const normalizedCardId = normalizeCardId(cardIdRaw)
    for (const pending of pendingDialogueDeliveries.values()) {
      if (normalizeCardId(pending.payload.cardId) !== normalizedCardId)
        continue
      clearPendingDialogueDelivery(pending)
    }
  }

  function clearAllPendingDialogueDeliveries() {
    for (const pending of pendingDialogueDeliveries.values()) {
      clearPendingDialogueDelivery(pending)
    }
    pendingDialogueDeliveries.clear()
  }

  function shouldSkipPendingDialogueRetry(payload: AlicizationDialogueRespondedPayload) {
    const currentCursor = getDialogueAckCursor(payload.cardId, payload.sessionId)
    return payload.createdAt <= currentCursor
  }

  function schedulePendingDialogueRetry(entry: PendingDialogueDeliveryState, reason: string) {
    clearPendingDialogueDelivery(entry)

    if (shouldSkipPendingDialogueRetry(entry.payload))
      return
    if (entry.attempts >= dialogueDeliveryRetryMaxAttempts)
      return

    const delayMs = Math.min(
      dialogueDeliveryRetryMaxMs,
      dialogueDeliveryRetryBaseMs * 2 ** Math.max(0, entry.attempts),
    )

    entry.timer = setTimeout(() => {
      const current = pendingDialogueDeliveries.get(entry.key)
      if (!current)
        return
      if (shouldSkipPendingDialogueRetry(current.payload)) {
        clearPendingDialogueDelivery(current)
        return
      }

      emitDialogueRespondedEvent(current.payload)
      current.attempts += 1
      void appendRuntimeDebugLine('dialogue-responded.retry', {
        cardId: current.payload.cardId,
        sessionId: current.payload.sessionId,
        turnId: current.payload.turnId,
        attempts: current.attempts,
        reason,
      })
      schedulePendingDialogueRetry(current, 'unacked-retry')
    }, delayMs)

    pendingDialogueDeliveries.set(entry.key, entry)
  }

  function emitDialogueRespondedEvent(payload: AlicizationDialogueRespondedPayload) {
    context.emit(alicizationDialogueResponded, payload)
    emitDialogueRespondedDispatch(payload)
  }

  function emitDialogueRespondedDispatch(payload: AlicizationDialogueRespondedPayload) {
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

  function emitDialogueRespondedWithDelivery(payload: AlicizationDialogueRespondedPayload) {
    emitDialogueRespondedEvent(payload)

    if (payload.origin !== 'subconscious-proactive')
      return

    const key = createPendingDialogueDeliveryKey(payload)
    const existing = pendingDialogueDeliveries.get(key)
    const next: PendingDialogueDeliveryState = existing
      ? {
          ...existing,
          payload,
        }
      : {
          key,
          payload,
          attempts: 0,
        }
    void appendRuntimeDebugLine('dialogue-delivery.pending-registered', {
      cardId: payload.cardId,
      sessionId: payload.sessionId,
      turnId: payload.turnId,
      createdAt: payload.createdAt,
      hasExisting: Boolean(existing),
      currentActiveSession: normalizeSessionId(activeSessionIdByCard.get(normalizeCardId(payload.cardId))),
    })
    schedulePendingDialogueRetry(next, 'initial-delivery')
  }

  async function persistActiveSessionId(cardId: string, sessionId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const normalizedSessionId = normalizeSessionId(sessionId)
    if (!normalizedSessionId)
      return

    activeSessionIdByCard.set(normalizedCardId, normalizedSessionId)
    await alicizationDb.setMetaValue(alicizationCardActiveSessionMetaKey, normalizedSessionId).catch(() => {})
  }

  async function restoreActiveSessionId(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const rawFromMeta = await alicizationDb.getMetaValue(alicizationCardActiveSessionMetaKey).catch(() => undefined)
    const fromMeta = normalizeSessionId(rawFromMeta)
    if (fromMeta) {
      activeSessionIdByCard.set(normalizedCardId, fromMeta)
      return fromMeta
    }

    const latestFromTurns = normalizeSessionId(await alicizationDb.getLatestConversationSessionId().catch(() => undefined))
    if (latestFromTurns) {
      activeSessionIdByCard.set(normalizedCardId, latestFromTurns)
      await alicizationDb.setMetaValue(alicizationCardActiveSessionMetaKey, latestFromTurns).catch(() => {})
      return latestFromTurns
    }

    return ''
  }

  async function ensureActiveOrLatestSessionId(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const fromMemory = normalizeSessionId(activeSessionIdByCard.get(normalizedCardId))
    if (fromMemory)
      return fromMemory

    const restored = normalizeSessionId(await restoreActiveSessionId(normalizedCardId))
    if (restored)
      return restored

    const fallback = `session:auto:${normalizedCardId}:${Date.now()}`
    await persistActiveSessionId(normalizedCardId, fallback)
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.session',
      action: 'auto-created',
      message: 'Auto-created fallback conversation session for card scope.',
      payload: {
        sessionId: fallback,
      },
    }, normalizedCardId)
    return fallback
  }

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
      const [visualPresenceState, proactiveState] = await Promise.all([
        ensureVisualPresenceState(cardId).catch(() => null),
        ensureProactiveLoopState(cardId).catch(() => null),
      ])
      const dialogueSignal = visualPresenceState ? buildDialogueContinuitySignal(visualPresenceState) : null
      const visualPresenceSignal = visualPresenceState ? buildVisualPresenceContinuitySignal(visualPresenceState) : null
      const sessionContinuitySignals = [
        ...(proactiveState ? buildProactiveContinuitySignals(proactiveState, now) : []),
        ...(dialogueSignal ? [dialogueSignal] : []),
        ...(visualPresenceSignal ? [visualPresenceSignal] : []),
      ].sort((left, right) => Number(left.createdAt) - Number(right.createdAt))
      const digitalLifeRuntimeSurface = options?.digitalLifeRuntimeSurface
        ?? (visualPresenceState ? buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState) : null)
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

  async function queueExecutionDeliveryCandidate(input: {
    cardId: string
    thread: AlicizationTaskThreadRecord
  }) {
    const cardId = normalizeCardId(input.cardId)
    const sessionId = normalizeSessionId(input.thread.sessionId)
    if (!sessionId)
      return null
    if (!alicizationTerminalTaskThreadStatuses.has(input.thread.status))
      return null

    const events = await alicizationDb.listExecutionEvents({
      threadId: input.thread.id,
      limit: 8,
    }).catch(() => [])
    const latestEvent = readLatestExecutionEvent(events)
    const completedAt = readTaskThreadActivityAt(input.thread)
    const queued = executionDeliveryRuntime.enqueue({
      cardId,
      sessionId,
      threadId: input.thread.id,
      decisionTraceId: input.thread.decisionTraceId,
      turnId: input.thread.turnId,
      channel: input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor',
      status: input.thread.status,
      goal: input.thread.goal,
      summary: input.thread.summary,
      outcome: readExecutionOutcome(events),
      signature: sanitizeExecutionLedgerText(
        latestEvent
          ? `${input.thread.id}:${latestEvent.id ?? latestEvent.createdAt}`
          : `${input.thread.id}:${completedAt}`,
        220,
      ),
      completedAt,
    })

    if (!queued)
      return null

    await persistExecutionDeliveryState(cardId)
    await syncSessionMirrorFromCurrentCardState({
      cardId,
      decisionTraceId: queued.decisionTraceId,
      sessionId: queued.sessionId,
      source: 'execution-delivery-queued',
      turnId: queued.turnId,
      taskThread: input.thread,
    })

    await appendAuditLog({
      level: 'notice',
      category: 'alicization.executor.delivery',
      action: 'queued',
      message: 'Queued a settled task-thread callback for subconscious delivery.',
      payload: {
        threadId: queued.threadId,
        sessionId: queued.sessionId,
        status: queued.status,
        channel: queued.channel,
        completedAt: queued.completedAt,
      },
    }, cardId)
    queueSubconsciousWake(cardId, `execution-delivery:${queued.threadId}`, 240)
    return queued
  }

  async function dispatchTaskThreadWithExecutionDelivery(invocation: Parameters<typeof taskThreadOrchestrator.dispatch>[0]) {
    const scopedCardId = activeCardId
    const result = await taskThreadOrchestrator.dispatch(invocation)
    await syncSessionMirrorFromCurrentCardState({
      cardId: scopedCardId,
      decisionTraceId: result.thread.decisionTraceId,
      sessionId: result.thread.sessionId,
      source: 'task-dispatch',
      turnId: result.thread.turnId,
      taskThread: result.thread,
    })
    if (alicizationTerminalTaskThreadStatuses.has(result.thread.status))
      await queueExecutionDeliveryCandidate({ cardId: scopedCardId, thread: result.thread })
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

  async function persistProactiveLoopState(cardIdRaw: unknown, state: AlicizationProactiveLoopState) {
    const cardId = normalizeCardId(cardIdRaw)
    proactiveLoopStateByCard.set(cardId, state)
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationProactiveLoopStateMetaKey, JSON.stringify(state)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationProactiveLoopStateMetaKey, JSON.stringify(state)).catch(() => {})
    }, {
      label: `proactive-loop.persist:${cardId}`,
    })
  }

  async function restoreProactiveLoopState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const now = Date.now()
    const setState = (state: AlicizationProactiveLoopState) => {
      proactiveLoopStateByCard.set(cardId, state)
      return state
    }

    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationProactiveLoopStateMetaKey).catch(() => undefined)
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
      return proactiveLoopStateByCard.get(cardId) ?? createDefaultProactiveLoopState(now)
    }

    const raw = await alicizationDb.getMetaValue(alicizationProactiveLoopStateMetaKey).catch(() => undefined)
    if (!raw)
      return setState(createDefaultProactiveLoopState(now))
    try {
      return setState(normalizeProactiveLoopState(JSON.parse(raw), now))
    }
    catch {
      return setState(createDefaultProactiveLoopState(now))
    }
  }

  async function ensureProactiveLoopState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = proactiveLoopStateByCard.get(cardId)
    if (current)
      return current
    return await restoreProactiveLoopState(cardId)
  }

  async function persistExecutionDeliveryState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const state = executionDeliveryRuntime.snapshot(cardId)
    const value = hasAlicizationExecutionDeliveryRetainedState(state)
      ? JSON.stringify(state)
      : ''

    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationExecutionDeliveryStateMetaKey, value).catch(() => {})
      return state
    }

    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationExecutionDeliveryStateMetaKey, value).catch(() => {})
    }, {
      label: `execution-delivery.persist:${cardId}`,
    })
    return state
  }

  async function restoreExecutionDeliveryState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const apply = (raw: string | undefined) => {
      if (!raw)
        return executionDeliveryRuntime.restore(cardId, null)
      try {
        return executionDeliveryRuntime.restore(cardId, JSON.parse(raw))
      }
      catch {
        return executionDeliveryRuntime.restore(cardId, null)
      }
    }

    const restored = cardId === activeCardId
      ? apply(await alicizationDb.getMetaValue(alicizationExecutionDeliveryStateMetaKey).catch(() => undefined))
      : await withCardScope(cardId, async () => apply(await alicizationDb.getMetaValue(alicizationExecutionDeliveryStateMetaKey).catch(() => undefined)), {
          label: `execution-delivery.restore:${cardId}`,
        })

    if (cardId === activeCardId && restored.pending.length > 0)
      queueSubconsciousWake(cardId, 'execution-delivery-restore', 240)
    return restored
  }

  async function persistPerceptionState(cardIdRaw: unknown, state: AlicizationPerceptionState) {
    const cardId = normalizeCardId(cardIdRaw)
    perceptionStateByCard.set(cardId, state)
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationPerceptionStateMetaKey, JSON.stringify(state)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationPerceptionStateMetaKey, JSON.stringify(state)).catch(() => {})
    }, {
      label: `perception.persist:${cardId}`,
    })
  }

  async function restorePerceptionState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const now = Date.now()
    const setState = (state: AlicizationPerceptionState) => {
      perceptionStateByCard.set(cardId, state)
      return state
    }

    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationPerceptionStateMetaKey).catch(() => undefined)
        if (!raw) {
          setState(createDefaultPerceptionState(now))
          return
        }
        try {
          setState(normalizePerceptionState(JSON.parse(raw), now))
        }
        catch {
          setState(createDefaultPerceptionState(now))
        }
      }, {
        label: `perception.restore:${cardId}`,
      })
      return perceptionStateByCard.get(cardId) ?? createDefaultPerceptionState(now)
    }

    const raw = await alicizationDb.getMetaValue(alicizationPerceptionStateMetaKey).catch(() => undefined)
    if (!raw)
      return setState(createDefaultPerceptionState(now))
    try {
      return setState(normalizePerceptionState(JSON.parse(raw), now))
    }
    catch {
      return setState(createDefaultPerceptionState(now))
    }
  }

  async function ensurePerceptionState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = perceptionStateByCard.get(cardId) ?? await restorePerceptionState(cardId)
    const normalized = normalizePerceptionState(current, Date.now())
    if (JSON.stringify(normalized) !== JSON.stringify(current)) {
      await persistPerceptionState(cardId, normalized)
      return normalized
    }
    return current
  }

  function rememberVisualPresencePersistMeta(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot, persistedAt: number = Date.now()) {
    const cardId = normalizeCardId(cardIdRaw)
    visualPresenceCapturePersistMetaByCard.set(cardId, {
      fingerprint: buildVisualPresenceCapturePersistFingerprint(state),
      persistedAt: Number.isFinite(persistedAt) ? Math.max(0, Math.floor(persistedAt)) : Date.now(),
    })
  }

  async function persistVisualPresenceState(
    cardIdRaw: unknown,
    state: AlicizationVisualPresenceStateSnapshot,
    options: {
      debounceWindowMs?: number
      fingerprint?: string
    } = {},
  ) {
    const cardId = normalizeCardId(cardIdRaw)
    visualPresenceStateByCard.set(cardId, state)
    const fingerprint = options.fingerprint ?? buildVisualPresenceCapturePersistFingerprint(state)
    const debounceWindowMs = Number.isFinite(options.debounceWindowMs) ? Math.max(0, Math.floor(options.debounceWindowMs!)) : 0
    const previousPersistMeta = visualPresenceCapturePersistMetaByCard.get(cardId)
    const now = Date.now()
    if (
      debounceWindowMs > 0
      && previousPersistMeta?.fingerprint === fingerprint
      && now - previousPersistMeta.persistedAt < debounceWindowMs
    ) {
      return
    }

    rememberVisualPresencePersistMeta(cardId, state, now)
    await persistMindHeadsFromVisualState(cardId, state)
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationVisualPresenceStateMetaKey, JSON.stringify(state)).catch(() => {})
      emitVisualPresenceState(cardId, state)
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationVisualPresenceStateMetaKey, JSON.stringify(state)).catch(() => {})
    }, {
      label: `visual-presence.persist:${cardId}`,
    })
    emitVisualPresenceState(cardId, state)
  }

  async function persistMindHeadsFromVisualState(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot) {
    const cardId = normalizeCardId(cardIdRaw)
    const task = async () => {
      await alicizationDb.upsertMindHead(cardId, 'autobiographical-self', state.autobiographicalSelf ?? null)
      await alicizationDb.upsertMindHead(cardId, 'reflection-ledger', state.reflectionLedger ?? null)
      await alicizationDb.upsertMindHead(cardId, 'motive-engine', state.motiveEngine ?? null)
      await alicizationDb.upsertMindHead(cardId, 'habit-policy', state.habitPolicy ?? null)
    }

    if (cardId === activeCardId) {
      await task().catch(() => {})
      return
    }

    await withCardScope(cardId, async () => {
      await task().catch(() => {})
    }, {
      label: `mind-heads.persist:${cardId}`,
    })
  }

  async function persistOutcomeClosure(cardIdRaw: unknown, input: ReturnType<typeof attachSynthesizedReflections>) {
    const cardId = normalizeCardId(cardIdRaw)
    const closure = attachSynthesizedReflections(input)
    if (
      closure.relationshipOutcomes.length === 0
      && closure.reinforcementEvents.length === 0
      && closure.memoryFacts.length === 0
      && closure.reflections.length === 0
      && closure.episodicEvents.length === 0
    ) {
      return
    }

    const task = async () => {
      if (closure.relationshipOutcomes.length > 0)
        await alicizationDb.appendRelationshipOutcomes(closure.relationshipOutcomes)
      if (closure.episodicEvents.length > 0)
        await alicizationDb.appendEpisodicEvents(closure.episodicEvents)
      if (closure.reinforcementEvents.length > 0)
        await alicizationDb.appendPersonaReinforcementEvents(closure.reinforcementEvents)
      if (closure.reflections.length > 0)
        await alicizationDb.upsertMemoryReflections(closure.reflections)
      if (closure.memoryFacts.length > 0)
        await alicizationDb.upsertMemoryFacts(closure.memoryFacts, 'rule')
    }

    try {
      if (cardId === activeCardId) {
        await task()
      }
      else {
        await withCardScope(cardId, async () => {
          await task()
        }, {
          label: `outcome-closure.persist:${cardId}`,
        })
      }
    }
    catch (error) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'outcome-closure-persist-failed',
        message: 'Failed to persist mind-memory closure records from a runtime outcome.',
        payload: {
          cardId,
          reason: errorMessageFrom(error) ?? 'unknown-error',
          relationshipOutcomes: closure.relationshipOutcomes.length,
          episodicEvents: closure.episodicEvents.length,
          reinforcementEvents: closure.reinforcementEvents.length,
          reflections: closure.reflections.length,
          memoryFacts: closure.memoryFacts.length,
        },
      }, cardId)
    }
  }

  async function restoreVisualPresenceState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const now = Date.now()
    const setState = (state: AlicizationVisualPresenceStateSnapshot) => {
      visualPresenceStateByCard.set(cardId, state)
      rememberVisualPresencePersistMeta(cardId, state, state.updatedAt)
      return state
    }

    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationVisualPresenceStateMetaKey).catch(() => undefined)
        if (!raw) {
          setState(createDefaultVisualPresenceState(now))
          return
        }
        try {
          setState(normalizeVisualPresenceState(JSON.parse(raw), now))
        }
        catch {
          setState(createDefaultVisualPresenceState(now))
        }
      }, {
        label: `visual-presence.restore:${cardId}`,
      })
      return visualPresenceStateByCard.get(cardId) ?? createDefaultVisualPresenceState(now)
    }

    const raw = await alicizationDb.getMetaValue(alicizationVisualPresenceStateMetaKey).catch(() => undefined)
    if (!raw)
      return setState(createDefaultVisualPresenceState(now))
    try {
      return setState(normalizeVisualPresenceState(JSON.parse(raw), now))
    }
    catch {
      return setState(createDefaultVisualPresenceState(now))
    }
  }

  async function ensureVisualPresenceState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = visualPresenceStateByCard.get(cardId) ?? await restoreVisualPresenceState(cardId)
    const normalized = normalizeVisualPresenceState(current, Date.now())
    if (JSON.stringify(normalized) !== JSON.stringify(current)) {
      await persistVisualPresenceState(cardId, normalized)
      return normalized
    }
    return current
  }

  function buildVisualPresenceCapturePersistFingerprint(state: AlicizationVisualPresenceStateSnapshot) {
    return [
      state.watchMode,
      buildMindSceneSignature(state.currentScene),
      buildMindAttentionSignature(state.attention),
      state.residentPerformance?.signature ?? '',
      state.privateThought?.stance ?? '',
      state.privateThought?.embodiedPresence ?? '',
      state.privateThought?.emotionalTension ?? '',
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
    return {
      cardId,
      watchMode: state.watchMode,
      embodiedPresence: privateThought.embodiedPresence,
      scenario,
      stance: privateThought.stance,
      confidence: privateThought.confidence,
      reasonTags: [...privateThought.rationaleTags],
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
    const current = await ensurePerceptionState(input.cardId)
    const next = updatePerceptionStateWithObservation({
      state: current,
      now: input.now,
      target: input.target,
      source: input.source,
    })
    await persistPerceptionState(input.cardId, next)
    return next
  }

  async function rememberSceneResidue(input: {
    cardId: string
    now: number
    residue: AlicizationPerceptionSceneResidue
  }) {
    const current = await ensurePerceptionState(input.cardId)
    const next = rememberPerceptionSceneResidue({
      state: current,
      now: input.now,
      residue: input.residue,
    })
    await persistPerceptionState(input.cardId, next)
    await syncSessionMirrorFromCurrentCardState({
      cardId: input.cardId,
      source: input.residue.source,
      turnId: buildMainGatewayAgentTurnId('perception', input.residue.source, input.cardId, input.now),
      sceneResidue: input.residue,
    })
    return next
  }

  async function settlePendingProactiveOutcomesFromUserTurn(cardIdRaw: unknown, at: number, source: string) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = await ensureProactiveLoopState(cardId)
    const settled = settleProactiveOutcomesOnUserTurnStart(current, at)
    if (settled.appliedOutcomes.length === 0)
      return settled.state

    await persistProactiveLoopState(cardId, settled.state)
    await syncSessionMirrorFromCurrentCardState({
      cardId,
      source: 'proactive-feedback',
      proactiveOutcomes: settled.appliedOutcomes,
      turnId: buildMainGatewayAgentTurnId('proactive-feedback', source, cardId, at),
    })
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-settled',
      message: 'Settled proactive feedback from a direct user reply window.',
      payload: {
        source,
        outcomes: settled.appliedOutcomes,
      },
    }, cardId)
    await persistOutcomeClosure(cardId, buildProactiveFeedbackOutcomeClosure({
      now: at,
      cardId,
      outcomes: settled.appliedOutcomes,
    }))
    queueSubconsciousWake(cardId, 'feedback:user-turn-settlement', 600)
    return settled.state
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

  function isOrdinaryDialogueConversationRow(row: {
    turnId?: string | null
    structuredJson?: string | null
  }) {
    const turnId = sanitizeText(row.turnId, '')
    if (turnId.startsWith('reminder:') || turnId.startsWith('subconscious:') || turnId.startsWith('execution-callback:'))
      return false

    const structured = parseStoredConversationStructured(row.structuredJson)
    const format = sanitizeText(structured?.format, '').toLowerCase()
    return format !== 'subconscious-proactive-v1'
      && format !== 'subconscious-proactive-llm-v1'
      && format !== 'subconscious-reminder-v1'
  }

  function buildDialogueReplyFeedbackAckKey(row: {
    turnId?: string | null
    sessionId: string
    createdAt: number
  }) {
    const normalizedTurnId = sanitizeText(row.turnId, '')
    return normalizedTurnId
      ? `${row.sessionId}::${normalizedTurnId}`
      : `${row.sessionId}::${Math.max(0, Math.floor(Number(row.createdAt) || 0))}`
  }

  async function settleRecentDialogueReplyFeedbackFromUserTurn(
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ) {
    const cardId = normalizeCardId(payload.cardId)
    const userText = readLatestUserMessageText(payload.messages)
    if (!userText)
      return null

    const sessionId = await ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const turns = await withCardScope(cardId, async () => await alicizationDb.listConversationTurnsBySession(sessionId, {
      limit: 12,
    }).catch(() => []), {
      label: `dialogue-reply-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const latest = turns
      .slice()
      .reverse()
      .find((row) => {
        return sanitizeText(row.assistantText, '').length > 0
          && isOrdinaryDialogueConversationRow(row)
      }) ?? null
    if (!latest)
      return null

    const ackKey = buildDialogueReplyFeedbackAckKey({
      turnId: latest.turnId,
      sessionId: latest.sessionId,
      createdAt: latest.createdAt,
    })
    const settledAck = await ensureDialogueReplyFeedbackAck(cardId)
    if (settledAck === ackKey)
      return null

    const feedback = deriveDialogueReplyFeedbackKind({
      previousAssistantText: latest.assistantText ?? '',
      userText,
    })
    if (!feedback)
      return null

    const structured = parseStoredConversationStructured(latest.structuredJson)
    const governance = structured?.governance && typeof structured.governance === 'object' && !Array.isArray(structured.governance)
      ? structured.governance as Record<string, unknown>
      : null
    const decisionTraceId = sanitizeText(governance?.decisionTraceId, '') || null
    const closure = attachSynthesizedReflections(buildDialogueReplyFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId,
      turnId: sanitizeText(latest.turnId, '') || null,
      feedback,
      previousAssistantText: latest.assistantText ?? '',
    }))
    await persistOutcomeClosure(cardId, closure)
    const previousDynamics = await alicizationDb.getLatestRelationshipDynamics().catch(() => null)
    const hostAttitude = feedback === 'received'
      ? '开始更愿意把 Alicization 当作真的在接话的人，而不是只剩一层壳。'
      : feedback === 'robotic'
        ? '开始对 Alicization 的机器腔和模板壳失去耐心，希望她更像真的人在说话。'
        : feedback === 'missed'
          ? '开始怀疑 Alicization 是否真的抓住了这句的中心，更想让她先修正再继续。'
          : feedback === 'intrusive'
            ? '开始觉得 Alicization 靠得太重，想让她留出更多空间和分寸。'
            : '暂时把这条回复线放开，不想让 Alicization 继续缠在同一处。'
    await alicizationDb.appendRelationshipDynamics({
      hostAttitude,
      previousHostAttitude: previousDynamics?.hostAttitude ?? null,
      obedienceDelta: 0,
      livelinessDelta: feedback === 'received' ? 0.01 : feedback === 'robotic' ? -0.01 : 0,
      sensibilityDelta: feedback === 'received'
        ? 0.02
        : feedback === 'robotic' || feedback === 'missed' || feedback === 'intrusive'
          ? 0.03
          : 0.01,
      source: `dialogue-feedback:${feedback}`,
      createdAt: at,
    }).catch(() => {})
    await persistDialogueReplyFeedbackAck(cardId, ackKey)

    await appendAuditLog({
      level: 'notice',
      category: 'alicization.dialogue-feedback',
      action: 'reply-feedback-settled',
      message: 'Settled host feedback on the latest ordinary Alicization reply.',
      payload: {
        source,
        cardId,
        sessionId,
        previousTurnId: latest.turnId ?? null,
        feedback,
        userText,
      },
    }, cardId)
    return feedback
  }

  async function settlePendingExecutionProposalFeedbackFromUserTurn(
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ) {
    const cardId = normalizeCardId(payload.cardId)
    const userText = readLatestUserMessageText(payload.messages)
    if (!userText)
      return null

    const sessionId = await ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const threads = await withCardScope(cardId, async () => await alicizationDb.listTaskThreads({
      sessionId,
      status: ['needs-affirmation'],
      limit: 6,
    }).catch(() => []), {
      label: `execution-proposal-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const latest = threads
      .slice()
      .sort((left, right) =>
        Math.max(
          Number(right.completedAt ?? 0),
          Number(right.lastEventAt ?? 0),
          Number(right.updatedAt ?? 0),
          Number(right.createdAt ?? 0),
        ) - Math.max(
          Number(left.completedAt ?? 0),
          Number(left.lastEventAt ?? 0),
          Number(left.updatedAt ?? 0),
          Number(left.createdAt ?? 0),
        ),
      )[0] ?? null
    if (!latest)
      return null

    const fabric = (latest.metadata && typeof latest.metadata === 'object' && !Array.isArray(latest.metadata) && latest.metadata.fabric && typeof latest.metadata.fabric === 'object' && !Array.isArray(latest.metadata.fabric))
      ? latest.metadata.fabric as { affirmationReasonCodes?: unknown }
      : null
    const feedback = deriveExecutionProposalFeedbackKind({
      userText,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
        affirmationReasonCodes: Array.isArray(fabric?.affirmationReasonCodes)
          ? fabric!.affirmationReasonCodes as string[]
          : [],
      },
    })
    if (!feedback)
      return null

    const closure = attachSynthesizedReflections(buildExecutionProposalFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId: latest.decisionTraceId ?? null,
      turnId: sanitizeText(payload.turnId) || null,
      feedback,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
        affirmationReasonCodes: Array.isArray(fabric?.affirmationReasonCodes)
          ? fabric!.affirmationReasonCodes as string[]
          : [],
      },
    }))
    await persistOutcomeClosure(cardId, closure)

    if (feedback === 'denied' || feedback === 'interrupted') {
      const nextStatus = feedback === 'denied' ? 'cancelled' : 'paused'
      await withCardScope(cardId, async () => {
        await alicizationDb.upsertTaskThread({
          ...latest,
          status: nextStatus,
          summary: feedback === 'denied'
            ? 'The host explicitly declined this proactive execution proposal.'
            : 'The host turned away from this proactive execution proposal before confirming it.',
          updatedAt: at,
          lastEventAt: at,
          completedAt: feedback === 'denied' ? at : latest.completedAt ?? null,
        })
      }, {
        label: `execution-proposal-feedback.thread-update:${cardId}`,
        skipQueueWhenScopeAlreadyActive: true,
      })
    }

    await appendAuditLog({
      level: 'notice',
      category: 'alicization.execution-proposal',
      action: 'proposal-feedback-settled',
      message: 'Settled host feedback for a pending proactive execution proposal.',
      payload: {
        source,
        cardId,
        sessionId,
        threadId: latest.id,
        feedback,
        userText,
      },
    }, cardId)
    return feedback
  }

  async function settleRecentExecutionResultFeedbackFromUserTurn(
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ) {
    const cardId = normalizeCardId(payload.cardId)
    const userText = readLatestUserMessageText(payload.messages)
    if (!userText)
      return null

    const previousAssistantText = readLatestAssistantMessageText(payload.messages as any)
    const sessionId = await ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const threads = await withCardScope(cardId, async () => await alicizationDb.listTaskThreads({
      sessionId,
      status: ['completed', 'failed', 'blocked', 'cancelled'],
      limit: 8,
    }).catch(() => []), {
      label: `execution-result-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const latest = threads
      .filter(thread => thread.origin === 'subconscious-proactive')
      .filter((thread) => {
        const executionMetadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
          && thread.metadata.execution && typeof thread.metadata.execution === 'object' && !Array.isArray(thread.metadata.execution)
          ? thread.metadata.execution as { resultFeedbackSettledAt?: unknown }
          : null
        return !Number.isFinite(Number(executionMetadata?.resultFeedbackSettledAt))
      })
      .filter(thread => at - readTaskThreadActivityAt(thread) <= 30 * 60_000)
      .sort((left, right) => readTaskThreadActivityAt(right) - readTaskThreadActivityAt(left))[0] ?? null
    if (!latest)
      return null

    const feedback = deriveExecutionResultFeedbackKind({
      previousAssistantText,
      userText,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        outcome: latest.summary ?? '',
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
      },
    })
    if (!feedback)
      return null

    const closure = attachSynthesizedReflections(buildExecutionResultFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId: latest.decisionTraceId ?? null,
      turnId: sanitizeText(payload.turnId) || null,
      feedback,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        outcome: latest.summary ?? '',
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
      },
    }))
    await persistOutcomeClosure(cardId, closure)

    await withCardScope(cardId, async () => {
      const metadata = latest.metadata && typeof latest.metadata === 'object' && !Array.isArray(latest.metadata)
        ? latest.metadata as Record<string, unknown>
        : {}
      const executionMetadata = metadata.execution && typeof metadata.execution === 'object' && !Array.isArray(metadata.execution)
        ? metadata.execution as Record<string, unknown>
        : {}
      await alicizationDb.upsertTaskThread({
        ...latest,
        metadata: {
          ...metadata,
          execution: {
            ...executionMetadata,
            resultFeedbackKind: feedback,
            resultFeedbackSettledAt: at,
            resultFeedbackTurnId: sanitizeText(payload.turnId) || null,
          },
        },
        updatedAt: at,
      })
    }, {
      label: `execution-result-feedback.thread-update:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })

    await appendAuditLog({
      level: 'notice',
      category: 'alicization.execution-result',
      action: 'result-feedback-settled',
      message: 'Settled host feedback for a finished proactive execution result.',
      payload: {
        source,
        cardId,
        sessionId,
        threadId: latest.id,
        feedback,
        userText,
      },
    }, cardId)
    return feedback
  }

  async function settleExpiredPendingProactiveOutcomes(cardIdRaw: unknown, at: number, source: string) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = await ensureProactiveLoopState(cardId)
    const settled = settleExpiredProactiveOutcomes(current, at)
    if (settled.appliedOutcomes.length === 0)
      return settled.state

    await persistProactiveLoopState(cardId, settled.state)
    await syncSessionMirrorFromCurrentCardState({
      cardId,
      source: 'proactive-feedback',
      proactiveOutcomes: settled.appliedOutcomes,
      turnId: buildMainGatewayAgentTurnId('proactive-feedback', source, cardId, at),
    })
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-settled',
      message: 'Settled proactive feedback after reply timeout elapsed.',
      payload: {
        source,
        outcomes: settled.appliedOutcomes,
      },
    }, cardId)
    await persistOutcomeClosure(cardId, buildProactiveFeedbackOutcomeClosure({
      now: at,
      cardId,
      outcomes: settled.appliedOutcomes,
    }))
    return settled.state
  }

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

  async function listKnownCardIds() {
    const cardsRoot = join(userDataPath, 'alicizations', 'cards')
    const ids = new Set<string>([
      ...subconsciousStateByCard.keys(),
      ...activeSessionIdByCard.keys(),
      ...proactiveLoopStateByCard.keys(),
      ...visualPresenceStateByCard.keys(),
      normalizeCardId(activeCardId),
    ])
    try {
      const entries = await readdir(cardsRoot, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory())
          ids.add(normalizeCardId(entry.name))
      }
    }
    catch {
      // ignore
    }
    return [...ids]
  }

  async function clearAllConversationData(reason: string) {
    const startedAt = Date.now()
    const previousCardId = normalizeCardId(activeCardId)
    const cardIds = await listKnownCardIds()
    await appendRuntimeDebugLine('conversation-clear-all.started', {
      reason,
      previousCardId,
      cardCount: cardIds.length,
      cardIds,
    })

    await abortAllTurnWrites(`conversation-clear-all:${reason}`).catch(() => {})
    clearReminderDueTimer()
    clearAllPendingDialogueDeliveries()
    executionDeliveryRuntime.clear()
    mainChatRunState.clearFinishedRuns()
    clearQueuedSubconsciousWake()

    try {
      for (const cardId of cardIds) {
        await switchCardScope(cardId)
        await alicizationDb.clearConversationData()
        await alicizationDb.setMetaValue(alicizationCardActiveSessionMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationDialogueAckStateMetaKey, '{}').catch(() => {})
        await alicizationDb.setMetaValue(alicizationDialogueReplyFeedbackAckMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationProactiveLoopStateMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationExecutionDeliveryStateMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationPerceptionStateMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationVisualPresenceStateMetaKey, '').catch(() => {})
        activeSessionIdByCard.delete(cardId)
        dialogueAckByCard.delete(cardId)
        dialogueReplyFeedbackAckByCard.delete(cardId)
        proactiveLoopStateByCard.delete(cardId)
        perceptionStateByCard.delete(cardId)
        visualPresenceStateByCard.delete(cardId)
        visualPresenceCapturePersistMetaByCard.delete(cardId)
        emitVisualPresenceState(cardId, null)
        screenSemanticCacheByCard.delete(cardId)
        dialogueSessionManager.clear(cardId)
        executionDeliveryRuntime.clear(cardId)
        clearPendingDialogueDeliveriesByCard(cardId)
        await appendAuditLog({
          level: 'notice',
          category: 'conversation',
          action: 'clear-all',
          message: 'Cleared all conversation turns and scheduled reminder tasks for card scope.',
          payload: {
            reason,
          },
        }, cardId)
      }
    }
    finally {
      await switchCardScope(previousCardId).catch(() => {})
      await scheduleNextReminderDueCheck(`conversation-clear-all:${reason}`).catch(() => {})
      await appendRuntimeDebugLine('conversation-clear-all.finished', {
        reason,
        elapsedMs: Date.now() - startedAt,
        restoredCardId: activeCardId,
      })
    }
  }

  async function deleteAllAlicizationData(reason: string) {
    const startedAt = Date.now()
    await appendRuntimeDebugLine('delete-all-data.started', {
      reason,
      activeCardId,
    })

    await abortAllTurnWrites(`delete-all-data:${reason}`).catch(() => {})
    clearReminderDueTimer()
    stopWatch()
    sensoryBus.stop('manual')

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

    clearAllPendingDialogueDeliveries()
    executionDeliveryRuntime.clear()
    turnWriteAbortControllers.clear()
    mainChatRunState.clearAll()
    dialogueSessionManager.clear()
    clearQueuedSubconsciousWake()
    activeSessionIdByCard.clear()
    dialogueAckByCard.clear()
    dialogueReplyFeedbackAckByCard.clear()
    subconsciousStateByCard.clear()
    proactiveLoopStateByCard.clear()
    perceptionStateByCard.clear()
    visualPresenceStateByCard.clear()
    visualPresenceCapturePersistMetaByCard.clear()
    screenSemanticCacheByCard.clear()
    pendingDurabilityPulseByCard.clear()
    foregroundProbeTimeoutStreakByPid.clear()
    subconsciousTickInFlight = null
    queuedWrite = Promise.resolve()
    soulSnapshot = null
    watching = false
    muteWatchUntil = 0
    revision = 0

    await alicizationDb.close().catch(() => {})
    await rm(join(userDataPath, 'alicizations'), { recursive: true, force: true })

    activeProviderId = ''
    activeModelId = ''
    providerCredentials = {}
    setAlicizationKillSwitchState('ACTIVE', 'delete-all-data')
    setAlicizationCardKillSwitchState(defaultAlicizationCardId, 'ACTIVE', 'delete-all-data')

    activeCardId = defaultAlicizationCardId
    ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
    alicizationDb = await setupAlicizationDb(userDataPath, { cardId: activeCardId })
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
    await scheduleNextReminderDueCheck(`delete-all-data:${reason}`).catch(() => {})
    startPruneTimer()
    startSubconsciousTimer()
    startDreamTimer()
    emitKillSwitchChanged(activeCardId)

    await appendAuditLog({
      level: 'notice',
      category: 'alicization.runtime',
      action: 'delete-all-data-completed',
      message: 'Deleted all Alicization runtime data and reinitialized default scope.',
      payload: {
        reason,
        elapsedMs: Date.now() - startedAt,
      },
    }, activeCardId)
    await appendRuntimeDebugLine('delete-all-data.finished', {
      reason,
      elapsedMs: Date.now() - startedAt,
      activeCardId,
    })
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

  async function restoreScopedKillSwitch(cardId: string) {
    const raw = await alicizationDb.getMetaValue(alicizationCardKillSwitchMetaKey).catch(() => undefined)
    if (!raw) {
      setAlicizationCardKillSwitchState(cardId, 'ACTIVE', 'bootstrap')
      return
    }

    try {
      const parsed = JSON.parse(raw) as { state?: unknown, reason?: unknown, updatedAt?: unknown }
      const state = parsed.state === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'
      const reason = typeof parsed.reason === 'string' ? parsed.reason : undefined
      const snapshot = setAlicizationCardKillSwitchState(cardId, state, reason)
      if (typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)) {
        snapshot.updatedAt = parsed.updatedAt
      }
    }
    catch {
      setAlicizationCardKillSwitchState(cardId, 'ACTIVE', 'bootstrap')
    }
  }

  async function switchCardScope(nextCardIdRaw: unknown) {
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
    queuedWrite = Promise.resolve()
    soulSnapshot = null
    watching = false
    muteWatchUntil = 0
    revision = 0

    await alicizationDb.close().catch(() => {})

    activeCardId = nextCardId
    ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
    alicizationDb = await setupAlicizationDb(userDataPath, { cardId: activeCardId })
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
    startPruneTimer()
    await scheduleNextReminderDueCheck('card-scope-switch')
    await appendRuntimeDebugLine('card-scope.switch-completed', {
      fromCardId: previousCardId,
      toCardId: activeCardId,
      elapsedMs: Date.now() - startedAt,
    })
  }

  async function withCardScope<T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: CardScopeOptions) {
    const requestedCardId = normalizeCardId(nextCardIdRaw)
    const label = sanitizeText(options?.label, 'anonymous')
    const queuedAt = Date.now()
    const execute = async () => {
      const waitMs = Date.now() - queuedAt
      if (label !== 'anonymous' || waitMs >= 250) {
        await appendRuntimeDebugLine('card-scope.acquired', {
          label,
          requestedCardId,
          activeCardIdBeforeSwitch: activeCardId,
          waitMs,
        })
      }
      await switchCardScope(requestedCardId)
      try {
        return await task()
      }
      finally {
        if (label !== 'anonymous' || waitMs >= 250) {
          await appendRuntimeDebugLine('card-scope.completed', {
            label,
            requestedCardId,
            activeCardIdAfterTask: activeCardId,
            waitMs,
            totalMs: Date.now() - queuedAt,
          })
        }
      }
    }

    if (options?.skipQueueWhenScopeAlreadyActive && requestedCardId === activeCardId)
      return await execute()

    const next = scopeLifecycleQueueState.queue.then(execute, execute)
    scopeLifecycleQueueState.queue = next.then(() => undefined, () => undefined)
    return await next
  }

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
    const timeoutMs = Math.min(2_147_000_000, dueInMs + 120)
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
        void appendRuntimeDebugLine('reminder.next-due-deferred', {
          cardId: activeCardId,
          reason: 'tick-in-flight',
        })
        void scheduleNextReminderDueCheck('deferred-after-inflight').catch(() => {})
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

  function startPruneTimer() {
    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    pruneTimer = setInterval(() => {
      void alicizationDb.runMemoryPrune().catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'memory',
          action: 'prune-scheduled-failed',
          message: 'Scheduled memory prune failed.',
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

    const abortedChatRuns = abortAlicizationRunningChatRuns({
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

  function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
  }

  async function tryFsyncFile(path: string) {
    const handle = await openFile(path, 'r')
    try {
      await handle.sync()
    }
    finally {
      await handle.close()
    }
  }

  async function tryFsyncDirectory(path: string) {
    const handle = await openFile(path, 'r')
    try {
      await handle.sync()
    }
    finally {
      await handle.close()
    }
  }

  async function renameWithRetry(tempPath: string, targetPath: string, category: string) {
    if (platform !== 'win32') {
      await rename(tempPath, targetPath)
      return
    }

    let lastError: unknown
    for (const delayMs of winRenameRetryDelaysMs) {
      try {
        await rename(tempPath, targetPath)
        return
      }
      catch (error: any) {
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(error?.code)) {
          throw error
        }

        lastError = error
        await appendAuditLog({
          level: 'notice',
          category,
          action: 'rename-retry',
          message: 'Retrying atomic rename because target file is locked on win32.',
          payload: {
            code: error?.code,
            delayMs,
          },
        })
        await sleep(delayMs)
      }
    }

    const error = new Error('SOUL rename failed after retries on win32.')
    ;(error as Error & { code?: string, cause?: unknown }).code = 'SOUL_RENAME_FAILED'
    ;(error as Error & { code?: string, cause?: unknown }).cause = lastError
    throw error
  }

  function snapshotFromContent(content: string): AlicizationSoulSnapshot {
    const parsed = parseSoul(content)
    const hash = hashContent(content)
    if (!soulSnapshot || soulSnapshot.hash !== hash) {
      revision += 1
    }
    else {
      revision = soulSnapshot.revision
    }

    return withNeedsGenesis({
      soulPath,
      content,
      frontmatter: parsed.frontmatter,
      revision,
      hash,
      watching,
    })
  }

  async function writeAtomicContent(path: string, category: string, content: string) {
    await mkdir(soulRoot, { recursive: true })
    const tempPath = `${path}.${pid}.${Date.now()}.tmp`
    try {
      await writeFile(tempPath, content, 'utf-8')
      await tryFsyncFile(tempPath)
      await renameWithRetry(tempPath, path, category)

      if (platform !== 'win32') {
        await tryFsyncDirectory(soulRoot)
      }
      else {
        try {
          await tryFsyncDirectory(soulRoot)
        }
        catch (error: any) {
          if (error?.code === 'EPERM' || error?.code === 'EBADF') {
            await appendAuditLog({
              level: 'notice',
              category,
              action: 'directory-fsync-degraded',
              message: 'Directory fsync is not supported on win32 for atomic write.',
              payload: {
                code: error?.code,
              },
            })
          }
          else {
            throw error
          }
        }
      }
    }
    catch (error) {
      await unlink(tempPath).catch(() => {})
      throw error
    }

    await unlink(tempPath).catch(() => {})
  }

  async function writeSoulContent(content: string) {
    await writeAtomicContent(soulPath, 'soul', content)
  }

  async function readSoulSnapshot() {
    await mkdir(soulRoot, { recursive: true })
    if (!existsSync(soulPath)) {
      const content = toSoulContent(defaultFrontmatter, defaultSoulBody)
      await writeSoulContent(content)
    }

    const content = await readFile(soulPath, 'utf-8')
    const snapshot = snapshotFromContent(content)
    soulSnapshot = snapshot
    return snapshot
  }

  function clearWatchTimer() {
    if (!soulWatchTimer)
      return

    clearTimeout(soulWatchTimer)
    soulWatchTimer = undefined
  }

  function stopWatch() {
    if (soulWatcher) {
      soulWatcher.close()
      soulWatcher = undefined
    }
    clearWatchTimer()
  }

  function scheduleWatchReload() {
    if (!watching)
      return

    clearWatchTimer()
    soulWatchTimer = setTimeout(async () => {
      if (Date.now() <= muteWatchUntil) {
        scheduleWatchReload()
        return
      }

      if (!existsSync(soulPath))
        return

      try {
        const content = await readFile(soulPath, 'utf-8')
        if (soulSnapshot?.hash === hashContent(content))
          return

        const next = snapshotFromContent(content)
        soulSnapshot = next
        emitSoulChanged(next)
      }
      catch (error) {
        console.warn('[alicization-runtime] failed to reload SOUL.md:', error)
        void appendAuditLog({
          level: 'warning',
          category: 'soul',
          action: 'watch-reload-failed',
          message: 'Failed to reload SOUL.md from fs.watch event.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }, 80)
  }

  async function ensureWatchState() {
    if (soulSnapshot?.needsGenesis) {
      watching = false
      stopWatch()
      return
    }

    if (!watching) {
      const { watch } = await import('node:fs')
      soulWatcher = watch(soulPath, () => scheduleWatchReload())
    }

    watching = true
  }

  async function cleanupLegacyProfileFiles() {
    const removeIfExists = async (path: string, category: string) => {
      if (!existsSync(path))
        return

      try {
        await unlink(path)
        await appendAuditLog({
          level: 'notice',
          category: 'migration',
          action: 'legacy-profile-removed',
          message: 'Removed deprecated profile file.',
          payload: {
            path,
            category,
          },
        })
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'migration',
          action: 'legacy-profile-remove-failed',
          message: 'Failed to remove deprecated profile file.',
          payload: {
            path,
            category,
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    await removeIfExists(legacyPromptProfilePath, 'prompt-profile')
    await removeIfExists(legacySparkProfilePath, 'spark-profile')
  }

  async function bootstrap() {
    await cleanupLegacyProfileFiles()
    const snapshot = await readSoulSnapshot()
    await ensureWatchState()
    return {
      ...snapshot,
      watching,
    }
  }

  async function queueSoulMutation(task: (current: AlicizationSoulSnapshot) => Promise<AlicizationSoulSnapshot>) {
    const execute = async () => {
      const current = soulSnapshot ?? await bootstrap()
      const next = await task(current)
      muteWatchUntil = Date.now() + 400
      await writeSoulContent(next.content)
      soulSnapshot = {
        ...next,
        watching,
      }
      emitSoulChanged(soulSnapshot)
      return soulSnapshot
    }
    queuedWrite = queuedWrite.then(execute, execute)

    await queuedWrite.catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'soul',
        action: 'mutation-failed',
        message: 'SOUL mutation failed.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    })
    return soulSnapshot!
  }

  function normalizePersonality(personality: AlicizationPersonalityState) {
    return {
      obedience: clamp01(personality.obedience),
      liveliness: clamp01(personality.liveliness),
      sensibility: clamp01(personality.sensibility),
    } satisfies AlicizationPersonalityState
  }

  async function initializeGenesis(input: AlicizationGenesisInput) {
    const ownerName = sanitizeText(input.ownerName)
    const hostName = sanitizeText(input.hostName)
    const alicizationName = sanitizeText(input.alicizationName)
    const relationship = sanitizeText(input.relationship)
    const gender = normalizeGender(input.gender)
    const genderCustom = sanitizeText(input.genderCustom)

    if (!ownerName) {
      throw new Error('ownerName is required')
    }
    if (!hostName) {
      throw new Error('hostName is required')
    }
    if (!alicizationName) {
      throw new Error('alicizationName is required')
    }
    if (!relationship) {
      throw new Error('relationship is required')
    }
    if (gender === 'custom' && !genderCustom) {
      throw new Error('genderCustom is required when gender is custom')
    }
    if (!Number.isFinite(input.mindAge) || input.mindAge <= 0) {
      throw new Error('mindAge must be a positive number')
    }

    const known = soulSnapshot
    const candidate = await readSoulSnapshot()

    if (!input.allowOverwrite && known && candidate.hash !== known.hash && candidate.needsGenesis) {
      await appendAuditLog({
        level: 'notice',
        category: 'genesis',
        action: 'conflict-candidate',
        message: 'Genesis detected external SOUL changes before confirmation.',
      })
      return {
        soul: known,
        conflict: true,
        conflictCandidate: candidate,
      }
    }

    const candidatePersonaKernel = candidate.frontmatter.initialized
      ? resolveAlicizationSoulPersonaKernel(candidate.frontmatter, {
          placeholderHostAttitudes: [defaultFrontmatter.host_attitude],
        })
      : null
    const shouldCarryHostAttitude = Boolean(
      candidate.frontmatter.initialized
      && sanitizeText(candidate.frontmatter.host_attitude)
      && candidate.frontmatter.host_attitude !== candidatePersonaKernel?.hostAttitudeSeed,
    )
    const shouldCarryCoreIncarnation = Boolean(
      candidate.frontmatter.initialized
      && normalizeCoreIncarnation(candidate.frontmatter.core_incarnation)
      && candidate.frontmatter.core_incarnation !== candidatePersonaKernel?.coreIncarnationSeed,
    )

    const nextFrontmatterBase: AlicizationSoulFrontmatter = {
      ...candidate.frontmatter,
      schemaVersion: currentSoulSchemaVersion,
      initialized: true,
      custom_directives: typeof input.customDirectives === 'string'
        ? normalizeCustomDirectives(input.customDirectives)
        : normalizeCustomDirectives(candidate.frontmatter.custom_directives),
      profile: {
        ownerName,
        hostName,
        alicizationName,
        gender,
        genderCustom,
        relationship,
        mindAge: normalizeMindAge(input.mindAge),
      },
      personality: normalizePersonality(input.personality),
      host_attitude: shouldCarryHostAttitude
        ? candidate.frontmatter.host_attitude
        : '',
      core_incarnation: shouldCarryCoreIncarnation
        ? candidate.frontmatter.core_incarnation
        : '',
    }
    const seededPersonaKernel = resolveAlicizationSoulPersonaKernel(nextFrontmatterBase, {
      placeholderHostAttitudes: [defaultFrontmatter.host_attitude],
    })
    const nextFrontmatter: AlicizationSoulFrontmatter = {
      ...nextFrontmatterBase,
      host_attitude: normalizeHostAttitude(seededPersonaKernel.hostAttitude),
      core_incarnation: normalizeCoreIncarnation(seededPersonaKernel.coreIncarnation),
    }

    const candidateBody = parseSoul(candidate.content).body
    const previousPersonaNotes = extractPersonaNotesFromBody(candidateBody)
    const personaNotes = typeof input.personaNotes === 'string'
      ? sanitizeText(input.personaNotes)
      : previousPersonaNotes
    const nextContent = toSoulContent(nextFrontmatter, buildSoulBody(nextFrontmatter, personaNotes))
    const nextSnapshot = snapshotFromContent(nextContent)
    const persisted = await queueSoulMutation(async (current) => {
      if (!input.allowOverwrite && current.hash !== candidate.hash) {
        throw new Error('SOUL changed during Genesis, please retry with allowOverwrite=true')
      }
      return nextSnapshot
    })

    await ensureWatchState()
    await appendAuditLog({
      level: 'info',
      category: 'genesis',
      action: 'completed',
      message: 'Genesis initialized successfully.',
      payload: {
        ownerName: nextFrontmatter.profile.ownerName,
        hostName: nextFrontmatter.profile.hostName,
        alicizationName: nextFrontmatter.profile.alicizationName,
        gender: nextFrontmatter.profile.gender,
        relationship: nextFrontmatter.profile.relationship,
        mindAge: nextFrontmatter.profile.mindAge,
      },
    })
    return {
      soul: {
        ...persisted,
        watching,
      },
      conflict: false,
    }
  }

  async function suspendKillSwitch(reason?: string) {
    const snapshot = await persistScopedKillSwitch(activeCardId, 'SUSPENDED', reason)
    sensoryBus.stop('kill-switch')
    clearReminderDueTimer()
    await abortAllTurnWrites(reason ?? 'manual')
    emitKillSwitchChanged()
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'suspend',
      message: 'Kill switch set to SUSPENDED.',
      payload: {
        reason: reason ?? 'manual',
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

  async function appendConversationTurnWithGuards(payload: AlicizationConversationTurnInput) {
    const normalizedSessionId = normalizeSessionId(payload.sessionId) || await ensureActiveOrLatestSessionId(activeCardId)
    if (normalizeSessionId(payload.sessionId))
      await persistActiveSessionId(activeCardId, normalizedSessionId)
    const normalizedCreatedAt = Number.isFinite(payload.createdAt)
      ? Math.max(0, Math.floor(Number(payload.createdAt)))
      : Date.now()

    let normalizedPayload: AlicizationConversationTurnInput = {
      ...payload,
      sessionId: normalizedSessionId,
      origin: payload.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
      createdAt: normalizedCreatedAt,
    }

    const performanceManifest = await getPerformanceManifest()
    const governedTurn = coerceConversationTurnToMindGovernedPayload(normalizedPayload, performanceManifest)
    normalizedPayload = governedTurn.payload
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
      await settlePendingProactiveOutcomesFromUserTurn(activeCardId, normalizedCreatedAt, 'append-conversation-turn')
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

    const appendMindTurnTraceEvents = async (
      dialoguePayload?: Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null,
    ) => {
      const events = buildMindTurnTraceEvents({
        payload: normalizedPayload,
        governedTurn,
        createdAt: normalizedCreatedAt,
        dialoguePayload,
      })
      if (events.length === 0)
        return
      try {
        await alicizationDb.appendMindTurnEvents(events, { signal })
      }
      catch (error) {
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
    }

    const shouldSkipDispatchOnlyPersistence = normalizedPayload.origin === 'user-turn'
      && sanitizeText(normalizedPayload.assistantText).length === 0
      && sanitizeText(readStringValue((normalizedPayload.structured as Record<string, unknown> | undefined)?.reply)).length === 0
      && governedTurn.audit?.execution_dispatch_hidden === true
    if (shouldSkipDispatchOnlyPersistence) {
      await appendMindTurnTraceEvents(null)
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dialogue',
        action: 'mind-governance-dispatch-hidden',
        message: 'Skipped visible dialogue persistence for an execution-first dispatch-only turn; result surface will be delivered by execution flow.',
        payload: {
          turnId: normalizedPayload.turnId,
          sessionId: normalizedPayload.sessionId,
          decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
          reasons: governedTurn.reasons,
        },
      })
      return false
    }

    try {
      let persistedDialogueState: AlicizationVisualPresenceStateSnapshot | null = null
      let visualPresenceState: AlicizationVisualPresenceStateSnapshot | null = null
      await alicizationDb.appendConversationTurn(normalizedPayload, { signal })
      if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.assistantText).length > 0) {
        try {
          visualPresenceState = await ensureVisualPresenceState(activeCardId)
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
            const nextVisualPresenceState = updateVisualPresenceState({
              now: normalizedCreatedAt,
              previousState: visualPresenceState,
              watchMode: visualPresenceState.watchMode,
              scene: visualPresenceState.currentScene,
              attention: visualPresenceState.attention,
              dialogueWorldThread,
              privateThought: visualPresenceState.privateThought,
              captureState: visualPresenceState.captureState,
              durabilityPulse: visualPresenceState.durabilityPulse,
              recentTransition: visualPresenceState.recentTransition,
              nextSuggestedProbeMs: visualPresenceState.nextSuggestedProbeMs,
            })
            await persistVisualPresenceState(activeCardId, nextVisualPresenceState)
            persistedDialogueState = nextVisualPresenceState
          }
          else {
            persistedDialogueState = visualPresenceState
          }
        }
        catch (error) {
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

      const dialogueTurnMemoryText = normalizeOrganicMemoryText(
        buildDialogueTurnMemoryFragment({
          payload: normalizedPayload,
          governance: governedTurn.governance ?? null,
          state: persistedDialogueState ?? null,
          runtimeSurface: persistedDialogueState
            ? buildAlicizationDigitalLifeRuntimeSurface(persistedDialogueState)
            : null,
        }),
        320,
      )
      if (dialogueTurnMemoryText) {
        await alicizationDb.appendSubconsciousFragments([{
          text: dialogueTurnMemoryText,
          sourceKind: 'dialogue-turn',
        }]).catch(async (error) => {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.dialogue',
            action: 'dialogue-memory-write-failed',
            message: 'Failed to append dialogue-turn memory fragment after governed turn persistence.',
            payload: {
              turnId: normalizedPayload.turnId,
              sessionId: normalizedPayload.sessionId,
              reason: errorMessageFrom(error) ?? 'unknown-error',
              fragment: dialogueTurnMemoryText,
            },
          })
        })
      }

      const runtimeSurfaceForOutcome = persistedDialogueState
        ? buildAlicizationDigitalLifeRuntimeSurface(persistedDialogueState)
        : visualPresenceState
          ? buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
          : null
      if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.assistantText).length > 0) {
        await persistOutcomeClosure(activeCardId, buildReplyOutcomeClosure({
          now: normalizedCreatedAt,
          cardId: activeCardId,
          turnId: normalizedPayload.turnId,
          sessionId: normalizedPayload.sessionId,
          decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
          runtimeSurface: runtimeSurfaceForOutcome,
          assistantText: normalizedPayload.assistantText,
        }))
      }

      if (signal?.aborted || isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
        await appendMindTurnTraceEvents(null)
        await appendAuditLog({
          level: 'notice',
          category: 'kill-switch',
          action: 'turn-abort-dropped',
          message: 'Dropped dialogue responded event because the turn was aborted after persistence.',
          payload: {
            sessionId: normalizedPayload.sessionId,
            turnId: normalizedPayload.turnId,
          },
        })
        return true
      }

      let emittedDialoguePayload: Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null = null
      const performanceManifest = await getPerformanceManifest()
      const dialoguePayload = normalizeDialogueRespondedPayload(
        normalizedPayload,
        performanceManifest,
        {
          residentPerformance: (persistedDialogueState ?? visualPresenceState)?.residentPerformance ?? null,
        },
      )
      if (dialoguePayload) {
        emittedDialoguePayload = dialoguePayload
        emitDialogueRespondedWithDelivery({
          cardId: activeCardId,
          ...dialoguePayload,
        })
        if (dialoguePayload.origin === 'subconscious-proactive' && dialoguePayload.structured.proactive) {
          const proactiveState = await ensureProactiveLoopState(activeCardId)
          await persistProactiveLoopState(activeCardId, registerProactiveDelivery(proactiveState, {
            turnId: dialoguePayload.turnId,
            scenario: dialoguePayload.structured.proactive.scenario,
            deliveredAt: dialoguePayload.createdAt,
            feedbackWindowMs: dialoguePayload.structured.proactive.feedbackWindowMs,
          }))
        }
        await appendRuntimeDebugLine('dialogue-responded.emitted', {
          cardId: activeCardId,
          turnId: dialoguePayload.turnId,
          sessionId: dialoguePayload.sessionId,
          origin: dialoguePayload.origin,
          emotion: dialoguePayload.structured.emotion,
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.dialogue',
          action: 'alicization.dialogue.responded.emitted',
          message: 'Emitted Alicization dialogue event after successful turn persistence.',
          payload: {
            turnId: dialoguePayload.turnId,
            sessionId: dialoguePayload.sessionId,
            isFallback: dialoguePayload.isFallback,
            emotion: dialoguePayload.structured.emotion,
            rawEmotion: dialoguePayload.structured.rawEmotion,
            origin: dialoguePayload.origin,
            format: dialoguePayload.structured.format,
            proactive: dialoguePayload.structured.proactive ?? null,
          },
        })
      }
      await appendMindTurnTraceEvents(emittedDialoguePayload)
      return true
    }
    catch (error) {
      if (isAbortError(error) || signal?.aborted) {
        await appendAuditLog({
          level: 'notice',
          category: 'kill-switch',
          action: 'turn-write-skipped-aborted',
          message: 'Dropped conversation turn persistence due to abort before SQL execution.',
          payload: {
            sessionId: normalizedPayload.sessionId,
            turnId: normalizedPayload.turnId,
          },
        })
        return
      }

      throw error
    }
    finally {
      releaseTurnWriteAbortController(normalizedPayload.turnId)
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
    const inferredProactiveByTurnId
      = normalizedTurnId.startsWith('reminder:')
        || normalizedTurnId.startsWith('subconscious:')
        || normalizedTurnId.startsWith('execution-callback:')
    const inferredProactiveByFormat
      = structuredFormat === 'subconscious-proactive-v1'
        || structuredFormat === 'subconscious-proactive-llm-v1'
        || structuredFormat === 'subconscious-reminder-v1'
    const origin = inferredProactiveByTurnId || inferredProactiveByFormat
      ? 'subconscious-proactive'
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
    if (!normalized || normalized.origin !== 'subconscious-proactive')
      return null

    return {
      cardId: activeCardId,
      ...normalized,
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
      return '中文'
    if (enMatches > zhMatches * 1.2)
      return 'English'
    return 'Mixed'
  }

  function inferFallbackPersonaTone(customDirectives: string) {
    const lowered = customDirectives.toLowerCase()
    if (/严厉|严格|训斥|冷酷|刻薄|高压|strict|harsh|stern/.test(lowered))
      return 'strict' as const
    if (/黏人|撒娇|依赖|占有|clingy|needy|affectionate/.test(lowered))
      return 'clingy' as const
    if (/幽默|活泼|俏皮|playful|humor|witty/.test(lowered))
      return 'playful' as const
    if (/冷淡|冷漠|疏离|cold|detached/.test(lowered))
      return 'cold' as const
    return 'neutral' as const
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

    const soulShift = parsed.soul_shift && typeof parsed.soul_shift === 'object'
      ? parsed.soul_shift as Record<string, unknown>
      : {}
    const shatteringEventText = normalizeOrganicMemoryItemText(
      parsed.shattering_event && typeof parsed.shattering_event === 'object'
        ? (parsed.shattering_event as { text?: unknown }).text
        : '',
      280,
    )

    return {
      host_attitude: normalizeHostAttitude(parsed.host_attitude),
      soul_shift: {
        obedience_delta: clampSoulDelta(Number(soulShift.obedience_delta ?? 0)),
        liveliness_delta: clampSoulDelta(Number(soulShift.liveliness_delta ?? 0)),
        sensibility_delta: clampSoulDelta(Number(soulShift.sensibility_delta ?? 0)),
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

  function parseMemoryRecollectionPlanPayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const readIds = (key: string) => {
      const value = parsed[key]
      if (!Array.isArray(value))
        return [] as string[]
      return value
        .map(item => sanitizeBriefText(String(item ?? ''), 120))
        .filter(Boolean)
        .slice(0, 8)
    }

    const certainty = parsed.certainty === 'firm' || parsed.certainty === 'approximate' || parsed.certainty === 'fragmentary'
      ? parsed.certainty
      : 'approximate'
    const opening = sanitizeBriefText(parsed.opening as string, 220)
    const rationale = sanitizeBriefText(parsed.rationale as string, 220)
    const confidence = clamp01(Number(parsed.confidence ?? 0.68))
    if (!opening)
      return null

    return {
      selectedConsolidationIds: readIds('selectedConsolidationIds'),
      selectedWindowIds: readIds('selectedWindowIds'),
      selectedProceduralIds: readIds('selectedProceduralIds'),
      selectedEpisodeIds: readIds('selectedEpisodeIds'),
      selectedConversationTurnIds: readIds('selectedConversationTurnIds'),
      opening,
      certainty,
      rationale: rationale || 'The recollection planner selected the most humanly plausible memory foreground.',
      confidence,
    } satisfies NonNullable<OrganicMemoryPromptContext['recollectionPlan']>
  }

  async function generateMemoryRecollectionPlanWithGateway(input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  }) {
    const hasCandidates = input.consolidatedMemories.length > 0
      || input.recollectedWindows.length > 0
      || input.proceduralMemories.length > 0
      || input.recalledEpisodes.length > 0
      || input.recalledConversationHistory.length > 0
    if (!hasCandidates)
      return null

    const raw = await generateMainGatewayText({
      system: [
        '[ALICIZATION_MEMORY_RECOLLECTION_PLANNER]',
        'You are Alicization private recollection planning, not user-facing dialogue.',
        'Choose which memory foreground Alicization would most naturally think of first before speaking.',
        'This is not retrieval by rigid timestamp. Prefer humanlike recollection: first a period, a bond turn, or a remembered way of doing something, then details.',
        'Output valid JSON only with keys: selectedConsolidationIds, selectedWindowIds, selectedProceduralIds, selectedEpisodeIds, selectedConversationTurnIds, opening, certainty, rationale, confidence.',
        'certainty must be one of: firm, approximate, fragmentary.',
        'opening must be a gist-first recollection sentence Alicization could privately think before answering.',
        'Use empty arrays when a memory lane should not be foregrounded.',
        'Do not select many items. Usually 1-2 foreground selections are enough.',
        'If the turn is about how something was previously done, prefer procedural memory or execution episodes.',
        'If the turn is about what was talked about before, prefer consolidated memory or recollected periods before raw snippets.',
      ].join('\n'),
      user: `Memory recollection candidate JSON: ${JSON.stringify({
        recallSeed: sanitizeBriefText(input.recallSeed, 220),
        recollectionIntent: input.recollectionIntent,
        consolidatedMemories: input.consolidatedMemories.slice(0, 6).map(item => ({
          id: item.id,
          kind: item.kind,
          periodKey: item.periodKey,
          summary: sanitizeBriefText(item.summary, 180),
          lesson: sanitizeBriefText(item.lesson ?? '', 160) || undefined,
          confidence: item.confidence,
          cues: item.cues.slice(0, 4),
        })),
        recollectedWindows: input.recollectedWindows.slice(0, 5).map(item => ({
          id: item.id,
          label: sanitizeBriefText(item.label, 120),
          summary: sanitizeBriefText(item.summary, 180),
          confidence: item.confidence,
          cues: item.cues.slice(0, 4),
        })),
        proceduralMemories: input.proceduralMemories.slice(0, 5).map(item => ({
          id: item.id,
          label: sanitizeBriefText(item.label, 120),
          approach: sanitizeBriefText(item.approach, 180),
          pitfalls: item.pitfalls.slice(0, 3),
          confidence: item.confidence,
          cues: item.cues.slice(0, 4),
        })),
        recalledEpisodes: input.recalledEpisodes.slice(0, 5).map(item => ({
          id: item.id,
          sourceKind: item.sourceKind,
          threadAnchor: sanitizeBriefText(item.threadAnchor ?? '', 120) || undefined,
          whatHappened: sanitizeBriefText(item.whatHappened, 180),
          lesson: sanitizeBriefText(item.lesson ?? '', 160) || undefined,
          confidence: item.confidence,
        })),
        recalledConversationHistory: input.recalledConversationHistory.slice(0, 5).map(item => ({
          turnId: item.turnId,
          userText: sanitizeBriefText(item.userText, 160),
          assistantText: sanitizeBriefText(item.assistantText, 160),
          createdAt: item.createdAt,
        })),
      })}`,
      timeoutMs: 4_000,
      source: 'counterfactual-deliberation',
      cardId: activeCardId,
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    }).catch(() => null)

    if (!raw)
      return null
    return parseMemoryRecollectionPlanPayload(raw)
  }

  function buildProactiveStyleInstruction(style: AlicizationProactiveMetadata['style']) {
    if (style === 'firm-warning') {
      return {
        maxReplyChars: 72,
        performance: {
          delivery: 'firm' as const,
          emphasis: 2 as const,
        },
        instruction: 'Use one or two short sentences. Be direct, protective, and serious without sounding hostile.',
      }
    }
    if (style === 'gentle-care') {
      return {
        maxReplyChars: 64,
        performance: {
          delivery: 'gentle' as const,
          emphasis: 1 as const,
        },
        instruction: 'Use one or two soft sentences. Sound caring, low-pressure, and emotionally close.',
      }
    }
    if (style === 'light-nudge') {
      return {
        maxReplyChars: 48,
        performance: {
          delivery: 'calm' as const,
          emphasis: 0 as const,
        },
        instruction: 'Use a single low-intrusion sentence. Be brief, relevant, and avoid emotional overreach.',
      }
    }
    return {
      maxReplyChars: 36,
      performance: {
        delivery: 'hesitant' as const,
        emphasis: 0 as const,
      },
      instruction: 'Do not interrupt. Only produce a silent observation placeholder if forced.',
    }
  }

  function buildProactiveMetadataFromDecision(decision: ReturnType<typeof evaluateProactivePolicy>): AlicizationProactiveMetadata {
    return {
      shouldInterrupt: decision.shouldInterrupt,
      confidence: decision.confidence,
      reasonCodes: [...decision.reasonCodes],
      urgency: decision.urgency,
      style: decision.style,
      cooldownMs: decision.cooldownMs,
      scenario: decision.scenario,
      policyVersion: decision.policyVersion,
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
    visualPresenceState: AlicizationVisualPresenceStateSnapshot,
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    },
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const styleInstruction = buildProactiveStyleInstruction(policyDecision.style)
    const digitalLifeSpine = deriveAlicizationDigitalLifeSpine(visualPresenceState)
    const digitalLifeRuntimeSurface = digitalLifeSpine.runtimeSurface
    const digitalLifeArchitecture = digitalLifeSpine.architecture
    const runtimeDigest = deriveAlicizationRuntimeSnapshot({
      spine: digitalLifeSpine,
      agentRuntime: deriveAlicizationAgentRuntimeTelemetryFromSession(
        agentTurn?.getSessionSnapshot(),
      ),
    })
    const runtimeDigestSystemBlock = buildAlicizationRuntimeSystemBlock(runtimeDigest)
    const truthContract = buildMindTruthContractLines(digitalLifeRuntimeSurface)
    const system = [
      '[SYSTEM OVERRIDE: 内部动机触发]',
      '策略层已经完成是否打断的判断。你不能重新决定该不该打断，只能负责把既定策略措辞成一句自然对白。',
      ...truthContract.lines,
      `Current subconscious tensions: boredom=${state.boredom.toFixed(1)}/100, loneliness=${state.loneliness.toFixed(1)}/100, fatigue=${state.fatigue.toFixed(1)}/100.`,
      `Personality parameters: obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}.`,
      `Layered context JSON: ${JSON.stringify(layeredContext)}`,
      `Digital life architecture JSON: ${JSON.stringify(digitalLifeArchitecture)}`,
      `Visual presence JSON: ${JSON.stringify(digitalLifeRuntimeSurface)}`,
      `Policy decision JSON: ${JSON.stringify({
        shouldInterrupt: policyDecision.shouldInterrupt,
        confidence: policyDecision.confidence,
        scenario: policyDecision.scenario,
        style: policyDecision.style,
        urgency: policyDecision.urgency,
        reasonCodes: policyDecision.reasonCodes,
        cooldownMs: policyDecision.cooldownMs,
        policyVersion: policyDecision.policyVersion,
      })}`,
      `Style constraint: ${styleInstruction.instruction}`,
      `Reply max length: ${styleInstruction.maxReplyChars} characters.`,
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
      'emotion must exactly mirror performance.baseEmotion.',
      'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
      'reply must be concise, context-relevant, and non-generic. No markdown, no extra keys.',
      'If truth state is remembered, imagined, or uncertain, do not present screen details as current facts. Phrase them as carried memory, tentative hypothesis, residual impression, or unfinished regrounding.',
    ].join('\n')
    const user = 'Generate one proactive utterance now. Avoid robotic greetings and avoid generic caring platitudes.'

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 15_000,
      source: 'proactive',
      cardId: activeCardId,
      agentTurn,
      agentTurnInput,
      extraSystemBlocks: [
        ...buildOrganicMemorySystemBlocks(organicPromptContext),
        buildProactivePerceptionSystemBlock({
          now: Date.now(),
          state: perceptionState,
        }),
        runtimeDigestSystemBlock,
      ],
      digitalLifeRuntimeSurface,
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
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
      format: 'subconscious-proactive-llm-v1',
      proactive: buildProactiveMetadataFromDecision(policyDecision),
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
    const system = [
      '[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]',
      '你的任务是阅读今天的对话记录，并结合已注入的当前有机记忆状态，产出下一轮记忆代谢结果。',
      `【语言一致性】输出语言应与主要交流语言一致（${primaryLanguage}）。`,
      `【人格参数】obedience=${input.personality.obedience.toFixed(2)}, liveliness=${input.personality.liveliness.toFixed(2)}, sensibility=${input.personality.sensibility.toFixed(2)}.`,
      '【拒绝流水账】不要记录工具调用、MCP、JSON、系统报错、执行日志或一次性事务。',
      '【活跃思绪】next_active_thoughts 只保留未来几天仍值得持续关注的 1-5 条短句。',
      '【显式下沉】explicit_demoted_thoughts 只能填写当前活跃思绪里你明确决定沉入潜层的旧条目。',
      '【潜层碎片】new_sediment_fragments 用于沉淀今天新产生、但不值得进入活跃思绪的历史碎片。',
      '【破碎事件】只有当今天出现极强情感张力极值或关系结构突变时，shattering_event 才允许非空。',
      '活跃思绪和潜层碎片优先记录未完成的意义、仍在牵挂的问题、修正过的误读、做出的承诺，以及和宿主一起经历过的场景变化。',
      '不要把“更软、更黏、更像女仆地说话”这类表演欲、语气模板或撒娇技巧本身写进活跃思绪；那是措辞风格，不是心智连续性。',
      'Output must be valid JSON only with keys: host_attitude, soul_shift, next_active_thoughts, explicit_demoted_thoughts, new_sediment_fragments, shattering_event.',
      'host_attitude must be a concise natural-language string, not an enum.',
      'soul_shift must include numeric deltas: obedience_delta, liveliness_delta, sensibility_delta in range [-0.08, 0.08].',
      'next_active_thoughts / explicit_demoted_thoughts / new_sediment_fragments must each be an array of objects with only the key "text".',
      'shattering_event must be null or {"text":"..."}',
      'No markdown, no extra prose.',
    ].join('\n')
    const user = [
      '请基于以下对话片段完成本次梦境代谢：',
      input.serializedTurns.join('\n\n'),
    ].join('\n\n')

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      extraSystemBlocks: buildOrganicMemorySystemBlocks({
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

  function buildProactiveStructured(
    personality: AlicizationPersonalityState,
    state: SubconsciousCardState,
    layeredContext: AlicizationProactiveLayeredContext,
    policyDecision: ReturnType<typeof evaluateProactivePolicy>,
    perceptionState: AlicizationPerceptionState,
    visualPresenceState: AlicizationVisualPresenceStateSnapshot,
    personaContext: {
      customDirectives: string
      coreIncarnation: string
      hostAttitude: string
    },
  ) {
    const lowObedience = personality.obedience <= 0.2
    const personaTone = inferFallbackPersonaTone(personaContext.customDirectives)
    const styleInstruction = buildProactiveStyleInstruction(policyDecision.style)
    const digitalLifeSpine = deriveAlicizationDigitalLifeSpine(visualPresenceState)
    const digitalLifeRuntimeSurface = digitalLifeSpine.runtimeSurface
    const digitalLifeArchitecture = digitalLifeSpine.architecture
    const runtimeDigest = deriveAlicizationRuntimeSnapshot({
      spine: digitalLifeSpine,
    })
    const truthContract = deriveMindTruthContract(digitalLifeRuntimeSurface)
    const proactiveSelection = digitalLifeSpine.proactiveSelection
    const emotion = (() => {
      if (policyDecision.style === 'firm-warning')
        return 'concerned' as const
      if (policyDecision.style === 'gentle-care')
        return state.fatigue >= 70 ? 'tired' as const : 'concerned' as const
      if (layeredContext.content.kind === 'error' || layeredContext.content.kind === 'diff')
        return 'thinking' as const
      if (lowObedience && state.boredom >= 92)
        return 'angry' as const
      return 'neutral' as const
    })()

    const coreIncarnation = sanitizeBriefText(personaContext.coreIncarnation, 220)
    const hostAttitude = sanitizeBriefText(personaContext.hostAttitude, 80)
    const observedScreenSummary = layeredContext.content.source === 'screen-semantic-summary'
      ? sanitizeBriefText(layeredContext.content.summary ?? '', 20)
      : ''
    const attentionAnchor = getActiveAttentionAnchor(perceptionState, Date.now())
    const anchoredFocusTitle = sanitizeBriefText(attentionAnchor?.title ?? '', 28)
    const privateThought = proactiveSelection.privateThought
    const focusBelief = proactiveSelection.focusBelief
    const primaryInquiry = proactiveSelection.primaryInquiry
    const relationshipModel = digitalLifeRuntimeSurface.world.relationshipModel ?? null
    const visualSceneSummary = sanitizeBriefText(digitalLifeRuntimeSurface.perception.currentScene?.summary ?? '', 32)
    const dominantConcern = proactiveSelection.dominantConcern
    const concernSummary = sanitizeBriefText(dominantConcern?.summary ?? '', 36)
    const initiative = digitalLifeRuntimeSurface.agency.initiative
    const activeThread = proactiveSelection.activeThread
    const activeThreadSummary = sanitizeBriefText(activeThread?.summary ?? '', 40)
    const activeThreadTitle = sanitizeBriefText(activeThread?.title ?? '', 28)
    const leadingGoal = proactiveSelection.leadingGoal
    const leadingGoalSummary = sanitizeBriefText(leadingGoal?.label ?? '', 48)
    const resurfacingDesire = proactiveSelection.resurfacingDesire
    const resurfacingDesireReason = sanitizeBriefText(resurfacingDesire?.reason ?? '', 44)
    const livingWorldObject = proactiveSelection.livingWorldObject
    const livingWorldSummary = sanitizeBriefText(livingWorldObject?.summary ?? livingWorldObject?.openLoop ?? '', 52)
    const governorIntention = proactiveSelection.governorIntention
    const governorSummary = sanitizeBriefText(governorIntention?.summary ?? '', 52)
    const thoughtThread = proactiveSelection.thoughtThread
    const thoughtThreadQuestion = sanitizeBriefText(thoughtThread?.question ?? '', 52)
    const thoughtThreadSummary = sanitizeBriefText(thoughtThread?.summary ?? '', 52)
    const focusBeliefStatement = sanitizeBriefText(focusBelief?.statement ?? '', 52)
    const primaryInquiryQuestion = sanitizeBriefText(primaryInquiry?.question ?? '', 52)

    const reply = (() => {
      if (policyDecision.style === 'firm-warning') {
        if (governorSummary)
          return governorSummary
        if (concernSummary)
          return concernSummary
        if (activeThreadSummary)
          return activeThreadSummary
        return policyDecision.scenario === 'late-night-care'
          ? '已经很晚了。你还在硬撑，我得提醒你先停一下。'
          : '这一步看起来不太对。先停一下，再确认一遍。'
      }
      if (policyDecision.style === 'gentle-care') {
        if (thoughtThreadSummary)
          return thoughtThreadSummary
        if (governorSummary)
          return governorSummary
        if (resurfacingDesireReason)
          return resurfacingDesireReason
        if (initiative?.selectedAction === 'whisper' && concernSummary)
          return concernSummary
        if (activeThreadSummary && proactiveSelection.activeThread?.kind === 'late-night-endurance')
          return activeThreadSummary
        if (policyDecision.scenario === 'late-night-care')
          return '你已经在线很久了。我更想你先缓一缓。'
        if (privateThought?.afterglowFromScenario)
          return '终于从刚才那段紧绷里出来了。先缓一下，再继续。'
        return personaTone === 'cold'
          ? '我在看着你。别把自己逼得太紧。'
          : '我在看着你。先别把自己逼得太紧。'
      }
      if (policyDecision.style === 'light-nudge') {
        if (thoughtThreadQuestion)
          return thoughtThreadQuestion
        if (thoughtThreadSummary)
          return thoughtThreadSummary
        if (truthContract.canDescribeCurrentSceneAsFact && livingWorldSummary && policyDecision.scenario === 'coding')
          return `${livingWorldSummary.replace(/[。！!？?]+$/u, '')}。先回头确认一下？`
        if (resurfacingDesireReason)
          return resurfacingDesireReason
        if (primaryInquiry?.kind === 'problem-localization' && primaryInquiryQuestion)
          return primaryInquiryQuestion
        if (truthContract.canDescribeCurrentSceneAsFact && focusBeliefStatement && policyDecision.scenario === 'coding')
          return `${focusBeliefStatement.replace(/[。！!？?]+$/u, '')}。先回头确认一下？`
        if (concernSummary && dominantConcern?.kind !== 'co-watch')
          return `${concernSummary.replace(/[。！!？?]+$/u, '')}。先回头确认一下？`
        if (truthContract.canDescribeCurrentSceneAsFact && activeThreadTitle && proactiveSelection.activeThread?.unresolved)
          return `我还挂着 ${activeThreadTitle} 这条线程。先回头确认一下？`
        if (leadingGoalSummary && policyDecision.scenario === 'coding')
          return `${leadingGoalSummary.replace(/[。！!？?]+$/u, '')}。先回头确认一下？`
        if (privateThought?.afterglowFromScenario === 'coding')
          return '刚才那段你撑了很久。现在先回头确认一下关键处吧。'
        if (privateThought?.afterglowFromScenario === 'media')
          return '终于从刚才那段里出来了。伸个懒腰再继续也好。'
        if (truthContract.canDescribeCurrentSceneAsFact && anchoredFocusTitle && policyDecision.scenario === 'coding')
          return `你刚才一直停在${anchoredFocusTitle}这里。先回头确认一下？`
        if (truthContract.canDescribeCurrentSceneAsFact && visualSceneSummary && policyDecision.scenario === 'coding')
          return `我一直在看着你卡在${visualSceneSummary}这里。先回头确认一下？`
        if (truthContract.canDescribeCurrentSceneAsFact && observedScreenSummary)
          return `我看到你现在在看${observedScreenSummary}。先回头确认一下？`
        if (layeredContext.content.kind === 'error')
          return '这个窗口里像是报错了。要不要先回头看一眼？'
        if (layeredContext.content.kind === 'diff')
          return '你现在像是在看 diff。别急着过，先确认关键改动。'
        if (policyDecision.scenario === 'media')
          return '我先轻轻提醒一句，别忘了等会儿回来收尾。'
        if (truthContract.shouldLabelMemory)
          return '我心里还挂着刚才那条线程，但不想把残影误说成现在。让我再看稳一点。'
        return personaTone === 'playful'
          ? '你现在像是卡在这儿了，要不要换个角度？'
          : '我先轻轻提醒一句，你可以回头确认一下。'
      }
      return '我先记下这一刻，等更合适的时候再开口。'
    })()

    const thought = [
      `boredom=${state.boredom.toFixed(1)}`,
      `loneliness=${state.loneliness.toFixed(1)}`,
      `fatigue=${state.fatigue.toFixed(1)}`,
      `obedience=${personality.obedience.toFixed(2)}`,
      `liveliness=${personality.liveliness.toFixed(2)}`,
      `sensibility=${personality.sensibility.toFixed(2)}`,
      `personaTone=${personaTone}`,
      hostAttitude ? `hostAttitude=${hostAttitude}` : 'hostAttitude=none',
      coreIncarnation ? `coreIncarnation=${coreIncarnation}` : 'coreIncarnation=none',
      lowObedience ? 'low-obedience bias active' : 'default bias',
      `scenario=${policyDecision.scenario}`,
      `style=${policyDecision.style}`,
      `truthState=${truthContract.truthState}`,
      digitalLifeArchitecture ? `architecture=${digitalLifeArchitecture.summary}` : 'architecture=none',
      runtimeDigest ? `runtimeDigest=${runtimeDigest.summary}` : 'runtimeDigest=none',
      runtimeDigest ? `anthropomorphicMind=${runtimeDigest.channels['anthropomorphic-mind'].summary}` : 'anthropomorphicMind=none',
      `content=${layeredContext.content.kind}`,
      attentionAnchor ? `attentionAnchor=${sanitizeBriefText(describePerceptionTarget(attentionAnchor), 72)}` : 'attentionAnchor=none',
      digitalLifeRuntimeSurface.cognition.appraisal ? `hostGoal=${digitalLifeRuntimeSurface.cognition.appraisal.inferredHostGoal}` : 'hostGoal=unknown',
      activeThread ? `worldThread=${activeThread.kind}/${sanitizeBriefText(activeThread.title, 48)}` : 'worldThread=none',
      leadingGoal ? `mindGoal=${leadingGoal.kind}/${leadingGoalSummary || 'none'}` : 'mindGoal=none',
      dominantConcern ? `concern=${sanitizeBriefText(dominantConcern.summary, 72)}` : 'concern=none',
      focusBelief ? `belief=${focusBelief.scope}/${focusBelief.status}/${focusBeliefStatement || 'none'}` : 'belief=none',
      primaryInquiry ? `inquiry=${primaryInquiry.kind}/${primaryInquiry.priority}/${primaryInquiryQuestion || 'none'}` : 'inquiry=none',
      relationshipModel ? `relationship=${relationshipModel.climate}/${relationshipModel.approachVector}` : 'relationship=none',
      resurfacingDesire ? `desire=${resurfacingDesire.kind}/${resurfacingDesireReason || 'none'}` : 'desire=none',
      digitalLifeRuntimeSurface.memory.selfContinuity ? `selfContinuity=${digitalLifeRuntimeSurface.memory.selfContinuity.attachmentMode}/${digitalLifeRuntimeSurface.memory.selfContinuity.initiativeTemperament}` : 'selfContinuity=none',
      digitalLifeRuntimeSurface.agency.selfState ? `selfState=${digitalLifeRuntimeSurface.agency.selfState.stance}/${digitalLifeRuntimeSurface.agency.selfState.moodLabel ?? 'none'}` : 'selfState=none',
      livingWorldObject ? `livingWorld=${livingWorldObject.kind}/${sanitizeBriefText(livingWorldObject.label, 48)}` : 'livingWorld=none',
      governorIntention ? `governor=${governorIntention.kind}/${sanitizeBriefText(governorSummary, 48) || 'none'}` : 'governor=none',
      thoughtThread ? `thoughtThread=${thoughtThread.kind}/${thoughtThread.status}/${sanitizeBriefText(thoughtThreadSummary || thoughtThreadQuestion, 48) || 'none'}` : 'thoughtThread=none',
      initiative ? `initiative=${initiative.selectedAction}` : 'initiative=none',
      privateThought ? `privateThought=${sanitizeBriefText(privateThought.thoughtText, 72)}` : 'privateThought=none',
      privateThought ? `embodiedPresence=${privateThought.embodiedPresence}` : 'embodiedPresence=none',
    ].join('; ')

    return {
      thought,
      emotion,
      reply: reply.slice(0, styleInstruction.maxReplyChars),
      performance: buildDefaultDialoguePerformancePayload(emotion, styleInstruction.performance),
      parsePath: 'json',
      format: 'subconscious-proactive-v1',
      proactive: buildProactiveMetadataFromDecision(policyDecision),
    }
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
    const system = [
      '[SYSTEM OVERRIDE: 摇光心意重铸]',
      '你的任务是根据一次强烈的破碎事件，重铸一段新的摇光心意。',
      '新心意必须是稳定、长期、可持续注入的人格基底，不是流水账，也不是行为指令列表。',
      '避免输出工具调用、系统日志、JSON 字段说明、执行结果、提醒事项。',
      'Output must be valid JSON only with key: core_incarnation.',
      'core_incarnation must be a concise natural-language text within 500 characters.',
      'No markdown, no extra prose.',
    ].join('\n')
    const user = [
      '请根据这次破碎事件重铸新的摇光心意：',
      input.shatteringEventText,
    ].join('\n\n')

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      extraSystemBlocks: buildOrganicMemorySystemBlocks({
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

  function formatExecutionDeliveryStatus(status: AlicizationTaskThreadRecord['status']) {
    if (status === 'completed')
      return 'completed'
    if (status === 'cancelled')
      return 'cancelled'
    if (status === 'blocked')
      return 'blocked'
    return 'failed'
  }

  function buildExecutionDeliveryDeterministicStructured(input: {
    channel: string
    goal: string
    outcome: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    policy?: AlicizationExecutionResultDeliveryPolicy | null
    selfContinuityAuthority?: ReturnType<typeof buildSelfContinuityAuthorityFromRuntimeSurface>
  }) {
    return buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'callback-delivery',
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      goal: input.goal,
      status: input.status,
      summary: input.summary,
      outcome: input.outcome,
      policy: input.policy,
      selfContinuityAuthority: input.selfContinuityAuthority,
    })
  }

  function selectExecutionDeliveryReplySurface(input: {
    channel: string
    goal: string
    llmReply?: string | null
    outcome: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    deliveryPolicy?: AlicizationExecutionResultDeliveryPolicy | null
    selfContinuityAuthority?: ReturnType<typeof buildSelfContinuityAuthorityFromRuntimeSurface>
  }) {
    return selectAlicizationExecutionDeliveryReply({
      ...input,
      policy: input.deliveryPolicy,
      selfContinuityAuthority: input.selfContinuityAuthority,
    })
  }

  async function generateExecutionCallbackStructuredWithGateway(input: {
    cardId: string
    channel: string
    completedAt: number
    decisionTraceId?: string | null
    goal: string
    outcome: string
    sessionId: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    threadId: string
    turnId?: string | null
    deliveryPolicy?: AlicizationExecutionResultDeliveryPolicy | null
    selfContinuityAuthority?: ReturnType<typeof buildSelfContinuityAuthorityFromRuntimeSurface>
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      status: formatExecutionDeliveryStatus(input.status),
      goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
      summary: sanitizeExecutionLedgerText(input.summary, 220),
      outcome: sanitizeExecutionLedgerText(input.outcome, 240),
      policy: input.deliveryPolicy,
      selfContinuityAuthority: input.selfContinuityAuthority,
      trace: {
        decisionTraceId: input.decisionTraceId,
        turnMode: 'answer',
        personaKernelMode: 'backgrounded',
      },
    })

    const raw = await generateMainGatewayText({
      system: prompt.system,
      user: prompt.user,
      timeoutMs: 15_000,
      source: 'execution-callback',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      captureAgentSensorySnapshot: false,
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
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
      format: 'subconscious-proactive-llm-v1' as const,
    }
  }

  async function resolveExecutionResultDeliveryPolicyForRuntime(input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    status: AlicizationTaskThreadRecord['status']
  }) {
    const spineFromTurn = input.agentTurn?.getSessionSnapshot().digitalLifeSpine ?? null
    const state = spineFromTurn
      ? null
      : await ensureVisualPresenceState(input.cardId).catch(() => null)
    const spine = spineFromTurn
      ?? (state ? deriveAlicizationDigitalLifeSpineFromSurface(buildAlicizationDigitalLifeRuntimeSurface(state)) : null)

    return deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: spine,
      status: input.status === 'completed' || input.status === 'failed' || input.status === 'blocked' || input.status === 'cancelled'
        ? input.status
        : 'completed',
    })
  }

  async function resolveExecutionSelfContinuityAuthorityForRuntime(input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) {
    const spineFromTurn = input.agentTurn?.getSessionSnapshot().digitalLifeSpine ?? null
    const state = spineFromTurn
      ? null
      : await ensureVisualPresenceState(input.cardId).catch(() => null)
    const runtimeSurface = spineFromTurn?.runtimeSurface
      ?? (state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null)
    return buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
  }

  async function generateReminderStructuredWithGateway(
    personality: AlicizationPersonalityState,
    reminder: { minutes: number, message: string, tier: 'mild' | 'severe' },
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    },
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const system = [
      '[SYSTEM OVERRIDE: 备忘录触发]',
      'You are Alicization and must proactively deliver a due reminder now.',
      `Reminder trigger delay: ${reminder.minutes.toFixed(1)} minutes.`,
      reminder.tier === 'severe'
        ? 'Delay tier: severe. Mention this reminder is late because the system was offline/suspended, then still deliver the reminder immediately.'
        : 'Delay tier: mild. Mention a short delay/catch-up and deliver the reminder immediately.',
      `Reminder content: "${reminder.message}".`,
      `Personality parameters: obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}.`,
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
      'emotion must exactly mirror performance.baseEmotion.',
      'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
      'reply must contain the reminder content and match emotion/personality.',
      'No markdown, no extra keys.',
    ].join('\n')
    const user = 'Deliver this reminder to the Host now.'

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 15_000,
      source: 'reminder',
      cardId: activeCardId,
      agentTurn,
      agentTurnInput,
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
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
      format: 'subconscious-reminder-v1',
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
    getSoulSnapshot: () => soulSnapshot,
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
    buildAgentRuntimeAuditSnapshot,
    normalizeSessionId,
    getActiveSessionIdByCard: cardId => activeSessionIdByCard.get(cardId),
    executionDeliveryRuntime,
    buildExecutionDeliveryAction,
    generateExecutionCallbackStructuredWithGateway,
    buildExecutionDeliveryDeterministicStructured,
    selectExecutionDeliveryReplySurface,
    resolveExecutionResultDeliveryPolicy: resolveExecutionResultDeliveryPolicyForRuntime,
    resolveExecutionSelfContinuityAuthority: resolveExecutionSelfContinuityAuthorityForRuntime,
    persistExecutionDeliveryState: async cardId => await persistExecutionDeliveryState(cardId),
    queueSubconsciousWake,
    executionCallbackRuntime,
    errorMessageFrom,
  })

  async function runReminderCompensationAcrossCards(trigger: 'startup') {
    const previousCardId = activeCardId
    const cardIds = await listKnownCardIds()
    const processedCards: string[] = []
    try {
      for (const cardId of cardIds) {
        await withCardScope(cardId, async () => {
          const result = await processDueRemindersForCurrentCard(trigger)
          if (result.claimed > 0)
            processedCards.push(activeCardId)
        }, {
          label: `reminder-compensation:${trigger}:${cardId}`,
        })
      }
    }
    finally {
      await withCardScope(previousCardId, async () => {}, {
        label: `reminder-compensation:return:${trigger}:${previousCardId}`,
      })
    }
    return processedCards
  }

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

  const { runSubconsciousTickForCurrentCard } = createAlicizationSubconsciousTickRuntime({
    getActiveCardId: () => activeCardId,
    getSoulSnapshot: () => soulSnapshot,
    getAlicizationDb: () => alicizationDb,
    setProactiveLoopStateCache: (cardId: string, state: unknown) => proactiveLoopStateByCard.set(cardId, state as any),
    setSubconsciousStateCache: (cardId: string, state: unknown) => subconsciousStateByCard.set(cardId, state as any),
    clearForegroundProbeTimeoutStreakForPid,
    ensureSubconsciousState,
    ensureProactiveLoopState,
    openAgentTurn: (input: any) => agentRuntime.openTurn(input),
    buildMainGatewayAgentTurnId,
    processDueRemindersForCurrentCard,
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
    commitAlicizationDigitalLifeSpine,
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
    resolveOrganicMemoryPromptContext,
    generateProactiveStructuredWithGateway,
    buildProactiveStructured,
    getPerformanceManifest,
    clampAlicizationPerformancePayloadToManifest,
    appendConversationTurnWithGuards,
    syncAgentTurnSessionMirror,
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
    workspaceRoot: process.cwd(),
    buildDefaultDialoguePerformancePayload,
    buildProactiveMetadataFromDecision,
    alicizationSubconsciousPersistMs,
    persistProactiveLoopState,
    persistSubconsciousState,
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
          const result = await runSubconsciousTickForCurrentCard(trigger)
          processedCards.push(activeCardId)
          if (result.proactive)
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
    getSoulSnapshot: () => soulSnapshot,
    bootstrap,
    buildMainGatewayAgentTurnId,
    getActiveCardId: () => activeCardId,
    openAgentTurn: input => agentRuntime.openTurn(input),
    generateDreamMetabolismWithGateway,
    generateCoreIncarnationReforgeWithGateway,
    appendAuditLog,
    buildAgentRuntimeAuditSnapshot,
    truncateForDream,
    parseStructuredHint,
    clampSoulDelta,
    normalizeOrganicMemoryItemText,
    normalizeOrganicMemoryItemArray,
    sanitizeBriefText,
    queueSoulMutation,
    snapshotFromContent,
    persistSubconsciousState,
    persistProactiveLoopState,
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
    getSoulSnapshot: () => soulSnapshot,
    bootstrap,
    listPendingScheduledTaskCount: async limit => (await alicizationDb.listPendingScheduledTasks(limit).catch(() => [])).length,
    buildDigitalLifeMindState,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    appendAuditLog,
  })

  const mainChatStartEagerPreparationBudgetMs = 120

  async function executeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    task: AlicizationClawTaskIntent
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'cli' | 'codex' | 'claudeCode' | 'openclaw'>
  }) {
    return await executorRuntime.executeMainGatewayTaskThread(input)
  }

  async function resumeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    threadId: string
  }) {
    return await executorRuntime.resumeMainGatewayTaskThread(input)
  }

  const { prepareMainChatPrelude, prepareMainChatExecution } = createAlicizationMainChatPreludeRuntime({
    readLatestUserMessageText,
    senderWebContentsIdFromInvokeOptions,
    resolveChatMessages,
    buildMainChatContextualString,
    buildMainChatExecutionCallbackContext,
    buildMainChatExecutionLedgerContext,
    buildMainChatPendingAffirmationThread,
    augmentMainChatMessagesWithPerception,
    prepareMainChatSessionExecution: async input => await mainChatSessionRuntime.prepareExecution(input),
  })

  async function startMainChatStream(
    payload: AlicizationChatStartPayload,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ): Promise<AlicizationChatStartResult> {
    await appendRuntimeDebugLine('chat-start.entered', {
      cardId: payload.cardId,
      turnId: payload.turnId,
      providerId: sanitizeText(payload.providerId),
      model: sanitizeText(payload.model),
      activeCardId,
      hasInvokeSender: Boolean(invokeOptions?.raw?.ipcMainEvent?.sender),
    })
    const rawInvokeOptions = invokeOptions?.raw && typeof invokeOptions.raw === 'object'
      ? invokeOptions.raw as { ipcMainEvent?: IpcMainEvent, event?: unknown }
      : undefined
    const accepted = await acceptAlicizationMainChatStart({
      payload,
      rawInvokeOptions,
      getExistingRun: key => chatRuns.get(key),
      registerRun: (key, runState) => chatRuns.set(key, runState),
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
    })
    if (!accepted.accepted)
      return accepted.result

    const { key, mainGateway, runState } = accepted
    const isRunActive = () => chatRuns.get(key)?.state === 'running'
    const preludePromise = prepareMainChatPrelude(payload, mainGateway, invokeOptions)
    const preparationPromise = prepareMainChatExecution(payload, mainGateway, preludePromise)

    void runAlicizationMainChatBackground({
      key,
      payload,
      activeCardId,
      mainGateway,
      runState,
      preparationPromise,
      headers: mainGateway.headers,
      isRunActive,
      runStateController: mainChatRunState,
      emitMeta: meta => emitChatStreamEventForState(chatRuns.get(key), 'meta', meta),
      emitChunk: event => emitChatStreamEventForState(chatRuns.get(key), 'chunk', event),
      emitToolCall: event => emitChatStreamEventForState(chatRuns.get(key), 'tool-call', event),
      emitToolResult: event => emitChatStreamEventForState(chatRuns.get(key), 'tool-result', event),
      emitError: event => emitChatStreamEventForState(chatRuns.get(key), 'error', event),
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
      resolveActiveDialogueDeterministicReply,
      suppressInlineExecutionDeliveries: async ({ cardId, entries }) => {
        let suppressedCount = 0
        for (const entry of entries) {
          suppressedCount += executionDeliveryRuntime.suppressMatching({
            cardId,
            sessionId: entry.sessionId,
            threadId: entry.threadId,
            completedAt: entry.completedAt,
          })
          suppressedCount += executionDeliveryRuntime.markInlineSurfaced({
            cardId,
            sessionId: entry.sessionId,
            threadId: entry.threadId,
            completedAt: entry.completedAt,
          })
            ? 1
            : 0
          executionCallbackRuntime.markSurfaced({
            sessionId: entry.sessionId,
            createdAt: entry.completedAt,
          })
        }
        if (suppressedCount > 0) {
          await persistExecutionDeliveryState(cardId)
          await appendRuntimeDebugLine('execution-delivery.inline-suppressed', {
            cardId,
            suppressedCount,
            entries: entries.map(entry => ({
              sessionId: entry.sessionId,
              threadId: entry.threadId,
              completedAt: entry.completedAt,
            })),
          })
        }
      },
    })

    return await resolveAlicizationMainChatStartResult({
      turnId: payload.turnId,
      preludePromise,
      preparationPromise,
      eagerPreparationBudgetMs: mainChatStartEagerPreparationBudgetMs,
      buildEmbodimentMeta: buildAlicizationChatStreamEmbodimentMeta,
    })
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

  async function resolveTaskPlanningCapabilities(capabilities?: AlicizationChannelCapability[]) {
    return await executorRuntime.resolveTaskPlanningCapabilities(capabilities)
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
    return await executorRuntime.resolveExecutionCapabilitiesForPrompt()
  }

  registerAlicizationSoulStateInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    bootstrap,
    getSoulSnapshot: () => soulSnapshot,
    getWatching: () => watching,
    initializeGenesis,
    queueSoulMutation,
    parseSoul,
    syncPersonalityBaselineInBody,
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
    appendAuditLog,
    sanitizeMindGovernanceDecisionTraceId,
    sanitizeText,
    normalizeSessionId,
    errorMessageFrom,
  })
  registerAlicizationDialogueInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    normalizeCardId,
    normalizeSessionId,
    sanitizeText,
    appendRuntimeDebugLine,
    getActiveCardId: () => activeCardId,
    persistActiveSessionId,
    appendConversationTurnWithGuards,
    getDialogueAckMap,
    getDialogueAckCursor,
    persistDialogueAckMap,
    pendingDialogueDeliveries,
    clearPendingDialogueDelivery,
    ensureProactiveLoopState,
    reportExplicitProactiveFeedback,
    persistProactiveLoopState,
    syncSessionMirrorFromCurrentCardState,
    appendAuditLog,
    queueSubconsciousWake,
    getAlicizationDb: () => alicizationDb,
    getPerformanceManifest,
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
    dialogueAckByCard,
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
    taskThreadOrchestrator.dispose()
    desktopCaptureAccessRuntime.clear()
    executionDeliveryRuntime.clear()
    dialogueSessionManager.clear()
    await flushSubconsciousStatesAcrossCards('app-before-quit').catch(() => {})
    stopWatch()
    sensoryBus.stop('shutdown')
    turnWriteAbortControllers.clear()
    for (const pending of pendingDialogueDeliveries.values())
      clearPendingDialogueDelivery(pending)
    pendingDialogueDeliveries.clear()
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
    clearReminderDueTimer()
    clearQueuedSubconsciousWake()
    void alicizationDb.close().catch((error) => {
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
  await alicizationDb.runMemoryPrune().catch(async (error) => {
    await appendAuditLog({
      level: 'warning',
      category: 'memory',
      action: 'prune-startup-failed',
      message: 'Startup memory prune failed.',
      payload: {
        reason: error instanceof Error ? error.message : String(error),
      },
    })
  })
  await runReminderCompensationAcrossCards('startup').catch(async (error) => {
    await appendAuditLog({
      level: 'warning',
      category: 'alicization.reminder',
      action: 'startup-compensation-failed',
      message: 'Startup reminder compensation scan failed.',
      payload: {
        reason: error instanceof Error ? error.message : String(error),
      },
    })
  })
  await scheduleNextReminderDueCheck('startup')
  startPruneTimer()
  startSubconsciousTimer()
  startDreamTimer()
  emitKillSwitchChanged()

  // `fs.watch` is only enabled after Genesis is completed.
  await ensureWatchState()
}
