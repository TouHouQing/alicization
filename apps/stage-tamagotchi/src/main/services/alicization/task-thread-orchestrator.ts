import type {
  AlicizationDispatchTaskThreadResult,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import type { AlicizationDispatchTaskThreadRuntimeInput, AlicizationTaskThreadDispatchPort } from './task-thread-dispatcher'

import { dispatchTaskThread } from './task-thread-dispatcher'

type AlicizationSerializedDispatchChannel = 'codex' | 'claude-code'
type AlicizationOrchestratorJobState = 'queued' | 'running'

interface AlicizationTaskThreadDispatchJob {
  thread: AlicizationTaskThreadRecord
  port: AlicizationTaskThreadDispatchPort
  input: AlicizationDispatchTaskThreadRuntimeInput
  now: () => number
  state: AlicizationOrchestratorJobState
  cancelledBeforeRun: boolean
  cancelReason: string
  cleanupAbortSubscription?: () => void
  resolve: (value: AlicizationDispatchTaskThreadResult) => void
  reject: (reason?: unknown) => void
}

export interface AlicizationTaskThreadOrchestratorSnapshot {
  queued: Record<AlicizationSerializedDispatchChannel, string[]>
  running: Partial<Record<AlicizationSerializedDispatchChannel, string>>
  inFlightThreadIds: string[]
}

export interface AlicizationTaskThreadDispatchInvocation {
  port: AlicizationTaskThreadDispatchPort
  input: AlicizationDispatchTaskThreadRuntimeInput
}

interface AlicizationTaskThreadOrchestratorOptions {
  runDispatch?: (invocation: AlicizationTaskThreadDispatchInvocation) => Promise<AlicizationDispatchTaskThreadResult>
}

function isSerializedDispatchChannel(
  channel: AlicizationExecutionChannel | null | undefined,
): channel is AlicizationSerializedDispatchChannel {
  return channel === 'codex' || channel === 'claude-code'
}

function subscribeAbortForQueueJob(
  signal: AbortSignal | undefined,
  job: AlicizationTaskThreadDispatchJob,
) {
  if (!signal)
    return undefined
  const markQueuedJobCancelled = () => {
    if (job.state !== 'queued')
      return
    job.cancelledBeforeRun = true
    const reason = signal.reason
    job.cancelReason = typeof reason === 'string' && reason.trim()
      ? reason
      : 'dispatch-aborted-before-run'
  }
  if (signal.aborted) {
    markQueuedJobCancelled()
    return undefined
  }
  signal.addEventListener('abort', markQueuedJobCancelled, { once: true })
  return () => signal.removeEventListener('abort', markQueuedJobCancelled)
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
      reason: input.reason,
      source: 'task-thread-orchestrator',
    },
    createdAt,
  }
  await job.port.appendExecutionEvents([cancelEvent]).catch(() => {})

  const upsertInput: AlicizationTaskThreadUpsertInput = {
    ...job.thread,
    status: 'cancelled',
    summary,
    updatedAt: Math.max(job.thread.updatedAt, createdAt),
    lastEventAt: createdAt,
    completedAt: createdAt,
  }
  const updatedThread = await job.port.upsertTaskThread(upsertInput).catch(() => {
    return {
      ...job.thread,
      status: 'cancelled' as const,
      summary,
      updatedAt: Math.max(job.thread.updatedAt, createdAt),
      lastEventAt: createdAt,
      completedAt: createdAt,
    }
  })

  return {
    thread: updatedThread,
    createdEventKinds: ['cancel'],
    ok: false,
    summary,
    errorCode: 'TASK_THREAD_ABORTED_BEFORE_DISPATCH',
    errorMessage: input.reason,
  } satisfies AlicizationDispatchTaskThreadResult
}

export function createTaskThreadOrchestrator(options?: AlicizationTaskThreadOrchestratorOptions) {
  const serializedQueues: Record<AlicizationSerializedDispatchChannel, AlicizationTaskThreadDispatchJob[]> = {
    'codex': [],
    'claude-code': [],
  }
  const runningJobs = new Map<AlicizationSerializedDispatchChannel, AlicizationTaskThreadDispatchJob>()
  const processingChannels = new Set<AlicizationSerializedDispatchChannel>()
  const inFlightThreadDispatches = new Map<string, Promise<AlicizationDispatchTaskThreadResult>>()

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
          const result = job.cancelledBeforeRun
            ? await persistQueuedCancellation({
                job,
                reason: job.cancelReason || 'dispatch-aborted-before-run',
              })
            : await runDispatchNow({
                port: job.port,
                input: job.input,
              })
          job.resolve(result)
        }
        catch (error) {
          job.reject(error)
        }
        finally {
          runningJobs.delete(channel)
          job.cleanupAbortSubscription?.()
        }
      }
    }
    finally {
      processingChannels.delete(channel)
    }
  }

  const dispatch = async (invocation: AlicizationTaskThreadDispatchInvocation): Promise<AlicizationDispatchTaskThreadResult> => {
    const existingThread = await invocation.port.getTaskThread(invocation.input.threadId)
    if (!existingThread)
      throw new Error(`Task thread "${invocation.input.threadId}" was not found.`)

    const inFlight = inFlightThreadDispatches.get(existingThread.id)
    if (inFlight)
      return await inFlight

    if (!isSerializedDispatchChannel(existingThread.selectedChannel)) {
      return await trackInFlightDispatch(existingThread.id, runDispatchNow(invocation))
    }
    const serializedChannel = existingThread.selectedChannel

    const now = invocation.input.now ?? Date.now
    const queuedPromise = new Promise<AlicizationDispatchTaskThreadResult>((resolve, reject) => {
      const job: AlicizationTaskThreadDispatchJob = {
        thread: existingThread,
        port: invocation.port,
        input: invocation.input,
        now,
        state: 'queued',
        cancelledBeforeRun: false,
        cancelReason: '',
        resolve,
        reject,
      }
      job.cleanupAbortSubscription = subscribeAbortForQueueJob(invocation.input.abortSignal, job)
      serializedQueues[serializedChannel].push(job)
      void processSerializedQueue(serializedChannel)
    })

    return await trackInFlightDispatch(existingThread.id, queuedPromise)
  }

  const dispose = () => {
    for (const channel of Object.keys(serializedQueues) as AlicizationSerializedDispatchChannel[]) {
      const jobs = serializedQueues[channel]
      while (jobs.length > 0) {
        const job = jobs.shift()
        if (!job)
          continue
        job.cleanupAbortSubscription?.()
        void persistQueuedCancellation({
          job,
          reason: 'orchestrator-disposed',
        }).then(job.resolve, job.reject)
      }
    }
  }

  const snapshot = (): AlicizationTaskThreadOrchestratorSnapshot => {
    return {
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
