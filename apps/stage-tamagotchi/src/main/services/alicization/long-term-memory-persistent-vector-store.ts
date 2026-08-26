import type sqlite3 from 'sqlite3'

import type {
  LongTermMemoryVectorRecord,
  LongTermMemoryVectorReindexPlan,
  LongTermMemoryVectorSearchResult,
} from './long-term-memory-vector-store'

import { Buffer } from 'node:buffer'

import { resolveLongTermMemoryVectorSpaceId } from './long-term-memory-embedding-provider'
import {
  hashLongTermMemoryEmbeddingText,
  normalizeLongTermMemoryEmbeddingText,
} from './long-term-memory-embedding-text'

export interface PersistentLongTermMemoryVectorRecord extends LongTermMemoryVectorRecord {
  cardId: string
  textHash?: string
  status?: 'indexed' | 'stale' | 'failed'
  lastError?: string | null
}

export interface PersistentLongTermMemoryVectorSearchFilters {
  cardId: string
  modelId: string
  dimensions: number
  vectorSpaceId?: string
  source?: string
  limit?: number
}

export interface PersistentLongTermMemoryVectorDeleteInput {
  cardId: string
  sourceIds: string[]
  source?: string | null
  modelId?: string | null
  dimensions?: number | null
  vectorSpaceId?: string | null
}

export interface PersistentLongTermMemoryVectorCoverage {
  canonicalCount: number
  indexedCount: number
  missingCount: number
  textHashMismatchCount: number
  staleOrFailedCount: number
  orphanedCount: number
  coverageRatio: number | null
}

interface PersistentLongTermMemoryVectorRow {
  id: string
  card_id: string
  source_id: string
  source: string
  text_hash: string
  text: string
  vector_blob: Buffer
  model_id: string
  dimensions: number
  vector_space_id: string
  status: string
  last_error: string | null
  updated_at: number
  metadata_json: string | null
}

interface PreparedPersistentLongTermMemoryVectorRecord {
  id: string
  cardId: string
  sourceId: string
  source: string
  text: string
  textHash: string
  vectorBlob: Buffer
  modelId: string
  dimensions: number
  vectorSpaceId: string
  status: 'indexed' | 'stale' | 'failed'
  lastError: string | null
  metadataJson: string
  updatedAt: number
}

const vectorUpsertBatchSize = 500

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
    vectorSpaceId: row.vector_space_id,
    textHash: row.text_hash,
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
        vector_space_id TEXT NOT NULL,
        status TEXT NOT NULL,
        last_error TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(card_id, source_id, source, vector_space_id)
      )
    `)
    await input.run(input.database, `
      CREATE TABLE IF NOT EXISTS long_term_memory_tombstones (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(card_id, source_id, source)
      )
    `)
    const uniqueIndexes = await input.all<{ name: string, unique: number }>(
      input.database,
      'PRAGMA index_list(long_term_memory_vectors)',
    )
    let hasVectorSpaceScopedUnique = false
    for (const index of uniqueIndexes.filter(index => index.unique === 1)) {
      const columns = await input.all<{ name: string }>(
        input.database,
        `PRAGMA index_info("${index.name.replaceAll('"', '""')}")`,
      )
      if (columns.map(column => column.name).join(',') === 'card_id,source_id,source,vector_space_id') {
        hasVectorSpaceScopedUnique = true
        break
      }
    }
    const columns = await input.all<{ name: string }>(
      input.database,
      'PRAGMA table_info(long_term_memory_vectors)',
    )
    if (!hasVectorSpaceScopedUnique || !columns.some(column => column.name === 'vector_space_id')) {
      await input.run(input.database, 'DROP TABLE IF EXISTS long_term_memory_vectors')
      await input.run(input.database, `
        CREATE TABLE long_term_memory_vectors (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          source_id TEXT NOT NULL,
          source TEXT NOT NULL,
          text_hash TEXT NOT NULL,
          text TEXT NOT NULL,
          vector_blob BLOB NOT NULL,
          model_id TEXT NOT NULL,
          dimensions INTEGER NOT NULL,
          vector_space_id TEXT NOT NULL,
          status TEXT NOT NULL,
          last_error TEXT,
          metadata_json TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(card_id, source_id, source, vector_space_id)
        )
      `)
    }
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_ltm_vectors_card_model ON long_term_memory_vectors(card_id, vector_space_id, model_id, dimensions, status)')
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_ltm_vectors_card_source ON long_term_memory_vectors(card_id, source_id, source)')
  }

  function prepareVectorRecords(records: PersistentLongTermMemoryVectorRecord[]) {
    return records
      .map((record) => {
        const id = normalizeText(record.id, 240)
        const cardId = normalizeText(record.cardId, 120)
        const sourceId = normalizeText(record.sourceId, 240)
        const source = normalizeText(record.source, 120)
        const modelId = normalizeText(record.modelId, 160)
        const text = normalizeLongTermMemoryEmbeddingText(record.text)
        const expectedTextHash = hashLongTermMemoryEmbeddingText(text)
        const providedTextHash = normalizeText(record.textHash, 64)
        const dimensions = Math.max(1, Math.floor(Number(record.dimensions)))
        const vectorSpaceId = resolveLongTermMemoryVectorSpaceId({
          modelId,
          dimensions,
          vectorSpaceId: record.vectorSpaceId,
        })
        if (!id || !cardId || !sourceId || !source || !modelId || !text)
          return null
        if (providedTextHash && providedTextHash !== expectedTextHash)
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
          textHash: providedTextHash || expectedTextHash,
          vectorBlob: encodeVector(record.vector),
          modelId,
          dimensions,
          vectorSpaceId,
          status: (record.status === 'failed' || record.status === 'stale' ? record.status : 'indexed') as 'failed' | 'stale' | 'indexed',
          lastError: normalizeText(record.lastError, 240) || null,
          metadataJson: safeJson(record.metadata),
          updatedAt,
        }
      })
      .filter((record): record is NonNullable<typeof record> => Boolean(record))
  }

  async function upsertPreparedVectors(
    prepared: PreparedPersistentLongTermMemoryVectorRecord[],
  ) {
    if (prepared.length === 0)
      return

    for (let offset = 0; offset < prepared.length; offset += vectorUpsertBatchSize) {
      const batch = prepared.slice(offset, offset + vectorUpsertBatchSize)
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
          vector_space_id,
          status,
          last_error,
          metadata_json,
          created_at,
          updated_at
        ) VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
        ON CONFLICT(card_id, source_id, source, vector_space_id) DO UPDATE SET
          id = excluded.id,
          text_hash = excluded.text_hash,
          text = excluded.text,
          vector_blob = excluded.vector_blob,
          model_id = excluded.model_id,
          dimensions = excluded.dimensions,
          vector_space_id = excluded.vector_space_id,
          status = excluded.status,
          last_error = excluded.last_error,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at
      `, batch.flatMap(record => [
        record.id,
        record.cardId,
        record.sourceId,
        record.source,
        record.textHash,
        record.text,
        record.vectorBlob,
        record.modelId,
        record.dimensions,
        record.vectorSpaceId,
        record.status,
        record.lastError,
        record.metadataJson,
        record.updatedAt,
        record.updatedAt,
      ]))
    }
  }

  async function upsertVectors(records: PersistentLongTermMemoryVectorRecord[]) {
    const prepared = prepareVectorRecords(records)
    if (prepared.length === 0)
      return

    await input.enqueueWrite(async () => {
      await upsertPreparedVectors(prepared)
    })
  }

  async function upsertVectorsInTransaction(records: PersistentLongTermMemoryVectorRecord[]) {
    await upsertPreparedVectors(prepareVectorRecords(records))
  }

  async function searchVectors(
    queryVector: number[],
    filters: PersistentLongTermMemoryVectorSearchFilters,
  ): Promise<LongTermMemoryVectorSearchResult[]> {
    const cardId = normalizeText(filters.cardId, 120)
    const modelId = normalizeText(filters.modelId, 160)
    const dimensions = Math.max(1, Math.floor(Number(filters.dimensions)))
    const vectorSpaceId = resolveLongTermMemoryVectorSpaceId({
      modelId,
      dimensions,
      vectorSpaceId: filters.vectorSpaceId,
    })
    if (!cardId || !modelId || !vectorSpaceId || !isValidVector(queryVector, dimensions))
      return []

    const rows = await input.all<PersistentLongTermMemoryVectorRow>(
      input.database,
      `
      SELECT vector.*
      FROM long_term_memory_vectors vector
      JOIN long_term_memory_search_documents doc
        ON doc.card_id = vector.card_id
        AND doc.source = vector.source
        AND doc.source_id = vector.source_id
        AND doc.text_hash = vector.text_hash
        AND doc.tombstoned = 0
      WHERE vector.card_id = ?
        AND vector.model_id = ?
        AND vector.dimensions = ?
        AND vector.vector_space_id = ?
        AND vector.status = 'indexed'
        AND NOT EXISTS (
          SELECT 1
          FROM long_term_memory_tombstones tomb
          WHERE tomb.card_id = vector.card_id
            AND tomb.source_id = vector.source_id
            AND (
              tomb.source = vector.source
              OR tomb.source = 'long_term_memory'
            )
        )
        AND (? IS NULL OR vector.source = ?)
      `,
      [
        cardId,
        modelId,
        dimensions,
        vectorSpaceId,
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

  async function deleteVectorsBySource(inputDelete: PersistentLongTermMemoryVectorDeleteInput) {
    const cardId = normalizeText(inputDelete.cardId, 120)
    const sourceIds = inputDelete.sourceIds.map(id => normalizeText(id, 240)).filter(Boolean)
    const source = normalizeText(inputDelete.source, 120)
    if (!cardId || sourceIds.length === 0)
      return 0
    let deleted = 0
    await input.enqueueWrite(async () => {
      const sourceClause = source && source !== 'long_term_memory' ? ' AND source = ?' : ''
      const rows = await input.all<{ id: string }>(
        input.database,
        `SELECT id
         FROM long_term_memory_vectors
         WHERE card_id = ?
           AND source_id IN (${sourceIds.map(() => '?').join(', ')})
           ${sourceClause}`,
        [cardId, ...sourceIds, ...(sourceClause ? [source] : [])],
      )
      if (rows.length === 0)
        return
      await input.run(
        input.database,
        `DELETE FROM long_term_memory_vectors
         WHERE card_id = ?
           AND id IN (${rows.map(() => '?').join(', ')})`,
        [cardId, ...rows.map(row => row.id)],
      )
      deleted = rows.length
    })
    return deleted
  }

  async function pruneOrphanedVectors(inputPrune: { cardId: string }) {
    const cardId = normalizeText(inputPrune.cardId, 120)
    if (!cardId) {
      return {
        deleted: 0,
        spaces: [],
      }
    }

    return await input.enqueueWrite(async () => {
      const rows = await input.all<{
        id: string
        model_id: string
        dimensions: number
        vector_space_id: string
      }>(
        input.database,
        `
        SELECT vector.id, vector.model_id, vector.dimensions, vector.vector_space_id
        FROM long_term_memory_vectors vector
        WHERE vector.card_id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM long_term_memory_search_documents doc
            WHERE doc.card_id = vector.card_id
              AND doc.source = vector.source
              AND doc.source_id = vector.source_id
              AND doc.tombstoned = 0
              AND NOT EXISTS (
                SELECT 1
                FROM long_term_memory_tombstones tomb
                WHERE tomb.card_id = doc.card_id
                  AND tomb.source_id = doc.source_id
                  AND (tomb.source = doc.source OR tomb.source = 'long_term_memory')
              )
          )
        ORDER BY vector.model_id ASC, vector.dimensions ASC, vector.vector_space_id ASC, vector.id ASC
        `,
        [cardId],
      )
      if (rows.length === 0) {
        return {
          deleted: 0,
          spaces: [],
        }
      }

      await input.run(
        input.database,
        `DELETE FROM long_term_memory_vectors
         WHERE card_id = ? AND id IN (${rows.map(() => '?').join(', ')})`,
        [cardId, ...rows.map(row => row.id)],
      )

      const spaces = [...new Map(
        rows.map(row => [
          `${row.model_id}\u0000${row.dimensions}\u0000${row.vector_space_id}`,
          {
            modelId: row.model_id,
            dimensions: Math.max(1, Math.floor(Number(row.dimensions))),
            vectorSpaceId: row.vector_space_id,
          },
        ]),
      ).values()]

      return {
        deleted: rows.length,
        spaces,
      }
    })
  }

  async function reindexByModel(reindexInput: {
    cardId: string
    modelId: string
    dimensions?: number
    vectorSpaceId?: string
  }): Promise<LongTermMemoryVectorReindexPlan> {
    const cardId = normalizeText(reindexInput.cardId, 120)
    const modelId = normalizeText(reindexInput.modelId, 160)
    const dimensions = Number.isFinite(reindexInput.dimensions)
      ? Math.max(1, Math.floor(Number(reindexInput.dimensions)))
      : null
    const vectorSpaceId = dimensions
      ? resolveLongTermMemoryVectorSpaceId({
          modelId,
          dimensions,
          vectorSpaceId: reindexInput.vectorSpaceId,
        })
      : null
    if (!cardId || !modelId) {
      return {
        modelId,
        sourceIds: [],
        recordCount: 0,
      }
    }
    const scopeClause = dimensions && vectorSpaceId
      ? ' AND dimensions = ? AND vector_space_id = ?'
      : ''
    const scopeParams = dimensions && vectorSpaceId ? [dimensions, vectorSpaceId] : []
    const rows = await input.all<{ source_id: string }>(
      input.database,
      `SELECT DISTINCT source_id
       FROM long_term_memory_vectors
       WHERE card_id = ? AND model_id = ?${scopeClause}
       ORDER BY source_id ASC`,
      [cardId, modelId, ...scopeParams],
    )
    await input.enqueueWrite(async () => {
      await input.run(input.database, `UPDATE long_term_memory_vectors
        SET status = ?, updated_at = ?
        WHERE card_id = ? AND model_id = ?${scopeClause}`, [
        'stale',
        input.now(),
        cardId,
        modelId,
        ...scopeParams,
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
    vectorSpaceId?: string | null
  }) {
    const cardId = normalizeText(healthInput.cardId, 120)
    const activeModelId = normalizeText(healthInput.activeModelId, 160) || null
    const dimensions = Number.isFinite(healthInput.dimensions) ? Math.max(1, Math.floor(Number(healthInput.dimensions))) : null
    const vectorSpaceId = activeModelId && dimensions
      ? resolveLongTermMemoryVectorSpaceId({
          modelId: activeModelId,
          dimensions,
          vectorSpaceId: healthInput.vectorSpaceId ?? undefined,
        })
      : null
    if (!cardId) {
      return {
        providerConfigured: Boolean(activeModelId && dimensions),
        modelId: activeModelId,
        dimensions,
        searchReady: false,
        reindexRequired: false,
        canonicalCount: 0,
        indexedCount: 0,
        missingCount: 0,
        textHashMismatchCount: 0,
        staleOrFailedCount: 0,
        orphanedCount: 0,
        coverageRatio: null,
      }
    }
    const providerConfigured = Boolean(activeModelId && dimensions && vectorSpaceId)
    if (!providerConfigured) {
      return {
        providerConfigured: false,
        modelId: activeModelId,
        dimensions,
        searchReady: false,
        reindexRequired: false,
        canonicalCount: 0,
        indexedCount: 0,
        missingCount: 0,
        textHashMismatchCount: 0,
        staleOrFailedCount: 0,
        orphanedCount: 0,
        coverageRatio: null,
      }
    }
    const coverage = await input.all<PersistentLongTermMemoryVectorCoverage>(
      input.database,
      `
      WITH canonical AS (
        SELECT doc.card_id, doc.source, doc.source_id, doc.text_hash
        FROM long_term_memory_search_documents doc
        WHERE doc.card_id = ?
          AND doc.tombstoned = 0
          AND NOT EXISTS (
            SELECT 1
            FROM long_term_memory_tombstones tomb
            WHERE tomb.card_id = doc.card_id
              AND tomb.source_id = doc.source_id
              AND (tomb.source = doc.source OR tomb.source = 'long_term_memory')
          )
      )
      SELECT
        COUNT(*) AS canonicalCount,
        COALESCE(SUM(
          CASE
            WHEN vector.id IS NOT NULL
              AND vector.text_hash = doc.text_hash
              AND vector.status = 'indexed'
            THEN 1
            ELSE 0
          END
        ), 0) AS indexedCount,
        COALESCE(SUM(CASE WHEN vector.id IS NULL THEN 1 ELSE 0 END), 0) AS missingCount,
        COALESCE(SUM(
          CASE
            WHEN vector.id IS NOT NULL AND vector.text_hash != doc.text_hash
            THEN 1
            ELSE 0
          END
        ), 0) AS textHashMismatchCount,
        COALESCE(SUM(
          CASE
            WHEN vector.id IS NOT NULL
              AND vector.text_hash = doc.text_hash
              AND vector.status != 'indexed'
            THEN 1
            ELSE 0
          END
        ), 0) AS staleOrFailedCount,
        (
          SELECT COUNT(*)
          FROM long_term_memory_vectors orphan
          WHERE NOT EXISTS (
            SELECT 1
            FROM canonical doc
            WHERE doc.source = orphan.source
              AND doc.source_id = orphan.source_id
          )
            AND orphan.card_id = ?
            AND orphan.model_id = ?
            AND orphan.dimensions = ?
            AND orphan.vector_space_id = ?
        ) AS orphanedCount,
        NULL AS coverageRatio
      FROM canonical doc
      LEFT JOIN long_term_memory_vectors vector
        ON vector.card_id = doc.card_id
        AND vector.source = doc.source
        AND vector.source_id = doc.source_id
        AND vector.model_id = ?
        AND vector.dimensions = ?
        AND vector.vector_space_id = ?
      `,
      [
        cardId,
        cardId,
        activeModelId,
        dimensions,
        vectorSpaceId,
        activeModelId,
        dimensions,
        vectorSpaceId,
      ],
    )
    const row = coverage[0]
    const canonicalCount = Number(row?.canonicalCount ?? 0)
    const indexedCount = Number(row?.indexedCount ?? 0)
    const missingCount = Number(row?.missingCount ?? 0)
    const textHashMismatchCount = Number(row?.textHashMismatchCount ?? 0)
    const staleOrFailedCount = Number(row?.staleOrFailedCount ?? 0)
    const orphanedCount = Number(row?.orphanedCount ?? 0)
    const coverageRatio = canonicalCount > 0
      ? Number((indexedCount / canonicalCount).toFixed(4))
      : null
    const reindexRequired = missingCount > 0
      || textHashMismatchCount > 0
      || staleOrFailedCount > 0
      || orphanedCount > 0
    return {
      providerConfigured,
      modelId: activeModelId,
      dimensions,
      searchReady: canonicalCount > 0 && !reindexRequired,
      reindexRequired,
      canonicalCount,
      indexedCount,
      missingCount,
      textHashMismatchCount,
      staleOrFailedCount,
      orphanedCount,
      coverageRatio,
    }
  }

  return {
    initialize,
    upsertVectors,
    upsertVectorsInTransaction,
    searchVectors,
    deleteVectorsBySource,
    pruneOrphanedVectors,
    reindexByModel,
    getHealth,
  }
}
