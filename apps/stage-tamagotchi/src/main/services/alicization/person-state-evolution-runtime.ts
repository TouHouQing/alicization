import type {
  AlicizationPersonStateEvolutionEntryInput,
  AlicizationPersonStateEvolutionEntryRecord,
  AlicizationPersonStateEvolutionShift,
  AlicizationPersonStateEvolutionShiftKind,
  AlicizationPersonStateEvolutionSummary,
  AlicizationPersonStateUpdateSourceTrailEntry,
} from '../../../shared/eventa'

import type sqlite3 from 'sqlite3'

interface DbPersonStateEvolutionRow {
  id: string
  card_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  active_thread_id: string | null
  source_kind: AlicizationPersonStateEvolutionEntryRecord['sourceKind']
  summary: string
  contexts_json: string | null
  relationship_doctrine: string | null
  burden_line: string | null
  trust_meaning: string | null
  dominant_rung: string | null
  source_trail_json: string | null
  shifts_json: string
  created_at: number
}

interface CreateAlicizationPersonStateEvolutionRuntimeOptions {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clampDelta(value: number, maxAbs = 1) {
  if (!Number.isFinite(value))
    return 0
  return Number(Math.max(-maxAbs, Math.min(maxAbs, value)).toFixed(3))
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 180)
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

function asObjectArray(raw: string | null) {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
      : []
  }
  catch {
    return []
  }
}

function parseStringArray(raw: string | null) {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
      : []
  }
  catch {
    return []
  }
}

function normalizeShift(raw: AlicizationPersonStateEvolutionShift): AlicizationPersonStateEvolutionShift | null {
  const kind = sanitizeText(raw.kind, 64) as AlicizationPersonStateEvolutionShiftKind
  const rationale = sanitizeText(raw.rationale, 220)
  if (!kind || !rationale)
    return null
  return {
    kind,
    delta: clampDelta(Number(raw.delta ?? 0), 1),
    rationale,
  }
}

function mapSourceTrail(raw: string | null): AlicizationPersonStateUpdateSourceTrailEntry[] {
  return asObjectArray(raw)
    .map((item) => {
      const kind = sanitizeText(item.kind, 64)
      const sourceKind = sanitizeText(item.sourceKind, 64)
      const summary = sanitizeText(item.summary, 180)
      const createdAt = Number(item.createdAt)
      if (!kind || !sourceKind || !summary)
        return null
      return {
        kind: kind as AlicizationPersonStateUpdateSourceTrailEntry['kind'],
        sourceKind: sourceKind as AlicizationPersonStateUpdateSourceTrailEntry['sourceKind'],
        summary,
        createdAt: Number.isFinite(createdAt) ? Math.max(0, Math.floor(createdAt)) : 0,
      }
    })
    .filter((item): item is AlicizationPersonStateUpdateSourceTrailEntry => Boolean(item))
}

function mapEvolutionRow(row: DbPersonStateEvolutionRow): AlicizationPersonStateEvolutionEntryRecord {
  return {
    id: row.id,
    cardId: row.card_id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    activeThreadId: row.active_thread_id,
    sourceKind: row.source_kind,
    summary: row.summary,
    contexts: parseStringArray(row.contexts_json),
    relationshipDoctrine: row.relationship_doctrine,
    burdenLine: row.burden_line,
    trustMeaning: row.trust_meaning,
    dominantRung: row.dominant_rung,
    sourceTrail: mapSourceTrail(row.source_trail_json),
    shifts: asObjectArray(row.shifts_json)
      .map(item => normalizeShift(item as unknown as AlicizationPersonStateEvolutionShift))
      .filter((item): item is AlicizationPersonStateEvolutionShift => Boolean(item)),
    createdAt: row.created_at,
  }
}

export function summarizePersonStateEvolutionLog(
  entries: AlicizationPersonStateEvolutionEntryRecord[],
): AlicizationPersonStateEvolutionSummary {
  const totals: Record<AlicizationPersonStateEvolutionShiftKind, number> = {
    'trust-shift': 0,
    'closeness-shift': 0,
    'repair-posture-shift': 0,
    'autonomy-shift': 0,
    'burden-shift': 0,
    'execution-trust-shift': 0,
    'relationship-doctrine-shift': 0,
  }

  for (const entry of entries) {
    for (const shift of entry.shifts)
      totals[shift.kind] = clampDelta(totals[shift.kind] + shift.delta, 4)
  }

  const latest = entries[0] ?? null
  return {
    trustShift: totals['trust-shift'],
    closenessShift: totals['closeness-shift'],
    repairShift: totals['repair-posture-shift'],
    autonomyShift: totals['autonomy-shift'],
    burdenShift: totals['burden-shift'],
    executionTrustShift: totals['execution-trust-shift'],
    relationshipDoctrineShift: totals['relationship-doctrine-shift'],
    latestDoctrine: latest?.relationshipDoctrine ?? null,
    latestBurdenLine: latest?.burdenLine ?? null,
    latestTrustMeaning: latest?.trustMeaning ?? null,
    latestDominantRung: latest?.dominantRung ?? null,
    recentSummaries: entries.map(entry => entry.summary).slice(0, 6),
    explanation: uniqueList([
      ...entries.flatMap(entry => entry.shifts.map(shift => shift.rationale)),
      latest?.burdenLine,
      latest?.trustMeaning,
      latest?.relationshipDoctrine,
    ], 8),
    updatedAt: latest?.createdAt ?? null,
  }
}

export function createAlicizationPersonStateEvolutionRuntime(
  options: CreateAlicizationPersonStateEvolutionRuntimeOptions,
) {
  async function appendEvolutionEntries(entries: AlicizationPersonStateEvolutionEntryInput[]) {
    if (entries.length === 0)
      return [] as AlicizationPersonStateEvolutionEntryRecord[]

    const prepared = entries
      .map((entry) => {
        const cardId = sanitizeText(entry.cardId, 120)
        const summary = sanitizeText(entry.summary, 220)
        const shifts = (entry.shifts ?? [])
          .map(normalizeShift)
          .filter((item): item is AlicizationPersonStateEvolutionShift => Boolean(item))
        if (!cardId || !summary || shifts.length === 0)
          return null
        const createdAt = Number.isFinite(entry.createdAt)
          ? Math.max(0, Math.floor(Number(entry.createdAt)))
          : options.now()
        return {
          id: sanitizeText(entry.id, 120) || options.randomUUID(),
          cardId,
          decisionTraceId: sanitizeText(entry.decisionTraceId, 120) || null,
          turnId: sanitizeText(entry.turnId, 120) || null,
          sessionId: sanitizeText(entry.sessionId, 120) || null,
          activeThreadId: sanitizeText(entry.activeThreadId, 160) || null,
          sourceKind: entry.sourceKind,
          summary,
          contextsJson: JSON.stringify(uniqueList(entry.contexts ?? [], 8)),
          relationshipDoctrine: sanitizeText(entry.relationshipDoctrine, 220) || null,
          burdenLine: sanitizeText(entry.burdenLine, 180) || null,
          trustMeaning: sanitizeText(entry.trustMeaning, 180) || null,
          dominantRung: sanitizeText(entry.dominantRung, 64) || null,
          sourceTrailJson: JSON.stringify((entry.sourceTrail ?? []).map(item => ({
            kind: sanitizeText(item.kind, 64),
            sourceKind: sanitizeText(item.sourceKind, 64),
            summary: sanitizeText(item.summary, 180),
            createdAt: Number.isFinite(item.createdAt) ? Math.max(0, Math.floor(item.createdAt)) : createdAt,
          }))),
          shiftsJson: JSON.stringify(shifts),
          createdAt,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (prepared.length === 0)
      return [] as AlicizationPersonStateEvolutionEntryRecord[]

    await options.enqueueWrite(async () => {
      await options.runInTransaction(options.database, async () => {
        for (const entry of prepared) {
          await options.run(
            options.database,
            `
            INSERT INTO person_state_evolution_log (
              id,
              card_id,
              decision_trace_id,
              turn_id,
              session_id,
              active_thread_id,
              source_kind,
              summary,
              contexts_json,
              relationship_doctrine,
              burden_line,
              trust_meaning,
              dominant_rung,
              source_trail_json,
              shifts_json,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              entry.id,
              entry.cardId,
              entry.decisionTraceId,
              entry.turnId,
              entry.sessionId,
              entry.activeThreadId,
              entry.sourceKind,
              entry.summary,
              entry.contextsJson,
              entry.relationshipDoctrine,
              entry.burdenLine,
              entry.trustMeaning,
              entry.dominantRung,
              entry.sourceTrailJson,
              entry.shiftsJson,
              entry.createdAt,
            ],
          )
        }
      })
    })

    return prepared.map((entry) => mapEvolutionRow({
      id: entry.id,
      card_id: entry.cardId,
      decision_trace_id: entry.decisionTraceId,
      turn_id: entry.turnId,
      session_id: entry.sessionId,
      active_thread_id: entry.activeThreadId,
      source_kind: entry.sourceKind,
      summary: entry.summary,
      contexts_json: entry.contextsJson,
      relationship_doctrine: entry.relationshipDoctrine,
      burden_line: entry.burdenLine,
      trust_meaning: entry.trustMeaning,
      dominant_rung: entry.dominantRung,
      source_trail_json: entry.sourceTrailJson,
      shifts_json: entry.shiftsJson,
      created_at: entry.createdAt,
    }))
  }

  async function listEvolutionEntries(input?: {
    cardId?: string
    decisionTraceId?: string
    turnId?: string
    limit?: number
  }) {
    const cardId = sanitizeText(input?.cardId, 120)
    const decisionTraceId = sanitizeText(input?.decisionTraceId, 120)
    const turnId = sanitizeText(input?.turnId, 120)
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 120)))
    const where: string[] = []
    const params: unknown[] = []

    if (cardId) {
      where.push('card_id = ?')
      params.push(cardId)
    }
    if (decisionTraceId) {
      where.push('decision_trace_id = ?')
      params.push(decisionTraceId)
    }
    if (turnId) {
      where.push('turn_id = ?')
      params.push(turnId)
    }

    const rows = await options.all<DbPersonStateEvolutionRow>(
      options.database,
      `
      SELECT *
      FROM person_state_evolution_log
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return rows.map(mapEvolutionRow)
  }

  async function summarizeEvolution(input?: {
    cardId?: string
    limit?: number
  }) {
    const entries = await listEvolutionEntries({
      cardId: input?.cardId,
      limit: input?.limit ?? 48,
    })
    return summarizePersonStateEvolutionLog(entries)
  }

  return {
    appendEvolutionEntries,
    listEvolutionEntries,
    summarizeEvolution,
  }
}
