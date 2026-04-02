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
    else if (sql.includes('DELETE FROM mind_turn_events')) {
      mindTurnEvents.length = 0
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

    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    await db.clearConversationData()

    expect(runCalls.some(sql => sql.includes('DELETE FROM conversation_turns'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM mind_turn_events'))).toBe(true)
    expect(runCalls.some(sql => sql.includes('DELETE FROM scheduled_tasks'))).toBe(true)
    await db.close()
  })

  it('runs legacy migration only once with marker', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0

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

  it('claims due scheduled tasks once and supports complete/fail transitions', async () => {
    runCalls.length = 0
    metaState.clear()
    scheduledTasks.clear()
    mindTurnEvents.length = 0

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
