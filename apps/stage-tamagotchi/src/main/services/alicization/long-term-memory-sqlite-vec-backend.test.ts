import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { getLoadablePath } from 'sqlite-vec'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'

interface SqliteHarness {
  database: sqlite3.Database
  run: (sql: string, params?: unknown[]) => Promise<void>
  get: <T>(sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(sql: string, params?: unknown[]) => Promise<T[]>
  close: () => Promise<void>
}

const harnesses: SqliteHarness[] = []
const temporaryDirectories: string[] = []
const originalResourcesPath = process.resourcesPath
const modelAVectorSpaceId = 'model-a:3'

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
          database.close(closeError => closeError ? closeReject(closeError) : closeResolve())
        }),
      }
      harnesses.push(harness)
      resolve(harness)
    })
  })
}

async function createBackendHarness() {
  const harness = await createSqliteHarness()
  const allCalls: string[] = []
  let writeQueue = Promise.resolve<unknown>(undefined)
  const enqueueWrite = async <T>(task: () => Promise<T>) => {
    const next = writeQueue.then(task, task)
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }
  await harness.run(`
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
      vector_space_id TEXT NOT NULL,
      status TEXT NOT NULL,
      last_error TEXT,
      metadata_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  await harness.run(`
    CREATE TABLE long_term_memory_search_documents (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      tombstoned INTEGER NOT NULL DEFAULT 0
    )
  `)
  await harness.run(`
    CREATE TABLE long_term_memory_tombstones (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    )
  `)
  const backend = createSqliteVecLongTermMemoryVectorBackend({
    database: harness.database,
    now: () => 100,
    run: async (_database, sql, params = []) => await harness.run(sql, params),
    get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.get<T>(sql, params),
    all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => {
      allCalls.push(sql)
      return await harness.all<T>(sql, params)
    },
    enqueueWrite,
  })
  await backend.initialize()
  async function upsertCanonical(records: Array<{
    id: string
    cardId: string
    sourceId: string
    source: string
    text: string
    vector: number[]
    modelId: string
    dimensions: number
    vectorSpaceId?: string
    updatedAt: number
  }>) {
    for (const record of records) {
      const textHash = hashLongTermMemoryEmbeddingText(record.text)
      const vectorSpaceId = record.vectorSpaceId ?? `${record.modelId}:${record.dimensions}`
      await harness.run(`
        INSERT INTO long_term_memory_vectors (
          id, card_id, source_id, source, text_hash, text, vector_blob,
          model_id, dimensions, vector_space_id, status, last_error, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        record.id,
        record.cardId,
        record.sourceId,
        record.source,
        textHash,
        record.text,
        Buffer.from(new Float32Array(record.vector).buffer),
        record.modelId,
        record.dimensions,
        vectorSpaceId,
        'indexed',
        null,
        '{}',
        record.updatedAt,
        record.updatedAt,
      ])
      await harness.run(`
        INSERT OR IGNORE INTO long_term_memory_search_documents (
          id, card_id, source, source_id, text_hash, tombstoned
        ) VALUES (?, ?, ?, ?, ?, 0)
      `, [
        `doc:${record.cardId}:${record.source}:${record.sourceId}`,
        record.cardId,
        record.source,
        record.sourceId,
        textHash,
      ])
    }
  }
  return { harness, backend, upsertCanonical, allCalls }
}

afterEach(async () => {
  await Promise.all(harnesses.splice(0).map(harness => harness.close()))
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
  if (originalResourcesPath === undefined) {
    Object.defineProperty(process, 'resourcesPath', {
      configurable: true,
      value: undefined,
    })
  }
  else {
    Object.defineProperty(process, 'resourcesPath', {
      configurable: true,
      value: originalResourcesPath,
    })
  }
})

describe('sqlite-vec long-term memory vector backend', () => {
  it('loads the packaged sqlite-vec extension from Electron resources before the bundled module path', async () => {
    const resourcesPath = await mkdtemp(join(tmpdir(), 'alicization-sqlite-vec-resources-'))
    temporaryDirectories.push(resourcesPath)
    const extensionName = process.platform === 'win32'
      ? 'vec0.dll'
      : process.platform === 'darwin'
        ? 'vec0.dylib'
        : 'vec0.so'
    const extensionPath = join(resourcesPath, 'sqlite-vec', extensionName)
    await mkdir(join(resourcesPath, 'sqlite-vec'), { recursive: true })
    await writeFile(extensionPath, '')
    expect(existsSync(extensionPath)).toBe(true)
    Object.defineProperty(process, 'resourcesPath', {
      configurable: true,
      value: resourcesPath,
    })

    const loadExtension = vi.fn((_path: string, callback: (error: Error | null) => void) => callback(null))
    const backend = createSqliteVecLongTermMemoryVectorBackend({
      database: { loadExtension } as unknown as sqlite3.Database,
      now: () => 100,
      run: async () => undefined,
      get: async <T>() => ({ version: '0.1.6' }) as T,
      all: async () => [],
      enqueueWrite: async task => await task(),
    })

    await backend.initialize()

    expect(loadExtension).toHaveBeenCalledWith(extensionPath, expect.any(Function))
  })

  it('isolates native search by card, model, dimensions, and source', async () => {
    const { backend, upsertCanonical, allCalls } = await createBackendHarness()
    const records = [
      {
        id: 'vector-a-reflection',
        cardId: 'card-a',
        sourceId: 'reflection-a',
        source: 'memory_reflections',
        text: '用户喜欢自然对话。',
        vector: [1, 0, 0],
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: modelAVectorSpaceId,
        updatedAt: 10,
        metadata: {},
      },
      {
        id: 'vector-a-fact',
        cardId: 'card-a',
        sourceId: 'fact-a',
        source: 'memory_facts',
        text: '用户喜欢安静的夜晚。',
        vector: [0.9, 0.1, 0],
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: modelAVectorSpaceId,
        updatedAt: 20,
        metadata: {},
      },
      {
        id: 'vector-b',
        cardId: 'card-b',
        sourceId: 'reflection-b',
        source: 'memory_reflections',
        text: '另一张卡片的记忆。',
        vector: [1, 0, 0],
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: modelAVectorSpaceId,
        updatedAt: 30,
        metadata: {},
      },
    ]
    await upsertCanonical(records)
    await backend.upsert(records)
    allCalls.splice(0)

    const results = await backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      source: 'memory_reflections',
      limit: 4,
    })

    expect(results.map(result => result.record.id)).toEqual(['vector-a-reflection'])
    expect(allCalls).toHaveLength(1)
    expect(allCalls[0]).toContain('JOIN long_term_memory_sqlite_vec_rows')
    expect(allCalls[0]).toContain('NOT EXISTS')
    await expect(backend.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      ready: true,
      lastError: null,
    })
  })

  it('partitions native vector tables by the required retrieval scope', async () => {
    const { harness, backend, upsertCanonical } = await createBackendHarness()
    const record = {
      id: 'vector-partitioned',
      cardId: 'card-a',
      sourceId: 'reflection-partitioned',
      source: 'memory_reflections',
      text: '分区后的原生索引应避免逐条比较高基数字符串作用域。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }
    await upsertCanonical([record])
    await backend.upsert([record])

    const table = await harness.get<{ sql: string }>(
      'SELECT sql FROM sqlite_master WHERE type = ? AND name = ?',
      ['table', 'long_term_memory_vec_3'],
    )

    expect(table?.sql).toContain('card_id text partition key')
    expect(table?.sql).toContain('model_id text partition key')
    expect(table?.sql).toContain('vector_space_id text partition key')
    expect(table?.sql).toContain('source text partition key')
    expect(table?.sql).toContain('embedding int8[')
    expect(backend.approximate).toBe(true)
  })

  it('materializes the bounded native candidate set before relational post-filters', async () => {
    const { backend, upsertCanonical, allCalls } = await createBackendHarness()
    const record = {
      id: 'vector-materialized-candidates',
      cardId: 'card-a',
      sourceId: 'reflection-materialized-candidates',
      source: 'memory_reflections',
      text: '先缩小原生向量候选集，再做关系表过滤。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }
    await upsertCanonical([record])
    await backend.upsert([record])
    allCalls.splice(0)

    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 1,
    })).resolves.toEqual([
      expect.objectContaining({
        record: expect.objectContaining({
          id: record.id,
        }),
      }),
    ])

    const searchSql = allCalls.find(sql => sql.includes('embedding MATCH'))
    expect(searchSql).toContain('WITH native_candidates AS MATERIALIZED')
    expect(searchSql).toContain('FROM native_candidates native')
  })

  it('idempotently replaces an existing native row when the same vector is reindexed', async () => {
    const { backend, upsertCanonical } = await createBackendHarness()
    const record = {
      id: 'vector-idempotent-reindex',
      cardId: 'card-a',
      sourceId: 'reflection-idempotent-reindex',
      source: 'memory_reflections',
      text: '并发的增量与全量重建必须能够重复写入同一原生向量。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }
    await upsertCanonical([record])

    await backend.upsert([record])
    await expect(backend.upsert([record])).resolves.toBeUndefined()
    await expect(backend.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      ready: true,
      reindexRequired: false,
      lastError: null,
    })
  })

  it('does not lose a source-filtered result behind closer rows from another source', async () => {
    const { backend, upsertCanonical } = await createBackendHarness()
    const distractors = Array.from({ length: 100 }, (_, index) => ({
      id: `vector-source-distractor-${index}`,
      cardId: 'card-a',
      sourceId: `reflection-source-distractor-${index}`,
      source: 'memory_reflections',
      text: `会话来源的干扰记忆 ${index}。`,
      vector: [0.99, 0.1, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: index + 1,
      metadata: {},
    }))
    const target = {
      id: 'vector-source-target',
      cardId: 'card-a',
      sourceId: 'episode-source-target',
      source: 'episodic_events',
      text: '指定来源的目标记忆。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 200,
      metadata: {},
    }
    const records = [...distractors, target]
    await upsertCanonical(records)
    await backend.upsert(records)

    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      source: 'episodic_events',
      limit: 1,
    })).resolves.toEqual([
      expect.objectContaining({
        record: expect.objectContaining({
          id: 'vector-source-target',
          source: 'episodic_events',
        }),
      }),
    ])
  })

  it('expands native candidates when invalid rows occupy the initial k nearest results', async () => {
    const { harness, backend, upsertCanonical, allCalls } = await createBackendHarness()
    const tombstoned = Array.from({ length: 8 }, (_, index) => ({
      id: `vector-tombstoned-${index}`,
      cardId: 'card-a',
      sourceId: `reflection-tombstoned-${index}`,
      source: 'memory_reflections',
      text: `已过期的相似记忆 ${index}。`,
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: index + 1,
      metadata: {},
    }))
    const target = {
      id: 'vector-after-tombstones',
      cardId: 'card-a',
      sourceId: 'reflection-after-tombstones',
      source: 'memory_reflections',
      text: '被无效候选挡住的有效目标记忆。',
      vector: [0.99, 0.01, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 100,
      metadata: {},
    }
    await upsertCanonical([...tombstoned, target])
    await backend.upsert([...tombstoned, target])
    await harness.run(
      `UPDATE long_term_memory_vectors
       SET vector_blob = ?
       WHERE card_id = ?
         AND source = ?
         AND source_id IN (${tombstoned.map(() => '?').join(', ')})`,
      [
        Buffer.from(new Float32Array([-1, 0, 0]).buffer),
        'card-a',
        'memory_reflections',
        ...tombstoned.map(record => record.sourceId),
      ],
    )
    allCalls.splice(0)

    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 1,
    })).resolves.toEqual([
      expect.objectContaining({
        record: expect.objectContaining({
          id: 'vector-after-tombstones',
        }),
      }),
    ])
    expect(allCalls.some(sql => sql.includes('native.embedding MATCH'))).toBe(true)
  })

  it('expands native k until a post-filtered target can be returned', async () => {
    const searchKValues: number[] = []
    const canonicalRow = {
      id: 'vector-adaptive-target',
      card_id: 'card-a',
      source_id: 'reflection-adaptive-target',
      source: 'memory_reflections',
      text_hash: hashLongTermMemoryEmbeddingText('被过滤候选挡住的目标。'),
      text: '被过滤候选挡住的目标。',
      vector_blob: Buffer.from(new Float32Array([1, 0, 0]).buffer),
      model_id: 'model-a',
      dimensions: 3,
      vector_space_id: modelAVectorSpaceId,
      status: 'indexed',
      last_error: null,
      updated_at: 10,
      metadata_json: '{}',
    }
    const backend = createSqliteVecLongTermMemoryVectorBackend({
      database: {
        loadExtension: (_path: string, callback: (error: Error | null) => void) => callback(null),
      } as unknown as sqlite3.Database,
      now: () => 100,
      run: async () => undefined,
      get: async <T>(_database: sqlite3.Database, sql: string) => {
        if (sql.includes('vec_version'))
          return { version: '0.1.6' } as T
        if (sql.includes('SELECT COUNT(*) AS count'))
          return { count: 100 } as T
        return undefined
      },
      all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => {
        if (sql.includes('native.embedding MATCH')) {
          const nativeLimit = Number(params.find(value => value === 4 || value === 8))
          searchKValues.push(nativeLimit)
          return (nativeLimit >= 8
            ? [{ native_rowid: 1, distance: 0, ...canonicalRow }]
            : Array.from({ length: 4 }, (_, index) => ({
                native_rowid: index + 1,
                distance: 0,
                ...canonicalRow,
                id: `vector-adaptive-invalid-${index}`,
                vector_blob: Buffer.from(new Float32Array([0, 0, 0]).buffer),
              }))) as T[]
        }
        return [] as T[]
      },
      enqueueWrite: async task => await task(),
    })
    await backend.initialize()

    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 1,
    })).resolves.toEqual([
      expect.objectContaining({
        record: expect.objectContaining({
          id: 'vector-adaptive-target',
        }),
      }),
    ])
    expect(searchKValues).toEqual([4, 8])
  })

  it('uses the bounded native result length instead of a window aggregate for exhaustion', async () => {
    const { backend, upsertCanonical, allCalls } = await createBackendHarness()
    const record = {
      id: 'vector-no-window-count',
      cardId: 'card-a',
      sourceId: 'reflection-no-window-count',
      source: 'memory_reflections',
      text: '候选集大小已经由 native.k 限定。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }
    await upsertCanonical([record])
    await backend.upsert([record])
    allCalls.splice(0)

    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 1,
    })).resolves.toHaveLength(1)

    const searchSql = allCalls.find(sql => sql.includes('embedding MATCH'))
    expect(searchSql).not.toContain('COUNT(*) OVER')
  })

  it('does not decode and rerank the same valid native candidate again after expansion', async () => {
    let vectorDecodeCount = 0
    const createCanonicalRow = (id: string, vector: number[]) => {
      const row = {
        id,
        card_id: 'card-a',
        source_id: id,
        source: 'memory_reflections',
        text_hash: hashLongTermMemoryEmbeddingText(id),
        text: id,
        model_id: 'model-a',
        dimensions: 3,
        vector_space_id: modelAVectorSpaceId,
        status: 'indexed',
        last_error: null,
        updated_at: 10,
        metadata_json: '{}',
        native_rowid: id === 'vector-cached-candidate' ? 1 : 2,
        distance: 0,
        retrieval_valid: 1,
      }
      Object.defineProperty(row, 'vector_blob', {
        enumerable: true,
        get: () => {
          vectorDecodeCount += 1
          return Buffer.from(new Float32Array(vector).buffer)
        },
      })
      return row
    }
    const existing = createCanonicalRow('vector-cached-candidate', [1, 0, 0])
    const expanded = createCanonicalRow('vector-expanded-candidate', [0.9, 0.1, 0])
    const invalidRows = Array.from({ length: 7 }, (_, index) => ({
      native_rowid: index + 3,
      distance: 0,
      retrieval_valid: 0,
    }))
    let searchCount = 0
    const backend = createSqliteVecLongTermMemoryVectorBackend({
      database: {
        loadExtension: (_path: string, callback: (error: Error | null) => void) => callback(null),
      } as unknown as sqlite3.Database,
      now: () => 100,
      run: async () => undefined,
      get: async <T>(_database: sqlite3.Database, sql: string) => {
        if (sql.includes('vec_version'))
          return { version: '0.1.6' } as T
        return undefined
      },
      all: async <T>(_database: sqlite3.Database, sql: string) => {
        if (sql.includes('native.embedding MATCH')) {
          searchCount += 1
          return (searchCount === 1
            ? [existing, ...invalidRows]
            : [existing, expanded, ...invalidRows]) as T[]
        }
        return [] as T[]
      },
      enqueueWrite: async task => await task(),
    })
    await backend.initialize()

    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 2,
    })).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ record: expect.objectContaining({ id: 'vector-cached-candidate' }) }),
      expect.objectContaining({ record: expect.objectContaining({ id: 'vector-expanded-candidate' }) }),
    ]))
    expect(vectorDecodeCount).toBe(2)
  })

  it('does not count the full native partition before a healthy bounded search', async () => {
    let partitionCountQueries = 0
    let nativeSearchQueries = 0
    const canonicalRow = {
      id: 'vector-bounded-search',
      card_id: 'card-a',
      source_id: 'reflection-bounded-search',
      source: 'memory_reflections',
      text_hash: hashLongTermMemoryEmbeddingText('健康查询不应该先扫描整个原生分区。'),
      text: '健康查询不应该先扫描整个原生分区。',
      vector_blob: Buffer.from(new Float32Array([1, 0, 0]).buffer),
      model_id: 'model-a',
      dimensions: 3,
      vector_space_id: modelAVectorSpaceId,
      status: 'indexed',
      last_error: null,
      updated_at: 10,
      metadata_json: '{}',
    }
    const backend = createSqliteVecLongTermMemoryVectorBackend({
      database: {
        loadExtension: (_path: string, callback: (error: Error | null) => void) => callback(null),
      } as unknown as sqlite3.Database,
      now: () => 100,
      run: async () => undefined,
      get: async <T>(_database: sqlite3.Database, sql: string) => {
        if (sql.includes('vec_version'))
          return { version: '0.1.6' } as T
        if (sql.includes('SELECT COUNT(*) AS count') && sql.includes('long_term_memory_vec_3')) {
          partitionCountQueries += 1
          return { count: 100_000 } as T
        }
        return undefined
      },
      all: async <T>(_database: sqlite3.Database, sql: string) => {
        if (sql.includes('native.embedding MATCH')) {
          nativeSearchQueries += 1
          return [{ native_rowid: 1, distance: 0, ...canonicalRow }] as T[]
        }
        return [] as T[]
      },
      enqueueWrite: async task => await task(),
    })
    await backend.initialize()

    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 1,
    })).resolves.toEqual([
      expect.objectContaining({
        record: expect.objectContaining({
          id: 'vector-bounded-search',
        }),
      }),
    ])

    expect(partitionCountQueries).toBe(0)
    expect(nativeSearchQueries).toBe(1)
  })

  it('reuses a recent health aggregate across native searches', async () => {
    let healthProbeQueries = 0
    const canonicalRow = {
      id: 'vector-health-cache',
      card_id: 'card-a',
      source_id: 'reflection-health-cache',
      source: 'memory_reflections',
      text_hash: hashLongTermMemoryEmbeddingText('健康聚合不应该在每次检索前重复全量执行。'),
      text: '健康聚合不应该在每次检索前重复全量执行。',
      vector_blob: Buffer.from(new Float32Array([1, 0, 0]).buffer),
      model_id: 'model-a',
      dimensions: 3,
      vector_space_id: modelAVectorSpaceId,
      status: 'indexed',
      last_error: null,
      updated_at: 10,
      metadata_json: '{}',
    }
    const backend = createSqliteVecLongTermMemoryVectorBackend({
      database: {
        loadExtension: (_path: string, callback: (error: Error | null) => void) => callback(null),
      } as unknown as sqlite3.Database,
      now: () => 100,
      run: async () => undefined,
      get: async <T>(_database: sqlite3.Database, sql: string) => {
        if (sql.includes('vec_version'))
          return { version: '0.1.6' } as T
        if (
          sql.includes('SELECT name FROM sqlite_master')
          || sql.includes('SELECT COUNT(*) AS count')
        ) {
          healthProbeQueries += 1
          if (sql.includes('SELECT name FROM sqlite_master'))
            return { name: 'long_term_memory_vec_3' } as T
          return { count: 1 } as T
        }
        return undefined
      },
      all: async <T>(_database: sqlite3.Database, sql: string) => {
        if (sql.includes('native.embedding MATCH'))
          return [{ native_rowid: 1, distance: 0, ...canonicalRow }] as T[]
        return [] as T[]
      },
      enqueueWrite: async task => await task(),
    })
    await backend.initialize()

    const healthInput = {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    }
    await backend.getHealth(healthInput)
    await backend.search([1, 0, 0], {
      ...healthInput,
      limit: 1,
    })
    await backend.getHealth(healthInput)

    expect(healthProbeQueries).toBe(5)
  })

  it('reports an unsynchronized canonical space until rebuild completes', async () => {
    const { harness, backend } = await createBackendHarness()
    const vector = Buffer.from(new Float32Array([1, 0, 0]).buffer)
    const text = '重启前已经存在的长期记忆。'
    const textHash = hashLongTermMemoryEmbeddingText(text)
    await harness.run(`
      INSERT INTO long_term_memory_vectors (
        id, card_id, source_id, source, text_hash, text, vector_blob,
        model_id, dimensions, vector_space_id, status, last_error, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'canonical-only',
      'card-a',
      'reflection-a',
      'memory_reflections',
      textHash,
      text,
      vector,
      'model-a',
      3,
      modelAVectorSpaceId,
      'indexed',
      null,
      '{}',
      10,
      10,
    ])
    await harness.run(`
      INSERT INTO long_term_memory_search_documents (
        id, card_id, source, source_id, text_hash, tombstoned
      ) VALUES (?, ?, ?, ?, ?, 0)
    `, ['doc:canonical-only', 'card-a', 'memory_reflections', 'reflection-a', textHash])

    await expect(backend.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      ready: false,
      reindexRequired: true,
    })
    await backend.rebuild({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })

    await expect(backend.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      ready: true,
      lastError: null,
    })
    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })).resolves.toEqual([
      expect.objectContaining({
        record: expect.objectContaining({
          id: 'canonical-only',
          sourceId: 'reflection-a',
        }),
        score: expect.closeTo(1, 5),
      }),
    ])
  })

  it('marks a canonical space for asynchronous reindex after an old native schema is migrated', async () => {
    const { harness, backend } = await createBackendHarness()
    const vector = Buffer.from(new Float32Array([1, 0, 0]).buffer)
    const text = '旧版原生索引迁移后必须进入异步重建。'
    const textHash = hashLongTermMemoryEmbeddingText(text)
    await harness.run(`
      INSERT INTO long_term_memory_vectors (
        id, card_id, source_id, source, text_hash, text, vector_blob,
        model_id, dimensions, vector_space_id, status, last_error, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'schema-migration-canonical',
      'card-a',
      'reflection-schema-migration',
      'memory_reflections',
      textHash,
      text,
      vector,
      'model-a',
      3,
      modelAVectorSpaceId,
      'indexed',
      null,
      '{}',
      10,
      10,
    ])
    await harness.run(`
      INSERT INTO long_term_memory_search_documents (
        id, card_id, source, source_id, text_hash, tombstoned
      ) VALUES (?, ?, ?, ?, ?, 0)
    `, [
      'doc:schema-migration-canonical',
      'card-a',
      'memory_reflections',
      'reflection-schema-migration',
      textHash,
    ])
    await harness.run(`
      CREATE VIRTUAL TABLE long_term_memory_vec_3 USING vec0(
        embedding float[3] distance_metric=cosine,
        card_id text partition key,
        model_id text partition key,
        vector_space_id text partition key,
        source text
      )
    `)

    await backend.initialize()

    await expect(backend.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      ready: false,
      reindexRequired: true,
      lastError: 'sqlite-vec index is not synchronized with canonical vectors',
    })
  })

  it('rolls back native schema migration when rebuilding the mapping table fails', async () => {
    const harness = await createSqliteHarness()
    const oldMappingColumns = [
      'native_rowid INTEGER PRIMARY KEY AUTOINCREMENT',
      'record_id TEXT NOT NULL UNIQUE',
      'card_id TEXT NOT NULL',
      'source_id TEXT NOT NULL',
      'source TEXT NOT NULL',
      'model_id TEXT NOT NULL',
      'dimensions INTEGER NOT NULL',
      'created_at INTEGER NOT NULL',
      'updated_at INTEGER NOT NULL',
    ]
    await harness.run(`
      CREATE TABLE long_term_memory_sqlite_vec_rows (
        ${oldMappingColumns.join(', ')}
      )
    `)
    await new Promise<void>((resolve, reject) => {
      harness.database.loadExtension(
        getLoadablePath(),
        error => error ? reject(error) : resolve(),
      )
    })
    await harness.run(`
      CREATE VIRTUAL TABLE long_term_memory_vec_3 USING vec0(
        embedding float[3] distance_metric=cosine,
        card_id text partition key,
        model_id text partition key,
        vector_space_id text partition key,
        source text
      )
    `)

    let failMappingRecreate = true
    const backend = createSqliteVecLongTermMemoryVectorBackend({
      database: harness.database,
      now: () => 100,
      run: async (_database, sql, params = []) => {
        if (failMappingRecreate && sql.includes('CREATE TABLE IF NOT EXISTS long_term_memory_sqlite_vec_rows'))
          throw new Error('injected mapping migration failure')
        return await harness.run(sql, params)
      },
      get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.get<T>(sql, params),
      all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.all<T>(sql, params),
      enqueueWrite: async task => await task(),
      runInTransaction: async <T>(_database: sqlite3.Database, task: () => Promise<T>) => {
        await harness.run('BEGIN IMMEDIATE')
        try {
          const result = await task()
          await harness.run('COMMIT')
          return result
        }
        catch (error) {
          await harness.run('ROLLBACK').catch(() => {})
          throw error
        }
      },
    })

    await expect(backend.initialize()).rejects.toThrow('injected mapping migration failure')
    await expect(harness.get<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'long_term_memory_vec_3'`,
    )).resolves.toMatchObject({ name: 'long_term_memory_vec_3' })
    await expect(harness.get<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'long_term_memory_sqlite_vec_rows'`,
    )).resolves.toMatchObject({ name: 'long_term_memory_sqlite_vec_rows' })
    await expect(harness.all<{ name: string }>(
      'PRAGMA table_info(long_term_memory_sqlite_vec_rows)',
    )).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'native_rowid' }),
      expect.objectContaining({ name: 'record_id' }),
      expect.objectContaining({ name: 'created_at' }),
    ]))

    failMappingRecreate = false
    await expect(backend.initialize()).resolves.toBeUndefined()
    await expect(harness.all<{ name: string }>(
      'PRAGMA table_info(long_term_memory_sqlite_vec_rows)',
    )).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'vector_space_id' }),
      expect.objectContaining({ name: 'canonical_text_hash' }),
    ]))
  })

  it('reports native degradation when a vec0 row is missing but its mapping remains', async () => {
    const { harness, backend, upsertCanonical } = await createBackendHarness()
    const records = [{
      id: 'vector-native-missing',
      cardId: 'card-a',
      sourceId: 'reflection-native-missing',
      source: 'memory_reflections',
      text: '原生向量行丢失时必须透明降级。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }]
    await upsertCanonical(records)
    await backend.upsert(records)
    const mapping = await harness.get<{ native_rowid: number }>(
      'SELECT native_rowid FROM long_term_memory_sqlite_vec_rows WHERE record_id = ?',
      ['vector-native-missing'],
    )
    expect(mapping).toBeTruthy()
    await harness.run('DELETE FROM long_term_memory_vec_3 WHERE rowid = ?', [mapping!.native_rowid])

    await expect(backend.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      ready: false,
      reindexRequired: true,
      lastError: 'sqlite-vec index is not synchronized with canonical vectors',
    })
  })

  it('reports native degradation when an untracked vec0 row remains in the active space', async () => {
    const { harness, backend, upsertCanonical } = await createBackendHarness()
    const records = [{
      id: 'vector-native-extra',
      cardId: 'card-a',
      sourceId: 'reflection-native-extra',
      source: 'memory_reflections',
      text: '原生索引中残留的额外行必须被健康检查发现。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }]
    await upsertCanonical(records)
    await backend.upsert(records)
    await harness.run(`
      INSERT INTO long_term_memory_vec_3 (
        rowid, embedding, card_id, model_id, vector_space_id, source
      ) VALUES (?, vec_quantize_int8(vec_normalize(?), 'unit'), ?, ?, ?, ?)
    `, [
      987_654,
      Buffer.from(new Float32Array([0, 1, 0]).buffer),
      'card-a',
      'model-a',
      modelAVectorSpaceId,
      'memory_reflections',
    ])

    await expect(backend.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      ready: false,
      lastError: 'sqlite-vec index is not synchronized with canonical vectors',
    })
  })

  it('reports native degradation when native source metadata diverges from canonical memory', async () => {
    const { harness, backend, upsertCanonical } = await createBackendHarness()
    const record = {
      id: 'vector-source-metadata-mismatch',
      cardId: 'card-a',
      sourceId: 'reflection-source-metadata-mismatch',
      source: 'memory_reflections',
      text: '原生 source 元数据必须与长期记忆 canonical 记录一致。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }
    await upsertCanonical([record])
    await backend.upsert([record])
    const mapping = await harness.get<{ native_rowid: number }>(
      'SELECT native_rowid FROM long_term_memory_sqlite_vec_rows WHERE record_id = ?',
      [record.id],
    )
    expect(mapping).toBeTruthy()
    await harness.run(
      `DELETE FROM long_term_memory_vec_3 WHERE rowid = ?`,
      [mapping!.native_rowid],
    )
    await harness.run(
      `INSERT INTO long_term_memory_vec_3 (
        rowid, embedding, card_id, model_id, vector_space_id, source
      ) VALUES (?, vec_quantize_int8(vec_normalize(?), 'unit'), ?, ?, ?, ?)`,
      [
        mapping!.native_rowid,
        Buffer.from(new Float32Array(record.vector).buffer),
        record.cardId,
        record.modelId,
        modelAVectorSpaceId,
        'episodic_events',
      ],
    )

    await expect(backend.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      ready: false,
      reindexRequired: true,
      lastError: 'sqlite-vec index is not synchronized with canonical vectors',
    })
  })

  it('removes only matching card-scoped sources from the native index', async () => {
    const { backend, upsertCanonical } = await createBackendHarness()
    const records = [
      {
        id: 'vector-a',
        cardId: 'card-a',
        sourceId: 'shared-source',
        source: 'memory_reflections',
        text: 'card-a memory',
        vector: [1, 0, 0],
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: modelAVectorSpaceId,
        updatedAt: 10,
        metadata: {},
      },
      {
        id: 'vector-b',
        cardId: 'card-b',
        sourceId: 'shared-source',
        source: 'memory_reflections',
        text: 'card-b memory',
        vector: [1, 0, 0],
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: modelAVectorSpaceId,
        updatedAt: 10,
        metadata: {},
      },
    ]
    await upsertCanonical(records)
    await backend.upsert(records)

    expect(await backend.delete({
      cardId: 'card-a',
      sourceIds: ['shared-source'],
    })).toBe(1)
    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })).resolves.toEqual([])
    await expect(backend.search([1, 0, 0], {
      cardId: 'card-b',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })).resolves.toHaveLength(1)
  })

  it('removes only the matching source namespace when ids are reused', async () => {
    const { backend, upsertCanonical } = await createBackendHarness()
    const records = [
      {
        id: 'vector-reflection-shared-id',
        cardId: 'card-a',
        sourceId: 'shared-source',
        source: 'memory_reflections',
        text: 'reflection memory',
        vector: [1, 0, 0],
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: modelAVectorSpaceId,
        updatedAt: 10,
        metadata: {},
      },
      {
        id: 'vector-episode-shared-id',
        cardId: 'card-a',
        sourceId: 'shared-source',
        source: 'episodic_events',
        text: 'episode memory',
        vector: [1, 0, 0],
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: modelAVectorSpaceId,
        updatedAt: 10,
        metadata: {},
      },
    ]
    await upsertCanonical(records)
    await backend.upsert(records)

    expect(await backend.delete({
      cardId: 'card-a',
      sourceIds: ['shared-source'],
      source: 'memory_reflections',
    })).toBe(1)
    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      source: 'memory_reflections',
      limit: 4,
    })).resolves.toEqual([])
    await expect(backend.search([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      source: 'episodic_events',
      limit: 4,
    })).resolves.toHaveLength(1)
  })

  it('removes only the matching embedding space when source ids are reused', async () => {
    const { backend, upsertCanonical } = await createBackendHarness()
    const records = [
      {
        id: 'vector-space-a',
        cardId: 'card-shared-vector-space',
        sourceId: 'shared-source',
        source: 'memory_reflections',
        text: '原生索引删除必须严格限定向量空间。',
        vector: [1, 0, 0],
        modelId: 'model-a',
        dimensions: 3,
        vectorSpaceId: modelAVectorSpaceId,
        updatedAt: 10,
      },
      {
        id: 'vector-space-b',
        cardId: 'card-shared-vector-space',
        sourceId: 'shared-source',
        source: 'memory_reflections',
        text: '原生索引删除必须严格限定向量空间。',
        vector: [0, 1, 0],
        modelId: 'model-b',
        dimensions: 3,
        vectorSpaceId: 'model-b:3',
        updatedAt: 10,
      },
    ]
    await upsertCanonical(records)
    await backend.upsert(records)

    expect(await backend.delete({
      cardId: 'card-shared-vector-space',
      sourceIds: ['shared-source'],
      source: 'memory_reflections',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).toBe(1)
    await expect(backend.search([1, 0, 0], {
      cardId: 'card-shared-vector-space',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })).resolves.toEqual([])
    await expect(backend.search([0, 1, 0], {
      cardId: 'card-shared-vector-space',
      modelId: 'model-b',
      dimensions: 3,
      vectorSpaceId: 'model-b:3',
      limit: 4,
    })).resolves.toHaveLength(1)
  })
})
