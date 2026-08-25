import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeExecutionComposition } from './runtime-execution-composition'

function createThread(id: string, activityAt: number): AlicizationTaskThreadRecord {
  return {
    id,
    decisionTraceId: `trace-${id}`,
    turnId: `turn-${id}`,
    sessionId: 'session-1',
    origin: 'user-turn',
    goal: `Complete ${id}`,
    kind: 'run-command',
    status: 'completed',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: `${id} completed`,
    metadata: null,
    createdAt: 1_000,
    updatedAt: activityAt,
    lastEventAt: activityAt,
    completedAt: activityAt,
  }
}

function createEvent(threadId: string, activityAt: number): AlicizationExecutionEventRecord {
  return {
    id: `event-${threadId}`,
    threadId,
    decisionTraceId: `trace-${threadId}`,
    turnId: `turn-${threadId}`,
    sessionId: 'session-1',
    origin: 'user-turn',
    channel: 'cli',
    kind: 'result',
    threadStatus: 'completed',
    payload: {
      summary: `${threadId} completed`,
    },
    createdAt: activityAt,
  }
}

describe('runtime execution composition', () => {
  it('persists a compound callback cursor so restart does not replay or lose same-millisecond threads', async () => {
    const meta = new Map<string, string>()
    const activityAt = Date.now()
    let threads = [createThread('thread-a', activityAt)]
    const alicizationDb = {
      getMetaValue: vi.fn(async (key: string) => meta.get(key)),
      setMetaValue: vi.fn(async (key: string, value: string) => {
        meta.set(key, value)
      }),
      listTaskThreads: vi.fn(async () => threads),
      listExecutionEvents: vi.fn(async input => input?.threadId ? [createEvent(input.threadId, activityAt)] : []),
    }

    const first = createAlicizationRuntimeExecutionComposition({ alicizationDb })
    const firstContext = await first.executionCallbackRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    expect(firstContext.callbacks.map(item => item.threadId)).toEqual(['thread-a'])

    threads = [createThread('thread-a', activityAt), createThread('thread-b', activityAt)]
    const restarted = createAlicizationRuntimeExecutionComposition({ alicizationDb })
    const restartedContext = await restarted.executionCallbackRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    expect(restartedContext.callbacks.map(item => item.threadId)).toEqual(['thread-b'])

    const persisted = JSON.parse(
      meta.get('execution_callback_surfaced_cursor_v2:session-1') ?? '{}',
    ) as Record<string, unknown>
    expect(persisted).toEqual({
      activityAt,
      threadId: 'thread-b',
    })
  })

  it('atomically migrates a legacy numeric cursor before consuming same-millisecond callbacks', async () => {
    const activityAt = Date.now()
    const legacyRaw = JSON.stringify({
      cursors: {
        'session-1': activityAt,
      },
    })
    const meta = new Map<string, string>([
      ['execution_callback_surfaced_cursor_v1', legacyRaw],
    ])
    const compareAndSetMetaValue = vi.fn(async (
      key: string,
      expectedValue: string | undefined,
      nextValue: string,
    ) => {
      if (meta.get(key) !== expectedValue)
        return false
      meta.set(key, nextValue)
      return true
    })
    const alicizationDb = {
      getMetaValue: vi.fn(async (key: string) => meta.get(key)),
      setMetaValue: vi.fn(async (key: string, value: string) => {
        meta.set(key, value)
      }),
      compareAndSetMetaValue,
      listTaskThreads: vi.fn(async () => [
        createThread('thread-a', activityAt),
        createThread('thread-b', activityAt),
      ]),
      listExecutionEvents: vi.fn(async input => input?.threadId
        ? [createEvent(input.threadId, activityAt)]
        : []),
    }

    const runtime = createAlicizationRuntimeExecutionComposition({ alicizationDb })
    const context = await runtime.executionCallbackRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.callbacks.map(item => item.threadId)).toEqual(['thread-a', 'thread-b'])
    expect(compareAndSetMetaValue).toHaveBeenCalledWith(
      'execution_callback_surfaced_cursor_v2:session-1',
      undefined,
      JSON.stringify({
        activityAt,
        threadId: 'thread-b',
      }),
    )
  })

  it('atomically migrates a legacy compound cursor before consuming later callbacks', async () => {
    const activityAt = Date.now()
    const legacyCursor = {
      activityAt,
      threadId: 'thread-a',
    }
    const legacyRaw = JSON.stringify({
      cursors: {
        'session-1': legacyCursor,
      },
    })
    const meta = new Map<string, string>([
      ['execution_callback_surfaced_cursor_v1', legacyRaw],
    ])
    const compareAndSetMetaValue = vi.fn(async (
      key: string,
      expectedValue: string | undefined,
      nextValue: string,
    ) => {
      if (meta.get(key) !== expectedValue)
        return false
      meta.set(key, nextValue)
      return true
    })
    const alicizationDb = {
      getMetaValue: vi.fn(async (key: string) => meta.get(key)),
      setMetaValue: vi.fn(async (key: string, value: string) => {
        meta.set(key, value)
      }),
      compareAndSetMetaValue,
      listTaskThreads: vi.fn(async () => [
        createThread('thread-a', activityAt),
        createThread('thread-b', activityAt),
      ]),
      listExecutionEvents: vi.fn(async input => input?.threadId
        ? [createEvent(input.threadId, activityAt)]
        : []),
    }

    const runtime = createAlicizationRuntimeExecutionComposition({ alicizationDb })
    const context = await runtime.executionCallbackRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.callbacks.map(item => item.threadId)).toEqual(['thread-b'])
    expect(compareAndSetMetaValue).toHaveBeenCalledWith(
      'execution_callback_surfaced_cursor_v2:session-1',
      undefined,
      JSON.stringify({
        activityAt,
        threadId: 'thread-b',
      }),
    )
  })
})
