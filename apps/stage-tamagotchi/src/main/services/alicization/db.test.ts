import type { AlicizationMemoryLegacySnapshot } from '../../../shared/eventa'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

const runCalls: string[] = []
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
const memoryConsolidations = new Map<string, {
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
const memoryFacts = new Map<string, {
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
}>()
const memoryArchive = new Map<string, {
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
  archived_at: number
}>()
const testDayMs = 24 * 60 * 60 * 1000
const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-db-test-'))
  sandboxDirs.push(dir)
  return dir
}

function upsertMemoryFactRow(row: {
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
}) {
  const existing = [...memoryFacts.values()].find(item => item.dedupe_key === row.dedupe_key)
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
      const [id, subject, predicate, object, confidence, source, dedupeKey, createdAt, updatedAt, lastAccessAt, accessCount]
        = actualParams as [string, string, string, string, number, string, string, number, number, number | null, number]
      upsertMemoryFactRow({
        id,
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
      })
    }
    else if (sql.includes('UPDATE memory_facts')) {
      const [accessCount, lastAccessAt, id] = actualParams as [number, number | null, string]
      const fact = memoryFacts.get(id)
      if (!fact) {
        changes = 0
      }
      else {
        fact.access_count = accessCount
        fact.last_access_at = lastAccessAt ?? null
      }
    }
    else if (sql.includes('INSERT INTO memory_archive')) {
      const [id, originalId, subject, predicate, object, confidence, source, dedupeKey, createdAt, updatedAt, lastAccessAt, accessCount, archivedAt]
        = actualParams as [string, string | null, string, string, string, number, string, string, number, number, number | null, number, number]
      memoryArchive.set(id, {
        id,
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
        archived_at: archivedAt,
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
        updated_at: updatedAt,
        last_event_at: lastEventAt ?? null,
        completed_at: completedAt ?? existing?.completed_at ?? null,
      })
    }

    if (sql.includes('INSERT INTO executor_events')) {
      const [id, threadId, decisionTraceId, turnId, sessionId, origin, channel, kind, threadStatus, payloadJson, createdAt]
        = actualParams as [string, string, string | null, string | null, string | null, 'user-turn' | 'subconscious-proactive' | 'system', string | null, string, string | null, string | null, number]
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
    else if (sql.includes('UPDATE episodic_events')) {
      const [confidence, emotionTagsJson, relationshipMeaning, lesson, updatedAt, lastRecalledAt, recallCount, reconsolidationCount, latestReconsolidationJson, id]
        = actualParams as [number, string | null, string | null, string | null, number, number | null, number, number, string | null, string]
      const event = episodicEvents.get(id)
      if (!event) {
        changes = 0
      }
      else {
        event.confidence = confidence
        event.emotion_tags_json = emotionTagsJson ?? null
        event.relationship_meaning = relationshipMeaning ?? null
        event.lesson = lesson ?? null
        event.updated_at = updatedAt
        event.last_recalled_at = lastRecalledAt ?? null
        event.recall_count = recallCount
        event.reconsolidation_count = reconsolidationCount
        event.latest_reconsolidation_json = latestReconsolidationJson ?? null
      }
    }

    if (sql.includes('INSERT INTO memory_consolidations')) {
      const [id, kind, facet, periodKey, periodStartedAt, periodEndedAt, summary, lesson, cuesJson, confidence, dominantProvenance, derivedEventIdsJson, updatedAt]
        = actualParams as [string, 'daily' | 'weekly' | 'procedural' | 'autobiographical', 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null, string, number, number, string, string | null, string | null, number, string, string | null, number]
      memoryConsolidations.set(id, {
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
    else if (sql.includes('DELETE FROM memory_archive')) {
      if (sql.includes('archived_at < ?')) {
        const [retentionLimit] = actualParams as [number]
        for (const [id, item] of memoryArchive.entries()) {
          if (item.archived_at < retentionLimit)
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
    else if (sql.includes('DELETE FROM memory_consolidations')) {
      memoryConsolidations.clear()
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
      const [updatedAt, lastEventAt, status, completedAt, id] = actualParams as [number, number, string | null, number | null, string]
      const thread = taskThreads.get(id)
      if (!thread) {
        changes = 0
      }
      else {
        thread.updated_at = updatedAt
        thread.last_event_at = lastEventAt
        if (status)
          thread.status = status
        if (typeof completedAt === 'number' && Number.isFinite(completedAt))
          thread.completed_at = completedAt
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

    if (sql.includes('COUNT(1) AS total FROM memory_facts')) {
      actualCallback?.(null, { total: memoryFacts.size })
      return this
    }

    if (sql.includes('COUNT(1) AS total FROM memory_archive')) {
      actualCallback?.(null, { total: memoryArchive.size })
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

    actualCallback?.(null, undefined)
    return this
  }

  all(_sql: string, _params: unknown[] | ((error: Error | null, rows?: unknown[]) => void), callback?: (error: Error | null, rows?: unknown[]) => void) {
    const actualParams = Array.isArray(_params) ? _params : []
    const actualCallback = (typeof _params === 'function' ? _params : callback) as ((error: Error | null, rows?: unknown[]) => void) | undefined
    if (_sql.includes('FROM memory_archive')) {
      actualCallback?.(null, [...memoryArchive.values()])
      return this
    }
    if (_sql.includes('FROM memory_facts')) {
      actualCallback?.(null, [...memoryFacts.values()])
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
    if (_sql.includes('FROM mind_turn_events')) {
      const limit = Number(actualParams.at(-1) ?? 200)
      const turnId = _sql.includes('turn_id = ?')
        ? String(actualParams[_sql.includes('decision_trace_id = ?') ? 1 : 0] ?? '')
        : ''
      const decisionTraceId = _sql.includes('decision_trace_id = ?')
        ? String(actualParams[0] ?? '')
        : ''
      const rows = mindTurnEvents
        .filter((event) => {
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
    if (_sql.includes('FROM memory_consolidations')) {
      const limit = Number(actualParams.at(-1) ?? 48)
      const rows = [...memoryConsolidations.values()]
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

const { setupAlicizationDb } = await import('./db')

describe('alicization sqlite dao', () => {
  afterEach(async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0
    taskThreads.clear()
    executionEvents.length = 0
    episodicEvents.clear()
    memoryConsolidations.clear()
    memoryFacts.clear()
    memoryArchive.clear()
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
    expect(runCalls.some(sql => sql.includes('DELETE FROM scheduled_tasks'))).toBe(true)
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
    expect(conflicted?.latestReconsolidation?.reason).toContain('Conflicting remembered variants')
    expect(conflicted?.latestReconsolidation?.emotionTags).toContain('contradiction-pressure')
    expect(conflicted?.lesson).toContain('answer this memory with uncertainty')
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
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['runtime continuity', 'robotic', 'directness'],
        rationale: 'The host corrected which remembered reply style fits this same thread.',
        confidence: 0.82,
      },
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
        searchConversations: true,
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
    expect(rows[0]?.reconsolidationCount).toBeGreaterThan(0)
    expect(rows[0]?.lesson).toContain('answer more directly')
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
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['runtime continuity', 'proactive closure'],
        rationale: 'Need long-range gist.',
        confidence: 0.84,
      },
    })

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some(row => row.kind === 'daily')).toBe(true)
    expect(rows[0]?.summary).toContain('runtime continuity')
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
        searchConversations: true,
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
})
