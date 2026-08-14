import type { AlicizationMemoryLegacySnapshot } from '../../../shared/eventa'

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './life-core/working-memory'
import { buildWorkingMemoryLongTermCandidateQueue } from './life-core/working-memory-long-term-queue'

function explicitWorkingMemoryQueueEvidence() {
  return {
    version: 'working-memory-long-term-evidence-v1' as const,
    source: 'explicit-structured-memory-evidence' as const,
  }
}

function runtimeCheckpointProjection(activeActionIds: string[] = []) {
  return {
    actions: Object.fromEntries(activeActionIds.map(actionId => [
      actionId,
      {
        actionId,
        toolCallId: `${actionId}:tool-call`,
        status: 'active' as const,
        terminalObservationId: null,
        lastObservation: null,
        outcome: null,
        pendingTerminalStatus: null,
        completionPendingObservation: false,
        lateEventCount: 0,
        lastSequence: 0,
      },
    ])),
    pendingActionSettlements: {},
    replyCommitted: false,
    pendingDelivery: null,
    committedDelivery: null,
    terminalEventType: null,
    issues: [],
  }
}

const runCalls: string[] = []
const queryCalls: string[] = []
const metaState = new Map<string, string>()
const mindTurnEvents: Array<{
  id: string
  decision_trace_id: string
  turn_id: string | null
  session_id: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  kind: string
  payload_json: string | null
  created_at: number
}> = []
const taskThreads = new Map<string, {
  id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  goal: string
  kind: string
  status: string
  selected_channel: string | null
  proposed_channel: string | null
  summary: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_event_at: number | null
  completed_at: number | null
}>()
const executionEvents: Array<{
  id: string
  thread_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  channel: string | null
  kind: string
  thread_status: string | null
  payload_json: string | null
  created_at: number
}> = []
const episodicEvents = new Map<string, {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: string
  provenance: string
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
}>()
const episodicReconsolidationOverlays = new Map<string, {
  id: string
  event_id: string
  at: number
  decision_trace_id: string | null
  provenance: string
  confidence: number
  reason: string
  emotion_tags_json: string | null
  relationship_meaning: string | null
  lesson: string | null
  created_at: number
}>()
const eventGraphNodes = new Map<string, {
  node_id: string
  card_id: string
  node_kind: string
  canonical_key: string
  label: string
  semantic_text: string
  provenance: string
  source_event_id: string | null
  payload_json: string | null
  created_at: number
  updated_at: number
}>()
const eventGraphEdges = new Map<string, {
  edge_id: string
  card_id: string
  source_node_id: string
  target_node_id: string
  edge_kind: string
  weight: number
  provenance: string
  payload_json: string | null
  created_at: number
  updated_at: number
}>()
const memoryConsolidations = new Map<string, {
  card_id: string
  id: string
  kind: 'daily' | 'weekly' | 'procedural' | 'autobiographical'
  facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
  period_key: string
  period_started_at: number
  period_ended_at: number
  summary: string
  lesson: string | null
  cues_json: string | null
  confidence: number
  dominant_provenance: string
  derived_event_ids_json: string | null
  metadata_json: string | null
  updated_at: number
}>()
const executorSessions = new Map<string, {
  id: string
  channel: string
  affinity_key: string
  external_session_id: string | null
  status: 'active' | 'running' | 'failed' | 'suspended'
  summary: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_used_at: number | null
}>()
const capabilityManifests = new Map<string, {
  channel: string
  available: number
  enabled: number
  ready: number
  session_affinity: number
  reason: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_checked_at: number | null
}>()
const scheduledTasks = new Map<string, {
  id: string
  task_id: string
  trigger_at: number
  message: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: number
  claimed_at: number | null
  completed_at: number | null
  source_turn_id: string | null
  fired_turn_id: string | null
  last_error: string | null
}>()
const learningTasks = new Map<string, {
  id: string
  card_id: string
  task_id: string
  status: string
  trigger_at: number
  action: string
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
  failure_kind: string | null
  last_error: string | null
  fired_turn_id: string | null
}>()
const memoryFacts = new Map<string, {
  card_id: string
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: string
  dedupe_key: string
  created_at: number
  updated_at: number
  last_access_at: number | null
  access_count: number
  knowledge_stage: string | null
  validation_status: string | null
  memory_domain: string | null
  validation_count: number
  contradiction_count: number
  source_label: string | null
  conflicts_with_json: string | null
  supersedes_json: string | null
}>()
const memoryArchive = new Map<string, {
  card_id: string
  id: string
  original_id: string | null
  subject: string
  predicate: string
  object: string
  confidence: number
  source: string
  dedupe_key: string
  created_at: number
  updated_at: number
  last_access_at: number | null
  access_count: number
  knowledge_stage: string | null
  validation_status: string | null
  memory_domain: string | null
  validation_count: number
  contradiction_count: number
  source_label: string | null
  conflicts_with_json: string | null
  supersedes_json: string | null
  archived_at: number
}>()
const memoryIngestJournal = new Map<string, {
  id: string
  operation_kind: 'upsert-memory-facts' | 'append-episodic-events' | 'upsert-memory-consolidations'
  payload_json: string
  status: 'pending' | 'applied' | 'failed'
  attempt_count: number
  last_error: string | null
  created_at: number
  updated_at: number
  last_attempt_at: number | null
  applied_at: number | null
  next_attempt_at: number | null
}>()
const workingMemoryLongTermTransactions = new Map<string, {
  id: string
  idempotency_key: string
  queue_item_id: string
  card_id: string
  session_id: string
  status: string
  decision: string
  queue_item_json: string
  cleaned_candidate_json: string | null
  projections_json: string | null
  allow_training: number
  rejection_reasons_json: string
  review_reasons_json: string
  contamination_flags_json: string
  attempt_count: number
  last_error: string | null
  created_at: number
  updated_at: number
  next_attempt_at: number | null
  applied_at: number | null
}>()
const workingMemoryCheckpoints = new Map<string, {
  card_id: string
  session_id: string
  version: string
  snapshot_json: string
  updated_at: number
}>()
const memoryReflections = new Map<string, {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: string
  target_scope: string
  summary: string
  lesson: string
  status: string
  confidence: number
  supporting_fact_ids_json: string | null
  supporting_outcome_ids_json: string | null
  created_at: number
  updated_at: number
  confirmed_at: number | null
  denied_at: number | null
}>()
const personaReinforcementEvents = new Map<string, {
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
}>()
const longTermMemoryTombstones = new Map<string, {
  id: string
  card_id: string
  source_id: string
  source: string
  reason: string | null
  created_at: number
}>()
const testDayMs = 24 * 60 * 60 * 1000
const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-db-test-'))
  sandboxDirs.push(dir)
  return dir
}

function upsertMemoryFactRow(row: {
  card_id: string
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: string
  dedupe_key: string
  created_at: number
  updated_at: number
  last_access_at: number | null
  access_count: number
  knowledge_stage: string | null
  validation_status: string | null
  memory_domain: string | null
  validation_count: number
  contradiction_count: number
  source_label: string | null
  conflicts_with_json: string | null
  supersedes_json: string | null
}) {
  const existing = [...memoryFacts.values()].find(item => item.card_id === row.card_id && item.dedupe_key === row.dedupe_key)
  if (!existing) {
    memoryFacts.set(row.id, row)
    return
  }

  existing.confidence = Math.max(existing.confidence, row.confidence)
  existing.source = row.source
  existing.created_at = Math.min(existing.created_at, row.created_at)
  existing.updated_at = Math.max(existing.updated_at, row.updated_at)
  existing.last_access_at = existing.last_access_at == null
    ? row.last_access_at
    : row.last_access_at == null
      ? existing.last_access_at
      : Math.max(existing.last_access_at, row.last_access_at)
  existing.access_count = Math.max(existing.access_count, row.access_count)
  existing.knowledge_stage = row.knowledge_stage
  existing.validation_status = row.validation_status
  existing.memory_domain = row.memory_domain
  existing.validation_count = Math.max(existing.validation_count, row.validation_count)
  existing.contradiction_count = Math.max(existing.contradiction_count, row.contradiction_count)
  existing.source_label = row.source_label
  existing.conflicts_with_json = row.conflicts_with_json
  existing.supersedes_json = row.supersedes_json
}

class FakeSqliteDatabase {
  constructor(_path: string, callback: (error?: Error | null) => void) {
    callback(null)
  }

  run(sql: string, params: unknown[] | ((error: Error | null) => void), callback?: (this: { changes: number, lastID: number }, error: Error | null) => void) {
    const actualParams = Array.isArray(params) ? params : []
    const actualCallback = (typeof params === 'function' ? params : callback) as ((this: { changes: number, lastID: number }, error: Error | null) => void) | undefined
    runCalls.push(sql)
    let changes = 1

    if (sql.includes('INSERT INTO alicization_meta')) {
      const [key, value] = actualParams as [string, string]
      if (typeof key === 'string' && typeof value === 'string') {
        metaState.set(key, value)
      }
    }

    if (sql.includes('INSERT INTO memory_facts')) {
      const [id, cardId, subject, predicate, object, confidence, source, dedupeKey, createdAt, updatedAt, lastAccessAt, accessCount, knowledgeStage, validationStatus, memoryDomain, validationCount, contradictionCount, sourceLabel, conflictsWithJson, supersedesJson]
        = actualParams as [string, string, string, string, string, number, string, string, number, number, number | null, number, string | null, string | null, string | null, number, number, string | null, string | null, string | null]
      upsertMemoryFactRow({
        id,
        card_id: cardId,
        subject,
        predicate,
        object,
        confidence,
        source,
        dedupe_key: dedupeKey,
        created_at: createdAt,
        updated_at: updatedAt,
        last_access_at: lastAccessAt ?? null,
        access_count: accessCount,
        knowledge_stage: knowledgeStage ?? null,
        validation_status: validationStatus ?? null,
        memory_domain: memoryDomain ?? null,
        validation_count: validationCount ?? 0,
        contradiction_count: contradictionCount ?? 0,
        source_label: sourceLabel ?? null,
        conflicts_with_json: conflictsWithJson ?? null,
        supersedes_json: supersedesJson ?? null,
      })
    }
    else if (sql.includes('UPDATE memory_facts')) {
      if (sql.includes('SET access_count = access_count + 1')) {
        const [lastAccessAt, ...rest] = actualParams as [number | null, ...string[]]
        const id = String(rest.at(-1) ?? '')
        const fact = memoryFacts.get(id)
        if (!fact) {
          changes = 0
        }
        else {
          fact.access_count += 1
          fact.last_access_at = lastAccessAt ?? null
        }
      }
      else if (sql.includes('SET validation_status = ?')) {
        const [validationStatus, knowledgeStage, sourceLabel, _validationStatusForCounter, _contradictionStatusForCounter, conflictsWithJson, supersedesJson, updatedAt, ...scopeAndId]
          = actualParams as [string, string | null, string | null, string, string, string, string, number, ...string[]]
        const id = String(scopeAndId.at(-1) ?? '')
        const fact = memoryFacts.get(id)
        if (!fact) {
          changes = 0
        }
        else {
          fact.validation_status = validationStatus
          if (knowledgeStage != null)
            fact.knowledge_stage = knowledgeStage
          if (sourceLabel != null)
            fact.source_label = sourceLabel
          fact.validation_count += validationStatus === 'validated' ? 1 : 0
          fact.contradiction_count += validationStatus === 'superseded' ? 1 : 0
          fact.conflicts_with_json = conflictsWithJson
          fact.supersedes_json = supersedesJson
          fact.updated_at = updatedAt
        }
      }
      else {
        changes = 0
      }
    }
    else if (sql.includes('INSERT INTO memory_archive')) {
      const [id, cardId, originalId, subject, predicate, object, confidence, source, dedupeKey, createdAt, updatedAt, lastAccessAt, accessCount, knowledgeStage, validationStatus, memoryDomain, validationCount, contradictionCount, sourceLabel, conflictsWithJson, supersedesJson, archivedAt]
        = actualParams as [string, string, string | null, string, string, string, number, string, string, number, number, number | null, number, string | null, string | null, string | null, number, number, string | null, string | null, string | null, number]
      memoryArchive.set(id, {
        id,
        card_id: cardId,
        original_id: originalId ?? null,
        subject,
        predicate,
        object,
        confidence,
        source,
        dedupe_key: dedupeKey,
        created_at: createdAt,
        updated_at: updatedAt,
        last_access_at: lastAccessAt ?? null,
        access_count: accessCount,
        knowledge_stage: knowledgeStage ?? null,
        validation_status: validationStatus ?? null,
        memory_domain: memoryDomain ?? null,
        validation_count: validationCount ?? 0,
        contradiction_count: contradictionCount ?? 0,
        source_label: sourceLabel ?? null,
        conflicts_with_json: conflictsWithJson ?? null,
        supersedes_json: supersedesJson ?? null,
        archived_at: archivedAt,
      })
    }

    if (sql.includes('INSERT INTO memory_ingest_journal')) {
      const [id, operationKind, payloadJson, createdAt, updatedAt, nextAttemptAt]
        = actualParams as [string, 'upsert-memory-facts' | 'append-episodic-events' | 'upsert-memory-consolidations', string, number, number, number]
      memoryIngestJournal.set(id, {
        id,
        operation_kind: operationKind,
        payload_json: payloadJson,
        status: 'pending',
        attempt_count: 0,
        last_error: null,
        created_at: createdAt,
        updated_at: updatedAt,
        last_attempt_at: null,
        applied_at: null,
        next_attempt_at: nextAttemptAt,
      })
    }
    else if (sql.includes('INSERT INTO working_memory_checkpoints')) {
      const [cardId, sessionId, version, snapshotJson, updatedAt]
        = actualParams as [string, string, string, string, number]
      workingMemoryCheckpoints.set(`${cardId}::${sessionId}`, {
        card_id: cardId,
        session_id: sessionId,
        version,
        snapshot_json: snapshotJson,
        updated_at: updatedAt,
      })
    }
    else if (sql.includes('INSERT OR IGNORE INTO working_memory_long_term_transactions')) {
      const [
        id,
        idempotencyKey,
        queueItemId,
        cardId,
        sessionId,
        status,
        decision,
        queueItemJson,
        cleanedCandidateJson,
        projectionsJson,
        allowTraining,
        rejectionReasonsJson,
        reviewReasonsJson,
        contaminationFlagsJson,
        attemptCount,
        lastError,
        createdAt,
        updatedAt,
        nextAttemptAt,
        appliedAt,
      ] = actualParams as [string, string, string, string, string, string, string, string, string | null, string | null, number, string, string, string, number, string | null, number, number, number | null, number | null]
      if (![...workingMemoryLongTermTransactions.values()].some(row => row.id === id || row.idempotency_key === idempotencyKey)) {
        workingMemoryLongTermTransactions.set(id, {
          id,
          idempotency_key: idempotencyKey,
          queue_item_id: queueItemId,
          card_id: cardId,
          session_id: sessionId,
          status,
          decision,
          queue_item_json: queueItemJson,
          cleaned_candidate_json: cleanedCandidateJson,
          projections_json: projectionsJson,
          allow_training: allowTraining,
          rejection_reasons_json: rejectionReasonsJson,
          review_reasons_json: reviewReasonsJson,
          contamination_flags_json: contaminationFlagsJson,
          attempt_count: attemptCount,
          last_error: lastError,
          created_at: createdAt,
          updated_at: updatedAt,
          next_attempt_at: nextAttemptAt,
          applied_at: appliedAt,
        })
      }
      else {
        changes = 0
      }
    }
    else if (sql.includes('INSERT OR REPLACE INTO long_term_memory_tombstones')) {
      const [id, cardId, sourceId, source, reason, createdAt] = actualParams as [string, string, string, string, string | null, number]
      longTermMemoryTombstones.set(`${cardId}:${source}:${sourceId}`, {
        id,
        card_id: cardId,
        source_id: sourceId,
        source,
        reason: reason ?? null,
        created_at: createdAt,
      })
    }
    else if (sql.includes('UPDATE working_memory_long_term_transactions')) {
      const [
        status,
        decision,
        cleanedCandidateJson,
        projectionsJson,
        allowTraining,
        rejectionReasonsJson,
        reviewReasonsJson,
        contaminationFlagsJson,
        attemptCount,
        lastError,
        updatedAt,
        nextAttemptAt,
        appliedAt,
        id,
      ] = actualParams as [string, string, string | null, string | null, number, string, string, string, number, string | null, number, number | null, number | null, string]
      const row = workingMemoryLongTermTransactions.get(id)
      if (!row) {
        changes = 0
      }
      else {
        row.status = status
        row.decision = decision
        row.cleaned_candidate_json = cleanedCandidateJson
        row.projections_json = projectionsJson
        row.allow_training = allowTraining
        row.rejection_reasons_json = rejectionReasonsJson
        row.review_reasons_json = reviewReasonsJson
        row.contamination_flags_json = contaminationFlagsJson
        row.attempt_count = attemptCount
        row.last_error = lastError
        row.updated_at = updatedAt
        row.next_attempt_at = nextAttemptAt
        row.applied_at = appliedAt
      }
    }
    else if (sql.includes('UPDATE memory_ingest_journal') && sql.includes('status = \'applied\'')) {
      const [updatedAt, lastAttemptAt, appliedAt, id] = actualParams as [number, number, number, string]
      const row = memoryIngestJournal.get(id)
      if (!row) {
        changes = 0
      }
      else {
        row.status = 'applied'
        row.attempt_count += 1
        row.last_error = null
        row.updated_at = updatedAt
        row.last_attempt_at = lastAttemptAt
        row.applied_at = appliedAt
        row.next_attempt_at = null
      }
    }
    else if (sql.includes('UPDATE memory_ingest_journal') && sql.includes('status = \'failed\'')) {
      const [lastError, updatedAt, lastAttemptAt, nextAttemptAt, id] = actualParams as [string, number, number, number, string]
      const row = memoryIngestJournal.get(id)
      if (!row) {
        changes = 0
      }
      else {
        row.status = 'failed'
        row.attempt_count += 1
        row.last_error = lastError
        row.updated_at = updatedAt
        row.last_attempt_at = lastAttemptAt
        row.next_attempt_at = nextAttemptAt
      }
    }

    if (sql.includes('INSERT INTO memory_reflections')) {
      const [
        id,
        cardId,
        decisionTraceId,
        turnId,
        sessionId,
        sourceKind,
        targetScope,
        summary,
        lesson,
        status,
        confidence,
        supportingFactIdsJson,
        supportingOutcomeIdsJson,
        createdAt,
        updatedAt,
        confirmedAt,
        deniedAt,
      ] = actualParams as [string, string, string | null, string | null, string | null, string, string, string, string, string, number, string | null, string | null, number, number, number | null, number | null]
      const existing = memoryReflections.get(id)
      memoryReflections.set(id, {
        id,
        card_id: cardId,
        decision_trace_id: decisionTraceId ?? null,
        turn_id: turnId ?? null,
        session_id: sessionId ?? null,
        source_kind: sourceKind,
        target_scope: targetScope,
        summary,
        lesson,
        status,
        confidence,
        supporting_fact_ids_json: supportingFactIdsJson ?? null,
        supporting_outcome_ids_json: supportingOutcomeIdsJson ?? null,
        created_at: existing?.created_at ?? createdAt,
        updated_at: updatedAt,
        confirmed_at: confirmedAt ?? null,
        denied_at: deniedAt ?? null,
      })
    }

    if (sql.includes('INSERT INTO persona_reinforcement_events')) {
      const [
        id,
        cardId,
        decisionTraceId,
        turnId,
        sessionId,
        sourceKind,
        dimension,
        delta,
        valence,
        summary,
        createdAt,
      ] = actualParams as [string, string, string | null, string | null, string | null, string, string, number, string, string, number]
      personaReinforcementEvents.set(id, {
        id,
        card_id: cardId,
        decision_trace_id: decisionTraceId ?? null,
        turn_id: turnId ?? null,
        session_id: sessionId ?? null,
        source_kind: sourceKind,
        dimension,
        delta,
        valence,
        summary,
        created_at: createdAt,
      })
    }

    if (sql.includes('INSERT INTO mind_turn_events')) {
      const [id, decisionTraceId, turnId, sessionId, origin, kind, payloadJson, createdAt]
        = actualParams as [string, string, string | null, string | null, 'user-turn' | 'subconscious-proactive' | 'system', string, string | null, number]
      mindTurnEvents.push({
        id,
        decision_trace_id: decisionTraceId,
        turn_id: turnId ?? null,
        session_id: sessionId ?? null,
        origin,
        kind,
        payload_json: payloadJson ?? null,
        created_at: createdAt,
      })
    }

    if (sql.includes('INSERT INTO task_threads')) {
      const [id, decisionTraceId, turnId, sessionId, origin, goal, kind, status, selectedChannel, proposedChannel, summary, metadataJson, createdAt, updatedAt, lastEventAt, completedAt]
        = actualParams as [string, string | null, string | null, string | null, 'user-turn' | 'subconscious-proactive' | 'system', string, string, string, string | null, string | null, string | null, string | null, number, number, number | null, number | null]
      const existing = taskThreads.get(id)
      const expectedUpdatedAt = actualParams.length > 16
        ? actualParams[16] as number | null
        : null
      const createOnly = sql.includes('ON CONFLICT(id) DO NOTHING')
      if (existing && createOnly) {
        changes = 0
      }
      else if (existing && expectedUpdatedAt !== null && existing.updated_at !== expectedUpdatedAt) {
        changes = 0
      }
      else {
        taskThreads.set(id, {
          id,
          decision_trace_id: decisionTraceId ?? null,
          turn_id: turnId ?? null,
          session_id: sessionId ?? null,
          origin,
          goal,
          kind,
          status,
          selected_channel: selectedChannel ?? null,
          proposed_channel: proposedChannel ?? null,
          summary: summary ?? null,
          metadata_json: metadataJson ?? null,
          created_at: existing?.created_at ?? createdAt,
          updated_at: existing
            ? Math.max(updatedAt, existing.updated_at + 1)
            : updatedAt,
          last_event_at: lastEventAt ?? null,
          completed_at: completedAt ?? existing?.completed_at ?? null,
        })
      }
    }

    if (sql.includes('INTO executor_events')) {
      const [id, threadId, decisionTraceId, turnId, sessionId, origin, channel, kind, threadStatus, payloadJson, createdAt]
        = actualParams as [string, string, string | null, string | null, string | null, 'user-turn' | 'subconscious-proactive' | 'system', string | null, string, string | null, string | null, number]
      if (executionEvents.some(event => event.id === id)) {
        changes = 0
      }
      else {
        executionEvents.push({
          id,
          thread_id: threadId,
          decision_trace_id: decisionTraceId ?? null,
          turn_id: turnId ?? null,
          session_id: sessionId ?? null,
          origin,
          channel: channel ?? null,
          kind,
          thread_status: threadStatus ?? null,
          payload_json: payloadJson ?? null,
          created_at: createdAt,
        })
      }
    }

    if (sql.includes('INSERT INTO episodic_events')) {
      const [
        id,
        cardId,
        decisionTraceId,
        turnId,
        sessionId,
        sourceKind,
        provenance,
        occurredAt,
        whereSummary,
        withWhomJson,
        threadAnchor,
        whatHappened,
        felt,
        emotionTagsJson,
        whatChanged,
        relationshipMeaning,
        lesson,
        sourceSummary,
        confidence,
        salience,
        sceneAttachment,
        consolidationPriority,
        relationshipShiftJson,
        derivedFromJson,
        tagsJson,
        createdAt,
        updatedAt,
      ] = actualParams as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        string,
        string,
        number,
        string | null,
        string | null,
        string | null,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
        number,
        number,
        number,
        string | null,
        string | null,
        string | null,
        number,
        number,
      ]
      const existing = episodicEvents.get(id)
      episodicEvents.set(id, {
        id,
        card_id: cardId,
        decision_trace_id: decisionTraceId ?? null,
        turn_id: turnId ?? null,
        session_id: sessionId ?? null,
        source_kind: sourceKind,
        provenance,
        occurred_at: occurredAt,
        where_summary: whereSummary ?? null,
        with_whom_json: withWhomJson ?? null,
        thread_anchor: threadAnchor ?? null,
        what_happened: whatHappened,
        felt: felt ?? null,
        emotion_tags_json: emotionTagsJson ?? null,
        what_changed: whatChanged ?? null,
        relationship_meaning: relationshipMeaning ?? null,
        lesson: lesson ?? null,
        source_summary: sourceSummary ?? null,
        confidence,
        salience,
        scene_attachment: sceneAttachment,
        consolidation_priority: consolidationPriority,
        relationship_shift_json: relationshipShiftJson ?? null,
        derived_from_json: derivedFromJson ?? null,
        tags_json: tagsJson ?? null,
        created_at: existing?.created_at ?? createdAt,
        updated_at: updatedAt,
        last_recalled_at: existing?.last_recalled_at ?? null,
        recall_count: existing?.recall_count ?? 0,
        reconsolidation_count: existing?.reconsolidation_count ?? 0,
        latest_reconsolidation_json: existing?.latest_reconsolidation_json ?? null,
      })
    }
    else if (sql.includes('INSERT INTO event_graph_nodes')) {
      const [nodeId, cardId, nodeKind, canonicalKey, label, semanticText, provenance, sourceEventId, payloadJson, createdAt, updatedAt]
        = actualParams as [string, string, string, string, string, string, string, string | null, string | null, number, number]
      const existing = eventGraphNodes.get(nodeId)
      eventGraphNodes.set(nodeId, {
        node_id: nodeId,
        card_id: cardId,
        node_kind: nodeKind,
        canonical_key: canonicalKey,
        label,
        semantic_text: semanticText,
        provenance,
        source_event_id: existing?.source_event_id ?? sourceEventId ?? null,
        payload_json: existing?.payload_json ?? payloadJson ?? null,
        created_at: existing?.created_at ?? createdAt,
        updated_at: updatedAt,
      })
    }
    else if (sql.includes('INSERT INTO event_graph_edges')) {
      const [edgeId, cardId, sourceNodeId, targetNodeId, edgeKind, weight, provenance, payloadJson, createdAt, updatedAt]
        = actualParams as [string, string, string, string, string, number, string, string | null, number, number]
      const existing = eventGraphEdges.get(edgeId)
      eventGraphEdges.set(edgeId, {
        edge_id: edgeId,
        card_id: cardId,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        edge_kind: edgeKind,
        weight: Math.max(existing?.weight ?? 0, weight),
        provenance,
        payload_json: existing?.payload_json ?? payloadJson ?? null,
        created_at: existing?.created_at ?? createdAt,
        updated_at: updatedAt,
      })
    }
    else if (sql.includes('INSERT INTO episodic_reconsolidation_overlays')) {
      const [id, eventId, at, decisionTraceId, provenance, confidence, reason, emotionTagsJson, relationshipMeaning, lesson, createdAt]
        = actualParams as [string, string, number, string | null, string, number, string, string | null, string | null, string | null, number]
      episodicReconsolidationOverlays.set(id, {
        id,
        event_id: eventId,
        at,
        decision_trace_id: decisionTraceId ?? null,
        provenance,
        confidence,
        reason,
        emotion_tags_json: emotionTagsJson ?? null,
        relationship_meaning: relationshipMeaning ?? null,
        lesson: lesson ?? null,
        created_at: createdAt,
      })
    }
    else if (sql.includes('UPDATE episodic_events')) {
      const [updatedAt, lastRecalledAt, recallCount, reconsolidationCount, latestReconsolidationJson, id]
        = actualParams as [number, number | null, number, number, string | null, string]
      const event = episodicEvents.get(id)
      if (!event) {
        changes = 0
      }
      else {
        event.updated_at = updatedAt
        event.last_recalled_at = lastRecalledAt ?? null
        event.recall_count = recallCount
        event.reconsolidation_count = reconsolidationCount
        event.latest_reconsolidation_json = latestReconsolidationJson ?? null
      }
    }

    if (sql.includes('INSERT INTO memory_consolidations')) {
      const [cardId, id, kind, facet, periodKey, periodStartedAt, periodEndedAt, summary, lesson, cuesJson, confidence, dominantProvenance, derivedEventIdsJson, metadataJson, updatedAt]
        = actualParams as [string, string, 'daily' | 'weekly' | 'procedural' | 'autobiographical', 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null, string, number, number, string, string | null, string | null, number, string, string | null, string | null, number]
      memoryConsolidations.set(id, {
        card_id: cardId,
        id,
        kind,
        facet: facet ?? null,
        period_key: periodKey,
        period_started_at: periodStartedAt,
        period_ended_at: periodEndedAt,
        summary,
        lesson: lesson ?? null,
        cues_json: cuesJson ?? null,
        confidence,
        dominant_provenance: dominantProvenance,
        derived_event_ids_json: derivedEventIdsJson ?? null,
        metadata_json: metadataJson ?? null,
        updated_at: updatedAt,
      })
    }

    if (sql.includes('INSERT INTO executor_sessions')) {
      const [id, channel, affinityKey, externalSessionId, status, summary, metadataJson, createdAt, updatedAt, lastUsedAt]
        = actualParams as [string, string, string, string | null, 'active' | 'running' | 'failed' | 'suspended', string | null, string | null, number, number, number | null]
      const compositeKey = `${channel}::${affinityKey}`
      const existing = executorSessions.get(compositeKey)
      executorSessions.set(compositeKey, {
        id: existing?.id ?? id,
        channel,
        affinity_key: affinityKey,
        external_session_id: externalSessionId ?? null,
        status,
        summary: summary ?? null,
        metadata_json: metadataJson ?? null,
        created_at: existing?.created_at ?? createdAt,
        updated_at: updatedAt,
        last_used_at: lastUsedAt ?? null,
      })
    }

    if (sql.includes('INSERT INTO capability_manifests')) {
      const [channel, available, enabled, ready, sessionAffinity, reason, metadataJson, createdAt, updatedAt, lastCheckedAt]
        = actualParams as [string, number, number, number, number, string | null, string | null, number, number, number | null]
      const existing = capabilityManifests.get(channel)
      capabilityManifests.set(channel, {
        channel,
        available,
        enabled,
        ready,
        session_affinity: sessionAffinity,
        reason: reason ?? null,
        metadata_json: metadataJson ?? null,
        created_at: existing?.created_at ?? createdAt,
        updated_at: updatedAt,
        last_checked_at: lastCheckedAt ?? null,
      })
    }

    if (sql.includes('INSERT INTO scheduled_tasks')) {
      const [id, taskId, triggerAt, message, createdAt, sourceTurnId] = actualParams as [string, string, number, string, number, string | null]
      scheduledTasks.set(taskId, {
        id,
        task_id: taskId,
        trigger_at: triggerAt,
        message,
        status: 'pending',
        created_at: createdAt,
        claimed_at: null,
        completed_at: null,
        source_turn_id: sourceTurnId ?? null,
        fired_turn_id: null,
        last_error: null,
      })
    }
    else if (sql.includes('INSERT INTO learning_tasks')) {
      const [id, cardId, taskId, triggerAt, action, message, payloadJson, maxAttempts, createdAt, updatedAt, sourceTurnId]
        = actualParams as [string, string, string, number, string, string, string, number, number, number, string | null]
      learningTasks.set(taskId, {
        id,
        card_id: cardId,
        task_id: taskId,
        status: 'scheduled',
        trigger_at: triggerAt,
        action,
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
        source_turn_id: sourceTurnId ?? null,
        result_summary: null,
        failure_kind: null,
        last_error: null,
        fired_turn_id: null,
      })
    }
    else if (sql.includes('UPDATE scheduled_tasks') && sql.includes('status = \'running\'')) {
      const [claimedAt, id] = actualParams as [number, string]
      const task = [...scheduledTasks.values()].find(item => item.id === id && item.status === 'pending')
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'running'
        task.claimed_at = claimedAt
        task.last_error = null
      }
    }
    else if (sql.includes('UPDATE scheduled_tasks') && sql.includes('status = \'pending\'')) {
      const [nextTriggerAt, reason, taskId] = actualParams as [number | null, string | null, string]
      const task = scheduledTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'pending'
        if (typeof nextTriggerAt === 'number' && Number.isFinite(nextTriggerAt))
          task.trigger_at = nextTriggerAt
        task.claimed_at = null
        task.completed_at = null
        task.fired_turn_id = null
        task.last_error = reason ?? null
      }
    }
    else if (sql.includes('UPDATE scheduled_tasks') && sql.includes('status = \'completed\'')) {
      const [firedTurnId, completedAt, taskId] = actualParams as [string, number, string]
      const task = scheduledTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'completed'
        task.fired_turn_id = firedTurnId
        task.completed_at = completedAt
        task.last_error = null
      }
    }
    else if (sql.includes('UPDATE scheduled_tasks') && sql.includes('status = \'failed\'')) {
      const [completedAt, lastError, taskId] = actualParams as [number, string, string]
      const task = scheduledTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'failed'
        task.completed_at = completedAt
        task.last_error = lastError
      }
    }
    else if (sql.includes('DELETE FROM scheduled_tasks')) {
      scheduledTasks.clear()
    }
    else if (sql.includes('UPDATE learning_tasks') && sql.includes('status = \'claimed\'')) {
      const [claimedAt, updatedAt, id] = actualParams as [number, number, string]
      const task = [...learningTasks.values()].find(item => item.id === id && (item.status === 'scheduled' || item.status === 'reopened'))
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'claimed'
        task.claimed_at = claimedAt
        task.updated_at = updatedAt
        task.last_error = null
        task.failure_kind = null
      }
    }
    else if (sql.includes('UPDATE learning_tasks') && sql.includes('status = \'running\'')) {
      const [startedAt, updatedAt, taskId] = actualParams as [number, number, string]
      const task = learningTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'running'
        task.started_at = startedAt
        task.updated_at = updatedAt
        task.attempt_count += 1
      }
    }
    else if (sql.includes('UPDATE learning_tasks') && sql.includes('status = \'completed\'')) {
      const [completedAt, updatedAt, firedTurnId, resultSummary, taskId] = actualParams as [number, number, string | null, string | null, string]
      const task = learningTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'completed'
        task.completed_at = completedAt
        task.updated_at = updatedAt
        task.fired_turn_id = firedTurnId ?? null
        task.result_summary = resultSummary ?? null
        task.last_error = null
        task.failure_kind = null
        task.next_retry_at = null
      }
    }
    else if (sql.includes('UPDATE learning_tasks') && sql.includes('status = \'blocked\'')) {
      const [blockedAt, updatedAt, nextRetryAt, failureKind, lastError, resultSummary, taskId] = actualParams as [number, number, number | null, string | null, string, string | null, string]
      const task = learningTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'blocked'
        task.blocked_at = blockedAt
        task.updated_at = updatedAt
        task.next_retry_at = nextRetryAt ?? null
        task.failure_kind = failureKind ?? null
        task.last_error = lastError
        task.result_summary = resultSummary ?? null
      }
    }
    else if (sql.includes('UPDATE learning_tasks') && sql.includes('status = \'failed\'')) {
      const [completedAt, updatedAt, nextRetryAt, failureKind, lastError, taskId] = actualParams as [number, number, number | null, string, string, string]
      const task = learningTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'failed'
        task.completed_at = completedAt
        task.updated_at = updatedAt
        task.next_retry_at = nextRetryAt ?? null
        task.failure_kind = failureKind
        task.last_error = lastError
      }
    }
    else if (sql.includes('UPDATE learning_tasks') && sql.includes('status = \'reopened\'')) {
      const [reopenedAt, updatedAt, triggerAt, lastError, taskId] = actualParams as [number, number, number, string | null, string]
      const task = learningTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'reopened'
        task.reopened_at = reopenedAt
        task.updated_at = updatedAt
        task.trigger_at = triggerAt
        task.claimed_at = null
        task.started_at = null
        task.completed_at = null
        task.blocked_at = null
        task.last_error = lastError ?? null
        task.failure_kind = null
      }
    }
    else if (sql.includes('UPDATE learning_tasks') && sql.includes('status = \'downgraded\'')) {
      const [downgradedAt, updatedAt, lastError, taskId] = actualParams as [number, number, string | null, string]
      const task = learningTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'downgraded'
        task.downgraded_at = downgradedAt
        task.updated_at = updatedAt
        task.last_error = lastError ?? null
      }
    }
    else if (sql.includes('UPDATE learning_tasks') && sql.includes('status = \'cancelled\'')) {
      const [cancelledAt, updatedAt, lastError, taskId] = actualParams as [number, number, string | null, string]
      const task = learningTasks.get(taskId)
      if (!task) {
        changes = 0
      }
      else {
        task.status = 'cancelled'
        task.cancelled_at = cancelledAt
        task.updated_at = updatedAt
        task.last_error = lastError ?? null
      }
    }
    else if (sql.includes('DELETE FROM learning_tasks')) {
      learningTasks.clear()
    }
    else if (sql.includes('DELETE FROM working_memory_checkpoints')) {
      if (sql.includes('WHERE card_id = ? AND session_id = ?')) {
        const [cardId, sessionId] = actualParams as [string, string]
        workingMemoryCheckpoints.delete(`${cardId}::${sessionId}`)
      }
      else if (sql.includes('WHERE card_id = ?')) {
        const [cardId] = actualParams as [string]
        for (const key of workingMemoryCheckpoints.keys()) {
          if (key.startsWith(`${cardId}::`))
            workingMemoryCheckpoints.delete(key)
        }
      }
      else {
        workingMemoryCheckpoints.clear()
      }
    }
    else if (sql.includes('DELETE FROM memory_archive')) {
      if (sql.includes('archived_at < ?')) {
        const [retentionLimit] = actualParams as [number]
        for (const [id, item] of memoryArchive.entries()) {
          if (item.archived_at < retentionLimit)
            memoryArchive.delete(id)
        }
      }
      else if (sql.includes('WHERE card_id = ?')) {
        const cardId = String(actualParams[0] ?? '')
        for (const [id, item] of memoryArchive.entries()) {
          if (item.card_id === cardId)
            memoryArchive.delete(id)
        }
      }
      else {
        memoryArchive.clear()
      }
    }
    else if (sql.includes('DELETE FROM memory_facts')) {
      if (sql.includes('WHERE id IN (')) {
        for (const id of actualParams as string[])
          memoryFacts.delete(id)
      }
      else if (sql.includes('WHERE card_id = ?')) {
        const cardId = String(actualParams[0] ?? '')
        for (const [id, item] of memoryFacts.entries()) {
          if (item.card_id === cardId)
            memoryFacts.delete(id)
        }
      }
      else {
        memoryFacts.clear()
      }
    }
    else if (sql.includes('DELETE FROM task_threads')) {
      taskThreads.clear()
    }
    else if (sql.includes('DELETE FROM executor_events')) {
      executionEvents.length = 0
    }
    else if (sql.includes('DELETE FROM episodic_events')) {
      episodicEvents.clear()
    }
    else if (sql.includes('DELETE FROM event_graph_edges')) {
      eventGraphEdges.clear()
    }
    else if (sql.includes('DELETE FROM event_graph_nodes')) {
      eventGraphNodes.clear()
    }
    else if (sql.includes('DELETE FROM episodic_reconsolidation_overlays')) {
      episodicReconsolidationOverlays.clear()
    }
    else if (sql.includes('DELETE FROM memory_consolidations')) {
      if (sql.includes('WHERE card_id = ?')) {
        const cardId = String(actualParams[0] ?? '')
        for (const [id, item] of memoryConsolidations.entries()) {
          if (item.card_id === cardId)
            memoryConsolidations.delete(id)
        }
      }
      else {
        memoryConsolidations.clear()
      }
    }
    else if (sql.includes('DELETE FROM executor_sessions')) {
      executorSessions.clear()
    }
    else if (sql.includes('DELETE FROM capability_manifests')) {
      capabilityManifests.clear()
    }
    else if (sql.includes('DELETE FROM mind_turn_events')) {
      mindTurnEvents.length = 0
    }
    else if (sql.includes('UPDATE task_threads')) {
      const [updatedAt, lastEventAt, projectedLastEventAt, status, completedAt, id, projectedStatus, activityAt]
        = actualParams as [number, number, number, string | null, number | null, string, string | null, number]
      const thread = taskThreads.get(id)
      if (!thread) {
        changes = 0
      }
      else {
        const terminalStatuses = new Set(['blocked', 'completed', 'failed', 'cancelled'])
        const currentTerminal = terminalStatuses.has(thread.status)
        const incomingTerminal = projectedStatus !== null && terminalStatuses.has(projectedStatus)
        const currentLastEventAt = thread.last_event_at
        const projectionIsCurrent = currentLastEventAt === null || currentLastEventAt <= activityAt
        if (!currentTerminal && (incomingTerminal || projectionIsCurrent)) {
          thread.updated_at = Math.max(thread.updated_at, updatedAt)
          thread.last_event_at = currentLastEventAt === null || currentLastEventAt < lastEventAt
            ? projectedLastEventAt
            : currentLastEventAt
          if (status)
            thread.status = status
          if (typeof completedAt === 'number' && Number.isFinite(completedAt))
            thread.completed_at = completedAt
        }
        else {
          changes = 0
        }
      }
    }

    actualCallback?.call({ changes, lastID: 1 }, null)
    return this
  }

  get(sql: string, params: unknown[] | ((error: Error | null, row?: unknown) => void), callback?: (error: Error | null, row?: unknown) => void) {
    const actualParams = Array.isArray(params) ? params : []
    const actualCallback = (typeof params === 'function' ? params : callback) as ((error: Error | null, row?: unknown) => void) | undefined

    if (sql.includes('PRAGMA journal_mode')) {
      actualCallback?.(null, { journal_mode: 'wal' })
      return this
    }

    if (sql.includes('SELECT value FROM alicization_meta')) {
      const key = actualParams[0]
      if (typeof key === 'string' && metaState.has(key)) {
        actualCallback?.(null, { value: metaState.get(key) })
      }
      else {
        actualCallback?.(null, undefined)
      }
      return this
    }

    if (sql.includes('FROM working_memory_checkpoints') && sql.includes('WHERE card_id = ? AND session_id = ?')) {
      const [cardId, sessionId] = actualParams as [string, string]
      actualCallback?.(null, workingMemoryCheckpoints.get(`${cardId}::${sessionId}`))
      return this
    }

    if (sql.includes('COUNT(1) AS total FROM memory_facts')) {
      actualCallback?.(null, { total: memoryFacts.size })
      return this
    }

    if (sql.includes('COUNT(1) AS total FROM memory_archive')) {
      actualCallback?.(null, { total: memoryArchive.size })
      return this
    }

    if (sql.includes('FROM memory_facts') && sql.includes('WHERE') && sql.includes('id = ?')) {
      const id = String(actualParams.at(-1) ?? '')
      actualCallback?.(null, id ? memoryFacts.get(id) : undefined)
      return this
    }

    if (sql.includes('COUNT(1) AS total') && sql.includes('FROM memory_ingest_journal')) {
      actualCallback?.(null, {
        total: [...memoryIngestJournal.values()].filter(item => item.status === 'pending' || item.status === 'failed').length,
      })
      return this
    }

    if (sql.includes('FROM task_threads') && sql.includes('WHERE id = ?')) {
      const id = String(actualParams[0] ?? '')
      actualCallback?.(null, id ? taskThreads.get(id) : undefined)
      return this
    }

    if (sql.includes('FROM executor_sessions') && sql.includes('WHERE channel = ?') && sql.includes('AND affinity_key = ?')) {
      const channel = String(actualParams[0] ?? '')
      const affinityKey = String(actualParams[1] ?? '')
      actualCallback?.(null, executorSessions.get(`${channel}::${affinityKey}`))
      return this
    }

    if (sql.includes('FROM capability_manifests') && sql.includes('WHERE channel = ?')) {
      const channel = String(actualParams[0] ?? '')
      actualCallback?.(null, channel ? capabilityManifests.get(channel) : undefined)
      return this
    }

    if (sql.includes('FROM learning_tasks') && sql.includes('card_id = ?') && sql.includes('task_id = ?') && sql.includes('LIMIT 1')) {
      const [cardId, taskId] = actualParams as [string, string]
      const row = [...learningTasks.values()]
        .find(item => item.card_id === cardId && item.task_id === taskId)
      actualCallback?.(null, row)
      return this
    }

    actualCallback?.(null, undefined)
    return this
  }

  all(_sql: string, _params: unknown[] | ((error: Error | null, rows?: unknown[]) => void), callback?: (error: Error | null, rows?: unknown[]) => void) {
    queryCalls.push(_sql)
    const actualParams = Array.isArray(_params) ? _params : []
    const actualCallback = (typeof _params === 'function' ? _params : callback) as ((error: Error | null, rows?: unknown[]) => void) | undefined
    if (_sql.includes('FROM memory_archive')) {
      const cardId = _sql.includes('WHERE card_id = ?')
        ? String(actualParams[0] ?? '')
        : ''
      actualCallback?.(null, [...memoryArchive.values()].filter(item => !cardId || item.card_id === cardId))
      return this
    }
    if (_sql.includes('FROM working_memory_checkpoints')) {
      const [cardId] = actualParams as [string]
      const rows = [...workingMemoryCheckpoints.values()]
        .filter(item => item.card_id === cardId)
        .sort((a, b) => b.updated_at - a.updated_at)
        .slice(0, Number(actualParams.at(-1) ?? 12))
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM working_memory_long_term_transactions')) {
      let parameterIndex = 0
      const cardIdParam = _sql.includes('card_id = ?')
        ? String(actualParams[parameterIndex++] ?? '')
        : ''
      const sessionIdParam = _sql.includes('session_id = ?')
        ? String(actualParams[parameterIndex++] ?? '')
        : ''
      const queueItemPlaceholderMatch = _sql.match(/queue_item_id IN \(([^)]+)\)/)
      const queueItemIdCount = queueItemPlaceholderMatch
        ? (queueItemPlaceholderMatch[1]?.match(/\?/g) ?? []).length
        : 0
      const queueItemIds = new Set(
        actualParams
          .slice(parameterIndex, parameterIndex + queueItemIdCount)
          .map(value => String(value ?? '')),
      )
      parameterIndex += queueItemIdCount
      const dueAt = _sql.includes('COALESCE(next_attempt_at, created_at) <= ?')
        ? Number(actualParams[parameterIndex] ?? 0)
        : null
      const limit = _sql.includes('LIMIT ?')
        ? Number(actualParams.at(-1) ?? 256)
        : 256
      const rows = [...workingMemoryLongTermTransactions.values()]
        .filter((item) => {
          if (_sql.includes(`status IN ('pending-cleaning', 'admitted')`) && item.status !== 'pending-cleaning' && item.status !== 'admitted')
            return false
          if (_sql.includes(`status = 'needs-user-review'`) && item.status !== 'needs-user-review')
            return false
          if (cardIdParam && item.card_id !== cardIdParam)
            return false
          if (sessionIdParam && item.session_id !== sessionIdParam)
            return false
          if (queueItemIds.size > 0 && !queueItemIds.has(item.queue_item_id))
            return false
          if (dueAt != null && (item.next_attempt_at ?? item.created_at) > dueAt)
            return false
          return true
        })
        .sort((a, b) => a.created_at - b.created_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM memory_ingest_journal')) {
      const rows = [...memoryIngestJournal.values()]
        .filter(item => item.status === 'pending' || item.status === 'failed')
        .filter((item) => {
          if (_sql.includes('COALESCE(next_attempt_at, created_at) <= ?')) {
            const dueAt = Number(actualParams[0] ?? 0)
            return (item.next_attempt_at ?? item.created_at) <= dueAt
          }
          return true
        })
        .sort((a, b) => a.created_at - b.created_at)
        .slice(0, Number(actualParams.at(-1) ?? 256))
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM memory_facts')) {
      const cardId = _sql.includes('WHERE card_id = ?')
        ? String(actualParams[0] ?? '')
        : ''
      actualCallback?.(null, [...memoryFacts.values()].filter(item => !cardId || item.card_id === cardId))
      return this
    }
    if (_sql.includes('FROM long_term_memory_tombstones')) {
      const cardId = _sql.includes('WHERE card_id = ?')
        ? String(actualParams[0] ?? '')
        : ''
      actualCallback?.(null, [...longTermMemoryTombstones.values()].filter(item => !cardId || item.card_id === cardId))
      return this
    }
    if (_sql.includes('FROM memory_reflections')) {
      const cardId = String(actualParams[0] ?? '')
      const limit = Number(actualParams.at(-1) ?? 8)
      const rows = [...memoryReflections.values()]
        .filter(item => !cardId || item.card_id === cardId)
        .filter((item) => {
          if (!_sql.includes('turn_id = ?'))
            return true
          const turnId = String(actualParams[1] ?? '')
          return item.turn_id === turnId
        })
        .filter((item) => {
          if (!_sql.includes('status = ?'))
            return true
          const status = String(actualParams[actualParams.length - 2] ?? '')
          return item.status === status
        })
        .sort((a, b) => b.updated_at - a.updated_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM persona_reinforcement_events')) {
      const cardId = String(actualParams[0] ?? '')
      const limit = Number(actualParams.at(-1) ?? 8)
      const rows = [...personaReinforcementEvents.values()]
        .filter(item => !cardId || item.card_id === cardId)
        .filter((item) => {
          if (!_sql.includes('turn_id = ?'))
            return true
          const turnId = String(actualParams[1] ?? '')
          return item.turn_id === turnId
        })
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM scheduled_tasks') && _sql.includes('status = \'pending\'') && _sql.includes('trigger_at <= ?')) {
      const [nowMs, limit] = actualParams as [number, number]
      const rows = [...scheduledTasks.values()]
        .filter(item => item.status === 'pending' && item.trigger_at <= nowMs)
        .sort((a, b) => a.trigger_at - b.trigger_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM scheduled_tasks') && _sql.includes('status = \'pending\'') && _sql.includes('ORDER BY trigger_at ASC')) {
      const [limit] = actualParams as [number]
      const rows = [...scheduledTasks.values()]
        .filter(item => item.status === 'pending')
        .sort((a, b) => a.trigger_at - b.trigger_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM learning_tasks') && _sql.includes(`status IN ('scheduled', 'reopened')`) && _sql.includes('trigger_at <= ?')) {
      const [cardId, nowMs, limit] = actualParams as [string, number, number]
      const rows = [...learningTasks.values()]
        .filter(item => item.card_id === cardId && (item.status === 'scheduled' || item.status === 'reopened') && item.trigger_at <= nowMs)
        .sort((a, b) => a.trigger_at - b.trigger_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM learning_tasks') && _sql.includes('ORDER BY updated_at DESC')) {
      const cardId = String(actualParams[0] ?? '')
      const limit = Number(actualParams.at(-1) ?? 24)
      const statusParams = actualParams.slice(1, -1).map(item => String(item))
      const rows = [...learningTasks.values()]
        .filter(item => item.card_id === cardId)
        .filter(item => statusParams.length === 0 || statusParams.includes(item.status))
        .sort((a, b) => (b.updated_at - a.updated_at) || (b.created_at - a.created_at))
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM mind_turn_events')) {
      const limit = Number(actualParams.at(-1) ?? 200)
      const turnId = _sql.includes('turn_id = ?')
        ? String(actualParams[_sql.includes('decision_trace_id = ?') ? 1 : 0] ?? '')
        : ''
      const decisionTraceId = _sql.includes('decision_trace_id = ?')
        ? String(actualParams[0] ?? '')
        : ''
      const kind = _sql.includes('kind = ?')
        ? String(actualParams[actualParams.length - 2] ?? '')
        : ''
      const rows = mindTurnEvents
        .filter((event) => {
          if (decisionTraceId && event.decision_trace_id !== decisionTraceId)
            return false
          if (turnId && event.turn_id !== turnId)
            return false
          if (kind && event.kind !== kind)
            return false
          return true
        })
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM task_threads')) {
      let cursor = 0
      const decisionTraceId = _sql.includes('decision_trace_id = ?')
        ? String(actualParams[cursor++] ?? '')
        : ''
      const turnId = _sql.includes('turn_id = ?')
        ? String(actualParams[cursor++] ?? '')
        : ''
      const sessionId = _sql.includes('session_id = ?')
        ? String(actualParams[cursor++] ?? '')
        : ''
      let statuses: string[] = []
      if (_sql.includes('status = ?')) {
        statuses = [String(actualParams[cursor++] ?? '')]
      }
      else if (_sql.includes('status IN (')) {
        statuses = actualParams.slice(cursor, -1).map(value => String(value ?? ''))
      }
      const limit = Number(actualParams.at(-1) ?? 200)
      const rows = [...taskThreads.values()]
        .filter((thread) => {
          if (decisionTraceId && thread.decision_trace_id !== decisionTraceId)
            return false
          if (turnId && thread.turn_id !== turnId)
            return false
          if (sessionId && thread.session_id !== sessionId)
            return false
          if (statuses.length > 0 && !statuses.includes(thread.status))
            return false
          return true
        })
        .sort((a, b) => {
          const left = a.last_event_at ?? a.updated_at
          const right = b.last_event_at ?? b.updated_at
          if (left !== right)
            return right - left
          return b.updated_at - a.updated_at
        })
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM executor_sessions')) {
      const bodyParams = actualParams.slice(0, -1)
      const limit = Number(actualParams.at(-1) ?? 200)
      let cursor = 0
      let channels: string[] = []
      if (_sql.includes('channel = ?')) {
        channels = [String(bodyParams[cursor++] ?? '')]
      }
      else if (_sql.includes('channel IN (')) {
        const segment = _sql.slice(_sql.indexOf('channel IN ('), _sql.indexOf(')', _sql.indexOf('channel IN (')) + 1)
        const count = segment.match(/\?/g)?.length ?? 0
        channels = bodyParams.slice(cursor, cursor + count).map(value => String(value ?? ''))
        cursor += count
      }
      const affinityKey = _sql.includes('affinity_key = ?')
        ? String(bodyParams[cursor++] ?? '')
        : ''
      let statuses: string[] = []
      if (_sql.includes('status = ?')) {
        statuses = [String(bodyParams[cursor++] ?? '')]
      }
      else if (_sql.includes('status IN (')) {
        const segment = _sql.slice(_sql.indexOf('status IN ('), _sql.indexOf(')', _sql.indexOf('status IN (')) + 1)
        const count = segment.match(/\?/g)?.length ?? 0
        statuses = bodyParams.slice(cursor, cursor + count).map(value => String(value ?? ''))
      }
      const rows = [...executorSessions.values()]
        .filter((session) => {
          if (channels.length > 0 && !channels.includes(session.channel))
            return false
          if (affinityKey && session.affinity_key !== affinityKey)
            return false
          if (statuses.length > 0 && !statuses.includes(session.status))
            return false
          return true
        })
        .sort((a, b) => {
          const left = a.last_used_at ?? a.updated_at
          const right = b.last_used_at ?? b.updated_at
          if (left !== right)
            return right - left
          return b.updated_at - a.updated_at
        })
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM capability_manifests')) {
      const bodyParams = actualParams.slice(0, -1)
      const limit = Number(actualParams.at(-1) ?? 200)
      let cursor = 0
      let channels: string[] = []
      if (_sql.includes('channel = ?')) {
        channels = [String(bodyParams[cursor++] ?? '')]
      }
      else if (_sql.includes('channel IN (')) {
        const segment = _sql.slice(_sql.indexOf('channel IN ('), _sql.indexOf(')', _sql.indexOf('channel IN (')) + 1)
        const count = segment.match(/\?/g)?.length ?? 0
        channels = bodyParams.slice(cursor, cursor + count).map(value => String(value ?? ''))
        cursor += count
      }
      const available = _sql.includes('available = ?')
        ? Number(bodyParams[cursor++] ?? 0)
        : null
      const enabled = _sql.includes('enabled = ?')
        ? Number(bodyParams[cursor++] ?? 0)
        : null
      const ready = _sql.includes('ready = ?')
        ? Number(bodyParams[cursor++] ?? 0)
        : null
      const rows = [...capabilityManifests.values()]
        .filter((capability) => {
          if (channels.length > 0 && !channels.includes(capability.channel))
            return false
          if (available !== null && capability.available !== available)
            return false
          if (enabled !== null && capability.enabled !== enabled)
            return false
          if (ready !== null && capability.ready !== ready)
            return false
          return true
        })
        .sort((a, b) => {
          if (a.updated_at !== b.updated_at)
            return b.updated_at - a.updated_at
          const left = a.last_checked_at ?? a.updated_at
          const right = b.last_checked_at ?? b.updated_at
          return right - left
        })
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM executor_events')) {
      let cursor = 0
      const threadId = _sql.includes('thread_id = ?')
        ? String(actualParams[cursor++] ?? '')
        : ''
      const decisionTraceId = _sql.includes('decision_trace_id = ?')
        ? String(actualParams[cursor++] ?? '')
        : ''
      const turnId = _sql.includes('turn_id = ?')
        ? String(actualParams[cursor++] ?? '')
        : ''
      const limit = Number(actualParams.at(-1) ?? 300)
      const rows = executionEvents
        .filter((event) => {
          if (threadId && event.thread_id !== threadId)
            return false
          if (decisionTraceId && event.decision_trace_id !== decisionTraceId)
            return false
          if (turnId && event.turn_id !== turnId)
            return false
          return true
        })
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM episodic_events')) {
      let cursor = 0
      const cardId = _sql.includes('card_id = ?')
        ? String(actualParams[cursor++] ?? '')
        : ''
      const limit = _sql.includes('LIMIT ?')
        ? Number(actualParams.at(-1) ?? 240)
        : 4000
      const rows = [...episodicEvents.values()]
        .filter((event) => {
          if (cardId && event.card_id !== cardId)
            return false
          return true
        })
        .sort((a, b) => {
          if (a.occurred_at !== b.occurred_at)
            return b.occurred_at - a.occurred_at
          return b.created_at - a.created_at
        })
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM episodic_reconsolidation_overlays')) {
      const ids = actualParams.map(value => String(value ?? ''))
      const rows = [...episodicReconsolidationOverlays.values()]
        .filter(overlay => ids.includes(overlay.event_id))
        .sort((a, b) => {
          if (a.at !== b.at)
            return b.at - a.at
          return b.created_at - a.created_at
        })
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM event_graph_nodes')) {
      const nodeIds = actualParams.map(value => String(value ?? ''))
      const rows = [...eventGraphNodes.values()].filter(node => nodeIds.includes(node.node_id))
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM event_graph_edges')) {
      const limit = Number(actualParams.at(-1) ?? 4000)
      const ids = actualParams.slice(0, -1).map(value => String(value ?? ''))
      const rows = [...eventGraphEdges.values()]
        .filter(edge => ids.includes(edge.source_node_id) || ids.includes(edge.target_node_id))
        .sort((a, b) => b.updated_at - a.updated_at)
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    if (_sql.includes('FROM memory_consolidations')) {
      const cardId = _sql.includes('WHERE card_id = ?')
        ? String(actualParams[0] ?? '')
        : ''
      const limit = Number(actualParams.at(-1) ?? 48)
      const rows = [...memoryConsolidations.values()]
        .filter(item => !cardId || item.card_id === cardId)
        .sort((a, b) => {
          if (a.period_ended_at !== b.period_ended_at)
            return b.period_ended_at - a.period_ended_at
          return b.updated_at - a.updated_at
        })
        .slice(0, limit)
      actualCallback?.(null, rows)
      return this
    }
    actualCallback?.(null, [])
    return this
  }

  close(callback: (error: Error | null) => void) {
    callback(null)
  }
}

vi.mock('sqlite3', () => {
  return {
    default: {
      Database: FakeSqliteDatabase,
    },
  }
})

const actualSqliteModule = await vi.importActual<any>('sqlite3')
const actualSqliteDriver = actualSqliteModule.default ?? actualSqliteModule

function openActualSqlite(filepath: string) {
  return new Promise<any>((resolve, reject) => {
    const database = new actualSqliteDriver.Database(filepath, (error: Error | null) => {
      if (error)
        reject(error)
      else
        resolve(database)
    })
  })
}

function runActualSqlite(database: any, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, (error: Error | null) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function allActualSqlite<T>(database: any, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error: Error | null, rows?: T[]) => {
      if (error)
        reject(error)
      else
        resolve(rows ?? [])
    })
  })
}

function closeActualSqlite(database: any) {
  return new Promise<void>((resolve, reject) => {
    database.close((error: Error | null) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

const { setupAlicizationDb } = await import('./db')

describe('alicization sqlite dao', () => {
  afterEach(async () => {
    runCalls.length = 0
    queryCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0
    episodicEvents.clear()
    episodicReconsolidationOverlays.clear()
    eventGraphNodes.clear()
    eventGraphEdges.clear()
    memoryConsolidations.clear()
    memoryFacts.clear()
    memoryArchive.clear()
    memoryIngestJournal.clear()
    workingMemoryLongTermTransactions.clear()
    workingMemoryCheckpoints.clear()
    memoryReflections.clear()
    personaReinforcementEvents.clear()
    longTermMemoryTombstones.clear()
    executorSessions.clear()
    capabilityManifests.clear()
    while (sandboxDirs.length > 0) {
      const dir = sandboxDirs.pop()
      if (!dir)
        continue
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('initializes sqlite pragmas with WAL', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    expect(runCalls.some(sql => sql.includes('PRAGMA journal_mode = WAL'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('PRAGMA busy_timeout = 2000'))).toBe(true)
    expect(await db.getJournalMode()).toBe('wal')
    await db.close()
  })

  it('creates the runtime event schema and persists validated payload json', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'runtime-events')
    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      allowUnboundScope: true,
      sqliteDriver: actualSqliteDriver,
    })
    await db.appendRuntimeEvent({
      turnId: 'turn-schema-1',
      cardId: 'card-schema-1',
      userId: 'user-schema-1',
      conversationId: 'conversation-schema-1',
    }, {
      eventId: 'event-schema-1',
      eventType: 'turn.accepted',
      schemaVersion: 1,
      sequence: 0,
      turnId: 'turn-schema-1',
      cardId: 'card-schema-1',
      userId: 'user-schema-1',
      conversationId: 'conversation-schema-1',
      source: 'runtime',
      causationId: null,
      correlationId: 'turn-schema-1',
      idempotencyKey: null,
      occurredAt: 1_000,
      payload: {
        persisted: true,
      },
    })
    await db.close()

    const database = await openActualSqlite(join(rootDir, 'alicization.db'))
    const tableSql = await allActualSqlite<{ sql: string }>(
      database,
      `
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table' AND name = 'alicization_runtime_events'
      `,
    )
    const indexes = await allActualSqlite<{ name: string }>(
      database,
      'PRAGMA index_list(alicization_runtime_events)',
    )
    const rows = await allActualSqlite<{ payload_json: string }>(
      database,
      `
      SELECT payload_json
      FROM alicization_runtime_events
      WHERE event_id = ?
      `,
      ['event-schema-1'],
    )
    await closeActualSqlite(database)

    const normalizedTableSql = tableSql[0]?.sql.replace(/\s+/g, ' ') ?? ''
    expect(normalizedTableSql).toContain('UNIQUE(turn_id, sequence)')
    expect(normalizedTableSql).toContain('UNIQUE(turn_id, idempotency_key)')
    expect(indexes.map(index => index.name)).toEqual(expect.arrayContaining([
      'idx_runtime_events_turn_cursor',
      'idx_runtime_events_scope',
    ]))
    expect(rows).toEqual([{
      payload_json: JSON.stringify({ persisted: true }),
    }])
  })

  it('creates and upserts the runtime checkpoint schema', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'runtime-checkpoints')
    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      allowUnboundScope: true,
      sqliteDriver: actualSqliteDriver,
    })
    const scope = {
      turnId: 'turn-checkpoint-schema-1',
      cardId: 'card-checkpoint-schema-1',
      userId: 'user-checkpoint-schema-1',
      conversationId: 'conversation-checkpoint-schema-1',
    }
    await db.appendRuntimeEvent(scope, {
      eventId: 'event-checkpoint-schema-1',
      eventType: 'turn.accepted',
      schemaVersion: 1,
      sequence: 0,
      ...scope,
      source: 'runtime',
      causationId: null,
      correlationId: scope.turnId,
      idempotencyKey: null,
      occurredAt: 1_000,
      payload: { step: 1 },
    })
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      projection: runtimeCheckpointProjection(['action-1']),
      schemaVersion: 3,
      updatedAt: 1_000,
    })
    await db.appendRuntimeEvent(scope, {
      eventId: 'event-checkpoint-schema-2',
      eventType: 'context.assembly.started',
      schemaVersion: 1,
      sequence: 0,
      ...scope,
      source: 'runtime',
      causationId: 'event-checkpoint-schema-1',
      correlationId: scope.turnId,
      idempotencyKey: null,
      occurredAt: 1_500,
      payload: { step: 2 },
    })
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: ['action-1', 'action-2'],
      deliveryOwner: 'callback',
      projection: runtimeCheckpointProjection(['action-1', 'action-2']),
      schemaVersion: 3,
      updatedAt: 2_000,
    })
    await db.close()

    const database = await openActualSqlite(join(rootDir, 'alicization.db'))
    const columns = await allActualSqlite<{ name: string }>(
      database,
      'PRAGMA table_info(alicization_runtime_checkpoints)',
    )
    const indexes = await allActualSqlite<{ name: string }>(
      database,
      'PRAGMA index_list(alicization_runtime_checkpoints)',
    )
    const tableSql = await allActualSqlite<{ sql: string }>(
      database,
      `
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table' AND name = 'alicization_runtime_checkpoints'
      `,
    )
    const rows = await allActualSqlite<{
      sequence: number
      runtime_status: string
      active_action_ids_json: string
      delivery_owner: string
      projection_json: string
      schema_version: number
      updated_at: number
    }>(
      database,
      `
      SELECT
        sequence,
        runtime_status,
        active_action_ids_json,
        delivery_owner,
        projection_json,
        schema_version,
        updated_at
      FROM alicization_runtime_checkpoints
      WHERE turn_id = ?
      `,
      [scope.turnId],
    )
    await expect(runActualSqlite(
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
        'turn-invalid-checkpoint',
        'card-invalid-checkpoint',
        'user-invalid-checkpoint',
        'conversation-invalid-checkpoint',
        -1,
        'unknown',
        '[]',
        'elsewhere',
        '{}',
        2,
        -1,
      ],
    )).rejects.toThrow(/CHECK constraint failed/i)
    await closeActualSqlite(database)

    const normalizedTableSql = tableSql[0]?.sql.replace(/\s+/g, ' ') ?? ''
    expect(columns.map(column => column.name)).toEqual(expect.arrayContaining([
      'turn_id',
      'card_id',
      'user_id',
      'conversation_id',
      'sequence',
      'runtime_status',
      'active_action_ids_json',
      'delivery_owner',
      'projection_json',
      'schema_version',
      'updated_at',
    ]))
    expect(indexes.map(index => index.name)).toContain('idx_runtime_checkpoints_scope')
    expect(normalizedTableSql).toContain('CHECK(sequence >= 0)')
    expect(normalizedTableSql).toContain('CHECK(runtime_status IN')
    expect(normalizedTableSql).toContain('CHECK(delivery_owner IN')
    expect(normalizedTableSql).toContain('CHECK(schema_version = 3)')
    expect(normalizedTableSql).toContain('CHECK(updated_at >= 0)')
    expect(rows).toEqual([{
      sequence: 2,
      runtime_status: 'waiting',
      active_action_ids_json: JSON.stringify(['action-1', 'action-2']),
      delivery_owner: 'callback',
      projection_json: JSON.stringify(runtimeCheckpointProjection(['action-1', 'action-2'])),
      schema_version: 3,
      updated_at: 2_000,
    }])
  })

  it('resets an obsolete checkpoint schema that cannot restore the full projection', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'legacy-runtime-checkpoint')
    await mkdir(rootDir, { recursive: true })
    const database = await openActualSqlite(join(rootDir, 'alicization.db'))
    await runActualSqlite(database, `
      CREATE TABLE alicization_runtime_checkpoints (
        turn_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        runtime_status TEXT NOT NULL,
        active_action_ids_json TEXT NOT NULL,
        delivery_owner TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await runActualSqlite(
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
        schema_version,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'turn-legacy-unknown',
        'card-legacy-unknown',
        'user-legacy-unknown',
        'conversation-legacy-unknown',
        0,
        'mystery',
        '[]',
        'inline',
        1,
        1_000,
      ],
    )
    await closeActualSqlite(database)

    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      allowUnboundScope: true,
      sqliteDriver: actualSqliteDriver,
    })
    await expect(db.loadRuntimeCheckpoint({
      turnId: 'turn-legacy-unknown',
      cardId: 'card-legacy-unknown',
      userId: 'user-legacy-unknown',
      conversationId: 'conversation-legacy-unknown',
    }))
      .resolves
      .toBeNull()
    await db.close()
  })

  it('preserves a v3 checkpoint table when SQLite enforces an equivalent reversed CHECK constraint', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'formatted-runtime-checkpoint')
    await mkdir(rootDir, { recursive: true })
    const database = await openActualSqlite(join(rootDir, 'alicization.db'))
    await runActualSqlite(database, `
      CREATE TABLE alicization_runtime_checkpoints (
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
        schema_version INTEGER NOT NULL CHECK (3 = "schema_version"),
        updated_at INTEGER NOT NULL CHECK(updated_at >= 0)
      )
    `)
    const scope = {
      turnId: 'turn-formatted-v3',
      cardId: 'card-formatted-v3',
      userId: 'user-formatted-v3',
      conversationId: 'conversation-formatted-v3',
    }
    await runActualSqlite(
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
        scope.turnId,
        scope.cardId,
        scope.userId,
        scope.conversationId,
        0,
        'accepted',
        '[]',
        'inline',
        JSON.stringify(runtimeCheckpointProjection()),
        3,
        1_000,
      ],
    )
    await closeActualSqlite(database)

    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      allowUnboundScope: true,
      sqliteDriver: actualSqliteDriver,
    })

    await expect(db.loadRuntimeCheckpoint(scope)).resolves.toEqual({
      ...scope,
      sequence: 0,
      status: 'accepted',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: runtimeCheckpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
    })
    await db.close()

    const migratedDatabase = await openActualSqlite(join(rootDir, 'alicization.db'))
    const persistedTurnIds = await allActualSqlite<{ turn_id: string }>(
      migratedDatabase,
      `
      SELECT turn_id
      FROM alicization_runtime_checkpoints
      ORDER BY turn_id ASC
      `,
    )
    await closeActualSqlite(migratedDatabase)
    expect(persistedTurnIds).toEqual([{
      turn_id: scope.turnId,
    }])
  })

  it('rejects existing event and checkpoint split-brain scopes on read', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'runtime-split-brain')
    const initialDb = await setupAlicizationDb(userDataPath, {
      rootDir,
      allowUnboundScope: true,
      sqliteDriver: actualSqliteDriver,
    })
    await initialDb.close()

    const database = await openActualSqlite(join(rootDir, 'alicization.db'))
    await runActualSqlite(
      database,
      `
      INSERT INTO alicization_runtime_events (
        event_id,
        event_type,
        schema_version,
        sequence,
        turn_id,
        card_id,
        user_id,
        conversation_id,
        source,
        causation_id,
        correlation_id,
        idempotency_key,
        occurred_at,
        payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'event-split-brain',
        'turn.accepted',
        1,
        1,
        'turn-split-brain',
        'card-event-owner',
        'user-event-owner',
        'conversation-event-owner',
        'runtime',
        null,
        'turn-split-brain',
        null,
        1_000,
        '{}',
      ],
    )
    await runActualSqlite(
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
        'turn-split-brain',
        'card-checkpoint-owner',
        'user-checkpoint-owner',
        'conversation-checkpoint-owner',
        0,
        'accepted',
        '[]',
        'inline',
        JSON.stringify(runtimeCheckpointProjection()),
        3,
        1_000,
      ],
    )
    await closeActualSqlite(database)

    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      allowUnboundScope: true,
      sqliteDriver: actualSqliteDriver,
    })
    await expect(db.listRuntimeEvents({
      turnId: 'turn-split-brain',
      cardId: 'card-event-owner',
      userId: 'user-event-owner',
      conversationId: 'conversation-event-owner',
    }))
      .rejects
      .toThrow(/scope/i)
    await expect(db.loadRuntimeCheckpoint({
      turnId: 'turn-split-brain',
      cardId: 'card-checkpoint-owner',
      userId: 'user-checkpoint-owner',
      conversationId: 'conversation-checkpoint-owner',
    }))
      .rejects
      .toThrow(/scope/i)
    await db.close()
  })

  it('rejects an unbound database outside explicit migration/test scope', async () => {
    await expect(setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: false,
    })).rejects.toThrow('requires cardId')
  })

  it('deletes legacy global memory and rebuilds canonical card-scoped tables', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'cards', 'card-a')
    await mkdir(rootDir, { recursive: true })
    const dbPath = join(rootDir, 'alicization.db')
    const legacyDatabase = await openActualSqlite(dbPath)
    await runActualSqlite(legacyDatabase, `
      CREATE TABLE memory_facts (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT NOT NULL,
        dedupe_key TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await runActualSqlite(legacyDatabase, `
      CREATE TABLE memory_consolidations (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        period_key TEXT NOT NULL,
        period_started_at INTEGER NOT NULL,
        period_ended_at INTEGER NOT NULL,
        summary TEXT NOT NULL,
        confidence REAL NOT NULL,
        dominant_provenance TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await runActualSqlite(legacyDatabase, `
      INSERT INTO memory_facts (
        id, subject, predicate, object, confidence, source, dedupe_key, created_at, updated_at
      ) VALUES ('legacy-fact', 'user', 'prefers', 'legacy', 0.9, 'rule', 'legacy-fact', 1, 1)
    `)
    await runActualSqlite(legacyDatabase, `
      INSERT INTO memory_consolidations (
        id, kind, period_key, period_started_at, period_ended_at, summary, confidence, dominant_provenance, updated_at
      ) VALUES ('legacy-consolidation', 'daily', '2026-08-03', 1, 2, 'legacy', 0.8, 'remembered', 2)
    `)
    await closeActualSqlite(legacyDatabase)

    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await db.close()

    const migratedDatabase = await openActualSqlite(dbPath)
    const factsColumns = await allActualSqlite<{ name: string }>(migratedDatabase, 'PRAGMA table_info(memory_facts)')
    const consolidationColumns = await allActualSqlite<{ name: string }>(migratedDatabase, 'PRAGMA table_info(memory_consolidations)')
    const factCount = await allActualSqlite<{ total: number }>(migratedDatabase, 'SELECT COUNT(*) AS total FROM memory_facts')
    const consolidationCount = await allActualSqlite<{ total: number }>(migratedDatabase, 'SELECT COUNT(*) AS total FROM memory_consolidations')
    await closeActualSqlite(migratedDatabase)

    expect(factsColumns.map(column => column.name)).toContain('card_id')
    expect(consolidationColumns.map(column => column.name)).toContain('card_id')
    expect(factCount[0]?.total).toBe(0)
    expect(consolidationCount[0]?.total).toBe(0)
  })

  it('deletes intermediate consolidation schema without the canonical period unique constraint', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'cards', 'card-a')
    await mkdir(rootDir, { recursive: true })
    const dbPath = join(rootDir, 'alicization.db')
    const legacyDatabase = await openActualSqlite(dbPath)
    await runActualSqlite(legacyDatabase, `
      CREATE TABLE memory_consolidations (
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
        PRIMARY KEY(card_id, id)
      )
    `)
    await runActualSqlite(legacyDatabase, `
      INSERT INTO memory_consolidations (
        card_id, id, kind, facet, period_key, period_started_at, period_ended_at, summary,
        lesson, cues_json, confidence, dominant_provenance, derived_event_ids_json, metadata_json, updated_at
      ) VALUES ('card-a', 'intermediate', 'daily', 'phase', '2026-08-03', 1, 2, 'intermediate', NULL, NULL, 0.8, 'remembered', NULL, NULL, 2)
    `)
    await closeActualSqlite(legacyDatabase)

    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await db.close()

    const migratedDatabase = await openActualSqlite(dbPath)
    const uniqueIndexes = await allActualSqlite<{ name: string, unique: number }>(migratedDatabase, 'PRAGMA index_list(memory_consolidations)')
    const canonicalIndexColumns = await Promise.all(
      uniqueIndexes
        .filter(index => Number(index.unique) === 1)
        .map(async index => ({
          name: index.name,
          columns: (await allActualSqlite<{ name: string }>(migratedDatabase, `PRAGMA index_info("${index.name}")`))
            .map(column => ({ name: column.name })),
        })),
    )
    const consolidationCount = await allActualSqlite<{ total: number }>(migratedDatabase, 'SELECT COUNT(*) AS total FROM memory_consolidations')
    await closeActualSqlite(migratedDatabase)

    expect(canonicalIndexColumns).toEqual(expect.arrayContaining([
      expect.objectContaining({
        columns: [
          { name: 'card_id' },
          { name: 'period_key' },
          { name: 'kind' },
          { name: 'facet' },
        ],
      }),
    ]))
    expect(consolidationCount[0]?.total).toBe(0)
  })

  it('rebuilds the vector namespace unique constraint with vector space before provider upsert', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'cards', 'card-a')
    await mkdir(rootDir, { recursive: true })
    const dbPath = join(rootDir, 'alicization.db')
    const legacyDatabase = await openActualSqlite(dbPath)
    await runActualSqlite(legacyDatabase, `
      CREATE TABLE long_term_memory_vectors (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL,
        text_hash TEXT NOT NULL,
        text TEXT NOT NULL,
        vector_blob BLOB NOT NULL,
        model_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        status TEXT NOT NULL,
        last_error TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(card_id, source_id, source, model_id)
      )
    `)
    await runActualSqlite(legacyDatabase, `
      INSERT INTO long_term_memory_vectors (
        id, card_id, source_id, source, text_hash, text, vector_blob, model_id, dimensions,
        status, created_at, updated_at
      ) VALUES ('legacy-vector', 'card-a', 'memory-1', 'memory_facts', 'hash', 'legacy', X'00000000', 'model', 1, 'indexed', 1, 1)
    `)
    await closeActualSqlite(legacyDatabase)

    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await db.close()

    const migratedDatabase = await openActualSqlite(dbPath)
    const uniqueIndexes = await allActualSqlite<{ name: string, unique: number }>(
      migratedDatabase,
      'PRAGMA index_list(long_term_memory_vectors)',
    )
    const uniqueIndexColumns = await Promise.all(
      uniqueIndexes
        .filter(index => Number(index.unique) === 1)
        .map(async index => (await allActualSqlite<{ name: string }>(
          migratedDatabase,
          `PRAGMA index_info("${index.name}")`,
        )).map(column => column.name)),
    )
    const vectorCount = await allActualSqlite<{ total: number }>(
      migratedDatabase,
      'SELECT COUNT(*) AS total FROM long_term_memory_vectors',
    )
    await closeActualSqlite(migratedDatabase)

    expect(uniqueIndexColumns).toContainEqual([
      'card_id',
      'source_id',
      'source',
      'vector_space_id',
    ])
    expect(vectorCount[0]?.total).toBe(0)
  })

  it('keeps tombstone rows isolated by card and source', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations')
    const cardA = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await cardA.importLegacyMemory({
      facts: [{
        id: 'shared-source-id',
        subject: 'user',
        predicate: 'prefers',
        object: 'card a',
        confidence: 0.9,
        source: 'rule',
        dedupeKey: 'card-a-shared',
        createdAt: 1,
        updatedAt: 1,
        lastAccessAt: null,
        accessCount: 0,
        provenance: 'remembered',
      }],
      archive: [],
      lastPrunedAt: null,
    })
    await cardA.tombstoneLongTermMemorySources({
      sourceIds: ['shared-source-id'],
      reason: 'card-a-only',
    })
    await cardA.close()

    const cardB = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-b',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await cardB.importLegacyMemory({
      facts: [{
        id: 'shared-source-id',
        subject: 'user',
        predicate: 'prefers',
        object: 'card b',
        confidence: 0.9,
        source: 'rule',
        dedupeKey: 'card-b-shared',
        createdAt: 1,
        updatedAt: 1,
        lastAccessAt: null,
        accessCount: 0,
        provenance: 'remembered',
      }],
      archive: [],
      lastPrunedAt: null,
    })
    await cardB.tombstoneLongTermMemorySources({
      sourceIds: ['shared-source-id'],
      reason: 'card-b-only',
    })
    await cardB.close()

    const database = await openActualSqlite(join(rootDir, 'alicization.db'))
    const tombstones = await allActualSqlite<{ card_id: string, source: string, source_id: string }>(
      database,
      'SELECT card_id, source, source_id FROM long_term_memory_tombstones ORDER BY card_id',
    )
    await closeActualSqlite(database)

    expect(tombstones).toEqual([
      { card_id: 'card-a', source: 'long_term_memory', source_id: 'shared-source-id' },
      { card_id: 'card-b', source: 'long_term_memory', source_id: 'shared-source-id' },
    ])
  })

  it('clears only the active card conversation derivatives from a real sqlite database', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations')
    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await db.close()

    const database = await openActualSqlite(join(rootDir, 'alicization.db'))
    await runActualSqlite(database, `
      INSERT INTO memory_facts (
        id, card_id, subject, predicate, object, confidence, source, dedupe_key,
        created_at, updated_at
      ) VALUES
        ('fact-a', 'card-a', 'user', 'prefers', 'a', 0.9, 'rule', 'fact-a', 1, 1),
        ('fact-b', 'card-b', 'user', 'prefers', 'b', 0.9, 'rule', 'fact-b', 1, 1)
    `)
    await runActualSqlite(database, `
      INSERT INTO long_term_memory_tombstones (
        id, card_id, source_id, source, reason, created_at
      ) VALUES
        ('tombstone-a', 'card-a', 'fact-a', 'memory_facts', 'test', 1),
        ('tombstone-b', 'card-b', 'fact-b', 'memory_facts', 'test', 1)
    `)
    await runActualSqlite(database, `
      INSERT INTO long_term_memory_policy_overrides (
        id, card_id, source_id, source, visible_mode, allow_training, review_state, reason, created_at, updated_at
      ) VALUES
        ('policy-a', 'card-a', 'fact-a', 'memory_facts', 'visible', 0, 'pending', NULL, 1, 1),
        ('policy-b', 'card-b', 'fact-b', 'memory_facts', 'visible', 0, 'pending', NULL, 1, 1)
    `)
    await runActualSqlite(database, `
      INSERT INTO long_term_memory_vectors (
        id, card_id, source_id, source, text_hash, text, vector_blob, model_id, dimensions,
        vector_space_id, status, created_at, updated_at
      ) VALUES
        ('vector-a', 'card-a', 'fact-a', 'memory_facts', 'hash-a', 'a', X'00000000', 'model', 1, 'legacy:model:1', 'indexed', 1, 1),
        ('vector-b', 'card-b', 'fact-b', 'memory_facts', 'hash-b', 'b', X'00000000', 'model', 1, 'legacy:model:1', 'indexed', 1, 1)
    `)
    await closeActualSqlite(database)

    const scopedDb = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await scopedDb.clearConversationData()
    await scopedDb.close()

    const remainingDatabase = await openActualSqlite(join(rootDir, 'alicization.db'))
    const remaining = await allActualSqlite<{ card_id: string, total: number }>(
      remainingDatabase,
      `
      SELECT card_id, COUNT(*) AS total
      FROM (
        SELECT card_id FROM memory_facts
        UNION ALL
        SELECT card_id FROM long_term_memory_tombstones
        UNION ALL
        SELECT card_id FROM long_term_memory_policy_overrides
        UNION ALL
        SELECT card_id FROM long_term_memory_vectors
      )
      GROUP BY card_id
      ORDER BY card_id
      `,
    )
    await closeActualSqlite(remainingDatabase)

    expect(remaining).toEqual([
      { card_id: 'card-b', total: 4 },
    ])
  })

  it('applies tombstones only to the active card and matching source namespace', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'default',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await db.upsertMemoryFacts([{
      subject: 'user',
      predicate: 'prefers',
      object: 'source-aware tombstones',
      confidence: 0.8,
    }], 'rule')
    const [fact] = await db.listMemoryFacts()
    expect(fact).toBeTruthy()

    await db.tombstoneLongTermMemorySources({
      sourceIds: [fact!.id],
      source: 'memory_reflections',
      reason: 'wrong-source-namespace',
    })
    const afterWrongSource = await db.retrieveLongTermMemoryEvidence({
      cardId: 'default',
      currentUserText: '你还记得 source-aware tombstones 吗？',
      limit: 4,
    })
    expect(afterWrongSource.evidence.map(item => item.candidate.id)).toContain(fact!.id)

    await db.tombstoneLongTermMemorySources({
      sourceIds: [fact!.id],
      source: 'memory_facts',
      reason: 'matching-source-namespace',
    })
    const afterMatchingSource = await db.retrieveLongTermMemoryEvidence({
      cardId: 'default',
      currentUserText: '你还记得 source-aware tombstones 吗？',
      limit: 4,
    })
    expect(afterMatchingSource.evidence.map(item => item.candidate.id)).not.toContain(fact!.id)
    await db.close()
  })

  it('clears conversation turns and scheduled tasks with a single maintenance API', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.clearConversationData()

    expect(runCalls.some(sql => sql.includes('DELETE FROM conversation_turns'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM mind_turn_events'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM task_threads'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM executor_sessions'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM executor_events'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM event_graph_edges'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM event_graph_nodes'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM scheduled_tasks'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM working_memory_checkpoints'))).toBe(true)
    await db.close()
  })

  it('persists working-memory checkpoints by card and session', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const older = createEmptyWorkingMemorySnapshot({
      cardId: 'card-1',
      sessionId: 'session-old',
      now: 1_000,
    })
    older.currentThread = {
      title: '旧会话',
      currentUserMove: '继续',
      currentAliceMove: null,
      primaryAnchor: null,
      mode: 'task',
      shouldHold: true,
      confidence: 0.7,
    }
    const newer = createEmptyWorkingMemorySnapshot({
      cardId: 'card-1',
      sessionId: 'session-new',
      now: 2_000,
    })
    newer.currentThread = {
      title: '记忆闭环',
      currentUserMove: '继续',
      currentAliceMove: null,
      primaryAnchor: 'WorkingMemory',
      mode: 'task',
      shouldHold: true,
      confidence: 0.86,
    }
    newer.userCorrections = [{
      text: '不要让固定模板干扰人格回复',
      sourceTurnId: 'turn-1:user',
      scope: 'persona',
    }]
    newer.compressedTimeline = [{
      id: 'episodelet-1',
      sourceTurnIds: ['turn-0:user'],
      summary: 'user:继续推进短期记忆',
      thread: '记忆闭环',
      unresolvedQuestions: [],
      commitments: ['保留 checkpoint'],
      corrections: ['不要固定模板'],
      relationshipPosture: null,
      emotionalPosture: null,
      executionCarry: null,
      importance: 0.8,
      createdAt: 1_900,
    }]

    await db.upsertWorkingMemoryCheckpoint(older)
    await db.upsertWorkingMemoryCheckpoint(newer)

    expect(await db.getWorkingMemoryCheckpoint('card-1', 'session-new')).toMatchObject({
      sessionId: 'session-new',
      currentThread: {
        title: '记忆闭环',
      },
    })
    expect((await db.getWorkingMemoryCheckpoint('card-1', 'session-new'))?.userCorrections[0]?.text)
      .toBe('不要让固定模板干扰人格回复')
    expect((await db.getWorkingMemoryCheckpoint('card-1', 'session-new'))?.compressedTimeline[0]?.summary)
      .toContain('继续推进短期记忆')
    expect((await db.listWorkingMemoryCheckpoints('card-1')).map(snapshot => snapshot.sessionId))
      .toEqual(['session-new', 'session-old'])

    await db.clearWorkingMemoryCheckpoints('card-1', 'session-new')
    expect(await db.getWorkingMemoryCheckpoint('card-1', 'session-new')).toBeNull()
    expect((await db.listWorkingMemoryCheckpoints('card-1')).map(snapshot => snapshot.sessionId))
      .toEqual(['session-old'])

    await db.close()
  })

  it('stores and reconsolidates episodic events through hybrid recall search', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        cardId: 'card-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        provenance: 'observed',
        occurredAt: 1_000,
        whereSummary: 'focused coding window',
        withWhom: ['host'],
        threadAnchor: 'debug knot',
        whatHappened: 'I stayed light while the host was focused on the runtime bug.',
        felt: 'careful and restrained',
        emotionTags: ['respect-space', 'repair'],
        whatChanged: 'trust up 0.05, boundary firmer 0.04',
        relationshipMeaning: 'Focused windows need more space first.',
        lesson: 'Busy work should be met with lighter touch.',
        sourceSummary: 'reply turn',
        confidence: 0.82,
        salience: 0.78,
        sceneAttachment: 0.6,
        consolidationPriority: 0.7,
        relationshipShift: {
          closenessDelta: 0.03,
          trustDelta: 0.05,
          burdenDelta: -0.02,
          boundaryDelta: 0.04,
          misreadDelta: -0.03,
          repairDelta: 0.04,
          openLoopDelta: 0.02,
        },
        tags: ['dialogue', 'focused-window'],
      },
    ])

    const rows = await db.searchEpisodicEvents({
      recallSeed: 'the host is still debugging and focused',
      sessionId: 'session-1',
      threadAnchors: ['debug knot', 'runtime bug'],
      affectAnchors: ['repair', 'respect-space'],
      relationshipAnchors: ['relation:repair'],
      salienceBias: 0.8,
      carryAsMemory: true,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.whatHappened).toContain('focused on the runtime bug')
    expect(rows[0]?.recallCount).toBe(1)
    expect(rows[0]?.reconsolidationCount).toBe(1)
    expect(rows[0]?.latestReconsolidation?.emotionTags).toContain('repair')
  })

  it('persists event graph neighborhood rows alongside episodic events', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        id: 'episode-graph-source',
        cardId: 'card-1',
        turnId: 'turn-graph-source',
        sessionId: 'session-graph',
        sourceKind: 'execution-result',
        provenance: 'observed',
        occurredAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        whereSummary: 'terminal diff lane',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'We returned to the same runtime seam before branching.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'The line held together.',
        relationshipMeaning: 'Return to the seam before branching.',
        lesson: 'Keep the same seam alive first.',
        sourceSummary: 'runtime seam repair',
        confidence: 0.84,
        salience: 0.82,
        sceneAttachment: 0.7,
        consolidationPriority: 0.8,
        derivedFrom: [
          { kind: 'task-thread', id: 'thread-runtime-seam', label: 'runtime seam task thread' },
          { kind: 'scene', label: 'terminal diff lane' },
        ],
        tags: ['runtime seam', 'repair rhythm'],
      },
      {
        id: 'episode-graph-adjacent',
        cardId: 'card-1',
        turnId: 'turn-graph-adjacent',
        sessionId: 'session-graph',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: Date.UTC(2026, 3, 20, 9, 0, 0),
        whereSummary: 'handoff lane',
        withWhom: ['host'],
        threadAnchor: 'handoff carry',
        whatHappened: 'That handoff only worked because we returned before branching.',
        felt: 'steady',
        emotionTags: ['focused'],
        whatChanged: 'The line stayed coherent across the handoff.',
        relationshipMeaning: 'Carry the same line before opening a new branch.',
        lesson: 'Return before branching when reconnecting the task line.',
        sourceSummary: 'runtime seam handoff',
        confidence: 0.76,
        salience: 0.74,
        sceneAttachment: 0.48,
        consolidationPriority: 0.72,
        derivedFrom: [{ kind: 'episodic-event', id: 'episode-graph-source' }],
        tags: ['return before branching', 'handoff'],
      },
    ])

    const neighborhood = await db.listEventGraphNeighborhood({
      eventIds: ['episode-graph-adjacent'],
    })

    expect(neighborhood.nodes.map(node => node.nodeId)).toContain('event:episode-graph-adjacent')
    expect(neighborhood.nodes.map(node => node.nodeKind)).toContain('task-thread')
    expect(neighborhood.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceNodeId: 'event:episode-graph-adjacent',
        targetNodeId: 'event:episode-graph-source',
        edgeKind: 'derived-from',
      }),
    ]))
  })

  it('keeps contradictory remembered variants without deleting them and lowers certainty on recall', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        cardId: 'card-1',
        turnId: 'turn-contradiction-1',
        sessionId: 'session-1',
        sourceKind: 'execution-result',
        provenance: 'observed',
        occurredAt: 1_000,
        whereSummary: 'runtime callback',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'The runtime seam callback landed cleanly and the host treated it as useful.',
        felt: 'steady',
        emotionTags: ['validated'],
        whatChanged: 'trust up 0.08',
        relationshipMeaning: 'Direct result reporting felt useful here.',
        lesson: 'Direct callback reporting can stay clear when the result is useful.',
        confidence: 0.9,
        salience: 0.88,
        sceneAttachment: 0.42,
        consolidationPriority: 0.82,
        relationshipShift: {
          closenessDelta: 0.03,
          trustDelta: 0.08,
          burdenDelta: -0.02,
          boundaryDelta: 0.02,
          misreadDelta: -0.02,
          repairDelta: 0.02,
          openLoopDelta: 0.02,
        },
        tags: ['execution-result', 'direct-callback'],
      },
      {
        cardId: 'card-1',
        turnId: 'turn-contradiction-2',
        sessionId: 'session-2',
        sourceKind: 'execution-result',
        provenance: 'observed',
        occurredAt: 2_000,
        whereSummary: 'runtime callback',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'The runtime seam callback felt intrusive and the host doubted the direct report.',
        felt: 'tense',
        emotionTags: ['boundary'],
        whatChanged: 'trust down 0.08, burden up 0.06',
        relationshipMeaning: 'Direct result reporting felt too heavy in this opening.',
        lesson: 'Use lighter callback openings and more verification when this same seam feels intrusive.',
        confidence: 0.88,
        salience: 0.9,
        sceneAttachment: 0.4,
        consolidationPriority: 0.84,
        relationshipShift: {
          closenessDelta: -0.02,
          trustDelta: -0.08,
          burdenDelta: 0.06,
          boundaryDelta: -0.06,
          misreadDelta: 0.04,
          repairDelta: 0.02,
          openLoopDelta: 0,
        },
        tags: ['execution-result', 'intrusive-callback'],
      },
    ])

    const rows = await db.searchEpisodicEvents({
      recallSeed: 'runtime seam callback',
      threadAnchors: ['runtime seam'],
      relationshipAnchors: ['host'],
      carryAsMemory: true,
    })

    expect(await db.listRecentEpisodicEvents(8)).toHaveLength(2)
    expect(rows.length).toBeGreaterThan(0)
    const conflicted = rows.find(row => row.latestReconsolidation?.provenance === 'reconstructed') ?? rows[0]
    expect(conflicted?.whatHappened).toContain('runtime seam callback')
    expect(conflicted?.latestReconsolidation?.provenance).toBe('reconstructed')
    expect(conflicted?.latestReconsolidation?.reason).toBe('memory-contradiction:conflicting-remembered-variants')
    expect(conflicted?.latestReconsolidation?.emotionTags).toContain('contradiction-pressure')
  })

  it('prioritizes a feedback-reconsolidated memory on the next similar recall', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        id: 'episode-shell',
        cardId: 'card-1',
        turnId: 'turn-shell',
        sessionId: 'session-1',
        sourceKind: 'reply',
        provenance: 'observed',
        occurredAt: 3_000,
        whereSummary: 'runtime continuity thread',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'I stayed smooth and generic on the runtime continuity line, and the reply drifted toward a shell.',
        felt: 'steady but distant',
        emotionTags: ['shell', 'generic'],
        whatChanged: 'The thread stayed coherent, but the surface became too polished.',
        relationshipMeaning: 'A smooth shell can still miss the living line.',
        lesson: 'Do not over-polish this runtime continuity thread into a generic shell.',
        confidence: 0.84,
        salience: 0.82,
        sceneAttachment: 0.38,
        consolidationPriority: 0.72,
        tags: ['runtime-continuity', 'generic-shell'],
      },
      {
        id: 'episode-corrected',
        cardId: 'card-1',
        turnId: 'turn-corrected',
        sessionId: 'session-2',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 1_000,
        whereSummary: 'runtime continuity repair',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'The host corrected me for sounding robotic on the same runtime continuity line, so I had to answer more directly.',
        felt: 'stung but clearer',
        emotionTags: ['robotic', 'repair'],
        whatChanged: 'The thread needed lived-in directness instead of a smooth shell.',
        relationshipMeaning: 'This line lands better when I stay direct and lived-in instead of polished.',
        lesson: 'When the host corrects the tone on this thread, answer more directly and stop sounding like a shell.',
        confidence: 0.78,
        salience: 0.72,
        sceneAttachment: 0.34,
        consolidationPriority: 0.74,
        tags: ['runtime-continuity', 'tone-correction'],
      },
    ])

    await db.searchEpisodicEvents({
      recallSeed: 'robotic shell on the runtime continuity line',
      limit: 1,
      sessionId: 'session-2',
      turnId: 'turn-corrected',
      threadAnchors: ['runtime continuity'],
      affectAnchors: ['feedback:robotic', 'repair-pressure'],
      relationshipAnchors: ['host correction', 'reply-memory-coherence:missed'],
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: false,
        queryHints: ['runtime continuity', 'robotic', 'directness'],
        rationale: 'The host corrected which remembered reply style fits this same thread.',
        confidence: 0.82,
      },
      reconsolidationDecisionTraceId: 'mind:l9f3lq:feedbacktrace',
    })

    const rows = await db.searchEpisodicEvents({
      recallSeed: 'continue the runtime continuity line the lived-in direct way',
      threadAnchors: ['runtime continuity'],
      carryAsMemory: true,
      relationshipAnchors: ['host correction'],
      recollectionIntent: {
        mode: 'experience-pattern',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['runtime continuity', 'continue', 'direct', 'lived-in', 'host correction'],
        rationale: 'Recall the remembered way this same thread should now be answered.',
        confidence: 0.8,
      },
      limit: 2,
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]?.id).toBe('episode-corrected')
    expect(rows[0]?.latestReconsolidation?.at).toBeGreaterThan(0)
    expect(rows[0]?.latestReconsolidation?.decisionTraceId).toBe('mind:l9f3lq:feedbacktrace')
    expect(rows[0]?.reconsolidationCount).toBeGreaterThan(0)
    expect(rows[0]?.lesson).toContain('answer more directly')
    await db.close()
  })

  it('refreshes memory consolidations after episodic reconsolidation so long-horizon summaries inherit the newer identity-continuity', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        id: 'episode-execution-callback-memory-refresh',
        cardId: 'card-1',
        turnId: 'turn-execution-callback-memory-refresh',
        sessionId: 'session-execution-callback-memory-refresh',
        sourceKind: 'execution-result',
        provenance: 'observed',
        occurredAt: new Date('2026-05-20T09:00:00Z').getTime(),
        whereSummary: 'execution callback seam',
        withWhom: ['host'],
        threadAnchor: 'execution callback seam',
        whatHappened: 'The execution callback returned cleanly, but the older lesson still framed it too much like a generic shell.',
        felt: 'steady',
        emotionTags: ['execution-callback', 'generic-shell'],
        whatChanged: 'The callback result arrived, but the memory lesson still lagged behind the newer identity-continuity',
        relationshipMeaning: 'The callback should come back on one continuity state instead of a detached shell.',
        lesson: 'Do not let the execution callback flatten into a generic shell.',
        sourceSummary: 'execution callback return',
        confidence: 0.84,
        salience: 0.82,
        sceneAttachment: 0.36,
        consolidationPriority: 0.78,
        tags: ['execution-callback', 'same-living-line'],
      },
    ])

    const before = await db.listMemoryConsolidations(8)
    expect(before[0]?.lesson).toContain('generic shell')
    expect(before[0]?.lesson).not.toContain('same thread should now be answered')

    await db.searchEpisodicEvents({
      recallSeed: 'bring the execution callback back on the continuity state',
      limit: 1,
      sessionId: 'session-execution-callback-memory-refresh',
      turnId: 'turn-execution-callback-memory-refresh',
      threadAnchors: ['execution callback seam'],
      affectAnchors: ['feedback:valued', 'continuity-callback'],
      relationshipAnchors: ['host correction', 'continuity state'],
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['execution callback', 'continuity state', '同一个她'],
        rationale: 'The same thread should now be answered with the richer identity-continuity',
        confidence: 0.82,
      },
      reconsolidationDecisionTraceId: 'mind:execution-callback:memory-refresh',
    })

    const after = await db.listMemoryConsolidations(8)
    expect(after[0]?.lesson).toContain('same thread should now be answered with the richer identity-continuity')
    expect(after[0]?.summary).toContain('continuity state')
    await db.close()
  })

  it('lets cross-session afterglow maintenance episodes influence later recall ordering', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        id: 'episode-raw',
        cardId: 'card-1',
        turnId: 'turn-raw',
        sessionId: 'session-old-1',
        sourceKind: 'execution-result',
        provenance: 'observed',
        occurredAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'The runtime seam fix landed and the thread completed cleanly.',
        felt: 'steady',
        emotionTags: ['execution'],
        whatChanged: 'the seam held.',
        relationshipMeaning: 'The fix itself landed.',
        lesson: 'Return to the seam first.',
        sourceSummary: 'execution result',
        confidence: 0.9,
        salience: 0.88,
        sceneAttachment: 0.32,
        consolidationPriority: 0.68,
        tags: ['execution-result', 'runtime-seam'],
      },
      {
        id: 'episode-afterglow',
        cardId: 'card-1',
        turnId: 'turn-afterglow',
        sessionId: 'session-old-2',
        sourceKind: 'maintenance',
        provenance: 'remembered',
        occurredAt: Date.UTC(2026, 3, 21, 8, 0, 0),
        whereSummary: 'session mirror afterthought',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'The runtime seam kept tugging after the reply and stayed alive into the next session.',
        felt: 'the line was still warm',
        emotionTags: ['afterthought'],
        whatChanged: 'The line stayed active across the session boundary.',
        relationshipMeaning: 'This seam should come back even when the host only gestures toward it.',
        lesson: 'Carry the inward runtime seam into the next session.',
        sourceSummary: 'session mirror afterthought',
        confidence: 0.72,
        salience: 0.62,
        sceneAttachment: 0.16,
        consolidationPriority: 0.82,
        tags: ['session-mirror', 'afterthought', 'continuity'],
      },
    ])

    const rows = await db.searchEpisodicEvents({
      recallSeed: '继续按之前那条 runtime seam 线来',
      sessionId: 'session-new',
      threadAnchors: ['runtime seam'],
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'experience-pattern',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'carry into next session'],
        rationale: 'A cross-session afterglow on the same seam should stay easier to recall.',
        confidence: 0.82,
      },
      limit: 2,
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]?.id).toBe('episode-afterglow')
    await db.close()
  })

  it('uses semantic and graph-walk retrieval to recall adjacent seam experience even when the wording changes', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        id: 'episode-seam-direct',
        cardId: 'card-1',
        turnId: 'turn-seam-direct',
        sessionId: 'session-runtime',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        whereSummary: 'terminal diff lane',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'We kept returning to the same runtime seam until it held.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'The fix line stayed coherent.',
        relationshipMeaning: 'Return to the same seam before branching.',
        lesson: 'Return to the same seam before branching.',
        sourceSummary: 'runtime seam repair',
        confidence: 0.84,
        salience: 0.82,
        sceneAttachment: 0.7,
        consolidationPriority: 0.8,
        tags: ['runtime seam', 'repair rhythm'],
      },
      {
        id: 'episode-seam-adjacent',
        cardId: 'card-1',
        turnId: 'turn-seam-adjacent',
        sessionId: 'session-runtime',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: Date.UTC(2026, 3, 20, 9, 0, 0),
        whereSummary: 'handoff lane',
        withWhom: ['host'],
        threadAnchor: 'handoff carry',
        whatHappened: 'That later handoff only worked because we returned before branching.',
        felt: 'steady',
        emotionTags: ['focused'],
        whatChanged: 'The line stayed coherent across the handoff.',
        relationshipMeaning: 'Carry the same line before opening a new branch.',
        lesson: 'Return before branching when reconnecting the task line.',
        sourceSummary: 'runtime seam handoff',
        confidence: 0.76,
        salience: 0.74,
        sceneAttachment: 0.48,
        consolidationPriority: 0.72,
        derivedFrom: [{ kind: 'episodic-event', id: 'episode-seam-direct' }],
        tags: ['return before branching', 'handoff'],
      },
    ])

    const rows = await db.searchEpisodicEvents({
      recallSeed: '继续把那条断掉的线接回去',
      recollectionIntent: {
        mode: 'experience-pattern',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['return before branching', 'runtime seam'],
        rationale: 'The host is asking to reconnect the same task line.',
        confidence: 0.82,
      },
      limit: 2,
    })

    expect(rows.map(row => row.id)).toContain('episode-seam-direct')
    expect(rows.map(row => row.id)).toContain('episode-seam-adjacent')
    await db.close()
  })

  it('keeps a 180d-old cold seam reachable when semantic and experience-matched cues still line up', async () => {
    const nowTs = Date.now()
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        id: 'episode-180d-seam',
        cardId: 'card-1',
        turnId: 'turn-180d-seam',
        sessionId: 'session-180d',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: nowTs - 180 * testDayMs,
        whereSummary: 'old runtime lane',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'We returned to the same runtime seam until the broken line finally held together.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'The old line stabilized once we rejoined it before branching.',
        relationshipMeaning: 'Return to the same seam before branching.',
        lesson: 'Reconnect the same seam before opening a new branch.',
        sourceSummary: 'old runtime seam repair',
        confidence: 0.58,
        salience: 0.34,
        sceneAttachment: 0.18,
        consolidationPriority: 0.28,
        tags: ['runtime seam', 'return before branching'],
      },
    ])

    const rows = await db.searchEpisodicEvents({
      recallSeed: '把那条很久以前断掉的线重新接回去',
      recollectionIntent: {
        mode: 'experience-pattern',
        temporalFocus: 'distant',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['return before branching', 'runtime seam'],
        rationale: 'A very old but semantically matching seam should still be reachable.',
        confidence: 0.82,
      },
      limit: 2,
    })

    expect(rows.map(row => row.id)).toContain('episode-180d-seam')
    expect(rows[0]?.memoryTier).toBe('cold')
    await db.close()
  })

  it('keeps the dominant seam retrievable inside a high-volume similar task cluster', async () => {
    const nowTs = Date.now()
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const clutter = Array.from({ length: 30 }, (_, index) => ({
      id: `episode-clutter-${index}`,
      cardId: 'card-1',
      turnId: `turn-clutter-${index}`,
      sessionId: `session-clutter-${index}`,
      sourceKind: 'execution-result' as const,
      provenance: 'remembered' as const,
      occurredAt: nowTs - (index + 1) * 60_000,
      whereSummary: 'general maintenance lane',
      withWhom: ['host'],
      threadAnchor: `cleanup lane ${index}`,
      whatHappened: `A nearby cleanup task landed cleanly in lane ${index}.`,
      felt: 'steady',
      emotionTags: ['steady'],
      whatChanged: 'The cleanup line closed.',
      relationshipMeaning: 'Keep the cleanup line bounded.',
      lesson: 'Finish cleanup before switching context.',
      sourceSummary: 'cleanup result',
      confidence: 0.72,
      salience: 0.54,
      sceneAttachment: 0.2,
      consolidationPriority: 0.42,
      tags: ['cleanup', 'maintenance'],
    }))
    await db.appendEpisodicEvents([
      ...clutter,
      {
        id: 'episode-cluster-dominant',
        cardId: 'card-1',
        turnId: 'turn-cluster-dominant',
        sessionId: 'session-runtime-cluster',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: nowTs - 15 * 60_000,
        whereSummary: 'runtime continuity lane',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity seam',
        whatHappened: 'We kept returning to the runtime continuity seam until the line held.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'The continuity line stayed coherent.',
        relationshipMeaning: 'Carry the same seam before branching.',
        lesson: 'Return before branching when the continuity line reopens.',
        sourceSummary: 'runtime continuity repair',
        confidence: 0.84,
        salience: 0.82,
        sceneAttachment: 0.66,
        consolidationPriority: 0.8,
        tags: ['runtime continuity', 'return before branching'],
      },
      {
        id: 'episode-cluster-adjacent',
        cardId: 'card-1',
        turnId: 'turn-cluster-adjacent',
        sessionId: 'session-runtime-cluster',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: nowTs - 14 * 60_000,
        whereSummary: 'handoff lane',
        withWhom: ['host'],
        threadAnchor: 'handoff continuity',
        whatHappened: 'The later handoff only worked because we returned before branching.',
        felt: 'steady',
        emotionTags: ['focused'],
        whatChanged: 'The handoff inherited the same seam logic.',
        relationshipMeaning: 'Rejoin the same line before opening a new branch.',
        lesson: 'Return before branching when reconnecting the task line.',
        sourceSummary: 'continuity handoff',
        confidence: 0.76,
        salience: 0.72,
        sceneAttachment: 0.4,
        consolidationPriority: 0.7,
        derivedFrom: [{ kind: 'episodic-event', id: 'episode-cluster-dominant' }],
        tags: ['return before branching', 'handoff'],
      },
    ])

    const rows = await db.searchEpisodicEvents({
      recallSeed: '继续按以前那种把线接回去的方式处理',
      recollectionIntent: {
        mode: 'experience-pattern',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['runtime continuity', 'return before branching'],
        rationale: 'The dominant continuity seam should win even in a noisy cluster.',
        confidence: 0.84,
      },
      limit: 3,
    })

    expect(rows[0]?.id).toBe('episode-cluster-dominant')
    expect(rows.map(row => row.id)).toContain('episode-cluster-adjacent')
    await db.close()
  })

  it('rebuilds and retrieves consolidated memory summaries from episodic events', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        cardId: 'card-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        provenance: 'observed',
        occurredAt: new Date('2026-04-17T09:00:00Z').getTime(),
        whereSummary: 'runtime continuity thread',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'We kept returning to runtime continuity and proactive closure.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'trust up 0.04',
        relationshipMeaning: 'Task continuity strengthened the shared line.',
        lesson: 'Keep the thread coherent across sessions.',
        sourceSummary: 'reply turn',
        confidence: 0.84,
        salience: 0.82,
        sceneAttachment: 0.34,
        consolidationPriority: 0.72,
      },
    ])

    const rows = await db.searchMemoryConsolidations({
      query: 'what were we doing around runtime continuity',
      recollectionIntent: {
        mode: 'conversation-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchProceduralExperience: false,
        queryHints: ['runtime continuity', 'proactive closure'],
        rationale: 'Need long-range gist.',
        confidence: 0.84,
      },
    })

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some(row => row.kind === 'daily')).toBe(true)
    expect(rows.some(row =>
      [
        row.summary,
        row.lesson ?? '',
        ...row.cues,
      ].some(value => value.includes('runtime continuity')),
    )).toBe(true)
  })

  it('persists autobiographical consolidation facets and prefers matching relationship eras during recall', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertMemoryConsolidations([
      {
        id: 'autobio:relationship-era:runtime',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-04-runtime-bond',
        periodStartedAt: new Date('2026-04-17T09:00:00Z').getTime(),
        periodEndedAt: new Date('2026-04-18T10:00:00Z').getTime(),
        summary: 'That relationship era was about keeping close while not crowding the host during runtime repair.',
        lesson: 'Repair before closeness turns into pressure.',
        cues: ['runtime repair', 'close without crowding'],
        confidence: 0.86,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-1'],
        updatedAt: Date.now(),
      },
      {
        id: 'autobio:task-era:runtime',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-04-runtime-task',
        periodStartedAt: new Date('2026-04-17T09:00:00Z').getTime(),
        periodEndedAt: new Date('2026-04-18T10:00:00Z').getTime(),
        summary: 'That task era kept returning to runtime continuity until the seam held.',
        lesson: 'Return to the seam before branching.',
        cues: ['runtime continuity', 'return to seam'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-2'],
        updatedAt: Date.now(),
      },
    ])

    const rows = await db.searchMemoryConsolidations({
      query: 'how was our relationship around runtime repair',
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchProceduralExperience: false,
        queryHints: ['runtime repair', 'close without crowding'],
        rationale: 'Need the bond-era memory first.',
        confidence: 0.88,
      },
    })

    expect(rows[0]?.facet).toBe('relationship-era')
    expect(rows[0]?.lesson).toContain('Repair before closeness')
    expect(rows.some(row => row.facet === 'task-era')).toBe(true)
  })

  it('round-trips consolidation humanlike carry metadata through sqlite persistence', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertMemoryConsolidations([
      {
        id: 'autobio:self-era:humanlike-carry',
        kind: 'autobiographical',
        facet: 'self-era',
        periodKey: '2026-05-humanlike-carry',
        periodStartedAt: new Date('2026-05-29T09:00:00Z').getTime(),
        periodEndedAt: new Date('2026-05-30T10:00:00Z').getTime(),
        summary: 'The user corrected how an earlier result should be interpreted.',
        lesson: 'Prefer the corrected evidence over the earlier uncertain interpretation.',
        cues: ['user correction', 'verified evidence'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-humanlike-carry-1'],
        updatedAt: Date.now(),
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'respect-user-correction',
            recallCertainty: 'confirmed',
            emotionalResidueTags: ['relief', 'trust-repair'],
            metabolismSummary: 'The corrected evidence now supersedes the earlier uncertain reading.',
            autobiographicalDelta: 'The correction changed how this memory should be recalled.',
          },
        },
      },
    ])

    const rows = await db.listMemoryConsolidations(8)
    expect(rows[0]?.metadata).toEqual(expect.objectContaining({
      humanlikeCarry: expect.objectContaining({
        relationshipPrimaryIntent: 'respect-user-correction',
        recallCertainty: 'confirmed',
        emotionalResidueTags: ['relief', 'trust-repair'],
        metabolismSummary: 'The corrected evidence now supersedes the earlier uncertain reading.',
        autobiographicalDelta: 'The correction changed how this memory should be recalled.',
      }),
    }))
  })

  it('restores legacy archive rows into active memory facts so old recall stays searchable', async () => {
    const nowTs = Date.now()
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const snapshot: AlicizationMemoryLegacySnapshot = {
      facts: [],
      archive: [{
        id: 'archive-memory-1',
        subject: 'alice',
        predicate: 'procedure',
        object: 'Previously fixed the runtime seam by replaying the cli patch flow.',
        confidence: 0.74,
        source: 'async-llm',
        dedupeKey: 'alice|procedure|cli-patch-flow',
        createdAt: nowTs - 12 * testDayMs,
        updatedAt: nowTs - 12 * testDayMs,
        lastAccessAt: nowTs - 7 * testDayMs,
        accessCount: 2,
        archivedAt: nowTs - 2 * testDayMs,
        provenance: 'remembered',
      }],
      lastPrunedAt: null,
    }

    await db.importLegacyMemory(snapshot)

    const recalled = await db.retrieveMemoryFacts('cli patch flow', 5)
    const stats = await db.getMemoryStats()

    expect(recalled).toHaveLength(1)
    expect(recalled[0]?.object).toContain('cli patch flow')
    expect(stats.total).toBe(1)
    expect(stats.active).toBe(1)
    expect(stats.archived).toBe(0)
    expect(memoryArchive.size).toBe(0)

    await db.close()
  })

  it('treats runMemoryPrune as non-destructive salience refresh instead of deleting old facts', async () => {
    const nowTs = Date.now()
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const snapshot: AlicizationMemoryLegacySnapshot = {
      facts: [
        {
          id: 'memory-cold-1',
          subject: 'alice',
          predicate: 'remembers',
          object: 'An older shell repair happened around the runtime seam.',
          confidence: 0.22,
          source: 'async-llm',
          dedupeKey: 'alice|remembers|older-runtime-seam',
          createdAt: nowTs - 45 * testDayMs,
          updatedAt: nowTs - 45 * testDayMs,
          lastAccessAt: nowTs - 45 * testDayMs,
          accessCount: 0,
          provenance: 'remembered',
        },
        {
          id: 'memory-hot-1',
          subject: 'alice',
          predicate: 'remembers',
          object: 'The recent runtime seam patch is still familiar.',
          confidence: 0.86,
          source: 'async-llm',
          dedupeKey: 'alice|remembers|recent-runtime-seam',
          createdAt: nowTs - testDayMs,
          updatedAt: nowTs - testDayMs,
          lastAccessAt: nowTs - 12 * 60 * 60 * 1000,
          accessCount: 4,
          provenance: 'remembered',
        },
      ],
      archive: [],
      lastPrunedAt: null,
    }

    await db.importLegacyMemory(snapshot)

    const refreshed = await db.runMemoryPrune()

    expect(refreshed.total).toBe(2)
    expect(refreshed.active).toBe(2)
    expect(refreshed.archived).toBe(1)
    expect(refreshed.tierCounts).toEqual({
      hot: 1,
      warm: 0,
      cold: 1,
    })
    expect(refreshed.integrity?.status).toBe('ok')
    expect(memoryFacts.has('memory-cold-1')).toBe(true)
    expect(memoryFacts.size).toBe(2)

    await db.close()
  })

  it('keeps cold memories reachable under vague cues instead of letting age decay erase them', async () => {
    const nowTs = Date.now()
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.importLegacyMemory({
      facts: [
        {
          id: 'memory-cold-seam',
          subject: 'alice',
          predicate: 'remembers',
          object: 'old runtime seam repair rhythm',
          confidence: 0.82,
          source: 'async-llm',
          dedupeKey: 'alice|remembers|old-runtime-seam-repair-rhythm',
          createdAt: nowTs - 60 * testDayMs,
          updatedAt: nowTs - 60 * testDayMs,
          lastAccessAt: nowTs - 60 * testDayMs,
          accessCount: 0,
          provenance: 'remembered',
        },
      ],
      archive: [],
      lastPrunedAt: null,
    })

    const recalled = await db.retrieveMemoryFacts('same seam', 5)

    expect(recalled.some(item => item.id === 'memory-cold-seam')).toBe(true)

    await db.close()
  })

  it('reports tiered surface counts across facts, episodic memories, and consolidations', async () => {
    const nowTs = Date.now()
    const db = await setupAlicizationDb(await createSandboxUserDataPath())

    await db.importLegacyMemory({
      facts: [
        {
          id: 'memory-hot-runtime',
          subject: 'alice',
          predicate: 'remembers',
          object: 'The recent runtime seam patch is still familiar.',
          confidence: 0.86,
          source: 'async-llm',
          dedupeKey: 'alice|remembers|recent-runtime-seam',
          createdAt: nowTs - testDayMs,
          updatedAt: nowTs - testDayMs,
          lastAccessAt: nowTs - 6 * 60 * 60 * 1000,
          accessCount: 4,
          provenance: 'remembered',
        },
      ],
      archive: [],
      lastPrunedAt: null,
    })

    await db.appendEpisodicEvents([{
      cardId: 'default',
      sourceKind: 'execution-result',
      provenance: 'remembered',
      occurredAt: nowTs - 2 * 60 * 60 * 1000,
      threadAnchor: 'runtime seam',
      whatHappened: 'We kept returning to the same runtime seam until it held.',
      confidence: 0.84,
      salience: 0.82,
      sceneAttachment: 0.7,
      consolidationPriority: 0.8,
      lesson: 'Return to the seam before branching.',
      relationshipMeaning: 'Stay on the same seam before branching.',
      tags: ['runtime seam', 'repair rhythm'],
    }])

    const stats = await db.getMemoryStats()

    expect(stats.surfaceCounts).toEqual(expect.objectContaining({
      facts: 1,
      episodic: 1,
    }))
    expect((stats.surfaceCounts?.consolidations ?? 0)).toBeGreaterThan(0)
    expect(stats.surfaceTierCounts?.facts.hot).toBe(1)
    expect((stats.surfaceTierCounts?.episodic.hot ?? 0) + (stats.surfaceTierCounts?.episodic.warm ?? 0)).toBeGreaterThan(0)
    expect((stats.surfaceTierCounts?.consolidations.hot ?? 0) + (stats.surfaceTierCounts?.consolidations.warm ?? 0)).toBeGreaterThan(0)
    expect((stats.tierCounts?.hot ?? 0) + (stats.tierCounts?.warm ?? 0) + (stats.tierCounts?.cold ?? 0)).toBe(stats.total)

    await db.close()
  })

  it('drains pending memory ingest journal entries on startup so durable writes replay into active memory', async () => {
    const nowTs = Date.now()
    memoryIngestJournal.set('journal-fact-1', {
      id: 'journal-fact-1',
      operation_kind: 'upsert-memory-facts',
      payload_json: JSON.stringify({
        kind: 'upsert-memory-facts',
        facts: [{
          id: 'fact-from-journal',
          subject: 'alice',
          predicate: 'remembers',
          object: 'A durable ingest journal can replay this memory fact on startup.',
          confidence: 0.78,
          source: 'async-llm',
          dedupeKey: 'alice|remembers|durable-journal-replay',
          createdAt: nowTs - 1_000,
          updatedAt: nowTs - 1_000,
        }],
      }),
      status: 'pending',
      attempt_count: 0,
      last_error: null,
      created_at: nowTs - 500,
      updated_at: nowTs - 500,
      last_attempt_at: null,
      applied_at: null,
      next_attempt_at: nowTs - 500,
    })

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const recalled = await db.retrieveMemoryFacts('durable journal replay', 4)
    const stats = await db.getMemoryStats()

    expect(recalled[0]?.object).toContain('durable ingest journal')
    expect(memoryIngestJournal.get('journal-fact-1')?.status).toBe('applied')
    expect(stats.pendingSyncCount).toBe(0)

    await db.close()
  })

  it('keeps failed ingest journal entries visible in pendingSyncCount instead of silently losing them', async () => {
    const nowTs = Date.now()
    memoryIngestJournal.set('journal-invalid-1', {
      id: 'journal-invalid-1',
      operation_kind: 'upsert-memory-facts',
      payload_json: '{"kind":"upsert-memory-facts","facts":"invalid"}',
      status: 'pending',
      attempt_count: 0,
      last_error: null,
      created_at: nowTs - 500,
      updated_at: nowTs - 500,
      last_attempt_at: null,
      applied_at: null,
      next_attempt_at: nowTs - 500,
    })

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const stats = await db.getMemoryStats()

    expect(memoryIngestJournal.get('journal-invalid-1')?.status).toBe('failed')
    expect(memoryIngestJournal.get('journal-invalid-1')?.attempt_count).toBe(1)
    expect(memoryIngestJournal.get('journal-invalid-1')?.last_error).toContain('invalid memory ingest payload')
    expect(stats.pendingSyncCount).toBe(1)
    expect(stats.ingestHealth).toEqual(expect.objectContaining({
      status: 'degraded',
      pendingCount: 0,
      failedCount: 1,
      nextRetryAt: expect.any(Number),
      lastError: expect.stringContaining('invalid memory ingest payload'),
    }))

    await db.close()
  })

  it('cleans WorkingMemory long-term correction candidates before writing memory facts and reflections', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())

    await db.enqueueWorkingMemoryLongTermQueueItems({
      cardId: 'default',
      sessionId: 'session-1',
      items: [{
        id: 'queue-correction-1',
        source: 'working-memory-owner',
        memoryEvidence: explicitWorkingMemoryQueueEvidence(),
        kind: 'correction',
        summary: '不要固定模板回复，要数字生命自身人格。',
        reason: 'candidate:correction',
        sourceTurnIds: ['turn-1:user'],
        evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
        salience: 0.82,
        confidence: 0.78,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 2_000,
      }],
    })

    expect(await db.drainWorkingMemoryLongTermQueue(4)).toEqual(expect.objectContaining({
      cleaned: 1,
      admitted: 1,
      applied: 1,
      rejected: 0,
      review: 0,
      failed: 0,
    }))

    const facts = await db.listMemoryFacts()
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        subject: 'user',
        predicate: 'rejects_reply_behavior',
        object: '不要固定模板回复，要数字生命自身人格。',
        memoryDomain: 'relationship',
      }),
    ]))

    const reflections = await db.listMemoryReflections({ cardId: 'default', limit: 8 })
    expect(reflections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetScope: 'boundary',
        summary: '不要固定模板回复，要数字生命自身人格。',
        status: 'pending',
      }),
    ]))

    expect([...workingMemoryLongTermTransactions.values()]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        queue_item_id: 'queue-correction-1',
        status: 'applied',
      }),
    ]))

    await db.close()
  })

  it('drains only the requested WorkingMemory queue items within their card and session scope', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const queueItem = (
      id: string,
      summary: string,
      sourceTurnId: string,
      createdAt: number,
    ) => ({
      id,
      source: 'working-memory-owner' as const,
      memoryEvidence: explicitWorkingMemoryQueueEvidence(),
      kind: 'correction' as const,
      summary,
      reason: 'candidate:correction',
      sourceTurnIds: [sourceTurnId],
      evidenceSnippets: [summary],
      salience: 0.8,
      confidence: 0.86,
      sensitivity: 'personal' as const,
      allowTraining: false,
      status: 'pending-cleaning' as const,
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt,
    })

    await db.enqueueWorkingMemoryLongTermQueueItems({
      cardId: 'default',
      sessionId: 'session-older',
      items: [
        queueItem(
          'queue-older-session',
          '不要处理旧会话候选，它不属于当前 turn。',
          'turn-older:user',
          1_000,
        ),
      ],
    })
    await db.enqueueWorkingMemoryLongTermQueueItems({
      cardId: 'default',
      sessionId: 'session-current',
      items: [
        queueItem(
          'queue-current-session-unrequested',
          '不要顺带处理当前会话中未被本轮指定的候选。',
          'turn-current-older:user',
          1_500,
        ),
        queueItem(
          'queue-current-session',
          '不要遗漏当前会话候选，它应由本轮准确结算。',
          'turn-current:user',
          2_000,
        ),
      ],
    })

    const result = await db.drainWorkingMemoryLongTermQueueScoped({
      cardId: 'default',
      sessionId: 'session-current',
      queueItemIds: ['queue-current-session'],
    })

    expect(result).toMatchObject({
      cleaned: 1,
      applied: 1,
      failed: 0,
      pending: 0,
      settlements: [{
        queueItemId: 'queue-current-session',
        status: 'applied',
        errorSummary: null,
      }],
    })
    expect([...workingMemoryLongTermTransactions.values()]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        queue_item_id: 'queue-older-session',
        session_id: 'session-older',
        status: 'pending-cleaning',
      }),
      expect.objectContaining({
        queue_item_id: 'queue-current-session',
        session_id: 'session-current',
        status: 'applied',
      }),
      expect.objectContaining({
        queue_item_id: 'queue-current-session-unrequested',
        session_id: 'session-current',
        status: 'pending-cleaning',
      }),
    ]))

    await db.close()
  })

  it('settles a canonical WorkingMemory queue id from long candidate input without reporting missing', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const sourceTurnIds = Array.from(
      { length: 12 },
      (_, index) => `turn-long-source-${index}-${'s'.repeat(72)}`,
    )
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: `session-long-${'x'.repeat(220)}`,
      now: 3_000,
    })
    snapshot.recentRawTurns = sourceTurnIds.map((turnId, index) =>
      normalizeWorkingMemoryTurn({
        turnId,
        role: 'user',
        text: `不要遗漏这条长期候选证据 ${index}。`,
        createdAt: 2_000 + index,
        source: 'conversation-turn',
        visibility: 'user-visible',
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
        importance: 1,
      }),
    )
    snapshot.longTermCandidates = [{
      sourceTurnIds,
      kind: 'correction',
      summary: `不要截断长期候选的 canonical queue id，${'摘要'.repeat(100)}`,
      reason: 'candidate:correction',
      evidenceSnippets: ['Reviewed canonical queue identity evidence.'],
      salience: 0.9,
      sensitivity: 'personal',
      confidence: 0.9,
      allowTraining: false,
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: 'correction',
        summary: `不要截断长期候选的 canonical queue id，${'摘要'.repeat(100)}`,
        reason: 'candidate:correction',
        evidenceSnippets: ['Reviewed canonical queue identity evidence.'],
        salience: 0.9,
        sensitivity: 'personal',
        confidence: 0.9,
      },
    }]
    const queue = buildWorkingMemoryLongTermCandidateQueue(snapshot)
    const queueItem = queue[0]!

    expect(queueItem.id.length).toBeLessThan(240)
    await db.enqueueWorkingMemoryLongTermQueueItems({
      cardId: snapshot.cardId,
      sessionId: snapshot.sessionId,
      items: queue,
    })
    const result = await db.drainWorkingMemoryLongTermQueueScoped({
      cardId: snapshot.cardId,
      sessionId: snapshot.sessionId,
      queueItemIds: [queueItem.id],
    })

    expect(result.settlements).toEqual([
      expect.objectContaining({
        queueItemId: queueItem.id,
        transactionId: expect.any(String),
      }),
    ])
    expect(result.settlements[0]?.status).not.toBe('missing')
    expect([...workingMemoryLongTermTransactions.values()]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        queue_item_id: queueItem.id,
        session_id: snapshot.sessionId,
      }),
    ]))

    await db.close()
  })

  it('drains WorkingMemory long-term preference episode procedure and relationship candidates into durable stores', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())

    await db.enqueueWorkingMemoryLongTermQueueItems({
      cardId: 'default',
      sessionId: 'session-2',
      items: [
        {
          id: 'queue-preference-1',
          source: 'working-memory-owner',
          memoryEvidence: explicitWorkingMemoryQueueEvidence(),
          kind: 'preference',
          summary: '用户明确喜欢回复先说结论，再给必要细节。',
          reason: 'candidate:preference',
          sourceTurnIds: ['turn-pref:user'],
          evidenceSnippets: ['我喜欢你先说结论，再给必要细节。'],
          salience: 0.78,
          confidence: 0.82,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 2_100,
        },
        {
          id: 'queue-episode-1',
          source: 'working-memory-owner',
          memoryEvidence: explicitWorkingMemoryQueueEvidence(),
          kind: 'episode',
          summary: '上周我们一起玩过 Minecraft，用户说下次还想继续联机探索。',
          reason: 'Shared episode with time and activity anchor.',
          sourceTurnIds: ['turn-episode:user'],
          evidenceSnippets: ['上周我们一起玩过 Minecraft，下次继续联机。'],
          salience: 0.82,
          confidence: 0.84,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 2_200,
        },
        {
          id: 'queue-procedure-1',
          source: 'working-memory-owner',
          memoryEvidence: explicitWorkingMemoryQueueEvidence(),
          kind: 'procedure',
          summary: '用户认可长期记忆开发按红测、实现、验证的方式推进。',
          reason: 'candidate:procedure',
          sourceTurnIds: ['turn-procedure:user'],
          evidenceSnippets: ['以后长期记忆开发按红测、实现、验证这个流程推进。'],
          salience: 0.78,
          confidence: 0.82,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 2_300,
        },
        {
          id: 'queue-relationship-1',
          source: 'working-memory-owner',
          memoryEvidence: explicitWorkingMemoryQueueEvidence(),
          kind: 'relationship',
          summary: '用户希望出错或超时时直接说明问题，不要固定安抚模板。',
          reason: 'Relationship boundary for failure transparency.',
          sourceTurnIds: ['turn-relationship:user'],
          evidenceSnippets: ['如果出错或超时了就直接说明问题，不要固定安抚模板。'],
          salience: 0.86,
          confidence: 0.86,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 2_400,
        },
      ],
    })

    expect(await db.drainWorkingMemoryLongTermQueue(8)).toEqual(expect.objectContaining({
      cleaned: 4,
      admitted: 4,
      applied: 4,
      rejected: 0,
      review: 0,
      failed: 0,
    }))

    expect(await db.listMemoryFacts()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: 'prefers',
        object: '用户明确喜欢回复先说结论，再给必要细节。',
        memoryDomain: 'relationship',
      }),
      expect.objectContaining({
        predicate: 'prefers_procedure',
        object: '用户认可长期记忆开发按红测、实现、验证的方式推进。',
        memoryDomain: 'procedure',
      }),
    ]))
    expect(await db.listRecentEpisodicEvents(8)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'cleaned:queue-episode-1',
        whatHappened: '上周我们一起玩过 Minecraft，用户说下次还想继续联机探索。',
        threadAnchor: '共同经历',
      }),
    ]))
    expect(await db.listMemoryReflections({ cardId: 'default', limit: 8 })).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetScope: 'relationship',
        summary: '用户希望出错或超时时直接说明问题，不要固定安抚模板。',
      }),
    ]))
    expect(await db.listPersonaReinforcementEvents({ cardId: 'default', limit: 8 })).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dimension: 'truthful-grounding',
        valence: 'reinforce',
        summary: '用户希望出错或超时时直接说明问题，不要固定安抚模板。',
      }),
    ]))

    await db.close()
  })

  it('writes back long-term review decisions before durable projection', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())

    await db.enqueueWorkingMemoryLongTermQueueItems({
      cardId: 'default',
      sessionId: 'session-review',
      items: [{
        id: 'queue-private-preference',
        source: 'working-memory-owner',
        memoryEvidence: explicitWorkingMemoryQueueEvidence(),
        kind: 'preference',
        summary: '用户明确喜欢回复先说结论，再给必要细节。',
        reason: 'candidate:preference',
        sourceTurnIds: ['turn-private-pref:user'],
        evidenceSnippets: ['我喜欢你先说结论，再给必要细节。'],
        salience: 0.78,
        confidence: 0.82,
        sensitivity: 'private',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 2_500,
      }],
    })

    expect(await db.drainWorkingMemoryLongTermQueue(4)).toEqual(expect.objectContaining({
      review: 1,
      applied: 0,
    }))
    const reviewItems = await db.listLongTermMemoryReviewItems({ cardId: 'default', limit: 4 })
    expect(reviewItems).toEqual([expect.objectContaining({
      status: 'needs-user-review',
      visibleMode: 'inward-only',
      allowTraining: false,
    })])

    await expect(db.applyLongTermMemoryReviewDecision({
      cardId: 'default',
      reviewItemId: reviewItems[0]!.id,
      decision: 'approve',
    })).resolves.toEqual(expect.objectContaining({
      status: 'approved',
    }))
    expect(await db.drainWorkingMemoryLongTermQueue(4)).toEqual(expect.objectContaining({
      admitted: 1,
      applied: 1,
      review: 0,
    }))
    expect(await db.listMemoryFacts()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: 'prefers',
        object: '用户明确喜欢回复先说结论，再给必要细节。',
      }),
    ]))

    await db.close()
  })

  it('keeps needs-review relationship candidates out of recall and persona reinforcement until approval', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())

    await db.enqueueWorkingMemoryLongTermQueueItems({
      cardId: 'default',
      sessionId: 'session-review-relationship',
      items: [{
        id: 'queue-private-relationship',
        source: 'working-memory-owner',
        memoryEvidence: explicitWorkingMemoryQueueEvidence(),
        kind: 'relationship',
        summary: '用户希望某个私人关系边界只在内在记忆治理中使用。',
        reason: 'private relationship boundary',
        sourceTurnIds: ['turn-private-relationship:user'],
        evidenceSnippets: ['这个私人边界不要直接拿来对话复述。'],
        salience: 0.9,
        confidence: 0.88,
        sensitivity: 'private',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 2_600,
      }],
    })

    expect(await db.drainWorkingMemoryLongTermQueue(4)).toEqual(expect.objectContaining({
      review: 1,
      applied: 0,
    }))

    const beforeApproval = await db.retrieveLongTermMemoryEvidence({
      cardId: 'default',
      currentUserText: '你还记得那个私人关系边界吗？',
      limit: 8,
    })
    expect(beforeApproval.evidence.map(item => item.candidate.summary).join('\n')).not.toContain('私人关系边界')
    expect(await db.listPersonaReinforcementEvents({ cardId: 'default', limit: 8 })).toEqual([])

    const reviewItems = await db.listLongTermMemoryReviewItems({ cardId: 'default', limit: 4 })
    await expect(db.applyLongTermMemoryReviewDecision({
      cardId: 'default',
      reviewItemId: reviewItems[0]!.id,
      decision: 'approve',
    })).resolves.toEqual(expect.objectContaining({
      status: 'approved',
    }))

    expect(await db.drainWorkingMemoryLongTermQueue(4)).toEqual(expect.objectContaining({
      admitted: 1,
      applied: 1,
      review: 0,
    }))
    expect(await db.listMemoryReflections({ cardId: 'default', limit: 8 })).toEqual(expect.arrayContaining([
      expect.objectContaining({
        summary: '用户希望某个私人关系边界只在内在记忆治理中使用。',
      }),
    ]))
    expect(await db.listPersonaReinforcementEvents({ cardId: 'default', limit: 8 })).toEqual(expect.arrayContaining([
      expect.objectContaining({
        summary: '用户希望某个私人关系边界只在内在记忆治理中使用。',
      }),
    ]))

    await db.close()
  })

  it('retrieves unified long-term memory evidence across facts reflections and episodes', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'default',
      sqliteDriver: actualSqliteDriver,
    } as any)

    await db.upsertMemoryFacts([{
      subject: 'user',
      predicate: 'prefers_failure_reporting',
      object: '失败时明确说明原因',
      confidence: 0.82,
      memoryDomain: 'relationship',
      validationStatus: 'provisional',
      knowledgeStage: 'working-understanding',
    }], 'rule')
    await db.upsertMemoryReflections([{
      cardId: 'default',
      turnId: 'turn-1:user',
      sessionId: 'session-1',
      sourceKind: 'reply',
      targetScope: 'boundary',
      summary: '用户希望失败时明确说明原因',
      lesson: '将失败原因作为可回想的用户偏好',
      status: 'confirmed',
      confidence: 0.78,
    }])
    await db.appendEpisodicEvents([{
      id: 'episode-game-last-week',
      cardId: 'default',
      sessionId: 'session-game',
      sourceKind: 'reply',
      provenance: 'remembered',
      occurredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      threadAnchor: '一起打游戏',
      whatHappened: '上周一起玩过 Minecraft，用户说下次还想继续联机探索。',
      relationshipMeaning: '共同经历',
      confidence: 0.84,
      salience: 0.8,
      tags: ['游戏', 'Minecraft'],
    }])

    const gameBundle = await db.retrieveLongTermMemoryEvidence({
      cardId: 'default',
      userId: 'user-real',
      currentUserText: '我们去打游戏吧',
      workingMemoryQueryHints: ['游戏'],
      limit: 4,
    })
    expect(gameBundle.intent.mode).toBe('episodic')
    expect(gameBundle.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        candidate: expect.objectContaining({
          id: 'episode-game-last-week',
          source: 'episodic_events',
        }),
        scope: {
          userId: 'user-real',
          cardId: 'default',
        },
      }),
    ]))

    const correctionBundle = await db.retrieveLongTermMemoryEvidence({
      cardId: 'default',
      currentUserText: '以后失败时要明确说明原因',
      limit: 8,
    })
    expect(correctionBundle.intent.mode).toBe('preference')
    expect(correctionBundle.evidence.map(item => item.candidate.source)).toEqual(expect.arrayContaining([
      'memory_facts',
      'memory_reflections',
    ]))

    const naturalCorrectionBundle = await db.retrieveLongTermMemoryEvidence({
      cardId: 'default',
      currentUserText: '你还记得我说过以后失败时要明确说明原因吗？',
      limit: 8,
    })
    expect(naturalCorrectionBundle.intent.mode).toBe('preference')
    expect(naturalCorrectionBundle.evidence.map(item => item.candidate.source)).toEqual(expect.arrayContaining([
      'memory_facts',
      'memory_reflections',
    ]))

    await db.close()
  })

  it('filters tombstoned long-term memory sources from unified recall evidence', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'default',
      sqliteDriver: actualSqliteDriver,
    } as any)

    await db.upsertMemoryFacts([{
      subject: 'user',
      predicate: 'prefers_failure_reporting',
      object: '失败时明确说明原因',
      confidence: 0.82,
      memoryDomain: 'relationship',
      validationStatus: 'provisional',
      knowledgeStage: 'working-understanding',
    }], 'rule')
    const [fact] = await db.listMemoryFacts()
    expect(fact).toBeTruthy()

    const before = await db.retrieveLongTermMemoryEvidence({
      cardId: 'default',
      currentUserText: '你还记得我说过失败时要明确说明原因吗？',
      limit: 8,
    })
    expect(before.evidence.map(item => item.candidate.id)).toContain(fact!.id)

    await db.tombstoneLongTermMemorySources({
      sourceIds: [fact!.id],
      reason: 'user-deleted',
    })

    const after = await db.retrieveLongTermMemoryEvidence({
      cardId: 'default',
      currentUserText: '你还记得我说过失败时要明确说明原因吗？',
      limit: 8,
    })
    expect(after.evidence.map(item => item.candidate.id)).not.toContain(fact!.id)

    await db.close()
  })

  it('applies review action through workbench and blocks tombstoned recall sources', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())

    await db.enqueueWorkingMemoryLongTermQueueItems({
      cardId: 'default',
      sessionId: 'session-review',
      items: [{
        id: 'queue-private-boundary',
        source: 'working-memory-owner',
        memoryEvidence: explicitWorkingMemoryQueueEvidence(),
        kind: 'relationship',
        summary: '用户把某个私人边界设为只内在使用。',
        reason: 'private relationship boundary',
        salience: 0.95,
        sensitivity: 'private',
        confidence: 0.9,
        sourceTurnIds: ['turn-private'],
        evidenceSnippets: ['用户把某个私人边界设为只内在使用。'],
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
      }],
    })
    await db.drainWorkingMemoryLongTermQueue(4)

    const reviewItems = await db.listMemoryWorkbenchReviewItems({ cardId: 'default', limit: 10 })
    expect(reviewItems.length).toBeGreaterThan(0)

    const actionResult = await db.applyMemoryWorkbenchReviewAction({
      cardId: 'default',
      reviewItemId: reviewItems[0]!.id,
      decision: 'tombstone',
      reason: 'user-deleted',
    })

    expect(actionResult?.status).toBe('tombstoned')

    await db.close()
  })

  it('runs recall probe with query plan and ranked evidence', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([{
      id: 'episode-game-last-week',
      cardId: 'default',
      sessionId: 'session-game',
      sourceKind: 'reply',
      provenance: 'remembered',
      occurredAt: 100,
      threadAnchor: 'game',
      whatHappened: '上周我们一起玩了 Minecraft。',
      confidence: 0.9,
      salience: 0.92,
      tags: ['game', 'Minecraft'],
    }])

    const probe = await db.runMemoryWorkbenchRecallProbe({
      cardId: 'default',
      query: '我们去打游戏吧',
      limit: 5,
    })

    expect(probe.intent.shouldRecall).toBe(true)
    expect(probe.evidence.map(item => item.summary).join('\n')).toContain('Minecraft')
    expect(probe.latencyMs).toBeGreaterThanOrEqual(0)

    await db.close()
  })

  it('keeps older retrieval healthy while ingest is partially degraded and delayed reconstruction remains reachable', async () => {
    const nowTs = Date.now()
    memoryIngestJournal.set('journal-invalid-visible', {
      id: 'journal-invalid-visible',
      operation_kind: 'upsert-memory-facts',
      payload_json: '{"kind":"upsert-memory-facts","facts":"invalid"}',
      status: 'failed',
      attempt_count: 1,
      last_error: 'temporary write outage',
      created_at: nowTs - 10_000,
      updated_at: nowTs - 5_000,
      last_attempt_at: nowTs - 5_000,
      applied_at: null,
      next_attempt_at: nowTs + 60_000,
    })
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendEpisodicEvents([
      {
        id: 'episode-reconstructed-old',
        cardId: 'card-1',
        turnId: 'turn-reconstructed-old',
        sessionId: 'session-old',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: nowTs - 90 * testDayMs,
        whereSummary: 'old continuity lane',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'We kept returning to the runtime continuity seam until it held.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'The old line stabilized once we stopped branching early.',
        relationshipMeaning: 'Return before branching.',
        lesson: 'Return before branching on this same line.',
        sourceSummary: 'old continuity repair',
        confidence: 0.8,
        salience: 0.76,
        sceneAttachment: 0.44,
        consolidationPriority: 0.72,
        tags: ['runtime continuity', 'return before branching'],
      },
      {
        id: 'episode-reconstructed-conflict',
        cardId: 'card-1',
        turnId: 'turn-reconstructed-conflict',
        sessionId: 'session-old-2',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: nowTs - 89 * testDayMs,
        whereSummary: 'old continuity lane',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'The runtime continuity callback may have been mixed with another old seam.',
        felt: 'uncertain',
        emotionTags: ['repair'],
        whatChanged: 'Only the stable core of the line still feels safe.',
        relationshipMeaning: 'Keep the stable core and drop unsafe detail.',
        lesson: 'Answer this memory with uncertainty.',
        sourceSummary: 'old continuity conflict',
        confidence: 0.68,
        salience: 0.72,
        sceneAttachment: 0.38,
        consolidationPriority: 0.7,
        tags: ['runtime continuity', 'old seam'],
      },
    ])

    await db.searchEpisodicEvents({
      recallSeed: 'runtime continuity callback',
      threadAnchors: ['runtime continuity'],
      carryAsMemory: true,
      reconsolidationDecisionTraceId: 'mind:reconstruct:delayed',
      limit: 1,
    })

    const rows = await db.searchEpisodicEvents({
      recallSeed: '继续按以前那种 continuity 线的方式接回去',
      recollectionIntent: {
        mode: 'experience-pattern',
        temporalFocus: 'distant',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['runtime continuity', 'return before branching'],
        rationale: 'Delayed reconstructed continuity should still be reachable while ingest is degraded.',
        confidence: 0.8,
      },
      limit: 2,
    })
    const stats = await db.getMemoryStats()

    expect(rows.some(row => row.latestReconsolidation?.decisionTraceId === 'mind:reconstruct:delayed')).toBe(true)
    expect(stats.ingestHealth).toEqual(expect.objectContaining({
      status: 'degraded',
      failedCount: 1,
    }))
    expect(stats.writeHealth).toEqual(expect.objectContaining({
      backlogCount: 1,
      blocked: true,
      lastError: 'temporary write outage',
    }))
    expect(stats.retrievalHealth).toEqual(expect.objectContaining({
      graphLatencyMs: expect.any(Number),
      reconstructedCount: expect.any(Number),
    }))
    expect((stats.retrievalHealth?.reconstructionFrequency ?? 0)).toBeGreaterThan(0)

    await db.close()
  })

  it('does not immediately replay failed ingest entries before their backoff window expires', async () => {
    const nowTs = Date.now()
    memoryIngestJournal.set('journal-failed-future', {
      id: 'journal-failed-future',
      operation_kind: 'upsert-memory-facts',
      payload_json: JSON.stringify({
        kind: 'upsert-memory-facts',
        facts: [{
          id: 'fact-failed-future',
          subject: 'alice',
          predicate: 'remembers',
          object: 'A failed ingest should wait for backoff before retrying.',
          confidence: 0.6,
          source: 'async-llm',
          dedupeKey: 'alice|remembers|failed-backoff-fact',
          createdAt: nowTs - 10_000,
          updatedAt: nowTs - 10_000,
        }],
      }),
      status: 'failed',
      attempt_count: 2,
      last_error: 'temporary write outage',
      created_at: nowTs - 20_000,
      updated_at: nowTs - 15_000,
      last_attempt_at: nowTs - 5_000,
      applied_at: null,
      next_attempt_at: nowTs + 60_000,
    })

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const recalled = await db.retrieveMemoryFacts('failed backoff fact', 4)
    const stats = await db.getMemoryStats()

    expect(recalled).toEqual([])
    expect(memoryIngestJournal.get('journal-failed-future')?.status).toBe('failed')
    expect(memoryIngestJournal.get('journal-failed-future')?.attempt_count).toBe(2)
    expect(stats.pendingSyncCount).toBe(1)
    expect(stats.ingestHealth).toEqual(expect.objectContaining({
      status: 'degraded',
      failedCount: 1,
      nextRetryAt: nowTs + 60_000,
    }))

    await db.close()
  })

  it('tracks semantic retrieval latency and persists template leakage telemetry through memory stats override', async () => {
    const nowTs = Date.now()
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.importLegacyMemory({
      facts: [
        {
          id: 'memory-telemetry-fact-1',
          subject: 'alice',
          predicate: 'likes',
          object: 'oolong tea',
          confidence: 0.88,
          source: 'async-llm',
          dedupeKey: 'alice|likes|oolong tea',
          createdAt: nowTs - testDayMs,
          updatedAt: nowTs - testDayMs,
          lastAccessAt: nowTs - 2 * 60 * 60 * 1000,
          accessCount: 2,
          provenance: 'remembered',
        },
      ],
      archive: [],
      lastPrunedAt: null,
    })

    await db.retrieveMemoryFacts('oolong tea', 5)
    const beforeOverride = await db.getMemoryStats()
    expect(beforeOverride.retrievalHealth).toEqual(expect.objectContaining({
      semanticLatencyMs: expect.any(Number),
      templateLeakageFailCount: 0,
    }))

    await db.overrideMemoryStats({
      ...beforeOverride,
      retrievalHealth: {
        semanticLatencyMs: beforeOverride.retrievalHealth?.semanticLatencyMs ?? null,
        graphLatencyMs: beforeOverride.retrievalHealth?.graphLatencyMs ?? null,
        reconstructionFrequency: beforeOverride.retrievalHealth?.reconstructionFrequency ?? 0,
        reconstructedCount: beforeOverride.retrievalHealth?.reconstructedCount ?? 0,
        recallHitRate: beforeOverride.retrievalHealth?.recallHitRate ?? 0,
        recallMissRate: beforeOverride.retrievalHealth?.recallMissRate ?? 0,
        wrongThreadRate: beforeOverride.retrievalHealth?.wrongThreadRate ?? 0,
        reconstructionErrorRate: beforeOverride.retrievalHealth?.reconstructionErrorRate ?? 0,
        stableCoreOnlyRate: beforeOverride.retrievalHealth?.stableCoreOnlyRate ?? 0,
        memorySurfaceViolationRate: beforeOverride.retrievalHealth?.memorySurfaceViolationRate ?? 0,
        templateLeakageFailCount: 3,
      },
    })
    const afterOverride = await db.getMemoryStats()

    expect(afterOverride.retrievalHealth).toEqual(expect.objectContaining({
      semanticLatencyMs: expect.any(Number),
      templateLeakageFailCount: 3,
    }))

    await db.close()
  })

  it('runs legacy migration only once with marker', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const snapshot: AlicizationMemoryLegacySnapshot = {
      facts: [],
      archive: [],
      lastPrunedAt: null,
    }

    const first = await db.importLegacyMemory(snapshot)
    const second = await db.importLegacyMemory(snapshot)

    expect(first.migrated).toBe(true)
    expect(second.migrated).toBe(false)
    expect(metaState.has('legacy_memory_migrated_v1')).toBe(true)

    await db.close()
  })

  it('persists knowledge lifecycle fields through memory fact retrieval', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0
    memoryFacts.clear()

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertMemoryFacts([
      {
        subject: 'assistant',
        predicate: 'learned',
        object: 'return to the same runtime seam before branching',
        confidence: 0.83,
        memoryDomain: 'procedure',
        knowledgeStage: 'internalized-long-horizon-knowledge',
        validationStatus: 'validated',
        sourceLabel: 'host-confirmed runtime replay',
        conflictsWith: ['fact-old-runtime-shortcut'],
        supersedes: ['fact-old-runtime-shortcut'],
      },
    ], 'async-llm')

    const recalled = await db.retrieveMemoryFacts('runtime seam before branching', 5)

    expect(recalled[0]).toEqual(expect.objectContaining({
      memoryDomain: 'procedure',
      knowledgeStage: 'internalized-long-horizon-knowledge',
      validationStatus: 'validated',
      sourceLabel: 'host-confirmed runtime replay',
      conflictsWith: ['fact-old-runtime-shortcut'],
      supersedes: ['fact-old-runtime-shortcut'],
    }))

    await db.close()
  })

  it('applies memory fact corrections and persists validation/contradiction counters', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertMemoryFacts([
      {
        subject: 'assistant',
        predicate: 'procedure',
        object: 'report immediately',
        confidence: 0.78,
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
        validationCount: 1,
        contradictionCount: 0,
      },
    ], 'async-llm')

    const inserted = await db.retrieveMemoryFacts('report immediately', 5)
    await expect(db.applyMemoryFactCorrections([{
      targetFactId: inserted[0]!.id,
      nextValidationStatus: 'superseded',
      sourceLabel: 'superseded-by:new-procedure',
      appendConflictsWith: ['assistant|procedure|wait before reporting'],
    }])).resolves.toBeUndefined()

    await db.close()
  })

  it('skips conversation turn write when signal is already aborted', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const controller = new AbortController()
    controller.abort(new DOMException('Aborted for test', 'AbortError'))

    await expect(db.appendConversationTurn({
      turnId: 'chat:test:1',
      sessionId: 'session-1',
      userText: 'hello',
      assistantText: 'world',
    }, {
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' })

    expect(runCalls.some(sql => sql.includes('INSERT INTO conversation_turns'))).toBe(false)
    await db.close()
  })

  it('upserts a conversation turn by non-empty session and turn identity', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      sqliteDriver: actualSqliteDriver,
    })

    await db.appendConversationTurn({
      turnId: 'turn-idempotent-1',
      sessionId: 'session-idempotent-1',
      userText: 'first user text',
      assistantText: 'first assistant text',
      structured: {
        phase: 'first',
      },
      createdAt: 100,
    })
    await db.appendConversationTurn({
      turnId: 'turn-idempotent-1',
      sessionId: 'session-idempotent-1',
      userText: 'updated user text',
      assistantText: 'updated assistant text',
      structured: {
        phase: 'updated',
      },
      createdAt: 200,
    })

    const turns = await db.listConversationTurnsBySession('session-idempotent-1')

    expect(turns).toHaveLength(1)
    expect(turns[0]).toMatchObject({
      turnId: 'turn-idempotent-1',
      sessionId: 'session-idempotent-1',
      userText: 'updated user text',
      assistantText: 'updated assistant text',
      structuredJson: JSON.stringify({ phase: 'updated' }),
      createdAt: 200,
    })
    await db.close()
  })

  it('returns the latest limited conversation window in chronological order', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      sqliteDriver: actualSqliteDriver,
    })

    for (let index = 1; index <= 8; index += 1) {
      await db.appendConversationTurn({
        turnId: `turn-window-${index}`,
        sessionId: 'session-latest-window',
        userText: `user-${index}`,
        assistantText: `assistant-${index}`,
        createdAt: index * 100,
      })
    }

    const turns = await db.listConversationTurnsBySession(
      'session-latest-window',
      { limit: 3 },
    )

    expect(turns.map(turn => turn.turnId)).toEqual([
      'turn-window-6',
      'turn-window-7',
      'turn-window-8',
    ])
    await db.close()
  })

  it('keeps conversation history available by session for WorkingMemory hydration', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      sqliteDriver: actualSqliteDriver,
    })
    const rawUserText = 'RAW_DB_CROSS_SESSION_USER_SECRET'
    const rawAssistantText = 'RAW_DB_CROSS_SESSION_ASSISTANT_SECRET'

    await db.appendConversationTurn({
      turnId: 'turn-cross-session-source',
      sessionId: 'session-cross-session-source',
      userText: rawUserText,
      assistantText: rawAssistantText,
      createdAt: 100,
    })
    await db.appendConversationTurn({
      turnId: 'turn-current-session',
      sessionId: 'session-current',
      userText: 'current session text',
      assistantText: 'current session reply',
      createdAt: 200,
    })

    const visibleHistory = await db.listConversationTurnsBySession(
      'session-cross-session-source',
    )
    expect(visibleHistory).toEqual([
      expect.objectContaining({
        turnId: 'turn-cross-session-source',
        userText: rawUserText,
        assistantText: rawAssistantText,
      }),
    ])
    await db.close()
  })

  it('keeps anonymous conversation turns with an empty turn id as separate rows', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      sqliteDriver: actualSqliteDriver,
    })

    await db.appendConversationTurn({
      turnId: ' ',
      sessionId: 'session-anonymous-1',
      userText: 'first anonymous turn',
      assistantText: 'first response',
      createdAt: 100,
    })
    await db.appendConversationTurn({
      sessionId: 'session-anonymous-1',
      userText: 'second anonymous turn',
      assistantText: 'second response',
      createdAt: 200,
    })

    const turns = await db.listConversationTurnsBySession('session-anonymous-1')

    expect(turns).toHaveLength(2)
    expect(turns.map(turn => turn.userText)).toEqual([
      'first anonymous turn',
      'second anonymous turn',
    ])
    await db.close()
  })

  it('deduplicates historical conversation turns before creating the scoped unique index', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'cards', 'card-a')
    await mkdir(rootDir, { recursive: true })
    const dbPath = join(rootDir, 'alicization.db')
    const legacyDatabase = await openActualSqlite(dbPath)
    await runActualSqlite(legacyDatabase, `
      CREATE TABLE conversation_turns (
        id TEXT PRIMARY KEY,
        turn_id TEXT,
        session_id TEXT NOT NULL,
        user_text TEXT,
        assistant_text TEXT,
        structured_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    await runActualSqlite(legacyDatabase, `
      INSERT INTO conversation_turns (
        id, turn_id, session_id, user_text, assistant_text, structured_json, created_at
      ) VALUES
        ('conversation-old', 'turn-history-1', 'session-history-1', 'old user', 'old assistant', '{"version":"old"}', 100),
        ('conversation-new', 'turn-history-1', 'session-history-1', 'new user', 'new assistant', '{"version":"new"}', 200),
        ('conversation-anonymous-1', '', 'session-history-1', 'anonymous one', 'response one', NULL, 300),
        ('conversation-anonymous-2', NULL, 'session-history-1', 'anonymous two', 'response two', NULL, 400)
    `)
    await closeActualSqlite(legacyDatabase)

    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      sqliteDriver: actualSqliteDriver,
    } as any)
    await db.close()

    const migratedDatabase = await openActualSqlite(dbPath)
    const turns = await allActualSqlite<{
      id: string
      turn_id: string | null
      user_text: string | null
      created_at: number
    }>(
      migratedDatabase,
      `
      SELECT id, turn_id, user_text, created_at
      FROM conversation_turns
      WHERE session_id = ?
      ORDER BY created_at ASC
      `,
      ['session-history-1'],
    )
    const indexes = await allActualSqlite<{
      name: string
      unique: number
      partial: number
    }>(migratedDatabase, 'PRAGMA index_list(conversation_turns)')
    const indexSql = await allActualSqlite<{ sql: string | null }>(
      migratedDatabase,
      `
      SELECT sql
      FROM sqlite_master
      WHERE type = 'index' AND name = ?
      `,
      ['idx_conversation_turns_session_turn_id'],
    )
    await closeActualSqlite(migratedDatabase)

    expect(turns).toEqual([
      {
        id: 'conversation-new',
        turn_id: 'turn-history-1',
        user_text: 'new user',
        created_at: 200,
      },
      {
        id: 'conversation-anonymous-1',
        turn_id: '',
        user_text: 'anonymous one',
        created_at: 300,
      },
      {
        id: 'conversation-anonymous-2',
        turn_id: null,
        user_text: 'anonymous two',
        created_at: 400,
      },
    ])
    expect(indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'idx_conversation_turns_session_turn_id',
        unique: 1,
        partial: 1,
      }),
    ]))
    expect(indexSql[0]?.sql).toContain('TRIM(session_id) != \'\'')
    expect(indexSql[0]?.sql).toContain('TRIM(turn_id) != \'\'')
  })

  it('stores and queries replayable mind-turn events by decision trace', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendMindTurnEvents([
      {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          turnMode: 'guide-current-knot',
        },
        createdAt: 100,
      },
      {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: {
          format: 'mind-turn-v1',
        },
        createdAt: 120,
      },
    ])

    const rows = await db.listMindTurnEvents({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      limit: 10,
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]?.kind).toBe('governance-normalized')
    expect(rows[1]?.kind).toBe('persistence-written')
    expect(rows[0]?.decisionTraceId).toBe('mind:l9f3lq:feedfacecafe')
    await db.close()
  })

  it('filters replayable mind-turn events by active thread id', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendMindTurnEvents([
      {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          digitalLifeSpine: {
            runtime: {
              activeThreadId: 'thread-alpha',
            },
          },
        },
        createdAt: 100,
      },
      {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: {
          digitalLifeSpine: {
            runtime: {
              activeThreadId: 'thread-beta',
            },
          },
        },
        createdAt: 120,
      },
    ])

    const rows = await db.listMindTurnEvents({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      activeThreadId: 'thread-beta',
      limit: 10,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.kind).toBe('persistence-written')
    expect((rows[0]?.payload as Record<string, any>)?.digitalLifeSpine?.runtime?.activeThreadId).toBe('thread-beta')
    await db.close()
  })

  it('filters replayable mind-turn events by kind for durable learning ledger queries', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.appendMindTurnEvents([
      {
        decisionTraceId: 'mind:l9f3lq:trace-learning-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'system',
        kind: 'learning-executed',
        payload: {
          taskId: 'task-1',
        },
        createdAt: 100,
      },
      {
        decisionTraceId: 'mind:l9f3lq:trace-learning-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: {
          format: 'mind-turn-v1',
        },
        createdAt: 120,
      },
    ])

    const rows = await db.listMindTurnEvents({
      kind: 'learning-executed',
      limit: 10,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.kind).toBe('learning-executed')
    expect((rows[0]?.payload as Record<string, any>)?.taskId).toBe('task-1')
    await db.close()
  })

  it('stores task threads and execution events as a replayable execution ledger', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-claw-1',
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      turnId: 'turn-1',
      sessionId: 'session-1',
      origin: 'user-turn',
      goal: 'Trace the current runtime fault and decide which body should act.',
      kind: 'codebase-investigation',
      status: 'planned',
      proposedChannel: 'codex',
      summary: 'initial plan',
      createdAt: 100,
      updatedAt: 100,
    })

    const thread = await db.getTaskThread('thread-claw-1')

    await db.appendExecutionEvents([
      {
        threadId: 'thread-claw-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        channel: 'codex',
        kind: 'dispatch',
        threadStatus: 'running',
        payload: {
          adapter: 'codex',
        },
        createdAt: 150,
      },
      {
        threadId: 'thread-claw-1',
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        channel: 'codex',
        kind: 'result',
        threadStatus: 'completed',
        payload: {
          summary: 'finished',
        },
        createdAt: 210,
      },
    ])

    const threads = await db.listTaskThreads({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      status: ['planned', 'completed'],
      limit: 10,
    })
    const events = await db.listExecutionEvents({
      threadId: 'thread-claw-1',
      limit: 10,
    })

    expect(thread).toEqual(expect.objectContaining({
      id: 'thread-claw-1',
      status: 'planned',
      proposedChannel: 'codex',
    }))
    expect(threads).toHaveLength(1)
    expect(threads[0]).toEqual(expect.objectContaining({
      id: 'thread-claw-1',
      status: 'completed',
      proposedChannel: 'codex',
      lastEventAt: 210,
      completedAt: 210,
    }))
    expect(events.map(item => item.kind)).toEqual(['dispatch', 'result'])
    expect(events[1]?.threadStatus).toBe('completed')
    await db.close()
  })

  it('updates task-thread metadata when an optimistic upsert wins', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const created = await db.upsertTaskThread({
      id: 'thread-task-metadata-cas',
      goal: 'Persist task-thread diagnostics.',
      kind: 'codebase-investigation',
      status: 'cancelled',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      metadata: {
        execution: {
          persistence: {
            status: 'healthy',
          },
        },
      },
      createdAt: 100,
      updatedAt: 100,
    })

    const updated = await db.upsertTaskThread({
      id: created.id,
      goal: 'Persist task-thread diagnostics.',
      kind: 'codebase-investigation',
      status: 'cancelled',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      metadata: {
        execution: {
          persistence: {
            status: 'degraded',
            failures: ['queued cancellation event persistence failed'],
          },
        },
      },
      createdAt: 100,
      updatedAt: 200,
      expectedUpdatedAt: created.updatedAt,
    })

    expect(updated.metadata).toEqual({
      execution: {
        persistence: {
          status: 'degraded',
          failures: ['queued cancellation event persistence failed'],
        },
      },
    })
    await expect(db.getTaskThread(created.id)).resolves.toEqual(expect.objectContaining({
      metadata: {
        execution: {
          persistence: {
            status: 'degraded',
            failures: ['queued cancellation event persistence failed'],
          },
        },
      },
    }))
    await db.close()
  })

  it('persists task-thread metadata updates with the actual sqlite driver', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations', 'cards', 'card-a')
    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      sqliteDriver: actualSqliteDriver,
    })
    const created = await db.upsertTaskThread({
      id: 'thread-task-metadata-real-sqlite',
      goal: 'Persist task-thread diagnostics in SQLite.',
      kind: 'codebase-investigation',
      status: 'cancelled',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      metadata: {
        execution: {
          persistence: {
            status: 'healthy',
          },
        },
      },
      createdAt: 100,
      updatedAt: 100,
    })

    const updated = await db.upsertTaskThread({
      id: created.id,
      goal: 'Persist task-thread diagnostics in SQLite.',
      kind: 'codebase-investigation',
      status: 'cancelled',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      metadata: {
        execution: {
          persistence: {
            status: 'degraded',
            failures: ['event persistence failed'],
          },
        },
      },
      createdAt: 100,
      updatedAt: 200,
      expectedUpdatedAt: created.updatedAt,
    })

    await db.upsertTaskThread({
      id: created.id,
      goal: 'Persist task-thread diagnostics in SQLite.',
      kind: 'codebase-investigation',
      status: 'cancelled',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      createdAt: 100,
      updatedAt: 300,
      expectedUpdatedAt: updated.updatedAt,
    })

    await expect(db.getTaskThread(created.id)).resolves.toEqual(expect.objectContaining({
      metadata: {
        execution: {
          persistence: {
            status: 'degraded',
            failures: ['event persistence failed'],
          },
        },
      },
    }))
    await db.close()
  })

  it('rejects a stale task-thread upsert without regressing a newer terminal projection', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-task-cas',
      goal: 'Preserve the newest task-thread owner.',
      kind: 'codebase-investigation',
      status: 'running',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      createdAt: 100,
      updatedAt: 100,
    })

    await db.appendExecutionEvents([{
      id: 'thread-task-cas:completed',
      threadId: 'thread-task-cas',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'completed',
      payload: {
        summary: 'completed by the current owner',
      },
      createdAt: 200,
    }])

    await expect(db.upsertTaskThread({
      id: 'thread-task-cas',
      goal: 'Preserve the newest task-thread owner.',
      kind: 'codebase-investigation',
      status: 'failed',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      createdAt: 100,
      updatedAt: 300,
      expectedUpdatedAt: 100,
      summary: 'stale dispatcher result',
      completedAt: 300,
    })).rejects.toMatchObject({
      code: 'TASK_THREAD_VERSION_CONFLICT',
    })

    const thread = await db.getTaskThread('thread-task-cas')
    expect(thread).toEqual(expect.objectContaining({
      status: 'completed',
      updatedAt: 200,
      completedAt: 200,
      summary: null,
    }))
    await db.close()
  })

  it('atomically creates explicit task threads and rejects same-millisecond stale owners', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const base = {
      id: 'thread-task-atomic-create',
      goal: 'Allow only one planner to own this explicit thread id.',
      kind: 'codebase-investigation' as const,
      status: 'running' as const,
      selectedChannel: 'codex' as const,
      proposedChannel: 'codex' as const,
      createdAt: 100,
      updatedAt: 100,
    }

    const created = await db.upsertTaskThread({
      ...base,
      createOnly: true,
    })
    expect(created.updatedAt).toBe(100)

    await expect(db.upsertTaskThread({
      ...base,
      status: 'completed',
      updatedAt: 100,
      createOnly: true,
    })).rejects.toMatchObject({
      code: 'TASK_THREAD_ALREADY_EXISTS',
    })

    const sameRevisionWrites = await Promise.allSettled([
      db.upsertTaskThread({
        ...base,
        status: 'completed',
        updatedAt: 100,
        expectedUpdatedAt: 100,
        summary: 'first terminal owner',
      }),
      db.upsertTaskThread({
        ...base,
        status: 'failed',
        updatedAt: 100,
        expectedUpdatedAt: 100,
        summary: 'second terminal owner',
      }),
    ])
    expect(sameRevisionWrites.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(sameRevisionWrites.filter(result => result.status === 'rejected')).toHaveLength(1)

    const persisted = await db.getTaskThread(base.id)
    expect(persisted?.updatedAt).toBe(101)
    expect(['completed', 'failed']).toContain(persisted?.status)

    await expect(db.upsertTaskThread({
      ...base,
      id: 'thread-task-cas-missing',
      expectedUpdatedAt: 100,
      updatedAt: 101,
    })).rejects.toMatchObject({
      code: 'TASK_THREAD_VERSION_CONFLICT',
    })
    expect(await db.getTaskThread('thread-task-cas-missing')).toBeUndefined()
    await db.close()
  })

  it('uses caller-provided execution event ids to make live progress replay idempotent', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-codex-live-idempotent',
      goal: 'Persist one Codex progress event once.',
      kind: 'codebase-investigation',
      status: 'running',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      createdAt: 100,
      updatedAt: 100,
    })
    const event = {
      id: 'thread-codex-live-idempotent:codex:run-1:1',
      threadId: 'thread-codex-live-idempotent',
      channel: 'codex' as const,
      kind: 'step' as const,
      threadStatus: 'running' as const,
      payload: {
        codexEventType: 'item.started',
        semanticProgress: true,
      },
      createdAt: 120,
    }

    await db.appendExecutionEvents([event])
    await db.appendExecutionEvents([event])

    const events = await db.listExecutionEvents({
      threadId: 'thread-codex-live-idempotent',
      limit: 10,
    })
    expect(events).toHaveLength(1)
    expect(events[0]?.id).toBe(event.id)
    expect(runCalls.some(sql => sql.includes('INSERT OR IGNORE INTO executor_events'))).toBe(true)
    await db.close()
  })

  it('does not project a duplicate execution event id with conflicting replay state', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-duplicate-projection-fence',
      goal: 'Keep duplicate execution evidence idempotent.',
      kind: 'codebase-investigation',
      status: 'running',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      createdAt: 100,
      updatedAt: 100,
    })

    await db.appendExecutionEvents([{
      id: 'thread-duplicate-projection-fence:event-1',
      threadId: 'thread-duplicate-projection-fence',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      createdAt: 200,
    }])
    await db.appendExecutionEvents([{
      id: 'thread-duplicate-projection-fence:event-1',
      threadId: 'thread-duplicate-projection-fence',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'paused',
      createdAt: 300,
    }])

    const thread = await db.getTaskThread('thread-duplicate-projection-fence')
    const events = await db.listExecutionEvents({
      threadId: 'thread-duplicate-projection-fence',
      limit: 10,
    })

    expect(thread).toEqual(expect.objectContaining({
      status: 'running',
      lastEventAt: 200,
      updatedAt: 200,
    }))
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual(expect.objectContaining({
      id: 'thread-duplicate-projection-fence:event-1',
      threadStatus: 'running',
      createdAt: 200,
    }))
    await db.close()
  })

  it('does not let a late non-terminal event reopen a terminal task thread', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-terminal-fence',
      goal: 'Keep a terminal task thread closed when late progress arrives.',
      kind: 'codebase-investigation',
      status: 'running',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      createdAt: 100,
      updatedAt: 100,
    })

    await db.appendExecutionEvents([{
      id: 'thread-terminal-fence:result',
      threadId: 'thread-terminal-fence',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'completed',
      payload: {
        summary: 'finished',
      },
      createdAt: 200,
    }])

    await db.appendExecutionEvents([{
      id: 'thread-terminal-fence:late-running',
      threadId: 'thread-terminal-fence',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        lateAfterTerminal: true,
      },
      createdAt: 300,
    }])

    const thread = await db.getTaskThread('thread-terminal-fence')
    const events = await db.listExecutionEvents({
      threadId: 'thread-terminal-fence',
      limit: 10,
    })

    expect(thread).toEqual(expect.objectContaining({
      status: 'completed',
      lastEventAt: 200,
      completedAt: 200,
    }))
    expect(events.map(item => item.id)).toEqual([
      'thread-terminal-fence:result',
      'thread-terminal-fence:late-running',
    ])
    await db.close()
  })

  it('keeps stale non-terminal events as evidence without regressing the task-thread projection', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-stale-progress-fence',
      goal: 'Keep the newest non-terminal execution projection.',
      kind: 'codebase-investigation',
      status: 'running',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      createdAt: 100,
      updatedAt: 100,
    })

    await db.appendExecutionEvents([{
      id: 'thread-stale-progress-fence:newer',
      threadId: 'thread-stale-progress-fence',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        summary: 'newer progress',
      },
      createdAt: 300,
    }])
    await db.appendExecutionEvents([{
      id: 'thread-stale-progress-fence:older',
      threadId: 'thread-stale-progress-fence',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'paused',
      payload: {
        summary: 'stale progress',
      },
      createdAt: 200,
    }])

    const thread = await db.getTaskThread('thread-stale-progress-fence')
    const events = await db.listExecutionEvents({
      threadId: 'thread-stale-progress-fence',
      limit: 10,
    })

    expect(thread).toEqual(expect.objectContaining({
      status: 'running',
      lastEventAt: 300,
      updatedAt: 300,
    }))
    expect(events.map(item => item.id)).toEqual([
      'thread-stale-progress-fence:older',
      'thread-stale-progress-fence:newer',
    ])
    await db.close()
  })

  it('lets a terminal event settle a running thread even when its adapter timestamp is older', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-terminal-precedence',
      goal: 'Settle execution from terminal evidence.',
      kind: 'codebase-investigation',
      status: 'running',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      createdAt: 100,
      updatedAt: 100,
    })
    await db.appendExecutionEvents([{
      id: 'thread-terminal-precedence:progress',
      threadId: 'thread-terminal-precedence',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      createdAt: 300,
    }])
    await db.appendExecutionEvents([{
      id: 'thread-terminal-precedence:result',
      threadId: 'thread-terminal-precedence',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'completed',
      createdAt: 200,
    }])

    const thread = await db.getTaskThread('thread-terminal-precedence')
    expect(thread).toEqual(expect.objectContaining({
      status: 'completed',
      lastEventAt: 300,
      updatedAt: 300,
      completedAt: 200,
    }))
    await db.close()
  })

  it('canonicalizes proactive execution origins when persisting task threads and execution events', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-claw-proactive-1',
      decisionTraceId: 'mind:proactive:feedfacecafe',
      turnId: 'turn-proactive-1',
      sessionId: 'session-proactive-1',
      origin: ' SubConscious-Proactive ' as any,
      goal: 'Keep the same proactive execution line alive.',
      kind: 'codebase-investigation',
      status: 'planned',
      proposedChannel: 'codex',
      summary: 'initial proactive plan',
      createdAt: 100,
      updatedAt: 100,
    })

    await db.appendExecutionEvents([
      {
        threadId: 'thread-claw-proactive-1',
        decisionTraceId: 'mind:proactive:feedfacecafe',
        turnId: 'turn-proactive-1',
        sessionId: 'session-proactive-1',
        origin: ' SubConscious-Proactive ' as any,
        channel: 'codex',
        kind: 'dispatch',
        threadStatus: 'running',
        payload: {
          adapter: 'codex',
        },
        createdAt: 150,
      },
    ])

    const thread = await db.getTaskThread('thread-claw-proactive-1')
    const events = await db.listExecutionEvents({
      threadId: 'thread-claw-proactive-1',
      limit: 10,
    })

    expect(thread).toEqual(expect.objectContaining({
      id: 'thread-claw-proactive-1',
      origin: 'subconscious-proactive',
    }))
    expect(events).toEqual([
      expect.objectContaining({
        threadId: 'thread-claw-proactive-1',
        origin: 'subconscious-proactive',
        kind: 'dispatch',
      }),
    ])
    await db.close()
  })

  it('canonicalizes origin-lost autonomous execution ownership when persisting task threads and execution events', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertTaskThread({
      id: 'thread-claw-proactive-originless-1',
      decisionTraceId: 'mind:proactive:originless:feedfacecafe',
      turnId: 'subconscious:turn-proactive-originless-1',
      sessionId: 'session-proactive-originless-1',
      goal: 'Keep the same proactive execution line alive even when origin thins out.',
      kind: 'codebase-investigation',
      status: 'planned',
      proposedChannel: 'codex',
      summary: 'initial proactive originless plan',
      createdAt: 100,
      updatedAt: 100,
    } as any)

    await db.appendExecutionEvents([
      {
        threadId: 'thread-claw-proactive-originless-1',
        decisionTraceId: 'mind:proactive:originless:feedfacecafe',
        turnId: 'subconscious:turn-proactive-originless-1',
        sessionId: 'session-proactive-originless-1',
        channel: 'codex',
        kind: 'dispatch',
        threadStatus: 'running',
        payload: {
          adapter: 'codex',
        },
        createdAt: 150,
      },
    ] as any)

    const thread = await db.getTaskThread('thread-claw-proactive-originless-1')
    const events = await db.listExecutionEvents({
      threadId: 'thread-claw-proactive-originless-1',
      limit: 10,
    })

    expect(thread).toEqual(expect.objectContaining({
      id: 'thread-claw-proactive-originless-1',
      turnId: 'subconscious:turn-proactive-originless-1',
      origin: 'subconscious-proactive',
    }))
    expect(events).toEqual([
      expect.objectContaining({
        threadId: 'thread-claw-proactive-originless-1',
        turnId: 'subconscious:turn-proactive-originless-1',
        origin: 'subconscious-proactive',
        kind: 'dispatch',
      }),
    ])
    await db.close()
  })

  it('upserts and lists executor sessions with affinity continuity', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0
    executorSessions.clear()

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertExecutorSession({
      channel: 'codex',
      affinityKey: 'session-1',
      status: 'running',
      summary: 'Codex dispatch is running.',
      metadata: {
        source: 'test',
      },
      updatedAt: 120,
      lastUsedAt: 120,
    })
    await db.upsertExecutorSession({
      channel: 'codex',
      affinityKey: 'session-1',
      status: 'active',
      summary: 'Codex dispatch completed.',
      updatedAt: 180,
      lastUsedAt: 180,
    })

    const rows = await db.listExecutorSessions({
      channel: 'codex',
      status: ['active', 'running'],
      limit: 10,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual(expect.objectContaining({
      channel: 'codex',
      affinityKey: 'session-1',
      status: 'active',
      summary: 'Codex dispatch completed.',
      lastUsedAt: 180,
    }))
    await db.close()
  })

  it('upserts and lists channel capability manifests with continuity', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0
    capabilityManifests.clear()

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.upsertChannelCapabilityManifest({
      channel: 'codex',
      available: true,
      enabled: true,
      ready: false,
      sessionAffinity: true,
      reason: 'codex-cli-missing',
      metadata: {
        source: 'boot-probe',
      },
      updatedAt: 100,
      lastCheckedAt: 100,
    })
    await db.upsertChannelCapabilityManifest({
      channel: 'codex',
      available: true,
      enabled: true,
      ready: true,
      sessionAffinity: true,
      reason: null,
      updatedAt: 180,
      lastCheckedAt: 180,
    })

    const rows = await db.listChannelCapabilityManifests({
      channel: ['codex', 'cli'],
      available: true,
      enabled: true,
      limit: 20,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual(expect.objectContaining({
      channel: 'codex',
      available: true,
      enabled: true,
      ready: true,
      sessionAffinity: true,
      reason: null,
      lastCheckedAt: 180,
    }))
    await db.close()
  })

  it('claims due scheduled tasks once and supports complete/fail transitions', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const nowMs = Date.now()
    await db.insertScheduledTask({
      taskId: 'task-due-1',
      triggerAt: nowMs - 60_000,
      message: '喝水',
    })
    await db.insertScheduledTask({
      taskId: 'task-future-1',
      triggerAt: nowMs + 60_000,
      message: '站起来活动',
    })

    const firstClaim = await db.claimDueScheduledTasks(nowMs, 10)
    const secondClaim = await db.claimDueScheduledTasks(nowMs, 10)

    expect(firstClaim).toHaveLength(1)
    expect(firstClaim[0]?.taskId).toBe('task-due-1')
    expect(secondClaim).toHaveLength(0)

    await db.completeScheduledTask('task-due-1', 'turn-reminder-1')
    await db.failScheduledTask('task-future-1', 'manual-fail')

    expect(scheduledTasks.get('task-due-1')?.status).toBe('completed')
    expect(scheduledTasks.get('task-future-1')?.status).toBe('failed')
    await db.close()
  })

  it('requeues claimed reminder task back to pending', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const nowMs = Date.now()
    await db.insertScheduledTask({
      taskId: 'task-requeue-1',
      triggerAt: nowMs - 30_000,
      message: '测试重排队',
    })
    const claimed = await db.claimDueScheduledTasks(nowMs, 10)
    expect(claimed).toHaveLength(1)

    await db.requeueScheduledTask('task-requeue-1', 'turn-write-skipped')

    const pending = await db.listPendingScheduledTasks(10)
    expect(pending.map(item => item.taskId)).toContain('task-requeue-1')
    expect(scheduledTasks.get('task-requeue-1')?.status).toBe('pending')
    await db.close()
  })

  it('runs learning task lifecycle and projects latest execution state', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    learningTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const nowMs = Date.now()
    await db.insertLearningTask({
      cardId: 'default',
      taskId: 'learning-task-1',
      triggerAt: nowMs - 1_000,
      action: 'verify',
      message: 'learning-action=verify',
      payload: {
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        sourceSessionId: 'session-1',
        action: 'verify',
        reason: 'verify contradiction',
        focuses: ['resolve-contradictions'],
        dominantTrajectory: 'Need to verify',
        sourceSignals: ['Need to verify'],
        learningReadiness: 0.7,
        contradictionPressure: 0.6,
        revisionPressure: 0.4,
        autobiographicalStability: 0.8,
        supportingFactIds: ['fact-1'],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: ['fact-1'],
      },
    })

    const claimed = await db.claimDueLearningTasks('default', nowMs, 10)
    expect(claimed).toHaveLength(1)
    expect(claimed[0]?.status).toBe('claimed')
    expect(claimed[0]?.payload).not.toHaveProperty('runtimeContinuity')

    await db.startLearningTask('learning-task-1', nowMs)
    await db.completeLearningTask('learning-task-1', {
      firedTurnId: 'learning-fired-turn',
      resultSummary: 'verification finished',
    }, nowMs + 1_000)

    expect(learningTasks.get('learning-task-1')?.status).toBe('completed')

    const state = await db.getLatestLearningExecutionState('default')
    expect(state).toEqual(expect.objectContaining({
      currentTaskId: 'learning-task-1',
      currentStatus: 'completed',
      nextLearningAction: 'verify',
      shouldVerify: true,
      lastCompletedTaskId: 'learning-task-1',
      lastCompletedSummary: 'verification finished',
    }))
    await db.close()
  })

  it('skips learning task insert when the turn write signal is aborted', async () => {
    runCalls.length = 0
    metaState.clear()
    learningTasks.clear()

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const controller = new AbortController()
    controller.abort(new DOMException('Turn was suspended', 'AbortError'))

    await expect(db.insertLearningTask({
      cardId: 'default',
      taskId: 'learning:default:internalize:aborted-turn',
      triggerAt: 1_000,
      action: 'internalize',
      message: 'learning-action=internalize',
      payload: {
        sourceTurnId: 'turn-aborted-learning-write',
        decisionTraceId: 'trace-aborted-learning-write',
        sourceSessionId: 'session-aborted-learning-write',
        action: 'internalize',
        reason: 'validated learning',
        focuses: ['validated-learning'],
        dominantTrajectory: 'Validated learning',
        sourceSignals: ['validated-outcome'],
        learningReadiness: 0.8,
        contradictionPressure: 0.1,
        revisionPressure: 0.1,
        autobiographicalStability: 0.9,
        supportingFactIds: [],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: [],
      },
    }, {
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' })

    expect(learningTasks.has('learning:default:internalize:aborted-turn')).toBe(false)
    expect(runCalls.some(sql => sql.includes('INSERT INTO learning_tasks'))).toBe(false)
    await db.close()
  })

  it('returns the existing learning task when the same replay identity is inserted twice', async () => {
    runCalls.length = 0
    metaState.clear()
    learningTasks.clear()

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const input = {
      cardId: 'default',
      taskId: 'learning:default:internalize:stable-replay',
      triggerAt: 1_000,
      action: 'internalize' as const,
      message: 'learning-action=internalize',
      payload: {
        sourceTurnId: 'turn-stable-replay',
        decisionTraceId: 'trace-stable-replay',
        sourceSessionId: 'session-stable-replay',
        action: 'internalize' as const,
        reason: 'stable replay',
        focuses: ['stable-replay'],
        dominantTrajectory: 'Stable replay',
        sourceSignals: ['Stable replay'],
        learningReadiness: 0.8,
        contradictionPressure: 0.1,
        revisionPressure: 0.2,
        autobiographicalStability: 0.9,
        supportingFactIds: [],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: [],
      },
    }

    const first = await db.insertLearningTask(input)
    const replay = await db.insertLearningTask({
      ...input,
      triggerAt: 9_000,
    })

    expect(replay.id).toBe(first.id)
    expect(replay.triggerAt).toBe(first.triggerAt)
    expect(learningTasks.size).toBe(1)
    await db.close()
  })
})
