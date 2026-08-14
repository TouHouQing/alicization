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
import { createAlicizationEventLoop } from './event-loop'
import {
  createAlicizationRuntimeReplyArtifact,
} from './reply-artifact'

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
  it('keeps duplicate tool progress idempotent across the event loop and SQLite store', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope({
      turnId: 'turn-duplicate-progress',
      conversationId: 'conversation-duplicate-progress',
    })
    const steps = [
      {
        kind: 'action' as const,
        action: {
          actionId: 'action-duplicate-progress',
          toolCallId: 'tool-call-duplicate-progress',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'coding_agent',
          input: {
            prompt: 'inspect the workspace',
          },
        },
      },
      {
        kind: 'reply' as const,
        reply: {
          artifact: createAlicizationRuntimeReplyArtifact({
            artifactVersion: 1,
            visibleText: '检查完成。',
            fullText: '检查完成。',
            finishReason: 'stop',
            visibleReplyExecution: {
              mode: 'provider-stream',
              expectedVisibleReplyAuthority: 'llm-mind',
              actualVisibleReplyAuthority: 'llm-mind',
              providerMindExecuted: true,
              reason: 'event-store-idempotency-test',
            },
            realization: {
              version: 'visible-reply-realization-v1',
              expectedAuthority: 'llm-mind',
              actualAuthority: 'llm-mind',
              providerMindExecuted: true,
              mode: 'provider-stream',
              visibleText: '检查完成。',
              visibleReplyValidationStatus: 'approved',
              nonHumanAuthoredStatus: null,
              blockedReasons: [],
              reason: 'event-store-idempotency-test',
              critic: {
                version: 'visible-reply-critic-public-summary-v1',
                status: 'pass',
                providerMindRequired: true,
                reasonCodes: [],
              },
              closure: {
                version: 'visible-reply-closure-public-summary-v1',
                status: 'approved',
                reasonCodes: [],
                initialCriticStatus: 'pass',
                finalCriticStatus: 'pass',
              },
            },
          }),
        },
      },
    ]
    const eventLoop = createAlicizationEventLoop({
      persistence: db,
      participant: {
        assembleContext: async () => ({}),
        runModelStep: async () => steps.shift()!,
        executeAction: async (action, runtime) => {
          const progress = {
            actionId: action.actionId,
            toolCallId: action.toolCallId!,
            capabilityId: action.capabilityId,
            providerToolName: action.providerToolName,
            selectedChannel: 'codex',
            phase: 'running' as const,
            signal: 'semantic-progress' as const,
            elapsedMs: 1_000,
            occurredAt: 2_000,
            eventId: 'duplicate-progress-event',
            summary: 'Inspecting the workspace.',
          }
          await runtime.appendActionProgress(progress)
          await runtime.appendActionProgress(progress)
          return {
            actionId: action.actionId,
            observationId: `${action.actionId}:observation`,
            toolCallId: action.toolCallId,
            terminal: true,
            outcome: 'success' as const,
            output: {
              ok: true,
            },
          }
        },
        settleReply: async () => {},
      },
    })

    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    const events = await db.listRuntimeEvents(scope)

    expect(result.status).toBe('completed')
    expect(events.filter(event => event.eventType === 'action.progress')).toHaveLength(1)

    await db.close()
  })

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

  it('lists runtime turn scopes for one user, card, and conversation in event order', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const firstScope = runtimeScope({
      turnId: 'turn-scope-1',
      conversationId: 'conversation-recovery',
    })
    const secondScope = runtimeScope({
      turnId: 'turn-scope-2',
      conversationId: 'conversation-recovery',
    })
    await db.appendRuntimeEvent(firstScope, runtimeEvent({
      eventId: 'event-scope-1',
      turnId: firstScope.turnId,
      conversationId: firstScope.conversationId,
      occurredAt: 1_000,
    }))
    await db.appendRuntimeEvent(secondScope, runtimeEvent({
      eventId: 'event-scope-2',
      turnId: secondScope.turnId,
      conversationId: secondScope.conversationId,
      occurredAt: 2_000,
    }))
    await db.appendRuntimeEvent(runtimeScope({
      turnId: 'turn-other-conversation',
      conversationId: 'conversation-other',
    }), runtimeEvent({
      eventId: 'event-other-conversation',
      turnId: 'turn-other-conversation',
      conversationId: 'conversation-other',
      occurredAt: 3_000,
    }))

    await expect(db.listRuntimeEventScopes({
      cardId: 'card-1',
      userId: 'user-1',
      conversationId: 'conversation-recovery',
      limit: 20,
    })).resolves.toEqual([
      {
        ...firstScope,
        startedAt: 1_000,
        updatedAt: 1_000,
      },
      {
        ...secondScope,
        startedAt: 2_000,
        updatedAt: 2_000,
      },
    ])

    await db.close()
  })

  it('limits to the latest turn scopes before returning them in stable event order', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const conversationId = 'conversation-limited-scope'
    const oldScope = runtimeScope({
      turnId: 'turn-old',
      conversationId,
    })
    const latestScope = runtimeScope({
      turnId: 'turn-latest',
      conversationId,
    })
    const tieLowScope = runtimeScope({
      turnId: 'turn-tie-a',
      conversationId,
    })
    const tieHighScope = runtimeScope({
      turnId: 'turn-tie-b',
      conversationId,
    })

    await db.appendRuntimeEvent(oldScope, runtimeEvent({
      eventId: 'event-old-1',
      turnId: oldScope.turnId,
      conversationId,
      occurredAt: 1_000,
    }))
    await db.appendRuntimeEvent(latestScope, runtimeEvent({
      eventId: 'event-latest-1',
      turnId: latestScope.turnId,
      conversationId,
      occurredAt: 2_000,
    }))
    await db.appendRuntimeEvent(latestScope, runtimeEvent({
      eventId: 'event-latest-2',
      eventType: 'context.assembly.completed',
      turnId: latestScope.turnId,
      conversationId,
      occurredAt: 5_000,
    }))
    await db.appendRuntimeEvent(tieLowScope, runtimeEvent({
      eventId: 'event-tie-low-1',
      turnId: tieLowScope.turnId,
      conversationId,
      occurredAt: 4_000,
    }))
    await db.appendRuntimeEvent(tieHighScope, runtimeEvent({
      eventId: 'event-tie-high-1',
      turnId: tieHighScope.turnId,
      conversationId,
      occurredAt: 4_000,
    }))
    await db.appendRuntimeEvent(runtimeScope({
      turnId: 'turn-foreign',
      cardId: 'card-foreign',
      userId: 'user-foreign',
      conversationId,
    }), runtimeEvent({
      eventId: 'event-foreign',
      turnId: 'turn-foreign',
      cardId: 'card-foreign',
      userId: 'user-foreign',
      conversationId,
      occurredAt: 6_000,
    }))

    await expect(db.listRuntimeEventScopes({
      cardId: 'card-1',
      userId: 'user-1',
      conversationId,
      limit: 2,
    })).resolves.toEqual([
      {
        ...latestScope,
        startedAt: 2_000,
        updatedAt: 5_000,
      },
      {
        ...tieHighScope,
        startedAt: 4_000,
        updatedAt: 4_000,
      },
    ])

    await db.close()
  })

  it('lists only turn scopes containing the requested runtime event types', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const dialogueOnlyScope = runtimeScope({
      turnId: 'turn-dialogue-only',
      conversationId: 'conversation-tool-scope-filter',
    })
    const toolScope = runtimeScope({
      turnId: 'turn-with-tool',
      conversationId: 'conversation-tool-scope-filter',
    })
    await db.appendRuntimeEvent(dialogueOnlyScope, runtimeEvent({
      eventId: 'event-dialogue-only',
      turnId: dialogueOnlyScope.turnId,
      conversationId: dialogueOnlyScope.conversationId,
      eventType: 'context.assembly.completed',
      occurredAt: 1_000,
    }))
    await db.appendRuntimeEvent(toolScope, runtimeEvent({
      eventId: 'event-tool-proposed',
      turnId: toolScope.turnId,
      conversationId: toolScope.conversationId,
      eventType: 'model.tool_call.proposed',
      occurredAt: 2_000,
    }))

    await expect(db.listRuntimeEventScopes({
      cardId: 'card-1',
      userId: 'user-1',
      conversationId: 'conversation-tool-scope-filter',
      eventTypes: [
        'model.tool_call.proposed',
        'action.started',
        'action.progress',
        'action.output.delta',
        'action.observation',
        'action.failed',
        'action.cancelled',
        'action.dead_lettered',
      ],
      limit: 20,
    })).resolves.toEqual([
      {
        ...toolScope,
        startedAt: 2_000,
        updatedAt: 2_000,
      },
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
