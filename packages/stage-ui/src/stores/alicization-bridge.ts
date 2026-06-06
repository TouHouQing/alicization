import type {
  AlicizationAnswerAct as SharedAlicizationAnswerAct,
  AlicizationAnswerEvidenceMode as SharedAlicizationAnswerEvidenceMode,
  AlicizationAppendExecutionEventsInput as SharedAlicizationAppendExecutionEventsInput,
  AlicizationBridgeChatStreamEvent as SharedAlicizationBridgeChatStreamEvent,
  AlicizationChannelCapability as SharedAlicizationChannelCapability,
  AlicizationChannelCapabilityManifestRecord as SharedAlicizationChannelCapabilityManifestRecord,
  AlicizationChannelCapabilityManifestUpsertInput as SharedAlicizationChannelCapabilityManifestUpsertInput,
  AlicizationClaudeCodeCommandInput as SharedAlicizationClaudeCodeCommandInput,
  AlicizationClawFabricPlan as SharedAlicizationClawFabricPlan,
  AlicizationClawTaskIntent as SharedAlicizationClawTaskIntent,
  AlicizationCliCommandInput as SharedAlicizationCliCommandInput,
  AlicizationCodexCommandInput as SharedAlicizationCodexCommandInput,
  AlicizationDialogueEmbodimentEnvelope as SharedAlicizationDialogueEmbodimentEnvelope,
  AlicizationEmbodimentScriptV1 as SharedAlicizationEmbodimentScriptV1,
  AlicizationDialoguePerformancePayload as SharedAlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload as SharedAlicizationDialogueRespondedPayload,
  AlicizationDialogueSpeechTimeline as SharedAlicizationDialogueSpeechTimeline,
  AlicizationDialogueStructuredFormat as SharedAlicizationDialogueStructuredFormat,
  AlicizationDialogueStructuredPayload as SharedAlicizationDialogueStructuredPayload,
  AlicizationAffectiveResidueMemorySnapshot as SharedAlicizationAffectiveResidueMemorySnapshot,
  AlicizationDerivedMindStateBundle as SharedAlicizationDerivedMindStateBundle,
  AlicizationRecallLatencyPolicySnapshot as SharedAlicizationRecallLatencyPolicySnapshot,
  AlicizationDigitalLifeEnvelope as SharedAlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest as SharedAlicizationDigitalLifeSpineDigest,
  AlicizationDispatchTaskThreadInput as SharedAlicizationDispatchTaskThreadInput,
  AlicizationDispatchTaskThreadResult as SharedAlicizationDispatchTaskThreadResult,
  AlicizationEpisodicEventRecord as SharedAlicizationEpisodicEventRecord,
  AlicizationEmotion as SharedAlicizationEmotion,
  AlicizationExecutionChannel as SharedAlicizationExecutionChannel,
  AlicizationExecutionEventKind as SharedAlicizationExecutionEventKind,
  AlicizationExecutionEventRecord as SharedAlicizationExecutionEventRecord,
  AlicizationExecutionTaskKind as SharedAlicizationExecutionTaskKind,
  AlicizationExecutorSessionRecord as SharedAlicizationExecutorSessionRecord,
  AlicizationExecutorSessionStatus as SharedAlicizationExecutorSessionStatus,
  AlicizationExecutorSessionUpsertInput as SharedAlicizationExecutorSessionUpsertInput,
  AlicizationListChannelCapabilityManifestsInput as SharedAlicizationListChannelCapabilityManifestsInput,
  AlicizationListExecutionEventsInput as SharedAlicizationListExecutionEventsInput,
  AlicizationListExecutorSessionsInput as SharedAlicizationListExecutorSessionsInput,
  AlicizationListMemoryDecisionTracesInput as SharedAlicizationListMemoryDecisionTracesInput,
  AlicizationListMindTurnEventsInput as SharedAlicizationListMindTurnEventsInput,
  AlicizationListPersonStateUpdatesInput as SharedAlicizationListPersonStateUpdatesInput,
  AlicizationListTaskThreadsInput as SharedAlicizationListTaskThreadsInput,
  AlicizationHostPersonModelSnapshot as SharedAlicizationHostPersonModelSnapshot,
  AlicizationLearningExecutionStateSnapshot as SharedAlicizationLearningExecutionStateSnapshot,
  AlicizationMemoryDecisionTraceRecord as SharedAlicizationMemoryDecisionTraceRecord,
  AlicizationMemoryResolutionLedger as SharedAlicizationMemoryResolutionLedger,
  AlicizationOrganicMemoryStageReplay as SharedAlicizationOrganicMemoryStageReplay,
  AlicizationMemoryStats as SharedAlicizationMemoryStats,
  AlicizationPersonStateUpdateRecord as SharedAlicizationPersonStateUpdateRecord,
  AlicizationPersonStateUpdateSurface as SharedAlicizationPersonStateUpdateSurface,
  AlicizationReplayBenchmarkGateReport as SharedAlicizationReplayBenchmarkGateReport,
  AlicizationReplayBenchmarkPackId as SharedAlicizationReplayBenchmarkPackId,
  AlicizationReplayBenchmarkStandardsRecord as SharedAlicizationReplayBenchmarkStandardsRecord,
  AlicizationReplayBenchmarkTelemetryPatch as SharedAlicizationReplayBenchmarkTelemetryPatch,
  AlicizationReplayMemoryQualityRecord as SharedAlicizationReplayMemoryQualityRecord,
  AlicizationRunReplayBenchmarkInput as SharedAlicizationRunReplayBenchmarkInput,
  AlicizationRunReplayBenchmarkResult as SharedAlicizationRunReplayBenchmarkResult,
  AlicizationNormalVisibleReplyAuthority as SharedAlicizationNormalVisibleReplyAuthority,
  AlicizationInfraVisibleReplyAuthority as SharedAlicizationInfraVisibleReplyAuthority,
  AlicizationVisibleReplyExecutionAuthority as SharedAlicizationVisibleReplyExecutionAuthority,
  AlicizationPersistentPresenceAuthoritySnapshot as SharedAlicizationPersistentPresenceAuthoritySnapshot,
  AlicizationEmotionalKernelSnapshot as SharedAlicizationEmotionalKernelSnapshot,
  AlicizationSelfEvolutionKernelSnapshot as SharedAlicizationSelfEvolutionKernelSnapshot,
  AlicizationSelfEvolutionVersionRuntimeSnapshot as SharedAlicizationSelfEvolutionVersionRuntimeSnapshot,
  AlicizationMemoryProvenance as SharedAlicizationMemoryProvenance,
  AlicizationMemorySource as SharedAlicizationMemorySource,
  AlicizationMemoryUpsertTrace as SharedAlicizationMemoryUpsertTrace,
  AlicizationMindTurnEventKind as SharedAlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord as SharedAlicizationMindTurnEventRecord,
  AlicizationMindTurnGovernance as SharedAlicizationMindTurnGovernance,
  AlicizationOpenClawCommandInput as SharedAlicizationOpenClawCommandInput,
  AlicizationPerformanceDelivery as SharedAlicizationPerformanceDelivery,
  AlicizationPerformanceManifestClampResult as SharedAlicizationPerformanceManifestClampResult,
  AlicizationPlanTaskThreadInput as SharedAlicizationPlanTaskThreadInput,
  AlicizationPlanTaskThreadResult as SharedAlicizationPlanTaskThreadResult,
  AlicizationProactiveMetadata as SharedAlicizationProactiveMetadata,
  AlicizationRealtimeCategory as SharedAlicizationRealtimeCategory,
  AlicizationRealtimeExecutePayload as SharedAlicizationRealtimeExecutePayload,
  AlicizationRealtimeExecuteResult as SharedAlicizationRealtimeExecuteResult,
  AlicizationRealtimeSurface as SharedAlicizationRealtimeSurface,
  AlicizationResidentPerformanceSnapshot as SharedAlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest as SharedAlicizationRuntimeDigest,
  AlicizationRuntimeProjectStateDigest as SharedAlicizationRuntimeProjectStateDigest,
  AlicizationSensoryCacheSnapshot as SharedAlicizationSensoryCacheSnapshot,
  AlicizationSensoryCaptureHealth as SharedAlicizationSensoryCaptureHealth,
  AlicizationSensoryCaptureLeaseStatus as SharedAlicizationSensoryCaptureLeaseStatus,
  AlicizationSensoryCapturePermission as SharedAlicizationSensoryCapturePermission,
  AlicizationSensoryCaptureSnapshot as SharedAlicizationSensoryCaptureSnapshot,
  AlicizationGenesisInput as SharedAlicizationGenesisInput,
  AlicizationGender as SharedAlicizationGender,
  AlicizationPersonalityState as SharedAlicizationPersonalityState,
  AlicizationPersonaTemperament as SharedAlicizationPersonaTemperament,
  AlicizationPersonaRelationshipPosture as SharedAlicizationPersonaRelationshipPosture,
  AlicizationPersonaInitiativeStyle as SharedAlicizationPersonaInitiativeStyle,
  AlicizationPersonaIdentityKernel as SharedAlicizationPersonaIdentityKernel,
  AlicizationPersonaExpressionProfile as SharedAlicizationPersonaExpressionProfile,
  AlicizationPersonaInitiativeBaseline as SharedAlicizationPersonaInitiativeBaseline,
  AlicizationPersonaEvolutionSeed as SharedAlicizationPersonaEvolutionSeed,
  AlicizationPersonaWorkshopSubmission as SharedAlicizationPersonaWorkshopSubmission,
  AlicizationSubconsciousFragmentSourceKind as SharedAlicizationSubconsciousFragmentSourceKind,
  AlicizationSystemProbeDegradeReason as SharedAlicizationSystemProbeDegradeReason,
  AlicizationSystemProbeSample as SharedAlicizationSystemProbeSample,
  AlicizationTaskThreadRecord as SharedAlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus as SharedAlicizationTaskThreadStatus,
  AlicizationTaskThreadUpsertInput as SharedAlicizationTaskThreadUpsertInput,
  CharacterActionCapability as SharedCharacterActionCapability,
  CharacterFacialCapability as SharedCharacterFacialCapability,
  CharacterPerformanceCapabilitiesManifest as SharedCharacterPerformanceCapabilitiesManifest,
  CharacterPerformanceEmbodimentHints as SharedCharacterPerformanceEmbodimentHints,
} from '@proj-alicization/stage-shared'

import {
  alicizationEmotionWhitelist as sharedAlicizationEmotionWhitelist,
  clampAlicizationPerformancePayloadToManifest as sharedClampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmbodimentScript as sharedNormalizeAlicizationEmbodimentScript,
  normalizeAlicizationDigitalLifeEnvelope as sharedNormalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeSpineDigest as sharedNormalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationEmotion as sharedNormalizeAlicizationEmotion,
  normalizeAlicizationPerformanceDelivery as sharedNormalizeAlicizationPerformanceDelivery,
  normalizeAlicizationPerformancePayload as sharedNormalizeAlicizationPerformancePayload,
  normalizeAlicizationRuntimeDigest as sharedNormalizeAlicizationRuntimeDigest,
} from '@proj-alicization/stage-shared'

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
export type AlicizationMemoryProvenance = SharedAlicizationMemoryProvenance
export type AlicizationMemoryUpsertTrace = SharedAlicizationMemoryUpsertTrace
export type AlicizationEpisodicEventRecord = SharedAlicizationEpisodicEventRecord
export type AlicizationHostPersonModelSnapshot = SharedAlicizationHostPersonModelSnapshot
export type AlicizationAffectiveResidueMemorySnapshot = SharedAlicizationAffectiveResidueMemorySnapshot
export type AlicizationSelfEvolutionKernelSnapshot = SharedAlicizationSelfEvolutionKernelSnapshot
export type AlicizationSelfEvolutionVersionRuntimeSnapshot = SharedAlicizationSelfEvolutionVersionRuntimeSnapshot
export type AlicizationPersonStateUpdateRecord = SharedAlicizationPersonStateUpdateRecord
export type AlicizationPersonStateUpdateSurface = SharedAlicizationPersonStateUpdateSurface

export interface AlicizationMemoryFact {
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: AlicizationMemorySource
  dedupeKey: string
  createdAt: number
  updatedAt: number
  lastAccessAt: number | null
  accessCount: number
  provenance?: SharedAlicizationMemoryProvenance | null
}

export interface AlicizationMemoryArchiveRecord extends AlicizationMemoryFact {
  archivedAt: number
}

export interface AlicizationMemoryFactInput {
  subject: string
  predicate: string
  object: string
  confidence: number
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
  provenance?: SharedAlicizationMemoryProvenance | null
}

export interface AlicizationOrganicMemorySnapshot {
  hostAttitude: string
  coreIncarnation: string
  activeThoughts: AlicizationActiveThought[]
  subconsciousCount: number
  recentSubconsciousFragments: AlicizationSubconsciousFragment[]
  recentEpisodicEvents?: SharedAlicizationEpisodicEventRecord[]
  hostPersonModel?: SharedAlicizationHostPersonModelSnapshot | null
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
    dominantProvenance: SharedAlicizationMemoryProvenance
  }>
  recollectionIntent?: {
    mode: 'none' | 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
    temporalFocus: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
    searchEpisodes: boolean
    searchConversations: boolean
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
    selectedConversationTurnIds: string[]
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
    internalLead: string
    visibleLead: string | null
    styleNote: string
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
  selfEvolution?: SharedAlicizationSelfEvolutionKernelSnapshot | null
  affectiveResidue?: SharedAlicizationAffectiveResidueMemorySnapshot | null
  recallLatencyPolicy?: SharedAlicizationRecallLatencyPolicySnapshot | null
  derivedMindStateBundle?: SharedAlicizationDerivedMindStateBundle | null
  memoryStageReplay?: SharedAlicizationOrganicMemoryStageReplay | null
  memoryResolutionLedger?: SharedAlicizationMemoryResolutionLedger | null
  learningExecutionState?: SharedAlicizationLearningExecutionStateSnapshot | null
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
  visibleReplyCritic?: Record<string, unknown> | null
  visibleReplyClosure?: Record<string, unknown> | null
  governance?: AlicizationMindTurnGovernance | null
  createdAt?: number
}

export interface AlicizationProjectStateObservation {
  turnId: string
  sessionId: string
  origin: 'user-turn' | 'subconscious-proactive'
  nonHumanAuthoredStatus: string | null
  preDialogueAwareness?: {
    status: 'grounded' | 'partial' | 'drift'
    summaryLine: string | null
    companionHeadlineLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    awarenessLine?: string | null
    emotionalClosureCue?: string | null
    reasonPreview: string[]
  } | null
  preDialogueClosure?: {
    status: 'grounded' | 'partial' | 'drift' | 'rewritten' | null
    summaryLine: string | null
    emotionalClosureCue?: string | null
    companionHeadlineLine?: string | null
    sameHerDriftRiskLine?: string | null
    companionshipReasonLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    briefingLines?: string[]
    reasons: string[]
  } | null
  projectState: {
    identity: string
    currentPhase: string
    latestLandedProgress: string | null
    latestProgress?: string | null
    primaryOpenLoop: string | null
    nextClosureTarget: string
    continuitySummary?: string | null
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRisk?: string | null
  }
}

export interface AlicizationProjectStateContinuitySnapshot {
  identity: string
  currentPhase: string
  latestLandedProgress: string | null
  latestProgress?: string | null
  primaryOpenLoop: string | null
  nextClosureTarget: string
  continuitySummary?: string | null
  sameHerSelfLine?: string | null
  sameHerHoldDetail?: string | null
  sameHerDriftRisk?: string | null
  emotionalClosureCue?: string | null
  preDialogueAwareness?: {
    status: 'grounded' | 'partial' | 'drift'
    summaryLine: string | null
    companionHeadlineLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    awarenessLine?: string | null
    emotionalClosureCue?: string | null
    reasonPreview: string[]
  } | null
  preDialogueClosure?: {
    status: 'grounded' | 'partial' | 'drift' | 'rewritten' | null
    summaryLine: string | null
    emotionalClosureCue?: string | null
    companionHeadlineLine?: string | null
    sameHerDriftRiskLine?: string | null
    companionshipReasonLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    briefingLines?: string[]
    reasons: string[]
  } | null
  nonHumanAuthoredStatus: string | null
  turnId: string
  sessionId: string
  origin: 'user-turn' | 'subconscious-proactive'
}

export type AlicizationMindTurnEventKind = SharedAlicizationMindTurnEventKind

export type AlicizationMindTurnEventRecord = SharedAlicizationMindTurnEventRecord
export type AlicizationMemoryDecisionTraceRecord = SharedAlicizationMemoryDecisionTraceRecord
export type AlicizationReplayBenchmarkPackId = SharedAlicizationReplayBenchmarkPackId
export type AlicizationReplayMemoryQualityRecord = SharedAlicizationReplayMemoryQualityRecord
export type AlicizationReplayBenchmarkStandardsRecord = SharedAlicizationReplayBenchmarkStandardsRecord
export type AlicizationReplayBenchmarkGateReport = SharedAlicizationReplayBenchmarkGateReport
export type AlicizationReplayBenchmarkTelemetryPatch = SharedAlicizationReplayBenchmarkTelemetryPatch
export type AlicizationNormalVisibleReplyAuthority = SharedAlicizationNormalVisibleReplyAuthority
export type AlicizationInfraVisibleReplyAuthority = SharedAlicizationInfraVisibleReplyAuthority
export type AlicizationVisibleReplyExecutionAuthority = SharedAlicizationVisibleReplyExecutionAuthority

export type AlicizationVisibleReplyExecutionMode = 'provider-stream' | 'provider-one-shot' | 'local-fallback'

export interface AlicizationVisibleReplyExecution {
  mode: AlicizationVisibleReplyExecutionMode
  expectedVisibleReplyAuthority: AlicizationNormalVisibleReplyAuthority | null
  actualVisibleReplyAuthority: AlicizationVisibleReplyExecutionAuthority | null
  providerMindExecuted: boolean
  reason: string | null
}

export interface AlicizationListMindTurnEventsPayload extends SharedAlicizationListMindTurnEventsInput {}
export interface AlicizationListMemoryDecisionTracesPayload extends SharedAlicizationListMemoryDecisionTracesInput {}
export interface AlicizationListPersonStateUpdatesPayload extends SharedAlicizationListPersonStateUpdatesInput {}
export interface AlicizationRunReplayBenchmarkPayload extends SharedAlicizationRunReplayBenchmarkInput {}
export interface AlicizationRunReplayBenchmarkResult extends SharedAlicizationRunReplayBenchmarkResult {}

export type AlicizationExecutionChannel = SharedAlicizationExecutionChannel

export type AlicizationExecutionTaskKind = SharedAlicizationExecutionTaskKind

export type AlicizationChannelCapability = SharedAlicizationChannelCapability

export type AlicizationChannelCapabilityManifestRecord = SharedAlicizationChannelCapabilityManifestRecord

export interface AlicizationUpsertChannelCapabilityManifestPayload extends SharedAlicizationChannelCapabilityManifestUpsertInput {}

export interface AlicizationListChannelCapabilityManifestsPayload extends SharedAlicizationListChannelCapabilityManifestsInput {}

export type AlicizationClawTaskIntent = SharedAlicizationClawTaskIntent

export type AlicizationClawFabricPlan = SharedAlicizationClawFabricPlan

export type AlicizationCliCommandInput = SharedAlicizationCliCommandInput
export type AlicizationCodexCommandInput = SharedAlicizationCodexCommandInput
export type AlicizationClaudeCodeCommandInput = SharedAlicizationClaudeCodeCommandInput
export type AlicizationOpenClawCommandInput = SharedAlicizationOpenClawCommandInput

export type AlicizationTaskThreadStatus = SharedAlicizationTaskThreadStatus

export type AlicizationTaskThreadRecord = SharedAlicizationTaskThreadRecord

export interface AlicizationUpsertTaskThreadPayload extends SharedAlicizationTaskThreadUpsertInput {}

export interface AlicizationListTaskThreadsPayload extends SharedAlicizationListTaskThreadsInput {}

export type AlicizationExecutionEventKind = SharedAlicizationExecutionEventKind

export type AlicizationExecutionEventRecord = SharedAlicizationExecutionEventRecord

export type AlicizationExecutorSessionStatus = SharedAlicizationExecutorSessionStatus

export type AlicizationExecutorSessionRecord = SharedAlicizationExecutorSessionRecord

export interface AlicizationUpsertExecutorSessionPayload extends SharedAlicizationExecutorSessionUpsertInput {}

export interface AlicizationListExecutorSessionsPayload extends SharedAlicizationListExecutorSessionsInput {}

export interface AlicizationAppendExecutionEventsPayload extends SharedAlicizationAppendExecutionEventsInput {}

export interface AlicizationListExecutionEventsPayload extends SharedAlicizationListExecutionEventsInput {}

export interface AlicizationPlanTaskThreadPayload extends SharedAlicizationPlanTaskThreadInput {}

export type AlicizationPlanTaskThreadResult = SharedAlicizationPlanTaskThreadResult

export interface AlicizationDispatchTaskThreadPayload extends SharedAlicizationDispatchTaskThreadInput {}

export type AlicizationDispatchTaskThreadResult = SharedAlicizationDispatchTaskThreadResult

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
export type AlicizationRealtimeSurface = SharedAlicizationRealtimeSurface

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
export type AlicizationProactiveReasonCode
  = | 'busy-host'
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
    | 'continue-phase-1-line'
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
    | 'project-state'
    | 'relationship'
    | 'host-state'
    | 'task-knot'
    | 'visible-scene'
    | 'general'

export type AlicizationDialogueScreenReferenceMode
  = | 'required'
    | 'helpful'
    | 'incidental'
    | 'avoid'

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

export interface AlicizationDiscourseStateSnapshot {
  currentTurnSubject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  currentTurnSummary: string
  currentQuestion?: string | null
  owedAction: AlicizationMindSpeechObligation
  relationMove: AlicizationMindRelationMove
  continuityMode: 'dialogue-first' | 'task-first' | 'scene-first'
  unresolvedCarry?: string | null
  ruptureRepair?: string | null
  confidence: number
  narrative: string[]
  updatedAt: number
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

export type AlicizationAnswerAct = SharedAlicizationAnswerAct

export type AlicizationAnswerEvidenceMode = SharedAlicizationAnswerEvidenceMode

export interface AlicizationAnswerPlannerSnapshot {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  confidence: number
  governingFocus: string
  openingMove: string
  answerIntent: string
  relationshipPosture: 'restrained' | 'warm' | 'tender'
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

export interface AlicizationAnswerCompilerSnapshot {
  answerSubject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  speechObligation: AlicizationMindSpeechObligation
  relationMove: AlicizationMindRelationMove
  turnMode: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
  responseMode: AlicizationCompiledResponseMode
  recommendedAct: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  personaKernelMode: 'full' | 'backgrounded' | 'muted'
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  openingDirective: string
  openingClaim: string
  supportingReality: string[]
  uncertaintyBoundary?: string | null
  careVector?: string | null
  nextMove?: string | null
  suppressAssociativeRecall: boolean
  labelCarryAsMemory: boolean
  maxSentences: number
  mustDo: string[]
  mustNotDo: string[]
  confidence: number
  narrative: string[]
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
  speakingFrom: 'live-scene' | 'task-thread' | 'dialogue-bond' | 'self-continuity' | 'held-memory'
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
  continuityPolicy?: 'stay-on-thread' | 'answer-then-carry' | 'scene-before-memory' | 'dialogue-before-scene' | null
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
  memoryMode?: 'suppress-associative' | 'task-thread' | 'scene-anchored' | 'dialogue-carry' | 'emotional-resonance' | null
  carriedThread?: string | null
  carriedFacts: string[]
  recallKeys: string[]
  recallSeed?: string | null
  lastOutcome?: 'none' | 'pending' | 'aligned' | 'missed' | 'repairing' | 'deferred' | null
  suppressAssociativeRecall: boolean
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
  answerAct?: 'answer' | 'guide' | 'ask-reground' | 'correct-stale-anchor' | 'care' | 'defer' | null
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
  personaBias?: {
    relationshipPosture: string | null
    initiativeStyle: string | null
    silenceReconnect: string | null
    comfortStyle: string | null
    preferredProactiveStyle: string | null
    manifestationCadenceSummary: string | null
    openingGuidance: string | null
    whySummary: string | null
  } | null
  why: string
  shouldSurface: boolean
  shouldSpeak: boolean
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
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
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
  initiative?: AlicizationInitiativeSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  learningExecutionState?: SharedAlicizationLearningExecutionStateSnapshot | null
  residentPerformance?: SharedAlicizationResidentPerformanceSnapshot | null
  privateThought: AlicizationPrivateThoughtSnapshot | null
  captureState: {
    permission: 'granted' | 'denied' | 'prompt' | 'unknown'
    lastGroundedAt: number | null
    sourceName?: string
    degradedReason?: string
  }
  durabilityPulse: AlicizationDurabilityPulseSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  nextSuggestedProbeMs: number
  updatedAt: number
}

export interface AlicizationPresencePulsePayload {
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

export interface AlicizationProactiveFeedbackPayload {
  turnId: string
  feedback: AlicizationProactiveFeedbackKind
}

export type AlicizationDialoguePerformancePayload = SharedAlicizationDialoguePerformancePayload
export type AlicizationDialogueEmbodimentEnvelope = SharedAlicizationDialogueEmbodimentEnvelope
export type AlicizationEmbodimentScriptV1 = SharedAlicizationEmbodimentScriptV1
export type AlicizationDigitalLifeEnvelope = SharedAlicizationDigitalLifeEnvelope
export type AlicizationDigitalLifeSpineDigest = SharedAlicizationDigitalLifeSpineDigest
export type AlicizationRuntimeDigest = SharedAlicizationRuntimeDigest
export type AlicizationRuntimeProjectStateDigest = SharedAlicizationRuntimeProjectStateDigest
export type AlicizationEmotionalKernelSnapshot = SharedAlicizationEmotionalKernelSnapshot
export type AlicizationDialogueSpeechTimeline = SharedAlicizationDialogueSpeechTimeline
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
export const normalizeAlicizationEmbodimentScript = sharedNormalizeAlicizationEmbodimentScript
export const normalizeAlicizationDigitalLifeEnvelope = sharedNormalizeAlicizationDigitalLifeEnvelope
export const normalizeAlicizationDigitalLifeSpineDigest = sharedNormalizeAlicizationDigitalLifeSpineDigest
export const normalizeAlicizationRuntimeDigest = sharedNormalizeAlicizationRuntimeDigest

export type AlicizationDialogueStructuredPayload = SharedAlicizationDialogueStructuredPayload
export type AlicizationDialogueRespondedPayload = SharedAlicizationDialogueRespondedPayload

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

export interface AlicizationLlmConfigPayload {
  activeProviderId: string
  activeModelId: string
  providerCredentials: Record<string, Record<string, unknown>>
}

export interface AlicizationPreDialogueSendIdentity {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  awarenessLine?: string | null
  emotionalClosureCue?: string | null
  projectState?: AlicizationRuntimeProjectStateDigest | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  reasonPreview: string[]
}

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
  preDialogueSendIdentity?: AlicizationPreDialogueSendIdentity | null
}

export type AlicizationMindTurnGovernance = SharedAlicizationMindTurnGovernance

export interface AlicizationChatStartResult {
  accepted: boolean
  turnId: string
  state?: 'accepted' | 'duplicate-running' | 'duplicate-finished' | 'missing-config' | 'start-failed'
  reason?: string
  governance?: AlicizationMindTurnGovernance | null
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
}

export interface AlicizationChatAbortPayload extends AlicizationCardScope {
  turnId: string
  reason?: string
}

export interface AlicizationChatAbortResult {
  accepted: boolean
  state: 'aborted' | 'not-found' | 'finished'
}

export interface AlicizationReminderScheduleResult {
  status: 'scheduled' | 'error'
  taskId?: string
  triggerTime?: string
  triggerAt?: number
  message?: string
  code?: string
}

export type AlicizationBridgeChatStreamEvent = SharedAlicizationBridgeChatStreamEvent

export type AlicizationToolRiskLevel = 'safe' | 'sensitive' | 'danger'

export interface AlicizationSafetyPermissionRequest {
  cardId: string
  requestId: string
  token: string
  riskLevel: AlicizationToolRiskLevel
  actionCategory: 'read' | 'write' | 'delete' | 'execute' | 'network' | 'unknown'
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

interface AlicizationBridge {
  bootstrap: () => Promise<AlicizationSoulSnapshot>
  getSoul: () => Promise<AlicizationSoulSnapshot>
  initializeGenesis: (payload: AlicizationGenesisInput) => Promise<AlicizationInitializeGenesisResult>
  updateSoul: (payload: AlicizationSoulUpdatePayload) => Promise<AlicizationSoulSnapshot>
  updatePersonality: (payload: AlicizationPersonalityUpdatePayload) => Promise<AlicizationSoulSnapshot>
  getKillSwitchState: () => Promise<AlicizationKillSwitchSnapshot>
  suspendKillSwitch: (payload?: { reason?: string }) => Promise<AlicizationKillSwitchSnapshot>
  resumeKillSwitch: (payload?: { reason?: string }) => Promise<AlicizationKillSwitchSnapshot>
  getMemoryStats: () => Promise<AlicizationMemoryStats>
  runMemoryPrune: () => Promise<AlicizationMemoryStats>
  updateMemoryStats: (payload: AlicizationMemoryStats) => Promise<AlicizationMemoryStats>
  retrieveMemoryFacts: (payload: { query: string, limit?: number }) => Promise<AlicizationMemoryFact[]>
  upsertMemoryFacts: (payload: { facts: AlicizationMemoryFactInput[], source: AlicizationMemorySource, trace?: AlicizationMemoryUpsertTrace | null }) => Promise<void>
  importLegacyMemory: (payload: AlicizationMemoryLegacySnapshot) => Promise<AlicizationMemoryMigrationResult>
  getOrganicMemorySnapshot?: () => Promise<AlicizationOrganicMemorySnapshot>
  getLatestProjectStateObservation?: () => Promise<AlicizationProjectStateObservation | null>
  getProjectStateContinuitySnapshot?: () => Promise<AlicizationProjectStateContinuitySnapshot | null>
  getSelfEvolutionState?: () => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot>
  searchOrganicSubconsciousFragments?: (payload: { query: string, limit?: number }) => Promise<AlicizationSubconsciousFragment[]>
  getPerformanceManifest?: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  setPerformanceManifest?: (payload: CharacterPerformanceCapabilitiesManifest | null) => Promise<void>
  appendConversationTurn: (payload: AlicizationConversationTurnInput) => Promise<void>
  listMindTurnEvents?: (payload: AlicizationListMindTurnEventsPayload) => Promise<AlicizationMindTurnEventRecord[]>
  listMemoryDecisionTraces?: (payload: AlicizationListMemoryDecisionTracesPayload) => Promise<AlicizationMemoryDecisionTraceRecord[]>
  listPersonStateUpdates?: (payload: AlicizationListPersonStateUpdatesPayload) => Promise<AlicizationPersonStateUpdateRecord[]>
  runReplayBenchmark?: (payload: AlicizationRunReplayBenchmarkPayload) => Promise<AlicizationRunReplayBenchmarkResult>
  upsertTaskThread?: (payload: AlicizationUpsertTaskThreadPayload) => Promise<AlicizationTaskThreadRecord>
  listTaskThreads?: (payload: AlicizationListTaskThreadsPayload) => Promise<AlicizationTaskThreadRecord[]>
  upsertChannelCapabilityManifest?: (payload: AlicizationUpsertChannelCapabilityManifestPayload) => Promise<AlicizationChannelCapabilityManifestRecord>
  listChannelCapabilityManifests?: (payload: AlicizationListChannelCapabilityManifestsPayload) => Promise<AlicizationChannelCapabilityManifestRecord[]>
  upsertExecutorSession?: (payload: AlicizationUpsertExecutorSessionPayload) => Promise<AlicizationExecutorSessionRecord>
  listExecutorSessions?: (payload: AlicizationListExecutorSessionsPayload) => Promise<AlicizationExecutorSessionRecord[]>
  appendExecutionEvents?: (payload: AlicizationAppendExecutionEventsPayload) => Promise<void>
  listExecutionEvents?: (payload: AlicizationListExecutionEventsPayload) => Promise<AlicizationExecutionEventRecord[]>
  planTaskThread?: (payload: AlicizationPlanTaskThreadPayload) => Promise<AlicizationPlanTaskThreadResult>
  dispatchTaskThread?: (payload: AlicizationDispatchTaskThreadPayload) => Promise<AlicizationDispatchTaskThreadResult>
  reportProactiveFeedback?: (payload: AlicizationProactiveFeedbackPayload) => Promise<void>
  setActiveSession?: (payload: { sessionId: string }) => Promise<void>
  appendAuditLog: (payload: AlicizationAuditLogInput) => Promise<void>
  realtimeExecute: (payload: AlicizationRealtimeExecutePayload) => Promise<AlicizationRealtimeExecuteResult>
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot>
  getVisualPresenceState?: () => Promise<AlicizationVisualPresenceStateSnapshot | null>
  onVisualPresencePulse?: (listener: (payload: AlicizationPresencePulsePayload) => void) => () => void
  onVisualPresenceState?: (listener: (state: AlicizationVisualPresenceStateSnapshot | null) => void) => () => void
  getSubconsciousState?: () => Promise<AlicizationSubconsciousStatePayload>
  forceSubconsciousTick?: () => Promise<AlicizationSubconsciousTickResult>
  forceDreaming?: (payload?: AlicizationSubconsciousForceDreamPayload) => Promise<AlicizationDreamRunResult>
  syncLlmConfig?: (payload: AlicizationLlmConfigPayload) => Promise<void>
  getLlmConfig?: () => Promise<AlicizationLlmConfigPayload>
  chatStart?: (payload: Omit<AlicizationChatStartPayload, 'cardId'>) => Promise<AlicizationChatStartResult>
  chatAbort?: (payload: { turnId: string, reason?: string }) => Promise<AlicizationChatAbortResult>
  reminderSchedule?: (payload: { minutes: number, message: string, sourceTurnId?: string }) => Promise<AlicizationReminderScheduleResult>
  clearAllConversations?: () => Promise<void>
  streamChat?: (
    payload: Omit<AlicizationChatStartPayload, 'cardId'>,
    options: {
      abortSignal?: AbortSignal
      onStreamEvent?: (event: AlicizationBridgeChatStreamEvent) => Promise<void> | void
    },
  ) => Promise<void>
  deleteCardScope?: (scope: AlicizationCardScope) => Promise<void>
  deleteAllData?: () => Promise<void>
}

let bridge: AlicizationBridge | undefined

export function setAlicizationBridge(nextBridge: AlicizationBridge) {
  bridge = nextBridge
}

export function clearAlicizationBridge() {
  bridge = undefined
}

export function getAlicizationBridge(): AlicizationBridge {
  if (!bridge) {
    throw new Error('Alicization bridge is not available in this runtime.')
  }
  return bridge
}

export function hasAlicizationBridge() {
  return Boolean(bridge)
}
