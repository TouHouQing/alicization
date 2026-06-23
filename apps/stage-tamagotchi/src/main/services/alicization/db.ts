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
  AlicizationMemoryDomain,
  AlicizationMemoryFact,
  AlicizationMemoryFactInput,
  AlicizationMemoryLegacySnapshot,
  AlicizationMemoryMigrationResult,
  AlicizationMemoryProvenance,
  AlicizationMemoryReflectionInput,
  AlicizationMemoryReflectionRecord,
  AlicizationMemoryReflectionStatus,
  AlicizationMemorySource,
  AlicizationMemoryStats,
  AlicizationMindHeadKey,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
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
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationEventGraphNeighborhood } from './memory-event-graph-runtime'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'

import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { normalizeAlicizationMemoryProvenance } from '@proj-alicization/stage-shared'

import { mapFragmentSourceKindToProvenance, mapMemorySourceToProvenance } from './humanlike-memory'
import { buildMemoryConsolidationRecords, searchMemoryConsolidationRecords } from './memory-consolidation'
import { createAlicizationMemoryConsolidationRuntime } from './memory-consolidation-runtime'
import { rankAlicizationConversationTurnsForRecall } from './memory-conversation-retrieval'
import { inferMemoryDomainFromFact, normalizeMemoryDomain } from './memory-domain-model'
import { createAlicizationMemoryEpisodicReconsolidationRuntime } from './memory-episodic-reconsolidation-runtime'
import { rankAlicizationEpisodicEvents } from './memory-episodic-retrieval'
import { createAlicizationMemoryEventGraphRuntime } from './memory-event-graph-runtime'
import { rankAlicizationMemoryFacts } from './memory-fact-retrieval'
import { createAlicizationMemoryIngestJournalRuntime } from './memory-ingest-journal'
import { createAlicizationMemoryMindStateRuntime } from './memory-mind-state-runtime'
import { createAlicizationMemoryRelationshipRuntime } from './memory-relationship-runtime'
import { createAlicizationMemoryRetrievalTelemetryRuntime } from './memory-retrieval-telemetry'
import { buildAlicizationMemoryStatsProjection } from './memory-stats-projection'
import { createAlicizationMemorySubconsciousRuntime } from './memory-subconscious-runtime'
import {
  deriveConsolidationMemoryTier,
  deriveEpisodicMemoryTier,
  deriveFactMemoryTier,
  deriveTierCounts,
} from './memory-tiering'
import { createAlicizationPersonStateEvolutionRuntime } from './person-state-evolution-runtime'
import { normalizeOrganicRecallText } from './runtime-organic-recall'

export type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
const legacyMigrationMarker = 'legacy_memory_migrated_v1'
const memoryLastPrunedAtKey = 'memory_last_pruned_at'
const memoryRetrievalTelemetryKey = 'memory_retrieval_telemetry_v1'
interface SqliteStatementResult {
  changes: number
  lastID: number
}

interface MetaRow {
  value: string
}

interface JournalModeRow {
  journal_mode: string
}

interface DbMemoryFactRow {
  id: string
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

interface PreparedMemoryFactWrite {
  id: string
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
  updated_at: number
}

interface DbConversationTurnRow {
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
  searchConversations: boolean
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
    updatedAt: row.updated_at,
  }
  mapped.memoryTier = deriveConsolidationMemoryTier(mapped, now())
  return mapped
}

function normalizeExecutionOrigin(value: unknown): AlicizationExecutionTurnOrigin {
  return value === 'subconscious-proactive' || value === 'system'
    ? value
    : 'user-turn'
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
      reason: typeof candidate?.reason === 'string' && candidate.reason.trim() ? candidate.reason.trim().slice(0, 280) : null,
      focuses: Array.isArray(candidate?.focuses) ? candidate.focuses.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 12) : [],
      dominantTrajectory: typeof candidate?.dominantTrajectory === 'string' && candidate.dominantTrajectory.trim() ? candidate.dominantTrajectory.trim().slice(0, 220) : null,
      sourceSignals: Array.isArray(candidate?.sourceSignals) ? candidate.sourceSignals.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 12) : [],
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

function openDatabase(filepath: string) {
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

    database = new sqlite3.Database(filepath, onOpen)
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
  getMetaValue: (key: string) => Promise<string | undefined>
  setMetaValue: (key: string, value: string) => Promise<void>
  getLatestConversationSessionId: () => Promise<string | undefined>
  listConversationTurnsSince: (sinceExclusive: number, options?: { limit?: number }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string | null
    assistantText: string | null
    structuredJson: string | null
    createdAt: number
  }>>
  listConversationTurnsBySession: (sessionId: string, options?: { sinceCreatedAt?: number, limit?: number }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string | null
    assistantText: string | null
    structuredJson: string | null
    createdAt: number
  }>>
  searchConversationTurnsForRecall: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationMemoryRecollectionIntentLike | null
  }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string
    assistantText: string
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
  listTaskThreads: (input?: AlicizationListTaskThreadsInput) => Promise<AlicizationTaskThreadRecord[]>
  upsertChannelCapabilityManifest: (input: AlicizationChannelCapabilityManifestUpsertInput, options?: DbWriteOptions) => Promise<AlicizationChannelCapabilityManifestRecord>
  listChannelCapabilityManifests: (input?: AlicizationListChannelCapabilityManifestsInput) => Promise<AlicizationChannelCapabilityManifestRecord[]>
  upsertExecutorSession: (input: AlicizationExecutorSessionUpsertInput, options?: DbWriteOptions) => Promise<AlicizationExecutorSessionRecord>
  listExecutorSessions: (input?: AlicizationListExecutorSessionsInput) => Promise<AlicizationExecutorSessionRecord[]>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[], options?: DbWriteOptions) => Promise<void>
  listExecutionEvents: (input?: AlicizationListExecutionEventsInput) => Promise<AlicizationExecutionEventRecord[]>
  clearConversationData: () => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput) => Promise<void>
  appendConversationTurn: (input: AlicizationConversationTurnInput, options?: DbWriteOptions) => Promise<void>
  getMemoryStats: () => Promise<AlicizationMemoryStats>
  upsertMemoryFacts: (facts: AlicizationMemoryFactInput[], source: AlicizationMemorySource) => Promise<void>
  applyMemoryFactCorrections: (corrections: AlicizationKnowledgeAssimilationCorrection[]) => Promise<void>
  listMemoryFacts: () => Promise<AlicizationMemoryFact[]>
  retrieveMemoryFacts: (query: string, limit?: number) => Promise<AlicizationMemoryFact[]>
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
  }) => Promise<AlicizationEpisodicEventRecord[]>
  appendPersonaReinforcementEvents: (events: AlicizationPersonaReinforcementEventInput[]) => Promise<AlicizationPersonaReinforcementEventRecord[]>
  listPersonaReinforcementEvents: (input: {
    cardId: string
    limit?: number
    turnId?: string
  }) => Promise<AlicizationPersonaReinforcementEventRecord[]>
  readMindHead: <T>(cardId: string, key: AlicizationMindHeadKey) => Promise<T | null>
  upsertMindHead: (cardId: string, key: AlicizationMindHeadKey, value: unknown) => Promise<void>
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
  }) => Promise<AlicizationLearningTaskRecord>
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

export async function setupAlicizationDb(
  userDataPath: string,
  options?: {
    rootDir?: string
    cardId?: string
  },
): Promise<AlicizationDbService> {
  const rootDir = options?.rootDir
    ?? (options?.cardId ? join(userDataPath, 'alicizations', 'cards', options.cardId) : join(userDataPath, 'alicizations'))
  const dbPath = join(rootDir, 'alicization.db')
  await mkdir(rootDir, { recursive: true })

  const database = await openDatabase(dbPath)

  let writeQueue = Promise.resolve<unknown>(undefined)

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

  async function initializeSchema() {
    await run(database, 'PRAGMA journal_mode = WAL;')
    await run(database, 'PRAGMA busy_timeout = 2000;')
    await run(database, 'PRAGMA foreign_keys = ON;')
    await run(database, 'PRAGMA synchronous = NORMAL;')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_facts (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT NOT NULL,
        dedupe_key TEXT NOT NULL UNIQUE,
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
        supersedes_json TEXT
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
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_facts_updated_at ON memory_facts(updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_facts_last_access_at ON memory_facts(last_access_at DESC)')

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
        id TEXT PRIMARY KEY,
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
        updated_at INTEGER NOT NULL
      )
    `)
    await run(database, 'ALTER TABLE memory_consolidations ADD COLUMN facet TEXT').catch(() => {})
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_consolidations_kind_period ON memory_consolidations(kind, period_ended_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_consolidations_updated_at ON memory_consolidations(updated_at DESC)')

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
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_archive_archived_at ON memory_archive(archived_at DESC)')

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
        turn_id TEXT,
        session_id TEXT NOT NULL,
        user_text TEXT,
        assistant_text TEXT,
        structured_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)

    await run(database, 'ALTER TABLE conversation_turns ADD COLUMN turn_id TEXT').catch(() => {})
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_conversation_turns_turn_id ON conversation_turns(turn_id)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_conversation_turns_session_created_at ON conversation_turns(session_id, created_at DESC)')

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
    const archivedRows = await all<DbMemoryArchiveRow>(database, 'SELECT * FROM memory_archive')
    if (archivedRows.length === 0)
      return 0

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const row of archivedRows) {
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dedupe_key)
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

        await run(database, 'DELETE FROM memory_archive')
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
      all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts'),
      all<DbEpisodicEventRow>(database, 'SELECT * FROM episodic_events'),
      all<DbMemoryConsolidationRow>(database, 'SELECT * FROM memory_consolidations'),
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

  async function appendAuditLog(input: AlicizationAuditLogInput) {
    const createdAt = Number.isFinite(input.createdAt) ? Number(input.createdAt) : now()
    const level = input.level ?? 'info'
    const payloadJson = input.payload ? JSON.stringify(input.payload) : null

    await enqueueWrite(async () => {
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
    })
  }

  async function appendConversationTurn(input: AlicizationConversationTurnInput, options?: DbWriteOptions) {
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
          turn_id,
          session_id,
          user_text,
          assistant_text,
          structured_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
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

  async function getLatestConversationSessionId() {
    const row = await get<{ session_id?: string | null }>(
      database,
      `
      SELECT session_id
      FROM conversation_turns
      WHERE session_id IS NOT NULL AND TRIM(session_id) != ''
      ORDER BY created_at DESC
      LIMIT 1
      `,
    )
    if (typeof row?.session_id !== 'string')
      return undefined
    const normalized = row.session_id.trim()
    return normalized || undefined
  }

  async function listConversationTurnsSince(sinceExclusive: number, options?: { limit?: number }) {
    const limit = Math.max(1, Math.min(10_000, Math.floor(options?.limit ?? 2_000)))
    const rows = await all<DbConversationTurnRow>(
      database,
      `
      SELECT
        turn_id,
        session_id,
        user_text,
        assistant_text,
        structured_json,
        created_at
      FROM conversation_turns
      WHERE created_at > ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [sinceExclusive, limit],
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

  async function listConversationTurnsBySession(sessionIdRaw: string, options?: { sinceCreatedAt?: number, limit?: number }) {
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
        turn_id,
        session_id,
        user_text,
        assistant_text,
        structured_json,
        created_at
      FROM conversation_turns
      WHERE session_id = ?
        AND created_at >= ?
      ORDER BY created_at ASC
      LIMIT ?
      `,
      [sessionId, sinceCreatedAt, limit],
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

  async function searchConversationTurnsForRecall(input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationMemoryRecollectionIntentLike | null
  }) {
    const query = normalizeOrganicRecallText(input.query)
    if (!query)
      return []

    const safeLimit = Math.max(1, Math.min(12, Math.floor(input.limit ?? 6)))
    const rows = await all<DbConversationTurnRow>(
      database,
      `
      SELECT
        turn_id,
        session_id,
        user_text,
        assistant_text,
        structured_json,
        created_at
      FROM conversation_turns
      ORDER BY created_at DESC
      LIMIT 4000
      `,
    )
    if (rows.length === 0)
      return []
    return rankAlicizationConversationTurnsForRecall({
      rows: rows.map(row => ({
        turnId: row.turn_id,
        sessionId: row.session_id,
        userText: row.user_text,
        assistantText: row.assistant_text,
        createdAt: row.created_at,
      })),
      query,
      limit: safeLimit,
      nowTs: now(),
      recollectionIntent: input.recollectionIntent ?? null,
    })
  }

  const memoryConsolidationRuntime = createAlicizationMemoryConsolidationRuntime({
    database,
    all,
    run,
    mapRow: mapMemoryConsolidationRow,
    buildRecords: buildMemoryConsolidationRecords,
    searchRecords: searchMemoryConsolidationRecords,
  })

  async function rebuildMemoryConsolidationsFromEvents(cardId: string) {
    const rows = await all<DbEpisodicEventRow>(
      database,
      `
      SELECT *
      FROM episodic_events
      WHERE card_id = ?
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT 4000
      `,
      [cardId],
    )
    const overlayByEventId = await loadLatestEpisodicReconsolidationOverlayByEventId(
      database,
      all,
      rows.map(row => row.id),
    )
    await memoryConsolidationRuntime.rebuildMemoryConsolidationsFromEvents(
      rows.map((row) => {
        const overlay = overlayByEventId.get(row.id)
        return mapEpisodicEventRow(row, overlay
          ? {
              latest: overlay.latest ? mapEpisodicReconsolidationOverlayRow(overlay.latest) : null,
              count: overlay.count,
            }
          : null)
      }),
      now(),
    )
  }

  async function applyPreparedMemoryFacts(prepared: PreparedMemoryFactWrite[]) {
    for (const fact of prepared) {
      await run(
        database,
        `
        INSERT INTO memory_facts (
          id,
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
	        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(dedupe_key)
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
      await run(
        database,
        `
        INSERT INTO memory_consolidations (
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
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id)
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
          updated_at = excluded.updated_at
        `,
        [
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

  const listMemoryConsolidations = memoryConsolidationRuntime.listMemoryConsolidations

  async function upsertMemoryConsolidations(records: AlicizationMemoryConsolidationRecord[]) {
    if (records.length === 0)
      return []

    const prepared = records.map(record => ({
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

    return prepared.map(record => mapMemoryConsolidationRow({
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
      updated_at: record.updatedAt,
    }))
  }

  const searchMemoryConsolidations = memoryConsolidationRuntime.searchMemoryConsolidations
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
    const origin = normalizeExecutionOrigin(input.origin)
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
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : currentTs
    const updatedAt = Number.isFinite(input.updatedAt)
      ? Math.max(createdAt, Math.floor(Number(input.updatedAt)))
      : currentTs
    const lastEventAt = Number.isFinite(input.lastEventAt)
      ? Math.max(0, Math.floor(Number(input.lastEventAt)))
      : null
    const completedAt = Number.isFinite(input.completedAt)
      ? Math.max(0, Math.floor(Number(input.completedAt)))
      : null

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await run(
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
        ON CONFLICT(id)
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
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          last_event_at = excluded.last_event_at,
          completed_at = excluded.completed_at
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
        ],
      )
    }, options)

    return {
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
      metadata: metadataJson ? parseJsonObject(metadataJson) : null,
      createdAt,
      updatedAt,
      lastEventAt,
      completedAt,
    } satisfies AlicizationTaskThreadRecord
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
          id: randomUUID(),
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
          origin: normalizeExecutionOrigin(event.origin),
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

    const latestByThread = new Map<string, (typeof normalized)[number]>()
    for (const event of normalized) {
      const current = latestByThread.get(event.threadId)
      if (!current || current.createdAt <= event.createdAt) {
        latestByThread.set(event.threadId, event)
      }
    }

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await runInTransaction(database, async () => {
        for (const event of normalized) {
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
        }

        for (const latest of latestByThread.values()) {
          const completedAt = latest.threadStatus === 'completed' || latest.threadStatus === 'failed' || latest.threadStatus === 'cancelled'
            ? latest.createdAt
            : null
          await run(
            database,
            `
            UPDATE task_threads
            SET updated_at = ?,
                last_event_at = ?,
                status = COALESCE(?, status),
                completed_at = COALESCE(?, completed_at)
            WHERE id = ?
            `,
            [
              latest.createdAt,
              latest.createdAt,
              latest.threadStatus,
              completedAt,
              latest.threadId,
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
      await run(database, 'DELETE FROM memory_reflections')
      await run(database, 'DELETE FROM relationship_outcomes')
      await run(database, 'DELETE FROM person_state_evolution_log')
      await run(database, 'DELETE FROM episodic_events')
      await run(database, 'DELETE FROM episodic_reconsolidation_overlays')
      await run(database, 'DELETE FROM event_graph_edges')
      await run(database, 'DELETE FROM event_graph_nodes')
      await run(database, 'DELETE FROM memory_consolidations')
      await run(database, 'DELETE FROM persona_reinforcement_events')
      await run(database, 'DELETE FROM conversation_turns')
      await run(database, 'DELETE FROM mind_turn_events')
      await run(database, 'DELETE FROM task_threads')
      await run(database, 'DELETE FROM executor_sessions')
      await run(database, 'DELETE FROM executor_events')
      await run(database, 'DELETE FROM scheduled_tasks')
      await run(database, 'DELETE FROM learning_tasks')
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
  }) {
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

    const id = randomUUID()
    const createdAt = now()
    const updatedAt = createdAt
    const maxAttempts = Math.max(1, Math.min(8, Math.floor(input.maxAttempts ?? 3)))
    const payloadJson = JSON.stringify(input.payload)
    await enqueueWrite(async () => {
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
    })

    return {
      id,
      cardId,
      taskId,
      status: 'scheduled',
      triggerAt,
      action: input.action,
      message,
      payload: parseLearningTaskPayload(payloadJson),
      attemptCount: 0,
      maxAttempts,
      createdAt,
      updatedAt,
      claimedAt: null,
      startedAt: null,
      completedAt: null,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: input.payload.sourceTurnId,
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    } satisfies AlicizationLearningTaskRecord
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
  }

  async function retrieveMemoryFacts(query: string, limit = 6) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery)
      return []

    const retrievalStartedAt = now()
    const rows = await all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts')
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
            WHERE id = ?
            `,
            [currentTs, item.fact.id],
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
            'SELECT * FROM memory_facts WHERE id = ?',
            [correction.targetFactId],
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
            WHERE id = ?
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
              correction.targetFactId,
            ],
          )
        }
      })
    })
  }

  async function listMemoryFacts() {
    const rows = await all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts')
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
        const cardId = event.cardId.trim()
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
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT ?
      `,
      [safeLimit],
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
  async function persistEpisodicReconsolidations(events: AlicizationEpisodicEventRecord[]) {
    await memoryEpisodicReconsolidationRuntime.persistRecalledEvents(events)
  }
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
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT 4000
      `,
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
      await recordMemoryGraphRetrievalLatency(now() - retrievalStartedAt)
      return []
    }

    const returned = await memoryEpisodicReconsolidationRuntime.reconcileSelectedEvents({
      selected,
      recalledAt: nowTs,
      affectAnchors: input.affectAnchors,
      relationshipAnchors: input.relationshipAnchors,
      carryAsMemory: input.carryAsMemory,
      correctionShapingRationale,
      reconsolidationDecisionTraceId: input.reconsolidationDecisionTraceId,
    })
    await recordMemoryGraphRetrievalLatency(now() - retrievalStartedAt)

    return returned
  }

  async function runMemoryPrune() {
    const currentTs = now()

    // NOTICE: API name retained for bridge compatibility. This no longer deletes or archives
    // memories; it only refreshes salience tiers so long-horizon recall stays lossless.
    await restoreArchivedFactsIntoActiveMemory()
    const facts = (await all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts')).map(mapFactRow)
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

  async function importLegacyMemory(snapshot: AlicizationMemoryLegacySnapshot): Promise<AlicizationMemoryMigrationResult> {
    const currentTs = now()
    const marker = await getMetaValue(legacyMigrationMarker)
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

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const fact of legacyFacts) {
          const subject = fact.subject?.trim()
          const predicate = fact.predicate?.trim()
          const object = fact.object?.trim()
          if (!subject || !predicate || !object)
            continue

          const dedupeKey = fact.dedupeKey?.trim() || buildDedupeKey(subject, predicate, object)
          await run(
            database,
            `
            INSERT INTO memory_facts (
              id,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dedupe_key)
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
              fact.id || randomUUID(),
              subject,
              predicate,
              object,
              clamp01(fact.confidence),
              fact.source,
              dedupeKey,
              fact.createdAt,
              fact.updatedAt,
              fact.lastAccessAt,
              Math.max(0, Math.floor(fact.accessCount)),
              normalizeKnowledgeStage(fact.knowledgeStage),
              normalizeValidationStatus(fact.validationStatus),
              normalizeMemoryDomain((fact as any).memoryDomain),
              Math.max(0, Math.floor(Number(fact.validationCount ?? 0))),
              Math.max(0, Math.floor(Number(fact.contradictionCount ?? 0))),
              fact.sourceLabel?.trim() || null,
              JSON.stringify(fact.conflictsWith ?? []),
              JSON.stringify(fact.supersedes ?? []),
            ],
          )
        }

        for (const item of legacyArchive) {
          const subject = item.subject?.trim()
          const predicate = item.predicate?.trim()
          const object = item.object?.trim()
          if (!subject || !predicate || !object)
            continue

          const dedupeKey = item.dedupeKey?.trim() || buildDedupeKey(subject, predicate, object)
          await run(
            database,
            `
            INSERT INTO memory_facts (
              id,
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
	            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dedupe_key)
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
              item.id || randomUUID(),
              subject,
              predicate,
              object,
              clamp01(item.confidence),
              item.source,
              dedupeKey,
              item.createdAt,
              item.updatedAt,
              item.lastAccessAt,
              Math.max(0, Math.floor(item.accessCount)),
              normalizeKnowledgeStage(item.knowledgeStage),
              normalizeValidationStatus(item.validationStatus),
              normalizeMemoryDomain((item as any).memoryDomain),
              Math.max(0, Math.floor(Number(item.validationCount ?? 0))),
              Math.max(0, Math.floor(Number(item.contradictionCount ?? 0))),
              item.sourceLabel?.trim() || null,
              JSON.stringify(item.conflictsWith ?? []),
              JSON.stringify(item.supersedes ?? []),
            ],
          )
        }

        await run(database, 'DELETE FROM memory_archive')

        if (typeof snapshot.lastPrunedAt === 'number' && Number.isFinite(snapshot.lastPrunedAt)) {
          await upsertMeta(memoryLastPrunedAtKey, String(snapshot.lastPrunedAt))
        }

        await upsertMeta(legacyMigrationMarker, String(currentTs))
      })
    })

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

  return {
    dbPath,
    close: async () => await close(database),
    getMetaValue,
    setMetaValue: async (key: string, value: string) => {
      await enqueueWrite(async () => {
        await upsertMeta(key, value)
      })
    },
    getLatestConversationSessionId,
    listConversationTurnsSince,
    listConversationTurnsBySession,
    searchConversationTurnsForRecall,
    appendMindTurnEvents,
    listMindTurnEvents,
    getTaskThread,
    upsertTaskThread,
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
    upsertMemoryReflections: memoryRelationshipRuntime.upsertMemoryReflections,
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
