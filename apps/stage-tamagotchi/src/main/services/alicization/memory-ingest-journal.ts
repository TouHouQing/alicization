import type { AlicizationMemoryIngestHealth } from '@proj-alicization/stage-shared'
import type sqlite3 from 'sqlite3'

export type AlicizationMemoryIngestJournalStatus = 'pending' | 'applied' | 'failed'

export interface AlicizationMemoryIngestJournalRow<OperationKind extends string = string> {
  id: string
  operation_kind: OperationKind
  card_id: string | null
  payload_json: string
  status: AlicizationMemoryIngestJournalStatus
  attempt_count: number
  last_error: string | null
  created_at: number
  updated_at: number
  last_attempt_at: number | null
  applied_at: number | null
  next_attempt_at: number | null
}

interface CreateAlicizationMemoryIngestJournalRuntimeOptions<Payload> {
  database: sqlite3.Database
  scopeCardId?: string
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  parsePayload: (raw: string) => Payload | null
  applyPayload: (payload: Payload, writeOptions: { signal?: AbortSignal }, source: { id: string, cardId: string | null }) => Promise<void>
  buildBackoffMs: (attemptCount: number) => number
}

export function createAlicizationMemoryIngestJournalRuntime<OperationKind extends string, Payload>(
  input: CreateAlicizationMemoryIngestJournalRuntimeOptions<Payload>,
) {
  const assertNotAborted = (signal?: AbortSignal) => {
    if (!signal?.aborted)
      return
    throw signal.reason ?? new DOMException('Memory ingest journal write aborted', 'AbortError')
  }

  const isAbortError = (error: unknown) => (
    error instanceof Error
    && error.name === 'AbortError'
  )

  const appendEntries = async (entries: Array<{
    operationKind: OperationKind
    payload: Payload
    cardId?: string | null
    createdAt?: number
  }>, writeOptions: { signal?: AbortSignal } = {}) => {
    if (entries.length === 0)
      return
    for (const entry of entries) {
      assertNotAborted(writeOptions.signal)
      const createdAt = Number.isFinite(entry.createdAt)
        ? Math.max(0, Math.floor(Number(entry.createdAt)))
        : input.now()
      await input.run(
        input.database,
        `
        INSERT INTO memory_ingest_journal (
          id,
          operation_kind,
          payload_json,
          status,
          attempt_count,
          last_error,
          created_at,
          updated_at,
          last_attempt_at,
          applied_at,
          next_attempt_at,
          card_id
        ) VALUES (?, ?, ?, 'pending', 0, NULL, ?, ?, NULL, NULL, ?, ?)
        `,
        [
          input.randomUUID(),
          entry.operationKind,
          JSON.stringify(entry.payload),
          createdAt,
          createdAt,
          createdAt,
          entry.cardId?.trim() || input.scopeCardId?.trim() || null,
        ],
      )
    }
    assertNotAborted(writeOptions.signal)
  }

  const scopeClause = input.scopeCardId?.trim()
    ? ' AND card_id = ?'
    : ''
  const scopeParams = input.scopeCardId?.trim()
    ? [input.scopeCardId.trim()]
    : []

  const countPendingEntries = async (writeOptions: { signal?: AbortSignal } = {}) => {
    assertNotAborted(writeOptions.signal)
    const row = await input.get<{ total: number }>(
      input.database,
      `
      SELECT COUNT(1) AS total
      FROM memory_ingest_journal
      WHERE status IN ('pending', 'failed')
        ${scopeClause}
      `,
      scopeParams,
    )
    assertNotAborted(writeOptions.signal)
    return Math.max(0, Math.floor(row?.total ?? 0))
  }

  const deriveHealth = async (): Promise<AlicizationMemoryIngestHealth> => {
    const rows = await input.all<AlicizationMemoryIngestJournalRow<OperationKind>>(
      input.database,
      `
      SELECT *
      FROM memory_ingest_journal
      WHERE status IN ('pending', 'failed')
        ${scopeClause}
      ORDER BY created_at ASC
      LIMIT 256
      `,
      scopeParams,
    )
    if (rows.length === 0) {
      return {
        status: 'healthy',
        pendingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        nextRetryAt: null,
        lastError: null,
      }
    }

    const currentTs = input.now()
    const pendingCount = rows.filter(row => row.status === 'pending').length
    const failedCount = rows.filter(row => row.status === 'failed').length
    const oldestPendingAgeMs = Math.max(0, currentTs - Math.min(...rows.map(row => row.created_at)))
    const nextRetryAt = rows
      .map(row => row.next_attempt_at ?? row.created_at)
      .sort((left, right) => left - right)[0] ?? null
    const lastError = rows.find(row => typeof row.last_error === 'string' && row.last_error.trim())?.last_error ?? null

    return {
      status: failedCount > 0
        ? 'degraded'
        : pendingCount > 0
          ? 'backlog'
          : 'healthy',
      pendingCount,
      failedCount,
      oldestPendingAgeMs,
      nextRetryAt,
      lastError,
    }
  }

  const listPendingEntries = async (
    limit = 64,
    dueAt = input.now(),
    writeOptions: { signal?: AbortSignal } = {},
  ) => {
    assertNotAborted(writeOptions.signal)
    const rows = await input.all<AlicizationMemoryIngestJournalRow<OperationKind>>(
      input.database,
      `
      SELECT *
      FROM memory_ingest_journal
      WHERE status IN ('pending', 'failed')
        AND COALESCE(next_attempt_at, created_at) <= ?
        ${scopeClause}
      ORDER BY created_at ASC
      LIMIT ?
      `,
      [dueAt, ...scopeParams, Math.max(1, Math.min(512, Math.floor(limit)))],
    )
    assertNotAborted(writeOptions.signal)
    return rows
  }

  const markApplied = async (id: string, appliedAt: number, writeOptions: { signal?: AbortSignal } = {}) => {
    assertNotAborted(writeOptions.signal)
    await input.run(
      input.database,
      `
      UPDATE memory_ingest_journal
      SET status = 'applied',
          attempt_count = attempt_count + 1,
          last_error = NULL,
          updated_at = ?,
          last_attempt_at = ?,
          applied_at = ?,
          next_attempt_at = NULL
      WHERE id = ?
      `,
      [appliedAt, appliedAt, appliedAt, id],
    )
    assertNotAborted(writeOptions.signal)
  }

  const markFailed = async (
    id: string,
    message: string,
    failedAt: number,
    nextAttemptAt: number,
    writeOptions: { signal?: AbortSignal } = {},
  ) => {
    assertNotAborted(writeOptions.signal)
    await input.run(
      input.database,
      `
      UPDATE memory_ingest_journal
      SET status = 'failed',
          attempt_count = attempt_count + 1,
          last_error = ?,
          updated_at = ?,
          last_attempt_at = ?,
          next_attempt_at = ?
      WHERE id = ?
      `,
      [message, failedAt, failedAt, nextAttemptAt, id],
    )
    assertNotAborted(writeOptions.signal)
  }

  const drainJournal = async (
    limit = 64,
    dueAt = input.now(),
    writeOptions: { signal?: AbortSignal } = {},
  ) => {
    assertNotAborted(writeOptions.signal)
    let applied = 0
    let failed = 0
    const rows = await listPendingEntries(limit, dueAt, writeOptions)
    for (const row of rows) {
      assertNotAborted(writeOptions.signal)
      const payload = input.parsePayload(row.payload_json)
      const attemptAt = input.now()
      if (!payload) {
        const nextAttemptAt = attemptAt + input.buildBackoffMs(row.attempt_count)
        await input.runInTransaction(input.database, async () => {
          await markFailed(row.id, 'invalid memory ingest payload', attemptAt, nextAttemptAt, writeOptions)
        })
        failed += 1
        continue
      }
      try {
        await input.runInTransaction(input.database, async () => {
          await input.applyPayload(payload, writeOptions, { id: row.id, cardId: row.card_id })
          await markApplied(row.id, attemptAt, writeOptions)
        })
        applied += 1
      }
      catch (error) {
        if (isAbortError(error) || writeOptions.signal?.aborted)
          throw error
        const nextAttemptAt = attemptAt + input.buildBackoffMs(row.attempt_count)
        await input.runInTransaction(input.database, async () => {
          await markFailed(
            row.id,
            error instanceof Error ? error.message : String(error),
            attemptAt,
            nextAttemptAt,
            writeOptions,
          )
        }).catch(() => {})
        failed += 1
      }
    }
    assertNotAborted(writeOptions.signal)
    return {
      applied,
      failed,
      pending: await countPendingEntries(writeOptions),
    }
  }

  return {
    appendEntries,
    countPendingEntries,
    deriveHealth,
    drainJournal,
  }
}
