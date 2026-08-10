export const alicizationRuntimeEventTypes = [
  'turn.accepted',
  'turn.completed',
  'turn.failed',
  'context.assembly.started',
  'context.assembly.completed',
  'model.step.started',
  'model.text.delta',
  'model.tool_call.proposed',
  'model.memory_request.proposed',
  'model.skill_request.proposed',
  'model.clarification.proposed',
  'model.step.completed',
  'action.permission.checked',
  'action.rejected',
  'action.started',
  'action.progress',
  'action.output.delta',
  'action.observation',
  'action.completed',
  'action.failed',
  'action.cancelled',
  'action.retry.scheduled',
  'action.dead_lettered',
  'working_memory.snapshot.created',
  'working_memory.updated',
  'working_memory.compression.started',
  'working_memory.compression.completed',
  'long_term_memory.recall.started',
  'long_term_memory.recall.evidence',
  'long_term_memory.recall.abstained',
  'long_term_memory.recall.completed',
  'memory.write.proposed',
  'memory.write.accepted',
  'memory.write.rejected',
  'memory.tombstoned',
  'provider.failed',
  'provider.retry.scheduled',
  'tool.failed',
  'skill.failed',
  'permission.denied',
  'protocol.invalid',
  'runtime.timed_out',
  'runtime.cancelled',
  'runtime.recovery.started',
  'runtime.recovery.completed',
  'runtime.dead_lettered',
  'assistant.reply.committed',
] as const

export type AlicizationRuntimeEventType = typeof alicizationRuntimeEventTypes[number]

export const alicizationRuntimeEventSources = [
  'user',
  'model',
  'runtime',
  'tool',
  'skill',
  'memory',
  'system',
] as const

export type AlicizationRuntimeEventSource = typeof alicizationRuntimeEventSources[number]

export interface AlicizationRuntimeEventEnvelope<T = unknown> {
  eventId: string
  eventType: AlicizationRuntimeEventType
  schemaVersion: 1
  sequence: number
  turnId: string
  cardId: string
  userId: string
  conversationId: string
  source: AlicizationRuntimeEventSource
  causationId: string | null
  correlationId: string
  idempotencyKey: string | null
  occurredAt: number
  payload: T
}

export interface AlicizationCreateRuntimeEventInput<T> {
  eventId?: string
  eventType: AlicizationRuntimeEventType
  sequence?: number
  turnId: string
  cardId: string
  userId: string
  conversationId: string
  source: AlicizationRuntimeEventSource
  causationId?: string | null
  correlationId?: string
  idempotencyKey?: string | null
  occurredAt?: number
  payload: T
}

export interface AlicizationActionObservationLink {
  actionId: string
  observationId: string
  toolCallId: string | null
  terminal: boolean
  outcome: 'success' | 'failure' | 'cancelled' | 'rejected'
}

const runtimeEventTypeSet = new Set<string>(alicizationRuntimeEventTypes)
const runtimeEventSourceSet = new Set<string>(alicizationRuntimeEventSources)
const actionObservationOutcomes = new Set<string>([
  'success',
  'failure',
  'cancelled',
  'rejected',
])
const terminalRuntimeEventTypes = new Set<string>([
  'turn.completed',
  'turn.failed',
  'action.rejected',
  'action.completed',
  'action.failed',
  'action.cancelled',
  'action.dead_lettered',
  'runtime.timed_out',
  'runtime.cancelled',
  'runtime.dead_lettered',
  'assistant.reply.committed',
])

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${label} must be an object`)
  return value as Record<string, unknown>
}

function parseRequiredId(value: unknown, label: string) {
  if (typeof value !== 'string')
    throw new TypeError(`${label} must be a string`)
  const normalized = value.trim()
  if (!normalized)
    throw new TypeError(`${label} must not be empty`)
  return normalized
}

function parseNullableId(value: unknown, label: string) {
  if (value === null)
    return null
  return parseRequiredId(value, label)
}

function parseNonNegativeInteger(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    throw new TypeError(`${label} must be a non-negative integer`)
  return value
}

function parseRuntimeEventType(value: unknown): AlicizationRuntimeEventType {
  if (typeof value !== 'string' || !runtimeEventTypeSet.has(value))
    throw new TypeError('eventType must be a known Alicization runtime event type')
  return value as AlicizationRuntimeEventType
}

function parseRuntimeEventSource(value: unknown): AlicizationRuntimeEventSource {
  if (typeof value !== 'string' || !runtimeEventSourceSet.has(value))
    throw new TypeError('source must be a known Alicization runtime event source')
  return value as AlicizationRuntimeEventSource
}

function createRuntimeEventId() {
  if (typeof globalThis.crypto?.randomUUID === 'function')
    return globalThis.crypto.randomUUID()

  return `event-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createAlicizationRuntimeEvent<T>(
  input: AlicizationCreateRuntimeEventInput<T>,
): AlicizationRuntimeEventEnvelope<T> {
  const turnId = parseRequiredId(input.turnId, 'turnId')

  return parseAlicizationRuntimeEvent({
    eventId: input.eventId ?? createRuntimeEventId(),
    eventType: input.eventType,
    schemaVersion: 1,
    sequence: input.sequence ?? 0,
    turnId,
    cardId: input.cardId,
    userId: input.userId,
    conversationId: input.conversationId,
    source: input.source,
    causationId: input.causationId ?? null,
    correlationId: input.correlationId ?? turnId,
    idempotencyKey: input.idempotencyKey ?? null,
    occurredAt: input.occurredAt ?? Date.now(),
    payload: input.payload,
  }) as AlicizationRuntimeEventEnvelope<T>
}

export function parseAlicizationRuntimeEvent(
  value: unknown,
): AlicizationRuntimeEventEnvelope {
  const record = asRecord(value, 'runtime event')
  if (!Object.prototype.hasOwnProperty.call(record, 'payload'))
    throw new TypeError('runtime event payload is required')
  if (record.schemaVersion !== 1)
    throw new TypeError('schemaVersion must be 1')

  return {
    eventId: parseRequiredId(record.eventId, 'eventId'),
    eventType: parseRuntimeEventType(record.eventType),
    schemaVersion: 1,
    sequence: parseNonNegativeInteger(record.sequence, 'sequence'),
    turnId: parseRequiredId(record.turnId, 'turnId'),
    cardId: parseRequiredId(record.cardId, 'cardId'),
    userId: parseRequiredId(record.userId, 'userId'),
    conversationId: parseRequiredId(record.conversationId, 'conversationId'),
    source: parseRuntimeEventSource(record.source),
    causationId: parseNullableId(record.causationId, 'causationId'),
    correlationId: parseRequiredId(record.correlationId, 'correlationId'),
    idempotencyKey: parseNullableId(record.idempotencyKey, 'idempotencyKey'),
    occurredAt: parseNonNegativeInteger(record.occurredAt, 'occurredAt'),
    payload: record.payload,
  }
}

export function parseAlicizationActionObservation(
  value: unknown,
): AlicizationActionObservationLink {
  const record = asRecord(value, 'action observation')
  if (typeof record.terminal !== 'boolean')
    throw new TypeError('terminal must be a boolean')
  if (typeof record.outcome !== 'string' || !actionObservationOutcomes.has(record.outcome))
    throw new TypeError('outcome must be success, failure, cancelled, or rejected')

  return {
    actionId: parseRequiredId(record.actionId, 'actionId'),
    observationId: parseRequiredId(record.observationId, 'observationId'),
    toolCallId: record.toolCallId === undefined
      ? null
      : parseNullableId(record.toolCallId, 'toolCallId'),
    terminal: record.terminal,
    outcome: record.outcome as AlicizationActionObservationLink['outcome'],
  }
}

export function isAlicizationTerminalRuntimeEvent(eventType: string) {
  return terminalRuntimeEventTypes.has(eventType)
}
