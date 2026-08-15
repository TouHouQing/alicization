import type sqlite3 from 'sqlite3'

import type { MemorySemanticScaleSoakReport } from './memory-semantic-scale-soak-harness'

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite from 'sqlite3'

import { errorMessageFrom } from '@moeru/std'

import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'
import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import { runMemorySemanticScaleVectorAdapterSoak } from './memory-semantic-scale-soak-runtime'

export type MemorySemanticScaleJobTier = '10k' | '100k'
export type MemorySemanticScaleJobStatus = 'queued' | 'running' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'
export type MemorySemanticScaleJobProgressPhase = 'queued' | 'indexing' | 'querying' | 'completed'

export interface MemorySemanticScaleJobProgress {
  phase: MemorySemanticScaleJobProgressPhase
  completed: number
  total: number
  ratio: number
  indexedCount: number
  queryCount: number
  corpusSize: number
}

export interface MemorySemanticScaleJob {
  jobId: string
  cardId: string
  tier: MemorySemanticScaleJobTier
  corpusSize: number
  status: MemorySemanticScaleJobStatus
  deadLettered: boolean
  attemptCount: number
  maxAttempts: number
  nextRetryAt: number | null
  leaseExpiresAt: number | null
  progress: MemorySemanticScaleJobProgress
  report: MemorySemanticScaleSoakReport | null
  lastError: string | null
  createdAt: number
  updatedAt: number
  startedAt: number | null
  completedAt: number | null
}

export interface MemorySemanticScaleJobExecutionInput {
  jobId: string
  cardId: string
  tier: MemorySemanticScaleJobTier
  corpusSize: number
  createdAt: number
  tempDir: string
  signal: AbortSignal
  onProgress: (progress: MemorySemanticScaleJobProgress) => Promise<void>
}

export type MemorySemanticScaleJobExecutor = (
  input: MemorySemanticScaleJobExecutionInput,
) => Promise<MemorySemanticScaleSoakReport>

interface MemorySemanticScaleJobRow {
  id: string
  card_id: string
  tier: MemorySemanticScaleJobTier
  corpus_size: number
  status: MemorySemanticScaleJobStatus
  dead_lettered: number
  attempt_count: number
  max_attempts: number
  next_retry_at: number | null
  lease_token: string | null
  lease_expires_at: number | null
  progress_json: string
  report_json: string | null
  last_error: string | null
  created_at: number
  updated_at: number
  started_at: number | null
  completed_at: number | null
}

interface ClaimedMemorySemanticScaleJob {
  row: MemorySemanticScaleJobRow
  leaseToken: string
}

const tierCorpusSizes: Record<MemorySemanticScaleJobTier, number> = {
  '10k': 10_000,
  '100k': 100_000,
}

function normalizeText(raw: unknown, maxLength: number) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxLength).trim()
    : ''
}

function normalizePositiveInteger(raw: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(Number(raw)))
    return fallback
  return Math.max(1, Math.min(maximum, Math.floor(Number(raw))))
}

function clamp01(value: unknown) {
  if (!Number.isFinite(Number(value)))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function calculateBackoff(attemptCount: number, baseMs: number, maxMs: number) {
  const exponent = Math.max(0, Math.floor(attemptCount) - 1)
  return Math.min(maxMs, baseMs * 2 ** exponent)
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => setTimeout(resolve, Math.max(0, milliseconds)))
}

function queuedProgress(corpusSize: number): MemorySemanticScaleJobProgress {
  return {
    phase: 'queued',
    completed: 0,
    total: 0,
    ratio: 0,
    indexedCount: 0,
    queryCount: 0,
    corpusSize,
  }
}

function completedProgress(
  progress: MemorySemanticScaleJobProgress,
  corpusSize: number,
): MemorySemanticScaleJobProgress {
  return {
    ...progress,
    phase: 'completed',
    completed: Math.max(progress.completed, progress.total),
    ratio: 1,
    indexedCount: Math.max(progress.indexedCount, corpusSize),
    corpusSize,
  }
}

function normalizeProgress(
  raw: unknown,
  corpusSize: number,
): MemorySemanticScaleJobProgress {
  if (!raw || typeof raw !== 'object')
    return queuedProgress(corpusSize)
  const progress = raw as Partial<MemorySemanticScaleJobProgress>
  const phase: MemorySemanticScaleJobProgressPhase = ['queued', 'indexing', 'querying', 'completed'].includes(String(progress.phase))
    ? progress.phase as MemorySemanticScaleJobProgressPhase
    : 'queued'
  const total = Math.max(0, Math.floor(Number(progress.total) || 0))
  const completed = Math.max(0, Math.min(total || Number.MAX_SAFE_INTEGER, Math.floor(Number(progress.completed) || 0)))
  return {
    phase,
    completed,
    total,
    ratio: phase === 'completed' ? 1 : clamp01(progress.ratio),
    indexedCount: Math.max(0, Math.floor(Number(progress.indexedCount) || 0)),
    queryCount: Math.max(0, Math.floor(Number(progress.queryCount) || 0)),
    corpusSize,
  }
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw)
    return fallback
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return fallback
  }
}

function errorText(error: unknown, fallback: string) {
  return normalizeText(errorMessageFrom(error) ?? error, 500) || fallback
}

function isAbortError(error: unknown, signal: AbortSignal) {
  return signal.aborted
    || (error instanceof Error && error.name === 'AbortError')
}

function mapJobRow(row: MemorySemanticScaleJobRow): MemorySemanticScaleJob {
  const corpusSize = Number(row.corpus_size)
  return {
    jobId: row.id,
    cardId: row.card_id,
    tier: row.tier,
    corpusSize,
    status: row.status,
    deadLettered: Number(row.dead_lettered) === 1,
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    nextRetryAt: row.next_retry_at,
    leaseExpiresAt: row.lease_expires_at,
    progress: normalizeProgress(
      safeParseJson<unknown>(row.progress_json, null),
      corpusSize,
    ),
    report: safeParseJson<MemorySemanticScaleSoakReport | null>(row.report_json, null),
    lastError: row.last_error,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}

function openDatabase(path: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const database = new sqlite.Database(path, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve(database)
    })
  })
}

function run(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, error => error ? reject(error) : resolve())
  })
}

function get<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error, row) => error ? reject(error) : resolve(row as T | undefined))
  })
}

function all<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => error ? reject(error) : resolve((rows ?? []) as T[]))
  })
}

function closeDatabase(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve())
  })
}

export const executeMemorySemanticScaleJob: MemorySemanticScaleJobExecutor = async (input) => {
  const database = await openDatabase(join(input.tempDir, 'semantic-scale.sqlite'))
  let writeQueue = Promise.resolve<unknown>(undefined)
  const enqueueWrite = async <T>(task: () => Promise<T>) => {
    const next = writeQueue.then(async () => {
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
    })
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }

  try {
    await run(database, `
      CREATE TABLE long_term_memory_search_documents (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        text_hash TEXT NOT NULL,
        tombstoned INTEGER NOT NULL DEFAULT 0
      )
    `)
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite,
      now: () => Date.now(),
    })
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store,
      native: createSqliteVecLongTermMemoryVectorBackend({
        database,
        now: () => Date.now(),
        run,
        get,
        all,
        enqueueWrite,
      }),
    })
    await adapter.initialize()

    return await runMemorySemanticScaleVectorAdapterSoak({
      id: `memory-semantic-scale-job:${input.jobId}`,
      createdAt: input.createdAt,
      adapter,
      prepareCanonical: async (records) => {
        await enqueueWrite(async () => {
          for (const record of records) {
            await run(database, `
              INSERT OR REPLACE INTO long_term_memory_search_documents (
                id, card_id, source, source_id, text_hash, tombstoned
              ) VALUES (?, ?, ?, ?, ?, 0)
            `, [
              `doc:${record.cardId}:${record.source}:${record.sourceId}`,
              record.cardId,
              record.source,
              record.sourceId,
              hashLongTermMemoryEmbeddingText(record.text),
            ])
          }
        })
      },
      cardId: `semantic-scale-target:${input.jobId}`,
      foreignCardId: `semantic-scale-foreign:${input.jobId}`,
      modelId: 'deterministic-semantic-scale-v1',
      dimensions: 12,
      corpusSizes: [input.corpusSize],
      queryCount: 24,
      batchSize: 500,
      maxP95LatencyMs: 2_000,
      maxP99LatencyMs: 4_000,
      signal: input.signal,
      onProgress: input.onProgress,
    })
  }
  finally {
    await closeDatabase(database)
  }
}

export function createMemorySemanticScaleJobRuntime(input: {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  executeJob?: MemorySemanticScaleJobExecutor
  maxAttempts?: number
  leaseMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
  tempRootDir?: string
}) {
  const executeJob = input.executeJob ?? executeMemorySemanticScaleJob
  const maxAttempts = normalizePositiveInteger(input.maxAttempts, 3, 20)
  const leaseMs = normalizePositiveInteger(input.leaseMs, 60_000)
  const retryBaseMs = normalizePositiveInteger(input.retryBaseMs, 5_000)
  const retryMaxMs = Math.max(retryBaseMs, normalizePositiveInteger(input.retryMaxMs, 15 * 60_000))
  const tempRootDir = input.tempRootDir ?? tmpdir()
  const activeWorkers = new Map<string, Promise<void>>()
  const activeControllers = new Map<string, AbortController>()
  let workerTail = Promise.resolve()
  let stopping = false

  async function readJobRow(jobId: string, expectedCardId?: string) {
    const normalizedJobId = normalizeText(jobId, 240)
    const row = await input.get<MemorySemanticScaleJobRow>(
      input.database,
      'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?',
      [normalizedJobId],
    )
    if (!row)
      throw new Error(`semantic scale job not found: ${normalizedJobId}`)
    const normalizedExpectedCardId = normalizeText(expectedCardId, 120)
    if (normalizedExpectedCardId && row.card_id !== normalizedExpectedCardId)
      throw new Error(`semantic scale job does not belong to card: ${normalizedExpectedCardId}`)
    return row
  }

  async function initializeSchema() {
    await input.run(input.database, `
      CREATE TABLE IF NOT EXISTS memory_semantic_scale_jobs (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        tier TEXT NOT NULL,
        corpus_size INTEGER NOT NULL,
        status TEXT NOT NULL,
        dead_lettered INTEGER NOT NULL DEFAULT 0,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL,
        next_retry_at INTEGER,
        lease_token TEXT,
        lease_expires_at INTEGER,
        progress_json TEXT NOT NULL,
        report_json TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER
      )
    `)
    await input.run(
      input.database,
      'CREATE INDEX IF NOT EXISTS idx_memory_semantic_scale_jobs_card_created ON memory_semantic_scale_jobs(card_id, created_at DESC, id DESC)',
    )
    await input.run(
      input.database,
      'CREATE INDEX IF NOT EXISTS idx_memory_semantic_scale_jobs_resume ON memory_semantic_scale_jobs(status, next_retry_at, lease_expires_at)',
    )
    await recoverExpiredLeases()
  }

  async function startJob(inputData: {
    cardId: string
    tier: MemorySemanticScaleJobTier
  }) {
    if (stopping)
      throw new Error('semantic scale runtime is stopping')
    const cardId = normalizeText(inputData.cardId, 120)
    if (!cardId)
      throw new Error('semantic scale job requires cardId')
    if (inputData.tier !== '10k' && inputData.tier !== '100k')
      throw new Error('semantic scale job tier must be 10k or 100k')
    const corpusSize = tierCorpusSizes[inputData.tier]
    const jobId = input.randomUUID()
    const now = input.now()
    const progress = queuedProgress(corpusSize)

    await input.enqueueWrite(async () => {
      await input.run(input.database, `
        INSERT INTO memory_semantic_scale_jobs (
          id, card_id, tier, corpus_size, status, dead_lettered,
          attempt_count, max_attempts, next_retry_at, lease_token, lease_expires_at,
          progress_json, report_json, last_error,
          created_at, updated_at, started_at, completed_at
        ) VALUES (?, ?, ?, ?, 'queued', 0, 0, ?, NULL, NULL, NULL, ?, NULL, NULL, ?, ?, NULL, NULL)
      `, [
        jobId,
        cardId,
        inputData.tier,
        corpusSize,
        maxAttempts,
        JSON.stringify(progress),
        now,
        now,
      ])
    })
    return await getJob(jobId, cardId)
  }

  async function getJob(jobId: string, expectedCardId?: string) {
    return mapJobRow(await readJobRow(jobId, expectedCardId))
  }

  async function listJobs(cardId: string, options?: { limit?: number }) {
    const normalizedCardId = normalizeText(cardId, 120)
    if (!normalizedCardId)
      return []
    const limit = normalizePositiveInteger(options?.limit, 20, 100)
    const rows = await input.all<MemorySemanticScaleJobRow>(
      input.database,
      `SELECT *
       FROM memory_semantic_scale_jobs
       WHERE card_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [normalizedCardId, limit],
    )
    return rows.map(mapJobRow)
  }

  async function getLatestCompletedReport(cardId: string) {
    const normalizedCardId = normalizeText(cardId, 120)
    if (!normalizedCardId)
      return null
    const row = await input.get<MemorySemanticScaleJobRow>(
      input.database,
      `SELECT *
       FROM memory_semantic_scale_jobs
       WHERE card_id = ? AND status = 'completed' AND report_json IS NOT NULL
       ORDER BY completed_at DESC, created_at DESC, id DESC
       LIMIT 1`,
      [normalizedCardId],
    )
    if (!row)
      return null
    const job = mapJobRow(row)
    return job.report
      ? {
          jobId: job.jobId,
          report: job.report,
        }
      : null
  }

  async function recoverExpiredLeasesInternal() {
    const now = input.now()
    const rows = await input.all<MemorySemanticScaleJobRow>(
      input.database,
      `SELECT *
       FROM memory_semantic_scale_jobs
       WHERE status IN ('running', 'cancel_requested')
         AND (lease_expires_at IS NULL OR lease_expires_at <= ?)`,
      [now],
    )
    for (const row of rows) {
      if (row.status === 'cancel_requested') {
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = 'cancelled', dead_lettered = 0,
              lease_token = NULL, lease_expires_at = NULL, next_retry_at = NULL,
              completed_at = COALESCE(completed_at, ?), updated_at = ?
          WHERE id = ?
        `, [now, now, row.id])
        continue
      }

      const message = 'semantic scale job lease expired during crash recovery'
      const deadLettered = Number(row.attempt_count) >= Number(row.max_attempts)
      const nextRetryAt = deadLettered
        ? null
        : now + calculateBackoff(Number(row.attempt_count), retryBaseMs, retryMaxMs)
      await input.run(input.database, `
        UPDATE memory_semantic_scale_jobs
        SET status = ?, dead_lettered = ?,
            next_retry_at = ?, lease_token = NULL, lease_expires_at = NULL,
            last_error = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
      `, [
        deadLettered ? 'failed' : 'queued',
        deadLettered ? 1 : 0,
        nextRetryAt,
        message,
        deadLettered ? now : null,
        now,
        row.id,
      ])
    }
    return rows.length
  }

  async function recoverExpiredLeases() {
    return await input.enqueueWrite(async () => {
      return await input.runInTransaction(input.database, async () => {
        return await recoverExpiredLeasesInternal()
      })
    })
  }

  async function claimNextAttempt(jobId: string): Promise<ClaimedMemorySemanticScaleJob | null> {
    const now = input.now()
    return await input.enqueueWrite(async () => {
      return await input.runInTransaction(input.database, async () => {
        await recoverExpiredLeasesInternal()
        const row = await readJobRow(jobId)
        if (
          row.status !== 'queued'
          || (row.next_retry_at !== null && Number(row.next_retry_at) > now)
        ) {
          return null
        }
        const leaseToken = input.randomUUID()
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = 'running', attempt_count = attempt_count + 1,
              next_retry_at = NULL, lease_token = ?, lease_expires_at = ?,
              started_at = COALESCE(started_at, ?), updated_at = ?
          WHERE id = ? AND status = 'queued'
            AND (next_retry_at IS NULL OR next_retry_at <= ?)
        `, [leaseToken, now + leaseMs, now, now, row.id, now])
        const claimed = await input.get<MemorySemanticScaleJobRow>(
          input.database,
          'SELECT * FROM memory_semantic_scale_jobs WHERE id = ? AND lease_token = ?',
          [row.id, leaseToken],
        )
        return claimed
          ? {
              row: claimed,
              leaseToken,
            }
          : null
      })
    })
  }

  async function persistProgress(
    claimed: ClaimedMemorySemanticScaleJob,
    progress: MemorySemanticScaleJobProgress,
  ) {
    const normalized = normalizeProgress(progress, Number(claimed.row.corpus_size))
    const now = input.now()
    await input.enqueueWrite(async () => {
      await input.run(input.database, `
        UPDATE memory_semantic_scale_jobs
        SET progress_json = ?, lease_expires_at = ?, updated_at = ?
        WHERE id = ? AND status = 'running' AND lease_token = ?
      `, [
        JSON.stringify(normalized),
        now + leaseMs,
        now,
        claimed.row.id,
        claimed.leaseToken,
      ])
    })
  }

  async function settleExecution(inputData: {
    claimed: ClaimedMemorySemanticScaleJob
    report: MemorySemanticScaleSoakReport | null
    error: unknown
    signal: AbortSignal
  }) {
    const now = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        const row = await readJobRow(inputData.claimed.row.id)
        if (row.lease_token !== inputData.claimed.leaseToken)
          return
        const progress = normalizeProgress(
          safeParseJson<unknown>(row.progress_json, null),
          Number(row.corpus_size),
        )

        if (row.status === 'cancel_requested') {
          await input.run(input.database, `
            UPDATE memory_semantic_scale_jobs
            SET status = 'cancelled', dead_lettered = 0,
                next_retry_at = NULL, lease_token = NULL, lease_expires_at = NULL,
                completed_at = COALESCE(completed_at, ?), updated_at = ?
            WHERE id = ? AND lease_token = ?
          `, [now, now, row.id, inputData.claimed.leaseToken])
          return
        }

        if (stopping) {
          await input.run(input.database, `
            UPDATE memory_semantic_scale_jobs
            SET status = 'queued', dead_lettered = 0,
                next_retry_at = ?, lease_token = NULL, lease_expires_at = NULL,
                completed_at = NULL, updated_at = ?
            WHERE id = ? AND lease_token = ?
          `, [now, now, row.id, inputData.claimed.leaseToken])
          return
        }

        if (!inputData.error && inputData.report) {
          await input.run(input.database, `
            UPDATE memory_semantic_scale_jobs
            SET status = 'completed', dead_lettered = 0,
                next_retry_at = NULL, lease_token = NULL, lease_expires_at = NULL,
                progress_json = ?, report_json = ?, last_error = NULL,
                completed_at = ?, updated_at = ?
            WHERE id = ? AND lease_token = ?
          `, [
            JSON.stringify(completedProgress(progress, Number(row.corpus_size))),
            JSON.stringify(inputData.report),
            now,
            now,
            row.id,
            inputData.claimed.leaseToken,
          ])
          return
        }

        if (isAbortError(inputData.error, inputData.signal)) {
          const reason = row.last_error
            ?? errorText(inputData.signal.reason, 'semantic scale job cancelled')
          await input.run(input.database, `
            UPDATE memory_semantic_scale_jobs
            SET status = 'cancelled', dead_lettered = 0,
                next_retry_at = NULL, lease_token = NULL, lease_expires_at = NULL,
                last_error = ?, completed_at = ?, updated_at = ?
            WHERE id = ? AND lease_token = ?
          `, [reason, now, now, row.id, inputData.claimed.leaseToken])
          return
        }

        const message = errorText(inputData.error, 'semantic scale job failed')
        const deadLettered = Number(row.attempt_count) >= Number(row.max_attempts)
        const nextRetryAt = deadLettered
          ? null
          : now + calculateBackoff(Number(row.attempt_count), retryBaseMs, retryMaxMs)
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = ?, dead_lettered = ?,
              next_retry_at = ?, lease_token = NULL, lease_expires_at = NULL,
              report_json = NULL, last_error = ?, completed_at = ?, updated_at = ?
          WHERE id = ? AND lease_token = ?
        `, [
          deadLettered ? 'failed' : 'queued',
          deadLettered ? 1 : 0,
          nextRetryAt,
          message,
          deadLettered ? now : null,
          now,
          row.id,
          inputData.claimed.leaseToken,
        ])
      })
    })
  }

  async function runNextAttempt(jobId: string) {
    if (stopping)
      return await getJob(jobId)
    const claimed = await claimNextAttempt(jobId)
    if (!claimed)
      return await getJob(jobId)

    await mkdir(tempRootDir, { recursive: true })
    const tempDir = await mkdtemp(join(tempRootDir, 'alicization-memory-semantic-scale-'))
    const controller = new AbortController()
    activeControllers.set(jobId, controller)
    let report: MemorySemanticScaleSoakReport | null = null
    let executionError: unknown = null
    try {
      report = await executeJob({
        jobId: claimed.row.id,
        cardId: claimed.row.card_id,
        tier: claimed.row.tier,
        corpusSize: Number(claimed.row.corpus_size),
        createdAt: Number(claimed.row.created_at),
        tempDir,
        signal: controller.signal,
        onProgress: async progress => await persistProgress(claimed, progress),
      })
    }
    catch (error) {
      executionError = error
    }
    finally {
      activeControllers.delete(jobId)
      try {
        await rm(tempDir, { recursive: true, force: true })
      }
      catch (error) {
        executionError ??= error
      }
    }
    await settleExecution({
      claimed,
      report,
      error: executionError,
      signal: controller.signal,
    })
    return await getJob(jobId)
  }

  function runJob(jobId: string) {
    const normalizedJobId = normalizeText(jobId, 240)
    const active = activeWorkers.get(normalizedJobId)
    if (active)
      return active
    if (stopping)
      return Promise.resolve()

    const worker = workerTail.then(async () => {
      try {
        while (true) {
          if (stopping)
            break
          const current = await getJob(normalizedJobId)
          if (['completed', 'cancelled', 'failed'].includes(current.status))
            break
          if (current.status === 'running' || current.status === 'cancel_requested') {
            const now = input.now()
            if (current.leaseExpiresAt !== null && current.leaseExpiresAt > now) {
              await wait(Math.min(250, Math.max(5, current.leaseExpiresAt - now)))
              continue
            }
            await recoverExpiredLeases()
            continue
          }
          if (current.nextRetryAt !== null && current.nextRetryAt > input.now()) {
            await wait(Math.min(250, Math.max(5, current.nextRetryAt - input.now())))
            continue
          }
          const next = await runNextAttempt(normalizedJobId)
          if (['completed', 'cancelled', 'failed'].includes(next.status))
            break
        }
      }
      finally {
        activeWorkers.delete(normalizedJobId)
      }
    })
    activeWorkers.set(normalizedJobId, worker)
    workerTail = worker.then(() => undefined, () => undefined)
    return worker
  }

  async function requestCancel(jobId: string, reason?: string, expectedCardId?: string) {
    const now = input.now()
    const cancellationReason = normalizeText(reason, 500) || '用户取消语义规模压测'
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        const row = await readJobRow(jobId, expectedCardId)
        if (['completed', 'cancelled', 'failed'].includes(row.status))
          return
        const hasActiveLease = row.status === 'running'
          || row.status === 'cancel_requested'
          || Boolean(row.lease_token)
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = ?, dead_lettered = 0,
              next_retry_at = NULL, last_error = ?,
              completed_at = ?, updated_at = ?
          WHERE id = ?
        `, [
          hasActiveLease ? 'cancel_requested' : 'cancelled',
          cancellationReason,
          hasActiveLease ? null : now,
          now,
          row.id,
        ])
      })
    })
    activeControllers.get(jobId)?.abort(new Error(cancellationReason))
    return await getJob(jobId, expectedCardId)
  }

  async function retryJob(jobId: string, expectedCardId?: string) {
    const now = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        const row = await readJobRow(jobId, expectedCardId)
        if (row.status !== 'failed' || Number(row.dead_lettered) !== 1)
          throw new Error(`semantic scale job is not dead-lettered: ${row.id}`)
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = 'queued', dead_lettered = 0,
              attempt_count = 0, next_retry_at = NULL,
              lease_token = NULL, lease_expires_at = NULL,
              progress_json = ?, report_json = NULL, last_error = NULL,
              started_at = NULL, completed_at = NULL, updated_at = ?
          WHERE id = ?
        `, [
          JSON.stringify(queuedProgress(Number(row.corpus_size))),
          now,
          row.id,
        ])
      })
    })
    return await getJob(jobId, expectedCardId)
  }

  async function resumePendingJobs(cardId?: string) {
    if (stopping)
      return []
    await recoverExpiredLeases()
    const normalizedCardId = normalizeText(cardId, 120)
    const rows = await input.all<{ id: string }>(
      input.database,
      `SELECT id
       FROM memory_semantic_scale_jobs
       WHERE status IN ('queued', 'running', 'cancel_requested')
         ${normalizedCardId ? 'AND card_id = ?' : ''}
       ORDER BY created_at ASC, id ASC`,
      normalizedCardId ? [normalizedCardId] : [],
    )
    for (const row of rows)
      void runJob(row.id)
    return rows.map(row => row.id)
  }

  function activeJobIds() {
    return [...activeWorkers.keys()]
  }

  async function stop() {
    stopping = true
    for (const controller of activeControllers.values())
      controller.abort(new Error('semantic scale runtime stopping'))
    await Promise.allSettled(activeWorkers.values())
  }

  return {
    initializeSchema,
    startJob,
    getJob,
    listJobs,
    getLatestCompletedReport,
    runNextAttempt,
    runJob,
    requestCancel,
    retryJob,
    recoverExpiredLeases,
    resumePendingJobs,
    activeJobIds,
    stop,
  }
}
