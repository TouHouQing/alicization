import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'
import type sqlite3 from 'sqlite3'

import { isDeepStrictEqual } from 'node:util'

import {
  parseAlicizationRuntimeEvent,
} from '@proj-alicization/stage-shared'

export interface AlicizationRuntimeEventScope {
  turnId: string
  cardId: string
  userId: string
  conversationId: string
}

export interface AlicizationRuntimeEventListOptions {
  afterSequence?: number
}

interface AlicizationRuntimeEventRow {
  event_id: string
  event_type: string
  schema_version: number
  sequence: number
  turn_id: string
  card_id: string
  user_id: string
  conversation_id: string
  source: string
  causation_id: string | null
  correlation_id: string
  idempotency_key: string | null
  occurred_at: number
  payload_json: string
}

interface AlicizationRuntimeCheckpointScopeRow {
  turn_id: string
  card_id: string
  user_id: string
  conversation_id: string
}

interface AlicizationRuntimeEventStoreOptions {
  database: sqlite3.Database
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}

function parseRequiredScopeId(value: unknown, label: keyof AlicizationRuntimeEventScope) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`runtime event scope ${label} must not be empty`)
  return value.trim()
}

function parseScope(input: AlicizationRuntimeEventScope): AlicizationRuntimeEventScope {
  return {
    turnId: parseRequiredScopeId(input.turnId, 'turnId'),
    cardId: parseRequiredScopeId(input.cardId, 'cardId'),
    userId: parseRequiredScopeId(input.userId, 'userId'),
    conversationId: parseRequiredScopeId(input.conversationId, 'conversationId'),
  }
}

function eventScope(event: AlicizationRuntimeEventEnvelope): AlicizationRuntimeEventScope {
  return {
    turnId: event.turnId,
    cardId: event.cardId,
    userId: event.userId,
    conversationId: event.conversationId,
  }
}

function assertSameScope(
  expected: AlicizationRuntimeEventScope,
  actual: AlicizationRuntimeEventScope,
) {
  if (
    expected.turnId !== actual.turnId
    || expected.cardId !== actual.cardId
    || expected.userId !== actual.userId
    || expected.conversationId !== actual.conversationId
  ) {
    throw new Error('runtime event scope does not match the persisted turn scope')
  }
}

function mapRuntimeEventRow(row: AlicizationRuntimeEventRow) {
  let payload: unknown
  try {
    payload = JSON.parse(row.payload_json)
  }
  catch {
    throw new Error(`runtime event ${row.event_id} has invalid payload_json`)
  }

  return parseAlicizationRuntimeEvent({
    eventId: row.event_id,
    eventType: row.event_type,
    schemaVersion: row.schema_version,
    sequence: row.sequence,
    turnId: row.turn_id,
    cardId: row.card_id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    source: row.source,
    causationId: row.causation_id,
    correlationId: row.correlation_id,
    idempotencyKey: row.idempotency_key,
    occurredAt: row.occurred_at,
    payload,
  })
}

function jsonSafeError(path: string, reason: string) {
  return new TypeError(`runtime event payload must be JSON-safe at ${path}: ${reason}`)
}

function assertJsonSafeValue(
  value: unknown,
  path: string,
  ancestors: Set<object>,
): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return

  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw jsonSafeError(path, 'numbers must be finite')
    if (Object.is(value, -0))
      throw jsonSafeError(path, 'negative zero does not round-trip')
    return
  }

  if (typeof value !== 'object')
    throw jsonSafeError(path, `${typeof value} values are not serializable`)

  if (ancestors.has(value))
    throw jsonSafeError(path, 'cyclic references are not serializable')

  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype)
        throw jsonSafeError(path, 'array subclasses do not round-trip')

      const ownKeys = Reflect.ownKeys(value)
      const expectedKeys = new Set<PropertyKey>(['length'])
      for (let index = 0; index < value.length; index++)
        expectedKeys.add(String(index))
      if (ownKeys.some(key => !expectedKeys.has(key)))
        throw jsonSafeError(path, 'arrays must not contain extra properties')

      for (let index = 0; index < value.length; index++) {
        if (!Object.prototype.hasOwnProperty.call(value, index))
          throw jsonSafeError(`${path}[${index}]`, 'sparse array entries do not round-trip')
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
        if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value'))
          throw jsonSafeError(`${path}[${index}]`, 'array entries must be enumerable data properties')
        assertJsonSafeValue(descriptor.value, `${path}[${index}]`, ancestors)
      }
      return
    }

    if (Object.getPrototypeOf(value) !== Object.prototype)
      throw jsonSafeError(path, 'only plain objects are supported')

    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string')
        throw jsonSafeError(path, 'symbol properties do not round-trip')
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value'))
        throw jsonSafeError(`${path}.${key}`, 'properties must be enumerable data properties')
      assertJsonSafeValue(descriptor.value, `${path}.${key}`, ancestors)
    }
  }
  finally {
    ancestors.delete(value)
  }
}

function canonicalizePayload(payload: unknown) {
  try {
    assertJsonSafeValue(payload, '$', new Set())
    const payloadJson = JSON.stringify(payload)
    if (typeof payloadJson !== 'string')
      throw jsonSafeError('$', 'payload did not serialize to JSON text')
    return {
      payload: JSON.parse(payloadJson) as unknown,
      payloadJson,
    }
  }
  catch (error) {
    if (error instanceof TypeError && error.message.includes('JSON-safe'))
      throw error
    throw jsonSafeError('$', error instanceof Error ? error.message : String(error))
  }
}

function sameEventContent(
  existing: AlicizationRuntimeEventEnvelope,
  incoming: AlicizationRuntimeEventEnvelope,
) {
  return existing.eventId === incoming.eventId
    && existing.eventType === incoming.eventType
    && existing.schemaVersion === incoming.schemaVersion
    && existing.turnId === incoming.turnId
    && existing.cardId === incoming.cardId
    && existing.userId === incoming.userId
    && existing.conversationId === incoming.conversationId
    && existing.source === incoming.source
    && existing.causationId === incoming.causationId
    && existing.correlationId === incoming.correlationId
    && existing.idempotencyKey === incoming.idempotencyKey
    && existing.occurredAt === incoming.occurredAt
    && isDeepStrictEqual(existing.payload, incoming.payload)
}

function sameIdempotentRequest(
  existing: AlicizationRuntimeEventEnvelope,
  incoming: AlicizationRuntimeEventEnvelope,
) {
  return existing.eventType === incoming.eventType
    && existing.turnId === incoming.turnId
    && existing.cardId === incoming.cardId
    && existing.userId === incoming.userId
    && existing.conversationId === incoming.conversationId
    && existing.source === incoming.source
    && existing.causationId === incoming.causationId
    && existing.correlationId === incoming.correlationId
    && isDeepStrictEqual(existing.payload, incoming.payload)
}

function parseAfterSequence(value: number | undefined) {
  if (value === undefined)
    return 0
  if (!Number.isInteger(value) || value < 0)
    throw new TypeError('afterSequence must be a non-negative integer')
  return value
}

export function createAlicizationRuntimeEventStore(
  options: AlicizationRuntimeEventStoreOptions,
) {
  async function findTurnScope(turnId: string) {
    const row = await options.get<Pick<
      AlicizationRuntimeEventRow,
      'turn_id' | 'card_id' | 'user_id' | 'conversation_id'
    >>(
      options.database,
      `
      SELECT turn_id, card_id, user_id, conversation_id
      FROM alicization_runtime_events
      WHERE turn_id = ?
      ORDER BY sequence ASC
      LIMIT 1
      `,
      [turnId],
    )
    if (!row)
      return null
    return {
      turnId: row.turn_id,
      cardId: row.card_id,
      userId: row.user_id,
      conversationId: row.conversation_id,
    }
  }

  async function findCheckpointScope(turnId: string) {
    const row = await options.get<AlicizationRuntimeCheckpointScopeRow>(
      options.database,
      `
      SELECT turn_id, card_id, user_id, conversation_id
      FROM alicization_runtime_checkpoints
      WHERE turn_id = ?
      LIMIT 1
      `,
      [turnId],
    )
    if (!row)
      return null
    return {
      turnId: row.turn_id,
      cardId: row.card_id,
      userId: row.user_id,
      conversationId: row.conversation_id,
    }
  }

  async function append(
    scopeInput: AlicizationRuntimeEventScope,
    eventInput: AlicizationRuntimeEventEnvelope,
  ) {
    const scope = parseScope(scopeInput)
    const parsedEvent = parseAlicizationRuntimeEvent(eventInput)
    const canonical = canonicalizePayload(parsedEvent.payload)
    const event: AlicizationRuntimeEventEnvelope = {
      ...parsedEvent,
      payload: canonical.payload,
    }
    assertSameScope(scope, eventScope(event))

    return await options.enqueueWrite(async () => {
      return await options.runInTransaction(options.database, async () => {
        const persistedScope = await findTurnScope(scope.turnId)
        if (persistedScope)
          assertSameScope(scope, persistedScope)
        const checkpointScope = await findCheckpointScope(scope.turnId)
        if (checkpointScope)
          assertSameScope(scope, checkpointScope)

        const eventIdRow = await options.get<AlicizationRuntimeEventRow>(
          options.database,
          `
          SELECT *
          FROM alicization_runtime_events
          WHERE event_id = ?
          LIMIT 1
          `,
          [event.eventId],
        )
        if (eventIdRow) {
          const existing = mapRuntimeEventRow(eventIdRow)
          if (!sameEventContent(existing, event))
            throw new Error(`runtime eventId conflict for ${event.eventId}`)
          return existing
        }

        if (event.idempotencyKey) {
          const idempotentRow = await options.get<AlicizationRuntimeEventRow>(
            options.database,
            `
            SELECT *
            FROM alicization_runtime_events
            WHERE turn_id = ? AND idempotency_key = ?
            LIMIT 1
            `,
            [scope.turnId, event.idempotencyKey],
          )
          if (idempotentRow) {
            const existing = mapRuntimeEventRow(idempotentRow)
            if (!sameIdempotentRequest(existing, event))
              throw new Error(`runtime idempotency conflict for ${event.idempotencyKey}`)
            return existing
          }
        }

        const cursor = await options.get<{ sequence: number }>(
          options.database,
          `
          SELECT COALESCE(MAX(sequence), 0) AS sequence
          FROM alicization_runtime_events
          WHERE turn_id = ?
          `,
          [scope.turnId],
        )
        const persisted: AlicizationRuntimeEventEnvelope = {
          ...event,
          sequence: Number(cursor?.sequence ?? 0) + 1,
        }

        await options.run(
          options.database,
          `
          INSERT INTO alicization_runtime_events (
            event_id,
            event_type,
            schema_version,
            sequence,
            turn_id,
            card_id,
            user_id,
            conversation_id,
            source,
            causation_id,
            correlation_id,
            idempotency_key,
            occurred_at,
            payload_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            persisted.eventId,
            persisted.eventType,
            persisted.schemaVersion,
            persisted.sequence,
            persisted.turnId,
            persisted.cardId,
            persisted.userId,
            persisted.conversationId,
            persisted.source,
            persisted.causationId,
            persisted.correlationId,
            persisted.idempotencyKey,
            persisted.occurredAt,
            canonical.payloadJson,
          ],
        )

        return persisted
      })
    })
  }

  async function list(
    scopeInput: AlicizationRuntimeEventScope,
    listOptions: AlicizationRuntimeEventListOptions = {},
  ) {
    const scope = parseScope(scopeInput)
    const afterSequence = parseAfterSequence(listOptions.afterSequence)
    const persistedScope = await findTurnScope(scope.turnId)
    if (persistedScope)
      assertSameScope(scope, persistedScope)
    const checkpointScope = await findCheckpointScope(scope.turnId)
    if (checkpointScope)
      assertSameScope(scope, checkpointScope)
    if (!persistedScope)
      return []

    const rows = await options.all<AlicizationRuntimeEventRow>(
      options.database,
      `
      SELECT *
      FROM alicization_runtime_events
      WHERE turn_id = ?
        AND card_id = ?
        AND user_id = ?
        AND conversation_id = ?
        AND sequence > ?
      ORDER BY sequence ASC
      `,
      [
        scope.turnId,
        scope.cardId,
        scope.userId,
        scope.conversationId,
        afterSequence,
      ],
    )
    return rows.map(mapRuntimeEventRow)
  }

  return {
    append,
    list,
  }
}
