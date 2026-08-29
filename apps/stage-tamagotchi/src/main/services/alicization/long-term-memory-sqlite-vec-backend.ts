import type sqlite3 from 'sqlite3'

import type {
  PersistentLongTermMemoryVectorDeleteInput,
  PersistentLongTermMemoryVectorRecord,
  PersistentLongTermMemoryVectorSearchFilters,
} from './long-term-memory-persistent-vector-store'
import type { LongTermMemoryVectorIndexNativeBackend } from './long-term-memory-vector-index-adapter'
import type { LongTermMemoryVectorSearchResult } from './long-term-memory-vector-store'

import process from 'node:process'

import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { getLoadablePath } from 'sqlite-vec'

import { resolveLongTermMemoryVectorSpaceId } from './long-term-memory-embedding-provider'
import {
  hashLongTermMemoryEmbeddingText,
  normalizeLongTermMemoryEmbeddingText,
} from './long-term-memory-embedding-text'

interface SqliteVecMappingRow {
  native_rowid: number
  record_id: string
  card_id: string
  source_id: string
  source: string
  model_id: string
  dimensions: number
  vector_space_id: string
  canonical_text_hash: string
  canonical_updated_at: number
}

interface SqliteVecCanonicalRow {
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

const sqliteVecUpsertBatchSize = 500

function normalizeText(raw: unknown, maxChars = 360) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

function normalizeDimensions(raw: unknown) {
  if (!Number.isFinite(Number(raw)))
    return null
  const dimensions = Math.floor(Number(raw))
  return dimensions >= 1 && dimensions <= 65_536 ? dimensions : null
}

function isValidVector(vector: unknown, dimensions: number): vector is number[] {
  return Array.isArray(vector)
    && vector.length === dimensions
    && vector.every(value => Number.isFinite(value))
}

function encodeVector(vector: number[]) {
  return Buffer.from(new Float32Array(vector).buffer)
}

function decodeVector(blob: Buffer | Uint8Array, dimensions: number) {
  const buffer = Buffer.isBuffer(blob) ? blob : Buffer.from(blob)
  const array = new Float32Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 4))
  return Array.from(array).slice(0, dimensions)
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

function tableName(dimensions: number) {
  return `long_term_memory_vec_${dimensions}`
}

function hasPartitionedScopeSchema(sql: string | null | undefined) {
  const normalized = sql?.toLowerCase().replace(/\s+/g, ' ') ?? ''
  return normalized.includes('card_id text partition key')
    && normalized.includes('model_id text partition key')
    && normalized.includes('vector_space_id text partition key')
}

function packagedExtensionPath(path: string) {
  if (!path.includes('app.asar'))
    return path
  const unpacked = path.replace('app.asar', 'app.asar.unpacked')
  return existsSync(unpacked) ? unpacked : path
}

function sqliteVecExtensionFilename() {
  if (process.platform === 'win32')
    return 'vec0.dll'
  if (process.platform === 'darwin')
    return 'vec0.dylib'
  return 'vec0.so'
}

function resolveSqliteVecExtensionPath() {
  if (process.resourcesPath) {
    const resourcePath = join(process.resourcesPath, 'sqlite-vec', sqliteVecExtensionFilename())
    if (existsSync(resourcePath))
      return resourcePath
  }
  return packagedExtensionPath(getLoadablePath())
}

function loadExtension(database: sqlite3.Database, path: string) {
  return new Promise<void>((resolve, reject) => {
    database.loadExtension(path, error => error ? reject(error) : resolve())
  })
}

function mapCanonicalRow(row: SqliteVecCanonicalRow): PersistentLongTermMemoryVectorRecord {
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

export function createSqliteVecLongTermMemoryVectorBackend(input: {
  database: sqlite3.Database
  now: () => number
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}): LongTermMemoryVectorIndexNativeBackend {
  let initialized = false
  let lastError: string | null = null
  const ensuredVectorDimensions = new Set<number>()

  async function ensureVectorTable(dimensions: number) {
    if (ensuredVectorDimensions.has(dimensions))
      return
    await input.run(input.database, `
      CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName(dimensions)} USING vec0(
        embedding float[${dimensions}] distance_metric=cosine,
        card_id text partition key,
        model_id text partition key,
        vector_space_id text partition key,
        source text
      )
    `)
    ensuredVectorDimensions.add(dimensions)
  }

  async function initialize() {
    try {
      await loadExtension(input.database, resolveSqliteVecExtensionPath())
      await input.get<{ version: string }>(input.database, 'SELECT vec_version() AS version')
      const existingMappingColumns = await input.all<{ name: string }>(
        input.database,
        'PRAGMA table_info(long_term_memory_sqlite_vec_rows)',
      )
      const mappingColumnNames = new Set(existingMappingColumns.map(column => column.name))
      if (existingMappingColumns.length > 0 && (!mappingColumnNames.has('vector_space_id') || !mappingColumnNames.has('canonical_text_hash'))) {
        const vectorTables = await input.all<{ name: string }>(
          input.database,
          `SELECT name
           FROM sqlite_master
           WHERE type = 'table'
             AND name GLOB 'long_term_memory_vec_[0-9]*'
             AND sql LIKE 'CREATE VIRTUAL TABLE%'`,
        )
        for (const table of vectorTables)
          await input.run(input.database, `DROP TABLE IF EXISTS "${table.name.replaceAll('"', '""')}"`)
        await input.run(input.database, 'DROP TABLE IF EXISTS long_term_memory_sqlite_vec_rows')
      }
      await input.run(input.database, `
        CREATE TABLE IF NOT EXISTS long_term_memory_sqlite_vec_rows (
          native_rowid INTEGER PRIMARY KEY AUTOINCREMENT,
          record_id TEXT NOT NULL UNIQUE,
          card_id TEXT NOT NULL,
          source_id TEXT NOT NULL,
          source TEXT NOT NULL,
          model_id TEXT NOT NULL,
          dimensions INTEGER NOT NULL,
          vector_space_id TEXT NOT NULL,
          canonical_text_hash TEXT NOT NULL,
          canonical_updated_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)
      await input.run(
        input.database,
        'CREATE INDEX IF NOT EXISTS idx_ltm_sqlite_vec_space ON long_term_memory_sqlite_vec_rows(card_id, vector_space_id, model_id, dimensions, source)',
      )
      await input.run(
        input.database,
        'CREATE INDEX IF NOT EXISTS idx_ltm_sqlite_vec_source ON long_term_memory_sqlite_vec_rows(card_id, source_id)',
      )
      const existingVectorTables = await input.all<{ name: string, sql: string | null }>(
        input.database,
        `SELECT name, sql
         FROM sqlite_master
         WHERE type = 'table'
           AND name GLOB 'long_term_memory_vec_[0-9]*'
           AND sql LIKE 'CREATE VIRTUAL TABLE%'`,
      )
      for (const table of existingVectorTables) {
        if (hasPartitionedScopeSchema(table.sql))
          continue
        const dimensions = normalizeDimensions(table.name.replace('long_term_memory_vec_', ''))
        await input.run(input.database, `DROP TABLE IF EXISTS "${table.name.replaceAll('"', '""')}"`)
        if (dimensions) {
          await input.run(
            input.database,
            'DELETE FROM long_term_memory_sqlite_vec_rows WHERE dimensions = ?',
            [dimensions],
          )
        }
      }
      initialized = true
      lastError = null
    }
    catch (error) {
      initialized = false
      lastError = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  async function upsertPrepared(records: PersistentLongTermMemoryVectorRecord[]) {
    for (let offset = 0; offset < records.length; offset += sqliteVecUpsertBatchSize) {
      const batch = records.slice(offset, offset + sqliteVecUpsertBatchSize)
      const recordsByDimensions = new Map<number, PersistentLongTermMemoryVectorRecord[]>()
      for (const record of batch) {
        const dimensions = normalizeDimensions(record.dimensions)
        if (!dimensions)
          continue
        const grouped = recordsByDimensions.get(dimensions) ?? []
        grouped.push(record)
        recordsByDimensions.set(dimensions, grouped)
      }
      for (const dimensions of recordsByDimensions.keys())
        await ensureVectorTable(dimensions)

      const previousMappings = await input.all<SqliteVecMappingRow>(
        input.database,
        `SELECT *
         FROM long_term_memory_sqlite_vec_rows
         WHERE record_id IN (${batch.map(() => '?').join(', ')})`,
        batch.map(record => record.id),
      )
      const nextRecordById = new Map(batch.map(record => [record.id, record]))
      const staleRowIdsByDimensions = new Map<number, number[]>()
      for (const previous of previousMappings) {
        const next = nextRecordById.get(previous.record_id)
        if (!next || previous.dimensions === next.dimensions)
          continue
        const rowIds = staleRowIdsByDimensions.get(previous.dimensions) ?? []
        rowIds.push(previous.native_rowid)
        staleRowIdsByDimensions.set(previous.dimensions, rowIds)
      }
      for (const [dimensions, rowIds] of staleRowIdsByDimensions) {
        await input.run(
          input.database,
          `DELETE FROM ${tableName(dimensions)}
           WHERE rowid IN (${rowIds.map(() => '?').join(', ')})`,
          rowIds,
        )
      }

      const now = input.now()
      const mappings = await input.all<SqliteVecMappingRow>(input.database, `
        INSERT INTO long_term_memory_sqlite_vec_rows (
          record_id, card_id, source_id, source, model_id, dimensions,
          vector_space_id, canonical_text_hash, canonical_updated_at, created_at, updated_at
        ) VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
        ON CONFLICT(record_id) DO UPDATE SET
          card_id = excluded.card_id,
          source_id = excluded.source_id,
          source = excluded.source,
          model_id = excluded.model_id,
          dimensions = excluded.dimensions,
          vector_space_id = excluded.vector_space_id,
          canonical_text_hash = excluded.canonical_text_hash,
          canonical_updated_at = excluded.canonical_updated_at,
          updated_at = excluded.updated_at
        RETURNING *
      `, batch.flatMap(record => [
        record.id,
        record.cardId,
        record.sourceId,
        record.source,
        record.modelId,
        record.dimensions,
        record.vectorSpaceId,
        record.textHash,
        record.updatedAt,
        now,
        now,
      ]))
      const mappingByRecordId = new Map(mappings.map(mapping => [mapping.record_id, mapping]))
      for (const [dimensions, dimensionRecords] of recordsByDimensions) {
        await input.run(input.database, `
          INSERT OR REPLACE INTO ${tableName(dimensions)} (
            rowid, embedding, card_id, model_id, vector_space_id, source
          ) VALUES ${dimensionRecords.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}
        `, dimensionRecords.flatMap((record) => {
          const mapping = mappingByRecordId.get(record.id)
          if (!mapping)
            throw new Error(`sqlite-vec mapping was not created for vector: ${record.id}`)
          return [
            mapping.native_rowid,
            encodeVector(record.vector),
            record.cardId,
            record.modelId,
            record.vectorSpaceId,
            record.source,
          ]
        }))
      }
    }
  }

  async function upsert(records: PersistentLongTermMemoryVectorRecord[]) {
    if (!initialized)
      throw new Error(lastError ?? 'sqlite-vec backend is not initialized')
    const prepared = records
      .map((record) => {
        const dimensions = normalizeDimensions(record.dimensions)
        const normalized = {
          ...record,
          id: normalizeText(record.id, 240),
          cardId: normalizeText(record.cardId, 120),
          sourceId: normalizeText(record.sourceId, 240),
          source: normalizeText(record.source, 120),
          modelId: normalizeText(record.modelId, 160),
          vectorSpaceId: resolveLongTermMemoryVectorSpaceId({
            modelId: record.modelId,
            dimensions: dimensions ?? 1,
            vectorSpaceId: record.vectorSpaceId,
          }),
          text: normalizeLongTermMemoryEmbeddingText(record.text),
          dimensions: dimensions ?? 0,
        }
        const textHash = normalizeText(record.textHash, 64)
          || hashLongTermMemoryEmbeddingText(normalized.text)
        return normalized.id
          && normalized.cardId
          && normalized.sourceId
          && normalized.source
          && normalized.modelId
          && normalized.vectorSpaceId
          && textHash
          && normalized.text
          && dimensions
          && isValidVector(record.vector, dimensions)
          ? { ...normalized, textHash }
          : null
      })
      .filter((record): record is NonNullable<typeof record> => Boolean(record))
    if (prepared.length === 0)
      return
    await input.enqueueWrite(async () => {
      await upsertPrepared(prepared)
    })
    lastError = null
  }

  async function deleteVectors(deleteInput: PersistentLongTermMemoryVectorDeleteInput) {
    if (!initialized)
      throw new Error(lastError ?? 'sqlite-vec backend is not initialized')
    const cardId = normalizeText(deleteInput.cardId, 120)
    const sourceIds = [...new Set(deleteInput.sourceIds.map(id => normalizeText(id, 240)).filter(Boolean))]
    const source = normalizeText(deleteInput.source, 120)
    if (!cardId || sourceIds.length === 0)
      return 0
    return await input.enqueueWrite(async () => {
      const rows = await input.all<SqliteVecMappingRow>(
        input.database,
        `SELECT *
         FROM long_term_memory_sqlite_vec_rows
         WHERE card_id = ?
           AND source_id IN (${sourceIds.map(() => '?').join(', ')})
           ${source && source !== 'long_term_memory' ? 'AND source = ?' : ''}`,
        [cardId, ...sourceIds, ...(source && source !== 'long_term_memory' ? [source] : [])],
      )
      for (const row of rows) {
        await input.run(
          input.database,
          `DELETE FROM ${tableName(row.dimensions)} WHERE rowid = ?`,
          [row.native_rowid],
        )
        await input.run(
          input.database,
          'DELETE FROM long_term_memory_sqlite_vec_rows WHERE native_rowid = ?',
          [row.native_rowid],
        )
      }
      lastError = null
      return rows.length
    })
  }

  async function search(
    queryVector: number[],
    filters: PersistentLongTermMemoryVectorSearchFilters,
  ): Promise<LongTermMemoryVectorSearchResult[]> {
    if (!initialized)
      throw new Error(lastError ?? 'sqlite-vec backend is not initialized')
    const cardId = normalizeText(filters.cardId, 120)
    const modelId = normalizeText(filters.modelId, 160)
    const source = normalizeText(filters.source, 120)
    const dimensions = normalizeDimensions(filters.dimensions)
    const vectorSpaceId = dimensions
      ? resolveLongTermMemoryVectorSpaceId({
          modelId,
          dimensions,
          vectorSpaceId: filters.vectorSpaceId,
        })
      : ''
    if (!cardId || !modelId || !vectorSpaceId || !dimensions || !isValidVector(queryVector, dimensions))
      return []
    const limit = Math.max(1, Math.min(32, Math.floor(Number(filters.limit ?? 8))))
    const nativeLimit = Math.min(64, Math.max(limit, limit * 4))
    const nativeRows = await input.all<{ rowid: number, distance: number }>(
      input.database,
      `
      SELECT rowid, distance
      FROM ${tableName(dimensions)}
      WHERE embedding MATCH ?
        AND k = ?
        AND card_id = ?
        AND model_id = ?
        AND vector_space_id = ?
        ${source ? 'AND source = ?' : ''}
      ORDER BY distance
      `,
      [
        encodeVector(queryVector),
        nativeLimit,
        cardId,
        modelId,
        vectorSpaceId,
        ...(source ? [source] : []),
      ],
    )
    if (nativeRows.length === 0)
      return []
    const nativeRowIds = nativeRows.map(row => row.rowid)
    const mappings = await input.all<SqliteVecMappingRow>(
      input.database,
      `
      SELECT *
      FROM long_term_memory_sqlite_vec_rows
      WHERE native_rowid IN (${nativeRowIds.map(() => '?').join(', ')})
      `,
      nativeRowIds,
    )
    if (mappings.length === 0)
      return []
    const recordIds = [...new Set(mappings.map(mapping => mapping.record_id))]
    const canonicalRows = await input.all<SqliteVecCanonicalRow>(
      input.database,
      `
      SELECT *
      FROM long_term_memory_vectors
      WHERE id IN (${recordIds.map(() => '?').join(', ')})
        AND card_id = ?
        AND model_id = ?
        AND dimensions = ?
        AND vector_space_id = ?
        AND status = 'indexed'
      `,
      [...recordIds, cardId, modelId, dimensions, vectorSpaceId],
    )
    if (canonicalRows.length === 0)
      return []
    const canonicalById = new Map(canonicalRows.map(row => [row.id, row]))
    const candidates = mappings.flatMap((mapping) => {
      const canonical = canonicalById.get(mapping.record_id)
      if (!canonical
        || mapping.vector_space_id !== canonical.vector_space_id
        || mapping.canonical_text_hash !== canonical.text_hash) {
        return []
      }
      return [{ mapping, canonical }]
    })
    if (candidates.length === 0)
      return []
    const sourceIds = [...new Set(candidates.map(candidate => candidate.canonical.source_id))]
    const documents = await input.all<{
      source_id: string
      source: string
      text_hash: string
      tombstoned: number
    }>(
      input.database,
      `
      SELECT source_id, source, text_hash, tombstoned
      FROM long_term_memory_search_documents
      WHERE card_id = ?
        AND source_id IN (${sourceIds.map(() => '?').join(', ')})
        AND tombstoned = 0
      `,
      [cardId, ...sourceIds],
    )
    const activeDocuments = new Set(documents.map(document =>
      `${document.source}\u0000${document.source_id}\u0000${document.text_hash}`))
    const tombstones = await input.all<{ source_id: string, source: string }>(
      input.database,
      `
      SELECT source_id, source
      FROM long_term_memory_tombstones
      WHERE card_id = ?
        AND source_id IN (${sourceIds.map(() => '?').join(', ')})
      `,
      [cardId, ...sourceIds],
    )
    const tombstoned = new Set(tombstones.map(tombstone =>
      `${tombstone.source_id}\u0000${tombstone.source}`))
    const candidateByNativeRowId = new Map(candidates.map(candidate => [
      candidate.mapping.native_rowid,
      candidate.canonical,
    ]))
    const results: LongTermMemoryVectorSearchResult[] = []
    for (const nativeRow of nativeRows) {
      const row = candidateByNativeRowId.get(nativeRow.rowid)
      if (!row)
        continue
      if (!activeDocuments.has(`${row.source}\u0000${row.source_id}\u0000${row.text_hash}`))
        continue
      if (tombstoned.has(`${row.source_id}\u0000${row.source}`) || tombstoned.has(`${row.source_id}\u0000long_term_memory`))
        continue
      const score = 1 - Number(nativeRow.distance)
      if (score > 0) {
        results.push({
          record: mapCanonicalRow(row),
          score,
        })
      }
    }
    return results.slice(0, limit)
  }

  async function rebuild(rebuildInput: { cardId: string, modelId: string, dimensions: number, vectorSpaceId: string }) {
    if (!initialized)
      throw new Error(lastError ?? 'sqlite-vec backend is not initialized')
    const cardId = normalizeText(rebuildInput.cardId, 120)
    const modelId = normalizeText(rebuildInput.modelId, 160)
    const vectorSpaceId = normalizeText(rebuildInput.vectorSpaceId, 240)
    const dimensions = normalizeDimensions(rebuildInput.dimensions)
    if (!cardId || !modelId || !vectorSpaceId || !dimensions)
      throw new Error('sqlite-vec rebuild requires cardId, modelId, dimensions, and vectorSpaceId')
    const canonicalRows = await input.all<SqliteVecCanonicalRow>(
      input.database,
      `
      SELECT canonical.*
      FROM long_term_memory_vectors canonical
      JOIN long_term_memory_search_documents doc
        ON doc.card_id = canonical.card_id
        AND doc.source = canonical.source
        AND doc.source_id = canonical.source_id
        AND doc.text_hash = canonical.text_hash
        AND doc.tombstoned = 0
      WHERE canonical.card_id = ?
        AND canonical.model_id = ?
        AND canonical.dimensions = ?
        AND canonical.vector_space_id = ?
        AND canonical.status = 'indexed'
        AND NOT EXISTS (
          SELECT 1
          FROM long_term_memory_tombstones tomb
          WHERE tomb.card_id = canonical.card_id
            AND tomb.source_id = canonical.source_id
            AND (tomb.source = canonical.source OR tomb.source = 'long_term_memory')
        )
      ORDER BY canonical.updated_at ASC, canonical.id ASC
      `,
      [cardId, modelId, dimensions, vectorSpaceId],
    )
    await input.enqueueWrite(async () => {
      await ensureVectorTable(dimensions)
      const mappings = await input.all<SqliteVecMappingRow>(
        input.database,
        `
        SELECT *
        FROM long_term_memory_sqlite_vec_rows
        WHERE card_id = ? AND model_id = ? AND dimensions = ? AND vector_space_id = ?
        `,
        [cardId, modelId, dimensions, vectorSpaceId],
      )
      for (const mapping of mappings) {
        await input.run(
          input.database,
          `DELETE FROM ${tableName(dimensions)} WHERE rowid = ?`,
          [mapping.native_rowid],
        )
      }
      await input.run(
        input.database,
        'DELETE FROM long_term_memory_sqlite_vec_rows WHERE card_id = ? AND model_id = ? AND dimensions = ? AND vector_space_id = ?',
        [cardId, modelId, dimensions, vectorSpaceId],
      )
      await upsertPrepared(canonicalRows.map(mapCanonicalRow))
    })
    lastError = null
  }

  async function getHealth(healthInput: { cardId: string, modelId: string, dimensions: number, vectorSpaceId: string }) {
    if (!initialized) {
      return {
        ready: false,
        lastError: lastError ?? 'sqlite-vec backend is not initialized',
      }
    }
    const cardId = normalizeText(healthInput.cardId, 120)
    const modelId = normalizeText(healthInput.modelId, 160)
    const vectorSpaceId = normalizeText(healthInput.vectorSpaceId, 240)
    const dimensions = normalizeDimensions(healthInput.dimensions)
    if (!cardId || !modelId || !vectorSpaceId || !dimensions) {
      return {
        ready: false,
        lastError: 'sqlite-vec health requires cardId, modelId, dimensions, and vectorSpaceId',
      }
    }
    const table = await input.get<{ name: string }>(
      input.database,
      'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
      ['table', tableName(dimensions)],
    )
    const canonical = await input.get<{ count: number }>(
      input.database,
      `
      SELECT COUNT(*) AS count
      FROM long_term_memory_vectors canonical
      JOIN long_term_memory_search_documents doc
        ON doc.card_id = canonical.card_id
        AND doc.source = canonical.source
        AND doc.source_id = canonical.source_id
        AND doc.text_hash = canonical.text_hash
        AND doc.tombstoned = 0
      WHERE canonical.card_id = ?
        AND canonical.model_id = ?
        AND canonical.dimensions = ?
        AND canonical.vector_space_id = ?
        AND canonical.status = 'indexed'
        AND NOT EXISTS (
          SELECT 1
          FROM long_term_memory_tombstones tomb
          WHERE tomb.card_id = canonical.card_id
            AND tomb.source_id = canonical.source_id
            AND (tomb.source = canonical.source OR tomb.source = 'long_term_memory')
        )
      `,
      [cardId, modelId, dimensions, vectorSpaceId],
    )
    const canonicalCount = Number(canonical?.count ?? 0)
    if (!table) {
      return canonicalCount === 0
        ? { ready: true, lastError: null }
        : {
            ready: false,
            lastError: 'sqlite-vec index is not synchronized with canonical vectors',
          }
    }
    const native = await input.get<{ count: number }>(
      input.database,
      `
      SELECT COUNT(*) AS count
      FROM long_term_memory_sqlite_vec_rows mapping
      JOIN ${tableName(dimensions)} native ON native.rowid = mapping.native_rowid
      JOIN long_term_memory_vectors canonical ON canonical.id = mapping.record_id
      JOIN long_term_memory_search_documents doc
        ON doc.card_id = canonical.card_id
        AND doc.source = canonical.source
        AND doc.source_id = canonical.source_id
        AND doc.text_hash = canonical.text_hash
        AND doc.tombstoned = 0
      WHERE mapping.card_id = ?
        AND mapping.model_id = ?
        AND mapping.dimensions = ?
        AND mapping.vector_space_id = ?
        AND mapping.vector_space_id = canonical.vector_space_id
        AND mapping.canonical_text_hash = canonical.text_hash
        AND mapping.canonical_updated_at = canonical.updated_at
      `,
      [cardId, modelId, dimensions, vectorSpaceId],
    )
    const nativeCount = Number(native?.count ?? 0)
    const mapping = await input.get<{ count: number }>(
      input.database,
      `
      SELECT COUNT(*) AS count
      FROM long_term_memory_sqlite_vec_rows mapping
      WHERE mapping.card_id = ?
        AND mapping.model_id = ?
        AND mapping.dimensions = ?
        AND mapping.vector_space_id = ?
      `,
      [cardId, modelId, dimensions, vectorSpaceId],
    )
    const mappingCount = Number(mapping?.count ?? 0)
    const nativeTable = await input.get<{ count: number }>(
      input.database,
      `
      SELECT COUNT(*) AS count
      FROM ${tableName(dimensions)} native
      WHERE native.card_id = ?
        AND native.model_id = ?
        AND native.vector_space_id = ?
      `,
      [cardId, modelId, vectorSpaceId],
    )
    const nativeTableCount = Number(nativeTable?.count ?? 0)
    const synchronized = canonicalCount === nativeCount
      && canonicalCount === mappingCount
      && canonicalCount === nativeTableCount
    const ready = synchronized
    return {
      ready,
      lastError: ready ? null : 'sqlite-vec index is not synchronized with canonical vectors',
    }
  }

  return {
    mode: 'sqlite-vec',
    approximate: false,
    initialize,
    upsert,
    delete: deleteVectors,
    search,
    rebuild,
    getHealth,
  }
}
