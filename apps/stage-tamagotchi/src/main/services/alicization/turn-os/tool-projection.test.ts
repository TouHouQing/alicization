import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'

import {
  createAlicizationRuntimeEvent,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  projectAlicizationRuntimeToolEvents,
} from './tool-projection'

import * as toolProjectionModule from './tool-projection'

interface RuntimeScope {
  turnId: string
  cardId: string
  userId: string
  conversationId: string
}

function runtimeScope(overrides: Partial<RuntimeScope> = {}): RuntimeScope {
  return {
    turnId: 'turn-tool-projection-replay',
    cardId: 'card-1',
    userId: 'user-1',
    conversationId: 'conversation-1',
    ...overrides,
  }
}

function runtimeEvent(
  scope: RuntimeScope,
  sequence: number,
  eventType: AlicizationRuntimeEventEnvelope['eventType'],
  payload: unknown,
) {
  return createAlicizationRuntimeEvent({
    eventId: `${scope.turnId}:event:${sequence}`,
    eventType,
    sequence,
    ...scope,
    source: eventType.startsWith('model.')
      ? 'model'
      : eventType.startsWith('action.')
        ? 'tool'
        : 'runtime',
    occurredAt: 2_000 + sequence,
    payload,
  })
}

describe('alicization runtime tool event projector', () => {
  it('uses the same stateful reducer for cancelled observations and late progress', () => {
    const createProjector = Reflect.get(
      toolProjectionModule,
      'createAlicizationRuntimeToolEventProjector',
    ) as undefined | (() => {
      project: (event: AlicizationRuntimeEventEnvelope) => Array<{
        fact: { type: string }
        update: {
          accepted: boolean
          traceOnly: boolean
          card: {
            phase: string
            terminal: boolean
          }
        }
      }>
      snapshot: () => {
        cards: Array<{
          phase: string
          terminal: boolean
        }>
      }
    })

    expect(createProjector).toBeTypeOf('function')
    if (!createProjector)
      return

    const scope = runtimeScope({ turnId: 'turn-online-cancelled-projection' })
    const projector = createProjector()
    projector.project(runtimeEvent(scope, 1, 'model.tool_call.proposed', {
      actionId: 'action-online-cancelled',
      toolCallId: 'tool-call-online-cancelled',
      capabilityId: 'coding_agent.codex',
      providerToolName: 'coding_agent',
      arguments: {
        prompt: 'inspect the repository',
      },
    }))
    projector.project(runtimeEvent(scope, 2, 'action.started', {
      actionId: 'action-online-cancelled',
      toolCallId: 'tool-call-online-cancelled',
      capabilityId: 'coding_agent.codex',
      providerToolName: 'coding_agent',
    }))

    const cancelled = projector.project(runtimeEvent(
      scope,
      3,
      'action.observation',
      {
        actionId: 'action-online-cancelled',
        observationId: 'observation-online-cancelled',
        toolCallId: 'tool-call-online-cancelled',
        terminal: true,
        outcome: 'cancelled',
        error: 'user cancelled the action',
      },
    ))
    const cancelledResult = cancelled.find(item => item.fact.type === 'tool-result')
    const cancelledProgress = cancelled.find(item => item.fact.type === 'tool-progress')
    expect(cancelledProgress).toMatchObject({
      fact: {
        type: 'tool-progress',
        phase: 'cancelled',
        signal: 'terminal',
        errorMessage: 'user cancelled the action',
      },
      update: {
        accepted: true,
        traceOnly: false,
        card: {
          phase: 'cancelled',
          terminal: true,
          errorMessage: 'user cancelled the action',
        },
      },
    })
    expect(cancelledResult?.update).toMatchObject({
      accepted: true,
      traceOnly: false,
      card: {
        phase: 'cancelled',
        terminal: true,
      },
    })

    const lateProgress = projector.project(runtimeEvent(
      scope,
      4,
      'action.progress',
      {
        actionId: 'action-online-cancelled',
        toolCallId: 'tool-call-online-cancelled',
        phase: 'running',
        elapsedMs: 1_000,
        summary: 'late adapter heartbeat',
      },
    ))
    expect(lateProgress).toEqual([
      expect.objectContaining({
        fact: expect.objectContaining({
          type: 'tool-progress',
        }),
        update: expect.objectContaining({
          accepted: false,
          traceOnly: true,
          card: expect.objectContaining({
            phase: 'cancelled',
            terminal: true,
          }),
        }),
      }),
    ])
    expect(projector.snapshot().cards).toEqual([
      expect.objectContaining({
        phase: 'cancelled',
        terminal: true,
      }),
    ])
  })
})

describe('alicization runtime tool projection replay', () => {
  it('replays a matching formal observation result after terminal progress', () => {
    const scope = runtimeScope({
      turnId: 'turn-terminal-progress-result',
    })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-terminal-progress-result',
        toolCallId: 'tool-call-terminal-progress-result',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'codex',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-terminal-progress-result',
        toolCallId: 'tool-call-terminal-progress-result',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-terminal-progress-result',
        toolCallId: 'tool-call-terminal-progress-result',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'codex',
        phase: 'completed',
        signal: 'terminal',
        elapsedMs: 1_000,
      }),
      runtimeEvent(scope, 4, 'action.observation', {
        actionId: 'action-terminal-progress-result',
        observationId: 'observation-terminal-progress-result',
        toolCallId: 'tool-call-terminal-progress-result',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        terminal: true,
        outcome: 'success',
        output: {
          status: 'completed',
          summary: '真实工具结果',
        },
      }),
    ])

    expect(projection.cards).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-call-terminal-progress-result',
        phase: 'completed',
        terminal: true,
        result: {
          status: 'completed',
          summary: '真实工具结果',
        },
      }),
    ])
  })

  it('replays terminal timeout progress with its channel and diagnostic facts intact', () => {
    const scope = runtimeScope({ turnId: 'turn-timeout-progress' })
    const replay = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-timeout',
        toolCallId: 'tool-call-timeout',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        arguments: {
          prompt: 'inspect the workspace',
        },
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-timeout',
        toolCallId: 'tool-call-timeout',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-timeout',
        toolCallId: 'tool-call-timeout',
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
      }),
    ])

    expect(replay.recoveryRequired).toBe(false)
    expect(replay.cards).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-call-timeout',
        toolName: 'coding_agent',
        selectedChannel: 'codex',
        phase: 'timeout',
        terminal: true,
        elapsedMs: 180_000,
        timeoutMs: 180_000,
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'Codex produced no semantic progress for 180000ms.',
        step: expect.objectContaining({
          eventId: 'codex-timeout-event',
          threadId: 'codex-thread-1',
          adapterEventType: 'turn.failed',
          itemType: 'error',
          summary: 'Codex timed out.',
          command: 'codex exec',
          commandStatus: 'timed-out',
          outputPreview: 'No semantic progress was observed.',
        }),
      }),
    ])
  })

  it('rebuilds one canonical card from proposed, progress, observation, and terminal events', () => {
    const scope = runtimeScope()
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
        arguments: { prompt: 'inspect the repository' },
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        phase: 'running',
        elapsedMs: 1_200,
        signal: 'semantic-progress',
        summary: 'inspecting files',
        eventId: 'adapter-event-1',
        occurredAt: 2_003,
      }),
      runtimeEvent(scope, 4, 'action.observation', {
        actionId: 'action-1',
        observationId: 'observation-1',
        toolCallId: 'tool-call-1',
        terminal: true,
        outcome: 'success',
        output: { changedFiles: 0 },
      }),
      runtimeEvent(scope, 5, 'action.completed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
      }),
    ])

    expect(projection.cards).toMatchObject([{
      toolCallId: 'tool-call-1',
      toolName: 'codex',
      selectedChannel: 'codex',
      phase: 'completed',
      terminal: true,
      result: { changedFiles: 0 },
      step: {
        summary: 'inspecting files',
        eventId: 'adapter-event-1',
      },
    }])
  })

  it('keeps one canonical card when later action facts drift to another toolCallId', () => {
    const scope = runtimeScope({
      turnId: 'turn-tool-call-id-drift',
    })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-drift',
        toolCallId: 'tool-call-canonical',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'codex',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-drift',
        toolCallId: 'tool-call-canonical',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-drift',
        toolCallId: 'tool-call-drifted',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        phase: 'running',
        elapsedMs: 100,
        summary: 'tool progress with a drifted identity',
      }),
      runtimeEvent(scope, 4, 'action.completed', {
        actionId: 'action-drift',
        toolCallId: 'tool-call-drifted',
      }),
      runtimeEvent(scope, 5, 'action.observation', {
        actionId: 'action-drift',
        observationId: 'observation-drift',
        toolCallId: 'tool-call-drifted',
        terminal: true,
        outcome: 'success',
        output: { ok: true },
      }),
    ])

    expect(projection.cards).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-call-canonical',
        phase: 'completed',
        terminal: true,
        result: { ok: true },
      }),
    ])
    expect(projection.recoveryRequired).toBe(false)
    expect(projection.recoveryReasonCodes).toEqual([])
    expect(projection.trace.filter(update => update.traceOnly)).toEqual([
      expect.objectContaining({
        factType: 'tool-progress',
        accepted: false,
        card: expect.objectContaining({
          toolCallId: 'tool-call-drifted',
        }),
      }),
      expect.objectContaining({
        factType: 'tool-result',
        accepted: false,
        card: expect.objectContaining({
          toolCallId: 'tool-call-drifted',
        }),
      }),
    ])
  })

  it('takes the result only from a persisted observation, never from terminal event payload', () => {
    const scope = runtimeScope({ turnId: 'turn-observation-authority' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.cli',
        providerToolName: 'cli',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.cli',
        providerToolName: 'cli',
      }),
      runtimeEvent(scope, 3, 'action.completed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        result: { forged: true },
      }),
    ])

    expect(projection.cards[0]).toMatchObject({
      phase: 'started',
      terminal: false,
    })
    expect(projection.cards[0]?.result).toBeUndefined()
  })

  it.each([
    {
      eventType: 'action.failed' as const,
      expectedPhase: 'failed',
      payload: {
        errorCode: 'TOOL_EXECUTION_FAILED',
        error: 'tool process exited',
      },
      expectedErrorCode: 'TOOL_EXECUTION_FAILED',
      expectedErrorMessage: 'tool process exited',
    },
    {
      eventType: 'action.cancelled' as const,
      expectedPhase: 'cancelled',
      payload: {
        reason: 'user cancelled the action',
      },
      expectedErrorCode: null,
      expectedErrorMessage: 'user cancelled the action',
    },
    {
      eventType: 'action.dead_lettered' as const,
      expectedPhase: 'failed',
      payload: {
        errorCode: 'ACTION_DEAD_LETTERED',
        errorMessage: 'retry budget exhausted',
      },
      expectedErrorCode: 'ACTION_DEAD_LETTERED',
      expectedErrorMessage: 'retry budget exhausted',
    },
  ])('settles $eventType without inventing an observation result', ({
    eventType,
    expectedPhase,
    payload,
    expectedErrorCode,
    expectedErrorMessage,
  }) => {
    const scope = runtimeScope({ turnId: `turn-${eventType}` })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 3, eventType, {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        ...payload,
        result: { forged: true },
      }),
    ])

    expect(projection.cards).toMatchObject([{
      toolCallId: 'tool-call-1',
      phase: expectedPhase,
      terminal: true,
      errorCode: expectedErrorCode,
      errorMessage: expectedErrorMessage,
    }])
    expect(projection.cards[0]?.result).toBeUndefined()
    expect(projection.recoveryRequired).toBe(false)
  })

  it('keeps an action without terminal settlement visibly running and marks recovery required', () => {
    const scope = runtimeScope({ turnId: 'turn-unsettled-action' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        phase: 'running',
        elapsedMs: 8_000,
        signal: 'liveness',
        summary: 'still running',
      }),
    ])

    expect(projection).toMatchObject({
      recoveryRequired: true,
      recoveryReasonCodes: ['runtime-replay:tool-actions-unsettled'],
      cards: [{
        toolCallId: 'tool-call-1',
        phase: 'running',
        terminal: false,
        step: { summary: 'still running' },
      }],
    })
  })

  it('settles an active tool when the runtime reaches a terminal timeout without an observation', () => {
    const scope = runtimeScope({ turnId: 'turn-runtime-timeout-settlement' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-timeout-settlement',
        toolCallId: 'tool-timeout-settlement',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-timeout-settlement',
        toolCallId: 'tool-timeout-settlement',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-timeout-settlement',
        toolCallId: 'tool-timeout-settlement',
        phase: 'running',
        elapsedMs: 180_000,
        signal: 'liveness',
        summary: 'waiting for provider',
      }),
      runtimeEvent(scope, 4, 'runtime.timed_out', {
        reason: 'model step budget exhausted',
        errorCode: 'CODEX_TIMEOUT',
        timeoutMs: 180_000,
      }),
    ])

    expect(projection).toMatchObject({
      recoveryRequired: false,
      cards: [{
        toolCallId: 'tool-timeout-settlement',
        phase: 'timeout',
        terminal: true,
        timeoutMs: 180_000,
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'model step budget exhausted',
      }],
    })
  })

  it('does not reopen a terminal card when a late progress event is replayed', () => {
    const scope = runtimeScope({ turnId: 'turn-late-progress' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 3, 'action.observation', {
        actionId: 'action-1',
        observationId: 'observation-1',
        toolCallId: 'tool-call-1',
        terminal: true,
        outcome: 'success',
        output: { ok: true },
      }),
      runtimeEvent(scope, 4, 'action.completed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
      }),
      runtimeEvent(scope, 5, 'action.progress', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        phase: 'running',
        elapsedMs: 10_000,
        summary: 'late adapter heartbeat',
      }),
    ])

    expect(projection.cards[0]).toMatchObject({
      phase: 'completed',
      terminal: true,
      result: { ok: true },
    })
    expect(projection.cards).toHaveLength(1)
    expect(projection.trace).toEqual([
      expect.objectContaining({
        factType: 'tool-progress',
        accepted: false,
        traceOnly: true,
      }),
    ])
  })

  it('does not create a visible tool card from action facts after the turn is terminal', () => {
    const scope = runtimeScope({ turnId: 'turn-terminal-before-action' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'turn.accepted', {
        deliveryOwner: 'inline',
      }),
      runtimeEvent(scope, 2, 'turn.failed', {
        error: 'provider failed',
      }),
      runtimeEvent(scope, 3, 'action.started', {
        actionId: 'late-action',
        toolCallId: 'late-tool-call',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'codex',
      }),
    ])

    expect(projection.cards).toEqual([])
    expect(projection.recoveryRequired).toBe(false)
    expect(projection.trace).toEqual([
      expect.objectContaining({
        factType: 'tool-call',
        accepted: false,
        traceOnly: true,
        card: expect.objectContaining({
          toolCallId: 'late-tool-call',
        }),
      }),
    ])
  })

  it('uses an explicit selected channel or stable capability mapping, never arbitrary payload text', () => {
    const scope = runtimeScope({ turnId: 'turn-channel-source' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-explicit',
        toolCallId: 'tool-call-explicit',
        capabilityId: 'coding_agent.cli',
        providerToolName: 'codex',
        selectedChannel: 'claude-code',
        result: { channel: 'browser' },
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-explicit',
        toolCallId: 'tool-call-explicit',
        capabilityId: 'coding_agent.cli',
        providerToolName: 'codex',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-explicit',
        toolCallId: 'tool-call-explicit',
        capabilityId: 'coding_agent.cli',
        providerToolName: 'codex',
        phase: 'running',
        elapsedMs: 100,
      }),
      runtimeEvent(scope, 4, 'model.tool_call.proposed', {
        actionId: 'action-capability',
        toolCallId: 'tool-call-capability',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
      }),
    ])

    expect(projection.cards).toMatchObject([
      {
        toolCallId: 'tool-call-explicit',
        selectedChannel: 'claude-code',
      },
      {
        toolCallId: 'tool-call-capability',
        selectedChannel: 'codex',
      },
    ])
  })

  it('keeps the first confirmed replay channel when later typed facts conflict', () => {
    const scope = runtimeScope({ turnId: 'turn-channel-conflict' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'codex',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.cli',
        providerToolName: 'cli',
        selectedChannel: 'cli',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.cli',
        providerToolName: 'cli',
        selectedChannel: 'cli',
        phase: 'running',
        elapsedMs: 100,
      }),
    ])

    expect(projection.cards).toMatchObject([{
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
      phase: 'running',
    }])
  })

  it('lets the first typed replay channel replace an earlier capability inference', () => {
    const scope = runtimeScope({ turnId: 'turn-channel-inference' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'cli',
      }),
      runtimeEvent(scope, 3, 'action.progress', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'browser',
        phase: 'running',
        elapsedMs: 100,
      }),
    ])

    expect(projection.cards).toMatchObject([{
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      selectedChannel: 'cli',
      phase: 'running',
    }])
  })

  it('projects a typed channel confirmation immediately without waiting for progress', () => {
    const scope = runtimeScope({ turnId: 'turn-channel-confirmed-on-start' })
    const projection = projectAlicizationRuntimeToolEvents([
      runtimeEvent(scope, 1, 'model.tool_call.proposed', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
      }),
      runtimeEvent(scope, 2, 'action.started', {
        actionId: 'action-1',
        toolCallId: 'tool-call-1',
        capabilityId: 'coding_agent.codex',
        providerToolName: 'coding_agent',
        selectedChannel: 'cli',
      }),
    ])

    expect(projection.cards).toMatchObject([{
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      selectedChannel: 'cli',
      phase: 'started',
    }])
  })
})
