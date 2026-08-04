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
    prepareCanonical: async (records: Array<{
      cardId: string
      source: string
      sourceId: string
      text: string
    }>) => {
      await run(database, 'BEGIN IMMEDIATE')
      try {
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
        await run(database, 'COMMIT')
      }
      catch (error) {
        await run(database, 'ROLLBACK').catch(() => {})
        throw error
      }
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
        adapter: database.adapter,
        prepareCanonical: database.prepareCanonical,
        cardId: 'card-soak',
        foreignCardId: 'card-soak-foreign',
        modelId: 'deterministic-soak-v1',
        dimensions: 12,
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
})
