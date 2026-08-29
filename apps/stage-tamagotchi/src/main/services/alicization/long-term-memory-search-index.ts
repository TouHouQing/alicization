import type sqlite3 from 'sqlite3'

import type {
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchKind,
  AlicizationMemoryWorkbenchSensitivity,
  AlicizationMemoryWorkbenchTombstoneListResult,
  AlicizationMemoryWorkbenchTrainingState,
  AlicizationMemoryWorkbenchVisibility,
} from '../../../shared/eventa'

import {
  hashLongTermMemoryEmbeddingText,
  normalizeLongTermMemoryEmbeddingText,
} from './long-term-memory-embedding-text'

export interface LongTermMemoryEmbeddingCorpusEntry {
  cardId: string
  documentId: string
  source: string
  sourceId: string
  text: string
  textHash: string
  updatedAt: number
}

export interface LongTermMemorySearchIndexRuntime {
  initializeSchema: () => Promise<void>
  rebuildLongTermMemorySearchIndex: (input: { cardId: string }) => Promise<{ indexed: number }>
  refreshLongTermMemorySearchIndex: (input: {
    cardId: string
    source: string
    sourceIds?: string[]
  }) => Promise<{ indexed: number }>
  listLongTermMemoryEmbeddingCorpus: (input: {
    cardId: string
    source?: string
    sourceIds?: string[]
    limit?: number | null
  }) => Promise<LongTermMemoryEmbeddingCorpusEntry[]>
  listLongTermMemorySearchItems: (input: {
    cardId: string
    kind?: AlicizationMemoryWorkbenchKind | 'all'
    query?: string
    sensitivity?: AlicizationMemoryWorkbenchSensitivity | 'all'
    visibility?: AlicizationMemoryWorkbenchVisibility | 'all'
    training?: AlicizationMemoryWorkbenchTrainingState | 'all'
    source?: string
    limit?: number
    cursor?: string | null
  }) => Promise<{ items: AlicizationMemoryWorkbenchItem[], nextCursor: string | null }>
  listLongTermMemoryTombstones: (input: {
    cardId: string
    limit?: number
    cursor?: string | null
  }) => Promise<AlicizationMemoryWorkbenchTombstoneListResult>
  getLongTermMemorySearchItem: (input: {
    cardId: string
    memoryItemId: string
    source?: string
    includeTombstoned?: boolean
  }) => Promise<AlicizationMemoryWorkbenchItem | null>
}

interface SearchDocument {
  id: string
  cardId: string
  source: string
  sourceId: string
  kind: AlicizationMemoryWorkbenchKind
  summary: string
  evidenceSnippets: string[]
  sourceIds: string[]
  confidence: number
  salience: number
  sensitivity: AlicizationMemoryWorkbenchSensitivity
  searchText: string
  embeddingText: string
  textHash: string
  createdAt: number
  updatedAt: number
  lastAccessedAt: number | null
}

interface SearchDocumentRow {
  id: string
  card_id: string
  source: string
  source_id: string
  kind: AlicizationMemoryWorkbenchKind
  summary: string
  evidence_snippets_json: string
  source_ids_json: string
  confidence: number
  salience: number
  sensitivity: AlicizationMemoryWorkbenchSensitivity
  search_text: string
  embedding_text: string
  text_hash: string
  created_at: number
  updated_at: number
  last_accessed_at: number | null
  tombstoned: number
  visibility: AlicizationMemoryWorkbenchVisibility
  training: AlicizationMemoryWorkbenchTrainingState
  rank?: number
}

interface DbMemoryFactRow {
  id: string
  card_id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: string
  created_at: number
  updated_at: number
  last_access_at: number | null
  validation_status: string | null
  memory_domain: string | null
  source_label: string | null
}

interface DbMemoryReflectionRow {
  id: string
  card_id: string
  source_kind: string
  target_scope: string
  summary: string
  lesson: string
  status: string
  confidence: number
  created_at: number
  updated_at: number
}

interface DbEpisodicEventRow {
  id: string
  card_id: string
  occurred_at: number
  where_summary: string | null
  with_whom_json: string | null
  thread_anchor: string | null
  what_happened: string
  felt: string | null
  emotion_tags_json: string | null
  what_changed: string | null
  relationship_meaning: string | null
  lesson: string | null
  source_summary: string | null
  confidence: number
  salience: number
  tags_json: string | null
  created_at: number
  updated_at: number
  last_recalled_at: number | null
}

interface DbMemoryConsolidationRow {
  card_id: string
  id: string
  kind: string
  facet: string | null
  period_ended_at: number
  summary: string
  lesson: string | null
  cues_json: string | null
  confidence: number
  updated_at: number
}

type SearchCursor
  = { version: 1, mode: 'recent', updatedAt: number, documentId: string, updatedAtUpperBound?: number }
    | { version: 1, mode: 'search', rank: number, updatedAt: number, documentId: string, updatedAtUpperBound?: number }
    | { version: 1, mode: 'tombstones', deletedAt: number, tombstoneId: string, deletedAtUpperBound?: number }

function normalizeText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function normalizeCardId(raw: unknown) {
  return normalizeText(raw, 120)
}

function normalizeSource(raw: unknown) {
  return normalizeText(raw, 120)
}

function clamp01(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function parseStringArray(raw: string | null | undefined) {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed))
      return []
    return parsed
      .map(item => normalizeText(item, 120))
      .filter(Boolean)
  }
  catch {
    return []
  }
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 10, maxChars = 120) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function documentId(input: { cardId: string, source: string, sourceId: string }) {
  return `ltm-doc:${input.cardId}:${input.source}:${input.sourceId}`
}

function buildSearchText(input: {
  summary: string
  evidenceSnippets: string[]
  source: string
  sourceId: string
  kind: string
}) {
  return normalizeText([
    input.summary,
    ...input.evidenceSnippets,
    input.source,
    input.sourceId,
    input.kind,
  ].filter(Boolean).join(' '), 2000)
}

function buildEmbeddingText(values: Array<string | null | undefined>) {
  return normalizeLongTermMemoryEmbeddingText(uniqueTexts(values, 24, 360).join(' '))
}

function mapFactDocument(row: DbMemoryFactRow): SearchDocument | null {
  const sourceId = normalizeText(row.id, 240)
  const cardId = normalizeCardId(row.card_id)
  if (!sourceId || !cardId)
    return null
  const summary = normalizeText(`${row.subject} ${row.predicate} ${row.object}`, 320)
  if (!summary)
    return null
  const evidenceSnippets = uniqueTexts([
    row.subject,
    row.predicate,
    row.object,
    row.memory_domain,
    row.source_label,
  ], 10, 120)
  const source = 'memory_facts'
  const kind: AlicizationMemoryWorkbenchKind = 'fact'
  const searchText = buildSearchText({ summary, evidenceSnippets, source, sourceId, kind })
  const embeddingText = buildEmbeddingText([
    row.subject,
    row.predicate,
    row.object,
    row.memory_domain,
    row.source_label,
  ])
  return {
    id: documentId({ cardId, source, sourceId }),
    cardId,
    source,
    sourceId,
    kind,
    summary,
    evidenceSnippets,
    sourceIds: [sourceId],
    confidence: clamp01(row.confidence),
    salience: row.validation_status === 'validated' ? 0.78 : 0.58,
    sensitivity: 'personal',
    searchText,
    embeddingText,
    textHash: hashLongTermMemoryEmbeddingText(embeddingText),
    createdAt: Math.max(0, Math.floor(Number(row.created_at) || 0)),
    updatedAt: Math.max(0, Math.floor(Number(row.updated_at) || 0)),
    lastAccessedAt: Number.isFinite(row.last_access_at) ? Math.max(0, Math.floor(Number(row.last_access_at))) : null,
  }
}

function mapReflectionDocument(row: DbMemoryReflectionRow): SearchDocument | null {
  const sourceId = normalizeText(row.id, 240)
  const cardId = normalizeCardId(row.card_id)
  if (!sourceId || !cardId)
    return null
  const summary = normalizeText(`${row.summary} ${row.lesson}`, 360)
  if (!summary)
    return null
  const evidenceSnippets = uniqueTexts([
    row.summary,
    row.lesson,
    row.target_scope,
    row.status,
  ], 10, 120)
  const source = 'memory_reflections'
  const kind: AlicizationMemoryWorkbenchKind = 'reflection'
  const searchText = buildSearchText({ summary, evidenceSnippets, source, sourceId, kind })
  const embeddingText = buildEmbeddingText([row.summary, row.lesson])
  return {
    id: documentId({ cardId, source, sourceId }),
    cardId,
    source,
    sourceId,
    kind,
    summary,
    evidenceSnippets,
    sourceIds: [sourceId],
    confidence: clamp01(row.confidence),
    salience: row.status === 'confirmed' ? 0.82 : 0.64,
    sensitivity: 'personal',
    searchText,
    embeddingText,
    textHash: hashLongTermMemoryEmbeddingText(embeddingText),
    createdAt: Math.max(0, Math.floor(Number(row.created_at) || 0)),
    updatedAt: Math.max(0, Math.floor(Number(row.updated_at) || 0)),
    lastAccessedAt: null,
  }
}

function mapEpisodeDocument(row: DbEpisodicEventRow): SearchDocument | null {
  const sourceId = normalizeText(row.id, 240)
  const cardId = normalizeCardId(row.card_id)
  if (!sourceId || !cardId)
    return null
  const tags = parseStringArray(row.tags_json)
  const emotionTags = parseStringArray(row.emotion_tags_json)
  const withWhom = parseStringArray(row.with_whom_json)
  const summary = normalizeText([
    row.thread_anchor,
    row.what_happened,
    row.what_changed,
    row.relationship_meaning,
    row.lesson,
  ].filter(Boolean).join(' '), 420)
  if (!summary)
    return null
  const evidenceSnippets = uniqueTexts([
    row.thread_anchor,
    row.what_happened,
    row.what_changed,
    row.relationship_meaning,
    row.lesson,
    ...tags,
    ...emotionTags,
    ...withWhom,
  ], 12, 120)
  const source = 'episodic_events'
  const kind: AlicizationMemoryWorkbenchKind = 'episode'
  const searchText = buildSearchText({ summary, evidenceSnippets, source, sourceId, kind })
  const embeddingText = buildEmbeddingText([
    row.thread_anchor,
    row.what_happened,
    row.felt,
    row.what_changed,
    row.relationship_meaning,
    row.lesson,
    row.source_summary,
    row.where_summary,
    ...withWhom,
    ...tags,
    ...emotionTags,
  ])
  return {
    id: documentId({ cardId, source, sourceId }),
    cardId,
    source,
    sourceId,
    kind,
    summary,
    evidenceSnippets,
    sourceIds: [sourceId],
    confidence: clamp01(row.confidence),
    salience: clamp01(row.salience),
    sensitivity: 'personal',
    searchText,
    embeddingText,
    textHash: hashLongTermMemoryEmbeddingText(embeddingText),
    createdAt: Math.max(0, Math.floor(Number(row.occurred_at) || 0)),
    updatedAt: Math.max(0, Math.floor(Number(row.updated_at) || 0)),
    lastAccessedAt: Number.isFinite(row.last_recalled_at) ? Math.max(0, Math.floor(Number(row.last_recalled_at))) : null,
  }
}

function mapConsolidationDocument(row: DbMemoryConsolidationRow): SearchDocument | null {
  const sourceId = normalizeText(row.id, 240)
  const cardId = normalizeCardId(row.card_id)
  if (!sourceId || !cardId)
    return null
  const cues = parseStringArray(row.cues_json)
  const summary = normalizeText([row.summary, row.lesson].filter(Boolean).join(' '), 420)
  if (!summary)
    return null
  const evidenceSnippets = uniqueTexts([
    row.kind,
    row.facet,
    row.summary,
    row.lesson,
    ...cues,
  ], 12, 120)
  const source = 'memory_consolidations'
  const kind: AlicizationMemoryWorkbenchKind = 'consolidation'
  const searchText = buildSearchText({ summary, evidenceSnippets, source, sourceId, kind })
  const embeddingText = buildEmbeddingText([
    row.summary,
    row.lesson,
    row.facet,
    ...cues,
  ])
  return {
    id: documentId({ cardId, source, sourceId }),
    cardId,
    source,
    sourceId,
    kind,
    summary,
    evidenceSnippets,
    sourceIds: [sourceId],
    confidence: clamp01(row.confidence),
    salience: row.kind === 'autobiographical' ? 0.78 : 0.66,
    sensitivity: 'personal',
    searchText,
    embeddingText,
    textHash: hashLongTermMemoryEmbeddingText(embeddingText),
    createdAt: Math.max(0, Math.floor(Number(row.period_ended_at) || 0)),
    updatedAt: Math.max(0, Math.floor(Number(row.updated_at) || 0)),
    lastAccessedAt: null,
  }
}

function safeLimit(limit: unknown, fallback = 50) {
  return Math.max(1, Math.min(100, Math.floor(Number(limit ?? fallback))))
}

function encodeCursor(cursor: SearchCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeCursor(raw: string | null | undefined): SearchCursor | null {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<SearchCursor>
    if (parsed.version !== 1)
      return null
    if (parsed.mode === 'tombstones' && Number.isFinite(parsed.deletedAt) && typeof parsed.tombstoneId === 'string' && parsed.tombstoneId.trim()) {
      return {
        version: 1,
        mode: 'tombstones',
        deletedAt: Number(parsed.deletedAt),
        tombstoneId: parsed.tombstoneId.trim(),
        ...(Number.isFinite(parsed.deletedAtUpperBound)
          ? { deletedAtUpperBound: Number(parsed.deletedAtUpperBound) }
          : {}),
      }
    }
    if (!('documentId' in parsed) || typeof parsed.documentId !== 'string' || !parsed.documentId.trim())
      return null
    if (parsed.mode === 'recent' && Number.isFinite(parsed.updatedAt)) {
      return {
        version: 1,
        mode: 'recent',
        updatedAt: Number(parsed.updatedAt),
        documentId: parsed.documentId.trim(),
        ...(Number.isFinite(parsed.updatedAtUpperBound)
          ? { updatedAtUpperBound: Number(parsed.updatedAtUpperBound) }
          : {}),
      }
    }
    if (parsed.mode === 'search' && Number.isFinite(parsed.rank) && Number.isFinite(parsed.updatedAt)) {
      return {
        version: 1,
        mode: 'search',
        rank: Number(parsed.rank),
        updatedAt: Number(parsed.updatedAt),
        documentId: parsed.documentId.trim(),
        ...(Number.isFinite(parsed.updatedAtUpperBound)
          ? { updatedAtUpperBound: Number(parsed.updatedAtUpperBound) }
          : {}),
      }
    }
  }
  catch {
    return null
  }
  return null
}

function buildFtsQuery(query: string) {
  const normalized = normalizeText(query, 240)
  if (!normalized)
    return ''
  return [...new Set(normalized
    .split(/\s+/)
    .map(term => term.trim())
    .filter(Boolean))]
    .map(term => `"${term.replace(/"/g, '""')}"`)
    .join(' OR ')
}

function buildLikeQuery(query: string) {
  return `%${normalizeText(query, 240).replace(/[\\%_]/g, match => `\\${match}`)}%`
}

function mapDocumentRow(row: SearchDocumentRow): AlicizationMemoryWorkbenchItem {
  return {
    id: row.source_id,
    kind: row.kind,
    summary: row.summary,
    evidenceSnippets: parseStringArray(row.evidence_snippets_json),
    sourceIds: parseStringArray(row.source_ids_json),
    confidence: clamp01(row.confidence),
    salience: clamp01(row.salience),
    sensitivity: row.sensitivity,
    visibility: row.visibility,
    training: row.training,
    source: row.source,
    createdAt: Math.max(0, Math.floor(Number(row.created_at) || 0)),
    updatedAt: Math.max(0, Math.floor(Number(row.updated_at) || 0)),
    lastAccessedAt: Number.isFinite(row.last_accessed_at) ? Math.max(0, Math.floor(Number(row.last_accessed_at))) : null,
    tombstoned: row.tombstoned === 1,
  }
}

export function createLongTermMemorySearchIndexRuntime(input: {
  database: sqlite3.Database
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
}): LongTermMemorySearchIndexRuntime {
  async function tableHasColumns(tableName: string, columnNames: string[]) {
    const row = await input.get<{ name: string }>(
      input.database,
      'SELECT name FROM sqlite_master WHERE type IN (?, ?) AND name = ?',
      ['table', 'virtual table', tableName],
    )
    if (!row)
      return false
    const columns = await input.all<{ name: string }>(input.database, `PRAGMA table_info(${tableName})`)
    const names = new Set(columns.map(column => column.name))
    return columnNames.every(columnName => names.has(columnName))
  }

  async function initializeSchema() {
    const hasCanonicalDocuments = await tableHasColumns('long_term_memory_search_documents', [
      'id',
      'card_id',
      'source',
      'source_id',
      'kind',
      'summary',
      'evidence_snippets_json',
      'source_ids_json',
      'confidence',
      'salience',
      'sensitivity',
      'search_text',
      'embedding_text',
      'text_hash',
      'created_at',
      'updated_at',
      'last_accessed_at',
      'tombstoned',
    ])
    if (!hasCanonicalDocuments) {
      await input.run(input.database, 'DROP TABLE IF EXISTS long_term_memory_search_documents_fts').catch(() => {})
      await input.run(input.database, 'DROP TABLE IF EXISTS long_term_memory_search_documents').catch(() => {})
    }

    await input.run(input.database, `
      CREATE TABLE IF NOT EXISTS long_term_memory_search_documents (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        summary TEXT NOT NULL,
        evidence_snippets_json TEXT NOT NULL,
        source_ids_json TEXT NOT NULL,
        confidence REAL NOT NULL,
        salience REAL NOT NULL,
        sensitivity TEXT NOT NULL,
        search_text TEXT NOT NULL,
        embedding_text TEXT NOT NULL,
        text_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_accessed_at INTEGER,
        tombstoned INTEGER NOT NULL DEFAULT 0,
        UNIQUE(card_id, source, source_id)
      )
    `)
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_ltm_search_docs_card_updated ON long_term_memory_search_documents(card_id, updated_at DESC, id ASC)')
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_ltm_search_docs_card_source ON long_term_memory_search_documents(card_id, source, source_id)')
    await input.run(input.database, 'CREATE INDEX IF NOT EXISTS idx_ltm_search_docs_card_kind ON long_term_memory_search_documents(card_id, kind, updated_at DESC)')
    await input.run(input.database, `CREATE VIRTUAL TABLE IF NOT EXISTS long_term_memory_search_documents_fts USING fts5(
      document_id UNINDEXED,
      card_id UNINDEXED,
      source UNINDEXED,
      source_id UNINDEXED,
      kind UNINDEXED,
      search_text,
      tokenize = 'trigram'
    )`)
  }

  async function loadProjectionDocuments(
    cardId: string,
    projection?: {
      source?: string
      sourceIds?: string[]
    },
  ) {
    const source = normalizeSource(projection?.source)
    const sourceIds = [...new Set(
      (projection?.sourceIds ?? [])
        .map(sourceId => normalizeText(sourceId, 240))
        .filter(Boolean),
    )]
    const sourceIdClause = sourceIds.length > 0
      ? ` AND id IN (${sourceIds.map(() => '?').join(', ')})`
      : ''
    const sourceParams = sourceIds.length > 0 ? sourceIds : []
    const [facts, reflections, episodes, consolidations] = await Promise.all([
      !source || source === 'memory_facts'
        ? input.all<DbMemoryFactRow>(
            input.database,
            `SELECT *
         FROM memory_facts
         WHERE card_id = ?
           AND COALESCE(validation_status, '') != 'superseded'
           ${sourceIdClause}`,
            [cardId, ...sourceParams],
          )
        : Promise.resolve([]),
      !source || source === 'memory_reflections'
        ? input.all<DbMemoryReflectionRow>(
            input.database,
            `SELECT *
         FROM memory_reflections
         WHERE card_id = ?
           AND status = 'confirmed'
           ${sourceIdClause}`,
            [cardId, ...sourceParams],
          )
        : Promise.resolve([]),
      !source || source === 'episodic_events'
        ? input.all<DbEpisodicEventRow>(
            input.database,
            `SELECT * FROM episodic_events WHERE card_id = ?${sourceIdClause}`,
            [cardId, ...sourceParams],
          )
        : Promise.resolve([]),
      !source || source === 'memory_consolidations'
        ? input.all<DbMemoryConsolidationRow>(
            input.database,
            `SELECT * FROM memory_consolidations WHERE card_id = ?${sourceIdClause}`,
            [cardId, ...sourceParams],
          )
        : Promise.resolve([]),
    ])
    return [
      ...facts.map(mapFactDocument),
      ...reflections.map(mapReflectionDocument),
      ...episodes.map(mapEpisodeDocument),
      ...consolidations.map(mapConsolidationDocument),
    ].filter((document): document is SearchDocument => Boolean(document))
  }

  async function upsertDocument(document: SearchDocument) {
    await input.run(
      input.database,
      `
      DELETE FROM long_term_memory_search_documents_fts
      WHERE card_id = ? AND source = ? AND source_id = ?
      `,
      [document.cardId, document.source, document.sourceId],
    )
    await input.run(
      input.database,
      `
      INSERT INTO long_term_memory_search_documents (
        id,
        card_id,
        source,
        source_id,
        kind,
        summary,
        evidence_snippets_json,
        source_ids_json,
        confidence,
        salience,
        sensitivity,
        search_text,
        embedding_text,
        text_hash,
        created_at,
        updated_at,
        last_accessed_at,
        tombstoned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(card_id, source, source_id)
      DO UPDATE SET
        kind = excluded.kind,
        summary = excluded.summary,
        evidence_snippets_json = excluded.evidence_snippets_json,
        source_ids_json = excluded.source_ids_json,
        confidence = excluded.confidence,
        salience = excluded.salience,
        sensitivity = excluded.sensitivity,
        search_text = excluded.search_text,
        embedding_text = excluded.embedding_text,
        text_hash = excluded.text_hash,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        last_accessed_at = excluded.last_accessed_at,
        tombstoned = 0
      `,
      [
        document.id,
        document.cardId,
        document.source,
        document.sourceId,
        document.kind,
        document.summary,
        JSON.stringify(document.evidenceSnippets),
        JSON.stringify(document.sourceIds),
        document.confidence,
        document.salience,
        document.sensitivity,
        document.searchText,
        document.embeddingText,
        document.textHash,
        document.createdAt,
        document.updatedAt,
        document.lastAccessedAt,
      ],
    )
    await input.run(
      input.database,
      `
      INSERT INTO long_term_memory_search_documents_fts (
        document_id,
        card_id,
        source,
        source_id,
        kind,
        search_text
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        document.id,
        document.cardId,
        document.source,
        document.sourceId,
        document.kind,
        document.searchText,
      ],
    )
  }

  async function rebuildLongTermMemorySearchIndex(rebuildInput: { cardId: string }) {
    const cardId = normalizeCardId(rebuildInput.cardId)
    if (!cardId)
      return { indexed: 0 }
    return await input.enqueueWrite(async () => {
      const indexed = await input.runInTransaction(input.database, async () => {
        const documents = await loadProjectionDocuments(cardId)
        await input.run(input.database, 'DELETE FROM long_term_memory_search_documents WHERE card_id = ?', [cardId])
        await input.run(input.database, 'DELETE FROM long_term_memory_search_documents_fts WHERE card_id = ?', [cardId])
        for (const document of documents)
          await upsertDocument(document)
        return documents.length
      })
      return { indexed }
    })
  }

  async function refreshLongTermMemorySearchIndex(refreshInput: {
    cardId: string
    source: string
    sourceIds?: string[]
  }) {
    const cardId = normalizeCardId(refreshInput.cardId)
    const source = normalizeSource(refreshInput.source)
    const sourceIds = [...new Set(
      (refreshInput.sourceIds ?? [])
        .map(sourceId => normalizeText(sourceId, 240))
        .filter(Boolean),
    )]
    if (!cardId || !source)
      return { indexed: 0 }
    return await input.enqueueWrite(async () => {
      const indexed = await input.runInTransaction(input.database, async () => {
        const documents = await loadProjectionDocuments(cardId, {
          source,
          sourceIds,
        })
        if (sourceIds.length > 0) {
          const placeholders = sourceIds.map(() => '?').join(', ')
          await input.run(
            input.database,
            `DELETE FROM long_term_memory_search_documents_fts
             WHERE card_id = ? AND source = ? AND source_id IN (${placeholders})`,
            [cardId, source, ...sourceIds],
          )
          await input.run(
            input.database,
            `DELETE FROM long_term_memory_search_documents
             WHERE card_id = ? AND source = ? AND source_id IN (${placeholders})`,
            [cardId, source, ...sourceIds],
          )
        }
        else {
          await input.run(
            input.database,
            'DELETE FROM long_term_memory_search_documents_fts WHERE card_id = ? AND source = ?',
            [cardId, source],
          )
          await input.run(
            input.database,
            'DELETE FROM long_term_memory_search_documents WHERE card_id = ? AND source = ?',
            [cardId, source],
          )
        }
        for (const document of documents)
          await upsertDocument(document)
        return documents.length
      })
      return { indexed }
    })
  }

  async function listLongTermMemoryEmbeddingCorpus(corpusInput: {
    cardId: string
    source?: string
    sourceIds?: string[]
    limit?: number | null
  }) {
    const cardId = normalizeCardId(corpusInput.cardId)
    if (!cardId)
      return []
    const source = normalizeSource(corpusInput.source)
    const sourceIds = [...new Set(
      (corpusInput.sourceIds ?? [])
        .map(sourceId => normalizeText(sourceId, 240))
        .filter(Boolean),
    )]
    const clauses = [
      'doc.card_id = ?',
      'doc.tombstoned = 0',
      'tomb.source_id IS NULL',
    ]
    const params: unknown[] = [cardId]
    if (source) {
      clauses.push('doc.source = ?')
      params.push(source)
    }
    if (sourceIds.length > 0) {
      clauses.push(`(doc.source_id IN (${sourceIds.map(() => '?').join(', ')}) OR doc.id IN (${sourceIds.map(() => '?').join(', ')}))`)
      params.push(...sourceIds, ...sourceIds)
    }
    const limit = Number.isFinite(corpusInput.limit)
      ? Math.max(1, Math.min(100_000, Math.floor(Number(corpusInput.limit))))
      : null
    if (limit)
      params.push(limit)
    const rows = await input.all<{
      card_id: string
      id: string
      source: string
      source_id: string
      embedding_text: string
      text_hash: string
      updated_at: number
    }>(
      input.database,
      `
      SELECT
        doc.card_id,
        doc.id,
        doc.source,
        doc.source_id,
        doc.embedding_text,
        doc.text_hash,
        doc.updated_at
      FROM long_term_memory_search_documents doc
      LEFT JOIN long_term_memory_tombstones tomb
        ON tomb.card_id = doc.card_id
        AND tomb.source_id = doc.source_id
        AND (tomb.source = doc.source OR tomb.source = 'long_term_memory')
      WHERE ${clauses.join(' AND ')}
      ORDER BY doc.updated_at DESC, doc.id ASC
      ${limit ? 'LIMIT ?' : ''}
      `,
      params,
    )
    return rows.map(row => ({
      cardId: row.card_id,
      documentId: row.id,
      source: row.source,
      sourceId: row.source_id,
      text: row.embedding_text,
      textHash: row.text_hash,
      updatedAt: row.updated_at,
    }))
  }

  function appendCommonFilters(
    clauses: string[],
    params: unknown[],
    listInput: {
      cardId: string
      kind?: AlicizationMemoryWorkbenchKind | 'all'
      sensitivity?: AlicizationMemoryWorkbenchSensitivity | 'all'
      visibility?: AlicizationMemoryWorkbenchVisibility | 'all'
      training?: AlicizationMemoryWorkbenchTrainingState | 'all'
      source?: string
    },
  ) {
    clauses.push('doc.card_id = ?')
    params.push(listInput.cardId)
    clauses.push('tomb.source_id IS NULL')
    clauses.push('doc.tombstoned = 0')
    if (listInput.kind && listInput.kind !== 'all') {
      clauses.push('doc.kind = ?')
      params.push(listInput.kind)
    }
    if (listInput.sensitivity && listInput.sensitivity !== 'all') {
      clauses.push('doc.sensitivity = ?')
      params.push(listInput.sensitivity)
    }
    if (listInput.source?.trim()) {
      clauses.push('doc.source = ?')
      params.push(normalizeSource(listInput.source))
    }
    if (listInput.visibility && listInput.visibility !== 'all') {
      clauses.push(`COALESCE(policy.visible_mode, CASE WHEN doc.sensitivity IN ('private', 'secret') THEN 'inward-only' ELSE 'explicit' END) = ?`)
      params.push(listInput.visibility)
    }
    if (listInput.training && listInput.training !== 'all') {
      clauses.push(`CASE WHEN COALESCE(policy.allow_training, 0) = 1 THEN 'allowed' ELSE 'blocked' END = ?`)
      params.push(listInput.training)
    }
  }

  function projectionSelectColumns(rankExpression?: string) {
    return `
      doc.*,
      COALESCE(policy.visible_mode, CASE WHEN doc.sensitivity IN ('private', 'secret') THEN 'inward-only' ELSE 'explicit' END) AS visibility,
      CASE WHEN COALESCE(policy.allow_training, 0) = 1 THEN 'allowed' ELSE 'blocked' END AS training
      ${rankExpression ? `, ${rankExpression} AS rank` : ''}
    `
  }

  function projectionJoins() {
    return `
      LEFT JOIN long_term_memory_policy_overrides policy
        ON policy.card_id = doc.card_id
        AND policy.source = doc.source
        AND policy.source_id = doc.source_id
      LEFT JOIN long_term_memory_tombstones tomb
        ON tomb.card_id = doc.card_id
        AND tomb.source_id = doc.source_id
        AND (tomb.source = doc.source OR tomb.source = 'long_term_memory')
    `
  }

  async function resolveUpdatedAtUpperBound(
    inputRaw: Parameters<LongTermMemorySearchIndexRuntime['listLongTermMemorySearchItems']>[0],
    mode: 'recent' | 'search' | 'short-search',
    query?: string,
  ) {
    const clauses: string[] = []
    const params: unknown[] = []
    appendCommonFilters(clauses, params, inputRaw)
    if (mode === 'search') {
      clauses.push('long_term_memory_search_documents_fts MATCH ?')
      params.push(buildFtsQuery(query ?? ''))
    }
    if (mode === 'short-search') {
      clauses.push('doc.search_text LIKE ? ESCAPE \'\\\'')
      params.push(buildLikeQuery(query ?? ''))
    }
    const searchJoin = mode === 'search'
      ? `
        JOIN long_term_memory_search_documents_fts
          ON long_term_memory_search_documents_fts.document_id = doc.id
      `
      : ''
    const row = await input.get<{ updated_at: number | null }>(
      input.database,
      `
      SELECT MAX(doc.updated_at) AS updated_at
      FROM long_term_memory_search_documents doc
      ${searchJoin}
      ${projectionJoins()}
      WHERE ${clauses.join(' AND ')}
      `,
      params,
    )
    return Number.isFinite(row?.updated_at) ? Number(row!.updated_at) : 0
  }

  async function listRecent(inputRaw: Parameters<LongTermMemorySearchIndexRuntime['listLongTermMemorySearchItems']>[0]) {
    const limit = safeLimit(inputRaw.limit)
    const cursor = decodeCursor(inputRaw.cursor)
    const updatedAtUpperBound = cursor?.mode === 'recent' && Number.isFinite(cursor.updatedAtUpperBound)
      ? cursor.updatedAtUpperBound
      : cursor?.mode === 'recent'
        ? null
        : await resolveUpdatedAtUpperBound(inputRaw, 'recent')
    const clauses: string[] = []
    const params: unknown[] = []
    appendCommonFilters(clauses, params, inputRaw)
    if (cursor?.mode === 'recent') {
      if (updatedAtUpperBound !== null) {
        clauses.push('doc.updated_at <= ?')
        params.push(updatedAtUpperBound)
      }
      clauses.push('(doc.updated_at < ? OR (doc.updated_at = ? AND doc.id > ?))')
      params.push(cursor.updatedAt, cursor.updatedAt, cursor.documentId)
    }
    else {
      clauses.push('doc.updated_at <= ?')
      params.push(updatedAtUpperBound)
    }
    params.push(limit + 1)
    const rows = await input.all<SearchDocumentRow>(
      input.database,
      `
      SELECT ${projectionSelectColumns()}
      FROM long_term_memory_search_documents doc
      ${projectionJoins()}
      WHERE ${clauses.join(' AND ')}
      ORDER BY doc.updated_at DESC, doc.id ASC
      LIMIT ?
      `,
      params,
    )
    const pageRows = rows.slice(0, limit)
    const next = rows.length > limit ? pageRows.at(-1) : null
    return {
      items: pageRows.map(mapDocumentRow),
      nextCursor: next
        ? encodeCursor({
            version: 1,
            mode: 'recent',
            updatedAt: next.updated_at,
            documentId: next.id,
            ...(updatedAtUpperBound !== null ? { updatedAtUpperBound } : {}),
          })
        : null,
    }
  }

  async function listSearch(inputRaw: Parameters<LongTermMemorySearchIndexRuntime['listLongTermMemorySearchItems']>[0], query: string) {
    const limit = safeLimit(inputRaw.limit)
    const cursor = decodeCursor(inputRaw.cursor)
    const updatedAtUpperBound = cursor?.mode === 'search' && Number.isFinite(cursor.updatedAtUpperBound)
      ? cursor.updatedAtUpperBound
      : cursor?.mode === 'search'
        ? null
        : await resolveUpdatedAtUpperBound(inputRaw, 'search', query)
    const clauses: string[] = []
    const params: unknown[] = []
    appendCommonFilters(clauses, params, inputRaw)
    clauses.push('long_term_memory_search_documents_fts MATCH ?')
    params.push(buildFtsQuery(query))
    const cursorClauses: string[] = []
    const cursorParams: unknown[] = []
    if (cursor?.mode === 'search') {
      if (updatedAtUpperBound !== null) {
        cursorClauses.push('updated_at <= ?')
        cursorParams.push(updatedAtUpperBound)
      }
      cursorClauses.push('(rank > ? OR (rank = ? AND updated_at < ?) OR (rank = ? AND updated_at = ? AND id > ?))')
      cursorParams.push(cursor.rank, cursor.rank, cursor.updatedAt, cursor.rank, cursor.updatedAt, cursor.documentId)
    }
    else {
      cursorClauses.push('updated_at <= ?')
      cursorParams.push(updatedAtUpperBound)
    }
    const rows = await input.all<SearchDocumentRow>(
      input.database,
      `
      WITH ranked AS (
        SELECT ${projectionSelectColumns('bm25(long_term_memory_search_documents_fts)')}
        FROM long_term_memory_search_documents doc
        JOIN long_term_memory_search_documents_fts
          ON long_term_memory_search_documents_fts.document_id = doc.id
        ${projectionJoins()}
        WHERE ${clauses.join(' AND ')}
      )
      SELECT *
      FROM ranked
      ${cursorClauses.length > 0 ? `WHERE ${cursorClauses.join(' AND ')}` : ''}
      ORDER BY rank ASC, updated_at DESC, id ASC
      LIMIT ?
      `,
      [...params, ...cursorParams, limit + 1],
    )
    const pageRows = rows.slice(0, limit)
    const next = rows.length > limit ? pageRows.at(-1) : null
    return {
      items: pageRows.map(mapDocumentRow),
      nextCursor: next
        ? encodeCursor({
            version: 1,
            mode: 'search',
            rank: Number(next.rank ?? 0),
            updatedAt: next.updated_at,
            documentId: next.id,
            ...(updatedAtUpperBound !== null ? { updatedAtUpperBound } : {}),
          })
        : null,
    }
  }

  async function listShortSearch(inputRaw: Parameters<LongTermMemorySearchIndexRuntime['listLongTermMemorySearchItems']>[0], query: string) {
    const limit = safeLimit(inputRaw.limit)
    const cursor = decodeCursor(inputRaw.cursor)
    const updatedAtUpperBound = cursor?.mode === 'recent' && Number.isFinite(cursor.updatedAtUpperBound)
      ? cursor.updatedAtUpperBound
      : cursor?.mode === 'recent'
        ? null
        : await resolveUpdatedAtUpperBound(inputRaw, 'short-search', query)
    const clauses: string[] = []
    const params: unknown[] = []
    appendCommonFilters(clauses, params, inputRaw)
    clauses.push('doc.search_text LIKE ? ESCAPE \'\\\'')
    params.push(buildLikeQuery(query))
    if (cursor?.mode === 'recent') {
      if (updatedAtUpperBound !== null) {
        clauses.push('doc.updated_at <= ?')
        params.push(updatedAtUpperBound)
      }
      clauses.push('(doc.updated_at < ? OR (doc.updated_at = ? AND doc.id > ?))')
      params.push(cursor.updatedAt, cursor.updatedAt, cursor.documentId)
    }
    else {
      clauses.push('doc.updated_at <= ?')
      params.push(updatedAtUpperBound)
    }
    params.push(limit + 1)
    const rows = await input.all<SearchDocumentRow>(
      input.database,
      `
      SELECT ${projectionSelectColumns()}
      FROM long_term_memory_search_documents doc
      ${projectionJoins()}
      WHERE ${clauses.join(' AND ')}
      ORDER BY doc.updated_at DESC, doc.id ASC
      LIMIT ?
      `,
      params,
    )
    const pageRows = rows.slice(0, limit)
    const next = rows.length > limit ? pageRows.at(-1) : null
    return {
      items: pageRows.map(mapDocumentRow),
      nextCursor: next
        ? encodeCursor({
            version: 1,
            mode: 'recent',
            updatedAt: next.updated_at,
            documentId: next.id,
            ...(updatedAtUpperBound !== null ? { updatedAtUpperBound } : {}),
          })
        : null,
    }
  }

  async function listLongTermMemorySearchItems(listInput: Parameters<LongTermMemorySearchIndexRuntime['listLongTermMemorySearchItems']>[0]) {
    const cardId = normalizeCardId(listInput.cardId)
    if (!cardId)
      return { items: [], nextCursor: null }
    const normalizedInput = {
      ...listInput,
      cardId,
    }
    const query = normalizeText(listInput.query, 240)
    if ([...query].length > 0 && [...query].length < 3)
      return await listShortSearch(normalizedInput, query)
    if (query)
      return await listSearch(normalizedInput, query)
    return await listRecent(normalizedInput)
  }

  async function listLongTermMemoryTombstones(
    listInput: Parameters<LongTermMemorySearchIndexRuntime['listLongTermMemoryTombstones']>[0],
  ): Promise<AlicizationMemoryWorkbenchTombstoneListResult> {
    const cardId = normalizeCardId(listInput.cardId)
    if (!cardId)
      return { items: [], nextCursor: null }
    const limit = safeLimit(listInput.limit)
    const cursor = decodeCursor(listInput.cursor)
    const deletedAtUpperBound = cursor?.mode === 'tombstones' && Number.isFinite(cursor.deletedAtUpperBound)
      ? cursor.deletedAtUpperBound
      : cursor?.mode === 'tombstones'
        ? null
        : await (async () => {
            const snapshot = await input.get<{ deleted_at: number | null }>(
              input.database,
              'SELECT MAX(created_at) AS deleted_at FROM long_term_memory_tombstones WHERE card_id = ?',
              [cardId],
            )
            return Number.isFinite(snapshot?.deleted_at) ? Number(snapshot!.deleted_at) : 0
          })()
    const clauses = ['tomb.card_id = ?']
    const params: unknown[] = [cardId]
    if (cursor?.mode === 'tombstones') {
      if (deletedAtUpperBound !== null) {
        clauses.push('tomb.created_at <= ?')
        params.push(deletedAtUpperBound)
      }
      clauses.push('(tomb.created_at < ? OR (tomb.created_at = ? AND tomb.id > ?))')
      params.push(cursor.deletedAt, cursor.deletedAt, cursor.tombstoneId)
    }
    else {
      clauses.push('tomb.created_at <= ?')
      params.push(deletedAtUpperBound)
    }
    params.push(limit + 1)
    const rows = await input.all<SearchDocumentRow & {
      tombstone_id: string
      tombstone_source_id: string
      tombstone_source: string
      tombstone_reason: string | null
      tombstone_created_at: number
    }>(
      input.database,
      `
      SELECT
        doc.*,
        COALESCE(policy.visible_mode, CASE WHEN doc.sensitivity IN ('private', 'secret') THEN 'inward-only' ELSE 'explicit' END) AS visibility,
        CASE WHEN COALESCE(policy.allow_training, 0) = 1 THEN 'allowed' ELSE 'blocked' END AS training,
        tomb.id AS tombstone_id,
        tomb.source_id AS tombstone_source_id,
        tomb.source AS tombstone_source,
        tomb.reason AS tombstone_reason,
        tomb.created_at AS tombstone_created_at
      FROM long_term_memory_tombstones tomb
      LEFT JOIN long_term_memory_search_documents doc
        ON doc.id = (
          SELECT candidate.id
          FROM long_term_memory_search_documents candidate
          WHERE candidate.card_id = tomb.card_id
            AND candidate.source_id = tomb.source_id
            AND (tomb.source = candidate.source OR tomb.source = 'long_term_memory')
          ORDER BY
            candidate.updated_at DESC,
            candidate.id ASC
          LIMIT 1
        )
      LEFT JOIN long_term_memory_policy_overrides policy
        ON policy.card_id = doc.card_id
        AND policy.source = doc.source
        AND policy.source_id = doc.source_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY tomb.created_at DESC, tomb.id ASC
      LIMIT ?
      `,
      params,
    )
    const pageRows = rows.slice(0, limit)
    const next = rows.length > limit ? pageRows.at(-1) : null
    return {
      items: pageRows.map(row => ({
        id: row.tombstone_id,
        sourceId: row.tombstone_source_id,
        source: row.tombstone_source,
        reason: normalizeText(row.tombstone_reason, 300) || null,
        deletedAt: Math.max(0, Math.floor(Number(row.tombstone_created_at) || 0)),
        memory: row.id
          ? {
              ...mapDocumentRow(row),
              tombstoned: true,
            }
          : null,
      })),
      nextCursor: next
        ? encodeCursor({
            version: 1,
            mode: 'tombstones',
            deletedAt: next.tombstone_created_at,
            tombstoneId: next.tombstone_id,
            ...(deletedAtUpperBound !== null ? { deletedAtUpperBound } : {}),
          })
        : null,
    }
  }

  async function getLongTermMemorySearchItem(inputItem: {
    cardId: string
    memoryItemId: string
    source?: string
    includeTombstoned?: boolean
  }) {
    const cardId = normalizeCardId(inputItem.cardId)
    const memoryItemId = normalizeText(inputItem.memoryItemId, 240)
    const source = normalizeSource(inputItem.source)
    if (!cardId || !memoryItemId)
      return null
    const sourceClause = source ? 'AND doc.source = ?' : ''
    const row = await input.get<SearchDocumentRow>(
      input.database,
      `
      SELECT ${projectionSelectColumns()}
      FROM long_term_memory_search_documents doc
      ${projectionJoins()}
      WHERE doc.card_id = ?
        ${inputItem.includeTombstoned ? '' : 'AND doc.tombstoned = 0 AND tomb.source_id IS NULL'}
        ${sourceClause}
        AND (doc.source_id = ? OR doc.id = ?)
      ORDER BY CASE WHEN tomb.source = doc.source THEN 0 ELSE 1 END
      LIMIT 1
      `,
      source
        ? [cardId, source, memoryItemId, memoryItemId]
        : [cardId, memoryItemId, memoryItemId],
    )
    return row ? mapDocumentRow(row) : null
  }

  return {
    initializeSchema,
    rebuildLongTermMemorySearchIndex,
    refreshLongTermMemorySearchIndex,
    listLongTermMemoryEmbeddingCorpus,
    listLongTermMemorySearchItems,
    listLongTermMemoryTombstones,
    getLongTermMemorySearchItem,
  }
}
