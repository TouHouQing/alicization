import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'

const sandboxDirs: string[] = []

const modelAVectorSpaceId = 'model-a:3'
const modelTransactionVectorSpaceId = 'model-transaction:3'
const modelLongTextVectorSpaceId = 'model-long-text:3'
const modelOrphanCleanupVectorSpaceId = 'model-orphan-cleanup:3'
const oldModelVectorSpaceId = 'old-model:3'
const newModelVectorSpaceId = 'new-model:3'
const sameModel3dVectorSpaceId = 'same-model:3'
const sameModel2dVectorSpaceId = 'same-model:2'
const modelSharedSourceIdVectorSpaceId = 'model-shared-source-id:3'

function run(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, (error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function all<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error)
        reject(error)
      else
        resolve(rows as T[])
    })
  })
}

async function createSandboxDatabase() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-persistent-vector-'))
  sandboxDirs.push(dir)
  const database = new sqlite3.Database(join(dir, 'vectors.sqlite'))
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
  return database
}

async function upsertCanonicalDocument(database: sqlite3.Database, input: {
  cardId: string
  sourceId: string
  source: string
  text: string
}) {
  await run(
    database,
    `
    INSERT OR REPLACE INTO long_term_memory_search_documents (
      id, card_id, source, source_id, text_hash, tombstoned
    ) VALUES (?, ?, ?, ?, ?, 0)
    `,
    [
      `doc:${input.cardId}:${input.source}:${input.sourceId}`,
      input.cardId,
      input.source,
      input.sourceId,
      hashLongTermMemoryEmbeddingText(input.text),
    ],
  )
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (!dir)
      continue
    await rm(dir, { recursive: true, force: true })
  }
})

describe('persistent long-term memory vector store', () => {
  it('keeps vector spaces isolated by model id and dimensions across restarts', async () => {
    const database = await createSandboxDatabase()
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite: task => task(),
      now: () => 10,
    })
    await store.initialize()
    await upsertCanonicalDocument(database, {
      cardId: 'card-1',
      sourceId: 'fact-1',
      source: 'memory_facts',
      text: '用户想打游戏放松。',
    })
    await store.upsertVectors([{
      id: 'vector-1',
      cardId: 'card-1',
      sourceId: 'fact-1',
      source: 'memory_facts',
      text: '用户想打游戏放松。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }])

    database.close()

    const restarted = new sqlite3.Database(join(sandboxDirs[0]!, 'vectors.sqlite'))
    const restartedStore = createPersistentLongTermMemoryVectorStore({
      database: restarted,
      run,
      all,
      enqueueWrite: task => task(),
      now: () => 20,
    })
    await restartedStore.initialize()

    expect(await restartedStore.searchVectors([1, 0, 0], {
      cardId: 'card-1',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })).toHaveLength(1)
    expect(await restartedStore.searchVectors([1, 0], {
      cardId: 'card-1',
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: 'model-b:2',
      limit: 4,
    })).toHaveLength(0)

    restarted.close()
  })

  it('supports canonical vector writes inside an existing transaction without re-entering the write queue', async () => {
    const database = await createSandboxDatabase()
    const enqueueWriteMock = vi.fn((task: () => Promise<unknown>) => task())
    const enqueueWrite = enqueueWriteMock as unknown as <T>(
      task: () => Promise<T>,
    ) => Promise<T>
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite,
      now: () => 10,
    })
    await store.initialize()
    await upsertCanonicalDocument(database, {
      cardId: 'card-transaction',
      sourceId: 'fact-transaction',
      source: 'memory_facts',
      text: '事务内写入的长期记忆。',
    })

    await run(database, 'BEGIN IMMEDIATE')
    await store.upsertVectorsInTransaction([{
      id: 'vector-transaction',
      cardId: 'card-transaction',
      sourceId: 'fact-transaction',
      source: 'memory_facts',
      text: '事务内写入的长期记忆。',
      vector: [1, 0, 0],
      modelId: 'model-transaction',
      dimensions: 3,
      vectorSpaceId: modelTransactionVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }])
    await run(database, 'COMMIT')

    expect(enqueueWriteMock).not.toHaveBeenCalled()
    await expect(store.searchVectors([1, 0, 0], {
      cardId: 'card-transaction',
      modelId: 'model-transaction',
      dimensions: 3,
      vectorSpaceId: modelTransactionVectorSpaceId,
      limit: 1,
    })).resolves.toHaveLength(1)
    database.close()
  })

  it('persists canonical embedding text longer than the vector store normalization limit', async () => {
    const database = await createSandboxDatabase()
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite: task => task(),
      now: () => 10,
    })
    const longText = '长期记忆证据 '.repeat(180)
    await store.initialize()
    await upsertCanonicalDocument(database, {
      cardId: 'card-long-text',
      sourceId: 'episode-long-text',
      source: 'episodic_events',
      text: longText,
    })

    await store.upsertVectors([{
      id: 'vector-long-text',
      cardId: 'card-long-text',
      sourceId: 'episode-long-text',
      source: 'episodic_events',
      text: longText,
      textHash: hashLongTermMemoryEmbeddingText(longText),
      vector: [1, 0, 0],
      modelId: 'model-long-text',
      dimensions: 3,
      vectorSpaceId: modelLongTextVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }])

    await expect(store.getHealth({
      cardId: 'card-long-text',
      activeModelId: 'model-long-text',
      dimensions: 3,
      vectorSpaceId: modelLongTextVectorSpaceId,
    })).resolves.toMatchObject({
      canonicalCount: 1,
      indexedCount: 1,
      missingCount: 0,
      textHashMismatchCount: 0,
      reindexRequired: false,
      searchReady: true,
    })

    database.close()
  })

  it('prunes vectors whose canonical search documents were removed', async () => {
    const database = await createSandboxDatabase()
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite: task => task(),
      now: () => 10,
    })
    await store.initialize()
    await upsertCanonicalDocument(database, {
      cardId: 'card-orphan-cleanup',
      sourceId: 'reflection-kept',
      source: 'memory_reflections',
      text: '这条长期记忆仍然存在。',
    })

    await store.upsertVectors([
      {
        id: 'vector-kept',
        cardId: 'card-orphan-cleanup',
        sourceId: 'reflection-kept',
        source: 'memory_reflections',
        text: '这条长期记忆仍然存在。',
        vector: [1, 0, 0],
        modelId: 'model-orphan-cleanup',
        dimensions: 3,
        vectorSpaceId: modelOrphanCleanupVectorSpaceId,
        updatedAt: 10,
        metadata: {},
      },
      {
        id: 'vector-orphan',
        cardId: 'card-orphan-cleanup',
        sourceId: 'reflection-removed',
        source: 'memory_reflections',
        text: '这条长期记忆已经从 canonical 搜索文档中移除。',
        vector: [0, 1, 0],
        modelId: 'model-orphan-cleanup',
        dimensions: 3,
        vectorSpaceId: modelOrphanCleanupVectorSpaceId,
        updatedAt: 10,
        metadata: {},
      },
    ])

    await expect(store.getHealth({
      cardId: 'card-orphan-cleanup',
      activeModelId: 'model-orphan-cleanup',
      dimensions: 3,
      vectorSpaceId: modelOrphanCleanupVectorSpaceId,
    })).resolves.toMatchObject({
      canonicalCount: 1,
      indexedCount: 1,
      orphanedCount: 1,
      reindexRequired: true,
    })

    await expect(store.pruneOrphanedVectors({
      cardId: 'card-orphan-cleanup',
    })).resolves.toEqual({
      deleted: 1,
      spaces: [{
        modelId: 'model-orphan-cleanup',
        dimensions: 3,
        vectorSpaceId: modelOrphanCleanupVectorSpaceId,
      }],
    })

    await expect(store.getHealth({
      cardId: 'card-orphan-cleanup',
      activeModelId: 'model-orphan-cleanup',
      dimensions: 3,
      vectorSpaceId: modelOrphanCleanupVectorSpaceId,
    })).resolves.toMatchObject({
      canonicalCount: 1,
      indexedCount: 1,
      orphanedCount: 0,
      reindexRequired: false,
      searchReady: true,
    })

    database.close()
  })

  it('requires reindex when stored vectors do not match the active model space', async () => {
    const database = await createSandboxDatabase()
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite: task => task(),
      now: () => 10,
    })
    await store.initialize()
    await upsertCanonicalDocument(database, {
      cardId: 'card-1',
      sourceId: 'reflection-1',
      source: 'memory_reflections',
      text: '失败要透明。',
    })
    await store.upsertVectors([{
      id: 'vector-old',
      cardId: 'card-1',
      sourceId: 'reflection-1',
      source: 'memory_reflections',
      text: '失败要透明。',
      vector: [1, 0, 0],
      modelId: 'old-model',
      dimensions: 3,
      vectorSpaceId: oldModelVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }])

    await expect(store.getHealth({
      cardId: 'card-1',
      activeModelId: 'new-model',
      dimensions: 3,
      vectorSpaceId: newModelVectorSpaceId,
    })).resolves.toMatchObject({
      providerConfigured: true,
      modelId: 'new-model',
      dimensions: 3,
      reindexRequired: true,
    })

    database.close()
  })

  it('keeps vectors from different dimensions in separate persistent spaces', async () => {
    const database = await createSandboxDatabase()
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite: task => task(),
      now: () => 10,
    })
    await store.initialize()
    await upsertCanonicalDocument(database, {
      cardId: 'card-1',
      sourceId: 'same-source',
      source: 'memory_reflections',
      text: '三维向量空间',
    })

    await store.upsertVectors([
      {
        id: 'vector-3d',
        cardId: 'card-1',
        sourceId: 'same-source',
        source: 'memory_reflections',
        text: '三维向量空间',
        vector: [1, 0, 0],
        modelId: 'same-model',
        dimensions: 3,
        vectorSpaceId: sameModel3dVectorSpaceId,
        updatedAt: 10,
        metadata: {},
      },
      {
        id: 'vector-2d',
        cardId: 'card-1',
        sourceId: 'same-source',
        source: 'memory_reflections',
        text: '二维向量空间',
        vector: [1, 0],
        modelId: 'same-model',
        dimensions: 2,
        vectorSpaceId: sameModel2dVectorSpaceId,
        updatedAt: 20,
        metadata: {},
      },
    ])

    await expect(store.searchVectors([1, 0, 0], {
      cardId: 'card-1',
      modelId: 'same-model',
      dimensions: 3,
      vectorSpaceId: sameModel3dVectorSpaceId,
      limit: 4,
    })).resolves.toHaveLength(1)
    await upsertCanonicalDocument(database, {
      cardId: 'card-1',
      sourceId: 'same-source',
      source: 'memory_reflections',
      text: '二维向量空间',
    })
    await expect(store.searchVectors([1, 0], {
      cardId: 'card-1',
      modelId: 'same-model',
      dimensions: 2,
      vectorSpaceId: sameModel2dVectorSpaceId,
      limit: 4,
    })).resolves.toHaveLength(1)
  })

  it('applies vector tombstones only to the matching source namespace', async () => {
    const database = await createSandboxDatabase()
    await run(database, `
      CREATE TABLE long_term_memory_tombstones (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite: task => task(),
      now: () => 10,
    })
    await store.initialize()
    await upsertCanonicalDocument(database, {
      cardId: 'card-1',
      sourceId: 'reflection-deleted',
      source: 'memory_reflections',
      text: '这条记忆已经删除。',
    })
    await store.upsertVectors([{
      id: 'vector-tombstoned',
      cardId: 'card-1',
      sourceId: 'reflection-deleted',
      source: 'memory_reflections',
      text: '这条记忆已经删除。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      updatedAt: 10,
      metadata: {},
    }])
    await run(database, `
      INSERT INTO long_term_memory_tombstones (
        id, card_id, source_id, source, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'tombstone-1',
      'card-1',
      'reflection-deleted',
      'memory_facts',
      'user deleted',
      11,
    ])

    await expect(store.searchVectors([1, 0, 0], {
      cardId: 'card-1',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })).resolves.toHaveLength(1)

    await run(database, 'UPDATE long_term_memory_tombstones SET source = ? WHERE id = ?', [
      'memory_reflections',
      'tombstone-1',
    ])
    await expect(store.searchVectors([1, 0, 0], {
      cardId: 'card-1',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })).resolves.toEqual([])
  })

  it('deletes only the requested source namespace when source ids are reused', async () => {
    const database = await createSandboxDatabase()
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite: task => task(),
      now: () => 10,
    })
    await store.initialize()
    await upsertCanonicalDocument(database, {
      cardId: 'card-shared-source-id',
      sourceId: 'shared-id',
      source: 'memory_reflections',
      text: '反思来源的长期记忆。',
    })
    await upsertCanonicalDocument(database, {
      cardId: 'card-shared-source-id',
      sourceId: 'shared-id',
      source: 'episodic_events',
      text: '事件来源的长期记忆。',
    })
    await store.upsertVectors([
      {
        id: 'vector-reflection-shared-id',
        cardId: 'card-shared-source-id',
        sourceId: 'shared-id',
        source: 'memory_reflections',
        text: '反思来源的长期记忆。',
        vector: [1, 0, 0],
        modelId: 'model-shared-source-id',
        dimensions: 3,
        vectorSpaceId: modelSharedSourceIdVectorSpaceId,
        updatedAt: 10,
      },
      {
        id: 'vector-episode-shared-id',
        cardId: 'card-shared-source-id',
        sourceId: 'shared-id',
        source: 'episodic_events',
        text: '事件来源的长期记忆。',
        vector: [1, 0, 0],
        modelId: 'model-shared-source-id',
        dimensions: 3,
        vectorSpaceId: modelSharedSourceIdVectorSpaceId,
        updatedAt: 10,
      },
    ])

    await expect(store.deleteVectorsBySource({
      cardId: 'card-shared-source-id',
      sourceIds: ['shared-id'],
      source: 'memory_reflections',
    })).resolves.toBe(1)

    await expect(store.searchVectors([1, 0, 0], {
      cardId: 'card-shared-source-id',
      modelId: 'model-shared-source-id',
      dimensions: 3,
      vectorSpaceId: modelSharedSourceIdVectorSpaceId,
      source: 'episodic_events',
      limit: 4,
    })).resolves.toHaveLength(1)
  })
})
