import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'
import type { ReindexVectorCommitInput } from './memory-embedding-reindex-runtime'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { createMemoryEmbeddingReindexRuntime } from './memory-embedding-reindex-runtime'

interface SqliteHarness {
  database: sqlite3.Database
  run: (sql: string, params?: unknown[]) => Promise<void>
  get: <T>(sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(sql: string, params?: unknown[]) => Promise<T[]>
  close: () => Promise<void>
}

const harnesses: SqliteHarness[] = []

function createSqliteHarness(): Promise<SqliteHarness> {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(':memory:', (error) => {
      if (error) {
        reject(error)
        return
      }

      const harness: SqliteHarness = {
        database,
        run: (sql, params = []) => new Promise<void>((runResolve, runReject) => {
          database.run(sql, params, runError => runError ? runReject(runError) : runResolve())
        }),
        get: (sql, params = []) => new Promise((getResolve, getReject) => {
          database.get(sql, params, (getError, row) => getError ? getReject(getError) : getResolve(row as any))
        }),
        all: (sql, params = []) => new Promise((allResolve, allReject) => {
          database.all(sql, params, (allError, rows) => allError ? allReject(allError) : allResolve((rows ?? []) as any))
        }),
        close: () => new Promise<void>((closeResolve, closeReject) => {
          database.close(error => error ? closeReject(error) : closeResolve())
        }),
      }
      harnesses.push(harness)
      resolve(harness)
    })
  })
}

function attachRuntime(harness: SqliteHarness, input?: {
  now?: () => number
  provider?: LongTermMemoryEmbeddingProvider
  resolveProvider?: () => LongTermMemoryEmbeddingProvider | null
  enqueueWrite?: <T>(task: () => Promise<T>) => Promise<T>
  prepareProjectionEntries?: (input: { signal: AbortSignal }) => Promise<Array<{
    sourceId: string
    source: string
    text: string
    textHash?: string
  }>>
  maxAttempts?: number
  leaseMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
  commitVectorAndItem?: (input: ReindexVectorCommitInput) => Promise<boolean>
}) {
  const vectors: Array<{ sourceId: string, text: string }> = []
  const vectorSpaces: Array<{
    sourceId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
  }> = []
  let writeQueue = Promise.resolve<unknown>(undefined)
  const defaultEnqueueWrite = async <T>(task: () => Promise<T>) => {
    const next = writeQueue.then(task, task)
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }
  const enqueueWrite = input?.enqueueWrite ?? defaultEnqueueWrite
  const withTestVectorSpace = (provider: LongTermMemoryEmbeddingProvider | null | undefined) => {
    if (!provider)
      return provider
    return provider.vectorSpaceId
      ? provider
      : {
          ...provider,
          vectorSpaceId: `test:${provider.modelId}:${provider.dimensions}`,
        }
  }
  const resolveProvider = input?.resolveProvider
  const runtime = createMemoryEmbeddingReindexRuntime({
    database: harness.database,
    now: input?.now ?? (() => 1_000),
    randomUUID: () => `uuid-${Math.random()}`,
    run: async (_database: sqlite3.Database, sql, params = []) => await harness.run(sql, params),
    get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.get<T>(sql, params),
    all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.all<T>(sql, params),
    enqueueWrite,
    runInTransaction: async <T>(_database: sqlite3.Database, task: () => Promise<T>) => {
      await harness.run('BEGIN IMMEDIATE')
      try {
        const result = await task()
        await harness.run('COMMIT')
        return result
      }
      catch (error) {
        await harness.run('ROLLBACK')
        throw error
      }
    },
    provider: withTestVectorSpace(input?.provider ?? {
      modelId: 'test-embedding',
      dimensions: 3,
      embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
    }),
    resolveProvider: resolveProvider
      ? () => withTestVectorSpace(resolveProvider()) ?? null
      : undefined,
    prepareProjectionEntries: input?.prepareProjectionEntries,
    upsertVector: async (record) => {
      if (record.status !== 'stale') {
        vectors.push({ sourceId: record.sourceId, text: record.text })
        vectorSpaces.push({
          sourceId: record.sourceId,
          modelId: record.modelId,
          dimensions: record.dimensions,
          vectorSpaceId: record.vectorSpaceId,
        })
      }
    },
    maxAttempts: input?.maxAttempts ?? 2,
    leaseMs: input?.leaseMs ?? 100,
    retryBaseMs: input?.retryBaseMs,
    retryMaxMs: input?.retryMaxMs,
    commitVectorAndItem: input?.commitVectorAndItem,
  })
  return { runtime, vectors, vectorSpaces, enqueueWrite }
}

function createRuntimeHarness(input?: {
  now?: () => number
  provider?: LongTermMemoryEmbeddingProvider
  resolveProvider?: () => LongTermMemoryEmbeddingProvider | null
  prepareProjectionEntries?: (input: { signal: AbortSignal }) => Promise<Array<{
    sourceId: string
    source: string
    text: string
    textHash?: string
  }>>
  maxAttempts?: number
  leaseMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
  commitVectorAndItem?: (input: ReindexVectorCommitInput) => Promise<boolean>
}) {
  return createSqliteHarness().then(async (harness) => {
    const attached = attachRuntime(harness, input)
    const { runtime } = attached
    await runtime.initializeSchema()
    return { harness, ...attached }
  })
}

afterEach(async () => {
  await Promise.all(harnesses.splice(0).map(harness => harness.close()))
})

describe('memory embedding reindex runtime', () => {
  it('fails legacy jobs with unknown vector spaces instead of guessing from model and dimensions', async () => {
    const harness = await createSqliteHarness()
    await harness.run(`
      CREATE TABLE memory_embedding_reindex_jobs (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        status TEXT NOT NULL,
        max_attempts INTEGER NOT NULL,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER
      )
    `)
    for (const id of ['legacy-provider-a', 'legacy-provider-b']) {
      await harness.run(
        `
        INSERT INTO memory_embedding_reindex_jobs (
          id, card_id, model_id, dimensions, status, max_attempts,
          last_error, created_at, updated_at, started_at, completed_at
        ) VALUES (?, 'card-a', 'same-model', 3, 'queued', 3, NULL, 1, 1, NULL, NULL)
        `,
        [id],
      )
    }

    const { runtime } = attachRuntime(harness)
    await runtime.initializeSchema()
    const rows = await harness.all<{
      id: string
      status: string
      vector_space_id: string
      last_error: string | null
    }>(`
      SELECT id, status, vector_space_id, last_error
      FROM memory_embedding_reindex_jobs
      ORDER BY id ASC
    `)

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'legacy-provider-a',
        status: 'failed',
        vector_space_id: '',
        last_error: expect.stringContaining('could not determine its vector space'),
      }),
      expect.objectContaining({
        id: 'legacy-provider-b',
        status: 'failed',
        vector_space_id: '',
        last_error: expect.stringContaining('could not determine its vector space'),
      }),
    ])
  })

  it('persists provider-unavailable jobs as paused and resumes them after the provider returns', async () => {
    let provider: LongTermMemoryEmbeddingProvider | null = null
    const { runtime, vectors } = await createRuntimeHarness({
      resolveProvider: () => provider,
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: 'model-a:3',
      entries: [{
        sourceId: 'memory-paused',
        source: 'memory_reflections',
        text: '等待 embedding provider',
      }],
    })

    expect((await runtime.resumePendingJobs()).length).toBe(0)
    await expect(runtime.getReindexJob(job.jobId)).resolves.toMatchObject({
      status: 'paused',
      lastError: 'embedding provider is not configured',
    })

    provider = {
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: 'model-a:3',
      embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
    }
    const resumed = await runtime.resumePendingJobs()
    expect(resumed).toEqual([job.jobId])
    await runtime.runJob(job.jobId)
    await expect(runtime.getReindexJob(job.jobId)).resolves.toMatchObject({
      status: 'completed',
      indexed: 1,
      lastError: null,
    })
    expect(vectors).toEqual([{ sourceId: 'memory-paused', text: '等待 embedding provider' }])
  })

  it('persists an unexpected worker failure as a failed job before rethrowing it', async () => {
    const { runtime, harness } = await createRuntimeHarness()
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{
        sourceId: 'memory-db-failure',
        source: 'memory_reflections',
        text: '数据库异常',
      }],
    })
    await harness.run('DROP TABLE memory_embedding_reindex_items')

    await expect(runtime.runJob(job.jobId)).rejects.toThrow('no such table')
    await expect(harness.get<{ status: string, stage: string, last_error: string | null }>(`
      SELECT status, stage, last_error
      FROM memory_embedding_reindex_jobs
      WHERE id = ?
    `, [job.jobId])).resolves.toMatchObject({
      status: 'failed',
      stage: 'failed',
      last_error: expect.stringContaining('no such table'),
    })
  })

  it('persists projection refresh as a durable first phase before embedding indexing', async () => {
    let projectionRefreshes = 0
    const { runtime, vectors } = await createRuntimeHarness({
      prepareProjectionEntries: async () => {
        projectionRefreshes += 1
        return [{
          sourceId: 'memory-projection',
          source: 'memory_reflections',
          text: '投影刷新后的记忆',
        }]
      },
    })

    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      projection: {
        source: 'memory_reflections',
        sourceIds: ['memory-projection'],
        limit: 1,
      },
    })

    expect(job.stage).toBe('projection-refresh-queued')
    expect(job.total).toBe(0)
    await runtime.runJob(job.jobId)

    const completed = await runtime.getReindexJob(job.jobId)
    expect(projectionRefreshes).toBe(1)
    expect(completed.stage).toBe('completed')
    expect(completed.indexed).toBe(1)
    expect(vectors).toEqual([{ sourceId: 'memory-projection', text: '投影刷新后的记忆' }])
  })

  it('does not report a queued projection refresh as 100 percent complete', async () => {
    const { runtime } = await createRuntimeHarness({
      prepareProjectionEntries: async () => [],
    })

    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      projection: {
        source: 'memory_reflections',
      },
    })

    expect(job.stage).toBe('projection-refresh-queued')
    expect(job.total).toBe(0)
    expect(job.progress).toBe(0)
  })

  it('deduplicates active projection jobs by card, vector space, and projection scope', async () => {
    const { runtime } = await createRuntimeHarness({
      prepareProjectionEntries: async () => [],
    })

    const first = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      projection: {
        source: 'memory_reflections',
        sourceIds: ['memory-1', 'memory-2'],
        limit: 10,
      },
    })
    const sameScope = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      projection: {
        source: 'memory_reflections',
        sourceIds: ['memory-1', 'memory-2'],
        limit: 10,
      },
    })
    const sameScopeReordered = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      projection: {
        source: 'memory_reflections',
        sourceIds: ['memory-2', 'memory-1'],
        limit: 10,
      },
    })
    const differentCard = await runtime.scheduleReindexJob({
      cardId: 'card-b',
      projection: {
        source: 'memory_reflections',
        sourceIds: ['memory-1'],
        limit: 10,
      },
    })
    const differentSpace = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      vectorSpaceId: 'provider-space-v2',
      projection: {
        source: 'memory_reflections',
        sourceIds: ['memory-1'],
        limit: 10,
      },
    })

    expect(sameScope.jobId).toBe(first.jobId)
    expect(sameScopeReordered.jobId).toBe(first.jobId)
    expect(differentCard.jobId).not.toBe(first.jobId)
    expect(differentSpace.jobId).not.toBe(first.jobId)
  })

  it('returns the latest reindex job only from the requested vector space', async () => {
    const { runtime } = await createRuntimeHarness({
      prepareProjectionEntries: async () => [],
    })

    const spaceA = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: 'space-a',
      projection: {
        source: 'memory_reflections',
      },
    })
    const spaceB = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      modelId: 'model-b',
      dimensions: 4,
      vectorSpaceId: 'space-b',
      projection: {
        source: 'memory_reflections',
      },
    })

    await expect(runtime.getLatestReindexJob('card-a', 'space-a')).resolves.toMatchObject({
      jobId: spaceA.jobId,
      vectorSpaceId: 'space-a',
    })
    await expect(runtime.getLatestReindexJob('card-a', 'space-b')).resolves.toMatchObject({
      jobId: spaceB.jobId,
      vectorSpaceId: 'space-b',
    })
  })

  it('claims a projection refresh once across concurrent runtimes', async () => {
    const harness = await createSqliteHarness()
    let writeQueue = Promise.resolve<unknown>(undefined)
    const enqueueWrite = async <T>(task: () => Promise<T>) => {
      const next = writeQueue.then(task, task)
      writeQueue = next.then(() => undefined, () => undefined)
      return await next
    }
    let projectionRefreshes = 0
    const prepareProjectionEntries = async () => {
      projectionRefreshes += 1
      await new Promise(resolve => setTimeout(resolve, 5))
      return [{
        sourceId: 'memory-projection',
        source: 'memory_reflections',
        text: '并发投影只应加载一次',
      }]
    }
    const first = attachRuntime(harness, {
      enqueueWrite,
      prepareProjectionEntries,
    })
    const second = attachRuntime(harness, {
      enqueueWrite,
      prepareProjectionEntries,
    })
    await first.runtime.initializeSchema()
    await second.runtime.initializeSchema()
    const job = await first.runtime.scheduleReindexJob({
      cardId: 'card-a',
      projection: {
        source: 'memory_reflections',
        sourceIds: ['memory-projection'],
      },
    })

    await Promise.all([
      first.runtime.runJob(job.jobId),
      second.runtime.runJob(job.jobId),
    ])

    expect(projectionRefreshes).toBe(1)
    await expect(first.runtime.getReindexJob(job.jobId)).resolves.toMatchObject({
      status: 'completed',
      indexed: 1,
    })
  })

  it('aborts an in-flight projection refresh when the durable job is cancelled', async () => {
    let projectionStarted: (() => void) | undefined
    let releaseProjection: (() => void) | undefined
    let projectionSignal: AbortSignal | undefined
    const projectionStartedPromise = new Promise<void>((resolve) => {
      projectionStarted = resolve
    })
    const projectionReleasePromise = new Promise<void>((resolve) => {
      releaseProjection = resolve
    })
    const { runtime } = await createRuntimeHarness({
      prepareProjectionEntries: async ({ signal }) => {
        projectionSignal = signal
        projectionStarted?.()
        await projectionReleasePromise
        if (signal.aborted)
          return []
        return [{
          sourceId: 'projection-cancelled',
          source: 'memory_reflections',
          text: '不会进入向量索引',
        }]
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      projection: {
        source: 'memory_reflections',
      },
    })

    const worker = runtime.runJob(job.jobId)
    await projectionStartedPromise
    const cancelled = await runtime.requestCancel(job.jobId, '用户取消投影刷新')

    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.stage).toBe('cancelled')
    expect(projectionSignal?.aborted).toBe(true)

    releaseProjection?.()
    await worker
    const completed = await runtime.getReindexJob(job.jobId)
    expect(completed.status).toBe('cancelled')
    expect(completed.stage).toBe('cancelled')
  })

  it('persists a queued job and reports progress without embedding during scheduling', async () => {
    let embedCalls = 0
    const { runtime } = await createRuntimeHarness({
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          embedCalls += 1
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })

    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-1', source: 'memory_reflections', text: '第一条记忆' },
        { sourceId: 'memory-2', source: 'memory_reflections', text: '第二条记忆' },
      ],
    })

    expect(job.status).toBe('queued')
    expect(job.total).toBe(2)
    expect(job.pending).toBe(2)
    expect(embedCalls).toBe(0)
  })

  it('embeds every item claimed by a worker in one provider batch', async () => {
    const embeddingCalls: string[][] = []
    const { runtime, vectors } = await createRuntimeHarness({
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          embeddingCalls.push([...texts])
          return texts.map((text, index) => ({
            text,
            vector: [index + 1, 0, 0],
          }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-1', source: 'memory_reflections', text: '第一条记忆' },
        { sourceId: 'memory-2', source: 'memory_reflections', text: '第二条记忆' },
        { sourceId: 'memory-3', source: 'memory_reflections', text: '第三条记忆' },
      ],
    })

    const completed = await runtime.runNextBatch({ jobId: job.jobId, batchSize: 3 })

    expect(embeddingCalls).toEqual([['第一条记忆', '第二条记忆', '第三条记忆']])
    expect(vectors).toEqual([
      { sourceId: 'memory-1', text: '第一条记忆' },
      { sourceId: 'memory-2', text: '第二条记忆' },
      { sourceId: 'memory-3', text: '第三条记忆' },
    ])
    expect(completed.status).toBe('completed')
    expect(completed.indexed).toBe(3)
  })

  it('rejects an incomplete provider batch without writing unmatched vectors', async () => {
    const { runtime, vectors } = await createRuntimeHarness({
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async texts => texts.slice(0, -1).map(text => ({
          text,
          vector: [1, 0, 0],
        })),
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-1', source: 'memory_reflections', text: '第一条记忆' },
        { sourceId: 'memory-2', source: 'memory_reflections', text: '第二条记忆' },
      ],
    })

    const progress = await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })

    expect(vectors).toEqual([])
    expect(progress.indexed).toBe(0)
    expect(progress.retryable).toBe(2)
    expect(progress.lastError).toContain('returned 1 embeddings for 2 texts')
  })

  it('serializes short worker transactions with the host database write queue', async () => {
    const { harness, runtime, enqueueWrite } = await createRuntimeHarness()
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '串行写入' }],
    })

    const businessWrite = enqueueWrite(async () => {
      await harness.run('BEGIN IMMEDIATE')
      await new Promise(resolve => setTimeout(resolve, 5))
      await harness.run('COMMIT')
    })

    await expect(Promise.all([
      businessWrite,
      runtime.claimNextBatch({ jobId: job.jobId, batchSize: 1 }),
    ])).resolves.toBeDefined()
  })

  it('recovers expired leases after a process crash and makes items retryable', async () => {
    let now = 1_000
    const { runtime } = await createRuntimeHarness({ now: () => now })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '可恢复记忆' }],
    })

    await runtime.claimNextBatch({ jobId: job.jobId, batchSize: 1 })
    now = 1_101
    const recovered = await runtime.recoverExpiredLeases()
    const progress = await runtime.getReindexJob(job.jobId)

    expect(recovered).toBe(1)
    expect(progress.retryable).toBe(1)
    expect(progress.lastError).toBeNull()
  })

  it('isolates one provider failure, applies exponential backoff, and exposes the final error in dead letter state', async () => {
    let now = 1_000
    const { runtime } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 2,
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          if (texts[0] === '坏记忆')
            throw new Error('embedding provider failed with HTTP 400: invalid input')
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'bad', source: 'memory_reflections', text: '坏记忆' },
        { sourceId: 'good', source: 'memory_reflections', text: '好记忆' },
      ],
    })

    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })
    let progress = await runtime.getReindexJob(job.jobId)
    expect(progress.indexed).toBe(1)
    expect(progress.retryable).toBe(1)
    expect(progress.lastError).toContain('HTTP 400')

    now = progress.nextRetryAt ?? 1_000
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })
    progress = await runtime.getReindexJob(job.jobId)

    expect(progress.deadLettered).toBe(1)
    expect(progress.status).toBe('failed')
    expect(progress.lastError).toContain('invalid input')
  })

  it('keeps the claimed batch on one provider while isolating an input-level failure', async () => {
    const providerACalls: string[][] = []
    const providerBCalls: string[][] = []
    let activeProvider: LongTermMemoryEmbeddingProvider
    const providerB: LongTermMemoryEmbeddingProvider = {
      modelId: 'test-embedding',
      dimensions: 3,
      vectorSpaceId: 'provider-b-space',
      embedTexts: async (texts) => {
        providerBCalls.push([...texts])
        return texts.map(text => ({ text, vector: [0, 1, 0] }))
      },
    }
    const providerA: LongTermMemoryEmbeddingProvider = {
      modelId: 'test-embedding',
      dimensions: 3,
      embedTexts: async (texts) => {
        providerACalls.push([...texts])
        if (texts.length > 1) {
          activeProvider = providerB
          throw new Error('embedding provider failed with HTTP 400: isolate batch input')
        }
        return texts.map(text => ({ text, vector: [1, 0, 0] }))
      },
    }
    activeProvider = providerA
    const { runtime, vectors } = await createRuntimeHarness({
      resolveProvider: () => activeProvider,
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-a', source: 'memory_reflections', text: '记忆 A' },
        { sourceId: 'memory-b', source: 'memory_reflections', text: '记忆 B' },
      ],
    })

    const progress = await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })

    expect(providerACalls).toEqual([
      ['记忆 A', '记忆 B'],
      ['记忆 A'],
      ['记忆 B'],
    ])
    expect(providerBCalls).toEqual([])
    expect(vectors).toEqual([
      { sourceId: 'memory-a', text: '记忆 A' },
      { sourceId: 'memory-b', text: '记忆 B' },
    ])
    expect(progress.status).toBe('completed')
  })

  it('clears the previous job error after all retryable items complete successfully', async () => {
    let now = 1_000
    let failedOnce = false
    const { runtime } = await createRuntimeHarness({
      now: () => now,
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          if (texts[0] === '先失败再成功' && !failedOnce) {
            failedOnce = true
            throw new Error('temporary embedding outage')
          }
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-retry', source: 'memory_reflections', text: '先失败再成功' },
        { sourceId: 'memory-ok', source: 'memory_reflections', text: '直接成功' },
      ],
    })

    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })
    let progress = await runtime.getReindexJob(job.jobId)
    expect(progress.status).toBe('running')
    expect(progress.lastError).toBe('temporary embedding outage')

    now = progress.nextRetryAt ?? now
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })
    progress = await runtime.getReindexJob(job.jobId)

    expect(progress.status).toBe('completed')
    expect(progress.lastError).toBeNull()
  })

  it('survives network jitter and rejects model-space mixing until a fresh reindex succeeds', async () => {
    let now = 1_000
    let provider: LongTermMemoryEmbeddingProvider | null = {
      modelId: 'model-a',
      dimensions: 3,
      embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
    }
    let jitterAttempts = 0
    const { runtime, vectors, vectorSpaces } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 3,
      retryBaseMs: 1,
      retryMaxMs: 4,
      resolveProvider: () => provider,
    })

    provider = {
      modelId: 'model-a',
      dimensions: 3,
      embedTexts: async (texts) => {
        jitterAttempts += 1
        await new Promise(resolve => setTimeout(resolve, Math.min(3, jitterAttempts)))
        if (jitterAttempts <= 2)
          throw new Error(`network jitter attempt ${jitterAttempts}`)
        return texts.map(text => ({ text, vector: [1, 0, 0] }))
      },
    }

    const jitterJob = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{
        sourceId: 'memory-jitter',
        source: 'memory_reflections',
        text: '网络抖动后仍然可以恢复的记忆',
      }],
    })
    let jitterProgress = await runtime.runNextBatch({
      jobId: jitterJob.jobId,
      batchSize: 1,
    })
    expect(jitterProgress).toMatchObject({
      status: 'running',
      indexed: 0,
      retryable: 1,
      deadLettered: 0,
      lastError: 'network jitter attempt 1',
    })

    while (jitterProgress.status !== 'completed') {
      now = jitterProgress.nextRetryAt ?? now
      jitterProgress = await runtime.runNextBatch({
        jobId: jitterJob.jobId,
        batchSize: 1,
      })
    }
    expect(jitterProgress).toMatchObject({
      status: 'completed',
      indexed: 1,
      retryable: 0,
      deadLettered: 0,
      lastError: null,
    })
    expect(vectors).toEqual([{
      sourceId: 'memory-jitter',
      text: '网络抖动后仍然可以恢复的记忆',
    }])
    expect(vectorSpaces).toEqual([{
      sourceId: 'memory-jitter',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: expect.stringContaining('model-a:3'),
    }])

    const switchJob = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      entries: [{
        sourceId: 'memory-switch',
        source: 'memory_reflections',
        text: '模型切换前的旧向量空间',
      }],
    })
    provider = {
      modelId: 'model-b',
      dimensions: 4,
      embedTexts: async texts => texts.map(text => ({ text, vector: [0, 1, 0, 0] })),
    }

    let switchProgress = await runtime.runNextBatch({
      jobId: switchJob.jobId,
      batchSize: 1,
    })
    expect(switchProgress.lastError).toContain('model changed during reindex')
    while (switchProgress.status !== 'failed') {
      now = switchProgress.nextRetryAt ?? now
      switchProgress = await runtime.runNextBatch({
        jobId: switchJob.jobId,
        batchSize: 1,
      })
    }
    expect(switchProgress).toMatchObject({
      status: 'failed',
      indexed: 0,
      deadLettered: 1,
    })
    expect(vectors).toHaveLength(1)
    expect(vectorSpaces).toHaveLength(1)

    const replacementJob = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{
        sourceId: 'memory-switch',
        source: 'memory_reflections',
        text: '模型切换后的新向量空间',
      }],
    })
    const replacementProgress = await runtime.runNextBatch({
      jobId: replacementJob.jobId,
      batchSize: 1,
    })

    expect(replacementProgress).toMatchObject({
      status: 'completed',
      indexed: 1,
      deadLettered: 0,
    })
    expect(vectorSpaces).toEqual([
      {
        sourceId: 'memory-jitter',
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: expect.stringContaining('model-a:3'),
      },
      {
        sourceId: 'memory-switch',
        modelId: 'model-b',
        dimensions: 4,
        vectorSpaceId: expect.stringContaining('model-b:4'),
      },
    ])
  })

  it('converges a cancel-requested job without an active lease during initialization', async () => {
    const { harness, runtime } = await createRuntimeHarness()
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-pending', source: 'memory_reflections', text: '等待取消' },
        { sourceId: 'memory-retryable', source: 'memory_reflections', text: '等待重试后取消' },
      ],
    })
    await harness.run(`
      UPDATE memory_embedding_reindex_jobs
      SET status = 'cancel_requested', last_error = '用户取消重建'
      WHERE id = ?
    `, [job.jobId])
    await harness.run(`
      UPDATE memory_embedding_reindex_items
      SET status = 'retryable', next_retry_at = ?
      WHERE job_id = ? AND source_id = 'memory-retryable'
    `, [9_999, job.jobId])

    const restarted = attachRuntime(harness)
    await restarted.runtime.initializeSchema()
    const progress = await restarted.runtime.getReindexJob(job.jobId, 'card-a')

    expect(progress.status).toBe('cancelled')
    expect(progress.cancelled).toBe(2)
    expect(progress.pending).toBe(0)
    expect(progress.retryable).toBe(0)
    expect(progress.completedAt).toBe(1_000)
    expect(progress.lastError).toBe('用户取消重建')
  })

  it('cancels pending items and reaches a terminal cancelled job state', async () => {
    const { runtime } = await createRuntimeHarness()
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-1', source: 'memory_reflections', text: '记忆一' },
        { sourceId: 'memory-2', source: 'memory_reflections', text: '记忆二' },
      ],
    })

    const cancelled = await runtime.requestCancel(job.jobId, '用户取消重建')

    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.cancelled).toBe(2)
    expect(cancelled.lastError).toBe('用户取消重建')
  })

  it('does not persist an in-flight vector after cancellation is requested', async () => {
    let releaseEmbedding: () => void = () => {}
    let embeddingStarted: (() => void) | null = null
    const embeddingStartedPromise = new Promise<void>((resolve) => {
      embeddingStarted = resolve
    })
    const { runtime, vectors } = await createRuntimeHarness({
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          embeddingStarted?.()
          await new Promise<void>((resolve) => {
            releaseEmbedding = resolve
          })
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '取消中的记忆' }],
    })

    const worker = runtime.runJob(job.jobId)
    await embeddingStartedPromise
    const cancelling = await runtime.requestCancel(job.jobId, '用户取消重建')
    expect(cancelling.status).toBe('cancel_requested')

    releaseEmbedding()
    await worker
    const completed = await runtime.getReindexJob(job.jobId)

    expect(vectors).toEqual([])
    expect(completed.status).toBe('cancelled')
    expect(completed.cancelled).toBe(1)
    expect(completed.indexed).toBe(0)
  })

  it('aborts the active provider batch immediately when cancellation is requested', async () => {
    let observedSignal: AbortSignal | undefined
    let releaseEmbedding: (() => void) | undefined
    let embeddingStarted: (() => void) | undefined
    const embeddingStartedPromise = new Promise<void>((resolve) => {
      embeddingStarted = resolve
    })
    const { runtime, vectors } = await createRuntimeHarness({
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts, signal) => {
          observedSignal = signal
          embeddingStarted?.()
          await new Promise<void>((resolve, reject) => {
            releaseEmbedding = resolve
            signal?.addEventListener('abort', () => {
              reject(signal.reason ?? new Error('embedding request aborted'))
            }, { once: true })
          })
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-1', source: 'memory_reflections', text: '取消记忆一' },
        { sourceId: 'memory-2', source: 'memory_reflections', text: '取消记忆二' },
      ],
    })
    const worker = runtime.runJob(job.jobId, 2)

    await embeddingStartedPromise
    try {
      await runtime.requestCancel(job.jobId, '用户取消 embedding 重建')
      await worker

      expect(observedSignal?.aborted).toBe(true)
      expect(vectors).toEqual([])
      expect(await runtime.getReindexJob(job.jobId)).toMatchObject({
        cancelled: 2,
        indexed: 0,
        status: 'cancelled',
      })
    }
    finally {
      releaseEmbedding?.()
      await worker
    }
  })

  it('does not write a provider result after the claimed lease expires', async () => {
    let now = 1_000
    let releaseEmbedding: (() => void) | undefined
    let embeddingStarted: (() => void) | undefined
    const embeddingStartedPromise = new Promise<void>((resolve) => {
      embeddingStarted = resolve
    })
    const { runtime, vectors } = await createRuntimeHarness({
      now: () => now,
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          embeddingStarted?.()
          await new Promise<void>((resolve) => {
            releaseEmbedding = resolve
          })
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '租约过期的记忆' }],
    })
    const batch = runtime.runNextBatch({ jobId: job.jobId, batchSize: 1 })

    await embeddingStartedPromise
    now = 1_101
    releaseEmbedding?.()
    await batch

    expect(vectors).toEqual([])
    expect(await runtime.getReindexJob(job.jobId)).toMatchObject({
      indexed: 0,
      retryable: 1,
      status: 'running',
    })
  })

  it('fences a transaction callback that loses its lease after embedding completes', async () => {
    let commitCalls = 0
    let harnessRef: SqliteHarness | undefined
    const { runtime, harness } = await createRuntimeHarness({
      commitVectorAndItem: async ({ item }) => {
        commitCalls += 1
        await harnessRef?.run(`
          UPDATE memory_embedding_reindex_jobs
          SET status = 'cancel_requested'
          WHERE id = ?
        `, [item.jobId])
        await harnessRef?.run(`
          UPDATE memory_embedding_reindex_items
          SET status = 'cancelled', lease_token = NULL, lease_expires_at = NULL
          WHERE id = ?
        `, [item.id])
        return false
      },
    })
    harnessRef = harness
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '租约失效后不写入' }],
    })
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 1 })

    const progress = await runtime.getReindexJob(job.jobId)
    const item = await harness.get<{ status: string, lease_token: string | null }>(
      `
      SELECT status, lease_token
      FROM memory_embedding_reindex_items
      WHERE job_id = ?
      `,
      [job.jobId],
    )
    expect(commitCalls).toBe(1)
    expect(item?.lease_token).toBeNull()
    expect(item?.status).toBe('cancelled')
    expect(progress.status).toBe('cancelled')
  })

  it('renews claimed leases before committing a long batch', async () => {
    let now = 1_000
    let commitCalls = 0
    const leaseChecks: boolean[] = []
    let harnessRef: SqliteHarness | undefined
    const { runtime, harness } = await createRuntimeHarness({
      now: () => now,
      leaseMs: 100,
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          now = 1_095
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
      commitVectorAndItem: async ({ item }) => {
        commitCalls += 1
        const row = await harnessRef?.get<{ lease_expires_at: number | null }>(
          'SELECT lease_expires_at FROM memory_embedding_reindex_items WHERE id = ?',
          [item.id],
        )
        leaseChecks.push(row?.lease_expires_at != null && row.lease_expires_at > now)
        await harnessRef?.run(`
          UPDATE memory_embedding_reindex_items
          SET status = 'indexed', lease_token = NULL, lease_expires_at = NULL,
              indexed_at = ?, updated_at = ?
          WHERE id = ? AND status = 'leased' AND lease_token = ?
        `, [now, now, item.id, item.leaseToken])
        now += 10
        return true
      },
    })
    harnessRef = harness
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-1', source: 'memory_reflections', text: '租约批处理一' },
        { sourceId: 'memory-2', source: 'memory_reflections', text: '租约批处理二' },
      ],
    })

    const progress = await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })

    expect(commitCalls).toBe(2)
    expect(leaseChecks).toEqual([true, true])
    expect(progress.indexed).toBe(2)
    expect(progress.retryable).toBe(0)
  })

  it('retries a transient projection refresh and only indexes the refreshed projection', async () => {
    let projectionAttempts = 0
    const { runtime } = await createRuntimeHarness({
      now: () => Date.now(),
      retryBaseMs: 1,
      retryMaxMs: 1,
      prepareProjectionEntries: async () => {
        projectionAttempts += 1
        if (projectionAttempts === 1)
          throw new Error('projection database temporarily busy')
        return [{
          sourceId: 'projection-retry',
          source: 'memory_reflections',
          text: '投影重试后进入索引',
        }]
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      projection: { source: 'memory_reflections' },
    })
    await runtime.runJob(job.jobId)

    const progress = await runtime.getReindexJob(job.jobId)
    expect(projectionAttempts).toBe(2)
    expect(progress.status).toBe('completed')
    expect(progress.stage).toBe('completed')
    expect(progress.indexed).toBe(1)
    expect(progress.nextRetryAt).toBeNull()
  })

  it('retries dead-letter items explicitly without rerunning the whole job synchronously', async () => {
    let shouldFail = true
    const { runtime, vectors } = await createRuntimeHarness({
      maxAttempts: 1,
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          if (shouldFail)
            throw new Error('provider temporarily unavailable')
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '稍后成功' }],
    })

    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 1 })
    expect((await runtime.getReindexJob(job.jobId)).status).toBe('failed')
    expect((await runtime.getReindexJob(job.jobId)).stage).toBe('failed')

    const retried = await runtime.retryDeadLetterItems(job.jobId)
    expect(retried.status).toBe('queued')
    expect(retried.stage).toBe('embedding-indexing')
    expect(retried.pending).toBe(1)

    shouldFail = false
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 1 })
    const completed = await runtime.getReindexJob(job.jobId)
    expect(completed.status).toBe('completed')
    expect(vectors).toEqual([{ sourceId: 'memory-1', text: '稍后成功' }])
  })

  it('lists dead-letter items within the requested job and card scope', async () => {
    const { runtime } = await createRuntimeHarness({
      maxAttempts: 1,
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async () => {
          throw new Error('provider rejected item')
        },
      },
    })
    const cardAJob = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-a', source: 'memory_reflections', text: 'card-a dead letter' }],
    })
    const cardBJob = await runtime.scheduleReindexJob({
      cardId: 'card-b',
      entries: [{ sourceId: 'memory-b', source: 'memory_facts', text: 'card-b dead letter' }],
    })
    await runtime.runNextBatch({ jobId: cardAJob.jobId, batchSize: 1 })
    await runtime.runNextBatch({ jobId: cardBJob.jobId, batchSize: 1 })

    await expect(runtime.listDeadLetterItems(cardAJob.jobId, 'card-b')).rejects.toThrow('does not belong to card')
    await expect(runtime.listDeadLetterItems(cardAJob.jobId, 'card-a')).resolves.toEqual([
      {
        itemId: expect.any(String),
        source: 'memory_reflections',
        sourceId: 'memory-a',
        attemptCount: 1,
        lastError: 'provider rejected item',
      },
    ])
  })

  it('retries only selected dead-letter items and treats an explicit empty selection as a no-op', async () => {
    let shouldFail = true
    const { runtime, vectors } = await createRuntimeHarness({
      maxAttempts: 1,
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          if (shouldFail)
            throw new Error(`provider rejected ${texts[0]}`)
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [
        { sourceId: 'memory-a', source: 'memory_reflections', text: 'dead letter a' },
        { sourceId: 'memory-b', source: 'memory_reflections', text: 'dead letter b' },
      ],
    })
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })
    const deadLetters = await runtime.listDeadLetterItems(job.jobId, 'card-a')

    const noOp = await runtime.retryDeadLetterItems(job.jobId, [], 'card-a')
    expect(noOp.status).toBe('failed')
    expect(noOp.stage).toBe('failed')
    expect(noOp.pending).toBe(0)
    expect(noOp.deadLettered).toBe(2)

    const retried = await runtime.retryDeadLetterItems(job.jobId, [deadLetters[0].itemId], 'card-a')
    expect(retried.status).toBe('queued')
    expect(retried.stage).toBe('embedding-indexing')
    expect(retried.pending).toBe(1)
    expect(retried.deadLettered).toBe(1)

    shouldFail = false
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 2 })
    const remaining = await runtime.listDeadLetterItems(job.jobId, 'card-a')

    expect(vectors).toEqual([{ sourceId: deadLetters[0].sourceId, text: `dead letter ${deadLetters[0].sourceId.at(-1)}` }])
    expect(remaining).toEqual([deadLetters[1]])
    expect((await runtime.getReindexJob(job.jobId)).status).toBe('failed')
  })

  it('uses the job frozen max-attempts when recovering an expired lease after restart', async () => {
    let now = 1_000
    const { harness, runtime } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 1,
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '崩溃前已租约' }],
    })
    await runtime.claimNextBatch({ jobId: job.jobId, batchSize: 1 })

    now = 1_101
    const restarted = attachRuntime(harness, {
      now: () => now,
      maxAttempts: 5,
    })
    await restarted.runtime.initializeSchema()
    const progress = await restarted.runtime.getReindexJob(job.jobId, 'card-a')
    const deadLetters = await restarted.runtime.listDeadLetterItems(job.jobId, 'card-a')

    expect(progress.status).toBe('failed')
    expect(progress.deadLettered).toBe(1)
    expect(progress.retryable).toBe(0)
    expect(deadLetters).toEqual([
      {
        itemId: expect.any(String),
        source: 'memory_reflections',
        sourceId: 'memory-1',
        attemptCount: 1,
        lastError: expect.stringContaining('lease expired'),
      },
    ])
  })

  it('fences non-expired leases left by a previous runtime during startup recovery', async () => {
    const now = 1_000
    const { harness, runtime } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 2,
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '启动租约隔离' }],
    })
    await runtime.claimNextBatch({ jobId: job.jobId, batchSize: 1 })

    const restarted = attachRuntime(harness, {
      now: () => now,
      maxAttempts: 2,
    })
    await restarted.runtime.initializeSchema()

    const progress = await restarted.runtime.getReindexJob(job.jobId, 'card-a')
    expect(progress.status).toBe('queued')
    expect(progress.retryable).toBe(1)
    expect(progress.leased).toBe(0)
    expect(progress.nextRetryAt).toBeGreaterThan(now)
  })

  it('cancels an expired leased item when recovering a cancel-requested job after restart', async () => {
    let now = 1_000
    const { harness, runtime } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 1,
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '取消时崩溃' }],
    })
    await runtime.claimNextBatch({ jobId: job.jobId, batchSize: 1 })
    await harness.run(`
      UPDATE memory_embedding_reindex_jobs
      SET status = 'cancel_requested', last_error = '用户取消重建'
      WHERE id = ?
    `, [job.jobId])

    now = 1_101
    const restarted = attachRuntime(harness, {
      now: () => now,
      maxAttempts: 5,
    })
    await restarted.runtime.initializeSchema()
    const progress = await restarted.runtime.getReindexJob(job.jobId, 'card-a')

    expect(progress.status).toBe('cancelled')
    expect(progress.cancelled).toBe(1)
    expect(progress.deadLettered).toBe(0)
    expect(progress.retryable).toBe(0)
    expect(progress.lastError).toBe('用户取消重建')
  })

  it('resolves the embedding provider when a batch starts instead of freezing setup-time config', async () => {
    const harness = await createSqliteHarness()
    let provider: LongTermMemoryEmbeddingProvider | null = null
    let writeQueue = Promise.resolve<unknown>(undefined)
    const enqueueWrite = async <T>(task: () => Promise<T>) => {
      const next = writeQueue.then(task, task)
      writeQueue = next.then(() => undefined, () => undefined)
      return await next
    }
    const vectors: string[] = []
    const runtime = createMemoryEmbeddingReindexRuntime({
      database: harness.database,
      now: () => 1_000,
      randomUUID: () => `uuid-${Math.random()}`,
      run: async (_database: sqlite3.Database, sql, params = []) => await harness.run(sql, params),
      get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.get<T>(sql, params),
      all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.all<T>(sql, params),
      enqueueWrite,
      runInTransaction: async <T>(_database: sqlite3.Database, task: () => Promise<T>) => {
        await harness.run('BEGIN IMMEDIATE')
        try {
          const result = await task()
          await harness.run('COMMIT')
          return result
        }
        catch (error) {
          await harness.run('ROLLBACK')
          throw error
        }
      },
      resolveProvider: () => provider,
      upsertVector: async (record) => {
        vectors.push(record.sourceId)
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      modelId: 'late-provider',
      dimensions: 3,
      vectorSpaceId: 'late-provider:3',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '运行时配置' }],
    })

    provider = {
      modelId: 'late-provider',
      dimensions: 3,
      vectorSpaceId: 'late-provider:3',
      embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
    }
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 1 })

    expect((await runtime.getReindexJob(job.jobId)).status).toBe('completed')
    expect(vectors).toEqual(['memory-1'])
  })

  it('refuses to write vectors when the active provider model no longer matches the job vector space', async () => {
    const harness = await createSqliteHarness()
    let provider: LongTermMemoryEmbeddingProvider | null = {
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: 'model-a:3',
      embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
    }
    let writeQueue = Promise.resolve<unknown>(undefined)
    const enqueueWrite = async <T>(task: () => Promise<T>) => {
      const next = writeQueue.then(task, task)
      writeQueue = next.then(() => undefined, () => undefined)
      return await next
    }
    const vectors: string[] = []
    const runtime = createMemoryEmbeddingReindexRuntime({
      database: harness.database,
      now: () => 1_000,
      randomUUID: () => `uuid-${Math.random()}`,
      run: async (_database: sqlite3.Database, sql, params = []) => await harness.run(sql, params),
      get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.get<T>(sql, params),
      all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.all<T>(sql, params),
      enqueueWrite,
      runInTransaction: async <T>(_database: sqlite3.Database, task: () => Promise<T>) => {
        await harness.run('BEGIN IMMEDIATE')
        try {
          const result = await task()
          await harness.run('COMMIT')
          return result
        }
        catch (error) {
          await harness.run('ROLLBACK')
          throw error
        }
      },
      resolveProvider: () => provider,
      upsertVector: async (record) => {
        vectors.push(record.sourceId)
      },
      maxAttempts: 1,
    })
    await runtime.initializeSchema()
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '禁止混用向量空间' }],
    })

    provider = {
      modelId: 'model-b',
      dimensions: 3,
      vectorSpaceId: 'model-b:3',
      embedTexts: async texts => texts.map(text => ({ text, vector: [0, 1, 0] })),
    }
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 1 })
    const progress = await runtime.getReindexJob(job.jobId)

    expect(vectors).toEqual([])
    expect(progress.status).toBe('failed')
    expect(progress.deadLettered).toBe(1)
    expect(progress.lastError).toContain('provider model changed')
  })

  it('refuses the same model and dimensions when the provider vector space changes', async () => {
    const harness = await createSqliteHarness()
    let provider: LongTermMemoryEmbeddingProvider | null = {
      modelId: 'same-model',
      dimensions: 3,
      vectorSpaceId: 'space-a',
      embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
    }
    let writeQueue = Promise.resolve<unknown>(undefined)
    const enqueueWrite = async <T>(task: () => Promise<T>) => {
      const next = writeQueue.then(task, task)
      writeQueue = next.then(() => undefined, () => undefined)
      return await next
    }
    const vectors: string[] = []
    const runtime = createMemoryEmbeddingReindexRuntime({
      database: harness.database,
      now: () => 1_000,
      randomUUID: () => `uuid-${Math.random()}`,
      run: async (_database: sqlite3.Database, sql, params = []) => await harness.run(sql, params),
      get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.get<T>(sql, params),
      all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.all<T>(sql, params),
      enqueueWrite,
      runInTransaction: async <T>(_database: sqlite3.Database, task: () => Promise<T>) => {
        await harness.run('BEGIN IMMEDIATE')
        try {
          const result = await task()
          await harness.run('COMMIT')
          return result
        }
        catch (error) {
          await harness.run('ROLLBACK')
          throw error
        }
      },
      resolveProvider: () => provider,
      upsertVector: async (record) => {
        vectors.push(record.sourceId)
      },
      maxAttempts: 1,
    })
    await runtime.initializeSchema()
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '禁止跨 Provider 混用' }],
    })

    provider = {
      modelId: 'same-model',
      dimensions: 3,
      vectorSpaceId: 'space-b',
      embedTexts: async texts => texts.map(text => ({ text, vector: [0, 1, 0] })),
    }
    await runtime.runNextBatch({ jobId: job.jobId, batchSize: 1 })
    const progress = await runtime.getReindexJob(job.jobId)

    expect(vectors).toEqual([])
    expect(progress.status).toBe('failed')
    expect(progress.lastError).toContain('provider vector space changed')
  })

  it('rejects status and mutation requests from another card scope', async () => {
    const { runtime } = await createRuntimeHarness()
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '仅属于 card-a' }],
    })

    await expect(runtime.getReindexJob(job.jobId, 'card-b')).rejects.toThrow('does not belong to card')
    await expect(runtime.requestCancel(job.jobId, '跨卡取消', 'card-b')).rejects.toThrow('does not belong to card')
    await expect(runtime.retryDeadLetterItems(job.jobId, undefined, 'card-b')).rejects.toThrow('does not belong to card')
  })

  it('waits for the active worker to settle before stop resolves', async () => {
    let releaseEmbedding: () => void = () => {}
    let embeddingStarted: (() => void) | null = null
    const embeddingStartedPromise = new Promise<void>((resolve) => {
      embeddingStarted = resolve
    })
    const { runtime } = await createRuntimeHarness({
      provider: {
        modelId: 'test-embedding',
        dimensions: 3,
        embedTexts: async (texts) => {
          embeddingStarted?.()
          await new Promise<void>((resolve) => {
            releaseEmbedding = resolve
          })
          return texts.map(text => ({ text, vector: [1, 0, 0] }))
        },
      },
    })
    const job = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-1', source: 'memory_reflections', text: '等待安全关闭' }],
    })

    const worker = runtime.runJob(job.jobId)
    await embeddingStartedPromise
    let stopped = false
    const stopping = runtime.stop().then(() => {
      stopped = true
    })
    await Promise.resolve()
    expect(stopped).toBe(false)

    releaseEmbedding()
    await stopping
    await worker

    expect(stopped).toBe(true)
    expect((await runtime.getReindexJob(job.jobId)).status).toBe('completed')
  })

  it('resumes only pending jobs owned by the requested card', async () => {
    const { runtime } = await createRuntimeHarness()
    const cardAJob = await runtime.scheduleReindexJob({
      cardId: 'card-a',
      entries: [{ sourceId: 'memory-a', source: 'memory_reflections', text: 'card-a memory' }],
    })
    const cardBJob = await runtime.scheduleReindexJob({
      cardId: 'card-b',
      entries: [{ sourceId: 'memory-b', source: 'memory_reflections', text: 'card-b memory' }],
    })

    expect(await runtime.resumePendingJobs(8, 'card-b')).toEqual([cardBJob.jobId])
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if ((await runtime.getReindexJob(cardBJob.jobId)).status === 'completed')
        break
      await new Promise(resolve => setTimeout(resolve, 1))
    }

    expect((await runtime.getReindexJob(cardAJob.jobId)).status).toBe('queued')
    expect((await runtime.getReindexJob(cardBJob.jobId)).status).toBe('completed')
  })
})
