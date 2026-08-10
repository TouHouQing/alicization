import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'

import type { AlicizationRuntimeCheckpoint } from './checkpoint-store'
import type { AlicizationRuntimeEventScope } from './event-store'

import {
  createAlicizationRuntimeEvent,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationEventLoop,
} from './event-loop'
import { replayTurn } from './replay'
import {
  createAlicizationTurnRuntimeState,
  listAlicizationActiveActionIds,
  reduceAlicizationRuntimeEvent,
} from './runtime-state'

function runtimeScope(overrides: Partial<AlicizationRuntimeEventScope> = {}): AlicizationRuntimeEventScope {
  return {
    turnId: 'turn-1',
    cardId: 'card-1',
    userId: 'user-1',
    conversationId: 'conversation-1',
    ...overrides,
  }
}

function runtimeEvent(
  scope: AlicizationRuntimeEventScope,
  sequence: number,
  eventType: AlicizationRuntimeEventEnvelope['eventType'],
  payload: unknown,
) {
  return createAlicizationRuntimeEvent({
    eventId: `${scope.turnId}:event:${sequence}`,
    eventType,
    sequence,
    ...scope,
    source: 'runtime',
    occurredAt: 1_000 + sequence,
    payload,
  })
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function createPersistence() {
  const events: AlicizationRuntimeEventEnvelope[] = []
  const checkpoints: AlicizationRuntimeCheckpoint[] = []

  return {
    checkpoints,
    events,
    appendRuntimeEvent: vi.fn(async (
      scope: AlicizationRuntimeEventScope,
      input: AlicizationRuntimeEventEnvelope,
    ) => {
      const sequence = events.filter(event => event.turnId === scope.turnId).length + 1
      const event = {
        ...input,
        sequence,
      }
      events.push(event)
      return event
    }),
    saveRuntimeCheckpoint: vi.fn(async (checkpoint: AlicizationRuntimeCheckpoint) => {
      checkpoints.push(structuredClone(checkpoint))
      return checkpoint
    }),
  }
}

describe('alicization event loop', () => {
  it('does not finish an action before a terminal observation', () => {
    const scope = runtimeScope()
    let state = createAlicizationTurnRuntimeState(scope, 'inline')

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'action.started', {
      actionId: 'action-1',
      toolCallId: 'tool-call-1',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'action.completed', {
      actionId: 'action-1',
      toolCallId: 'tool-call-1',
    }))

    expect(state.actions['action-1']).toMatchObject({
      status: 'active',
      completionPendingObservation: true,
    })
    expect(listAlicizationActiveActionIds(state)).toEqual(['action-1'])

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 3, 'action.observation', {
      actionId: 'action-1',
      observationId: 'observation-progress',
      toolCallId: 'tool-call-1',
      terminal: false,
      outcome: 'success',
    }))
    expect(listAlicizationActiveActionIds(state)).toEqual(['action-1'])

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 4, 'action.observation', {
      actionId: 'action-1',
      observationId: 'observation-terminal',
      toolCallId: 'tool-call-1',
      terminal: true,
      outcome: 'success',
    }))
    expect(state.actions['action-1']).toMatchObject({
      status: 'completed',
      terminalObservationId: 'observation-terminal',
      completionPendingObservation: false,
    })
    expect(listAlicizationActiveActionIds(state)).toEqual([])
  })

  it('treats a matching terminal action event as confirmation of its observation', () => {
    const scope = runtimeScope()
    let state = createAlicizationTurnRuntimeState(scope, 'inline')

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'action.started', {
      actionId: 'action-failure',
      toolCallId: 'tool-call-failure',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'action.observation', {
      actionId: 'action-failure',
      observationId: 'observation-failure',
      toolCallId: 'tool-call-failure',
      terminal: true,
      outcome: 'failure',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 3, 'action.failed', {
      actionId: 'action-failure',
      toolCallId: 'tool-call-failure',
    }))

    expect(state.actions['action-failure']).toMatchObject({
      status: 'failed',
      terminalObservationId: 'observation-failure',
      lateEventCount: 0,
    })
    expect(state.issues).toEqual([])
  })

  it('advances the action cursor when success is confirmed after its terminal observation', () => {
    const scope = runtimeScope()
    let state = createAlicizationTurnRuntimeState(scope, 'inline')

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'action.started', {
      actionId: 'action-success',
      toolCallId: 'tool-call-success',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'action.observation', {
      actionId: 'action-success',
      observationId: 'observation-success',
      toolCallId: 'tool-call-success',
      terminal: true,
      outcome: 'success',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 3, 'action.completed', {
      actionId: 'action-success',
      toolCallId: 'tool-call-success',
    }))

    expect(state.actions['action-success']).toMatchObject({
      status: 'completed',
      terminalObservationId: 'observation-success',
      lastSequence: 3,
      lateEventCount: 0,
    })
    expect(state.issues).toEqual([])
  })

  it('keeps a dead-lettered action pending until its terminal observation arrives', () => {
    const scope = runtimeScope()
    let state = createAlicizationTurnRuntimeState(scope, 'inline')

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'action.started', {
      actionId: 'action-dead-lettered',
      toolCallId: 'tool-call-dead-lettered',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'action.dead_lettered', {
      actionId: 'action-dead-lettered',
      toolCallId: 'tool-call-dead-lettered',
    }))

    expect(state.actions['action-dead-lettered']).toMatchObject({
      status: 'active',
      outcome: null,
      pendingTerminalStatus: 'dead-lettered',
      lastSequence: 2,
    })
    expect(listAlicizationActiveActionIds(state)).toEqual(['action-dead-lettered'])
  })

  it('keeps the first pending action terminal when a different terminal arrives later', () => {
    const scope = runtimeScope()
    let state = createAlicizationTurnRuntimeState(scope, 'inline')

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'action.started', {
      actionId: 'action-first-terminal',
      toolCallId: 'tool-call-first-terminal',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'action.failed', {
      actionId: 'action-first-terminal',
      toolCallId: 'tool-call-first-terminal',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 3, 'action.cancelled', {
      actionId: 'action-first-terminal',
      toolCallId: 'tool-call-first-terminal',
    }))

    expect(state.actions['action-first-terminal']).toMatchObject({
      status: 'active',
      pendingTerminalStatus: 'failed',
      lastSequence: 2,
    })
    expect(state.issues).toEqual([
      {
        code: 'conflicting-action-terminal',
        sequence: 3,
        actionId: 'action-first-terminal',
      },
    ])

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 4, 'action.failed', {
      actionId: 'action-first-terminal',
      toolCallId: 'tool-call-first-terminal',
    }))
    expect(state.actions['action-first-terminal']).toMatchObject({
      pendingTerminalStatus: 'failed',
      lastSequence: 4,
    })
    expect(state.issues).toHaveLength(1)
  })

  it('rejects content drift for the same pending reply delivery identity', () => {
    const scope = runtimeScope({ turnId: 'turn-reply-content-drift' })
    let state = createAlicizationTurnRuntimeState(scope, 'inline')
    const deliveryIdentity = {
      replyId: 'turn-reply-content-drift:reply',
      deliveryId: 'turn-reply-content-drift:delivery:inline',
    }

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      1,
      'model.step.completed',
      {
        stepIndex: 1,
        outcome: 'reply',
        ...deliveryIdentity,
        text: 'first reply',
        contentHash: 'sha256:9b3ae2aded0bac2ca5da884965ca69f5951e25b12d550d9e59a61aeca9ffc8c6',
      },
    ))

    expect(() => reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      2,
      'model.step.completed',
      {
        stepIndex: 1,
        outcome: 'reply',
        ...deliveryIdentity,
        text: 'different reply',
        contentHash: 'sha256:fc4c8e1bc7be509b359cb4f983edaf79b00eba7a137090ad33de4850c150e4f2',
      },
    ))).toThrow(/content|delivery intent|hash/i)
  })

  it('does not accept a first reply commit without a pending delivery intent', () => {
    const scope = runtimeScope({ turnId: 'turn-orphan-reply-commit' })
    const state = reduceAlicizationRuntimeEvent(
      createAlicizationTurnRuntimeState(scope, 'inline'),
      runtimeEvent(scope, 1, 'assistant.reply.committed', {
        replyId: 'turn-orphan-reply-commit:reply',
        deliveryId: 'turn-orphan-reply-commit:delivery:inline',
        text: 'orphan reply',
        contentHash: 'sha256:9c100aa5e0c055fe53ee92e3d6be2862529a37c4a25429848244e852e8bf33a1',
      }),
    )

    expect(state.replyCommitted).toBe(false)
    expect((state as any).committedDelivery).toBeNull()
    expect(state.issues).toEqual([
      {
        code: 'orphan-reply-commit',
        sequence: 1,
      },
    ])
  })

  it('commits only the matching pending delivery identity', () => {
    const scope = runtimeScope({ turnId: 'turn-matching-reply-commit' })
    const intent = {
      replyId: 'turn-matching-reply-commit:reply',
      deliveryId: 'turn-matching-reply-commit:delivery:inline',
      text: 'matching reply',
      contentHash: 'sha256:e38268db8e41f1d2286c6ad7b8363f30ac709338b9c3545ad42562965141b2a3',
    }
    let state = createAlicizationTurnRuntimeState(scope, 'inline')
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      1,
      'model.step.completed',
      {
        stepIndex: 1,
        outcome: 'reply',
        ...intent,
      },
    ))

    expect(() => reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      2,
      'assistant.reply.committed',
      {
        ...intent,
        text: 'different reply',
        contentHash: 'sha256:fc4c8e1bc7be509b359cb4f983edaf79b00eba7a137090ad33de4850c150e4f2',
      },
    ))).toThrow(/commit|pending delivery|content|hash/i)

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      2,
      'assistant.reply.committed',
      intent,
    ))
    expect(state.replyCommitted).toBe(true)
    expect(state.pendingDelivery).toBeNull()
    expect((state as any).committedDelivery).toEqual({
      replyId: intent.replyId,
      deliveryId: intent.deliveryId,
      contentHash: intent.contentHash,
    })
  })

  it.each([
    ['another tool call', 'tool-call-other'],
    ['a missing tool call', null],
  ])('does not settle an action from %s observation identity', (_label, observationToolCallId) => {
    const scope = runtimeScope()
    let state = createAlicizationTurnRuntimeState(scope, 'inline')

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'action.started', {
      actionId: 'action-tool-call-drift',
      toolCallId: 'tool-call-expected',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'action.observation', {
      actionId: 'action-tool-call-drift',
      observationId: 'observation-drift',
      toolCallId: observationToolCallId,
      terminal: true,
      outcome: 'success',
    }))

    expect(state.actions['action-tool-call-drift']).toMatchObject({
      status: 'active',
      terminalObservationId: null,
      lastObservation: null,
    })
    expect(state.issues).toEqual([
      expect.objectContaining({
        code: 'tool-call-id-drift',
        actionId: 'action-tool-call-drift',
      }),
    ])
  })

  it.each([
    ['action.progress', 'missing', undefined],
    ['action.progress', 'different', 'tool-call-other'],
    ['action.output.delta', 'missing', undefined],
    ['action.output.delta', 'different', 'tool-call-other'],
    ['action.permission.checked', 'missing', undefined],
    ['action.permission.checked', 'different', 'tool-call-other'],
    ['action.retry.scheduled', 'missing', undefined],
    ['action.retry.scheduled', 'different', 'tool-call-other'],
  ] as const)('rejects %s with a %s toolCallId without advancing the action cursor', (
    eventType,
    _identityCase,
    toolCallId,
  ) => {
    const scope = runtimeScope({ turnId: `turn-${eventType}-${_identityCase}` })
    let state = createAlicizationTurnRuntimeState(scope, 'inline')
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'action.started', {
      actionId: 'action-tool-identity',
      toolCallId: 'tool-call-expected',
    }))

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, eventType, {
      actionId: 'action-tool-identity',
      ...(toolCallId === undefined ? {} : { toolCallId }),
    }))

    expect(state.sequence).toBe(2)
    expect(state.actions['action-tool-identity']?.lastSequence).toBe(1)
    expect(state.issues).toEqual([
      {
        code: 'tool-call-id-drift',
        sequence: 2,
        actionId: 'action-tool-identity',
      },
    ])
  })

  it('runs an action observation back through the model before committing a reply', async () => {
    const persistence = createPersistence()
    const settleReply = vi.fn(async () => {})
    const modelRuntimeActions: unknown[] = []
    const steps = [
      {
        kind: 'action' as const,
        action: {
          actionId: 'action-1',
          toolCallId: 'tool-call-1',
          qualifiedToolName: 'coding_agent.codex',
          input: { prompt: 'inspect the workspace' },
        },
      },
      {
        kind: 'reply' as const,
        reply: {
          text: '已经完成检查。',
        },
      },
    ]
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({ context: true })),
        runModelStep: vi.fn(async (_context, runtime) => {
          modelRuntimeActions.push(structuredClone(runtime.actions))
          return steps.shift()!
        }),
        executeAction: vi.fn(async action => ({
          actionId: action.actionId,
          observationId: 'observation-1',
          toolCallId: action.toolCallId,
          terminal: true,
          outcome: 'success' as const,
          output: { inspected: true },
        })),
        settleReply,
      },
      createEventId: (() => {
        let nextId = 0
        return () => `event-${++nextId}`
      })(),
      now: (() => {
        let now = 1_000
        return () => ++now
      })(),
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope(),
      deliveryOwner: 'inline',
      turnInput: { text: '请检查项目' },
    })

    expect(result.status).toBe('completed')
    expect(settleReply).toHaveBeenCalledWith(
      { text: '已经完成检查。' },
      expect.objectContaining({
        deliveryOwner: 'inline',
      }),
    )
    expect(persistence.events.map(event => event.eventType)).toEqual([
      'turn.accepted',
      'context.assembly.started',
      'context.assembly.completed',
      'model.step.started',
      'model.tool_call.proposed',
      'model.step.completed',
      'action.started',
      'action.observation',
      'action.completed',
      'model.step.started',
      'model.text.delta',
      'model.step.completed',
      'assistant.reply.committed',
      'turn.completed',
    ])
    const observationIndex = persistence.events.findIndex(event => event.eventType === 'action.observation')
    const completedIndex = persistence.events.findIndex(event => event.eventType === 'action.completed')
    expect(observationIndex).toBeGreaterThan(-1)
    expect(completedIndex).toBeGreaterThan(observationIndex)
    expect(modelRuntimeActions[1]).toMatchObject({
      'action-1': {
        status: 'completed',
        lastObservation: {
          actionId: 'action-1',
          observationId: 'observation-1',
          terminal: true,
          outcome: 'success',
          output: { inspected: true },
        },
      },
    })
  })

  it('does not let a participant mutate authoritative action state through a runtime view', async () => {
    const persistence = createPersistence()
    const steps = [
      {
        kind: 'action' as const,
        action: {
          actionId: 'action-isolated',
          toolCallId: 'tool-call-isolated',
          qualifiedToolName: 'coding_agent.codex',
          input: {},
        },
      },
      {
        kind: 'reply' as const,
        reply: {
          text: 'done',
        },
      },
    ]
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => steps.shift()!),
        executeAction: vi.fn(async (action, runtime) => {
          runtime.actions[action.actionId]!.status = 'failed'
          return {
            actionId: action.actionId,
            observationId: 'observation-isolated',
            toolCallId: action.toolCallId,
            terminal: true,
            outcome: 'success' as const,
            output: { ok: true },
          }
        }),
        settleReply: vi.fn(async () => {}),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-isolated-view' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(result.state.actions['action-isolated']).toMatchObject({
      status: 'completed',
      terminalObservationId: 'observation-isolated',
      lateEventCount: 0,
    })
    expect(result.state.issues).toEqual([])
  })

  it('does not mislabel reply delivery failure as a provider failure', async () => {
    const persistence = createPersistence()
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: { text: 'reply' },
        })),
        executeAction: vi.fn(),
        settleReply: vi.fn(async () => {
          throw new Error('renderer disconnected')
        }),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-delivery-failure' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(result).toMatchObject({
      status: 'failed',
      error: 'renderer disconnected',
    })
    expect(persistence.events.map(event => event.eventType)).not.toContain('provider.failed')
    expect(persistence.events.map(event => event.eventType)).not.toContain('tool.failed')
    expect(persistence.events.at(-1)).toMatchObject({
      eventType: 'turn.failed',
      payload: {
        error: 'renderer disconnected',
        surface: 'delivery',
      },
    })
  })

  it.each([
    {
      failure: 'assistant reply commit append',
      failAppendEventType: 'assistant.reply.committed',
      failReplyCheckpoint: false,
      expectedReasons: [
        'runtime-replay:delivery-pending',
        'runtime-replay:turn-started-without-terminal',
      ],
    },
    {
      failure: 'turn completion append',
      failAppendEventType: 'turn.completed',
      failReplyCheckpoint: false,
      expectedReasons: [
        'runtime-replay:reply-committed-without-turn-terminal',
        'runtime-replay:turn-started-without-terminal',
      ],
    },
    {
      failure: 'reply commit checkpoint',
      failAppendEventType: null,
      failReplyCheckpoint: true,
      expectedReasons: [
        'runtime-replay:reply-committed-without-turn-terminal',
        'runtime-replay:turn-started-without-terminal',
      ],
    },
  ])('persists a stable delivery intent before settleReply when $failure fails', async ({
    failAppendEventType,
    failReplyCheckpoint,
    expectedReasons,
  }) => {
    const persistence = createPersistence()
    const lifecycle: string[] = []
    const scope = runtimeScope({ turnId: 'turn-durable-reply' })
    const expectedIntent = {
      replyId: 'turn-durable-reply:reply',
      deliveryId: 'turn-durable-reply:delivery:inline',
      text: 'durable reply',
      contentHash: 'sha256:a21ed69d9aa01a4dbe6caa22b81ed2c02d7ce70de98517462ef3f2a358834a80',
    }
    let settledIntent: unknown = null

    persistence.appendRuntimeEvent.mockImplementation(async (
      eventScope: AlicizationRuntimeEventScope,
      input: AlicizationRuntimeEventEnvelope,
    ) => {
      if (input.eventType === failAppendEventType)
        throw new Error(`failed to persist ${input.eventType}`)
      const sequence = persistence.events.filter(event => event.turnId === eventScope.turnId).length + 1
      const event = {
        ...input,
        sequence,
      }
      persistence.events.push(event)
      return event
    })
    persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
      if (
        failReplyCheckpoint
        && checkpoint.projection.replyCommitted
        && checkpoint.projection.terminalEventType === null
      ) {
        throw new Error('failed to persist reply checkpoint')
      }
      persistence.checkpoints.push(structuredClone(checkpoint))
      if ((checkpoint.projection as any).pendingDelivery) {
        lifecycle.push('delivery-intent-persisted')
      }
      return checkpoint
    })

    const settleReply = vi.fn(async (_reply, runtime) => {
      lifecycle.push('reply-settled')
      settledIntent = (runtime as any).pendingDelivery
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: { text: '  durable reply \n' },
        })),
        executeAction: vi.fn(),
        settleReply,
      },
    })

    await expect(eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })).rejects.toThrow(/failed to persist/i)

    expect(settleReply).toHaveBeenCalledTimes(1)
    expect(settledIntent).toEqual(expectedIntent)
    expect(lifecycle.indexOf('delivery-intent-persisted')).toBeGreaterThanOrEqual(0)
    expect(lifecycle.indexOf('delivery-intent-persisted'))
      .toBeLessThan(lifecycle.indexOf('reply-settled'))
    expect(persistence.events.find(event =>
      event.eventType === 'model.step.completed'
      && (event.payload as { outcome?: string }).outcome === 'reply',
    )).toMatchObject({
      idempotencyKey: 'turn-durable-reply:delivery:inline:intent',
      payload: {
        ...expectedIntent,
        outcome: 'reply',
      },
    })
    expect(persistence.checkpoints.find(checkpoint =>
      checkpoint.projection.pendingDelivery,
    )?.projection.pendingDelivery).toEqual(expectedIntent)

    const checkpoint = persistence.checkpoints.at(-1) ?? null
    const tailEvents = persistence.events.filter(event =>
      event.sequence > (checkpoint?.sequence ?? 0),
    )
    const appendRuntimeEvent = vi.fn()
    const saveRuntimeCheckpoint = vi.fn()
    const executeAction = vi.fn()
    const replaySettleReply = vi.fn()
    const reader = {
      loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
      listRuntimeEvents: vi.fn(async () => tailEvents),
      appendRuntimeEvent,
      saveRuntimeCheckpoint,
      executeAction,
      settleReply: replaySettleReply,
    }
    const replay = await replayTurn({
      scope,
      reader,
      deliveryOwner: 'inline',
    })

    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual(expectedReasons)
    expect(appendRuntimeEvent).not.toHaveBeenCalled()
    expect(saveRuntimeCheckpoint).not.toHaveBeenCalled()
    expect(executeAction).not.toHaveBeenCalled()
    expect(replaySettleReply).not.toHaveBeenCalled()
  })

  it('records a terminal failure observation before settling a thrown tool action', async () => {
    const persistence = createPersistence()
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-tool-failure',
            toolCallId: 'tool-call-failure',
            qualifiedToolName: 'coding_agent.codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => {
          throw new Error('tool process crashed')
        }),
        settleReply: vi.fn(),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-tool-failure' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    const actionEvents = persistence.events.filter(event =>
      event.eventType === 'action.observation' || event.eventType === 'action.failed',
    )
    expect(actionEvents).toHaveLength(2)
    expect(actionEvents[0]).toMatchObject({
      eventType: 'action.observation',
      payload: {
        actionId: 'action-tool-failure',
        toolCallId: 'tool-call-failure',
        terminal: true,
        outcome: 'failure',
      },
    })
    expect((actionEvents[0]!.payload as { observationId?: string }).observationId).toEqual(expect.any(String))
    expect(actionEvents[1]).toMatchObject({
      eventType: 'action.failed',
      payload: {
        actionId: 'action-tool-failure',
        toolCallId: 'tool-call-failure',
      },
    })
    expect(result.state.actions['action-tool-failure']).toMatchObject({
      status: 'failed',
      terminalObservationId: expect.any(String),
      lastObservation: {
        terminal: true,
        outcome: 'failure',
      },
    })
  })

  it('does not fabricate tool failure after a successful observation append fails', async () => {
    const persistence = createPersistence()
    const persistenceError = new Error('failed to append successful observation')
    let injectedFailure = false
    persistence.appendRuntimeEvent.mockImplementation(async (
      scope: AlicizationRuntimeEventScope,
      input: AlicizationRuntimeEventEnvelope,
    ) => {
      if (
        !injectedFailure
        && input.eventType === 'action.observation'
        && (input.payload as { outcome?: string }).outcome === 'success'
      ) {
        injectedFailure = true
        throw persistenceError
      }
      const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
      const event = {
        ...input,
        sequence,
      }
      persistence.events.push(event)
      return event
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-observation-append-failure',
            toolCallId: 'tool-call-observation-append-failure',
            qualifiedToolName: 'coding_agent.codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => ({
          actionId: 'action-observation-append-failure',
          observationId: 'observation-success',
          toolCallId: 'tool-call-observation-append-failure',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(),
      },
    })

    await expect(eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-observation-append-failure' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })).rejects.toBe(persistenceError)

    const attemptedEvents = persistence.appendRuntimeEvent.mock.calls
      .map(([, event]) => event)
    expect(attemptedEvents.filter(event =>
      event.eventType === 'action.observation'
      && (event.payload as { outcome?: string }).outcome === 'failure',
    )).toEqual([])
    expect(attemptedEvents.map(event => event.eventType)).not.toContain('action.failed')
    expect(attemptedEvents.map(event => event.eventType)).not.toContain('tool.failed')
    expect(attemptedEvents.map(event => event.eventType)).not.toContain('turn.failed')
  })

  it('does not fabricate tool failure after a successful observation checkpoint fails', async () => {
    const persistence = createPersistence()
    const persistenceError = new Error('failed to checkpoint successful observation')
    let injectedFailure = false
    persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
      const action = checkpoint.projection.actions['action-observation-checkpoint-failure']
      if (
        !injectedFailure
        && action?.lastObservation?.outcome === 'success'
      ) {
        injectedFailure = true
        throw persistenceError
      }
      persistence.checkpoints.push(structuredClone(checkpoint))
      return checkpoint
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-observation-checkpoint-failure',
            toolCallId: 'tool-call-observation-checkpoint-failure',
            qualifiedToolName: 'coding_agent.codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => ({
          actionId: 'action-observation-checkpoint-failure',
          observationId: 'observation-success',
          toolCallId: 'tool-call-observation-checkpoint-failure',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(),
      },
    })

    await expect(eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-observation-checkpoint-failure' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })).rejects.toBe(persistenceError)

    const attemptedEvents = persistence.appendRuntimeEvent.mock.calls
      .map(([, event]) => event)
    expect(attemptedEvents.filter(event =>
      event.eventType === 'action.observation'
      && (event.payload as { outcome?: string }).outcome === 'failure',
    )).toEqual([])
    expect(attemptedEvents.map(event => event.eventType)).not.toContain('action.failed')
    expect(attemptedEvents.map(event => event.eventType)).not.toContain('tool.failed')
    expect(attemptedEvents.map(event => event.eventType)).not.toContain('turn.failed')
  })

  it('rejects a live tool observation from another tool call before it reaches the model', async () => {
    const persistence = createPersistence()
    const runModelStep = vi.fn()
      .mockResolvedValueOnce({
        kind: 'action' as const,
        action: {
          actionId: 'action-live-drift',
          toolCallId: 'tool-call-expected',
          qualifiedToolName: 'coding_agent.codex',
          input: {},
        },
      })
      .mockResolvedValueOnce({
        kind: 'reply' as const,
        reply: { text: 'should not run' },
      })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep,
        executeAction: vi.fn(async () => ({
          actionId: 'action-live-drift',
          observationId: 'wrong-observation',
          toolCallId: 'tool-call-other',
          terminal: true,
          outcome: 'success' as const,
          output: { wrong: true },
        })),
        settleReply: vi.fn(),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-live-drift' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(result.status).toBe('failed')
    expect(runModelStep).toHaveBeenCalledTimes(1)
    expect(persistence.events.some(event =>
      event.eventType === 'action.observation'
      && (event.payload as { observationId?: string }).observationId === 'wrong-observation',
    )).toBe(false)
    expect(result.state.actions['action-live-drift']).toMatchObject({
      status: 'failed',
      lastObservation: {
        terminal: true,
        outcome: 'failure',
      },
    })
  })

  it('keeps inline delivery separate from callback delivery', async () => {
    const persistence = createPersistence()
    const deliveryOwners: string[] = []
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: { text: 'ok' },
        })),
        executeAction: vi.fn(),
        settleReply: vi.fn(async (_reply, runtime) => {
          deliveryOwners.push(runtime.deliveryOwner)
        }),
      },
    })

    await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-inline' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-callback' }),
      deliveryOwner: 'callback',
      turnInput: {},
    })

    expect(deliveryOwners).toEqual(['inline', 'callback'])
    expect(persistence.events
      .filter(event => event.eventType === 'turn.accepted')
      .map(event => event.payload))
      .toEqual([
        { deliveryOwner: 'inline' },
        { deliveryOwner: 'callback' },
      ])
  })

  it('cancels active work and emits terminal cancellation events before ignoring late success', async () => {
    const persistence = createPersistence()
    const actionStarted = createDeferred<void>()
    const lateObservation = createDeferred<{
      actionId: string
      observationId: string
      toolCallId: string
      terminal: true
      outcome: 'success'
    }>()
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-cancel',
            toolCallId: 'tool-call-cancel',
            qualifiedToolName: 'coding_agent.codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => {
          actionStarted.resolve()
          return await lateObservation.promise
        }),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-cancel' })

    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await actionStarted.promise

    expect(await eventLoop.cancelTurn(scope, 'user cancelled')).toBe(true)
    await expect(running).resolves.toMatchObject({
      status: 'cancelled',
    })

    const terminalTypes = persistence.events
      .filter(event =>
        event.eventType === 'action.observation'
        || event.eventType === 'action.cancelled'
        || event.eventType === 'runtime.cancelled',
      )
      .map(event => event.eventType)
    expect(terminalTypes).toEqual([
      'action.observation',
      'action.cancelled',
      'runtime.cancelled',
    ])
    expect(persistence.events.find(event => event.eventType === 'action.observation')).toMatchObject({
      payload: {
        actionId: 'action-cancel',
        toolCallId: 'tool-call-cancel',
        terminal: true,
        outcome: 'cancelled',
      },
    })
    expect(persistence.checkpoints.at(-1)).toMatchObject({
      status: 'cancelled',
      activeActionIds: [],
    })

    lateObservation.resolve({
      actionId: 'action-cancel',
      observationId: 'late-success',
      toolCallId: 'tool-call-cancel',
      terminal: true,
      outcome: 'success',
    })
    await Promise.resolve()
    expect(persistence.events.some(event =>
      event.eventType === 'action.observation'
      && (event.payload as { observationId?: string }).observationId === 'late-success',
    )).toBe(false)
  })

  it('keeps cancelTurn pending until the runtime.cancelled checkpoint is durable', async () => {
    const persistence = createPersistence()
    const actionStarted = createDeferred<void>()
    const terminalCheckpointStarted = createDeferred<void>()
    const releaseTerminalCheckpoint = createDeferred<void>()
    persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
      persistence.checkpoints.push(structuredClone(checkpoint))
      if (checkpoint.status === 'cancelled') {
        terminalCheckpointStarted.resolve()
        await releaseTerminalCheckpoint.promise
      }
      return checkpoint
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-cancel-durability',
            toolCallId: 'tool-call-cancel-durability',
            qualifiedToolName: 'coding_agent.codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => {
          actionStarted.resolve()
          return await new Promise<never>(() => {})
        }),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-cancel-durability' })
    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await actionStarted.promise

    const cancellation = eventLoop.cancelTurn(scope, 'wait for durable cancellation')
    const cancellationSettled = vi.fn()
    void cancellation.then(cancellationSettled, cancellationSettled)
    await terminalCheckpointStarted.promise
    await Promise.resolve()

    expect(cancellationSettled).not.toHaveBeenCalled()

    releaseTerminalCheckpoint.resolve()
    await expect(cancellation).resolves.toBe(true)
    await expect(running).resolves.toMatchObject({
      status: 'cancelled',
    })
  })

  it('does not report cancellation success when the terminal checkpoint fails', async () => {
    const persistence = createPersistence()
    const actionStarted = createDeferred<void>()
    persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
      if (checkpoint.status === 'cancelled')
        throw new Error('failed to persist cancellation checkpoint')
      persistence.checkpoints.push(structuredClone(checkpoint))
      return checkpoint
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-cancel-failure',
            toolCallId: 'tool-call-cancel-failure',
            qualifiedToolName: 'coding_agent.codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => {
          actionStarted.resolve()
          return await new Promise<never>(() => {})
        }),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-cancel-failure' })
    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await actionStarted.promise

    const runningFailure = running.then(
      () => null,
      error => error,
    )
    await expect(eventLoop.cancelTurn(scope, 'durability failure'))
      .rejects
      .toThrow(/failed to persist cancellation checkpoint/i)
    await expect(runningFailure).resolves.toEqual(
      expect.objectContaining({
        message: 'failed to persist cancellation checkpoint',
      }),
    )
  })

  it('does not start tool side effects when cancellation wins during action.started checkpointing', async () => {
    const persistence = createPersistence()
    const actionStartedCheckpoint = createDeferred<void>()
    const releaseActionStartedCheckpoint = createDeferred<void>()
    persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
      persistence.checkpoints.push(structuredClone(checkpoint))
      if (checkpoint.activeActionIds.includes('action-before-side-effect')) {
        actionStartedCheckpoint.resolve()
        await releaseActionStartedCheckpoint.promise
      }
      return checkpoint
    })
    const executeAction = vi.fn(async () => ({
      actionId: 'action-before-side-effect',
      observationId: 'observation-too-late',
      toolCallId: 'tool-call-before-side-effect',
      terminal: true,
      outcome: 'success' as const,
    }))
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-before-side-effect',
            toolCallId: 'tool-call-before-side-effect',
            qualifiedToolName: 'coding_agent.codex',
            input: {},
          },
        })),
        executeAction,
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-cancel-before-side-effect' })

    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await actionStartedCheckpoint.promise
    const cancellation = eventLoop.cancelTurn(scope, 'cancel before execution')
    releaseActionStartedCheckpoint.resolve()
    const cancellationAccepted = await cancellation
    const result = await running

    expect(cancellationAccepted).toBe(true)
    expect(result.status).toBe('cancelled')
    expect(executeAction).not.toHaveBeenCalled()
  })

  it('does not append action completion when cancellation wins during observation persistence', async () => {
    const persistence = createPersistence()
    const observationAppendStarted = createDeferred<void>()
    const releaseObservationAppend = createDeferred<void>()
    persistence.appendRuntimeEvent.mockImplementation(async (
      scope: AlicizationRuntimeEventScope,
      input: AlicizationRuntimeEventEnvelope,
    ) => {
      const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
      const event = {
        ...input,
        sequence,
      }
      persistence.events.push(event)
      if (event.eventType === 'action.observation') {
        observationAppendStarted.resolve()
        await releaseObservationAppend.promise
      }
      return event
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-observation-race',
            toolCallId: 'tool-call-observation-race',
            qualifiedToolName: 'coding_agent.codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => ({
          actionId: 'action-observation-race',
          observationId: 'observation-race',
          toolCallId: 'tool-call-observation-race',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-observation-race' })

    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await observationAppendStarted.promise
    const cancellation = eventLoop.cancelTurn(scope, 'cancel during observation')
    releaseObservationAppend.resolve()
    const cancellationAccepted = await cancellation
    const result = await running

    expect(cancellationAccepted).toBe(true)
    expect(result.status).toBe('cancelled')
    expect(persistence.events.map(event => event.eventType)).not.toContain('action.completed')
  })

  it('keeps completion authoritative when cancellation arrives during reply commit persistence', async () => {
    const persistence = createPersistence()
    const replyCommitStarted = createDeferred<void>()
    const releaseReplyCommit = createDeferred<void>()
    persistence.appendRuntimeEvent.mockImplementation(async (
      scope: AlicizationRuntimeEventScope,
      input: AlicizationRuntimeEventEnvelope,
    ) => {
      const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
      const event = {
        ...input,
        sequence,
      }
      persistence.events.push(event)
      if (event.eventType === 'assistant.reply.committed') {
        replyCommitStarted.resolve()
        await releaseReplyCommit.promise
      }
      return event
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: { text: 'done' },
        })),
        executeAction: vi.fn(),
        settleReply: vi.fn(async () => {}),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-reply-commit-race' })

    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await replyCommitStarted.promise
    const cancellationAccepted = await eventLoop.cancelTurn(scope, 'too late')
    releaseReplyCommit.resolve()
    const result = await running

    expect(cancellationAccepted).toBe(false)
    expect(result.status).toBe('completed')
    expect(persistence.events.map(event => event.eventType)).not.toContain('runtime.cancelled')
  })

  it('does not accept cancellation after a terminal event has become authoritative', async () => {
    const persistence = createPersistence()
    const terminalCheckpointStarted = createDeferred<void>()
    const releaseTerminalCheckpoint = createDeferred<void>()
    persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
      persistence.checkpoints.push(structuredClone(checkpoint))
      if (checkpoint.status === 'completed') {
        terminalCheckpointStarted.resolve()
        await releaseTerminalCheckpoint.promise
      }
      return checkpoint
    })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: { text: 'done' },
        })),
        executeAction: vi.fn(),
        settleReply: vi.fn(async () => {}),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-terminal-race' })

    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await terminalCheckpointStarted.promise
    const cancellationAccepted = await eventLoop.cancelTurn(scope, 'too late')
    releaseTerminalCheckpoint.resolve()

    await expect(running).resolves.toMatchObject({
      status: 'completed',
    })
    expect(cancellationAccepted).toBe(false)
    expect(persistence.events.map(event => event.eventType)).not.toContain('runtime.cancelled')
  })

  it('rejects sequence, scope, and delivery-owner drift', () => {
    const scope = runtimeScope()
    const state = createAlicizationTurnRuntimeState(scope, 'inline')

    expect(() => reduceAlicizationRuntimeEvent(
      state,
      runtimeEvent(scope, 2, 'turn.accepted', { deliveryOwner: 'inline' }),
    )).toThrow(/sequence/i)
    expect(() => reduceAlicizationRuntimeEvent(
      state,
      runtimeEvent({ ...scope, userId: 'other-user' }, 1, 'turn.accepted', { deliveryOwner: 'inline' }),
    )).toThrow(/scope/i)
    expect(() => reduceAlicizationRuntimeEvent(
      state,
      runtimeEvent(scope, 1, 'turn.accepted', { deliveryOwner: 'callback' }),
    )).toThrow(/delivery owner/i)
  })
})
