import type { LongTermMemoryVectorSearchResult } from './long-term-memory-vector-store'

import { describe, expect, it, vi } from 'vitest'

import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'

const modelAVectorSpaceId = 'model-a:3'
const modelBVectorSpaceId = 'model-b:2'

describe('long-term memory vector index adapter', () => {
  it('reports the actual brute-force fallback instead of claiming ANN capability', async () => {
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
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
      vectorSpaceId: modelAVectorSpaceId,
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
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
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
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })

    expect(search).toHaveBeenCalledWith([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })
  })

  it('preserves the source namespace through canonical and native deletion', async () => {
    const deleteCanonical = vi.fn(async () => 1)
    const deleteNative = vi.fn(async () => 1)
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: deleteCanonical,
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
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
        delete: deleteNative,
        search: vi.fn(async () => []),
        rebuild: vi.fn(async () => {}),
        getHealth: vi.fn(async () => ({ ready: true, lastError: null })),
      },
    })
    await adapter.initialize()

    await expect(adapter.delete({
      cardId: 'card-a',
      sourceIds: ['shared-id'],
      source: 'memory_reflections',
    })).resolves.toBe(1)

    expect(deleteCanonical).toHaveBeenCalledWith({
      cardId: 'card-a',
      sourceIds: ['shared-id'],
      source: 'memory_reflections',
    })
    expect(deleteNative).toHaveBeenCalledWith({
      cardId: 'card-a',
      sourceIds: ['shared-id'],
      source: 'memory_reflections',
    })
  })

  it('prunes canonical orphans and rebuilds every affected native vector space', async () => {
    const pruneOrphanedVectors = vi.fn(async () => ({
      deleted: 2,
      spaces: [
        {
          modelId: 'model-a',
          dimensions: 3,
          vectorSpaceId: modelAVectorSpaceId,
        },
        {
          modelId: 'model-b',
          dimensions: 2,
          vectorSpaceId: modelBVectorSpaceId,
        },
      ],
    }))
    const nativeRebuild = vi.fn(async () => {})
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        pruneOrphanedVectors,
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
        search: vi.fn(async () => []),
        rebuild: nativeRebuild,
        getHealth: vi.fn(async () => ({
          ready: true,
          lastError: null,
        })),
      },
    })
    await adapter.initialize()

    await expect(adapter.pruneOrphaned({
      cardId: 'card-a',
    })).resolves.toBe(2)

    expect(pruneOrphanedVectors).toHaveBeenCalledWith({
      cardId: 'card-a',
    })
    expect(nativeRebuild).toHaveBeenCalledTimes(2)
    expect(nativeRebuild).toHaveBeenNthCalledWith(1, {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })
    expect(nativeRebuild).toHaveBeenNthCalledWith(2, {
      cardId: 'card-a',
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: modelBVectorSpaceId,
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
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
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
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })

    expect(results).toEqual([])
    expect(nativeSearch).toHaveBeenCalled()
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
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
      vectorSpaceId: modelAVectorSpaceId,
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
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
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
      vectorSpaceId: modelAVectorSpaceId,
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
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })
    expect(fallbackSearch).toHaveBeenCalled()
    expect(nativeSearch).not.toHaveBeenCalled()

    await adapter.rebuild({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      indexMode: 'sqlite-vec',
      degraded: false,
      nativeIndexReady: true,
      lastError: null,
    })
    expect(nativeRebuild).toHaveBeenCalled()
  })

  it.each([
    {
      mutate: async (adapter: ReturnType<typeof createLongTermMemoryVectorIndexAdapter>) => {
        await adapter.upsertNative([])
      },
      operation: 'upsert',
    },
    {
      mutate: async (adapter: ReturnType<typeof createLongTermMemoryVectorIndexAdapter>) => {
        await adapter.delete({
          cardId: 'card-a',
          sourceIds: ['memory-a'],
          source: 'memory_reflections',
        })
      },
      operation: 'delete',
    },
    {
      mutate: async (adapter: ReturnType<typeof createLongTermMemoryVectorIndexAdapter>) => {
        await adapter.rebuild({
          cardId: 'card-a',
          modelId: 'model-a',
          dimensions: 3,
          vectorSpaceId: modelAVectorSpaceId,
        })
      },
      operation: 'rebuild',
    },
  ])('invalidates cached native health immediately after failed $operation', async ({ mutate }) => {
    const nativeHealth = vi.fn()
      .mockResolvedValueOnce({ ready: true, lastError: null })
      .mockResolvedValue({
        ready: false,
        lastError: 'native index mutation failed',
      })
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
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
        upsert: vi.fn(async () => {
          throw new Error('native index mutation failed')
        }),
        delete: vi.fn(async () => {
          throw new Error('native index mutation failed')
        }),
        search: vi.fn(async () => []),
        rebuild: vi.fn(async () => {
          throw new Error('native index mutation failed')
        }),
        getHealth: nativeHealth,
      },
    })
    await adapter.initialize()
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: false,
      nativeIndexReady: true,
    })

    await mutate(adapter)

    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: true,
      nativeIndexReady: false,
      lastError: 'native index mutation failed',
    })
    expect(nativeHealth).toHaveBeenCalledTimes(2)
  })

  it('keeps a failed native mutation degraded even when the backend reports stale ready health', async () => {
    const nativeHealth = vi.fn(async () => ({ ready: true, lastError: null }))
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
        reindexByModel: vi.fn(async input => ({ modelId: input.modelId, sourceIds: [], recordCount: 0 })),
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
        upsert: vi.fn(async () => {
          throw new Error('native index mutation failed')
        }),
        delete: vi.fn(async () => 0),
        search: vi.fn(async () => []),
        rebuild: vi.fn(async () => {}),
        getHealth: nativeHealth,
      },
    })
    await adapter.initialize()
    await adapter.upsertNative([{
      id: 'vector-a',
      cardId: 'card-a',
      sourceId: 'source-a',
      source: 'memory_reflections',
      text: 'a',
      textHash: 'hash-a',
      updatedAt: 1,
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    }])

    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: true,
      nativeIndexReady: false,
      lastError: 'native index mutation failed',
    })
  })

  it('isolates native mutation failures by complete vector space', async () => {
    const nativeHealth = vi.fn(async () => ({ ready: true, lastError: null }))
    const nativeUpsert = vi.fn(async (records: Array<{ modelId: string }>) => {
      if (records.some(record => record.modelId === 'model-a'))
        throw new Error('model-a native mutation failed')
    })
    const store = {
      initialize: vi.fn(async () => {}),
      upsertVectors: vi.fn(async () => {}),
      searchVectors: vi.fn(async () => []),
      deleteVectorsBySource: vi.fn(async () => 0),
      pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
      reindexByModel: vi.fn(async input => ({ modelId: input.modelId, sourceIds: [], recordCount: 0 })),
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
    }
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store,
      native: {
        mode: 'sqlite-vec',
        approximate: false,
        initialize: vi.fn(async () => {}),
        upsert: nativeUpsert,
        delete: vi.fn(async () => 0),
        search: vi.fn(async () => []),
        rebuild: vi.fn(async () => {}),
        getHealth: nativeHealth,
      },
    })
    await adapter.initialize()

    await adapter.upsertNative([{
      id: 'vector-a',
      cardId: 'card-a',
      sourceId: 'source-a',
      source: 'memory_reflections',
      text: 'a',
      textHash: 'hash-a',
      updatedAt: 1,
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    }])
    await adapter.upsertNative([{
      id: 'vector-b',
      cardId: 'card-a',
      sourceId: 'source-b',
      source: 'memory_reflections',
      text: 'b',
      textHash: 'hash-b',
      updatedAt: 1,
      vector: [0, 1],
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: modelBVectorSpaceId,
    }])

    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: true,
      lastError: 'model-a native mutation failed',
    })
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: modelBVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: false,
      lastError: null,
    })
  })

  it('does not leak an unscoped native mutation failure into keyed vector spaces', async () => {
    const nativeHealth = vi.fn(async () => ({ ready: true, lastError: null }))
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
        reindexByModel: vi.fn(async input => ({ modelId: input.modelId, sourceIds: [], recordCount: 0 })),
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
        upsert: vi.fn(async () => {
          throw new Error('unscoped native mutation failed')
        }),
        delete: vi.fn(async () => 0),
        search: vi.fn(async () => []),
        rebuild: vi.fn(async () => {}),
        getHealth: nativeHealth,
      },
    })
    await adapter.initialize()

    await adapter.upsertNative([])

    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: false,
      nativeIndexReady: true,
      lastError: null,
    })
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: modelBVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: false,
      nativeIndexReady: true,
      lastError: null,
    })
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: null,
      dimensions: null,
    })).resolves.toMatchObject({
      degraded: true,
      lastError: 'unscoped native mutation failed',
    })
  })

  it('isolates concurrent native failures and successes for vector spaces on the same card', async () => {
    let releaseModelA: (() => void) | undefined
    const modelABlocked = new Promise<void>((resolve) => {
      releaseModelA = resolve
    })
    let resolveModelB: (() => void) | undefined
    const modelBCompleted = new Promise<void>((resolve) => {
      resolveModelB = resolve
    })
    const nativeUpsert = vi.fn(async (records: Array<{ modelId: string }>) => {
      if (records.some(record => record.modelId === 'model-a')) {
        await modelABlocked
        throw new Error('model-a concurrent native mutation failed')
      }
      resolveModelB?.()
    })
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
        reindexByModel: vi.fn(async input => ({ modelId: input.modelId, sourceIds: [], recordCount: 0 })),
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
        upsert: nativeUpsert,
        delete: vi.fn(async () => 0),
        search: vi.fn(async () => []),
        rebuild: vi.fn(async () => {}),
        getHealth: vi.fn(async () => ({ ready: true, lastError: null })),
      },
    })
    await adapter.initialize()

    const mixedUpsert = adapter.upsertNative([{
      id: 'vector-a',
      cardId: 'card-a',
      sourceId: 'source-a',
      source: 'memory_reflections',
      text: 'a',
      textHash: 'hash-a',
      updatedAt: 1,
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    }])
    const successfulModelBUpsert = adapter.upsertNative([{
      id: 'vector-b',
      cardId: 'card-a',
      sourceId: 'source-b',
      source: 'memory_reflections',
      text: 'b',
      textHash: 'hash-b',
      updatedAt: 1,
      vector: [0, 1],
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: modelBVectorSpaceId,
    }])

    await modelBCompleted
    releaseModelA?.()
    await mixedUpsert

    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: true,
      lastError: 'model-a concurrent native mutation failed',
    })
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: modelBVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: false,
      nativeIndexReady: true,
      lastError: null,
    })
  })

  it('keeps native fallback isolated when one same-card vector space rebuild fails', async () => {
    const fallbackSearch = vi.fn(async (): Promise<LongTermMemoryVectorSearchResult[]> => [])
    const nativeSearch = vi.fn(async (_queryVector: number[], filters: { modelId: string }) => {
      if (filters.modelId === 'model-a')
        throw new Error('model-a native search failed')
      return [{ id: 'native-model-b', score: 0.9, record: {} as never }]
    })
    const nativeRebuild = vi.fn(async (rebuildInput: { modelId: string }) => {
      if (rebuildInput.modelId === 'model-a')
        throw new Error('model-a native rebuild failed')
    })
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: fallbackSearch,
        deleteVectorsBySource: vi.fn(async () => 0),
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
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
        getHealth: vi.fn(async () => ({ ready: true, lastError: null })),
      },
    })
    await adapter.initialize()

    await adapter.rebuild({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })
    expect(nativeRebuild).toHaveBeenCalledWith({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })

    await adapter.search({
      queryVector: [1, 0, 0],
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })
    const modelBResults = await adapter.search({
      queryVector: [0, 1],
      cardId: 'card-a',
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: modelBVectorSpaceId,
      limit: 4,
    })

    expect(fallbackSearch).toHaveBeenCalledWith([1, 0, 0], {
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
      limit: 4,
    })
    expect(modelBResults).toEqual([{ id: 'native-model-b', score: 0.9, record: {} }])
    expect(nativeSearch).toHaveBeenCalledTimes(1)
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: true,
      lastError: 'model-a native rebuild failed',
    })
    await expect(adapter.getHealth({
      cardId: 'card-a',
      modelId: 'model-b',
      dimensions: 2,
      vectorSpaceId: modelBVectorSpaceId,
    })).resolves.toMatchObject({
      degraded: false,
      nativeIndexReady: true,
      lastError: null,
    })
  })

  it('rebuild fallback marks only the requested vector space stale', async () => {
    const reindexByModel = vi.fn(async input => ({
      modelId: input.modelId,
      sourceIds: ['source-a'],
      recordCount: 1,
    }))
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store: {
        initialize: vi.fn(async () => {}),
        upsertVectors: vi.fn(async () => {}),
        searchVectors: vi.fn(async () => []),
        deleteVectorsBySource: vi.fn(async () => 0),
        pruneOrphanedVectors: vi.fn(async () => ({ deleted: 0, spaces: [] })),
        reindexByModel,
        getHealth: vi.fn(async () => ({
          providerConfigured: true,
          modelId: 'model-a',
          dimensions: 3,
          searchReady: true,
          reindexRequired: true,
          canonicalCount: 1,
          indexedCount: 1,
          missingCount: 0,
          textHashMismatchCount: 0,
          staleOrFailedCount: 1,
          orphanedCount: 0,
          coverageRatio: 0,
        })),
      },
      native: {
        mode: 'sqlite-vec',
        approximate: false,
        initialize: vi.fn(async () => {}),
        upsert: vi.fn(async () => {}),
        delete: vi.fn(async () => 0),
        search: vi.fn(async () => []),
        rebuild: vi.fn(async () => {
          throw new Error('native rebuild failed')
        }),
        getHealth: vi.fn(async () => ({ ready: false, lastError: 'native rebuild failed' })),
      },
    })
    await adapter.initialize()

    await adapter.rebuild({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })

    expect(reindexByModel).toHaveBeenCalledWith({
      cardId: 'card-a',
      modelId: 'model-a',
      dimensions: 3,
      vectorSpaceId: modelAVectorSpaceId,
    })
  })
})
