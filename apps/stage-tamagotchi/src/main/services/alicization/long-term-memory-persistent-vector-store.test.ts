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
})
