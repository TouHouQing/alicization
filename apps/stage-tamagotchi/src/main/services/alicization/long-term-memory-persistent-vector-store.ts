import type sqlite3 from 'sqlite3'
import type {
  LongTermMemoryVectorReindexPlan,
  LongTermMemoryVectorSearchResult,
} from './long-term-memory-vector-store'

import { createHash } from 'node:crypto'

import type { LongTermMemoryVectorRecord } from './long-term-memory-vector-store'

export interface PersistentLongTermMemoryVectorRecord extends LongTermMemoryVectorRecord {
  cardId: string
  status?: 'indexed' | 'stale' | 'failed'
  lastError?: string | null
}

export interface PersistentLongTermMemoryVectorSearchFilters {
  cardId: string
  modelId: string
  dimensions: number
  source?: string
  limit?: number
}

interface PersistentLongTermMemoryVectorRow {
  id: string
  card_id: string
  source_id: string
  source: string
  text: string
  vector_blob: Buffer
  model_id: string
  dimensions: number
  status: string
  last_error: string | null
  updated_at: number
  metadata_json: string | null
}

function normalizeText(raw: unknown, maxChars = 360) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
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

function encodeVector(vector: number[]) {
  return Buffer.from(new Float32Array(vector).buffer)
}

function decodeVector(blob: Buffer | Uint8Array, dimensions: number) {
  const buffer = Buffer.isBuffer(blob) ? blob : Buffer.from(blob)
  const array = new Float32Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 4))
  return Array.from(array).slice(0, dimensions)
}

function textHash(text: string) {
  return createHash('sha256').update(text).digest('hex')
}

function safeJson(raw: unknown) {
  try {
    return JSON.stringify(raw ?? {})
  }
  catch {
    return '{}'
  }
}

function parseMetadata(raw: string | null) {
  if (!raw)
    return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : {}
  }
  catch {
    return {}
  }
}

function mapRow(row: PersistentLongTermMemoryVectorRow): PersistentLongTermMemoryVectorRecord {
  return {
    id: row.id,
    cardId: row.card_id,
    sourceId: row.source_id,
    source: row.source,
    text: row.text,
    vector: decodeVector(row.vector_blob, row.dimensions),
    modelId: row.model_id,
    dimensions: row.dimensions,
    updatedAt: row.updated_at,
    metadata: parseMetadata(row.metadata_json),
    status: row.status === 'failed' || row.status === 'stale' ? row.status : 'indexed',
    lastError: row.last_error,
  }
}

export function createPersistentLongTermMemoryVectorStore(input: {
  database: sqlite3.Database
  now: () => number
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}) {
  async function initialize() {
    await input.run(input.database, `
      CREATE TABLE IF NOT EXISTS long_term_memory_vectors (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL,
        text_hash TEXT NOT NULL,
        text TEXT NOT NULL,
        vector_blob BLOB NOT NULL,
        model_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        status TEXT NOT NULL,
        last_error TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(card_id, source_id, source, model_id)
      )
    `)
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_ltm_vectors_card_model ON long_term_memory_vectors(card_id, model_id, dimensions, status)')
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_ltm_vectors_card_source ON long_term_memory_vectors(card_id, source_id, source)')
  }

  async function upsertVectors(records: PersistentLongTermMemoryVectorRecord[]) {
    const prepared = records
      .map((record) => {
        const id = normalizeText(record.id, 240)
        const cardId = normalizeText(record.cardId, 120)
        const sourceId = normalizeText(record.sourceId, 240)
        const source = normalizeText(record.source, 120)
        const modelId = normalizeText(record.modelId, 160)
        const text = normalizeText(record.text, 1000)
        const dimensions = Math.max(1, Math.floor(Number(record.dimensions)))
        if (!id || !cardId || !sourceId || !source || !modelId || !text)
          return null
        if (!isValidVector(record.vector, dimensions))
          return null
        const updatedAt = Number.isFinite(record.updatedAt) ? Math.max(0, Math.floor(record.updatedAt)) : input.now()
        return {
          id,
          cardId,
          sourceId,
          source,
          text,
          vectorBlob: encodeVector(record.vector),
          modelId,
          dimensions,
          status: record.status === 'failed' || record.status === 'stale' ? record.status : 'indexed',
          lastError: normalizeText(record.lastError, 240) || null,
          metadataJson: safeJson(record.metadata),
          updatedAt,
        }
      })
      .filter((record): record is NonNullable<typeof record> => Boolean(record))
    if (prepared.length === 0)
      return

    await input.enqueueWrite(async () => {
      for (const record of prepared) {
        await input.run(input.database, `
          INSERT INTO long_term_memory_vectors (
            id,
            card_id,
            source_id,
            source,
            text_hash,
            text,
            vector_blob,
            model_id,
            dimensions,
            status,
            last_error,
            metadata_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(card_id, source_id, source, model_id) DO UPDATE SET
            id = excluded.id,
            text_hash = excluded.text_hash,
            text = excluded.text,
            vector_blob = excluded.vector_blob,
            dimensions = excluded.dimensions,
            status = excluded.status,
            last_error = excluded.last_error,
            metadata_json = excluded.metadata_json,
            updated_at = excluded.updated_at
        `, [
          record.id,
          record.cardId,
          record.sourceId,
          record.source,
          textHash(record.text),
          record.text,
          record.vectorBlob,
          record.modelId,
          record.dimensions,
          record.status,
          record.lastError,
          record.metadataJson,
          record.updatedAt,
          record.updatedAt,
        ])
      }
    })
  }

  async function searchVectors(
    queryVector: number[],
    filters: PersistentLongTermMemoryVectorSearchFilters,
  ): Promise<LongTermMemoryVectorSearchResult[]> {
    const cardId = normalizeText(filters.cardId, 120)
    const modelId = normalizeText(filters.modelId, 160)
    const dimensions = Math.max(1, Math.floor(Number(filters.dimensions)))
    if (!cardId || !modelId || !isValidVector(queryVector, dimensions))
      return []

    const rows = await input.all<PersistentLongTermMemoryVectorRow>(
      input.database,
      `
      SELECT *
      FROM long_term_memory_vectors
      WHERE card_id = ?
        AND model_id = ?
        AND dimensions = ?
        AND status = 'indexed'
        AND (? IS NULL OR source = ?)
      `,
      [
        cardId,
        modelId,
        dimensions,
        filters.source ? normalizeText(filters.source, 120) : null,
        filters.source ? normalizeText(filters.source, 120) : null,
      ],
    )
    const limit = Math.max(1, Math.min(32, Math.floor(Number(filters.limit ?? 8))))
    return rows
      .map(row => mapRow(row))
      .map(record => ({
        record,
        score: cosineSimilarity(queryVector, record.vector),
      }))
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score || right.record.updatedAt - left.record.updatedAt)
      .slice(0, limit)
  }

  async function deleteVectorsBySource(inputDelete: { cardId: string, sourceIds: string[] }) {
    const cardId = normalizeText(inputDelete.cardId, 120)
    const sourceIds = inputDelete.sourceIds.map(id => normalizeText(id, 240)).filter(Boolean)
    if (!cardId || sourceIds.length === 0)
      return 0
    let deleted = 0
    await input.enqueueWrite(async () => {
      for (const sourceId of sourceIds) {
        await input.run(input.database, 'DELETE FROM long_term_memory_vectors WHERE card_id = ? AND source_id = ?', [cardId, sourceId])
        deleted += 1
      }
    })
    return deleted
  }

  async function reindexByModel(reindexInput: { cardId: string, modelId: string }): Promise<LongTermMemoryVectorReindexPlan> {
    const cardId = normalizeText(reindexInput.cardId, 120)
    const modelId = normalizeText(reindexInput.modelId, 160)
    if (!cardId || !modelId) {
      return {
        modelId,
        sourceIds: [],
        recordCount: 0,
      }
    }
    const rows = await input.all<{ source_id: string }>(
      input.database,
      'SELECT DISTINCT source_id FROM long_term_memory_vectors WHERE card_id = ? AND model_id = ? ORDER BY source_id ASC',
      [cardId, modelId],
    )
    await input.enqueueWrite(async () => {
      await input.run(input.database, 'UPDATE long_term_memory_vectors SET status = ?, updated_at = ? WHERE card_id = ? AND model_id = ?', [
        'stale',
        input.now(),
        cardId,
        modelId,
      ])
    })
    const sourceIds = rows.map(row => row.source_id)
    return {
      modelId,
      sourceIds,
      recordCount: sourceIds.length,
    }
  }

  async function getHealth(healthInput: {
    cardId: string
    activeModelId: string | null
    dimensions: number | null
  }) {
    const cardId = normalizeText(healthInput.cardId, 120)
    const activeModelId = normalizeText(healthInput.activeModelId, 160) || null
    const dimensions = Number.isFinite(healthInput.dimensions) ? Math.max(1, Math.floor(Number(healthInput.dimensions))) : null
    if (!cardId) {
      return {
        providerConfigured: Boolean(activeModelId && dimensions),
        modelId: activeModelId,
        dimensions,
        reindexRequired: false,
      }
    }
    const rows = await input.all<{ status: string, model_id: string, dimensions: number }>(
      input.database,
      'SELECT status, model_id, dimensions FROM long_term_memory_vectors WHERE card_id = ? ORDER BY updated_at DESC LIMIT 100',
      [cardId],
    )
    const activeRows = activeModelId && dimensions
      ? rows.filter(row => row.model_id === activeModelId && row.dimensions === dimensions)
      : rows
    const activeSpaceMissing = Boolean(activeModelId && dimensions && rows.length > 0 && activeRows.length === 0)
    return {
      providerConfigured: Boolean(activeModelId && dimensions),
      modelId: activeModelId ?? rows[0]?.model_id ?? null,
      dimensions: dimensions ?? rows[0]?.dimensions ?? null,
      reindexRequired: activeSpaceMissing || activeRows.some(row => row.status === 'stale' || row.status === 'failed'),
    }
  }

  return {
    initialize,
    upsertVectors,
    searchVectors,
    deleteVectorsBySource,
    reindexByModel,
    getHealth,
  }
}
