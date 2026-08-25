import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationExecutionCallbackCursor } from './execution-callback-runtime'

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

function parseSystemBlock(value: string) {
  return JSON.parse(value) as {
    type: string
    data: {
      alreadyExecuted: boolean
      callbacks: Array<Record<string, unknown>>
    }
  }
}

function createRuntime(input: {
  threads?: AlicizationTaskThreadRecord[]
  events?: AlicizationExecutionEventRecord[]
  now?: number
  cursorStore?: {
    get: (sessionId: string) => Promise<number | AlicizationExecutionCallbackCursor>
    set: (sessionId: string, cursor: AlicizationExecutionCallbackCursor) => Promise<void>
    compareAndSet?: (
      sessionId: string,
      expected: AlicizationExecutionCallbackCursor,
      next: AlicizationExecutionCallbackCursor,
    ) => Promise<boolean>
  }
  maxPendingCallbacks?: number
  pageSize?: number
}) {
  return createAlicizationExecutionCallbackRuntime({
    getNow: () => input.now ?? 10_000,
    listTaskThreads: vi.fn(async _query => input.threads ?? [createThread()]),
    listExecutionEvents: vi.fn(async () => input.events ?? [createEvent()]),
    cursorStore: input.cursorStore,
    maxPendingCallbacks: input.maxPendingCallbacks,
    pageSize: input.pageSize,
  })
}

describe('execution callback runtime', () => {
  it('surfaces fresh terminal task facts once per session window', async () => {
    const runtime = createRuntime({})

    const first = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const second = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    const system = parseSystemBlock(first.systemBlock)
    expect(system.type).toBe('alicization-execution-callbacks')
    expect(system.data.alreadyExecuted).toBe(true)
    expect(system.data.callbacks[0]).toEqual(expect.objectContaining({
      channel: 'cli',
      goal: 'Run the CLI check command',
      outcome: 'all tests passed',
      status: 'completed',
      summary: 'Completed Run the CLI check command: all tests passed',
    }))
    expect(first.recallText).toContain('execution_callback_channel:cli')
    expect(first.recallText).toContain('execution_callback_outcome:all tests passed')
    expect(second).toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('ignores stale or non-terminal task threads', async () => {
    const runtime = createRuntime({
      now: 60 * 60 * 1000,
      threads: [
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
      ],
    })

    await expect(runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('supports marking a callback surfaced and non-consuming previews', async () => {
    const runtime = createRuntime({})

    const preview = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })
    const consumed = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const afterConsumed = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(consumed.callbacks[0]).toEqual(preview.callbacks[0])
    expect(afterConsumed).toEqual(emptyAlicizationExecutionCallbackContext)

    const nextRuntime = createRuntime({})
    nextRuntime.markSurfaced({
      sessionId: 'session-1',
      createdAt: 2_500,
    })
    await expect(nextRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('prefers event summary over raw stdout in recall facts', async () => {
    const runtime = createRuntime({
      events: [createEvent({
        payload: {
          stdout: 'total 12 drwxr-xr-x ...',
          summary: 'Listed desktop entries (2): 小砖猿, GIT',
        },
      })],
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.callbacks[0]?.outcome).toBe('Listed desktop entries (2): 小砖猿, GIT')
    expect(context.recallText).toContain('execution_callback_outcome:Listed desktop entries (2): 小砖猿, GIT')
    expect(context.recallText).not.toContain('drwxr-xr-x')
  })

  it('preserves blocked execution safety facts without persona cover', async () => {
    const runtime = createRuntime({
      threads: [createThread({
        status: 'blocked',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        goal: 'Edit local files without explicit confirmation',
        summary: 'Codex dispatch was blocked before process launch.',
      })],
      events: [createEvent({
        channel: 'codex',
        threadStatus: 'blocked',
        payload: {
          errorCode: 'CODEX_PERMISSION_REQUIRED',
          errorMessage: 'Mutating Codex dispatch requires permission before execution.',
          safetyGate: {
            effect: 'mutate',
            permissionMode: 'none',
            confirmationRequired: true,
            riskPolicy: 'implicit-or-explicit-confirmation-required',
            auditability: 'blocked-before-dispatch',
            interruptibility: 'no-process-started',
          },
        },
      })],
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const system = parseSystemBlock(context.systemBlock)
    const callback = system.data.callbacks[0]

    expect(context.recallText).toContain('execution_callback_safety_gate:')
    expect(context.recallText).toContain('risk=implicit-or-explicit-confirmation-required')
    expect(context.recallText).toContain('confirmation=required')
    expect(callback.safetyGate).toEqual(expect.objectContaining({
      auditability: 'blocked-before-dispatch',
      confirmationRequired: true,
      interruptibility: 'no-process-started',
    }))
    expect(context.actions[0]?.metadata).toEqual(expect.objectContaining({
      safetyGateSummary: expect.stringContaining('risk=implicit-or-explicit-confirmation-required'),
    }))
    expect(context.continuitySignals[0]?.metadata).toEqual(expect.objectContaining({
      safetyGateSummary: expect.stringContaining('interrupt=no-process-started'),
    }))
  })

  it('preserves host-confirmed resume facts without internal continuity cue text', async () => {
    const runtime = createRuntime({
      threads: [createThread({
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        goal: 'Resume confirmed local execution',
      })],
      events: [
        createEvent({
          id: 'event-resume-1',
          kind: 'resume',
          threadStatus: 'planned',
          createdAt: 2_300,
          payload: {
            approval: 'host-confirmed',
            previousStatus: 'needs-affirmation',
            resumedStatus: 'planned',
            previousPermissionMode: 'none',
            permissionMode: 'explicit',
            effect: 'mutate',
            riskBudget: 'medium',
            affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
            confirmationBoundary: 'host-confirmed-before-redispatch',
            auditability: 'resume-before-dispatch',
            interruptibility: 'process-not-yet-restarted',
            projectIdentity: 'legacy project identity',
            projectContinuityCue: 'retired_policy=legacy',
          },
        }),
        createEvent({
          id: 'event-result-1',
          kind: 'result',
          threadStatus: 'completed',
          createdAt: 2_500,
          payload: {
            summary: 'Resumed execution completed after host confirmation.',
          },
        }),
      ],
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const system = parseSystemBlock(context.systemBlock)
    const callback = system.data.callbacks[0]

    expect(context.recallText).toContain('execution_callback_resume_confirmation:')
    expect(context.recallText).toContain('host-confirmed-before-redispatch')
    expect(context.recallText).toContain('resume-before-dispatch')
    expect(callback.resumeConfirmation).toEqual(expect.objectContaining({
      approval: 'host-confirmed',
      confirmationBoundary: 'host-confirmed-before-redispatch',
      interruptibility: 'process-not-yet-restarted',
    }))
    expect(JSON.stringify(callback)).not.toMatch(/legacy project identity|retired provider policy cue/iu)
    expect(context.actions[0]?.metadata).toEqual(expect.objectContaining({
      resumeConfirmationSummary: expect.stringContaining('host-confirmed-before-redispatch'),
    }))
  })

  it('restores the surfaced cursor from durable storage after a runtime restart', async () => {
    let storedCursor: number | AlicizationExecutionCallbackCursor = 0
    const cursorStore = {
      get: vi.fn(async () => storedCursor),
      set: vi.fn(async (_sessionId: string, cursor: AlicizationExecutionCallbackCursor) => {
        storedCursor = cursor
      }),
    }

    const firstRuntime = createRuntime({ cursorStore })
    await firstRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    const restartedRuntime = createRuntime({ cursorStore })
    await expect(restartedRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
    expect(cursorStore.set).toHaveBeenCalledWith('session-1', {
      activityAt: 2_500,
      threadId: 'thread-1',
    })
  })

  it('scans terminal task threads across pages instead of dropping candidates after the first page', async () => {
    const threads = Array.from({ length: 10 }, (_, index) => createThread({
      id: `thread-${index + 1}`,
      createdAt: 1_000 + index,
      updatedAt: 2_000 + index,
      lastEventAt: 2_500 + index,
      completedAt: 2_500 + index,
    }))
    const listTaskThreads = vi.fn(async (input?: { limit?: number, cursor?: string | null, order?: 'asc' | 'desc' }) => {
      const offset = input?.cursor
        ? Number(JSON.parse(decodeURIComponent(input.cursor)).activityAt)
        : 0
      const limit = input?.limit ?? 3
      const page = threads.filter(thread => (thread.lastEventAt ?? 0) > offset).slice(0, limit)
      return page
    })
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      pageSize: 3,
      maxPendingCallbacks: 5,
      listTaskThreads,
      listExecutionEvents: vi.fn(async input => [createEvent({
        id: `event-${input?.threadId ?? 'unknown'}`,
        threadId: input?.threadId ?? 'thread-1',
        createdAt: 2_500,
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })

    expect(context.callbacks).toHaveLength(5)
    expect(listTaskThreads.mock.calls.length).toBeGreaterThan(1)
    expect(listTaskThreads.mock.calls.slice(1).some(([query]) => query?.cursor)).toBe(true)
  })

  it('surfaces terminal threads completed in the same millisecond across separate consumptions', async () => {
    const threads = [
      createThread({
        id: 'thread-a',
        lastEventAt: 2_500,
        completedAt: 2_500,
      }),
      createThread({
        id: 'thread-b',
        lastEventAt: 2_500,
        completedAt: 2_500,
      }),
    ]
    const runtime = createRuntime({
      maxPendingCallbacks: 1,
      threads,
      events: [
        createEvent({
          id: 'event-a',
          threadId: 'thread-a',
          createdAt: 2_500,
        }),
        createEvent({
          id: 'event-b',
          threadId: 'thread-b',
          createdAt: 2_500,
        }),
      ],
    })

    const first = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const second = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(first.callbacks).toHaveLength(1)
    expect(second.callbacks).toHaveLength(1)
    expect(second.callbacks[0]?.threadId).not.toBe(first.callbacks[0]?.threadId)
  })

  it('keeps same-millisecond preview callbacks pending when one callback is marked surfaced', async () => {
    const runtime = createRuntime({
      maxPendingCallbacks: 1,
      threads: [
        createThread({
          id: 'thread-a',
          lastEventAt: 2_500,
          completedAt: 2_500,
        }),
        createThread({
          id: 'thread-b',
          lastEventAt: 2_500,
          completedAt: 2_500,
        }),
      ],
      events: [
        createEvent({
          id: 'event-a',
          threadId: 'thread-a',
          createdAt: 2_500,
        }),
        createEvent({
          id: 'event-b',
          threadId: 'thread-b',
          createdAt: 2_500,
        }),
      ],
    })

    const firstPreview = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })
    await runtime.markSurfaced({
      sessionId: 'session-1',
      threadId: 'thread-a',
      activityAt: 2_500,
      createdAt: firstPreview.callbacks[0]!.createdAt,
    })
    const secondPreview = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })

    expect(firstPreview.callbacks).toHaveLength(1)
    expect(secondPreview.callbacks).toHaveLength(1)
    expect(secondPreview.callbacks[0]?.threadId).not.toBe(firstPreview.callbacks[0]?.threadId)
  })

  it('serializes concurrent consuming reads so one callback is delivered once', async () => {
    const threads = [
      createThread({
        id: 'thread-a',
        lastEventAt: 2_500,
        completedAt: 2_500,
      }),
      createThread({
        id: 'thread-b',
        lastEventAt: 2_501,
        completedAt: 2_501,
      }),
    ]
    let releaseList: (() => void) | undefined
    let released = false
    const listGate = new Promise<void>((resolve) => {
      releaseList = () => {
        released = true
        resolve()
      }
    })
    const listTaskThreads = vi.fn(async () => {
      if (!released)
        await listGate
      return threads
    })
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      maxPendingCallbacks: 1,
      listTaskThreads,
      listExecutionEvents: vi.fn(async input => [createEvent({
        id: `event-${input?.threadId}`,
        threadId: input?.threadId ?? 'thread-a',
        createdAt: 2_500,
      })]),
    })

    const firstPromise = runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    await vi.waitFor(() => expect(listTaskThreads).toHaveBeenCalledOnce())
    const secondPromise = runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    releaseList?.()

    const [first, second] = await Promise.all([firstPromise, secondPromise])
    expect(new Set([
      first.callbacks[0]?.threadId,
      second.callbacks[0]?.threadId,
    ])).toEqual(new Set(['thread-a', 'thread-b']))
  })

  it('does not skip same-millisecond callbacks when markSurfaced identifies the thread exactly', async () => {
    const runtime = createRuntime({
      maxPendingCallbacks: 1,
      threads: [
        createThread({ id: 'thread-a', lastEventAt: 2_500, completedAt: 2_500 }),
        createThread({ id: 'thread-b', lastEventAt: 2_500, completedAt: 2_500 }),
      ],
      events: [
        createEvent({ id: 'event-a', threadId: 'thread-a', createdAt: 2_500 }),
        createEvent({ id: 'event-b', threadId: 'thread-b', createdAt: 2_500 }),
      ],
    })

    const preview = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })
    await runtime.markSurfaced({
      sessionId: 'session-1',
      threadId: preview.callbacks[0]!.threadId,
      activityAt: 2_500,
      createdAt: preview.callbacks[0]!.createdAt,
    })
    const next = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })

    expect(next.callbacks.map(item => item.threadId)).toEqual(['thread-b'])
  })

  it('surfaces cursor persistence errors instead of silently losing durable delivery state', async () => {
    const runtime = createRuntime({
      cursorStore: {
        get: vi.fn(async () => 0),
        set: vi.fn(async () => {
          throw new Error('cursor persistence unavailable')
        }),
      },
    })

    await expect(runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).rejects.toThrow('cursor persistence unavailable')
  })

  it('persists an exact compound cursor across restart without replaying the surfaced callback', async () => {
    let storedCursor: number | AlicizationExecutionCallbackCursor = 0
    const cursorStore = {
      get: vi.fn(async () => storedCursor),
      set: vi.fn(async (_sessionId: string, cursor: AlicizationExecutionCallbackCursor) => {
        storedCursor = cursor
      }),
    }
    const threads = [
      createThread({
        id: 'thread-a',
        lastEventAt: 2_500,
        completedAt: 2_500,
      }),
      createThread({
        id: 'thread-b',
        lastEventAt: 2_500,
        completedAt: 2_500,
      }),
    ]
    const events = [
      createEvent({
        id: 'event-a',
        threadId: 'thread-a',
        createdAt: 2_500,
      }),
      createEvent({
        id: 'event-b',
        threadId: 'thread-b',
        createdAt: 2_500,
      }),
    ]

    const firstRuntime = createRuntime({
      cursorStore,
      maxPendingCallbacks: 1,
      threads,
      events,
    })
    const first = await firstRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    const restartedRuntime = createRuntime({
      cursorStore,
      maxPendingCallbacks: 1,
      threads,
      events,
    })
    const second = await restartedRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const third = await restartedRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(first.callbacks).toHaveLength(1)
    expect(second.callbacks).toHaveLength(1)
    expect(third.callbacks).toHaveLength(0)
    expect(new Set([
      second.callbacks[0]?.threadId,
    ])).toEqual(new Set(['thread-b']))
    expect(cursorStore.set).toHaveBeenCalledWith('session-1', {
      activityAt: 2_500,
      threadId: 'thread-a',
    })
    expect(cursorStore.set).toHaveBeenLastCalledWith('session-1', {
      activityAt: 2_500,
      threadId: 'thread-b',
    })
  })

  it('rewinds a legacy numeric cursor so same-millisecond callbacks are not lost during migration', async () => {
    const cursorStore = {
      get: vi.fn(async () => 2_500 as number),
      set: vi.fn(async () => {}),
    }
    const runtime = createRuntime({
      cursorStore,
      maxPendingCallbacks: 2,
      threads: [
        createThread({
          id: 'thread-a',
          lastEventAt: 2_500,
          completedAt: 2_500,
        }),
        createThread({
          id: 'thread-b',
          lastEventAt: 2_500,
          completedAt: 2_500,
        }),
      ],
      events: [
        createEvent({
          id: 'event-a',
          threadId: 'thread-a',
          createdAt: 2_500,
        }),
        createEvent({
          id: 'event-b',
          threadId: 'thread-b',
          createdAt: 2_500,
        }),
      ],
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.callbacks.map(item => item.threadId)).toEqual(['thread-a', 'thread-b'])
  })

  it('does not duplicate a callback when two runtimes race on an atomic cursor store', async () => {
    let storedCursor: AlicizationExecutionCallbackCursor = {
      activityAt: 0,
      threadId: null,
    }
    const cursorStore = {
      get: vi.fn(async () => storedCursor),
      set: vi.fn(async (_sessionId: string, cursor: AlicizationExecutionCallbackCursor) => {
        storedCursor = cursor
      }),
      compareAndSet: vi.fn(async (
        _sessionId: string,
        expected: AlicizationExecutionCallbackCursor,
        next: AlicizationExecutionCallbackCursor,
      ) => {
        if (
          storedCursor.activityAt !== expected.activityAt
          || storedCursor.threadId !== expected.threadId
        ) {
          return false
        }
        storedCursor = next
        return true
      }),
    }
    const input = {
      threads: [createThread()],
      events: [createEvent()],
      cursorStore,
    }
    const firstRuntime = createRuntime(input)
    const secondRuntime = createRuntime(input)

    const [first, second] = await Promise.all([
      firstRuntime.buildPendingExecutionCallbackContext({ sessionId: 'session-1' }),
      secondRuntime.buildPendingExecutionCallbackContext({ sessionId: 'session-1' }),
    ])

    expect([
      first.callbacks.length,
      second.callbacks.length,
    ].filter(length => length === 1)).toHaveLength(1)
    expect([
      first.callbacks.length,
      second.callbacks.length,
    ].filter(length => length === 0)).toHaveLength(1)
  })

  it('does not skip same-millisecond callbacks when a legacy mark omits the thread id', async () => {
    const runtime = createRuntime({
      maxPendingCallbacks: 1,
      threads: [
        createThread({
          id: 'thread-a',
          lastEventAt: 2_500,
          completedAt: 2_500,
        }),
        createThread({
          id: 'thread-b',
          lastEventAt: 2_500,
          completedAt: 2_500,
        }),
      ],
      events: [
        createEvent({
          id: 'event-a',
          threadId: 'thread-a',
          createdAt: 2_500,
        }),
        createEvent({
          id: 'event-b',
          threadId: 'thread-b',
          createdAt: 2_500,
        }),
      ],
    })

    const preview = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })
    await runtime.markSurfaced({
      sessionId: 'session-1',
      activityAt: preview.callbacks[0]!.activityAt,
      createdAt: preview.callbacks[0]!.createdAt,
    })
    const next = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })

    expect(next.callbacks.map(item => item.threadId)).toEqual(['thread-b'])
  })

  it('resolves a legacy mark from the exact activity boundary instead of the newest default page', async () => {
    const sameMillisecondThreads = Array.from({ length: 65 }, (_, index) => createThread({
      id: index === 64 ? 'thread-target' : `thread-${String(index).padStart(2, '0')}`,
      lastEventAt: 2_500,
      completedAt: 2_500,
    }))
    const listTaskThreads = vi.fn(async (input?: { cursor?: string | null, limit?: number }) => {
      const limit = input?.limit ?? 64
      const cursor = input?.cursor
        ? JSON.parse(decodeURIComponent(input.cursor)) as AlicizationExecutionCallbackCursor
        : null
      return sameMillisecondThreads
        .filter(thread =>
          !cursor
          || (thread.lastEventAt ?? 0) > cursor.activityAt
          || (
            (thread.lastEventAt ?? 0) === cursor.activityAt
            && cursor.threadId !== null
            && thread.id > cursor.threadId
          ),
        )
        .slice(0, limit)
    })
    const cursorStore = {
      get: vi.fn(async () => ({
        activityAt: 2_499,
        threadId: null,
      })),
      set: vi.fn(async () => {}),
    }
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads,
      listExecutionEvents: vi.fn(async input => [createEvent({
        id: `event-${input?.threadId}`,
        threadId: input?.threadId ?? 'thread-target',
        createdAt: input?.threadId === 'thread-target' ? 2_500 : 2_499,
      })]),
      cursorStore,
      pageSize: 64,
    })

    await runtime.markSurfaced({
      sessionId: 'session-1',
      activityAt: 2_500,
      createdAt: 2_500,
    })

    expect(cursorStore.set).toHaveBeenCalledWith('session-1', {
      activityAt: 2_500,
      threadId: 'thread-target',
    })
    expect(listTaskThreads).toHaveBeenCalledTimes(2)
  })

  it('loads the persisted cursor before marking a surfaced callback after restart', async () => {
    const cursorStore = {
      get: vi.fn(async () => ({
        activityAt: 100,
        threadId: 'thread-a',
      })),
      set: vi.fn(async () => {}),
      compareAndSet: vi.fn(async (
        _sessionId,
        expected: AlicizationExecutionCallbackCursor,
        next: AlicizationExecutionCallbackCursor,
      ) => {
        expect(expected).toEqual({
          activityAt: 100,
          threadId: 'thread-a',
        })
        expect(next).toEqual({
          activityAt: 200,
          threadId: 'thread-b',
        })
        return true
      }),
    }
    const runtime = createAlicizationExecutionCallbackRuntime({
      listTaskThreads: vi.fn(async () => []),
      listExecutionEvents: vi.fn(async () => []),
      cursorStore,
    })

    await runtime.markSurfaced({
      sessionId: 'session-1',
      activityAt: 200,
      threadId: 'thread-b',
    })

    expect(cursorStore.get).toHaveBeenCalledWith('session-1')
    expect(cursorStore.compareAndSet).toHaveBeenCalledOnce()
  })
})
