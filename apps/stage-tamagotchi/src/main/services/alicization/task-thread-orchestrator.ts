import type {
  AlicizationDispatchTaskThreadResult,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import type { AlicizationDispatchTaskThreadRuntimeInput, AlicizationTaskThreadDispatchPort } from './task-thread-dispatcher'

import { errorMessageFrom } from '@moeru/std'

import { dispatchTaskThread } from './task-thread-dispatcher'

type AlicizationSerializedDispatchChannel = 'codex' | 'claude-code'
type AlicizationOrchestratorJobState = 'queued' | 'running' | 'cancelled' | 'settled'

interface AlicizationTaskThreadDispatchJob {
  thread: AlicizationTaskThreadRecord
  port: AlicizationTaskThreadDispatchPort
  input: AlicizationDispatchTaskThreadRuntimeInput
  now: () => number
  persistenceTimeoutMs: number
  state: AlicizationOrchestratorJobState
  abortController: AbortController
  settled: boolean
  cleanupAbortSubscription?: () => void
  resolve: (value: AlicizationDispatchTaskThreadResult) => void
  reject: (reason?: unknown) => void
}

interface AlicizationDirectTaskThreadDispatchJob {
  abortController: AbortController
  cleanupAbortSubscription?: () => void
}

export interface AlicizationTaskThreadOrchestratorSnapshot {
  disposed: boolean
  queued: Record<AlicizationSerializedDispatchChannel, string[]>
  running: Partial<Record<AlicizationSerializedDispatchChannel, string>>
  inFlightThreadIds: string[]
}

export interface AlicizationTaskThreadDispatchInvocation {
  port: AlicizationTaskThreadDispatchPort
  input: AlicizationDispatchTaskThreadRuntimeInput
  resultDeliveryMode?: 'inline' | 'callback'
}

interface AlicizationTaskThreadOrchestratorOptions {
  persistenceTimeoutMs?: number
  shutdownDrainTimeoutMs?: number
  runDispatch?: (invocation: AlicizationTaskThreadDispatchInvocation) => Promise<AlicizationDispatchTaskThreadResult>
}

const defaultPersistenceTimeoutMs = 1_000
const defaultShutdownDrainTimeoutMs = 5_000

function isSerializedDispatchChannel(
  channel: AlicizationExecutionChannel | null | undefined,
): channel is AlicizationSerializedDispatchChannel {
  return channel === 'codex' || channel === 'claude-code'
}

function resolveAbortReason(signal: AbortSignal, fallback: string) {
  const reason = signal.reason
  return typeof reason === 'string' && reason.trim()
    ? reason
    : fallback
}

function normalizeTimeoutMs(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value))
    return fallback
  return Math.max(1, Math.floor(value as number))
}

async function runBoundedOperation<T>(input: {
  label: string
  operation: () => Promise<T>
  timeoutMs: number
}): Promise<
  | { ok: true, value: T }
  | { ok: false, reason: string }
> {
  return await new Promise((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (
      result:
        | { ok: true, value: T }
        | { ok: false, reason: string },
    ) => {
      if (settled)
        return
      settled = true
      if (timer)
        clearTimeout(timer)
      resolve(result)
    }
    timer = setTimeout(() => {
      finish({
        ok: false,
        reason: `${input.label} timed out after ${input.timeoutMs}ms`,
      })
    }, input.timeoutMs)
    timer.unref?.()

    try {
      void input.operation().then(
        value => finish({ ok: true, value }),
        error => finish({
          ok: false,
          reason: `${input.label} failed: ${errorMessageFrom(error)}`,
        }),
      )
    }
    catch (error) {
      finish({
        ok: false,
        reason: `${input.label} failed: ${errorMessageFrom(error)}`,
      })
    }
  })
}

function withPersistenceDiagnostics(
  thread: AlicizationTaskThreadRecord,
  failures: string[],
  recordedAt: number,
) {
  if (failures.length === 0)
    return thread.metadata
  const execution = thread.metadata?.execution
  return {
    ...thread.metadata,
    execution: {
      ...(execution && typeof execution === 'object' && !Array.isArray(execution)
        ? execution
        : {}),
      persistence: {
        status: 'degraded',
        failures,
        recordedAt,
      },
    },
  }
}

function createWaitAbortError(signal: AbortSignal) {
  const error = new Error(resolveAbortReason(signal, 'task-thread wait aborted')) as Error & {
    code: string
  }
  error.name = 'AbortError'
  error.code = 'TASK_THREAD_WAIT_ABORTED'
  return error
}

function waitForSharedDispatch(
  promise: Promise<AlicizationDispatchTaskThreadResult>,
  signal: AbortSignal | undefined,
) {
  if (!signal)
    return promise
  if (signal.aborted)
    return Promise.reject(createWaitAbortError(signal))

  return new Promise<AlicizationDispatchTaskThreadResult>((resolve, reject) => {
    let settled = false
    let handleAbort = () => {}
    const cleanup = () => signal.removeEventListener('abort', handleAbort)
    const settle = (
      handler: (value: AlicizationDispatchTaskThreadResult) => void,
      value: AlicizationDispatchTaskThreadResult,
    ) => {
      if (settled)
        return
      settled = true
      cleanup()
      handler(value)
    }
    const settleError = (error: unknown) => {
      if (settled)
        return
      settled = true
      cleanup()
      reject(error)
    }
    handleAbort = () => settleError(createWaitAbortError(signal))

    signal.addEventListener('abort', handleAbort, { once: true })
    void promise.then(
      value => settle(resolve, value),
      settleError,
    )
  })
}

async function persistQueuedCancellation(input: {
  job: AlicizationTaskThreadDispatchJob
  reason: string
}) {
  const { job } = input
  const createdAt = job.now()
  const summary = 'Execution was cancelled before dispatcher slot became available.'
  const cancelEvent: AlicizationExecutionEventInput = {
    threadId: job.thread.id,
    decisionTraceId: job.thread.decisionTraceId,
    turnId: job.thread.turnId,
    sessionId: job.thread.sessionId,
    origin: job.thread.origin,
    channel: job.thread.selectedChannel,
    kind: 'cancel',
    threadStatus: 'cancelled',
    payload: {
      failureKind: 'tool-execution',
      errorCode: 'TASK_THREAD_ABORTED_BEFORE_DISPATCH',
      errorMessage: input.reason,
      reason: input.reason,
      source: 'task-thread-orchestrator',
    },
    createdAt,
  }
  const [eventWrite, latestThreadRead] = await Promise.all([
    runBoundedOperation({
      label: 'queued cancellation event persistence',
      operation: async () => await job.port.appendExecutionEvents([cancelEvent]),
      timeoutMs: job.persistenceTimeoutMs,
    }),
    runBoundedOperation({
      label: 'queued cancellation thread refresh',
      operation: async () => await job.port.getTaskThread(job.thread.id),
      timeoutMs: job.persistenceTimeoutMs,
    }),
  ])
  const failures: string[] = []
  if (!eventWrite.ok)
    failures.push(eventWrite.reason)
  if (!latestThreadRead.ok)
    failures.push(latestThreadRead.reason)
  const latestThread = latestThreadRead.ok && latestThreadRead.value
    ? latestThreadRead.value
    : job.thread

  const upsertInput: AlicizationTaskThreadUpsertInput = {
    ...latestThread,
    status: 'cancelled',
    summary,
    metadata: withPersistenceDiagnostics(latestThread, failures, createdAt),
    updatedAt: Math.max(latestThread.updatedAt, createdAt),
    lastEventAt: createdAt,
    completedAt: createdAt,
  }
  const threadWrite = await runBoundedOperation({
    label: 'queued cancellation terminal persistence',
    operation: async () => await job.port.upsertTaskThread(upsertInput),
    timeoutMs: job.persistenceTimeoutMs,
  })
  if (!threadWrite.ok)
    failures.push(threadWrite.reason)
  const updatedThread = threadWrite.ok
    ? threadWrite.value
    : {
        ...upsertInput,
        metadata: withPersistenceDiagnostics(latestThread, failures, createdAt),
      } as AlicizationTaskThreadRecord

  if (failures.length > 0) {
    void job.port.appendAuditLog?.({
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: 'queued-cancellation-persistence-degraded',
      message: 'Queued task cancellation completed with degraded persistence.',
      payload: {
        threadId: job.thread.id,
        reason: input.reason,
        failures,
      },
    }).catch(() => {})
  }

  return {
    thread: updatedThread,
    createdEventKinds: eventWrite.ok ? ['cancel'] : [],
    ok: false,
    finalStatus: 'cancelled' as const,
    summary,
    errorCode: 'TASK_THREAD_ABORTED_BEFORE_DISPATCH',
    errorMessage: failures.length > 0
      ? `${input.reason}; cancellation persistence degraded: ${failures.join('; ')}`
      : input.reason,
  } satisfies AlicizationDispatchTaskThreadResult
}

export function createTaskThreadOrchestrator(options?: AlicizationTaskThreadOrchestratorOptions) {
  const persistenceTimeoutMs = normalizeTimeoutMs(
    options?.persistenceTimeoutMs,
    defaultPersistenceTimeoutMs,
  )
  const shutdownDrainTimeoutMs = normalizeTimeoutMs(
    options?.shutdownDrainTimeoutMs,
    defaultShutdownDrainTimeoutMs,
  )
  const serializedQueues: Record<AlicizationSerializedDispatchChannel, AlicizationTaskThreadDispatchJob[]> = {
    'codex': [],
    'claude-code': [],
  }
  const runningJobs = new Map<AlicizationSerializedDispatchChannel, AlicizationTaskThreadDispatchJob>()
  const runningDirectJobs = new Map<string, AlicizationDirectTaskThreadDispatchJob>()
  const processingChannels = new Set<AlicizationSerializedDispatchChannel>()
  const inFlightThreadDispatches = new Map<string, Promise<AlicizationDispatchTaskThreadResult>>()
  let disposed = false
  let disposePromise: Promise<void> | null = null

  const settleJob = (
    job: AlicizationTaskThreadDispatchJob,
    settlement:
      | { kind: 'resolve', value: AlicizationDispatchTaskThreadResult }
      | { kind: 'reject', reason: unknown },
  ) => {
    if (job.settled)
      return
    job.settled = true
    job.state = 'settled'
    job.cleanupAbortSubscription?.()
    job.cleanupAbortSubscription = undefined
    if (settlement.kind === 'resolve')
      job.resolve(settlement.value)
    else
      job.reject(settlement.reason)
  }

  const cancelQueuedJob = (
    channel: AlicizationSerializedDispatchChannel,
    job: AlicizationTaskThreadDispatchJob,
    reason: string,
  ) => {
    if (job.state !== 'queued' || job.settled)
      return false

    const queue = serializedQueues[channel]
    const queuedIndex = queue.indexOf(job)
    if (queuedIndex < 0)
      return false

    queue.splice(queuedIndex, 1)
    job.state = 'cancelled'
    if (!job.abortController.signal.aborted)
      job.abortController.abort(reason)

    void persistQueuedCancellation({
      job,
      reason,
    }).then(
      result => settleJob(job, { kind: 'resolve', value: result }),
      error => settleJob(job, { kind: 'reject', reason: error }),
    )
    return true
  }

  const subscribeExternalAbort = (
    channel: AlicizationSerializedDispatchChannel,
    job: AlicizationTaskThreadDispatchJob,
    signal: AbortSignal | undefined,
  ) => {
    if (!signal)
      return

    const forwardAbort = () => {
      const reason = resolveAbortReason(
        signal,
        job.state === 'queued'
          ? 'dispatch-aborted-before-run'
          : 'dispatch-aborted',
      )
      if (job.state === 'queued') {
        cancelQueuedJob(channel, job, reason)
        return
      }
      if (job.state === 'running' && !job.abortController.signal.aborted)
        job.abortController.abort(reason)
    }

    if (signal.aborted) {
      forwardAbort()
      return
    }

    signal.addEventListener('abort', forwardAbort, { once: true })
    job.cleanupAbortSubscription = () => signal.removeEventListener('abort', forwardAbort)
  }

  const trackInFlightDispatch = (threadId: string, promise: Promise<AlicizationDispatchTaskThreadResult>) => {
    inFlightThreadDispatches.set(threadId, promise)
    promise.finally(() => {
      if (inFlightThreadDispatches.get(threadId) === promise)
        inFlightThreadDispatches.delete(threadId)
    }).catch(() => {})
    return promise
  }

  const runDispatchNow = async (invocation: AlicizationTaskThreadDispatchInvocation) => {
    if (options?.runDispatch)
      return await options.runDispatch(invocation)
    return await dispatchTaskThread(invocation.port, invocation.input)
  }

  const runDirectDispatch = (
    threadId: string,
    invocation: AlicizationTaskThreadDispatchInvocation,
  ) => {
    const job: AlicizationDirectTaskThreadDispatchJob = {
      abortController: new AbortController(),
    }
    const externalSignal = invocation.input.abortSignal
    if (externalSignal) {
      const forwardAbort = () => {
        if (!job.abortController.signal.aborted) {
          job.abortController.abort(resolveAbortReason(
            externalSignal,
            'dispatch-aborted',
          ))
        }
      }
      if (externalSignal.aborted) {
        forwardAbort()
      }
      else {
        externalSignal.addEventListener('abort', forwardAbort, { once: true })
        job.cleanupAbortSubscription = () => externalSignal.removeEventListener('abort', forwardAbort)
      }
    }

    runningDirectJobs.set(threadId, job)
    const promise = runDispatchNow({
      ...invocation,
      input: {
        ...invocation.input,
        abortSignal: job.abortController.signal,
      },
    })
    promise.finally(() => {
      job.cleanupAbortSubscription?.()
      if (runningDirectJobs.get(threadId) === job)
        runningDirectJobs.delete(threadId)
    }).catch(() => {})
    return promise
  }

  const processSerializedQueue = async (channel: AlicizationSerializedDispatchChannel) => {
    if (processingChannels.has(channel))
      return
    processingChannels.add(channel)
    try {
      while (true) {
        const job = serializedQueues[channel].shift()
        if (!job)
          return
        runningJobs.set(channel, job)
        job.state = 'running'

        try {
          const result = await runDispatchNow({
            port: job.port,
            input: {
              ...job.input,
              abortSignal: job.abortController.signal,
            },
          })
          settleJob(job, { kind: 'resolve', value: result })
        }
        catch (error) {
          settleJob(job, { kind: 'reject', reason: error })
        }
        finally {
          if (runningJobs.get(channel) === job)
            runningJobs.delete(channel)
        }
      }
    }
    finally {
      processingChannels.delete(channel)
    }
  }

  const dispatch = async (invocation: AlicizationTaskThreadDispatchInvocation): Promise<AlicizationDispatchTaskThreadResult> => {
    if (disposed) {
      const error = new Error('Task-thread orchestrator is disposed.') as Error & { code: string }
      error.code = 'TASK_THREAD_ORCHESTRATOR_DISPOSED'
      throw error
    }

    const existingThread = await invocation.port.getTaskThread(invocation.input.threadId)
    if (!existingThread)
      throw new Error(`Task thread "${invocation.input.threadId}" was not found.`)

    if (disposed) {
      const error = new Error('Task-thread orchestrator is disposed.') as Error & { code: string }
      error.code = 'TASK_THREAD_ORCHESTRATOR_DISPOSED'
      throw error
    }

    const inFlight = inFlightThreadDispatches.get(existingThread.id)
    if (inFlight)
      return await waitForSharedDispatch(inFlight, invocation.input.abortSignal)

    if (!isSerializedDispatchChannel(existingThread.selectedChannel)) {
      return await trackInFlightDispatch(
        existingThread.id,
        runDirectDispatch(existingThread.id, invocation),
      )
    }
    const serializedChannel = existingThread.selectedChannel

    const now = invocation.input.now ?? Date.now
    const queuedPromise = new Promise<AlicizationDispatchTaskThreadResult>((resolve, reject) => {
      const job: AlicizationTaskThreadDispatchJob = {
        thread: existingThread,
        port: invocation.port,
        input: invocation.input,
        now,
        persistenceTimeoutMs,
        state: 'queued',
        abortController: new AbortController(),
        settled: false,
        resolve,
        reject,
      }
      serializedQueues[serializedChannel].push(job)
      subscribeExternalAbort(serializedChannel, job, invocation.input.abortSignal)
      if (job.state === 'queued')
        void processSerializedQueue(serializedChannel)
    })

    return await trackInFlightDispatch(existingThread.id, queuedPromise)
  }

  const dispose = () => {
    if (disposePromise)
      return disposePromise
    disposed = true

    for (const channel of Object.keys(serializedQueues) as AlicizationSerializedDispatchChannel[]) {
      const jobs = serializedQueues[channel]
      while (jobs.length > 0) {
        const job = jobs[0]
        if (!job)
          continue
        cancelQueuedJob(channel, job, 'orchestrator-disposed')
      }

      const runningJob = runningJobs.get(channel)
      if (runningJob && !runningJob.abortController.signal.aborted)
        runningJob.abortController.abort('orchestrator-disposed')
    }

    for (const job of runningDirectJobs.values()) {
      if (!job.abortController.signal.aborted)
        job.abortController.abort('orchestrator-disposed')
    }

    const pendingDispatches = [...inFlightThreadDispatches.values()]
    disposePromise = (async () => {
      if (pendingDispatches.length === 0)
        return
      await runBoundedOperation({
        label: 'task-thread orchestrator shutdown drain',
        operation: async () => {
          await Promise.allSettled(pendingDispatches)
        },
        timeoutMs: shutdownDrainTimeoutMs,
      })
    })()
    return disposePromise
  }

  const snapshot = (): AlicizationTaskThreadOrchestratorSnapshot => {
    return {
      disposed,
      queued: {
        'codex': serializedQueues.codex.map(job => job.thread.id),
        'claude-code': serializedQueues['claude-code'].map(job => job.thread.id),
      },
      running: {
        'codex': runningJobs.get('codex')?.thread.id,
        'claude-code': runningJobs.get('claude-code')?.thread.id,
      },
      inFlightThreadIds: [...inFlightThreadDispatches.keys()],
    }
  }

  return {
    dispatch,
    dispose,
    snapshot,
  }
}
