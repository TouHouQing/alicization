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
  createAlicizationRuntimeReplyArtifact,
  createAlicizationRuntimeReplyDeliveryIntent,
} from './reply-artifact'
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
      pendingActionSettlements: {},
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
    schemaVersion: 3,
    updatedAt: 3_000,
    ...overrides,
  }
}

function replyArtifact(visibleText: string, fullText = visibleText) {
  return createAlicizationRuntimeReplyArtifact({
    artifactVersion: 1,
    visibleText,
    fullText,
    finishReason: 'stop',
    visibleReplyExecution: {
      mode: 'provider-stream',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
      reason: 'turn-replay-test',
    },
    realization: {
      version: 'visible-reply-realization-v1',
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
      visibleText,
      visibleReplyValidationStatus: 'approved',
      nonHumanAuthoredStatus: null,
      blockedReasons: [],
      reason: 'turn-replay-test',
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
  })
}

function replyIntent(
  scope: AlicizationRuntimeEventScope,
  visibleText: string,
  fullText = visibleText,
) {
  return createAlicizationRuntimeReplyDeliveryIntent(
    scope,
    'inline',
    replyArtifact(visibleText, fullText),
  )
}

describe('alicization turn replay', () => {
  it('preserves a committed reply when replay resumes from a checkpoint with no tail', async () => {
    const scope = runtimeScope({ turnId: 'turn-reply-checkpoint' })
    const intent = replyIntent(
      scope,
      'already delivered',
      '  already delivered  ',
    )
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
      {
        replyId: intent.replyId,
        deliveryId: intent.deliveryId,
        contentHash: intent.contentHash,
        artifactHash: intent.artifactHash,
      },
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
    expect((replay.state as any).committedDelivery).toEqual(intent)
    expect(replay.replyArtifact).toEqual(intent.artifact)
    expect(replay.replyArtifact?.fullText).toBe('  already delivered  ')
    expect(replay.state.sequence).toBe(3)
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual([
      'runtime-replay:reply-committed-without-turn-terminal',
      'runtime-replay:turn-started-without-terminal',
    ])
  })

  it('marks a durable pending delivery as recoveryRequired without settling it again', async () => {
    const scope = runtimeScope({ turnId: 'turn-delivery-pending' })
    const pendingDelivery = replyIntent(scope, 'pending reply')
    const checkpoint = runtimeCheckpoint(scope, {
      sequence: 3,
      status: 'running',
      activeActionIds: [],
      projection: {
        actions: {},
        pendingActionSettlements: {},
        replyCommitted: false,
        terminalEventType: null,
        issues: [],
        pendingDelivery,
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
            contentHash: 'sha256:9c100aa5e0c055fe53ee92e3d6be2862529a37c4a25429848244e852e8bf33a1',
            artifactHash: 'sha256:9c100aa5e0c055fe53ee92e3d6be2862529a37c4a25429848244e852e8bf33a1',
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
    const expectedIntent = replyIntent(
      scope,
      'recovered body',
      '  recovered body  ',
    )
    const checkpoint = runtimeCheckpoint(scope, {
      sequence: 3,
      status: 'running',
      activeActionIds: [],
      projection: {
        actions: {},
        pendingActionSettlements: {},
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
    expect(replay.replyArtifact).toBeNull()
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

  it('keeps first-class action settlements pending until their completion event', async () => {
    const scope = runtimeScope({ turnId: 'turn-pending-action-settlement' })
    const settlementIdentity = {
      settlementId: 'settlement-1',
      actionId: 'action-settlement',
      toolCallId: 'tool-call-settlement',
      observationId: 'observation-settlement',
    }
    const settlementStarted = {
      ...runtimeEvent(scope, 3, 'action.progress', settlementIdentity),
      eventType: 'action.settlement.started',
    } as AlicizationRuntimeEventEnvelope
    const settlementCompleted = {
      ...runtimeEvent(scope, 5, 'action.progress', settlementIdentity),
      eventType: 'action.settlement.completed',
    } as AlicizationRuntimeEventEnvelope
    const events = [
      runtimeEvent(scope, 1, 'turn.accepted', {
        deliveryOwner: 'inline',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: settlementIdentity.actionId,
        toolCallId: settlementIdentity.toolCallId,
      }),
      settlementStarted,
      runtimeEvent(scope, 4, 'action.observation', {
        actionId: settlementIdentity.actionId,
        observationId: settlementIdentity.observationId,
        toolCallId: settlementIdentity.toolCallId,
        terminal: true,
        outcome: 'success',
      }),
    ]

    const pendingReplay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => events),
      },
      deliveryOwner: 'inline',
    })

    expect(Object.keys(pendingReplay.state.actions)).toEqual([
      settlementIdentity.actionId,
    ])
    expect(pendingReplay.state.pendingActionSettlements).toEqual({
      [settlementIdentity.settlementId]: settlementIdentity,
    })
    expect(pendingReplay.reasonCodes).toContain(
      'runtime-replay:action-settlement-pending',
    )

    const completedReplay = await replayTurn({
      scope,
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => [
          ...events,
          settlementCompleted,
        ]),
      },
      deliveryOwner: 'inline',
    })

    expect(completedReplay.state.pendingActionSettlements).toEqual({})
    expect(completedReplay.reasonCodes).not.toContain(
      'runtime-replay:action-settlement-pending',
    )
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
    const completedReply = replyIntent(scope, '恢复完成。')
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
        ...completedReply,
      }),
      runtimeEvent(scope, 7, 'assistant.reply.committed', {
        replyId: completedReply.replyId,
        deliveryId: completedReply.deliveryId,
        contentHash: completedReply.contentHash,
        artifactHash: completedReply.artifactHash,
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
    expect(replay.replyArtifact).toEqual(completedReply.artifact)
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
        pendingActionSettlements: {},
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
