import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'
import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import {
  applyMemorySemanticScaleAcceptanceGate,
  runMemorySemanticScaleOperationalProbes,
  runMemorySemanticScaleVectorAdapterSoak,
} from './memory-semantic-scale-soak-runtime'

const sandboxDirs: string[] = []

function summarizeDurations(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const percentile = (ratio: number) => {
    if (sorted.length === 0)
      return 0
    return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0
  }
  return {
    count: sorted.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
  }
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
  const nativeSearchDurations: number[] = []
  const nativeHealthDurations: number[] = []
  const getWithDiagnostics = async <T>(
    targetDatabase: sqlite3.Database,
    sql: string,
    params: unknown[] = [],
  ) => {
    const startedAt = performance.now()
    try {
      return await get<T>(targetDatabase, sql, params)
    }
    finally {
      if (
        sql.includes('long_term_memory_sqlite_vec_rows')
        || sql.includes('long_term_memory_vectors')
        || sql.includes('long_term_memory_vec_')
      ) {
        nativeHealthDurations.push(performance.now() - startedAt)
      }
    }
  }
  const allWithDiagnostics = async <T>(
    targetDatabase: sqlite3.Database,
    sql: string,
    params: unknown[] = [],
  ) => {
    const startedAt = performance.now()
    try {
      return await all<T>(targetDatabase, sql, params)
    }
    finally {
      if (sql.includes('native.embedding MATCH'))
        nativeSearchDurations.push(performance.now() - startedAt)
    }
  }
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
    all: allWithDiagnostics,
    enqueueWrite,
    now: () => Date.now(),
  })
  const adapter = createLongTermMemoryVectorIndexAdapter({
    store,
    native: createSqliteVecLongTermMemoryVectorBackend({
      database,
      now: () => Date.now(),
      run,
      get: getWithDiagnostics,
      all: allWithDiagnostics,
      enqueueWrite,
    }),
  })
  await adapter.initialize()
  return {
    adapter,
    nativeHealthDurations,
    nativeSearchDurations,
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
  it('fails the production acceptance gate when scale, latency, or lifecycle evidence is missing', () => {
    const report = applyMemorySemanticScaleAcceptanceGate({
      version: 'memory-semantic-scale-soak-harness-v1',
      id: 'missing-production-evidence',
      createdAt: 1,
      passed: true,
      summary: {
        corpusSize: 9_999,
        queryCount: 0,
        p95LatencyMs: Number.NaN,
        p99LatencyMs: Number.NaN,
        recallAtK: 1,
        falseRecallRate: 0,
        coverageRatio: 1,
        failingChecks: [],
      },
      resourceMetrics: {
        dimensions: 3,
        vectorInput: 'unavailable',
        elapsedMs: 1,
        peakRssBytes: 1,
        sqliteBytes: 1,
        sqliteWalBytes: 0,
        cpuUserMs: 0,
        cpuSystemMs: 0,
      },
      resourcePreflight: null,
      searchMetrics: [],
      providerDegradation: null,
      reindex: null,
      recommendedNextActions: [],
    }, {
      tier: '10k',
      maxP95LatencyMs: 100,
      maxP99LatencyMs: 200,
      operationalProbes: null,
    })

    expect(report.passed).toBe(false)
    expect(report.acceptance.passed).toBe(false)
    expect(report.summary.failingChecks).toEqual(expect.arrayContaining([
      'scale-corpus-incomplete',
      'scale-query-evidence-missing',
      'latency-p95-missing',
      'latency-p99-missing',
      'production-provider-required',
      'provider-degradation-probe-missing',
      'model-switch-reindex-probe-missing',
      'reindex-cancellation-probe-missing',
      'reindex-retry-probe-missing',
      'reindex-dead-letter-probe-missing',
      'reindex-crash-recovery-probe-missing',
    ]))
  })

  it('runs real sqlite reindex lifecycle probes for cancellation, retry, dead-letter, and crash recovery', async () => {
    const probes = await runMemorySemanticScaleOperationalProbes({
      cardId: 'card-operational-probes',
      createdAt: Date.parse('2026-09-01T00:00:00.000Z'),
    })

    expect(probes.passed, JSON.stringify(probes, null, 2)).toBe(true)
    expect(probes.mode).toBe('sqlite-runtime-fixture')
    expect(probes.providerDegradation).toMatchObject({
      passed: true,
      errorVisible: true,
      fallbackRecallAtK: 1,
    })
    expect(probes.reindex).toMatchObject({
      passed: true,
      reindexRequired: true,
      modelSpaceChanged: true,
      observations: {
        cancellationObserved: true,
        retryObserved: true,
        deadLetterObserved: true,
        crashRecoveryObserved: true,
      },
    })
    expect(probes.lifecycle).toMatchObject({
      cancellation: {
        passed: true,
        finalStatus: 'cancelled',
      },
      retry: {
        passed: true,
        attempts: 2,
        finalStatus: 'completed',
      },
      deadLetter: {
        passed: true,
        attempts: 2,
        deadLettered: 1,
        finalStatus: 'failed',
      },
      crashRecovery: {
        passed: true,
        recoveredLeases: 1,
        finalStatus: 'completed',
      },
    })
  }, 30_000)

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

  it('passes the soak AbortSignal into every embedding request', async () => {
    const database = await createSoakDatabase()
    const controller = new AbortController()
    const observedSignals: Array<AbortSignal | undefined> = []
    try {
      await runMemorySemanticScaleVectorAdapterSoak({
        id: 'sqlite-vec-embedding-signal',
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
        embeddingProvider: {
          embedTexts: async (texts, signal) => {
            observedSignals.push(signal)
            return texts.map(text => ({
              text,
              vector: [1, 0, 0, 0],
            }))
          },
        },
        adapter: database.adapter,
        prepareCanonical: database.prepareCanonical,
        withBatchWrite: database.withBatchWrite,
        cardId: 'card-embedding-signal',
        foreignCardId: 'card-embedding-signal-foreign',
        modelId: 'embedding-signal-test',
        dimensions: 4,
        vectorSpaceId: 'test:semantic-scale:embedding-signal',
        corpusSizes: [2],
        queryCount: 1,
        batchSize: 2,
        signal: controller.signal,
      })

      expect(observedSignals.length).toBeGreaterThan(0)
      expect(observedSignals.every(signal => signal === controller.signal)).toBe(true)
    }
    finally {
      await database.close()
    }
  })

  it('builds provider queries from the same stable retrieval anchor as stored memories', async () => {
    const database = await createSoakDatabase()
    const embeddingBatches: string[][] = []
    try {
      const report = await runMemorySemanticScaleVectorAdapterSoak({
        id: 'sqlite-vec-semantic-anchor',
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
        embeddingProvider: {
          embedTexts: async (texts) => {
            embeddingBatches.push([...texts])
            return texts.map(text => ({
              text,
              vector: [1, 0, 0, 0],
            }))
          },
        },
        adapter: database.adapter,
        prepareCanonical: database.prepareCanonical,
        withBatchWrite: database.withBatchWrite,
        cardId: 'card-semantic-anchor',
        foreignCardId: 'card-semantic-anchor-foreign',
        modelId: 'semantic-anchor-test',
        dimensions: 4,
        vectorSpaceId: 'test:semantic-scale:anchor',
        corpusSizes: [1],
        queryCount: 1,
        batchSize: 1,
      })

      const storedText = embeddingBatches[0]?.[0] ?? ''
      const queryText = embeddingBatches.at(-1)?.[0] ?? ''
      expect(storedText).toContain('retrieval anchor')
      expect(queryText).toContain('retrieval anchor')
      expect(queryText).not.toBe(storedText)
      expect(report.searchMetrics[0]?.queryCount).toBe(1)
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
        maxP95LatencyMs: corpusSizes.includes(100_000) ? 250 : 3_000,
        maxP99LatencyMs: corpusSizes.includes(100_000) ? 500 : 5_000,
      })

      if (process.env.ALICIZATION_MEMORY_SOAK_DIAGNOSTICS === '1') {
        console.info(JSON.stringify({
          summary: report.summary,
          searchMetrics: report.searchMetrics,
          nativeHealthDurations: summarizeDurations(database.nativeHealthDurations),
          nativeSearchDurations: summarizeDurations(database.nativeSearchDurations),
        }, null, 2))
      }
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
