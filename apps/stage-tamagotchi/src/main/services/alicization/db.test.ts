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
const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-db-test-'))
  sandboxDirs.push(dir)
  return dir
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
    else if (sql.includes('DELETE FROM task_threads')) {
      taskThreads.clear()
    }
    else if (sql.includes('DELETE FROM executor_events')) {
      executionEvents.length = 0
    }
    else if (sql.includes('DELETE FROM episodic_events')) {
      episodicEvents.clear()
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
      actualCallback?.(null, { total: 0 })
      return this
    }

    if (sql.includes('COUNT(1) AS total FROM memory_archive')) {
      actualCallback?.(null, { total: 0 })
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
      const limit = Number(actualParams.at(-1) ?? 240)
      const rows = [...episodicEvents.values()]
        .sort((a, b) => {
          if (a.occurred_at !== b.occurred_at)
            return b.occurred_at - a.occurred_at
          return b.created_at - a.created_at
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
