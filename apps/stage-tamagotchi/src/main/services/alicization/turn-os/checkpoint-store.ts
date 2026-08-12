import type {
  AlicizationActionObservationLink,
  AlicizationActionSettlement,
  AlicizationRuntimeEventType,
} from '@proj-alicization/stage-shared'
import type sqlite3 from 'sqlite3'

import type { AlicizationRuntimeEventScope } from './event-store'
import type { AlicizationRuntimeReplyDeliveryIntent } from './reply-artifact'

import { isDeepStrictEqual } from 'node:util'

import {
  alicizationRuntimeEventTypes,
  parseAlicizationActionObservation,
  parseAlicizationActionSettlement,
} from '@proj-alicization/stage-shared'

import {
  assertAlicizationRuntimeReplyDeliveryScope,
  parseAlicizationRuntimeReplyDeliveryIntent,
} from './reply-artifact'
import {
  alicizationTurnRuntimeIssueCodes,
} from './runtime-state'

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

export const alicizationRuntimeCheckpointActionStatuses = [
  'active',
  'completed',
  'failed',
  'cancelled',
  'rejected',
  'dead-lettered',
] as const
export type AlicizationRuntimeCheckpointActionStatus = typeof alicizationRuntimeCheckpointActionStatuses[number]

export interface AlicizationRuntimeCheckpointActionProjection {
  actionId: string
  toolCallId: string | null
  status: AlicizationRuntimeCheckpointActionStatus
  terminalObservationId: string | null
  lastObservation: (AlicizationActionObservationLink & { output?: unknown }) | null
  outcome: AlicizationActionObservationLink['outcome'] | null
  pendingTerminalStatus: AlicizationRuntimeCheckpointActionStatus | null
  completionPendingObservation: boolean
  lateEventCount: number
  lastSequence: number
}

export interface AlicizationRuntimeCheckpointProjection {
  actions: Record<string, AlicizationRuntimeCheckpointActionProjection>
  pendingActionSettlements: Record<string, AlicizationActionSettlement>
  replyCommitted: boolean
  pendingDelivery?: AlicizationRuntimeReplyDeliveryIntent | null
  committedDelivery?: AlicizationRuntimeReplyDeliveryIntent | null
  terminalEventType: AlicizationRuntimeEventType | null
  issues: Array<{
    code: string
    sequence: number
    actionId?: string
  }>
}

export interface AlicizationRuntimeCheckpoint extends AlicizationRuntimeCheckpointScope {
  sequence: number
  status: AlicizationRuntimeCheckpointStatus
  activeActionIds: string[]
  deliveryOwner: AlicizationRuntimeDeliveryOwner
  projection: AlicizationRuntimeCheckpointProjection
  schemaVersion: 3
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
  projection_json: string
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
  checkpoint_projection_json: string | null
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
const runtimeCheckpointActionStatusSet = new Set<string>(alicizationRuntimeCheckpointActionStatuses)
const runtimeEventTypeSet = new Set<string>(alicizationRuntimeEventTypes)
const actionObservationOutcomeSet = new Set<string>([
  'success',
  'failure',
  'cancelled',
  'rejected',
])
const runtimeTurnTerminalEventByStatus: Record<
  AlicizationRuntimeCheckpointStatus,
  AlicizationRuntimeEventType | null
> = {
  'accepted': null,
  'running': null,
  'waiting': null,
  'recovery-required': null,
  'completed': 'turn.completed',
  'failed': 'turn.failed',
  'cancelled': 'runtime.cancelled',
  'timed-out': 'runtime.timed_out',
  'dead-lettered': 'runtime.dead_lettered',
}
const runtimeIssueCodeSet = new Set<string>(alicizationTurnRuntimeIssueCodes)

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${label} must be an object`)
  return value as Record<string, unknown>
}

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

function parseBoolean(value: unknown, label: string) {
  if (typeof value !== 'boolean')
    throw new TypeError(`${label} must be a boolean`)
  return value
}

function parseNullableText(value: unknown, label: string) {
  if (value === null)
    return null
  return parseRequiredText(value, label)
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

function parseActionStatus(
  value: unknown,
  label: string,
): AlicizationRuntimeCheckpointActionStatus {
  if (typeof value !== 'string' || !runtimeCheckpointActionStatusSet.has(value))
    throw new TypeError(`${label} must be a known action status`)
  return value as AlicizationRuntimeCheckpointActionStatus
}

function parseNullableActionStatus(
  value: unknown,
  label: string,
) {
  if (value === null)
    return null
  if (value === 'active')
    throw new TypeError(`${label} must be a terminal action status`)
  return parseActionStatus(value, label)
}

function parseNullableOutcome(
  value: unknown,
  label: string,
): AlicizationActionObservationLink['outcome'] | null {
  if (value === null)
    return null
  if (typeof value !== 'string' || !actionObservationOutcomeSet.has(value))
    throw new TypeError(`${label} must be a known action observation outcome`)
  return value as AlicizationActionObservationLink['outcome']
}

function canonicalizeJsonValue(value: unknown, label: string) {
  let json: string | undefined
  try {
    json = JSON.stringify(value)
  }
  catch (error) {
    throw new TypeError(`${label} must be JSON-safe: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (typeof json !== 'string')
    throw new TypeError(`${label} must be JSON-safe`)
  return JSON.parse(json) as unknown
}

function parseCheckpointObservation(
  value: unknown,
  label: string,
): AlicizationRuntimeCheckpointActionProjection['lastObservation'] {
  if (value === null)
    return null
  const observation = parseAlicizationActionObservation(value)
  const record = asRecord(value, label)
  return {
    ...observation,
    ...(Object.prototype.hasOwnProperty.call(record, 'output')
      ? { output: canonicalizeJsonValue(record.output, `${label}.output`) }
      : {}),
  }
}

function parseCheckpointAction(
  actionIdKey: string,
  value: unknown,
): AlicizationRuntimeCheckpointActionProjection {
  const record = asRecord(value, `checkpoint projection action ${actionIdKey}`)
  const actionId = parseRequiredText(record.actionId, 'checkpoint projection actionId')
  if (actionId !== actionIdKey)
    throw new TypeError('checkpoint projection action key must match actionId')

  const pendingTerminalStatus = parseNullableActionStatus(
    record.pendingTerminalStatus,
    'checkpoint projection pendingTerminalStatus',
  )
  const completionPendingObservation = parseBoolean(
    record.completionPendingObservation,
    'checkpoint projection completionPendingObservation',
  )
  if (completionPendingObservation !== (pendingTerminalStatus === 'completed')) {
    throw new TypeError(
      'checkpoint projection completionPendingObservation must match pendingTerminalStatus',
    )
  }

  return {
    actionId,
    toolCallId: parseNullableText(record.toolCallId, 'checkpoint projection toolCallId'),
    status: parseActionStatus(record.status, 'checkpoint projection action status'),
    terminalObservationId: parseNullableText(
      record.terminalObservationId,
      'checkpoint projection terminalObservationId',
    ),
    lastObservation: parseCheckpointObservation(
      record.lastObservation,
      'checkpoint projection lastObservation',
    ),
    outcome: parseNullableOutcome(record.outcome, 'checkpoint projection outcome'),
    pendingTerminalStatus,
    completionPendingObservation,
    lateEventCount: parseNonNegativeInteger(
      record.lateEventCount,
      'checkpoint projection lateEventCount',
    ),
    lastSequence: parseNonNegativeInteger(
      record.lastSequence,
      'checkpoint projection lastSequence',
    ),
  }
}

function parseCheckpointActionSettlements(
  value: unknown,
  actions: Record<string, AlicizationRuntimeCheckpointActionProjection>,
) {
  const settlementsRecord = asRecord(
    value,
    'checkpoint projection pendingActionSettlements',
  )
  const settlements: Record<string, AlicizationActionSettlement> = {}
  for (const [settlementIdKey, value] of Object.entries(settlementsRecord)) {
    const settlement = parseAlicizationActionSettlement(value)
    if (settlement.settlementId !== settlementIdKey) {
      throw new TypeError(
        'checkpoint projection settlement key must match settlementId',
      )
    }
    const action = actions[settlement.actionId]
    if (!action) {
      throw new TypeError(
        `checkpoint action settlement ${settlement.settlementId} references an unknown action`,
      )
    }
    if (action.toolCallId !== settlement.toolCallId) {
      throw new TypeError(
        `checkpoint action settlement ${settlement.settlementId} toolCallId does not match its action`,
      )
    }
    if (
      action.status !== 'active'
      && action.terminalObservationId !== settlement.observationId
    ) {
      throw new TypeError(
        `checkpoint action settlement ${settlement.settlementId} does not match its terminal observation`,
      )
    }
    if (Object.values(settlements).some(pending =>
      pending.actionId === settlement.actionId
      || pending.observationId === settlement.observationId,
    )) {
      throw new TypeError(
        `checkpoint action settlement ${settlement.settlementId} duplicates a pending action or observation`,
      )
    }
    settlements[settlement.settlementId] = settlement
  }
  return settlements
}

function expectedOutcomeForActionStatus(
  status: AlicizationRuntimeCheckpointActionStatus,
) {
  if (status === 'completed')
    return 'success'
  if (status === 'failed' || status === 'dead-lettered')
    return 'failure'
  return status
}

function assertCheckpointActionInvariant(
  action: AlicizationRuntimeCheckpointActionProjection,
  checkpointSequence: number,
) {
  if (action.lastSequence > checkpointSequence)
    throw new TypeError(`checkpoint action ${action.actionId} lastSequence exceeds checkpoint sequence`)

  const observation = action.lastObservation
  if (observation) {
    if (observation.actionId !== action.actionId)
      throw new TypeError(`checkpoint action ${action.actionId} observation actionId does not match`)
    if (observation.toolCallId !== action.toolCallId)
      throw new TypeError(`checkpoint action ${action.actionId} observation toolCallId does not match`)
  }

  if (action.status === 'active') {
    if (action.terminalObservationId !== null)
      throw new TypeError(`checkpoint active action ${action.actionId} cannot have a terminal observation`)
    if (action.outcome !== null)
      throw new TypeError(`checkpoint active action ${action.actionId} cannot have a terminal outcome`)
    if (observation?.terminal === true)
      throw new TypeError(`checkpoint active action ${action.actionId} cannot retain a terminal observation`)
    return
  }

  if (action.pendingTerminalStatus !== null)
    throw new TypeError(`checkpoint terminal action ${action.actionId} cannot have a pending terminal status`)
  if (action.completionPendingObservation)
    throw new TypeError(`checkpoint terminal action ${action.actionId} cannot await an observation`)
  if (!action.terminalObservationId || !observation)
    throw new TypeError(`checkpoint terminal action ${action.actionId} requires a terminal observation`)
  if (!observation.terminal)
    throw new TypeError(`checkpoint terminal action ${action.actionId} requires terminal observation=true`)
  if (observation.observationId !== action.terminalObservationId)
    throw new TypeError(`checkpoint action ${action.actionId} terminal observationId does not match`)
  if (action.outcome !== observation.outcome)
    throw new TypeError(`checkpoint action ${action.actionId} outcome does not match its observation`)
  if (observation.outcome !== expectedOutcomeForActionStatus(action.status))
    throw new TypeError(`checkpoint action ${action.actionId} status does not match its observation outcome`)
}

function parseCheckpointProjection(value: unknown): AlicizationRuntimeCheckpointProjection {
  const record = asRecord(value, 'checkpoint projection')
  const actionsRecord = asRecord(record.actions, 'checkpoint projection actions')
  const actions = Object.fromEntries(
    Object.entries(actionsRecord).map(([actionId, action]) => [
      actionId,
      parseCheckpointAction(actionId, action),
    ]),
  )
  const pendingActionSettlements = parseCheckpointActionSettlements(
    record.pendingActionSettlements,
    actions,
  )
  const terminalEventType = record.terminalEventType === null
    ? null
    : typeof record.terminalEventType === 'string' && runtimeEventTypeSet.has(record.terminalEventType)
      ? record.terminalEventType as AlicizationRuntimeEventType
      : (() => {
          throw new TypeError('checkpoint projection terminalEventType must be a known runtime event type')
        })()
  if (!Array.isArray(record.issues))
    throw new TypeError('checkpoint projection issues must be an array')
  const issues = record.issues.map((issue, index) => {
    const issueRecord = asRecord(issue, `checkpoint projection issue ${index}`)
    const code = parseRequiredText(issueRecord.code, 'checkpoint projection issue code')
    if (!runtimeIssueCodeSet.has(code))
      throw new TypeError(`checkpoint projection issue code ${code} is not defined by runtime-state`)
    return {
      code,
      sequence: parseNonNegativeInteger(
        issueRecord.sequence,
        'checkpoint projection issue sequence',
      ),
      ...(issueRecord.actionId === undefined
        ? {}
        : {
            actionId: parseRequiredText(
              issueRecord.actionId,
              'checkpoint projection issue actionId',
            ),
          }),
    }
  })
  const pendingDelivery = record.pendingDelivery === undefined || record.pendingDelivery === null
    ? null
    : parseAlicizationRuntimeReplyDeliveryIntent(record.pendingDelivery)
  const committedDelivery = record.committedDelivery === undefined || record.committedDelivery === null
    ? null
    : parseAlicizationRuntimeReplyDeliveryIntent(record.committedDelivery)

  return {
    actions,
    pendingActionSettlements,
    replyCommitted: parseBoolean(
      record.replyCommitted,
      'checkpoint projection replyCommitted',
    ),
    pendingDelivery,
    committedDelivery,
    terminalEventType,
    issues,
  }
}

function parseStatus(value: unknown): AlicizationRuntimeCheckpointStatus {
  if (typeof value !== 'string' || !runtimeCheckpointStatusSet.has(value))
    throw new TypeError(`checkpoint status must be one of ${alicizationRuntimeCheckpointStatuses.join(', ')}`)
  return value as AlicizationRuntimeCheckpointStatus
}

function parseSchemaVersion(value: unknown): 3 {
  if (value !== 3)
    throw new TypeError('checkpoint schemaVersion must be 3')
  return 3
}

export function parseAlicizationRuntimeCheckpoint(
  input: AlicizationRuntimeCheckpoint,
): AlicizationRuntimeCheckpoint {
  const scope = parseScope(input)
  const sequence = parseNonNegativeInteger(input.sequence, 'checkpoint sequence')
  const status = parseStatus(input.status)
  const activeActionIds = parseActiveActionIds(input.activeActionIds)
  const deliveryOwner = parseDeliveryOwner(input.deliveryOwner)
  const projection = parseCheckpointProjection(input.projection)
  const schemaVersion = parseSchemaVersion(input.schemaVersion)
  const updatedAt = parseNonNegativeInteger(input.updatedAt, 'checkpoint updatedAt')
  const projectedActiveActionIds = Object.values(projection.actions)
    .filter(action => action.status === 'active')
    .map(action => action.actionId)
    .sort()
  if (!isDeepStrictEqual([...activeActionIds].sort(), projectedActiveActionIds))
    throw new TypeError('checkpoint activeActionIds must match the projection active actions')

  for (const action of Object.values(projection.actions))
    assertCheckpointActionInvariant(action, sequence)
  for (const issue of projection.issues) {
    if (issue.sequence > sequence)
      throw new TypeError('checkpoint projection issue sequence exceeds checkpoint sequence')
  }

  const expectedTerminalEventType = runtimeTurnTerminalEventByStatus[status]
  if (projection.terminalEventType !== expectedTerminalEventType) {
    throw new TypeError(
      `checkpoint status ${status} does not match terminalEventType ${projection.terminalEventType ?? 'null'}`,
    )
  }
  if (projection.replyCommitted && projection.pendingDelivery)
    throw new TypeError('checkpoint cannot have replyCommitted and pendingDelivery together')
  if (projection.replyCommitted !== Boolean(projection.committedDelivery)) {
    throw new TypeError(
      'checkpoint replyCommitted must match committed delivery identity presence',
    )
  }
  if (projection.pendingDelivery) {
    assertAlicizationRuntimeReplyDeliveryScope(
      scope,
      deliveryOwner,
      projection.pendingDelivery,
    )
  }
  if (projection.committedDelivery) {
    assertAlicizationRuntimeReplyDeliveryScope(
      scope,
      deliveryOwner,
      projection.committedDelivery,
    )
  }
  if (
    projection.terminalEventType === 'turn.completed'
    && (
      !projection.replyCommitted
      || projection.pendingDelivery !== null
      || projection.committedDelivery === null
    )
  ) {
    throw new TypeError(
      'checkpoint turn.completed requires a committed reply and no pending delivery',
    )
  }

  return {
    ...scope,
    sequence,
    status,
    activeActionIds,
    deliveryOwner,
    projection,
    schemaVersion,
    updatedAt,
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

function sameCheckpointSemantics(
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
    && existing.activeActionIds.length === incoming.activeActionIds.length
    && existing.activeActionIds.every((actionId, index) => actionId === incoming.activeActionIds[index])
    && isDeepStrictEqual(existing.projection, incoming.projection)
}

function mapCheckpointRow(row: AlicizationRuntimeCheckpointRow) {
  let activeActionIds: unknown
  let projection: unknown
  try {
    activeActionIds = JSON.parse(row.active_action_ids_json)
    projection = JSON.parse(row.projection_json)
  }
  catch {
    throw new Error(`runtime checkpoint ${row.turn_id} has invalid checkpoint JSON`)
  }

  return parseAlicizationRuntimeCheckpoint({
    turnId: row.turn_id,
    cardId: row.card_id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    sequence: row.sequence,
    status: row.runtime_status as AlicizationRuntimeCheckpointStatus,
    activeActionIds: activeActionIds as string[],
    deliveryOwner: row.delivery_owner as AlicizationRuntimeDeliveryOwner,
    projection: projection as AlicizationRuntimeCheckpointProjection,
    schemaVersion: row.schema_version as 3,
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
          projection_json,
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
        checkpoint.projection_json AS checkpoint_projection_json,
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
          projection_json: checkpointRow.checkpoint_projection_json!,
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
    const checkpoint = parseAlicizationRuntimeCheckpoint(input)

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
            if (!sameCheckpointSemantics(existing, checkpoint))
              throw new Error('runtime checkpoint semantic projection must not change at the same sequence')
            if (checkpoint.updatedAt === existing.updatedAt)
              return existing
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
            projection_json,
            schema_version,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(turn_id)
          DO UPDATE SET
            card_id = excluded.card_id,
            user_id = excluded.user_id,
            conversation_id = excluded.conversation_id,
            sequence = excluded.sequence,
            runtime_status = excluded.runtime_status,
            active_action_ids_json = excluded.active_action_ids_json,
            delivery_owner = excluded.delivery_owner,
            projection_json = excluded.projection_json,
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
            JSON.stringify(checkpoint.projection),
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
