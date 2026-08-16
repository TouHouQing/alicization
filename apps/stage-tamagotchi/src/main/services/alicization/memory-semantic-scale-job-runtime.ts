import type sqlite3 from 'sqlite3'

import type { MemorySemanticScaleSoakReport } from './memory-semantic-scale-soak-harness'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, open as openFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

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

interface MemorySemanticScaleStopRecoveryMarker {
  version: 1
  jobId: string
  cardId: string
  leaseToken: string
  attemptCountBeforeClaim: number
  createdAt: number
}

const tierCorpusSizes: Record<MemorySemanticScaleJobTier, number> = {
  '10k': 10_000,
  '100k': 100_000,
}
const stopRecoveryMarkerMaxBytes = 8 * 1024
const stopRecoveryMarkerFilePattern = /^[a-f0-9]{64}\.json$/

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

function waitUntilAborted(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, Math.max(0, milliseconds))
    function onAbort() {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
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

function invalidStopRecoveryMarker(path: string, reason: string) {
  return new Error(`invalid semantic scale stop recovery marker: ${path}: ${reason}`)
}

function parseStopRecoveryMarker(
  raw: string,
  path: string,
): MemorySemanticScaleStopRecoveryMarker {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    throw invalidStopRecoveryMarker(path, 'invalid JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw invalidStopRecoveryMarker(path, 'expected object')
  const record = parsed as Record<string, unknown>
  const expectedKeys = [
    'attemptCountBeforeClaim',
    'cardId',
    'createdAt',
    'jobId',
    'leaseToken',
    'version',
  ]
  const actualKeys = Object.keys(record).sort()
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw invalidStopRecoveryMarker(path, 'unexpected schema')
  }
  const jobId = normalizeText(record.jobId, 240)
  const cardId = normalizeText(record.cardId, 120)
  const leaseToken = normalizeText(record.leaseToken, 240)
  const attemptCountBeforeClaim = Number(record.attemptCountBeforeClaim)
  const createdAt = Number(record.createdAt)
  if (
    record.version !== 1
    || !jobId
    || jobId !== record.jobId
    || !cardId
    || cardId !== record.cardId
    || !leaseToken
    || leaseToken !== record.leaseToken
    || !Number.isSafeInteger(attemptCountBeforeClaim)
    || attemptCountBeforeClaim < 0
    || attemptCountBeforeClaim > 20
    || !Number.isSafeInteger(createdAt)
    || createdAt < 0
  ) {
    throw invalidStopRecoveryMarker(path, 'invalid field values')
  }
  return {
    version: 1,
    jobId,
    cardId,
    leaseToken,
    attemptCountBeforeClaim,
    createdAt,
  }
}

async function readStopRecoveryMarker(path: string) {
  const file = await openFile(path, 'r')
  try {
    const metadata = await file.stat()
    if (
      !metadata.isFile()
      || metadata.size <= 0
      || metadata.size > stopRecoveryMarkerMaxBytes
    ) {
      throw invalidStopRecoveryMarker(path, 'invalid file size')
    }
    const buffer = Buffer.alloc(metadata.size)
    let offset = 0
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      )
      if (bytesRead === 0)
        throw invalidStopRecoveryMarker(path, 'unexpected end of file')
      offset += bytesRead
    }
    return parseStopRecoveryMarker(buffer.toString('utf8'), path)
  }
  finally {
    await file.close()
  }
}

function defaultStopRecoveryJournalDir(database: sqlite3.Database) {
  const filename = (database as sqlite3.Database & { filename?: unknown }).filename
  const rootDir = typeof filename === 'string' && filename && filename !== ':memory:'
    ? dirname(filename)
    : tmpdir()
  return join(rootDir, '.alicization-memory-semantic-scale-stop-recovery')
}

function stopRecoveryMarkerFileName(marker: MemorySemanticScaleStopRecoveryMarker) {
  return `${createHash('sha256')
    .update(`${marker.jobId}\0${marker.cardId}\0${marker.leaseToken}`)
    .digest('hex')}.json`
}

function throwIfAborted(signal: AbortSignal) {
  if (!signal.aborted)
    return
  if (signal.reason instanceof Error)
    throw signal.reason
  throw new DOMException(
    normalizeText(signal.reason, 500) || 'semantic scale job aborted',
    'AbortError',
  )
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
  throwIfAborted(input.signal)
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
  recoveryJournalDir?: string
  tempRootDir?: string
  createTempDir?: (input: {
    jobId: string
    tempRootDir: string
  }) => Promise<string>
  removeTempDir?: (path: string) => Promise<void>
}) {
  const executeJob = input.executeJob ?? executeMemorySemanticScaleJob
  const maxAttempts = normalizePositiveInteger(input.maxAttempts, 3, 20)
  const leaseMs = normalizePositiveInteger(input.leaseMs, 60_000)
  const retryBaseMs = normalizePositiveInteger(input.retryBaseMs, 5_000)
  const retryMaxMs = Math.max(retryBaseMs, normalizePositiveInteger(input.retryMaxMs, 15 * 60_000))
  const leaseHeartbeatMs = Math.max(1, Math.floor(leaseMs / 3))
  const recoveryJournalDir = input.recoveryJournalDir
    ?? defaultStopRecoveryJournalDir(input.database)
  const tempRootDir = input.tempRootDir ?? tmpdir()
  const createTempDir = input.createTempDir ?? (async () => {
    await mkdir(tempRootDir, { recursive: true })
    return await mkdtemp(join(tempRootDir, 'alicization-memory-semantic-scale-'))
  })
  const removeTempDir = input.removeTempDir ?? (async path =>
    await rm(path, { recursive: true, force: true }))
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

  function workerRetryDelay(failureCount: number) {
    return calculateBackoff(failureCount, 25, 250)
  }

  async function persistWorkerErrorBestEffort(jobId: string, error: unknown) {
    const message = errorText(error, 'semantic scale worker database operation failed')
    const now = input.now()
    try {
      await input.enqueueWrite(async () => {
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET last_error = ?, updated_at = ?
          WHERE id = ? AND status IN ('queued', 'running')
        `, [message, now, jobId])
      })
    }
    catch {
      // The worker retry loop remains authoritative when diagnostic persistence also fails.
    }
  }

  async function writeStopRecoveryMarker(
    marker: MemorySemanticScaleStopRecoveryMarker,
  ) {
    await mkdir(recoveryJournalDir, { recursive: true, mode: 0o700 })
    const fileName = stopRecoveryMarkerFileName(marker)
    const path = join(recoveryJournalDir, fileName)
    const nonce = createHash('sha256')
      .update(input.randomUUID())
      .digest('hex')
      .slice(0, 16)
    const tempPath = join(recoveryJournalDir, `.${fileName}.${nonce}.tmp`)
    try {
      await writeFile(
        tempPath,
        JSON.stringify(marker),
        {
          encoding: 'utf8',
          flag: 'wx',
          mode: 0o600,
        },
      )
      await rename(tempPath, path)
    }
    finally {
      await rm(tempPath, { force: true }).catch(() => {})
    }
    return path
  }

  async function reconcileStopRecoveryMarker(
    marker: MemorySemanticScaleStopRecoveryMarker,
  ) {
    const now = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        const row = await input.get<MemorySemanticScaleJobRow>(
          input.database,
          'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?',
          [marker.jobId],
        )
        if (
          !row
          || row.card_id !== marker.cardId
          || row.lease_token !== marker.leaseToken
          || (row.status !== 'running' && row.status !== 'cancel_requested')
        ) {
          return
        }
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET attempt_count = MIN(attempt_count, ?),
              lease_expires_at = ?,
              last_error = CASE
                WHEN status = 'cancel_requested' THEN last_error
                ELSE ?
              END,
              updated_at = ?
          WHERE id = ?
            AND card_id = ?
            AND status IN ('running', 'cancel_requested')
            AND lease_token = ?
        `, [
          marker.attemptCountBeforeClaim,
          now,
          'semantic scale runtime stopped before settlement recovery',
          now,
          marker.jobId,
          marker.cardId,
          marker.leaseToken,
        ])
        const reconciled = await input.get<MemorySemanticScaleJobRow>(
          input.database,
          'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?',
          [marker.jobId],
        )
        if (
          reconciled
          && reconciled.card_id === marker.cardId
          && reconciled.lease_token === marker.leaseToken
          && (reconciled.status === 'running' || reconciled.status === 'cancel_requested')
          && (
            Number(reconciled.attempt_count) > marker.attemptCountBeforeClaim
            || reconciled.lease_expires_at === null
            || Number(reconciled.lease_expires_at) > now
          )
        ) {
          throw new Error(`semantic scale stop recovery reconciliation failed: ${marker.jobId}`)
        }
      })
    })
  }

  async function replayStopRecoveryJournal() {
    let entries
    try {
      entries = await readdir(recoveryJournalDir, { withFileTypes: true })
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return
      throw error
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isFile() || !stopRecoveryMarkerFilePattern.test(entry.name))
        continue
      const path = join(recoveryJournalDir, entry.name)
      const marker = await readStopRecoveryMarker(path)
      await reconcileStopRecoveryMarker(marker)
      await rm(path, { force: true })
    }
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
    await replayStopRecoveryJournal()
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

  async function getLatestAvailableReport(cardId: string) {
    const normalizedCardId = normalizeText(cardId, 120)
    if (!normalizedCardId)
      return null
    const row = await input.get<MemorySemanticScaleJobRow>(
      input.database,
      `SELECT *
       FROM memory_semantic_scale_jobs
       WHERE card_id = ? AND report_json IS NOT NULL
       ORDER BY updated_at DESC, completed_at DESC, created_at DESC, id DESC
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
        if (Number(row.attempt_count) >= Number(row.max_attempts)) {
          await input.run(input.database, `
            UPDATE memory_semantic_scale_jobs
            SET status = 'failed', dead_lettered = 1,
                next_retry_at = NULL, lease_token = NULL, lease_expires_at = NULL,
                last_error = COALESCE(last_error, ?),
                completed_at = COALESCE(completed_at, ?), updated_at = ?
            WHERE id = ? AND status = 'queued' AND attempt_count >= max_attempts
          `, [
            'semantic scale job exhausted max attempts before claim',
            now,
            now,
            row.id,
          ])
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
            AND attempt_count < max_attempts
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

  async function renewClaimedLease(claimed: ClaimedMemorySemanticScaleJob) {
    const now = input.now()
    return await input.enqueueWrite(async () => {
      await input.run(input.database, `
        UPDATE memory_semantic_scale_jobs
        SET lease_expires_at = ?, updated_at = ?
        WHERE id = ? AND status = 'running' AND lease_token = ?
      `, [
        now + leaseMs,
        now,
        claimed.row.id,
        claimed.leaseToken,
      ])
      const row = await input.get<Pick<MemorySemanticScaleJobRow, 'status' | 'lease_token'>>(
        input.database,
        'SELECT status, lease_token FROM memory_semantic_scale_jobs WHERE id = ?',
        [claimed.row.id],
      )
      if (row?.lease_token !== claimed.leaseToken)
        return 'lost' as const
      if (row.status === 'running' || row.status === 'cancel_requested')
        return row.status
      return 'lost' as const
    })
  }

  async function preserveStoppedClaimForRecovery(
    claimed: ClaimedMemorySemanticScaleJob,
  ) {
    const marker: MemorySemanticScaleStopRecoveryMarker = {
      version: 1,
      jobId: claimed.row.id,
      cardId: claimed.row.card_id,
      leaseToken: claimed.leaseToken,
      attemptCountBeforeClaim: Math.max(0, Number(claimed.row.attempt_count) - 1),
      createdAt: input.now(),
    }
    const markerPath = await writeStopRecoveryMarker(marker)
    const retryLimit = 3
    for (let failureCount = 0; failureCount < retryLimit; failureCount += 1) {
      try {
        await reconcileStopRecoveryMarker(marker)
        await rm(markerPath, { force: true })
        return
      }
      catch (error) {
        await persistWorkerErrorBestEffort(claimed.row.id, error)
        if (failureCount + 1 < retryLimit)
          await wait(workerRetryDelay(failureCount + 1))
      }
    }
  }

  function startLeaseHeartbeat(
    claimed: ClaimedMemorySemanticScaleJob,
    executionController: AbortController,
  ) {
    const stopController = new AbortController()
    let heartbeatError: unknown = null
    const stopOnExecutionAbort = () => stopController.abort()
    executionController.signal.addEventListener('abort', stopOnExecutionAbort, { once: true })
    const completed = (async () => {
      while (!stopController.signal.aborted) {
        await waitUntilAborted(leaseHeartbeatMs, stopController.signal)
        if (stopController.signal.aborted)
          break
        try {
          const now = input.now()
          await input.enqueueWrite(async () => {
            await input.run(input.database, `
              UPDATE memory_semantic_scale_jobs
              SET lease_expires_at = ?, updated_at = ?
              WHERE id = ? AND status = 'running' AND lease_token = ?
            `, [
              now + leaseMs,
              now,
              claimed.row.id,
              claimed.leaseToken,
            ])
            const row = await input.get<Pick<MemorySemanticScaleJobRow, 'status' | 'lease_token'>>(
              input.database,
              'SELECT status, lease_token FROM memory_semantic_scale_jobs WHERE id = ?',
              [claimed.row.id],
            )
            if (row?.status !== 'running' || row.lease_token !== claimed.leaseToken)
              throw new Error('semantic scale job lease is no longer active')
          })
        }
        catch (error) {
          heartbeatError = error
          if (!executionController.signal.aborted)
            executionController.abort(error)
          break
        }
      }
    })()

    return async () => {
      stopController.abort()
      executionController.signal.removeEventListener('abort', stopOnExecutionAbort)
      await completed
      return heartbeatError
    }
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
          const attemptCountBeforeClaim = Math.max(
            0,
            Number(inputData.claimed.row.attempt_count) - 1,
          )
          await input.run(input.database, `
            UPDATE memory_semantic_scale_jobs
            SET status = 'queued', dead_lettered = 0,
                attempt_count = MIN(attempt_count, ?),
                next_retry_at = ?, lease_token = NULL, lease_expires_at = NULL,
                completed_at = NULL, updated_at = ?
            WHERE id = ? AND lease_token = ?
          `, [
            attemptCountBeforeClaim,
            now,
            now,
            row.id,
            inputData.claimed.leaseToken,
          ])
          return
        }

        if (!inputData.error && inputData.report?.passed) {
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

        const qualityFailureChecks = inputData.report && !inputData.report.passed
          ? inputData.report.summary.failingChecks
              .map(check => normalizeText(check, 120))
              .filter(Boolean)
          : []
        const message = qualityFailureChecks.length > 0
          ? `semantic scale quality checks failed: ${qualityFailureChecks.join(', ')}`
          : errorText(inputData.error, 'semantic scale job failed')
        const deadLettered = Number(row.attempt_count) >= Number(row.max_attempts)
        const nextRetryAt = deadLettered
          ? null
          : now + calculateBackoff(Number(row.attempt_count), retryBaseMs, retryMaxMs)
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = ?, dead_lettered = ?,
              next_retry_at = ?, lease_token = NULL, lease_expires_at = NULL,
              report_json = COALESCE(?, report_json),
              last_error = ?, completed_at = ?, updated_at = ?
          WHERE id = ? AND lease_token = ?
        `, [
          deadLettered ? 'failed' : 'queued',
          deadLettered ? 1 : 0,
          nextRetryAt,
          inputData.report ? JSON.stringify(inputData.report) : null,
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

    const controller = new AbortController()
    activeControllers.set(jobId, controller)
    let claimed: ClaimedMemorySemanticScaleJob | null = null
    let tempDir: string | null = null
    let report: MemorySemanticScaleSoakReport | null = null
    let executionError: unknown = null
    let stopLeaseHeartbeat: (() => Promise<unknown>) | null = null
    try {
      try {
        claimed = await claimNextAttempt(jobId)
        if (!claimed)
          return await getJob(jobId)
        const activeClaim = claimed
        stopLeaseHeartbeat = startLeaseHeartbeat(activeClaim, controller)
        tempDir = await createTempDir({
          jobId: activeClaim.row.id,
          tempRootDir,
        })
        const current = await readJobRow(activeClaim.row.id)
        if (stopping && !controller.signal.aborted)
          controller.abort(new Error('semantic scale runtime stopping'))
        else if (current.status === 'cancel_requested' && !controller.signal.aborted)
          controller.abort(new Error(current.last_error ?? 'semantic scale job cancelled'))
        report = await executeJob({
          jobId: activeClaim.row.id,
          cardId: activeClaim.row.card_id,
          tier: activeClaim.row.tier,
          corpusSize: Number(activeClaim.row.corpus_size),
          createdAt: Number(activeClaim.row.created_at),
          tempDir,
          signal: controller.signal,
          onProgress: async progress => await persistProgress(activeClaim, progress),
        })
      }
      catch (error) {
        if (!claimed)
          throw error
        executionError = error
      }
      finally {
        if (tempDir) {
          try {
            await removeTempDir(tempDir)
          }
          catch (error) {
            executionError ??= error
          }
        }
      }

      if (!claimed)
        return await getJob(jobId)
      if (stopLeaseHeartbeat) {
        const heartbeatError = await stopLeaseHeartbeat()
        executionError ??= heartbeatError
        stopLeaseHeartbeat = null
      }
      let settlementFailureCount = 0
      let stoppingSettlementFailureCount = 0
      const stoppingSettlementRetryLimit = 3
      let settled = false
      while (true) {
        try {
          await settleExecution({
            claimed,
            report,
            error: executionError,
            signal: controller.signal,
          })
          settled = true
          break
        }
        catch (error) {
          settlementFailureCount += 1
          if (stopping)
            stoppingSettlementFailureCount += 1
          await persistWorkerErrorBestEffort(jobId, error)
          if (
            stopping
            && stoppingSettlementFailureCount >= stoppingSettlementRetryLimit
          ) {
            await preserveStoppedClaimForRecovery(claimed)
            break
          }
          if (!stopping) {
            let claimedState: 'cancel_requested' | 'lost' | 'running' | null = null
            try {
              claimedState = await renewClaimedLease(claimed)
            }
            catch (leaseError) {
              await persistWorkerErrorBestEffort(jobId, leaseError)
            }
            if (claimedState === 'lost')
              break
            await wait(workerRetryDelay(settlementFailureCount))
          }
        }
      }
      if (!settled)
        return mapJobRow(claimed.row)
      return await getJob(jobId)
    }
    finally {
      if (stopLeaseHeartbeat)
        await stopLeaseHeartbeat()
      if (activeControllers.get(jobId) === controller)
        activeControllers.delete(jobId)
    }
  }

  function runJob(jobId: string) {
    const normalizedJobId = normalizeText(jobId, 240)
    const active = activeWorkers.get(normalizedJobId)
    if (active)
      return active
    if (stopping)
      return Promise.resolve()

    const worker = workerTail.then(async () => {
      let workerFailureCount = 0
      try {
        while (true) {
          if (stopping)
            break
          try {
            const current = await getJob(normalizedJobId)
            if (['completed', 'cancelled', 'failed'].includes(current.status))
              break
            if (current.status === 'running' || current.status === 'cancel_requested') {
              const now = input.now()
              if (current.leaseExpiresAt !== null && current.leaseExpiresAt > now) {
                workerFailureCount = 0
                await wait(Math.min(250, Math.max(5, current.leaseExpiresAt - now)))
                continue
              }
              await recoverExpiredLeases()
              workerFailureCount = 0
              continue
            }
            if (current.nextRetryAt !== null && current.nextRetryAt > input.now()) {
              workerFailureCount = 0
              await wait(Math.min(250, Math.max(5, current.nextRetryAt - input.now())))
              continue
            }
            const next = await runNextAttempt(normalizedJobId)
            workerFailureCount = 0
            if (['completed', 'cancelled', 'failed'].includes(next.status))
              break
            if (next.status === 'running' || next.status === 'cancel_requested')
              break
          }
          catch (error) {
            if (stopping)
              break
            workerFailureCount += 1
            await persistWorkerErrorBestEffort(normalizedJobId, error)
            await wait(workerRetryDelay(workerFailureCount))
          }
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
    getLatestAvailableReport,
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
