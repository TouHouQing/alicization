import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationExecutionCallbackRuntime,
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    goal: 'Run the CLI check command',
    kind: 'run-command',
    status: 'completed',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'pnpm test completed successfully',
    metadata: null,
    createdAt: 1_000,
    updatedAt: 2_000,
    lastEventAt: 2_500,
    completedAt: 2_500,
    ...overrides,
  }
}

function createEvent(overrides: Partial<AlicizationExecutionEventRecord> = {}): AlicizationExecutionEventRecord {
  return {
    id: 'event-1',
    threadId: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    channel: 'cli',
    kind: 'result',
    threadStatus: 'completed',
    payload: {
      stdout: 'all tests passed',
    },
    createdAt: 2_500,
    ...overrides,
  }
}

describe('execution callback runtime', () => {
  it('surfaces freshly completed task threads into a callback context once per session window', async () => {
    const listTaskThreads = vi.fn(async () => [createThread()])
    const listExecutionEvents = vi.fn(async () => [createEvent()])
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads,
      listExecutionEvents,
    })

    const first = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const second = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(first.systemBlock).toContain('[ALICIZATION_EXECUTION_CALLBACKS]')
    expect(first.recallText).toContain('execution_callback_channel:cli')
    expect(first.recallText).toContain('execution_callback_outcome:all tests passed')
    expect(first.callbacks).toEqual([{
      channel: 'cli',
      createdAt: 2_500,
      decisionTraceId: 'trace-1',
      goal: 'Run the CLI check command',
      outcome: 'all tests passed',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'Completed Run the CLI check command: all tests passed',
      threadId: 'thread-1',
      turnId: 'turn-1',
    }])
    expect(first.actions).toEqual([{
      kind: 'executor',
      status: 'completed',
      label: 'callback:cli',
      summary: 'Completed Run the CLI check command: all tests passed',
      signature: 'thread-1:event-1',
      finishedAt: 2_500,
      metadata: {
        source: 'execution-callback-runtime',
        threadId: 'thread-1',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        selectedChannel: 'cli',
        threadStatus: 'completed',
      },
    }])
    expect(first.continuitySignals).toEqual([{
      kind: 'execution-callback',
      state: 'fresh',
      label: 'callback:cli',
      summary: 'Completed Run the CLI check command: all tests passed',
      signature: 'thread-1:event-1',
      createdAt: 2_500,
      metadata: {
        source: 'execution-callback-runtime',
        continuityKind: 'execution-callback',
        threadId: 'thread-1',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        selectedChannel: 'cli',
        threadStatus: 'completed',
      },
    }])
    expect(second).toEqual(emptyAlicizationExecutionCallbackContext)
    expect(listExecutionEvents).toBeCalledWith({
      threadId: 'thread-1',
      limit: 8,
    })
  })

  it('ignores stale or non-terminal task threads', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 60 * 60 * 1000,
      listTaskThreads: vi.fn(async () => [
        createThread({
          status: 'running',
          updatedAt: 1_000,
          lastEventAt: 1_000,
          completedAt: null,
        }),
        createThread({
          id: 'thread-stale',
          updatedAt: 1_000,
          lastEventAt: 1_000,
          completedAt: 1_000,
        }),
      ]),
      listExecutionEvents: vi.fn(async () => [createEvent()]),
    })

    await expect(runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('allows runtime delivery to mark a callback as already surfaced', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread()]),
      listExecutionEvents: vi.fn(async () => [createEvent()]),
    })

    runtime.markSurfaced({
      sessionId: 'session-1',
      createdAt: 2_500,
    })

    await expect(runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
  })
})
