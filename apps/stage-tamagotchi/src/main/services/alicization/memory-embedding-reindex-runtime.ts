import type sqlite3 from 'sqlite3'

import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'

import { resolveLongTermMemoryVectorSpaceId } from './long-term-memory-embedding-provider'
import {
  hashLongTermMemoryEmbeddingText,
  normalizeLongTermMemoryEmbeddingText,
} from './long-term-memory-embedding-text'

export type MemoryEmbeddingReindexJobStatus = 'queued' | 'running' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'
export type MemoryEmbeddingReindexItemStatus = 'pending' | 'leased' | 'indexed' | 'retryable' | 'dead-lettered' | 'cancelled'

export interface MemoryEmbeddingReindexEntry {
  sourceId: string
  source: string
  text: string
  textHash?: string
}

export interface MemoryEmbeddingReindexProgress {
  jobId: string
  cardId: string
  status: MemoryEmbeddingReindexJobStatus
  modelId: string
  dimensions: number
  vectorSpaceId: string
  total: number
  pending: number
  leased: number
  indexed: number
  retryable: number
  deadLettered: number
  cancelled: number
  progress: number
  lastError: string | null
  createdAt: number
  updatedAt: number
  startedAt: number | null
  completedAt: number | null
  nextRetryAt: number | null
}

export interface MemoryEmbeddingReindexDeadLetterItem {
  itemId: string
  source: string
  sourceId: string
  attemptCount: number
  lastError: string | null
}

interface MemoryEmbeddingReindexJobRow {
  id: string
  card_id: string
  model_id: string
  dimensions: number
  vector_space_id: string
  status: MemoryEmbeddingReindexJobStatus
  max_attempts: number
  last_error: string | null
  created_at: number
  updated_at: number
  started_at: number | null
  completed_at: number | null
}

interface MemoryEmbeddingReindexItemRow {
  id: string
  jobId: string
  sourceId: string
  source: string
  text: string
  textHash: string
  attemptCount: number
  leaseToken: string | null
  leaseExpiresAt: number | null
  nextRetryAt: number | null
}

interface MemoryEmbeddingReindexStatusCountRow {
  status: MemoryEmbeddingReindexItemStatus
  count: number
}

interface ClaimedReindexItem extends MemoryEmbeddingReindexItemRow {
  jobId: string
  cardId: string
  modelId: string
  dimensions: number
  vectorSpaceId: string
  attemptCount: number
}

interface UpsertVectorInput {
  cardId: string
  sourceId: string
  source: string
  text: string
  textHash: string
  vector: number[]
  modelId: string
  dimensions: number
  vectorSpaceId: string
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

function errorText(error: unknown) {
  if (error instanceof Error && error.message.trim())
    return error.message.trim()
  if (typeof error === 'string' && error.trim())
    return error.trim()
  return 'embedding provider failed'
}

function isValidVector(vector: unknown, dimensions: number): vector is number[] {
  return Array.isArray(vector)
    && vector.length === dimensions
    && vector.every(value => Number.isFinite(value))
}

function calculateBackoff(attemptCount: number, baseMs: number, maxMs: number) {
  const exponent = Math.max(0, Math.floor(attemptCount) - 1)
  return Math.min(maxMs, baseMs * 2 ** exponent)
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => setTimeout(resolve, Math.max(0, milliseconds)))
}

export function createMemoryEmbeddingReindexRuntime(input: {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  provider?: LongTermMemoryEmbeddingProvider | null
  resolveProvider?: () => LongTermMemoryEmbeddingProvider | null
  upsertVector: (input: UpsertVectorInput) => Promise<void>
  maxAttempts?: number
  leaseMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
}) {
  const maxAttempts = normalizePositiveInteger(input.maxAttempts, 3, 20)
  const leaseMs = normalizePositiveInteger(input.leaseMs, 60_000)
  const retryBaseMs = normalizePositiveInteger(input.retryBaseMs, 5_000)
  const retryMaxMs = Math.max(retryBaseMs, normalizePositiveInteger(input.retryMaxMs, 15 * 60_000))
  const activeWorkers = new Map<string, Promise<void>>()
  let stopping = false

  function resolveProvider() {
    return input.resolveProvider ? input.resolveProvider() : input.provider ?? null
  }

  async function initializeSchema() {
    await input.run(input.database, `
      CREATE TABLE IF NOT EXISTS memory_embedding_reindex_jobs (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        vector_space_id TEXT NOT NULL,
        status TEXT NOT NULL,
        max_attempts INTEGER NOT NULL,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER
      )
    `)
    await input.run(
      input.database,
      `ALTER TABLE memory_embedding_reindex_jobs ADD COLUMN vector_space_id TEXT NOT NULL DEFAULT ''`,
    ).catch(() => {})
    await input.run(input.database, `
      CREATE TABLE IF NOT EXISTS memory_embedding_reindex_items (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL,
        text TEXT NOT NULL,
        text_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        lease_token TEXT,
        lease_expires_at INTEGER,
        next_retry_at INTEGER,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        indexed_at INTEGER,
        UNIQUE(job_id, source_id, source)
      )
    `)
    await input.run(
      input.database,
      `DELETE FROM memory_embedding_reindex_items
       WHERE job_id IN (
         SELECT id FROM memory_embedding_reindex_jobs WHERE vector_space_id = ''
       )`,
    )
    await input.run(
      input.database,
      `DELETE FROM memory_embedding_reindex_jobs WHERE vector_space_id = ''`,
    )
    await input.run(
      input.database,
      `ALTER TABLE memory_embedding_reindex_items ADD COLUMN text_hash TEXT NOT NULL DEFAULT ''`,
    ).catch(() => {})
    const unhashedItems = await input.all<{ id: string, text: string }>(
      input.database,
      `SELECT id, text FROM memory_embedding_reindex_items WHERE text_hash = ''`,
    )
    for (const item of unhashedItems) {
      await input.run(
        input.database,
        'UPDATE memory_embedding_reindex_items SET text_hash = ? WHERE id = ?',
        [hashLongTermMemoryEmbeddingText(item.text), item.id],
      )
    }
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_memory_embedding_reindex_jobs_card_status ON memory_embedding_reindex_jobs(card_id, status, updated_at ASC)')
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_memory_embedding_reindex_items_claim ON memory_embedding_reindex_items(job_id, status, next_retry_at ASC, created_at ASC)')
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_memory_embedding_reindex_items_lease ON memory_embedding_reindex_items(status, lease_expires_at ASC)')
    await recoverExpiredLeases()
  }

  async function recoverExpiredLeasesInternal() {
    const now = input.now()
    const expired = await input.all<{
      id: string
      job_id: string
      attempt_count: number
      job_status: MemoryEmbeddingReindexJobStatus
      max_attempts: number
    }>(
      input.database,
      `SELECT item.id, item.job_id, item.attempt_count,
              job.status AS job_status, job.max_attempts
       FROM memory_embedding_reindex_items item
       JOIN memory_embedding_reindex_jobs job ON job.id = item.job_id
       WHERE item.status = 'leased'
         AND (item.lease_expires_at IS NULL OR item.lease_expires_at <= ?)`,
      [now],
    )
    const recoveryError = 'embedding reindex item lease expired during crash recovery'
    const affectedJobIds = new Set<string>()
    for (const item of expired) {
      const status: MemoryEmbeddingReindexItemStatus = item.job_status === 'cancel_requested'
        ? 'cancelled'
        : item.attempt_count >= item.max_attempts
          ? 'dead-lettered'
          : 'retryable'
      const nextRetryAt = status === 'retryable'
        ? now + calculateBackoff(item.attempt_count, retryBaseMs, retryMaxMs)
        : null
      await input.run(input.database, `
        UPDATE memory_embedding_reindex_items
        SET status = ?, lease_token = NULL, lease_expires_at = NULL, next_retry_at = ?,
            last_error = ?, updated_at = ?
        WHERE id = ?
      `, [status, nextRetryAt, status === 'cancelled' ? null : recoveryError, now, item.id])
      if (status === 'dead-lettered') {
        await input.run(input.database, `
          UPDATE memory_embedding_reindex_jobs
          SET last_error = ?, updated_at = ?
          WHERE id = ?
        `, [recoveryError, now, item.job_id])
      }
      affectedJobIds.add(item.job_id)
    }

    const cancellableJobs = await input.all<{ id: string }>(
      input.database,
      `SELECT job.id
       FROM memory_embedding_reindex_jobs job
       WHERE job.status = 'cancel_requested'
         AND NOT EXISTS (
           SELECT 1
           FROM memory_embedding_reindex_items item
           WHERE item.job_id = job.id AND item.status = 'leased'
         )`,
    )
    for (const job of cancellableJobs) {
      await input.run(input.database, `
        UPDATE memory_embedding_reindex_items
        SET status = 'cancelled', lease_token = NULL, lease_expires_at = NULL,
            next_retry_at = NULL, updated_at = ?
        WHERE job_id = ? AND status IN ('pending', 'retryable')
      `, [now, job.id])
      affectedJobIds.add(job.id)
    }

    for (const jobId of affectedJobIds)
      await refreshJobState(jobId)
    return expired.length
  }

  async function recoverExpiredLeases() {
    return await input.enqueueWrite(async () => {
      return await input.runInTransaction(input.database, async () => {
        return await recoverExpiredLeasesInternal()
      })
    })
  }

  async function readJobRow(jobId: string, expectedCardId?: string) {
    const row = await input.get<MemoryEmbeddingReindexJobRow>(
      input.database,
      'SELECT * FROM memory_embedding_reindex_jobs WHERE id = ?',
      [jobId],
    )
    if (!row)
      throw new Error(`embedding reindex job not found: ${jobId}`)
    const normalizedExpectedCardId = normalizeText(expectedCardId, 120)
    if (normalizedExpectedCardId && row.card_id !== normalizedExpectedCardId)
      throw new Error(`embedding reindex job does not belong to card: ${normalizedExpectedCardId}`)
    return row
  }

  async function refreshJobState(jobId: string) {
    const job = await readJobRow(jobId)
    const counts = await input.all<MemoryEmbeddingReindexStatusCountRow>(
      input.database,
      `SELECT status, COUNT(*) AS count
       FROM memory_embedding_reindex_items
       WHERE job_id = ?
       GROUP BY status`,
      [jobId],
    )
    const countByStatus = new Map(counts.map(row => [row.status, Number(row.count)]))
    const pending = countByStatus.get('pending') ?? 0
    const leased = countByStatus.get('leased') ?? 0
    const retryable = countByStatus.get('retryable') ?? 0
    const deadLettered = countByStatus.get('dead-lettered') ?? 0
    const indexed = countByStatus.get('indexed') ?? 0
    const now = input.now()
    let nextStatus = job.status
    let completedAt = job.completed_at

    if (job.status === 'cancel_requested' && leased === 0) {
      nextStatus = 'cancelled'
      completedAt = completedAt ?? now
    }
    else if (!['completed', 'cancelled', 'failed'].includes(job.status) && pending + leased + retryable === 0) {
      nextStatus = deadLettered > 0 ? 'failed' : 'completed'
      completedAt = completedAt ?? now
    }
    else if (job.status === 'queued' && (leased > 0 || indexed > 0 || retryable > 0 || deadLettered > 0)) {
      nextStatus = 'running'
    }

    const lastError = nextStatus === 'completed' ? null : job.last_error
    if (nextStatus !== job.status || completedAt !== job.completed_at || lastError !== job.last_error) {
      await input.run(input.database, `
        UPDATE memory_embedding_reindex_jobs
        SET status = ?, last_error = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
      `, [nextStatus, lastError, completedAt, now, jobId])
    }
    return nextStatus
  }

  async function getReindexJob(jobId: string, expectedCardId?: string): Promise<MemoryEmbeddingReindexProgress> {
    const counts = await input.all<MemoryEmbeddingReindexStatusCountRow>(
      input.database,
      `SELECT status, COUNT(*) AS count
       FROM memory_embedding_reindex_items
       WHERE job_id = ?
       GROUP BY status`,
      [jobId],
    )
    const countByStatus = new Map(counts.map(row => [row.status, Number(row.count)]))
    const total = [...countByStatus.values()].reduce((sum, value) => sum + value, 0)
    const indexed = countByStatus.get('indexed') ?? 0
    const deadLettered = countByStatus.get('dead-lettered') ?? 0
    const cancelled = countByStatus.get('cancelled') ?? 0
    const nextRetry = await input.get<{ next_retry_at: number | null }>(
      input.database,
      `SELECT MIN(next_retry_at) AS next_retry_at
       FROM memory_embedding_reindex_items
       WHERE job_id = ? AND status = 'retryable'`,
      [jobId],
    )
    const updatedJob = await readJobRow(jobId, expectedCardId)
    return {
      jobId: updatedJob.id,
      cardId: updatedJob.card_id,
      status: updatedJob.status,
      modelId: updatedJob.model_id,
      dimensions: updatedJob.dimensions,
      vectorSpaceId: updatedJob.vector_space_id,
      total,
      pending: countByStatus.get('pending') ?? 0,
      leased: countByStatus.get('leased') ?? 0,
      indexed,
      retryable: countByStatus.get('retryable') ?? 0,
      deadLettered,
      cancelled,
      progress: total === 0 ? 1 : Math.min(1, (indexed + deadLettered + cancelled) / total),
      lastError: updatedJob.last_error,
      createdAt: updatedJob.created_at,
      updatedAt: updatedJob.updated_at,
      startedAt: updatedJob.started_at,
      completedAt: updatedJob.completed_at,
      nextRetryAt: nextRetry?.next_retry_at ?? null,
    }
  }

  async function getLatestReindexJob(cardId: string): Promise<MemoryEmbeddingReindexProgress | null> {
    const normalizedCardId = normalizeText(cardId, 120)
    if (!normalizedCardId)
      return null
    const row = await input.get<{ id: string }>(
      input.database,
      `
      SELECT id
      FROM memory_embedding_reindex_jobs
      WHERE card_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      `,
      [normalizedCardId],
    )
    return row ? await getReindexJob(row.id, normalizedCardId) : null
  }

  async function scheduleReindexJob(inputData: {
    cardId: string
    modelId?: string
    dimensions?: number
    vectorSpaceId?: string
    entries: MemoryEmbeddingReindexEntry[]
  }) {
    if (stopping)
      throw new Error('embedding reindex runtime is stopping')
    const cardId = normalizeText(inputData.cardId, 120)
    const provider = resolveProvider()
    const modelId = normalizeText(inputData.modelId ?? provider?.modelId, 160)
    const dimensions = normalizePositiveInteger(inputData.dimensions ?? provider?.dimensions, provider?.dimensions ?? 1)
    const vectorSpaceId = normalizeText(inputData.vectorSpaceId, 240)
      || resolveLongTermMemoryVectorSpaceId({
        modelId,
        dimensions,
        vectorSpaceId: provider?.vectorSpaceId,
      })
    if (!cardId || !modelId || dimensions < 1 || !vectorSpaceId)
      throw new Error('embedding reindex requires cardId, modelId, dimensions, and vectorSpaceId')

    const entries = [...new Map(inputData.entries
      .map((entry) => {
        const text = normalizeLongTermMemoryEmbeddingText(entry.text)
        const expectedTextHash = hashLongTermMemoryEmbeddingText(text)
        const providedTextHash = normalizeText(entry.textHash, 64)
        if (providedTextHash && providedTextHash !== expectedTextHash)
          throw new Error(`embedding reindex text hash mismatch for ${entry.source}:${entry.sourceId}`)
        return {
          sourceId: normalizeText(entry.sourceId, 240),
          source: normalizeText(entry.source, 120),
          text,
          textHash: expectedTextHash,
        }
      })
      .filter(entry => entry.sourceId && entry.source && entry.text)
      .map(entry => [`${entry.source}:${entry.sourceId}`, entry] as const)).values()]
    const jobId = input.randomUUID()
    const now = input.now()

    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        await input.run(input.database, `
          INSERT INTO memory_embedding_reindex_jobs (
            id, card_id, model_id, dimensions, vector_space_id, status, max_attempts, last_error,
            created_at, updated_at, started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?)
        `, [jobId, cardId, modelId, dimensions, vectorSpaceId, entries.length > 0 ? 'queued' : 'completed', maxAttempts, now, now, entries.length > 0 ? null : now])
        for (const entry of entries) {
          await input.run(input.database, `
            INSERT INTO memory_embedding_reindex_items (
              id, job_id, card_id, source_id, source, text, text_hash, status,
              attempt_count, lease_token, lease_expires_at, next_retry_at, last_error,
              created_at, updated_at, indexed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, NULL, ?, ?, NULL)
          `, [input.randomUUID(), jobId, cardId, entry.sourceId, entry.source, entry.text, entry.textHash, now, now])
        }
      })
    })

    return await getReindexJob(jobId)
  }

  async function claimNextBatch(inputData: { jobId: string, batchSize?: number }): Promise<ClaimedReindexItem[]> {
    const batchSize = normalizePositiveInteger(inputData.batchSize, 8, 64)
    const now = input.now()
    return await input.enqueueWrite(async () => {
      return await input.runInTransaction(input.database, async () => {
        await recoverExpiredLeasesInternal()
        const job = await readJobRow(inputData.jobId)
        if (!['queued', 'running'].includes(job.status))
          return []

        const rows = await input.all<MemoryEmbeddingReindexItemRow>(
          input.database,
          `SELECT id, job_id AS jobId, card_id AS cardId, source_id AS sourceId, source, text,
                text_hash AS textHash,
                attempt_count AS attemptCount, lease_token AS leaseToken,
                lease_expires_at AS leaseExpiresAt, next_retry_at AS nextRetryAt
         FROM memory_embedding_reindex_items
         WHERE job_id = ? AND status IN ('pending', 'retryable')
           AND (next_retry_at IS NULL OR next_retry_at <= ?)
         ORDER BY created_at ASC
         LIMIT ?`,
          [inputData.jobId, now, batchSize],
        )
        const claimed: ClaimedReindexItem[] = []
        for (const row of rows) {
          const leaseToken = input.randomUUID()
          const attemptCount = Number(row.attemptCount) + 1
          await input.run(input.database, `
          UPDATE memory_embedding_reindex_items
          SET status = 'leased', attempt_count = ?, lease_token = ?, lease_expires_at = ?,
              next_retry_at = NULL, updated_at = ?
          WHERE id = ? AND status IN ('pending', 'retryable')
        `, [attemptCount, leaseToken, now + leaseMs, now, row.id])
          claimed.push({
            id: row.id,
            jobId: inputData.jobId,
            cardId: job.card_id,
            sourceId: row.sourceId,
            source: row.source,
            text: row.text,
            textHash: row.textHash,
            attemptCount,
            leaseToken,
            leaseExpiresAt: now + leaseMs,
            nextRetryAt: null,
            modelId: job.model_id,
            dimensions: job.dimensions,
            vectorSpaceId: job.vector_space_id,
          })
        }
        if (claimed.length > 0) {
          await input.run(input.database, `
          UPDATE memory_embedding_reindex_jobs
          SET status = 'running', started_at = COALESCE(started_at, ?), updated_at = ?
          WHERE id = ?
        `, [now, now, inputData.jobId])
        }
        return claimed
      })
    })
  }

  async function markItemSuccess(item: ClaimedReindexItem) {
    const now = input.now()
    await input.enqueueWrite(async () => {
      const job = await readJobRow(item.jobId)
      if (job.status === 'cancel_requested') {
        await input.run(input.database, `
          UPDATE memory_embedding_reindex_items
          SET status = 'cancelled', lease_token = NULL, lease_expires_at = NULL, updated_at = ?
          WHERE id = ? AND status = 'leased' AND lease_token = ?
        `, [now, item.id, item.leaseToken])
        return
      }
      await input.run(input.database, `
        UPDATE memory_embedding_reindex_items
        SET status = 'indexed', lease_token = NULL, lease_expires_at = NULL,
            last_error = NULL, next_retry_at = NULL, indexed_at = ?, updated_at = ?
        WHERE id = ? AND status = 'leased' AND lease_token = ?
      `, [now, now, item.id, item.leaseToken])
    })
  }

  async function markItemFailure(item: ClaimedReindexItem, error: unknown) {
    const message = errorText(error)
    const now = input.now()
    await input.enqueueWrite(async () => {
      const job = await readJobRow(item.jobId)
      if (job.status === 'cancel_requested') {
        await input.run(input.database, `
          UPDATE memory_embedding_reindex_items
          SET status = 'cancelled', lease_token = NULL, lease_expires_at = NULL,
              last_error = ?, updated_at = ?
          WHERE id = ? AND status = 'leased' AND lease_token = ?
        `, [message, now, item.id, item.leaseToken])
        return
      }
      const terminal = item.attemptCount >= job.max_attempts
      const status: MemoryEmbeddingReindexItemStatus = terminal ? 'dead-lettered' : 'retryable'
      const nextRetryAt = terminal ? null : now + calculateBackoff(item.attemptCount, retryBaseMs, retryMaxMs)
      await input.run(input.database, `
        UPDATE memory_embedding_reindex_items
        SET status = ?, lease_token = NULL, lease_expires_at = NULL, next_retry_at = ?,
            last_error = ?, updated_at = ?
        WHERE id = ? AND status = 'leased' AND lease_token = ?
      `, [status, nextRetryAt, message, now, item.id, item.leaseToken])
      await input.run(input.database, `
        UPDATE memory_embedding_reindex_jobs
        SET last_error = ?, updated_at = ?
        WHERE id = ?
      `, [message, now, item.jobId])
    })
  }

  async function canCommitItem(item: ClaimedReindexItem) {
    const row = await input.get<{ job_status: MemoryEmbeddingReindexJobStatus, item_status: MemoryEmbeddingReindexItemStatus, lease_token: string | null }>(
      input.database,
      `
      SELECT job.status AS job_status, item.status AS item_status, item.lease_token
      FROM memory_embedding_reindex_items item
      JOIN memory_embedding_reindex_jobs job ON job.id = item.job_id
      WHERE item.id = ? AND item.job_id = ?
      `,
      [item.id, item.jobId],
    )
    return row?.job_status === 'running'
      && row.item_status === 'leased'
      && row.lease_token === item.leaseToken
  }

  async function runNextBatch(inputData: { jobId: string, batchSize?: number }) {
    const claimed = await claimNextBatch(inputData)
    for (const item of claimed) {
      try {
        const provider = resolveProvider()
        if (!provider)
          throw new Error('embedding provider is not configured')
        if (provider.modelId !== item.modelId || provider.dimensions !== item.dimensions) {
          throw new Error(
            `embedding provider model changed during reindex (job=${item.modelId}/${item.dimensions}, active=${provider.modelId}/${provider.dimensions})`,
          )
        }
        const activeVectorSpaceId = resolveLongTermMemoryVectorSpaceId(provider)
        if (activeVectorSpaceId !== item.vectorSpaceId) {
          throw new Error(
            `embedding provider vector space changed during reindex (job=${item.vectorSpaceId}, active=${activeVectorSpaceId})`,
          )
        }
        const embedded = await provider.embedTexts([item.text])
        const result = embedded.find(candidate => candidate.text.trim() === item.text.trim()) ?? embedded[0]
        if (!result || !isValidVector(result.vector, item.dimensions))
          throw new Error(`embedding provider returned invalid vector dimensions (${item.dimensions})`)
        if (!await canCommitItem(item)) {
          await markItemSuccess(item)
          continue
        }
        await input.upsertVector({
          cardId: item.cardId,
          sourceId: item.sourceId,
          source: item.source,
          text: item.text,
          textHash: item.textHash,
          vector: result.vector,
          modelId: item.modelId,
          dimensions: item.dimensions,
          vectorSpaceId: item.vectorSpaceId,
        })
        await markItemSuccess(item)
      }
      catch (error) {
        await markItemFailure(item, error)
      }
    }
    await input.enqueueWrite(async () => {
      await refreshJobState(inputData.jobId)
    })
    return await getReindexJob(inputData.jobId)
  }

  async function requestCancel(jobId: string, reason = '用户取消 embedding 重建', expectedCardId?: string) {
    const now = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        const job = await readJobRow(jobId, expectedCardId)
        if (['completed', 'cancelled', 'failed'].includes(job.status))
          return
        await input.run(input.database, `
          UPDATE memory_embedding_reindex_jobs
          SET status = 'cancel_requested', last_error = ?, updated_at = ?
          WHERE id = ?
        `, [normalizeText(reason, 300) || '用户取消 embedding 重建', now, jobId])
        await input.run(input.database, `
          UPDATE memory_embedding_reindex_items
          SET status = 'cancelled', next_retry_at = NULL, updated_at = ?
          WHERE job_id = ? AND status IN ('pending', 'retryable')
        `, [now, jobId])
      })
    })
    await input.enqueueWrite(async () => {
      await refreshJobState(jobId)
    })
    return await getReindexJob(jobId, expectedCardId)
  }

  async function listDeadLetterItems(
    jobId: string,
    expectedCardId?: string,
  ): Promise<MemoryEmbeddingReindexDeadLetterItem[]> {
    const job = await readJobRow(jobId, expectedCardId)
    const rows = await input.all<{
      itemId: string
      source: string
      sourceId: string
      attemptCount: number
      lastError: string | null
    }>(
      input.database,
      `SELECT id AS itemId, source, source_id AS sourceId,
              attempt_count AS attemptCount, last_error AS lastError
       FROM memory_embedding_reindex_items
       WHERE job_id = ? AND card_id = ? AND status = 'dead-lettered'
       ORDER BY created_at ASC, id ASC`,
      [job.id, job.card_id],
    )
    return rows.map(row => ({
      itemId: row.itemId,
      source: row.source,
      sourceId: row.sourceId,
      attemptCount: Number(row.attemptCount),
      lastError: row.lastError,
    }))
  }

  async function retryDeadLetterItems(jobId: string, itemIds?: string[], expectedCardId?: string) {
    const now = input.now()
    const hasExplicitSelection = itemIds !== undefined
    const normalizedItemIds = [...new Set((itemIds ?? []).map(id => normalizeText(id, 240)).filter(Boolean))]
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        const job = await readJobRow(jobId, expectedCardId)
        if (hasExplicitSelection && normalizedItemIds.length === 0)
          return
        const filter = hasExplicitSelection
          ? ` AND id IN (${normalizedItemIds.map(() => '?').join(', ')})`
          : ''
        const selected = await input.get<{ count: number }>(
          input.database,
          `SELECT COUNT(*) AS count
           FROM memory_embedding_reindex_items
           WHERE job_id = ? AND card_id = ? AND status = 'dead-lettered'${filter}`,
          [jobId, job.card_id, ...normalizedItemIds],
        )
        if (Number(selected?.count ?? 0) === 0)
          return
        await input.run(input.database, `
          UPDATE memory_embedding_reindex_items
          SET status = 'pending', attempt_count = 0, lease_token = NULL,
              lease_expires_at = NULL, next_retry_at = NULL, last_error = NULL, updated_at = ?
          WHERE job_id = ? AND card_id = ? AND status = 'dead-lettered'${filter}
        `, [now, jobId, job.card_id, ...normalizedItemIds])
        await input.run(input.database, `
          UPDATE memory_embedding_reindex_jobs
          SET status = 'queued', last_error = NULL, completed_at = NULL, updated_at = ?
          WHERE id = ?
        `, [now, jobId])
      })
    })
    return await getReindexJob(jobId, expectedCardId)
  }

  function runJob(jobId: string, batchSize = 8) {
    const active = activeWorkers.get(jobId)
    if (active)
      return active
    if (stopping)
      return Promise.resolve()

    const worker = (async () => {
      try {
        while (!stopping) {
          const progress = await runNextBatch({ jobId, batchSize })
          if (progress.leased === 0 && progress.pending === 0 && progress.retryable === 0)
            break
          if (progress.status === 'cancel_requested' || progress.status === 'cancelled' || progress.status === 'failed')
            break
          if (progress.leased === 0 && progress.nextRetryAt && progress.nextRetryAt > input.now())
            await wait(Math.min(1_000, Math.max(50, progress.nextRetryAt - input.now())))
        }
      }
      finally {
        activeWorkers.delete(jobId)
      }
    })()
    activeWorkers.set(jobId, worker)
    return worker
  }

  async function resumePendingJobs(batchSize = 8, cardId?: string) {
    if (stopping || !resolveProvider())
      return []
    await recoverExpiredLeases()
    const normalizedCardId = normalizeText(cardId, 120)
    const jobs = await input.all<{ id: string }>(
      input.database,
      `SELECT id
       FROM memory_embedding_reindex_jobs
       WHERE status IN ('queued', 'running')
         ${normalizedCardId ? 'AND card_id = ?' : ''}
       ORDER BY created_at ASC`,
      normalizedCardId ? [normalizedCardId] : [],
    )
    for (const job of jobs)
      void runJob(job.id, batchSize)
    return jobs.map(job => job.id)
  }

  async function stop() {
    stopping = true
    await Promise.allSettled(activeWorkers.values())
  }

  return {
    initializeSchema,
    scheduleReindexJob,
    getReindexJob,
    getLatestReindexJob,
    claimNextBatch,
    runNextBatch,
    runJob,
    resumePendingJobs,
    recoverExpiredLeases,
    requestCancel,
    listDeadLetterItems,
    retryDeadLetterItems,
    stop,
  }
}
