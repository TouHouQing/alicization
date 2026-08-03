import type sqlite3 from 'sqlite3'

import type { AlicizationEpisodicEventRecord } from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'

interface MemoryConsolidationRowLike {
  card_id: string
  id: string
  kind: AlicizationMemoryConsolidationRecord['kind']
  facet: AlicizationMemoryConsolidationRecord['facet']
  period_key: string
  period_started_at: number
  period_ended_at: number
  summary: string
  lesson: string | null
  cues_json: string | null
  confidence: number
  dominant_provenance: AlicizationMemoryConsolidationRecord['dominantProvenance']
  derived_event_ids_json: string | null
  metadata_json: string | null
  updated_at: number
}

interface MemoryConsolidationSearchInputLike {
  cardId?: string
  query: string
  limit?: number
  recollectionIntent?: {
    mode: 'none' | 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
    temporalFocus: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
    searchEpisodes: boolean
    searchConversations: boolean
    searchProceduralExperience: boolean
    queryHints: string[]
    rationale: string
    confidence: number
    recollectionAgenda?: {
      whyRecallNow: string
      goalSimilarity: number
      relationshipNeed: number
      affectivePull: number
      sceneFamiliarity: number
      candidateTimeScopes: Array<{
        scope: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
        weight: number
        rationale?: string | null
      }>
      candidateEraFacets: Array<{
        facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | 'window'
        weight: number
        rationale?: string | null
      }>
      candidateProcedureLines: string[]
      uncertaintyTolerance: 'low' | 'medium' | 'high'
    } | null
  } | null
}

interface CreateAlicizationMemoryConsolidationRuntimeOptions {
  database: sqlite3.Database
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  mapRow: (row: MemoryConsolidationRowLike) => AlicizationMemoryConsolidationRecord
  buildRecords: (input: {
    events: AlicizationEpisodicEventRecord[]
    now: number
  }) => AlicizationMemoryConsolidationRecord[]
  searchRecords: (input: {
    query: string
    records: AlicizationMemoryConsolidationRecord[]
    limit?: number
    recollectionIntent?: MemoryConsolidationSearchInputLike['recollectionIntent']
  }) => AlicizationMemoryConsolidationRecord[]
}

export function createAlicizationMemoryConsolidationRuntime(
  input: CreateAlicizationMemoryConsolidationRuntimeOptions,
) {
  const listMemoryConsolidations = async (listInput: { cardId?: string, limit?: number }) => {
    const cardId = listInput.cardId?.trim() || ''
    const safeLimit = Math.max(1, Math.min(100, Math.floor(listInput.limit ?? 16)))
    const whereClause = cardId ? 'WHERE card_id = ?' : ''
    const rows = await input.all<MemoryConsolidationRowLike>(
      input.database,
      `
      SELECT *
      FROM memory_consolidations
      ${whereClause}
      ORDER BY period_ended_at DESC, updated_at DESC
      LIMIT ?
      `,
      cardId ? [cardId, safeLimit] : [safeLimit],
    )
    return rows.map(input.mapRow)
  }

  const rebuildMemoryConsolidationsFromEvents = async (rebuildInput: {
    cardId: string
    events: AlicizationEpisodicEventRecord[]
    now: number
  }) => {
    const cardId = rebuildInput.cardId.trim()
    if (!cardId)
      return []
    const records = input.buildRecords({
      events: rebuildInput.events,
      now: rebuildInput.now,
    })

    await input.run(input.database, 'DELETE FROM memory_consolidations WHERE card_id = ?', [cardId])
    for (const record of records) {
      await input.run(
        input.database,
        `
        INSERT INTO memory_consolidations (
          card_id,
          id,
          kind,
          facet,
          period_key,
          period_started_at,
          period_ended_at,
          summary,
          lesson,
          cues_json,
          confidence,
          dominant_provenance,
          derived_event_ids_json,
          metadata_json,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          cardId,
          record.id,
          record.kind,
          record.facet === 'phase' || record.facet === 'relationship-era' || record.facet === 'task-era' || record.facet === 'self-era'
            ? record.facet
            : null,
          record.periodKey,
          record.periodStartedAt,
          record.periodEndedAt,
          record.summary,
          record.lesson,
          JSON.stringify(record.cues),
          record.confidence,
          record.dominantProvenance,
          JSON.stringify(record.derivedEventIds),
          record.metadata && typeof record.metadata === 'object'
            ? JSON.stringify(record.metadata)
            : null,
          record.updatedAt,
        ],
      )
    }

    return records
  }

  const searchMemoryConsolidations = async (searchInput: MemoryConsolidationSearchInputLike) => {
    const records = await listMemoryConsolidations({
      cardId: searchInput.cardId,
      limit: 48,
    })
    return input.searchRecords({
      query: searchInput.query,
      records,
      limit: searchInput.limit,
      recollectionIntent: searchInput.recollectionIntent ?? null,
    })
  }

  return {
    listMemoryConsolidations,
    rebuildMemoryConsolidationsFromEvents,
    searchMemoryConsolidations,
  }
}
