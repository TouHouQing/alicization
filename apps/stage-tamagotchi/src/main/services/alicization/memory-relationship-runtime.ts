import type sqlite3 from 'sqlite3'

import type {
  AlicizationMemoryReflectionInput,
  AlicizationMemoryReflectionRecord,
  AlicizationMemoryReflectionStatus,
  AlicizationPersonaReinforcementEventInput,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationRelationshipOutcomeInput,
  AlicizationRelationshipOutcomeRecord,
} from '../../../shared/eventa'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'

interface DbMemoryReflectionRow {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: string
  target_scope: string
  summary: string
  lesson: string
  status: AlicizationMemoryReflectionStatus
  confidence: number
  supporting_fact_ids_json: string | null
  supporting_outcome_ids_json: string | null
  created_at: number
  updated_at: number
  confirmed_at: number | null
  denied_at: number | null
}

interface DbRelationshipOutcomeRow {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: string
  action_summary: string
  closeness_delta: number
  trust_delta: number
  burden_delta: number
  boundary_delta: number
  misread_delta: number
  repair_delta: number
  open_loop_delta: number
  summary: string
  created_at: number
}

interface DbPersonaReinforcementEventRow {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  source_kind: string
  dimension: string
  delta: number
  valence: string
  summary: string
  created_at: number
}

interface DbRelationshipDynamicsRow {
  host_attitude: string
  previous_host_attitude: string | null
  obedience_delta: number
  liveliness_delta: number
  sensibility_delta: number
  source: string
  created_at: number
}

interface CreateAlicizationMemoryRelationshipRuntimeOptions {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  clamp01: (value: number) => number
  clampRelationshipDelta: (value: number, maxAbs?: number) => number
  parseJsonStringArray: (raw: string | null) => string[]
  normalizeOrganicMemoryText: (raw: unknown, maxChars: number) => string
}

interface RelationshipListCursor {
  sortValue: number
  id: string
}

function encodeRelationshipListCursor(cursor: RelationshipListCursor) {
  return encodeURIComponent(JSON.stringify(cursor))
}

function decodeRelationshipListCursor(raw: string | null | undefined): RelationshipListCursor | null {
  if (!raw?.trim())
    return null

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<RelationshipListCursor>
    if (
      typeof parsed.sortValue !== 'number'
      || !Number.isFinite(parsed.sortValue)
      || typeof parsed.id !== 'string'
      || !parsed.id
    ) {
      return null
    }
    return {
      sortValue: parsed.sortValue,
      id: parsed.id,
    }
  }
  catch {
    return null
  }
}

export function createAlicizationMemoryRelationshipRuntime(
  options: CreateAlicizationMemoryRelationshipRuntimeOptions,
) {
  function mapMemoryReflectionRow(row: DbMemoryReflectionRow): AlicizationMemoryReflectionRecord {
    return {
      id: row.id,
      cardId: row.card_id,
      decisionTraceId: row.decision_trace_id,
      turnId: row.turn_id,
      sessionId: row.session_id,
      sourceKind: row.source_kind as AlicizationMemoryReflectionRecord['sourceKind'],
      targetScope: row.target_scope as AlicizationMemoryReflectionRecord['targetScope'],
      summary: row.summary,
      lesson: row.lesson,
      status: row.status,
      confidence: options.clamp01(row.confidence),
      supportingFactIds: options.parseJsonStringArray(row.supporting_fact_ids_json),
      supportingOutcomeIds: options.parseJsonStringArray(row.supporting_outcome_ids_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      confirmedAt: row.confirmed_at,
      deniedAt: row.denied_at,
    }
  }

  function mapRelationshipOutcomeRow(row: DbRelationshipOutcomeRow): AlicizationRelationshipOutcomeRecord {
    return {
      id: row.id,
      cardId: row.card_id,
      decisionTraceId: row.decision_trace_id,
      turnId: row.turn_id,
      sessionId: row.session_id,
      sourceKind: row.source_kind as AlicizationRelationshipOutcomeRecord['sourceKind'],
      actionSummary: row.action_summary,
      closenessDelta: options.clampRelationshipDelta(row.closeness_delta, 0.2),
      trustDelta: options.clampRelationshipDelta(row.trust_delta, 0.2),
      burdenDelta: options.clampRelationshipDelta(row.burden_delta, 0.2),
      boundaryDelta: options.clampRelationshipDelta(row.boundary_delta, 0.2),
      misreadDelta: options.clampRelationshipDelta(row.misread_delta, 0.2),
      repairDelta: options.clampRelationshipDelta(row.repair_delta, 0.2),
      openLoopDelta: options.clampRelationshipDelta(row.open_loop_delta, 0.2),
      summary: row.summary,
      createdAt: row.created_at,
    }
  }

  function mapPersonaReinforcementEventRow(row: DbPersonaReinforcementEventRow): AlicizationPersonaReinforcementEventRecord {
    return {
      id: row.id,
      cardId: row.card_id,
      decisionTraceId: row.decision_trace_id,
      turnId: row.turn_id,
      sessionId: row.session_id,
      sourceKind: row.source_kind as AlicizationPersonaReinforcementEventRecord['sourceKind'],
      dimension: row.dimension as AlicizationPersonaReinforcementEventRecord['dimension'],
      delta: options.clampRelationshipDelta(row.delta, 0.4),
      valence: row.valence as AlicizationPersonaReinforcementEventRecord['valence'],
      summary: row.summary,
      createdAt: row.created_at,
    }
  }

  function mapRelationshipDynamicsRow(row: DbRelationshipDynamicsRow): AlicizationRelationshipDynamicsState {
    return {
      hostAttitude: options.normalizeOrganicMemoryText(row.host_attitude, 120),
      previousHostAttitude: options.normalizeOrganicMemoryText(row.previous_host_attitude, 120) || null,
      obedienceDelta: options.clampRelationshipDelta(row.obedience_delta),
      livelinessDelta: options.clampRelationshipDelta(row.liveliness_delta),
      sensibilityDelta: options.clampRelationshipDelta(row.sensibility_delta),
      source: options.normalizeOrganicMemoryText(row.source, 64) || 'unknown',
      createdAt: Number.isFinite(row.created_at) ? Math.max(0, Math.floor(row.created_at)) : 0,
    }
  }

  async function upsertMemoryReflections(entries: AlicizationMemoryReflectionInput[]) {
    if (entries.length === 0)
      return []

    const prepared = entries
      .map((entry) => {
        const cardId = entry.cardId.trim()
        const summary = entry.summary.trim()
        const lesson = entry.lesson.trim()
        if (!cardId || !summary || !lesson)
          return null
        const createdAt = Number.isFinite(entry.createdAt) ? Math.max(0, Math.floor(entry.createdAt!)) : options.now()
        const updatedAt = Number.isFinite(entry.updatedAt) ? Math.max(0, Math.floor(entry.updatedAt!)) : createdAt
        return {
          id: entry.id?.trim() || options.randomUUID(),
          cardId,
          decisionTraceId: entry.decisionTraceId?.trim() || null,
          turnId: entry.turnId?.trim() || null,
          sessionId: entry.sessionId?.trim() || null,
          sourceKind: entry.sourceKind,
          targetScope: entry.targetScope,
          summary,
          lesson,
          status: entry.status ?? 'pending',
          confidence: options.clamp01(entry.confidence),
          supportingFactIdsJson: JSON.stringify((entry.supportingFactIds ?? []).filter(Boolean)),
          supportingOutcomeIdsJson: JSON.stringify((entry.supportingOutcomeIds ?? []).filter(Boolean)),
          createdAt,
          updatedAt,
          confirmedAt: Number.isFinite(entry.confirmedAt) ? Math.max(0, Math.floor(entry.confirmedAt!)) : null,
          deniedAt: Number.isFinite(entry.deniedAt) ? Math.max(0, Math.floor(entry.deniedAt!)) : null,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

    if (prepared.length === 0)
      return []

    await options.enqueueWrite(async () => {
      await options.runInTransaction(options.database, async () => {
        for (const entry of prepared) {
          await options.run(
            options.database,
            `
            INSERT INTO memory_reflections (
              id,
              card_id,
              decision_trace_id,
              turn_id,
              session_id,
              source_kind,
              target_scope,
              summary,
              lesson,
              status,
              confidence,
              supporting_fact_ids_json,
              supporting_outcome_ids_json,
              created_at,
              updated_at,
              confirmed_at,
              denied_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id)
            DO UPDATE SET
              decision_trace_id = excluded.decision_trace_id,
              turn_id = excluded.turn_id,
              session_id = excluded.session_id,
              source_kind = excluded.source_kind,
              target_scope = excluded.target_scope,
              summary = excluded.summary,
              lesson = excluded.lesson,
              status = excluded.status,
              confidence = excluded.confidence,
              supporting_fact_ids_json = excluded.supporting_fact_ids_json,
              supporting_outcome_ids_json = excluded.supporting_outcome_ids_json,
              updated_at = excluded.updated_at,
              confirmed_at = excluded.confirmed_at,
              denied_at = excluded.denied_at
            `,
            [
              entry.id,
              entry.cardId,
              entry.decisionTraceId,
              entry.turnId,
              entry.sessionId,
              entry.sourceKind,
              entry.targetScope,
              entry.summary,
              entry.lesson,
              entry.status,
              entry.confidence,
              entry.supportingFactIdsJson,
              entry.supportingOutcomeIdsJson,
              entry.createdAt,
              entry.updatedAt,
              entry.confirmedAt,
              entry.deniedAt,
            ],
          )
        }
      })
    })

    return prepared.map(entry => mapMemoryReflectionRow({
      id: entry.id,
      card_id: entry.cardId,
      decision_trace_id: entry.decisionTraceId,
      turn_id: entry.turnId,
      session_id: entry.sessionId,
      source_kind: entry.sourceKind,
      target_scope: entry.targetScope,
      summary: entry.summary,
      lesson: entry.lesson,
      status: entry.status,
      confidence: entry.confidence,
      supporting_fact_ids_json: entry.supportingFactIdsJson,
      supporting_outcome_ids_json: entry.supportingOutcomeIdsJson,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      confirmed_at: entry.confirmedAt,
      denied_at: entry.deniedAt,
    }))
  }

  async function listMemoryReflectionsPage(input: {
    cardId: string
    limit?: number
    query?: string
    turnId?: string
    status?: AlicizationMemoryReflectionStatus
    cursor?: string | null
  }) {
    const cardId = input.cardId.trim()
    if (!cardId) {
      return {
        items: [],
        nextCursor: null,
      }
    }

    const params: unknown[] = [cardId]
    const where = ['card_id = ?']
    if (input.turnId?.trim()) {
      where.push('turn_id = ?')
      params.push(input.turnId.trim())
    }
    if (input.status) {
      where.push('status = ?')
      params.push(input.status)
    }
    const query = typeof input.query === 'string'
      ? input.query.trim().replace(/\s+/g, ' ').slice(0, 240).toLowerCase()
      : ''
    if (query) {
      const queryLike = `%${query}%`
      where.push('(lower(summary) LIKE ? OR lower(lesson) LIKE ? OR lower(target_scope) LIKE ? OR lower(source_kind) LIKE ? OR id = ?)')
      params.push(queryLike, queryLike, queryLike, queryLike, query)
    }
    const cursor = decodeRelationshipListCursor(input.cursor)
    if (cursor) {
      where.push('(updated_at < ? OR (updated_at = ? AND id > ?))')
      params.push(cursor.sortValue, cursor.sortValue, cursor.id)
    }
    const limit = Math.max(1, Math.floor(input.limit ?? 8))
    params.push(limit + 1)

    const rows = await options.all<DbMemoryReflectionRow>(
      options.database,
      `SELECT * FROM memory_reflections WHERE ${where.join(' AND ')} ORDER BY updated_at DESC, id ASC LIMIT ?`,
      params,
    )

    const pageRows = rows.slice(0, limit)
    const lastRow = pageRows.at(-1)
    return {
      items: pageRows.map(mapMemoryReflectionRow),
      nextCursor: rows.length > limit && lastRow
        ? encodeRelationshipListCursor({
            sortValue: lastRow.updated_at,
            id: lastRow.id,
          })
        : null,
    }
  }

  async function listMemoryReflections(input: {
    cardId: string
    limit?: number
    query?: string
    turnId?: string
    status?: AlicizationMemoryReflectionStatus
  }) {
    return (await listMemoryReflectionsPage(input)).items
  }

  async function appendRelationshipOutcomes(entries: AlicizationRelationshipOutcomeInput[]) {
    if (entries.length === 0)
      return []

    const prepared = entries
      .map((entry) => {
        const cardId = entry.cardId.trim()
        const actionSummary = entry.actionSummary.trim()
        const summary = entry.summary.trim()
        if (!cardId || !actionSummary || !summary)
          return null
        const createdAt = Number.isFinite(entry.createdAt) ? Math.max(0, Math.floor(entry.createdAt!)) : options.now()
        return {
          id: entry.id?.trim() || options.randomUUID(),
          cardId,
          decisionTraceId: entry.decisionTraceId?.trim() || null,
          turnId: entry.turnId?.trim() || null,
          sessionId: entry.sessionId?.trim() || null,
          sourceKind: entry.sourceKind,
          actionSummary,
          closenessDelta: options.clampRelationshipDelta(entry.closenessDelta, 0.2),
          trustDelta: options.clampRelationshipDelta(entry.trustDelta, 0.2),
          burdenDelta: options.clampRelationshipDelta(entry.burdenDelta, 0.2),
          boundaryDelta: options.clampRelationshipDelta(entry.boundaryDelta, 0.2),
          misreadDelta: options.clampRelationshipDelta(entry.misreadDelta, 0.2),
          repairDelta: options.clampRelationshipDelta(entry.repairDelta, 0.2),
          openLoopDelta: options.clampRelationshipDelta(entry.openLoopDelta, 0.2),
          summary,
          createdAt,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

    if (prepared.length === 0)
      return []

    await options.enqueueWrite(async () => {
      await options.runInTransaction(options.database, async () => {
        for (const entry of prepared) {
          await options.run(
            options.database,
            `
            INSERT INTO relationship_outcomes (
              id,
              card_id,
              decision_trace_id,
              turn_id,
              session_id,
              source_kind,
              action_summary,
              closeness_delta,
              trust_delta,
              burden_delta,
              boundary_delta,
              misread_delta,
              repair_delta,
              open_loop_delta,
              summary,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              entry.id,
              entry.cardId,
              entry.decisionTraceId,
              entry.turnId,
              entry.sessionId,
              entry.sourceKind,
              entry.actionSummary,
              entry.closenessDelta,
              entry.trustDelta,
              entry.burdenDelta,
              entry.boundaryDelta,
              entry.misreadDelta,
              entry.repairDelta,
              entry.openLoopDelta,
              entry.summary,
              entry.createdAt,
            ],
          )
        }
      })
    })

    return prepared.map(entry => mapRelationshipOutcomeRow({
      id: entry.id,
      card_id: entry.cardId,
      decision_trace_id: entry.decisionTraceId,
      turn_id: entry.turnId,
      session_id: entry.sessionId,
      source_kind: entry.sourceKind,
      action_summary: entry.actionSummary,
      closeness_delta: entry.closenessDelta,
      trust_delta: entry.trustDelta,
      burden_delta: entry.burdenDelta,
      boundary_delta: entry.boundaryDelta,
      misread_delta: entry.misreadDelta,
      repair_delta: entry.repairDelta,
      open_loop_delta: entry.openLoopDelta,
      summary: entry.summary,
      created_at: entry.createdAt,
    }))
  }

  async function listRelationshipOutcomes(input: {
    cardId: string
    limit?: number
    turnId?: string
  }) {
    const cardId = input.cardId.trim()
    if (!cardId)
      return []

    const params: unknown[] = [cardId]
    const where = ['card_id = ?']
    if (input.turnId?.trim()) {
      where.push('turn_id = ?')
      params.push(input.turnId.trim())
    }
    const limit = Math.max(1, Math.floor(input.limit ?? 16))
    params.push(limit)
    const rows = await options.all<DbRelationshipOutcomeRow>(
      options.database,
      `SELECT * FROM relationship_outcomes WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
      params,
    )
    return rows.map(mapRelationshipOutcomeRow)
  }

  async function appendPersonaReinforcementEvents(events: AlicizationPersonaReinforcementEventInput[]) {
    if (events.length === 0)
      return []

    const prepared = events
      .map((event) => {
        const cardId = event.cardId.trim()
        const summary = event.summary.trim()
        if (!cardId || !summary)
          return null
        const createdAt = Number.isFinite(event.createdAt) ? Math.max(0, Math.floor(event.createdAt!)) : options.now()
        return {
          id: event.id?.trim() || options.randomUUID(),
          cardId,
          decisionTraceId: event.decisionTraceId?.trim() || null,
          turnId: event.turnId?.trim() || null,
          sessionId: event.sessionId?.trim() || null,
          sourceKind: event.sourceKind,
          dimension: event.dimension,
          delta: options.clampRelationshipDelta(event.delta, 0.4),
          valence: event.valence,
          summary,
          createdAt,
        }
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event))

    if (prepared.length === 0)
      return []

    await options.enqueueWrite(async () => {
      await options.runInTransaction(options.database, async () => {
        for (const event of prepared) {
          await options.run(
            options.database,
            `
            INSERT INTO persona_reinforcement_events (
              id,
              card_id,
              decision_trace_id,
              turn_id,
              session_id,
              source_kind,
              dimension,
              delta,
              valence,
              summary,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              event.id,
              event.cardId,
              event.decisionTraceId,
              event.turnId,
              event.sessionId,
              event.sourceKind,
              event.dimension,
              event.delta,
              event.valence,
              event.summary,
              event.createdAt,
            ],
          )
        }
      })
    })

    return prepared.map(event => mapPersonaReinforcementEventRow({
      id: event.id,
      card_id: event.cardId,
      decision_trace_id: event.decisionTraceId,
      turn_id: event.turnId,
      session_id: event.sessionId,
      source_kind: event.sourceKind,
      dimension: event.dimension,
      delta: event.delta,
      valence: event.valence,
      summary: event.summary,
      created_at: event.createdAt,
    }))
  }

  async function listPersonaReinforcementEventsPage(input: {
    cardId: string
    limit?: number
    turnId?: string
    cursor?: string | null
  }) {
    const cardId = input.cardId.trim()
    if (!cardId) {
      return {
        items: [],
        nextCursor: null,
      }
    }

    const params: unknown[] = [cardId]
    const where = ['card_id = ?']
    if (input.turnId?.trim()) {
      where.push('turn_id = ?')
      params.push(input.turnId.trim())
    }
    const cursor = decodeRelationshipListCursor(input.cursor)
    if (cursor) {
      where.push('(created_at < ? OR (created_at = ? AND id > ?))')
      params.push(cursor.sortValue, cursor.sortValue, cursor.id)
    }
    const limit = Math.max(1, Math.floor(input.limit ?? 24))
    params.push(limit + 1)
    const rows = await options.all<DbPersonaReinforcementEventRow>(
      options.database,
      `SELECT * FROM persona_reinforcement_events WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id ASC LIMIT ?`,
      params,
    )
    const pageRows = rows.slice(0, limit)
    const lastRow = pageRows.at(-1)
    return {
      items: pageRows.map(mapPersonaReinforcementEventRow),
      nextCursor: rows.length > limit && lastRow
        ? encodeRelationshipListCursor({
            sortValue: lastRow.created_at,
            id: lastRow.id,
          })
        : null,
    }
  }

  async function listPersonaReinforcementEvents(input: {
    cardId: string
    limit?: number
    turnId?: string
  }) {
    return (await listPersonaReinforcementEventsPage(input)).items
  }

  async function appendRelationshipDynamics(input: {
    hostAttitude: string
    previousHostAttitude?: string | null
    obedienceDelta?: number
    livelinessDelta?: number
    sensibilityDelta?: number
    source: string
    createdAt?: number
  }) {
    const hostAttitude = options.normalizeOrganicMemoryText(input.hostAttitude, 120)
    if (!hostAttitude)
      return

    const previousHostAttitude = options.normalizeOrganicMemoryText(input.previousHostAttitude, 120) || null
    const source = options.normalizeOrganicMemoryText(input.source, 64) || 'unknown'
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : options.now()

    await options.enqueueWrite(async () => {
      await options.run(
        options.database,
        `
        INSERT INTO relationship_dynamics (
          id,
          host_attitude,
          previous_host_attitude,
          obedience_delta,
          liveliness_delta,
          sensibility_delta,
          source,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          options.randomUUID(),
          hostAttitude,
          previousHostAttitude,
          options.clampRelationshipDelta(Number(input.obedienceDelta ?? 0)),
          options.clampRelationshipDelta(Number(input.livelinessDelta ?? 0)),
          options.clampRelationshipDelta(Number(input.sensibilityDelta ?? 0)),
          source,
          createdAt,
        ],
      )
    })
  }

  async function getLatestRelationshipDynamics() {
    const row = await options.get<DbRelationshipDynamicsRow>(
      options.database,
      `
      SELECT
        host_attitude,
        previous_host_attitude,
        obedience_delta,
        liveliness_delta,
        sensibility_delta,
        source,
        created_at
      FROM relationship_dynamics
      ORDER BY created_at DESC
      LIMIT 1
      `,
    )
    if (!row)
      return null
    return mapRelationshipDynamicsRow(row)
  }

  return {
    upsertMemoryReflections,
    listMemoryReflections,
    listMemoryReflectionsPage,
    appendRelationshipOutcomes,
    listRelationshipOutcomes,
    appendPersonaReinforcementEvents,
    listPersonaReinforcementEvents,
    listPersonaReinforcementEventsPage,
    appendRelationshipDynamics,
    getLatestRelationshipDynamics,
  }
}

export type AlicizationMemoryRelationshipRuntime = ReturnType<typeof createAlicizationMemoryRelationshipRuntime>
