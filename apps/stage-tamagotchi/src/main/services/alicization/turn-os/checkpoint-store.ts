import type sqlite3 from 'sqlite3'

import type { AlicizationRuntimeEventScope } from './event-store'

export type AlicizationRuntimeCheckpointScope = AlicizationRuntimeEventScope
export type AlicizationRuntimeDeliveryOwner = 'inline' | 'callback'
export const alicizationRuntimeCheckpointStatuses = [
  'accepted',
  'running',
  'waiting',
  'recovery-required',
  'completed',
  'failed',
  'cancelled',
  'timed-out',
  'dead-lettered',
] as const
export type AlicizationRuntimeCheckpointStatus = typeof alicizationRuntimeCheckpointStatuses[number]

export interface AlicizationRuntimeCheckpoint extends AlicizationRuntimeCheckpointScope {
  sequence: number
  status: AlicizationRuntimeCheckpointStatus
  activeActionIds: string[]
  deliveryOwner: AlicizationRuntimeDeliveryOwner
  schemaVersion: 1
  updatedAt: number
}

interface AlicizationRuntimeCheckpointRow {
  turn_id: string
  card_id: string
  user_id: string
  conversation_id: string
  sequence: number
  runtime_status: string
  active_action_ids_json: string
  delivery_owner: string
  schema_version: number
  updated_at: number
}

interface AlicizationRuntimeEventScopeCursorRow {
  turn_id: string
  card_id: string
  user_id: string
  conversation_id: string
  max_sequence: number
}

interface AlicizationRuntimeCheckpointSnapshotRow {
  checkpoint_turn_id: string | null
  checkpoint_card_id: string | null
  checkpoint_user_id: string | null
  checkpoint_conversation_id: string | null
  checkpoint_sequence: number | null
  checkpoint_runtime_status: string | null
  checkpoint_active_action_ids_json: string | null
  checkpoint_delivery_owner: string | null
  checkpoint_schema_version: number | null
  checkpoint_updated_at: number | null
  event_turn_id: string | null
  event_card_id: string | null
  event_user_id: string | null
  event_conversation_id: string | null
  event_max_sequence: number | null
}

interface AlicizationRuntimeCheckpointStoreOptions {
  database: sqlite3.Database
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}

const runtimeCheckpointStatusSet = new Set<string>(alicizationRuntimeCheckpointStatuses)

function parseRequiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${label} must not be empty`)
  return value.trim()
}

function parseNonNegativeInteger(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    throw new TypeError(`${label} must be a non-negative integer`)
  return value
}

function parseScope(input: AlicizationRuntimeCheckpointScope): AlicizationRuntimeCheckpointScope {
  return {
    turnId: parseRequiredText(input.turnId, 'checkpoint turnId'),
    cardId: parseRequiredText(input.cardId, 'checkpoint cardId'),
    userId: parseRequiredText(input.userId, 'checkpoint userId'),
    conversationId: parseRequiredText(input.conversationId, 'checkpoint conversationId'),
  }
}

function parseActiveActionIds(value: unknown) {
  if (!Array.isArray(value))
    throw new TypeError('checkpoint activeActionIds must be an array')

  const activeActionIds: string[] = []
  for (const item of value) {
    const actionId = parseRequiredText(item, 'checkpoint activeActionId')
    if (!activeActionIds.includes(actionId))
      activeActionIds.push(actionId)
  }
  return activeActionIds
}

function parseDeliveryOwner(value: unknown): AlicizationRuntimeDeliveryOwner {
  if (value !== 'inline' && value !== 'callback')
    throw new TypeError('checkpoint deliveryOwner must be inline or callback')
  return value
}

function parseStatus(value: unknown): AlicizationRuntimeCheckpointStatus {
  if (typeof value !== 'string' || !runtimeCheckpointStatusSet.has(value))
    throw new TypeError(`checkpoint status must be one of ${alicizationRuntimeCheckpointStatuses.join(', ')}`)
  return value as AlicizationRuntimeCheckpointStatus
}

function parseSchemaVersion(value: unknown): 1 {
  if (value !== 1)
    throw new TypeError('checkpoint schemaVersion must be 1')
  return 1
}

function parseCheckpoint(input: AlicizationRuntimeCheckpoint): AlicizationRuntimeCheckpoint {
  return {
    ...parseScope(input),
    sequence: parseNonNegativeInteger(input.sequence, 'checkpoint sequence'),
    status: parseStatus(input.status),
    activeActionIds: parseActiveActionIds(input.activeActionIds),
    deliveryOwner: parseDeliveryOwner(input.deliveryOwner),
    schemaVersion: parseSchemaVersion(input.schemaVersion),
    updatedAt: parseNonNegativeInteger(input.updatedAt, 'checkpoint updatedAt'),
  }
}

function assertSameScope(
  expected: AlicizationRuntimeCheckpointScope,
  actual: AlicizationRuntimeCheckpointScope,
) {
  if (
    expected.turnId !== actual.turnId
    || expected.cardId !== actual.cardId
    || expected.userId !== actual.userId
    || expected.conversationId !== actual.conversationId
  ) {
    throw new Error('runtime checkpoint scope does not match the persisted turn scope')
  }
}

function sameCheckpointContent(
  existing: AlicizationRuntimeCheckpoint,
  incoming: AlicizationRuntimeCheckpoint,
) {
  return existing.turnId === incoming.turnId
    && existing.cardId === incoming.cardId
    && existing.userId === incoming.userId
    && existing.conversationId === incoming.conversationId
    && existing.sequence === incoming.sequence
    && existing.status === incoming.status
    && existing.deliveryOwner === incoming.deliveryOwner
    && existing.schemaVersion === incoming.schemaVersion
    && existing.updatedAt === incoming.updatedAt
    && existing.activeActionIds.length === incoming.activeActionIds.length
    && existing.activeActionIds.every((actionId, index) => actionId === incoming.activeActionIds[index])
}

function mapCheckpointRow(row: AlicizationRuntimeCheckpointRow) {
  let activeActionIds: unknown
  try {
    activeActionIds = JSON.parse(row.active_action_ids_json)
  }
  catch {
    throw new Error(`runtime checkpoint ${row.turn_id} has invalid active_action_ids_json`)
  }

  return parseCheckpoint({
    turnId: row.turn_id,
    cardId: row.card_id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    sequence: row.sequence,
    status: row.runtime_status as AlicizationRuntimeCheckpointStatus,
    activeActionIds: activeActionIds as string[],
    deliveryOwner: row.delivery_owner as AlicizationRuntimeDeliveryOwner,
    schemaVersion: row.schema_version as 1,
    updatedAt: row.updated_at,
  })
}

export function createAlicizationRuntimeCheckpointStore(
  options: AlicizationRuntimeCheckpointStoreOptions,
) {
  async function findByTurnId(turnId: string) {
    return await options.get<AlicizationRuntimeCheckpointRow>(
      options.database,
      `
      SELECT *
      FROM alicization_runtime_checkpoints
      WHERE turn_id = ?
      LIMIT 1
      `,
      [turnId],
    )
  }

  async function findEventTurnState(turnId: string) {
    const rows = await options.all<AlicizationRuntimeEventScopeCursorRow>(
      options.database,
      `
      SELECT
        turn_id,
        card_id,
        user_id,
        conversation_id,
        MAX(sequence) AS max_sequence
      FROM alicization_runtime_events
      WHERE turn_id = ?
      GROUP BY turn_id, card_id, user_id, conversation_id
      `,
      [turnId],
    )
    if (rows.length > 1)
      throw new Error(`runtime event scope is split for turn ${turnId}`)
    const row = rows[0]
    if (!row)
      return null
    return {
      scope: {
        turnId: row.turn_id,
        cardId: row.card_id,
        userId: row.user_id,
        conversationId: row.conversation_id,
      },
      maxSequence: Number(row.max_sequence),
    }
  }

  async function findLoadSnapshot(turnId: string) {
    const rows = await options.all<AlicizationRuntimeCheckpointSnapshotRow>(
      options.database,
      `
      WITH checkpoint AS (
        SELECT
          turn_id,
          card_id,
          user_id,
          conversation_id,
          sequence,
          runtime_status,
          active_action_ids_json,
          delivery_owner,
          schema_version,
          updated_at
        FROM alicization_runtime_checkpoints
        WHERE turn_id = ?
      ),
      event_scopes AS (
        SELECT
          turn_id,
          card_id,
          user_id,
          conversation_id,
          MAX(sequence) AS max_sequence
        FROM alicization_runtime_events
        WHERE turn_id = ?
        GROUP BY turn_id, card_id, user_id, conversation_id
      )
      SELECT
        checkpoint.turn_id AS checkpoint_turn_id,
        checkpoint.card_id AS checkpoint_card_id,
        checkpoint.user_id AS checkpoint_user_id,
        checkpoint.conversation_id AS checkpoint_conversation_id,
        checkpoint.sequence AS checkpoint_sequence,
        checkpoint.runtime_status AS checkpoint_runtime_status,
        checkpoint.active_action_ids_json AS checkpoint_active_action_ids_json,
        checkpoint.delivery_owner AS checkpoint_delivery_owner,
        checkpoint.schema_version AS checkpoint_schema_version,
        checkpoint.updated_at AS checkpoint_updated_at,
        event_scopes.turn_id AS event_turn_id,
        event_scopes.card_id AS event_card_id,
        event_scopes.user_id AS event_user_id,
        event_scopes.conversation_id AS event_conversation_id,
        event_scopes.max_sequence AS event_max_sequence
      FROM (SELECT 1) AS snapshot
      LEFT JOIN checkpoint ON TRUE
      LEFT JOIN event_scopes ON TRUE
      `,
      [turnId, turnId],
    )

    const eventRows = rows.filter(row => row.event_turn_id !== null)
    if (eventRows.length > 1)
      throw new Error(`runtime event scope is split for turn ${turnId}`)

    const eventRow = eventRows[0]
    const eventState = eventRow
      ? {
          scope: {
            turnId: eventRow.event_turn_id!,
            cardId: eventRow.event_card_id!,
            userId: eventRow.event_user_id!,
            conversationId: eventRow.event_conversation_id!,
          },
          maxSequence: Number(eventRow.event_max_sequence),
        }
      : null

    const checkpointRow = rows.find(row => row.checkpoint_turn_id !== null)
    const checkpoint = checkpointRow
      ? mapCheckpointRow({
          turn_id: checkpointRow.checkpoint_turn_id!,
          card_id: checkpointRow.checkpoint_card_id!,
          user_id: checkpointRow.checkpoint_user_id!,
          conversation_id: checkpointRow.checkpoint_conversation_id!,
          sequence: checkpointRow.checkpoint_sequence!,
          runtime_status: checkpointRow.checkpoint_runtime_status!,
          active_action_ids_json: checkpointRow.checkpoint_active_action_ids_json!,
          delivery_owner: checkpointRow.checkpoint_delivery_owner!,
          schema_version: checkpointRow.checkpoint_schema_version!,
          updated_at: checkpointRow.checkpoint_updated_at!,
        })
      : null

    return { checkpoint, eventState }
  }

  function assertWithinEventCursor(
    checkpoint: AlicizationRuntimeCheckpoint,
    maxEventSequence: number,
  ) {
    if (checkpoint.sequence > maxEventSequence) {
      throw new Error(
        `runtime checkpoint sequence ${checkpoint.sequence} exceeds persisted event cursor ${maxEventSequence}`,
      )
    }
  }

  async function save(input: AlicizationRuntimeCheckpoint) {
    const checkpoint = parseCheckpoint(input)

    return await options.enqueueWrite(async () => {
      return await options.runInTransaction(options.database, async () => {
        const eventState = await findEventTurnState(checkpoint.turnId)
        if (eventState)
          assertSameScope(checkpoint, eventState.scope)
        assertWithinEventCursor(checkpoint, eventState?.maxSequence ?? 0)

        const existingRow = await findByTurnId(checkpoint.turnId)
        if (existingRow) {
          const existing = mapCheckpointRow(existingRow)
          assertSameScope(checkpoint, existing)
          if (checkpoint.sequence < existing.sequence)
            throw new Error('runtime checkpoint stale checkpoint sequence cannot replace a newer cursor')
          if (checkpoint.sequence === existing.sequence) {
            if (checkpoint.updatedAt < existing.updatedAt)
              throw new Error('runtime checkpoint updatedAt cannot move backward at the same sequence')
            if (checkpoint.updatedAt === existing.updatedAt) {
              if (sameCheckpointContent(existing, checkpoint))
                return existing
              throw new Error('runtime checkpoint updatedAt must advance when state changes at the same sequence')
            }
          }
        }

        await options.run(
          options.database,
          `
          INSERT INTO alicization_runtime_checkpoints (
            turn_id,
            card_id,
            user_id,
            conversation_id,
            sequence,
            runtime_status,
            active_action_ids_json,
            delivery_owner,
            schema_version,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(turn_id)
          DO UPDATE SET
            card_id = excluded.card_id,
            user_id = excluded.user_id,
            conversation_id = excluded.conversation_id,
            sequence = excluded.sequence,
            runtime_status = excluded.runtime_status,
            active_action_ids_json = excluded.active_action_ids_json,
            delivery_owner = excluded.delivery_owner,
            schema_version = excluded.schema_version,
            updated_at = excluded.updated_at
          `,
          [
            checkpoint.turnId,
            checkpoint.cardId,
            checkpoint.userId,
            checkpoint.conversationId,
            checkpoint.sequence,
            checkpoint.status,
            JSON.stringify(checkpoint.activeActionIds),
            checkpoint.deliveryOwner,
            checkpoint.schemaVersion,
            checkpoint.updatedAt,
          ],
        )

        return checkpoint
      })
    })
  }

  async function load(scopeInput: AlicizationRuntimeCheckpointScope) {
    const scope = parseScope(scopeInput)
    const { checkpoint, eventState } = await findLoadSnapshot(scope.turnId)
    if (eventState)
      assertSameScope(scope, eventState.scope)
    if (!checkpoint)
      return null

    assertSameScope(scope, checkpoint)
    assertWithinEventCursor(checkpoint, eventState?.maxSequence ?? 0)
    return checkpoint
  }

  return {
    save,
    load,
  }
}
