import type { PersistentLongTermMemoryVectorRecord } from './long-term-memory-persistent-vector-store'
import type { LongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import type {
  MemorySemanticScaleResourcePreflight,
  MemorySemanticScaleSearchObservation,
  MemorySemanticScaleSearchQueryObservation,
  MemorySemanticScaleSoakReport,
} from './memory-semantic-scale-soak-harness'

import { performance } from 'node:perf_hooks'

import { resolveLongTermMemoryVectorSpaceId } from './long-term-memory-embedding-provider'
import { runMemorySemanticScaleSoakHarness } from './memory-semantic-scale-soak-harness'

interface MemorySemanticScaleCanonicalRecord {
  cardId: string
  source: string
  sourceId: string
  text: string
}

export interface MemorySemanticScaleSoakProgress {
  phase: 'indexing' | 'querying'
  completed: number
  total: number
  ratio: number
  indexedCount: number
  queryCount: number
  corpusSize: number
}

function normalizePositiveInteger(value: unknown, fallback: number, maximum: number) {
  if (!Number.isFinite(Number(value)))
    return fallback
  return Math.max(1, Math.min(maximum, Math.floor(Number(value))))
}

function normalizeCorpusSizes(values: number[]) {
  return [...new Set(values
    .map(value => normalizePositiveInteger(value, 1, 1_000_000))
    .filter(value => value > 0))]
    .sort((left, right) => left - right)
}

function deterministicVector(index: number, dimensions: number) {
  let state = (Math.imul(index + 1, 0x9E3779B1) ^ 0x85EBCA6B) >>> 0
  const vector = Array.from({ length: dimensions }, (_item, dimension) => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    const centered = ((state >>> 0) / 0xFFFF_FFFF) * 2 - 1
    return centered + ((index + dimension) % dimensions === 0 ? 0.05 : 0)
  })
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map(value => value / norm)
}

function buildVectorRecord(input: {
  cardId: string
  modelId: string
  dimensions: number
  vectorSpaceId: string
  index: number
  updatedAt: number
  vector?: number[]
  foreign?: boolean
}): PersistentLongTermMemoryVectorRecord {
  const suffix = String(input.index).padStart(8, '0')
  const sourceId = `${input.foreign ? 'foreign' : 'target'}-memory-${suffix}`
  const text = `semantic-scale-memory-${suffix}`
  return {
    id: `ltm-vector:${input.cardId}:${input.vectorSpaceId}:memory_reflections:${sourceId}`,
    cardId: input.cardId,
    sourceId,
    source: 'memory_reflections',
    text,
    vector: input.vector ?? deterministicVector(input.index, input.dimensions),
    modelId: input.modelId,
    dimensions: input.dimensions,
    vectorSpaceId: input.vectorSpaceId,
    updatedAt: input.updatedAt,
    metadata: {
      kind: 'reflection',
      scaleSoak: true,
    },
  }
}

function normalizeProviderVector(
  raw: unknown,
  dimensions: number,
  text: string,
) {
  if (
    !raw
    || typeof raw !== 'object'
    || !Array.isArray((raw as { vector?: unknown }).vector)
    || (raw as { vector: unknown[] }).vector.length !== dimensions
    || !(raw as { vector: unknown[] }).vector.every(value => Number.isFinite(value))
  ) {
    throw new Error(`semantic scale embedding provider returned an invalid vector for "${text}"`)
  }
  return (raw as { vector: number[] }).vector
}

async function embedScaleTexts(input: {
  embeddingProvider?: {
    embedTexts: (texts: string[]) => Promise<Array<{ text: string, vector: number[] }>>
  }
  texts: string[]
  dimensions: number
}) {
  if (!input.embeddingProvider)
    return null
  const embeddings = await input.embeddingProvider.embedTexts(input.texts)
  if (embeddings.length !== input.texts.length)
    throw new Error(`semantic scale embedding provider returned ${embeddings.length} vectors for ${input.texts.length} texts`)
  return input.texts.map((text, index) =>
    normalizeProviderVector(embeddings[index], input.dimensions, text))
}

function normalizeVector(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map(value => value / norm)
}

function nonSelfSyntheticQueryVector(vector: number[], index: number) {
  return normalizeVector(vector.map((value, dimension) =>
    value + ((dimension + index) % vector.length === 0 ? 0.001 : 0)))
}

function canonicalRecord(record: PersistentLongTermMemoryVectorRecord): MemorySemanticScaleCanonicalRecord {
  return {
    cardId: record.cardId,
    source: record.source,
    sourceId: record.sourceId,
    text: record.text,
  }
}

function queryIndexes(corpusSize: number, queryCount: number) {
  const count = Math.min(corpusSize, queryCount)
  if (count <= 1)
    return [0]
  return Array.from({ length: count }, (_item, index) =>
    Math.min(corpusSize - 1, Math.floor(index * (corpusSize - 1) / (count - 1))))
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted)
    return
  if (signal.reason instanceof Error)
    throw signal.reason
  throw new DOMException(
    typeof signal.reason === 'string' && signal.reason.trim()
      ? signal.reason
      : 'semantic scale soak aborted',
    'AbortError',
  )
}

export async function runMemorySemanticScaleVectorAdapterSoak(input: {
  id: string
  createdAt: number
  gate?: 'adapter-smoke' | 'production'
  adapterImplementation?: 'persistent-native' | 'test-double' | 'unknown'
  embeddingProvider?: {
    modelId?: string
    dimensions?: number
    embedTexts: (texts: string[]) => Promise<Array<{ text: string, vector: number[] }>>
  }
  resourcePreflight?: MemorySemanticScaleResourcePreflight | null
  adapter: LongTermMemoryVectorIndexAdapter
  prepareCanonical: (records: MemorySemanticScaleCanonicalRecord[]) => Promise<void>
  withBatchWrite?: (task: () => Promise<void>) => Promise<void>
  cardId: string
  foreignCardId: string
  modelId: string
  dimensions: number
  vectorSpaceId: string
  corpusSizes: number[]
  queryCount?: number
  batchSize?: number
  maxP95LatencyMs?: number
  maxP99LatencyMs?: number
  minimumCoverageRatio?: number
  signal?: AbortSignal
  onProgress?: (progress: MemorySemanticScaleSoakProgress) => void | Promise<void>
}): Promise<MemorySemanticScaleSoakReport> {
  const dimensions = normalizePositiveInteger(input.dimensions, 12, 4_096)
  const corpusSizes = normalizeCorpusSizes(input.corpusSizes)
  const queryCount = normalizePositiveInteger(input.queryCount, 24, 256)
  const batchSize = normalizePositiveInteger(input.batchSize, 500, 5_000)
  const vectorSpaceId = resolveLongTermMemoryVectorSpaceId({
    modelId: input.modelId,
    dimensions,
    vectorSpaceId: input.vectorSpaceId,
  })
  const searches: MemorySemanticScaleSearchObservation[] = []
  const totalWork = corpusSizes.reduce((total, corpusSize, index) => {
    const previousCorpusSize = corpusSizes[index - 1] ?? 0
    const indexBatchCount = Math.ceil(Math.max(0, corpusSize - previousCorpusSize) / batchSize)
    return total + indexBatchCount + queryIndexes(corpusSize, queryCount).length
  }, 0)
  let completedWork = 0
  let indexedCorpusSize = 0
  let completedQueryCount = 0

  for (const corpusSize of corpusSizes) {
    for (let offset = indexedCorpusSize; offset < corpusSize; offset += batchSize) {
      throwIfAborted(input.signal)
      const end = Math.min(corpusSize, offset + batchSize)
      const recordTexts = Array.from({ length: end - offset }, (_item, relativeIndex) =>
        `semantic-scale-memory-${String(offset + relativeIndex).padStart(8, '0')}`)
      const providerVectors = await embedScaleTexts({
        embeddingProvider: input.embeddingProvider,
        texts: recordTexts,
        dimensions,
      })
      const records = recordTexts.map((_text, relativeIndex) =>
        buildVectorRecord({
          cardId: input.cardId,
          modelId: input.modelId,
          dimensions,
          vectorSpaceId,
          index: offset + relativeIndex,
          updatedAt: input.createdAt + offset + relativeIndex,
          vector: providerVectors?.[relativeIndex],
        }))
      const persistBatch = async () => {
        await input.prepareCanonical(records.map(canonicalRecord))
        throwIfAborted(input.signal)
        await input.adapter.upsert(records)
      }
      if (input.withBatchWrite)
        await input.withBatchWrite(persistBatch)
      else
        await persistBatch()
      completedWork += 1
      await input.onProgress?.({
        phase: 'indexing',
        completed: completedWork,
        total: totalWork,
        ratio: totalWork === 0 ? 1 : completedWork / totalWork,
        indexedCount: end,
        queryCount: completedQueryCount,
        corpusSize,
      })
      throwIfAborted(input.signal)
    }
    indexedCorpusSize = corpusSize

    const indexes = queryIndexes(corpusSize, queryCount)
    throwIfAborted(input.signal)
    const foreignTexts = indexes.map(index =>
      `semantic-scale-memory-${String(index).padStart(8, '0')}`)
    const foreignProviderVectors = await embedScaleTexts({
      embeddingProvider: input.embeddingProvider,
      texts: foreignTexts,
      dimensions,
    })
    const foreignRecords = indexes.map((index, foreignIndex) =>
      buildVectorRecord({
        cardId: input.foreignCardId,
        modelId: input.modelId,
        dimensions,
        vectorSpaceId,
        index,
        updatedAt: input.createdAt + corpusSize + index,
        vector: foreignProviderVectors?.[foreignIndex],
        foreign: true,
      }))
    const persistForeignBatch = async () => {
      await input.prepareCanonical(foreignRecords.map(canonicalRecord))
      throwIfAborted(input.signal)
      await input.adapter.upsert(foreignRecords)
    }
    if (input.withBatchWrite)
      await input.withBatchWrite(persistForeignBatch)
    else
      await persistForeignBatch()
    throwIfAborted(input.signal)

    const health = await input.adapter.getHealth({
      cardId: input.cardId,
      modelId: input.modelId,
      dimensions,
      vectorSpaceId,
    })
    const queryTexts = indexes.map(index =>
      `semantic-scale query about memory ${String(index).padStart(8, '0')}`)
    const queryProviderVectors = await embedScaleTexts({
      embeddingProvider: input.embeddingProvider,
      texts: queryTexts,
      dimensions,
    })
    const queries: MemorySemanticScaleSearchQueryObservation[] = []
    for (const [queryIndex, index] of indexes.entries()) {
      throwIfAborted(input.signal)
      const target = buildVectorRecord({
        cardId: input.cardId,
        modelId: input.modelId,
        dimensions,
        vectorSpaceId,
        index,
        updatedAt: input.createdAt + index,
      })
      const foreign = buildVectorRecord({
        cardId: input.foreignCardId,
        modelId: input.modelId,
        dimensions,
        vectorSpaceId,
        index,
        updatedAt: input.createdAt + corpusSize + index,
        foreign: true,
      })
      const queryVector = queryProviderVectors?.[queryIndex]
        ?? nonSelfSyntheticQueryVector(target.vector, index)
      const startedAt = performance.now()
      const results = await input.adapter.search({
        queryVector,
        cardId: input.cardId,
        modelId: input.modelId,
        dimensions,
        vectorSpaceId,
        limit: 5,
      })
      throwIfAborted(input.signal)
      queries.push({
        id: `semantic-scale-query:${corpusSize}:${index}`,
        queryText: queryTexts[queryIndex],
        queryMode: input.embeddingProvider ? 'non-self' : 'synthetic',
        queryVectorHash: JSON.stringify(queryVector),
        expectedVectorHash: JSON.stringify(target.vector),
        expectedTopIds: [target.id],
        returnedIds: results.map(result => result.record.id),
        forbiddenIds: [foreign.id],
        latencyMs: performance.now() - startedAt,
      })
      completedWork += 1
      completedQueryCount += 1
      await input.onProgress?.({
        phase: 'querying',
        completed: completedWork,
        total: totalWork,
        ratio: totalWork === 0 ? 1 : completedWork / totalWork,
        indexedCount: indexedCorpusSize,
        queryCount: completedQueryCount,
        corpusSize,
      })
      throwIfAborted(input.signal)
    }

    searches.push({
      id: `semantic-scale-search:${corpusSize}`,
      corpusSize,
      indexMode: health.indexMode,
      approximate: health.approximate,
      degraded: health.degraded,
      nativeIndexReady: health.nativeIndexReady,
      coverageRatio: health.coverageRatio ?? 0,
      vectorInput: input.embeddingProvider ? 'provider' : 'unavailable',
      adapterImplementation: input.adapterImplementation ?? 'unknown',
      queries,
    })
  }

  return runMemorySemanticScaleSoakHarness({
    id: input.id,
    createdAt: input.createdAt,
    gate: input.gate,
    searches,
    minimumCorpusSize: corpusSizes[0] ?? 1,
    maxP95LatencyMs: input.maxP95LatencyMs,
    maxP99LatencyMs: input.maxP99LatencyMs,
    minimumCoverageRatio: input.minimumCoverageRatio,
    resourcePreflight: input.resourcePreflight,
  })
}
