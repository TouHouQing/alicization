import { describe, expect, it } from 'vitest'

import { safeEmbedLongTermMemoryTexts } from './long-term-memory-embedding-provider'
import { createInMemoryLongTermMemoryVectorStore } from './long-term-memory-vector-store'

describe('long-term memory vector store', () => {
  it('keeps embedding spaces isolated by model id and dimensions', async () => {
    const store = createInMemoryLongTermMemoryVectorStore()

    await store.upsertVectors([
      {
        id: 'vec-local-a',
        sourceId: 'memory-a',
        source: 'memory_facts',
        text: '不要固定模板回复',
        vector: [1, 0, 0],
        modelId: 'local-a',
        dimensions: 3,
        updatedAt: 1,
      },
      {
        id: 'vec-local-b',
        sourceId: 'memory-b',
        source: 'memory_facts',
        text: '不要固定模板回复',
        vector: [1, 0],
        modelId: 'local-b',
        dimensions: 2,
        updatedAt: 2,
      },
    ])

    const results = await store.searchVectors([1, 0, 0], {
      modelId: 'local-a',
      dimensions: 3,
      limit: 4,
    })

    expect(results.map(item => item.record.sourceId)).toEqual(['memory-a'])
  })

  it('can produce a reindex plan without mixing old vectors into new searches', async () => {
    const store = createInMemoryLongTermMemoryVectorStore()
    await store.upsertVectors([
      {
        id: 'vec-old-1',
        sourceId: 'memory-old-1',
        source: 'episodic_events',
        text: '上周一起玩过 Minecraft',
        vector: [0, 1, 0],
        modelId: 'old-local',
        dimensions: 3,
        updatedAt: 1,
      },
    ])

    const plan = await store.reindexByModel('old-local')
    const newModelResults = await store.searchVectors([0, 1, 0], {
      modelId: 'new-local',
      dimensions: 3,
      limit: 4,
    })

    expect(plan).toEqual({
      modelId: 'old-local',
      sourceIds: ['memory-old-1'],
      recordCount: 1,
    })
    expect(newModelResults).toEqual([])
  })

  it('treats missing or failing embedding providers as unavailable semantic recall', async () => {
    await expect(safeEmbedLongTermMemoryTexts({
      provider: null,
      texts: ['我们去打游戏吧'],
    })).resolves.toEqual({
      status: 'unavailable',
      embeddings: [],
      error: null,
    })

    await expect(safeEmbedLongTermMemoryTexts({
      provider: {
        modelId: 'broken-local',
        dimensions: 3,
        embedTexts: async () => {
          throw new Error('embedding model not loaded')
        },
      },
      texts: ['我们去打游戏吧'],
    })).resolves.toEqual({
      status: 'failed',
      embeddings: [],
      error: 'embedding model not loaded',
    })
  })
})
