import { describe, expect, it } from 'vitest'

import {
  createAlicizationExecutionDeliveryRuntime,
  hasAlicizationExecutionDeliveryRetainedState,
} from './execution-delivery-runtime'

describe('execution delivery runtime', () => {
  it('queues each terminal task-thread delivery once and consumes it in chronological order', () => {
    const now = 10_000
    const runtime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => now,
    })

    const first = runtime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-1',
      channel: 'cli',
      status: 'completed',
      goal: 'Run the CLI check command',
      summary: 'pnpm test completed successfully',
      outcome: 'all tests passed',
      signature: 'thread-1:event-1',
      completedAt: 2_000,
    })
    const duplicate = runtime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-1',
      channel: 'cli',
      status: 'completed',
      goal: 'Run the CLI check command',
      summary: 'pnpm test completed successfully',
      outcome: 'all tests passed',
      signature: 'thread-1:event-1',
      completedAt: 2_000,
    })
    const second = runtime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-2',
      channel: 'codex',
      status: 'failed',
      goal: 'Inspect the codebase',
      summary: 'Codex failed to start',
      outcome: 'sandbox refused the request',
      signature: 'thread-2:event-2',
      completedAt: 3_000,
    })

    expect(first?.threadId).toBe('thread-1')
    expect(duplicate).toBeNull()
    expect(second?.threadId).toBe('thread-2')
    expect(runtime.hasPending({
      cardId: 'default',
      sessionId: 'session-1',
    })).toBe(true)

    const consumedFirst = runtime.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })
    expect(consumedFirst?.threadId).toBe('thread-1')

    runtime.markDelivered(consumedFirst!)
    expect(runtime.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })?.threadId).toBe('thread-2')
    expect(runtime.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })).toBeNull()
  })

  it('requeues failed deliveries and prunes stale pending entries', () => {
    let now = 30_000
    const runtime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => now,
      maxAgeMs: 5_000,
    })

    runtime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-fresh',
      channel: 'cli',
      status: 'completed',
      goal: 'Run the fresh task',
      summary: 'fresh summary',
      signature: 'thread-fresh:event',
      completedAt: 28_000,
    })
    runtime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-stale',
      channel: 'cli',
      status: 'completed',
      goal: 'Run the stale task',
      summary: 'stale summary',
      signature: 'thread-stale:event',
      completedAt: 10_000,
    })

    const claimed = runtime.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })
    expect(claimed?.threadId).toBe('thread-fresh')

    expect(runtime.requeue(claimed!)).toBe(true)
    expect(runtime.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })?.threadId).toBe('thread-fresh')

    now = 40_500
    expect(runtime.hasPending({
      cardId: 'default',
      sessionId: 'session-1',
    })).toBe(false)
  })

  it('restores pending deliveries and delivered dedupe state from a snapshot', () => {
    const now = 30_000
    const source = createAlicizationExecutionDeliveryRuntime({
      getNow: () => now,
    })

    source.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-delivered',
      channel: 'cli',
      status: 'completed',
      goal: 'Finish the delivered task',
      summary: 'delivered summary',
      signature: 'thread-delivered:event',
      completedAt: 20_000,
    })
    source.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-pending',
      channel: 'codex',
      status: 'failed',
      goal: 'Finish the pending task',
      summary: 'pending summary',
      signature: 'thread-pending:event',
      completedAt: 22_000,
    })

    const delivered = source.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })
    expect(delivered?.threadId).toBe('thread-delivered')
    source.markDelivered(delivered!)

    const snapshot = source.snapshot('default')
    const restored = createAlicizationExecutionDeliveryRuntime({
      getNow: () => now,
    })
    restored.restore('default', snapshot)

    expect(restored.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-delivered',
      channel: 'cli',
      status: 'completed',
      goal: 'Finish the delivered task',
      summary: 'delivered summary',
      signature: 'thread-delivered:event',
      completedAt: 20_000,
    })).toBeNull()
    expect(restored.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })?.threadId).toBe('thread-pending')
    expect(restored.snapshot('default')).toEqual({
      version: 2,
      pending: [],
      delivered: [{
        key: 'default::session-1::thread-delivered::20000::completed',
        deliveredAt: now,
      }],
      surfaced: [{
        identity: 'default::session-1::thread-delivered::20000',
        deliveredAt: now,
      }],
    })
  })

  it('preserves terminal execution failure facts across queue snapshots', () => {
    const runtime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })

    const queued = runtime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-failed',
      channel: 'codex',
      status: 'failed',
      goal: 'Run the coding agent',
      summary: 'Codex active command exceeded its execution step deadline',
      outcome: 'Codex active work item command_execution (command-1) exceeded its 1800000ms deadline.',
      errorCode: 'CODEX_ACTIVE_STEP_TIMEOUT',
      errorMessage: 'Codex active work item command_execution (command-1) exceeded its 1800000ms deadline.',
      signature: 'thread-failed:event',
      completedAt: 9_000,
    })

    expect(queued).toMatchObject({
      errorCode: 'CODEX_ACTIVE_STEP_TIMEOUT',
      errorMessage: 'Codex active work item command_execution (command-1) exceeded its 1800000ms deadline.',
    })

    const snapshot = runtime.snapshot('default')
    const restored = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    restored.restore('default', snapshot)

    expect(restored.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })).toMatchObject({
      errorCode: 'CODEX_ACTIVE_STEP_TIMEOUT',
      errorMessage: 'Codex active work item command_execution (command-1) exceeded its 1800000ms deadline.',
    })
  })

  it('blocks in-flight delivery requeue once the same execution result was already surfaced inline', () => {
    const now = 50_000
    const runtime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => now,
    })

    runtime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-inline',
      channel: 'cli',
      status: 'completed',
      goal: 'List desktop files requested by user.',
      summary: 'Listed desktop entries (8): 小砖猿, GIT, +6 more',
      signature: 'thread-inline:event',
      completedAt: 20_000,
    })

    const claimed = runtime.takeNext({
      cardId: 'default',
      sessionId: 'session-1',
    })
    expect(claimed?.threadId).toBe('thread-inline')

    expect(runtime.markInlineSurfaced({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-inline',
      completedAt: 20_000,
    })).toBe(true)
    expect(runtime.isInlineSurfaced({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-inline',
      completedAt: 20_000,
    })).toBe(true)
    expect(runtime.requeue(claimed!)).toBe(false)
  })

  it('treats surfaced-only state as retained execution-delivery state', () => {
    expect(hasAlicizationExecutionDeliveryRetainedState({
      pending: [],
      delivered: [],
      surfaced: [{
        identity: 'default::session-1::thread-inline::20000',
        deliveredAt: 50_000,
      }],
    })).toBe(true)

    expect(hasAlicizationExecutionDeliveryRetainedState({
      pending: [],
      delivered: [],
      surfaced: [],
    })).toBe(false)
  })
})
