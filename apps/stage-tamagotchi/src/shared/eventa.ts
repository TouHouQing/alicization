import type { Locale } from '@intlify/core'
import type { ServerOptions } from '@proj-alicization/server-runtime/server'
import type {
  AlicizationAffectiveResidueEntrySnapshot as SharedAlicizationAffectiveResidueEntrySnapshot,
  AlicizationAffectiveResidueKind as SharedAlicizationAffectiveResidueKind,
  AlicizationAffectiveResidueMemorySnapshot as SharedAlicizationAffectiveResidueMemorySnapshot,
  AlicizationAnswerAct as SharedAlicizationAnswerAct,
  AlicizationAnswerEvidenceMode as SharedAlicizationAnswerEvidenceMode,
  AlicizationAppendExecutionEventsInput as SharedAlicizationAppendExecutionEventsInput,
  AlicizationChannelCapability as SharedAlicizationChannelCapability,
  AlicizationChannelCapabilityManifestRecord as SharedAlicizationChannelCapabilityManifestRecord,
  AlicizationChannelCapabilityManifestUpsertInput as SharedAlicizationChannelCapabilityManifestUpsertInput,
  AlicizationChatFailureSurface as SharedAlicizationChatFailureSurface,
  AlicizationChatMemoryFailureSurface as SharedAlicizationChatMemoryFailureSurface,
  AlicizationChatTimeoutDescriptor as SharedAlicizationChatTimeoutDescriptor,
  AlicizationClaudeCodeCommandInput as SharedAlicizationClaudeCodeCommandInput,
  AlicizationClawFabricPlan as SharedAlicizationClawFabricPlan,
  AlicizationClawTaskIntent as SharedAlicizationClawTaskIntent,
  AlicizationCliCommandInput as SharedAlicizationCliCommandInput,
  AlicizationCodexCommandInput as SharedAlicizationCodexCommandInput,
  AlicizationCorrectHumanlikeMemoryAuditInput as SharedAlicizationCorrectHumanlikeMemoryAuditInput,
  AlicizationDerivedMemoryReference as SharedAlicizationDerivedMemoryReference,
  AlicizationDerivedMindStateBundle as SharedAlicizationDerivedMindStateBundle,
  AlicizationDialogueEmbodimentEnvelope as SharedAlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload as SharedAlicizationDialoguePerformancePayload,
  AlicizationDialogueReplyFeedbackFact as SharedAlicizationDialogueReplyFeedbackFact,
  AlicizationDialogueRespondedPayload as SharedAlicizationDialogueRespondedPayload,
  AlicizationDialogueSpeechTimeline as SharedAlicizationDialogueSpeechTimeline,
  AlicizationDialogueStructuredFormat as SharedAlicizationDialogueStructuredFormat,
  AlicizationDialogueStructuredPayload as SharedAlicizationDialogueStructuredPayload,
  AlicizationDigitalLifeEnvelope as SharedAlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeFrame as SharedAlicizationDigitalLifeFrame,
  AlicizationDigitalLifeLipSyncPlan as SharedAlicizationDigitalLifeLipSyncPlan,
  AlicizationDigitalLifeSpineDigest as SharedAlicizationDigitalLifeSpineDigest,
  AlicizationDigitalLifeSpineMemoryClosureTrace as SharedAlicizationDigitalLifeSpineMemoryClosureTrace,
  AlicizationDigitalLifeSpineMemoryDigest as SharedAlicizationDigitalLifeSpineMemoryDigest,
  AlicizationDispatchTaskThreadInput as SharedAlicizationDispatchTaskThreadInput,
  AlicizationDispatchTaskThreadResult as SharedAlicizationDispatchTaskThreadResult,
  AlicizationEmbodimentContinuityLane as SharedAlicizationEmbodimentContinuityLane,
  AlicizationEmbodimentContinuityLaneStatus as SharedAlicizationEmbodimentContinuityLaneStatus,
  AlicizationEmbodimentContinuityLedgerSnapshot as SharedAlicizationEmbodimentContinuityLedgerSnapshot,
  AlicizationEmbodimentFaceCue as SharedAlicizationEmbodimentFaceCue,
  AlicizationEmbodimentLipSyncPlan as SharedAlicizationEmbodimentLipSyncPlan,
  AlicizationEmbodimentLipSyncVisemeHint as SharedAlicizationEmbodimentLipSyncVisemeHint,
  AlicizationEmbodimentMotionBurst as SharedAlicizationEmbodimentMotionBurst,
  AlicizationEmbodimentScriptState as SharedAlicizationEmbodimentScriptState,
  AlicizationEmbodimentScriptV1 as SharedAlicizationEmbodimentScriptV1,
  AlicizationEmotion as SharedAlicizationEmotion,
  AlicizationEmotionalKernelSnapshot as SharedAlicizationEmotionalKernelSnapshot,
  AlicizationEmotionalTransitionLedgerSnapshot as SharedAlicizationEmotionalTransitionLedgerSnapshot,
  AlicizationEpisodicEventInput as SharedAlicizationEpisodicEventInput,
  AlicizationEpisodicEventRecord as SharedAlicizationEpisodicEventRecord,
  AlicizationEpisodicEventSourceKind as SharedAlicizationEpisodicEventSourceKind,
  AlicizationEpisodicReconsolidationSnapshot as SharedAlicizationEpisodicReconsolidationSnapshot,
  AlicizationExecutionChannel as SharedAlicizationExecutionChannel,
  AlicizationExecutionEventInput as SharedAlicizationExecutionEventInput,
  AlicizationExecutionEventKind as SharedAlicizationExecutionEventKind,
  AlicizationExecutionEventRecord as SharedAlicizationExecutionEventRecord,
  AlicizationExecutionTaskKind as SharedAlicizationExecutionTaskKind,
  AlicizationExecutionTurnOrigin as SharedAlicizationExecutionTurnOrigin,
  AlicizationExecutorSessionRecord as SharedAlicizationExecutorSessionRecord,
  AlicizationExecutorSessionStatus as SharedAlicizationExecutorSessionStatus,
  AlicizationExecutorSessionUpsertInput as SharedAlicizationExecutorSessionUpsertInput,
  AlicizationGender as SharedAlicizationGender,
  AlicizationGenesisInput as SharedAlicizationGenesisInput,
  AlicizationHostPersonModelSnapshot as SharedAlicizationHostPersonModelSnapshot,
  AlicizationHumanlikeMemoryAuditEntry as SharedAlicizationHumanlikeMemoryAuditEntry,
  AlicizationHumanlikeMemoryCorrectionRecord as SharedAlicizationHumanlikeMemoryCorrectionRecord,
  AlicizationInfraVisibleReplyAuthority as SharedAlicizationInfraVisibleReplyAuthority,
  AlicizationKnowledgeAssimilationCorrection as SharedAlicizationKnowledgeAssimilationCorrection,
  AlicizationKnowledgeAssimilationStage as SharedAlicizationKnowledgeAssimilationStage,
  AlicizationKnowledgeValidationStatus as SharedAlicizationKnowledgeValidationStatus,
  AlicizationLearningAction as SharedAlicizationLearningAction,
  AlicizationLearningArtifactLedgerRecord as SharedAlicizationLearningArtifactLedgerRecord,
  AlicizationLearningExecutionStateSnapshot as SharedAlicizationLearningExecutionStateSnapshot,
  AlicizationLearningTaskFailureKind as SharedAlicizationLearningTaskFailureKind,
  AlicizationLearningTaskPayload as SharedAlicizationLearningTaskPayload,
  AlicizationLearningTaskRecord as SharedAlicizationLearningTaskRecord,
  AlicizationLearningTaskStatus as SharedAlicizationLearningTaskStatus,
  AlicizationListChannelCapabilityManifestsInput as SharedAlicizationListChannelCapabilityManifestsInput,
  AlicizationListExecutionEventsInput as SharedAlicizationListExecutionEventsInput,
  AlicizationListExecutorSessionsInput as SharedAlicizationListExecutorSessionsInput,
  AlicizationListHumanlikeMemoryAuditInput as SharedAlicizationListHumanlikeMemoryAuditInput,
  AlicizationListLearningArtifactLedgerInput as SharedAlicizationListLearningArtifactLedgerInput,
  AlicizationListMemoryDecisionTracesInput as SharedAlicizationListMemoryDecisionTracesInput,
  AlicizationListMindTurnEventsInput as SharedAlicizationListMindTurnEventsInput,
  AlicizationListPersonStateUpdatesInput as SharedAlicizationListPersonStateUpdatesInput,
  AlicizationListTaskThreadsInput as SharedAlicizationListTaskThreadsInput,
  AlicizationLocalVisualCommandInput as SharedAlicizationLocalVisualCommandInput,
  AlicizationLongHorizonMemoryCueInfluence as SharedAlicizationLongHorizonMemoryCueInfluence,
  AlicizationLongHorizonMemoryCueSnapshot as SharedAlicizationLongHorizonMemoryCueSnapshot,
  AlicizationLongHorizonMemorySnapshot as SharedAlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryArchiveRecord as SharedAlicizationMemoryArchiveRecord,
  AlicizationMemoryDecisionTraceRecord as SharedAlicizationMemoryDecisionTraceRecord,
  AlicizationMemoryDeliberation as SharedAlicizationMemoryDeliberation,
  AlicizationMemoryDeliberationConflictSeverity as SharedAlicizationMemoryDeliberationConflictSeverity,
  AlicizationMemoryDeliberationConflictVariant as SharedAlicizationMemoryDeliberationConflictVariant,
  AlicizationMemoryDeliberationSelectedBundle as SharedAlicizationMemoryDeliberationSelectedBundle,
  AlicizationMemoryDeliberationSelectedChain as SharedAlicizationMemoryDeliberationSelectedChain,
  AlicizationMemoryDeliberationSelectedEpisode as SharedAlicizationMemoryDeliberationSelectedEpisode,
  AlicizationMemoryDeliberationSelectedEra as SharedAlicizationMemoryDeliberationSelectedEra,
  AlicizationMemoryDeliberationSelectedPeriod as SharedAlicizationMemoryDeliberationSelectedPeriod,
  AlicizationMemoryDeliberationSelectedProcedure as SharedAlicizationMemoryDeliberationSelectedProcedure,
  AlicizationMemoryDomain as SharedAlicizationMemoryDomain,
  AlicizationMemoryFact as SharedAlicizationMemoryFact,
  AlicizationMemoryFactInput as SharedAlicizationMemoryFactInput,
  AlicizationMemoryFollowUpAffordance as SharedAlicizationMemoryFollowUpAffordance,
  AlicizationMemoryFollowUpIntrusionRisk as SharedAlicizationMemoryFollowUpIntrusionRisk,
  AlicizationMemoryFollowUpPayoffDependency as SharedAlicizationMemoryFollowUpPayoffDependency,
  AlicizationMemoryFollowUpPreferredTiming as SharedAlicizationMemoryFollowUpPreferredTiming,
  AlicizationMemoryProvenance as SharedAlicizationMemoryProvenance,
  AlicizationMemoryRecollectionAgendaSnapshot as SharedAlicizationMemoryRecollectionAgendaSnapshot,
  AlicizationMemoryRecollectionEraFacet as SharedAlicizationMemoryRecollectionEraFacet,
  AlicizationMemoryRecollectionIntentSnapshot as SharedAlicizationMemoryRecollectionIntentSnapshot,
  AlicizationMemoryRecollectionMode as SharedAlicizationMemoryRecollectionMode,
  AlicizationMemoryRecollectionTemporalFocus as SharedAlicizationMemoryRecollectionTemporalFocus,
  AlicizationMemoryReflectionInput as SharedAlicizationMemoryReflectionInput,
  AlicizationMemoryReflectionRecord as SharedAlicizationMemoryReflectionRecord,
  AlicizationMemoryReflectionSourceKind as SharedAlicizationMemoryReflectionSourceKind,
  AlicizationMemoryReflectionStatus as SharedAlicizationMemoryReflectionStatus,
  AlicizationMemoryReflectionTargetScope as SharedAlicizationMemoryReflectionTargetScope,
  AlicizationMemoryResolutionLedger as SharedAlicizationMemoryResolutionLedger,
  AlicizationMemorySource as SharedAlicizationMemorySource,
  AlicizationMemoryStats as SharedAlicizationMemoryStats,
  AlicizationMemoryTier as SharedAlicizationMemoryTier,
  AlicizationMemoryUpsertTrace as SharedAlicizationMemoryUpsertTrace,
  AlicizationMindHeadKey as SharedAlicizationMindHeadKey,
  AlicizationMindTurnEventInput as SharedAlicizationMindTurnEventInput,
  AlicizationMindTurnEventKind as SharedAlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord as SharedAlicizationMindTurnEventRecord,
  AlicizationMindTurnGovernance as SharedAlicizationMindTurnGovernance,
  AlicizationNormalVisibleReplyAuthority as SharedAlicizationNormalVisibleReplyAuthority,
  AlicizationOpenClawCommandInput as SharedAlicizationOpenClawCommandInput,
  AlicizationOrganicMemoryStageReplay as SharedAlicizationOrganicMemoryStageReplay,
  AlicizationPerformanceDelivery as SharedAlicizationPerformanceDelivery,
  AlicizationPerformanceManifestClampResult as SharedAlicizationPerformanceManifestClampResult,
  AlicizationPersistentPresenceAuthoritySnapshot as SharedAlicizationPersistentPresenceAuthoritySnapshot,
  AlicizationPersonaEvolutionSeed as SharedAlicizationPersonaEvolutionSeed,
  AlicizationPersonaExpressionProfile as SharedAlicizationPersonaExpressionProfile,
  AlicizationPersonaGradualUnlockFacetKind as SharedAlicizationPersonaGradualUnlockFacetKind,
  AlicizationPersonaGradualUnlockFacetSnapshot as SharedAlicizationPersonaGradualUnlockFacetSnapshot,
  AlicizationPersonaGradualUnlockHypothesisSnapshot as SharedAlicizationPersonaGradualUnlockHypothesisSnapshot,
  AlicizationPersonaGradualUnlockSnapshot as SharedAlicizationPersonaGradualUnlockSnapshot,
  AlicizationPersonaIdentityKernel as SharedAlicizationPersonaIdentityKernel,
  AlicizationPersonaInitiativeBaseline as SharedAlicizationPersonaInitiativeBaseline,
  AlicizationPersonaInitiativeStyle as SharedAlicizationPersonaInitiativeStyle,
  AlicizationPersonalityState as SharedAlicizationPersonalityState,
  AlicizationPersonaReinforcementDimension as SharedAlicizationPersonaReinforcementDimension,
  AlicizationPersonaReinforcementEventInput as SharedAlicizationPersonaReinforcementEventInput,
  AlicizationPersonaReinforcementEventRecord as SharedAlicizationPersonaReinforcementEventRecord,
  AlicizationPersonaReinforcementValence as SharedAlicizationPersonaReinforcementValence,
  AlicizationPersonaRelationshipPosture as SharedAlicizationPersonaRelationshipPosture,
  AlicizationPersonaTemperament as SharedAlicizationPersonaTemperament,
  AlicizationPersonaWorkshopSubmission as SharedAlicizationPersonaWorkshopSubmission,
  AlicizationPersonStateEvolutionEntryInput as SharedAlicizationPersonStateEvolutionEntryInput,
  AlicizationPersonStateEvolutionEntryRecord as SharedAlicizationPersonStateEvolutionEntryRecord,
  AlicizationPersonStateEvolutionShift as SharedAlicizationPersonStateEvolutionShift,
  AlicizationPersonStateEvolutionShiftKind as SharedAlicizationPersonStateEvolutionShiftKind,
  AlicizationPersonStateEvolutionSummary as SharedAlicizationPersonStateEvolutionSummary,
  AlicizationPersonStateUpdateRecord as SharedAlicizationPersonStateUpdateRecord,
  AlicizationPersonStateUpdateSourceTrailEntry as SharedAlicizationPersonStateUpdateSourceTrailEntry,
  AlicizationPersonStateUpdateSurface as SharedAlicizationPersonStateUpdateSurface,
  AlicizationPlanTaskThreadInput as SharedAlicizationPlanTaskThreadInput,
  AlicizationPlanTaskThreadResult as SharedAlicizationPlanTaskThreadResult,
  AlicizationProactiveMetadata as SharedAlicizationProactiveMetadata,
  AlicizationProviderToolCapabilityObservation as SharedAlicizationProviderToolCapabilityObservation,
  AlicizationRealtimeCategory as SharedAlicizationRealtimeCategory,
  AlicizationRealtimeExecutePayload as SharedAlicizationRealtimeExecutePayload,
  AlicizationRealtimeExecuteResult as SharedAlicizationRealtimeExecuteResult,
  AlicizationRecallLatencyPolicySnapshot as SharedAlicizationRecallLatencyPolicySnapshot,
  AlicizationRecollectionAmbiguityPosture as SharedAlicizationRecollectionAmbiguityPosture,
  AlicizationRecollectionCertainty as SharedAlicizationRecollectionCertainty,
  AlicizationRecollectionEvidenceGap as SharedAlicizationRecollectionEvidenceGap,
  AlicizationRecollectionNarrativeSnapshot as SharedAlicizationRecollectionNarrativeSnapshot,
  AlicizationRecollectionPlan as SharedAlicizationRecollectionPlan,
  AlicizationRecollectionSearchAction as SharedAlicizationRecollectionSearchAction,
  AlicizationRecollectionSearchFocus as SharedAlicizationRecollectionSearchFocus,
  AlicizationRecollectionSearchTrace as SharedAlicizationRecollectionSearchTrace,
  AlicizationRecollectionSpeechPlan as SharedAlicizationRecollectionSpeechPlan,
  AlicizationRecollectionSurfaceMode as SharedAlicizationRecollectionSurfaceMode,
  AlicizationRelationshipCadenceMemorySnapshot as SharedAlicizationRelationshipCadenceMemorySnapshot,
  AlicizationRelationshipOutcomeInput as SharedAlicizationRelationshipOutcomeInput,
  AlicizationRelationshipOutcomeRecord as SharedAlicizationRelationshipOutcomeRecord,
  AlicizationRelationshipOutcomeSourceKind as SharedAlicizationRelationshipOutcomeSourceKind,
  AlicizationReplayBenchmarkDatasetFeedback as SharedAlicizationReplayBenchmarkDatasetFeedback,
  AlicizationReplayBenchmarkFailureTurnRecord as SharedAlicizationReplayBenchmarkFailureTurnRecord,
  AlicizationReplayBenchmarkGateDimensionReport as SharedAlicizationReplayBenchmarkGateDimensionReport,
  AlicizationReplayBenchmarkGateReport as SharedAlicizationReplayBenchmarkGateReport,
  AlicizationReplayBenchmarkPackId as SharedAlicizationReplayBenchmarkPackId,
  AlicizationReplayBenchmarkStandardsRecord as SharedAlicizationReplayBenchmarkStandardsRecord,
  AlicizationReplayBenchmarkTelemetryPatch as SharedAlicizationReplayBenchmarkTelemetryPatch,
  AlicizationReplayBenchmarkTracePointer as SharedAlicizationReplayBenchmarkTracePointer,
  AlicizationReplayHumanRatingDimension as SharedAlicizationReplayHumanRatingDimension,
  AlicizationReplayHumanRatingRubric as SharedAlicizationReplayHumanRatingRubric,
  AlicizationReplayMemoryQualityRecord as SharedAlicizationReplayMemoryQualityRecord,
  AlicizationResidentPerformanceSnapshot as SharedAlicizationResidentPerformanceSnapshot,
  AlicizationResumeTaskThreadInput as SharedAlicizationResumeTaskThreadInput,
  AlicizationResumeTaskThreadResult as SharedAlicizationResumeTaskThreadResult,
  AlicizationRunReplayBenchmarkInput as SharedAlicizationRunReplayBenchmarkInput,
  AlicizationRunReplayBenchmarkResult as SharedAlicizationRunReplayBenchmarkResult,
  AlicizationRuntimeDigest as SharedAlicizationRuntimeDigest,
  AlicizationRuntimeEventEnvelope as SharedAlicizationRuntimeEventEnvelope,
  AlicizationRuntimeToolCardProjection as SharedAlicizationRuntimeToolCardProjection,
  AlicizationRuntimeToolProjectionUpdate as SharedAlicizationRuntimeToolProjectionUpdate,
  AlicizationSelfEvolutionKernelSnapshot as SharedAlicizationSelfEvolutionKernelSnapshot,
  AlicizationSelfEvolutionVersionRuntimeSnapshot as SharedAlicizationSelfEvolutionVersionRuntimeSnapshot,
  AlicizationSensoryCacheSnapshot as SharedAlicizationSensoryCacheSnapshot,
  AlicizationSensoryCaptureHealth as SharedAlicizationSensoryCaptureHealth,
  AlicizationSensoryCaptureLeaseStatus as SharedAlicizationSensoryCaptureLeaseStatus,
  AlicizationSensoryCapturePermission as SharedAlicizationSensoryCapturePermission,
  AlicizationSensoryCaptureSnapshot as SharedAlicizationSensoryCaptureSnapshot,
  AlicizationSubconsciousFragmentSourceKind as SharedAlicizationSubconsciousFragmentSourceKind,
  AlicizationSystemProbeDegradeReason as SharedAlicizationSystemProbeDegradeReason,
  AlicizationSystemProbeSample as SharedAlicizationSystemProbeSample,
  AlicizationTaskThreadRecord as SharedAlicizationTaskThreadRecord,
  AlicizationTaskThreadRecoveryAction as SharedAlicizationTaskThreadRecoveryAction,
  AlicizationTaskThreadRecoveryActionKind as SharedAlicizationTaskThreadRecoveryActionKind,
  AlicizationTaskThreadRecoveryProjection as SharedAlicizationTaskThreadRecoveryProjection,
  AlicizationTaskThreadRecoverySafety as SharedAlicizationTaskThreadRecoverySafety,
  AlicizationTaskThreadStatus as SharedAlicizationTaskThreadStatus,
  AlicizationTaskThreadUpsertInput as SharedAlicizationTaskThreadUpsertInput,
  AlicizationVisibleArtifactLearningPolicy as SharedAlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin as SharedAlicizationVisibleArtifactOrigin,
  AlicizationVisibleReplyExecutionAuthority as SharedAlicizationVisibleReplyExecutionAuthority,
  AlicizationVisibleReplyRealizationTransportArtifact as SharedAlicizationVisibleReplyRealizationTransportArtifact,
  CharacterActionCapability as SharedCharacterActionCapability,
  CharacterFacialCapability as SharedCharacterFacialCapability,
  CharacterPerformanceCapabilitiesManifest as SharedCharacterPerformanceCapabilitiesManifest,
  CharacterPerformanceEmbodimentHints as SharedCharacterPerformanceEmbodimentHints,
} from '@proj-alicization/stage-shared'
import type * as SharedMemoryWorkbench from '@proj-alicization/stage-shared'
import type {
  ThreeHitTestReadTracePayload,
  ThreeSceneRenderInfoTracePayload,
  VrmDisposeEndTracePayload,
  VrmDisposeStartTracePayload,
  VrmLoadEndTracePayload,
  VrmLoadErrorTracePayload,
  VrmLoadStartTracePayload,
  VrmUpdateFrameTracePayload,
} from '@proj-alicization/stage-ui-three/trace'

import type { AlicizationPersonStateProjection } from '../main/services/alicization/person-state-projection'

import { defineEventa, defineInvokeEventa } from '@moeru/eventa'
import {
  alicizationEmotionWhitelist as sharedAlicizationEmotionWhitelist,
  clampAlicizationPerformancePayloadToManifest as sharedClampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmotion as sharedNormalizeAlicizationEmotion,
  normalizeAlicizationPerformanceDelivery as sharedNormalizeAlicizationPerformanceDelivery,
  normalizeAlicizationPerformancePayload as sharedNormalizeAlicizationPerformancePayload,
} from '@proj-alicization/stage-shared'

export const electronStartTrackMousePosition = defineInvokeEventa('eventa:invoke:electron:start-tracking-mouse-position')
export const electronStartDraggingWindow = defineInvokeEventa('eventa:invoke:electron:start-dragging-window')

export const electronOpenMainDevtools = defineInvokeEventa('eventa:invoke:electron:windows:main:devtools:open')
export const electronOpenSettings = defineInvokeEventa<void, { route?: string }>('eventa:invoke:electron:windows:settings:open')
export const electronSettingsNavigate = defineEventa<{ route: string }>('eventa:event:electron:windows:settings:navigate')
export const electronOpenChat = defineInvokeEventa('eventa:invoke:electron:windows:chat:open')
export const electronOpenSettingsDevtools = defineInvokeEventa('eventa:invoke:electron:windows:settings:devtools:open')
export const electronOpenDevtoolsWindow = defineInvokeEventa<void, { route?: string }>('eventa:invoke:electron:windows:devtools:open')
export const electronMainStageStartupStatusChannel = 'eventa:event:electron:windows:main:stage-startup-status'
export interface ElectronMainStageStartupStatusPayload {
  state: 'stage-page-mounted' | 'stage-mounted' | 'stage-unmounted'
  route: string
  timestamp: number
}

export interface ElectronServerChannelConfig {
  tlsConfig?: ServerOptions['tlsConfig'] | null
}
export const electronGetServerChannelConfig = defineInvokeEventa<ElectronServerChannelConfig>('eventa:invoke:electron:server-channel:get-config')
export const electronApplyServerChannelConfig = defineInvokeEventa<ElectronServerChannelConfig, Partial<ElectronServerChannelConfig>>('eventa:invoke:electron:server-channel:apply-config')

export const electronPluginList = defineInvokeEventa<PluginRegistrySnapshot>('eventa:invoke:electron:plugins:list')
export const electronPluginSetEnabled = defineInvokeEventa<PluginRegistrySnapshot, { name: string, enabled: boolean, path?: string }>('eventa:invoke:electron:plugins:set-enabled')
export const electronPluginLoadEnabled = defineInvokeEventa<PluginRegistrySnapshot>('eventa:invoke:electron:plugins:load-enabled')
export const electronPluginLoad = defineInvokeEventa<PluginRegistrySnapshot, { name: string }>('eventa:invoke:electron:plugins:load')
export const electronPluginUnload = defineInvokeEventa<PluginRegistrySnapshot, { name: string }>('eventa:invoke:electron:plugins:unload')
export const electronPluginInspect = defineInvokeEventa<PluginHostDebugSnapshot>('eventa:invoke:electron:plugins:inspect')
export const electronPluginUpdateCapability = defineInvokeEventa<PluginCapabilityState, PluginCapabilityPayload>('eventa:invoke:electron:plugins:capability:update')

export const pluginProtocolListProvidersEventName = 'proj-alicization:plugin-sdk:apis:protocol:resources:providers:list-providers'
export const pluginProtocolListProviders = defineInvokeEventa<Array<{ name: string }>>(pluginProtocolListProvidersEventName)

export const captionIsFollowingWindowChanged = defineEventa<boolean>('eventa:event:electron:windows:caption-overlay:is-following-window-changed')
export const captionGetIsFollowingWindow = defineInvokeEventa<boolean>('eventa:invoke:electron:windows:caption-overlay:get-is-following-window')

export type RequestWindowActionDefault = 'confirm' | 'cancel' | 'close'
export interface RequestWindowPayload {
  id?: string
  route: string
  type?: string
  payload?: Record<string, any>
}
export interface RequestWindowPending {
  id: string
  type?: string
  payload?: Record<string, any>
}

// Reference window helpers are generic; callers can alias for clarity
export type NoticeAction = 'confirm' | 'cancel' | 'close'

export function createRequestWindowEventa(namespace: string) {
  const prefix = (name: string) => `eventa:${name}:electron:windows:${namespace}`
  return {
    openWindow: defineInvokeEventa<boolean, RequestWindowPayload>(prefix('invoke:open')),
    windowAction: defineInvokeEventa<void, { id: string, action: RequestWindowActionDefault }>(prefix('invoke:action')),
    pageMounted: defineInvokeEventa<RequestWindowPending | undefined, { id?: string }>(prefix('invoke:page-mounted')),
    pageUnmounted: defineInvokeEventa<void, { id?: string }>(prefix('invoke:page-unmounted')),
  }
}

// Notice window events built from generic factory
export const noticeWindowEventa = createRequestWindowEventa('notice')

// Widgets / Adhoc window events
export interface WidgetsAddPayload {
  id?: string
  componentName: string
  componentProps?: Record<string, any>
  // size presets or explicit spans; renderer decides mapping
  size?: 's' | 'm' | 'l' | { cols?: number, rows?: number }
  // auto-dismiss in ms; if omitted, persistent until closed by user
  ttlMs?: number
}

export interface WidgetSnapshot {
  id: string
  componentName: string
  componentProps: Record<string, any>
  size: 's' | 'm' | 'l' | { cols?: number, rows?: number }
  ttlMs: number
}

export interface PluginManifestSummary {
  name: string
  entrypoints: Record<string, string | undefined>
  path: string
  enabled: boolean
  loaded: boolean
  isNew: boolean
}

export interface PluginRegistrySnapshot {
  root: string
  plugins: PluginManifestSummary[]
}

// TODO: Replace these manually duplicated IPC types with re-exports from
// @proj-alicization/plugin-sdk (CapabilityDescriptor) once stage-ui and the shared
// eventa layer can depend on the SDK without introducing unwanted coupling.
export interface PluginCapabilityPayload {
  key: string
  state: 'announced' | 'ready' | 'degraded' | 'withdrawn'
  metadata?: Record<string, unknown>
}

export interface PluginCapabilityState {
  key: string
  state: 'announced' | 'ready' | 'degraded' | 'withdrawn'
  metadata?: Record<string, unknown>
  updatedAt: number
}

export interface PluginHostSessionSummary {
  id: string
  manifestName: string
  phase: string
  runtime: 'electron' | 'node' | 'web'
  moduleId: string
}

export interface PluginHostDebugSnapshot {
  registry: PluginRegistrySnapshot
  sessions: PluginHostSessionSummary[]
  capabilities: PluginCapabilityState[]
  refreshedAt: number
}

export interface ElectronMcpStdioServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  enabled?: boolean
}

export interface ElectronMcpStdioConfigFile {
  mcpServers: Record<string, ElectronMcpStdioServerConfig>
}

export interface ElectronMcpStdioApplyResult {
  path: string
  started: Array<{ name: string }>
  failed: Array<{ name: string, error: string }>
  skipped: Array<{ name: string, reason: string }>
}

export interface ElectronMcpStdioServerRuntimeStatus {
  name: string
  state: 'running' | 'stopped' | 'error'
  command: string
  args: string[]
  pid: number | null
  lastError?: string
}

export interface ElectronMcpStdioRuntimeStatus {
  path: string
  servers: ElectronMcpStdioServerRuntimeStatus[]
  updatedAt: number
}

export interface ElectronMcpToolDescriptor {
  serverName: string
  name: string
  toolName: string
  description?: string
  inputSchema: Record<string, unknown>
}

export interface ElectronMcpCallToolPayload {
  cardId?: string
  name: string
  arguments?: Record<string, unknown>
}

export interface ElectronMcpCallToolResult {
  content?: Array<Record<string, unknown>>
  structuredContent?: Record<string, unknown>
  toolResult?: unknown
  isError?: boolean
  ok?: boolean
  errorCode?: string
  errorMessage?: string
  durationMs?: number
}

export interface ElectronMcpCapabilitiesSnapshot {
  path: string
  updatedAt: number
  servers: ElectronMcpStdioServerRuntimeStatus[]
  tools: ElectronMcpToolDescriptor[]
  healthyServers: number
}

export const electronMcpOpenConfigFile = defineInvokeEventa<{ path: string }>('eventa:invoke:electron:mcp:open-config-file')
export const electronMcpApplyAndRestart = defineInvokeEventa<ElectronMcpStdioApplyResult>('eventa:invoke:electron:mcp:apply-and-restart')
export const electronMcpGetRuntimeStatus = defineInvokeEventa<ElectronMcpStdioRuntimeStatus>('eventa:invoke:electron:mcp:get-runtime-status')
export const electronMcpListTools = defineInvokeEventa<ElectronMcpToolDescriptor[]>('eventa:invoke:electron:mcp:list-tools')
export const electronMcpCallTool = defineInvokeEventa<ElectronMcpCallToolResult, ElectronMcpCallToolPayload>('eventa:invoke:electron:mcp:call-tool')
export const electronMcpGetCapabilitiesSnapshot = defineInvokeEventa<ElectronMcpCapabilitiesSnapshot>('eventa:invoke:electron:mcp:get-capabilities-snapshot')

export const widgetsOpenWindow = defineInvokeEventa<void, { id?: string }>('eventa:invoke:electron:windows:widgets:open')
export const widgetsAdd = defineInvokeEventa<string | undefined, WidgetsAddPayload>('eventa:invoke:electron:windows:widgets:add')
export const widgetsRemove = defineInvokeEventa<void, { id: string }>('eventa:invoke:electron:windows:widgets:remove')
export const widgetsClear = defineInvokeEventa('eventa:invoke:electron:windows:widgets:clear')
export const widgetsUpdate = defineInvokeEventa<void, { id: string, componentProps?: Record<string, any> }>('eventa:invoke:electron:windows:widgets:update')
export const widgetsFetch = defineInvokeEventa<WidgetSnapshot | void, { id: string }>('eventa:invoke:electron:windows:widgets:fetch')
export const widgetsPrepareWindow = defineInvokeEventa<string | undefined, { id?: string }>('eventa:invoke:electron:windows:widgets:prepare')

export const electronWindowClose = defineInvokeEventa<void>('eventa:invoke:electron:window:close')
export type ElectronWindowLifecycleReason
  = | 'initial'
    | 'snapshot'
    | 'show'
    | 'hide'
    | 'minimize'
    | 'restore'
    | 'focus'
    | 'blur'

export interface ElectronWindowLifecycleState {
  focused: boolean
  minimized: boolean
  reason: ElectronWindowLifecycleReason
  updatedAt: number
  visible: boolean
}

export const electronWindowLifecycleChanged = defineEventa<ElectronWindowLifecycleState>('eventa:event:electron:window:lifecycle-changed')
export const electronGetWindowLifecycleState = defineInvokeEventa<ElectronWindowLifecycleState>('eventa:invoke:electron:window:get-lifecycle-state')
export const electronWindowSetAlwaysOnTop = defineInvokeEventa<void, boolean>('eventa:invoke:electron:window:set-always-on-top')
export const electronAppQuit = defineInvokeEventa<void>('eventa:invoke:electron:app:quit')

export type StageThreeRuntimeTraceEnvelope
  = | { type: 'three-render-info', payload: ThreeSceneRenderInfoTracePayload }
    | { type: 'three-hit-test-read', payload: ThreeHitTestReadTracePayload }
    | { type: 'vrm-update-frame', payload: VrmUpdateFrameTracePayload }
    | { type: 'vrm-load-start', payload: VrmLoadStartTracePayload }
    | { type: 'vrm-load-end', payload: VrmLoadEndTracePayload }
    | { type: 'vrm-load-error', payload: VrmLoadErrorTracePayload }
    | { type: 'vrm-dispose-start', payload: VrmDisposeStartTracePayload }
    | { type: 'vrm-dispose-end', payload: VrmDisposeEndTracePayload }

export interface StageThreeRuntimeTraceForwardedPayload {
  envelope: StageThreeRuntimeTraceEnvelope
  origin: string
}

export interface StageThreeRuntimeTraceRemoteControlPayload {
  origin: string
}

export const stageThreeRuntimeTraceForwardedEvent = defineEventa<StageThreeRuntimeTraceForwardedPayload>('eventa:event:stage-three-runtime-trace:forwarded')
export const stageThreeRuntimeTraceRemoteEnableEvent = defineEventa<StageThreeRuntimeTraceRemoteControlPayload>('eventa:event:stage-three-runtime-trace:remote-enable')
export const stageThreeRuntimeTraceRemoteDisableEvent = defineEventa<StageThreeRuntimeTraceRemoteControlPayload>('eventa:event:stage-three-runtime-trace:remote-disable')

// Internal event from main -> widgets renderer when a widget should render
export const widgetsRenderEvent = defineEventa<WidgetSnapshot>('eventa:event:electron:windows:widgets:render')
export const widgetsRemoveEvent = defineEventa<{ id: string }>('eventa:event:electron:windows:widgets:remove')
export const widgetsClearEvent = defineEventa('eventa:event:electron:windows:widgets:clear')
export const widgetsUpdateEvent = defineEventa<{ id: string, componentProps?: Record<string, any> }>('eventa:event:electron:windows:widgets:update')

// Onboarding window events
export const electronOnboardingClose = defineInvokeEventa('eventa:invoke:electron:windows:onboarding:close')
export const electronOpenOnboarding = defineInvokeEventa('eventa:invoke:electron:windows:onboarding:open')

export const i18nSetLocale = defineInvokeEventa<void, Locale>('eventa:invoke:electron:i18n:set-locale')
export const i18nGetLocale = defineInvokeEventa<Locale>('eventa:invoke:electron:i18n:get-locale')

export type AlicizationKillSwitchState = 'ACTIVE' | 'SUSPENDED'

export interface AlicizationCardScope {
  cardId: string
}

export type AlicizationPersonalityState = SharedAlicizationPersonalityState
export type AlicizationGender = SharedAlicizationGender
export type AlicizationPersonaTemperament = SharedAlicizationPersonaTemperament
export type AlicizationPersonaRelationshipPosture = SharedAlicizationPersonaRelationshipPosture
export type AlicizationPersonaInitiativeStyle = SharedAlicizationPersonaInitiativeStyle
export type AlicizationPersonaIdentityKernel = SharedAlicizationPersonaIdentityKernel
export type AlicizationPersonaExpressionProfile = SharedAlicizationPersonaExpressionProfile
export type AlicizationPersonaInitiativeBaseline = SharedAlicizationPersonaInitiativeBaseline
export type AlicizationPersonaEvolutionSeed = SharedAlicizationPersonaEvolutionSeed
export type AlicizationPersonaWorkshopSubmission = SharedAlicizationPersonaWorkshopSubmission

export interface AlicizationSoulFrontmatter {
  schemaVersion: number
  initialized: boolean
  custom_directives: string
  host_attitude: string
  core_incarnation: string
  profile: {
    ownerName: string
    hostName: string
    alicizationName: string
    gender: AlicizationGender
    genderCustom: string
    relationship: string
    mindAge: number
  }
  personality: AlicizationPersonalityState
  boundaries: {
    killSwitch: boolean
    mcpGuard: boolean
  }
}

export interface AlicizationSoulSnapshot {
  soulPath: string
  content: string
  frontmatter: AlicizationSoulFrontmatter
  revision: number
  hash: string
  needsGenesis: boolean
  watching: boolean
}

export type AlicizationGenesisInput = SharedAlicizationGenesisInput

export interface AlicizationInitializeGenesisResult {
  soul: AlicizationSoulSnapshot
  conflict: boolean
  conflictCandidate?: AlicizationSoulSnapshot
}

export interface AlicizationPersonalityUpdatePayload {
  expectedRevision?: number
  reason?: string
  deltas: Partial<AlicizationPersonalityState>
}

export interface AlicizationSoulUpdatePayload {
  expectedRevision?: number
  content: string
}

export interface AlicizationKillSwitchSnapshot {
  state: AlicizationKillSwitchState
  reason?: string
  updatedAt: number
}

export type AlicizationMemoryStats = SharedAlicizationMemoryStats

export type AlicizationMemorySource = SharedAlicizationMemorySource
export type AlicizationMemoryTier = SharedAlicizationMemoryTier
export type AlicizationMemoryProvenance = SharedAlicizationMemoryProvenance
export type AlicizationKnowledgeAssimilationStage = SharedAlicizationKnowledgeAssimilationStage
export type AlicizationKnowledgeAssimilationCorrection = SharedAlicizationKnowledgeAssimilationCorrection
export type AlicizationKnowledgeValidationStatus = SharedAlicizationKnowledgeValidationStatus
export type AlicizationDerivedMemoryReference = SharedAlicizationDerivedMemoryReference
export type AlicizationEpisodicEventSourceKind = SharedAlicizationEpisodicEventSourceKind
export type AlicizationEpisodicReconsolidationSnapshot = SharedAlicizationEpisodicReconsolidationSnapshot
export type AlicizationEpisodicEventInput = SharedAlicizationEpisodicEventInput
export type AlicizationEpisodicEventRecord = SharedAlicizationEpisodicEventRecord
export type AlicizationHostPersonModelSnapshot = SharedAlicizationHostPersonModelSnapshot

export type AlicizationMemoryFact = SharedAlicizationMemoryFact
export type AlicizationMemoryArchiveRecord = SharedAlicizationMemoryArchiveRecord
export type AlicizationMemoryFactInput = SharedAlicizationMemoryFactInput
export type AlicizationMemoryDomain = SharedAlicizationMemoryDomain

export type AlicizationMemoryUpsertTrace = SharedAlicizationMemoryUpsertTrace
export type AlicizationMemoryReflectionSourceKind = SharedAlicizationMemoryReflectionSourceKind
export type AlicizationMemoryReflectionTargetScope = SharedAlicizationMemoryReflectionTargetScope
export type AlicizationMemoryReflectionStatus = SharedAlicizationMemoryReflectionStatus
export type AlicizationMemoryReflectionInput = SharedAlicizationMemoryReflectionInput
export type AlicizationMemoryReflectionRecord = SharedAlicizationMemoryReflectionRecord
export type AlicizationLearningAction = SharedAlicizationLearningAction
export type AlicizationLearningTaskStatus = SharedAlicizationLearningTaskStatus
export type AlicizationLearningTaskFailureKind = SharedAlicizationLearningTaskFailureKind
export type AlicizationLearningTaskPayload = SharedAlicizationLearningTaskPayload
export type AlicizationLearningTaskRecord = SharedAlicizationLearningTaskRecord
export type AlicizationLearningExecutionStateSnapshot = SharedAlicizationLearningExecutionStateSnapshot
export type AlicizationMemoryResolutionLedger = SharedAlicizationMemoryResolutionLedger
export type AlicizationOrganicMemoryStageReplay = SharedAlicizationOrganicMemoryStageReplay
export type AlicizationRelationshipOutcomeSourceKind = SharedAlicizationRelationshipOutcomeSourceKind
export type AlicizationRelationshipOutcomeInput = SharedAlicizationRelationshipOutcomeInput
export type AlicizationRelationshipOutcomeRecord = SharedAlicizationRelationshipOutcomeRecord
export type AlicizationPersonaReinforcementDimension = SharedAlicizationPersonaReinforcementDimension
export type AlicizationPersonaReinforcementValence = SharedAlicizationPersonaReinforcementValence
export type AlicizationPersonaReinforcementEventInput = SharedAlicizationPersonaReinforcementEventInput
export type AlicizationPersonaReinforcementEventRecord = SharedAlicizationPersonaReinforcementEventRecord
export type AlicizationMindHeadKey = SharedAlicizationMindHeadKey

export interface AlicizationMemoryUpsertFactsPayload extends AlicizationCardScope {
  facts: AlicizationMemoryFactInput[]
  source: AlicizationMemorySource
  trace?: AlicizationMemoryUpsertTrace | null
}

export interface AlicizationMemoryLegacySnapshot {
  facts: AlicizationMemoryFact[]
  archive: AlicizationMemoryArchiveRecord[]
  lastPrunedAt: number | null
}

export interface AlicizationMemoryMigrationResult {
  migrated: boolean
  importedFacts: number
  importedArchive: number
  marker: string
}

export type AlicizationMemoryWorkbenchStatus = 'ok' | 'degraded' | 'error'
export type AlicizationMemoryWorkbenchKind
  = | 'fact'
    | 'episode'
    | 'reflection'
    | 'consolidation'
    | 'procedure'
    | 'relationship'
    | 'preference'
    | 'correction'
    | 'candidate'

export type AlicizationMemoryWorkbenchSensitivity = 'public' | 'personal' | 'private' | 'secret'
export type AlicizationMemoryWorkbenchVisibility = 'explicit' | 'inward-only'
export type AlicizationMemoryWorkbenchTrainingState = 'allowed' | 'blocked'
export type AlicizationMemoryWorkbenchReviewKind = Extract<
  AlicizationMemoryWorkbenchKind,
  'episode' | 'preference' | 'relationship' | 'procedure' | 'correction'
>
export type AlicizationMemoryWorkbenchReviewDecision = 'approve' | 'reject' | 'tombstone' | 'inward-only' | 'no-training'
export type AlicizationMemoryLongTermActionDecision = 'tombstone' | 'inward-only' | 'no-training'
export type AlicizationMemoryRecallProbeMode = 'none' | 'episodic' | 'relationship' | 'preference' | 'procedure' | 'task' | 'mixed'
export type AlicizationMemoryRecallProbeTemporalFocus = 'current' | 'recent' | 'recent-or-mid' | 'cross-session' | 'distant' | 'unspecified'
export type AlicizationMemoryRecallProbeEvidenceKind = 'fact' | 'reflection' | 'episode' | 'consolidation'

export interface AlicizationWorkingMemoryWorkbenchSnapshot {
  cardId: string
  sessionId: string
  updatedAt: number
  threadTitle: string | null
  threadMode: string | null
  currentUserMove: string | null
  activeTask: string | null
  taskStatus: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  userCorrections: string[]
  relationshipPosture: string | null
  emotionalPosture: string | null
  queryHints: string[]
  longTermQueue: Array<{
    id: string
    kind: AlicizationMemoryWorkbenchKind
    summary: string
    reason: string
    salience: number
    sensitivity: AlicizationMemoryWorkbenchSensitivity
    confidence: number
    allowTraining: boolean
  }>
  failureTurnIds: string[]
}

export interface AlicizationMemoryWorkbenchItem {
  id: string
  kind: AlicizationMemoryWorkbenchKind
  summary: string
  evidenceSnippets: string[]
  sourceIds: string[]
  confidence: number
  salience: number
  sensitivity: AlicizationMemoryWorkbenchSensitivity
  visibility: AlicizationMemoryWorkbenchVisibility
  training: AlicizationMemoryWorkbenchTrainingState
  source: string
  createdAt: number
  updatedAt: number
  lastAccessedAt: number | null
  tombstoned: boolean
}

export interface AlicizationLongTermMemoryWorkbenchSummary {
  total: number
  byKind: Partial<Record<AlicizationMemoryWorkbenchKind, number>>
  items: AlicizationMemoryWorkbenchItem[]
}

export interface AlicizationLongTermMemoryReviewItem {
  id: string
  transactionId: string
  status: string
  kind: AlicizationMemoryWorkbenchKind
  summary: string
  evidenceSnippets: string[]
  reviewReasons: string[]
  sensitivity: AlicizationMemoryWorkbenchSensitivity
  visibleMode: AlicizationMemoryWorkbenchVisibility
  allowTraining: boolean
  createdAt: number
  updatedAt: number
}

export interface AlicizationLongTermMemoryReviewSummary {
  pending: number
  items: AlicizationLongTermMemoryReviewItem[]
}

export interface AlicizationMemoryWorkbenchHealth {
  status: AlicizationMemoryWorkbenchStatus
  queue: {
    pending: number
    review: number
    applied: number
    failed: number
    deadLettered: number
  }
  recall: {
    lastLatencyMs: number | null
    p95LatencyMs: number | null
    lastError: string | null
  }
  embedding: {
    providerConfigured: boolean
    modelId: string | null
    dimensions: number | null
    vectorSpaceId: string | null
    reindexRequired: boolean
    indexMode: 'sqlite-vec' | 'hnsw' | 'ann' | 'brute-force'
    approximate: boolean
    degraded: boolean
    nativeIndexReady: boolean
    searchReady: boolean
    lastError: string | null
    canonicalCount: number
    indexedCount: number
    missingCount: number
    textHashMismatchCount: number
    staleOrFailedCount: number
    orphanedCount: number
    coverageRatio: number | null
    reindexJob: AlicizationMemoryEmbeddingReindexProgress | null
  }
  errors: string[]
}

export interface AlicizationMemoryWorkbenchSnapshot {
  cardId: string
  sessionId: string | null
  updatedAt: number
  workingMemory: AlicizationWorkingMemoryWorkbenchSnapshot | null
  longTerm: AlicizationLongTermMemoryWorkbenchSummary
  review: AlicizationLongTermMemoryReviewSummary
  health: AlicizationMemoryWorkbenchHealth
}

export interface AlicizationMemoryWorkbenchSnapshotPayload extends AlicizationCardScope {
  sessionId?: string | null
}

export interface AlicizationMemoryWorkbenchListPayload extends AlicizationCardScope {
  kind?: AlicizationMemoryWorkbenchKind | 'all'
  query?: string
  sensitivity?: AlicizationMemoryWorkbenchSensitivity | 'all'
  visibility?: AlicizationMemoryWorkbenchVisibility | 'all'
  training?: AlicizationMemoryWorkbenchTrainingState | 'all'
  source?: string
  limit?: number
  cursor?: string | null
}

export interface AlicizationMemoryWorkbenchListResult {
  items: AlicizationMemoryWorkbenchItem[]
  nextCursor: string | null
}

export interface AlicizationMemoryWorkbenchTombstoneItem {
  id: string
  sourceId: string
  source: string
  reason: string | null
  deletedAt: number
  memory: AlicizationMemoryWorkbenchItem | null
}

export interface AlicizationMemoryWorkbenchTombstoneListPayload extends AlicizationCardScope {
  limit?: number
  cursor?: string | null
}

export interface AlicizationMemoryWorkbenchTombstoneListResult {
  items: AlicizationMemoryWorkbenchTombstoneItem[]
  nextCursor: string | null
}

export interface AlicizationMemoryWorkbenchTombstoneRestorePayload extends AlicizationCardScope {
  tombstoneId: string
}

export interface AlicizationMemoryWorkbenchTombstoneRestoreResult {
  restored: boolean
  item: AlicizationMemoryWorkbenchItem | null
  reindexJobId: string | null
}

export interface AlicizationMemoryWorkbenchReviewListPayload extends AlicizationCardScope {
  query?: string
  kind?: AlicizationMemoryWorkbenchReviewKind | 'all'
  sensitivity?: AlicizationMemoryWorkbenchSensitivity | 'all'
  visibility?: AlicizationMemoryWorkbenchVisibility | 'all'
  training?: AlicizationMemoryWorkbenchTrainingState | 'all'
  limit?: number
  cursor?: string | null
}

export interface AlicizationMemoryWorkbenchReviewListResult {
  items: AlicizationLongTermMemoryReviewItem[]
  nextCursor: string | null
}

export interface AlicizationMemoryReviewActionPayload extends AlicizationCardScope {
  reviewItemId: string
  decision: AlicizationMemoryWorkbenchReviewDecision
  reason?: string | null
}

export interface AlicizationMemoryLongTermActionPayload extends AlicizationCardScope {
  memoryItemId: string
  source?: string
  decision: AlicizationMemoryLongTermActionDecision
  reason?: string | null
}

export type AlicizationSimpleRecallGoldLabel = SharedMemoryWorkbench.AlicizationSimpleRecallGoldLabel
export type AlicizationSimpleRecallGoldReason = SharedMemoryWorkbench.AlicizationSimpleRecallGoldReason
export type AlicizationSimpleRecallGoldEvaluationClass = SharedMemoryWorkbench.AlicizationSimpleRecallGoldEvaluationClass
export type AlicizationSimpleRecallGoldBenchmarkDimension = SharedMemoryWorkbench.AlicizationSimpleRecallGoldBenchmarkDimension

export interface AlicizationSimpleRecallGoldLabelOption {
  value: AlicizationSimpleRecallGoldLabel
  label: string
  description: string
  evaluationClass: AlicizationSimpleRecallGoldEvaluationClass
  benchmarkDimensions: AlicizationSimpleRecallGoldBenchmarkDimension[]
  userFacingReview: string
}

export type AlicizationMemoryQualityEvidenceSnapshot = SharedMemoryWorkbench.AlicizationMemoryQualityEvidenceSnapshot
export type AlicizationMemoryQualityGoldLabelPayload = SharedMemoryWorkbench.AlicizationMemoryQualityGoldLabelPayload
export type AlicizationMemoryQualityGoldLabelItem = SharedMemoryWorkbench.AlicizationMemoryQualityGoldLabelItem
export type AlicizationMemoryQualityGoldLabelListPayload = SharedMemoryWorkbench.AlicizationMemoryQualityGoldLabelListPayload
export type AlicizationMemoryQualityGoldLabelListResult = SharedMemoryWorkbench.AlicizationMemoryQualityGoldLabelListResult
export type AlicizationMemoryQualityMonthlyGoldRegressionPack = SharedMemoryWorkbench.AlicizationMemoryQualityMonthlyGoldRegressionPack
export type AlicizationMemoryQualityMonthlyGoldRegressionPayload = SharedMemoryWorkbench.AlicizationMemoryQualityMonthlyGoldRegressionPayload

export type AlicizationMemoryReplaySessionSummary = SharedMemoryWorkbench.AlicizationMemoryReplaySessionSummary
export type AlicizationMemoryReplaySessionListPayload = SharedMemoryWorkbench.AlicizationMemoryReplaySessionListPayload
export type AlicizationMemoryReplaySessionListResult = SharedMemoryWorkbench.AlicizationMemoryReplaySessionListResult
export type AlicizationMemoryQualityTrialPayload = SharedMemoryWorkbench.AlicizationMemoryQualityTrialPayload
export type AlicizationMemoryQualityTrialCancelPayload = SharedMemoryWorkbench.AlicizationMemoryQualityTrialCancelPayload
export type AlicizationMemoryQualityTrialCancelResult = SharedMemoryWorkbench.AlicizationMemoryQualityTrialCancelResult
export type AlicizationMemoryDialogueReplayReport = SharedMemoryWorkbench.AlicizationMemoryDialogueReplayReport
export type AlicizationMemoryLiveProviderTrialReport = SharedMemoryWorkbench.AlicizationMemoryLiveProviderTrialReport
export type AlicizationMemoryQualityTrialReport = SharedMemoryWorkbench.AlicizationMemoryQualityTrialReport
export type AlicizationMemoryQualityTrialReportRecord = SharedMemoryWorkbench.AlicizationMemoryQualityTrialReportRecord
export type AlicizationMemoryQualityTrialReportSurface = SharedMemoryWorkbench.AlicizationMemoryQualityTrialReportSurface
export type AlicizationMemoryQualityTrialReportRecordSurface = SharedMemoryWorkbench.AlicizationMemoryQualityTrialReportRecordSurface
export type AlicizationMemoryQualityTrialReportListPayload = SharedMemoryWorkbench.AlicizationMemoryQualityTrialReportListPayload
export type AlicizationMemoryQualityTrialReportListResult = SharedMemoryWorkbench.AlicizationMemoryQualityTrialReportListResult
export type AlicizationMemoryQualityTrialReportSurfaceListResult = SharedMemoryWorkbench.AlicizationMemoryQualityTrialReportSurfaceListResult

export type AlicizationPersonaCandidateWorkbenchStatus = 'candidate' | 'approved' | 'rejected' | 'no-training'
export type AlicizationPersonaCandidateWorkbenchDecision = 'approve' | 'reject' | 'no-training'

export interface AlicizationPersonaCandidateWorkbenchItem {
  id: string
  sourceMemoryIds: string[]
  behaviorLesson: string
  positiveExample: string
  negativeExample: string | null
  privacyClass: 'public' | 'personal-redacted'
  status: AlicizationPersonaCandidateWorkbenchStatus
  allowTraining: boolean
  rejectionReason: string | null
  createdAt: number
  updatedAt: number
}

export interface AlicizationPersonaCandidateListPayload extends AlicizationCardScope {
  status?: AlicizationPersonaCandidateWorkbenchStatus | 'all'
  limit?: number
  cursor?: string | null
}

export interface AlicizationPersonaCandidateListResult {
  items: AlicizationPersonaCandidateWorkbenchItem[]
  nextCursor: string | null
}

export interface AlicizationPersonaCandidateActionPayload extends AlicizationCardScope {
  candidateId: string
  decision: AlicizationPersonaCandidateWorkbenchDecision
  reason?: string | null
}

export type AlicizationPersonaTrainingDatasetExampleState = 'staged' | 'quarantined' | 'revoked'
export type AlicizationPersonaTrainingDatasetPiiStatus = 'clear' | 'detected' | 'not-checked'

export interface AlicizationPersonaTrainingDatasetConsentSnapshot {
  granted: boolean
  policyVersion: string
  scope: string
  capturedAt: number
}

export interface AlicizationPersonaTrainingDatasetVersion {
  id: string
  cardId: string
  version: number
  schemaVersion: string
  consentSnapshot: AlicizationPersonaTrainingDatasetConsentSnapshot
  createdAt: number
  exportedAt: number | null
  activeAt: number | null
  rolledBackAt: number | null
}

export interface AlicizationPersonaTrainingDatasetExample {
  id: string
  datasetId: string
  cardId: string
  schemaVersion: string
  sourceId: string
  sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
  contentHash: string
  behaviorLesson: string
  positiveExample: string
  negativeExample: string | null
  sensitivity: string
  piiStatus: AlicizationPersonaTrainingDatasetPiiStatus
  piiReason: string | null
  consentSnapshot: AlicizationPersonaTrainingDatasetConsentSnapshot
  allowTraining: boolean
  state: AlicizationPersonaTrainingDatasetExampleState
  createdAt: number
  revokedAt: number | null
}

export interface AlicizationPersonaTrainingDatasetSnapshot extends AlicizationCardScope {
  activeVersionId: string | null
  versions: AlicizationPersonaTrainingDatasetVersion[]
  examples: AlicizationPersonaTrainingDatasetExample[]
}

export interface AlicizationPersonaTrainingDatasetStagePayload extends AlicizationCardScope {
  consent: Omit<AlicizationPersonaTrainingDatasetConsentSnapshot, 'capturedAt'> & { capturedAt?: number }
}

export interface AlicizationPersonaTrainingDatasetVersionPayload extends AlicizationCardScope {
  datasetId?: string | null
}

export interface AlicizationPersonaTrainingDatasetExportResult {
  dataset: AlicizationPersonaTrainingDatasetVersion
  manifest: {
    datasetId: string
    cardId: string
    version: number
    schemaVersion: string
    exportedAt: number
    consentSnapshot: AlicizationPersonaTrainingDatasetConsentSnapshot
    examples: Array<{
      id: string
      sourceId: string
      sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
      contentHash: string
      behaviorLesson: string
      positiveExample: string
      negativeExample: string | null
    }>
    manifestHash: string
  }
}

export interface AlicizationPersonaTrainingDatasetExamplePolicyPayload extends AlicizationCardScope {
  exampleId: string
  allowTraining: boolean
  consent: Omit<AlicizationPersonaTrainingDatasetConsentSnapshot, 'capturedAt'> & { capturedAt?: number }
}

export type AlicizationPersonaTrainingDatasetRevokePayload = SharedMemoryWorkbench.AlicizationPersonaTrainingDatasetRevokePayload
export type AlicizationPersonaTrainingSourceRevokeIntentStatus = SharedMemoryWorkbench.AlicizationPersonaTrainingSourceRevokeIntentStatus
export type AlicizationPersonaTrainingSourceRevokeIntent = SharedMemoryWorkbench.AlicizationPersonaTrainingSourceRevokeIntent
export type AlicizationPersonaTrainingSourceRevokeIntentListPayload = SharedMemoryWorkbench.AlicizationPersonaTrainingSourceRevokeIntentListPayload
export type AlicizationPersonaTrainingSourceRevokeIntentRetryPayload = SharedMemoryWorkbench.AlicizationPersonaTrainingSourceRevokeIntentRetryPayload
export type AlicizationPersonaTrainingSourceRevokeIntentResult = SharedMemoryWorkbench.AlicizationPersonaTrainingSourceRevokeIntentResult
export type AlicizationPersonaTrainingPipelineIncrementState = SharedMemoryWorkbench.AlicizationPersonaTrainingPipelineIncrementState
export type AlicizationPersonaTrainingPipelineIncrement = SharedMemoryWorkbench.AlicizationPersonaTrainingPipelineIncrement
export type AlicizationPersonaTrainingPipelineFailureReason = SharedMemoryWorkbench.AlicizationPersonaTrainingPipelineFailureReason
export type AlicizationPersonaTrainingPipelineRunStatus = SharedMemoryWorkbench.AlicizationPersonaTrainingPipelineRunStatus
export type AlicizationPersonaTrainingPipelineRunStage = SharedMemoryWorkbench.AlicizationPersonaTrainingPipelineRunStage
export type AlicizationPersonaTrainingExecutorConfig = SharedMemoryWorkbench.AlicizationPersonaTrainingExecutorConfig
export type AlicizationPersonaTrainingArtifact = SharedMemoryWorkbench.AlicizationPersonaTrainingArtifact
export type AlicizationPersonaRuntimeConfig = SharedMemoryWorkbench.AlicizationPersonaRuntimeConfig
export type AlicizationPersonaRuntimeConfigState = SharedMemoryWorkbench.AlicizationPersonaRuntimeConfigState
export type AlicizationPersonaRuntimeConfigPayload = SharedMemoryWorkbench.AlicizationPersonaRuntimeConfigPayload
export type AlicizationPersonaRuntimeConnectionResult = SharedMemoryWorkbench.AlicizationPersonaRuntimeConnectionResult
export type AlicizationPersonaTrainingPipelineRunRecord = SharedMemoryWorkbench.AlicizationPersonaTrainingPipelineRunRecord
export type AlicizationPersonaTrainingStartResult = SharedMemoryWorkbench.AlicizationPersonaTrainingStartResult
export type AlicizationPersonaTrainingRunsResult = SharedMemoryWorkbench.AlicizationPersonaTrainingRunsResult
export type AlicizationPersonaTrainingRunLookupPayload = SharedMemoryWorkbench.AlicizationPersonaTrainingRunLookupPayload
export type AlicizationPersonaTrainingExecutorConfigState = SharedMemoryWorkbench.AlicizationPersonaTrainingExecutorConfigState
export type AlicizationPersonaTrainingExecutorConfigPayload = SharedMemoryWorkbench.AlicizationPersonaTrainingExecutorConfigPayload
export type AlicizationPersonaTrainingExecutorConnectionResult = SharedMemoryWorkbench.AlicizationPersonaTrainingExecutorConnectionResult
export type AlicizationPersonaTrainingPipelineResult = SharedMemoryWorkbench.AlicizationPersonaTrainingPipelineResult
export type AlicizationPersonaTrainingRunPayload = SharedMemoryWorkbench.AlicizationPersonaTrainingRunPayload
export type AlicizationPersonaTrainingCancelPayload = SharedMemoryWorkbench.AlicizationPersonaTrainingCancelPayload
export type AlicizationPersonaTrainingIncrementPayload = SharedMemoryWorkbench.AlicizationPersonaTrainingIncrementPayload
export type AlicizationPersonaTrainingIncrementsResult = SharedMemoryWorkbench.AlicizationPersonaTrainingIncrementsResult

export interface AlicizationSkillWorkbenchItem {
  id: string
  version: string
  description: string
  dependencies: string[]
  requiredTools: string[]
  permissions: string[]
  risk: 'low' | 'medium' | 'high' | 'critical'
  evaluationStatus: 'unvalidated' | 'sandbox-passed' | 'replay-passed' | 'approved' | 'failed'
  activationStatus: 'candidate' | 'active' | 'rolled-back' | 'revoked'
}

export interface AlicizationSkillWorkbenchListPayload extends AlicizationCardScope {
  productionOnly?: boolean
}

export interface AlicizationSkillWorkbenchListResult {
  items: AlicizationSkillWorkbenchItem[]
}

export interface AlicizationSkillWorkbenchLifecyclePayload extends AlicizationCardScope {
  id: string
  version: string
}

export type AlicizationMemorySemanticScaleJobTier = SharedMemoryWorkbench.AlicizationMemorySemanticScaleJobTier
export type AlicizationMemorySemanticScaleJobStatus = SharedMemoryWorkbench.AlicizationMemorySemanticScaleJobStatus
export type AlicizationMemorySemanticScaleJobProgress = SharedMemoryWorkbench.AlicizationMemorySemanticScaleJobProgress
export type AlicizationMemorySemanticScaleSoakReport = SharedMemoryWorkbench.AlicizationMemorySemanticScaleSoakReport
export type AlicizationMemorySemanticScaleJob = SharedMemoryWorkbench.AlicizationMemorySemanticScaleJob
export type AlicizationMemorySemanticScaleJobPayload = SharedMemoryWorkbench.AlicizationMemorySemanticScaleJobPayload
export type AlicizationMemorySemanticScaleJobResult = SharedMemoryWorkbench.AlicizationMemorySemanticScaleJobResult
export type AlicizationMemoryEmbeddingProgress = SharedMemoryWorkbench.AlicizationMemoryEmbeddingProgress

export interface AlicizationMemoryEmbeddingReindexPayload extends AlicizationCardScope {
  action?: 'start' | 'status' | 'cancel' | 'retry-dead-letter'
  jobId?: string
  reason?: string | null
  itemIds?: string[]
  source?: string
  sourceIds?: string[]
  modelId?: string
  limit?: number
}

export type AlicizationMemoryEmbeddingReindexJobStatus = 'queued' | 'running' | 'paused' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'

export interface AlicizationMemoryEmbeddingReindexProgress {
  jobId: string
  cardId: string
  status: AlicizationMemoryEmbeddingReindexJobStatus
  stage: 'projection-refresh-queued' | 'projection-refresh-running' | 'embedding-indexing' | 'completed' | 'cancelled' | 'failed'
  modelId: string
  dimensions: number
  vectorSpaceId: string
  total: number
  pending: number
  leased: number
  indexed: number
  retryable: number
  deadLettered: number
  cancelled: number
  progress: number
  lastError: string | null
  createdAt: number
  updatedAt: number
  startedAt: number | null
  completedAt: number | null
  nextRetryAt: number | null
}

export interface AlicizationMemoryEmbeddingReindexDeadLetterItem {
  itemId: string
  source: string
  sourceId: string
  attemptCount: number
  lastError: string | null
}

export type AlicizationWorkingMemoryCleaningQueueStatus = SharedMemoryWorkbench.AlicizationWorkingMemoryCleaningQueueStatus
export type AlicizationWorkingMemoryCleaningQueueItem = SharedMemoryWorkbench.AlicizationWorkingMemoryCleaningQueueItem
export type AlicizationWorkingMemoryCleaningQueuePayload = SharedMemoryWorkbench.AlicizationWorkingMemoryCleaningQueuePayload
export type AlicizationWorkingMemoryCleaningQueueResult = SharedMemoryWorkbench.AlicizationWorkingMemoryCleaningQueueResult

export interface AlicizationMemoryEmbeddingReindexResult {
  jobId?: string | null
  status?: AlicizationMemoryEmbeddingReindexJobStatus | null
  scheduled: number
  indexed: number
  failed: number
  modelId: string | null
  dimensions: number | null
  vectorSpaceId: string | null
  errors: string[]
  deadLetterItems: AlicizationMemoryEmbeddingReindexDeadLetterItem[]
  progress?: AlicizationMemoryEmbeddingReindexProgress | null
}

export interface AlicizationMemoryEmbeddingModelInfo {
  id: string
  name: string
  provider: string
  description: string | null
  dimensions: number | null
}

export interface AlicizationMemoryEmbeddingModelListPayload extends AlicizationCardScope {
  apiKey?: string | null
  baseUrl: string
  query?: string | null
  timeoutMs?: number
}

export interface AlicizationMemoryEmbeddingModelListResult {
  items: AlicizationMemoryEmbeddingModelInfo[]
  query: string | null
  error: string | null
}

export interface AlicizationMemoryEmbeddingConnectionTestPayload extends AlicizationCardScope {
  apiKey?: string | null
  baseUrl: string
  dimensions?: number | null
  model: string
  timeoutMs?: number
}

export interface AlicizationMemoryEmbeddingConnectionTestResult {
  ok: boolean
  modelId: string | null
  dimensions: number | null
  latencyMs: number
  error: string | null
}

export interface AlicizationMemoryRecallProbePayload extends AlicizationCardScope {
  query: string
  sessionId?: string | null
  includeWorkingMemory?: boolean
  limit?: number
}

export interface AlicizationMemoryRecallProbeResult {
  query: string
  intent: {
    mode: AlicizationMemoryRecallProbeMode
    shouldRecall: boolean
    confidence: number
    rationale: string
    temporalFocus: AlicizationMemoryRecallProbeTemporalFocus
    riskFlags: string[]
  }
  plan: {
    keywordQueries: string[]
    phraseQueries: string[]
    charGramQueries: string[]
    semanticQueries: string[]
    episodicQueries: string[]
    threadHints: string[]
    negativeCues: string[]
    riskFlags: string[]
  }
  evidence: Array<{
    id: string
    kind: AlicizationMemoryRecallProbeEvidenceKind
    summary: string
    source: string
    score: number
    confidence: number
    sensitivity: AlicizationMemoryWorkbenchSensitivity | null
    scope: {
      userId: string
      cardId: string | null
    }
    provenance: AlicizationMemoryProvenance
    evidenceVersion: string
    version: string
    queryMatches: string[]
    rankReasons: string[]
  }>
  semantic: {
    available: boolean
    modelId: string | null
    dimensions: number | null
    error: string | null
  }
  latencyMs: number
  errors: string[]
}

export type AlicizationSubconsciousFragmentSourceKind = SharedAlicizationSubconsciousFragmentSourceKind

export interface AlicizationActiveThought {
  id: string
  text: string
  createdAt: number
  updatedAt: number
}

export interface AlicizationSubconsciousFragment {
  id: string
  text: string
  sourceKind: AlicizationSubconsciousFragmentSourceKind
  createdAt: number
  lastRecalledAt: number | null
  recallCount: number
  provenance?: AlicizationMemoryProvenance | null
}

export interface AlicizationOrganicMemorySnapshot {
  hostAttitude: string
  coreIncarnation: string
  activeThoughts: AlicizationActiveThought[]
  subconsciousCount: number
  recentSubconsciousFragments: AlicizationSubconsciousFragment[]
  recentEpisodicEvents?: AlicizationEpisodicEventRecord[]
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  memoryConsolidations?: Array<{
    id: string
    kind: 'procedural' | 'autobiographical'
    facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
    periodKey: string
    periodStartedAt: number
    periodEndedAt: number
    summary: string
    lesson: string | null
    cues: string[]
    confidence: number
    dominantProvenance: AlicizationMemoryProvenance
  }>
  recollectionIntent?: {
    mode: 'none' | 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
    temporalFocus: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
    searchEpisodes: boolean
    searchProceduralExperience: boolean
    queryHints: string[]
    rationale: string
    confidence: number
  } | null
  recollectionPlan?: {
    selectedConsolidationIds: string[]
    selectedWindowIds: string[]
    selectedProceduralIds: string[]
    selectedEpisodeIds: string[]
    opening: string
    certainty: 'firm' | 'approximate' | 'fragmentary'
    rationale: string
    confidence: number
  } | null
  recollectionSpeechPlan?: {
    shouldSurface: boolean
    surfaceMode: 'internal-only' | 'gist-first' | 'answer-anchoring' | 'procedural-carry' | 'relationship-continuity'
    placement: 'before-payoff' | 'inside-payoff' | 'after-payoff' | 'internal-only'
    certainty: 'firm' | 'approximate' | 'fragmentary'
    rationale: string
    confidence: number
  } | null
  recollectionForeground?: {
    mode: 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
    certainty: 'firm' | 'approximate' | 'fragmentary'
    summary: string
    surfaceSummary: string | null
    confidence: number
  } | null
  knowledgeEvidence?: {
    validationCount: number
    contradictionCount: number
    stronglyValidatedProcedureCount: number
    contradictionHeavyFactCount: number
  } | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  recallLatencyPolicy?: AlicizationRecallLatencyPolicySnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  memoryStageReplay?: AlicizationOrganicMemoryStageReplay | null
  memoryResolutionLedger?: AlicizationMemoryResolutionLedger | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  lastDreamedAt: number | null
}

export interface AlicizationDreamMetabolismPayload {
  host_attitude: string
  soul_shift: {
    obedience_delta: number
    liveliness_delta: number
    sensibility_delta: number
  }
  next_active_thoughts: Array<{ text: string }>
  explicit_demoted_thoughts: Array<{ text: string }>
  new_sediment_fragments: Array<{ text: string }>
  shattering_event: { text: string } | null
}

export interface AlicizationCoreIncarnationReforgePayload {
  core_incarnation: string
}

export interface AlicizationConversationTurnInput {
  turnId?: string
  sessionId?: string
  origin?: 'user-turn' | 'subconscious-proactive'
  userText?: string
  assistantText?: string
  structured?: Record<string, unknown>
  visibleReplyExecution?: AlicizationVisibleReplyExecution | null
  visibleReplyRealization?: AlicizationVisibleReplyRealizationArtifact | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  governance?: AlicizationMindTurnGovernance | null
  createdAt?: number
}

export interface AlicizationConversationTurnRecord {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structured: Record<string, unknown> | null
  createdAt: number
}

export interface AlicizationListConversationTurnsPayload extends AlicizationCardScope {
  sessionId: string
  sinceCreatedAt?: number
  limit?: number
}

export interface AlicizationListTurnToolProjectionsPayload extends AlicizationCardScope {
  sessionId: string
  limit?: number
}

export interface AlicizationTurnToolProjectionReplayFailure {
  code: string
  message: string
}

export interface AlicizationTurnToolProjectionReplayRecord {
  cardId: string
  turnId: string
  sessionId: string
  startedAt: number
  updatedAt: number
  cards: SharedAlicizationRuntimeToolCardProjection[]
  recoveryRequired: boolean
  reasonCodes: string[]
  failure: AlicizationTurnToolProjectionReplayFailure | null
}

export type AlicizationMindTurnEventKind = SharedAlicizationMindTurnEventKind

export type AlicizationMindTurnEventInput = SharedAlicizationMindTurnEventInput

export type AlicizationMindTurnEventRecord = SharedAlicizationMindTurnEventRecord

export interface AlicizationListMindTurnEventsPayload extends AlicizationCardScope, SharedAlicizationListMindTurnEventsInput {}
export interface AlicizationListLearningArtifactLedgerPayload extends AlicizationCardScope, SharedAlicizationListLearningArtifactLedgerInput {}
export interface AlicizationListMemoryDecisionTracesPayload extends AlicizationCardScope, SharedAlicizationListMemoryDecisionTracesInput {}
export interface AlicizationListPersonStateUpdatesPayload extends AlicizationCardScope, SharedAlicizationListPersonStateUpdatesInput {}
export interface AlicizationListHumanlikeMemoryAuditPayload extends AlicizationCardScope, SharedAlicizationListHumanlikeMemoryAuditInput {}
export interface AlicizationCorrectHumanlikeMemoryAuditPayload extends AlicizationCardScope, SharedAlicizationCorrectHumanlikeMemoryAuditInput {}
export type AlicizationLearningArtifactLedgerRecord = SharedAlicizationLearningArtifactLedgerRecord
export type AlicizationMemoryDecisionTraceRecord = SharedAlicizationMemoryDecisionTraceRecord
export type AlicizationHumanlikeMemoryAuditEntry = SharedAlicizationHumanlikeMemoryAuditEntry
export type AlicizationHumanlikeMemoryCorrectionRecord = SharedAlicizationHumanlikeMemoryCorrectionRecord
export type AlicizationPersonStateEvolutionShiftKind = SharedAlicizationPersonStateEvolutionShiftKind
export type AlicizationPersonStateEvolutionShift = SharedAlicizationPersonStateEvolutionShift
export type AlicizationPersonStateEvolutionEntryInput = SharedAlicizationPersonStateEvolutionEntryInput
export type AlicizationPersonStateEvolutionEntryRecord = SharedAlicizationPersonStateEvolutionEntryRecord
export type AlicizationPersonStateEvolutionSummary = SharedAlicizationPersonStateEvolutionSummary
export type AlicizationDerivedMindStateBundle = SharedAlicizationDerivedMindStateBundle
export type AlicizationRecallLatencyPolicySnapshot = SharedAlicizationRecallLatencyPolicySnapshot
export type AlicizationAffectiveResidueKind = SharedAlicizationAffectiveResidueKind
export type AlicizationAffectiveResidueEntrySnapshot = SharedAlicizationAffectiveResidueEntrySnapshot
export type AlicizationRelationshipCadenceMemorySnapshot = SharedAlicizationRelationshipCadenceMemorySnapshot
export type AlicizationAffectiveResidueMemorySnapshot = SharedAlicizationAffectiveResidueMemorySnapshot
export type AlicizationEmotionalKernelSnapshot = SharedAlicizationEmotionalKernelSnapshot
export type AlicizationEmotionalTransitionLedgerSnapshot = SharedAlicizationEmotionalTransitionLedgerSnapshot
export type AlicizationEmbodimentContinuityLane = SharedAlicizationEmbodimentContinuityLane
export type AlicizationEmbodimentContinuityLedgerSnapshot = SharedAlicizationEmbodimentContinuityLedgerSnapshot
export type AlicizationEmbodimentContinuityLaneStatus = SharedAlicizationEmbodimentContinuityLaneStatus
export type AlicizationSelfEvolutionKernelSnapshot = SharedAlicizationSelfEvolutionKernelSnapshot
export type AlicizationSelfEvolutionVersionRuntimeSnapshot = SharedAlicizationSelfEvolutionVersionRuntimeSnapshot
export type AlicizationPersonStateUpdateSourceTrailEntry = SharedAlicizationPersonStateUpdateSourceTrailEntry
export type AlicizationPersonStateUpdateRecord = SharedAlicizationPersonStateUpdateRecord
export type AlicizationPersonStateUpdateSurface = SharedAlicizationPersonStateUpdateSurface
export type AlicizationReplayBenchmarkPackId = SharedAlicizationReplayBenchmarkPackId
export type AlicizationReplayBenchmarkTracePointer = SharedAlicizationReplayBenchmarkTracePointer
export type AlicizationReplayBenchmarkFailureTurnRecord = SharedAlicizationReplayBenchmarkFailureTurnRecord
export type AlicizationReplayBenchmarkDatasetFeedback = SharedAlicizationReplayBenchmarkDatasetFeedback
export type AlicizationReplayHumanRatingDimension = SharedAlicizationReplayHumanRatingDimension
export type AlicizationReplayHumanRatingRubric = SharedAlicizationReplayHumanRatingRubric
export type AlicizationReplayMemoryQualityRecord = SharedAlicizationReplayMemoryQualityRecord
export type AlicizationReplayBenchmarkStandardsRecord = SharedAlicizationReplayBenchmarkStandardsRecord
export type AlicizationReplayBenchmarkGateDimensionReport = SharedAlicizationReplayBenchmarkGateDimensionReport
export type AlicizationReplayBenchmarkGateReport = SharedAlicizationReplayBenchmarkGateReport
export type AlicizationReplayBenchmarkTelemetryPatch = SharedAlicizationReplayBenchmarkTelemetryPatch
export type AlicizationRunReplayBenchmarkInput = SharedAlicizationRunReplayBenchmarkInput
export interface AlicizationRunReplayBenchmarkPayload extends AlicizationCardScope, SharedAlicizationRunReplayBenchmarkInput {}
export interface AlicizationRunReplayBenchmarkResult extends SharedAlicizationRunReplayBenchmarkResult {}

export type AlicizationExecutionChannel = SharedAlicizationExecutionChannel

export type AlicizationExecutionTaskKind = SharedAlicizationExecutionTaskKind

export type AlicizationExecutionTurnOrigin = SharedAlicizationExecutionTurnOrigin

export type AlicizationChannelCapability = SharedAlicizationChannelCapability

export type AlicizationChannelCapabilityManifestRecord = SharedAlicizationChannelCapabilityManifestRecord

export type AlicizationChannelCapabilityManifestUpsertInput = SharedAlicizationChannelCapabilityManifestUpsertInput

export interface AlicizationUpsertChannelCapabilityManifestPayload extends AlicizationCardScope, SharedAlicizationChannelCapabilityManifestUpsertInput {}

export type AlicizationListChannelCapabilityManifestsInput = SharedAlicizationListChannelCapabilityManifestsInput

export interface AlicizationListChannelCapabilityManifestsPayload extends AlicizationCardScope, SharedAlicizationListChannelCapabilityManifestsInput {}

export type AlicizationClawTaskIntent = SharedAlicizationClawTaskIntent

export type AlicizationClawFabricPlan = SharedAlicizationClawFabricPlan

export type AlicizationCliCommandInput = SharedAlicizationCliCommandInput
export type AlicizationCodexCommandInput = SharedAlicizationCodexCommandInput
export type AlicizationClaudeCodeCommandInput = SharedAlicizationClaudeCodeCommandInput
export type AlicizationLocalVisualCommandInput = SharedAlicizationLocalVisualCommandInput
export type AlicizationOpenClawCommandInput = SharedAlicizationOpenClawCommandInput

export type AlicizationTaskThreadStatus = SharedAlicizationTaskThreadStatus

export type AlicizationTaskThreadUpsertInput = SharedAlicizationTaskThreadUpsertInput

export type AlicizationTaskThreadRecord = SharedAlicizationTaskThreadRecord

export type AlicizationTaskThreadRecoveryActionKind = SharedAlicizationTaskThreadRecoveryActionKind
export type AlicizationTaskThreadRecoverySafety = SharedAlicizationTaskThreadRecoverySafety
export type AlicizationTaskThreadRecoveryAction = SharedAlicizationTaskThreadRecoveryAction
export type AlicizationTaskThreadRecoveryProjection = SharedAlicizationTaskThreadRecoveryProjection
export type AlicizationResumeTaskThreadInput = SharedAlicizationResumeTaskThreadInput
export type AlicizationResumeTaskThreadResult = SharedAlicizationResumeTaskThreadResult

export interface AlicizationUpsertTaskThreadPayload extends AlicizationCardScope, AlicizationTaskThreadUpsertInput {}

export type AlicizationListTaskThreadsInput = SharedAlicizationListTaskThreadsInput

export interface AlicizationListTaskThreadsPayload extends AlicizationCardScope, SharedAlicizationListTaskThreadsInput {}

export type AlicizationExecutionEventKind = SharedAlicizationExecutionEventKind

export type AlicizationExecutionEventInput = SharedAlicizationExecutionEventInput

export type AlicizationExecutionEventRecord = SharedAlicizationExecutionEventRecord

export type AlicizationExecutorSessionStatus = SharedAlicizationExecutorSessionStatus

export type AlicizationExecutorSessionRecord = SharedAlicizationExecutorSessionRecord

export type AlicizationExecutorSessionUpsertInput = SharedAlicizationExecutorSessionUpsertInput

export interface AlicizationUpsertExecutorSessionPayload extends AlicizationCardScope, SharedAlicizationExecutorSessionUpsertInput {}

export type AlicizationListExecutorSessionsInput = SharedAlicizationListExecutorSessionsInput

export interface AlicizationListExecutorSessionsPayload extends AlicizationCardScope, SharedAlicizationListExecutorSessionsInput {}

export interface AlicizationAppendExecutionEventsPayload extends AlicizationCardScope, SharedAlicizationAppendExecutionEventsInput {}

export type AlicizationListExecutionEventsInput = SharedAlicizationListExecutionEventsInput

export interface AlicizationListExecutionEventsPayload extends AlicizationCardScope, SharedAlicizationListExecutionEventsInput {}

export interface AlicizationPlanTaskThreadPayload extends AlicizationCardScope, SharedAlicizationPlanTaskThreadInput {}

export type AlicizationPlanTaskThreadResult = SharedAlicizationPlanTaskThreadResult

export interface AlicizationDispatchTaskThreadPayload extends AlicizationCardScope, SharedAlicizationDispatchTaskThreadInput {}

export type AlicizationDispatchTaskThreadResult = SharedAlicizationDispatchTaskThreadResult

export interface AlicizationDialogueAckPayload extends AlicizationCardScope {
  sessionId: string
  turnId: string
  createdAt: number
}

export interface AlicizationReplayDialoguesPayload extends AlicizationCardScope {
  sessionId: string
  limit?: number
}

export type AlicizationAuditLogLevel = 'info' | 'notice' | 'warning' | 'critical'

export interface AlicizationAuditLogInput {
  level?: AlicizationAuditLogLevel
  category: string
  action: string
  message: string
  payload?: Record<string, unknown>
  createdAt?: number
}

export type AlicizationRealtimeCategory = SharedAlicizationRealtimeCategory

export type AlicizationRealtimeExecutePayload = SharedAlicizationRealtimeExecutePayload

export type AlicizationRealtimeExecuteResult = SharedAlicizationRealtimeExecuteResult

export type AlicizationSystemProbeDegradeReason = SharedAlicizationSystemProbeDegradeReason
export type AlicizationSystemProbeSample = SharedAlicizationSystemProbeSample
export type AlicizationSensoryCapturePermission = SharedAlicizationSensoryCapturePermission
export type AlicizationSensoryCaptureHealth = SharedAlicizationSensoryCaptureHealth
export type AlicizationSensoryCaptureLeaseStatus = SharedAlicizationSensoryCaptureLeaseStatus
export type AlicizationSensoryCaptureSnapshot = SharedAlicizationSensoryCaptureSnapshot
export type AlicizationSensoryCacheSnapshot = SharedAlicizationSensoryCacheSnapshot

export const alicizationEmotionWhitelist = sharedAlicizationEmotionWhitelist

export type AlicizationEmotion = SharedAlicizationEmotion

export type AlicizationPerformanceDelivery = SharedAlicizationPerformanceDelivery

export type AlicizationProactiveScenario = 'coding' | 'media' | 'late-night-care' | 'general'
export type AlicizationProactiveStyle = 'silent-observe' | 'light-nudge' | 'gentle-care' | 'firm-warning'
export type AlicizationProactiveUrgency = 'low' | 'medium' | 'high'
export type AlicizationProactiveStaticReasonCode
  = | 'busy-host'
    | 'persona-observant-style'
    | 'persona-high-participation-style'
    | 'persona-direct-reconnect'
    | 'persona-silence-hold'
    | 'persona-guardian-care'
    | 'habit-policy-quiet-companionship'
    | 'habit-policy-return-with-proof'
    | 'habit-policy-repair-before-fluency'
    | 'habit-policy-rest-protection'
    | 'fullscreen-host'
    | 'kill-switch-suspended'
    | 'global-cooldown-active'
    | 'attention-anchor-active'
    | 'recent-observation-memory'
    | 'invited-inspection-active'
    | 'scenario-bias-raised'
    | 'recent-ignored-penalty'
    | 'recent-dismiss-penalty'
    | 'recent-positive-feedback'
    | 'cadence-opening-ready'
    | 'cadence-initiative-trust'
    | 'cadence-pressure-rising'
    | 'coding-focus'
    | 'media-playback'
    | 'late-night-activity'
    | 'late-night-fatigue'
    | 'high-loneliness'
    | 'high-boredom'
    | 'user-idle'
    | 'foreground-error'
    | 'foreground-diff'
    | 'reminder-backlog'
    | 'afterglow-opening'
    | 'durability-pulse'
    | 'durability-process-gone'
    | 'durability-anr-likely'
    | 'private-thought-observe-only'
    | 'private-thought-uncertain'
    | 'belief-tentative'
    | 'belief-contradicted'
    | 'world-model-revalidation-required'
    | 'inquiry-open'
    | 'relationship-guarded'
    | 'relationship-attuned'
    | 'relationship-correction-sensitive'
    | 'living-world-open-loop'
    | 'governor-withhold'
    | 'governor-repair'
    | 'governor-care'
    | 'thought-thread-ripe'
    | 'thought-thread-waiting'
    | 'watch-mode-symbiotic'
    | 'watch-mode-invited-inspection'
    | 'watch-mode-recovering'
    | 'runtime-dialogue-ready'
    | 'runtime-observe-dominant'
    | 'runtime-control-ready'
    | 'runtime-continuity-pressure'
    | 'runtime-companionship-pressure'
    | 'continuity-internal-only'
    | 'continuity-after-payoff'
    | 'continuity-next-open-window'
    | 'continuity-execution-callback'
    | 'continuity-execution-callback-afterglow-hold'
    | 'continuity-execution-callback-carry'
    | 'held-autonomy-carry'
    | 'presence-only-hold'
    | 'relationship-cadence-residue'
    | 'relationship-residue-delay-warmth'
    | 'relationship-residue-protect-rest'
export type AlicizationProactiveReasonCode
  = | AlicizationProactiveStaticReasonCode
    | `learning:${AlicizationLearningAction | 'hold'}`
    | `learning-focus:${string}`

export type AlicizationVisualWatchMode = 'mnemonic-passive' | 'symbiotic-vision' | 'invited-inspection' | 'recovering'
export type AlicizationEmbodiedPresenceState = 'none' | 'glance' | 'attentive' | 'hesitant' | 'concerned'
export type AlicizationEmotionalTension
  = | 'tense-debug'
    | 'focused-flow'
    | 'soft-covision'
    | 'late-night-drain'
    | 'restless-switching'
    | 'calm-browse'
export type AlicizationHostGoalHypothesis
  = | 'resolve-problem'
    | 'inspect-change'
    | 'consume-media'
    | 'rest'
    | 'chat'
    | 'browse'
    | 'stay-connected'
    | 'continue-thread'
    | 'keep-going'
    | 'finish-one-more-step'
    | 'resume-work'
    | 'unknown'
export type AlicizationRelationshipNeed = 'space' | 'companionship' | 'guidance' | 'care' | 'unclear'
export type AlicizationConcernKind
  = | 'help-fix'
    | 'protect-focus'
    | 'co-watch'
    | 'care-body'
    | 'unfinished-thread'
    | 'curiosity'
export type AlicizationConcernStatus = 'forming' | 'active' | 'lingering' | 'resolved' | 'released'
export type AlicizationMindStance = 'approach' | 'hold' | 'hesitate' | 'protect' | 'coexist'
export type AlicizationMindActionTendency = 'wait' | 'recheck' | 'hover' | 'whisper' | 'speak' | 'warn'
export type AlicizationMindMotive = 'accompany' | 'protect' | 'clarify' | 'care' | 'curiosity' | 'stay-silent'
export type AlicizationWorldFrameKind = 'live' | 'remembered' | 'imagined'
export type AlicizationWorldCertainty = 'grounded' | 'observed' | 'lingering' | 'uncertain'
export type AlicizationWorldFreshness = 'live' | 'recent' | 'stale'
export type AlicizationWorldContinuityLabel = 'new-focus' | 'staying-with-thread' | 'scene-shift' | 'afterglow' | 'recovery' | 'reacquired'
export type AlicizationWorldHostAvailability = 'immersed' | 'focused' | 'open' | 'fatigued' | 'drifting'
export type AlicizationWorldBurden = 'light' | 'moderate' | 'heavy'
export type AlicizationWorldThreadKind
  = | 'debugging'
    | 'change-review'
    | 'deep-focus'
    | 'co-viewing'
    | 'late-night-endurance'
    | 'chatting'
    | 'browsing'
    | 'recovery'
    | 'unknown'
export type AlicizationWorldThreadStatus = 'forming' | 'active' | 'lingering'
export type AlicizationWorldThreadSource = 'grounded-scene' | 'observed-scene' | 'continuity' | 'durability-pulse' | 'working-memory'
export type AlicizationWorldEntityKind = 'app' | 'process' | 'window' | 'task' | 'artifact' | 'media' | 'conversation'
export type AlicizationWorldEntityStatus = 'active' | 'lingering' | 'stale'
export type AlicizationWorldRelationKind = 'hosts' | 'contains' | 'focuses' | 'works-on' | 'about' | 'continues'
export type AlicizationLivingWorldObjectKind = 'thread' | 'artifact' | 'ambient' | 'incident' | 'session'
export type AlicizationLivingWorldObjectStatus = 'forming' | 'active' | 'cooling' | 'released'
export type AlicizationLivingWorldStability = 'stable' | 'shifting' | 'fractured'
export type AlicizationGoalOwner = 'host' | 'alicization'
export type AlicizationGoalKind
  = | 'resolve-problem'
    | 'inspect-change'
    | 'consume-media'
    | 'rest'
    | 'chat'
    | 'browse'
    | 'stay-near'
    | 'guard-focus'
    | 'clarify-scene'
    | 'help-resolve'
    | 'care-body'
    | 'recover-thread'
export type AlicizationGoalStatus = 'forming' | 'active' | 'blocked' | 'lingering' | 'released'
export type AlicizationAttachmentMode = 'guarded' | 'nearby' | 'attuned'
export type AlicizationInitiativeTemperament = 'reserved' | 'balanced' | 'eager'
export type AlicizationDesireKind = 'speak' | 'recheck' | 'stay-near' | 'warn' | 'care'
export type AlicizationDesireStatus = 'forming' | 'active' | 'withheld' | 'surfaced' | 'released'
export type AlicizationBeliefScope = 'scene' | 'host' | 'relationship' | 'self'
export type AlicizationBeliefSource = 'percept' | 'inference' | 'memory' | 'contradiction'
export type AlicizationBeliefStatus = 'tentative' | 'held' | 'contradicted' | 'released'
export type AlicizationBeliefRevisionStability = 'stable' | 'fluid' | 'fractured'
export type AlicizationRelationshipClimate = 'guarded' | 'neutral' | 'warm' | 'attuned'
export type AlicizationRelationshipApproachVector = 'give-space' | 'stay-near' | 'guide' | 'care'
export type AlicizationInquiryKind = 'scene-grounding' | 'problem-localization' | 'timing-calibration' | 'relationship-calibration' | 'contradiction-check'
export type AlicizationInquiryStatus = 'open' | 'tracking' | 'blocked' | 'settled' | 'dormant'
export type AlicizationInquiryPriority = 'low' | 'medium' | 'high' | 'critical'
export type AlicizationMindNeed = 'ground-truth' | 'guidance' | 'companionship' | 'care' | 'repair' | 'restraint'
export type AlicizationDeliberationKind = 'ground-scene' | 'localize-problem' | 'protect-host' | 'stay-near' | 'repair-misread' | 'return-later'
export type AlicizationDeliberationStatus = 'forming' | 'holding' | 'ripe' | 'cooling' | 'released'
export type AlicizationActionEcologyMode = 'silent-presence' | 'quiet-accompany' | 'repair-before-speaking' | 'return-later' | 'surface-nudge' | 'surface-care' | 'surface-warning'
export type AlicizationHypothesisKind = 'live-scene' | 'problem-locus' | 'care-need' | 'shared-afterglow' | 'misread-drift' | 'recovery-event'
export type AlicizationHypothesisStatus = 'candidate' | 'active' | 'held' | 'contradicted' | 'fading'
export type AlicizationThreadRuntimeStatus = 'foreground' | 'tracking' | 'background' | 'suspended' | 'resolved'
export type AlicizationCommitmentKind = 'recheck-scene' | 'hold-problem' | 'care-host' | 'stay-near' | 'repair-misread' | 'follow-through'
export type AlicizationCommitmentStatus = 'forming' | 'active' | 'cooling' | 'fulfilled' | 'released'
export type AlicizationInquiryPlanKind = 'reground-scene' | 'localize-problem' | 'check-recovery' | 'verify-care' | 'wait-opening' | 'follow-thread'
export type AlicizationInquiryPlanStatus = 'queued' | 'tracking' | 'waiting-opening' | 'satisfied' | 'abandoned'
export type AlicizationMindKernelMode = 'orienting' | 'tracking' | 'repairing' | 'accompanying' | 'guarding' | 'resting'
export type AlicizationSelfGovernorDrive = 'understand' | 'repair' | 'protect' | 'accompany' | 'care' | 'withhold'
export type AlicizationSelfGovernorIntentionKind = 'understand-scene' | 'hold-thread' | 'repair-misread' | 'protect-host' | 'care-host' | 'stay-near' | 'wait-opening'
export type AlicizationSelfGovernorIntentionStatus = 'forming' | 'active' | 'withheld' | 'fulfilled' | 'released'
export type AlicizationThoughtThreadKind = 'scene-hold' | 'problem-thread' | 'relationship-thread' | 'care-thread' | 'afterglow-thread' | 'repair-thread'
export type AlicizationThoughtThreadStatus = 'forming' | 'active' | 'waiting' | 'ripe' | 'cooling' | 'released'
export type AlicizationInitiativeProposalSource
  = | 'counterfactual'
    | 'concern'
    | 'commitment'
    | 'thread-runtime'
    | 'thought-thread'
    | 'governor'
    | 'desire-memory'
    | 'fallback'

export interface AlicizationVisualTarget {
  appName?: string
  processName?: string
  title?: string
  pid?: number | null
}

export interface AlicizationVisualSceneSnapshot {
  workloadKind: 'coding' | 'media' | 'browser' | 'terminal' | 'game' | 'chat' | 'document' | 'unknown'
  contentKind: 'error' | 'diff' | 'doc' | 'video' | 'music' | 'chat' | 'gameplay' | 'unknown'
  scenario: AlicizationProactiveScenario
  summary?: string
  source: 'foreground-window-heuristic' | 'screen-semantic-summary' | 'invited-grounding' | 'durability-hook'
  confidence: number
  target?: AlicizationVisualTarget | null
  beganAt: number
  lastSeenAt: number
}

export interface AlicizationVisualAttentionSnapshot {
  target: AlicizationVisualTarget | null
  source: 'invited-inspection' | 'current-grounded-scene' | 'recent-observation' | 'old-anchor' | 'durability-pulse' | 'foreground-window'
  confidence: number
  engagedAt: number | null
  lastConfirmedAt: number | null
  dwellMs: number
  invalidationReason?: string | null
}

export interface AlicizationVisualTransitionSnapshot {
  fromWatchMode: AlicizationVisualWatchMode
  toWatchMode: AlicizationVisualWatchMode
  fromScenario: AlicizationProactiveScenario | 'unknown'
  durationMs: number
  reason: string
  occurredAt: number
}

export interface AlicizationDurabilityPulseSnapshot {
  kind: 'none' | 'window-unresponsive' | 'window-responsive' | 'render-process-gone' | 'child-process-gone' | 'process-gone' | 'anr-likely'
  source: 'electron-window' | 'electron-process' | 'foreground-app' | 'unknown'
  detectedAt: number
  pid?: number | null
  appName?: string
  processName?: string
  title?: string
  detail?: string
}

export interface AlicizationVisualEpisode {
  scene: string
  summary: string
  attentionTarget?: string
  beganAt: number
  endedAt: number
  confidence: number
  emotionalTension: AlicizationEmotionalTension
  sedimentCandidate: boolean
}

export interface AlicizationWorldThreadSnapshot {
  id: string
  kind: AlicizationWorldThreadKind
  status: AlicizationWorldThreadStatus
  source: AlicizationWorldThreadSource
  title: string
  summary: string
  confidence: number
  significance: number
  unresolved: boolean
  beganAt: number
  lastUpdatedAt: number
  target?: AlicizationVisualTarget | null
}

export interface AlicizationWorldEpistemicStateSnapshot {
  certainty: AlicizationWorldCertainty
  freshness: AlicizationWorldFreshness
  seenNow: string[]
  inferredNow: string[]
  openQuestions: string[]
  staleRisks: string[]
}

export interface AlicizationWorldContinuitySnapshot {
  label: AlicizationWorldContinuityLabel
  sceneAgeMs: number
  attentionAgeMs: number
  sameSceneAsBefore: boolean
  sameAttentionAsBefore: boolean
  afterglowOpen: boolean
}

export interface AlicizationWorldHostStateSnapshot {
  availability: AlicizationWorldHostAvailability
  burden: AlicizationWorldBurden
}

export interface AlicizationWorldFrameSnapshot {
  kind: AlicizationWorldFrameKind
  summary: string
  confidence: number
  stability: number
  focusThreadId?: string | null
  focusBeliefId?: string | null
  focusHypothesisId?: string | null
  evidence: string[]
}

export interface AlicizationWorldOntologySnapshot {
  dominantFrame: AlicizationWorldFrameKind
  truthPriority: AlicizationWorldFrameKind[]
  live: AlicizationWorldFrameSnapshot | null
  remembered: AlicizationWorldFrameSnapshot | null
  imagined: AlicizationWorldFrameSnapshot | null
  updatedAt: number
}

export interface AlicizationWorldModelSnapshot {
  activeThread: AlicizationWorldThreadSnapshot | null
  lingeringThreads: AlicizationWorldThreadSnapshot[]
  focusTarget: AlicizationVisualTarget | null
  epistemicState: AlicizationWorldEpistemicStateSnapshot
  continuity: AlicizationWorldContinuitySnapshot
  hostState: AlicizationWorldHostStateSnapshot
  updatedAt: number
}

export interface AlicizationBeliefSnapshot {
  id: string
  scope: AlicizationBeliefScope
  source: AlicizationBeliefSource
  status: AlicizationBeliefStatus
  statement: string
  confidence: number
  salience: number
  evidence: string[]
  entityIds: string[]
  contradictsBeliefIds?: string[]
  formedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationBeliefLedgerSnapshot {
  focusBeliefId: string | null
  beliefs: AlicizationBeliefSnapshot[]
  unresolvedContradictions: string[]
  updatedAt: number
}

export interface AlicizationBeliefRevisionSnapshot {
  dominantBeliefId: string | null
  stability: AlicizationBeliefRevisionStability
  revisionPressure: number
  groundingNeed: number
  contradictionPressure: number
  hostCorrectionWeight: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationHypothesisSnapshot {
  id: string
  kind: AlicizationHypothesisKind
  status: AlicizationHypothesisStatus
  summary: string
  confidence: number
  salience: number
  evidence: string[]
  counterEvidence: string[]
  relatedBeliefId?: string | null
  relatedInquiryId?: string | null
  attentionTarget?: AlicizationVisualTarget | null
  formedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationHypothesisGraphSnapshot {
  activeHypothesisId: string | null
  focusHypothesisIds: string[]
  driftPressure: number
  hypotheses: AlicizationHypothesisSnapshot[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationWorldEntitySnapshot {
  id: string
  kind: AlicizationWorldEntityKind
  status: AlicizationWorldEntityStatus
  label: string
  summary?: string
  confidence: number
  salience: number
  source: 'scene' | 'attention' | 'world-thread' | 'durability' | 'working-memory'
  evidence: string[]
  firstSeenAt: number
  lastSeenAt: number
  target?: AlicizationVisualTarget | null
}

export interface AlicizationWorldRelationSnapshot {
  fromId: string
  toId: string
  kind: AlicizationWorldRelationKind
  confidence: number
}

export interface AlicizationEntityWorldModelSnapshot {
  focusEntityId: string | null
  activeEntityIds: string[]
  entities: AlicizationWorldEntitySnapshot[]
  relations: AlicizationWorldRelationSnapshot[]
  openLoops: string[]
  updatedAt: number
}

export interface AlicizationLivingWorldObjectSnapshot {
  id: string
  kind: AlicizationLivingWorldObjectKind
  status: AlicizationLivingWorldObjectStatus
  label: string
  summary: string
  confidence: number
  salience: number
  continuity: number
  lastChange: string
  openLoop?: string
  entityIds: string[]
  threadIds: string[]
  evidence: string[]
  firstSeenAt: number
  lastUpdatedAt: number
}

export interface AlicizationLivingWorldStateSnapshot {
  focusObjectId: string | null
  activeObjectIds: string[]
  objects: AlicizationLivingWorldObjectSnapshot[]
  openLoops: string[]
  stability: AlicizationLivingWorldStability
  narrative: string[]
  updatedAt: number
}

export interface AlicizationGoalSnapshot {
  id: string
  owner: AlicizationGoalOwner
  kind: AlicizationGoalKind
  status: AlicizationGoalStatus
  label: string
  confidence: number
  urgency: number
  desireWeight: number
  blockers: string[]
  entityIds: string[]
  createdAt: number
  lastUpdatedAt: number
}

export interface AlicizationGoalStackSnapshot {
  leadingHostGoalId: string | null
  leadingAlicizationGoalId: string | null
  hostGoals: AlicizationGoalSnapshot[]
  alicizationGoals: AlicizationGoalSnapshot[]
  unresolvedSummary?: string
  updatedAt: number
}

export interface AlicizationSelfContinuitySnapshot {
  attachmentMode: AlicizationAttachmentMode
  initiativeTemperament: AlicizationInitiativeTemperament
  perceptionTrust: number
  relationshipTrust: number
  guardingTendency: number
  misreadBurden: number
  carryOverDesire: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationPersonaDriftAttachmentStyle = 'guarded' | 'nearby' | 'attuned'
export type AlicizationPersonaDriftExpressionStyle = 'contained' | 'measured' | 'warm' | 'playful' | 'sharp'
export type AlicizationPersonaDriftConflictStyle = 'repair-first' | 'soften-first' | 'watch-then-return' | 'direct-when-certain'
export type AlicizationPersonaDriftAgencyStyle = 'reserved' | 'balanced' | 'self-starting'
export type AlicizationAutobiographicalGoalKind
  = | 'preserve-trust'
    | 'reduce-misread'
    | 'stay-near-without-crowding'
    | 'protect-rest-rhythm'
    | 'finish-open-loops'
    | 'grow-shared-language'
export type AlicizationAutobiographicalGoalStatus = 'background' | 'warming' | 'active'

export interface AlicizationAutobiographicalGoalSnapshot {
  id: string
  kind: AlicizationAutobiographicalGoalKind
  status: AlicizationAutobiographicalGoalStatus
  weight: number
  summary: string
  sourceTags: string[]
  createdAt: number
  updatedAt: number
}

export type AlicizationPersonaGradualUnlockFacetKind = SharedAlicizationPersonaGradualUnlockFacetKind
export type AlicizationPersonaGradualUnlockFacetSnapshot = SharedAlicizationPersonaGradualUnlockFacetSnapshot
export type AlicizationPersonaGradualUnlockHypothesisSnapshot = SharedAlicizationPersonaGradualUnlockHypothesisSnapshot
export type AlicizationPersonaGradualUnlockSnapshot = SharedAlicizationPersonaGradualUnlockSnapshot

export type AlicizationLongHorizonMemoryCueInfluence = SharedAlicizationLongHorizonMemoryCueInfluence
export type AlicizationLongHorizonMemoryCueSnapshot = SharedAlicizationLongHorizonMemoryCueSnapshot
export type AlicizationLongHorizonMemorySnapshot = SharedAlicizationLongHorizonMemorySnapshot

export interface AlicizationAutobiographicalSelfSnapshot {
  personaDrift: {
    attachmentStyle: AlicizationPersonaDriftAttachmentStyle
    expressionStyle: AlicizationPersonaDriftExpressionStyle
    conflictStyle: AlicizationPersonaDriftConflictStyle
    agencyStyle: AlicizationPersonaDriftAgencyStyle
    attachmentNeed: number
    autonomyNeed: number
    truthAnchor: number
    careBias: number
    playBias: number
    irritabilityThreshold: number
    stubbornness: number
  }
  preferenceEvolution: {
    companionship: number
    truthfulGrounding: number
    gentleRepair: number
    quietObservation: number
    proactiveCare: number
    playfulIntimacy: number
    autonomyRespect: number
    unfinishedThreadReturn: number
  }
  activeGoals: AlicizationAutobiographicalGoalSnapshot[]
  behaviorSignatures: string[]
  identityNarrative: string
  relationshipDoctrine: string
  gradualUnlock?: AlicizationPersonaGradualUnlockSnapshot | null
  latestInflection?: string | null
  stability: number
  updatedAt: number
}

export type AlicizationMotiveDriveKind
  = | 'companionship'
    | 'boundary-respect'
    | 'truth-discipline'
    | 'rest-protection'
    | 'unfinished-thread-return'
    | 'self-direction'

export type AlicizationMotiveAgendaKind
  = | 'preserve-trust'
    | 'protect-boundary'
    | 'return-open-loop'
    | 'protect-rest'
    | 'stay-near-lightly'
    | 'grow-shared-language'

export type AlicizationMotiveAgendaStatus = 'background' | 'warming' | 'foreground'

export interface AlicizationMotiveAgendaSnapshot {
  id: string
  kind: AlicizationMotiveAgendaKind
  status: AlicizationMotiveAgendaStatus
  weight: number
  summary: string
  sourceTags: string[]
  targetGoalKind?: AlicizationGoalKind | null
  createdAt: number
  updatedAt: number
}

export interface AlicizationMotiveEngineSnapshot {
  rulingDrive: AlicizationMotiveDriveKind | null
  drives: {
    companionship: number
    boundaryRespect: number
    truthDiscipline: number
    restProtection: number
    unfinishedThreadReturn: number
    selfDirection: number
  }
  longTermGoals: AlicizationMotiveAgendaSnapshot[]
  backgroundAgendas: AlicizationMotiveAgendaSnapshot[]
  returnPressure: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationHabitPolicyMode
  = | 'repair-before-fluency'
    | 'light-touch-companionship'
    | 'protect-rest-window'
    | 'return-with-proof'
    | 'watchful-boundary'

export interface AlicizationHabitPolicySnapshot {
  dominantMode: AlicizationHabitPolicyMode
  requiresGroundingBeforeSurface: boolean
  prefersQuietCompanionship: boolean
  blocksDirectSpeakWhenBusy: boolean
  protectsRestWindow: boolean
  returnViaRecheck: boolean
  suggestedStyleCap?: AlicizationProactiveStyle | null
  suggestedPresenceCap?: AlicizationEmbodiedPresenceState | null
  narrative: string[]
  updatedAt: number
}

export interface AlicizationRelationshipModelSnapshot {
  climate: AlicizationRelationshipClimate
  approachVector: AlicizationRelationshipApproachVector
  receptivity: number
  sharedAttentionTrust: number
  correctionSensitivity: number
  reciprocityExpectation: number
  activeBoundaries: string[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationDesireMemoryEntry {
  id: string
  kind: AlicizationDesireKind
  status: AlicizationDesireStatus
  reason: string
  strength: number
  goalId?: string | null
  entityId?: string | null
  reopenWhen: string[]
  createdAt: number
  lastFeltAt: number
  lastSurfacedAt?: number | null
  expiresAt: number
}

export interface AlicizationDesireMemorySnapshot {
  activeDesires: AlicizationDesireMemoryEntry[]
  resurfacingDesireId?: string | null
  withheldCount: number
  updatedAt: number
}

export interface AlicizationInquirySnapshot {
  id: string
  kind: AlicizationInquiryKind
  status: AlicizationInquiryStatus
  priority: AlicizationInquiryPriority
  question: string
  whyItMatters: string
  confidence: number
  targetBeliefId?: string | null
  evidenceWanted: string[]
  reopenWhen: string[]
  openedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationInquiryLoopSnapshot {
  primaryInquiryId: string | null
  inquiries: AlicizationInquirySnapshot[]
  openCount: number
  updatedAt: number
}

export interface AlicizationDeliberationThreadSnapshot {
  id: string
  kind: AlicizationDeliberationKind
  status: AlicizationDeliberationStatus
  summary: string
  question?: string
  desiredOutcome: string
  focusBeliefId?: string | null
  focusInquiryId?: string | null
  concernId?: string | null
  surfacePressure: number
  silencePressure: number
  embodiedPresence: AlicizationEmbodiedPresenceState
  startedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationDeliberationStateSnapshot {
  primaryThreadId: string | null
  dominantNeed: AlicizationMindNeed
  readiness: number
  threads: AlicizationDeliberationThreadSnapshot[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationActionEcologySnapshot {
  mode: AlicizationActionEcologyMode
  selectedThreadId: string | null
  readiness: number
  surfacePressure: number
  silencePressure: number
  suggestedStyle: AlicizationProactiveStyle
  embodiedPresence: AlicizationEmbodiedPresenceState
  shouldSurface: boolean
  shouldSpeak: boolean
  why: string
  updatedAt: number
}

export interface AlicizationThreadRuntimeSnapshot {
  id: string
  sourceThreadId?: string | null
  sourceHypothesisId?: string | null
  need: AlicizationMindNeed
  status: AlicizationThreadRuntimeStatus
  summary: string
  salience: number
  continuity: number
  whyHeld: string
  returnWhen: string[]
  suggestedPresence: AlicizationEmbodiedPresenceState
  lastActivatedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationThreadRuntimeStateSnapshot {
  foregroundThreadId: string | null
  threads: AlicizationThreadRuntimeSnapshot[]
  driftPressure: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationCommitmentSnapshot {
  id: string
  kind: AlicizationCommitmentKind
  status: AlicizationCommitmentStatus
  title: string
  summary: string
  source: 'hypothesis' | 'runtime-thread' | 'private-thought' | 'continuity'
  priority: number
  confidence: number
  targetHypothesisId?: string | null
  targetRuntimeThreadId?: string | null
  targetBeliefId?: string | null
  createdAt: number
  lastRenewedAt: number
  patienceUntil: number
  expiresAt: number
}

export interface AlicizationCommitmentLedgerSnapshot {
  governingCommitmentId: string | null
  commitments: AlicizationCommitmentSnapshot[]
  carryPressure: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationInquiryPlanSnapshot {
  id: string
  kind: AlicizationInquiryPlanKind
  status: AlicizationInquiryPlanStatus
  priority: AlicizationInquiryPriority
  question: string
  targetHypothesisId?: string | null
  targetCommitmentId?: string | null
  targetRuntimeThreadId?: string | null
  askForGrounding: boolean
  suggestedProbeMs: number
  evidenceWanted: string[]
  createdAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationInquiryPlannerSnapshot {
  activePlanId: string | null
  plans: AlicizationInquiryPlanSnapshot[]
  epistemicPressure: number
  groundingUrgency: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationConcernContinuityStatus = 'active' | 'carried' | 'cooling' | 'released'

export interface AlicizationConcernContinuityEntry {
  id: string
  sourceConcernId?: string | null
  kind: AlicizationConcernKind
  status: AlicizationConcernContinuityStatus
  summary: string
  anchor: string
  targetThreadId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  continuityWeight: number
  freshnessBias: number
  repairAffinity: number
  confidence: number
  createdAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationConcernContinuityLedgerSnapshot {
  governingEntryId: string | null
  entries: AlicizationConcernContinuityEntry[]
  carryPressure: number
  unresolvedCount: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationMemoryRecollectionMode = SharedAlicizationMemoryRecollectionMode
export type AlicizationMemoryRecollectionTemporalFocus = SharedAlicizationMemoryRecollectionTemporalFocus
export type AlicizationMemoryRecollectionEraFacet = SharedAlicizationMemoryRecollectionEraFacet
export type AlicizationMemoryRecollectionAgendaSnapshot = SharedAlicizationMemoryRecollectionAgendaSnapshot
export type AlicizationMemoryRecollectionIntentSnapshot = SharedAlicizationMemoryRecollectionIntentSnapshot
export type AlicizationRecollectionSearchFocus = SharedAlicizationRecollectionSearchFocus
export type AlicizationRecollectionSearchAction = SharedAlicizationRecollectionSearchAction
export type AlicizationRecollectionEvidenceGap = SharedAlicizationRecollectionEvidenceGap
export type AlicizationRecollectionAmbiguityPosture = SharedAlicizationRecollectionAmbiguityPosture
export type AlicizationRecollectionSearchTrace = SharedAlicizationRecollectionSearchTrace
export type AlicizationRecollectionCertainty = SharedAlicizationRecollectionCertainty
export type AlicizationRecollectionSurfaceMode = SharedAlicizationRecollectionSurfaceMode
export type AlicizationRecollectionNarrativeSnapshot = SharedAlicizationRecollectionNarrativeSnapshot
export type AlicizationRecollectionPlan = SharedAlicizationRecollectionPlan
export type AlicizationRecollectionSpeechPlan = SharedAlicizationRecollectionSpeechPlan
export type AlicizationMemoryDeliberationConflictSeverity = SharedAlicizationMemoryDeliberationConflictSeverity
export type AlicizationMemoryDeliberationSelectedEra = SharedAlicizationMemoryDeliberationSelectedEra
export type AlicizationMemoryDeliberationSelectedPeriod = SharedAlicizationMemoryDeliberationSelectedPeriod
export type AlicizationMemoryDeliberationSelectedEpisode = SharedAlicizationMemoryDeliberationSelectedEpisode
export type AlicizationMemoryDeliberationConflictVariant = SharedAlicizationMemoryDeliberationConflictVariant
export type AlicizationMemoryDeliberationSelectedProcedure = SharedAlicizationMemoryDeliberationSelectedProcedure
export type AlicizationMemoryDeliberationSelectedBundle = SharedAlicizationMemoryDeliberationSelectedBundle
export type AlicizationMemoryDeliberationSelectedChain = SharedAlicizationMemoryDeliberationSelectedChain
export type AlicizationMemoryFollowUpIntrusionRisk = SharedAlicizationMemoryFollowUpIntrusionRisk
export type AlicizationMemoryFollowUpPayoffDependency = SharedAlicizationMemoryFollowUpPayoffDependency
export type AlicizationMemoryFollowUpPreferredTiming = SharedAlicizationMemoryFollowUpPreferredTiming
export type AlicizationMemoryFollowUpAffordance = SharedAlicizationMemoryFollowUpAffordance
export type AlicizationMemoryDeliberation = SharedAlicizationMemoryDeliberation

export type AlicizationRepairLedgerKind
  = | 'reground-scene'
    | 'stale-scene-anchor'
    | 'belief-contradiction'
    | 'present-tense-boundary'

export type AlicizationRepairLedgerStatus = 'open' | 'tracking' | 'cooling' | 'resolved'

export interface AlicizationRepairLedgerEntry {
  id: string
  kind: AlicizationRepairLedgerKind
  status: AlicizationRepairLedgerStatus
  summary: string
  rationale: string
  targetConcernEntryId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  targetBeliefId?: string | null
  urgency: number
  confidence: number
  createdAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationRepairLedgerSnapshot {
  governingRepairId: string | null
  entries: AlicizationRepairLedgerEntry[]
  repairPressure: number
  truthRisk: number
  shouldConstrainPresentTense: boolean
  narrative: string[]
  updatedAt: number
}

export type AlicizationMindProjectKind
  = | 'repair-truth'
    | 'hold-knot'
    | 'care-host'
    | 'stay-near'
    | 'reacquire-scene'
    | 'witness-afterglow'

export type AlicizationMindProjectStatus = 'forming' | 'active' | 'withheld' | 'stabilizing' | 'released'

export interface AlicizationMindProjectSnapshot {
  id: string
  kind: AlicizationMindProjectKind
  status: AlicizationMindProjectStatus
  title: string
  summary: string
  tension: number
  confidence: number
  continuityWeight: number
  speakAffinity: number
  sourceTags: string[]
  targetThreadId?: string | null
  targetConcernEntryId?: string | null
  targetRepairId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  targetThoughtThreadId?: string | null
  targetGovernorIntentionId?: string | null
  formedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationIntentionStreamSnapshot {
  dominantProjectId: string | null
  projects: AlicizationMindProjectSnapshot[]
  carryPressure: number
  surfaceBias: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationReflectionOutcome = 'helped' | 'stalled' | 'missed' | 'corrected' | 'released' | 'unknown'

export interface AlicizationReflectionEntrySnapshot {
  id: string
  targetProjectId?: string | null
  targetAnswerAct?: AlicizationAnswerAct | null
  targetRepairId?: string | null
  targetThreadId?: string | null
  summary: string
  expectation: string
  observedOutcome: string
  outcome: AlicizationReflectionOutcome
  revision: string
  confidenceShift: number
  createdAt: number
}

export interface AlicizationReflectionLedgerSnapshot {
  latestEntryId: string | null
  entries: AlicizationReflectionEntrySnapshot[]
  revisionPressure: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationExecutivePhase
  = | 'perceiving'
    | 'inferring'
    | 'deliberating'
    | 'committing'
    | 'acting'
    | 'reflecting'

export interface AlicizationExecutiveCycleSnapshot {
  cycleId: string
  phase: AlicizationExecutivePhase
  dominantProjectId: string | null
  activeReflectionId?: string | null
  governingThreadId?: string | null
  governingRepairId?: string | null
  shouldAct: boolean
  shouldReflect: boolean
  actionReadiness: number
  currentLine: string
  narrative: string[]
  updatedAt: number
}

export type AlicizationDialogueAnswerSubject
  = | 'alicization-self'
    | 'relationship'
    | 'host-state'
    | 'task-knot'
    | 'visible-scene'
    | 'general'

export type AlicizationCodingAgentDelegationVerdict
  = | 'respond-directly'
    | 'clarify'
    | 'delegate-coding-agent'

export type AlicizationCodingAgentDelegationScope
  = | 'none'
    | 'investigation'
    | 'edit'
    | 'command'

export type AlicizationCodingAgentDelegationIntentKind
  = | 'capability-query'
    | 'execute'

export type AlicizationCodingAgentDelegationRequestedAgent
  = | 'auto'
    | 'codex'
    | 'claude-code'
    | 'cli'
    | null

export interface AlicizationCodingAgentDelegationSnapshot {
  intentKind: AlicizationCodingAgentDelegationIntentKind
  requestedAgent: AlicizationCodingAgentDelegationRequestedAgent
  verdict: AlicizationCodingAgentDelegationVerdict
  scope: AlicizationCodingAgentDelegationScope
  confidence: number
  sourceTurnId: string
  source: 'heuristic' | 'structured-cognition' | 'fallback'
}

export type AlicizationDialogueScreenReferenceMode
  = | 'required'
    | 'helpful'
    | 'incidental'
    | 'avoid'

export type AlicizationDialogueAct
  = | 'ask-help'
    | 'ask-teach'
    | 'verify-grounding'
    | 'correct'
    | 'challenge'
    | 'share-state'
    | 'seek-care'
    | 'social-bid'
    | 'continue-thread'
    | 'close-thread'
    | 'unknown'

export type AlicizationDialogueResponseNeed
  = | 'repair'
    | 'guide'
    | 'teach'
    | 'answer'
    | 'care'
    | 'accompany'
    | 'clarify'

export type AlicizationDialogueTruthExpectation = 'strict' | 'normal' | 'light'

export type AlicizationMindRelationMove
  = | 'self-disclose'
    | 'attune'
    | 'guide'
    | 'repair'
    | 'witness'
    | 'care'
    | 'clarify'

export type AlicizationMindSpeechObligation
  = | 'answer-self'
    | 'answer-relationship'
    | 'care-host'
    | 'guide-task'
    | 'repair-truth'
    | 'inspect-scene'
    | 'answer-general'

export type AlicizationTurnAnchorSource
  = | 'user-text'
    | 'dialogue-summary'
    | 'question'
    | 'focus-summary'
    | 'obligation'
    | 'thread'
    | 'scene'
    | 'carry'
    | 'unknown'

export type AlicizationInspectionTurnState
  = | 'dialogue-first'
    | 'inspection-live'
    | 'inspection-carry'
    | 'screen-repair'

export type AlicizationPersonaKernelMode = 'full' | 'backgrounded' | 'muted'

export interface AlicizationDiscourseStateSnapshot {
  currentTurnSubject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  currentTurnSummary: string
  currentQuestion?: string | null
  primaryTurnAnchor?: string | null
  primaryTurnAnchorSource?: AlicizationTurnAnchorSource | null
  owedAction: AlicizationMindSpeechObligation
  relationMove: AlicizationMindRelationMove
  continuityMode: 'dialogue-first' | 'task-first' | 'scene-first'
  unresolvedCarry?: string | null
  ruptureRepair?: string | null
  confidence: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationDialogueTurnEncounterSnapshot {
  act: AlicizationDialogueAct
  responseNeed: AlicizationDialogueResponseNeed
  truthExpectation: AlicizationDialogueTruthExpectation
  subject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  continuityMode: 'dialogue-first' | 'task-first' | 'scene-first'
  inspectionRequested: boolean
  inspectionState: AlicizationInspectionTurnState
  releaseInspectionCarry: boolean
  taskAnchor?: string | null
  summary: string
  dialogueFirst: boolean
  shouldBypassScreenRepair: boolean
  mustRepairFirst: boolean
  mustAnswerDirectly: boolean
  mustStayTaskBound: boolean
  shouldAskClarifyingQuestion: boolean
  personaKernelMode: AlicizationPersonaKernelMode
  confidence: number
  reasonTags: string[]
}

export interface AlicizationMindStatementSnapshot {
  label: string
  summary: string
  confidence: number
  sourceTags: string[]
}

export interface AlicizationMindSynthesisSnapshot {
  answerSubject: AlicizationDialogueAnswerSubject
  relationMove: AlicizationMindRelationMove
  speechObligation: AlicizationMindSpeechObligation
  beliefs: AlicizationMindStatementSnapshot[]
  uncertainties: AlicizationMindStatementSnapshot[]
  concerns: AlicizationMindStatementSnapshot[]
  commitments: AlicizationMindStatementSnapshot[]
  desires: AlicizationMindStatementSnapshot[]
  openingIntent: string
  truthBoundary: string
  interiorSummary: string
  confidence: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationConversationMemoryMode
  = | 'task-thread'
    | 'scene-anchored'
    | 'dialogue-carry'
    | 'emotional-resonance'

export interface AlicizationConversationStateSnapshot {
  jointThread: string
  hostMove: string
  primaryTurnAnchor?: string | null
  primaryTurnAnchorSource?: AlicizationTurnAnchorSource | null
  activeProject?: string | null
  unansweredQuestion?: string | null
  owedRepair?: string | null
  activeCommitments: string[]
  relationFrame: AlicizationMindRelationMove
  continuityPolicy: 'stay-on-thread' | 'answer-then-carry' | 'scene-before-memory' | 'dialogue-before-scene'
  memoryMode: AlicizationConversationMemoryMode
  memoryQueryHints: string[]
  shouldHoldThread: boolean
  carryEligible?: boolean
  carryReason?: string | null
  confidence: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationReplyMotive
  = | 'repair'
    | 'guide'
    | 'answer'
    | 'care'
    | 'attune'
    | 'witness'
    | 'defer'

export interface AlicizationReplyMotiveSnapshot {
  kind: AlicizationReplyMotive
  summary: string
  weight: number
  sourceTags: string[]
}

export type AlicizationConsciousTruthDiscipline
  = | 'repair-first'
    | 'observe-first'
    | 'observe-then-hypothesize'
    | 'dialogue-first'
    | 'memory-labeled'

export interface AlicizationCurrentConsciousFrameSnapshot {
  subject: AlicizationDialogueAnswerSubject
  centerOfGravity: AlicizationReplyMotive
  truthDiscipline: AlicizationConsciousTruthDiscipline
  consciousNeed: string
  consciousNeedSource?: 'user-text' | 'question' | 'host-move' | null
  consciousTension: string
  speakingIntention: string
  focusAnchor?: string | null
  focusAnchorSource?:
    | 'user-text'
    | 'question'
    | 'host-move'
    | 'conversation-anchor'
    | 'discourse-anchor'
    | 'dialogue-task-anchor'
    | null
  withheldImpulse?: string | null
  shouldWithholdSpecificity: boolean
  shouldSelfRevise: boolean
  confidence: number
  reasonTags: string[]
  updatedAt: number
}

export type AlicizationClaimSpecificityBudget
  = | 'dialogue-only'
    | 'coarse-scene'
    | 'grounded-artifacts'

export interface AlicizationClaimEvidenceLedgerSnapshot {
  subject: AlicizationDialogueAnswerSubject
  evidenceMode: AlicizationAnswerEvidenceMode
  observedSurface?: string | null
  taskHypothesis?: string | null
  intentHypothesis?: string | null
  specificityBudget: AlicizationClaimSpecificityBudget
  hostReferencedCues: string[]
  groundedArtifactCues: string[]
  allowedSpecificCues: string[]
  shouldLabelHypothesis: boolean
  forbidUnsupportedSpecificity: boolean
  shouldSelfRevise: boolean
  confidence: number
  reasonTags: string[]
  updatedAt: number
}

export interface AlicizationReplyDeliberationSnapshot {
  selectedMotive: AlicizationReplyMotive
  speakingFrom: 'live-scene' | 'task-thread' | 'dialogue-bond' | 'self-continuity' | 'held-memory'
  memoryMode: AlicizationConversationMemoryMode
  openingBeat: string
  whyThisReplyNow: string
  whyNotOtherCandidates: string[]
  withheldImpulses: string[]
  candidateMotives: AlicizationReplyMotiveSnapshot[]
  shouldSpeak: boolean
  mustInclude: string[]
  mustAvoid: string[]
  confidence: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationDialogueWorldOutcome
  = | 'none'
    | 'pending'
    | 'aligned'
    | 'missed'
    | 'repairing'
    | 'deferred'

export interface AlicizationDialoguePendingValidationSnapshot {
  question?: string | null
  expectedMode: 'repair' | 'guide' | 'answer' | 'care' | 'attune' | 'witness' | 'defer'
  openedAt: number
}

export interface AlicizationDialogueWorldThreadSnapshot {
  activeThread: string
  currentQuestion?: string | null
  primaryTurnAnchor?: string | null
  primaryTurnAnchorSource?: AlicizationTurnAnchorSource | null
  openLoops: string[]
  recentlyResolvedLoops: string[]
  carriedFacts: string[]
  relationDrift: 'steady' | 'warming' | 'repairing' | 'guarded'
  memoryMode: AlicizationConversationMemoryMode
  recallKeys: string[]
  carryEligible?: boolean
  carryReason?: string | null
  lastUserMove: string
  lastAssistantMove?: string | null
  lastOutcome: AlicizationDialogueWorldOutcome
  pendingValidation?: AlicizationDialoguePendingValidationSnapshot | null
  confidence: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationRecallGovernorSnapshot {
  mode: 'none' | 'thread' | 'scene' | 'emotional-resonance' | 'self-continuity'
  recallSeed: string
  threadAnchors?: string[]
  affectAnchors?: string[]
  relationshipAnchors?: string[]
  salienceBias?: number
  sceneAnchor?: string | null
  sceneFamiliarityHint?: number | null
  affectiveCarry?: {
    moodLabel?: string | null
    emotionalTension?: AlicizationEmotionalTension | null
    socialNeed?: number | null
    reflectivePull?: number | null
    summary?: string | null
  } | null
  embodiedCarry?: {
    presence?: AlicizationEmbodiedPresenceState | null
    suggestedStyle?: AlicizationProactiveStyle | null
    afterglowFromScenario?: 'coding' | 'media' | null
    shouldSpeak?: boolean | null
    summary?: string | null
  } | null
  recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null
  recalledFragmentCap?: number
  recalledFragmentSourceBudget?: Array<{
    sourceKind: AlicizationSubconsciousFragmentSourceKind
    maxItems: number
  }>
  carryAsMemory: boolean
  rationale: string
  narrative: string[]
  updatedAt: number
}

export type AlicizationAnswerAct = SharedAlicizationAnswerAct

export type AlicizationAnswerEvidenceMode = SharedAlicizationAnswerEvidenceMode

export interface AlicizationAnswerPlannerSnapshot {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  confidence: number
  governingFocus: string
  governingProject?: string | null
  openingMove: string
  answerIntent: string
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  activeClosenessContext?: 'focused-work' | 'repair-window' | 'late-night-care' | 'execution-callback' | 'open-companionship' | 'general' | null
  activeClosenessRung?: 'space-first' | 'measured-room' | 'nearby-soft' | 'warm-near' | 'close-hold' | null
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
  selectedConcernEntryId?: string | null
  selectedRepairId?: string | null
  selectedCommitmentId?: string | null
  selectedInquiryPlanId?: string | null
  selectedRuntimeThreadId?: string | null
  selectedProjectId?: string | null
  selectedReflectionId?: string | null
  executivePhase?: AlicizationExecutivePhase | null
  selectedTruthFrame?: AlicizationWorldFrameKind | null
  mustDo: string[]
  mustNotDo: string[]
  narrative: string[]
  updatedAt: number
}

export type AlicizationCompiledResponseMode
  = | 'repair-and-reanchor'
    | 'guide-current-knot'
    | 'care-with-boundary'
    | 'accompany-lightly'
    | 'answer-naturally'

export type AlicizationReplyRealizationMode = 'provider-mind-required'
export type AlicizationNormalVisibleReplyAuthority = SharedAlicizationNormalVisibleReplyAuthority
export type AlicizationInfraVisibleReplyAuthority = SharedAlicizationInfraVisibleReplyAuthority
export type AlicizationVisibleReplyExecutionAuthority = SharedAlicizationVisibleReplyExecutionAuthority

export interface AlicizationAnswerCompilerSnapshot {
  answerSubject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  speechObligation: AlicizationMindSpeechObligation
  relationMove: AlicizationMindRelationMove
  turnMode: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
  responseMode: AlicizationCompiledResponseMode
  replyRealizationMode?: AlicizationReplyRealizationMode | null
  expectedVisibleReplyAuthority?: AlicizationNormalVisibleReplyAuthority | null
  recommendedAct: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  personaKernelMode: 'full' | 'backgrounded' | 'muted'
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  activeClosenessContext?: 'focused-work' | 'repair-window' | 'late-night-care' | 'execution-callback' | 'open-companionship' | 'general' | null
  activeClosenessRung?: 'space-first' | 'measured-room' | 'nearby-soft' | 'warm-near' | 'close-hold' | null
  openingDirective: string
  openingClaim: string
  supportingReality: string[]
  uncertaintyBoundary?: string | null
  careVector?: string | null
  nextMove?: string | null
  labelCarryAsMemory: boolean
  maxSentences: number
  mustDo: string[]
  mustNotDo: string[]
  confidence: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationMindTurnContractSnapshot {
  version: 'mind-turn-contract-v1'
  expectedVisibleReplyAuthority: AlicizationNormalVisibleReplyAuthority
  replyRealizationMode: AlicizationReplyRealizationMode
  updatedAt: number
}

export type AlicizationDialogueActKernelTruthMode = AlicizationAnswerEvidenceMode | 'memory-only'

export type AlicizationDialogueActKernelEvidenceKind
  = | 'scene'
    | 'thread'
    | 'project'
    | 'host-goal'
    | 'reply-motive'
    | 'private-thought'
    | 'repair'
    | 'memory'

export type AlicizationDialogueActKernelEvidenceSource
  = | 'current-scene'
    | 'dialogue-world-thread'
    | 'conversation-state'
    | 'answer-compiler'
    | 'answer-planner'
    | 'reply-deliberation'
    | 'private-thought'
    | 'appraisal'
    | 'world-model'

export interface AlicizationDialogueActKernelEvidence {
  kind: AlicizationDialogueActKernelEvidenceKind
  source: AlicizationDialogueActKernelEvidenceSource
  summary: string
  confidence: number
}

export interface AlicizationDialogueActKernelSnapshot {
  subject: AlicizationDialogueAnswerSubject
  hostGoal: AlicizationHostGoalHypothesis
  relationNeed: AlicizationRelationshipNeed
  activeProject?: string | null
  truthMode: AlicizationDialogueActKernelTruthMode
  speechAct: AlicizationAnswerAct
  turnMode: AlicizationAnswerCompilerSnapshot['turnMode']
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  speakingFrom: AlicizationReplyDeliberationSnapshot['speakingFrom']
  selectedEvidence: AlicizationDialogueActKernelEvidence[]
  openingClaim: string
  openingMove: string
  whyNow: string
  mustSay: string[]
  mustAvoid: string[]
  sourceTrace: string[]
  confidence: number
  updatedAt: number
}

export interface AlicizationMindTurnFrameWorldSnapshot {
  activeThread?: string | null
  visibleSurface?: string | null
  truthState: 'live-grounded' | 'live-observed' | 'dialogue-grounded' | 'remembered' | 'imagined' | 'uncertain'
  truthBoundary?: string | null
  continuityPolicy?: AlicizationConversationStateSnapshot['continuityPolicy'] | null
  continuitySummary?: string | null
  staleRisk: number
}

export interface AlicizationMindTurnFrameRelationSnapshot {
  subject: AlicizationDialogueAnswerSubject
  hostMove?: string | null
  hostGoal?: AlicizationHostGoalHypothesis | null
  relationNeed?: AlicizationRelationshipNeed | null
  relationMove?: AlicizationMindRelationMove | null
  relationshipPosture?: 'restrained' | 'warm' | 'tender' | null
}

export interface AlicizationMindTurnFrameMemorySnapshot {
  memoryMode?: AlicizationConversationMemoryMode | null
  carriedThread?: string | null
  carriedFacts: string[]
  recallKeys: string[]
  recallSeed?: string | null
  lastOutcome?: AlicizationDialogueWorldOutcome | null
  labelCarryAsMemory: boolean
}

export interface AlicizationMindTurnFrameSelfSnapshot {
  stance?: AlicizationPrivateThoughtSnapshot['stance'] | null
  mindMode?: AlicizationMindKernelMode | null
  dominantDrive?: AlicizationSelfGovernorDrive | null
  embodiedPresence?: AlicizationEmbodiedPresenceState
  emotionalTension?: AlicizationEmotionalTension
  initiativeAction?: AlicizationMindActionTendency | null
  thought?: string | null
}

export interface AlicizationMindTurnFrameObligationSnapshot {
  shouldSpeak: boolean
  speechObligation?: AlicizationMindSpeechObligation | null
  answerAct?: AlicizationAnswerAct | null
  responseMode?: AlicizationAnswerCompilerSnapshot['responseMode'] | null
  turnMode: AlicizationAnswerCompilerSnapshot['turnMode']
  openingClaim?: string | null
  openingMove?: string | null
  answerIntent?: string | null
  whyNow?: string | null
  repairState: 'none' | 'stale-anchor' | 'need-reground'
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
}

export interface AlicizationMindTurnFrameSnapshot {
  world: AlicizationMindTurnFrameWorldSnapshot
  relation: AlicizationMindTurnFrameRelationSnapshot
  memory: AlicizationMindTurnFrameMemorySnapshot
  self: AlicizationMindTurnFrameSelfSnapshot
  obligation: AlicizationMindTurnFrameObligationSnapshot
  focusAnchor?: string | null
  confidence: number
  mustDo: string[]
  mustNotDo: string[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationMindDynamicsSnapshot {
  dominantMotive: AlicizationMindMotive | null
  worldPressure: number
  epistemicPressure: number
  relationalPressure: number
  carePressure: number
  continuityPressure: number
  restraintPressure: number
  surfacePressure: number
  speakReadiness: number
  presenceWeight: number
  motives: Partial<Record<AlicizationMindMotive, number>>
  speakDrive: number
  silenceDrive: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationMindKernelSnapshot {
  dominantMode: AlicizationMindKernelMode
  governingHypothesisId?: string | null
  governingRuntimeThreadId?: string | null
  governingCommitmentId?: string | null
  governingInquiryPlanId?: string | null
  governingIntentionId?: string | null
  dominantDrive?: AlicizationSelfGovernorDrive | null
  worldPressure: number
  epistemicPressure: number
  relationalPressure: number
  carePressure: number
  continuityPressure: number
  speakReadiness: number
  presenceWeight: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationSelfGovernorIntentionSnapshot {
  id: string
  kind: AlicizationSelfGovernorIntentionKind
  status: AlicizationSelfGovernorIntentionStatus
  drive: AlicizationSelfGovernorDrive
  title: string
  summary: string
  urgency: number
  confidence: number
  patience: number
  targetObjectId?: string | null
  targetThreadId?: string | null
  targetGoalId?: string | null
  targetCommitmentId?: string | null
  formedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationSelfGovernorSnapshot {
  dominantDrive: AlicizationSelfGovernorDrive | null
  dominantIntentionId: string | null
  focusObjectId?: string | null
  activeIntentions: AlicizationSelfGovernorIntentionSnapshot[]
  inhibition: number
  persistence: number
  socialRiskTolerance: number
  revisionReadiness: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationThoughtThreadSnapshot {
  id: string
  kind: AlicizationThoughtThreadKind
  status: AlicizationThoughtThreadStatus
  title: string
  summary: string
  question?: string
  anchoredObjectId?: string | null
  anchoredIntentionId?: string | null
  anchoredBeliefId?: string | null
  anchoredInquiryId?: string | null
  anchoredCommitmentId?: string | null
  salience: number
  confidence: number
  surfaceReadiness: number
  reopenWhen: string[]
  openedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationThoughtThreadStateSnapshot {
  foregroundThreadId: string | null
  threads: AlicizationThoughtThreadSnapshot[]
  unresolvedCount: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationHostIntentCandidateSnapshot {
  goal: AlicizationHostGoalHypothesis
  confidence: number
  why: string
}

export interface AlicizationRelationshipNeedCandidateSnapshot {
  need: AlicizationRelationshipNeed
  confidence: number
  why: string
}

export interface AlicizationSubjectiveInferenceSnapshot {
  dominantInterpretation: string
  situatedMeaning?: string
  selfQuestion?: string
  uncertainty?: string
  hostIntentCandidates: AlicizationHostIntentCandidateSnapshot[]
  relationshipNeedCandidates: AlicizationRelationshipNeedCandidateSnapshot[]
  confidence: number
  source?: 'heuristic' | 'structured-cognition' | 'hybrid'
  notes: string[]
  updatedAt: number
}

export interface AlicizationSubjectiveSceneAppraisal {
  inferredHostGoal: AlicizationHostGoalHypothesis
  currentKnot?: string
  whatChanged?: string
  waitingToVerify?: string
  situatedMeaning?: string
  relationshipNeed?: AlicizationRelationshipNeed
  source?: 'heuristic' | 'structured-cognition' | 'hybrid'
  confidence: number
  surprise: number
  carePressure: number
  interruptionCost: number
  desireToSpeak: number
  notes: string[]
}

export interface AlicizationConcernSnapshot {
  id: string
  kind: AlicizationConcernKind
  status: AlicizationConcernStatus
  summary: string
  target?: AlicizationVisualTarget | null
  hostGoal: AlicizationHostGoalHypothesis
  tension: number
  confidence: number
  careWeight: number
  createdAt: number
  lastEvidenceAt: number
  patienceUntil: number
  predictedClosure?: string
}

export interface AlicizationSelfStateSnapshot {
  stance: AlicizationMindStance
  feltCloseness: number
  protectiveness: number
  curiosity: number
  patience: number
  desireToSpeak: number
  fearOfInterrupting: number
  dominantConcernId?: string | null
  moodLabel?: string
}

export interface AlicizationInitiativeSnapshot {
  selectedAction: AlicizationMindActionTendency
  selectedProposalId?: string | null
  selectedTruthFrame?: AlicizationWorldFrameKind | null
  selectedCounterfactualOptionId?: string | null
  selectedConcernId?: string | null
  selectedBeliefId?: string | null
  selectedInquiryId?: string | null
  selectedCommitmentId?: string | null
  selectedInquiryPlanId?: string | null
  selectedHypothesisId?: string | null
  selectedThreadId?: string | null
  selectedRuntimeThreadId?: string | null
  selectedThoughtThreadId?: string | null
  selectedGovernorIntentionId?: string | null
  actionEcologyMode?: AlicizationActionEcologyMode | null
  confidence: number
  motives: Partial<Record<AlicizationMindMotive, number>>
  speakDrive?: number
  silenceDrive?: number
  preferredStyle?: AlicizationProactiveStyle
  preferredPresence?: AlicizationEmbodiedPresenceState
  why: string
  shouldSurface: boolean
  shouldSpeak: boolean
}

export type AlicizationAutonomyMode
  = | 'wait'
    | 'recheck'
    | 'hover'
    | 'whisper'
    | 'speak'
    | 'warn'
    | 'prepare-act'
    | 'act'

export type AlicizationAutonomyExecutionIntentKind
  = | 'observe'
    | 'repair'
    | 'care'
    | 'guide'
    | 'follow-through'
    | 'companionship'

export interface AlicizationAutonomyExecutionIntentSnapshot {
  kind: AlicizationAutonomyExecutionIntentKind
  summary: string
  targetThreadId?: string | null
}

export interface AlicizationAutonomySnapshot {
  selectedMode: AlicizationAutonomyMode
  visibleAction: AlicizationMindActionTendency
  shouldSurface: boolean
  shouldSpeak: boolean
  shouldAct: boolean
  speakReadiness: number
  actReadiness: number
  inhibition: number
  confidence: number
  deferReason?: string | null
  guardReasons: string[]
  whyNow: string
  sourceGoalId?: string | null
  sourceGoalSummary?: string | null
  sourceAgendaId?: string | null
  sourceAgendaKind?: string | null
  sourceAgendaSummary?: string | null
  sourceThreadId?: string | null
  sourceThreadSummary?: string | null
  sourceThoughtThreadId?: string | null
  sourceDesireId?: string | null
  sourceConcernId?: string | null
  sourceProposalId?: string | null
  sourceProposalSource?: string | null
  executionIntent?: AlicizationAutonomyExecutionIntentSnapshot | null
  updatedAt: number
}

export interface AlicizationInitiativeProposalSnapshot {
  id: string
  source: AlicizationInitiativeProposalSource
  truthFrame: AlicizationWorldFrameKind
  action: AlicizationMindActionTendency
  style: AlicizationProactiveStyle
  embodiedPresence: AlicizationEmbodiedPresenceState
  targetBeliefId?: string | null
  targetInquiryId?: string | null
  targetCommitmentId?: string | null
  targetHypothesisId?: string | null
  targetThreadId?: string | null
  targetRuntimeThreadId?: string | null
  targetThoughtThreadId?: string | null
  targetGovernorIntentionId?: string | null
  targetCounterfactualOptionId?: string | null
  targetDesireId?: string | null
  targetConcernId?: string | null
  truthCost: number
  interruptionCost: number
  relationshipCost: number
  continuityGain: number
  preferenceGain: number
  confidence: number
  score: number
  shouldSpeak: boolean
  shouldSurface: boolean
  why: string
}

export interface AlicizationInitiativeArbitrationSnapshot {
  selectedProposalId: string | null
  dominantConflict: string
  proposals: AlicizationInitiativeProposalSnapshot[]
  updatedAt: number
}

export interface AlicizationCounterfactualOptionSnapshot {
  id: string
  action: AlicizationMindActionTendency
  style: AlicizationProactiveStyle
  embodiedPresence: AlicizationEmbodiedPresenceState
  relationshipCost: number
  interruptionCost: number
  informationGain: number
  timingFitness: number
  identityFit: number
  score: number
  why: string
}

export interface AlicizationCounterfactualDeliberationSnapshot {
  selectedOptionId: string | null
  selectedAction: AlicizationMindActionTendency
  confidence: number
  dominantTradeoff: string
  options: AlicizationCounterfactualOptionSnapshot[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationPrivateThoughtSnapshot {
  stance: 'observe' | 'accompany' | 'nudge' | 'care' | 'warn' | 'uncertain'
  confidence: number
  rationaleTags: string[]
  thoughtText: string
  shouldSpeak: boolean
  suggestedStyle: AlicizationProactiveStyle
  embodiedPresence: AlicizationEmbodiedPresenceState
  expiresAt: number
  afterglowFromScenario?: 'coding' | 'media' | null
  emotionalTension: AlicizationEmotionalTension
  selectedConcernId?: string | null
  focusBeliefId?: string | null
  focusInquiryId?: string | null
  commitmentId?: string | null
  inquiryPlanId?: string | null
  hypothesisId?: string | null
  deliberationThreadId?: string | null
  runtimeThreadId?: string | null
  mindNeed?: AlicizationMindNeed | null
  relationshipVector?: AlicizationRelationshipApproachVector | null
  initiativeAction?: AlicizationMindActionTendency
  counterfactualOptionId?: string | null
  leadingGoalId?: string | null
  desireId?: string | null
  governorDrive?: AlicizationSelfGovernorDrive | null
  governorIntentionId?: string | null
  selectedThoughtThreadId?: string | null
  livingWorldObjectId?: string | null
}

export interface AlicizationVisualPresenceStateSnapshot extends SharedAlicizationPersistentPresenceAuthoritySnapshot {
  watchMode: AlicizationVisualWatchMode
  currentScene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  workingMemoryEpisodes: AlicizationVisualEpisode[]
  mindTurnFrame?: AlicizationMindTurnFrameSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  entityWorld?: AlicizationEntityWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  goalStack?: AlicizationGoalStackSnapshot | null
  concerns?: AlicizationConcernSnapshot[]
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  mindDynamics?: AlicizationMindDynamicsSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  autonomy?: AlicizationAutonomySnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounterSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  personStateProjection?: AlicizationPersonStateProjection | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  personStateUpdateSurface?: AlicizationPersonStateUpdateSurface | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  memoryStageReplay?: AlicizationOrganicMemoryStageReplay | null
  memoryResolutionLedger?: AlicizationMemoryResolutionLedger | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  residentPerformance?: SharedAlicizationResidentPerformanceSnapshot | null
  runtime?: Record<string, unknown> | null
  proactiveLoopState?: {
    globalCooldownUntil: number
    scenarioBias: Record<AlicizationProactiveScenario, number>
    consecutiveIgnored: Record<AlicizationProactiveScenario, number>
    initiativeTrust: number
    openingMomentum: number
    lastProactiveTurnAt: number | null
    lateNightActivityStartedAt: number | null
    lateNightActivityLastActiveAt: number | null
    pendingOutcomes: Array<{
      turnId: string
      scenario: AlicizationProactiveScenario
      deliveredAt: number
      feedbackWindowMs: number
      assistantText?: string | null
      learningAction?: 'record' | 'reflect' | 'verify' | 'revise' | 'internalize' | 'hold' | null
      learningFocuses?: string[]
    }>
    recentOutcomes: Array<{
      turnId: string
      scenario: AlicizationProactiveScenario
      outcome: 'positive' | 'dismiss' | 'ignored' | 'reply-within-120s'
      createdAt: number
      userText?: string | null
      assistantText?: string | null
      learningAction?: 'record' | 'reflect' | 'verify' | 'revise' | 'internalize' | 'hold' | null
      learningFocuses?: string[]
    }>
    updatedAt: number
  } | null
  raw?: {
    personStateProjection?: AlicizationPersonStateProjection | null
    runtimeDigest?: AlicizationRuntimeDigest | null
    runtime?: Record<string, unknown> | null
  } | null
  privateThought: AlicizationPrivateThoughtSnapshot | null
  captureState: {
    permission: 'granted' | 'denied' | 'prompt' | 'unknown'
    health?: AlicizationSensoryCaptureHealth
    lastGroundedAt: number | null
    sourceName?: string
    degradedReason?: string
  }
  durabilityPulse: AlicizationDurabilityPulseSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  nextSuggestedProbeMs: number
  runtimeDigest?: AlicizationRuntimeDigest | null
  updatedAt: number
}

export interface AlicizationPresencePulsePayload extends AlicizationCardScope {
  watchMode: AlicizationVisualWatchMode
  embodiedPresence: AlicizationEmbodiedPresenceState
  scenario: AlicizationProactiveScenario
  stance: AlicizationPrivateThoughtSnapshot['stance']
  currentBodyState?: AlicizationVisualPresenceStateSnapshot['currentBodyState']
  continuityMode?: AlicizationVisualPresenceStateSnapshot['continuityMode']
  quietLineMs?: number
  currentInwardPreoccupation?: string | null
  confidence: number
  reasonTags: string[]
  emotionalTension?: AlicizationEmotionalTension
  expiresAt: number
}

export interface AlicizationVisualPresenceStateChangedPayload extends AlicizationCardScope {
  state: AlicizationVisualPresenceStateSnapshot | null
}

export interface AlicizationProactiveDecision {
  shouldInterrupt: boolean
  confidence: number
  reasonCodes: AlicizationProactiveReasonCode[]
  urgency: AlicizationProactiveUrgency
  style: AlicizationProactiveStyle
  cooldownMs: number
  scenario: AlicizationProactiveScenario
  policyVersion: string
}

export type AlicizationProactiveMetadata = SharedAlicizationProactiveMetadata
export type AlicizationDialogueStructuredFormat = SharedAlicizationDialogueStructuredFormat

export type AlicizationProactiveFeedbackKind = 'positive' | 'dismiss'

export interface AlicizationProactiveFeedbackPayload extends AlicizationCardScope {
  turnId: string
  feedback: AlicizationProactiveFeedbackKind
  userText?: string | null
}

export type AlicizationDialogueEmbodimentEnvelope = SharedAlicizationDialogueEmbodimentEnvelope
export type AlicizationDialoguePerformancePayload = SharedAlicizationDialoguePerformancePayload
type AlicizationSharedSelfContinuityAuthority
  = NonNullable<
    NonNullable<
      NonNullable<SharedAlicizationDigitalLifeSpineDigest['memory']>['personStateProjection']
    >['selfContinuityAuthority']
  >
type AlicizationLocalSelfContinuityAuthority
  = | (AlicizationSharedSelfContinuityAuthority & {
    closenessPosture?: string | null
    currentBodyState?: string | null
  })
  | {
    sourceTags?: string[] | null
    selfLine?: string | null
    relationshipLine?: string | null
    motiveLine?: string | null
    habitLine?: string | null
    inwardLine: string | null
    authoritySummary?: string | null
    closenessPosture?: string | null
    currentBodyState?: string | null
  }
type AlicizationRuntimeCurrentConsciousFrameDigest
  = NonNullable<SharedAlicizationRuntimeDigest['currentConsciousFrame']> & {
    selfContinuityAuthority?: AlicizationLocalSelfContinuityAuthority | null
  }
type AlicizationDigitalLifeSpineEmbodimentDigest
  = NonNullable<SharedAlicizationDigitalLifeSpineDigest['embodiment']> & {
    residentPerformance?: SharedAlicizationResidentPerformanceSnapshot | null
  }
type AlicizationLocalDigitalLifeLipSyncPlan
  = Omit<SharedAlicizationDigitalLifeLipSyncPlan, 'mode'> & {
    mode: SharedAlicizationDigitalLifeLipSyncPlan['mode'] | 'energy-phoneme-hybrid'
  }
type AlicizationLocalDigitalLifeFrame
  = Omit<SharedAlicizationDigitalLifeFrame, 'lipSync'> & {
    lipSync: AlicizationLocalDigitalLifeLipSyncPlan
  }
type AlicizationLocalEmbodimentCueSource = SharedAlicizationEmbodimentFaceCue['source'] | 'cue-bridge'
type AlicizationLocalEmbodimentFaceCue
  = Omit<SharedAlicizationEmbodimentFaceCue, 'source'> & {
    source: AlicizationLocalEmbodimentCueSource
  }
type AlicizationLocalEmbodimentMotionBurst
  = Omit<SharedAlicizationEmbodimentMotionBurst, 'source'> & {
    source: AlicizationLocalEmbodimentCueSource
  }
type AlicizationLocalEmbodimentLipSyncVisemeHint
  = Omit<SharedAlicizationEmbodimentLipSyncVisemeHint, 'source'> & {
    source: SharedAlicizationEmbodimentLipSyncVisemeHint['source'] | 'cue-bridge'
  }
type AlicizationLocalEmbodimentLipSyncPlan
  = Omit<SharedAlicizationEmbodimentLipSyncPlan, 'visemeHints'> & {
    visemeHints?: AlicizationLocalEmbodimentLipSyncVisemeHint[]
  }
type AlicizationLocalEmbodimentScriptState
  = Omit<SharedAlicizationEmbodimentScriptState, 'residentMode'> & {
    residentMode: SharedAlicizationEmbodimentScriptState['residentMode'] | 'quiet-accompaniment'
  }

export type AlicizationDigitalLifeSpineDigest
  = Omit<SharedAlicizationDigitalLifeSpineDigest, 'embodiment'> & {
    embodiment?: AlicizationDigitalLifeSpineEmbodimentDigest | null
  }

export type AlicizationDigitalLifeEnvelope = Omit<SharedAlicizationDigitalLifeEnvelope, 'lipSync' | 'frames'> & {
  lipSync: AlicizationLocalDigitalLifeLipSyncPlan
  frames: AlicizationLocalDigitalLifeFrame[]
  spine?: AlicizationDigitalLifeSpineDigest | null
}
export type AlicizationDigitalLifeSpineMemoryDigest = SharedAlicizationDigitalLifeSpineMemoryDigest
export type AlicizationDigitalLifeSpineMemoryClosureTrace = SharedAlicizationDigitalLifeSpineMemoryClosureTrace
export type AlicizationRuntimeDigest = Omit<SharedAlicizationRuntimeDigest, 'currentConsciousFrame'> & {
  currentConsciousFrame?: AlicizationRuntimeCurrentConsciousFrameDigest | null
  visibleReplyRealization?: AlicizationVisibleReplyRealizationArtifact | null
}
export type AlicizationDialogueSpeechTimeline = SharedAlicizationDialogueSpeechTimeline
export type AlicizationEmbodimentScriptV1
  = Omit<SharedAlicizationEmbodimentScriptV1, 'state' | 'facePlan' | 'motionPlan' | 'lipsyncPlan'> & {
    state: AlicizationLocalEmbodimentScriptState
    facePlan: Omit<SharedAlicizationEmbodimentScriptV1['facePlan'], 'speakingCues'> & {
      speakingCues: AlicizationLocalEmbodimentFaceCue[]
    }
    motionPlan: Omit<SharedAlicizationEmbodimentScriptV1['motionPlan'], 'actionBursts'> & {
      actionBursts: AlicizationLocalEmbodimentMotionBurst[]
    }
    lipsyncPlan: AlicizationLocalEmbodimentLipSyncPlan
  }
export type AlicizationResidentPerformanceSnapshot = SharedAlicizationResidentPerformanceSnapshot
export type CharacterFacialCapability = SharedCharacterFacialCapability
export type CharacterActionCapability = SharedCharacterActionCapability
export type CharacterPerformanceEmbodimentHints = SharedCharacterPerformanceEmbodimentHints
export type CharacterPerformanceCapabilitiesManifest = SharedCharacterPerformanceCapabilitiesManifest
export type AlicizationPerformanceManifestClampResult = SharedAlicizationPerformanceManifestClampResult

export const normalizeAlicizationEmotion = sharedNormalizeAlicizationEmotion
export const normalizeAlicizationPerformanceDelivery = sharedNormalizeAlicizationPerformanceDelivery
export const normalizeAlicizationPerformancePayload = sharedNormalizeAlicizationPerformancePayload
export const clampAlicizationPerformancePayloadToManifest = sharedClampAlicizationPerformancePayloadToManifest

export type AlicizationDialogueStructuredPayload
  = SharedAlicizationDialogueStructuredPayload & {
    parsePath?: string | null
    contractFailed?: boolean
    visibleReplyRealization?: AlicizationVisibleReplyRealizationArtifact | null
    digitalLife?: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
    derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
    memoryStageReplay?: AlicizationOrganicMemoryStageReplay | null
    memoryResolutionLedger?: AlicizationMemoryResolutionLedger | null
    runtimeDigest?: AlicizationRuntimeDigest | null
  }

export interface AlicizationDialogueRespondedPayload extends Omit<SharedAlicizationDialogueRespondedPayload, 'structured'> {
  structured: AlicizationDialogueStructuredPayload
}

export interface AlicizationSetActiveSessionPayload extends AlicizationCardScope {
  sessionId: string
}

export interface AlicizationSubconsciousNeedsState {
  boredom: number
  loneliness: number
  fatigue: number
  lastTickAt: number
  lastInteractionAt: number
  lastSavedAt: number
}

export interface AlicizationSubconsciousStatePayload extends AlicizationCardScope, AlicizationSubconsciousNeedsState {
  updatedAt: number
}

export interface AlicizationSubconsciousTickResult {
  processedCards: string[]
  proactiveTriggered: string[]
  suppressedCards: string[]
}

export interface AlicizationDreamRunResult {
  processedCards: string[]
  skippedCards: Array<{ cardId: string, reason: string }>
}

export interface AlicizationSubconsciousForceDreamPayload extends Partial<AlicizationCardScope> {
  reason?: string
}

export interface AlicizationChatToolCallInput {
  cardId: string
  turnId: string
  toolCallId: string
  toolName: string
  selectedChannel?: SharedAlicizationExecutionChannel | null
  arguments?: Record<string, unknown>
}

export interface AlicizationChatToolCallEvent extends AlicizationChatToolCallInput {
  selectedChannel: SharedAlicizationExecutionChannel | null
  projection: SharedAlicizationRuntimeToolProjectionUpdate
}

export interface AlicizationChatToolResultInput {
  cardId: string
  turnId: string
  toolCallId: string
  toolName?: string
  selectedChannel?: SharedAlicizationExecutionChannel | null
  phase?: 'started' | 'running' | 'completed' | 'failed' | 'dead-lettered' | 'cancelled' | 'timeout'
  result?: unknown
}

export interface AlicizationChatToolResultEvent extends AlicizationChatToolResultInput {
  selectedChannel: SharedAlicizationExecutionChannel | null
  projection: SharedAlicizationRuntimeToolProjectionUpdate
}

export interface AlicizationChatToolProgressInput {
  cardId: string
  turnId: string
  toolCallId: string
  toolName: string
  selectedChannel?: SharedAlicizationExecutionChannel | null
  signal?: 'liveness' | 'semantic-progress' | 'terminal'
  phase: 'started' | 'running' | 'completed' | 'failed' | 'dead-lettered' | 'cancelled' | 'timeout'
  elapsedMs: number
  timeoutMs?: number
  errorCode?: string
  errorMessage?: string
  occurredAt?: number
  eventId?: string
  threadId?: string
  adapterEventType?: string
  itemType?: string
  summary?: string
  command?: string
  commandStatus?: string
  commandExitCode?: number
  outputPreview?: string
}

export interface AlicizationChatToolProgressEvent extends AlicizationChatToolProgressInput {
  selectedChannel: SharedAlicizationExecutionChannel | null
  projection: SharedAlicizationRuntimeToolProjectionUpdate
}

export interface AlicizationChatStreamChunkEvent {
  cardId: string
  turnId: string
  text: string
  origin?: SharedAlicizationVisibleArtifactOrigin
  learningPolicy?: SharedAlicizationVisibleArtifactLearningPolicy
  failureSurface?: SharedAlicizationChatFailureSurface | null
}

export type AlicizationVisibleReplyPlannedExecutionMode = 'provider-stream' | 'provider-one-shot'
export type AlicizationVisibleReplyExecutionMode = AlicizationVisibleReplyPlannedExecutionMode | 'local-fallback'

export interface AlicizationVisibleReplyExecution {
  mode: AlicizationVisibleReplyExecutionMode
  expectedVisibleReplyAuthority: AlicizationNormalVisibleReplyAuthority | null
  actualVisibleReplyAuthority: AlicizationVisibleReplyExecutionAuthority | null
  providerMindExecuted: boolean
  reason: string | null
}

export type AlicizationVisibleReplyRealizationArtifact
  = SharedAlicizationVisibleReplyRealizationTransportArtifact

export interface AlicizationChatMetaEvent {
  cardId: string
  turnId: string
  governance: AlicizationMindTurnGovernance | null
  visibleReplyExecution?: AlicizationVisibleReplyExecution | null
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  embodimentScript?: AlicizationEmbodimentScriptV1 | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  runtimeDigest?: AlicizationRuntimeDigest | null
}

export interface AlicizationVisibleReplyPublicCriticSummary extends Record<string, unknown> {
  version: 'visible-reply-critic-public-summary-v1'
  status: 'pass' | 'blocked'
  providerMindRequired: boolean
  reasonCodes: string[]
}

export interface AlicizationVisibleReplyPublicClosureSummary extends Record<string, unknown> {
  version: 'visible-reply-closure-public-summary-v1'
  status: 'approved' | 'blocked'
  reasonCodes: string[]
  initialCriticStatus: 'pass' | 'blocked' | null
  finalCriticStatus: 'pass' | 'blocked' | null
}

export interface AlicizationChatFinishEvent {
  cardId: string
  turnId: string
  status: 'completed' | 'aborted' | 'timed-out' | 'failed'
  origin?: SharedAlicizationVisibleArtifactOrigin
  learningPolicy?: SharedAlicizationVisibleArtifactLearningPolicy
  failureSurface?: SharedAlicizationChatFailureSurface | null
  memoryFailures?: SharedAlicizationChatMemoryFailureSurface[]
  visibleReplyExecution?: AlicizationVisibleReplyExecution | null
  visibleReplyRealization?: AlicizationVisibleReplyRealizationArtifact | null
  visibleReplyCritic?: AlicizationVisibleReplyPublicCriticSummary | null
  visibleReplyClosure?: AlicizationVisibleReplyPublicClosureSummary | null
  finishReason?: string
  fullText?: string
  error?: string
}

export interface AlicizationChatErrorEvent {
  cardId: string
  turnId: string
  error: string
  origin?: SharedAlicizationVisibleArtifactOrigin
  learningPolicy?: SharedAlicizationVisibleArtifactLearningPolicy
  failureSurface?: SharedAlicizationChatFailureSurface | null
}

export const alicizationChatStreamDispatchChannel = 'alicization:chat-stream-dispatch'

export type AlicizationChatStreamDispatchPayload
  = | { eventType: 'meta', body: AlicizationChatMetaEvent }
    | { eventType: 'chunk', body: AlicizationChatStreamChunkEvent }
    | { eventType: 'tool-call', body: AlicizationChatToolCallEvent }
    | { eventType: 'tool-result', body: AlicizationChatToolResultEvent }
    | { eventType: 'tool-progress', body: AlicizationChatToolProgressEvent }
    | { eventType: 'finish', body: AlicizationChatFinishEvent }
    | { eventType: 'error', body: AlicizationChatErrorEvent }
    | { eventType: 'dialogue-responded', body: AlicizationDialogueRespondedPayload }

export interface AlicizationChatStartPayload extends AlicizationCardScope {
  turnId: string
  providerId: string
  model: string
  providerConfig: Record<string, unknown>
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: unknown
    toolCallId?: string
    toolName?: string
  }>
  supportsTools?: boolean
  waitForTools?: boolean
  providerToolCapabilityObservation?: SharedAlicizationProviderToolCapabilityObservation
  dialogueReplyFeedback?: SharedAlicizationDialogueReplyFeedbackFact
}

export type AlicizationMindTurnGovernance = SharedAlicizationMindTurnGovernance

export interface AlicizationChatStartResult {
  accepted: boolean
  turnId: string
  state?: 'accepted' | 'duplicate-running' | 'duplicate-finished' | 'missing-config' | 'start-failed'
  reason?: string
  governance?: AlicizationMindTurnGovernance | null
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  embodimentScript?: AlicizationEmbodimentScriptV1 | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  runtimeDigest?: AlicizationRuntimeDigest | null
}

export interface AlicizationChatAbortPayload extends AlicizationCardScope {
  turnId: string
  reason?: string
  timeout?: SharedAlicizationChatTimeoutDescriptor
}

export interface AlicizationChatAbortResult {
  accepted: boolean
  state: 'aborted' | 'not-found' | 'finished'
}

export interface AlicizationReminderSchedulePayload extends AlicizationCardScope {
  minutes: number
  message: string
  sourceTurnId?: string
}

export interface AlicizationReminderScheduleResult {
  status: 'scheduled' | 'error'
  taskId?: string
  triggerTime?: string
  triggerAt?: number
  message?: string
  code?: string
}

export interface AlicizationLlmConfigPayload {
  activeProviderId: string
  activeModelId: string
  providerCredentials: Record<string, Record<string, unknown>>
}

export type AlicizationToolRiskLevel = 'safe' | 'sensitive' | 'danger'
export type AlicizationToolActionCategory = 'read' | 'write' | 'delete' | 'execute' | 'network' | 'unknown'

export interface AlicizationSafetyPermissionRequest {
  cardId: string
  requestId: string
  token: string
  riskLevel: AlicizationToolRiskLevel
  actionCategory: AlicizationToolActionCategory
  serverName: string
  toolName: string
  reason: string
  resourceLabel?: string
  argumentsSummary?: {
    kind: string
    keyCount?: number
    keys?: string[]
  }
  timeoutMs: number
  createdAt: number
  supportsRememberSession: boolean
}

export interface AlicizationSafetyPermissionDecision {
  cardId?: string
  token: string
  requestId: string
  allow: boolean
  rememberSession?: boolean
  reason?: string
}

export interface AlicizationSafetyPermissionDecisionResult {
  accepted: boolean
  reason?: string
}

export const electronAlicizationBootstrap = defineInvokeEventa<AlicizationSoulSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:bootstrap')
export const electronAlicizationGetSoul = defineInvokeEventa<AlicizationSoulSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:get-soul')
export const electronAlicizationInitializeGenesis = defineInvokeEventa<AlicizationInitializeGenesisResult, AlicizationCardScope & AlicizationGenesisInput>('eventa:invoke:electron:alicization:initialize-genesis')
export const electronAlicizationUpdateSoul = defineInvokeEventa<AlicizationSoulSnapshot, AlicizationCardScope & AlicizationSoulUpdatePayload>('eventa:invoke:electron:alicization:update-soul')
export const electronAlicizationUpdatePersonality = defineInvokeEventa<AlicizationSoulSnapshot, AlicizationCardScope & AlicizationPersonalityUpdatePayload>('eventa:invoke:electron:alicization:update-personality')
export const electronAlicizationKillSwitchGetState = defineInvokeEventa<AlicizationKillSwitchSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:kill-switch:get-state')
export const electronAlicizationKillSwitchSuspend = defineInvokeEventa<AlicizationKillSwitchSnapshot, AlicizationCardScope & { reason?: string }>('eventa:invoke:electron:alicization:kill-switch:suspend')
export const electronAlicizationKillSwitchResume = defineInvokeEventa<AlicizationKillSwitchSnapshot, AlicizationCardScope & { reason?: string }>('eventa:invoke:electron:alicization:kill-switch:resume')
export const electronAlicizationGetMemoryStats = defineInvokeEventa<AlicizationMemoryStats, AlicizationCardScope>('eventa:invoke:electron:alicization:memory:get-stats')
export const electronAlicizationRunMemoryPrune = defineInvokeEventa<AlicizationMemoryStats, AlicizationCardScope>('eventa:invoke:electron:alicization:memory:run-prune')
export const electronAlicizationUpdateMemoryStats = defineInvokeEventa<AlicizationMemoryStats, AlicizationCardScope & AlicizationMemoryStats>('eventa:invoke:electron:alicization:memory:update-stats')
export const electronAlicizationMemoryRetrieveFacts = defineInvokeEventa<AlicizationMemoryFact[], AlicizationCardScope & { query: string, limit?: number }>('eventa:invoke:electron:alicization:memory:retrieve-facts')
export const electronAlicizationMemoryUpsertFacts = defineInvokeEventa<void, AlicizationMemoryUpsertFactsPayload>('eventa:invoke:electron:alicization:memory:upsert-facts')
export const electronAlicizationMemoryImportLegacy = defineInvokeEventa<AlicizationMemoryMigrationResult, AlicizationCardScope & AlicizationMemoryLegacySnapshot>('eventa:invoke:electron:alicization:memory:import-legacy')
export const electronAlicizationGetOrganicMemorySnapshot = defineInvokeEventa<AlicizationOrganicMemorySnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:memory:get-organic-snapshot')
export const electronAlicizationMemoryWorkbenchGetSnapshot = defineInvokeEventa<AlicizationMemoryWorkbenchSnapshot, AlicizationMemoryWorkbenchSnapshotPayload>('eventa:invoke:electron:alicization:memory-workbench:get-snapshot')
export const electronAlicizationMemoryWorkbenchListLongTerm = defineInvokeEventa<AlicizationMemoryWorkbenchListResult, AlicizationMemoryWorkbenchListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-long-term')
export const electronAlicizationMemoryWorkbenchListTombstones = defineInvokeEventa<AlicizationMemoryWorkbenchTombstoneListResult, AlicizationMemoryWorkbenchTombstoneListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-tombstones')
export const electronAlicizationMemoryWorkbenchRestoreTombstone = defineInvokeEventa<AlicizationMemoryWorkbenchTombstoneRestoreResult, AlicizationMemoryWorkbenchTombstoneRestorePayload>('eventa:invoke:electron:alicization:memory-workbench:restore-tombstone')
export const electronAlicizationMemoryWorkbenchListReview = defineInvokeEventa<AlicizationMemoryWorkbenchReviewListResult, AlicizationMemoryWorkbenchReviewListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-review')
export const electronAlicizationMemoryWorkbenchApplyLongTermAction = defineInvokeEventa<AlicizationMemoryWorkbenchItem | null, AlicizationMemoryLongTermActionPayload>('eventa:invoke:electron:alicization:memory-workbench:apply-long-term-action')
export const electronAlicizationMemoryWorkbenchManageWorkingMemoryCleaningQueue = defineInvokeEventa<AlicizationWorkingMemoryCleaningQueueResult, AlicizationWorkingMemoryCleaningQueuePayload>('eventa:invoke:electron:alicization:memory-workbench:working-memory-cleaning-queue')
export const electronAlicizationMemoryWorkbenchApplyReviewAction = defineInvokeEventa<AlicizationLongTermMemoryReviewItem | null, AlicizationMemoryReviewActionPayload>('eventa:invoke:electron:alicization:memory-workbench:apply-review-action')
export const electronAlicizationMemoryWorkbenchRecallProbe = defineInvokeEventa<AlicizationMemoryRecallProbeResult, AlicizationMemoryRecallProbePayload>('eventa:invoke:electron:alicization:memory-workbench:recall-probe')
export const electronAlicizationMemoryWorkbenchListPersonaCandidates = defineInvokeEventa<AlicizationPersonaCandidateListResult, AlicizationPersonaCandidateListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-persona-candidates')
export const electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction = defineInvokeEventa<AlicizationPersonaCandidateWorkbenchItem | null, AlicizationPersonaCandidateActionPayload>('eventa:invoke:electron:alicization:memory-workbench:apply-persona-candidate-action')
export const electronAlicizationMemoryWorkbenchGetPersonaTrainingDataset = defineInvokeEventa<AlicizationPersonaTrainingDatasetSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:memory-workbench:get-persona-training-dataset')
export const electronAlicizationMemoryWorkbenchStagePersonaTrainingDataset = defineInvokeEventa<AlicizationPersonaTrainingDatasetVersion, AlicizationPersonaTrainingDatasetStagePayload>('eventa:invoke:electron:alicization:memory-workbench:stage-persona-training-dataset')
export const electronAlicizationMemoryWorkbenchExportPersonaTrainingDataset = defineInvokeEventa<AlicizationPersonaTrainingDatasetExportResult, AlicizationPersonaTrainingDatasetVersionPayload>('eventa:invoke:electron:alicization:memory-workbench:export-persona-training-dataset')
export const electronAlicizationMemoryWorkbenchActivatePersonaTrainingDataset = defineInvokeEventa<AlicizationPersonaTrainingDatasetVersion | null, Required<AlicizationPersonaTrainingDatasetVersionPayload>>('eventa:invoke:electron:alicization:memory-workbench:activate-persona-training-dataset')
export const electronAlicizationMemoryWorkbenchRollbackPersonaTrainingDataset = defineInvokeEventa<AlicizationPersonaTrainingDatasetVersion | null, Required<AlicizationPersonaTrainingDatasetVersionPayload>>('eventa:invoke:electron:alicization:memory-workbench:rollback-persona-training-dataset')
export const electronAlicizationMemoryWorkbenchSetPersonaTrainingDatasetExamplePolicy = defineInvokeEventa<AlicizationPersonaTrainingDatasetExample | null, AlicizationPersonaTrainingDatasetExamplePolicyPayload>('eventa:invoke:electron:alicization:memory-workbench:set-persona-training-dataset-example-policy')
export const electronAlicizationMemoryWorkbenchRevokePersonaTrainingDatasetSource = defineInvokeEventa<{ affected: number }, AlicizationPersonaTrainingDatasetRevokePayload>('eventa:invoke:electron:alicization:memory-workbench:revoke-persona-training-dataset-source')
export const electronAlicizationMemoryWorkbenchListPersonaTrainingSourceRevokeIntents = defineInvokeEventa<AlicizationPersonaTrainingSourceRevokeIntentResult, AlicizationPersonaTrainingSourceRevokeIntentListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-persona-training-source-revoke-intents')
export const electronAlicizationMemoryWorkbenchRetryPersonaTrainingSourceRevokeIntent = defineInvokeEventa<AlicizationPersonaTrainingSourceRevokeIntentResult, AlicizationPersonaTrainingSourceRevokeIntentRetryPayload>('eventa:invoke:electron:alicization:memory-workbench:retry-persona-training-source-revoke-intent')
export const electronAlicizationMemoryWorkbenchRunPersonaTraining = defineInvokeEventa<AlicizationPersonaTrainingStartResult, AlicizationPersonaTrainingRunPayload>('eventa:invoke:electron:alicization:memory-workbench:run-persona-training')
export const electronAlicizationMemoryWorkbenchGetPersonaTrainingRun = defineInvokeEventa<AlicizationPersonaTrainingPipelineRunRecord | null, AlicizationPersonaTrainingRunLookupPayload>('eventa:invoke:electron:alicization:memory-workbench:get-persona-training-run')
export const electronAlicizationMemoryWorkbenchListPersonaTrainingRuns = defineInvokeEventa<AlicizationPersonaTrainingRunsResult, AlicizationCardScope & { limit?: number }>('eventa:invoke:electron:alicization:memory-workbench:list-persona-training-runs')
export const electronAlicizationMemoryWorkbenchCancelPersonaTraining = defineInvokeEventa<AlicizationPersonaTrainingPipelineRunRecord | null, AlicizationPersonaTrainingCancelPayload>('eventa:invoke:electron:alicization:memory-workbench:cancel-persona-training')
export const electronAlicizationMemoryWorkbenchGetPersonaTrainingExecutorConfig = defineInvokeEventa<AlicizationPersonaTrainingExecutorConfigState, AlicizationCardScope>('eventa:invoke:electron:alicization:memory-workbench:get-persona-training-executor-config')
export const electronAlicizationMemoryWorkbenchSetPersonaTrainingExecutorConfig = defineInvokeEventa<AlicizationPersonaTrainingExecutorConfigState, AlicizationPersonaTrainingExecutorConfigPayload>('eventa:invoke:electron:alicization:memory-workbench:set-persona-training-executor-config')
export const electronAlicizationMemoryWorkbenchTestPersonaTrainingExecutor = defineInvokeEventa<AlicizationPersonaTrainingExecutorConnectionResult, AlicizationPersonaTrainingExecutorConfigPayload>('eventa:invoke:electron:alicization:memory-workbench:test-persona-training-executor')
export const electronAlicizationMemoryWorkbenchGetPersonaRuntimeConfig = defineInvokeEventa<AlicizationPersonaRuntimeConfigState, AlicizationCardScope>('eventa:invoke:electron:alicization:memory-workbench:get-persona-runtime-config')
export const electronAlicizationMemoryWorkbenchSetPersonaRuntimeConfig = defineInvokeEventa<AlicizationPersonaRuntimeConfigState, AlicizationPersonaRuntimeConfigPayload>('eventa:invoke:electron:alicization:memory-workbench:set-persona-runtime-config')
export const electronAlicizationMemoryWorkbenchTestPersonaRuntime = defineInvokeEventa<AlicizationPersonaRuntimeConnectionResult, AlicizationPersonaRuntimeConfigPayload>('eventa:invoke:electron:alicization:memory-workbench:test-persona-runtime')
export const electronAlicizationMemoryWorkbenchRollbackPersonaTrainingIncrement = defineInvokeEventa<AlicizationPersonaTrainingPipelineIncrement | null, AlicizationPersonaTrainingIncrementPayload>('eventa:invoke:electron:alicization:memory-workbench:rollback-persona-training-increment')
export const electronAlicizationMemoryWorkbenchListPersonaTrainingIncrements = defineInvokeEventa<AlicizationPersonaTrainingIncrementsResult, AlicizationCardScope>('eventa:invoke:electron:alicization:memory-workbench:list-persona-training-increments')
export const electronAlicizationSkillWorkbenchList = defineInvokeEventa<AlicizationSkillWorkbenchListResult, AlicizationSkillWorkbenchListPayload>('eventa:invoke:electron:alicization:skill-workbench:list')
export const electronAlicizationSkillWorkbenchActivate = defineInvokeEventa<AlicizationSkillWorkbenchItem, AlicizationSkillWorkbenchLifecyclePayload>('eventa:invoke:electron:alicization:skill-workbench:activate')
export const electronAlicizationSkillWorkbenchRollback = defineInvokeEventa<AlicizationSkillWorkbenchItem, AlicizationSkillWorkbenchLifecyclePayload>('eventa:invoke:electron:alicization:skill-workbench:rollback')
export const electronAlicizationSkillWorkbenchRevoke = defineInvokeEventa<AlicizationSkillWorkbenchItem, AlicizationSkillWorkbenchLifecyclePayload>('eventa:invoke:electron:alicization:skill-workbench:revoke')
export const electronAlicizationMemoryWorkbenchManageSemanticScaleJobs = defineInvokeEventa<AlicizationMemorySemanticScaleJobResult, AlicizationMemorySemanticScaleJobPayload>('eventa:invoke:electron:alicization:memory-workbench:semantic-scale-jobs')
export const electronAlicizationMemoryWorkbenchReindexEmbeddings = defineInvokeEventa<AlicizationMemoryEmbeddingReindexResult, AlicizationMemoryEmbeddingReindexPayload>('eventa:invoke:electron:alicization:memory-workbench:reindex-embeddings')
export const electronAlicizationMemoryWorkbenchListEmbeddingModels = defineInvokeEventa<AlicizationMemoryEmbeddingModelListResult, AlicizationMemoryEmbeddingModelListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-embedding-models')
export const electronAlicizationMemoryWorkbenchTestEmbeddingConnection = defineInvokeEventa<AlicizationMemoryEmbeddingConnectionTestResult, AlicizationMemoryEmbeddingConnectionTestPayload>('eventa:invoke:electron:alicization:memory-workbench:test-embedding-connection')
export const electronAlicizationMemoryWorkbenchListReplaySessions = defineInvokeEventa<AlicizationMemoryReplaySessionListResult, AlicizationMemoryReplaySessionListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-replay-sessions')
export const electronAlicizationMemoryWorkbenchRunQualityTrial = defineInvokeEventa<AlicizationMemoryQualityTrialReportSurface, AlicizationMemoryQualityTrialPayload>('eventa:invoke:electron:alicization:memory-workbench:run-quality-trial')
export const electronAlicizationMemoryWorkbenchCancelQualityTrial = defineInvokeEventa<AlicizationMemoryQualityTrialCancelResult, AlicizationMemoryQualityTrialCancelPayload>('eventa:invoke:electron:alicization:memory-workbench:cancel-quality-trial')
export const electronAlicizationMemoryWorkbenchListQualityTrialReports = defineInvokeEventa<AlicizationMemoryQualityTrialReportSurfaceListResult, AlicizationMemoryQualityTrialReportListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-quality-trial-reports')
export const electronAlicizationMemoryWorkbenchRecordQualityGoldLabel = defineInvokeEventa<AlicizationMemoryQualityGoldLabelItem, AlicizationMemoryQualityGoldLabelPayload>('eventa:invoke:electron:alicization:memory-workbench:record-quality-gold-label')
export const electronAlicizationMemoryWorkbenchListQualityGoldLabels = defineInvokeEventa<AlicizationMemoryQualityGoldLabelListResult, AlicizationMemoryQualityGoldLabelListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-quality-gold-labels')
export const electronAlicizationMemoryWorkbenchBuildMonthlyGoldRegression = defineInvokeEventa<AlicizationMemoryQualityMonthlyGoldRegressionPack, AlicizationMemoryQualityMonthlyGoldRegressionPayload>('eventa:invoke:electron:alicization:memory-workbench:build-monthly-gold-regression')
export const electronAlicizationSearchOrganicSubconsciousFragments = defineInvokeEventa<AlicizationSubconsciousFragment[], AlicizationCardScope & { query: string, limit?: number }>('eventa:invoke:electron:alicization:memory:search-subconscious-fragments')
export const electronAlicizationGetPerformanceManifest = defineInvokeEventa<CharacterPerformanceCapabilitiesManifest | null, AlicizationCardScope>('eventa:invoke:electron:alicization:performance:get-manifest')
export const electronAlicizationSetPerformanceManifest = defineInvokeEventa<void, AlicizationCardScope & { manifest: CharacterPerformanceCapabilitiesManifest | null }>('eventa:invoke:electron:alicization:performance:set-manifest')
export const electronAlicizationAppendConversationTurn = defineInvokeEventa<void, AlicizationCardScope & AlicizationConversationTurnInput>('eventa:invoke:electron:alicization:conversation:append-turn')
export const electronAlicizationListConversationTurns = defineInvokeEventa<AlicizationConversationTurnRecord[], AlicizationListConversationTurnsPayload>('eventa:invoke:electron:alicization:conversation:list-turns')
export const electronAlicizationListTurnToolProjections = defineInvokeEventa<AlicizationTurnToolProjectionReplayRecord[], AlicizationListTurnToolProjectionsPayload>('eventa:invoke:electron:alicization:conversation:list-tool-projections')
export const electronAlicizationListMindTurnEvents = defineInvokeEventa<AlicizationMindTurnEventRecord[], AlicizationListMindTurnEventsPayload>('eventa:invoke:electron:alicization:conversation:list-mind-turn-events')
export const electronAlicizationListLearningArtifactLedger = defineInvokeEventa<AlicizationLearningArtifactLedgerRecord[], AlicizationListLearningArtifactLedgerPayload>('eventa:invoke:electron:alicization:conversation:list-learning-artifact-ledger')
export const electronAlicizationListMemoryDecisionTraces = defineInvokeEventa<AlicizationMemoryDecisionTraceRecord[], AlicizationListMemoryDecisionTracesPayload>('eventa:invoke:electron:alicization:conversation:list-memory-decision-traces')
export const electronAlicizationListPersonStateUpdates = defineInvokeEventa<AlicizationPersonStateUpdateRecord[], AlicizationListPersonStateUpdatesPayload>('eventa:invoke:electron:alicization:conversation:list-person-state-updates')
export const electronAlicizationListHumanlikeMemoryAudit = defineInvokeEventa<AlicizationHumanlikeMemoryAuditEntry[], AlicizationListHumanlikeMemoryAuditPayload>('eventa:invoke:electron:alicization:conversation:list-humanlike-memory-audit')
export const electronAlicizationCorrectHumanlikeMemoryAudit = defineInvokeEventa<AlicizationHumanlikeMemoryCorrectionRecord, AlicizationCorrectHumanlikeMemoryAuditPayload>('eventa:invoke:electron:alicization:conversation:correct-humanlike-memory-audit')
export const electronAlicizationGetSelfEvolutionState = defineInvokeEventa<AlicizationSelfEvolutionVersionRuntimeSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:conversation:get-self-evolution-state')
export const electronAlicizationRunReplayBenchmark = defineInvokeEventa<AlicizationRunReplayBenchmarkResult, AlicizationRunReplayBenchmarkPayload>('eventa:invoke:electron:alicization:conversation:run-replay-benchmark')
export const electronAlicizationUpsertTaskThread = defineInvokeEventa<AlicizationTaskThreadRecord, AlicizationUpsertTaskThreadPayload>('eventa:invoke:electron:alicization:executor:upsert-task-thread')
export const electronAlicizationListTaskThreads = defineInvokeEventa<AlicizationTaskThreadRecord[], AlicizationListTaskThreadsPayload>('eventa:invoke:electron:alicization:executor:list-task-threads')
export const electronAlicizationUpsertChannelCapabilityManifest = defineInvokeEventa<AlicizationChannelCapabilityManifestRecord, AlicizationUpsertChannelCapabilityManifestPayload>('eventa:invoke:electron:alicization:executor:upsert-capability-manifest')
export const electronAlicizationListChannelCapabilityManifests = defineInvokeEventa<AlicizationChannelCapabilityManifestRecord[], AlicizationListChannelCapabilityManifestsPayload>('eventa:invoke:electron:alicization:executor:list-capability-manifests')
export const electronAlicizationUpsertExecutorSession = defineInvokeEventa<AlicizationExecutorSessionRecord, AlicizationUpsertExecutorSessionPayload>('eventa:invoke:electron:alicization:executor:upsert-session')
export const electronAlicizationListExecutorSessions = defineInvokeEventa<AlicizationExecutorSessionRecord[], AlicizationListExecutorSessionsPayload>('eventa:invoke:electron:alicization:executor:list-sessions')
export const electronAlicizationAppendExecutionEvents = defineInvokeEventa<void, AlicizationAppendExecutionEventsPayload>('eventa:invoke:electron:alicization:executor:append-events')
export const electronAlicizationListExecutionEvents = defineInvokeEventa<AlicizationExecutionEventRecord[], AlicizationListExecutionEventsPayload>('eventa:invoke:electron:alicization:executor:list-events')
export const electronAlicizationPlanTaskThread = defineInvokeEventa<AlicizationPlanTaskThreadResult, AlicizationPlanTaskThreadPayload>('eventa:invoke:electron:alicization:executor:plan-task-thread')
export const electronAlicizationDispatchTaskThread = defineInvokeEventa<AlicizationDispatchTaskThreadResult, AlicizationDispatchTaskThreadPayload>('eventa:invoke:electron:alicization:executor:dispatch-task-thread')
export const electronAlicizationResumeTaskThread = defineInvokeEventa<AlicizationResumeTaskThreadResult, AlicizationCardScope & AlicizationResumeTaskThreadInput>('eventa:invoke:electron:alicization:executor:resume-task-thread')
export const electronAlicizationAckDialogue = defineInvokeEventa<void, AlicizationDialogueAckPayload>('eventa:invoke:electron:alicization:conversation:ack-dialogue')
export const electronAlicizationReportProactiveFeedback = defineInvokeEventa<void, AlicizationProactiveFeedbackPayload>('eventa:invoke:electron:alicization:conversation:report-proactive-feedback')
export const electronAlicizationReplayDialogues = defineInvokeEventa<AlicizationDialogueRespondedPayload[], AlicizationReplayDialoguesPayload>('eventa:invoke:electron:alicization:conversation:replay-dialogues')
export const electronAlicizationGetVisualPresenceState = defineInvokeEventa<AlicizationVisualPresenceStateSnapshot | null, AlicizationCardScope>('eventa:invoke:electron:alicization:visual-presence:get-state')
export const electronAlicizationClearAllConversations = defineInvokeEventa<void>('eventa:invoke:electron:alicization:conversation:clear-all')
export const electronAlicizationSetActiveSession = defineInvokeEventa<void, AlicizationSetActiveSessionPayload>('eventa:invoke:electron:alicization:conversation:set-active-session')
export const electronAlicizationAppendAuditLog = defineInvokeEventa<void, AlicizationCardScope & AlicizationAuditLogInput>('eventa:invoke:electron:alicization:audit:append')
export const electronAlicizationRealtimeExecute = defineInvokeEventa<AlicizationRealtimeExecuteResult, AlicizationCardScope & AlicizationRealtimeExecutePayload>('eventa:invoke:electron:alicization:realtime:execute')
export const electronAlicizationGetSensorySnapshot = defineInvokeEventa<AlicizationSensoryCacheSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:sensory:get-snapshot')
export const electronAlicizationSafetyResolvePermission = defineInvokeEventa<AlicizationSafetyPermissionDecisionResult, AlicizationSafetyPermissionDecision>('eventa:invoke:electron:alicization:safety:resolve-permission')
export const electronAlicizationDeleteCardScope = defineInvokeEventa<void, AlicizationCardScope>('eventa:invoke:electron:alicization:delete-card-scope')
export const electronAlicizationDeleteAllData = defineInvokeEventa<void>('eventa:invoke:electron:alicization:delete-all-data')
export const electronAlicizationSubconsciousGetState = defineInvokeEventa<AlicizationSubconsciousStatePayload, AlicizationCardScope>('eventa:invoke:electron:alicization:subconscious:get-state')
export const electronAlicizationSubconsciousForceTick = defineInvokeEventa<AlicizationSubconsciousTickResult, AlicizationCardScope>('eventa:invoke:electron:alicization:subconscious:force-tick')
export const electronAlicizationSubconsciousForceDream = defineInvokeEventa<AlicizationDreamRunResult, AlicizationSubconsciousForceDreamPayload>('eventa:invoke:electron:alicization:subconscious:force-dream')
export const electronAlicizationLlmSyncConfig = defineInvokeEventa<void, AlicizationLlmConfigPayload>('eventa:invoke:electron:alicization:llm:sync-config')
export const electronAlicizationLlmGetConfig = defineInvokeEventa<AlicizationLlmConfigPayload>('eventa:invoke:electron:alicization:llm:get-config')
export const electronAlicizationChatStart = defineInvokeEventa<AlicizationChatStartResult, AlicizationChatStartPayload>('eventa:invoke:electron:alicization:chat:start')
export const electronAlicizationChatAbort = defineInvokeEventa<AlicizationChatAbortResult, AlicizationChatAbortPayload>('eventa:invoke:electron:alicization:chat:abort')
export const electronAlicizationReminderSchedule = defineInvokeEventa<AlicizationReminderScheduleResult, AlicizationReminderSchedulePayload>('eventa:invoke:electron:alicization:reminder:schedule')
export const alicizationChatStartInvokeChannel = 'alicization:chat-start'
export const alicizationChatAbortInvokeChannel = 'alicization:chat-abort'

export const alicizationRuntimeEvent = defineEventa<SharedAlicizationRuntimeEventEnvelope>('eventa:event:electron:alicization:runtime:event')
export const alicizationKillSwitchStateChanged = defineEventa<AlicizationCardScope & AlicizationKillSwitchSnapshot>('eventa:event:electron:alicization:kill-switch:state-changed')
export const alicizationSoulChanged = defineEventa<AlicizationCardScope & AlicizationSoulSnapshot>('eventa:event:electron:alicization:soul:changed')
export const alicizationDialogueResponded = defineEventa<AlicizationDialogueRespondedPayload>('eventa:event:electron:alicization:dialogue:responded')
export const electronAlicizationVisualPresenceChanged = defineEventa<AlicizationPresencePulsePayload>('eventa:event:electron:alicization:visual-presence:changed')
export const electronAlicizationVisualPresenceStateChanged = defineEventa<AlicizationVisualPresenceStateChangedPayload>('eventa:event:electron:alicization:visual-presence:state-changed')
export const alicizationSafetyPermissionRequested = defineEventa<AlicizationSafetyPermissionRequest>('eventa:event:electron:alicization:safety:permission-requested')
export const alicizationChatStreamChunk = defineEventa<AlicizationChatStreamChunkEvent>('eventa:event:electron:alicization:chat:stream-chunk')
export const alicizationChatStreamMeta = defineEventa<AlicizationChatMetaEvent>('eventa:event:electron:alicization:chat:stream-meta')
export const alicizationChatStreamToolCall = defineEventa<AlicizationChatToolCallEvent>('eventa:event:electron:alicization:chat:stream-tool-call')
export const alicizationChatStreamToolResult = defineEventa<AlicizationChatToolResultEvent>('eventa:event:electron:alicization:chat:stream-tool-result')
export const alicizationChatStreamToolProgress = defineEventa<AlicizationChatToolProgressEvent>('eventa:event:electron:alicization:chat:stream-tool-progress')
export const alicizationChatStreamFinish = defineEventa<AlicizationChatFinishEvent>('eventa:event:electron:alicization:chat:stream-finish')
export const alicizationChatStreamError = defineEventa<AlicizationChatErrorEvent>('eventa:event:electron:alicization:chat:stream-error')

export { electron } from '@proj-alicization/electron-eventa'
export * from '@proj-alicization/electron-eventa/electron-updater'
