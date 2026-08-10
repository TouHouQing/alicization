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
  replayTurn,
} from './replay'
import {
  createAlicizationTurnRuntimeState,
  reduceAlicizationRuntimeEvent,
  toAlicizationRuntimeCheckpoint,
} from './runtime-state'

function runtimeScope(overrides: Partial<AlicizationRuntimeEventScope> = {}): AlicizationRuntimeEventScope {
  return {
    turnId: 'turn-replay',
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
    occurredAt: 2_000 + sequence,
    payload,
  })
}

function runtimeCheckpoint(
  scope: AlicizationRuntimeEventScope,
  overrides: Partial<AlicizationRuntimeCheckpoint> = {},
): AlicizationRuntimeCheckpoint {
  const activeActionIds = overrides.activeActionIds ?? ['action-1']
  const status = overrides.status ?? 'waiting'
  return {
    ...scope,
    sequence: 3,
    status,
    activeActionIds,
    deliveryOwner: 'inline',
    projection: {
      actions: Object.fromEntries(activeActionIds.map(actionId => [
        actionId,
        {
          actionId,
          toolCallId: null,
          status: 'active' as const,
          terminalObservationId: null,
          lastObservation: null,
          outcome: null,
          pendingTerminalStatus: null,
          completionPendingObservation: false,
          lateEventCount: 0,
          lastSequence: overrides.sequence ?? 3,
        },
      ])),
      replyCommitted: false,
      pendingDelivery: null,
      committedDelivery: null,
      terminalEventType: status === 'cancelled'
        ? 'runtime.cancelled'
        : status === 'completed'
          ? 'turn.completed'
          : status === 'failed'
            ? 'turn.failed'
            : null,
      issues: [],
    },
    schemaVersion: 2,
    updatedAt: 3_000,
    ...overrides,
  }
}

describe('alicization turn replay', () => {
  it('preserves a committed reply when replay resumes from a checkpoint with no tail', async () => {
    const scope = runtimeScope({ turnId: 'turn-reply-checkpoint' })
    const intent = {
      replyId: 'turn-reply-checkpoint:reply',
      deliveryId: 'turn-reply-checkpoint:delivery:inline',
      text: 'already delivered',
      contentHash: 'sha256:f9c19358298ab7c80ff1ccf83c042aa107c1112595a61a9960f6151a6bfde474',
    }
    let state = createAlicizationTurnRuntimeState(scope, 'inline')
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'turn.accepted', {
      deliveryOwner: 'inline',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'model.step.completed', {
      stepIndex: 1,
      outcome: 'reply',
      ...intent,
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      3,
      'assistant.reply.committed',
      intent,
    ))
    const checkpoint = toAlicizationRuntimeCheckpoint(state, 3_000)

    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => []),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.replyCommitted).toBe(true)
    expect((replay.state as any).committedDelivery).toEqual({
      replyId: intent.replyId,
      deliveryId: intent.deliveryId,
      contentHash: intent.contentHash,
    })
    expect(replay.state.sequence).toBe(3)
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual([
      'runtime-replay:reply-committed-without-turn-terminal',
      'runtime-replay:turn-started-without-terminal',
    ])
  })

  it('marks a durable pending delivery as recoveryRequired without settling it again', async () => {
    const scope = runtimeScope({ turnId: 'turn-delivery-pending' })
    const checkpoint = runtimeCheckpoint(scope, {
      sequence: 3,
      status: 'running',
      activeActionIds: [],
      projection: {
        actions: {},
        replyCommitted: false,
        terminalEventType: null,
        issues: [],
        pendingDelivery: {
          replyId: 'turn-delivery-pending:reply',
          deliveryId: 'turn-delivery-pending:delivery:inline',
          text: 'pending reply',
          contentHash: 'sha256:523d68ba82d629ea759cc536f04f5df13b56eaf679db08e8d4af17167f2cfdda',
        },
      } as any,
    })
    const settleReply = vi.fn()
    const reader = {
      loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
      listRuntimeEvents: vi.fn(async () => []),
      settleReply,
    }

    const replay = await replayTurn({
      scope,
      reader,
      deliveryOwner: 'inline',
    })

    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual([
      'runtime-replay:delivery-pending',
      'runtime-replay:turn-started-without-terminal',
    ])
    expect(settleReply).not.toHaveBeenCalled()
  })

  it('marks an orphan reply commit as recoveryRequired without accepting it', async () => {
    const scope = runtimeScope({ turnId: 'turn-replay-orphan-commit' })
    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent(scope, 1, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
          runtimeEvent(scope, 2, 'assistant.reply.committed', {
            replyId: 'turn-replay-orphan-commit:reply',
            deliveryId: 'turn-replay-orphan-commit:delivery:inline',
            text: 'orphan reply',
            contentHash: 'sha256:9c100aa5e0c055fe53ee92e3d6be2862529a37c4a25429848244e852e8bf33a1',
          }),
        ]),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.replyCommitted).toBe(false)
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toContain('runtime-replay:orphan-reply-commit')
  })

  it('marks turn.completed without a committed reply as recoveryRequired', async () => {
    const scope = runtimeScope({ turnId: 'turn-completed-without-commit' })
    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent(scope, 1, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
          runtimeEvent(scope, 2, 'turn.completed', {}),
        ]),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.status).toBe('completed')
    expect(replay.state.replyCommitted).toBe(false)
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toContain(
      'runtime-replay:completed-without-reply-commit',
    )
  })

  it('restores the exact normalized reply body from an intent checkpoint with no tail', async () => {
    const scope = runtimeScope({ turnId: 'turn-delivery-body-recovery' })
    const expectedIntent = {
      replyId: 'turn-delivery-body-recovery:reply',
      deliveryId: 'turn-delivery-body-recovery:delivery:inline',
      text: 'recovered body',
      contentHash: 'sha256:9355851025ea0dbc3072ed2d1d7d0fc74e4fa7e7137e02bdeffbc57d983b622b',
    }
    const checkpoint = runtimeCheckpoint(scope, {
      sequence: 3,
      status: 'running',
      activeActionIds: [],
      projection: {
        actions: {},
        replyCommitted: false,
        pendingDelivery: expectedIntent,
        terminalEventType: null,
        issues: [],
      } as any,
    })

    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => []),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.pendingDelivery).toEqual(expectedIntent)
    expect(replay.tailEvents).toEqual([])
    expect(replay.reasonCodes).toContain('runtime-replay:delivery-pending')
  })

  it('marks an accepted turn without a terminal event as recoveryRequired', async () => {
    const scope = runtimeScope({ turnId: 'turn-started-non-terminal' })

    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent(scope, 1, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
        ]),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual([
      'runtime-replay:turn-started-without-terminal',
    ])
  })

  it('preserves a completed action observation when replay resumes from an empty tail', async () => {
    const scope = runtimeScope({ turnId: 'turn-action-checkpoint' })
    let state = createAlicizationTurnRuntimeState(scope, 'inline')
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'turn.accepted', {
      deliveryOwner: 'inline',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'action.started', {
      actionId: 'action-completed',
      toolCallId: 'tool-call-completed',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 3, 'action.observation', {
      actionId: 'action-completed',
      observationId: 'observation-completed',
      toolCallId: 'tool-call-completed',
      terminal: true,
      outcome: 'success',
      output: { changedFiles: 2 },
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 4, 'action.completed', {
      actionId: 'action-completed',
      toolCallId: 'tool-call-completed',
    }))
    const checkpoint = toAlicizationRuntimeCheckpoint(state, 3_000)

    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => []),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.actions['action-completed']).toMatchObject({
      toolCallId: 'tool-call-completed',
      status: 'completed',
      terminalObservationId: 'observation-completed',
      lastObservation: {
        output: { changedFiles: 2 },
      },
    })
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual([
      'runtime-replay:turn-started-without-terminal',
    ])
  })

  it('preserves pending terminal action identity across checkpoint recovery', async () => {
    const scope = runtimeScope({ turnId: 'turn-pending-checkpoint' })
    let state = createAlicizationTurnRuntimeState(scope, 'inline')
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 1, 'turn.accepted', {
      deliveryOwner: 'inline',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 2, 'action.started', {
      actionId: 'action-pending',
      toolCallId: 'tool-call-pending',
    }))
    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(scope, 3, 'action.failed', {
      actionId: 'action-pending',
      toolCallId: 'tool-call-pending',
    }))
    const checkpoint = toAlicizationRuntimeCheckpoint(state, 3_000)

    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => []),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.actions['action-pending']).toMatchObject({
      toolCallId: 'tool-call-pending',
      status: 'active',
      pendingTerminalStatus: 'failed',
      completionPendingObservation: false,
    })
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toContain('runtime-replay:terminal-event-awaiting-observation')
  })

  it('marks an unresolved checkpoint action as recoveryRequired without executing side effects', async () => {
    const scope = runtimeScope()
    const checkpoint = runtimeCheckpoint(scope)
    const appendRuntimeEvent = vi.fn()
    const saveRuntimeCheckpoint = vi.fn()
    const executeAction = vi.fn()
    const settleReply = vi.fn()
    const reader = {
      loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
      listRuntimeEvents: vi.fn(async () => []),
      appendRuntimeEvent,
      saveRuntimeCheckpoint,
      executeAction,
      settleReply,
    }

    const replay = await replayTurn({
      scope,
      reader,
      deliveryOwner: 'inline',
    })

    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toContain('runtime-replay:active-actions-unsettled')
    expect(replay.state.actions['action-1']).toMatchObject({
      status: 'active',
      restoredFromCheckpoint: true,
    })
    expect(reader.listRuntimeEvents).toHaveBeenCalledWith(scope, {
      afterSequence: 3,
    })
    expect(appendRuntimeEvent).not.toHaveBeenCalled()
    expect(saveRuntimeCheckpoint).not.toHaveBeenCalled()
    expect(executeAction).not.toHaveBeenCalled()
    expect(settleReply).not.toHaveBeenCalled()
  })

  it('rebuilds checkpoint plus tail and clears recoveryRequired after terminal observation', async () => {
    const scope = runtimeScope()
    const checkpoint = runtimeCheckpoint(scope)
    const tail = [
      runtimeEvent(scope, 4, 'action.observation', {
        actionId: 'action-1',
        observationId: 'observation-terminal',
        toolCallId: 'tool-call-1',
        terminal: true,
        outcome: 'success',
      }),
      runtimeEvent(scope, 5, 'action.completed', {
        actionId: 'action-1',
      }),
      runtimeEvent(scope, 6, 'model.step.completed', {
        stepIndex: 1,
        outcome: 'reply',
        replyId: `${scope.turnId}:reply`,
        deliveryId: `${scope.turnId}:delivery:inline`,
        text: '恢复完成。',
        contentHash: 'sha256:811eaf1c75836e1323843f9b09012cf4ca697e65429df37c615fd9831d21a854',
      }),
      runtimeEvent(scope, 7, 'assistant.reply.committed', {
        replyId: `${scope.turnId}:reply`,
        deliveryId: `${scope.turnId}:delivery:inline`,
        text: '恢复完成。',
        contentHash: 'sha256:811eaf1c75836e1323843f9b09012cf4ca697e65429df37c615fd9831d21a854',
      }),
      runtimeEvent(scope, 8, 'turn.completed', {}),
    ]

    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => tail),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.tailEvents).toEqual(tail)
    expect(replay.state.sequence).toBe(8)
    expect(replay.state.status).toBe('completed')
    expect(replay.state.actions['action-1']).toMatchObject({
      status: 'completed',
      terminalObservationId: 'observation-terminal',
    })
    expect(replay.recoveryRequired).toBe(false)
    expect(replay.reasonCodes).toEqual([])
  })

  it('does not reopen a terminal action after duplicate late progress', async () => {
    const scope = runtimeScope()
    const events = [
      runtimeEvent(scope, 1, 'turn.accepted', {
        deliveryOwner: 'inline',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
      }),
      runtimeEvent(scope, 3, 'action.observation', {
        actionId: 'action-1',
        observationId: 'observation-terminal',
        toolCallId: 'tool-call-1',
        terminal: true,
        outcome: 'success',
      }),
      runtimeEvent(scope, 4, 'action.completed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
      }),
      runtimeEvent(scope, 5, 'action.progress', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        summary: 'late duplicate progress',
      }),
    ]

    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => events),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.actions['action-1']).toMatchObject({
      status: 'completed',
      lateEventCount: 1,
    })
    expect(replay.state.issues.map(issue => issue.code)).toContain('late-action-event')
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual([
      'runtime-replay:turn-started-without-terminal',
    ])
  })

  it('keeps cancellation authoritative when a late successful observation arrives', async () => {
    const scope = runtimeScope()
    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent(scope, 1, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
          runtimeEvent(scope, 2, 'action.started', {
            actionId: 'action-cancelled',
            toolCallId: 'tool-call-cancelled',
          }),
          runtimeEvent(scope, 3, 'action.observation', {
            actionId: 'action-cancelled',
            observationId: 'observation-cancelled',
            toolCallId: 'tool-call-cancelled',
            terminal: true,
            outcome: 'cancelled',
          }),
          runtimeEvent(scope, 4, 'action.cancelled', {
            actionId: 'action-cancelled',
            toolCallId: 'tool-call-cancelled',
          }),
          runtimeEvent(scope, 5, 'runtime.cancelled', {
            reason: 'user cancelled',
          }),
          runtimeEvent(scope, 6, 'action.observation', {
            actionId: 'action-cancelled',
            observationId: 'late-success',
            toolCallId: 'tool-call-cancelled',
            terminal: true,
            outcome: 'success',
          }),
          runtimeEvent(scope, 7, 'turn.completed', {}),
        ]),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.status).toBe('cancelled')
    expect(replay.state.terminalEventType).toBe('runtime.cancelled')
    expect(replay.state.actions['action-cancelled']).toMatchObject({
      status: 'cancelled',
      lateEventCount: 1,
    })
    expect(replay.state.issues.map(issue => issue.code)).toEqual([
      'late-action-event',
      'late-turn-terminal',
    ])
  })

  it('does not commit a late reply after the turn was cancelled', async () => {
    const scope = runtimeScope()
    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent(scope, 1, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
          runtimeEvent(scope, 2, 'runtime.cancelled', {
            reason: 'user cancelled',
          }),
          runtimeEvent(scope, 3, 'assistant.reply.committed', {
            text: 'late reply',
          }),
        ]),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.status).toBe('cancelled')
    expect(replay.state.replyCommitted).toBe(false)
    expect(replay.state.issues).toEqual([
      expect.objectContaining({
        code: 'late-reply-commit',
        sequence: 3,
      }),
    ])
  })

  it('does not create a new active action after the turn became terminal', async () => {
    const scope = runtimeScope()
    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent(scope, 1, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
          runtimeEvent(scope, 2, 'turn.failed', {
            error: 'provider failed',
          }),
          runtimeEvent(scope, 3, 'action.started', {
            actionId: 'late-action',
            toolCallId: 'late-tool-call',
          }),
        ]),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.status).toBe('failed')
    expect(replay.state.actions).toEqual({})
    expect(replay.state.issues).toEqual([
      expect.objectContaining({
        code: 'late-action-event',
        sequence: 3,
        actionId: 'late-action',
      }),
    ])
    expect(replay.recoveryRequired).toBe(false)
  })

  it('requires recovery when a terminal checkpoint still contains active actions', async () => {
    const scope = runtimeScope()
    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => runtimeCheckpoint(scope, {
          status: 'cancelled',
          activeActionIds: ['action-unsettled'],
        })),
        listRuntimeEvents: vi.fn(async () => []),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual([
      'runtime-replay:active-actions-unsettled',
      'runtime-replay:terminal-turn-has-active-actions',
    ])
  })

  it('rejects an orphan progress event instead of inventing an action', async () => {
    const scope = runtimeScope()
    const replay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent(scope, 1, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
          runtimeEvent(scope, 2, 'action.progress', {
            actionId: 'unknown-action',
          }),
        ]),
      },
      deliveryOwner: 'inline',
    })

    expect(replay.state.actions).toEqual({})
    expect(replay.state.issues).toEqual([
      expect.objectContaining({
        code: 'orphan-action-event',
        actionId: 'unknown-action',
      }),
    ])
  })

  it('rejects a malicious checkpoint projection before reading or reducing its tail', async () => {
    const scope = runtimeScope({ turnId: 'turn-malicious-checkpoint' })
    const checkpoint = runtimeCheckpoint(scope, {
      activeActionIds: [],
      projection: {
        actions: {},
        replyCommitted: false,
        pendingDelivery: null,
        committedDelivery: null,
        terminalEventType: null,
        issues: [{
          code: 'injected-runtime-issue',
          sequence: 3,
        }],
      } as any,
    })
    const listRuntimeEvents = vi.fn(async () => [])

    await expect(replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents,
      },
      deliveryOwner: 'inline',
    }))
      .rejects
      .toThrow(/issue code|checkpoint projection/i)
    expect(listRuntimeEvents).not.toHaveBeenCalled()
  })

  it('rejects sequence gaps and scope drift during replay', async () => {
    const scope = runtimeScope()

    await expect(replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent(scope, 2, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
        ]),
      },
      deliveryOwner: 'inline',
    })).rejects.toThrow(/sequence/i)

    await expect(replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          runtimeEvent({ ...scope, cardId: 'other-card' }, 1, 'turn.accepted', {
            deliveryOwner: 'inline',
          }),
        ]),
      },
      deliveryOwner: 'inline',
    })).rejects.toThrow(/scope/i)
  })
})
