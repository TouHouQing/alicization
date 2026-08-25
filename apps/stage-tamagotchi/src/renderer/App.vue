<script setup lang="ts">
import type {
  AlicizationBridgeChatStreamEvent,
  AlicizationVisualPresenceStateSnapshot as AlicizationBridgeVisualPresenceStateSnapshot,
} from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type { AlicizationCardScope, AlicizationChatAbortPayload, AlicizationChatAbortResult, AlicizationChatErrorEvent, AlicizationChatFinishEvent, AlicizationChatMetaEvent, AlicizationChatStartPayload, AlicizationChatStartResult, AlicizationChatStreamChunkEvent, AlicizationChatStreamDispatchPayload, AlicizationChatToolCallEvent, AlicizationChatToolProgressEvent, AlicizationChatToolResultEvent, AlicizationDialogueRespondedPayload, AlicizationKillSwitchSnapshot, AlicizationLlmConfigPayload, AlicizationPresencePulsePayload, AlicizationSafetyPermissionRequest, AlicizationSoulSnapshot, AlicizationTurnToolProjectionReplayRecord, AlicizationVisualPresenceStateChangedPayload } from '../shared/eventa'

import { defineInvokeHandler } from '@moeru/eventa'
import { useElectronEventaContext, useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { themeColorFromValue, useThemeColor } from '@proj-alicization/stage-layouts/composables/theme-color'
import { sanitizeCharacterPerformanceManifest } from '@proj-alicization/stage-shared'
import { ToasterRoot } from '@proj-alicization/stage-ui/components'
import { clearAlicizationBridge, setAlicizationBridge } from '@proj-alicization/stage-ui/stores/alicization-bridge'
import { useAlicizationEpoch1Store } from '@proj-alicization/stage-ui/stores/alicization-epoch1'
import { useAlicizationPresenceDispatcherStore } from '@proj-alicization/stage-ui/stores/alicization-presence-dispatcher'
import { useSharedAnalyticsStore } from '@proj-alicization/stage-ui/stores/analytics'
import { useCharacterOrchestratorStore } from '@proj-alicization/stage-ui/stores/character'
import {
  projectRecoveredTurnToolProjectionsIntoMessages,
  removeChatInfrastructureErrorMessage,
  replaceChatAssistantTextPreservingToolProjection,
  upsertChatInfrastructureErrorMessage,
} from '@proj-alicization/stage-ui/stores/chat-tool-projection'
import { useChatSessionStore } from '@proj-alicization/stage-ui/stores/chat/session-store'
import { usePluginHostInspectorStore } from '@proj-alicization/stage-ui/stores/devtools/plugin-host-debug'
import { useDisplayModelsStore } from '@proj-alicization/stage-ui/stores/display-models'
import { clearMcpToolBridge, setMcpToolBridge } from '@proj-alicization/stage-ui/stores/mcp-tool-bridge'
import { useModsServerChannelStore } from '@proj-alicization/stage-ui/stores/mods/api/channel-server'
import { useContextBridgeStore } from '@proj-alicization/stage-ui/stores/mods/api/context-bridge'
import { useAiriCardStore } from '@proj-alicization/stage-ui/stores/modules/airi-card'
import { useConsciousnessStore } from '@proj-alicization/stage-ui/stores/modules/consciousness'
import { usePerfTracerBridgeStore } from '@proj-alicization/stage-ui/stores/perf-tracer-bridge'
import { listProvidersForPluginHost, shouldPublishPluginHostCapabilities } from '@proj-alicization/stage-ui/stores/plugin-host-capabilities'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { useSettings } from '@proj-alicization/stage-ui/stores/settings'
import { useTheme } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { toast, Toaster } from 'vue-sonner'

import AlicizationHitlModal from './components/AlicizationHitlModal.vue'
import ResizeHandler from './components/ResizeHandler.vue'

import { sanitizeAlicizationChatStartPayloadForTransport, summarizeAlicizationChatStartPayloadForTransport } from '../shared/alicization-chat-transport'
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

  alicizationSafetyPermissionRequested,
  alicizationSoulChanged,
  electronAlicizationAckDialogue,
  electronAlicizationAppendAuditLog,
  electronAlicizationAppendConversationTurn,
  electronAlicizationAppendExecutionEvents,
  electronAlicizationBootstrap,
  electronAlicizationChatAbort,
  electronAlicizationChatStart,
  electronAlicizationClearAllConversations,
  electronAlicizationCorrectHumanlikeMemoryAudit,
  electronAlicizationDeleteAllData,
  electronAlicizationDeleteCardScope,
  electronAlicizationDispatchTaskThread,
  electronAlicizationGetMemoryStats,
  electronAlicizationGetOrganicMemorySnapshot,
  electronAlicizationGetPerformanceManifest,
  electronAlicizationGetSelfEvolutionState,
  electronAlicizationGetSensorySnapshot,
  electronAlicizationGetSoul,
  electronAlicizationGetVisualPresenceState,
  electronAlicizationInitializeGenesis,
  electronAlicizationKillSwitchGetState,
  electronAlicizationKillSwitchResume,
  electronAlicizationKillSwitchSuspend,
  electronAlicizationListChannelCapabilityManifests,
  electronAlicizationListConversationTurns,
  electronAlicizationListExecutionEvents,
  electronAlicizationListExecutorSessions,
  electronAlicizationListHumanlikeMemoryAudit,
  electronAlicizationListMemoryDecisionTraces,
  electronAlicizationListMindTurnEvents,
  electronAlicizationListTaskThreads,
  electronAlicizationListTurnToolProjections,
  electronAlicizationLlmGetConfig,
  electronAlicizationLlmSyncConfig,
  electronAlicizationMemoryImportLegacy,
  electronAlicizationMemoryRetrieveFacts,
  electronAlicizationMemoryUpsertFacts,
  electronAlicizationMemoryWorkbenchApplyLongTermAction,
  electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction,
  electronAlicizationMemoryWorkbenchApplyReviewAction,
  electronAlicizationMemoryWorkbenchBuildMonthlyGoldRegression,
  electronAlicizationMemoryWorkbenchCancelPersonaTraining,
  electronAlicizationMemoryWorkbenchCancelQualityTrial,
  electronAlicizationMemoryWorkbenchGetPersonaRuntimeConfig,
  electronAlicizationMemoryWorkbenchGetPersonaTrainingExecutorConfig,
  electronAlicizationMemoryWorkbenchGetPersonaTrainingRun,
  electronAlicizationMemoryWorkbenchGetSnapshot,
  electronAlicizationMemoryWorkbenchListEmbeddingModels,
  electronAlicizationMemoryWorkbenchListLongTerm,
  electronAlicizationMemoryWorkbenchListPersonaCandidates,
  electronAlicizationMemoryWorkbenchListPersonaTrainingIncrements,
  electronAlicizationMemoryWorkbenchListPersonaTrainingRuns,
  electronAlicizationMemoryWorkbenchListQualityGoldLabels,
  electronAlicizationMemoryWorkbenchListQualityTrialReports,
  electronAlicizationMemoryWorkbenchListReplaySessions,
  electronAlicizationMemoryWorkbenchManageSemanticScaleJobs,
  electronAlicizationMemoryWorkbenchManageWorkingMemoryCleaningQueue,
  electronAlicizationMemoryWorkbenchRecallProbe,
  electronAlicizationMemoryWorkbenchRecordQualityGoldLabel,
  electronAlicizationMemoryWorkbenchReindexEmbeddings,
  electronAlicizationMemoryWorkbenchRollbackPersonaTrainingIncrement,
  electronAlicizationMemoryWorkbenchRunPersonaTraining,
  electronAlicizationMemoryWorkbenchRunQualityTrial,
  electronAlicizationMemoryWorkbenchSetPersonaRuntimeConfig,
  electronAlicizationMemoryWorkbenchSetPersonaTrainingExecutorConfig,
  electronAlicizationMemoryWorkbenchTestEmbeddingConnection,
  electronAlicizationMemoryWorkbenchTestPersonaRuntime,
  electronAlicizationMemoryWorkbenchTestPersonaTrainingExecutor,
  electronAlicizationPlanTaskThread,
  electronAlicizationRealtimeExecute,
  electronAlicizationReminderSchedule,
  electronAlicizationReplayDialogues,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationRunMemoryPrune,
  electronAlicizationRunReplayBenchmark,
  electronAlicizationSafetyResolvePermission,
  electronAlicizationSearchOrganicSubconsciousFragments,
  electronAlicizationSetActiveSession,
  electronAlicizationSetPerformanceManifest,
  electronAlicizationSkillWorkbenchActivate,
  electronAlicizationSkillWorkbenchList,
  electronAlicizationSkillWorkbenchRevoke,
  electronAlicizationSkillWorkbenchRollback,
  electronAlicizationSubconsciousForceDream,
  electronAlicizationSubconsciousForceTick,
  electronAlicizationSubconsciousGetState,
  electronAlicizationUpdateMemoryStats,
  electronAlicizationUpdatePersonality,
  electronAlicizationUpdateSoul,
  electronAlicizationUpsertChannelCapabilityManifest,
  electronAlicizationUpsertExecutorSession,
  electronAlicizationUpsertTaskThread,
  electronAlicizationVisualPresenceChanged,
  electronAlicizationVisualPresenceStateChanged,
  electronGetServerChannelConfig,
  electronMcpCallTool,
  electronMcpListTools,
  electronPluginInspect,
  electronPluginList,
  electronPluginLoad,
  electronPluginLoadEnabled,
  electronPluginSetEnabled,
  electronPluginUnload,
  electronPluginUpdateCapability,
  electronSettingsNavigate,
  electronStartTrackMousePosition,
  i18nSetLocale,
  pluginProtocolListProviders,
  pluginProtocolListProvidersEventName,
} from '../shared/eventa'
import {
  AlicizationChatAbortUnconfirmedError,
  bridgeAlicizationChatAbortedFinishEventToStreamErrorEvent,
  bridgeAlicizationChatChunkEventToStreamEvent,
  bridgeAlicizationChatErrorEventToStreamEvent,
  bridgeAlicizationChatFinishEventToStreamEvent,
  bridgeAlicizationChatMetaEventToStreamEvent,
  bridgeAlicizationChatStartResultToStreamEvent,
  createAlicizationChatStartAbortCoordinator,
  createAlicizationChatStreamLifecycle,
} from './alicization-chat-stream-bridge'
import {
  createAlicizationChatStreamIngressDeduplicator,
  resolveAlicizationLogicalChatStreamTurnId,
  scheduleAlicizationLateToolEventDisposal,
} from './alicization-chat-stream-routing'
import { normalizeChatStructuredRecord, resolveVisibleReasoning } from './alicization-chat-structured-record'
import {
  refreshAlicizationProactiveAssistantMessage,
} from './alicization-proactive-turn-projection'
import {
  createAlicizationRendererReconcileKey,
  isAlicizationRendererReconcileCurrent,
} from './alicization-reconcile-scope'
import {
  clearAlicizationSessionRecoveryFailure,
  projectAlicizationSessionRecoveryFailure,
} from './alicization-session-recovery-projection'
import { initializeStageThreeRuntimeTraceBridge } from './bridges/stage-three-runtime-trace'
import { useServerChannelSettingsStore } from './stores/settings/server-channel'
import { useStageWindowLifecycleStore } from './stores/stage-window-lifecycle'

type AlicizationBridgeChatFinishEvent = Extract<AlicizationBridgeChatStreamEvent, { type: 'finish' }>

const { isDark: dark } = useTheme()
const i18n = useI18n()
const contextBridgeStore = useContextBridgeStore()
const displayModelsStore = useDisplayModelsStore()
const settingsStore = useSettings()
const providersStore = useProvidersStore()
const consciousnessStore = useConsciousnessStore()
const { language, themeColorsHue, themeColorsHueDynamic } = storeToRefs(settingsStore)
const { providers } = storeToRefs(providersStore)
const { activeProvider, activeModel } = storeToRefs(consciousnessStore)
const serverChannelSettingsStore = useServerChannelSettingsStore()
const router = useRouter()
const route = useRoute()
const cardStore = useAiriCardStore()
const { activeCardId } = storeToRefs(cardStore)
const chatSessionStore = useChatSessionStore()
const { activeSessionId } = storeToRefs(chatSessionStore)
const chatStreamIngressDeduplicator = createAlicizationChatStreamIngressDeduplicator()
const serverChannelStore = useModsServerChannelStore()
const characterOrchestratorStore = useCharacterOrchestratorStore()
const analyticsStore = useSharedAnalyticsStore()
const alicizationEpoch1Store = useAlicizationEpoch1Store()
const alicizationPresenceDispatcherStore = useAlicizationPresenceDispatcherStore()
const pluginHostInspectorStore = usePluginHostInspectorStore()
const stageWindowLifecycleStore = useStageWindowLifecycleStore()
const context = useElectronEventaContext()
const getServerChannelConfig = useElectronEventaInvoke(electronGetServerChannelConfig)
const listPlugins = useElectronEventaInvoke(electronPluginList)
const setPluginEnabled = useElectronEventaInvoke(electronPluginSetEnabled)
const loadEnabledPlugins = useElectronEventaInvoke(electronPluginLoadEnabled)
const loadPlugin = useElectronEventaInvoke(electronPluginLoad)
const unloadPlugin = useElectronEventaInvoke(electronPluginUnload)
const inspectPluginHost = useElectronEventaInvoke(electronPluginInspect)
const startTrackingCursorPoint = useElectronEventaInvoke(electronStartTrackMousePosition)
const reportPluginCapability = useElectronEventaInvoke(electronPluginUpdateCapability)
const listMcpTools = useElectronEventaInvoke(electronMcpListTools)
const callMcpTool = useElectronEventaInvoke(electronMcpCallTool)
const setLocale = useElectronEventaInvoke(i18nSetLocale)
const alicizationBootstrap = useElectronEventaInvoke(electronAlicizationBootstrap)
const alicizationGetSoul = useElectronEventaInvoke(electronAlicizationGetSoul)
const alicizationInitializeGenesis = useElectronEventaInvoke(electronAlicizationInitializeGenesis)
const alicizationUpdateSoul = useElectronEventaInvoke(electronAlicizationUpdateSoul)
const alicizationUpdatePersonality = useElectronEventaInvoke(electronAlicizationUpdatePersonality)
const alicizationGetKillSwitchState = useElectronEventaInvoke(electronAlicizationKillSwitchGetState)
const alicizationSuspendKillSwitch = useElectronEventaInvoke(electronAlicizationKillSwitchSuspend)
const alicizationResumeKillSwitch = useElectronEventaInvoke(electronAlicizationKillSwitchResume)
const alicizationListConversationTurns = useElectronEventaInvoke(electronAlicizationListConversationTurns)
const alicizationListTurnToolProjections = useElectronEventaInvoke(electronAlicizationListTurnToolProjections)
const alicizationListMindTurnEvents = useElectronEventaInvoke(electronAlicizationListMindTurnEvents)
const alicizationListMemoryDecisionTraces = useElectronEventaInvoke(electronAlicizationListMemoryDecisionTraces)
const alicizationListHumanlikeMemoryAudit = useElectronEventaInvoke(electronAlicizationListHumanlikeMemoryAudit)
const alicizationCorrectHumanlikeMemoryAudit = useElectronEventaInvoke(electronAlicizationCorrectHumanlikeMemoryAudit)
const alicizationRunReplayBenchmark = useElectronEventaInvoke(electronAlicizationRunReplayBenchmark)
const alicizationUpsertTaskThread = useElectronEventaInvoke(electronAlicizationUpsertTaskThread)
const alicizationListTaskThreads = useElectronEventaInvoke(electronAlicizationListTaskThreads)
const alicizationUpsertChannelCapabilityManifest = useElectronEventaInvoke(electronAlicizationUpsertChannelCapabilityManifest)
const alicizationListChannelCapabilityManifests = useElectronEventaInvoke(electronAlicizationListChannelCapabilityManifests)
const alicizationUpsertExecutorSession = useElectronEventaInvoke(electronAlicizationUpsertExecutorSession)
const alicizationListExecutorSessions = useElectronEventaInvoke(electronAlicizationListExecutorSessions)
const alicizationAppendExecutionEvents = useElectronEventaInvoke(electronAlicizationAppendExecutionEvents)
const alicizationListExecutionEvents = useElectronEventaInvoke(electronAlicizationListExecutionEvents)
const alicizationPlanTaskThread = useElectronEventaInvoke(electronAlicizationPlanTaskThread)
const alicizationDispatchTaskThread = useElectronEventaInvoke(electronAlicizationDispatchTaskThread)
const alicizationGetMemoryStats = useElectronEventaInvoke(electronAlicizationGetMemoryStats)
const alicizationGetOrganicMemorySnapshot = useElectronEventaInvoke(electronAlicizationGetOrganicMemorySnapshot)
const alicizationGetSelfEvolutionState = useElectronEventaInvoke(electronAlicizationGetSelfEvolutionState)
const alicizationGetPerformanceManifest = useElectronEventaInvoke(electronAlicizationGetPerformanceManifest)
const alicizationRunMemoryPrune = useElectronEventaInvoke(electronAlicizationRunMemoryPrune)
const alicizationUpdateMemoryStats = useElectronEventaInvoke(electronAlicizationUpdateMemoryStats)
const alicizationRetrieveMemoryFacts = useElectronEventaInvoke(electronAlicizationMemoryRetrieveFacts)
const alicizationUpsertMemoryFacts = useElectronEventaInvoke(electronAlicizationMemoryUpsertFacts)
const alicizationImportLegacyMemory = useElectronEventaInvoke(electronAlicizationMemoryImportLegacy)
const memoryWorkbenchGetSnapshot = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchGetSnapshot)
const memoryWorkbenchListLongTerm = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListLongTerm)
const memoryWorkbenchApplyLongTermAction = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchApplyLongTermAction)
const memoryWorkbenchApplyReviewAction = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchApplyReviewAction)
const memoryWorkbenchRecallProbe = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchRecallProbe)
const memoryWorkbenchListPersonaCandidates = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListPersonaCandidates)
const memoryWorkbenchApplyPersonaCandidateAction = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction)
const memoryWorkbenchRunPersonaTraining = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchRunPersonaTraining)
const memoryWorkbenchGetPersonaTrainingRun = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchGetPersonaTrainingRun)
const memoryWorkbenchListPersonaTrainingRuns = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListPersonaTrainingRuns)
const memoryWorkbenchCancelPersonaTraining = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchCancelPersonaTraining)
const memoryWorkbenchGetPersonaTrainingExecutorConfig = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchGetPersonaTrainingExecutorConfig)
const memoryWorkbenchSetPersonaTrainingExecutorConfig = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchSetPersonaTrainingExecutorConfig)
const memoryWorkbenchTestPersonaTrainingExecutor = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchTestPersonaTrainingExecutor)
const memoryWorkbenchGetPersonaRuntimeConfig = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchGetPersonaRuntimeConfig)
const memoryWorkbenchSetPersonaRuntimeConfig = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchSetPersonaRuntimeConfig)
const memoryWorkbenchTestPersonaRuntime = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchTestPersonaRuntime)
const memoryWorkbenchRollbackPersonaTrainingIncrement = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchRollbackPersonaTrainingIncrement)
const memoryWorkbenchListPersonaTrainingIncrements = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListPersonaTrainingIncrements)
const skillWorkbenchList = useElectronEventaInvoke(electronAlicizationSkillWorkbenchList)
const skillWorkbenchActivate = useElectronEventaInvoke(electronAlicizationSkillWorkbenchActivate)
const skillWorkbenchRollback = useElectronEventaInvoke(electronAlicizationSkillWorkbenchRollback)
const skillWorkbenchRevoke = useElectronEventaInvoke(electronAlicizationSkillWorkbenchRevoke)
const memoryWorkbenchManageSemanticScaleJobs = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchManageSemanticScaleJobs)
const memoryWorkbenchManageWorkingMemoryCleaningQueue = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchManageWorkingMemoryCleaningQueue)
const memoryWorkbenchReindexEmbeddings = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchReindexEmbeddings)
const memoryWorkbenchListEmbeddingModels = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListEmbeddingModels)
const memoryWorkbenchTestEmbeddingConnection = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchTestEmbeddingConnection)
const memoryWorkbenchListReplaySessions = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListReplaySessions)
const memoryWorkbenchRunQualityTrial = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchRunQualityTrial)
const memoryWorkbenchCancelQualityTrial = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchCancelQualityTrial)
const memoryWorkbenchRecordQualityGoldLabel = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchRecordQualityGoldLabel)
const memoryWorkbenchListQualityGoldLabels = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListQualityGoldLabels)
const memoryWorkbenchListQualityTrialReports = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListQualityTrialReports)
const memoryWorkbenchBuildMonthlyGoldRegression = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchBuildMonthlyGoldRegression)
const alicizationSearchOrganicSubconsciousFragments = useElectronEventaInvoke(electronAlicizationSearchOrganicSubconsciousFragments)
const alicizationSetPerformanceManifest = useElectronEventaInvoke(electronAlicizationSetPerformanceManifest)
const alicizationAppendConversationTurn = useElectronEventaInvoke(electronAlicizationAppendConversationTurn)
const alicizationSetActiveSession = useElectronEventaInvoke(electronAlicizationSetActiveSession)
const alicizationAppendAuditLog = useElectronEventaInvoke(electronAlicizationAppendAuditLog)
const alicizationRealtimeExecute = useElectronEventaInvoke(electronAlicizationRealtimeExecute)
const alicizationGetSensorySnapshot = useElectronEventaInvoke(electronAlicizationGetSensorySnapshot)
const alicizationGetVisualPresenceState = useElectronEventaInvoke(electronAlicizationGetVisualPresenceState)
const alicizationGetSubconsciousState = useElectronEventaInvoke(electronAlicizationSubconsciousGetState)
const alicizationForceSubconsciousTick = useElectronEventaInvoke(electronAlicizationSubconsciousForceTick)
const alicizationForceDreaming = useElectronEventaInvoke(electronAlicizationSubconsciousForceDream)
const alicizationReportProactiveFeedback = useElectronEventaInvoke(electronAlicizationReportProactiveFeedback)
const alicizationSyncLlmConfig = useElectronEventaInvoke(electronAlicizationLlmSyncConfig)
const alicizationGetLlmConfig = useElectronEventaInvoke(electronAlicizationLlmGetConfig)
const alicizationAckDialogue = useElectronEventaInvoke(electronAlicizationAckDialogue)
const alicizationReplayDialogues = useElectronEventaInvoke(electronAlicizationReplayDialogues)
const alicizationChatStart = useElectronEventaInvoke(electronAlicizationChatStart)
const alicizationChatAbort = useElectronEventaInvoke(electronAlicizationChatAbort)
const alicizationReminderSchedule = useElectronEventaInvoke(electronAlicizationReminderSchedule)
const alicizationClearAllConversations = useElectronEventaInvoke(electronAlicizationClearAllConversations)
const alicizationDeleteCardScope = useElectronEventaInvoke(electronAlicizationDeleteCardScope)
const alicizationDeleteAllData = useElectronEventaInvoke(electronAlicizationDeleteAllData)
const alicizationResolvePermission = useElectronEventaInvoke(electronAlicizationSafetyResolvePermission)

const resolveAlicizationScope = () => ({ cardId: activeCardId.value || 'default' })
const isCurrentAlicizationCard = (cardId: string) => cardId === (activeCardId.value || 'default')
const currentHitlRequest = ref<AlicizationSafetyPermissionRequest | null>(null)
const pendingHitlRequests = ref<AlicizationSafetyPermissionRequest[]>([])
const hitlResolving = ref(false)
const alicizationLateToolEventGraceMs = 5_000
let llmSyncTimer: ReturnType<typeof setTimeout> | undefined
let lastLlmSyncSignature = ''
let llmConfigHydrating = false
const llmConfigHydrated = ref(false)

interface PendingAlicizationChatStream {
  cardId: string
  sessionId: string
  logicalTurnId: string
  lifecycle: ReturnType<typeof createAlicizationChatStreamLifecycle>
  requestAbort: (reason: string) => Promise<AlicizationChatAbortResult>
  dispose: () => void
  visibleReplyExecution?: AlicizationChatFinishEvent['visibleReplyExecution']
  visibleReplyCritic?: AlicizationBridgeChatFinishEvent['visibleReplyCritic']
  visibleReplyClosure?: AlicizationBridgeChatFinishEvent['visibleReplyClosure']
}

const pendingAlicizationChatStreams = new Map<string, PendingAlicizationChatStream>()
const alicizationConversationCardIdsBySession = new Map<string, string>()
const proactiveBackfillInFlight = new Set<string>()
const sessionReconcileInFlight = new Set<string>()
let alicizationRendererScopeEpoch = 0
const handledDialogueRespondedKeys = new Set<string>()
const handledDialogueRespondedQueue: string[] = []
const handledDialogueRespondedMax = 600

function alicizationChatStreamKey(cardId: string, turnId: string) {
  return `${cardId}:${turnId}`
}

function resolvePendingAlicizationStream(cardId: string, turnId: string) {
  const exact = pendingAlicizationChatStreams.get(alicizationChatStreamKey(cardId, turnId))
  if (exact)
    return exact

  const logicalTurnId = resolveAlicizationLogicalChatStreamTurnId(
    [...pendingAlicizationChatStreams.values()]
      .filter(pending => pending.cardId === cardId)
      .map(pending => pending.logicalTurnId),
    turnId,
  )
  return logicalTurnId
    ? pendingAlicizationChatStreams.get(alicizationChatStreamKey(cardId, logicalTurnId))
    : undefined
}

function deletePendingAlicizationStream(pending: Pick<PendingAlicizationChatStream, 'cardId' | 'logicalTurnId'>) {
  const key = alicizationChatStreamKey(pending.cardId, pending.logicalTurnId)
  if (pendingAlicizationChatStreams.get(key) === pending)
    pendingAlicizationChatStreams.delete(key)
}

async function retirePendingAlicizationStream(
  pending: PendingAlicizationChatStream,
  error: unknown,
  options: {
    abortReason: string
    invalidateSession?: boolean
  },
) {
  deletePendingAlicizationStream(pending)
  if (options.invalidateSession !== false && pending.sessionId)
    chatSessionStore.bumpSessionGeneration(pending.sessionId)

  let settlementError = error
  try {
    await pending.requestAbort(options.abortReason)
  }
  catch (abortError) {
    settlementError = abortError
  }
  pending.dispose()
  pending.lifecycle.rejectAfter([], settlementError)
  await pending.lifecycle.waitForIdle()
}

async function retirePendingAlicizationStreamsForCard(
  cardId: string,
  error: unknown,
) {
  const pendingStreams = [...new Set(
    [...pendingAlicizationChatStreams.values()]
      .filter(pending => pending.cardId === cardId),
  )]
  await Promise.all(pendingStreams.map(async pending =>
    await retirePendingAlicizationStream(pending, error, {
      abortReason: 'renderer-card-switch',
    }),
  ))
}

async function retireAllPendingAlicizationStreams(error: unknown) {
  const pendingStreams = [...new Set(pendingAlicizationChatStreams.values())]
  await Promise.all(pendingStreams.map(async pending =>
    await retirePendingAlicizationStream(pending, error, {
      abortReason: 'renderer-unmounted',
    }),
  ))
}

function resolveAlicizationConversationCardId(sessionIdRaw?: string) {
  const sessionId = sessionIdRaw?.trim() || ''
  const pinnedCardId = sessionId
    ? alicizationConversationCardIdsBySession.get(sessionId)?.trim()
    : ''
  const sessionCardId = sessionId
    ? chatSessionStore.sessionMetas[sessionId]?.characterId?.trim()
    : ''
  return pinnedCardId || sessionCardId || resolveAlicizationScope().cardId
}

function alicizationChatStreamText(path: string, params?: Record<string, unknown>) {
  return params
    ? i18n.t(`stage.chat.stream.${path}`, params)
    : i18n.t(`stage.chat.stream.${path}`)
}

function createAlicizationStreamError(message: string, code: string) {
  return Object.assign(new Error(message), { code })
}

function createAlicizationAbortError(reason?: string) {
  const resolvedReason = typeof reason === 'string' && reason.trim()
    ? reason
    : alicizationChatStreamText('reason-manual')
  return new DOMException(alicizationChatStreamText('aborted', { reason: resolvedReason }), 'AbortError')
}

function estimateJsonPayloadBytes(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length
  }
  catch {
    return null
  }
}

function isAlicizationRecordPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compactAlicizationStringList(value: unknown, limit = 16) {
  if (!Array.isArray(value))
    return []

  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string')
      continue
    const trimmed = item.trim()
    if (!trimmed || result.includes(trimmed))
      continue
    result.push(trimmed)
    if (result.length >= limit)
      break
  }
  return result
}

function summarizeAlicizationVisibleReplyCriticForRenderer(
  raw: AlicizationChatFinishEvent['visibleReplyCritic'] | AlicizationBridgeChatFinishEvent['visibleReplyCritic'] | null | undefined,
): AlicizationBridgeChatFinishEvent['visibleReplyCritic'] | null {
  if (!isAlicizationRecordPayload(raw))
    return null

  const rawReasonCodes = compactAlicizationStringList(raw.reasonCodes)
  const summary: Record<string, unknown> = {
    version: 'visible-reply-critic-public-summary-v1',
    reasonCodes: rawReasonCodes.length > 0 ? rawReasonCodes : compactAlicizationStringList(raw.reasons),
  }

  if (typeof raw.providerMindRequired === 'boolean')
    summary.providerMindRequired = raw.providerMindRequired
  if (typeof raw.status === 'string' && raw.status.trim())
    summary.status = raw.status.trim()

  return summary
}

function summarizeAlicizationVisibleReplyClosureForRenderer(
  raw: AlicizationChatFinishEvent['visibleReplyClosure'] | AlicizationBridgeChatFinishEvent['visibleReplyClosure'] | null | undefined,
): AlicizationBridgeChatFinishEvent['visibleReplyClosure'] | null {
  if (!isAlicizationRecordPayload(raw))
    return null

  const summary: Record<string, unknown> = {
    version: 'visible-reply-closure-public-summary-v1',
    reasonCodes: compactAlicizationStringList(raw.reasonCodes),
  }

  if (typeof raw.status === 'string' && raw.status.trim())
    summary.status = raw.status.trim()
  if (typeof raw.providerMindRequired === 'boolean')
    summary.providerMindRequired = raw.providerMindRequired
  if (typeof raw.initialCriticStatus === 'string' && raw.initialCriticStatus.trim())
    summary.initialCriticStatus = raw.initialCriticStatus.trim()
  if (typeof raw.finalCriticStatus === 'string' && raw.finalCriticStatus.trim())
    summary.finalCriticStatus = raw.finalCriticStatus.trim()

  return summary
}

function cloneProviderCredentials() {
  return JSON.parse(JSON.stringify(providers.value || {})) as Record<string, Record<string, unknown>>
}

function createLlmConfigPayload(): AlicizationLlmConfigPayload {
  return {
    activeProviderId: activeProvider.value || '',
    activeModelId: activeModel.value || '',
    providerCredentials: cloneProviderCredentials(),
  }
}

function normalizeCreatedAt(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now()
}

async function acknowledgeDialogueDelivery(sessionIdRaw: string, turnIdRaw: string, createdAtRaw: unknown) {
  const sessionId = sessionIdRaw.trim()
  const turnId = turnIdRaw.trim()
  if (!sessionId || !turnId)
    return
  const createdAt = normalizeCreatedAt(createdAtRaw)
  try {
    await alicizationAckDialogue({
      ...resolveAlicizationScope(),
      sessionId,
      turnId,
      createdAt,
    })
  }
  catch (error) {
    console.warn('[alicization-renderer] failed to ack proactive dialogue delivery:', error)
  }
}

async function upsertProactiveAssistantTurn(payload: {
  sessionId: string
  turnId: string
  assistantText: string
  structured?: Record<string, unknown> | null
  createdAt: number
  setActive?: boolean
}) {
  const sessionId = payload.sessionId.trim()
  const turnId = payload.turnId.trim()
  const assistantText = payload.assistantText.trim()
  if (!sessionId || !turnId || !assistantText)
    return

  const ensuredSessionId = await chatSessionStore.ensureExternalSession(sessionId, {
    setActive: payload.setActive === true,
  })
  if (!ensuredSessionId)
    return

  const normalizedCreatedAt = normalizeCreatedAt(payload.createdAt)
  const normalizedStructured = normalizeChatStructuredRecord(payload.structured, assistantText)

  const sessionMessages = chatSessionStore.getSessionMessages(ensuredSessionId)
  const existing = sessionMessages.find(message => message.id === turnId && message.role === 'assistant')
  if (existing) {
    refreshAlicizationProactiveAssistantMessage(existing as any, {
      assistantText,
      createdAt: normalizedCreatedAt,
      structured: normalizedStructured,
      reasoning: resolveVisibleReasoning(normalizedStructured, 'subconscious-proactive'),
    })
  }
  else {
    sessionMessages.push({
      id: turnId,
      role: 'assistant',
      content: assistantText,
      createdAt: normalizedCreatedAt,
      origin: 'subconscious-proactive',
      slices: [{ type: 'text', text: assistantText }],
      tool_results: [],
      structured: normalizedStructured,
      categorization: {
        speech: assistantText,
        reasoning: resolveVisibleReasoning(normalizedStructured, 'subconscious-proactive'),
      },
    })
  }

  chatSessionStore.persistSessionMessages(ensuredSessionId)
  await acknowledgeDialogueDelivery(ensuredSessionId, turnId, normalizedCreatedAt)
}

function normalizeContentText(raw: unknown) {
  return String(raw ?? '').trim()
}

function getMessageText(message: any) {
  if (!message)
    return ''
  if (typeof message.content === 'string')
    return message.content.trim()
  if (Array.isArray(message.content)) {
    return message.content
      .map((part: unknown) => {
        if (typeof part === 'string')
          return part
        if (part && typeof part === 'object' && 'text' in part)
          return String((part as { text?: unknown }).text ?? '')
        return ''
      })
      .join('')
      .trim()
  }
  return ''
}

function sortSessionMessagesInPlace(messages: any[]) {
  messages.sort((left, right) => {
    const leftAt = normalizeCreatedAt(left?.createdAt)
    const rightAt = normalizeCreatedAt(right?.createdAt)
    if (leftAt !== rightAt)
      return leftAt - rightAt
    const leftRole = String(left?.role ?? '')
    const rightRole = String(right?.role ?? '')
    if (leftRole === rightRole)
      return 0
    if (leftRole === 'user')
      return -1
    if (rightRole === 'user')
      return 1
    return leftRole.localeCompare(rightRole)
  })
}

function findReplayMessageIndex(messages: any[], options: {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
}) {
  const byIdIndex = messages.findIndex(item => item?.id === options.id && item?.role === options.role)
  if (byIdIndex >= 0)
    return byIdIndex

  const toleranceMs = options.role === 'assistant' ? 15_000 : 6_000
  return messages.findIndex((item) => {
    if (!item || item.role !== options.role)
      return false
    const itemText = getMessageText(item)
    if (itemText !== options.text)
      return false
    const itemCreatedAt = normalizeCreatedAt(item.createdAt)
    return Math.abs(itemCreatedAt - options.createdAt) <= toleranceMs
  })
}

async function reconcileSessionTurnsFromMain(sessionIdRaw: string) {
  const sessionId = sessionIdRaw.trim()
  const cardId = resolveAlicizationScope().cardId
  const token = {
    cardId,
    sessionId,
    epoch: alicizationRendererScopeEpoch,
  }
  const reconcileKey = createAlicizationRendererReconcileKey(token)
  if (!sessionId || sessionReconcileInFlight.has(reconcileKey))
    return

  sessionReconcileInFlight.add(reconcileKey)
  try {
    const isCurrent = () => isAlicizationRendererReconcileCurrent(token, {
      cardId: resolveAlicizationScope().cardId,
      sessionId: token.sessionId,
      epoch: alicizationRendererScopeEpoch,
    })
    if (!isCurrent())
      return

    const ensuredSessionId = await chatSessionStore.ensureExternalSession(sessionId, {
      setActive: sessionId === activeSessionId.value,
    })
    if (!ensuredSessionId || !isCurrent())
      return

    const scope = { cardId: token.cardId }
    const [turnsResult, projectionsResult] = await Promise.allSettled([
      alicizationListConversationTurns({
        ...scope,
        sessionId: ensuredSessionId,
        limit: 500,
      }),
      alicizationListTurnToolProjections({
        ...scope,
        sessionId: ensuredSessionId,
        limit: 500,
      }),
    ])
    if (!isCurrent())
      return
    const rows = turnsResult.status === 'fulfilled' ? turnsResult.value : []
    const recoveredToolProjections: AlicizationTurnToolProjectionReplayRecord[] = projectionsResult.status === 'fulfilled'
      ? projectionsResult.value.filter(projection => projection.cardId === token.cardId)
      : []
    const sessionMessages = chatSessionStore.getSessionMessages(ensuredSessionId)
    let changed = false
    if (turnsResult.status === 'rejected') {
      const message = turnsResult.reason instanceof Error
        ? turnsResult.reason.message
        : String(turnsResult.reason)
      console.warn('[alicization-renderer] failed to reconcile conversation turns from main:', turnsResult.reason)
      if (upsertChatInfrastructureErrorMessage(sessionMessages as any[], {
        id: `${ensuredSessionId}:conversation-query-error`,
        code: 'CONVERSATION_QUERY_FAILED',
        message,
        label: '对话记录恢复失败',
      })) {
        changed = true
      }
    }
    else if (removeChatInfrastructureErrorMessage(
      sessionMessages as any[],
      `${ensuredSessionId}:conversation-query-error`,
    )) {
      changed = true
    }
    if (projectionsResult.status === 'rejected') {
      const message = projectionsResult.reason instanceof Error
        ? projectionsResult.reason.message
        : String(projectionsResult.reason)
      if (upsertChatInfrastructureErrorMessage(sessionMessages as any[], {
        id: `${ensuredSessionId}:tool-projection-query-error`,
        code: 'TOOL_PROJECTION_QUERY_FAILED',
        message,
      })) {
        changed = true
      }
    }
    else if (removeChatInfrastructureErrorMessage(
      sessionMessages as any[],
      `${ensuredSessionId}:tool-projection-query-error`,
    )) {
      changed = true
    }
    const orderedRows = [...rows].sort((a, b) => normalizeCreatedAt(a.createdAt) - normalizeCreatedAt(b.createdAt))
    for (const row of orderedRows) {
      const createdAt = normalizeCreatedAt(row.createdAt)
      const turnId = String(row.turnId ?? '').trim()
      if (!turnId)
        continue

      const userText = normalizeContentText(row.userText)
      if (userText) {
        const userId = `${turnId}:user`
        const userIndex = findReplayMessageIndex(sessionMessages as any[], {
          id: userId,
          role: 'user',
          text: userText,
          createdAt,
        })
        if (userIndex >= 0) {
          const existing = sessionMessages[userIndex] as any
          const beforeSignature = JSON.stringify({
            id: existing.id,
            content: existing.content,
            createdAt: existing.createdAt,
          })
          existing.id = userId
          existing.content = userText
          existing.createdAt = createdAt
          const afterSignature = JSON.stringify({
            id: existing.id,
            content: existing.content,
            createdAt: existing.createdAt,
          })
          if (beforeSignature !== afterSignature)
            changed = true
        }
        else {
          sessionMessages.push({
            id: userId,
            role: 'user',
            content: userText,
            createdAt,
          } as any)
          changed = true
        }
      }

      const assistantText = normalizeContentText(row.assistantText)
      if (assistantText) {
        const structured = normalizeChatStructuredRecord(row.structured, assistantText)
        const inferredOrigin = turnId.startsWith('reminder:') || turnId.startsWith('subconscious:')
          || structured.format === 'subconscious-proactive-v1'
          || structured.format === 'subconscious-proactive-llm-v1'
          || structured.format === 'subconscious-reminder-v1'
          ? 'subconscious-proactive'
          : 'user-turn'
        const assistantIndex = findReplayMessageIndex(sessionMessages as any[], {
          id: turnId,
          role: 'assistant',
          text: assistantText,
          createdAt,
        })
        if (assistantIndex >= 0) {
          const existing = sessionMessages[assistantIndex] as any
          const beforeSignature = JSON.stringify({
            id: existing.id,
            content: existing.content,
            createdAt: existing.createdAt,
            structured: existing.structured ?? null,
          })
          existing.id = turnId
          replaceChatAssistantTextPreservingToolProjection(existing, assistantText)
          existing.createdAt = createdAt
          existing.origin = inferredOrigin
          existing.structured = structured
          existing.categorization = {
            speech: assistantText,
            reasoning: resolveVisibleReasoning(structured, inferredOrigin),
          }
          const afterSignature = JSON.stringify({
            id: existing.id,
            content: existing.content,
            createdAt: existing.createdAt,
            structured: existing.structured ?? null,
          })
          if (beforeSignature !== afterSignature)
            changed = true
        }
        else {
          sessionMessages.push({
            id: turnId,
            role: 'assistant',
            content: assistantText,
            createdAt,
            origin: inferredOrigin,
            slices: [{ type: 'text', text: assistantText }],
            tool_results: [],
            structured,
            categorization: {
              speech: assistantText,
              reasoning: resolveVisibleReasoning(structured, inferredOrigin),
            },
          } as any)
          changed = true
        }
      }
    }

    if (projectRecoveredTurnToolProjectionsIntoMessages(
      sessionMessages as any[],
      recoveredToolProjections,
    )) {
      changed = true
    }
    if (clearAlicizationSessionRecoveryFailure(
      sessionMessages as any[],
      ensuredSessionId,
    )) {
      changed = true
    }

    if (changed) {
      sortSessionMessagesInPlace(sessionMessages as any[])
      chatSessionStore.persistSessionMessages(ensuredSessionId)
    }
  }
  catch (error) {
    console.warn('[alicization-renderer] failed to reconcile session turns from main:', error)
    if (isAlicizationRendererReconcileCurrent(token, {
      cardId: resolveAlicizationScope().cardId,
      sessionId: token.sessionId,
      epoch: alicizationRendererScopeEpoch,
    })) {
      const sessionMessages = chatSessionStore.getSessionMessages(sessionId)
      if (projectAlicizationSessionRecoveryFailure(sessionMessages as any[], {
        sessionId,
        error,
      })) {
        sortSessionMessagesInPlace(sessionMessages as any[])
        chatSessionStore.persistSessionMessages(sessionId)
      }
    }
  }
  finally {
    sessionReconcileInFlight.delete(reconcileKey)
  }
}

async function backfillProactiveTurnsForSession(sessionIdRaw: string) {
  const sessionId = sessionIdRaw.trim()
  if (!sessionId || proactiveBackfillInFlight.has(sessionId))
    return

  proactiveBackfillInFlight.add(sessionId)
  try {
    const dialogues = await alicizationReplayDialogues({
      ...resolveAlicizationScope(),
      sessionId,
      limit: 200,
    })
    const sorted = [...dialogues].sort((a, b) => normalizeCreatedAt(a.createdAt) - normalizeCreatedAt(b.createdAt))
    for (const row of sorted) {
      if (row.origin !== 'subconscious-proactive')
        continue
      const assistantText = row.structured?.reply?.trim()
      if (!assistantText)
        continue
      await upsertProactiveAssistantTurn({
        sessionId,
        turnId: row.turnId,
        assistantText,
        structured: row.structured as unknown as Record<string, unknown>,
        createdAt: normalizeCreatedAt(row.createdAt),
      })
    }
  }
  catch (error) {
    console.warn('[alicization-renderer] failed to backfill proactive turns:', error)
  }
  finally {
    proactiveBackfillInFlight.delete(sessionId)
  }
}

function scheduleMainLlmConfigSync() {
  if (!llmConfigHydrated.value)
    return
  const payload = createLlmConfigPayload()
  const signature = JSON.stringify(payload)
  if (signature === lastLlmSyncSignature)
    return

  if (llmSyncTimer)
    clearTimeout(llmSyncTimer)
  llmSyncTimer = setTimeout(() => {
    lastLlmSyncSignature = signature
    void alicizationSyncLlmConfig(payload)
  }, 120)
}

async function hydrateMainLlmConfig() {
  if (llmConfigHydrating)
    return
  llmConfigHydrating = true
  try {
    const remote = await alicizationGetLlmConfig()
    const remoteCredentials = remote.providerCredentials && typeof remote.providerCredentials === 'object'
      ? remote.providerCredentials
      : {}
    if (Object.keys(remoteCredentials).length > 0) {
      providers.value = JSON.parse(JSON.stringify(remoteCredentials))
    }
    if (remote.activeProviderId?.trim()) {
      activeProvider.value = remote.activeProviderId.trim()
    }
    if (remote.activeModelId?.trim()) {
      activeModel.value = remote.activeModelId.trim()
    }
    lastLlmSyncSignature = JSON.stringify({
      activeProviderId: remote.activeProviderId || '',
      activeModelId: remote.activeModelId || '',
      providerCredentials: remoteCredentials,
    } satisfies AlicizationLlmConfigPayload)
  }
  catch (error) {
    console.warn('[alicization-renderer] failed to hydrate llm config from main process:', error)
  }
  finally {
    llmConfigHydrating = false
    llmConfigHydrated.value = true
  }
}

async function invokeAlicizationChatStartTransport(payload: AlicizationChatStartPayload): Promise<AlicizationChatStartResult> {
  const invoke = window.electron?.ipcRenderer?.invoke
  if (typeof invoke === 'function')
    return await invoke(alicizationChatStartInvokeChannel, payload) as AlicizationChatStartResult
  return await alicizationChatStart(payload)
}

function sanitizeRendererAlicizationChatStartPayload(
  cardId: string,
  payload: Omit<AlicizationChatStartPayload, 'cardId'>,
) {
  return sanitizeAlicizationChatStartPayloadForTransport({
    cardId,
    turnId: payload.turnId,
    providerId: payload.providerId,
    model: payload.model,
    providerConfig: payload.providerConfig,
    messages: payload.messages,
    ...(payload.supportsTools !== undefined ? { supportsTools: payload.supportsTools } : {}),
    ...(payload.waitForTools !== undefined ? { waitForTools: payload.waitForTools } : {}),
    ...(payload.providerToolCapabilityObservation
      ? { providerToolCapabilityObservation: payload.providerToolCapabilityObservation }
      : {}),
    ...(payload.dialogueReplyFeedback
      ? { dialogueReplyFeedback: payload.dialogueReplyFeedback }
      : {}),
  })
}

async function invokeAlicizationChatAbortTransport(payload: AlicizationChatAbortPayload): Promise<AlicizationChatAbortResult> {
  const invoke = window.electron?.ipcRenderer?.invoke
  if (typeof invoke === 'function')
    return await invoke(alicizationChatAbortInvokeChannel, payload) as AlicizationChatAbortResult
  return await alicizationChatAbort(payload)
}

function handleAlicizationChatStreamChunk(payload?: AlicizationChatStreamChunkEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  pending.lifecycle.publish(bridgeAlicizationChatChunkEventToStreamEvent(payload))
}

function handleAlicizationChatStreamMeta(payload?: AlicizationChatMetaEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  pending.lifecycle.publish(bridgeAlicizationChatMetaEventToStreamEvent(payload))
}

function handleAlicizationChatStreamToolCall(payload?: AlicizationChatToolCallEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  pending.lifecycle.publish({
    type: 'tool-call',
    toolCallId: payload.toolCallId,
    toolName: payload.toolName,
    ...(payload.selectedChannel !== undefined ? { selectedChannel: payload.selectedChannel } : {}),
    projection: payload.projection,
    args: JSON.stringify(payload.arguments ?? {}),
    toolCallType: 'function',
  })
}

function handleAlicizationChatStreamToolResult(payload?: AlicizationChatToolResultEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  pending.lifecycle.publish({
    type: 'tool-result',
    toolCallId: payload.toolCallId,
    ...(payload.toolName ? { toolName: payload.toolName } : {}),
    ...(payload.selectedChannel !== undefined ? { selectedChannel: payload.selectedChannel } : {}),
    projection: payload.projection,
    ...(payload.phase ? { phase: payload.phase } : {}),
    result: payload.result,
  })
}

function handleAlicizationChatStreamToolProgress(payload?: AlicizationChatToolProgressEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  pending.lifecycle.publish({
    type: 'tool-progress',
    toolCallId: payload.toolCallId,
    toolName: payload.toolName,
    ...(payload.selectedChannel !== undefined ? { selectedChannel: payload.selectedChannel } : {}),
    projection: payload.projection,
    phase: payload.phase,
    ...(payload.signal ? { signal: payload.signal } : {}),
    elapsedMs: payload.elapsedMs,
    ...(payload.timeoutMs !== undefined ? { timeoutMs: payload.timeoutMs } : {}),
    ...(payload.errorCode ? { errorCode: payload.errorCode } : {}),
    ...(payload.errorMessage ? { errorMessage: payload.errorMessage } : {}),
    ...(payload.occurredAt !== undefined ? { occurredAt: payload.occurredAt } : {}),
    ...(payload.eventId ? { eventId: payload.eventId } : {}),
    ...(payload.threadId ? { threadId: payload.threadId } : {}),
    ...(payload.adapterEventType ? { adapterEventType: payload.adapterEventType } : {}),
    ...(payload.itemType ? { itemType: payload.itemType } : {}),
    ...(payload.summary ? { summary: payload.summary } : {}),
    ...(payload.command ? { command: payload.command } : {}),
    ...(payload.commandStatus ? { commandStatus: payload.commandStatus } : {}),
    ...(payload.commandExitCode !== undefined ? { commandExitCode: payload.commandExitCode } : {}),
    ...(payload.outputPreview ? { outputPreview: payload.outputPreview } : {}),
  })
}

function handleAlicizationChatStreamError(payload?: AlicizationChatErrorEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  pending.lifecycle.publish(bridgeAlicizationChatErrorEventToStreamEvent(payload))
}

function handleAlicizationChatStreamFinish(payload?: AlicizationChatFinishEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  pending.visibleReplyExecution = payload.visibleReplyExecution ?? null
  pending.visibleReplyCritic = summarizeAlicizationVisibleReplyCriticForRenderer(payload.visibleReplyCritic)
  pending.visibleReplyClosure = summarizeAlicizationVisibleReplyClosureForRenderer(payload.visibleReplyClosure)
  const finishEvent = bridgeAlicizationChatFinishEventToStreamEvent({
    ...payload,
    visibleReplyExecution: pending.visibleReplyExecution ?? null,
    visibleReplyCritic: pending.visibleReplyCritic ?? null,
    visibleReplyClosure: pending.visibleReplyClosure ?? null,
  })
  if (payload.status === 'completed') {
    pending.lifecycle.resolveAfter([finishEvent])
    return
  }
  const terminalEvents: AlicizationBridgeChatStreamEvent[] = []
  if (!pending.lifecycle.hasObservedError()) {
    terminalEvents.push(
      bridgeAlicizationChatAbortedFinishEventToStreamErrorEvent(payload),
    )
  }
  terminalEvents.push(finishEvent)
  if (payload.status === 'aborted') {
    pending.lifecycle.rejectAfter(
      terminalEvents,
      createAlicizationAbortError(payload.finishReason),
    )
    return
  }
  if (payload.status === 'timed-out') {
    const timeoutError = createAlicizationStreamError(
      payload.error
      || payload.failureSurface?.reply
      || payload.finishReason
      || alicizationChatStreamText('failed'),
      'alicization-stream-timeout',
    )
    Object.assign(timeoutError, {
      failureSurface: payload.failureSurface ?? null,
      timeout: payload.failureSurface?.timeout ?? null,
      finishReason: payload.finishReason ?? null,
    })
    pending.lifecycle.rejectAfter(terminalEvents, timeoutError)
    return
  }
  const error = payload.error
    || pending.lifecycle.getObservedError()?.error
    || alicizationChatStreamText('failed')
  pending.lifecycle.rejectAfter(
    terminalEvents,
    createAlicizationStreamError(String(error), 'alicization-stream-failed'),
  )
}

function createDialogueRespondedDedupKey(payload: AlicizationDialogueRespondedPayload) {
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
  const turnId = typeof payload.turnId === 'string' ? payload.turnId.trim() : ''
  const origin = typeof payload.origin === 'string' ? payload.origin.trim() : ''
  // NOTICE: Deduplicate by logical turn identity instead of createdAt so delivery retries
  // or replay clocks cannot re-apply a second assistant surface over the same turn.
  return `${payload.cardId}::${sessionId}::${turnId}::${origin}`
}

function registerHandledDialogueResponded(payload: AlicizationDialogueRespondedPayload) {
  const key = createDialogueRespondedDedupKey(payload)
  if (handledDialogueRespondedKeys.has(key))
    return false
  handledDialogueRespondedKeys.add(key)
  handledDialogueRespondedQueue.push(key)
  if (handledDialogueRespondedQueue.length > handledDialogueRespondedMax) {
    const dropped = handledDialogueRespondedQueue.shift()
    if (dropped)
      handledDialogueRespondedKeys.delete(dropped)
  }
  return true
}

function handleAlicizationDialogueRespondedPayload(payload?: AlicizationDialogueRespondedPayload) {
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  if (!registerHandledDialogueResponded(payload))
    return

  const targetSessionId = payload.sessionId?.trim() || activeSessionId.value
  if (targetSessionId)
    void reconcileSessionTurnsFromMain(targetSessionId)

  if (payload.origin === 'subconscious-proactive' && payload.structured?.reply?.trim()) {
    if (targetSessionId) {
      void upsertProactiveAssistantTurn({
        sessionId: targetSessionId,
        turnId: payload.turnId,
        assistantText: payload.structured.reply,
        structured: payload.structured as unknown as Record<string, unknown>,
        createdAt: payload.createdAt,
        setActive: targetSessionId === activeSessionId.value,
      })
    }
  }

  void alicizationPresenceDispatcherStore.dispatchDialogueResponded(payload)
}

const visualPresencePulseListeners = new Set<(payload: AlicizationPresencePulsePayload) => void>()
const visualPresenceStateListeners = new Set<(state: AlicizationBridgeVisualPresenceStateSnapshot | null) => void>()

function handleAlicizationVisualPresencePayload(payload?: AlicizationPresencePulsePayload) {
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  void alicizationPresenceDispatcherStore.dispatchPresencePulse(payload)
  for (const listener of visualPresencePulseListeners) {
    try {
      listener(payload)
    }
    catch {
      // NOTICE: Visual presence pulse listeners are observational and must degrade silently.
    }
  }
}

function handleAlicizationVisualPresenceStatePayload(payload?: AlicizationVisualPresenceStateChangedPayload) {
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  for (const listener of visualPresenceStateListeners) {
    try {
      listener(payload.state ?? null)
    }
    catch {
      // NOTICE: Visual presence snapshot listeners are observational and must degrade silently.
    }
  }
}

function handleAlicizationChatStreamDispatch(payload?: AlicizationChatStreamDispatchPayload) {
  if (!payload)
    return
  if (payload.eventType !== 'dialogue-responded' && !chatStreamIngressDeduplicator.accept(
    'dispatch',
    payload.eventType,
    payload.body,
  )) {
    return
  }
  switch (payload.eventType) {
    case 'meta':
      handleAlicizationChatStreamMeta(payload.body)
      return
    case 'chunk':
      handleAlicizationChatStreamChunk(payload.body)
      return
    case 'tool-call':
      handleAlicizationChatStreamToolCall(payload.body)
      return
    case 'tool-result':
      handleAlicizationChatStreamToolResult(payload.body)
      return
    case 'tool-progress':
      handleAlicizationChatStreamToolProgress(payload.body)
      return
    case 'finish':
      handleAlicizationChatStreamFinish(payload.body)
      return
    case 'error':
      handleAlicizationChatStreamError(payload.body)
      return
    case 'dialogue-responded':
      handleAlicizationDialogueRespondedPayload(payload.body)
  }
}

const removeAlicizationChatStreamDispatchListener = window.electron?.ipcRenderer?.on(
  alicizationChatStreamDispatchChannel,
  (_event, payload) => handleAlicizationChatStreamDispatch(payload as AlicizationChatStreamDispatchPayload),
)

function popNextHitlRequest() {
  if (currentHitlRequest.value || pendingHitlRequests.value.length === 0)
    return
  const [next, ...rest] = pendingHitlRequests.value
  pendingHitlRequests.value = rest
  currentHitlRequest.value = next ?? null
}

async function resolveHitlDecision(payload: { allow: boolean, rememberSession: boolean }) {
  const request = currentHitlRequest.value
  if (!request || hitlResolving.value)
    return

  hitlResolving.value = true
  try {
    await alicizationResolvePermission({
      cardId: request.cardId,
      token: request.token,
      requestId: request.requestId,
      allow: payload.allow,
      rememberSession: payload.allow ? payload.rememberSession : false,
      reason: payload.allow ? 'user-approved' : 'user-denied',
    })
  }
  finally {
    hitlResolving.value = false
    currentHitlRequest.value = null
    popNextHitlRequest()
  }
}

setAlicizationBridge({
  streamLifecycleOwner: 'main',
  bootstrap: async () => await alicizationBootstrap(resolveAlicizationScope()),
  getSoul: async () => await alicizationGetSoul(resolveAlicizationScope()),
  initializeGenesis: async payload => await alicizationInitializeGenesis({ ...resolveAlicizationScope(), ...payload }),
  updateSoul: async payload => await alicizationUpdateSoul({ ...resolveAlicizationScope(), ...payload }),
  updatePersonality: async payload => await alicizationUpdatePersonality({ ...resolveAlicizationScope(), ...payload }),
  getKillSwitchState: async () => await alicizationGetKillSwitchState(resolveAlicizationScope()),
  suspendKillSwitch: async payload => await alicizationSuspendKillSwitch({ ...resolveAlicizationScope(), ...payload }),
  resumeKillSwitch: async payload => await alicizationResumeKillSwitch({ ...resolveAlicizationScope(), ...payload }),
  getMemoryStats: async () => await alicizationGetMemoryStats(resolveAlicizationScope()),
  runMemoryPrune: async () => await alicizationRunMemoryPrune(resolveAlicizationScope()),
  updateMemoryStats: async payload => await alicizationUpdateMemoryStats({ ...resolveAlicizationScope(), ...payload }),
  retrieveMemoryFacts: async payload => await alicizationRetrieveMemoryFacts({ ...resolveAlicizationScope(), ...payload }),
  upsertMemoryFacts: async payload => await alicizationUpsertMemoryFacts({ ...resolveAlicizationScope(), ...payload }),
  importLegacyMemory: async payload => await alicizationImportLegacyMemory({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchGetSnapshot: async payload => await memoryWorkbenchGetSnapshot({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListLongTerm: async payload => await memoryWorkbenchListLongTerm({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchApplyLongTermAction: async payload => await memoryWorkbenchApplyLongTermAction({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchApplyReviewAction: async payload => await memoryWorkbenchApplyReviewAction({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchRecallProbe: async payload => await memoryWorkbenchRecallProbe({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListPersonaCandidates: async payload => await memoryWorkbenchListPersonaCandidates({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchApplyPersonaCandidateAction: async payload => await memoryWorkbenchApplyPersonaCandidateAction({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchRunPersonaTraining: async payload => await memoryWorkbenchRunPersonaTraining({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchGetPersonaTrainingRun: async payload => await memoryWorkbenchGetPersonaTrainingRun({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListPersonaTrainingRuns: async payload => await memoryWorkbenchListPersonaTrainingRuns({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchCancelPersonaTraining: async payload => await memoryWorkbenchCancelPersonaTraining({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchGetPersonaTrainingExecutorConfig: async () => await memoryWorkbenchGetPersonaTrainingExecutorConfig(resolveAlicizationScope()),
  memoryWorkbenchSetPersonaTrainingExecutorConfig: async payload => await memoryWorkbenchSetPersonaTrainingExecutorConfig({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchTestPersonaTrainingExecutor: async payload => await memoryWorkbenchTestPersonaTrainingExecutor({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchGetPersonaRuntimeConfig: async () => await memoryWorkbenchGetPersonaRuntimeConfig(resolveAlicizationScope()),
  memoryWorkbenchSetPersonaRuntimeConfig: async payload => await memoryWorkbenchSetPersonaRuntimeConfig({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchTestPersonaRuntime: async payload => await memoryWorkbenchTestPersonaRuntime({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchRollbackPersonaTrainingIncrement: async payload => await memoryWorkbenchRollbackPersonaTrainingIncrement({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListPersonaTrainingIncrements: async () => await memoryWorkbenchListPersonaTrainingIncrements(resolveAlicizationScope()),
  skillWorkbenchList: async payload => await skillWorkbenchList({ ...resolveAlicizationScope(), ...payload }),
  skillWorkbenchActivate: async payload => await skillWorkbenchActivate({ ...resolveAlicizationScope(), ...payload }),
  skillWorkbenchRollback: async payload => await skillWorkbenchRollback({ ...resolveAlicizationScope(), ...payload }),
  skillWorkbenchRevoke: async payload => await skillWorkbenchRevoke({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchManageSemanticScaleJobs: async payload => await memoryWorkbenchManageSemanticScaleJobs({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchManageWorkingMemoryCleaningQueue: async payload => await memoryWorkbenchManageWorkingMemoryCleaningQueue({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchReindexEmbeddings: async payload => await memoryWorkbenchReindexEmbeddings({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListEmbeddingModels: async payload => await memoryWorkbenchListEmbeddingModels({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchTestEmbeddingConnection: async payload => await memoryWorkbenchTestEmbeddingConnection({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListReplaySessions: async payload => await memoryWorkbenchListReplaySessions({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchRunQualityTrial: async payload => await memoryWorkbenchRunQualityTrial({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchCancelQualityTrial: async payload => await memoryWorkbenchCancelQualityTrial({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchRecordQualityGoldLabel: async payload => await memoryWorkbenchRecordQualityGoldLabel({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListQualityGoldLabels: async payload => await memoryWorkbenchListQualityGoldLabels({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListQualityTrialReports: async payload => await memoryWorkbenchListQualityTrialReports({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchBuildMonthlyGoldRegression: async payload => await memoryWorkbenchBuildMonthlyGoldRegression({ ...resolveAlicizationScope(), ...payload }),
  getOrganicMemorySnapshot: async () => await alicizationGetOrganicMemorySnapshot(resolveAlicizationScope()),
  getSelfEvolutionState: async () => await alicizationGetSelfEvolutionState(resolveAlicizationScope()),
  searchOrganicSubconsciousFragments: async payload => await alicizationSearchOrganicSubconsciousFragments({ ...resolveAlicizationScope(), ...payload }),
  getPerformanceManifest: async () => sanitizeCharacterPerformanceManifest(
    await alicizationGetPerformanceManifest(resolveAlicizationScope()),
  ),
  setPerformanceManifest: async manifest => await alicizationSetPerformanceManifest({
    ...resolveAlicizationScope(),
    manifest: sanitizeCharacterPerformanceManifest(manifest),
  }),
  appendConversationTurn: async payload => await alicizationAppendConversationTurn({
    cardId: resolveAlicizationConversationCardId(payload.sessionId),
    ...payload,
  }),
  listMindTurnEvents: async payload => await alicizationListMindTurnEvents({ ...resolveAlicizationScope(), ...payload }),
  listMemoryDecisionTraces: async payload => await alicizationListMemoryDecisionTraces({ ...resolveAlicizationScope(), ...payload }),
  listHumanlikeMemoryAudit: async payload => await alicizationListHumanlikeMemoryAudit({ ...resolveAlicizationScope(), ...payload }),
  correctHumanlikeMemoryAudit: async payload => await alicizationCorrectHumanlikeMemoryAudit({ ...resolveAlicizationScope(), ...payload }),
  runReplayBenchmark: async payload => await alicizationRunReplayBenchmark({ ...resolveAlicizationScope(), ...payload }),
  upsertTaskThread: async payload => await alicizationUpsertTaskThread({ ...resolveAlicizationScope(), ...payload }),
  listTaskThreads: async payload => await alicizationListTaskThreads({ ...resolveAlicizationScope(), ...payload }),
  upsertChannelCapabilityManifest: async payload => await alicizationUpsertChannelCapabilityManifest({ ...resolveAlicizationScope(), ...payload }),
  listChannelCapabilityManifests: async payload => await alicizationListChannelCapabilityManifests({ ...resolveAlicizationScope(), ...payload }),
  upsertExecutorSession: async payload => await alicizationUpsertExecutorSession({ ...resolveAlicizationScope(), ...payload }),
  listExecutorSessions: async payload => await alicizationListExecutorSessions({ ...resolveAlicizationScope(), ...payload }),
  appendExecutionEvents: async payload => await alicizationAppendExecutionEvents({ ...resolveAlicizationScope(), ...payload }),
  listExecutionEvents: async payload => await alicizationListExecutionEvents({ ...resolveAlicizationScope(), ...payload }),
  planTaskThread: async payload => await alicizationPlanTaskThread({ ...resolveAlicizationScope(), ...payload }),
  dispatchTaskThread: async payload => await alicizationDispatchTaskThread({ ...resolveAlicizationScope(), ...payload }),
  reportProactiveFeedback: async payload => await alicizationReportProactiveFeedback({ ...resolveAlicizationScope(), ...payload }),
  setActiveSession: async payload => await alicizationSetActiveSession({ ...resolveAlicizationScope(), ...payload }),
  appendAuditLog: async payload => await alicizationAppendAuditLog({ ...resolveAlicizationScope(), ...payload }),
  realtimeExecute: async payload => await alicizationRealtimeExecute({ ...resolveAlicizationScope(), ...payload }),
  getSensorySnapshot: async () => await alicizationGetSensorySnapshot(resolveAlicizationScope()),
  getVisualPresenceState: async () => await alicizationGetVisualPresenceState(resolveAlicizationScope()),
  onVisualPresencePulse: (listener) => {
    visualPresencePulseListeners.add(listener)
    return () => {
      visualPresencePulseListeners.delete(listener)
    }
  },
  onVisualPresenceState: (listener) => {
    visualPresenceStateListeners.add(listener)
    return () => {
      visualPresenceStateListeners.delete(listener)
    }
  },
  getSubconsciousState: async () => await alicizationGetSubconsciousState(resolveAlicizationScope()),
  forceSubconsciousTick: async () => await alicizationForceSubconsciousTick(resolveAlicizationScope()),
  forceDreaming: async payload => await alicizationForceDreaming({ ...resolveAlicizationScope(), ...payload }),
  syncLlmConfig: async payload => await alicizationSyncLlmConfig(payload),
  getLlmConfig: async () => await alicizationGetLlmConfig(),
  chatStart: async payload => await invokeAlicizationChatStartTransport(
    sanitizeRendererAlicizationChatStartPayload(resolveAlicizationScope().cardId, payload).value,
  ),
  chatAbort: async payload => await invokeAlicizationChatAbortTransport({ ...resolveAlicizationScope(), ...payload }),
  reminderSchedule: async payload => await alicizationReminderSchedule({ ...resolveAlicizationScope(), ...payload }),
  streamChat: async (payload, options) => await new Promise<void>((resolve, reject) => {
    void (async () => {
      const scope = resolveAlicizationScope()
      const sessionId = activeSessionId.value?.trim() || ''
      if (sessionId)
        alicizationConversationCardIdsBySession.set(sessionId, scope.cardId)
      const key = alicizationChatStreamKey(scope.cardId, payload.turnId)
      const previousPending = pendingAlicizationChatStreams.get(key)
      if (previousPending) {
        // NOTICE: Retry path may restart the same turnId after timeout.
        // Drain the old projection queue before the replacement starts.
        await retirePendingAlicizationStream(
          previousPending,
          createAlicizationStreamError(
            alicizationChatStreamText('superseded', { turnId: payload.turnId }),
            'alicization-stream-superseded',
          ),
          {
            abortReason: 'renderer-restart',
            invalidateSession: false,
          },
        )
      }

      let disposed = false
      let lateToolEventCleanupTimer: ReturnType<typeof scheduleAlicizationLateToolEventDisposal> | undefined
      let abortHandler = () => {}
      let pending: PendingAlicizationChatStream
      const dispose = () => {
        if (disposed)
          return
        disposed = true
        if (lateToolEventCleanupTimer) {
          lateToolEventCleanupTimer.cancel()
          lateToolEventCleanupTimer = undefined
        }
        options.abortSignal?.removeEventListener('abort', abortHandler)
        deletePendingAlicizationStream(pending)
      }
      const schedulePendingAlicizationStreamDisposal = () => {
        lateToolEventCleanupTimer?.cancel()
        lateToolEventCleanupTimer = scheduleAlicizationLateToolEventDisposal({
          delayMs: alicizationLateToolEventGraceMs,
          onDispose: () => {
            lateToolEventCleanupTimer = undefined
            dispose()
          },
        })
        options.abortSignal?.removeEventListener('abort', abortHandler)
      }
      const rejectAndDispose = (error: unknown) => {
        dispose()
        reject(error)
      }
      const resolveAndScheduleDispose = () => {
        schedulePendingAlicizationStreamDisposal()
        resolve()
      }
      const lifecycle = createAlicizationChatStreamLifecycle({
        onStreamEvent: options.onStreamEvent,
        onDeliveryError: async (error, event) => {
          await alicizationAppendAuditLog({
            ...scope,
            level: 'warning',
            category: 'alicization.chat',
            action: 'renderer-tool-projection-failed',
            message: 'A renderer tool projection failed without interrupting the main-owned stream lifecycle.',
            payload: {
              turnId: payload.turnId,
              eventType: event.type,
              toolCallId: 'toolCallId' in event ? event.toolCallId : null,
              reason: error instanceof Error ? error.message : String(error),
            },
          }).catch(() => {})
        },
        resolve: resolveAndScheduleDispose,
        reject: rejectAndDispose,
      })
      let pendingAbortReason = 'renderer-abort'
      let mainStartAccepted = false
      const abortCoordinator = createAlicizationChatStartAbortCoordinator(
        async () => await invokeAlicizationChatAbortTransport({
          ...scope,
          turnId: payload.turnId,
          reason: pendingAbortReason,
        }),
      )
      const requestAbort = async (reason: string) => {
        pendingAbortReason = reason
        const result = await abortCoordinator.requestAbort()
        if (
          mainStartAccepted
          && !result.accepted
          && result.state !== 'aborted'
        ) {
          void reconcileSessionTurnsFromMain(sessionId)
          throw new AlicizationChatAbortUnconfirmedError(result)
        }
        return result
      }
      abortHandler = () => {
        void requestAbort('renderer-abort').catch((error) => {
          lifecycle.rejectAfter([], error)
        })
      }

      pending = {
        cardId: scope.cardId,
        sessionId,
        logicalTurnId: payload.turnId,
        lifecycle,
        requestAbort,
        dispose,
        visibleReplyExecution: null,
        visibleReplyCritic: null,
        visibleReplyClosure: null,
      }
      pendingAlicizationChatStreams.set(key, pending)

      if (!isCurrentAlicizationCard(pending.cardId)) {
        await retirePendingAlicizationStream(
          pending,
          createAlicizationAbortError('renderer-card-switch'),
          {
            abortReason: 'renderer-card-switch',
          },
        )
        return
      }

      if (options.abortSignal?.aborted) {
        try {
          await requestAbort('renderer-abort')
        }
        catch (abortError) {
          lifecycle.rejectAfter([], abortError)
          return
        }
        lifecycle.rejectAfter([], createAlicizationAbortError('renderer-abort'))
        return
      }

      options.abortSignal?.addEventListener('abort', abortHandler, { once: true })

      const transportPayloadResult = sanitizeRendererAlicizationChatStartPayload(scope.cardId, payload)
      const transportPayload = transportPayloadResult.value
      const transportPayloadSummary = summarizeAlicizationChatStartPayloadForTransport(transportPayload)

      try {
        void alicizationAppendAuditLog({
          ...scope,
          level: 'notice',
          category: 'alicization.main-gateway',
          action: 'renderer-chat-start-requested',
          message: 'Renderer requested main-process Alicization chat stream startup.',
          payload: {
            turnId: transportPayload.turnId,
            providerId: transportPayload.providerId,
            model: transportPayload.model,
            messageCount: Array.isArray(transportPayload.messages) ? transportPayload.messages.length : 0,
            payloadBytes: estimateJsonPayloadBytes(transportPayload),
            transport: typeof window.electron?.ipcRenderer?.invoke === 'function' ? 'direct-ipc' : 'eventa',
            transportPayload: transportPayloadSummary,
            transportSanitization: transportPayloadResult.report.changed
              ? {
                  droppedCount: transportPayloadResult.report.droppedCount,
                  coercedCount: transportPayloadResult.report.coercedCount,
                  droppedPaths: transportPayloadResult.report.droppedPaths,
                  coercedPaths: transportPayloadResult.report.coercedPaths,
                }
              : undefined,
          },
        }).catch(() => {})
        let start = await invokeAlicizationChatStartTransport(transportPayload)
        if (!start.accepted && start.state === 'duplicate-running') {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            if (abortCoordinator.isAbortRequested())
              break
            await new Promise(resolveDelay => setTimeout(resolveDelay, 120 * (attempt + 1)))
            if (abortCoordinator.isAbortRequested())
              break
            start = await invokeAlicizationChatStartTransport(transportPayload)
            if (start.accepted || start.state !== 'duplicate-running')
              break
          }
        }
        void alicizationAppendAuditLog({
          ...scope,
          level: start.accepted ? 'notice' : 'warning',
          category: 'alicization.main-gateway',
          action: 'renderer-chat-start-resolved',
          message: start.accepted
            ? 'Renderer received accepted response for main-process Alicization chat stream startup.'
            : 'Renderer received rejected response for main-process Alicization chat stream startup.',
          payload: {
            turnId: payload.turnId,
            accepted: start.accepted,
            state: start.state,
            reason: start.reason,
          },
        }).catch(() => {})
        if (start.accepted) {
          mainStartAccepted = true
          const abortResult = await abortCoordinator.reconcileAcceptedStart()
          if (abortCoordinator.isAbortRequested()) {
            if (
              abortResult
              && !abortResult.accepted
              && abortResult.state !== 'aborted'
            ) {
              void reconcileSessionTurnsFromMain(sessionId)
              lifecycle.rejectAfter(
                [],
                new AlicizationChatAbortUnconfirmedError(abortResult),
              )
            }
            else if (!abortCoordinator.isAbortAccepted()) {
              lifecycle.rejectAfter(
                [],
                createAlicizationAbortError('renderer-abort'),
              )
            }
            return
          }
          lifecycle.publish(
            bridgeAlicizationChatStartResultToStreamEvent(scope.cardId, start),
          )
        }
        if (!start.accepted && abortCoordinator.isAbortRequested()) {
          if (
            start.state !== 'duplicate-running'
            || !abortCoordinator.isAbortAccepted()
          ) {
            lifecycle.rejectAfter(
              [],
              createAlicizationAbortError('renderer-abort'),
            )
          }
          return
        }
        if (!start.accepted) {
          const state = typeof start.state === 'string' ? start.state : 'unknown'
          lifecycle.rejectAfter(
            [],
            createAlicizationStreamError(
              typeof start.reason === 'string' && start.reason.trim()
                ? alicizationChatStreamText('start-rejected-with-reason', {
                    turnId: payload.turnId,
                    state,
                    reason: start.reason,
                  })
                : alicizationChatStreamText('start-rejected', {
                    turnId: payload.turnId,
                    state,
                  }),
              'alicization-stream-start-rejected',
            ),
          )
        }
      }
      catch (error) {
        void alicizationAppendAuditLog({
          ...scope,
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'renderer-chat-start-error',
          message: 'Renderer chat start invoke failed before stream handshake completed.',
          payload: {
            turnId: payload.turnId,
            reason: error instanceof Error ? error.message : String(error),
            transportPayload: transportPayloadSummary,
            transportSanitization: transportPayloadResult.report.changed
              ? {
                  droppedCount: transportPayloadResult.report.droppedCount,
                  coercedCount: transportPayloadResult.report.coercedCount,
                  droppedPaths: transportPayloadResult.report.droppedPaths,
                  coercedPaths: transportPayloadResult.report.coercedPaths,
                }
              : undefined,
          },
        }).catch(() => {})
        if (abortCoordinator.isAbortRequested()) {
          try {
            await abortCoordinator.reconcileAcceptedStart()
          }
          catch (abortError) {
            lifecycle.rejectAfter([], abortError)
            return
          }
          if (!abortCoordinator.isAbortAccepted()) {
            lifecycle.rejectAfter(
              [],
              createAlicizationAbortError('renderer-abort'),
            )
          }
        }
        else {
          lifecycle.rejectAfter([], error)
        }
      }
    })()
  }),
  clearAllConversations: async () => await alicizationClearAllConversations(),
  deleteCardScope: async scope => await alicizationDeleteCardScope(scope),
  deleteAllData: async () => await alicizationDeleteAllData(),
})

interface EventEnvelope<T> { body?: T }

context.value.on(alicizationSoulChanged, (event: EventEnvelope<AlicizationCardScope & AlicizationSoulSnapshot>) => {
  const payload = event?.body
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  const { cardId: _cardId, ...snapshot } = payload
  alicizationEpoch1Store.setSoulSnapshot(snapshot)
  void alicizationEpoch1Store.refreshOrganicMemorySnapshot()
})

context.value.on(alicizationKillSwitchStateChanged, (event: EventEnvelope<AlicizationCardScope & AlicizationKillSwitchSnapshot>) => {
  const payload = event?.body
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  const { cardId: _cardId, ...snapshot } = payload
  alicizationEpoch1Store.setKillSwitchSnapshot(snapshot)
})

context.value.on(alicizationDialogueResponded, (event: EventEnvelope<AlicizationDialogueRespondedPayload>) => handleAlicizationDialogueRespondedPayload(event?.body))
context.value.on(electronAlicizationVisualPresenceChanged, (event: EventEnvelope<AlicizationPresencePulsePayload>) => handleAlicizationVisualPresencePayload(event?.body))
context.value.on(electronAlicizationVisualPresenceStateChanged, (event: EventEnvelope<AlicizationVisualPresenceStateChangedPayload>) => handleAlicizationVisualPresenceStatePayload(event?.body))

context.value.on(alicizationSafetyPermissionRequested, (event: EventEnvelope<AlicizationSafetyPermissionRequest>) => {
  const payload = event?.body
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  pendingHitlRequests.value = [...pendingHitlRequests.value, payload]
  popNextHitlRequest()
})

context.value.on(alicizationChatStreamChunk, (event: EventEnvelope<AlicizationChatStreamChunkEvent>) => {
  if (event?.body && chatStreamIngressDeduplicator.accept('eventa', 'chunk', event.body))
    handleAlicizationChatStreamChunk(event.body)
})

context.value.on(alicizationChatStreamMeta, (event: EventEnvelope<AlicizationChatMetaEvent>) => {
  if (event?.body && chatStreamIngressDeduplicator.accept('eventa', 'meta', event.body))
    handleAlicizationChatStreamMeta(event.body)
})

context.value.on(alicizationChatStreamToolCall, (event: EventEnvelope<AlicizationChatToolCallEvent>) => {
  if (event?.body && chatStreamIngressDeduplicator.accept('eventa', 'tool-call', event.body))
    handleAlicizationChatStreamToolCall(event.body)
})

context.value.on(alicizationChatStreamToolResult, (event: EventEnvelope<AlicizationChatToolResultEvent>) => {
  if (event?.body && chatStreamIngressDeduplicator.accept('eventa', 'tool-result', event.body))
    handleAlicizationChatStreamToolResult(event.body)
})

context.value.on(alicizationChatStreamToolProgress, (event: EventEnvelope<AlicizationChatToolProgressEvent>) => {
  if (event?.body && chatStreamIngressDeduplicator.accept('eventa', 'tool-progress', event.body))
    handleAlicizationChatStreamToolProgress(event.body)
})

context.value.on(alicizationChatStreamError, (event: EventEnvelope<AlicizationChatErrorEvent>) => {
  if (event?.body && chatStreamIngressDeduplicator.accept('eventa', 'error', event.body))
    handleAlicizationChatStreamError(event.body)
})

context.value.on(alicizationChatStreamFinish, (event: EventEnvelope<AlicizationChatFinishEvent>) => {
  if (event?.body && chatStreamIngressDeduplicator.accept('eventa', 'finish', event.body))
    handleAlicizationChatStreamFinish(event.body)
})

// NOTICE: register plugin host bridge during setup to avoid race with pages using it in immediate watchers.
pluginHostInspectorStore.setBridge({
  list: () => listPlugins(),
  setEnabled: payload => setPluginEnabled(payload),
  loadEnabled: () => loadEnabledPlugins(),
  load: payload => loadPlugin(payload),
  unload: payload => unloadPlugin(payload),
  inspect: () => inspectPluginHost(),
})

// NOTICE: MCP tools are declared from stage-ui and executed during model streaming.
// Register runtime bridge during setup to avoid missing bridge in early tool invocations.
setMcpToolBridge({
  listTools: () => listMcpTools(),
  callTool: payload => callMcpTool({
    ...payload,
    cardId: activeCardId.value || 'default',
  }),
})

watch(language, () => {
  i18n.locale.value = language.value
  setLocale(language.value)
})

watch(activeCardId, (_cardId, previousCardId) => {
  alicizationRendererScopeEpoch += 1
  if (previousCardId?.trim()) {
    void retirePendingAlicizationStreamsForCard(
      previousCardId,
      createAlicizationAbortError('renderer-card-switch'),
    )
  }
  currentHitlRequest.value = null
  pendingHitlRequests.value = []
  hitlResolving.value = false
  proactiveBackfillInFlight.clear()
  void alicizationEpoch1Store.refreshSoul()
  void alicizationEpoch1Store.syncKillSwitchState()
  void alicizationEpoch1Store.refreshMemoryStats()
  void alicizationEpoch1Store.refreshOrganicMemorySnapshot()
  if (activeSessionId.value?.trim()) {
    void Promise.all([
      backfillProactiveTurnsForSession(activeSessionId.value),
      reconcileSessionTurnsFromMain(activeSessionId.value),
    ])
  }
}, { immediate: true })

watch(activeSessionId, (sessionId) => {
  alicizationRendererScopeEpoch += 1
  if (!sessionId?.trim())
    return
  void alicizationSetActiveSession({
    ...resolveAlicizationScope(),
    sessionId,
  })
  void Promise.all([
    backfillProactiveTurnsForSession(sessionId),
    reconcileSessionTurnsFromMain(sessionId),
  ])
}, { immediate: true })

watch([activeProvider, activeModel, providers], () => scheduleMainLlmConfigSync(), { deep: true, immediate: true })

const { updateThemeColor } = useThemeColor(themeColorFromValue({ light: 'rgb(255 255 255)', dark: 'rgb(18 18 18)' }))
watch(dark, () => updateThemeColor(), { immediate: true })
watch(route, () => updateThemeColor(), { immediate: true })
onMounted(() => updateThemeColor())

context.value.on(electronSettingsNavigate, (event: EventEnvelope<{ route: string }>) => {
  const targetRoute = event?.body?.route
  if (!targetRoute || route.fullPath === targetRoute) {
    return
  }

  void router.push(targetRoute).catch((error) => {
    console.warn('Failed to navigate settings window:', error)
  })
})

onMounted(async () => {
  window.setTimeout(() => {
    usePerfTracerBridgeStore()
    initializeStageThreeRuntimeTraceBridge()
    void stageWindowLifecycleStore.initializeWindowLifecycleBridge()
  }, 0)

  analyticsStore.initialize()
  cardStore.initialize()
  await alicizationEpoch1Store.initialize()

  await chatSessionStore.initialize()
  await hydrateMainLlmConfig()
  scheduleMainLlmConfigSync()
  if (activeSessionId.value?.trim()) {
    await Promise.all([
      backfillProactiveTurnsForSession(activeSessionId.value),
      reconcileSessionTurnsFromMain(activeSessionId.value),
    ])
  }
  await displayModelsStore.loadDisplayModelsFromIndexedDB()
  await settingsStore.initializeStageModel()

  const serverChannelConfig = await getServerChannelConfig()
  serverChannelSettingsStore.websocketTlsConfig = serverChannelConfig.tlsConfig

  await serverChannelStore.initialize({ possibleEvents: ['ui:configure'] }).catch(err => console.error('Failed to initialize Mods Server Channel in App.vue:', err))
  await contextBridgeStore.initialize()
  characterOrchestratorStore.initialize()
  await startTrackingCursorPoint()

  // Expose stage provider definitions to plugin host APIs.
  defineInvokeHandler(context.value, pluginProtocolListProviders, async () => listProvidersForPluginHost())

  if (shouldPublishPluginHostCapabilities()) {
    await reportPluginCapability({
      key: pluginProtocolListProvidersEventName,
      state: 'ready',
      metadata: {
        source: 'stage-ui',
      },
    })
  }
})

watch(themeColorsHue, () => {
  document.documentElement.style.setProperty('--chromatic-hue', themeColorsHue.value.toString())
}, { immediate: true })

watch(themeColorsHueDynamic, () => {
  document.documentElement.classList.toggle('dynamic-hue', themeColorsHueDynamic.value)
}, { immediate: true })

onUnmounted(() => {
  if (llmSyncTimer)
    clearTimeout(llmSyncTimer)
  removeAlicizationChatStreamDispatchListener?.()
  void retireAllPendingAlicizationStreams(
    createAlicizationStreamError(
      alicizationChatStreamText('renderer-unmounted'),
      'alicization-stream-renderer-unmounted',
    ),
  )
  alicizationConversationCardIdsBySession.clear()
  contextBridgeStore.dispose()
  clearMcpToolBridge()
  alicizationEpoch1Store.dispose()
  clearAlicizationBridge()
})
</script>

<template>
  <ToasterRoot @close="id => toast.dismiss(id)">
    <Toaster />
  </ToasterRoot>
  <AlicizationHitlModal
    :request="currentHitlRequest"
    :resolving="hitlResolving"
    @decide="resolveHitlDecision"
  />
  <ResizeHandler v-if="route.path !== '/'" />
  <RouterView />
</template>

<style>
/* We need this to properly animate the CSS variable */
@property --chromatic-hue {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}

@keyframes hue-anim {
  from {
    --chromatic-hue: 0;
  }
  to {
    --chromatic-hue: 360;
  }
}

.dynamic-hue {
  animation: hue-anim 10s linear infinite;
}
</style>
