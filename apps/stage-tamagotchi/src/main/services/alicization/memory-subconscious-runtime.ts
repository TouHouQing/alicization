import type sqlite3 from 'sqlite3'

import type {
  AlicizationActiveThought,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousFragmentSourceKind,
} from '../../../shared/eventa'

import { isRawDialogueTranscriptSubconsciousSource } from './dialogue-memory'

interface DbActiveThoughtRow {
  id: string
  text: string
  created_at: number
  updated_at: number
}

interface DbSubconsciousFragmentRow {
  id: string
  text: string
  source_kind: AlicizationSubconsciousFragmentSourceKind
  created_at: number
  last_recalled_at: number | null
  recall_count: number
}

interface CreateAlicizationMemorySubconsciousRuntimeOptions {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  normalizeOrganicMemoryText: (raw: unknown, maxChars: number) => string
  mapFragmentSourceKindToProvenance: (sourceKind: AlicizationSubconsciousFragmentSourceKind) => AlicizationSubconsciousFragment['provenance']
}

export function createAlicizationMemorySubconsciousRuntime(
  options: CreateAlicizationMemorySubconsciousRuntimeOptions,
) {
  function mapActiveThoughtRow(row: DbActiveThoughtRow): AlicizationActiveThought {
    return {
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  function mapSubconsciousFragmentRow(row: DbSubconsciousFragmentRow): AlicizationSubconsciousFragment {
    return {
      id: row.id,
      text: row.text,
      sourceKind: row.source_kind,
      createdAt: row.created_at,
      lastRecalledAt: typeof row.last_recalled_at === 'number' ? row.last_recalled_at : null,
      recallCount: Math.max(0, Math.floor(row.recall_count)),
      provenance: options.mapFragmentSourceKindToProvenance(row.source_kind),
    }
  }

  async function listActiveThoughts() {
    const rows = await options.all<DbActiveThoughtRow>(
      options.database,
      `
      SELECT
        id,
        text,
        created_at,
        updated_at
      FROM active_thoughts
      ORDER BY updated_at DESC, created_at DESC
      `,
    )
    return rows.map(mapActiveThoughtRow)
  }

  async function replaceActiveThoughts(thoughts: Array<{ text: string }>) {
    const normalized = thoughts
      .map(item => options.normalizeOrganicMemoryText(item.text, 120))
      .filter(Boolean)
      .filter((item, index, current) => current.findIndex(candidate => candidate.toLowerCase() === item.toLowerCase()) === index)
      .slice(0, 5)
    const currentTs = options.now()

    await options.enqueueWrite(async () => {
      await options.runInTransaction(options.database, async () => {
        await options.run(options.database, 'DELETE FROM active_thoughts')
        for (const text of normalized) {
          await options.run(
            options.database,
            `
            INSERT INTO active_thoughts (
              id,
              text,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?)
            `,
            [options.randomUUID(), text, currentTs, currentTs],
          )
        }
      })
    })

    return await listActiveThoughts()
  }

  async function appendSubconsciousFragments(fragments: Array<{ text: string, sourceKind: AlicizationSubconsciousFragmentSourceKind }>) {
    const normalized = fragments
      .filter(item => !isRawDialogueTranscriptSubconsciousSource(item.sourceKind))
      .map(item => ({
        sourceKind: item.sourceKind,
        text: options.normalizeOrganicMemoryText(item.text, 160),
      }))
      .filter(item => item.text)
      .filter((item, index, current) => current.findIndex(candidate => candidate.sourceKind === item.sourceKind && candidate.text.toLowerCase() === item.text.toLowerCase()) === index)

    if (normalized.length === 0)
      return []

    const inserted: AlicizationSubconsciousFragment[] = []
    const currentTs = options.now()
    await options.enqueueWrite(async () => {
      await options.runInTransaction(options.database, async () => {
        for (const item of normalized) {
          const existing = await options.get<{ id?: string }>(
            options.database,
            `
            SELECT id
            FROM subconscious_fragments
            WHERE source_kind = ?
              AND lower(text) = lower(?)
            LIMIT 1
            `,
            [item.sourceKind, item.text],
          )
          if (existing?.id)
            continue

          const id = options.randomUUID()
          await options.run(
            options.database,
            `
            INSERT INTO subconscious_fragments (
              id,
              text,
              source_kind,
              created_at,
              last_recalled_at,
              recall_count
            ) VALUES (?, ?, ?, ?, NULL, 0)
            `,
            [id, item.text, item.sourceKind, currentTs],
          )
          await options.run(
            options.database,
            `
            INSERT INTO subconscious_fragments_fts (
              fragment_id,
              text
            ) VALUES (?, ?)
            `,
            [id, item.text],
          )
          inserted.push({
            id,
            text: item.text,
            sourceKind: item.sourceKind,
            createdAt: currentTs,
            lastRecalledAt: null,
            recallCount: 0,
            provenance: options.mapFragmentSourceKindToProvenance(item.sourceKind),
          })
        }
      })
    })

    return inserted
  }

  async function searchSubconsciousFragments(query: string, limit = 6) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery)
      return []

    const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)))
    const rows = await options.all<DbSubconsciousFragmentRow>(
      options.database,
      `
      SELECT
        sf.id,
        sf.text,
        sf.source_kind,
        sf.created_at,
        sf.last_recalled_at,
        sf.recall_count
      FROM subconscious_fragments_fts
      JOIN subconscious_fragments sf
        ON sf.id = subconscious_fragments_fts.fragment_id
      WHERE subconscious_fragments_fts MATCH ?
        AND sf.source_kind <> 'dialogue-turn'
      ORDER BY bm25(subconscious_fragments_fts), sf.created_at DESC
      LIMIT ?
      `,
      [normalizedQuery, safeLimit],
    )
    const mapped = rows.map(mapSubconsciousFragmentRow)
    if (mapped.length === 0)
      return mapped

    const recalledAt = options.now()
    await options.enqueueWrite(async () => {
      await options.runInTransaction(options.database, async () => {
        for (const fragment of mapped) {
          await options.run(
            options.database,
            `
            UPDATE subconscious_fragments
            SET last_recalled_at = ?,
                recall_count = recall_count + 1
            WHERE id = ?
            `,
            [recalledAt, fragment.id],
          )
        }
      })
    })

    return mapped.map(fragment => ({
      ...fragment,
      lastRecalledAt: recalledAt,
      recallCount: fragment.recallCount + 1,
    }))
  }

  async function listRecentSubconsciousFragments(limit = 8) {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))
    const rows = await options.all<DbSubconsciousFragmentRow>(
      options.database,
      `
      SELECT
        id,
        text,
        source_kind,
        created_at,
        last_recalled_at,
        recall_count
      FROM subconscious_fragments
      WHERE source_kind <> 'dialogue-turn'
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [safeLimit],
    )
    return rows.map(mapSubconsciousFragmentRow)
  }

  async function countSubconsciousFragments() {
    const row = await options.get<{ total: number }>(
      options.database,
      `
      SELECT COUNT(1) AS total
      FROM subconscious_fragments
      `,
    )
    return row?.total ?? 0
  }

  return {
    listActiveThoughts,
    replaceActiveThoughts,
    appendSubconsciousFragments,
    searchSubconsciousFragments,
    listRecentSubconsciousFragments,
    countSubconsciousFragments,
  }
}

export type AlicizationMemorySubconsciousRuntime = ReturnType<typeof createAlicizationMemorySubconsciousRuntime>
