import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'
import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import { runMemorySemanticScaleVectorAdapterSoak } from './memory-semantic-scale-soak-runtime'

const sandboxDirs: string[] = []

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

function close(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve())
  })
}

async function createSoakDatabase() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-vector-soak-'))
  sandboxDirs.push(dir)
  const database = new sqlite3.Database(join(dir, 'soak.sqlite'))
  await run(database, 'PRAGMA journal_mode = WAL')
  await run(database, 'PRAGMA synchronous = NORMAL')
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
  await run(
    database,
    `CREATE INDEX idx_semantic_scale_search_docs_identity
     ON long_term_memory_search_documents(card_id, source, source_id, text_hash, tombstoned)`,
  )
  let writeQueue = Promise.resolve<unknown>(undefined)
  let writeTransactionActive = false
  const enqueueWrite = async <T>(task: () => Promise<T>) => {
    if (writeTransactionActive)
      return await task()
    const next = writeQueue.then(async () => {
      await run(database, 'BEGIN IMMEDIATE')
      writeTransactionActive = true
      try {
        const result = await task()
        await run(database, 'COMMIT')
        return result
      }
      catch (error) {
        await run(database, 'ROLLBACK').catch(() => {})
        throw error
      }
      finally {
        writeTransactionActive = false
      }
    })
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }
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
  return {
    adapter,
    close: async () => await close(database),
    withBatchWrite: async (task: () => Promise<void>) => await enqueueWrite(task),
    prepareCanonical: async (records: Array<{
      cardId: string
      source: string
      sourceId: string
      text: string
    }>) => {
      await enqueueWrite(async () => {
        await run(database, `
          INSERT OR REPLACE INTO long_term_memory_search_documents (
            id, card_id, source, source_id, text_hash, tombstoned
          ) VALUES ${records.map(() => '(?, ?, ?, ?, ?, 0)').join(', ')}
        `, records.flatMap(record => [
          `doc:${record.cardId}:${record.source}:${record.sourceId}`,
          record.cardId,
          record.source,
          record.sourceId,
          hashLongTermMemoryEmbeddingText(record.text),
        ]))
      })
    },
  }
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (dir)
      await rm(dir, { recursive: true, force: true })
  }
})

describe('memory semantic scale soak runtime', () => {
  it('reports persisted-work progress after every index batch and query round', async () => {
    const database = await createSoakDatabase()
    const progress: Array<{
      phase: string
      completed: number
      total: number
      ratio: number
      indexedCount: number
      queryCount: number
      corpusSize: number
    }> = []
    try {
      await runMemorySemanticScaleVectorAdapterSoak({
        id: 'sqlite-vec-progress-soak',
        createdAt: Date.parse('2026-08-15T00:00:00.000Z'),
        gate: 'adapter-smoke',
        resourcePreflight: {
          passed: true,
          requiredDiskBytes: 1,
          availableDiskBytes: 1_000_000,
          requiredMemoryBytes: 1,
          availableMemoryBytes: 1_000_000,
          failures: [],
        },
        adapter: database.adapter,
        prepareCanonical: database.prepareCanonical,
        withBatchWrite: database.withBatchWrite,
        cardId: 'card-progress',
        foreignCardId: 'card-progress-foreign',
        modelId: 'deterministic-soak-v1',
        dimensions: 12,
        vectorSpaceId: 'test:semantic-scale:progress',
        corpusSizes: [20],
        queryCount: 4,
        batchSize: 10,
        onProgress: async (next) => {
          progress.push(next)
        },
      })

      expect(progress.filter(item => item.phase === 'indexing')).toHaveLength(2)
      expect(progress.filter(item => item.phase === 'querying')).toHaveLength(4)
      expect(progress.map(item => item.completed)).toEqual([1, 2, 3, 4, 5, 6])
      expect(progress.at(-1)).toMatchObject({
        phase: 'querying',
        total: 6,
        ratio: 1,
        indexedCount: 20,
        queryCount: 4,
        corpusSize: 20,
      })
    }
    finally {
      await database.close()
    }
  })

  it('aborts the real sqlite-vec soak between index batches', async () => {
    const database = await createSoakDatabase()
    const controller = new AbortController()
    let indexedBatchCount = 0
    try {
      await expect(runMemorySemanticScaleVectorAdapterSoak({
        id: 'sqlite-vec-cancelled-soak',
        createdAt: Date.parse('2026-08-15T00:00:00.000Z'),
        gate: 'adapter-smoke',
        resourcePreflight: {
          passed: true,
          requiredDiskBytes: 1,
          availableDiskBytes: 1_000_000,
          requiredMemoryBytes: 1,
          availableMemoryBytes: 1_000_000,
          failures: [],
        },
        adapter: database.adapter,
        prepareCanonical: database.prepareCanonical,
        withBatchWrite: database.withBatchWrite,
        cardId: 'card-cancelled',
        foreignCardId: 'card-cancelled-foreign',
        modelId: 'deterministic-soak-v1',
        dimensions: 12,
        vectorSpaceId: 'test:semantic-scale:cancelled',
        corpusSizes: [1_000],
        queryCount: 4,
        batchSize: 100,
        signal: controller.signal,
        onProgress: async (progress) => {
          if (progress.phase !== 'indexing')
            return
          indexedBatchCount += 1
          controller.abort(new DOMException('cancel semantic scale soak', 'AbortError'))
        },
      })).rejects.toMatchObject({
        name: 'AbortError',
        message: 'cancel semantic scale soak',
      })
      expect(indexedBatchCount).toBe(1)
    }
    finally {
      await database.close()
    }
  })

  it('runs a real sqlite-vec adapter soak at 10k and optionally 100k scale', async () => {
    const database = await createSoakDatabase()
    const smokeCorpusSize = Math.max(1, Number(process.env.ALICIZATION_MEMORY_SOAK_SIZE ?? 10_000))
    const corpusSizes = process.env.ALICIZATION_MEMORY_SOAK_100K === '1'
      ? [smokeCorpusSize, 100_000]
      : [smokeCorpusSize]
    try {
      const report = await runMemorySemanticScaleVectorAdapterSoak({
        id: 'sqlite-vec-real-soak',
        createdAt: Date.parse('2026-08-04T16:00:00.000Z'),
        gate: 'adapter-smoke',
        resourcePreflight: {
          passed: true,
          requiredDiskBytes: 1,
          availableDiskBytes: 1_000_000,
          requiredMemoryBytes: 1,
          availableMemoryBytes: 1_000_000,
          failures: [],
        },
        adapter: database.adapter,
        prepareCanonical: database.prepareCanonical,
        withBatchWrite: database.withBatchWrite,
        cardId: 'card-soak',
        foreignCardId: 'card-soak-foreign',
        modelId: 'deterministic-soak-v1',
        dimensions: 12,
        vectorSpaceId: 'test:semantic-scale:real-soak',
        corpusSizes,
        queryCount: 12,
        batchSize: 500,
        maxP95LatencyMs: 2_000,
        maxP99LatencyMs: 4_000,
      })

      expect(report.passed, JSON.stringify(report.summary)).toBe(true)
      expect(report.summary.corpusSize).toBe(corpusSizes.at(-1))
      expect(report.summary.recallAtK).toBe(1)
      expect(report.summary.falseRecallRate).toBe(0)
      expect(report.searchMetrics.every(metric => metric.indexMode === 'sqlite-vec')).toBe(true)
      expect(report.searchMetrics.every(metric => metric.nativeIndexReady)).toBe(true)
      expect(JSON.parse(JSON.stringify(report))).toEqual(report)
    }
    finally {
      await database.close()
    }
  }, process.env.ALICIZATION_MEMORY_SOAK_100K === '1' ? 300_000 : 120_000)

  it('records non-self query evidence instead of reusing the stored target vector', async () => {
    const database = await createSoakDatabase()
    try {
      const report = await runMemorySemanticScaleVectorAdapterSoak({
        id: 'sqlite-vec-non-self-query',
        createdAt: Date.parse('2026-08-15T00:00:00.000Z'),
        gate: 'adapter-smoke',
        resourcePreflight: {
          passed: true,
          requiredDiskBytes: 1,
          availableDiskBytes: 1_000_000,
          requiredMemoryBytes: 1,
          availableMemoryBytes: 1_000_000,
          failures: [],
        },
        adapter: database.adapter,
        prepareCanonical: database.prepareCanonical,
        withBatchWrite: database.withBatchWrite,
        cardId: 'card-non-self',
        foreignCardId: 'card-non-self-foreign',
        modelId: 'deterministic-soak-v1',
        dimensions: 12,
        vectorSpaceId: 'test:semantic-scale:non-self-query',
        corpusSizes: [20],
        queryCount: 4,
        batchSize: 10,
      })

      const queries = report.searchMetrics[0]?.queryCount
      expect(queries).toBe(4)
      expect(report.searchMetrics[0]?.failures).not.toContain('self-query-used')
      expect(report.searchMetrics[0]?.failures).not.toContain('query-text-missing')
    }
    finally {
      await database.close()
    }
  })
})
