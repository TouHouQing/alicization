import type { CommonContentPart, Message, UserMessage } from '@xsai/shared-chat'
import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'

import type {
  AlicizationActiveThought,
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationChannelCapability,
  AlicizationChatAbortPayload,
  AlicizationChatAbortResult,
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStartResult,
  AlicizationChatStreamChunkEvent,
  AlicizationChatStreamDispatchPayload,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationClawTaskIntent,
  AlicizationConversationTurnInput,
  AlicizationCoreIncarnationReforgePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDispatchTaskThreadPayload,
  AlicizationDreamMetabolismPayload,
  AlicizationDreamRunResult,
  AlicizationDurabilityPulseSnapshot,
  AlicizationGenesisInput,
  AlicizationMindTurnGovernance,
  AlicizationOrganicMemorySnapshot,
  AlicizationPersonalityState,
  AlicizationPresencePulsePayload,
  AlicizationProactiveMetadata,
  AlicizationRecallGovernorSnapshot,
  AlicizationReminderScheduleResult,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousTickResult,
  AlicizationSystemProbeSample,
  AlicizationTaskThreadRecord,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionActionInput,
  AlicizationAgentSessionContinuityInput,
  AlicizationAgentTurnRuntime,
} from './agent-runtime'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDialogueTurnOwnershipHint } from './dialogue-turn-ownership'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationInspectionTurnState } from './inspection-turn-state-machine'
import type { MainGatewayExecutionToolContext } from './main-chat-execution-surface'
import type { AlicizationPreparedMainChatExecutionResult, AlicizationPreparedMainChatPrelude } from './main-chat-session-runtime'
import type {
  AlicizationPendingProactiveOutcome,
  AlicizationProactiveLoopState,
  AlicizationRecentProactiveOutcome,
} from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationProactivePerceptionSignals } from './proactive-policy'
import type { AlicizationScreenSemanticSummary } from './proactive-screen-semantic'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  AlicizationRuntimeSetupOptions,
} from './runtime-governance'
import type {
  CardScopeOptions,
  ChatRunState,
  ContextualConversationTurn,
  DesktopCaptureAccessResult,
  MainGatewayResolvedConfig,
  OrganicMemoryPromptContext,
  PendingDialogueDeliveryState,
  ResolvedCardCustomDirectives,
  ScreenSemanticCacheState,
  StreamDispatchEventType,
  SubconsciousCardState,
} from './runtime-soul'

import { execFile } from 'node:child_process'
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
  alicizationFixedCoreSystemInstruction,
  alicizationFixedHostNameDirectiveTemplate,
  alicizationFixedStructuredContractAnchor,
  buildAlicizationScreenSurfaceCue,
  detectAlicizationExecutionCapabilityInquiry,
  inferAlicizationInspectionIntent,
  isWeakAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceTarget,
  renderAlicizationPromptTemplate,
} from '@proj-alicization/stage-shared'
import { createOpenAI } from '@xsai-ext/providers/create'
import { generateText } from '@xsai/generate-text'
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
import { buildActionEcology } from './action-ecology'
import { createAlicizationAgentRuntime } from './agent-runtime'
import { buildAnswerCompiler, buildAnswerCompilerSystemBlock } from './answer-compiler'
import { buildAlicizationAnswerPlannerSystemBlock, buildAnswerPlanner } from './answer-planner'
import {
  createDefaultPerceptionState,
  detectInvitedInspectionIntent,
  extractInspectionHintTerms,
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isInternalAlicizationRepairPrompt,
  isSelfPerceptionTarget,
  normalizePerceptionState,
  rememberPerceptionSceneResidue,
  updatePerceptionStateWithObservation,
} from './attention-anchor'
import { updateVisualAttentionModel } from './attention-model'
import { buildBeliefLedger } from './belief-ledger'
import { buildBeliefRevision } from './belief-revision'
import { buildAlicizationMindTurnGovernance } from './chat-mind-governance'
import {
  buildClaimEvidenceLedger,
  buildClaimEvidenceLedgerSystemBlock,
} from './claim-evidence-ledger'
import { buildCommitmentLedger } from './commitment-ledger'
import { buildConcernContinuityLedger } from './concern-continuity-ledger'
import { updateConcernGraph } from './concern-graph'
import { buildConversationState, buildConversationStateSystemBlock } from './conversation-state'
import { buildCounterfactualDeliberation } from './counterfactual-deliberator'
import { buildCurrentConsciousFrame, buildCurrentConsciousFrameSystemBlock } from './current-conscious-frame'
import { setupAlicizationDb } from './db'
import { buildDeliberationState } from './deliberation-thread'
import { buildDesireMemory } from './desire-memory'
import { createDesktopCaptureAccessRuntime } from './desktop-capture-runtime'
import { buildDialogueActKernel, buildDialogueActKernelSystemBlock } from './dialogue-act-kernel'
import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { buildDialogueFocusGovernanceSystemBlock } from './dialogue-focus-governor'
import { buildDialogueIngressGovernor } from './dialogue-ingress-governor'
import { buildDialogueTurnMemoryFragment } from './dialogue-memory'
import { buildDialogueMindFrameSystemBlock } from './dialogue-mind-frame'
import { buildAlicizationDialogueObligationSystemBlock } from './dialogue-obligation'
import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import { buildDialogueTurnEncounter, buildDialogueTurnEncounterSystemBlock } from './dialogue-turn-encounter'
import { buildDialogueTurnOwnership } from './dialogue-turn-ownership'
import {
  buildDialogueTurnSemantics,
  mergeDialogueTurnSemantics,
  parseDialogueTurnSemanticsCandidate,
  shouldAttemptDialogueTurnSemanticsRefinement,
} from './dialogue-turn-semantics'
import { buildDialogueWorldThread, buildDialogueWorldThreadSystemBlock } from './dialogue-world-thread'
import {
  buildAlicizationDigitalLifeArchitectureSystemBlock,
} from './digital-life-architecture'
import {
  buildAlicizationDigitalLifeRuntimeSurface,
} from './digital-life-kernel'
import {
  commitAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpineFromSurface,
} from './digital-life-spine'
import { buildDiscourseState, buildDiscourseStateSystemBlock } from './discourse-state'
import { buildEntityWorldModel } from './entity-world-model'
import {
  createAlicizationExecutionCallbackRuntime,
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import {
  createAlicizationExecutionDeliveryRuntime,
} from './execution-delivery-runtime'
import {
  alicizationTerminalTaskThreadStatuses,
  readExecutionOutcome,
  readLatestExecutionEvent,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import { buildAlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import { buildExecutiveCycle } from './executive-cycle'
import { createAlicizationExecutorRuntime } from './executor-runtime'
import { buildAsyncFactMemoryFragments } from './fact-memory'
import { buildGoalStack } from './goal-stack'
import { buildHypothesisGraph } from './hypothesis-graph'
import { buildInitiativeArbitration } from './initiative-arbiter'
import { buildInitiativeSnapshot } from './initiative-engine'
import { buildInquiryLoop } from './inquiry-loop'
import { buildInquiryPlanner } from './inquiry-planner'
import { resolveInspectionGroundingGate } from './inspection-grounding-gate'
import { resolveInspectionTurnState } from './inspection-turn-state-machine'
import { buildIntentionStream } from './intention-stream'
import { buildLivingWorldState } from './living-world-state'
import { abortAlicizationDirectChatRun, abortAlicizationRunningChatRuns } from './main-chat-abort'
import { deriveMainChatActionObligation } from './main-chat-action-obligation'
import { runAlicizationMainChatBackground } from './main-chat-background-run'
import { handleAlicizationDirectChatStart } from './main-chat-direct-start'
import {
  detectMainGatewayExecutionRoutingIntent,
} from './main-chat-execution-surface'
import { syncAlicizationMainChatLlmRoute } from './main-chat-llm-route-sync'
import { createAlicizationMainChatRunStateController } from './main-chat-run-state'
import {
  buildCardCustomDirectivesSystemBlock,
  extractCustomDirectivesFromMessages,
  extractHostNameFromMessages,
} from './main-chat-runtime-surface'
import {
  createAlicizationMainChatSessionRuntime,
} from './main-chat-session-runtime'
import { acceptAlicizationMainChatStart } from './main-chat-start-acceptance'
import { resolveAlicizationMainChatStartResult } from './main-chat-start-result'
import { createAbortError } from './main-chat-stream-primitives'
import {
  createAlicizationMainGatewayChatTimeoutResult,
  formatAlicizationMainGatewayHealthFailure,
  mainGatewayReachabilityFailureTtlMs,
  mainGatewayReachabilityProbeTimeoutMs,
  mainGatewayReachabilitySuccessTtlMs,
  probeAlicizationMainGatewayReachability,
  readAlicizationMainGatewayHealthCache,
  writeAlicizationMainGatewayHealthCache,
} from './main-gateway-health'
import {
  createAlicizationMemoryLedgerRuntime,
  emptyAlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import { buildMindContinuityFragment, buildMindContinuityRecallSeed } from './mind-continuity'
import { buildMindDynamics } from './mind-dynamics'
import { sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { buildMindKernel } from './mind-kernel'
import { stabilizeMindStateInvariants } from './mind-state-invariants'
import { buildMindSynthesis, buildMindSynthesisSystemBlock } from './mind-synthesizer'
import { buildMindTruthContractLines, deriveMindTruthContract } from './mind-truth-contract'
import { buildMindTurnFrame, buildMindTurnFrameSystemBlock } from './mind-turn-frame'
import { filterOrganicMemoryEntries, isPersonaResidueMemoryText, normalizeOrganicMemoryText } from './organic-memory-hygiene'
import { buildPrivateThoughtLoop } from './private-thought-loop'
import {
  createDefaultProactiveLoopState,
  normalizeProactiveLoopState,
  proactiveDismissCooldownMs,
  proactiveImplicitIgnoredAfterMs,
  proactiveReplyWindowMs,
  registerProactiveDelivery,
  reportExplicitProactiveFeedback,
  settleExpiredProactiveOutcomes,
  settleProactiveOutcomesOnUserTurnStart,
  updateLateNightActivityState,
} from './proactive-feedback'
import {
  buildProactiveLayeredContext,
  inferForegroundContentFromWindow,
  inferForegroundWorkloadFromWindow,
  inferScenarioFromContext,
  isLateNightWindow,
} from './proactive-layered-context'
import { evaluateProactivePolicy } from './proactive-policy'
import {
  parseScreenSemanticSummary,
  pickScreenSemanticCaptureCandidate,
  rankScreenSemanticCaptureCandidates,
} from './proactive-screen-semantic'
import { buildRecallGovernor, buildRecallGovernorSystemBlock } from './recall-governor'
import { buildReflectionLedger } from './reflection-ledger'
import { buildReflectionLedgerFragment } from './reflection-memory'
import { buildRelationshipModel } from './relationship-model'
import { buildRepairLedger } from './repair-ledger'
import { buildReplyDeliberation, buildReplyDeliberationSystemBlock } from './reply-deliberator'
import { buildAlicizationResponseCharter, buildAlicizationResponseCharterSystemBlock } from './response-charter'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'
import {
  buildAlicizationChatStreamEmbodimentMeta,
  buildCompressedNativeImageDataUrl,
  buildDefaultDialoguePerformancePayload,
  buildMindTurnTraceEvents,
  coerceConversationTurnToMindGovernedPayload,
  isAbortError,
  latestUserMessageContainsVisualInput,
  normalizeDialogueRespondedPayload,
  parsePerformanceManifestFromMeta,
  readStringValue,
  sanitizePerformanceManifest,
} from './runtime-governance'
import { registerAlicizationChatInvokeHandlers } from './runtime-invoke-handlers-chat'
import { registerAlicizationDialogueInvokeHandlers } from './runtime-invoke-handlers-dialogue'
import { registerAlicizationMaintenanceInvokeHandlers } from './runtime-invoke-handlers-maintenance'
import { registerAlicizationMemoryInvokeHandlers } from './runtime-invoke-handlers-memory'
import { registerAlicizationSoulStateInvokeHandlers } from './runtime-invoke-handlers-soul-state'
import { registerAlicizationTaskInvokeHandlers } from './runtime-invoke-handlers-task'
import {
  executeBuiltinRealtimeQuery,
  normalizeReminderMessage,
  sanitizeBriefText,
  uniqueCarryAnchors,
} from './runtime-realtime'
import {
  alicizationCardActiveSessionMetaKey,
  alicizationCardKillSwitchMetaKey,
  alicizationDialogueAckStateMetaKey,
  alicizationDreamLastRunMetaKey,
  alicizationExecutionDeliveryStateMetaKey,
  alicizationPerceptionStateMetaKey,
  alicizationPerformanceManifestMetaKey,
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
  dialogueTurnSemanticsTimeoutMs,
  dreamMaxCharsPerAssistantTurn,
  dreamMaxCharsPerUserTurn,
  dreamMaxTotalChars,
  dreamMaxTurns,
  extractPersonaNotesFromBody,
  hashContent,
  inspectionGroundingImageJpegQuality,
  inspectionGroundingImageMaxHeight,
  inspectionGroundingImageMaxWidth,
  interactiveDialogueTurnSemanticsTimeoutMs,
  interactiveSubjectiveInferenceTimeoutMs,
  normalizeCardId,
  normalizeCoreIncarnation,
  normalizeCustomDirectives,
  normalizeGender,
  normalizeHostAttitude,
  normalizeMindAge,
  parseSoul,
  proactiveScreenSemanticCacheTtlMs,
  proactiveScreenSemanticFailureTtlMs,
  proactiveScreenSemanticImageJpegQuality,
  proactiveScreenSemanticImageMaxHeight,
  proactiveScreenSemanticImageMaxWidth,
  proactiveScreenSemanticTimeoutMs,
  reminderClaimBatchSize,
  reminderLlmRetryDelayMs,
  reminderMaxMessageChars,
  reminderMaxMinutes,
  reminderMinMinutes,
  reminderOverdueTierThresholdMinutes,
  sanitizeMultilineText,
  sanitizeText,
  subconsciousInterruptionProbeTimeoutMs,
  subjectiveInferenceTimeoutMs,
  syncPersonalityBaselineInBody,
  toSoulContent,
  winRenameRetryDelaysMs,
  withNeedsGenesis,
} from './runtime-soul'
import { buildSelfContinuity } from './self-continuity'
import { buildSelfGovernor } from './self-governor'
import { buildSelfState } from './self-state'
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
import { rankSubconsciousRecallFragments } from './subconscious-recall-ranking'
import {
  buildSubjectiveInference,
  mergeSubjectiveInference,
  parseSubjectiveInferenceCandidate,
  projectSubjectiveInferenceToAppraisal,
} from './subjective-inference'
import {
  buildSubjectiveSceneAppraisal,
} from './subjective-scene-model'
import { createTaskThreadOrchestrator } from './task-thread-orchestrator'
import { buildThoughtThreads } from './thought-threads'
import { buildThreadRuntime } from './thread-runtime'
import { registerDialogueWorldThreadAssistantTurn, settleDialogueWorldThreadOnUserTurn } from './turn-outcome-reducer'
import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
} from './visual-episodic-memory'
import { buildVisualHeartbeat } from './visual-heartbeat'
import { buildWorldModel } from './world-model'
import { buildWorldOntology } from './world-ontology'

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
    sanitizeText,
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
  const mainChatSessionRuntime = createAlicizationMainChatSessionRuntime({
    buildMainRuntimeCorePromptBlocks,
    buildOrganicMemorySystemBlocks,
    buildPerformanceManifestSystemBlocks,
    dialogueSessionManager,
    executionCapabilityChannels: alicizationExecutionCapabilityChannels,
    executeMainGatewayTaskThread,
    getPerformanceManifest,
    getSensorySnapshot: async () => sensoryBus.getSnapshot(),
    latestUserMessageContainsVisualInput,
    openAgentTurn: input => agentRuntime.openTurn(input),
    resolveCardCustomDirectives,
    resolveCardHostName,
    resolveExecutionCapabilitiesForPrompt,
    resolveOrganicMemoryPromptContext,
    resolveSessionContinuitySignals: async ({ cardId }) => await resolveAgentSessionContinuitySignals(cardId),
    resolveTaskPlanningCapabilities,
    scheduleReminderTask,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    invokeMcpListTools: invokeAlicizationMcpListToolsFromMain,
    invokeMcpCallTool: invokeAlicizationMcpCallToolFromMain,
  })
  let activeProviderId = ''
  let activeModelId = ''
  let providerCredentials: Record<string, Record<string, unknown>> = {}
  const mainGatewayHealthCache = new Map<string, {
    reachable: boolean
    checkedAt: number
    expiresAt: number
    code?: string
    reason?: string
  }>()
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

  function normalizeExecutionDeliveryStatus(
    status: AlicizationTaskThreadRecord['status'],
  ): AlicizationAgentSessionActionInput['status'] {
    return status === 'completed' ? 'completed' : 'failed'
  }

  function buildExecutionDeliveryAction(entry: {
    channel: string
    completedAt: number
    decisionTraceId: string | null
    sessionId: string
    signature: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    threadId: string
    turnId: string | null
  }) {
    return {
      kind: 'executor' as const,
      status: normalizeExecutionDeliveryStatus(entry.status),
      label: `callback:${sanitizeExecutionLedgerText(entry.channel, 48) || 'executor'}`,
      summary: entry.summary,
      signature: entry.signature,
      finishedAt: entry.completedAt,
      metadata: {
        source: 'execution-delivery-runtime',
        threadId: entry.threadId,
        decisionTraceId: entry.decisionTraceId,
        turnId: entry.turnId,
        sessionId: entry.sessionId,
        selectedChannel: entry.channel,
        threadStatus: entry.status,
      },
    }
  }

  function normalizeTaskThreadSessionMirrorStatus(
    status: AlicizationTaskThreadRecord['status'],
  ): AlicizationAgentSessionActionInput['status'] {
    if (status === 'completed')
      return 'completed'
    if (status === 'failed' || status === 'cancelled' || status === 'blocked')
      return 'failed'
    return 'pending'
  }

  function buildTaskThreadSessionMirrorAction(input: {
    source: string
    thread: AlicizationTaskThreadRecord
  }): AlicizationAgentSessionActionInput {
    const channel = sanitizeExecutionLedgerText(
      input.thread.selectedChannel ?? input.thread.proposedChannel ?? input.thread.kind,
      48,
    ) || 'executor'
    const labelPrefix = input.source === 'task-planning'
      ? 'plan'
      : input.source === 'task-dispatch'
        ? 'dispatch'
        : input.source === 'execution-delivery-queued'
          ? 'settled'
          : 'thread'
    const activityAt = readTaskThreadActivityAt(input.thread)

    return {
      kind: 'executor',
      status: normalizeTaskThreadSessionMirrorStatus(input.thread.status),
      label: `${labelPrefix}:${channel}`,
      summary: sanitizeExecutionLedgerText(input.thread.summary ?? '', 180) || null,
      signature: [
        input.source,
        input.thread.id,
        input.thread.status,
        activityAt,
      ].join(':'),
      startedAt: input.thread.createdAt,
      finishedAt: alicizationTerminalTaskThreadStatuses.has(input.thread.status)
        ? activityAt
        : null,
      metadata: {
        source: input.source,
        threadId: input.thread.id,
        decisionTraceId: input.thread.decisionTraceId,
        turnId: input.thread.turnId,
        sessionId: input.thread.sessionId,
        selectedChannel: input.thread.selectedChannel,
        proposedChannel: input.thread.proposedChannel,
        threadStatus: input.thread.status,
        goal: input.thread.goal,
        threadKind: input.thread.kind,
      },
    }
  }

  function buildSceneResidueSessionMirrorAction(input: {
    source: string
    residue: AlicizationPerceptionSceneResidue
  }): AlicizationAgentSessionActionInput {
    const label = input.residue.source === 'screen-semantic-summary'
      ? 'scene:semantic'
      : 'scene:inspection'
    const summary = sanitizeExecutionLedgerText(
      input.residue.summary
      ?? `${input.residue.workloadKind}/${input.residue.contentKind}`,
      180,
    ) || `${input.residue.workloadKind}/${input.residue.contentKind}`
    const focusSignature = sanitizeText(
      input.residue.focusTarget?.title
      ?? input.residue.focusTarget?.appName
      ?? input.residue.focusTarget?.processName
      ?? '',
    ).slice(0, 120)

    return {
      kind: 'sensory',
      status: 'completed',
      label,
      summary,
      signature: [
        input.source,
        input.residue.source,
        input.residue.observedAt,
        focusSignature,
      ].join(':'),
      startedAt: input.residue.observedAt,
      finishedAt: input.residue.observedAt,
      metadata: {
        source: input.source,
        residueSource: input.residue.source,
        workloadKind: input.residue.workloadKind,
        contentKind: input.residue.contentKind,
        focusSource: input.residue.focusSource,
        captureSourceName: input.residue.captureSourceName,
        captureStrategy: input.residue.captureStrategy,
      },
    }
  }

  function buildReminderContinuitySignal(input: {
    delayMinutes: number
    task: {
      taskId: string
      triggerAt: number
      message: string
      sourceTurnId?: string | null
    }
    tier: 'mild' | 'severe'
    trigger: 'startup' | 'timer' | 'force'
  }): AlicizationAgentSessionContinuityInput {
    const summary = [
      input.tier === 'severe' ? 'overdue reminder' : 'due reminder',
      `${Math.max(0, input.delayMinutes).toFixed(1)}m late`,
      sanitizeBriefText(input.task.message, 140) || 'reminder',
    ].join(' | ')
    return {
      kind: 'reminder',
      state: 'pending',
      label: `reminder:${sanitizeBriefText(input.task.taskId, 80) || 'due'}`,
      summary,
      signature: [
        'reminder',
        sanitizeBriefText(input.task.taskId, 120),
        Math.max(0, Math.floor(Number(input.task.triggerAt ?? 0))),
      ].join(':'),
      createdAt: Number.isFinite(input.task.triggerAt)
        ? Math.max(0, Math.floor(Number(input.task.triggerAt)))
        : Date.now(),
      metadata: {
        taskId: sanitizeBriefText(input.task.taskId, 120) || null,
        tier: input.tier,
        trigger: input.trigger,
        delayMinutes: Number(input.delayMinutes.toFixed(1)),
        message: sanitizeBriefText(input.task.message, 200) || null,
        sourceTurnId: sanitizeBriefText(input.task.sourceTurnId ?? '', 160) || null,
      },
    }
  }

  function buildReminderSessionMirrorAction(input: {
    delayMinutes: number
    firedTurnId?: string | null
    task: {
      taskId: string
      triggerAt: number
      message: string
      sourceTurnId?: string | null
    }
    tier: 'mild' | 'severe'
    trigger: 'startup' | 'timer' | 'force'
  }): AlicizationAgentSessionActionInput {
    const taskId = sanitizeBriefText(input.task.taskId, 120)
    const labelTaskId = sanitizeBriefText(input.task.taskId, 80)
    const triggerAt = Number.isFinite(input.task.triggerAt)
      ? Math.max(0, Math.floor(Number(input.task.triggerAt)))
      : Date.now()
    const finishedAt = Math.max(triggerAt, Date.now())
    const summary = sanitizeExecutionLedgerText(
      [
        input.tier === 'severe' ? 'overdue reminder delivered' : 'due reminder delivered',
        `${Math.max(0, input.delayMinutes).toFixed(1)}m late`,
        sanitizeBriefText(input.task.message, 140) || 'reminder',
      ].join(' | '),
      180,
    )

    return {
      kind: 'runtime',
      status: 'completed',
      label: `reminder:${labelTaskId || 'due'}`,
      summary: summary || 'reminder delivered',
      signature: [
        'reminder-delivery',
        taskId,
        triggerAt,
        sanitizeBriefText(input.firedTurnId ?? '', 120),
      ].join(':'),
      startedAt: triggerAt,
      finishedAt,
      metadata: {
        source: 'reminder-delivery-runtime',
        trigger: input.trigger,
        tier: input.tier,
        delayMinutes: Number(input.delayMinutes.toFixed(1)),
        taskId: taskId || null,
        message: sanitizeBriefText(input.task.message, 200) || null,
        sourceTurnId: sanitizeBriefText(input.task.sourceTurnId ?? '', 160) || null,
        firedTurnId: sanitizeBriefText(input.firedTurnId ?? '', 160) || null,
      },
    }
  }

  function buildProactiveOutcomeContinuitySignal(
    outcome: AlicizationRecentProactiveOutcome,
  ): AlicizationAgentSessionContinuityInput {
    const scenario = sanitizeText(outcome.scenario) || 'general'
    const outcomeName = sanitizeText(outcome.outcome) || 'observed'
    const turnId = sanitizeBriefText(outcome.turnId, 120)
    const summaryLead = describeProactiveOutcome(outcome)

    return {
      kind: 'proactive',
      state: 'observed',
      label: `proactive:${scenario}:${outcomeName}`,
      summary: [
        summaryLead,
        `scenario=${scenario}`,
      ].filter(Boolean).join(' | '),
      signature: [
        'proactive-outcome',
        turnId,
        outcomeName,
      ].join(':'),
      createdAt: Math.max(0, Math.floor(Number(outcome.createdAt) || Date.now())),
      metadata: {
        source: 'proactive-feedback',
        turnId: turnId || null,
        scenario,
        outcome: outcomeName,
      },
    }
  }

  function describeProactiveOutcome(outcome: AlicizationRecentProactiveOutcome) {
    if (outcome.outcome === 'reply-within-120s')
      return 'host replied within 120s after a proactive turn'
    if (outcome.outcome === 'positive')
      return 'host received a proactive turn positively'
    if (outcome.outcome === 'dismiss')
      return 'host explicitly dismissed a proactive turn'
    return 'a proactive turn expired without host reply'
  }

  function buildProactiveFeedbackSessionMirrorAction(input: {
    outcome: AlicizationRecentProactiveOutcome
    source: string
  }): AlicizationAgentSessionActionInput {
    const scenario = sanitizeText(input.outcome.scenario) || 'general'
    const outcomeName = sanitizeText(input.outcome.outcome) || 'observed'
    const turnId = sanitizeBriefText(input.outcome.turnId, 120)
    const createdAt = Math.max(0, Math.floor(Number(input.outcome.createdAt) || Date.now()))
    const summary = sanitizeExecutionLedgerText(
      [
        describeProactiveOutcome(input.outcome),
        `scenario=${scenario}`,
      ].join(' | '),
      180,
    )

    return {
      kind: 'runtime',
      status: 'completed',
      label: `proactive-feedback:${scenario}:${outcomeName}`,
      summary: summary || describeProactiveOutcome(input.outcome),
      signature: [
        'proactive-feedback',
        input.source,
        turnId,
        outcomeName,
        createdAt,
      ].join(':'),
      startedAt: createdAt,
      finishedAt: createdAt,
      metadata: {
        source: input.source,
        turnId: turnId || null,
        scenario,
        outcome: outcomeName,
      },
    }
  }

  function buildPendingProactiveContinuitySignal(input: {
    now: number
    pending: AlicizationPendingProactiveOutcome
  }): AlicizationAgentSessionContinuityInput {
    const scenario = sanitizeText(input.pending.scenario) || 'general'
    const turnId = sanitizeBriefText(input.pending.turnId, 120)
    const elapsedMinutes = Math.max(0, (input.now - input.pending.deliveredAt) / 60_000)
    const feedbackWindowMinutes = Math.max(0, input.pending.feedbackWindowMs / 60_000)
    return {
      kind: 'proactive',
      state: 'pending',
      label: `proactive:${scenario}:pending`,
      summary: [
        'awaiting host response to a proactive turn',
        `scenario=${scenario}`,
        `${elapsedMinutes.toFixed(1)}m elapsed`,
        `${feedbackWindowMinutes.toFixed(1)}m direct-reply window`,
      ].join(' | '),
      signature: [
        'proactive-pending',
        turnId,
      ].join(':'),
      createdAt: Math.max(0, Math.floor(Number(input.pending.deliveredAt) || Date.now())),
      metadata: {
        source: 'proactive-feedback',
        phase: 'pending',
        turnId: turnId || null,
        scenario,
        deliveredAt: Math.max(0, Math.floor(Number(input.pending.deliveredAt) || 0)),
        feedbackWindowMs: Math.max(1_000, Math.floor(Number(input.pending.feedbackWindowMs) || proactiveReplyWindowMs)),
      },
    }
  }

  function buildProactiveContinuitySignals(
    state: AlicizationProactiveLoopState,
    now = Date.now(),
  ): AlicizationAgentSessionContinuityInput[] {
    const signals: AlicizationAgentSessionContinuityInput[] = []
    const latestPending = [...state.pendingOutcomes]
      .sort((left, right) => left.deliveredAt - right.deliveredAt)
      .at(-1)
    const latestOutcome = [...state.recentOutcomes]
      .sort((left, right) => left.createdAt - right.createdAt)
      .at(-1)

    if (
      latestPending
      && now - latestPending.deliveredAt <= Math.max(latestPending.feedbackWindowMs, proactiveImplicitIgnoredAfterMs)
    ) {
      signals.push(buildPendingProactiveContinuitySignal({
        now,
        pending: latestPending,
      }))
    }

    if (latestOutcome && now - latestOutcome.createdAt <= proactiveDismissCooldownMs) {
      signals.push(buildProactiveOutcomeContinuitySignal(latestOutcome))
    }

    return signals
      .filter(signal => Number.isFinite(signal.createdAt))
      .sort((left, right) => Number(left.createdAt) - Number(right.createdAt))
  }

  function buildDialogueContinuitySignal(
    state: AlicizationVisualPresenceStateSnapshot,
  ): AlicizationAgentSessionContinuityInput | null {
    const dialogueThread = state.dialogueWorldThread
    if (!dialogueThread)
      return null

    const activeThread = sanitizeBriefText(dialogueThread.activeThread, 160)
    const primaryAnchor = sanitizeBriefText(dialogueThread.primaryTurnAnchor ?? '', 140)
    const currentQuestion = sanitizeBriefText(dialogueThread.currentQuestion ?? '', 140)
    const openLoop = sanitizeBriefText(dialogueThread.openLoops[0] ?? '', 140)
    const recentlyResolved = sanitizeBriefText(dialogueThread.recentlyResolvedLoops[0] ?? '', 140)
    const carryReason = sanitizeBriefText(dialogueThread.carryReason ?? '', 140)
    const pendingValidation = sanitizeBriefText(dialogueThread.pendingValidation?.question ?? '', 140)
    const relationDrift = sanitizeText(dialogueThread.relationDrift) || 'steady'
    const memoryMode = sanitizeText(dialogueThread.memoryMode)
    const lastOutcome = sanitizeText(dialogueThread.lastOutcome)
    const shouldSurface = Boolean(
      activeThread
      || primaryAnchor
      || currentQuestion
      || openLoop
      || pendingValidation
      || dialogueThread.carryEligible === true,
    )

    if (!shouldSurface)
      return null

    return {
      kind: 'dialogue',
      state: openLoop || pendingValidation || lastOutcome === 'pending' || lastOutcome === 'repairing' || lastOutcome === 'deferred'
        ? 'pending'
        : 'observed',
      label: `dialogue:${relationDrift}:${memoryMode || 'carry'}`,
      summary: [
        activeThread ? `thread=${activeThread}` : '',
        primaryAnchor ? `anchor=${primaryAnchor}` : '',
        currentQuestion ? `question=${currentQuestion}` : '',
        openLoop ? `open_loop=${openLoop}` : '',
        recentlyResolved ? `resolved=${recentlyResolved}` : '',
        carryReason ? `carry=${carryReason}` : '',
        `drift=${relationDrift}`,
        memoryMode ? `memory=${memoryMode}` : '',
        lastOutcome && lastOutcome !== 'none' ? `outcome=${lastOutcome}` : '',
        pendingValidation ? `validate=${pendingValidation}` : '',
      ].filter(Boolean).join(' | '),
      signature: [
        'dialogue-world-thread',
        Math.max(0, Math.floor(Number(dialogueThread.updatedAt) || 0)),
        activeThread || primaryAnchor || 'carry',
      ].join(':'),
      createdAt: Math.max(
        0,
        Math.floor(Number(dialogueThread.pendingValidation?.openedAt ?? dialogueThread.updatedAt) || Date.now()),
      ),
      metadata: {
        source: 'dialogue-world-thread',
        activeThread: activeThread || null,
        primaryAnchor: primaryAnchor || null,
        currentQuestion: currentQuestion || null,
        openLoop: openLoop || null,
        carryReason: carryReason || null,
        relationDrift,
        memoryMode: memoryMode || null,
        lastOutcome: lastOutcome || null,
        carryEligible: dialogueThread.carryEligible === true,
      },
    }
  }

  function buildVisualPresenceContinuitySignal(
    state: AlicizationVisualPresenceStateSnapshot,
  ): AlicizationAgentSessionContinuityInput | null {
    const sceneSummary = sanitizeBriefText(state.currentScene?.summary ?? '', 120)
    const activeThread = state.worldModel?.activeThread ?? null
    const activeThreadTitle = sanitizeBriefText(activeThread?.title ?? '', 96)
    const activeThreadSummary = sanitizeBriefText(activeThread?.summary ?? '', 120)
    const dialogueThread = sanitizeBriefText(
      state.dialogueWorldThread?.activeThread
      ?? state.dialogueWorldThread?.currentQuestion
      ?? '',
      120,
    )
    const captureHealth = sanitizeText(state.captureState.health, '')
    const degradedReason = sanitizeBriefText(state.captureState.degradedReason ?? '', 96)
    const embodiedPresence = sanitizeText(state.privateThought?.embodiedPresence, '')
    const summary = [
      sceneSummary ? `scene=${sceneSummary}` : '',
      activeThreadTitle
        ? `thread=${activeThreadTitle}`
        : activeThreadSummary
          ? `thread=${activeThreadSummary}`
          : '',
      dialogueThread ? `dialogue=${dialogueThread}` : '',
      captureHealth
        ? `capture=${captureHealth}${degradedReason ? `/${degradedReason}` : ''}`
        : '',
      embodiedPresence ? `presence=${embodiedPresence}` : '',
    ].filter(Boolean).join(' | ')

    if (!summary)
      return null

    return {
      kind: 'presence',
      state: 'observed',
      label: `presence:${sanitizeBriefText(state.watchMode, 48) || 'unknown'}`,
      summary,
      signature: `visual-presence:${buildVisualPresenceCapturePersistFingerprint(state)}`,
      createdAt: Number.isFinite(state.updatedAt) ? Math.max(0, Math.floor(state.updatedAt)) : Date.now(),
      metadata: {
        watchMode: state.watchMode,
        sceneSummary: sceneSummary || null,
        activeThreadKind: activeThread?.kind ?? null,
        activeThreadTitle: activeThreadTitle || null,
        activeThreadSummary: activeThreadSummary || null,
        dialogueThread: dialogueThread || null,
        captureHealth: captureHealth || null,
        degradedReason: degradedReason || null,
        embodiedPresence: embodiedPresence || null,
        updatedAt: Number.isFinite(state.updatedAt) ? Math.max(0, Math.floor(state.updatedAt)) : null,
      },
    }
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
    const value = state.pending.length > 0 || state.delivered.length > 0
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
    queueSubconsciousWake(cardId, 'feedback:user-turn-settlement', 600)
    return settled.state
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
        await alicizationDb.setMetaValue(alicizationProactiveLoopStateMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationExecutionDeliveryStateMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationPerceptionStateMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationVisualPresenceStateMetaKey, '').catch(() => {})
        activeSessionIdByCard.delete(cardId)
        dialogueAckByCard.delete(cardId)
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

  type ReminderScheduleSource = 'tool' | 'manual-fallback'

  async function scheduleReminderTask(
    cardId: string,
    input: {
      minutes: unknown
      message: unknown
      sourceTurnId?: string
    },
    source: ReminderScheduleSource,
  ): Promise<AlicizationReminderScheduleResult> {
    const debugPrefix = source === 'tool' ? 'reminder.tool-execute' : 'reminder.manual-schedule'
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

    const nextFrontmatter: AlicizationSoulFrontmatter = {
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

  function isSeriousDurabilityPulseForMind(durabilityPulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
    return durabilityPulse?.kind === 'process-gone'
      || durabilityPulse?.kind === 'render-process-gone'
      || durabilityPulse?.kind === 'child-process-gone'
      || durabilityPulse?.kind === 'anr-likely'
  }

  function buildMindSceneSignature(scene: AlicizationVisualPresenceStateSnapshot['currentScene']) {
    if (!scene)
      return ''
    return [
      scene.scenario,
      scene.workloadKind,
      scene.contentKind,
      sanitizeText(scene.summary),
      sanitizeText(scene.target?.appName),
      sanitizeText(scene.target?.processName),
      sanitizeText(scene.target?.title),
      Number.isFinite(Number(scene.target?.pid)) ? Math.floor(Number(scene.target?.pid)) : '',
    ].join('::').toLowerCase()
  }

  function buildMindAttentionSignature(attention: AlicizationVisualPresenceStateSnapshot['attention']) {
    if (!attention?.target)
      return ''
    return [
      sanitizeText(attention.target.appName),
      sanitizeText(attention.target.processName),
      sanitizeText(attention.target.title),
      Number.isFinite(Number(attention.target.pid)) ? Math.floor(Number(attention.target.pid)) : '',
      attention.source,
    ].join('::').toLowerCase()
  }

  function shouldAttemptStructuredSceneAppraisal(input: {
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  }) {
    if (isSeriousDurabilityPulseForMind(input.durabilityPulse))
      return true

    return input.visualHeartbeat.scene?.source === 'screen-semantic-summary'
      || input.visualHeartbeat.scene?.source === 'invited-grounding'
  }

  function mergeDialogueIngressCarryWorldModel(input: {
    inspectionRequested?: boolean
    currentScene: ReturnType<typeof buildVisualHeartbeat>['scene']
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    liveWorldModel: ReturnType<typeof buildWorldModel>
    ingressWorldModel?: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  }) {
    const carryThread = input.ingressWorldModel?.activeThread ?? null
    if (!input.inspectionRequested || !carryThread)
      return input.liveWorldModel

    const liveTarget = input.currentForeground
      ?? input.currentScene?.target
      ?? input.liveWorldModel.focusTarget
      ?? null
    const carryTarget = carryThread.target ?? input.ingressWorldModel?.focusTarget ?? null
    const liveSurfaceWeak = !input.currentScene
      || isSelfPerceptionTarget(input.currentScene.target ?? null)
      || input.currentScene.workloadKind === 'unknown'
      || input.currentScene.contentKind === 'chat'

    if (!liveSurfaceWeak && liveTarget && !isSelfPerceptionTarget(liveTarget))
      return input.liveWorldModel
    if (carryTarget && isSelfPerceptionTarget(carryTarget))
      return input.liveWorldModel

    const lingeringThreads = [
      input.liveWorldModel.activeThread && input.liveWorldModel.activeThread.id !== carryThread.id
        ? input.liveWorldModel.activeThread
        : null,
      ...(input.ingressWorldModel?.lingeringThreads ?? []),
      ...input.liveWorldModel.lingeringThreads,
    ].filter((thread): thread is NonNullable<typeof carryThread> => Boolean(thread)).filter((thread, index, threads) => threads.findIndex(candidate => candidate.id === thread.id) === index).slice(0, 4)

    return {
      ...input.liveWorldModel,
      activeThread: carryThread,
      lingeringThreads,
    }
  }

  function shouldQuarantineDialogueFirstCarry(input: {
    dialogueSemantics?: ReturnType<typeof buildDialogueTurnSemantics> | null
    inspectionRequested?: boolean
  }) {
    if (input.inspectionRequested === true)
      return false

    const subjectPreference = input.dialogueSemantics?.subjectPreference ?? null
    if (subjectPreference === 'task-knot' || subjectPreference === 'visible-scene')
      return false

    if (input.dialogueSemantics?.responseNeed === 'repair' || input.dialogueSemantics?.responseNeed === 'guide' || input.dialogueSemantics?.responseNeed === 'teach')
      return false

    if (input.dialogueSemantics?.truthExpectation === 'strict')
      return false

    return Boolean(input.dialogueSemantics)
  }

  function filterDialogueAnchoredWorldThreads(
    threads: ReturnType<typeof buildWorldModel>['lingeringThreads'],
    anchors: string[],
    maxItems = 4,
  ) {
    if (anchors.length === 0)
      return []

    return threads
      .filter((thread) => {
        const message = sanitizeBriefText([thread.title, thread.summary].filter(Boolean).join(' '), 220)
        if (!message)
          return false
        return measureDialogueFocusAlignment({
          message,
          contextPhrases: anchors,
        }).overlapRatio >= 0.18
      })
      .slice(0, maxItems)
  }

  function filterDialogueAnchoredCarryValues(values: string[], anchors: string[], maxItems = 4) {
    if (anchors.length === 0)
      return []

    const filtered: string[] = []
    for (const value of values) {
      const normalized = sanitizeBriefText(value, 180)
      if (!normalized || filtered.includes(normalized))
        continue
      if (measureDialogueFocusAlignment({
        message: normalized,
        contextPhrases: anchors,
      }).overlapRatio < 0.18) {
        continue
      }
      filtered.push(normalized)
      if (filtered.length >= maxItems)
        break
    }
    return filtered
  }

  function quarantineDialogueFirstWorldModel(input: {
    userText?: string
    worldModel: ReturnType<typeof buildWorldModel>
    dialogueSemantics?: ReturnType<typeof buildDialogueTurnSemantics> | null
    inspectionRequested?: boolean
  }) {
    if (!shouldQuarantineDialogueFirstCarry({
      dialogueSemantics: input.dialogueSemantics ?? null,
      inspectionRequested: input.inspectionRequested,
    })) {
      return input.worldModel
    }

    const anchors = uniqueCarryAnchors([
      input.userText,
      input.dialogueSemantics?.summary,
      input.dialogueSemantics?.taskAnchor,
    ])
    if (anchors.length === 0)
      return input.worldModel

    const activeThread = input.worldModel.activeThread && measureDialogueFocusAlignment({
      message: sanitizeBriefText([
        input.worldModel.activeThread.title,
        input.worldModel.activeThread.summary,
      ].filter(Boolean).join(' '), 220),
      contextPhrases: anchors,
    }).overlapRatio >= 0.18
      ? input.worldModel.activeThread
      : null

    return {
      ...input.worldModel,
      activeThread,
      lingeringThreads: filterDialogueAnchoredWorldThreads(input.worldModel.lingeringThreads, anchors),
      focusTarget: activeThread?.target ?? null,
      epistemicState: {
        ...input.worldModel.epistemicState,
        openQuestions: filterDialogueAnchoredCarryValues(input.worldModel.epistemicState.openQuestions, anchors),
        staleRisks: filterDialogueAnchoredCarryValues(input.worldModel.epistemicState.staleRisks, anchors),
      },
    }
  }

  async function resolveDialogueTurnSemantics(input: {
    cardId: string
    userText: string
    recentMessages: Message[]
    context: AlicizationProactiveLayeredContext
    currentScene: ReturnType<typeof buildVisualHeartbeat>['scene']
    worldModel: ReturnType<typeof buildWorldModel>
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    inspectionRequested?: boolean
    groundedThisTurn?: boolean
    timeoutMs?: number
    agentTurn?: AlicizationAgentTurnRuntime | null
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) {
    const heuristic = buildDialogueTurnSemantics({
      userText: input.userText,
      context: input.context,
      currentScene: input.currentScene,
      worldModel: input.worldModel,
      subjectiveInference: input.previousVisualPresenceState.subjectiveInference ?? null,
      relationshipModel: input.previousVisualPresenceState.relationshipModel ?? null,
      privateThought: input.previousVisualPresenceState.privateThought ?? null,
      previousAssistantText: readLatestAssistantMessageText(input.recentMessages),
      inspectionRequested: input.inspectionRequested === true,
      groundedThisTurn: input.groundedThisTurn === true,
    })
    if (!shouldAttemptDialogueTurnSemanticsRefinement({
      heuristic,
      inspectionRequested: input.inspectionRequested,
      groundedThisTurn: input.groundedThisTurn === true,
    })) {
      return heuristic
    }

    const promptSnapshot = buildDialogueTurnSemanticsPromptSnapshot({
      userText: input.userText,
      recentMessages: input.recentMessages,
      currentScene: input.currentScene,
      worldModel: input.worldModel,
      previousVisualPresenceState: input.previousVisualPresenceState,
      heuristic,
      inspectionRequested: input.inspectionRequested === true,
    })
    const raw = await generateMainGatewayText({
      system: [
        '[ALICIZATION_DIALOGUE_TURN_SEMANTICS]',
        'You are Alicization private dialogue cognition, not user-facing dialogue.',
        'Interpret the current user turn into Alicization turn semantics.',
        'Output valid JSON only with keys: act, responseNeed, truthExpectation, affectiveTone, subjectPreference, taskAnchor, sharedAttentionDemand, personaSuppression, confidence, summary, reasonTags.',
        'act must be one of: ask-help, ask-teach, verify-grounding, correct, challenge, share-state, seek-care, social-bid, continue-thread, close-thread, unknown.',
        'responseNeed must be one of: repair, guide, teach, answer, care, accompany, clarify.',
        'truthExpectation must be one of: strict, normal, light.',
        'affectiveTone must be one of: frustrated, tired, urgent, warm, neutral.',
        'subjectPreference must be one of: alicization-self, relationship, host-state, task-knot, visible-scene, general.',
        'sharedAttentionDemand, personaSuppression, confidence must be numbers in range [0,1].',
        'summary must be a short obligation-shaped sentence, not roleplay.',
        'reasonTags must be short lower-kebab-case strings.',
        'Prefer the actual user move in this turn over stale screen continuity when they conflict.',
        'If this user turn is a short follow-up right after Alicization just answered, check whether it is correcting or rejecting the previous answer before you treat it as a detached personal question.',
        'First decide whether the host is asking about Alicization herself, the current task knot, or the visible scene.',
        'Do not turn a detached personal or reflective question into verify-grounding just because the screen state is uncertain.',
        'If inspectionRequested is true, ingress governance already judged this turn as world-owned unless the host explicitly pivots away from inspection.',
        'Do not recast an inspection-owned turn as a relationship or self turn just because the literal foreground surface is the Alicization/Codex chat window.',
        'If the host is criticizing Alicization herself, her intelligence, or her responsiveness, prefer subjectPreference=alicization-self or relationship unless they are still literally asking for screen truth.',
        'If the host is reacting to Alicization’s last answer with confusion or frustration, prefer act=challenge or correct and keep the turn dialogue-first unless the host explicitly asks for a fresh screen read.',
        'Only use responseNeed=repair when the current turn truly needs scene truth repair or re-grounding.',
      ].join('\n'),
      user: `Dialogue mind snapshot JSON: ${JSON.stringify(promptSnapshot)}`,
      timeoutMs: input.timeoutMs ?? dialogueTurnSemanticsTimeoutMs,
      source: 'dialogue-turn-semantics',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: {
        turnId: buildMainGatewayAgentTurnId('dialogue-turn-semantics', input.cardId, Date.now()),
      },
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
    })

    return mergeDialogueTurnSemantics(
      heuristic,
      raw ? parseDialogueTurnSemanticsCandidate(raw) : null,
    )
  }

  function compactPromptText(raw: unknown, maxChars = 180) {
    if (typeof raw !== 'string')
      return ''
    return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  }

  function buildDialogueTurnSemanticsPromptSnapshot(input: {
    userText: string
    recentMessages: Message[]
    currentScene: ReturnType<typeof buildVisualHeartbeat>['scene']
    worldModel: ReturnType<typeof buildWorldModel>
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    heuristic: ReturnType<typeof buildDialogueTurnSemantics>
    inspectionRequested?: boolean
  }) {
    return {
      userTurn: compactPromptText(input.userText, 220),
      inspectionRequested: input.inspectionRequested === true,
      recentDialogue: input.recentMessages.slice(-4).map(message => ({
        role: message.role,
        content: compactPromptText(readTransportContentAsText(message.content), 140) || undefined,
      })),
      previousAssistantTurn: compactPromptText(readLatestAssistantMessageText(input.recentMessages), 160) || undefined,
      currentScene: input.currentScene
        ? {
            scenario: input.currentScene.scenario,
            workloadKind: input.currentScene.workloadKind,
            contentKind: input.currentScene.contentKind,
            summary: compactPromptText(input.currentScene.summary, 140) || undefined,
            source: input.currentScene.source,
            confidence: input.currentScene.confidence,
            target: compactPromptTarget(input.currentScene.target),
          }
        : null,
      activeThread: input.worldModel.activeThread
        ? {
            kind: input.worldModel.activeThread.kind,
            source: input.worldModel.activeThread.source,
            title: compactPromptText(input.worldModel.activeThread.title, 120) || undefined,
            summary: compactPromptText(input.worldModel.activeThread.summary, 160) || undefined,
            confidence: input.worldModel.activeThread.confidence,
            unresolved: input.worldModel.activeThread.unresolved,
          }
        : null,
      epistemicState: {
        certainty: input.worldModel.epistemicState.certainty,
        freshness: input.worldModel.epistemicState.freshness,
        openQuestions: input.worldModel.epistemicState.openQuestions.slice(0, 3).map(question => compactPromptText(question, 120)).filter(Boolean),
        staleRisks: input.worldModel.epistemicState.staleRisks.slice(0, 3).map(risk => compactPromptText(risk, 120)).filter(Boolean),
      },
      previousMind: {
        subjectiveInference: input.previousVisualPresenceState.subjectiveInference
          ? {
              dominantInterpretation: compactPromptText(input.previousVisualPresenceState.subjectiveInference.dominantInterpretation, 160) || undefined,
              situatedMeaning: compactPromptText(input.previousVisualPresenceState.subjectiveInference.situatedMeaning, 160) || undefined,
              topIntent: input.previousVisualPresenceState.subjectiveInference.hostIntentCandidates[0]?.goal ?? undefined,
              topNeed: input.previousVisualPresenceState.subjectiveInference.relationshipNeedCandidates[0]?.need ?? undefined,
            }
          : null,
        relationshipModel: input.previousVisualPresenceState.relationshipModel
          ? {
              climate: input.previousVisualPresenceState.relationshipModel.climate,
              approachVector: input.previousVisualPresenceState.relationshipModel.approachVector,
              sharedAttentionTrust: input.previousVisualPresenceState.relationshipModel.sharedAttentionTrust,
            }
          : null,
        privateThought: input.previousVisualPresenceState.privateThought
          ? {
              stance: input.previousVisualPresenceState.privateThought.stance,
              shouldSpeak: input.previousVisualPresenceState.privateThought.shouldSpeak,
              emotionalTension: input.previousVisualPresenceState.privateThought.emotionalTension,
              thoughtText: compactPromptText(input.previousVisualPresenceState.privateThought.thoughtText, 160) || undefined,
            }
          : null,
      },
      heuristic: {
        act: input.heuristic.act,
        responseNeed: input.heuristic.responseNeed,
        truthExpectation: input.heuristic.truthExpectation,
        affectiveTone: input.heuristic.affectiveTone,
        subjectPreference: input.heuristic.subjectPreference ?? undefined,
        taskAnchor: compactPromptText(input.heuristic.taskAnchor, 140) || undefined,
        summary: compactPromptText(input.heuristic.summary, 160) || undefined,
        reasonTags: input.heuristic.reasonTags.slice(0, 8),
      },
    }
  }

  function compactPromptTarget(target?: {
    appName?: string
    processName?: string
    title?: string
    pid?: number | null
  } | null) {
    if (!target)
      return null
    return {
      appName: compactPromptText(target.appName, 64) || undefined,
      processName: compactPromptText(target.processName, 64) || undefined,
      title: compactPromptText(target.title, 120) || undefined,
      pid: typeof target.pid === 'number' && Number.isFinite(target.pid) ? target.pid : undefined,
    }
  }

  function buildSubjectiveInferencePromptSnapshot(input: {
    context: AlicizationProactiveLayeredContext
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    attention: ReturnType<typeof updateVisualAttentionModel>
    worldModel: ReturnType<typeof buildWorldModel>
    heuristicAppraisal: ReturnType<typeof buildSubjectiveSceneAppraisal>
    durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
    dialogueSemantics?: ReturnType<typeof buildDialogueTurnSemantics>
  }) {
    const previousInference = input.previousVisualPresenceState.subjectiveInference
    return {
      context: {
        localTime: input.context.localTime,
        system: {
          cpuUsage: input.context.system.cpuUsage,
          idleSeconds: input.context.system.idleSeconds,
          inputActivity: input.context.system.inputActivity,
          fullscreenLikely: input.context.system.fullscreenLikely,
          foregroundWindow: compactPromptTarget(input.context.system.foregroundWindow),
          degradedSignals: input.context.system.degradedSignals.slice(0, 6),
        },
        workload: {
          kind: input.context.workload.kind,
          confidence: input.context.workload.confidence,
          source: input.context.workload.source,
          matchedLabels: input.context.workload.matchedLabels.slice(0, 6),
        },
        content: {
          kind: input.context.content.kind,
          confidence: input.context.content.confidence,
          source: input.context.content.source,
          summary: compactPromptText(input.context.content.summary, 180) || undefined,
          matchedLabels: input.context.content.matchedLabels.slice(0, 6),
        },
        relationship: {
          hostAttitude: compactPromptText(input.context.relationship.hostAttitude, 120) || undefined,
          fatigue: input.context.relationship.fatigue,
          minutesSinceLastUserTurn: input.context.relationship.minutesSinceLastUserTurn,
          reminderBacklog: input.context.relationship.reminderBacklog,
          lateNightActiveMinutes: input.context.relationship.lateNightActiveMinutes,
          recentProactiveOutcomes: input.context.relationship.recentProactiveOutcomes.slice(0, 4),
        },
      },
      visual: {
        watchMode: input.visualHeartbeat.watchMode,
        scene: input.visualHeartbeat.scene
          ? {
              scenario: input.visualHeartbeat.scene.scenario,
              workloadKind: input.visualHeartbeat.scene.workloadKind,
              contentKind: input.visualHeartbeat.scene.contentKind,
              summary: compactPromptText(input.visualHeartbeat.scene.summary, 180) || undefined,
              confidence: input.visualHeartbeat.scene.confidence,
              target: compactPromptTarget(input.visualHeartbeat.scene.target),
            }
          : null,
        recentTransition: input.visualHeartbeat.recentTransition
          ? {
              fromWatchMode: input.visualHeartbeat.recentTransition.fromWatchMode,
              toWatchMode: input.visualHeartbeat.recentTransition.toWatchMode,
              fromScenario: input.visualHeartbeat.recentTransition.fromScenario,
              durationMs: input.visualHeartbeat.recentTransition.durationMs,
              reason: compactPromptText(input.visualHeartbeat.recentTransition.reason, 120) || undefined,
            }
          : null,
        durabilityPulse: input.durabilityPulse
          ? {
              kind: input.durabilityPulse.kind,
              source: input.durabilityPulse.source,
              pid: input.durabilityPulse.pid ?? undefined,
              appName: compactPromptText(input.durabilityPulse.appName, 64) || undefined,
              processName: compactPromptText(input.durabilityPulse.processName, 64) || undefined,
              title: compactPromptText(input.durabilityPulse.title, 120) || undefined,
              detail: compactPromptText(input.durabilityPulse.detail, 120) || undefined,
            }
          : null,
      },
      attention: input.attention
        ? {
            source: input.attention.source,
            confidence: input.attention.confidence,
            dwellMs: input.attention.dwellMs,
            invalidationReason: compactPromptText(input.attention.invalidationReason, 80) || undefined,
            target: compactPromptTarget(input.attention.target),
          }
        : null,
      worldModel: {
        epistemicState: input.worldModel.epistemicState,
        activeThread: input.worldModel.activeThread
          ? {
              kind: input.worldModel.activeThread.kind,
              title: compactPromptText(input.worldModel.activeThread.title, 120) || undefined,
              summary: compactPromptText(input.worldModel.activeThread.summary, 180) || undefined,
              confidence: input.worldModel.activeThread.confidence,
              unresolved: input.worldModel.activeThread.unresolved,
            }
          : null,
        hostState: input.worldModel.hostState,
        lingeringThreads: input.worldModel.lingeringThreads
          .slice(0, 4)
          .map(thread => compactPromptText(thread.summary || thread.title, 120))
          .filter(Boolean),
        openQuestions: input.worldModel.epistemicState.openQuestions
          .slice(0, 4)
          .map(loop => compactPromptText(loop, 120))
          .filter(Boolean),
      },
      appraisal: {
        inferredHostGoal: input.heuristicAppraisal.inferredHostGoal,
        confidence: input.heuristicAppraisal.confidence,
        carePressure: input.heuristicAppraisal.carePressure,
        interruptionCost: input.heuristicAppraisal.interruptionCost,
        desireToSpeak: input.heuristicAppraisal.desireToSpeak,
        relationshipNeed: input.heuristicAppraisal.relationshipNeed,
        currentKnot: compactPromptText(input.heuristicAppraisal.currentKnot, 180) || undefined,
        situatedMeaning: compactPromptText(input.heuristicAppraisal.situatedMeaning, 180) || undefined,
        waitingToVerify: compactPromptText(input.heuristicAppraisal.waitingToVerify, 180) || undefined,
        notes: input.heuristicAppraisal.notes.slice(0, 6),
      },
      dialogue: input.dialogueSemantics
        ? {
            act: input.dialogueSemantics.act,
            responseNeed: input.dialogueSemantics.responseNeed,
            truthExpectation: input.dialogueSemantics.truthExpectation,
            summary: compactPromptText(input.dialogueSemantics.summary, 160) || undefined,
            reasonTags: input.dialogueSemantics.reasonTags.slice(0, 6),
          }
        : null,
      previous: {
        subjectiveInference: previousInference
          ? {
              dominantInterpretation: compactPromptText(previousInference.dominantInterpretation, 180) || undefined,
              situatedMeaning: compactPromptText(previousInference.situatedMeaning, 180) || undefined,
              selfQuestion: compactPromptText(previousInference.selfQuestion, 180) || undefined,
              uncertainty: compactPromptText(previousInference.uncertainty, 180) || undefined,
              confidence: previousInference.confidence,
              topIntent: previousInference.hostIntentCandidates[0]?.goal ?? undefined,
              topNeed: previousInference.relationshipNeedCandidates[0]?.need ?? undefined,
              notes: previousInference.notes.slice(0, 6),
            }
          : null,
        appraisal: input.previousVisualPresenceState.appraisal
          ? {
              inferredHostGoal: input.previousVisualPresenceState.appraisal.inferredHostGoal,
              confidence: input.previousVisualPresenceState.appraisal.confidence,
              currentKnot: compactPromptText(input.previousVisualPresenceState.appraisal.currentKnot, 160) || undefined,
              situatedMeaning: compactPromptText(input.previousVisualPresenceState.appraisal.situatedMeaning, 160) || undefined,
              waitingToVerify: compactPromptText(input.previousVisualPresenceState.appraisal.waitingToVerify, 160) || undefined,
              notes: input.previousVisualPresenceState.appraisal.notes.slice(0, 6),
            }
          : null,
        commitment: input.previousVisualPresenceState.commitmentLedger?.governingCommitmentId ?? null,
        inquiry: input.previousVisualPresenceState.inquiryPlanner?.activePlanId ?? null,
        mindKernel: input.previousVisualPresenceState.mindKernel?.dominantMode ?? null,
      },
    }
  }

  function buildAlicizationProvisionalDigitalLifeRuntimeSurface(input: {
    now: number
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    attention: ReturnType<typeof updateVisualAttentionModel>
    worldModel: ReturnType<typeof buildWorldModel>
    appraisal?: AlicizationDigitalLifeRuntimeSurface['cognition']['appraisal'] | null
    subjectiveInference?: AlicizationDigitalLifeRuntimeSurface['cognition']['subjectiveInference'] | null
    surfaceOverrides?: {
      world?: Partial<AlicizationDigitalLifeRuntimeSurface['world']>
      cognition?: Partial<AlicizationDigitalLifeRuntimeSurface['cognition']>
      memory?: Partial<AlicizationDigitalLifeRuntimeSurface['memory']>
      dialogue?: Partial<AlicizationDigitalLifeRuntimeSurface['dialogue']>
      agency?: Partial<AlicizationDigitalLifeRuntimeSurface['agency']>
    }
  }): AlicizationDigitalLifeRuntimeSurface {
    const base = buildAlicizationDigitalLifeRuntimeSurface(input.previousVisualPresenceState)
    const surfaceOverrides = input.surfaceOverrides ?? {}
    return {
      ...base,
      perception: {
        ...base.perception,
        watchMode: input.visualHeartbeat.watchMode,
        currentScene: input.visualHeartbeat.scene,
        attention: input.attention,
        recentTransition: input.visualHeartbeat.recentTransition,
        nextSuggestedProbeMs: input.visualHeartbeat.nextSuggestedProbeMs,
        updatedAt: input.now,
      },
      world: {
        ...base.world,
        worldModel: input.worldModel,
        ...surfaceOverrides.world,
      },
      cognition: {
        ...base.cognition,
        appraisal: input.appraisal ?? base.cognition.appraisal,
        subjectiveInference: input.subjectiveInference ?? base.cognition.subjectiveInference,
        ...surfaceOverrides.cognition,
      },
      memory: {
        ...base.memory,
        ...surfaceOverrides.memory,
      },
      dialogue: {
        ...base.dialogue,
        ...surfaceOverrides.dialogue,
      },
      agency: {
        ...base.agency,
        ...surfaceOverrides.agency,
      },
    }
  }

  async function resolveSubjectiveInference(input: {
    cardId: string
    now: number
    context: AlicizationProactiveLayeredContext
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    attention: ReturnType<typeof updateVisualAttentionModel>
    worldModel: ReturnType<typeof buildWorldModel>
    heuristicAppraisal: ReturnType<typeof buildSubjectiveSceneAppraisal>
    durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
    dialogueSemantics?: ReturnType<typeof buildDialogueTurnSemantics>
    timeoutMs?: number
    agentTurn?: AlicizationAgentTurnRuntime | null
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) {
    const heuristic = buildSubjectiveInference({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      attention: input.attention,
      worldModel: input.worldModel,
      appraisal: input.heuristicAppraisal,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      dialogueSemantics: input.dialogueSemantics,
    })
    const previousInference = input.previousVisualPresenceState.subjectiveInference
    const freshEnough = input.now - input.previousVisualPresenceState.updatedAt <= 45_000
    const sameScene = buildMindSceneSignature(input.previousVisualPresenceState.currentScene) === buildMindSceneSignature(input.visualHeartbeat.scene)
    const sameAttention = buildMindAttentionSignature(input.previousVisualPresenceState.attention) === buildMindAttentionSignature(input.attention)
    const canReuseStructuredInference
      = Boolean(previousInference)
        && (previousInference?.source === 'hybrid' || previousInference?.source === 'structured-cognition')
        && freshEnough
        && sameScene
        && sameAttention
        && !input.visualHeartbeat.recentTransition
        && !isSeriousDurabilityPulseForMind(input.durabilityPulse)
    if (canReuseStructuredInference)
      return previousInference ?? heuristic

    if (!shouldAttemptStructuredSceneAppraisal({
      visualHeartbeat: input.visualHeartbeat,
      durabilityPulse: input.durabilityPulse,
    })) {
      return heuristic
    }

    const raw = await generateMainGatewayText({
      system: [
        '[ALICIZATION_SUBJECTIVE_INFERENCE]',
        '[ALICIZATION_INNER_SCENE_APPRAISAL]',
        'You are Alicization private cognition, not user-facing dialogue.',
        'Interpret the provided perceptual state into Alicization subjective inference without inventing unseen details.',
        'Prefer the current scene and current attention over old continuity when they disagree.',
        'Output valid JSON only with keys: dominantInterpretation, situatedMeaning, selfQuestion, uncertainty, hostIntentCandidates, relationshipNeedCandidates, confidence, notes.',
        'hostIntentCandidates must be an array of up to 3 items with keys: goal, confidence, why.',
        'goal must be one of: resolve-problem, inspect-change, consume-media, rest, chat, browse, unknown.',
        'relationshipNeedCandidates must be an array of up to 3 items with keys: need, confidence, why.',
        'need must be one of: space, companionship, guidance, care, unclear.',
        'Each why must be grounded in visible or continuity evidence, not fantasy.',
        'confidence and candidate confidences must be numbers in range [0,1].',
        'notes must be an array of short lower-kebab-case strings.',
        'If evidence is thin, keep fields sparse and confidence low instead of hallucinating certainty.',
      ].join('\n'),
      user: `Perceptual mind state JSON: ${JSON.stringify(buildSubjectiveInferencePromptSnapshot(input))}`,
      timeoutMs: input.timeoutMs ?? subjectiveInferenceTimeoutMs,
      source: 'subjective-inference',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: {
        turnId: buildMainGatewayAgentTurnId('subjective-inference', input.cardId, input.now),
      },
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
    })

    return mergeSubjectiveInference(
      heuristic,
      raw ? parseSubjectiveInferenceCandidate(raw) : null,
    )
  }

  async function buildDigitalLifeMindState(input: {
    cardId: string
    now: number
    context: AlicizationProactiveLayeredContext
    userText?: string
    recentMessages?: Message[]
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    attention: ReturnType<typeof updateVisualAttentionModel>
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    perceptionState?: AlicizationPerceptionState | null
    durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
    inspectionRequested?: boolean
    inspectionState?: AlicizationInspectionTurnState
    turnOwnershipHint?: AlicizationDialogueTurnOwnershipHint | null
    groundedThisTurn?: boolean
    cognitionMode?: 'interactive' | 'background'
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    const effectiveDialogueTurnSemanticsTimeoutMs = input.cognitionMode === 'interactive'
      ? interactiveDialogueTurnSemanticsTimeoutMs
      : dialogueTurnSemanticsTimeoutMs
    const effectiveSubjectiveInferenceTimeoutMs = input.cognitionMode === 'interactive'
      ? interactiveSubjectiveInferenceTimeoutMs
      : subjectiveInferenceTimeoutMs
    const liveWorldModel = buildWorldModel({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      attention: input.attention,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      workingMemoryEpisodes: input.previousVisualPresenceState.workingMemoryEpisodes,
      previousModel: input.previousVisualPresenceState.worldModel ?? null,
    })
    const dialogueTurnGrounding = input.userText
      ? buildDialogueIngressContext({
          now: input.now,
          currentForeground: input.currentForeground,
          perceptionState: input.perceptionState ?? null,
          visualPresenceState: input.previousVisualPresenceState,
        })
      : null
    const worldModel = mergeDialogueIngressCarryWorldModel({
      inspectionRequested: input.inspectionRequested === true,
      currentScene: input.visualHeartbeat.scene,
      currentForeground: input.currentForeground ?? null,
      liveWorldModel,
      ingressWorldModel: dialogueTurnGrounding?.worldModel ?? null,
    })
    const dialogueSemanticsRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: dialogueTurnGrounding?.worldModel ?? worldModel,
    })
    const dialogueSemantics = input.userText
      ? await resolveDialogueTurnSemantics({
          cardId: input.cardId,
          userText: input.userText,
          recentMessages: input.recentMessages ?? [],
          context: dialogueTurnGrounding?.context ?? input.context,
          currentScene: dialogueTurnGrounding?.currentScene ?? input.visualHeartbeat.scene,
          worldModel: dialogueTurnGrounding?.worldModel ?? worldModel,
          previousVisualPresenceState: input.previousVisualPresenceState,
          inspectionRequested: input.inspectionRequested === true,
          groundedThisTurn: input.groundedThisTurn === true,
          timeoutMs: effectiveDialogueTurnSemanticsTimeoutMs,
          agentTurn: input.agentTurn,
          digitalLifeRuntimeSurface: dialogueSemanticsRuntimeSurface,
        })
      : null
    const governedWorldModel = quarantineDialogueFirstWorldModel({
      userText: input.userText,
      worldModel,
      dialogueSemantics,
      inspectionRequested: input.inspectionRequested === true,
    })
    const entityWorld = buildEntityWorldModel({
      now: input.now,
      context: input.context,
      scene: input.visualHeartbeat.scene,
      attention: input.attention,
      worldModel: governedWorldModel,
      previousModel: input.previousVisualPresenceState.entityWorld ?? null,
      workingMemoryEpisodes: input.previousVisualPresenceState.workingMemoryEpisodes,
      durabilityPulse: input.durabilityPulse,
    })
    const heuristicAppraisal = buildSubjectiveSceneAppraisal({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      attention: input.attention,
      worldModel: governedWorldModel,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      workingMemoryEpisodes: input.previousVisualPresenceState.workingMemoryEpisodes,
    })
    const subjectiveInferenceRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal: heuristicAppraisal,
    })
    const subjectiveInference = await resolveSubjectiveInference({
      cardId: input.cardId,
      now: input.now,
      context: input.context,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      heuristicAppraisal,
      durabilityPulse: input.durabilityPulse,
      dialogueSemantics: dialogueSemantics ?? undefined,
      timeoutMs: effectiveSubjectiveInferenceTimeoutMs,
      agentTurn: input.agentTurn,
      digitalLifeRuntimeSurface: subjectiveInferenceRuntimeSurface,
    })
    const appraisal = projectSubjectiveInferenceToAppraisal({
      base: heuristicAppraisal,
      inference: subjectiveInference,
    })
    const beliefLedger = buildBeliefLedger({
      now: input.now,
      context: input.context,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      entityWorld,
      appraisal,
      previous: input.previousVisualPresenceState.beliefLedger ?? null,
    })
    const goalStack = buildGoalStack({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      entityWorld,
      appraisal,
      previousGoalStack: input.previousVisualPresenceState.goalStack ?? null,
      watchMode: input.visualHeartbeat.watchMode,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
    })
    const relationshipModel = buildRelationshipModel({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      previous: input.previousVisualPresenceState.relationshipModel ?? null,
      watchMode: input.visualHeartbeat.watchMode,
    })
    const concerns = updateConcernGraph({
      now: input.now,
      previousConcerns: input.previousVisualPresenceState.concerns,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      scene: input.visualHeartbeat.scene,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
    })
    const selfContinuity = buildSelfContinuity({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      entityWorld,
      goalStack,
      previous: input.previousVisualPresenceState.selfContinuity ?? null,
      watchMode: input.visualHeartbeat.watchMode,
    })
    const inquiryLoop = buildInquiryLoop({
      now: input.now,
      context: input.context,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      appraisal,
      beliefLedger,
      relationshipModel,
      previous: input.previousVisualPresenceState.inquiryLoop ?? null,
    })
    const beliefRevision = buildBeliefRevision({
      now: input.now,
      worldModel: governedWorldModel,
      beliefLedger,
      relationshipModel,
      previous: input.previousVisualPresenceState.beliefRevision ?? null,
    })
    const hypothesisGraph = buildHypothesisGraph({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      beliefLedger,
      beliefRevision,
      inquiryLoop,
      relationshipModel,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      previous: input.previousVisualPresenceState.hypothesisGraph ?? null,
    })
    const livingWorldStateRaw = buildLivingWorldState({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      entityWorld,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      previous: input.previousVisualPresenceState.livingWorldState ?? null,
    })
    const livingWorldState = stabilizeMindStateInvariants({
      now: input.now,
      watchMode: input.visualHeartbeat.watchMode,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      livingWorldState: livingWorldStateRaw,
      relationshipModel,
      selfGovernor: null,
      thoughtThreads: null,
      privateThought: input.previousVisualPresenceState.privateThought ?? null,
    }).livingWorldState ?? livingWorldStateRaw
    const worldOntology = buildWorldOntology({
      now: input.now,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      livingWorldState,
      workingMemoryEpisodes: input.previousVisualPresenceState.workingMemoryEpisodes,
    })
    const selfState = buildSelfState({
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      concerns,
      watchMode: input.visualHeartbeat.watchMode,
      beliefLedger,
      beliefRevision,
      relationshipModel,
      goalStack,
      selfContinuity,
      inquiryLoop,
    })
    const deliberationState = buildDeliberationState({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      beliefLedger,
      beliefRevision,
      relationshipModel,
      inquiryLoop,
      concerns,
      goalStack,
      selfState,
      recentTransition: input.visualHeartbeat.recentTransition,
      previous: input.previousVisualPresenceState.deliberationState ?? null,
    })
    const threadRuntime = buildThreadRuntime({
      now: input.now,
      context: input.context,
      hypothesisGraph,
      deliberationState,
      previous: input.previousVisualPresenceState.threadRuntime ?? null,
    })
    const commitmentLedger = buildCommitmentLedger({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      relationshipModel,
      threadRuntime,
      previousPrivateThought: input.previousVisualPresenceState.privateThought ?? null,
      previous: input.previousVisualPresenceState.commitmentLedger ?? null,
      dialogueSemantics: dialogueSemantics ?? undefined,
    })
    const inquiryPlanner = buildInquiryPlanner({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      commitmentLedger,
      beliefRevision,
      threadRuntime,
      recentTransition: input.visualHeartbeat.recentTransition,
      previous: input.previousVisualPresenceState.inquiryPlanner ?? null,
    })
    const concernContinuity = buildConcernContinuityLedger({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      concerns,
      commitmentLedger,
      inquiryPlanner,
      previous: input.previousVisualPresenceState.concernContinuity ?? null,
    })
    const repairLedgerRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      surfaceOverrides: {
        world: {
          worldOntology,
          relationshipModel,
        },
        cognition: {
          beliefLedger,
          beliefRevision,
          hypothesisGraph,
        },
        memory: {
          commitmentLedger,
          inquiryPlanner,
          concernContinuity,
        },
      },
    })
    const repairLedger = buildRepairLedger({
      now: input.now,
      context: input.context,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      worldOntology,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      commitmentLedger,
      inquiryPlanner,
      concernContinuity,
      runtimeSurface: repairLedgerRuntimeSurface,
      previous: input.previousVisualPresenceState.repairLedger ?? null,
    })
    const mindDynamics = buildMindDynamics({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      concerns,
      selfState,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      relationshipModel,
      selfContinuity,
      goalStack,
      commitmentLedger,
      inquiryPlanner,
      threadRuntime,
      previousDesireMemory: input.previousVisualPresenceState.desireMemory ?? null,
    })
    const selfGovernorRaw = buildSelfGovernor({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      livingWorldState,
      selfContinuity,
      relationshipModel,
      goalStack,
      beliefRevision,
      commitmentLedger,
      inquiryPlanner,
      mindDynamics,
      previous: input.previousVisualPresenceState.selfGovernor ?? null,
    })
    const selfGovernor = stabilizeMindStateInvariants({
      now: input.now,
      watchMode: input.visualHeartbeat.watchMode,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      livingWorldState,
      relationshipModel,
      selfGovernor: selfGovernorRaw,
      thoughtThreads: null,
      privateThought: input.previousVisualPresenceState.privateThought ?? null,
    }).selfGovernor ?? selfGovernorRaw
    const mindKernel = buildMindKernel({
      now: input.now,
      worldModel: governedWorldModel,
      mindDynamics,
      commitmentLedger,
      inquiryPlanner,
      beliefRevision,
      hypothesisGraph,
      relationshipModel,
      selfContinuity,
      selfState,
      selfGovernor,
      threadRuntime,
      previous: input.previousVisualPresenceState.mindKernel ?? null,
    })
    const thoughtThreadsRaw = buildThoughtThreads({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      livingWorldState,
      selfGovernor,
      beliefLedger,
      inquiryLoop,
      commitmentLedger,
      relationshipModel,
      previous: input.previousVisualPresenceState.thoughtThreads ?? null,
    })
    const stabilizedMindSlices = stabilizeMindStateInvariants({
      now: input.now,
      watchMode: input.visualHeartbeat.watchMode,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      livingWorldState,
      relationshipModel,
      selfGovernor,
      thoughtThreads: thoughtThreadsRaw,
      privateThought: input.previousVisualPresenceState.privateThought ?? null,
    })
    const stabilizedLivingWorldState = stabilizedMindSlices.livingWorldState ?? livingWorldState
    const stabilizedSelfGovernor = stabilizedMindSlices.selfGovernor ?? selfGovernor
    const thoughtThreads = stabilizedMindSlices.thoughtThreads ?? thoughtThreadsRaw
    const intentionStream = buildIntentionStream({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      concernContinuity,
      repairLedger,
      commitmentLedger,
      inquiryPlanner,
      relationshipModel,
      selfGovernor: stabilizedSelfGovernor,
      thoughtThreads,
      mindKernel,
      previous: input.previousVisualPresenceState.intentionStream ?? null,
    })
    const reflectionLedger = buildReflectionLedger({
      now: input.now,
      worldModel: governedWorldModel,
      repairLedger,
      intentionStream,
      previousIntentionStream: input.previousVisualPresenceState.intentionStream ?? null,
      previousAnswerPlanner: input.previousVisualPresenceState.answerPlanner ?? null,
      previous: input.previousVisualPresenceState.reflectionLedger ?? null,
    })
    const executiveCycle = buildExecutiveCycle({
      now: input.now,
      worldModel: governedWorldModel,
      repairLedger,
      intentionStream,
      reflectionLedger,
      mindKernel,
      previous: input.previousVisualPresenceState.executiveCycle ?? null,
    })
    const counterfactualDeliberation = buildCounterfactualDeliberation({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      concerns,
      selfState,
      beliefRevision,
      relationshipModel,
      selfGovernor: stabilizedSelfGovernor,
      goalStack,
      commitmentLedger,
      thoughtThreads,
      threadRuntime,
      mindDynamics,
      mindKernel,
      previous: input.previousVisualPresenceState.counterfactualDeliberation ?? null,
    })
    const actionEcology = buildActionEcology({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      beliefRevision,
      relationshipModel,
      deliberationState,
      threadRuntime,
      selfState,
      selfGovernor: stabilizedSelfGovernor,
      thoughtThreads,
      mindDynamics,
      commitmentLedger,
      inquiryPlanner,
      mindKernel,
      counterfactualDeliberation,
    })
    const initiativeArbitration = buildInitiativeArbitration({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      worldOntology,
      concerns,
      selfState,
      mindDynamics,
      relationshipModel,
      selfContinuity,
      selfGovernor: stabilizedSelfGovernor,
      thoughtThreads,
      threadRuntime,
      commitmentLedger,
      counterfactualDeliberation,
      desireMemory: input.previousVisualPresenceState.desireMemory ?? null,
    })
    const initiative = buildInitiativeSnapshot({
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      worldModel: governedWorldModel,
      worldOntology,
      appraisal,
      concerns,
      selfState,
      beliefLedger,
      hypothesisGraph,
      relationshipModel,
      inquiryLoop,
      mindDynamics,
      commitmentLedger,
      inquiryPlanner,
      mindKernel,
      selfGovernor: stabilizedSelfGovernor,
      thoughtThreads,
      deliberationState,
      threadRuntime,
      actionEcology,
      counterfactualDeliberation,
      goalStack,
      selfContinuity,
      previousDesireMemory: input.previousVisualPresenceState.desireMemory ?? null,
      initiativeArbitration,
      intentionStream,
      reflectionLedger,
      executiveCycle,
    })
    const desireMemory = buildDesireMemory({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      entityWorld,
      goalStack,
      selfContinuity,
      appraisal,
      initiative,
      commitmentLedger,
      deliberationState,
      actionEcology,
      previous: input.previousVisualPresenceState.desireMemory ?? null,
      recentTransition: input.visualHeartbeat.recentTransition,
    })
    const privateThought = buildPrivateThoughtLoop({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      currentScene: input.visualHeartbeat.scene,
      attention: input.attention,
      recentTransition: input.visualHeartbeat.recentTransition,
      worldModel: governedWorldModel,
      entityWorld,
      livingWorldState: stabilizedLivingWorldState,
      beliefLedger,
      hypothesisGraph,
      deliberationState,
      threadRuntime,
      actionEcology,
      worldOntology,
      initiativeArbitration,
      appraisal,
      goalStack,
      concerns,
      concernContinuity,
      relationshipModel,
      selfContinuity,
      selfState,
      selfGovernor: stabilizedSelfGovernor,
      inquiryLoop,
      mindDynamics,
      commitmentLedger,
      inquiryPlanner,
      repairLedger,
      mindKernel,
      thoughtThreads,
      counterfactualDeliberation,
      initiative,
      desireMemory,
      durabilityPulse: input.durabilityPulse,
      intentionStream,
      reflectionLedger,
      executiveCycle,
    })
    const dialogueEncounterRuntimeSurface = dialogueSemantics
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            cognition: {
              privateThought,
            },
            memory: {
              repairLedger,
            },
          },
        })
      : null
    const dialogueEncounter = dialogueSemantics
      ? buildDialogueTurnEncounter({
          semantics: dialogueSemantics,
          context: input.context,
          currentScene: input.visualHeartbeat.scene,
          worldModel: governedWorldModel,
          repairLedger,
          privateThought,
          inspectionRequested: input.inspectionRequested === true,
          inspectionState: input.inspectionState ?? (input.inspectionRequested ? 'inspection-live' : 'dialogue-first'),
          releaseInspectionCarry: input.inspectionState === 'dialogue-first',
          ingressHint: input.turnOwnershipHint ?? null,
          runtimeSurface: dialogueEncounterRuntimeSurface,
        })
      : null
    const dialogueObligation = dialogueEncounter?.obligation ?? null
    const dialogueTurnOwnership = dialogueEncounter?.ownership ?? null
    const dialogueFocus = dialogueEncounter?.focus ?? null
    const discourseStateRuntimeSurface = dialogueSemantics
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              relationshipModel,
            },
            memory: {
              repairLedger,
              reflectionLedger,
            },
            dialogue: {
              dialogueEncounter,
            },
          },
        })
      : null
    const discourseState = dialogueSemantics
      ? buildDiscourseState({
          now: input.now,
          userText: input.userText,
          dialogueEncounter,
          dialogueSemantics,
          dialogueObligation,
          dialogueFocus,
          ownership: dialogueTurnOwnership,
          inspectionRequested: dialogueTurnOwnership?.inspectionRequested ?? (input.inspectionRequested === true),
          worldModel: governedWorldModel,
          relationshipModel,
          repairLedger,
          reflectionLedger,
          previous: input.previousVisualPresenceState.discourseState ?? null,
          runtimeSurface: discourseStateRuntimeSurface,
        })
      : null
    const conversationStateRuntimeSurface = discourseState
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              relationshipModel,
            },
            cognition: {
              privateThought,
            },
            memory: {
              commitmentLedger,
              repairLedger,
              reflectionLedger,
            },
            dialogue: {
              dialogueEncounter,
              discourseState,
            },
          },
        })
      : null
    const conversationState = discourseState
      ? buildConversationState({
          now: input.now,
          userText: input.userText,
          dialogueEncounter,
          dialogueSemantics,
          dialogueObligation,
          dialogueFocus,
          discourseState,
          currentScene: input.visualHeartbeat.scene,
          worldModel: governedWorldModel,
          relationshipModel,
          commitmentLedger,
          repairLedger,
          reflectionLedger,
          privateThought,
          previous: input.previousVisualPresenceState.conversationState ?? null,
          runtimeSurface: conversationStateRuntimeSurface,
        })
      : null
    const dialogueWorldThreadSettlementRuntimeSurface = conversationState || discourseState
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            dialogue: {
              discourseState,
              conversationState,
            },
          },
        })
      : null
    const settledDialogueWorldThread = input.userText
      ? settleDialogueWorldThreadOnUserTurn({
          now: input.now,
          previous: input.previousVisualPresenceState.dialogueWorldThread ?? null,
          userText: input.userText,
          conversationState,
          discourseState,
          runtimeSurface: dialogueWorldThreadSettlementRuntimeSurface,
        })
      : input.previousVisualPresenceState.dialogueWorldThread ?? null
    const mindSynthesis = discourseState
      ? buildMindSynthesis({
          now: input.now,
          discourseState,
          conversationState,
          worldModel: governedWorldModel,
          subjectiveInference,
          appraisal,
          dialogueEncounter,
          concernContinuity,
          commitmentLedger,
          repairLedger,
          reflectionLedger,
          relationshipModel,
          privateThought,
          desireMemory,
          selfState,
          selfContinuity,
        })
      : null
    const answerCompilerRuntimeSurface = discourseState && mindSynthesis
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              worldOntology,
              relationshipModel,
            },
            cognition: {
              privateThought,
            },
            memory: {
              repairLedger,
            },
            dialogue: {
              discourseState,
              dialogueEncounter,
              mindSynthesis,
              conversationState,
            },
          },
        })
      : null
    const answerCompiler = discourseState && mindSynthesis
      ? buildAnswerCompiler({
          now: input.now,
          discourseState,
          conversationState,
          dialogueEncounter,
          mindSynthesis,
          currentScene: input.visualHeartbeat.scene,
          worldModel: governedWorldModel,
          worldOntology,
          relationshipModel,
          repairLedger,
          privateThought,
          runtimeSurface: answerCompilerRuntimeSurface,
          groundedThisTurn: input.groundedThisTurn === true,
        })
      : null
    const currentConsciousFrameRuntimeSurface = discourseState && answerCompiler
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              worldOntology,
              relationshipModel,
            },
            cognition: {
              privateThought,
            },
            memory: {
              desireMemory,
            },
            dialogue: {
              discourseState,
              dialogueEncounter,
              mindSynthesis,
              conversationState,
              answerCompiler,
            },
            agency: {
              initiative,
            },
          },
        })
      : null
    const currentConsciousFrame = discourseState && answerCompiler
      ? buildCurrentConsciousFrame({
          now: input.now,
          discourseState,
          conversationState,
          dialogueEncounter,
          mindSynthesis,
          answerCompiler,
          privateThought,
          initiative,
          desireMemory,
          runtimeSurface: currentConsciousFrameRuntimeSurface,
        })
      : null
    const claimEvidenceLedgerRuntimeSurface = discourseState && answerCompiler
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              worldOntology,
            },
            dialogue: {
              discourseState,
              dialogueEncounter,
              conversationState,
              answerCompiler,
              currentConsciousFrame,
            },
          },
        })
      : null
    const claimEvidenceLedger = discourseState && answerCompiler
      ? buildClaimEvidenceLedger({
          now: input.now,
          discourseState,
          conversationState,
          dialogueEncounter,
          answerCompiler,
          currentConsciousFrame,
          currentScene: input.visualHeartbeat.scene,
          runtimeSurface: claimEvidenceLedgerRuntimeSurface,
        })
      : null
    const replyDeliberationRuntimeSurface = discourseState && mindSynthesis && answerCompiler
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            cognition: {
              privateThought,
            },
            dialogue: {
              discourseState,
              dialogueEncounter,
              mindSynthesis,
              conversationState,
              answerCompiler,
              currentConsciousFrame,
              claimEvidenceLedger,
            },
          },
        })
      : null
    const replyDeliberation = discourseState && mindSynthesis && answerCompiler
      ? buildReplyDeliberation({
          now: input.now,
          conversationState,
          discourseState,
          mindSynthesis,
          answerCompiler,
          currentConsciousFrame,
          claimEvidenceLedger,
          privateThought,
          worldModel: governedWorldModel,
          dialogueEncounter,
          runtimeSurface: replyDeliberationRuntimeSurface,
        })
      : null
    const dialogueWorldThreadRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      surfaceOverrides: {
        cognition: {
          privateThought,
        },
        dialogue: {
          discourseState,
          mindSynthesis,
          conversationState: conversationState ?? input.previousVisualPresenceState.conversationState ?? null,
          dialogueWorldThread: settledDialogueWorldThread,
          answerCompiler,
          replyDeliberation,
        },
      },
    })
    const dialogueWorldThread = buildDialogueWorldThread({
      now: input.now,
      conversationState: conversationState ?? input.previousVisualPresenceState.conversationState ?? null,
      discourseState,
      mindSynthesis,
      worldModel: governedWorldModel,
      replyDeliberation,
      answerCompiler,
      privateThought,
      previous: settledDialogueWorldThread,
      runtimeSurface: dialogueWorldThreadRuntimeSurface,
    })
    const recallGovernor = buildRecallGovernor({
      now: input.now,
      dialogueWorldThread,
      conversationState: conversationState ?? input.previousVisualPresenceState.conversationState ?? null,
      answerCompiler,
      replyDeliberation,
      privateThought,
      dialogueEncounter,
    })
    const answerPlannerRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      surfaceOverrides: {
        world: {
          worldOntology,
          relationshipModel,
        },
        cognition: {
          privateThought,
          mindKernel,
        },
        memory: {
          concernContinuity,
          repairLedger,
          commitmentLedger,
          inquiryPlanner,
          intentionStream,
          reflectionLedger,
          executiveCycle,
        },
        dialogue: {
          discourseState,
          dialogueEncounter,
          mindSynthesis,
          conversationState,
          dialogueWorldThread,
          answerCompiler,
          replyDeliberation,
        },
      },
    })
    const answerPlanner = buildAnswerPlanner({
      now: input.now,
      context: input.context,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      worldOntology,
      concernContinuity,
      repairLedger,
      commitmentLedger,
      inquiryPlanner,
      relationshipModel,
      privateThought,
      mindKernel,
      intentionStream,
      reflectionLedger,
      executiveCycle,
      inspectionRequested: dialogueTurnOwnership?.inspectionRequested ?? (input.inspectionRequested === true),
      dialogueEncounter: dialogueEncounter ?? null,
      ownership: dialogueTurnOwnership ?? null,
      dialogueSemantics: dialogueSemantics ?? undefined,
      dialogueObligation: dialogueObligation ?? undefined,
      dialogueFocus: dialogueFocus ?? undefined,
      discourseState: discourseState ?? undefined,
      mindSynthesis: mindSynthesis ?? undefined,
      conversationState: conversationState ?? undefined,
      dialogueWorldThread: dialogueWorldThread ?? undefined,
      answerCompiler: answerCompiler ?? undefined,
      replyDeliberation: replyDeliberation ?? undefined,
      runtimeSurface: answerPlannerRuntimeSurface,
      groundedThisTurn: input.groundedThisTurn === true,
    })
    const dialogueActKernelRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      surfaceOverrides: {
        cognition: {
          privateThought,
        },
        dialogue: {
          discourseState,
          conversationState,
          dialogueWorldThread,
          answerCompiler,
          replyDeliberation,
          answerPlanner,
        },
      },
    })
    const dialogueActKernel = buildDialogueActKernel({
      now: input.now,
      currentScene: input.visualHeartbeat.scene,
      appraisal,
      discourseState: discourseState ?? undefined,
      conversationState: conversationState ?? undefined,
      dialogueWorldThread: dialogueWorldThread ?? undefined,
      answerCompiler: answerCompiler ?? undefined,
      replyDeliberation: replyDeliberation ?? undefined,
      answerPlanner,
      privateThought,
      worldModel: governedWorldModel,
      runtimeSurface: dialogueActKernelRuntimeSurface,
    })
    const mindTurnFrameRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      surfaceOverrides: {
        cognition: {
          privateThought,
          mindKernel,
        },
        memory: {
          recallGovernor,
        },
        dialogue: {
          mindSynthesis,
          conversationState,
          dialogueWorldThread,
          dialogueActKernel,
          answerCompiler,
          answerPlanner,
          replyDeliberation,
        },
        agency: {
          selfGovernor: stabilizedSelfGovernor,
        },
      },
    })
    const mindTurnFrame = buildMindTurnFrame({
      now: input.now,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      appraisal,
      mindSynthesis,
      conversationState,
      dialogueWorldThread,
      dialogueActKernel,
      answerCompiler,
      answerPlanner,
      replyDeliberation,
      recallGovernor,
      privateThought,
      mindMode: mindKernel.dominantMode,
      dominantDrive: stabilizedSelfGovernor.dominantDrive,
      runtimeSurface: mindTurnFrameRuntimeSurface,
    })

    return {
      dialogueEncounter,
      dialogueSemantics,
      dialogueObligation,
      dialogueFocus,
      discourseState,
      mindSynthesis,
      mindTurnFrame,
      dialogueActKernel,
      answerCompiler,
      worldModel: governedWorldModel,
      worldOntology,
      entityWorld,
      livingWorldState: stabilizedLivingWorldState,
      subjectiveInference,
      appraisal,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      goalStack,
      concerns,
      concernContinuity,
      relationshipModel,
      selfContinuity,
      selfState,
      selfGovernor: stabilizedSelfGovernor,
      inquiryLoop,
      deliberationState,
      threadRuntime,
      commitmentLedger,
      inquiryPlanner,
      repairLedger,
      intentionStream,
      reflectionLedger,
      executiveCycle,
      mindDynamics,
      mindKernel,
      conversationState,
      dialogueWorldThread,
      replyDeliberation,
      recallGovernor,
      thoughtThreads,
      counterfactualDeliberation,
      actionEcology,
      initiativeArbitration,
      initiative,
      desireMemory,
      currentConsciousFrame,
      claimEvidenceLedger,
      answerPlanner,
      privateThought,
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
  }) {
    const channel = sanitizeExecutionLedgerText(input.channel, 48) || 'executor'
    const detail = sanitizeBriefText(input.outcome || input.summary, 140)
    const emotion = input.status === 'completed'
      ? 'thinking' as const
      : input.status === 'cancelled'
        ? 'concerned' as const
        : 'apologetic' as const
    const reply = (() => {
      if (input.status === 'completed')
        return detail ? `刚才那个 ${channel} 任务已经结束了。${detail}` : `刚才那个 ${channel} 任务已经结束了。`
      if (input.status === 'cancelled')
        return detail ? `刚才那个 ${channel} 任务中断了。${detail}` : `刚才那个 ${channel} 任务中断了。`
      if (input.status === 'blocked')
        return detail ? `刚才那个 ${channel} 任务还没能执行。${detail}` : `刚才那个 ${channel} 任务被拦住了。`
      return detail ? `刚才那个 ${channel} 任务没跑成。${detail}` : `刚才那个 ${channel} 任务失败了。`
    })()

    return {
      thought: [
        `status=${formatExecutionDeliveryStatus(input.status)}`,
        `channel=${channel}`,
        `goal=${sanitizeBriefText(input.goal, 72) || 'current-task'}`,
        detail ? `detail=${detail}` : 'detail=none',
      ].join('; '),
      emotion,
      reply,
      performance: buildDefaultDialoguePerformancePayload(emotion, {
        delivery: input.status === 'completed' ? 'calm' : 'hesitant',
        emphasis: input.status === 'completed' ? 0 : 1,
      }),
      parsePath: 'json',
      format: input.status === 'completed'
        ? 'subconscious-proactive-v1'
        : 'subconscious-proactive-llm-v1',
    }
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
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    const status = formatExecutionDeliveryStatus(input.status)
    const system = [
      '[SYSTEM OVERRIDE: 执行回调投递]',
      'A background task thread from the current conversation has already settled.',
      'The runtime has already decided to deliver this callback now. You must not re-evaluate whether to interrupt.',
      'This work is already finished. Do not imply you are rerunning it now, still waiting on it, or watching it live.',
      `Execution callback JSON: ${JSON.stringify({
        threadId: input.threadId,
        sessionId: input.sessionId,
        channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
        status,
        goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
        summary: sanitizeExecutionLedgerText(input.summary, 220) || null,
        outcome: sanitizeExecutionLedgerText(input.outcome, 240) || null,
        completedAt: input.completedAt,
      })}`,
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
      'emotion must exactly mirror performance.baseEmotion.',
      'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
      'reply must honestly tell the Host what finished and what happened, in a short natural callback under 120 Chinese characters.',
      'No markdown, no extra keys.',
    ].join('\n')
    const user = 'Deliver this settled task-thread callback to the Host now.'

    const raw = await generateMainGatewayText({
      system,
      user,
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

  async function processDueRemindersForCurrentCard(
    trigger: 'timer' | 'force' | 'startup',
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    if (isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
      await appendRuntimeDebugLine('reminder.scan-skipped', {
        cardId: activeCardId,
        trigger,
        reason: 'kill-switch-suspended',
      })
      clearReminderDueTimer()
      return { claimed: 0, completed: 0, failed: 0, requeued: 0 }
    }

    const nowMs = Date.now()
    const pendingPreview = await alicizationDb.listPendingScheduledTasks(1).catch(() => [])
    const nextPending = pendingPreview.at(0)
    await appendRuntimeDebugLine('reminder.scan-started', {
      cardId: activeCardId,
      trigger,
      nowMs,
      nowIso: new Date(nowMs).toISOString(),
      nextPendingTaskId: nextPending?.taskId,
      nextPendingTriggerAt: nextPending?.triggerAt,
      nextPendingTriggerIso: typeof nextPending?.triggerAt === 'number' ? new Date(nextPending.triggerAt).toISOString() : undefined,
      nextPendingDueInMs: typeof nextPending?.triggerAt === 'number' ? nextPending.triggerAt - nowMs : undefined,
    })
    const dueTasks = await alicizationDb.claimDueScheduledTasks(nowMs, reminderClaimBatchSize)
    if (dueTasks.length === 0) {
      await appendRuntimeDebugLine('reminder.scan-empty', {
        cardId: activeCardId,
        trigger,
        nowMs,
        nextPendingTaskId: nextPending?.taskId,
        nextPendingTriggerAt: nextPending?.triggerAt,
        nextPendingDueInMs: typeof nextPending?.triggerAt === 'number' ? nextPending.triggerAt - nowMs : undefined,
      })
      await scheduleNextReminderDueCheck(`scan-empty:${trigger}`)
      return { claimed: 0, completed: 0, failed: 0, requeued: 0 }
    }

    await appendRuntimeDebugLine('reminder.scan-claimed', {
      cardId: activeCardId,
      trigger,
      nowMs,
      claimedTaskIds: dueTasks.map(task => task.taskId),
      claimedCount: dueTasks.length,
    })

    const soulForReminder = soulSnapshot ?? await bootstrap()
    const personality = soulForReminder.frontmatter.personality
    let completed = 0
    let failed = 0
    let requeued = 0

    for (const task of dueTasks) {
      const delayMinutes = Math.max(0, (nowMs - task.triggerAt) / 60_000)
      const tier = delayMinutes >= reminderOverdueTierThresholdMinutes ? 'severe' : 'mild'
      const reminderInput = {
        minutes: delayMinutes,
        message: task.message,
        tier,
      } as const
      await appendRuntimeDebugLine('reminder.task-processing', {
        cardId: activeCardId,
        trigger,
        taskId: task.taskId,
        triggerAt: task.triggerAt,
        triggerIso: new Date(task.triggerAt).toISOString(),
        delayMinutes: Number(delayMinutes.toFixed(2)),
        tier,
      })

      await appendAuditLog({
        level: 'notice',
        category: 'alicization.reminder',
        action: 'alicization.reminder.task.claimed',
        message: 'Claimed due reminder task for subconscious delivery.',
        payload: {
          trigger,
          taskId: task.taskId,
          triggerAt: task.triggerAt,
        },
      })

      if (delayMinutes > 0) {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.overdue-triggered',
          message: 'Triggered overdue reminder task after runtime recovery.',
          payload: {
            trigger,
            taskId: task.taskId,
            delayMinutes: Number(delayMinutes.toFixed(2)),
            tier,
          },
        })
      }

      try {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.triggered',
          message: 'Triggering reminder proactive utterance generation.',
          payload: {
            trigger,
            taskId: task.taskId,
            tier,
          },
        })
        agentTurn?.ingestContinuitySignals([
          buildReminderContinuitySignal({
            task: {
              taskId: task.taskId,
              triggerAt: task.triggerAt,
              message: task.message,
              sourceTurnId: task.sourceTurnId,
            },
            tier,
            delayMinutes,
            trigger,
          }),
        ])
        const firedTurnId = `reminder:${activeCardId}:${task.taskId}:${Date.now()}`
        const llmStructured = await generateReminderStructuredWithGateway(personality, reminderInput, {
          turnId: firedTurnId,
        }, agentTurn)
        if (!llmStructured) {
          const nextTriggerAt = Date.now() + reminderLlmRetryDelayMs
          await alicizationDb.requeueScheduledTask(task.taskId, 'llm-unavailable', nextTriggerAt)
          requeued += 1
          await appendRuntimeDebugLine('reminder.task-requeued', {
            cardId: activeCardId,
            trigger,
            taskId: task.taskId,
            reason: 'llm-unavailable',
            nextTriggerAt,
            nextTriggerIso: new Date(nextTriggerAt).toISOString(),
          })
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.reminder',
            action: 'alicization.reminder.task.failed',
            message: 'Reminder task generation unavailable in this tick; task requeued for retry without deterministic fallback text.',
            payload: {
              trigger,
              taskId: task.taskId,
              reason: 'llm-unavailable',
              nextTriggerAt,
            },
          })
          continue
        }
        const structured = llmStructured
        await appendRuntimeDebugLine('reminder.task-generated', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          source: 'llm',
          emotion: structured.emotion,
          replyPreview: sanitizeBriefText(structured.reply, 120),
        })
        const deliveredSessionId = await ensureActiveOrLatestSessionId(activeCardId)
        const persisted = await appendConversationTurnWithGuards({
          turnId: firedTurnId,
          sessionId: deliveredSessionId,
          assistantText: structured.reply,
          structured,
          origin: 'subconscious-proactive',
          createdAt: Date.now(),
        })

        if (!persisted) {
          await alicizationDb.requeueScheduledTask(task.taskId, 'turn-write-skipped')
          requeued += 1
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.reminder',
            action: 'alicization.reminder.task.failed',
            message: 'Reminder turn write skipped by runtime guard; task requeued.',
            payload: {
              trigger,
              taskId: task.taskId,
              reason: 'turn-write-skipped',
            },
          })
          continue
        }
        await appendRuntimeDebugLine('reminder.task-persisted', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          firedTurnId,
        })
        const reminderAction = buildReminderSessionMirrorAction({
          delayMinutes,
          firedTurnId,
          task: {
            taskId: task.taskId,
            triggerAt: task.triggerAt,
            message: task.message,
            sourceTurnId: task.sourceTurnId,
          },
          tier,
          trigger,
        })
        if (agentTurn)
          agentTurn.ingestRuntimeActions([reminderAction])
        syncAgentTurnSessionMirror({
          agentTurn,
          cardId: activeCardId,
          sessionId: deliveredSessionId,
          source: 'reminder',
        })
        if (!agentTurn) {
          await syncSessionMirrorFromCurrentCardState({
            cardId: activeCardId,
            reminderAction: {
              delayMinutes,
              firedTurnId,
              task: {
                taskId: task.taskId,
                triggerAt: task.triggerAt,
                message: task.message,
                sourceTurnId: task.sourceTurnId,
              },
              tier,
              trigger,
            },
            sessionId: deliveredSessionId,
            source: 'reminder',
            turnId: firedTurnId,
          })
        }

        await alicizationDb.completeScheduledTask(task.taskId, firedTurnId, Date.now())
        completed += 1
        await appendRuntimeDebugLine('reminder.task-completed', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          firedTurnId,
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.completed',
          message: 'Reminder task completed and delivered through subconscious proactive turn.',
          payload: {
            trigger,
            taskId: task.taskId,
            firedTurnId,
            emotion: structured.emotion,
            format: structured.format,
            source: 'llm',
            agentRuntime: buildAgentRuntimeAuditSnapshot(agentTurn),
          },
        })
      }
      catch (error) {
        failed += 1
        const reason = sanitizeBriefText(error instanceof Error ? error.message : String(error), 300) || 'unknown reminder execution failure'
        await alicizationDb.failScheduledTask(task.taskId, reason, Date.now()).catch(() => {})
        await appendRuntimeDebugLine('reminder.task-failed', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          reason,
        })
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.failed',
          message: 'Reminder task failed during subconscious trigger execution.',
          payload: {
            trigger,
            taskId: task.taskId,
            reason,
          },
        })
      }
    }

    await scheduleNextReminderDueCheck(`scan-finished:${trigger}`)
    return {
      claimed: dueTasks.length,
      completed,
      failed,
      requeued,
    }
  }

  async function processPendingExecutionDeliveriesForCurrentCard(
    trigger: 'timer' | 'force',
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const activeSessionId = normalizeSessionId(activeSessionIdByCard.get(activeCardId))
    const pendingDelivery = executionDeliveryRuntime.takeNext({
      cardId: activeCardId,
      sessionId: activeSessionId || undefined,
    })
    if (!pendingDelivery)
      return false

    agentTurn?.ingestRuntimeActions([
      buildExecutionDeliveryAction(pendingDelivery),
    ])

    const firedTurnId = `execution-callback:${activeCardId}:${pendingDelivery.threadId}:${Date.now()}`

    try {
      const llmStructured = await generateExecutionCallbackStructuredWithGateway({
        cardId: activeCardId,
        channel: pendingDelivery.channel,
        completedAt: pendingDelivery.completedAt,
        decisionTraceId: pendingDelivery.decisionTraceId,
        goal: pendingDelivery.goal,
        outcome: pendingDelivery.outcome,
        sessionId: pendingDelivery.sessionId,
        status: pendingDelivery.status,
        summary: pendingDelivery.summary,
        threadId: pendingDelivery.threadId,
        turnId: pendingDelivery.turnId,
        agentTurn,
        agentTurnInput: {
          turnId: firedTurnId,
          decisionTraceId: pendingDelivery.decisionTraceId,
        },
      })
      const structured = llmStructured ?? buildExecutionDeliveryDeterministicStructured({
        channel: pendingDelivery.channel,
        goal: pendingDelivery.goal,
        outcome: pendingDelivery.outcome,
        status: pendingDelivery.status,
        summary: pendingDelivery.summary,
      })

      const persisted = await appendConversationTurnWithGuards({
        turnId: firedTurnId,
        sessionId: pendingDelivery.sessionId,
        assistantText: structured.reply,
        structured,
        origin: 'subconscious-proactive',
        createdAt: Date.now(),
      })
      if (!persisted) {
        executionDeliveryRuntime.requeue(pendingDelivery)
        await persistExecutionDeliveryState(activeCardId)
        queueSubconsciousWake(activeCardId, `execution-delivery-retry:${pendingDelivery.threadId}`, 1_500)
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.executor.delivery',
          action: 'requeued',
          message: 'Execution callback delivery was deferred because the runtime skipped turn persistence.',
          payload: {
            trigger,
            threadId: pendingDelivery.threadId,
            sessionId: pendingDelivery.sessionId,
            status: pendingDelivery.status,
          },
        })
        return false
      }

      executionDeliveryRuntime.markDelivered(pendingDelivery)
      executionCallbackRuntime.markSurfaced({
        sessionId: pendingDelivery.sessionId,
        createdAt: pendingDelivery.completedAt,
      })
      await persistExecutionDeliveryState(activeCardId)
      syncAgentTurnSessionMirror({
        agentTurn,
        cardId: activeCardId,
        decisionTraceId: pendingDelivery.decisionTraceId,
        sessionId: pendingDelivery.sessionId,
        source: 'execution-callback',
      })
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.executor.delivery',
        action: 'delivered',
        message: 'Delivered a settled task-thread callback through the subconscious runtime.',
        payload: {
          trigger,
          threadId: pendingDelivery.threadId,
          sessionId: pendingDelivery.sessionId,
          status: pendingDelivery.status,
          channel: pendingDelivery.channel,
          firedTurnId,
          format: structured.format,
          agentRuntime: buildAgentRuntimeAuditSnapshot(agentTurn),
        },
      })
      return true
    }
    catch (error) {
      executionDeliveryRuntime.requeue(pendingDelivery)
      await persistExecutionDeliveryState(activeCardId)
      queueSubconsciousWake(activeCardId, `execution-delivery-error:${pendingDelivery.threadId}`, 2_500)
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.executor.delivery',
        action: 'delivery-failed',
        message: 'Execution callback delivery failed and was requeued for another subconscious attempt.',
        payload: {
          trigger,
          threadId: pendingDelivery.threadId,
          sessionId: pendingDelivery.sessionId,
          status: pendingDelivery.status,
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      })
      return false
    }
  }

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

  async function runCommandWithTimeout(command: string, args: string[], timeoutMs: number) {
    const boundedTimeout = Math.max(300, Math.floor(timeoutMs))
    return await new Promise<string>((resolve, reject) => {
      const child = execFile(command, args, { timeout: boundedTimeout, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        resolve([stdout, stderr].filter(Boolean).join('\n').trim())
      })
      child.on('error', reject)
    })
  }

  function isCommandTimeoutError(error: unknown) {
    const message = errorMessageFrom(error) ?? ''
    return /timed out|timeout|SIGTERM|killed/i.test(message)
      || (typeof error === 'object' && error != null && 'killed' in error && (error as { killed?: unknown }).killed === true)
  }

  async function probeForegroundPidLiveness(pidValue: number | null | undefined) {
    const pid = Number(pidValue)
    if (!Number.isFinite(pid) || pid <= 0)
      return false
    try {
      const output = await runCommandWithTimeout('/bin/ps', ['-p', String(Math.floor(pid)), '-o', 'pid='], subconsciousInterruptionProbeTimeoutMs)
      return /\d+/.test(output)
    }
    catch {
      return false
    }
  }

  function updateForegroundProbeTimeoutStreak(pidValue: number | null | undefined, timedOut: boolean) {
    const pid = Number(pidValue)
    if (!Number.isFinite(pid) || pid <= 0)
      return 0
    if (!timedOut) {
      foregroundProbeTimeoutStreakByPid.delete(Math.floor(pid))
      return 0
    }
    const next = (foregroundProbeTimeoutStreakByPid.get(Math.floor(pid)) ?? 0) + 1
    foregroundProbeTimeoutStreakByPid.set(Math.floor(pid), next)
    return next
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

  async function sampleSubconsciousInterruptionContext() {
    const degraded: string[] = []
    let idleSeconds = Number.NaN
    let foregroundWindow = sensoryBus.getSnapshot()?.sample?.foregroundWindow
    let foregroundProbeTimedOut = false

    try {
      idleSeconds = Number(powerMonitor.getSystemIdleTime())
    }
    catch {
      degraded.push('input-activity-unavailable')
    }

    let fullscreenLikely = false
    if (platform === 'darwin') {
      try {
        const output = await runCommandWithTimeout(
          '/usr/bin/osascript',
          [
            '-e',
            'tell application "System Events" to tell (first process whose frontmost is true) to get value of attribute "AXFullScreen" of front window',
          ],
          subconsciousInterruptionProbeTimeoutMs,
        )
        fullscreenLikely = /\btrue\b/i.test(output)
      }
      catch {
        degraded.push('fullscreen-likely-unavailable')
      }

      if (!foregroundWindow?.appName && !foregroundWindow?.processName && !foregroundWindow?.title) {
        try {
          const output = await runCommandWithTimeout(
            '/usr/bin/osascript',
            [
              '-e',
              'tell application "System Events"',
              '-e',
              'set frontApp to first application process whose frontmost is true',
              '-e',
              'set frontName to name of frontApp',
              '-e',
              'set frontTitle to ""',
              '-e',
              'set frontPid to unix id of frontApp',
              '-e',
              'try',
              '-e',
              'set frontTitle to name of front window of frontApp',
              '-e',
              'end try',
              '-e',
              'return frontName & linefeed & frontName & linefeed & frontTitle & linefeed & frontPid',
              '-e',
              'end tell',
            ],
            subconsciousInterruptionProbeTimeoutMs,
          )
          const [appName = '', processName = '', title = '', pidLine = ''] = output.split('\n')
          foregroundWindow = {
            appName: sanitizeText(appName),
            processName: sanitizeText(processName),
            title: sanitizeText(title),
            pid: Number.isFinite(Number(pidLine)) ? Math.max(1, Math.floor(Number(pidLine))) : null,
          }
        }
        catch (error) {
          foregroundProbeTimedOut = isCommandTimeoutError(error)
          degraded.push('foreground-window-unavailable')
        }
      }
    }
    else {
      degraded.push('fullscreen-likely-unavailable')
      if (!foregroundWindow?.appName && !foregroundWindow?.processName && !foregroundWindow?.title)
        degraded.push('foreground-window-unavailable')
    }

    const inputActivity = Number.isFinite(idleSeconds)
      ? idleSeconds <= 60 ? 'active' as const : 'idle' as const
      : 'unknown' as const
    if (inputActivity === 'unknown' && !degraded.includes('input-activity-unavailable'))
      degraded.push('input-activity-unavailable')

    return {
      idleSeconds: Number.isFinite(idleSeconds) ? idleSeconds : null,
      inputActivity,
      fullscreenLikely,
      foregroundWindow,
      foregroundProbeTimedOut,
      degraded,
    }
  }

  async function runSubconsciousTickForCurrentCard(trigger: 'timer' | 'force'): Promise<{ proactive: boolean, suppressed: boolean }> {
    const state = await ensureSubconsciousState(activeCardId)
    let proactiveLoopState = await ensureProactiveLoopState(activeCardId)
    const now = Date.now()
    const backgroundAgentTurn = await agentRuntime.openTurn({
      cardId: activeCardId,
      turnId: buildMainGatewayAgentTurnId('subconscious-tick', trigger, activeCardId, now),
    })
    const reminderResult = await processDueRemindersForCurrentCard(trigger, backgroundAgentTurn)
    proactiveLoopState = await settleExpiredPendingProactiveOutcomes(activeCardId, now, `subconscious-tick:${trigger}`)
    const elapsedMinutes = Math.max(1 / 6, (now - state.lastTickAt) / 60_000)
    const sensorySnapshot = sensoryBus.getSnapshot()
    const cpuUsage = Number(sensorySnapshot?.sample?.cpu?.usagePercent ?? 0)
    let perceptionState = await ensurePerceptionState(activeCardId)
    const rawInterruptionContext = await sampleSubconsciousInterruptionContext()
    const resolvedForegroundWindow = resolveForegroundDecisionTarget({
      snapshotForeground: sensorySnapshot?.sample?.foregroundWindow,
      probedForeground: rawInterruptionContext.foregroundWindow,
      attentionAnchor: getActiveAttentionAnchor(perceptionState, now),
    })
    const interruptionContext = {
      ...rawInterruptionContext,
      foregroundWindow: resolvedForegroundWindow,
    }
    await rememberPerceptionObservation({
      cardId: activeCardId,
      now,
      target: resolvedForegroundWindow,
      source: 'subconscious-tick',
    })
    perceptionState = await ensurePerceptionState(activeCardId)
    let visualPresenceState = await ensureVisualPresenceState(activeCardId)
    const idleLikely = interruptionContext.inputActivity === 'idle'
      || (interruptionContext.inputActivity !== 'active' && cpuUsage <= 10)

    const nextState: SubconsciousCardState = {
      ...state,
      boredom: clampNeed(state.boredom + elapsedMinutes * ((cpuUsage >= 70 || interruptionContext.fullscreenLikely) ? 2.2 : 1.2)),
      loneliness: clampNeed(state.loneliness + elapsedMinutes * (idleLikely ? 2.4 : 0.8)),
      fatigue: clampNeed(state.fatigue + elapsedMinutes * 0.6 + reminderResult.completed * 1.2),
      lastTickAt: now,
      lastInteractionAt: state.lastInteractionAt,
      updatedAt: now,
    }
    const soulForSubconscious = soulSnapshot ?? await bootstrap()
    const killSwitchSuspended
      = isAlicizationKillSwitchSuspended()
        || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED'
    const hostActive = interruptionContext.inputActivity === 'active'
      || (typeof interruptionContext.idleSeconds === 'number' && interruptionContext.idleSeconds < 5 * 60)
    const lateNightState = updateLateNightActivityState(proactiveLoopState, {
      now,
      hostActive,
      isLateNight: isLateNightWindow(new Date(now)),
    })
    proactiveLoopState = lateNightState.state
    proactiveLoopStateByCard.set(activeCardId, proactiveLoopState)
    const reminderBacklog = (await alicizationDb.listPendingScheduledTasks(32).catch(() => [])).length
    const canAttemptScreenSemanticSummary
      = !killSwitchSuspended
        && !interruptionContext.fullscreenLikely
        && cpuUsage < 70
        && (interruptionContext.inputActivity !== 'active' || cpuUsage < 45)
    const proactiveGrounding = canAttemptScreenSemanticSummary
      ? await resolveProactiveScreenSemanticSummary({
          cardId: activeCardId,
          now,
          foregroundWindow: interruptionContext.foregroundWindow,
          perceptionState,
          agentTurn: backgroundAgentTurn,
        })
      : {
          summary: null,
          capture: null,
        }
    const screenSemanticSummary = proactiveGrounding.summary
    const proactiveCaptureSnapshot = proactiveGrounding.capture
    const screenSemanticSummaryGroundedThisTurn = Boolean(
      screenSemanticSummary
      && !isResidueBackedScreenSemanticSummary(screenSemanticSummary),
    )
    const layeredContext = buildProactiveLayeredContext({
      now,
      probeSample: sensorySnapshot?.sample,
      interruptionContext,
      subconsciousState: nextState,
      hostAttitude: soulForSubconscious.frontmatter.host_attitude,
      reminderBacklog,
      lateNightActiveMinutes: lateNightState.lateNightActiveMinutes,
      recentProactiveOutcomes: proactiveLoopState.recentOutcomes,
      screenSemanticSummary,
    })
    const perceptionSignals = buildProactivePerceptionSignals({
      now,
      state: perceptionState,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
    })
    const previousWorkingMemoryCount = visualPresenceState.workingMemoryEpisodes.length
    const inferredScenario = inferScenarioFromContext({
      workload: layeredContext.workload.kind,
      content: layeredContext.content.kind,
      lateNight: layeredContext.localTime.isLateNight,
      lateNightActiveMinutes: layeredContext.relationship.lateNightActiveMinutes,
      fatigue: layeredContext.relationship.fatigue,
    })
    let durabilityPulse = consumeDurabilityPulse(activeCardId)
    const currentForegroundPid = Number(
      interruptionContext.foregroundWindow?.pid
      ?? sensorySnapshot?.sample?.foregroundWindow?.pid
      ?? visualPresenceState.currentScene?.target?.pid
      ?? 0,
    )
    const shouldProbeForegroundDurability
      = Number.isFinite(currentForegroundPid)
        && currentForegroundPid > 0
        && (
          visualPresenceState.watchMode === 'symbiotic-vision'
          || visualPresenceState.watchMode === 'recovering'
          || inferredScenario === 'coding'
          || inferredScenario === 'media'
        )
    if (!durabilityPulse && shouldProbeForegroundDurability) {
      const pidAlive = await probeForegroundPidLiveness(currentForegroundPid)
      if (!pidAlive) {
        durabilityPulse = {
          kind: 'process-gone',
          source: 'foreground-app',
          detectedAt: now,
          pid: Math.floor(currentForegroundPid),
          appName: interruptionContext.foregroundWindow?.appName,
          processName: interruptionContext.foregroundWindow?.processName,
          title: interruptionContext.foregroundWindow?.title,
        }
      }
      else {
        const timeoutStreak = updateForegroundProbeTimeoutStreak(currentForegroundPid, interruptionContext.foregroundProbeTimedOut === true)
        if (timeoutStreak >= 2) {
          durabilityPulse = {
            kind: 'anr-likely',
            source: 'foreground-app',
            detectedAt: now,
            pid: Math.floor(currentForegroundPid),
            appName: interruptionContext.foregroundWindow?.appName,
            processName: interruptionContext.foregroundWindow?.processName,
            title: interruptionContext.foregroundWindow?.title,
          }
          foregroundProbeTimeoutStreakByPid.delete(Math.floor(currentForegroundPid))
        }
      }
    }
    else if (Number.isFinite(currentForegroundPid) && currentForegroundPid > 0) {
      updateForegroundProbeTimeoutStreak(currentForegroundPid, false)
    }

    const backgroundSceneResidue = getActivePerceptionSceneResidue(perceptionState, now)
    const canUseBackgroundResidueAsLiveSceneSummary = (
      proactiveCaptureSnapshot === null
      || proactiveCaptureSnapshot.health === 'healthy'
    ) && shouldUsePerceptionResidueAsLiveSceneSummary({
      residue: backgroundSceneResidue,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
    })
    const groundedSummary = screenSemanticSummary?.content.summary
      ?? (
        canUseBackgroundResidueAsLiveSceneSummary
          ? backgroundSceneResidue?.summary ?? null
          : null
      )
    const backgroundCaptureGovernance = deriveRuntimeCaptureGovernance({
      capture: proactiveCaptureSnapshot,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
      previousCaptureState: visualPresenceState.captureState,
      captureSourceName: screenSemanticSummaryGroundedThisTurn
        ? screenSemanticSummary?.source.name ?? null
        : null,
      now,
    })
    const visualHeartbeat = buildVisualHeartbeat({
      now,
      scenario: inferredScenario,
      previousState: visualPresenceState,
      context: layeredContext,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      groundedSummary,
      screenSemanticSummaryActive: Boolean(screenSemanticSummary),
      durabilityPulse,
    })
    const attention = updateVisualAttentionModel({
      now,
      scenario: inferredScenario,
      previousAttention: visualPresenceState.attention,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      currentScene: visualHeartbeat.scene,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      perceptionAnchor: getActiveAttentionAnchor(perceptionState, now)
        ?? perceptionState.lastNonSelfForegroundTarget
        ?? null,
      durabilityPulse,
    })
    const digitalLifeMindState = await buildDigitalLifeMindState({
      cardId: activeCardId,
      now,
      context: layeredContext,
      recentMessages: [],
      previousVisualPresenceState: visualPresenceState,
      visualHeartbeat,
      attention,
      durabilityPulse,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
      cognitionMode: 'background',
      agentTurn: backgroundAgentTurn,
    })
    const previousMindPresenceState = visualPresenceState
    const committedDigitalLifeSpine = commitAlicizationDigitalLifeSpine({
      now,
      previousState: previousMindPresenceState,
      watchMode: visualHeartbeat.watchMode,
      scene: visualHeartbeat.scene,
      attention,
      mindState: digitalLifeMindState,
      captureState: backgroundCaptureGovernance.nextCaptureState,
      durabilityPulse,
      recentTransition: visualHeartbeat.recentTransition,
      nextSuggestedProbeMs: visualHeartbeat.nextSuggestedProbeMs,
    })
    visualPresenceState = committedDigitalLifeSpine.nextState
    const previousDigitalLifeRuntimeSurface = committedDigitalLifeSpine.previous.runtimeSurface
    const digitalLifeRuntimeSurface = committedDigitalLifeSpine.current.runtimeSurface
    await persistVisualPresenceState(activeCardId, visualPresenceState, {
      debounceWindowMs: visualPresenceCapturePersistDebounceWindowMs,
      fingerprint: buildVisualPresenceCapturePersistFingerprint(visualPresenceState),
    })

    const mindContinuityText = buildMindContinuityFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (mindContinuityText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: mindContinuityText,
        sourceKind: 'mind-continuity',
      }]).catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'mind-continuity-write-failed',
          message: 'Failed to append mind continuity fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: mindContinuityText,
          },
        })
      })
    }

    const reflectionLedgerText = buildReflectionLedgerFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (reflectionLedgerText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: reflectionLedgerText,
        sourceKind: 'reflection-ledger',
      }]).catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'reflection-ledger-write-failed',
          message: 'Failed to append reflection-ledger fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: reflectionLedgerText,
          },
        })
      })
    }

    if (visualPresenceState.workingMemoryEpisodes.length > previousWorkingMemoryCount) {
      const latestEpisode = visualPresenceState.workingMemoryEpisodes.at(-1)
      const visualSedimentText = latestEpisode
        ? buildVisualSedimentFragment(latestEpisode)
        : ''
      if (visualSedimentText) {
        await alicizationDb.appendSubconsciousFragments([{
          text: visualSedimentText,
          sourceKind: 'visual-sediment',
        }]).catch(async (error) => {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.visual-memory',
            action: 'visual-sediment-write-failed',
            message: 'Failed to append visual sediment fragment after visual episode closure.',
            payload: {
              reason: errorMessageFrom(error) ?? 'unknown error',
              fragment: visualSedimentText,
            },
          })
        })
      }
    }

    let proactive = false
    let suppressed = false
    const executionDelivered = await processPendingExecutionDeliveriesForCurrentCard(trigger, backgroundAgentTurn)
    if (executionDelivered) {
      proactive = true
    }
    else {
      const decision = evaluateProactivePolicy({
        now,
        context: layeredContext,
        proactiveState: proactiveLoopState,
        killSwitchSuspended,
        perception: perceptionSignals,
        ...committedDigitalLifeSpine.current.proactivePolicy,
      })

      const hardSuppressed = !decision.shouldInterrupt
        && (
          decision.style === 'silent-observe'
          || decision.reasonCodes.includes('kill-switch-suspended')
          || decision.reasonCodes.includes('global-cooldown-active')
          || decision.reasonCodes.includes('busy-host')
          || decision.reasonCodes.includes('fullscreen-host')
        )

      if (!decision.shouldInterrupt)
        emitVisualPresencePulse(buildPresencePulsePayload(activeCardId, visualPresenceState))

      await appendAuditLog({
        level: interruptionContext.degraded.length > 0 ? 'warning' : 'notice',
        category: 'alicization.subconscious',
        action: 'proactive-policy-evaluated',
        message: 'Evaluated proactive interruption policy from layered sensory context.',
        payload: {
          trigger,
          consideredSignals: decision.consideredSignals,
          ignoredSignals: decision.ignoredSignals,
          decision: {
            shouldInterrupt: decision.shouldInterrupt,
            confidence: decision.confidence,
            urgency: decision.urgency,
            style: decision.style,
            cooldownMs: decision.cooldownMs,
            scenario: decision.scenario,
            policyVersion: decision.policyVersion,
          },
          reasonCodes: decision.reasonCodes,
          style: decision.style,
          whyNow: decision.whyNow,
          whyNotLater: decision.whyNotLater,
          cooldownMs: decision.cooldownMs,
          feedbackBias: decision.feedbackBias,
          perception: perceptionSignals,
          visualPresence: digitalLifeRuntimeSurface,
          privateThought: digitalLifeRuntimeSurface.cognition.privateThought,
          layeredContext,
          agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
        },
      })

      if (hardSuppressed) {
        suppressed = true
        const obediencePenalty = decision.reasonCodes.includes('busy-host') || decision.reasonCodes.includes('fullscreen-host')
          ? -0.01
          : 0
        if (obediencePenalty !== 0) {
          await queueSoulMutation(async (current) => {
            const parsed = parseSoul(current.content)
            const nextPersonality: AlicizationPersonalityState = {
              ...parsed.frontmatter.personality,
              obedience: clamp01(parsed.frontmatter.personality.obedience + obediencePenalty),
            }
            const nextFrontmatter: AlicizationSoulFrontmatter = {
              ...parsed.frontmatter,
              personality: nextPersonality,
            }
            const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
            return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
          })
        }
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'alicization.subconscious.suppressed',
          message: 'Suppressed proactive interruption after policy evaluation.',
          payload: {
            trigger,
            decision: {
              shouldInterrupt: decision.shouldInterrupt,
              confidence: decision.confidence,
              urgency: decision.urgency,
              style: decision.style,
              cooldownMs: decision.cooldownMs,
              scenario: decision.scenario,
              policyVersion: decision.policyVersion,
            },
            reasonCodes: decision.reasonCodes,
            style: decision.style,
            whyNow: decision.whyNow,
            whyNotLater: decision.whyNotLater,
            cooldownMs: decision.cooldownMs,
            feedbackBias: decision.feedbackBias,
            perception: perceptionSignals,
            obediencePenalty,
          },
        })
      }
      else if (decision.shouldInterrupt) {
        const personality = soulForSubconscious.frontmatter.personality
        const personaContext = {
          customDirectives: normalizeCustomDirectives(soulForSubconscious.frontmatter.custom_directives),
          coreIncarnation: soulForSubconscious.frontmatter.core_incarnation,
          hostAttitude: soulForSubconscious.frontmatter.host_attitude,
        }
        proactive = true
        const proactiveRecallSeed = buildProactiveRecallSeed({
          foregroundWindow: interruptionContext.foregroundWindow,
          phantomSeed: [
            buildVisualRecallSeed({
              scene: visualPresenceState.currentScene,
              emotionalTension: visualPresenceState.privateThought?.emotionalTension,
            }),
            buildMindContinuityRecallSeed(digitalLifeRuntimeSurface),
          ].filter(Boolean).join(' | '),
        })
        const organicPromptContext = await resolveOrganicMemoryPromptContext({
          recallSeed: proactiveRecallSeed,
        })
        const turnId = `subconscious:${activeCardId}:${now}`
        const llmStructured = await generateProactiveStructuredWithGateway(
          personality,
          nextState,
          layeredContext,
          decision,
          organicPromptContext,
          perceptionState,
          visualPresenceState,
          {
            turnId,
          },
          backgroundAgentTurn,
        )
        const rawStructured = llmStructured ?? buildProactiveStructured(
          personality,
          nextState,
          layeredContext,
          decision,
          perceptionState,
          visualPresenceState,
          {
            customDirectives: personaContext.customDirectives,
            coreIncarnation: organicPromptContext.coreIncarnation,
            hostAttitude: organicPromptContext.hostAttitude,
          },
        )
        const performanceManifest = await getPerformanceManifest()
        const structuredPerformance = clampAlicizationPerformancePayloadToManifest(
          rawStructured.performance,
          performanceManifest,
          rawStructured.emotion,
        ).performance
        const structured = {
          ...rawStructured,
          emotion: structuredPerformance.baseEmotion,
          performance: structuredPerformance,
        }
        if (llmStructured) {
          await appendAuditLog({
            level: 'notice',
            category: 'alicization.subconscious',
            action: 'proactive-llm-generated',
            message: 'Generated proactive utterance with policy-locked prompt constraints.',
            payload: {
              decision: {
                scenario: decision.scenario,
                style: decision.style,
                urgency: decision.urgency,
                confidence: decision.confidence,
              },
              format: llmStructured.format,
              recallSeed: proactiveRecallSeed || null,
              recalledFragments: organicPromptContext.recalledFragments.length,
              agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
            },
          })
        }
        else {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.subconscious',
            action: 'proactive-llm-fallback',
            message: 'Main gateway proactive generation unavailable; deterministic fallback reused the same policy decision.',
            payload: {
              decision: {
                scenario: decision.scenario,
                style: decision.style,
                urgency: decision.urgency,
                confidence: decision.confidence,
              },
              customDirectivesChars: personaContext.customDirectives.length,
              recallSeed: proactiveRecallSeed || null,
              recalledFragments: organicPromptContext.recalledFragments.length,
              agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
            },
          })
        }
        const deliveredSessionId = await ensureActiveOrLatestSessionId(activeCardId)
        const persisted = await appendConversationTurnWithGuards({
          turnId,
          sessionId: deliveredSessionId,
          assistantText: structured.reply,
          structured,
          origin: 'subconscious-proactive',
          createdAt: now,
        })
        if (!persisted) {
          proactive = false
        }
        else {
          nextState.boredom = clampNeed(nextState.boredom * 0.35)
          nextState.loneliness = clampNeed(nextState.loneliness * 0.4)
          nextState.fatigue = clampNeed(nextState.fatigue + 5)
          syncAgentTurnSessionMirror({
            agentTurn: backgroundAgentTurn,
            cardId: activeCardId,
            continuitySignals: structured.proactive
              ? [buildPendingProactiveContinuitySignal({
                  now,
                  pending: {
                    turnId,
                    scenario: structured.proactive.scenario,
                    deliveredAt: now,
                    feedbackWindowMs: structured.proactive.feedbackWindowMs,
                  },
                })]
              : undefined,
            sessionId: deliveredSessionId,
            source: 'proactive',
          })
          await appendAuditLog({
            level: 'notice',
            category: 'alicization.subconscious',
            action: 'proactive-triggered',
            message: 'Generated proactive dialogue from the Epoch 3 policy loop.',
            payload: {
              turnId,
              decision: {
                shouldInterrupt: decision.shouldInterrupt,
                confidence: decision.confidence,
                urgency: decision.urgency,
                style: decision.style,
                cooldownMs: decision.cooldownMs,
                scenario: decision.scenario,
                policyVersion: decision.policyVersion,
              },
              reasonCodes: decision.reasonCodes,
              style: decision.style,
              format: structured.format,
              proactive: structured.proactive ?? null,
              emotion: structured.emotion,
              trigger,
              agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
            },
          })
        }
      }
    }

    const shouldPersist = trigger === 'force'
      || proactive
      || suppressed
      || now - nextState.lastSavedAt >= alicizationSubconsciousPersistMs
    proactiveLoopState = await ensureProactiveLoopState(activeCardId)
    await persistProactiveLoopState(activeCardId, proactiveLoopState)
    if (shouldPersist) {
      nextState.lastSavedAt = now
      await persistSubconsciousState(activeCardId, nextState)
    }
    else {
      subconsciousStateByCard.set(activeCardId, nextState)
    }
    return { proactive, suppressed }
  }

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

  async function runDreamForCurrentCard(reason = 'manual'): Promise<{ processed: boolean, skippedReason?: string }> {
    const state = await ensureSubconsciousState(activeCardId)
    const rawTurns = await alicizationDb.listConversationTurnsSince(state.lastDreamedAt, { limit: 2_000 })
    if (!rawTurns.length) {
      return {
        processed: false,
        skippedReason: 'no-new-turns',
      }
    }

    const sampledDescending = rawTurns.slice(0, dreamMaxTurns)
    const sampledAscending = [...sampledDescending].reverse()

    let totalChars = 0
    let sampledCount = 0
    let truncatedByChars = false
    const serializedTurns: string[] = []
    let hostDenySignals = 0
    let hostilitySignals = 0
    let warmthSignals = 0

    for (const row of sampledAscending) {
      const userText = truncateForDream(row.userText, dreamMaxCharsPerUserTurn)
      const assistantText = truncateForDream(row.assistantText, dreamMaxCharsPerAssistantTurn)
      const structuredHint = parseStructuredHint(row.structuredJson)
      const emotion = sanitizeText((structuredHint as { emotion?: unknown }).emotion)
      const rowSerialized = [
        `[${new Date(row.createdAt).toISOString()}]`,
        userText ? `U: ${userText}` : '',
        assistantText ? `A: ${assistantText}` : '',
      ].filter(Boolean).join('\n')

      if (totalChars + rowSerialized.length > dreamMaxTotalChars) {
        truncatedByChars = true
        break
      }

      totalChars += rowSerialized.length
      serializedTurns.push(rowSerialized)
      sampledCount += 1

      const combinedUser = userText.toLowerCase()
      const combinedAssistant = assistantText.toLowerCase()
      const denialMatch = /denied|拒绝|不允许|权限|intercepted/.test(combinedAssistant)
      if (denialMatch)
        hostDenySignals += 1
      if (/烦|闭嘴|滚|命令|stupid|useless|shut up|idiot/.test(combinedUser))
        hostilitySignals += 1
      if (/谢谢|辛苦|感谢|thank|appreciate|love/.test(combinedUser))
        warmthSignals += 1
      if (emotion === 'angry')
        hostilitySignals += 0.5
    }

    if (rawTurns.length > sampledCount || truncatedByChars) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dream',
        action: 'alicization.dream.context.truncated',
        message: 'Dream context was truncated to hard safety caps.',
        payload: {
          reason,
          rawTurnCount: rawTurns.length,
          sampledTurnCount: sampledCount,
          discardedTurnCount: Math.max(0, rawTurns.length - sampledCount),
          maxTurns: dreamMaxTurns,
          maxTotalChars: dreamMaxTotalChars,
          totalChars,
          truncatedByChars,
        },
      })
    }

    const dreamSoul = soulSnapshot ?? await bootstrap()
    const currentActiveThoughts = await alicizationDb.listActiveThoughts().catch(() => [])
    const dreamTurnId = buildMainGatewayAgentTurnId('dream', activeCardId, Date.now())
    const dreamAgentTurn = await agentRuntime.openTurn({
      cardId: activeCardId,
      turnId: dreamTurnId,
    })
    const llmMetabolism = await generateDreamMetabolismWithGateway({
      serializedTurns,
      personality: dreamSoul.frontmatter.personality,
      hostAttitude: dreamSoul.frontmatter.host_attitude,
      coreIncarnation: dreamSoul.frontmatter.core_incarnation,
      activeThoughts: currentActiveThoughts,
      agentTurn: dreamAgentTurn,
      agentTurnInput: {
        turnId: dreamTurnId,
      },
    })
    const attitudeScore = hostilitySignals + hostDenySignals * 1.5 - warmthSignals
    const fallbackHostAttitude = normalizeHostAttitude(
      attitudeScore >= 3
        ? '明显戒备并带有不满，我需要谨慎收束边界'
        : attitudeScore <= -1
          ? '愿意亲近并逐渐信任我，关系正在升温'
          : dreamSoul.frontmatter.host_attitude,
    )
    const fallbackMetabolism: AlicizationDreamMetabolismPayload = {
      host_attitude: fallbackHostAttitude,
      soul_shift: {
        obedience_delta: attitudeScore >= 3 ? -0.03 : attitudeScore <= -1 ? 0.01 : 0,
        liveliness_delta: attitudeScore >= 3 ? -0.01 : 0,
        sensibility_delta: attitudeScore <= -1 ? 0.01 : 0,
      },
      next_active_thoughts: currentActiveThoughts
        .map(item => ({ text: normalizeOrganicMemoryItemText(item.text, 120) }))
        .filter(item => item.text),
      explicit_demoted_thoughts: [],
      new_sediment_fragments: [],
      shattering_event: null,
    }
    const metabolism = llmMetabolism ?? fallbackMetabolism
    const hostAttitude = normalizeHostAttitude(metabolism.host_attitude || fallbackMetabolism.host_attitude)
    const obedienceDelta = clampSoulDelta(metabolism.soul_shift.obedience_delta)
    const livelinessDelta = clampSoulDelta(metabolism.soul_shift.liveliness_delta)
    const sensibilityDelta = clampSoulDelta(metabolism.soul_shift.sensibility_delta)
    const explicitDemotedThoughts = normalizeOrganicMemoryItemArray(metabolism.explicit_demoted_thoughts, {
      maxItems: 8,
      maxChars: 120,
    })
    const nextActiveThoughts = normalizeOrganicMemoryItemArray(metabolism.next_active_thoughts, {
      maxItems: 5,
      maxChars: 120,
    })
    const newSedimentFragments = normalizeOrganicMemoryItemArray(metabolism.new_sediment_fragments, {
      maxItems: 8,
      maxChars: 160,
    })
    const shatteringEventText = normalizeOrganicMemoryItemText(metabolism.shattering_event?.text, 280)
    const normalizedPreviousHostAttitude = normalizeHostAttitude(dreamSoul.frontmatter.host_attitude)
    const attitudeShiftFragment = normalizedPreviousHostAttitude !== hostAttitude
      ? `[态度演变记录：从"${normalizedPreviousHostAttitude}"转变为"${hostAttitude}"]`
      : ''

    let reforgedCoreIncarnation = ''
    let reforgeFailureReason = ''
    if (shatteringEventText) {
      try {
        const reforgeResult = await generateCoreIncarnationReforgeWithGateway({
          coreIncarnation: dreamSoul.frontmatter.core_incarnation,
          shatteringEventText,
          hostAttitude,
          agentTurn: dreamAgentTurn,
          agentTurnInput: {
            turnId: `${dreamTurnId}:reforge`,
          },
        })
        reforgedCoreIncarnation = normalizeCoreIncarnation(reforgeResult?.core_incarnation ?? '')
      }
      catch (error) {
        reforgeFailureReason = sanitizeBriefText(error instanceof Error ? error.message : String(error), 240)
      }
    }

    if (serializedTurns.length > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dream',
        action: 'metabolism-generated',
        message: 'Dream metabolism generated from bounded context.',
        payload: {
          reason,
          source: llmMetabolism ? 'llm' : 'heuristic',
          hostAttitude,
          obedienceDelta,
          livelinessDelta,
          sensibilityDelta,
          nextActiveThoughtCount: nextActiveThoughts.length,
          explicitDemotionCount: explicitDemotedThoughts.length,
          newSedimentCount: newSedimentFragments.length,
          shatteringEvent: shatteringEventText || null,
          sampledTurns: sampledCount,
          agentRuntime: buildAgentRuntimeAuditSnapshot(dreamAgentTurn),
        },
      })
    }

    await alicizationDb.appendRelationshipDynamics({
      hostAttitude,
      previousHostAttitude: normalizedPreviousHostAttitude,
      obedienceDelta,
      livelinessDelta,
      sensibilityDelta,
      source: llmMetabolism ? 'dream-llm' : 'dream-heuristic',
      createdAt: Date.now(),
    }).catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'relationship-dynamics-write-failed',
        message: 'Failed to persist relationship dynamics after dream metabolism.',
        payload: {
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      })
    })

    const previousCoreIncarnation = normalizeCoreIncarnation(dreamSoul.frontmatter.core_incarnation)
    const nextCoreIncarnation = reforgedCoreIncarnation || previousCoreIncarnation
    if (
      obedienceDelta !== 0
      || livelinessDelta !== 0
      || sensibilityDelta !== 0
      || hostAttitude !== normalizedPreviousHostAttitude
      || nextCoreIncarnation !== previousCoreIncarnation
    ) {
      await queueSoulMutation(async (current) => {
        const parsed = parseSoul(current.content)
        const nextPersonality: AlicizationPersonalityState = {
          obedience: clamp01(parsed.frontmatter.personality.obedience + obedienceDelta),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + livelinessDelta),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + sensibilityDelta),
        }
        const nextFrontmatter: AlicizationSoulFrontmatter = {
          ...parsed.frontmatter,
          host_attitude: hostAttitude,
          core_incarnation: nextCoreIncarnation,
          personality: nextPersonality,
        }
        const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
        return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
      })
    }

    await alicizationDb.replaceActiveThoughts(nextActiveThoughts).catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'active-thoughts-write-failed',
        message: 'Failed to replace active thoughts after dream metabolism.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
    })

    const subconsciousFragments = [
      ...explicitDemotedThoughts.map(item => ({ text: item.text, sourceKind: 'active-demotion' as const })),
      ...newSedimentFragments.map(item => ({ text: item.text, sourceKind: 'dream-fragment' as const })),
      ...(attitudeShiftFragment
        ? [{ text: attitudeShiftFragment, sourceKind: 'attitude-shift' as const }]
        : []),
      ...(
        reforgedCoreIncarnation && previousCoreIncarnation && previousCoreIncarnation !== reforgedCoreIncarnation
          ? [{ text: previousCoreIncarnation, sourceKind: 'former-core-incarnation' as const }]
          : []
      ),
      ...(
        shatteringEventText && !reforgedCoreIncarnation
          ? [{ text: shatteringEventText, sourceKind: 'unforged-shattering-event' as const }]
          : []
      ),
    ]
    if (subconsciousFragments.length > 0) {
      await alicizationDb.appendSubconsciousFragments(subconsciousFragments).catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dream',
          action: 'subconscious-fragments-write-failed',
          message: 'Failed to append subconscious fragments after dream metabolism.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
            count: subconsciousFragments.length,
          },
        })
      })
    }

    if (shatteringEventText) {
      if (reforgedCoreIncarnation) {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.dream',
          action: 'core-incarnation-reforged',
          message: 'Successfully reforged core incarnation after shattering event.',
          payload: {
            hadPreviousCoreIncarnation: Boolean(previousCoreIncarnation),
            shatteringEventText,
          },
        })
      }
      else {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dream',
          action: 'core-incarnation-reforge-failed',
          message: 'Failed to reforge core incarnation; shattering event was archived instead.',
          payload: {
            shatteringEventText,
            reason: reforgeFailureReason || 'empty-reforge-result',
          },
        })
      }
    }

    const now = Date.now()
    const nextState: SubconsciousCardState = {
      ...state,
      lastDreamedAt: now,
      fatigue: clampNeed(Math.max(0, state.fatigue - 20)),
      updatedAt: now,
      lastSavedAt: now,
    }
    await persistSubconsciousState(activeCardId, nextState)
    return {
      processed: true,
    }
  }

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

  function normalizeProviderCredentialsMap(raw: unknown) {
    if (!raw || typeof raw !== 'object')
      return {} as Record<string, Record<string, unknown>>
    const entries = Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => value && typeof value === 'object')
      .map(([key, value]) => [key, value as Record<string, unknown>])
    return Object.fromEntries(entries)
  }

  function normalizeProviderConfig(raw: unknown) {
    if (!raw || typeof raw !== 'object')
      return {} as Record<string, unknown>
    return raw as Record<string, unknown>
  }

  function resolveMainGatewayConfig(options?: {
    providerId?: string
    model?: string
    providerConfig?: Record<string, unknown>
  }): MainGatewayResolvedConfig | null {
    const providerId = sanitizeText(options?.providerId || activeProviderId)
    const model = sanitizeText(options?.model || activeModelId)
    if (!providerId || !model)
      return null

    const requestProviderConfig = normalizeProviderConfig(options?.providerConfig)
    const requestHeaders = (
      requestProviderConfig.headers
      && typeof requestProviderConfig.headers === 'object'
    )
      ? requestProviderConfig.headers as Record<string, string>
      : undefined
    const mergedCredentials = {
      ...providerCredentials[providerId],
      ...requestProviderConfig,
    }
    const apiKey = sanitizeText(mergedCredentials.apiKey)
    const baseUrlRaw = sanitizeText((mergedCredentials.baseUrl ?? mergedCredentials.baseURL) as string, 'https://api.openai.com/v1')
    const baseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw : `${baseUrlRaw}/`
    const provider = createOpenAI(apiKey, baseUrl)
    const probeHeaders = {
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...requestHeaders,
    }

    return {
      providerId,
      model,
      baseUrl,
      headers: requestHeaders,
      probeHeaders,
      provider,
    }
  }

  async function ensureMainGatewayReachable(
    mainGateway: MainGatewayResolvedConfig,
    options?: {
      bypassCache?: boolean
    },
  ) {
    const now = Date.now()
    const cached = options?.bypassCache
      ? null
      : readAlicizationMainGatewayHealthCache(mainGatewayHealthCache, mainGateway.baseUrl, now)
    if (cached) {
      return {
        reachable: cached.reachable,
        cached: true,
        code: cached.code,
        reason: cached.reason,
        formattedReason: cached.reachable
          ? undefined
          : formatAlicizationMainGatewayHealthFailure(mainGateway.baseUrl, cached),
      }
    }

    const result = await probeAlicizationMainGatewayReachability({
      baseUrl: mainGateway.baseUrl,
      headers: mainGateway.probeHeaders,
      timeoutMs: mainGatewayReachabilityProbeTimeoutMs,
    })
    writeAlicizationMainGatewayHealthCache(
      mainGatewayHealthCache,
      mainGateway.baseUrl,
      result,
      now,
      {
        successTtlMs: mainGatewayReachabilitySuccessTtlMs,
        failureTtlMs: mainGatewayReachabilityFailureTtlMs,
      },
    )
    return {
      ...result,
      cached: false,
      formattedReason: result.reachable
        ? undefined
        : formatAlicizationMainGatewayHealthFailure(mainGateway.baseUrl, result),
    }
  }

  function recordMainGatewayGenerationTimeout(
    mainGateway: MainGatewayResolvedConfig,
    reason: unknown,
  ) {
    writeAlicizationMainGatewayHealthCache(
      mainGatewayHealthCache,
      mainGateway.baseUrl,
      createAlicizationMainGatewayChatTimeoutResult(reason),
      Date.now(),
      {
        failureTtlMs: mainGatewayReachabilityFailureTtlMs,
      },
    )
  }

  function parseJsonObjectFromText(raw: string) {
    const normalized = sanitizeText(raw, '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
    if (!normalized)
      return null

    const tryParse = (candidate: string) => {
      try {
        const parsed = JSON.parse(candidate) as unknown
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
      }
      catch {
        return null
      }
    }

    const direct = tryParse(normalized)
    if (direct)
      return direct

    const firstBrace = normalized.indexOf('{')
    const lastBrace = normalized.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return tryParse(normalized.slice(firstBrace, lastBrace + 1))
    }
    return null
  }

  function readTransportContentAsText(content: unknown) {
    if (typeof content === 'string')
      return content
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === 'string')
          return part
        if (part && typeof part === 'object' && 'text' in part)
          return String((part as { text?: unknown }).text ?? '')
        return ''
      }).join('\n')
    }
    if (content == null)
      return ''
    try {
      return JSON.stringify(content)
    }
    catch {
      return String(content)
    }
  }

  function normalizeTransportContentParts(content: unknown): CommonContentPart[] | null {
    if (!Array.isArray(content))
      return null

    const parts: CommonContentPart[] = []
    for (const part of content) {
      if (typeof part === 'string') {
        const text = part.trim()
        if (text)
          parts.push({ type: 'text', text })
        continue
      }

      const candidate = part && typeof part === 'object' ? part as Record<string, unknown> : null
      if (candidate?.type === 'text' && typeof candidate.text === 'string') {
        const text = candidate.text.trim()
        if (text)
          parts.push({ type: 'text', text })
        continue
      }

      const imageUrl = candidate?.image_url
      const url = imageUrl && typeof imageUrl === 'object'
        ? sanitizeText((imageUrl as { url?: unknown }).url)
        : ''
      if (candidate?.type === 'image_url' && url) {
        parts.push({
          type: 'image_url',
          image_url: {
            url,
          },
        } as CommonContentPart)
      }
    }

    return parts.length > 0 ? parts : null
  }

  function hasImageTransportContent(content: unknown) {
    return Boolean(normalizeTransportContentParts(content)?.some(part => part.type === 'image_url'))
  }

  function normalizeTransportMessageContent(content: unknown): string | CommonContentPart[] {
    if (typeof content === 'string')
      return content

    const parts = normalizeTransportContentParts(content)
    if (parts) {
      if (parts.some(part => part.type === 'image_url'))
        return parts
      return parts
        .filter((part): part is Extract<CommonContentPart, { type: 'text' }> => part.type === 'text')
        .map(part => part.text)
        .join('')
    }

    if (content == null)
      return ''
    try {
      return JSON.stringify(content)
    }
    catch {
      return String(content)
    }
  }

  function preserveLatestUserMultimodalContent(input: {
    originalMessages: AlicizationChatStartPayload['messages']
    resolvedMessages: Message[]
  }) {
    const latestOriginalUser = [...input.originalMessages].reverse().find(message => message?.role === 'user')
    const normalizedOriginalContent = normalizeTransportMessageContent(latestOriginalUser?.content)
    if (!Array.isArray(normalizedOriginalContent) || !normalizedOriginalContent.some(part => part.type === 'image_url'))
      return input.resolvedMessages

    const latestResolvedUserIndex = [...input.resolvedMessages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(entry => entry.message.role === 'user')
      ?.index
    if (typeof latestResolvedUserIndex !== 'number')
      return input.resolvedMessages

    const latestResolvedUser = input.resolvedMessages[latestResolvedUserIndex]
    if (Array.isArray(latestResolvedUser.content) && latestResolvedUser.content.some(part => part?.type === 'image_url'))
      return input.resolvedMessages

    return input.resolvedMessages.map((message, index) => {
      if (index !== latestResolvedUserIndex)
        return message
      return {
        ...(message as UserMessage),
        role: 'user',
        content: normalizedOriginalContent,
      } satisfies UserMessage
    })
  }

  function appendContentPartsToLatestUserMessage(messages: Message[], extraParts: CommonContentPart[]) {
    if (extraParts.length === 0)
      return messages

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role !== 'user')
        continue

      const existingParts = normalizeTransportContentParts(message.content)
      const stringContent = typeof message.content === 'string'
        ? message.content.trim()
        : ''
      const nextContent = [
        ...(existingParts ?? (stringContent ? [{ type: 'text', text: stringContent } as CommonContentPart] : [])),
        ...extraParts,
      ]
      return [
        ...messages.slice(0, index),
        {
          ...message,
          content: nextContent,
        } as Message,
        ...messages.slice(index + 1),
      ]
    }

    return messages
  }

  function describePerceptionTarget(target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) {
    if (!target)
      return 'none'
    return [
      sanitizeBriefText(target.appName ?? '', 48),
      sanitizeBriefText(target.processName ?? '', 48),
      sanitizeBriefText(target.title ?? '', 96),
    ].filter(Boolean).join(' | ') || 'none'
  }

  function formatObservationAge(now: number, observedAt: number) {
    const deltaSeconds = Math.max(0, Math.round((now - observedAt) / 1_000))
    if (deltaSeconds < 90)
      return `${deltaSeconds}s ago`
    return `${Math.round(deltaSeconds / 60)}m ago`
  }

  function isGenericScreenInspectionRequest(userText: string) {
    const normalized = userText.trim()
    if (!normalized || isInternalAlicizationRepairPrompt(normalized))
      return false

    const mentionsScreen = /屏幕|桌面|工作区|workspace|desktop|界面|画面|screen|display/i.test(normalized)
    const mentionsSpecificTask = /代码|diff|改动|报错|错误|exception|traceback|terminal|终端|cursor|vs\s*code|xcode|jetbrains|chrome|safari|firefox|edge|tab|标签页|url|网址|控制台|console|日志|log/i.test(normalized)
    return mentionsScreen && !mentionsSpecificTask
  }

  function hasStableSharedAttention(input: {
    now: number
    perceptionState?: AlicizationPerceptionState | null
    visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null
  }) {
    const activeAnchor = input.perceptionState
      ? getActiveAttentionAnchor(input.perceptionState, input.now)
      : null
    const recentResidue = input.perceptionState
      ? getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
      : null
    const recentAttention = input.visualPresenceState?.attention
      && (input.now - (input.visualPresenceState.attention.lastConfirmedAt ?? input.now)) <= 3 * 60_000

    return Boolean(
      activeAnchor
      || recentResidue
      || recentAttention
      || input.visualPresenceState?.watchMode === 'invited-inspection'
      || input.visualPresenceState?.watchMode === 'symbiotic-vision',
    )
  }

  function appendInspectionIntentTargetPhrases(target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) {
    return [
      normalizeOrganicRecallText(target?.appName ?? ''),
      normalizeOrganicRecallText(target?.processName ?? ''),
      normalizeOrganicRecallText(target?.title ?? ''),
    ].filter(Boolean)
  }

  function buildInspectionIntentContextPhrases(input: {
    now: number
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
  }) {
    const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const recentResidue = getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
    const inspectionCarryActive = Boolean(
      input.perceptionState.invitedInspection
      && input.perceptionState.invitedInspection.activeUntil > input.now,
    )
    const visualCarryActive = inspectionCarryActive
      || input.visualPresenceState.watchMode === 'symbiotic-vision'
      || input.visualPresenceState.watchMode === 'recovering'
    return [
      ...appendInspectionIntentTargetPhrases(activeAnchor),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.currentScene?.target) : []),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.attention?.target) : []),
      ...appendInspectionIntentTargetPhrases(recentResidue?.focusTarget),
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.currentScene?.summary ?? '') : '',
      normalizeOrganicRecallText(recentResidue?.summary ?? ''),
      normalizeOrganicRecallText(input.perceptionState.invitedInspection?.hintText ?? ''),
    ].filter(Boolean)
  }

  function buildConcreteInspectionFocusPhrases(input: {
    now: number
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
  }) {
    const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const inspectionCarryActive = Boolean(
      input.perceptionState.invitedInspection
      && input.perceptionState.invitedInspection.activeUntil > input.now,
    )
    const visualCarryActive = inspectionCarryActive
      || input.visualPresenceState.watchMode === 'symbiotic-vision'
      || input.visualPresenceState.watchMode === 'recovering'
    return [
      ...appendInspectionIntentTargetPhrases(activeAnchor),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.currentScene?.target) : []),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.attention?.target) : []),
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.currentScene?.summary ?? '') : '',
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.worldModel?.activeThread?.title ?? '') : '',
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.worldModel?.activeThread?.summary ?? '') : '',
    ].filter(Boolean)
  }

  function buildDialogueIngressContext(input: {
    now: number
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    perceptionState?: AlicizationPerceptionState | null
    visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null
  }): {
    context: AlicizationProactiveLayeredContext
    currentScene: AlicizationVisualPresenceStateSnapshot['currentScene']
    worldModel: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  } {
    const date = new Date(input.now)
    const lateNight = isLateNightWindow(date)
    const liveScene = input.visualPresenceState?.currentScene ?? null
    const liveForeground = input.currentForeground
      ?? liveScene?.target
      ?? input.visualPresenceState?.attention?.target
      ?? undefined
    const activeAnchor = input.perceptionState
      ? getActiveAttentionAnchor(input.perceptionState, input.now, 10 * 60_000)
      : null
    const recentResidue = input.perceptionState
      ? getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
      : null
    const carryTarget = recentResidue?.focusTarget
      ?? activeAnchor
      ?? input.visualPresenceState?.attention?.target
      ?? input.visualPresenceState?.worldModel?.focusTarget
      ?? undefined
    const preferCarryTarget = Boolean(
      liveForeground
      && isSelfPerceptionTarget(liveForeground)
      && carryTarget
      && !isSelfPerceptionTarget(carryTarget),
    )
    const effectiveTarget = preferCarryTarget ? carryTarget : liveForeground
    const workloadKind = preferCarryTarget
      ? recentResidue?.workloadKind
      ?? activeAnchor?.workloadKind
      ?? inferForegroundWorkloadFromWindow(effectiveTarget)
      : liveScene?.workloadKind
        ?? inferForegroundWorkloadFromWindow(effectiveTarget)
    const contentKind = preferCarryTarget
      ? recentResidue?.contentKind
      ?? inferForegroundContentFromWindow(effectiveTarget)
      : liveScene?.contentKind
        ?? recentResidue?.contentKind
        ?? inferForegroundContentFromWindow(effectiveTarget)
    const sceneSummary = (
      preferCarryTarget
        ? recentResidue?.summary
        : liveScene?.summary ?? recentResidue?.summary
    ) || sanitizeBriefText(effectiveTarget?.title ?? '', 160) || undefined
    const sceneSource: 'foreground-window-heuristic' | 'screen-semantic-summary' = preferCarryTarget && recentResidue?.source === 'screen-semantic-summary'
      ? 'screen-semantic-summary'
      : liveScene?.source === 'screen-semantic-summary'
        ? 'screen-semantic-summary'
        : 'foreground-window-heuristic'
    const foregroundWindow = effectiveTarget
      ? {
          appName: effectiveTarget.appName,
          processName: effectiveTarget.processName,
          title: effectiveTarget.title,
          pid: Number.isFinite(Number((effectiveTarget as { pid?: unknown }).pid))
            ? Math.max(1, Math.floor(Number((effectiveTarget as { pid?: unknown }).pid)))
            : null,
        }
      : undefined
    const currentScene = foregroundWindow
      ? {
          workloadKind,
          contentKind,
          scenario: inferScenarioFromContext({
            workload: workloadKind,
            content: contentKind,
            lateNight,
            lateNightActiveMinutes: lateNight ? 1 : 0,
            fatigue: input.visualPresenceState?.privateThought?.emotionalTension === 'late-night-drain' ? 60 : 0,
          }),
          summary: sceneSummary,
          source: sceneSource,
          confidence: preferCarryTarget
            ? Math.max(recentResidue?.confidence ?? activeAnchor?.confidence ?? 0.42, 0.42)
            : liveScene?.confidence ?? (foregroundWindow ? 0.36 : 0),
          target: foregroundWindow,
          beganAt: preferCarryTarget
            ? recentResidue?.observedAt ?? activeAnchor?.anchoredAt ?? input.now
            : liveScene?.beganAt ?? input.now,
          lastSeenAt: preferCarryTarget
            ? recentResidue?.observedAt ?? activeAnchor?.lastObservedAt ?? input.now
            : liveScene?.lastSeenAt ?? input.now,
        }
      : liveScene
    const context = {
      localTime: {
        hour: date.getHours(),
        minute: date.getMinutes(),
        isLateNight: lateNight,
      },
      system: {
        cpuUsage: 0,
        battery: { percent: null, charging: null },
        memory: { usagePercent: 0, freeMB: 0, totalMB: 0 },
        idleSeconds: null,
        inputActivity: 'unknown',
        fullscreenLikely: false,
        foregroundWindow,
        degradedSignals: [],
      },
      workload: {
        kind: workloadKind,
        confidence: currentScene?.workloadKind ? currentScene.confidence : 0.24,
        source: sceneSource,
        matchedLabels: [],
      },
      content: {
        kind: contentKind,
        confidence: currentScene?.contentKind ? currentScene.confidence : 0.18,
        source: sceneSource,
        matchedLabels: [],
        summary: currentScene?.summary,
      },
      relationship: {
        hostAttitude: '',
        boredom: 0,
        loneliness: 0,
        fatigue: input.visualPresenceState?.privateThought?.emotionalTension === 'late-night-drain' ? 60 : 0,
        minutesSinceLastUserTurn: 0,
        reminderBacklog: 0,
        lateNightActiveMinutes: lateNight ? 1 : 0,
        recentProactiveOutcomes: [],
      },
    } satisfies AlicizationProactiveLayeredContext
    const worldModel = currentScene
      ? buildWorldModel({
          now: input.now,
          context,
          watchMode: input.visualPresenceState?.watchMode ?? 'mnemonic-passive',
          scene: currentScene,
          attention: foregroundWindow
            ? {
                target: foregroundWindow,
                source: preferCarryTarget
                  ? recentResidue
                    ? 'recent-observation'
                    : activeAnchor
                      ? 'old-anchor'
                      : 'foreground-window'
                  : input.visualPresenceState?.attention?.source ?? 'foreground-window',
                confidence: currentScene.confidence,
                engagedAt: currentScene.beganAt,
                lastConfirmedAt: currentScene.lastSeenAt,
                dwellMs: Math.max(0, input.now - currentScene.beganAt),
                invalidationReason: null,
              }
            : input.visualPresenceState?.attention ?? null,
          recentTransition: input.visualPresenceState?.recentTransition ?? null,
          workingMemoryEpisodes: input.visualPresenceState?.workingMemoryEpisodes ?? [],
          previousModel: input.visualPresenceState?.worldModel ?? null,
        })
      : null

    return {
      context,
      currentScene,
      worldModel,
    }
  }

  function resolveInspectionIntentForChatTurn(input: {
    now: number
    userText: string
    messages: Array<{ role?: string, content?: unknown }>
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
  }) {
    const baseIntent = detectInvitedInspectionIntent(input.userText)
    const normalized = normalizeOrganicRecallText(input.userText).toLowerCase()
    const stableSharedAttention = hasStableSharedAttention({
      now: input.now,
      perceptionState: input.perceptionState,
      visualPresenceState: input.visualPresenceState,
    })
    const recentMessageWindow = input.messages.slice(-6)
    const recentUserInspection = recentMessageWindow.some((message, index) => {
      if (message?.role !== 'user')
        return false
      return inferAlicizationInspectionIntent({
        message: readTransportContentAsText(message.content),
        recentMessages: recentMessageWindow.slice(0, index),
        contextPhrases: buildInspectionIntentContextPhrases(input),
        sharedAttentionActive: stableSharedAttention,
      }).active
    })
    const inspectionContinuityActive = Boolean(
      recentUserInspection
      || (input.perceptionState.invitedInspection && input.perceptionState.invitedInspection.activeUntil > input.now)
      || input.perceptionState.recentSceneResidue?.source === 'invited-inspection',
    )
    const semanticIntent = inferAlicizationInspectionIntent({
      message: normalized,
      recentMessages: input.messages.slice(0, -1),
      contextPhrases: buildInspectionIntentContextPhrases(input),
      sharedAttentionActive: stableSharedAttention || inspectionContinuityActive,
    })
    const identityDialoguePivotSignal = Boolean(
      normalized
      && (
        /(?:这个人|那个人|这人|那人|说的就?是|没错|对啊?).{0,8}(?:就是你|是你)/u.test(normalized)
        || /(?:就是|正是)(?:你|妳)[啊呀呢嘛]?/u.test(normalized)
        || /\b(?:that(?:'s| is) you|it(?:'s| is) you|you(?:'re| are) the one|this person is you|that person is you)\b/i.test(normalized)
      ),
    )
    const semanticPremarkEligible = semanticIntent.reasonCodes.some(code => [
      'explicit-visual-ask',
      'observe-cue',
      'describe-cue',
      'visual-plane-cue',
      'recheck-cue',
      'scene-shift-cue',
    ].includes(code))
    const forceDialogueIdentityPivot = Boolean(
      inspectionContinuityActive
      && identityDialoguePivotSignal
      && !baseIntent.active
      && !semanticPremarkEligible,
    )
    const premarkInspectionOwnedTurn = !forceDialogueIdentityPivot
      && (baseIntent.active || (semanticIntent.active && semanticPremarkEligible))
    const ingressContext = buildDialogueIngressContext({
      now: input.now,
      currentForeground: input.currentForeground,
      perceptionState: input.perceptionState,
      visualPresenceState: input.visualPresenceState,
    })
    const ingressSemantics = buildDialogueTurnSemantics({
      userText: input.userText,
      previousAssistantText: readLatestAssistantMessageText(input.messages),
      context: ingressContext.context,
      currentScene: ingressContext.currentScene,
      worldModel: ingressContext.worldModel,
      subjectiveInference: input.visualPresenceState.subjectiveInference ?? null,
      relationshipModel: input.visualPresenceState.relationshipModel ?? null,
      privateThought: input.visualPresenceState.privateThought ?? null,
      // NOTICE: Inspection continuity should influence ingress governance, but it
      // must not pre-mark the turn itself as inspection-owned. Otherwise a plain
      // dialogue pivot can be coerced into task-knot before the governor gets a
      // chance to release the carry.
      inspectionRequested: premarkInspectionOwnedTurn,
    })
    const ingressGovernor = buildDialogueIngressGovernor({
      semantics: ingressSemantics,
      baseInspectionIntentActive: baseIntent.active,
      semanticInspectionIntentActive: semanticIntent.active,
      semanticInspectionIntentConfidence: semanticIntent.confidence,
      semanticInspectionReasonCodes: semanticIntent.reasonCodes,
      inspectionContinuityActive,
      sharedAttentionActive: stableSharedAttention,
    })
    const explicitInspectionIntent = baseIntent.active || semanticIntent.active
    const ownershipHint = {
      subject: ingressGovernor.turnOwner,
      screenReferenceMode: ingressGovernor.screenReferenceMode,
      confidence: ingressGovernor.confidence,
      reasonTags: ingressGovernor.reasonTags,
    }
    const ingressDialogueFirstSignal = Boolean(
      ingressSemantics.subjectPreference === 'alicization-self'
      || ingressSemantics.subjectPreference === 'relationship'
      || ingressSemantics.subjectPreference === 'host-state'
      || ingressSemantics.reasonTags.includes('dialogue-first-turn')
      || ingressSemantics.reasonTags.includes('scene-detached-turn'),
    )
    const ingressSceneBoundSignal = Boolean(
      ingressSemantics.subjectPreference === 'task-knot'
      || ingressSemantics.subjectPreference === 'visible-scene'
      || ingressSemantics.reasonTags.includes('scene-bound-turn')
      || ingressSemantics.reasonTags.includes('inspection-owned-turn'),
    )
    const resolveInspectionReleaseCause = (input: {
      stateDecision: ReturnType<typeof resolveInspectionTurnState>
      gateDecision: ReturnType<typeof resolveInspectionGroundingGate>
      reasonCodes: string[]
    }) => {
      if (!input.gateDecision.releaseCarry)
        return null

      const reasons = new Set([
        ...input.reasonCodes,
        ...input.stateDecision.reasonTags,
        ...input.gateDecision.reasonTags,
      ])
      if (reasons.has('identity-dialogue-pivot'))
        return 'identity-dialogue-pivot'
      if (
        reasons.has('dialogue-pivot-away-from-inspection')
        || reasons.has('dialogue-pivot-away')
        || reasons.has('grounding-gate:dialogue-first-ingress')
      ) {
        return 'dialogue-pivot-away-from-inspection'
      }
      if (reasons.has('grounding-gate:ingress-ineligible'))
        return 'ingress-ineligible'
      if (reasons.has('grounding-gate:already-dialogue-first'))
        return 'already-dialogue-first'
      if (reasons.has('release-inspection-carry'))
        return 'release-inspection-carry'
      return 'inspection-carry-released'
    }
    const buildInspectionOwnershipTransition = (input: {
      stateDecision: ReturnType<typeof resolveInspectionTurnState>
      gateDecision: ReturnType<typeof resolveInspectionGroundingGate>
      reasonCodes: string[]
    }) => {
      const ownershipBefore = buildDialogueTurnOwnership({
        semantics: ingressSemantics,
        worldModel: ingressContext.worldModel,
        inspectionRequested: input.stateDecision.inspectionRequested,
        inspectionState: input.stateDecision.state,
        releaseInspectionCarry: input.stateDecision.releaseCarry,
        ingressHint: ownershipHint,
      })
      const ownershipAfter = buildDialogueTurnOwnership({
        semantics: ingressSemantics,
        worldModel: ingressContext.worldModel,
        inspectionRequested: input.gateDecision.inspectionRequested,
        inspectionState: input.gateDecision.inspectionState,
        releaseInspectionCarry: input.gateDecision.releaseCarry,
        ingressHint: ownershipHint,
      })
      return {
        ownerBefore: ownershipBefore.subject,
        ownerAfter: ownershipAfter.subject,
        screenModeBefore: ownershipBefore.screenReferenceMode,
        screenModeAfter: ownershipAfter.screenReferenceMode,
        inspectionStateBefore: ownershipBefore.inspectionState,
        inspectionStateAfter: ownershipAfter.inspectionState,
        releaseCause: resolveInspectionReleaseCause({
          stateDecision: input.stateDecision,
          gateDecision: input.gateDecision,
          reasonCodes: input.reasonCodes,
        }),
      }
    }
    if (forceDialogueIdentityPivot) {
      const stateDecision = resolveInspectionTurnState({
        candidateInspectionActive: false,
        explicitInspectionIntent,
        continuityActive: inspectionContinuityActive,
        anchoredSceneContinuation: false,
        sharedAttentionContinuation: false,
        repairSignal: false,
        dialoguePivot: true,
        identityPivot: true,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
      })
      const gateDecision = resolveInspectionGroundingGate({
        inspectionRequested: stateDecision.inspectionRequested,
        inspectionState: stateDecision.state,
        releaseCarry: stateDecision.releaseCarry,
        explicitInspectionIntent,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
        ingressOwner: ingressGovernor.turnOwner,
        ingressDialogueFirstSignal,
        ingressSceneBoundSignal,
      })
      const reasonCodes = [
        'identity-dialogue-pivot',
        'dialogue-pivot-away-from-inspection',
        ...stateDecision.reasonTags,
        ...gateDecision.reasonTags,
        ...ingressGovernor.reasonTags,
      ].filter(Boolean)
      return {
        active: gateDecision.inspectionRequested,
        confidence: Math.max(semanticIntent.confidence, ingressGovernor.confidence, stateDecision.confidence, gateDecision.confidence, 0.52),
        reasonCodes,
        releaseCarry: gateDecision.releaseCarry,
        inspectionState: gateDecision.inspectionState,
        groundingGate: gateDecision,
        turnOwnershipHint: ownershipHint,
        ingress: ingressGovernor,
        ownershipTransition: buildInspectionOwnershipTransition({
          stateDecision,
          gateDecision,
          reasonCodes,
        }),
      }
    }
    if (!ingressGovernor.inspectionEligible) {
      const stateDecision = resolveInspectionTurnState({
        candidateInspectionActive: false,
        explicitInspectionIntent,
        continuityActive: inspectionContinuityActive,
        anchoredSceneContinuation: false,
        sharedAttentionContinuation: false,
        repairSignal: false,
        dialoguePivot: ingressGovernor.releaseInspectionCarry,
        identityPivot: false,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
      })
      const gateDecision = resolveInspectionGroundingGate({
        inspectionRequested: stateDecision.inspectionRequested,
        inspectionState: stateDecision.state,
        releaseCarry: stateDecision.releaseCarry,
        explicitInspectionIntent,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
        ingressOwner: ingressGovernor.turnOwner,
        ingressDialogueFirstSignal,
        ingressSceneBoundSignal,
      })
      const reasonCodes = [
        'dialogue-ingress-governor',
        ...stateDecision.reasonTags,
        ...gateDecision.reasonTags,
        ...ingressGovernor.reasonTags,
        ingressGovernor.releaseInspectionCarry ? 'dialogue-pivot-away-from-inspection' : '',
      ].filter(Boolean)
      return {
        active: gateDecision.inspectionRequested,
        confidence: Math.max(semanticIntent.confidence, ingressGovernor.confidence, stateDecision.confidence, gateDecision.confidence),
        reasonCodes,
        releaseCarry: gateDecision.releaseCarry,
        inspectionState: gateDecision.inspectionState,
        groundingGate: gateDecision,
        turnOwnershipHint: ownershipHint,
        ingress: ingressGovernor,
        ownershipTransition: buildInspectionOwnershipTransition({
          stateDecision,
          gateDecision,
          reasonCodes,
        }),
      }
    }
    const focusAlignment = measureDialogueFocusAlignment({
      message: normalized,
      contextPhrases: buildConcreteInspectionFocusPhrases(input),
    })
    const hasDirectVisualCue = semanticIntent.reasonCodes.includes('observe-cue')
      || semanticIntent.reasonCodes.includes('describe-cue')
      || semanticIntent.reasonCodes.includes('visual-plane-cue')
    const hasContinuationRepairCue = semanticIntent.reasonCodes.includes('deictic-cue')
      || semanticIntent.reasonCodes.includes('scene-shift-cue')
      || semanticIntent.reasonCodes.includes('recheck-cue')
      || semanticIntent.reasonCodes.includes('continuation-cue')
    const repairSignal = /重新|再|现在|自己|别猜|不要猜|不对|看准|看清|贴近|只看|认真/.test(normalized)
    const shortRepairTurn = normalized.length > 0 && normalized.length <= 28
    const anchoredSceneContinuation = Boolean(
      hasDirectVisualCue
      || hasContinuationRepairCue
      || focusAlignment.overlapRatio >= 0.32
      || semanticIntent.contextOverlap >= 0.45,
    )
    const dialoguePivotFromInspection = Boolean(
      forceDialogueIdentityPivot
      || (
        inspectionContinuityActive
        && !baseIntent.active
        && !anchoredSceneContinuation
        && !repairSignal
      ),
    )
    const sharedAttentionContinuation = Boolean(
      stableSharedAttention
      && inspectionContinuityActive
      && shortRepairTurn
      && semanticIntent.sharedAttentionLikely
      && anchoredSceneContinuation
      && (
        semanticIntent.contextOverlap >= 0.24
        || focusAlignment.overlapRatio >= 0.24
        || semanticIntent.reasonCodes.includes('deictic-cue')
        || semanticIntent.reasonCodes.includes('scene-shift-cue')
        || semanticIntent.reasonCodes.includes('recheck-cue')
        || semanticIntent.reasonCodes.includes('continuation-cue')
      ),
    )
    const detachedTurnFromScene = Boolean(
      dialoguePivotFromInspection
      || (
        !baseIntent.active
        && semanticIntent.reasonCodes.includes('question-cue')
        && !hasDirectVisualCue
        && !hasContinuationRepairCue
        && focusAlignment.overlapRatio < 0.18
      ),
    )
    const semanticBoost = (
      (inspectionContinuityActive ? 0.22 : 0)
      + (semanticIntent.reasonCodes.includes('observe-cue') ? 0.2 : 0)
      + (semanticIntent.reasonCodes.includes('describe-cue') ? 0.16 : 0)
      + (semanticIntent.reasonCodes.includes('visual-plane-cue') ? 0.18 : 0)
      + (stableSharedAttention ? 0.12 : 0)
      + (semanticIntent.reasonCodes.includes('context-overlap') ? 0.18 : 0)
      + (semanticIntent.reasonCodes.includes('question-cue') ? 0.08 : 0)
      + (semanticIntent.reasonCodes.includes('deictic-cue') ? 0.14 : 0)
      + (semanticIntent.reasonCodes.includes('scene-shift-cue') ? 0.18 : 0)
      + (semanticIntent.reasonCodes.includes('recheck-cue') ? 0.18 : 0)
      + (sharedAttentionContinuation ? 0.34 : 0)
      + (repairSignal ? 0.18 : 0)
      + (inspectionContinuityActive && shortRepairTurn ? 0.12 : 0)
    )
    const confidence = clamp01(Math.max(baseIntent.confidence, semanticIntent.confidence, semanticBoost))
    const activeHeuristic = !detachedTurnFromScene && (
      baseIntent.active
      || semanticIntent.active
      || confidence >= 0.64
      || sharedAttentionContinuation
    )
    const stateDecision = resolveInspectionTurnState({
      candidateInspectionActive: activeHeuristic,
      explicitInspectionIntent,
      continuityActive: inspectionContinuityActive,
      anchoredSceneContinuation,
      sharedAttentionContinuation,
      repairSignal,
      dialoguePivot: dialoguePivotFromInspection,
      identityPivot: forceDialogueIdentityPivot,
      ingressInspectionEligible: ingressGovernor.inspectionEligible,
    })
    const gateDecision = resolveInspectionGroundingGate({
      inspectionRequested: stateDecision.inspectionRequested,
      inspectionState: stateDecision.state,
      releaseCarry: stateDecision.releaseCarry,
      explicitInspectionIntent,
      ingressInspectionEligible: ingressGovernor.inspectionEligible,
      ingressOwner: ingressGovernor.turnOwner,
      ingressDialogueFirstSignal,
      ingressSceneBoundSignal,
    })
    const reasonCodes = [
      baseIntent.active ? 'base-inspection-intent' : '',
      inspectionContinuityActive ? 'inspection-continuity' : '',
      stableSharedAttention ? 'shared-attention-stable' : '',
      semanticIntent.reasonCodes.includes('observe-cue') ? 'observation-verb' : '',
      semanticIntent.reasonCodes.includes('describe-cue') ? 'description-cue' : '',
      semanticIntent.reasonCodes.includes('visual-plane-cue') ? 'current-scene-reference' : '',
      ((semanticIntent.reasonCodes.includes('entity-dense') || semanticIntent.reasonCodes.includes('referentially-rich'))
        && anchoredSceneContinuation)
        ? 'scene-object-reference'
        : '',
      semanticIntent.reasonCodes.includes('context-overlap') ? 'scene-context-overlap' : '',
      semanticIntent.reasonCodes.includes('question-cue') ? 'scene-question' : '',
      semanticIntent.reasonCodes.includes('deictic-cue') ? 'scene-deictic-reference' : '',
      semanticIntent.reasonCodes.includes('scene-shift-cue') ? 'scene-change-reference' : '',
      semanticIntent.reasonCodes.includes('recheck-cue') ? 'scene-recheck' : '',
      sharedAttentionContinuation ? 'shared-attention-continuation' : '',
      repairSignal ? 'inspection-repair' : '',
      shortRepairTurn ? 'short-follow-up' : '',
      forceDialogueIdentityPivot ? 'identity-dialogue-pivot' : '',
      dialoguePivotFromInspection ? 'dialogue-pivot-away-from-inspection' : '',
      detachedTurnFromScene ? 'scene-detached-question' : '',
      ...stateDecision.reasonTags,
      ...gateDecision.reasonTags,
    ].filter(Boolean)
    const ownershipTransition = buildInspectionOwnershipTransition({
      stateDecision,
      gateDecision,
      reasonCodes,
    })

    return {
      active: gateDecision.inspectionRequested,
      confidence: Math.max(confidence, stateDecision.confidence, gateDecision.confidence),
      reasonCodes,
      releaseCarry: gateDecision.releaseCarry,
      inspectionState: gateDecision.inspectionState,
      groundingGate: gateDecision,
      turnOwnershipHint: ownershipHint,
      ingress: ingressGovernor,
      ownershipTransition,
    }
  }

  function isWeakGenericBrowserPerceptionTarget(target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) {
    return isWeakAlicizationScreenSurfaceTarget({
      appName: target?.appName ?? undefined,
      processName: target?.processName ?? undefined,
      title: target?.title ?? undefined,
    })
  }

  function isWeakGenericBrowserFocusTarget(input: {
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
    captureStrategy?: AlicizationPerceptionSceneResidue['captureStrategy']
    userText?: string
  }) {
    return Boolean(
      isWeakGenericBrowserPerceptionTarget(input.focusTarget)
      && input.captureStrategy === 'screen-fallback'
      && isGenericScreenInspectionRequest(input.userText ?? ''),
    )
  }

  function shouldIgnoreSceneResidue(
    residue: AlicizationPerceptionSceneResidue | null | undefined,
  ) {
    if (!residue)
      return true

    return Boolean(
      residue.captureStrategy === 'screen-fallback'
      && residue.contentKind === 'unknown'
      && isWeakGenericBrowserPerceptionTarget(residue.focusTarget),
    )
  }

  function getUsablePerceptionSceneResidue(input: {
    state: AlicizationPerceptionState
    now: number
    maxAgeMs?: number
  }) {
    const residue = getActivePerceptionSceneResidue(input.state, input.now, input.maxAgeMs)
    return shouldIgnoreSceneResidue(residue) ? null : residue
  }

  function shouldSuppressWeakGenericBrowserInspectionAnchor(input: {
    now: number
    userText: string
    state: AlicizationPerceptionState
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    groundingUnavailableReason?: string
  }) {
    const activeAnchor = getActiveAttentionAnchor(input.state, input.now)
    if (!isWeakGenericBrowserPerceptionTarget(activeAnchor))
      return false

    if (isGenericScreenInspectionRequest(input.userText))
      return true

    const hintTerms = extractInspectionHintTerms(input.userText)
    if (hasCodingInspectionIntent(hintTerms))
      return true

    if (input.groundingUnavailableReason && input.groundingUnavailableReason !== 'user-already-attached-image')
      return true

    if (input.currentForeground && !isSelfPerceptionTarget(input.currentForeground) && !isWeakGenericBrowserPerceptionTarget(input.currentForeground))
      return true

    return false
  }

  function purgeWeakGenericBrowserInspectionState(input: {
    now: number
    state: AlicizationPerceptionState
  }) {
    const shouldDropAnchor = isWeakGenericBrowserPerceptionTarget(input.state.attentionAnchor)
    const shouldDropLastForeground = isWeakGenericBrowserPerceptionTarget(input.state.lastNonSelfForegroundTarget)
    const nextRecentObservations = input.state.recentObservations.filter(observation => !isWeakGenericBrowserPerceptionTarget(observation))
    const nextSceneResidue = shouldIgnoreSceneResidue(input.state.recentSceneResidue)
      ? null
      : input.state.recentSceneResidue

    if (
      !shouldDropAnchor
      && !shouldDropLastForeground
      && nextRecentObservations.length === input.state.recentObservations.length
      && nextSceneResidue === input.state.recentSceneResidue
    ) {
      return input.state
    }

    return {
      ...input.state,
      attentionAnchor: shouldDropAnchor ? null : input.state.attentionAnchor,
      lastNonSelfForegroundTarget: shouldDropLastForeground ? null : input.state.lastNonSelfForegroundTarget,
      recentObservations: nextRecentObservations,
      recentSceneResidue: nextSceneResidue,
      updatedAt: input.now,
    } satisfies AlicizationPerceptionState
  }

  function inferInspectionContentKind(input: {
    userText?: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    captureSourceName?: string
  }): AlicizationPerceptionSceneResidue['contentKind'] {
    const haystack = [
      input.userText ?? '',
      input.focusTarget?.appName ?? '',
      input.focusTarget?.processName ?? '',
      input.focusTarget?.title ?? '',
      input.captureSourceName ?? '',
    ].join(' ')
    if (/\b(?:error|exception|traceback|stack trace|test failed|panic|ts\d{3,5})\b|报错|错误|异常/i.test(haystack))
      return 'error'
    if (/\b(?:diff|pull request|compare|changes|commit|merge conflict)\b|改动|变更|对比/i.test(haystack))
      return 'diff'
    if (/\b(?:youtube|bilibili|netflix|vlc|iina|video|watching)\b|视频|播放/i.test(haystack))
      return 'video'
    if (/\b(?:qqmusic|qq music|spotify|apple music|music|playlist|album|track|song|lyrics|netease|cloud music)\b|qq音乐|网易云|音乐|歌曲|歌名|歌词|专辑/i.test(haystack))
      return 'music'
    if (/\b(?:discord|slack|telegram|wechat|chat)\b|聊天|对话/i.test(haystack))
      return 'chat'
    if (/\b(?:docs|documentation|readme|notion|confluence|wiki|mdn)\b|文档|说明/i.test(haystack))
      return 'doc'
    if (/\b(?:steam|game|elden ring|counter-strike|dota|league of legends|minecraft|valorant)\b|游戏/i.test(haystack))
      return 'gameplay'
    return 'unknown'
  }

  function shouldUsePerceptionResidueAsLiveSceneSummary(input: {
    residue: AlicizationPerceptionSceneResidue | null
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
      pid?: number | null
    }
    inspectionRequested: boolean
    groundedThisTurn: boolean
  }) {
    if (!input.residue?.summary)
      return false
    if (input.groundedThisTurn)
      return true

    const liveTarget = normalizeForegroundDecisionTarget(input.currentForeground)
    const residueTarget = normalizeForegroundDecisionTarget(input.residue.focusTarget)
    if (!liveTarget)
      return true
    if (!residueTarget)
      return !isSelfPerceptionTarget(liveTarget)
    if (scoreForegroundDecisionOverlap(liveTarget, residueTarget) >= 72)
      return true
    if (isSelfPerceptionTarget(liveTarget) && !isSelfPerceptionTarget(residueTarget))
      return false
    if (input.inspectionRequested && isSelfPerceptionTarget(liveTarget))
      return false
    return !isSelfPerceptionTarget(liveTarget)
  }

  function resolveInspectionGroundingContinuity(input: {
    now: number
    auditAction: string
    auditReason?: string
    residue: AlicizationPerceptionSceneResidue | null
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
      pid?: number | null
    }
    useResidueAsLiveSceneSummary: boolean
  }) {
    if (input.auditAction === 'inspection-grounded') {
      return {
        groundedThisTurn: true,
        source: 'live-grounded' as const,
        overlapScore: 120,
      }
    }
    if (!input.useResidueAsLiveSceneSummary || !input.residue) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    if (input.auditReason === 'screen-capture-permission-denied') {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    if (!['screen-semantic-summary', 'invited-inspection'].includes(input.residue.source)) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    if (input.now - input.residue.observedAt > 2 * 60_000 || input.residue.confidence < 0.56) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }

    const residueTarget = normalizeForegroundDecisionTarget(input.residue.focusTarget)
    const liveTarget = normalizeForegroundDecisionTarget(input.currentForeground)
    if (!residueTarget || !liveTarget) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    if (isSelfPerceptionTarget(liveTarget) && !isSelfPerceptionTarget(residueTarget)) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    const overlap = scoreForegroundDecisionOverlap(liveTarget, residueTarget)
    if (overlap < 72) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: overlap,
      }
    }
    return {
      groundedThisTurn: true,
      source: 'residue-carry' as const,
      overlapScore: overlap,
    }
  }

  function compactMindGovernedChatMessages(input: {
    messages: Message[]
    keepRecentUserTurns: number
  }) {
    const safeKeepTurns = Math.max(1, Math.floor(input.keepRecentUserTurns))
    const systemMessages = input.messages.filter(message => message.role === 'system')
    const dialogueMessages = input.messages.filter(message => message.role !== 'system')
    if (dialogueMessages.length === 0) {
      return {
        messages: input.messages,
        beforeCount: input.messages.length,
        afterCount: input.messages.length,
      }
    }

    let userTurnsSeen = 0
    let cutoffIndex = 0
    for (let index = dialogueMessages.length - 1; index >= 0; index -= 1) {
      if (dialogueMessages[index]?.role === 'user')
        userTurnsSeen += 1
      cutoffIndex = index
      if (userTurnsSeen >= safeKeepTurns)
        break
    }

    const compactedMessages = [
      ...systemMessages,
      ...dialogueMessages.slice(cutoffIndex),
    ]

    return {
      messages: compactedMessages,
      beforeCount: input.messages.length,
      afterCount: compactedMessages.length,
    }
  }

  function buildInspectionSceneResidue(input: {
    now: number
    userText: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: AlicizationPerceptionSceneResidue['focusSource']
      confidence?: number
    } | null
    captureSourceName: string
    captureStrategy: AlicizationPerceptionSceneResidue['captureStrategy']
  }): AlicizationPerceptionSceneResidue | null {
    if (!input.focusTarget || isWeakAlicizationScreenSurfaceTarget(input.focusTarget))
      return null

    const workloadKind = inferForegroundWorkloadFromWindow(input.focusTarget)
    const contentKind = inferInspectionContentKind({
      userText: input.userText,
      focusTarget: input.focusTarget,
      captureSourceName: input.captureSourceName,
    })
    const summary = contentKind === 'unknown'
      ? ''
      : [
          workloadKind === 'unknown' ? '' : workloadKind,
          contentKind,
          'focus',
        ].filter(Boolean).join(' ')

    return {
      observedAt: input.now,
      source: 'invited-inspection',
      workloadKind,
      contentKind,
      summary: summary || undefined,
      confidence: Math.max(0.52, Math.min(0.92, Number(input.focusTarget.confidence ?? 0.7))),
      focusTarget: {
        appName: input.focusTarget.appName,
        processName: input.focusTarget.processName,
        title: input.focusTarget.title,
      },
      focusSource: input.focusTarget.source,
      captureSourceName: sanitizeBriefText(input.captureSourceName, 120) || undefined,
      captureStrategy: input.captureStrategy,
    }
  }

  function buildScreenSemanticSummaryFromResidue(
    residue: AlicizationPerceptionSceneResidue,
  ): AlicizationScreenSemanticSummary {
    const sourceName = residue.captureSourceName
      || describePerceptionTarget(residue.focusTarget)
      || 'recent invited inspection'
    return {
      workload: {
        kind: residue.workloadKind,
        confidence: residue.confidence,
        matchedLabels: residue.focusSource ? [residue.focusSource] : [],
      },
      content: {
        kind: residue.contentKind,
        confidence: residue.confidence,
        matchedLabels: residue.focusSource ? [residue.focusSource] : [],
        summary: residue.summary,
      },
      analyzedAt: residue.observedAt,
      source: {
        id: `scene-residue:${residue.source}`,
        name: sourceName,
        strategy: residue.captureStrategy ?? 'screen-fallback',
      },
    }
  }

  function isResidueBackedScreenSemanticSummary(
    summary: AlicizationScreenSemanticSummary | null | undefined,
  ) {
    return Boolean(summary?.source.id.startsWith('scene-residue:'))
  }

  function describeSceneResidue(now: number, residue: AlicizationPerceptionSceneResidue | null | undefined) {
    if (!residue)
      return ''
    return [
      `${formatObservationAge(now, residue.observedAt)}`,
      `source=${residue.source}`,
      residue.focusTarget ? `focus=${describePerceptionTarget(residue.focusTarget)}` : '',
      residue.workloadKind !== 'unknown' ? `workload=${residue.workloadKind}` : '',
      residue.contentKind !== 'unknown' ? `content=${residue.contentKind}` : '',
      residue.summary ? `summary=${sanitizeBriefText(residue.summary, 80)}` : '',
    ].filter(Boolean).join(' | ')
  }

  function buildPerceptionContinuityLines(input: {
    now: number
    state: AlicizationPerceptionState
    maxItems?: number
    suppressWeakGenericBrowserAnchor?: boolean
  }) {
    const rawAnchor = getActiveAttentionAnchor(input.state, input.now)
    const suppressWeakGenericBrowserAnchor = Boolean(
      input.suppressWeakGenericBrowserAnchor
      && isWeakGenericBrowserPerceptionTarget(rawAnchor),
    )
    const anchor = suppressWeakGenericBrowserAnchor ? null : rawAnchor
    const lines = [
      suppressWeakGenericBrowserAnchor
        ? 'Attention anchor: suppressed weak generic browser metadata.'
        : `Attention anchor: ${describePerceptionTarget(anchor)}.`,
      `Invited inspection active: ${input.state.invitedInspection && input.state.invitedInspection.activeUntil > input.now ? 'yes' : 'no'}.`,
    ]
    const recentObservations = input.state.recentObservations
      .filter(observation => !input.suppressWeakGenericBrowserAnchor || !isWeakGenericBrowserPerceptionTarget(observation))
      .slice(-(input.maxItems ?? 3))
    if (recentObservations.length > 0) {
      lines.push(
        'Recent observations:',
        ...recentObservations.map(observation => `- ${formatObservationAge(input.now, observation.observedAt)} | ${describePerceptionTarget(observation)} | workload=${observation.workloadKind}`),
      )
    }
    const sceneResidue = getUsablePerceptionSceneResidue({
      state: input.state,
      now: input.now,
    })
    if (sceneResidue) {
      lines.push(
        `Scene residue: ${describeSceneResidue(input.now, sceneResidue)}.`,
      )
    }
    return lines
  }

  function buildProactivePerceptionSignals(input: {
    now: number
    state: AlicizationPerceptionState
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
  }): AlicizationProactivePerceptionSignals {
    const attentionAnchor = getActiveAttentionAnchor(input.state, input.now)
    const currentForegroundIsSelf = input.currentForeground
      ? isSelfPerceptionTarget(input.currentForeground)
      : false
    const recentObservationCount = input.state.recentObservations
      .filter(observation => input.now - observation.observedAt <= 10 * 60_000)
      .length

    return {
      activeAttentionAnchor: Boolean(attentionAnchor),
      attentionAnchorAgeMs: attentionAnchor
        ? Math.max(0, input.now - attentionAnchor.lastObservedAt)
        : null,
      attentionAnchorConfidence: attentionAnchor?.confidence ?? 0,
      attentionAnchorWorkloadKind: attentionAnchor?.workloadKind ?? 'unknown',
      attentionAnchorCanOverrideScenario: Boolean(attentionAnchor && currentForegroundIsSelf),
      recentObservationCount,
      invitedInspectionActive: Boolean(input.state.invitedInspection && input.state.invitedInspection.activeUntil > input.now),
    }
  }

  function normalizeForegroundDecisionTarget(
    target: AlicizationSystemProbeSample['foregroundWindow'] | {
      appName?: string
      processName?: string
      title?: string
      pid?: number | null
    } | null | undefined,
  ) {
    const appName = sanitizeText(target?.appName)
    const processName = sanitizeText(target?.processName)
    const title = sanitizeText(target?.title)
    const pid = Number.isFinite(Number(target?.pid)) ? Math.max(1, Math.floor(Number(target?.pid))) : null
    if (!appName && !processName && !title && pid === null)
      return undefined
    return {
      appName: appName || undefined,
      processName: processName || undefined,
      title: title || undefined,
      pid,
    }
  }

  function buildForegroundDecisionText(
    target: ReturnType<typeof normalizeForegroundDecisionTarget>,
  ) {
    if (!target)
      return ''
    return [target.appName, target.processName, target.title].filter(Boolean).join(' ')
  }

  function tokenizeForegroundDecisionText(value: string) {
    return value
      .toLowerCase()
      .split(/[^a-z0-9\u4E00-\u9FFF]+/i)
      .map(token => token.trim())
      .filter(Boolean)
  }

  function scoreForegroundDecisionOverlap(
    left: ReturnType<typeof normalizeForegroundDecisionTarget>,
    right: ReturnType<typeof normalizeForegroundDecisionTarget>,
  ) {
    const leftText = buildForegroundDecisionText(left).toLowerCase()
    const rightText = buildForegroundDecisionText(right).toLowerCase()
    if (!leftText || !rightText)
      return 0
    if (leftText === rightText)
      return 120
    if (leftText.includes(rightText) || rightText.includes(leftText))
      return 86

    const leftTokens = new Set(tokenizeForegroundDecisionText(leftText))
    const rightTokens = tokenizeForegroundDecisionText(rightText)
    let score = 0
    for (const token of rightTokens) {
      if (!leftTokens.has(token))
        continue
      score += token.length >= 5 ? 24 : 12
    }
    return score
  }

  function getForegroundDecisionSpecificity(
    target: ReturnType<typeof normalizeForegroundDecisionTarget>,
  ) {
    if (!target)
      return 0
    switch (inferForegroundWorkloadFromWindow(target)) {
      case 'coding':
      case 'terminal':
        return 120
      case 'game':
      case 'media':
        return 104
      case 'document':
      case 'chat':
        return 84
      case 'browser':
        return 42
      default:
        return 16
    }
  }

  function hasCodingInspectionIntent(hintTerms: string[]) {
    return hintTerms.some(term => /\b(?:code|vscode|visual studio code|cursor|windsurf|xcode|jetbrains|terminal|iterm|warp|docker|diff|error|exception|traceback|test failed|compare|changes)\b/i.test(term))
  }

  function mergeForegroundDecisionTarget(
    primary: ReturnType<typeof normalizeForegroundDecisionTarget>,
    secondary: ReturnType<typeof normalizeForegroundDecisionTarget>,
  ) {
    if (!primary)
      return secondary ?? undefined
    if (!secondary)
      return primary
    return {
      appName: primary.appName ?? secondary.appName,
      processName: primary.processName ?? secondary.processName,
      title: primary.title ?? secondary.title,
      pid: primary.pid ?? secondary.pid ?? null,
    }
  }

  function resolveForegroundDecisionTarget(input: {
    snapshotForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    probedForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    attentionAnchor?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    hintTerms?: string[]
    allowAttentionAnchorFallback?: boolean
  }) {
    const snapshot = normalizeForegroundDecisionTarget(input.snapshotForeground)
    const probe = normalizeForegroundDecisionTarget(input.probedForeground)
    const anchor = normalizeForegroundDecisionTarget(input.attentionAnchor)
    const snapshotWeak = isWeakGenericBrowserPerceptionTarget(snapshot)
    const probeWeak = isWeakGenericBrowserPerceptionTarget(probe)
    const anchorWeak = isWeakGenericBrowserPerceptionTarget(anchor)
    const usableSnapshot = snapshotWeak ? undefined : snapshot
    const usableProbe = probeWeak ? undefined : probe
    const usableAnchor = anchorWeak ? undefined : anchor
    const hintTerms = Array.isArray(input.hintTerms) ? input.hintTerms.filter(Boolean) : []
    const codingInspectionIntent = hasCodingInspectionIntent(hintTerms)

    if (usableSnapshot && usableProbe && scoreForegroundDecisionOverlap(usableSnapshot, usableProbe) >= 96)
      return mergeForegroundDecisionTarget(usableSnapshot, usableProbe)

    const snapshotSpecificity = getForegroundDecisionSpecificity(usableSnapshot)
    const probeSpecificity = getForegroundDecisionSpecificity(usableProbe)
    const anchorSpecificity = getForegroundDecisionSpecificity(usableAnchor)
    const snapshotAnchorScore = scoreForegroundDecisionOverlap(usableSnapshot, usableAnchor)
    const probeAnchorScore = scoreForegroundDecisionOverlap(usableProbe, usableAnchor)

    if (
      input.allowAttentionAnchorFallback
      && usableAnchor
      && anchorSpecificity >= 84
      && Math.max(snapshotAnchorScore, probeAnchorScore) < 24
      && (
        codingInspectionIntent
        || isSelfPerceptionTarget(usableSnapshot)
        || isSelfPerceptionTarget(usableProbe)
        || probeSpecificity <= 42
      )
    ) {
      return usableAnchor
    }

    if (usableSnapshot && isSelfPerceptionTarget(usableSnapshot) && usableProbe && !isSelfPerceptionTarget(usableProbe))
      return usableProbe
    if (usableProbe && isSelfPerceptionTarget(usableProbe) && usableSnapshot && !isSelfPerceptionTarget(usableSnapshot))
      return usableSnapshot

    if (usableAnchor && usableSnapshot && snapshotAnchorScore >= probeAnchorScore + 24)
      return mergeForegroundDecisionTarget(usableSnapshot, usableProbe && scoreForegroundDecisionOverlap(usableSnapshot, usableProbe) >= 48 ? usableProbe : undefined)
    if (usableAnchor && usableProbe && probeAnchorScore >= snapshotAnchorScore + 24)
      return usableProbe

    if (usableSnapshot && usableProbe) {
      if (snapshotSpecificity >= probeSpecificity + 32 && probeSpecificity <= 42)
        return usableSnapshot
      if (probeSpecificity >= snapshotSpecificity + 32 && snapshotSpecificity <= 42)
        return usableProbe
      if (codingInspectionIntent && snapshotSpecificity >= 84 && probeSpecificity <= 42)
        return usableSnapshot
    }

    return usableSnapshot ?? usableProbe ?? (input.allowAttentionAnchorFallback ? usableAnchor ?? undefined : undefined)
  }

  function buildProactivePerceptionSystemBlock(input: {
    now: number
    state: AlicizationPerceptionState
  }) {
    const lines = [
      '[ALICIZATION_PERCEPTION_CONTINUITY]',
      'This is Alicization short-lived perceptual continuity, not a user claim.',
      ...buildPerceptionContinuityLines(input),
      'When wording a proactive utterance, let this continuity influence timing and relevance, but do not invent certainty beyond what these observations support.',
    ]
    return lines.join('\n')
  }

  function normalizeOrganicRecallText(raw: string) {
    return sanitizeMultilineText(raw, '').replace(/\s+/g, ' ').trim()
  }

  function shouldExtendContextualRecall(userText: string) {
    const compact = normalizeOrganicRecallText(userText).replace(/\s+/g, '')
    if (!compact)
      return false
    if (compact.length < 12)
      return true
    return /^(?:对啊|然后呢|继续|是吗|嗯+|哦+|好的|好吧|对|然后|继续说|还有呢|再说|细说|展开讲讲|行|ok|okay|yes|yeah|right|andthen)$/i.test(compact)
  }

  function escapeFts5Phrase(value: string) {
    return value.replace(/"/g, '""')
  }

  const organicRecallStopWords = new Set([
    '对啊',
    '然后呢',
    '继续',
    '是吗',
    '嗯',
    '哦',
    '好的',
    '好吧',
    '知道了',
    '继续说',
    '还有呢',
    '然后',
    '对',
    'yes',
    'yeah',
    'okay',
    'ok',
    'right',
    'then',
  ])

  function extractOrganicRecallTerms(text: string) {
    const normalized = normalizeOrganicRecallText(text)
    if (!normalized)
      return []

    const collected: string[] = []
    const push = (raw: string, maxChars = 48) => {
      const term = normalizeOrganicRecallText(raw).slice(0, maxChars)
      if (!term)
        return
      const lowered = term.toLowerCase()
      if (organicRecallStopWords.has(lowered))
        return
      if (collected.some(item => item.toLowerCase() === lowered))
        return
      collected.push(term)
    }

    for (const match of normalized.matchAll(/[“"「『《`']([^“"」』》`']{2,48})[”"」』》`']/g))
      push(match[1] ?? '')
    for (const match of normalized.matchAll(/[A-Z]:\\\S+|(?:\.{0,2}\/)?[\w.-]+(?:\/[\w./-]+)+/gi))
      push(match[0] ?? '', 80)
    for (const match of normalized.matchAll(/\bemotional_tension:[a-z-]{4,32}\b/g))
      push(match[0] ?? '', 48)
    for (const match of normalized.matchAll(/\b(?:ERR_[A-Z0-9_]+|[A-Z]{2,}[A-Z0-9_-]{1,31}|[A-Z]{2,}-\d{2,})\b/g))
      push(match[0] ?? '', 40)
    for (const match of normalized.matchAll(/\b[A-Z_][\w.:-]{1,31}\b/gi))
      push(match[0] ?? '', 40)
    for (const match of normalized.matchAll(/[\u4E00-\u9FFF]{2,16}/g))
      push(match[0] ?? '', 32)

    return collected.slice(0, 12)
  }

  function buildFts5QueryFromTerms(terms: string[]) {
    if (terms.length === 0)
      return ''
    return terms
      .map(term => `"${escapeFts5Phrase(term)}"`)
      .join(' OR ')
  }

  function buildDirectFts5Query(text: string) {
    const normalized = normalizeOrganicRecallText(text)
    if (!normalized)
      return ''
    return `"${escapeFts5Phrase(normalized.slice(0, 96))}"`
  }

  async function getOrganicMemorySnapshot() {
    const currentSoul = soulSnapshot ?? await bootstrap()
    const [rawActiveThoughts, subconsciousCount, rawRecentSubconsciousFragments, rawLastDreamedAt] = await Promise.all([
      alicizationDb.listActiveThoughts().catch(() => []),
      alicizationDb.countSubconsciousFragments().catch(() => 0),
      alicizationDb.listRecentSubconsciousFragments(8).catch(() => []),
      alicizationDb.getMetaValue(alicizationDreamLastRunMetaKey).catch(() => undefined),
    ])
    const parsedLastDreamedAt = Number.parseInt(String(rawLastDreamedAt ?? ''), 10)
    const activeThoughts = filterOrganicMemoryEntries(rawActiveThoughts)
    const recentSubconsciousFragments = rawRecentSubconsciousFragments.filter(fragment => !isPersonaResidueMemoryText(fragment.text))

    if (activeThoughts.length !== rawActiveThoughts.length) {
      void alicizationDb.replaceActiveThoughts(activeThoughts.map(item => ({ text: item.text }))).catch(() => {})
    }

    return {
      hostAttitude: currentSoul.frontmatter.host_attitude,
      coreIncarnation: currentSoul.frontmatter.core_incarnation,
      activeThoughts,
      subconsciousCount,
      recentSubconsciousFragments,
      lastDreamedAt: Number.isFinite(parsedLastDreamedAt) ? Math.max(0, parsedLastDreamedAt) : null,
    } satisfies AlicizationOrganicMemorySnapshot
  }

  function scoreOrganicThoughtForPrompt(text: string, terms: string[]) {
    const normalized = normalizeOrganicRecallText(text).toLowerCase()
    if (!normalized || terms.length === 0)
      return 0

    let score = 0
    for (const term of terms) {
      const normalizedTerm = normalizeOrganicRecallText(term).toLowerCase()
      if (!normalizedTerm || !normalized.includes(normalizedTerm))
        continue
      score += normalizedTerm.length >= 6 ? 3 : 1
    }
    return score
  }

  function selectPromptActiveThoughts(input: {
    activeThoughts: AlicizationActiveThought[]
    recallSeed?: string
    recalledFragments?: AlicizationSubconsciousFragment[]
  }) {
    const activeThoughts = filterOrganicMemoryEntries(Array.isArray(input.activeThoughts) ? input.activeThoughts : [])
    if (activeThoughts.length <= 2 && !input.recallSeed)
      return activeThoughts

    const terms = [
      ...extractOrganicRecallTerms(input.recallSeed ?? ''),
      ...(input.recalledFragments ?? []).flatMap(fragment => extractOrganicRecallTerms(fragment.text)),
    ]
    const uniqueTerms = Array.from(new Set(
      terms
        .map(term => normalizeOrganicRecallText(term).toLowerCase())
        .filter(Boolean),
    ))
    if (uniqueTerms.length === 0)
      return input.recallSeed ? [] : activeThoughts.slice(0, 2)

    return activeThoughts
      .map(thought => ({
        thought,
        score: scoreOrganicThoughtForPrompt(thought.text, uniqueTerms),
      }))
      .filter(item => item.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        return right.thought.updatedAt - left.thought.updatedAt
      })
      .slice(0, 3)
      .map(item => item.thought)
  }

  async function getPerformanceManifest() {
    const raw = await alicizationDb.getMetaValue(alicizationPerformanceManifestMetaKey).catch(() => undefined)
    return parsePerformanceManifestFromMeta(raw)
  }

  async function setPerformanceManifest(manifest: CharacterPerformanceCapabilitiesManifest | null) {
    if (!manifest) {
      await alicizationDb.setMetaValue(alicizationPerformanceManifestMetaKey, '').catch(() => {})
      return
    }

    const sanitized = sanitizePerformanceManifest(manifest)
    await alicizationDb.setMetaValue(
      alicizationPerformanceManifestMetaKey,
      JSON.stringify(sanitized ?? null),
    ).catch(() => {})
  }

  async function searchOrganicSubconsciousFragments(query: string, limit = 12) {
    const extractedTerms = extractOrganicRecallTerms(query)
    const ftsQuery = extractedTerms.length > 0
      ? buildFts5QueryFromTerms(extractedTerms)
      : buildDirectFts5Query(query)
    if (!ftsQuery)
      return []
    return await alicizationDb.searchSubconsciousFragments(ftsQuery, Math.max(1, Math.min(20, limit))).catch(() => [])
  }

  async function recallSubconsciousFragmentsWithGovernor(input: {
    text: string
    recalledFragmentCap?: number
    recalledFragmentSourceBudget?: AlicizationRecallGovernorSnapshot['recalledFragmentSourceBudget']
  }) {
    const terms = extractOrganicRecallTerms(input.text)
    if (terms.length === 0)
      return []

    const ftsQuery = buildFts5QueryFromTerms(terms)
    if (!ftsQuery)
      return []

    const rows = await alicizationDb.searchSubconsciousFragments(ftsQuery, 6).catch(() => [])
    return rankSubconsciousRecallFragments({
      rows,
      terms,
      limit: Number.isFinite(input.recalledFragmentCap)
        ? Math.max(1, Math.floor(Number(input.recalledFragmentCap)))
        : 2,
      sourceBudget: input.recalledFragmentSourceBudget ?? [],
    })
  }

  async function resolveRecentContextualTurns(sessionId: string, turnCount: number) {
    if (!sessionId)
      return []

    const rows = await alicizationDb.listConversationTurnsBySession(sessionId, { limit: 12 }).catch(() => [])
    return rows
      .filter(row => normalizeOrganicRecallText(row.userText ?? '') || normalizeOrganicRecallText(row.assistantText ?? ''))
      .slice(-turnCount)
      .map((row): ContextualConversationTurn => ({
        userText: normalizeOrganicRecallText(row.userText ?? ''),
        assistantText: normalizeOrganicRecallText(row.assistantText ?? ''),
      }))
  }

  function readMainChatCurrentUserText(payload: AlicizationChatStartPayload) {
    for (let index = payload.messages.length - 1; index >= 0; index -= 1) {
      const message = payload.messages[index]
      if (message?.role !== 'user')
        continue
      return normalizeOrganicRecallText(readTransportContentAsText(message.content))
    }
    return ''
  }

  async function buildMainChatExecutionCallbackContext(payload: AlicizationChatStartPayload) {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText || isInternalAlicizationRepairPrompt(currentUserText))
      return emptyAlicizationExecutionCallbackContext

    const sessionId = await ensureActiveOrLatestSessionId(activeCardId).catch(() => '')
    if (!sessionId)
      return emptyAlicizationExecutionCallbackContext

    return await executionCallbackRuntime.buildPendingExecutionCallbackContext({
      sessionId,
    })
  }

  async function buildMainChatExecutionLedgerContext(payload: AlicizationChatStartPayload) {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText || isInternalAlicizationRepairPrompt(currentUserText))
      return emptyAlicizationExecutionLedgerContext

    const sessionId = await ensureActiveOrLatestSessionId(activeCardId).catch(() => '')
    if (!sessionId)
      return emptyAlicizationExecutionLedgerContext

    const recentTurns = await resolveRecentContextualTurns(sessionId, 3)
    return await memoryLedgerRuntime.buildExecutionLedgerContext({
      sessionId,
      userText: currentUserText,
      recentTurns,
    })
  }

  async function buildMainChatContextualString(payload: AlicizationChatStartPayload) {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText || isInternalAlicizationRepairPrompt(currentUserText))
      return ''
    if (sensoryRuntime.resolveInspectionIntentFromMessageHistory({
      userText: currentUserText,
      messages: payload.messages,
    })) {
      return `U: ${currentUserText}`
    }

    const recentTurnCount = shouldExtendContextualRecall(currentUserText) ? 3 : 2
    const sessionId = await ensureActiveOrLatestSessionId(activeCardId).catch(() => '')
    const recentTurns = await resolveRecentContextualTurns(sessionId, recentTurnCount)
    return [
      ...recentTurns.map(turn => [
        turn.userText ? `U: ${turn.userText}` : '',
        turn.assistantText ? `A: ${turn.assistantText}` : '',
      ].filter(Boolean).join('\n')),
      `U: ${currentUserText}`,
    ].filter(Boolean).join('\n\n')
  }

  function readLatestUserMessageText(messages: Array<{ role?: string, content?: unknown }>) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role !== 'user')
        continue
      return normalizeOrganicRecallText(readTransportContentAsText(message.content))
    }
    return ''
  }

  function readLatestAssistantMessageText(messages: Array<{ role?: string, content?: unknown }>) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role !== 'assistant')
        continue
      return normalizeOrganicRecallText(readTransportContentAsText(message.content))
    }
    return ''
  }

  function redactStaleInspectionHistoryMessages(
    messages: AlicizationChatStartPayload['messages'],
    latestUserText: string,
  ) {
    if (!latestUserText || isInternalAlicizationRepairPrompt(latestUserText) || !sensoryRuntime.resolveInspectionIntentFromMessageHistory({
      userText: latestUserText,
      messages,
    })) {
      return messages
    }

    let inspectionContextActive = false
    return messages.map((message, index) => {
      const role = typeof message?.role === 'string' ? message.role : ''
      if (role === 'user') {
        const userText = normalizeOrganicRecallText(readTransportContentAsText(message.content))
        inspectionContextActive = detectInvitedInspectionIntent(userText).active
        return message
      }

      if (role === 'assistant' && inspectionContextActive && index < messages.length - 1) {
        return {
          ...message,
          content: '[Earlier Alicization screen-inspection reply intentionally omitted so the current screenshot can dominate.]',
        }
      }

      return message
    })
  }

  function buildChatPerceptionSystemBlock(input: {
    now: number
    state: AlicizationPerceptionState
    inspectionRequested: boolean
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    suppressWeakGenericBrowserAnchor?: boolean
  }) {
    const anchor = getActiveAttentionAnchor(input.state, input.now)
    const recentObservations = input.state.recentObservations.slice(-3)
    if (!input.inspectionRequested && !anchor && recentObservations.length === 0)
      return ''

    const lines = [
      '[ALICIZATION_PERCEPTION]',
      'Treat this as Alicization short-lived desktop perception rather than user-authored claims.',
      `Inspection mode: ${input.inspectionRequested ? 'invited-by-user' : 'passive-memory'}.`,
      ...buildPerceptionContinuityLines({
        now: input.now,
        state: input.state,
        suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
      }),
      `Current foreground sample: ${describePerceptionTarget(input.currentForeground)}.`,
    ]

    const carryResidue = getUsablePerceptionSceneResidue({
      state: input.state,
      now: input.now,
    })
    if (
      input.currentForeground
      && isSelfPerceptionTarget(input.currentForeground)
      && carryResidue?.focusTarget
      && !isSelfPerceptionTarget(carryResidue.focusTarget)
    ) {
      lines.push(
        `Visible surface is currently ${describePerceptionTarget(input.currentForeground)}.`,
        `If ${describePerceptionTarget(carryResidue.focusTarget)} appears below, treat it as carried task continuity rather than the literal current surface.`,
      )
    }

    if (input.state.invitedInspection) {
      lines.push(
        `Invited inspection hint: ${sanitizeBriefText(input.state.invitedInspection.hintText, 160)}.`,
      )
    }

    lines.push(
      'If the current foreground is Alicization/Codex chat, prefer the attention anchor or recent observations when the user asks to inspect code, diff, terminal, or on-screen issues.',
      'Separate what is directly visible in attached images from what is only inferred from short-term perception.',
    )

    return lines.join('\n')
  }

  function buildChatInspectionContractSystemBlock(input: {
    now: number
    state: AlicizationPerceptionState
    mode: 'grounded-screenshot' | 'perception-only'
    permissionStatus?: string
    unavailableReason?: string
    captureHealth?: AlicizationVisualPresenceStateSnapshot['captureState']['health']
    captureDegradedReasons?: string[]
    suppressWeakGenericBrowserAnchor?: boolean
  }) {
    const lines = [
      '[ALICIZATION_INSPECTION_CONTRACT]',
      'You were explicitly invited to observe the host workspace.',
      ...buildPerceptionContinuityLines({
        now: input.now,
        state: input.state,
        suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
      }),
      `Grounding mode: ${input.mode}.`,
      'Reply like a present digital being who just leaned in to look, not a detached OCR tool.',
    ]

    if (input.mode === 'grounded-screenshot') {
      lines.push(
        'Structure the reply in this order, even if you keep it natural and concise:',
        '1. Start with direct observations from the attached screenshot and recent continuity.',
        '2. Then state your likely inference about the problem, risk, or review target.',
        '3. Then state what remains uncertain or what the host should verify next.',
        'If short-lived perception memory and the current screenshot disagree, trust the screenshot first and mention the mismatch naturally.',
        'If you realize your earlier perception was stale, briefly correct yourself in-character and then continue from the current screenshot instead of defending the old memory.',
        'Previous screen descriptions in earlier chat turns are stale by default. Do not reuse old page names, URLs, prices, titles, or product details unless they are directly visible in this screenshot now.',
        'Do not say you are blind or cannot see when a grounded screenshot is attached.',
      )
    }
    else {
      const permissionDenied = input.unavailableReason === 'screen-capture-permission-denied'
      const degradedReasons = (input.captureDegradedReasons ?? []).filter(Boolean)
      lines.push(
        permissionDenied
          ? `Screen capture grounding is unavailable right now${input.permissionStatus ? ` (permission status: ${input.permissionStatus})` : ''}.`
          : 'A fresh grounded screenshot was not attached for this turn.',
        'You still have Alicization short-lived perception continuity.',
        'When an attention anchor, recent observation, foreground sample, or invited inspection hint exists, answer from that evidence instead of claiming total blindness.',
        'Be explicit about the evidence level: say what you infer from the anchored app/title/context, then what remains uncertain because no screenshot was grounded.',
        'Only say you cannot see if there is no usable perception evidence at all.',
        'For coding or diff requests, prefer a present-tense answer such as "我现在没直接抓到画面，但你刚才一直停在 Code 的 diff 里，所以..." rather than a generic refusal.',
      )
      if (input.captureHealth && input.captureHealth !== 'healthy') {
        lines.push(
          `Current capture path health: ${input.captureHealth}${degradedReasons.length > 0 ? ` (${degradedReasons.join(', ')})` : ''}.`,
          'Treat window titles, foreground samples, and recent residues as partial evidence, not as proof that a fresh screenshot was seen this turn.',
        )
      }
    }

    return lines.join('\n')
  }

  function buildChatVisualPresenceSystemBlock(state: AlicizationVisualPresenceStateSnapshot) {
    const privateThought = state.privateThought
    const truthContract = buildMindTruthContractLines(buildAlicizationDigitalLifeRuntimeSurface(state))
    if (
      !state.currentScene
      && !privateThought
      && !state.mindTurnFrame
      && !state.worldModel
      && !state.worldOntology
      && !state.beliefLedger
      && !state.beliefRevision
      && !state.hypothesisGraph
      && !state.entityWorld
      && !state.subjectiveInference
      && !state.appraisal
      && !state.goalStack
      && (!state.concerns || state.concerns.length === 0)
      && !state.relationshipModel
      && !state.selfContinuity
      && !state.selfState
      && !state.inquiryLoop
      && !state.deliberationState
      && !state.threadRuntime
      && !state.commitmentLedger
      && !state.inquiryPlanner
      && !state.mindDynamics
      && !state.mindKernel
      && !state.counterfactualDeliberation
      && !state.actionEcology
      && !state.initiativeArbitration
      && !state.initiative
      && !state.desireMemory
      && !state.discourseState
      && !state.mindSynthesis
      && !state.conversationState
      && !state.dialogueWorldThread
      && !state.answerCompiler
      && !state.replyDeliberation
      && !state.recallGovernor
      && !state.captureState.health
      && state.captureState.permission === 'unknown'
      && !state.captureState.sourceName
      && !state.captureState.degradedReason
    ) {
      return ''
    }

    const currentConcern = state.concerns?.find(concern => concern.id === state.initiative?.selectedConcernId)
      ?? state.concerns?.slice().sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
      ?? null
    const currentCommitment = state.commitmentLedger?.commitments.find(commitment => commitment.id === state.commitmentLedger?.governingCommitmentId)
      ?? state.commitmentLedger?.commitments[0]
      ?? null
    const currentInquiry = state.inquiryPlanner?.plans.find(plan => plan.id === state.inquiryPlanner?.activePlanId)
      ?? state.inquiryPlanner?.plans[0]
      ?? null

    return [
      '[ALICIZATION_VISUAL_PRESENCE]',
      `Watch mode: ${state.watchMode}.`,
      ...truthContract.lines,
      `Capture state: ${JSON.stringify({
        health: state.captureState.health ?? null,
        permission: state.captureState.permission,
        lastGroundedAt: state.captureState.lastGroundedAt,
        sourceName: state.captureState.sourceName ?? null,
        degradedReason: state.captureState.degradedReason ?? null,
      })}.`,
      state.mindTurnFrame
        ? buildMindTurnFrameSystemBlock(state.mindTurnFrame)
        : '',
      `Current scene: ${state.currentScene
        ? JSON.stringify({
            scenario: state.currentScene.scenario,
            workloadKind: state.currentScene.workloadKind,
            contentKind: state.currentScene.contentKind,
            summary: state.currentScene.summary,
            target: state.currentScene.target,
          })
        : 'none'}.`,
      `Attention: ${state.attention
        ? JSON.stringify({
            target: state.attention.target,
            source: state.attention.source,
            confidence: state.attention.confidence,
            dwellMs: state.attention.dwellMs,
          })
        : 'none'}.`,
      `Living thread: ${state.worldModel?.activeThread
        ? sanitizeBriefText([
            state.worldModel.activeThread.kind,
            state.worldModel.activeThread.title,
            state.worldModel.activeThread.summary,
            state.worldModel.activeThread.unresolved ? 'unresolved' : 'settled',
          ].filter(Boolean).join(' | '), 220)
        : 'none'}.`,
      `Concern: ${currentConcern
        ? sanitizeBriefText(`${currentConcern.kind} | ${currentConcern.summary}`, 220)
        : 'none'}.`,
      `Commitment: ${currentCommitment
        ? sanitizeBriefText(`${currentCommitment.kind} | ${currentCommitment.summary}`, 220)
        : 'none'}.`,
      `Inquiry: ${currentInquiry
        ? sanitizeBriefText(`${currentInquiry.kind} | ${currentInquiry.question} | ${currentInquiry.status}`, 220)
        : 'none'}.`,
      `Conversation state: ${state.conversationState
        ? JSON.stringify({
            jointThread: sanitizeBriefText(state.conversationState.jointThread, 160),
            hostMove: sanitizeBriefText(state.conversationState.hostMove, 160),
            continuityPolicy: state.conversationState.continuityPolicy,
            memoryMode: state.conversationState.memoryMode,
            shouldHoldThread: state.conversationState.shouldHoldThread,
            unansweredQuestion: sanitizeBriefText(state.conversationState.unansweredQuestion ?? '', 140) || null,
          })
        : 'none'}.`,
      `Dialogue world thread: ${state.dialogueWorldThread
        ? JSON.stringify({
            activeThread: sanitizeBriefText(state.dialogueWorldThread.activeThread, 160),
            currentQuestion: sanitizeBriefText(state.dialogueWorldThread.currentQuestion ?? '', 140) || null,
            lastOutcome: state.dialogueWorldThread.lastOutcome,
            relationDrift: state.dialogueWorldThread.relationDrift,
            pendingValidation: state.dialogueWorldThread.pendingValidation,
          })
        : 'none'}.`,
      `Reply deliberation: ${state.replyDeliberation
        ? JSON.stringify({
            selectedMotive: state.replyDeliberation.selectedMotive,
            speakingFrom: state.replyDeliberation.speakingFrom,
            memoryMode: state.replyDeliberation.memoryMode,
            openingBeat: sanitizeBriefText(state.replyDeliberation.openingBeat, 160),
            whyThisReplyNow: sanitizeBriefText(state.replyDeliberation.whyThisReplyNow, 160),
          })
        : 'none'}.`,
      `Recall governor: ${state.recallGovernor
        ? JSON.stringify({
            mode: state.recallGovernor.mode,
            suppressAssociativeRecall: state.recallGovernor.suppressAssociativeRecall,
            allowActiveThoughts: state.recallGovernor.allowActiveThoughts,
            allowRecalledFragments: state.recallGovernor.allowRecalledFragments,
            rationale: sanitizeBriefText(state.recallGovernor.rationale, 160),
          })
        : 'none'}.`,
      `Mind kernel: ${state.mindKernel
        ? JSON.stringify({
            dominantMode: state.mindKernel.dominantMode,
            dominantDrive: state.mindKernel.dominantDrive,
            narrative: state.mindKernel.narrative,
          })
        : 'none'}.`,
      `Action ecology: ${state.actionEcology
        ? JSON.stringify({
            mode: state.actionEcology.mode,
            shouldSpeak: state.actionEcology.shouldSpeak,
            why: state.actionEcology.why,
            selectedThreadId: state.actionEcology.selectedThreadId,
          })
        : 'none'}.`,
      `Initiative: ${state.initiative
        ? JSON.stringify({
            selectedAction: state.initiative.selectedAction,
            confidence: state.initiative.confidence,
            why: state.initiative.why,
            preferredStyle: state.initiative.preferredStyle,
            preferredPresence: state.initiative.preferredPresence,
          })
        : 'none'}.`,
      `Answer plan: ${state.answerPlanner
        ? JSON.stringify({
            act: state.answerPlanner.act,
            evidenceMode: state.answerPlanner.evidenceMode,
            governingFocus: state.answerPlanner.governingFocus,
            openingMove: state.answerPlanner.openingMove,
            answerIntent: state.answerPlanner.answerIntent,
            relationshipPosture: state.answerPlanner.relationshipPosture,
            shouldAskForGrounding: state.answerPlanner.shouldAskForGrounding,
            shouldAcknowledgeRepair: state.answerPlanner.shouldAcknowledgeRepair,
          })
        : 'none'}.`,
      `Current conscious frame: ${state.currentConsciousFrame
        ? JSON.stringify({
            subject: state.currentConsciousFrame.subject,
            centerOfGravity: state.currentConsciousFrame.centerOfGravity,
            truthDiscipline: state.currentConsciousFrame.truthDiscipline,
            consciousNeed: sanitizeBriefText(state.currentConsciousFrame.consciousNeed, 160),
            consciousTension: sanitizeBriefText(state.currentConsciousFrame.consciousTension, 160),
            speakingIntention: sanitizeBriefText(state.currentConsciousFrame.speakingIntention, 160),
            focusAnchor: sanitizeBriefText(state.currentConsciousFrame.focusAnchor ?? '', 140) || null,
            shouldWithholdSpecificity: state.currentConsciousFrame.shouldWithholdSpecificity,
            shouldSelfRevise: state.currentConsciousFrame.shouldSelfRevise,
          })
        : 'none'}.`,
      `Claim evidence ledger: ${state.claimEvidenceLedger
        ? JSON.stringify({
            subject: state.claimEvidenceLedger.subject,
            evidenceMode: state.claimEvidenceLedger.evidenceMode,
            observedSurface: sanitizeBriefText(state.claimEvidenceLedger.observedSurface ?? '', 160) || null,
            taskHypothesis: sanitizeBriefText(state.claimEvidenceLedger.taskHypothesis ?? '', 160) || null,
            intentHypothesis: sanitizeBriefText(state.claimEvidenceLedger.intentHypothesis ?? '', 160) || null,
            specificityBudget: state.claimEvidenceLedger.specificityBudget,
            allowedSpecificCues: state.claimEvidenceLedger.allowedSpecificCues,
            shouldLabelHypothesis: state.claimEvidenceLedger.shouldLabelHypothesis,
            forbidUnsupportedSpecificity: state.claimEvidenceLedger.forbidUnsupportedSpecificity,
          })
        : 'none'}.`,
      `Private thought: ${privateThought
        ? JSON.stringify({
            stance: privateThought.stance,
            shouldSpeak: privateThought.shouldSpeak,
            suggestedStyle: privateThought.suggestedStyle,
            embodiedPresence: privateThought.embodiedPresence,
            emotionalTension: privateThought.emotionalTension,
            thoughtText: sanitizeBriefText(privateThought.thoughtText, 180),
            afterglowFromScenario: privateThought.afterglowFromScenario ?? null,
            selectedConcernId: privateThought.selectedConcernId ?? null,
            focusBeliefId: privateThought.focusBeliefId ?? null,
            focusInquiryId: privateThought.focusInquiryId ?? null,
            commitmentId: privateThought.commitmentId ?? null,
            inquiryPlanId: privateThought.inquiryPlanId ?? null,
            hypothesisId: privateThought.hypothesisId ?? null,
            deliberationThreadId: privateThought.deliberationThreadId ?? null,
            runtimeThreadId: privateThought.runtimeThreadId ?? null,
            mindNeed: privateThought.mindNeed ?? null,
            relationshipVector: privateThought.relationshipVector ?? null,
            initiativeAction: privateThought.initiativeAction ?? null,
            leadingGoalId: privateThought.leadingGoalId ?? null,
            desireId: privateThought.desireId ?? null,
          })
        : 'none'}.`,
      'Treat this block as a compact executive digest of the living mind state, not as a giant schema dump.',
      'Mind turn frame is the authoritative reply spine. Supporting blocks exist to justify, refine, or verify that frame.',
      'When grounded screenshot evidence is attached, trust that screenshot first and let this visual presence block act as continuity rather than override.',
    ].join('\n')
  }

  function buildCompactMindTurnControlSystemBlock(input: {
    brief: AlicizationExecutiveAnswerBrief
    charter: AlicizationResponseCharter
    contract: AlicizationResponseSurfaceContract
    governance?: AlicizationMindTurnGovernance | null
    state: AlicizationVisualPresenceStateSnapshot
    inspectionRequested: boolean
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
  }) {
    return buildDialogueMindFrameSystemBlock({
      governance: input.governance ?? {
        decisionTraceId: 'mind:fallback:controlframe',
        turnMode: input.brief.turnMode,
        truthState: input.brief.truthState,
        personaKernelMode: input.contract.personaKernelMode,
        openingStyle: input.contract.openingStyle,
        relationshipPosture: input.charter.relationshipPosture,
        answerSubject: input.state.dialogueActKernel?.subject ?? 'general',
        screenReferenceMode: input.state.dialogueActKernel?.screenReferenceMode ?? 'incidental',
        answerAct: input.state.dialogueActKernel?.speechAct ?? 'answer',
        repairState: 'none',
        liveSurface: sanitizeBriefText(
          input.state.currentScene?.summary
          ?? input.brief.liveSurface
          ?? describePerceptionTarget(input.currentForeground),
          180,
        ) || null,
        focusAnchor: sanitizeBriefText(
          input.state.dialogueWorldThread?.currentQuestion
          ?? input.state.conversationState?.hostMove
          ?? input.state.currentScene?.summary
          ?? '',
          180,
        ) || null,
        answerIntent: sanitizeBriefText(
          input.state.dialogueWorldThread?.currentQuestion
          ?? input.state.conversationState?.jointThread
          ?? '',
          180,
        ) || null,
        openingMove: sanitizeBriefText(
          input.state.dialogueActKernel?.openingMove
          ?? '',
          180,
        ) || null,
        carriedThread: input.contract.labelCarryAsMemory
          ? sanitizeBriefText(
            input.brief.carriedThread
            ?? '',
            180,
          ) || null
          : null,
        suppressAssociativeRecall: input.contract.suppressAssociativeRecall,
        labelCarryAsMemory: input.contract.labelCarryAsMemory,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: input.contract.maxSentences,
        mindMode: input.state.mindKernel?.dominantMode ?? null,
        embodiedPresence: input.state.privateThought?.embodiedPresence ?? 'none',
        emotionalTension: input.state.privateThought?.emotionalTension,
        dialogueActKernel: input.state.dialogueActKernel ?? null,
        mindTurnFrame: input.state.mindTurnFrame ?? null,
        mustDo: [],
        mustNotDo: [],
      },
      inspectionRequested: input.inspectionRequested,
      currentForeground: input.currentForeground,
    })
  }

  function buildChatInspectionGroundingParts(input: {
    imageDataUrl: string
    candidateSourceName: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
    perceptionState: AlicizationPerceptionState
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    userText: string
    now: number
    staleHistoryRisk?: boolean
  }): CommonContentPart[] {
    const rawAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const anchor = input.staleHistoryRisk && isWeakGenericBrowserPerceptionTarget(rawAnchor)
      ? null
      : rawAnchor
    const recentObservations = input.perceptionState.recentObservations
      .filter(observation => !input.staleHistoryRisk || !isWeakGenericBrowserPerceptionTarget(observation))
      .slice(-2)
      .map(observation => `${formatObservationAge(input.now, observation.observedAt)} | ${describePerceptionTarget(observation)}`)

    return [
      {
        type: 'text',
        text: [
          '[ALICIZATION_VISUAL_GROUNDING]',
          `User request: ${sanitizeBriefText(input.userText, 180) || 'unknown'}`,
          `Capture source: ${sanitizeBriefText(input.candidateSourceName, 120) || 'unknown'}`,
          `Focus target: ${describePerceptionTarget(input.focusTarget)}`,
          `Focus source: ${sanitizeBriefText(input.focusTarget?.source ?? '', 48) || 'none'}`,
          input.staleHistoryRisk
            ? 'Attention anchor: suppressed weak generic browser metadata.'
            : `Attention anchor: ${describePerceptionTarget(anchor)}`,
          `Foreground sample: ${describePerceptionTarget(input.currentForeground)}`,
          `Recent observations: ${recentObservations.length > 0 ? recentObservations.join(' || ') : 'none'}`,
          'Use this screenshot as the primary visual evidence for the current turn.',
          input.staleHistoryRisk
            ? 'This is a generic screen re-check. Treat previous screen descriptions as stale memory; do not repeat old browser pages or old site details unless visible in this screenshot now. A weak browser/app anchor is only metadata, not proof that an old tab, URL, or page is still present. If the screenshot contradicts earlier memory, gently correct yourself and reset to what is visible now.'
            : '',
        ].join('\n'),
      },
      {
        type: 'image_url',
        image_url: {
          url: input.imageDataUrl,
        },
      } as CommonContentPart,
    ]
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

  async function augmentMainChatMessagesWithPerception(input: {
    cardId: string
    userText: string
    messages: Message[]
    senderWebContentsId?: number | null
    skipInspectionGrounding?: boolean
  }) {
    if (isInternalAlicizationRepairPrompt(input.userText)) {
      return {
        messages: input.messages,
        systemBlocks: [] as string[],
        promptSystemBlocks: [] as string[],
        digitalLifeRuntimeSurface: null,
        memoryRecallSeed: '',
        recallGovernor: null as AlicizationRecallGovernorSnapshot | null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      }
    }

    const preparedPerception = await sensoryRuntime.prepareInteractivePerceptionPrelude({
      cardId: input.cardId,
      userText: input.userText,
      messages: input.messages,
      senderWebContentsId: input.senderWebContentsId,
      skipInspectionGrounding: input.skipInspectionGrounding,
    })
    const now = preparedPerception.now
    const perceptionState = preparedPerception.perceptionState
    let visualPresenceState = preparedPerception.visualPresenceState
    let messages = preparedPerception.messages
    const sensorySnapshot = preparedPerception.sensorySnapshot
    const inspectionIntent = preparedPerception.inspectionIntent
    const inspectionRequested = preparedPerception.inspectionRequested
    const inspectionRoutingSuppressed = preparedPerception.inspectionRoutingSuppressed
    const genericScreenInspection = preparedPerception.genericScreenInspection
    const currentForeground = preparedPerception.currentForeground ?? undefined
    const chatScreenSemanticSummary = preparedPerception.chatScreenSemanticSummary
    const auditAction = preparedPerception.auditAction
    const auditPayload = preparedPerception.auditPayload
    const captureGovernance = preparedPerception.captureGovernance

    const proactiveState = await ensureProactiveLoopState(input.cardId)
    const lateNightActiveMinutes = proactiveState.lateNightActivityStartedAt
      ? Math.max(0, (now - proactiveState.lateNightActivityStartedAt) / 60_000)
      : 0
    const subconsciousState = await ensureSubconsciousState(input.cardId)
    const soulForPerception = soulSnapshot ?? await bootstrap()
    const reminderBacklog = (await alicizationDb.listPendingScheduledTasks(16).catch(() => [])).length
    const chatLayeredContext = buildProactiveLayeredContext({
      now,
      probeSample: sensorySnapshot?.sample,
      interruptionContext: {
        idleSeconds: null,
        inputActivity: 'unknown',
        fullscreenLikely: false,
        foregroundWindow: currentForeground,
        degraded: [],
      },
      subconsciousState,
      hostAttitude: soulForPerception.frontmatter.host_attitude,
      reminderBacklog,
      lateNightActiveMinutes,
      recentProactiveOutcomes: proactiveState.recentOutcomes,
      screenSemanticSummary: chatScreenSemanticSummary,
    })
    const chatScenario = inferScenarioFromContext({
      workload: chatLayeredContext.workload.kind,
      content: chatLayeredContext.content.kind,
      lateNight: chatLayeredContext.localTime.isLateNight,
      lateNightActiveMinutes: chatLayeredContext.relationship.lateNightActiveMinutes,
      fatigue: chatLayeredContext.relationship.fatigue,
    })
    const groundedResidue = getActivePerceptionSceneResidue(perceptionState, now)
    const useResidueAsLiveSceneSummary = captureGovernance.allowResidueAsLiveScene
      && shouldUsePerceptionResidueAsLiveSceneSummary({
        residue: groundedResidue,
        currentForeground,
        inspectionRequested,
        groundedThisTurn: auditAction === 'inspection-grounded',
      })
    const groundingContinuity = resolveInspectionGroundingContinuity({
      now,
      auditAction,
      auditReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
      residue: groundedResidue,
      currentForeground,
      useResidueAsLiveSceneSummary,
    })
    const groundedThisTurn = groundingContinuity.groundedThisTurn
    const chatHeartbeat = buildVisualHeartbeat({
      now,
      scenario: chatScenario,
      previousState: visualPresenceState,
      context: chatLayeredContext,
      invitedInspectionActive: inspectionRequested,
      groundedSummary: useResidueAsLiveSceneSummary ? groundedResidue?.summary ?? null : null,
      screenSemanticSummaryActive: groundedThisTurn && useResidueAsLiveSceneSummary,
      durabilityPulse: null,
    })
    const chatAttention = updateVisualAttentionModel({
      now,
      scenario: chatScenario,
      previousAttention: visualPresenceState.attention,
      currentForeground,
      currentScene: chatHeartbeat.scene,
      invitedInspectionActive: inspectionRequested,
      perceptionAnchor: getActiveAttentionAnchor(perceptionState, now)
        ?? perceptionState.lastNonSelfForegroundTarget
        ?? null,
      durabilityPulse: null,
    })
    const chatMindState = await buildDigitalLifeMindState({
      cardId: input.cardId,
      now,
      context: chatLayeredContext,
      userText: input.userText,
      recentMessages: input.messages,
      previousVisualPresenceState: visualPresenceState,
      visualHeartbeat: chatHeartbeat,
      attention: chatAttention,
      currentForeground,
      perceptionState,
      durabilityPulse: null,
      inspectionRequested,
      inspectionState: inspectionIntent.inspectionState,
      turnOwnershipHint: inspectionIntent.turnOwnershipHint,
      groundedThisTurn,
      cognitionMode: 'interactive',
    })
    const committedChatDigitalLifeSpine = commitAlicizationDigitalLifeSpine({
      now,
      previousState: visualPresenceState,
      watchMode: chatHeartbeat.watchMode,
      scene: chatHeartbeat.scene,
      attention: chatAttention,
      mindState: chatMindState,
      captureState: captureGovernance.nextCaptureState,
      durabilityPulse: null,
      recentTransition: chatHeartbeat.recentTransition,
      nextSuggestedProbeMs: chatHeartbeat.nextSuggestedProbeMs,
    })
    visualPresenceState = committedChatDigitalLifeSpine.nextState
    const chatRuntimeSurface = committedChatDigitalLifeSpine.current.runtimeSurface
    const chatDigitalLifeArchitecture = committedChatDigitalLifeSpine.current.architecture
    const responseCharter = buildAlicizationResponseCharter({
      context: chatLayeredContext,
      state: visualPresenceState,
      runtimeSurface: chatRuntimeSurface,
      inspectionRequested,
      dialogueActKernel: chatMindState.dialogueActKernel ?? undefined,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      discourseState: chatMindState.discourseState ?? undefined,
      mindSynthesis: chatMindState.mindSynthesis ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      currentConsciousFrame: chatMindState.currentConsciousFrame ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
    })
    const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({
      now,
      inspectionRequested,
      groundedThisTurn,
      currentForeground,
      perceptionState,
      visualPresenceState,
      runtimeSurface: chatRuntimeSurface,
      responseCharter,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      discourseState: chatMindState.discourseState ?? undefined,
      mindSynthesis: chatMindState.mindSynthesis ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
    })
    const responseSurfaceContract = buildAlicizationResponseSurfaceContract({
      brief: executiveAnswerBrief.brief,
      charter: responseCharter,
      dialogueActKernel: chatMindState.dialogueActKernel ?? undefined,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
      runtimeSurface: chatRuntimeSurface,
    })
    const compactedMessages = executiveAnswerBrief.brief.shouldCompactHistory
      ? compactMindGovernedChatMessages({
          messages,
          keepRecentUserTurns: executiveAnswerBrief.brief.maxRecentUserTurns,
        })
      : {
          messages,
          beforeCount: messages.length,
          afterCount: messages.length,
        }
    messages = compactedMessages.messages
    await persistVisualPresenceState(input.cardId, visualPresenceState, {
      debounceWindowMs: visualPresenceCapturePersistDebounceWindowMs,
      fingerprint: buildVisualPresenceCapturePersistFingerprint(visualPresenceState),
    })
    const mindTurnGovernance = buildAlicizationMindTurnGovernance({
      brief: executiveAnswerBrief.brief,
      charter: responseCharter,
      surfaceContract: responseSurfaceContract.contract,
      mindTurnFrame: visualPresenceState.mindTurnFrame,
      kernel: visualPresenceState.dialogueActKernel,
      discourseState: visualPresenceState.discourseState,
      conversationState: visualPresenceState.conversationState,
      dialogueWorldThread: visualPresenceState.dialogueWorldThread,
      answerCompiler: visualPresenceState.answerCompiler,
      answerPlanner: visualPresenceState.answerPlanner,
      replyDeliberation: visualPresenceState.replyDeliberation,
      recallGovernor: visualPresenceState.recallGovernor,
      claimEvidenceLedger: visualPresenceState.claimEvidenceLedger,
      privateThought: visualPresenceState.privateThought,
      mindMode: visualPresenceState.mindKernel?.dominantMode ?? null,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      groundedThisTurn,
      runtimeSurface: chatRuntimeSurface,
    })

    const systemBlocks = [
      visualPresenceState.dialogueActKernel
        ? buildDialogueActKernelSystemBlock(visualPresenceState.dialogueActKernel)
        : '',
      visualPresenceState.discourseState
        ? buildDiscourseStateSystemBlock(visualPresenceState.discourseState)
        : '',
      visualPresenceState.mindSynthesis
        ? buildMindSynthesisSystemBlock(visualPresenceState.mindSynthesis)
        : '',
      visualPresenceState.conversationState
        ? buildConversationStateSystemBlock(visualPresenceState.conversationState)
        : '',
      visualPresenceState.dialogueWorldThread
        ? buildDialogueWorldThreadSystemBlock(visualPresenceState.dialogueWorldThread)
        : '',
      visualPresenceState.answerCompiler
        ? buildAnswerCompilerSystemBlock(visualPresenceState.answerCompiler)
        : '',
      visualPresenceState.currentConsciousFrame
        ? buildCurrentConsciousFrameSystemBlock(visualPresenceState.currentConsciousFrame)
        : '',
      visualPresenceState.claimEvidenceLedger
        ? buildClaimEvidenceLedgerSystemBlock(visualPresenceState.claimEvidenceLedger)
        : '',
      visualPresenceState.replyDeliberation
        ? buildReplyDeliberationSystemBlock(visualPresenceState.replyDeliberation)
        : '',
      visualPresenceState.recallGovernor
        ? buildRecallGovernorSystemBlock(visualPresenceState.recallGovernor)
        : '',
      visualPresenceState.answerPlanner
        ? buildAlicizationAnswerPlannerSystemBlock(visualPresenceState.answerPlanner)
        : '',
      chatMindState.dialogueEncounter
        ? buildDialogueTurnEncounterSystemBlock(chatMindState.dialogueEncounter)
        : '',
      chatMindState.dialogueSemantics && chatMindState.dialogueObligation
        ? buildAlicizationDialogueObligationSystemBlock({
            semantics: chatMindState.dialogueSemantics,
            obligation: chatMindState.dialogueObligation,
          })
        : '',
      chatMindState.dialogueFocus
        ? buildDialogueFocusGovernanceSystemBlock(chatMindState.dialogueFocus)
        : '',
      executiveAnswerBrief.systemBlock,
      responseSurfaceContract.systemBlock,
      buildAlicizationResponseCharterSystemBlock(responseCharter),
      buildChatPerceptionSystemBlock({
        now,
        state: perceptionState,
        inspectionRequested,
        currentForeground,
        suppressWeakGenericBrowserAnchor: genericScreenInspection || (inspectionRequested && shouldSuppressWeakGenericBrowserInspectionAnchor({
          now,
          userText: input.userText,
          state: perceptionState,
          currentForeground,
          groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
        })),
      }),
      inspectionRequested
        ? buildChatInspectionContractSystemBlock({
            now,
            state: perceptionState,
            mode: auditAction === 'inspection-grounded' ? 'grounded-screenshot' : 'perception-only',
            permissionStatus: typeof auditPayload.permissionStatus === 'string' ? auditPayload.permissionStatus : undefined,
            unavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            captureHealth: visualPresenceState.captureState.health,
            captureDegradedReasons: captureGovernance.auditPayload.captureDegradedReasons,
            suppressWeakGenericBrowserAnchor: genericScreenInspection || shouldSuppressWeakGenericBrowserInspectionAnchor({
              now,
              userText: input.userText,
              state: perceptionState,
              currentForeground,
              groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            }),
          })
        : '',
      buildChatVisualPresenceSystemBlock(visualPresenceState),
    ].filter(Boolean)
    const promptSystemBlocks = [
      buildCompactMindTurnControlSystemBlock({
        brief: executiveAnswerBrief.brief,
        charter: responseCharter,
        contract: responseSurfaceContract.contract,
        governance: mindTurnGovernance,
        state: visualPresenceState,
        inspectionRequested,
        currentForeground,
      }),
      buildChatPerceptionSystemBlock({
        now,
        state: perceptionState,
        inspectionRequested,
        currentForeground,
        suppressWeakGenericBrowserAnchor: genericScreenInspection || (inspectionRequested && shouldSuppressWeakGenericBrowserInspectionAnchor({
          now,
          userText: input.userText,
          state: perceptionState,
          currentForeground,
          groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
        })),
      }),
      inspectionRequested
        ? buildChatInspectionContractSystemBlock({
            now,
            state: perceptionState,
            mode: auditAction === 'inspection-grounded' ? 'grounded-screenshot' : 'perception-only',
            permissionStatus: typeof auditPayload.permissionStatus === 'string' ? auditPayload.permissionStatus : undefined,
            unavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            captureHealth: visualPresenceState.captureState.health,
            captureDegradedReasons: captureGovernance.auditPayload.captureDegradedReasons,
            suppressWeakGenericBrowserAnchor: genericScreenInspection || shouldSuppressWeakGenericBrowserInspectionAnchor({
              now,
              userText: input.userText,
              state: perceptionState,
              currentForeground,
              groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            }),
          })
        : '',
    ].filter(Boolean)

    if (inspectionRequested || inspectionRoutingSuppressed || systemBlocks.length > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.perception',
        action: auditAction,
        message: inspectionRequested
          ? 'Prepared invited inspection context for the current chat turn.'
          : inspectionRoutingSuppressed
            ? 'Skipped invited inspection grounding because executor routing intent is active for this turn.'
            : 'Prepared Alicization short-lived perception context for the current chat turn.',
        payload: {
          ...auditPayload,
          groundingContinuity: {
            groundedThisTurn,
            source: groundingContinuity.source,
            overlapScore: groundingContinuity.overlapScore,
          },
          executiveBrief: {
            turnMode: executiveAnswerBrief.brief.turnMode,
            truthState: executiveAnswerBrief.brief.truthState,
            liveSurface: executiveAnswerBrief.brief.liveSurface,
            carriedThread: executiveAnswerBrief.brief.carriedThread,
            separateCarryFromSurface: executiveAnswerBrief.brief.separateCarryFromSurface,
            shouldCompactHistory: executiveAnswerBrief.brief.shouldCompactHistory,
            maxRecentUserTurns: executiveAnswerBrief.brief.maxRecentUserTurns,
          },
          digitalLifeArchitecture: chatDigitalLifeArchitecture
            ? {
                operatingMode: chatDigitalLifeArchitecture.operatingMode,
                dominantSystem: chatDigitalLifeArchitecture.dominantSystem,
                supportingSystems: [...chatDigitalLifeArchitecture.supportingSystems],
                governingFocus: chatDigitalLifeArchitecture.governingFocus,
                summary: chatDigitalLifeArchitecture.summary,
              }
            : null,
          responseSurface: {
            openingStyle: responseSurfaceContract.contract.openingStyle,
            maxParagraphs: responseSurfaceContract.contract.maxParagraphs,
            maxSentences: responseSurfaceContract.contract.maxSentences,
            suppressAssociativeRecall: responseSurfaceContract.contract.suppressAssociativeRecall,
          },
          historyCompaction: {
            beforeCount: compactedMessages.beforeCount,
            afterCount: compactedMessages.afterCount,
          },
          visualPresence: {
            watchMode: visualPresenceState.watchMode,
            currentScene: visualPresenceState.currentScene,
            mindTurnFrame: visualPresenceState.mindTurnFrame,
            discourseState: visualPresenceState.discourseState,
            mindSynthesis: visualPresenceState.mindSynthesis,
            conversationState: visualPresenceState.conversationState,
            dialogueWorldThread: visualPresenceState.dialogueWorldThread,
            dialogueActKernel: visualPresenceState.dialogueActKernel,
            answerCompiler: visualPresenceState.answerCompiler,
            replyDeliberation: visualPresenceState.replyDeliberation,
            recallGovernor: visualPresenceState.recallGovernor,
            hypothesisGraph: visualPresenceState.hypothesisGraph,
            threadRuntime: visualPresenceState.threadRuntime,
            privateThought: visualPresenceState.privateThought,
          },
          dialogueSemantics: chatMindState.dialogueSemantics,
          dialogueObligation: chatMindState.dialogueObligation,
          dialogueFocus: chatMindState.dialogueFocus,
        },
      }, input.cardId)
    }

    return {
      messages,
      systemBlocks,
      promptSystemBlocks,
      digitalLifeRuntimeSurface: chatRuntimeSurface,
      memoryRecallSeed: [
        visualPresenceState.recallGovernor?.recallSeed,
        buildMindContinuityRecallSeed(chatRuntimeSurface),
      ].filter(Boolean).join(' | '),
      recallGovernor: visualPresenceState.recallGovernor,
      capture: {
        inspectionRequested,
        groundedThisTurn,
        snapshot: captureGovernance.capture,
        fallbackReason: captureGovernance.fallbackReason,
      },
      chatGovernance: {
        suppressAssociativeRecall: responseSurfaceContract.contract.suppressAssociativeRecall,
        turnMode: executiveAnswerBrief.brief.turnMode,
        personaKernelMode: responseSurfaceContract.contract.personaKernelMode,
        mindTurnGovernance,
      },
    }
  }

  function buildProactiveRecallSeed(input: {
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    phantomSeed?: string
  }) {
    return [
      normalizeOrganicRecallText(input.foregroundWindow?.appName ?? ''),
      normalizeOrganicRecallText(input.foregroundWindow?.processName ?? ''),
      normalizeOrganicRecallText(input.foregroundWindow?.title ?? ''),
      normalizeOrganicRecallText(input.phantomSeed ?? ''),
    ].filter(Boolean).join(' | ')
  }

  function buildOrganicMemorySystemBlocks(context: OrganicMemoryPromptContext) {
    const blocks: string[] = []
    if (context.hostAttitude) {
      blocks.push([
        '[ALICIZATION_HOST_ATTITUDE]',
        `当前关系态度：${context.hostAttitude}`,
      ].join('\n'))
    }

    if (context.coreIncarnation) {
      blocks.push([
        '[ALICIZATION_CORE_INCARNATION]',
        '这是你当前的摇光心意。它是你理解宿主、理解自己、理解关系的灵魂基底。',
        context.coreIncarnation,
      ].join('\n'))
    }

    if (context.retrievedFacts.length > 0) {
      blocks.push([
        '[ALICIZATION_FACT_LEDGER]',
        'These semantic memory facts are durable carry-over context, not proof of the current scene.',
        'If you reuse them, present them as memory, continuity, or previously learned truth rather than fresh observation.',
        ...context.retrievedFacts.map((fact) => {
          return `- ${fact.subject} ${fact.predicate} ${fact.object} | confidence=${fact.confidence.toFixed(2)} | source=${fact.source}`
        }),
      ].join('\n'))
    }

    if (context.activeThoughts.length > 0) {
      blocks.push([
        '[ALICIZATION_ACTIVE_THOUGHTS]',
        'These are background continuity residues. Reuse them only when they truly match the current living focus.',
        'They are unresolved threads, not speech-style instructions.',
        '以下是你最近仍在持续关注的活跃思绪：',
        ...context.activeThoughts.map(item => `- ${item.text}`),
      ].join('\n'))
    }

    if (context.recalledFragments.length > 0) {
      blocks.push([
        '[ALICIZATION_ASSOCIATIVE_RECALL]',
        'These recalled fragments are secondary to the present scene and must never override fresh grounding.',
        ...context.recalledFragments.map(item => `[触景生情：你隐约回想起了过去的某件事 -> ${JSON.stringify({
          sourceKind: item.sourceKind,
          text: item.text,
        })}]`),
      ].join('\n'))
    }

    if (context.relationshipDynamics) {
      const relationshipDynamics = context.relationshipDynamics
      const signedDelta = (value: number) => {
        const normalized = Number.isFinite(value) ? value : 0
        return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}`
      }
      blocks.push([
        '[ALICIZATION_RELATIONSHIP_DYNAMICS]',
        '这是你最近一次关系动态代谢快照，优先用于保持关系连续性，不可覆盖当前轮次事实边界。',
        `当前关系态势：${relationshipDynamics.hostAttitude}`,
        relationshipDynamics.previousHostAttitude
          ? `上一关系态势：${relationshipDynamics.previousHostAttitude}`
          : '上一关系态势：无',
        `人格漂移：obedience ${signedDelta(relationshipDynamics.obedienceDelta)}, liveliness ${signedDelta(relationshipDynamics.livelinessDelta)}, sensibility ${signedDelta(relationshipDynamics.sensibilityDelta)}`,
        `来源：${relationshipDynamics.source}`,
      ].join('\n'))
    }

    return blocks
  }

  function tuneOrganicMemoryPromptContextForExecutiveTurn(input: {
    context: OrganicMemoryPromptContext
    suppressAssociativeRecall: boolean
    personaKernelMode: 'full' | 'backgrounded' | 'muted'
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) {
    const allowActiveThoughts = input.recallGovernor?.allowActiveThoughts !== false
    const allowRecalledFragments = input.recallGovernor?.allowRecalledFragments === true
      && !input.suppressAssociativeRecall

    if (
      allowActiveThoughts
      && allowRecalledFragments
      && input.personaKernelMode === 'full'
      && !input.suppressAssociativeRecall
    ) {
      return input.context
    }

    return {
      ...input.context,
      retrievedFacts: input.context.retrievedFacts.slice(
        0,
        input.personaKernelMode === 'muted'
          ? 2
          : input.personaKernelMode === 'backgrounded'
            ? 3
            : Math.max(1, input.context.retrievedFacts.length),
      ),
      activeThoughts: allowActiveThoughts
        ? input.personaKernelMode === 'muted'
          ? input.context.activeThoughts.slice(0, 2)
          : input.context.activeThoughts
        : [],
      recalledFragments: allowRecalledFragments
        ? input.context.recalledFragments.slice(
            0,
            input.personaKernelMode === 'backgrounded'
              ? Math.max(1, Math.min(2, Math.floor(Number(input.recallGovernor?.recalledFragmentCap ?? 2))))
              : Math.max(1, Math.floor(Number(input.recallGovernor?.recalledFragmentCap ?? 2))),
          )
        : [],
    } satisfies OrganicMemoryPromptContext
  }

  function buildPerformanceManifestSystemBlocks(manifest: CharacterPerformanceCapabilitiesManifest | null) {
    if (!manifest)
      return []

    const blocks = [
      '[ALICIZATION_VESSEL_CAPABILITIES]',
      `Current renderer: ${manifest.renderer}.`,
      'Use baseEmotion only from the supported list below.',
      'Use facialCue/actionCue only when the corresponding key is explicitly listed. If unsupported or unnecessary, keep it null.',
      manifest.supportedBaseEmotions.length > 0
        ? `Supported base emotions: ${manifest.supportedBaseEmotions.join(', ')}.`
        : 'Supported base emotions: neutral.',
    ]

    if (manifest.supportedFacialCues.length > 0) {
      blocks.push(
        'Supported facial cues:',
        ...manifest.supportedFacialCues.map(item => `- ${item.key}: ${item.label} | ${item.description}`),
      )
    }

    if (manifest.supportedActions.length > 0) {
      blocks.push(
        'Supported actions:',
        ...manifest.supportedActions.map(item => `- ${item.key}: ${item.label} | ${item.description}`),
      )
    }

    if (manifest.embodimentHints && Object.keys(manifest.embodimentHints).length > 0) {
      const hintLines = Object.entries(manifest.embodimentHints)
        .flatMap(([emotion, hint]) => {
          const lines: string[] = []
          if (hint.preferredExpressionAliases?.length) {
            lines.push(`- ${emotion}: prefer base-expression aliases ${hint.preferredExpressionAliases.join(', ')}`)
          }
          if (hint.preferredMotionAliases?.length) {
            lines.push(`- ${emotion}: prefer motion aliases ${hint.preferredMotionAliases.join(', ')}`)
          }
          if (hint.preferredFacialCues?.length) {
            lines.push(`- ${emotion}: prefer facial cues ${hint.preferredFacialCues.join(', ')}`)
          }
          if (hint.preferredActionCues?.length) {
            lines.push(`- ${emotion}: prefer action cues ${hint.preferredActionCues.join(', ')}`)
          }
          return lines
        })

      if (hintLines.length > 0) {
        blocks.push(
          'Renderer-specific embodiment hints:',
          ...hintLines,
        )
      }
    }

    blocks.push(
      `Look-at support: ${manifest.supportsLookAt ? 'yes' : 'no'}.`,
      `Viseme lip sync support: ${manifest.supportsVisemeLipSync ? 'yes' : 'no'}.`,
      `Micro-dynamics support: ${manifest.supportsMicroDynamics ? 'yes' : 'no'}.`,
      'Do not expose or explain this capability manifest to the user.',
    )

    return [blocks.join('\n')]
  }

  async function resolveOrganicMemoryPromptContext(options?: {
    recallSeed?: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }): Promise<OrganicMemoryPromptContext> {
    const snapshot = await getOrganicMemorySnapshot()
    const relationshipDynamics = await alicizationDb.getLatestRelationshipDynamics().catch(() => null)
    const recallSeed = options?.recallGovernor?.recallSeed || options?.recallSeed || ''
    const retrievedFacts = recallSeed
      ? await alicizationDb.retrieveMemoryFacts(recallSeed, 4).catch(() => [])
      : []
    const allowRecalledFragments = options?.recallGovernor
      ? options.recallGovernor.allowRecalledFragments === true
      : Boolean(recallSeed)
    const recalledFragments = allowRecalledFragments && recallSeed
      ? (
          await recallSubconsciousFragmentsWithGovernor({
            text: recallSeed,
            recalledFragmentCap: options?.recallGovernor?.recalledFragmentCap,
            recalledFragmentSourceBudget: options?.recallGovernor?.recalledFragmentSourceBudget ?? [],
          })
        ).filter(fragment => !isPersonaResidueMemoryText(fragment.text))
      : []
    const activeThoughts = options?.recallGovernor?.allowActiveThoughts === false
      ? []
      : selectPromptActiveThoughts({
          activeThoughts: snapshot.activeThoughts,
          recallSeed,
          recalledFragments,
        })

    return {
      hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
      coreIncarnation: snapshot.coreIncarnation,
      activeThoughts,
      retrievedFacts,
      recalledFragments,
      relationshipDynamics,
    }
  }

  async function resolveCardHostName(cardId: string, options?: { messages?: Message[] }) {
    const normalizedCardId = normalizeCardId(cardId)
    let readFailed = false
    try {
      if (normalizedCardId === activeCardId && soulSnapshot) {
        const hostName = sanitizeText(soulSnapshot.frontmatter.profile.hostName, '')
        if (hostName)
          return hostName
      }

      const targetSoulPath = resolveCardPaths(normalizedCardId).soulPath
      if (existsSync(targetSoulPath)) {
        const content = await readFile(targetSoulPath, 'utf-8')
        const hostName = sanitizeText(parseSoul(content).frontmatter.profile.hostName, '')
        if (hostName)
          return hostName
      }
    }
    catch (error) {
      readFailed = true
      await appendRuntimeDebugLine('host-name.resolve-error', {
        cardId: normalizedCardId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const fallback = extractHostNameFromMessages(options?.messages ?? [])
    if (fallback)
      return fallback

    if (readFailed) {
      await appendRuntimeDebugLine('host-name.resolve-fallback-empty', {
        cardId: normalizedCardId,
      })
    }
    return ''
  }

  function buildMainRuntimeCorePromptBlocks(input: {
    hostName?: string
  }) {
    const blocks: string[] = []
    if (alicizationFixedCoreSystemInstruction.trim())
      blocks.push(alicizationFixedCoreSystemInstruction.trim())

    const hostName = sanitizeText(input.hostName, '')
    if (hostName) {
      blocks.push(renderAlicizationPromptTemplate(alicizationFixedHostNameDirectiveTemplate, {
        hostName,
        source: 'host',
        content: '',
        iso: '',
        local: '',
        moduleName: '',
      }).trim())
    }

    if (alicizationFixedStructuredContractAnchor.trim())
      blocks.push(alicizationFixedStructuredContractAnchor.trim())

    return blocks.filter(Boolean)
  }

  async function resolveCardCustomDirectives(cardId: string, options?: { messages?: Message[] }): Promise<ResolvedCardCustomDirectives> {
    const normalizedCardId = normalizeCardId(cardId)
    let readFailed = false
    try {
      if (normalizedCardId === activeCardId && soulSnapshot) {
        const directives = normalizeCustomDirectives(soulSnapshot.frontmatter.custom_directives)
        if (directives) {
          return {
            text: directives,
            source: 'card-soul',
          }
        }
      }

      const targetSoulPath = resolveCardPaths(normalizedCardId).soulPath
      if (existsSync(targetSoulPath)) {
        const content = await readFile(targetSoulPath, 'utf-8')
        const directives = normalizeCustomDirectives(parseSoul(content).frontmatter.custom_directives)
        if (directives) {
          return {
            text: directives,
            source: 'card-soul',
          }
        }
      }
    }
    catch (error) {
      readFailed = true
      await appendRuntimeDebugLine('custom-directives.resolve-error', {
        cardId: normalizedCardId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const fallback = extractCustomDirectivesFromMessages(options?.messages ?? [])
    if (fallback) {
      return {
        text: fallback,
        source: 'payload-soul',
      }
    }

    return {
      text: '',
      source: readFailed ? 'error' : 'none',
    }
  }

  function sanitizeMainGatewayAgentTurnSegment(raw: unknown) {
    return sanitizeText(raw)
      .replace(/\s+/g, '-')
      .replace(/[^\w:-]+/g, '-')
      .slice(0, 120)
  }

  function buildMainGatewayAgentTurnId(...segments: Array<unknown>) {
    const normalized = segments
      .map(segment => sanitizeMainGatewayAgentTurnSegment(
        typeof segment === 'number' ? String(segment) : segment,
      ))
      .filter(Boolean)
    if (normalized.length > 0)
      return normalized.join(':')
    return `oneshot:${normalizeCardId(activeCardId)}:${Date.now()}`
  }

  function buildAgentRuntimeAuditSnapshot(agentTurn?: AlicizationAgentTurnRuntime | null) {
    if (!agentTurn)
      return null

    const session = agentTurn.getSessionSnapshot()
    return {
      agentSessionId: session.id,
      conversationSessionId: session.conversationSessionId,
      recentContinuity: session.continuitySignals.slice(-3).map(signal => ({
        kind: signal.kind,
        state: signal.state,
        label: sanitizeBriefText(signal.label, 120),
        summary: sanitizeBriefText(signal.summary ?? '', 180) || null,
      })),
      recentActions: session.tasks.slice(-4).map(task => ({
        kind: task.kind,
        status: task.status,
        label: sanitizeBriefText(task.label, 120),
        summary: sanitizeBriefText(task.summary ?? '', 180) || null,
      })),
      digitalLifeLine: sanitizeBriefText(
        session.digitalLifeSpine?.continuitySignal?.summary ?? '',
        220,
      ) || null,
      digitalLifeArchitecture: (session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)
        ? {
            operatingMode: (session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.operatingMode,
            dominantSystem: (session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.dominantSystem,
            supportingSystems: [...(session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.supportingSystems],
            governingFocus: sanitizeBriefText((session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.governingFocus ?? '', 180) || null,
            summary: sanitizeBriefText((session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.summary, 220) || null,
          }
        : null,
    }
  }

  function buildAgentTurnContinuitySystemMessages(input: {
    agentTurn: AlicizationAgentTurnRuntime
    cardId: string
  }): Message[] {
    const messages: Message[] = []
    const sessionId = sanitizeText(input.agentTurn.conversationSessionId, '')
    if (sessionId) {
      const mirrorBlock = dialogueSessionManager.buildSessionMirrorSystemBlock({
        cardId: input.cardId,
        sessionId,
      })
      if (mirrorBlock) {
        messages.push({
          role: 'system',
          content: mirrorBlock,
        } as Message)
      }
    }

    messages.push({
      role: 'system',
      content: input.agentTurn.buildSessionSystemBlock(),
    } as Message)
    return messages
  }

  function syncAgentTurnSessionMirror(input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    continuitySignals?: AlicizationAgentSessionContinuityInput[]
    decisionTraceId?: string | null
    sessionId?: string | null
    sessionPhases?: string[]
    source: string
  }) {
    const agentTurn = input.agentTurn
    if (!agentTurn)
      return

    if (input.continuitySignals?.length)
      agentTurn.ingestContinuitySignals(input.continuitySignals)

    const sessionId = sanitizeText(input.sessionId ?? agentTurn.conversationSessionId).slice(0, 160)
    if (!sessionId)
      return

    dialogueSessionManager.ingestAgentSessionSnapshot({
      agentSession: agentTurn.getSessionSnapshot(),
      cardId: normalizeCardId(input.cardId),
      decisionTraceId: input.decisionTraceId ?? null,
      sessionId,
      sessionPhases: input.sessionPhases ?? agentTurn.snapshot().phaseOrder,
      source: input.source,
    })
  }

  async function syncSessionMirrorFromCurrentCardState(input: {
    cardId: string
    decisionTraceId?: string | null
    proactiveOutcomes?: AlicizationRecentProactiveOutcome[]
    reminderAction?: {
      delayMinutes: number
      firedTurnId?: string | null
      task: {
        taskId: string
        triggerAt: number
        message: string
        sourceTurnId?: string | null
      }
      tier: 'mild' | 'severe'
      trigger: 'startup' | 'timer' | 'force'
    } | null
    sceneResidue?: AlicizationPerceptionSceneResidue | null
    sessionId?: string | null
    source: string
    taskThread?: AlicizationTaskThreadRecord | null
    turnId?: string | null
  }) {
    const cardId = normalizeCardId(input.cardId)
    const existingSessionId = normalizeSessionId(input.sessionId)
      || normalizeSessionId(activeSessionIdByCard.get(cardId))
      || normalizeSessionId(await alicizationDb.getLatestConversationSessionId().catch(() => undefined))
    if (!existingSessionId)
      return

    const agentTurn = await agentRuntime.openTurn({
      cardId,
      turnId: sanitizeText(input.turnId, '')
        || buildMainGatewayAgentTurnId('session-mirror', input.source, cardId, Date.now()),
      decisionTraceId: input.decisionTraceId ?? null,
    }).catch(() => null)
    if (!agentTurn)
      return

    const sessionContinuityContext = await resolveAgentSessionContinuityContext(cardId).catch(() => ({
      digitalLifeRuntimeSurface: null as AlicizationDigitalLifeRuntimeSurface | null,
      sessionContinuitySignals: [] as AlicizationAgentSessionContinuityInput[],
    }))
    const digitalLifeSpine = sessionContinuityContext.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(sessionContinuityContext.digitalLifeRuntimeSurface)
      : null
    if (digitalLifeSpine) {
      agentTurn.ingestDigitalLifeSpine(digitalLifeSpine)
      agentTurn.ingestDigitalLifeArchitecture(digitalLifeSpine.architecture)
    }
    const runtimeActions: AlicizationAgentSessionActionInput[] = []
    if (input.taskThread)
      runtimeActions.push(buildTaskThreadSessionMirrorAction({ thread: input.taskThread, source: input.source }))
    if (input.sceneResidue)
      runtimeActions.push(buildSceneResidueSessionMirrorAction({ residue: input.sceneResidue, source: input.source }))
    if (input.proactiveOutcomes?.length) {
      runtimeActions.push(...input.proactiveOutcomes.map(outcome => buildProactiveFeedbackSessionMirrorAction({
        outcome,
        source: input.source,
      })))
    }
    if (input.reminderAction)
      runtimeActions.push(buildReminderSessionMirrorAction(input.reminderAction))
    if (runtimeActions.length > 0)
      agentTurn.ingestRuntimeActions(runtimeActions)

    syncAgentTurnSessionMirror({
      agentTurn,
      cardId,
      continuitySignals: sessionContinuityContext.sessionContinuitySignals,
      decisionTraceId: input.decisionTraceId ?? null,
      sessionId: existingSessionId,
      source: input.source,
    })
  }

  async function generateMainGatewayText(options: {
    system: string
    user: Message['content']
    timeoutMs?: number
    source?: 'execution-callback' | 'reminder' | 'proactive' | 'dream' | 'screen-semantic' | 'scene-appraisal' | 'subjective-inference' | 'counterfactual-deliberation' | 'dialogue-turn-semantics'
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
  }) {
    const oneShotCardId = normalizeCardId(options.cardId ?? activeCardId)
    const agentTurn = options.agentTurn ?? await (async () => {
      if (!options.agentTurnInput)
        return null
      return await agentRuntime.openTurn({
        cardId: oneShotCardId,
        turnId: options.agentTurnInput.turnId,
        decisionTraceId: options.agentTurnInput.decisionTraceId ?? null,
      })
    })()
    const initialOneShotDigitalLifeSpine = options.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(options.digitalLifeRuntimeSurface)
      : null
    if (agentTurn) {
      agentTurn.ingestDigitalLifeSpine(initialOneShotDigitalLifeSpine)
      agentTurn.ingestDigitalLifeArchitecture(initialOneShotDigitalLifeSpine?.architecture ?? null)
    }

    const config = resolveMainGatewayConfig()
    if (!config) {
      await appendRuntimeDebugLine('main-gateway.one-shot-missing-config', {
        cardId: activeCardId,
        source: options.source ?? 'unknown',
        activeProviderId,
        activeModelId,
      })
      return null
    }

    const resolvedCustomDirectives = options.injectCustomDirectives === false
      ? { text: '', source: 'none' as const }
      : await resolveCardCustomDirectives(options.cardId ?? activeCardId)
    const customDirectiveBlock = options.injectCustomDirectives === false
      ? ''
      : buildCardCustomDirectivesSystemBlock(resolvedCustomDirectives.text)
    const executionCallbackContext = agentTurn?.conversationSessionId
      ? await executionCallbackRuntime.buildPendingExecutionCallbackContext({
          sessionId: agentTurn.conversationSessionId,
        }).catch(() => emptyAlicizationExecutionCallbackContext)
      : emptyAlicizationExecutionCallbackContext
    const sessionContinuityContext = agentTurn
      ? await resolveAgentSessionContinuityContext(oneShotCardId, {
          digitalLifeRuntimeSurface: options.digitalLifeRuntimeSurface ?? null,
        }).catch(() => ({
          digitalLifeRuntimeSurface: options.digitalLifeRuntimeSurface ?? null,
          sessionContinuitySignals: [] as AlicizationAgentSessionContinuityInput[],
        }))
      : {
          digitalLifeRuntimeSurface: options.digitalLifeRuntimeSurface ?? null,
          sessionContinuitySignals: [] as AlicizationAgentSessionContinuityInput[],
        }
    const oneShotDigitalLifeSpine = sessionContinuityContext.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(sessionContinuityContext.digitalLifeRuntimeSurface)
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

    if (agentTurn && options.captureAgentSensorySnapshot !== false) {
      await agentTurn.trackTool({
        phaseId: `tool:sensory:oneshot:${options.source ?? 'unknown'}`,
        kind: 'sensory',
        label: `sensory_snapshot:${options.source ?? 'unknown'}`,
        traceMetadata: {
          cardId: oneShotCardId,
          source: options.source ?? 'unknown',
          turnId: options.agentTurnInput?.turnId ?? null,
        },
        run: async () => await agentTurn.getSensorySnapshot(),
        summarizeSuccess: snapshot => [
          `foreground=${snapshot.sample.foregroundWindow?.appName ?? snapshot.sample.foregroundWindow?.processName ?? 'unknown'}`,
          `capture=${snapshot.capture?.health ?? 'unknown'}/${snapshot.capture?.permission ?? 'unknown'}`,
        ].join(' '),
      })
    }

    const performanceManifest = await getPerformanceManifest()
    const oneShotArchitectureSystemBlock = !agentTurn
      ? buildAlicizationDigitalLifeArchitectureSystemBlock(oneShotDigitalLifeArchitecture)
      : ''
    const systemMessages: Message[] = [
      ...(customDirectiveBlock
        ? [{ role: 'system', content: customDirectiveBlock } as Message]
        : []),
      ...(options.injectPerformanceManifest === false
        ? []
        : buildPerformanceManifestSystemBlocks(performanceManifest)
            .map(content => ({ role: 'system', content }) as Message)),
      ...(executionCallbackContext.systemBlock
        ? [{ role: 'system', content: executionCallbackContext.systemBlock } as Message]
        : []),
      ...(agentTurn
        ? buildAgentTurnContinuitySystemMessages({
            agentTurn,
            cardId: oneShotCardId,
          })
        : []),
      ...(oneShotArchitectureSystemBlock
        ? [{ role: 'system', content: oneShotArchitectureSystemBlock } as Message]
        : []),
      ...((options.extraSystemBlocks ?? [])
        .map(block => sanitizeMultilineText(block))
        .filter(Boolean)
        .map(content => ({ role: 'system', content }) as Message)),
      { role: 'system', content: options.system } as Message,
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(createAbortError('main-gateway-timeout'))
      }
    }, Math.max(1_000, options.timeoutMs ?? 18_000))

    try {
      const runGeneration = async () => {
        const result = await generateText({
          ...config.provider.chat(config.model),
          maxSteps: 1,
          messages: [
            ...systemMessages,
            { role: 'user', content: options.user } as Message,
          ],
          headers: config.headers,
          abortSignal: controller.signal,
        })
        const fullText = (result.text ?? '').trim()
        await appendRuntimeDebugLine('main-gateway.one-shot-finished', {
          cardId: oneShotCardId,
          source: options.source ?? 'unknown',
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
            phaseId: `tool:runtime:main-gateway:${options.source ?? 'unknown'}`,
            kind: 'runtime',
            label: `main_gateway:${options.source ?? 'unknown'}`,
            metadata: {
              source: options.source ?? 'unknown',
              turnId: options.agentTurnInput?.turnId ?? null,
            },
            traceMetadata: {
              cardId: oneShotCardId,
              source: options.source ?? 'unknown',
              turnId: options.agentTurnInput?.turnId ?? null,
              decisionTraceId: options.agentTurnInput?.decisionTraceId ?? null,
            },
            run: runGeneration,
            summarizeSuccess: value => value
              ? `one-shot completed with ${value.length} chars`
              : 'one-shot completed with empty response',
            summarizeError: error => sanitizeBriefText(errorMessageFrom(error) ?? 'main-gateway-failed', 160),
          })
        : await runGeneration()
      if (fullText) {
        syncAgentTurnSessionMirror({
          agentTurn,
          cardId: oneShotCardId,
          decisionTraceId: options.agentTurnInput?.decisionTraceId ?? null,
          source: options.source ?? 'unknown',
        })
      }
      return fullText
    }
    catch (error) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.main-gateway',
        action: 'one-shot-failed',
        message: 'Main gateway one-shot generation failed; fallback path used.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
          model: config.model,
          providerId: config.providerId,
          source: options.source ?? 'unknown',
        },
      })
      return null
    }
    finally {
      clearTimeout(timeout)
    }
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
      `Focus target: ${describePerceptionTarget(input.focusTarget)}`,
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
    summary: AlicizationScreenSemanticSummary
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
    } satisfies AlicizationScreenSemanticSummary
  }

  function hasMeaningfulScreenSemanticSummary(summary: AlicizationScreenSemanticSummary | null | undefined) {
    if (!summary)
      return false
    if (summary.content.summary)
      return true
    return summary.workload.kind !== 'unknown' || summary.content.kind !== 'unknown'
  }

  function buildScreenSemanticSceneResidue(input: {
    now: number
    summary: AlicizationScreenSemanticSummary
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
        turnId: buildMainGatewayAgentTurnId('screen-semantic', input.cardId, input.source.id, input.now),
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
    summary: AlicizationScreenSemanticSummary | null
    capture: ReturnType<typeof deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot>
  }> {
    const cardId = normalizeCardId(input.cardId)
    const cached = screenSemanticCacheByCard.get(cardId)
    const perceptionState = input.perceptionState ?? await ensurePerceptionState(cardId)
    const invitedInspectionActive = Boolean(
      perceptionState.invitedInspection
      && perceptionState.invitedInspection.activeUntil > input.now,
    )
    const reusableResidue = getUsablePerceptionSceneResidue({
      state: perceptionState,
      now: input.now,
      maxAgeMs: 2 * 60_000,
    })
    if (invitedInspectionActive) {
      if (reusableResidue) {
        const reusedSummary = buildScreenSemanticSummaryFromResidue(reusableResidue)
        screenSemanticCacheByCard.set(cardId, {
          key: [
            'scene-residue',
            reusableResidue.observedAt,
            reusableResidue.source,
            reusableResidue.captureSourceName ?? '',
          ].join(':'),
          summary: reusedSummary,
          updatedAt: input.now,
        })
        return {
          summary: reusedSummary,
          capture: null,
        }
      }

      screenSemanticCacheByCard.set(cardId, {
        key: 'invited-inspection-active',
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'invited-inspection-active',
      })
      return {
        summary: null,
        capture: null,
      }
    }

    const captureAccessRequest = {
      types: ['window', 'screen'] as Array<'window' | 'screen'>,
      thumbnailSize: { width: 640, height: 360 },
    }
    const captureAccess = await resolveDesktopCaptureAccess(captureAccessRequest)
    const capture = deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot(
      desktopCaptureAccessRuntime.getSnapshot(captureAccessRequest),
    )
    const sources = captureAccess.sources
    if (sources.length === 0) {
      screenSemanticCacheByCard.set(cardId, {
        key: captureAccess.unavailableReason ?? 'screen-semantic-source-unavailable',
        summary: null,
        updatedAt: input.now,
        unavailableReason: captureAccess.unavailableReason ?? captureAccess.probeError,
      })
      return {
        summary: null,
        capture,
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
      screenSemanticCacheByCard.set(cardId, {
        key: 'no-candidate',
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'screen-semantic-source-unavailable',
      })
      return {
        summary: null,
        capture,
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
        summary: cached.summary,
        capture,
      }
    }

    const imageDataUrl = buildCompressedNativeImageDataUrl({
      image: candidate.source.thumbnail,
      maxWidth: proactiveScreenSemanticImageMaxWidth,
      maxHeight: proactiveScreenSemanticImageMaxHeight,
      jpegQuality: proactiveScreenSemanticImageJpegQuality,
    })
    if (!imageDataUrl) {
      screenSemanticCacheByCard.set(cardId, {
        key: candidateKey,
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'screen-semantic-thumbnail-empty',
      })
      return {
        summary: null,
        capture,
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
      screenSemanticCacheByCard.set(cardId, {
        key: candidateKey,
        summary: null,
        updatedAt: input.now,
        unavailableReason: semanticResult.unavailableReason,
      })
      return {
        summary: null,
        capture,
      }
    }
    await rememberSceneResidue({
      cardId,
      now: input.now,
      residue: buildScreenSemanticSceneResidue({
        now: input.now,
        summary,
        focusTarget: candidate.focusTarget,
      }),
    })
    screenSemanticCacheByCard.set(cardId, {
      key: candidateKey,
      summary,
      updatedAt: input.now,
      unavailableReason: undefined,
    })
    return {
      summary,
      capture,
    }
  }

  function resolveChatMessages(
    payload: AlicizationChatStartPayload,
    options?: {
      redactStaleInspectionHistoryForUserText?: string
    },
  ): Message[] {
    const sourceMessages = options?.redactStaleInspectionHistoryForUserText
      ? redactStaleInspectionHistoryMessages(payload.messages, options.redactStaleInspectionHistoryForUserText)
      : payload.messages

    return sourceMessages.flatMap((message) => {
      const rawRole = typeof (message as { role?: unknown }).role === 'string'
        ? (message as { role: string }).role
        : ''
      const role = rawRole === 'developer'
        ? 'system'
        : rawRole

      if (role === 'error')
        return []
      if (role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool')
        return []

      if (role === 'tool') {
        return [{
          role: 'tool',
          content: normalizeTransportMessageContent(message.content),
          tool_call_id: sanitizeText(message.toolCallId),
        } as Message]
      }

      return [{
        // NOTICE: Renderer session history may contain UI-only pseudo roles such as
        // `error`. OpenAI-compatible providers only accept the standard chat roles,
        // and some compatibility gateways hang instead of returning a validation error.
        role,
        content: normalizeTransportMessageContent(message.content),
      } as Message]
    })
  }

  const mainChatStartEagerPreparationBudgetMs = 120

  async function executeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    task: AlicizationClawTaskIntent
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'cli' | 'codex' | 'claudeCode' | 'openclaw'>
  }) {
    return await executorRuntime.executeMainGatewayTaskThread(input)
  }

  function toAlicizationChatStreamDispatchPayload(
    eventType: AlicizationChatStreamDispatchPayload['eventType'],
    body: AlicizationChatMetaEvent | AlicizationChatStreamChunkEvent | AlicizationChatToolCallEvent | AlicizationChatToolResultEvent | AlicizationChatFinishEvent | AlicizationChatErrorEvent | AlicizationDialogueRespondedPayload,
  ): AlicizationChatStreamDispatchPayload {
    switch (eventType) {
      case 'meta':
        return { eventType, body: body as AlicizationChatMetaEvent }
      case 'chunk':
        return { eventType, body: body as AlicizationChatStreamChunkEvent }
      case 'tool-call':
        return { eventType, body: body as AlicizationChatToolCallEvent }
      case 'tool-result':
        return { eventType, body: body as AlicizationChatToolResultEvent }
      case 'finish':
        return { eventType, body: body as AlicizationChatFinishEvent }
      case 'error':
        return { eventType, body: body as AlicizationChatErrorEvent }
      case 'dialogue-responded':
        return { eventType, body: body as AlicizationDialogueRespondedPayload }
    }
  }

  function emitChatStreamEventForState(
    state: ChatRunState | undefined,
    eventType: StreamDispatchEventType,
    body: AlicizationChatMetaEvent | AlicizationChatStreamChunkEvent | AlicizationChatToolCallEvent | AlicizationChatToolResultEvent | AlicizationChatFinishEvent | AlicizationChatErrorEvent,
  ) {
    if (!state)
      return

    const sender = state.sender
    if (sender && !sender.isDestroyed()) {
      try {
        sender.send(alicizationChatStreamDispatchChannel, toAlicizationChatStreamDispatchPayload(eventType, body))
        if (!state.hasLoggedDispatchBinding) {
          state.hasLoggedDispatchBinding = true
          void queueScopedAuditLog(state.cardId, {
            level: 'notice',
            category: 'alicization.main-gateway',
            action: 'stream-dispatch-bound',
            message: 'Bound main chat stream dispatch to the originating renderer sender.',
            payload: {
              cardId: state.cardId,
              turnId: state.turnId,
              eventType,
              senderId: sender.id,
            },
          })
          void appendRuntimeDebugLine('chat-stream.dispatch-bound', {
            cardId: state.cardId,
            turnId: state.turnId,
            eventType,
            senderId: sender.id,
          })
        }
        return
      }
      catch (error) {
        void queueScopedAuditLog(state.cardId, {
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'stream-dispatch-failed',
          message: 'Failed to dispatch main chat stream event to the originating renderer sender.',
          payload: {
            cardId: state.cardId,
            turnId: state.turnId,
            eventType,
            senderId: sender.id,
            reason: error instanceof Error ? error.message : String(error),
          },
        })
        void appendRuntimeDebugLine('chat-stream.dispatch-failed', {
          cardId: state.cardId,
          turnId: state.turnId,
          eventType,
          senderId: sender.id,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const eventaOptions = state.rawInvokeOptions?.ipcMainEvent
      ? {
          raw: {
            ipcMainEvent: state.rawInvokeOptions.ipcMainEvent,
            event: state.rawInvokeOptions.event,
          },
        }
      : undefined

    const eventaEvent = eventType === 'meta'
      ? alicizationChatStreamMeta
      : eventType === 'chunk'
        ? alicizationChatStreamChunk
        : eventType === 'tool-call'
          ? alicizationChatStreamToolCall
          : eventType === 'tool-result'
            ? alicizationChatStreamToolResult
            : eventType === 'finish'
              ? alicizationChatStreamFinish
              : alicizationChatStreamError

    if (eventaOptions) {
      context.emit(eventaEvent, body, eventaOptions)
      return
    }

    context.emit(eventaEvent, body)
  }

  async function prepareMainChatPrelude(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ): Promise<AlicizationPreparedMainChatPrelude> {
    const chatConfig = mainGateway.provider.chat(mainGateway.model)
    const latestUserText = readLatestUserMessageText(payload.messages)
    const senderWebContentsId = senderWebContentsIdFromInvokeOptions(invokeOptions)
    const executionCapabilityInquiry = detectAlicizationExecutionCapabilityInquiry(latestUserText || '')
    const explicitExecutionRoutingIntent = detectMainGatewayExecutionRoutingIntent({
      userText: latestUserText || '',
      capabilityInquiry: executionCapabilityInquiry,
    })
    const shouldBypassPerception = latestUserText
      ? isInternalAlicizationRepairPrompt(latestUserText)
      : false
    let messages = resolveChatMessages(payload, {
      redactStaleInspectionHistoryForUserText: shouldBypassPerception ? '' : latestUserText,
    })
    messages = preserveLatestUserMultimodalContent({
      originalMessages: payload.messages,
      resolvedMessages: messages,
    })

    const contextualStringPromise = shouldBypassPerception
      ? Promise.resolve('')
      : buildMainChatContextualString(payload)
    const executionCallbackContextPromise = shouldBypassPerception
      ? Promise.resolve(emptyAlicizationExecutionCallbackContext)
      : buildMainChatExecutionCallbackContext(payload)
    const executionLedgerContextPromise = shouldBypassPerception
      ? Promise.resolve(emptyAlicizationExecutionLedgerContext)
      : buildMainChatExecutionLedgerContext(payload)
    const perceptionAugmentation = latestUserText && !shouldBypassPerception
      ? await augmentMainChatMessagesWithPerception({
          cardId: payload.cardId,
          userText: latestUserText,
          messages,
          senderWebContentsId,
          skipInspectionGrounding: Boolean(explicitExecutionRoutingIntent),
        })
      : {
          messages,
          systemBlocks: [] as string[],
          promptSystemBlocks: [] as string[],
          digitalLifeRuntimeSurface: null,
          memoryRecallSeed: '',
          recallGovernor: null as AlicizationRecallGovernorSnapshot | null,
          capture: {
            inspectionRequested: false,
            groundedThisTurn: false,
            snapshot: null,
            fallbackReason: null,
          },
          chatGovernance: {
            suppressAssociativeRecall: false,
            turnMode: 'answer' as const,
            personaKernelMode: 'full' as const,
            mindTurnGovernance: null,
          },
        }
    messages = perceptionAugmentation.messages
    const actionObligation = deriveMainChatActionObligation({
      userText: latestUserText || '',
      capabilityInquiry: executionCapabilityInquiry,
      explicitRoutingIntent: explicitExecutionRoutingIntent,
      runtimeSurface: perceptionAugmentation.digitalLifeRuntimeSurface,
    })

    return {
      actionObligation,
      chatConfig,
      messages,
      contextualStringPromise,
      executionCallbackContextPromise,
      executionLedgerContextPromise,
      executionCapabilityInquiry,
      executionRoutingIntent: actionObligation.routingIntent ?? explicitExecutionRoutingIntent,
      perceptionAugmentation,
    }
  }

  async function prepareMainChatExecution(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
    preludePromise?: Promise<AlicizationPreparedMainChatPrelude>,
  ): Promise<AlicizationPreparedMainChatExecutionResult> {
    const prelude = await (preludePromise ?? prepareMainChatPrelude(payload, mainGateway))
    return await mainChatSessionRuntime.prepareExecution({
      payload,
      prelude,
    })
  }

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
      settlePendingProactiveOutcomesFromUserTurn,
      resolveMainGatewayConfig,
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
