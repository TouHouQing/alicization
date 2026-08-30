import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

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
      ) VALUES (?, ?, ?, ?, ?, ?)
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
