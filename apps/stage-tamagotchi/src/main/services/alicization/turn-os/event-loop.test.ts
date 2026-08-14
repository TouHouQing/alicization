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
  createAlicizationRuntimeReplyArtifact,
  createAlicizationRuntimeReplyDeliveryIntent,
} from './reply-artifact'
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

function providerReplyArtifact(visibleText: string, fullText = visibleText) {
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
      reason: 'turn-event-loop-test',
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
      reason: 'turn-event-loop-test',
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

function modelReply(visibleText: string, fullText = visibleText) {
  return {
    artifact: providerReplyArtifact(visibleText, fullText),
  }
}

describe('alicization event loop', () => {
  it('persists typed tool progress facts before the terminal observation', async () => {
    const persistence = createPersistence()
    const steps = [
      {
        kind: 'action' as const,
        action: {
          actionId: 'action-progress',
          toolCallId: 'tool-call-progress',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'coding_agent',
          input: { prompt: 'inspect the workspace' },
        },
      },
      {
        kind: 'reply' as const,
        reply: modelReply('检查完成。'),
      },
    ]
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => steps.shift()!),
        executeAction: vi.fn(async (action, runtime) => {
          await runtime.appendActionProgress({
            actionId: action.actionId,
            toolCallId: action.toolCallId!,
            capabilityId: action.capabilityId,
            providerToolName: action.providerToolName,
            selectedChannel: 'codex',
            phase: 'timeout',
            signal: 'terminal',
            elapsedMs: 180_000,
            timeoutMs: 180_000,
            errorCode: 'CODEX_TIMEOUT',
            errorMessage: 'Codex produced no semantic progress for 180000ms.',
            occurredAt: 181_000,
            eventId: 'codex-timeout-event',
            threadId: 'codex-thread-1',
            adapterEventType: 'turn.failed',
            itemType: 'error',
            summary: 'Codex timed out.',
            command: 'codex exec',
            commandStatus: 'timed-out',
            outputPreview: 'No semantic progress was observed.',
          })
          return {
            actionId: action.actionId,
            observationId: `${action.actionId}:observation`,
            toolCallId: action.toolCallId,
            terminal: true,
            outcome: 'failure' as const,
            output: {
              errorCode: 'CODEX_TIMEOUT',
            },
          }
        }),
        settleReply: vi.fn(async () => {}),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-tool-progress-facts' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(result.status).toBe('completed')
    const progressIndex = persistence.events.findIndex(event =>
      event.eventType === 'action.progress',
    )
    const observationIndex = persistence.events.findIndex(event =>
      event.eventType === 'action.observation',
    )
    expect(progressIndex).toBeGreaterThan(-1)
    expect(observationIndex).toBeGreaterThan(progressIndex)
    expect(persistence.events[progressIndex]).toMatchObject({
      source: 'tool',
      idempotencyKey: 'action-progress:progress:codex-timeout-event',
      payload: {
        actionId: 'action-progress',
        toolCallId: 'tool-call-progress',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'codex',
        phase: 'timeout',
        signal: 'terminal',
        elapsedMs: 180_000,
        timeoutMs: 180_000,
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'Codex produced no semantic progress for 180000ms.',
        occurredAt: 181_000,
        eventId: 'codex-timeout-event',
        threadId: 'codex-thread-1',
        adapterEventType: 'turn.failed',
        itemType: 'error',
        summary: 'Codex timed out.',
        command: 'codex exec',
        commandStatus: 'timed-out',
        outputPreview: 'No semantic progress was observed.',
      },
    })
  })

  it('persists canonical capability identity separately from the Provider tool alias', async () => {
    const persistence = createPersistence()
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'action' as const,
          action: {
            actionId: 'action-codex',
            toolCallId: 'tool-call-codex',
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
            input: {
              prompt: 'inspect the repository',
            },
          },
        })),
        executeAction: vi.fn(async action => ({
          actionId: action.actionId,
          observationId: `${action.actionId}:observation`,
          toolCallId: action.toolCallId,
          terminal: true,
          outcome: 'success' as const,
          output: { status: 'completed' },
        })),
        settleReply: vi.fn(),
      },
      maxSteps: 1,
    })

    await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-canonical-tool-identity' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    const proposed = persistence.events.find(event =>
      event.eventType === 'model.tool_call.proposed',
    )
    const started = persistence.events.find(event =>
      event.eventType === 'action.started',
    )

    expect(proposed?.payload).toMatchObject({
      capabilityId: 'coding_agent.codex',
      providerToolName: 'codex',
    })
    expect(started?.payload).toMatchObject({
      capabilityId: 'coding_agent.codex',
      providerToolName: 'codex',
    })
    expect(proposed?.payload).not.toHaveProperty('qualifiedToolName')
    expect(started?.payload).not.toHaveProperty('qualifiedToolName')
  })

  it('commits and returns the complete Provider reply artifact', async () => {
    const persistence = createPersistence()
    const artifact = createAlicizationRuntimeReplyArtifact({
      artifactVersion: 1,
      visibleText: '可见回复',
      fullText: '  {"reply":"可见回复","thought":"原始输出"}  ',
      finishReason: 'stop',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'turn-event-loop',
      },
      realization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-stream',
        visibleText: '可见回复',
        visibleReplyValidationStatus: 'approved',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        reason: 'turn-event-loop',
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
    const settleReply = vi.fn(async () => {})
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: { artifact },
        })),
        executeAction: vi.fn(),
        settleReply,
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-complete-reply-artifact' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(result.replyArtifact).toEqual(artifact)
    expect(result.replyArtifact?.fullText).toBe(
      '  {"reply":"可见回复","thought":"原始输出"}  ',
    )
    expect(settleReply).toHaveBeenCalledWith(
      { artifact },
      expect.objectContaining({
        pendingDelivery: expect.objectContaining({ artifact }),
      }),
    )
    expect(result.state.committedDelivery).toEqual(
      expect.objectContaining({ artifact }),
    )
    expect(persistence.checkpoints.at(-1)?.projection.committedDelivery).toEqual(
      expect.objectContaining({ artifact }),
    )
    expect(persistence.events.find(event =>
      event.eventType === 'assistant.reply.committed',
    )?.payload).not.toHaveProperty('artifact')
  })

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
    const firstIntent = createAlicizationRuntimeReplyDeliveryIntent(
      scope,
      'inline',
      providerReplyArtifact('first reply'),
    )
    const differentIntent = createAlicizationRuntimeReplyDeliveryIntent(
      scope,
      'inline',
      providerReplyArtifact('different reply'),
    )

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      1,
      'model.step.completed',
      {
        stepIndex: 1,
        outcome: 'reply',
        ...firstIntent,
      },
    ))

    expect(() => reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      2,
      'model.step.completed',
      {
        stepIndex: 1,
        outcome: 'reply',
        ...differentIntent,
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
        contentHash: 'sha256:9c100aa5e0c055fe53ee92e3d6be2862529a37c4a25429848244e852e8bf33a1',
        artifactHash: 'sha256:9c100aa5e0c055fe53ee92e3d6be2862529a37c4a25429848244e852e8bf33a1',
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
    const intent = createAlicizationRuntimeReplyDeliveryIntent(
      scope,
      'inline',
      providerReplyArtifact('matching reply'),
    )
    const differentIdentity = createAlicizationRuntimeReplyDeliveryIntent(
      scope,
      'inline',
      providerReplyArtifact('different reply'),
    )
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
        replyId: differentIdentity.replyId,
        deliveryId: differentIdentity.deliveryId,
        contentHash: differentIdentity.contentHash,
        artifactHash: differentIdentity.artifactHash,
      },
    ))).toThrow(/commit|pending delivery|content|hash/i)

    state = reduceAlicizationRuntimeEvent(state, runtimeEvent(
      scope,
      2,
      'assistant.reply.committed',
      {
        replyId: intent.replyId,
        deliveryId: intent.deliveryId,
        contentHash: intent.contentHash,
        artifactHash: intent.artifactHash,
      },
    ))
    expect(state.replyCommitted).toBe(true)
    expect(state.pendingDelivery).toBeNull()
    expect((state as any).committedDelivery).toEqual(intent)
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
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: { prompt: 'inspect the workspace' },
        },
      },
      {
        kind: 'reply' as const,
        reply: modelReply('已经完成检查。'),
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
      modelReply('已经完成检查。'),
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
      'action.settlement.started',
      'action.observation',
      'action.settlement.completed',
      'action.completed',
      'model.step.started',
      'model.text.delta',
      'model.step.completed',
      'assistant.reply.committed',
      'turn.completed',
    ])
    const realObservationIndex = persistence.events.findIndex(event =>
      event.eventType === 'action.observation'
      && (event.payload as { actionId?: string }).actionId === 'action-1',
    )
    const realCompletedIndex = persistence.events.findIndex(event =>
      event.eventType === 'action.completed'
      && (event.payload as { actionId?: string }).actionId === 'action-1',
    )
    const settlementStarted = persistence.events.find(event =>
      event.eventType === 'action.settlement.started',
    )
    expect(settlementStarted).toMatchObject({
      payload: {
        settlementId: expect.any(String),
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        observationId: 'observation-1',
      },
    })
    expect(realObservationIndex).toBeGreaterThan(-1)
    expect(realCompletedIndex).toBeGreaterThan(realObservationIndex)
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
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: {},
        },
      },
      {
        kind: 'reply' as const,
        reply: modelReply('done'),
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
          reply: modelReply('reply'),
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

  it('rejects an already-applied non-idempotent event returned by persistence', async () => {
    const persistence = createPersistence()
    const appendRuntimeEvent = persistence.appendRuntimeEvent.getMockImplementation()!
    let firstPersistedEvent: AlicizationRuntimeEventEnvelope | null = null
    let appendCalls = 0
    persistence.appendRuntimeEvent.mockImplementation(async (scope, event) => {
      appendCalls += 1
      if (appendCalls === 1) {
        firstPersistedEvent = await appendRuntimeEvent(scope, event)
        return firstPersistedEvent
      }
      if (appendCalls === 2)
        return firstPersistedEvent!
      return await appendRuntimeEvent(scope, event)
    })
    const assembleContext = vi.fn(async () => ({}))
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext,
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: modelReply('不应到达这里。'),
        })),
        executeAction: vi.fn(async () => {
          throw new Error('unexpected tool execution')
        }),
        settleReply: vi.fn(async () => {}),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-invalid-stale-persistence' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(result.status).toBe('failed')
    expect(result.error).toContain('already-applied non-idempotent event')
    expect(assembleContext).not.toHaveBeenCalled()
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
    const durableArtifact = providerReplyArtifact(
      'durable reply',
      '  durable reply \n',
    )
    const expectedIntent = createAlicizationRuntimeReplyDeliveryIntent(
      scope,
      'inline',
      durableArtifact,
    )
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
          reply: { artifact: durableArtifact },
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
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
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
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
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
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
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

  it('uses first-class settlement events without creating executable barrier actions', async () => {
    const persistence = createPersistence()
    const runModelStep = vi.fn()
      .mockResolvedValueOnce({
        kind: 'action' as const,
        action: {
          actionId: 'action-first-class-settlement',
          toolCallId: 'tool-call-first-class-settlement',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: {},
        },
      })
      .mockResolvedValueOnce({
        kind: 'reply' as const,
        reply: modelReply('settled without a barrier action'),
      })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep,
        executeAction: vi.fn(async () => ({
          actionId: 'action-first-class-settlement',
          observationId: 'observation-first-class-settlement',
          toolCallId: 'tool-call-first-class-settlement',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(async () => {}),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-first-class-settlement' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    const settlementEvents = persistence.events.filter(event =>
      event.eventType === 'action.settlement.started'
      || event.eventType === 'action.settlement.completed',
    )
    expect(settlementEvents.map(event => event.eventType)).toEqual([
      'action.settlement.started',
      'action.settlement.completed',
    ])
    expect(settlementEvents[0]?.payload).toMatchObject({
      settlementId: expect.any(String),
      actionId: 'action-first-class-settlement',
      toolCallId: 'tool-call-first-class-settlement',
      observationId: 'observation-first-class-settlement',
    })
    expect(settlementEvents[1]?.payload).toEqual(settlementEvents[0]?.payload)
    expect(Object.keys(result.state.actions)).toEqual([
      'action-first-class-settlement',
    ])
    expect(result.state.pendingActionSettlements).toEqual({})
    expect(persistence.events.some(event =>
      event.eventType === 'action.started'
      && (event.payload as { capabilityId?: string }).capabilityId
      === 'runtime.settlement-barrier',
    )).toBe(false)
  })

  it('does not append the terminal observation when settlement start persistence fails', async () => {
    const persistence = createPersistence()
    const settlementError = new Error('failed to persist action settlement')
    persistence.appendRuntimeEvent.mockImplementation(async (
      scope: AlicizationRuntimeEventScope,
      input: AlicizationRuntimeEventEnvelope,
    ) => {
      if (input.eventType === 'action.settlement.started')
        throw settlementError
      const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
      const event = {
        ...input,
        sequence,
      }
      persistence.events.push(event)
      return event
    })
    const runModelStep = vi.fn()
      .mockResolvedValueOnce({
        kind: 'action' as const,
        action: {
          actionId: 'action-barrier-append-failure',
          toolCallId: 'tool-call-barrier-append-failure',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: {},
        },
      })
      .mockResolvedValueOnce({
        kind: 'reply' as const,
        reply: modelReply('must not continue'),
      })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep,
        executeAction: vi.fn(async () => ({
          actionId: 'action-barrier-append-failure',
          observationId: 'observation-barrier-append-failure',
          toolCallId: 'tool-call-barrier-append-failure',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(async () => {}),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-barrier-append-failure' })

    await expect(eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })).rejects.toBe(settlementError)

    expect(runModelStep).toHaveBeenCalledTimes(1)
    expect(persistence.events.map(event => event.eventType))
      .not
      .toContain('action.settlement.started')
    expect(persistence.events.some(event =>
      event.eventType === 'action.observation'
      && (event.payload as { actionId?: string }).actionId === 'action-barrier-append-failure',
    )).toBe(false)

    const checkpoint = persistence.checkpoints.at(-1) ?? null
    const replay = await replayTurn({
      scope,
      deliveryOwner: 'inline',
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => persistence.events.filter(event =>
          event.sequence > (checkpoint?.sequence ?? 0),
        )),
      },
    })
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.state.actions['action-barrier-append-failure']).toMatchObject({
      status: 'active',
      terminalObservationId: null,
    })
    expect(replay.state.pendingActionSettlements).toEqual({})
  })

  it('keeps a pre-persisted action settlement pending when terminal observation checkpointing fails', async () => {
    const persistence = createPersistence()
    const checkpointStarted = createDeferred<void>()
    const failCheckpoint = createDeferred<never>()
    const persistenceError = new Error('failed to checkpoint durable terminal observation')
    persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
      const action = checkpoint.projection.actions['action-observation-checkpoint-race']
      if (action?.lastObservation?.observationId === 'observation-checkpoint-race') {
        checkpointStarted.resolve()
        await failCheckpoint.promise
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
            actionId: 'action-observation-checkpoint-race',
            toolCallId: 'tool-call-observation-checkpoint-race',
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => ({
          actionId: 'action-observation-checkpoint-race',
          observationId: 'observation-checkpoint-race',
          toolCallId: 'tool-call-observation-checkpoint-race',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-observation-checkpoint-race' })
    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await checkpointStarted.promise

    const cancellation = eventLoop.cancelTurn(scope, 'cancel during observation checkpoint failure')
    failCheckpoint.reject(persistenceError)

    await expect(cancellation).rejects.toBe(persistenceError)
    await expect(running).rejects.toBe(persistenceError)
    expect(persistence.events.map(event => event.eventType)).not.toContain('action.cancelled')
    expect(persistence.events.map(event => event.eventType)).not.toContain('runtime.cancelled')
    expect(persistence.events.map(event => event.eventType)).not.toContain('tool.failed')
    expect(persistence.events.map(event => event.eventType)).not.toContain('turn.failed')

    const checkpoint = persistence.checkpoints.at(-1) ?? null
    const replay = await replayTurn({
      scope,
      deliveryOwner: 'inline',
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => persistence.events.filter(event =>
          event.sequence > (checkpoint?.sequence ?? 0),
        )),
      },
    })
    const settlementEvent = persistence.events.find(event =>
      event.eventType === 'action.settlement.started'
      && (event.payload as { actionId?: string }).actionId
      === 'action-observation-checkpoint-race',
    )
    const settlementId
      = (settlementEvent?.payload as { settlementId?: string } | undefined)?.settlementId
    const settlementEventIndex = persistence.events.indexOf(settlementEvent!)
    const observationEventIndex = persistence.events.findIndex(event =>
      event.eventType === 'action.observation'
      && (event.payload as { observationId?: string }).observationId
      === 'observation-checkpoint-race',
    )
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toContain('runtime-replay:action-settlement-pending')
    expect(settlementId).toEqual(expect.any(String))
    expect(settlementEventIndex).toBeGreaterThanOrEqual(0)
    expect(settlementEventIndex).toBeLessThan(observationEventIndex)
    expect(replay.state.actions['action-observation-checkpoint-race']).toMatchObject({
      actionId: 'action-observation-checkpoint-race',
      toolCallId: 'tool-call-observation-checkpoint-race',
      status: 'completed',
    })
    expect(Object.keys(replay.state.actions)).toEqual([
      'action-observation-checkpoint-race',
    ])
    expect(replay.state.pendingActionSettlements[settlementId!]).toEqual({
      settlementId,
      actionId: 'action-observation-checkpoint-race',
      toolCallId: 'tool-call-observation-checkpoint-race',
      observationId: 'observation-checkpoint-race',
    })
    expect(settlementEvent).toMatchObject({
      payload: {
        actionId: 'action-observation-checkpoint-race',
        observationId: 'observation-checkpoint-race',
      },
    })
  })

  it('uses a unique settlementId when a legacy concatenated action id is occupied', async () => {
    const persistence = createPersistence()
    const targetActionId = 'action-barrier-collision-target'
    const targetObservationId = 'observation-barrier-collision-target'
    const occupiedLegacyId
      = `${targetActionId}:settlement-uncertain:${targetObservationId}`
    const persistenceError = new Error('failed to checkpoint collision target observation')
    let injectedFailure = false
    persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
      const action = checkpoint.projection.actions[targetActionId]
      if (
        !injectedFailure
        && action?.lastObservation?.observationId === targetObservationId
      ) {
        injectedFailure = true
        throw persistenceError
      }
      persistence.checkpoints.push(structuredClone(checkpoint))
      return checkpoint
    })
    const steps = [
      {
        kind: 'action' as const,
        action: {
          actionId: occupiedLegacyId,
          toolCallId: 'tool-call-occupied-legacy-id',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: {},
        },
      },
      {
        kind: 'action' as const,
        action: {
          actionId: targetActionId,
          toolCallId: 'tool-call-barrier-collision-target',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: {},
        },
      },
    ]
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => steps.shift()!),
        executeAction: vi.fn(async action => ({
          actionId: action.actionId,
          observationId: action.actionId === targetActionId
            ? targetObservationId
            : 'observation-occupied-legacy-id',
          toolCallId: action.toolCallId,
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-barrier-collision' })

    await expect(eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })).rejects.toBe(persistenceError)

    const checkpoint = persistence.checkpoints.at(-1) ?? null
    const replay = await replayTurn({
      scope,
      deliveryOwner: 'inline',
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => persistence.events.filter(event =>
          event.sequence > (checkpoint?.sequence ?? 0),
        )),
      },
    })
    const targetSettlementEvent = persistence.events.find(event =>
      event.eventType === 'action.settlement.started'
      && (event.payload as { actionId?: string }).actionId === targetActionId,
    )
    const targetSettlementId
      = (targetSettlementEvent?.payload as { settlementId?: string } | undefined)?.settlementId
    expect(targetSettlementId).toEqual(expect.any(String))
    expect(targetSettlementId).not.toBe(occupiedLegacyId)
    expect(replay.state.actions[occupiedLegacyId]).toMatchObject({
      status: 'completed',
    })
    expect(replay.state.actions[targetActionId]).toMatchObject({
      status: 'completed',
    })
    expect(replay.state.actions[targetSettlementId!]).toBeUndefined()
    expect(replay.state.pendingActionSettlements[targetSettlementId!]).toMatchObject({
      actionId: targetActionId,
      observationId: targetObservationId,
    })
  })

  it('fully settles the first-class settlement after a successful terminal observation checkpoint', async () => {
    const persistence = createPersistence()
    const runModelStep = vi.fn()
      .mockResolvedValueOnce({
        kind: 'action' as const,
        action: {
          actionId: 'action-barrier-success',
          toolCallId: 'tool-call-barrier-success',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: {},
        },
      })
      .mockResolvedValueOnce({
        kind: 'reply' as const,
        reply: modelReply('barrier settled'),
      })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep,
        executeAction: vi.fn(async () => ({
          actionId: 'action-barrier-success',
          observationId: 'observation-barrier-success',
          toolCallId: 'tool-call-barrier-success',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(async () => {}),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-barrier-success' })

    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })

    const settlementStarted = persistence.events.find(event =>
      event.eventType === 'action.settlement.started'
      && (event.payload as { actionId?: string }).actionId === 'action-barrier-success',
    )
    const settlementCompleted = persistence.events.find(event =>
      event.eventType === 'action.settlement.completed',
    )
    const settlementId
      = (settlementStarted?.payload as { settlementId?: string } | undefined)?.settlementId
    expect(result.status).toBe('completed')
    expect(settlementId).toEqual(expect.any(String))
    expect(settlementCompleted?.payload).toEqual(settlementStarted?.payload)
    expect(result.state.pendingActionSettlements).toEqual({})
    expect(Object.keys(result.state.actions)).toEqual(['action-barrier-success'])
    expect(listAlicizationActiveActionIds(result.state)).toEqual([])
    expect(persistence.events.filter(event =>
      event.eventType === 'action.completed',
    )).toHaveLength(1)
  })

  it.each(['append', 'checkpoint'] as const)(
    'does not fabricate provider failure when model step start %s fails',
    async (failurePoint) => {
      const persistence = createPersistence()
      const persistenceError = new Error(`failed to ${failurePoint} model step start`)
      if (failurePoint === 'append') {
        persistence.appendRuntimeEvent.mockImplementation(async (
          scope: AlicizationRuntimeEventScope,
          input: AlicizationRuntimeEventEnvelope,
        ) => {
          if (input.eventType === 'model.step.started')
            throw persistenceError
          const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
          const event = {
            ...input,
            sequence,
          }
          persistence.events.push(event)
          return event
        })
      }
      else {
        persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
          if (
            checkpoint.projection.terminalEventType === null
            && checkpoint.status === 'running'
            && persistence.events.at(-1)?.eventType === 'model.step.started'
          ) {
            throw persistenceError
          }
          persistence.checkpoints.push(structuredClone(checkpoint))
          return checkpoint
        })
      }
      const runModelStep = vi.fn()
      const eventLoop = createAlicizationEventLoop({
        persistence,
        participant: {
          assembleContext: vi.fn(async () => ({})),
          runModelStep,
          executeAction: vi.fn(),
          settleReply: vi.fn(),
        },
      })

      await expect(eventLoop.runTurn({
        scope: runtimeScope({ turnId: `turn-model-step-start-${failurePoint}-failure` }),
        deliveryOwner: 'inline',
        turnInput: {},
      })).rejects.toBe(persistenceError)

      expect(runModelStep).not.toHaveBeenCalled()
      if (failurePoint === 'checkpoint')
        expect(persistence.events.map(event => event.eventType)).toContain('model.step.started')
      else
        expect(persistence.events.map(event => event.eventType)).not.toContain('model.step.started')
      expect(persistence.events.map(event => event.eventType)).not.toContain('provider.failed')
      expect(persistence.events.map(event => event.eventType)).not.toContain('turn.failed')
    },
  )

  it.each(['append', 'checkpoint'] as const)(
    'does not classify a persistence AbortError during model step start %s as cancellation',
    async (failurePoint) => {
      const persistence = createPersistence()
      const persistenceError = new Error(
        `abort-shaped ${failurePoint} persistence failure`,
      )
      persistenceError.name = 'AbortError'
      if (failurePoint === 'append') {
        persistence.appendRuntimeEvent.mockImplementation(async (
          scope: AlicizationRuntimeEventScope,
          input: AlicizationRuntimeEventEnvelope,
        ) => {
          if (input.eventType === 'model.step.started')
            throw persistenceError
          const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
          const event = {
            ...input,
            sequence,
          }
          persistence.events.push(event)
          return event
        })
      }
      else {
        persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
          if (persistence.events.at(-1)?.eventType === 'model.step.started')
            throw persistenceError
          persistence.checkpoints.push(structuredClone(checkpoint))
          return checkpoint
        })
      }
      const runModelStep = vi.fn()
      const eventLoop = createAlicizationEventLoop({
        persistence,
        participant: {
          assembleContext: vi.fn(async () => ({})),
          runModelStep,
          executeAction: vi.fn(),
          settleReply: vi.fn(),
        },
      })

      await expect(eventLoop.runTurn({
        scope: runtimeScope({
          turnId: `turn-model-step-start-${failurePoint}-abort-error`,
        }),
        deliveryOwner: 'inline',
        turnInput: {},
      })).rejects.toBe(persistenceError)

      expect(runModelStep).not.toHaveBeenCalled()
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('runtime.cancelled')
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('provider.failed')
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('tool.failed')
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('turn.failed')
    },
  )

  it.each(['append', 'checkpoint'] as const)(
    'propagates model step start %s failure when cancellation races persistence',
    async (failurePoint) => {
      const persistence = createPersistence()
      const persistenceStarted = createDeferred<void>()
      const failPersistence = createDeferred<never>()
      const persistenceError = new Error(
        `failed to ${failurePoint} model step start during cancellation`,
      )
      if (failurePoint === 'append') {
        persistence.appendRuntimeEvent.mockImplementation(async (
          scope: AlicizationRuntimeEventScope,
          input: AlicizationRuntimeEventEnvelope,
        ) => {
          if (input.eventType === 'model.step.started') {
            persistenceStarted.resolve()
            await failPersistence.promise
          }
          const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
          const event = {
            ...input,
            sequence,
          }
          persistence.events.push(event)
          return event
        })
      }
      else {
        persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
          if (persistence.events.at(-1)?.eventType === 'model.step.started') {
            persistenceStarted.resolve()
            await failPersistence.promise
          }
          persistence.checkpoints.push(structuredClone(checkpoint))
          return checkpoint
        })
      }
      const runModelStep = vi.fn()
      const eventLoop = createAlicizationEventLoop({
        persistence,
        participant: {
          assembleContext: vi.fn(async () => ({})),
          runModelStep,
          executeAction: vi.fn(),
          settleReply: vi.fn(),
        },
      })
      const scope = runtimeScope({
        turnId: `turn-model-step-start-${failurePoint}-cancel-race`,
      })
      const running = eventLoop.runTurn({
        scope,
        deliveryOwner: 'inline',
        turnInput: {},
      })
      await persistenceStarted.promise

      const cancellation = eventLoop.cancelTurn(
        scope,
        `cancel during model step start ${failurePoint}`,
      )
      failPersistence.reject(persistenceError)

      await expect(cancellation).rejects.toBe(persistenceError)
      await expect(running).rejects.toBe(persistenceError)
      expect(runModelStep).not.toHaveBeenCalled()
      expect(persistence.events.map(event => event.eventType)).not.toContain('provider.failed')
      expect(persistence.events.map(event => event.eventType)).not.toContain('turn.failed')
      expect(persistence.events.map(event => event.eventType)).not.toContain('runtime.cancelled')
    },
  )

  it.each(['append', 'checkpoint'] as const)(
    'keeps the first cancellation during model step start %s persistence',
    async (persistencePoint) => {
      const persistence = createPersistence()
      const persistenceStarted = createDeferred<void>()
      const releasePersistence = createDeferred<void>()
      if (persistencePoint === 'append') {
        persistence.appendRuntimeEvent.mockImplementation(async (
          scope: AlicizationRuntimeEventScope,
          input: AlicizationRuntimeEventEnvelope,
        ) => {
          if (input.eventType === 'model.step.started') {
            persistenceStarted.resolve()
            await releasePersistence.promise
          }
          const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
          const event = {
            ...input,
            sequence,
          }
          persistence.events.push(event)
          return event
        })
      }
      else {
        persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
          if (persistence.events.at(-1)?.eventType === 'model.step.started') {
            persistenceStarted.resolve()
            await releasePersistence.promise
          }
          persistence.checkpoints.push(structuredClone(checkpoint))
          return checkpoint
        })
      }
      const runModelStep = vi.fn()
      const eventLoop = createAlicizationEventLoop({
        persistence,
        participant: {
          assembleContext: vi.fn(async () => ({})),
          runModelStep,
          executeAction: vi.fn(),
          settleReply: vi.fn(),
        },
      })
      const scope = runtimeScope({
        turnId: `turn-model-step-start-${persistencePoint}-first-cancel-wins`,
      })
      const running = eventLoop.runTurn({
        scope,
        deliveryOwner: 'inline',
        turnInput: {},
      })
      await persistenceStarted.promise

      const firstCancellation = eventLoop.cancelTurn(scope, 'first cancellation')
      const secondCancellation = eventLoop.cancelTurn(scope, 'second cancellation')
      releasePersistence.resolve()

      await expect(firstCancellation).resolves.toBe(true)
      await expect(secondCancellation).resolves.toBe(false)
      await expect(running).resolves.toMatchObject({
        status: 'cancelled',
        error: 'first cancellation',
      })
      expect(runModelStep).not.toHaveBeenCalled()
      expect(persistence.events.find(event =>
        event.eventType === 'runtime.cancelled',
      )).toMatchObject({
        payload: {
          reason: 'first cancellation',
        },
      })
    },
  )

  it.each(['append', 'checkpoint'] as const)(
    'propagates model step start %s failure when an external abort races persistence',
    async (failurePoint) => {
      const persistence = createPersistence()
      const persistenceStarted = createDeferred<void>()
      const failPersistence = createDeferred<never>()
      const persistenceError = new Error(
        `failed to ${failurePoint} model step start during external abort`,
      )
      if (failurePoint === 'append') {
        persistence.appendRuntimeEvent.mockImplementation(async (
          scope: AlicizationRuntimeEventScope,
          input: AlicizationRuntimeEventEnvelope,
        ) => {
          if (input.eventType === 'model.step.started') {
            persistenceStarted.resolve()
            await failPersistence.promise
          }
          const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
          const event = {
            ...input,
            sequence,
          }
          persistence.events.push(event)
          return event
        })
      }
      else {
        persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
          if (persistence.events.at(-1)?.eventType === 'model.step.started') {
            persistenceStarted.resolve()
            await failPersistence.promise
          }
          persistence.checkpoints.push(structuredClone(checkpoint))
          return checkpoint
        })
      }
      const runModelStep = vi.fn()
      const eventLoop = createAlicizationEventLoop({
        persistence,
        participant: {
          assembleContext: vi.fn(async () => ({})),
          runModelStep,
          executeAction: vi.fn(),
          settleReply: vi.fn(),
        },
      })
      const scope = runtimeScope({
        turnId: `turn-model-step-start-${failurePoint}-external-abort-failure`,
      })
      const externalController = new AbortController()
      const running = eventLoop.runTurn({
        scope,
        deliveryOwner: 'inline',
        turnInput: {},
        signal: externalController.signal,
      })
      await persistenceStarted.promise

      externalController.abort(`external abort during model step start ${failurePoint}`)
      failPersistence.reject(persistenceError)

      await expect(running).rejects.toBe(persistenceError)
      expect(runModelStep).not.toHaveBeenCalled()
      expect(persistence.events.map(event => event.eventType)).not.toContain('provider.failed')
      expect(persistence.events.map(event => event.eventType)).not.toContain('turn.failed')
      expect(persistence.events.map(event => event.eventType)).not.toContain('runtime.cancelled')
    },
  )

  it.each(['append', 'checkpoint'] as const)(
    'applies an external abort only after model step start %s persistence succeeds',
    async (persistencePoint) => {
      const persistence = createPersistence()
      const persistenceStarted = createDeferred<void>()
      const releasePersistence = createDeferred<void>()
      if (persistencePoint === 'append') {
        persistence.appendRuntimeEvent.mockImplementation(async (
          scope: AlicizationRuntimeEventScope,
          input: AlicizationRuntimeEventEnvelope,
        ) => {
          if (input.eventType === 'model.step.started') {
            persistenceStarted.resolve()
            await releasePersistence.promise
          }
          const sequence = persistence.events.filter(event => event.turnId === scope.turnId).length + 1
          const event = {
            ...input,
            sequence,
          }
          persistence.events.push(event)
          return event
        })
      }
      else {
        persistence.saveRuntimeCheckpoint.mockImplementation(async (checkpoint) => {
          if (persistence.events.at(-1)?.eventType === 'model.step.started') {
            persistenceStarted.resolve()
            await releasePersistence.promise
          }
          persistence.checkpoints.push(structuredClone(checkpoint))
          return checkpoint
        })
      }
      const runModelStep = vi.fn()
      const eventLoop = createAlicizationEventLoop({
        persistence,
        participant: {
          assembleContext: vi.fn(async () => ({})),
          runModelStep,
          executeAction: vi.fn(),
          settleReply: vi.fn(),
        },
      })
      const scope = runtimeScope({
        turnId: `turn-model-step-start-${persistencePoint}-external-abort-success`,
      })
      const externalController = new AbortController()
      const running = eventLoop.runTurn({
        scope,
        deliveryOwner: 'inline',
        turnInput: {},
        signal: externalController.signal,
      })
      await persistenceStarted.promise

      externalController.abort('first external cancellation')
      expect(persistence.events.map(event => event.eventType)).not.toContain('runtime.cancelled')
      releasePersistence.resolve()

      await expect(running).resolves.toMatchObject({
        status: 'cancelled',
        error: 'first external cancellation',
      })
      expect(runModelStep).not.toHaveBeenCalled()
      expect(persistence.events.find(event =>
        event.eventType === 'runtime.cancelled',
      )).toMatchObject({
        payload: {
          reason: 'first external cancellation',
        },
      })
    },
  )

  it('records provider failure after an invoked model step returns an invalid kind', async () => {
    const persistence = createPersistence()
    const runModelStep = vi.fn(async () => ({
      kind: 'invalid',
      reply: { text: 'must not be accepted' },
    } as any))
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep,
        executeAction: vi.fn(),
        settleReply: vi.fn(),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-invalid-model-step-kind' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(runModelStep).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      status: 'failed',
      error: expect.stringMatching(/model step kind/i),
    })
    expect(persistence.events.map(event => event.eventType)).toContain('provider.failed')
    expect(persistence.events.map(event => event.eventType)).toContain('turn.failed')
    expect(persistence.events.map(event => event.eventType)).not.toContain('model.text.delta')
  })

  it('rejects a live tool observation from another tool call before it reaches the model', async () => {
    const persistence = createPersistence()
    const runModelStep = vi.fn()
      .mockResolvedValueOnce({
        kind: 'action' as const,
        action: {
          actionId: 'action-live-drift',
          toolCallId: 'tool-call-expected',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: {},
        },
      })
      .mockResolvedValueOnce({
        kind: 'reply' as const,
        reply: modelReply('should not run'),
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
          reply: modelReply('ok'),
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
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
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
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
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
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
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
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
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

  it('keeps the first internal cancellation during terminal observation durability', async () => {
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
        runModelStep: vi.fn()
          .mockResolvedValueOnce({
            kind: 'action' as const,
            action: {
              actionId: 'action-observation-race',
              toolCallId: 'tool-call-observation-race',
              capabilityId: 'coding_agent.codex',
              providerToolName: 'codex',
              input: {},
            },
          })
          .mockResolvedValueOnce({
            kind: 'reply' as const,
            reply: modelReply('observation was preserved'),
          }),
        executeAction: vi.fn(async () => ({
          actionId: 'action-observation-race',
          observationId: 'observation-race',
          toolCallId: 'tool-call-observation-race',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(async () => {}),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-observation-race' })

    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await observationAppendStarted.promise
    const firstCancellation = eventLoop.cancelTurn(scope, 'first internal cancellation')
    const secondCancellation = eventLoop.cancelTurn(scope, 'second internal cancellation')
    releaseObservationAppend.resolve()

    await expect(firstCancellation).resolves.toBe(true)
    await expect(secondCancellation).resolves.toBe(false)
    await expect(running).resolves.toMatchObject({
      status: 'cancelled',
      error: 'first internal cancellation',
    })
    expect(persistence.events.map(event => event.eventType))
      .toContain('action.settlement.completed')
    expect(persistence.events.map(event => event.eventType))
      .toContain('action.completed')
    expect(persistence.events.map(event => event.eventType)).not.toContain('action.cancelled')
    expect(persistence.events.find(event =>
      event.eventType === 'runtime.cancelled',
    )).toMatchObject({
      payload: {
        reason: 'first internal cancellation',
      },
    })
  })

  it('does not let a later external abort overwrite an internal terminal observation cancellation', async () => {
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
            actionId: 'action-internal-external-race',
            toolCallId: 'tool-call-internal-external-race',
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => ({
          actionId: 'action-internal-external-race',
          observationId: 'observation-internal-external-race',
          toolCallId: 'tool-call-internal-external-race',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-internal-external-race' })
    const externalController = new AbortController()
    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
      signal: externalController.signal,
    })
    await observationAppendStarted.promise

    const cancellation = eventLoop.cancelTurn(scope, 'internal cancellation wins')
    externalController.abort('later external abort')
    releaseObservationAppend.resolve()

    await expect(cancellation).resolves.toBe(true)
    await expect(running).resolves.toMatchObject({
      status: 'cancelled',
      error: 'internal cancellation wins',
    })
    expect(persistence.events.find(event =>
      event.eventType === 'runtime.cancelled',
    )).toMatchObject({
      payload: {
        reason: 'internal cancellation wins',
      },
    })
    expect(persistence.events.map(event => event.eventType))
      .toContain('action.completed')
  })

  it('does not let a later internal cancellation overwrite an external terminal observation abort', async () => {
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
            actionId: 'action-external-internal-race',
            toolCallId: 'tool-call-external-internal-race',
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => ({
          actionId: 'action-external-internal-race',
          observationId: 'observation-external-internal-race',
          toolCallId: 'tool-call-external-internal-race',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-external-internal-race' })
    const externalController = new AbortController()
    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
      signal: externalController.signal,
    })
    await observationAppendStarted.promise

    externalController.abort('external abort wins')
    const cancellation = eventLoop.cancelTurn(scope, 'later internal cancellation')
    releaseObservationAppend.resolve()

    await expect(cancellation).resolves.toBe(false)
    await expect(running).resolves.toMatchObject({
      status: 'cancelled',
      error: 'external abort wins',
    })
    expect(persistence.events.find(event =>
      event.eventType === 'runtime.cancelled',
    )).toMatchObject({
      payload: {
        reason: 'external abort wins',
      },
    })
    expect(persistence.events.map(event => event.eventType))
      .toContain('action.completed')
  })

  it.each([
    'internal/internal',
    'internal/external',
    'external/internal',
  ] as const)(
    'preserves the first %s terminal observation cancellation when persistence fails',
    async (order) => {
      const persistence = createPersistence()
      const observationAppendStarted = createDeferred<void>()
      const failObservationAppend = createDeferred<never>()
      const persistenceError = new Error(
        `terminal observation persistence failed for ${order}`,
      )
      persistence.appendRuntimeEvent.mockImplementation(async (
        scope: AlicizationRuntimeEventScope,
        input: AlicizationRuntimeEventEnvelope,
      ) => {
        if (input.eventType === 'action.observation') {
          observationAppendStarted.resolve()
          await failObservationAppend.promise
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
              actionId: `action-${order}`,
              toolCallId: `tool-call-${order}`,
              capabilityId: 'coding_agent.codex',
              providerToolName: 'codex',
              input: {},
            },
          })),
          executeAction: vi.fn(async () => ({
            actionId: `action-${order}`,
            observationId: `observation-${order}`,
            toolCallId: `tool-call-${order}`,
            terminal: true,
            outcome: 'success' as const,
          })),
          settleReply: vi.fn(),
        },
      })
      const scope = runtimeScope({
        turnId: `turn-terminal-observation-failure-${order}`,
      })
      const externalController = new AbortController()
      const running = eventLoop.runTurn({
        scope,
        deliveryOwner: 'inline',
        turnInput: {},
        signal: externalController.signal,
      })
      const runningResult = running.then(
        value => ({ error: null, value }),
        error => ({ error, value: null }),
      )
      await observationAppendStarted.promise

      let firstInternalCancellation: Promise<boolean> | null = null
      let laterInternalCancellation: Promise<boolean> | null = null
      if (order === 'internal/internal') {
        firstInternalCancellation = eventLoop.cancelTurn(scope, 'first internal reason')
        laterInternalCancellation = eventLoop.cancelTurn(scope, 'later internal reason')
      }
      else if (order === 'internal/external') {
        firstInternalCancellation = eventLoop.cancelTurn(scope, 'first internal reason')
        externalController.abort('later external reason')
      }
      else {
        externalController.abort('first external reason')
        laterInternalCancellation = eventLoop.cancelTurn(scope, 'later internal reason')
      }
      const firstInternalResult = firstInternalCancellation?.then(
        value => ({ error: null, value }),
        error => ({ error, value: null }),
      )
      const laterInternalResult = laterInternalCancellation?.then(
        value => ({ error: null, value }),
        error => ({ error, value: null }),
      )
      failObservationAppend.reject(persistenceError)

      if (firstInternalResult) {
        await expect(firstInternalResult).resolves.toEqual({
          error: persistenceError,
          value: null,
        })
      }
      if (laterInternalResult) {
        await expect(laterInternalResult).resolves.toEqual({
          error: null,
          value: false,
        })
      }
      await expect(runningResult).resolves.toEqual({
        error: persistenceError,
        value: null,
      })
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('runtime.cancelled')
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('action.cancelled')
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('provider.failed')
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('tool.failed')
      expect(persistence.events.map(event => event.eventType))
        .not
        .toContain('turn.failed')
    },
  )

  it('defers an external abort until the terminal observation is durable', async () => {
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
    const runModelStep = vi.fn()
      .mockResolvedValueOnce({
        kind: 'action' as const,
        action: {
          actionId: 'action-external-abort-race',
          toolCallId: 'tool-call-external-abort-race',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'codex',
          input: {},
        },
      })
      .mockResolvedValueOnce({
        kind: 'reply' as const,
        reply: modelReply('must not continue after deferred abort'),
      })
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep,
        executeAction: vi.fn(async () => ({
          actionId: 'action-external-abort-race',
          observationId: 'observation-external-abort-race',
          toolCallId: 'tool-call-external-abort-race',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(async () => {}),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-external-abort-race' })
    const externalController = new AbortController()
    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
      signal: externalController.signal,
    })
    await observationAppendStarted.promise

    externalController.abort('external abort during observation persistence')
    releaseObservationAppend.resolve()
    const result = await running

    expect(result).toMatchObject({
      status: 'cancelled',
      error: 'external abort during observation persistence',
    })
    expect(runModelStep).toHaveBeenCalledTimes(1)
    expect(persistence.events.find(event =>
      event.eventType === 'action.observation'
      && (event.payload as { observationId?: string }).observationId === 'observation-external-abort-race',
    )).toMatchObject({
      payload: {
        terminal: true,
        outcome: 'success',
      },
    })
    expect(persistence.events.some(event =>
      event.eventType === 'action.observation'
      && (event.payload as { outcome?: string }).outcome === 'cancelled',
    )).toBe(false)
    expect(persistence.events.map(event => event.eventType)).not.toContain('action.cancelled')
    expect(persistence.events.map(event => event.eventType)).toContain('runtime.cancelled')
  })

  it('propagates observation persistence failure instead of cancelling a completed tool side effect', async () => {
    const persistence = createPersistence()
    const observationAppendStarted = createDeferred<void>()
    const failObservationAppend = createDeferred<never>()
    const persistenceError = new Error('failed to persist terminal observation')
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
      if (
        event.eventType === 'action.observation'
        && (event.payload as { outcome?: string }).outcome === 'success'
      ) {
        persistence.events.pop()
        observationAppendStarted.resolve()
        await failObservationAppend.promise
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
            actionId: 'action-observation-persistence-failure',
            toolCallId: 'tool-call-observation-persistence-failure',
            capabilityId: 'coding_agent.codex',
            providerToolName: 'codex',
            input: {},
          },
        })),
        executeAction: vi.fn(async () => ({
          actionId: 'action-observation-persistence-failure',
          observationId: 'observation-persistence-failure',
          toolCallId: 'tool-call-observation-persistence-failure',
          terminal: true,
          outcome: 'success' as const,
        })),
        settleReply: vi.fn(),
      },
    })
    const scope = runtimeScope({ turnId: 'turn-observation-persistence-failure' })
    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await observationAppendStarted.promise

    const cancellation = eventLoop.cancelTurn(scope, 'cancel during failed observation persistence')
    failObservationAppend.reject(persistenceError)

    await expect(cancellation).rejects.toBe(persistenceError)
    await expect(running).rejects.toBe(persistenceError)
    expect(persistence.events.map(event => event.eventType)).not.toContain('action.cancelled')
    expect(persistence.events.map(event => event.eventType)).not.toContain('runtime.cancelled')
    expect(persistence.events.map(event => event.eventType)).not.toContain('action.failed')
    expect(persistence.events.map(event => event.eventType)).not.toContain('tool.failed')
    expect(persistence.events.map(event => event.eventType)).not.toContain('turn.failed')

    const checkpoint = persistence.checkpoints.at(-1) ?? null
    const replay = await replayTurn({
      scope,
      deliveryOwner: 'inline',
      reader: {
        loadRuntimeCheckpoint: vi.fn(async () => checkpoint),
        listRuntimeEvents: vi.fn(async () => persistence.events.filter(event =>
          event.sequence > (checkpoint?.sequence ?? 0),
        )),
      },
    })
    expect(replay.recoveryRequired).toBe(true)
    expect(replay.reasonCodes).toEqual(expect.arrayContaining([
      'runtime-replay:active-actions-unsettled',
      'runtime-replay:turn-started-without-terminal',
    ]))
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
          reply: modelReply('done'),
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

  it('keeps a published reply completed when settleReply triggers cancellation', async () => {
    const persistence = createPersistence()
    const scope = runtimeScope({ turnId: 'turn-reply-publish-cancel-race' })
    let cancellation: Promise<boolean> | null = null
    let eventLoop: ReturnType<typeof createAlicizationEventLoop>
    const settleReply = vi.fn(async () => {
      cancellation = eventLoop.cancelTurn(scope, 'cancel after visible publish')
    })
    eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: modelReply('published once'),
        })),
        executeAction: vi.fn(),
        settleReply,
      },
    })

    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(cancellation).not.toBeNull()
    await expect(cancellation!).resolves.toBe(false)
    expect(settleReply).toHaveBeenCalledOnce()
    expect(result.status).toBe('completed')
    expect(result.state.pendingDelivery).toBeNull()
    expect(result.state.replyCommitted).toBe(true)
    expect(persistence.events.map(event => event.eventType)).toEqual(
      expect.arrayContaining([
        'assistant.reply.committed',
        'turn.completed',
      ]),
    )
    expect(persistence.events.map(event => event.eventType))
      .not
      .toContain('runtime.cancelled')
  })

  it('clears pending delivery when reply settlement fails during cancellation', async () => {
    const persistence = createPersistence()
    const scope = runtimeScope({ turnId: 'turn-reply-settlement-failure-cancel' })
    let cancellation: Promise<boolean> | null = null
    let eventLoop: ReturnType<typeof createAlicizationEventLoop>
    const settleReply = vi.fn(async () => {
      cancellation = eventLoop.cancelTurn(scope, 'cancel after publish failure')
      throw new Error('renderer disconnected after visible publish')
    })
    eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: modelReply('published before settlement failure'),
        })),
        executeAction: vi.fn(),
        settleReply,
      },
    })

    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(cancellation).not.toBeNull()
    await expect(cancellation!).resolves.toBe(true)
    expect(result.status).toBe('cancelled')
    expect(result.state.pendingDelivery).toBeNull()
    expect(persistence.checkpoints.at(-1)?.projection.pendingDelivery).toBeNull()
    expect(persistence.events.map(event => event.eventType))
      .toContain('runtime.cancelled')
  })

  it('still cancels when cancellation wins before reply delivery starts', async () => {
    const persistence = createPersistence()
    const scope = runtimeScope({ turnId: 'turn-cancel-before-reply-delivery' })
    const releaseModelStep = createDeferred<void>()
    const modelStepStarted = createDeferred<void>()
    const settleReply = vi.fn(async () => {})
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => {
          modelStepStarted.resolve()
          await releaseModelStep.promise
          return {
            kind: 'reply' as const,
            reply: modelReply('must not publish'),
          }
        }),
        executeAction: vi.fn(),
        settleReply,
      },
    })

    const running = eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      turnInput: {},
    })
    await modelStepStarted.promise
    const cancellation = eventLoop.cancelTurn(scope, 'cancel before delivery')
    releaseModelStep.resolve()

    await expect(cancellation).resolves.toBe(true)
    await expect(running).resolves.toMatchObject({
      status: 'cancelled',
      state: {
        pendingDelivery: null,
      },
    })
    expect(settleReply).not.toHaveBeenCalled()
    expect(persistence.events.map(event => event.eventType))
      .toContain('runtime.cancelled')
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
          reply: modelReply('done'),
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

  it('returns participant settlement failure without replacing a committed reply', async () => {
    const persistence = createPersistence()
    const settlementError = new Error('memory settlement failed')
    const eventLoop = createAlicizationEventLoop({
      persistence,
      participant: {
        assembleContext: vi.fn(async () => ({})),
        runModelStep: vi.fn(async () => ({
          kind: 'reply' as const,
          reply: modelReply('正常回复仍然有效。'),
        })),
        executeAction: vi.fn(async () => {
          throw new Error('unexpected tool execution')
        }),
        settleReply: vi.fn(async () => {}),
        onTurnSettled: vi.fn(async () => {
          throw settlementError
        }),
      },
    })

    const result = await eventLoop.runTurn({
      scope: runtimeScope({ turnId: 'turn-settlement-failure-visible' }),
      deliveryOwner: 'inline',
      turnInput: {},
    })

    expect(result).toMatchObject({
      status: 'completed',
      settlementError: 'memory settlement failed',
      settlementCause: settlementError,
      replyArtifact: {
        visibleText: '正常回复仍然有效。',
      },
    })
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
