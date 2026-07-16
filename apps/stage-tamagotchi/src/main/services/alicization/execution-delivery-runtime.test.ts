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

  it('preserves richer callback project-state carry across snapshot and restore so restart delivery does not fall back to a generic phase shell', () => {
    const now = 30_000
    const source = createAlicizationExecutionDeliveryRuntime({
      getNow: () => now,
    })

    source.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-project-state',
      channel: 'cli',
      status: 'completed',
      goal: 'Carry the callback result back on the continuity state after restart.',
      summary: 'Restart callback continuity still needs its own identity-continuity',
      outcome: 'patched callback continuity seam',
      signature: 'thread-project-state:event',
      completedAt: 22_000,
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Restart callback continuity already survives pending delivery persistence instead of dropping back to a generic project shell.',
        primaryOpenLoop: 'Execution callback continuity still needs stronger identity-continuity',
        nextClosureTarget: 'Keep restart callback delivery on the continuity state before expansion',
        sameHerSelfLine: 'This callback turn still belongs to the identity continuity, so keep the return on the same callback line after restart.',
        sameHerDriftRisk: 'If restart delivery falls back to a generic Phase 1 shell, treat it as unfinished callback drift.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=restart callback continuity | next=same callback line',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        companionHeadlineLine: 'Right now she is still holding together mainly through voice, face, motion, and lipsync, so this restart callback must reopen on that continuity state.',
        companionBriefingLine: 'pre_turn_context_digest',
        emotionalClosureSummary: 'identity-continuity',
        continuityCue: 'same-digital-life-project-thread | restart-callback | identity-continuity',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      } as any,
    })

    const snapshot = source.snapshot('default')
    const restored = createAlicizationExecutionDeliveryRuntime({
      getNow: () => now,
    })
    restored.restore('default', snapshot)

    expect(restored.snapshot('default')).toEqual(expect.objectContaining({
      pending: [expect.objectContaining({
        threadId: 'thread-project-state',
        projectState: expect.objectContaining({
          latestLandedProgress: 'Restart callback continuity already survives pending delivery persistence instead of dropping back to a generic project shell.',
          primaryOpenLoop: 'Execution callback continuity still needs stronger identity-continuity',
          nextClosureTarget: 'Keep restart callback delivery on the continuity state before expansion',
          sameHerSelfLine: 'This callback turn still belongs to the identity continuity, so keep the return on the same callback line after restart.',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          companionHeadlineLine: 'Right now she is still holding together mainly through voice, face, motion, and lipsync, so this restart callback must reopen on that continuity state.',
          companionBriefingLine: 'pre_turn_context_digest',
          emotionalClosureSummary: 'identity-continuity',
          continuityCue: 'same-digital-life-project-thread | restart-callback | identity-continuity',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        }),
      })],
    }))
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
