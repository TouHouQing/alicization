import type {
  AlicizationMemoryQualityEvidenceSnapshot,
  AlicizationPersonaTrainingArtifact,
  AlicizationRuntimeEventEnvelope,
  AlicizationMemoryQualityGoldLabelItem as SharedAlicizationMemoryQualityGoldLabelItem,
  AlicizationMemoryQualityGoldLabelListResult as SharedAlicizationMemoryQualityGoldLabelListResult,
  AlicizationMemoryQualityGoldLabelPayload as SharedAlicizationMemoryQualityGoldLabelPayload,
  AlicizationMemoryQualityMonthlyGoldRegressionPack as SharedAlicizationMemoryQualityMonthlyGoldRegressionPack,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationActiveThought,
  AlicizationAuditLogInput,
  AlicizationChannelCapabilityManifestRecord,
  AlicizationChannelCapabilityManifestUpsertInput,
  AlicizationConversationTurnInput,
  AlicizationDerivedMemoryReference,
  AlicizationEpisodicEventInput,
  AlicizationEpisodicEventRecord,
  AlicizationEpisodicReconsolidationSnapshot,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationExecutionEventKind,
  AlicizationExecutionEventRecord,
  AlicizationExecutionTaskKind,
  AlicizationExecutionTurnOrigin,
  AlicizationExecutorSessionRecord,
  AlicizationExecutorSessionStatus,
  AlicizationExecutorSessionUpsertInput,
  AlicizationKnowledgeAssimilationCorrection,
  AlicizationKnowledgeAssimilationStage,
  AlicizationKnowledgeValidationStatus,
  AlicizationLearningAction,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationLearningTaskFailureKind,
  AlicizationLearningTaskPayload,
  AlicizationLearningTaskRecord,
  AlicizationLearningTaskStatus,
  AlicizationListChannelCapabilityManifestsInput,
  AlicizationListExecutionEventsInput,
  AlicizationListExecutorSessionsInput,
  AlicizationListTaskThreadsInput,
  AlicizationLongTermMemoryReviewItem,
  AlicizationMemoryDomain,
  AlicizationMemoryEmbeddingReindexResult,
  AlicizationMemoryFact,
  AlicizationMemoryFactInput,
  AlicizationMemoryLegacySnapshot,
  AlicizationMemoryMigrationResult,
  AlicizationMemoryProvenance,
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryReflectionInput,
  AlicizationMemoryReflectionRecord,
  AlicizationMemoryReflectionStatus,
  AlicizationMemoryReplaySessionListResult,
  AlicizationMemorySource,
  AlicizationMemoryStats,
  AlicizationMemoryWorkbenchHealth,
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchKind,
  AlicizationMemoryWorkbenchReviewDecision,
  AlicizationMemoryWorkbenchSensitivity,
  AlicizationMemoryWorkbenchTrainingState,
  AlicizationMemoryWorkbenchVisibility,
  AlicizationMindHeadKey,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
  AlicizationPersonaCandidateListResult,
  AlicizationPersonaCandidateWorkbenchDecision,
  AlicizationPersonaCandidateWorkbenchItem,
  AlicizationPersonaCandidateWorkbenchStatus,
  AlicizationPersonaReinforcementEventInput,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationPersonStateEvolutionEntryInput,
  AlicizationPersonStateEvolutionEntryRecord,
  AlicizationPersonStateEvolutionSummary,
  AlicizationRelationshipOutcomeInput,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousFragmentSourceKind,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
  AlicizationTaskThreadUpsertInput,
  AlicizationWorkingMemoryCleaningQueueItem,
  AlicizationWorkingMemoryCleaningQueueResult,
} from '../../../shared/eventa'
import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type {
  WorkingMemoryLongTermCleaningStatus,
  WorkingMemoryLongTermCleaningTransaction,
} from './life-core/working-memory-long-term-cleaning'
import type { WorkingMemoryLongTermQueueItem } from './life-core/working-memory-long-term-queue'
import type { WorkingMemoryQualityFixture } from './life-core/working-memory-quality-harness'
import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'
import type {
  LongTermMemoryEvidenceBundle,
  LongTermMemoryEvidenceCandidate,
  LongTermMemoryQueryPlan,
} from './long-term-memory-recall'
import type { LongTermMemoryReviewDecision, LongTermMemoryReviewItem } from './long-term-memory-review-queue'
import type { LongTermMemoryTemporalConflictFixture } from './long-term-memory-temporal-conflict-harness'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type {
  MemoryEmbeddingReindexDeadLetterItem,
  MemoryEmbeddingReindexProgress,
} from './memory-embedding-reindex-runtime'
import type { AlicizationEventGraphNeighborhood } from './memory-event-graph-runtime'
import type { MemoryExperienceQualityFixture } from './memory-experience-quality-harness'
import type { AlicizationMemoryTrialProvider } from './memory-live-provider-trial'
import type {
  SimpleRecallGoldBenchmarkDimension,
  SimpleRecallGoldEvaluationClass,
  SimpleRecallGoldLabel,
  SimpleRecallGoldReason,
} from './memory-os/simple-recall-gold-labels'
import type {
  MemoryProductionTrialReport,
  MemoryProductionTrialRuntimeHealth,
} from './memory-production-trial-runner'
import type {
  MemorySemanticScaleJob,
  MemorySemanticScaleJobExecutor,
  MemorySemanticScaleJobTier,
} from './memory-semantic-scale-job-runtime'
import type { PersonaTrainingDatasetQualityFixture } from './persona-training-dataset-quality-harness'
import type {
  PersonaTrainingDatasetCleaningProvenance,
  PersonaTrainingDatasetConsentSnapshot,
  PersonaTrainingDatasetExample,
  PersonaTrainingDatasetManifest,
  PersonaTrainingDatasetRepository,
  PersonaTrainingDatasetSource,
  PersonaTrainingDatasetVersion,
} from './persona-training-dataset-runtime'
import type {
  PersonaTrainingArtifactActivationIntent,
  PersonaTrainingArtifactActivationOwner,
  PersonaTrainingArtifactActivationStage,
  PersonaTrainingArtifactCleanupIntent,
  PersonaTrainingArtifactCleanupOwner,
  PersonaTrainingArtifactCleanupStage,
  PersonaTrainingArtifactLifecycle,
  PersonaTrainingArtifactLoader,
  PersonaTrainingArtifactLoaderReceiptSnapshot,
  PersonaTrainingDatasetGovernanceMutation,
  PersonaTrainingDatasetGovernanceMutationResult,
  PersonaTrainingExecutorConfigSnapshot,
  PersonaTrainingExecutorInput,
  PersonaTrainingExecutorOutput,
  PersonaTrainingPipelineAuditEvent,
  PersonaTrainingPipelineGate,
  PersonaTrainingPipelineIncrement,
  PersonaTrainingPipelinePersistence,
  PersonaTrainingPipelineResult,
  PersonaTrainingPipelineRunRecord,
  PersonaTrainingRestartCandidate,
} from './persona-training-pipeline-gate'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
import type {
  AlicizationRuntimeCheckpoint,
  AlicizationRuntimeCheckpointScope,
} from './turn-os/checkpoint-store'
import type {
  AlicizationRuntimeEventListOptions,
  AlicizationRuntimeEventScope,
  AlicizationRuntimeEventScopeQuery,
  AlicizationRuntimeEventScopeRecord,
} from './turn-os/event-store'
import type { WorkingMemoryCompressionBehaviorFixture } from './working-memory-compression-behavior-harness'

import process from 'node:process'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { errorMessageFrom } from '@moeru/std'
import {
  normalizeAlicizationMemoryProvenance,
  parseAlicizationPersonaTrainingArtifact,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { mapFragmentSourceKindToProvenance, mapMemorySourceToProvenance } from './humanlike-memory'
import { normalizeWorkingMemoryLongTermEvidence } from './life-core/working-memory'
import {
  parseWorkingMemoryCheckpoint,
  serializeWorkingMemoryCheckpoint,
} from './life-core/working-memory-checkpoint'
import { cleanWorkingMemoryLongTermQueueItem } from './life-core/working-memory-long-term-cleaner'
import {
  createWorkingMemoryLongTermCleaningTransaction,
  createWorkingMemoryLongTermDrainMutex,
  WORKING_MEMORY_LONG_TERM_CLEANING_MAX_ATTEMPTS,
  workingMemoryLongTermCleaningRetryDelayMs,
} from './life-core/working-memory-long-term-cleaning'
import { createWorkingMemoryLongTermCleaningStoreRuntime } from './life-core/working-memory-long-term-cleaning-store'
import { projectWorkingMemoryLongTermCandidate } from './life-core/working-memory-long-term-projection'
import {
  resolveLongTermMemoryVectorSpaceId,
  safeEmbedLongTermMemoryTexts,
} from './long-term-memory-embedding-provider'
import {
  episodicEventToLongTermEvidenceCandidate,
  memoryFactToLongTermEvidenceCandidate,
} from './long-term-memory-evidence'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import {
  memoryWorkbenchItemToEvidenceCandidate,
  persistentVectorRecordToEvidenceCandidate,
} from './long-term-memory-recall-candidates'
import {
  applyLongTermMemoryReviewDecision as applyLongTermMemoryReviewDecisionToTransaction,
  createLongTermMemoryReviewItemFromTransaction,
} from './long-term-memory-review-queue'
import { createLongTermMemorySearchIndexRuntime } from './long-term-memory-search-index'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'
import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import { buildMemoryConsolidationRecords, searchMemoryConsolidationRecords } from './memory-consolidation'
import { createAlicizationMemoryConsolidationRuntime } from './memory-consolidation-runtime'
import { replayMemoryDialogue } from './memory-db-dialogue-replay-harness'
import { inferMemoryDomainFromFact, normalizeMemoryDomain } from './memory-domain-model'
import { createMemoryEmbeddingReindexRuntime } from './memory-embedding-reindex-runtime'
import { createAlicizationMemoryEpisodicReconsolidationRuntime } from './memory-episodic-reconsolidation-runtime'
import { rankAlicizationEpisodicEvents } from './memory-episodic-retrieval'
import { createAlicizationMemoryEventGraphRuntime } from './memory-event-graph-runtime'
import { rankAlicizationMemoryFacts } from './memory-fact-retrieval'
import { createAlicizationMemoryIngestJournalRuntime } from './memory-ingest-journal'
import {
  projectMemoryLiveProviderTrialToDialogueReplay,
  runMemoryLiveProviderTrial,
} from './memory-live-provider-trial'
import { createAlicizationMemoryMindStateRuntime } from './memory-mind-state-runtime'
import {
  resolveSimpleRecallGoldLabelOption,
  resolveSimpleRecallGoldReason,
} from './memory-os/simple-recall-gold-labels'
import { runMemoryProductionTrialRunner } from './memory-production-trial-runner'
import { createAlicizationMemoryRelationshipRuntime } from './memory-relationship-runtime'
import { createAlicizationMemoryRetrievalTelemetryRuntime } from './memory-retrieval-telemetry'
import { runMemoryScopeFuzzDbTrial } from './memory-scope-fuzz-db-trial'
import { createMemorySemanticScaleJobRuntime } from './memory-semantic-scale-job-runtime'
import { buildAlicizationMemoryStatsProjection } from './memory-stats-projection'
import { createAlicizationMemorySubconsciousRuntime } from './memory-subconscious-runtime'
import {
  deriveConsolidationMemoryTier,
  deriveEpisodicMemoryTier,
  deriveFactMemoryTier,
  deriveTierCounts,
} from './memory-tiering'
import { createMemoryWorkbenchHealthRuntime } from './memory-workbench-health'
import { createMemoryWorkbenchPersonaCandidateRuntime } from './memory-workbench-persona-candidates'
import { createMemoryWorkbenchPolicyStoreRuntime } from './memory-workbench-policy-store'
import { createAlicizationPersonStateEvolutionRuntime } from './person-state-evolution-runtime'
import { createPersonaTrainingDatasetRuntime } from './persona-training-dataset-runtime'
import {
  createPersonaTrainingPipelineGate,
} from './persona-training-pipeline-gate'
import { normalizePersonaTrainingProcessConfig } from './persona-training-process-executor'
import {
  resolveAlicizationAutonomousDialogueFamilyClassification,
  resolveAlicizationAutonomousDialogueOrigin,
} from './runtime-structured-format'
import { createAlicizationRuntimeCheckpointStore } from './turn-os/checkpoint-store'
import { createAlicizationRuntimeEventStore } from './turn-os/event-store'

export type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
const legacyMigrationMarker = 'legacy_memory_migrated_v1'
const memoryLastPrunedAtKey = 'memory_last_pruned_at'
const memoryRetrievalTelemetryKey = 'memory_retrieval_telemetry_v1'
interface SqliteStatementResult {
  changes: number
  lastID: number
}

interface LongTermMemoryEvidenceRetrievalDiagnostics {
  bundle: LongTermMemoryEvidenceBundle
  semanticError: string | null
}

interface MetaRow {
  value: string
}

interface JournalModeRow {
  journal_mode: string
}

interface DbWorkingMemoryCheckpointRow {
  card_id: string
  session_id: string
  version: string
  snapshot_json: string
  updated_at: number
}

interface DbMemoryReplaySessionSummaryRow {
  session_id: string
  snapshot_json: string | null
  checkpoint_updated_at: number | null
  activity_updated_at: number
  first_turn_at: number | null
  last_turn_at: number | null
  user_turn_count: number
  assistant_turn_count: number
  first_user_text: string | null
}

interface DbMemoryFactRow {
  id: string
  card_id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: AlicizationMemorySource
  dedupe_key: string
  created_at: number
  updated_at: number
  last_access_at: number | null
  access_count: number
  knowledge_stage: AlicizationKnowledgeAssimilationStage | null
  validation_status: AlicizationKnowledgeValidationStatus | null
  memory_domain: AlicizationMemoryDomain | null
  validation_count: number
  contradiction_count: number
  source_label: string | null
  conflicts_with_json: string | null
  supersedes_json: string | null
}

interface DbMemoryArchiveRow extends DbMemoryFactRow {
  original_id: string | null
  archived_at: number
}

type AlicizationMemoryIngestOperationKind
  = 'upsert-memory-facts'
    | 'append-episodic-events'
    | 'upsert-memory-consolidations'

export type AlicizationMemoryQualityGoldLabelPayload = SharedAlicizationMemoryQualityGoldLabelPayload
export type AlicizationMemoryQualityGoldLabelItem = SharedAlicizationMemoryQualityGoldLabelItem
export type AlicizationMemoryQualityGoldLabelListResult = SharedAlicizationMemoryQualityGoldLabelListResult
export type AlicizationMemoryQualityMonthlyGoldRegressionPack = SharedAlicizationMemoryQualityMonthlyGoldRegressionPack

interface DbMemoryQualityGoldLabelRow {
  id: string
  card_id: string
  month: string
  label: SimpleRecallGoldLabel
  reason: SimpleRecallGoldReason | null
  evaluation_class: SimpleRecallGoldEvaluationClass
  benchmark_dimensions_json: string
  query: string
  session_id: string | null
  expected_memory_ids_json: string
  retrieved_candidate_ids_json: string
  surfaced_memory_ids_json: string
  wrong_thread_ids_json: string
  assistant_reply: string | null
  retrieved_evidence_snapshot_json: string
  human_confirmed: number
  turn_id: string | null
  decision_trace_id: string | null
  note: string | null
  created_at: number
}

interface DbMemoryQualityMonthlyGoldPackRow {
  pack_id: string
  card_id: string
  month: string
  revision: number
  frozen_at: number
  content_hash: string
  source_label_ids_json: string
  items_snapshot_json: string
  item_count: number
}

interface PreparedMemoryFactWrite {
  id: string
  cardId: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: AlicizationMemorySource
  dedupeKey: string
  createdAt: number
  updatedAt: number
  knowledgeStage: AlicizationKnowledgeAssimilationStage
  validationStatus: AlicizationKnowledgeValidationStatus
  memoryDomain: AlicizationMemoryDomain
  validationCount: number
  contradictionCount: number
  sourceLabel: string | null
  conflictsWithJson: string
  supersedesJson: string
}

interface PreparedMemoryConsolidationWrite {
  cardId: string
  id: string
  kind: AlicizationMemoryConsolidationRecord['kind']
  facet: AlicizationMemoryConsolidationRecord['facet']
  periodKey: string
  periodStartedAt: number
  periodEndedAt: number
  summary: string
  lesson: string | null
  cuesJson: string
  confidence: number
  dominantProvenance: AlicizationMemoryConsolidationRecord['dominantProvenance']
  derivedEventIdsJson: string
  metadataJson: string | null
  updatedAt: number
}

interface PreparedEpisodicEventWrite {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationEpisodicEventInput['sourceKind']
  provenance: AlicizationMemoryProvenance
  occurredAt: number
  whereSummary: string | null
  withWhomJson: string
  threadAnchor: string | null
  whatHappened: string
  felt: string | null
  emotionTagsJson: string
  whatChanged: string | null
  relationshipMeaning: string | null
  lesson: string | null
  sourceSummary: string | null
  confidence: number
  salience: number
  sceneAttachment: number
  consolidationPriority: number
  relationshipShiftJson: string | null
  derivedFromJson: string
  tagsJson: string
  createdAt: number
  updatedAt: number
}

type AlicizationMemoryIngestPayload
  = {
    kind: 'upsert-memory-facts'
    facts: PreparedMemoryFactWrite[]
  }
  | {
    kind: 'append-episodic-events'
    events: PreparedEpisodicEventWrite[]
  }
  | {
    kind: 'upsert-memory-consolidations'
    records: PreparedMemoryConsolidationWrite[]
  }

interface DbEpisodicEventRow {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: AlicizationEpisodicEventRecord['sourceKind']
  provenance: AlicizationMemoryProvenance
  occurred_at: number
  where_summary: string | null
  with_whom_json: string | null
  thread_anchor: string | null
  what_happened: string
  felt: string | null
  emotion_tags_json: string | null
  what_changed: string | null
  relationship_meaning: string | null
  lesson: string | null
  source_summary: string | null
  confidence: number
  salience: number
  scene_attachment: number
  consolidation_priority: number
  relationship_shift_json: string | null
  derived_from_json: string | null
  tags_json: string | null
  created_at: number
  updated_at: number
  last_recalled_at: number | null
  recall_count: number
  reconsolidation_count: number
  latest_reconsolidation_json: string | null
}

interface DbEpisodicReconsolidationOverlayRow {
  id: string
  event_id: string
  at: number
  decision_trace_id: string | null
  provenance: AlicizationMemoryProvenance
  confidence: number
  reason: string
  emotion_tags_json: string | null
  relationship_meaning: string | null
  lesson: string | null
  created_at: number
}

interface DbMemoryConsolidationRow {
  card_id: string
  id: string
  kind: AlicizationMemoryConsolidationRecord['kind']
  facet: AlicizationMemoryConsolidationRecord['facet']
  period_key: string
  period_started_at: number
  period_ended_at: number
  summary: string
  lesson: string | null
  cues_json: string | null
  confidence: number
  dominant_provenance: AlicizationMemoryConsolidationRecord['dominantProvenance']
  derived_event_ids_json: string | null
  metadata_json: string | null
  updated_at: number
}

interface DbConversationTurnRow {
  card_id: string
  turn_id: string | null
  session_id: string
  user_text: string | null
  assistant_text: string | null
  structured_json: string | null
  created_at: number
}

interface DbTaskThreadRow {
  id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  origin: AlicizationExecutionTurnOrigin
  goal: string
  kind: AlicizationExecutionTaskKind
  status: AlicizationTaskThreadStatus
  selected_channel: AlicizationExecutionChannel | null
  proposed_channel: AlicizationExecutionChannel | null
  summary: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_event_at: number | null
  completed_at: number | null
}

interface DbExecutionEventRow {
  id: string
  thread_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  origin: AlicizationExecutionTurnOrigin
  channel: AlicizationExecutionChannel | null
  kind: AlicizationExecutionEventKind
  thread_status: AlicizationTaskThreadStatus | null
  payload_json: string | null
  created_at: number
}

interface DbExecutorSessionRow {
  id: string
  channel: AlicizationExecutionChannel
  affinity_key: string
  external_session_id: string | null
  status: AlicizationExecutorSessionStatus
  summary: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_used_at: number | null
}

interface DbChannelCapabilityManifestRow {
  channel: AlicizationExecutionChannel
  available: number
  enabled: number
  ready: number
  session_affinity: number
  reason: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_checked_at: number | null
}

interface AlicizationMemoryRecollectionIntentLike {
  mode: 'none' | 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
  temporalFocus: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
  searchEpisodes: boolean
  searchProceduralExperience: boolean
  queryHints: string[]
  rationale: string
  confidence: number
  recollectionAgenda?: {
    whyRecallNow: string
    goalSimilarity: number
    relationshipNeed: number
    affectivePull: number
    sceneFamiliarity: number
    candidateTimeScopes: Array<{
      scope: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
      weight: number
      rationale?: string | null
    }>
    candidateEraFacets: Array<{
      facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | 'window'
      weight: number
      rationale?: string | null
    }>
    candidateProcedureLines: string[]
    uncertaintyTolerance: 'low' | 'medium' | 'high'
  } | null
}

interface AlicizationMemoryConsolidationSearchInput {
  query: string
  limit?: number
  recollectionIntent?: AlicizationMemoryRecollectionIntentLike | null
}

type AlicizationScheduledTaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AlicizationScheduledTaskRecord {
  id: string
  taskId: string
  triggerAt: number
  message: string
  status: AlicizationScheduledTaskStatus
  createdAt: number
  claimedAt: number | null
  completedAt: number | null
  sourceTurnId: string | null
  firedTurnId: string | null
  lastError: string | null
}

interface DbScheduledTaskRow {
  id: string
  task_id: string
  trigger_at: number
  message: string
  status: AlicizationScheduledTaskStatus
  created_at: number
  claimed_at: number | null
  completed_at: number | null
  source_turn_id: string | null
  fired_turn_id: string | null
  last_error: string | null
}

interface DbLearningTaskRow {
  id: string
  card_id: string
  task_id: string
  status: AlicizationLearningTaskStatus
  trigger_at: number
  action: AlicizationLearningAction
  message: string
  payload_json: string
  attempt_count: number
  max_attempts: number
  created_at: number
  updated_at: number
  claimed_at: number | null
  started_at: number | null
  completed_at: number | null
  blocked_at: number | null
  cancelled_at: number | null
  downgraded_at: number | null
  reopened_at: number | null
  next_retry_at: number | null
  source_turn_id: string | null
  result_summary: string | null
  failure_kind: AlicizationLearningTaskFailureKind | null
  last_error: string | null
  fired_turn_id: string | null
}

interface DbWriteOptions {
  signal?: AbortSignal
}

interface AlicizationDbConversationTurnInput extends AlicizationConversationTurnInput {
  cardId?: string
}

const executionChannels = new Set<AlicizationExecutionChannel>([
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
])

const executionChannelSessionAffinity = new Set<AlicizationExecutionChannel>([
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
])

const executionTaskKinds = new Set<AlicizationExecutionTaskKind>([
  'run-command',
  'codebase-edit',
  'codebase-investigation',
  'browser-automation',
  'software-automation',
  'desktop-automation',
  'agent-delegation',
  'mixed',
  'unknown',
])

const taskThreadStatuses = new Set<AlicizationTaskThreadStatus>([
  'planned',
  'needs-affirmation',
  'running',
  'paused',
  'blocked',
  'completed',
  'failed',
  'cancelled',
  'dead-lettered',
])

const terminalTaskThreadStatuses = new Set<AlicizationTaskThreadStatus>([
  'blocked',
  'completed',
  'failed',
  'cancelled',
  'dead-lettered',
])

const executionEventKinds = new Set<AlicizationExecutionEventKind>([
  'plan',
  'dispatch',
  'step',
  'result',
  'cancel',
  'resume',
  'takeover',
])

const executorSessionStatuses = new Set<AlicizationExecutorSessionStatus>([
  'active',
  'running',
  'failed',
  'suspended',
])

function parseMindTurnEventPayload(raw: string | null) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

function readMindTurnEventObject(raw: unknown) {
  return raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : null
}

function readMindTurnEventText(raw: unknown) {
  return typeof raw === 'string' && raw.trim()
    ? raw.trim()
    : null
}

function resolveMindTurnEventActiveThreadId(payload: Record<string, unknown> | null) {
  if (!payload)
    return null

  const directActiveThreadId = readMindTurnEventText(payload.activeThreadId)
  if (directActiveThreadId)
    return directActiveThreadId

  const runtimeCandidate = readMindTurnEventObject(payload.runtime)
  const runtimeActiveThreadId = readMindTurnEventText(runtimeCandidate?.activeThreadId)
  if (runtimeActiveThreadId)
    return runtimeActiveThreadId

  const spineCandidate = readMindTurnEventObject(payload.digitalLifeSpine)
  const spineRuntimeCandidate = readMindTurnEventObject(spineCandidate?.runtime)
  const spineRuntimeActiveThreadId = readMindTurnEventText(spineRuntimeCandidate?.activeThreadId)
  if (spineRuntimeActiveThreadId)
    return spineRuntimeActiveThreadId

  return null
}

function parseJsonObject(raw: string | null) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

function parsePersistedPersonaTrainingArtifact(
  raw: string | null,
  context: string,
): AlicizationPersonaTrainingArtifact | null {
  if (!raw)
    return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  }
  catch (error) {
    throw new Error(`invalid persisted persona training artifact (${context}): malformed JSON`, {
      cause: error,
    })
  }
  try {
    return parseAlicizationPersonaTrainingArtifact(parsed)
  }
  catch (error) {
    throw new Error(`invalid persisted persona training artifact (${context}): ${errorMessageFrom(error) ?? String(error)}`, {
      cause: error,
    })
  }
}

function serializePersonaTrainingArtifact(
  artifact: AlicizationPersonaTrainingArtifact | null,
) {
  if (artifact == null)
    return null
  return JSON.stringify(parseAlicizationPersonaTrainingArtifact(artifact))
}

function requirePersistedPersonaTrainingArtifact(
  raw: string | null,
  context: string,
  expectedRunId: string,
) {
  const artifact = parsePersistedPersonaTrainingArtifact(raw, context)
  if (!artifact)
    throw new Error(`invalid persisted persona training artifact (${context}): value is missing`)
  if (artifact.runId !== expectedRunId) {
    throw new Error(
      `invalid persisted persona training artifact (${context}): runId does not match persisted owner`,
    )
  }
  return artifact
}

function parsePersistedPersonaTrainingExecutorConfig(
  raw: string | null,
  context: string,
) {
  if (!raw)
    return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  }
  catch (error) {
    throw new Error(`invalid persisted persona training executor config (${context}): malformed JSON`, {
      cause: error,
    })
  }
  try {
    const normalized = normalizePersonaTrainingProcessConfig(parsed)
    const value = parsed as Record<string, unknown>
    const config: PersonaTrainingExecutorConfigSnapshot = {
      executable: normalized.executable,
      baseModel: normalized.baseModel,
      timeoutMs: normalized.timeoutMs,
    }
    if (Object.prototype.hasOwnProperty.call(value, 'backend') && value.backend != null)
      config.backend = normalized.backend
    if (Object.prototype.hasOwnProperty.call(value, 'iterations') && value.iterations != null)
      config.iterations = normalized.iterations
    if (Object.prototype.hasOwnProperty.call(value, 'learningRate') && value.learningRate != null)
      config.learningRate = normalized.learningRate
    if (Object.prototype.hasOwnProperty.call(value, 'loraLayers') && value.loraLayers != null)
      config.loraLayers = normalized.loraLayers
    if (Object.prototype.hasOwnProperty.call(value, 'batchSize') && value.batchSize != null)
      config.batchSize = normalized.batchSize
    if (Object.prototype.hasOwnProperty.call(value, 'maxSeqLength') && value.maxSeqLength != null)
      config.maxSeqLength = normalized.maxSeqLength
    if (Object.prototype.hasOwnProperty.call(value, 'maskPrompt') && value.maskPrompt != null)
      config.maskPrompt = normalized.maskPrompt
    if (Object.prototype.hasOwnProperty.call(value, 'seed') && value.seed != null)
      config.seed = normalized.seed
    return config
  }
  catch (error) {
    throw new Error(`invalid persisted persona training executor config (${context}): ${errorMessageFrom(error) ?? String(error)}`, {
      cause: error,
    })
  }
}

function parseMemoryIngestPayload(raw: string): AlicizationMemoryIngestPayload | null {
  const parsed = parseJsonObject(raw)
  if (!parsed || typeof parsed.kind !== 'string')
    return null
  if (parsed.kind === 'upsert-memory-facts' && Array.isArray(parsed.facts))
    return parsed as unknown as AlicizationMemoryIngestPayload
  if (parsed.kind === 'append-episodic-events' && Array.isArray(parsed.events))
    return parsed as unknown as AlicizationMemoryIngestPayload
  if (parsed.kind === 'upsert-memory-consolidations' && Array.isArray(parsed.records))
    return parsed as unknown as AlicizationMemoryIngestPayload
  return null
}

function parseJsonStringArray(raw: string | null) {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed))
      return []
    return parsed
      .map(item => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean)
  }
  catch {
    return []
  }
}

function parseJsonUnknown(raw: string | null): unknown[] {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

function parseJsonObjectArray(raw: string | null) {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed))
      return []
    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => item as Record<string, unknown>)
  }
  catch {
    return []
  }
}

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function buildDedupeKey(subject: string, predicate: string, object: string) {
  return `${subject.trim().toLowerCase()}|${predicate.trim().toLowerCase()}|${object.trim().toLowerCase()}`
}

function parseStringArray(raw: string | null): string[] {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed))
      return []
    return parsed
      .map(item => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean)
  }
  catch {
    return []
  }
}

function normalizeStringArray(values: Array<string | null | undefined> | null | undefined, maxItems = 16) {
  const result: string[] = []
  for (const raw of values ?? []) {
    const normalized = typeof raw === 'string' ? raw.trim().slice(0, 120) : ''
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function normalizeKnowledgeStage(raw: unknown): AlicizationKnowledgeAssimilationStage {
  if (
    raw === 'ephemeral-observation'
    || raw === 'working-understanding'
    || raw === 'validated-knowledge'
    || raw === 'internalized-long-horizon-knowledge'
  ) {
    return raw
  }
  return 'working-understanding'
}

function normalizeValidationStatus(raw: unknown): AlicizationKnowledgeValidationStatus {
  if (
    raw === 'unverified'
    || raw === 'provisional'
    || raw === 'validated'
    || raw === 'superseded'
  ) {
    return raw
  }
  return 'unverified'
}

function mapFactRow(row: DbMemoryFactRow): AlicizationMemoryFact {
  const mapped: AlicizationMemoryFact = {
    id: row.id,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    confidence: clamp01(row.confidence),
    source: row.source,
    dedupeKey: row.dedupe_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessAt: typeof row.last_access_at === 'number' ? row.last_access_at : null,
    accessCount: Math.max(0, Math.floor(row.access_count)),
    knowledgeStage: normalizeKnowledgeStage(row.knowledge_stage),
    validationStatus: normalizeValidationStatus(row.validation_status),
    memoryDomain: row.memory_domain
      ? normalizeMemoryDomain(row.memory_domain)
      : inferMemoryDomainFromFact({
          subject: row.subject,
          predicate: row.predicate,
          object: row.object,
        }),
    validationCount: Math.max(0, Math.floor(row.validation_count ?? 0)),
    contradictionCount: Math.max(0, Math.floor(row.contradiction_count ?? 0)),
    sourceLabel: typeof row.source_label === 'string' && row.source_label.trim()
      ? row.source_label.trim()
      : null,
    conflictsWith: parseStringArray(row.conflicts_with_json),
    supersedes: parseStringArray(row.supersedes_json),
    provenance: mapMemorySourceToProvenance(row.source),
  }
  mapped.memoryTier = deriveFactMemoryTier(mapped, now())
  return mapped
}

function mapDerivedMemoryReferences(raw: string | null): AlicizationDerivedMemoryReference[] {
  const result: AlicizationDerivedMemoryReference[] = []
  for (const item of parseJsonObjectArray(raw)) {
    const kind = typeof item.kind === 'string' ? item.kind.trim() : ''
    if (!kind)
      continue
    result.push({
      kind: kind as AlicizationDerivedMemoryReference['kind'],
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : null,
      label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : null,
    })
  }
  return result
}

function mapEpisodicReconsolidation(raw: string | null): AlicizationEpisodicReconsolidationSnapshot | null {
  const parsed = parseJsonObject(raw)
  if (!parsed)
    return null
  const at = Number(parsed.at)
  const provenance = parsed.provenance
  const confidence = Number(parsed.confidence)
  const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : ''
  if (!Number.isFinite(at) || !reason)
    return null
  return {
    at: Math.max(0, Math.floor(at)),
    decisionTraceId: typeof parsed.decisionTraceId === 'string' && parsed.decisionTraceId.trim()
      ? parsed.decisionTraceId.trim()
      : null,
    provenance: normalizeAlicizationMemoryProvenance(provenance, 'reconstructed'),
    confidence: clamp01(confidence),
    reason,
    emotionTags: parseJsonStringArray(JSON.stringify(parsed.emotionTags ?? [])),
    relationshipMeaning: typeof parsed.relationshipMeaning === 'string' && parsed.relationshipMeaning.trim()
      ? parsed.relationshipMeaning.trim()
      : null,
    lesson: typeof parsed.lesson === 'string' && parsed.lesson.trim()
      ? parsed.lesson.trim()
      : null,
  }
}

function mapEpisodicReconsolidationOverlayRow(row: DbEpisodicReconsolidationOverlayRow): AlicizationEpisodicReconsolidationSnapshot {
  return {
    at: Math.max(0, Math.floor(row.at)),
    decisionTraceId: row.decision_trace_id,
    provenance: row.provenance,
    confidence: clamp01(row.confidence),
    reason: row.reason,
    emotionTags: parseJsonStringArray(row.emotion_tags_json),
    relationshipMeaning: row.relationship_meaning,
    lesson: row.lesson,
  }
}

function mapEpisodicEventRow(
  row: DbEpisodicEventRow,
  overlay?: {
    latest: AlicizationEpisodicReconsolidationSnapshot | null
    count: number
  } | null,
): AlicizationEpisodicEventRecord {
  const latestOverlay = overlay?.latest ?? null
  const latestReconsolidation = latestOverlay ?? mapEpisodicReconsolidation(row.latest_reconsolidation_json)
  const mapped: AlicizationEpisodicEventRecord = {
    id: row.id,
    cardId: row.card_id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    sourceKind: row.source_kind,
    provenance: row.provenance,
    occurredAt: Math.max(0, Math.floor(row.occurred_at)),
    whereSummary: row.where_summary,
    withWhom: parseJsonStringArray(row.with_whom_json),
    threadAnchor: row.thread_anchor,
    whatHappened: row.what_happened,
    felt: row.felt,
    emotionTags: latestReconsolidation?.emotionTags?.length
      ? latestReconsolidation.emotionTags
      : parseJsonStringArray(row.emotion_tags_json),
    whatChanged: row.what_changed,
    relationshipMeaning: latestReconsolidation?.relationshipMeaning ?? row.relationship_meaning,
    lesson: latestReconsolidation?.lesson ?? row.lesson,
    sourceSummary: row.source_summary,
    confidence: latestReconsolidation?.confidence ?? clamp01(row.confidence),
    salience: clamp01(row.salience),
    sceneAttachment: clamp01(row.scene_attachment),
    consolidationPriority: clamp01(row.consolidation_priority),
    relationshipShift: parseJsonObject(row.relationship_shift_json) as AlicizationEpisodicEventRecord['relationshipShift'],
    derivedFrom: mapDerivedMemoryReferences(row.derived_from_json),
    tags: parseJsonStringArray(row.tags_json),
    createdAt: Math.max(0, Math.floor(row.created_at)),
    updatedAt: Math.max(0, Math.floor(row.updated_at)),
    lastRecalledAt: typeof row.last_recalled_at === 'number' ? Math.max(0, Math.floor(row.last_recalled_at)) : null,
    recallCount: Math.max(0, Math.floor(row.recall_count)),
    reconsolidationCount: overlay?.count ?? Math.max(0, Math.floor(row.reconsolidation_count)),
    latestReconsolidation,
  }
  mapped.memoryTier = deriveEpisodicMemoryTier(mapped, now())
  return mapped
}

function mapMemoryConsolidationRow(row: DbMemoryConsolidationRow): AlicizationMemoryConsolidationRecord {
  const mapped: AlicizationMemoryConsolidationRecord = {
    id: row.id,
    kind: row.kind,
    facet: row.facet === 'phase' || row.facet === 'relationship-era' || row.facet === 'task-era' || row.facet === 'self-era'
      ? row.facet
      : null,
    periodKey: row.period_key,
    periodStartedAt: row.period_started_at,
    periodEndedAt: row.period_ended_at,
    summary: row.summary,
    lesson: row.lesson,
    cues: parseJsonStringArray(row.cues_json),
    confidence: clamp01(row.confidence),
    dominantProvenance: row.dominant_provenance,
    derivedEventIds: parseJsonStringArray(row.derived_event_ids_json),
    metadata: parseJsonObject(row.metadata_json),
    updatedAt: row.updated_at,
  }
  mapped.memoryTier = deriveConsolidationMemoryTier(mapped, now())
  return mapped
}

function normalizeExecutionOrigin(input: {
  origin?: unknown
  turnId?: unknown
}): AlicizationExecutionTurnOrigin {
  const normalized = typeof input.origin === 'string'
    ? input.origin.trim().toLowerCase()
    : ''
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: input.turnId,
    origin: normalized,
  })
  if (autonomousDialogueFamily.isAutonomous)
    return autonomousDialogueFamily.canonicalOrigin ?? resolveAlicizationAutonomousDialogueOrigin('proactive')
  if (normalized === 'system')
    return 'system'
  return 'user-turn'
}

function normalizeExecutionChannel(value: unknown): AlicizationExecutionChannel | null {
  return typeof value === 'string' && executionChannels.has(value as AlicizationExecutionChannel)
    ? value as AlicizationExecutionChannel
    : null
}

function normalizeExecutionTaskKind(value: unknown): AlicizationExecutionTaskKind {
  return typeof value === 'string' && executionTaskKinds.has(value as AlicizationExecutionTaskKind)
    ? value as AlicizationExecutionTaskKind
    : 'unknown'
}

function normalizeTaskThreadStatus(value: unknown): AlicizationTaskThreadStatus {
  return typeof value === 'string' && taskThreadStatuses.has(value as AlicizationTaskThreadStatus)
    ? value as AlicizationTaskThreadStatus
    : 'planned'
}

function shouldReplaceTaskThreadProjection(input: {
  existingStatus: AlicizationTaskThreadStatus | null
  existingCreatedAt: number
  nextStatus: AlicizationTaskThreadStatus | null
  nextCreatedAt: number
}) {
  const existingIsTerminal = input.existingStatus !== null
    && terminalTaskThreadStatuses.has(input.existingStatus)
  const nextIsTerminal = input.nextStatus !== null
    && terminalTaskThreadStatuses.has(input.nextStatus)
  if (existingIsTerminal && !nextIsTerminal)
    return false

  const existingIsDeadLettered = input.existingStatus === 'dead-lettered'
  const nextIsDeadLettered = input.nextStatus === 'dead-lettered'
  if (nextIsDeadLettered && !existingIsDeadLettered)
    return true
  if (existingIsTerminal && nextIsTerminal && existingIsDeadLettered && !nextIsDeadLettered)
    return false

  return input.existingCreatedAt <= input.nextCreatedAt
}

function normalizeExecutionEventKind(value: unknown) {
  return typeof value === 'string' && executionEventKinds.has(value as AlicizationExecutionEventKind)
    ? value as AlicizationExecutionEventKind
    : null
}

function normalizeExecutorSessionStatus(value: unknown): AlicizationExecutorSessionStatus {
  return typeof value === 'string' && executorSessionStatuses.has(value as AlicizationExecutorSessionStatus)
    ? value as AlicizationExecutorSessionStatus
    : 'active'
}

function mapTaskThreadRow(row: DbTaskThreadRow): AlicizationTaskThreadRecord {
  return {
    id: row.id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    origin: row.origin,
    goal: row.goal,
    kind: row.kind,
    status: row.status,
    selectedChannel: row.selected_channel,
    proposedChannel: row.proposed_channel,
    summary: row.summary,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEventAt: row.last_event_at,
    completedAt: row.completed_at,
  }
}

function mapExecutionEventRow(row: DbExecutionEventRow): AlicizationExecutionEventRecord {
  return {
    id: row.id,
    threadId: row.thread_id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    origin: row.origin,
    channel: row.channel,
    kind: row.kind,
    threadStatus: row.thread_status,
    payload: parseJsonObject(row.payload_json),
    createdAt: row.created_at,
  }
}

function mapExecutorSessionRow(row: DbExecutorSessionRow): AlicizationExecutorSessionRecord {
  return {
    id: row.id,
    channel: row.channel,
    affinityKey: row.affinity_key,
    externalSessionId: row.external_session_id,
    status: row.status,
    summary: row.summary,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  }
}

function mapChannelCapabilityManifestRow(row: DbChannelCapabilityManifestRow): AlicizationChannelCapabilityManifestRecord {
  return {
    channel: row.channel,
    available: row.available === 1,
    enabled: row.enabled === 1,
    ready: row.ready === 1,
    sessionAffinity: row.session_affinity === 1,
    reason: row.reason,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastCheckedAt: row.last_checked_at,
  }
}

function now() {
  return Date.now()
}

const memoryIngestRetryBaseMs = 5_000
const memoryIngestRetryMaxMs = 15 * 60_000

function buildMemoryIngestBackoffMs(attemptCount: number) {
  const safeAttempts = Math.max(0, Math.floor(attemptCount))
  return Math.min(memoryIngestRetryMaxMs, memoryIngestRetryBaseMs * 2 ** safeAttempts)
}

function clampRelationshipDelta(value: number, maxAbs = 0.08) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(-maxAbs, Math.min(maxAbs, value))
}

function mapScheduledTaskRow(row: DbScheduledTaskRow): AlicizationScheduledTaskRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    triggerAt: row.trigger_at,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    completedAt: row.completed_at,
    sourceTurnId: row.source_turn_id,
    firedTurnId: row.fired_turn_id,
    lastError: row.last_error,
  }
}

function sanitizeLearningTaskPayloadText(raw: unknown, maxChars: number) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars) || null
}

function parseLearningTaskPayload(raw: string): AlicizationLearningTaskPayload {
  try {
    const candidate = JSON.parse(raw) as Partial<AlicizationLearningTaskPayload> | null
    return {
      sourceTurnId: typeof candidate?.sourceTurnId === 'string' && candidate.sourceTurnId.trim() ? candidate.sourceTurnId.trim() : null,
      decisionTraceId: typeof candidate?.decisionTraceId === 'string' && candidate.decisionTraceId.trim() ? candidate.decisionTraceId.trim() : null,
      sourceSessionId: typeof candidate?.sourceSessionId === 'string' && candidate.sourceSessionId.trim() ? candidate.sourceSessionId.trim() : null,
      action: candidate?.action === 'record' || candidate?.action === 'reflect' || candidate?.action === 'verify' || candidate?.action === 'revise' || candidate?.action === 'internalize'
        ? candidate.action
        : 'record',
      reason: sanitizeLearningTaskPayloadText(candidate?.reason, 280),
      focuses: Array.isArray(candidate?.focuses) ? candidate.focuses.map(item => sanitizeLearningTaskPayloadText(item, 220)).filter((item): item is string => Boolean(item)).slice(0, 12) : [],
      dominantTrajectory: sanitizeLearningTaskPayloadText(candidate?.dominantTrajectory, 220),
      sourceSignals: Array.isArray(candidate?.sourceSignals) ? candidate.sourceSignals.map(item => sanitizeLearningTaskPayloadText(item, 220)).filter((item): item is string => Boolean(item)).slice(0, 12) : [],
      learningReadiness: Number.isFinite(Number(candidate?.learningReadiness)) ? Math.max(0, Math.min(1, Number(candidate?.learningReadiness))) : 0,
      contradictionPressure: Number.isFinite(Number(candidate?.contradictionPressure)) ? Math.max(0, Math.min(1, Number(candidate?.contradictionPressure))) : 0,
      revisionPressure: Number.isFinite(Number(candidate?.revisionPressure)) ? Math.max(0, Math.min(1, Number(candidate?.revisionPressure))) : 0,
      autobiographicalStability: Number.isFinite(Number(candidate?.autobiographicalStability)) ? Math.max(0, Math.min(1, Number(candidate?.autobiographicalStability))) : 0,
      supportingFactIds: Array.isArray(candidate?.supportingFactIds) ? candidate.supportingFactIds.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 24) : [],
      supportingReflectionIds: Array.isArray(candidate?.supportingReflectionIds) ? candidate.supportingReflectionIds.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 24) : [],
      supportingOutcomeIds: Array.isArray(candidate?.supportingOutcomeIds) ? candidate.supportingOutcomeIds.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 24) : [],
      supersedeTargets: Array.isArray(candidate?.supersedeTargets) ? candidate.supersedeTargets.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 24) : [],
      conflictTargets: Array.isArray(candidate?.conflictTargets) ? candidate.conflictTargets.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 24) : [],
    }
  }
  catch {
    return {
      sourceTurnId: null,
      decisionTraceId: null,
      sourceSessionId: null,
      action: 'record',
      reason: null,
      focuses: [],
      dominantTrajectory: null,
      sourceSignals: [],
      learningReadiness: 0,
      contradictionPressure: 0,
      revisionPressure: 0,
      autobiographicalStability: 0,
      supportingFactIds: [],
      supportingReflectionIds: [],
      supportingOutcomeIds: [],
      supersedeTargets: [],
      conflictTargets: [],
    }
  }
}

function mapLearningTaskRow(row: DbLearningTaskRow): AlicizationLearningTaskRecord {
  return {
    id: row.id,
    cardId: row.card_id,
    taskId: row.task_id,
    status: row.status,
    triggerAt: row.trigger_at,
    action: row.action,
    message: row.message,
    payload: parseLearningTaskPayload(row.payload_json),
    attemptCount: Math.max(0, row.attempt_count),
    maxAttempts: Math.max(1, row.max_attempts),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimedAt: row.claimed_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    blockedAt: row.blocked_at,
    cancelledAt: row.cancelled_at,
    downgradedAt: row.downgraded_at,
    reopenedAt: row.reopened_at,
    nextRetryAt: row.next_retry_at,
    sourceTurnId: row.source_turn_id,
    resultSummary: row.result_summary,
    failureKind: row.failure_kind,
    lastError: row.last_error,
    firedTurnId: row.fired_turn_id,
  }
}

function createAbortError(reason?: unknown) {
  if (reason instanceof DOMException && reason.name === 'AbortError')
    return reason
  if (reason instanceof Error && reason.name === 'AbortError')
    return reason
  return new DOMException('Aborted before SQLite write execution', 'AbortError')
}

function assertWriteNotAborted(options?: DbWriteOptions) {
  if (!options?.signal?.aborted)
    return
  throw createAbortError(options.signal.reason)
}

interface SqliteDriver {
  Database: typeof sqlite3.Database
}

function openDatabase(filepath: string, driver: SqliteDriver = sqlite3) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    let database: sqlite3.Database | null = null
    const onOpen = (error: Error | null) => {
      if (error) {
        reject(error)
        return
      }
      if (database) {
        resolve(database)
        return
      }

      queueMicrotask(() => {
        if (database) {
          resolve(database)
          return
        }
        reject(new Error('sqlite3 opened without database handle'))
      })
    }

    database = new driver.Database(filepath, onOpen)
  })
}

function run(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<SqliteStatementResult>((resolve, reject) => {
    database.run(sql, params, function callback(error) {
      if (error) {
        reject(error)
        return
      }

      resolve({
        changes: this.changes,
        lastID: this.lastID,
      })
    })
  })
}

function get<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row as T | undefined)
    })
  })
}

function all<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve((rows ?? []) as T[])
    })
  })
}

function close(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

function chunkValues<T>(values: T[], chunkSize = 180) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += chunkSize)
    chunks.push(values.slice(index, index + chunkSize))
  return chunks
}

async function runInTransaction<T>(database: sqlite3.Database, task: () => Promise<T>) {
  await run(database, 'BEGIN IMMEDIATE')
  try {
    const result = await task()
    await run(database, 'COMMIT')
    return result
  }
  catch (error) {
    await run(database, 'ROLLBACK').catch(() => {})
    throw error
  }
}

async function supportsRuntimeCheckpointSchemaV3(database: sqlite3.Database) {
  const savepoint = 'alicization_runtime_checkpoint_schema_probe'
  const probeId = randomUUID()
  const insertProbe = async (schemaVersion: number, suffix: string) => {
    await run(
      database,
      `
      INSERT INTO alicization_runtime_checkpoints (
        turn_id,
        card_id,
        user_id,
        conversation_id,
        sequence,
        runtime_status,
        active_action_ids_json,
        delivery_owner,
        projection_json,
        schema_version,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        `schema-probe-turn-${probeId}-${suffix}`,
        `schema-probe-card-${probeId}`,
        `schema-probe-user-${probeId}`,
        `schema-probe-conversation-${probeId}`,
        0,
        'accepted',
        '[]',
        'inline',
        '{}',
        schemaVersion,
        0,
      ],
    )
  }

  await run(database, `SAVEPOINT ${savepoint}`)
  try {
    await insertProbe(3, 'accepted')
    try {
      await insertProbe(2, 'rejected')
      return false
    }
    catch {
      return true
    }
  }
  catch {
    return false
  }
  finally {
    await run(database, `ROLLBACK TO SAVEPOINT ${savepoint}`)
    await run(database, `RELEASE SAVEPOINT ${savepoint}`)
  }
}

async function loadLatestEpisodicReconsolidationOverlayByEventId(
  database: sqlite3.Database,
  queryAll: typeof all,
  eventIds: string[],
) {
  const normalizedIds = [...new Set(eventIds.map(id => id.trim()).filter(Boolean))]
  if (normalizedIds.length === 0)
    return new Map<string, { latest: DbEpisodicReconsolidationOverlayRow | null, count: number }>()

  const overlays = new Map<string, { latest: DbEpisodicReconsolidationOverlayRow | null, count: number }>()
  for (const chunk of chunkValues(normalizedIds, 160)) {
    const placeholders = chunk.map(() => '?').join(', ')
    const rows = await queryAll<DbEpisodicReconsolidationOverlayRow>(
      database,
      `
      SELECT *
      FROM episodic_reconsolidation_overlays
      WHERE event_id IN (${placeholders})
      ORDER BY at DESC, created_at DESC
      `,
      chunk,
    )
    for (const row of rows) {
      const existing = overlays.get(row.event_id)
      if (!existing) {
        overlays.set(row.event_id, {
          latest: row,
          count: 1,
        })
        continue
      }
      overlays.set(row.event_id, {
        latest: existing.latest ?? row,
        count: existing.count + 1,
      })
    }
  }

  return overlays
}

export interface AlicizationDbService {
  dbPath: string
  close: () => Promise<void>
  appendRuntimeEvent: (
    scope: AlicizationRuntimeEventScope,
    event: AlicizationRuntimeEventEnvelope,
  ) => Promise<AlicizationRuntimeEventEnvelope>
  listRuntimeEvents: (
    scope: AlicizationRuntimeEventScope,
    options?: AlicizationRuntimeEventListOptions,
  ) => Promise<AlicizationRuntimeEventEnvelope[]>
  listRuntimeEventScopes: (
    query: AlicizationRuntimeEventScopeQuery,
  ) => Promise<AlicizationRuntimeEventScopeRecord[]>
  saveRuntimeCheckpoint: (
    checkpoint: AlicizationRuntimeCheckpoint,
  ) => Promise<AlicizationRuntimeCheckpoint>
  loadRuntimeCheckpoint: (
    scope: AlicizationRuntimeCheckpointScope,
  ) => Promise<AlicizationRuntimeCheckpoint | null>
  getMetaValue: (key: string) => Promise<string | undefined>
  setMetaValue: (key: string, value: string, options?: DbWriteOptions) => Promise<void>
  getLatestConversationSessionId: (cardId?: string) => Promise<string | undefined>
  getWorkingMemoryCheckpoint: (cardId: string, sessionId: string) => Promise<WorkingMemorySnapshot | null>
  listWorkingMemoryCheckpoints: (cardId: string, options?: { limit?: number }) => Promise<WorkingMemorySnapshot[]>
  listMemoryWorkbenchReplaySessions: (input: {
    cardId: string
    limit?: number
    cursor?: string | null
  }) => Promise<AlicizationMemoryReplaySessionListResult>
  upsertWorkingMemoryCheckpoint: (snapshot: WorkingMemorySnapshot) => Promise<void>
  clearWorkingMemoryCheckpoints: (cardId?: string, sessionId?: string) => Promise<void>
  listConversationTurnsSince: (sinceExclusive: number, options?: { cardId?: string, limit?: number }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string | null
    assistantText: string | null
    structuredJson: string | null
    createdAt: number
  }>>
  listConversationTurnsBySession: (sessionId: string, options?: { cardId?: string, sinceCreatedAt?: number, limit?: number }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string | null
    assistantText: string | null
    structuredJson: string | null
    createdAt: number
  }>>
  listMemoryConsolidations: (limit?: number) => Promise<AlicizationMemoryConsolidationRecord[]>
  upsertMemoryConsolidations: (records: AlicizationMemoryConsolidationRecord[]) => Promise<AlicizationMemoryConsolidationRecord[]>
  searchMemoryConsolidations: (input: AlicizationMemoryConsolidationSearchInput) => Promise<AlicizationMemoryConsolidationRecord[]>
  appendMindTurnEvents: (events: AlicizationMindTurnEventInput[], options?: DbWriteOptions) => Promise<void>
  listMindTurnEvents: (input: {
    decisionTraceId?: string
    turnId?: string
    activeThreadId?: string
    kind?: AlicizationMindTurnEventKind
    limit?: number
  }) => Promise<AlicizationMindTurnEventRecord[]>
  getTaskThread: (id: string) => Promise<AlicizationTaskThreadRecord | undefined>
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput, options?: DbWriteOptions) => Promise<AlicizationTaskThreadRecord>
  resumeTaskThread: (input: AlicizationTaskThreadResumeInput, options?: DbWriteOptions) => Promise<AlicizationTaskThreadRecord>
  listTaskThreads: (input?: AlicizationListTaskThreadsInput) => Promise<AlicizationTaskThreadRecord[]>
  upsertChannelCapabilityManifest: (input: AlicizationChannelCapabilityManifestUpsertInput, options?: DbWriteOptions) => Promise<AlicizationChannelCapabilityManifestRecord>
  listChannelCapabilityManifests: (input?: AlicizationListChannelCapabilityManifestsInput) => Promise<AlicizationChannelCapabilityManifestRecord[]>
  upsertExecutorSession: (input: AlicizationExecutorSessionUpsertInput, options?: DbWriteOptions) => Promise<AlicizationExecutorSessionRecord>
  listExecutorSessions: (input?: AlicizationListExecutorSessionsInput) => Promise<AlicizationExecutorSessionRecord[]>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[], options?: DbWriteOptions) => Promise<void>
  listExecutionEvents: (input?: AlicizationListExecutionEventsInput) => Promise<AlicizationExecutionEventRecord[]>
  clearConversationData: () => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput) => Promise<void>
  appendConversationTurn: (input: AlicizationDbConversationTurnInput, options?: DbWriteOptions) => Promise<void>
  getMemoryStats: () => Promise<AlicizationMemoryStats>
  upsertMemoryFacts: (facts: AlicizationMemoryFactInput[], source: AlicizationMemorySource) => Promise<void>
  applyMemoryFactCorrections: (corrections: AlicizationKnowledgeAssimilationCorrection[]) => Promise<void>
  listMemoryFacts: () => Promise<AlicizationMemoryFact[]>
  retrieveMemoryFacts: (query: string, limit?: number) => Promise<AlicizationMemoryFact[]>
  retrieveLongTermMemoryEvidence: (input: {
    cardId: string
    userId?: string
    currentUserText: string
    workingMemoryQueryHints?: string[]
    currentThreadTitle?: string | null
    activeTask?: string | null
    limit?: number
  }) => Promise<LongTermMemoryEvidenceBundle>
  retrieveLongTermMemoryEvidenceReadOnly: (input: {
    cardId: string
    userId?: string
    currentUserText: string
    workingMemoryQueryHints?: string[]
    currentThreadTitle?: string | null
    activeTask?: string | null
    limit?: number
  }) => Promise<LongTermMemoryEvidenceBundle>
  listMemoryWorkbenchLongTermItems: (input: {
    cardId: string
    kind?: AlicizationMemoryWorkbenchKind | 'all'
    query?: string
    sensitivity?: AlicizationMemoryWorkbenchSensitivity | 'all'
    visibility?: AlicizationMemoryWorkbenchVisibility | 'all'
    training?: AlicizationMemoryWorkbenchTrainingState | 'all'
    source?: string
    limit?: number
    cursor?: string | null
  }) => Promise<{ items: AlicizationMemoryWorkbenchItem[], nextCursor: string | null }>
  manageMemoryWorkbenchWorkingMemoryCleaningQueue: (input: {
    cardId: string
    action?: 'list' | 'retry-dead-letter'
    itemIds?: string[]
    limit?: number
    cursor?: string | null
  }) => Promise<AlicizationWorkingMemoryCleaningQueueResult>
  rebuildLongTermMemorySearchIndex: (input: { cardId: string }) => Promise<{ indexed: number }>
  listMemoryWorkbenchReviewItems: (input: { cardId: string, limit?: number }) => Promise<AlicizationLongTermMemoryReviewItem[]>
  applyMemoryWorkbenchReviewAction: (input: {
    cardId: string
    reviewItemId: string
    decision: AlicizationMemoryWorkbenchReviewDecision
    reason?: string | null
  }) => Promise<AlicizationLongTermMemoryReviewItem | null>
  runMemoryWorkbenchRecallProbe: (input: {
    cardId: string
    query: string
    sessionId?: string | null
    includeWorkingMemory?: boolean
    limit?: number
  }) => Promise<AlicizationMemoryRecallProbeResult>
  getMemoryWorkbenchQueueHealth: (input: { cardId: string }) => Promise<AlicizationMemoryWorkbenchHealth['queue']>
  getMemoryWorkbenchRecallHealth: (input: { cardId: string }) => Promise<AlicizationMemoryWorkbenchHealth['recall']>
  getMemoryWorkbenchEmbeddingHealth: (input: { cardId: string }) => Promise<AlicizationMemoryWorkbenchHealth['embedding']>
  recordMemoryQualityGoldLabel: (input: AlicizationMemoryQualityGoldLabelPayload) => Promise<AlicizationMemoryQualityGoldLabelItem>
  listMemoryQualityGoldLabels: (input: {
    cardId: string
    month?: string | null
    limit?: number
    cursor?: string | null
  }) => Promise<AlicizationMemoryQualityGoldLabelListResult>
  buildMonthlyGoldRegressionPack: (input: {
    cardId: string
    month?: string | null
  }) => Promise<AlicizationMemoryQualityMonthlyGoldRegressionPack>
  runMemoryWorkbenchProductionTrial: (input: {
    cardId: string
    mode?: 'historical-replay' | 'live-provider'
    month?: string | null
    sessionId?: string | null
    signal?: AbortSignal
  }) => Promise<MemoryProductionTrialReport>
  manageMemoryWorkbenchSemanticScaleJobs: (input: {
    cardId: string
    action?: 'start' | 'status' | 'list' | 'cancel' | 'retry'
    jobId?: string
    tier?: MemorySemanticScaleJobTier
    reason?: string | null
    limit?: number
  }) => Promise<{
    job: MemorySemanticScaleJob | null
    jobs: MemorySemanticScaleJob[]
  }>
  reindexMemoryWorkbenchEmbeddings: (input: {
    cardId: string
    action?: 'start' | 'status' | 'cancel' | 'retry-dead-letter'
    jobId?: string
    reason?: string | null
    itemIds?: string[]
    source?: string
    sourceIds?: string[]
    modelId?: string
    limit?: number
  }) => Promise<AlicizationMemoryEmbeddingReindexResult>
  resumePendingMemoryEmbeddingReindexJobs: () => Promise<string[]>
  listMemoryWorkbenchPersonaCandidates: (input: {
    cardId: string
    status?: AlicizationPersonaCandidateWorkbenchStatus | 'all'
    limit?: number
    cursor?: string | null
  }) => Promise<AlicizationPersonaCandidateListResult>
  applyMemoryWorkbenchPersonaCandidateAction: (input: {
    cardId: string
    candidateId: string
    decision: AlicizationPersonaCandidateWorkbenchDecision
    reason?: string | null
  }) => Promise<AlicizationPersonaCandidateWorkbenchItem | null>
  getPersonaTrainingDataset: (input: { cardId: string }) => Promise<{
    activeVersionId: string | null
    versions: PersonaTrainingDatasetVersion[]
    examples: PersonaTrainingDatasetExample[]
  }>
  stagePersonaTrainingDataset: (input: {
    cardId: string
    consent: Omit<PersonaTrainingDatasetConsentSnapshot, 'capturedAt'> & { capturedAt?: number }
  }) => Promise<PersonaTrainingDatasetVersion>
  exportPersonaTrainingDataset: (input: { cardId: string, datasetId?: string | null }) => Promise<{
    dataset: PersonaTrainingDatasetVersion
    manifest: PersonaTrainingDatasetManifest
  }>
  activatePersonaTrainingDataset: (input: { cardId: string, datasetId: string }) => Promise<PersonaTrainingDatasetVersion | null>
  rollbackPersonaTrainingDataset: (input: { cardId: string, datasetId: string }) => Promise<PersonaTrainingDatasetVersion | null>
  setPersonaTrainingDatasetExamplePolicy: (input: {
    cardId: string
    exampleId: string
    allowTraining: boolean
    consent: Omit<PersonaTrainingDatasetConsentSnapshot, 'capturedAt'> & { capturedAt?: number }
  }) => Promise<PersonaTrainingDatasetExample | null>
  revokePersonaTrainingDatasetSource: (input: { cardId: string, sourceId: string }) => Promise<{ affected: number }>
  runPersonaTraining: (input: { cardId: string, datasetId?: string | null }) => Promise<PersonaTrainingPipelineResult>
  startPersonaTraining: (input: { cardId: string, datasetId?: string | null }) => Promise<{ run: PersonaTrainingPipelineRunRecord }>
  getPersonaTrainingRun: (input: { cardId: string, runId: string }) => Promise<PersonaTrainingPipelineRunRecord | null>
  listPersonaTrainingRuns: (input: { cardId: string, limit?: number }) => Promise<PersonaTrainingPipelineRunRecord[]>
  cancelPersonaTraining: (input: { cardId: string, runId: string, reason?: string | null }) => Promise<PersonaTrainingPipelineRunRecord | null>
  rollbackPersonaTrainingIncrement: (input: { cardId: string, incrementId: string }) => Promise<PersonaTrainingPipelineIncrement | null>
  listPersonaTrainingIncrements: (input: { cardId: string }) => Promise<PersonaTrainingPipelineIncrement[]>
  enqueueWorkingMemoryLongTermQueueItems: (input: {
    cardId: string
    sessionId: string
    items: WorkingMemoryLongTermQueueItem[]
  }) => Promise<void>
  drainWorkingMemoryLongTermQueue: (limit?: number) => Promise<{
    cleaned: number
    admitted: number
    applied: number
    rejected: number
    review: number
    failed: number
    pending: number
  }>
  drainWorkingMemoryLongTermQueueScoped: (input: {
    cardId: string
    sessionId: string
    queueItemIds: string[]
  }) => Promise<{
    cleaned: number
    admitted: number
    applied: number
    rejected: number
    review: number
    failed: number
    pending: number
    settlements: Array<{
      queueItemId: string
      transactionId: string | null
      status: WorkingMemoryLongTermCleaningStatus | 'missing'
      errorSummary: string | null
    }>
  }>
  listLongTermMemoryReviewItems: (input: {
    cardId: string
    limit?: number
  }) => Promise<LongTermMemoryReviewItem[]>
  applyLongTermMemoryReviewDecision: (input: {
    cardId: string
    reviewItemId: string
    decision: LongTermMemoryReviewDecision
  }) => Promise<LongTermMemoryReviewItem | null>
  tombstoneLongTermMemorySources: (input: {
    sourceIds: string[]
    source?: string
    reason?: string | null
  }) => Promise<void>
  upsertMemoryReflections: (entries: AlicizationMemoryReflectionInput[]) => Promise<AlicizationMemoryReflectionRecord[]>
  listMemoryReflections: (input: {
    cardId: string
    limit?: number
    turnId?: string
    status?: AlicizationMemoryReflectionStatus
  }) => Promise<AlicizationMemoryReflectionRecord[]>
  appendRelationshipOutcomes: (entries: AlicizationRelationshipOutcomeInput[]) => Promise<AlicizationRelationshipOutcomeRecord[]>
  listRelationshipOutcomes: (input: {
    cardId: string
    limit?: number
    turnId?: string
  }) => Promise<AlicizationRelationshipOutcomeRecord[]>
  appendPersonStateEvolutionEntries: (entries: AlicizationPersonStateEvolutionEntryInput[]) => Promise<AlicizationPersonStateEvolutionEntryRecord[]>
  listPersonStateEvolutionEntries: (input?: {
    cardId?: string
    decisionTraceId?: string
    turnId?: string
    limit?: number
  }) => Promise<AlicizationPersonStateEvolutionEntryRecord[]>
  summarizePersonStateEvolution: (input?: {
    cardId?: string
    limit?: number
  }) => Promise<AlicizationPersonStateEvolutionSummary>
  appendEpisodicEvents: (events: AlicizationEpisodicEventInput[]) => Promise<AlicizationEpisodicEventRecord[]>
  persistEpisodicReconsolidations: (events: AlicizationEpisodicEventRecord[]) => Promise<void>
  listRecentEpisodicEvents: (limit?: number) => Promise<AlicizationEpisodicEventRecord[]>
  listEventGraphNeighborhood: (input: {
    eventIds?: string[]
    nodeIds?: string[]
    limit?: number
  }) => Promise<AlicizationEventGraphNeighborhood>
  searchEpisodicEvents: (input: {
    recallSeed: string
    limit?: number
    sessionId?: string | null
    turnId?: string | null
    threadAnchors?: string[]
    affectAnchors?: string[]
    relationshipAnchors?: string[]
    sceneAnchor?: string | null
    salienceBias?: number | null
    carryAsMemory?: boolean
    allowDream?: boolean
    recollectionIntent?: AlicizationMemoryRecollectionIntentLike | null
    reconsolidationDecisionTraceId?: string | null
    readOnly?: boolean
  }) => Promise<AlicizationEpisodicEventRecord[]>
  appendPersonaReinforcementEvents: (events: AlicizationPersonaReinforcementEventInput[]) => Promise<AlicizationPersonaReinforcementEventRecord[]>
  listPersonaReinforcementEvents: (input: {
    cardId: string
    limit?: number
    turnId?: string
  }) => Promise<AlicizationPersonaReinforcementEventRecord[]>
  readMindHead: <T>(cardId: string, key: AlicizationMindHeadKey) => Promise<T | null>
  upsertMindHead: (cardId: string, key: AlicizationMindHeadKey, value: unknown, options?: DbWriteOptions) => Promise<void>
  runMemoryPrune: () => Promise<AlicizationMemoryStats>
  importLegacyMemory: (snapshot: AlicizationMemoryLegacySnapshot) => Promise<AlicizationMemoryMigrationResult>
  overrideMemoryStats: (next: AlicizationMemoryStats) => Promise<AlicizationMemoryStats>
  listActiveThoughts: () => Promise<AlicizationActiveThought[]>
  replaceActiveThoughts: (thoughts: Array<{ text: string }>) => Promise<AlicizationActiveThought[]>
  appendSubconsciousFragments: (fragments: Array<{ text: string, sourceKind: AlicizationSubconsciousFragmentSourceKind }>) => Promise<AlicizationSubconsciousFragment[]>
  searchSubconsciousFragments: (query: string, limit?: number) => Promise<AlicizationSubconsciousFragment[]>
  listRecentSubconsciousFragments: (limit?: number) => Promise<AlicizationSubconsciousFragment[]>
  countSubconsciousFragments: () => Promise<number>
  appendRelationshipDynamics: (input: {
    hostAttitude: string
    previousHostAttitude?: string | null
    obedienceDelta?: number
    livelinessDelta?: number
    sensibilityDelta?: number
    source: string
    createdAt?: number
  }) => Promise<void>
  getLatestRelationshipDynamics: () => Promise<AlicizationRelationshipDynamicsState | null>
  insertScheduledTask: (input: {
    taskId: string
    triggerAt: number
    message: string
    sourceTurnId?: string
  }) => Promise<AlicizationScheduledTaskRecord>
  claimDueScheduledTasks: (nowMs: number, limit: number) => Promise<AlicizationScheduledTaskRecord[]>
  requeueScheduledTask: (taskId: string, reason?: string, nextTriggerAt?: number) => Promise<void>
  completeScheduledTask: (taskId: string, firedTurnId: string, completedAt?: number) => Promise<void>
  failScheduledTask: (taskId: string, error: string, completedAt?: number) => Promise<void>
  listPendingScheduledTasks: (limit?: number) => Promise<AlicizationScheduledTaskRecord[]>
  insertLearningTask: (input: {
    cardId: string
    taskId: string
    triggerAt: number
    action: AlicizationLearningAction
    message: string
    payload: AlicizationLearningTaskPayload
    maxAttempts?: number
  }, options?: DbWriteOptions) => Promise<AlicizationLearningTaskRecord>
  claimDueLearningTasks: (cardId: string, nowMs: number, limit: number) => Promise<AlicizationLearningTaskRecord[]>
  startLearningTask: (taskId: string, startedAt?: number) => Promise<void>
  blockLearningTask: (taskId: string, input: {
    reason: string
    resultSummary?: string | null
    failureKind?: AlicizationLearningTaskFailureKind | null
    nextRetryAt?: number | null
  }, updatedAt?: number) => Promise<void>
  completeLearningTask: (taskId: string, input: {
    firedTurnId?: string | null
    resultSummary?: string | null
  }, completedAt?: number) => Promise<void>
  failLearningTask: (taskId: string, input: {
    error: string
    failureKind: AlicizationLearningTaskFailureKind
    nextRetryAt?: number | null
  }, updatedAt?: number) => Promise<void>
  reopenLearningTask: (taskId: string, input?: {
    reason?: string | null
    triggerAt?: number | null
  }, updatedAt?: number) => Promise<void>
  downgradeLearningTask: (taskId: string, input?: {
    reason?: string | null
  }, updatedAt?: number) => Promise<void>
  cancelLearningTask: (taskId: string, input?: {
    reason?: string | null
  }, updatedAt?: number) => Promise<void>
  listLearningTasks: (input: {
    cardId: string
    limit?: number
    statuses?: AlicizationLearningTaskStatus[]
  }) => Promise<AlicizationLearningTaskRecord[]>
  getLatestLearningExecutionState: (cardId: string) => Promise<AlicizationLearningExecutionStateSnapshot | null>
  getJournalMode: () => Promise<string>
}

export interface AlicizationTaskThreadResumeInput {
  event: AlicizationExecutionEventInput
  expectedChannel: AlicizationExecutionChannel
  expectedStatus: 'needs-affirmation' | 'paused'
  expectedUpdatedAt: number
  metadata: Record<string, unknown> | null
  selectedChannel: AlicizationExecutionChannel
  threadId: string
  updatedAt: number
}

export async function setupAlicizationDb(
  userDataPath: string,
  options?: {
    rootDir?: string
    cardId?: string
    allowUnboundScope?: boolean
    sqliteDriver?: SqliteDriver
    embeddingProvider?: LongTermMemoryEmbeddingProvider | null
    resolveEmbeddingProvider?: () => LongTermMemoryEmbeddingProvider | null
    memoryTrialProvider?: AlicizationMemoryTrialProvider | null
    resolveMemoryTrialProvider?: () => AlicizationMemoryTrialProvider | null
    personaTrainingExecutor?: (input: PersonaTrainingExecutorInput) => Promise<PersonaTrainingExecutorOutput>
    personaTrainingArtifactLifecycle?: PersonaTrainingArtifactLifecycle
    personaTrainingArtifactLoader?: PersonaTrainingArtifactLoader
    personaTrainingArtifactRecoveryTimeoutMs?: number
    resolvePersonaTrainingExecutorConfig?: () => PersonaTrainingExecutorInput['configSnapshot'] | Promise<PersonaTrainingExecutorInput['configSnapshot']>
    semanticScaleJobOptions?: {
      executeJob?: MemorySemanticScaleJobExecutor
      resolveEmbeddingProvider?: () => LongTermMemoryEmbeddingProvider | null
      maxAttempts?: number
      leaseMs?: number
      retryBaseMs?: number
      retryMaxMs?: number
      tempRootDir?: string
    }
  },
): Promise<AlicizationDbService> {
  if (options?.personaTrainingArtifactLoader && !options.personaTrainingArtifactLifecycle)
    throw new Error('persona training artifactLoader requires artifactLifecycle')

  const configuredCardId = normalizeOrganicMemoryText(options?.cardId, 120)
  const boundCardId = configuredCardId || 'default'
  const hasBoundCardScope = Boolean(configuredCardId)
  const allowUnboundScope = options?.allowUnboundScope ?? process.env.NODE_ENV === 'test'
  if (!hasBoundCardScope && !allowUnboundScope)
    throw new Error('setupAlicizationDb requires cardId outside explicit migration/test scope')
  const rootDir = options?.rootDir
    ?? (options?.cardId ? join(userDataPath, 'alicizations', 'cards', options.cardId) : join(userDataPath, 'alicizations'))
  const dbPath = join(rootDir, 'alicization.db')
  await mkdir(rootDir, { recursive: true })

  const database = await openDatabase(dbPath, options?.sqliteDriver)

  let writeQueue = Promise.resolve<unknown>(undefined)

  const resolveMemoryCardId = (cardIdRaw: unknown, operation: string) => {
    const cardId = normalizeOrganicMemoryText(cardIdRaw, 120)
    if (!cardId)
      throw new Error(`${operation} requires cardId`)
    if (hasBoundCardScope && cardId !== boundCardId)
      throw new Error(`${operation} card scope does not match the active card`)
    return cardId
  }

  const enqueueWrite = async <T>(task: () => Promise<T>, options?: DbWriteOptions) => {
    assertWriteNotAborted(options)
    const guardedTask = async () => {
      assertWriteNotAborted(options)
      return await task()
    }
    const next = writeQueue.then(guardedTask, guardedTask)
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }

  async function applyMemoryIngestPayload(payload: AlicizationMemoryIngestPayload) {
    if (payload.kind === 'upsert-memory-facts') {
      await applyPreparedMemoryFacts(payload.facts)
      return
    }
    if (payload.kind === 'append-episodic-events') {
      await applyPreparedEpisodicEvents(payload.events)
      return
    }
    if (payload.kind === 'upsert-memory-consolidations') {
      await applyPreparedMemoryConsolidations(payload.records)
    }
  }

  const memoryIngestJournalRuntime = createAlicizationMemoryIngestJournalRuntime<
    AlicizationMemoryIngestOperationKind,
    AlicizationMemoryIngestPayload
  >({
    database,
    now,
    randomUUID,
    run,
    get,
    all,
    runInTransaction,
    parsePayload: parseMemoryIngestPayload,
    applyPayload: applyMemoryIngestPayload,
    buildBackoffMs: buildMemoryIngestBackoffMs,
  })
  const appendMemoryIngestEntries = memoryIngestJournalRuntime.appendEntries
  const countPendingMemoryIngestEntries = memoryIngestJournalRuntime.countPendingEntries
  const deriveMemoryIngestHealth = memoryIngestJournalRuntime.deriveHealth
  const drainMemoryIngestJournal = memoryIngestJournalRuntime.drainJournal
  const workingMemoryLongTermCleaningStore = createWorkingMemoryLongTermCleaningStoreRuntime({
    database,
    now,
    run,
    get,
    all,
    runInTransaction,
  })
  const workingMemoryLongTermDrainMutex = createWorkingMemoryLongTermDrainMutex()
  const runtimeEventStore = createAlicizationRuntimeEventStore({
    database,
    run,
    get,
    all,
    runInTransaction,
    enqueueWrite,
  })
  const runtimeCheckpointStore = createAlicizationRuntimeCheckpointStore({
    database,
    run,
    get,
    all,
    runInTransaction,
    enqueueWrite,
  })

  async function appendRuntimeEvent(
    scope: AlicizationRuntimeEventScope,
    event: AlicizationRuntimeEventEnvelope,
  ) {
    resolveMemoryCardId(scope.cardId, 'runtime event append')
    return await runtimeEventStore.append(scope, event)
  }

  async function listRuntimeEvents(
    scope: AlicizationRuntimeEventScope,
    options?: AlicizationRuntimeEventListOptions,
  ) {
    resolveMemoryCardId(scope.cardId, 'runtime event list')
    return await runtimeEventStore.list(scope, options)
  }

  async function listRuntimeEventScopes(
    query: AlicizationRuntimeEventScopeQuery,
  ) {
    resolveMemoryCardId(query.cardId, 'runtime event scope list')
    return await runtimeEventStore.listScopes(query)
  }

  async function saveRuntimeCheckpoint(checkpoint: AlicizationRuntimeCheckpoint) {
    resolveMemoryCardId(checkpoint.cardId, 'runtime checkpoint save')
    return await runtimeCheckpointStore.save(checkpoint)
  }

  async function loadRuntimeCheckpoint(scope: AlicizationRuntimeCheckpointScope) {
    resolveMemoryCardId(scope.cardId, 'runtime checkpoint load')
    return await runtimeCheckpointStore.load(scope)
  }

  async function initializeSchema() {
    await run(database, 'PRAGMA journal_mode = WAL;')
    await run(database, 'PRAGMA busy_timeout = 2000;')
    await run(database, 'PRAGMA foreign_keys = ON;')
    await run(database, 'PRAGMA synchronous = NORMAL;')

    const tableExists = async (
      tableName: 'memory_facts' | 'memory_consolidations' | 'memory_archive' | 'long_term_memory_tombstones' | 'long_term_memory_vectors',
    ) => {
      const row = await get<{ name: string }>(
        database,
        'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
        ['table', tableName],
      )
      return Boolean(row)
    }
    const tableHasColumn = async (
      tableName: 'memory_facts' | 'memory_consolidations' | 'memory_archive' | 'long_term_memory_tombstones' | 'long_term_memory_vectors',
      columnName: string,
    ) => {
      if (!await tableExists(tableName))
        return false
      const columns = await all<{ name: string }>(database, `PRAGMA table_info(${tableName})`)
      return columns.some(column => column.name === columnName)
    }
    const tableHasColumns = async (
      tableName: 'memory_facts' | 'memory_consolidations' | 'memory_archive' | 'long_term_memory_tombstones' | 'long_term_memory_vectors',
      columnNames: string[],
    ) => {
      if (!await tableExists(tableName))
        return false
      const columns = await all<{ name: string }>(database, `PRAGMA table_info(${tableName})`)
      const names = new Set(columns.map(column => column.name))
      return columnNames.every(columnName => names.has(columnName))
    }
    const tableHasUniqueColumns = async (
      tableName: 'memory_facts' | 'memory_consolidations' | 'long_term_memory_tombstones' | 'long_term_memory_vectors',
      columnNames: string[],
    ) => {
      if (!await tableExists(tableName))
        return false
      const indexes = await all<{ name: string, unique: number }>(database, `PRAGMA index_list(${tableName})`)
      for (const index of indexes) {
        if (Number(index.unique) !== 1)
          continue
        const info = await all<{ name: string }>(database, `PRAGMA index_info(${index.name})`)
        const indexedColumns = info.map(column => column.name)
        if (indexedColumns.length === columnNames.length && indexedColumns.every((column, index) => column === columnNames[index]))
          return true
      }
      return false
    }
    const [hasFactsTable, hasConsolidationsTable, hasArchiveTable, hasTombstonesTable, hasVectorsTable] = await Promise.all([
      tableExists('memory_facts'),
      tableExists('memory_consolidations'),
      tableExists('memory_archive'),
      tableExists('long_term_memory_tombstones'),
      tableExists('long_term_memory_vectors'),
    ])
    const [factsHaveCardId, consolidationsHaveCardId, archiveHaveCardId, tombstonesHaveCardId] = await Promise.all([
      tableHasColumn('memory_facts', 'card_id'),
      tableHasColumn('memory_consolidations', 'card_id'),
      tableHasColumn('memory_archive', 'card_id'),
      tableHasColumn('long_term_memory_tombstones', 'card_id'),
    ])
    const [
      factsHaveCanonicalColumns,
      factsHaveCanonicalDedupeUnique,
      factsHaveCanonicalPrimaryKey,
      consolidationsHaveCanonicalColumns,
      consolidationsHaveCanonicalUnique,
      consolidationsHaveCanonicalPeriodUnique,
      archiveHaveCanonicalColumns,
      tombstonesHaveCanonicalColumns,
      tombstonesHaveCanonicalUnique,
      vectorsHaveCanonicalColumns,
      vectorsHaveCanonicalUnique,
    ] = await Promise.all([
      tableHasColumns('memory_facts', [
        'card_id',
        'last_access_at',
        'access_count',
        'knowledge_stage',
        'validation_status',
        'memory_domain',
        'validation_count',
        'contradiction_count',
        'source_label',
        'conflicts_with_json',
        'supersedes_json',
      ]),
      tableHasUniqueColumns('memory_facts', ['card_id', 'dedupe_key']),
      tableHasUniqueColumns('memory_facts', ['card_id', 'id']),
      tableHasColumns('memory_consolidations', ['card_id', 'id', 'facet', 'metadata_json']),
      tableHasUniqueColumns('memory_consolidations', ['card_id', 'id']),
      tableHasUniqueColumns('memory_consolidations', ['card_id', 'period_key', 'kind', 'facet']),
      tableHasColumns('memory_archive', [
        'card_id',
        'original_id',
        'last_access_at',
        'access_count',
        'knowledge_stage',
        'validation_status',
        'memory_domain',
        'validation_count',
        'contradiction_count',
        'source_label',
        'conflicts_with_json',
        'supersedes_json',
      ]),
      tableHasColumns('long_term_memory_tombstones', ['card_id', 'source_id', 'source']),
      tableHasUniqueColumns('long_term_memory_tombstones', ['card_id', 'source_id', 'source']),
      tableHasColumns('long_term_memory_vectors', ['card_id', 'source_id', 'source', 'model_id', 'dimensions', 'vector_space_id']),
      tableHasUniqueColumns('long_term_memory_vectors', ['card_id', 'source_id', 'source', 'vector_space_id']),
    ])
    const shouldRebuildFacts = hasFactsTable && (!factsHaveCardId || !factsHaveCanonicalColumns || !factsHaveCanonicalDedupeUnique || !factsHaveCanonicalPrimaryKey)
    const shouldRebuildConsolidations = hasConsolidationsTable && (!consolidationsHaveCardId || !consolidationsHaveCanonicalColumns || !consolidationsHaveCanonicalUnique || !consolidationsHaveCanonicalPeriodUnique)
    const shouldRebuildArchive = (hasArchiveTable && (!archiveHaveCardId || !archiveHaveCanonicalColumns)) || shouldRebuildFacts
    const shouldRebuildTombstones = hasTombstonesTable && (!tombstonesHaveCardId || !tombstonesHaveCanonicalColumns || !tombstonesHaveCanonicalUnique)
    const shouldRebuildVectors = hasVectorsTable && (!vectorsHaveCanonicalColumns || !vectorsHaveCanonicalUnique)

    if (shouldRebuildFacts || shouldRebuildConsolidations || shouldRebuildArchive || shouldRebuildTombstones || shouldRebuildVectors) {
      // Historical rows cannot be attributed or indexed safely once schemas drift from the canonical card-scoped shape.
      // This project has no production data, so delete them instead of guessing an owner.
      await run(database, `DELETE FROM long_term_memory_vectors
        WHERE source IN ('memory_facts', 'memory_consolidations')`).catch(() => {})
      await run(database, `DELETE FROM long_term_memory_policy_overrides
        WHERE source IN ('memory_facts', 'memory_consolidations')`).catch(() => {})
      await run(database, `DELETE FROM long_term_memory_search_documents
        WHERE source IN ('memory_facts', 'memory_consolidations')`).catch(() => {})
      await run(database, 'DELETE FROM persona_training_candidate_reviews').catch(() => {})
      await run(database, 'DELETE FROM working_memory_long_term_transactions').catch(() => {})
      await run(database, 'DELETE FROM long_term_memory_tombstones').catch(() => {})
      await run(database, `DELETE FROM memory_ingest_journal
        WHERE operation_kind IN ('upsert-memory-facts', 'upsert-memory-consolidations')`).catch(() => {})
    }
    if (shouldRebuildFacts) {
      await run(database, 'DROP TABLE IF EXISTS memory_facts')
      await run(database, 'DROP TABLE IF EXISTS memory_archive')
    }
    else if (shouldRebuildArchive) {
      await run(database, 'DROP TABLE IF EXISTS memory_archive')
    }
    if (shouldRebuildConsolidations)
      await run(database, 'DROP TABLE IF EXISTS memory_consolidations')
    if (shouldRebuildTombstones)
      await run(database, 'DROP TABLE IF EXISTS long_term_memory_tombstones')
    if (shouldRebuildVectors)
      await run(database, 'DROP TABLE IF EXISTS long_term_memory_vectors')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_facts (
        id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT NOT NULL,
        dedupe_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_access_at INTEGER,
        access_count INTEGER NOT NULL DEFAULT 0,
        knowledge_stage TEXT,
        validation_status TEXT,
        memory_domain TEXT,
        validation_count INTEGER NOT NULL DEFAULT 0,
        contradiction_count INTEGER NOT NULL DEFAULT 0,
        source_label TEXT,
        conflicts_with_json TEXT,
        supersedes_json TEXT,
        PRIMARY KEY(card_id, id),
        UNIQUE(card_id, dedupe_key)
      )
    `)
    await run(database, 'ALTER TABLE memory_facts ADD COLUMN knowledge_stage TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_facts ADD COLUMN validation_status TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_facts ADD COLUMN memory_domain TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_facts ADD COLUMN validation_count INTEGER NOT NULL DEFAULT 0').catch(() => {})
    await run(database, 'ALTER TABLE memory_facts ADD COLUMN contradiction_count INTEGER NOT NULL DEFAULT 0').catch(() => {})
    await run(database, 'ALTER TABLE memory_facts ADD COLUMN source_label TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_facts ADD COLUMN conflicts_with_json TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_facts ADD COLUMN supersedes_json TEXT').catch(() => {})
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_facts_card_updated_at ON memory_facts(card_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_facts_card_last_access_at ON memory_facts(card_id, last_access_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_ingest_journal (
        id TEXT PRIMARY KEY,
        operation_kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_attempt_at INTEGER,
        applied_at INTEGER,
        next_attempt_at INTEGER
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_ingest_journal_status_created_at ON memory_ingest_journal(status, created_at ASC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS working_memory_long_term_transactions (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        queue_item_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        decision TEXT NOT NULL,
        queue_item_json TEXT NOT NULL,
        cleaned_candidate_json TEXT,
        projections_json TEXT,
        allow_training INTEGER NOT NULL DEFAULT 0,
        rejection_reasons_json TEXT NOT NULL,
        review_reasons_json TEXT NOT NULL,
        contamination_flags_json TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        next_attempt_at INTEGER,
        applied_at INTEGER
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_wm_long_term_transactions_status_next ON working_memory_long_term_transactions(status, next_attempt_at ASC, created_at ASC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_wm_long_term_transactions_card_session ON working_memory_long_term_transactions(card_id, session_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS long_term_memory_tombstones (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(card_id, source_id, source)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_long_term_memory_tombstones_card_source_id ON long_term_memory_tombstones(card_id, source_id, source)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS long_term_memory_policy_overrides (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL,
        visible_mode TEXT NOT NULL,
        allow_training INTEGER NOT NULL,
        review_state TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(card_id, source_id, source)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_ltm_policy_card_source ON long_term_memory_policy_overrides(card_id, source_id, source)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_ltm_policy_card_training ON long_term_memory_policy_overrides(card_id, allow_training, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_workbench_recall_metrics (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        query TEXT NOT NULL,
        mode TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        evidence_count INTEGER NOT NULL,
        semantic_available INTEGER NOT NULL,
        error TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_workbench_recall_metrics_card_created ON memory_workbench_recall_metrics(card_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_quality_gold_labels (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        month TEXT NOT NULL,
        label TEXT NOT NULL,
        reason TEXT,
        evaluation_class TEXT NOT NULL,
        benchmark_dimensions_json TEXT NOT NULL,
        query TEXT NOT NULL,
        session_id TEXT,
        expected_memory_ids_json TEXT NOT NULL,
        retrieved_candidate_ids_json TEXT NOT NULL,
        surfaced_memory_ids_json TEXT NOT NULL,
        wrong_thread_ids_json TEXT NOT NULL,
        assistant_reply TEXT,
        retrieved_evidence_snapshot_json TEXT NOT NULL DEFAULT '[]',
        human_confirmed INTEGER NOT NULL DEFAULT 0,
        turn_id TEXT,
        decision_trace_id TEXT,
        note TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'ALTER TABLE memory_quality_gold_labels ADD COLUMN reason TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_quality_gold_labels ADD COLUMN session_id TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_quality_gold_labels ADD COLUMN assistant_reply TEXT').catch(() => {})
    await run(database, `ALTER TABLE memory_quality_gold_labels ADD COLUMN retrieved_evidence_snapshot_json TEXT NOT NULL DEFAULT '[]'`).catch(() => {})
    await run(database, 'ALTER TABLE memory_quality_gold_labels ADD COLUMN human_confirmed INTEGER NOT NULL DEFAULT 0').catch(() => {})
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_quality_gold_labels_card_month_created ON memory_quality_gold_labels(card_id, month, created_at DESC, id DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_quality_monthly_gold_packs (
        pack_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        month TEXT NOT NULL,
        revision INTEGER NOT NULL,
        frozen_at INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        source_label_ids_json TEXT NOT NULL,
        items_snapshot_json TEXT NOT NULL,
        item_count INTEGER NOT NULL,
        UNIQUE(card_id, month)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_quality_gold_packs_card_month ON memory_quality_monthly_gold_packs(card_id, month)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS long_term_memory_vectors (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL,
        text_hash TEXT NOT NULL,
        text TEXT NOT NULL,
        vector_blob BLOB NOT NULL,
        model_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        vector_space_id TEXT NOT NULL,
        status TEXT NOT NULL,
        last_error TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(card_id, source_id, source, vector_space_id)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_ltm_vectors_card_model ON long_term_memory_vectors(card_id, vector_space_id, model_id, dimensions, status)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_ltm_vectors_card_source ON long_term_memory_vectors(card_id, source_id, source)')
    await memoryEmbeddingReindexRuntime.initializeSchema()
    await memorySemanticScaleJobRuntime.initializeSchema()
    await longTermMemoryVectorIndexAdapter.initialize()
    await longTermMemorySearchIndexRuntime.initializeSchema()

    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_candidate_reviews (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        status TEXT NOT NULL,
        allow_training INTEGER NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(card_id, candidate_id)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_candidate_reviews_card_updated ON persona_training_candidate_reviews(card_id, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_datasets (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        schema_version TEXT NOT NULL,
        consent_snapshot_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        exported_at INTEGER,
        active_at INTEGER,
        rolled_back_at INTEGER,
        UNIQUE(card_id, version)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_datasets_card_version ON persona_training_datasets(card_id, version DESC)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_dataset_examples (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        behavior_lesson TEXT NOT NULL,
	        positive_example TEXT NOT NULL,
	        negative_example TEXT,
	        sensitivity TEXT NOT NULL,
	        pii_status TEXT NOT NULL,
	        pii_reason TEXT,
	        consent_snapshot_json TEXT NOT NULL,
	        provenance_json TEXT,
	        allow_training INTEGER NOT NULL DEFAULT 0,
	        state TEXT NOT NULL,
	        created_at INTEGER NOT NULL,
	        revoked_at INTEGER,
	        UNIQUE(dataset_id, content_hash)
	      )
	    `)
    await run(database, 'ALTER TABLE persona_training_dataset_examples ADD COLUMN provenance_json TEXT').catch(() => {})
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_dataset_examples_card_source ON persona_training_dataset_examples(card_id, source_id)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_dataset_examples_dataset_state ON persona_training_dataset_examples(dataset_id, state, allow_training)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_dataset_exports (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        manifest_hash TEXT NOT NULL,
        manifest_json TEXT NOT NULL,
        exported_at INTEGER NOT NULL,
        UNIQUE(dataset_id, manifest_hash)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_dataset_exports_card_created ON persona_training_dataset_exports(card_id, exported_at DESC)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_source_provenance (
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        cleaning_transaction_id TEXT NOT NULL,
        cleaned_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY(card_id, source_id, source_kind)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_source_provenance_transaction ON persona_training_source_provenance(card_id, cleaning_transaction_id)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_runs (
        run_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        manifest_hash TEXT NOT NULL,
        source_ids_json TEXT NOT NULL,
        base_persona_revision TEXT NOT NULL,
        status TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT 'writing-input',
        progress REAL NOT NULL DEFAULT 0,
        progress_message TEXT,
        failure_reason TEXT,
        config_snapshot_json TEXT,
        artifact_json TEXT,
        error TEXT,
        queued_at INTEGER NOT NULL DEFAULT 0,
        started_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT 0,
        finished_at INTEGER,
        cancellation_requested_at INTEGER
      )
    `)
    await run(database, `ALTER TABLE persona_training_runs ADD COLUMN stage TEXT NOT NULL DEFAULT 'writing-input'`).catch(() => {})
    await run(database, 'ALTER TABLE persona_training_runs ADD COLUMN progress REAL NOT NULL DEFAULT 0').catch(() => {})
    await run(database, 'ALTER TABLE persona_training_runs ADD COLUMN progress_message TEXT').catch(() => {})
    await run(database, 'ALTER TABLE persona_training_runs ADD COLUMN failure_reason TEXT').catch(() => {})
    await run(database, 'ALTER TABLE persona_training_runs ADD COLUMN config_snapshot_json TEXT').catch(() => {})
    await run(database, 'ALTER TABLE persona_training_runs ADD COLUMN artifact_json TEXT').catch(() => {})
    await run(database, 'ALTER TABLE persona_training_runs ADD COLUMN queued_at INTEGER NOT NULL DEFAULT 0').catch(() => {})
    await run(database, 'ALTER TABLE persona_training_runs ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0').catch(() => {})
    await run(database, 'ALTER TABLE persona_training_runs ADD COLUMN cancellation_requested_at INTEGER').catch(() => {})
    await run(database, `
      UPDATE persona_training_runs
      SET
        queued_at = CASE WHEN queued_at = 0 THEN started_at ELSE queued_at END,
        updated_at = CASE
          WHEN updated_at = 0 THEN COALESCE(finished_at, started_at)
          ELSE updated_at
        END
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_runs_card_started ON persona_training_runs(card_id, started_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_runs_dataset_status ON persona_training_runs(dataset_id, status, started_at DESC)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_increments (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL UNIQUE,
        card_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        manifest_hash TEXT NOT NULL,
        source_ids_json TEXT NOT NULL,
        base_persona_revision TEXT NOT NULL,
        artifact_json TEXT,
        state TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_increments_card_created ON persona_training_increments(card_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_training_increments_dataset_state ON persona_training_increments(dataset_id, state, created_at DESC)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_artifact_activation_intents (
        id TEXT PRIMARY KEY,
        load_operation_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        card_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        increment_id TEXT NOT NULL,
        artifact_id TEXT NOT NULL,
        artifact_json TEXT NOT NULL,
        expected_artifact_json TEXT,
        loader_receipt_json TEXT,
        activated_artifact_json TEXT,
        stage TEXT NOT NULL,
        status TEXT NOT NULL,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    `)
    await run(database, `
      CREATE INDEX IF NOT EXISTS idx_persona_training_artifact_activation_status
      ON persona_training_artifact_activation_intents(card_id, status, updated_at ASC)
    `)
    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_training_artifact_cleanup_intents (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        increment_id TEXT,
        artifact_id TEXT NOT NULL,
        artifact_json TEXT NOT NULL,
        loader_receipt_json TEXT,
        unload_operation_id TEXT,
        reason TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT 'discard',
        finalize_increment_state TEXT,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    `)
    await run(database, 'ALTER TABLE persona_training_artifact_cleanup_intents ADD COLUMN loader_receipt_json TEXT').catch(() => {})
    await run(database, 'ALTER TABLE persona_training_artifact_cleanup_intents ADD COLUMN unload_operation_id TEXT').catch(() => {})
    await run(database, `ALTER TABLE persona_training_artifact_cleanup_intents ADD COLUMN stage TEXT NOT NULL DEFAULT 'discard'`).catch(() => {})
    await run(database, 'ALTER TABLE persona_training_artifact_cleanup_intents ADD COLUMN finalize_increment_state TEXT').catch(() => {})
    await run(database, `
      UPDATE persona_training_artifact_cleanup_intents
      SET
        status = 'dead-letter',
        last_error = COALESCE(last_error, 'malformed artifact JSON moved to cleanup dead-letter'),
        updated_at = MAX(updated_at, created_at)
      WHERE status = 'pending'
        AND json_valid(artifact_json) = 0
    `)
    await run(database, `
      UPDATE persona_training_artifact_activation_intents
      SET
        status = 'dead-letter',
        last_error = COALESCE(last_error, 'malformed artifact JSON moved to activation dead-letter'),
        updated_at = MAX(updated_at, created_at)
      WHERE status = 'pending'
        AND (
          json_valid(artifact_json) = 0
          OR (expected_artifact_json IS NOT NULL AND json_valid(expected_artifact_json) = 0)
          OR (activated_artifact_json IS NOT NULL AND json_valid(activated_artifact_json) = 0)
        )
    `)
    await run(database, `
      UPDATE persona_training_artifact_cleanup_intents
      SET stage = 'unload'
      WHERE status = 'pending'
        AND stage = 'discard'
        AND json_valid(artifact_json) = 1
        AND json_extract(artifact_json, '$.activation.status') = 'active'
    `)
    await run(database, `
      CREATE INDEX IF NOT EXISTS idx_persona_training_artifact_cleanup_status
      ON persona_training_artifact_cleanup_intents(card_id, status, updated_at ASC)
    `)

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_reflections (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        source_kind TEXT NOT NULL,
        target_scope TEXT NOT NULL,
        summary TEXT NOT NULL,
        lesson TEXT NOT NULL,
        status TEXT NOT NULL,
        confidence REAL NOT NULL,
        supporting_fact_ids_json TEXT,
        supporting_outcome_ids_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        confirmed_at INTEGER,
        denied_at INTEGER
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_reflections_card_updated_at ON memory_reflections(card_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_reflections_card_status_updated_at ON memory_reflections(card_id, status, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_reflections_trace_created_at ON memory_reflections(decision_trace_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS relationship_outcomes (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        source_kind TEXT NOT NULL,
        action_summary TEXT NOT NULL,
        closeness_delta REAL NOT NULL,
        trust_delta REAL NOT NULL,
        burden_delta REAL NOT NULL,
        boundary_delta REAL NOT NULL,
        misread_delta REAL NOT NULL,
        repair_delta REAL NOT NULL,
        open_loop_delta REAL NOT NULL,
        summary TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_relationship_outcomes_card_created_at ON relationship_outcomes(card_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_relationship_outcomes_turn_created_at ON relationship_outcomes(turn_id, created_at DESC)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS person_state_evolution_log (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        active_thread_id TEXT,
        source_kind TEXT NOT NULL,
        summary TEXT NOT NULL,
        contexts_json TEXT,
        relationship_doctrine TEXT,
        burden_line TEXT,
        trust_meaning TEXT,
        dominant_rung TEXT,
        source_trail_json TEXT,
        shifts_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_person_state_evolution_card_created_at ON person_state_evolution_log(card_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_person_state_evolution_trace_created_at ON person_state_evolution_log(decision_trace_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS episodic_events (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        source_kind TEXT NOT NULL,
        provenance TEXT NOT NULL,
        occurred_at INTEGER NOT NULL,
        where_summary TEXT,
        with_whom_json TEXT,
        thread_anchor TEXT,
        what_happened TEXT NOT NULL,
        felt TEXT,
        emotion_tags_json TEXT,
        what_changed TEXT,
        relationship_meaning TEXT,
        lesson TEXT,
        source_summary TEXT,
        confidence REAL NOT NULL,
        salience REAL NOT NULL,
        scene_attachment REAL NOT NULL DEFAULT 0,
        consolidation_priority REAL NOT NULL DEFAULT 0,
        relationship_shift_json TEXT,
        derived_from_json TEXT,
        tags_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_recalled_at INTEGER,
        recall_count INTEGER NOT NULL DEFAULT 0,
        reconsolidation_count INTEGER NOT NULL DEFAULT 0,
        latest_reconsolidation_json TEXT
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_episodic_events_occurred_at ON episodic_events(occurred_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_episodic_events_source_kind_occurred_at ON episodic_events(source_kind, occurred_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_episodic_events_thread_anchor_occurred_at ON episodic_events(thread_anchor, occurred_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_episodic_events_session_occurred_at ON episodic_events(session_id, occurred_at DESC)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS episodic_reconsolidation_overlays (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        at INTEGER NOT NULL,
        decision_trace_id TEXT,
        provenance TEXT NOT NULL,
        confidence REAL NOT NULL,
        reason TEXT NOT NULL,
        emotion_tags_json TEXT,
        relationship_meaning TEXT,
        lesson TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_episodic_recon_overlays_event_at ON episodic_reconsolidation_overlays(event_id, at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_episodic_recon_overlays_trace_at ON episodic_reconsolidation_overlays(decision_trace_id, at DESC)')
    await run(database, `
      CREATE TABLE IF NOT EXISTS event_graph_nodes (
        node_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        node_kind TEXT NOT NULL,
        canonical_key TEXT NOT NULL,
        label TEXT NOT NULL,
        semantic_text TEXT NOT NULL,
        provenance TEXT NOT NULL,
        source_event_id TEXT,
        payload_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_event_graph_nodes_kind_updated_at ON event_graph_nodes(node_kind, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_event_graph_nodes_source_event ON event_graph_nodes(source_event_id, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS event_graph_edges (
        edge_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        edge_kind TEXT NOT NULL,
        weight REAL NOT NULL,
        provenance TEXT NOT NULL,
        payload_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_event_graph_edges_source_updated_at ON event_graph_edges(source_node_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_event_graph_edges_target_updated_at ON event_graph_edges(target_node_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_event_graph_edges_kind_updated_at ON event_graph_edges(edge_kind, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_consolidations (
        card_id TEXT NOT NULL,
        id TEXT NOT NULL,
        kind TEXT NOT NULL,
        facet TEXT,
        period_key TEXT NOT NULL,
        period_started_at INTEGER NOT NULL,
        period_ended_at INTEGER NOT NULL,
        summary TEXT NOT NULL,
        lesson TEXT,
        cues_json TEXT,
        confidence REAL NOT NULL,
        dominant_provenance TEXT NOT NULL,
        derived_event_ids_json TEXT,
        metadata_json TEXT,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY(card_id, id),
        UNIQUE(card_id, period_key, kind, facet)
      )
    `)
    await run(database, 'ALTER TABLE memory_consolidations ADD COLUMN facet TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_consolidations ADD COLUMN metadata_json TEXT').catch(() => {})
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_consolidations_card_kind_period ON memory_consolidations(card_id, kind, period_ended_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_consolidations_card_updated_at ON memory_consolidations(card_id, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS persona_reinforcement_events (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        source_kind TEXT NOT NULL,
        dimension TEXT NOT NULL,
        delta REAL NOT NULL,
        valence TEXT NOT NULL,
        summary TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_reinforcement_card_dimension_created_at ON persona_reinforcement_events(card_id, dimension, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_persona_reinforcement_turn_created_at ON persona_reinforcement_events(turn_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_archive (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        original_id TEXT,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT NOT NULL,
        dedupe_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_access_at INTEGER,
        access_count INTEGER NOT NULL DEFAULT 0,
        knowledge_stage TEXT,
        validation_status TEXT,
        memory_domain TEXT,
        validation_count INTEGER NOT NULL DEFAULT 0,
        contradiction_count INTEGER NOT NULL DEFAULT 0,
        source_label TEXT,
        conflicts_with_json TEXT,
        supersedes_json TEXT,
        archived_at INTEGER NOT NULL
      )
    `)
    await run(database, 'ALTER TABLE memory_archive ADD COLUMN knowledge_stage TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_archive ADD COLUMN validation_status TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_archive ADD COLUMN memory_domain TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_archive ADD COLUMN validation_count INTEGER NOT NULL DEFAULT 0').catch(() => {})
    await run(database, 'ALTER TABLE memory_archive ADD COLUMN contradiction_count INTEGER NOT NULL DEFAULT 0').catch(() => {})
    await run(database, 'ALTER TABLE memory_archive ADD COLUMN source_label TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_archive ADD COLUMN conflicts_with_json TEXT').catch(() => {})
    await run(database, 'ALTER TABLE memory_archive ADD COLUMN supersedes_json TEXT').catch(() => {})
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_archive_card_archived_at ON memory_archive(card_id, archived_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS active_thoughts (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_active_thoughts_updated_at ON active_thoughts(updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS subconscious_fragments (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_recalled_at INTEGER,
        recall_count INTEGER NOT NULL DEFAULT 0
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_subconscious_fragments_created_at ON subconscious_fragments(created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_subconscious_fragments_last_recalled_at ON subconscious_fragments(last_recalled_at DESC)')
    await run(database, `CREATE VIRTUAL TABLE IF NOT EXISTS subconscious_fragments_fts USING fts5(
      fragment_id UNINDEXED,
      text,
      tokenize = 'trigram'
    )`)

    await run(database, `
      CREATE TABLE IF NOT EXISTS relationship_dynamics (
        id TEXT PRIMARY KEY,
        host_attitude TEXT NOT NULL,
        previous_host_attitude TEXT,
        obedience_delta REAL NOT NULL,
        liveliness_delta REAL NOT NULL,
        sensibility_delta REAL NOT NULL,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_relationship_dynamics_created_at ON relationship_dynamics(created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS conversation_turns (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        turn_id TEXT,
        session_id TEXT NOT NULL,
        user_text TEXT,
        assistant_text TEXT,
        structured_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)

    await run(database, `ALTER TABLE conversation_turns ADD COLUMN card_id TEXT NOT NULL DEFAULT ''`).catch(() => {})
    await run(database, 'ALTER TABLE conversation_turns ADD COLUMN turn_id TEXT').catch(() => {})
    await run(database, `UPDATE conversation_turns SET card_id = ? WHERE card_id IS NULL OR TRIM(card_id) = ''`, [boundCardId])
    await run(database, 'DROP INDEX IF EXISTS idx_conversation_turns_session_turn_id')
    await run(database, 'DROP INDEX IF EXISTS idx_conversation_turns_turn_id')
    await run(database, 'DROP INDEX IF EXISTS idx_conversation_turns_session_created_at')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_conversation_turns_card_turn_id ON conversation_turns(card_id, turn_id)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_conversation_turns_card_session_created_at ON conversation_turns(card_id, session_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_conversation_turns_card_created_at ON conversation_turns(card_id, created_at DESC)')
    await runInTransaction(database, async () => {
      await run(database, `
        DELETE FROM conversation_turns
        WHERE card_id IS NOT NULL
          AND TRIM(card_id) != ''
          AND session_id IS NOT NULL
          AND TRIM(session_id) != ''
          AND turn_id IS NOT NULL
          AND TRIM(turn_id) != ''
          AND EXISTS (
            SELECT 1
            FROM conversation_turns AS newer
            WHERE newer.card_id = conversation_turns.card_id
              AND newer.session_id = conversation_turns.session_id
              AND newer.turn_id = conversation_turns.turn_id
              AND (
                newer.created_at > conversation_turns.created_at
                OR (
                  newer.created_at = conversation_turns.created_at
                  AND newer.rowid > conversation_turns.rowid
                )
              )
          )
      `)
      await run(database, `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_turns_card_session_turn_id
        ON conversation_turns(card_id, session_id, turn_id)
        WHERE card_id IS NOT NULL
          AND TRIM(card_id) != ''
          AND session_id IS NOT NULL
          AND TRIM(session_id) != ''
          AND turn_id IS NOT NULL
          AND TRIM(turn_id) != ''
      `)
    })

    await run(database, `
      CREATE TABLE IF NOT EXISTS alicization_runtime_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        sequence INTEGER NOT NULL,
        turn_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        source TEXT NOT NULL,
        causation_id TEXT,
        correlation_id TEXT NOT NULL,
        idempotency_key TEXT,
        occurred_at INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE(turn_id, sequence),
        UNIQUE(turn_id, idempotency_key)
      )
    `)
    await run(database, `
      CREATE INDEX IF NOT EXISTS idx_runtime_events_turn_cursor
      ON alicization_runtime_events(turn_id, sequence)
    `)
    await run(database, `
      CREATE INDEX IF NOT EXISTS idx_runtime_events_scope
      ON alicization_runtime_events(user_id, card_id, conversation_id, occurred_at)
    `)

    const runtimeCheckpointTable = await get<{ name: string }>(
      database,
      'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
      ['table', 'alicization_runtime_checkpoints'],
    )
    if (runtimeCheckpointTable) {
      const columns = await all<{ name: string }>(
        database,
        'PRAGMA table_info(alicization_runtime_checkpoints)',
      )
      if (
        !columns.some(column => column.name === 'projection_json')
        || !await supportsRuntimeCheckpointSchemaV3(database)
      ) {
        await run(database, 'DROP TABLE alicization_runtime_checkpoints')
      }
    }

    await run(database, `
      CREATE TABLE IF NOT EXISTS alicization_runtime_checkpoints (
        turn_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        sequence INTEGER NOT NULL CHECK(sequence >= 0),
        runtime_status TEXT NOT NULL CHECK(runtime_status IN (
          'accepted',
          'running',
          'waiting',
          'recovery-required',
          'completed',
          'failed',
          'cancelled',
          'timed-out',
          'dead-lettered'
        )),
        active_action_ids_json TEXT NOT NULL,
        delivery_owner TEXT NOT NULL CHECK(delivery_owner IN ('inline', 'callback')),
        projection_json TEXT NOT NULL,
        schema_version INTEGER NOT NULL CHECK(schema_version = 3),
        updated_at INTEGER NOT NULL CHECK(updated_at >= 0)
      )
    `)
    await run(database, `
      CREATE INDEX IF NOT EXISTS idx_runtime_checkpoints_scope
      ON alicization_runtime_checkpoints(user_id, card_id, conversation_id, updated_at)
    `)

    await run(database, `
      CREATE TABLE IF NOT EXISTS mind_turn_events (
        id TEXT PRIMARY KEY,
        decision_trace_id TEXT NOT NULL,
        turn_id TEXT,
        session_id TEXT,
        origin TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_mind_turn_events_trace_created_at ON mind_turn_events(decision_trace_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_mind_turn_events_turn_created_at ON mind_turn_events(turn_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_mind_turn_events_session_created_at ON mind_turn_events(session_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS task_threads (
        id TEXT PRIMARY KEY,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        origin TEXT NOT NULL,
        goal TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL,
        selected_channel TEXT,
        proposed_channel TEXT,
        summary TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_event_at INTEGER,
        completed_at INTEGER
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_task_threads_trace_updated_at ON task_threads(decision_trace_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_task_threads_turn_updated_at ON task_threads(turn_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_task_threads_session_updated_at ON task_threads(session_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_task_threads_status_updated_at ON task_threads(status, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS capability_manifests (
        channel TEXT PRIMARY KEY,
        available INTEGER NOT NULL,
        enabled INTEGER NOT NULL,
        ready INTEGER NOT NULL,
        session_affinity INTEGER NOT NULL,
        reason TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_checked_at INTEGER
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_capability_manifests_updated_at ON capability_manifests(updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_capability_manifests_available_ready ON capability_manifests(available, ready, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS executor_sessions (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        affinity_key TEXT NOT NULL,
        external_session_id TEXT,
        status TEXT NOT NULL,
        summary TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER,
        UNIQUE(channel, affinity_key)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_sessions_channel_updated_at ON executor_sessions(channel, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_sessions_status_updated_at ON executor_sessions(status, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_sessions_last_used_at ON executor_sessions(last_used_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS executor_events (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        origin TEXT NOT NULL,
        channel TEXT,
        kind TEXT NOT NULL,
        thread_status TEXT,
        payload_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_events_thread_created_at ON executor_events(thread_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_events_trace_created_at ON executor_events(decision_trace_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_events_turn_created_at ON executor_events(turn_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_events_session_created_at ON executor_events(session_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)

    await run(database, 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS alicization_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    await run(database, `
      CREATE TABLE IF NOT EXISTS working_memory_checkpoints (
        card_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        version TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY(card_id, session_id)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_working_memory_checkpoints_card_updated ON working_memory_checkpoints(card_id, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL UNIQUE,
        trigger_at INTEGER NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        claimed_at INTEGER,
        completed_at INTEGER,
        source_turn_id TEXT,
        fired_turn_id TEXT,
        last_error TEXT
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status_trigger_at ON scheduled_tasks(status, trigger_at)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_task_id ON scheduled_tasks(task_id)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS learning_tasks (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        task_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        trigger_at INTEGER NOT NULL,
        action TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        claimed_at INTEGER,
        started_at INTEGER,
        completed_at INTEGER,
        blocked_at INTEGER,
        cancelled_at INTEGER,
        downgraded_at INTEGER,
        reopened_at INTEGER,
        next_retry_at INTEGER,
        source_turn_id TEXT,
        result_summary TEXT,
        failure_kind TEXT,
        last_error TEXT,
        fired_turn_id TEXT
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_learning_tasks_card_status_trigger_at ON learning_tasks(card_id, status, trigger_at)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_learning_tasks_card_updated_at ON learning_tasks(card_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_learning_tasks_task_id ON learning_tasks(task_id)')
  }

  async function upsertMeta(key: string, value: string) {
    const ts = now()
    await run(
      database,
      `
      INSERT INTO alicization_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
      [key, value, ts],
    )
  }

  async function getMetaValue(key: string) {
    const row = await get<MetaRow>(database, 'SELECT value FROM alicization_meta WHERE key = ? LIMIT 1', [key])
    return row?.value
  }

  const memoryMindStateRuntime = createAlicizationMemoryMindStateRuntime({
    database,
    now,
    randomUUID,
    getMetaValue,
    upsertMeta,
    run,
    all,
    runInTransaction,
    enqueueWrite,
    assertWriteNotAborted,
    parseMindTurnEventPayload,
    resolveMindTurnEventActiveThreadId,
  })
  const readMindHead = memoryMindStateRuntime.readMindHead
  const upsertMindHead = memoryMindStateRuntime.upsertMindHead
  const memoryEventGraphRuntime = createAlicizationMemoryEventGraphRuntime({
    database,
    run,
    all,
    clamp01,
    normalizeOrganicMemoryText,
  })
  const personStateEvolutionRuntime = createAlicizationPersonStateEvolutionRuntime({
    database,
    now,
    randomUUID,
    run,
    all,
    enqueueWrite,
    runInTransaction,
  })

  async function getLastPrunedAt() {
    const value = await getMetaValue(memoryLastPrunedAtKey)
    if (!value)
      return null

    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed))
      return null
    return parsed
  }

  const memoryRetrievalTelemetryRuntime = createAlicizationMemoryRetrievalTelemetryRuntime({
    now,
    key: memoryRetrievalTelemetryKey,
    getMetaValue,
    upsertMeta,
    enqueueWrite,
  })
  const getMemoryRetrievalTelemetry = memoryRetrievalTelemetryRuntime.getTelemetry
  const recordMemorySemanticRetrievalLatency = memoryRetrievalTelemetryRuntime.recordSemanticLatency
  const recordMemoryGraphRetrievalLatency = memoryRetrievalTelemetryRuntime.recordGraphLatency

  async function restoreArchivedFactsIntoActiveMemory() {
    const archivedRows = await all<DbMemoryArchiveRow>(
      database,
      `SELECT * FROM memory_archive ${hasBoundCardScope ? 'WHERE card_id = ?' : ''}`,
      hasBoundCardScope ? [boundCardId] : [],
    )
    if (archivedRows.length === 0)
      return 0

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const row of archivedRows) {
          const cardId = hasBoundCardScope
            ? resolveMemoryCardId(row.card_id, 'archive restore')
            : normalizeOrganicMemoryText(row.card_id, 120) || boundCardId
          const subject = row.subject?.trim()
          const predicate = row.predicate?.trim()
          const object = row.object?.trim()
          if (!subject || !predicate || !object)
            continue

          const dedupeKey = row.dedupe_key?.trim() || buildDedupeKey(subject, predicate, object)
          await run(
            database,
            `
            INSERT INTO memory_facts (
              id,
              card_id,
              subject,
              predicate,
              object,
              confidence,
              source,
              dedupe_key,
              created_at,
              updated_at,
              last_access_at,
          access_count,
          knowledge_stage,
          validation_status,
          memory_domain,
          validation_count,
          contradiction_count,
              source_label,
              conflicts_with_json,
              supersedes_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(card_id, dedupe_key)
            DO UPDATE SET
              confidence = MAX(memory_facts.confidence, excluded.confidence),
              source = excluded.source,
              created_at = MIN(memory_facts.created_at, excluded.created_at),
              updated_at = MAX(memory_facts.updated_at, excluded.updated_at),
              last_access_at = CASE
                WHEN excluded.last_access_at IS NULL THEN memory_facts.last_access_at
                WHEN memory_facts.last_access_at IS NULL THEN excluded.last_access_at
                ELSE MAX(memory_facts.last_access_at, excluded.last_access_at)
              END,
              access_count = MAX(memory_facts.access_count, excluded.access_count),
              knowledge_stage = excluded.knowledge_stage,
              validation_status = excluded.validation_status,
              memory_domain = excluded.memory_domain,
              validation_count = MAX(memory_facts.validation_count, excluded.validation_count),
              contradiction_count = MAX(memory_facts.contradiction_count, excluded.contradiction_count),
              source_label = excluded.source_label,
              conflicts_with_json = excluded.conflicts_with_json,
              supersedes_json = excluded.supersedes_json
            `,
            [
              row.original_id?.trim() || row.id || randomUUID(),
              cardId,
              subject,
              predicate,
              object,
              clamp01(row.confidence),
              row.source,
              dedupeKey,
              row.created_at,
              row.updated_at,
              row.last_access_at,
              Math.max(0, Math.floor(row.access_count)),
              normalizeKnowledgeStage(row.knowledge_stage),
              normalizeValidationStatus(row.validation_status),
              normalizeMemoryDomain((row as any).memory_domain),
              Math.max(0, Math.floor(Number(row.validation_count ?? 0))),
              Math.max(0, Math.floor(Number(row.contradiction_count ?? 0))),
              row.source_label?.trim() || null,
              JSON.stringify(parseStringArray(row.conflicts_with_json)),
              JSON.stringify(parseStringArray(row.supersedes_json)),
            ],
          )
        }

        await run(
          database,
          `DELETE FROM memory_archive ${hasBoundCardScope ? 'WHERE card_id = ?' : ''}`,
          hasBoundCardScope ? [boundCardId] : [],
        )
      })
    })

    await appendAuditLog({
      level: 'notice',
      category: 'memory',
      action: 'archive-restored',
      message: 'Archived memory rows were restored into active facts to preserve recall continuity.',
      payload: {
        restored: archivedRows.length,
      },
    })

    return archivedRows.length
  }

  async function getMemoryStats() {
    const [rows, episodicRows, consolidationRows, pendingSyncCount, ingestHealth, lastPrunedAt, retrievalTelemetry] = await Promise.all([
      all<DbMemoryFactRow>(
        database,
        `SELECT * FROM memory_facts ${hasBoundCardScope ? 'WHERE card_id = ?' : ''}`,
        hasBoundCardScope ? [boundCardId] : [],
      ),
      all<DbEpisodicEventRow>(database, 'SELECT * FROM episodic_events'),
      all<DbMemoryConsolidationRow>(
        database,
        `SELECT * FROM memory_consolidations ${hasBoundCardScope ? 'WHERE card_id = ?' : ''}`,
        hasBoundCardScope ? [boundCardId] : [],
      ),
      countPendingMemoryIngestEntries(),
      deriveMemoryIngestHealth(),
      getLastPrunedAt(),
      getMemoryRetrievalTelemetry(),
    ])

    const facts = rows.map(mapFactRow)
    const overlayByEventId = await loadLatestEpisodicReconsolidationOverlayByEventId(
      database,
      all,
      episodicRows.map(row => row.id),
    )
    const episodicEvents = episodicRows.map((row) => {
      const overlay = overlayByEventId.get(row.id)
      return mapEpisodicEventRow(row, overlay
        ? {
            latest: overlay.latest ? mapEpisodicReconsolidationOverlayRow(overlay.latest) : null,
            count: overlay.count,
          }
        : null)
    })
    const consolidations = consolidationRows.map(mapMemoryConsolidationRow)
    const currentTs = now()
    const factTierCounts = deriveTierCounts(facts, fact => fact.memoryTier ?? deriveFactMemoryTier(fact, currentTs))
    const episodicTierCounts = deriveTierCounts(episodicEvents, event => event.memoryTier ?? deriveEpisodicMemoryTier(event, currentTs))
    const consolidationTierCounts = deriveTierCounts(consolidations, record => record.memoryTier ?? deriveConsolidationMemoryTier(record, currentTs))
    return buildAlicizationMemoryStatsProjection({
      facts,
      episodicEvents,
      consolidations,
      factTierCounts,
      episodicTierCounts,
      consolidationTierCounts,
      pendingSyncCount,
      ingestHealth,
      lastPrunedAt,
      retrievalTelemetry,
      currentTs,
    }) satisfies AlicizationMemoryStats
  }

  async function insertAuditLog(input: AlicizationAuditLogInput) {
    const createdAt = Number.isFinite(input.createdAt) ? Number(input.createdAt) : now()
    const level = input.level ?? 'info'
    const payloadJson = input.payload ? JSON.stringify(input.payload) : null

    await run(
      database,
      `
      INSERT INTO audit_logs (id, level, category, action, message, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        level,
        input.category,
        input.action,
        input.message,
        payloadJson,
        createdAt,
      ],
    )
  }

  async function appendAuditLog(input: AlicizationAuditLogInput) {
    await enqueueWrite(async () => {
      await insertAuditLog(input)
    })
  }

  function resolveConversationTurnCardId(cardIdRaw: unknown, operation: string) {
    const requestedCardId = normalizeOrganicMemoryText(cardIdRaw, 120)
    if (hasBoundCardScope)
      return resolveMemoryCardId(requestedCardId || boundCardId, operation)
    return requestedCardId || boundCardId
  }

  async function appendConversationTurn(input: AlicizationDbConversationTurnInput, options?: DbWriteOptions) {
    const cardId = resolveConversationTurnCardId(input.cardId, 'conversation turn append')
    const sessionId = typeof input.sessionId === 'string' ? input.sessionId.trim() : ''
    if (!sessionId)
      throw new Error('sessionId is required')

    assertWriteNotAborted(options)
    const createdAt = Number.isFinite(input.createdAt) ? Number(input.createdAt) : now()
    const turnId = typeof input.turnId === 'string' && input.turnId.trim()
      ? input.turnId.trim()
      : null
    const userText = typeof input.userText === 'string' ? input.userText : null
    const assistantText = typeof input.assistantText === 'string' ? input.assistantText : null
    const structuredJson = input.structured ? JSON.stringify(input.structured) : null

    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await run(
        database,
        `
        INSERT INTO conversation_turns (
          id,
          card_id,
          turn_id,
          session_id,
          user_text,
          assistant_text,
          structured_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(card_id, session_id, turn_id)
        WHERE card_id IS NOT NULL
          AND TRIM(card_id) != ''
          AND session_id IS NOT NULL
          AND TRIM(session_id) != ''
          AND turn_id IS NOT NULL
          AND TRIM(turn_id) != ''
        DO UPDATE SET
          user_text = excluded.user_text,
          assistant_text = excluded.assistant_text,
          structured_json = excluded.structured_json,
          created_at = excluded.created_at
        `,
        [
          randomUUID(),
          cardId,
          turnId,
          sessionId,
          userText,
          assistantText,
          structuredJson,
          createdAt,
        ],
      )
    }, options)
  }

  async function getLatestConversationSessionId(cardIdRaw?: string) {
    const cardId = resolveConversationTurnCardId(cardIdRaw, 'latest conversation session')
    const row = await get<{ session_id?: string | null }>(
      database,
      `
      SELECT session_id
      FROM conversation_turns
      WHERE card_id = ?
        AND session_id IS NOT NULL
        AND TRIM(session_id) != ''
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [cardId],
    )
    if (typeof row?.session_id !== 'string')
      return undefined
    const normalized = row.session_id.trim()
    return normalized || undefined
  }

  function normalizeWorkingMemoryCheckpointKey(raw: unknown, maxChars: number) {
    return typeof raw === 'string'
      ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).trim()
      : ''
  }

  async function getWorkingMemoryCheckpoint(cardIdRaw: string, sessionIdRaw: string) {
    const cardId = normalizeWorkingMemoryCheckpointKey(cardIdRaw, 120)
    const sessionId = normalizeWorkingMemoryCheckpointKey(sessionIdRaw, 160)
    if (!cardId || !sessionId)
      return null

    const row = await get<DbWorkingMemoryCheckpointRow>(
      database,
      `
      SELECT card_id, session_id, version, snapshot_json, updated_at
      FROM working_memory_checkpoints
      WHERE card_id = ? AND session_id = ?
      LIMIT 1
      `,
      [cardId, sessionId],
    )

    return parseWorkingMemoryCheckpoint(row?.snapshot_json, {
      cardId,
      sessionId,
    })
  }

  async function listWorkingMemoryCheckpoints(cardIdRaw: string, options?: { limit?: number }) {
    const cardId = normalizeWorkingMemoryCheckpointKey(cardIdRaw, 120)
    if (!cardId)
      return []

    const limit = Math.max(1, Math.min(64, Math.floor(options?.limit ?? 12)))
    const rows = await all<DbWorkingMemoryCheckpointRow>(
      database,
      `
      SELECT card_id, session_id, version, snapshot_json, updated_at
      FROM working_memory_checkpoints
      WHERE card_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
      `,
      [cardId, limit],
    )

    return rows
      .map(row => parseWorkingMemoryCheckpoint(row.snapshot_json, {
        cardId: row.card_id,
        sessionId: row.session_id,
      }))
      .filter((snapshot): snapshot is WorkingMemorySnapshot => snapshot !== null)
  }

  function memoryReplaySessionCursor(updatedAt: number, sessionId: string) {
    return `${Math.max(0, Math.floor(updatedAt))}:${encodeURIComponent(sessionId)}`
  }

  function parseMemoryReplaySessionCursor(raw: unknown) {
    const cursor = normalizeOrganicMemoryText(raw, 360)
    const match = /^(\d+):(.+)$/u.exec(cursor)
    if (!match)
      return null
    try {
      return {
        activityUpdatedAt: Number(match[1]),
        sessionId: decodeURIComponent(match[2]),
      }
    }
    catch {
      return null
    }
  }

  async function listMemoryWorkbenchReplaySessions(input: {
    cardId: string
    limit?: number
    cursor?: string | null
  }): Promise<AlicizationMemoryReplaySessionListResult> {
    const cardId = resolveMemoryCardId(input.cardId, 'memory replay session list')
    const limit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 20)))
    const cursor = parseMemoryReplaySessionCursor(input.cursor)
    const cursorClause = cursor
      ? `
        AND (
          summary.activity_updated_at < ?
          OR (
            summary.activity_updated_at = ?
            AND summary.session_id < ?
          )
        )
      `
      : ''
    const params: unknown[] = [
      cardId,
      cardId,
      cardId,
      cardId,
    ]
    if (cursor) {
      params.push(
        cursor.activityUpdatedAt,
        cursor.activityUpdatedAt,
        cursor.sessionId,
      )
    }
    params.push(limit + 1)
    const rows = await all<DbMemoryReplaySessionSummaryRow>(
      database,
      `
      WITH session_keys AS (
        SELECT session_id
        FROM working_memory_checkpoints
        WHERE card_id = ?
          AND session_id IS NOT NULL
          AND TRIM(session_id) != ''
        GROUP BY session_id
      ),
      summary AS (
        SELECT
          session.session_id,
          checkpoint.snapshot_json,
          checkpoint.updated_at AS checkpoint_updated_at,
          MIN(turn.created_at) AS first_turn_at,
          MAX(turn.created_at) AS last_turn_at,
          SUM(CASE WHEN TRIM(COALESCE(turn.user_text, '')) != '' THEN 1 ELSE 0 END) AS user_turn_count,
          SUM(CASE WHEN TRIM(COALESCE(turn.assistant_text, '')) != '' THEN 1 ELSE 0 END) AS assistant_turn_count,
          CASE
            WHEN COALESCE(checkpoint.updated_at, 0) >= COALESCE(MAX(turn.created_at), 0)
              THEN COALESCE(checkpoint.updated_at, 0)
            ELSE COALESCE(MAX(turn.created_at), 0)
          END AS activity_updated_at
        FROM session_keys AS session
        LEFT JOIN working_memory_checkpoints AS checkpoint
          ON checkpoint.card_id = ?
          AND checkpoint.session_id = session.session_id
        LEFT JOIN conversation_turns AS turn
          ON turn.card_id = ?
          AND turn.session_id = session.session_id
        GROUP BY
          session.session_id,
          checkpoint.snapshot_json,
          checkpoint.updated_at
        HAVING SUM(CASE WHEN TRIM(COALESCE(turn.user_text, '')) != '' THEN 1 ELSE 0 END) > 0
      )
      SELECT
        summary.session_id,
        summary.snapshot_json,
        summary.checkpoint_updated_at,
        summary.activity_updated_at,
        summary.first_turn_at,
        summary.last_turn_at,
        summary.user_turn_count,
        summary.assistant_turn_count,
        (
          SELECT first_turn.user_text
          FROM conversation_turns AS first_turn
          WHERE first_turn.card_id = ?
            AND first_turn.session_id = summary.session_id
            AND TRIM(COALESCE(first_turn.user_text, '')) != ''
          ORDER BY first_turn.created_at ASC, first_turn.rowid ASC
          LIMIT 1
        ) AS first_user_text
      FROM summary
      WHERE 1 = 1
      ${cursorClause}
      ORDER BY summary.activity_updated_at DESC, summary.session_id DESC
      LIMIT ?
      `,
      params,
    )
    const hasMore = rows.length > limit
    const pageRows = rows.slice(0, limit)
    const items = pageRows.map((row) => {
      const snapshot = row.snapshot_json
        ? parseWorkingMemoryCheckpoint(row.snapshot_json, {
            cardId,
            sessionId: row.session_id,
          })
        : null
      const title = normalizeOrganicMemoryText(snapshot?.currentThread?.title, 120)
        || normalizeOrganicMemoryText(row.first_user_text, 120)
        || row.session_id
      return {
        sessionId: row.session_id,
        title,
        firstTurnAt: typeof row.first_turn_at === 'number' ? row.first_turn_at : null,
        lastTurnAt: typeof row.last_turn_at === 'number' ? row.last_turn_at : null,
        userTurnCount: Math.max(0, Math.floor(Number(row.user_turn_count) || 0)),
        assistantTurnCount: Math.max(0, Math.floor(Number(row.assistant_turn_count) || 0)),
        checkpointUpdatedAt: typeof row.checkpoint_updated_at === 'number'
          ? Math.max(0, Math.floor(row.checkpoint_updated_at))
          : null,
        activityUpdatedAt: Math.max(0, Math.floor(row.activity_updated_at)),
      }
    })
    const last = items.at(-1)
    return {
      items,
      nextCursor: hasMore && last
        ? memoryReplaySessionCursor(last.activityUpdatedAt, last.sessionId)
        : null,
    }
  }

  async function upsertWorkingMemoryCheckpoint(snapshot: WorkingMemorySnapshot) {
    const cardId = normalizeWorkingMemoryCheckpointKey(snapshot.cardId, 120)
    const sessionId = normalizeWorkingMemoryCheckpointKey(snapshot.sessionId, 160)
    if (!cardId || !sessionId)
      throw new Error('working memory checkpoint requires cardId and sessionId')

    const snapshotJson = serializeWorkingMemoryCheckpoint({
      ...snapshot,
      cardId,
      sessionId,
    })
    await enqueueWrite(async () => {
      await run(
        database,
        `
        INSERT INTO working_memory_checkpoints (
          card_id,
          session_id,
          version,
          snapshot_json,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(card_id, session_id)
        DO UPDATE SET
          version = excluded.version,
          snapshot_json = excluded.snapshot_json,
          updated_at = excluded.updated_at
        `,
        [
          cardId,
          sessionId,
          'working-memory-v1',
          snapshotJson,
          snapshot.updatedAt,
        ],
      )
    })
  }

  async function clearWorkingMemoryCheckpoints(cardIdRaw?: string, sessionIdRaw?: string) {
    const cardId = normalizeWorkingMemoryCheckpointKey(cardIdRaw, 120)
    const sessionId = normalizeWorkingMemoryCheckpointKey(sessionIdRaw, 160)
    await enqueueWrite(async () => {
      if (cardId && sessionId) {
        await run(database, 'DELETE FROM working_memory_checkpoints WHERE card_id = ? AND session_id = ?', [cardId, sessionId])
        return
      }
      if (cardId) {
        await run(database, 'DELETE FROM working_memory_checkpoints WHERE card_id = ?', [cardId])
        return
      }
      await run(database, 'DELETE FROM working_memory_checkpoints')
    })
  }

  async function listConversationTurnsSince(sinceExclusive: number, options?: { cardId?: string, limit?: number }) {
    const cardId = resolveConversationTurnCardId(options?.cardId, 'conversation turn list since')
    const limit = Math.max(1, Math.min(10_000, Math.floor(options?.limit ?? 2_000)))
    const rows = await all<DbConversationTurnRow>(
      database,
      `
      SELECT
        card_id,
        turn_id,
        session_id,
        user_text,
        assistant_text,
        structured_json,
        created_at
      FROM conversation_turns
      WHERE card_id = ?
        AND created_at > ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [cardId, sinceExclusive, limit],
    )

    return rows.map(row => ({
      turnId: row.turn_id,
      sessionId: row.session_id,
      userText: row.user_text,
      assistantText: row.assistant_text,
      structuredJson: row.structured_json,
      createdAt: row.created_at,
    }))
  }

  async function listConversationTurnsBySession(sessionIdRaw: string, options?: { cardId?: string, sinceCreatedAt?: number, limit?: number }) {
    const cardId = resolveConversationTurnCardId(options?.cardId, 'conversation turn list by session')
    const sessionId = sessionIdRaw.trim()
    if (!sessionId)
      return []

    const sinceCreatedAt = Number.isFinite(options?.sinceCreatedAt)
      ? Math.max(0, Math.floor(Number(options?.sinceCreatedAt)))
      : 0
    const limit = Math.max(1, Math.min(10_000, Math.floor(options?.limit ?? 500)))
    const rows = await all<DbConversationTurnRow>(
      database,
      `
      SELECT
        card_id,
        turn_id,
        session_id,
        user_text,
        assistant_text,
        structured_json,
        created_at
      FROM (
        SELECT
          rowid AS sort_rowid,
          card_id,
          turn_id,
          session_id,
          user_text,
          assistant_text,
          structured_json,
          created_at
        FROM conversation_turns
        WHERE card_id = ?
          AND session_id = ?
          AND created_at >= ?
        ORDER BY created_at DESC, rowid DESC
        LIMIT ?
      )
      ORDER BY created_at ASC, sort_rowid ASC
      `,
      [cardId, sessionId, sinceCreatedAt, limit],
    )

    return rows.map(row => ({
      turnId: row.turn_id,
      sessionId: row.session_id,
      userText: row.user_text,
      assistantText: row.assistant_text,
      structuredJson: row.structured_json,
      createdAt: row.created_at,
    }))
  }

  const memoryConsolidationRuntime = createAlicizationMemoryConsolidationRuntime({
    database,
    allowUnboundScope,
    all,
    run,
    mapRow: mapMemoryConsolidationRow,
    buildRecords: buildMemoryConsolidationRecords,
    searchRecords: searchMemoryConsolidationRecords,
  })

  async function rebuildMemoryConsolidationsFromEvents(cardId: string) {
    const scopedCardId = hasBoundCardScope
      ? resolveMemoryCardId(cardId, 'memory consolidation rebuild')
      : normalizeOrganicMemoryText(cardId, 120)
    if (!scopedCardId)
      return
    const rows = await all<DbEpisodicEventRow>(
      database,
      `
      SELECT *
      FROM episodic_events
      WHERE card_id = ?
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT 4000
      `,
      [scopedCardId],
    )
    const overlayByEventId = await loadLatestEpisodicReconsolidationOverlayByEventId(
      database,
      all,
      rows.map(row => row.id),
    )
    await memoryConsolidationRuntime.rebuildMemoryConsolidationsFromEvents(
      {
        cardId: scopedCardId,
        events: rows.map((row) => {
          const overlay = overlayByEventId.get(row.id)
          return mapEpisodicEventRow(row, overlay
            ? {
                latest: overlay.latest ? mapEpisodicReconsolidationOverlayRow(overlay.latest) : null,
                count: overlay.count,
              }
            : null)
        }),
        now: now(),
      },
    )
  }

  async function applyPreparedMemoryFacts(prepared: PreparedMemoryFactWrite[]) {
    for (const fact of prepared) {
      const cardId = hasBoundCardScope
        ? resolveMemoryCardId(fact.cardId, 'memory fact write')
        : normalizeOrganicMemoryText(fact.cardId, 120) || boundCardId
      await run(
        database,
        `
        INSERT INTO memory_facts (
          id,
          card_id,
          subject,
          predicate,
          object,
          confidence,
          source,
          dedupe_key,
          created_at,
          updated_at,
          last_access_at,
	          access_count,
	          knowledge_stage,
	          validation_status,
	          memory_domain,
	          validation_count,
	          contradiction_count,
          source_label,
          conflicts_with_json,
          supersedes_json
	        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(card_id, dedupe_key)
        DO UPDATE SET
          confidence = MAX(memory_facts.confidence, excluded.confidence),
          source = excluded.source,
          updated_at = excluded.updated_at,
          knowledge_stage = excluded.knowledge_stage,
          validation_status = excluded.validation_status,
          memory_domain = excluded.memory_domain,
          validation_count = MAX(memory_facts.validation_count, excluded.validation_count),
          contradiction_count = MAX(memory_facts.contradiction_count, excluded.contradiction_count),
          source_label = excluded.source_label,
          conflicts_with_json = excluded.conflicts_with_json,
          supersedes_json = excluded.supersedes_json
        `,
        [
          fact.id,
          cardId,
          fact.subject,
          fact.predicate,
          fact.object,
          fact.confidence,
          fact.source,
          fact.dedupeKey,
          fact.createdAt,
          fact.updatedAt,
          null,
          0,
          fact.knowledgeStage,
          fact.validationStatus,
          fact.memoryDomain,
          fact.validationCount,
          fact.contradictionCount,
          fact.sourceLabel,
          fact.conflictsWithJson,
          fact.supersedesJson,
        ],
      )
    }
  }

  async function applyPreparedMemoryConsolidations(prepared: PreparedMemoryConsolidationWrite[]) {
    for (const record of prepared) {
      const cardId = hasBoundCardScope
        ? resolveMemoryCardId(record.cardId, 'memory consolidation write')
        : normalizeOrganicMemoryText(record.cardId, 120)
      if (!cardId)
        continue
      await run(
        database,
        `
        INSERT INTO memory_consolidations (
          card_id,
          id,
          kind,
          facet,
          period_key,
          period_started_at,
          period_ended_at,
          summary,
          lesson,
          cues_json,
          confidence,
          dominant_provenance,
          derived_event_ids_json,
          metadata_json,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(card_id, id)
        DO UPDATE SET
          kind = excluded.kind,
          facet = excluded.facet,
          period_key = excluded.period_key,
          period_started_at = excluded.period_started_at,
          period_ended_at = excluded.period_ended_at,
          summary = excluded.summary,
          lesson = excluded.lesson,
          cues_json = excluded.cues_json,
          confidence = excluded.confidence,
          dominant_provenance = excluded.dominant_provenance,
          derived_event_ids_json = excluded.derived_event_ids_json,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at
        `,
        [
          cardId,
          record.id,
          record.kind,
          record.facet,
          record.periodKey,
          record.periodStartedAt,
          record.periodEndedAt,
          record.summary,
          record.lesson,
          record.cuesJson,
          record.confidence,
          record.dominantProvenance,
          record.derivedEventIdsJson,
          record.metadataJson,
          record.updatedAt,
        ],
      )
    }
  }

  async function applyPreparedEpisodicEvents(prepared: PreparedEpisodicEventWrite[]) {
    for (const event of prepared) {
      await run(
        database,
        `
        INSERT INTO episodic_events (
          id,
          card_id,
          decision_trace_id,
          turn_id,
          session_id,
          source_kind,
          provenance,
          occurred_at,
          where_summary,
          with_whom_json,
          thread_anchor,
          what_happened,
          felt,
          emotion_tags_json,
          what_changed,
          relationship_meaning,
          lesson,
          source_summary,
          confidence,
          salience,
          scene_attachment,
          consolidation_priority,
          relationship_shift_json,
          derived_from_json,
          tags_json,
          created_at,
          updated_at,
          last_recalled_at,
          recall_count,
          reconsolidation_count,
          latest_reconsolidation_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, NULL)
        ON CONFLICT(id)
        DO UPDATE SET
          decision_trace_id = excluded.decision_trace_id,
          turn_id = excluded.turn_id,
          session_id = excluded.session_id,
          source_kind = excluded.source_kind,
          provenance = excluded.provenance,
          occurred_at = excluded.occurred_at,
          where_summary = excluded.where_summary,
          with_whom_json = excluded.with_whom_json,
          thread_anchor = excluded.thread_anchor,
          what_happened = excluded.what_happened,
          felt = excluded.felt,
          emotion_tags_json = excluded.emotion_tags_json,
          what_changed = excluded.what_changed,
          relationship_meaning = excluded.relationship_meaning,
          lesson = excluded.lesson,
          source_summary = excluded.source_summary,
          confidence = excluded.confidence,
          salience = excluded.salience,
          scene_attachment = excluded.scene_attachment,
          consolidation_priority = excluded.consolidation_priority,
          relationship_shift_json = excluded.relationship_shift_json,
          derived_from_json = excluded.derived_from_json,
          tags_json = excluded.tags_json,
          updated_at = excluded.updated_at
        `,
        [
          event.id,
          event.cardId,
          event.decisionTraceId,
          event.turnId,
          event.sessionId,
          event.sourceKind,
          event.provenance,
          event.occurredAt,
          event.whereSummary,
          event.withWhomJson,
          event.threadAnchor,
          event.whatHappened,
          event.felt,
          event.emotionTagsJson,
          event.whatChanged,
          event.relationshipMeaning,
          event.lesson,
          event.sourceSummary,
          event.confidence,
          event.salience,
          event.sceneAttachment,
          event.consolidationPriority,
          event.relationshipShiftJson,
          event.derivedFromJson,
          event.tagsJson,
          event.createdAt,
          event.updatedAt,
        ],
      )
    }
    await memoryEventGraphRuntime.upsertGraphForEpisodicEvents(
      prepared.map(mapPreparedEventToEventGraphSource),
    )
    for (const cardId of new Set(prepared.map(event => event.cardId)))
      await rebuildMemoryConsolidationsFromEvents(cardId)
  }

  async function upsertMemoryConsolidations(
    records: AlicizationMemoryConsolidationRecord[],
  ) {
    if (records.length === 0)
      return []
    const cardId = boundCardId

    const prepared = records.map(record => ({
      cardId,
      id: record.id.trim(),
      kind: record.kind,
      facet: record.facet === 'phase' || record.facet === 'relationship-era' || record.facet === 'task-era' || record.facet === 'self-era'
        ? record.facet
        : null,
      periodKey: normalizeOrganicMemoryText(record.periodKey, 96),
      periodStartedAt: Math.max(0, Math.floor(record.periodStartedAt)),
      periodEndedAt: Math.max(0, Math.floor(record.periodEndedAt)),
      summary: normalizeOrganicMemoryText(record.summary, 320),
      lesson: normalizeOrganicMemoryText(record.lesson, 220) || null,
      cuesJson: JSON.stringify(record.cues.map(item => normalizeOrganicMemoryText(item, 120)).filter(Boolean)),
      confidence: clamp01(record.confidence),
      dominantProvenance: record.dominantProvenance,
      derivedEventIdsJson: JSON.stringify(record.derivedEventIds.map(item => normalizeOrganicMemoryText(item, 120)).filter(Boolean)),
      metadataJson: record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? JSON.stringify(record.metadata)
        : null,
      updatedAt: Math.max(0, Math.floor(record.updatedAt)),
    })).filter(item => item.id && item.periodKey && item.summary)

    if (prepared.length === 0)
      return []

    await enqueueWrite(async () => {
      await appendMemoryIngestEntries([{
        operationKind: 'upsert-memory-consolidations',
        payload: {
          kind: 'upsert-memory-consolidations',
          records: prepared,
        },
      }])
      await drainMemoryIngestJournal()
    })
    await rebuildLongTermMemorySearchIndexForCard(cardId, 'memory consolidation search index rebuild')

    return prepared.map(record => mapMemoryConsolidationRow({
      card_id: cardId,
      id: record.id,
      kind: record.kind,
      facet: record.facet,
      period_key: record.periodKey,
      period_started_at: record.periodStartedAt,
      period_ended_at: record.periodEndedAt,
      summary: record.summary,
      lesson: record.lesson,
      cues_json: record.cuesJson,
      confidence: record.confidence,
      dominant_provenance: record.dominantProvenance,
      derived_event_ids_json: record.derivedEventIdsJson,
      metadata_json: record.metadataJson,
      updated_at: record.updatedAt,
    }))
  }

  async function listMemoryConsolidations(limit = 16) {
    return await memoryConsolidationRuntime.listMemoryConsolidations({
      cardId: hasBoundCardScope ? boundCardId : undefined,
      allowUnboundScope,
      limit,
    })
  }

  async function searchMemoryConsolidations(input: AlicizationMemoryConsolidationSearchInput) {
    return await memoryConsolidationRuntime.searchMemoryConsolidations({
      ...input,
      cardId: hasBoundCardScope ? boundCardId : undefined,
      allowUnboundScope,
    })
  }

  const appendMindTurnEvents = memoryMindStateRuntime.appendMindTurnEvents
  const listMindTurnEvents = memoryMindStateRuntime.listMindTurnEvents

  async function upsertTaskThread(input: AlicizationTaskThreadUpsertInput, options?: DbWriteOptions) {
    const goal = input.goal.trim()
    if (!goal)
      throw new Error('goal is required')

    const currentTs = now()
    const id = typeof input.id === 'string' && input.id.trim()
      ? input.id.trim()
      : randomUUID()
    const decisionTraceId = typeof input.decisionTraceId === 'string' && input.decisionTraceId.trim()
      ? input.decisionTraceId.trim()
      : null
    const turnId = typeof input.turnId === 'string' && input.turnId.trim()
      ? input.turnId.trim()
      : null
    const sessionId = typeof input.sessionId === 'string' && input.sessionId.trim()
      ? input.sessionId.trim()
      : null
    const origin = normalizeExecutionOrigin({
      origin: input.origin,
      turnId,
    })
    const kind = normalizeExecutionTaskKind(input.kind)
    const status = normalizeTaskThreadStatus(input.status)
    const selectedChannel = normalizeExecutionChannel(input.selectedChannel)
    const proposedChannel = normalizeExecutionChannel(input.proposedChannel)
    const summary = typeof input.summary === 'string' && input.summary.trim()
      ? input.summary.trim()
      : null
    const metadataJson = input.metadata && typeof input.metadata === 'object'
      ? JSON.stringify(input.metadata)
      : null
    const metadataUpdateClause = input.metadata === undefined
      ? ''
      : '          metadata_json = excluded.metadata_json,\n'
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : currentTs
    const updatedAt = Number.isFinite(input.updatedAt)
      ? Math.max(createdAt, Math.floor(Number(input.updatedAt)))
      : currentTs
    const expectedUpdatedAt = Number.isFinite(input.expectedUpdatedAt)
      ? Math.max(0, Math.floor(Number(input.expectedUpdatedAt)))
      : null
    const createOnly = input.createOnly === true
    const lastEventAt = Number.isFinite(input.lastEventAt)
      ? Math.max(0, Math.floor(Number(input.lastEventAt)))
      : null
    const completedAt = Number.isFinite(input.completedAt)
      ? Math.max(0, Math.floor(Number(input.completedAt)))
      : null

    assertWriteNotAborted(options)
    let writeResult: SqliteStatementResult | undefined
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      if (expectedUpdatedAt !== null && !createOnly) {
        const existing = await get<{ id: string }>(
          database,
          'SELECT id FROM task_threads WHERE id = ? LIMIT 1',
          [id],
        )
        if (!existing) {
          writeResult = { changes: 0, lastID: 0 }
          return
        }
      }
      writeResult = await run(
        database,
        `
        INSERT INTO task_threads (
          id,
          decision_trace_id,
          turn_id,
          session_id,
          origin,
          goal,
          kind,
          status,
          selected_channel,
          proposed_channel,
          summary,
          metadata_json,
          created_at,
          updated_at,
          last_event_at,
          completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ${createOnly
          ? 'ON CONFLICT(id) DO NOTHING'
          : `ON CONFLICT(id)
        DO UPDATE SET
          decision_trace_id = excluded.decision_trace_id,
          turn_id = excluded.turn_id,
          session_id = excluded.session_id,
          origin = excluded.origin,
          goal = excluded.goal,
          kind = excluded.kind,
          status = excluded.status,
          selected_channel = excluded.selected_channel,
          proposed_channel = excluded.proposed_channel,
          summary = excluded.summary,
${metadataUpdateClause}          updated_at = MAX(excluded.updated_at, task_threads.updated_at + 1),
          last_event_at = excluded.last_event_at,
          completed_at = excluded.completed_at
        WHERE (? IS NULL OR task_threads.updated_at = ?)
          AND (task_threads.status != 'dead-lettered' OR excluded.status = 'dead-lettered')`}
        `,
        [
          id,
          decisionTraceId,
          turnId,
          sessionId,
          origin,
          goal,
          kind,
          status,
          selectedChannel,
          proposedChannel,
          summary,
          metadataJson,
          createdAt,
          updatedAt,
          lastEventAt,
          completedAt,
          ...(createOnly ? [] : [expectedUpdatedAt, expectedUpdatedAt]),
        ],
      )
    }, options)

    if (createOnly && writeResult?.changes === 0) {
      const error = new Error(`Task thread ${id} already exists.`)
      Object.assign(error, {
        code: 'TASK_THREAD_ALREADY_EXISTS',
        threadId: id,
      })
      throw error
    }

    if (expectedUpdatedAt !== null && writeResult?.changes === 0) {
      const error = new Error(`Task thread ${id} changed before this update could be applied.`)
      Object.assign(error, {
        code: 'TASK_THREAD_VERSION_CONFLICT',
        threadId: id,
        expectedUpdatedAt,
      })
      throw error
    }

    const persistedThread = await getTaskThread(id)
    if (!persistedThread)
      throw new Error(`Task thread "${id}" disappeared after persistence.`)
    return persistedThread
  }

  async function resumeTaskThread(input: AlicizationTaskThreadResumeInput, options?: DbWriteOptions) {
    const threadId = input.threadId.trim()
    const expectedChannel = normalizeExecutionChannel(input.expectedChannel)
    const selectedChannel = normalizeExecutionChannel(input.selectedChannel)
    const expectedStatus = input.expectedStatus
    const expectedUpdatedAt = Number.isFinite(input.expectedUpdatedAt)
      ? Math.max(0, Math.floor(input.expectedUpdatedAt))
      : null
    const eventThreadId = typeof input.event.threadId === 'string'
      ? input.event.threadId.trim()
      : ''
    const eventKind = normalizeExecutionEventKind(input.event.kind)
    const eventStatus = input.event.threadStatus
      ? normalizeTaskThreadStatus(input.event.threadStatus)
      : null
    const eventChannel = normalizeExecutionChannel(input.event.channel)
    if (
      !threadId
      || !expectedChannel
      || !selectedChannel
      || expectedUpdatedAt === null
      || (expectedStatus !== 'needs-affirmation' && expectedStatus !== 'paused')
      || eventThreadId !== threadId
      || eventKind !== 'resume'
      || eventStatus !== 'planned'
      || eventChannel !== selectedChannel
    ) {
      throw new Error('resumeTaskThread requires one matching planned resume event.')
    }

    const updatedAt = Number.isFinite(input.updatedAt)
      ? Math.max(0, Math.floor(input.updatedAt))
      : now()
    const eventCreatedAt = Number.isFinite(input.event.createdAt)
      ? Math.max(0, Math.floor(Number(input.event.createdAt)))
      : updatedAt
    const eventId = typeof input.event.id === 'string' && input.event.id.trim()
      ? input.event.id.trim().slice(0, 240)
      : randomUUID()
    const eventDecisionTraceId = typeof input.event.decisionTraceId === 'string' && input.event.decisionTraceId.trim()
      ? input.event.decisionTraceId.trim()
      : null
    const eventTurnId = typeof input.event.turnId === 'string' && input.event.turnId.trim()
      ? input.event.turnId.trim()
      : null
    const eventSessionId = typeof input.event.sessionId === 'string' && input.event.sessionId.trim()
      ? input.event.sessionId.trim()
      : null
    const eventOrigin = normalizeExecutionOrigin({
      origin: input.event.origin,
      turnId: eventTurnId,
    })
    const eventPayloadJson = input.event.payload && typeof input.event.payload === 'object'
      ? JSON.stringify(input.event.payload)
      : null
    const metadataJson = input.metadata && typeof input.metadata === 'object'
      ? JSON.stringify(input.metadata)
      : null
    const eventPayload = input.event.payload && typeof input.event.payload === 'object' && !Array.isArray(input.event.payload)
      ? input.event.payload as Record<string, unknown>
      : null
    const taskMetadata = input.metadata?.task && typeof input.metadata.task === 'object' && !Array.isArray(input.metadata.task)
      ? input.metadata.task as Record<string, unknown>
      : null
    if (
      expectedStatus === 'paused'
      && (
        eventPayload?.resumeMode !== 'recovery'
        || taskMetadata?.effect !== 'observe'
        || Object.hasOwn(eventPayload, 'approval')
      )
    ) {
      throw new Error('paused recovery must be read-only and cannot carry confirmation semantics.')
    }

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await runInTransaction(database, async () => {
        const update = await run(
          database,
          `
          UPDATE task_threads
          SET status = 'planned',
              selected_channel = ?,
              metadata_json = ?,
              updated_at = MAX(?, updated_at + 1),
              last_event_at = ?,
              completed_at = NULL
          WHERE id = ?
            AND updated_at = ?
            AND status = ?
            AND COALESCE(selected_channel, proposed_channel) = ?
          `,
          [
            selectedChannel,
            metadataJson,
            Math.max(updatedAt, eventCreatedAt),
            eventCreatedAt,
            threadId,
            expectedUpdatedAt,
            expectedStatus,
            expectedChannel,
          ],
        )
        if (update.changes === 0) {
          const error = new Error(`Task thread ${threadId} changed before resume could be applied.`)
          Object.assign(error, {
            code: 'TASK_THREAD_VERSION_CONFLICT',
            threadId,
            expectedUpdatedAt,
          })
          throw error
        }

        await run(
          database,
          `
          INSERT INTO executor_events (
            id,
            thread_id,
            decision_trace_id,
            turn_id,
            session_id,
            origin,
            channel,
            kind,
            thread_status,
            payload_json,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            eventId,
            threadId,
            eventDecisionTraceId,
            eventTurnId,
            eventSessionId,
            eventOrigin,
            eventChannel,
            eventKind,
            eventStatus,
            eventPayloadJson,
            eventCreatedAt,
          ],
        )
      })
    }, options)

    const persistedThread = await getTaskThread(threadId)
    if (!persistedThread)
      throw new Error(`Task thread "${threadId}" disappeared after resume persistence.`)
    return persistedThread
  }

  async function getTaskThread(id: string) {
    const threadId = typeof id === 'string'
      ? id.trim()
      : ''
    if (!threadId)
      return undefined

    const row = await get<DbTaskThreadRow>(
      database,
      `
      SELECT
        id,
        decision_trace_id,
        turn_id,
        session_id,
        origin,
        goal,
        kind,
        status,
        selected_channel,
        proposed_channel,
        summary,
        metadata_json,
        created_at,
        updated_at,
        last_event_at,
        completed_at
      FROM task_threads
      WHERE id = ?
      LIMIT 1
      `,
      [threadId],
    )

    return row ? mapTaskThreadRow(row) : undefined
  }

  async function listTaskThreads(input?: AlicizationListTaskThreadsInput) {
    const decisionTraceId = typeof input?.decisionTraceId === 'string'
      ? input.decisionTraceId.trim()
      : ''
    const turnId = typeof input?.turnId === 'string'
      ? input.turnId.trim()
      : ''
    const sessionId = typeof input?.sessionId === 'string'
      ? input.sessionId.trim()
      : ''
    const statuses = Array.isArray(input?.status)
      ? input.status
          .map((value: AlicizationTaskThreadStatus) => normalizeTaskThreadStatus(value))
      : input?.status
        ? [normalizeTaskThreadStatus(input.status)]
        : []
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 200)))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (decisionTraceId) {
      whereClauses.push('decision_trace_id = ?')
      params.push(decisionTraceId)
    }
    if (turnId) {
      whereClauses.push('turn_id = ?')
      params.push(turnId)
    }
    if (sessionId) {
      whereClauses.push('session_id = ?')
      params.push(sessionId)
    }
    if (statuses.length === 1) {
      whereClauses.push('status = ?')
      params.push(statuses[0])
    }
    else if (statuses.length > 1) {
      whereClauses.push(`status IN (${statuses.map(() => '?').join(', ')})`)
      params.push(...statuses)
    }

    const rows = await all<DbTaskThreadRow>(
      database,
      `
      SELECT
        id,
        decision_trace_id,
        turn_id,
        session_id,
        origin,
        goal,
        kind,
        status,
        selected_channel,
        proposed_channel,
        summary,
        metadata_json,
        created_at,
        updated_at,
        last_event_at,
        completed_at
      FROM task_threads
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      ORDER BY COALESCE(last_event_at, updated_at) DESC, updated_at DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return rows.map(mapTaskThreadRow)
  }

  async function upsertChannelCapabilityManifest(input: AlicizationChannelCapabilityManifestUpsertInput, options?: DbWriteOptions) {
    const channel = normalizeExecutionChannel(input.channel)
    if (!channel)
      throw new Error('channel is required')

    const available = input.available !== false
    const enabled = input.enabled !== false
    const ready = input.ready !== false
    const sessionAffinity = typeof input.sessionAffinity === 'boolean'
      ? input.sessionAffinity
      : executionChannelSessionAffinity.has(channel)
    const reason = typeof input.reason === 'string' && input.reason.trim()
      ? input.reason.trim().slice(0, 360)
      : null
    const metadataJson = input.metadata && typeof input.metadata === 'object'
      ? JSON.stringify(input.metadata)
      : null

    const currentTs = now()
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : currentTs
    const updatedAt = Number.isFinite(input.updatedAt)
      ? Math.max(createdAt, Math.floor(Number(input.updatedAt)))
      : currentTs
    const lastCheckedAt = Number.isFinite(input.lastCheckedAt)
      ? Math.max(0, Math.floor(Number(input.lastCheckedAt)))
      : updatedAt

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await run(
        database,
        `
        INSERT INTO capability_manifests (
          channel,
          available,
          enabled,
          ready,
          session_affinity,
          reason,
          metadata_json,
          created_at,
          updated_at,
          last_checked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel)
        DO UPDATE SET
          available = excluded.available,
          enabled = excluded.enabled,
          ready = excluded.ready,
          session_affinity = excluded.session_affinity,
          reason = excluded.reason,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          last_checked_at = excluded.last_checked_at
        `,
        [
          channel,
          available ? 1 : 0,
          enabled ? 1 : 0,
          ready ? 1 : 0,
          sessionAffinity ? 1 : 0,
          reason,
          metadataJson,
          createdAt,
          updatedAt,
          lastCheckedAt,
        ],
      )
    }, options)

    const row = await get<DbChannelCapabilityManifestRow>(
      database,
      `
      SELECT
        channel,
        available,
        enabled,
        ready,
        session_affinity,
        reason,
        metadata_json,
        created_at,
        updated_at,
        last_checked_at
      FROM capability_manifests
      WHERE channel = ?
      LIMIT 1
      `,
      [channel],
    )

    if (row)
      return mapChannelCapabilityManifestRow(row)

    return {
      channel,
      available,
      enabled,
      ready,
      sessionAffinity,
      reason,
      metadata: metadataJson ? parseJsonObject(metadataJson) : null,
      createdAt,
      updatedAt,
      lastCheckedAt,
    } satisfies AlicizationChannelCapabilityManifestRecord
  }

  async function listChannelCapabilityManifests(input?: AlicizationListChannelCapabilityManifestsInput) {
    const channels = Array.isArray(input?.channel)
      ? input.channel
          .map(value => normalizeExecutionChannel(value))
          .filter((value): value is AlicizationExecutionChannel => Boolean(value))
      : input?.channel
        ? [normalizeExecutionChannel(input.channel)].filter((value): value is AlicizationExecutionChannel => Boolean(value))
        : []
    const available = typeof input?.available === 'boolean'
      ? input.available
      : null
    const enabled = typeof input?.enabled === 'boolean'
      ? input.enabled
      : null
    const ready = typeof input?.ready === 'boolean'
      ? input.ready
      : null
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 200)))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (channels.length === 1) {
      whereClauses.push('channel = ?')
      params.push(channels[0])
    }
    else if (channels.length > 1) {
      whereClauses.push(`channel IN (${channels.map(() => '?').join(', ')})`)
      params.push(...channels)
    }
    if (available !== null) {
      whereClauses.push('available = ?')
      params.push(available ? 1 : 0)
    }
    if (enabled !== null) {
      whereClauses.push('enabled = ?')
      params.push(enabled ? 1 : 0)
    }
    if (ready !== null) {
      whereClauses.push('ready = ?')
      params.push(ready ? 1 : 0)
    }

    const rows = await all<DbChannelCapabilityManifestRow>(
      database,
      `
      SELECT
        channel,
        available,
        enabled,
        ready,
        session_affinity,
        reason,
        metadata_json,
        created_at,
        updated_at,
        last_checked_at
      FROM capability_manifests
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      ORDER BY updated_at DESC, COALESCE(last_checked_at, updated_at) DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return rows.map(mapChannelCapabilityManifestRow)
  }

  async function upsertExecutorSession(input: AlicizationExecutorSessionUpsertInput, options?: DbWriteOptions) {
    const channel = normalizeExecutionChannel(input.channel)
    if (!channel)
      throw new Error('channel is required')

    const affinityKey = typeof input.affinityKey === 'string'
      ? input.affinityKey.trim()
      : ''
    if (!affinityKey)
      throw new Error('affinityKey is required')

    const id = typeof input.id === 'string' && input.id.trim()
      ? input.id.trim()
      : randomUUID()
    const externalSessionId = typeof input.externalSessionId === 'string' && input.externalSessionId.trim()
      ? input.externalSessionId.trim()
      : null
    const status = normalizeExecutorSessionStatus(input.status)
    const summary = typeof input.summary === 'string' && input.summary.trim()
      ? input.summary.trim()
      : null
    const metadataJson = input.metadata && typeof input.metadata === 'object'
      ? JSON.stringify(input.metadata)
      : null
    const currentTs = now()
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : currentTs
    const updatedAt = Number.isFinite(input.updatedAt)
      ? Math.max(createdAt, Math.floor(Number(input.updatedAt)))
      : currentTs
    const lastUsedAt = Number.isFinite(input.lastUsedAt)
      ? Math.max(0, Math.floor(Number(input.lastUsedAt)))
      : updatedAt

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await run(
        database,
        `
        INSERT INTO executor_sessions (
          id,
          channel,
          affinity_key,
          external_session_id,
          status,
          summary,
          metadata_json,
          created_at,
          updated_at,
          last_used_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel, affinity_key)
        DO UPDATE SET
          external_session_id = excluded.external_session_id,
          status = excluded.status,
          summary = excluded.summary,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          last_used_at = excluded.last_used_at
        `,
        [
          id,
          channel,
          affinityKey,
          externalSessionId,
          status,
          summary,
          metadataJson,
          createdAt,
          updatedAt,
          lastUsedAt,
        ],
      )
    }, options)

    const row = await get<DbExecutorSessionRow>(
      database,
      `
      SELECT
        id,
        channel,
        affinity_key,
        external_session_id,
        status,
        summary,
        metadata_json,
        created_at,
        updated_at,
        last_used_at
      FROM executor_sessions
      WHERE channel = ?
        AND affinity_key = ?
      LIMIT 1
      `,
      [channel, affinityKey],
    )

    if (row)
      return mapExecutorSessionRow(row)

    return {
      id,
      channel,
      affinityKey,
      externalSessionId,
      status,
      summary,
      metadata: metadataJson ? parseJsonObject(metadataJson) : null,
      createdAt,
      updatedAt,
      lastUsedAt,
    } satisfies AlicizationExecutorSessionRecord
  }

  async function listExecutorSessions(input?: AlicizationListExecutorSessionsInput) {
    const channels = Array.isArray(input?.channel)
      ? input.channel
          .map(value => normalizeExecutionChannel(value))
          .filter((value): value is AlicizationExecutionChannel => Boolean(value))
      : input?.channel
        ? [normalizeExecutionChannel(input.channel)].filter((value): value is AlicizationExecutionChannel => Boolean(value))
        : []
    const affinityKey = typeof input?.affinityKey === 'string'
      ? input.affinityKey.trim()
      : ''
    const statuses = Array.isArray(input?.status)
      ? input.status.map(value => normalizeExecutorSessionStatus(value))
      : input?.status
        ? [normalizeExecutorSessionStatus(input.status)]
        : []
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 200)))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (channels.length === 1) {
      whereClauses.push('channel = ?')
      params.push(channels[0])
    }
    else if (channels.length > 1) {
      whereClauses.push(`channel IN (${channels.map(() => '?').join(', ')})`)
      params.push(...channels)
    }
    if (affinityKey) {
      whereClauses.push('affinity_key = ?')
      params.push(affinityKey)
    }
    if (statuses.length === 1) {
      whereClauses.push('status = ?')
      params.push(statuses[0])
    }
    else if (statuses.length > 1) {
      whereClauses.push(`status IN (${statuses.map(() => '?').join(', ')})`)
      params.push(...statuses)
    }

    const rows = await all<DbExecutorSessionRow>(
      database,
      `
      SELECT
        id,
        channel,
        affinity_key,
        external_session_id,
        status,
        summary,
        metadata_json,
        created_at,
        updated_at,
        last_used_at
      FROM executor_sessions
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      ORDER BY COALESCE(last_used_at, updated_at) DESC, updated_at DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return rows.map(mapExecutorSessionRow)
  }

  async function appendExecutionEvents(events: AlicizationExecutionEventInput[], options?: DbWriteOptions) {
    if (events.length === 0)
      return

    const normalized = events
      .map((event) => {
        const threadId = typeof event.threadId === 'string'
          ? event.threadId.trim()
          : ''
        const kind = normalizeExecutionEventKind(event.kind)
        if (!threadId || !kind)
          return null

        return {
          id: typeof event.id === 'string' && event.id.trim()
            ? event.id.trim().slice(0, 240)
            : randomUUID(),
          threadId,
          decisionTraceId: typeof event.decisionTraceId === 'string' && event.decisionTraceId.trim()
            ? event.decisionTraceId.trim()
            : null,
          turnId: typeof event.turnId === 'string' && event.turnId.trim()
            ? event.turnId.trim()
            : null,
          sessionId: typeof event.sessionId === 'string' && event.sessionId.trim()
            ? event.sessionId.trim()
            : null,
          origin: normalizeExecutionOrigin({
            origin: event.origin,
            turnId: typeof event.turnId === 'string' && event.turnId.trim()
              ? event.turnId.trim()
              : null,
          }),
          channel: normalizeExecutionChannel(event.channel),
          kind,
          threadStatus: event.threadStatus
            ? normalizeTaskThreadStatus(event.threadStatus)
            : null,
          payloadJson: event.payload && typeof event.payload === 'object'
            ? JSON.stringify(event.payload)
            : null,
          createdAt: Number.isFinite(event.createdAt)
            ? Math.max(0, Math.floor(Number(event.createdAt)))
            : now(),
        }
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event))

    if (normalized.length === 0)
      return

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await runInTransaction(database, async () => {
        const insertedEvents: typeof normalized = []
        for (const event of normalized) {
          const insert = await run(
            database,
            `
            INSERT OR IGNORE INTO executor_events (
              id,
              thread_id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              channel,
              kind,
              thread_status,
              payload_json,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              event.id,
              event.threadId,
              event.decisionTraceId,
              event.turnId,
              event.sessionId,
              event.origin,
              event.channel,
              event.kind,
              event.threadStatus,
              event.payloadJson,
              event.createdAt,
            ],
          )
          if (insert.changes > 0)
            insertedEvents.push(event)
        }

        const projectionByThread = new Map<string, {
          activityAt: number
          statusEvent: (typeof normalized)[number]
        }>()
        for (const event of insertedEvents) {
          const current = projectionByThread.get(event.threadId)
          if (!current) {
            projectionByThread.set(event.threadId, {
              activityAt: event.createdAt,
              statusEvent: event,
            })
            continue
          }

          current.activityAt = Math.max(current.activityAt, event.createdAt)
          if (shouldReplaceTaskThreadProjection({
            existingStatus: current.statusEvent.threadStatus,
            existingCreatedAt: current.statusEvent.createdAt,
            nextStatus: event.threadStatus,
            nextCreatedAt: event.createdAt,
          })) {
            current.statusEvent = event
          }
        }

        for (const projection of projectionByThread.values()) {
          const { activityAt, statusEvent } = projection
          const completedAt = statusEvent.threadStatus === 'completed'
            || statusEvent.threadStatus === 'failed'
            || statusEvent.threadStatus === 'cancelled'
            || statusEvent.threadStatus === 'blocked'
            || statusEvent.threadStatus === 'dead-lettered'
            ? statusEvent.createdAt
            : null
          await run(
            database,
            `
            UPDATE task_threads
            SET updated_at = MAX(updated_at, ?),
                last_event_at = CASE
                  WHEN last_event_at IS NULL OR last_event_at < ? THEN ?
                  ELSE last_event_at
                END,
                status = COALESCE(?, status),
                completed_at = COALESCE(?, completed_at)
            WHERE id = ?
              AND status NOT IN ('blocked', 'completed', 'failed', 'cancelled', 'dead-lettered')
              AND (
                ? IN ('blocked', 'completed', 'failed', 'cancelled', 'dead-lettered')
                OR last_event_at IS NULL
                OR last_event_at <= ?
              )
            `,
            [
              activityAt,
              activityAt,
              activityAt,
              statusEvent.threadStatus,
              completedAt,
              statusEvent.threadId,
              statusEvent.threadStatus,
              activityAt,
            ],
          )
        }
      })
    }, options)
  }

  async function listExecutionEvents(input?: AlicizationListExecutionEventsInput) {
    const threadId = typeof input?.threadId === 'string'
      ? input.threadId.trim()
      : ''
    const decisionTraceId = typeof input?.decisionTraceId === 'string'
      ? input.decisionTraceId.trim()
      : ''
    const turnId = typeof input?.turnId === 'string'
      ? input.turnId.trim()
      : ''
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 300)))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (threadId) {
      whereClauses.push('thread_id = ?')
      params.push(threadId)
    }
    if (decisionTraceId) {
      whereClauses.push('decision_trace_id = ?')
      params.push(decisionTraceId)
    }
    if (turnId) {
      whereClauses.push('turn_id = ?')
      params.push(turnId)
    }

    const rows = await all<DbExecutionEventRow>(
      database,
      `
      SELECT
        id,
        thread_id,
        decision_trace_id,
        turn_id,
        session_id,
        origin,
        channel,
        kind,
        thread_status,
        payload_json,
        created_at
      FROM executor_events
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return [...rows].reverse().map(mapExecutionEventRow)
  }

  async function clearConversationData() {
    await enqueueWrite(async () => await runInTransaction(database, async () => {
      const deleteCardScoped = async (tableName: string) => {
        await run(
          database,
          hasBoundCardScope
            ? `DELETE FROM ${tableName} WHERE card_id = ?`
            : `DELETE FROM ${tableName}`,
          hasBoundCardScope ? [boundCardId] : [],
        )
      }

      await deleteCardScoped('memory_facts')
      await deleteCardScoped('memory_archive')
      await deleteCardScoped('long_term_memory_tombstones')
      await deleteCardScoped('long_term_memory_policy_overrides')
      await deleteCardScoped('long_term_memory_vectors')
      await deleteCardScoped('memory_quality_gold_labels')
      await deleteCardScoped('memory_quality_monthly_gold_packs')
      await deleteCardScoped('persona_training_candidate_reviews')
      await deleteCardScoped('persona_training_runs')
      await deleteCardScoped('persona_training_increments')
      await deleteCardScoped('memory_reflections')
      await deleteCardScoped('relationship_outcomes')
      await deleteCardScoped('person_state_evolution_log')
      await deleteCardScoped('episodic_events')
      await deleteCardScoped('event_graph_edges')
      await deleteCardScoped('event_graph_nodes')
      await deleteCardScoped('memory_consolidations')
      await deleteCardScoped('persona_reinforcement_events')
      await deleteCardScoped('working_memory_long_term_transactions')
      await deleteCardScoped('working_memory_checkpoints')
      await deleteCardScoped('learning_tasks')
      await deleteCardScoped('long_term_memory_search_documents')
      await deleteCardScoped('long_term_memory_search_documents_fts')

      await run(database, 'DELETE FROM episodic_reconsolidation_overlays WHERE event_id NOT IN (SELECT id FROM episodic_events)')
      await deleteCardScoped('conversation_turns')
      await run(database, 'DELETE FROM mind_turn_events')
      await run(database, 'DELETE FROM task_threads')
      await run(database, 'DELETE FROM executor_sessions')
      await run(database, 'DELETE FROM executor_events')
      await run(database, 'DELETE FROM scheduled_tasks')
      await run(database, 'DELETE FROM memory_ingest_journal')
      await run(database, 'DELETE FROM alicization_meta WHERE key LIKE ?', ['mind-head:%'])
    }))
  }

  async function insertScheduledTask(input: {
    taskId: string
    triggerAt: number
    message: string
    sourceTurnId?: string
  }) {
    const taskId = input.taskId.trim()
    const message = input.message.trim()
    if (!taskId)
      throw new Error('taskId is required')
    if (!message)
      throw new Error('message is required')

    const createdAt = now()
    const triggerAt = Number.isFinite(input.triggerAt) ? Math.floor(input.triggerAt) : createdAt
    const id = randomUUID()
    const sourceTurnId = input.sourceTurnId?.trim() || null
    await enqueueWrite(async () => {
      await run(
        database,
        `
        INSERT INTO scheduled_tasks (
          id,
          task_id,
          trigger_at,
          message,
          status,
          created_at,
          source_turn_id
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?)
        `,
        [id, taskId, triggerAt, message, createdAt, sourceTurnId],
      )
    })

    return {
      id,
      taskId,
      triggerAt,
      message,
      status: 'pending',
      createdAt,
      claimedAt: null,
      completedAt: null,
      sourceTurnId,
      firedTurnId: null,
      lastError: null,
    } satisfies AlicizationScheduledTaskRecord
  }

  async function claimDueScheduledTasks(nowMs: number, limit: number) {
    const safeNow = Number.isFinite(nowMs) ? Math.floor(nowMs) : now()
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)))
    return await enqueueWrite(async () => await runInTransaction(database, async () => {
      const dueRows = await all<DbScheduledTaskRow>(
        database,
        `
        SELECT *
        FROM scheduled_tasks
        WHERE status = 'pending'
          AND trigger_at <= ?
        ORDER BY trigger_at ASC
        LIMIT ?
        `,
        [safeNow, safeLimit],
      )
      const claimed: AlicizationScheduledTaskRecord[] = []
      for (const row of dueRows) {
        const claimAt = now()
        const result = await run(
          database,
          `
          UPDATE scheduled_tasks
          SET status = 'running',
              claimed_at = ?,
              last_error = NULL
          WHERE id = ?
            AND status = 'pending'
          `,
          [claimAt, row.id],
        )
        if (result.changes < 1)
          continue

        claimed.push({
          ...mapScheduledTaskRow(row),
          status: 'running',
          claimedAt: claimAt,
          lastError: null,
        })
      }
      return claimed
    }))
  }

  async function completeScheduledTask(taskIdRaw: string, firedTurnIdRaw: string, completedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    const firedTurnId = firedTurnIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    if (!firedTurnId)
      throw new Error('firedTurnId is required')
    const completedAt = typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
      ? Math.floor(completedAtRaw)
      : now()

    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE scheduled_tasks
        SET status = 'completed',
            fired_turn_id = ?,
            completed_at = ?,
            last_error = NULL
        WHERE task_id = ?
        `,
        [firedTurnId, completedAt, taskId],
      )
    })
  }

  async function requeueScheduledTask(taskIdRaw: string, reasonRaw?: string, nextTriggerAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const reason = reasonRaw?.trim() || null
    const nextTriggerAt = Number.isFinite(nextTriggerAtRaw)
      ? Math.max(0, Math.floor(Number(nextTriggerAtRaw)))
      : null

    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE scheduled_tasks
        SET status = 'pending',
            trigger_at = COALESCE(?, trigger_at),
            claimed_at = NULL,
            completed_at = NULL,
            fired_turn_id = NULL,
            last_error = ?
        WHERE task_id = ?
        `,
        [nextTriggerAt, reason, taskId],
      )
    })
  }

  async function failScheduledTask(taskIdRaw: string, errorRaw: string, completedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const message = errorRaw.trim() || 'unknown reminder error'
    const completedAt = typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
      ? Math.floor(completedAtRaw)
      : now()

    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE scheduled_tasks
        SET status = 'failed',
            completed_at = ?,
            last_error = ?
        WHERE task_id = ?
        `,
        [completedAt, message, taskId],
      )
    })
  }

  async function listPendingScheduledTasks(limit = 200) {
    const safeLimit = Math.max(1, Math.min(2000, Math.floor(limit)))
    const rows = await all<DbScheduledTaskRow>(
      database,
      `
      SELECT *
      FROM scheduled_tasks
      WHERE status = 'pending'
      ORDER BY trigger_at ASC
      LIMIT ?
      `,
      [safeLimit],
    )
    return rows.map(mapScheduledTaskRow)
  }

  async function insertLearningTask(input: {
    cardId: string
    taskId: string
    triggerAt: number
    action: AlicizationLearningAction
    message: string
    payload: AlicizationLearningTaskPayload
    maxAttempts?: number
  }, options?: DbWriteOptions) {
    const cardId = input.cardId.trim()
    const taskId = input.taskId.trim()
    const triggerAt = Math.max(0, Math.floor(input.triggerAt))
    const message = input.message.trim()
    if (!cardId)
      throw new Error('cardId is required')
    if (!taskId)
      throw new Error('taskId is required')
    if (!message)
      throw new Error('message is required')

    const maxAttempts = Math.max(1, Math.min(8, Math.floor(input.maxAttempts ?? 3)))
    const payloadJson = JSON.stringify(input.payload)
    return await enqueueWrite(async () => {
      const existing = await get<DbLearningTaskRow>(
        database,
        `
        SELECT *
        FROM learning_tasks
        WHERE card_id = ?
          AND task_id = ?
        LIMIT 1
        `,
        [cardId, taskId],
      )
      if (existing)
        return mapLearningTaskRow(existing)

      const id = randomUUID()
      const createdAt = now()
      const updatedAt = createdAt
      await run(
        database,
        `
        INSERT INTO learning_tasks (
          id,
          card_id,
          task_id,
          status,
          trigger_at,
          action,
          message,
          payload_json,
          attempt_count,
          max_attempts,
          created_at,
          updated_at,
          source_turn_id
        ) VALUES (?, ?, ?, 'scheduled', ?, ?, ?, ?, 0, ?, ?, ?, ?)
        `,
        [
          id,
          cardId,
          taskId,
          triggerAt,
          input.action,
          message,
          payloadJson,
          maxAttempts,
          createdAt,
          updatedAt,
          input.payload.sourceTurnId,
        ],
      )

      return mapLearningTaskRow({
        id,
        card_id: cardId,
        task_id: taskId,
        status: 'scheduled',
        trigger_at: triggerAt,
        action: input.action,
        message,
        payload_json: payloadJson,
        attempt_count: 0,
        max_attempts: maxAttempts,
        created_at: createdAt,
        updated_at: updatedAt,
        claimed_at: null,
        started_at: null,
        completed_at: null,
        blocked_at: null,
        cancelled_at: null,
        downgraded_at: null,
        reopened_at: null,
        next_retry_at: null,
        source_turn_id: input.payload.sourceTurnId,
        result_summary: null,
        failure_kind: null,
        last_error: null,
        fired_turn_id: null,
      })
    }, options)
  }

  async function claimDueLearningTasks(cardIdRaw: string, nowMs: number, limit: number) {
    const cardId = cardIdRaw.trim()
    if (!cardId)
      throw new Error('cardId is required')
    const safeNow = Number.isFinite(nowMs) ? Math.floor(nowMs) : now()
    const safeLimit = Math.max(1, Math.min(64, Math.floor(limit)))
    return await enqueueWrite(async () => await runInTransaction(database, async () => {
      const dueRows = await all<DbLearningTaskRow>(
        database,
        `
        SELECT *
        FROM learning_tasks
        WHERE card_id = ?
          AND status IN ('scheduled', 'reopened')
          AND trigger_at <= ?
        ORDER BY trigger_at ASC
        LIMIT ?
        `,
        [cardId, safeNow, safeLimit],
      )
      const claimed: AlicizationLearningTaskRecord[] = []
      for (const row of dueRows) {
        const claimedAt = now()
        const result = await run(
          database,
          `
          UPDATE learning_tasks
          SET status = 'claimed',
              claimed_at = ?,
              updated_at = ?,
              last_error = NULL,
              failure_kind = NULL
          WHERE id = ?
            AND status IN ('scheduled', 'reopened')
          `,
          [claimedAt, claimedAt, row.id],
        ) as SqliteStatementResult
        if (result.changes < 1)
          continue
        claimed.push(mapLearningTaskRow({
          ...row,
          status: 'claimed',
          claimed_at: claimedAt,
          updated_at: claimedAt,
          last_error: null,
          failure_kind: null,
        }))
      }
      return claimed
    }))
  }

  async function startLearningTask(taskIdRaw: string, startedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const startedAt = Number.isFinite(startedAtRaw) ? Math.max(0, Math.floor(Number(startedAtRaw))) : now()
    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE learning_tasks
        SET status = 'running',
            started_at = ?,
            updated_at = ?,
            attempt_count = attempt_count + 1
        WHERE task_id = ?
          AND status = 'claimed'
        `,
        [startedAt, startedAt, taskId],
      )
    })
  }

  async function blockLearningTask(taskIdRaw: string, input: {
    reason: string
    resultSummary?: string | null
    failureKind?: AlicizationLearningTaskFailureKind | null
    nextRetryAt?: number | null
  }, updatedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const updatedAt = Number.isFinite(updatedAtRaw) ? Math.max(0, Math.floor(Number(updatedAtRaw))) : now()
    const reason = input.reason.trim() || 'blocked'
    const resultSummary = input.resultSummary?.trim() || null
    const nextRetryAt = Number.isFinite(input.nextRetryAt) ? Math.max(0, Math.floor(Number(input.nextRetryAt))) : null
    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE learning_tasks
        SET status = 'blocked',
            blocked_at = ?,
            updated_at = ?,
            next_retry_at = ?,
            failure_kind = ?,
            last_error = ?,
            result_summary = ?
        WHERE task_id = ?
        `,
        [updatedAt, updatedAt, nextRetryAt, input.failureKind ?? null, reason, resultSummary, taskId],
      )
    })
  }

  async function completeLearningTask(taskIdRaw: string, input: {
    firedTurnId?: string | null
    resultSummary?: string | null
  }, completedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const completedAt = Number.isFinite(completedAtRaw) ? Math.max(0, Math.floor(Number(completedAtRaw))) : now()
    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE learning_tasks
        SET status = 'completed',
            completed_at = ?,
            updated_at = ?,
            fired_turn_id = ?,
            result_summary = ?,
            last_error = NULL,
            failure_kind = NULL,
            next_retry_at = NULL
        WHERE task_id = ?
        `,
        [completedAt, completedAt, input.firedTurnId?.trim() || null, input.resultSummary?.trim() || null, taskId],
      )
    })
  }

  async function failLearningTask(taskIdRaw: string, input: {
    error: string
    failureKind: AlicizationLearningTaskFailureKind
    nextRetryAt?: number | null
  }, updatedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const updatedAt = Number.isFinite(updatedAtRaw) ? Math.max(0, Math.floor(Number(updatedAtRaw))) : now()
    const error = input.error.trim() || 'unknown learning execution failure'
    const nextRetryAt = Number.isFinite(input.nextRetryAt) ? Math.max(0, Math.floor(Number(input.nextRetryAt))) : null
    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE learning_tasks
        SET status = 'failed',
            completed_at = ?,
            updated_at = ?,
            next_retry_at = ?,
            failure_kind = ?,
            last_error = ?
        WHERE task_id = ?
        `,
        [updatedAt, updatedAt, nextRetryAt, input.failureKind, error, taskId],
      )
    })
  }

  async function reopenLearningTask(taskIdRaw: string, input?: {
    reason?: string | null
    triggerAt?: number | null
  }, updatedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const updatedAt = Number.isFinite(updatedAtRaw) ? Math.max(0, Math.floor(Number(updatedAtRaw))) : now()
    const triggerAt = Number.isFinite(input?.triggerAt) ? Math.max(0, Math.floor(Number(input?.triggerAt))) : updatedAt
    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE learning_tasks
        SET status = 'reopened',
            reopened_at = ?,
            updated_at = ?,
            trigger_at = ?,
            claimed_at = NULL,
            started_at = NULL,
            completed_at = NULL,
            blocked_at = NULL,
            last_error = ?,
            failure_kind = NULL
        WHERE task_id = ?
        `,
        [updatedAt, updatedAt, triggerAt, input?.reason?.trim() || null, taskId],
      )
    })
  }

  async function downgradeLearningTask(taskIdRaw: string, input?: {
    reason?: string | null
  }, updatedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const updatedAt = Number.isFinite(updatedAtRaw) ? Math.max(0, Math.floor(Number(updatedAtRaw))) : now()
    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE learning_tasks
        SET status = 'downgraded',
            downgraded_at = ?,
            updated_at = ?,
            last_error = ?
        WHERE task_id = ?
        `,
        [updatedAt, updatedAt, input?.reason?.trim() || null, taskId],
      )
    })
  }

  async function cancelLearningTask(taskIdRaw: string, input?: {
    reason?: string | null
  }, updatedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const updatedAt = Number.isFinite(updatedAtRaw) ? Math.max(0, Math.floor(Number(updatedAtRaw))) : now()
    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE learning_tasks
        SET status = 'cancelled',
            cancelled_at = ?,
            updated_at = ?,
            last_error = ?
        WHERE task_id = ?
        `,
        [updatedAt, updatedAt, input?.reason?.trim() || null, taskId],
      )
    })
  }

  async function listLearningTasks(input: {
    cardId: string
    limit?: number
    statuses?: AlicizationLearningTaskStatus[]
  }) {
    const cardId = input.cardId.trim()
    if (!cardId)
      throw new Error('cardId is required')
    const safeLimit = Math.max(1, Math.min(128, Math.floor(input.limit ?? 24)))
    const statuses = (input.statuses ?? []).filter(Boolean)
    const where = ['card_id = ?']
    const params: unknown[] = [cardId]
    if (statuses.length > 0) {
      where.push(`status IN (${statuses.map(() => '?').join(', ')})`)
      params.push(...statuses)
    }
    params.push(safeLimit)
    const rows = await all<DbLearningTaskRow>(
      database,
      `
      SELECT *
      FROM learning_tasks
      WHERE ${where.join(' AND ')}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT ?
      `,
      params,
    )
    return rows.map(mapLearningTaskRow)
  }

  async function getLatestLearningExecutionState(cardIdRaw: string) {
    const cardId = cardIdRaw.trim()
    if (!cardId)
      throw new Error('cardId is required')
    const tasks = await listLearningTasks({
      cardId,
      limit: 12,
    }).catch(() => [])
    if (tasks.length === 0)
      return null

    const current = tasks.find(task => task.status === 'running' || task.status === 'claimed' || task.status === 'blocked' || task.status === 'scheduled' || task.status === 'reopened') ?? tasks[0]
    const lastCompleted = tasks.find(task => task.status === 'completed') ?? null
    const lastFailure = tasks.find(task => task.status === 'failed' || task.status === 'blocked' || task.status === 'downgraded') ?? null
    const action = current?.action ?? null
    return {
      currentTaskId: current?.taskId ?? null,
      currentStatus: current?.status ?? null,
      currentAttemptCount: current?.attemptCount ?? 0,
      currentMaxAttempts: current?.maxAttempts ?? 0,
      currentNextRetryAt: current?.nextRetryAt ?? null,
      currentBlockedReason: current?.status === 'blocked' ? current.lastError : null,
      currentFailureKind: current?.failureKind ?? null,
      nextLearningAction: action ?? null,
      shouldRecord: action === 'record',
      shouldReflect: action === 'reflect',
      shouldVerify: action === 'verify',
      shouldRevise: action === 'revise',
      shouldInternalize: action === 'internalize',
      activeLearningFocuses: current?.payload.focuses ?? [],
      queuedTaskCount: tasks.filter(task => task.status === 'scheduled' || task.status === 'reopened' || task.status === 'claimed').length,
      runningTaskCount: tasks.filter(task => task.status === 'running').length,
      blockedTaskCount: tasks.filter(task => task.status === 'blocked').length,
      recentTaskIds: tasks.map(task => task.taskId).slice(0, 6),
      lastCompletedTaskId: lastCompleted?.taskId ?? null,
      lastCompletedAction: lastCompleted?.action ?? null,
      lastCompletedSummary: lastCompleted?.resultSummary ?? null,
      lastFailureTaskId: lastFailure?.taskId ?? null,
      lastFailureKind: lastFailure?.failureKind ?? null,
      lastFailureReason: lastFailure?.lastError ?? null,
      lastFailureNextRetryAt: lastFailure?.nextRetryAt ?? null,
      updatedAt: current?.updatedAt ?? lastCompleted?.updatedAt ?? lastFailure?.updatedAt ?? null,
    } satisfies AlicizationLearningExecutionStateSnapshot
  }

  async function upsertMemoryFacts(facts: AlicizationMemoryFactInput[], source: AlicizationMemorySource) {
    const cardId = boundCardId
    if (facts.length === 0)
      return

    const normalizedFacts = facts
      .map((fact) => {
        const subject = fact.subject.trim()
        const predicate = fact.predicate.trim()
        const object = fact.object.trim()
        if (!subject || !predicate || !object)
          return null

        return {
          id: randomUUID(),
          cardId,
          subject,
          predicate,
          object,
          confidence: clamp01(fact.confidence),
          source,
          dedupeKey: buildDedupeKey(subject, predicate, object),
          createdAt: now(),
          updatedAt: now(),
          knowledgeStage: normalizeKnowledgeStage(fact.knowledgeStage),
          validationStatus: normalizeValidationStatus(fact.validationStatus),
          memoryDomain: fact.memoryDomain
            ? normalizeMemoryDomain(fact.memoryDomain)
            : inferMemoryDomainFromFact({
                subject,
                predicate,
                object,
              }),
          validationCount: Math.max(0, Math.floor(Number(fact.validationCount ?? 0))),
          contradictionCount: Math.max(0, Math.floor(Number(fact.contradictionCount ?? 0))),
          sourceLabel: typeof fact.sourceLabel === 'string' && fact.sourceLabel.trim()
            ? fact.sourceLabel.trim().slice(0, 160)
            : null,
          conflictsWithJson: JSON.stringify(
            (fact.conflictsWith ?? [])
              .map(item => typeof item === 'string' ? item.trim() : '')
              .filter(Boolean)
              .slice(0, 16),
          ),
          supersedesJson: JSON.stringify(
            (fact.supersedes ?? [])
              .map(item => typeof item === 'string' ? item.trim() : '')
              .filter(Boolean)
              .slice(0, 16),
          ),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (normalizedFacts.length === 0)
      return

    await enqueueWrite(async () => {
      await appendMemoryIngestEntries([{
        operationKind: 'upsert-memory-facts',
        payload: {
          kind: 'upsert-memory-facts',
          facts: normalizedFacts,
        },
      }])
      await drainMemoryIngestJournal()
    })
    await rebuildLongTermMemorySearchIndexForCard(cardId, 'memory fact search index rebuild')
  }

  async function retrieveMemoryFacts(query: string, limit = 6) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery)
      return []

    const retrievalStartedAt = now()
    const scopeClause = hasBoundCardScope ? 'WHERE card_id = ?' : ''
    const rows = await all<DbMemoryFactRow>(
      database,
      `SELECT * FROM memory_facts ${scopeClause}`,
      hasBoundCardScope ? [boundCardId] : [],
    )
    if (rows.length === 0) {
      await recordMemorySemanticRetrievalLatency(now() - retrievalStartedAt)
      return []
    }

    const facts = rows.map(mapFactRow)
    const currentTs = now()
    const ranked = rankAlicizationMemoryFacts({
      facts,
      query: normalizedQuery,
      limit,
      currentTs,
    })

    if (ranked.length === 0) {
      await recordMemorySemanticRetrievalLatency(now() - retrievalStartedAt)
      return []
    }

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const item of ranked) {
          await run(
            database,
            `
            UPDATE memory_facts
            SET access_count = access_count + 1,
                last_access_at = ?
            WHERE ${hasBoundCardScope ? 'card_id = ? AND ' : ''}id = ?
            `,
            hasBoundCardScope ? [currentTs, boundCardId, item.fact.id] : [currentTs, item.fact.id],
          )
        }
      })
    })
    await recordMemorySemanticRetrievalLatency(now() - retrievalStartedAt)

    return ranked.map(item => item.fact)
  }

  async function applyMemoryFactCorrections(corrections: AlicizationKnowledgeAssimilationCorrection[]) {
    const normalizedCorrections = corrections
      .map((correction) => {
        const targetFactId = correction.targetFactId.trim()
        if (!targetFactId)
          return null
        return {
          targetFactId,
          nextValidationStatus: normalizeValidationStatus(correction.nextValidationStatus),
          nextKnowledgeStage: correction.nextKnowledgeStage ? normalizeKnowledgeStage(correction.nextKnowledgeStage) : null,
          sourceLabel: typeof correction.sourceLabel === 'string' && correction.sourceLabel.trim()
            ? correction.sourceLabel.trim().slice(0, 160)
            : null,
          appendConflictsWith: normalizeStringArray(correction.appendConflictsWith, 16),
          appendSupersedes: normalizeStringArray(correction.appendSupersedes, 16),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (normalizedCorrections.length === 0)
      return

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const correction of normalizedCorrections) {
          const row = await get<DbMemoryFactRow>(
            database,
            `SELECT * FROM memory_facts WHERE ${hasBoundCardScope ? 'card_id = ? AND ' : ''}id = ?`,
            hasBoundCardScope ? [boundCardId, correction.targetFactId] : [correction.targetFactId],
          )
          if (!row)
            continue

          const mergedConflictsWith = JSON.stringify([
            ...new Set([
              ...parseStringArray(row.conflicts_with_json),
              ...correction.appendConflictsWith,
            ]),
          ])
          const mergedSupersedes = JSON.stringify([
            ...new Set([
              ...parseStringArray(row.supersedes_json),
              ...correction.appendSupersedes,
            ]),
          ])

          await run(
            database,
            `
            UPDATE memory_facts
            SET validation_status = ?,
                knowledge_stage = COALESCE(?, knowledge_stage),
                source_label = COALESCE(?, source_label),
                validation_count = CASE
                  WHEN ? = 'validated' THEN validation_count + 1
                  ELSE validation_count
                END,
                contradiction_count = CASE
                  WHEN ? = 'superseded' THEN contradiction_count + 1
                  ELSE contradiction_count
                END,
                conflicts_with_json = ?,
                supersedes_json = ?,
                updated_at = ?
            WHERE ${hasBoundCardScope ? 'card_id = ? AND ' : ''}id = ?
            `,
            [
              correction.nextValidationStatus,
              correction.nextKnowledgeStage,
              correction.sourceLabel,
              correction.nextValidationStatus,
              correction.nextValidationStatus,
              mergedConflictsWith,
              mergedSupersedes,
              now(),
              ...(hasBoundCardScope ? [boundCardId] : []),
              correction.targetFactId,
            ],
          )
        }
      })
    })
    await rebuildLongTermMemorySearchIndexForCard(boundCardId, 'memory fact correction search index rebuild')
  }

  async function listMemoryFacts() {
    const scopeClause = hasBoundCardScope ? 'WHERE card_id = ?' : ''
    const rows = await all<DbMemoryFactRow>(
      database,
      `SELECT * FROM memory_facts ${scopeClause} ORDER BY updated_at DESC, id ASC`,
      hasBoundCardScope ? [boundCardId] : [],
    )
    return rows.map(mapFactRow)
  }

  function normalizeDerivedMemoryReferences(raw: AlicizationEpisodicEventInput['derivedFrom']) {
    const result: AlicizationDerivedMemoryReference[] = []
    for (const item of raw ?? []) {
      const kind = typeof item?.kind === 'string' ? item.kind.trim() : ''
      if (!kind)
        continue
      result.push({
        kind: kind as AlicizationDerivedMemoryReference['kind'],
        id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : null,
        label: normalizeOrganicMemoryText(item?.label, 160) || null,
      })
    }
    return result
  }

  function mapPreparedEventToEventGraphSource(event: PreparedEpisodicEventWrite) {
    return {
      id: event.id,
      cardId: event.cardId,
      decisionTraceId: event.decisionTraceId,
      turnId: event.turnId,
      sourceKind: event.sourceKind,
      provenance: event.provenance,
      occurredAt: event.occurredAt,
      whereSummary: event.whereSummary,
      withWhom: parseJsonStringArray(event.withWhomJson),
      threadAnchor: event.threadAnchor,
      whatHappened: event.whatHappened,
      felt: event.felt,
      emotionTags: parseJsonStringArray(event.emotionTagsJson),
      whatChanged: event.whatChanged,
      relationshipMeaning: event.relationshipMeaning,
      lesson: event.lesson,
      sourceSummary: event.sourceSummary,
      confidence: event.confidence,
      salience: event.salience,
      sceneAttachment: event.sceneAttachment,
      relationshipShift: parseJsonObject(event.relationshipShiftJson) as AlicizationEpisodicEventRecord['relationshipShift'],
      derivedFrom: mapDerivedMemoryReferences(event.derivedFromJson),
      tags: parseJsonStringArray(event.tagsJson),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }
  }

  async function appendEpisodicEvents(events: AlicizationEpisodicEventInput[]) {
    if (events.length === 0)
      return []

    const prepared = events
      .map((event) => {
        const cardId = hasBoundCardScope
          ? resolveMemoryCardId(event.cardId, 'episodic event write')
          : event.cardId.trim()
        const whatHappened = normalizeOrganicMemoryText(event.whatHappened, 320)
        if (!cardId || !whatHappened)
          return null
        const occurredAt = Number.isFinite(event.occurredAt) ? Math.max(0, Math.floor(Number(event.occurredAt))) : now()
        const createdAt = Number.isFinite(event.createdAt) ? Math.max(0, Math.floor(Number(event.createdAt))) : occurredAt
        const updatedAt = Number.isFinite(event.updatedAt) ? Math.max(0, Math.floor(Number(event.updatedAt))) : createdAt
        const provenance = normalizeAlicizationMemoryProvenance(event.provenance, 'remembered')
        const relationshipShift = event.relationshipShift
          ? {
              closenessDelta: clampRelationshipDelta(Number(event.relationshipShift.closenessDelta ?? 0), 0.24),
              trustDelta: clampRelationshipDelta(Number(event.relationshipShift.trustDelta ?? 0), 0.24),
              burdenDelta: clampRelationshipDelta(Number(event.relationshipShift.burdenDelta ?? 0), 0.24),
              boundaryDelta: clampRelationshipDelta(Number(event.relationshipShift.boundaryDelta ?? 0), 0.24),
              misreadDelta: clampRelationshipDelta(Number(event.relationshipShift.misreadDelta ?? 0), 0.24),
              repairDelta: clampRelationshipDelta(Number(event.relationshipShift.repairDelta ?? 0), 0.24),
              openLoopDelta: clampRelationshipDelta(Number(event.relationshipShift.openLoopDelta ?? 0), 0.24),
            }
          : null

        return {
          id: event.id?.trim() || randomUUID(),
          cardId,
          decisionTraceId: event.decisionTraceId?.trim() || null,
          turnId: event.turnId?.trim() || null,
          sessionId: event.sessionId?.trim() || null,
          sourceKind: event.sourceKind,
          provenance,
          occurredAt,
          whereSummary: normalizeOrganicMemoryText(event.whereSummary, 200) || null,
          withWhomJson: JSON.stringify((event.withWhom ?? []).map(item => normalizeOrganicMemoryText(item, 80)).filter(Boolean)),
          threadAnchor: normalizeOrganicMemoryText(event.threadAnchor, 180) || null,
          whatHappened,
          felt: normalizeOrganicMemoryText(event.felt, 220) || null,
          emotionTagsJson: JSON.stringify((event.emotionTags ?? []).map(item => normalizeOrganicMemoryText(item, 48)).filter(Boolean)),
          whatChanged: normalizeOrganicMemoryText(event.whatChanged, 220) || null,
          relationshipMeaning: normalizeOrganicMemoryText(event.relationshipMeaning, 220) || null,
          lesson: normalizeOrganicMemoryText(event.lesson, 220) || null,
          sourceSummary: normalizeOrganicMemoryText(event.sourceSummary, 180) || null,
          confidence: clamp01(event.confidence),
          salience: clamp01(Number(event.salience ?? 0.56)),
          sceneAttachment: clamp01(Number(event.sceneAttachment ?? 0.18)),
          consolidationPriority: clamp01(Number(event.consolidationPriority ?? 0.22)),
          relationshipShiftJson: relationshipShift ? JSON.stringify(relationshipShift) : null,
          derivedFromJson: JSON.stringify(normalizeDerivedMemoryReferences(event.derivedFrom)),
          tagsJson: JSON.stringify((event.tags ?? []).map(item => normalizeOrganicMemoryText(item, 64)).filter(Boolean)),
          createdAt,
          updatedAt,
        }
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event))

    if (prepared.length === 0)
      return []

    await enqueueWrite(async () => {
      await appendMemoryIngestEntries([{
        operationKind: 'append-episodic-events',
        payload: {
          kind: 'append-episodic-events',
          events: prepared,
        },
      }])
      await drainMemoryIngestJournal()
    })
    await rebuildLongTermMemorySearchIndexForCards(
      prepared.map(event => event.cardId),
      'episodic event search index rebuild',
    )

    return prepared.map(event => mapEpisodicEventRow({
      id: event.id,
      card_id: event.cardId,
      decision_trace_id: event.decisionTraceId,
      turn_id: event.turnId,
      session_id: event.sessionId,
      source_kind: event.sourceKind,
      provenance: event.provenance,
      occurred_at: event.occurredAt,
      where_summary: event.whereSummary,
      with_whom_json: event.withWhomJson,
      thread_anchor: event.threadAnchor,
      what_happened: event.whatHappened,
      felt: event.felt,
      emotion_tags_json: event.emotionTagsJson,
      what_changed: event.whatChanged,
      relationship_meaning: event.relationshipMeaning,
      lesson: event.lesson,
      source_summary: event.sourceSummary,
      confidence: event.confidence,
      salience: event.salience,
      scene_attachment: event.sceneAttachment,
      consolidation_priority: event.consolidationPriority,
      relationship_shift_json: event.relationshipShiftJson,
      derived_from_json: event.derivedFromJson,
      tags_json: event.tagsJson,
      created_at: event.createdAt,
      updated_at: event.updatedAt,
      last_recalled_at: null,
      recall_count: 0,
      reconsolidation_count: 0,
      latest_reconsolidation_json: null,
    }))
  }

  async function listRecentEpisodicEvents(limit = 12) {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)))
    const rows = await all<DbEpisodicEventRow>(
      database,
      `
      SELECT *
      FROM episodic_events
      ${hasBoundCardScope ? 'WHERE card_id = ?' : ''}
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT ?
      `,
      hasBoundCardScope ? [boundCardId, safeLimit] : [safeLimit],
    )
    const overlayByEventId = await loadLatestEpisodicReconsolidationOverlayByEventId(
      database,
      all,
      rows.map(row => row.id),
    )
    return rows.map((row) => {
      const overlay = overlayByEventId.get(row.id)
      return mapEpisodicEventRow(row, overlay
        ? {
            latest: overlay.latest ? mapEpisodicReconsolidationOverlayRow(overlay.latest) : null,
            count: overlay.count,
          }
        : null)
    })
  }

  async function persistEpisodicReconsolidations(events: AlicizationEpisodicEventRecord[]) {
    if (events.length === 0)
      return

    await memoryEpisodicReconsolidationRuntime.persistRecalledEvents(events)
  }

  async function listEventGraphNeighborhood(input: {
    eventIds?: string[]
    nodeIds?: string[]
    limit?: number
  }) {
    return await memoryEventGraphRuntime.listEventGraphNeighborhood(input)
  }

  const memoryEpisodicReconsolidationRuntime = createAlicizationMemoryEpisodicReconsolidationRuntime({
    database,
    run,
    runInTransaction,
  })
  const memoryRelationshipRuntime = createAlicizationMemoryRelationshipRuntime({
    database,
    now,
    randomUUID,
    run,
    get,
    all,
    enqueueWrite,
    runInTransaction,
    clamp01,
    clampRelationshipDelta,
    parseJsonStringArray,
    normalizeOrganicMemoryText,
  })
  const memoryWorkbenchPolicyStore = createMemoryWorkbenchPolicyStoreRuntime({
    database,
    now,
    run,
    all,
    enqueueWrite,
    runInTransaction,
  })
  const longTermMemorySearchIndexRuntime = createLongTermMemorySearchIndexRuntime({
    database,
    run,
    get,
    all,
    enqueueWrite,
    runInTransaction,
  })
  const memoryWorkbenchHealthRuntime = createMemoryWorkbenchHealthRuntime({
    database,
    now,
    randomUUID,
    run,
    all,
    enqueueWrite,
  })
  function parsePersonaTrainingDatasetConsent(raw: string): PersonaTrainingDatasetConsentSnapshot {
    try {
      const parsed = JSON.parse(raw) as Partial<PersonaTrainingDatasetConsentSnapshot>
      return {
        granted: parsed.granted === true,
        policyVersion: typeof parsed.policyVersion === 'string' ? parsed.policyVersion : 'persona-training-consent-v1',
        scope: typeof parsed.scope === 'string' ? parsed.scope : 'persona-dataset',
        capturedAt: Number.isFinite(parsed.capturedAt) ? Number(parsed.capturedAt) : 0,
      }
    }
    catch {
      return {
        granted: false,
        policyVersion: 'persona-training-consent-v1',
        scope: 'persona-dataset',
        capturedAt: 0,
      }
    }
  }
  function parsePersonaTrainingDatasetProvenance(raw: string | null): PersonaTrainingDatasetCleaningProvenance | null {
    const parsed = parseJsonObject(raw)
    if (
      parsed?.kind !== 'working-memory-cleaning'
      || typeof parsed.cleaningTransactionId !== 'string'
      || !parsed.cleaningTransactionId.trim()
      || !Number.isFinite(parsed.cleanedAt)
    ) {
      return null
    }
    return {
      kind: 'working-memory-cleaning',
      cleaningTransactionId: parsed.cleaningTransactionId.trim(),
      cleanedAt: Math.max(0, Math.floor(Number(parsed.cleanedAt))),
    }
  }
  function mapPersonaTrainingDatasetVersionRow(row: {
    id: string
    card_id: string
    version: number
    schema_version: string
    consent_snapshot_json: string
    created_at: number
    exported_at: number | null
    active_at: number | null
    rolled_back_at: number | null
  }): PersonaTrainingDatasetVersion {
    return {
      id: row.id,
      cardId: row.card_id,
      version: row.version,
      schemaVersion: row.schema_version,
      consentSnapshot: parsePersonaTrainingDatasetConsent(row.consent_snapshot_json),
      createdAt: row.created_at,
      exportedAt: row.exported_at,
      activeAt: row.active_at,
      rolledBackAt: row.rolled_back_at,
    }
  }
  function mapPersonaTrainingDatasetExampleRow(row: {
    id: string
    dataset_id: string
    card_id: string
    schema_version: string
    source_id: string
    source_kind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
    content_hash: string
    behavior_lesson: string
    positive_example: string
    negative_example: string | null
    sensitivity: string
    pii_status: 'clear' | 'detected' | 'not-checked'
    pii_reason: string | null
    consent_snapshot_json: string
    provenance_json: string | null
    allow_training: number
    state: 'staged' | 'quarantined' | 'revoked'
    created_at: number
    revoked_at: number | null
  }): PersonaTrainingDatasetExample {
    return {
      id: row.id,
      datasetId: row.dataset_id,
      cardId: row.card_id,
      schemaVersion: row.schema_version,
      sourceId: row.source_id,
      sourceKind: row.source_kind,
      contentHash: row.content_hash,
      behaviorLesson: row.behavior_lesson,
      positiveExample: row.positive_example,
      negativeExample: row.negative_example,
      sensitivity: row.sensitivity,
      piiStatus: row.pii_status,
      piiReason: row.pii_reason,
      consentSnapshot: parsePersonaTrainingDatasetConsent(row.consent_snapshot_json),
      provenance: parsePersonaTrainingDatasetProvenance(row.provenance_json),
      allowTraining: row.allow_training === 1,
      state: row.state,
      createdAt: row.created_at,
      revokedAt: row.revoked_at,
    }
  }
  async function insertPersonaTrainingAuditEvent(event: PersonaTrainingPipelineAuditEvent) {
    await insertAuditLog({
      level: event.action === 'training-failed' ? 'warning' : 'notice',
      category: 'persona-training',
      action: event.action,
      message: `Persona training lifecycle event: ${event.action}.`,
      payload: {
        runId: event.runId,
        incrementId: event.incrementId,
        cardId: event.cardId,
        datasetId: event.datasetId,
        manifestHash: event.manifestHash,
        sourceIds: event.sourceIds,
        reason: event.reason,
      },
      createdAt: event.createdAt,
    })
  }
  async function insertPersonaTrainingArtifactCleanupAudit(input: {
    action:
      | 'training-artifact-cleanup-requested'
      | 'training-artifact-cleanup-completed'
      | 'training-artifact-cleanup-failed'
    intentId: string
    cardId: string
    runId: string
    incrementId: string | null
    artifactId: string
    reason: string
    error: string | null
    attempts: number
    createdAt: number
  }) {
    await insertAuditLog({
      level: input.action === 'training-artifact-cleanup-failed' ? 'warning' : 'notice',
      category: 'persona-training',
      action: input.action,
      message: `Persona training artifact cleanup lifecycle event: ${input.action}.`,
      payload: {
        intentId: input.intentId,
        cardId: input.cardId,
        runId: input.runId,
        incrementId: input.incrementId,
        artifactId: input.artifactId,
        reason: input.reason,
        error: input.error,
        attempts: input.attempts,
      },
      createdAt: input.createdAt,
    })
  }
  interface PersonaTrainingIncrementRow {
    id: string
    run_id: string
    card_id: string
    dataset_id: string
    manifest_hash: string
    source_ids_json: string
    base_persona_revision: string
    artifact_json: string | null
    state: PersonaTrainingPipelineIncrement['state']
    created_at: number
  }
  interface PersonaTrainingArtifactActivationIntentRow {
    id: string
    load_operation_id: string
    mode: PersonaTrainingArtifactActivationIntent['mode']
    card_id: string
    run_id: string
    increment_id: string
    artifact_id: string
    artifact_json: string
    expected_artifact_json: string | null
    loader_receipt_json: string | null
    activated_artifact_json: string | null
    stage: PersonaTrainingArtifactActivationStage
    status: 'pending' | 'completed'
    last_error: string | null
    created_at: number
    updated_at: number
    completed_at: number | null
  }
  interface PersonaTrainingArtifactCleanupIntentRow {
    id: string
    card_id: string
    run_id: string
    increment_id: string | null
    artifact_id: string
    artifact_json: string
    loader_receipt_json: string | null
    unload_operation_id: string | null
    reason: string
    stage: PersonaTrainingArtifactCleanupStage
    finalize_increment_state: Extract<PersonaTrainingPipelineIncrement['state'], 'rolled-back' | 'revoked'> | null
    status: 'pending' | 'completed'
    attempts: number
    last_error: string | null
    created_at: number
    updated_at: number
    completed_at: number | null
  }
  function parsePersonaTrainingArtifactLoaderReceiptSnapshot(
    raw: string | null,
  ): PersonaTrainingArtifactLoaderReceiptSnapshot | null {
    if (!raw)
      return null
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return {
        loaderId: typeof parsed.loaderId === 'string' ? parsed.loaderId : null,
        receiptId: typeof parsed.receiptId === 'string' ? parsed.receiptId : null,
        activatedAt: Number.isSafeInteger(parsed.activatedAt) && Number(parsed.activatedAt) >= 0
          ? Number(parsed.activatedAt)
          : null,
        reason: typeof parsed.reason === 'string' ? parsed.reason : null,
      }
    }
    catch {
      return null
    }
  }
  function personaTrainingArtifactLoaderReceiptSnapshot(
    artifact: AlicizationPersonaTrainingArtifact,
  ): PersonaTrainingArtifactLoaderReceiptSnapshot | null {
    if (artifact.activation.status !== 'active')
      return null
    return {
      loaderId: artifact.activation.loaderId,
      receiptId: artifact.activation.receiptId,
      activatedAt: artifact.activation.activatedAt,
      reason: artifact.activation.reason,
    }
  }
  function mapPersonaTrainingArtifactActivationIntentRow(
    row: PersonaTrainingArtifactActivationIntentRow,
  ): PersonaTrainingArtifactActivationIntent {
    const artifact = requirePersistedPersonaTrainingArtifact(
      row.artifact_json,
      `activation intent ${row.id}`,
      row.run_id,
    )
    if (artifact.artifactId !== row.artifact_id)
      throw new Error('activation intent artifactId does not match persisted owner')
    return {
      id: row.id,
      loadOperationId: row.load_operation_id,
      mode: row.mode,
      cardId: row.card_id,
      runId: row.run_id,
      incrementId: row.increment_id,
      artifactId: row.artifact_id,
      artifact,
      expectedArtifact: parsePersistedPersonaTrainingArtifact(
        row.expected_artifact_json,
        `activation intent ${row.id} expected artifact`,
      ),
      loaderReceipt: parsePersonaTrainingArtifactLoaderReceiptSnapshot(row.loader_receipt_json),
      activatedArtifact: parsePersistedPersonaTrainingArtifact(
        row.activated_artifact_json,
        `activation intent ${row.id} activated artifact`,
      ),
      stage: row.stage,
      status: row.status,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
  function mapPersonaTrainingArtifactCleanupIntentRow(
    row: PersonaTrainingArtifactCleanupIntentRow,
  ): PersonaTrainingArtifactCleanupIntent {
    const artifact = requirePersistedPersonaTrainingArtifact(
      row.artifact_json,
      `cleanup intent ${row.id}`,
      row.run_id,
    )
    if (artifact.artifactId !== row.artifact_id)
      throw new Error('cleanup intent artifactId does not match persisted owner')
    return {
      id: row.id,
      unloadOperationId: row.unload_operation_id?.trim() || `${row.id}:unload`,
      cardId: row.card_id,
      runId: row.run_id,
      incrementId: row.increment_id,
      artifact,
      loaderReceipt: parsePersonaTrainingArtifactLoaderReceiptSnapshot(row.loader_receipt_json)
        ?? personaTrainingArtifactLoaderReceiptSnapshot(artifact),
      reason: row.reason,
      stage: row.stage,
      finalizeIncrementState: row.finalize_increment_state,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
  const personaTrainingDatasetRepository: PersonaTrainingDatasetRepository = {
    atomicTrainingGovernance: false,
    listVersions: async (cardId) => {
      const rows = await all<{
        id: string
        card_id: string
        version: number
        schema_version: string
        consent_snapshot_json: string
        created_at: number
        exported_at: number | null
        active_at: number | null
        rolled_back_at: number | null
      }>(
        database,
        'SELECT * FROM persona_training_datasets WHERE card_id = ? ORDER BY version DESC',
        [cardId],
      )
      return rows.map(mapPersonaTrainingDatasetVersionRow)
    },
    createVersion: async (dataset) => {
      await enqueueWrite(async () => {
        await run(
          database,
          `
          INSERT INTO persona_training_datasets (
            id, card_id, version, schema_version, consent_snapshot_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            dataset.id,
            dataset.cardId,
            dataset.version,
            dataset.schemaVersion,
            JSON.stringify(dataset.consentSnapshot),
            dataset.createdAt,
          ],
        )
      })
      return {
        ...dataset,
        exportedAt: null,
        activeAt: null,
        rolledBackAt: null,
      }
    },
    insertExamples: async (examples) => {
      if (examples.length === 0)
        return []
      await enqueueWrite(async () => {
        await runInTransaction(database, async () => {
          for (const example of examples) {
            await run(
              database,
              `
              INSERT INTO persona_training_dataset_examples (
	                id, dataset_id, card_id, schema_version, source_id, source_kind,
	                content_hash, behavior_lesson, positive_example, negative_example,
	                sensitivity, pii_status, pii_reason, consent_snapshot_json, provenance_json,
	                allow_training, state, created_at, revoked_at
	              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(dataset_id, content_hash) DO NOTHING
              `,
              [
                example.id,
                example.datasetId,
                example.cardId,
                example.schemaVersion,
                example.sourceId,
                example.sourceKind,
                example.contentHash,
                example.behaviorLesson,
                example.positiveExample,
                example.negativeExample,
                example.sensitivity,
                example.piiStatus,
                example.piiReason,
                JSON.stringify(example.consentSnapshot),
                JSON.stringify(example.provenance ?? null),
                example.allowTraining ? 1 : 0,
                example.state,
                example.createdAt,
                example.revokedAt ?? null,
              ],
            )
          }
        })
      })
      return examples
    },
    listExamples: async (cardId, datasetId) => {
      const rows = await all<Parameters<typeof mapPersonaTrainingDatasetExampleRow>[0]>(
        database,
        `
        SELECT *
        FROM persona_training_dataset_examples
        WHERE card_id = ? AND dataset_id = ?
        ORDER BY created_at ASC, id ASC
        `,
        [cardId, datasetId],
      )
      return rows.map(mapPersonaTrainingDatasetExampleRow)
    },
    appendExport: async (exportInput) => {
      await enqueueWrite(async () => {
        await run(
          database,
          `
          INSERT INTO persona_training_dataset_exports (
            id, dataset_id, card_id, manifest_hash, manifest_json, exported_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(dataset_id, manifest_hash) DO NOTHING
          `,
          [
            exportInput.id,
            exportInput.datasetId,
            exportInput.cardId,
            exportInput.manifestHash,
            exportInput.manifestJson,
            exportInput.exportedAt,
          ],
        )
      })
    },
    markExported: async (cardId, datasetId, exportedAt) => {
      await enqueueWrite(async () => {
        await run(
          database,
          'UPDATE persona_training_datasets SET exported_at = ? WHERE card_id = ? AND id = ?',
          [exportedAt, cardId, datasetId],
        )
      })
    },
    setActiveVersion: async (cardId, datasetId, at) => {
      await enqueueWrite(async () => {
        await runInTransaction(database, async () => {
          await run(database, 'UPDATE persona_training_datasets SET active_at = NULL WHERE card_id = ?', [cardId])
          await run(database, 'UPDATE persona_training_datasets SET active_at = ? WHERE card_id = ? AND id = ?', [at, cardId, datasetId])
        })
      })
      const row = await get<Parameters<typeof mapPersonaTrainingDatasetVersionRow>[0]>(
        database,
        'SELECT * FROM persona_training_datasets WHERE card_id = ? AND id = ?',
        [cardId, datasetId],
      )
      return row ? mapPersonaTrainingDatasetVersionRow(row) : null
    },
    rollbackToVersion: async (cardId, datasetId, at) => {
      await enqueueWrite(async () => {
        await runInTransaction(database, async () => {
          const active = await get<{ id: string }>(
            database,
            'SELECT id FROM persona_training_datasets WHERE card_id = ? AND active_at IS NOT NULL LIMIT 1',
            [cardId],
          )
          if (active?.id && active.id !== datasetId) {
            await run(
              database,
              'UPDATE persona_training_datasets SET active_at = NULL, rolled_back_at = ? WHERE card_id = ? AND id = ?',
              [at, cardId, active.id],
            )
          }
          await run(database, 'UPDATE persona_training_datasets SET active_at = NULL WHERE card_id = ?', [cardId])
          await run(
            database,
            'UPDATE persona_training_datasets SET active_at = ?, rolled_back_at = NULL WHERE card_id = ? AND id = ?',
            [at, cardId, datasetId],
          )
        })
      })
      const row = await get<Parameters<typeof mapPersonaTrainingDatasetVersionRow>[0]>(
        database,
        'SELECT * FROM persona_training_datasets WHERE card_id = ? AND id = ?',
        [cardId, datasetId],
      )
      return row ? mapPersonaTrainingDatasetVersionRow(row) : null
    },
    revokeSource: async (cardId, sourceId, at) => {
      return await enqueueWrite(async () => await runInTransaction(database, async () => {
        const result = await run(
          database,
          `
          UPDATE persona_training_dataset_examples
          SET state = 'revoked', allow_training = 0, revoked_at = ?
          WHERE card_id = ? AND source_id = ? AND state != 'revoked'
          `,
          [at, cardId, sourceId],
        )
        return Number(result?.changes ?? 0)
      }))
    },
    updateExamplePolicy: async (policyInput) => {
      await enqueueWrite(async () => {
        await run(
          database,
          `
          UPDATE persona_training_dataset_examples
          SET allow_training = ?, consent_snapshot_json = ?
          WHERE card_id = ? AND id = ? AND state != 'revoked'
          `,
          [
            policyInput.allowTraining ? 1 : 0,
            JSON.stringify(policyInput.consentSnapshot),
            policyInput.cardId,
            policyInput.exampleId,
          ],
        )
      })
      const row = await get<Parameters<typeof mapPersonaTrainingDatasetExampleRow>[0]>(
        database,
        'SELECT * FROM persona_training_dataset_examples WHERE card_id = ? AND id = ?',
        [policyInput.cardId, policyInput.exampleId],
      )
      return row ? mapPersonaTrainingDatasetExampleRow(row) : null
    },
  }
  interface PersonaTrainingRunRow {
    run_id: string
    card_id: string
    dataset_id: string
    manifest_hash: string
    source_ids_json: string
    base_persona_revision: string
    status: PersonaTrainingPipelineRunRecord['status']
    stage: PersonaTrainingPipelineRunRecord['stage']
    progress: number
    progress_message: string | null
    failure_reason: PersonaTrainingPipelineRunRecord['failureReason']
    config_snapshot_json: string | null
    artifact_json: string | null
    error: string | null
    queued_at: number
    started_at: number
    updated_at: number
    finished_at: number | null
    cancellation_requested_at: number | null
  }
  const mapPersonaTrainingRunRow = (row: PersonaTrainingRunRow): PersonaTrainingPipelineRunRecord => {
    const artifact = parsePersistedPersonaTrainingArtifact(row.artifact_json, `run ${row.run_id}`)
    if (artifact && artifact.runId !== row.run_id) {
      throw new Error(
        `invalid persisted persona training artifact (run ${row.run_id}): runId does not match persisted owner`,
      )
    }
    return {
      runId: row.run_id,
      cardId: row.card_id,
      datasetId: row.dataset_id,
      manifestHash: row.manifest_hash,
      sourceIds: parseJsonStringArray(row.source_ids_json),
      basePersonaRevision: row.base_persona_revision,
      status: row.status,
      stage: row.stage,
      progress: Number(row.progress) || 0,
      progressMessage: row.progress_message,
      failureReason: row.failure_reason,
      configSnapshot: parsePersistedPersonaTrainingExecutorConfig(
        row.config_snapshot_json,
        `run ${row.run_id}`,
      ),
      artifact,
      error: row.error,
      queuedAt: Number(row.queued_at),
      startedAt: row.started_at == null ? null : Number(row.started_at),
      updatedAt: Number(row.updated_at),
      finishedAt: row.finished_at == null ? null : Number(row.finished_at),
      cancellationRequestedAt: row.cancellation_requested_at == null
        ? null
        : Number(row.cancellation_requested_at),
    }
  }
  function projectPersonaTrainingArtifactForPendingCleanup(
    artifact: AlicizationPersonaTrainingArtifact | null,
    cleanupIntent: PersonaTrainingArtifactCleanupIntent | null,
    activationIntent: PersonaTrainingArtifactActivationIntent | null = null,
  ) {
    if (cleanupIntent) {
      if (!artifact)
        return null
      const cleanupArtifact = cleanupIntent.artifact.artifactId === artifact.artifactId
        ? cleanupIntent.artifact
        : artifact
      if (cleanupArtifact.activation.status === 'inactive')
        return cleanupArtifact
      return {
        ...cleanupArtifact,
        activation: {
          status: 'inactive' as const,
          reason: `Artifact cleanup pending at ${cleanupIntent.stage}.`,
        },
      }
    }
    if (activationIntent) {
      const activationArtifact = activationIntent.activatedArtifact
        ?? activationIntent.artifact
        ?? artifact
      return {
        ...activationArtifact,
        activation: {
          status: 'inactive' as const,
          reason: `Artifact activation pending at ${activationIntent.stage}.`,
        },
      }
    }
    return artifact
  }
  function mapPersonaTrainingRunRowForRenderer(
    row: PersonaTrainingRunRow,
    cleanupIntent: PersonaTrainingArtifactCleanupIntent | null,
    activationIntent: PersonaTrainingArtifactActivationIntent | null = null,
  ) {
    const mapped = mapPersonaTrainingRunRow(row)
    return {
      ...mapped,
      artifact: projectPersonaTrainingArtifactForPendingCleanup(
        mapped.artifact,
        cleanupIntent,
        activationIntent,
      ),
    }
  }
  function mapPersonaTrainingIncrementRow(
    row: PersonaTrainingIncrementRow,
    cleanupIntent: PersonaTrainingArtifactCleanupIntent | null = null,
    activationIntent: PersonaTrainingArtifactActivationIntent | null = null,
  ): PersonaTrainingPipelineIncrement {
    const artifact = requirePersistedPersonaTrainingArtifact(
      row.artifact_json,
      `increment ${row.id}`,
      row.run_id,
    )
    return {
      id: row.id,
      kind: 'persona-lora-increment',
      cardId: row.card_id,
      datasetId: row.dataset_id,
      manifestHash: row.manifest_hash,
      sourceIds: parseJsonStringArray(row.source_ids_json),
      basePersonaRevision: row.base_persona_revision,
      artifact: projectPersonaTrainingArtifactForPendingCleanup(
        artifact,
        cleanupIntent,
        activationIntent,
      )!,
      state: row.state,
      cleanup: cleanupIntent
        ? {
            status: 'pending',
            stage: cleanupIntent.stage,
            lastError: cleanupIntent.lastError,
          }
        : null,
      createdAt: row.created_at,
    }
  }
  async function listPendingPersonaTrainingArtifactCleanupIntents(cardId?: string) {
    const rows = await all<PersonaTrainingArtifactCleanupIntentRow>(
      database,
      `
      SELECT *
      FROM persona_training_artifact_cleanup_intents
      WHERE status = 'pending'
        ${cardId ? 'AND card_id = ?' : ''}
      ORDER BY updated_at DESC, id DESC
      `,
      cardId ? [cardId] : [],
    )
    return rows.map(mapPersonaTrainingArtifactCleanupIntentRow)
  }
  function serializePersonaTrainingArtifactLoaderReceiptSnapshot(
    receipt: PersonaTrainingArtifactLoaderReceiptSnapshot | null,
  ) {
    return receipt ? JSON.stringify(receipt) : null
  }
  const personaTrainingArtifactActivationOwnerClause = `
    id = ?
    AND card_id = ?
    AND run_id = ?
    AND increment_id = ?
    AND artifact_id = ?
    AND status = ?
    AND stage = ?
  `
  function personaTrainingArtifactActivationOwnerParams(
    input: PersonaTrainingArtifactActivationOwner,
  ) {
    return [
      input.intentId,
      input.cardId,
      input.runId,
      input.incrementId,
      input.artifactId,
      input.expectedStatus,
      input.expectedStage,
    ]
  }
  async function beginPersonaTrainingArtifactActivation(
    intent: PersonaTrainingArtifactActivationIntent,
  ) {
    if (
      intent.artifact.runId !== intent.runId
      || intent.artifact.artifactId !== intent.artifactId
      || (intent.expectedArtifact?.runId !== intent.runId && intent.expectedArtifact != null)
    ) {
      throw new Error('persona training artifact activation intent owner does not match its artifacts')
    }
    return await enqueueWrite(async () => await runInTransaction(database, async () => {
      const existing = await get<PersonaTrainingArtifactActivationIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_activation_intents
        WHERE id = ?
          AND card_id = ?
          AND run_id = ?
          AND increment_id = ?
          AND artifact_id = ?
          AND status = ?
          AND stage = ?
        `,
        [
          intent.id,
          intent.cardId,
          intent.runId,
          intent.incrementId,
          intent.artifactId,
          intent.status,
          intent.stage,
        ],
      )
      if (existing)
        return mapPersonaTrainingArtifactActivationIntentRow(existing)
      await run(
        database,
        `
        INSERT INTO persona_training_artifact_activation_intents (
          id, load_operation_id, mode, card_id, run_id, increment_id,
          artifact_id, artifact_json, expected_artifact_json,
          loader_receipt_json, activated_artifact_json, stage, status,
          last_error, created_at, updated_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'prepared', 'pending', NULL, ?, ?, NULL)
        `,
        [
          intent.id,
          intent.loadOperationId,
          intent.mode,
          intent.cardId,
          intent.runId,
          intent.incrementId,
          intent.artifactId,
          serializePersonaTrainingArtifact(intent.artifact),
          serializePersonaTrainingArtifact(intent.expectedArtifact),
          intent.createdAt,
          intent.updatedAt,
        ],
      )
      return intent
    }))
  }
  async function recordPersonaTrainingArtifactActivationReceipt(
    input: PersonaTrainingArtifactActivationOwner & {
      loaderReceipt: PersonaTrainingArtifactLoaderReceiptSnapshot
      activatedArtifact: AlicizationPersonaTrainingArtifact | null
      error: string | null
      at: number
    },
  ) {
    const updated = await enqueueWrite(async () => await run(
      database,
      `
      UPDATE persona_training_artifact_activation_intents
      SET
        loader_receipt_json = ?,
        activated_artifact_json = ?,
        stage = 'loaded',
        last_error = ?,
        updated_at = ?
      WHERE ${personaTrainingArtifactActivationOwnerClause}
      `,
      [
        serializePersonaTrainingArtifactLoaderReceiptSnapshot(input.loaderReceipt),
        serializePersonaTrainingArtifact(input.activatedArtifact),
        input.error,
        input.at,
        ...personaTrainingArtifactActivationOwnerParams(input),
      ],
    ))
    return Number(updated?.changes ?? 0) === 1
  }
  async function failPersonaTrainingArtifactActivation(
    input: PersonaTrainingArtifactActivationOwner & {
      error: string
      at: number
    },
  ) {
    const updated = await enqueueWrite(async () => await run(
      database,
      `
      UPDATE persona_training_artifact_activation_intents
      SET last_error = ?, updated_at = ?
      WHERE ${personaTrainingArtifactActivationOwnerClause}
      `,
      [
        input.error,
        input.at,
        ...personaTrainingArtifactActivationOwnerParams(input),
      ],
    ))
    return Number(updated?.changes ?? 0) === 1
  }
  async function completePersonaTrainingArtifactActivation(
    input: PersonaTrainingArtifactActivationOwner & { at: number },
  ) {
    const updated = await enqueueWrite(async () => await run(
      database,
      `
      UPDATE persona_training_artifact_activation_intents
      SET status = 'completed', last_error = NULL, updated_at = ?, completed_at = ?
      WHERE ${personaTrainingArtifactActivationOwnerClause}
      `,
      [
        input.at,
        input.at,
        ...personaTrainingArtifactActivationOwnerParams(input),
      ],
    ))
    return Number(updated?.changes ?? 0) === 1
  }
  async function persistPersonaTrainingArtifactCleanupIntentInTransaction(
    intent: PersonaTrainingArtifactCleanupIntent,
  ) {
    if (intent.artifact.runId !== intent.runId)
      throw new Error('persona training artifact cleanup intent owner does not match the artifact')
    const artifactJson = serializePersonaTrainingArtifact(intent.artifact)
    if (!artifactJson)
      throw new Error('persona training artifact cleanup intent requires an artifact')
    const existing = await get<PersonaTrainingArtifactCleanupIntentRow>(
      database,
      `
      SELECT *
      FROM persona_training_artifact_cleanup_intents
      WHERE id = ?
        AND card_id = ?
        AND run_id = ?
        AND increment_id IS ?
        AND artifact_id = ?
        AND status = ?
        AND stage = ?
      `,
      [
        intent.id,
        intent.cardId,
        intent.runId,
        intent.incrementId,
        intent.artifact.artifactId,
        intent.status,
        intent.stage,
      ],
    )
    if (existing)
      return mapPersonaTrainingArtifactCleanupIntentRow(existing)
    await run(
      database,
      `
      INSERT INTO persona_training_artifact_cleanup_intents (
        id, card_id, run_id, increment_id, artifact_id, artifact_json,
        loader_receipt_json, unload_operation_id, reason, stage, finalize_increment_state,
        status, attempts, last_error, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL)
      `,
      [
        intent.id,
        intent.cardId,
        intent.runId,
        intent.incrementId,
        intent.artifact.artifactId,
        artifactJson,
        serializePersonaTrainingArtifactLoaderReceiptSnapshot(intent.loaderReceipt),
        intent.unloadOperationId,
        intent.reason,
        intent.stage,
        intent.finalizeIncrementState,
        intent.attempts,
        intent.lastError,
        intent.createdAt,
        intent.updatedAt,
      ],
    )
    await insertPersonaTrainingArtifactCleanupAudit({
      action: 'training-artifact-cleanup-requested',
      intentId: intent.id,
      cardId: intent.cardId,
      runId: intent.runId,
      incrementId: intent.incrementId,
      artifactId: intent.artifact.artifactId,
      reason: intent.reason,
      error: intent.lastError,
      attempts: intent.attempts,
      createdAt: intent.updatedAt,
    })
    return intent
  }
  async function beginPersonaTrainingArtifactCleanup(
    intent: PersonaTrainingArtifactCleanupIntent,
  ) {
    return await enqueueWrite(async () => await runInTransaction(
      database,
      async () => await persistPersonaTrainingArtifactCleanupIntentInTransaction(intent),
    ))
  }
  async function handoffPersonaTrainingArtifactActivationToCleanup(
    input: PersonaTrainingArtifactActivationOwner & {
      cleanupIntent: PersonaTrainingArtifactCleanupIntent
      at: number
    },
  ) {
    const cleanup = input.cleanupIntent
    if (
      cleanup.cardId !== input.cardId
      || cleanup.runId !== input.runId
      || cleanup.artifact.artifactId !== input.artifactId
    ) {
      throw new Error('persona training artifact activation cleanup handoff owner does not match')
    }
    return await enqueueWrite(async () => await runInTransaction(database, async () => {
      const activation = await get<PersonaTrainingArtifactActivationIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_activation_intents
        WHERE ${personaTrainingArtifactActivationOwnerClause}
        `,
        personaTrainingArtifactActivationOwnerParams(input),
      )
      if (!activation)
        throw new Error('persona training artifact activation cleanup handoff lost its owner compare-and-set')
      const existingCleanup = await get<PersonaTrainingArtifactCleanupIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_cleanup_intents
        WHERE id = ?
          AND card_id = ?
          AND run_id = ?
          AND increment_id IS ?
          AND artifact_id = ?
          AND status = ?
          AND stage = ?
        `,
        [
          cleanup.id,
          cleanup.cardId,
          cleanup.runId,
          cleanup.incrementId,
          cleanup.artifact.artifactId,
          cleanup.status,
          cleanup.stage,
        ],
      )
      if (!existingCleanup) {
        await run(
          database,
          `
          INSERT INTO persona_training_artifact_cleanup_intents (
            id, card_id, run_id, increment_id, artifact_id, artifact_json,
            loader_receipt_json, unload_operation_id, reason, stage, finalize_increment_state,
            status, attempts, last_error, created_at, updated_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL)
          `,
          [
            cleanup.id,
            cleanup.cardId,
            cleanup.runId,
            cleanup.incrementId,
            cleanup.artifact.artifactId,
            serializePersonaTrainingArtifact(cleanup.artifact),
            serializePersonaTrainingArtifactLoaderReceiptSnapshot(cleanup.loaderReceipt),
            cleanup.unloadOperationId,
            cleanup.reason,
            cleanup.stage,
            cleanup.finalizeIncrementState,
            cleanup.attempts,
            cleanup.lastError,
            cleanup.createdAt,
            cleanup.updatedAt,
          ],
        )
        await insertPersonaTrainingArtifactCleanupAudit({
          action: 'training-artifact-cleanup-requested',
          intentId: cleanup.id,
          cardId: cleanup.cardId,
          runId: cleanup.runId,
          incrementId: cleanup.incrementId,
          artifactId: cleanup.artifact.artifactId,
          reason: cleanup.reason,
          error: cleanup.lastError,
          attempts: cleanup.attempts,
          createdAt: cleanup.updatedAt,
        })
      }
      const completed = await run(
        database,
        `
        UPDATE persona_training_artifact_activation_intents
        SET status = 'completed', updated_at = ?, completed_at = ?
        WHERE ${personaTrainingArtifactActivationOwnerClause}
        `,
        [
          input.at,
          input.at,
          ...personaTrainingArtifactActivationOwnerParams(input),
        ],
      )
      if (Number(completed?.changes ?? 0) !== 1)
        throw new Error('persona training artifact activation cleanup handoff lost its completion compare-and-set')
      return existingCleanup
        ? mapPersonaTrainingArtifactCleanupIntentRow(existingCleanup)
        : cleanup
    }))
  }
  function personaTrainingArtifactCleanupOwnerParams(
    input: PersonaTrainingArtifactCleanupOwner,
  ) {
    return [
      input.intentId,
      input.cardId,
      input.runId,
      input.incrementId,
      input.artifactId,
      input.expectedStatus,
      input.expectedStage,
    ]
  }
  const personaTrainingArtifactCleanupOwnerClause = `
    id = ?
    AND card_id = ?
    AND run_id = ?
    AND increment_id IS ?
    AND artifact_id = ?
    AND status = ?
    AND stage = ?
  `
  async function advancePersonaTrainingArtifactCleanup(input: PersonaTrainingArtifactCleanupOwner & {
    stage: PersonaTrainingArtifactCleanupStage
    artifact: AlicizationPersonaTrainingArtifact
    at: number
  }) {
    const artifactJson = serializePersonaTrainingArtifact(input.artifact)
    if (!artifactJson)
      throw new Error('persona training artifact cleanup stage requires an artifact')
    return await enqueueWrite(async () => await runInTransaction(database, async () => {
      const intent = await get<PersonaTrainingArtifactCleanupIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_cleanup_intents
        WHERE ${personaTrainingArtifactCleanupOwnerClause}
        `,
        personaTrainingArtifactCleanupOwnerParams(input),
      )
      if (!intent)
        return false
      if (
        input.artifact.runId !== intent.run_id
        || input.artifact.artifactId !== intent.artifact_id
      ) {
        throw new Error('persona training artifact cleanup stage artifact does not match its persisted owner')
      }
      const updated = await run(
        database,
        `
        UPDATE persona_training_artifact_cleanup_intents
        SET artifact_json = ?, stage = ?, last_error = NULL, updated_at = ?
        WHERE ${personaTrainingArtifactCleanupOwnerClause}
        `,
        [
          artifactJson,
          input.stage,
          input.at,
          ...personaTrainingArtifactCleanupOwnerParams(input),
        ],
      )
      if (Number(updated?.changes ?? 0) !== 1)
        return false
      if (input.expectedStage === 'unload') {
        await run(
          database,
          `
          UPDATE persona_training_runs
          SET artifact_json = ?
          WHERE run_id = ? AND card_id = ? AND artifact_json IS NOT NULL
          `,
          [artifactJson, intent.run_id, intent.card_id],
        )
        if (intent.increment_id) {
          await run(
            database,
            `
            UPDATE persona_training_increments
            SET artifact_json = ?
            WHERE id = ? AND run_id = ? AND card_id = ?
            `,
            [artifactJson, intent.increment_id, intent.run_id, intent.card_id],
          )
        }
      }
      return true
    }))
  }
  async function failPersonaTrainingArtifactCleanup(input: PersonaTrainingArtifactCleanupOwner & {
    attempts: number
    error: string
    at: number
  }) {
    return await enqueueWrite(async () => {
      const updated = await run(
        database,
        `
        UPDATE persona_training_artifact_cleanup_intents
        SET attempts = ?, last_error = ?, updated_at = ?
        WHERE ${personaTrainingArtifactCleanupOwnerClause}
        `,
        [
          input.attempts,
          input.error,
          input.at,
          ...personaTrainingArtifactCleanupOwnerParams(input),
        ],
      )
      return Number(updated?.changes ?? 0) === 1
    })
  }
  async function completePersonaTrainingArtifactCleanup(input: Omit<PersonaTrainingArtifactCleanupOwner, 'expectedStage'> & {
    expectedStage: 'finalize'
    attempts: number
    at: number
    transition: {
      incrementId: string
      state: Extract<PersonaTrainingPipelineIncrement['state'], 'rolled-back' | 'revoked'>
      event: PersonaTrainingPipelineAuditEvent
    } | null
  }) {
    return await enqueueWrite(async () => await runInTransaction(database, async () => {
      const intent = await get<PersonaTrainingArtifactCleanupIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_cleanup_intents
        WHERE ${personaTrainingArtifactCleanupOwnerClause}
        `,
        personaTrainingArtifactCleanupOwnerParams(input),
      )
      if (!intent)
        return false
      const targetState = intent.finalize_increment_state
      if (targetState) {
        const incrementId = intent.increment_id
        if (!incrementId || (input.transition && input.transition.incrementId !== incrementId))
          throw new Error('persona training artifact cleanup finalization increment does not match its intent')
        if (input.transition && input.transition.state !== targetState)
          throw new Error('persona training artifact cleanup finalization state does not match its intent')
        const increment = await get<PersonaTrainingIncrementRow>(
          database,
          'SELECT * FROM persona_training_increments WHERE id = ?',
          [incrementId],
        )
        if (!increment)
          throw new Error('persona training artifact cleanup finalization increment is missing')
        const incrementArtifact = requirePersistedPersonaTrainingArtifact(
          increment.artifact_json,
          `increment ${increment.id}`,
          increment.run_id,
        )
        if (
          increment.card_id !== intent.card_id
          || increment.run_id !== intent.run_id
          || incrementArtifact.artifactId !== intent.artifact_id
        ) {
          throw new Error('persona training artifact cleanup finalization increment owner does not match its intent')
        }
        if (increment.state === 'available') {
          const event = input.transition?.event ?? {
            action: targetState === 'revoked'
              ? 'training-increment-revoked'
              : 'training-increment-rolled-back',
            runId: null,
            incrementId: increment.id,
            cardId: increment.card_id,
            datasetId: increment.dataset_id,
            manifestHash: increment.manifest_hash,
            sourceIds: parseJsonStringArray(increment.source_ids_json),
            reason: intent.reason,
            createdAt: input.at,
          }
          if (
            event.incrementId !== increment.id
            || event.cardId !== increment.card_id
            || event.datasetId !== increment.dataset_id
            || event.manifestHash !== increment.manifest_hash
            || (event.runId != null && event.runId !== increment.run_id)
            || [...event.sourceIds].sort().join('\0') !== parseJsonStringArray(increment.source_ids_json).sort().join('\0')
          ) {
            throw new Error('persona training artifact cleanup finalization audit scope does not match the increment')
          }
          const transitioned = await run(
            database,
            `
            UPDATE persona_training_increments
            SET state = ?
            WHERE id = ? AND state = 'available'
            `,
            [targetState, increment.id],
          )
          if (Number(transitioned?.changes ?? 0) !== 1)
            throw new Error('persona training artifact cleanup finalization lost its increment transition')
          await insertPersonaTrainingAuditEvent(event)
        }
        else if (increment.state !== targetState) {
          throw new Error('persona training artifact cleanup finalization found an incompatible increment state')
        }
      }
      const completed = await run(
        database,
        `
        UPDATE persona_training_artifact_cleanup_intents
        SET
          status = 'completed',
          attempts = ?,
          last_error = NULL,
          updated_at = ?,
          completed_at = ?
        WHERE ${personaTrainingArtifactCleanupOwnerClause}
        `,
        [
          input.attempts,
          input.at,
          input.at,
          ...personaTrainingArtifactCleanupOwnerParams(input),
        ],
      )
      if (Number(completed?.changes ?? 0) !== 1)
        return false
      await insertPersonaTrainingArtifactCleanupAudit({
        action: 'training-artifact-cleanup-completed',
        intentId: intent.id,
        cardId: intent.card_id,
        runId: intent.run_id,
        incrementId: intent.increment_id,
        artifactId: intent.artifact_id,
        reason: intent.reason,
        error: null,
        attempts: input.attempts,
        createdAt: input.at,
      })
      return true
    }))
  }
  const personaTrainingPipelinePersistence: PersonaTrainingPipelinePersistence = {
    commitDatasetGovernanceWithArtifactCleanup: async (
      governanceInput: PersonaTrainingDatasetGovernanceMutation,
    ): Promise<PersonaTrainingDatasetGovernanceMutationResult> => {
      return await enqueueWrite(async () => await runInTransaction(database, async () => {
        if (governanceInput.kind === 'activate-version') {
          if (governanceInput.dataset.cardId !== governanceInput.cardId)
            throw new Error('persona training governance dataset card scope does not match the mutation')
          const persisted = await get<Parameters<typeof mapPersonaTrainingDatasetVersionRow>[0]>(
            database,
            'SELECT * FROM persona_training_datasets WHERE card_id = ? AND id = ?',
            [governanceInput.cardId, governanceInput.dataset.id],
          )
          if (!persisted)
            throw new Error('persona training governance dataset version not found')
          await run(
            database,
            'UPDATE persona_training_datasets SET active_at = NULL WHERE card_id = ?',
            [governanceInput.cardId],
          )
          const activated = await run(
            database,
            `
            UPDATE persona_training_datasets
            SET active_at = ?, rolled_back_at = NULL
            WHERE card_id = ? AND id = ?
            `,
            [
              governanceInput.at,
              governanceInput.cardId,
              governanceInput.dataset.id,
            ],
          )
          if (Number(activated?.changes ?? 0) !== 1)
            throw new Error('persona training governance dataset activation lost its target')
          for (const intent of governanceInput.cleanupIntents) {
            if (intent.cardId !== governanceInput.cardId)
              throw new Error('persona training governance cleanup intent card scope does not match the mutation')
            await persistPersonaTrainingArtifactCleanupIntentInTransaction(intent)
          }
          return {
            kind: 'activate-version',
            dataset: mapPersonaTrainingDatasetVersionRow({
              ...persisted,
              active_at: governanceInput.at,
              rolled_back_at: null,
            }),
          }
        }

        if (governanceInput.kind === 'rollback-version') {
          if (governanceInput.dataset.cardId !== governanceInput.cardId)
            throw new Error('persona training governance dataset card scope does not match the mutation')
          const persisted = await get<Parameters<typeof mapPersonaTrainingDatasetVersionRow>[0]>(
            database,
            'SELECT * FROM persona_training_datasets WHERE card_id = ? AND id = ?',
            [governanceInput.cardId, governanceInput.dataset.id],
          )
          if (!persisted)
            throw new Error('persona training governance dataset version not found')
          const active = await get<{ id: string }>(
            database,
            `
            SELECT id
            FROM persona_training_datasets
            WHERE card_id = ? AND active_at IS NOT NULL
            LIMIT 1
            `,
            [governanceInput.cardId],
          )
          if (active?.id && active.id !== governanceInput.dataset.id) {
            await run(
              database,
              `
              UPDATE persona_training_datasets
              SET active_at = NULL, rolled_back_at = ?
              WHERE card_id = ? AND id = ?
              `,
              [
                governanceInput.at,
                governanceInput.cardId,
                active.id,
              ],
            )
          }
          await run(
            database,
            'UPDATE persona_training_datasets SET active_at = NULL WHERE card_id = ?',
            [governanceInput.cardId],
          )
          const activated = await run(
            database,
            `
            UPDATE persona_training_datasets
            SET active_at = ?, rolled_back_at = NULL
            WHERE card_id = ? AND id = ?
            `,
            [
              governanceInput.at,
              governanceInput.cardId,
              governanceInput.dataset.id,
            ],
          )
          if (Number(activated?.changes ?? 0) !== 1)
            throw new Error('persona training governance dataset rollback lost its target')
          for (const intent of governanceInput.cleanupIntents) {
            if (intent.cardId !== governanceInput.cardId)
              throw new Error('persona training governance cleanup intent card scope does not match the mutation')
            await persistPersonaTrainingArtifactCleanupIntentInTransaction(intent)
          }
          return {
            kind: 'rollback-version',
            dataset: mapPersonaTrainingDatasetVersionRow({
              ...persisted,
              active_at: governanceInput.at,
              rolled_back_at: null,
            }),
          }
        }

        if (governanceInput.kind !== 'revoke-source')
          throw new Error(`unsupported atomic persona training governance mutation: ${governanceInput.kind}`)

        const revoked = await run(
          database,
          `
          UPDATE persona_training_dataset_examples
          SET state = 'revoked', allow_training = 0, revoked_at = ?
          WHERE card_id = ? AND source_id = ? AND state != 'revoked'
          `,
          [
            governanceInput.at,
            governanceInput.cardId,
            governanceInput.sourceId,
          ],
        )
        for (const intent of governanceInput.cleanupIntents) {
          if (intent.cardId !== governanceInput.cardId)
            throw new Error('persona training governance cleanup intent card scope does not match the mutation')
          await persistPersonaTrainingArtifactCleanupIntentInTransaction(intent)
        }
        return {
          kind: 'revoke-source',
          affected: Number(revoked?.changes ?? 0),
        }
      }))
    },
    createRun: async (runRecord) => {
      await enqueueWrite(async () => {
        await run(
          database,
          `
          INSERT INTO persona_training_runs (
            run_id, card_id, dataset_id, manifest_hash, source_ids_json,
            base_persona_revision, status, stage, progress, progress_message,
            failure_reason, config_snapshot_json, artifact_json, error,
            queued_at, started_at, updated_at, finished_at, cancellation_requested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            runRecord.runId,
            runRecord.cardId,
            runRecord.datasetId,
            runRecord.manifestHash,
            JSON.stringify(runRecord.sourceIds),
            runRecord.basePersonaRevision,
            runRecord.status,
            runRecord.stage,
            runRecord.progress,
            runRecord.progressMessage,
            runRecord.failureReason,
            runRecord.configSnapshot ? JSON.stringify(runRecord.configSnapshot) : null,
            serializePersonaTrainingArtifact(runRecord.artifact),
            runRecord.error,
            runRecord.queuedAt,
            runRecord.startedAt ?? runRecord.queuedAt,
            runRecord.updatedAt,
            runRecord.finishedAt,
            runRecord.cancellationRequestedAt,
          ],
        )
      })
    },
    updateRun: async (runUpdate) => {
      const updates: string[] = []
      const values: unknown[] = []
      if (runUpdate.cardId !== undefined) {
        updates.push('card_id = ?')
        values.push(runUpdate.cardId)
      }
      if (runUpdate.datasetId !== undefined) {
        updates.push('dataset_id = ?')
        values.push(runUpdate.datasetId)
      }
      if (runUpdate.manifestHash !== undefined) {
        updates.push('manifest_hash = ?')
        values.push(runUpdate.manifestHash)
      }
      if (runUpdate.sourceIds !== undefined) {
        updates.push('source_ids_json = ?')
        values.push(JSON.stringify(runUpdate.sourceIds))
      }
      if (runUpdate.basePersonaRevision !== undefined) {
        updates.push('base_persona_revision = ?')
        values.push(runUpdate.basePersonaRevision)
      }
      if (runUpdate.status !== undefined) {
        updates.push('status = ?')
        values.push(runUpdate.status)
      }
      if (runUpdate.stage !== undefined) {
        updates.push('stage = ?')
        values.push(runUpdate.stage)
      }
      if (runUpdate.progress !== undefined) {
        updates.push('progress = ?')
        values.push(runUpdate.progress)
      }
      if (runUpdate.progressMessage !== undefined) {
        updates.push('progress_message = ?')
        values.push(runUpdate.progressMessage)
      }
      if (runUpdate.failureReason !== undefined) {
        updates.push('failure_reason = ?')
        values.push(runUpdate.failureReason)
      }
      if (runUpdate.configSnapshot !== undefined) {
        updates.push('config_snapshot_json = ?')
        values.push(runUpdate.configSnapshot ? JSON.stringify(runUpdate.configSnapshot) : null)
      }
      if (runUpdate.artifact !== undefined) {
        updates.push('artifact_json = ?')
        values.push(serializePersonaTrainingArtifact(runUpdate.artifact))
      }
      if (runUpdate.error !== undefined) {
        updates.push('error = ?')
        values.push(runUpdate.error)
      }
      if (runUpdate.queuedAt !== undefined) {
        updates.push('queued_at = ?')
        values.push(runUpdate.queuedAt)
      }
      if (runUpdate.startedAt !== undefined) {
        updates.push('started_at = ?')
        values.push(runUpdate.startedAt ?? runUpdate.queuedAt ?? 0)
      }
      if (runUpdate.updatedAt !== undefined) {
        updates.push('updated_at = ?')
        values.push(runUpdate.updatedAt)
      }
      if (runUpdate.finishedAt !== undefined) {
        updates.push('finished_at = ?')
        values.push(runUpdate.finishedAt)
      }
      if (runUpdate.cancellationRequestedAt !== undefined) {
        updates.push('cancellation_requested_at = ?')
        values.push(runUpdate.cancellationRequestedAt)
      }
      if (updates.length === 0)
        return false
      values.push(runUpdate.runId)
      return await enqueueWrite(async () => {
        const result = await run(
          database,
          `
          UPDATE persona_training_runs
          SET ${updates.join(', ')}
          WHERE run_id = ?
            AND status IN ('queued', 'running', 'cancel_requested')
          `,
          values,
        )
        return Number(result?.changes ?? 0) > 0
      })
    },
    completeRunWithIncrement: async (completionInput) => {
      return await enqueueWrite(async () => await runInTransaction(database, async () => {
        const { increment, run: completedRun } = completionInput
        if (
          completedRun.status !== 'completed'
          || increment.state !== 'available'
          || increment.id !== `persona-training-increment:${completedRun.runId}`
          || increment.cardId !== completedRun.cardId
          || increment.datasetId !== completedRun.datasetId
          || increment.manifestHash !== completedRun.manifestHash
          || increment.basePersonaRevision !== completedRun.basePersonaRevision
          || increment.artifact.runId !== completedRun.runId
          || serializePersonaTrainingArtifact(increment.artifact) !== serializePersonaTrainingArtifact(completedRun.artifact)
          || [...increment.sourceIds].sort().join('\0') !== [...completedRun.sourceIds].sort().join('\0')
        ) {
          return {
            completed: false,
            reason: 'manifest-no-longer-usable' as const,
            error: 'persona training completion payload is internally inconsistent',
          }
        }
        const currentRun = await get<PersonaTrainingRunRow>(
          database,
          `
          SELECT *
          FROM persona_training_runs
          WHERE run_id = ?
          `,
          [completedRun.runId],
        )
        if (!currentRun || currentRun.status !== 'terminalizing') {
          return {
            completed: false,
            reason: 'manifest-no-longer-usable' as const,
            error: 'persona training run is no longer terminalizing',
          }
        }
        const persistedSourceIds = parseJsonStringArray(currentRun.source_ids_json)
        if (
          currentRun.card_id !== completedRun.cardId
          || currentRun.dataset_id !== completedRun.datasetId
          || currentRun.manifest_hash !== completedRun.manifestHash
          || currentRun.base_persona_revision !== completedRun.basePersonaRevision
          || [...persistedSourceIds].sort().join('\0') !== [...completedRun.sourceIds].sort().join('\0')
        ) {
          return {
            completed: false,
            reason: 'manifest-no-longer-usable' as const,
            error: 'persisted persona training run scope no longer matches the completion payload',
          }
        }
        const dataset = await get<{
          consent_snapshot_json: string
        }>(
          database,
          `
          SELECT consent_snapshot_json
          FROM persona_training_datasets
          WHERE id = ?
            AND card_id = ?
            AND active_at IS NOT NULL
            AND rolled_back_at IS NULL
          `,
          [completedRun.datasetId, completedRun.cardId],
        )
        if (!dataset || !parsePersonaTrainingDatasetConsent(dataset.consent_snapshot_json).granted) {
          return {
            completed: false,
            reason: 'dataset-not-active' as const,
            error: 'persona training dataset is no longer active or consented',
          }
        }
        const exported = await get<{ id: string }>(
          database,
          `
          SELECT id
          FROM persona_training_dataset_exports
          WHERE dataset_id = ?
            AND card_id = ?
            AND manifest_hash = ?
          LIMIT 1
          `,
          [completedRun.datasetId, completedRun.cardId, completedRun.manifestHash],
        )
        if (!exported) {
          return {
            completed: false,
            reason: 'manifest-no-longer-usable' as const,
            error: 'persona training manifest export is no longer available',
          }
        }
        const sourceIds = [...new Set(completedRun.sourceIds)]
        if (sourceIds.length === 0) {
          return {
            completed: false,
            reason: 'manifest-no-longer-usable' as const,
            error: 'persona training completion has no source examples',
          }
        }
        const exampleRows = await all<{
          source_id: string
          state: PersonaTrainingDatasetExample['state']
          allow_training: number
          pii_status: PersonaTrainingDatasetExample['piiStatus']
          consent_snapshot_json: string
          provenance_json: string | null
        }>(
          database,
          `
          SELECT
            source_id,
            state,
            allow_training,
            pii_status,
            consent_snapshot_json,
            provenance_json
          FROM persona_training_dataset_examples
          WHERE card_id = ?
            AND dataset_id = ?
            AND source_id IN (${sourceIds.map(() => '?').join(', ')})
          `,
          [completedRun.cardId, completedRun.datasetId, ...sourceIds],
        )
        const usableSourceIds = new Set(
          exampleRows
            .filter(row =>
              row.state === 'staged'
              && row.allow_training === 1
              && row.pii_status === 'clear'
              && parsePersonaTrainingDatasetConsent(row.consent_snapshot_json).granted
              && parsePersonaTrainingDatasetProvenance(row.provenance_json) != null,
            )
            .map(row => row.source_id),
        )
        if (sourceIds.some(sourceId => !usableSourceIds.has(sourceId))) {
          const revoked = exampleRows.some(row =>
            sourceIds.includes(row.source_id) && row.state === 'revoked',
          )
          return {
            completed: false,
            reason: revoked ? 'source-revoked' as const : 'manifest-no-longer-usable' as const,
            error: 'persona training source is no longer eligible for training',
          }
        }

        if (completionInput.activation) {
          const activationCompleted = await run(
            database,
            `
            UPDATE persona_training_artifact_activation_intents
            SET status = 'completed', last_error = NULL, updated_at = ?, completed_at = ?
            WHERE ${personaTrainingArtifactActivationOwnerClause}
              AND mode = 'initial'
              AND activated_artifact_json = ?
            `,
            [
              completedRun.updatedAt,
              completedRun.updatedAt,
              ...personaTrainingArtifactActivationOwnerParams(completionInput.activation),
              serializePersonaTrainingArtifact(increment.artifact),
            ],
          )
          if (Number(activationCompleted?.changes ?? 0) !== 1)
            throw new Error('persona training completion lost its activation intent compare-and-set')
        }

        await run(
          database,
          `
          INSERT INTO persona_training_increments (
            id, run_id, card_id, dataset_id, manifest_hash, source_ids_json,
            base_persona_revision, artifact_json, state, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            increment.id,
            completedRun.runId,
            increment.cardId,
            increment.datasetId,
            increment.manifestHash,
            JSON.stringify(increment.sourceIds),
            increment.basePersonaRevision,
            serializePersonaTrainingArtifact(increment.artifact),
            increment.state,
            increment.createdAt,
          ],
        )
        const updated = await run(
          database,
          `
          UPDATE persona_training_runs
          SET
            status = ?,
            stage = ?,
            progress = ?,
            progress_message = ?,
            failure_reason = ?,
            artifact_json = ?,
            error = ?,
            updated_at = ?,
            finished_at = ?
          WHERE run_id = ? AND status = 'terminalizing'
          `,
          [
            completedRun.status,
            completedRun.stage,
            completedRun.progress,
            completedRun.progressMessage,
            completedRun.failureReason,
            serializePersonaTrainingArtifact(completedRun.artifact),
            completedRun.error,
            completedRun.updatedAt,
            completedRun.finishedAt,
            completedRun.runId,
          ],
        )
        if (Number(updated?.changes ?? 0) !== 1)
          throw new Error('persona training completion lost its terminalizing compare-and-set')
        await insertPersonaTrainingAuditEvent(completionInput.event)
        return { completed: true }
      }))
    },
    finishRun: async (finishInput) => {
      return await enqueueWrite(async () => await runInTransaction(database, async () => {
        const finalRun = finishInput.run
        if (!['failed', 'cancelled', 'interrupted'].includes(finalRun.status))
          throw new Error('persona training finishRun requires a non-completed terminal status')
        const updated = await run(
          database,
          `
          UPDATE persona_training_runs
          SET
            status = ?,
            stage = ?,
            progress = ?,
            progress_message = ?,
            failure_reason = ?,
            artifact_json = ?,
            error = ?,
            updated_at = ?,
            finished_at = ?,
            cancellation_requested_at = ?
          WHERE run_id = ? AND status = 'terminalizing'
          `,
          [
            finalRun.status,
            finalRun.stage,
            finalRun.progress,
            finalRun.progressMessage,
            finalRun.failureReason,
            serializePersonaTrainingArtifact(finalRun.artifact),
            finalRun.error,
            finalRun.updatedAt,
            finalRun.finishedAt,
            finalRun.cancellationRequestedAt,
            finalRun.runId,
          ],
        )
        if (Number(updated?.changes ?? 0) !== 1)
          return false
        await insertPersonaTrainingAuditEvent(finishInput.event)
        return true
      }))
    },
    updateIncrementState: async (incrementUpdate) => {
      await enqueueWrite(async () => {
        await run(
          database,
          'UPDATE persona_training_increments SET state = ? WHERE id = ?',
          [incrementUpdate.state, incrementUpdate.incrementId],
        )
      })
    },
    transitionIncrementWithAudit: async (transitionInput) => {
      return await enqueueWrite(async () => await runInTransaction(database, async () => {
        const increment = await get<PersonaTrainingIncrementRow>(
          database,
          'SELECT * FROM persona_training_increments WHERE id = ?',
          [transitionInput.incrementId],
        )
        if (!increment)
          return false
        const expectedState = transitionInput.state === 'revoked' && increment.state === 'rolled-back'
          ? 'rolled-back'
          : 'available'
        if (increment.state !== expectedState)
          return false
        if (
          transitionInput.event.incrementId !== increment.id
          || transitionInput.event.cardId !== increment.card_id
          || transitionInput.event.datasetId !== increment.dataset_id
          || transitionInput.event.manifestHash !== increment.manifest_hash
        ) {
          throw new Error('persona training increment audit scope does not match the persisted increment')
        }
        const updated = await run(
          database,
          `
          UPDATE persona_training_increments
          SET state = ?
          WHERE id = ? AND state = ?
          `,
          [transitionInput.state, transitionInput.incrementId, expectedState],
        )
        if (Number(updated?.changes ?? 0) !== 1)
          return false
        await insertPersonaTrainingAuditEvent(transitionInput.event)
        return true
      }))
    },
    beginArtifactActivation: beginPersonaTrainingArtifactActivation,
    recordArtifactActivationReceipt: recordPersonaTrainingArtifactActivationReceipt,
    failArtifactActivation: failPersonaTrainingArtifactActivation,
    handoffArtifactActivationToCleanup: handoffPersonaTrainingArtifactActivationToCleanup,
    completeArtifactActivation: completePersonaTrainingArtifactActivation,
    listArtifactActivationIntents: async (listInput) => {
      const filters = listInput.cardId ? ['card_id = ?'] : []
      const params: unknown[] = listInput.cardId ? [listInput.cardId] : []
      if (listInput.status) {
        filters.push('status = ?')
        params.push(listInput.status)
      }
      const rows = await all<PersonaTrainingArtifactActivationIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_activation_intents
        ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
        ORDER BY updated_at ASC, id ASC
        `,
        params,
      )
      return rows.map(mapPersonaTrainingArtifactActivationIntentRow)
    },
    recordArtifactCleanupIntent: async (intent: PersonaTrainingArtifactCleanupIntent) => {
      if (intent.artifact.runId !== intent.runId)
        throw new Error('persona training artifact cleanup intent owner does not match the artifact')
      const artifactJson = serializePersonaTrainingArtifact(intent.artifact)
      if (!artifactJson)
        throw new Error('persona training artifact cleanup intent requires an artifact')
      await enqueueWrite(async () => await runInTransaction(database, async () => {
        const existing = await get<PersonaTrainingArtifactCleanupIntentRow>(
          database,
          'SELECT * FROM persona_training_artifact_cleanup_intents WHERE id = ?',
          [intent.id],
        )
        if (
          existing
          && (
            existing.card_id !== intent.cardId
            || existing.run_id !== intent.runId
            || existing.increment_id !== intent.incrementId
            || existing.artifact_id !== intent.artifact.artifactId
          )
        ) {
          throw new Error('persona training artifact cleanup intent scope does not match its persisted owner')
        }
        if (existing?.status === 'completed')
          return
        const attempts = existing
          ? Math.max(existing.attempts + 1, intent.attempts)
          : Math.max(1, intent.attempts)
        if (existing) {
          const updated = await run(
            database,
            `
            UPDATE persona_training_artifact_cleanup_intents
            SET
              artifact_json = ?,
              loader_receipt_json = COALESCE(loader_receipt_json, ?),
              unload_operation_id = COALESCE(unload_operation_id, ?),
              finalize_increment_state = COALESCE(finalize_increment_state, ?),
              attempts = ?,
              last_error = ?,
              updated_at = ?
            WHERE ${personaTrainingArtifactCleanupOwnerClause}
            `,
            [
              artifactJson,
              serializePersonaTrainingArtifactLoaderReceiptSnapshot(intent.loaderReceipt),
              intent.unloadOperationId,
              intent.finalizeIncrementState,
              attempts,
              intent.lastError,
              intent.updatedAt,
              intent.id,
              intent.cardId,
              intent.runId,
              intent.incrementId,
              intent.artifact.artifactId,
              'pending',
              existing.stage,
            ],
          )
          if (Number(updated?.changes ?? 0) !== 1)
            throw new Error('persona training artifact cleanup intent lost its owner compare-and-set')
          return
        }
        await run(
          database,
          `
          INSERT INTO persona_training_artifact_cleanup_intents (
            id, card_id, run_id, increment_id, artifact_id, artifact_json,
            loader_receipt_json, unload_operation_id, reason, stage, finalize_increment_state,
            status, attempts, last_error, created_at, updated_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL)
          `,
          [
            intent.id,
            intent.cardId,
            intent.runId,
            intent.incrementId,
            intent.artifact.artifactId,
            artifactJson,
            serializePersonaTrainingArtifactLoaderReceiptSnapshot(intent.loaderReceipt),
            intent.unloadOperationId,
            intent.reason,
            intent.stage,
            intent.finalizeIncrementState,
            attempts,
            intent.lastError,
            intent.createdAt,
            intent.updatedAt,
          ],
        )
        await insertPersonaTrainingArtifactCleanupAudit({
          action: 'training-artifact-cleanup-requested',
          intentId: intent.id,
          cardId: intent.cardId,
          runId: intent.runId,
          incrementId: intent.incrementId,
          artifactId: intent.artifact.artifactId,
          reason: intent.reason,
          error: intent.lastError,
          attempts,
          createdAt: intent.updatedAt,
        })
      }))
    },
    beginArtifactCleanup: beginPersonaTrainingArtifactCleanup,
    advanceArtifactCleanup: advancePersonaTrainingArtifactCleanup,
    failArtifactCleanup: failPersonaTrainingArtifactCleanup,
    completeArtifactCleanup: completePersonaTrainingArtifactCleanup,
    appendEvent: async (event) => {
      await enqueueWrite(async () => {
        await insertPersonaTrainingAuditEvent(event)
      })
    },
    listIncrements: async () => {
      const [rows, pendingIntents, pendingActivations] = await Promise.all([
        all<PersonaTrainingIncrementRow>(
          database,
          'SELECT * FROM persona_training_increments ORDER BY created_at DESC, id DESC',
        ),
        listPendingPersonaTrainingArtifactCleanupIntents(),
        all<PersonaTrainingArtifactActivationIntentRow>(
          database,
          `SELECT * FROM persona_training_artifact_activation_intents WHERE status = 'pending'`,
        ).then(rows => rows.map(mapPersonaTrainingArtifactActivationIntentRow)),
      ])
      const pendingByIncrementId = new Map(
        pendingIntents.flatMap(intent =>
          intent.incrementId ? [[intent.incrementId, intent] as const] : [],
        ),
      )
      const activationByIncrementId = new Map(
        pendingActivations.map(intent => [intent.incrementId, intent] as const),
      )
      return rows.map(row =>
        mapPersonaTrainingIncrementRow(
          row,
          pendingByIncrementId.get(row.id) ?? null,
          activationByIncrementId.get(row.id) ?? null,
        ),
      )
    },
    getRun: async (runId) => {
      const row = await get<PersonaTrainingRunRow>(
        database,
        'SELECT * FROM persona_training_runs WHERE run_id = ?',
        [runId],
      )
      if (!row)
        return null
      const pendingIntent = await get<PersonaTrainingArtifactCleanupIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_cleanup_intents
        WHERE run_id = ? AND card_id = ? AND status = 'pending'
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        `,
        [row.run_id, row.card_id],
      )
      const pendingActivation = await get<PersonaTrainingArtifactActivationIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_activation_intents
        WHERE run_id = ? AND card_id = ? AND status = 'pending'
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        `,
        [row.run_id, row.card_id],
      )
      return mapPersonaTrainingRunRowForRenderer(
        row,
        pendingIntent ? mapPersonaTrainingArtifactCleanupIntentRow(pendingIntent) : null,
        pendingActivation ? mapPersonaTrainingArtifactActivationIntentRow(pendingActivation) : null,
      )
    },
    listRuns: async (listInput) => {
      const limit = Math.max(1, Math.min(100, Math.floor(listInput.limit ?? 20)))
      const [rows, pendingIntents, pendingActivations] = await Promise.all([
        all<PersonaTrainingRunRow>(
          database,
          `
          SELECT *
          FROM persona_training_runs
          WHERE card_id = ?
          ORDER BY queued_at DESC, run_id DESC
          LIMIT ?
          `,
          [listInput.cardId, limit],
        ),
        listPendingPersonaTrainingArtifactCleanupIntents(listInput.cardId),
        all<PersonaTrainingArtifactActivationIntentRow>(
          database,
          `
          SELECT *
          FROM persona_training_artifact_activation_intents
          WHERE card_id = ? AND status = 'pending'
          ORDER BY updated_at DESC, id DESC
          `,
          [listInput.cardId],
        ).then(rows => rows.map(mapPersonaTrainingArtifactActivationIntentRow)),
      ])
      const pendingByRunId = new Map(
        pendingIntents.map(intent => [intent.runId, intent] as const),
      )
      const activationByRunId = new Map(
        pendingActivations.map(intent => [intent.runId, intent] as const),
      )
      return rows.map(row =>
        mapPersonaTrainingRunRowForRenderer(
          row,
          pendingByRunId.get(row.run_id) ?? null,
          activationByRunId.get(row.run_id) ?? null,
        ),
      )
    },
    listArtifactCleanupIntents: async (listInput) => {
      const filters = listInput.cardId ? ['card_id = ?'] : []
      const params: unknown[] = listInput.cardId ? [listInput.cardId] : []
      if (listInput.status) {
        filters.push('status = ?')
        params.push(listInput.status)
      }
      const rows = await all<PersonaTrainingArtifactCleanupIntentRow>(
        database,
        `
        SELECT *
        FROM persona_training_artifact_cleanup_intents
        ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
        ORDER BY updated_at ASC, id ASC
        `,
        params,
      )
      return rows.map(mapPersonaTrainingArtifactCleanupIntentRow)
    },
    listRestartRuns: async (listInput) => {
      const scopeClause = listInput.cardId ? 'AND card_id = ?' : ''
      const rows = await all<PersonaTrainingRunRow>(
        database,
        `
        SELECT *
        FROM persona_training_runs
        WHERE status IN ('queued', 'running', 'cancel_requested', 'terminalizing')
          ${scopeClause}
        ORDER BY queued_at ASC, run_id ASC
        `,
        listInput.cardId ? [listInput.cardId] : [],
      )
      return rows.map(mapPersonaTrainingRunRow)
    },
    listRestartCandidates: async (listInput) => {
      const scopeClause = listInput.cardId
        ? 'AND persona_training_runs.card_id = ?'
        : ''
      const rows = await all<PersonaTrainingRunRow & {
        increment_id: string | null
        increment_run_id: string | null
        increment_card_id: string | null
        increment_dataset_id: string | null
        increment_manifest_hash: string | null
        increment_source_ids_json: string | null
        increment_base_persona_revision: string | null
        increment_artifact_json: string | null
        increment_state: PersonaTrainingPipelineIncrement['state'] | null
        increment_created_at: number | null
      }>(
        database,
        `
        SELECT
          persona_training_runs.*,
          persona_training_increments.id AS increment_id,
          persona_training_increments.run_id AS increment_run_id,
          persona_training_increments.card_id AS increment_card_id,
          persona_training_increments.dataset_id AS increment_dataset_id,
          persona_training_increments.manifest_hash AS increment_manifest_hash,
          persona_training_increments.source_ids_json AS increment_source_ids_json,
          persona_training_increments.base_persona_revision AS increment_base_persona_revision,
          persona_training_increments.artifact_json AS increment_artifact_json,
          persona_training_increments.state AS increment_state,
          persona_training_increments.created_at AS increment_created_at
        FROM persona_training_runs
        LEFT JOIN persona_training_increments
          ON persona_training_increments.run_id = persona_training_runs.run_id
        WHERE persona_training_runs.status = 'completed'
          ${scopeClause}
          AND NOT EXISTS (
            SELECT 1
            FROM persona_training_artifact_cleanup_intents
            WHERE persona_training_artifact_cleanup_intents.run_id = persona_training_runs.run_id
              AND persona_training_artifact_cleanup_intents.status = 'pending'
          )
        ORDER BY persona_training_runs.queued_at ASC, persona_training_runs.run_id ASC
        `,
        listInput.cardId ? [listInput.cardId] : [],
      )
      return rows.map((row): PersonaTrainingRestartCandidate => {
        let run: PersonaTrainingPipelineRunRecord
        let consistencyError: string | null = null
        try {
          run = mapPersonaTrainingRunRow(row)
        }
        catch (error) {
          consistencyError = errorMessageFrom(error) ?? String(error)
          run = {
            runId: row.run_id,
            cardId: row.card_id,
            datasetId: row.dataset_id,
            manifestHash: row.manifest_hash,
            sourceIds: parseJsonStringArray(row.source_ids_json),
            basePersonaRevision: row.base_persona_revision,
            status: row.status,
            stage: row.stage,
            progress: Number(row.progress) || 0,
            progressMessage: row.progress_message,
            failureReason: row.failure_reason,
            configSnapshot: parsePersistedPersonaTrainingExecutorConfig(
              row.config_snapshot_json,
              `run ${row.run_id}`,
            ),
            artifact: null,
            error: row.error,
            queuedAt: Number(row.queued_at),
            startedAt: row.started_at == null ? null : Number(row.started_at),
            updatedAt: Number(row.updated_at),
            finishedAt: row.finished_at == null ? null : Number(row.finished_at),
            cancellationRequestedAt: row.cancellation_requested_at == null
              ? null
              : Number(row.cancellation_requested_at),
          }
        }
        let increment: PersonaTrainingPipelineIncrement | null = null
        if (row.increment_id) {
          try {
            increment = {
              id: row.increment_id,
              kind: 'persona-lora-increment',
              cardId: row.increment_card_id!,
              datasetId: row.increment_dataset_id!,
              manifestHash: row.increment_manifest_hash!,
              sourceIds: parseJsonStringArray(row.increment_source_ids_json),
              basePersonaRevision: row.increment_base_persona_revision!,
              artifact: requirePersistedPersonaTrainingArtifact(
                row.increment_artifact_json,
                `increment ${row.increment_id}`,
                row.increment_run_id!,
              ),
              state: row.increment_state!,
              cleanup: null,
              createdAt: Number(row.increment_created_at),
            }
          }
          catch (error) {
            consistencyError ??= errorMessageFrom(error) ?? String(error)
          }
        }
        if (
          !increment
          || increment.state !== 'available'
          || increment.cardId !== run.cardId
          || increment.datasetId !== run.datasetId
          || increment.manifestHash !== run.manifestHash
          || increment.basePersonaRevision !== run.basePersonaRevision
          || [...increment.sourceIds].sort().join('\0') !== [...run.sourceIds].sort().join('\0')
          || !run.artifact
          || serializePersonaTrainingArtifact(increment.artifact) !== serializePersonaTrainingArtifact(run.artifact)
        ) {
          consistencyError ??= 'persisted run and increment artifacts do not form one completed owner scope'
        }
        return {
          run,
          increment,
          consistencyError,
        }
      })
    },
    listRestartOrphanIncrements: async (listInput) => {
      const scopeClause = listInput.cardId
        ? 'AND persona_training_increments.card_id = ?'
        : ''
      const rows = await all<PersonaTrainingIncrementRow>(
        database,
        `
        SELECT persona_training_increments.*
        FROM persona_training_increments
        LEFT JOIN persona_training_runs
          ON persona_training_runs.run_id = persona_training_increments.run_id
        WHERE persona_training_increments.state = 'available'
          ${scopeClause}
          AND (
            persona_training_runs.run_id IS NULL
            OR persona_training_runs.status != 'completed'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM persona_training_artifact_cleanup_intents
            WHERE persona_training_artifact_cleanup_intents.increment_id = persona_training_increments.id
              AND persona_training_artifact_cleanup_intents.status = 'pending'
          )
        ORDER BY persona_training_increments.created_at ASC, persona_training_increments.id ASC
        `,
        listInput.cardId ? [listInput.cardId] : [],
      )
      return rows.flatMap((row) => {
        try {
          return [{
            id: row.id,
            kind: 'persona-lora-increment' as const,
            cardId: row.card_id,
            datasetId: row.dataset_id,
            manifestHash: row.manifest_hash,
            sourceIds: parseJsonStringArray(row.source_ids_json),
            basePersonaRevision: row.base_persona_revision,
            artifact: requirePersistedPersonaTrainingArtifact(
              row.artifact_json,
              `increment ${row.id}`,
              row.run_id,
            ),
            state: row.state,
            cleanup: null,
            createdAt: row.created_at,
          }]
        }
        catch {
          return []
        }
      })
    },
    completeRestartArtifactActivation: async (replaceInput) => {
      const expectedArtifactJson = serializePersonaTrainingArtifact(replaceInput.expectedArtifact)
      const artifactJson = serializePersonaTrainingArtifact(replaceInput.artifact)
      if (!expectedArtifactJson || !artifactJson)
        throw new Error('persona training restart activation requires complete artifacts')
      return await enqueueWrite(async () => await runInTransaction(database, async () => {
        const runUpdated = await run(
          database,
          `
          UPDATE persona_training_runs
          SET artifact_json = ?, updated_at = ?
          WHERE run_id = ?
            AND card_id = ?
            AND status = 'completed'
            AND artifact_json = ?
          `,
          [
            artifactJson,
            replaceInput.at,
            replaceInput.runId,
            replaceInput.cardId,
            expectedArtifactJson,
          ],
        )
        const incrementUpdated = await run(
          database,
          `
          UPDATE persona_training_increments
          SET artifact_json = ?
          WHERE id = ?
            AND run_id = ?
            AND card_id = ?
            AND state = 'available'
            AND artifact_json = ?
          `,
          [
            artifactJson,
            replaceInput.incrementId,
            replaceInput.runId,
            replaceInput.cardId,
            expectedArtifactJson,
          ],
        )
        const activationCompleted = await run(
          database,
          `
          UPDATE persona_training_artifact_activation_intents
          SET status = 'completed', last_error = NULL, updated_at = ?, completed_at = ?
          WHERE ${personaTrainingArtifactActivationOwnerClause}
            AND mode = 'restart'
            AND expected_artifact_json = ?
            AND activated_artifact_json = ?
          `,
          [
            replaceInput.at,
            replaceInput.at,
            ...personaTrainingArtifactActivationOwnerParams(replaceInput),
            expectedArtifactJson,
            artifactJson,
          ],
        )
        if (
          Number(runUpdated?.changes ?? 0) !== 1
          || Number(incrementUpdated?.changes ?? 0) !== 1
          || Number(activationCompleted?.changes ?? 0) !== 1
        ) {
          throw new Error('persona training restart activation lost its atomic compare-and-set')
        }
        return true
      }))
    },
    compareAndSetRestartArtifact: async (replaceInput) => {
      const expectedArtifactJson = serializePersonaTrainingArtifact(replaceInput.expectedArtifact)
      const artifactJson = serializePersonaTrainingArtifact(replaceInput.artifact)
      if (!expectedArtifactJson || !artifactJson)
        throw new Error('persona training restart receipt CAS requires complete artifacts')
      if (
        replaceInput.expectedArtifact.runId !== replaceInput.runId
        || replaceInput.artifact.runId !== replaceInput.runId
        || replaceInput.expectedArtifact.artifactId !== replaceInput.artifactId
        || replaceInput.artifact.artifactId !== replaceInput.artifactId
      ) {
        throw new Error('persona training restart receipt CAS artifact owner does not match')
      }
      return await enqueueWrite(async () => await runInTransaction(database, async () => {
        const runUpdated = await run(
          database,
          `
          UPDATE persona_training_runs
          SET artifact_json = ?, updated_at = ?
          WHERE run_id = ?
            AND card_id = ?
            AND status = 'completed'
            AND artifact_json = ?
          `,
          [
            artifactJson,
            replaceInput.at,
            replaceInput.runId,
            replaceInput.cardId,
            expectedArtifactJson,
          ],
        )
        const incrementUpdated = await run(
          database,
          `
          UPDATE persona_training_increments
          SET artifact_json = ?
          WHERE id = ?
            AND run_id = ?
            AND card_id = ?
            AND state = 'available'
            AND artifact_json = ?
          `,
          [
            artifactJson,
            replaceInput.incrementId,
            replaceInput.runId,
            replaceInput.cardId,
            expectedArtifactJson,
          ],
        )
        if (
          Number(runUpdated?.changes ?? 0) !== 1
          || Number(incrementUpdated?.changes ?? 0) !== 1
        ) {
          throw new Error('persona training restart artifact receipt persistence lost its compare-and-set')
        }
        return true
      }))
    },
    interruptRunAfterRestart: async (interruptInput) => {
      return await enqueueWrite(async () => await runInTransaction(database, async () => {
        const updated = await run(
          database,
          `
          UPDATE persona_training_runs
          SET
            status = 'interrupted',
            stage = 'finalizing',
            progress_message = NULL,
            failure_reason = 'interrupted',
            artifact_json = NULL,
            error = ?,
            updated_at = ?,
            finished_at = ?
          WHERE run_id = ? AND card_id = ? AND status = ?
          `,
          [
            interruptInput.reason,
            interruptInput.at,
            interruptInput.at,
            interruptInput.runId,
            interruptInput.cardId,
            interruptInput.expectedStatus,
          ],
        )
        if (Number(updated?.changes ?? 0) !== 1)
          return false
        await insertPersonaTrainingAuditEvent(interruptInput.event)
        return true
      }))
    },
  }
  async function recordPersonaTrainingSourceProvenance(input: {
    cardId: string
    cleaningTransactionId: string
    cleanedAt: number
    sources: Array<{
      sourceId: string
      sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
    }>
  }) {
    if (input.sources.length === 0)
      return

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const source of input.sources) {
          await run(
            database,
            `
            INSERT INTO persona_training_source_provenance (
              card_id, source_id, source_kind, cleaning_transaction_id, cleaned_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(card_id, source_id, source_kind)
            DO UPDATE SET
              cleaning_transaction_id = excluded.cleaning_transaction_id,
              cleaned_at = excluded.cleaned_at
            `,
            [
              input.cardId,
              source.sourceId,
              source.sourceKind,
              input.cleaningTransactionId,
              input.cleanedAt,
              input.cleanedAt,
            ],
          )
        }
      })
    })
  }
  const personaTrainingDatasetRuntime = createPersonaTrainingDatasetRuntime({
    repository: personaTrainingDatasetRepository,
    now,
    randomUUID,
    listSources: async (cardId): Promise<PersonaTrainingDatasetSource[]> => {
      const [reflections, reinforcements] = await Promise.all([
        memoryRelationshipRuntime.listMemoryReflections({ cardId, limit: 10000, status: 'confirmed' }),
        memoryRelationshipRuntime.listPersonaReinforcementEvents({ cardId, limit: 10000 }),
      ])
      const provenanceRows = await all<{
        source_id: string
        source_kind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
        cleaning_transaction_id: string
        cleaned_at: number
      }>(
        database,
        `
        SELECT source_id, source_kind, cleaning_transaction_id, cleaned_at
        FROM persona_training_source_provenance
        WHERE card_id = ?
        `,
        [cardId],
      )
      const provenanceBySource = new Map(
        provenanceRows.map(row => [
          `${row.source_kind}:${row.source_id}`,
          {
            kind: 'working-memory-cleaning' as const,
            cleaningTransactionId: row.cleaning_transaction_id,
            cleanedAt: row.cleaned_at,
          },
        ]),
      )
      const sourceIds = [
        ...reflections.map(item => item.id),
        ...reinforcements.map(item => item.id),
      ]
      const policies = await memoryWorkbenchPolicyStore.listPolicyOverrides({ cardId, sourceIds })
      const policyBySourceId = new Map(policies.map(policy => [policy.sourceId, policy]))
      return [
        ...reflections.map((reflection) => {
          const provenance = provenanceBySource.get(`cleaned-long-term-reflection:${reflection.id}`) ?? null
          return {
            cardId,
            sourceId: reflection.id,
            sourceKind: 'cleaned-long-term-reflection' as const,
            status: reflection.status,
            cleaned: provenance != null,
            summary: reflection.summary,
            lesson: reflection.lesson,
            sensitivity: 'personal' as const,
            allowTraining: policyBySourceId.get(reflection.id)?.allowTraining === true,
            provenance,
          }
        }),
        ...reinforcements.map((reinforcement) => {
          const provenance = provenanceBySource.get(`persona-reinforcement:${reinforcement.id}`) ?? null
          return {
            cardId,
            sourceId: reinforcement.id,
            sourceKind: 'persona-reinforcement' as const,
            status: 'confirmed',
            cleaned: provenance != null,
            summary: reinforcement.summary,
            lesson: reinforcement.summary,
            positiveExample: reinforcement.valence === 'reinforce' ? reinforcement.summary : null,
            negativeExample: reinforcement.valence === 'suppress' ? reinforcement.summary : null,
            sensitivity: 'personal' as const,
            allowTraining: policyBySourceId.get(reinforcement.id)?.allowTraining === true,
            provenance,
          }
        }),
      ]
    },
  })
  const personaTrainingPipelineGate: PersonaTrainingPipelineGate = createPersonaTrainingPipelineGate({
    datasetRuntime: personaTrainingDatasetRuntime,
    trainingExecutor: options?.personaTrainingExecutor ?? (async () => {
      throw new Error('persona training executor is not configured')
    }),
    artifactLifecycle: options?.personaTrainingArtifactLifecycle,
    artifactLoader: options?.personaTrainingArtifactLoader,
    artifactRecoveryTimeoutMs: options?.personaTrainingArtifactRecoveryTimeoutMs,
    defaultCardId: boundCardId,
    resolveExecutorConfig: options?.resolvePersonaTrainingExecutorConfig,
    persistence: personaTrainingPipelinePersistence,
    now,
    randomUUID,
    basePersonaRevision: async () => await getMetaValue('persona_core_revision') ?? 'persona-core-unversioned',
  })
  async function appendMemoryWorkbenchRecallMetricSafely(
    metric: Parameters<typeof memoryWorkbenchHealthRuntime.appendRecallMetric>[0],
  ) {
    try {
      await memoryWorkbenchHealthRuntime.appendRecallMetric(metric)
    }
    catch {
      // Recall telemetry must not turn a usable memory result into a dialogue failure.
    }
  }
  const longTermMemoryVectorStore = createPersistentLongTermMemoryVectorStore({
    database,
    now,
    run,
    all,
    enqueueWrite,
  })
  const longTermMemoryVectorIndexAdapter = createLongTermMemoryVectorIndexAdapter({
    store: longTermMemoryVectorStore,
    native: createSqliteVecLongTermMemoryVectorBackend({
      database,
      now,
      run,
      get,
      all,
      enqueueWrite,
    }),
  })
  function resolveLongTermMemoryEmbeddingProvider() {
    return options?.resolveEmbeddingProvider?.() ?? options?.embeddingProvider ?? null
  }
  const memoryEmbeddingReindexRuntime = createMemoryEmbeddingReindexRuntime({
    database,
    now,
    randomUUID,
    run,
    get,
    all,
    enqueueWrite,
    runInTransaction,
    resolveProvider: resolveLongTermMemoryEmbeddingProvider,
    prepareProjectionEntries: async ({ cardId, source, sourceIds, limit }) => {
      await rebuildLongTermMemorySearchIndexForCard(
        cardId,
        'memory embedding reindex search projection refresh',
      )
      const entries = await longTermMemorySearchIndexRuntime.listLongTermMemoryEmbeddingCorpus({
        cardId,
        source,
        sourceIds,
        limit,
      })
      return entries.map(entry => ({
        sourceId: entry.sourceId,
        source: entry.source,
        text: entry.text,
        textHash: entry.textHash,
      }))
    },
    upsertVector: async (record) => {
      await longTermMemoryVectorIndexAdapter.upsert([{
        id: `ltm-vector:${record.cardId}:${record.vectorSpaceId}:${record.source}:${record.sourceId}`,
        cardId: record.cardId,
        sourceId: record.sourceId,
        source: record.source,
        text: record.text,
        textHash: record.textHash,
        vector: record.vector,
        modelId: record.modelId,
        dimensions: record.dimensions,
        vectorSpaceId: record.vectorSpaceId,
        status: record.status,
        updatedAt: now(),
        metadata: {
          reindexJob: true,
        },
      }])
    },
    commitVectorAndItem: async ({ item, vector, now: committedAt }) => {
      const vectorRecord = {
        id: `ltm-vector:${vector.cardId}:${vector.vectorSpaceId}:${vector.source}:${vector.sourceId}`,
        cardId: vector.cardId,
        sourceId: vector.sourceId,
        source: vector.source,
        text: vector.text,
        textHash: vector.textHash,
        vector: vector.vector,
        modelId: vector.modelId,
        dimensions: vector.dimensions,
        vectorSpaceId: vector.vectorSpaceId,
        status: vector.status,
        updatedAt: committedAt,
        metadata: {
          reindexJob: true,
        },
      } as const
      const committed = await enqueueWrite(async () => {
        return await runInTransaction(database, async () => {
          const owner = await get<{
            job_status: string
            item_status: string
            lease_token: string | null
          }>(
            database,
            `
            SELECT
              job.status AS job_status,
              item.status AS item_status,
              item.lease_token
            FROM memory_embedding_reindex_items item
            JOIN memory_embedding_reindex_jobs job ON job.id = item.job_id
            WHERE item.id = ? AND item.job_id = ?
            `,
            [item.id, item.jobId],
          )
          if (
            owner?.job_status !== 'running'
            || owner.item_status !== 'leased'
            || owner.lease_token !== item.leaseToken
          ) {
            return false
          }

          await longTermMemoryVectorStore.upsertVectorsInTransaction([vectorRecord])
          await run(database, `
            UPDATE memory_embedding_reindex_items
            SET status = 'indexed',
                lease_token = NULL,
                lease_expires_at = NULL,
                next_retry_at = NULL,
                last_error = NULL,
                indexed_at = ?,
                updated_at = ?
            WHERE id = ?
              AND job_id = ?
              AND status = 'leased'
              AND lease_token = ?
          `, [committedAt, committedAt, item.id, item.jobId, item.leaseToken])
          return true
        })
      })
      if (committed)
        await longTermMemoryVectorIndexAdapter.upsertNative([vectorRecord])
      return committed
    },
  })
  const memorySemanticScaleJobRuntime = createMemorySemanticScaleJobRuntime({
    database,
    now,
    randomUUID,
    run,
    get,
    all,
    enqueueWrite,
    runInTransaction,
    resolveEmbeddingProvider: options?.semanticScaleJobOptions?.resolveEmbeddingProvider
      ?? resolveLongTermMemoryEmbeddingProvider,
    executeJob: options?.semanticScaleJobOptions?.executeJob,
    maxAttempts: options?.semanticScaleJobOptions?.maxAttempts,
    leaseMs: options?.semanticScaleJobOptions?.leaseMs,
    retryBaseMs: options?.semanticScaleJobOptions?.retryBaseMs,
    retryMaxMs: options?.semanticScaleJobOptions?.retryMaxMs,
    tempRootDir: options?.semanticScaleJobOptions?.tempRootDir,
    recoveryAtomicWriteOptions: {
      appendAuditLog,
    },
  })
  const memoryWorkbenchPersonaCandidateRuntime = createMemoryWorkbenchPersonaCandidateRuntime({
    database,
    now,
    randomUUID,
    run,
    all,
    enqueueWrite,
    runInTransaction,
    policyStore: memoryWorkbenchPolicyStore,
    listMemoryReflections: memoryRelationshipRuntime.listMemoryReflections,
    listPersonaReinforcementEvents: memoryRelationshipRuntime.listPersonaReinforcementEvents,
    listTombstonedLongTermMemorySourceIds,
  })

  async function rebuildLongTermMemorySearchIndexForCard(cardIdRaw: string, operation: string) {
    const cardId = resolveMemoryCardId(cardIdRaw, operation)
    const result = await longTermMemorySearchIndexRuntime.rebuildLongTermMemorySearchIndex({ cardId })
    await longTermMemoryVectorIndexAdapter.pruneOrphaned({ cardId })
    return result
  }

  async function rebuildLongTermMemorySearchIndexForCards(cardIds: string[], operation: string) {
    const uniqueCardIds = [...new Set(cardIds.map(cardId => normalizeOrganicMemoryText(cardId, 120)).filter(Boolean))]
    for (const cardId of uniqueCardIds)
      await rebuildLongTermMemorySearchIndexForCard(cardId, operation)
  }

  async function upsertMemoryReflections(entries: AlicizationMemoryReflectionInput[]) {
    if (hasBoundCardScope) {
      for (const entry of entries)
        resolveMemoryCardId(entry.cardId, 'memory reflection write')
    }
    const records = await memoryRelationshipRuntime.upsertMemoryReflections(entries)
    await rebuildLongTermMemorySearchIndexForCards(
      records.map(record => record.cardId),
      'memory reflection search index rebuild',
    )
    return records
  }

  async function persistWorkingMemoryLongTermTransaction(
    transaction: Parameters<typeof workingMemoryLongTermCleaningStore.updateTransaction>[0],
    status: Parameters<typeof workingMemoryLongTermCleaningStore.updateTransaction>[1],
  ) {
    await enqueueWrite(async () => {
      await workingMemoryLongTermCleaningStore.updateTransaction(transaction, status)
    })
  }

  async function enqueueWorkingMemoryLongTermQueueItems(input: {
    cardId: string
    sessionId: string
    items: WorkingMemoryLongTermQueueItem[]
  }) {
    if (input.items.length === 0)
      return

    const currentTs = now()
    const transactions = input.items.map(item =>
      createWorkingMemoryLongTermCleaningTransaction({
        cardId: input.cardId,
        sessionId: input.sessionId,
        item,
        now: currentTs,
      }),
    )

    await enqueueWrite(async () => {
      await workingMemoryLongTermCleaningStore.enqueueTransactions(transactions)
    })
  }

  async function drainWorkingMemoryLongTermTransactions(
    rows: WorkingMemoryLongTermCleaningTransaction[],
  ) {
    let cleaned = 0
    let admitted = 0
    let applied = 0
    let rejected = 0
    let review = 0
    let failed = 0

    const persistCleaningFailure = async (
      transaction: WorkingMemoryLongTermCleaningTransaction,
      error: unknown,
    ) => {
      const attemptCount = transaction.attemptCount + 1
      const deadLettered = attemptCount >= WORKING_MEMORY_LONG_TERM_CLEANING_MAX_ATTEMPTS
      const updatedAt = now()
      const lastError = errorMessageFrom(error) ?? String(error)
      await persistWorkingMemoryLongTermTransaction({
        ...transaction,
        status: deadLettered ? 'dead-lettered' : 'failed',
        lastError,
        attemptCount,
        updatedAt,
        nextAttemptAt: deadLettered
          ? null
          : updatedAt + workingMemoryLongTermCleaningRetryDelayMs(attemptCount),
      }, deadLettered ? 'dead-lettered' : 'failed')
    }

    for (const row of rows) {
      try {
        const existingMemoryEvidence = normalizeWorkingMemoryLongTermEvidence(row.item.memoryEvidence)
        const cleanedTransaction = row.status === 'admitted'
          && row.decision === 'admit'
          && row.cleanedCandidate
          && existingMemoryEvidence
          ? {
              ...row,
              status: 'admitted' as const,
              reviewReasons: [],
              rejectionReasons: [],
              updatedAt: now(),
              nextAttemptAt: now(),
            }
          : cleanWorkingMemoryLongTermQueueItem({
              cardId: row.cardId,
              sessionId: row.sessionId,
              item: row.item,
              now: now(),
            })
        cleaned += 1

        if (cleanedTransaction.status === 'rejected') {
          rejected += 1
          await persistWorkingMemoryLongTermTransaction(cleanedTransaction, 'rejected')
          continue
        }

        if (cleanedTransaction.status === 'needs-user-review') {
          review += 1
          await persistWorkingMemoryLongTermTransaction(cleanedTransaction, 'needs-user-review')
          continue
        }

        if (!cleanedTransaction.cleanedCandidate) {
          failed += 1
          await persistCleaningFailure(row, new Error('admitted transaction missing cleaned candidate'))
          continue
        }

        const candidateSourceIds = [
          cleanedTransaction.cleanedCandidate.id,
          cleanedTransaction.queueItemId,
        ]
        const tombstonedCandidateSourceIds = await listTombstonedLongTermMemorySourceIds(candidateSourceIds, cleanedTransaction.cardId)
        if (tombstonedCandidateSourceIds.size > 0) {
          rejected += 1
          await persistWorkingMemoryLongTermTransaction({
            ...cleanedTransaction,
            status: 'rejected',
            decision: 'reject',
            allowTraining: false,
            rejectionReasons: Array.from(new Set([
              ...cleanedTransaction.rejectionReasons,
              'tombstoned-before-admission',
            ])),
            reviewReasons: [],
            updatedAt: now(),
            nextAttemptAt: null,
          }, 'rejected')
          continue
        }

        admitted += 1
        const projectionTs = now()
        const projections = projectWorkingMemoryLongTermCandidate({
          candidate: cleanedTransaction.cleanedCandidate,
          now: projectionTs,
        })

        await persistWorkingMemoryLongTermTransaction({
          ...cleanedTransaction,
          projections,
          status: 'admitted',
          updatedAt: projectionTs,
          nextAttemptAt: projectionTs,
        }, 'admitted')

        let persistedReflections: AlicizationMemoryReflectionRecord[] = []
        let persistedEpisodes: AlicizationEpisodicEventRecord[] = []
        let persistedPersonaReinforcements: AlicizationPersonaReinforcementEventRecord[] = []
        if (projections.memoryFacts.length > 0) {
          if (hasBoundCardScope)
            resolveMemoryCardId(cleanedTransaction.cardId, 'working memory projection')
          await upsertMemoryFacts(projections.memoryFacts, 'rule')
        }
        if (projections.memoryReflections.length > 0)
          persistedReflections = await upsertMemoryReflections(projections.memoryReflections)
        if (projections.episodicEvents.length > 0)
          persistedEpisodes = await appendEpisodicEvents(projections.episodicEvents)
        if (projections.personaReinforcements.length > 0)
          persistedPersonaReinforcements = await memoryRelationshipRuntime.appendPersonaReinforcementEvents(projections.personaReinforcements)

        await recordPersonaTrainingSourceProvenance({
          cardId: cleanedTransaction.cardId,
          cleaningTransactionId: cleanedTransaction.id,
          cleanedAt: projectionTs,
          sources: [
            ...persistedReflections.map(item => ({
              sourceId: item.id,
              sourceKind: 'cleaned-long-term-reflection' as const,
            })),
            ...persistedPersonaReinforcements.map(item => ({
              sourceId: item.id,
              sourceKind: 'persona-reinforcement' as const,
            })),
          ],
        })

        const projectedFactSources = await findProjectedMemoryFactSourcesByCandidateId(
          cleanedTransaction.cardId,
          cleanedTransaction.cleanedCandidate.id,
        )
        const projectedSources = [
          ...projectedFactSources,
          ...persistedReflections.map(item => ({ sourceId: item.id, source: 'memory_reflections' })),
          ...persistedEpisodes.map(item => ({ sourceId: item.id, source: 'episodic_events' })),
        ]
        if (projectedSources.length > 0) {
          await memoryWorkbenchPolicyStore.inheritCandidatePolicies({
            cardId: cleanedTransaction.cardId,
            candidateSourceIds,
            projectedSources,
          })
        }

        await persistWorkingMemoryLongTermTransaction({
          ...cleanedTransaction,
          projections,
          status: 'applied',
          updatedAt: now(),
          appliedAt: now(),
          nextAttemptAt: null,
        }, 'applied')
        applied += 1
      }
      catch (error) {
        failed += 1
        await persistCleaningFailure(row, error)
      }
    }

    return {
      cleaned,
      admitted,
      applied,
      rejected,
      review,
      failed,
    }
  }

  async function drainWorkingMemoryLongTermQueue(limit = 4) {
    return await workingMemoryLongTermDrainMutex.run(async () => {
      const result = await drainWorkingMemoryLongTermTransactions(
        await workingMemoryLongTermCleaningStore.listDueTransactions(limit, now()),
      )
      const pending = (await workingMemoryLongTermCleaningStore.listDueTransactions(32, now())).length
      return {
        ...result,
        pending,
      }
    })
  }

  async function drainWorkingMemoryLongTermQueueScoped(input: {
    cardId: string
    sessionId: string
    queueItemIds: string[]
  }) {
    return await workingMemoryLongTermDrainMutex.run(async () => {
      const queueItemIds = [...new Set(
        input.queueItemIds
          .map(queueItemId => queueItemId.trim())
          .filter(Boolean),
      )]
      const scope = {
        cardId: input.cardId,
        sessionId: input.sessionId,
        queueItemIds,
      }
      const result = await drainWorkingMemoryLongTermTransactions(
        await workingMemoryLongTermCleaningStore.listDueTransactionsByScope(scope),
      )
      const transactions = await workingMemoryLongTermCleaningStore.listTransactionsByScope(scope)
      const transactionByQueueItemId = new Map(
        transactions.map(transaction => [transaction.queueItemId, transaction]),
      )
      const settlements = queueItemIds.map((queueItemId) => {
        const transaction = transactionByQueueItemId.get(queueItemId)
        if (!transaction) {
          return {
            queueItemId,
            transactionId: null,
            status: 'missing' as const,
            errorSummary: 'queue item was not found in the requested scope',
          }
        }
        return {
          queueItemId,
          transactionId: transaction.id,
          status: transaction.status,
          errorSummary: transaction.lastError,
        }
      })

      return {
        cleaned: result.cleaned,
        admitted: result.admitted,
        applied: settlements.filter(settlement => settlement.status === 'applied').length,
        rejected: settlements.filter(settlement => settlement.status === 'rejected').length,
        review: settlements.filter(settlement => settlement.status === 'needs-user-review').length,
        failed: settlements.filter(settlement =>
          settlement.status === 'failed' || settlement.status === 'dead-lettered',
        ).length,
        pending: settlements.filter(settlement =>
          settlement.status === 'pending-cleaning'
          || settlement.status === 'cleaning'
          || settlement.status === 'admitted',
        ).length,
        settlements,
      }
    })
  }

  async function listLongTermMemoryReviewItems(input: {
    cardId: string
    limit?: number
  }): Promise<LongTermMemoryReviewItem[]> {
    const rows = await workingMemoryLongTermCleaningStore.listReviewTransactions({
      cardId: input.cardId,
      limit: input.limit,
    })
    return rows
      .map(transaction => createLongTermMemoryReviewItemFromTransaction({
        transaction,
        now: now(),
      }))
      .filter((item): item is LongTermMemoryReviewItem => Boolean(item))
  }

  async function applyLongTermMemoryReviewDecision(input: {
    cardId: string
    reviewItemId: string
    decision: LongTermMemoryReviewDecision
  }): Promise<LongTermMemoryReviewItem | null> {
    const reviewItemId = input.reviewItemId.trim()
    if (!reviewItemId)
      return null

    const rows = await workingMemoryLongTermCleaningStore.listReviewTransactions({
      cardId: input.cardId,
      limit: 64,
    })
    for (const transaction of rows) {
      const reviewItem = createLongTermMemoryReviewItemFromTransaction({
        transaction,
        now: now(),
      })
      if (!reviewItem || reviewItem.id !== reviewItemId)
        continue

      const result = applyLongTermMemoryReviewDecisionToTransaction({
        item: reviewItem,
        transaction,
        decision: input.decision,
        now: now(),
      })
      await persistWorkingMemoryLongTermTransaction(result.transaction, result.transaction.status)
      return result.item
    }
    return null
  }

  function normalizeLongTermMemorySourceIds(sourceIds: string[]) {
    const seen = new Set<string>()
    const result: string[] = []
    for (const sourceId of sourceIds) {
      const normalized = sourceId.trim()
      if (!normalized || seen.has(normalized))
        continue
      seen.add(normalized)
      result.push(normalized)
    }
    return result
  }

  async function tombstoneLongTermMemorySources(input: {
    sourceIds: string[]
    source?: string
    reason?: string | null
  }) {
    const cardId = boundCardId
    const source = normalizeOrganicMemoryText(input.source, 120) || 'long_term_memory'
    const sourceIds = normalizeLongTermMemorySourceIds(input.sourceIds)
    if (sourceIds.length === 0)
      return

    const createdAt = now()
    const reason = input.reason?.trim() || null
    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const sourceId of sourceIds) {
          await run(
            database,
            `
            INSERT OR REPLACE INTO long_term_memory_tombstones (
              id,
              card_id,
              source_id,
              source,
              reason,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              `ltm-tombstone:${cardId}:${source}:${sourceId}`,
              cardId,
              sourceId,
              source,
              reason,
              createdAt,
            ],
          )
        }
      })
    })
    for (const sourceId of sourceIds) {
      await personaTrainingDatasetRuntime.revokeSource({
        cardId,
        sourceId,
      }).catch(() => {})
    }
  }

  async function listTombstonedLongTermMemorySourceIds(
    sourceIds: string[],
    cardIdRaw = boundCardId,
    sourceRaw = 'long_term_memory',
  ) {
    const sourceSet = new Set(normalizeLongTermMemorySourceIds(sourceIds))
    if (sourceSet.size === 0)
      return new Set<string>()
    const cardId = resolveMemoryCardId(cardIdRaw, 'long-term memory tombstone lookup')
    const source = normalizeOrganicMemoryText(sourceRaw, 120) || 'long_term_memory'

    const rows = await all<{ source_id: string }>(
      database,
      `SELECT source_id
       FROM long_term_memory_tombstones
       WHERE card_id = ?
         AND (source = ? OR source = 'long_term_memory')`,
      [cardId, source],
    )
    return new Set(rows.map(row => row.source_id).filter(sourceId => sourceSet.has(sourceId)))
  }

  const memorySubconsciousRuntime = createAlicizationMemorySubconsciousRuntime({
    database,
    now,
    randomUUID,
    run,
    get,
    all,
    enqueueWrite,
    runInTransaction,
    normalizeOrganicMemoryText,
    mapFragmentSourceKindToProvenance,
  })

  async function searchEpisodicEvents(input: {
    recallSeed: string
    limit?: number
    sessionId?: string | null
    turnId?: string | null
    threadAnchors?: string[]
    affectAnchors?: string[]
    relationshipAnchors?: string[]
    sceneAnchor?: string | null
    salienceBias?: number | null
    carryAsMemory?: boolean
    allowDream?: boolean
    recollectionIntent?: AlicizationMemoryRecollectionIntentLike | null
    reconsolidationDecisionTraceId?: string | null
    readOnly?: boolean
  }) {
    const recallSeed = input.recallSeed.trim()
    if (!recallSeed)
      return []

    const retrievalStartedAt = now()
    const safeLimit = Math.max(1, Math.min(12, Math.floor(input.limit ?? 4)))
    const rows = await all<DbEpisodicEventRow>(
      database,
      `
      SELECT *
      FROM episodic_events
      ${hasBoundCardScope ? 'WHERE card_id = ?' : ''}
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT 4000
      `,
      hasBoundCardScope ? [boundCardId] : [],
    )
    const nowTs = now()
    const recollectionIntent = input.recollectionIntent ?? null
    const correctionShapingRationale = (
      (input.affectAnchors?.length ?? 0) > 0
      || (input.relationshipAnchors?.length ?? 0) > 0
    )
      ? normalizeOrganicMemoryText(recollectionIntent?.rationale ?? '', 200)
      : ''
    const graphBoostByEventId = await memoryEventGraphRuntime.scoreEventGraphNeighborhood({
      eventIds: rows.map(row => row.id),
      queryTexts: [
        recallSeed,
        ...(recollectionIntent?.queryHints ?? []),
        ...(recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []),
        correctionShapingRationale,
      ],
    })
    const overlayByEventId = await loadLatestEpisodicReconsolidationOverlayByEventId(
      database,
      all,
      rows.map(row => row.id),
    )
    const selected = rankAlicizationEpisodicEvents({
      events: rows.map((row) => {
        const overlay = overlayByEventId.get(row.id)
        return mapEpisodicEventRow(row, overlay
          ? {
              latest: overlay.latest ? mapEpisodicReconsolidationOverlayRow(overlay.latest) : null,
              count: overlay.count,
            }
          : null)
      }),
      recallSeed,
      limit: safeLimit,
      nowTs,
      sessionId: input.sessionId,
      turnId: input.turnId,
      threadAnchors: input.threadAnchors,
      affectAnchors: input.affectAnchors,
      relationshipAnchors: input.relationshipAnchors,
      sceneAnchor: input.sceneAnchor,
      salienceBias: input.salienceBias,
      carryAsMemory: input.carryAsMemory,
      allowDream: input.allowDream,
      recollectionIntent,
      correctionShapingRationale,
      graphBoostByEventId,
    })

    if (selected.length === 0) {
      if (!input.readOnly)
        await recordMemoryGraphRetrievalLatency(now() - retrievalStartedAt)
      return []
    }

    if (input.readOnly)
      return selected.map(item => item.event)

    const returned = await memoryEpisodicReconsolidationRuntime.reconcileSelectedEvents({
      selected,
      recalledAt: nowTs,
      affectAnchors: input.affectAnchors,
      relationshipAnchors: input.relationshipAnchors,
      carryAsMemory: input.carryAsMemory,
      correctionShapingRationale,
      reconsolidationDecisionTraceId: input.reconsolidationDecisionTraceId,
    })
    if ((input.carryAsMemory || input.reconsolidationDecisionTraceId) && returned.length > 0) {
      for (const cardId of new Set(returned.map(event => event.cardId).filter(Boolean))) {
        await rebuildMemoryConsolidationsFromEvents(cardId)
        await rebuildLongTermMemorySearchIndexForCard(cardId, 'episodic reconsolidation search index rebuild')
      }
    }
    await recordMemoryGraphRetrievalLatency(now() - retrievalStartedAt)

    return returned
  }

  async function retrieveLongTermMemoryEvidence(input: {
    cardId: string
    userId?: string
    currentUserText: string
    workingMemoryQueryHints?: string[]
    currentThreadTitle?: string | null
    activeTask?: string | null
    limit?: number
  }): Promise<LongTermMemoryEvidenceBundle> {
    const startedAt = now()
    const semantic = await getMemoryWorkbenchRecallProbeSemantic({ cardId: input.cardId }).catch(() => ({
      available: false,
    }))
    try {
      const result = await retrieveLongTermMemoryEvidenceInternal(input)
      const { bundle } = result
      await appendMemoryWorkbenchRecallMetricSafely({
        cardId: input.cardId,
        query: input.currentUserText,
        mode: bundle.intent.mode,
        latencyMs: now() - startedAt,
        evidenceCount: bundle.evidence.length,
        semanticAvailable: semantic.available,
        error: result.semanticError,
      })
      return bundle
    }
    catch (error) {
      await appendMemoryWorkbenchRecallMetricSafely({
        cardId: input.cardId,
        query: input.currentUserText,
        mode: 'none',
        latencyMs: now() - startedAt,
        evidenceCount: 0,
        semanticAvailable: semantic.available,
        error: errorMessageFrom(error) ?? String(error),
      })
      throw error
    }
  }

  async function retrieveLongTermMemoryEvidenceReadOnly(input: {
    cardId: string
    userId?: string
    currentUserText: string
    workingMemoryQueryHints?: string[]
    currentThreadTitle?: string | null
    activeTask?: string | null
    limit?: number
  }): Promise<LongTermMemoryEvidenceBundle> {
    resolveMemoryCardId(input.cardId, 'read-only long-term memory recall')
    return (await retrieveLongTermMemoryEvidenceInternal({
      ...input,
      readOnly: true,
    })).bundle
  }

  async function retrieveLongTermMemoryEvidenceInternal(input: {
    cardId: string
    userId?: string
    currentUserText: string
    workingMemoryQueryHints?: string[]
    currentThreadTitle?: string | null
    activeTask?: string | null
    limit?: number
    readOnly?: boolean
  }): Promise<LongTermMemoryEvidenceRetrievalDiagnostics> {
    const intent = deriveLongTermMemoryRecallIntent({
      currentUserText: input.currentUserText,
      workingMemoryQueryHints: input.workingMemoryQueryHints,
      currentThreadTitle: input.currentThreadTitle,
      activeTask: input.activeTask,
    })
    const plan = buildLongTermMemoryQueryPlan({
      intent,
      currentUserText: input.currentUserText,
      workingMemoryQueryHints: input.workingMemoryQueryHints,
      currentThreadTitle: input.currentThreadTitle,
      activeTask: input.activeTask,
    })
    const safeLimit = Math.max(1, Math.min(8, Math.floor(input.limit ?? 5)))
    if (!intent.shouldRecall) {
      return {
        bundle: buildLongTermMemoryEvidenceBundle({
          intent,
          plan,
          candidates: [],
          now: now(),
          limit: safeLimit,
          scope: {
            userId: input.userId ?? 'local-user',
            cardId: input.cardId,
          },
        }),
        semanticError: null,
      }
    }

    const recallSeed = [
      plan.normalizedQuery,
      ...plan.keywordQueries,
      ...plan.phraseQueries,
      ...plan.charGramQueries,
      ...plan.semanticQueries,
      ...plan.episodicQueries,
    ].filter(Boolean).join(' ')
    const sourceLimit = Math.max(8, safeLimit * 4)
    const [indexed, episodes] = await Promise.all([
      longTermMemorySearchIndexRuntime.listLongTermMemorySearchItems({
        cardId: input.cardId,
        query: recallSeed,
        limit: Math.max(32, safeLimit * 8),
      }).catch(() => ({ items: [], nextCursor: null })),
      searchEpisodicEvents({
        recallSeed,
        limit: sourceLimit,
        readOnly: input.readOnly,
      }).catch(() => []),
    ])

    const candidates = [
      ...indexed.items.map(memoryWorkbenchItemToEvidenceCandidate),
      ...episodes.map(episodicEventToLongTermEvidenceCandidate),
    ]
      .filter((candidate, index, values) =>
        values.findIndex(other => other.id === candidate.id && other.source === candidate.source) === index,
      )
    const tombstonedSourceIdsBySource = new Map<string, Set<string>>()
    for (const source of new Set(candidates.map(candidate => candidate.source))) {
      tombstonedSourceIdsBySource.set(
        source,
        await listTombstonedLongTermMemorySourceIds(
          candidates.filter(candidate => candidate.source === source).map(candidate => candidate.id),
          input.cardId,
          source,
        ),
      )
    }
    const visibleCandidates = candidates.filter(candidate => !tombstonedSourceIdsBySource.get(candidate.source)?.has(candidate.id))
    const semantic = await retrieveLongTermMemorySemanticScores({
      cardId: input.cardId,
      plan,
      candidates: visibleCandidates,
      limit: safeLimit,
    }).catch(error => ({
      scores: {},
      candidates: [],
      error: errorMessageFrom(error) ?? String(error),
    }))
    const semanticCandidates = semantic.candidates.filter(candidate =>
      !visibleCandidates.some(existing => existing.id === candidate.id && existing.source === candidate.source),
    )
    const semanticTombstoned = await listTombstonedLongTermMemorySourceIds(
      semanticCandidates.map(candidate => candidate.id),
      input.cardId,
    )
    const mergedCandidates = [
      ...visibleCandidates,
      ...semanticCandidates.filter(candidate => !semanticTombstoned.has(candidate.id)),
    ]

    return {
      bundle: buildLongTermMemoryEvidenceBundle({
        intent,
        plan,
        now: now(),
        limit: safeLimit,
        candidates: mergedCandidates,
        semanticScores: semantic.scores,
        scope: {
          userId: input.userId ?? 'local-user',
          cardId: input.cardId,
        },
      }),
      semanticError: semantic.error,
    }
  }

  async function retrieveLongTermMemorySemanticScores(input: {
    cardId: string
    plan: LongTermMemoryQueryPlan
    candidates: LongTermMemoryEvidenceCandidate[]
    limit: number
  }) {
    const provider = resolveLongTermMemoryEmbeddingProvider()
    if (!provider)
      return { scores: {}, candidates: [], error: null }

    const queryText = normalizeOrganicMemoryText([
      input.plan.normalizedQuery,
      ...input.plan.semanticQueries,
      ...input.plan.keywordQueries,
      ...input.plan.phraseQueries,
      ...input.plan.episodicQueries,
      ...input.plan.entityHints,
      ...input.plan.procedureHints,
      ...input.plan.threadHints,
    ].filter(Boolean).join(' '), 1000)
    if (!queryText)
      return { scores: {}, candidates: [], error: null }

    const embedded = await safeEmbedLongTermMemoryTexts({
      provider,
      texts: [queryText],
    })
    if (embedded.status === 'failed' || embedded.error) {
      return {
        scores: {},
        candidates: [],
        error: embedded.error ?? 'embedding failed',
      }
    }
    const queryEmbedding = embedded.embeddings[0]
    if (!queryEmbedding) {
      return {
        scores: {},
        candidates: [],
        error: embedded.status === 'unavailable' ? null : 'embedding provider returned no valid query vector',
      }
    }

    const results = await longTermMemoryVectorIndexAdapter.search({
      queryVector: queryEmbedding.vector,
      cardId: input.cardId,
      modelId: queryEmbedding.modelId,
      dimensions: queryEmbedding.dimensions,
      vectorSpaceId: queryEmbedding.vectorSpaceId,
      limit: Math.max(8, input.limit * 4),
    })
    const semanticScores: Record<string, number> = {}
    const semanticCandidates: LongTermMemoryEvidenceCandidate[] = []
    for (const result of results) {
      const metadataWorkbenchItemId = typeof result.record.metadata?.workbenchItemId === 'string'
        ? normalizeOrganicMemoryText(result.record.metadata.workbenchItemId, 240)
        : ''
      const matchingCandidate = input.candidates.find(candidate =>
        [candidate.id, candidate.source].includes(metadataWorkbenchItemId)
        || candidate.id === result.record.sourceId,
      )
      const candidate = matchingCandidate ?? persistentVectorRecordToEvidenceCandidate(result.record)
      if (!semanticCandidates.some(existing => existing.id === candidate.id && existing.source === candidate.source))
        semanticCandidates.push(candidate)
      semanticScores[candidate.id] = Math.max(semanticScores[candidate.id] ?? 0, result.score)
    }
    return { scores: semanticScores, candidates: semanticCandidates, error: null }
  }

  async function findProjectedMemoryFactSourcesByCandidateId(cardId: string, candidateId: string) {
    const sourceLabel = `working-memory-owner:${candidateId}`
    if (hasBoundCardScope)
      resolveMemoryCardId(cardId, 'working memory fact projection lookup')
    const facts = await listMemoryFacts()
    return facts
      .filter(fact => fact.sourceLabel === sourceLabel)
      .map(fact => ({ sourceId: fact.id, source: 'memory_facts' }))
  }

  function projectLongTermReviewItemForWorkbench(item: LongTermMemoryReviewItem): AlicizationLongTermMemoryReviewItem {
    return {
      id: item.id,
      transactionId: item.transactionId,
      status: item.status,
      kind: item.kind,
      summary: item.summary,
      evidenceSnippets: item.evidenceSnippets,
      reviewReasons: item.reviewReasons,
      sensitivity: item.sensitivity,
      visibleMode: item.visibleMode,
      allowTraining: item.allowTraining,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }

  function projectWorkingMemoryCleaningQueueItemForWorkbench(
    transaction: WorkingMemoryLongTermCleaningTransaction,
  ): AlicizationWorkingMemoryCleaningQueueItem {
    return {
      itemId: transaction.id,
      source: transaction.source,
      sourceId: transaction.queueItemId,
      status: transaction.status as AlicizationWorkingMemoryCleaningQueueItem['status'],
      attemptCount: transaction.attemptCount,
      lastError: transaction.lastError,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      nextAttemptAt: transaction.nextAttemptAt,
    }
  }

  async function listMemoryWorkbenchLongTermItems(input: {
    cardId: string
    kind?: AlicizationMemoryWorkbenchKind | 'all'
    query?: string
    sensitivity?: AlicizationMemoryWorkbenchSensitivity | 'all'
    visibility?: AlicizationMemoryWorkbenchVisibility | 'all'
    training?: AlicizationMemoryWorkbenchTrainingState | 'all'
    source?: string
    limit?: number
    cursor?: string | null
  }) {
    const cardId = resolveMemoryCardId(input.cardId, 'memory workbench long-term list')
    return await longTermMemorySearchIndexRuntime.listLongTermMemorySearchItems({
      ...input,
      cardId,
    })
  }

  async function rebuildLongTermMemorySearchIndex(input: { cardId: string }) {
    return await rebuildLongTermMemorySearchIndexForCard(input.cardId, 'memory search index rebuild')
  }

  async function listMemoryWorkbenchReviewItems(input: { cardId: string, limit?: number }) {
    const items = await listLongTermMemoryReviewItems(input)
    const sourceIds = items.flatMap(item => item.sourceMemoryIds)
    const policies = await memoryWorkbenchPolicyStore.listPolicyOverrides({
      cardId: input.cardId,
      sourceIds,
    })
    const policyBySourceId = new Map(policies.map(policy => [policy.sourceId, policy]))

    return items.map((item) => {
      const policy = item.sourceMemoryIds
        .map(sourceId => policyBySourceId.get(sourceId))
        .find(Boolean)
      return {
        ...projectLongTermReviewItemForWorkbench(item),
        visibleMode: policy?.visibleMode ?? item.visibleMode,
        allowTraining: policy?.allowTraining ?? item.allowTraining,
      }
    })
  }

  async function applyMemoryWorkbenchReviewAction(input: {
    cardId: string
    reviewItemId: string
    decision: AlicizationMemoryWorkbenchReviewDecision
    reason?: string | null
  }) {
    if (input.decision === 'inward-only' || input.decision === 'no-training') {
      const item = (await listLongTermMemoryReviewItems({ cardId: input.cardId, limit: 128 }))
        .find(row => row.id === input.reviewItemId)
      if (!item)
        return null

      const sourceIds = item.sourceMemoryIds.length > 0 ? item.sourceMemoryIds : [item.transactionId]
      const existingPolicies = await memoryWorkbenchPolicyStore.listPolicyOverrides({
        cardId: input.cardId,
        sourceIds,
      })
      const existingPolicyBySourceId = new Map(existingPolicies.map(policy => [policy.sourceId, policy]))
      for (const sourceId of sourceIds) {
        const existingPolicy = existingPolicyBySourceId.get(sourceId)
        await memoryWorkbenchPolicyStore.upsertPolicyOverride({
          cardId: input.cardId,
          sourceId,
          source: 'working_memory_long_term_candidate',
          visibleMode: input.decision === 'inward-only' ? 'inward-only' : existingPolicy?.visibleMode ?? item.visibleMode,
          allowTraining: false,
          reviewState: input.decision,
          reason: input.reason,
        })
      }

      const firstExistingPolicy = existingPolicies[0]
      return {
        ...projectLongTermReviewItemForWorkbench(item),
        visibleMode: input.decision === 'inward-only' ? 'inward-only' : firstExistingPolicy?.visibleMode ?? item.visibleMode,
        allowTraining: false,
      }
    }
    const decision: LongTermMemoryReviewDecision = input.decision === 'approve'
      ? 'approve'
      : input.decision === 'tombstone'
        ? 'tombstone'
        : 'reject'
    const result = await applyLongTermMemoryReviewDecision({
      cardId: input.cardId,
      reviewItemId: input.reviewItemId,
      decision,
    })
    if (result && input.decision === 'tombstone') {
      await tombstoneLongTermMemorySources({
        sourceIds: result.sourceMemoryIds.length > 0 ? result.sourceMemoryIds : [result.transactionId],
        reason: input.reason ?? 'user-tombstoned-review-item',
      })
    }
    return result ? projectLongTermReviewItemForWorkbench(result) : null
  }

  async function runMemoryWorkbenchRecallProbe(input: {
    cardId: string
    query: string
    sessionId?: string | null
    includeWorkingMemory?: boolean
    limit?: number
  }): Promise<AlicizationMemoryRecallProbeResult> {
    const startedAt = now()
    const query = normalizeOrganicMemoryText(input.query, 600)
    const semantic = await getMemoryWorkbenchRecallProbeSemantic({ cardId: input.cardId })
    if (!query) {
      return {
        query: '',
        intent: {
          mode: 'none',
          shouldRecall: false,
          confidence: 0,
          rationale: 'empty-query',
          temporalFocus: 'unspecified',
          riskFlags: ['empty-query'],
        },
        plan: {
          keywordQueries: [],
          phraseQueries: [],
          charGramQueries: [],
          semanticQueries: [],
          episodicQueries: [],
          threadHints: [],
          negativeCues: [],
          riskFlags: ['empty-query'],
        },
        evidence: [],
        semantic,
        latencyMs: now() - startedAt,
        errors: [],
      }
    }
    try {
      const result = await retrieveLongTermMemoryEvidenceInternal({
        cardId: input.cardId,
        currentUserText: query,
        limit: input.limit,
      })
      const { bundle } = result
      const latencyMs = now() - startedAt
      await appendMemoryWorkbenchRecallMetricSafely({
        cardId: input.cardId,
        query,
        mode: bundle.intent.mode,
        latencyMs,
        evidenceCount: bundle.evidence.length,
        semanticAvailable: semantic.available,
        error: result.semanticError,
      })
      return {
        query,
        intent: {
          mode: bundle.intent.mode,
          shouldRecall: bundle.intent.shouldRecall,
          confidence: bundle.intent.confidence,
          rationale: bundle.intent.rationale,
          temporalFocus: bundle.intent.temporalFocus,
          riskFlags: bundle.intent.riskFlags,
        },
        plan: {
          keywordQueries: bundle.plan.keywordQueries,
          phraseQueries: bundle.plan.phraseQueries,
          charGramQueries: bundle.plan.charGramQueries,
          semanticQueries: bundle.plan.semanticQueries,
          episodicQueries: bundle.plan.episodicQueries,
          threadHints: bundle.plan.threadHints,
          negativeCues: bundle.plan.negativeCues,
          riskFlags: bundle.plan.riskFlags,
        },
        evidence: bundle.evidence.map(item => ({
          id: item.candidate.id,
          kind: item.candidate.kind,
          summary: item.candidate.summary,
          source: item.candidate.source,
          score: item.score,
          confidence: item.candidate.confidence,
          sensitivity: item.candidate.sensitivity ?? null,
          scope: item.scope,
          provenance: item.provenance,
          evidenceVersion: item.evidenceVersion,
          version: item.version,
          queryMatches: item.queryMatches,
          rankReasons: item.rankReasons,
        })),
        semantic,
        latencyMs,
        errors: result.semanticError ? [result.semanticError] : [],
      }
    }
    catch (error) {
      const latencyMs = now() - startedAt
      const message = errorMessageFrom(error) ?? String(error)
      await appendMemoryWorkbenchRecallMetricSafely({
        cardId: input.cardId,
        query,
        mode: 'none',
        latencyMs,
        evidenceCount: 0,
        semanticAvailable: semantic.available,
        error: message,
      })
      return {
        query,
        intent: {
          mode: 'none',
          shouldRecall: false,
          confidence: 0,
          rationale: 'recall-probe-failed',
          temporalFocus: 'unspecified',
          riskFlags: ['recall-probe-failed'],
        },
        plan: {
          keywordQueries: [],
          phraseQueries: [],
          charGramQueries: [],
          semanticQueries: [],
          episodicQueries: [],
          threadHints: [],
          negativeCues: [],
          riskFlags: ['recall-probe-failed'],
        },
        evidence: [],
        semantic,
        latencyMs,
        errors: [message],
      }
    }
  }

  async function getMemoryWorkbenchRecallProbeSemantic(input: { cardId: string }) {
    try {
      const embedding = await getMemoryWorkbenchEmbeddingHealth(input)
      const available = embedding.providerConfigured === true
        && Boolean(embedding.modelId)
        && Number.isFinite(embedding.dimensions)
        && embedding.reindexRequired !== true
      return {
        available,
        modelId: embedding.modelId,
        dimensions: embedding.dimensions,
        error: available
          ? null
          : embedding.providerConfigured
            ? embedding.reindexRequired ? 'embedding index requires reindex' : null
            : 'embedding provider is not configured',
      }
    }
    catch (error) {
      return {
        available: false,
        modelId: null,
        dimensions: null,
        error: errorMessageFrom(error) ?? 'embedding health unavailable',
      }
    }
  }

  async function getMemoryWorkbenchQueueHealth(input: { cardId: string }): Promise<AlicizationMemoryWorkbenchHealth['queue']> {
    return await memoryWorkbenchHealthRuntime.getQueueHealth(input)
  }

  async function manageMemoryWorkbenchWorkingMemoryCleaningQueue(input: {
    cardId: string
    action?: 'list' | 'retry-dead-letter'
    itemIds?: string[]
    limit?: number
    cursor?: string | null
  }): Promise<AlicizationWorkingMemoryCleaningQueueResult> {
    const cardId = resolveMemoryCardId(input.cardId, 'memory workbench WorkingMemory cleaning queue')
    const action = input.action ?? 'list'
    const retried = action === 'retry-dead-letter'
      ? await enqueueWrite(async () => await workingMemoryLongTermCleaningStore.retryFailureTransactions({
          cardId,
          transactionIds: input.itemIds,
        }))
      : []
    const page = await workingMemoryLongTermCleaningStore.listFailureTransactions({
      cardId,
      limit: input.limit,
      cursor: input.cursor,
    })
    return {
      items: page.items.map(projectWorkingMemoryCleaningQueueItemForWorkbench),
      nextCursor: page.nextCursor,
      retried: retried.map(projectWorkingMemoryCleaningQueueItemForWorkbench),
    }
  }

  async function getMemoryWorkbenchRecallHealth(input: { cardId: string }): Promise<AlicizationMemoryWorkbenchHealth['recall']> {
    return await memoryWorkbenchHealthRuntime.getRecallHealth(input)
  }

  async function getMemoryWorkbenchEmbeddingHealth(input: { cardId: string }): Promise<AlicizationMemoryWorkbenchHealth['embedding']> {
    const cardId = resolveMemoryCardId(input.cardId, 'memory embedding health')
    const provider = resolveLongTermMemoryEmbeddingProvider()
    const vectorSpaceId = provider ? resolveLongTermMemoryVectorSpaceId(provider) : null
    const [indexHealth, reindexJob] = await Promise.all([
      longTermMemoryVectorIndexAdapter.getHealth({
        cardId,
        modelId: provider?.modelId ?? null,
        dimensions: provider?.dimensions ?? null,
        vectorSpaceId,
      }),
      memoryEmbeddingReindexRuntime.getLatestReindexJob(cardId),
    ])
    return {
      providerConfigured: indexHealth.providerConfigured,
      modelId: indexHealth.modelId,
      dimensions: indexHealth.dimensions,
      vectorSpaceId: indexHealth.vectorSpaceId,
      reindexRequired: indexHealth.reindexRequired
        || !!(reindexJob && ['queued', 'running', 'cancel_requested', 'failed'].includes(reindexJob.status)),
      indexMode: indexHealth.indexMode,
      approximate: indexHealth.approximate,
      degraded: indexHealth.degraded,
      nativeIndexReady: indexHealth.nativeIndexReady,
      searchReady: indexHealth.searchReady
        && (!reindexJob || !['queued', 'running', 'cancel_requested', 'failed'].includes(reindexJob.status)),
      lastError: indexHealth.lastError,
      canonicalCount: indexHealth.canonicalCount,
      indexedCount: indexHealth.indexedCount,
      missingCount: indexHealth.missingCount,
      textHashMismatchCount: indexHealth.textHashMismatchCount,
      staleOrFailedCount: indexHealth.staleOrFailedCount,
      orphanedCount: indexHealth.orphanedCount,
      coverageRatio: indexHealth.coverageRatio,
      reindexJob,
    }
  }

  function normalizeMemoryQualityMonth(raw: unknown, timestamp = now()) {
    const explicit = normalizeOrganicMemoryText(raw, 24)
    if (/^\d{4}-\d{2}$/u.test(explicit))
      return explicit
    const date = new Date(Number.isFinite(timestamp) ? timestamp : now())
    return Number.isNaN(date.getTime())
      ? new Date(now()).toISOString().slice(0, 7)
      : date.toISOString().slice(0, 7)
  }

  function normalizeMemoryQualityIds(values: unknown[] | null | undefined, maxItems = 64) {
    const result: string[] = []
    for (const value of values ?? []) {
      const normalized = normalizeOrganicMemoryText(value, 180)
      if (!normalized || result.includes(normalized))
        continue
      result.push(normalized)
      if (result.length >= maxItems)
        break
    }
    return result
  }

  function normalizeMemoryQualityEvidenceSnapshot(values: unknown[] | null | undefined) {
    const result: AlicizationMemoryQualityEvidenceSnapshot[] = []
    for (const value of values ?? []) {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        continue
      const item = value as Record<string, unknown>
      const scope = item.scope && typeof item.scope === 'object' && !Array.isArray(item.scope)
        ? item.scope as Record<string, unknown>
        : null
      const provenance = item.provenance
      if (
        provenance !== 'observed'
        && provenance !== 'remembered'
        && provenance !== 'dreamt'
        && provenance !== 'inferred'
        && provenance !== 'reconstructed'
        && provenance !== 'shadow'
      ) {
        continue
      }
      const id = normalizeOrganicMemoryText(item.id, 180)
      const summary = normalizeOrganicMemoryText(item.summary, 720)
      const source = normalizeOrganicMemoryText(item.source, 180)
      const kind = normalizeOrganicMemoryText(item.kind, 120)
      const userId = normalizeOrganicMemoryText(scope?.userId, 120)
      const cardId = normalizeOrganicMemoryText(scope?.cardId, 120) || null
      if (!id || !summary || !source || !kind || !userId)
        continue
      result.push({
        id,
        kind,
        summary,
        source,
        score: Number.isFinite(item.score) ? Number(item.score) : 0,
        confidence: Number.isFinite(item.confidence) ? Number(item.confidence) : 0,
        sensitivity: normalizeOrganicMemoryText(item.sensitivity, 120) || null,
        scope: {
          userId,
          cardId,
        },
        provenance,
        evidenceVersion: normalizeOrganicMemoryText(item.evidenceVersion, 120) || 'unknown',
        version: normalizeOrganicMemoryText(item.version, 120) || 'unknown',
        queryMatches: normalizeMemoryQualityIds(Array.isArray(item.queryMatches) ? item.queryMatches : [], 32),
        rankReasons: normalizeMemoryQualityIds(Array.isArray(item.rankReasons) ? item.rankReasons : [], 32),
      })
      if (result.length >= 128)
        break
    }
    return result
  }

  function mapMemoryQualityGoldLabelRow(row: DbMemoryQualityGoldLabelRow): AlicizationMemoryQualityGoldLabelItem {
    const label = resolveSimpleRecallGoldLabelOption(row.label)
    return {
      id: row.id,
      cardId: row.card_id,
      month: row.month,
      label: label.value,
      reason: resolveSimpleRecallGoldReason(row.reason),
      labelText: label.label,
      description: label.description,
      evaluationClass: row.evaluation_class,
      benchmarkDimensions: parseJsonStringArray(row.benchmark_dimensions_json)
        .filter((value): value is SimpleRecallGoldBenchmarkDimension =>
          value === 'information-extraction'
          || value === 'multi-session-reasoning'
          || value === 'temporal-reasoning'
          || value === 'knowledge-update'
          || value === 'abstention',
        ),
      query: row.query,
      sessionId: normalizeOrganicMemoryText(row.session_id, 180),
      turnId: normalizeOrganicMemoryText(row.turn_id, 180),
      decisionTraceId: normalizeOrganicMemoryText(row.decision_trace_id, 180) || null,
      assistantReply: normalizeOrganicMemoryText(row.assistant_reply, 4_000),
      retrievedEvidenceSnapshot: normalizeMemoryQualityEvidenceSnapshot(parseJsonUnknown(row.retrieved_evidence_snapshot_json)),
      expectedMemoryIds: parseJsonStringArray(row.expected_memory_ids_json),
      retrievedCandidateIds: parseJsonStringArray(row.retrieved_candidate_ids_json),
      surfacedMemoryIds: parseJsonStringArray(row.surfaced_memory_ids_json),
      wrongThreadIds: parseJsonStringArray(row.wrong_thread_ids_json),
      note: row.note,
      humanConfirmed: row.human_confirmed === 1,
      createdAt: row.created_at,
    }
  }

  function mapMemoryQualityMonthlyGoldPackRow(row: DbMemoryQualityMonthlyGoldPackRow): AlicizationMemoryQualityMonthlyGoldRegressionPack {
    const itemsSnapshot = parseJsonUnknown(row.items_snapshot_json)
      .map(item => item && typeof item === 'object' ? item as AlicizationMemoryQualityGoldLabelItem : null)
      .filter((item): item is AlicizationMemoryQualityGoldLabelItem => item !== null)
    return {
      version: 'memory-quality-monthly-gold-regression-pack-v2',
      packId: row.pack_id,
      revision: row.revision,
      cardId: row.card_id,
      month: row.month,
      frozenAt: row.frozen_at,
      contentHash: row.content_hash,
      sourceLabelIds: parseJsonStringArray(row.source_label_ids_json),
      itemCount: row.item_count,
      itemsSnapshot,
      items: structuredClone(itemsSnapshot),
    }
  }

  function memoryQualityGoldCursor(createdAt: number, id: string) {
    return `${Math.max(0, Math.floor(createdAt))}:${id}`
  }

  function parseMemoryQualityGoldCursor(raw: unknown) {
    const cursor = normalizeOrganicMemoryText(raw, 360)
    const match = /^(\d+):(.+)$/u.exec(cursor)
    if (!match)
      return null
    return {
      createdAt: Number(match[1]),
      id: match[2],
    }
  }

  async function recordMemoryQualityGoldLabel(input: AlicizationMemoryQualityGoldLabelPayload) {
    const createdAt = Number.isFinite(input.createdAt) ? Math.max(0, Math.floor(Number(input.createdAt))) : now()
    const cardId = resolveMemoryCardId(input.cardId, 'memory quality gold label')
    const query = normalizeOrganicMemoryText(input.query, 720)
    if (!query)
      throw new Error('memory quality gold label query is required')
    const sessionId = normalizeOrganicMemoryText(input.sessionId, 180)
    if (!sessionId)
      throw new Error('memory quality gold label sessionId is required')
    const turnId = normalizeOrganicMemoryText(input.turnId, 180)
    if (!turnId)
      throw new Error('memory quality gold label turnId is required')
    const assistantReply = normalizeOrganicMemoryText(input.assistantReply, 4_000)
    if (!assistantReply)
      throw new Error('memory quality gold label assistantReply is required')
    if (!Array.isArray(input.retrievedEvidenceSnapshot))
      throw new Error('memory quality gold label evidence snapshot is required')

    const label = resolveSimpleRecallGoldLabelOption(input.label)
    const expectedMemoryIds = normalizeMemoryQualityIds(input.expectedMemoryIds)
    if (label.value !== 'unwanted' && expectedMemoryIds.length === 0)
      throw new Error(`${label.value} gold label requires at least one expected memory`)
    if (label.value === 'unwanted' && expectedMemoryIds.length > 0)
      throw new Error('unwanted gold label must not have expected memories')
    const retrievedEvidenceSnapshot = normalizeMemoryQualityEvidenceSnapshot(input.retrievedEvidenceSnapshot)
    if (retrievedEvidenceSnapshot.length !== input.retrievedEvidenceSnapshot.length)
      throw new Error('memory quality gold label evidence snapshot contains invalid items')
    if (retrievedEvidenceSnapshot.some(item => item.scope.cardId !== null && item.scope.cardId !== cardId))
      throw new Error('memory quality gold label evidence snapshot card scope mismatch')
    const id = `memory-quality-gold:${cardId}:${createdAt}:${randomUUID()}`
    const reason = resolveSimpleRecallGoldReason(input.reason)
    const retrievedCandidateIds = normalizeMemoryQualityIds(input.retrievedCandidateIds)
    const surfacedMemoryIds = normalizeMemoryQualityIds(input.surfacedMemoryIds)
    const wrongThreadIds = normalizeMemoryQualityIds(input.wrongThreadIds)
    await enqueueWrite(async () => {
      await run(
        database,
        `
        INSERT INTO memory_quality_gold_labels (
          id,
          card_id,
          month,
          label,
          reason,
          evaluation_class,
          benchmark_dimensions_json,
          query,
          session_id,
          expected_memory_ids_json,
          retrieved_candidate_ids_json,
          surfaced_memory_ids_json,
          wrong_thread_ids_json,
          assistant_reply,
          retrieved_evidence_snapshot_json,
          human_confirmed,
          turn_id,
          decision_trace_id,
          note,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          cardId,
          normalizeMemoryQualityMonth(input.month, createdAt),
          label.value,
          reason,
          label.evaluationClass,
          JSON.stringify(label.benchmarkDimensions),
          query,
          sessionId,
          JSON.stringify(expectedMemoryIds),
          JSON.stringify(retrievedCandidateIds),
          JSON.stringify(surfacedMemoryIds),
          JSON.stringify(wrongThreadIds),
          assistantReply,
          JSON.stringify(retrievedEvidenceSnapshot),
          1,
          turnId,
          normalizeOrganicMemoryText(input.decisionTraceId, 180) || null,
          normalizeOrganicMemoryText(input.note, 360) || null,
          createdAt,
        ],
      )
    })

    const row = await get<DbMemoryQualityGoldLabelRow>(
      database,
      'SELECT * FROM memory_quality_gold_labels WHERE id = ? LIMIT 1',
      [id],
    )
    if (!row)
      throw new Error('memory quality gold label write failed')
    return mapMemoryQualityGoldLabelRow(row)
  }

  async function listMemoryQualityGoldLabels(input: {
    cardId: string
    month?: string | null
    limit?: number
    cursor?: string | null
    humanConfirmedOnly?: boolean
  }): Promise<AlicizationMemoryQualityGoldLabelListResult> {
    const cardId = resolveMemoryCardId(input.cardId, 'memory quality gold label list')
    const month = normalizeMemoryQualityMonth(input.month)
    const limit = Math.max(1, Math.min(500, Math.floor(input.limit ?? 100)))
    const cursor = parseMemoryQualityGoldCursor(input.cursor)
    const cursorClause = cursor
      ? 'AND (created_at < ? OR (created_at = ? AND id < ?))'
      : ''
    const humanConfirmedClause = input.humanConfirmedOnly ? 'AND human_confirmed = 1' : ''
    const rows = await all<DbMemoryQualityGoldLabelRow>(
      database,
      `
      SELECT *
      FROM memory_quality_gold_labels
      WHERE card_id = ?
        AND month = ?
        ${humanConfirmedClause}
        ${cursorClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ?
      `,
      cursor
        ? [cardId, month, cursor.createdAt, cursor.createdAt, cursor.id, limit + 1]
        : [cardId, month, limit + 1],
    )
    const pageRows = rows.slice(0, limit)
    const next = rows.length > limit ? rows[limit] : null
    return {
      items: pageRows.map(mapMemoryQualityGoldLabelRow),
      nextCursor: next ? memoryQualityGoldCursor(next.created_at, next.id) : null,
    }
  }

  async function listAllMemoryQualityGoldLabels(input: {
    cardId: string
    month?: string | null
    humanConfirmedOnly?: boolean
  }) {
    const items: AlicizationMemoryQualityGoldLabelItem[] = []
    let cursor: string | null = null
    do {
      const page = await listMemoryQualityGoldLabels({
        cardId: input.cardId,
        month: input.month,
        limit: 500,
        cursor,
        humanConfirmedOnly: input.humanConfirmedOnly,
      })
      items.push(...page.items)
      cursor = page.nextCursor
    } while (cursor)
    return items
  }

  async function getMonthlyGoldRegressionPack(input: {
    cardId: string
    month?: string | null
  }): Promise<AlicizationMemoryQualityMonthlyGoldRegressionPack | null> {
    const cardId = resolveMemoryCardId(input.cardId, 'memory quality monthly regression pack lookup')
    const month = normalizeMemoryQualityMonth(input.month)
    const row = await get<DbMemoryQualityMonthlyGoldPackRow>(
      database,
      `
      SELECT *
      FROM memory_quality_monthly_gold_packs
      WHERE card_id = ?
        AND month = ?
      LIMIT 1
      `,
      [cardId, month],
    )
    return row ? mapMemoryQualityMonthlyGoldPackRow(row) : null
  }

  async function buildMonthlyGoldRegressionPack(input: {
    cardId: string
    month?: string | null
  }): Promise<AlicizationMemoryQualityMonthlyGoldRegressionPack> {
    const cardId = resolveMemoryCardId(input.cardId, 'memory quality monthly regression pack')
    const month = normalizeMemoryQualityMonth(input.month)
    const existing = await getMonthlyGoldRegressionPack({ cardId, month })
    if (existing)
      return existing

    const items = await listAllMemoryQualityGoldLabels({
      cardId,
      month,
      humanConfirmedOnly: true,
    })
    if (items.length === 0)
      throw new Error('memory quality monthly gold regression pack requires at least one human-confirmed label')

    const revision = 1
    const frozenAt = now()
    const sourceLabelIds = items.map(item => item.id)
    const itemsSnapshot = structuredClone(items)
    const contentHash = `sha256:${createHash('sha256')
      .update(JSON.stringify({
        cardId,
        month,
        revision,
        sourceLabelIds,
        itemsSnapshot,
      }))
      .digest('hex')}`
    const packId = `memory-quality-gold-pack:${cardId}:${month}:${randomUUID()}`
    await enqueueWrite(async () => {
      await run(
        database,
        `
        INSERT OR IGNORE INTO memory_quality_monthly_gold_packs (
          pack_id,
          card_id,
          month,
          revision,
          frozen_at,
          content_hash,
          source_label_ids_json,
          items_snapshot_json,
          item_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          packId,
          cardId,
          month,
          revision,
          frozenAt,
          contentHash,
          JSON.stringify(sourceLabelIds),
          JSON.stringify(itemsSnapshot),
          itemsSnapshot.length,
        ],
      )
    })

    const frozen = await getMonthlyGoldRegressionPack({ cardId, month })
    if (!frozen)
      throw new Error('memory quality monthly gold regression pack write failed')
    return frozen
  }

  function buildPersonaDatasetQualityFixturesFromSnapshot(input: {
    cardId: string
    snapshot: Awaited<ReturnType<typeof getPersonaTrainingDataset>>
    createdAt: number
  }): PersonaTrainingDatasetQualityFixture[] {
    const activeVersion = input.snapshot.versions.find(version => version.activeAt !== null)
      ?? input.snapshot.versions[0]
      ?? null
    if (!activeVersion || input.snapshot.examples.length === 0)
      return []

    const sources = input.snapshot.examples.map((example) => {
      return {
        cardId: example.cardId,
        sourceId: example.sourceId,
        sourceKind: example.sourceKind,
        status: example.state === 'revoked' ? 'revoked' : 'confirmed',
        cleaned: example.provenance?.kind === 'working-memory-cleaning',
        summary: example.positiveExample,
        lesson: example.behaviorLesson,
        positiveExample: example.positiveExample,
        negativeExample: example.negativeExample,
        sensitivity: example.sensitivity,
        allowTraining: example.allowTraining,
        consent: example.consentSnapshot,
        provenance: example.provenance ?? null,
      } satisfies PersonaTrainingDatasetSource
    })
    return [{
      id: `persona-dataset-runtime-snapshot:${input.cardId}:${activeVersion.id}`,
      cardId: input.cardId,
      createdAt: input.createdAt,
      consent: activeVersion.consentSnapshot,
      sources,
      datasetSchemaVersion: activeVersion.schemaVersion,
      expectedExportedSourceIds: sources
        .filter(source => source.allowTraining === true && source.status === 'confirmed')
        .map(source => source.sourceId),
      forbiddenExportedSourceIds: sources
        .filter(source => source.allowTraining !== true || source.status !== 'confirmed')
        .map(source => source.sourceId),
    }]
  }

  function buildWorkingMemoryQualityFixturesFromCheckpoints(input: {
    checkpoints: WorkingMemorySnapshot[]
    createdAt: number
  }): WorkingMemoryQualityFixture[] {
    return input.checkpoints.map(snapshot => ({
      id: `working-memory-runtime-checkpoint:${snapshot.cardId}:${snapshot.sessionId}`,
      snapshot,
      now: input.createdAt,
      maxRawTurns: 6,
      expectedTaskIncludes: [
        snapshot.activeTask?.summary,
        snapshot.currentThread?.title,
      ].filter((value): value is string => Boolean(value)),
      expectedQuestionIncludes: snapshot.unresolvedQuestions.map(item => item.text),
      expectedCommitmentIncludes: snapshot.commitments.map(item => item.text),
      expectedCorrectionIncludes: snapshot.userCorrections.map(item => item.text),
      expectedFailureTurnIds: snapshot.audit.failureTurnIds,
    }))
  }

  async function buildWorkingMemoryCompressionBehaviorFixtures(input: {
    cardId: string
    checkpoints: WorkingMemorySnapshot[]
  }): Promise<WorkingMemoryCompressionBehaviorFixture[]> {
    const fixtures: WorkingMemoryCompressionBehaviorFixture[] = []
    for (const snapshot of input.checkpoints) {
      const nextUserText = snapshot.currentThread?.currentUserMove
        ?? [...snapshot.recentRawTurns].reverse().find(turn => turn.role === 'user')?.text
        ?? ''
      const hasRecallContext = snapshot.memoryQueryHints.length > 0
        || Boolean(snapshot.currentThread?.title)
        || Boolean(snapshot.activeTask?.summary)
        || snapshot.commitments.length > 0
        || snapshot.userCorrections.length > 0
      if (!nextUserText || !hasRecallContext)
        continue

      const recalled = await retrieveLongTermMemoryEvidenceReadOnly({
        cardId: input.cardId,
        currentUserText: nextUserText,
        workingMemoryQueryHints: snapshot.memoryQueryHints,
        currentThreadTitle: snapshot.currentThread?.title ?? null,
        activeTask: snapshot.activeTask?.summary ?? null,
        limit: 5,
      })
      const candidates = recalled.evidence.map(item => item.candidate)
      const expectedTopIds = recalled.evidence.slice(0, 1).map(item => item.candidate.id)
      if (candidates.length === 0 || expectedTopIds.length === 0)
        continue

      fixtures.push({
        id: `working-memory-runtime-behavior:${snapshot.cardId}:${snapshot.sessionId}`,
        snapshot,
        nextUserText,
        candidates,
        expectedTopIds,
        maxRawTurns: 6,
        expectedCommitmentIncludes: snapshot.commitments.map(item => item.text),
        expectedCorrectionIncludes: snapshot.userCorrections.map(item => item.text),
        expectedFailureTurnIds: snapshot.audit.failureTurnIds,
        limit: 5,
      })
    }
    return fixtures
  }

  async function buildMemoryExperienceQualityFixturesFromCheckpoints(input: {
    cardId: string
    checkpoints: WorkingMemorySnapshot[]
  }): Promise<MemoryExperienceQualityFixture[]> {
    const fixtures: MemoryExperienceQualityFixture[] = []
    for (const snapshot of input.checkpoints) {
      const userText = snapshot.currentThread?.currentUserMove
        ?? [...snapshot.recentRawTurns].reverse().find(turn => turn.role === 'user')?.text
        ?? ''
      const replyText = snapshot.currentThread?.currentAliceMove
        ?? [...snapshot.recentRawTurns].reverse().find(turn => turn.role === 'alice')?.text
        ?? ''
      if (!userText || !replyText)
        continue

      const shouldRecall = snapshot.memoryQueryHints.length > 0
        || Boolean(snapshot.currentThread?.title)
        || Boolean(snapshot.activeTask?.summary)
        || snapshot.commitments.length > 0
        || snapshot.userCorrections.length > 0

      const recalled = shouldRecall
        ? await retrieveLongTermMemoryEvidenceReadOnly({
            cardId: input.cardId,
            currentUserText: userText,
            workingMemoryQueryHints: snapshot.memoryQueryHints,
            currentThreadTitle: snapshot.currentThread?.title ?? null,
            activeTask: snapshot.activeTask?.summary ?? null,
            limit: 5,
          })
        : null
      const evidence = recalled?.evidence ?? []
      fixtures.push({
        id: `memory-experience-runtime:${snapshot.cardId}:${snapshot.sessionId}`,
        cardId: snapshot.cardId,
        userText,
        replyText,
        shouldRecall,
        expectedUsedMemoryIds: shouldRecall ? evidence.slice(0, 1).map(item => item.candidate.id) : [],
        recalledMemoryIds: evidence.map(item => item.candidate.id),
        memories: evidence.map(item => ({
          id: item.candidate.id,
          summary: item.candidate.summary,
        })),
        rankReasonsById: Object.fromEntries(evidence.map(item => [
          item.candidate.id,
          item.rankReasons,
        ])),
      })
    }
    return fixtures
  }

  function temporalFixtureFocus(input: {
    currentUserText: string
    workingMemoryQueryHints?: string[]
  }) {
    return deriveLongTermMemoryRecallIntent(input).temporalFocus
  }

  async function buildLongTermTemporalConflictFixtures(input: {
    cardId: string
    labels: AlicizationMemoryQualityGoldLabelItem[]
  }): Promise<LongTermMemoryTemporalConflictFixture[]> {
    const facts = await listMemoryFacts()
    const factById = new Map(facts.map(fact => [fact.id, fact]))
    const fixtures: LongTermMemoryTemporalConflictFixture[] = []

    for (const fact of facts) {
      const supersededFacts = (fact.supersedes ?? [])
        .map(id => factById.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
      if (supersededFacts.length === 0)
        continue
      const currentUserText = `现在 ${fact.subject} ${fact.predicate} 是什么？`
      fixtures.push({
        id: `runtime-temporal-supersedes:${fact.id}`,
        scenario: 'knowledge-update',
        currentUserText,
        candidates: [
          memoryFactToLongTermEvidenceCandidate(fact),
          ...supersededFacts.map(memoryFactToLongTermEvidenceCandidate),
        ],
        expectedTopIds: [fact.id],
        forbiddenTopIds: supersededFacts.map(item => item.id),
        expectedTemporalFocus: temporalFixtureFocus({ currentUserText }),
        limit: Math.max(1, supersededFacts.length + 1),
      })
    }

    for (const label of input.labels.filter(item => item.reason === 'expired')) {
      const expectedIds = label.expectedMemoryIds
      const forbiddenIds = [...new Set([
        ...label.surfacedMemoryIds,
        ...label.retrievedCandidateIds,
        ...label.wrongThreadIds,
      ])].filter(id => !expectedIds.includes(id))
      const candidateIds = [...new Set([...expectedIds, ...forbiddenIds])]
      const candidates = candidateIds.map((id) => {
        const fact = factById.get(id)
        if (fact)
          return memoryFactToLongTermEvidenceCandidate(fact)
        return {
          id,
          kind: 'fact' as const,
          summary: `Gold label memory ${id}`,
          source: 'memory-quality-gold-label',
          confidence: expectedIds.includes(id) ? 0.95 : 0.72,
          salience: expectedIds.includes(id) ? 0.9 : 0.5,
          cues: [label.query],
          sensitivity: 'personal' as const,
        }
      })
      if (candidates.length === 0)
        continue
      fixtures.push({
        id: `runtime-temporal-expired:${label.id}`,
        scenario: expectedIds.length > 0 ? 'knowledge-update' : 'relative-time',
        currentUserText: label.query,
        candidates,
        expectedTopIds: expectedIds,
        forbiddenTopIds: forbiddenIds,
        expectedTemporalFocus: temporalFixtureFocus({
          currentUserText: label.query,
        }),
        limit: Math.max(1, Math.min(8, candidates.length)),
      })
    }

    const tombstones = await all<{
      source_id: string
      source: string
    }>(
      database,
      `
      SELECT source_id, source
      FROM long_term_memory_tombstones
      WHERE card_id = ?
      ORDER BY created_at DESC
      LIMIT 32
      `,
      [input.cardId],
    )
    for (const tombstone of tombstones) {
      const fact = tombstone.source === 'memory_facts'
        ? factById.get(tombstone.source_id)
        : null
      const candidate = fact
        ? memoryFactToLongTermEvidenceCandidate(fact)
        : {
            id: tombstone.source_id,
            kind: 'fact' as const,
            summary: `Tombstoned ${tombstone.source} memory ${tombstone.source_id}`,
            source: tombstone.source,
            confidence: 0.8,
            salience: 0.5,
            cues: [tombstone.source_id],
            sensitivity: 'personal' as const,
          }
      const currentUserText = `你还记得 ${tombstone.source_id} 吗？`
      fixtures.push({
        id: `runtime-temporal-tombstone:${tombstone.source}:${tombstone.source_id}`,
        scenario: 'tombstone',
        currentUserText,
        candidates: [candidate],
        expectedTopIds: [],
        forbiddenTopIds: [tombstone.source_id],
        blockedIds: [tombstone.source_id],
        blockedPolicy: 'pre-filter',
        expectedTemporalFocus: temporalFixtureFocus({ currentUserText }),
        limit: 1,
      })
    }

    return fixtures.filter((fixture, index, values) =>
      values.findIndex(other => other.id === fixture.id) === index,
    )
  }

  async function runMemoryWorkbenchProductionTrial(input: {
    cardId: string
    mode?: 'historical-replay' | 'live-provider'
    month?: string | null
    sessionId?: string | null
    signal?: AbortSignal
  }): Promise<MemoryProductionTrialReport> {
    const cardId = resolveMemoryCardId(input.cardId, 'memory workbench production trial')
    const createdAt = now()
    const month = normalizeMemoryQualityMonth(input.month, createdAt)
    const requestedReplaySessionId = typeof input.sessionId === 'string'
      ? input.sessionId.trim()
      : ''
    const selectedWorkingMemoryCheckpoint = requestedReplaySessionId
      ? await getWorkingMemoryCheckpoint(cardId, requestedReplaySessionId)
      : null
    const replaySessionId = selectedWorkingMemoryCheckpoint?.sessionId ?? null
    let goldRegressionPack = await getMonthlyGoldRegressionPack({ cardId, month })
    if (!goldRegressionPack) {
      const humanLabels = await listAllMemoryQualityGoldLabels({
        cardId,
        month,
        humanConfirmedOnly: true,
      })
      if (humanLabels.length > 0)
        goldRegressionPack = await buildMonthlyGoldRegressionPack({ cardId, month })
    }
    const labels = goldRegressionPack?.itemsSnapshot ?? []
    const temporalConflict = await buildLongTermTemporalConflictFixtures({
      cardId,
      labels,
    })
    let scopeFuzzError: string | null = null
    const scopeFuzzReport = await runMemoryScopeFuzzDbTrial({
      cardId,
      userId: 'local-user',
      caseCount: 4,
      createDb: async (sandboxUserDataPath, sandboxCardId) =>
        await setupAlicizationDb(sandboxUserDataPath, {
          cardId: sandboxCardId,
        }),
    }).catch((error) => {
      scopeFuzzError = errorMessageFrom(error) ?? String(error)
      return null
    })
    const semantic = await getMemoryWorkbenchRecallProbeSemantic({ cardId })
    let personaTrainingSnapshotError: string | null = null
    const personaSnapshot = await getPersonaTrainingDataset({ cardId }).catch((error) => {
      personaTrainingSnapshotError = `Persona/LoRA 数据集快照读取失败：${errorMessageFrom(error) ?? String(error)}`
      return null
    })
    const workingMemoryCheckpoints = await listWorkingMemoryCheckpoints(cardId, { limit: 8 })
    const compressedContextBehavior = await buildWorkingMemoryCompressionBehaviorFixtures({
      cardId,
      checkpoints: workingMemoryCheckpoints,
    })
    const experienceQuality = await buildMemoryExperienceQualityFixturesFromCheckpoints({
      cardId,
      checkpoints: workingMemoryCheckpoints,
    })
    const semanticScaleJobReport = await memorySemanticScaleJobRuntime.getLatestAvailableReport(cardId)
    const [queueResult, recallResult, embeddingResult] = await Promise.allSettled([
      getMemoryWorkbenchQueueHealth({ cardId }),
      getMemoryWorkbenchRecallHealth({ cardId }),
      getMemoryWorkbenchEmbeddingHealth({ cardId }),
    ])
    const runtimeHealthErrors: string[] = []
    const queueHealth: AlicizationMemoryWorkbenchHealth['queue'] = queueResult.status === 'fulfilled'
      ? queueResult.value
      : {
          pending: 0,
          review: 0,
          applied: 0,
          failed: 0,
          deadLettered: 0,
        }
    if (queueResult.status === 'rejected') {
      runtimeHealthErrors.push(`queue health unavailable: ${errorMessageFrom(queueResult.reason) ?? String(queueResult.reason)}`)
    }
    const recallHealth: AlicizationMemoryWorkbenchHealth['recall'] = recallResult.status === 'fulfilled'
      ? recallResult.value
      : {
          lastLatencyMs: null,
          p95LatencyMs: null,
          lastError: errorMessageFrom(recallResult.reason) ?? String(recallResult.reason),
        }
    if (recallResult.status === 'rejected') {
      runtimeHealthErrors.push(`recall health unavailable: ${errorMessageFrom(recallResult.reason) ?? String(recallResult.reason)}`)
    }
    const embeddingHealth: AlicizationMemoryWorkbenchHealth['embedding'] = embeddingResult.status === 'fulfilled'
      ? embeddingResult.value
      : {
          providerConfigured: false,
          modelId: null,
          dimensions: null,
          vectorSpaceId: null,
          reindexRequired: true,
          indexMode: 'brute-force',
          approximate: false,
          degraded: true,
          nativeIndexReady: false,
          searchReady: false,
          lastError: errorMessageFrom(embeddingResult.reason) ?? String(embeddingResult.reason),
          canonicalCount: 0,
          indexedCount: 0,
          missingCount: 0,
          textHashMismatchCount: 0,
          staleOrFailedCount: 0,
          orphanedCount: 0,
          coverageRatio: null,
          reindexJob: null,
        }
    if (embeddingResult.status === 'rejected') {
      runtimeHealthErrors.push(`embedding health unavailable: ${errorMessageFrom(embeddingResult.reason) ?? String(embeddingResult.reason)}`)
    }
    const runtimeHealth: MemoryProductionTrialRuntimeHealth = {
      queue: {
        pending: queueHealth.pending,
        review: queueHealth.review,
        applied: queueHealth.applied,
        failed: queueHealth.failed,
        deadLettered: queueHealth.deadLettered,
      },
      recall: {
        lastLatencyMs: recallHealth.lastLatencyMs,
        p95LatencyMs: recallHealth.p95LatencyMs,
        lastError: recallHealth.lastError,
      },
      embedding: {
        providerConfigured: embeddingHealth.providerConfigured,
        modelId: embeddingHealth.modelId,
        dimensions: embeddingHealth.dimensions,
        vectorSpaceId: embeddingHealth.vectorSpaceId,
        reindexRequired: embeddingHealth.reindexRequired,
        indexMode: embeddingHealth.indexMode,
        approximate: embeddingHealth.approximate,
        degraded: embeddingHealth.degraded,
        nativeIndexReady: embeddingHealth.nativeIndexReady,
        searchReady: embeddingHealth.searchReady,
        lastError: embeddingHealth.lastError,
        canonicalCount: embeddingHealth.canonicalCount,
        indexedCount: embeddingHealth.indexedCount,
        missingCount: embeddingHealth.missingCount,
        textHashMismatchCount: embeddingHealth.textHashMismatchCount,
        staleOrFailedCount: embeddingHealth.staleOrFailedCount,
        orphanedCount: embeddingHealth.orphanedCount,
        coverageRatio: embeddingHealth.coverageRatio,
        reindexJob: embeddingHealth.reindexJob,
      },
      errors: runtimeHealthErrors,
    }
    const longTerm = labels.map((label) => {
      const shouldAbstain = label.evaluationClass === 'should-abstain'
      const falseRecall = label.evaluationClass === 'false-recall'
      const forbiddenTopIds = falseRecall || shouldAbstain
        ? [...new Set([
            ...label.retrievedCandidateIds,
            ...label.surfacedMemoryIds,
            ...label.wrongThreadIds,
          ])]
        : []
      return {
        fixture: {
          id: `gold-label:${label.id}:${label.expectedMemoryIds[0] ?? label.surfacedMemoryIds[0] ?? 'abstain'}`,
          cardId,
          query: label.query,
          expectedTopIds: shouldAbstain ? [] : label.expectedMemoryIds,
          forbiddenTopIds,
          wrongThreadIds: label.wrongThreadIds,
          limit: 5,
          semantic: {
            available: semantic.available,
            providerId: semantic.available ? 'memory-workbench-embedding-provider' : null,
            modelId: semantic.modelId,
            dimensions: semantic.dimensions,
            reindexRequired: semantic.error === 'embedding index requires reindex',
          },
        },
        recall: async (recallInput: {
          cardId: string
          currentUserText: string
          limit: number
        }) => await retrieveLongTermMemoryEvidenceReadOnly({
          cardId: recallInput.cardId,
          currentUserText: recallInput.currentUserText,
          limit: recallInput.limit,
        }),
        now,
      }
    })
    const dialogueReplay = async () => {
      if (!replaySessionId) {
        return {
          id: `memory-db-replay:${cardId}:unavailable:${createdAt}`,
          passed: false,
          turnCount: 0,
          error: requestedReplaySessionId
            ? `会话 ${requestedReplaySessionId} 不属于当前机体的 WorkingMemory 范围，无法运行真实对话回放。`
            : '必须显式选择当前机体的 WorkingMemory 会话后，才能运行真实对话回放。',
          recommendedNextActions: [
            requestedReplaySessionId
              ? '选择当前机体已有的 WorkingMemory 会话后再运行质量试用。'
              : '从会话选择器中明确选择一段本地会话后再运行质量试用。',
          ],
        }
      }

      const persistedTurns = await listConversationTurnsBySession(replaySessionId, {
        cardId,
        limit: 500,
      })
      const replayTurns = persistedTurns
        .map((row, index) => {
          const userText = typeof row.userText === 'string' ? row.userText.trim() : ''
          if (!userText)
            return null

          const turnId = typeof row.turnId === 'string' && row.turnId.trim()
            ? row.turnId.trim()
            : `persisted-replay-turn-${index + 1}`
          return {
            row,
            turn: {
              turnId,
              userText,
              now: row.createdAt,
            },
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      if (replayTurns.length === 0) {
        return {
          id: `memory-db-replay:${cardId}:${replaySessionId}:${createdAt}`,
          passed: false,
          turnCount: 0,
          error: `会话 ${replaySessionId} 没有可回放的用户消息。`,
          recommendedNextActions: [
            '选择包含用户消息和助手回复的本地会话后再运行质量试用。',
          ],
        }
      }

      const trialMode = input.mode ?? 'historical-replay'
      const memoryTrialProvider = trialMode === 'live-provider'
        ? options?.resolveMemoryTrialProvider?.() ?? options?.memoryTrialProvider ?? null
        : null
      if (trialMode === 'live-provider' && !memoryTrialProvider) {
        return {
          id: `memory-live-provider-trial:${cardId}:${replaySessionId}:${createdAt}`,
          passed: false,
          turnCount: 0,
          error: '真实模型试用无法运行：当前 Provider 未配置或不可用。',
          recommendedNextActions: [
            '先配置当前对话 Provider 和模型，再显式选择“真实模型试用”。',
          ],
        }
      }
      if (memoryTrialProvider) {
        const liveProviderTrial = await runMemoryLiveProviderTrial({
          id: `memory-live-provider-trial:${cardId}:${replaySessionId}:${createdAt}`,
          cardId,
          sessionId: replaySessionId,
          userId: 'local-user',
          turns: replayTurns.map(item => item.turn),
          db: {
            getWorkingMemoryCheckpoint,
            retrieveLongTermMemoryEvidenceReadOnly,
          },
          provider: memoryTrialProvider.generate,
          signal: input.signal,
          maxTurns: 8,
          maxRawTurns: 6,
          recallLimit: 5,
          perTurnTimeoutMs: 45_000,
          totalTimeoutMs: 180_000,
        })
        const replayReport = projectMemoryLiveProviderTrialToDialogueReplay(liveProviderTrial)
        return {
          id: liveProviderTrial.id,
          passed: liveProviderTrial.passed,
          turnCount: liveProviderTrial.summary.turnCount,
          report: replayReport,
          liveProviderTrial,
          error: liveProviderTrial.summary.lastError,
          recommendedNextActions: liveProviderTrial.passed
            ? []
            : ['检查真实 Provider 配置、超时或 memory context 输入后再运行试用。'],
        }
      }

      const assistantTextByTurnId = new Map(
        replayTurns.map(({ row, turn }) => [
          turn.turnId,
          typeof row.assistantText === 'string' ? row.assistantText : '',
        ]),
      )
      // A selected session identifies the replay source; replay itself rebuilds
      // WorkingMemory from persisted turns so the current checkpoint is not
      // replayed a second time.
      let replayCheckpoint: WorkingMemorySnapshot | null = null
      const replayReport = await replayMemoryDialogue({
        id: `memory-db-replay:${cardId}:${replaySessionId}:${createdAt}`,
        cardId,
        sessionId: replaySessionId,
        userId: 'local-user',
        turns: replayTurns.map(item => item.turn),
        db: {
          getWorkingMemoryCheckpoint: async (lookupCardId, lookupSessionId) => {
            if (
              lookupCardId !== cardId
              || lookupSessionId !== replaySessionId
              || !replayCheckpoint
            ) {
              return null
            }
            return structuredClone(replayCheckpoint)
          },
          upsertWorkingMemoryCheckpoint: async (snapshot) => {
            replayCheckpoint = structuredClone(snapshot)
          },
          retrieveLongTermMemoryEvidence: async recallInput =>
            await retrieveLongTermMemoryEvidenceReadOnly(recallInput),
        },
        provider: {
          generate: async ({ turnId }) => ({
            text: assistantTextByTurnId.get(turnId) ?? '',
          }),
        },
        maxRawTurns: 6,
        recallLimit: 5,
        signal: input.signal,
      })

      return {
        id: replayReport.id,
        passed: replayReport.passed,
        turnCount: replayReport.summary.turnCount,
        report: replayReport,
        error: replayReport.summary.lastError,
        recommendedNextActions: replayReport.passed
          ? []
          : ['检查持久化会话中的空助手回复、WorkingMemory 压缩或长期记忆召回失败。'],
      }
    }
    const report = await runMemoryProductionTrialRunner({
      id: `memory-production-trial:${cardId}:${month}:${createdAt}`,
      cardId,
      createdAt,
      dialogueReplay,
      workingMemory: buildWorkingMemoryQualityFixturesFromCheckpoints({
        checkpoints: workingMemoryCheckpoints,
        createdAt,
      }),
      compressedContextBehavior,
      temporalConflict,
      semanticScaleSoakReport: semanticScaleJobReport?.report ?? null,
      experienceQuality,
      scopeFuzzReport,
      runtimeHealth,
      goldRegressionPack,
      longTerm,
      personaTraining: personaSnapshot
        ? buildPersonaDatasetQualityFixturesFromSnapshot({
            cardId,
            snapshot: personaSnapshot,
            createdAt,
          })
        : [],
      personaTrainingError: personaTrainingSnapshotError,
      requireProductionStages: true,
      productionStageErrors: (scopeFuzzError
        ? {
            'scope-fuzz': `not-run: isolated DB scope fuzz failed: ${scopeFuzzError}`,
          }
        : {}),
    })
    if (labels.length === 0) {
      return {
        ...report,
        recommendedNextActions: [
          ...report.recommendedNextActions,
          '先在记忆面板用“记得对 / 没想起来 / 记错了 / 不该提”标注本月样本，再运行生产试用。',
        ],
      }
    }
    return report
  }

  async function manageMemoryWorkbenchSemanticScaleJobs(input: {
    cardId: string
    action?: 'start' | 'status' | 'list' | 'cancel' | 'retry'
    jobId?: string
    tier?: MemorySemanticScaleJobTier
    reason?: string | null
    limit?: number
  }) {
    const cardId = resolveMemoryCardId(input.cardId, 'memory semantic scale job')
    const action = input.action ?? 'list'
    if (action === 'list') {
      const jobs = await memorySemanticScaleJobRuntime.listJobs(cardId, {
        limit: input.limit,
      })
      return {
        job: jobs[0] ?? null,
        jobs,
      }
    }

    if (action === 'start') {
      const job = await memorySemanticScaleJobRuntime.startJob({
        cardId,
        tier: input.tier === '100k' ? '100k' : '10k',
      })
      void memorySemanticScaleJobRuntime.runJob(job.jobId).catch(() => {})
      return {
        job,
        jobs: [job],
      }
    }

    const jobId = normalizeOrganicMemoryText(input.jobId, 240)
    if (!jobId)
      throw new Error(`memory semantic scale ${action} requires jobId`)
    const job = action === 'status'
      ? await memorySemanticScaleJobRuntime.getJob(jobId, cardId)
      : action === 'cancel'
        ? await memorySemanticScaleJobRuntime.requestCancel(
            jobId,
            normalizeOrganicMemoryText(input.reason, 500) || undefined,
            cardId,
          )
        : await memorySemanticScaleJobRuntime.retryJob(jobId, cardId)
    if (action === 'retry')
      void memorySemanticScaleJobRuntime.runJob(jobId).catch(() => {})
    return {
      job,
      jobs: [job],
    }
  }

  function memoryEmbeddingReindexResult(
    progress: MemoryEmbeddingReindexProgress | null,
    errors: string[] = [],
    deadLetterItems: MemoryEmbeddingReindexDeadLetterItem[] = [],
  ): AlicizationMemoryEmbeddingReindexResult {
    const visibleErrors = [
      ...errors,
      ...(progress?.lastError ? [progress.lastError] : []),
    ].filter((error, index, values) => error && values.indexOf(error) === index)
    return {
      jobId: progress?.jobId ?? null,
      status: progress?.status ?? null,
      scheduled: progress?.total ?? 0,
      indexed: progress?.indexed ?? 0,
      failed: (progress?.deadLettered ?? 0) + (progress?.retryable ?? 0),
      modelId: progress?.modelId ?? null,
      dimensions: progress?.dimensions ?? null,
      vectorSpaceId: progress?.vectorSpaceId ?? null,
      errors: visibleErrors,
      deadLetterItems,
      progress,
    }
  }

  async function reindexMemoryWorkbenchEmbeddings(input: {
    cardId: string
    action?: 'start' | 'status' | 'cancel' | 'retry-dead-letter'
    jobId?: string
    reason?: string | null
    itemIds?: string[]
    source?: string
    sourceIds?: string[]
    modelId?: string
    limit?: number
  }): Promise<AlicizationMemoryEmbeddingReindexResult> {
    const cardId = resolveMemoryCardId(input.cardId, 'memory embedding reindex')
    const action = input.action ?? 'start'
    if (action !== 'start') {
      const jobId = normalizeOrganicMemoryText(input.jobId, 240)
      if (!jobId)
        return memoryEmbeddingReindexResult(null, ['embedding reindex jobId is required'])
      try {
        const progress = action === 'status'
          ? await memoryEmbeddingReindexRuntime.getReindexJob(jobId, cardId)
          : action === 'cancel'
            ? await memoryEmbeddingReindexRuntime.requestCancel(jobId, normalizeOrganicMemoryText(input.reason, 300) || undefined, cardId)
            : await memoryEmbeddingReindexRuntime.retryDeadLetterItems(jobId, input.itemIds, cardId)
        if (action === 'retry-dead-letter')
          void memoryEmbeddingReindexRuntime.runJob(jobId).catch(() => {})
        const deadLetterItems = await memoryEmbeddingReindexRuntime.listDeadLetterItems(jobId, cardId)
        return memoryEmbeddingReindexResult(progress, [], deadLetterItems)
      }
      catch (error) {
        return memoryEmbeddingReindexResult(null, [errorMessageFrom(error) ?? String(error)])
      }
    }

    const provider = resolveLongTermMemoryEmbeddingProvider()
    if (!provider) {
      return memoryEmbeddingReindexResult(null, ['embedding provider is not configured'])
    }

    const requestedModelId = normalizeOrganicMemoryText(input.modelId, 160)
    if (requestedModelId && requestedModelId !== provider.modelId) {
      const stale = await longTermMemoryVectorStore.reindexByModel({
        cardId,
        modelId: requestedModelId,
      })
      return memoryEmbeddingReindexResult(null, [`embedding provider model is ${provider.modelId}; requested ${requestedModelId} was marked stale (${stale.recordCount} records)`])
    }

    const requestedLimit = Number.isFinite(input.limit) ? Math.max(1, Math.min(100_000, Math.floor(Number(input.limit)))) : null

    try {
      const progress = await memoryEmbeddingReindexRuntime.scheduleReindexJob({
        cardId,
        modelId: provider.modelId,
        dimensions: provider.dimensions,
        vectorSpaceId: resolveLongTermMemoryVectorSpaceId(provider),
        projection: {
          source: input.source,
          sourceIds: input.sourceIds,
          limit: requestedLimit ?? undefined,
        },
      })
      void memoryEmbeddingReindexRuntime.runJob(progress.jobId).catch(() => {})
      return memoryEmbeddingReindexResult(progress)
    }
    catch (error) {
      return memoryEmbeddingReindexResult(null, [errorMessageFrom(error) ?? String(error)])
    }
  }

  async function resumePendingMemoryEmbeddingReindexJobs() {
    return await memoryEmbeddingReindexRuntime.resumePendingJobs(8, boundCardId)
  }

  async function listMemoryWorkbenchPersonaCandidates(input: {
    cardId: string
    status?: AlicizationPersonaCandidateWorkbenchStatus | 'all'
    limit?: number
    cursor?: string | null
  }) {
    return await memoryWorkbenchPersonaCandidateRuntime.listPersonaCandidates(input)
  }

  async function applyMemoryWorkbenchPersonaCandidateAction(input: {
    cardId: string
    candidateId: string
    decision: AlicizationPersonaCandidateWorkbenchDecision
    reason?: string | null
  }) {
    return await memoryWorkbenchPersonaCandidateRuntime.applyPersonaCandidateAction(input)
  }

  async function getPersonaTrainingDataset(input: { cardId: string }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training dataset snapshot')
    return await personaTrainingDatasetRuntime.getSnapshot({ cardId })
  }

  async function stagePersonaTrainingDataset(input: {
    cardId: string
    consent: Omit<PersonaTrainingDatasetConsentSnapshot, 'capturedAt'> & { capturedAt?: number }
  }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training dataset staging')
    return await personaTrainingDatasetRuntime.stageVersion({
      cardId,
      consent: input.consent,
    })
  }

  async function exportPersonaTrainingDataset(input: { cardId: string, datasetId?: string | null }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training dataset export')
    const exported = await personaTrainingDatasetRuntime.exportVersion({
      cardId,
      datasetId: input.datasetId,
    })
    await appendAuditLog({
      level: 'notice',
      category: 'persona-training-dataset',
      action: 'dataset-exported',
      message: 'Persona training dataset manifest exported.',
      payload: {
        cardId,
        datasetId: exported.dataset.id,
        manifestHash: exported.manifest.manifestHash,
        exampleCount: exported.manifest.exampleCount,
        qualityGatePassed: exported.qualityGate.passed,
      },
    })
    return exported
  }

  async function activatePersonaTrainingDataset(input: { cardId: string, datasetId: string }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training dataset activation')
    const activated = await personaTrainingPipelineGate.activateVersion({
      cardId,
      datasetId: input.datasetId,
    })
    if (activated) {
      await appendAuditLog({
        level: 'notice',
        category: 'persona-training-dataset',
        action: 'dataset-activated',
        message: 'Persona training dataset version activated.',
        payload: {
          cardId,
          datasetId: activated.id,
          version: activated.version,
        },
      })
    }
    return activated
  }

  async function rollbackPersonaTrainingDataset(input: { cardId: string, datasetId: string }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training dataset rollback')
    const rolledBack = await personaTrainingPipelineGate.rollbackVersion({
      cardId,
      datasetId: input.datasetId,
    })
    if (rolledBack) {
      await appendAuditLog({
        level: 'warning',
        category: 'persona-training-dataset',
        action: 'dataset-rolled-back',
        message: 'Persona training dataset version rolled back.',
        payload: {
          cardId,
          datasetId: rolledBack.id,
          version: rolledBack.version,
        },
      })
    }
    return rolledBack
  }

  async function setPersonaTrainingDatasetExamplePolicy(input: {
    cardId: string
    exampleId: string
    allowTraining: boolean
    consent: Omit<PersonaTrainingDatasetConsentSnapshot, 'capturedAt'> & { capturedAt?: number }
  }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training dataset example policy')
    return await personaTrainingDatasetRuntime.setExamplePolicy({
      cardId,
      exampleId: input.exampleId,
      allowTraining: input.allowTraining,
      consent: input.consent,
    })
  }

  async function revokePersonaTrainingDatasetSource(input: { cardId: string, sourceId: string }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training dataset source revoke')
    const revoked = await personaTrainingPipelineGate.revokeSource({
      cardId,
      sourceId: input.sourceId,
    })
    await appendAuditLog({
      level: 'warning',
      category: 'persona-training-dataset',
      action: 'source-revoked',
      message: 'Persona training dataset source revoked.',
      payload: {
        cardId,
        sourceId: input.sourceId,
        affected: revoked.affected,
      },
    })
    return revoked
  }

  async function runPersonaTraining(input: { cardId: string, datasetId?: string | null }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training run')
    return await personaTrainingPipelineGate.train({
      cardId,
      datasetId: input.datasetId,
    })
  }

  async function startPersonaTraining(input: { cardId: string, datasetId?: string | null }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training start')
    return await personaTrainingPipelineGate.start({
      cardId,
      datasetId: input.datasetId,
    })
  }

  async function getPersonaTrainingRun(input: { cardId: string, runId: string }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training run lookup')
    return await personaTrainingPipelineGate.getRun({
      cardId,
      runId: input.runId,
    })
  }

  async function listPersonaTrainingRuns(input: { cardId: string, limit?: number }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training run list')
    return await personaTrainingPipelineGate.listRuns({
      cardId,
      limit: input.limit,
    })
  }

  async function cancelPersonaTraining(input: { cardId: string, runId: string, reason?: string | null }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training cancellation')
    return await personaTrainingPipelineGate.cancel({
      runId: input.runId,
      cardId,
      reason: input.reason,
    })
  }

  async function rollbackPersonaTrainingIncrement(input: { cardId: string, incrementId: string }) {
    const cardId = resolveMemoryCardId(input.cardId, 'persona training increment rollback')
    return await personaTrainingPipelineGate.rollbackIncrement({
      incrementId: input.incrementId,
      cardId,
    })
  }

  async function listPersonaTrainingIncrements(input: { cardId: string }) {
    const persisted = await personaTrainingPipelineGate.listPersistedIncrements()
    const cardId = resolveMemoryCardId(input.cardId, 'persona training increment list')
    return persisted.filter(increment => increment.cardId === cardId)
  }

  async function runMemoryPrune() {
    const currentTs = now()

    // NOTICE: API name retained for bridge compatibility. This no longer deletes or archives
    // memories; it only refreshes salience tiers so long-horizon recall stays lossless.
    await restoreArchivedFactsIntoActiveMemory()
    const facts = (await all<DbMemoryFactRow>(
      database,
      `SELECT * FROM memory_facts ${hasBoundCardScope ? 'WHERE card_id = ?' : ''}`,
      hasBoundCardScope ? [boundCardId] : [],
    )).map(mapFactRow)
    const coldTierCount = facts.filter(fact => (fact.memoryTier ?? deriveFactMemoryTier(fact, currentTs)) === 'cold').length

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        await upsertMeta(memoryLastPrunedAtKey, String(currentTs))
      })
    })

    await appendAuditLog({
      level: 'notice',
      category: 'memory',
      action: 'salience-refresh',
      message: 'Memory salience refresh completed without deleting stored facts.',
      payload: {
        totalFacts: facts.length,
        coldTier: coldTierCount,
      },
    })

    return await getMemoryStats()
  }

  function normalizeOrganicMemoryText(raw: unknown, maxChars: number) {
    if (typeof raw !== 'string')
      return ''
    const normalized = raw.replace(/\s+/g, ' ').trim()
    if (!normalized)
      return ''
    return normalized.slice(0, maxChars)
  }

  async function importLegacyMemory(
    snapshot: AlicizationMemoryLegacySnapshot,
  ): Promise<AlicizationMemoryMigrationResult> {
    const cardId = boundCardId
    const currentTs = now()
    const markerKey = hasBoundCardScope
      ? `${legacyMigrationMarker}:${cardId}`
      : legacyMigrationMarker
    const marker = await getMetaValue(markerKey)
    if (marker) {
      return {
        migrated: false,
        importedFacts: 0,
        importedArchive: 0,
        marker,
      }
    }

    const legacyFacts = Array.isArray(snapshot.facts) ? snapshot.facts : []
    const legacyArchive = Array.isArray(snapshot.archive) ? snapshot.archive : []

    const importedFacts = legacyFacts.length
    const importedArchive = legacyArchive.length
    const prepared = [...legacyFacts, ...legacyArchive]
      .map((fact) => {
        const subject = normalizeOrganicMemoryText(fact.subject, 160)
        const predicate = normalizeOrganicMemoryText(fact.predicate, 160)
        const object = normalizeOrganicMemoryText(fact.object, 320)
        if (!subject || !predicate || !object)
          return null
        return {
          id: normalizeOrganicMemoryText(fact.id, 240) || randomUUID(),
          cardId,
          subject,
          predicate,
          object,
          confidence: clamp01(fact.confidence),
          source: fact.source,
          dedupeKey: normalizeOrganicMemoryText(fact.dedupeKey, 240) || buildDedupeKey(subject, predicate, object),
          createdAt: Math.max(0, Math.floor(fact.createdAt)),
          updatedAt: Math.max(0, Math.floor(fact.updatedAt)),
          knowledgeStage: normalizeKnowledgeStage(fact.knowledgeStage),
          validationStatus: normalizeValidationStatus(fact.validationStatus),
          memoryDomain: normalizeMemoryDomain((fact as any).memoryDomain),
          validationCount: Math.max(0, Math.floor(Number(fact.validationCount ?? 0))),
          contradictionCount: Math.max(0, Math.floor(Number(fact.contradictionCount ?? 0))),
          sourceLabel: normalizeOrganicMemoryText(fact.sourceLabel, 160) || null,
          conflictsWithJson: JSON.stringify(fact.conflictsWith ?? []),
          supersedesJson: JSON.stringify(fact.supersedes ?? []),
        } satisfies PreparedMemoryFactWrite
      })
      .filter((fact): fact is PreparedMemoryFactWrite => Boolean(fact))

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        await applyPreparedMemoryFacts(prepared)
        await run(database, 'DELETE FROM memory_archive WHERE card_id = ?', [cardId])

        if (typeof snapshot.lastPrunedAt === 'number' && Number.isFinite(snapshot.lastPrunedAt)) {
          await upsertMeta(memoryLastPrunedAtKey, String(snapshot.lastPrunedAt))
        }

        await upsertMeta(markerKey, String(currentTs))
      })
    })
    await rebuildLongTermMemorySearchIndexForCard(cardId, 'legacy memory search index rebuild')

    await appendAuditLog({
      level: 'notice',
      category: 'memory',
      action: 'legacy-migration',
      message: 'Imported legacy memory snapshot into SQLite.',
      payload: {
        importedFacts,
        importedArchive,
      },
    })

    return {
      migrated: true,
      importedFacts,
      importedArchive,
      marker: String(currentTs),
    }
  }

  async function overrideMemoryStats(next: AlicizationMemoryStats) {
    if (
      (
        typeof next.lastPrunedAt === 'number'
        && Number.isFinite(next.lastPrunedAt)
      )
      || next.retrievalHealth
    ) {
      await enqueueWrite(async () => {
        if (typeof next.lastPrunedAt === 'number' && Number.isFinite(next.lastPrunedAt))
          await upsertMeta(memoryLastPrunedAtKey, String(next.lastPrunedAt))
        if (next.retrievalHealth) {
          await memoryRetrievalTelemetryRuntime.applyHealthOverrideInline({
            semanticLatencyMs: next.retrievalHealth.semanticLatencyMs,
            graphLatencyMs: next.retrievalHealth.graphLatencyMs,
            candidateGenerationLatencyMs: next.retrievalHealth.candidateGenerationLatencyMs ?? null,
            plannerLatencyMs: next.retrievalHealth.plannerLatencyMs ?? null,
            speechPlanLatencyMs: next.retrievalHealth.speechPlanLatencyMs ?? null,
            cacheHitRatio: next.retrievalHealth.cacheHitRatio,
            prewarmHitRatio: next.retrievalHealth.prewarmHitRatio,
            budgetClassCounts: next.retrievalHealth.budgetClassCounts,
            budgetLatencyTelemetry: next.retrievalHealth.budgetLatencyTelemetry,
            hotKeyStats: next.retrievalHealth.hotKeyStats,
            recallHitRate: next.retrievalHealth.recallHitRate,
            recallMissRate: next.retrievalHealth.recallMissRate,
            wrongThreadRate: next.retrievalHealth.wrongThreadRate,
            reconstructionErrorRate: next.retrievalHealth.reconstructionErrorRate,
            stableCoreOnlyRate: next.retrievalHealth.stableCoreOnlyRate,
            memorySurfaceViolationRate: next.retrievalHealth.memorySurfaceViolationRate,
            templateLeakageFailCount: next.retrievalHealth.templateLeakageFailCount,
            learningTaskCompletionCount: next.retrievalHealth.learningTaskCompletionCount,
            learningTaskFailureCount: next.retrievalHealth.learningTaskFailureCount,
            learningTaskBlockedCount: next.retrievalHealth.learningTaskBlockedCount,
            learningTaskReopenedCount: next.retrievalHealth.learningTaskReopenedCount,
            learningTaskDowngradedCount: next.retrievalHealth.learningTaskDowngradedCount,
            learningTaskCancelledCount: next.retrievalHealth.learningTaskCancelledCount,
            learningRelationshipReviseCount: next.retrievalHealth.learningRelationshipReviseCount,
            learningSelfModelReviseCount: next.retrievalHealth.learningSelfModelReviseCount,
            learningWorldModelValidationCount: next.retrievalHealth.learningWorldModelValidationCount,
            learningWorldModelFalseInternalizationCount: next.retrievalHealth.learningWorldModelFalseInternalizationCount,
            learningTaskCompletionRate: next.retrievalHealth.learningTaskCompletionRate,
            learningTaskFailureRate: next.retrievalHealth.learningTaskFailureRate,
            learningTaskReopenRecoveryRate: next.retrievalHealth.learningTaskReopenRecoveryRate,
            misinternalizationRate: next.retrievalHealth.misinternalizationRate,
            learningPolicyStrictnessBias: next.retrievalHealth.learningPolicyStrictnessBias,
            learningPolicyWrongThreadSuppressionBias: next.retrievalHealth.learningPolicyWrongThreadSuppressionBias,
            learningPolicyProvenanceLabelBias: next.retrievalHealth.learningPolicyProvenanceLabelBias,
            learningPolicyReasonCodes: next.retrievalHealth.learningPolicyReasonCodes,
            selfRevisionPatchCount: next.retrievalHealth.selfRevisionPatchCount,
            selfRevisionMemoryPolicyBias: next.retrievalHealth.selfRevisionMemoryPolicyBias,
            selfRevisionRelationshipPostureBias: next.retrievalHealth.selfRevisionRelationshipPostureBias,
            selfRevisionResponsePostureBias: next.retrievalHealth.selfRevisionResponsePostureBias,
            selfRevisionProactivePolicyBias: next.retrievalHealth.selfRevisionProactivePolicyBias,
            selfRevisionValidationBias: next.retrievalHealth.selfRevisionValidationBias,
            selfRevisionReasonCodes: next.retrievalHealth.selfRevisionReasonCodes,
            relationshipCadenceRegressionRate: next.retrievalHealth.relationshipCadenceRegressionRate,
            selfModelStaleBeliefRate: next.retrievalHealth.selfModelStaleBeliefRate,
            mindParticipation: next.retrievalHealth.mindParticipation,
            memoryParticipation: next.retrievalHealth.memoryParticipation,
            personalityParticipation: next.retrievalHealth.personalityParticipation,
            relationshipParticipation: next.retrievalHealth.relationshipParticipation,
            continuityParticipation: next.retrievalHealth.continuityParticipation,
            runtimeMemoryClosureLongRunClosureRate: next.retrievalHealth.runtimeMemoryClosureLongRunClosureRate,
          })
        }
      })
    }

    return await getMemoryStats()
  }

  async function getJournalMode() {
    const row = await get<JournalModeRow>(database, 'PRAGMA journal_mode;')
    return (row?.journal_mode || '').toLowerCase()
  }

  await initializeSchema()
  await restoreArchivedFactsIntoActiveMemory()
  await enqueueWrite(async () => {
    await drainMemoryIngestJournal()
  })
  await rebuildLongTermMemorySearchIndexForCard(boundCardId, 'initial long-term memory search index rebuild')
  await memoryEmbeddingReindexRuntime.resumePendingJobs(8, boundCardId)
  await memorySemanticScaleJobRuntime.resumePendingJobs(boundCardId)
  await personaTrainingPipelineGate.reconcileAfterRestart({
    cardId: hasBoundCardScope ? boundCardId : null,
    reason: 'application-restarted-before-training-completed',
  })

  return {
    dbPath,
    close: async () => {
      await personaTrainingPipelineGate.stop('database-close')
      await memoryEmbeddingReindexRuntime.stop()
      await memorySemanticScaleJobRuntime.stop()
      await close(database)
    },
    appendRuntimeEvent,
    listRuntimeEvents,
    listRuntimeEventScopes,
    saveRuntimeCheckpoint,
    loadRuntimeCheckpoint,
    getMetaValue,
    setMetaValue: async (key: string, value: string, options?: DbWriteOptions) => {
      await enqueueWrite(async () => {
        await upsertMeta(key, value)
      }, options)
    },
    getLatestConversationSessionId,
    getWorkingMemoryCheckpoint,
    listWorkingMemoryCheckpoints,
    listMemoryWorkbenchReplaySessions,
    upsertWorkingMemoryCheckpoint,
    clearWorkingMemoryCheckpoints,
    listConversationTurnsSince,
    listConversationTurnsBySession,
    appendMindTurnEvents,
    listMindTurnEvents,
    getTaskThread,
    upsertTaskThread,
    resumeTaskThread,
    listTaskThreads,
    upsertChannelCapabilityManifest,
    listChannelCapabilityManifests,
    upsertExecutorSession,
    listExecutorSessions,
    appendExecutionEvents,
    listExecutionEvents,
    clearConversationData,
    appendAuditLog,
    appendConversationTurn,
    getMemoryStats,
    upsertMemoryFacts,
    applyMemoryFactCorrections,
    listMemoryFacts,
    retrieveMemoryFacts,
    retrieveLongTermMemoryEvidence,
    retrieveLongTermMemoryEvidenceReadOnly,
    listMemoryWorkbenchLongTermItems,
    rebuildLongTermMemorySearchIndex,
    listMemoryWorkbenchReviewItems,
    applyMemoryWorkbenchReviewAction,
    runMemoryWorkbenchRecallProbe,
    getMemoryWorkbenchQueueHealth,
    manageMemoryWorkbenchWorkingMemoryCleaningQueue,
    getMemoryWorkbenchRecallHealth,
    getMemoryWorkbenchEmbeddingHealth,
    recordMemoryQualityGoldLabel,
    listMemoryQualityGoldLabels,
    buildMonthlyGoldRegressionPack,
    runMemoryWorkbenchProductionTrial,
    manageMemoryWorkbenchSemanticScaleJobs,
    reindexMemoryWorkbenchEmbeddings,
    resumePendingMemoryEmbeddingReindexJobs,
    listMemoryWorkbenchPersonaCandidates,
    applyMemoryWorkbenchPersonaCandidateAction,
    getPersonaTrainingDataset,
    stagePersonaTrainingDataset,
    exportPersonaTrainingDataset,
    activatePersonaTrainingDataset,
    rollbackPersonaTrainingDataset,
    setPersonaTrainingDatasetExamplePolicy,
    revokePersonaTrainingDatasetSource,
    runPersonaTraining,
    startPersonaTraining,
    getPersonaTrainingRun,
    listPersonaTrainingRuns,
    cancelPersonaTraining,
    rollbackPersonaTrainingIncrement,
    listPersonaTrainingIncrements,
    enqueueWorkingMemoryLongTermQueueItems,
    drainWorkingMemoryLongTermQueue,
    drainWorkingMemoryLongTermQueueScoped,
    listLongTermMemoryReviewItems,
    applyLongTermMemoryReviewDecision,
    tombstoneLongTermMemorySources,
    upsertMemoryReflections,
    listMemoryReflections: memoryRelationshipRuntime.listMemoryReflections,
    appendRelationshipOutcomes: memoryRelationshipRuntime.appendRelationshipOutcomes,
    listRelationshipOutcomes: memoryRelationshipRuntime.listRelationshipOutcomes,
    appendPersonStateEvolutionEntries: personStateEvolutionRuntime.appendEvolutionEntries,
    listPersonStateEvolutionEntries: personStateEvolutionRuntime.listEvolutionEntries,
    summarizePersonStateEvolution: personStateEvolutionRuntime.summarizeEvolution,
    appendEpisodicEvents,
    persistEpisodicReconsolidations,
    listRecentEpisodicEvents,
    listEventGraphNeighborhood,
    searchEpisodicEvents,
    listMemoryConsolidations,
    searchMemoryConsolidations,
    upsertMemoryConsolidations,
    appendPersonaReinforcementEvents: memoryRelationshipRuntime.appendPersonaReinforcementEvents,
    listPersonaReinforcementEvents: memoryRelationshipRuntime.listPersonaReinforcementEvents,
    readMindHead,
    upsertMindHead,
    runMemoryPrune,
    importLegacyMemory,
    overrideMemoryStats,
    listActiveThoughts: memorySubconsciousRuntime.listActiveThoughts,
    replaceActiveThoughts: memorySubconsciousRuntime.replaceActiveThoughts,
    appendSubconsciousFragments: memorySubconsciousRuntime.appendSubconsciousFragments,
    searchSubconsciousFragments: memorySubconsciousRuntime.searchSubconsciousFragments,
    listRecentSubconsciousFragments: memorySubconsciousRuntime.listRecentSubconsciousFragments,
    countSubconsciousFragments: memorySubconsciousRuntime.countSubconsciousFragments,
    appendRelationshipDynamics: memoryRelationshipRuntime.appendRelationshipDynamics,
    getLatestRelationshipDynamics: memoryRelationshipRuntime.getLatestRelationshipDynamics,
    insertScheduledTask,
    claimDueScheduledTasks,
    requeueScheduledTask,
    completeScheduledTask,
    failScheduledTask,
    listPendingScheduledTasks,
    insertLearningTask,
    claimDueLearningTasks,
    startLearningTask,
    blockLearningTask,
    completeLearningTask,
    failLearningTask,
    reopenLearningTask,
    downgradeLearningTask,
    cancelLearningTask,
    listLearningTasks,
    getLatestLearningExecutionState,
    getJournalMode,
  }
}
