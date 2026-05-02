import type {
  AlicizationMindHeadKey,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
} from '../../../shared/eventa'
import type sqlite3 from 'sqlite3'

export interface AlicizationMemoryMindStateRuntimeWriteOptions {
  signal?: AbortSignal
}

interface DbMindTurnEventRow {
  id: string
  decision_trace_id: string
  turn_id: string | null
  session_id: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  kind: AlicizationMindTurnEventKind
  payload_json: string | null
  created_at: number
}

interface CreateAlicizationMemoryMindStateRuntimeOptions {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  getMetaValue: (key: string) => Promise<string | undefined>
  upsertMeta: (key: string, value: string) => Promise<void>
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  enqueueWrite: <T>(task: () => Promise<T>, options?: AlicizationMemoryMindStateRuntimeWriteOptions) => Promise<T>
  assertWriteNotAborted: (options?: AlicizationMemoryMindStateRuntimeWriteOptions) => void
  parseMindTurnEventPayload: (raw: string | null) => Record<string, unknown> | null
  resolveMindTurnEventActiveThreadId: (payload: Record<string, unknown> | null) => string | null
}

function buildMindHeadMetaKey(cardId: string, key: AlicizationMindHeadKey) {
  return `mind-head:${cardId}:${key}`
}

export function createAlicizationMemoryMindStateRuntime(
  input: CreateAlicizationMemoryMindStateRuntimeOptions,
) {
  async function readMindHead<T>(cardId: string, key: AlicizationMindHeadKey) {
    const raw = await input.getMetaValue(buildMindHeadMetaKey(cardId.trim(), key))
    if (!raw)
      return null
    try {
      return JSON.parse(raw) as T
    }
    catch {
      return null
    }
  }

  async function upsertMindHead(cardId: string, key: AlicizationMindHeadKey, value: unknown, options?: AlicizationMemoryMindStateRuntimeWriteOptions) {
    const normalizedCardId = cardId.trim()
    if (!normalizedCardId)
      throw new Error('cardId is required')
    input.assertWriteNotAborted(options)
    await input.enqueueWrite(async () => {
      input.assertWriteNotAborted(options)
      await input.upsertMeta(
        buildMindHeadMetaKey(normalizedCardId, key),
        JSON.stringify(value ?? null),
      )
    }, options)
  }

  async function appendMindTurnEvents(events: AlicizationMindTurnEventInput[], options?: AlicizationMemoryMindStateRuntimeWriteOptions) {
    if (events.length === 0)
      return

    const normalized = events
      .map((event) => {
        const decisionTraceId = typeof event.decisionTraceId === 'string'
          ? event.decisionTraceId.trim()
          : ''
        if (!decisionTraceId)
          return null
        const kind = event.kind
        if (!kind)
          return null

        return {
          id: input.randomUUID(),
          decisionTraceId,
          turnId: typeof event.turnId === 'string' && event.turnId.trim()
            ? event.turnId.trim()
            : null,
          sessionId: typeof event.sessionId === 'string' && event.sessionId.trim()
            ? event.sessionId.trim()
            : null,
          origin: event.origin === 'subconscious-proactive'
            ? 'subconscious-proactive'
            : event.origin === 'system'
              ? 'system'
              : 'user-turn' as const,
          kind,
          payloadJson: event.payload && typeof event.payload === 'object'
            ? JSON.stringify(event.payload)
            : null,
          createdAt: Number.isFinite(event.createdAt)
            ? Math.max(0, Math.floor(Number(event.createdAt)))
            : input.now(),
        }
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event))

    if (normalized.length === 0)
      return

    input.assertWriteNotAborted(options)
    await input.enqueueWrite(async () => {
      input.assertWriteNotAborted(options)
      await input.runInTransaction(input.database, async () => {
        for (const event of normalized) {
          await input.run(
            input.database,
            `
            INSERT INTO mind_turn_events (
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              event.id,
              event.decisionTraceId,
              event.turnId,
              event.sessionId,
              event.origin,
              event.kind,
              event.payloadJson,
              event.createdAt,
            ],
          )
        }
      })
    }, options)
  }

  async function listMindTurnEvents(inputQuery: {
    decisionTraceId?: string
    turnId?: string
    activeThreadId?: string
    limit?: number
  }) {
    const decisionTraceId = typeof inputQuery.decisionTraceId === 'string'
      ? inputQuery.decisionTraceId.trim()
      : ''
    const turnId = typeof inputQuery.turnId === 'string'
      ? inputQuery.turnId.trim()
      : ''
    const activeThreadId = typeof inputQuery.activeThreadId === 'string'
      ? inputQuery.activeThreadId.trim()
      : ''
    if (!decisionTraceId && !turnId)
      return [] as AlicizationMindTurnEventRecord[]

    const limit = Math.max(1, Math.min(5_000, Math.floor(inputQuery.limit ?? 300)))
    const rows = decisionTraceId && turnId
      ? await input.all<DbMindTurnEventRow>(
          input.database,
          `
          SELECT
            id,
            decision_trace_id,
            turn_id,
            session_id,
            origin,
            kind,
            payload_json,
            created_at
          FROM mind_turn_events
          WHERE decision_trace_id = ?
            AND turn_id = ?
          ORDER BY created_at DESC
          LIMIT ?
          `,
          [decisionTraceId, turnId, limit],
        )
      : decisionTraceId
        ? await input.all<DbMindTurnEventRow>(
            input.database,
            `
            SELECT
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            FROM mind_turn_events
            WHERE decision_trace_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            `,
            [decisionTraceId, limit],
          )
        : await input.all<DbMindTurnEventRow>(
            input.database,
            `
            SELECT
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            FROM mind_turn_events
            WHERE turn_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            `,
            [turnId, limit],
          )

    const mappedRows = [...rows]
      .reverse()
      .map((row): AlicizationMindTurnEventRecord => ({
        id: row.id,
        decisionTraceId: row.decision_trace_id,
        turnId: row.turn_id,
        sessionId: row.session_id,
        origin: row.origin,
        kind: row.kind,
        payload: input.parseMindTurnEventPayload(row.payload_json),
        createdAt: row.created_at,
      }))

    if (!activeThreadId)
      return mappedRows

    return mappedRows.filter((row) => {
      return input.resolveMindTurnEventActiveThreadId(row.payload) === activeThreadId
    })
  }

  return {
    readMindHead,
    upsertMindHead,
    appendMindTurnEvents,
    listMindTurnEvents,
  }
}

export type AlicizationMemoryMindStateRuntime = ReturnType<typeof createAlicizationMemoryMindStateRuntime>
