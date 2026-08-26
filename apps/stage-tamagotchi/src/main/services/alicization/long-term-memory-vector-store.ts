import { resolveLongTermMemoryVectorSpaceId } from './long-term-memory-embedding-provider'

export interface LongTermMemoryVectorRecord {
  id: string
  sourceId: string
  source: string
  text: string
  vector: number[]
  modelId: string
  dimensions: number
  vectorSpaceId?: string
  updatedAt: number
  metadata?: Record<string, unknown>
}

export interface LongTermMemoryVectorSearchFilters {
  modelId: string
  dimensions: number
  vectorSpaceId?: string
  source?: string
  limit?: number
}

export interface LongTermMemoryVectorSearchResult {
  record: LongTermMemoryVectorRecord
  score: number
}

export interface LongTermMemoryVectorReindexPlan {
  modelId: string
  sourceIds: string[]
  recordCount: number
}

export interface LongTermMemoryVectorStore {
  upsertVectors: (records: LongTermMemoryVectorRecord[]) => Promise<void>
  searchVectors: (
    queryVector: number[],
    filters: LongTermMemoryVectorSearchFilters,
  ) => Promise<LongTermMemoryVectorSearchResult[]>
  deleteVectorsBySource: (sourceIds: string[]) => Promise<number>
  reindexByModel: (modelId: string) => Promise<LongTermMemoryVectorReindexPlan>
}

function normalizeText(raw: unknown, maxChars = 360) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function isValidVector(vector: unknown, dimensions: number): vector is number[] {
  return Array.isArray(vector)
    && vector.length === dimensions
    && vector.every(value => Number.isFinite(value))
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || left.length === 0)
    return 0
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    dot += leftValue * rightValue
    leftNorm += leftValue * leftValue
    rightNorm += rightValue * rightValue
  }
  if (leftNorm === 0 || rightNorm === 0)
    return 0
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

export function createInMemoryLongTermMemoryVectorStore(): LongTermMemoryVectorStore {
  const records = new Map<string, LongTermMemoryVectorRecord>()

  async function upsertVectors(nextRecords: LongTermMemoryVectorRecord[]) {
    for (const record of nextRecords) {
      const id = normalizeText(record.id, 240)
      const sourceId = normalizeText(record.sourceId, 240)
      const source = normalizeText(record.source, 120)
      const modelId = normalizeText(record.modelId, 160)
      const dimensions = Math.max(1, Math.floor(Number(record.dimensions)))
      const vectorSpaceId = resolveLongTermMemoryVectorSpaceId({
        modelId,
        dimensions,
        vectorSpaceId: record.vectorSpaceId,
      })
      if (!id || !sourceId || !source || !modelId)
        continue
      if (!isValidVector(record.vector, dimensions))
        continue

      records.set(id, {
        ...record,
        id,
        sourceId,
        source,
        modelId,
        vectorSpaceId,
        dimensions,
        text: normalizeText(record.text, 800),
        vector: [...record.vector],
        updatedAt: Number.isFinite(record.updatedAt) ? Number(record.updatedAt) : Date.now(),
      })
    }
  }

  async function searchVectors(
    queryVector: number[],
    filters: LongTermMemoryVectorSearchFilters,
  ): Promise<LongTermMemoryVectorSearchResult[]> {
    const modelId = normalizeText(filters.modelId, 160)
    const dimensions = Math.max(1, Math.floor(Number(filters.dimensions)))
    const vectorSpaceId = resolveLongTermMemoryVectorSpaceId({
      modelId,
      dimensions,
      vectorSpaceId: filters.vectorSpaceId,
    })
    if (!modelId || !isValidVector(queryVector, dimensions))
      return []

    const limit = Math.max(1, Math.min(32, Math.floor(Number(filters.limit ?? 8))))
    return [...records.values()]
      .filter(record => record.modelId === modelId)
      .filter(record => record.dimensions === dimensions)
      .filter(record => record.vectorSpaceId === vectorSpaceId)
      .filter(record => !filters.source || record.source === filters.source)
      .map(record => ({
        record,
        score: cosineSimilarity(queryVector, record.vector),
      }))
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score || right.record.updatedAt - left.record.updatedAt)
      .slice(0, limit)
  }

  async function deleteVectorsBySource(sourceIds: string[]) {
    const sourceSet = new Set(sourceIds.map(id => normalizeText(id, 240)).filter(Boolean))
    let deleted = 0
    for (const [id, record] of records) {
      if (!sourceSet.has(record.sourceId))
        continue
      records.delete(id)
      deleted += 1
    }
    return deleted
  }

  async function reindexByModel(modelId: string): Promise<LongTermMemoryVectorReindexPlan> {
    const normalizedModelId = normalizeText(modelId, 160)
    const sourceIds = [...new Set(
      [...records.values()]
        .filter(record => record.modelId === normalizedModelId)
        .map(record => record.sourceId),
    )].sort()

    return {
      modelId: normalizedModelId,
      sourceIds,
      recordCount: sourceIds.length,
    }
  }

  return {
    upsertVectors,
    searchVectors,
    deleteVectorsBySource,
    reindexByModel,
  }
}
