import type { LongTermMemoryVectorSearchResult } from './long-term-memory-vector-store'

import { describe, expect, it, vi } from 'vitest'

import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'

describe('long-term memory vector index adapter', () => {
  it('reports the actual brute-force fallback instead of claiming ANN capability', async () => {
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        reindexByModel: vi.fn(async input => ({
          modelId: input.modelId,
          sourceIds: [],
          recordCount: 0,
        })),
        getHealth: vi.fn(async () => ({
          providerConfigured: true,
          modelId: 'model-a',
          dimensions: 3,
          reindexRequired: false,
        })),
      },
    })

    await expect(adapter.initialize()).resolves.toBeUndefined()
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
    })).resolves.toMatchObject({
      indexMode: 'brute-force',
      approximate: false,
      degraded: true,
      searchReady: true,
      nativeIndexReady: false,
    })
  })

  it('preserves card/model/dimension filters through the adapter boundary', async () => {
    const search = vi.fn(async (): Promise<LongTermMemoryVectorSearchResult[]> => [])
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: search,
        deleteVectorsBySource: vi.fn(async () => 0),
        reindexByModel: vi.fn(async input => ({
          modelId: input.modelId,
          sourceIds: [],
          recordCount: 0,
        })),
        getHealth: vi.fn(async () => ({
          providerConfigured: true,
          modelId: 'model-a',
          dimensions: 3,
          reindexRequired: false,
        })),
      },
    })

    await adapter.search({
      queryVector: [1, 0, 0],
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      limit: 4,
    })

    expect(search).toHaveBeenCalledWith([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      limit: 4,
    })
  })

  it('can expose a native exact backend without changing the canonical contract', async () => {
    const nativeSearch = vi.fn(async (): Promise<LongTermMemoryVectorSearchResult[]> => [])
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        reindexByModel: vi.fn(async input => ({
          modelId: input.modelId,
          sourceIds: [],
          recordCount: 0,
        })),
        getHealth: vi.fn(async () => ({
          providerConfigured: true,
          modelId: 'model-a',
          dimensions: 3,
          reindexRequired: false,
        })),
      },
      native: {
        mode: 'sqlite-vec',
        approximate: false,
        initialize: vi.fn(async () => {}),
        upsert: vi.fn(async () => {}),
        delete: vi.fn(async () => 0),
        search: nativeSearch,
        rebuild: vi.fn(async () => {}),
        getHealth: vi.fn(async () => ({
          ready: true,
          lastError: null,
        })),
      },
    })

    const results = await adapter.search({
      queryVector: [1, 0, 0],
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      limit: 4,
    })

    expect(results).toEqual([])
    expect(nativeSearch).toHaveBeenCalled()
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
    })).resolves.toMatchObject({
      indexMode: 'sqlite-vec',
      approximate: false,
      degraded: false,
      searchReady: true,
      nativeIndexReady: true,
    })
  })
})
