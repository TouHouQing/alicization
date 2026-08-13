import type {
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'

import { dispatchTaskThread } from './task-thread-dispatcher'

const { executeCodexTaskThreadMock } = vi.hoisted(() => ({
  executeCodexTaskThreadMock: vi.fn(),
}))

vi.mock('./executor-adapters/codex', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./executor-adapters/codex')>()
  return {
    ...actual,
    executeCodexTaskThread: executeCodexTaskThreadMock,
  }
})

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-dispatch-1',
    decisionTraceId: 'mind:trace:dispatch-1',
    turnId: 'turn-dispatch-1',
    sessionId: 'session-dispatch-1',
    origin: 'user-turn',
    goal: 'Execute the current CLI body.',
    kind: 'run-command',
    status: 'planned',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'planned cli body',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: null,
    completedAt: null,
    ...overrides,
  }
}

function createPort(initialThread: AlicizationTaskThreadRecord) {
  let currentThread = { ...initialThread }

  const getTaskThread = vi.fn(async (id: string) => {
    if (id !== currentThread.id)
      return undefined
    return { ...currentThread }
  })
  const appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
    const latest = [...events].sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0)).at(-1)
    if (!latest)
      return

    currentThread = {
      ...currentThread,
      status: latest.threadStatus ?? currentThread.status,
      lastEventAt: latest.createdAt ?? currentThread.lastEventAt,
      updatedAt: latest.createdAt ?? currentThread.updatedAt,
      completedAt: latest.threadStatus === 'completed' || latest.threadStatus === 'failed' || latest.threadStatus === 'cancelled'
        ? (latest.createdAt ?? currentThread.completedAt ?? currentThread.updatedAt)
        : currentThread.completedAt,
    }
  })
  const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadUpsertInput) => {
    currentThread = {
      ...currentThread,
      ...input,
      id: input.id ?? currentThread.id,
    }
    return { ...currentThread }
  })
  const upsertExecutorSession = vi.fn().mockResolvedValue(undefined)
  const appendAuditLog = vi.fn().mockResolvedValue(undefined)

  return {
    getTaskThread,
    appendExecutionEvents,
    upsertTaskThread,
    upsertExecutorSession,
    appendAuditLog,
    readThread: () => ({ ...currentThread }),
  }
}

function createExecutionRuntimeContext(
  overrides: Partial<AlicizationExecutionRuntimeContext> = {},
): AlicizationExecutionRuntimeContext {
  return {
    generatedAt: 1_710_000_000_000,
    cardId: 'default',
    turnId: 'turn-dispatch-1',
    decisionTraceId: 'mind:trace:dispatch-1',
    sessionId: 'session-dispatch-1',
    sensory: {
      collectedAt: 1_710_000_000_123,
      running: true,
      stale: false,
      ageMs: 11,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'cursor',
        title: 'airi-alice',
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sourceCount: 2,
        lastUpdatedAt: 1_710_000_000_100,
        lastError: null,
        degradedReasons: [],
      },
    },
    ...overrides,
  }
}

describe('task-thread dispatcher', () => {
  it('dispatches a planned CLI thread into completed state', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("dispatcher ok")'],
        runtimeContext: createExecutionRuntimeContext(),
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.thread.status).toBe('completed')
    expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'result']))
    expect(result.summary).toContain('dispatcher ok')
    expect(port.appendExecutionEvents).toBeCalledTimes(1)
    expect(port.upsertTaskThread).toBeCalled()
    expect(port.upsertTaskThread.mock.calls.some(([input]) => input.status === 'running')).toBe(true)
  })

  it('preserves the adapter cancelled final status in the shared dispatch result', async () => {
    const port = createPort(createThread())
    const controller = new AbortController()
    const execution = dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'setTimeout(() => console.log("late output"), 3000)'],
        timeoutMs: 5_000,
        runtimeContext: createExecutionRuntimeContext(),
      },
      abortSignal: controller.signal,
      workspaceRoot: process.cwd(),
    })

    setTimeout(() => {
      controller.abort('user-cancelled')
    }, 80)

    const result = await execution

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'cancelled',
      thread: {
        status: 'cancelled',
      },
    })
  })

  it('publishes Codex semantic progress before persisting it and avoids final duplicate writes', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const order: string[] = []
    const appendExecutionEvents = port.appendExecutionEvents
    port.appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
      order.push(`persist:${String(events[0]?.payload?.codexEventType ?? events[0]?.kind ?? 'unknown')}`)
      await appendExecutionEvents(events)
    })
    const liveEvent: AlicizationExecutionEventInput = {
      id: 'codex-run-1:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.started',
        semanticProgress: true,
        summary: 'Codex command started: git status --short',
      },
      createdAt: 120,
    }
    const resultEvent: AlicizationExecutionEventInput = {
      id: 'codex-run-1:2',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'completed',
      payload: {
        adapter: 'codex',
      },
      createdAt: 130,
    }
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      await input.onExecutionEvent?.(liveEvent)
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'Codex inspection completed.',
        output: 'done',
        events: [liveEvent, resultEvent],
      }
    })
    const onExecutionEvent = vi.fn(async () => {
      order.push('publish:item.started')
    })

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(order).toEqual([
      'publish:item.started',
      'persist:item.started',
      'persist:result',
    ])
    const persistedEvents = port.appendExecutionEvents.mock.calls.flatMap(([events]) => events)
    expect(persistedEvents.filter(event => event.id === liveEvent.id)).toHaveLength(1)
    expect(persistedEvents.filter(event => event.id === resultEvent.id)).toHaveLength(1)
  })

  it('drains the realtime persistence queue until no accepted live events remain', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const firstLiveEvent: AlicizationExecutionEventInput = {
      id: 'codex-stable-drain:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.started',
      },
      createdAt: 120,
    }
    const secondLiveEvent: AlicizationExecutionEventInput = {
      ...firstLiveEvent,
      id: 'codex-stable-drain:2',
      payload: {
        codexEventType: 'item.completed',
      },
      createdAt: 121,
    }
    const resultEvent: AlicizationExecutionEventInput = {
      ...firstLiveEvent,
      id: 'codex-stable-drain:3',
      kind: 'result',
      threadStatus: 'completed',
      payload: {
        adapter: 'codex',
      },
      createdAt: 130,
    }
    let acceptedCallback:
      | ((event: AlicizationExecutionEventInput) => Promise<void> | void)
      | undefined
    let markFirstWriteStarted!: () => void
    let releaseFirstWrite!: () => void
    const firstWriteStarted = new Promise<void>((resolve) => {
      markFirstWriteStarted = resolve
    })
    const firstWriteReleased = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve
    })
    const persistedBatches: string[][] = []
    const appendExecutionEvents = port.appendExecutionEvents
    port.appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
      persistedBatches.push(events.flatMap(event => event.id ? [event.id] : []))
      if (events.some(event => event.id === firstLiveEvent.id)) {
        markFirstWriteStarted()
        await firstWriteReleased
      }
      await appendExecutionEvents(events)
    })
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      acceptedCallback = input.onExecutionEvent
      await input.onExecutionEvent?.(firstLiveEvent)
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'Codex inspection completed.',
        output: 'done',
        events: [firstLiveEvent, secondLiveEvent, resultEvent],
      }
    })

    const dispatch = dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      workspaceRoot: process.cwd(),
    })

    await firstWriteStarted
    await new Promise(resolve => setTimeout(resolve, 0))
    await acceptedCallback?.(secondLiveEvent)
    releaseFirstWrite()
    const result = await dispatch

    expect(result.ok).toBe(true)
    expect(persistedBatches).toEqual([
      [firstLiveEvent.id],
      [secondLiveEvent.id],
      [resultEvent.id],
    ])
    const persistedEvents = port.appendExecutionEvents.mock.calls.flatMap(([events]) => events)
    expect(persistedEvents.filter(event => event.id === firstLiveEvent.id)).toHaveLength(1)
    expect(persistedEvents.filter(event => event.id === secondLiveEvent.id)).toHaveLength(1)
    expect(persistedEvents.filter(event => event.id === resultEvent.id)).toHaveLength(1)
  })

  it('records and best-effort persists execution events that violate the adapter callback contract', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const resultEvent: AlicizationExecutionEventInput = {
      id: 'codex-late-event:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'completed',
      payload: {
        adapter: 'codex',
      },
      createdAt: 130,
    }
    const lateEvent: AlicizationExecutionEventInput = {
      ...resultEvent,
      id: 'codex-late-event:2',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.completed',
      },
      createdAt: 140,
    }
    let acceptedCallback:
      | ((event: AlicizationExecutionEventInput) => Promise<void> | void)
      | undefined
    let persistedLateEvent: AlicizationExecutionEventInput | undefined
    const lateAppendThreadStatuses: AlicizationTaskThreadRecord['status'][] = []
    const appendExecutionEvents = port.appendExecutionEvents
    port.appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
      const lateCopy = events.find(event => event.id === lateEvent.id)
      if (lateCopy)
        persistedLateEvent = lateCopy
      await appendExecutionEvents(events)
      if (lateCopy)
        lateAppendThreadStatuses.push(port.readThread().status)
    })
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      acceptedCallback = input.onExecutionEvent
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'Codex inspection completed.',
        output: 'done',
        events: [resultEvent],
      }
    })
    const onExecutionEvent = vi.fn()

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      onExecutionEvent,
      eventPersistenceTimeoutMs: 50,
      workspaceRoot: process.cwd(),
    })
    await acceptedCallback?.(lateEvent)

    await vi.waitFor(() => {
      const persistedEvents = port.appendExecutionEvents.mock.calls.flatMap(([events]) => events)
      expect(persistedEvents.filter(event => event.id === lateEvent.id)).toHaveLength(1)
      expect(port.readThread()).toMatchObject({
        status: 'completed',
        metadata: {
          execution: {
            persistence: {
              status: 'degraded',
              failures: expect.arrayContaining([
                expect.stringContaining('late execution event'),
              ]),
            },
          },
        },
      })
    }, {
      timeout: 250,
    })
    expect(result.thread.status).toBe('completed')
    expect(persistedLateEvent).not.toBe(lateEvent)
    expect(persistedLateEvent).toMatchObject({
      id: lateEvent.id,
      kind: lateEvent.kind,
      channel: lateEvent.channel,
      createdAt: lateEvent.createdAt,
      payload: {
        codexEventType: 'item.completed',
        lateAfterTerminal: true,
        originalThreadStatus: 'running',
      },
    })
    expect(persistedLateEvent?.threadStatus).toBeUndefined()
    expect(lateEvent).toMatchObject({
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.completed',
      },
    })
    expect(lateEvent.payload).not.toHaveProperty('lateAfterTerminal')
    expect(lateAppendThreadStatuses).toEqual(['completed'])
    expect(onExecutionEvent).not.toHaveBeenCalled()
  })

  it('establishes terminal settlement before late diagnostics can restore a running thread', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const resultEvent: AlicizationExecutionEventInput = {
      id: 'codex-terminal-race:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'completed',
      payload: {
        adapter: 'codex',
      },
      createdAt: 150,
    }
    const lateEvent: AlicizationExecutionEventInput = {
      ...resultEvent,
      id: 'codex-terminal-race:2',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.completed',
      },
      createdAt: 160,
    }
    let acceptedCallback:
      | ((event: AlicizationExecutionEventInput) => Promise<void> | void)
      | undefined
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      acceptedCallback = input.onExecutionEvent
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'Codex inspection completed.',
        output: 'done',
        events: [],
      }
    })

    let releaseTerminalWrite = () => {}
    const terminalWriteGate = new Promise<void>((resolve) => {
      releaseTerminalWrite = resolve
    })
    let signalTerminalWriteStarted = () => {}
    const terminalWriteStarted = new Promise<void>((resolve) => {
      signalTerminalWriteStarted = resolve
    })
    let releaseLateDiagnosticWrite = () => {}
    const lateDiagnosticWriteGate = new Promise<void>((resolve) => {
      releaseLateDiagnosticWrite = resolve
    })
    let signalLateDiagnosticWriteStarted = () => {}
    const lateDiagnosticWriteStarted = new Promise<void>((resolve) => {
      signalLateDiagnosticWriteStarted = resolve
    })
    const originalUpsertTaskThread = port.upsertTaskThread
    const lateDiagnosticInputs: AlicizationTaskThreadUpsertInput[] = []
    port.upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadUpsertInput) => {
      const failures = (
        input.metadata as {
          execution?: {
            persistence?: {
              failures?: unknown[]
            }
          }
        } | null | undefined
      )?.execution?.persistence?.failures
      const isLateDiagnostic = Array.isArray(failures)
        && failures.some(failure =>
          typeof failure === 'string' && failure.includes('late execution event'),
        )

      if (isLateDiagnostic) {
        lateDiagnosticInputs.push(input)
        signalLateDiagnosticWriteStarted()
        await lateDiagnosticWriteGate
      }
      else if (input.status === 'completed') {
        signalTerminalWriteStarted()
        await terminalWriteGate
      }

      return await originalUpsertTaskThread(input)
    })

    const dispatch = dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      eventPersistenceTimeoutMs: 500,
      workspaceRoot: process.cwd(),
    })

    await terminalWriteStarted
    await acceptedCallback?.(lateEvent)
    await lateDiagnosticWriteStarted
    releaseTerminalWrite()
    const result = await dispatch
    releaseLateDiagnosticWrite()

    await vi.waitFor(() => {
      expect(port.readThread().status).toBe('completed')
    })
    expect(result.thread.status).toBe('completed')
    expect(lateDiagnosticInputs).toHaveLength(1)
    expect(lateDiagnosticInputs[0]?.status).toBe('completed')
  })

  it.each(['failed', 'cancelled'] as const)(
    'preserves a newer %s terminal state when a late diagnostic follows an older completed snapshot',
    async (latestStatus) => {
      const port = createPort(createThread({
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        kind: 'codebase-investigation',
        goal: 'Inspect the repository.',
      }))
      const resultEvent: AlicizationExecutionEventInput = {
        id: `codex-late-terminal-${latestStatus}:1`,
        threadId: 'thread-dispatch-1',
        decisionTraceId: 'mind:trace:dispatch-1',
        turnId: 'turn-dispatch-1',
        sessionId: 'session-dispatch-1',
        origin: 'user-turn',
        channel: 'codex',
        kind: 'result',
        threadStatus: 'completed',
        payload: {
          adapter: 'codex',
        },
        createdAt: 150,
      }
      const lateEvent: AlicizationExecutionEventInput = {
        ...resultEvent,
        id: `codex-late-terminal-${latestStatus}:2`,
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'item.completed',
        },
        createdAt: 160,
      }
      let acceptedCallback:
        | ((event: AlicizationExecutionEventInput) => Promise<void> | void)
        | undefined
      executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
        acceptedCallback = input.onExecutionEvent
        return {
          ok: true,
          finalStatus: 'completed',
          summary: 'Older completed snapshot.',
          output: 'done',
          events: [resultEvent],
        }
      })

      const originalAppendExecutionEvents = port.appendExecutionEvents
      const originalUpsertTaskThread = port.upsertTaskThread
      const lateDiagnosticInputs: AlicizationTaskThreadUpsertInput[] = []
      let latestTerminalThread: AlicizationTaskThreadRecord | null = null
      port.appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
        await originalAppendExecutionEvents(events)
        if (
          latestTerminalThread
          && events.some(event => event.id === lateEvent.id)
        ) {
          await originalUpsertTaskThread(latestTerminalThread)
        }
      })
      port.upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadUpsertInput) => {
        const failures = (
          input.metadata as {
            execution?: {
              persistence?: {
                failures?: unknown[]
              }
            }
          } | null | undefined
        )?.execution?.persistence?.failures
        if (
          Array.isArray(failures)
          && failures.some(failure =>
            typeof failure === 'string' && failure.includes('late execution event'),
          )
        ) {
          lateDiagnosticInputs.push(input)
        }
        return await originalUpsertTaskThread(input)
      })

      const result = await dispatchTaskThread(port, {
        threadId: 'thread-dispatch-1',
        codex: {
          prompt: 'Inspect the repository.',
          sandbox: 'read-only',
          runtimeContext: createExecutionRuntimeContext(),
        },
        eventPersistenceTimeoutMs: 500,
        workspaceRoot: process.cwd(),
      })
      const transitionedAt = result.thread.updatedAt + 100
      latestTerminalThread = {
        ...port.readThread(),
        status: latestStatus,
        summary: `Latest ${latestStatus} summary.`,
        updatedAt: transitionedAt,
        lastEventAt: transitionedAt,
        completedAt: transitionedAt,
      }
      await port.upsertTaskThread(latestTerminalThread)

      await acceptedCallback?.(lateEvent)

      await vi.waitFor(() => {
        expect(lateDiagnosticInputs).toHaveLength(1)
      })
      expect(lateDiagnosticInputs[0]).toMatchObject({
        status: latestStatus,
        summary: `Latest ${latestStatus} summary.`,
        lastEventAt: transitionedAt,
        completedAt: transitionedAt,
      })
      expect(port.readThread()).toMatchObject({
        status: latestStatus,
        summary: `Latest ${latestStatus} summary.`,
        lastEventAt: transitionedAt,
        completedAt: transitionedAt,
        metadata: {
          execution: {
            persistence: {
              failures: expect.arrayContaining([
                expect.stringContaining('late execution event'),
              ]),
            },
          },
        },
      })
    },
  )

  it('persists a failed terminal thread when the Codex adapter rejects', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    executeCodexTaskThreadMock.mockRejectedValueOnce(Object.assign(
      new Error('Codex produced no semantic progress for 180000ms.'),
      {
        code: 'CODEX_TIMEOUT',
      },
    ))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_TIMEOUT',
      errorMessage: 'Codex produced no semantic progress for 180000ms.',
      thread: {
        status: 'failed',
      },
    })
    expect(port.readThread()).toMatchObject({
      status: 'failed',
      completedAt: expect.any(Number),
    })
    expect(port.appendExecutionEvents.mock.calls.flatMap(([events]) => events)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'result',
          threadStatus: 'failed',
          payload: expect.objectContaining({
            failureKind: 'tool-execution',
            errorCode: 'CODEX_TIMEOUT',
            errorMessage: 'Codex produced no semantic progress for 180000ms.',
          }),
        }),
      ]),
    )
  })

  it('publishes live executor progress before a slow database write resolves', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const order: string[] = []
    let releasePersist!: () => void
    const persistenceReleased = new Promise<void>((resolve) => {
      releasePersist = resolve
    })
    const appendExecutionEvents = port.appendExecutionEvents
    port.appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
      order.push(`persist-start:${String(events[0]?.payload?.codexEventType ?? events[0]?.kind ?? 'unknown')}`)
      await persistenceReleased
      await appendExecutionEvents(events)
      order.push(`persist-end:${String(events[0]?.payload?.codexEventType ?? events[0]?.kind ?? 'unknown')}`)
    })
    const liveEvent: AlicizationExecutionEventInput = {
      id: 'codex-run-slow-db:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.started',
        semanticProgress: true,
        summary: 'Codex command started: git status --short',
      },
      createdAt: 120,
    }
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      await input.onExecutionEvent?.(liveEvent)
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'Codex inspection completed.',
        output: 'done',
        events: [liveEvent],
      }
    })
    const onExecutionEvent = vi.fn(() => {
      order.push('publish:item.started')
    })

    const execution = dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(order).toContain('publish:item.started')
    expect(order.indexOf('publish:item.started')).toBeLessThan(order.indexOf('persist-start:item.started'))

    releasePersist()
    await execution
  })

  it('retries a live event in the final result batch after both realtime writes fail', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const liveEvent: AlicizationExecutionEventInput = {
      id: 'codex-run-retry:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.started',
        semanticProgress: true,
      },
      createdAt: 120,
    }
    const resultEvent: AlicizationExecutionEventInput = {
      id: 'codex-run-retry:2',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'completed',
      payload: {
        adapter: 'codex',
      },
      createdAt: 130,
    }
    const persistedEventIds: string[] = []
    let liveWriteAttempts = 0
    port.appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
      if (events.some(event => event.id === liveEvent.id)) {
        liveWriteAttempts += 1
        if (liveWriteAttempts <= 2)
          throw new Error(`realtime-write-${liveWriteAttempts}-failed`)
      }
      persistedEventIds.push(...events.flatMap(event => event.id ? [event.id] : []))
    })
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      await input.onExecutionEvent?.(liveEvent)
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'Codex inspection completed.',
        output: 'done',
        events: [liveEvent, resultEvent],
      }
    })

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(liveWriteAttempts).toBe(3)
    expect(persistedEventIds).toEqual(expect.arrayContaining([
      liveEvent.id,
      resultEvent.id,
    ]))
  })

  it('isolates synchronous and asynchronous execution observers from the executor lifecycle', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const syncEvent: AlicizationExecutionEventInput = {
      id: 'codex-observer:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.started',
      },
      createdAt: 120,
    }
    const asyncEvent: AlicizationExecutionEventInput = {
      ...syncEvent,
      id: 'codex-observer:2',
      createdAt: 121,
    }
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      await input.onExecutionEvent?.(syncEvent)
      await input.onExecutionEvent?.(asyncEvent)
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'Codex inspection completed.',
        output: 'done',
        events: [syncEvent, asyncEvent],
      }
    })
    const onExecutionEvent = vi.fn((event: AlicizationExecutionEventInput) => {
      if (event.id === syncEvent.id)
        throw new Error('observer-sync-failed')
      return Promise.reject(new Error('observer-async-failed'))
    })

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(onExecutionEvent).toHaveBeenCalledTimes(2)
  })

  it('does not let a never-settling realtime event write own the dispatch lifecycle', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const liveEvent: AlicizationExecutionEventInput = {
      id: 'codex-never-settles:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        codexEventType: 'item.started',
      },
      createdAt: 120,
    }
    const resultEvent: AlicizationExecutionEventInput = {
      ...liveEvent,
      id: 'codex-never-settles:2',
      kind: 'result',
      threadStatus: 'completed',
      createdAt: 130,
    }
    port.appendExecutionEvents = vi.fn(() => new Promise<void>(() => {}))
    executeCodexTaskThreadMock.mockImplementationOnce(async (input) => {
      await input.onExecutionEvent?.(liveEvent)
      return {
        ok: true,
        finalStatus: 'completed',
        summary: 'Codex inspection completed.',
        output: 'done',
        events: [liveEvent, resultEvent],
      }
    })

    const dispatch = dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      eventPersistenceTimeoutMs: 10,
      workspaceRoot: process.cwd(),
    })
    const outcome = await Promise.race([
      dispatch.then(result => ({ kind: 'result' as const, result })),
      new Promise<{ kind: 'timeout' }>(resolve => setTimeout(() => resolve({ kind: 'timeout' }), 150)),
    ])

    expect(outcome.kind).toBe('result')
    if (outcome.kind === 'result') {
      expect(outcome.result.ok).toBe(true)
      expect(outcome.result.thread.status).toBe('completed')
      expect(outcome.result.createdEventKinds).toEqual([])
    }
    expect(port.upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
    }))
  })

  it('still persists the terminal thread when every final event write fails', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the repository.',
    }))
    const resultEvent: AlicizationExecutionEventInput = {
      id: 'codex-final-write-fails:1',
      threadId: 'thread-dispatch-1',
      decisionTraceId: 'mind:trace:dispatch-1',
      turnId: 'turn-dispatch-1',
      sessionId: 'session-dispatch-1',
      origin: 'user-turn',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'completed',
      payload: {
        adapter: 'codex',
      },
      createdAt: 130,
    }
    port.appendExecutionEvents = vi.fn(async () => {
      throw new Error('sqlite-event-write-failed')
    })
    executeCodexTaskThreadMock.mockResolvedValueOnce({
      ok: true,
      finalStatus: 'completed',
      summary: 'Codex inspection completed.',
      output: 'done',
      events: [resultEvent],
    })

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      codex: {
        prompt: 'Inspect the repository.',
        sandbox: 'read-only',
        runtimeContext: createExecutionRuntimeContext(),
      },
      eventPersistenceTimeoutMs: 10,
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.thread.status).toBe('completed')
    expect(result.createdEventKinds).toEqual([])
    expect(result.thread.metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        persistence: expect.objectContaining({
          status: 'degraded',
        }),
      }),
    }))
    expect(port.upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
    }))
  })

  it('requires execution runtime context before dispatch begins when neither payload nor stored thread metadata carries one', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("should not run without runtime context")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_RUNTIME_CONTEXT_REQUIRED')
    expect(result.createdEventKinds).toEqual([])
    expect(result.summary).toContain('runtime context')
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('keeps non-planned threads from dispatching', async () => {
    const port = createPort(createThread({
      status: 'needs-affirmation',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("no run")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_NOT_DISPATCHABLE')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('marks threads blocked when dispatch is attempted under kill-switch suspension', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("blocked")'],
      },
      killSwitchSuspended: true,
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.thread.status).toBe('blocked')
    expect(result.createdEventKinds).toEqual(['cancel'])
    expect(port.appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        kind: 'cancel',
        threadStatus: 'blocked',
      }),
    ])
  })

  it('does not let kill-switch event persistence block the dispatch lifecycle', async () => {
    const port = createPort(createThread())
    port.appendExecutionEvents = vi.fn(() => new Promise<void>(() => {}))

    const dispatch = dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("blocked")'],
      },
      eventPersistenceTimeoutMs: 10,
      killSwitchSuspended: true,
      workspaceRoot: process.cwd(),
    })
    const outcome = await Promise.race([
      dispatch.then(result => ({ kind: 'result' as const, result })),
      new Promise<{ kind: 'timeout' }>(resolve => setTimeout(() => resolve({ kind: 'timeout' }), 150)),
    ])

    expect(outcome.kind).toBe('result')
    if (outcome.kind === 'result') {
      expect(outcome.result.ok).toBe(false)
      expect(outcome.result.thread.status).toBe('blocked')
      expect(outcome.result.createdEventKinds).toEqual([])
      expect(outcome.result.thread.metadata).toEqual(expect.objectContaining({
        execution: expect.objectContaining({
          persistence: expect.objectContaining({
            status: 'degraded',
          }),
        }),
      }))
    }
  })

  it('requires codex payload when the planned thread selects codex', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the current codebase task.',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_CODEX_INPUT_REQUIRED')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('requires claude-code payload when the planned thread selects claude-code', async () => {
    const port = createPort(createThread({
      selectedChannel: 'claude-code',
      proposedChannel: 'claude-code',
      kind: 'agent-delegation',
      goal: 'Delegate the current coding task.',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_CLAUDE_CODE_INPUT_REQUIRED')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('dispatches openclaw payloads through the embodied executor channel', async () => {
    const port = createPort(createThread({
      selectedChannel: 'openclaw',
      proposedChannel: 'openclaw',
      kind: 'desktop-automation',
      goal: 'Close the foreground popup.',
    }))
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        reply: 'popup closed',
        session_id: 'openclaw-dispatch-session',
      }),
    }))
    const previousUrl = process.env.ALICIZATION_OPENCLAW_URL
    const previousToken = process.env.ALICIZATION_OPENCLAW_TOKEN
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:9311'
    process.env.ALICIZATION_OPENCLAW_TOKEN = 'test-token'
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread(port, {
        threadId: 'thread-dispatch-1',
        openclaw: {
          instruction: 'Close the popup that is blocking the current screen.',
          runtimeContext: {
            generatedAt: 1_710_000_000_000,
            cardId: 'default',
            turnId: 'turn-dispatch-1',
            decisionTraceId: 'mind:trace:dispatch-1',
            sensory: {
              collectedAt: 1_710_000_000_123,
              running: true,
              stale: false,
              ageMs: 11,
              foregroundWindow: {
                appName: 'Cursor',
                processName: 'cursor',
                title: 'airi-alice',
              },
              capture: {
                health: 'healthy',
                permission: 'granted',
                sourceCount: 2,
                lastUpdatedAt: 1_710_000_000_100,
                lastError: null,
                degradedReasons: [],
              },
            },
          },
        },
      })

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
      expect(result.summary).toContain('popup closed')
      expect(port.upsertExecutorSession).toBeCalledWith(expect.objectContaining({
        channel: 'openclaw',
        metadata: expect.objectContaining({
          selectedChannel: 'openclaw',
          transportChannel: 'openclaw',
          execution: expect.objectContaining({
            runtimeContext: expect.objectContaining({
              cardId: 'default',
              turnId: 'turn-dispatch-1',
              sensory: expect.objectContaining({
                foregroundWindow: expect.objectContaining({
                  appName: 'Cursor',
                }),
              }),
            }),
          }),
        }),
      }))
      expect(fetchMock).toBeCalledTimes(1)
    }
    finally {
      vi.unstubAllGlobals()
      if (typeof previousUrl === 'string')
        process.env.ALICIZATION_OPENCLAW_URL = previousUrl
      else
        delete process.env.ALICIZATION_OPENCLAW_URL
      if (typeof previousToken === 'string')
        process.env.ALICIZATION_OPENCLAW_TOKEN = previousToken
      else
        delete process.env.ALICIZATION_OPENCLAW_TOKEN
    }
  })

  it('dispatches browser facade threads through openclaw while keeping browser execution events', async () => {
    const port = createPort(createThread({
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      kind: 'browser-automation',
      goal: 'Submit the visible browser form.',
    }))
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        reply: 'browser form submitted',
        session_id: 'openclaw-browser-session',
      }),
    }))
    const previousUrl = process.env.ALICIZATION_OPENCLAW_URL
    const previousToken = process.env.ALICIZATION_OPENCLAW_TOKEN
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:9311'
    process.env.ALICIZATION_OPENCLAW_TOKEN = 'test-token'
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread(port, {
        threadId: 'thread-dispatch-1',
        openclaw: {
          instruction: 'Submit the visible browser form in the focused tab.',
          runtimeContext: createExecutionRuntimeContext(),
        },
      })

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
      expect(result.summary).toContain('browser form submitted')
      expect(port.appendExecutionEvents).toBeCalledWith(expect.arrayContaining([
        expect.objectContaining({
          channel: 'browser',
          kind: 'dispatch',
        }),
        expect.objectContaining({
          channel: 'browser',
          kind: 'result',
        }),
      ]))
      expect(port.upsertExecutorSession).toBeCalledWith(expect.objectContaining({
        channel: 'openclaw',
        metadata: expect.objectContaining({
          selectedChannel: 'browser',
          transportChannel: 'openclaw',
        }),
      }))
      expect(fetchMock).toBeCalledTimes(1)
    }
    finally {
      vi.unstubAllGlobals()
      if (typeof previousUrl === 'string')
        process.env.ALICIZATION_OPENCLAW_URL = previousUrl
      else
        delete process.env.ALICIZATION_OPENCLAW_URL
      if (typeof previousToken === 'string')
        process.env.ALICIZATION_OPENCLAW_TOKEN = previousToken
      else
        delete process.env.ALICIZATION_OPENCLAW_TOKEN
    }
  })

  it('prefers local visual dispatch for browser threads when the runtime exposes local GUI handlers', async () => {
    const port = createPort(createThread({
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      kind: 'browser-automation',
      goal: 'Submit the visible browser form.',
    }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread({
        ...port,
        localVisualSurface: {
          desktopInspectScene: vi.fn(async () => ({
            channel: 'desktop',
            status: 'completed',
            operation: 'desktop_inspect_scene',
            summary: 'Local browser workflow inspection completed.',
            output: 'local browser workflow inspection completed',
            pagePhase: 'form-entry',
            workflowPlan: {
              continuationMode: 'ready-to-act',
            },
            suggestedActions: [],
            blockingSignals: [],
          })),
        },
      }, {
        threadId: 'thread-dispatch-1',
        openclaw: {
          instruction: 'Submit the visible browser form in the focused tab.',
          runtimeContext: createExecutionRuntimeContext(),
        },
      })

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'result']))
      expect(result.summary).toContain('local browser workflow inspection completed')
      expect(port.appendExecutionEvents).toBeCalledWith(expect.arrayContaining([
        expect.objectContaining({
          channel: 'browser',
          kind: 'dispatch',
        }),
        expect.objectContaining({
          channel: 'browser',
          kind: 'result',
        }),
      ]))
      expect(port.upsertExecutorSession).not.toBeCalled()
      expect(fetchMock).not.toBeCalled()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('dispatches browser local visual payloads through the local GUI handler without requiring openclaw input', async () => {
    const port = createPort(createThread({
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      kind: 'browser-automation',
      goal: 'Submit the visible browser form.',
    }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread({
        ...port,
        localVisualSurface: {
          desktopInspectScene: vi.fn(async () => ({
            channel: 'desktop',
            status: 'completed',
            operation: 'desktop_inspect_scene',
            summary: 'Dedicated local visual payload dispatched through the runtime local GUI bridge.',
            output: 'local visual payload dispatcher ok',
            pagePhase: 'form-entry',
            workflowPlan: {
              continuationMode: 'ready-to-act',
            },
            suggestedActions: [],
            blockingSignals: [],
          })),
        },
      }, {
        threadId: 'thread-dispatch-1',
        localVisual: {
          instruction: 'Submit the visible browser form in the focused tab.',
          runtimeContext: createExecutionRuntimeContext(),
        },
      } as any)

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'result']))
      expect(result.summary).toContain('Dedicated local visual payload')
      expect(port.appendExecutionEvents).toBeCalledWith(expect.arrayContaining([
        expect.objectContaining({
          channel: 'browser',
          kind: 'dispatch',
        }),
        expect.objectContaining({
          channel: 'browser',
          kind: 'result',
        }),
      ]))
      expect(port.upsertExecutorSession).not.toBeCalled()
      expect(fetchMock).not.toBeCalled()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('persists execution runtime context onto the task thread metadata before dispatch', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("dispatcher context ok")'],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-dispatch-1',
          decisionTraceId: 'mind:trace:dispatch-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 11,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 2,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('dispatcher context ok')
    expect(result.summary).not.toContain('project_continuity=')
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          cardId: 'default',
          turnId: 'turn-dispatch-1',
          sensory: expect.objectContaining({
            foregroundWindow: expect.objectContaining({
              appName: 'Cursor',
            }),
          }),
        }),
      }),
    }))
  })

  it('reuses stored execution runtime context when dispatch payload omits it', async () => {
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: createExecutionRuntimeContext(),
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON ? "stored runtime context reused" : "missing runtime context")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.thread.status).toBe('completed')
    expect(result.summary).toContain('stored runtime context reused')
    expect(result.summary).not.toContain('project_continuity=')
  })

  it('uses refreshed sensory context without adding retired governance fields', async () => {
    const storedRuntimeContext = createExecutionRuntimeContext()
    const payloadRuntimeContext = createExecutionRuntimeContext({
      generatedAt: 1_710_000_000_500,
      sensory: {
        collectedAt: 1_710_000_000_555,
        running: true,
        stale: false,
        ageMs: 3,
        foregroundWindow: {
          appName: 'Terminal',
          processName: 'zsh',
          title: 'dispatch refreshed sensory',
        },
        capture: null,
      },
    })
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: storedRuntimeContext,
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'const ctx = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON || "{}"); console.log(ctx.sensory?.foregroundWindow?.appName || "missing-sensory")'],
        runtimeContext: payloadRuntimeContext,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('Terminal')
    expect(result.summary).not.toContain('project_continuity=')
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          generatedAt: 1_710_000_000_500,
          sensory: expect.objectContaining({
            foregroundWindow: expect.objectContaining({
              appName: 'Terminal',
            }),
          }),
        }),
      }),
    }))
  })

  it('keeps stored affective residue when dispatch payload refreshes sensory context without structured execution emotion carry', async () => {
    const storedRuntimeContext = createExecutionRuntimeContext() as AlicizationExecutionRuntimeContext & {
      affectiveResidue?: Record<string, unknown>
    }
    storedRuntimeContext.affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 1_710_000_000_490,
      residues: [{
        kind: 'afterglow',
        intensity: 0.72,
        persistence: 0.67,
        confidence: 0.85,
        polarity: 'warm',
        releaseMode: 'delay-until-open-window',
        summary: 'Dispatch should reopen on the continuity state.',
        sourceSignals: ['dispatch-same-line'],
        lastUpdatedAt: 1_710_000_000_490,
      }],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.71,
      repairPressure: 0.18,
      burdenPressure: 0.06,
      trustPressure: 0.45,
      restProtectivePressure: 0.12,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'measured-room',
        companionshipDensity: 0.49,
        repairRecovery: 0.26,
        overreachRisk: 0.33,
        fatigueGuard: 0.17,
        afterglowCarry: 0.65,
        shouldDelayWarmth: true,
        shouldProtectRest: false,
        reasonTags: ['dispatch-same-line'],
        summary: 'Leave measured room before reopening execution.',
      },
      sourceSignals: ['dispatch-same-line'],
      summary: 'Dispatch still carries afterglow.',
    }

    const payloadRuntimeContext = createExecutionRuntimeContext({
      generatedAt: 1_710_000_000_510,
      sensory: {
        collectedAt: 1_710_000_000_566,
        running: true,
        stale: false,
        ageMs: 4,
        foregroundWindow: {
          appName: 'Terminal',
          processName: 'zsh',
          title: 'dispatch refreshed sensory without residue',
        },
        capture: null,
      },
    })
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: storedRuntimeContext,
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'const ctx = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON || "{}"); console.log(`${ctx.affectiveResidue?.dominantResidueKind || "missing-residue"}:${ctx.affectiveResidue?.relationshipCadence?.cadenceMode || "missing-cadence"}`)'],
        runtimeContext: payloadRuntimeContext,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('afterglow:measured-return')
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          affectiveResidue: expect.objectContaining({
            dominantResidueKind: 'afterglow',
            relationshipCadence: expect.objectContaining({
              cadenceMode: 'measured-return',
            }),
          }),
          sensory: expect.objectContaining({
            foregroundWindow: expect.objectContaining({
              appName: 'Terminal',
            }),
          }),
        }),
      }),
    }))
  })
})
