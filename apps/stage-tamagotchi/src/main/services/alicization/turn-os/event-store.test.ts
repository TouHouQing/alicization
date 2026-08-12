import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createAlicizationRuntimeEvent,
} from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-event-store-test-'))
  sandboxDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(sandboxDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

function runtimeScope(overrides: Partial<{
  turnId: string
  cardId: string
  userId: string
  conversationId: string
}> = {}) {
  return {
    turnId: 'turn-1',
    cardId: 'card-1',
    userId: 'user-1',
    conversationId: 'conversation-1',
    ...overrides,
  }
}

function runtimeEvent(
  overrides: Partial<AlicizationRuntimeEventEnvelope<Record<string, unknown>>> = {},
) {
  const scope = runtimeScope(overrides)
  return createAlicizationRuntimeEvent({
    eventId: overrides.eventId ?? 'event-1',
    eventType: overrides.eventType ?? 'turn.accepted',
    sequence: overrides.sequence ?? 0,
    turnId: scope.turnId,
    cardId: scope.cardId,
    userId: scope.userId,
    conversationId: scope.conversationId,
    source: overrides.source ?? 'runtime',
    causationId: overrides.causationId ?? null,
    correlationId: overrides.correlationId ?? scope.turnId,
    idempotencyKey: overrides.idempotencyKey ?? null,
    occurredAt: overrides.occurredAt ?? 1_000,
    payload: Object.prototype.hasOwnProperty.call(overrides, 'payload')
      ? overrides.payload
      : { step: 'accepted' },
  })
}

function checkpointProjection() {
  return {
    actions: {},
    pendingActionSettlements: {},
    replyCommitted: false,
    terminalEventType: null,
    issues: [],
  }
}

const invalidJsonPayloadCases: Array<[string, () => unknown]> = [
  ['undefined', () => undefined],
  ['non-finite number', () => ({ value: Number.NaN })],
  ['infinite number', () => ({ value: Number.POSITIVE_INFINITY })],
  ['sparse array', () => {
    const value: string[] = []
    value.length = 2
    value[1] = 'present'
    return value
  }],
  ['Date', () => new Date(0)],
  ['Map', () => new Map([['key', 'value']])],
  ['class instance', () => new class RuntimePayload {
    value = 'class-instance'
  }()],
  ['BigInt', () => ({ value: 1n })],
  ['cyclic value', () => {
    const value: Record<string, unknown> = {}
    value.self = value
    return value
  }],
]

describe('alicization runtime event store', () => {
  it('appends events in sequence order per turn', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    const first = await db.appendRuntimeEvent(scope, runtimeEvent())
    const second = await db.appendRuntimeEvent(scope, runtimeEvent({
      eventId: 'event-2',
      eventType: 'context.assembly.started',
      occurredAt: 1_100,
      payload: { step: 'context' },
    }))

    expect([first.sequence, second.sequence]).toEqual([1, 2])
    expect((await db.listRuntimeEvents(scope)).map(event => event.eventId))
      .toEqual(['event-1', 'event-2'])

    await db.close()
  })

  it('rejects an event from another user/card scope', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.appendRuntimeEvent(scope, runtimeEvent())

    const foreignScope = runtimeScope({
      cardId: 'card-2',
      userId: 'user-2',
    })
    await expect(db.appendRuntimeEvent(foreignScope, runtimeEvent({
      eventId: 'event-foreign',
      cardId: foreignScope.cardId,
      userId: foreignScope.userId,
    }))).rejects.toThrow(/scope/i)
    await expect(db.listRuntimeEvents(foreignScope)).rejects.toThrow(/scope/i)

    await db.close()
  })

  it('returns the existing event for a duplicate idempotency key', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    const existing = await db.appendRuntimeEvent(scope, runtimeEvent({
      idempotencyKey: 'turn-accepted',
    }))
    const duplicate = await db.appendRuntimeEvent(scope, runtimeEvent({
      eventId: 'event-duplicate',
      idempotencyKey: 'turn-accepted',
      occurredAt: 1_500,
    }))
    const next = await db.appendRuntimeEvent(scope, runtimeEvent({
      eventId: 'event-2',
      eventType: 'context.assembly.started',
    }))

    expect(duplicate).toEqual(existing)
    expect(next.sequence).toBe(2)
    expect(await db.listRuntimeEvents(scope)).toHaveLength(2)

    await db.close()
  })

  it.each([
    ['event type', {
      eventId: 'event-idempotency-type-conflict',
      eventType: 'turn.completed' as const,
      idempotencyKey: 'turn-accepted',
    }],
    ['payload', {
      eventId: 'event-idempotency-payload-conflict',
      idempotencyKey: 'turn-accepted',
      payload: { step: 'different' },
    }],
  ])('rejects an idempotency conflict with different %s', async (_label, overrides) => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.appendRuntimeEvent(scope, runtimeEvent({
      idempotencyKey: 'turn-accepted',
    }))

    await expect(db.appendRuntimeEvent(scope, runtimeEvent(overrides)))
      .rejects
      .toThrow(/idempotency conflict/i)

    expect(await db.listRuntimeEvents(scope)).toHaveLength(1)
    await db.close()
  })

  it('rejects an event id reused for different content or turn', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.appendRuntimeEvent(scope, runtimeEvent())

    await expect(db.appendRuntimeEvent(scope, runtimeEvent({
      payload: { changed: true },
    }))).rejects.toThrow(/eventId/i)

    const anotherTurn = runtimeScope({ turnId: 'turn-2' })
    await expect(db.appendRuntimeEvent(anotherTurn, runtimeEvent({
      turnId: anotherTurn.turnId,
    }))).rejects.toThrow(/eventId/i)

    await db.close()
  })

  it.each(invalidJsonPayloadCases)('rejects a non JSON-safe %s payload before writing', async (_label, createPayload) => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    await expect(db.appendRuntimeEvent(scope, runtimeEvent({
      payload: createPayload() as Record<string, unknown>,
    })))
      .rejects
      .toThrow(/JSON-safe/i)
    expect(await db.listRuntimeEvents(scope)).toEqual([])

    await db.close()
  })

  it('returns and replays the canonical JSON payload', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    const payload = {
      nested: {
        values: [1, true, null, 'stable'],
      },
    }

    const appended = await db.appendRuntimeEvent(scope, runtimeEvent({ payload }))
    const replayed = (await db.listRuntimeEvents(scope))[0]

    expect(appended.payload).toEqual(payload)
    expect(appended.payload).not.toBe(payload)
    expect(replayed?.payload).toEqual(appended.payload)

    await db.close()
  })

  it('rejects a foreign event when a checkpoint already owns the turn', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const checkpointScope = runtimeScope()
    await db.saveRuntimeCheckpoint({
      ...checkpointScope,
      sequence: 0,
      status: 'accepted',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
    })
    const foreignScope = runtimeScope({
      userId: 'user-foreign',
      conversationId: 'conversation-foreign',
    })

    await expect(db.appendRuntimeEvent(foreignScope, runtimeEvent({
      eventId: 'event-foreign-checkpoint-owner',
      userId: foreignScope.userId,
      conversationId: foreignScope.conversationId,
    })))
      .rejects
      .toThrow(/scope/i)
    await expect(db.listRuntimeEvents(foreignScope))
      .rejects
      .toThrow(/scope/i)

    await db.close()
  })

  it('rejects a bound-card event when user and conversation diverge from the checkpoint', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'card-1',
    })
    const checkpointScope = runtimeScope()
    await db.saveRuntimeCheckpoint({
      ...checkpointScope,
      sequence: 0,
      status: 'accepted',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
    })
    const foreignScope = runtimeScope({
      userId: 'user-bound-foreign',
      conversationId: 'conversation-bound-foreign',
    })

    await expect(db.appendRuntimeEvent(foreignScope, runtimeEvent({
      eventId: 'event-bound-foreign',
      userId: foreignScope.userId,
      conversationId: foreignScope.conversationId,
    })))
      .rejects
      .toThrow(/scope/i)

    await db.close()
  })

  it('lists events after a cursor without changing order', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    await db.appendRuntimeEvent(scope, runtimeEvent())
    await db.appendRuntimeEvent(scope, runtimeEvent({
      eventId: 'event-2',
      eventType: 'context.assembly.started',
    }))
    await db.appendRuntimeEvent(scope, runtimeEvent({
      eventId: 'event-3',
      eventType: 'context.assembly.completed',
    }))

    const tail = await db.listRuntimeEvents(scope, { afterSequence: 1 })

    expect(tail.map(event => [event.eventId, event.sequence])).toEqual([
      ['event-2', 2],
      ['event-3', 3],
    ])

    await db.close()
  })

  it('validates the event envelope before writing', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    const invalid = {
      ...runtimeEvent(),
      schemaVersion: 3,
    }

    await expect(db.appendRuntimeEvent(scope, invalid as AlicizationRuntimeEventEnvelope))
      .rejects
      .toThrow('schemaVersion must be 1')
    expect(await db.listRuntimeEvents(scope)).toEqual([])

    await db.close()
  })
})
