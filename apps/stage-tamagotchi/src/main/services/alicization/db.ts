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
  AlicizationListChannelCapabilityManifestsInput,
  AlicizationListExecutionEventsInput,
  AlicizationListExecutorSessionsInput,
  AlicizationListTaskThreadsInput,
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
  AlicizationRelationshipOutcomeInput,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousFragmentSourceKind,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
  AlicizationTaskThreadUpsertInput,
} from '../../../shared/eventa'

import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { deriveMemoryContradictionSignal, deriveMemoryInterferencePenalty } from './humanlike-memory'
import { buildMemoryConsolidationRecords, searchMemoryConsolidationRecords } from './memory-consolidation'
import { mapFragmentSourceKindToProvenance, mapMemorySourceToProvenance } from './humanlike-memory'
import { extractOrganicRecallTerms, isRetrospectiveRecallQuery, normalizeOrganicRecallText } from './runtime-organic-recall'

const dayMs = 24 * 60 * 60 * 1000
const legacyMigrationMarker = 'legacy_memory_migrated_v1'
const memoryLastPrunedAtKey = 'memory_last_pruned_at'
const memoryColdTierThreshold = 0.72
const memoryColdTierAccessWindowDays = 14
const memoryHotTierFreshDays = 2

interface SqliteStatementResult {
  changes: number
  lastID: number
}

interface MetaRow {
  value: string
}

interface CountRow {
  total: number
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
}

interface DbMemoryArchiveRow extends DbMemoryFactRow {
  original_id: string | null
  archived_at: number
}

interface DbMemoryReflectionRow {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: string
  target_scope: string
  summary: string
  lesson: string
  status: AlicizationMemoryReflectionStatus
  confidence: number
  supporting_fact_ids_json: string | null
  supporting_outcome_ids_json: string | null
  created_at: number
  updated_at: number
  confirmed_at: number | null
  denied_at: number | null
}

interface DbRelationshipOutcomeRow {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: string
  action_summary: string
  closeness_delta: number
  trust_delta: number
  burden_delta: number
  boundary_delta: number
  misread_delta: number
  repair_delta: number
  open_loop_delta: number
  summary: string
  created_at: number
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

interface AlicizationMemoryConsolidationRecord {
  id: string
  kind: 'daily' | 'weekly' | 'procedural' | 'autobiographical'
  facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
  periodKey: string
  periodStartedAt: number
  periodEndedAt: number
  summary: string
  lesson: string | null
  cues: string[]
  confidence: number
  dominantProvenance: 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed'
  derivedEventIds: string[]
  updatedAt: number
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

interface DbPersonaReinforcementEventRow {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: string
  dimension: string
  delta: number
  valence: string
  summary: string
  created_at: number
}

interface DbConversationTurnRow {
  turn_id: string | null
  session_id: string
  user_text: string | null
  assistant_text: string | null
  structured_json: string | null
  created_at: number
}

interface DbMindTurnEventRow {
  id: string
  decision_trace_id: string
  turn_id: string | null
  session_id: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  kind: AlicizationMindTurnEventKind
  payload_json: string | null
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

interface DbActiveThoughtRow {
  id: string
  text: string
  created_at: number
  updated_at: number
}

interface DbSubconsciousFragmentRow {
  id: string
  text: string
  source_kind: AlicizationSubconsciousFragmentSourceKind
  created_at: number
  last_recalled_at: number | null
  recall_count: number
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
}

interface AlicizationMemoryConsolidationSearchInput {
  query: string
  limit?: number
  recollectionIntent?: AlicizationMemoryRecollectionIntentLike | null
}

export interface AlicizationRelationshipDynamicsState {
  hostAttitude: string
  previousHostAttitude: string | null
  obedienceDelta: number
  livelinessDelta: number
  sensibilityDelta: number
  source: string
  createdAt: number
}

interface DbRelationshipDynamicsRow {
  host_attitude: string
  previous_host_attitude: string | null
  obedience_delta: number
  liveliness_delta: number
  sensibility_delta: number
  source: string
  created_at: number
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

function buildMindHeadMetaKey(cardId: string, key: AlicizationMindHeadKey) {
  return `mind-head:${cardId}:${key}`
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 2),
  )
}

function uniqueStringArray(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    if (typeof value !== 'string')
      continue
    const normalized = value.trim()
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function scoreFact(queryTokens: Set<string>, fact: AlicizationMemoryFact, currentTs: number) {
  const factTokens = tokenize(`${fact.subject} ${fact.predicate} ${fact.object}`)
  if (factTokens.size === 0)
    return 0

  let overlap = 0
  for (const token of factTokens) {
    if (queryTokens.has(token))
      overlap += 1
  }

  const lexicalScore = overlap / factTokens.size
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const vagueQuery = queryTokens.size <= 3
  const coldTier = isMemoryColdTierFact(fact, currentTs)
  const longTailEligible = coldTier || (ageDays >= 45 && fact.confidence >= 0.72)
  const longTailFloor = longTailEligible && (lexicalScore >= 0.22 || vagueQuery) ? 0.35 : 0
  const decay = Math.max(Math.exp(-ageDays / 14), longTailFloor)
  const accessBoost = Math.min(0.2, fact.accessCount / 50)
  const coldReachabilityBoost = longTailEligible && vagueQuery
    ? Math.min(0.08, fact.confidence * 0.08)
    : 0

  return (lexicalScore * 0.5 + fact.confidence * 0.4 + accessBoost * 0.1) * decay + coldReachabilityBoost
}

function computePruneScore(fact: AlicizationMemoryFact, currentTs: number) {
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const timeDecay = Math.min(1, ageDays / 30)
  const accessFrequencyNorm = Math.min(1, fact.accessCount / 12)
  const confidenceNorm = clamp01(fact.confidence)
  return timeDecay * (1 - accessFrequencyNorm) * (1 - confidenceNorm)
}

function isMemoryColdTierFact(fact: AlicizationMemoryFact, currentTs: number) {
  const daysSinceAccess = fact.lastAccessAt == null
    ? Number.POSITIVE_INFINITY
    : (currentTs - fact.lastAccessAt) / dayMs
  return computePruneScore(fact, currentTs) >= memoryColdTierThreshold
    && daysSinceAccess >= memoryColdTierAccessWindowDays
}

function isMemoryHotTierFact(fact: AlicizationMemoryFact, currentTs: number) {
  const daysSinceUpdate = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const daysSinceAccess = fact.lastAccessAt == null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (currentTs - fact.lastAccessAt) / dayMs)
  return daysSinceUpdate <= memoryHotTierFreshDays
    || daysSinceAccess <= memoryHotTierFreshDays
    || fact.accessCount >= 4
}

function deriveMemoryTierCounts(facts: AlicizationMemoryFact[], currentTs: number) {
  let hot = 0
  let warm = 0
  let cold = 0
  for (const fact of facts) {
    if (isMemoryColdTierFact(fact, currentTs)) {
      cold += 1
      continue
    }
    if (isMemoryHotTierFact(fact, currentTs)) {
      hot += 1
      continue
    }
    warm += 1
  }
  return { hot, warm, cold }
}

function deriveMemoryIntegrity(facts: AlicizationMemoryFact[]) {
  const issues: string[] = []
  const dedupeKeys = new Set<string>()
  const currentTs = now()
  for (const fact of facts) {
    if (!fact.subject.trim() || !fact.predicate.trim() || !fact.object.trim())
      issues.push(`malformed-fact:${fact.id}`)
    if (fact.dedupeKey) {
      if (dedupeKeys.has(fact.dedupeKey))
        issues.push(`duplicate-dedupe:${fact.dedupeKey}`)
      dedupeKeys.add(fact.dedupeKey)
    }
    if (isMemoryColdTierFact(fact, currentTs) && tokenize(`${fact.subject} ${fact.predicate} ${fact.object}`).size === 0)
      issues.push(`cold-unsearchable:${fact.id}`)
  }
  return {
    status: issues.length > 0 ? 'degraded' as const : 'ok' as const,
    issues,
  }
}

function mapFactRow(row: DbMemoryFactRow): AlicizationMemoryFact {
  return {
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
    provenance: mapMemorySourceToProvenance(row.source),
  }
}

function mapMemoryReflectionRow(row: DbMemoryReflectionRow): AlicizationMemoryReflectionRecord {
  return {
    id: row.id,
    cardId: row.card_id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    sourceKind: row.source_kind as AlicizationMemoryReflectionRecord['sourceKind'],
    targetScope: row.target_scope as AlicizationMemoryReflectionRecord['targetScope'],
    summary: row.summary,
    lesson: row.lesson,
    status: row.status,
    confidence: clamp01(row.confidence),
    supportingFactIds: parseJsonStringArray(row.supporting_fact_ids_json),
    supportingOutcomeIds: parseJsonStringArray(row.supporting_outcome_ids_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
    deniedAt: row.denied_at,
  }
}

function mapRelationshipOutcomeRow(row: DbRelationshipOutcomeRow): AlicizationRelationshipOutcomeRecord {
  return {
    id: row.id,
    cardId: row.card_id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    sourceKind: row.source_kind as AlicizationRelationshipOutcomeRecord['sourceKind'],
    actionSummary: row.action_summary,
    closenessDelta: clampRelationshipDelta(row.closeness_delta, 0.2),
    trustDelta: clampRelationshipDelta(row.trust_delta, 0.2),
    burdenDelta: clampRelationshipDelta(row.burden_delta, 0.2),
    boundaryDelta: clampRelationshipDelta(row.boundary_delta, 0.2),
    misreadDelta: clampRelationshipDelta(row.misread_delta, 0.2),
    repairDelta: clampRelationshipDelta(row.repair_delta, 0.2),
    openLoopDelta: clampRelationshipDelta(row.open_loop_delta, 0.2),
    summary: row.summary,
    createdAt: row.created_at,
  }
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
    provenance: provenance === 'observed' || provenance === 'remembered' || provenance === 'dreamt' || provenance === 'inferred' || provenance === 'reconstructed'
      ? provenance
      : 'reconstructed',
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

function mapEpisodicEventRow(row: DbEpisodicEventRow): AlicizationEpisodicEventRecord {
  return {
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
    emotionTags: parseJsonStringArray(row.emotion_tags_json),
    whatChanged: row.what_changed,
    relationshipMeaning: row.relationship_meaning,
    lesson: row.lesson,
    sourceSummary: row.source_summary,
    confidence: clamp01(row.confidence),
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
    reconsolidationCount: Math.max(0, Math.floor(row.reconsolidation_count)),
    latestReconsolidation: mapEpisodicReconsolidation(row.latest_reconsolidation_json),
  }
}

function mapMemoryConsolidationRow(row: DbMemoryConsolidationRow): AlicizationMemoryConsolidationRecord {
  return {
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
}

function mapPersonaReinforcementEventRow(row: DbPersonaReinforcementEventRow): AlicizationPersonaReinforcementEventRecord {
  return {
    id: row.id,
    cardId: row.card_id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    sourceKind: row.source_kind as AlicizationPersonaReinforcementEventRecord['sourceKind'],
    dimension: row.dimension as AlicizationPersonaReinforcementEventRecord['dimension'],
    delta: clampRelationshipDelta(row.delta, 0.4),
    valence: row.valence as AlicizationPersonaReinforcementEventRecord['valence'],
    summary: row.summary,
    createdAt: row.created_at,
  }
}

function mapActiveThoughtRow(row: DbActiveThoughtRow): AlicizationActiveThought {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSubconsciousFragmentRow(row: DbSubconsciousFragmentRow): AlicizationSubconsciousFragment {
  return {
    id: row.id,
    text: row.text,
    sourceKind: row.source_kind,
    createdAt: row.created_at,
    lastRecalledAt: typeof row.last_recalled_at === 'number' ? row.last_recalled_at : null,
    recallCount: Math.max(0, Math.floor(row.recall_count)),
    provenance: mapFragmentSourceKindToProvenance(row.source_kind),
  }
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
  appendEpisodicEvents: (events: AlicizationEpisodicEventInput[]) => Promise<AlicizationEpisodicEventRecord[]>
  listRecentEpisodicEvents: (limit?: number) => Promise<AlicizationEpisodicEventRecord[]>
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
        access_count INTEGER NOT NULL DEFAULT 0
      )
    `)

    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_facts_updated_at ON memory_facts(updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_facts_last_access_at ON memory_facts(last_access_at DESC)')

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
        archived_at INTEGER NOT NULL
      )
    `)

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

  async function readMindHead<T>(cardId: string, key: AlicizationMindHeadKey) {
    const raw = await getMetaValue(buildMindHeadMetaKey(cardId.trim(), key))
    if (!raw)
      return null
    try {
      return JSON.parse(raw) as T
    }
    catch {
      return null
    }
  }

  async function upsertMindHead(cardId: string, key: AlicizationMindHeadKey, value: unknown) {
    const normalizedCardId = cardId.trim()
    if (!normalizedCardId)
      throw new Error('cardId is required')
    await enqueueWrite(async () => {
      await upsertMeta(
        buildMindHeadMetaKey(normalizedCardId, key),
        JSON.stringify(value ?? null),
      )
    })
  }

  async function getLastPrunedAt() {
    const value = await getMetaValue(memoryLastPrunedAtKey)
    if (!value)
      return null

    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed))
      return null
    return parsed
  }

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
              access_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              access_count = MAX(memory_facts.access_count, excluded.access_count)
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
    const [rows, lastPrunedAt] = await Promise.all([
      all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts'),
      getLastPrunedAt(),
    ])

    const facts = rows.map(mapFactRow)
    const active = facts.length
    const tierCounts = deriveMemoryTierCounts(facts, now())
    return {
      total: active,
      active,
      archived: tierCounts.cold,
      tierCounts,
      pendingSyncCount: 0,
      integrity: deriveMemoryIntegrity(facts),
      lastPrunedAt,
    } satisfies AlicizationMemoryStats
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

    const terms = extractOrganicRecallTerms(query)
    const recollectionIntent = input.recollectionIntent ?? null
    const retrospective = recollectionIntent?.temporalFocus === 'cross-session'
      || recollectionIntent?.mode === 'conversation-history'
      || recollectionIntent?.mode === 'relationship-history'
      || recollectionIntent?.mode === 'autobiographical-history'
      || isRetrospectiveRecallQuery(query)
    const nowTs = now()

    const ranked = rows
      .map((row) => {
        const userText = normalizeOrganicRecallText(row.user_text ?? '')
        const assistantText = normalizeOrganicRecallText(row.assistant_text ?? '')
        const combined = `${userText} ${assistantText}`.trim()
        if (!combined)
          return null
        const combinedLower = combined.toLowerCase()
        let lexicalScore = 0
        for (const term of terms) {
          const normalizedTerm = normalizeOrganicRecallText(term).toLowerCase()
          if (!normalizedTerm)
            continue
          if (combinedLower.includes(normalizedTerm))
            lexicalScore += normalizedTerm.length >= 6 ? 2.5 : 1
        }
        let intentScore = 0
        for (const hint of recollectionIntent?.queryHints ?? []) {
          const normalizedHint = normalizeOrganicRecallText(hint).toLowerCase()
          if (!normalizedHint)
            continue
          if (combinedLower.includes(normalizedHint))
            intentScore += normalizedHint.length >= 10 ? 1.8 : 0.8
        }
        const ageHours = Math.max(0, (nowTs - row.created_at) / (60 * 60 * 1000))
        const recencyScore = Math.exp(-ageHours / (24 * 7))
        const oldMemoryBoost = retrospective && ageHours >= 18 ? 0.28 : 0
        const antiRecentPenalty = retrospective && ageHours < 6 ? 0.2 : 0
        const experienceMatchedBoost = recollectionIntent?.temporalFocus === 'experience-matched' && ageHours >= 12 ? 0.16 : 0
        const score = lexicalScore * 0.44 + intentScore * 0.28 + recencyScore * 0.14 + oldMemoryBoost + experienceMatchedBoost - antiRecentPenalty
        return {
          turnId: row.turn_id,
          sessionId: row.session_id,
          userText,
          assistantText,
          createdAt: row.created_at,
          score,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter(row => row.score > (retrospective ? -0.01 : 0.08))
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        return right.createdAt - left.createdAt
      })

    const results: Array<{
      turnId: string | null
      sessionId: string
      userText: string
      assistantText: string
      createdAt: number
    }> = []
    const seenDayKeys = new Set<string>()
    for (const row of ranked) {
      const dayKey = new Date(row.createdAt).toISOString().slice(0, 10)
      if (retrospective && seenDayKeys.has(dayKey))
        continue
      seenDayKeys.add(dayKey)
      results.push({
        turnId: row.turnId,
        sessionId: row.sessionId,
        userText: row.userText,
        assistantText: row.assistantText,
        createdAt: row.createdAt,
      })
      if (results.length >= safeLimit)
        break
    }
    return results
  }

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
    const records = buildMemoryConsolidationRecords({
      events: rows.map(mapEpisodicEventRow),
      now: now(),
    })
    await run(database, 'DELETE FROM memory_consolidations')
    for (const record of records) {
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
        `,
        [
          record.id,
          record.kind,
          record.facet === 'phase' || record.facet === 'relationship-era' || record.facet === 'task-era' || record.facet === 'self-era'
            ? record.facet
            : null,
          record.periodKey,
          record.periodStartedAt,
          record.periodEndedAt,
          record.summary,
          record.lesson,
          JSON.stringify(record.cues),
          record.confidence,
          record.dominantProvenance,
          JSON.stringify(record.derivedEventIds),
          record.updatedAt,
        ],
      )
    }
  }

  async function listMemoryConsolidations(limit = 16) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)))
    const rows = await all<DbMemoryConsolidationRow>(
      database,
      `
      SELECT *
      FROM memory_consolidations
      ORDER BY period_ended_at DESC, updated_at DESC
      LIMIT ?
      `,
      [safeLimit],
    )
    return rows.map(mapMemoryConsolidationRow)
  }

  async function upsertMemoryConsolidations(records: AlicizationMemoryConsolidationRecord[]) {
    if (records.length === 0)
      return []

    const prepared = records.map((record) => ({
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
      await runInTransaction(database, async () => {
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
      })
    })

    return prepared.map((record) => mapMemoryConsolidationRow({
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

  async function searchMemoryConsolidations(input: AlicizationMemoryConsolidationSearchInput) {
    const records = await listMemoryConsolidations(48)
    return searchMemoryConsolidationRecords({
      query: input.query,
      records,
      limit: input.limit,
      recollectionIntent: input.recollectionIntent ?? null,
    })
  }

  async function appendMindTurnEvents(events: AlicizationMindTurnEventInput[], options?: DbWriteOptions) {
    if (events.length === 0)
      return

    const normalized = events
      .map((event) => {
        const decisionTraceId = typeof event.decisionTraceId === 'string'
          ? event.decisionTraceId.trim()
          : ''
        if (!decisionTraceId)
          return null
        const kind = event.kind
        if (!kind)
          return null

        return {
          id: randomUUID(),
          decisionTraceId,
          turnId: typeof event.turnId === 'string' && event.turnId.trim()
            ? event.turnId.trim()
            : null,
          sessionId: typeof event.sessionId === 'string' && event.sessionId.trim()
            ? event.sessionId.trim()
            : null,
          origin: event.origin === 'subconscious-proactive'
            ? 'subconscious-proactive'
            : event.origin === 'system'
              ? 'system'
              : 'user-turn' as const,
          kind,
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
        for (const event of normalized) {
          await run(
            database,
            `
            INSERT INTO mind_turn_events (
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              event.id,
              event.decisionTraceId,
              event.turnId,
              event.sessionId,
              event.origin,
              event.kind,
              event.payloadJson,
              event.createdAt,
            ],
          )
        }
      })
    }, options)
  }

  async function listMindTurnEvents(input: {
    decisionTraceId?: string
    turnId?: string
    activeThreadId?: string
    limit?: number
  }) {
    const decisionTraceId = typeof input.decisionTraceId === 'string'
      ? input.decisionTraceId.trim()
      : ''
    const turnId = typeof input.turnId === 'string'
      ? input.turnId.trim()
      : ''
    const activeThreadId = typeof input.activeThreadId === 'string'
      ? input.activeThreadId.trim()
      : ''
    if (!decisionTraceId && !turnId)
      return [] as AlicizationMindTurnEventRecord[]

    const limit = Math.max(1, Math.min(5_000, Math.floor(input.limit ?? 300)))
    const rows = decisionTraceId && turnId
      ? await all<DbMindTurnEventRow>(
          database,
          `
          SELECT
            id,
            decision_trace_id,
            turn_id,
            session_id,
            origin,
            kind,
            payload_json,
            created_at
          FROM mind_turn_events
          WHERE decision_trace_id = ?
            AND turn_id = ?
          ORDER BY created_at DESC
          LIMIT ?
          `,
          [decisionTraceId, turnId, limit],
        )
      : decisionTraceId
        ? await all<DbMindTurnEventRow>(
            database,
            `
            SELECT
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            FROM mind_turn_events
            WHERE decision_trace_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            `,
            [decisionTraceId, limit],
          )
        : await all<DbMindTurnEventRow>(
            database,
            `
            SELECT
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            FROM mind_turn_events
            WHERE turn_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            `,
            [turnId, limit],
          )

    const mappedRows = [...rows]
      .reverse()
      .map((row): AlicizationMindTurnEventRecord => ({
        id: row.id,
        decisionTraceId: row.decision_trace_id,
        turnId: row.turn_id,
        sessionId: row.session_id,
        origin: row.origin,
        kind: row.kind,
        payload: parseMindTurnEventPayload(row.payload_json),
        createdAt: row.created_at,
      }))

    if (!activeThreadId)
      return mappedRows

    return mappedRows.filter((row) => {
      return resolveMindTurnEventActiveThreadId(row.payload) === activeThreadId
    })
  }

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
      await run(database, 'DELETE FROM episodic_events')
      await run(database, 'DELETE FROM memory_consolidations')
      await run(database, 'DELETE FROM persona_reinforcement_events')
      await run(database, 'DELETE FROM conversation_turns')
      await run(database, 'DELETE FROM mind_turn_events')
      await run(database, 'DELETE FROM task_threads')
      await run(database, 'DELETE FROM executor_sessions')
      await run(database, 'DELETE FROM executor_events')
      await run(database, 'DELETE FROM scheduled_tasks')
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
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (normalizedFacts.length === 0)
      return

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const fact of normalizedFacts) {
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
              access_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dedupe_key)
            DO UPDATE SET
              confidence = MAX(memory_facts.confidence, excluded.confidence),
              source = excluded.source,
              updated_at = excluded.updated_at
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
            ],
          )
        }
      })
    })
  }

  async function retrieveMemoryFacts(query: string, limit = 6) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery)
      return []

    const rows = await all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts')
    if (rows.length === 0)
      return []

    const facts = rows.map(mapFactRow)
    const queryTokens = tokenize(normalizedQuery)
    const currentTs = now()
    const ranked = facts
      .map(fact => ({
        fact,
        score: scoreFact(queryTokens, fact, currentTs),
      }))
      .filter(item => item.score > 0.01)
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(0, limit))

    if (ranked.length === 0)
      return []

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

    return ranked.map(item => item.fact)
  }

  async function upsertMemoryReflections(entries: AlicizationMemoryReflectionInput[]) {
    if (entries.length === 0)
      return []

    const prepared = entries
      .map((entry) => {
        const cardId = entry.cardId.trim()
        const summary = entry.summary.trim()
        const lesson = entry.lesson.trim()
        if (!cardId || !summary || !lesson)
          return null
        const createdAt = Number.isFinite(entry.createdAt) ? Math.max(0, Math.floor(entry.createdAt!)) : now()
        const updatedAt = Number.isFinite(entry.updatedAt) ? Math.max(0, Math.floor(entry.updatedAt!)) : createdAt
        return {
          id: entry.id?.trim() || randomUUID(),
          cardId,
          decisionTraceId: entry.decisionTraceId?.trim() || null,
          turnId: entry.turnId?.trim() || null,
          sessionId: entry.sessionId?.trim() || null,
          sourceKind: entry.sourceKind,
          targetScope: entry.targetScope,
          summary,
          lesson,
          status: entry.status ?? 'pending',
          confidence: clamp01(entry.confidence),
          supportingFactIdsJson: JSON.stringify((entry.supportingFactIds ?? []).filter(Boolean)),
          supportingOutcomeIdsJson: JSON.stringify((entry.supportingOutcomeIds ?? []).filter(Boolean)),
          createdAt,
          updatedAt,
          confirmedAt: Number.isFinite(entry.confirmedAt) ? Math.max(0, Math.floor(entry.confirmedAt!)) : null,
          deniedAt: Number.isFinite(entry.deniedAt) ? Math.max(0, Math.floor(entry.deniedAt!)) : null,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

    if (prepared.length === 0)
      return []

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const entry of prepared) {
          await run(
            database,
            `
            INSERT INTO memory_reflections (
              id,
              card_id,
              decision_trace_id,
              turn_id,
              session_id,
              source_kind,
              target_scope,
              summary,
              lesson,
              status,
              confidence,
              supporting_fact_ids_json,
              supporting_outcome_ids_json,
              created_at,
              updated_at,
              confirmed_at,
              denied_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id)
            DO UPDATE SET
              decision_trace_id = excluded.decision_trace_id,
              turn_id = excluded.turn_id,
              session_id = excluded.session_id,
              source_kind = excluded.source_kind,
              target_scope = excluded.target_scope,
              summary = excluded.summary,
              lesson = excluded.lesson,
              status = excluded.status,
              confidence = excluded.confidence,
              supporting_fact_ids_json = excluded.supporting_fact_ids_json,
              supporting_outcome_ids_json = excluded.supporting_outcome_ids_json,
              updated_at = excluded.updated_at,
              confirmed_at = excluded.confirmed_at,
              denied_at = excluded.denied_at
            `,
            [
              entry.id,
              entry.cardId,
              entry.decisionTraceId,
              entry.turnId,
              entry.sessionId,
              entry.sourceKind,
              entry.targetScope,
              entry.summary,
              entry.lesson,
              entry.status,
              entry.confidence,
              entry.supportingFactIdsJson,
              entry.supportingOutcomeIdsJson,
              entry.createdAt,
              entry.updatedAt,
              entry.confirmedAt,
              entry.deniedAt,
            ],
          )
        }
      })
    })

    return prepared.map(entry => mapMemoryReflectionRow({
      id: entry.id,
      card_id: entry.cardId,
      decision_trace_id: entry.decisionTraceId,
      turn_id: entry.turnId,
      session_id: entry.sessionId,
      source_kind: entry.sourceKind,
      target_scope: entry.targetScope,
      summary: entry.summary,
      lesson: entry.lesson,
      status: entry.status,
      confidence: entry.confidence,
      supporting_fact_ids_json: entry.supportingFactIdsJson,
      supporting_outcome_ids_json: entry.supportingOutcomeIdsJson,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      confirmed_at: entry.confirmedAt,
      denied_at: entry.deniedAt,
    }))
  }

  async function listMemoryReflections(input: {
    cardId: string
    limit?: number
    turnId?: string
    status?: AlicizationMemoryReflectionStatus
  }) {
    const cardId = input.cardId.trim()
    if (!cardId)
      return []

    const params: unknown[] = [cardId]
    const where = ['card_id = ?']
    if (input.turnId?.trim()) {
      where.push('turn_id = ?')
      params.push(input.turnId.trim())
    }
    if (input.status) {
      where.push('status = ?')
      params.push(input.status)
    }
    const limit = Math.max(1, Math.floor(input.limit ?? 8))
    params.push(limit)

    const rows = await all<DbMemoryReflectionRow>(
      database,
      `SELECT * FROM memory_reflections WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`,
      params,
    )

    return rows.map(mapMemoryReflectionRow)
  }

  async function appendRelationshipOutcomes(entries: AlicizationRelationshipOutcomeInput[]) {
    if (entries.length === 0)
      return []

    const prepared = entries
      .map((entry) => {
        const cardId = entry.cardId.trim()
        const actionSummary = entry.actionSummary.trim()
        const summary = entry.summary.trim()
        if (!cardId || !actionSummary || !summary)
          return null
        const createdAt = Number.isFinite(entry.createdAt) ? Math.max(0, Math.floor(entry.createdAt!)) : now()
        return {
          id: entry.id?.trim() || randomUUID(),
          cardId,
          decisionTraceId: entry.decisionTraceId?.trim() || null,
          turnId: entry.turnId?.trim() || null,
          sessionId: entry.sessionId?.trim() || null,
          sourceKind: entry.sourceKind,
          actionSummary,
          closenessDelta: clampRelationshipDelta(entry.closenessDelta, 0.2),
          trustDelta: clampRelationshipDelta(entry.trustDelta, 0.2),
          burdenDelta: clampRelationshipDelta(entry.burdenDelta, 0.2),
          boundaryDelta: clampRelationshipDelta(entry.boundaryDelta, 0.2),
          misreadDelta: clampRelationshipDelta(entry.misreadDelta, 0.2),
          repairDelta: clampRelationshipDelta(entry.repairDelta, 0.2),
          openLoopDelta: clampRelationshipDelta(entry.openLoopDelta, 0.2),
          summary,
          createdAt,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

    if (prepared.length === 0)
      return []

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const entry of prepared) {
          await run(
            database,
            `
            INSERT INTO relationship_outcomes (
              id,
              card_id,
              decision_trace_id,
              turn_id,
              session_id,
              source_kind,
              action_summary,
              closeness_delta,
              trust_delta,
              burden_delta,
              boundary_delta,
              misread_delta,
              repair_delta,
              open_loop_delta,
              summary,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              entry.id,
              entry.cardId,
              entry.decisionTraceId,
              entry.turnId,
              entry.sessionId,
              entry.sourceKind,
              entry.actionSummary,
              entry.closenessDelta,
              entry.trustDelta,
              entry.burdenDelta,
              entry.boundaryDelta,
              entry.misreadDelta,
              entry.repairDelta,
              entry.openLoopDelta,
              entry.summary,
              entry.createdAt,
            ],
          )
        }
      })
    })

    return prepared.map(entry => mapRelationshipOutcomeRow({
      id: entry.id,
      card_id: entry.cardId,
      decision_trace_id: entry.decisionTraceId,
      turn_id: entry.turnId,
      session_id: entry.sessionId,
      source_kind: entry.sourceKind,
      action_summary: entry.actionSummary,
      closeness_delta: entry.closenessDelta,
      trust_delta: entry.trustDelta,
      burden_delta: entry.burdenDelta,
      boundary_delta: entry.boundaryDelta,
      misread_delta: entry.misreadDelta,
      repair_delta: entry.repairDelta,
      open_loop_delta: entry.openLoopDelta,
      summary: entry.summary,
      created_at: entry.createdAt,
    }))
  }

  async function listRelationshipOutcomes(input: {
    cardId: string
    limit?: number
    turnId?: string
  }) {
    const cardId = input.cardId.trim()
    if (!cardId)
      return []

    const params: unknown[] = [cardId]
    const where = ['card_id = ?']
    if (input.turnId?.trim()) {
      where.push('turn_id = ?')
      params.push(input.turnId.trim())
    }
    const limit = Math.max(1, Math.floor(input.limit ?? 16))
    params.push(limit)
    const rows = await all<DbRelationshipOutcomeRow>(
      database,
      `SELECT * FROM relationship_outcomes WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
      params,
    )
    return rows.map(mapRelationshipOutcomeRow)
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
        const provenance = event.provenance === 'observed' || event.provenance === 'remembered' || event.provenance === 'dreamt' || event.provenance === 'inferred' || event.provenance === 'reconstructed'
          ? event.provenance
          : 'remembered'
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
      await runInTransaction(database, async () => {
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
        for (const cardId of [...new Set(prepared.map(event => event.cardId))])
          await rebuildMemoryConsolidationsFromEvents(cardId)
      })
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
    return rows.map(mapEpisodicEventRow)
  }

  function scoreTokenOverlap(tokens: Set<string>, text: string) {
    if (tokens.size === 0)
      return 0
    const haystack = tokenize(text)
    if (haystack.size === 0)
      return 0
    let overlap = 0
    for (const token of haystack) {
      if (tokens.has(token))
        overlap += 1
    }
    return overlap / haystack.size
  }

  function buildReconsolidationSearchText(event: AlicizationEpisodicEventRecord) {
    return [
      event.threadAnchor,
      event.latestReconsolidation?.reason,
      event.latestReconsolidation?.relationshipMeaning,
      event.latestReconsolidation?.lesson,
      ...(event.latestReconsolidation?.emotionTags ?? []),
    ].filter(Boolean).join(' ')
  }

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
    const threadTokens = tokenize((input.threadAnchors ?? []).join(' '))
    const affectTokens = tokenize((input.affectAnchors ?? []).join(' '))
    const relationshipTokens = tokenize((input.relationshipAnchors ?? []).join(' '))
    const sceneTokens = tokenize(input.sceneAnchor ?? '')
    const recallTokens = tokenize(recallSeed)
    const allowDream = input.allowDream === true
    const salienceBias = clamp01(Number(input.salienceBias ?? 0.5))
    const recollectionIntent = input.recollectionIntent ?? null
    const correctionShapingRationale = (
      (input.affectAnchors?.length ?? 0) > 0
      || (input.relationshipAnchors?.length ?? 0) > 0
    )
      ? normalizeOrganicMemoryText(recollectionIntent?.rationale ?? '', 200)
      : ''

    const ranked = rows
      .map(mapEpisodicEventRow)
      .filter((event) => {
        if (!allowDream && event.provenance === 'dreamt')
          return false
        if ((event.provenance === 'dreamt' || event.latestReconsolidation?.provenance === 'dreamt') && !allowDream)
          return false
        return true
      })
      .map((event) => {
        const latestProvenance = event.latestReconsolidation?.provenance ?? event.provenance
        const memoryText = [
          event.threadAnchor,
          event.whereSummary,
          event.whatHappened,
          event.felt,
          event.whatChanged,
          event.relationshipMeaning,
          event.lesson,
          event.sourceSummary,
          ...event.withWhom,
          ...event.emotionTags,
          ...event.tags,
        ].filter(Boolean).join(' ')
        const reconsolidationText = buildReconsolidationSearchText(event)
        const lexicalScore = scoreTokenOverlap(recallTokens, memoryText)
        const reconsolidationLexicalScore = scoreTokenOverlap(recallTokens, reconsolidationText)
        const threadScore = scoreTokenOverlap(threadTokens, `${event.threadAnchor ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`)
        const reconsolidationThreadScore = scoreTokenOverlap(threadTokens, reconsolidationText)
        const affectScore = scoreTokenOverlap(affectTokens, `${event.felt ?? ''} ${event.emotionTags.join(' ')} ${event.whatChanged ?? ''}`)
        const reconsolidationAffectScore = scoreTokenOverlap(affectTokens, reconsolidationText)
        const relationshipScore = scoreTokenOverlap(relationshipTokens, `${event.withWhom.join(' ')} ${event.relationshipMeaning ?? ''} ${event.whatChanged ?? ''}`)
        const reconsolidationRelationshipScore = scoreTokenOverlap(relationshipTokens, reconsolidationText)
        const sceneScore = scoreTokenOverlap(sceneTokens, `${event.whereSummary ?? ''} ${event.threadAnchor ?? ''}`)
        const intentScore = scoreTokenOverlap(
          tokenize((recollectionIntent?.queryHints ?? []).join(' ')),
          `${event.whereSummary ?? ''} ${event.threadAnchor ?? ''} ${event.whatHappened} ${event.lesson ?? ''} ${event.relationshipMeaning ?? ''} ${event.sourceSummary ?? ''} ${event.tags.join(' ')}`,
        )
        const reconsolidationIntentScore = scoreTokenOverlap(
          tokenize((recollectionIntent?.queryHints ?? []).join(' ')),
          reconsolidationText,
        )
        const recencyScore = Math.exp(-Math.max(0, nowTs - event.occurredAt) / (28 * dayMs))
        const recallRecencyScore = event.lastRecalledAt
          ? Math.exp(-Math.max(0, nowTs - event.lastRecalledAt) / (7 * dayMs))
          : 0
        const reconsolidationRecencyScore = event.latestReconsolidation?.at
          ? Math.exp(-Math.max(0, nowTs - event.latestReconsolidation.at) / (14 * dayMs))
          : 0
        const ageDays = Math.max(0, (nowTs - event.occurredAt) / dayMs)
        const distantBoost = recollectionIntent?.temporalFocus === 'cross-session' && ageDays >= 2 ? 0.12 : 0
        const experienceMatchedBoost = recollectionIntent?.temporalFocus === 'experience-matched' && ageDays >= 1 ? 0.1 : 0
        const proceduralBoost = recollectionIntent?.searchProceduralExperience
          && (
            event.sourceKind === 'execution-proposal'
            || event.sourceKind === 'execution-result'
            || /execution|proposal|result|cli|codex|claude|patch|fix|workflow|步骤/iu.test(`${event.whatHappened} ${event.lesson ?? ''}`)
          )
          ? 0.14
          : 0
        const relationshipTriggerBoost = (
          recollectionIntent?.mode === 'relationship-history'
          || recollectionIntent?.mode === 'autobiographical-history'
        ) && relationshipScore > 0.18
          ? 0.08
          : 0
        const moodCongruentBoost = affectScore > 0.18 && (
          recollectionIntent?.mode === 'relationship-history'
          || recollectionIntent?.mode === 'autobiographical-history'
        )
          ? 0.06
          : 0
        const sceneAttachmentBoost = sceneScore > 0.14
          ? Math.min(0.12, event.sceneAttachment * 0.12 + sceneScore * 0.08)
          : 0
        const familiarityScore = clamp01(event.sceneAttachment * 0.55 + Math.min(0.45, event.recallCount / 10))
        const reconsolidationConfidenceScore = clamp01(event.latestReconsolidation?.confidence ?? 0)
        const reconsolidationCountScore = event.reconsolidationCount > 0
          ? clamp01(Math.min(1, event.reconsolidationCount / 4))
          : 0
        const reconsolidationRebindingBoost = event.reconsolidationCount > 0
          && (input.carryAsMemory || recollectionIntent?.temporalFocus === 'experience-matched')
          && (threadScore >= 0.12 || reconsolidationThreadScore >= 0.12)
          ? Math.min(0.3, 0.14 + reconsolidationRecencyScore * 0.08 + reconsolidationCountScore * 0.08)
          : 0
        const emotionalAmplification = affectScore > 0.24
          ? Math.min(0.14, event.salience * 0.18 + affectScore * 0.12)
          : 0
        const sessionBoost = input.sessionId && event.sessionId === input.sessionId ? 0.06 : 0
        const turnBoost = input.turnId && event.turnId === input.turnId ? 0.04 : 0
        const carryBoost = input.carryAsMemory && (event.provenance === 'remembered' || event.provenance === 'observed') ? 0.04 : 0
        const reconsolidationCarryBoost = input.carryAsMemory && event.reconsolidationCount > 0 ? 0.04 : 0
        const provenancePenalty = latestProvenance === 'dreamt'
          ? 0.06
          : latestProvenance === 'reconstructed'
            ? 0.03
            : 0
        const unstableReconstructionPenalty = latestProvenance === 'reconstructed'
          && lexicalScore < 0.08
          && threadScore < 0.12
          && reconsolidationLexicalScore < 0.12
          ? 0.04
          : 0

        const score
          = lexicalScore * 0.18
            + reconsolidationLexicalScore * 0.08
            + threadScore * 0.26
            + reconsolidationThreadScore * 0.08
            + affectScore * 0.18
            + reconsolidationAffectScore * 0.06
            + relationshipScore * 0.17
            + reconsolidationRelationshipScore * 0.07
            + sceneScore * 0.07
            + intentScore * 0.14
            + reconsolidationIntentScore * 0.08
            + event.salience * (0.12 + salienceBias * 0.08)
            + recencyScore * 0.08
            + recallRecencyScore * 0.08
            + reconsolidationRecencyScore * 0.08
            + familiarityScore * 0.06
            + reconsolidationConfidenceScore * 0.05
            + reconsolidationCountScore * 0.05
            + reconsolidationRebindingBoost
            + emotionalAmplification
            + sessionBoost
            + turnBoost
            + carryBoost
            + reconsolidationCarryBoost
            + distantBoost
            + experienceMatchedBoost
            + proceduralBoost
            + relationshipTriggerBoost
            + moodCongruentBoost
            + sceneAttachmentBoost
            - provenancePenalty
            - unstableReconstructionPenalty

        return {
          event,
          score,
          affectScore,
          relationshipScore,
          falseMemoryRisk: threadScore < 0.12 && affectScore > 0.24 && relationshipScore < 0.08,
        }
      })
      .filter(item => item.score >= 0.18)
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        if (left.event.salience !== right.event.salience)
          return right.event.salience - left.event.salience
        return right.event.occurredAt - left.event.occurredAt
      })

    const selected = ranked
      .map((item, index) => ({
        ...item,
        interferencePenalty: deriveMemoryInterferencePenalty({
          current: item.event,
          strongerMatches: ranked.slice(0, index).map(candidate => candidate.event),
        }),
        contradictionSignal: deriveMemoryContradictionSignal({
          current: item.event,
          strongerMatches: ranked
            .filter(candidate => candidate.event.id !== item.event.id)
            .map(candidate => candidate.event),
        }),
      }))
      .map((item) => ({
        ...item,
        adjustedScore: item.score - item.interferencePenalty - item.contradictionSignal.penalty,
      }))
      .filter(item => item.adjustedScore >= 0.15)
      .slice(0, safeLimit)

    if (selected.length === 0)
      return []

    const recalledAt = nowTs
    const returned = selected.map((item) => {
      const mergedEmotionTags = uniqueStringArray([
        ...item.event.emotionTags,
        ...(item.contradictionSignal.unresolved ? ['contradiction-pressure'] : []),
        ...(input.affectAnchors ?? []),
      ], 8)
      const nextConfidence = clamp01(
        item.falseMemoryRisk
          ? item.event.confidence * 0.82 + item.adjustedScore * 0.12
          : item.contradictionSignal.unresolved
            ? item.event.confidence * 0.76 + item.adjustedScore * 0.1
            : item.event.confidence * 0.88 + item.adjustedScore * 0.18,
      )
      const reconsolidation: AlicizationEpisodicReconsolidationSnapshot = {
        at: recalledAt,
        decisionTraceId: typeof input.reconsolidationDecisionTraceId === 'string' && input.reconsolidationDecisionTraceId.trim()
          ? input.reconsolidationDecisionTraceId.trim()
          : item.event.latestReconsolidation?.decisionTraceId ?? null,
        provenance: item.falseMemoryRisk || item.contradictionSignal.unresolved ? 'reconstructed' : item.event.provenance,
        confidence: nextConfidence,
        reason: item.falseMemoryRisk
          ? 'Affect-heavy recall needed reconstruction because the thread anchor was weak.'
          : item.contradictionSignal.unresolved
            ? item.contradictionSignal.reason
            : 'Recall re-bound this memory to the current thread, affect, and relationship context.',
        emotionTags: mergedEmotionTags,
        relationshipMeaning: item.contradictionSignal.unresolved
          ? normalizeOrganicMemoryText(
              [
                item.event.relationshipMeaning,
                'Another remembered variant of this same thread is still pulling in a different direction.',
              ].filter(Boolean).join(' '),
              180,
            ) || null
          : item.event.relationshipMeaning || normalizeOrganicMemoryText((input.relationshipAnchors ?? []).join(' / '), 180) || null,
        lesson: item.contradictionSignal.unresolved
          ? normalizeOrganicMemoryText(
              [
                item.event.lesson,
                'Conflicting remembered variants remain unresolved, so answer this memory with uncertainty rather than certainty.',
              ].filter(Boolean).join(' '),
              200,
            ) || null
          : normalizeOrganicMemoryText(
              [
                item.event.lesson,
                correctionShapingRationale,
              ].filter(Boolean).join(' '),
              200,
            ) || (input.carryAsMemory ? 'This memory still matters to the current bond and should shape tone with care.' : null),
      }
      return {
        ...item.event,
        confidence: nextConfidence,
        emotionTags: mergedEmotionTags,
        relationshipMeaning: reconsolidation.relationshipMeaning ?? null,
        lesson: reconsolidation.lesson ?? null,
        updatedAt: recalledAt,
        lastRecalledAt: recalledAt,
        recallCount: item.event.recallCount + 1,
        reconsolidationCount: item.event.reconsolidationCount + 1,
        latestReconsolidation: reconsolidation,
      } satisfies AlicizationEpisodicEventRecord
    })

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const event of returned) {
          await run(
            database,
            `
            UPDATE episodic_events
            SET confidence = ?,
                emotion_tags_json = ?,
                relationship_meaning = ?,
                lesson = ?,
                updated_at = ?,
                last_recalled_at = ?,
                recall_count = ?,
                reconsolidation_count = ?,
                latest_reconsolidation_json = ?
            WHERE id = ?
            `,
            [
              event.confidence,
              JSON.stringify(event.emotionTags),
              event.relationshipMeaning,
              event.lesson,
              event.updatedAt,
              event.lastRecalledAt,
              event.recallCount,
              event.reconsolidationCount,
              JSON.stringify(event.latestReconsolidation),
              event.id,
            ],
          )
        }
      })
    })

    return returned
  }

  async function appendPersonaReinforcementEvents(events: AlicizationPersonaReinforcementEventInput[]) {
    if (events.length === 0)
      return []

    const prepared = events
      .map((event) => {
        const cardId = event.cardId.trim()
        const summary = event.summary.trim()
        if (!cardId || !summary)
          return null
        const createdAt = Number.isFinite(event.createdAt) ? Math.max(0, Math.floor(event.createdAt!)) : now()
        return {
          id: event.id?.trim() || randomUUID(),
          cardId,
          decisionTraceId: event.decisionTraceId?.trim() || null,
          turnId: event.turnId?.trim() || null,
          sessionId: event.sessionId?.trim() || null,
          sourceKind: event.sourceKind,
          dimension: event.dimension,
          delta: clampRelationshipDelta(event.delta, 0.4),
          valence: event.valence,
          summary,
          createdAt,
        }
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event))

    if (prepared.length === 0)
      return []

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const event of prepared) {
          await run(
            database,
            `
            INSERT INTO persona_reinforcement_events (
              id,
              card_id,
              decision_trace_id,
              turn_id,
              session_id,
              source_kind,
              dimension,
              delta,
              valence,
              summary,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              event.id,
              event.cardId,
              event.decisionTraceId,
              event.turnId,
              event.sessionId,
              event.sourceKind,
              event.dimension,
              event.delta,
              event.valence,
              event.summary,
              event.createdAt,
            ],
          )
        }
      })
    })

    return prepared.map(event => mapPersonaReinforcementEventRow({
      id: event.id,
      card_id: event.cardId,
      decision_trace_id: event.decisionTraceId,
      turn_id: event.turnId,
      session_id: event.sessionId,
      source_kind: event.sourceKind,
      dimension: event.dimension,
      delta: event.delta,
      valence: event.valence,
      summary: event.summary,
      created_at: event.createdAt,
    }))
  }

  async function listPersonaReinforcementEvents(input: {
    cardId: string
    limit?: number
    turnId?: string
  }) {
    const cardId = input.cardId.trim()
    if (!cardId)
      return []

    const params: unknown[] = [cardId]
    const where = ['card_id = ?']
    if (input.turnId?.trim()) {
      where.push('turn_id = ?')
      params.push(input.turnId.trim())
    }
    const limit = Math.max(1, Math.floor(input.limit ?? 24))
    params.push(limit)
    const rows = await all<DbPersonaReinforcementEventRow>(
      database,
      `SELECT * FROM persona_reinforcement_events WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
      params,
    )
    return rows.map(mapPersonaReinforcementEventRow)
  }

  async function runMemoryPrune() {
    const currentTs = now()

    // NOTICE: API name retained for bridge compatibility. This no longer deletes or archives
    // memories; it only refreshes salience tiers so long-horizon recall stays lossless.
    await restoreArchivedFactsIntoActiveMemory()
    const facts = (await all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts')).map(mapFactRow)
    const coldTierCount = facts.filter(fact => isMemoryColdTierFact(fact, currentTs)).length

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

  function mapRelationshipDynamicsRow(row: DbRelationshipDynamicsRow): AlicizationRelationshipDynamicsState {
    return {
      hostAttitude: normalizeOrganicMemoryText(row.host_attitude, 120),
      previousHostAttitude: normalizeOrganicMemoryText(row.previous_host_attitude, 120) || null,
      obedienceDelta: clampRelationshipDelta(row.obedience_delta),
      livelinessDelta: clampRelationshipDelta(row.liveliness_delta),
      sensibilityDelta: clampRelationshipDelta(row.sensibility_delta),
      source: normalizeOrganicMemoryText(row.source, 64) || 'unknown',
      createdAt: Number.isFinite(row.created_at) ? Math.max(0, Math.floor(row.created_at)) : 0,
    }
  }

  async function listActiveThoughts() {
    const rows = await all<DbActiveThoughtRow>(
      database,
      `
      SELECT
        id,
        text,
        created_at,
        updated_at
      FROM active_thoughts
      ORDER BY updated_at DESC, created_at DESC
      `,
    )
    return rows.map(mapActiveThoughtRow)
  }

  async function replaceActiveThoughts(thoughts: Array<{ text: string }>) {
    const normalized = thoughts
      .map(item => normalizeOrganicMemoryText(item.text, 120))
      .filter(Boolean)
      .filter((item, index, current) => current.findIndex(candidate => candidate.toLowerCase() === item.toLowerCase()) === index)
      .slice(0, 5)
    const currentTs = now()

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        await run(database, 'DELETE FROM active_thoughts')
        for (const text of normalized) {
          await run(
            database,
            `
            INSERT INTO active_thoughts (
              id,
              text,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?)
            `,
            [randomUUID(), text, currentTs, currentTs],
          )
        }
      })
    })

    return await listActiveThoughts()
  }

  async function appendSubconsciousFragments(fragments: Array<{ text: string, sourceKind: AlicizationSubconsciousFragmentSourceKind }>) {
    const normalized = fragments
      .map(item => ({
        sourceKind: item.sourceKind,
        text: normalizeOrganicMemoryText(item.text, 160),
      }))
      .filter(item => item.text)
      .filter((item, index, current) => current.findIndex(candidate => candidate.sourceKind === item.sourceKind && candidate.text.toLowerCase() === item.text.toLowerCase()) === index)

    if (normalized.length === 0)
      return []

    const inserted: AlicizationSubconsciousFragment[] = []
    const currentTs = now()
    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const item of normalized) {
          const existing = await get<{ id?: string }>(
            database,
            `
            SELECT id
            FROM subconscious_fragments
            WHERE source_kind = ?
              AND lower(text) = lower(?)
            LIMIT 1
            `,
            [item.sourceKind, item.text],
          )
          if (existing?.id)
            continue

          const id = randomUUID()
          await run(
            database,
            `
            INSERT INTO subconscious_fragments (
              id,
              text,
              source_kind,
              created_at,
              last_recalled_at,
              recall_count
            ) VALUES (?, ?, ?, ?, NULL, 0)
            `,
            [id, item.text, item.sourceKind, currentTs],
          )
          await run(
            database,
            `
            INSERT INTO subconscious_fragments_fts (
              fragment_id,
              text
            ) VALUES (?, ?)
            `,
            [id, item.text],
          )
          inserted.push({
            id,
            text: item.text,
            sourceKind: item.sourceKind,
            createdAt: currentTs,
            lastRecalledAt: null,
            recallCount: 0,
          })
        }
      })
    })

    return inserted
  }

  async function searchSubconsciousFragments(query: string, limit = 6) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery)
      return []

    const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)))
    const rows = await all<DbSubconsciousFragmentRow>(
      database,
      `
      SELECT
        sf.id,
        sf.text,
        sf.source_kind,
        sf.created_at,
        sf.last_recalled_at,
        sf.recall_count
      FROM subconscious_fragments_fts
      JOIN subconscious_fragments sf
        ON sf.id = subconscious_fragments_fts.fragment_id
      WHERE subconscious_fragments_fts MATCH ?
      ORDER BY bm25(subconscious_fragments_fts), sf.created_at DESC
      LIMIT ?
      `,
      [normalizedQuery, safeLimit],
    )
    const mapped = rows.map(mapSubconsciousFragmentRow)
    if (mapped.length === 0)
      return mapped

    const recalledAt = now()
    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const fragment of mapped) {
          await run(
            database,
            `
            UPDATE subconscious_fragments
            SET last_recalled_at = ?,
                recall_count = recall_count + 1
            WHERE id = ?
            `,
            [recalledAt, fragment.id],
          )
        }
      })
    })

    return mapped.map(fragment => ({
      ...fragment,
      lastRecalledAt: recalledAt,
      recallCount: fragment.recallCount + 1,
    }))
  }

  async function listRecentSubconsciousFragments(limit = 8) {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))
    const rows = await all<DbSubconsciousFragmentRow>(
      database,
      `
      SELECT
        id,
        text,
        source_kind,
        created_at,
        last_recalled_at,
        recall_count
      FROM subconscious_fragments
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [safeLimit],
    )
    return rows.map(mapSubconsciousFragmentRow)
  }

  async function countSubconsciousFragments() {
    const row = await get<CountRow>(
      database,
      `
      SELECT COUNT(1) AS total
      FROM subconscious_fragments
      `,
    )
    return row?.total ?? 0
  }

  async function appendRelationshipDynamics(input: {
    hostAttitude: string
    previousHostAttitude?: string | null
    obedienceDelta?: number
    livelinessDelta?: number
    sensibilityDelta?: number
    source: string
    createdAt?: number
  }) {
    const hostAttitude = normalizeOrganicMemoryText(input.hostAttitude, 120)
    if (!hostAttitude)
      return

    const previousHostAttitude = normalizeOrganicMemoryText(input.previousHostAttitude, 120) || null
    const source = normalizeOrganicMemoryText(input.source, 64) || 'unknown'
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : now()

    await enqueueWrite(async () => {
      await run(
        database,
        `
        INSERT INTO relationship_dynamics (
          id,
          host_attitude,
          previous_host_attitude,
          obedience_delta,
          liveliness_delta,
          sensibility_delta,
          source,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          hostAttitude,
          previousHostAttitude,
          clampRelationshipDelta(Number(input.obedienceDelta ?? 0)),
          clampRelationshipDelta(Number(input.livelinessDelta ?? 0)),
          clampRelationshipDelta(Number(input.sensibilityDelta ?? 0)),
          source,
          createdAt,
        ],
      )
    })
  }

  async function getLatestRelationshipDynamics() {
    const row = await get<DbRelationshipDynamicsRow>(
      database,
      `
      SELECT
        host_attitude,
        previous_host_attitude,
        obedience_delta,
        liveliness_delta,
        sensibility_delta,
        source,
        created_at
      FROM relationship_dynamics
      ORDER BY created_at DESC
      LIMIT 1
      `,
    )
    if (!row)
      return null
    return mapRelationshipDynamicsRow(row)
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
              access_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dedupe_key)
            DO UPDATE SET
              confidence = MAX(memory_facts.confidence, excluded.confidence),
              source = excluded.source,
              updated_at = excluded.updated_at
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
              access_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              access_count = MAX(memory_facts.access_count, excluded.access_count)
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
    if (typeof next.lastPrunedAt === 'number' && Number.isFinite(next.lastPrunedAt)) {
      await enqueueWrite(async () => {
        await upsertMeta(memoryLastPrunedAtKey, String(next.lastPrunedAt))
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
    retrieveMemoryFacts,
    upsertMemoryReflections,
    listMemoryReflections,
    appendRelationshipOutcomes,
    listRelationshipOutcomes,
    appendEpisodicEvents,
    listRecentEpisodicEvents,
    searchEpisodicEvents,
    listMemoryConsolidations,
    searchMemoryConsolidations,
    upsertMemoryConsolidations,
    appendPersonaReinforcementEvents,
    listPersonaReinforcementEvents,
    readMindHead,
    upsertMindHead,
    runMemoryPrune,
    importLegacyMemory,
    overrideMemoryStats,
    listActiveThoughts,
    replaceActiveThoughts,
    appendSubconsciousFragments,
    searchSubconsciousFragments,
    listRecentSubconsciousFragments,
    countSubconsciousFragments,
    appendRelationshipDynamics,
    getLatestRelationshipDynamics,
    insertScheduledTask,
    claimDueScheduledTasks,
    requeueScheduledTask,
    completeScheduledTask,
    failScheduledTask,
    listPendingScheduledTasks,
    getJournalMode,
  }
}
