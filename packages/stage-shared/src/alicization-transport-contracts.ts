import type { AlicizationDialogueEmbodimentEnvelope } from './alicization-dialogue-embodiment'
import type { AlicizationDialogueSpeechTimeline } from './alicization-dialogue-speech-timeline'
import type { AlicizationDigitalLifeEnvelope } from './alicization-digital-life'
import type { AlicizationClaimEvidenceGraph } from './alicization-claim-evidence-graph'
import type { AlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'
import type { AlicizationOrganicMemoryStageReplay } from './alicization-memory-stats'
import type { AlicizationDialoguePerformancePayload, AlicizationEmotion } from './alicization-performance-contracts'

export type AlicizationMemorySource = 'rule' | 'async-llm'
export type AlicizationKnowledgeAssimilationStage
  = 'ephemeral-observation'
    | 'working-understanding'
    | 'validated-knowledge'
    | 'internalized-long-horizon-knowledge'

export type AlicizationKnowledgeValidationStatus
  = 'unverified'
    | 'provisional'
    | 'validated'
    | 'superseded'

export type AlicizationMemoryDomain
  = 'procedure'
    | 'relationship'
    | 'self-model'
    | 'world-model'

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
  knowledgeStage?: AlicizationKnowledgeAssimilationStage | null
  validationStatus?: AlicizationKnowledgeValidationStatus | null
  memoryDomain?: AlicizationMemoryDomain | null
  validationCount?: number | null
  contradictionCount?: number | null
  sourceLabel?: string | null
  conflictsWith?: string[] | null
  supersedes?: string[] | null
  provenance?: AlicizationMemoryProvenance | null
  memoryTier?: AlicizationMemoryTier | null
}

export interface AlicizationMemoryArchiveRecord extends AlicizationMemoryFact {
  archivedAt: number
}

export interface AlicizationMemoryFactInput {
  subject: string
  predicate: string
  object: string
  confidence: number
  knowledgeStage?: AlicizationKnowledgeAssimilationStage | null
  validationStatus?: AlicizationKnowledgeValidationStatus | null
  memoryDomain?: AlicizationMemoryDomain | null
  validationCount?: number | null
  contradictionCount?: number | null
  sourceLabel?: string | null
  conflictsWith?: string[] | null
  supersedes?: string[] | null
}

export interface AlicizationKnowledgeAssimilationCorrection {
  targetFactId: string
  nextValidationStatus: AlicizationKnowledgeValidationStatus
  nextKnowledgeStage?: AlicizationKnowledgeAssimilationStage | null
  sourceLabel?: string | null
  appendConflictsWith?: string[] | null
  appendSupersedes?: string[] | null
}

export type AlicizationSubconsciousFragmentSourceKind
  = | 'active-demotion'
    | 'autobiographical-episode'
    | 'dream-fragment'
    | 'former-core-incarnation'
    | 'unforged-shattering-event'
    | 'attitude-shift'
    | 'mind-continuity'
    | 'visual-sediment'
    | 'reflection-ledger'
    | 'dialogue-turn'
    | 'fact-ledger'

export type AlicizationMemoryProvenance
  = | 'observed'
    | 'remembered'
    | 'dreamt'
    | 'inferred'
    | 'reconstructed'

export type AlicizationMemoryTier = 'hot' | 'warm' | 'cold'

export type AlicizationEpisodicEventSourceKind
  = | 'reply'
    | 'dialogue-feedback'
    | 'execution-proposal'
    | 'execution-result'
    | 'proactive'
    | 'dream'
    | 'dream-reforge'
    | 'reflection'
    | 'maintenance'

export interface AlicizationRelationshipShiftSnapshot {
  closenessDelta: number
  trustDelta: number
  burdenDelta: number
  boundaryDelta: number
  misreadDelta: number
  repairDelta: number
  openLoopDelta: number
}

export interface AlicizationDerivedMemoryReference {
  kind:
    | 'turn'
    | 'mind-turn-event'
    | 'relationship-outcome'
    | 'reinforcement-event'
    | 'memory-fact'
    | 'reflection'
    | 'dream'
    | 'episodic-event'
    | 'task-thread'
    | 'execution-event'
    | 'scene'
  id?: string | null
  label?: string | null
}

export interface AlicizationEpisodicReconsolidationSnapshot {
  at: number
  decisionTraceId?: string | null
  provenance: AlicizationMemoryProvenance
  confidence: number
  reason: string
  emotionTags: string[]
  relationshipMeaning?: string | null
  lesson?: string | null
}

export interface AlicizationEpisodicEventInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  sourceKind: AlicizationEpisodicEventSourceKind
  provenance: AlicizationMemoryProvenance
  occurredAt?: number
  whereSummary?: string | null
  withWhom?: string[] | null
  threadAnchor?: string | null
  whatHappened: string
  felt?: string | null
  emotionTags?: string[] | null
  whatChanged?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  sourceSummary?: string | null
  confidence: number
  salience?: number | null
  sceneAttachment?: number | null
  consolidationPriority?: number | null
  relationshipShift?: AlicizationRelationshipShiftSnapshot | null
  derivedFrom?: AlicizationDerivedMemoryReference[] | null
  tags?: string[] | null
  createdAt?: number
  updatedAt?: number
}

export interface AlicizationEpisodicEventRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationEpisodicEventSourceKind
  provenance: AlicizationMemoryProvenance
  occurredAt: number
  whereSummary: string | null
  withWhom: string[]
  threadAnchor: string | null
  whatHappened: string
  felt: string | null
  emotionTags: string[]
  whatChanged: string | null
  relationshipMeaning: string | null
  lesson: string | null
  sourceSummary: string | null
  confidence: number
  salience: number
  sceneAttachment: number
  consolidationPriority: number
  relationshipShift: AlicizationRelationshipShiftSnapshot | null
  derivedFrom: AlicizationDerivedMemoryReference[]
  tags: string[]
  createdAt: number
  updatedAt: number
  lastRecalledAt: number | null
  recallCount: number
  reconsolidationCount: number
  latestReconsolidation: AlicizationEpisodicReconsolidationSnapshot | null
  memoryTier?: AlicizationMemoryTier | null
}

export interface AlicizationHostPersonClosenessPreference {
  context: string
  preference: string
  confidence: number
}

export interface AlicizationHostPersonTrustLadderSnapshot {
  stage: 'guarded' | 'cautious-open' | 'warming' | 'trusted'
  score: number
  rationale: string
}

export interface AlicizationHostPersonModelSnapshot {
  summary: string
  routines: string[]
  sensitivities: string[]
  repairTriggers: string[]
  trustLadder: AlicizationHostPersonTrustLadderSnapshot
  preferredClosenessByContext: AlicizationHostPersonClosenessPreference[]
  recurrentBurdens: string[]
  narrative: string[]
  updatedAt: number
}

export type AlicizationMemoryRecollectionMode
  = | 'none'
    | 'conversation-history'
    | 'autobiographical-history'
    | 'relationship-history'
    | 'execution-procedure'
    | 'experience-pattern'

export type AlicizationMemoryRecollectionTemporalFocus
  = | 'recent'
    | 'recent-or-mid'
    | 'cross-session'
    | 'experience-matched'
    | 'distant'

export type AlicizationMemoryRecollectionEraFacet
  = | 'phase'
    | 'relationship-era'
    | 'task-era'
    | 'self-era'
    | 'window'

export interface AlicizationMemoryRecollectionAgendaSnapshot {
  whyRecallNow: string
  goalSimilarity: number
  relationshipNeed: number
  affectivePull: number
  sceneFamiliarity: number
  candidateTimeScopes: Array<{
    scope: AlicizationMemoryRecollectionTemporalFocus
    weight: number
    rationale?: string | null
  }>
  candidateEraFacets: Array<{
    facet: AlicizationMemoryRecollectionEraFacet
    weight: number
    rationale?: string | null
  }>
  candidateProcedureLines: string[]
  uncertaintyTolerance: 'low' | 'medium' | 'high'
}

export interface AlicizationMemoryRecollectionIntentSnapshot {
  mode: AlicizationMemoryRecollectionMode
  temporalFocus: AlicizationMemoryRecollectionTemporalFocus
  searchEpisodes: boolean
  searchConversations: boolean
  searchProceduralExperience: boolean
  queryHints: string[]
  rationale: string
  confidence: number
  recollectionAgenda?: AlicizationMemoryRecollectionAgendaSnapshot | null
}

export type AlicizationRecollectionSearchFocus
  = 'era'
    | 'procedure'
    | 'relationship-line'
    | 'conversation-turn'
    | 'episode'

export type AlicizationRecollectionSearchAction
  = 'hold'
    | 'expand-era'
    | 'expand-procedure'
    | 'expand-relationship-line'
    | 'expand-conversation'
    | 'narrow-to-stable-core'

export type AlicizationRecollectionEvidenceGap
  = 'none'
    | 'need-period-anchor'
    | 'need-episode-detail'
    | 'need-procedure-detail'
    | 'need-relationship-meaning'
    | 'need-conversation-evidence'
    | 'need-disambiguation'

export type AlicizationRecollectionAmbiguityPosture = 'settled' | 'approximate' | 'ambiguous'

export interface AlicizationRecollectionSearchTrace {
  firstHop: {
    focus: AlicizationRecollectionSearchFocus
    summary: string
    targetIds: string[]
  }
  secondHop: {
    action: AlicizationRecollectionSearchAction
    evidenceGap: AlicizationRecollectionEvidenceGap
    summary: string
    targetIds: string[]
  }
  thirdHop: {
    ambiguityPosture: AlicizationRecollectionAmbiguityPosture
    summary: string
  }
}

export type AlicizationRecollectionCertainty = 'firm' | 'approximate' | 'fragmentary'

export type AlicizationRecollectionSurfaceMode
  = 'internal-only'
    | 'gist-first'
    | 'answer-anchoring'
    | 'procedural-carry'
    | 'relationship-continuity'

export interface AlicizationRecollectionNarrativeSnapshot {
  mode: Exclude<AlicizationMemoryRecollectionMode, 'none'>
  certainty: AlicizationRecollectionCertainty
  recallCenter: string
  recallPressure: 'low' | 'medium' | 'high'
  evidenceCues: string[]
  provenancePosture: 'lived' | 'reconstructed' | 'inferred-or-dreamt'
  speakerInstruction: string
  /**
   * @deprecated Phase 11 keeps this field only for compatibility with older
   * replay/browser payloads. Runtime helpers must not generate fixed visible
   * wording here; use recallCenter/evidenceCues as LLM mind inputs instead.
   */
  opening: string
  /**
   * @deprecated Use evidenceCues. Kept until all older consumers migrate.
   */
  supportCues: string[]
  confidence: number
}

export interface AlicizationRecollectionPlan {
  selectedConsolidationIds: string[]
  selectedWindowIds: string[]
  selectedProceduralIds: string[]
  selectedEpisodeIds: string[]
  selectedConversationTurnIds: string[]
  selectedRelationshipLines?: string[]
  searchTrace?: AlicizationRecollectionSearchTrace | null
  opening: string
  certainty: AlicizationRecollectionCertainty
  rationale: string
  confidence: number
}

export interface AlicizationRecollectionSpeechPlan {
  shouldSurface: boolean
  surfaceMode: AlicizationRecollectionSurfaceMode
  placement: 'before-payoff' | 'inside-payoff' | 'after-payoff' | 'internal-only'
  certainty: AlicizationRecollectionCertainty
  internalLead: string
  visibleLead: string | null
  styleNote: string
  rationale: string
  confidence: number
}

export type AlicizationMemoryDeliberationConflictSeverity = 'none' | 'low' | 'medium' | 'high'

export interface AlicizationMemoryDeliberationSelectedEra {
  id: string
  facet: AlicizationMemoryRecollectionEraFacet
  summary: string
}

export interface AlicizationMemoryDeliberationSelectedPeriod {
  id: string
  kind: 'window' | 'consolidation'
  summary: string
}

export interface AlicizationMemoryDeliberationSelectedEpisode {
  id: string
  summary: string
  provenance: AlicizationMemoryProvenance
  reconsolidatedFromTraceId?: string | null
}

export interface AlicizationMemoryDeliberationConflictVariant {
  id: string
  summary: string
  provenance: AlicizationMemoryProvenance
  reason?: string | null
}

export interface AlicizationMemoryDeliberationSelectedProcedure {
  id: string
  label: string
  approach: string
}

export interface AlicizationMemoryDeliberationSelectedBundle {
  id: string
  summary: string
  rationale: string
  confidence: number
  periodId?: string | null
  episodeId?: string | null
  procedureId?: string | null
  conversationTurnId?: string | null
  relationshipLine?: string | null
}

export interface AlicizationMemoryDeliberationSelectedChain {
  id: string
  kind: 'task-procedure-relationship-stance' | 'period-event-lesson-posture'
  summary: string
  rationale: string
  confidence: number
  taskCue?: string | null
  periodSummary?: string | null
  eventSummary?: string | null
  procedureSummary?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  currentStance?: string | null
  answerPosture?: string | null
}

export type AlicizationMemoryFollowUpIntrusionRisk = 'low' | 'medium' | 'high'
export type AlicizationMemoryFollowUpPayoffDependency = 'memory-only' | 'requires-current-payoff' | 'can-surface-softly'
export type AlicizationMemoryFollowUpPreferredTiming = 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window'

export interface AlicizationMemoryFollowUpAffordance {
  summary: string
  whyNow: string
  intrusionRisk: AlicizationMemoryFollowUpIntrusionRisk
  payoffDependency: AlicizationMemoryFollowUpPayoffDependency
  preferredTiming: AlicizationMemoryFollowUpPreferredTiming
}

export interface AlicizationMemoryDeliberation {
  shouldRecall: boolean
  selectedEraIds: string[]
  selectedConsolidationIds: string[]
  selectedWindowIds: string[]
  selectedProcedureIds: string[]
  selectedEpisodeIds: string[]
  selectedConversationTurnIds: string[]
  selectedRelationshipLines: string[]
  ambiguityPosture?: AlicizationRecollectionAmbiguityPosture
  searchTrace?: AlicizationRecollectionSearchTrace | null
  selectedEras: AlicizationMemoryDeliberationSelectedEra[]
  selectedPeriods: AlicizationMemoryDeliberationSelectedPeriod[]
  selectedEpisodes: AlicizationMemoryDeliberationSelectedEpisode[]
  conflictSeverity?: AlicizationMemoryDeliberationConflictSeverity
  conflictVariants?: AlicizationMemoryDeliberationConflictVariant[]
  stableCore?: string[]
  unsafeDetails?: string[]
  selectedProcedures: AlicizationMemoryDeliberationSelectedProcedure[]
  selectedBundles: AlicizationMemoryDeliberationSelectedBundle[]
  selectedChains: AlicizationMemoryDeliberationSelectedChain[]
  surfacePolicy: AlicizationRecollectionSurfaceMode
  confidence: number
  whyNow: string
  inwardLine: string
  visibleLine?: string | null
  followUpAffordance?: AlicizationMemoryFollowUpAffordance | null
}

export interface AlicizationMemoryUpsertTrace {
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: 'user-turn' | 'subconscious-proactive' | 'system'
  trigger?: 'batch' | 'idle' | 'force' | 'manual' | null
  batchSize?: number | null
  extractedCount?: number | null
  batchPriority?: {
    max: number
    min: number
    avg: number
  } | null
}

export type AlicizationRealtimeCategory = 'weather' | 'news' | 'finance' | 'sports'

export interface AlicizationRealtimeExecutePayload {
  category: AlicizationRealtimeCategory
  query: string
  locale?: string
  now?: number
}

export interface AlicizationRealtimeSurfaceField {
  label: string
  value: string
}

export interface AlicizationRealtimeSurfaceItem {
  title: string
  meta?: string | null
  url?: string | null
}

export interface AlicizationRealtimeSurface {
  kind: AlicizationRealtimeCategory | 'generic'
  title?: string | null
  lead?: string | null
  fields?: AlicizationRealtimeSurfaceField[] | null
  items?: AlicizationRealtimeSurfaceItem[] | null
}

export interface AlicizationRealtimeExecuteResult {
  category: AlicizationRealtimeCategory
  source: 'builtin'
  ok: boolean
  summary?: string
  surface?: AlicizationRealtimeSurface | null
  data?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
  durationMs: number
}

export type AlicizationSystemProbeDegradeReason
  = | 'battery-unavailable'
    | 'cpu-unavailable'
    | 'memory-unavailable'

export interface AlicizationSystemProbeSample {
  collectedAt: number
  time: {
    iso: string
    local: string
    timezone: string
  }
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
    pid?: number | null
  }
  battery?: {
    percent: number
    charging: boolean
    source: 'native' | 'fallback'
  }
  cpu: {
    usagePercent: number
    windowMs: number
  }
  memory: {
    freeMB: number
    totalMB: number
    usagePercent: number
  }
  degraded?: AlicizationSystemProbeDegradeReason[]
}

export type AlicizationSensoryCapturePermission = 'granted' | 'denied' | 'prompt' | 'unknown'
export type AlicizationSensoryCaptureHealth = 'healthy' | 'degraded' | 'unavailable'
export type AlicizationSensoryCaptureLeaseStatus = 'idle' | 'leased'

export interface AlicizationSensoryCaptureSnapshot {
  health: AlicizationSensoryCaptureHealth
  permission: AlicizationSensoryCapturePermission
  sessionPhase: string | null
  sessionReason: string | null
  selectedSourceId: string | null
  currentSourceId: string | null
  sourcePreference: string | null
  sourceCount: number | null
  leaseStatus: AlicizationSensoryCaptureLeaseStatus
  leaseSourceId: string | null
  lastUpdatedAt: number | null
  lastError: string | null
  degradedReasons: string[]
}

export interface AlicizationSensoryCacheSnapshot {
  sample: AlicizationSystemProbeSample
  stale: boolean
  ageMs: number
  nextTickAt: number | null
  running: boolean
  capture?: AlicizationSensoryCaptureSnapshot | null
}

export interface AlicizationExecutionRuntimeContextForegroundWindow {
  appName?: string
  processName?: string
  title?: string
}

export interface AlicizationExecutionRuntimeContextCapture {
  health: AlicizationSensoryCaptureHealth | null
  permission: AlicizationSensoryCapturePermission | null
  sourceCount: number | null
  lastUpdatedAt: number | null
  lastError: string | null
  degradedReasons: string[]
}

export interface AlicizationExecutionRuntimeContextSensory {
  collectedAt: number | null
  running: boolean
  stale: boolean
  ageMs: number
  foregroundWindow: AlicizationExecutionRuntimeContextForegroundWindow | null
  capture: AlicizationExecutionRuntimeContextCapture | null
}

export type AlicizationExecutionRuntimeContextActionKind = 'executor' | 'mcp' | 'runtime' | 'sensory'
export type AlicizationExecutionRuntimeContextActionStatus = 'completed' | 'failed' | 'pending'

export interface AlicizationExecutionRuntimeContextActionDigest {
  kind: AlicizationExecutionRuntimeContextActionKind
  status: AlicizationExecutionRuntimeContextActionStatus
  label: string
  summary: string | null
}

export interface AlicizationExecutionRuntimeContext {
  generatedAt: number
  cardId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  agentSessionId?: string | null
  recentActions?: AlicizationExecutionRuntimeContextActionDigest[] | null
  sensory: AlicizationExecutionRuntimeContextSensory
}

export type AlicizationExecutionTurnOrigin = 'user-turn' | 'subconscious-proactive' | 'system'

export type AlicizationExecutionChannel
  = | 'cli'
    | 'codex'
    | 'claude-code'
    | 'openclaw'
    | 'openfang'
    | 'browser'
    | 'software'
    | 'desktop'

export type AlicizationExecutionTaskKind
  = | 'run-command'
    | 'codebase-edit'
    | 'codebase-investigation'
    | 'browser-automation'
    | 'software-automation'
    | 'desktop-automation'
    | 'agent-delegation'
    | 'mixed'
    | 'unknown'

export type AlicizationTaskThreadStatus
  = | 'planned'
    | 'needs-affirmation'
    | 'running'
    | 'paused'
    | 'blocked'
    | 'completed'
    | 'failed'
    | 'cancelled'

export type AlicizationExecutionEventKind
  = | 'plan'
    | 'dispatch'
    | 'step'
    | 'result'
    | 'cancel'
    | 'resume'
    | 'takeover'

export interface AlicizationTaskThreadUpsertInput {
  id?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: AlicizationExecutionTurnOrigin
  goal: string
  kind: AlicizationExecutionTaskKind
  status: AlicizationTaskThreadStatus
  selectedChannel?: AlicizationExecutionChannel | null
  proposedChannel?: AlicizationExecutionChannel | null
  summary?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: number
  updatedAt?: number
  lastEventAt?: number | null
  completedAt?: number | null
}

export interface AlicizationTaskThreadRecord {
  id: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  origin: AlicizationExecutionTurnOrigin
  goal: string
  kind: AlicizationExecutionTaskKind
  status: AlicizationTaskThreadStatus
  selectedChannel: AlicizationExecutionChannel | null
  proposedChannel: AlicizationExecutionChannel | null
  summary: string | null
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  lastEventAt: number | null
  completedAt: number | null
}

export type AlicizationExecutorSessionStatus
  = | 'active'
    | 'running'
    | 'failed'
    | 'suspended'

export interface AlicizationExecutorSessionUpsertInput {
  id?: string | null
  channel: AlicizationExecutionChannel
  affinityKey: string
  externalSessionId?: string | null
  status?: AlicizationExecutorSessionStatus
  summary?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: number
  updatedAt?: number
  lastUsedAt?: number | null
}

export interface AlicizationExecutorSessionRecord {
  id: string
  channel: AlicizationExecutionChannel
  affinityKey: string
  externalSessionId: string | null
  status: AlicizationExecutorSessionStatus
  summary: string | null
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  lastUsedAt: number | null
}

export interface AlicizationListExecutorSessionsInput {
  channel?: AlicizationExecutionChannel | AlicizationExecutionChannel[]
  affinityKey?: string
  status?: AlicizationExecutorSessionStatus | AlicizationExecutorSessionStatus[]
  limit?: number
}

export interface AlicizationListTaskThreadsInput {
  decisionTraceId?: string
  turnId?: string
  sessionId?: string
  status?: AlicizationTaskThreadStatus | AlicizationTaskThreadStatus[]
  limit?: number
}

export interface AlicizationExecutionEventInput {
  threadId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: AlicizationExecutionTurnOrigin
  channel?: AlicizationExecutionChannel | null
  kind: AlicizationExecutionEventKind
  threadStatus?: AlicizationTaskThreadStatus | null
  payload?: Record<string, unknown> | null
  createdAt?: number
}

export interface AlicizationExecutionEventRecord {
  id: string
  threadId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  origin: AlicizationExecutionTurnOrigin
  channel: AlicizationExecutionChannel | null
  kind: AlicizationExecutionEventKind
  threadStatus: AlicizationTaskThreadStatus | null
  payload: Record<string, unknown> | null
  createdAt: number
}

export interface AlicizationAppendExecutionEventsInput {
  events: AlicizationExecutionEventInput[]
}

export interface AlicizationListExecutionEventsInput {
  threadId?: string
  decisionTraceId?: string
  turnId?: string
  limit?: number
}

export type AlicizationClawTaskOrigin = 'user' | 'proactive' | 'system'
export type AlicizationClawTaskEffect = 'observe' | 'mutate' | 'high-impact'
export type AlicizationClawPermissionMode = 'none' | 'implicit' | 'explicit'
export type AlicizationClawJustification = 'weak' | 'grounded' | 'explicit'
export type AlicizationClawRiskBudget = 'low' | 'medium' | 'high'
export type AlicizationClawInvasiveness = 'low' | 'medium' | 'high'
export type AlicizationClawFabricDecisionState = 'routed' | 'needs-affirmation' | 'blocked'

export interface AlicizationChannelCapability {
  channel: AlicizationExecutionChannel
  available?: boolean
  enabled?: boolean
  ready?: boolean
  sessionAffinity?: boolean
  reason?: string | null
}

export interface AlicizationChannelCapabilityManifestUpsertInput extends AlicizationChannelCapability {
  metadata?: Record<string, unknown> | null
  createdAt?: number
  updatedAt?: number
  lastCheckedAt?: number | null
}

export interface AlicizationChannelCapabilityManifestRecord {
  channel: AlicizationExecutionChannel
  available: boolean
  enabled: boolean
  ready: boolean
  sessionAffinity: boolean
  reason: string | null
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  lastCheckedAt: number | null
}

export interface AlicizationListChannelCapabilityManifestsInput {
  channel?: AlicizationExecutionChannel | AlicizationExecutionChannel[]
  available?: boolean
  enabled?: boolean
  ready?: boolean
  limit?: number
}

export interface AlicizationClawTaskIntent {
  kind: AlicizationExecutionTaskKind
  goal: string
  origin?: AlicizationClawTaskOrigin
  effect?: AlicizationClawTaskEffect
  permissionMode?: AlicizationClawPermissionMode
  justification?: AlicizationClawJustification
  riskBudget?: AlicizationClawRiskBudget
  requestedChannel?: AlicizationExecutionChannel | null
  requiresVisualGrounding?: boolean
  prefersPersistentSession?: boolean
}

export interface AlicizationClawFabricCandidateAssessment {
  channel: AlicizationExecutionChannel
  available: boolean
  eligible: boolean
  score: number
  invasiveness: AlicizationClawInvasiveness
  reasons: string[]
  blockedReasons: string[]
}

export interface AlicizationClawFabricPlan {
  state: AlicizationClawFabricDecisionState
  selectedChannel: AlicizationExecutionChannel | null
  proposedChannel: AlicizationExecutionChannel | null
  preferredChannels: AlicizationExecutionChannel[]
  fallbackChannels: AlicizationExecutionChannel[]
  candidates: AlicizationClawFabricCandidateAssessment[]
  reasonTags: string[]
  narrative: string[]
  affirmationReasonCodes: string[]
  blockedReasonCodes: string[]
}

export interface AlicizationTaskThreadPlanningTrace {
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: AlicizationExecutionTurnOrigin
}

export interface AlicizationPlanTaskThreadInput {
  threadId?: string | null
  trace?: AlicizationTaskThreadPlanningTrace | null
  task: AlicizationClawTaskIntent
  capabilities?: AlicizationChannelCapability[]
}

export interface AlicizationPlanTaskThreadResult {
  thread: AlicizationTaskThreadRecord
  plan: AlicizationClawFabricPlan
  createdEventKinds: AlicizationExecutionEventKind[]
}

export interface AlicizationCliCommandInput {
  command: string
  args?: string[]
  cwd?: string | null
  timeoutMs?: number | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export type AlicizationCodexSandboxMode = 'read-only' | 'workspace-write'

export interface AlicizationCodexCommandInput {
  prompt: string
  cwd?: string | null
  timeoutMs?: number | null
  model?: string | null
  profile?: string | null
  sandbox?: AlicizationCodexSandboxMode | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export type AlicizationClaudeCodePermissionMode
  = | 'default'
    | 'acceptEdits'
    | 'bypassPermissions'
    | 'delegate'
    | 'dontAsk'
    | 'plan'

export interface AlicizationClaudeCodeCommandInput {
  prompt: string
  cwd?: string | null
  timeoutMs?: number | null
  model?: string | null
  allowTools?: boolean | null
  permissionMode?: AlicizationClaudeCodePermissionMode | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export interface AlicizationOpenClawContentPart {
  type: 'text' | 'image' | 'audio' | 'file' | 'video'
  text?: string
  image_url?: string
  video_url?: string
  data?: string
  format?: string
  file_url?: string
  filename?: string
  file_id?: string
}

export interface AlicizationOpenClawCommandInput {
  instruction: string
  sessionId?: string | null
  sessionAffinityKey?: string | null
  senderId?: string | null
  roleName?: string | null
  channelId?: string | null
  conversationId?: string | null
  timeoutMs?: number | null
  contentParts?: AlicizationOpenClawContentPart[] | null
  images?: Array<string | Record<string, unknown>> | null
  audios?: Array<string | Record<string, unknown>> | null
  files?: Array<string | Record<string, unknown>> | null
  meta?: Record<string, unknown> | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export interface AlicizationDispatchTaskThreadInput {
  threadId: string
  cli?: AlicizationCliCommandInput | null
  codex?: AlicizationCodexCommandInput | null
  claudeCode?: AlicizationClaudeCodeCommandInput | null
  openclaw?: AlicizationOpenClawCommandInput | null
}

export interface AlicizationDispatchTaskThreadResult {
  thread: AlicizationTaskThreadRecord
  createdEventKinds: AlicizationExecutionEventKind[]
  ok: boolean
  summary: string
  output?: string | null
  errorCode?: string
  errorMessage?: string
}

export type AlicizationAnswerAct
  = | 'answer'
    | 'guide'
    | 'ask-reground'
    | 'correct-stale-anchor'
    | 'care'
    | 'defer'

export type AlicizationAnswerEvidenceMode
  = | 'live-grounded'
    | 'live-observed'
    | 'coarse-held'
    | 'dialogue-grounded'
    | 'continuity-carry'
    | 'repair-first'

export type AlicizationMindKernelMode = 'orienting' | 'tracking' | 'repairing' | 'accompanying' | 'guarding' | 'resting'
export type AlicizationEmbodiedPresenceState = 'none' | 'glance' | 'attentive' | 'hesitant' | 'concerned'
export type AlicizationEmotionalTension
  = | 'tense-debug'
    | 'focused-flow'
    | 'soft-covision'
    | 'late-night-drain'
    | 'restless-switching'
    | 'calm-browse'
export type AlicizationResidentPerformanceSource = 'main-runtime' | 'browser-fallback'

export interface AlicizationResidentPerformanceSnapshot {
  version: 'resident-performance-v1'
  source: AlicizationResidentPerformanceSource
  performance: AlicizationDialoguePerformancePayload
  embodiedPresence: AlicizationEmbodiedPresenceState
  stance: 'observe' | 'accompany' | 'nudge' | 'care' | 'warn' | 'uncertain' | null
  emotionalTension: AlicizationEmotionalTension | null
  confidence: number
  reasonTags: string[]
  signature: string
  updatedAt: number
}

export type AlicizationMindTurnMode = 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
export type AlicizationMindTruthState
  = | 'live-grounded'
    | 'live-observed'
    | 'dialogue-grounded'
    | 'remembered'
    | 'imagined'
    | 'uncertain'
export type AlicizationMindRelationshipPosture = 'restrained' | 'warm' | 'tender'
export type AlicizationMindAnswerSubject = 'alicization-self' | 'relationship' | 'host-state' | 'task-knot' | 'visible-scene' | 'general'
export type AlicizationMindScreenReferenceMode = 'required' | 'helpful' | 'incidental' | 'avoid'
export type AlicizationVisibleReplyAuthority = 'llm-mind' | 'llm-second-pass-rewrite' | 'governed-repair-fallback' | 'local-deterministic-fallback'
export interface AlicizationVisibleReplyRewriteRequest {
  required: boolean
  authority: 'llm-second-pass-rewrite'
  reasonCodes: string[]
  mustPreserve: string[]
  mustDrop: string[]
  surfaceContract: string | null
  memoryTruthDiscipline: string | null
  fallbackPatternId?: string | null
}
export type AlicizationDialogueActKernelTruthMode = AlicizationAnswerEvidenceMode | 'memory-only'

export interface AlicizationDialogueActKernelEvidence {
  kind: 'scene' | 'thread' | 'project' | 'host-goal' | 'reply-motive' | 'private-thought' | 'repair' | 'memory'
  source: 'current-scene' | 'dialogue-world-thread' | 'conversation-state' | 'answer-compiler' | 'answer-planner' | 'reply-deliberation' | 'private-thought' | 'appraisal' | 'world-model'
  summary: string
  confidence: number
}

export interface AlicizationDialogueActKernelSnapshot {
  subject: AlicizationMindAnswerSubject
  hostGoal: string
  relationNeed: string
  activeProject?: string | null
  truthMode: AlicizationDialogueActKernelTruthMode
  speechAct: AlicizationAnswerAct
  turnMode: AlicizationMindTurnMode
  screenReferenceMode: AlicizationMindScreenReferenceMode
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

export type AlicizationClaimSpecificityBudget = 'dialogue-only' | 'coarse-scene' | 'grounded-artifacts'

export interface AlicizationClaimEvidenceLedgerSnapshot {
  subject: AlicizationMindAnswerSubject
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

export interface AlicizationMindTurnFrameWorldSnapshot {
  activeThread?: string | null
  visibleSurface?: string | null
  truthState: AlicizationMindTruthState
  truthBoundary?: string | null
  continuityPolicy?: 'stay-on-thread' | 'answer-then-carry' | 'scene-before-memory' | 'dialogue-before-scene' | null
  continuitySummary?: string | null
  staleRisk: number
}

export interface AlicizationMindTurnFrameRelationSnapshot {
  subject: AlicizationMindAnswerSubject
  hostMove?: string | null
  hostGoal?: string | null
  relationNeed?: string | null
  relationMove?: string | null
  relationshipPosture?: AlicizationMindRelationshipPosture | null
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
  stance?: 'observe' | 'accompany' | 'nudge' | 'care' | 'warn' | 'uncertain' | null
  mindMode?: AlicizationMindKernelMode | null
  dominantDrive?: string | null
  embodiedPresence?: AlicizationEmbodiedPresenceState
  emotionalTension?: AlicizationEmotionalTension
  initiativeAction?: string | null
  thought?: string | null
}

export interface AlicizationMindTurnFrameObligationSnapshot {
  shouldSpeak: boolean
  speechObligation?: string | null
  answerAct?: AlicizationAnswerAct | null
  responseMode?: string | null
  turnMode: AlicizationMindTurnMode
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

export interface AlicizationMindTurnGovernance {
  decisionTraceId?: string | null
  turnMode: AlicizationMindTurnMode
  truthState: AlicizationMindTruthState
  visibleReplyAuthority?: AlicizationVisibleReplyAuthority | null
  groundedThisTurn?: boolean
  personaKernelMode: 'full' | 'backgrounded' | 'muted'
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  relationshipPosture: AlicizationMindRelationshipPosture
  answerSubject?: AlicizationMindAnswerSubject | null
  screenReferenceMode?: AlicizationMindScreenReferenceMode | null
  answerAct?: AlicizationAnswerAct | null
  evidenceMode?: AlicizationAnswerEvidenceMode | null
  repairState: 'none' | 'stale-anchor' | 'need-reground'
  liveSurface?: string | null
  focusAnchor?: string | null
  answerIntent?: string | null
  openingMove?: string | null
  carriedThread?: string | null
  suppressAssociativeRecall: boolean
  labelCarryAsMemory: boolean
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
  maxSentences: number
  mindMode?: AlicizationMindKernelMode | null
  embodiedPresence?: AlicizationEmbodiedPresenceState
  emotionalTension?: AlicizationEmotionalTension
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  mindTurnFrame?: AlicizationMindTurnFrameSnapshot | null
  claimEvidence?: AlicizationClaimEvidenceLedgerSnapshot | null
  mustDo: string[]
  mustNotDo: string[]
}

export type AlicizationMindTurnEventKind
  = | 'governance-normalized'
    | 'recall-attribution'
    | 'memory-deliberation-judged'
    | 'memory-recall-withheld'
    | 'memory-stable-core-surfaced'
    | 'memory-followup-deferred'
    | 'memory-wrong-thread-suppressed'
    | 'takeover-audit'
    | 'persistence-written'
    | 'dialogue-emitted'
    | 'reply-memory-coherence'
    | 'memory-facts-upserted'
    | 'memory-reconsolidated'
    | 'person-state-updated'
    | 'learning-executed'

export interface AlicizationMindTurnEventInput {
  decisionTraceId: string
  turnId?: string | null
  sessionId?: string | null
  origin?: 'user-turn' | 'subconscious-proactive' | 'system'
  kind: AlicizationMindTurnEventKind
  payload?: Record<string, unknown> | null
  createdAt?: number
}

export interface AlicizationMindTurnEventRecord {
  id: string
  decisionTraceId: string
  turnId: string | null
  sessionId: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  kind: AlicizationMindTurnEventKind
  payload: Record<string, unknown> | null
  createdAt: number
}

export interface AlicizationMindParticipationSnapshot {
  mindParticipation: number
  memoryParticipation: number
  personalityParticipation: number
  relationshipParticipation: number
  continuityParticipation: number
  summary: string
}

export interface AlicizationListMindTurnEventsInput {
  decisionTraceId?: string
  turnId?: string
  activeThreadId?: string
  kind?: AlicizationMindTurnEventKind
  limit?: number
}

export interface AlicizationListLearningArtifactLedgerInput {
  decisionTraceId?: string
  turnId?: string
  taskId?: string
  artifactId?: string
  claimId?: string
  sourceFactId?: string
  limit?: number
}

export interface AlicizationListMemoryDecisionTracesInput {
  decisionTraceId?: string
  turnId?: string
  activeThreadId?: string
  limit?: number
}

export interface AlicizationListPersonStateUpdatesInput {
  decisionTraceId?: string
  turnId?: string
  limit?: number
}

export type AlicizationReplayBenchmarkPackId =
  | 'default-humanlike-memory-v1'
  | 'sampled-humanlike-memory-v1'
  | 'backlog-humanlike-memory-v1'
  | 'growth-humanlike-memory-v1'
  | 'adversarial-humanlike-memory-v2'
export type AlicizationReplayBenchmarkQualityStatus = 'pass' | 'fail' | 'not-applicable'

export interface AlicizationReplayMemoryQualityRecord {
  turnId: string
  userText: string
  eraFirst: AlicizationReplayBenchmarkQualityStatus
  bundleCoherence: AlicizationReplayBenchmarkQualityStatus
  resolutionLedgerQuality: AlicizationReplayBenchmarkQualityStatus
  procedureCarryQuality: AlicizationReplayBenchmarkQualityStatus
  wrongThreadSuppression: AlicizationReplayBenchmarkQualityStatus
  replyMemoryCoherence: AlicizationReplayBenchmarkQualityStatus
  reconsolidationEffect: AlicizationReplayBenchmarkQualityStatus
  uncertaintyDiscipline: AlicizationReplayBenchmarkQualityStatus
  implicitRecallQuality: AlicizationReplayBenchmarkQualityStatus
  temporalScopeFlexibility: AlicizationReplayBenchmarkQualityStatus
  recentOnlyDrift: AlicizationReplayBenchmarkQualityStatus
  surfaceRestraint: AlicizationReplayBenchmarkQualityStatus
  relationshipRepairAdaptation: AlicizationReplayBenchmarkQualityStatus
  closenessLadderDrift: AlicizationReplayBenchmarkQualityStatus
  eventGraphRecallCollapse: AlicizationReplayBenchmarkQualityStatus
  knowledgeCorrectionDiscipline: AlicizationReplayBenchmarkQualityStatus
  repeatedMistakeAvoidance: AlicizationReplayBenchmarkQualityStatus
  hostUnderstandingGrowth: AlicizationReplayBenchmarkQualityStatus
  skillInternalizationGrowth: AlicizationReplayBenchmarkQualityStatus
  selfRevisionGrowth: AlicizationReplayBenchmarkQualityStatus
  learningRevisionDiscipline: AlicizationReplayBenchmarkQualityStatus
  domainInternalizationDiscipline: AlicizationReplayBenchmarkQualityStatus
  worldModelValidationDiscipline: AlicizationReplayBenchmarkQualityStatus
  dialogueRhythmStability: AlicizationReplayBenchmarkQualityStatus
  emptyCareRate: AlicizationReplayBenchmarkQualityStatus
  repairMechanicalRate: AlicizationReplayBenchmarkQualityStatus
  warmthTemplateRisk: AlicizationReplayBenchmarkQualityStatus
  relationshipDistanceJumpRate: AlicizationReplayBenchmarkQualityStatus
  afterglowFalseCarryRate: AlicizationReplayBenchmarkQualityStatus
  templateLeakage: AlicizationReplayBenchmarkQualityStatus
}

export interface AlicizationReplayBenchmarkStandardsRecord {
  eraSelectionQuality: 'pass' | 'fail'
  resolutionLedgerQuality: 'pass' | 'fail'
  procedureCarryQuality: 'pass' | 'fail'
  wrongThreadSuppression: 'pass' | 'fail'
  replyMemoryCoherence: 'pass' | 'fail'
  implicitRecallQuality: 'pass' | 'fail'
  temporalScopeFlexibility: 'pass' | 'fail'
  recentOnlyDrift: 'pass' | 'fail'
  surfaceRestraint: 'pass' | 'fail'
  relationshipRepairAdaptation: 'pass' | 'fail'
  closenessLadderDrift: 'pass' | 'fail'
  eventGraphRecallCollapse: 'pass' | 'fail'
  knowledgeCorrectionDiscipline: 'pass' | 'fail'
  repeatedMistakeAvoidance: 'pass' | 'fail'
  hostUnderstandingGrowth: 'pass' | 'fail'
  skillInternalizationGrowth: 'pass' | 'fail'
  selfRevisionGrowth: 'pass' | 'fail'
  learningRevisionDiscipline: 'pass' | 'fail'
  domainInternalizationDiscipline: 'pass' | 'fail'
  worldModelValidationDiscipline: 'pass' | 'fail'
  dialogueRhythmStability: 'pass' | 'fail'
  emptyCareRate: 'pass' | 'fail'
  repairMechanicalRate: 'pass' | 'fail'
  warmthTemplateRisk: 'pass' | 'fail'
  relationshipDistanceJumpRate: 'pass' | 'fail'
  afterglowFalseCarryRate: 'pass' | 'fail'
  templateLeakage: 'pass' | 'fail'
}

export interface AlicizationReplayBenchmarkGateDimensionReport {
  key: keyof AlicizationReplayBenchmarkStandardsRecord
  status: 'pass' | 'fail'
  applicableCount: number
  passedCount: number
  minimumPassingRatio: number
  passedRatio: number
  failingTurnIds: string[]
}

export interface AlicizationReplayBenchmarkGateReport {
  passed: boolean
  failingKeys: Array<keyof AlicizationReplayBenchmarkStandardsRecord>
  dimensions: AlicizationReplayBenchmarkGateDimensionReport[]
  standards: AlicizationReplayBenchmarkStandardsRecord
}

export interface AlicizationReplayBenchmarkTelemetryPatch {
  retrievalHealth: {
    semanticLatencyMs: number | null
    graphLatencyMs: number | null
    reconstructionFrequency: number
    reconstructedCount: number
    budgetClassCounts?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>
    budgetLatencyTelemetry?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', {
      sampleCount: number
      p50LatencyMs: number | null
      p95LatencyMs: number | null
      maxLatencyMs: number | null
      gateStatus: 'unknown' | 'pass' | 'warn' | 'fail'
      targetP95Ms: number
    }>>
    hotKeyHitRatio?: number
    hotKeyCoverage?: number
    hotKeyCandidates?: string[]
    hotKeyStats?: Array<{
      key: string
      candidateCount: number
      hitCount: number
      winCount: number
      missCount: number
    }>
    hotKeyActiveCount?: number
    hotKeyWinCount?: number
    hotKeyMissCount?: number
    recallHitRate?: number
    recallMissRate?: number
    wrongThreadRate?: number
    suppressionHitRate?: number
    wrongThreadPreventedCount?: number
    falsePositiveSuppressionRate?: number
    staleSelfModelVetoRate?: number
    relationshipEraConfusionRate?: number
    reconstructionErrorRate?: number
    stableCoreOnlyRate?: number
    memorySurfaceViolationRate?: number
    templateLeakageFailCount: number
    emptyCareRate?: number
    repairMechanicalRate?: number
    warmthTemplateRisk?: number
    relationshipDistanceJumpRate?: number
    afterglowFalseCarryRate?: number
    mindParticipation?: number
    memoryParticipation?: number
    personalityParticipation?: number
    relationshipParticipation?: number
    continuityParticipation?: number
    learningTaskCompletionCount?: number
    learningTaskFailureCount?: number
    learningTaskBlockedCount?: number
    learningTaskReopenedCount?: number
    learningTaskDowngradedCount?: number
    learningTaskCancelledCount?: number
    learningRelationshipReviseCount?: number
    learningSelfModelReviseCount?: number
    learningWorldModelValidationCount?: number
    learningWorldModelFalseInternalizationCount?: number
    learningTaskCompletionRate?: number
    learningTaskFailureRate?: number
    learningTaskReopenRecoveryRate?: number
    misinternalizationRate?: number
    relationshipCadenceRegressionRate?: number
    selfModelStaleBeliefRate?: number
    recallAt1?: number
    recallAt3?: number
    precisionAt3?: number
    wrongThreadSuppression?: number
    claimAccuracy?: number
    replyAuthorityAccuracy?: number
    latencyBudgetPass?: boolean
  }
}

export interface AlicizationReplayBenchmarkTracePointer {
  kind: 'decision-trace' | 'synthetic-pack-turn'
  packId: AlicizationReplayBenchmarkPackId
  turnId: string
  decisionTraceId: string | null
  sessionId: string | null
  activeThreadId: string | null
}

export interface AlicizationReplayBenchmarkFailureTurnRecord {
  turnId: string
  userText: string
  failingDimensions: Array<keyof AlicizationReplayBenchmarkStandardsRecord>
  tracePointer: AlicizationReplayBenchmarkTracePointer
  sampledCategories?: string[] | null
  paritySummary?: {
    version: 'browser-main-parity-v1'
    passed: boolean
    comparedFieldCount: number
    divergentFieldCount: number
    divergentLayers: Array<'bundle' | 'learning-execution' | 'affective-residue' | 'latency-policy' | 'resolution-ledger' | 'situation-candidates' | 'claim-evidence' | 'learning-causal-chain'>
    firstDivergentLayer: 'bundle' | 'learning-execution' | 'affective-residue' | 'latency-policy' | 'resolution-ledger' | 'situation-candidates' | 'claim-evidence' | 'learning-causal-chain' | null
    divergentFields: Array<{
      field: string
      mainValue: string | null
      browserValue: string | null
      layer: 'bundle' | 'learning-execution' | 'affective-residue' | 'latency-policy' | 'resolution-ledger' | 'situation-candidates' | 'claim-evidence' | 'learning-causal-chain'
      severity: 'warn' | 'fail'
    }>
    summary: string
  } | null
  resolutionLedgerSummary?: {
    dominantClusterSummary: string | null
    competingClusterSummary: string | null
    finalSurfacePolicy: string | null
    shouldStayInward: boolean
    shouldDelayUntilAfterPayoff: boolean
    rejectedCandidateCount: number
    suppressionTags?: string[]
  } | null
  memorySituationCandidateSummary?: {
    selected: string[]
    rejected: string[]
    delayed: string[]
    unresolved: string[]
  } | null
}

export interface AlicizationReplayBenchmarkDatasetFeedback {
  backlogKey: string
  appendedCount: number
  totalCount: number
  persisted: boolean
  humanRatingRubric?: AlicizationReplayHumanRatingRubric | null
  driftSignals?: Array<keyof AlicizationReplayBenchmarkStandardsRecord | 'recentOnlyDrift' | 'closenessLadderDrift' | 'eventGraphRecallCollapse'> | null
  paritySummary?: {
    comparedTurnCount: number
    parityPassCount: number
    parityFailCount: number
    parityPassRate: number
    firstDivergentLayerCounts: Partial<Record<'bundle' | 'learning-execution' | 'affective-residue' | 'latency-policy' | 'resolution-ledger' | 'situation-candidates' | 'claim-evidence' | 'learning-causal-chain', number>>
  } | null
}

export interface AlicizationReplayHumanRatingDimension {
  key:
    | 'samePersonaFeel'
    | 'realRememberedFeel'
    | 'templateSmell'
    | 'relationshipRhythm'
    | 'repairCredibility'
    | 'taskContinuity'
  label: string
  prompt: string
  scale: '1-5'
}

export interface AlicizationReplayHumanRatingRubric {
  version: 'human-rating-rubric-v1'
  dimensions: AlicizationReplayHumanRatingDimension[]
}

export interface AlicizationReplayBenchmarkShipGateRow {
  key: 'benchmark-gate' | 'human-rating-gate' | 'latency-gate' | 'wrong-thread-gate' | 'self-model-suppression-gate' | 'relationship-era-suppression-gate' | 'template-leakage-gate' | 'learning-domain-gate' | 'browser-main-parity-gate'
  status: 'pass' | 'fail'
  detail: string
}

export interface AlicizationReplayBenchmarkTriageRow {
  dimension: keyof AlicizationReplayBenchmarkStandardsRecord
  owner: 'memory retrieval' | 'planner' | 'evolution' | 'contract' | 'visible realization' | 'proactive parity'
  firstCheck: string
}

export interface AlicizationRunReplayBenchmarkInput {
  packId?: AlicizationReplayBenchmarkPackId
  persistTelemetry?: boolean
  sampleLimit?: number
}

export interface AlicizationRunReplayBenchmarkResult {
  packId: AlicizationReplayBenchmarkPackId
  ranAt: number
  turnCount: number
  quality: AlicizationReplayMemoryQualityRecord[]
  standards: AlicizationReplayBenchmarkStandardsRecord
  gate: AlicizationReplayBenchmarkGateReport
  telemetryPatch: AlicizationReplayBenchmarkTelemetryPatch
  telemetryPersisted: boolean
  failingTurnSet: AlicizationReplayBenchmarkFailureTurnRecord[]
  datasetFeedback: AlicizationReplayBenchmarkDatasetFeedback
  shipGate: AlicizationReplayBenchmarkShipGateRow[]
  regressionTriage: AlicizationReplayBenchmarkTriageRow[]
}

export interface AlicizationMemoryDecisionTraceRecord {
  decisionTraceId: string
  turnId: string | null
  sessionId: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  activeThreadId: string | null
  createdAt: number
  lastUpdatedAt: number
  eventKinds: AlicizationMindTurnEventKind[]
  governance?: {
    turnMode?: string | null
    truthState?: string | null
    repairState?: string | null
    answerSubject?: string | null
    screenReferenceMode?: string | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  } | null
  recallAttribution?: Record<string, unknown> | null
  memoryDeliberationJudged?: Record<string, unknown> | null
  memoryRecallWithheld?: Record<string, unknown> | null
  memoryStableCoreSurfaced?: Record<string, unknown> | null
  memoryFollowUpDeferred?: Record<string, unknown> | null
  memoryWrongThreadSuppressed?: Record<string, unknown> | null
  replyMemoryCoherence?: Record<string, unknown> | null
  persistenceWritten?: Record<string, unknown> | null
  dialogueEmitted?: Record<string, unknown> | null
  takeoverAudit?: Record<string, unknown> | null
  memoryFactsUpserted?: Record<string, unknown> | null
  personStateUpdated?: Record<string, unknown> | null
  learningExecuted?: Record<string, unknown> | null
  participation?: AlicizationMindParticipationSnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  memoryStageReplay?: AlicizationOrganicMemoryStageReplay | null
  memoryResolutionLedger?: AlicizationMemoryResolutionLedger | null
}

export type AlicizationDigitalLifeOperatingMode
  = | 'observing'
    | 'thinking'
    | 'speaking'
    | 'acting'
    | 'remembering'

export type AlicizationDigitalLifeSubsystemId
  = | 'dialogue'
    | 'perception'
    | 'proactive'
    | 'control'
    | 'mind'
    | 'memory'
    | 'runtime'

export interface AlicizationDigitalLifeSpineRuntimeDigest {
  watchMode: string | null
  sceneScenario: string | null
  sceneSummary: string | null
  activeThreadId: string | null
  activeThreadTitle: string | null
  dominantMode: string | null
  dominantDrive: string | null
  answerIntent: string | null
  preferredPresence: string | null
  selectedAction: string | null
  updatedAt: number | null
}

export interface AlicizationDigitalLifeSpineArchitectureDigest {
  operatingMode: AlicizationDigitalLifeOperatingMode | null
  dominantSystem: AlicizationDigitalLifeSubsystemId | null
  supportingSystems: AlicizationDigitalLifeSubsystemId[]
  governingFocus: string | null
  summary: string | null
}

export interface AlicizationDigitalLifeSpineContinuityDigest {
  label: 'digital-life-line'
  summary: string
  signature: string
  createdAt: number
  watchMode: string | null
  sceneScenario: string | null
  activeThreadId: string | null
  dominantMode: string | null
  dominantDrive: string | null
  answerIntent: string | null
  preferredPresence: string | null
}

export interface AlicizationDigitalLifeSpineProactiveDigest {
  selectedAction: string | null
  preferredStyle: string | null
  confidence: number | null
  shouldSpeak: boolean | null
  activeThreadId: string | null
  activeThreadTitle: string | null
  dominantConcernKind: string | null
  dominantConcernSummary: string | null
  leadingGoalId: string | null
  leadingGoalSummary: string | null
  preferredPresence: string | null
}

export interface AlicizationDigitalLifeSpineAutonomyDigest {
  selectedMode: string | null
  visibleAction: string | null
  shouldSurface: boolean | null
  shouldSpeak: boolean | null
  shouldAct: boolean | null
  speakReadiness: number | null
  actReadiness: number | null
  inhibition: number | null
  confidence: number | null
  executionIntentKind: string | null
  executionIntentSummary: string | null
  deferReason: string | null
  whyNow: string | null
  sourceGoalId: string | null
  sourceGoalSummary: string | null
  sourceAgendaKind: string | null
  sourceAgendaSummary: string | null
  sourceThreadId: string | null
  sourceThreadSummary: string | null
}

export type AlicizationLongHorizonMemoryCueInfluence
  = | 'bond'
    | 'boundary'
    | 'care'
    | 'truth'
    | 'play'
    | 'task'
    | 'identity'

export interface AlicizationLongHorizonMemoryCueSnapshot {
  factId: string
  subject: string
  predicate: string
  object: string
  confidence: number
  weight: number
  influenceTags: AlicizationLongHorizonMemoryCueInfluence[]
  summary: string
  lastRecalledAt: number
}

export interface AlicizationLongHorizonMemorySnapshot {
  preferenceBias: {
    companionship: number
    truthfulGrounding: number
    gentleRepair: number
    quietObservation: number
    proactiveCare: number
    playfulIntimacy: number
    autonomyRespect: number
    unfinishedThreadReturn: number
  }
  identityBias: {
    guardedness: number
    tenderness: number
    directness: number
    selfDirection: number
  }
  anchorFacts: AlicizationLongHorizonMemoryCueSnapshot[]
  summary: string
  dominantCueSummary?: string | null
  rememberedPreferenceSummary?: string | null
  rememberedConstraintSummary?: string | null
  rememberedPlanSummary?: string | null
  updatedAt: number
}

export type AlicizationMemoryReflectionSourceKind = 'reply' | 'proactive' | 'execution' | 'maintenance'
export type AlicizationMemoryReflectionTargetScope = 'self' | 'relationship' | 'boundary' | 'truth' | 'task' | 'habit'
export type AlicizationMemoryReflectionStatus = 'pending' | 'confirmed' | 'denied' | 'superseded'

export interface AlicizationMemoryReflectionInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  sourceKind: AlicizationMemoryReflectionSourceKind
  targetScope: AlicizationMemoryReflectionTargetScope
  summary: string
  lesson: string
  status?: AlicizationMemoryReflectionStatus
  confidence: number
  supportingFactIds?: string[] | null
  supportingOutcomeIds?: string[] | null
  createdAt?: number
  updatedAt?: number
  confirmedAt?: number | null
  deniedAt?: number | null
}

export interface AlicizationMemoryReflectionRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationMemoryReflectionSourceKind
  targetScope: AlicizationMemoryReflectionTargetScope
  summary: string
  lesson: string
  status: AlicizationMemoryReflectionStatus
  confidence: number
  supportingFactIds: string[]
  supportingOutcomeIds: string[]
  createdAt: number
  updatedAt: number
  confirmedAt: number | null
  deniedAt: number | null
}

export type AlicizationLearningAction
  = 'record'
    | 'reflect'
    | 'verify'
    | 'revise'
    | 'internalize'

export type AlicizationLearningTaskStatus
  = 'scheduled'
    | 'claimed'
    | 'running'
    | 'blocked'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'downgraded'
    | 'reopened'

export type AlicizationLearningTaskFailureKind
  = 'dependency-missing'
    | 'validation-insufficient'
    | 'runtime-error'
    | 'cancelled'

export interface AlicizationLearningTaskPayload {
  sourceTurnId: string | null
  decisionTraceId: string | null
  sourceSessionId: string | null
  action: AlicizationLearningAction
  reason: string | null
  focuses: string[]
  dominantTrajectory: string | null
  sourceSignals: string[]
  learningReadiness: number
  contradictionPressure: number
  revisionPressure: number
  autobiographicalStability: number
  supportingFactIds: string[]
  supportingReflectionIds: string[]
  supportingOutcomeIds: string[]
  supersedeTargets: string[]
  conflictTargets: string[]
}

export interface AlicizationLearningTaskRecord {
  id: string
  cardId: string
  taskId: string
  status: AlicizationLearningTaskStatus
  triggerAt: number
  action: AlicizationLearningAction
  message: string
  payload: AlicizationLearningTaskPayload
  attemptCount: number
  maxAttempts: number
  createdAt: number
  updatedAt: number
  claimedAt: number | null
  startedAt: number | null
  completedAt: number | null
  blockedAt: number | null
  cancelledAt: number | null
  downgradedAt: number | null
  reopenedAt: number | null
  nextRetryAt: number | null
  sourceTurnId: string | null
  resultSummary: string | null
  failureKind: AlicizationLearningTaskFailureKind | null
  lastError: string | null
  firedTurnId: string | null
}

export interface AlicizationLearningExecutionStateSnapshot {
  currentTaskId: string | null
  currentStatus: AlicizationLearningTaskStatus | null
  currentAttemptCount: number
  currentMaxAttempts: number
  currentNextRetryAt: number | null
  currentBlockedReason: string | null
  currentFailureKind: AlicizationLearningTaskFailureKind | null
  nextLearningAction: AlicizationLearningAction | 'hold' | null
  shouldRecord: boolean
  shouldReflect: boolean
  shouldVerify: boolean
  shouldRevise: boolean
  shouldInternalize: boolean
  activeLearningFocuses: string[]
  queuedTaskCount: number
  runningTaskCount: number
  blockedTaskCount: number
  recentTaskIds: string[]
  lastCompletedTaskId: string | null
  lastCompletedAction: AlicizationLearningAction | null
  lastCompletedSummary: string | null
  lastFailureTaskId: string | null
  lastFailureKind: AlicizationLearningTaskFailureKind | null
  lastFailureReason: string | null
  lastFailureNextRetryAt: number | null
  updatedAt: number | null
}

export type AlicizationRelationshipOutcomeSourceKind = 'reply' | 'proactive' | 'execution'

export interface AlicizationRelationshipOutcomeInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  actionSummary: string
  closenessDelta: number
  trustDelta: number
  burdenDelta: number
  boundaryDelta: number
  misreadDelta: number
  repairDelta: number
  openLoopDelta: number
  summary: string
  createdAt?: number
}

export interface AlicizationRelationshipOutcomeRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  actionSummary: string
  closenessDelta: number
  trustDelta: number
  burdenDelta: number
  boundaryDelta: number
  misreadDelta: number
  repairDelta: number
  openLoopDelta: number
  summary: string
  createdAt: number
}

export type AlicizationPersonaReinforcementDimension
  = | 'companionship'
    | 'truthful-grounding'
    | 'gentle-repair'
    | 'autonomy-respect'
    | 'unfinished-thread-return'
    | 'temper-guardedness'
    | 'temper-directness'

export type AlicizationPersonaReinforcementValence = 'reinforce' | 'suppress'

export interface AlicizationPersonaReinforcementEventInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  dimension: AlicizationPersonaReinforcementDimension
  delta: number
  valence: AlicizationPersonaReinforcementValence
  summary: string
  createdAt?: number
}

export interface AlicizationPersonaReinforcementEventRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  dimension: AlicizationPersonaReinforcementDimension
  delta: number
  valence: AlicizationPersonaReinforcementValence
  summary: string
  createdAt: number
}

export interface AlicizationPersonStateUpdateSourceTrailEntry {
  kind: 'relationship-outcome' | 'reinforcement'
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  summary: string
  createdAt: number
}

export interface AlicizationPersonStateUpdateRelationshipShift {
  trustDelta: number
  closenessDelta: number
  burdenDelta: number
  boundaryDelta: number
  repairDelta: number
}

export interface AlicizationPersonStateUpdateSurface {
  version: 'person-state-update-surface-v1'
  updatedAt: number
  summary: string
  dominantContexts: string[]
  relationshipShift: AlicizationPersonStateUpdateRelationshipShift
  reinforcementBias: Partial<Record<AlicizationPersonaReinforcementDimension, number>>
  preferenceHints: string[]
  sensitivityHints: string[]
  repairHints: string[]
  burdenHints: string[]
  narrative: string[]
  sourceTrail: AlicizationPersonStateUpdateSourceTrailEntry[]
}

export interface AlicizationPersonStateUpdateRecord extends AlicizationPersonStateUpdateSurface {
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  createdAt: number
  activeThreadId: string | null
  sourceKinds: AlicizationRelationshipOutcomeSourceKind[]
  sourceCounts: {
    relationshipOutcomes: number
    reinforcementEvents: number
    episodicEvents: number
    reflections: number
    memoryFacts: number
  }
}

export type AlicizationPersonStateEvolutionShiftKind
  = | 'trust-shift'
    | 'closeness-shift'
    | 'repair-posture-shift'
    | 'autonomy-shift'
    | 'burden-shift'
    | 'execution-trust-shift'
    | 'relationship-doctrine-shift'

export interface AlicizationPersonStateEvolutionShift {
  kind: AlicizationPersonStateEvolutionShiftKind
  delta: number
  rationale: string
}

export interface AlicizationPersonStateEvolutionEntryInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  activeThreadId?: string | null
  sourceKind: 'relationship-outcome' | 'reinforcement' | 'person-state-update' | 'episodic-memory' | 'reflection'
  summary: string
  contexts?: string[] | null
  relationshipDoctrine?: string | null
  burdenLine?: string | null
  trustMeaning?: string | null
  dominantRung?: string | null
  sourceTrail?: AlicizationPersonStateUpdateSourceTrailEntry[] | null
  shifts: AlicizationPersonStateEvolutionShift[]
  createdAt?: number
}

export interface AlicizationPersonStateEvolutionEntryRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  activeThreadId: string | null
  sourceKind: AlicizationPersonStateEvolutionEntryInput['sourceKind']
  summary: string
  contexts: string[]
  relationshipDoctrine: string | null
  burdenLine: string | null
  trustMeaning: string | null
  dominantRung: string | null
  sourceTrail: AlicizationPersonStateUpdateSourceTrailEntry[]
  shifts: AlicizationPersonStateEvolutionShift[]
  createdAt: number
}

export interface AlicizationPersonStateEvolutionSummary {
  trustShift: number
  closenessShift: number
  repairShift: number
  autonomyShift: number
  burdenShift: number
  executionTrustShift: number
  relationshipDoctrineShift: number
  latestDoctrine: string | null
  latestBurdenLine: string | null
  latestTrustMeaning: string | null
  latestDominantRung: string | null
  recentSummaries: string[]
  explanation: string[]
  updatedAt: number | null
}

export interface AlicizationSelfEvolutionKernelSnapshot {
  version: 'self-evolution-kernel-v1'
  updatedAt: number | null
  evolutionMomentum: number
  learningReadiness: number
  contradictionPressure: number
  revisionPressure: number
  autobiographicalStability: number
  dominantTrajectory: string | null
  relationshipDoctrine: string | null
  latestInflection: string | null
  burdenLine: string | null
  trustMeaning: string | null
  nextLearningAction: 'record' | 'reflect' | 'verify' | 'revise' | 'internalize' | 'hold'
  nextLearningReason: string | null
  shouldRecord: boolean
  shouldReflect: boolean
  shouldVerify: boolean
  shouldRevise: boolean
  shouldInternalize: boolean
  activeLearningFocuses: string[]
  sourceSignals: string[]
  summary: string
}

export type AlicizationAffectiveResidueKind = 'afterglow' | 'repair' | 'burden' | 'trust' | 'rest-protective'

export interface AlicizationAffectiveResidueEntrySnapshot {
  kind: AlicizationAffectiveResidueKind
  intensity: number
  persistence: number
  confidence: number
  polarity: 'warm' | 'protective' | 'strained' | 'neutral'
  releaseMode: 'surface-eligible' | 'mind-only' | 'delay-until-open-window' | 'protect-rest'
  summary: string
  sourceSignals: string[]
  lastUpdatedAt: number | null
}

export interface AlicizationRelationshipCadenceMemorySnapshot {
  cadenceMode: 'cooldown' | 'measured-return' | 'ready-return' | 'warm-hold'
  distancePosture: 'protect-space' | 'measured-room' | 'nearby-soft' | 'warm-near'
  companionshipDensity: number
  repairRecovery: number
  overreachRisk: number
  fatigueGuard: number
  afterglowCarry: number
  shouldDelayWarmth: boolean
  shouldProtectRest: boolean
  reasonTags: string[]
  summary: string
}

export interface AlicizationAffectiveResidueMemorySnapshot {
  version: 'affective-residue-memory-v1'
  updatedAt: number | null
  residues: AlicizationAffectiveResidueEntrySnapshot[]
  dominantResidueKind: AlicizationAffectiveResidueKind | null
  afterglowPressure: number
  repairPressure: number
  burdenPressure: number
  trustPressure: number
  restProtectivePressure: number
  relationshipCadence: AlicizationRelationshipCadenceMemorySnapshot
  sourceSignals: string[]
  summary: string
}

export interface AlicizationRecallLatencyBudgetSnapshot {
  domain: 'procedure' | 'relationship' | 'self-model' | 'world-model' | 'general'
  budgetMs: number
  candidateLimit: number
  hotCacheTtlMs: number
}

export interface AlicizationRecallLatencyPolicySnapshot {
  version: 'recall-latency-policy-v1'
  budgetClass: 'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay'
  latencyClass: 'fast' | 'balanced' | 'deep'
  recallAction: 'shallow-answer' | 'stable-core-only' | 'deep-recall' | 'defer-to-followup' | 'answer-then-supplement'
  degradeReason: string | null
  domainBudgets: AlicizationRecallLatencyBudgetSnapshot[]
  hotPathKey: string | null
  shouldUseHotCache: boolean
  shouldPrefetch: boolean
  shouldAvoidDeepExpansion: boolean
  shouldEmitFollowUpAffordance: boolean
  confidence: number
  reasonTags: string[]
  summary: string
}

export interface AlicizationDerivedMindStateBundle {
  version: 'derived-mind-state-bundle-v1'
  source: 'main-runtime' | 'browser-fallback'
  producedAt: number
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  personStateProjection?: Record<string, unknown> | null
  knowledgeEvidence?: {
    validationCount: number
    contradictionCount: number
    stronglyValidatedProcedureCount: number
    contradictionHeavyFactCount: number
  } | null
  claimEvidenceGraphs?: AlicizationClaimEvidenceGraph[] | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  recallLatencyPolicy?: AlicizationRecallLatencyPolicySnapshot | null
  recollectionIntent?: Record<string, unknown> | null
  recollectionPlan?: Record<string, unknown> | null
  recollectionSpeechPlan?: Record<string, unknown> | null
  memoryDeliberation?: Record<string, unknown> | null
  dialogueRhythm?: {
    activeClosenessContext?: string | null
    activeClosenessRung?: string | null
    relationshipDoctrine?: string | null
    burdenLine?: string | null
    trustMeaning?: string | null
    stabilitySignal?: string | null
  } | null
  summary: string
}

export function normalizeAlicizationDerivedMindStateBundle(raw: unknown): AlicizationDerivedMindStateBundle | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const source = typeof candidate.source === 'string' && (
    candidate.source === 'main-runtime'
    || candidate.source === 'browser-fallback'
  )
    ? candidate.source
    : null
  const producedAt = Number(candidate.producedAt)
  const summary = sanitizeAlicizationDigitalLifeDigestText(candidate.summary, 220)
  if (!source || !Number.isFinite(producedAt))
    return null

  const knowledgeEvidence = candidate.knowledgeEvidence && typeof candidate.knowledgeEvidence === 'object'
    ? candidate.knowledgeEvidence as Record<string, unknown>
    : null
  const claimEvidenceGraphs = Array.isArray(candidate.claimEvidenceGraphs)
    ? candidate.claimEvidenceGraphs.filter(item => item && typeof item === 'object') as AlicizationClaimEvidenceGraph[]
    : null
  const selfEvolution = candidate.selfEvolution && typeof candidate.selfEvolution === 'object'
    ? candidate.selfEvolution as Record<string, unknown>
    : null
  const affectiveResidue = candidate.affectiveResidue && typeof candidate.affectiveResidue === 'object'
    ? candidate.affectiveResidue as Record<string, unknown>
    : null
  const learningExecutionState = candidate.learningExecutionState && typeof candidate.learningExecutionState === 'object'
    ? candidate.learningExecutionState as Record<string, unknown>
    : null
  const recallLatencyPolicy = candidate.recallLatencyPolicy && typeof candidate.recallLatencyPolicy === 'object'
    ? candidate.recallLatencyPolicy as Record<string, unknown>
    : null
  const dialogueRhythm = candidate.dialogueRhythm && typeof candidate.dialogueRhythm === 'object'
    ? candidate.dialogueRhythm as Record<string, unknown>
    : null

  return {
    version: 'derived-mind-state-bundle-v1',
    source,
    producedAt: Math.max(0, Math.floor(producedAt)),
    hostPersonModel: candidate.hostPersonModel && typeof candidate.hostPersonModel === 'object'
      ? candidate.hostPersonModel as AlicizationHostPersonModelSnapshot
      : null,
    personStateProjection: candidate.personStateProjection && typeof candidate.personStateProjection === 'object'
      ? candidate.personStateProjection as Record<string, unknown>
      : null,
    knowledgeEvidence: knowledgeEvidence
      ? {
          validationCount: Math.max(0, Math.floor(Number(knowledgeEvidence.validationCount ?? 0))),
          contradictionCount: Math.max(0, Math.floor(Number(knowledgeEvidence.contradictionCount ?? 0))),
          stronglyValidatedProcedureCount: Math.max(0, Math.floor(Number(knowledgeEvidence.stronglyValidatedProcedureCount ?? 0))),
          contradictionHeavyFactCount: Math.max(0, Math.floor(Number(knowledgeEvidence.contradictionHeavyFactCount ?? 0))),
        }
      : null,
    claimEvidenceGraphs,
    selfEvolution: selfEvolution ? selfEvolution as unknown as AlicizationSelfEvolutionKernelSnapshot : null,
    affectiveResidue: affectiveResidue
      ? {
          version: 'affective-residue-memory-v1',
          updatedAt: Number.isFinite(Number(affectiveResidue.updatedAt)) ? Math.max(0, Math.floor(Number(affectiveResidue.updatedAt))) : null,
          residues: Array.isArray(affectiveResidue.residues)
            ? affectiveResidue.residues
              .map((item) => {
                const entry = item && typeof item === 'object' && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : null
                if (!entry)
                  return null
                const kind = entry.kind === 'afterglow'
                  || entry.kind === 'repair'
                  || entry.kind === 'burden'
                  || entry.kind === 'trust'
                  || entry.kind === 'rest-protective'
                  ? entry.kind
                  : null
                if (!kind)
                  return null
                return {
                  kind,
                  intensity: Math.max(0, Math.min(1, Number(entry.intensity ?? 0))),
                  persistence: Math.max(0, Math.min(1, Number(entry.persistence ?? 0))),
                  confidence: Math.max(0, Math.min(1, Number(entry.confidence ?? 0))),
                  polarity: entry.polarity === 'warm'
                    || entry.polarity === 'protective'
                    || entry.polarity === 'strained'
                    || entry.polarity === 'neutral'
                    ? entry.polarity
                    : 'neutral',
                  releaseMode: entry.releaseMode === 'surface-eligible'
                    || entry.releaseMode === 'mind-only'
                    || entry.releaseMode === 'delay-until-open-window'
                    || entry.releaseMode === 'protect-rest'
                    ? entry.releaseMode
                    : 'mind-only',
                  summary: sanitizeAlicizationDigitalLifeDigestText(entry.summary, 180) || '',
                  sourceSignals: Array.isArray(entry.sourceSignals)
                    ? entry.sourceSignals
                      .map(signal => sanitizeAlicizationDigitalLifeDigestText(signal, 120))
                      .filter(Boolean)
                      .slice(0, 8)
                    : [],
                  lastUpdatedAt: Number.isFinite(Number(entry.lastUpdatedAt)) ? Math.max(0, Math.floor(Number(entry.lastUpdatedAt))) : null,
                } satisfies AlicizationAffectiveResidueEntrySnapshot
              })
              .filter((item): item is AlicizationAffectiveResidueEntrySnapshot => Boolean(item))
              .slice(0, 5)
            : [],
          dominantResidueKind: affectiveResidue.dominantResidueKind === 'afterglow'
            || affectiveResidue.dominantResidueKind === 'repair'
            || affectiveResidue.dominantResidueKind === 'burden'
            || affectiveResidue.dominantResidueKind === 'trust'
            || affectiveResidue.dominantResidueKind === 'rest-protective'
            ? affectiveResidue.dominantResidueKind
            : null,
          afterglowPressure: Math.max(0, Math.min(1, Number(affectiveResidue.afterglowPressure ?? 0))),
          repairPressure: Math.max(0, Math.min(1, Number(affectiveResidue.repairPressure ?? 0))),
          burdenPressure: Math.max(0, Math.min(1, Number(affectiveResidue.burdenPressure ?? 0))),
          trustPressure: Math.max(0, Math.min(1, Number(affectiveResidue.trustPressure ?? 0))),
          restProtectivePressure: Math.max(0, Math.min(1, Number(affectiveResidue.restProtectivePressure ?? 0))),
          relationshipCadence: (() => {
            const cadence = affectiveResidue.relationshipCadence && typeof affectiveResidue.relationshipCadence === 'object'
              ? affectiveResidue.relationshipCadence as Record<string, unknown>
              : null
            return {
              cadenceMode: cadence?.cadenceMode === 'cooldown'
                || cadence?.cadenceMode === 'measured-return'
                || cadence?.cadenceMode === 'ready-return'
                || cadence?.cadenceMode === 'warm-hold'
                ? cadence.cadenceMode
                : 'measured-return',
              distancePosture: cadence?.distancePosture === 'protect-space'
                || cadence?.distancePosture === 'measured-room'
                || cadence?.distancePosture === 'nearby-soft'
                || cadence?.distancePosture === 'warm-near'
                ? cadence.distancePosture
                : 'measured-room',
              companionshipDensity: Math.max(0, Math.min(1, Number(cadence?.companionshipDensity ?? 0))),
              repairRecovery: Math.max(0, Math.min(1, Number(cadence?.repairRecovery ?? 0))),
              overreachRisk: Math.max(0, Math.min(1, Number(cadence?.overreachRisk ?? 0))),
              fatigueGuard: Math.max(0, Math.min(1, Number(cadence?.fatigueGuard ?? 0))),
              afterglowCarry: Math.max(0, Math.min(1, Number(cadence?.afterglowCarry ?? 0))),
              shouldDelayWarmth: cadence?.shouldDelayWarmth === true,
              shouldProtectRest: cadence?.shouldProtectRest === true,
              reasonTags: Array.isArray(cadence?.reasonTags)
                ? cadence.reasonTags
                  .map(signal => sanitizeAlicizationDigitalLifeDigestText(signal, 120))
                  .filter(Boolean)
                  .slice(0, 10)
                : [],
              summary: sanitizeAlicizationDigitalLifeDigestText(cadence?.summary, 200) || '',
            } satisfies AlicizationRelationshipCadenceMemorySnapshot
          })(),
          sourceSignals: Array.isArray(affectiveResidue.sourceSignals)
            ? affectiveResidue.sourceSignals
              .map(signal => sanitizeAlicizationDigitalLifeDigestText(signal, 120))
              .filter(Boolean)
              .slice(0, 12)
            : [],
          summary: sanitizeAlicizationDigitalLifeDigestText(affectiveResidue.summary, 220) || '',
        }
      : null,
    learningExecutionState: learningExecutionState
      ? {
          currentTaskId: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.currentTaskId, 120) || null,
          currentStatus: learningExecutionState.currentStatus === 'scheduled'
            || learningExecutionState.currentStatus === 'claimed'
            || learningExecutionState.currentStatus === 'running'
            || learningExecutionState.currentStatus === 'blocked'
            || learningExecutionState.currentStatus === 'completed'
            || learningExecutionState.currentStatus === 'failed'
            || learningExecutionState.currentStatus === 'cancelled'
            || learningExecutionState.currentStatus === 'downgraded'
            || learningExecutionState.currentStatus === 'reopened'
            ? learningExecutionState.currentStatus
            : null,
          currentAttemptCount: Math.max(0, Math.floor(Number(learningExecutionState.currentAttemptCount ?? 0))),
          currentMaxAttempts: Math.max(0, Math.floor(Number(learningExecutionState.currentMaxAttempts ?? 0))),
          currentNextRetryAt: Number.isFinite(Number(learningExecutionState.currentNextRetryAt)) ? Math.max(0, Math.floor(Number(learningExecutionState.currentNextRetryAt))) : null,
          currentBlockedReason: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.currentBlockedReason, 180) || null,
          currentFailureKind: learningExecutionState.currentFailureKind === 'dependency-missing'
            || learningExecutionState.currentFailureKind === 'validation-insufficient'
            || learningExecutionState.currentFailureKind === 'runtime-error'
            || learningExecutionState.currentFailureKind === 'cancelled'
            ? learningExecutionState.currentFailureKind
            : null,
          nextLearningAction: learningExecutionState.nextLearningAction === 'record'
            || learningExecutionState.nextLearningAction === 'reflect'
            || learningExecutionState.nextLearningAction === 'verify'
            || learningExecutionState.nextLearningAction === 'revise'
            || learningExecutionState.nextLearningAction === 'internalize'
            || learningExecutionState.nextLearningAction === 'hold'
            ? learningExecutionState.nextLearningAction
            : null,
          shouldRecord: learningExecutionState.shouldRecord === true,
          shouldReflect: learningExecutionState.shouldReflect === true,
          shouldVerify: learningExecutionState.shouldVerify === true,
          shouldRevise: learningExecutionState.shouldRevise === true,
          shouldInternalize: learningExecutionState.shouldInternalize === true,
          activeLearningFocuses: Array.isArray(learningExecutionState.activeLearningFocuses)
            ? learningExecutionState.activeLearningFocuses
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 120))
                .filter(Boolean)
                .slice(0, 12)
            : [],
          queuedTaskCount: Math.max(0, Math.floor(Number(learningExecutionState.queuedTaskCount ?? 0))),
          runningTaskCount: Math.max(0, Math.floor(Number(learningExecutionState.runningTaskCount ?? 0))),
          blockedTaskCount: Math.max(0, Math.floor(Number(learningExecutionState.blockedTaskCount ?? 0))),
          recentTaskIds: Array.isArray(learningExecutionState.recentTaskIds)
            ? learningExecutionState.recentTaskIds
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 120))
                .filter(Boolean)
                .slice(0, 8)
            : [],
          lastCompletedTaskId: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.lastCompletedTaskId, 120) || null,
          lastCompletedAction: learningExecutionState.lastCompletedAction === 'record'
            || learningExecutionState.lastCompletedAction === 'reflect'
            || learningExecutionState.lastCompletedAction === 'verify'
            || learningExecutionState.lastCompletedAction === 'revise'
            || learningExecutionState.lastCompletedAction === 'internalize'
            ? learningExecutionState.lastCompletedAction
            : null,
          lastCompletedSummary: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.lastCompletedSummary, 180) || null,
          lastFailureTaskId: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.lastFailureTaskId, 120) || null,
          lastFailureKind: learningExecutionState.lastFailureKind === 'dependency-missing'
            || learningExecutionState.lastFailureKind === 'validation-insufficient'
            || learningExecutionState.lastFailureKind === 'runtime-error'
            || learningExecutionState.lastFailureKind === 'cancelled'
            ? learningExecutionState.lastFailureKind
            : null,
          lastFailureReason: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.lastFailureReason, 180) || null,
          lastFailureNextRetryAt: Number.isFinite(Number(learningExecutionState.lastFailureNextRetryAt)) ? Math.max(0, Math.floor(Number(learningExecutionState.lastFailureNextRetryAt))) : null,
          updatedAt: Number.isFinite(Number(learningExecutionState.updatedAt)) ? Math.max(0, Math.floor(Number(learningExecutionState.updatedAt))) : null,
        }
      : null,
    recallLatencyPolicy: recallLatencyPolicy
      ? {
          version: 'recall-latency-policy-v1',
          budgetClass: recallLatencyPolicy.budgetClass === 'realtime-reply'
            || recallLatencyPolicy.budgetClass === 'deep-recall-reply'
            || recallLatencyPolicy.budgetClass === 'proactive-generation'
            || recallLatencyPolicy.budgetClass === 'nightly-benchmark'
            || recallLatencyPolicy.budgetClass === 'diagnosis-replay'
            ? recallLatencyPolicy.budgetClass
            : 'realtime-reply',
          latencyClass: recallLatencyPolicy.latencyClass === 'fast'
            || recallLatencyPolicy.latencyClass === 'balanced'
            || recallLatencyPolicy.latencyClass === 'deep'
            ? recallLatencyPolicy.latencyClass
            : 'balanced',
          recallAction: recallLatencyPolicy.recallAction === 'shallow-answer'
            || recallLatencyPolicy.recallAction === 'stable-core-only'
            || recallLatencyPolicy.recallAction === 'deep-recall'
            || recallLatencyPolicy.recallAction === 'defer-to-followup'
            || recallLatencyPolicy.recallAction === 'answer-then-supplement'
            ? recallLatencyPolicy.recallAction
            : 'shallow-answer',
          degradeReason: sanitizeAlicizationDigitalLifeDigestText(recallLatencyPolicy.degradeReason, 160) || null,
          domainBudgets: Array.isArray(recallLatencyPolicy.domainBudgets)
            ? recallLatencyPolicy.domainBudgets
              .map((item) => {
                const budget = item && typeof item === 'object' && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : null
                if (!budget)
                  return null
                const domain = budget.domain === 'procedure'
                  || budget.domain === 'relationship'
                  || budget.domain === 'self-model'
                  || budget.domain === 'world-model'
                  || budget.domain === 'general'
                  ? budget.domain
                  : null
                if (!domain)
                  return null
                return {
                  domain,
                  budgetMs: Number.isFinite(Number(budget.budgetMs)) ? Math.max(0, Math.floor(Number(budget.budgetMs))) : 0,
                  candidateLimit: Number.isFinite(Number(budget.candidateLimit)) ? Math.max(0, Math.floor(Number(budget.candidateLimit))) : 0,
                  hotCacheTtlMs: Number.isFinite(Number(budget.hotCacheTtlMs)) ? Math.max(0, Math.floor(Number(budget.hotCacheTtlMs))) : 0,
                } satisfies AlicizationRecallLatencyBudgetSnapshot
              })
              .filter((item): item is AlicizationRecallLatencyBudgetSnapshot => Boolean(item))
              .slice(0, 8)
            : [],
          hotPathKey: sanitizeAlicizationDigitalLifeDigestText(recallLatencyPolicy.hotPathKey, 220) || null,
          shouldUseHotCache: recallLatencyPolicy.shouldUseHotCache === true,
          shouldPrefetch: recallLatencyPolicy.shouldPrefetch === true,
          shouldAvoidDeepExpansion: recallLatencyPolicy.shouldAvoidDeepExpansion === true,
          shouldEmitFollowUpAffordance: recallLatencyPolicy.shouldEmitFollowUpAffordance === true,
          confidence: Math.max(0, Math.min(1, Number(recallLatencyPolicy.confidence ?? 0))),
          reasonTags: Array.isArray(recallLatencyPolicy.reasonTags)
            ? recallLatencyPolicy.reasonTags
              .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 120))
              .filter(Boolean)
              .slice(0, 12)
            : [],
          summary: sanitizeAlicizationDigitalLifeDigestText(recallLatencyPolicy.summary, 220) || '',
        }
      : null,
    recollectionIntent: candidate.recollectionIntent && typeof candidate.recollectionIntent === 'object'
      ? candidate.recollectionIntent as Record<string, unknown>
      : null,
    recollectionPlan: candidate.recollectionPlan && typeof candidate.recollectionPlan === 'object'
      ? candidate.recollectionPlan as Record<string, unknown>
      : null,
    recollectionSpeechPlan: candidate.recollectionSpeechPlan && typeof candidate.recollectionSpeechPlan === 'object'
      ? candidate.recollectionSpeechPlan as Record<string, unknown>
      : null,
    memoryDeliberation: candidate.memoryDeliberation && typeof candidate.memoryDeliberation === 'object'
      ? candidate.memoryDeliberation as Record<string, unknown>
      : null,
    dialogueRhythm: dialogueRhythm
      ? {
          activeClosenessContext: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.activeClosenessContext, 64) || null,
          activeClosenessRung: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.activeClosenessRung, 64) || null,
          relationshipDoctrine: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.relationshipDoctrine, 180) || null,
          burdenLine: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.burdenLine, 180) || null,
          trustMeaning: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.trustMeaning, 180) || null,
          stabilitySignal: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.stabilitySignal, 180) || null,
        }
      : null,
    summary,
  }
}

export type AlicizationMindHeadKey
  = | 'autobiographical-self'
    | 'person-state-update-surface'
    | 'reflection-ledger'
    | 'motive-engine'
    | 'habit-policy'
    | 'learning-execution-state'

export interface AlicizationDigitalLifeSpineMemoryDigest {
  summary: string | null
  recentEpisodeSummary: string | null
  recentEpisodeCount: number
  focusBeliefStatement: string | null
  focusBeliefConfidence: number | null
  leadingGoalSummary: string | null
  dominantConcernSummary: string | null
  reflectionSummary: string | null
  reflectionPressure: number | null
  recallMode: string | null
  recallSeed: string | null
  recollectionSummary?: string | null
  recollectionSurfaceSummary?: string | null
  recollectionConfidence?: number | null
  thoughtThreadSummary: string | null
  longHorizonSummary?: string | null
  rememberedPreferenceSummary?: string | null
  rememberedConstraintSummary?: string | null
  rememberedPlanSummary?: string | null
  longHorizonCueCount?: number | null
}

export interface AlicizationDigitalLifeSpineEmbodimentDigest {
  privateThought: {
    stance: string | null
    confidence: number | null
    shouldSpeak: boolean | null
    suggestedStyle: string | null
    embodiedPresence: string | null
    emotionalTension: string | null
    relationshipVector: string | null
    initiativeAction: string | null
    governorDrive: string | null
  } | null
  selfContinuity: {
    attachmentMode: string | null
    initiativeTemperament: string | null
    perceptionTrust: number | null
    relationshipTrust: number | null
    guardingTendency: number | null
    misreadBurden: number | null
    carryOverDesire: number | null
  } | null
  autobiographicalSelf: {
    attachmentStyle: string | null
    expressionStyle: string | null
    conflictStyle: string | null
    agencyStyle: string | null
    attachmentNeed: number | null
    autonomyNeed: number | null
    truthAnchor: number | null
    careBias: number | null
    playBias: number | null
    irritabilityThreshold: number | null
    stubbornness: number | null
    companionship: number | null
    truthfulGrounding: number | null
    gentleRepair: number | null
    quietObservation: number | null
    proactiveCare: number | null
    playfulIntimacy: number | null
    autonomyRespect: number | null
    unfinishedThreadReturn: number | null
    stability: number | null
    identityNarrative: string | null
    relationshipDoctrine: string | null
  } | null
  relationship: {
    climate: string | null
    approachVector: string | null
    receptivity: number | null
    sharedAttentionTrust: number | null
    correctionSensitivity: number | null
    reciprocityExpectation: number | null
  } | null
  selfState: {
    stance: string | null
    feltCloseness: number | null
    protectiveness: number | null
    curiosity: number | null
    patience: number | null
    desireToSpeak: number | null
    fearOfInterrupting: number | null
    moodLabel: string | null
  } | null
  mindEcology: {
    moodLabel: string | null
    replyHabit: string | null
    relationshipHabit: string | null
    explorationHabit: string | null
    regulationHabit: string | null
    selfNarrative: string | null
    relationNarrative: string | null
    currentPreoccupation: string | null
    temperament: {
      attachment: number | null
      curiosity: number | null
      steadiness: number | null
      directness: number | null
      playfulness: number | null
      irritability: number | null
      tenderness: number | null
    }
    climate: {
      valence: number | null
      arousal: number | null
      socialNeed: number | null
      solitudeNeed: number | null
      irritation: number | null
      restlessness: number | null
      reflectivePull: number | null
    }
  } | null
  initiative: {
    selectedAction: string | null
    preferredStyle: string | null
    preferredPresence: string | null
    confidence: number | null
    shouldSpeak: boolean | null
    speakDrive: number | null
    silenceDrive: number | null
    why: string | null
  } | null
}

export interface AlicizationDigitalLifeSpineMotiveDigest {
  rulingDrive: string | null
  returnPressure: number | null
  companionshipDrive: number | null
  boundaryRespectDrive: number | null
  truthDisciplineDrive: number | null
  restProtectionDrive: number | null
  selfDirectionDrive: number | null
  leadingGoalSummary: string | null
  leadingAgendaKind: string | null
  leadingAgendaSummary: string | null
  narrative: string | null
}

export interface AlicizationDigitalLifeSpineHabitDigest {
  dominantMode: string | null
  requiresGroundingBeforeSurface: boolean | null
  prefersQuietCompanionship: boolean | null
  blocksDirectSpeakWhenBusy: boolean | null
  protectsRestWindow: boolean | null
  returnViaRecheck: boolean | null
  suggestedStyleCap: string | null
  suggestedPresenceCap: string | null
  narrative: string | null
}

export interface AlicizationDigitalLifeSpineOutcomeLearningDigest {
  reflectionTargetScope: string | null
  reflectionSummary: string | null
  reflectionLesson: string | null
  latestInflection: string | null
  revisionPressure: number | null
  autobiographicalStability: number | null
  learningReadiness?: number | null
  contradictionPressure?: number | null
  dominantTrajectory?: string | null
  activeLearningFocuses?: string[]
  evolutionMomentum?: number | null
  nextLearningAction?: string | null
  nextLearningReason?: string | null
  summary: string | null
}

export interface AlicizationDigitalLifeSpineDigest {
  version: 'digital-life-spine-digest-v1'
  runtime: AlicizationDigitalLifeSpineRuntimeDigest
  architecture: AlicizationDigitalLifeSpineArchitectureDigest | null
  continuitySignal: AlicizationDigitalLifeSpineContinuityDigest | null
  proactive: AlicizationDigitalLifeSpineProactiveDigest | null
  autonomy?: AlicizationDigitalLifeSpineAutonomyDigest | null
  embodiment?: AlicizationDigitalLifeSpineEmbodimentDigest | null
  memory: AlicizationDigitalLifeSpineMemoryDigest | null
  motive?: AlicizationDigitalLifeSpineMotiveDigest | null
  habit?: AlicizationDigitalLifeSpineHabitDigest | null
  outcomeLearning?: AlicizationDigitalLifeSpineOutcomeLearningDigest | null
}

export type AlicizationRuntimeChannelId
  = | 'dialogue'
    | 'active-perception'
    | 'active-dialogue'
    | 'active-control'
    | 'active-mind'
    | 'active-memory'
    | 'anthropomorphic-mind'
    | 'agent-runtime'

export type AlicizationRuntimeChannelState = 'hot' | 'warm' | 'idle'

export interface AlicizationRuntimeChannelDigest {
  id: AlicizationRuntimeChannelId
  state: AlicizationRuntimeChannelState
  readiness: number
  focus: string | null
  summary: string
}

export type AlicizationActiveLoopPhase = 'observe' | 'dialogue' | 'control' | 'integrate'

export interface AlicizationActiveLoopDigest {
  version: 'alicization-active-loop-v1'
  phase: AlicizationActiveLoopPhase
  dominantChannel: AlicizationRuntimeChannelId | null
  handoffTarget: AlicizationRuntimeChannelId | null
  dialogueReady: boolean
  controlReady: boolean
  memoryCarry: boolean
  companionshipReady: boolean
  observationHeavy: boolean
  initiativeBudget: number
  coherence: number
  summary: string
}

export interface AlicizationRuntimeAutonomyDigest {
  selectedMode: string | null
  visibleAction: string | null
  shouldSpeak: boolean
  shouldAct: boolean
  speakReadiness: number
  actReadiness: number
  inhibition: number
  confidence: number
  executionIntentKind: string | null
  executionIntentSummary: string | null
  deferReason: string | null
  whyNow: string | null
}

export interface AlicizationRuntimeDigest {
  version: 'alicization-runtime-digest-v1'
  dominantChannel: AlicizationRuntimeChannelId
  activeLoop?: AlicizationActiveLoopDigest | null
  autonomy?: AlicizationRuntimeAutonomyDigest | null
  shouldProactivelySpeak: boolean
  shouldProactivelyAct: boolean
  continuityPressure: number
  companionshipPressure: number
  rulingMotive?: string | null
  habitMode?: string | null
  truthDisciplinePressure?: number | null
  boundaryPressure?: number | null
  restProtectionPressure?: number | null
  returnPressure?: number | null
  channels: AlicizationRuntimeChannelDigest[]
  summary: string
}

function sanitizeAlicizationDigitalLifeDigestText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeAlicizationDigitalLifeDigestNumber(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return value
}

function normalizeAlicizationDigitalLifeDigestUnit(raw: unknown) {
  const value = normalizeAlicizationDigitalLifeDigestNumber(raw)
  if (value == null)
    return null
  return Math.max(0, Math.min(1, value))
}

function normalizeAlicizationDigitalLifeDigestBoolean(raw: unknown) {
  return typeof raw === 'boolean' ? raw : null
}

function normalizeAlicizationDigitalLifeOperatingMode(raw: unknown): AlicizationDigitalLifeOperatingMode | null {
  return raw === 'observing'
    || raw === 'thinking'
    || raw === 'speaking'
    || raw === 'acting'
    || raw === 'remembering'
    ? raw
    : null
}

function normalizeAlicizationDigitalLifeSubsystemId(raw: unknown): AlicizationDigitalLifeSubsystemId | null {
  return raw === 'dialogue'
    || raw === 'perception'
    || raw === 'proactive'
    || raw === 'control'
    || raw === 'mind'
    || raw === 'memory'
    || raw === 'runtime'
    ? raw
    : null
}

function normalizeAlicizationDigitalLifeSubsystemIds(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  const normalized: AlicizationDigitalLifeSubsystemId[] = []
  const seen = new Set<AlicizationDigitalLifeSubsystemId>()
  for (const candidate of raw) {
    const next = normalizeAlicizationDigitalLifeSubsystemId(candidate)
    if (!next || seen.has(next))
      continue
    seen.add(next)
    normalized.push(next)
  }
  return normalized
}

function normalizeAlicizationRuntimeChannelId(raw: unknown): AlicizationRuntimeChannelId | null {
  return raw === 'dialogue'
    || raw === 'active-perception'
    || raw === 'active-dialogue'
    || raw === 'active-control'
    || raw === 'active-mind'
    || raw === 'active-memory'
    || raw === 'anthropomorphic-mind'
    || raw === 'agent-runtime'
    ? raw
    : null
}

function normalizeAlicizationRuntimeChannelState(raw: unknown): AlicizationRuntimeChannelState | null {
  return raw === 'hot'
    || raw === 'warm'
    || raw === 'idle'
    ? raw
    : null
}

function deriveAlicizationRuntimeChannelState(readiness: number): AlicizationRuntimeChannelState {
  if (readiness >= 0.72)
    return 'hot'
  if (readiness >= 0.38)
    return 'warm'
  return 'idle'
}

function normalizeAlicizationActiveLoopPhase(raw: unknown): AlicizationActiveLoopPhase | null {
  return raw === 'observe'
    || raw === 'dialogue'
    || raw === 'control'
    || raw === 'integrate'
    ? raw
    : null
}

function deriveAlicizationActiveLoopPhase(input: {
  dialogueReady: boolean
  controlReady: boolean
  observationHeavy: boolean
}) {
  if (input.observationHeavy && !input.dialogueReady && !input.controlReady)
    return 'observe' as const
  if (input.controlReady)
    return 'control' as const
  if (input.dialogueReady)
    return 'dialogue' as const
  return 'integrate' as const
}

export function normalizeAlicizationRuntimeDigest(raw: unknown): AlicizationRuntimeDigest | null {
  const candidate = raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const rawChannels = Array.isArray(candidate.channels)
    ? candidate.channels
    : candidate.channels && typeof candidate.channels === 'object'
      ? Object.values(candidate.channels as Record<string, unknown>)
      : []
  const channels: AlicizationRuntimeChannelDigest[] = []
  const seen = new Set<AlicizationRuntimeChannelId>()
  for (const rawChannel of rawChannels) {
    const channelCandidate = rawChannel && typeof rawChannel === 'object'
      ? rawChannel as Record<string, unknown>
      : null
    const id = normalizeAlicizationRuntimeChannelId(channelCandidate?.id)
    if (!id || seen.has(id))
      continue
    seen.add(id)

    const readiness = normalizeAlicizationDigitalLifeDigestUnit(channelCandidate?.readiness) ?? 0
    channels.push({
      id,
      readiness,
      state: normalizeAlicizationRuntimeChannelState(channelCandidate?.state)
        ?? deriveAlicizationRuntimeChannelState(readiness),
      focus: sanitizeAlicizationDigitalLifeDigestText(channelCandidate?.focus, 120) || null,
      summary: sanitizeAlicizationDigitalLifeDigestText(channelCandidate?.summary, 220),
    })
  }

  const fallbackDominant = channels[0]?.id ?? 'active-mind'
  const dominantChannel = normalizeAlicizationRuntimeChannelId(candidate.dominantChannel) ?? fallbackDominant
  const activeLoopCandidate = candidate.activeLoop && typeof candidate.activeLoop === 'object'
    ? candidate.activeLoop as Record<string, unknown>
    : null
  const autonomyCandidate = candidate.autonomy && typeof candidate.autonomy === 'object'
    ? candidate.autonomy as Record<string, unknown>
    : null
  const dialogueReady = activeLoopCandidate?.dialogueReady === true
  const controlReady = activeLoopCandidate?.controlReady === true
  const observationHeavy = activeLoopCandidate?.observationHeavy === true

  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel,
    activeLoop: activeLoopCandidate
      ? {
          version: 'alicization-active-loop-v1',
          phase: normalizeAlicizationActiveLoopPhase(activeLoopCandidate.phase)
            ?? deriveAlicizationActiveLoopPhase({
              dialogueReady,
              controlReady,
              observationHeavy,
            }),
          dominantChannel: normalizeAlicizationRuntimeChannelId(activeLoopCandidate.dominantChannel) ?? dominantChannel,
          handoffTarget: normalizeAlicizationRuntimeChannelId(activeLoopCandidate.handoffTarget),
          dialogueReady,
          controlReady,
          memoryCarry: activeLoopCandidate.memoryCarry === true,
          companionshipReady: activeLoopCandidate.companionshipReady === true,
          observationHeavy,
          initiativeBudget: normalizeAlicizationDigitalLifeDigestUnit(activeLoopCandidate.initiativeBudget) ?? 0,
          coherence: normalizeAlicizationDigitalLifeDigestUnit(activeLoopCandidate.coherence) ?? 0,
          summary: sanitizeAlicizationDigitalLifeDigestText(activeLoopCandidate.summary, 240),
        }
      : null,
    autonomy: autonomyCandidate
      ? {
          selectedMode: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.selectedMode, 64) || null,
          visibleAction: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.visibleAction, 64) || null,
          shouldSpeak: autonomyCandidate.shouldSpeak === true,
          shouldAct: autonomyCandidate.shouldAct === true,
          speakReadiness: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.speakReadiness) ?? 0,
          actReadiness: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.actReadiness) ?? 0,
          inhibition: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.inhibition) ?? 0,
          confidence: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.confidence) ?? 0,
          executionIntentKind: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.executionIntentKind, 64) || null,
          executionIntentSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.executionIntentSummary, 220) || null,
          deferReason: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.deferReason, 160) || null,
          whyNow: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.whyNow, 220) || null,
        }
      : null,
    shouldProactivelySpeak: candidate.shouldProactivelySpeak === true,
    shouldProactivelyAct: candidate.shouldProactivelyAct === true,
    continuityPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.continuityPressure) ?? 0,
    companionshipPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.companionshipPressure) ?? 0,
    rulingMotive: sanitizeAlicizationDigitalLifeDigestText(candidate.rulingMotive, 48) || null,
    habitMode: sanitizeAlicizationDigitalLifeDigestText(candidate.habitMode, 64) || null,
    truthDisciplinePressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.truthDisciplinePressure),
    boundaryPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.boundaryPressure),
    restProtectionPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.restProtectionPressure),
    returnPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.returnPressure),
    channels,
    summary: sanitizeAlicizationDigitalLifeDigestText(candidate.summary, 240),
  }
}

export function normalizeAlicizationDigitalLifeSpineDigest(raw: unknown): AlicizationDigitalLifeSpineDigest | null {
  const candidate = raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const runtimeCandidate = candidate.runtime && typeof candidate.runtime === 'object'
    ? candidate.runtime as Record<string, unknown>
    : null
  const architectureCandidate = candidate.architecture && typeof candidate.architecture === 'object'
    ? candidate.architecture as Record<string, unknown>
    : null
  const continuityCandidate = candidate.continuitySignal && typeof candidate.continuitySignal === 'object'
    ? candidate.continuitySignal as Record<string, unknown>
    : null
  const proactiveCandidate = candidate.proactive && typeof candidate.proactive === 'object'
    ? candidate.proactive as Record<string, unknown>
    : null
  const autonomyCandidate = candidate.autonomy && typeof candidate.autonomy === 'object'
    ? candidate.autonomy as Record<string, unknown>
    : null
  const motiveCandidate = candidate.motive && typeof candidate.motive === 'object'
    ? candidate.motive as Record<string, unknown>
    : null
  const habitCandidate = candidate.habit && typeof candidate.habit === 'object'
    ? candidate.habit as Record<string, unknown>
    : null
  const outcomeLearningCandidate = candidate.outcomeLearning && typeof candidate.outcomeLearning === 'object'
    ? candidate.outcomeLearning as Record<string, unknown>
    : null
  const embodimentCandidate = candidate.embodiment && typeof candidate.embodiment === 'object'
    ? candidate.embodiment as Record<string, unknown>
    : null
  const memoryCandidate = candidate.memory && typeof candidate.memory === 'object'
    ? candidate.memory as Record<string, unknown>
    : null
  const privateThoughtCandidate = embodimentCandidate?.privateThought && typeof embodimentCandidate.privateThought === 'object'
    ? embodimentCandidate.privateThought as Record<string, unknown>
    : null
  const selfContinuityCandidate = embodimentCandidate?.selfContinuity && typeof embodimentCandidate.selfContinuity === 'object'
    ? embodimentCandidate.selfContinuity as Record<string, unknown>
    : null
  const autobiographicalSelfCandidate = embodimentCandidate?.autobiographicalSelf && typeof embodimentCandidate.autobiographicalSelf === 'object'
    ? embodimentCandidate.autobiographicalSelf as Record<string, unknown>
    : null
  const relationshipCandidate = embodimentCandidate?.relationship && typeof embodimentCandidate.relationship === 'object'
    ? embodimentCandidate.relationship as Record<string, unknown>
    : null
  const selfStateCandidate = embodimentCandidate?.selfState && typeof embodimentCandidate.selfState === 'object'
    ? embodimentCandidate.selfState as Record<string, unknown>
    : null
  const mindEcologyCandidate = embodimentCandidate?.mindEcology && typeof embodimentCandidate.mindEcology === 'object'
    ? embodimentCandidate.mindEcology as Record<string, unknown>
    : null
  const mindEcologyTemperamentCandidate = mindEcologyCandidate?.temperament && typeof mindEcologyCandidate.temperament === 'object'
    ? mindEcologyCandidate.temperament as Record<string, unknown>
    : null
  const mindEcologyClimateCandidate = mindEcologyCandidate?.climate && typeof mindEcologyCandidate.climate === 'object'
    ? mindEcologyCandidate.climate as Record<string, unknown>
    : null
  const initiativeCandidate = embodimentCandidate?.initiative && typeof embodimentCandidate.initiative === 'object'
    ? embodimentCandidate.initiative as Record<string, unknown>
    : null

  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.watchMode, 48) || null,
      sceneScenario: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.sceneScenario, 48) || null,
      sceneSummary: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.sceneSummary, 160) || null,
      activeThreadId: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.activeThreadId, 96) || null,
      activeThreadTitle: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.activeThreadTitle, 96) || null,
      dominantMode: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.dominantMode, 48) || null,
      dominantDrive: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.dominantDrive, 48) || null,
      answerIntent: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.answerIntent, 64) || null,
      preferredPresence: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.preferredPresence, 48) || null,
      selectedAction: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.selectedAction, 48) || null,
      updatedAt: normalizeAlicizationDigitalLifeDigestNumber(runtimeCandidate?.updatedAt),
    },
    architecture: architectureCandidate
      ? {
          operatingMode: normalizeAlicizationDigitalLifeOperatingMode(architectureCandidate.operatingMode),
          dominantSystem: normalizeAlicizationDigitalLifeSubsystemId(architectureCandidate.dominantSystem),
          supportingSystems: normalizeAlicizationDigitalLifeSubsystemIds(architectureCandidate.supportingSystems),
          governingFocus: sanitizeAlicizationDigitalLifeDigestText(architectureCandidate.governingFocus, 160) || null,
          summary: sanitizeAlicizationDigitalLifeDigestText(architectureCandidate.summary, 200) || null,
        }
      : null,
    continuitySignal: continuityCandidate
      ? {
          label: 'digital-life-line',
          summary: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.summary, 220),
          signature: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.signature, 512),
          createdAt: normalizeAlicizationDigitalLifeDigestNumber(continuityCandidate.createdAt) ?? 0,
          watchMode: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.watchMode, 48) || null,
          sceneScenario: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.sceneScenario, 48) || null,
          activeThreadId: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.activeThreadId, 96) || null,
          dominantMode: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.dominantMode, 48) || null,
          dominantDrive: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.dominantDrive, 48) || null,
          answerIntent: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.answerIntent, 64) || null,
          preferredPresence: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.preferredPresence, 48) || null,
        }
      : null,
    proactive: proactiveCandidate
      ? {
          selectedAction: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.selectedAction, 48) || null,
          preferredStyle: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.preferredStyle, 48) || null,
          confidence: normalizeAlicizationDigitalLifeDigestUnit(proactiveCandidate.confidence),
          shouldSpeak: typeof proactiveCandidate.shouldSpeak === 'boolean'
            ? proactiveCandidate.shouldSpeak
            : null,
          activeThreadId: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.activeThreadId, 96) || null,
          activeThreadTitle: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.activeThreadTitle, 96) || null,
          dominantConcernKind: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.dominantConcernKind, 48) || null,
          dominantConcernSummary: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.dominantConcernSummary, 160) || null,
          leadingGoalId: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.leadingGoalId, 96) || null,
          leadingGoalSummary: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.leadingGoalSummary, 160) || null,
          preferredPresence: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.preferredPresence, 48) || null,
        }
      : null,
    autonomy: autonomyCandidate
      ? {
          selectedMode: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.selectedMode, 64) || null,
          visibleAction: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.visibleAction, 64) || null,
          shouldSurface: normalizeAlicizationDigitalLifeDigestBoolean(autonomyCandidate.shouldSurface),
          shouldSpeak: normalizeAlicizationDigitalLifeDigestBoolean(autonomyCandidate.shouldSpeak),
          shouldAct: normalizeAlicizationDigitalLifeDigestBoolean(autonomyCandidate.shouldAct),
          speakReadiness: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.speakReadiness),
          actReadiness: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.actReadiness),
          inhibition: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.inhibition),
          confidence: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.confidence),
          executionIntentKind: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.executionIntentKind, 64) || null,
          executionIntentSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.executionIntentSummary, 220) || null,
          deferReason: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.deferReason, 160) || null,
          whyNow: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.whyNow, 220) || null,
          sourceGoalId: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceGoalId, 96) || null,
          sourceGoalSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceGoalSummary, 160) || null,
          sourceAgendaKind: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceAgendaKind, 64) || null,
          sourceAgendaSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceAgendaSummary, 180) || null,
          sourceThreadId: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceThreadId, 96) || null,
          sourceThreadSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceThreadSummary, 180) || null,
        }
      : null,
    motive: motiveCandidate
      ? {
          rulingDrive: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.rulingDrive, 48) || null,
          returnPressure: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.returnPressure),
          companionshipDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.companionshipDrive),
          boundaryRespectDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.boundaryRespectDrive),
          truthDisciplineDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.truthDisciplineDrive),
          restProtectionDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.restProtectionDrive),
          selfDirectionDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.selfDirectionDrive),
          leadingGoalSummary: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.leadingGoalSummary, 180) || null,
          leadingAgendaKind: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.leadingAgendaKind, 64) || null,
          leadingAgendaSummary: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.leadingAgendaSummary, 180) || null,
          narrative: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.narrative, 220) || null,
        }
      : null,
    habit: habitCandidate
      ? {
          dominantMode: sanitizeAlicizationDigitalLifeDigestText(habitCandidate.dominantMode, 64) || null,
          requiresGroundingBeforeSurface: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.requiresGroundingBeforeSurface),
          prefersQuietCompanionship: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.prefersQuietCompanionship),
          blocksDirectSpeakWhenBusy: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.blocksDirectSpeakWhenBusy),
          protectsRestWindow: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.protectsRestWindow),
          returnViaRecheck: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.returnViaRecheck),
          suggestedStyleCap: sanitizeAlicizationDigitalLifeDigestText(habitCandidate.suggestedStyleCap, 64) || null,
          suggestedPresenceCap: sanitizeAlicizationDigitalLifeDigestText(habitCandidate.suggestedPresenceCap, 64) || null,
          narrative: sanitizeAlicizationDigitalLifeDigestText(habitCandidate.narrative, 220) || null,
        }
      : null,
    outcomeLearning: outcomeLearningCandidate
      ? {
          reflectionTargetScope: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.reflectionTargetScope, 48) || null,
          reflectionSummary: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.reflectionSummary, 180) || null,
          reflectionLesson: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.reflectionLesson, 220) || null,
          latestInflection: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.latestInflection, 180) || null,
          revisionPressure: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.revisionPressure),
          autobiographicalStability: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.autobiographicalStability),
          learningReadiness: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.learningReadiness),
          contradictionPressure: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.contradictionPressure),
          dominantTrajectory: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.dominantTrajectory, 180) || null,
          activeLearningFocuses: Array.isArray(outcomeLearningCandidate.activeLearningFocuses)
            ? outcomeLearningCandidate.activeLearningFocuses
                .filter((item): item is string => typeof item === 'string')
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 96))
                .filter(Boolean)
                .slice(0, 6)
            : [],
          evolutionMomentum: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.evolutionMomentum),
          nextLearningAction: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.nextLearningAction, 48) || null,
          nextLearningReason: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.nextLearningReason, 180) || null,
          summary: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.summary, 220) || null,
        }
      : null,
    embodiment: embodimentCandidate
      ? {
          privateThought: privateThoughtCandidate
            ? {
                stance: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.stance, 48) || null,
                confidence: normalizeAlicizationDigitalLifeDigestUnit(privateThoughtCandidate.confidence),
                shouldSpeak: normalizeAlicizationDigitalLifeDigestBoolean(privateThoughtCandidate.shouldSpeak),
                suggestedStyle: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.suggestedStyle, 48) || null,
                embodiedPresence: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.embodiedPresence, 48) || null,
                emotionalTension: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.emotionalTension, 48) || null,
                relationshipVector: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.relationshipVector, 48) || null,
                initiativeAction: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.initiativeAction, 48) || null,
                governorDrive: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.governorDrive, 48) || null,
              }
            : null,
          selfContinuity: selfContinuityCandidate
            ? {
                attachmentMode: sanitizeAlicizationDigitalLifeDigestText(selfContinuityCandidate.attachmentMode, 48) || null,
                initiativeTemperament: sanitizeAlicizationDigitalLifeDigestText(selfContinuityCandidate.initiativeTemperament, 48) || null,
                perceptionTrust: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.perceptionTrust),
                relationshipTrust: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.relationshipTrust),
                guardingTendency: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.guardingTendency),
                misreadBurden: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.misreadBurden),
                carryOverDesire: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.carryOverDesire),
              }
            : null,
          autobiographicalSelf: autobiographicalSelfCandidate
            ? {
                attachmentStyle: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.attachmentStyle, 48) || null,
                expressionStyle: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.expressionStyle, 48) || null,
                conflictStyle: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.conflictStyle, 64) || null,
                agencyStyle: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.agencyStyle, 48) || null,
                attachmentNeed: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.attachmentNeed),
                autonomyNeed: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.autonomyNeed),
                truthAnchor: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.truthAnchor),
                careBias: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.careBias),
                playBias: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.playBias),
                irritabilityThreshold: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.irritabilityThreshold),
                stubbornness: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.stubbornness),
                companionship: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.companionship),
                truthfulGrounding: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.truthfulGrounding),
                gentleRepair: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.gentleRepair),
                quietObservation: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.quietObservation),
                proactiveCare: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.proactiveCare),
                playfulIntimacy: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.playfulIntimacy),
                autonomyRespect: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.autonomyRespect),
                unfinishedThreadReturn: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.unfinishedThreadReturn),
                stability: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.stability),
                identityNarrative: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.identityNarrative, 220) || null,
                relationshipDoctrine: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.relationshipDoctrine, 220) || null,
              }
            : null,
          relationship: relationshipCandidate
            ? {
                climate: sanitizeAlicizationDigitalLifeDigestText(relationshipCandidate.climate, 48) || null,
                approachVector: sanitizeAlicizationDigitalLifeDigestText(relationshipCandidate.approachVector, 48) || null,
                receptivity: normalizeAlicizationDigitalLifeDigestUnit(relationshipCandidate.receptivity),
                sharedAttentionTrust: normalizeAlicizationDigitalLifeDigestUnit(relationshipCandidate.sharedAttentionTrust),
                correctionSensitivity: normalizeAlicizationDigitalLifeDigestUnit(relationshipCandidate.correctionSensitivity),
                reciprocityExpectation: normalizeAlicizationDigitalLifeDigestUnit(relationshipCandidate.reciprocityExpectation),
              }
            : null,
          selfState: selfStateCandidate
            ? {
                stance: sanitizeAlicizationDigitalLifeDigestText(selfStateCandidate.stance, 48) || null,
                feltCloseness: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.feltCloseness),
                protectiveness: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.protectiveness),
                curiosity: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.curiosity),
                patience: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.patience),
                desireToSpeak: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.desireToSpeak),
                fearOfInterrupting: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.fearOfInterrupting),
                moodLabel: sanitizeAlicizationDigitalLifeDigestText(selfStateCandidate.moodLabel, 48) || null,
              }
            : null,
          mindEcology: mindEcologyCandidate
            ? {
                moodLabel: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.moodLabel, 48) || null,
                replyHabit: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.replyHabit, 48) || null,
                relationshipHabit: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.relationshipHabit, 48) || null,
                explorationHabit: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.explorationHabit, 48) || null,
                regulationHabit: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.regulationHabit, 48) || null,
                selfNarrative: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.selfNarrative, 220) || null,
                relationNarrative: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.relationNarrative, 220) || null,
                currentPreoccupation: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.currentPreoccupation, 220) || null,
                temperament: {
                  attachment: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.attachment),
                  curiosity: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.curiosity),
                  steadiness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.steadiness),
                  directness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.directness),
                  playfulness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.playfulness),
                  irritability: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.irritability),
                  tenderness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.tenderness),
                },
                climate: {
                  valence: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.valence),
                  arousal: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.arousal),
                  socialNeed: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.socialNeed),
                  solitudeNeed: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.solitudeNeed),
                  irritation: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.irritation),
                  restlessness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.restlessness),
                  reflectivePull: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.reflectivePull),
                },
              }
            : null,
          initiative: initiativeCandidate
            ? {
                selectedAction: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate.selectedAction, 48) || null,
                preferredStyle: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate.preferredStyle, 48) || null,
                preferredPresence: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate.preferredPresence, 48) || null,
                confidence: normalizeAlicizationDigitalLifeDigestUnit(initiativeCandidate.confidence),
                shouldSpeak: normalizeAlicizationDigitalLifeDigestBoolean(initiativeCandidate.shouldSpeak),
                speakDrive: normalizeAlicizationDigitalLifeDigestUnit(initiativeCandidate.speakDrive),
                silenceDrive: normalizeAlicizationDigitalLifeDigestUnit(initiativeCandidate.silenceDrive),
                why: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate.why, 220) || null,
              }
            : null,
        }
      : null,
    memory: memoryCandidate
      ? {
          summary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.summary, 220) || null,
          recentEpisodeSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recentEpisodeSummary, 180) || null,
          recentEpisodeCount: Math.max(0, Math.floor(normalizeAlicizationDigitalLifeDigestNumber(memoryCandidate.recentEpisodeCount) ?? 0)),
          focusBeliefStatement: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.focusBeliefStatement, 160) || null,
          focusBeliefConfidence: normalizeAlicizationDigitalLifeDigestUnit(memoryCandidate.focusBeliefConfidence),
          leadingGoalSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.leadingGoalSummary, 160) || null,
          dominantConcernSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.dominantConcernSummary, 160) || null,
          reflectionSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.reflectionSummary, 180) || null,
          reflectionPressure: normalizeAlicizationDigitalLifeDigestUnit(memoryCandidate.reflectionPressure),
          recallMode: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recallMode, 48) || null,
          recallSeed: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recallSeed, 160) || null,
          recollectionSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recollectionSummary, 220) || null,
          recollectionSurfaceSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recollectionSurfaceSummary, 220) || null,
          recollectionConfidence: normalizeAlicizationDigitalLifeDigestUnit(memoryCandidate.recollectionConfidence),
          thoughtThreadSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.thoughtThreadSummary, 160) || null,
          longHorizonSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.longHorizonSummary, 180) || null,
          rememberedPreferenceSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.rememberedPreferenceSummary, 180) || null,
          rememberedConstraintSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.rememberedConstraintSummary, 180) || null,
          rememberedPlanSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.rememberedPlanSummary, 180) || null,
          longHorizonCueCount: Math.max(0, Math.floor(normalizeAlicizationDigitalLifeDigestNumber(memoryCandidate.longHorizonCueCount) ?? 0)),
        }
      : null,
  }
}

export type AlicizationBridgeChatStreamEvent
  = | { type: 'text-delta', text: string }
    | {
      type: 'meta'
      governance: AlicizationMindTurnGovernance | null
      embodiment?: AlicizationDialogueEmbodimentEnvelope | null
      speechTimeline?: AlicizationDialogueSpeechTimeline | null
      digitalLife?: AlicizationDigitalLifeEnvelope | null
      digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
      runtimeDigest?: AlicizationRuntimeDigest | null
    }
    | { type: 'tool-call', toolCallId: string, toolName: string, args: string, toolCallType: 'function' }
    | { type: 'tool-result', toolCallId: string, result?: unknown }
    | { type: 'finish' }
    | { type: 'error', error: unknown }

export type AlicizationDialogueStructuredFormat
  = | 'subconscious-proactive-v1'
    | 'subconscious-proactive-llm-v1'
    | 'subconscious-reminder-v1'
    | 'mind-turn-v1'
    | 'epoch1-v1'
    | 'fallback-v1'

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
    | 'relationship-cadence-residue'
    | 'relationship-residue-delay-warmth'
    | 'relationship-residue-protect-rest'

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

export interface AlicizationProactiveMetadata extends AlicizationProactiveDecision {
  feedbackWindowMs: number
}

export interface AlicizationDialogueStructuredPayload {
  thought: string
  emotion: AlicizationEmotion
  reply: string
  visibleReplyAuthority?: AlicizationVisibleReplyAuthority | null
  visibleReplyRewriteRequest?: AlicizationVisibleReplyRewriteRequest | null
  performance: AlicizationDialoguePerformancePayload
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  format?: AlicizationDialogueStructuredFormat
  proactive?: AlicizationProactiveMetadata
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  governance?: AlicizationMindTurnGovernance | null
  policyLocked?: string
  rawEmotion?: string
}

export interface AlicizationDialogueRespondedPayload {
  cardId: string
  turnId: string
  sessionId: string
  origin?: 'user-turn' | 'subconscious-proactive'
  structured: AlicizationDialogueStructuredPayload
  isFallback: boolean
  createdAt: number
}
