import type { PersistentLongTermMemoryVectorRecord, PersistentLongTermMemoryVectorSearchFilters } from './long-term-memory-persistent-vector-store'
import type {
  LongTermMemoryVectorReindexPlan,
  LongTermMemoryVectorSearchResult,
} from './long-term-memory-vector-store'

import { resolveLongTermMemoryVectorSpaceId } from './long-term-memory-embedding-provider'

export type LongTermMemoryVectorIndexMode = 'sqlite-vec' | 'hnsw' | 'ann' | 'brute-force'

export interface LongTermMemoryVectorIndexHealth {
  indexMode: LongTermMemoryVectorIndexMode
  approximate: boolean
  degraded: boolean
  nativeIndexReady: boolean
  providerConfigured: boolean
  searchReady: boolean
  lastError: string | null
  modelId: string | null
  dimensions: number | null
  vectorSpaceId: string | null
  reindexRequired: boolean
  canonicalCount: number
  indexedCount: number
  missingCount: number
  textHashMismatchCount: number
  staleOrFailedCount: number
  orphanedCount: number
  coverageRatio: number | null
}

export interface LongTermMemoryVectorIndexNativeBackend {
  mode: Exclude<LongTermMemoryVectorIndexMode, 'brute-force'>
  approximate: boolean
  initialize: () => Promise<void>
  upsert: (records: PersistentLongTermMemoryVectorRecord[]) => Promise<void>
  delete: (input: { cardId: string, sourceIds: string[] }) => Promise<number>
  search: (
    queryVector: number[],
    filters: PersistentLongTermMemoryVectorSearchFilters,
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  rebuild: (input: { cardId: string, modelId: string, dimensions: number, vectorSpaceId: string }) => Promise<void>
  getHealth: (input: {
    cardId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
  }) => Promise<{ ready: boolean, lastError: string | null }>
}

export interface LongTermMemoryVectorIndexStore {
  initialize: () => Promise<void>
  upsertVectors: (records: PersistentLongTermMemoryVectorRecord[]) => Promise<void>
  searchVectors: (
    queryVector: number[],
    filters: PersistentLongTermMemoryVectorSearchFilters,
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  deleteVectorsBySource: (input: { cardId: string, sourceIds: string[] }) => Promise<number>
  pruneOrphanedVectors: (input: { cardId: string }) => Promise<{
    deleted: number
    spaces: Array<{
      modelId: string
      dimensions: number
      vectorSpaceId: string
    }>
  }>
  reindexByModel: (input: { cardId: string, modelId: string }) => Promise<LongTermMemoryVectorReindexPlan>
  getHealth: (input: {
    cardId: string
    activeModelId: string | null
    dimensions: number | null
    vectorSpaceId?: string | null
  }) => Promise<{
    providerConfigured: boolean
    modelId: string | null
    dimensions: number | null
    searchReady: boolean
    reindexRequired: boolean
    canonicalCount: number
    indexedCount: number
    missingCount: number
    textHashMismatchCount: number
    staleOrFailedCount: number
    orphanedCount: number
    coverageRatio: number | null
  }>
}

export interface LongTermMemoryVectorIndexAdapter {
  initialize: () => Promise<void>
  upsert: (records: PersistentLongTermMemoryVectorRecord[]) => Promise<void>
  delete: (input: { cardId: string, sourceIds: string[] }) => Promise<number>
  pruneOrphaned: (input: { cardId: string }) => Promise<number>
  search: (
    input: PersistentLongTermMemoryVectorSearchFilters & { queryVector: number[] },
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  rebuild: (input: { cardId: string, modelId: string, dimensions: number, vectorSpaceId: string }) => Promise<LongTermMemoryVectorReindexPlan | void>
  getHealth: (input: { cardId: string, modelId: string | null, dimensions: number | null, vectorSpaceId?: string | null }) => Promise<LongTermMemoryVectorIndexHealth>
}

export function createLongTermMemoryVectorIndexAdapter(input: {
  store: LongTermMemoryVectorIndexStore
  native?: LongTermMemoryVectorIndexNativeBackend
}): LongTermMemoryVectorIndexAdapter {
  let nativeLastError: string | null = null
  let nativeInitialized = false
  const nativeHealthCache = new Map<string, {
    health: { ready: boolean, lastError: string | null }
    expiresAt: number
  }>()
  const nativeHealthCacheTtlMs = 30_000

  function nativeHealthCacheKey(healthInput: {
    cardId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
  }) {
    return [
      healthInput.cardId,
      healthInput.modelId,
      healthInput.dimensions,
      healthInput.vectorSpaceId,
    ].join('\u0000')
  }

  function clearNativeHealthCache() {
    nativeHealthCache.clear()
  }

  async function getNativeHealth(healthInput: {
    cardId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
  }) {
    if (!input.native)
      throw new Error('native vector index is not configured')
    const key = nativeHealthCacheKey(healthInput)
    const cached = nativeHealthCache.get(key)
    const timestamp = Date.now()
    if (cached && cached.expiresAt > timestamp)
      return cached.health
    const health = await input.native.getHealth(healthInput)
    nativeHealthCache.set(key, {
      health,
      expiresAt: timestamp + nativeHealthCacheTtlMs,
    })
    return health
  }

  async function initialize() {
    await input.store.initialize()
    if (!input.native)
      return
    try {
      await input.native.initialize()
      nativeInitialized = true
      nativeLastError = null
      clearNativeHealthCache()
    }
    catch (error) {
      nativeInitialized = false
      nativeLastError = error instanceof Error ? error.message : String(error)
    }
  }

  async function upsert(records: PersistentLongTermMemoryVectorRecord[]) {
    await input.store.upsertVectors(records)
    clearNativeHealthCache()
    if (!input.native || !nativeInitialized)
      return
    try {
      await input.native.upsert(records)
      nativeLastError = null
      clearNativeHealthCache()
    }
    catch (error) {
      nativeLastError = error instanceof Error ? error.message : String(error)
    }
  }

  async function deleteVectors(inputDelete: { cardId: string, sourceIds: string[] }) {
    const deleted = await input.store.deleteVectorsBySource(inputDelete)
    clearNativeHealthCache()
    if (!input.native || !nativeInitialized)
      return deleted
    try {
      await input.native.delete(inputDelete)
      nativeLastError = null
      clearNativeHealthCache()
    }
    catch (error) {
      nativeLastError = error instanceof Error ? error.message : String(error)
    }
    return deleted
  }

  async function pruneOrphaned(pruneInput: { cardId: string }) {
    const result = await input.store.pruneOrphanedVectors(pruneInput)
    clearNativeHealthCache()
    if (!input.native || !nativeInitialized || result.spaces.length === 0)
      return result.deleted

    let rebuildError: string | null = null
    for (const space of result.spaces) {
      try {
        await input.native.rebuild({
          cardId: pruneInput.cardId,
          modelId: space.modelId,
          dimensions: space.dimensions,
          vectorSpaceId: space.vectorSpaceId,
        })
      }
      catch (error) {
        rebuildError ??= error instanceof Error ? error.message : String(error)
      }
    }
    nativeLastError = rebuildError
    clearNativeHealthCache()
    return result.deleted
  }

  async function search(searchInput: PersistentLongTermMemoryVectorSearchFilters & { queryVector: number[] }) {
    const { queryVector, ...filters } = searchInput
    const vectorSpaceId = resolveLongTermMemoryVectorSpaceId({
      modelId: filters.modelId,
      dimensions: filters.dimensions,
      vectorSpaceId: filters.vectorSpaceId,
    })
    const resolvedFilters = {
      ...filters,
      vectorSpaceId,
    }
    if (input.native && nativeInitialized) {
      try {
        const health = await getNativeHealth({
          cardId: resolvedFilters.cardId,
          modelId: resolvedFilters.modelId,
          dimensions: resolvedFilters.dimensions,
          vectorSpaceId,
        })
        nativeLastError = health.lastError
        if (health.ready) {
          const results = await input.native.search(queryVector, resolvedFilters)
          nativeLastError = null
          return results
        }
      }
      catch (error) {
        nativeLastError = error instanceof Error ? error.message : String(error)
      }
    }
    return await input.store.searchVectors(queryVector, resolvedFilters)
  }

  async function rebuild(rebuildInput: { cardId: string, modelId: string, dimensions: number, vectorSpaceId: string }) {
    if (input.native && nativeInitialized) {
      try {
        await input.native.rebuild(rebuildInput)
        nativeLastError = null
        clearNativeHealthCache()
        return
      }
      catch (error) {
        nativeLastError = error instanceof Error ? error.message : String(error)
      }
    }
    return await input.store.reindexByModel({
      cardId: rebuildInput.cardId,
      modelId: rebuildInput.modelId,
    })
  }

  async function getHealth(healthInput: { cardId: string, modelId: string | null, dimensions: number | null, vectorSpaceId?: string | null }) {
    const vectorSpaceId = healthInput.modelId && healthInput.dimensions
      ? resolveLongTermMemoryVectorSpaceId({
          modelId: healthInput.modelId,
          dimensions: healthInput.dimensions,
          vectorSpaceId: healthInput.vectorSpaceId ?? undefined,
        })
      : null
    const canonical = await input.store.getHealth({
      cardId: healthInput.cardId,
      activeModelId: healthInput.modelId,
      dimensions: healthInput.dimensions,
      vectorSpaceId,
    })
    let nativeReady = false
    let lastError = nativeLastError
    if (input.native && nativeInitialized && healthInput.modelId && healthInput.dimensions && vectorSpaceId) {
      try {
        const nativeHealth = await getNativeHealth({
          cardId: healthInput.cardId,
          modelId: healthInput.modelId,
          dimensions: healthInput.dimensions,
          vectorSpaceId,
        })
        nativeReady = nativeHealth.ready
        lastError = nativeHealth.lastError
        nativeLastError = nativeHealth.lastError
      }
      catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        nativeLastError = lastError
      }
    }
    const nativeActive = Boolean(input.native && nativeReady && !lastError)
    const health: LongTermMemoryVectorIndexHealth = {
      indexMode: nativeActive ? input.native!.mode : 'brute-force',
      approximate: nativeActive ? input.native!.approximate : false,
      degraded: !nativeActive,
      nativeIndexReady: nativeActive,
      providerConfigured: canonical.providerConfigured,
      searchReady: canonical.searchReady,
      lastError,
      modelId: canonical.modelId,
      dimensions: canonical.dimensions,
      vectorSpaceId,
      reindexRequired: canonical.reindexRequired,
      canonicalCount: canonical.canonicalCount,
      indexedCount: canonical.indexedCount,
      missingCount: canonical.missingCount,
      textHashMismatchCount: canonical.textHashMismatchCount,
      staleOrFailedCount: canonical.staleOrFailedCount,
      orphanedCount: canonical.orphanedCount,
      coverageRatio: canonical.coverageRatio,
    }
    return health
  }

  return {
    initialize,
    upsert,
    delete: deleteVectors,
    pruneOrphaned,
    search,
    rebuild,
    getHealth,
  }
}
