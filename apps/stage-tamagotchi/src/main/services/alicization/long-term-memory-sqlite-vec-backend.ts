import type sqlite3 from 'sqlite3'

import type {
  PersistentLongTermMemoryVectorRecord,
  PersistentLongTermMemoryVectorSearchFilters,
} from './long-term-memory-persistent-vector-store'
import type { LongTermMemoryVectorIndexNativeBackend } from './long-term-memory-vector-index-adapter'
import type { LongTermMemoryVectorSearchResult } from './long-term-memory-vector-store'

import { existsSync } from 'node:fs'

import { getLoadablePath } from 'sqlite-vec'

import { resolveLongTermMemoryVectorSpaceId } from './long-term-memory-embedding-provider'
import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'

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

function packagedExtensionPath(path: string) {
  if (!path.includes('app.asar'))
    return path
  const unpacked = path.replace('app.asar', 'app.asar.unpacked')
  return existsSync(unpacked) ? unpacked : path
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

  async function ensureVectorTable(dimensions: number) {
    await input.run(input.database, `
      CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName(dimensions)} USING vec0(
        embedding float[${dimensions}] distance_metric=cosine,
        card_id text,
        model_id text,
        vector_space_id text,
        source text
      )
    `)
  }

  async function initialize() {
    try {
      await loadExtension(input.database, packagedExtensionPath(getLoadablePath()))
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
    for (const record of records) {
      const dimensions = normalizeDimensions(record.dimensions)
      if (!dimensions)
        continue
      await ensureVectorTable(dimensions)
      const previous = await input.get<SqliteVecMappingRow>(
        input.database,
        'SELECT * FROM long_term_memory_sqlite_vec_rows WHERE record_id = ?',
        [record.id],
      )
      if (previous && previous.dimensions !== dimensions) {
        await input.run(
          input.database,
          `DELETE FROM ${tableName(previous.dimensions)} WHERE rowid = ?`,
          [previous.native_rowid],
        )
      }
      const now = input.now()
      await input.run(input.database, `
        INSERT INTO long_term_memory_sqlite_vec_rows (
          record_id, card_id, source_id, source, model_id, dimensions,
          vector_space_id, canonical_text_hash, canonical_updated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      `, [
        record.id,
        record.cardId,
        record.sourceId,
        record.source,
        record.modelId,
        dimensions,
        record.vectorSpaceId,
        record.textHash,
        record.updatedAt,
        now,
        now,
      ])
      const mapping = await input.get<SqliteVecMappingRow>(
        input.database,
        'SELECT * FROM long_term_memory_sqlite_vec_rows WHERE record_id = ?',
        [record.id],
      )
      if (!mapping)
        throw new Error(`sqlite-vec mapping was not created for vector: ${record.id}`)
      await input.run(input.database, `
        INSERT OR REPLACE INTO ${tableName(dimensions)} (
          rowid, embedding, card_id, model_id, vector_space_id, source
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        mapping.native_rowid,
        encodeVector(record.vector),
        record.cardId,
        record.modelId,
        record.vectorSpaceId,
        record.source,
      ])
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
          text: normalizeText(record.text, 1000),
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

  async function deleteVectors(deleteInput: { cardId: string, sourceIds: string[] }) {
    if (!initialized)
      throw new Error(lastError ?? 'sqlite-vec backend is not initialized')
    const cardId = normalizeText(deleteInput.cardId, 120)
    const sourceIds = [...new Set(deleteInput.sourceIds.map(id => normalizeText(id, 240)).filter(Boolean))]
    if (!cardId || sourceIds.length === 0)
      return 0
    return await input.enqueueWrite(async () => {
      const rows = await input.all<SqliteVecMappingRow>(
        input.database,
        `SELECT *
         FROM long_term_memory_sqlite_vec_rows
         WHERE card_id = ? AND source_id IN (${sourceIds.map(() => '?').join(', ')})`,
        [cardId, ...sourceIds],
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
        limit,
        cardId,
        modelId,
        vectorSpaceId,
        ...(source ? [source] : []),
      ],
    )
    if (nativeRows.length === 0)
      return []
    const canonicalRows = await input.all<SqliteVecCanonicalRow & { native_rowid: number }>(
      input.database,
      `
      SELECT canonical.*, mapping.native_rowid
      FROM long_term_memory_sqlite_vec_rows mapping
      JOIN long_term_memory_vectors canonical ON canonical.id = mapping.record_id
      JOIN long_term_memory_search_documents doc
        ON doc.card_id = canonical.card_id
        AND doc.source = canonical.source
        AND doc.source_id = canonical.source_id
        AND doc.text_hash = canonical.text_hash
        AND doc.tombstoned = 0
      WHERE mapping.native_rowid IN (${nativeRows.map(() => '?').join(', ')})
        AND canonical.card_id = ?
        AND canonical.model_id = ?
        AND canonical.dimensions = ?
        AND canonical.vector_space_id = ?
        AND mapping.vector_space_id = canonical.vector_space_id
        AND mapping.canonical_text_hash = canonical.text_hash
        AND canonical.status = 'indexed'
        AND NOT EXISTS (
          SELECT 1
          FROM long_term_memory_tombstones tomb
          WHERE tomb.card_id = canonical.card_id
            AND tomb.source_id = canonical.source_id
            AND (tomb.source = canonical.source OR tomb.source = 'long_term_memory')
        )
      `,
      [...nativeRows.map(row => row.rowid), cardId, modelId, dimensions, vectorSpaceId],
    )
    const canonicalByRowId = new Map(canonicalRows.map(row => [row.native_rowid, row]))
    const results: LongTermMemoryVectorSearchResult[] = []
    for (const nativeRow of nativeRows) {
      const row = canonicalByRowId.get(nativeRow.rowid)
      if (!row)
        continue
      const score = 1 - Number(nativeRow.distance)
      if (score > 0) {
        results.push({
          record: mapCanonicalRow(row),
          score,
        })
      }
    }
    return results
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
    const synchronized = canonicalCount === nativeCount
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
