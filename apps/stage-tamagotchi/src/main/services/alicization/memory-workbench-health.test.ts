import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { getLoadablePath } from 'sqlite-vec'
import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import {
  calculateMemoryWorkbenchP95Latency,
  deriveMemoryWorkbenchStatus,
  formatMemoryWorkbenchRecallDegradation,
  summarizeMemoryWorkbenchQueueRows,
} from './memory-workbench-health'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-workbench-health-'))
  sandboxDirs.push(dir)
  return dir
}

function openRawDatabase(filepath: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const database = new sqlite3.Database(filepath, (error) => {
      if (error)
        reject(error)
      else
        resolve(database)
    })
  })
}

function executeRawSql(database: sqlite3.Database, sql: string) {
  return new Promise<void>((resolve, reject) => {
    database.exec(sql, (error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function closeRawDatabase(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close((error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function loadSqliteVec(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.loadExtension(getLoadablePath(), error => error ? reject(error) : resolve())
  })
}

async function waitFor<T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 2_000,
) {
  const deadline = Date.now() + timeoutMs
  let value = await read()
  while (!predicate(value) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10))
    value = await read()
  }
  return value
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (!dir)
      continue
    await rm(dir, { recursive: true, force: true })
  }
})

describe('memory workbench health', () => {
  it('summarizes queue statuses into workbench health counters', () => {
    expect(summarizeMemoryWorkbenchQueueRows([
      { status: 'pending' },
      { status: 'admitted' },
      { status: 'needs-user-review' },
      { status: 'applied' },
      { status: 'failed' },
      { status: 'dead-lettered' },
      { status: 'rejected' },
    ])).toEqual({
      pending: 2,
      review: 1,
      applied: 1,
      failed: 1,
      deadLettered: 1,
    })
  })

  it('calculates p95 latency using nearest-rank semantics', () => {
    expect(calculateMemoryWorkbenchP95Latency([10, 20, 30, 40, 50])).toBe(50)
  })

  it('marks health degraded when errors or queue failures exist', () => {
    expect(deriveMemoryWorkbenchStatus({
      errors: [],
      queueFailed: 0,
      embeddingConfigured: true,
    })).toBe('ok')
    expect(deriveMemoryWorkbenchStatus({
      errors: ['recall failed'],
      queueFailed: 0,
      embeddingConfigured: true,
    })).toBe('degraded')
    expect(deriveMemoryWorkbenchStatus({
      errors: [],
      queueFailed: 1,
      embeddingConfigured: true,
    })).toBe('degraded')
  })

  it('keeps every degraded recall channel visible when error messages are long', () => {
    const formatted = formatMemoryWorkbenchRecallDegradation([
      { channel: 'index', error: `index-${'x'.repeat(400)}` },
      { channel: 'episodic', error: `episodic-${'y'.repeat(400)}` },
      { channel: 'semantic', error: `semantic-${'z'.repeat(400)}` },
    ])

    expect(formatted).toContain('index:')
    expect(formatted).toContain('episodic:')
    expect(formatted).toContain('semantic:')
    expect(formatted?.length).toBeLessThanOrEqual(240)
  })

  it('reports real queue health from working memory long-term transactions', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.enqueueWorkingMemoryLongTermQueueItems({
        cardId: 'default',
        sessionId: 'session-health',
        items: [
          {
            id: 'queue-health-applied',
            source: 'working-memory-owner',
            memoryEvidence: {
              version: 'working-memory-long-term-evidence-v1',
              source: 'explicit-structured-memory-evidence',
              kind: 'correction',
              summary: '用户不要固定模板回复。',
              reason: 'User corrected Alicization reply behavior.',
              evidenceSnippets: ['不要固定模板回复。'],
              salience: 0.88,
              sensitivity: 'personal',
              confidence: 0.88,
            },
            kind: 'correction',
            summary: '用户不要固定模板回复。',
            reason: 'User corrected Alicization reply behavior.',
            sourceTurnIds: ['turn-1:user'],
            evidenceSnippets: ['不要固定模板回复。'],
            salience: 0.88,
            confidence: 0.88,
            sensitivity: 'personal',
            allowTraining: false,
            status: 'pending-cleaning',
            rejectionReasons: [],
            contaminationFlags: [],
            createdAt: 2_000,
          },
          {
            id: 'queue-health-review',
            source: 'working-memory-owner',
            memoryEvidence: {
              version: 'working-memory-long-term-evidence-v1',
              source: 'explicit-structured-memory-evidence',
              kind: 'correction',
              summary: '用户希望以后对话节奏安静一点。',
              reason: 'User gave a gentle conversation style note.',
              evidenceSnippets: ['以后节奏安静一点。'],
              salience: 0.82,
              sensitivity: 'personal',
              confidence: 0.68,
            },
            kind: 'correction',
            summary: '用户希望以后对话节奏安静一点。',
            reason: 'User gave a gentle conversation style note.',
            sourceTurnIds: ['turn-2:user'],
            evidenceSnippets: ['以后节奏安静一点。'],
            salience: 0.82,
            confidence: 0.68,
            sensitivity: 'personal',
            allowTraining: false,
            status: 'pending-cleaning',
            rejectionReasons: [],
            contaminationFlags: [],
            createdAt: 2_100,
          },
        ],
      })

      expect(await db.getMemoryWorkbenchQueueHealth({ cardId: 'default' })).toEqual({
        pending: 2,
        review: 0,
        applied: 0,
        failed: 0,
        deadLettered: 0,
      })

      await db.drainWorkingMemoryLongTermQueue(4)

      expect(await db.getMemoryWorkbenchQueueHealth({ cardId: 'default' })).toEqual({
        pending: 0,
        review: 1,
        applied: 1,
        failed: 0,
        deadLettered: 0,
      })
    }
    finally {
      await db.close()
    }
  })

  it('records recall probe latency into recall health', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.runMemoryWorkbenchRecallProbe({
        cardId: 'default',
        query: '你还记得我不要固定模板回复吗？',
        limit: 4,
      })

      const recall = await db.getMemoryWorkbenchRecallHealth({ cardId: 'default' })
      expect(recall.lastLatencyMs).not.toBeNull()
      expect(recall.p95LatencyMs).not.toBeNull()
    }
    finally {
      await db.close()
    }
  })

  it('records real dialogue long-term recall latency into workbench health', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.retrieveLongTermMemoryEvidence({
        cardId: 'default',
        currentUserText: '你还记得我之前说过不要固定模板回复吗？',
        limit: 4,
      })

      const recall = await db.getMemoryWorkbenchRecallHealth({ cardId: 'default' })
      expect(recall.lastLatencyMs).not.toBeNull()
      expect(recall.p95LatencyMs).not.toBeNull()
      expect(recall.lastError).toBeNull()
    }
    finally {
      await db.close()
    }
  })

  it('uses the latest inserted recall metric when timestamps are identical', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const rawDatabase = await openRawDatabase(db.dbPath)
    try {
      await executeRawSql(rawDatabase, `
        INSERT INTO memory_workbench_recall_metrics (
          id, card_id, query, mode, latency_ms, evidence_count,
          semantic_available, error, created_at
        ) VALUES
          ('metric-earlier', 'default', 'first', 'none', 10, 0, 0, 'old failure', 1000),
          ('metric-later', 'default', 'second', 'none', 20, 0, 1, NULL, 1000);
      `)

      const recall = await db.getMemoryWorkbenchRecallHealth({ cardId: 'default' })
      expect(recall.lastLatencyMs).toBe(20)
      expect(recall.lastError).toBeNull()
    }
    finally {
      await closeRawDatabase(rawDatabase)
      await db.close()
    }
  })

  it('keeps lexical recall usable but records semantic provider failures in recall health', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      embeddingProvider: {
        modelId: 'broken-local-embedding',
        dimensions: 3,
        vectorSpaceId: 'test:broken-local-embedding:3',
        embedTexts: async () => {
          throw new Error('embedding model not loaded')
        },
      },
    })
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-transparent-failures',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'boundary',
        summary: '用户希望失败时明确说明真实原因。',
        lesson: 'Provider 或工具失败时透明说明，不用模板遮盖。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 10,
        updatedAt: 10,
      }])

      const bundle = await db.retrieveLongTermMemoryEvidence({
        cardId: 'default',
        currentUserText: '你还记得我说过失败时要明确说明真实原因吗？',
        limit: 4,
      })

      expect(bundle.evidence.map(item => item.candidate.id)).toContain('reflection-transparent-failures')
      const recall = await db.getMemoryWorkbenchRecallHealth({ cardId: 'default' })
      expect(recall.lastLatencyMs).not.toBeNull()
      expect(recall.lastError).toContain('embedding model not loaded')
    }
    finally {
      await db.close()
    }
  })

  it('keeps dialogue recall available while exposing index and episodic channel degradation', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const rawDatabase = await openRawDatabase(db.dbPath)
    try {
      await executeRawSql(rawDatabase, `
        DROP TABLE long_term_memory_search_documents;
        DROP TABLE episodic_events;
      `)

      const bundle = await db.retrieveLongTermMemoryEvidence({
        cardId: 'default',
        currentUserText: '你还记得我们之前讨论过的长期记忆检索方案吗？',
        limit: 4,
      })
      expect(bundle.evidence).toEqual([])

      const recall = await db.getMemoryWorkbenchRecallHealth({ cardId: 'default' })
      expect(recall.lastError).toContain('index:')
      expect(recall.lastError).toContain('episodic:')
      expect(recall.lastError).toContain('no such table: long_term_memory_search_documents')
      expect(recall.lastError).toContain('no such table: episodic_events')

      const probe = await db.runMemoryWorkbenchRecallProbe({
        cardId: 'default',
        query: '你还记得我们之前讨论过的长期记忆检索方案吗？',
        limit: 4,
      })
      expect(probe.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('index: SQLITE_ERROR: no such table: long_term_memory_search_documents'),
        expect.stringContaining('episodic: SQLITE_ERROR: no such table: episodic_events'),
      ]))
    }
    finally {
      await closeRawDatabase(rawDatabase)
      await db.close()
    }
  })

  it('reports the truthful vector index mode and latest reindex job state', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      embeddingProvider: {
        modelId: 'test-embedding',
        dimensions: 3,
        vectorSpaceId: 'test:memory-workbench-health',
        embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
      },
    })
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-index-health',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '向量索引健康必须诚实显示实际运行模式。',
        lesson: '没有 native ANN 时显示 brute-force 和 degraded。',
        status: 'confirmed',
        confidence: 0.9,
      }])
      const scheduled = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'default',
        sourceIds: ['reflection-index-health'],
        limit: 1,
      })
      const health = await db.getMemoryWorkbenchEmbeddingHealth({ cardId: 'default' })

      expect(health).toMatchObject({
        providerConfigured: true,
        modelId: 'test-embedding',
        dimensions: 3,
        indexMode: 'sqlite-vec',
        approximate: true,
        degraded: false,
        nativeIndexReady: true,
        searchReady: false,
        lastError: null,
        reindexJob: {
          cardId: 'default',
        },
      })
      expect(health.reindexJob?.jobId).toBe(scheduled.jobId)
    }
    finally {
      await db.close()
    }
  })

  it('keeps current index health separate from a historical failed reindex job', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const db = await setupAlicizationDb(userDataPath, {
      embeddingProvider: {
        modelId: 'failed-job-health-embedding',
        dimensions: 3,
        vectorSpaceId: 'failed-job-health-embedding:3',
        embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
      },
    })
    let rawDatabase: sqlite3.Database | null = null
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-failed-job-health',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '当前索引健康，但历史修复任务可以单独失败。',
        lesson: '任务状态不应伪装成当前长期记忆不可搜索。',
        status: 'confirmed',
        confidence: 0.9,
      }])
      const scheduled = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'default',
        sourceIds: ['reflection-failed-job-health'],
        limit: 1,
      })
      await waitFor(
        async () => await db.reindexMemoryWorkbenchEmbeddings({
          cardId: 'default',
          action: 'status',
          jobId: scheduled.jobId!,
        }),
        progress => progress.status === 'completed',
      )

      rawDatabase = await openRawDatabase(db.dbPath)
      await executeRawSql(rawDatabase, `
        UPDATE memory_embedding_reindex_jobs
        SET status = 'failed',
            stage = 'failed',
            last_error = 'historical repair failure'
        WHERE id = '${scheduled.jobId}';
      `)
      await closeRawDatabase(rawDatabase)
      rawDatabase = null

      await expect(db.getMemoryWorkbenchEmbeddingHealth({ cardId: 'default' })).resolves.toMatchObject({
        reindexRequired: false,
        searchReady: true,
        reindexJob: {
          status: 'failed',
        },
      })
    }
    finally {
      if (rawDatabase)
        await closeRawDatabase(rawDatabase)
      await db.close()
    }
  })

  it('schedules an asynchronous native index rebuild after restart finds a missing index', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const provider = {
      modelId: 'migration-embedding',
      dimensions: 3,
      vectorSpaceId: 'migration-embedding:3',
      embedTexts: async (texts: string[]) => texts.map(text => ({
        text,
        vector: [1, 0, 0],
      })),
    }
    const db = await setupAlicizationDb(userDataPath, {
      cardId: 'card-native-migration',
      embeddingProvider: provider,
    })
    let dbPath = ''
    let initialJobId: string | null = null
    try {
      dbPath = db.dbPath
      await db.upsertMemoryReflections([{
        id: 'reflection-native-migration',
        cardId: 'card-native-migration',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '索引迁移必须在后台完成。',
        lesson: '启动不能被大规模原生索引重建阻塞。',
        status: 'confirmed',
        confidence: 0.9,
      }])
      const initialJob = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'card-native-migration',
        sourceIds: ['reflection-native-migration'],
        limit: 1,
      })
      expect(initialJob.jobId).toBeTruthy()
      initialJobId = initialJob.jobId ?? null
      await waitFor(
        async () => await db.reindexMemoryWorkbenchEmbeddings({
          cardId: 'card-native-migration',
          action: 'status',
          jobId: initialJob.jobId!,
        }),
        progress => progress.status === 'completed',
      )
    }
    finally {
      await db.close()
    }

    const rawDatabase = await openRawDatabase(dbPath)
    try {
      await loadSqliteVec(rawDatabase)
      await executeRawSql(rawDatabase, `
        DROP TABLE IF EXISTS long_term_memory_vec_3;
        DELETE FROM long_term_memory_sqlite_vec_rows;
        UPDATE memory_embedding_reindex_jobs
        SET status = 'cancelled',
            stage = 'cancelled',
            last_error = 'previous native index rebuild was cancelled'
        WHERE id = '${initialJobId}';
      `)
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    let releaseEmbedding!: () => void
    const embeddingGate = new Promise<void>((resolve) => {
      releaseEmbedding = resolve
    })
    const reopened = await setupAlicizationDb(userDataPath, {
      cardId: 'card-native-migration',
      embeddingProvider: {
        ...provider,
        embedTexts: async (texts: string[]) => {
          await embeddingGate
          return texts.map(text => ({
            text,
            vector: [1, 0, 0],
          }))
        },
      },
    })
    try {
      const rebuilding = await waitFor(
        async () => await reopened.getMemoryWorkbenchEmbeddingHealth({
          cardId: 'card-native-migration',
        }),
        value => value.reindexJob?.status === 'running' && value.searchReady,
      )
      expect(rebuilding).toMatchObject({
        reindexRequired: true,
        indexMode: 'brute-force',
        degraded: true,
        nativeIndexReady: false,
        searchReady: true,
        reindexJob: {
          status: 'running',
        },
      })
      expect(rebuilding.reindexJob?.jobId).not.toBe(initialJobId)

      releaseEmbedding()
      const health = await waitFor(
        async () => await reopened.getMemoryWorkbenchEmbeddingHealth({
          cardId: 'card-native-migration',
        }),
        value => value.reindexJob?.status === 'completed' && value.nativeIndexReady,
      )

      expect(health).toMatchObject({
        reindexRequired: false,
        nativeIndexReady: true,
        degraded: false,
        reindexJob: {
          status: 'completed',
        },
      })
    }
    finally {
      releaseEmbedding()
      await reopened.close()
    }
  })

  it('isolates embedding health from jobs created in another vector space', async () => {
    const providerA = {
      modelId: 'embedding-a',
      dimensions: 3,
      vectorSpaceId: 'space-a',
      embedTexts: async (texts: string[]) => texts.map(text => ({ text, vector: [1, 0, 0] })),
    }
    const providerB = {
      modelId: 'embedding-b',
      dimensions: 4,
      vectorSpaceId: 'space-b',
      embedTexts: async (texts: string[]) => texts.map(text => ({ text, vector: [0, 1, 0, 0] })),
    }
    let activeProvider = providerA
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      resolveEmbeddingProvider: () => activeProvider,
    })
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-vector-space-health',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '当前向量空间健康不能被其他模型的任务污染。',
        lesson: '健康聚合必须按 vectorSpaceId 隔离。',
        status: 'confirmed',
        confidence: 0.9,
      }])
      const readyA = await waitFor(
        async () => await db.getMemoryWorkbenchEmbeddingHealth({ cardId: 'default' }),
        health =>
          health.searchReady
          && !health.reindexRequired
          && health.vectorSpaceId === 'space-a',
      )
      expect(readyA).toMatchObject({
        searchReady: true,
        reindexRequired: false,
        vectorSpaceId: 'space-a',
      })

      activeProvider = providerB
      const scheduledB = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'default',
        sourceIds: ['reflection-vector-space-health'],
        limit: 1,
      })
      expect(scheduledB.vectorSpaceId).toBe('space-b')
      activeProvider = providerA

      const healthA = await db.getMemoryWorkbenchEmbeddingHealth({ cardId: 'default' })
      expect(healthA).toMatchObject({
        searchReady: true,
        reindexRequired: false,
        vectorSpaceId: 'space-a',
        reindexJob: {
          vectorSpaceId: 'space-a',
        },
      })
    }
    finally {
      await db.close()
    }
  })
})
