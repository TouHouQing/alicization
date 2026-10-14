import type {
  PersistentLongTermMemoryVectorDeleteInput,
  PersistentLongTermMemoryVectorRecord,
  PersistentLongTermMemoryVectorSearchFilters,
} from './long-term-memory-persistent-vector-store'
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
  upsert: (
    records: PersistentLongTermMemoryVectorRecord[],
    options?: { signal?: AbortSignal },
  ) => Promise<void>
  delete: (input: PersistentLongTermMemoryVectorDeleteInput) => Promise<number>
  search: (
    queryVector: number[],
    filters: PersistentLongTermMemoryVectorSearchFilters,
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  rebuild: (input: {
    cardId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
    signal?: AbortSignal
  }) => Promise<void>
  getHealth: (input: {
    cardId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
  }) => Promise<LongTermMemoryVectorIndexNativeHealth>
}

interface LongTermMemoryVectorIndexNativeHealth {
  ready: boolean
  reindexRequired?: boolean
  lastError: string | null
}

export interface LongTermMemoryVectorIndexStore {
  initialize: () => Promise<void>
  upsertVectors: (
    records: PersistentLongTermMemoryVectorRecord[],
    options?: { signal?: AbortSignal },
  ) => Promise<void>
  searchVectors: (
    queryVector: number[],
    filters: PersistentLongTermMemoryVectorSearchFilters,
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  deleteVectorsBySource: (input: PersistentLongTermMemoryVectorDeleteInput) => Promise<number>
  pruneOrphanedVectors: (input: { cardId: string, signal?: AbortSignal }) => Promise<{
    deleted: number
    spaces: Array<{
      modelId: string
      dimensions: number
      vectorSpaceId: string
    }>
  }>
  reindexByModel: (input: {
    cardId: string
    modelId: string
    dimensions?: number
    vectorSpaceId?: string
    signal?: AbortSignal
  }) => Promise<LongTermMemoryVectorReindexPlan>
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
  upsert: (
    records: PersistentLongTermMemoryVectorRecord[],
    options?: { signal?: AbortSignal },
  ) => Promise<void>
  upsertNative: (
    records: PersistentLongTermMemoryVectorRecord[],
    options?: { signal?: AbortSignal },
  ) => Promise<void>
  delete: (input: PersistentLongTermMemoryVectorDeleteInput) => Promise<number>
  pruneOrphaned: (input: { cardId: string, signal?: AbortSignal }) => Promise<number>
  search: (
    input: PersistentLongTermMemoryVectorSearchFilters & { queryVector: number[] },
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  rebuild: (input: {
    cardId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
    signal?: AbortSignal
  }) => Promise<LongTermMemoryVectorReindexPlan | void>
  getHealth: (input: { cardId: string, modelId: string | null, dimensions: number | null, vectorSpaceId?: string | null }) => Promise<LongTermMemoryVectorIndexHealth>
}

export function createLongTermMemoryVectorIndexAdapter(input: {
  store: LongTermMemoryVectorIndexStore
  native?: LongTermMemoryVectorIndexNativeBackend
}): LongTermMemoryVectorIndexAdapter {
  const nativeLastErrors = new Map<string, string>()
  let nativeUnscopedLastError: string | null = null
  let nativeInitializationError: string | null = null
  let nativeInitialized = false
  const nativeHealthCache = new Map<string, {
    health: LongTermMemoryVectorIndexNativeHealth
    expiresAt: number
  }>()
  const nativeHealthCacheTtlMs = 30_000

  function assertNotAborted(signal?: AbortSignal) {
    if (!signal?.aborted)
      return
    throw signal.reason ?? new DOMException('Vector index operation aborted', 'AbortError')
  }

  function isAbortError(error: unknown) {
    return error instanceof Error && error.name === 'AbortError'
  }

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

  let nativeHealthGeneration = 0
  function clearNativeHealthCache(key?: string) {
    nativeHealthGeneration += 1
    if (key) {
      nativeHealthCache.delete(key)
      return
    }
    nativeHealthCache.clear()
  }

  function vectorSpaceKey(input: {
    cardId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
  }) {
    return nativeHealthCacheKey(input)
  }

  function vectorSpaceKeyForRecord(record: PersistentLongTermMemoryVectorRecord) {
    return vectorSpaceKey({
      cardId: record.cardId,
      modelId: record.modelId,
      dimensions: record.dimensions,
      vectorSpaceId: resolveLongTermMemoryVectorSpaceId(record),
    })
  }

  function setNativeError(key: string, error: unknown) {
    nativeLastErrors.set(key, error instanceof Error ? error.message : String(error))
    clearNativeHealthCache(key)
  }

  function clearNativeError(key: string) {
    nativeLastErrors.delete(key)
    clearNativeHealthCache(key)
  }

  function nativeErrorFor(key: string) {
    return nativeLastErrors.get(key) ?? nativeInitializationError
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
    const generation = nativeHealthGeneration
    const health = await input.native.getHealth(healthInput)
    // A read started before a mutation cannot repopulate its invalidated cache.
    if (generation === nativeHealthGeneration) {
      nativeHealthCache.set(key, {
        health,
        expiresAt: timestamp + (health.ready ? nativeHealthCacheTtlMs : 250),
      })
    }
    return health
  }

  async function initialize() {
    await input.store.initialize()
    if (!input.native)
      return
    try {
      await input.native.initialize()
      nativeInitialized = true
      nativeInitializationError = null
      nativeUnscopedLastError = null
      nativeLastErrors.clear()
      clearNativeHealthCache()
    }
    catch (error) {
      nativeInitialized = false
      nativeInitializationError = error instanceof Error ? error.message : String(error)
    }
  }

  async function upsert(
    records: PersistentLongTermMemoryVectorRecord[],
    options: { signal?: AbortSignal } = {},
  ) {
    assertNotAborted(options.signal)
    await input.store.upsertVectors(records, options)
    clearNativeHealthCache()
    assertNotAborted(options.signal)
    await upsertNative(records, options)
  }

  async function upsertNative(
    records: PersistentLongTermMemoryVectorRecord[],
    options: { signal?: AbortSignal } = {},
  ) {
    assertNotAborted(options.signal)
    if (!input.native || !nativeInitialized)
      return
    if (records.length === 0) {
      try {
        await input.native.upsert(records, options)
        assertNotAborted(options.signal)
        nativeUnscopedLastError = null
        clearNativeHealthCache()
      }
      catch (error) {
        if (isAbortError(error) || options.signal?.aborted)
          throw error
        nativeUnscopedLastError = error instanceof Error ? error.message : String(error)
        clearNativeHealthCache()
      }
      return
    }

    const recordsByVectorSpace = new Map<string, PersistentLongTermMemoryVectorRecord[]>()
    for (const record of records) {
      const key = vectorSpaceKeyForRecord(record)
      const spaceRecords = recordsByVectorSpace.get(key)
      if (spaceRecords)
        spaceRecords.push(record)
      else
        recordsByVectorSpace.set(key, [record])
    }

    await Promise.all([...recordsByVectorSpace.entries()].map(async ([key, spaceRecords]) => {
      try {
        assertNotAborted(options.signal)
        await input.native!.upsert(spaceRecords, options)
        assertNotAborted(options.signal)
        clearNativeError(key)
      }
      catch (error) {
        if (isAbortError(error) || options.signal?.aborted)
          throw error
        setNativeError(key, error)
      }
    }))
  }

  async function deleteVectors(inputDelete: PersistentLongTermMemoryVectorDeleteInput) {
    assertNotAborted(inputDelete.signal)
    const deleted = await input.store.deleteVectorsBySource(inputDelete)
    clearNativeHealthCache()
    assertNotAborted(inputDelete.signal)
    if (!input.native || !nativeInitialized)
      return deleted
    try {
      await input.native.delete(inputDelete)
      assertNotAborted(inputDelete.signal)
      if (inputDelete.modelId && inputDelete.dimensions && inputDelete.vectorSpaceId) {
        clearNativeError(vectorSpaceKey({
          cardId: inputDelete.cardId,
          modelId: inputDelete.modelId,
          dimensions: inputDelete.dimensions,
          vectorSpaceId: inputDelete.vectorSpaceId,
        }))
      }
      else {
        nativeUnscopedLastError = null
        clearNativeHealthCache()
      }
    }
    catch (error) {
      if (isAbortError(error) || inputDelete.signal?.aborted)
        throw error
      if (inputDelete.modelId && inputDelete.dimensions && inputDelete.vectorSpaceId) {
        setNativeError(vectorSpaceKey({
          cardId: inputDelete.cardId,
          modelId: inputDelete.modelId,
          dimensions: inputDelete.dimensions,
          vectorSpaceId: inputDelete.vectorSpaceId,
        }), error)
      }
      else {
        nativeUnscopedLastError = error instanceof Error ? error.message : String(error)
        clearNativeHealthCache()
      }
    }
    return deleted
  }

  async function pruneOrphaned(pruneInput: { cardId: string, signal?: AbortSignal }) {
    assertNotAborted(pruneInput.signal)
    const result = await input.store.pruneOrphanedVectors(pruneInput)
    clearNativeHealthCache()
    assertNotAborted(pruneInput.signal)
    if (!input.native || !nativeInitialized || result.spaces.length === 0)
      return result.deleted

    let rebuildError: string | null = null
    for (const space of result.spaces) {
      assertNotAborted(pruneInput.signal)
      try {
        await input.native.rebuild({
          cardId: pruneInput.cardId,
          modelId: space.modelId,
          dimensions: space.dimensions,
          vectorSpaceId: space.vectorSpaceId,
          signal: pruneInput.signal,
        })
        assertNotAborted(pruneInput.signal)
        clearNativeError(vectorSpaceKey({
          cardId: pruneInput.cardId,
          modelId: space.modelId,
          dimensions: space.dimensions,
          vectorSpaceId: space.vectorSpaceId,
        }))
      }
      catch (error) {
        if (isAbortError(error) || pruneInput.signal?.aborted)
          throw error
        rebuildError ??= error instanceof Error ? error.message : String(error)
        setNativeError(vectorSpaceKey({
          cardId: pruneInput.cardId,
          modelId: space.modelId,
          dimensions: space.dimensions,
          vectorSpaceId: space.vectorSpaceId,
        }), error)
      }
    }
    if (rebuildError && result.spaces.length === 0)
      nativeUnscopedLastError = rebuildError
    return result.deleted
  }

  async function search(searchInput: PersistentLongTermMemoryVectorSearchFilters & { queryVector: number[] }) {
    assertNotAborted(searchInput.signal)
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
        const key = vectorSpaceKey({
          cardId: resolvedFilters.cardId,
          modelId: resolvedFilters.modelId,
          dimensions: resolvedFilters.dimensions,
          vectorSpaceId,
        })
        if (health.ready && !nativeErrorFor(key)) {
          const results = await input.native.search(queryVector, resolvedFilters)
          assertNotAborted(searchInput.signal)
          clearNativeError(key)
          return results
        }
      }
      catch (error) {
        if (isAbortError(error) || searchInput.signal?.aborted)
          throw error
        setNativeError(vectorSpaceKey({
          cardId: resolvedFilters.cardId,
          modelId: resolvedFilters.modelId,
          dimensions: resolvedFilters.dimensions,
          vectorSpaceId,
        }), error)
      }
    }
    assertNotAborted(searchInput.signal)
    return await input.store.searchVectors(queryVector, resolvedFilters)
  }

  async function rebuild(rebuildInput: {
    cardId: string
    modelId: string
    dimensions: number
    vectorSpaceId: string
    signal?: AbortSignal
  }) {
    assertNotAborted(rebuildInput.signal)
    if (input.native && nativeInitialized) {
      try {
        await input.native.rebuild(rebuildInput)
        assertNotAborted(rebuildInput.signal)
        clearNativeError(vectorSpaceKey(rebuildInput))
        return
      }
      catch (error) {
        if (isAbortError(error) || rebuildInput.signal?.aborted)
          throw error
        setNativeError(vectorSpaceKey(rebuildInput), error)
      }
    }
    assertNotAborted(rebuildInput.signal)
    return await input.store.reindexByModel({
      cardId: rebuildInput.cardId,
      modelId: rebuildInput.modelId,
      dimensions: rebuildInput.dimensions,
      vectorSpaceId: rebuildInput.vectorSpaceId,
      signal: rebuildInput.signal,
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
    const healthKey = healthInput.modelId && healthInput.dimensions && vectorSpaceId
      ? vectorSpaceKey({
          cardId: healthInput.cardId,
          modelId: healthInput.modelId,
          dimensions: healthInput.dimensions,
          vectorSpaceId,
        })
      : null
    let lastError = healthKey
      ? nativeErrorFor(healthKey)
      : nativeUnscopedLastError ?? nativeInitializationError
    let nativeReindexRequired = false
    if (input.native && nativeInitialized && healthInput.modelId && healthInput.dimensions && vectorSpaceId) {
      try {
        const nativeHealth = await getNativeHealth({
          cardId: healthInput.cardId,
          modelId: healthInput.modelId,
          dimensions: healthInput.dimensions,
          vectorSpaceId,
        })
        nativeReindexRequired = nativeHealth.reindexRequired === true
        if (healthKey && nativeErrorFor(healthKey)) {
          nativeReady = false
          lastError = nativeErrorFor(healthKey) ?? lastError
        }
        else {
          nativeReady = nativeHealth.ready
          lastError = nativeHealth.lastError
          // Health describes this observation; it is not a failed write.
          // Actual mutation failures remain sticky until a successful repair.
        }
      }
      catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
    }
    const nativeActive = Boolean(input.native && nativeReady && !lastError)
    const nativeNeedsReindex = Boolean(
      input.native
      && nativeInitialized
      && healthInput.modelId
      && healthInput.dimensions
      && vectorSpaceId
      && canonical.canonicalCount > 0
      && nativeReindexRequired,
    )
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
      reindexRequired: canonical.reindexRequired || nativeNeedsReindex,
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
    upsertNative,
    delete: deleteVectors,
    pruneOrphaned,
    search,
    rebuild,
    getHealth,
  }
}
