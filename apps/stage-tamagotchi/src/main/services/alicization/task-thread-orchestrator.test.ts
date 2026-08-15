import type {
  AlicizationDispatchTaskThreadInput,
  AlicizationDispatchTaskThreadResult,
  AlicizationExecutionEventInput,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import type { AlicizationTaskThreadDispatchPort } from './task-thread-dispatcher'

import { describe, expect, it, vi } from 'vitest'

import { createTaskThreadOrchestrator } from './task-thread-orchestrator'

function createThread(
  id: string,
  selectedChannel: AlicizationTaskThreadRecord['selectedChannel'],
): AlicizationTaskThreadRecord {
  return {
    id,
    decisionTraceId: `mind:trace:${id}`,
    turnId: `turn:${id}`,
    sessionId: `session:${id}`,
    origin: 'user-turn',
    goal: `Goal for ${id}`,
    kind: selectedChannel === 'cli' ? 'run-command' : 'codebase-edit',
    status: 'planned',
    selectedChannel,
    proposedChannel: selectedChannel,
    summary: null,
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
  }
}

function createValidDispatchInput(
  thread: AlicizationTaskThreadRecord,
): AlicizationDispatchTaskThreadInput {
  if (thread.selectedChannel === 'cli') {
    return {
      threadId: thread.id,
      cli: {
        command: 'node',
        args: ['-e', 'process.exit(0)'],
      },
    }
  }
  if (thread.selectedChannel === 'codex') {
    return {
      threadId: thread.id,
      codex: {
        prompt: `Execute ${thread.goal}`,
      },
    }
  }
  if (thread.selectedChannel === 'claude-code') {
    return {
      threadId: thread.id,
      claudeCode: {
        prompt: `Execute ${thread.goal}`,
      },
    }
  }

  return {
    threadId: thread.id,
    openclaw: {
      instruction: `Execute ${thread.goal}`,
    },
  }
}

function createPort(threads: AlicizationTaskThreadRecord[]): AlicizationTaskThreadDispatchPort {
  const threadById = new Map(threads.map(thread => [thread.id, thread]))
  return {
    getTaskThread: vi.fn(async (id: string) => threadById.get(id)),
    upsertTaskThread: vi.fn(async input => input as AlicizationTaskThreadRecord),
    appendExecutionEvents: vi.fn(async () => {}),
    upsertExecutorSession: vi.fn(async () => {}),
    appendAuditLog: vi.fn(async () => {}),
  }
}

function createDeferredGate() {
  let resolveGate: () => void = () => {}
  const promise = new Promise<void>((resolve) => {
    resolveGate = resolve
  })
  return {
    wait: promise,
    release: resolveGate,
  }
}

function buildDispatchResult(thread: AlicizationTaskThreadRecord): AlicizationDispatchTaskThreadResult {
  return {
    thread: {
      ...thread,
      status: 'completed',
      summary: `completed:${thread.id}`,
      updatedAt: 200,
      completedAt: 200,
      lastEventAt: 200,
    },
    createdEventKinds: ['dispatch', 'result'],
    ok: true,
    summary: `completed:${thread.id}`,
    output: null,
  }
}

function waitForAbort(signal: AbortSignal | undefined) {
  return new Promise<void>((resolve) => {
    if (!signal)
      return
    if (signal.aborted) {
      resolve()
      return
    }
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}

describe('task-thread orchestrator', () => {
  it.each([
    {
      channel: 'cli' as const,
      dispatch: { cli: { command: '' } },
      errorCode: 'TASK_THREAD_CLI_INPUT_REQUIRED',
    },
    {
      channel: 'codex' as const,
      dispatch: { codex: { prompt: '   ' } },
      errorCode: 'TASK_THREAD_CODEX_INPUT_REQUIRED',
    },
    {
      channel: 'claude-code' as const,
      dispatch: { claudeCode: { prompt: '\n\t' } },
      errorCode: 'TASK_THREAD_CLAUDE_CODE_INPUT_REQUIRED',
    },
  ])('rejects blank $channel payloads before claiming dispatch ownership', async ({
    channel,
    dispatch,
    errorCode,
  }) => {
    const thread = createThread(`thread-${channel}-blank-payload`, channel)
    const port = createPort([thread])
    const runDispatch = vi.fn(async () => buildDispatchResult(thread))
    const orchestrator = createTaskThreadOrchestrator({ runDispatch })

    const result = await orchestrator.dispatch({
      port,
      input: {
        threadId: thread.id,
        ...dispatch,
      },
    })

    expect(result).toMatchObject({
      ok: false,
      errorCode,
      createdEventKinds: [],
      thread: {
        id: thread.id,
        status: 'planned',
      },
    })
    expect(runDispatch).not.toBeCalled()
    expect(port.upsertTaskThread).not.toBeCalled()
    expect(port.appendExecutionEvents).not.toBeCalled()
    expect(orchestrator.snapshot()).toEqual({
      disposed: false,
      queued: {
        'codex': [],
        'claude-code': [],
      },
      running: {},
      inFlightThreadIds: [],
    })
  })

  it('allows a valid dispatch after an invalid request for the same thread', async () => {
    const thread = createThread('thread-codex-invalid-then-valid', 'codex')
    const port = createPort([thread])
    const runDispatch = vi.fn(async () => buildDispatchResult(thread))
    const orchestrator = createTaskThreadOrchestrator({ runDispatch })

    const invalidResult = await orchestrator.dispatch({
      port,
      input: {
        threadId: thread.id,
        codex: {
          prompt: '   ',
        },
      },
    })
    const validResult = await orchestrator.dispatch({
      port,
      input: createValidDispatchInput(thread),
    })

    expect(invalidResult).toMatchObject({
      ok: false,
      errorCode: 'TASK_THREAD_CODEX_INPUT_REQUIRED',
      thread: {
        id: thread.id,
        status: 'planned',
      },
    })
    expect(validResult).toMatchObject({
      ok: true,
      thread: {
        id: thread.id,
        status: 'completed',
      },
    })
    expect(runDispatch).toHaveBeenCalledTimes(1)
    expect(orchestrator.snapshot().inFlightThreadIds).toEqual([])
  })

  it('serializes codex and claude-code dispatches by channel', async () => {
    const threadA = createThread('thread-codex-1', 'codex')
    const threadB = createThread('thread-codex-2', 'codex')
    const port = createPort([threadA, threadB])
    const gateA = createDeferredGate()
    const gateB = createDeferredGate()
    const started: string[] = []
    let active = 0
    let maxActive = 0

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        started.push(thread.id)
        active += 1
        maxActive = Math.max(maxActive, active)
        if (thread.id === threadA.id)
          await gateA.wait
        else
          await gateB.wait
        active -= 1
        return buildDispatchResult(thread)
      },
    })

    const promiseA = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(threadA),
    })
    const promiseB = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(threadB),
    })

    await vi.waitFor(() => {
      expect(started).toEqual([threadA.id])
      expect(maxActive).toBe(1)
    })

    gateA.release()
    await vi.waitFor(() => {
      expect(started).toEqual([threadA.id, threadB.id])
      expect(maxActive).toBe(1)
    })

    gateB.release()
    const [resultA, resultB] = await Promise.all([promiseA, promiseB])
    expect(resultA.ok).toBe(true)
    expect(resultB.ok).toBe(true)
  })

  it('deduplicates in-flight dispatches for the same thread', async () => {
    const thread = createThread('thread-codex-dedupe', 'codex')
    const port = createPort([thread])
    const gate = createDeferredGate()
    let runCount = 0
    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async () => {
        runCount += 1
        await gate.wait
        return buildDispatchResult(thread)
      },
    })

    const dispatchA = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(thread),
    })
    const dispatchB = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(thread),
    })

    await vi.waitFor(() => {
      expect(runCount).toBe(1)
    })
    gate.release()
    const [resultA, resultB] = await Promise.all([dispatchA, dispatchB])
    expect(runCount).toBe(1)
    expect(resultA.summary).toBe(resultB.summary)
  })

  it('lets a duplicate caller abort only its own wait without cancelling the shared dispatch', async () => {
    const thread = createThread('thread-codex-dedupe-wait-abort', 'codex')
    const port = createPort([thread])
    const gate = createDeferredGate()
    const duplicateAbortController = new AbortController()
    let sharedSignal: AbortSignal | undefined
    let runCount = 0
    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        runCount += 1
        sharedSignal = input.abortSignal
        await gate.wait
        return buildDispatchResult(thread)
      },
    })

    const sharedDispatch = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(thread),
    })
    await vi.waitFor(() => {
      expect(runCount).toBe(1)
    })

    const duplicateWait = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(thread),
        abortSignal: duplicateAbortController.signal,
      },
    })
    duplicateAbortController.abort('duplicate-caller-stopped-waiting')

    await expect(Promise.race([
      duplicateWait,
      new Promise((_, reject) => setTimeout(() => reject(new Error('duplicate wait did not abort')), 150)),
    ])).rejects.toMatchObject({
      name: 'AbortError',
      code: 'TASK_THREAD_WAIT_ABORTED',
      message: 'duplicate-caller-stopped-waiting',
    })
    expect(sharedSignal?.aborted).toBe(false)
    expect(runCount).toBe(1)

    gate.release()
    await expect(sharedDispatch).resolves.toMatchObject({
      ok: true,
      thread: {
        status: 'completed',
      },
    })
  })

  it('allows parallel dispatch for non-serialized channels', async () => {
    const threadA = createThread('thread-cli-1', 'cli')
    const threadB = createThread('thread-cli-2', 'cli')
    const port = createPort([threadA, threadB])
    const gateA = createDeferredGate()
    const gateB = createDeferredGate()
    let active = 0
    let maxActive = 0

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        active += 1
        maxActive = Math.max(maxActive, active)
        if (thread.id === threadA.id)
          await gateA.wait
        else
          await gateB.wait
        active -= 1
        return buildDispatchResult(thread)
      },
    })

    const promiseA = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(threadA),
    })
    const promiseB = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(threadB),
    })

    await vi.waitFor(() => {
      expect(maxActive).toBe(2)
    })

    gateA.release()
    gateB.release()
    await Promise.all([promiseA, promiseB])
  })

  it('runs direct dispatch with an orchestrator-owned signal that follows external aborts', async () => {
    const thread = createThread('thread-cli-owned-signal', 'cli')
    const port = createPort([thread])
    const externalAbortController = new AbortController()
    const cleanupGate = createDeferredGate()
    let runningSignal: AbortSignal | undefined

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        runningSignal = input.abortSignal
        await Promise.race([
          waitForAbort(input.abortSignal),
          cleanupGate.wait,
        ])
        return buildDispatchResult(thread)
      },
    })

    const dispatchPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(thread),
        abortSignal: externalAbortController.signal,
      },
    })

    await vi.waitFor(() => {
      expect(runningSignal).toBeDefined()
    })

    try {
      expect(runningSignal).not.toBe(externalAbortController.signal)
      expect(runningSignal?.aborted).toBe(false)

      externalAbortController.abort('user-cancelled-direct-dispatch')

      await vi.waitFor(() => {
        expect(runningSignal?.aborted).toBe(true)
        expect(runningSignal?.reason).toBe('user-cancelled-direct-dispatch')
      })
    }
    finally {
      cleanupGate.release()
      await dispatchPromise
    }
  })

  it('dispose aborts every running direct dispatch channel without serializing them', async () => {
    const threads = [
      createThread('thread-cli-dispose-running', 'cli'),
      createThread('thread-openclaw-dispose-running', 'openclaw'),
      createThread('thread-local-visual-dispose-running', 'desktop'),
    ]
    const port = createPort(threads)
    const cleanupGate = createDeferredGate()
    const runningSignals = new Map<string, AbortSignal | undefined>()
    let active = 0
    let maxActive = 0

    const orchestrator = createTaskThreadOrchestrator({
      shutdownDrainTimeoutMs: 20,
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        runningSignals.set(thread.id, input.abortSignal)
        active += 1
        maxActive = Math.max(maxActive, active)
        await Promise.race([
          waitForAbort(input.abortSignal),
          cleanupGate.wait,
        ])
        active -= 1
        return buildDispatchResult(thread)
      },
    })

    const dispatches = threads.map(thread => orchestrator.dispatch({
      port,
      input: createValidDispatchInput(thread),
    }))

    await vi.waitFor(() => {
      expect(runningSignals.size).toBe(threads.length)
      expect(maxActive).toBe(threads.length)
    })

    const disposal = orchestrator.dispose()

    try {
      await vi.waitFor(() => {
        for (const thread of threads) {
          const signal = runningSignals.get(thread.id)
          expect(signal?.aborted).toBe(true)
          expect(signal?.reason).toBe('orchestrator-disposed')
        }
      }, { timeout: 200 })
    }
    finally {
      cleanupGate.release()
      await Promise.allSettled([
        ...dispatches,
        disposal,
      ])
    }
  })

  it('removes and resolves an aborted queued job without waiting for the running job', async () => {
    const threadA = createThread('thread-codex-running', 'codex')
    const threadB = createThread('thread-codex-queued-cancelled', 'codex')
    const basePort = createPort([threadA, threadB])
    const settlementOrder: string[] = []
    const port: AlicizationTaskThreadDispatchPort = {
      ...basePort,
      upsertTaskThread: vi.fn(async (input: AlicizationTaskThreadUpsertInput) => {
        if (input.id === threadB.id && input.status === 'cancelled')
          settlementOrder.push('thread')
        return input as AlicizationTaskThreadRecord
      }),
      appendExecutionEvents: vi.fn(async (events: AlicizationExecutionEventInput[]) => {
        if (events.some(event => event.threadId === threadB.id && event.kind === 'cancel'))
          settlementOrder.push('event')
      }),
    }
    const runningGate = createDeferredGate()
    const queuedAbortController = new AbortController()
    const started: string[] = []

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        started.push(thread.id)
        if (thread.id === threadA.id)
          await runningGate.wait
        return buildDispatchResult(thread)
      },
    })

    const runningPromise = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(threadA),
    })
    await vi.waitFor(() => {
      expect(started).toEqual([threadA.id])
    })

    let queuedResult: AlicizationDispatchTaskThreadResult | undefined
    let queuedSettled = false
    const queuedPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(threadB),
        abortSignal: queuedAbortController.signal,
      },
    }).then((result) => {
      queuedResult = result
      queuedSettled = true
      return result
    })

    await vi.waitFor(() => {
      expect(orchestrator.snapshot().queued.codex).toEqual([threadB.id])
    })

    queuedAbortController.abort('user-cancelled-while-queued')

    try {
      await vi.waitFor(() => {
        const snapshot = orchestrator.snapshot()
        expect(snapshot.queued.codex).toEqual([])
        expect(snapshot.inFlightThreadIds).not.toContain(threadB.id)
        expect(queuedSettled).toBe(true)
      }, { timeout: 200 })

      expect(queuedResult?.errorCode).toBe('TASK_THREAD_ABORTED_BEFORE_DISPATCH')
      expect(queuedResult?.errorMessage).toBe('user-cancelled-while-queued')
      expect(port.appendExecutionEvents).toHaveBeenCalledWith([
        expect.objectContaining({
          threadId: threadB.id,
          kind: 'cancel',
          threadStatus: 'cancelled',
          payload: expect.objectContaining({
            reason: 'user-cancelled-while-queued',
          }),
        }),
      ])
      expect(port.upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
        id: threadB.id,
        status: 'cancelled',
        expectedUpdatedAt: threadB.updatedAt,
      }))
      expect(settlementOrder).toEqual(['thread', 'event'])
    }
    finally {
      runningGate.release()
      await Promise.allSettled([runningPromise, queuedPromise])
    }
  })

  it('reports queued cancellation persistence failures without overwriting a newer thread snapshot', async () => {
    const runningThread = createThread('thread-codex-running-for-cancel-failure', 'codex')
    const queuedThread = createThread('thread-codex-queued-cancel-failure', 'codex')
    const latestQueuedThread: AlicizationTaskThreadRecord = {
      ...queuedThread,
      summary: 'newer queued state',
      metadata: {
        ...queuedThread.metadata,
        latestRevision: 'preserve-me',
      },
      updatedAt: 180,
    }
    const runningGate = createDeferredGate()
    const abortController = new AbortController()
    let queuedThreadReads = 0
    const basePort = createPort([runningThread, queuedThread])
    const port: AlicizationTaskThreadDispatchPort = {
      ...basePort,
      getTaskThread: vi.fn(async (id: string) => {
        if (id === queuedThread.id) {
          queuedThreadReads += 1
          return queuedThreadReads === 1 ? queuedThread : latestQueuedThread
        }
        return runningThread
      }),
      appendExecutionEvents: vi.fn(async (events: AlicizationExecutionEventInput[]) => {
        if (events.some(event => event.threadId === queuedThread.id))
          throw new Error('sqlite-cancel-event-write-failed')
      }),
    }
    const orchestrator = createTaskThreadOrchestrator({
      persistenceTimeoutMs: 10,
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        if (thread.id === runningThread.id)
          await runningGate.wait
        return buildDispatchResult(thread)
      },
    })

    const runningPromise = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(runningThread),
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().running.codex).toBe(runningThread.id)
    })
    const queuedPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(queuedThread),
        abortSignal: abortController.signal,
      },
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().queued.codex).toEqual([queuedThread.id])
    })

    abortController.abort('cancel-with-degraded-persistence')
    const result = await queuedPromise

    expect(result.finalStatus).toBe('cancelled')
    expect(result.createdEventKinds).toEqual([])
    expect(result.errorMessage).toContain('cancel-with-degraded-persistence')
    expect(result.errorMessage).toContain('persistence')
    expect(port.upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      id: queuedThread.id,
      status: 'cancelled',
      metadata: expect.objectContaining({
        latestRevision: 'preserve-me',
      }),
    }))

    runningGate.release()
    await runningPromise
  })

  it('preserves a terminal queued thread when cancellation races with completion', async () => {
    const runningThread = createThread('thread-codex-running-for-terminal-race', 'codex')
    const queuedThread = createThread('thread-codex-queued-terminal-race', 'codex')
    const completedQueuedThread: AlicizationTaskThreadRecord = {
      ...queuedThread,
      status: 'completed',
      summary: 'completed before queued cancellation settled',
      updatedAt: 240,
      lastEventAt: 240,
      completedAt: 240,
    }
    const runningGate = createDeferredGate()
    const abortController = new AbortController()
    let queuedThreadReads = 0
    const basePort = createPort([runningThread, queuedThread])
    const port: AlicizationTaskThreadDispatchPort = {
      ...basePort,
      getTaskThread: vi.fn(async (id: string) => {
        if (id === queuedThread.id) {
          queuedThreadReads += 1
          return queuedThreadReads === 1 ? queuedThread : completedQueuedThread
        }
        return runningThread
      }),
    }
    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        if (thread.id === runningThread.id)
          await runningGate.wait
        return buildDispatchResult(thread)
      },
    })

    const runningPromise = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(runningThread),
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().running.codex).toBe(runningThread.id)
    })
    const queuedPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(queuedThread),
        abortSignal: abortController.signal,
      },
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().queued.codex).toEqual([queuedThread.id])
    })

    abortController.abort('cancel-lost-race')
    const result = await queuedPromise

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'completed',
      errorCode: 'TASK_THREAD_ALREADY_TERMINAL',
      errorMessage: 'Task thread is already terminal with status completed.',
      thread: {
        status: 'completed',
        summary: 'completed before queued cancellation settled',
      },
    })
    expect(port.appendExecutionEvents).not.toHaveBeenCalledWith([
      expect.objectContaining({
        threadId: queuedThread.id,
        kind: 'cancel',
      }),
    ])
    expect(port.upsertTaskThread).not.toHaveBeenCalledWith(expect.objectContaining({
      id: queuedThread.id,
      status: 'cancelled',
    }))

    runningGate.release()
    await runningPromise
  })

  it('does not cancel a queued thread that became running before cancellation ownership', async () => {
    const runningThread = createThread('thread-codex-running-for-running-race', 'codex')
    const queuedThread = createThread('thread-codex-queued-running-race', 'codex')
    const runningQueuedThread: AlicizationTaskThreadRecord = {
      ...queuedThread,
      status: 'running',
      summary: 'another owner started this task',
      updatedAt: 220,
      lastEventAt: 220,
    }
    const runningGate = createDeferredGate()
    const abortController = new AbortController()
    let queuedThreadReads = 0
    const basePort = createPort([runningThread, queuedThread])
    const port: AlicizationTaskThreadDispatchPort = {
      ...basePort,
      getTaskThread: vi.fn(async (id: string) => {
        if (id === queuedThread.id) {
          queuedThreadReads += 1
          return queuedThreadReads === 1 ? queuedThread : runningQueuedThread
        }
        return runningThread
      }),
    }
    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        if (thread.id === runningThread.id)
          await runningGate.wait
        return buildDispatchResult(thread)
      },
    })

    const runningPromise = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(runningThread),
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().running.codex).toBe(runningThread.id)
    })
    const queuedPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(queuedThread),
        abortSignal: abortController.signal,
      },
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().queued.codex).toEqual([queuedThread.id])
    })

    abortController.abort('cancel-after-running-owner')
    const result = await queuedPromise

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'running',
      errorCode: 'TASK_THREAD_VERSION_CONFLICT',
      thread: {
        status: 'running',
        summary: 'another owner started this task',
      },
    })
    expect(port.appendExecutionEvents).not.toHaveBeenCalledWith([
      expect.objectContaining({
        threadId: queuedThread.id,
        kind: 'cancel',
      }),
    ])
    expect(port.upsertTaskThread).not.toHaveBeenCalledWith(expect.objectContaining({
      id: queuedThread.id,
      status: 'cancelled',
    }))

    runningGate.release()
    await runningPromise
  })

  it.each(['completed', 'failed', 'cancelled', 'blocked', 'dead-lettered'] as const)('does not append a cancellation event when queued cancellation loses the terminal CAS to %s', async (status) => {
    const runningThread = createThread('thread-codex-running-for-cancel-cas', 'codex')
    const queuedThread = createThread('thread-codex-queued-cancel-cas', 'codex')
    const completedQueuedThread: AlicizationTaskThreadRecord = {
      ...queuedThread,
      status,
      summary: `${status} before cancellation ownership was acquired`,
      updatedAt: 240,
      lastEventAt: 240,
      completedAt: 240,
    }
    const runningGate = createDeferredGate()
    const abortController = new AbortController()
    let queuedThreadReads = 0
    const basePort = createPort([runningThread, queuedThread])
    const port: AlicizationTaskThreadDispatchPort = {
      ...basePort,
      getTaskThread: vi.fn(async (id: string) => {
        if (id === queuedThread.id) {
          queuedThreadReads += 1
          return queuedThreadReads <= 2 ? queuedThread : completedQueuedThread
        }
        return runningThread
      }),
      upsertTaskThread: vi.fn(async (input) => {
        if (input.id === queuedThread.id && input.status === 'cancelled') {
          const error = new Error('queued cancellation lost terminal ownership')
          Object.assign(error, {
            code: 'TASK_THREAD_VERSION_CONFLICT',
          })
          throw error
        }
        return input as AlicizationTaskThreadRecord
      }),
    }
    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        if (thread.id === runningThread.id)
          await runningGate.wait
        return buildDispatchResult(thread)
      },
    })

    const runningPromise = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(runningThread),
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().running.codex).toBe(runningThread.id)
    })
    const queuedPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(queuedThread),
        abortSignal: abortController.signal,
      },
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().queued.codex).toEqual([queuedThread.id])
    })

    abortController.abort('cancel-lost-terminal-cas')
    const result = await queuedPromise

    expect(result).toMatchObject({
      ok: false,
      finalStatus: status,
      errorCode: 'TASK_THREAD_ALREADY_TERMINAL',
      thread: {
        status,
        summary: `${status} before cancellation ownership was acquired`,
      },
    })
    expect(port.appendExecutionEvents).not.toHaveBeenCalledWith([
      expect.objectContaining({
        threadId: queuedThread.id,
        kind: 'cancel',
      }),
    ])

    runningGate.release()
    await runningPromise
  })

  it('runs each serialized job with an orchestrator-owned signal that follows external aborts', async () => {
    const thread = createThread('thread-codex-owned-signal', 'codex')
    const port = createPort([thread])
    const externalAbortController = new AbortController()
    const cleanupGate = createDeferredGate()
    let runningSignal: AbortSignal | undefined

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        runningSignal = input.abortSignal
        await Promise.race([
          waitForAbort(input.abortSignal),
          cleanupGate.wait,
        ])
        return buildDispatchResult(thread)
      },
    })

    const dispatchPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(thread),
        abortSignal: externalAbortController.signal,
      },
    })

    await vi.waitFor(() => {
      expect(runningSignal).toBeDefined()
    })

    try {
      expect(runningSignal).not.toBe(externalAbortController.signal)
      expect(runningSignal?.aborted).toBe(false)

      externalAbortController.abort('user-cancelled-while-running')

      await vi.waitFor(() => {
        expect(runningSignal?.aborted).toBe(true)
        expect(runningSignal?.reason).toBe('user-cancelled-while-running')
      })
    }
    finally {
      if (!externalAbortController.signal.aborted)
        externalAbortController.abort('test-cleanup')
      cleanupGate.release()
      await dispatchPromise
    }
  })

  it('does not overwrite a completed dispatcher terminal result when abort races with completion', async () => {
    const thread = createThread('thread-codex-late-success', 'codex')
    const port = createPort([thread])
    const externalAbortController = new AbortController()
    let runningSignal: AbortSignal | undefined

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        runningSignal = input.abortSignal
        await waitForAbort(input.abortSignal)
        return buildDispatchResult(thread)
      },
    })

    const dispatchPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(thread),
        abortSignal: externalAbortController.signal,
      },
    })

    await vi.waitFor(() => {
      expect(orchestrator.snapshot().running.codex).toBe(thread.id)
      expect(runningSignal).toBeDefined()
    })

    externalAbortController.abort('user-cancelled-after-dispatch-started')

    const result = await dispatchPromise

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBeUndefined()
    expect(result.thread.status).toBe('completed')
    expect(result.summary).toBe(`completed:${thread.id}`)
    expect(port.appendExecutionEvents).not.toHaveBeenCalled()
    expect(port.upsertTaskThread).not.toHaveBeenCalled()
    expect(orchestrator.snapshot().running.codex).toBeUndefined()
    expect(orchestrator.snapshot().inFlightThreadIds).toEqual([])
  })

  it('dispose cancels queued jobs and aborts the running serialized job', async () => {
    const threadA = createThread('thread-codex-dispose-running', 'codex')
    const threadB = createThread('thread-codex-dispose-queued', 'codex')
    const port = createPort([threadA, threadB])
    const cleanupGate = createDeferredGate()
    let runningSignal: AbortSignal | undefined

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        runningSignal = input.abortSignal
        await Promise.race([
          waitForAbort(input.abortSignal),
          cleanupGate.wait,
        ])
        return buildDispatchResult(thread)
      },
    })

    let runningSettled = false
    let queuedSettled = false
    const runningPromise = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(threadA),
    }).then((result) => {
      runningSettled = true
      return result
    })

    await vi.waitFor(() => {
      expect(orchestrator.snapshot().running.codex).toBe(threadA.id)
    })

    const queuedPromise = orchestrator.dispatch({
      port,
      input: createValidDispatchInput(threadB),
    }).then((result) => {
      queuedSettled = true
      return result
    })

    await vi.waitFor(() => {
      expect(orchestrator.snapshot().queued.codex).toEqual([threadB.id])
    })

    orchestrator.dispose()

    try {
      await vi.waitFor(() => {
        const snapshot = orchestrator.snapshot()
        expect(runningSignal?.aborted).toBe(true)
        expect(runningSignal?.reason).toBe('orchestrator-disposed')
        expect(snapshot.queued.codex).toEqual([])
        expect(snapshot.running.codex).toBeUndefined()
        expect(runningSettled).toBe(true)
        expect(queuedSettled).toBe(true)
      }, { timeout: 200 })

      expect(port.upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
        id: threadB.id,
        status: 'cancelled',
      }))
    }
    finally {
      cleanupGate.release()
      await Promise.allSettled([runningPromise, queuedPromise])
    }
  })

  it('exposes disposed state, rejects new work, and bounds shutdown drain time', async () => {
    const thread = createThread('thread-codex-dispose-bounded', 'codex')
    const port = createPort([thread])
    const orchestrator = createTaskThreadOrchestrator({
      shutdownDrainTimeoutMs: 20,
      runDispatch: async () => await new Promise<AlicizationDispatchTaskThreadResult>(() => {}),
    })

    void orchestrator.dispatch({
      port,
      input: createValidDispatchInput(thread),
    })
    await vi.waitFor(() => {
      expect(orchestrator.snapshot().running.codex).toBe(thread.id)
    })

    const startedAt = Date.now()
    const disposal = orchestrator.dispose()
    expect(disposal).toBeInstanceOf(Promise)
    await disposal

    expect(Date.now() - startedAt).toBeLessThan(150)
    expect(orchestrator.snapshot().disposed).toBe(true)
    await expect(orchestrator.dispatch({
      port,
      input: createValidDispatchInput(thread),
    })).rejects.toMatchObject({
      code: 'TASK_THREAD_ORCHESTRATOR_DISPOSED',
    })
  })

  it('forwards abort after queued-to-running transition without persisting queued cancellation twice', async () => {
    const thread = createThread('thread-codex-abort-race', 'codex')
    const port = createPort([thread])
    const externalAbortController = new AbortController()
    const cleanupGate = createDeferredGate()
    let runningSignal: AbortSignal | undefined
    let settlements = 0

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        runningSignal = input.abortSignal
        await Promise.race([
          waitForAbort(input.abortSignal),
          cleanupGate.wait,
        ])
        return {
          ...buildDispatchResult(thread),
          thread: {
            ...thread,
            status: 'cancelled',
            summary: 'cancelled by dispatcher',
            updatedAt: 200,
            completedAt: 200,
            lastEventAt: 200,
          },
          createdEventKinds: ['cancel'],
          ok: false,
          finalStatus: 'cancelled',
          summary: 'cancelled by dispatcher',
          errorCode: 'CODEX_EXECUTION_CANCELLED',
          errorMessage: String(input.abortSignal?.reason ?? 'cancelled'),
        }
      },
    })

    const dispatchPromise = orchestrator.dispatch({
      port,
      input: {
        ...createValidDispatchInput(thread),
        abortSignal: externalAbortController.signal,
      },
    }).then((result) => {
      settlements += 1
      return result
    })

    await vi.waitFor(() => {
      expect(orchestrator.snapshot().running.codex).toBe(thread.id)
      expect(runningSignal).toBeDefined()
    })

    try {
      externalAbortController.abort('abort-after-running')
      orchestrator.dispose()
      await dispatchPromise

      expect(runningSignal).not.toBe(externalAbortController.signal)
      expect(runningSignal?.aborted).toBe(true)
      expect(runningSignal?.reason).toBe('abort-after-running')
      expect(settlements).toBe(1)
      expect(port.appendExecutionEvents).not.toHaveBeenCalled()
      expect(port.upsertTaskThread).not.toHaveBeenCalled()
      await expect(dispatchPromise).resolves.toMatchObject({
        ok: false,
        finalStatus: 'cancelled',
        errorCode: 'CODEX_EXECUTION_CANCELLED',
        errorMessage: 'abort-after-running',
        thread: {
          status: 'cancelled',
        },
      })
      expect(orchestrator.snapshot().inFlightThreadIds).toEqual([])
    }
    finally {
      cleanupGate.release()
      await Promise.allSettled([dispatchPromise])
    }
  })
})
