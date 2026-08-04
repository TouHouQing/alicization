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
          searchReady: true,
          reindexRequired: false,
          canonicalCount: 1,
          indexedCount: 1,
          missingCount: 0,
          textHashMismatchCount: 0,
          staleOrFailedCount: 0,
          orphanedCount: 0,
          coverageRatio: 1,
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
          searchReady: true,
          reindexRequired: false,
          canonicalCount: 1,
          indexedCount: 1,
          missingCount: 0,
          textHashMismatchCount: 0,
          staleOrFailedCount: 0,
          orphanedCount: 0,
          coverageRatio: 1,
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
      vectorSpaceId: 'legacy:model-a:3',
      limit: 4,
    })
  })

  it('can expose a native exact backend without changing the canonical contract', async () => {
    const nativeSearch = vi.fn(async (): Promise<LongTermMemoryVectorSearchResult[]> => [])
    const nativeHealth = vi.fn(async () => ({
      ready: true,
      lastError: null,
    }))
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
          searchReady: true,
          reindexRequired: false,
          canonicalCount: 1,
          indexedCount: 1,
          missingCount: 0,
          textHashMismatchCount: 0,
          staleOrFailedCount: 0,
          orphanedCount: 0,
          coverageRatio: 1,
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
        getHealth: nativeHealth,
      },
    })
    await adapter.initialize()

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
    expect(nativeHealth).toHaveBeenCalledWith({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: 'legacy:model-a:3',
    })
  })

  it('falls back while the native index is unsynchronized and recovers after a successful rebuild', async () => {
    const nativeSearch = vi.fn(async (): Promise<LongTermMemoryVectorSearchResult[]> => [])
    const fallbackSearch = vi.fn(async (): Promise<LongTermMemoryVectorSearchResult[]> => [])
    let ready = false
    const nativeRebuild = vi.fn(async () => {
      ready = true
    })
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: fallbackSearch,
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
          searchReady: true,
          reindexRequired: false,
          canonicalCount: 1,
          indexedCount: 1,
          missingCount: 0,
          textHashMismatchCount: 0,
          staleOrFailedCount: 0,
          orphanedCount: 0,
          coverageRatio: 1,
        })),
      },
      native: {
        mode: 'sqlite-vec',
        approximate: false,
        initialize: vi.fn(async () => {}),
        upsert: vi.fn(async () => {}),
        delete: vi.fn(async () => 0),
        search: nativeSearch,
        rebuild: nativeRebuild,
        getHealth: vi.fn(async () => ({
          ready,
          lastError: ready ? null : 'native index is not synchronized',
        })),
      },
    })
    await adapter.initialize()

    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
    })).resolves.toMatchObject({
      indexMode: 'brute-force',
      degraded: true,
      nativeIndexReady: false,
      lastError: 'native index is not synchronized',
    })
    await adapter.search({
      queryVector: [1, 0, 0],
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      limit: 4,
    })
    expect(fallbackSearch).toHaveBeenCalled()
    expect(nativeSearch).not.toHaveBeenCalled()

    await adapter.rebuild({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: 'legacy:model-a:3',
    })
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
    })).resolves.toMatchObject({
      indexMode: 'sqlite-vec',
      degraded: false,
      nativeIndexReady: true,
      lastError: null,
    })
    expect(nativeRebuild).toHaveBeenCalled()
  })
})
