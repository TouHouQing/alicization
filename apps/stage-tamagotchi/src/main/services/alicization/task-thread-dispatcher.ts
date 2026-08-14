import type {
  AlicizationDispatchTaskThreadInput,
  AlicizationDispatchTaskThreadResult,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationExecutionEventKind,
  AlicizationExecutionRuntimeContext,
  AlicizationExecutorSessionStatus,
  AlicizationExecutorSessionUpsertInput,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import type { AlicizationAuditLogInput } from '../../../shared/eventa'
import type { AlicizationLocalVisualDispatchSurface } from './executor-adapters/local-visual'

import { errorMessageFrom } from '@moeru/std'
import {
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'

import { resolveExecutionTransportChannel } from './executor-adapters/embodied-channel'
import { prepareTaskThreadDispatch } from './executor-adapters/registry'

type TaskThreadDispatchPort = Pick<{
  getTaskThread: (id: string) => Promise<AlicizationTaskThreadRecord | undefined>
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput) => Promise<AlicizationTaskThreadRecord>
  upsertExecutorSession?: (input: AlicizationExecutorSessionUpsertInput) => Promise<unknown>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[]) => Promise<void>
  appendAuditLog?: (input: AlicizationAuditLogInput) => Promise<void>
}, 'getTaskThread' | 'upsertTaskThread' | 'upsertExecutorSession' | 'appendExecutionEvents' | 'appendAuditLog'> & {
  localVisualSurface?: AlicizationLocalVisualDispatchSurface
}
export type AlicizationTaskThreadDispatchPort = TaskThreadDispatchPort

export interface AlicizationDispatchTaskThreadRuntimeInput extends AlicizationDispatchTaskThreadInput {
  killSwitchSuspended?: boolean
  abortSignal?: AbortSignal
  onExecutionEvent?: (event: AlicizationExecutionEventInput) => Promise<void> | void
  eventPersistenceTimeoutMs?: number
  workspaceRoot?: string
  now?: () => number
}

const defaultEventPersistenceTimeoutMs = 1_000
const terminalTaskThreadStatuses = new Set<AlicizationTaskThreadRecord['status']>([
  'blocked',
  'completed',
  'failed',
  'cancelled',
])

function normalizePersistenceTimeoutMs(value: number | undefined) {
  if (!Number.isFinite(value))
    return defaultEventPersistenceTimeoutMs
  return Math.max(1, Math.floor(value as number))
}

async function runBoundedPersistence<T>(input: {
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

function withExecutionPersistenceDiagnostics(
  thread: AlicizationTaskThreadRecord,
  failures: string[],
  recordedAt: number,
) {
  if (failures.length === 0)
    return thread.metadata
  const execution = thread.metadata?.execution
  const persistence = execution
    && typeof execution === 'object'
    && !Array.isArray(execution)
    && 'persistence' in execution
    && execution.persistence
    && typeof execution.persistence === 'object'
    && !Array.isArray(execution.persistence)
    ? execution.persistence
    : null
  const previousFailures = persistence
    && 'failures' in persistence
    && Array.isArray(persistence.failures)
    ? persistence.failures.filter((failure): failure is string => typeof failure === 'string')
    : []
  return {
    ...thread.metadata,
    execution: {
      ...(execution && typeof execution === 'object' && !Array.isArray(execution)
        ? execution
        : {}),
      persistence: {
        status: 'degraded',
        failures: [...new Set([
          ...previousFailures,
          ...failures,
        ])],
        recordedAt,
      },
    },
  }
}

function withRuntimeContext<Command extends { runtimeContext?: AlicizationExecutionRuntimeContext | null }>(
  command: Command | null | undefined,
  runtimeContext: AlicizationExecutionRuntimeContext | null,
): Command | null | undefined {
  if (!command || !runtimeContext)
    return command

  return {
    ...command,
    runtimeContext,
  }
}

function applyExecutionRuntimeContextToDispatchInput(
  input: AlicizationDispatchTaskThreadRuntimeInput,
  runtimeContext: AlicizationExecutionRuntimeContext | null,
): AlicizationDispatchTaskThreadInput {
  return {
    threadId: input.threadId,
    cli: withRuntimeContext(input.cli, runtimeContext),
    codex: withRuntimeContext(input.codex, runtimeContext),
    claudeCode: withRuntimeContext(input.claudeCode, runtimeContext),
    localVisual: withRuntimeContext(input.localVisual, runtimeContext),
    openclaw: withRuntimeContext(input.openclaw, runtimeContext),
  }
}

function resolveExecutionRuntimeContext(
  input: AlicizationDispatchTaskThreadInput,
): AlicizationExecutionRuntimeContext | null {
  return normalizeAlicizationExecutionRuntimeContext(
    input.cli?.runtimeContext
    ?? input.codex?.runtimeContext
    ?? input.claudeCode?.runtimeContext
    ?? input.localVisual?.runtimeContext
    ?? input.openclaw?.runtimeContext,
  )
}

function resolvePersistedExecutionRuntimeContext(
  thread: AlicizationTaskThreadRecord,
): AlicizationExecutionRuntimeContext | null {
  const metadata = thread.metadata
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return null

  const execution = (metadata as Record<string, unknown>).execution
  if (!execution || typeof execution !== 'object' || Array.isArray(execution))
    return null

  return normalizeAlicizationExecutionRuntimeContext(
    (execution as Record<string, unknown>).runtimeContext,
  )
}

function mergeExecutionRuntimeContexts(input: {
  payloadRuntimeContext: AlicizationExecutionRuntimeContext | null
  storedRuntimeContext: AlicizationExecutionRuntimeContext | null
}): AlicizationExecutionRuntimeContext | null {
  const { payloadRuntimeContext, storedRuntimeContext } = input
  if (!payloadRuntimeContext)
    return storedRuntimeContext
  if (!storedRuntimeContext)
    return payloadRuntimeContext

  return {
    ...storedRuntimeContext,
    ...payloadRuntimeContext,
    cardId: payloadRuntimeContext.cardId ?? storedRuntimeContext.cardId ?? null,
    decisionTraceId: payloadRuntimeContext.decisionTraceId ?? storedRuntimeContext.decisionTraceId ?? null,
    turnId: payloadRuntimeContext.turnId ?? storedRuntimeContext.turnId ?? null,
    sessionId: payloadRuntimeContext.sessionId ?? storedRuntimeContext.sessionId ?? null,
    agentSessionId: payloadRuntimeContext.agentSessionId ?? storedRuntimeContext.agentSessionId ?? null,
    recentActions: payloadRuntimeContext.recentActions && payloadRuntimeContext.recentActions.length > 0
      ? payloadRuntimeContext.recentActions
      : storedRuntimeContext.recentActions ?? [],
    sensory: payloadRuntimeContext.sensory,
  }
}

async function persistExecutionRuntimeContext(
  port: TaskThreadDispatchPort,
  input: {
    thread: AlicizationTaskThreadRecord
    runtimeContext: AlicizationExecutionRuntimeContext
    now: () => number
  },
) {
  return await port.upsertTaskThread({
    ...input.thread,
    metadata: {
      ...input.thread.metadata,
      execution: {
        ...((input.thread.metadata?.execution && typeof input.thread.metadata.execution === 'object')
          ? input.thread.metadata.execution
          : {}),
        runtimeContext: input.runtimeContext,
      },
    },
    updatedAt: Math.max(input.thread.updatedAt, input.now()),
    expectedUpdatedAt: input.thread.updatedAt,
  })
}

async function appendAuditLog(port: TaskThreadDispatchPort, input: AlicizationAuditLogInput) {
  if (!port.appendAuditLog)
    return
  await port.appendAuditLog(input).catch(() => {})
}

function readExecutionErrorCode(error: unknown) {
  if (!error || typeof error !== 'object')
    return ''
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code.trim() : ''
}

function readExecutionErrorText(error: unknown) {
  if (typeof error === 'string')
    return error.trim()
  if (!error || typeof error !== 'object')
    return ''
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message.trim() : ''
}

function isTaskThreadVersionConflict(error: unknown) {
  if (!error || typeof error !== 'object')
    return false
  return String((error as { code?: unknown }).code ?? '').toUpperCase() === 'TASK_THREAD_VERSION_CONFLICT'
}

function isTimeoutExecutionFailure(error: unknown, signal?: AbortSignal) {
  return [error, signal?.reason].some((candidate) => {
    const code = readExecutionErrorCode(candidate).toUpperCase()
    const name = candidate && typeof candidate === 'object' && 'name' in candidate
      ? String((candidate as { name?: unknown }).name ?? '').toUpperCase()
      : ''
    const text = readExecutionErrorText(candidate).toUpperCase()
    return /(?:^|_)TIMEOUT(?:$|_)/u.test(code)
      || name.includes('TIMEOUT')
      || /\bTIMED?\s*OUT\b|\bTIMEOUT\b/u.test(text)
  })
}

function isCancelledExecutionFailure(error: unknown, signal?: AbortSignal) {
  if (signal?.reason && error === signal.reason)
    return true
  if (!error || typeof error !== 'object')
    return false
  const record = error as { code?: unknown, name?: unknown }
  const code = typeof record.code === 'string' ? record.code.toUpperCase() : ''
  const name = typeof record.name === 'string' ? record.name : ''
  return name === 'AbortError'
    || code.includes('ABORT')
    || code.includes('CANCEL')
}

async function persistCancelledBeforeDispatch(input: {
  port: TaskThreadDispatchPort
  thread: AlicizationTaskThreadRecord
  reason: string
  now: () => number
  persistenceTimeoutMs: number
}): Promise<AlicizationDispatchTaskThreadResult> {
  const createdAt = input.now()
  const summary = 'Execution was cancelled before dispatch began.'
  const latestThreadRead = await runBoundedPersistence({
    label: 'pre-dispatch cancellation thread refresh',
    operation: async () => await input.port.getTaskThread(input.thread.id),
    timeoutMs: input.persistenceTimeoutMs,
  })
  const persistenceFailures: string[] = []
  if (!latestThreadRead.ok)
    persistenceFailures.push(latestThreadRead.reason)
  const latestThread = latestThreadRead.ok && latestThreadRead.value
    ? latestThreadRead.value
    : input.thread

  if (terminalTaskThreadStatuses.has(latestThread.status)) {
    return {
      thread: latestThread,
      createdEventKinds: [],
      ok: false,
      finalStatus: latestThread.status,
      summary: latestThread.summary
        ?? `Task thread is already terminal with status ${latestThread.status}.`,
      errorCode: 'TASK_THREAD_ALREADY_TERMINAL',
      errorMessage: `Task thread is already terminal with status ${latestThread.status}.`,
    }
  }

  const cancelEvent: AlicizationExecutionEventInput = {
    threadId: input.thread.id,
    decisionTraceId: input.thread.decisionTraceId,
    turnId: input.thread.turnId,
    sessionId: input.thread.sessionId,
    origin: input.thread.origin,
    channel: input.thread.selectedChannel,
    kind: 'cancel',
    threadStatus: 'cancelled',
    payload: {
      failureKind: 'tool-execution',
      errorCode: 'TASK_THREAD_ABORTED_BEFORE_DISPATCH',
      errorMessage: input.reason,
      reason: input.reason,
      source: 'task-thread-dispatcher',
    },
    createdAt,
  }
  const eventWrite = await runBoundedPersistence({
    label: 'pre-dispatch cancellation event persistence',
    operation: async () => await input.port.appendExecutionEvents([cancelEvent]),
    timeoutMs: input.persistenceTimeoutMs,
  })
  if (!eventWrite.ok)
    persistenceFailures.push(eventWrite.reason)
  const terminalThreadRead = await runBoundedPersistence({
    label: 'pre-dispatch cancellation terminal refresh',
    operation: async () => await input.port.getTaskThread(input.thread.id),
    timeoutMs: input.persistenceTimeoutMs,
  })
  if (!terminalThreadRead.ok)
    persistenceFailures.push(terminalThreadRead.reason)
  const terminalThread = terminalThreadRead.ok && terminalThreadRead.value
    ? terminalThreadRead.value
    : latestThread

  let updatedThread: AlicizationTaskThreadRecord | null = terminalThread
  let finalStatus: AlicizationDispatchTaskThreadResult['finalStatus'] = terminalThread.status
  let finalSummary = terminalThread.summary ?? summary
  if (!terminalTaskThreadStatuses.has(terminalThread.status)) {
    const cancelledThread: AlicizationTaskThreadUpsertInput = {
      ...terminalThread,
      status: 'cancelled',
      summary,
      metadata: withExecutionPersistenceDiagnostics(
        terminalThread,
        persistenceFailures,
        createdAt,
      ),
      updatedAt: Math.max(terminalThread.updatedAt, createdAt),
      lastEventAt: createdAt,
      completedAt: createdAt,
      expectedUpdatedAt: terminalThread.updatedAt,
    }
    const threadWrite = await runBoundedPersistence({
      label: 'pre-dispatch cancellation terminal persistence',
      operation: async () => await input.port.upsertTaskThread(cancelledThread),
      timeoutMs: input.persistenceTimeoutMs,
    })
    if (!threadWrite.ok)
      persistenceFailures.push(threadWrite.reason)
    updatedThread = threadWrite.ok
      ? threadWrite.value
      : null
    if (!updatedThread) {
      const reconciledThreadRead = await runBoundedPersistence({
        label: 'pre-dispatch cancellation terminal reconciliation',
        operation: async () => await input.port.getTaskThread(input.thread.id),
        timeoutMs: input.persistenceTimeoutMs,
      })
      if (!reconciledThreadRead.ok)
        persistenceFailures.push(reconciledThreadRead.reason)
      updatedThread = reconciledThreadRead.ok && reconciledThreadRead.value
        ? reconciledThreadRead.value
        : {
            ...cancelledThread,
            metadata: withExecutionPersistenceDiagnostics(
              terminalThread,
              persistenceFailures,
              createdAt,
            ),
          } as AlicizationTaskThreadRecord
    }
    finalStatus = updatedThread.status
    finalSummary = updatedThread.summary ?? summary
  }

  if (persistenceFailures.length > 0) {
    await appendAuditLog(input.port, {
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: 'pre-dispatch-cancellation-persistence-degraded',
      message: 'Execution was cancelled before dispatch with degraded persistence.',
      payload: {
        threadId: input.thread.id,
        reason: input.reason,
        failures: persistenceFailures,
      },
    })
  }

  return {
    thread: updatedThread,
    createdEventKinds: eventWrite.ok ? ['cancel'] : [],
    ok: false,
    finalStatus,
    summary: finalSummary,
    errorCode: finalStatus === 'cancelled'
      ? 'TASK_THREAD_ABORTED_BEFORE_DISPATCH'
      : 'TASK_THREAD_ALREADY_TERMINAL',
    errorMessage: persistenceFailures.length > 0
      ? `${input.reason}; cancellation persistence degraded: ${persistenceFailures.join('; ')}`
      : finalStatus === 'cancelled'
        ? input.reason
        : `Task thread is already terminal with status ${finalStatus}.`,
  }
}

function buildExecutorSessionAffinityKey(thread: AlicizationTaskThreadRecord) {
  const sessionId = typeof thread.sessionId === 'string'
    ? thread.sessionId.trim()
    : ''
  if (sessionId)
    return sessionId
  return thread.id
}

function supportsExecutorSessionTracking(channel: AlicizationExecutionChannel | null) {
  const transportChannel = resolveExecutionTransportChannel(channel)
  return transportChannel === 'codex' || transportChannel === 'claude-code' || transportChannel === 'openclaw'
}

function buildRunningDispatchSummary(
  transportChannel: AlicizationExecutionChannel | null,
  semanticChannel: AlicizationExecutionChannel | null,
) {
  if (transportChannel === 'codex')
    return 'Codex dispatch is running for the current task thread.'
  if (transportChannel === 'claude-code')
    return 'Claude Code dispatch is running for the current task thread.'

  if (transportChannel === 'openclaw') {
    if (semanticChannel && semanticChannel !== 'openclaw')
      return `${semanticChannel} dispatch is running through OpenClaw for the current task thread.`
    return 'OpenClaw dispatch is running for the current task thread.'
  }

  return 'Executor dispatch is running for the current task thread.'
}

async function upsertExecutorSession(
  port: TaskThreadDispatchPort,
  input: {
    thread: AlicizationTaskThreadRecord
    transportChannel?: AlicizationExecutionChannel | null
    status: AlicizationExecutorSessionStatus
    summary: string
    now: () => number
    errorCode?: string
    externalSessionId?: string | null
    runtimeContext?: AlicizationExecutionRuntimeContext | null
  },
) {
  if (!port.upsertExecutorSession)
    return
  const transportChannel = input.transportChannel ?? resolveExecutionTransportChannel(input.thread.selectedChannel)
  if (!supportsExecutorSessionTracking(transportChannel))
    return
  if (!transportChannel)
    return

  await port.upsertExecutorSession({
    channel: transportChannel,
    affinityKey: buildExecutorSessionAffinityKey(input.thread),
    externalSessionId: input.externalSessionId ?? null,
    status: input.status,
    summary: input.summary,
    metadata: {
      source: 'task-thread-dispatcher',
      threadId: input.thread.id,
      decisionTraceId: input.thread.decisionTraceId,
      turnId: input.thread.turnId,
      selectedChannel: input.thread.selectedChannel,
      transportChannel,
      errorCode: input.errorCode ?? null,
      ...(input.runtimeContext
        ? {
            execution: {
              runtimeContext: input.runtimeContext,
            },
          }
        : {}),
    },
    updatedAt: input.now(),
    lastUsedAt: input.now(),
  }).catch(() => {})
}

export async function dispatchTaskThread(
  port: TaskThreadDispatchPort,
  input: AlicizationDispatchTaskThreadRuntimeInput,
): Promise<AlicizationDispatchTaskThreadResult> {
  const now = input.now ?? Date.now
  const eventPersistenceTimeoutMs = normalizePersistenceTimeoutMs(input.eventPersistenceTimeoutMs)
  let thread = await port.getTaskThread(input.threadId)
  if (!thread)
    throw new Error(`Task thread "${input.threadId}" was not found.`)

  if (thread.status !== 'planned') {
    return {
      thread,
      createdEventKinds: [],
      ok: false,
      summary: `Task thread is not dispatchable while status is ${thread.status}.`,
      errorCode: 'TASK_THREAD_NOT_DISPATCHABLE',
      errorMessage: `Expected planned status but received ${thread.status}.`,
    }
  }

  const payloadRuntimeContext = resolveExecutionRuntimeContext(input)
  const storedRuntimeContext = resolvePersistedExecutionRuntimeContext(thread)
  const runtimeContext = mergeExecutionRuntimeContexts({
    payloadRuntimeContext,
    storedRuntimeContext,
  })

  if (runtimeContext && (payloadRuntimeContext || storedRuntimeContext !== runtimeContext)) {
    thread = await persistExecutionRuntimeContext(port, {
      thread,
      runtimeContext,
      now,
    })
  }

  if (input.killSwitchSuspended) {
    const blockedAt = now()
    const blockedSummary = 'Execution stayed blocked because the kill switch is suspended.'
    const blockedEvent: AlicizationExecutionEventInput = {
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: thread.selectedChannel,
      kind: 'cancel',
      threadStatus: 'blocked',
      payload: {
        failureKind: 'tool-execution',
        errorCode: 'TASK_THREAD_KILL_SWITCH_BLOCKED',
        errorMessage: blockedSummary,
        reason: 'kill-switch-suspended',
        hasRuntimeContext: runtimeContext !== null,
        runtimeContext,
      },
      createdAt: blockedAt,
    }
    const persistenceFailures: string[] = []
    const eventWrite = await runBoundedPersistence({
      label: 'kill-switch block event persistence',
      operation: async () => await port.appendExecutionEvents([blockedEvent]),
      timeoutMs: eventPersistenceTimeoutMs,
    })
    if (!eventWrite.ok)
      persistenceFailures.push(eventWrite.reason)

    const blockedThreadId = thread.id
    const blockedThreadRead = await runBoundedPersistence({
      label: 'kill-switch block task-thread refresh',
      operation: async () => await port.getTaskThread(blockedThreadId),
      timeoutMs: eventPersistenceTimeoutMs,
    })
    if (!blockedThreadRead.ok)
      persistenceFailures.push(blockedThreadRead.reason)
    const blockedBaseThread = blockedThreadRead.ok && blockedThreadRead.value
      ? blockedThreadRead.value
      : thread
    const blockedInput: AlicizationTaskThreadUpsertInput = {
      ...blockedBaseThread,
      status: 'blocked',
      summary: blockedSummary,
      metadata: withExecutionPersistenceDiagnostics(
        blockedBaseThread,
        persistenceFailures,
        blockedAt,
      ),
      updatedAt: Math.max(blockedBaseThread.updatedAt, blockedAt),
      lastEventAt: eventWrite.ok ? blockedAt : blockedBaseThread.lastEventAt,
      completedAt: blockedAt,
      expectedUpdatedAt: blockedBaseThread.updatedAt,
    }
    const threadWrite = await runBoundedPersistence({
      label: 'kill-switch blocked task-thread persistence',
      operation: async () => await port.upsertTaskThread(blockedInput),
      timeoutMs: eventPersistenceTimeoutMs,
    })
    if (!threadWrite.ok)
      persistenceFailures.push(threadWrite.reason)
    let blockedThread = threadWrite.ok
      ? threadWrite.value
      : null
    if (!blockedThread) {
      const reconciledThreadRead = await runBoundedPersistence({
        label: 'kill-switch blocked task-thread reconciliation',
        operation: async () => await port.getTaskThread(blockedThreadId),
        timeoutMs: eventPersistenceTimeoutMs,
      })
      if (!reconciledThreadRead.ok)
        persistenceFailures.push(reconciledThreadRead.reason)
      blockedThread = reconciledThreadRead.ok && reconciledThreadRead.value
        ? reconciledThreadRead.value
        : {
            ...blockedInput,
            metadata: withExecutionPersistenceDiagnostics(
              thread,
              persistenceFailures,
              blockedAt,
            ),
          } as AlicizationTaskThreadRecord
    }

    void appendAuditLog(port, {
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: 'blocked-kill-switch',
      message: persistenceFailures.length > 0
        ? 'Task-thread dispatch was blocked by kill switch with degraded persistence.'
        : 'Task-thread dispatch was blocked by kill switch before execution began.',
      payload: {
        threadId: thread.id,
        selectedChannel: thread.selectedChannel,
        failures: persistenceFailures,
      },
    }).catch(() => {})
    return {
      thread: blockedThread,
      createdEventKinds: eventWrite.ok ? ['cancel'] : [],
      ok: false,
      summary: blockedSummary,
      errorCode: 'TASK_THREAD_KILL_SWITCH_BLOCKED',
      errorMessage: persistenceFailures.length > 0
        ? `Kill switch is suspended; persistence degraded: ${persistenceFailures.join('; ')}`
        : 'Kill switch is suspended.',
    }
  }

  if (input.abortSignal?.aborted) {
    return await persistCancelledBeforeDispatch({
      port,
      thread,
      reason: errorMessageFrom(input.abortSignal.reason) || 'Dispatch was cancelled before execution began.',
      now,
      persistenceTimeoutMs: eventPersistenceTimeoutMs,
    })
  }

  const dispatchInput = applyExecutionRuntimeContextToDispatchInput(input, runtimeContext)
  const preparedDispatch = prepareTaskThreadDispatch({
    thread,
    dispatchInput,
    localVisualSurface: port.localVisualSurface,
  })
  if (!preparedDispatch.ok) {
    return {
      thread,
      createdEventKinds: [],
      ok: false,
      summary: preparedDispatch.summary,
      errorCode: preparedDispatch.errorCode,
      errorMessage: preparedDispatch.errorMessage,
    }
  }

  if (!runtimeContext) {
    const summary = 'Execution runtime context is required before task-thread dispatch can begin.'
    await appendAuditLog(port, {
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: 'blocked-missing-runtime-context',
      message: summary,
      payload: {
        threadId: thread.id,
        selectedChannel: thread.selectedChannel,
      },
    })
    return {
      thread,
      createdEventKinds: [],
      ok: false,
      summary,
      errorCode: 'TASK_THREAD_RUNTIME_CONTEXT_REQUIRED',
      errorMessage: 'Execution runtime context is required before dispatch begins.',
    }
  }

  const runningDispatchSummary = buildRunningDispatchSummary(
    preparedDispatch.channel,
    thread.selectedChannel,
  )
  const runningAt = now()
  try {
    thread = await port.upsertTaskThread({
      ...thread,
      status: 'running',
      summary: runningDispatchSummary,
      updatedAt: Math.max(thread.updatedAt, runningAt),
      expectedUpdatedAt: thread.updatedAt,
      lastEventAt: runningAt,
      completedAt: null,
    })
  }
  catch (error) {
    if (!isTaskThreadVersionConflict(error))
      throw error
    const latestThread = await port.getTaskThread(thread.id) ?? thread
    return {
      thread: latestThread,
      createdEventKinds: [],
      ok: false,
      finalStatus: latestThread.status,
      summary: latestThread.summary
        ?? 'Task thread changed before execution could begin.',
      errorCode: terminalTaskThreadStatuses.has(latestThread.status)
        ? 'TASK_THREAD_ALREADY_TERMINAL'
        : 'TASK_THREAD_VERSION_CONFLICT',
      errorMessage: terminalTaskThreadStatuses.has(latestThread.status)
        ? `Task thread is already terminal with status ${latestThread.status}.`
        : 'Task thread changed before execution could begin.',
    }
  }

  if (supportsExecutorSessionTracking(preparedDispatch.sessionTrackingChannel)) {
    await upsertExecutorSession(port, {
      thread,
      transportChannel: preparedDispatch.sessionTrackingChannel,
      status: 'running',
      summary: runningDispatchSummary,
      now,
      runtimeContext,
    })
  }

  const persistedLiveEvents = new WeakSet<AlicizationExecutionEventInput>()
  const persistedLiveEventIds = new Set<string>()
  const pendingLiveEvents = new WeakSet<AlicizationExecutionEventInput>()
  const pendingLiveEventIds = new Set<string>()
  const observedLiveEvents: AlicizationExecutionEventInput[] = []
  const persistedEventKinds = new Set<AlicizationExecutionEventKind>()
  const persistenceFailures: string[] = []
  let livePersistenceClosed = false
  let liveEventQueue = Promise.resolve()
  let lateEventQueue = Promise.resolve()
  let terminalThreadSnapshot: AlicizationTaskThreadRecord | null = null
  const scheduledLateEvents = new WeakSet<AlicizationExecutionEventInput>()
  const scheduledLateEventIds = new Set<string>()
  const eventIdOf = (event: AlicizationExecutionEventInput) => {
    const eventId = typeof event.id === 'string' ? event.id.trim() : ''
    return eventId.length > 0 ? eventId : null
  }
  const hasPersistedLiveEvent = (event: AlicizationExecutionEventInput) => {
    const eventId = eventIdOf(event)
    return persistedLiveEvents.has(event)
      || (eventId !== null && persistedLiveEventIds.has(eventId))
  }
  const hasPendingLiveEvent = (event: AlicizationExecutionEventInput) => {
    const eventId = eventIdOf(event)
    return pendingLiveEvents.has(event)
      || (eventId !== null && pendingLiveEventIds.has(eventId))
  }
  const collectUnpersistedEvents = (events: AlicizationExecutionEventInput[]) => {
    const seenEvents = new WeakSet<AlicizationExecutionEventInput>()
    const seenEventIds = new Set<string>()
    return events.filter((event) => {
      if (hasPersistedLiveEvent(event))
        return false
      const eventId = eventIdOf(event)
      if (seenEvents.has(event) || (eventId !== null && seenEventIds.has(eventId)))
        return false
      seenEvents.add(event)
      if (eventId !== null)
        seenEventIds.add(eventId)
      return true
    })
  }
  const markEventsPersisted = (events: AlicizationExecutionEventInput[]) => {
    for (const event of events) {
      const eventId = eventIdOf(event)
      persistedLiveEvents.add(event)
      if (eventId !== null)
        persistedLiveEventIds.add(eventId)
      if (event.kind)
        persistedEventKinds.add(event.kind)
    }
  }
  const clearPendingEvents = (events: AlicizationExecutionEventInput[]) => {
    for (const event of events) {
      const eventId = eventIdOf(event)
      pendingLiveEvents.delete(event)
      if (eventId !== null)
        pendingLiveEventIds.delete(eventId)
    }
  }
  const scheduleLiveEventPersistence = (events: AlicizationExecutionEventInput[]) => {
    if (livePersistenceClosed)
      return
    const pendingEvents = collectUnpersistedEvents(events)
      .filter(event => !hasPendingLiveEvent(event))
    if (pendingEvents.length === 0)
      return

    for (const event of pendingEvents) {
      pendingLiveEvents.add(event)
      const eventId = eventIdOf(event)
      if (eventId !== null)
        pendingLiveEventIds.add(eventId)
    }

    const delivery = liveEventQueue.then(async () => {
      if (livePersistenceClosed) {
        clearPendingEvents(pendingEvents)
        return
      }

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (livePersistenceClosed) {
          clearPendingEvents(pendingEvents)
          return
        }
        const write = await runBoundedPersistence({
          label: `realtime execution event persistence attempt ${attempt}`,
          operation: async () => await port.appendExecutionEvents(pendingEvents),
          timeoutMs: eventPersistenceTimeoutMs,
        })
        if (write.ok) {
          markEventsPersisted(pendingEvents)
          clearPendingEvents(pendingEvents)
          return
        }
        if (attempt === 2)
          persistenceFailures.push(write.reason)
      }
      clearPendingEvents(pendingEvents)
    })
    liveEventQueue = delivery.catch(() => {})
    void delivery
  }
  const scheduleLateEventPersistence = (event: AlicizationExecutionEventInput) => {
    const eventId = eventIdOf(event)
    if (
      scheduledLateEvents.has(event)
      || (eventId !== null && scheduledLateEventIds.has(eventId))
    ) {
      return
    }
    scheduledLateEvents.add(event)
    if (eventId !== null)
      scheduledLateEventIds.add(eventId)

    const eventIdentity = eventId ?? `${event.kind ?? 'unknown'}@${event.createdAt ?? 'unknown'}`
    const lateEventFailure = `A late execution event (${eventIdentity}) arrived after realtime persistence closed.`
    const evidenceOnlyEvent: AlicizationExecutionEventInput = {
      ...event,
      threadStatus: undefined,
      payload: {
        ...event.payload,
        lateAfterTerminal: true,
        originalThreadStatus: event.threadStatus ?? null,
      },
    }
    const delivery = lateEventQueue.then(async () => {
      const lateFailures = [lateEventFailure]
      if (!hasPersistedLiveEvent(event)) {
        const eventWrite = await runBoundedPersistence({
          label: 'late execution event persistence',
          operation: async () => await port.appendExecutionEvents([evidenceOnlyEvent]),
          timeoutMs: eventPersistenceTimeoutMs,
        })
        if (eventWrite.ok)
          markEventsPersisted([event])
        else
          lateFailures.push(eventWrite.reason)
      }

      const refreshedThreadRead = await runBoundedPersistence({
        label: 'late execution event task-thread refresh',
        operation: async () => await port.getTaskThread(thread.id),
        timeoutMs: eventPersistenceTimeoutMs,
      })
      if (!refreshedThreadRead.ok) {
        lateFailures.push(refreshedThreadRead.reason)
        return
      }
      const latestThread = refreshedThreadRead.value
      if (!latestThread)
        return
      const terminalThread = terminalTaskThreadStatuses.has(latestThread.status)
        ? latestThread
        : terminalThreadSnapshot ?? latestThread
      const diagnosticAt = now()
      await runBoundedPersistence({
        label: 'late execution event diagnostic persistence',
        operation: async () => await port.upsertTaskThread({
          ...latestThread,
          status: terminalThread.status,
          summary: terminalThread.summary,
          metadata: withExecutionPersistenceDiagnostics(
            latestThread,
            lateFailures,
            diagnosticAt,
          ),
          updatedAt: Math.max(latestThread.updatedAt, diagnosticAt),
          expectedUpdatedAt: latestThread.updatedAt,
          lastEventAt: terminalThread.lastEventAt,
          completedAt: terminalThread.completedAt,
        }),
        timeoutMs: eventPersistenceTimeoutMs,
      })
    })
    lateEventQueue = delivery.catch(() => {})
    void delivery
  }
  const persistAndPublishLiveEvent = (event: AlicizationExecutionEventInput) => {
    if (livePersistenceClosed) {
      scheduleLateEventPersistence(event)
      return Promise.resolve()
    }
    // Runtime observers must see progress immediately. Database persistence is
    // queued independently so a slow SQLite write cannot stall the executor or
    // the Provider continuation.
    try {
      void Promise.resolve(input.onExecutionEvent?.(event)).catch(() => {})
    }
    catch {
      // Synchronous observer failures must not affect executor lifecycle.
    }
    observedLiveEvents.push(event)
    scheduleLiveEventPersistence([event])
    return Promise.resolve()
  }

  let result: Awaited<ReturnType<typeof preparedDispatch.run>>
  try {
    result = await preparedDispatch.run({
      abortSignal: input.abortSignal,
      onExecutionEvent: persistAndPublishLiveEvent,
      workspaceRoot: input.workspaceRoot,
      now,
    })
  }
  catch (error) {
    const errorMessage = errorMessageFrom(error) || 'Executor adapter rejected without an error message.'
    const rawErrorCode = readExecutionErrorCode(error)
    const timedOut = isTimeoutExecutionFailure(error, input.abortSignal)
    const cancelled = !timedOut && isCancelledExecutionFailure(error, input.abortSignal)
    const timeoutErrorCode = `${preparedDispatch.channel.replace(/[^a-z0-9]+/giu, '_').toUpperCase()}_TIMEOUT`
    const errorCode = timedOut
      ? /TIMEOUT/u.test(rawErrorCode.toUpperCase())
        ? rawErrorCode
        : timeoutErrorCode
      : rawErrorCode || 'TASK_THREAD_ADAPTER_REJECTED'
    const finalStatus = cancelled ? 'cancelled' : 'failed'
    const failedAt = now()
    result = {
      ok: false,
      finalStatus,
      summary: cancelled
        ? `${preparedDispatch.channel} dispatch was cancelled: ${errorMessage}`
        : `${preparedDispatch.channel} dispatch failed: ${errorMessage}`,
      output: null,
      errorCode,
      errorMessage,
      events: [{
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: thread.selectedChannel,
        kind: cancelled ? 'cancel' : 'result',
        threadStatus: finalStatus,
        payload: {
          adapter: preparedDispatch.channel,
          failureKind: 'tool-execution',
          errorCode,
          errorMessage,
          rejected: true,
          cancelled,
          timedOut,
          hasRuntimeContext: runtimeContext !== null,
          runtimeContext,
        },
        createdAt: failedAt,
      }],
    }
  }
  const summarizedResult = result.summary.trim()
  const finalThreadStatus = result.finalStatus ?? (result.ok ? 'completed' : 'failed')
  const finalizedAt = now()
  const finalThreadCompletedAt = finalThreadStatus === 'completed'
    || finalThreadStatus === 'failed'
    || finalThreadStatus === 'cancelled'
    || finalThreadStatus === 'blocked'
    ? finalizedAt
    : thread.completedAt
  terminalThreadSnapshot = {
    ...thread,
    status: finalThreadStatus,
    summary: summarizedResult,
    updatedAt: Math.max(thread.updatedAt, finalizedAt),
    lastEventAt: finalizedAt,
    completedAt: finalThreadCompletedAt,
  }

  const liveDrain = await runBoundedPersistence({
    label: 'realtime execution event drain',
    operation: async () => {
      while (true) {
        const queueSnapshot = liveEventQueue
        await queueSnapshot
        if (queueSnapshot !== liveEventQueue)
          continue
        livePersistenceClosed = true
        return
      }
    },
    timeoutMs: eventPersistenceTimeoutMs,
  })
  if (!liveDrain.ok)
    persistenceFailures.push(liveDrain.reason)
  if (!livePersistenceClosed)
    livePersistenceClosed = true

  const finalEvents = collectUnpersistedEvents([
    ...observedLiveEvents,
    ...result.events,
  ])
  if (finalEvents.length > 0) {
    const finalWrite = await runBoundedPersistence({
      label: 'final execution event persistence',
      operation: async () => await port.appendExecutionEvents(finalEvents),
      timeoutMs: eventPersistenceTimeoutMs,
    })
    if (finalWrite.ok)
      markEventsPersisted(finalEvents)
    else
      persistenceFailures.push(finalWrite.reason)
  }

  const refreshedThreadRead = await runBoundedPersistence({
    label: 'terminal task-thread refresh',
    operation: async () => await port.getTaskThread(thread.id),
    timeoutMs: eventPersistenceTimeoutMs,
  })
  if (!refreshedThreadRead.ok)
    persistenceFailures.push(refreshedThreadRead.reason)
  const terminalBaseThread = refreshedThreadRead.ok && refreshedThreadRead.value
    ? refreshedThreadRead.value
    : thread
  const terminalBaseIsSettled = terminalTaskThreadStatuses.has(terminalBaseThread.status)
  const preserveNewerTerminal = terminalBaseIsSettled
    && terminalBaseThread.status !== finalThreadStatus
  const effectiveFinalStatus = terminalBaseIsSettled
    ? terminalBaseThread.status
    : finalThreadStatus
  const effectiveSummary = preserveNewerTerminal
    ? terminalBaseThread.summary ?? summarizedResult
    : summarizedResult
  const effectiveCompletedAt = preserveNewerTerminal
    ? terminalBaseThread.completedAt
    : effectiveFinalStatus === 'completed'
      || effectiveFinalStatus === 'failed'
      || effectiveFinalStatus === 'cancelled'
      || effectiveFinalStatus === 'blocked'
      ? finalizedAt
      : terminalBaseThread.completedAt
  const effectiveLastEventAt = preserveNewerTerminal
    ? terminalBaseThread.lastEventAt
    : finalizedAt
  const terminalInput: AlicizationTaskThreadUpsertInput = {
    ...terminalBaseThread,
    status: effectiveFinalStatus,
    summary: effectiveSummary,
    metadata: withExecutionPersistenceDiagnostics(
      terminalBaseThread,
      persistenceFailures,
      finalizedAt,
    ),
    updatedAt: preserveNewerTerminal
      ? terminalBaseThread.updatedAt
      : Math.max(terminalBaseThread.updatedAt, finalizedAt),
    expectedUpdatedAt: terminalBaseThread.updatedAt,
    lastEventAt: effectiveLastEventAt,
    completedAt: effectiveCompletedAt,
  }
  const terminalWrite = await runBoundedPersistence({
    label: 'terminal task-thread persistence',
    operation: async () => await port.upsertTaskThread(terminalInput),
    timeoutMs: eventPersistenceTimeoutMs,
  })
  if (!terminalWrite.ok)
    persistenceFailures.push(terminalWrite.reason)
  let summarizedThread = terminalWrite.ok
    ? terminalWrite.value
    : null
  if (!summarizedThread) {
    const reconciledThreadRead = await runBoundedPersistence({
      label: 'terminal task-thread reconciliation',
      operation: async () => await port.getTaskThread(thread.id),
      timeoutMs: eventPersistenceTimeoutMs,
    })
    if (!reconciledThreadRead.ok)
      persistenceFailures.push(reconciledThreadRead.reason)
    summarizedThread = reconciledThreadRead.ok && reconciledThreadRead.value
      ? reconciledThreadRead.value
      : {
          ...terminalInput,
          metadata: withExecutionPersistenceDiagnostics(
            terminalBaseThread,
            persistenceFailures,
            finalizedAt,
          ),
        } as AlicizationTaskThreadRecord
  }
  const reconciledTerminalState = !terminalWrite.ok
    && terminalTaskThreadStatuses.has(summarizedThread.status)
    ? summarizedThread
    : null
  const resolvedFinalStatus = reconciledTerminalState?.status ?? effectiveFinalStatus
  const resolvedSummary = reconciledTerminalState?.summary ?? effectiveSummary
  const resolvedNewerTerminal = preserveNewerTerminal
    || Boolean(reconciledTerminalState && reconciledTerminalState.status !== finalThreadStatus)
  terminalThreadSnapshot = summarizedThread
  if (supportsExecutorSessionTracking(preparedDispatch.sessionTrackingChannel)) {
    void upsertExecutorSession(port, {
      thread,
      transportChannel: preparedDispatch.sessionTrackingChannel,
      status: resolvedFinalStatus === 'completed'
        || resolvedFinalStatus === 'cancelled'
        ? 'active'
        : 'failed',
      summary: resolvedSummary,
      now,
      errorCode: result.errorCode,
      externalSessionId: 'externalSessionId' in result && typeof result.externalSessionId === 'string'
        ? result.externalSessionId
        : null,
      runtimeContext,
    }).catch(() => {})
  }
  const auditChannelPrefix = thread.selectedChannel ?? 'unknown-channel'
  const createdEventKinds = [...persistedEventKinds]

  if (persistenceFailures.length > 0) {
    void appendAuditLog(port, {
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: `${auditChannelPrefix}-persistence-degraded`,
      message: 'Execution completed with degraded event or terminal persistence.',
      payload: {
        threadId: thread.id,
        selectedChannel: thread.selectedChannel,
        failures: persistenceFailures,
        createdEventKinds,
      },
    }).catch(() => {})
  }

  const resolvedOk = result.ok && resolvedFinalStatus === 'completed'
  const effectiveErrorCode = !resolvedOk
    && resolvedNewerTerminal
    && !result.errorCode
    ? 'TASK_THREAD_ALREADY_TERMINAL'
    : result.errorCode
  void appendAuditLog(port, {
    level: resolvedOk ? 'notice' : 'warning',
    category: 'alicization.executor.dispatch',
    action: resolvedOk
      ? `${auditChannelPrefix}-completed`
      : resolvedFinalStatus === 'cancelled'
        ? `${auditChannelPrefix}-cancelled`
        : `${auditChannelPrefix}-failed`,
    message: resolvedSummary,
    payload: {
      threadId: thread.id,
      selectedChannel: thread.selectedChannel,
      createdEventKinds,
      errorCode: effectiveErrorCode,
    },
  }).catch(() => {})

  return {
    thread: summarizedThread,
    createdEventKinds,
    ok: resolvedOk,
    finalStatus: resolvedFinalStatus,
    summary: resolvedSummary,
    output: resolvedOk ? result.output : null,
    errorCode: effectiveErrorCode,
    errorMessage: resolvedNewerTerminal
      ? resolvedSummary
      : result.errorMessage,
  }
}
