import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'

const sandboxDirs: string[] = []

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
  return new sqlite3.Database(join(dir, 'vectors.sqlite'))
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
    await store.upsertVectors([{
      id: 'vector-1',
      cardId: 'card-1',
      sourceId: 'fact-1',
      source: 'memory_facts',
      text: '用户想打游戏放松。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
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
      limit: 4,
    })).toHaveLength(1)
    expect(await restartedStore.searchVectors([1, 0], {
      cardId: 'card-1',
      modelId: 'model-b',
      dimensions: 2,
      limit: 4,
    })).toHaveLength(0)

    restarted.close()
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
    await store.upsertVectors([{
      id: 'vector-old',
      cardId: 'card-1',
      sourceId: 'reflection-1',
      source: 'memory_reflections',
      text: '失败要透明。',
      vector: [1, 0, 0],
      modelId: 'old-model',
      dimensions: 3,
      updatedAt: 10,
      metadata: {},
    }])

    await expect(store.getHealth({
      cardId: 'card-1',
      activeModelId: 'new-model',
      dimensions: 3,
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
        updatedAt: 20,
        metadata: {},
      },
    ])

    await expect(store.searchVectors([1, 0, 0], {
      cardId: 'card-1',
      modelId: 'same-model',
      dimensions: 3,
      limit: 4,
    })).resolves.toHaveLength(1)
    await expect(store.searchVectors([1, 0], {
      cardId: 'card-1',
      modelId: 'same-model',
      dimensions: 2,
      limit: 4,
    })).resolves.toHaveLength(1)
  })

  it('does not recall vectors whose source has been tombstoned', async () => {
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
    await store.upsertVectors([{
      id: 'vector-tombstoned',
      cardId: 'card-1',
      sourceId: 'reflection-deleted',
      source: 'memory_reflections',
      text: '这条记忆已经删除。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
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
      'long_term_memory',
      'user deleted',
      11,
    ])

    await expect(store.searchVectors([1, 0, 0], {
      cardId: 'card-1',
      modelId: 'model-a',
      dimensions: 3,
      limit: 4,
    })).resolves.toEqual([])
  })
})
