import type { PersistentLongTermMemoryVectorRecord, PersistentLongTermMemoryVectorSearchFilters } from './long-term-memory-persistent-vector-store'
import type {
  LongTermMemoryVectorReindexPlan,
  LongTermMemoryVectorSearchResult,
} from './long-term-memory-vector-store'

export type LongTermMemoryVectorIndexMode = 'sqlite-vec' | 'hnsw' | 'ann' | 'brute-force'

export interface LongTermMemoryVectorIndexHealth {
  indexMode: LongTermMemoryVectorIndexMode
  approximate: boolean
  degraded: boolean
  nativeIndexReady: boolean
  searchReady: boolean
  lastError: string | null
  modelId: string | null
  dimensions: number | null
  reindexRequired: boolean
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
  rebuild: (input: { cardId: string, modelId: string, dimensions: number }) => Promise<void>
  getHealth: () => Promise<{ ready: boolean, lastError: string | null }>
}

export interface LongTermMemoryVectorIndexStore {
  initialize: () => Promise<void>
  upsertVectors: (records: PersistentLongTermMemoryVectorRecord[]) => Promise<void>
  searchVectors: (
    queryVector: number[],
    filters: PersistentLongTermMemoryVectorSearchFilters,
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  deleteVectorsBySource: (input: { cardId: string, sourceIds: string[] }) => Promise<number>
  reindexByModel: (input: { cardId: string, modelId: string }) => Promise<LongTermMemoryVectorReindexPlan>
  getHealth: (input: {
    cardId: string
    activeModelId: string | null
    dimensions: number | null
  }) => Promise<{
    providerConfigured: boolean
    modelId: string | null
    dimensions: number | null
    reindexRequired: boolean
  }>
}

export interface LongTermMemoryVectorIndexAdapter {
  initialize: () => Promise<void>
  upsert: (records: PersistentLongTermMemoryVectorRecord[]) => Promise<void>
  delete: (input: { cardId: string, sourceIds: string[] }) => Promise<number>
  search: (
    input: PersistentLongTermMemoryVectorSearchFilters & { queryVector: number[] },
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  rebuild: (input: { cardId: string, modelId: string, dimensions: number }) => Promise<LongTermMemoryVectorReindexPlan | void>
  getHealth: (input: { cardId: string, modelId: string | null, dimensions: number | null }) => Promise<LongTermMemoryVectorIndexHealth>
}

export function createLongTermMemoryVectorIndexAdapter(input: {
  store: LongTermMemoryVectorIndexStore
  native?: LongTermMemoryVectorIndexNativeBackend
}): LongTermMemoryVectorIndexAdapter {
  let nativeLastError: string | null = null

  async function initialize() {
    await input.store.initialize()
    if (!input.native)
      return
    try {
      await input.native.initialize()
      nativeLastError = null
    }
    catch (error) {
      nativeLastError = error instanceof Error ? error.message : String(error)
    }
  }

  async function upsert(records: PersistentLongTermMemoryVectorRecord[]) {
    await input.store.upsertVectors(records)
    if (!input.native || nativeLastError)
      return
    try {
      await input.native.upsert(records)
    }
    catch (error) {
      nativeLastError = error instanceof Error ? error.message : String(error)
    }
  }

  async function deleteVectors(inputDelete: { cardId: string, sourceIds: string[] }) {
    const deleted = await input.store.deleteVectorsBySource(inputDelete)
    if (!input.native || nativeLastError)
      return deleted
    try {
      await input.native.delete(inputDelete)
    }
    catch (error) {
      nativeLastError = error instanceof Error ? error.message : String(error)
    }
    return deleted
  }

  async function search(searchInput: PersistentLongTermMemoryVectorSearchFilters & { queryVector: number[] }) {
    const { queryVector, ...filters } = searchInput
    if (input.native && !nativeLastError) {
      try {
        return await input.native.search(queryVector, filters)
      }
      catch (error) {
        nativeLastError = error instanceof Error ? error.message : String(error)
      }
    }
    return await input.store.searchVectors(queryVector, filters)
  }

  async function rebuild(rebuildInput: { cardId: string, modelId: string, dimensions: number }) {
    if (input.native && !nativeLastError) {
      try {
        await input.native.rebuild(rebuildInput)
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

  async function getHealth(healthInput: { cardId: string, modelId: string | null, dimensions: number | null }) {
    const canonical = await input.store.getHealth({
      cardId: healthInput.cardId,
      activeModelId: healthInput.modelId,
      dimensions: healthInput.dimensions,
    })
    let nativeReady = false
    let lastError = nativeLastError
    if (input.native && !nativeLastError) {
      const nativeHealth = await input.native.getHealth()
      nativeReady = nativeHealth.ready
      lastError = nativeHealth.lastError
    }
    const nativeActive = Boolean(input.native && nativeReady && !lastError)
    const health: LongTermMemoryVectorIndexHealth = {
      indexMode: nativeActive ? input.native!.mode : 'brute-force',
      approximate: nativeActive ? input.native!.approximate : false,
      degraded: !nativeActive,
      nativeIndexReady: nativeActive,
      searchReady: canonical.providerConfigured,
      lastError,
      modelId: canonical.modelId,
      dimensions: canonical.dimensions,
      reindexRequired: canonical.reindexRequired,
    }
    return health
  }

  return {
    initialize,
    upsert,
    delete: deleteVectors,
    search,
    rebuild,
    getHealth,
  }
}
