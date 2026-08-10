import { describe, expect, it } from 'vitest'

import {
  createAlicizationRuntimeEvent,
  isAlicizationTerminalRuntimeEvent,
  parseAlicizationActionObservation,
  parseAlicizationRuntimeEvent,
} from './alicization-runtime-events'

describe('alicization runtime events', () => {
  it('creates a scoped event with injectable identity and timestamp', () => {
    const payload = { text: '你好', nested: { preserved: true } }
    const event = createAlicizationRuntimeEvent({
      eventId: ' event-1 ',
      eventType: 'turn.accepted',
      sequence: 3,
      turnId: ' turn-1 ',
      cardId: ' card-1 ',
      userId: ' user-1 ',
      conversationId: ' conversation-1 ',
      source: 'user',
      causationId: ' cause-1 ',
      correlationId: ' correlation-1 ',
      idempotencyKey: ' idempotency-1 ',
      occurredAt: 1_710_000_000_000,
      payload,
    })

    expect(event).toEqual({
      eventId: 'event-1',
      eventType: 'turn.accepted',
      schemaVersion: 1,
      sequence: 3,
      turnId: 'turn-1',
      cardId: 'card-1',
      userId: 'user-1',
      conversationId: 'conversation-1',
      source: 'user',
      causationId: 'cause-1',
      correlationId: 'correlation-1',
      idempotencyKey: 'idempotency-1',
      occurredAt: 1_710_000_000_000,
      payload,
    })
    expect(event.payload).toBe(payload)
  })

  it('uses stable defaults for a new turn event', () => {
    const event = createAlicizationRuntimeEvent({
      eventType: 'context.assembly.started',
      turnId: 'turn-2',
      cardId: 'card-2',
      userId: 'user-2',
      conversationId: 'conversation-2',
      source: 'runtime',
      payload: null,
    })

    expect(event.eventId).toEqual(expect.any(String))
    expect(event.eventId.length).toBeGreaterThan(0)
    expect(event.schemaVersion).toBe(1)
    expect(event.sequence).toBe(0)
    expect(event.correlationId).toBe('turn-2')
    expect(event.causationId).toBeNull()
    expect(event.idempotencyKey).toBeNull()
    expect(Number.isInteger(event.occurredAt)).toBe(true)
    expect(event.occurredAt).toBeGreaterThanOrEqual(0)
  })

  it.each([
    ['eventId', { eventId: '   ' }],
    ['turnId', { turnId: '   ' }],
    ['cardId', { cardId: '' }],
    ['userId', { userId: '\t' }],
    ['conversationId', { conversationId: '\n' }],
    ['correlationId', { correlationId: '   ' }],
    ['causationId', { causationId: '   ' }],
    ['idempotencyKey', { idempotencyKey: '   ' }],
  ])('rejects an empty %s', (_field, overrides) => {
    expect(() => createAlicizationRuntimeEvent({
      eventId: 'event-scope',
      eventType: 'model.step.started',
      turnId: 'turn-scope',
      cardId: 'card-scope',
      userId: 'user-scope',
      conversationId: 'conversation-scope',
      source: 'model',
      occurredAt: 10,
      payload: {},
      ...overrides,
    })).toThrow()
  })

  it.each([
    ['sequence', { sequence: -1 }],
    ['sequence', { sequence: 1.5 }],
    ['occurredAt', { occurredAt: -1 }],
    ['occurredAt', { occurredAt: 1.5 }],
  ])('rejects an invalid %s', (_field, overrides) => {
    expect(() => createAlicizationRuntimeEvent({
      eventId: 'event-number',
      eventType: 'provider.failed',
      turnId: 'turn-number',
      cardId: 'card-number',
      userId: 'user-number',
      conversationId: 'conversation-number',
      source: 'runtime',
      occurredAt: 10,
      payload: {},
      ...overrides,
    })).toThrow()
  })

  it('deeply validates a parsed envelope while preserving its payload', () => {
    const payload = {
      reply: '自然语言回复',
      nested: { values: ['a', 'b'] },
    }
    const event = parseAlicizationRuntimeEvent({
      eventId: ' event-parse ',
      eventType: 'assistant.reply.committed',
      schemaVersion: 1,
      sequence: 4,
      turnId: ' turn-parse ',
      cardId: ' card-parse ',
      userId: ' user-parse ',
      conversationId: ' conversation-parse ',
      source: 'model',
      causationId: null,
      correlationId: ' turn-parse ',
      idempotencyKey: null,
      occurredAt: 20,
      payload,
    })

    expect(event.eventId).toBe('event-parse')
    expect(event.turnId).toBe('turn-parse')
    expect(event.payload).toBe(payload)
    expect(() => parseAlicizationRuntimeEvent({
      ...event,
      source: 'unknown-source',
    })).toThrow()
    expect(() => parseAlicizationRuntimeEvent({
      ...event,
      schemaVersion: 0,
    })).toThrow()
    expect(() => parseAlicizationRuntimeEvent({
      ...event,
      payload,
      conversationId: {},
    })).toThrow()
    expect(() => {
      const { payload: _payload, ...withoutPayload } = event
      parseAlicizationRuntimeEvent(withoutPayload)
    }).toThrow()
  })

  it('rejects unknown event types', () => {
    expect(() => parseAlicizationRuntimeEvent({
      eventId: 'event-unknown',
      eventType: 'unknown.event',
      schemaVersion: 1,
      sequence: 0,
      turnId: 'turn-unknown',
      cardId: 'card-unknown',
      userId: 'user-unknown',
      conversationId: 'conversation-unknown',
      source: 'runtime',
      causationId: null,
      correlationId: 'turn-unknown',
      idempotencyKey: null,
      occurredAt: 30,
      payload: {},
    })).toThrow()
  })

  it('parses action observations only with stable links and valid outcomes', () => {
    expect(parseAlicizationActionObservation({
      actionId: ' action-1 ',
      observationId: ' observation-1 ',
      toolCallId: ' tool-call-1 ',
      terminal: true,
      outcome: 'success',
    })).toEqual({
      actionId: 'action-1',
      observationId: 'observation-1',
      toolCallId: 'tool-call-1',
      terminal: true,
      outcome: 'success',
    })
    expect(parseAlicizationActionObservation({
      actionId: 'action-2',
      observationId: 'observation-2',
      terminal: false,
      outcome: 'success',
    }).terminal).toBe(false)

    expect(() => parseAlicizationActionObservation({
      actionId: '',
      observationId: 'observation-1',
      terminal: true,
      outcome: 'success',
    })).toThrow()
    expect(() => parseAlicizationActionObservation({
      actionId: 'action-1',
      observationId: '',
      terminal: true,
      outcome: 'success',
    })).toThrow()
    expect(() => parseAlicizationActionObservation({
      actionId: 'action-1',
      observationId: 'observation-1',
      terminal: true,
      outcome: 'pending',
    })).toThrow()
    expect(() => parseAlicizationActionObservation({
      actionId: 'action-1',
      observationId: 'observation-1',
      terminal: 1,
      outcome: 'failure',
    })).toThrow()
  })

  it('classifies only settlement events as terminal runtime events', () => {
    expect(isAlicizationTerminalRuntimeEvent('turn.completed')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('turn.failed')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('action.completed')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('action.failed')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('action.cancelled')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('action.rejected')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('runtime.timed_out')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('runtime.cancelled')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('runtime.dead_lettered')).toBe(true)
    expect(isAlicizationTerminalRuntimeEvent('assistant.reply.committed')).toBe(true)

    expect(isAlicizationTerminalRuntimeEvent('action.observation')).toBe(false)
    expect(isAlicizationTerminalRuntimeEvent('action.progress')).toBe(false)
    expect(isAlicizationTerminalRuntimeEvent('provider.retry.scheduled')).toBe(false)
    expect(isAlicizationTerminalRuntimeEvent('unknown.event')).toBe(false)
  })
})
