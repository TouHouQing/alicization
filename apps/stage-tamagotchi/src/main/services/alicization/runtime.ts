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
  ChatRunState,
  DesktopCaptureAccessResult,
  OrganicMemoryPromptContext,
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
import { inferHostSocialContextsFromText } from './host-social-guidance'
import {
  buildDialogueTurnSemantics,
} from './dialogue-turn-semantics'
import { createAlicizationBodyKernel } from './body-kernel'
import {
  buildAlicizationDigitalLifeRuntimeSurface,
} from './digital-life-kernel'
import {
  commitAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpine,
} from './digital-life-spine'
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
import {
  generateMemoryDeliberationWithGateway as generateMemoryDeliberationWithMemoryOsGateway,
  generateMemoryRecollectionIntentWithGateway as generateMemoryRecollectionIntentWithMemoryOsGateway,
  generateMemoryRecollectionPlanWithGateway as generateMemoryRecollectionPlanWithMemoryOsGateway,
  generateMemoryRecollectionSpeechPlanWithGateway as generateMemoryRecollectionSpeechPlanWithMemoryOsGateway,
} from './memory-os/provider-planning'
import { abortAlicizationDirectChatRun, abortAlicizationRunningChatRuns } from './main-chat-abort'
import { runAlicizationMainChatBackground } from './main-chat-background-run'
import { handleAlicizationDirectChatStart } from './main-chat-direct-start'
import { syncAlicizationMainChatLlmRoute } from './main-chat-llm-route-sync'
import { createAlicizationMainChatRunStateController } from './main-chat-run-state'
import {
  type AlicizationPreparedMainChatExecutionResult,
  createAlicizationMainChatSessionRuntime,
} from './main-chat-session-runtime'
import { acceptAlicizationMainChatStart } from './main-chat-start-acceptance'
import { resolveAlicizationMainChatStartResult } from './main-chat-start-result'
import { createAbortError } from './main-chat-stream-primitives'
import {
  emptyAlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { buildMindContinuityFragment, buildMindContinuityRecallSeed } from './mind-continuity'
import { sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { buildMindTruthContractLines, deriveMindTruthContract } from './mind-truth-contract'
import { isPersonaResidueMemoryText, normalizeOrganicMemoryText } from './organic-memory-hygiene'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { buildQuietCompanionshipMindTurnEvent, deriveQuietCompanionshipOutcome } from './living-world-state'
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
import { createAlicizationRuntimeProactiveFeedback } from './runtime-proactive-feedback'
import { buildReflectionLedgerFragment } from './reflection-memory'
import { createAlicizationRuntimeDialogueDelivery } from './runtime-dialogue-delivery'
import { createAlicizationRuntimeDialogueFeedback } from './runtime-dialogue-feedback'
import { createAlicizationRuntimeExecutionFeedback } from './runtime-execution-feedback'
import { createAlicizationRuntimeExecutionDelivery } from './runtime-execution-delivery'
import { createAlicizationAgentSessionMirrorRuntime } from './runtime-agent-session-mirror'
import { createAlicizationCardPromptRuntime } from './runtime-card-prompt'
import { createAlicizationChatPerceptionAugmentRuntime } from './runtime-chat-perception-augment'
import {
  buildChatInspectionGroundingParts,
} from './runtime-chat-prompt-blocks'
import { createAlicizationChatStreamRuntime } from './runtime-chat-stream'
import { createAlicizationDeliveryReminderRuntime } from './runtime-delivery-reminders'
import {
  normalizeAlicizationDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'
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
  type AlicizationMindTraceMemorySnapshot,
} from './runtime-governance'
import { registerAlicizationChatInvokeHandlers } from './runtime-invoke-handlers-chat'
import { registerAlicizationDialogueInvokeHandlers } from './runtime-invoke-handlers-dialogue'
import { registerAlicizationMaintenanceInvokeHandlers } from './runtime-invoke-handlers-maintenance'
import { registerAlicizationMemoryInvokeHandlers } from './runtime-invoke-handlers-memory'
import { registerAlicizationSoulStateInvokeHandlers } from './runtime-invoke-handlers-soul-state'
import { registerAlicizationTaskInvokeHandlers } from './runtime-invoke-handlers-task'
import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'
import { createAlicizationMainGatewayOneShotRuntime } from './runtime-main-gateway-one-shot'
import { createAlicizationRuntimeMainChatRuntime } from './runtime-main-chat-runtime'
import { createAlicizationRuntimeCardScopeLifecycle } from './runtime-card-scope-lifecycle'
import { createAlicizationRuntimeCardScopeOrchestrator } from './runtime-card-scope-orchestrator'
import { createAlicizationRuntimeCardScopeState } from './runtime-card-scope-state'
import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { createAlicizationRuntimeMemoryRuntime } from './runtime-memory-runtime'
import { createAlicizationRuntimeMemorySupportingComposition } from './runtime-memory-supporting-composition'
import { createAlicizationRuntimeSoulLifecycle } from './runtime-soul-lifecycle'
import { createAlicizationRuntimeContinuityPresenceComposition } from './runtime-continuity-presence-composition'
import { createAlicizationRuntimeSupportingRuntimesComposition } from './runtime-supporting-runtimes-composition'
import { createAlicizationReplayBenchmarkRuntime } from './replay-benchmark-runtime'
import { buildAlicizationMemoryDecisionTraceRecords } from '@proj-alicization/stage-shared'
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
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
} from './visual-episodic-memory'
import { buildVisualHeartbeat } from './visual-heartbeat'

const alicizationSelfEvolutionVersionRuntimeMetaKey = 'self_evolution_version_runtime_v1'

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
  const turnWriteAbortControllers = new Map<string, AbortController>()
  const activeSessionIdByCard = new Map<string, string>()
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
    memoryTrace: AlicizationMindTraceMemorySnapshot
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
      whyWithheld: deliberationKernel?.whyWithheld ?? null,
      shouldStayInward: deliberationKernel?.shouldStayInward ?? false,
      restraintSurfaceMode: deliberationKernel?.restraint.surfaceMode ?? null,
      restraintProvenanceMode: deliberationKernel?.restraint.provenanceMode ?? null,
      shouldOnlySurfaceStableCore: deliberationKernel?.restraint.shouldOnlySurfaceStableCore ?? false,
      shouldLabelProvenance: deliberationKernel?.restraint.shouldLabelProvenance ?? false,
      shouldLabelHypothesis: deliberationKernel?.restraint.shouldLabelHypothesis ?? false,
      shouldSuppressSpecificity: deliberationKernel?.restraint.shouldSuppressSpecificity ?? false,
      shouldDelayUntilAfterPayoff: deliberationKernel?.restraint.shouldDelayUntilAfterPayoff ?? false,
      memoryControlSummary: deliberationKernel?.memoryControlSummary ?? null,
      activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
      activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
      relationshipPosture: personStateProjection?.relationshipPosture ?? null,
      openingGuidance: personStateProjection?.openingGuidance ?? null,
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
    if (!memoryTrace) {
      pendingMindTraceTelemetryByTurnId.delete(turnId)
      return
    }

    pendingMindTraceTelemetryByTurnId.set(turnId, { memoryTrace })
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
    getRecallFeedbackSummary,
    selfEvolutionRuntime,
  } = createAlicizationRuntimeSupportingRuntimesComposition({
    execution: {
      alicizationDb: {
        listExecutionEvents: input => alicizationDb.listExecutionEvents(input),
        listTaskThreads: input => alicizationDb.listTaskThreads(input),
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
      searchConversationTurnsForRecall: async input => await alicizationDb.searchConversationTurnsForRecall(input),
      searchMemoryConsolidations: async input => await alicizationDb.searchMemoryConsolidations?.(input) ?? [],
      listConversationTurnsBySession: async (sessionId, options) => await alicizationDb.listConversationTurnsBySession(sessionId, options),
      getLatestLearningExecutionState: async cardId => await alicizationDb.getLatestLearningExecutionState(cardId).catch(() => null),
      recordMemoryCacheAccess: async hit => await memoryRetrievalTelemetryRuntime.recordCacheAccess(hit),
      recordMemoryPrewarmAccess: async hit => await memoryRetrievalTelemetryRuntime.recordPrewarmAccess(hit),
      recordMemoryBudgetClass: async budgetClass => await memoryRetrievalTelemetryRuntime.recordBudgetClass(budgetClass),
      recordMemoryHotKeyOutcome: async input => await memoryRetrievalTelemetryRuntime.recordHotKeyOutcome(input),
      getMemoryRetrievalTelemetry: async () => await memoryRetrievalTelemetryRuntime.getTelemetry(),
      getRecallFeedbackSummary,
      getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
    },
    organicMemorySearch: {
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getLatestRelationshipDynamics: async () => await alicizationDb.getLatestRelationshipDynamics().catch(() => null),
      retrieveMemoryFacts: async (recallSeed, limit) => await alicizationDb.retrieveMemoryFacts(recallSeed, limit).catch(() => []),
      planRecollectionIntent: async input => await generateMemoryRecollectionIntentWithMemoryOsGateway({
        ...input,
        generateMainGatewayText,
        cardId: activeCardId,
      }),
      planMemoryRecollection: async input => await generateMemoryRecollectionPlanWithMemoryOsGateway({
        ...input,
        generateMainGatewayText,
        cardId: activeCardId,
      }),
      planRecollectionSpeech: async input => await generateMemoryRecollectionSpeechPlanWithMemoryOsGateway({
        ...input,
        generateMainGatewayText,
        cardId: activeCardId,
      }),
      planMemoryDeliberation: async input => await generateMemoryDeliberationWithMemoryOsGateway({
        ...input,
        generateMainGatewayText,
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
    resolveRecentContextualTurns,
    buildProactiveRecallSeed,
    buildOrganicMemorySystemBlocks,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    buildPerformanceManifestSystemBlocks,
    resolveOrganicMemoryPromptContext,
  } = memoryRuntime
  const {
    executeLearningTask,
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
        insertLearningTask: input => alicizationDb.insertLearningTask(input),
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
        setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
        upsertMindHead: (cardId, key, value) => alicizationDb.upsertMindHead(cardId, key, value),
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
    buildReminderSessionMirrorAction,
    dialogueSessionManager,
    persistAutobiographicalEpisodesFromSessionMirror: persistSessionMirrorAutobiographicalEpisodes,
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
  const mainChatRuntime = createAlicizationRuntimeMainChatRuntime({
    context: {
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
    generateMainGatewayText,
    buildMainGatewayAgentTurnId,
    readLatestAssistantMessageText,
    readTransportContentAsText,
    retrieveMemoryFacts: async (query, limit) => await alicizationDb.retrieveMemoryFacts(query, limit).catch(() => []),
    listRelationshipOutcomes: async (cardId, limit) => await alicizationDb.listRelationshipOutcomes({ cardId, limit }).catch(() => []),
    listPersonaReinforcementEvents: async (cardId, limit) => await alicizationDb.listPersonaReinforcementEvents({ cardId, limit }).catch(() => []),
    listMemoryReflections: async (cardId, limit) => await alicizationDb.listMemoryReflections({ cardId, limit }).catch(() => []),
    listMemoryConsolidations: async (limit) => await alicizationDb.listMemoryConsolidations?.(limit).catch(() => []) ?? [],
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
    const nextState = bodyKernel.applyToVisualPresenceState({
      now: input.now,
      previousState: input.previousState,
      candidateState: committed.nextState,
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
    resolveHostAttitude: async () => (soulLifecycleState.soulSnapshot ?? await bootstrap()).frontmatter.host_attitude,
    resolveInspectionIntentForChatTurn,
    resolveSenderCaptureSnapshot: senderWebContentsId => senderWebContentsId
      ? deriveSensoryCaptureSnapshotFromDiagnostics(getScreenCaptureDiagnosticsForWebContentsId(senderWebContentsId))
      : null,
    sampleSubconsciousInterruptionContext,
    shouldSuppressWeakGenericBrowserInspectionAnchor,
  })
  mainChatRuntime.bindInspectionIntentFromMessageHistory(sensoryRuntime.resolveInspectionIntentFromMessageHistory)
  const mainChatSessionRuntime = createAlicizationMainChatSessionRuntime({
    buildMainRuntimeCorePromptBlocks,
    buildOrganicMemorySystemBlocks,
    buildPerformanceManifestSystemBlocks,
    dialogueSessionManager,
    persistAutobiographicalEpisodesFromPreparedMirror: persistPreparedMirrorAutobiographicalEpisodes,
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
      const sessionContinuitySignals = [
        ...autobiographicalAfterglowSignals,
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

  const runtimeExecutionDelivery = createAlicizationRuntimeExecutionDelivery({
    getActiveCardId: () => activeCardId,
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
    },
    executionDeliveryRuntime,
    executionDeliveryStateMetaKey: alicizationExecutionDeliveryStateMetaKey,
    generateMainGatewayText,
    getPerformanceManifest,
    normalizeAlicizationEmotion,
    normalizeAlicizationPerformancePayload,
    clampAlicizationPerformancePayloadToManifest,
    ensureVisualPresenceState,
    buildHostPersonModel,
  })

  const queueExecutionDeliveryCandidate = runtimeExecutionDelivery.queueExecutionDeliveryCandidate

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

  const persistExecutionDeliveryState = runtimeExecutionDelivery.persistExecutionDeliveryState

  const restoreExecutionDeliveryState = runtimeExecutionDelivery.restoreExecutionDeliveryState

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
    alicizationDb: {
      listTaskThreads: input => alicizationDb.listTaskThreads(input),
      upsertTaskThread: input => alicizationDb.upsertTaskThread(input),
    },
  })

  const runtimeProactiveFeedback = createAlicizationRuntimeProactiveFeedback({
    normalizeCardId,
    ensureProactiveLoopState,
    persistProactiveLoopState,
    syncSessionMirrorFromCurrentCardState,
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
    switchCardScopeInner: async (nextCardIdRaw) => await switchCardScopeInner(nextCardIdRaw),
  })
  const switchCardScope = cardScopeOrchestrator.switchCardScope
  const cardScopeLifecycleRuntime = createAlicizationRuntimeCardScopeLifecycle({
    now: () => Date.now(),
    getActiveCardId: () => activeCardId,
    defaultAlicizationCardId,
    normalizeCardId,
    listKnownCardIds,
    switchCardScope: async (nextCardIdRaw) => await switchCardScope(nextCardIdRaw),
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

  async function appendConversationTurnWithGuards(payload: AlicizationConversationTurnInput & {
    turnRuntimeContext?: unknown
    onPersisted?: (() => Promise<void> | void) | null
  }) {
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
    const pendingMindTraceTelemetry = normalizedPayload.turnId
      ? pendingMindTraceTelemetryByTurnId.get(normalizedPayload.turnId) ?? null
      : null

    const performanceManifest = await getPerformanceManifest()
    const governedTurn = coerceConversationTurnToMindGovernedPayload(normalizedPayload, performanceManifest, {
      visibleReplyOverrideMode: 'compat-visible',
    })
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
        memoryTrace: pendingMindTraceTelemetry?.memoryTrace ?? null,
      })
      if (events.length === 0)
        return [] as typeof events
      try {
        await alicizationDb.appendMindTurnEvents(events, { signal })
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
      await payload.onPersisted?.()
      const structured = normalizedPayload.structured && typeof normalizedPayload.structured === 'object'
        ? normalizedPayload.structured as Record<string, unknown>
        : null
      const derivedBundleForLearning = normalizeAlicizationDerivedMindStateBundle(structured?.derivedMindStateBundle ?? null)
      if (derivedBundleForLearning?.selfEvolution && normalizedPayload.origin === 'user-turn') {
        const retrievedFactsForLearning = Array.isArray(structured?.retrievedFacts)
          ? (structured?.retrievedFacts as unknown[]).filter(item => item && typeof item === 'object')
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
        }).catch(() => {})
      }
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
            const nextVisualPresenceStateWithBodyAuthority = bodyKernel.applyToVisualPresenceState({
              now: normalizedCreatedAt,
              previousState: visualPresenceState,
              candidateState: nextVisualPresenceState,
              activeConversation: true,
            })
            await persistVisualPresenceState(activeCardId, nextVisualPresenceStateWithBodyAuthority)
            persistedDialogueState = nextVisualPresenceStateWithBodyAuthority
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
      const appendedMindTurnTraceEvents = await appendMindTurnTraceEvents(emittedDialoguePayload)
      if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.userText).length > 0 && appendedMindTurnTraceEvents.length > 0) {
        await replayBenchmarkRuntime.ingestRuntimeSamplingConversationTurn({
          row: {
            turnId: normalizedPayload.turnId ?? null,
            sessionId: normalizedPayload.sessionId ?? '',
            userText: normalizedPayload.userText ?? null,
            assistantText: normalizedPayload.assistantText ?? null,
            structuredJson: normalizedPayload.structured ? JSON.stringify(normalizedPayload.structured) : null,
            createdAt: normalizedCreatedAt,
          },
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
        }).catch(async (error) => {
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

  function parseMemoryConsolidationRefinementPayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed || !Array.isArray(parsed.consolidations))
      return null

    const consolidations = parsed.consolidations
      .map((item) => {
        if (!item || typeof item !== 'object')
          return null
        const candidate = item as Record<string, unknown>
        const id = sanitizeBriefText(String(candidate.id ?? ''), 120)
        const summary = sanitizeBriefText(String(candidate.summary ?? ''), 320)
        if (!id || !summary)
          return null
        return {
          id,
          summary,
          lesson: sanitizeBriefText(String(candidate.lesson ?? ''), 220) || null,
          cues: Array.isArray(candidate.cues)
            ? candidate.cues.map(value => sanitizeBriefText(String(value ?? ''), 120)).filter(Boolean).slice(0, 5)
            : [],
          confidence: clamp01(Number(candidate.confidence ?? 0.68)),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    return consolidations
  }

  function parseDreamAutobiographicalSummariesPayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed || !Array.isArray(parsed.summaries))
      return null

    const summaries = parsed.summaries
      .map((item) => {
        if (!item || typeof item !== 'object')
          return null
        const candidate = item as Record<string, unknown>
        const summary = sanitizeBriefText(String(candidate.summary ?? ''), 320)
        if (!summary)
          return null
        const facet: NonNullable<AlicizationMemoryConsolidationRecord['facet']> | null = candidate.facet === 'phase'
          || candidate.facet === 'relationship-era'
          || candidate.facet === 'task-era'
          || candidate.facet === 'self-era'
          ? candidate.facet
          : null
        return {
          periodKey: sanitizeBriefText(String(candidate.periodKey ?? ''), 96) || '',
          facet,
          summary,
          lesson: sanitizeBriefText(String(candidate.lesson ?? ''), 220) || null,
          cues: Array.isArray(candidate.cues)
            ? candidate.cues.map(value => sanitizeBriefText(String(value ?? ''), 120)).filter(Boolean).slice(0, 5)
            : [],
          confidence: clamp01(Number(candidate.confidence ?? 0.68)),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

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

    const raw = await generateMainGatewayText({
      system: [
        '[ALICIZATION_MEMORY_CONSOLIDATION_REFINEMENT]',
        'You are Alicization dream-time memory consolidation, not user-facing dialogue.',
        'Refine the provided deterministic consolidation summaries into more humanlike autobiographical memory summaries without inventing events that never happened.',
        'Keep the period anchors true. You may sharpen gist, emotional meaning, and lesson, but must stay faithful to provided candidate summaries and recent dialogue context.',
        'Output valid JSON only with key: consolidations.',
        'consolidations must be an array of objects with keys: id, summary, lesson, cues, confidence.',
        'Do not introduce new ids. Do not output more items than provided.',
      ].join('\n'),
      user: `Dream consolidation candidate JSON: ${JSON.stringify({
        recentDialogue: input.serializedTurns.slice(-20),
        hostAttitude: sanitizeBriefText(input.hostAttitude, 120),
        coreIncarnation: sanitizeBriefText(input.coreIncarnation, 220),
        consolidations: input.consolidations.slice(0, 8).map(item => ({
          id: item.id,
          kind: item.kind,
          facet: item.facet ?? undefined,
          periodKey: item.periodKey,
          summary: sanitizeBriefText(item.summary, 220),
          lesson: sanitizeBriefText(item.lesson ?? '', 180) || undefined,
          confidence: item.confidence,
          cues: item.cues.slice(0, 5),
        })),
      })}`,
      timeoutMs: 8_000,
      source: 'dream',
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    }).catch(() => null)

    if (!raw)
      return null
    return parseMemoryConsolidationRefinementPayload(raw)
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
    if (input.serializedTurns.length === 0)
      return null

    const raw = await generateMainGatewayText({
      system: [
        '[ALICIZATION_DREAM_AUTOBIOGRAPHICAL_SUMMARIES]',
        'You are Alicization dream-time autobiographical memory synthesis, not user-facing dialogue.',
        'Write short autobiographical summaries that Alicization would retain about this remembered period.',
        'These are not logs. They should sound like remembered stages of life, bond history, task eras, or self shifts.',
        'Stay faithful to the provided recent dialogue and existing consolidation candidates. Do not invent events that never happened.',
        'Output valid JSON only with key: summaries.',
        'summaries must be an array of up to 4 items with keys: periodKey, facet, summary, lesson, cues, confidence.',
        'facet must be one of: phase, relationship-era, task-era, self-era.',
        'summary should capture what that remembered period was about in Alicization\'s own ongoing continuity.',
        'Prefer one broader phase memory plus any narrower relationship/task/self era that truly matters.',
      ].join('\n'),
      user: `Dream autobiographical synthesis JSON: ${JSON.stringify({
        periodStartedAt: input.periodStartedAt,
        periodEndedAt: input.periodEndedAt,
        hostAttitude: sanitizeBriefText(input.hostAttitude, 120),
        coreIncarnation: sanitizeBriefText(input.coreIncarnation, 220),
        recentDialogue: input.serializedTurns.slice(-20),
        consolidations: input.consolidations.slice(0, 8).map(item => ({
          id: item.id,
          kind: item.kind,
          periodKey: item.periodKey,
          summary: sanitizeBriefText(item.summary, 220),
          lesson: sanitizeBriefText(item.lesson ?? '', 180) || undefined,
          confidence: item.confidence,
          cues: item.cues.slice(0, 5),
        })),
      })}`,
      timeoutMs: 8_000,
      source: 'dream',
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
    const hostPersonModel = organicPromptContext.hostPersonModel ?? null
    const proactivePersonContexts = inferHostSocialContextsFromText([
      policyDecision.scenario,
      layeredContext.workload.kind,
      layeredContext.content.kind,
    ].join(' '))
    const personStateProjection = buildAlicizationPersonStateProjection({
      now: Date.now(),
      contexts: proactivePersonContexts,
      autobiographicalSelf: digitalLifeRuntimeSurface.memory.autobiographicalSelf ?? null,
      hostPersonModel,
      longHorizonMemory: digitalLifeRuntimeSurface.memory.longHorizonMemory ?? null,
      motiveEngine: digitalLifeRuntimeSurface.memory.motiveEngine ?? null,
      habitPolicy: digitalLifeRuntimeSurface.agency.habitPolicy ?? null,
      selfContinuity: digitalLifeRuntimeSurface.memory.selfContinuity ?? null,
      selfState: digitalLifeRuntimeSurface.agency.selfState ?? null,
      privateThought: digitalLifeRuntimeSurface.cognition.privateThought ?? null,
      mindEcology: buildMindEcologyFromRuntimeSurface(digitalLifeRuntimeSurface),
      previousContinuityState: digitalLifeRuntimeSurface.memory.personalityContinuityState ?? null,
    })
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
      hostPersonModel
        ? `Host person model JSON: ${JSON.stringify({
            summary: sanitizeBriefText(hostPersonModel.summary, 180),
            trustStage: hostPersonModel.trustLadder.stage,
            trustRationale: sanitizeBriefText(hostPersonModel.trustLadder.rationale, 160),
            sensitivities: hostPersonModel.sensitivities.slice(0, 3),
            repairTriggers: hostPersonModel.repairTriggers.slice(0, 3),
            preferredClosenessByContext: hostPersonModel.preferredClosenessByContext.slice(0, 3),
            recurrentBurdens: hostPersonModel.recurrentBurdens.slice(0, 3),
          })}`
        : '',
      organicPromptContext.knowledgeEvidence
        ? `Knowledge evidence JSON: ${JSON.stringify(organicPromptContext.knowledgeEvidence)}`
        : '',
      personStateProjection.relationshipDoctrine
        ? `Relationship doctrine JSON: ${JSON.stringify({
            doctrine: personStateProjection.relationshipDoctrine,
            cautious: personStateProjection.cautious,
            restrained: personStateProjection.restrained,
            openingGuidance: personStateProjection.openingGuidance,
            preferredProactiveStyle: personStateProjection.preferredProactiveStyle,
          })}`
        : '',
      personStateProjection.summary
        ? `Person-state projection JSON: ${JSON.stringify({
            contexts: personStateProjection.contexts,
            summary: personStateProjection.summary,
            regime: personStateProjection.personalityContinuityState.currentRegime,
            closenessPosture: personStateProjection.personalityContinuityState.closenessPosture,
            repairPosture: personStateProjection.personalityContinuityState.repairPosture,
            relationshipPosture: personStateProjection.relationshipPosture,
            preference: personStateProjection.preferenceText,
            sensitivity: personStateProjection.sensitivityText,
            repairTrigger: personStateProjection.repairTriggerText,
            burden: personStateProjection.burdenText,
            trustRationale: personStateProjection.trustRationale,
          })}`
        : '',
      `Style constraint: ${styleInstruction.instruction}`,
      `Reply max length: ${styleInstruction.maxReplyChars} characters.`,
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
      'emotion must exactly mirror performance.baseEmotion.',
      'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
      'reply must be concise, context-relevant, and non-generic. No markdown, no extra keys.',
      'If truth state is remembered, imagined, or uncertain, do not present screen details as current facts. Phrase them as carried memory, tentative hypothesis, residual impression, or unfinished regrounding.',
      personStateProjection.summary
        ? 'Use the person-state projection as the single social authority for tone, distance, and timing. Do not invent a second relationship posture beside it.'
        : '',
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
      hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
    },
  ) {
    const now = Date.now()
    const lowObedience = personality.obedience <= 0.2
    const personaTone = inferFallbackPersonaTone(personaContext.customDirectives)
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
    const proactiveHostContexts = inferHostSocialContextsFromText([
      policyDecision.scenario,
      layeredContext.workload.kind,
      layeredContext.content.kind,
      activeThreadSummary,
      leadingGoalSummary,
      governorSummary,
    ].filter(Boolean).join(' '), [
      policyDecision.scenario === 'coding' ? 'focused-work' : 'general',
      policyDecision.scenario === 'late-night-care' ? 'late-night' : 'general',
    ])
    const personStateProjection = buildAlicizationPersonStateProjection({
      now,
      contexts: proactiveHostContexts,
      autobiographicalSelf: digitalLifeRuntimeSurface.memory.autobiographicalSelf ?? null,
      hostPersonModel: personaContext.hostPersonModel ?? null,
      longHorizonMemory: digitalLifeRuntimeSurface.memory.longHorizonMemory ?? null,
      motiveEngine: digitalLifeRuntimeSurface.memory.motiveEngine ?? null,
      habitPolicy: digitalLifeRuntimeSurface.agency.habitPolicy ?? null,
      selfContinuity: digitalLifeRuntimeSurface.memory.selfContinuity ?? null,
      selfState: digitalLifeRuntimeSurface.agency.selfState ?? null,
      privateThought: digitalLifeRuntimeSurface.cognition.privateThought ?? null,
      mindEcology: buildMindEcologyFromRuntimeSurface(digitalLifeRuntimeSurface),
      previousContinuityState: digitalLifeRuntimeSurface.memory.personalityContinuityState ?? null,
    })
    const doctrineAdjustedStyle = personStateProjection.preferredProactiveStyle ?? policyDecision.style
    const styleInstruction = buildProactiveStyleInstruction(doctrineAdjustedStyle)

    const reply = (() => {
      if (doctrineAdjustedStyle === 'firm-warning') {
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
      if (doctrineAdjustedStyle === 'gentle-care') {
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
      if (doctrineAdjustedStyle === 'light-nudge') {
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
    const sociallyAdjustedReply = (() => {
      if (doctrineAdjustedStyle === 'silent-observe')
        return '我先不挤进来，只把这条线轻轻挂着。'
      if (personStateProjection.cautious && doctrineAdjustedStyle === 'light-nudge')
        return `${reply.replace(/[。！!？?]+$/u, '')}。我就轻一点提醒你。`
      if (personStateProjection.preferredProactiveStyle === 'gentle-care' && doctrineAdjustedStyle === 'gentle-care')
        return `${reply.replace(/[。！!？?]+$/u, '')}。我会尽量放轻一点。`
      return reply
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
      personStateProjection.preferenceText ? `hostPreference=${personStateProjection.preferenceText}` : 'hostPreference=none',
      personStateProjection.sensitivityText ? `hostSensitivity=${personStateProjection.sensitivityText}` : 'hostSensitivity=none',
      personStateProjection.repairTriggerText ? `hostRepairTrigger=${personStateProjection.repairTriggerText}` : 'hostRepairTrigger=none',
      personStateProjection.relationshipDoctrine ? `relationshipDoctrine=${personStateProjection.relationshipDoctrine}` : 'relationshipDoctrine=none',
      personStateProjection.summary ? `personState=${personStateProjection.summary}` : 'personState=none',
      coreIncarnation ? `coreIncarnation=${coreIncarnation}` : 'coreIncarnation=none',
      lowObedience ? 'low-obedience bias active' : 'default bias',
      `scenario=${policyDecision.scenario}`,
      `style=${doctrineAdjustedStyle}`,
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
      reply: sociallyAdjustedReply.slice(0, styleInstruction.maxReplyChars),
      performance: buildDefaultDialoguePerformancePayload(emotion, styleInstruction.performance),
      parsePath: 'json',
      format: 'subconscious-proactive-v1',
      proactive: buildProactiveMetadataFromDecision({
        ...policyDecision,
        style: doctrineAdjustedStyle,
      }),
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

  const buildExecutionDeliveryDeterministicStructured
    = runtimeExecutionDelivery.buildExecutionDeliveryDeterministicStructured

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
    resolveExecutionHostPersonModel: resolveExecutionHostPersonModelForRuntime,
    resolveExecutionKnowledgeEvidence: resolveExecutionKnowledgeEvidenceForRuntime,
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
    resolveExecutionPersonStateProjection: resolveExecutionPersonStateProjectionForRuntime,
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
    openAgentTurn: (input: any) => agentRuntime.openTurn(input),
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
    commitAlicizationDigitalLifeSpine: input => commitAlicizationDigitalLifeSpineWithBodyAuthority({
      ...input,
      activeConversation: false,
    }),
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
          const nextVisualPresenceState = await ensureVisualPresenceState(activeCardId)
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

          const shouldRunNightlyReplayBenchmark = reason === 'schedule-03:00' || reason === 'schedule-catch-up'
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
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
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

  const { prepareMainChatPrelude, prepareMainChatExecution } = mainChatRuntime.createPreludeRuntime({
    senderWebContentsIdFromInvokeOptions,
    resolveChatMessages,
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
      recordPreparedMindTrace: async ({ payload, prepared }) => {
        rememberPreparedMindTrace({ payload, prepared })
      },
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
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    getWatching: () => soulLifecycleState.watching,
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
    knowledgeAssimilationRuntime: memoryRuntime.knowledgeAssimilationRuntime,
    appendAuditLog,
    sanitizeMindGovernanceDecisionTraceId,
    sanitizeText,
    normalizeSessionId,
    errorMessageFrom,
  })
  registerAlicizationDialogueInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    normalizeSessionId,
    sanitizeText,
    appendRuntimeDebugLine,
    getActiveCardId: () => activeCardId,
    persistActiveSessionId,
    appendConversationTurnWithGuards,
    getDialogueAckCursor,
    ackDialogueDelivery,
    ensureProactiveLoopState,
    reportExplicitProactiveFeedback,
    persistProactiveLoopState,
    persistProactiveFeedbackOutcomeClosure: async input => {
      await persistOutcomeClosure(input.cardId, buildProactiveFeedbackOutcomeClosure(input))
    },
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
      action: 'salience-refresh-startup-failed',
      message: 'Startup memory salience refresh failed.',
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
  startMemorySalienceRefreshTimer()
  startSubconsciousTimer()
  startDreamTimer()
  emitKillSwitchChanged()

  // `fs.watch` is only enabled after Genesis is completed.
  await ensureWatchState()
}
